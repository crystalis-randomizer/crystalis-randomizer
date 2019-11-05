import { Maze } from './maze.js';
import { SpecSet } from './spec.js';
import { Dir, Pos } from './types.js';
import { hex, seq } from '../rom/util.js';
import { iters } from '../util.js';
const DEBUG = false;
const ATTEMPTS = 100;
class BasicCaveShuffle {
    constructor(loc, random) {
        this.loc = loc;
        this.random = random;
        this.survey = SpecSet.CAVE.survey(loc);
    }
    shuffle() {
        for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
            const w = this.w = Math.max(1, Math.min(8, this.pickWidth()));
            const h = this.h = Math.max(1, Math.min(16, this.pickHeight()));
            this.allPos =
                seq(w * h, yx => ((yx % w) | Math.floor(yx / w) << 4));
            this.density = this.survey.size / w / h;
            this.walls = this.survey.walls;
            this.bridges = this.survey.bridges;
            this.fixed = new Set();
            const maze = new Maze(this.random, this.h, this.w, this.survey.specs);
            if (this.tryShuffle(maze))
                return;
        }
        throw new Error(`Could not shuffle ${hex(this.loc.id)} ${this.loc.name}`);
    }
    check(maze) {
        const traverse = maze.traverse();
        return traverse.size > 2 &&
            traverse.values().next().value.size === traverse.size;
    }
    pickWidth() {
        return this.loc.width + Math.floor((this.random.nextInt(5)) / 3);
    }
    pickHeight() {
        return this.loc.height + Math.floor((this.random.nextInt(5)) / 3);
    }
    tryShuffle(maze) {
        if (DEBUG)
            console.log(`Shuffle ${this.loc.name}`);
        if (!this.initializeFixedScreens(maze))
            return false;
        if (DEBUG)
            console.log(`Initialized\n${maze.show()}`);
        if (!this.initialFillMaze(maze))
            return false;
        if (DEBUG)
            console.log(`Initial fill\n${maze.show()}`);
        if (!this.refineMaze(maze))
            return false;
        if (DEBUG)
            console.log(`Refined\n${maze.show()}`);
        if (!this.addFeatures(maze))
            return false;
        if (DEBUG)
            console.log(`Features\n${maze.show()}`);
        return this.finish(maze);
    }
    initializeFixedScreens(maze) {
        for (const [pos0, edge] of this.survey.edges) {
            for (const pos of this.random.ishuffle(this.edges(edge.dir))) {
                if (this.fixed.has(pos))
                    continue;
                this.fixed.add(pos);
                const fixedScr = this.survey.fixed.get(pos0);
                if (fixedScr == null) {
                    maze.setBorder(pos, edge.dir, 6);
                }
                else {
                    if (this.h === 1)
                        return false;
                    maze.setBorder(pos, edge.dir, (fixedScr.edges >>> Dir.shift(edge.dir)) & 0xf);
                    fixBorders(maze, pos, fixedScr.edges);
                    maze.set(pos, fixedScr.edges);
                    if (fixedScr.wall)
                        this.walls--;
                }
                break;
            }
        }
        for (const [pos0, scr] of this.survey.fixed) {
            if (this.survey.edges.has(pos0))
                continue;
            for (const pos of this.random.ishuffle(this.allPos)) {
                if (this.fixed.has(pos))
                    continue;
                const ok = maze.saveExcursion(() => {
                    fixBorders(maze, pos, scr.edges);
                    return maze.trySet(pos, scr.edges);
                });
                if (!ok)
                    continue;
                this.fixed.add(pos);
                if (scr.wall)
                    this.walls--;
                break;
            }
        }
        const stairs = [...this.survey.stairs.values()];
        let tries = 0;
        for (let i = 0; tries < 10 && i < stairs.length; tries++) {
            const pos = maze.randomPos();
            if (this.fixed.has(pos))
                continue;
            if (!maze.fill(pos, { stair: stairs[i].dir }))
                continue;
            this.fixed.add(pos);
            tries = 0;
            i++;
        }
        if (tries >= 10)
            return fail(`could not add all stairs`);
        return true;
    }
    initialFillMaze(maze, opts = {}) {
        const fillOpts = {
            edge: 1,
            fuzzy: 1,
            shuffleOrder: true,
            skipAlternates: true,
            ...opts,
        };
        if (!maze.fillAll(fillOpts))
            return fail(`could not fill open`, maze);
        return true;
    }
    refineMaze(maze, opts = {}) {
        if (!this.check(maze))
            return fail(`check failed after initial setup`, maze);
        const empty = 0;
        const fillOpts = { skipAlternates: true, ...(opts.fill || {}) };
        for (const [pos] of this.random.shuffle([...maze])) {
            if (maze.density() <= this.density)
                break;
            if (!maze.isFixed(pos) && !this.fixed.has(pos)) {
                const changed = maze.saveExcursion(() => maze.setAndUpdate(pos, empty, fillOpts) &&
                    this.check(maze));
                if (changed) {
                    this.postRefine(maze, pos);
                    continue;
                }
            }
        }
        return this.removeTightCycles(maze);
    }
    postRefine(maze, pos) { }
    removeTightCycles(maze) {
        for (let y = 1; y < this.h; y++) {
            for (let x = 1; x < this.w; x++) {
                const pos = (y << 4 | x);
                if (!isTightCycle(maze, pos))
                    continue;
                let replaced = false;
                for (const dir of this.random.ishuffle(Dir.ALL)) {
                    const pos2 = (dir < 2 ? pos - 1 : pos - 16);
                    const ok = maze.saveExcursion(() => maze.replaceEdge(pos2, dir, 0) && this.check(maze));
                    if (!ok)
                        continue;
                    replaced = true;
                }
                if (!replaced)
                    return fail(`failed to remove tight cycle`);
            }
        }
        return true;
    }
    addFeatures(maze) {
        const replaced = new Set();
        const alts = [...maze.alternates()];
        for (const tile of [0x8c]) {
            if (this.survey.tiles.count(tile)) {
                const steps = this.random.shuffle(alts.filter(x => x[3].tile === tile));
                if (steps.length < this.survey.tiles.count(tile)) {
                    return fail(`could not add stair hallway`);
                }
                for (let i = this.survey.tiles.count(tile) - 1; i >= 0; i--) {
                    maze.replace(steps[i][0], steps[i][2]);
                    replaced.add(steps[i][0]);
                }
            }
        }
        for (const type of ['wall', 'bridge']) {
            const screens = this.random.shuffle(alts.filter(x => x[3].wall &&
                x[3].wall.type === type));
            const count = type === 'wall' ? this.walls : this.bridges;
            for (let i = 0; i < count; i++) {
                const scr = screens.pop();
                if (scr == null)
                    return fail(`could not add ${type} ${i}`);
                if (replaced.has(scr[0])) {
                    i--;
                    continue;
                }
                maze.replace(scr[0], scr[2]);
                replaced.add(scr[0]);
            }
        }
        return true;
    }
    finish(maze) {
        if (DEBUG)
            console.log(`finish:\n${maze.show()}`);
        return maze.finish(this.survey, this.loc);
    }
    edges(dir) {
        const other = dir === Dir.RIGHT ? this.w - 1 : dir === Dir.DOWN ? this.h - 1 : 0;
        if (dir & 1)
            return seq(this.h, y => (y << 4 | other));
        return seq(this.w, x => (other << 4 | x));
    }
    randomEdge(dir) {
        const tile = this.random.nextInt(dir & 1 ? this.h : this.w);
        const other = dir === Dir.RIGHT ? this.w - 1 : dir === Dir.DOWN ? this.h - 1 : 0;
        return (dir & 1 ? tile << 4 | other : other << 4 | tile);
    }
    retry(maze, f, tries) {
        for (let i = 0; i < tries; i++) {
            if (maze.saveExcursion(f))
                return true;
        }
        return false;
    }
}
class WideCaveShuffle extends BasicCaveShuffle {
    initialFillMaze(maze) {
        const poi = [...this.fixed];
        if (!maze.connect(poi[0], null, poi[1], null))
            return false;
        for (let i = 2; i < poi.length; i++) {
            if (!maze.connect(poi[i]))
                return false;
        }
        maze.fillAll({ edge: 0 });
        return true;
    }
    refineMaze() {
        return true;
    }
    addFeatures() {
        return true;
    }
}
class WaterfallRiverCaveShuffle extends BasicCaveShuffle {
    initializeFixedScreens(maze) {
        const set = (pos, scr) => {
            this.fixed.add(pos);
            maze.set(pos, scr);
        };
        const river = 1 + this.random.nextInt(this.w - 2);
        const left = this.random.nextInt(river);
        const right = this.w - 1 - this.random.nextInt(this.w - river - 1);
        const bottom = (this.h - 1) << 4;
        set(bottom + left, 131073);
        set(bottom + right, 131073);
        set(bottom + river, 3);
        set(river, 768);
        const riverScreens = [];
        for (let y = 1; y < this.h - 1; y += 2) {
            riverScreens.push(4867);
            riverScreens.push(787);
        }
        this.random.shuffle(riverScreens);
        for (let y = 1; y < this.h - 1; y++) {
            set((y << 4) + river, riverScreens.pop());
        }
        return true;
    }
    check(maze) {
        const traverse = maze.traverse();
        const partitions = [...new Set(traverse.values())].map(s => s.size);
        return partitions.length === 2 &&
            partitions[0] + partitions[1] === traverse.size &&
            partitions[0] > 2 && partitions[1] > 2;
    }
}
class CycleCaveShuffle extends BasicCaveShuffle {
    check(maze) {
        const allTiles = [...maze];
        const nonCritical = allTiles.filter(t => {
            const trav = [...maze.traverse({ without: [t[0]] })];
            return trav.length && trav[0][1].size === trav.length;
        });
        if (!nonCritical.length)
            return false;
        for (let i = 0; i < nonCritical.length; i++) {
            for (let j = 0; j < i; j++) {
                const trav = [...maze.traverse({ without: [nonCritical[i][0],
                            nonCritical[j][0]] })];
                if (trav.length && trav[0][1].size !== trav.length)
                    return true;
            }
        }
        return false;
    }
}
class TightCycleCaveShuffle extends CycleCaveShuffle {
    removeTightCycles() {
        return true;
    }
}
class RiverCaveShuffle extends BasicCaveShuffle {
    constructor() {
        super(...arguments);
        this.addBridge = new Map([[12336, 77872],
            [771, 66307],
            [3, 65539],
            [768, 66304]]);
        this.removeBridge = new Map([
            [77872, [0, 8]],
            [66307, [0, 2, 2, 2, 4, 4, 4, 8]],
            [65539, [0]],
            [66304, [0]],
        ]);
        this.stairScreens = new Map([
            [Dir.DOWN, [135168, 131088, 131073]],
            [Dir.UP, [135184, 69632, 65552, 131328]],
        ]);
        this.riverPathAlternatives = new Map([[0x0303, [1]], [0x3030, [1]]]);
        this.initialRiverAllowed = [66307, 77872,
            0x0033, 0x0330, 0x3300, 0x3003];
        this.riverLoopAllowed = [66307, 77872, 66307, 77872,
            525059, 536624,
            0x0033, 0x0330, 0x3300, 0x3003,
            0x3033, 0x3330, 0x3333];
    }
    tryShuffle(maze) {
        this.landPartitions = [];
        this.river = new Set();
        if (!this.retry(maze, () => this.makeInitialRiver(maze), 5))
            return false;
        if (DEBUG)
            console.log(`Initial river:\n${maze.show()}`);
        if (!this.retry(maze, () => this.branchRiver(maze), 5))
            return false;
        if (DEBUG)
            console.log(`Branched river:\n${maze.show()}`);
        if (!this.retry(maze, () => this.connectLand(maze), 3))
            return false;
        if (DEBUG)
            console.log(`Connected land:\n${maze.show()}`);
        if (!this.retry(maze, () => this.removeBridges(maze), 5))
            return false;
        if (DEBUG)
            console.log(`Removed bridges:\n${maze.show(true)}`);
        if (!this.retry(maze, () => this.addStairs(maze), 3))
            return false;
        if (DEBUG)
            console.log(`Added stairs:\n${maze.show()}`);
        for (const pos of this.river)
            this.fixed.add(pos);
        if (!this.refineMaze(maze))
            return false;
        for (const pos of this.river)
            this.fixed.delete(pos);
        this.bridges = 0;
        if (!this.addFeatures(maze))
            return false;
        if (DEBUG)
            console.log(`Features\n${maze.show()}\n${maze.show(true)}`);
        maze.fillAll({ edge: 0 });
        return this.finish(maze);
    }
    makeInitialRiver(maze) {
        const leftY = this.random.nextInt(this.h - 2) + 1;
        const leftScr = (leftY < this.h / 2 ? 66304 : 65539);
        const rightY = this.random.nextInt(this.h - 2) + 1;
        const rightScr = (rightY < this.h / 2 ? 66304 : 65539);
        const left = (leftY << 4);
        const right = (rightY << 4 | (this.w - 1));
        maze.set(left, leftScr);
        maze.set(right, rightScr);
        if (!maze.connect(left, null, right, null, { allowed: this.initialRiverAllowed,
            pathAlternatives: this.riverPathAlternatives })) {
            return false;
        }
        return true;
    }
    branchRiver(maze) {
        const targetDensity = this.survey.rivers / this.w / this.h;
        for (let i = 0; i < 10 && maze.density() < targetDensity; i++) {
            if (maze.addLoop({ allowed: this.riverLoopAllowed,
                pathAlternatives: this.riverPathAlternatives })) {
                i = 0;
            }
        }
        for (const pos of this.allPos) {
            if (maze.get(pos))
                this.river.add(pos);
        }
        return true;
    }
    connectLand(maze) {
        if (!this.initialFillMaze(maze))
            return false;
        const traversal = maze.traverse();
        const partitions = [...new Set(traversal.values())];
        NEXT_PARTITION: for (const partition of partitions) {
            const positions = new Set();
            for (const spot of partition) {
                const pos = (spot >> 8);
                if (this.river.has(pos))
                    continue NEXT_PARTITION;
                positions.add(pos);
                if (!(spot & 0x0f)) {
                    positions.add((pos - 1));
                }
                else if (!(spot & 0xf0)) {
                    positions.add((pos - 16));
                }
            }
            this.landPartitions.push(positions);
            let found = false;
            for (const pos of this.random.ishuffle([...positions])) {
                for (const dir of Dir.ALL) {
                    const pos1 = Pos.plus(pos, dir);
                    const river = maze.get(pos1) & 0xffff;
                    if (river !== (dir & 1 ? 0x0303 : 0x3030))
                        continue;
                    const landAdj = 1 << (dir << 2);
                    maze.setAndUpdate(pos, (maze.get(pos) | landAdj), { replace: true });
                    found = true;
                    if (this.random.nextInt(2))
                        break;
                    continue NEXT_PARTITION;
                }
            }
            if (found)
                continue NEXT_PARTITION;
            if (positions.size > 2)
                return false;
            for (const pos of positions) {
                maze.delete(pos);
                this.landPartitions.pop();
            }
        }
        return this.check(maze);
    }
    removeBridges(maze) {
        for (const pos of this.random.ishuffle([...this.river])) {
            const scr = maze.get(pos);
            if (scr == null)
                throw new Error(`expected a screen at ${hex(pos)}`);
            for (const opt of this.random.ishuffle(this.removeBridge.get(scr) || [])) {
                const success = maze.saveExcursion(() => {
                    maze.replace(pos, (scr & 0xffff | opt << 16));
                    return this.check(maze);
                });
                if (success)
                    break;
            }
        }
        const bridges = iters.count(iters.filter(this.river, pos => {
            const wall = maze.getSpec(pos).wall;
            return wall ? wall.type === 'bridge' : false;
        }));
        return bridges <= this.survey.bridges;
    }
    addStairs(maze) {
        if (this.survey.edges.size)
            throw new Error(`Unexpected edge: ${this.survey.edges}`);
        OUTER: for (const spec of this.survey.fixed.values()) {
            for (const pos of this.random.ishuffle(this.allPos)) {
                if (this.fixed.has(pos) || this.river.has(pos))
                    continue;
                const ok = maze.saveExcursion(() => {
                    const opts = { replace: true, skipAlternates: true };
                    return maze.setAndUpdate(pos, spec.edges, opts) && this.check(maze);
                });
                if (!ok)
                    continue;
                this.fixed.add(pos);
                continue OUTER;
            }
            return fail(`Could not place fixed screen ${hex(spec.edges)}`);
        }
        const posToPartition = new Map();
        for (const partition of this.landPartitions) {
            for (const pos of partition) {
                posToPartition.set(pos, partition);
            }
        }
        const stairs = [...this.survey.stairs];
        const seen = new Set();
        for (const pos of this.random.ishuffle([...posToPartition.keys()])) {
            if (!stairs.length)
                break;
            const partition = posToPartition.get(pos);
            if (seen.has(partition))
                continue;
            if (this.fixed.has(pos))
                continue;
            for (const stairScr of this.stairScreens.get(stairs[0][1].dir)) {
                const ok = maze.saveExcursion(() => {
                    const opts = { replace: true, skipAlternates: true };
                    return maze.setAndUpdate(pos, stairScr, opts) && this.check(maze);
                });
                if (!ok)
                    continue;
                stairs.shift();
                this.fixed.add(pos);
                seen.add(partition);
                break;
            }
        }
        if (stairs.length)
            return false;
        return true;
    }
}
class EvilSpiritRiverCaveShuffle_old extends BasicCaveShuffle {
    constructor() {
        super(...arguments);
        this.goodScrs = new Set([0x0003, 0x0030, 0x0300, 0x3000,
            0x0033, 0x0303, 0x3003, 0x0330, 0x3030, 0x3300,
            0x3033, 0x3330, 0x3333]);
        this.badScrs = new Set([0x3303, 0x0303]);
    }
    initializeFixedScreens(maze) {
        this.density = this.survey.rivers / this.w / this.h;
        this.phase = 'river';
        this.fixedRiver = new Set();
        if (!this.initializeRiver(maze))
            return false;
        if (!this.refineMaze(maze))
            return false;
        for (const pos of this.allPos) {
            const scr = maze.get(pos);
            if (!scr)
                continue;
            const dir = scr === 0x3303 ? Dir.LEFT : scr === 0x0333 ? Dir.RIGHT : null;
            if (dir != null) {
                const pos1 = Pos.plus(pos, dir);
                const scr1 = maze.get(pos1);
                if (scr1)
                    return false;
                maze.replace(pos1, (scr ^ 0x3333));
            }
        }
        for (const pos of this.allPos) {
            if (!maze.get(pos)) {
                maze.delete(pos);
            }
            else {
                this.fixed.add(pos);
            }
        }
        for (const pos of this.allPos) {
            const scr = maze.get(pos);
            if (!scr)
                continue;
            if (scr !== ((scr << 8 | scr >> 8) & 0xffff))
                continue;
            const aug = (scr << 4 | scr >> 4) & this.random.pick([0x1100, 0x0011]);
            const scr1 = (scr | aug);
            maze.saveExcursion(() => maze.setAndUpdate(pos, scr1));
        }
        if (!super.initializeFixedScreens(maze))
            return false;
        this.density = this.survey.size / this.w / this.h;
        this.phase = 'cave';
        return true;
    }
    postRefine(maze, pos) {
        if (this.phase !== 'river')
            return;
        for (const dir of Dir.ALL) {
            const scr = maze.get(pos, dir);
            if (scr != null && this.badScrs.has(scr)) {
                maze.saveExcursion(() => maze.tryConsolidate(Pos.plus(pos, dir), this.goodScrs, this.badScrs, () => this.check(maze)));
            }
        }
    }
    initializeRiver(maze) {
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                let tile = 0x3333;
                const pos = (y << 4 | x);
                if (y === 0)
                    tile &= 0xfff0;
                if (y === this.h - 1)
                    tile &= 0xf0ff;
                if (x === 0)
                    tile &= 0x0fff;
                if (x === this.w - 1)
                    tile &= 0xff0f;
                maze.set(pos, tile);
            }
        }
        for (const x of [0, this.w - 1]) {
            for (const y of this.random.ishuffle(seq(this.h - 3, y => y + 2))) {
                const pos = (y << 4 | x);
                this.fixed.add(pos);
                this.fixedRiver.add(pos);
                if (this.random.nextInt(2))
                    break;
            }
        }
        return true;
    }
    check(maze) {
        if (this.phase === 'cave')
            return super.check(maze);
        if ([...this.fixedRiver].some(pos => !maze.get(pos)))
            return false;
        const traverse = maze.traverse({ flight: true });
        const partitions = [...new Set(traverse.values())].map(s => s.size);
        return partitions.length === 1 && partitions[0] === traverse.size;
    }
}
const [] = [EvilSpiritRiverCaveShuffle_old];
function fail(msg, maze) {
    console.error(`Reroll: ${msg}`);
    if (maze && DEBUG)
        console.log(maze.show());
    return false;
}
function isTightCycle(maze, pos) {
    const ul = maze.get((pos - 17)) || 0;
    const dr = maze.get((pos)) || 0;
    return !!((ul & 0x0f00) && (ul & 0x00f0) && (dr & 0xf000) && (dr & 0x000f));
}
function fixBorders(maze, pos, scr) {
    try {
        for (const dir of Dir.ALL) {
            if (!maze.inBounds(Pos.plus(pos, dir)) &&
                ((scr >> Dir.shift(dir)) & 0x7) === 7) {
                maze.setBorder(pos, dir, 7);
            }
        }
    }
    catch (err) { }
}
const STRATEGIES = new Map([
    [0x27, CycleCaveShuffle],
    [0x4b, TightCycleCaveShuffle],
    [0x54, CycleCaveShuffle],
    [0x56, WideCaveShuffle],
    [0x57, WaterfallRiverCaveShuffle],
    [0x69, RiverCaveShuffle],
    [0x84, WideCaveShuffle],
    [0xab, RiverCaveShuffle],
]);
export function shuffleCave(loc, random) {
    new (STRATEGIES.get(loc.id) || BasicCaveShuffle)(loc, random).shuffle();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFXLElBQUksRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUN6QyxPQUFPLEVBQUMsT0FBTyxFQUFTLE1BQU0sV0FBVyxDQUFDO0FBQzFDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFNLE1BQU0sWUFBWSxDQUFDO0FBS3pDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVqQyxNQUFNLEtBQUssR0FBWSxLQUFLLENBQUM7QUEwQjdCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQztBQUNyQixNQUFNLGdCQUFnQjtJQVlwQixZQUFxQixHQUFhLEVBQVcsTUFBYztRQUF0QyxRQUFHLEdBQUgsR0FBRyxDQUFVO1FBQVcsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUN6RCxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxPQUFPO1FBQ0wsS0FBSyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsT0FBTyxHQUFHLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNuRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJ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LENBQUMsR0FBUTtRQUNaLE1BQU0sS0FBSyxHQUNQLEdBQUcsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxHQUFHLEdBQUcsQ0FBQztZQUFFLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFRLENBQUMsQ0FBQztRQUM5RCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBUSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxHQUFRO1FBQ2pCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLEtBQUssR0FDUCxHQUFHLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsR0FB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SSxFQUFFLHlCQUF5QixDQUFDO0lBQ2pDLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDO0lBQ3hCLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQztJQUN2QixDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztDQUN6QixDQUFDLENBQUM7QUFFSCxNQUFNLFVBQVUsV0FBVyxDQUFDLEdBQWEsRUFBRSxNQUFjO0lBQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUMxRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGaWxsT3B0cywgTWF6ZX0gZnJvbSAnLi9tYXplLmpzJztcbmltcG9ydCB7U3BlY1NldCwgU3VydmV5fSBmcm9tICcuL3NwZWMuanMnO1xuaW1wb3J0IHtEaXIsIFBvcywgU2NyfSBmcm9tICcuL3R5cGVzLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuLy9pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG4vL2ltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi4vcm9tL21vbnN0ZXIuanMnO1xuaW1wb3J0IHtoZXgsIHNlcX0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHtpdGVyc30gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmNvbnN0IERFQlVHOiBib29sZWFuID0gZmFsc2U7XG5cbi8vIGludmFyaWFudHMgZm9yIHNodWZmbGluZyBjYXZlczpcbi8vICAtIGRlYWQgZW5kc1xuLy8gIC0gZG9vcnMgKHR5cGVzL2RpcmVjdGlvbnMpXG4vLyAgLSB3YWxscyAobnVtYmVyLCBub3QgbmVjZXNzYXJpbHkgZGlyZWN0aW9uKVxuLy8gIC0gXCJiaWcgcm9vbXNcIlxuLy8gIC0gdHJlYXN1cmUgY2hlc3RzLCBldGMuXG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlQnJpZGdlQ2F2ZSh1cHBlcjogTG9jYXRpb24sIGxvd2VyOiBMb2NhdGlvbixcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSwge2F0dGVtcHRzID0gMTAwfSA9IHt9KSB7XG4vLyAgIC8vIFRPRE8gLSBkb2Vzbid0IHdvcmsgeWV0LlxuXG4vLyAgIC8vIFBsYW4gLSBzaHVmZmxlIHRoZSBmaXJzdCBvbmUgbm9ybWFsbHksIHRoZW4gZmluZCBkaXNwbGFjZW1lbnQgYW5kXG4vLyAgIC8vIHNldCB0aGUgaW5pdGlhbCBkaXNwbGFjZW1lbnQgZm9yIHRoZSBsb3dlciBzY3JlZW4gYWNjb3JkaW5nbHkuXG4vLyAgIC8vICAgICAgLSBuZWVkIHRvIG1hcmsgdGhlIGNvcnJlY3Qgc3RhaXJzIGFzIGZpeGVkIChhbmQgZml4IHVwIGhvdyB3ZVxuLy8gICAvLyAgICAgICAgaGFuZGxlIGZpeGVkIGluIGdlbmVyYWwpLlxuXG4vLyAgIHNodWZmbGVDYXZlKHVwcGVyLCByYW5kb20sIHthdHRlbXB0c30pO1xuLy8gICBzaHVmZmxlQ2F2ZShsb3dlciwgcmFuZG9tLCB7YXR0ZW1wdHN9KTtcbi8vIH1cblxuaW50ZXJmYWNlIFNodWZmbGVTdHJhdGVneSB7XG4gIG5ldyhsb2M6IExvY2F0aW9uLCByYW5kb206IFJhbmRvbSk6IHtzaHVmZmxlOiAoKSA9PiB2b2lkfTtcbn1cblxuY29uc3QgQVRURU1QVFMgPSAxMDA7XG5jbGFzcyBCYXNpY0NhdmVTaHVmZmxlIHtcbiAgcmVhZG9ubHkgc3VydmV5OiBTdXJ2ZXk7XG5cbiAgLy8gVGhlc2UgYXJlIGFsbCBhc3NpZ25lZCBpbiBzaHVmZmxlKCksIGJlZm9yZSB0cnlTaHVmZmxlKCkgaXMgY2FsbGVkLlxuICB3ITogbnVtYmVyO1xuICBoITogbnVtYmVyO1xuICBkZW5zaXR5ITogbnVtYmVyO1xuICBhbGxQb3MhOiBQb3NbXTtcbiAgd2FsbHMhOiBudW1iZXI7XG4gIGJyaWRnZXMhOiBudW1iZXI7XG4gIGZpeGVkITogU2V0PFBvcz47XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbG9jOiBMb2NhdGlvbiwgcmVhZG9ubHkgcmFuZG9tOiBSYW5kb20pIHtcbiAgICB0aGlzLnN1cnZleSA9IFNwZWNTZXQuQ0FWRS5zdXJ2ZXkobG9jKTtcbiAgfVxuXG4gIHNodWZmbGUoKTogdm9pZCB7XG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCBBVFRFTVBUUzsgYXR0ZW1wdCsrKSB7XG4gICAgICBjb25zdCB3ID0gdGhpcy53ID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oOCwgdGhpcy5waWNrV2lkdGgoKSkpO1xuICAgICAgY29uc3QgaCA9IHRoaXMuaCA9IE1hdGgubWF4KDEsIE1hdGgubWluKDE2LCB0aGlzLnBpY2tIZWlnaHQoKSkpO1xuICAgICAgdGhpcy5hbGxQb3MgPVxuICAgICAgICAgIHNlcSh3ICogaCwgeXggPT4gKCh5eCAlIHcpIHwgTWF0aC5mbG9vcih5eCAvIHcpIDw8IDQpIGFzIFBvcyk7XG4gICAgICB0aGlzLmRlbnNpdHkgPSB0aGlzLnN1cnZleS5zaXplIC8gdyAvIGg7XG4gICAgICB0aGlzLndhbGxzID0gdGhpcy5zdXJ2ZXkud2FsbHM7XG4gICAgICB0aGlzLmJyaWRnZXMgPSB0aGlzLnN1cnZleS5icmlkZ2VzO1xuICAgICAgdGhpcy5maXhlZCA9IG5ldyBTZXQoKTtcbiAgICAgIGNvbnN0IG1hemUgPSBuZXcgTWF6ZSh0aGlzLnJhbmRvbSwgdGhpcy5oLCB0aGlzLncsIHRoaXMuc3VydmV5LnNwZWNzKTtcbiAgICAgIGlmICh0aGlzLnRyeVNodWZmbGUobWF6ZSkpIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3Qgc2h1ZmZsZSAke2hleCh0aGlzLmxvYy5pZCl9ICR7dGhpcy5sb2MubmFtZX1gKTtcbiAgfVxuXG4gIGNoZWNrKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICBjb25zdCB0cmF2ZXJzZSA9IG1hemUudHJhdmVyc2UoKTtcbiAgICByZXR1cm4gdHJhdmVyc2Uuc2l6ZSA+IDIgJiZcbiAgICAgICAgdHJhdmVyc2UudmFsdWVzKCkubmV4dCgpLnZhbHVlLnNpemUgPT09IHRyYXZlcnNlLnNpemU7XG4gIH1cblxuICBwaWNrV2lkdGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5sb2Mud2lkdGggKyBNYXRoLmZsb29yKCh0aGlzLnJhbmRvbS5uZXh0SW50KDUpKSAvIDMpO1xuICAgIC8vcmV0dXJuIHRoaXMubG9jLndpZHRoICsgTWF0aC5mbG9vcigodGhpcy5yYW5kb20ubmV4dEludCg2KSAtIDEpIC8gMyk7XG4gIH1cblxuICBwaWNrSGVpZ2h0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMubG9jLmhlaWdodCArIE1hdGguZmxvb3IoKHRoaXMucmFuZG9tLm5leHRJbnQoNSkpIC8gMyk7XG4gICAgLy9yZXR1cm4gdGhpcy5sb2MuaGVpZ2h0ICsgTWF0aC5mbG9vcigodGhpcy5yYW5kb20ubmV4dEludCg2KSAtIDEpIC8gMyk7XG4gIH1cblxuICB0cnlTaHVmZmxlKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBTaHVmZmxlICR7dGhpcy5sb2MubmFtZX1gKTtcbiAgICBpZiAoIXRoaXMuaW5pdGlhbGl6ZUZpeGVkU2NyZWVucyhtYXplKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYEluaXRpYWxpemVkXFxuJHttYXplLnNob3coKX1gKTtcbiAgICBpZiAoIXRoaXMuaW5pdGlhbEZpbGxNYXplKG1hemUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgSW5pdGlhbCBmaWxsXFxuJHttYXplLnNob3coKX1gKTtcbiAgICBpZiAoIXRoaXMucmVmaW5lTWF6ZShtYXplKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYFJlZmluZWRcXG4ke21hemUuc2hvdygpfWApO1xuICAgIGlmICghdGhpcy5hZGRGZWF0dXJlcyhtYXplKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYEZlYXR1cmVzXFxuJHttYXplLnNob3coKX1gKTtcbiAgICByZXR1cm4gdGhpcy5maW5pc2gobWF6ZSk7XG4gIH1cblxuICBpbml0aWFsaXplRml4ZWRTY3JlZW5zKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IFtwb3MwLCBlZGdlXSBvZiB0aGlzLnN1cnZleS5lZGdlcykge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5lZGdlcyhlZGdlLmRpcikpKSB7XG4gICAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAgICAgdGhpcy5maXhlZC5hZGQocG9zKTtcbiAgICAgICAgY29uc3QgZml4ZWRTY3IgPSB0aGlzLnN1cnZleS5maXhlZC5nZXQocG9zMCk7XG4gICAgICAgIGlmIChmaXhlZFNjciA9PSBudWxsKSB7XG4gICAgICAgICAgbWF6ZS5zZXRCb3JkZXIocG9zLCBlZGdlLmRpciwgNik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTk9URTogbG9jYXRpb24gMzUgKHNhYnJlIE4gc3VtbWl0IHByaXNvbikgaGFzIGEgJzEnIGV4aXQgZWRnZVxuICAgICAgICAgIC8vIE5PVEU6IGNhbid0IGhhbmRsZSBlZGdlIGV4aXRzIGZvciAxeD8gbWFwcy5cbiAgICAgICAgICBpZiAodGhpcy5oID09PSAxKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgbWF6ZS5zZXRCb3JkZXIocG9zLCBlZGdlLmRpcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAoZml4ZWRTY3IuZWRnZXMgPj4+IERpci5zaGlmdChlZGdlLmRpcikpICYgMHhmKTtcbiAgICAgICAgICBmaXhCb3JkZXJzKG1hemUsIHBvcywgZml4ZWRTY3IuZWRnZXMpO1xuICAgICAgICAgIG1hemUuc2V0KHBvcywgZml4ZWRTY3IuZWRnZXMpO1xuICAgICAgICAgIGlmIChmaXhlZFNjci53YWxsKSB0aGlzLndhbGxzLS07XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbcG9zMCwgc2NyXSBvZiB0aGlzLnN1cnZleS5maXhlZCkge1xuICAgICAgaWYgKHRoaXMuc3VydmV5LmVkZ2VzLmhhcyhwb3MwKSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmFsbFBvcykpIHtcbiAgICAgICAgaWYgKHRoaXMuZml4ZWQuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBvayA9IG1hemUuc2F2ZUV4Y3Vyc2lvbigoKSA9PiB7XG4gICAgICAgICAgZml4Qm9yZGVycyhtYXplLCBwb3MsIHNjci5lZGdlcyk7XG4gICAgICAgICAgcmV0dXJuIG1hemUudHJ5U2V0KHBvcywgc2NyLmVkZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghb2spIGNvbnRpbnVlO1xuICAgICAgICB0aGlzLmZpeGVkLmFkZChwb3MpO1xuICAgICAgICBpZiAoc2NyLndhbGwpIHRoaXMud2FsbHMtLTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhaXJzID0gWy4uLnRoaXMuc3VydmV5LnN0YWlycy52YWx1ZXMoKV07XG4gICAgbGV0IHRyaWVzID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgdHJpZXMgPCAxMCAmJiBpIDwgc3RhaXJzLmxlbmd0aDsgdHJpZXMrKykge1xuICAgICAgY29uc3QgcG9zID0gbWF6ZS5yYW5kb21Qb3MoKTtcbiAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAgIGlmICghbWF6ZS5maWxsKHBvcywge3N0YWlyOiBzdGFpcnNbaV0uZGlyfSkpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5maXhlZC5hZGQocG9zKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGBBZGRlZCAke3N0YWlyc1tpXS5kaXJ9IHN0YWlyIGF0ICR7aGV4KHBvcyl9YCk7XG4gICAgICB0cmllcyA9IDA7XG4gICAgICBpKys7XG4gICAgfVxuICAgIGlmICh0cmllcyA+PSAxMCkgcmV0dXJuIGZhaWwoYGNvdWxkIG5vdCBhZGQgYWxsIHN0YWlyc2ApO1xuICAgIC8vIGZpbGwgdGhlIGVkZ2Ugc2NyZWVucyBhbmQgZml4ZWQgc2NyZWVucyBhbmQgdGhlaXIgbmVpZ2hib3JzIGZpcnN0LCBzaW5jZVxuICAgIC8vIHRoZXkgdGVuZCB0byBoYXZlIG1vcmUgZXNvdGVyaWMgcmVxdWlyZW1lbnRzLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaW5pdGlhbEZpbGxNYXplKG1hemU6IE1hemUsIG9wdHM6IEZpbGxPcHRzID0ge30pOiBib29sZWFuIHtcbiAgICBjb25zdCBmaWxsT3B0cyA9IHtcbiAgICAgIGVkZ2U6IDEsXG4gICAgICBmdXp6eTogMSxcbiAgICAgIHNodWZmbGVPcmRlcjogdHJ1ZSxcbiAgICAgIHNraXBBbHRlcm5hdGVzOiB0cnVlLFxuICAgICAgLi4ub3B0cyxcbiAgICB9O1xuICAgIGlmICghbWF6ZS5maWxsQWxsKGZpbGxPcHRzKSkgcmV0dXJuIGZhaWwoYGNvdWxkIG5vdCBmaWxsIG9wZW5gLCBtYXplKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJlZmluZU1hemUobWF6ZTogTWF6ZSwgb3B0czogUmVmaW5lT3B0cyA9IHt9KTogYm9vbGVhbiB7XG4gICAgLy8gSW5pdGlhbCBzZXR1cDogYWRkIHBvaW50cyBvZiBpbnRlcmVzdCwgdGhlbiBmaWxsIG1hcCB3aXRoIDEncyBhcyBtdWNoXG4gICAgLy8gYXMgcG9zc2libGUuXG4gICAgLy8gY29uc29sZS5sb2coYGluaXRpYWw6XFxuJHttYXplLnNob3coKX1gKTtcbiAgICBpZiAoIXRoaXMuY2hlY2sobWF6ZSkpIHJldHVybiBmYWlsKGBjaGVjayBmYWlsZWQgYWZ0ZXIgaW5pdGlhbCBzZXR1cGAsIG1hemUpO1xuXG4gICAgY29uc3QgZW1wdHkgPSAwIGFzIFNjcjtcbiAgICBjb25zdCBmaWxsT3B0cyA9IHtza2lwQWx0ZXJuYXRlczogdHJ1ZSwgLi4uKG9wdHMuZmlsbCB8fCB7fSl9O1xuICAgIGZvciAoY29uc3QgW3Bvc10gb2YgdGhpcy5yYW5kb20uc2h1ZmZsZShbLi4ubWF6ZV0pKSB7XG4gICAgICBpZiAobWF6ZS5kZW5zaXR5KCkgPD0gdGhpcy5kZW5zaXR5KSBicmVhaztcbiAgICAgIGlmICghbWF6ZS5pc0ZpeGVkKHBvcykgJiYgIXRoaXMuZml4ZWQuaGFzKHBvcykpIHtcbiAgICAgICAgY29uc3QgY2hhbmdlZCA9XG4gICAgICAgICAgICBtYXplLnNhdmVFeGN1cnNpb24oXG4gICAgICAgICAgICAgICAgKCkgPT4gbWF6ZS5zZXRBbmRVcGRhdGUocG9zLCBlbXB0eSwgZmlsbE9wdHMpICYmXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVjayhtYXplKSk7XG4gICAgICAgIC8vY29uc29sZS5sb2coYFJlZmluZW1lbnQgc3RlcCAke3Bvcy50b1N0cmluZygxNil9IGNoYW5nZWQgJHtjaGFuZ2VkfVxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gICAgICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgICAgdGhpcy5wb3N0UmVmaW5lKG1hemUsIHBvcyk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjb25zb2xlLmxvZyhgcGVyY29sYXRlZDpcXG4ke21hemUuc2hvdygpfWApO1xuXG4gICAgLy8gUmVtb3ZlIGFueSB0aWdodCBjeWNsZXNcbiAgICByZXR1cm4gdGhpcy5yZW1vdmVUaWdodEN5Y2xlcyhtYXplKTtcbiAgfVxuXG4gIC8vIFJ1bnMgYWZ0ZXIgYSB0aWxlIGlzIGRlbGV0ZWQgZHVyaW5nIHJlZmluZW1lbnQuICBGb3Igb3ZlcnJpZGUuXG4gIHBvc3RSZWZpbmUobWF6ZTogTWF6ZSwgcG9zOiBQb3MpIHt9XG5cbiAgcmVtb3ZlVGlnaHRDeWNsZXMobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIGZvciAobGV0IHkgPSAxOyB5IDwgdGhpcy5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAxOyB4IDwgdGhpcy53OyB4KyspIHtcbiAgICAgICAgY29uc3QgcG9zID0gKHkgPDwgNCB8IHgpIGFzIFBvcztcbiAgICAgICAgaWYgKCFpc1RpZ2h0Q3ljbGUobWF6ZSwgcG9zKSkgY29udGludWU7XG4gICAgICAgIC8vIHJlbW92ZSB0aGUgdGlnaHQgY3ljbGVcbiAgICAgICAgbGV0IHJlcGxhY2VkID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKERpci5BTEwpKSB7XG4gICAgICAgICAgLy8gVE9ETyAtIHRoaXMgd2lsbCBuZWVkIHRvIGNoYW5nZSBpZiB3ZSBpbnZlcnQgdGhlIGRpcmVjdGlvbiFcbiAgICAgICAgICBjb25zdCBwb3MyID0gKGRpciA8IDIgPyBwb3MgLSAxIDogcG9zIC0gMTYpIGFzIFBvcztcbiAgICAgICAgICBjb25zdCBvayA9XG4gICAgICAgICAgICAgIG1hemUuc2F2ZUV4Y3Vyc2lvbihcbiAgICAgICAgICAgICAgICAgICgpID0+IG1hemUucmVwbGFjZUVkZ2UocG9zMiwgZGlyLCAwKSAmJiB0aGlzLmNoZWNrKG1hemUpKTtcbiAgICAgICAgICBpZiAoIW9rKSBjb250aW51ZTtcbiAgICAgICAgICByZXBsYWNlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyZXBsYWNlZCkgcmV0dXJuIGZhaWwoYGZhaWxlZCB0byByZW1vdmUgdGlnaHQgY3ljbGVgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRGZWF0dXJlcyhtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgLy8gQWRkIHN0YWlyIGhhbGx3YXlzIGFuZCB3YWxsc1xuICAgIC8vICAgVE9ETyAtIG1ha2Ugc3VyZSB0aGV5J3JlIG9uICphKiBjcml0aWNhbCBwYXRoP1xuICAgIGNvbnN0IHJlcGxhY2VkID0gbmV3IFNldDxQb3M+KCk7XG4gICAgY29uc3QgYWx0cyA9IFsuLi5tYXplLmFsdGVybmF0ZXMoKV07XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIFsweDhjXSkgeyAvLyAsIDB4OGQsIDB4OGVdKSB7XG4gICAgICBpZiAodGhpcy5zdXJ2ZXkudGlsZXMuY291bnQodGlsZSkpIHtcbiAgICAgICAgY29uc3Qgc3RlcHMgPSB0aGlzLnJhbmRvbS5zaHVmZmxlKGFsdHMuZmlsdGVyKHggPT4geFszXS50aWxlID09PSB0aWxlKSk7XG4gICAgICAgIGlmIChzdGVwcy5sZW5ndGggPCB0aGlzLnN1cnZleS50aWxlcy5jb3VudCh0aWxlKSkge1xuICAgICAgICAgIHJldHVybiBmYWlsKGBjb3VsZCBub3QgYWRkIHN0YWlyIGhhbGx3YXlgKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdXJ2ZXkudGlsZXMuY291bnQodGlsZSkgLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIG1hemUucmVwbGFjZShzdGVwc1tpXVswXSwgc3RlcHNbaV1bMl0pO1xuICAgICAgICAgIHJlcGxhY2VkLmFkZChzdGVwc1tpXVswXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIFsnd2FsbCcsICdicmlkZ2UnXSkge1xuXG4gICAgICAvLyBUT0RPIGh0dHA6Ly9sb2NhbGhvc3Q6ODA4MS8jcm9tPW9yaWcubmVzJmluaXQ9Y3J5c3RhbGlzL2RlYnVnJnBhdGNoPWNyeXN0YWxpcy9wYXRjaCZmbGFncz1Ec0ZjcHJzdHdHZkhiZGd3TWVydFBzUm9wcnN0U2NrdFNtVGFibXBXbXR1dyZzZWVkPTMxMzhlMTUxXG4gICAgICAvLyAtIG9ubHkgcGxhY2VkIDEgd2FsbCwgYWxzbyBtaXNzZWQgYSBjaGVzdCwgbWF5YmU/IC0gbmVlZHMgdG8gZXJyb3JcbiAgICAgIC8vIDE1MiAtPiBjYW4ndCBtYWtlIGlyb24gd2FsbHMgaG9yaXpvbnRhbCEgLS0+IGxvb2sgYXQgdGlsZXNldCEhIVxuXG4gICAgICBjb25zdCBzY3JlZW5zID1cbiAgICAgICAgICB0aGlzLnJhbmRvbS5zaHVmZmxlKGFsdHMuZmlsdGVyKHggPT4geFszXS53YWxsICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhbM10ud2FsbC50eXBlID09PSB0eXBlKSk7XG4gICAgICBjb25zdCBjb3VudCA9IHR5cGUgPT09ICd3YWxsJyA/IHRoaXMud2FsbHMgOiB0aGlzLmJyaWRnZXM7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgY29uc3Qgc2NyID0gc2NyZWVucy5wb3AoKTtcbiAgICAgICAgaWYgKHNjciA9PSBudWxsKSByZXR1cm4gZmFpbChgY291bGQgbm90IGFkZCAke3R5cGV9ICR7aX1gKTtcbiAgICAgICAgaWYgKHJlcGxhY2VkLmhhcyhzY3JbMF0pKSB7XG4gICAgICAgICAgaS0tO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIG1hemUucmVwbGFjZShzY3JbMF0sIHNjclsyXSk7XG4gICAgICAgIHJlcGxhY2VkLmFkZChzY3JbMF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb25zb2xpZGF0ZSBhcyBtdWNoIG9mIHRoaXMgYXMgcG9zc2libGUgaW50byBNYXplLlxuICAvLyAgICAgIC0gbW92ZSBhbGwgdGhlIFNDUkVFTiBjb25zdGFudHMgaW50byB0aGVyZSBhcyB3ZWxsXG4gIC8vICAgICAgICBzbyB0aGF0IHdlIGNhbiByZXVzZSB0aGVtIG1vcmUgd2lkZWx5IC0gY29uc29saWRhdGVcbiAgLy8gICAgICAgIGdvYSBhbmQgc3dhbXA/XG4gIGZpbmlzaChtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgZmluaXNoOlxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gICAgcmV0dXJuIG1hemUuZmluaXNoKHRoaXMuc3VydmV5LCB0aGlzLmxvYyk7XG4gICAgLy8gTWFwIGZyb20gcHJpb3JpdHkgdG8gYXJyYXkgb2YgW3ksIHhdIHBpeGVsIGNvb3Jkc1xuICAgIC8vIFdyaXRlIGJhY2sgdG8gdGhlIGxvY2F0aW9uLiAgRXhpdHMsIGVudHJhbmNlcywgbnBjcywgdHJpZ2dlcnMsXG4gICAgLy8gbW9uc3RlcnMsIGFuZCBjaGVzdHMgbXVzdCBhbGwgYmUgbWFwcGVkIHRvIG5ldyBsb2NhdGlvbnMuXG4gICAgLy8gd2FsbHMsIE5QQ3MsIHRyaWdnZXJzLCBjaGVzdHMsIG1vbnN0ZXJzLi4uP1xuICAgIC8vIFRPRE8gLSByYW5kb20gdGhpbmdzIGxpa2UgdHJpZ2dlcnMgKHN1bW1pdCBjYXZlLCB6ZWJ1IGNhdmUpLCBucGNzP1xuICAgIC8vIFRPRE8gLSBuZWVkIHRvIGFjdHVhbGx5IGZpbGwgaW4gZXhpdHMsIHN0YWlycywgbW9uc3RlcnMsIGNoZXN0c1xuICAgIC8vIFRPRE8gLSBleHRlbmQgb3V0IGFueSBhZGRpdGlvbmFsIG5lZWRlZCBkZWFkLWVuZHMsIGVpdGhlclxuICAgIC8vICAgICAgICBqdXN0IHRvIGdldCB0aGUgcmlnaHQgbnVtYmVyLCBvciB0byBoYXZlIGEgY2hlc3RcbiAgfVxuXG4gIGVkZ2VzKGRpcjogRGlyKTogUG9zW10ge1xuICAgIGNvbnN0IG90aGVyID1cbiAgICAgICAgZGlyID09PSBEaXIuUklHSFQgPyB0aGlzLncgLSAxIDogZGlyID09PSBEaXIuRE9XTiA/IHRoaXMuaCAtIDEgOiAwO1xuICAgIGlmIChkaXIgJiAxKSByZXR1cm4gc2VxKHRoaXMuaCwgeSA9PiAoeSA8PCA0IHwgb3RoZXIpIGFzIFBvcyk7XG4gICAgcmV0dXJuIHNlcSh0aGlzLncsIHggPT4gKG90aGVyIDw8IDQgfCB4KSBhcyBQb3MpO1xuICB9XG5cbiAgcmFuZG9tRWRnZShkaXI6IERpcik6IFBvcyB7XG4gICAgY29uc3QgdGlsZSA9IHRoaXMucmFuZG9tLm5leHRJbnQoZGlyICYgMSA/IHRoaXMuaCA6IHRoaXMudyk7XG4gICAgY29uc3Qgb3RoZXIgPVxuICAgICAgICBkaXIgPT09IERpci5SSUdIVCA/IHRoaXMudyAtIDEgOiBkaXIgPT09IERpci5ET1dOID8gdGhpcy5oIC0gMSA6IDA7XG4gICAgcmV0dXJuIChkaXIgJiAxID8gdGlsZSA8PCA0IHwgb3RoZXIgOiBvdGhlciA8PCA0IHwgdGlsZSkgYXMgUG9zO1xuICB9XG5cbiAgcmV0cnkobWF6ZTogTWF6ZSwgZjogKCkgPT4gYm9vbGVhbiwgdHJpZXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdHJpZXM7IGkrKykge1xuICAgICAgaWYgKG1hemUuc2F2ZUV4Y3Vyc2lvbihmKSkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgUmVmaW5lT3B0cyB7XG4gIGZpbGw/OiBGaWxsT3B0cztcbiAgbG9vcD86IGJvb2xlYW47XG59XG5cbmNsYXNzIFdpZGVDYXZlU2h1ZmZsZSBleHRlbmRzIEJhc2ljQ2F2ZVNodWZmbGUge1xuICBpbml0aWFsRmlsbE1hemUobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIC8vIEluaXRpYWwgc3RhdGUgc2hvdWxkIGJlIHNvbWUgZXhpdCBzY3JlZW5zIG9uIHRvcCwgYW5kIGEgc3RhaXJcbiAgICAvLyBzb21ld2hlcmUgYmVuZWF0aC4gIFRoZXNlIGFyZSBsaXN0ZWQgaW4gYGZpeGVkYC4gIEl0ZXJhdGUgb3ZlclxuICAgIC8vIHRoaXMgc2V0IGFuZCBjb25uZWN0IHRoZW0gaW4gc29tZSB3YXkgb3Igb3RoZXIuXG4gICAgY29uc3QgcG9pID0gWy4uLnRoaXMuZml4ZWRdO1xuICAgIC8vIEZpcnN0IGNvbm5lY3QgcG9pWzBdIHRvIHBvaVsxXS5cbiAgICBpZiAoIW1hemUuY29ubmVjdChwb2lbMF0sIG51bGwsIHBvaVsxXSwgbnVsbCkpIHJldHVybiBmYWxzZTtcbiAgICAvLyBDb25uZWN0IGFsbCByZW1haW5pbmcgcG9pIHRvIHRoZSBleGlzdGluZyBjaGFubmVsLlxuICAgIGZvciAobGV0IGkgPSAyOyBpIDwgcG9pLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIW1hemUuY29ubmVjdChwb2lbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2cobWF6ZS5zaG93KCkpO1xuICAgIG1hemUuZmlsbEFsbCh7ZWRnZTogMH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gTm90aGluZyBlbHNlIHRvIGRvIGF0IHRoaXMgcG9pbnQuXG4gIHJlZmluZU1hemUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRGZWF0dXJlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5jbGFzcyBXYXRlcmZhbGxSaXZlckNhdmVTaHVmZmxlIGV4dGVuZHMgQmFzaWNDYXZlU2h1ZmZsZSB7XG4gIGluaXRpYWxpemVGaXhlZFNjcmVlbnMobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNldCA9IChwb3M6IG51bWJlciwgc2NyOiBudW1iZXIpID0+IHtcbiAgICAgIHRoaXMuZml4ZWQuYWRkKHBvcyBhcyBQb3MpO1xuICAgICAgbWF6ZS5zZXQocG9zIGFzIFBvcywgc2NyIGFzIFNjcik7XG4gICAgfTtcbiAgICBjb25zdCByaXZlciA9IDEgKyB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMudyAtIDIpO1xuICAgIGNvbnN0IGxlZnQgPSB0aGlzLnJhbmRvbS5uZXh0SW50KHJpdmVyKTtcbiAgICBjb25zdCByaWdodCA9IHRoaXMudyAtIDEgLSB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMudyAtIHJpdmVyIC0gMSk7XG4gICAgY29uc3QgYm90dG9tID0gKHRoaXMuaCAtIDEpIDw8IDQ7XG4gICAgc2V0KGJvdHRvbSArIGxlZnQsIDB4Ml8wMDAxKTtcbiAgICBzZXQoYm90dG9tICsgcmlnaHQsIDB4Ml8wMDAxKTtcbiAgICBzZXQoYm90dG9tICsgcml2ZXIsIDB4MF8wMDAzKTtcbiAgICBzZXQocml2ZXIsIDB4MF8wMzAwKTtcbiAgICBjb25zdCByaXZlclNjcmVlbnMgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMTsgeSA8IHRoaXMuaCAtIDE7IHkgKz0gMikge1xuICAgICAgcml2ZXJTY3JlZW5zLnB1c2goMHgwXzEzMDMpO1xuICAgICAgcml2ZXJTY3JlZW5zLnB1c2goMHgwXzAzMTMpO1xuICAgIH1cbiAgICB0aGlzLnJhbmRvbS5zaHVmZmxlKHJpdmVyU2NyZWVucyk7XG4gICAgZm9yIChsZXQgeSA9IDE7IHkgPCB0aGlzLmggLSAxOyB5KyspIHtcbiAgICAgIHNldCgoeSA8PCA0KSArIHJpdmVyLCByaXZlclNjcmVlbnMucG9wKCkhKTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZyhtYXplLnNob3coKSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjaGVjayhtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdHJhdmVyc2UgPSBtYXplLnRyYXZlcnNlKCk7XG4gICAgY29uc3QgcGFydGl0aW9ucyA9IFsuLi5uZXcgU2V0KHRyYXZlcnNlLnZhbHVlcygpKV0ubWFwKHMgPT4gcy5zaXplKTtcbiAgICByZXR1cm4gcGFydGl0aW9ucy5sZW5ndGggPT09IDIgJiZcbiAgICAgIHBhcnRpdGlvbnNbMF0gKyBwYXJ0aXRpb25zWzFdID09PSB0cmF2ZXJzZS5zaXplICYmXG4gICAgICBwYXJ0aXRpb25zWzBdID4gMiAmJiBwYXJ0aXRpb25zWzFdID4gMjtcbiAgfVxufVxuXG5jbGFzcyBDeWNsZUNhdmVTaHVmZmxlIGV4dGVuZHMgQmFzaWNDYXZlU2h1ZmZsZSB7XG4gIC8vIEVuc3VyZSB0aGUgY2F2ZSBoYXMgYXQgbGVhc3Qgb25lIGN5Y2xlLlxuICBjaGVjayhtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgY29uc3QgYWxsVGlsZXMgPSBbLi4ubWF6ZV07XG4gICAgY29uc3Qgbm9uQ3JpdGljYWwgPSBhbGxUaWxlcy5maWx0ZXIodCA9PiB7XG4gICAgICBjb25zdCB0cmF2ID0gWy4uLm1hemUudHJhdmVyc2Uoe3dpdGhvdXQ6IFt0WzBdXX0pXTtcbiAgICAgIHJldHVybiB0cmF2Lmxlbmd0aCAmJiB0cmF2WzBdWzFdLnNpemUgPT09IHRyYXYubGVuZ3RoO1xuICAgIH0pO1xuICAgIGlmICghbm9uQ3JpdGljYWwubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gZmluZCB0d28gbm9uY3JpdGljYWwgdGlsZXMgdGhhdCB0b2dldGhlciAqYXJlKiBjcml0aWNhbFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9uQ3JpdGljYWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaTsgaisrKSB7XG4gICAgICAgIGNvbnN0IHRyYXYgPSBbLi4ubWF6ZS50cmF2ZXJzZSh7d2l0aG91dDogW25vbkNyaXRpY2FsW2ldWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub25Dcml0aWNhbFtqXVswXV19KV07XG4gICAgICAgIGlmICh0cmF2Lmxlbmd0aCAmJiB0cmF2WzBdWzFdLnNpemUgIT09IHRyYXYubGVuZ3RoKSByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmNsYXNzIFRpZ2h0Q3ljbGVDYXZlU2h1ZmZsZSBleHRlbmRzIEN5Y2xlQ2F2ZVNodWZmbGUge1xuICAvLyBKdXN0IGRvbid0IHJlbW92ZSB0aGVtXG4gIHJlbW92ZVRpZ2h0Q3ljbGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbmNsYXNzIFJpdmVyQ2F2ZVNodWZmbGUgZXh0ZW5kcyBCYXNpY0NhdmVTaHVmZmxlIHtcblxuICAvLyBTZXR0aW5nIHVwIGEgdmlhYmxlIHJpdmllciBpcyByZWFsbHkgaGFyZC5cbiAgLy8gUG9zc2libGUgaWRlYXM6XG4gIC8vICAxLiBzdGFydCB3aXRoIGZ1bGwgcml2ZXIgY292ZXJhZ2UsIGFubmVhbCBhd2F5IHRpbGVzIHVudGlsIHdlIGdldCB0aGVcbiAgLy8gICAgIGNvcnJlY3Qgcml2ZXIgZGVuc2l0eSwgdGhlbiBkbyBsYW5kIHRpbGVzIHRoZSBzYW1lIHdheVxuICAvLyAgICAgLSBpc3N1ZTogd2UgZG9uJ3QgZ2V0IGVub3VnaCBzdHJhaWdodCB0aWxlcyB0aGF0IHdheVxuICAvLyAgMi4gdXNlIGxpbmVzPyAgc3RhcnQgdy8gZnVsbCB2ZXJ0aWNhbCBsaW5lIHJpdmVycywgZGlzY29ubmVjdGVkXG4gIC8vICAgICB0aGVuIGFkZCByYW5kb20gaG9yaXpvbnRhbCBzZWdtZW50cywgZGlzY2FyZGluZyByaXZlcnMgYWJvdmUvYmVsb3dcbiAgLy8gICAgIGFzIG5lY2Vzc2FyeSAoc2hvcnRlciBkaXJlY3Rpb24pXG4gIC8vICAzLiBmaWxsIGluIGFsbCBicmlkZ2VzIGF0IHRoZSBzdGFydCwgdGhlbiByYW5kb21seSByZW1vdmUgYnJpZGdlc1xuICAvLyAgICAgb3IgYWRkIG91dGNyb3BwaW5ncz9cbiAgLy8gIDQuIGEuIGRyYXcgYW4gaW5pdGlhbCBwYXRoIGZyb20gbGVmdCB0byByaWdodFxuICAvLyAgICAgYi4gYWRkIGFkZGl0aW9uYWwgcGF0aHMgZnJvbSB0aGVyZVxuICAvLyAgICAgYy4gMS80IG9yIHNvIGNoYW5jZSBvZiB0dXJuaW5nIGEgcGF0aCB0byBoZWxwIGVuY291cmFnZSBzdHJhaWdodFxuICAvLyAgICAgICAgc2VnbWVudHNcbiAgLy8gICAgIGQuIHNwdXJzIGNhbiBjb21lIG91dCBvZiB0b3AvYm90dG9tIG9mIGEgc3RyYWlnaHQgb3IgZGVhZCBlbmRcbiAgLy8gICAgIGUuIDEvNSBjaGFuY2Ugb2YgZW5kaW5nIGEgcGF0aD8gIG9yIGl0IHJ1bnMgaW50byBzb21ldGhpbmcuLi4/XG4gIC8vICAgICBmLiBwYXRocyBjYW4gY29tZSBhbnkgZGlyZWN0aW9uIG91dCBvZiBhIGRlYWQgZW5kXG4gIC8vICAgICBnLiBzdGFydCB3LyBhbGwgYnJpZGdlcywgcmVtb3ZlIHJhbmRvbWx5P1xuXG4gIGxhbmRQYXJ0aXRpb25zITogQXJyYXk8U2V0PFBvcz4+O1xuICByaXZlciE6IFNldDxQb3M+O1xuXG4gIGFkZEJyaWRnZSA9IG5ldyBNYXAoW1sweDBfMzAzMCwgMHgxXzMwMzBdLFxuICAgICAgICAgICAgICAgICAgICAgICBbMHgwXzAzMDMsIDB4MV8wMzAzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgWzB4MF8wMDAzLCAweDFfMDAwM10sXG4gICAgICAgICAgICAgICAgICAgICAgIFsweDBfMDMwMCwgMHgxXzAzMDBdXSk7XG5cbiAgcmVtb3ZlQnJpZGdlID0gbmV3IE1hcChbXG4gICAgWzB4MV8zMDMwLCBbMCwgOF1dLFxuICAgIC8vIEdpdmUgZXh0cmEgd2VpZ2h0IHRvIGFkZGluZyBhbiBvdXRjcm9wcGluZ1xuICAgIFsweDFfMDMwMywgWzAsIDIsIDIsIDIsIDQsIDQsIDQsIDhdXSxcbiAgICBbMHgxXzAwMDMsIFswXV0sXG4gICAgWzB4MV8wMzAwLCBbMF1dLFxuICBdKTtcblxuICBzdGFpclNjcmVlbnMgPSBuZXcgTWFwPERpciwgcmVhZG9ubHkgU2NyW10+KFtcbiAgICBbRGlyLkRPV04sIFsweDJfMTAwMCwgMHgyXzAwMTAsIDB4Ml8wMDAxXSBhcyBTY3JbXV0sXG4gICAgW0Rpci5VUCwgWzB4Ml8xMDEwLCAweDFfMTAwMCwgMHgxXzAwMTAsIDB4Ml8wMTAwXSBhcyBTY3JbXV0sXG4gIF0pO1xuXG4gIC8vIG5vdGNoOiAwXzAzMDMgLT4gMl8gb3IgNF9cbiAgcml2ZXJQYXRoQWx0ZXJuYXRpdmVzID0gbmV3IE1hcChbWzB4MDMwMyBhcyBTY3IsIFsxXV0sIFsweDMwMzAgYXMgU2NyLCBbMV1dXSk7XG4gIGluaXRpYWxSaXZlckFsbG93ZWQgPSBbMHgxXzAzMDMsIDB4MV8zMDMwLFxuICAgICAgICAgICAgICAgICAgICAgICAgIDB4MDAzMywgMHgwMzMwLCAweDMzMDAsIDB4MzAwM10gYXMgU2NyW107XG4gIHJpdmVyTG9vcEFsbG93ZWQgPSBbMHgxXzAzMDMsIDB4MV8zMDMwLCAweDFfMDMwMywgMHgxXzMwMzAsXG4gICAgICAgICAgICAgICAgICAgICAgMHg4XzAzMDMsIDB4OF8zMDMwLCAvLyBhbHNvIGFsbG93IFwiYnJva2VuXCIgcGF0aHM/XG4gICAgICAgICAgICAgICAgICAgICAgMHgwMDMzLCAweDAzMzAsIDB4MzMwMCwgMHgzMDAzLFxuICAgICAgICAgICAgICAgICAgICAgIDB4MzAzMywgMHgzMzMwLCAweDMzMzNdIGFzIFNjcltdO1xuXG4gIC8vIFRPRE8gLSBjYW4gdGhpcyBiZSB1c2VkIGZvciB3YXRlcmZhbGwgY2F2ZSAod2l0aCBhIHNsaWdodCB0d2VhayBzaW5jZSB0aGVyZVxuICAvLyBhcmUgbm8gYnJpZGdlcz8gLSBkZXRlY3QgdGhpcyBjYXNlIGFuZCBhbGxvdyBpdD8pXG4gIHRyeVNodWZmbGUobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIHRoaXMubGFuZFBhcnRpdGlvbnMgPSBbXTtcbiAgICB0aGlzLnJpdmVyID0gbmV3IFNldCgpO1xuXG4gICAgLy8gaWYgKCF0aGlzLnJldHJ5KG1hemUsICgpID0+IHRoaXMuaW5pdGlhbGl6ZUZpeGVkU2NyZWVucyhtYXplKSwgNSkpIHJldHVybiBmYWxzZTtcbiAgICAvLyBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBJbml0aWFsaXplIGZpeGVkOlxcbiR7bWF6ZS5zaG93KCl9YCk7XG5cbiAgICAvLyBJLiBzZW5kIGEgcml2ZXIgYWxsIHRoZSB3YXkgYWNyb3NzIHRoZSBtYXAuXG4gICAgaWYgKCF0aGlzLnJldHJ5KG1hemUsICgpID0+IHRoaXMubWFrZUluaXRpYWxSaXZlcihtYXplKSwgNSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBJbml0aWFsIHJpdmVyOlxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gICAgLy8gSUkuIG1ha2UgaXQgYSBiaXQgbW9yZSBpbnRlcmVzdGluZyB3aXRoIHNvbWUgYnJhbmNoZXMgYW5kIGxvb3BzLlxuICAgIGlmICghdGhpcy5yZXRyeShtYXplLCAoKSA9PiB0aGlzLmJyYW5jaFJpdmVyKG1hemUpLCA1KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYEJyYW5jaGVkIHJpdmVyOlxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gICAgLy8gSUlJLiBhZGQgY29ubmVjdGlvbnMgdG8gbGFuZCBhbmQgZmlsbCB0aGUgcmVtYWluZGVyIG9mIHRoZSBtYXAgd2l0aCBsYW5kLlxuICAgIC8vIE1ha2Ugc3VyZSBldmVyeXRoaW5nIGlzIHN0aWxsIGFjY2Vzc2libGUuICBDb25zaWRlciBkZWxldGluZyBhbnkgdHdvLXRpbGVcbiAgICAvLyBzZWdtZW50cyB0aGF0IGFyZSBvdGhlcndpc2UgaW5hY2Nlc3NpYmxlLlxuICAgIGlmICghdGhpcy5yZXRyeShtYXplLCAoKSA9PiB0aGlzLmNvbm5lY3RMYW5kKG1hemUpLCAzKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYENvbm5lY3RlZCBsYW5kOlxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gICAgLy8gSVYuIGRvIHNvbWUgY2hlY2tzIHRvIG1ha2Ugc3VyZSB0aGUgZW50aXJlIG1hcCBpcyBhY2Nlc3NpYmxlLlxuICAgIC8vIFRoZW4gcmVtb3ZlIGJyaWRnZXMgYW5kIGFkZCBibG9ja2FnZXMgdG8gcmVkdWNlIHRvIGEgbWluaW11bSBhY2Nlc3NpYmlsaXR5LlxuICAgIC8vIEVuc3VyZSB3ZSBoYXZlIGZld2VyIHRoYW4gdGhlIHRvdGFsIGF2YWlsYWJsZSBudW1iZXIgb2YgYnJpZGdlcyBsZWZ0LlxuICAgIGlmICghdGhpcy5yZXRyeShtYXplLCAoKSA9PiB0aGlzLnJlbW92ZUJyaWRnZXMobWF6ZSksIDUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgUmVtb3ZlZCBicmlkZ2VzOlxcbiR7bWF6ZS5zaG93KHRydWUpfWApO1xuICAgIC8vIFYuIERpc3RyaWJ1dGUgc3RhaXJzIGFjcm9zcyBtdWx0aXBsZSBwYXJ0aXRpb25zLlxuICAgIGlmICghdGhpcy5yZXRyeShtYXplLCAoKSA9PiB0aGlzLmFkZFN0YWlycyhtYXplKSwgMykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBBZGRlZCBzdGFpcnM6XFxuJHttYXplLnNob3coKX1gKTtcbiAgICAvLyBWSS4gcGVyZm9ybSB0aGUgbm9ybWFsIHBlcmNvbGF0aW9uIG9uIGp1c3QgdGhlIGxhbmQgdGlsZXMuXG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5yaXZlcikgdGhpcy5maXhlZC5hZGQocG9zKTtcbiAgICBpZiAoIXRoaXMucmVmaW5lTWF6ZShtYXplKSkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMucml2ZXIpIHRoaXMuZml4ZWQuZGVsZXRlKHBvcyk7XG4gICAgdGhpcy5icmlkZ2VzID0gMDtcbiAgICBpZiAoIXRoaXMuYWRkRmVhdHVyZXMobWF6ZSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBGZWF0dXJlc1xcbiR7bWF6ZS5zaG93KCl9XFxuJHttYXplLnNob3codHJ1ZSl9YCk7XG4gICAgbWF6ZS5maWxsQWxsKHtlZGdlOiAwfSk7XG4gICAgcmV0dXJuIHRoaXMuZmluaXNoKG1hemUpO1xuICB9XG5cbiAgbWFrZUluaXRpYWxSaXZlcihtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVmdFkgPSB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMuaCAtIDIpICsgMTtcbiAgICBjb25zdCBsZWZ0U2NyID0gKGxlZnRZIDwgdGhpcy5oIC8gMiA/IDB4MV8wMzAwIDogMHgxXzAwMDMpIGFzIFNjcjtcbiAgICBjb25zdCByaWdodFkgPSB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMuaCAtIDIpICsgMTtcbiAgICBjb25zdCByaWdodFNjciA9IChyaWdodFkgPCB0aGlzLmggLyAyID8gMHgxXzAzMDAgOiAweDFfMDAwMykgYXMgU2NyO1xuICAgIGNvbnN0IGxlZnQgPSAobGVmdFkgPDwgNCkgYXMgUG9zO1xuICAgIGNvbnN0IHJpZ2h0ID0gKHJpZ2h0WSA8PCA0IHwgKHRoaXMudyAtIDEpKSBhcyBQb3M7XG4gICAgbWF6ZS5zZXQobGVmdCwgbGVmdFNjcik7XG4gICAgbWF6ZS5zZXQocmlnaHQsIHJpZ2h0U2NyKTtcbiAgICBpZiAoIW1hemUuY29ubmVjdChsZWZ0LCBudWxsLCByaWdodCwgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICB7YWxsb3dlZDogdGhpcy5pbml0aWFsUml2ZXJBbGxvd2VkLFxuICAgICAgICAgICAgICAgICAgICAgICBwYXRoQWx0ZXJuYXRpdmVzOiB0aGlzLnJpdmVyUGF0aEFsdGVybmF0aXZlc30pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYnJhbmNoUml2ZXIobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIC8vIFRPRE8gLSB1c2Ugc3VydmV5IGFuZCBkZW5zaXR5IHRvIGdldCBhIHNlbnNlIG9mIHdoZW4gdG8gc3RvcD9cbiAgICAvLyBIb3cgdG8ga25vdyBob3cgbWFueSBsb29wcyB0byBhZGQ/XG4gICAgY29uc3QgdGFyZ2V0RGVuc2l0eSA9IHRoaXMuc3VydmV5LnJpdmVycyAvIHRoaXMudyAvIHRoaXMuaDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwICYmIG1hemUuZGVuc2l0eSgpIDwgdGFyZ2V0RGVuc2l0eTsgaSsrKSB7XG4gICAgICAvLyBUT0RPIC0gYWRkIHNwdXJzIGluIGFkZGl0aW9uIHRvIGxvb3BzLi4uXG4gICAgICBpZiAobWF6ZS5hZGRMb29wKHthbGxvd2VkOiB0aGlzLnJpdmVyTG9vcEFsbG93ZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoQWx0ZXJuYXRpdmVzOiB0aGlzLnJpdmVyUGF0aEFsdGVybmF0aXZlc30pKSB7XG4gICAgICAgIGkgPSAwO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcykge1xuICAgICAgaWYgKG1hemUuZ2V0KHBvcykpIHRoaXMucml2ZXIuYWRkKHBvcyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgY29ubmVjdExhbmQobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIC8vIEFkZCBhIGJ1bmNoIG9mIGxhbmQgdGlsZXMsIHRoZW4gdHJ5IHRvIGFkZCBjb25uZWN0aW9ucyB0byBlYWNoLCBvciBlbHNlXG4gICAgLy8gcmVtb3ZlIHRoZSBjb25uZWN0ZWQgc2VnbWVudHMuXG4gICAgaWYgKCF0aGlzLmluaXRpYWxGaWxsTWF6ZShtYXplKSkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEF0IHRoaXMgcG9pbnQgZXZlcnl0aGluZyBpcyBkaXNjb25uZWN0ZWQuICBGb3IgZWFjaCBwYXJ0aXRpb24sIGxvb2sgZm9yXG4gICAgLy8gYSBzdWl0YWJsZSBjb25uZWN0aW9uIHBvaW50LlxuICAgIGNvbnN0IHRyYXZlcnNhbCA9IG1hemUudHJhdmVyc2UoKTtcbiAgICBjb25zdCBwYXJ0aXRpb25zID0gWy4uLm5ldyBTZXQodHJhdmVyc2FsLnZhbHVlcygpKV07XG4gICAgTkVYVF9QQVJUSVRJT046XG4gICAgZm9yIChjb25zdCBwYXJ0aXRpb24gb2YgcGFydGl0aW9ucykge1xuICAgICAgY29uc3QgcG9zaXRpb25zID0gbmV3IFNldDxQb3M+KCk7XG4gICAgICBmb3IgKGNvbnN0IHNwb3Qgb2YgcGFydGl0aW9uKSB7XG4gICAgICAgIGNvbnN0IHBvcyA9IChzcG90ID4+IDgpIGFzIFBvcztcbiAgICAgICAgLy8gU2tpcCB0aGUgd2F0ZXIgcGFydGl0aW9uLlxuICAgICAgICBpZiAodGhpcy5yaXZlci5oYXMocG9zKSkgY29udGludWUgTkVYVF9QQVJUSVRJT047XG4gICAgICAgIC8vIE90aGVyd2lzZSBhZGQgc3R1ZmYuXG4gICAgICAgIHBvc2l0aW9ucy5hZGQocG9zKTtcbiAgICAgICAgaWYgKCEoc3BvdCAmIDB4MGYpKSB7IC8vIGUuZy4gMjMxMCAtIG9uIHRoZSBsZWZ0IGVkZ2UgLT4gc28gKDIsMykgYW5kICgyLDIpXG4gICAgICAgICAgcG9zaXRpb25zLmFkZCgocG9zIC0gMSkgYXMgUG9zKTtcbiAgICAgICAgfSBlbHNlIGlmICghKHNwb3QgJiAweGYwKSkge1xuICAgICAgICAgIHBvc2l0aW9ucy5hZGQoKHBvcyAtIDE2KSBhcyBQb3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmxhbmRQYXJ0aXRpb25zLnB1c2gocG9zaXRpb25zKTtcbiAgICAgIC8vIFdlIG5vdyBoYXZlIHRoZSBzZXQgb2YgYWxsIHBvcyBpbiB0aGlzIHBhcnRpdGlvbi4gIEZpbmQgYSBuZWlnaGJvciB0aGF0J3NcbiAgICAgIC8vIHdhdGVyIGFuZCB0cnkgdG8gY29ubmVjdC5cbiAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWy4uLnBvc2l0aW9uc10pKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgICAgICBjb25zdCBwb3MxID0gUG9zLnBsdXMocG9zLCBkaXIpO1xuICAgICAgICAgIGNvbnN0IHJpdmVyID0gbWF6ZS5nZXQocG9zMSkhICYgMHhmZmZmO1xuICAgICAgICAgIGlmIChyaXZlciAhPT0gKGRpciAmIDEgPyAweDAzMDMgOiAweDMwMzApKSBjb250aW51ZTtcbiAgICAgICAgICAvL2NvbnN0IHJpdmVyQWRqID0gMSA8PCAoKGRpciBeIDIpIDw8IDIpO1xuICAgICAgICAgIGNvbnN0IGxhbmRBZGogPSAxIDw8IChkaXIgPDwgMik7XG4gICAgICAgICAgLy9tYXplLnNldEFuZFVwZGF0ZShwb3MxLCAocml2ZXIgfCByaXZlckFkaikgYXMgU2NyLCB7Zm9yY2U6IHRydWV9KTtcbiAgICAgICAgICBtYXplLnNldEFuZFVwZGF0ZShwb3MsIChtYXplLmdldChwb3MpISB8IGxhbmRBZGopIGFzIFNjciwge3JlcGxhY2U6IHRydWV9KTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgaWYgKHRoaXMucmFuZG9tLm5leHRJbnQoMikpIGJyZWFrOyAvLyBtYXliZSBhZGQgYW5vdGhlciBjb25uZWN0aW9uP1xuICAgICAgICAgIGNvbnRpbnVlIE5FWFRfUEFSVElUSU9OO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBGYWlsZWQgdG8gY29ubmVjdC4gIElmIGl0J3MgdGlueSAoMiBvciBsZXNzKSB0aGVuIGRlbGV0ZSwgZWxzZSBmYWlsLlxuICAgICAgaWYgKGZvdW5kKSBjb250aW51ZSBORVhUX1BBUlRJVElPTjtcbiAgICAgIGlmIChwb3NpdGlvbnMuc2l6ZSA+IDIpIHJldHVybiBmYWxzZTtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIHBvc2l0aW9ucykge1xuICAgICAgICBtYXplLmRlbGV0ZShwb3MpO1xuICAgICAgICB0aGlzLmxhbmRQYXJ0aXRpb25zLnBvcCgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jaGVjayhtYXplKTtcbiAgfVxuXG4gIHJlbW92ZUJyaWRnZXMobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIC8vIEJhc2ljIHBsYW46IHRha2Ugb3V0IGFzIG1hbnkgYnJpZGdlcyBhcyB3ZSBjYW4gdW50aWwgdGhlIG1hcCBpcyBubyBsb25nZXJcbiAgICAvLyB0cmF2ZXJzaWJsZS5cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbLi4udGhpcy5yaXZlcl0pKSB7XG4gICAgICBjb25zdCBzY3IgPSBtYXplLmdldChwb3MpO1xuICAgICAgaWYgKHNjciA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYGV4cGVjdGVkIGEgc2NyZWVuIGF0ICR7aGV4KHBvcyl9YCk7XG4gICAgICBmb3IgKGNvbnN0IG9wdCBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLnJlbW92ZUJyaWRnZS5nZXQoc2NyKSB8fCBbXSkpIHtcbiAgICAgICAgY29uc3Qgc3VjY2VzcyA9IG1hemUuc2F2ZUV4Y3Vyc2lvbigoKSA9PiB7XG4gICAgICAgICAgbWF6ZS5yZXBsYWNlKHBvcywgKHNjciAmIDB4ZmZmZiB8IG9wdCA8PCAxNikgYXMgU2NyKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jaGVjayhtYXplKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzdWNjZXNzKSBicmVhazsgLy8gZG9uJ3QgdHJ5IGFueSBvdGhlciBvcHRpb25zXG4gICAgICB9XG4gICAgfVxuICAgIC8vIENvdW50IGJyaWRnZXMsIG1ha2Ugc3VyZSB3ZSBkb24ndCBzdGlsbCBoYXZlIHRvbyBtYW55IVxuICAgIGNvbnN0IGJyaWRnZXMgPSBpdGVycy5jb3VudChpdGVycy5maWx0ZXIodGhpcy5yaXZlciwgcG9zID0+IHtcbiAgICAgIGNvbnN0IHdhbGwgPSBtYXplLmdldFNwZWMocG9zKSEud2FsbDtcbiAgICAgIHJldHVybiB3YWxsID8gd2FsbC50eXBlID09PSAnYnJpZGdlJyA6IGZhbHNlO1xuICAgIH0pKTtcbiAgICByZXR1cm4gYnJpZGdlcyA8PSB0aGlzLnN1cnZleS5icmlkZ2VzO1xuICB9XG5cbiAgYWRkU3RhaXJzKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICAvLyBGaXJzdCBtYWtlIHN1cmUgdGhlcmUncyBubyBlZGdlcy5cbiAgICBpZiAodGhpcy5zdXJ2ZXkuZWRnZXMuc2l6ZSkgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGVkZ2U6ICR7dGhpcy5zdXJ2ZXkuZWRnZXN9YCk7XG4gICAgLy8gQWRkIGFueSBmaXhlZCBzY3JlZW5zLlxuICAgIE9VVEVSOlxuICAgIGZvciAoY29uc3Qgc3BlYyBvZiB0aGlzLnN1cnZleS5maXhlZC52YWx1ZXMoKSkge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5hbGxQb3MpKSB7XG4gICAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhwb3MpIHx8IHRoaXMucml2ZXIuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBvayA9IG1hemUuc2F2ZUV4Y3Vyc2lvbigoKSA9PiB7XG4gICAgICAgICAgY29uc3Qgb3B0cyA9IHtyZXBsYWNlOiB0cnVlLCBza2lwQWx0ZXJuYXRlczogdHJ1ZX07XG4gICAgICAgICAgcmV0dXJuIG1hemUuc2V0QW5kVXBkYXRlKHBvcywgc3BlYy5lZGdlcywgb3B0cykgJiYgdGhpcy5jaGVjayhtYXplKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghb2spIGNvbnRpbnVlO1xuICAgICAgICB0aGlzLmZpeGVkLmFkZChwb3MpO1xuICAgICAgICBjb250aW51ZSBPVVRFUjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWlsKGBDb3VsZCBub3QgcGxhY2UgZml4ZWQgc2NyZWVuICR7aGV4KHNwZWMuZWRnZXMpfWApO1xuICAgIH1cbiAgICAvLyBUT0RPIC0gQWxzbyBhZGQgYW55IG90aGVyIGZpeGVkIHNjcmVlbnMuLi4/XG4gICAgLy8gTk9URSAtIHdpbGwgbmVlZCB0byBjbGVhciBvdXQgc29tZSBzcGFjZSBmb3IgJDkxIC0gMHgwXzcxNzZcbiAgICAvLyAgICAgIC0gbWlnaHQgYmUgdHJpY2t5Li4uPyAgbWF5YmUgc2hvdWxkIGRvIHRoYXQgZmlyc3Q/XG5cbiAgICBjb25zdCBwb3NUb1BhcnRpdGlvbiA9IG5ldyBNYXA8UG9zLCBTZXQ8UG9zPj4oKTtcbiAgICBmb3IgKGNvbnN0IHBhcnRpdGlvbiBvZiB0aGlzLmxhbmRQYXJ0aXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiBwYXJ0aXRpb24pIHtcbiAgICAgICAgcG9zVG9QYXJ0aXRpb24uc2V0KHBvcywgcGFydGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgdHJ5IHRvIHBpY2sgc3BvdHMgZm9yIHN0YWlycy5cbiAgICBjb25zdCBzdGFpcnMgPSBbLi4udGhpcy5zdXJ2ZXkuc3RhaXJzXTtcbiAgICBjb25zdCBzZWVuID0gbmV3IFNldDxTZXQ8UG9zPj4oKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbLi4ucG9zVG9QYXJ0aXRpb24ua2V5cygpXSkpIHtcbiAgICAgIGlmICghc3RhaXJzLmxlbmd0aCkgYnJlYWs7XG4gICAgICBjb25zdCBwYXJ0aXRpb24gPSBwb3NUb1BhcnRpdGlvbi5nZXQocG9zKSE7XG4gICAgICBpZiAoc2Vlbi5oYXMocGFydGl0aW9uKSkgY29udGludWU7XG4gICAgICBpZiAodGhpcy5maXhlZC5oYXMocG9zKSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHN0YWlyU2NyIG9mIHRoaXMuc3RhaXJTY3JlZW5zLmdldChzdGFpcnNbMF1bMV0uZGlyKSEpIHtcbiAgICAgICAgY29uc3Qgb2sgPSBtYXplLnNhdmVFeGN1cnNpb24oKCkgPT4ge1xuICAgICAgICAgIC8vIFRPRE8gLSB3aGF0IGFyZSBhbGwgdGhlIGVsaWdpYmxlIHN0YWlycyBmb3IgdGhlIGdpdmVuIHNwZWM/IT9cbiAgICAgICAgICBjb25zdCBvcHRzID0ge3JlcGxhY2U6IHRydWUsIHNraXBBbHRlcm5hdGVzOiB0cnVlfTtcbiAgICAgICAgICByZXR1cm4gbWF6ZS5zZXRBbmRVcGRhdGUocG9zLCBzdGFpclNjciwgb3B0cykgJiYgdGhpcy5jaGVjayhtYXplKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghb2spIGNvbnRpbnVlO1xuICAgICAgICBzdGFpcnMuc2hpZnQoKSE7XG4gICAgICAgIHRoaXMuZml4ZWQuYWRkKHBvcyk7XG4gICAgICAgIHNlZW4uYWRkKHBhcnRpdGlvbik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5FWFRfUEFSVElUSU9OOlxuICAgIC8vIGZvciAoY29uc3QgcGFydGl0aW9uIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMubGFuZFBhcnRpdGlvbnMpKSB7XG4gICAgLy8gICBpZiAoIXN0YWlycy5sZW5ndGgpIGJyZWFrO1xuICAgIC8vICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWy4uLnBhcnRpdGlvbl0pKSB7XG4gICAgLy8gICAgIGlmICh0aGlzLmZpeGVkLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAvLyAgICAgZm9yIChjb25zdCBzdGFpclNjciBvZiB0aGlzLnN0YWlyU2NyZWVucy5nZXQoc3RhaXJzWzBdWzFdLmRpcikhKSB7XG4gICAgLy8gICAgICAgY29uc3Qgb2sgPSBtYXplLnNhdmVFeGN1cnNpb24oKCkgPT4ge1xuICAgIC8vICAgICAgICAgLy8gVE9ETyAtIHdoYXQgYXJlIGFsbCB0aGUgZWxpZ2libGUgc3RhaXJzIGZvciB0aGUgZ2l2ZW4gc3BlYz8hP1xuICAgIC8vICAgICAgICAgY29uc3Qgb3B0cyA9IHtyZXBsYWNlOiB0cnVlLCBza2lwQWx0ZXJuYXRlczogdHJ1ZX07XG4gICAgLy8gICAgICAgICByZXR1cm4gbWF6ZS5zZXRBbmRVcGRhdGUocG9zLCBzdGFpclNjciwgb3B0cykgJiYgdGhpcy5jaGVjayhtYXplKTtcbiAgICAvLyAgICAgICB9KTtcbiAgICAvLyAgICAgICBpZiAoIW9rKSBjb250aW51ZTtcbiAgICAvLyAgICAgICBzdGFpcnMuc2hpZnQoKSE7XG4gICAgLy8gICAgICAgdGhpcy5maXhlZC5hZGQocG9zKTtcbiAgICAvLyAgICAgICBjb250aW51ZSBORVhUX1BBUlRJVElPTjtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIGlmIChzdGFpcnMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuY2xhc3MgRXZpbFNwaXJpdFJpdmVyQ2F2ZVNodWZmbGVfb2xkIGV4dGVuZHMgQmFzaWNDYXZlU2h1ZmZsZSB7XG5cbiAgLy8gU2V0dGluZyB1cCBhIHZpYWJsZSByaXZpZXIgaXMgcmVhbGx5IGhhcmQuXG4gIC8vIFBvc3NpYmxlIGlkZWFzOlxuICAvLyAgMS4gc3RhcnQgd2l0aCBmdWxsIHJpdmVyIGNvdmVyYWdlLCBhbm5lYWwgYXdheSB0aWxlcyB1bnRpbCB3ZSBnZXQgdGhlXG4gIC8vICAgICBjb3JyZWN0IHJpdmVyIGRlbnNpdHksIHRoZW4gZG8gbGFuZCB0aWxlcyB0aGUgc2FtZSB3YXlcbiAgLy8gICAgIC0gaXNzdWU6IHdlIGRvbid0IGdldCBlbm91Z2ggc3RyYWlnaHQgdGlsZXMgdGhhdCB3YXlcbiAgLy8gIDIuIHVzZSBsaW5lcz8gIHN0YXJ0IHcvIGZ1bGwgdmVydGljYWwgbGluZSByaXZlcnMsIGRpc2Nvbm5lY3RlZFxuICAvLyAgICAgdGhlbiBhZGQgcmFuZG9tIGhvcml6b250YWwgc2VnbWVudHMsIGRpc2NhcmRpbmcgcml2ZXJzIGFib3ZlL2JlbG93XG4gIC8vICAgICBhcyBuZWNlc3NhcnkgKHNob3J0ZXIgZGlyZWN0aW9uKVxuICAvLyAgMy4gZmlsbCBpbiBhbGwgYnJpZGdlcyBhdCB0aGUgc3RhcnQsIHRoZW4gcmFuZG9tbHkgcmVtb3ZlIGJyaWRnZXNcbiAgLy8gICAgIG9yIGFkZCBvdXRjcm9wcGluZ3M/XG4gIC8vICA0LiBhLiBkcmF3IGFuIGluaXRpYWwgcGF0aCBmcm9tIGxlZnQgdG8gcmlnaHRcbiAgLy8gICAgIGIuIGFkZCBhZGRpdGlvbmFsIHBhdGhzIGZyb20gdGhlcmVcbiAgLy8gICAgIGMuIDEvNCBvciBzbyBjaGFuY2Ugb2YgdHVybmluZyBhIHBhdGggdG8gaGVscCBlbmNvdXJhZ2Ugc3RyYWlnaHRcbiAgLy8gICAgICAgIHNlZ21lbnRzXG4gIC8vICAgICBkLiBzcHVycyBjYW4gY29tZSBvdXQgb2YgdG9wL2JvdHRvbSBvZiBhIHN0cmFpZ2h0IG9yIGRlYWQgZW5kXG4gIC8vICAgICBlLiAxLzUgY2hhbmNlIG9mIGVuZGluZyBhIHBhdGg/ICBvciBpdCBydW5zIGludG8gc29tZXRoaW5nLi4uP1xuICAvLyAgICAgZi4gcGF0aHMgY2FuIGNvbWUgYW55IGRpcmVjdGlvbiBvdXQgb2YgYSBkZWFkIGVuZFxuICAvLyAgICAgZy4gc3RhcnQgdy8gYWxsIGJyaWRnZXMsIHJlbW92ZSByYW5kb21seT9cblxuXG4gIHBoYXNlITogJ3JpdmVyJyB8ICdjYXZlJztcbiAgZml4ZWRSaXZlciE6IFNldDxQb3M+O1xuXG4gIGdvb2RTY3JzID0gbmV3IFNldChbMHgwMDAzLCAweDAwMzAsIDB4MDMwMCwgMHgzMDAwLFxuICAgICAgICAgICAgICAgICAgICAgIDB4MDAzMywgMHgwMzAzLCAweDMwMDMsIDB4MDMzMCwgMHgzMDMwLCAweDMzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgMHgzMDMzLCAweDMzMzAsIDB4MzMzM10pIGFzIFNldDxTY3I+O1xuICBiYWRTY3JzID0gbmV3IFNldChbMHgzMzAzLCAweDAzMDNdKSBhcyBTZXQ8U2NyPjtcblxuICBpbml0aWFsaXplRml4ZWRTY3JlZW5zKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICAvLyBCYXNpYyBwbGFuOiBkbyB0d28gZnVsbCByb3VuZHMgb2Ygc2h1ZmZsZS5cbiAgICAvLyBGaXJzdCByb3VuZCBpcyBsb3ctZGVuc2l0eSBqdXN0IGZvciByaXZlciB0aWxlcy5cbiAgICB0aGlzLmRlbnNpdHkgPSB0aGlzLnN1cnZleS5yaXZlcnMgLyB0aGlzLncgLyB0aGlzLmg7XG4gICAgdGhpcy5waGFzZSA9ICdyaXZlcic7XG4gICAgdGhpcy5maXhlZFJpdmVyID0gbmV3IFNldCgpO1xuXG4gICAgLy8gVGhpcyBpcyBjb3BpZWQgZnJvbSBpbml0aWFsRmlsbE1hemVcblxuICAgIGlmICghdGhpcy5pbml0aWFsaXplUml2ZXIobWF6ZSkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGlmICghc3VwZXIuaW5pdGlhbEZpbGxNYXplKG1hemUsIHtcbiAgICAvLyAgIGVkZ2U6IDMsXG4gICAgLy8gICBwcmludDogdHJ1ZSxcbiAgICAvLyAgIGZ1enp5OiBvcHRzID0+IHtcbiAgICAvLyAgICAgcmV0dXJuIHtcbiAgICAvLyAgICAgICAuLi5vcHRzLFxuICAgIC8vICAgICAgIGVkZ2U6IDEsXG4gICAgLy8gICAgICAgZnV6enk6IDEsXG4gICAgLy8gICAgIH07XG4gICAgLy8gICB9LFxuICAgIC8vIH0pKSByZXR1cm4gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMucmVmaW5lTWF6ZShtYXplKSkgcmV0dXJuIGZhbHNlO1xuICAgIC8vY29uc29sZS5sb2coYFJFRklORU1FTlQ6XFxuJHttYXplLnNob3coKX1gKTtcblxuICAgIC8vIEZpbmQgYW55IHJlbWFpbmluZyBcImZha2VcIiB0aWxlcyBhbmQgYWRkIGRlYWQtZW5kcyBhdCBsZWFzdFxuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKSB7XG4gICAgICBjb25zdCBzY3IgPSBtYXplLmdldChwb3MpO1xuICAgICAgaWYgKCFzY3IpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZGlyID0gc2NyID09PSAweDMzMDMgPyBEaXIuTEVGVCA6IHNjciA9PT0gMHgwMzMzID8gRGlyLlJJR0hUIDogbnVsbDtcbiAgICAgIGlmIChkaXIgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBwb3MxID0gUG9zLnBsdXMocG9zLCBkaXIpO1xuICAgICAgICBjb25zdCBzY3IxID0gbWF6ZS5nZXQocG9zMSk7XG4gICAgICAgIGlmIChzY3IxKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIG1hemUucmVwbGFjZShwb3MxLCAoc2NyIF4gMHgzMzMzKSBhcyBTY3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlbGV0ZSBhbGwgdGhlIGJsYW5rc1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKSB7XG4gICAgICBpZiAoIW1hemUuZ2V0KHBvcykpIHtcbiAgICAgICAgbWF6ZS5kZWxldGUocG9zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZml4ZWQuYWRkKHBvcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbGwgdGhlIHBvc3NpYmxlIGNvbm5lY3Rpb25zIGJldHdlZW4gcml2ZXIgYW5kIGxhbmQuXG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1hemUuZ2V0KHBvcyk7XG4gICAgICBpZiAoIXNjcikgY29udGludWU7XG4gICAgICAvLyBDYW4gb25seSBhdWdtZW50IHN0cmFpZ2h0IHBhdGhzXG4gICAgICBpZiAoc2NyICE9PSAoKHNjciA8PCA4IHwgc2NyID4+IDgpICYgMHhmZmZmKSkgY29udGludWU7XG4gICAgICAvLyBQaWNrIG9uZSBvZiB0aGUgdHdvIGRpcmVjdGlvbnMgdG8gYWRkIGEgbGFuZCBwYXRoXG4gICAgICBjb25zdCBhdWcgPSAoc2NyIDw8IDQgfCBzY3IgPj4gNCkgJiB0aGlzLnJhbmRvbS5waWNrKFsweDExMDAsIDB4MDAxMV0pO1xuICAgICAgY29uc3Qgc2NyMSA9IChzY3IgfCBhdWcpIGFzIFNjcjtcbiAgICAgIG1hemUuc2F2ZUV4Y3Vyc2lvbigoKSA9PiBtYXplLnNldEFuZFVwZGF0ZShwb3MsIHNjcjEpKTtcbiAgICB9ICAgIFxuXG4gICAgLy9jb25zb2xlLmxvZyhgQ09OTkVDVEVEOlxcbiR7bWF6ZS5zaG93KCl9YCk7XG5cbiAgICBcbiAgICBpZiAoIXN1cGVyLmluaXRpYWxpemVGaXhlZFNjcmVlbnMobWF6ZSkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIEZpZ3VyZSBvdXQgaG93IG1hbnkgYnJpZGdlcyB3ZSBoYXZlIHNvIGZhciAob25seSBmcm9tIDQtd2F5IHRpbGVzKSxcbiAgICAvLyBpZiBpdCdzIHRvbyBtYW55IHRoZW4gYmFpbCBvdXQ7IGlmIGl0J3Mgbm90IGVub3VnaCB0aGVuIGFkZCBhIGZldy5cblxuICAgIC8vIEJsb2NrIG9mZiBzb21lIG9mIHRoZSBlZGdlcyB0byBlbnN1cmUgYSBzaW5nbGUgcGF0aC4uLj9cblxuICAgIC8vIFRoZW4gZXh0ZW5kIHRoZSB0aWxlcyB3aGVuZXZlciBwb3NzaWJsZS5cblxuICAgIC8vIFRoZW4gZG8gdGhlIG5vcm1hbCB0aGluZyBmcm9tIHRoZXJlLlxuICAgIHRoaXMuZGVuc2l0eSA9IHRoaXMuc3VydmV5LnNpemUgLyB0aGlzLncgLyB0aGlzLmg7XG4gICAgdGhpcy5waGFzZSA9ICdjYXZlJztcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHBvc3RSZWZpbmUobWF6ZTogTWF6ZSwgcG9zOiBQb3MpIHtcbiAgICAvL2xldCBiYWQgPSAwO1xuICAgIC8vbGV0IGZpeGVkID0gMDtcbiAgICAvL2NvbnNvbGUubG9nKGBwb3N0UmVmaW5lICR7cG9zLnRvU3RyaW5nKDE2KX1cXG4ke21hemUuc2hvdygpfWApO1xuICAgIGlmICh0aGlzLnBoYXNlICE9PSAncml2ZXInKSByZXR1cm47XG4gICAgLy8gSWYgYW55IG5laWdoYm9ycyB3ZXJlIG1hZGUgaW50byBmYWtlIHRpbGVzLCB0aGVuIHRyeSB0byBkZWxldGUgYW5cbiAgICAvLyBlZGdlIHRvIGJyaW5nIHRoZW0gYmFjayB0byBub24tZmFrZS5cbiAgICBmb3IgKGNvbnN0IGRpciBvZiBEaXIuQUxMKSB7XG4gICAgICBjb25zdCBzY3IgPSBtYXplLmdldChwb3MsIGRpcik7XG4gICAgICBpZiAoc2NyICE9IG51bGwgJiYgdGhpcy5iYWRTY3JzLmhhcyhzY3IpKSB7XG4gICAgICAgIC8vYmFkKys7XG4gICAgICAgIC8qaWYgKCovbWF6ZS5zYXZlRXhjdXJzaW9uKFxuICAgICAgICAgICAgKCkgPT4gbWF6ZS50cnlDb25zb2xpZGF0ZShcbiAgICAgICAgICAgICAgICBQb3MucGx1cyhwb3MsIGRpciksXG4gICAgICAgICAgICAgICAgdGhpcy5nb29kU2NycyxcbiAgICAgICAgICAgICAgICB0aGlzLmJhZFNjcnMsXG4gICAgICAgICAgICAgICAgKCkgPT4gdGhpcy5jaGVjayhtYXplKSkpOy8vKSBmaXhlZCsrO1xuICAgICAgfVxuICAgIH1cbiAgICAvL2lmIChmaXhlZCkgY29uc29sZS5sb2coYHBvc3RSZWZpbmUgYmFkICR7YmFkfSBmaXhlZCAke2ZpeGVkfVxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gIH1cblxuICBpbml0aWFsaXplUml2ZXIobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIC8vIE5PVEU6IFRoaXMgaXMgYSBkaWZmaWN1bHQgZmlsbCBiZWNhdXNlIHRoZXJlJ3Mgbm9cbiAgICAvLyB8fD0gb3IgPXx8IHRpbGVzLCBzbyB0aGUgbGVmdC9yaWdodCBlZGdlcyBnZXQgYSBsaXR0bGVcbiAgICAvLyB0cm91YmxlZC4gIEJ1dCB0aGVyZSBBUkUgZGVhZC1lbmRzLCBzbyB3ZSBjYW4gZmlsbCB0aGVcbiAgICAvLyBjb2x1bW4gd2l0aCBlaXRoZXIgcGFpcnMgb2YgdGlnaHQgY3ljbGVzIG9yIGVsc2VcbiAgICAvLyBkZWFkIGVuZHMsIGFzIHdlIHNlZSBmaXQuICBEbyB0aGlzIG1hbnVhbGx5LlxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53OyB4KyspIHtcbiAgICAgICAgbGV0IHRpbGUgPSAweDMzMzM7XG4gICAgICAgIGNvbnN0IHBvcyA9ICh5IDw8IDQgfCB4KSBhcyBQb3M7XG4gICAgICAgIGlmICh5ID09PSAwKSB0aWxlICY9IDB4ZmZmMDtcbiAgICAgICAgaWYgKHkgPT09IHRoaXMuaCAtIDEpIHRpbGUgJj0gMHhmMGZmO1xuXG4gICAgICAgIGlmICh4ID09PSAwKSB0aWxlICY9IDB4MGZmZjtcbiAgICAgICAgaWYgKHggPT09IHRoaXMudyAtIDEpIHRpbGUgJj0gMHhmZjBmO1xuXG4gICAgICAgIC8vIGNvbnN0IGxvb3AgPSB5ID4gMCAmJiAobWF6ZS5nZXQoKHBvcyAtIDE2KSBhcyBQb3MpISAmIDB4MGYwMCkgIT0gMDtcbiAgICAgICAgLy8gaWYgKHggPT09IDApIHtcbiAgICAgICAgLy8gICBpZiAobG9vcCkge1xuICAgICAgICAvLyAgICAgdGlsZSA9IDB4MDAzMztcbiAgICAgICAgLy8gICB9IGVsc2Uge1xuICAgICAgICAvLyAgICAgdGlsZSA9IHkgPCB0aGlzLmggLSAxICYmIHRoaXMucmFuZG9tLm5leHRJbnQoMikgPyAweDAzMzAgOiAweDAwMzA7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9IGVsc2UgaWYgKHggPT09IHRoaXMudyAtIDEpIHtcbiAgICAgICAgLy8gICBpZiAobG9vcCkge1xuICAgICAgICAvLyAgICAgdGlsZSA9IDB4MzAwMztcbiAgICAgICAgLy8gICB9IGVsc2Uge1xuICAgICAgICAvLyAgICAgdGlsZSA9IHkgPCB0aGlzLmggLSAxICYmIHRoaXMucmFuZG9tLm5leHRJbnQoMikgPyAweDMzMDAgOiAweDMwMDA7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9XG5cbiAgICAgICAgbWF6ZS5zZXQocG9zLCB0aWxlIGFzIFNjcik7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFBpY2sgYSBmZXcgdGlsZXMgb24gb3Bwb3NpdGUgZWRnZXMgdG8gbWFyayBhcyBmaXhlZC5cbiAgICAvLyBNYWtlIHN1cmUgdG8gcGljayBub24tZmFrZSB0aWxlcywgZm9yIGJldHRlciByZXN1bHRzLlxuICAgIC8vIGNvbnN0IHR1cm5zID0gbmV3IFNldChbMHgwMDMzLCAweDAzMzAsIDB4MzMwMCwgMHgzMDAzXSkgYXMgU2V0PFNjcj47XG5cbiAgICAvLyBUT0RPIC0gcmFuZG9tbHkgbWFrZSBhIHZlcnRpY2FsIHJpdmVyIGluc3RlYWQgb2YgaG9yaXpvbnRhbD9cbiAgICBmb3IgKGNvbnN0IHggb2YgWzAsIHRoaXMudyAtIDFdKSB7XG4gICAgICBmb3IgKGNvbnN0IHkgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoc2VxKHRoaXMuaCAtIDMsIHkgPT4geSArIDIpKSkge1xuICAgICAgICBjb25zdCBwb3MgPSAoeSA8PCA0IHwgeCkgYXMgUG9zO1xuICAgICAgICAvLyBjb25zdCBzY3IgPSBtYXplLmdldChwb3MpO1xuICAgICAgICAvLyBpZiAoc2NyICYmIHR1cm5zLmhhcyhzY3IpKSB7XG4gICAgICAgICAgdGhpcy5maXhlZC5hZGQocG9zKTtcbiAgICAgICAgICAvL3RoaXMuZml4ZWQuYWRkKHBvcyAtIDE2IGFzIFBvcyk7XG4gICAgICAgICAgdGhpcy5maXhlZFJpdmVyLmFkZChwb3MpO1xuICAgICAgICAgIC8vdGhpcy5maXhlZFJpdmVyLmFkZChwb3MgLSAxNiBhcyBQb3MpO1xuICAgICAgICAgIGlmICh0aGlzLnJhbmRvbS5uZXh0SW50KDIpKSBicmVhaztcbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGNoZWNrKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5waGFzZSA9PT0gJ2NhdmUnKSByZXR1cm4gc3VwZXIuY2hlY2sobWF6ZSk7XG4gICAgLy8gUml2ZXIgY2hlY2sgaW52b2x2ZXMganVzdCBlbnN1cmluZyBldmVyeXRoaW5nIGlzIHJlYWNoYWJsZSBieSBmbGlnaHQ/XG4gICAgLy8gQnV0IHdlIGRvbid0IGhhdmUgdGhhdCBmb3Igbm93Li4uXG5cbiAgICBpZiAoWy4uLnRoaXMuZml4ZWRSaXZlcl0uc29tZShwb3MgPT4gIW1hemUuZ2V0KHBvcykpKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgdHJhdmVyc2UgPSBtYXplLnRyYXZlcnNlKHtmbGlnaHQ6IHRydWV9KTtcbiAgICBjb25zdCBwYXJ0aXRpb25zID0gWy4uLm5ldyBTZXQodHJhdmVyc2UudmFsdWVzKCkpXS5tYXAocyA9PiBzLnNpemUpO1xuICAgIHJldHVybiBwYXJ0aXRpb25zLmxlbmd0aCA9PT0gMSAmJiBwYXJ0aXRpb25zWzBdID09PSB0cmF2ZXJzZS5zaXplO1xuICAgIC8vIGxldCBzdW0gPSAwO1xuICAgIC8vIGZvciAoY29uc3QgcGFydCBvZiBwYXJ0aXRpb25zKSB7XG4gICAgLy8gICBzdW0gKz0gcGFydDtcbiAgICAvLyB9XG4gICAgLy8gcmV0dXJuIHBhcnRpdGlvbnMuZXZlcnkocCA9PiBwID4gMikgJiYgc3VtID09PSB0cmF2ZXJzZS5zaXplO1xuICB9XG59XG5jb25zdCBbXSA9IFtFdmlsU3Bpcml0Uml2ZXJDYXZlU2h1ZmZsZV9vbGRdO1xuXG5mdW5jdGlvbiBmYWlsKG1zZzogc3RyaW5nLCBtYXplPzogTWF6ZSk6IGZhbHNlIHtcbiAgY29uc29sZS5lcnJvcihgUmVyb2xsOiAke21zZ31gKTtcbiAgaWYgKG1hemUgJiYgREVCVUcpIGNvbnNvbGUubG9nKG1hemUuc2hvdygpKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBDaGVjayB3aGV0aGVyIHRoZXJlJ3MgYSBcInRpZ2h0IGN5Y2xlXCIgYXQgYHBvc2AuICBXZSB3aWxsXG4vLyBwcm9iYWJseSB3YW50IHRvIGJyZWFrIGl0LlxuZnVuY3Rpb24gaXNUaWdodEN5Y2xlKG1hemU6IE1hemUsIHBvczogUG9zKTogYm9vbGVhbiB7XG4gIGNvbnN0IHVsID0gbWF6ZS5nZXQoKHBvcyAtIDE3KSBhcyBQb3MpIHx8IDA7XG4gIGNvbnN0IGRyID0gbWF6ZS5nZXQoKHBvcykgYXMgUG9zKSB8fCAwO1xuICByZXR1cm4gISEoKHVsICYgMHgwZjAwKSAmJiAodWwgJiAweDAwZjApICYmIChkciAmIDB4ZjAwMCkgJiYgKGRyICYgMHgwMDBmKSk7XG59XG5cbi8vIEVuc3VyZSBib3JkZXJzIGFyZSBjb25zaXN0ZW50IHdpdGggYW55IHByZS1wbGFjZWQgZml4ZWQgdGlsZXMvZWRnZXMuXG5mdW5jdGlvbiBmaXhCb3JkZXJzKG1hemU6IE1hemUsIHBvczogUG9zLCBzY3I6IFNjcik6IHZvaWQge1xuICB0cnkge1xuICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgIGlmICghbWF6ZS5pbkJvdW5kcyhQb3MucGx1cyhwb3MsIGRpcikpICYmXG4gICAgICAgICAgKChzY3IgPj4gRGlyLnNoaWZ0KGRpcikpICYgMHg3KSA9PT0gNykge1xuICAgICAgICBtYXplLnNldEJvcmRlcihwb3MsIGRpciwgNyk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHt9XG59XG5cbiAgICAvL21hemUudHJhY2tPcGVuRWRnZXMoKTtcblxuICAgIC8vY29uc3QgbWFwcGluZzogQXJyYXk8W1BvcywgUG9zXT4gPSBbXTsgLy8gTk9URTogbWF5IG5lZWQgdG8geGZvcm0gaWYgc2hyaW5rXG4gICAgLy9jb25zdCBwb2k6IEFycmF5PFtQb3MsIERpcl0+ID0gW107XG4gICAgLy9sZXQge2JyYW5jaGVzLCBkZWFkRW5kcywgc2l6ZSwgd2FsbHN9ID0gc3VydmV5O1xuXG5cbiAgICBcblxuICAgIC8vIC8vIFBvc3NpYmxlIGFwcHJvYWNoOlxuICAgIC8vIC8vICAxLiBzZWVkIGEgYnVuY2ggb2YgaW5pdGlhbCBzY3JlZW5zXG4gICAgLy8gLy8gIDIuIGNoZWNrIHN0ZXA6IHRyYXZlcnNlIHRoZSBtYXAgd2l0aFxuICAgIC8vIC8vICAgICBtaXNzaW5nIGl0ZW1zIHRyZWF0ZWQgYXMgY29ubmVjdGluZyBldmVyeXRoaW5nXG4gICAgLy8gLy8gIDMuIGFkZCByYW5kb20gc2NyZWVucywgYmlhc2luZyB0b3dhcmQgZmV3ZXIgZXhpdHNcbiAgICAvLyAvLyAgICAgYmFzZWQgb24gYnJhbmNoaW5nIGZhY3Rvcj9cbiAgICAvLyAvLyBUaGlzIHNob3VsZCBlbnN1cmUgd2UgZG9uJ3QgZG8gYW55dGhpbmcgdG9vIHN0dXBpZCB0b1xuICAgIC8vIC8vIHBhaW50IG91cnNlbHZlcyBpbnRvIGEgY29ybmVyLlxuXG4gICAgLy8gUGxhY2UgKDEpIGVkZ2UgZXhpdHMsICgyKSBmaXhlZCBzY3JlZW5zLCAoMykgc3RhaXJzLlxuLy8gICAgIGNvbnN0IHNldEVkZ2VzID0gbmV3IFNldDxQb3M+KCk7XG4vLyAgICAgZm9yIChjb25zdCBbLCBlZGdlXSBvZiBzdXJ2ZXkuZWRnZXMpIHtcbi8vICAgICAgIHdoaWxlICh0cnVlKSB7XG4vLyAgICAgICAgIGNvbnN0IHRpbGUgPSAvKjEgKyovIHJhbmRvbS5uZXh0SW50KGVkZ2UuZGlyICYgMSA/IGgwIDogdzApO1xuLy8gICAgICAgICBjb25zdCBvdGhlciA9XG4vLyAgICAgICAgICAgICBlZGdlLmRpciA9PT0gRGlyLlJJR0hUID8gLyoxICsqLyB3MCA6XG4vLyAgICAgICAgICAgICBlZGdlLmRpciA9PT0gRGlyLkRPV04gPyAvKjEgKyovIGgwIDogMDtcbi8vICAgICAgICAgY29uc3QgcG9zID0gKGVkZ2UuZGlyICYgMSA/IHRpbGUgPDwgNCB8IG90aGVyIDogb3RoZXIgPDwgNCB8IHRpbGUpIGFzIFBvcztcbi8vICAgICAgICAgaWYgKHNldEVkZ2VzLmhhcyhwb3MpKSBjb250aW51ZTtcbi8vICAgICAgICAgbWF6ZS5zZXRCb3JkZXIocG9zLCBlZGdlLmRpciwgNik7XG4vLyAgICAgICAgIGJyZWFrO1xuLy8gICAgICAgfVxuLy8gICAgICAgLy8gaWYgKCFtYXplLmZpbGwobW92ZWQsIHttYXhFeGl0czogMiArIGJyYW5jaGVzfSkpIGNvbnRpbnVlIE9VVEVSO1xuLy8gICAgICAgLy8gY29uc3QgZmlsbGVkID0gbWF6ZS5nZXQobW92ZWQpITtcbi8vICAgICAgIC8vIG1hcHBpbmcucHVzaChbcG9zLCBtb3ZlZF0pO1xuLy8gICAgICAgLy8gbGV0IGV4aXRzID0gMDtcbi8vICAgICAgIC8vIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbi8vICAgICAgIC8vICAgaWYgKGRpciAhPSBlZGdlLmRpciAmJiAoZmlsbGVkICYgRGlyLmVkZ2VNYXNrKGRpcikpKSB7XG4vLyAgICAgICAvLyAgICAgLy8gcG9pLnB1c2goW21vdmVkLCBkaXJdKTtcbi8vICAgICAgIC8vICAgICBleGl0cysrO1xuLy8gICAgICAgLy8gICB9XG4vLyAgICAgICAvLyB9XG4vLyAgICAgICAvLyBzaXplLS07XG4vLyAgICAgICAvLyBpZiAoZXhpdHMgPiAxKSBicmFuY2hlcyAtPSAoZXhpdHMgLSAxKTtcbi8vICAgICB9XG5cbi8vICAgICBmb3IgKGNvbnN0IFssIHNjcl0gb2Ygc3VydmV5LmZpeGVkKSB7XG4vLyAgICAgICBpZiAobWF6ZS5hZGRTY3JlZW4oc2NyKSA9PSBudWxsKSBjb250aW51ZSBPVVRFUjtcbi8vICAgICB9XG5cbi8vICAgICBmb3IgKGNvbnN0IHN0YWlyIG9mIHN1cnZleS5zdGFpcnMpIHtcbi8vICAgICAgIGNvbnN0IGVsaWdpYmxlID0gW107XG4vLyAgICAgICBmb3IgKGNvbnN0IHNwZWMgb2Ygc2NyZWVucykge1xuLy8gICAgICAgICBpZiAoc3BlYy5zdGFpcnMuc29tZShzID0+IHMuZGlyID09PSBzdGFpci5kaXIpKSBlbGlnaWJsZS5wdXNoKHNwZWMuZWRnZXMpO1xuLy8gICAgICAgfVxuLy8gICAgICAgaWYgKG1hemUuYWRkU2NyZWVuKHJhbmRvbS5waWNrKGVsaWdpYmxlKSkgPT0gbnVsbCkgY29udGludWUgT1VURVI7XG4vLyAgICAgfVxuXG4vLyAgICAgLy8gLy8gTm93IGZpbGwgb3V0IGEgYmFzaWMgc3RydWN0dXJlIGJ5IHdhbGtpbmcgcmFuZG9tIHBhdGhzLlxuLy8gICAgIC8vIHdoaWxlIChtYXplLmRlbnNpdHkoKSA8IGRlbnNpdHkpIHtcbi8vICAgICAvLyAgIGlmIChtYXplLnJhbmRvbUV4dGVuc2lvbihicmFuY2hlcyAvIHNpemUpKSBicmFuY2hlcy0tO1xuLy8gICAgIC8vICAgc2l6ZS0tO1xuLy8gICAgIC8vIH1cblxuXG4vLyAgICAgLy8gICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcbi8vICAgICAvLyAgICAgY29uc3QgdGlsZTAgPSByYW5kb20ubmV4dEludChoMCAqIHcwKTtcbi8vICAgICAvLyAgICAgY29uc3QgeCA9IHRpbGUwICUgdzA7XG4vLyAgICAgLy8gICAgIGNvbnN0IHkgPSAodGlsZTAgLSB4KSAvIHcwO1xuLy8gICAgIC8vICAgICBpZiAoIW1hemUudHJ5U2V0KHBvcywgXG4vLyAgICAgLy8gfVxuXG5cbi8vICAgICAvLyBmb3IgKGNvbnN0IHN0YWlyIG9mIHN1cnZleS5zdGFpcnMpIHtcbi8vICAgICAvLyAgIC8vIEZpbmQgYSByYW5kb20gbG9jYXRpb24gZm9yIGEgY29ycmVjdC1kaXJlY3Rpb24gc3RhaXIuXG4vLyAgICAgLy8gICBjb25zdCBwb3MgPSBtYXplLnJhbmRvbVVuZmlsbGVkUG9zKCk7XG4vLyAgICAgLy8gfVxuXG4vLyAgICAgY29uc29sZS5sb2cobWF6ZS5zaG93KCkpO1xuLy8gICB9XG4vLyB9XG5cbiAgLy8gZnVuY3Rpb24gdHJ5U2h1ZmZsZU5vQnJhbmNoKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgLy8gICBpZiAoc3VydmV5LnRpbGVzLmNvdW50KDB4OTEpIHx8IHN1cnZleS50aWxlcy5jb3VudCgweDkyKSkge1xuICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaGFuZGxlIHRpbGVgKTtcbiAgLy8gICB9XG5cbiAgLy8gICAvLyBCYXNpYyBwbGFuOiBtYWtlIGEgbGlzdCBvZiBzY3JlZW5zLCB3aGljaCBpbmNsdWRlIHR1cm5zLCBzdHJhaWdodHMsXG4gIC8vICAgLy8gYW5kIGZpeGVkIHNjcmVlbnMuXG4gIC8vICAgbGV0IHtzaXplLCB3YWxsc30gPSBzdXJ2ZXk7XG4gIC8vICAgY29uc3QgW10gPSBbd2FsbHNdO1xuXG4gIC8vICAgLy8gV2UgbmVlZCBhdCBtb3N0IHR3byBleGl0cywgYXQgbW9zdCBvbmUgY2FuIGJlIGFuIGVkZ2UuXG4gIC8vICAgY29uc3QgZWRnZUNvdW50ID0gc3VydmV5LmVkZ2VzLnNpemU7XG4gIC8vICAgY29uc3Qgc3RhaXJDb3VudCA9IHN1cnZleS5zdGFpcnMuc2l6ZTtcbiAgLy8gICBjb25zdCBleGl0Q291bnQgPSBlZGdlQ291bnQgKyBzdGFpckNvdW50O1xuICAvLyAgIGlmIChlZGdlQ291bnQgPiAxKSB0aHJvdyBuZXcgRXJyb3IoYHRvbyBtYW55IGVkZ2VzOiAke2VkZ2VDb3VudH1gKTtcbiAgLy8gICBpZiAoZXhpdENvdW50ID4gMikgdGhyb3cgbmV3IEVycm9yKGB0b28gbWFueSBleGl0czogJHtleGl0Q291bnR9YCk7XG5cbiAgLy8gICBsZXQgc3RhcnQ6IFBvcztcbiAgLy8gICBsZXQgZW50cmFuY2VFZGdlczogbnVtYmVyO1xuICAvLyAgIGxldCB0YXJnZXQ6IEV4aXRTcGVjIHwgdW5kZWZpbmVkO1xuXG4gIC8vICAgLy8gUGxhY2UgdGhlIGZpcnN0IHRpbGUuXG4gIC8vICAgY29uc3Qgc3RhaXJzID0gWy4uLnN1cnZleS5zdGFpcnMudmFsdWVzKCldO1xuICAvLyAgIGlmIChlZGdlQ291bnQpIHtcbiAgLy8gICAgIGNvbnN0IFtlZGdlXSA9IFsuLi5zdXJ2ZXkuZWRnZXMudmFsdWVzKCldO1xuICAvLyAgICAgc3RhcnQgPSByYW5kb21FZGdlKGVkZ2UuZGlyKTtcbiAgLy8gICAgIG1hemUuc2V0Qm9yZGVyKHN0YXJ0LCBlZGdlLmRpciwgNik7XG4gIC8vICAgICBpZiAoIW1hemUuZmlsbChzdGFydCwge21heEV4aXRzOiAyfSkpIHJldHVybiBmYWlsKCdlbnRyYW5jZSBlZGdlIGZpbGwnKTtcbiAgLy8gICAgIGVudHJhbmNlRWRnZXMgPSBtYXplLmdldChzdGFydCkhICYgfkRpci5lZGdlTWFzayhlZGdlLmRpcikgJiAweGZmZmY7XG4gIC8vICAgICB0YXJnZXQgPSBzdGFpcnNbMF07XG4gIC8vICAgfSBlbHNlIHtcbiAgLy8gICAgIC8vIHN0YXJ0IHdpdGggYSBzdGFpclxuICAvLyAgICAgc3RhcnQgPSBtYXplLnJhbmRvbVBvcygpO1xuICAvLyAgICAgaWYgKCFtYXplLmZpbGwoc3RhcnQsIHttYXhFeGl0czogMSwgc3RhaXI6IHN0YWlyc1swXS5kaXJ9KSkge1xuICAvLyAgICAgICByZXR1cm4gZmFpbCgnZW50cmFuY2Ugc3RhaXIgZmlsbCcpO1xuICAvLyAgICAgfVxuICAvLyAgICAgZW50cmFuY2VFZGdlcyA9IG1hemUuZ2V0KHN0YXJ0KSEgJiAweGZmZmY7XG4gIC8vICAgICB0YXJnZXQgPSBzdGFpcnNbMV07XG4gIC8vICAgfVxuXG4gIC8vICAgLy8gRmlndXJlIG91dCBzdGFydCBkaXJlY3Rpb25cbiAgLy8gICBsZXQgc3RhcnREaXIgPSAwIGFzIERpcjtcbiAgLy8gICBmb3IgKDsgc3RhcnREaXIgPCA0OyBzdGFydERpcisrKSB7XG4gIC8vICAgICBpZiAoZW50cmFuY2VFZGdlcyAmIERpci5lZGdlTWFzayhzdGFydERpcikpIGJyZWFrO1xuICAvLyAgIH1cbiAgLy8gICBpZiAoc3RhcnREaXIgPT09IDQpIHJldHVybiBmYWlsKCdubyBlZGdlIGV4aXQnKTtcblxuICAvLyAgIC8vIE1ha2UgdXAgYSBwYXRoXG4gIC8vICAgdHlwZSBUdXJuID0gLTEgfCAwIHwgMTtcbiAgLy8gICBmdW5jdGlvbiB0dXJuKCk6IFR1cm4geyByZXR1cm4gKHJhbmRvbS5uZXh0SW50KDMpIC0gMSkgYXMgVHVybjsgfVxuICAvLyAgIGNvbnN0IHBhdGggPSBzZXEoc2l6ZSAtIDIgKyByYW5kb20ubmV4dEludCgyKSwgdHVybik7XG4gIC8vICAgY29uc3QgZmluYWxPcHRzID0gdGFyZ2V0ID8ge3N0YWlyOiB0YXJnZXQuZGlyfSA6IHt9O1xuICAvLyAgIGlmICghbWF6ZS5maWxsUGF0aFRvRGVhZEVuZChzdGFydCwgc3RhcnREaXIsIHBhdGhbU3ltYm9sLml0ZXJhdG9yXSgpLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7ZWRnZTogMX0sIGZpbmFsT3B0cykpIHtcbiAgLy8gICAgIHJldHVybiBmYWlsKGBjb3VsZCBub3QgZmlsbCBwYXRoOiAke3BhdGh9YCk7XG4gIC8vICAgfVxuXG4gIC8vICAgLy8gQWRkIGluIFtmaXhlZCBzY3JlZW5zXSwgc3RhaXIgaGFsbHMvYnJpZGdlcywgYW5kIHdhbGxzIChyZXNwZWN0aXZlbHkpLlxuXG4gIC8vICAgLy8gVE9ETyAtIGZsZXNoIHRoaXMgb3V0IExBVEVSLCBmb3Igbm93IGRvbid0IHdvcnJ5IGFib3V0IG5vbi1icmFuY2hpbmcuXG5cbiAgLy8gICAvLyBmb3IgKGNvbnN0IHRpbGUgb2YgWzB4OGNdKSB7IC8vICwgMHg4ZCwgMHg4ZV0pIHtcbiAgLy8gICAvLyAgIGlmIChzdXJ2ZXkudGlsZXMuY291bnQodGlsZSkpIHtcbiAgLy8gICAvLyAgICAgY29uc3Qgc3RlcHMgPSByYW5kb20uc2h1ZmZsZShhbHRzLmZpbHRlcih4ID0+IHhbM10udGlsZSA9PT0gdGlsZSkpO1xuICAvLyAgIC8vICAgICBpZiAoc3RlcHMubGVuZ3RoIDwgc3VydmV5LnRpbGVzLmNvdW50KHRpbGUpKSB7XG4gIC8vICAgLy8gICAgICAgcmV0dXJuIGZhaWwoYGNvdWxkIG5vdCBhZGQgc3RhaXIgaGFsbHdheWApO1xuICAvLyAgIC8vICAgICB9XG4gIC8vICAgLy8gICAgIGZvciAobGV0IGkgPSBzdXJ2ZXkudGlsZXMuY291bnQodGlsZSkgLSAxOyBpID49IDA7IGktLSkge1xuICAvLyAgIC8vICAgICAgIG1hemUucmVwbGFjZShzdGVwc1tpXVswXSwgc3RlcHNbaV1bMl0pO1xuICAvLyAgIC8vICAgICAgIHJlcGxhY2VkLmFkZChzdGVwc1tpXVswXSk7XG4gIC8vICAgLy8gICAgIH1cbiAgLy8gICAvLyAgIH1cbiAgLy8gICAvLyB9XG5cbiAgLy8gICAvLyBjb25zb2xlLmxvZyhgZG9uZVxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gIC8vICAgaWYgKGxvYy5yb20uc3BvaWxlcikgbG9jLnJvbS5zcG9pbGVyLmFkZE1hemUobG9jLmlkLCBsb2MubmFtZSwgbWF6ZS5zaG93KCkpO1xuICAvLyAgIHJldHVybiB0cnVlO1xuICAvLyB9XG5cbmNvbnN0IFNUUkFURUdJRVMgPSBuZXcgTWFwPG51bWJlciwgU2h1ZmZsZVN0cmF0ZWd5PihbXG4gIFsweDI3LCBDeWNsZUNhdmVTaHVmZmxlXSxcbiAgWzB4NGIsIFRpZ2h0Q3ljbGVDYXZlU2h1ZmZsZV0sXG4gIFsweDU0LCBDeWNsZUNhdmVTaHVmZmxlXSxcbiAgWzB4NTYsIFdpZGVDYXZlU2h1ZmZsZV0sXG4gIFsweDU3LCBXYXRlcmZhbGxSaXZlckNhdmVTaHVmZmxlXSxcbiAgWzB4NjksIFJpdmVyQ2F2ZVNodWZmbGVdLFxuICBbMHg4NCwgV2lkZUNhdmVTaHVmZmxlXSxcbiAgWzB4YWIsIFJpdmVyQ2F2ZVNodWZmbGVdLFxuXSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlQ2F2ZShsb2M6IExvY2F0aW9uLCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBuZXcgKFNUUkFURUdJRVMuZ2V0KGxvYy5pZCkgfHwgQmFzaWNDYXZlU2h1ZmZsZSkobG9jLCByYW5kb20pLnNodWZmbGUoKTtcbn1cbiJdfQ==