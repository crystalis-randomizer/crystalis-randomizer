import { EDGE_TYPES } from './spec.js';
import { Dir, DirMask, Path, Pos, Scr } from './types.js';
import { Flag, Spawn, Exit, Entrance } from '../rom/location.js';
import { Monster } from '../rom/monster.js';
import { hex, hex5, seq } from '../rom/util.js';
import { UnionFind } from '../unionfind.js';
import { DefaultMap, Multiset, iters } from '../util.js';
export class Maze {
    constructor(random, height, width, screens, extraTiles) {
        this.random = random;
        this.height = height;
        this.width = width;
        this.extraTiles = extraTiles;
        this.extraTilesMap = [];
        this.map = new Array(height << 4).fill(undefined);
        this.screens = new Map(screens.map(spec => [spec.edges, spec]));
        this.allPos = new Set([].concat(...seq(height, y => seq(width, x => (y << 4 | x)))));
        this.allPosArray = [...this.allPos];
        const extensions = new DefaultMap(() => []);
        for (const [screen, spec] of this.screens) {
            if (spec.fixed)
                continue;
            for (const dir of Dir.ALL) {
                const mask = 0xf << (dir << 2);
                if (screen & mask) {
                    extensions.get(screen & ~mask & 0xffff).push([dir, screen]);
                }
            }
        }
        this.screenExtensions = extensions;
        this.border = new Array(height << 4).fill(0);
        if (extraTiles)
            this.counts = new Multiset();
    }
    *alternates() {
        for (const pos of this.allPos) {
            const scr = this.map[pos];
            if (scr == null)
                continue;
            for (let bit = 65536; bit < 2097152; bit <<= 1) {
                const newScr = (scr | bit);
                const spec = this.screens.get(newScr);
                if (!(scr & bit) && spec) {
                    yield [pos, bit, newScr, spec];
                }
            }
        }
    }
    saveExcursion(f) {
        let m = [...this.map];
        let c = this.counts ? [...this.counts] : null;
        let b = [...this.border];
        try {
            if (f())
                return true;
        }
        catch (err) {
            this.map = m;
            this.border = b;
            if (c)
                this.counts = new Multiset(c);
            throw err;
        }
        this.map = m;
        this.border = b;
        if (c)
            this.counts = new Multiset(c);
        return false;
    }
    *extensions() {
        const uf = new UnionFind();
        const extensions = [];
        for (const pos of this.allPos) {
            const scr = this.map[pos];
            if (scr == null) {
                for (const neighbor of [pos - 1, pos - 16]) {
                    if (this.empty(neighbor)) {
                        uf.union([pos, neighbor]);
                    }
                }
            }
            else {
                for (const [dir, ext] of this.screenExtensions.get(scr & 0xffff)) {
                    const neighbor = Pos.plus(pos, dir);
                    if (!this.map[neighbor] && this.inBounds(neighbor)) {
                        extensions.push([pos, ext, dir, 0]);
                    }
                }
            }
        }
        for (const ext of extensions) {
            const [pos, , dir] = ext;
            ext[3] = uf.find(Pos.plus(pos, dir)) << 4 | Scr.edge(ext[1], ext[2]);
            yield ext;
        }
    }
    *eligible(pos, opts = {}) {
        const { allowed, skipAlternates, maxExits, edge, fuzzy, stair } = opts;
        const defaultScreen = edge != null ? edge | edge << 4 | edge << 8 | edge << 12 : undefined;
        let mask = 0;
        let fuzzyMask = 0;
        let constraint = 0;
        for (const dir of Dir.ALL) {
            const edgeMask = Dir.edgeMask(dir);
            const invMask = Dir.edgeMask(Dir.inv(dir));
            let screen = this.get(pos, dir);
            if (screen == null)
                screen = defaultScreen;
            if (screen == null)
                continue;
            constraint |= ((screen & invMask) >>> 8 | (screen & invMask) << 8) & 0xffff;
            mask |= edgeMask;
            if (fuzzy && this.isFixed(Pos.plus(pos, dir)))
                fuzzyMask |= edgeMask;
        }
        if (!fuzzy)
            fuzzyMask = mask;
        const fuzzyConstraint = constraint & fuzzyMask;
        let screens = [];
        let fuzziness = Infinity;
        const allowedMap = allowed ?
            iters.map(allowed, s => [s, this.screens.get(s)]) :
            this.screens;
        for (const [screen, spec] of allowedMap) {
            if (!spec)
                throw new Error(`Bad Scr in 'allowed'!`);
            if (spec.fixed)
                continue;
            if (skipAlternates && (spec.edges & ~0xffff))
                continue;
            if (stair != null && !spec.stairs.some(s => s.dir === stair))
                continue;
            if (stair == null && spec.stairs.length)
                continue;
            if ((screen & fuzzyMask) !== fuzzyConstraint)
                continue;
            if (maxExits && Scr.numExits(screen) > maxExits)
                continue;
            if (!fuzzy) {
                yield screen;
            }
            else {
                let fuzz = 0;
                const cmp = (screen & mask) ^ constraint;
                for (const d of Dir.ALL) {
                    if (cmp & (0xf << Dir.shift(d)))
                        fuzz++;
                }
                if (fuzz < fuzziness) {
                    fuzziness = fuzz;
                    screens = [screen];
                }
                else if (fuzz === fuzziness) {
                    screens.push(screen);
                }
            }
        }
        if (fuzzy)
            yield* screens;
    }
    fill(pos, opts = {}) {
        if (opts.force && opts.fuzzy)
            throw new Error(`invalid`);
        const eligible = [...this.eligible(pos, opts)];
        if (!eligible.length) {
            if (opts.deleteNeighbors) {
                for (const dir of Dir.ALL) {
                    const pos1 = Pos.plus(pos, dir);
                    if (!this.isFixed(pos1))
                        this.setInternal(pos1, null);
                }
            }
            return false;
        }
        if (opts.fuzzy) {
            return this.setAndUpdate(pos, this.random.pick(eligible), opts);
        }
        this.set(pos, this.random.pick(eligible), opts);
        return true;
    }
    fillPath(pos, dir, path, exitType, opts = {}) {
        return this.saveExcursion(() => {
            const pathSaved = [...path];
            for (const step of pathSaved) {
                const nextDir = Dir.turn(dir, step);
                pos = Pos.plus(pos, dir);
                let screen = Scr.fromExits(DirMask.of(Dir.inv(dir), nextDir), exitType);
                const alts = opts.pathAlternatives && opts.pathAlternatives.get(screen);
                if (alts)
                    screen = (screen | (this.random.pick(alts) << 16));
                if (!this.trySet(pos, screen, opts))
                    return false;
                dir = nextDir;
            }
            return this.fill(Pos.plus(pos, dir), { ...opts, maxExits: 2 });
        });
    }
    fillAll(opts = {}) {
        const allPos = opts.shuffleOrder ?
            this.random.shuffle([...this.allPos]) : this.allPos;
        for (const pos of allPos) {
            if (this.map[pos] == null) {
                if (!this.fill(pos, opts)) {
                    if (opts.print) {
                        console.log(`Could not fill ${hex(pos)}\n${this.show()}`);
                    }
                    if (opts.fuzzy)
                        return false;
                    throw new Error(`Could not fill ${hex(pos)}`);
                }
            }
        }
        return true;
    }
    randomPos() {
        return this.random.pick(this.allPosArray);
    }
    addScreen(scr) {
        for (const pos of this.random.shuffle([...this.allPos])) {
            if (this.map[pos] != null)
                continue;
            if (this.trySet(pos, scr)) {
                return pos;
            }
        }
        return undefined;
    }
    addDeadEnd() {
        return false;
    }
    addLoop(opts = {}) {
        const exts = new DefaultMap(() => []);
        for (const [pos, scr, dir, part] of this.extensions()) {
            exts.get(part).push([pos, scr, dir, part & 0xf]);
        }
        const partitions = [...exts.values()];
        this.random.shuffle(partitions);
        let partition;
        do {
            partition = partitions.pop();
            if (!partition)
                return false;
        } while (partition.length < 2);
        this.random.shuffle(partition);
        const [[pos1, scr1, dir1, exitType], [pos2, scr2, dir2]] = partition;
        return this.saveExcursion(() => {
            this.replace(pos1, scr1);
            this.replace(pos2, scr2);
            const end = Pos.plus(pos2, dir2);
            if (Pos.plus(pos1, dir1) === end) {
                return this.fill(end, { ...opts, maxExits: 2, replace: true });
            }
            const [forward, right] = Pos.relative(pos1, dir1, end);
            let attempts = 0;
            for (const path of Path.generate(this.random, forward, right)) {
                if (this.fillPath(pos1, dir1, path, exitType, { ...opts, replace: true }))
                    break;
                if (++attempts > 20)
                    return false;
            }
            return true;
        });
    }
    connect(pos1, dir1, pos2, dir2, opts) {
        if (dir1 == null)
            dir1 = this.findEmptyDir(pos1);
        if (dir1 == null)
            return false;
        const exitType = Scr.edge(this.map[pos1] || 0, dir1);
        if (pos2 == null) {
            const exts = [];
            for (const [pos, scr, , exit] of this.extensions()) {
                if ((exit & 0xf) === exitType) {
                    exts.push([pos, scr, 0]);
                }
            }
            if (!exts.length)
                return false;
            const ext = this.random.pick(exts);
            this.replace((pos2 = ext[0]), ext[1]);
        }
        if (dir2 == null)
            dir2 = this.findEmptyDir(pos2);
        if (dir1 == null || dir2 == null)
            return false;
        if (exitType !== Scr.edge(this.map[pos2] || 0, dir2)) {
            throw new Error(`Incompatible exit types`);
        }
        pos2 = Pos.plus(pos2, dir2);
        const [forward, right] = Pos.relative(pos1, dir1, pos2);
        let attempts = 0;
        for (const path of Path.generate(this.random, forward, right)) {
            if (this.fillPath(pos1, dir1, path, exitType, opts))
                break;
            if (++attempts > 20)
                return false;
        }
        return true;
    }
    findEmptyDir(pos) {
        const scr = this.map[pos];
        if (scr == null)
            return null;
        const dirs = [];
        for (const dir of Dir.ALL) {
            if (Scr.edge(scr, dir) && this.empty(Pos.plus(pos, dir))) {
                dirs.push(dir);
            }
        }
        return dirs.length === 1 ? dirs[0] : null;
    }
    inBounds(pos) {
        return pos >= 0 && (pos & 0xf) < this.width && (pos >>> 4) < this.height;
    }
    isFixed(pos) {
        if (!this.inBounds(pos))
            return true;
        const scr = this.map[pos];
        if (scr == null)
            return false;
        const spec = this.screens.get(scr);
        return !!(spec != null && (spec.fixed || spec.stairs.length));
    }
    density() {
        const count = this.allPosArray.filter(pos => this.map[pos]).length;
        return count / (this.width * this.height);
    }
    size() {
        return this.allPosArray.filter(pos => this.map[pos]).length;
    }
    trim() {
        const empty = new Set();
        for (const spec of this.screens.values()) {
            if (!spec.edges)
                empty.add(spec.tile);
        }
        const isEmpty = (pos) => !this.map[pos] || empty.has(this.screens.get(this.map[pos]).tile);
        for (const y = 0;;) {
            if (!seq(this.width, x => y << 4 | x).every(isEmpty))
                break;
            this.map.splice(0, 16);
            this.border.splice(0, 16);
            this.height--;
        }
        for (let y = this.height - 1; y >= 0; y--) {
            if (!seq(this.width, x => y << 4 | x).every(isEmpty))
                break;
            this.map.splice((this.height - 1) << 4, 16);
            this.border.splice((this.height - 1) << 4, 16);
            this.height--;
        }
        for (const x = 0;;) {
            if (!seq(this.height, y => y << 4 | x).every(isEmpty))
                break;
            for (let y = this.height - 1; y >= 0; y--) {
                delete this.map[y << 4 | x];
                this.border[y << 4 | x] = 0;
            }
            this.map.push(this.map.shift());
            this.width--;
        }
        for (let x = this.width - 1; x >= 0; x--) {
            if (!seq(this.height, y => y << 4 | x).every(isEmpty))
                break;
            for (let y = this.height - 1; y >= 0; y--) {
                delete this.map[y << 4 | x];
                this.border[y << 4 | x] = 0;
            }
            this.width--;
        }
    }
    *[Symbol.iterator]() {
        for (const pos of this.allPos) {
            const scr = this.map[pos];
            if (scr != null)
                yield [pos, scr];
        }
    }
    get(pos, dir) {
        const pos2 = dir != null ? Pos.plus(pos, dir) : pos;
        if (!this.inBounds(pos2)) {
            return (this.border[pos] & (0xf << ((dir ^ 2) << 2)));
        }
        return this.map[pos2];
    }
    getEdge(pos, dir) {
        const scr = this.map[pos];
        if (scr == null)
            return undefined;
        return (scr >> Dir.shift(dir)) & 0xf;
    }
    getSpec(pos) {
        const scr = this.map[pos];
        return scr != null ? this.screens.get(scr) : scr;
    }
    setBorder(pos, dir, edge) {
        if (!this.inBounds(pos) || this.inBounds(Pos.plus(pos, dir))) {
            throw new Error(`Not on border: ${hex(pos)}, ${dir}`);
        }
        if (this.map[pos] != null)
            throw new Error(`Must set border first.`);
        const shift = (dir ^ 2) << 2;
        if (this.border[pos] & (0xf << shift))
            throw new Error(`Border already set`);
        this.border[pos] |= (edge << shift);
    }
    replaceEdge(pos, dir, edge) {
        const pos2 = Pos.plus(pos, dir);
        if (!this.inBounds(pos))
            throw new Error(`Out of bounds ${hex(pos)}`);
        if (!this.inBounds(pos2))
            throw new Error(`Out of bounds ${hex(pos2)}`);
        let scr1 = this.map[pos];
        let scr2 = this.map[pos2];
        if (scr1 == null)
            throw new Error(`No screen for ${hex(pos)}`);
        if (scr2 == null)
            throw new Error(`No screen for ${hex(pos2)}`);
        const mask1 = Dir.edgeMask(dir);
        const edge1 = edge << Dir.shift(dir);
        const mask2 = Dir.edgeMask(Dir.inv(dir));
        const edge2 = edge << Dir.shift(Dir.inv(dir));
        scr1 = ((scr1 & ~mask1) | edge1);
        scr2 = ((scr2 & ~mask2) | edge2);
        if (!this.screens.has(scr1))
            return false;
        if (!this.screens.has(scr2))
            return false;
        this.setInternal(pos, scr1);
        this.setInternal(pos2, scr2);
        return true;
    }
    setAndUpdate(pos, scr, opts = {}) {
        return this.saveExcursion(() => {
            const newOpts = typeof opts.fuzzy === 'function' ? opts.fuzzy(opts) : {
                ...opts,
                fuzzy: opts.fuzzy && opts.fuzzy - 1,
                replace: true,
            };
            this.setInternal(pos, scr);
            for (const dir of Dir.ALL) {
                if (!this.checkFit(pos, dir)) {
                    const pos2 = Pos.plus(pos, dir);
                    if (this.isFixed(pos2))
                        return false;
                    if (!this.fill(pos2, newOpts))
                        return false;
                }
            }
            return true;
        });
    }
    set(pos, screen, opts = {}) {
        const ok = opts.force ? true :
            opts.replace ? this.fits(pos, screen) :
                this.fitsAndEmpty(pos, screen);
        if (!ok) {
            const prev = this.map[pos];
            const hexPrev = prev != null ? hex5(prev) : 'empty';
            throw new Error(`Cannot overwrite ${hex(pos)} (${hexPrev}) with ${hex5(screen)}`);
        }
        if (!this.screens.has(screen))
            throw new Error(`No such screen ${hex5(screen)}`);
        if (this.inBounds(pos))
            this.setInternal(pos, screen);
    }
    trySet(pos, screen, opts = {}) {
        const ok = opts.force ? true :
            opts.replace ? this.fits(pos, screen) :
                this.fitsAndEmpty(pos, screen);
        if (!ok)
            return false;
        if (!this.screens.has(screen))
            throw new Error(`No such screen ${hex5(screen)}`);
        this.setInternal(pos, screen);
        return true;
    }
    replace(pos, screen) {
        if (!this.fits(pos, screen) || !this.inBounds(pos)) {
            throw new Error(`Cannot place ${hex5(screen)} at ${hex(pos)}`);
        }
        if (!this.screens.has(screen))
            throw new Error(`No such screen ${hex5(screen)}`);
        this.setInternal(pos, screen);
    }
    delete(pos) {
        this.setInternal(pos, null);
    }
    setInternal(pos, scr) {
        const prev = this.map[pos];
        if (scr == null) {
            this.map[pos] = undefined;
            if (this.counts && prev != null)
                this.counts.delete(prev);
            return;
        }
        this.map[pos] = scr;
        if (this.counts) {
            if (prev != null)
                this.counts.delete(prev);
            this.counts.add(scr);
        }
    }
    fitsAndEmpty(pos, screen) {
        return this.empty(pos) && this.fits(pos, screen);
    }
    empty(pos) {
        return this.map[pos] == null && this.inBounds(pos);
    }
    fits(pos, screen) {
        for (const dir of Dir.ALL) {
            const neighbor = this.get(pos, dir);
            if (neighbor == null)
                continue;
            if (Scr.edge(screen, dir) !== Scr.edge(neighbor, Dir.inv(dir))) {
                return false;
            }
        }
        return true;
    }
    checkFit(pos, dir) {
        const scr = this.get(pos);
        const neighbor = this.get(pos, dir);
        if (scr == null || neighbor == null)
            return true;
        if (Scr.edge(scr, dir) !== Scr.edge(neighbor, Dir.inv(dir))) {
            return false;
        }
        return true;
    }
    traverse(opts = {}) {
        const without = new Set(opts.without || []);
        const flagged = !opts.noFlagged;
        const uf = new UnionFind();
        for (const pos of this.allPos) {
            if (without.has(pos))
                continue;
            const scr = this.map[pos];
            if (scr == null)
                continue;
            const spec = this.screens.get(scr);
            if (spec == null)
                continue;
            for (const connection of spec.connections) {
                uf.union(connection.map(c => (pos << 8) + c));
            }
            if (spec.wall) {
                for (const connection of spec.wall.connections(flagged)) {
                    uf.union(connection.map(c => (pos << 8) + c));
                }
            }
            if (opts.flight && spec.connections.length && !spec.deadEnd) {
                uf.union(spec.connections.map(c => (pos << 8) + c[0]));
            }
        }
        const map = new Map();
        const sets = uf.sets();
        for (let i = 0; i < sets.length; i++) {
            const set = sets[i];
            for (const elem of set) {
                map.set(elem, set);
            }
        }
        return map;
    }
    consolidate(available, check, rom) {
        if (!this.counts || !this.extraTiles) {
            throw new Error(`Cannot run consolidate without counts.`);
        }
        const availableSet = new Set(available);
        const mutableScreens = new Set();
        for (const spec of this.screens.values()) {
            if (spec.fixed)
                continue;
            if (spec.tile < 0 || availableSet.has(spec.tile)) {
                mutableScreens.add(spec.edges);
            }
        }
        const extra = new Set();
        for (const [scr] of this.counts) {
            if (!mutableScreens.has(scr))
                extra.add(scr);
        }
        const target = extra.size + available.length;
        let attempts = 1000;
        while (this.counts.unique() > target && --attempts) {
            const sorted = [...this.counts]
                .filter((x) => mutableScreens.has(x[0]))
                .sort((a, b) => b[1] - a[1])
                .map(x => x[0]);
            const good = new Set(sorted.slice(0, available.length));
            const bad = new Set(sorted.slice(available.length));
            const shuffled = this.random.shuffle([...this.allPos]);
            for (const pos of shuffled) {
                if (!bad.has(this.map[pos]))
                    continue;
                if (this.tryConsolidate(pos, good, bad, check))
                    break;
            }
        }
        if (!attempts)
            return false;
        const used = new Set([...this.counts]
            .filter((x) => mutableScreens.has(x[0]))
            .map(x => x[0]));
        const freed = [];
        for (const scr of mutableScreens) {
            const spec = this.screens.get(scr);
            if (!spec)
                throw new Error('missing spec');
            if (spec.tile >= 0) {
                if (used.has(scr)) {
                    used.delete(scr);
                }
                else {
                    freed.push(spec.tile);
                }
            }
        }
        for (const scr of used) {
            const next = freed.pop();
            const spec = this.screens.get(scr);
            if (next == null || !spec)
                throw new Error(`No available screen`);
            rom.screens[next].tiles.splice(0, 0xf0, ...this.extraTiles[~spec.tile]);
            this.extraTilesMap[~spec.tile] = next;
        }
        return true;
    }
    tryConsolidate(pos, good, bad, check) {
        const scr = this.map[pos];
        if (scr == null)
            throw new Error(`Expected defined`);
        for (const newScr of this.random.shuffle([...good])) {
            const diff = scr ^ newScr;
            for (const dir of Dir.ALL) {
                const mask = Dir.edgeMask(dir);
                if (diff & ~mask)
                    continue;
                const pos2 = Pos.plus(pos, dir);
                const scr2 = this.map[pos2];
                if (scr2 == null)
                    break;
                if (!bad.has(scr2) && !good.has(scr2))
                    break;
                const edge = (newScr >>> Dir.shift(dir)) & 0xf;
                const dir2 = Dir.inv(dir);
                const mask2 = Dir.edgeMask(dir2);
                const newScr2 = ((scr2 & ~mask2) | (edge << Dir.shift(dir2)));
                if (bad.has(newScr2) && !bad.has(scr2))
                    break;
                const ok = this.saveExcursion(() => {
                    this.setInternal(pos, newScr);
                    this.setInternal(pos2, newScr2);
                    return check();
                });
                if (ok)
                    return true;
            }
        }
        return false;
    }
    show(hex = false) {
        const header = ' ' + seq(this.width).join('') + '\n';
        const body = seq(this.height, y => y.toString(16) + seq(this.width, x => {
            const pos = y << 4 | x;
            const scr = this.map[pos];
            if (hex) {
                return ' ' + (scr || 0).toString(16).padStart(5, '0');
            }
            if (scr == null)
                return ' ';
            const spec = this.screens.get(scr);
            if (spec)
                return spec.icon;
            let index = 0;
            for (const dir of Dir.ALL) {
                if (scr & (0xf << (dir << 2)))
                    index |= (1 << (dir << 2));
            }
            return UNICODE_TILES[index] || ' ';
        }).join('')).join('\n');
        return header + body;
    }
    write(loc, availableFlags) {
        for (const flag of loc.flags) {
            availableFlags.add(flag.flag);
        }
        let wallElement = 0;
        const wallSpawns = { 'wall': [], 'bridge': [] };
        for (const spawn of loc.spawns) {
            const type = spawn.wallType();
            if (type)
                wallSpawns[type].push(spawn);
            if (type === 'wall')
                wallElement = spawn.wallElement();
        }
        loc.flags = [];
        loc.width = this.width;
        loc.height = this.height;
        for (let y = 0; y < this.height; y++) {
            loc.screens[y] = [];
            for (let x = 0; x < this.width; x++) {
                const pos = y << 4 | x;
                const scr = this.map[pos];
                if (scr == null)
                    throw new Error(`Missing screen at pos ${hex(pos)}`);
                const spec = this.screens.get(scr);
                if (!spec)
                    throw new Error(`Missing spec for ${hex5(scr)} at ${hex(pos)}`);
                const tile = spec.tile < 0 ? this.extraTilesMap[~spec.tile] : spec.tile;
                loc.screens[y].push(tile);
                if (spec.flag)
                    loc.flags.push(Flag.of({ screen: pos, flag: 0x2f0 }));
                if (spec.wall) {
                    loc.flags.push(Flag.of({ screen: pos, flag: pop(availableFlags) }));
                    const spawn = wallSpawns[spec.wall.type].pop() || (() => {
                        const s = Spawn.of({ screen: pos, tile: spec.wall.tile,
                            type: 3,
                            id: spec.wall.type === 'wall' ? wallElement : 2 });
                        loc.spawns.push(s);
                        return s;
                    })();
                    spawn.screen = pos;
                    spawn.tile = spec.wall.tile;
                }
            }
        }
    }
    finish(survey, loc) {
        this.trim();
        const finisher = new MazeFinisher(this, loc, survey, this.random);
        if (!finisher.shuffleFixed())
            return fail('could not shuffle fixed', this);
        if (!finisher.placeExits())
            return fail('could not place exits', this);
        this.write(loc, new Set());
        finisher.placeNpcs();
        if (loc.rom.spoiler) {
            loc.rom.spoiler.addMaze(loc.id, loc.name, this.show());
        }
        return true;
    }
}
const DEBUG = false;
function fail(msg, maze) {
    if (DEBUG)
        console.error(`Reroll: ${msg}`);
    if (maze && DEBUG)
        console.log(maze.show());
    return false;
}
class MazeFinisher {
    constructor(maze, loc, survey, random) {
        this.maze = maze;
        this.loc = loc;
        this.survey = survey;
        this.random = random;
        this.poi = new DefaultMap(() => []);
        this.fixedPos = new DefaultMap(() => []);
        this.posMapping = new Map();
        this.allEdges = [[], [], [], []];
        this.fixedEdges = [[], [], [], []];
        this.allStairs = [[], [], [], []];
        this.stairDisplacements = new Map();
        for (const [pos, scr] of maze) {
            const spec = this.maze.getSpec(pos);
            if (spec.fixed)
                this.fixedPos.get(scr).push(pos);
            for (const { priority, dy, dx } of spec.poi) {
                this.poi.get(priority)
                    .push([((pos & 0xf0) << 4) + dy, ((pos & 0xf) << 8) + dx]);
            }
        }
        for (const dir of Dir.ALL) {
            for (const pos of Dir.allEdge(dir, maze.height, maze.width)) {
                const scr = maze.get(pos);
                if (!scr)
                    continue;
                const edgeType = Scr.edge(scr, dir);
                if (edgeType && edgeType != 7) {
                    if (maze.getSpec(pos).fixed) {
                        this.fixedEdges[dir].push(pos);
                    }
                    else {
                        this.allEdges[dir].push(pos);
                    }
                }
            }
        }
        for (const [pos, scr] of maze) {
            const dir = survey.specSet.stairScreens.get(scr);
            if (dir != null)
                this.allStairs[dir[0]].push([pos, dir[1]]);
        }
    }
    shuffleFixed() {
        for (const fixed of this.fixedPos.values())
            this.random.shuffle(fixed);
        for (const [pos0, spec] of this.survey.fixed) {
            const pos = this.fixedPos.get(spec.edges).pop();
            if (pos == null)
                return false;
            this.posMapping.set(pos0, pos);
        }
        return true;
    }
    placeExits() {
        this.loc.exits = [];
        for (const dir of Dir.ALL) {
            this.random.shuffle(this.allEdges[dir]);
            this.random.shuffle(this.fixedEdges[dir]);
        }
        this.random.shuffle(this.allStairs[Dir.UP]);
        this.random.shuffle(this.allStairs[Dir.DOWN]);
        for (const [pos0, exit] of this.survey.edges) {
            const edgeList = this.survey.fixed.has(pos0) ? this.fixedEdges : this.allEdges;
            const edge = edgeList[exit.dir].pop();
            if (edge == null)
                return false;
            this.posMapping.set(pos0, edge);
            const edgeType = Scr.edge(this.maze.get(edge), exit.dir);
            const edgeData = EDGE_TYPES[edgeType][exit.dir];
            this.loc.entrances[exit.entrance] =
                Entrance.of({ screen: edge, coord: edgeData.entrance });
            for (const tile of edgeData.exits) {
                this.loc.exits.push(Exit.of({ screen: edge, tile,
                    dest: exit.exit >>> 8, entrance: exit.exit & 0xff }));
            }
        }
        for (const [pos0, exit] of this.survey.stairs) {
            const stair = this.allStairs[exit.dir].pop();
            if (stair == null)
                throw new Error('missing stair');
            this.posMapping.set(pos0, stair[0]);
            const entrance = this.loc.entrances[exit.entrance];
            const x0 = entrance.tile & 0xf;
            const y0 = entrance.tile >>> 4;
            entrance.screen = stair[0];
            entrance.coord = stair[1].entrance;
            const x1 = entrance.tile & 0xf;
            const y1 = entrance.tile >>> 4;
            this.stairDisplacements.set(pos0, [y1 - y0, x1 - x0]);
            for (const tile of stair[1].exits) {
                this.loc.exits.push(Exit.of({
                    screen: stair[0], tile,
                    dest: exit.exit >>> 8, entrance: exit.exit & 0xff
                }));
            }
        }
        return true;
    }
    placeMonster(spawn, monsterPlacer) {
        const monster = this.loc.rom.objects[spawn.monsterId];
        if (!(monster instanceof Monster))
            return;
        const pos = monsterPlacer(monster);
        if (pos == null) {
            console.error(`no valid location for ${hex(monster.id)} in ${hex(this.loc.id)}`);
            spawn.used = false;
        }
        else {
            spawn.screen = pos >>> 8;
            spawn.tile = pos & 0xff;
        }
    }
    placeNpcs() {
        const spawnMap = new Map();
        const monsterPlacer = this.loc.monsterPlacer(this.random);
        for (const spawn of this.loc.spawns) {
            if (spawn.type === 3)
                continue;
            if (spawn.isMonster()) {
                this.placeMonster(spawn, monsterPlacer);
                continue;
            }
            const sameSpawn = spawnMap.get(spawn.y << 12 | spawn.x);
            if (sameSpawn != null) {
                spawn.y = sameSpawn >>> 12;
                spawn.x = sameSpawn & 0xfff;
                continue;
            }
            const pos0 = spawn.screen;
            const mapped = this.posMapping.get(pos0);
            if (mapped != null) {
                spawn.screen = mapped;
                const displacement = this.stairDisplacements.get(pos0);
                if (displacement != null) {
                    const [dy, dx] = displacement;
                    spawn.yt += dy;
                    spawn.xt += dx;
                }
            }
            else if (spawn.isTrigger()) {
                if (spawn.id === 0x8c) {
                    spawn.screen = this.posMapping.get(0x21) - 16;
                }
                else {
                    console.error(`unhandled trigger: ${spawn.id}`);
                }
            }
            else {
                const keys = [...this.poi.keys()].sort((a, b) => a - b);
                if (!keys.length)
                    throw new Error(`no poi`);
                for (const key of keys) {
                    const displacements = this.poi.get(key);
                    if (!displacements.length)
                        continue;
                    const oldSpawn = spawn.y << 12 | spawn.x;
                    const i = this.random.nextInt(displacements.length);
                    [[spawn.y, spawn.x]] = displacements.splice(i, 1);
                    spawnMap.set(oldSpawn, spawn.y << 12 | spawn.x);
                    if (!displacements.length)
                        this.poi.delete(key);
                    break;
                }
            }
        }
    }
}
function pop(set) {
    for (const elem of set) {
        set.delete(elem);
        return elem;
    }
    throw new Error(`cannot pop from empty set`);
}
const UNICODE_TILES = {
    0x1010: '\u2500',
    0x0101: '\u2502',
    0x0110: '\u250c',
    0x1100: '\u2510',
    0x0011: '\u2514',
    0x1001: '\u2518',
    0x0111: '\u251c',
    0x1101: '\u2524',
    0x1110: '\u252c',
    0x1011: '\u2534',
    0x1111: '\u253c',
    0x1000: '\u2574',
    0x0001: '\u2575',
    0x0010: '\u2576',
    0x0100: '\u2577',
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF6ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL21hemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFVBQVUsRUFBNkIsTUFBTSxXQUFXLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFHeEQsT0FBTyxFQUFXLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUMxQyxPQUFPLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5QyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDMUMsT0FBTyxFQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBRXZELE1BQU0sT0FBTyxJQUFJO0lBZWYsWUFBNkIsTUFBYyxFQUN4QixNQUFjLEVBQ2QsS0FBYSxFQUNwQixPQUF3QixFQUNQLFVBQXFDO1FBSnJDLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDeEIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFVBQUssR0FBTCxLQUFLLENBQVE7UUFFSCxlQUFVLEdBQVYsVUFBVSxDQUEyQjtRQU4xRCxrQkFBYSxHQUFhLEVBQUUsQ0FBQztRQU9uQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMs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RUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE1BQU0sRUFBRSxRQUFRO0NBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0VER0VfVFlQRVMsIEVudHJhbmNlU3BlYywgU3BlYywgU3VydmV5fSBmcm9tICcuL3NwZWMuanMnO1xuaW1wb3J0IHtEaXIsIERpck1hc2ssIFBhdGgsIFBvcywgU2NyfSBmcm9tICcuL3R5cGVzLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9uLCBGbGFnLCBTcGF3biwgRXhpdCwgRW50cmFuY2V9IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge01vbnN0ZXJ9IGZyb20gJy4uL3JvbS9tb25zdGVyLmpzJztcbmltcG9ydCB7aGV4LCBoZXg1LCBzZXF9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwLCBNdWx0aXNldCwgaXRlcnN9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5leHBvcnQgY2xhc3MgTWF6ZSBpbXBsZW1lbnRzIEl0ZXJhYmxlPFtQb3MsIFNjcl0+IHtcblxuICBwcml2YXRlIG1hcDogQXJyYXk8U2NyfHVuZGVmaW5lZD47XG4gIHByaXZhdGUgY291bnRzPzogTXVsdGlzZXQ8U2NyPjtcbiAgcHJpdmF0ZSBib3JkZXI6IEFycmF5PFNjcj47XG4gIC8vcHJpdmF0ZSBtYXBTdGFjazogQXJyYXk8QXJyYXk8U2NyfHVuZGVmaW5lZD4+ID0gW107XG5cbiAgcHJpdmF0ZSBzY3JlZW5zOiBNYXA8U2NyLCBTcGVjPjtcbiAgcHJpdmF0ZSBzY3JlZW5FeHRlbnNpb25zOiBEZWZhdWx0TWFwPG51bWJlciwgUmVhZG9ubHlBcnJheTxyZWFkb25seSBbRGlyLCBTY3JdPj47XG5cbiAgcHJpdmF0ZSBhbGxQb3M6IFNldDxQb3M+O1xuICBwcml2YXRlIGFsbFBvc0FycmF5OiByZWFkb25seSBQb3NbXTtcbiAgLy8gTWFwcGluZyB0byBhY3R1YWwgdGlsZSBzbG90cywgZnJvbSBjb25zb2xpZGF0ZVxuICBwcml2YXRlIGV4dHJhVGlsZXNNYXA6IG51bWJlcltdID0gW107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgcHVibGljIGhlaWdodDogbnVtYmVyLFxuICAgICAgICAgICAgICBwdWJsaWMgd2lkdGg6IG51bWJlcixcbiAgICAgICAgICAgICAgc2NyZWVuczogcmVhZG9ubHkgU3BlY1tdLFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IGV4dHJhVGlsZXM/OiBBcnJheTxyZWFkb25seSBudW1iZXJbXT4pIHtcbiAgICB0aGlzLm1hcCA9IG5ldyBBcnJheShoZWlnaHQgPDwgNCkuZmlsbCh1bmRlZmluZWQpO1xuICAgIHRoaXMuc2NyZWVucyA9IG5ldyBNYXAoc2NyZWVucy5tYXAoc3BlYyA9PiBbc3BlYy5lZGdlcywgc3BlY10pKTtcbiAgICB0aGlzLmFsbFBvcyA9IG5ldyBTZXQoXG4gICAgICAgIChbXSBhcyBQb3NbXSkuY29uY2F0KFxuICAgICAgICAgICAgLi4uc2VxKGhlaWdodCwgeSA9PiBzZXEod2lkdGgsIHggPT4gKHkgPDwgNCB8IHgpIGFzIFBvcykpKSk7XG4gICAgdGhpcy5hbGxQb3NBcnJheSA9IFsuLi50aGlzLmFsbFBvc107XG5cbiAgICBjb25zdCBleHRlbnNpb25zID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBBcnJheTxbRGlyLCBTY3JdPj4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgW3NjcmVlbiwgc3BlY10gb2YgdGhpcy5zY3JlZW5zKSB7XG4gICAgICBpZiAoc3BlYy5maXhlZCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBEaXIuQUxMKSB7XG4gICAgICAgIGNvbnN0IG1hc2sgPSAweGYgPDwgKGRpciA8PCAyKTtcbiAgICAgICAgaWYgKHNjcmVlbiAmIG1hc2spIHtcbiAgICAgICAgICBleHRlbnNpb25zLmdldChzY3JlZW4gJiB+bWFzayAmIDB4ZmZmZikucHVzaChbZGlyLCBzY3JlZW5dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnNjcmVlbkV4dGVuc2lvbnMgPSBleHRlbnNpb25zO1xuICAgIHRoaXMuYm9yZGVyID0gbmV3IEFycmF5KGhlaWdodCA8PCA0KS5maWxsKDAgYXMgU2NyKTtcbiAgICBpZiAoZXh0cmFUaWxlcykgdGhpcy5jb3VudHMgPSBuZXcgTXVsdGlzZXQoKTtcbiAgfVxuXG4gIC8vIEhpZ2hlci1sZXZlbCBmdW5jdGlvbmFsaXR5XG5cbiAgKiBhbHRlcm5hdGVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W1BvcywgbnVtYmVyLCBTY3IsIFNwZWNdPiB7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMubWFwW3Bvc107XG4gICAgICBpZiAoc2NyID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgZm9yIChsZXQgYml0ID0gMHgxXzAwMDA7IGJpdCA8IDB4MjBfMDAwMDsgYml0IDw8PSAxKSB7XG4gICAgICAgIGNvbnN0IG5ld1NjciA9IChzY3IgfCBiaXQpIGFzIFNjcjtcbiAgICAgICAgY29uc3Qgc3BlYyA9IHRoaXMuc2NyZWVucy5nZXQobmV3U2NyKTtcbiAgICAgICAgaWYgKCEoc2NyICYgYml0KSAmJiBzcGVjKSB7XG4gICAgICAgICAgeWllbGQgW3BvcywgYml0LCBuZXdTY3IsIHNwZWNdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2F2ZUV4Y3Vyc2lvbihmOiAoKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgbGV0IG0gPSBbLi4udGhpcy5tYXBdO1xuICAgIGxldCBjID0gdGhpcy5jb3VudHMgPyBbLi4udGhpcy5jb3VudHNdIDogbnVsbDtcbiAgICBsZXQgYiA9IFsuLi50aGlzLmJvcmRlcl07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChmKCkpIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5tYXAgPSBtO1xuICAgICAgdGhpcy5ib3JkZXIgPSBiO1xuICAgICAgaWYgKGMpIHRoaXMuY291bnRzID0gbmV3IE11bHRpc2V0KGMpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgICB0aGlzLm1hcCA9IG07XG4gICAgdGhpcy5ib3JkZXIgPSBiO1xuICAgIGlmIChjKSB0aGlzLmNvdW50cyA9IG5ldyBNdWx0aXNldChjKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgYWxsIHNjcmVlbnMgdGhhdCBjYW4gYmUgZXh0ZW5kZWQgd2l0aCBhbiBleHRyYSBleGl0LlxuICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHF1YWRzLiAgRm91cnRoIGVsZW1lbnQgaW4gdGhlIHF1YWQgaXNcbiAgICogYSBwYXJ0aXRpb24gaW5kZXgsIHdoaWNoIGluY2x1ZGVzIGV4aXQgdHlwZSBpbiB0aGUgbG93IG5pYmJsZS5cbiAgICovXG4gICogZXh0ZW5zaW9ucygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtQb3MsIFNjciwgRGlyLCBudW1iZXJdPiB7XG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPFBvcz4oKTtcbiAgICBjb25zdCBleHRlbnNpb25zOiBBcnJheTxbUG9zLCBTY3IsIERpciwgbnVtYmVyXT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcykge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5tYXBbcG9zXTtcbiAgICAgIGlmIChzY3IgPT0gbnVsbCkge1xuICAgICAgICAvLyBFbXB0eTogYnVpbGQgdXAgdGhlIHVuaW9uZmluZC5cbiAgICAgICAgZm9yIChjb25zdCBuZWlnaGJvciBvZiBbcG9zIC0gMSwgcG9zIC0gMTZdIGFzIFBvc1tdKSB7XG4gICAgICAgICAgaWYgKHRoaXMuZW1wdHkobmVpZ2hib3IpKSB7XG4gICAgICAgICAgICB1Zi51bmlvbihbcG9zLCBuZWlnaGJvcl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRmlsbGVkOiBmaW5kIGV4dGVuc2lvbnMuXG4gICAgICAgIGZvciAoY29uc3QgW2RpciwgZXh0XSBvZiB0aGlzLnNjcmVlbkV4dGVuc2lvbnMuZ2V0KHNjciAmIDB4ZmZmZikpIHtcbiAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlcmUncyBzcGFjZSBvbiB0aGF0IHNpZGUuXG4gICAgICAgICAgY29uc3QgbmVpZ2hib3IgPSBQb3MucGx1cyhwb3MsIGRpcik7XG4gICAgICAgICAgaWYgKCF0aGlzLm1hcFtuZWlnaGJvcl0gJiYgdGhpcy5pbkJvdW5kcyhuZWlnaGJvcikpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnMucHVzaChbcG9zLCBleHQsIGRpciwgMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGV4dCBvZiBleHRlbnNpb25zKSB7XG4gICAgICBjb25zdCBbcG9zLCAsIGRpcl0gPSBleHQ7XG4gICAgICBleHRbM10gPSB1Zi5maW5kKFBvcy5wbHVzKHBvcywgZGlyKSkgPDwgNCB8IFNjci5lZGdlKGV4dFsxXSwgZXh0WzJdKTtcbiAgICAgIHlpZWxkIGV4dDtcbiAgICB9XG4gIH1cblxuICAqIGVsaWdpYmxlKHBvczogUG9zLCBvcHRzOiBGaWxsT3B0cyA9IHt9KTogSXRlcmFibGVJdGVyYXRvcjxTY3I+IHtcbiAgICAvLyBCdWlsZCB1cCB0aGUgY29uc3RyYWludC5cbiAgICBjb25zdCB7YWxsb3dlZCwgc2tpcEFsdGVybmF0ZXMsIG1heEV4aXRzLCBlZGdlLCBmdXp6eSwgc3RhaXJ9ID0gb3B0cztcbiAgICBjb25zdCBkZWZhdWx0U2NyZWVuID1cbiAgICAgICAgZWRnZSAhPSBudWxsID8gZWRnZSB8IGVkZ2UgPDwgNCB8IGVkZ2UgPDwgOCB8IGVkZ2UgPDwgMTIgOiB1bmRlZmluZWQ7XG4gICAgbGV0IG1hc2sgPSAwO1xuICAgIGxldCBmdXp6eU1hc2sgPSAwO1xuICAgIGxldCBjb25zdHJhaW50ID0gMDtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBEaXIuQUxMKSB7XG4gICAgICBjb25zdCBlZGdlTWFzayA9IERpci5lZGdlTWFzayhkaXIpO1xuICAgICAgY29uc3QgaW52TWFzayA9IERpci5lZGdlTWFzayhEaXIuaW52KGRpcikpO1xuICAgICAgbGV0IHNjcmVlbiA9IHRoaXMuZ2V0KHBvcywgZGlyKTtcbiAgICAgIGlmIChzY3JlZW4gPT0gbnVsbCkgc2NyZWVuID0gZGVmYXVsdFNjcmVlbiBhcyBTY3IgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoc2NyZWVuID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgY29uc3RyYWludCB8PSAoKHNjcmVlbiAmIGludk1hc2spID4+PiA4IHwgKHNjcmVlbiAmIGludk1hc2spIDw8IDgpICYgMHhmZmZmO1xuICAgICAgbWFzayB8PSBlZGdlTWFzaztcbiAgICAgIGlmIChmdXp6eSAmJiB0aGlzLmlzRml4ZWQoUG9zLnBsdXMocG9zLCBkaXIpKSkgZnV6enlNYXNrIHw9IGVkZ2VNYXNrO1xuICAgIH1cbiAgICBpZiAoIWZ1enp5KSBmdXp6eU1hc2sgPSBtYXNrO1xuICAgIGNvbnN0IGZ1enp5Q29uc3RyYWludCA9IGNvbnN0cmFpbnQgJiBmdXp6eU1hc2s7XG4gICAgbGV0IHNjcmVlbnM6IFNjcltdID0gW107XG4gICAgbGV0IGZ1enppbmVzcyA9IEluZmluaXR5O1xuXG4gICAgLy8gTm93IGl0ZXJhdGUgb3ZlciBhdmFpbGFibGUgc2NyZWVucyB0byBmaW5kIG1hdGNoZXMuXG4gICAgY29uc3QgYWxsb3dlZE1hcDogSXRlcmFibGU8cmVhZG9ubHkgW1NjciwgU3BlYyB8IHVuZGVmaW5lZF0+ID1cbiAgICAgICAgYWxsb3dlZCA/XG4gICAgICAgICAgICBpdGVycy5tYXAoYWxsb3dlZCwgcyA9PiBbcywgdGhpcy5zY3JlZW5zLmdldChzKV0gYXMgY29uc3QpIDpcbiAgICAgICAgICAgIHRoaXMuc2NyZWVucztcbiAgICBmb3IgKGNvbnN0IFtzY3JlZW4sIHNwZWNdIG9mIGFsbG93ZWRNYXApIHtcbiAgICAgIGlmICghc3BlYykgdGhyb3cgbmV3IEVycm9yKGBCYWQgU2NyIGluICdhbGxvd2VkJyFgKVxuICAgICAgaWYgKHNwZWMuZml4ZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNraXBBbHRlcm5hdGVzICYmIChzcGVjLmVkZ2VzICYgfjB4ZmZmZikpIGNvbnRpbnVlO1xuICAgICAgaWYgKHN0YWlyICE9IG51bGwgJiYgIXNwZWMuc3RhaXJzLnNvbWUocyA9PiBzLmRpciA9PT0gc3RhaXIpKSBjb250aW51ZTtcbiAgICAgIGlmIChzdGFpciA9PSBudWxsICYmIHNwZWMuc3RhaXJzLmxlbmd0aCkgY29udGludWU7XG4gICAgICBpZiAoKHNjcmVlbiAmIGZ1enp5TWFzaykgIT09IGZ1enp5Q29uc3RyYWludCkgY29udGludWU7XG4gICAgICBpZiAobWF4RXhpdHMgJiYgU2NyLm51bUV4aXRzKHNjcmVlbikgPiBtYXhFeGl0cykgY29udGludWU7XG4gICAgICBpZiAoIWZ1enp5KSB7XG4gICAgICAgIHlpZWxkIHNjcmVlbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBmdXp6ID0gMDtcbiAgICAgICAgY29uc3QgY21wID0gKHNjcmVlbiAmIG1hc2spIF4gY29uc3RyYWludDtcbiAgICAgICAgZm9yIChjb25zdCBkIG9mIERpci5BTEwpIHtcbiAgICAgICAgICBpZiAoY21wICYgKDB4ZiA8PCBEaXIuc2hpZnQoZCkpKSBmdXp6Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZ1enogPCBmdXp6aW5lc3MpIHtcbiAgICAgICAgICBmdXp6aW5lc3MgPSBmdXp6O1xuICAgICAgICAgIHNjcmVlbnMgPSBbc2NyZWVuXTtcbiAgICAgICAgfSBlbHNlIGlmIChmdXp6ID09PSBmdXp6aW5lc3MpIHtcbiAgICAgICAgICBzY3JlZW5zLnB1c2goc2NyZWVuKTtcbiAgICAgICAgfVxuICAgICAgfSBcbiAgICB9XG4gICAgaWYgKGZ1enp5KSB5aWVsZCogc2NyZWVucztcbiAgfVxuXG4gIGZpbGwocG9zOiBQb3MsIG9wdHM6IEZpbGxPcHRzID0ge30pOiBib29sZWFuIHtcbiAgICAvLyBpZiAob3B0cy5lZGdlICE9IG51bGwpIHtcbiAgICAvLyAgIGNvbnN0IHtlZGdlLCAuLi5yZXN0fSA9IG9wdHM7XG4gICAgLy8gICBpZiAoT2JqZWN0LmtleXMocmVzdCkubGVuZ3RoKSB7XG4gICAgLy8gICAgIHRocm93IG5ldyBFcnJvcihgZWRnZSBvcHRpb24gaW5jb21wYXRpYmxlIHdpdGggcmVzdGApO1xuICAgIC8vICAgfVxuICAgIC8vIH1cbiAgICBpZiAob3B0cy5mb3JjZSAmJiBvcHRzLmZ1enp5KSB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWRgKTtcbiAgICBjb25zdCBlbGlnaWJsZSA9IFsuLi50aGlzLmVsaWdpYmxlKHBvcywgb3B0cyldO1xuICAgIGlmICghZWxpZ2libGUubGVuZ3RoKSB7XG4gICAgICAvL2NvbnNvbGUuZXJyb3IoYE5vIGVsaWdpYmxlIHRpbGVzIGZvciAke2hleChwb3MpfWApO1xuICAgICAgaWYgKG9wdHMuZGVsZXRlTmVpZ2hib3JzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgICAgICBjb25zdCBwb3MxID0gUG9zLnBsdXMocG9zLCBkaXIpO1xuICAgICAgICAgIGlmICghdGhpcy5pc0ZpeGVkKHBvczEpKSB0aGlzLnNldEludGVybmFsKHBvczEsIG51bGwpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChvcHRzLmZ1enp5KSB7XG4gICAgICByZXR1cm4gdGhpcy5zZXRBbmRVcGRhdGUocG9zLCB0aGlzLnJhbmRvbS5waWNrKGVsaWdpYmxlKSwgb3B0cyk7XG4gICAgfVxuICAgIHRoaXMuc2V0KHBvcywgdGhpcy5yYW5kb20ucGljayhlbGlnaWJsZSksIG9wdHMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gcG9zIHNob3VsZCBiZSB0aGUgbGFzdCBhbHJlYWR5LXNldCB0aWxlIGJlZm9yZSB0aGUgbmV3IG9uZXNcbiAgLy8gYWRkcyBOKzEgc2NyZWVucyB3aGVyZSBOIGlzIGxlbmd0aCBvZiBwYXRoXG4gIGZpbGxQYXRoKHBvczogUG9zLCBkaXI6IERpciwgcGF0aDogUGF0aCwgZXhpdFR5cGU6IG51bWJlciwgb3B0czogRmlsbE9wdHMgPSB7fSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNhdmVFeGN1cnNpb24oKCkgPT4ge1xuICAgICAgY29uc3QgcGF0aFNhdmVkID0gWy4uLnBhdGhdO1xuICAgICAgZm9yIChjb25zdCBzdGVwIG9mIHBhdGhTYXZlZCkge1xuICAgICAgICBjb25zdCBuZXh0RGlyID0gRGlyLnR1cm4oZGlyLCBzdGVwKTtcbiAgICAgICAgcG9zID0gUG9zLnBsdXMocG9zLCBkaXIpO1xuICAgICAgICBsZXQgc2NyZWVuID0gU2NyLmZyb21FeGl0cyhEaXJNYXNrLm9mKERpci5pbnYoZGlyKSwgbmV4dERpciksIGV4aXRUeXBlKTtcbiAgICAgICAgY29uc3QgYWx0cyA9IG9wdHMucGF0aEFsdGVybmF0aXZlcyAmJiBvcHRzLnBhdGhBbHRlcm5hdGl2ZXMuZ2V0KHNjcmVlbik7XG4gICAgICAgIGlmIChhbHRzKSBzY3JlZW4gPSAoc2NyZWVuIHwgKHRoaXMucmFuZG9tLnBpY2soYWx0cykgPDwgMTYpKSBhcyBTY3I7XG4gICAgICAgIGlmICghdGhpcy50cnlTZXQocG9zLCBzY3JlZW4sIG9wdHMpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGRpciA9IG5leHREaXI7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5maWxsKFBvcy5wbHVzKHBvcywgZGlyKSwgey4uLm9wdHMsIG1heEV4aXRzOiAyfSk7XG4gICAgICAvLyBUT0RPIC0gdG8gZmlsbCBhIHBhdGggZW5kaW5nIGluIGEgZGVhZCBlbmQsIHdlIG1heSB3YW50IHRvXG4gICAgICAvLyBwYXNzIGEgc2VwYXJhdGUgXCJvcHRzXCIgYW5kIHVzZSBtYXhFeGl0czogMS5cbiAgICB9KTtcbiAgfVxuXG4gIGZpbGxBbGwob3B0czogRmlsbE9wdHMgPSB7fSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGFsbFBvcyA9IG9wdHMuc2h1ZmZsZU9yZGVyID9cbiAgICAgICAgdGhpcy5yYW5kb20uc2h1ZmZsZShbLi4udGhpcy5hbGxQb3NdKSA6IHRoaXMuYWxsUG9zO1xuICAgIC8vIEZpbGwgdGhlIHJlc3Qgd2l0aCB6ZXJvXG4gICAgZm9yIChjb25zdCBwb3Mgb2YgYWxsUG9zKSB7XG4gICAgICBpZiAodGhpcy5tYXBbcG9zXSA9PSBudWxsKSB7XG4gICAgICAgIGlmICghdGhpcy5maWxsKHBvcywgb3B0cykpIHtcbiAgICAgICAgICBpZiAob3B0cy5wcmludCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYENvdWxkIG5vdCBmaWxsICR7aGV4KHBvcyl9XFxuJHt0aGlzLnNob3coKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG9wdHMuZnV6enkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGBmYWlsZWQgYXQgJHtoZXgocG9zKX1gKTsgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIC8vIH1cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaWxsICR7aGV4KHBvcyl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByYW5kb21Qb3MoKTogUG9zIHtcbiAgICByZXR1cm4gdGhpcy5yYW5kb20ucGljayh0aGlzLmFsbFBvc0FycmF5KTtcbiAgfVxuXG4gICAgICAvLyBUT0RPIC0gcGVyY29sYXRpb24hXG4gICAgICAvLyBiYWNrIG9mZiBvbiBcImZpeGVkXCIsIGp1c3QgaGF2ZSBhbiBcImFycmFuZ2VcIiBtZXRob2QgZm9yXG4gICAgICAvLyBlYWNoIGNhdmUsIGFuZCB0aGVuIHBlcmNvbGF0ZSgpIHRha2VzIGEgc2V0IG9mIGZpeGVkIHBvc1xuICAgICAgLy8gdGhhdCBpdCB3b24ndCB0b3VjaC5cbiAgICAgIC8vICAtIG1heWJlIHBlcmNvbGF0ZUVkZ2VzKGVkZ2UjKSB2cyBwZXJjb2xhdGVTY3JlZW4oc2NyIylcbiAgICAgIC8vICAtIGVhY2ggc3RlcCB1cGRhdGVzIG5laWdoYm9ycyAodW50aWwgaXQgcmVhY2hlcyBhIGN5Y2xlPylcblxuXG4gIC8vIH1cblxuICAvLyBNYXliZSB0cnkgdG8gXCJ1cGdyYWRlXCIgYSBwbGFpbiBzY3JlZW4/XG4gIGFkZFNjcmVlbihzY3I6IFNjcik6IFBvcyB8IHVuZGVmaW5lZCB7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5yYW5kb20uc2h1ZmZsZShbLi4udGhpcy5hbGxQb3NdKSkge1xuICAgICAgaWYgKHRoaXMubWFwW3Bvc10gIT0gbnVsbCkgY29udGludWU7XG4gICAgICBpZiAodGhpcy50cnlTZXQocG9zLCBzY3IpKSB7XG4gICAgICAgIHJldHVybiBwb3M7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBcblxuICAvLyAqIG9wZW5FeGl0cyhwb3M6IFBvcywgc2NyZWVuOiBTY3IpOiBJdGVyYWJsZUl0ZXJhdG9yPFtEaXIsIG51bWJlcl0+IHtcbiAgLy8gICBmb3IgKGNvbnN0IGRpciBvZiBEaXIuQUxMKSB7XG4gIC8vICAgICBjb25zdCBuZWlnaGJvciA9IFBvcy5wbHVzKHBvcywgZGlyKTtcbiAgLy8gICAgIGlmICh0aGlzLmluQm91bmRzKG5laWdoYm9yKSAmJiB0aGlzLm1hcFtuZWlnaGJvcl0gPT0gbnVsbCkge1xuICAvLyAgICAgICBjb25zdCBlZGdlID0gU2NyLmVkZ2Uoc2NyZWVuLCBkaXIpO1xuICAvLyAgICAgICBpZiAoZWRnZSkgeWllbGQgW2RpciwgZWRnZV07XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gKiBlbGlnaWJsZVR1bm5lbEV4aXRzKHBvczogUG9zKTogSXRlcmFibGVJdGVyYXRvcjxbU2NyLCBEaXIsIG51bWJlcl0+IHtcbiAgLy8gICBmb3IgKGNvbnN0IGVsaWdpYmxlIG9mIHRoaXMuZWxpZ2libGUocG9zLCAyKSkge1xuICAvLyAgICAgY29uc3QgW2V4aXQsIC4uLnJlc3RdID0gdGhpcy5vcGVuRXhpdHMocG9zLCBlbGlnaWJsZSk7XG4gIC8vICAgICBpZiAoIWV4aXQgfHwgcmVzdC5sZW5ndGgpIGNvbnRpbnVlO1xuICAvLyAgICAgY29uc3QgW2RpciwgZWRnZV0gPSBleGl0O1xuICAvLyAgICAgeWllbGQgW2VsaWdpYmxlLCBkaXIsIGVkZ2VdO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIGFkZERlYWRFbmQoKTogYm9vbGVhbiB7XG4gICAgLy8gRmluZCBhbiBleHRlbnNpb24gcG9pbnQuXG4gICAgLy8gRmluZCBhbiBhY2Nlc3NpYmxlIHRhcmdldC5cbiAgICAvLyBNYWtlIHRoZSBwYXRoIG9uZSBzY3JlZW4gYXQgYSB0aW1lLCB3aXRoIGEgMS8zIGNoYW5jZSBvZiBlbmRpbmcgaW4gYVxuICAgIC8vIGRlYWQgZW5kIGlmIG9uZSBpcyBhdmFpbGFibGUuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYWRkTG9vcChvcHRzOiBGaWxsT3B0cyA9IHt9KTogYm9vbGVhbiB7XG4gICAgLy8gRmluZCBhIHN0YXJ0L2VuZCBwYWlyLlxuICAgIGNvbnN0IGV4dHMgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIEFycmF5PFtQb3MsIFNjciwgRGlyLCBudW1iZXJdPj4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgW3Bvcywgc2NyLCBkaXIsIHBhcnRdIG9mIHRoaXMuZXh0ZW5zaW9ucygpKSB7XG4gICAgICBleHRzLmdldChwYXJ0KS5wdXNoKFtwb3MsIHNjciwgZGlyLCBwYXJ0ICYgMHhmXSk7XG4gICAgfVxuICAgIC8vIE1ha2Ugc3VyZSB0aGVyZSdzIGF0IGxlYXN0IDIgZXh0ZW5zaW9uIHBvaW50cyBpbiB0aGUgc2FtZSBwYXJ0aXRpb24uXG4gICAgY29uc3QgcGFydGl0aW9ucyA9IFsuLi5leHRzLnZhbHVlcygpXTtcbiAgICB0aGlzLnJhbmRvbS5zaHVmZmxlKHBhcnRpdGlvbnMpO1xuICAgIGxldCBwYXJ0aXRpb247XG4gICAgZG8ge1xuICAgICAgcGFydGl0aW9uID0gcGFydGl0aW9ucy5wb3AoKTtcbiAgICAgIGlmICghcGFydGl0aW9uKSByZXR1cm4gZmFsc2U7XG4gICAgfSB3aGlsZSAocGFydGl0aW9uLmxlbmd0aCA8IDIpO1xuICAgIHRoaXMucmFuZG9tLnNodWZmbGUocGFydGl0aW9uKTtcbiAgICBjb25zdCBbW3BvczEsIHNjcjEsIGRpcjEsIGV4aXRUeXBlXSwgW3BvczIsIHNjcjIsIGRpcjJdXSA9IHBhcnRpdGlvbjtcbiAgICByZXR1cm4gdGhpcy5zYXZlRXhjdXJzaW9uKCgpID0+IHtcbiAgICAgIHRoaXMucmVwbGFjZShwb3MxLCBzY3IxKTtcbiAgICAgIHRoaXMucmVwbGFjZShwb3MyLCBzY3IyKTtcbiAgICAgIC8vY29uc3Qgc3RhcnQgPSBQb3MucGx1cyhwb3MxLCBkaXIxKTtcbiAgICAgIGNvbnN0IGVuZCA9IFBvcy5wbHVzKHBvczIsIGRpcjIpO1xuICAgICAgaWYgKFBvcy5wbHVzKHBvczEsIGRpcjEpID09PSBlbmQpIHtcbiAgICAgICAgLy8gVHJpdmlhbCBjYXNlXG4gICAgICAgIHJldHVybiB0aGlzLmZpbGwoZW5kLCB7Li4ub3B0cywgbWF4RXhpdHM6IDIsIHJlcGxhY2U6IHRydWV9KTtcbiAgICAgIH1cbiAgICAgIC8vIEZpbmQgY2xlYXIgcGF0aCBnaXZlbiBleGl0IHR5cGVcbiAgICAgIGNvbnN0IFtmb3J3YXJkLCByaWdodF0gPSBQb3MucmVsYXRpdmUocG9zMSwgZGlyMSwgZW5kKTtcbiAgICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgICBmb3IgKGNvbnN0IHBhdGggb2YgUGF0aC5nZW5lcmF0ZSh0aGlzLnJhbmRvbSwgZm9yd2FyZCwgcmlnaHQpKSB7XG4gICAgICAgIGlmICh0aGlzLmZpbGxQYXRoKHBvczEsIGRpcjEsIHBhdGgsIGV4aXRUeXBlLCB7Li4ub3B0cywgcmVwbGFjZTogdHJ1ZX0pKSBicmVhaztcbiAgICAgICAgaWYgKCsrYXR0ZW1wdHMgPiAyMCkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gcmV0dXJuIHRoaXMuZmlsbChlbmQsIDIpOyAvLyBoYW5kbGVkIGluIGZpbGxQYXRoXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHBvczEgYW5kIHBvczIgYXJlIHBvcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIGZpbGxlZCwgd2l0aCBhbiBlbXB0eSBuZWlnaGJvclxuICBjb25uZWN0KHBvczE6IFBvcywgZGlyMT86IERpcnxudWxsLCBwb3MyPzogUG9zfG51bGwsIGRpcjI/OiBEaXJ8bnVsbCxcbiAgICAgICAgICBvcHRzPzogRmlsbE9wdHMpOiBib29sZWFuIHtcbiAgICAvLyBJbmZlciBkaXJlY3Rpb25zIGlmIG5lY2Vzc2FyeVxuICAgIGlmIChkaXIxID09IG51bGwpIGRpcjEgPSB0aGlzLmZpbmRFbXB0eURpcihwb3MxKTtcbiAgICBpZiAoZGlyMSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgZXhpdFR5cGUgPSBTY3IuZWRnZSh0aGlzLm1hcFtwb3MxXSB8fCAwIGFzIFNjciwgZGlyMSk7XG4gICAgLy8gSWYgb25seSBvbmUgcG9zIGlzIGdpdmVuLCBjb25uZWN0IHRvIGFueSBleGlzdGluZyBwYXRoLlxuICAgIC8vIFRPRE8gLSBmb3Igbm93IHdlIGNvbm5lY3QgYXQgdGhlIGNsb3Nlc3QgcG9zc2libGUgcG9pbnQsIGluIGFuIGF0dGVtcHRcbiAgICAvLyAgICAgICAgdG8gYXZvaWQgcmlkaWN1bG91c2x5IGNpcmN1aXRvdXMgcGF0aHMuICBNYXkgbm90IGJlIG5lY2Vzc2FyeT9cbiAgICBpZiAocG9zMiA9PSBudWxsKSB7XG4gICAgICAvLyBGb3IgZWFjaCBwb3NzaWJpbGl0eSwgc3RvcmUgdGhlIGRpc3RhbmNlIHRvIHBvczEuXG4gICAgICBjb25zdCBleHRzOiBBcnJheTxbUG9zLCBTY3IsIG51bWJlcl0+ID0gW107XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHNjciwsIGV4aXRdIG9mIHRoaXMuZXh0ZW5zaW9ucygpKSB7XG4gICAgICAgIGlmICgoZXhpdCAmIDB4ZikgPT09IGV4aXRUeXBlKSB7XG4gICAgICAgICAgLy9jb25zdCBuID0gUG9zLnBsdXMocG9zLCBkaXIpO1xuICAgICAgICAgIGV4dHMucHVzaChbcG9zLCBzY3IsIDBdKTsgLy8gUG9zLmh5cG90KG4sIHBvczEpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghZXh0cy5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAgIGNvbnN0IGV4dCA9IHRoaXMucmFuZG9tLnBpY2soZXh0cyk7XG4gICAgICB0aGlzLnJlcGxhY2UoKHBvczIgPSBleHRbMF0pLCBleHRbMV0pO1xuICAgIH1cblxuICAgIGlmIChkaXIyID09IG51bGwpIGRpcjIgPSB0aGlzLmZpbmRFbXB0eURpcihwb3MyKTtcbiAgICBpZiAoZGlyMSA9PSBudWxsIHx8IGRpcjIgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIE5vdyBzdGFydCB3b3JraW5nXG4gICAgaWYgKGV4aXRUeXBlICE9PSBTY3IuZWRnZSh0aGlzLm1hcFtwb3MyXSB8fCAwIGFzIFNjciwgZGlyMikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW5jb21wYXRpYmxlIGV4aXQgdHlwZXNgKTtcbiAgICB9XG4gICAgcG9zMiA9IFBvcy5wbHVzKHBvczIsIGRpcjIpO1xuICAgIGNvbnN0IFtmb3J3YXJkLCByaWdodF0gPSBQb3MucmVsYXRpdmUocG9zMSwgZGlyMSwgcG9zMik7XG4gICAgLy9wb3MxID0gUG9zLnBsdXMocG9zMSwgZGlyMSk7XG4gICAgbGV0IGF0dGVtcHRzID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgUGF0aC5nZW5lcmF0ZSh0aGlzLnJhbmRvbSwgZm9yd2FyZCwgcmlnaHQpKSB7XG4gICAgICBpZiAodGhpcy5maWxsUGF0aChwb3MxLCBkaXIxLCBwYXRoLCBleGl0VHlwZSwgb3B0cykpIGJyZWFrO1xuICAgICAgaWYgKCsrYXR0ZW1wdHMgPiAyMCkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyByZXR1cm4gdGhpcy5maWxsKHBvczIsIDIpOyAvLyBoYW5kbGVkIGluIGZpbGxQYXRoXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIGZpbmRFbXB0eURpcihwb3M6IFBvcyk6IERpcnxudWxsIHtcbiAgICBjb25zdCBzY3IgPSB0aGlzLm1hcFtwb3NdO1xuICAgIGlmIChzY3IgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgZGlycyA9IFtdO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgIGlmIChTY3IuZWRnZShzY3IsIGRpcikgJiYgdGhpcy5lbXB0eShQb3MucGx1cyhwb3MsIGRpcikpKSB7XG4gICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGlycy5sZW5ndGggPT09IDEgPyBkaXJzWzBdIDogbnVsbDtcbiAgfVxuXG4gIC8vIC8vIEFzc3VtZXMgYWxsIDYgdHVubmVsIHNjcmVlbnMgYXJlIGF2YWlsYWJsZSBmb3IgZWFjaCBleGl0IHR5cGUuXG4gIC8vIG1ha2VMb29wKHN0YXJ0OiBQb3MsIHN0YXJ0RGlyOiBEaXIsIGVuZDogUG9zKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRoaXMuc2F2ZUV4Y3Vyc2lvbigoKSA9PiB7XG4gIC8vICAgICBjb25zdCBbZm9yd2FyZCwgcmlnaHRdID0gUG9zLnJlbGF0aXZlKHN0YXJ0LCBzdGFydERpciwgZW5kKTtcblxuICAvLyAgICAgLy8gY29uc3QgdmVydGljYWwgPSAoZXhpdFR5cGUgPDwgOCB8IGV4aXRUeXBlKSBhcyBTY3I7XG4gIC8vICAgICAvLyBjb25zdCBob3Jpem9udGFsID0gKHZlcnRpY2FsIDw8IDQpIGFzIFNjcjtcbiAgLy8gICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gIC8vICAgICBmb3IgKGNvbnN0IHBhdGggb2YgZ2VuZXJhdGVQYXRocyh0aGlzLnJhbmRvbSwgZm9yd2FyZCwgcmlnaHQpKSB7XG4gIC8vICAgICAgIGlmICh0aGlzLmZpbGxQYXRoKHN0YXJ0LCBzdGFydERpciwgcGF0aCwgZXhpdFR5cGUpKSBicmVhaztcbiAgLy8gICAgICAgaWYgKCsrYXR0ZW1wdHMgPiAyMCkgcmV0dXJuIGZhbHNlO1xuICAvLyAgICAgICAvLyBUT0RPIC0gaG93IG1hbnkgdHJpZXMgYmVmb3JlIHdlIGdpdmUgdXA/XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vIH1cblxuICAvLyAvLyBUZW1wb3JhcmlseSBzYXZlIHRoZSBzdGF0ZSB0byB0cnkgYW4gZXhwZXJpbWVudGFsIGNoYW5nZS5cbiAgLy8gcHVzaCgpOiB2b2lkIHtcbiAgLy8gICB0aGlzLm1hcFN0YWNrLnB1c2goWy4uLnRoaXMubWFwXSk7XG4gIC8vIH1cblxuICAvLyBwb3AoKTogdm9pZCB7XG4gIC8vICAgY29uc3QgbWFwID0gdGhpcy5tYXBTdGFjay5wb3AoKTtcbiAgLy8gICBpZiAoIW1hcCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgcG9wIHdpdGhvdXQgcHVzaGApO1xuICAvLyAgIHRoaXMubWFwID0gbWFwO1xuICAvLyB9XG5cbiAgaW5Cb3VuZHMocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcG9zID49IDAgJiYgKHBvcyAmIDB4ZikgPCB0aGlzLndpZHRoICYmIChwb3MgPj4+IDQpIDwgdGhpcy5oZWlnaHQ7XG4gIH1cblxuICBpc0ZpeGVkKHBvczogUG9zKTogYm9vbGVhbiB7XG4gICAgaWYgKCF0aGlzLmluQm91bmRzKHBvcykpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHNjciA9IHRoaXMubWFwW3Bvc107XG4gICAgaWYgKHNjciA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3Qgc3BlYyA9IHRoaXMuc2NyZWVucy5nZXQoc2NyKTtcbiAgICByZXR1cm4gISEoc3BlYyAhPSBudWxsICYmIChzcGVjLmZpeGVkIHx8IHNwZWMuc3RhaXJzLmxlbmd0aCkpXG4gIH1cblxuICBkZW5zaXR5KCk6IG51bWJlciB7XG4gICAgY29uc3QgY291bnQgPSB0aGlzLmFsbFBvc0FycmF5LmZpbHRlcihwb3MgPT4gdGhpcy5tYXBbcG9zXSkubGVuZ3RoO1xuICAgIHJldHVybiBjb3VudCAvICh0aGlzLndpZHRoICogdGhpcy5oZWlnaHQpO1xuICB9XG5cbiAgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmFsbFBvc0FycmF5LmZpbHRlcihwb3MgPT4gdGhpcy5tYXBbcG9zXSkubGVuZ3RoO1xuICB9XG5cbiAgLyoqIFRyaW0gdGhlIHNpemUgb2YgdGhlIG1hcCBieSByZW1vdmluZyBlbXB0eSByb3dzL2NvbHVtbnMuICovXG4gIHRyaW0oKTogdm9pZCB7XG4gICAgLy8gRmlyc3QgZmlndXJlIG91dCB3aGljaCBzY3JlZW5zIGFyZSBhY3R1YWxseSBcImVtcHR5XCIuXG4gICAgY29uc3QgZW1wdHkgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHNwZWMgb2YgdGhpcy5zY3JlZW5zLnZhbHVlcygpKSB7XG4gICAgICBpZiAoIXNwZWMuZWRnZXMpIGVtcHR5LmFkZChzcGVjLnRpbGUpO1xuICAgIH1cbiAgICBjb25zdCBpc0VtcHR5ID0gKHBvczogbnVtYmVyKSA9PlxuICAgICAgICAhdGhpcy5tYXBbcG9zXSB8fCBlbXB0eS5oYXModGhpcy5zY3JlZW5zLmdldCh0aGlzLm1hcFtwb3NdISkhLnRpbGUpO1xuICAgIC8vIE5vdyBnbyB0aHJvdWdoIHJvd3MgYW5kIGNvbHVtbnMgZnJvbSB0aGUgZWRnZXMgdG8gZmluZCBlbXB0aWVzLlxuICAgIGZvciAoY29uc3QgeSA9IDA7Oykge1xuICAgICAgaWYgKCFzZXEodGhpcy53aWR0aCwgeCA9PiB5IDw8IDQgfCB4KS5ldmVyeShpc0VtcHR5KSkgYnJlYWs7XG4gICAgICB0aGlzLm1hcC5zcGxpY2UoMCwgMTYpXG4gICAgICB0aGlzLmJvcmRlci5zcGxpY2UoMCwgMTYpO1xuICAgICAgdGhpcy5oZWlnaHQtLTtcbiAgICB9XG4gICAgZm9yIChsZXQgeSA9IHRoaXMuaGVpZ2h0IC0gMTsgeSA+PSAwOyB5LS0pIHtcbiAgICAgIGlmICghc2VxKHRoaXMud2lkdGgsIHggPT4geSA8PCA0IHwgeCkuZXZlcnkoaXNFbXB0eSkpIGJyZWFrO1xuICAgICAgdGhpcy5tYXAuc3BsaWNlKCh0aGlzLmhlaWdodCAtIDEpIDw8IDQsIDE2KTtcbiAgICAgIHRoaXMuYm9yZGVyLnNwbGljZSgodGhpcy5oZWlnaHQgLSAxKSA8PCA0LCAxNik7XG4gICAgICB0aGlzLmhlaWdodC0tO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHggPSAwOzspIHtcbiAgICAgIGlmICghc2VxKHRoaXMuaGVpZ2h0LCB5ID0+IHkgPDwgNCB8IHgpLmV2ZXJ5KGlzRW1wdHkpKSBicmVhaztcbiAgICAgIGZvciAobGV0IHkgPSB0aGlzLmhlaWdodCAtIDE7IHkgPj0gMDsgeS0tKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLm1hcFt5IDw8IDQgfCB4XTtcbiAgICAgICAgdGhpcy5ib3JkZXJbeSA8PCA0IHwgeF0gPSAwIGFzIFNjcjtcbiAgICAgIH1cbiAgICAgIHRoaXMubWFwLnB1c2godGhpcy5tYXAuc2hpZnQoKSk7XG4gICAgICB0aGlzLndpZHRoLS07XG4gICAgfVxuICAgIGZvciAobGV0IHggPSB0aGlzLndpZHRoIC0gMTsgeCA+PSAwOyB4LS0pIHtcbiAgICAgIGlmICghc2VxKHRoaXMuaGVpZ2h0LCB5ID0+IHkgPDwgNCB8IHgpLmV2ZXJ5KGlzRW1wdHkpKSBicmVhaztcbiAgICAgIGZvciAobGV0IHkgPSB0aGlzLmhlaWdodCAtIDE7IHkgPj0gMDsgeS0tKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLm1hcFt5IDw8IDQgfCB4XTtcbiAgICAgICAgdGhpcy5ib3JkZXJbeSA8PCA0IHwgeF0gPSAwIGFzIFNjcjtcbiAgICAgIH1cbiAgICAgIHRoaXMud2lkdGgtLTtcbiAgICB9XG4gIH1cblxuICAqIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W1BvcywgU2NyXT4ge1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLm1hcFtwb3NdO1xuICAgICAgaWYgKHNjciAhPSBudWxsKSB5aWVsZCBbcG9zLCBzY3JdO1xuICAgIH1cbiAgfVxuXG4gIGdldChwb3M6IFBvcywgZGlyPzogRGlyKTogU2NyIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBwb3MyID0gZGlyICE9IG51bGwgPyBQb3MucGx1cyhwb3MsIGRpcikgOiBwb3M7XG4gICAgaWYgKCF0aGlzLmluQm91bmRzKHBvczIpKSB7XG4gICAgICByZXR1cm4gKHRoaXMuYm9yZGVyW3Bvc10gJiAoMHhmIDw8ICgoZGlyISBeIDIpIDw8IDIpKSkgYXMgU2NyO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tYXBbcG9zMl07XG4gIH1cblxuICBnZXRFZGdlKHBvczogUG9zLCBkaXI6IERpcik6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc2NyID0gdGhpcy5tYXBbcG9zXTtcbiAgICBpZiAoc2NyID09IG51bGwpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIChzY3IgPj4gRGlyLnNoaWZ0KGRpcikpICYgMHhmO1xuICB9XG5cbiAgZ2V0U3BlYyhwb3M6IFBvcyk6IFNwZWMgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHNjciA9IHRoaXMubWFwW3Bvc107XG4gICAgcmV0dXJuIHNjciAhPSBudWxsID8gdGhpcy5zY3JlZW5zLmdldChzY3IpIDogc2NyO1xuICB9XG5cbiAgc2V0Qm9yZGVyKHBvczogUG9zLCBkaXI6IERpciwgZWRnZTogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmluQm91bmRzKHBvcykgfHwgdGhpcy5pbkJvdW5kcyhQb3MucGx1cyhwb3MsIGRpcikpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBvbiBib3JkZXI6ICR7aGV4KHBvcyl9LCAke2Rpcn1gKTsgLy8gYFxuICAgIH1cbiAgICBpZiAodGhpcy5tYXBbcG9zXSAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE11c3Qgc2V0IGJvcmRlciBmaXJzdC5gKTtcbiAgICBjb25zdCBzaGlmdCA9IChkaXIgXiAyKSA8PCAyO1xuICAgIGlmICh0aGlzLmJvcmRlcltwb3NdICYgKDB4ZiA8PCBzaGlmdCkpIHRocm93IG5ldyBFcnJvcihgQm9yZGVyIGFscmVhZHkgc2V0YCk7XG4gICAgKHRoaXMuYm9yZGVyW3Bvc10gYXMgbnVtYmVyKSB8PSAoZWRnZSA8PCBzaGlmdCk7XG4gIH1cblxuICByZXBsYWNlRWRnZShwb3M6IFBvcywgZGlyOiBEaXIsIGVkZ2U6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHBvczIgPSBQb3MucGx1cyhwb3MsIGRpcik7XG4gICAgaWYgKCF0aGlzLmluQm91bmRzKHBvcykpIHRocm93IG5ldyBFcnJvcihgT3V0IG9mIGJvdW5kcyAke2hleChwb3MpfWApO1xuICAgIGlmICghdGhpcy5pbkJvdW5kcyhwb3MyKSkgdGhyb3cgbmV3IEVycm9yKGBPdXQgb2YgYm91bmRzICR7aGV4KHBvczIpfWApO1xuICAgIGxldCBzY3IxID0gdGhpcy5tYXBbcG9zXTtcbiAgICBsZXQgc2NyMiA9IHRoaXMubWFwW3BvczJdO1xuICAgIGlmIChzY3IxID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTm8gc2NyZWVuIGZvciAke2hleChwb3MpfWApO1xuICAgIGlmIChzY3IyID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTm8gc2NyZWVuIGZvciAke2hleChwb3MyKX1gKTtcbiAgICBjb25zdCBtYXNrMSA9IERpci5lZGdlTWFzayhkaXIpO1xuICAgIGNvbnN0IGVkZ2UxID0gZWRnZSA8PCBEaXIuc2hpZnQoZGlyKTtcbiAgICBjb25zdCBtYXNrMiA9IERpci5lZGdlTWFzayhEaXIuaW52KGRpcikpO1xuICAgIGNvbnN0IGVkZ2UyID0gZWRnZSA8PCBEaXIuc2hpZnQoRGlyLmludihkaXIpKTtcbiAgICBzY3IxID0gKChzY3IxICYgfm1hc2sxKSB8IGVkZ2UxKSBhcyBTY3I7XG4gICAgc2NyMiA9ICgoc2NyMiAmIH5tYXNrMikgfCBlZGdlMikgYXMgU2NyO1xuICAgIGlmICghdGhpcy5zY3JlZW5zLmhhcyhzY3IxKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5zY3JlZW5zLmhhcyhzY3IyKSkgcmV0dXJuIGZhbHNlO1xuICAgIHRoaXMuc2V0SW50ZXJuYWwocG9zLCBzY3IxKTtcbiAgICB0aGlzLnNldEludGVybmFsKHBvczIsIHNjcjIpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc2V0QW5kVXBkYXRlKHBvczogUG9zLCBzY3I6IFNjciwgb3B0czogRmlsbE9wdHMgPSB7fSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNhdmVFeGN1cnNpb24oKCkgPT4ge1xuICAgICAgY29uc3QgbmV3T3B0cyA9IHR5cGVvZiBvcHRzLmZ1enp5ID09PSAnZnVuY3Rpb24nID8gb3B0cy5mdXp6eShvcHRzKSA6IHtcbiAgICAgICAgLi4ub3B0cyxcbiAgICAgICAgZnV6enk6IG9wdHMuZnV6enkgJiYgb3B0cy5mdXp6eSAtIDEsXG4gICAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICB9O1xuICAgICAgdGhpcy5zZXRJbnRlcm5hbChwb3MsIHNjcik7XG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBEaXIuQUxMKSB7XG4gICAgICAgIGlmICghdGhpcy5jaGVja0ZpdChwb3MsIGRpcikpIHtcbiAgICAgICAgICBjb25zdCBwb3MyID0gUG9zLnBsdXMocG9zLCBkaXIpO1xuICAgICAgICAgIGlmICh0aGlzLmlzRml4ZWQocG9zMikpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICBpZiAoIXRoaXMuZmlsbChwb3MyLCBuZXdPcHRzKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIE5PVEU6IGl0J3Mgbm90IHJlcXVpcmVkIHRoYXQgc2NyZWVuIGJlIGFuIGVsZW1lbnQgb2YgdGhpcy5zY3JlZW5zLlxuICBzZXQocG9zOiBQb3MsIHNjcmVlbjogU2NyLCBvcHRzOiBGaWxsT3B0cyA9IHt9KTogdm9pZCB7XG4gICAgLy8gVE9ETyAtIGluc3RlYWQgb2YgZm9yY2UsIGNvbnNpZGVyIGFsbG93aW5nIE9VVFNJREUgRURHRVMgdG8gYmUgbm9uLXplcm8/XG4gICAgLy8gICAgICAtIG1heWJlIHVzZSB0aGUgYm9yZGVyPyBvciBhIHNlcGFyYXRlIGFycmF5P1xuICAgIGNvbnN0IG9rID0gb3B0cy5mb3JjZSA/IHRydWUgOlxuICAgICAgICBvcHRzLnJlcGxhY2UgPyB0aGlzLmZpdHMocG9zLCBzY3JlZW4pIDpcbiAgICAgICAgdGhpcy5maXRzQW5kRW1wdHkocG9zLCBzY3JlZW4pO1xuICAgIGlmICghb2spIHtcbiAgICAgIGNvbnN0IHByZXYgPSB0aGlzLm1hcFtwb3NdO1xuICAgICAgY29uc3QgaGV4UHJldiA9IHByZXYgIT0gbnVsbCA/IGhleDUocHJldikgOiAnZW1wdHknO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3Qgb3ZlcndyaXRlICR7aGV4KHBvcyl9ICgke2hleFByZXZ9KSB3aXRoICR7aGV4NShzY3JlZW4pfWApO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuc2NyZWVucy5oYXMoc2NyZWVuKSkgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHNjcmVlbiAke2hleDUoc2NyZWVuKX1gKTtcbiAgICBpZiAodGhpcy5pbkJvdW5kcyhwb3MpKSB0aGlzLnNldEludGVybmFsKHBvcywgc2NyZWVuKTtcbiAgfVxuXG4gIHRyeVNldChwb3M6IFBvcywgc2NyZWVuOiBTY3IsIG9wdHM6IEZpbGxPcHRzID0ge30pOiBib29sZWFuIHtcbiAgICBjb25zdCBvayA9IG9wdHMuZm9yY2UgPyB0cnVlIDpcbiAgICAgICAgb3B0cy5yZXBsYWNlID8gdGhpcy5maXRzKHBvcywgc2NyZWVuKSA6XG4gICAgICAgIHRoaXMuZml0c0FuZEVtcHR5KHBvcywgc2NyZWVuKTtcbiAgICBpZiAoIW9rKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLnNjcmVlbnMuaGFzKHNjcmVlbikpIHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBzY3JlZW4gJHtoZXg1KHNjcmVlbil9YCk7XG4gICAgdGhpcy5zZXRJbnRlcm5hbChwb3MsIHNjcmVlbik7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXBsYWNlKHBvczogUG9zLCBzY3JlZW46IFNjcik6IHZvaWQge1xuICAgIGlmICghdGhpcy5maXRzKHBvcywgc2NyZWVuKSB8fCAhdGhpcy5pbkJvdW5kcyhwb3MpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBwbGFjZSAke2hleDUoc2NyZWVuKX0gYXQgJHtoZXgocG9zKX1gKTsgLy8gYFxuICAgIH1cbiAgICBpZiAoIXRoaXMuc2NyZWVucy5oYXMoc2NyZWVuKSkgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIHNjcmVlbiAke2hleDUoc2NyZWVuKX1gKTsgLy8gYFxuICAgIHRoaXMuc2V0SW50ZXJuYWwocG9zLCBzY3JlZW4pO1xuICB9XG5cbiAgZGVsZXRlKHBvczogUG9zKTogdm9pZCB7XG4gICAgdGhpcy5zZXRJbnRlcm5hbChwb3MsIG51bGwpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRJbnRlcm5hbChwb3M6IFBvcywgc2NyOiBTY3IgfCBudWxsKTogdm9pZCB7XG4gICAgY29uc3QgcHJldiA9IHRoaXMubWFwW3Bvc107XG4gICAgaWYgKHNjciA9PSBudWxsKSB7XG4gICAgICB0aGlzLm1hcFtwb3NdID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKHRoaXMuY291bnRzICYmIHByZXYgIT0gbnVsbCkgdGhpcy5jb3VudHMuZGVsZXRlKHByZXYpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLm1hcFtwb3NdID0gc2NyO1xuICAgIGlmICh0aGlzLmNvdW50cykge1xuICAgICAgaWYgKHByZXYgIT0gbnVsbCkgdGhpcy5jb3VudHMuZGVsZXRlKHByZXYpO1xuICAgICAgdGhpcy5jb3VudHMuYWRkKHNjcik7XG4gICAgfVxuICB9XG5cbiAgZml0c0FuZEVtcHR5KHBvczogUG9zLCBzY3JlZW46IFNjcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmVtcHR5KHBvcykgJiYgdGhpcy5maXRzKHBvcywgc2NyZWVuKTtcbiAgfVxuXG4gIGVtcHR5KHBvczogUG9zKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubWFwW3Bvc10gPT0gbnVsbCAmJiB0aGlzLmluQm91bmRzKHBvcyk7XG4gIH1cblxuICBmaXRzKHBvczogUG9zLCBzY3JlZW46IFNjcik6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgIGNvbnN0IG5laWdoYm9yID0gdGhpcy5nZXQocG9zLCBkaXIpO1xuICAgICAgaWYgKG5laWdoYm9yID09IG51bGwpIGNvbnRpbnVlOyAvLyBhbnl0aGluZyBpcyBmYWlyIGdhbWVcbiAgICAgIGlmIChTY3IuZWRnZShzY3JlZW4sIGRpcikgIT09IFNjci5lZGdlKG5laWdoYm9yLCBEaXIuaW52KGRpcikpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjaGVja0ZpdChwb3M6IFBvcywgZGlyOiBEaXIpOiBib29sZWFuIHtcbiAgICBjb25zdCBzY3IgPSB0aGlzLmdldChwb3MpO1xuICAgIGNvbnN0IG5laWdoYm9yID0gdGhpcy5nZXQocG9zLCBkaXIpO1xuICAgIGlmIChzY3IgPT0gbnVsbCB8fCBuZWlnaGJvciA9PSBudWxsKSByZXR1cm4gdHJ1ZTsgLy8gYW55dGhpbmcgaXMgZmFpciBnYW1lXG4gICAgaWYgKFNjci5lZGdlKHNjciwgZGlyKSAhPT0gU2NyLmVkZ2UobmVpZ2hib3IsIERpci5pbnYoZGlyKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB0cmF2ZXJzZShvcHRzOiBUcmF2ZXJzZU9wdHMgPSB7fSk6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PiB7XG4gICAgLy8gUmV0dXJucyBhIG1hcCBmcm9tIHVuaW9uZmluZCByb290IHRvIGEgbGlzdCBvZiBhbGwgcmVhY2hhYmxlIHRpbGVzLlxuICAgIC8vIEFsbCBlbGVtZW50cyBvZiBzZXQgYXJlIGtleXMgcG9pbnRpbmcgdG8gdGhlIHNhbWUgdmFsdWUgcmVmLlxuICAgIGNvbnN0IHdpdGhvdXQgPSBuZXcgU2V0KG9wdHMud2l0aG91dCB8fCBbXSk7XG4gICAgY29uc3QgZmxhZ2dlZCA9ICFvcHRzLm5vRmxhZ2dlZDtcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKSB7XG4gICAgICBpZiAod2l0aG91dC5oYXMocG9zKSkgY29udGludWU7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLm1hcFtwb3NdO1xuICAgICAgaWYgKHNjciA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNwZWMgPSB0aGlzLnNjcmVlbnMuZ2V0KHNjcik7XG4gICAgICBpZiAoc3BlYyA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIC8vaWYgKG9wdHMuZmxpZ2h0ICYmIHNwZWMuZGVhZEVuZCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGNvbm5lY3Rpb24gb2Ygc3BlYy5jb25uZWN0aW9ucykge1xuICAgICAgICAvLyBDb25uZWN0IHdpdGhpbiBlYWNoIHNlZ21lbnRcbiAgICAgICAgdWYudW5pb24oY29ubmVjdGlvbi5tYXAoYyA9PiAocG9zIDw8IDgpICsgYykpO1xuICAgICAgfVxuICAgICAgaWYgKHNwZWMud2FsbCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbm5lY3Rpb24gb2Ygc3BlYy53YWxsLmNvbm5lY3Rpb25zKGZsYWdnZWQpKSB7XG4gICAgICAgICAgLy8gQ29ubmVjdCB0aGUgYnJpZGdlZCBzZWdtZW50c1xuICAgICAgICAgIHVmLnVuaW9uKGNvbm5lY3Rpb24ubWFwKGMgPT4gKHBvcyA8PCA4KSArIGMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG9wdHMuZmxpZ2h0ICYmIHNwZWMuY29ubmVjdGlvbnMubGVuZ3RoICYmICFzcGVjLmRlYWRFbmQpIHtcbiAgICAgICAgLy8gQ29ubmVjdCBhbGwgdGhlIHNlZ21lbnRzIHRvIGVhY2ggb3RoZXJcbiAgICAgICAgdWYudW5pb24oc3BlYy5jb25uZWN0aW9ucy5tYXAoYyA9PiAocG9zIDw8IDgpICsgY1swXSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgICBjb25zdCBzZXRzID0gdWYuc2V0cygpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc2V0ID0gc2V0c1tpXTtcbiAgICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZXQpIHtcbiAgICAgICAgbWFwLnNldChlbGVtLCBzZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICAvKiogQWRqdXN0IHNjcmVlbnMgdW50aWwgd2UgZml0LiAqL1xuICBjb25zb2xpZGF0ZShhdmFpbGFibGU6IG51bWJlcltdLCBjaGVjazogKCkgPT4gYm9vbGVhbiwgcm9tOiBSb20pOiBib29sZWFuIHtcbiAgICBpZiAoIXRoaXMuY291bnRzIHx8ICF0aGlzLmV4dHJhVGlsZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHJ1biBjb25zb2xpZGF0ZSB3aXRob3V0IGNvdW50cy5gKTtcbiAgICB9XG4gICAgLy8gdGlsZSBzbG90cyB3ZSBjYW4gYWN0dWFsbHkgdXNlXG4gICAgY29uc3QgYXZhaWxhYmxlU2V0ID0gbmV3IFNldChhdmFpbGFibGUpO1xuICAgIC8vIHNjcmVlbnMgdGhhdCBhcmUgXCJpbiBwbGF5XCJcbiAgICBjb25zdCBtdXRhYmxlU2NyZWVucyA9IG5ldyBTZXQ8U2NyPigpO1xuICAgIGZvciAoY29uc3Qgc3BlYyBvZiB0aGlzLnNjcmVlbnMudmFsdWVzKCkpIHtcbiAgICAgIGlmIChzcGVjLmZpeGVkKSBjb250aW51ZTtcbiAgICAgIGlmIChzcGVjLnRpbGUgPCAwIHx8IGF2YWlsYWJsZVNldC5oYXMoc3BlYy50aWxlKSkge1xuICAgICAgICBtdXRhYmxlU2NyZWVucy5hZGQoc3BlYy5lZGdlcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ291bnQgZXh0cmEgdGlsZXMgaW4gdGhlIG1hcCB0aGF0IGFyZSBub3QgbXV0YWJsZVxuICAgIC8vIFRhcmdldDogdGhpcy5jb3VudHMudW5pcXVlKCkgPT09IGV4dHJhICsgc2NyZWVucy5zaXplXG4gICAgY29uc3QgZXh0cmEgPSBuZXcgU2V0PFNjcj4oKTtcbiAgICBmb3IgKGNvbnN0IFtzY3JdIG9mIHRoaXMuY291bnRzKSB7XG4gICAgICBpZiAoIW11dGFibGVTY3JlZW5zLmhhcyhzY3IpKSBleHRyYS5hZGQoc2NyKTtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0ID0gZXh0cmEuc2l6ZSArIGF2YWlsYWJsZS5sZW5ndGg7XG5cbiAgICAvLyBUcnkgdG8gdHVybiBhIGJhZCBzY3JlZW4gaW50byBhIGdvb2Qgc2NyZWVuXG4gICAgbGV0IGF0dGVtcHRzID0gMTAwMDtcbiAgICB3aGlsZSAodGhpcy5jb3VudHMudW5pcXVlKCkgPiB0YXJnZXQgJiYgLS1hdHRlbXB0cykge1xuICAgICAgY29uc3Qgc29ydGVkID1cbiAgICAgICAgICBbLi4udGhpcy5jb3VudHNdXG4gICAgICAgICAgICAgIC5maWx0ZXIoKHgpID0+IG11dGFibGVTY3JlZW5zLmhhcyh4WzBdKSlcbiAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGJbMV0gLSBhWzFdKVxuICAgICAgICAgICAgICAubWFwKHggPT4geFswXSk7XG4gICAgICBjb25zdCBnb29kID0gbmV3IFNldChzb3J0ZWQuc2xpY2UoMCwgYXZhaWxhYmxlLmxlbmd0aCkpO1xuICAgICAgY29uc3QgYmFkID0gbmV3IFNldChzb3J0ZWQuc2xpY2UoYXZhaWxhYmxlLmxlbmd0aCkpO1xuICAgICAgY29uc3Qgc2h1ZmZsZWQgPSB0aGlzLnJhbmRvbS5zaHVmZmxlKFsuLi50aGlzLmFsbFBvc10pO1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2Ygc2h1ZmZsZWQpIHtcbiAgICAgICAgaWYgKCFiYWQuaGFzKHRoaXMubWFwW3Bvc10hKSkgY29udGludWU7XG4gICAgICAgIGlmICh0aGlzLnRyeUNvbnNvbGlkYXRlKHBvcywgZ29vZCwgYmFkLCBjaGVjaykpIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWF0dGVtcHRzKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBDb25zb2xpZGF0aW9uIHN1Y2NlZWRlZCAtIGZpeCB1cCB0aGUgc2NyZWVuc1xuICAgIGNvbnN0IHVzZWQgPSBuZXcgU2V0KFxuICAgICAgICBbLi4udGhpcy5jb3VudHNdXG4gICAgICAgICAgICAuZmlsdGVyKCh4KSA9PiBtdXRhYmxlU2NyZWVucy5oYXMoeFswXSkpXG4gICAgICAgICAgICAubWFwKHggPT4geFswXSkpO1xuXG4gICAgY29uc3QgZnJlZWQgPSBbXTsgLy8gdGlsZXNcbiAgICBmb3IgKGNvbnN0IHNjciBvZiBtdXRhYmxlU2NyZWVucykge1xuICAgICAgY29uc3Qgc3BlYyA9IHRoaXMuc2NyZWVucy5nZXQoc2NyKTtcbiAgICAgIGlmICghc3BlYykgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIHNwZWMnKTtcbiAgICAgIGlmIChzcGVjLnRpbGUgPj0gMCkge1xuICAgICAgICBpZiAodXNlZC5oYXMoc2NyKSkge1xuICAgICAgICAgIC8vIElmIGl0IGhhcyBhIHRpbGUgYW5kIGlzIHVzZWQsIHRoZW4gbm90aGluZyB0byBkby5cbiAgICAgICAgICB1c2VkLmRlbGV0ZShzY3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIElmIGl0J3Mgbm90IHVzZWQgdGhlbiBtYWtlIGl0IGF2YWlsYWJsZS5cbiAgICAgICAgICBmcmVlZC5wdXNoKHNwZWMudGlsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBzY3Igb2YgdXNlZCkge1xuICAgICAgLy8gQXQgdGhpcyBwb2ludCBpdCdzIGd1YXJhbnRlZWQgbm90IHRvIGhhdmUgYSB0aWxlLCBidXQgb25lJ3MgYXZhaWxhYmxlLlxuICAgICAgY29uc3QgbmV4dCA9IGZyZWVkLnBvcCgpO1xuICAgICAgY29uc3Qgc3BlYyA9IHRoaXMuc2NyZWVucy5nZXQoc2NyKTtcbiAgICAgIGlmIChuZXh0ID09IG51bGwgfHwgIXNwZWMpIHRocm93IG5ldyBFcnJvcihgTm8gYXZhaWxhYmxlIHNjcmVlbmApO1xuICAgICAgcm9tLnNjcmVlbnNbbmV4dF0udGlsZXMuc3BsaWNlKDAsIDB4ZjAsIC4uLnRoaXMuZXh0cmFUaWxlc1t+c3BlYy50aWxlXSk7XG4gICAgICB0aGlzLmV4dHJhVGlsZXNNYXBbfnNwZWMudGlsZV0gPSBuZXh0O1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKiBUcnkgdG8gbWFrZSBhIGJhZCBzY3JlZW4gaW50byBhIGdvb2Qgc2NyZWVuLiAqL1xuICB0cnlDb25zb2xpZGF0ZShwb3M6IFBvcywgZ29vZDogU2V0PFNjcj4sIGJhZDogU2V0PFNjcj4sXG4gICAgICAgICAgICAgICAgIGNoZWNrOiAoKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2NyID0gdGhpcy5tYXBbcG9zXTtcbiAgICBpZiAoc2NyID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgZGVmaW5lZGApO1xuICAgIGZvciAoY29uc3QgbmV3U2NyIG9mIHRoaXMucmFuZG9tLnNodWZmbGUoWy4uLmdvb2RdKSkge1xuICAgICAgLy8gaXMgZyBhIHNpbmdsZSBlZGdlIG9mZj9cbiAgICAgIGNvbnN0IGRpZmYgPSBzY3IgXiBuZXdTY3I7XG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBEaXIuQUxMKSB7XG4gICAgICAgIGNvbnN0IG1hc2sgPSBEaXIuZWRnZU1hc2soZGlyKTtcbiAgICAgICAgaWYgKGRpZmYgJiB+bWFzaykgY29udGludWU7XG4gICAgICAgIC8vIGRpciBpcyB0aGUgb25seSBkaWZmZXJlbmNlLiAgTG9vayBhdCBuZWlnaGJvclxuICAgICAgICBjb25zdCBwb3MyID0gUG9zLnBsdXMocG9zLCBkaXIpOyBcbiAgICAgICAgY29uc3Qgc2NyMiA9IHRoaXMubWFwW3BvczJdO1xuICAgICAgICBpZiAoc2NyMiA9PSBudWxsKSBicmVhaztcbiAgICAgICAgaWYgKCFiYWQuaGFzKHNjcjIpICYmICFnb29kLmhhcyhzY3IyKSkgYnJlYWs7XG4gICAgICAgIGNvbnN0IGVkZ2UgPSAobmV3U2NyID4+PiBEaXIuc2hpZnQoZGlyKSkgJiAweGY7XG4gICAgICAgIGNvbnN0IGRpcjIgPSBEaXIuaW52KGRpcik7XG4gICAgICAgIGNvbnN0IG1hc2syID0gRGlyLmVkZ2VNYXNrKGRpcjIpO1xuICAgICAgICBjb25zdCBuZXdTY3IyID0gKChzY3IyICYgfm1hc2syKSB8IChlZGdlIDw8IERpci5zaGlmdChkaXIyKSkpIGFzIFNjcjtcbiAgICAgICAgaWYgKGJhZC5oYXMobmV3U2NyMikgJiYgIWJhZC5oYXMoc2NyMikpIGJyZWFrO1xuICAgICAgICBjb25zdCBvayA9IHRoaXMuc2F2ZUV4Y3Vyc2lvbigoKSA9PiB7XG4gICAgICAgICAgdGhpcy5zZXRJbnRlcm5hbChwb3MsIG5ld1Njcik7XG4gICAgICAgICAgdGhpcy5zZXRJbnRlcm5hbChwb3MyLCBuZXdTY3IyKTtcbiAgICAgICAgICByZXR1cm4gY2hlY2soKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChvaykgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEZvciBub3csIGp1c3Qgc2hvdyBicm9hZCBzdHJ1Y3R1cmUuXG4gIHNob3coaGV4ID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGNvbnN0IGhlYWRlciA9ICcgJyArIHNlcSh0aGlzLndpZHRoKS5qb2luKCcnKSArICdcXG4nO1xuICAgIGNvbnN0IGJvZHkgPSBzZXEodGhpcy5oZWlnaHQsIHkgPT4geS50b1N0cmluZygxNikgKyBzZXEodGhpcy53aWR0aCwgeCA9PiB7XG4gICAgICBjb25zdCBwb3MgPSB5IDw8IDQgfCB4O1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5tYXBbcG9zXTtcbiAgICAgIGlmIChoZXgpIHtcbiAgICAgICAgcmV0dXJuICcgJyArIChzY3IgfHwgMCkudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDUsICcwJyk7XG4gICAgICB9XG4gICAgICBpZiAoc2NyID09IG51bGwpIHJldHVybiAnICc7XG4gICAgICBjb25zdCBzcGVjID0gdGhpcy5zY3JlZW5zLmdldChzY3IpO1xuICAgICAgaWYgKHNwZWMpIHJldHVybiBzcGVjLmljb247XG4gICAgICAvLyBidWlsZCBpdCB1cCBtYW51YWxseVxuICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgICAgaWYgKHNjciAmICgweGYgPDwgKGRpciA8PCAyKSkpIGluZGV4IHw9ICgxIDw8IChkaXIgPDwgMikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFVOSUNPREVfVElMRVNbaW5kZXhdIHx8ICcgJztcbiAgICB9KS5qb2luKCcnKSkuam9pbignXFxuJyk7XG4gICAgcmV0dXJuIGhlYWRlciArIGJvZHk7XG4gIH1cblxuICB3cml0ZShsb2M6IExvY2F0aW9uLCBhdmFpbGFibGVGbGFnczogU2V0PG51bWJlcj4pIHtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgbG9jLmZsYWdzKSB7XG4gICAgICAvL2NvbnNvbGUubG9nKGBhZGRpbmcgZmxhZyAke2hleChmbGFnLmZsYWcpfWApO1xuICAgICAgYXZhaWxhYmxlRmxhZ3MuYWRkKGZsYWcuZmxhZyk7XG4gICAgfVxuICAgIGxldCB3YWxsRWxlbWVudCA9IDA7XG4gICAgY29uc3Qgd2FsbFNwYXducyA9IHsnd2FsbCc6IFtdIGFzIFNwYXduW10sICdicmlkZ2UnOiBbXSBhcyBTcGF3bltdfTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGNvbnN0IHR5cGUgPSBzcGF3bi53YWxsVHlwZSgpO1xuICAgICAgaWYgKHR5cGUpIHdhbGxTcGF3bnNbdHlwZV0ucHVzaChzcGF3bik7XG4gICAgICBpZiAodHlwZSA9PT0gJ3dhbGwnKSB3YWxsRWxlbWVudCA9IHNwYXduLndhbGxFbGVtZW50KCk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coYHdhbGwgc3Bhd25zOmAsIHdhbGxTcGF3bnMsIGBhdmFpbGFibGUgZmxhZ3M6YCwgYXZhaWxhYmxlRmxhZ3MpO1xuICAgIGxvYy5mbGFncyA9IFtdO1xuICAgIGxvYy53aWR0aCA9IHRoaXMud2lkdGg7XG4gICAgbG9jLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgbG9jLnNjcmVlbnNbeV0gPSBbXTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHkgPDwgNCB8IHg7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMubWFwW3Bvc107XG4gICAgICAgIGlmIChzY3IgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHNjcmVlbiBhdCBwb3MgJHtoZXgocG9zKX1gKTtcbiAgICAgICAgY29uc3Qgc3BlYyA9IHRoaXMuc2NyZWVucy5nZXQoc2NyKTtcbiAgICAgICAgaWYgKCFzcGVjKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgc3BlYyBmb3IgJHtoZXg1KHNjcil9IGF0ICR7aGV4KHBvcyl9YCk7XG4gICAgICAgIGNvbnN0IHRpbGUgPSBzcGVjLnRpbGUgPCAwID8gdGhpcy5leHRyYVRpbGVzTWFwW35zcGVjLnRpbGVdIDogc3BlYy50aWxlO1xuICAgICAgICBsb2Muc2NyZWVuc1t5XS5wdXNoKHRpbGUpO1xuICAgICAgICBpZiAoc3BlYy5mbGFnKSBsb2MuZmxhZ3MucHVzaChGbGFnLm9mKHtzY3JlZW46IHBvcywgZmxhZzogMHgyZjB9KSk7XG4gICAgICAgIGlmIChzcGVjLndhbGwpIHtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKGBwb3M6ICR7aGV4KHBvcyl9OiAke2hleDUoc2NyKX1gLCBzcGVjLndhbGwpO1xuICAgICAgICAgIC8vIHBvcCBhbiBhdmFpbGFibGUgZmxhZyBhbmQgdXNlIHRoYXQuXG4gICAgICAgICAgbG9jLmZsYWdzLnB1c2goRmxhZy5vZih7c2NyZWVuOiBwb3MsIGZsYWc6IHBvcChhdmFpbGFibGVGbGFncyl9KSk7XG4gICAgICAgICAgY29uc3Qgc3Bhd24gPSB3YWxsU3Bhd25zW3NwZWMud2FsbC50eXBlXS5wb3AoKSB8fCAoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcyA9XG4gICAgICAgICAgICAgICAgU3Bhd24ub2Yoe3NjcmVlbjogcG9zLCB0aWxlOiBzcGVjLndhbGwudGlsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogMyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHNwZWMud2FsbC50eXBlID09PSAnd2FsbCcgPyB3YWxsRWxlbWVudCA6IDJ9KTtcbiAgICAgICAgICAgIGxvYy5zcGF3bnMucHVzaChzKTsgLy8gVE9ETyAtIGNoZWNrIGZvciB0b28gbWFueSBvciB1bnVzZWQ/XG4gICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICB9KSgpO1xuICAgICAgICAgIHNwYXduLnNjcmVlbiA9IHBvcztcbiAgICAgICAgICBzcGF3bi50aWxlID0gc3BlYy53YWxsLnRpbGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmaW5pc2goc3VydmV5OiBTdXJ2ZXksIGxvYzogTG9jYXRpb24pOiBib29sZWFuIHtcbiAgICB0aGlzLnRyaW0oKTtcbiAgICBjb25zdCBmaW5pc2hlciA9IG5ldyBNYXplRmluaXNoZXIodGhpcywgbG9jLCBzdXJ2ZXksIHRoaXMucmFuZG9tKTtcbiAgICBpZiAoIWZpbmlzaGVyLnNodWZmbGVGaXhlZCgpKSByZXR1cm4gZmFpbCgnY291bGQgbm90IHNodWZmbGUgZml4ZWQnLCB0aGlzKTtcbiAgICBpZiAoIWZpbmlzaGVyLnBsYWNlRXhpdHMoKSkgcmV0dXJuIGZhaWwoJ2NvdWxkIG5vdCBwbGFjZSBleGl0cycsIHRoaXMpO1xuICAgIHRoaXMud3JpdGUobG9jLCBuZXcgU2V0KCkpOyAvLyBUT0RPIC0gdGFrZSBzZXQgZnJvbSBlbHNld2hlcmU/XG4gICAgLy8gQWZ0ZXIgdGhpcyBwb2ludCwgZG8gbm90aGluZyB0aGF0IGNvdWxkIGZhaWwhXG4gICAgLy8gQ2xlYXIgZXhpdHM6IHdlIG5lZWQgdG8gcmUtYWRkIHRoZW0gbGF0ZXIuXG4gICAgZmluaXNoZXIucGxhY2VOcGNzKCk7XG4gICAgaWYgKGxvYy5yb20uc3BvaWxlcikge1xuICAgICAgbG9jLnJvbS5zcG9pbGVyLmFkZE1hemUobG9jLmlkLCBsb2MubmFtZSwgdGhpcy5zaG93KCkpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5jb25zdCBERUJVRzogYm9vbGVhbiA9IGZhbHNlO1xuZnVuY3Rpb24gZmFpbChtc2c6IHN0cmluZywgbWF6ZT86IE1hemUpOiBmYWxzZSB7XG4gIGlmIChERUJVRykgY29uc29sZS5lcnJvcihgUmVyb2xsOiAke21zZ31gKTtcbiAgaWYgKG1hemUgJiYgREVCVUcpIGNvbnNvbGUubG9nKG1hemUuc2hvdygpKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5jbGFzcyBNYXplRmluaXNoZXIge1xuXG4gIHJlYWRvbmx5IHBvaSA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIEFycmF5PHJlYWRvbmx5IFtudW1iZXIsIG51bWJlcl0+PigoKSA9PiBbXSk7XG4gIHJlYWRvbmx5IGZpeGVkUG9zID0gbmV3IERlZmF1bHRNYXA8U2NyLCBQb3NbXT4oKCkgPT4gW10pO1xuICByZWFkb25seSBwb3NNYXBwaW5nID0gbmV3IE1hcDxQb3MsIFBvcz4oKTtcbiAgLy8gcG9zaXRpb25zIG9mIGVkZ2Ugc2NyZWVucyAoW2Rpcl1bb3JkaW5hbF0pIHRoYXQgYXJlbid0IGZpeGVkIHNjcmVlbnNcbiAgcmVhZG9ubHkgYWxsRWRnZXM6IEFycmF5PEFycmF5PFBvcz4+ID0gW1tdLCBbXSwgW10sIFtdXTtcbiAgLy8gcG9zaXRpb25zIG9mIGVkZ2Ugc2NyZWVucyAoW2Rpcl1bb3JkaW5hbF0pIHRoYXQgYXJlIGZpeGVkIHNjcmVlbnNcbiAgcmVhZG9ubHkgZml4ZWRFZGdlczogQXJyYXk8QXJyYXk8UG9zPj4gPSBbW10sIFtdLCBbXSwgW11dO1xuICAvLyBwb3NpdGlvbnMgYW5kIGRpcmVjdGlvbnMgb2YgYWxsIHN0YWlyc1xuICByZWFkb25seSBhbGxTdGFpcnM6IEFycmF5PEFycmF5PHJlYWRvbmx5IFtQb3MsIEVudHJhbmNlU3BlY10+PiA9XG4gICAgICBbW10sIFtdLCBbXSwgW11dOyAvLyBOT1RFOiAxIGFuZCAzIHVudXNlZFxuICAvLyBzdGFpcnMgbWF5IG1vdmUgdG8gYSBkaWZmZXJlbnQgY29vcmRpbmF0ZTogbWFwIHRoZSBkZWx0YSBzbyB0aGF0IHdlXG4gIC8vIGNhbiBwbGFjZSB0cmlnZ2Vycy9OUENzIGluIHRoZSByaWdodCBzcG90IHJlbGF0aXZlIHRvIGl0LlxuICByZWFkb25seSBzdGFpckRpc3BsYWNlbWVudHMgPSBuZXcgTWFwPFBvcywgW251bWJlciwgbnVtYmVyXT4oKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBtYXplOiBNYXplLFxuICAgICAgICAgICAgICByZWFkb25seSBsb2M6IExvY2F0aW9uLFxuICAgICAgICAgICAgICByZWFkb25seSBzdXJ2ZXk6IFN1cnZleSxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBJbml0aWFsaXplIHBvaSBhbmQgZml4ZWRQb3NcbiAgICBmb3IgKGNvbnN0IFtwb3MsIHNjcl0gb2YgbWF6ZSkge1xuICAgICAgY29uc3Qgc3BlYyA9IHRoaXMubWF6ZS5nZXRTcGVjKHBvcykhO1xuICAgICAgaWYgKHNwZWMuZml4ZWQpIHRoaXMuZml4ZWRQb3MuZ2V0KHNjcikucHVzaChwb3MpO1xuICAgICAgZm9yIChjb25zdCB7cHJpb3JpdHksIGR5LCBkeH0gb2Ygc3BlYy5wb2kpIHtcbiAgICAgICAgdGhpcy5wb2kuZ2V0KHByaW9yaXR5KVxuICAgICAgICAgICAgLnB1c2goWygocG9zICYgMHhmMCkgPDwgNCkgKyBkeSwgKChwb3MgJiAweGYpIDw8IDgpICsgZHhdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gSW5pdGlhbGl6ZSBhbGxFZGdlcyBhbmQgZml4ZWRFZGdlc1xuICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIERpci5hbGxFZGdlKGRpciwgbWF6ZS5oZWlnaHQsIG1hemUud2lkdGgpKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IG1hemUuZ2V0KHBvcyk7XG4gICAgICAgIGlmICghc2NyKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZWRnZVR5cGUgPSBTY3IuZWRnZShzY3IsIGRpcik7XG4gICAgICAgIGlmIChlZGdlVHlwZSAmJiBlZGdlVHlwZSAhPSA3KSB7XG4gICAgICAgICAgLy8gaWYgKHN1cnZleS5zcGVjU2V0LmZpeGVkVGlsZXMuaGFzKGxvYy5zY3JlZW5zW3BvcyA+PiA0XVtwb3MgJiAweGZdKSkge1xuICAgICAgICAgIC8vIGlmIChzdXJ2ZXkuc3BlY1NldC5maXhlZFRpbGVzLmhhcyhtYXplLmdldFNwZWMocG9zKSkpIHtcbiAgICAgICAgICAvLyBpZiAoc3VydmV5LnNwZWNTZXQuZml4ZWRUaWxlcy5oYXMoXG4gICAgICAgICAgLy8gICAgIChsb2Muc2NyZWVuc1twb3MgPj4gNF0gfHwgW10pW3BvcyAmIDB4Zl0pKSB7XG4gICAgICAgICAgaWYgKG1hemUuZ2V0U3BlYyhwb3MpIS5maXhlZCkge1xuICAgICAgICAgICAgdGhpcy5maXhlZEVkZ2VzW2Rpcl0ucHVzaChwb3MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFsbEVkZ2VzW2Rpcl0ucHVzaChwb3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwb3MsIHNjcl0gb2YgbWF6ZSkge1xuICAgICAgLy8gVE9ETyAtIHNob3VsZCBubyBsb25nZXIgbmVlZCBTVEFJUl9TQ1JFRU5TIHcvIE1hemUjZ2V0U3BlY1xuICAgICAgY29uc3QgZGlyID0gc3VydmV5LnNwZWNTZXQuc3RhaXJTY3JlZW5zLmdldChzY3IpO1xuICAgICAgaWYgKGRpciAhPSBudWxsKSB0aGlzLmFsbFN0YWlyc1tkaXJbMF1dLnB1c2goW3BvcywgZGlyWzFdXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gU2h1ZmZsZXMgdGhlIGZpeGVkIHNjcmVlbnMsIHVwZGF0aW5nIHBvc01hcHBpbmdcbiAgc2h1ZmZsZUZpeGVkKCk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgZml4ZWQgb2YgdGhpcy5maXhlZFBvcy52YWx1ZXMoKSkgdGhpcy5yYW5kb20uc2h1ZmZsZShmaXhlZCk7XG4gICAgZm9yIChjb25zdCBbcG9zMCwgc3BlY10gb2YgdGhpcy5zdXJ2ZXkuZml4ZWQpIHtcbiAgICAgIGNvbnN0IHBvcyA9IHRoaXMuZml4ZWRQb3MuZ2V0KHNwZWMuZWRnZXMpLnBvcCgpO1xuICAgICAgaWYgKHBvcyA9PSBudWxsKSByZXR1cm4gZmFsc2U7IC8vIHRocm93IG5ldyBFcnJvcihgVW5yZXBsYWNlZCBmaXhlZCBzY3JlZW5gKTtcbiAgICAgIHRoaXMucG9zTWFwcGluZy5zZXQocG9zMCwgcG9zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBGdXJ0aGVyIHVwZGF0ZXMgcG9zTWFwcGluZyBhcyBuZWVkZWRcbiAgcGxhY2VFeGl0cygpOiBib29sZWFuIHtcbiAgICAvLyBGaXJzdCB3b3JrIG9uIGVudHJhbmNlcywgZXhpdHMsIGFuZCBOUENzLlxuICAgIC8vIGxvYy5lbnRyYW5jZXMgPSBbXTtcbiAgICB0aGlzLmxvYy5leGl0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIERpci5BTEwpIHtcbiAgICAgIHRoaXMucmFuZG9tLnNodWZmbGUodGhpcy5hbGxFZGdlc1tkaXJdKTtcbiAgICAgIHRoaXMucmFuZG9tLnNodWZmbGUodGhpcy5maXhlZEVkZ2VzW2Rpcl0pO1xuICAgIH1cbiAgICB0aGlzLnJhbmRvbS5zaHVmZmxlKHRoaXMuYWxsU3RhaXJzW0Rpci5VUF0pO1xuICAgIHRoaXMucmFuZG9tLnNodWZmbGUodGhpcy5hbGxTdGFpcnNbRGlyLkRPV05dKTtcbiAgICAvLyBTaHVmZmxlIGZpcnN0LCB0aGVuIHBsYWNlIHN0dWZmXG4gICAgZm9yIChjb25zdCBbcG9zMCwgZXhpdF0gb2YgdGhpcy5zdXJ2ZXkuZWRnZXMpIHtcbiAgICAgIGNvbnN0IGVkZ2VMaXN0ID1cbiAgICAgICAgICB0aGlzLnN1cnZleS5maXhlZC5oYXMocG9zMCkgPyB0aGlzLmZpeGVkRWRnZXMgOiB0aGlzLmFsbEVkZ2VzO1xuICAgICAgY29uc3QgZWRnZTogUG9zIHwgdW5kZWZpbmVkID0gZWRnZUxpc3RbZXhpdC5kaXJdLnBvcCgpO1xuICAgICAgaWYgKGVkZ2UgPT0gbnVsbCkgcmV0dXJuIGZhbHNlOyAvLyB0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgZWRnZScpO1xuICAgICAgdGhpcy5wb3NNYXBwaW5nLnNldChwb3MwLCBlZGdlKTtcbiAgICAgIC8vbW92ZXIocG9zMCwgZWRnZSk7IC8vIG1vdmUgc3Bhd25zPz9cbiAgICAgIGNvbnN0IGVkZ2VUeXBlID0gU2NyLmVkZ2UodGhpcy5tYXplLmdldChlZGdlKSEsIGV4aXQuZGlyKTtcbiAgICAgIGNvbnN0IGVkZ2VEYXRhID0gRURHRV9UWVBFU1tlZGdlVHlwZV1bZXhpdC5kaXJdO1xuICAgICAgdGhpcy5sb2MuZW50cmFuY2VzW2V4aXQuZW50cmFuY2VdID1cbiAgICAgICAgICBFbnRyYW5jZS5vZih7c2NyZWVuOiBlZGdlLCBjb29yZDogZWRnZURhdGEuZW50cmFuY2V9KTtcbiAgICAgIGZvciAoY29uc3QgdGlsZSBvZiBlZGdlRGF0YS5leGl0cykge1xuICAgICAgICB0aGlzLmxvYy5leGl0cy5wdXNoKFxuICAgICAgICAgICAgRXhpdC5vZih7c2NyZWVuOiBlZGdlLCB0aWxlLFxuICAgICAgICAgICAgICAgICAgICAgZGVzdDogZXhpdC5leGl0ID4+PiA4LCBlbnRyYW5jZTogZXhpdC5leGl0ICYgMHhmZn0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbcG9zMCwgZXhpdF0gb2YgdGhpcy5zdXJ2ZXkuc3RhaXJzKSB7XG4gICAgICBjb25zdCBzdGFpcjogcmVhZG9ubHkgW1BvcywgRW50cmFuY2VTcGVjXSB8IHVuZGVmaW5lZCA9XG4gICAgICAgICAgdGhpcy5hbGxTdGFpcnNbZXhpdC5kaXJdLnBvcCgpO1xuICAgICAgaWYgKHN0YWlyID09IG51bGwpIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBzdGFpcicpO1xuICAgICAgdGhpcy5wb3NNYXBwaW5nLnNldChwb3MwLCBzdGFpclswXSk7XG4gICAgICBjb25zdCBlbnRyYW5jZSA9IHRoaXMubG9jLmVudHJhbmNlc1tleGl0LmVudHJhbmNlXTtcbiAgICAgIGNvbnN0IHgwID0gZW50cmFuY2UudGlsZSAmIDB4ZjtcbiAgICAgIGNvbnN0IHkwID0gZW50cmFuY2UudGlsZSA+Pj4gNDtcbiAgICAgIGVudHJhbmNlLnNjcmVlbiA9IHN0YWlyWzBdO1xuICAgICAgZW50cmFuY2UuY29vcmQgPSBzdGFpclsxXS5lbnRyYW5jZTtcbiAgICAgIGNvbnN0IHgxID0gZW50cmFuY2UudGlsZSAmIDB4ZjtcbiAgICAgIGNvbnN0IHkxID0gZW50cmFuY2UudGlsZSA+Pj4gNDtcbiAgICAgIHRoaXMuc3RhaXJEaXNwbGFjZW1lbnRzLnNldChwb3MwLCBbeTEgLSB5MCwgeDEgLSB4MF0pO1xuICAgICAgZm9yIChjb25zdCB0aWxlIG9mIHN0YWlyWzFdLmV4aXRzKSB7XG4gICAgICAgIHRoaXMubG9jLmV4aXRzLnB1c2goRXhpdC5vZih7XG4gICAgICAgICAgc2NyZWVuOiBzdGFpclswXSwgdGlsZSxcbiAgICAgICAgICBkZXN0OiBleGl0LmV4aXQgPj4+IDgsIGVudHJhbmNlOiBleGl0LmV4aXQgJiAweGZmfSkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHBsYWNlTW9uc3RlcihzcGF3bjogU3Bhd24sIG1vbnN0ZXJQbGFjZXI6IChtOiBNb25zdGVyKSA9PiBudW1iZXJ8dW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbW9uc3RlciA9IHRoaXMubG9jLnJvbS5vYmplY3RzW3NwYXduLm1vbnN0ZXJJZF07XG4gICAgaWYgKCEobW9uc3RlciBpbnN0YW5jZW9mIE1vbnN0ZXIpKSByZXR1cm47XG4gICAgY29uc3QgcG9zID0gbW9uc3RlclBsYWNlcihtb25zdGVyKTtcbiAgICBpZiAocG9zID09IG51bGwpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgYG5vIHZhbGlkIGxvY2F0aW9uIGZvciAke2hleChtb25zdGVyLmlkKX0gaW4gJHtoZXgodGhpcy5sb2MuaWQpfWApO1xuICAgICAgc3Bhd24udXNlZCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzcGF3bi5zY3JlZW4gPSBwb3MgPj4+IDg7XG4gICAgICBzcGF3bi50aWxlID0gcG9zICYgMHhmZjtcbiAgICB9XG4gIH1cblxuICAvLyBNb3ZlIG90aGVyIE5QQ3MuICBXYWxsIHNwYXducyBoYXZlIGFscmVhZHkgYmVlbiBoYW5kbGVkIGJ5IE1hemUjd3JpdGUoKVxuICBwbGFjZU5wY3MoKTogdm9pZCB7XG4gICAgLy8gS2VlcCB0cmFjayBvZiBzcGF3bnMgdGhhdCBtYXkgYmUgb24gdG9wIG9mIGVhY2ggb3RoZXIgKGUuZy4gcGVvcGxlKVxuICAgIGNvbnN0IHNwYXduTWFwID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTsgLy8gbWFwIG9mIG9sZCAtPiBuZXcgeXl5eHh4XG4gICAgY29uc3QgbW9uc3RlclBsYWNlciA9IHRoaXMubG9jLm1vbnN0ZXJQbGFjZXIodGhpcy5yYW5kb20pO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgdGhpcy5sb2Muc3Bhd25zKSB7XG4gICAgICAvLyBXYWxscyBhbHJlYWR5IG1vdmVkIChieSBtYXplI3dyaXRlKS5cbiAgICAgIGlmIChzcGF3bi50eXBlID09PSAzKSBjb250aW51ZTtcbiAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkge1xuICAgICAgICB0aGlzLnBsYWNlTW9uc3RlcihzcGF3biwgbW9uc3RlclBsYWNlcik7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUncyBhIHBhaXJlZCBzcGF3biBhdCB0aGUgc2FtZSBwb3NpdGlvbiBhbHJlYWR5IG1vdmVkP1xuICAgICAgY29uc3Qgc2FtZVNwYXduID0gc3Bhd25NYXAuZ2V0KHNwYXduLnkgPDwgMTIgfCBzcGF3bi54KTtcbiAgICAgIGlmIChzYW1lU3Bhd24gIT0gbnVsbCkge1xuICAgICAgICBzcGF3bi55ID0gc2FtZVNwYXduID4+PiAxMjtcbiAgICAgICAgc3Bhd24ueCA9IHNhbWVTcGF3biAmIDB4ZmZmO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIENoZWNrIGlmIHRoaXMgc2NyZWVuIGlzIGZpeGVkIGFuZCBoYXMgYmVlbiBtb3ZlZCBzb21ld2hlcmU/XG4gICAgICBjb25zdCBwb3MwID0gc3Bhd24uc2NyZWVuIGFzIFBvcztcbiAgICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMucG9zTWFwcGluZy5nZXQocG9zMCk7XG4gICAgICBpZiAobWFwcGVkICE9IG51bGwpIHtcbiAgICAgICAgc3Bhd24uc2NyZWVuID0gbWFwcGVkO1xuICAgICAgICAvLyBJZiB0aGUgcmVtYXBwaW5nIHdhcyBhIHN0YWlycywgdGhlbiB3ZSBtYXkgaGF2ZSBtb3JlIHdvcmsgdG8gZG8uLi5cbiAgICAgICAgLy8gU3BlY2lmaWNhbGx5IC0gaWYgYSB0cmlnZ2VyIG9yIE5QQyB3YXMgbmV4dCB0byBhIHN0YWlyLCBtYWtlIHN1cmVcbiAgICAgICAgLy8gaXQgc3RheXMgbmV4dCB0byB0aGUgc3RhaXIuXG4gICAgICAgIGNvbnN0IGRpc3BsYWNlbWVudCA9IHRoaXMuc3RhaXJEaXNwbGFjZW1lbnRzLmdldChwb3MwKTtcbiAgICAgICAgaWYgKGRpc3BsYWNlbWVudCAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgW2R5LCBkeF0gPSBkaXNwbGFjZW1lbnQ7XG4gICAgICAgICAgc3Bhd24ueXQgKz0gZHk7XG4gICAgICAgICAgc3Bhd24ueHQgKz0gZHg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkpIHtcbiAgICAgICAgLy8gQ2FuJ3QgbW92ZSB0cmlnZ2VycywgbmVlZCBhIHdheSB0byBoYW5kbGUgdGhlbS5cbiAgICAgICAgaWYgKHNwYXduLmlkID09PSAweDhjKSB7XG4gICAgICAgICAgLy8gSGFuZGxlIGxlYWYgYWJkdWN0aW9uIHRyaWdnZXIgYmVoaW5kIHplYnVcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSB0aGlzLnBvc01hcHBpbmcuZ2V0KDB4MjEgYXMgUG9zKSEgLSAxNjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGB1bmhhbmRsZWQgdHJpZ2dlcjogJHtzcGF3bi5pZH1gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTlBDcywgY2hlc3RzIC0gcGljayBhIFBPSVxuICAgICAgICBjb25zdCBrZXlzID0gWy4uLnRoaXMucG9pLmtleXMoKV0uc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICAgICAgICBpZiAoIWtleXMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYG5vIHBvaWApO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAgICAgY29uc3QgZGlzcGxhY2VtZW50cyA9IHRoaXMucG9pLmdldChrZXkpITtcbiAgICAgICAgICBpZiAoIWRpc3BsYWNlbWVudHMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBvbGRTcGF3biA9IHNwYXduLnkgPDwgMTIgfCBzcGF3bi54O1xuICAgICAgICAgIGNvbnN0IGkgPSB0aGlzLnJhbmRvbS5uZXh0SW50KGRpc3BsYWNlbWVudHMubGVuZ3RoKTtcbiAgICAgICAgICBbW3NwYXduLnksIHNwYXduLnhdXSA9IGRpc3BsYWNlbWVudHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHNwYXduTWFwLnNldChvbGRTcGF3biwgc3Bhd24ueSA8PCAxMiB8IHNwYXduLngpO1xuICAgICAgICAgIGlmICghZGlzcGxhY2VtZW50cy5sZW5ndGgpIHRoaXMucG9pLmRlbGV0ZShrZXkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9ICAgICAgXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBvcDxUPihzZXQ6IFNldDxUPik6IFQge1xuICBmb3IgKGNvbnN0IGVsZW0gb2Ygc2V0KSB7XG4gICAgc2V0LmRlbGV0ZShlbGVtKTtcbiAgICByZXR1cm4gZWxlbTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYGNhbm5vdCBwb3AgZnJvbSBlbXB0eSBzZXRgKTtcbn1cblxuaW50ZXJmYWNlIFRyYXZlcnNlT3B0cyB7XG4gIC8vIERvIG5vdCBwYXNzIGNlcnRhaW4gdGlsZXMgaW4gdHJhdmVyc2VcbiAgcmVhZG9ubHkgd2l0aG91dD86IHJlYWRvbmx5IFBvc1tdO1xuICAvLyBXaGV0aGVyIHRvIGJyZWFrIHdhbGxzL2Zvcm0gYnJpZGdlc1xuICByZWFkb25seSBub0ZsYWdnZWQ/OiBib29sZWFuO1xuICAvLyBXaGV0aGVyIHRvIGFzc3VtZSBmbGlnaHRcbiAgcmVhZG9ubHkgZmxpZ2h0PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGaWxsT3B0cyB7XG4gIC8vIE1heCBudW1iZXIgb2YgZXhpdHNcbiAgcmVhZG9ubHkgbWF4RXhpdHM/OiBudW1iZXI7XG4gIC8vIEVkZ2UgdHlwZSB0byB1c2Ugd2hlbiB1bmNvbnN0cmFpbmVkXG4gIHJlYWRvbmx5IGVkZ2U/OiBudW1iZXI7XG4gIC8vIFJlcXVpcmVkIHN0YWlyIGRpcmVjdGlvblxuICByZWFkb25seSBzdGFpcj86IERpcjtcbiAgLy8gV2hldGhlciB0byBmb3JjZSB0aGUgc2V0XG4gIHJlYWRvbmx5IGZvcmNlPzogYm9vbGVhbjtcbiAgLy8gSWYgd2UncmUgZnV6enkgdGhlbiBhbGxvdyBhIG5vbi1maXhlZCBlZGdlIHRvIG5vdCBtYXRjaFxuICByZWFkb25seSBmdXp6eT86IG51bWJlciB8ICgob3B0czogRmlsbE9wdHMpID0+IEZpbGxPcHRzKTtcbiAgLy8gU2h1ZmZsZSB0aGUgb3JkZXIgb2YgdGhlIHRpbGVzIHRvIGZpbGxcbiAgcmVhZG9ubHkgc2h1ZmZsZU9yZGVyPzogYm9vbGVhbjtcbiAgLy8gRG8gbm90IHBpY2sgYWx0ZXJuYXRlIHRpbGVzICg+ZmZmZilcbiAgcmVhZG9ubHkgc2tpcEFsdGVybmF0ZXM/OiBib29sZWFuO1xuICAvLyBTZXQgb2YgYWxsb3dlZCBzY3JlZW5zIHRvIHBpY2sgZnJvbVxuICByZWFkb25seSBhbGxvd2VkPzogU2NyW107XG4gIC8vIEFsbG93ZWQgYWx0ZXJuYXRpdmVzIGZvciBmaWxsaW5nIHBhdGhzXG4gIHJlYWRvbmx5IHBhdGhBbHRlcm5hdGl2ZXM/OiBNYXA8U2NyLCByZWFkb25seSBudW1iZXJbXT47XG4gIC8vIEFsbG93IHJlcGxhY2luZ1xuICByZWFkb25seSByZXBsYWNlPzogYm9vbGVhbjtcbiAgLy8gRGVsZXRlIG5laWdoYm9yaW5nIHRpbGVzIG9uIGZhaWx1cmVcbiAgcmVhZG9ubHkgZGVsZXRlTmVpZ2hib3JzPzogYm9vbGVhbjtcbiAgLy8gLy8gVHJ5IHRvIGF2b2lkIG1ha2luZyBcImZha2VcIiB0aWxlcyB3aGVuIHBvc3NpYmxlLCBieVxuICAvLyAvLyBsb29raW5nIGZvciBhIG5vbi1mYWtlIG5laWdoYm9yIHRvIHJlcGxhY2Ugd2l0aC5cbiAgLy8gcmVhZG9ubHkgdHJ5QXZvaWRGYWtlcz86IGJvb2xlYW47XG4gIC8vIERlYnVnZ2luZzogcHJpbnQgd2h5IHdlIHN0b3BwZWRcbiAgcmVhZG9ubHkgcHJpbnQ/OiBib29sZWFuO1xufVxuXG5cbi8vIGZ1bmN0aW9uKiBpbnRlcnNlY3Q8VD4oYTogSXRlcmFibGU8VD4sIGI6IEl0ZXJhYmxlPFQ+KTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4vLyAgIGNvbnN0IHNldCA9IG5ldyBTZXQoYSk7XG4vLyAgIGZvciAoY29uc3QgeCBvZiBiKSB7XG4vLyAgICAgaWYgKHNldC5oYXMoeCkpIHlpZWxkIHg7XG4vLyAgIH1cbi8vIH1cblxuXG4vLyBOT1RFOiBTY3JlZW5zIDkzLCA5ZCBhcmUgVU5VU0VEIVxuXG5jb25zdCBVTklDT0RFX1RJTEVTOiB7W2V4aXRzOiBudW1iZXJdOiBzdHJpbmd9ID0ge1xuICAweDEwMTA6ICdcXHUyNTAwJyxcbiAgMHgwMTAxOiAnXFx1MjUwMicsXG4gIDB4MDExMDogJ1xcdTI1MGMnLFxuICAweDExMDA6ICdcXHUyNTEwJyxcbiAgMHgwMDExOiAnXFx1MjUxNCcsXG4gIDB4MTAwMTogJ1xcdTI1MTgnLFxuICAweDAxMTE6ICdcXHUyNTFjJyxcbiAgMHgxMTAxOiAnXFx1MjUyNCcsXG4gIDB4MTExMDogJ1xcdTI1MmMnLFxuICAweDEwMTE6ICdcXHUyNTM0JyxcbiAgMHgxMTExOiAnXFx1MjUzYycsXG4gIDB4MTAwMDogJ1xcdTI1NzQnLFxuICAweDAwMDE6ICdcXHUyNTc1JyxcbiAgMHgwMDEwOiAnXFx1MjU3NicsXG4gIDB4MDEwMDogJ1xcdTI1NzcnLFxufTtcbiJdfQ==