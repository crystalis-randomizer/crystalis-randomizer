import { Maze } from './maze.js';
import { SpecSet } from './spec.js';
import { Dir, Pos } from './types.js';
import { hex, seq } from '../rom/util.js';
import { iters } from '../util.js';
const DEBUG = true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFXLElBQUksRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUN6QyxPQUFPLEVBQUMsT0FBTyxFQUFTLE1BQU0sV0FBVyxDQUFDO0FBQzFDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFNLE1BQU0sWUFBWSxDQUFDO0FBS3pDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVqQyxNQUFNLEtBQUssR0FBWSxJQUFJLENBQUM7QUEwQjVCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQztBQUNyQixNQUFNLGdCQUFnQjtJQVlwQixZQUFxQixHQUFhLEVBQVcsTUFBYztRQUF0QyxRQUFHLEdBQUgsR0FBRyxDQUFVO1FBQVcsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUN6RCxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxPQUFPO1FBQ0wsS0FBSyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsT0FBTyxHQUFHLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNuRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJ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LENBQUMsR0FBUTtRQUNaLE1BQU0sS0FBSyxHQUNQLEdBQUcsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxHQUFHLEdBQUcsQ0FBQztZQUFFLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFRLENBQUMsQ0FBQztRQUM5RCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBUSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxHQUFRO1FBQ2pCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLEtBQUssR0FDUCxHQUFHLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQVEsQ0FBQztJQUNsRSxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQVUsRUFBRSxDQUFnQixFQUFFLEtBQWE7UUFDL0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM5QixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1NBQ3hDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0NBQ0Y7QUFPRCxNQUFNLGVBQWdCLFNBQVEsZ0JBQWdCO0lBQzVDLGVBQWUsQ0FBQyxJQUFVO1FBSXhCLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFNUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1NBQ3pDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUdELFVBQVU7UUFDUixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxXQUFXO1FBQ1QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLHlCQUEwQixTQUFRLGdCQUFnQjtJQUN0RCxzQkFBc0IsQ0FBQyxJQUFVO1FBQy9CLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBVyxFQUFFLEdBQVcsRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQVUsQ0FBQyxDQUFDO1lBQzNCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBVSxFQUFFLEdBQVUsQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQztRQUNGLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBUSxDQUFDLENBQUM7UUFDN0IsR0FBRyxDQUFDLE1BQU0sR0FBRyxLQUFLLEVBQUUsTUFBUSxDQUFDLENBQUM7UUFDOUIsR0FBRyxDQUFDLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBUSxDQUFDLENBQUM7UUFDOUIsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFRLENBQUMsQ0FBQztRQUNyQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdEMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFRLENBQUMsQ0FBQztZQUM1QixZQUFZLENBQUMsSUFBSSxDQUFDLEdBQVEsQ0FBQyxDQUFDO1NBQzdCO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ25DLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLEVBQUUsWUFBWSxDQUFDLEdBQUcsRUFBRyxDQUFDLENBQUM7U0FDNUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBVTtRQUNkLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQyxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEUsT0FBTyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDNUIsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsSUFBSTtZQUMvQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0MsQ0FBQztDQUNGO0FBRUQsTUFBTSxnQkFBaUIsU0FBUSxnQkFBZ0I7SUFFN0MsS0FBSyxDQUFDLElBQVU7UUFDZCxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDM0IsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0QyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25ELE9BQU8sSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU07WUFBRSxPQUFPLEtBQUssQ0FBQztRQUV0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMxQixNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2pCLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsTUFBTTtvQkFBRSxPQUFPLElBQUksQ0FBQzthQUNqRTtTQUNGO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0NBQ0Y7QUFFRCxNQUFNLHFCQUFzQixTQUFRLGdCQUFnQjtJQUVsRCxpQkFBaUI7UUFDZixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQUVELE1BQU0sZ0JBQWlCLFNBQVEsZ0JBQWdCO0lBQS9DOztRQXdCRSxjQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQVEsRUFBRSxLQUFRLENBQUM7WUFDcEIsQ0FBQyxHQUFRLEVBQUUsS0FBUSxDQUFDO1lBQ3BCLENBQUMsQ0FBUSxFQUFFLEtBQVEsQ0FBQztZQUNwQixDQUFDLEdBQVEsRUFBRSxLQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUMsaUJBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQztZQUNyQixDQUFDLEtBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVsQixDQUFDLEtBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNwQyxDQUFDLEtBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxLQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNoQixDQUFDLENBQUM7UUFFSCxpQkFBWSxHQUFHLElBQUksR0FBRyxDQUFzQjtZQUMxQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFRLEVBQUUsTUFBUSxFQUFFLE1BQVEsQ0FBVSxDQUFDO1lBQ25ELENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQVEsRUFBRSxLQUFRLEVBQUUsS0FBUSxFQUFFLE1BQVEsQ0FBVSxDQUFDO1NBQzVELENBQUMsQ0FBQztRQUdILDBCQUFxQixHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsd0JBQW1CLEdBQUcsQ0FBQyxLQUFRLEVBQUUsS0FBUTtZQUNsQixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQVUsQ0FBQztRQUNoRSxxQkFBZ0IsR0FBRyxDQUFDLEtBQVEsRUFBRSxLQUFRLEVBQUUsS0FBUSxFQUFFLEtBQVE7WUFDdEMsTUFBUSxFQUFFLE1BQVE7WUFDbEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTTtZQUM5QixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBVSxDQUFDO0lBOE52RCxDQUFDO0lBMU5DLFVBQVUsQ0FBQyxJQUFVO1FBQ25CLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQU12QixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzFFLElBQUksS0FBSztZQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFekQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDckUsSUFBSSxLQUFLO1lBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUkxRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUNyRSxJQUFJLEtBQUs7WUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBSTFELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ3ZFLElBQUksS0FBSztZQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRS9ELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ25FLElBQUksS0FBSztZQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFeEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSztZQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ3pDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUs7WUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNqQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUMxQyxJQUFJLEtBQUs7WUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztRQUN4QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQVU7UUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQVEsQ0FBQyxDQUFDLENBQUMsS0FBUSxDQUFRLENBQUM7UUFDbEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQVEsQ0FBQyxDQUFDLENBQUMsS0FBUSxDQUFRLENBQUM7UUFDcEUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFRLENBQUM7UUFDakMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBUSxDQUFDO1FBQ2xELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFDdkIsRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtZQUNqQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUMsQ0FBQyxFQUFFO1lBQ2pFLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxXQUFXLENBQUMsSUFBVTtRQUdwQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsYUFBYSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBRTdELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZ0JBQWdCO2dCQUM5QixnQkFBZ0IsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUMsQ0FBQyxFQUFFO2dCQUNoRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ1A7U0FDRjtRQUNELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM3QixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO2dCQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3hDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQVU7UUFHcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFHOUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sVUFBVSxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELGNBQWMsRUFDZCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtZQUNsQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBTyxDQUFDO1lBQ2pDLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxFQUFFO2dCQUM1QixNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQVEsQ0FBQztnQkFFL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7b0JBQUUsU0FBUyxjQUFjLENBQUM7Z0JBRWpELFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRTtvQkFDbEIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQVEsQ0FBQyxDQUFDO2lCQUNqQztxQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7b0JBQ3pCLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFRLENBQUMsQ0FBQztpQkFDbEM7YUFDRjtZQUNELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBR3BDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztZQUNsQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFO2dCQUN0RCxLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUU7b0JBQ3pCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxHQUFHLE1BQU0sQ0FBQztvQkFDdkMsSUFBSSxLQUFLLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzt3QkFBRSxTQUFTO29CQUVwRCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBRWhDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsR0FBRyxPQUFPLENBQVEsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO29CQUMzRSxLQUFLLEdBQUcsSUFBSSxDQUFDO29CQUNiLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUFFLE1BQU07b0JBQ2xDLFNBQVMsY0FBYyxDQUFDO2lCQUN6QjthQUNGO1lBRUQsSUFBSSxLQUFLO2dCQUFFLFNBQVMsY0FBYyxDQUFDO1lBQ25DLElBQUksU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBQ3JDLEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxFQUFFO2dCQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQzNCO1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFVO1FBR3RCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1lBQ3ZELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUIsSUFBSSxHQUFHLElBQUksSUFBSTtnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7Z0JBQ3hFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO29CQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBUSxDQUFDLENBQUM7b0JBQ3JELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsSUFBSSxPQUFPO29CQUFFLE1BQU07YUFDcEI7U0FDRjtRQUVELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3pELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFFLENBQUMsSUFBSSxDQUFDO1lBQ3JDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixPQUFPLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUN4QyxDQUFDO0lBRUQsU0FBUyxDQUFDLElBQVU7UUFFbEIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRXJGLEtBQUssRUFDTCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzdDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNuRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztvQkFBRSxTQUFTO2dCQUN6RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtvQkFDakMsTUFBTSxJQUFJLEdBQUcsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUMsQ0FBQztvQkFDbkQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RFLENBQUMsQ0FBQyxDQUFDO2dCQUNILElBQUksQ0FBQyxFQUFFO29CQUFFLFNBQVM7Z0JBQ2xCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQixTQUFTLEtBQUssQ0FBQzthQUNoQjtZQUNELE9BQU8sSUFBSSxDQUFDLGdDQUFnQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNoRTtRQUtELE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1FBQ2hELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUMzQyxLQUFLLE1BQU0sR0FBRyxJQUFJLFNBQVMsRUFBRTtnQkFDM0IsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7YUFDcEM7U0FDRjtRQUdELE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFZLENBQUM7UUFDakMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRTtZQUNsRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07Z0JBQUUsTUFBTTtZQUMxQixNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDO1lBQzNDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7Z0JBQUUsU0FBUztZQUNsQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxTQUFTO1lBQ2xDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBRSxFQUFFO2dCQUMvRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtvQkFFakMsTUFBTSxJQUFJLEdBQUcsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUMsQ0FBQztvQkFDbkQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDcEUsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsSUFBSSxDQUFDLEVBQUU7b0JBQUUsU0FBUztnQkFDbEIsTUFBTSxDQUFDLEtBQUssRUFBRyxDQUFDO2dCQUNoQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDcEIsTUFBTTthQUNQO1NBQ0Y7UUFxQkQsSUFBSSxNQUFNLENBQUMsTUFBTTtZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ2hDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBRUQsTUFBTSw4QkFBK0IsU0FBUSxnQkFBZ0I7SUFBN0Q7O1FBeUJFLGFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU07WUFDOUIsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNO1lBQzlDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQWEsQ0FBQztRQUN6RCxZQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQWEsQ0FBQztJQTRLbEQsQ0FBQztJQTFLQyxzQkFBc0IsQ0FBQyxJQUFVO1FBRy9CLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUk1QixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQWM5QyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUl6QyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQixJQUFJLENBQUMsR0FBRztnQkFBRSxTQUFTO1lBQ25CLE1BQU0sR0FBRyxHQUFHLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxRSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2hDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVCLElBQUksSUFBSTtvQkFBRSxPQUFPLEtBQUssQ0FBQztnQkFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFRLENBQUMsQ0FBQzthQUMzQztTQUNGO1FBR0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2xCO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3JCO1NBQ0Y7UUFHRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQixJQUFJLENBQUMsR0FBRztnQkFBRSxTQUFTO1lBRW5CLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQUUsU0FBUztZQUV2RCxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDdkUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFRLENBQUM7WUFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3hEO1FBS0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQVV0RCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUNwQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBVSxFQUFFLEdBQVE7UUFJN0IsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU87WUFBRSxPQUFPO1FBR25DLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUN6QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBRWhDLElBQUksQ0FBQyxhQUFhLENBQ3RCLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUNsQixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxPQUFPLEVBQ1osR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbEM7U0FDRjtJQUVILENBQUM7SUFFRCxlQUFlLENBQUMsSUFBVTtRQU14QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDL0IsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDO2dCQUNsQixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFRLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUM7b0JBQUUsSUFBSSxJQUFJLE1BQU0sQ0FBQztnQkFDNUIsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDO29CQUFFLElBQUksSUFBSSxNQUFNLENBQUM7Z0JBRXJDLElBQUksQ0FBQyxLQUFLLENBQUM7b0JBQUUsSUFBSSxJQUFJLE1BQU0sQ0FBQztnQkFDNUIsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDO29CQUFFLElBQUksSUFBSSxNQUFNLENBQUM7Z0JBaUJyQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFXLENBQUMsQ0FBQzthQUM1QjtTQUNGO1FBTUQsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQy9CLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pFLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQVEsQ0FBQztnQkFHOUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRXBCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUV6QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFBRSxNQUFNO2FBRXJDO1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBVTtRQUNkLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxNQUFNO1lBQUUsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBSXBELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUNuRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxVQUFVLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFNcEUsQ0FBQztDQUNGO0FBQ0QsTUFBTSxFQUFFLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBRTVDLFNBQVMsSUFBSSxDQUFDLEdBQVcsRUFBRSxJQUFXO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLElBQUksSUFBSSxJQUFJLEtBQUs7UUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUlELFNBQVMsWUFBWSxDQUFDLElBQVUsRUFBRSxHQUFRO0lBQ3hDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUM5RSxDQUFDO0FBR0QsU0FBUyxVQUFVLENBQUMsSUFBVSxFQUFFLEdBQVEsRUFBRSxHQUFRO0lBQ2hELElBQUk7UUFDRixLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2xDLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzdCO1NBQ0Y7S0FDRjtJQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUU7QUFDbEIsQ0FBQztBQWtLRCxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBMEI7SUFDbEQsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUM7SUFDeEIsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUM7SUFDN0IsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUM7SUFDeEIsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDO0lBQ3ZCLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ2pDLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDO0lBQ3hCLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQztJQUN2QixDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztDQUN6QixDQUFDLENBQUM7QUFFSCxNQUFNLFVBQVUsV0FBVyxDQUFDLEdBQWEsRUFBRSxNQUFjO0lBQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUMxRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGaWxsT3B0cywgTWF6ZX0gZnJvbSAnLi9tYXplLmpzJztcbmltcG9ydCB7U3BlY1NldCwgU3VydmV5fSBmcm9tICcuL3NwZWMuanMnO1xuaW1wb3J0IHtEaXIsIFBvcywgU2NyfSBmcm9tICcuL3R5cGVzLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuLy9pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG4vL2ltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi4vcm9tL21vbnN0ZXIuanMnO1xuaW1wb3J0IHtoZXgsIHNlcX0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHtpdGVyc30gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmNvbnN0IERFQlVHOiBib29sZWFuID0gdHJ1ZTtcblxuLy8gaW52YXJpYW50cyBmb3Igc2h1ZmZsaW5nIGNhdmVzOlxuLy8gIC0gZGVhZCBlbmRzXG4vLyAgLSBkb29ycyAodHlwZXMvZGlyZWN0aW9ucylcbi8vICAtIHdhbGxzIChudW1iZXIsIG5vdCBuZWNlc3NhcmlseSBkaXJlY3Rpb24pXG4vLyAgLSBcImJpZyByb29tc1wiXG4vLyAgLSB0cmVhc3VyZSBjaGVzdHMsIGV0Yy5cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGVCcmlkZ2VDYXZlKHVwcGVyOiBMb2NhdGlvbiwgbG93ZXI6IExvY2F0aW9uLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmRvbTogUmFuZG9tLCB7YXR0ZW1wdHMgPSAxMDB9ID0ge30pIHtcbi8vICAgLy8gVE9ETyAtIGRvZXNuJ3Qgd29yayB5ZXQuXG5cbi8vICAgLy8gUGxhbiAtIHNodWZmbGUgdGhlIGZpcnN0IG9uZSBub3JtYWxseSwgdGhlbiBmaW5kIGRpc3BsYWNlbWVudCBhbmRcbi8vICAgLy8gc2V0IHRoZSBpbml0aWFsIGRpc3BsYWNlbWVudCBmb3IgdGhlIGxvd2VyIHNjcmVlbiBhY2NvcmRpbmdseS5cbi8vICAgLy8gICAgICAtIG5lZWQgdG8gbWFyayB0aGUgY29ycmVjdCBzdGFpcnMgYXMgZml4ZWQgKGFuZCBmaXggdXAgaG93IHdlXG4vLyAgIC8vICAgICAgICBoYW5kbGUgZml4ZWQgaW4gZ2VuZXJhbCkuXG5cbi8vICAgc2h1ZmZsZUNhdmUodXBwZXIsIHJhbmRvbSwge2F0dGVtcHRzfSk7XG4vLyAgIHNodWZmbGVDYXZlKGxvd2VyLCByYW5kb20sIHthdHRlbXB0c30pO1xuLy8gfVxuXG5pbnRlcmZhY2UgU2h1ZmZsZVN0cmF0ZWd5IHtcbiAgbmV3KGxvYzogTG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKToge3NodWZmbGU6ICgpID0+IHZvaWR9O1xufVxuXG5jb25zdCBBVFRFTVBUUyA9IDEwMDtcbmNsYXNzIEJhc2ljQ2F2ZVNodWZmbGUge1xuICByZWFkb25seSBzdXJ2ZXk6IFN1cnZleTtcblxuICAvLyBUaGVzZSBhcmUgYWxsIGFzc2lnbmVkIGluIHNodWZmbGUoKSwgYmVmb3JlIHRyeVNodWZmbGUoKSBpcyBjYWxsZWQuXG4gIHchOiBudW1iZXI7XG4gIGghOiBudW1iZXI7XG4gIGRlbnNpdHkhOiBudW1iZXI7XG4gIGFsbFBvcyE6IFBvc1tdO1xuICB3YWxscyE6IG51bWJlcjtcbiAgYnJpZGdlcyE6IG51bWJlcjtcbiAgZml4ZWQhOiBTZXQ8UG9zPjtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBsb2M6IExvY2F0aW9uLCByZWFkb25seSByYW5kb206IFJhbmRvbSkge1xuICAgIHRoaXMuc3VydmV5ID0gU3BlY1NldC5DQVZFLnN1cnZleShsb2MpO1xuICB9XG5cbiAgc2h1ZmZsZSgpOiB2b2lkIHtcbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IEFUVEVNUFRTOyBhdHRlbXB0KyspIHtcbiAgICAgIGNvbnN0IHcgPSB0aGlzLncgPSBNYXRoLm1heCgxLCBNYXRoLm1pbig4LCB0aGlzLnBpY2tXaWR0aCgpKSk7XG4gICAgICBjb25zdCBoID0gdGhpcy5oID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oMTYsIHRoaXMucGlja0hlaWdodCgpKSk7XG4gICAgICB0aGlzLmFsbFBvcyA9XG4gICAgICAgICAgc2VxKHcgKiBoLCB5eCA9PiAoKHl4ICUgdykgfCBNYXRoLmZsb29yKHl4IC8gdykgPDwgNCkgYXMgUG9zKTtcbiAgICAgIHRoaXMuZGVuc2l0eSA9IHRoaXMuc3VydmV5LnNpemUgLyB3IC8gaDtcbiAgICAgIHRoaXMud2FsbHMgPSB0aGlzLnN1cnZleS53YWxscztcbiAgICAgIHRoaXMuYnJpZGdlcyA9IHRoaXMuc3VydmV5LmJyaWRnZXM7XG4gICAgICB0aGlzLmZpeGVkID0gbmV3IFNldCgpO1xuICAgICAgY29uc3QgbWF6ZSA9IG5ldyBNYXplKHRoaXMucmFuZG9tLCB0aGlzLmgsIHRoaXMudywgdGhpcy5zdXJ2ZXkuc3BlY3MpO1xuICAgICAgaWYgKHRoaXMudHJ5U2h1ZmZsZShtYXplKSkgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBzaHVmZmxlICR7aGV4KHRoaXMubG9jLmlkKX0gJHt0aGlzLmxvYy5uYW1lfWApO1xuICB9XG5cbiAgY2hlY2sobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHRyYXZlcnNlID0gbWF6ZS50cmF2ZXJzZSgpO1xuICAgIHJldHVybiB0cmF2ZXJzZS5zaXplID4gMiAmJlxuICAgICAgICB0cmF2ZXJzZS52YWx1ZXMoKS5uZXh0KCkudmFsdWUuc2l6ZSA9PT0gdHJhdmVyc2Uuc2l6ZTtcbiAgfVxuXG4gIHBpY2tXaWR0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmxvYy53aWR0aCArIE1hdGguZmxvb3IoKHRoaXMucmFuZG9tLm5leHRJbnQoNSkpIC8gMyk7XG4gICAgLy9yZXR1cm4gdGhpcy5sb2Mud2lkdGggKyBNYXRoLmZsb29yKCh0aGlzLnJhbmRvbS5uZXh0SW50KDYpIC0gMSkgLyAzKTtcbiAgfVxuXG4gIHBpY2tIZWlnaHQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5sb2MuaGVpZ2h0ICsgTWF0aC5mbG9vcigodGhpcy5yYW5kb20ubmV4dEludCg1KSkgLyAzKTtcbiAgICAvL3JldHVybiB0aGlzLmxvYy5oZWlnaHQgKyBNYXRoLmZsb29yKCh0aGlzLnJhbmRvbS5uZXh0SW50KDYpIC0gMSkgLyAzKTtcbiAgfVxuXG4gIHRyeVNodWZmbGUobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYFNodWZmbGUgJHt0aGlzLmxvYy5uYW1lfWApO1xuICAgIGlmICghdGhpcy5pbml0aWFsaXplRml4ZWRTY3JlZW5zKG1hemUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgSW5pdGlhbGl6ZWRcXG4ke21hemUuc2hvdygpfWApO1xuICAgIGlmICghdGhpcy5pbml0aWFsRmlsbE1hemUobWF6ZSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBJbml0aWFsIGZpbGxcXG4ke21hemUuc2hvdygpfWApO1xuICAgIGlmICghdGhpcy5yZWZpbmVNYXplKG1hemUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgUmVmaW5lZFxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gICAgaWYgKCF0aGlzLmFkZEZlYXR1cmVzKG1hemUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgRmVhdHVyZXNcXG4ke21hemUuc2hvdygpfWApO1xuICAgIHJldHVybiB0aGlzLmZpbmlzaChtYXplKTtcbiAgfVxuXG4gIGluaXRpYWxpemVGaXhlZFNjcmVlbnMobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgW3BvczAsIGVkZ2VdIG9mIHRoaXMuc3VydmV5LmVkZ2VzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmVkZ2VzKGVkZ2UuZGlyKSkpIHtcbiAgICAgICAgaWYgKHRoaXMuZml4ZWQuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgICB0aGlzLmZpeGVkLmFkZChwb3MpO1xuICAgICAgICBjb25zdCBmaXhlZFNjciA9IHRoaXMuc3VydmV5LmZpeGVkLmdldChwb3MwKTtcbiAgICAgICAgaWYgKGZpeGVkU2NyID09IG51bGwpIHtcbiAgICAgICAgICBtYXplLnNldEJvcmRlcihwb3MsIGVkZ2UuZGlyLCA2KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOT1RFOiBsb2NhdGlvbiAzNSAoc2FicmUgTiBzdW1taXQgcHJpc29uKSBoYXMgYSAnMScgZXhpdCBlZGdlXG4gICAgICAgICAgLy8gTk9URTogY2FuJ3QgaGFuZGxlIGVkZ2UgZXhpdHMgZm9yIDF4PyBtYXBzLlxuICAgICAgICAgIGlmICh0aGlzLmggPT09IDEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICBtYXplLnNldEJvcmRlcihwb3MsIGVkZ2UuZGlyLFxuICAgICAgICAgICAgICAgICAgICAgICAgIChmaXhlZFNjci5lZGdlcyA+Pj4gRGlyLnNoaWZ0KGVkZ2UuZGlyKSkgJiAweGYpO1xuICAgICAgICAgIGZpeEJvcmRlcnMobWF6ZSwgcG9zLCBmaXhlZFNjci5lZGdlcyk7XG4gICAgICAgICAgbWF6ZS5zZXQocG9zLCBmaXhlZFNjci5lZGdlcyk7XG4gICAgICAgICAgaWYgKGZpeGVkU2NyLndhbGwpIHRoaXMud2FsbHMtLTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtwb3MwLCBzY3JdIG9mIHRoaXMuc3VydmV5LmZpeGVkKSB7XG4gICAgICBpZiAodGhpcy5zdXJ2ZXkuZWRnZXMuaGFzKHBvczApKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuYWxsUG9zKSkge1xuICAgICAgICBpZiAodGhpcy5maXhlZC5oYXMocG9zKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IG9rID0gbWF6ZS5zYXZlRXhjdXJzaW9uKCgpID0+IHtcbiAgICAgICAgICBmaXhCb3JkZXJzKG1hemUsIHBvcywgc2NyLmVkZ2VzKTtcbiAgICAgICAgICByZXR1cm4gbWF6ZS50cnlTZXQocG9zLCBzY3IuZWRnZXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFvaykgY29udGludWU7XG4gICAgICAgIHRoaXMuZml4ZWQuYWRkKHBvcyk7XG4gICAgICAgIGlmIChzY3Iud2FsbCkgdGhpcy53YWxscy0tO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdGFpcnMgPSBbLi4udGhpcy5zdXJ2ZXkuc3RhaXJzLnZhbHVlcygpXTtcbiAgICBsZXQgdHJpZXMgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyB0cmllcyA8IDEwICYmIGkgPCBzdGFpcnMubGVuZ3RoOyB0cmllcysrKSB7XG4gICAgICBjb25zdCBwb3MgPSBtYXplLnJhbmRvbVBvcygpO1xuICAgICAgaWYgKHRoaXMuZml4ZWQuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFtYXplLmZpbGwocG9zLCB7c3RhaXI6IHN0YWlyc1tpXS5kaXJ9KSkgY29udGludWU7XG4gICAgICB0aGlzLmZpeGVkLmFkZChwb3MpO1xuICAgICAgLy8gY29uc29sZS5sb2coYEFkZGVkICR7c3RhaXJzW2ldLmRpcn0gc3RhaXIgYXQgJHtoZXgocG9zKX1gKTtcbiAgICAgIHRyaWVzID0gMDtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgaWYgKHRyaWVzID49IDEwKSByZXR1cm4gZmFpbChgY291bGQgbm90IGFkZCBhbGwgc3RhaXJzYCk7XG4gICAgLy8gZmlsbCB0aGUgZWRnZSBzY3JlZW5zIGFuZCBmaXhlZCBzY3JlZW5zIGFuZCB0aGVpciBuZWlnaGJvcnMgZmlyc3QsIHNpbmNlXG4gICAgLy8gdGhleSB0ZW5kIHRvIGhhdmUgbW9yZSBlc290ZXJpYyByZXF1aXJlbWVudHMuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpbml0aWFsRmlsbE1hemUobWF6ZTogTWF6ZSwgb3B0czogRmlsbE9wdHMgPSB7fSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZpbGxPcHRzID0ge1xuICAgICAgZWRnZTogMSxcbiAgICAgIGZ1enp5OiAxLFxuICAgICAgc2h1ZmZsZU9yZGVyOiB0cnVlLFxuICAgICAgc2tpcEFsdGVybmF0ZXM6IHRydWUsXG4gICAgICAuLi5vcHRzLFxuICAgIH07XG4gICAgaWYgKCFtYXplLmZpbGxBbGwoZmlsbE9wdHMpKSByZXR1cm4gZmFpbChgY291bGQgbm90IGZpbGwgb3BlbmAsIG1hemUpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmVmaW5lTWF6ZShtYXplOiBNYXplLCBvcHRzOiBSZWZpbmVPcHRzID0ge30pOiBib29sZWFuIHtcbiAgICAvLyBJbml0aWFsIHNldHVwOiBhZGQgcG9pbnRzIG9mIGludGVyZXN0LCB0aGVuIGZpbGwgbWFwIHdpdGggMSdzIGFzIG11Y2hcbiAgICAvLyBhcyBwb3NzaWJsZS5cbiAgICAvLyBjb25zb2xlLmxvZyhgaW5pdGlhbDpcXG4ke21hemUuc2hvdygpfWApO1xuICAgIGlmICghdGhpcy5jaGVjayhtYXplKSkgcmV0dXJuIGZhaWwoYGNoZWNrIGZhaWxlZCBhZnRlciBpbml0aWFsIHNldHVwYCwgbWF6ZSk7XG5cbiAgICBjb25zdCBlbXB0eSA9IDAgYXMgU2NyO1xuICAgIGNvbnN0IGZpbGxPcHRzID0ge3NraXBBbHRlcm5hdGVzOiB0cnVlLCAuLi4ob3B0cy5maWxsIHx8IHt9KX07XG4gICAgZm9yIChjb25zdCBbcG9zXSBvZiB0aGlzLnJhbmRvbS5zaHVmZmxlKFsuLi5tYXplXSkpIHtcbiAgICAgIGlmIChtYXplLmRlbnNpdHkoKSA8PSB0aGlzLmRlbnNpdHkpIGJyZWFrO1xuICAgICAgaWYgKCFtYXplLmlzRml4ZWQocG9zKSAmJiAhdGhpcy5maXhlZC5oYXMocG9zKSkge1xuICAgICAgICBjb25zdCBjaGFuZ2VkID1cbiAgICAgICAgICAgIG1hemUuc2F2ZUV4Y3Vyc2lvbihcbiAgICAgICAgICAgICAgICAoKSA9PiBtYXplLnNldEFuZFVwZGF0ZShwb3MsIGVtcHR5LCBmaWxsT3B0cykgJiZcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoZWNrKG1hemUpKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgUmVmaW5lbWVudCBzdGVwICR7cG9zLnRvU3RyaW5nKDE2KX0gY2hhbmdlZCAke2NoYW5nZWR9XFxuJHttYXplLnNob3coKX1gKTtcbiAgICAgICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgICB0aGlzLnBvc3RSZWZpbmUobWF6ZSwgcG9zKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKGBwZXJjb2xhdGVkOlxcbiR7bWF6ZS5zaG93KCl9YCk7XG5cbiAgICAvLyBSZW1vdmUgYW55IHRpZ2h0IGN5Y2xlc1xuICAgIHJldHVybiB0aGlzLnJlbW92ZVRpZ2h0Q3ljbGVzKG1hemUpO1xuICB9XG5cbiAgLy8gUnVucyBhZnRlciBhIHRpbGUgaXMgZGVsZXRlZCBkdXJpbmcgcmVmaW5lbWVudC4gIEZvciBvdmVycmlkZS5cbiAgcG9zdFJlZmluZShtYXplOiBNYXplLCBwb3M6IFBvcykge31cblxuICByZW1vdmVUaWdodEN5Y2xlcyhtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgZm9yIChsZXQgeSA9IDE7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDE7IHggPCB0aGlzLnc7IHgrKykge1xuICAgICAgICBjb25zdCBwb3MgPSAoeSA8PCA0IHwgeCkgYXMgUG9zO1xuICAgICAgICBpZiAoIWlzVGlnaHRDeWNsZShtYXplLCBwb3MpKSBjb250aW51ZTtcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSB0aWdodCBjeWNsZVxuICAgICAgICBsZXQgcmVwbGFjZWQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoRGlyLkFMTCkpIHtcbiAgICAgICAgICAvLyBUT0RPIC0gdGhpcyB3aWxsIG5lZWQgdG8gY2hhbmdlIGlmIHdlIGludmVydCB0aGUgZGlyZWN0aW9uIVxuICAgICAgICAgIGNvbnN0IHBvczIgPSAoZGlyIDwgMiA/IHBvcyAtIDEgOiBwb3MgLSAxNikgYXMgUG9zO1xuICAgICAgICAgIGNvbnN0IG9rID1cbiAgICAgICAgICAgICAgbWF6ZS5zYXZlRXhjdXJzaW9uKFxuICAgICAgICAgICAgICAgICAgKCkgPT4gbWF6ZS5yZXBsYWNlRWRnZShwb3MyLCBkaXIsIDApICYmIHRoaXMuY2hlY2sobWF6ZSkpO1xuICAgICAgICAgIGlmICghb2spIGNvbnRpbnVlO1xuICAgICAgICAgIHJlcGxhY2VkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJlcGxhY2VkKSByZXR1cm4gZmFpbChgZmFpbGVkIHRvIHJlbW92ZSB0aWdodCBjeWNsZWApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZEZlYXR1cmVzKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICAvLyBBZGQgc3RhaXIgaGFsbHdheXMgYW5kIHdhbGxzXG4gICAgLy8gICBUT0RPIC0gbWFrZSBzdXJlIHRoZXkncmUgb24gKmEqIGNyaXRpY2FsIHBhdGg/XG4gICAgY29uc3QgcmVwbGFjZWQgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBjb25zdCBhbHRzID0gWy4uLm1hemUuYWx0ZXJuYXRlcygpXTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgWzB4OGNdKSB7IC8vICwgMHg4ZCwgMHg4ZV0pIHtcbiAgICAgIGlmICh0aGlzLnN1cnZleS50aWxlcy5jb3VudCh0aWxlKSkge1xuICAgICAgICBjb25zdCBzdGVwcyA9IHRoaXMucmFuZG9tLnNodWZmbGUoYWx0cy5maWx0ZXIoeCA9PiB4WzNdLnRpbGUgPT09IHRpbGUpKTtcbiAgICAgICAgaWYgKHN0ZXBzLmxlbmd0aCA8IHRoaXMuc3VydmV5LnRpbGVzLmNvdW50KHRpbGUpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhaWwoYGNvdWxkIG5vdCBhZGQgc3RhaXIgaGFsbHdheWApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN1cnZleS50aWxlcy5jb3VudCh0aWxlKSAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgbWF6ZS5yZXBsYWNlKHN0ZXBzW2ldWzBdLCBzdGVwc1tpXVsyXSk7XG4gICAgICAgICAgcmVwbGFjZWQuYWRkKHN0ZXBzW2ldWzBdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgWyd3YWxsJywgJ2JyaWRnZSddKSB7XG5cbiAgICAgIC8vIFRPRE8gaHR0cDovL2xvY2FsaG9zdDo4MDgxLyNyb209b3JpZy5uZXMmaW5pdD1jcnlzdGFsaXMvZGVidWcmcGF0Y2g9Y3J5c3RhbGlzL3BhdGNoJmZsYWdzPURzRmNwcnN0d0dmSGJkZ3dNZXJ0UHNSb3Byc3RTY2t0U21UYWJtcFdtdHV3JnNlZWQ9MzEzOGUxNTFcbiAgICAgIC8vIC0gb25seSBwbGFjZWQgMSB3YWxsLCBhbHNvIG1pc3NlZCBhIGNoZXN0LCBtYXliZT8gLSBuZWVkcyB0byBlcnJvclxuICAgICAgLy8gMTUyIC0+IGNhbid0IG1ha2UgaXJvbiB3YWxscyBob3Jpem9udGFsISAtLT4gbG9vayBhdCB0aWxlc2V0ISEhXG5cbiAgICAgIGNvbnN0IHNjcmVlbnMgPVxuICAgICAgICAgIHRoaXMucmFuZG9tLnNodWZmbGUoYWx0cy5maWx0ZXIoeCA9PiB4WzNdLndhbGwgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeFszXS53YWxsLnR5cGUgPT09IHR5cGUpKTtcbiAgICAgIGNvbnN0IGNvdW50ID0gdHlwZSA9PT0gJ3dhbGwnID8gdGhpcy53YWxscyA6IHRoaXMuYnJpZGdlcztcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICBjb25zdCBzY3IgPSBzY3JlZW5zLnBvcCgpO1xuICAgICAgICBpZiAoc2NyID09IG51bGwpIHJldHVybiBmYWlsKGBjb3VsZCBub3QgYWRkICR7dHlwZX0gJHtpfWApO1xuICAgICAgICBpZiAocmVwbGFjZWQuaGFzKHNjclswXSkpIHtcbiAgICAgICAgICBpLS07XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgbWF6ZS5yZXBsYWNlKHNjclswXSwgc2NyWzJdKTtcbiAgICAgICAgcmVwbGFjZWQuYWRkKHNjclswXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvbnNvbGlkYXRlIGFzIG11Y2ggb2YgdGhpcyBhcyBwb3NzaWJsZSBpbnRvIE1hemUuXG4gIC8vICAgICAgLSBtb3ZlIGFsbCB0aGUgU0NSRUVOIGNvbnN0YW50cyBpbnRvIHRoZXJlIGFzIHdlbGxcbiAgLy8gICAgICAgIHNvIHRoYXQgd2UgY2FuIHJldXNlIHRoZW0gbW9yZSB3aWRlbHkgLSBjb25zb2xpZGF0ZVxuICAvLyAgICAgICAgZ29hIGFuZCBzd2FtcD9cbiAgZmluaXNoKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBmaW5pc2g6XFxuJHttYXplLnNob3coKX1gKTtcbiAgICByZXR1cm4gbWF6ZS5maW5pc2godGhpcy5zdXJ2ZXksIHRoaXMubG9jKTtcbiAgICAvLyBNYXAgZnJvbSBwcmlvcml0eSB0byBhcnJheSBvZiBbeSwgeF0gcGl4ZWwgY29vcmRzXG4gICAgLy8gV3JpdGUgYmFjayB0byB0aGUgbG9jYXRpb24uICBFeGl0cywgZW50cmFuY2VzLCBucGNzLCB0cmlnZ2VycyxcbiAgICAvLyBtb25zdGVycywgYW5kIGNoZXN0cyBtdXN0IGFsbCBiZSBtYXBwZWQgdG8gbmV3IGxvY2F0aW9ucy5cbiAgICAvLyB3YWxscywgTlBDcywgdHJpZ2dlcnMsIGNoZXN0cywgbW9uc3RlcnMuLi4/XG4gICAgLy8gVE9ETyAtIHJhbmRvbSB0aGluZ3MgbGlrZSB0cmlnZ2VycyAoc3VtbWl0IGNhdmUsIHplYnUgY2F2ZSksIG5wY3M/XG4gICAgLy8gVE9ETyAtIG5lZWQgdG8gYWN0dWFsbHkgZmlsbCBpbiBleGl0cywgc3RhaXJzLCBtb25zdGVycywgY2hlc3RzXG4gICAgLy8gVE9ETyAtIGV4dGVuZCBvdXQgYW55IGFkZGl0aW9uYWwgbmVlZGVkIGRlYWQtZW5kcywgZWl0aGVyXG4gICAgLy8gICAgICAgIGp1c3QgdG8gZ2V0IHRoZSByaWdodCBudW1iZXIsIG9yIHRvIGhhdmUgYSBjaGVzdFxuICB9XG5cbiAgZWRnZXMoZGlyOiBEaXIpOiBQb3NbXSB7XG4gICAgY29uc3Qgb3RoZXIgPVxuICAgICAgICBkaXIgPT09IERpci5SSUdIVCA/IHRoaXMudyAtIDEgOiBkaXIgPT09IERpci5ET1dOID8gdGhpcy5oIC0gMSA6IDA7XG4gICAgaWYgKGRpciAmIDEpIHJldHVybiBzZXEodGhpcy5oLCB5ID0+ICh5IDw8IDQgfCBvdGhlcikgYXMgUG9zKTtcbiAgICByZXR1cm4gc2VxKHRoaXMudywgeCA9PiAob3RoZXIgPDwgNCB8IHgpIGFzIFBvcyk7XG4gIH1cblxuICByYW5kb21FZGdlKGRpcjogRGlyKTogUG9zIHtcbiAgICBjb25zdCB0aWxlID0gdGhpcy5yYW5kb20ubmV4dEludChkaXIgJiAxID8gdGhpcy5oIDogdGhpcy53KTtcbiAgICBjb25zdCBvdGhlciA9XG4gICAgICAgIGRpciA9PT0gRGlyLlJJR0hUID8gdGhpcy53IC0gMSA6IGRpciA9PT0gRGlyLkRPV04gPyB0aGlzLmggLSAxIDogMDtcbiAgICByZXR1cm4gKGRpciAmIDEgPyB0aWxlIDw8IDQgfCBvdGhlciA6IG90aGVyIDw8IDQgfCB0aWxlKSBhcyBQb3M7XG4gIH1cblxuICByZXRyeShtYXplOiBNYXplLCBmOiAoKSA9PiBib29sZWFuLCB0cmllczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0cmllczsgaSsrKSB7XG4gICAgICBpZiAobWF6ZS5zYXZlRXhjdXJzaW9uKGYpKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmludGVyZmFjZSBSZWZpbmVPcHRzIHtcbiAgZmlsbD86IEZpbGxPcHRzO1xuICBsb29wPzogYm9vbGVhbjtcbn1cblxuY2xhc3MgV2lkZUNhdmVTaHVmZmxlIGV4dGVuZHMgQmFzaWNDYXZlU2h1ZmZsZSB7XG4gIGluaXRpYWxGaWxsTWF6ZShtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgLy8gSW5pdGlhbCBzdGF0ZSBzaG91bGQgYmUgc29tZSBleGl0IHNjcmVlbnMgb24gdG9wLCBhbmQgYSBzdGFpclxuICAgIC8vIHNvbWV3aGVyZSBiZW5lYXRoLiAgVGhlc2UgYXJlIGxpc3RlZCBpbiBgZml4ZWRgLiAgSXRlcmF0ZSBvdmVyXG4gICAgLy8gdGhpcyBzZXQgYW5kIGNvbm5lY3QgdGhlbSBpbiBzb21lIHdheSBvciBvdGhlci5cbiAgICBjb25zdCBwb2kgPSBbLi4udGhpcy5maXhlZF07XG4gICAgLy8gRmlyc3QgY29ubmVjdCBwb2lbMF0gdG8gcG9pWzFdLlxuICAgIGlmICghbWF6ZS5jb25uZWN0KHBvaVswXSwgbnVsbCwgcG9pWzFdLCBudWxsKSkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIENvbm5lY3QgYWxsIHJlbWFpbmluZyBwb2kgdG8gdGhlIGV4aXN0aW5nIGNoYW5uZWwuXG4gICAgZm9yIChsZXQgaSA9IDI7IGkgPCBwb2kubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghbWF6ZS5jb25uZWN0KHBvaVtpXSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZyhtYXplLnNob3coKSk7XG4gICAgbWF6ZS5maWxsQWxsKHtlZGdlOiAwfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBOb3RoaW5nIGVsc2UgdG8gZG8gYXQgdGhpcyBwb2ludC5cbiAgcmVmaW5lTWF6ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZEZlYXR1cmVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbmNsYXNzIFdhdGVyZmFsbFJpdmVyQ2F2ZVNodWZmbGUgZXh0ZW5kcyBCYXNpY0NhdmVTaHVmZmxlIHtcbiAgaW5pdGlhbGl6ZUZpeGVkU2NyZWVucyhtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2V0ID0gKHBvczogbnVtYmVyLCBzY3I6IG51bWJlcikgPT4ge1xuICAgICAgdGhpcy5maXhlZC5hZGQocG9zIGFzIFBvcyk7XG4gICAgICBtYXplLnNldChwb3MgYXMgUG9zLCBzY3IgYXMgU2NyKTtcbiAgICB9O1xuICAgIGNvbnN0IHJpdmVyID0gMSArIHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy53IC0gMik7XG4gICAgY29uc3QgbGVmdCA9IHRoaXMucmFuZG9tLm5leHRJbnQocml2ZXIpO1xuICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy53IC0gMSAtIHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy53IC0gcml2ZXIgLSAxKTtcbiAgICBjb25zdCBib3R0b20gPSAodGhpcy5oIC0gMSkgPDwgNDtcbiAgICBzZXQoYm90dG9tICsgbGVmdCwgMHgyXzAwMDEpO1xuICAgIHNldChib3R0b20gKyByaWdodCwgMHgyXzAwMDEpO1xuICAgIHNldChib3R0b20gKyByaXZlciwgMHgwXzAwMDMpO1xuICAgIHNldChyaXZlciwgMHgwXzAzMDApO1xuICAgIGNvbnN0IHJpdmVyU2NyZWVucyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAxOyB5IDwgdGhpcy5oIC0gMTsgeSArPSAyKSB7XG4gICAgICByaXZlclNjcmVlbnMucHVzaCgweDBfMTMwMyk7XG4gICAgICByaXZlclNjcmVlbnMucHVzaCgweDBfMDMxMyk7XG4gICAgfVxuICAgIHRoaXMucmFuZG9tLnNodWZmbGUocml2ZXJTY3JlZW5zKTtcbiAgICBmb3IgKGxldCB5ID0gMTsgeSA8IHRoaXMuaCAtIDE7IHkrKykge1xuICAgICAgc2V0KCh5IDw8IDQpICsgcml2ZXIsIHJpdmVyU2NyZWVucy5wb3AoKSEpO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKG1hemUuc2hvdygpKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGNoZWNrKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICBjb25zdCB0cmF2ZXJzZSA9IG1hemUudHJhdmVyc2UoKTtcbiAgICBjb25zdCBwYXJ0aXRpb25zID0gWy4uLm5ldyBTZXQodHJhdmVyc2UudmFsdWVzKCkpXS5tYXAocyA9PiBzLnNpemUpO1xuICAgIHJldHVybiBwYXJ0aXRpb25zLmxlbmd0aCA9PT0gMiAmJlxuICAgICAgcGFydGl0aW9uc1swXSArIHBhcnRpdGlvbnNbMV0gPT09IHRyYXZlcnNlLnNpemUgJiZcbiAgICAgIHBhcnRpdGlvbnNbMF0gPiAyICYmIHBhcnRpdGlvbnNbMV0gPiAyO1xuICB9XG59XG5cbmNsYXNzIEN5Y2xlQ2F2ZVNodWZmbGUgZXh0ZW5kcyBCYXNpY0NhdmVTaHVmZmxlIHtcbiAgLy8gRW5zdXJlIHRoZSBjYXZlIGhhcyBhdCBsZWFzdCBvbmUgY3ljbGUuXG4gIGNoZWNrKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICBjb25zdCBhbGxUaWxlcyA9IFsuLi5tYXplXTtcbiAgICBjb25zdCBub25Dcml0aWNhbCA9IGFsbFRpbGVzLmZpbHRlcih0ID0+IHtcbiAgICAgIGNvbnN0IHRyYXYgPSBbLi4ubWF6ZS50cmF2ZXJzZSh7d2l0aG91dDogW3RbMF1dfSldO1xuICAgICAgcmV0dXJuIHRyYXYubGVuZ3RoICYmIHRyYXZbMF1bMV0uc2l6ZSA9PT0gdHJhdi5sZW5ndGg7XG4gICAgfSk7XG4gICAgaWYgKCFub25Dcml0aWNhbC5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAvLyBmaW5kIHR3byBub25jcml0aWNhbCB0aWxlcyB0aGF0IHRvZ2V0aGVyICphcmUqIGNyaXRpY2FsXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub25Dcml0aWNhbC5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpOyBqKyspIHtcbiAgICAgICAgY29uc3QgdHJhdiA9IFsuLi5tYXplLnRyYXZlcnNlKHt3aXRob3V0OiBbbm9uQ3JpdGljYWxbaV1bMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vbkNyaXRpY2FsW2pdWzBdXX0pXTtcbiAgICAgICAgaWYgKHRyYXYubGVuZ3RoICYmIHRyYXZbMF1bMV0uc2l6ZSAhPT0gdHJhdi5sZW5ndGgpIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuY2xhc3MgVGlnaHRDeWNsZUNhdmVTaHVmZmxlIGV4dGVuZHMgQ3ljbGVDYXZlU2h1ZmZsZSB7XG4gIC8vIEp1c3QgZG9uJ3QgcmVtb3ZlIHRoZW1cbiAgcmVtb3ZlVGlnaHRDeWNsZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuY2xhc3MgUml2ZXJDYXZlU2h1ZmZsZSBleHRlbmRzIEJhc2ljQ2F2ZVNodWZmbGUge1xuXG4gIC8vIFNldHRpbmcgdXAgYSB2aWFibGUgcml2aWVyIGlzIHJlYWxseSBoYXJkLlxuICAvLyBQb3NzaWJsZSBpZGVhczpcbiAgLy8gIDEuIHN0YXJ0IHdpdGggZnVsbCByaXZlciBjb3ZlcmFnZSwgYW5uZWFsIGF3YXkgdGlsZXMgdW50aWwgd2UgZ2V0IHRoZVxuICAvLyAgICAgY29ycmVjdCByaXZlciBkZW5zaXR5LCB0aGVuIGRvIGxhbmQgdGlsZXMgdGhlIHNhbWUgd2F5XG4gIC8vICAgICAtIGlzc3VlOiB3ZSBkb24ndCBnZXQgZW5vdWdoIHN0cmFpZ2h0IHRpbGVzIHRoYXQgd2F5XG4gIC8vICAyLiB1c2UgbGluZXM/ICBzdGFydCB3LyBmdWxsIHZlcnRpY2FsIGxpbmUgcml2ZXJzLCBkaXNjb25uZWN0ZWRcbiAgLy8gICAgIHRoZW4gYWRkIHJhbmRvbSBob3Jpem9udGFsIHNlZ21lbnRzLCBkaXNjYXJkaW5nIHJpdmVycyBhYm92ZS9iZWxvd1xuICAvLyAgICAgYXMgbmVjZXNzYXJ5IChzaG9ydGVyIGRpcmVjdGlvbilcbiAgLy8gIDMuIGZpbGwgaW4gYWxsIGJyaWRnZXMgYXQgdGhlIHN0YXJ0LCB0aGVuIHJhbmRvbWx5IHJlbW92ZSBicmlkZ2VzXG4gIC8vICAgICBvciBhZGQgb3V0Y3JvcHBpbmdzP1xuICAvLyAgNC4gYS4gZHJhdyBhbiBpbml0aWFsIHBhdGggZnJvbSBsZWZ0IHRvIHJpZ2h0XG4gIC8vICAgICBiLiBhZGQgYWRkaXRpb25hbCBwYXRocyBmcm9tIHRoZXJlXG4gIC8vICAgICBjLiAxLzQgb3Igc28gY2hhbmNlIG9mIHR1cm5pbmcgYSBwYXRoIHRvIGhlbHAgZW5jb3VyYWdlIHN0cmFpZ2h0XG4gIC8vICAgICAgICBzZWdtZW50c1xuICAvLyAgICAgZC4gc3B1cnMgY2FuIGNvbWUgb3V0IG9mIHRvcC9ib3R0b20gb2YgYSBzdHJhaWdodCBvciBkZWFkIGVuZFxuICAvLyAgICAgZS4gMS81IGNoYW5jZSBvZiBlbmRpbmcgYSBwYXRoPyAgb3IgaXQgcnVucyBpbnRvIHNvbWV0aGluZy4uLj9cbiAgLy8gICAgIGYuIHBhdGhzIGNhbiBjb21lIGFueSBkaXJlY3Rpb24gb3V0IG9mIGEgZGVhZCBlbmRcbiAgLy8gICAgIGcuIHN0YXJ0IHcvIGFsbCBicmlkZ2VzLCByZW1vdmUgcmFuZG9tbHk/XG5cbiAgbGFuZFBhcnRpdGlvbnMhOiBBcnJheTxTZXQ8UG9zPj47XG4gIHJpdmVyITogU2V0PFBvcz47XG5cbiAgYWRkQnJpZGdlID0gbmV3IE1hcChbWzB4MF8zMDMwLCAweDFfMzAzMF0sXG4gICAgICAgICAgICAgICAgICAgICAgIFsweDBfMDMwMywgMHgxXzAzMDNdLFxuICAgICAgICAgICAgICAgICAgICAgICBbMHgwXzAwMDMsIDB4MV8wMDAzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgWzB4MF8wMzAwLCAweDFfMDMwMF1dKTtcblxuICByZW1vdmVCcmlkZ2UgPSBuZXcgTWFwKFtcbiAgICBbMHgxXzMwMzAsIFswLCA4XV0sXG4gICAgLy8gR2l2ZSBleHRyYSB3ZWlnaHQgdG8gYWRkaW5nIGFuIG91dGNyb3BwaW5nXG4gICAgWzB4MV8wMzAzLCBbMCwgMiwgMiwgMiwgNCwgNCwgNCwgOF1dLFxuICAgIFsweDFfMDAwMywgWzBdXSxcbiAgICBbMHgxXzAzMDAsIFswXV0sXG4gIF0pO1xuXG4gIHN0YWlyU2NyZWVucyA9IG5ldyBNYXA8RGlyLCByZWFkb25seSBTY3JbXT4oW1xuICAgIFtEaXIuRE9XTiwgWzB4Ml8xMDAwLCAweDJfMDAxMCwgMHgyXzAwMDFdIGFzIFNjcltdXSxcbiAgICBbRGlyLlVQLCBbMHgyXzEwMTAsIDB4MV8xMDAwLCAweDFfMDAxMCwgMHgyXzAxMDBdIGFzIFNjcltdXSxcbiAgXSk7XG5cbiAgLy8gbm90Y2g6IDBfMDMwMyAtPiAyXyBvciA0X1xuICByaXZlclBhdGhBbHRlcm5hdGl2ZXMgPSBuZXcgTWFwKFtbMHgwMzAzIGFzIFNjciwgWzFdXSwgWzB4MzAzMCBhcyBTY3IsIFsxXV1dKTtcbiAgaW5pdGlhbFJpdmVyQWxsb3dlZCA9IFsweDFfMDMwMywgMHgxXzMwMzAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgMHgwMDMzLCAweDAzMzAsIDB4MzMwMCwgMHgzMDAzXSBhcyBTY3JbXTtcbiAgcml2ZXJMb29wQWxsb3dlZCA9IFsweDFfMDMwMywgMHgxXzMwMzAsIDB4MV8wMzAzLCAweDFfMzAzMCxcbiAgICAgICAgICAgICAgICAgICAgICAweDhfMDMwMywgMHg4XzMwMzAsIC8vIGFsc28gYWxsb3cgXCJicm9rZW5cIiBwYXRocz9cbiAgICAgICAgICAgICAgICAgICAgICAweDAwMzMsIDB4MDMzMCwgMHgzMzAwLCAweDMwMDMsXG4gICAgICAgICAgICAgICAgICAgICAgMHgzMDMzLCAweDMzMzAsIDB4MzMzM10gYXMgU2NyW107XG5cbiAgLy8gVE9ETyAtIGNhbiB0aGlzIGJlIHVzZWQgZm9yIHdhdGVyZmFsbCBjYXZlICh3aXRoIGEgc2xpZ2h0IHR3ZWFrIHNpbmNlIHRoZXJlXG4gIC8vIGFyZSBubyBicmlkZ2VzPyAtIGRldGVjdCB0aGlzIGNhc2UgYW5kIGFsbG93IGl0PylcbiAgdHJ5U2h1ZmZsZShtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgdGhpcy5sYW5kUGFydGl0aW9ucyA9IFtdO1xuICAgIHRoaXMucml2ZXIgPSBuZXcgU2V0KCk7XG5cbiAgICAvLyBpZiAoIXRoaXMucmV0cnkobWF6ZSwgKCkgPT4gdGhpcy5pbml0aWFsaXplRml4ZWRTY3JlZW5zKG1hemUpLCA1KSkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIGlmIChERUJVRykgY29uc29sZS5sb2coYEluaXRpYWxpemUgZml4ZWQ6XFxuJHttYXplLnNob3coKX1gKTtcblxuICAgIC8vIEkuIHNlbmQgYSByaXZlciBhbGwgdGhlIHdheSBhY3Jvc3MgdGhlIG1hcC5cbiAgICBpZiAoIXRoaXMucmV0cnkobWF6ZSwgKCkgPT4gdGhpcy5tYWtlSW5pdGlhbFJpdmVyKG1hemUpLCA1KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYEluaXRpYWwgcml2ZXI6XFxuJHttYXplLnNob3coKX1gKTtcbiAgICAvLyBJSS4gbWFrZSBpdCBhIGJpdCBtb3JlIGludGVyZXN0aW5nIHdpdGggc29tZSBicmFuY2hlcyBhbmQgbG9vcHMuXG4gICAgaWYgKCF0aGlzLnJldHJ5KG1hemUsICgpID0+IHRoaXMuYnJhbmNoUml2ZXIobWF6ZSksIDUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgQnJhbmNoZWQgcml2ZXI6XFxuJHttYXplLnNob3coKX1gKTtcbiAgICAvLyBJSUkuIGFkZCBjb25uZWN0aW9ucyB0byBsYW5kIGFuZCBmaWxsIHRoZSByZW1haW5kZXIgb2YgdGhlIG1hcCB3aXRoIGxhbmQuXG4gICAgLy8gTWFrZSBzdXJlIGV2ZXJ5dGhpbmcgaXMgc3RpbGwgYWNjZXNzaWJsZS4gIENvbnNpZGVyIGRlbGV0aW5nIGFueSB0d28tdGlsZVxuICAgIC8vIHNlZ21lbnRzIHRoYXQgYXJlIG90aGVyd2lzZSBpbmFjY2Vzc2libGUuXG4gICAgaWYgKCF0aGlzLnJldHJ5KG1hemUsICgpID0+IHRoaXMuY29ubmVjdExhbmQobWF6ZSksIDMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgQ29ubmVjdGVkIGxhbmQ6XFxuJHttYXplLnNob3coKX1gKTtcbiAgICAvLyBJVi4gZG8gc29tZSBjaGVja3MgdG8gbWFrZSBzdXJlIHRoZSBlbnRpcmUgbWFwIGlzIGFjY2Vzc2libGUuXG4gICAgLy8gVGhlbiByZW1vdmUgYnJpZGdlcyBhbmQgYWRkIGJsb2NrYWdlcyB0byByZWR1Y2UgdG8gYSBtaW5pbXVtIGFjY2Vzc2liaWxpdHkuXG4gICAgLy8gRW5zdXJlIHdlIGhhdmUgZmV3ZXIgdGhhbiB0aGUgdG90YWwgYXZhaWxhYmxlIG51bWJlciBvZiBicmlkZ2VzIGxlZnQuXG4gICAgaWYgKCF0aGlzLnJldHJ5KG1hemUsICgpID0+IHRoaXMucmVtb3ZlQnJpZGdlcyhtYXplKSwgNSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBSZW1vdmVkIGJyaWRnZXM6XFxuJHttYXplLnNob3codHJ1ZSl9YCk7XG4gICAgLy8gVi4gRGlzdHJpYnV0ZSBzdGFpcnMgYWNyb3NzIG11bHRpcGxlIHBhcnRpdGlvbnMuXG4gICAgaWYgKCF0aGlzLnJldHJ5KG1hemUsICgpID0+IHRoaXMuYWRkU3RhaXJzKG1hemUpLCAzKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYEFkZGVkIHN0YWlyczpcXG4ke21hemUuc2hvdygpfWApO1xuICAgIC8vIFZJLiBwZXJmb3JtIHRoZSBub3JtYWwgcGVyY29sYXRpb24gb24ganVzdCB0aGUgbGFuZCB0aWxlcy5cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJpdmVyKSB0aGlzLmZpeGVkLmFkZChwb3MpO1xuICAgIGlmICghdGhpcy5yZWZpbmVNYXplKG1hemUpKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5yaXZlcikgdGhpcy5maXhlZC5kZWxldGUocG9zKTtcbiAgICB0aGlzLmJyaWRnZXMgPSAwO1xuICAgIGlmICghdGhpcy5hZGRGZWF0dXJlcyhtYXplKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYEZlYXR1cmVzXFxuJHttYXplLnNob3coKX1cXG4ke21hemUuc2hvdyh0cnVlKX1gKTtcbiAgICBtYXplLmZpbGxBbGwoe2VkZ2U6IDB9KTtcbiAgICByZXR1cm4gdGhpcy5maW5pc2gobWF6ZSk7XG4gIH1cblxuICBtYWtlSW5pdGlhbFJpdmVyKG1hemU6IE1hemUpOiBib29sZWFuIHtcbiAgICBjb25zdCBsZWZ0WSA9IHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy5oIC0gMikgKyAxO1xuICAgIGNvbnN0IGxlZnRTY3IgPSAobGVmdFkgPCB0aGlzLmggLyAyID8gMHgxXzAzMDAgOiAweDFfMDAwMykgYXMgU2NyO1xuICAgIGNvbnN0IHJpZ2h0WSA9IHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy5oIC0gMikgKyAxO1xuICAgIGNvbnN0IHJpZ2h0U2NyID0gKHJpZ2h0WSA8IHRoaXMuaCAvIDIgPyAweDFfMDMwMCA6IDB4MV8wMDAzKSBhcyBTY3I7XG4gICAgY29uc3QgbGVmdCA9IChsZWZ0WSA8PCA0KSBhcyBQb3M7XG4gICAgY29uc3QgcmlnaHQgPSAocmlnaHRZIDw8IDQgfCAodGhpcy53IC0gMSkpIGFzIFBvcztcbiAgICBtYXplLnNldChsZWZ0LCBsZWZ0U2NyKTtcbiAgICBtYXplLnNldChyaWdodCwgcmlnaHRTY3IpO1xuICAgIGlmICghbWF6ZS5jb25uZWN0KGxlZnQsIG51bGwsIHJpZ2h0LCBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgIHthbGxvd2VkOiB0aGlzLmluaXRpYWxSaXZlckFsbG93ZWQsXG4gICAgICAgICAgICAgICAgICAgICAgIHBhdGhBbHRlcm5hdGl2ZXM6IHRoaXMucml2ZXJQYXRoQWx0ZXJuYXRpdmVzfSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBicmFuY2hSaXZlcihtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgLy8gVE9ETyAtIHVzZSBzdXJ2ZXkgYW5kIGRlbnNpdHkgdG8gZ2V0IGEgc2Vuc2Ugb2Ygd2hlbiB0byBzdG9wP1xuICAgIC8vIEhvdyB0byBrbm93IGhvdyBtYW55IGxvb3BzIHRvIGFkZD9cbiAgICBjb25zdCB0YXJnZXREZW5zaXR5ID0gdGhpcy5zdXJ2ZXkucml2ZXJzIC8gdGhpcy53IC8gdGhpcy5oO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTAgJiYgbWF6ZS5kZW5zaXR5KCkgPCB0YXJnZXREZW5zaXR5OyBpKyspIHtcbiAgICAgIC8vIFRPRE8gLSBhZGQgc3B1cnMgaW4gYWRkaXRpb24gdG8gbG9vcHMuLi5cbiAgICAgIGlmIChtYXplLmFkZExvb3Aoe2FsbG93ZWQ6IHRoaXMucml2ZXJMb29wQWxsb3dlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGhBbHRlcm5hdGl2ZXM6IHRoaXMucml2ZXJQYXRoQWx0ZXJuYXRpdmVzfSkpIHtcbiAgICAgICAgaSA9IDA7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKSB7XG4gICAgICBpZiAobWF6ZS5nZXQocG9zKSkgdGhpcy5yaXZlci5hZGQocG9zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjb25uZWN0TGFuZChtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgLy8gQWRkIGEgYnVuY2ggb2YgbGFuZCB0aWxlcywgdGhlbiB0cnkgdG8gYWRkIGNvbm5lY3Rpb25zIHRvIGVhY2gsIG9yIGVsc2VcbiAgICAvLyByZW1vdmUgdGhlIGNvbm5lY3RlZCBzZWdtZW50cy5cbiAgICBpZiAoIXRoaXMuaW5pdGlhbEZpbGxNYXplKG1hemUpKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXQgdGhpcyBwb2ludCBldmVyeXRoaW5nIGlzIGRpc2Nvbm5lY3RlZC4gIEZvciBlYWNoIHBhcnRpdGlvbiwgbG9vayBmb3JcbiAgICAvLyBhIHN1aXRhYmxlIGNvbm5lY3Rpb24gcG9pbnQuXG4gICAgY29uc3QgdHJhdmVyc2FsID0gbWF6ZS50cmF2ZXJzZSgpO1xuICAgIGNvbnN0IHBhcnRpdGlvbnMgPSBbLi4ubmV3IFNldCh0cmF2ZXJzYWwudmFsdWVzKCkpXTtcbiAgICBORVhUX1BBUlRJVElPTjpcbiAgICBmb3IgKGNvbnN0IHBhcnRpdGlvbiBvZiBwYXJ0aXRpb25zKSB7XG4gICAgICBjb25zdCBwb3NpdGlvbnMgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICAgIGZvciAoY29uc3Qgc3BvdCBvZiBwYXJ0aXRpb24pIHtcbiAgICAgICAgY29uc3QgcG9zID0gKHNwb3QgPj4gOCkgYXMgUG9zO1xuICAgICAgICAvLyBTa2lwIHRoZSB3YXRlciBwYXJ0aXRpb24uXG4gICAgICAgIGlmICh0aGlzLnJpdmVyLmhhcyhwb3MpKSBjb250aW51ZSBORVhUX1BBUlRJVElPTjtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIGFkZCBzdHVmZi5cbiAgICAgICAgcG9zaXRpb25zLmFkZChwb3MpO1xuICAgICAgICBpZiAoIShzcG90ICYgMHgwZikpIHsgLy8gZS5nLiAyMzEwIC0gb24gdGhlIGxlZnQgZWRnZSAtPiBzbyAoMiwzKSBhbmQgKDIsMilcbiAgICAgICAgICBwb3NpdGlvbnMuYWRkKChwb3MgLSAxKSBhcyBQb3MpO1xuICAgICAgICB9IGVsc2UgaWYgKCEoc3BvdCAmIDB4ZjApKSB7XG4gICAgICAgICAgcG9zaXRpb25zLmFkZCgocG9zIC0gMTYpIGFzIFBvcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMubGFuZFBhcnRpdGlvbnMucHVzaChwb3NpdGlvbnMpO1xuICAgICAgLy8gV2Ugbm93IGhhdmUgdGhlIHNldCBvZiBhbGwgcG9zIGluIHRoaXMgcGFydGl0aW9uLiAgRmluZCBhIG5laWdoYm9yIHRoYXQnc1xuICAgICAgLy8gd2F0ZXIgYW5kIHRyeSB0byBjb25uZWN0LlxuICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbLi4ucG9zaXRpb25zXSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgRGlyLkFMTCkge1xuICAgICAgICAgIGNvbnN0IHBvczEgPSBQb3MucGx1cyhwb3MsIGRpcik7XG4gICAgICAgICAgY29uc3Qgcml2ZXIgPSBtYXplLmdldChwb3MxKSEgJiAweGZmZmY7XG4gICAgICAgICAgaWYgKHJpdmVyICE9PSAoZGlyICYgMSA/IDB4MDMwMyA6IDB4MzAzMCkpIGNvbnRpbnVlO1xuICAgICAgICAgIC8vY29uc3Qgcml2ZXJBZGogPSAxIDw8ICgoZGlyIF4gMikgPDwgMik7XG4gICAgICAgICAgY29uc3QgbGFuZEFkaiA9IDEgPDwgKGRpciA8PCAyKTtcbiAgICAgICAgICAvL21hemUuc2V0QW5kVXBkYXRlKHBvczEsIChyaXZlciB8IHJpdmVyQWRqKSBhcyBTY3IsIHtmb3JjZTogdHJ1ZX0pO1xuICAgICAgICAgIG1hemUuc2V0QW5kVXBkYXRlKHBvcywgKG1hemUuZ2V0KHBvcykhIHwgbGFuZEFkaikgYXMgU2NyLCB7cmVwbGFjZTogdHJ1ZX0pO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodGhpcy5yYW5kb20ubmV4dEludCgyKSkgYnJlYWs7IC8vIG1heWJlIGFkZCBhbm90aGVyIGNvbm5lY3Rpb24/XG4gICAgICAgICAgY29udGludWUgTkVYVF9QQVJUSVRJT047XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEZhaWxlZCB0byBjb25uZWN0LiAgSWYgaXQncyB0aW55ICgyIG9yIGxlc3MpIHRoZW4gZGVsZXRlLCBlbHNlIGZhaWwuXG4gICAgICBpZiAoZm91bmQpIGNvbnRpbnVlIE5FWFRfUEFSVElUSU9OO1xuICAgICAgaWYgKHBvc2l0aW9ucy5zaXplID4gMikgcmV0dXJuIGZhbHNlO1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgcG9zaXRpb25zKSB7XG4gICAgICAgIG1hemUuZGVsZXRlKHBvcyk7XG4gICAgICAgIHRoaXMubGFuZFBhcnRpdGlvbnMucG9wKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNoZWNrKG1hemUpO1xuICB9XG5cbiAgcmVtb3ZlQnJpZGdlcyhtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgLy8gQmFzaWMgcGxhbjogdGFrZSBvdXQgYXMgbWFueSBicmlkZ2VzIGFzIHdlIGNhbiB1bnRpbCB0aGUgbWFwIGlzIG5vIGxvbmdlclxuICAgIC8vIHRyYXZlcnNpYmxlLlxuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFsuLi50aGlzLnJpdmVyXSkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1hemUuZ2V0KHBvcyk7XG4gICAgICBpZiAoc2NyID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgZXhwZWN0ZWQgYSBzY3JlZW4gYXQgJHtoZXgocG9zKX1gKTtcbiAgICAgIGZvciAoY29uc3Qgb3B0IG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMucmVtb3ZlQnJpZGdlLmdldChzY3IpIHx8IFtdKSkge1xuICAgICAgICBjb25zdCBzdWNjZXNzID0gbWF6ZS5zYXZlRXhjdXJzaW9uKCgpID0+IHtcbiAgICAgICAgICBtYXplLnJlcGxhY2UocG9zLCAoc2NyICYgMHhmZmZmIHwgb3B0IDw8IDE2KSBhcyBTY3IpO1xuICAgICAgICAgIHJldHVybiB0aGlzLmNoZWNrKG1hemUpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHN1Y2Nlc3MpIGJyZWFrOyAvLyBkb24ndCB0cnkgYW55IG90aGVyIG9wdGlvbnNcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ291bnQgYnJpZGdlcywgbWFrZSBzdXJlIHdlIGRvbid0IHN0aWxsIGhhdmUgdG9vIG1hbnkhXG4gICAgY29uc3QgYnJpZGdlcyA9IGl0ZXJzLmNvdW50KGl0ZXJzLmZpbHRlcih0aGlzLnJpdmVyLCBwb3MgPT4ge1xuICAgICAgY29uc3Qgd2FsbCA9IG1hemUuZ2V0U3BlYyhwb3MpIS53YWxsO1xuICAgICAgcmV0dXJuIHdhbGwgPyB3YWxsLnR5cGUgPT09ICdicmlkZ2UnIDogZmFsc2U7XG4gICAgfSkpO1xuICAgIHJldHVybiBicmlkZ2VzIDw9IHRoaXMuc3VydmV5LmJyaWRnZXM7XG4gIH1cblxuICBhZGRTdGFpcnMobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIC8vIEZpcnN0IG1ha2Ugc3VyZSB0aGVyZSdzIG5vIGVkZ2VzLlxuICAgIGlmICh0aGlzLnN1cnZleS5lZGdlcy5zaXplKSB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgZWRnZTogJHt0aGlzLnN1cnZleS5lZGdlc31gKTtcbiAgICAvLyBBZGQgYW55IGZpeGVkIHNjcmVlbnMuXG4gICAgT1VURVI6XG4gICAgZm9yIChjb25zdCBzcGVjIG9mIHRoaXMuc3VydmV5LmZpeGVkLnZhbHVlcygpKSB7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmFsbFBvcykpIHtcbiAgICAgICAgaWYgKHRoaXMuZml4ZWQuaGFzKHBvcykgfHwgdGhpcy5yaXZlci5oYXMocG9zKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IG9rID0gbWF6ZS5zYXZlRXhjdXJzaW9uKCgpID0+IHtcbiAgICAgICAgICBjb25zdCBvcHRzID0ge3JlcGxhY2U6IHRydWUsIHNraXBBbHRlcm5hdGVzOiB0cnVlfTtcbiAgICAgICAgICByZXR1cm4gbWF6ZS5zZXRBbmRVcGRhdGUocG9zLCBzcGVjLmVkZ2VzLCBvcHRzKSAmJiB0aGlzLmNoZWNrKG1hemUpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFvaykgY29udGludWU7XG4gICAgICAgIHRoaXMuZml4ZWQuYWRkKHBvcyk7XG4gICAgICAgIGNvbnRpbnVlIE9VVEVSO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhaWwoYENvdWxkIG5vdCBwbGFjZSBmaXhlZCBzY3JlZW4gJHtoZXgoc3BlYy5lZGdlcyl9YCk7XG4gICAgfVxuICAgIC8vIFRPRE8gLSBBbHNvIGFkZCBhbnkgb3RoZXIgZml4ZWQgc2NyZWVucy4uLj9cbiAgICAvLyBOT1RFIC0gd2lsbCBuZWVkIHRvIGNsZWFyIG91dCBzb21lIHNwYWNlIGZvciAkOTEgLSAweDBfNzE3NlxuICAgIC8vICAgICAgLSBtaWdodCBiZSB0cmlja3kuLi4/ICBtYXliZSBzaG91bGQgZG8gdGhhdCBmaXJzdD9cblxuICAgIGNvbnN0IHBvc1RvUGFydGl0aW9uID0gbmV3IE1hcDxQb3MsIFNldDxQb3M+PigpO1xuICAgIGZvciAoY29uc3QgcGFydGl0aW9uIG9mIHRoaXMubGFuZFBhcnRpdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIHBhcnRpdGlvbikge1xuICAgICAgICBwb3NUb1BhcnRpdGlvbi5zZXQocG9zLCBwYXJ0aXRpb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5vdyB0cnkgdG8gcGljayBzcG90cyBmb3Igc3RhaXJzLlxuICAgIGNvbnN0IHN0YWlycyA9IFsuLi50aGlzLnN1cnZleS5zdGFpcnNdO1xuICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PFNldDxQb3M+PigpO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFsuLi5wb3NUb1BhcnRpdGlvbi5rZXlzKCldKSkge1xuICAgICAgaWYgKCFzdGFpcnMubGVuZ3RoKSBicmVhaztcbiAgICAgIGNvbnN0IHBhcnRpdGlvbiA9IHBvc1RvUGFydGl0aW9uLmdldChwb3MpITtcbiAgICAgIGlmIChzZWVuLmhhcyhwYXJ0aXRpb24pKSBjb250aW51ZTtcbiAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3Qgc3RhaXJTY3Igb2YgdGhpcy5zdGFpclNjcmVlbnMuZ2V0KHN0YWlyc1swXVsxXS5kaXIpISkge1xuICAgICAgICBjb25zdCBvayA9IG1hemUuc2F2ZUV4Y3Vyc2lvbigoKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyAtIHdoYXQgYXJlIGFsbCB0aGUgZWxpZ2libGUgc3RhaXJzIGZvciB0aGUgZ2l2ZW4gc3BlYz8hP1xuICAgICAgICAgIGNvbnN0IG9wdHMgPSB7cmVwbGFjZTogdHJ1ZSwgc2tpcEFsdGVybmF0ZXM6IHRydWV9O1xuICAgICAgICAgIHJldHVybiBtYXplLnNldEFuZFVwZGF0ZShwb3MsIHN0YWlyU2NyLCBvcHRzKSAmJiB0aGlzLmNoZWNrKG1hemUpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFvaykgY29udGludWU7XG4gICAgICAgIHN0YWlycy5zaGlmdCgpITtcbiAgICAgICAgdGhpcy5maXhlZC5hZGQocG9zKTtcbiAgICAgICAgc2Vlbi5hZGQocGFydGl0aW9uKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTkVYVF9QQVJUSVRJT046XG4gICAgLy8gZm9yIChjb25zdCBwYXJ0aXRpb24gb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5sYW5kUGFydGl0aW9ucykpIHtcbiAgICAvLyAgIGlmICghc3RhaXJzLmxlbmd0aCkgYnJlYWs7XG4gICAgLy8gICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbLi4ucGFydGl0aW9uXSkpIHtcbiAgICAvLyAgICAgaWYgKHRoaXMuZml4ZWQuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgIC8vICAgICBmb3IgKGNvbnN0IHN0YWlyU2NyIG9mIHRoaXMuc3RhaXJTY3JlZW5zLmdldChzdGFpcnNbMF1bMV0uZGlyKSEpIHtcbiAgICAvLyAgICAgICBjb25zdCBvayA9IG1hemUuc2F2ZUV4Y3Vyc2lvbigoKSA9PiB7XG4gICAgLy8gICAgICAgICAvLyBUT0RPIC0gd2hhdCBhcmUgYWxsIHRoZSBlbGlnaWJsZSBzdGFpcnMgZm9yIHRoZSBnaXZlbiBzcGVjPyE/XG4gICAgLy8gICAgICAgICBjb25zdCBvcHRzID0ge3JlcGxhY2U6IHRydWUsIHNraXBBbHRlcm5hdGVzOiB0cnVlfTtcbiAgICAvLyAgICAgICAgIHJldHVybiBtYXplLnNldEFuZFVwZGF0ZShwb3MsIHN0YWlyU2NyLCBvcHRzKSAmJiB0aGlzLmNoZWNrKG1hemUpO1xuICAgIC8vICAgICAgIH0pO1xuICAgIC8vICAgICAgIGlmICghb2spIGNvbnRpbnVlO1xuICAgIC8vICAgICAgIHN0YWlycy5zaGlmdCgpITtcbiAgICAvLyAgICAgICB0aGlzLmZpeGVkLmFkZChwb3MpO1xuICAgIC8vICAgICAgIGNvbnRpbnVlIE5FWFRfUEFSVElUSU9OO1xuICAgIC8vICAgICB9XG4gICAgLy8gICB9XG4gICAgLy8gfVxuXG4gICAgaWYgKHN0YWlycy5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5jbGFzcyBFdmlsU3Bpcml0Uml2ZXJDYXZlU2h1ZmZsZV9vbGQgZXh0ZW5kcyBCYXNpY0NhdmVTaHVmZmxlIHtcblxuICAvLyBTZXR0aW5nIHVwIGEgdmlhYmxlIHJpdmllciBpcyByZWFsbHkgaGFyZC5cbiAgLy8gUG9zc2libGUgaWRlYXM6XG4gIC8vICAxLiBzdGFydCB3aXRoIGZ1bGwgcml2ZXIgY292ZXJhZ2UsIGFubmVhbCBhd2F5IHRpbGVzIHVudGlsIHdlIGdldCB0aGVcbiAgLy8gICAgIGNvcnJlY3Qgcml2ZXIgZGVuc2l0eSwgdGhlbiBkbyBsYW5kIHRpbGVzIHRoZSBzYW1lIHdheVxuICAvLyAgICAgLSBpc3N1ZTogd2UgZG9uJ3QgZ2V0IGVub3VnaCBzdHJhaWdodCB0aWxlcyB0aGF0IHdheVxuICAvLyAgMi4gdXNlIGxpbmVzPyAgc3RhcnQgdy8gZnVsbCB2ZXJ0aWNhbCBsaW5lIHJpdmVycywgZGlzY29ubmVjdGVkXG4gIC8vICAgICB0aGVuIGFkZCByYW5kb20gaG9yaXpvbnRhbCBzZWdtZW50cywgZGlzY2FyZGluZyByaXZlcnMgYWJvdmUvYmVsb3dcbiAgLy8gICAgIGFzIG5lY2Vzc2FyeSAoc2hvcnRlciBkaXJlY3Rpb24pXG4gIC8vICAzLiBmaWxsIGluIGFsbCBicmlkZ2VzIGF0IHRoZSBzdGFydCwgdGhlbiByYW5kb21seSByZW1vdmUgYnJpZGdlc1xuICAvLyAgICAgb3IgYWRkIG91dGNyb3BwaW5ncz9cbiAgLy8gIDQuIGEuIGRyYXcgYW4gaW5pdGlhbCBwYXRoIGZyb20gbGVmdCB0byByaWdodFxuICAvLyAgICAgYi4gYWRkIGFkZGl0aW9uYWwgcGF0aHMgZnJvbSB0aGVyZVxuICAvLyAgICAgYy4gMS80IG9yIHNvIGNoYW5jZSBvZiB0dXJuaW5nIGEgcGF0aCB0byBoZWxwIGVuY291cmFnZSBzdHJhaWdodFxuICAvLyAgICAgICAgc2VnbWVudHNcbiAgLy8gICAgIGQuIHNwdXJzIGNhbiBjb21lIG91dCBvZiB0b3AvYm90dG9tIG9mIGEgc3RyYWlnaHQgb3IgZGVhZCBlbmRcbiAgLy8gICAgIGUuIDEvNSBjaGFuY2Ugb2YgZW5kaW5nIGEgcGF0aD8gIG9yIGl0IHJ1bnMgaW50byBzb21ldGhpbmcuLi4/XG4gIC8vICAgICBmLiBwYXRocyBjYW4gY29tZSBhbnkgZGlyZWN0aW9uIG91dCBvZiBhIGRlYWQgZW5kXG4gIC8vICAgICBnLiBzdGFydCB3LyBhbGwgYnJpZGdlcywgcmVtb3ZlIHJhbmRvbWx5P1xuXG5cbiAgcGhhc2UhOiAncml2ZXInIHwgJ2NhdmUnO1xuICBmaXhlZFJpdmVyITogU2V0PFBvcz47XG5cbiAgZ29vZFNjcnMgPSBuZXcgU2V0KFsweDAwMDMsIDB4MDAzMCwgMHgwMzAwLCAweDMwMDAsXG4gICAgICAgICAgICAgICAgICAgICAgMHgwMDMzLCAweDAzMDMsIDB4MzAwMywgMHgwMzMwLCAweDMwMzAsIDB4MzMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAweDMwMzMsIDB4MzMzMCwgMHgzMzMzXSkgYXMgU2V0PFNjcj47XG4gIGJhZFNjcnMgPSBuZXcgU2V0KFsweDMzMDMsIDB4MDMwM10pIGFzIFNldDxTY3I+O1xuXG4gIGluaXRpYWxpemVGaXhlZFNjcmVlbnMobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIC8vIEJhc2ljIHBsYW46IGRvIHR3byBmdWxsIHJvdW5kcyBvZiBzaHVmZmxlLlxuICAgIC8vIEZpcnN0IHJvdW5kIGlzIGxvdy1kZW5zaXR5IGp1c3QgZm9yIHJpdmVyIHRpbGVzLlxuICAgIHRoaXMuZGVuc2l0eSA9IHRoaXMuc3VydmV5LnJpdmVycyAvIHRoaXMudyAvIHRoaXMuaDtcbiAgICB0aGlzLnBoYXNlID0gJ3JpdmVyJztcbiAgICB0aGlzLmZpeGVkUml2ZXIgPSBuZXcgU2V0KCk7XG5cbiAgICAvLyBUaGlzIGlzIGNvcGllZCBmcm9tIGluaXRpYWxGaWxsTWF6ZVxuXG4gICAgaWYgKCF0aGlzLmluaXRpYWxpemVSaXZlcihtYXplKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gaWYgKCFzdXBlci5pbml0aWFsRmlsbE1hemUobWF6ZSwge1xuICAgIC8vICAgZWRnZTogMyxcbiAgICAvLyAgIHByaW50OiB0cnVlLFxuICAgIC8vICAgZnV6enk6IG9wdHMgPT4ge1xuICAgIC8vICAgICByZXR1cm4ge1xuICAgIC8vICAgICAgIC4uLm9wdHMsXG4gICAgLy8gICAgICAgZWRnZTogMSxcbiAgICAvLyAgICAgICBmdXp6eTogMSxcbiAgICAvLyAgICAgfTtcbiAgICAvLyAgIH0sXG4gICAgLy8gfSkpIHJldHVybiBmYWxzZTtcblxuICAgIGlmICghdGhpcy5yZWZpbmVNYXplKG1hemUpKSByZXR1cm4gZmFsc2U7XG4gICAgLy9jb25zb2xlLmxvZyhgUkVGSU5FTUVOVDpcXG4ke21hemUuc2hvdygpfWApO1xuXG4gICAgLy8gRmluZCBhbnkgcmVtYWluaW5nIFwiZmFrZVwiIHRpbGVzIGFuZCBhZGQgZGVhZC1lbmRzIGF0IGxlYXN0XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1hemUuZ2V0KHBvcyk7XG4gICAgICBpZiAoIXNjcikgY29udGludWU7XG4gICAgICBjb25zdCBkaXIgPSBzY3IgPT09IDB4MzMwMyA/IERpci5MRUZUIDogc2NyID09PSAweDAzMzMgPyBEaXIuUklHSFQgOiBudWxsO1xuICAgICAgaWYgKGRpciAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHBvczEgPSBQb3MucGx1cyhwb3MsIGRpcik7XG4gICAgICAgIGNvbnN0IHNjcjEgPSBtYXplLmdldChwb3MxKTtcbiAgICAgICAgaWYgKHNjcjEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgbWF6ZS5yZXBsYWNlKHBvczEsIChzY3IgXiAweDMzMzMpIGFzIFNjcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVsZXRlIGFsbCB0aGUgYmxhbmtzXG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MpIHtcbiAgICAgIGlmICghbWF6ZS5nZXQocG9zKSkge1xuICAgICAgICBtYXplLmRlbGV0ZShwb3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5maXhlZC5hZGQocG9zKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaW5kIGFsbCB0aGUgcG9zc2libGUgY29ubmVjdGlvbnMgYmV0d2VlbiByaXZlciBhbmQgbGFuZC5cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcykge1xuICAgICAgY29uc3Qgc2NyID0gbWF6ZS5nZXQocG9zKTtcbiAgICAgIGlmICghc2NyKSBjb250aW51ZTtcbiAgICAgIC8vIENhbiBvbmx5IGF1Z21lbnQgc3RyYWlnaHQgcGF0aHNcbiAgICAgIGlmIChzY3IgIT09ICgoc2NyIDw8IDggfCBzY3IgPj4gOCkgJiAweGZmZmYpKSBjb250aW51ZTtcbiAgICAgIC8vIFBpY2sgb25lIG9mIHRoZSB0d28gZGlyZWN0aW9ucyB0byBhZGQgYSBsYW5kIHBhdGhcbiAgICAgIGNvbnN0IGF1ZyA9IChzY3IgPDwgNCB8IHNjciA+PiA0KSAmIHRoaXMucmFuZG9tLnBpY2soWzB4MTEwMCwgMHgwMDExXSk7XG4gICAgICBjb25zdCBzY3IxID0gKHNjciB8IGF1ZykgYXMgU2NyO1xuICAgICAgbWF6ZS5zYXZlRXhjdXJzaW9uKCgpID0+IG1hemUuc2V0QW5kVXBkYXRlKHBvcywgc2NyMSkpO1xuICAgIH0gICAgXG5cbiAgICAvL2NvbnNvbGUubG9nKGBDT05ORUNURUQ6XFxuJHttYXplLnNob3coKX1gKTtcblxuICAgIFxuICAgIGlmICghc3VwZXIuaW5pdGlhbGl6ZUZpeGVkU2NyZWVucyhtYXplKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gRmlndXJlIG91dCBob3cgbWFueSBicmlkZ2VzIHdlIGhhdmUgc28gZmFyIChvbmx5IGZyb20gNC13YXkgdGlsZXMpLFxuICAgIC8vIGlmIGl0J3MgdG9vIG1hbnkgdGhlbiBiYWlsIG91dDsgaWYgaXQncyBub3QgZW5vdWdoIHRoZW4gYWRkIGEgZmV3LlxuXG4gICAgLy8gQmxvY2sgb2ZmIHNvbWUgb2YgdGhlIGVkZ2VzIHRvIGVuc3VyZSBhIHNpbmdsZSBwYXRoLi4uP1xuXG4gICAgLy8gVGhlbiBleHRlbmQgdGhlIHRpbGVzIHdoZW5ldmVyIHBvc3NpYmxlLlxuXG4gICAgLy8gVGhlbiBkbyB0aGUgbm9ybWFsIHRoaW5nIGZyb20gdGhlcmUuXG4gICAgdGhpcy5kZW5zaXR5ID0gdGhpcy5zdXJ2ZXkuc2l6ZSAvIHRoaXMudyAvIHRoaXMuaDtcbiAgICB0aGlzLnBoYXNlID0gJ2NhdmUnO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcG9zdFJlZmluZShtYXplOiBNYXplLCBwb3M6IFBvcykge1xuICAgIC8vbGV0IGJhZCA9IDA7XG4gICAgLy9sZXQgZml4ZWQgPSAwO1xuICAgIC8vY29uc29sZS5sb2coYHBvc3RSZWZpbmUgJHtwb3MudG9TdHJpbmcoMTYpfVxcbiR7bWF6ZS5zaG93KCl9YCk7XG4gICAgaWYgKHRoaXMucGhhc2UgIT09ICdyaXZlcicpIHJldHVybjtcbiAgICAvLyBJZiBhbnkgbmVpZ2hib3JzIHdlcmUgbWFkZSBpbnRvIGZha2UgdGlsZXMsIHRoZW4gdHJ5IHRvIGRlbGV0ZSBhblxuICAgIC8vIGVkZ2UgdG8gYnJpbmcgdGhlbSBiYWNrIHRvIG5vbi1mYWtlLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1hemUuZ2V0KHBvcywgZGlyKTtcbiAgICAgIGlmIChzY3IgIT0gbnVsbCAmJiB0aGlzLmJhZFNjcnMuaGFzKHNjcikpIHtcbiAgICAgICAgLy9iYWQrKztcbiAgICAgICAgLyppZiAoKi9tYXplLnNhdmVFeGN1cnNpb24oXG4gICAgICAgICAgICAoKSA9PiBtYXplLnRyeUNvbnNvbGlkYXRlKFxuICAgICAgICAgICAgICAgIFBvcy5wbHVzKHBvcywgZGlyKSxcbiAgICAgICAgICAgICAgICB0aGlzLmdvb2RTY3JzLFxuICAgICAgICAgICAgICAgIHRoaXMuYmFkU2NycyxcbiAgICAgICAgICAgICAgICAoKSA9PiB0aGlzLmNoZWNrKG1hemUpKSk7Ly8pIGZpeGVkKys7XG4gICAgICB9XG4gICAgfVxuICAgIC8vaWYgKGZpeGVkKSBjb25zb2xlLmxvZyhgcG9zdFJlZmluZSBiYWQgJHtiYWR9IGZpeGVkICR7Zml4ZWR9XFxuJHttYXplLnNob3coKX1gKTtcbiAgfVxuXG4gIGluaXRpYWxpemVSaXZlcihtYXplOiBNYXplKTogYm9vbGVhbiB7XG4gICAgLy8gTk9URTogVGhpcyBpcyBhIGRpZmZpY3VsdCBmaWxsIGJlY2F1c2UgdGhlcmUncyBub1xuICAgIC8vIHx8PSBvciA9fHwgdGlsZXMsIHNvIHRoZSBsZWZ0L3JpZ2h0IGVkZ2VzIGdldCBhIGxpdHRsZVxuICAgIC8vIHRyb3VibGVkLiAgQnV0IHRoZXJlIEFSRSBkZWFkLWVuZHMsIHNvIHdlIGNhbiBmaWxsIHRoZVxuICAgIC8vIGNvbHVtbiB3aXRoIGVpdGhlciBwYWlycyBvZiB0aWdodCBjeWNsZXMgb3IgZWxzZVxuICAgIC8vIGRlYWQgZW5kcywgYXMgd2Ugc2VlIGZpdC4gIERvIHRoaXMgbWFudWFsbHkuXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnc7IHgrKykge1xuICAgICAgICBsZXQgdGlsZSA9IDB4MzMzMztcbiAgICAgICAgY29uc3QgcG9zID0gKHkgPDwgNCB8IHgpIGFzIFBvcztcbiAgICAgICAgaWYgKHkgPT09IDApIHRpbGUgJj0gMHhmZmYwO1xuICAgICAgICBpZiAoeSA9PT0gdGhpcy5oIC0gMSkgdGlsZSAmPSAweGYwZmY7XG5cbiAgICAgICAgaWYgKHggPT09IDApIHRpbGUgJj0gMHgwZmZmO1xuICAgICAgICBpZiAoeCA9PT0gdGhpcy53IC0gMSkgdGlsZSAmPSAweGZmMGY7XG5cbiAgICAgICAgLy8gY29uc3QgbG9vcCA9IHkgPiAwICYmIChtYXplLmdldCgocG9zIC0gMTYpIGFzIFBvcykhICYgMHgwZjAwKSAhPSAwO1xuICAgICAgICAvLyBpZiAoeCA9PT0gMCkge1xuICAgICAgICAvLyAgIGlmIChsb29wKSB7XG4gICAgICAgIC8vICAgICB0aWxlID0gMHgwMDMzO1xuICAgICAgICAvLyAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICB0aWxlID0geSA8IHRoaXMuaCAtIDEgJiYgdGhpcy5yYW5kb20ubmV4dEludCgyKSA/IDB4MDMzMCA6IDB4MDAzMDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH0gZWxzZSBpZiAoeCA9PT0gdGhpcy53IC0gMSkge1xuICAgICAgICAvLyAgIGlmIChsb29wKSB7XG4gICAgICAgIC8vICAgICB0aWxlID0gMHgzMDAzO1xuICAgICAgICAvLyAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICB0aWxlID0geSA8IHRoaXMuaCAtIDEgJiYgdGhpcy5yYW5kb20ubmV4dEludCgyKSA/IDB4MzMwMCA6IDB4MzAwMDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICBtYXplLnNldChwb3MsIHRpbGUgYXMgU2NyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUGljayBhIGZldyB0aWxlcyBvbiBvcHBvc2l0ZSBlZGdlcyB0byBtYXJrIGFzIGZpeGVkLlxuICAgIC8vIE1ha2Ugc3VyZSB0byBwaWNrIG5vbi1mYWtlIHRpbGVzLCBmb3IgYmV0dGVyIHJlc3VsdHMuXG4gICAgLy8gY29uc3QgdHVybnMgPSBuZXcgU2V0KFsweDAwMzMsIDB4MDMzMCwgMHgzMzAwLCAweDMwMDNdKSBhcyBTZXQ8U2NyPjtcblxuICAgIC8vIFRPRE8gLSByYW5kb21seSBtYWtlIGEgdmVydGljYWwgcml2ZXIgaW5zdGVhZCBvZiBob3Jpem9udGFsP1xuICAgIGZvciAoY29uc3QgeCBvZiBbMCwgdGhpcy53IC0gMV0pIHtcbiAgICAgIGZvciAoY29uc3QgeSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShzZXEodGhpcy5oIC0gMywgeSA9PiB5ICsgMikpKSB7XG4gICAgICAgIGNvbnN0IHBvcyA9ICh5IDw8IDQgfCB4KSBhcyBQb3M7XG4gICAgICAgIC8vIGNvbnN0IHNjciA9IG1hemUuZ2V0KHBvcyk7XG4gICAgICAgIC8vIGlmIChzY3IgJiYgdHVybnMuaGFzKHNjcikpIHtcbiAgICAgICAgICB0aGlzLmZpeGVkLmFkZChwb3MpO1xuICAgICAgICAgIC8vdGhpcy5maXhlZC5hZGQocG9zIC0gMTYgYXMgUG9zKTtcbiAgICAgICAgICB0aGlzLmZpeGVkUml2ZXIuYWRkKHBvcyk7XG4gICAgICAgICAgLy90aGlzLmZpeGVkUml2ZXIuYWRkKHBvcyAtIDE2IGFzIFBvcyk7XG4gICAgICAgICAgaWYgKHRoaXMucmFuZG9tLm5leHRJbnQoMikpIGJyZWFrO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgY2hlY2sobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnBoYXNlID09PSAnY2F2ZScpIHJldHVybiBzdXBlci5jaGVjayhtYXplKTtcbiAgICAvLyBSaXZlciBjaGVjayBpbnZvbHZlcyBqdXN0IGVuc3VyaW5nIGV2ZXJ5dGhpbmcgaXMgcmVhY2hhYmxlIGJ5IGZsaWdodD9cbiAgICAvLyBCdXQgd2UgZG9uJ3QgaGF2ZSB0aGF0IGZvciBub3cuLi5cblxuICAgIGlmIChbLi4udGhpcy5maXhlZFJpdmVyXS5zb21lKHBvcyA9PiAhbWF6ZS5nZXQocG9zKSkpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCB0cmF2ZXJzZSA9IG1hemUudHJhdmVyc2Uoe2ZsaWdodDogdHJ1ZX0pO1xuICAgIGNvbnN0IHBhcnRpdGlvbnMgPSBbLi4ubmV3IFNldCh0cmF2ZXJzZS52YWx1ZXMoKSldLm1hcChzID0+IHMuc2l6ZSk7XG4gICAgcmV0dXJuIHBhcnRpdGlvbnMubGVuZ3RoID09PSAxICYmIHBhcnRpdGlvbnNbMF0gPT09IHRyYXZlcnNlLnNpemU7XG4gICAgLy8gbGV0IHN1bSA9IDA7XG4gICAgLy8gZm9yIChjb25zdCBwYXJ0IG9mIHBhcnRpdGlvbnMpIHtcbiAgICAvLyAgIHN1bSArPSBwYXJ0O1xuICAgIC8vIH1cbiAgICAvLyByZXR1cm4gcGFydGl0aW9ucy5ldmVyeShwID0+IHAgPiAyKSAmJiBzdW0gPT09IHRyYXZlcnNlLnNpemU7XG4gIH1cbn1cbmNvbnN0IFtdID0gW0V2aWxTcGlyaXRSaXZlckNhdmVTaHVmZmxlX29sZF07XG5cbmZ1bmN0aW9uIGZhaWwobXNnOiBzdHJpbmcsIG1hemU/OiBNYXplKTogZmFsc2Uge1xuICBjb25zb2xlLmVycm9yKGBSZXJvbGw6ICR7bXNnfWApO1xuICBpZiAobWF6ZSAmJiBERUJVRykgY29uc29sZS5sb2cobWF6ZS5zaG93KCkpO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIENoZWNrIHdoZXRoZXIgdGhlcmUncyBhIFwidGlnaHQgY3ljbGVcIiBhdCBgcG9zYC4gIFdlIHdpbGxcbi8vIHByb2JhYmx5IHdhbnQgdG8gYnJlYWsgaXQuXG5mdW5jdGlvbiBpc1RpZ2h0Q3ljbGUobWF6ZTogTWF6ZSwgcG9zOiBQb3MpOiBib29sZWFuIHtcbiAgY29uc3QgdWwgPSBtYXplLmdldCgocG9zIC0gMTcpIGFzIFBvcykgfHwgMDtcbiAgY29uc3QgZHIgPSBtYXplLmdldCgocG9zKSBhcyBQb3MpIHx8IDA7XG4gIHJldHVybiAhISgodWwgJiAweDBmMDApICYmICh1bCAmIDB4MDBmMCkgJiYgKGRyICYgMHhmMDAwKSAmJiAoZHIgJiAweDAwMGYpKTtcbn1cblxuLy8gRW5zdXJlIGJvcmRlcnMgYXJlIGNvbnNpc3RlbnQgd2l0aCBhbnkgcHJlLXBsYWNlZCBmaXhlZCB0aWxlcy9lZGdlcy5cbmZ1bmN0aW9uIGZpeEJvcmRlcnMobWF6ZTogTWF6ZSwgcG9zOiBQb3MsIHNjcjogU2NyKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgZm9yIChjb25zdCBkaXIgb2YgRGlyLkFMTCkge1xuICAgICAgaWYgKCFtYXplLmluQm91bmRzKFBvcy5wbHVzKHBvcywgZGlyKSkgJiZcbiAgICAgICAgICAoKHNjciA+PiBEaXIuc2hpZnQoZGlyKSkgJiAweDcpID09PSA3KSB7XG4gICAgICAgIG1hemUuc2V0Qm9yZGVyKHBvcywgZGlyLCA3KTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge31cbn1cblxuICAgIC8vbWF6ZS50cmFja09wZW5FZGdlcygpO1xuXG4gICAgLy9jb25zdCBtYXBwaW5nOiBBcnJheTxbUG9zLCBQb3NdPiA9IFtdOyAvLyBOT1RFOiBtYXkgbmVlZCB0byB4Zm9ybSBpZiBzaHJpbmtcbiAgICAvL2NvbnN0IHBvaTogQXJyYXk8W1BvcywgRGlyXT4gPSBbXTtcbiAgICAvL2xldCB7YnJhbmNoZXMsIGRlYWRFbmRzLCBzaXplLCB3YWxsc30gPSBzdXJ2ZXk7XG5cblxuICAgIFxuXG4gICAgLy8gLy8gUG9zc2libGUgYXBwcm9hY2g6XG4gICAgLy8gLy8gIDEuIHNlZWQgYSBidW5jaCBvZiBpbml0aWFsIHNjcmVlbnNcbiAgICAvLyAvLyAgMi4gY2hlY2sgc3RlcDogdHJhdmVyc2UgdGhlIG1hcCB3aXRoXG4gICAgLy8gLy8gICAgIG1pc3NpbmcgaXRlbXMgdHJlYXRlZCBhcyBjb25uZWN0aW5nIGV2ZXJ5dGhpbmdcbiAgICAvLyAvLyAgMy4gYWRkIHJhbmRvbSBzY3JlZW5zLCBiaWFzaW5nIHRvd2FyZCBmZXdlciBleGl0c1xuICAgIC8vIC8vICAgICBiYXNlZCBvbiBicmFuY2hpbmcgZmFjdG9yP1xuICAgIC8vIC8vIFRoaXMgc2hvdWxkIGVuc3VyZSB3ZSBkb24ndCBkbyBhbnl0aGluZyB0b28gc3R1cGlkIHRvXG4gICAgLy8gLy8gcGFpbnQgb3Vyc2VsdmVzIGludG8gYSBjb3JuZXIuXG5cbiAgICAvLyBQbGFjZSAoMSkgZWRnZSBleGl0cywgKDIpIGZpeGVkIHNjcmVlbnMsICgzKSBzdGFpcnMuXG4vLyAgICAgY29uc3Qgc2V0RWRnZXMgPSBuZXcgU2V0PFBvcz4oKTtcbi8vICAgICBmb3IgKGNvbnN0IFssIGVkZ2VdIG9mIHN1cnZleS5lZGdlcykge1xuLy8gICAgICAgd2hpbGUgKHRydWUpIHtcbi8vICAgICAgICAgY29uc3QgdGlsZSA9IC8qMSArKi8gcmFuZG9tLm5leHRJbnQoZWRnZS5kaXIgJiAxID8gaDAgOiB3MCk7XG4vLyAgICAgICAgIGNvbnN0IG90aGVyID1cbi8vICAgICAgICAgICAgIGVkZ2UuZGlyID09PSBEaXIuUklHSFQgPyAvKjEgKyovIHcwIDpcbi8vICAgICAgICAgICAgIGVkZ2UuZGlyID09PSBEaXIuRE9XTiA/IC8qMSArKi8gaDAgOiAwO1xuLy8gICAgICAgICBjb25zdCBwb3MgPSAoZWRnZS5kaXIgJiAxID8gdGlsZSA8PCA0IHwgb3RoZXIgOiBvdGhlciA8PCA0IHwgdGlsZSkgYXMgUG9zO1xuLy8gICAgICAgICBpZiAoc2V0RWRnZXMuaGFzKHBvcykpIGNvbnRpbnVlO1xuLy8gICAgICAgICBtYXplLnNldEJvcmRlcihwb3MsIGVkZ2UuZGlyLCA2KTtcbi8vICAgICAgICAgYnJlYWs7XG4vLyAgICAgICB9XG4vLyAgICAgICAvLyBpZiAoIW1hemUuZmlsbChtb3ZlZCwge21heEV4aXRzOiAyICsgYnJhbmNoZXN9KSkgY29udGludWUgT1VURVI7XG4vLyAgICAgICAvLyBjb25zdCBmaWxsZWQgPSBtYXplLmdldChtb3ZlZCkhO1xuLy8gICAgICAgLy8gbWFwcGluZy5wdXNoKFtwb3MsIG1vdmVkXSk7XG4vLyAgICAgICAvLyBsZXQgZXhpdHMgPSAwO1xuLy8gICAgICAgLy8gZm9yIChjb25zdCBkaXIgb2YgRGlyLkFMTCkge1xuLy8gICAgICAgLy8gICBpZiAoZGlyICE9IGVkZ2UuZGlyICYmIChmaWxsZWQgJiBEaXIuZWRnZU1hc2soZGlyKSkpIHtcbi8vICAgICAgIC8vICAgICAvLyBwb2kucHVzaChbbW92ZWQsIGRpcl0pO1xuLy8gICAgICAgLy8gICAgIGV4aXRzKys7XG4vLyAgICAgICAvLyAgIH1cbi8vICAgICAgIC8vIH1cbi8vICAgICAgIC8vIHNpemUtLTtcbi8vICAgICAgIC8vIGlmIChleGl0cyA+IDEpIGJyYW5jaGVzIC09IChleGl0cyAtIDEpO1xuLy8gICAgIH1cblxuLy8gICAgIGZvciAoY29uc3QgWywgc2NyXSBvZiBzdXJ2ZXkuZml4ZWQpIHtcbi8vICAgICAgIGlmIChtYXplLmFkZFNjcmVlbihzY3IpID09IG51bGwpIGNvbnRpbnVlIE9VVEVSO1xuLy8gICAgIH1cblxuLy8gICAgIGZvciAoY29uc3Qgc3RhaXIgb2Ygc3VydmV5LnN0YWlycykge1xuLy8gICAgICAgY29uc3QgZWxpZ2libGUgPSBbXTtcbi8vICAgICAgIGZvciAoY29uc3Qgc3BlYyBvZiBzY3JlZW5zKSB7XG4vLyAgICAgICAgIGlmIChzcGVjLnN0YWlycy5zb21lKHMgPT4gcy5kaXIgPT09IHN0YWlyLmRpcikpIGVsaWdpYmxlLnB1c2goc3BlYy5lZGdlcyk7XG4vLyAgICAgICB9XG4vLyAgICAgICBpZiAobWF6ZS5hZGRTY3JlZW4ocmFuZG9tLnBpY2soZWxpZ2libGUpKSA9PSBudWxsKSBjb250aW51ZSBPVVRFUjtcbi8vICAgICB9XG5cbi8vICAgICAvLyAvLyBOb3cgZmlsbCBvdXQgYSBiYXNpYyBzdHJ1Y3R1cmUgYnkgd2Fsa2luZyByYW5kb20gcGF0aHMuXG4vLyAgICAgLy8gd2hpbGUgKG1hemUuZGVuc2l0eSgpIDwgZGVuc2l0eSkge1xuLy8gICAgIC8vICAgaWYgKG1hemUucmFuZG9tRXh0ZW5zaW9uKGJyYW5jaGVzIC8gc2l6ZSkpIGJyYW5jaGVzLS07XG4vLyAgICAgLy8gICBzaXplLS07XG4vLyAgICAgLy8gfVxuXG5cbi8vICAgICAvLyAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xuLy8gICAgIC8vICAgICBjb25zdCB0aWxlMCA9IHJhbmRvbS5uZXh0SW50KGgwICogdzApO1xuLy8gICAgIC8vICAgICBjb25zdCB4ID0gdGlsZTAgJSB3MDtcbi8vICAgICAvLyAgICAgY29uc3QgeSA9ICh0aWxlMCAtIHgpIC8gdzA7XG4vLyAgICAgLy8gICAgIGlmICghbWF6ZS50cnlTZXQocG9zLCBcbi8vICAgICAvLyB9XG5cblxuLy8gICAgIC8vIGZvciAoY29uc3Qgc3RhaXIgb2Ygc3VydmV5LnN0YWlycykge1xuLy8gICAgIC8vICAgLy8gRmluZCBhIHJhbmRvbSBsb2NhdGlvbiBmb3IgYSBjb3JyZWN0LWRpcmVjdGlvbiBzdGFpci5cbi8vICAgICAvLyAgIGNvbnN0IHBvcyA9IG1hemUucmFuZG9tVW5maWxsZWRQb3MoKTtcbi8vICAgICAvLyB9XG5cbi8vICAgICBjb25zb2xlLmxvZyhtYXplLnNob3coKSk7XG4vLyAgIH1cbi8vIH1cblxuICAvLyBmdW5jdGlvbiB0cnlTaHVmZmxlTm9CcmFuY2gobWF6ZTogTWF6ZSk6IGJvb2xlYW4ge1xuICAvLyAgIGlmIChzdXJ2ZXkudGlsZXMuY291bnQoMHg5MSkgfHwgc3VydmV5LnRpbGVzLmNvdW50KDB4OTIpKSB7XG4gIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBoYW5kbGUgdGlsZWApO1xuICAvLyAgIH1cblxuICAvLyAgIC8vIEJhc2ljIHBsYW46IG1ha2UgYSBsaXN0IG9mIHNjcmVlbnMsIHdoaWNoIGluY2x1ZGUgdHVybnMsIHN0cmFpZ2h0cyxcbiAgLy8gICAvLyBhbmQgZml4ZWQgc2NyZWVucy5cbiAgLy8gICBsZXQge3NpemUsIHdhbGxzfSA9IHN1cnZleTtcbiAgLy8gICBjb25zdCBbXSA9IFt3YWxsc107XG5cbiAgLy8gICAvLyBXZSBuZWVkIGF0IG1vc3QgdHdvIGV4aXRzLCBhdCBtb3N0IG9uZSBjYW4gYmUgYW4gZWRnZS5cbiAgLy8gICBjb25zdCBlZGdlQ291bnQgPSBzdXJ2ZXkuZWRnZXMuc2l6ZTtcbiAgLy8gICBjb25zdCBzdGFpckNvdW50ID0gc3VydmV5LnN0YWlycy5zaXplO1xuICAvLyAgIGNvbnN0IGV4aXRDb3VudCA9IGVkZ2VDb3VudCArIHN0YWlyQ291bnQ7XG4gIC8vICAgaWYgKGVkZ2VDb3VudCA+IDEpIHRocm93IG5ldyBFcnJvcihgdG9vIG1hbnkgZWRnZXM6ICR7ZWRnZUNvdW50fWApO1xuICAvLyAgIGlmIChleGl0Q291bnQgPiAyKSB0aHJvdyBuZXcgRXJyb3IoYHRvbyBtYW55IGV4aXRzOiAke2V4aXRDb3VudH1gKTtcblxuICAvLyAgIGxldCBzdGFydDogUG9zO1xuICAvLyAgIGxldCBlbnRyYW5jZUVkZ2VzOiBudW1iZXI7XG4gIC8vICAgbGV0IHRhcmdldDogRXhpdFNwZWMgfCB1bmRlZmluZWQ7XG5cbiAgLy8gICAvLyBQbGFjZSB0aGUgZmlyc3QgdGlsZS5cbiAgLy8gICBjb25zdCBzdGFpcnMgPSBbLi4uc3VydmV5LnN0YWlycy52YWx1ZXMoKV07XG4gIC8vICAgaWYgKGVkZ2VDb3VudCkge1xuICAvLyAgICAgY29uc3QgW2VkZ2VdID0gWy4uLnN1cnZleS5lZGdlcy52YWx1ZXMoKV07XG4gIC8vICAgICBzdGFydCA9IHJhbmRvbUVkZ2UoZWRnZS5kaXIpO1xuICAvLyAgICAgbWF6ZS5zZXRCb3JkZXIoc3RhcnQsIGVkZ2UuZGlyLCA2KTtcbiAgLy8gICAgIGlmICghbWF6ZS5maWxsKHN0YXJ0LCB7bWF4RXhpdHM6IDJ9KSkgcmV0dXJuIGZhaWwoJ2VudHJhbmNlIGVkZ2UgZmlsbCcpO1xuICAvLyAgICAgZW50cmFuY2VFZGdlcyA9IG1hemUuZ2V0KHN0YXJ0KSEgJiB+RGlyLmVkZ2VNYXNrKGVkZ2UuZGlyKSAmIDB4ZmZmZjtcbiAgLy8gICAgIHRhcmdldCA9IHN0YWlyc1swXTtcbiAgLy8gICB9IGVsc2Uge1xuICAvLyAgICAgLy8gc3RhcnQgd2l0aCBhIHN0YWlyXG4gIC8vICAgICBzdGFydCA9IG1hemUucmFuZG9tUG9zKCk7XG4gIC8vICAgICBpZiAoIW1hemUuZmlsbChzdGFydCwge21heEV4aXRzOiAxLCBzdGFpcjogc3RhaXJzWzBdLmRpcn0pKSB7XG4gIC8vICAgICAgIHJldHVybiBmYWlsKCdlbnRyYW5jZSBzdGFpciBmaWxsJyk7XG4gIC8vICAgICB9XG4gIC8vICAgICBlbnRyYW5jZUVkZ2VzID0gbWF6ZS5nZXQoc3RhcnQpISAmIDB4ZmZmZjtcbiAgLy8gICAgIHRhcmdldCA9IHN0YWlyc1sxXTtcbiAgLy8gICB9XG5cbiAgLy8gICAvLyBGaWd1cmUgb3V0IHN0YXJ0IGRpcmVjdGlvblxuICAvLyAgIGxldCBzdGFydERpciA9IDAgYXMgRGlyO1xuICAvLyAgIGZvciAoOyBzdGFydERpciA8IDQ7IHN0YXJ0RGlyKyspIHtcbiAgLy8gICAgIGlmIChlbnRyYW5jZUVkZ2VzICYgRGlyLmVkZ2VNYXNrKHN0YXJ0RGlyKSkgYnJlYWs7XG4gIC8vICAgfVxuICAvLyAgIGlmIChzdGFydERpciA9PT0gNCkgcmV0dXJuIGZhaWwoJ25vIGVkZ2UgZXhpdCcpO1xuXG4gIC8vICAgLy8gTWFrZSB1cCBhIHBhdGhcbiAgLy8gICB0eXBlIFR1cm4gPSAtMSB8IDAgfCAxO1xuICAvLyAgIGZ1bmN0aW9uIHR1cm4oKTogVHVybiB7IHJldHVybiAocmFuZG9tLm5leHRJbnQoMykgLSAxKSBhcyBUdXJuOyB9XG4gIC8vICAgY29uc3QgcGF0aCA9IHNlcShzaXplIC0gMiArIHJhbmRvbS5uZXh0SW50KDIpLCB0dXJuKTtcbiAgLy8gICBjb25zdCBmaW5hbE9wdHMgPSB0YXJnZXQgPyB7c3RhaXI6IHRhcmdldC5kaXJ9IDoge307XG4gIC8vICAgaWYgKCFtYXplLmZpbGxQYXRoVG9EZWFkRW5kKHN0YXJ0LCBzdGFydERpciwgcGF0aFtTeW1ib2wuaXRlcmF0b3JdKCksXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtlZGdlOiAxfSwgZmluYWxPcHRzKSkge1xuICAvLyAgICAgcmV0dXJuIGZhaWwoYGNvdWxkIG5vdCBmaWxsIHBhdGg6ICR7cGF0aH1gKTtcbiAgLy8gICB9XG5cbiAgLy8gICAvLyBBZGQgaW4gW2ZpeGVkIHNjcmVlbnNdLCBzdGFpciBoYWxscy9icmlkZ2VzLCBhbmQgd2FsbHMgKHJlc3BlY3RpdmVseSkuXG5cbiAgLy8gICAvLyBUT0RPIC0gZmxlc2ggdGhpcyBvdXQgTEFURVIsIGZvciBub3cgZG9uJ3Qgd29ycnkgYWJvdXQgbm9uLWJyYW5jaGluZy5cblxuICAvLyAgIC8vIGZvciAoY29uc3QgdGlsZSBvZiBbMHg4Y10pIHsgLy8gLCAweDhkLCAweDhlXSkge1xuICAvLyAgIC8vICAgaWYgKHN1cnZleS50aWxlcy5jb3VudCh0aWxlKSkge1xuICAvLyAgIC8vICAgICBjb25zdCBzdGVwcyA9IHJhbmRvbS5zaHVmZmxlKGFsdHMuZmlsdGVyKHggPT4geFszXS50aWxlID09PSB0aWxlKSk7XG4gIC8vICAgLy8gICAgIGlmIChzdGVwcy5sZW5ndGggPCBzdXJ2ZXkudGlsZXMuY291bnQodGlsZSkpIHtcbiAgLy8gICAvLyAgICAgICByZXR1cm4gZmFpbChgY291bGQgbm90IGFkZCBzdGFpciBoYWxsd2F5YCk7XG4gIC8vICAgLy8gICAgIH1cbiAgLy8gICAvLyAgICAgZm9yIChsZXQgaSA9IHN1cnZleS50aWxlcy5jb3VudCh0aWxlKSAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gIC8vICAgLy8gICAgICAgbWF6ZS5yZXBsYWNlKHN0ZXBzW2ldWzBdLCBzdGVwc1tpXVsyXSk7XG4gIC8vICAgLy8gICAgICAgcmVwbGFjZWQuYWRkKHN0ZXBzW2ldWzBdKTtcbiAgLy8gICAvLyAgICAgfVxuICAvLyAgIC8vICAgfVxuICAvLyAgIC8vIH1cblxuICAvLyAgIC8vIGNvbnNvbGUubG9nKGBkb25lXFxuJHttYXplLnNob3coKX1gKTtcbiAgLy8gICBpZiAobG9jLnJvbS5zcG9pbGVyKSBsb2Mucm9tLnNwb2lsZXIuYWRkTWF6ZShsb2MuaWQsIGxvYy5uYW1lLCBtYXplLnNob3coKSk7XG4gIC8vICAgcmV0dXJuIHRydWU7XG4gIC8vIH1cblxuY29uc3QgU1RSQVRFR0lFUyA9IG5ldyBNYXA8bnVtYmVyLCBTaHVmZmxlU3RyYXRlZ3k+KFtcbiAgWzB4MjcsIEN5Y2xlQ2F2ZVNodWZmbGVdLFxuICBbMHg0YiwgVGlnaHRDeWNsZUNhdmVTaHVmZmxlXSxcbiAgWzB4NTQsIEN5Y2xlQ2F2ZVNodWZmbGVdLFxuICBbMHg1NiwgV2lkZUNhdmVTaHVmZmxlXSxcbiAgWzB4NTcsIFdhdGVyZmFsbFJpdmVyQ2F2ZVNodWZmbGVdLFxuICBbMHg2OSwgUml2ZXJDYXZlU2h1ZmZsZV0sXG4gIFsweDg0LCBXaWRlQ2F2ZVNodWZmbGVdLFxuICBbMHhhYiwgUml2ZXJDYXZlU2h1ZmZsZV0sXG5dKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGVDYXZlKGxvYzogTG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIG5ldyAoU1RSQVRFR0lFUy5nZXQobG9jLmlkKSB8fCBCYXNpY0NhdmVTaHVmZmxlKShsb2MsIHJhbmRvbSkuc2h1ZmZsZSgpO1xufVxuIl19