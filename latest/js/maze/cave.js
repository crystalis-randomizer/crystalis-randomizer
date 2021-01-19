import { E, S } from './grid.js';
import { seq, hex } from '../rom/util.js';
import { Metalocation } from '../rom/metalocation.js';
import { AbstractMazeShuffle, OK } from '../maze/maze.js';
import { UnionFind } from '../unionfind.js';
import { DefaultMap } from '../util.js';
const [] = [hex];
export class CaveShuffle extends AbstractMazeShuffle {
    constructor() {
        super(...arguments);
        this.maxPartitions = 1;
        this.minSpikes = 2;
        this.maxSpikes = 5;
        this.looseRefine = false;
        this.addBlocks = true;
        this.initialFillType = 'c';
        this.upEdgeType = 'c';
        this._requirePitDestination = false;
        this.rivers = 0;
        this.wides = 0;
        this.walls = 0;
        this.bridges = 0;
    }
    reset() {
        super.reset();
        this.rivers = 0;
        this.wides = 0;
        this.walls = 0;
        this.bridges = 0;
    }
    requirePitDestination() {
        this._requirePitDestination = true;
        return this;
    }
    survey(meta) {
        var _a, _b;
        const survey = {
            meta,
            id: meta.id,
            tileset: meta.tileset,
            size: 0,
            edges: [0, 0, 0, 0],
            stairs: [0, 0],
            features: {
                arena: 0,
                bridge: 0,
                over: 0,
                pit: 0,
                ramp: 0,
                river: 0,
                spike: 0,
                statue: 0,
                under: 0,
                wall: 0,
                wide: 0,
            },
        };
        if (meta.id >= 0) {
            for (const spawn of meta.rom.locations[meta.id].spawns) {
                if (spawn.isMonster() && spawn.monsterId === 0x8f) {
                    survey.features.statue++;
                }
            }
        }
        for (const pos of meta.allPos()) {
            const scr = meta.get(pos);
            if (!scr.isEmpty() || ((_a = scr.data.exits) === null || _a === void 0 ? void 0 : _a.length))
                survey.size++;
            for (const exit of (_b = scr.data.exits) !== null && _b !== void 0 ? _b : []) {
                const { type } = exit;
                if (type === 'edge:top') {
                    if ((pos >>> 4) === 0)
                        survey.edges[0]++;
                    continue;
                }
                else if (type === 'edge:left') {
                    if ((pos & 0xf) === 0)
                        survey.edges[1]++;
                    continue;
                }
                else if (type === 'edge:bottom') {
                    if ((pos >>> 4) === meta.height - 1)
                        survey.edges[2]++;
                    continue;
                }
                else if (type === 'edge:right') {
                    if ((pos & 0xf) === meta.width - 1)
                        survey.edges[3]++;
                    continue;
                }
                else if (type === 'crypt') {
                    continue;
                }
                else if (type.startsWith('seamless')) {
                }
                else if (exit.dir & 1) {
                    throw new Error(`Bad exit direction: ${exit.dir}`);
                }
                else {
                    survey.stairs[exit.dir >>> 1]++;
                    continue;
                }
            }
            if (scr.hasFeature('arena'))
                survey.features.arena++;
            if (scr.hasFeature('bridge'))
                survey.features.bridge++;
            if (scr.hasFeature('overpass'))
                survey.features.over++;
            if (scr.hasFeature('pit'))
                survey.features.pit++;
            if (scr.hasFeature('ramp'))
                survey.features.ramp++;
            if (scr.hasFeature('spikes'))
                survey.features.spike++;
            if (scr.hasFeature('underpass'))
                survey.features.under++;
            if (scr.hasFeature('wall'))
                survey.features.wall++;
            if (scr.hasFeature('river'))
                survey.features.river++;
            if (scr.hasFeature('wide'))
                survey.features.wide++;
        }
        if (survey.size < 2 && (meta.width > 1 || meta.height > 1))
            survey.size = 2;
        return survey;
    }
    build() {
        this.init();
        let result;
        if ((result = this.fillGrid()), !result.ok)
            return result;
        if ((result = this.preinfer()), !result.ok)
            return result;
        const meta = this.inferScreens();
        if (!meta.ok)
            return meta;
        if ((result = this.refineMetascreens(meta.value)), !result.ok) {
            return result;
        }
        if ((result = this.checkMetascreens(meta.value)), !result.ok) {
            return result;
        }
        if (this._requirePitDestination &&
            !this.requireEligiblePitDestination(meta.value)) {
            return { ok: false, fail: `no eligible pit destination` };
        }
        this.meta = meta.value;
        return OK;
    }
    fillGrid() {
        var _a;
        let result;
        if ((result = this.initialFill()), !result.ok)
            return result;
        if ((result = this.addEdges()), !result.ok)
            return result;
        if ((result = this.addEarlyFeatures()), !result.ok)
            return result;
        if ((result = this.refine()), !result.ok)
            return result;
        if (!this.refineEdges())
            return { ok: false, fail: 'refineEdges' };
        this.removeSpurs();
        this.removeTightLoops();
        if ((result = this.addLateFeatures()), !result.ok)
            return result;
        if ((result = this.addStairs(...((_a = this.params.stairs) !== null && _a !== void 0 ? _a : []))),
            !result.ok)
            return result;
        return OK;
    }
    init() { }
    initialFill() {
        this.fillCave(this.initialFillType);
        return OK;
    }
    fillCave(s) {
        for (let y = 0.5; y < this.h; y++) {
            for (let x = 0.5; x < this.w; x++) {
                if (y > 1)
                    this.grid.set2(y - 0.5, x, s);
                if (x > 1)
                    this.grid.set2(y, x - 0.5, s);
                this.grid.set2(y, x, s);
            }
        }
        this.count = this.h * this.w;
    }
    addEdges() {
        if (!this.params.edges)
            return OK;
        for (let dir = 0; dir < 4; dir++) {
            let count = this.params.edges[dir] || 0;
            if (!count)
                continue;
            const edges = seq(dir & 1 ? this.h : this.w, i => this.grid.border(dir, i));
            for (const edge of this.random.ishuffle(edges)) {
                if (this.grid.get(edge))
                    continue;
                if (dir & 1) {
                    if (dir === 1) {
                        if (this.addLeftEdge(edge))
                            count--;
                    }
                    else {
                        if (this.addRightEdge(edge))
                            count--;
                    }
                }
                else {
                    if (dir === 0) {
                        if (this.addUpEdge(edge))
                            count--;
                    }
                    else {
                        if (this.addDownEdge(edge))
                            count--;
                    }
                }
                if (!count)
                    break;
            }
            if (count) {
                return { ok: false, fail: `can't fit all edges shuffling ${this.loc}\nmissing ${count} ${dir}` };
            }
        }
        return OK;
    }
    addUpEdge(edge) {
        const below = edge + 0x800;
        const left = below - 8;
        const left2 = left - 8;
        const left3 = left2 - 8;
        const right = below + 8;
        const right2 = right + 8;
        const right3 = right2 + 8;
        if (this.grid.isBorder(left)) {
            if (this.grid.get(left))
                return false;
        }
        else {
            if (this.grid.get(edge - 16))
                return false;
            if (this.grid.isBorder(left3) && this.grid.get(left3))
                return false;
        }
        if (this.grid.isBorder(right)) {
            if (this.grid.get(right))
                return false;
        }
        else {
            if (this.grid.get(edge + 16))
                return false;
            if (this.grid.isBorder(right3) && this.grid.get(right3))
                return false;
        }
        this.fixed.add(edge);
        this.grid.set(edge, this.upEdgeType);
        this.grid.set(left, '');
        this.grid.set(right, '');
        return true;
    }
    addDownEdge(edge) {
        const above = edge - 0x800;
        const left = above - 8;
        const right = above + 8;
        if (!this.grid.get(above))
            return false;
        if (this.grid.isBorder(left) && this.grid.get(left))
            return false;
        if (this.grid.isBorder(right) && this.grid.get(right))
            return false;
        this.fixed.add(edge);
        this.grid.set(edge, 'n');
        this.grid.set(left, '');
        this.grid.set(right, '');
        return true;
    }
    addLeftEdge(edge) {
        const right = edge + 8;
        const rightUp = right - 0x800;
        const rightDown = right + 0x800;
        if (!this.grid.get(right))
            return false;
        if (this.grid.isBorder(rightUp) && this.grid.get(rightUp))
            return false;
        if (this.grid.isBorder(rightDown) && this.grid.get(rightDown))
            return false;
        this.fixed.add(edge);
        this.grid.set(edge, 'c');
        return true;
    }
    addRightEdge(edge) {
        const left = edge - 8;
        const leftUp = left - 0x800;
        const leftDown = left + 0x800;
        if (!this.grid.get(left))
            return false;
        if (this.grid.isBorder(leftUp) && this.grid.get(leftUp))
            return false;
        if (this.grid.isBorder(leftDown) && this.grid.get(leftDown))
            return false;
        this.fixed.add(edge);
        this.grid.set(edge, 'c');
        return true;
    }
    addEarlyFeatures() {
        var _a, _b, _c, _d;
        if (!this.addSpikes((_b = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.spike) !== null && _b !== void 0 ? _b : 0)) {
            return { ok: false, fail: `add spikes\n${this.grid.show()}` };
        }
        if (!this.addOverpasses((_d = (_c = this.params.features) === null || _c === void 0 ? void 0 : _c.over) !== null && _d !== void 0 ? _d : 0)) {
            return { ok: false, fail: 'add overpasses' };
        }
        return OK;
    }
    addLateFeatures() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!this.addArenas((_b = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.arena) !== null && _b !== void 0 ? _b : 0)) {
            return { ok: false, fail: `addArenas\n${this.grid.show()}` };
        }
        if (!this.addUnderpasses((_d = (_c = this.params.features) === null || _c === void 0 ? void 0 : _c.under) !== null && _d !== void 0 ? _d : 0)) {
            return { ok: false, fail: 'addUnderpasses' };
        }
        if (!this.addPits((_f = (_e = this.params.features) === null || _e === void 0 ? void 0 : _e.pit) !== null && _f !== void 0 ? _f : 0)) {
            return { ok: false, fail: 'addPits' };
        }
        if (!this.addRamps((_h = (_g = this.params.features) === null || _g === void 0 ? void 0 : _g.ramp) !== null && _h !== void 0 ? _h : 0)) {
            return { ok: false, fail: 'addRamps' };
        }
        return OK;
    }
    addArenas(arenas) {
        if (!arenas)
            return true;
        const g = this.grid;
        for (const c of this.random.ishuffle(this.grid.screens())) {
            const middle = (c | 0x808);
            if (!this.isEligibleArena(middle))
                continue;
            const tile = this.extract(this.grid, c);
            const arenaTile = tile.substring(0, 4) + 'a' + tile.substring(5);
            const options = this.orig.tileset.getMetascreensFromTileString(arenaTile);
            if (!options.length) {
                console.log(`no tile ${arenaTile}`);
                continue;
            }
            this.fixed.add(middle);
            g.set(middle, 'a');
            arenas--;
            if (!arenas)
                return true;
        }
        return false;
    }
    isEligibleArena(middle) {
        const g = this.grid;
        const left = (middle - 8);
        const left2 = (left - 8);
        const right = (middle + 8);
        const right2 = (right + 8);
        if (g.get(middle) !== 'c' && g.get(middle) !== 'w')
            return false;
        if (g.get(left) || g.get(right))
            return false;
        if (!g.isBorder(left) && g.get(left2))
            return false;
        if (!g.isBorder(right) && g.get(right2))
            return false;
        return true;
    }
    addUnderpasses(under) {
        return this.addStraightScreenLate(under, 'b', 0x800);
    }
    addOverpasses(over) {
        let attempts = 0;
        while (over) {
            const y = this.random.nextInt(this.h - 2) + 1;
            const x = this.random.nextInt(this.w - 2) + 1;
            const c = (y << 12 | x << 4 | 0x808);
            if (this.grid.get(c) !== 'c') {
                if (++attempts > 10)
                    throw new Error('Bad attempts');
                continue;
            }
            this.grid.set(c, 'b');
            this.fixed.add(c);
            this.grid.set(c - 8, '');
            this.grid.set(c + 8, '');
            over--;
        }
        return true;
    }
    addPits(pits) {
        return this.addStraightScreenLate(pits, 'p');
    }
    addRamps(ramps) {
        return this.addStraightScreenLate(ramps, '/', 8);
    }
    addStraightScreenLate(count, char, delta) {
        if (!count)
            return true;
        for (const c of this.random.ishuffle(this.grid.screens())) {
            const middle = (c | 0x808);
            if (this.grid.get(middle) !== 'c')
                continue;
            if (delta) {
                const side1 = (middle - delta);
                const side2 = (middle + delta);
                if (this.grid.get(side1) || this.grid.get(side2))
                    continue;
            }
            const tile = this.extract(this.grid, c);
            const newTile = tile.substring(0, 4) + char + tile.substring(5);
            const options = this.orig.tileset.getMetascreensFromTileString(newTile);
            if (!options.length)
                continue;
            this.fixed.add(middle);
            this.grid.set(middle, char);
            count--;
            if (!count)
                return true;
        }
        return false;
    }
    addSpikes(spikes) {
        if (!spikes)
            return true;
        let attempts = 0;
        while (spikes > 0) {
            if (++attempts > 20)
                return false;
            let len = Math.min(spikes, Math.floor(this.h * 0.6), this.maxSpikes);
            while (len < spikes - 1 && len > this.minSpikes) {
                if (this.random.next() < 0.2)
                    len--;
            }
            const x = (len > 2 && this.w > 3) ? this.random.nextInt(this.w - 2) + 1 :
                this.random.nextInt(this.w);
            if (len > spikes - this.minSpikes) {
                if (len >= this.h - 2) {
                    len = this.h - 2;
                }
                else {
                    len = spikes;
                }
            }
            const y0 = this.random.nextInt(this.h - len - 2) + 1;
            const t0 = y0 << 12 | x << 4 | 0x808;
            const t1 = t0 + ((len - 1) << 12);
            for (let t = t0 - 0x1000; len && t <= t1 + 0x1000; t += 0x800) {
                if (this.grid.get(t) !== 'c')
                    len = 0;
            }
            if (!len)
                continue;
            const cleared = [t0 - 8, t0 + 8, t1 - 8, t1 + 8];
            const orphaned = this.tryClear(cleared);
            if (!orphaned.length)
                continue;
            for (const c of orphaned) {
                this.grid.set(c, '');
            }
            this.fixed.add((t0 - 0x800));
            this.fixed.add((t0 - 0x1000));
            this.fixed.add((t1 + 0x800));
            this.fixed.add((t1 + 0x1000));
            for (let t = t0; t <= t1; t += 0x800) {
                this.fixed.add(t);
                this.grid.set(t, 's');
            }
            spikes -= len;
            attempts = 0;
        }
        return spikes === 0;
    }
    canRemove(c) {
        return c === this.initialFillType;
    }
    tryClear(coords) {
        const replace = new Map();
        for (const c of coords) {
            if (this.fixed.has(c))
                return [];
            replace.set(c, '');
        }
        const parts = this.grid.partition(replace);
        const [first] = parts.values();
        if (first.size === parts.size) {
            return [...coords];
        }
        const connected = new Set();
        const allParts = new Set(parts.values());
        for (const fixed of this.fixed) {
            connected.add(parts.get(fixed));
        }
        if (connected.size > this.maxPartitions)
            return [];
        const orphaned = [...coords];
        for (const part of allParts) {
            if (connected.has(part))
                continue;
            orphaned.push(...part);
        }
        return orphaned;
    }
    refine() {
        let filled = new Set();
        for (let i = 0; i < this.grid.data.length; i++) {
            if (this.grid.data[i])
                filled.add(this.grid.coord(i));
        }
        let attempts = 0;
        while (this.count > this.size) {
            if (attempts++ > 50)
                throw new Error(`refine failed: attempts`);
            let removed = 0;
            for (const coord of this.random.ishuffle([...filled])) {
                if (this.grid.isBorder(coord) ||
                    !this.canRemove(this.grid.get(coord)) ||
                    this.fixed.has(coord)) {
                    continue;
                }
                if (removed > 3)
                    break;
                const parts = this.grid.partition(this.removalMap(coord));
                const [first] = parts.values();
                if (first.size === parts.size && parts.size > 1) {
                    removed++;
                    filled.delete(coord);
                    if ((coord & 0x808) === 0x808)
                        this.count--;
                    this.grid.set(coord, '');
                }
                else {
                    let part;
                    for (const set of parts.values()) {
                        if (!part || set.size > part.size)
                            part = set;
                    }
                    if (![...this.fixed].every(c => part.has(c)))
                        continue;
                    const count = [...part].filter(c => (c & 0x808) == 0x808).length;
                    if (count < this.size)
                        continue;
                    removed++;
                    filled = part;
                    this.count = count;
                    this.grid.set(coord, '');
                    for (const [k, v] of parts) {
                        if (v !== part)
                            this.grid.set(k, '');
                    }
                }
            }
            if (!removed) {
                if (this.looseRefine)
                    return OK;
                return { ok: false, fail: `refine ${this.count} > ${this.size}\n${this.grid.show()}` };
            }
        }
        return OK;
    }
    removalMap(coord) {
        return new Map([[coord, '']]);
    }
    refineEdges() {
        let edges = [];
        for (let i = 0; i < this.grid.data.length; i++) {
            if (!this.grid.data[i])
                continue;
            const coord = this.grid.coord(i);
            if (this.grid.isBorder(coord) || this.fixed.has(coord))
                continue;
            if ((coord ^ (coord >> 8)) & 8)
                edges.push(coord);
        }
        this.random.shuffle(edges);
        const orig = this.grid.partition(new Map());
        let size = orig.size;
        const partCount = new Set(orig.values()).size;
        for (const e of edges) {
            const parts = this.grid.partition(new Map([[e, '']]));
            const [first] = parts.values();
            const ok = first.size === parts.size ?
                parts.size === size - 1 :
                new Set(parts.values()).size === partCount && parts.size === size - 1;
            if (ok) {
                size--;
                this.grid.set(e, '');
            }
        }
        return true;
    }
    removeSpurs() {
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const c = (y << 12 | 0x808 | x << 4);
                if (this.grid.get(c))
                    continue;
                const up = (c - 0x800);
                const down = (c + 0x800);
                const left = (c - 0x8);
                const right = (c + 0x8);
                if ((this.grid.get(up) || this.grid.get(down)) &&
                    (this.grid.get(left) || this.grid.get(right))) {
                    if (this.random.nextInt(2)) {
                        this.grid.set(up, '');
                        this.grid.set(down, '');
                    }
                    else {
                        this.grid.set(left, '');
                        this.grid.set(right, '');
                    }
                }
            }
        }
    }
    removeTightLoops() {
        for (let y = 0; y < this.h - 1; y++) {
            const row = y << 12 | 0x800;
            for (let x = 0; x < this.w - 1; x++) {
                const coord = (row | (x << 4) | 8);
                if (this.isTightLoop(coord))
                    this.breakTightLoop(coord);
            }
        }
    }
    isTightLoop(coord) {
        for (let dy = 0; dy < 0x1800; dy += 0x800) {
            for (let dx = 0; dx < 0x18; dx += 8) {
                const delta = dy | dx;
                if (delta === 0x808)
                    continue;
                if (this.grid.get((coord + delta)) !== 'c')
                    return false;
            }
        }
        return true;
    }
    breakTightLoop(coord) {
        const r = this.random.nextInt(0x10000);
        const delta = r & 1 ? (r & 0x1000) | 8 : (r & 0x10) | 0x800;
        this.grid.set((coord + delta), '');
    }
    addStairs(up = 0, down = 0) {
        const stairs = [up, down];
        if (!stairs[0] && !stairs[1])
            return OK;
        for (const c of this.random.ishuffle(this.grid.screens())) {
            if (!this.tryAddStair(c, stairs))
                continue;
            if (!stairs[0] && !stairs[1])
                return OK;
        }
        return { ok: false, fail: `stairs` };
    }
    addEarlyStair(c, stair) {
        const mods = [];
        const left = c - 8;
        const right = c + 8;
        const up = c - 0x800;
        const down = c + 0x800;
        let neighbors = [c - 8, c + 8];
        if (stair === '<') {
            neighbors.push(down);
            mods.push([up, '']);
            if (this.grid.get(left) === 'c' && this.grid.get(right) === 'c' &&
                this.random.nextInt(3)) {
                mods.push([down, ''], [c, '<']);
                return mods;
            }
        }
        else if (stair === '>') {
            neighbors.push(up);
            mods.push([down, '']);
        }
        neighbors = neighbors.filter(c => this.grid.get(c) === 'c');
        if (!neighbors.length)
            return [];
        const keep = this.random.nextInt(neighbors.length);
        for (let j = 0; j < neighbors.length; j++) {
            if (j !== keep)
                mods.push([neighbors[j], '']);
        }
        mods.push([c, stair]);
        return mods;
    }
    tryAddStair(c, stairs) {
        if (this.fixed.has((c | 0x808)))
            return false;
        const tile = this.extract(this.grid, c);
        const both = stairs[0] && stairs[1];
        const total = stairs[0] + stairs[1];
        const up = this.random.nextInt(total) < stairs[0];
        const candidates = [up ? 0 : 1];
        if (both)
            candidates.push(up ? 1 : 0);
        for (const stair of candidates) {
            const stairChar = '<>'[stair];
            const stairTile = tile.substring(0, 4) + stairChar + tile.substring(5);
            if (this.orig.tileset.getMetascreensFromTileString(stairTile).length) {
                this.grid.set((c | 0x808), stairChar);
                stairs[stair]--;
                return true;
            }
        }
        return false;
    }
    tryConnect(start, end, char, attempts = 1) {
        var _a;
        while (attempts-- > 0) {
            const replace = new Map();
            let pos = start;
            if ((start & end & 0x808) !== 0x808) {
                throw new Error(`bad start ${hex(start)} or end ${hex(end)}`);
            }
            replace.set(pos, char);
            while (pos !== end) {
                const dirs = [];
                for (const dir of [8, -8, 0x800, -0x800]) {
                    const pos1 = pos + dir;
                    const pos2 = pos + 2 * dir;
                    if (this.fixed.has(pos2))
                        continue;
                    if ((_a = replace.get(pos2)) !== null && _a !== void 0 ? _a : this.grid.get(pos2))
                        continue;
                    if (this.grid.isBorder(pos1))
                        continue;
                    dirs.push(dir);
                }
                if (!dirs.length)
                    break;
                const dy = (end >> 12) - (pos >> 12);
                const dx = (end & 0xf0) - (pos & 0xf0);
                const preferred = new Set(dirs);
                if (dy < 0)
                    preferred.delete(0x800);
                if (dy > 0)
                    preferred.delete(-0x800);
                if (dx < 0)
                    preferred.delete(8);
                if (dx > 0)
                    preferred.delete(-8);
                dirs.push(...preferred, ...preferred);
                const dir = this.random.pick(dirs);
                replace.set(pos + dir, char);
                replace.set(pos = pos + 2 * dir, char);
            }
            if (pos !== end)
                continue;
            for (const [c, v] of replace) {
                this.grid.set(c, v);
                if ((c & 0x808) === 0x808)
                    this.count++;
            }
            return true;
        }
        return false;
    }
    tryAddLoop(char, attempts = 1) {
        const uf = new UnionFind();
        for (let i = 0; i < this.grid.data.length; i++) {
            const c = this.grid.coord(i);
            if (this.grid.get(c) || this.grid.isBorder(c))
                continue;
            if (!this.grid.get(E(c)))
                uf.union([c, E(c)]);
            if (!this.grid.get(S(c)))
                uf.union([c, S(c)]);
        }
        const eligible = new DefaultMap(() => []);
        for (const s of this.grid.screens()) {
            const c = s + 0x808;
            if (!this.grid.get(c))
                continue;
            for (const d of [8, -8, 0x800, -0x800]) {
                const e1 = c + d;
                if (this.grid.isBorder(e1) || this.grid.get(e1))
                    continue;
                const e2 = c + 2 * d;
                if (this.grid.get(e2))
                    continue;
                const replace = new Map([[e1, char]]);
                const tile = this.extract(this.grid, s, { replace });
                if (this.orig.tileset.getMetascreensFromTileString(tile).length) {
                    eligible.get(uf.find(e2)).push([e1, e2]);
                }
            }
        }
        const weightedMap = new Map();
        for (const partition of eligible.values()) {
            if (partition.length < 2)
                continue;
            for (const [e1] of partition) {
                weightedMap.set(e1, partition);
            }
        }
        const weighted = [...weightedMap.values()];
        if (!weighted.length)
            return false;
        while (attempts-- > 0) {
            const partition = this.random.pick(weighted);
            const [[e0, c0], [e1, c1]] = this.random.ishuffle(partition);
            this.grid.set(e0, char);
            this.grid.set(e1, char);
            if (this.tryConnect(c0, c1, char, 5)) {
                return true;
            }
            this.grid.set(e0, '');
            this.grid.set(e1, '');
        }
        return false;
    }
    tryExtrude(char, length, attempts = 1) {
        while (attempts--) {
            for (const c of this.random.ishuffle(this.grid.screens())) {
                const mid = c + 0x808;
                if (!this.grid.get(mid))
                    continue;
                const tile = this.extract(this.grid, c);
                for (let dir of this.random.ishuffle([0, 1, 2, 3])) {
                    const n1 = mid + GRIDDIR[dir];
                    const n2 = mid + 2 * GRIDDIR[dir];
                    if (this.grid.get(n1) || this.grid.isBorder(n1) || this.grid.get(n2))
                        continue;
                    const i = TILEDIR[dir];
                    const rep = tile.substring(0, i) + char + tile.substring(i + 1);
                    if (this.orig.tileset.getMetascreensFromTileString(rep).length) {
                        this.grid.set(n1, char);
                        this.grid.set(n2, char);
                        const added = this.tryContinueExtrude(char, length, n2);
                        if (added)
                            return added;
                        this.grid.set(n2, '');
                        this.grid.set(n1, '');
                    }
                }
            }
        }
        return 0;
    }
    tryContinueExtrude(char, length, c) {
        const tile = this.extract(this.grid, c - 0x808);
        const ok = this.orig.tileset.getMetascreensFromTileString(tile).length > 0;
        if (length === 1)
            return ok ? 1 : 0;
        if (ok && !this.random.nextInt(length))
            return 1;
        for (const dir of this.random.ishuffle([0, 1, 2, 3])) {
            const n1 = c + GRIDDIR[dir];
            const n2 = c + 2 * GRIDDIR[dir];
            if (this.grid.get(n1) || this.grid.isBorder(n1) || this.grid.get(n2))
                continue;
            const i = TILEDIR[dir];
            const rep = tile.substring(0, i) + char + tile.substring(i + 1);
            if (this.orig.tileset.getMetascreensFromTileString(rep).length) {
                this.grid.set(n1, char);
                this.grid.set(n2, char);
                const added = this.tryContinueExtrude(char, length - 1, n2);
                if (added)
                    return added + 1;
                this.grid.set(n2, '');
                this.grid.set(n1, '');
            }
            if (ok)
                break;
        }
        return ok ? 1 : 0;
    }
    tryAdd(opts = {}) {
        const tileset = this.orig.tileset;
        const { attempts = 1, char = 'c', start, loop = false } = opts;
        for (let attempt = 0; attempt < attempts; attempt++) {
            const startIter = start != null ?
                [(start & 0xf0f0)] :
                this.random.ishuffle(this.grid.screens());
            for (const c of startIter) {
                const mid = c + 0x808;
                if (!this.grid.get(mid))
                    continue;
                const tile = this.extract(this.grid, c);
                for (let dir of this.random.ishuffle([0, 1, 2, 3])) {
                    const n1 = mid + GRIDDIR[dir];
                    const n2 = mid + 2 * GRIDDIR[dir];
                    if (this.fixed.has(n1) || this.fixed.has(n2))
                        continue;
                    const o1 = this.grid.get(n1);
                    const o2 = this.grid.get(n2);
                    if ((o1 && (o2 || o1 !== char)) || this.grid.isBorder(n1))
                        continue;
                    if (!loop) {
                        const neighborTile = this.extract(this.grid, n2 - 0x808, { replace: new Map([[n1, '']]) });
                        if (/\S/.test(neighborTile))
                            continue;
                    }
                    const i = TILEDIR[dir];
                    const rep = tile.substring(0, i) + char + tile.substring(i + 1);
                    if (tileset.getMetascreensFromTileString(rep).length) {
                        this.count++;
                        this.grid.set(n1, char);
                        this.grid.set(n2, char);
                        const neighborTile = this.extract(this.grid, n2 - 0x808);
                        if (tileset.getMetascreensFromTileString(neighborTile).length) {
                            return 1;
                        }
                        this.grid.set(n2, o2);
                        this.grid.set(n1, o1);
                        this.count--;
                    }
                }
            }
        }
        return 0;
    }
    preinfer() {
        var _a;
        let result;
        if ((_a = this.params.features) === null || _a === void 0 ? void 0 : _a.spike) {
            if ((result = this.preinferSpikes()), !result.ok)
                return result;
        }
        return OK;
    }
    preinferSpikes() {
        return OK;
    }
    inferScreens() {
        const screens = [];
        for (const s of this.grid.screens()) {
            const tile = this.extract(this.grid, s);
            const candidates = this.orig.tileset.getMetascreensFromTileString(tile)
                .filter(s => !s.data.mod);
            if (!candidates.length) {
                if (this.grid.show().length > 100000)
                    debugger;
                return { ok: false, fail: `infer screen ${hex(s)}: [${tile}]\n${this.grid.show()}` };
            }
            const pick = this.random.pick(candidates);
            screens.push(pick);
            if (pick.hasFeature('wall'))
                this.walls++;
            if (pick.hasFeature('bridge'))
                this.bridges++;
        }
        let allEmpty = true;
        const meta = new Metalocation(this.params.id, this.orig.tileset, this.h, this.w);
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const scr = screens[y * this.w + x];
                meta.set(y << 4 | x, scr);
                if (!scr.isEmpty())
                    allEmpty = false;
                if (y) {
                    const above = meta.get((y - 1) << 4 | x);
                    if (this.orig.tileset.isBannedVertical(above, scr)) {
                        return { ok: false,
                            fail: `bad vertical neighbor at ${y}${x}: ${above.name} ${scr.name}` };
                    }
                }
                if (x) {
                    const left = meta.get(y << 4 | (x - 1));
                    if (this.orig.tileset.isBannedHorizontal(left, scr)) {
                        return { ok: false,
                            fail: `bad horizontal neighbor at ${y}${x}: ${left.name} ${scr.name}` };
                    }
                }
            }
        }
        if (allEmpty)
            return { ok: false, fail: `all screens empty` };
        return { ok: true, value: meta };
    }
    refineMetascreens(meta) {
        var _a, _b;
        const bridges = ((_a = this.params.features) === null || _a === void 0 ? void 0 : _a.bridge) || 0;
        const walls = ((_b = this.params.features) === null || _b === void 0 ? void 0 : _b.wall) || 0;
        for (const pos of this.random.ishuffle(meta.allPos())) {
            const c = ((pos << 8 | pos << 4) & 0xf0f0);
            const tile = this.extract(this.grid, c);
            const scr = meta.get(pos);
            if (this.bridges <= bridges && scr.hasFeature('bridge'))
                continue;
            if (this.addBlocks &&
                this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'block'))) {
                if (scr.hasFeature('bridge'))
                    this.bridges--;
                continue;
            }
            if (scr.hasFeature('bridge')) {
                if (this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'bridge'))) {
                    this.bridges--;
                    continue;
                }
            }
            if (this.walls < walls && !scr.hasFeature('wall')) {
                if (this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'wall'))) {
                    this.walls++;
                    continue;
                }
            }
        }
        if (this.bridges !== bridges) {
            return { ok: false,
                fail: `refineMeta bridges want ${bridges} got ${this.bridges}\n${meta.show()}` };
        }
        if (this.walls !== walls) {
            return { ok: false,
                fail: `refineMeta walls want ${walls} got ${this.walls}\n${meta.show()}` };
        }
        return OK;
    }
    tryMeta(meta, pos, screens) {
        for (const s of screens) {
            if (!this.checkMeta(meta, new Map([[pos, s]])))
                continue;
            meta.set(pos, s);
            return true;
        }
        return false;
    }
    checkMeta(meta, replacements) {
        const opts = replacements ? { with: replacements } : {};
        const parts = meta.traverse(opts);
        return new Set(parts.values()).size === this.maxPartitions;
    }
    requireEligiblePitDestination(meta) {
        let v = false;
        let h = false;
        for (const pos of meta.allPos()) {
            const scr = meta.get(pos);
            if (scr.hasFeature('river') || scr.hasFeature('empty'))
                continue;
            const edges = (scr.data.edges || '').split('').map(x => x === ' ' ? '' : x);
            if (edges[0] && edges[2])
                v = true;
            if ((edges[1] && edges[3]) || scr.hasFeature('spikes')) {
                h = true;
            }
            if (v && h)
                return true;
        }
        return false;
    }
    checkMetascreens(meta) {
        var _a, _b;
        if (!((_a = this.params.features) === null || _a === void 0 ? void 0 : _a.statue))
            return OK;
        let statues = 0;
        for (const pos of meta.allPos()) {
            const scr = meta.get(pos);
            statues += ((_b = scr.data.statues) === null || _b === void 0 ? void 0 : _b.length) || 0;
        }
        if (statues < this.params.features.statue) {
            return { ok: false, fail: `insufficient statue screens` };
        }
        return OK;
    }
}
export class WideCaveShuffle extends CaveShuffle {
    constructor() {
        super(...arguments);
        this.initialFillType = 'w';
        this.upEdgeType = 'n';
    }
    setUpEdgeType(t) {
        this.upEdgeType = t;
        return this;
    }
    isEligibleArena(middle) {
        return !(middle & 0xf000) && super.isEligibleArena(middle);
    }
}
export class CryptEntranceShuffle extends CaveShuffle {
    refineMetascreens(meta) {
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (this.grid.get((y << 12 | x << 4 | 0x808)) === 'a') {
                    meta.set(y << 4 | x, meta.rom.metascreens.cryptArena_statues);
                }
            }
        }
        return super.refineMetascreens(meta);
    }
    isEligibleArena(c) {
        return !this.grid.get(c - 0x800) && super.isEligibleArena(c);
    }
}
const TILEDIR = [1, 3, 7, 5];
const GRIDDIR = [-0x800, -8, 0x800, 8];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUF3QixDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFMUMsT0FBTyxFQUFFLFlBQVksRUFBTyxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxFQUFFLEVBQWtCLE1BQU0saUJBQWlCLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFeEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUVqQixNQUFNLE9BQU8sV0FBWSxTQUFRLG1CQUFtQjtJQUFwRDs7UUFHRSxrQkFBYSxHQUFHLENBQUMsQ0FBQztRQUNsQixjQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLGNBQVMsR0FBRyxJQUFJLENBQUM7UUFDakIsb0JBQWUsR0FBRyxHQUFHLENBQUM7UUFDdEIsZUFBVSxHQUFHLEdBQUcsQ0FBQztRQUNULDJCQUFzQixHQUFHLEtBQUssQ0FBQztRQUd2QyxXQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLFVBQUssR0FBRyxDQUFDLENBQUM7UUFDVixZQUFPLEdBQUcsQ0FBQyxDQUFDO0lBd3JDZCxDQUFDO0lBdHJDQyxLQUFLO1FBQ0gsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2QsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDaEIsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxxQkFBcUI7UUFDbkIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUF3QkQsTUFBTSxDQUFDLElBQWtCOztRQUV2QixNQUFNLE1BQU0sR0FBRztZQUNiLElBQUk7WUFDSixFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDWCxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsSUFBSSxFQUFFLENBQUM7WUFDUCxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkIsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLFFBQVEsRUFBRTtnQkFDUixLQUFLLEVBQUUsQ0FBQztnQkFDUixNQUFNLEVBQUUsQ0FBQztnQkFDVCxJQUFJLEVBQUUsQ0FBQztnQkFDUCxHQUFHLEVBQUUsQ0FBQztnQkFDTixJQUFJLEVBQUUsQ0FBQztnQkFDUCxLQUFLLEVBQUUsQ0FBQztnQkFDUixLQUFLLEVBQUUsQ0FBQztnQkFDUixNQUFNLEVBQUUsQ0FBQztnQkFDVCxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsQ0FBQztnQkFDUCxJQUFJLEVBQUUsQ0FBQzthQUNSO1NBQ0YsQ0FBQztRQUNGLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDaEIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUN0RCxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtvQkFDakQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztpQkFDMUI7YUFDRjtTQUNGO1FBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDL0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxXQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSywwQ0FBRSxNQUFNLENBQUE7Z0JBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzVELEtBQUssTUFBTSxJQUFJLFVBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLG1DQUFJLEVBQUUsRUFBRTtnQkFDdkMsTUFBTSxFQUFDLElBQUksRUFBQyxHQUFHLElBQUksQ0FBQztnQkFDcEIsSUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFO29CQUN2QixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7d0JBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN6QyxTQUFTO2lCQUNWO3FCQUFNLElBQUksSUFBSSxLQUFLLFdBQVcsRUFBRTtvQkFDL0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO3dCQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDekMsU0FBUztpQkFDVjtxQkFBTSxJQUFJLElBQUksS0FBSyxhQUFhLEVBQUU7b0JBQ2pDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDO3dCQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDdkQsU0FBUztpQkFDVjtxQkFBTSxJQUFJLElBQUksS0FBSyxZQUFZLEVBQUU7b0JBQ2hDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDO3dCQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDdEQsU0FBUztpQkFDVjtxQkFBTSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUU7b0JBRTNCLFNBQVM7aUJBQ1Y7cUJBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2lCQUV2QztxQkFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFO29CQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztpQkFDcEQ7cUJBQU07b0JBQ0wsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ2hDLFNBQVM7aUJBQ1Y7YUFDRjtZQUNELElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7Z0JBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyRCxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkQsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztnQkFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3ZELElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7Z0JBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNqRCxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO2dCQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkQsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztnQkFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3RELElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7Z0JBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN6RCxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO2dCQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkQsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQztnQkFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3JELElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNwRDtRQUNELElBQUksTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxLQUFLO1FBQ0gsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1osSUFBSSxNQUFvQixDQUFDO1FBRXpCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUFFLE9BQU8sTUFBTSxDQUFDO1FBRzFELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUFFLE9BQU8sTUFBTSxDQUFDO1FBQzFELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFBRSxPQUFPLElBQUksQ0FBQztRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7WUFFN0QsT0FBTyxNQUFNLENBQUM7U0FDZjtRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRTtZQUM1RCxPQUFPLE1BQU0sQ0FBQztTQUNmO1FBQ0QsSUFBSSxJQUFJLENBQUMsc0JBQXNCO1lBQzNCLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNuRCxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsNkJBQTZCLEVBQUMsQ0FBQztTQUN6RDtRQUNELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN2QixPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFRCxRQUFROztRQUNOLElBQUksTUFBb0IsQ0FBQztRQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFBRSxPQUFPLE1BQU0sQ0FBQztRQUU3RCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFBRSxPQUFPLE1BQU0sQ0FBQztRQUMxRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUFFLE9BQU8sTUFBTSxDQUFDO1FBRWxFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUFFLE9BQU8sTUFBTSxDQUFDO1FBRXhELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFBRSxPQUFPLE1BQU0sQ0FBQztRQUNqRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxPQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxtQ0FBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3hELENBQUMsTUFBTSxDQUFDLEVBQUU7WUFBRSxPQUFPLE1BQU0sQ0FBQztRQUM5QixPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFLRCxJQUFJLEtBQUksQ0FBQztJQUdULFdBQVc7UUFDVCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFRCxRQUFRLENBQUMsQ0FBUztRQUVoQixLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQztvQkFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLEdBQUcsQ0FBQztvQkFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN6QjtTQUNGO1FBQ0QsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUdELFFBQVE7UUFFTixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFDbEMsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNoQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLEtBQUs7Z0JBQUUsU0FBUztZQUNyQixNQUFNLEtBQUssR0FDUCxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBRTlDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO29CQUFFLFNBQVM7Z0JBQ2xDLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtvQkFDWCxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUU7d0JBQ2IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQzs0QkFBRSxLQUFLLEVBQUUsQ0FBQztxQkFDckM7eUJBQU07d0JBQ0wsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQzs0QkFBRSxLQUFLLEVBQUUsQ0FBQztxQkFDdEM7aUJBQ0Y7cUJBQU07b0JBQ0wsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFO3dCQUNiLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7NEJBQUUsS0FBSyxFQUFFLENBQUM7cUJBQ25DO3lCQUFNO3dCQUNMLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7NEJBQUUsS0FBSyxFQUFFLENBQUM7cUJBQ3JDO2lCQUNGO2dCQUNELElBQUksQ0FBQyxLQUFLO29CQUFFLE1BQU07YUFDbkI7WUFDRCxJQUFJLEtBQUssRUFBRTtnQkFDVCxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsaUNBQWlDLElBQUksQ0FBQyxHQUN0QyxhQUFhLEtBQUssSUFBSSxHQUFHLEVBQUUsRUFBQyxDQUFDO2FBRXZEO1NBQ0Y7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFRixTQUFTLENBQUMsSUFBZTtRQU10QixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsS0FBa0IsQ0FBQztRQUN4QyxNQUFNLElBQUksR0FBRyxLQUFLLEdBQUcsQ0FBYyxDQUFDO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFjLENBQUM7UUFDcEMsTUFBTSxLQUFLLEdBQUcsS0FBSyxHQUFHLENBQWMsQ0FBQztRQUNyQyxNQUFNLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBYyxDQUFDO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLEtBQUssR0FBRyxDQUFjLENBQUM7UUFDdEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQWMsQ0FBQztRQUN2QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1NBQ3ZDO2FBQU07WUFDTCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFlLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFDeEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7U0FDckU7UUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzdCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1NBQ3hDO2FBQU07WUFDTCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFlLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFDeEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7U0FDdkU7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQWU7UUFHekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEtBQWtCLENBQUM7UUFDeEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxHQUFHLENBQWMsQ0FBQztRQUNwQyxNQUFNLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUN4QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ2xFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDcEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQWU7UUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQWMsQ0FBQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxLQUFLLEdBQUcsS0FBa0IsQ0FBQztRQUMzQyxNQUFNLFNBQVMsR0FBRyxLQUFLLEdBQUcsS0FBa0IsQ0FBQztRQUU3QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDeEMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUN4RSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzVFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6QixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxZQUFZLENBQUMsSUFBZTtRQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBYyxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxLQUFrQixDQUFDO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxLQUFrQixDQUFDO1FBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUN2QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ3RFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDMUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQXlDRCxnQkFBZ0I7O1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLGFBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLEtBQUssbUNBQUksQ0FBQyxDQUFDLEVBQUU7WUFDckQsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGVBQWUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsYUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsMENBQUUsSUFBSSxtQ0FBSSxDQUFDLENBQUMsRUFBRTtZQUN4RCxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUMsQ0FBQztTQUM1QztRQUNELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELGVBQWU7O1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLGFBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLEtBQUssbUNBQUksQ0FBQyxDQUFDLEVBQUU7WUFDckQsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGNBQWMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFDLENBQUM7U0FDNUQ7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsYUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsMENBQUUsS0FBSyxtQ0FBSSxDQUFDLENBQUMsRUFBRTtZQUMxRCxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUMsQ0FBQztTQUM1QztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxhQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSwwQ0FBRSxHQUFHLG1DQUFJLENBQUMsQ0FBQyxFQUFFO1lBQ2pELE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUMsQ0FBQztTQUNyQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxhQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSwwQ0FBRSxJQUFJLG1DQUFJLENBQUMsQ0FBQyxFQUFFO1lBQ25ELE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUMsQ0FBQztTQUN0QztRQUNELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELFNBQVMsQ0FBQyxNQUFjO1FBQ3RCLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNwQixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUN6RCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQWMsQ0FBQztZQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUM7Z0JBQUUsU0FBUztZQUM1QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDMUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLFNBQVMsRUFBRSxDQUFDLENBQUM7Z0JBQUMsU0FBUzthQUFDO1lBQ3JFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBS25CLE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLE1BQU07Z0JBQUUsT0FBTyxJQUFJLENBQUM7U0FDMUI7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxlQUFlLENBQUMsTUFBaUI7UUFDL0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNwQixNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQWMsQ0FBQztRQUN2QyxNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQWMsQ0FBQztRQUN0QyxNQUFNLEtBQUssR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQWMsQ0FBQztRQUN4QyxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQWMsQ0FBQztRQUN4QyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzlDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDcEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUN0RCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBYTtRQUcxQixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxhQUFhLENBQUMsSUFBWTtRQUN4QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDakIsT0FBTyxJQUFJLEVBQUU7WUFDWCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQWMsQ0FBQztZQUNsRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtnQkFDNUIsSUFBSSxFQUFFLFFBQVEsR0FBRyxFQUFFO29CQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ3JELFNBQVM7YUFDVjtZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN0QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdEMsSUFBSSxFQUFFLENBQUM7U0FDUjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFZO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQWE7UUFDcEIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBR0QscUJBQXFCLENBQUMsS0FBYSxFQUNiLElBQVksRUFBRSxLQUFjO1FBQ2hELElBQUksQ0FBQyxLQUFLO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDeEIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDekQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFjLENBQUM7WUFDeEMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHO2dCQUFFLFNBQVM7WUFDNUMsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFjLENBQUM7Z0JBQzVDLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBYyxDQUFDO2dCQUM1QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztvQkFBRSxTQUFTO2FBQzVEO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3hFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtnQkFBRSxTQUFTO1lBRzlCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1QixLQUFLLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxLQUFLO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1NBQ3pCO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsU0FBUyxDQUFDLE1BQWM7UUFDdEIsSUFBSSxDQUFDLE1BQU07WUFBRSxPQUFPLElBQUksQ0FBQztRQUN6QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDakIsT0FBTyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ2pCLElBQUksRUFBRSxRQUFRLEdBQUcsRUFBRTtnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUtsQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQy9DLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxHQUFHO29CQUFFLEdBQUcsRUFBRSxDQUFDO2FBQ3JDO1lBRUQsTUFBTSxDQUFDLEdBQ0gsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQy9ELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUloQyxJQUFJLEdBQUcsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDakMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3JCLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDbEI7cUJBQU07b0JBQ0wsR0FBRyxHQUFHLE1BQU0sQ0FBQztpQkFDZDthQUNGO1lBQ0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JELE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDckMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEMsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFO2dCQUM3RCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQWMsQ0FBQyxLQUFLLEdBQUc7b0JBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQzthQUNwRDtZQUNELElBQUksQ0FBQyxHQUFHO2dCQUFFLFNBQVM7WUFDbkIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFnQixDQUFDO1lBQ2hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO2dCQUFFLFNBQVM7WUFDL0IsS0FBSyxNQUFNLENBQUMsSUFBSSxRQUFRLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN0QjtZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBYyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFjLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQWMsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBYyxDQUFDLENBQUM7WUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFO2dCQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFjLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ3BDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsQ0FBQztZQUNkLFFBQVEsR0FBRyxDQUFDLENBQUM7U0FDZDtRQUNELE9BQU8sTUFBTSxLQUFLLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBRUQsU0FBUyxDQUFDLENBQVM7UUFFakIsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUNwQyxDQUFDO0lBU0QsUUFBUSxDQUFDLE1BQW1CO1FBQzFCLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFxQixDQUFDO1FBQzdDLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxFQUFFO1lBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUFFLE9BQU8sRUFBRSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3BCO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFM0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMvQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksRUFBRTtZQUM3QixPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztTQUNwQjtRQUdELE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFpQixLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN6RCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDOUIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDLENBQUM7U0FDbEM7UUFDRCxJQUFJLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWE7WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDN0IsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLEVBQUU7WUFDM0IsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFBRSxTQUFTO1lBQ2xDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztTQUN4QjtRQUNELE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNO1FBQ0osSUFBSSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQWMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN2RDtRQUNELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztRQUNqQixPQUFPLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRTtZQUM3QixJQUFJLFFBQVEsRUFBRSxHQUFHLEVBQUU7Z0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBRWhFLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztZQUVoQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFO2dCQUNyRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztvQkFDekIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDekIsU0FBUztpQkFDVjtnQkFDRCxJQUFJLE9BQU8sR0FBRyxDQUFDO29CQUFFLE1BQU07Z0JBRXZCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFFMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7b0JBRS9DLE9BQU8sRUFBRSxDQUFDO29CQUNWLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssS0FBSzt3QkFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDMUI7cUJBQU07b0JBRUwsSUFBSSxJQUFxQixDQUFDO29CQUMxQixLQUFLLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTt3QkFDaEMsSUFBSSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJOzRCQUFFLElBQUksR0FBRyxHQUFHLENBQUM7cUJBQy9DO29CQUVELElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQUUsU0FBUztvQkFFdkQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQkFFakUsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUk7d0JBQUUsU0FBUztvQkFFaEMsT0FBTyxFQUFFLENBQUM7b0JBQ1YsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDZCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztvQkFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN6QixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFO3dCQUMxQixJQUFJLENBQUMsS0FBSyxJQUFJOzRCQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztxQkFDdEM7aUJBQ0Y7YUFDRjtZQUNELElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQ1osSUFBSSxJQUFJLENBQUMsV0FBVztvQkFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDaEMsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsSUFBSSxDQUFDLEtBQUssTUFBTSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBQyxDQUFDO2FBRXRGO1NBQ0Y7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFRCxVQUFVLENBQUMsS0FBZ0I7UUFDekIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBR0QsV0FBVztRQUNULElBQUksS0FBSyxHQUFnQixFQUFFLENBQUM7UUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFjLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUFFLFNBQVM7WUFDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7Z0JBQUUsU0FBUztZQUVqRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ25EO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDckIsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzlDLEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFbEMsS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBRXpCLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1lBQzFFLElBQUksRUFBRSxFQUFFO2dCQUNOLElBQUksRUFBRSxDQUFDO2dCQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN0QjtTQUNGO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBT0QsV0FBVztRQUNULEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMvQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQWMsQ0FBQztnQkFDbEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQUUsU0FBUztnQkFDL0IsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFjLENBQUM7Z0JBQ3BDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBYyxDQUFDO2dCQUN0QyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQWMsQ0FBQztnQkFDcEMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFjLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDMUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO29CQUNqRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztxQkFDekI7eUJBQU07d0JBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7cUJBQzFCO2lCQUVGO2FBQ0Y7U0FDRjtJQUNILENBQUM7SUFFRCxnQkFBZ0I7UUFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUM7WUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNuQyxNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQWMsQ0FBQztnQkFDaEQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztvQkFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3pEO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQWdCO1FBQzFCLEtBQUssSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxNQUFNLEVBQUUsRUFBRSxJQUFJLEtBQUssRUFBRTtZQUN6QyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQ25DLE1BQU0sS0FBSyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUE7Z0JBQ3JCLElBQUksS0FBSyxLQUFLLEtBQUs7b0JBQUUsU0FBUztnQkFDOUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQWMsQ0FBQyxLQUFLLEdBQUc7b0JBQUUsT0FBTyxLQUFLLENBQUM7YUFDdkU7U0FDRjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUFnQjtRQUU3QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QyxNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUM7UUFHeEIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN4QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO2dCQUFFLFNBQVM7WUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQUUsT0FBTyxFQUFFLENBQUM7U0FDekM7UUFDRCxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELGFBQWEsQ0FBQyxDQUFZLEVBQUUsS0FBYTtRQUN2QyxNQUFNLElBQUksR0FBK0IsRUFBRSxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFjLENBQUM7UUFDaEMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQWMsQ0FBQztRQUNqQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsS0FBa0IsQ0FBQztRQUNsQyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBa0IsQ0FBQztRQUNwQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBZ0IsQ0FBQztRQUM5QyxJQUFJLEtBQUssS0FBSyxHQUFHLEVBQUU7WUFDakIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRztnQkFDM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDaEMsT0FBTyxJQUFJLENBQUM7YUFDYjtTQUNGO2FBQU0sSUFBSSxLQUFLLEtBQUssR0FBRyxFQUFFO1lBQ3hCLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3ZCO1FBS0QsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU07WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUNqQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDekMsSUFBSSxDQUFDLEtBQUssSUFBSTtnQkFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDL0M7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsV0FBVyxDQUFDLENBQVksRUFBRSxNQUFnQjtRQUN4QyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBYyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDM0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEMsSUFBSSxJQUFJO1lBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsS0FBSyxNQUFNLEtBQUssSUFBSSxVQUFVLEVBQUU7WUFDOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUNwRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQU1ELFVBQVUsQ0FBQyxLQUFnQixFQUFFLEdBQWMsRUFDaEMsSUFBWSxFQUFFLFFBQVEsR0FBRyxDQUFDOztRQUNuQyxPQUFPLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBcUIsQ0FBQztZQUM3QyxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssS0FBSyxFQUFFO2dCQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDL0Q7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2QixPQUFPLEdBQUcsS0FBSyxHQUFHLEVBQUU7Z0JBRWxCLE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQztnQkFDMUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDeEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQWdCLENBQUM7b0JBQ3BDLE1BQU0sSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBZ0IsQ0FBQztvQkFDeEMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7d0JBQUUsU0FBUztvQkFDbkMsVUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7d0JBQUUsU0FBUztvQkFDdkQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7d0JBQUUsU0FBUztvQkFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDaEI7Z0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO29CQUFFLE1BQU07Z0JBQ3hCLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUNwQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQVMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hDLElBQUksRUFBRSxHQUFHLENBQUM7b0JBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxFQUFFLEdBQUcsQ0FBQztvQkFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksRUFBRSxHQUFHLENBQUM7b0JBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxFQUFFLEdBQUcsQ0FBQztvQkFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRWpDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztnQkFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNyRDtZQUNELElBQUksR0FBRyxLQUFLLEdBQUc7Z0JBQUUsU0FBUztZQUUxQixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksT0FBTyxFQUFFO2dCQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssS0FBSztvQkFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7YUFDekM7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVksRUFBRSxRQUFRLEdBQUcsQ0FBQztRQUVuQyxNQUFNLEVBQUUsR0FBRyxJQUFJLFNBQVMsRUFBYSxDQUFDO1FBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBYyxDQUFDLENBQUM7WUFDMUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQUUsU0FBUztZQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMvQztRQUNELE1BQU0sUUFBUSxHQUNWLElBQUksVUFBVSxDQUFvQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoRSxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDbkMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQWtCLENBQUM7WUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFBRSxTQUFTO1lBQ2hDLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3RDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFjLENBQUM7Z0JBQzlCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUFFLFNBQVM7Z0JBQzFELE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBYyxDQUFDO2dCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFBRSxTQUFTO2dCQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBQyxDQUFDLENBQUM7Z0JBQ25ELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFO29CQUMvRCxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDMUM7YUFDRjtTQUNGO1FBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXVDLENBQUM7UUFDbkUsS0FBSyxNQUFNLFNBQVMsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDekMsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQUUsU0FBUztZQUNuQyxLQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxTQUFTLEVBQUU7Z0JBQzVCLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQ2hDO1NBQ0Y7UUFDRCxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDbkMsT0FBTyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDckIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN4QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBUUQsVUFBVSxDQUFDLElBQVksRUFBRSxNQUFjLEVBQUUsUUFBUSxHQUFHLENBQUM7UUFFbkQsT0FBTyxRQUFRLEVBQUUsRUFBRTtZQUNqQixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRTtnQkFDekQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEtBQWtCLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7b0JBQUUsU0FBUztnQkFDbEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxLQUFLLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDbEQsTUFBTSxFQUFFLEdBQUcsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQWMsQ0FBQztvQkFDM0MsTUFBTSxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFjLENBQUM7b0JBRS9DLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUFFLFNBQVM7b0JBQy9FLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDdkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNoRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRTt3QkFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUN4RCxJQUFJLEtBQUs7NEJBQUUsT0FBTyxLQUFLLENBQUM7d0JBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO3FCQUN2QjtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFHRCxrQkFBa0IsQ0FBQyxJQUFZLEVBQUUsTUFBYyxFQUFFLENBQVk7UUFDM0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxLQUFrQixDQUFDLENBQUM7UUFDN0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUMzRSxJQUFJLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQUUsT0FBTyxDQUFDLENBQUM7UUFFakQsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDcEQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQWMsQ0FBQztZQUN6QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQWMsQ0FBQztZQUM3QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFBRSxTQUFTO1lBQy9FLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7Z0JBQzlELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLE1BQU0sR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVELElBQUksS0FBSztvQkFBRSxPQUFPLEtBQUssR0FBRyxDQUFDLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZCO1lBQ0QsSUFBSSxFQUFFO2dCQUFFLE1BQU07U0FDZjtRQUNELE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBR0QsTUFBTSxDQUFDLE9BQWdCLEVBQUU7UUFFdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDbEMsTUFBTSxFQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxHQUFHLEtBQUssRUFBQyxHQUFHLElBQUksQ0FBQztRQUM3RCxLQUFLLElBQUksT0FBTyxHQUFHLENBQUMsRUFBRSxPQUFPLEdBQUcsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ25ELE1BQU0sU0FBUyxHQUNYLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQztnQkFDWCxDQUFDLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELEtBQUssTUFBTSxDQUFDLElBQUksU0FBUyxFQUFFO2dCQUN6QixNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBa0IsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztvQkFBRSxTQUFTO2dCQUNsQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLEtBQUssSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUNsRCxNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBYyxDQUFDO29CQUMzQyxNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQWMsQ0FBQztvQkFDL0MsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQUUsU0FBUztvQkFDdkQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQzdCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUc3QixJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzt3QkFBRSxTQUFTO29CQUNwRSxJQUFJLENBQUMsSUFBSSxFQUFFO3dCQUNULE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsS0FBa0IsRUFDbEMsRUFBQyxPQUFPLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO3dCQUNsRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDOzRCQUFFLFNBQVM7cUJBQ3ZDO29CQUNELE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDdkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNoRSxJQUFJLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7d0JBQ3BELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDYixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFLeEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxLQUFrQixDQUFDLENBQUM7d0JBQ3RFLElBQUksT0FBTyxDQUFDLDRCQUE0QixDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRTs0QkFDN0QsT0FBTyxDQUFDLENBQUM7eUJBQ1Y7d0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ3RCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztxQkFDZDtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUE4RUQsUUFBUTs7UUFDTixJQUFJLE1BQU0sQ0FBQztRQUNYLFVBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLEtBQUssRUFBRTtZQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQUUsT0FBTyxNQUFNLENBQUM7U0FDakU7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFRCxjQUFjO1FBR1osT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRUQsWUFBWTtRQUNWLE1BQU0sT0FBTyxHQUFpQixFQUFFLENBQUM7UUFDakMsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QyxNQUFNLFVBQVUsR0FDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUM7aUJBQy9DLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtnQkFFOUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNO29CQUFFLFFBQVEsQ0FBQztnQkFDdkMsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBQyxDQUFDO2FBQ3BGO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO2dCQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMxQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUkvQztRQUVELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQztRQUNwQixNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDL0IsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUMxQixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRTtvQkFBRSxRQUFRLEdBQUcsS0FBSyxDQUFDO2dCQUNyQyxJQUFJLENBQUMsRUFBRTtvQkFDTCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDekMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUU7d0JBQ2xELE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSzs0QkFDVCxJQUFJLEVBQUUsNEJBQTRCLENBQUMsR0FBRyxDQUFDLEtBQ2hDLEtBQUssQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxFQUFDLENBQUM7cUJBQzFDO2lCQUNGO2dCQUNELElBQUksQ0FBQyxFQUFFO29CQUNMLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN4QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTt3QkFDbkQsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLOzRCQUNULElBQUksRUFBRSw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsS0FDbEMsSUFBSSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUMsQ0FBQztxQkFDekM7aUJBQ0Y7YUFDRjtTQUNGO1FBQ0QsSUFBSSxRQUFRO1lBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFDLENBQUM7UUFFNUQsT0FBTyxFQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxJQUFrQjs7UUFRbEMsTUFBTSxPQUFPLEdBQUcsT0FBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsMENBQUUsTUFBTSxLQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLEtBQUssR0FBRyxPQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSwwQ0FBRSxJQUFJLEtBQUksQ0FBQyxDQUFDO1FBQzlDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFDckQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBYyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFCLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQUUsU0FBUztZQUNsRSxJQUFJLElBQUksQ0FBQyxTQUFTO2dCQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7Z0JBQ3JFLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7b0JBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM3QyxTQUFTO2FBQ1Y7WUFDRCxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzVCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUNULElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTtvQkFDM0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLFNBQVM7aUJBQ1Y7YUFJRjtZQUNELElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNqRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUU7b0JBQ3BFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDYixTQUFTO2lCQUNWO2FBQ0Y7U0FDRjtRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUU7WUFDNUIsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLO2dCQUNULElBQUksRUFBRSwyQkFBMkIsT0FBTyxRQUFRLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUMsQ0FBQztTQUN6RjtRQUNELElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLEVBQUU7WUFDeEIsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLO2dCQUNULElBQUksRUFBRSx5QkFBeUIsS0FBSyxRQUFRLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUMsQ0FBQztTQUNuRjtRQUNELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFrQixFQUFFLEdBQVEsRUFDNUIsT0FBNkI7UUFDbkMsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUU7WUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUFFLFNBQVM7WUFDekQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDakIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELFNBQVMsQ0FBQyxJQUFrQixFQUFFLFlBQW1DO1FBRy9ELE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDN0QsQ0FBQztJQUVELDZCQUE2QixDQUFDLElBQWtCO1FBQzlDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUNkLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUNkLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQy9CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUIsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO2dCQUFFLFNBQVM7WUFDakUsTUFBTSxLQUFLLEdBQ1QsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7WUFHbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN0RCxDQUFDLEdBQUcsSUFBSSxDQUFDO2FBQ1Y7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1NBQ3pCO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsSUFBa0I7O1FBQ2pDLElBQUksUUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsMENBQUUsTUFBTSxDQUFBO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFDN0MsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQy9CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUIsT0FBTyxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLDBDQUFFLE1BQU0sS0FBSSxDQUFDLENBQUM7U0FDMUM7UUFDRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDekMsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLDZCQUE2QixFQUFDLENBQUM7U0FDekQ7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQWlGRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxXQUFXO0lBQWhEOztRQUNFLG9CQUFlLEdBQUcsR0FBRyxDQUFDO1FBQ3RCLGVBQVUsR0FBRyxHQUFHLENBQUM7SUFTbkIsQ0FBQztJQVJDLGFBQWEsQ0FBQyxDQUFTO1FBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNELGVBQWUsQ0FBQyxNQUFpQjtRQUUvQixPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3RCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsV0FBVztJQUNuRCxpQkFBaUIsQ0FBQyxJQUFrQjtRQUVsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDL0IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQWMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtvQkFDbEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2lCQUMvRDthQUNGO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsZUFBZSxDQUFDLENBQVk7UUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFrQixDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgR3JpZENvb3JkLCBHcmlkSW5kZXgsIEUsIFMgfSBmcm9tICcuL2dyaWQuanMnO1xuaW1wb3J0IHsgc2VxLCBoZXggfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQgeyBNZXRhc2NyZWVuIH0gZnJvbSAnLi4vcm9tL21ldGFzY3JlZW4uanMnO1xuaW1wb3J0IHsgTWV0YWxvY2F0aW9uLCBQb3MgfSBmcm9tICcuLi9yb20vbWV0YWxvY2F0aW9uLmpzJztcbmltcG9ydCB7IEFic3RyYWN0TWF6ZVNodWZmbGUsIE9LLCBSZXN1bHQsIFN1cnZleSB9IGZyb20gJy4uL21hemUvbWF6ZS5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgRGVmYXVsdE1hcCB9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG5leHBvcnQgY2xhc3MgQ2F2ZVNodWZmbGUgZXh0ZW5kcyBBYnN0cmFjdE1hemVTaHVmZmxlIHtcblxuICAvLyBTaHVmZmxlIGNvbmZpZ3VyYXRpb24uXG4gIG1heFBhcnRpdGlvbnMgPSAxO1xuICBtaW5TcGlrZXMgPSAyO1xuICBtYXhTcGlrZXMgPSA1O1xuICBsb29zZVJlZmluZSA9IGZhbHNlO1xuICBhZGRCbG9ja3MgPSB0cnVlO1xuICBpbml0aWFsRmlsbFR5cGUgPSAnYyc7XG4gIHVwRWRnZVR5cGUgPSAnYyc7XG4gIHByaXZhdGUgX3JlcXVpcmVQaXREZXN0aW5hdGlvbiA9IGZhbHNlO1xuXG4gIC8vIEV4dHJhIGF0dGVtcHQgc3RhdGUuXG4gIHJpdmVycyA9IDA7XG4gIHdpZGVzID0gMDtcbiAgd2FsbHMgPSAwO1xuICBicmlkZ2VzID0gMDtcblxuICByZXNldCgpIHtcbiAgICBzdXBlci5yZXNldCgpO1xuICAgIHRoaXMucml2ZXJzID0gMDtcbiAgICB0aGlzLndpZGVzID0gMDtcbiAgICB0aGlzLndhbGxzID0gMDtcbiAgICB0aGlzLmJyaWRnZXMgPSAwO1xuICB9XG5cbiAgcmVxdWlyZVBpdERlc3RpbmF0aW9uKCk6IHRoaXMge1xuICAgIHRoaXMuX3JlcXVpcmVQaXREZXN0aW5hdGlvbiA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBzaHVmZmxlKGxvYzogTG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gIC8vICAgY29uc3QgbWV0YSA9IGxvYy5tZXRhO1xuICAvLyAgIGNvbnN0IHN1cnZleSA9IHRoaXMuc3VydmV5KG1ldGEpO1xuICAvLyAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgMTAwOyBhdHRlbXB0KyspIHtcbiAgLy8gICAgIGNvbnN0IHdpZHRoID1cbiAgLy8gICAgICAgICBNYXRoLm1heCgxLCBNYXRoLm1pbig4LCBsb2MubWV0YS53aWR0aCArXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigocmFuZG9tLm5leHRJbnQoNikgLSAxKSAvIDMpKSk7XG4gIC8vICAgICBjb25zdCBoZWlnaHQgPVxuICAvLyAgICAgICAgIE1hdGgubWF4KDEsIE1hdGgubWluKDE2LCBsb2MubWV0YS5oZWlnaHQgK1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoKHJhbmRvbS5uZXh0SW50KDYpIC0gMSkgLyAzKSkpO1xuICAvLyAgICAgY29uc3Qgc2h1ZmZsZSA9IG5ldyBDYXZlU2h1ZmZsZUF0dGVtcHQoaGVpZ2h0LCB3aWR0aCwgc3VydmV5LCByYW5kb20pO1xuICAvLyAgICAgY29uc3QgcmVzdWx0ID0gc2h1ZmZsZS5idWlsZCgpO1xuICAvLyAgICAgaWYgKHJlc3VsdCkge1xuICAvLyAgICAgICBpZiAobG9jLmlkID09PSAweDMxKSBjb25zb2xlLmVycm9yKGBTaHVmZmxlIGZhaWxlZDogJHtyZXN1bHR9YCk7XG4gIC8vICAgICB9IGVsc2Uge1xuICAvLyAgICAgICB0aGlzLmZpbmlzaChsb2MsIHNodWZmbGUubWV0YSwgcmFuZG9tKTtcbiAgLy8gICAgICAgcmV0dXJuO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICB0aHJvdyBuZXcgRXJyb3IoYENvbXBsZXRlbHkgZmFpbGVkIHRvIG1hcCBzaHVmZmxlICR7bG9jfWApO1xuICAvLyB9XG5cbiAgc3VydmV5KG1ldGE6IE1ldGFsb2NhdGlvbik6IFN1cnZleSB7XG4gICAgLy8gdGFrZSBhIHN1cnZleS5cbiAgICBjb25zdCBzdXJ2ZXkgPSB7XG4gICAgICBtZXRhLFxuICAgICAgaWQ6IG1ldGEuaWQsXG4gICAgICB0aWxlc2V0OiBtZXRhLnRpbGVzZXQsXG4gICAgICBzaXplOiAwLFxuICAgICAgZWRnZXM6IFswLCAwLCAwLCAwXSxcbiAgICAgIHN0YWlyczogWzAsIDBdLFxuICAgICAgZmVhdHVyZXM6IHtcbiAgICAgICAgYXJlbmE6IDAsXG4gICAgICAgIGJyaWRnZTogMCxcbiAgICAgICAgb3ZlcjogMCxcbiAgICAgICAgcGl0OiAwLFxuICAgICAgICByYW1wOiAwLFxuICAgICAgICByaXZlcjogMCxcbiAgICAgICAgc3Bpa2U6IDAsXG4gICAgICAgIHN0YXR1ZTogMCxcbiAgICAgICAgdW5kZXI6IDAsXG4gICAgICAgIHdhbGw6IDAsXG4gICAgICAgIHdpZGU6IDAsXG4gICAgICB9LFxuICAgIH07XG4gICAgaWYgKG1ldGEuaWQgPj0gMCkge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBtZXRhLnJvbS5sb2NhdGlvbnNbbWV0YS5pZF0uc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5tb25zdGVySWQgPT09IDB4OGYpIHtcbiAgICAgICAgICBzdXJ2ZXkuZmVhdHVyZXMuc3RhdHVlKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgbWV0YS5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAgIGlmICghc2NyLmlzRW1wdHkoKSB8fCBzY3IuZGF0YS5leGl0cz8ubGVuZ3RoKSBzdXJ2ZXkuc2l6ZSsrO1xuICAgICAgZm9yIChjb25zdCBleGl0IG9mIHNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgIGNvbnN0IHt0eXBlfSA9IGV4aXQ7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTp0b3AnKSB7XG4gICAgICAgICAgaWYgKChwb3MgPj4+IDQpID09PSAwKSBzdXJ2ZXkuZWRnZXNbMF0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0Jykge1xuICAgICAgICAgIGlmICgocG9zICYgMHhmKSA9PT0gMCkgc3VydmV5LmVkZ2VzWzFdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJykge1xuICAgICAgICAgIGlmICgocG9zID4+PiA0KSA9PT0gbWV0YS5oZWlnaHQgLSAxKSBzdXJ2ZXkuZWRnZXNbMl0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZWRnZTpyaWdodCcpIHtcbiAgICAgICAgICBpZiAoKHBvcyAmIDB4ZikgPT09IG1ldGEud2lkdGggLSAxKSBzdXJ2ZXkuZWRnZXNbM10rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnY3J5cHQnKSB7XG4gICAgICAgICAgLy8gc3RhaXIgaXMgYnVpbHQgaW50byBhcmVuYVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICAgIC8vIGRvIG5vdGhpbmcuLi5cbiAgICAgICAgfSBlbHNlIGlmIChleGl0LmRpciAmIDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEJhZCBleGl0IGRpcmVjdGlvbjogJHtleGl0LmRpcn1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdXJ2ZXkuc3RhaXJzW2V4aXQuZGlyID4+PiAxXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2FyZW5hJykpIHN1cnZleS5mZWF0dXJlcy5hcmVuYSsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgc3VydmV5LmZlYXR1cmVzLmJyaWRnZSsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdvdmVycGFzcycpKSBzdXJ2ZXkuZmVhdHVyZXMub3ZlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdwaXQnKSkgc3VydmV5LmZlYXR1cmVzLnBpdCsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyYW1wJykpIHN1cnZleS5mZWF0dXJlcy5yYW1wKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSBzdXJ2ZXkuZmVhdHVyZXMuc3Bpa2UrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgndW5kZXJwYXNzJykpIHN1cnZleS5mZWF0dXJlcy51bmRlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCd3YWxsJykpIHN1cnZleS5mZWF0dXJlcy53YWxsKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JpdmVyJykpIHN1cnZleS5mZWF0dXJlcy5yaXZlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCd3aWRlJykpIHN1cnZleS5mZWF0dXJlcy53aWRlKys7XG4gICAgfVxuICAgIGlmIChzdXJ2ZXkuc2l6ZSA8IDIgJiYgKG1ldGEud2lkdGggPiAxIHx8IG1ldGEuaGVpZ2h0ID4gMSkpIHN1cnZleS5zaXplID0gMjtcbiAgICByZXR1cm4gc3VydmV5O1xuICB9XG5cbiAgYnVpbGQoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICB0aGlzLmluaXQoKTtcbiAgICBsZXQgcmVzdWx0OiBSZXN1bHQ8dm9pZD47XG4gICAgLy9jb25zdCByID0gdGhpcy5yYW5kb207XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmZpbGxHcmlkKCkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgLy8gdHJ5IHRvIHRyYW5zbGF0ZSB0byBtZXRhc2NyZWVucyBhdCB0aGlzIHBvaW50Li4uXG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLnByZWluZmVyKCkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLmluZmVyU2NyZWVucygpO1xuICAgIGlmICghbWV0YS5vaykgcmV0dXJuIG1ldGE7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLnJlZmluZU1ldGFzY3JlZW5zKG1ldGEudmFsdWUpKSwgIXJlc3VsdC5vaykge1xuICAgICAgLy9jb25zb2xlLmVycm9yKG1ldGEudmFsdWUuc2hvdygpKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICgocmVzdWx0ID0gdGhpcy5jaGVja01ldGFzY3JlZW5zKG1ldGEudmFsdWUpKSwgIXJlc3VsdC5vaykge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3JlcXVpcmVQaXREZXN0aW5hdGlvbiAmJlxuICAgICAgICAhdGhpcy5yZXF1aXJlRWxpZ2libGVQaXREZXN0aW5hdGlvbihtZXRhLnZhbHVlKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBubyBlbGlnaWJsZSBwaXQgZGVzdGluYXRpb25gfTtcbiAgICB9XG4gICAgdGhpcy5tZXRhID0gbWV0YS52YWx1ZTtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBmaWxsR3JpZCgpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCByZXN1bHQ6IFJlc3VsdDx2b2lkPjtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuaW5pdGlhbEZpbGwoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgLy9pZiAoIXRoaXMuYWRkRWFybHlGZWF0dXJlcygpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmFkZEVkZ2VzKCkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRFYXJseUZlYXR1cmVzKCkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vY29uc29sZS5sb2coYHJlZmluZTpcXG4ke3RoaXMuZ3JpZC5zaG93KCl9YCk7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLnJlZmluZSgpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2NvbnNvbGUubG9nKGBwb3N0cmVmaW5lOlxcbiR7dGhpcy5ncmlkLnNob3coKX1gKTtcbiAgICBpZiAoIXRoaXMucmVmaW5lRWRnZXMoKSkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdyZWZpbmVFZGdlcyd9O1xuICAgIHRoaXMucmVtb3ZlU3B1cnMoKTtcbiAgICB0aGlzLnJlbW92ZVRpZ2h0TG9vcHMoKTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkTGF0ZUZlYXR1cmVzKCkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRTdGFpcnMoLi4uKHRoaXMucGFyYW1zLnN0YWlycyA/PyBbXSkpKSxcbiAgICAgICAgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vIEF0dGVtcHQgbWV0aG9kc1xuXG4gIGluaXQoKSB7fVxuXG4gIC8vIEluaXRpYWwgZmlsbC5cbiAgaW5pdGlhbEZpbGwoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICB0aGlzLmZpbGxDYXZlKHRoaXMuaW5pdGlhbEZpbGxUeXBlKTtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBmaWxsQ2F2ZShzOiBzdHJpbmcpIHtcbiAgICAvLyBUT0RPIC0gbW92ZSB0byBNYXplU2h1ZmZsZS5maWxsP1xuICAgIGZvciAobGV0IHkgPSAwLjU7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDAuNTsgeCA8IHRoaXMudzsgeCsrKSB7XG4gICAgICAgIGlmICh5ID4gMSkgdGhpcy5ncmlkLnNldDIoeSAtIDAuNSwgeCwgcyk7XG4gICAgICAgIGlmICh4ID4gMSkgdGhpcy5ncmlkLnNldDIoeSwgeCAtIDAuNSwgcyk7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQyKHksIHgsIHMpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNvdW50ID0gdGhpcy5oICogdGhpcy53O1xuICB9XG5cbiAgLy8gQWRkIGVkZ2UgYW5kL29yIHN0YWlyIGV4aXRzXG4gIGFkZEVkZ2VzKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy9sZXQgYXR0ZW1wdHMgPSAwO1xuICAgIGlmICghdGhpcy5wYXJhbXMuZWRnZXMpIHJldHVybiBPSztcbiAgICBmb3IgKGxldCBkaXIgPSAwOyBkaXIgPCA0OyBkaXIrKykge1xuICAgICAgbGV0IGNvdW50ID0gdGhpcy5wYXJhbXMuZWRnZXNbZGlyXSB8fCAwO1xuICAgICAgaWYgKCFjb3VudCkgY29udGludWU7XG4gICAgICBjb25zdCBlZGdlcyA9XG4gICAgICAgICAgc2VxKGRpciAmIDEgPyB0aGlzLmggOiB0aGlzLncsIGkgPT4gdGhpcy5ncmlkLmJvcmRlcihkaXIsIGkpKTtcbiAgICAgIGZvciAoY29uc3QgZWRnZSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShlZGdlcykpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgZWRnZTogJHtlZGdlLnRvU3RyaW5nKDE2KX0gY291bnQgJHtjb3VudH0gZGlyICR7ZGlyfWApO1xuICAgICAgICBpZiAodGhpcy5ncmlkLmdldChlZGdlKSkgY29udGludWU7XG4gICAgICAgIGlmIChkaXIgJiAxKSB7XG4gICAgICAgICAgaWYgKGRpciA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkTGVmdEVkZ2UoZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZFJpZ2h0RWRnZShlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGRpciA9PT0gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkVXBFZGdlKGVkZ2UpKSBjb3VudC0tO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGREb3duRWRnZShlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb3VudCkgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoY291bnQpIHtcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBjYW4ndCBmaXQgYWxsIGVkZ2VzIHNodWZmbGluZyAke3RoaXMubG9jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XFxubWlzc2luZyAke2NvdW50fSAke2Rpcn1gfTtcbiAgICAgICAgLy9cXG4ke3RoaXMuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gYWRkVXBFZGdlKGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIC8vIFVwIGVkZ2VzIG11c3QgYWx3YXlzIGJlIGFyZW5hIHNjcmVlbnMsIHNvIGN1dCBvZmYgYm90aFxuICAgIC8vIHRoZSBFLVcgZWRnZXMgQU5EIHRoZSBuZWlnaGJvcmluZyBzY3JlZW5zIGFzIHdlbGwgKHByb3ZpZGVkXG4gICAgLy8gdGhlcmUgaXMgbm90IGFsc28gYW4gZXhpdCBuZXh0IHRvIHRoZW0sIHNpbmNlIHRoYXQgd291bGQgYmVcbiAgICAvLyBhIHByb2JsZW0uICAoVGhlc2UgYXJlIHByZXR0eSBsaW1pdGVkOiB2YW1waXJlIDEsIHByaXNvbixcbiAgICAvLyBzdHh5IDEsIHB5cmFtaWQgMSwgY3J5cHQgMiwgZHJheWdvbiAyKS5cbiAgICBjb25zdCBiZWxvdyA9IGVkZ2UgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdCA9IGJlbG93IC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdDIgPSBsZWZ0IC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdDMgPSBsZWZ0MiAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gYmVsb3cgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodDIgPSByaWdodCArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0MyA9IHJpZ2h0MiArIDggYXMgR3JpZENvb3JkO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIobGVmdCkpIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGVkZ2UgLSAxNiBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKGxlZnQzKSAmJiB0aGlzLmdyaWQuZ2V0KGxlZnQzKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0KSkge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGVkZ2UgKyAxNiBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0MykgJiYgdGhpcy5ncmlkLmdldChyaWdodDMpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuZml4ZWQuYWRkKGVkZ2UpO1xuICAgIHRoaXMuZ3JpZC5zZXQoZWRnZSwgdGhpcy51cEVkZ2VUeXBlKTtcbiAgICB0aGlzLmdyaWQuc2V0KGxlZnQsICcnKTtcbiAgICB0aGlzLmdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGREb3duRWRnZShlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICAvLyBkb3duIGVkZ2VzIG11c3QgaGF2ZSBzdHJhaWdodCBOLVMgc2NyZWVucywgc28gY3V0IG9mZlxuICAgIC8vIHRoZSBFLVcgZWRnZXMgbmV4dCB0byB0aGVtLlxuICAgIGNvbnN0IGFib3ZlID0gZWRnZSAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0ID0gYWJvdmUgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IGFib3ZlICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKCF0aGlzLmdyaWQuZ2V0KGFib3ZlKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIobGVmdCkgJiYgdGhpcy5ncmlkLmdldChsZWZ0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIocmlnaHQpICYmIHRoaXMuZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgdGhpcy5maXhlZC5hZGQoZWRnZSk7XG4gICAgdGhpcy5ncmlkLnNldChlZGdlLCAnbicpO1xuICAgIHRoaXMuZ3JpZC5zZXQobGVmdCwgJycpO1xuICAgIHRoaXMuZ3JpZC5zZXQocmlnaHQsICcnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZExlZnRFZGdlKGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJpZ2h0ID0gZWRnZSArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0VXAgPSByaWdodCAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodERvd24gPSByaWdodCArIDB4ODAwIGFzIEdyaWRDb29yZDtcbi8vY29uc29sZS5sb2coYGFkZExlZnQgJHtoZXgoZWRnZSl9IHJpZ2h0ICR7aGV4KHJpZ2h0KX06JHt0aGlzLmdyaWQuZ2V0KHJpZ2h0KX0gcnUgJHtoZXgocmlnaHRVcCl9OiR7dGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0VXApfToke3RoaXMuZ3JpZC5nZXQocmlnaHRVcCl9IHJkICR7aGV4KHJpZ2h0RG93bil9OiR7dGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0RG93bil9OiR7dGhpcy5ncmlkLmdldChyaWdodERvd24pfWApO1xuICAgIGlmICghdGhpcy5ncmlkLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0VXApICYmIHRoaXMuZ3JpZC5nZXQocmlnaHRVcCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0RG93bikgJiYgdGhpcy5ncmlkLmdldChyaWdodERvd24pKSByZXR1cm4gZmFsc2U7XG4gICAgdGhpcy5maXhlZC5hZGQoZWRnZSk7XG4gICAgdGhpcy5ncmlkLnNldChlZGdlLCAnYycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkUmlnaHRFZGdlKGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxlZnQgPSBlZGdlIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdFVwID0gbGVmdCAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0RG93biA9IGxlZnQgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKCF0aGlzLmdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihsZWZ0VXApICYmIHRoaXMuZ3JpZC5nZXQobGVmdFVwKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIobGVmdERvd24pICYmIHRoaXMuZ3JpZC5nZXQobGVmdERvd24pKSByZXR1cm4gZmFsc2U7XG4gICAgdGhpcy5maXhlZC5hZGQoZWRnZSk7XG4gICAgdGhpcy5ncmlkLnNldChlZGdlLCAnYycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gYWRkQXJlbmFzRWFybHkoKTogYm9vbGVhbiB7XG4gIC8vICAgLy8gU3BlY2lmaWNhbGx5LCBqdXN0IGFyZW5hcy4uLlxuICAvLyAgIGxldCBhcmVuYXMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uWydhJ107XG4gIC8vICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAvLyAgIGNvbnN0IGcgPSB0aGlzLmdyaWQ7XG4gIC8vICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuc2NyZWVucykpIHtcbiAgLy8gICAgIGNvbnN0IG1pZGRsZSA9IChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQgPSAobWlkZGxlIC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDIgPSAobGVmdCAtIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQzID0gKGxlZnQyIC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDJVcCA9IChsZWZ0MiAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MkRvd24gPSAobGVmdDIgKyAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQgPSAobWlkZGxlICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQyID0gKHJpZ2h0ICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQzID0gKHJpZ2h0MiArIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0MlVwID0gKHJpZ2h0MiAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDJEb3duID0gKHJpZ2h0MiArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBpZiAoIWcuaXNCb3JkZXIobGVmdCkpIHtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDMpICYmIGcuZ2V0KGxlZnQzKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKGxlZnQyVXApICYmIGcuZ2V0KGxlZnQyVXApKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDJEb3duKSAmJiBnLmdldChsZWZ0MkRvd24pKSBjb250aW51ZTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmICghZy5pc0JvcmRlcihyaWdodCkpIHtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQzKSAmJiBnLmdldChyaWdodDMpKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQyVXApICYmIGcuZ2V0KHJpZ2h0MlVwKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKHJpZ2h0MkRvd24pICYmIGcuZ2V0KHJpZ2h0MkRvd24pKSBjb250aW51ZTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHRoaXMuZml4ZWQuYWRkKG1pZGRsZSk7XG4gIC8vICAgICBnLnNldChtaWRkbGUsICdhJyk7XG4gIC8vICAgICBnLnNldChsZWZ0LCAnJyk7XG4gIC8vICAgICBnLnNldChsZWZ0MiwgJycpO1xuICAvLyAgICAgZy5zZXQocmlnaHQsICcnKTtcbiAgLy8gICAgIGcuc2V0KHJpZ2h0MiwgJycpO1xuICAvLyAgICAgYXJlbmFzLS07XG4gIC8vICAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBmYWxzZTtcbiAgLy8gfVxuXG4gIGFkZEVhcmx5RmVhdHVyZXMoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuYWRkU3Bpa2VzKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5zcGlrZSA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBhZGQgc3Bpa2VzXFxuJHt0aGlzLmdyaWQuc2hvdygpfWB9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkT3ZlcnBhc3Nlcyh0aGlzLnBhcmFtcy5mZWF0dXJlcz8ub3ZlciA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGQgb3ZlcnBhc3Nlcyd9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRMYXRlRmVhdHVyZXMoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuYWRkQXJlbmFzKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5hcmVuYSA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBhZGRBcmVuYXNcXG4ke3RoaXMuZ3JpZC5zaG93KCl9YH07XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRVbmRlcnBhc3Nlcyh0aGlzLnBhcmFtcy5mZWF0dXJlcz8udW5kZXIgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkVW5kZXJwYXNzZXMnfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFkZFBpdHModGhpcy5wYXJhbXMuZmVhdHVyZXM/LnBpdCA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRQaXRzJ307XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRSYW1wcyh0aGlzLnBhcmFtcy5mZWF0dXJlcz8ucmFtcCA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRSYW1wcyd9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRBcmVuYXMoYXJlbmFzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgZyA9IHRoaXMuZ3JpZDtcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgIGNvbnN0IG1pZGRsZSA9IChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmICghdGhpcy5pc0VsaWdpYmxlQXJlbmEobWlkZGxlKSkgY29udGludWU7XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgYyk7XG4gICAgICBjb25zdCBhcmVuYVRpbGUgPSB0aWxlLnN1YnN0cmluZygwLCA0KSArICdhJyArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcoYXJlbmFUaWxlKTtcbiAgICAgIGlmICghb3B0aW9ucy5sZW5ndGgpIHtjb25zb2xlLmxvZyhgbm8gdGlsZSAke2FyZW5hVGlsZX1gKTsgY29udGludWU7fVxuICAgICAgdGhpcy5maXhlZC5hZGQobWlkZGxlKTtcbiAgICAgIGcuc2V0KG1pZGRsZSwgJ2EnKTtcbiAgICAgIC8vIGcuc2V0KGxlZnQsICcnKTtcbiAgICAgIC8vIGcuc2V0KGxlZnQyLCAnJyk7XG4gICAgICAvLyBnLnNldChyaWdodCwgJycpO1xuICAgICAgLy8gZy5zZXQocmlnaHQyLCAnJyk7XG4gICAgICBhcmVuYXMtLTtcbiAgICAgIGlmICghYXJlbmFzKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmVycm9yKCdjb3VsZCBub3QgYWRkIGFyZW5hJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNFbGlnaWJsZUFyZW5hKG1pZGRsZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZyA9IHRoaXMuZ3JpZDtcbiAgICBjb25zdCBsZWZ0ID0gKG1pZGRsZSAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MiA9IChsZWZ0IC0gOCkgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gKG1pZGRsZSArIDgpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKGcuZ2V0KG1pZGRsZSkgIT09ICdjJyAmJiBnLmdldChtaWRkbGUpICE9PSAndycpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZy5nZXQobGVmdCkgfHwgZy5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFnLmlzQm9yZGVyKGxlZnQpICYmIGcuZ2V0KGxlZnQyKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghZy5pc0JvcmRlcihyaWdodCkgJiYgZy5nZXQocmlnaHQyKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkVW5kZXJwYXNzZXModW5kZXI6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIC8vIE9ubHkgYWRkIGhvcml6b250YWwgJyAgIHxjYmN8ICAgJywgbm90ICcgYyB8IGIgfCBjICcuICBDb3VsZCBwb3NzaWJseVxuICAgIC8vIHVzZSAnYicgYW5kICdCJyBpbnN0ZWFkP1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZSh1bmRlciwgJ2InLCAweDgwMCk7XG4gIH1cblxuICBhZGRPdmVycGFzc2VzKG92ZXI6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKG92ZXIpIHtcbiAgICAgIGNvbnN0IHkgPSB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMuaCAtIDIpICsgMTtcbiAgICAgIGNvbnN0IHggPSB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMudyAtIDIpICsgMTtcbiAgICAgIGNvbnN0IGMgPSAoeSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAodGhpcy5ncmlkLmdldChjKSAhPT0gJ2MnKSB7XG4gICAgICAgIGlmICgrK2F0dGVtcHRzID4gMTApIHRocm93IG5ldyBFcnJvcignQmFkIGF0dGVtcHRzJyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5ncmlkLnNldChjLCAnYicpO1xuICAgICAgdGhpcy5maXhlZC5hZGQoYyk7XG4gICAgICB0aGlzLmdyaWQuc2V0KGMgLSA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgdGhpcy5ncmlkLnNldChjICsgOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAgIG92ZXItLTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRQaXRzKHBpdHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShwaXRzLCAncCcpO1xuICB9XG5cbiAgYWRkUmFtcHMocmFtcHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShyYW1wcywgJy8nLCA4KTtcbiAgfVxuXG4gIC8qKiBAcGFyYW0gZGVsdGEgR3JpZENvb3JkIGRpZmZlcmVuY2UgZm9yIGVkZ2VzIHRoYXQgbmVlZCB0byBiZSBlbXB0eS4gKi9cbiAgYWRkU3RyYWlnaHRTY3JlZW5MYXRlKGNvdW50OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFyOiBzdHJpbmcsIGRlbHRhPzogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCFjb3VudCkgcmV0dXJuIHRydWU7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAodGhpcy5ncmlkLmdldChtaWRkbGUpICE9PSAnYycpIGNvbnRpbnVlO1xuICAgICAgaWYgKGRlbHRhKSB7XG4gICAgICAgIGNvbnN0IHNpZGUxID0gKG1pZGRsZSAtIGRlbHRhKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IHNpZGUyID0gKG1pZGRsZSArIGRlbHRhKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KHNpZGUxKSB8fCB0aGlzLmdyaWQuZ2V0KHNpZGUyKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgYyk7XG4gICAgICBjb25zdCBuZXdUaWxlID0gdGlsZS5zdWJzdHJpbmcoMCwgNCkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoNSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhuZXdUaWxlKTtcbiAgICAgIGlmICghb3B0aW9ucy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgLy8gVE9ETyAtIHJldHVybiBmYWxzZSBpZiBub3Qgb24gYSBjcml0aWNhbCBwYXRoPz8/XG4gICAgICAvLyAgICAgIC0gYnV0IFBPSSBhcmVuJ3QgcGxhY2VkIHlldC5cbiAgICAgIHRoaXMuZml4ZWQuYWRkKG1pZGRsZSk7XG4gICAgICB0aGlzLmdyaWQuc2V0KG1pZGRsZSwgY2hhcik7XG4gICAgICBjb3VudC0tO1xuICAgICAgaWYgKCFjb3VudCkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vY29uc29sZS5lcnJvcignY291bGQgbm90IGFkZCByYW1wJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYWRkU3Bpa2VzKHNwaWtlczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCFzcGlrZXMpIHJldHVybiB0cnVlO1xuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKHNwaWtlcyA+IDApIHtcbiAgICAgIGlmICgrK2F0dGVtcHRzID4gMjApIHJldHVybiBmYWxzZTtcblxuICAgICAgLy8gVE9ETyAtIHRyeSB0byBiZSBzbWFydGVyIGFib3V0IHNwaWtlc1xuICAgICAgLy8gIC0gaWYgdG90YWwgPiAyIHRoZW4gdXNlIG1pbih0b3RhbCwgaCouNiwgPz8pIGFzIGxlblxuICAgICAgLy8gIC0gaWYgbGVuID4gMiBhbmQgdyA+IDMsIGF2b2lkIHB1dHRpbmcgc3Bpa2VzIG9uIGVkZ2U/XG4gICAgICBsZXQgbGVuID0gTWF0aC5taW4oc3Bpa2VzLCBNYXRoLmZsb29yKHRoaXMuaCAqIDAuNiksIHRoaXMubWF4U3Bpa2VzKTtcbiAgICAgIHdoaWxlIChsZW4gPCBzcGlrZXMgLSAxICYmIGxlbiA+IHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgIGlmICh0aGlzLnJhbmRvbS5uZXh0KCkgPCAwLjIpIGxlbi0tO1xuICAgICAgfVxuICAgICAgLy9pZiAobGVuID09PSBzcGlrZXMgLSAxKSBsZW4rKztcbiAgICAgIGNvbnN0IHggPVxuICAgICAgICAgIChsZW4gPiAyICYmIHRoaXMudyA+IDMpID8gdGhpcy5yYW5kb20ubmV4dEludCh0aGlzLncgLSAyKSArIDEgOlxuICAgICAgICAgIHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy53KTtcbiAgICAgIC8vIGNvbnN0IHIgPVxuICAgICAgLy8gICAgIHRoaXMucmFuZG9tLm5leHRJbnQoTWF0aC5taW4odGhpcy5oIC0gMiwgc3Bpa2VzKSAtIHRoaXMubWluU3Bpa2VzKTtcbiAgICAgIC8vIGxldCBsZW4gPSB0aGlzLm1pblNwaWtlcyArIHI7XG4gICAgICBpZiAobGVuID4gc3Bpa2VzIC0gdGhpcy5taW5TcGlrZXMpIHtcbiAgICAgICAgaWYgKGxlbiA+PSB0aGlzLmggLSAyKSB7IC8vICYmIGxlbiA+IHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgICAgbGVuID0gdGhpcy5oIC0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZW4gPSBzcGlrZXM7IC8vID8/PyBpcyB0aGlzIGV2ZW4gdmFsaWQgPz8/XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHkwID0gdGhpcy5yYW5kb20ubmV4dEludCh0aGlzLmggLSBsZW4gLSAyKSArIDE7XG4gICAgICBjb25zdCB0MCA9IHkwIDw8IDEyIHwgeCA8PCA0IHwgMHg4MDg7XG4gICAgICBjb25zdCB0MSA9IHQwICsgKChsZW4gLSAxKSA8PCAxMik7XG4gICAgICBmb3IgKGxldCB0ID0gdDAgLSAweDEwMDA7IGxlbiAmJiB0IDw9IHQxICsgMHgxMDAwOyB0ICs9IDB4ODAwKSB7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KHQgYXMgR3JpZENvb3JkKSAhPT0gJ2MnKSBsZW4gPSAwO1xuICAgICAgfVxuICAgICAgaWYgKCFsZW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY2xlYXJlZCA9IFt0MCAtIDgsIHQwICsgOCwgdDEgLSA4LCB0MSArIDhdIGFzIEdyaWRDb29yZFtdO1xuICAgICAgY29uc3Qgb3JwaGFuZWQgPSB0aGlzLnRyeUNsZWFyKGNsZWFyZWQpO1xuICAgICAgaWYgKCFvcnBoYW5lZC5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBjIG9mIG9ycGhhbmVkKSB7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQoYywgJycpO1xuICAgICAgfVxuICAgICAgdGhpcy5maXhlZC5hZGQoKHQwIC0gMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgICB0aGlzLmZpeGVkLmFkZCgodDAgLSAweDEwMDApIGFzIEdyaWRDb29yZCk7XG4gICAgICB0aGlzLmZpeGVkLmFkZCgodDEgKyAweDgwMCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIHRoaXMuZml4ZWQuYWRkKCh0MSArIDB4MTAwMCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIGZvciAobGV0IHQgPSB0MDsgdCA8PSB0MTsgdCArPSAweDgwMCkge1xuICAgICAgICB0aGlzLmZpeGVkLmFkZCh0IGFzIEdyaWRDb29yZCk7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQodCBhcyBHcmlkQ29vcmQsICdzJyk7XG4gICAgICB9XG4gICAgICBzcGlrZXMgLT0gbGVuO1xuICAgICAgYXR0ZW1wdHMgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gc3Bpa2VzID09PSAwO1xuICB9XG5cbiAgY2FuUmVtb3ZlKGM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIE5vdGFibHksIGV4Y2x1ZGUgc3RhaXJzLCBuYXJyb3cgZWRnZXMsIGFyZW5hcywgZXRjLlxuICAgIHJldHVybiBjID09PSB0aGlzLmluaXRpYWxGaWxsVHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb2VzIGEgdHJhdmVyc2FsIHdpdGggdGhlIGdpdmVuIGNvb3JkaW5hdGUocykgY2xlYXJlZCwgYW5kIHJldHVybnNcbiAgICogYW4gYXJyYXkgb2YgY29vcmRpbmF0ZXMgdGhhdCB3b3VsZCBiZSBjdXQgb2ZmIChpbmNsdWRpbmcgdGhlIGNsZWFyZWRcbiAgICogY29vcmRpbmF0ZXMpLiAgSWYgY2xlYXJpbmcgd291bGQgY3JlYXRlIG1vcmUgdGhhbiB0aGUgYWxsb3dlZCBudW1iZXJcbiAgICogb2YgcGFydGl0aW9ucyAodXN1YWxseSAxKSwgdGhlbiByZXR1cm5zIGFuIGVtcHR5IGFycmF5IHRvIHNpZ25pZnlcbiAgICogdGhhdCB0aGUgY2xlYXIgaXMgbm90IGFsbG93ZWQuXG4gICAqL1xuICB0cnlDbGVhcihjb29yZHM6IEdyaWRDb29yZFtdKTogR3JpZENvb3JkW10ge1xuICAgIGNvbnN0IHJlcGxhY2UgPSBuZXcgTWFwPEdyaWRDb29yZCwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgYyBvZiBjb29yZHMpIHtcbiAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhjKSkgcmV0dXJuIFtdO1xuICAgICAgcmVwbGFjZS5zZXQoYywgJycpO1xuICAgIH1cbiAgICBjb25zdCBwYXJ0cyA9IHRoaXMuZ3JpZC5wYXJ0aXRpb24ocmVwbGFjZSk7XG4gICAgLy8gQ2hlY2sgc2ltcGxlIGNhc2UgZmlyc3QgLSBvbmx5IG9uZSBwYXJ0aXRpb25cbiAgICBjb25zdCBbZmlyc3RdID0gcGFydHMudmFsdWVzKCk7XG4gICAgaWYgKGZpcnN0LnNpemUgPT09IHBhcnRzLnNpemUpIHsgLy8gYSBzaW5nbGUgcGFydGl0aW9uXG4gICAgICByZXR1cm4gWy4uLmNvb3Jkc107XG4gICAgfVxuICAgIC8vIE1vcmUgY29tcGxleCBjYXNlIC0gbmVlZCB0byBzZWUgd2hhdCB3ZSBhY3R1YWxseSBoYXZlLFxuICAgIC8vIHNlZSBpZiBhbnl0aGluZyBnb3QgY3V0IG9mZi5cbiAgICBjb25zdCBjb25uZWN0ZWQgPSBuZXcgU2V0PFNldDxHcmlkQ29vcmQ+PigpO1xuICAgIGNvbnN0IGFsbFBhcnRzID0gbmV3IFNldDxTZXQ8R3JpZENvb3JkPj4ocGFydHMudmFsdWVzKCkpO1xuICAgIGZvciAoY29uc3QgZml4ZWQgb2YgdGhpcy5maXhlZCkge1xuICAgICAgY29ubmVjdGVkLmFkZChwYXJ0cy5nZXQoZml4ZWQpISk7XG4gICAgfVxuICAgIGlmIChjb25uZWN0ZWQuc2l6ZSA+IHRoaXMubWF4UGFydGl0aW9ucykgcmV0dXJuIFtdOyAvLyBubyBnb29kXG4gICAgY29uc3Qgb3JwaGFuZWQgPSBbLi4uY29vcmRzXTtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgYWxsUGFydHMpIHtcbiAgICAgIGlmIChjb25uZWN0ZWQuaGFzKHBhcnQpKSBjb250aW51ZTtcbiAgICAgIG9ycGhhbmVkLnB1c2goLi4ucGFydCk7XG4gICAgfVxuICAgIHJldHVybiBvcnBoYW5lZDtcbiAgfVxuXG4gIHJlZmluZSgpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCBmaWxsZWQgPSBuZXcgU2V0PEdyaWRDb29yZD4oKTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBHcmlkSW5kZXg7IGkgPCB0aGlzLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5kYXRhW2ldKSBmaWxsZWQuYWRkKHRoaXMuZ3JpZC5jb29yZChpKSk7XG4gICAgfVxuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKHRoaXMuY291bnQgPiB0aGlzLnNpemUpIHtcbiAgICAgIGlmIChhdHRlbXB0cysrID4gNTApIHRocm93IG5ldyBFcnJvcihgcmVmaW5lIGZhaWxlZDogYXR0ZW1wdHNgKTtcbiAgICAgIC8vY29uc29sZS5sb2coYG1haW46ICR7dGhpcy5jb3VudH0gPiAke3RoaXMuc2l6ZX1gKTtcbiAgICAgIGxldCByZW1vdmVkID0gMDtcbi8vaWYodGhpcy5wYXJhbXMuaWQ9PT00KXtkZWJ1Z2dlcjtbLi4udGhpcy5yYW5kb20uaXNodWZmbGUoZmlsbGVkKV07fVxuICAgICAgZm9yIChjb25zdCBjb29yZCBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbLi4uZmlsbGVkXSkpIHtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihjb29yZCkgfHxcbiAgICAgICAgICAgICF0aGlzLmNhblJlbW92ZSh0aGlzLmdyaWQuZ2V0KGNvb3JkKSkgfHxcbiAgICAgICAgICAgIHRoaXMuZml4ZWQuaGFzKGNvb3JkKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZW1vdmVkID4gMykgYnJlYWs7XG5cbiAgICAgICAgY29uc3QgcGFydHMgPSB0aGlzLmdyaWQucGFydGl0aW9uKHRoaXMucmVtb3ZhbE1hcChjb29yZCkpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGAgIGNvb3JkOiAke2Nvb3JkLnRvU3RyaW5nKDE2KX0gPT4gJHtwYXJ0cy5zaXplfWApO1xuICAgICAgICBjb25zdCBbZmlyc3RdID0gcGFydHMudmFsdWVzKCk7XG4gICAgICAgIGlmIChmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplICYmIHBhcnRzLnNpemUgPiAxKSB7IC8vIGEgc2luZ2xlIHBhcnRpdGlvblxuICAgICAgICAgIC8vIG9rIHRvIHJlbW92ZVxuICAgICAgICAgIHJlbW92ZWQrKztcbiAgICAgICAgICBmaWxsZWQuZGVsZXRlKGNvb3JkKTtcbiAgICAgICAgICBpZiAoKGNvb3JkICYgMHg4MDgpID09PSAweDgwOCkgdGhpcy5jb3VudC0tO1xuICAgICAgICAgIHRoaXMuZ3JpZC5zZXQoY29vcmQsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBmaW5kIHRoZSBiaWdnZXN0IHBhcnRpdGlvbi5cbiAgICAgICAgICBsZXQgcGFydCE6IFNldDxHcmlkQ29vcmQ+O1xuICAgICAgICAgIGZvciAoY29uc3Qgc2V0IG9mIHBhcnRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoIXBhcnQgfHwgc2V0LnNpemUgPiBwYXJ0LnNpemUpIHBhcnQgPSBzZXQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIG1ha2Ugc3VyZSBhbGwgdGhlIGZpeGVkIHNjcmVlbnMgYXJlIGluIGl0LlxuICAgICAgICAgIGlmICghWy4uLnRoaXMuZml4ZWRdLmV2ZXJ5KGMgPT4gcGFydC5oYXMoYykpKSBjb250aW51ZTtcbiAgICAgICAgICAvLyBjaGVjayB0aGF0IGl0J3MgYmlnIGVub3VnaC5cbiAgICAgICAgICBjb25zdCBjb3VudCA9IFsuLi5wYXJ0XS5maWx0ZXIoYyA9PiAoYyAmIDB4ODA4KSA9PSAweDgwOCkubGVuZ3RoO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coYHBhcnQ6ICR7Wy4uLnBhcnRdLm1hcCh4PT54LnRvU3RyaW5nKDE2KSkuam9pbignLCcpfSBjb3VudD0ke2NvdW50fWApO1xuICAgICAgICAgIGlmIChjb3VudCA8IHRoaXMuc2l6ZSkgY29udGludWU7XG4gICAgICAgICAgLy8gb2sgdG8gcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlZCsrO1xuICAgICAgICAgIGZpbGxlZCA9IHBhcnQ7XG4gICAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgICAgICAgIHRoaXMuZ3JpZC5zZXQoY29vcmQsICcnKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBwYXJ0cykge1xuICAgICAgICAgICAgaWYgKHYgIT09IHBhcnQpIHRoaXMuZ3JpZC5zZXQoaywgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFyZW1vdmVkKSB7XG4gICAgICAgIGlmICh0aGlzLmxvb3NlUmVmaW5lKSByZXR1cm4gT0s7XG4gICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgcmVmaW5lICR7dGhpcy5jb3VudH0gPiAke3RoaXMuc2l6ZX1cXG4ke3RoaXMuZ3JpZC5zaG93KCl9YH07XG4vL2B9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICByZW1vdmFsTWFwKGNvb3JkOiBHcmlkQ29vcmQpOiBNYXA8R3JpZENvb3JkLCBzdHJpbmc+IHtcbiAgICByZXR1cm4gbmV3IE1hcChbW2Nvb3JkLCAnJ11dKTtcbiAgfVxuXG4gIC8qKiBSZW1vdmUgb25seSBlZGdlcy4gQ2FsbGVkIGFmdGVyIHJlZmluZSgpLiAqL1xuICByZWZpbmVFZGdlcygpOiBib29sZWFuIHtcbiAgICBsZXQgZWRnZXM6IEdyaWRDb29yZFtdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgR3JpZEluZGV4OyBpIDwgdGhpcy5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy5ncmlkLmRhdGFbaV0pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY29vcmQgPSB0aGlzLmdyaWQuY29vcmQoaSk7XG4gICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKGNvb3JkKSB8fCB0aGlzLmZpeGVkLmhhcyhjb29yZCkpIGNvbnRpbnVlO1xuICAgICAgLy8gT25seSBhZGQgZWRnZXMuXG4gICAgICBpZiAoKGNvb3JkIF4gKGNvb3JkID4+IDgpKSAmIDgpIGVkZ2VzLnB1c2goY29vcmQpO1xuICAgIH1cbiAgICB0aGlzLnJhbmRvbS5zaHVmZmxlKGVkZ2VzKTtcbiAgICBjb25zdCBvcmlnID0gdGhpcy5ncmlkLnBhcnRpdGlvbihuZXcgTWFwKCkpO1xuICAgIGxldCBzaXplID0gb3JpZy5zaXplO1xuICAgIGNvbnN0IHBhcnRDb3VudCA9IG5ldyBTZXQob3JpZy52YWx1ZXMoKSkuc2l6ZTtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZWRnZXMpIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gdGhpcy5ncmlkLnBhcnRpdGlvbihuZXcgTWFwKFtbZSwgJyddXSkpO1xuICAgICAgLy9jb25zb2xlLmxvZyhgICBjb29yZDogJHtjb29yZC50b1N0cmluZygxNil9ID0+ICR7cGFydHMuc2l6ZX1gKTtcbiAgICAgIGNvbnN0IFtmaXJzdF0gPSBwYXJ0cy52YWx1ZXMoKTtcbiAgICAgIGNvbnN0IG9rID0gZmlyc3Quc2l6ZSA9PT0gcGFydHMuc2l6ZSA/XG4gICAgICAgICAgLy8gYSBzaW5nbGUgcGFydGl0aW9uIC0gbWFrZSBzdXJlIHdlIGRpZG4ndCBsb3NlIGFueXRoaW5nIGVsc2UuXG4gICAgICAgICAgcGFydHMuc2l6ZSA9PT0gc2l6ZSAtIDEgOlxuICAgICAgICAgIC8vIHJlcXVpcmUgbm8gbmV3IHBhcnRpdGlvbnNcbiAgICAgICAgICBuZXcgU2V0KHBhcnRzLnZhbHVlcygpKS5zaXplID09PSBwYXJ0Q291bnQgJiYgcGFydHMuc2l6ZSA9PT0gc2l6ZSAtIDE7XG4gICAgICBpZiAob2spIHtcbiAgICAgICAgc2l6ZS0tO1xuICAgICAgICB0aGlzLmdyaWQuc2V0KGUsICcnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogV2UgY2FuJ3QgaGFuZGxlIGEgdGlsZSAnIGMgfGMgIHwgICAnIHNvIGdldCByaWQgb2Ygb25lIG9yIHRoZVxuICAgKiBvdGhlciBvZiB0aGUgZWRnZXMuICBMZWF2ZSB0aWxlcyBvZiB0aGUgZm9ybSAnIGMgfCAgIHwgYyAnIHNpbmNlXG4gICAqIHRoYXQgd29ya3MgZmluZS4gIFRPRE8gLSBob3cgdG8gcHJlc2VydmUgJyA+IHwgICB8IDwgJz9cbiAgICovXG4gIHJlbW92ZVNwdXJzKCkge1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53OyB4KyspIHtcbiAgICAgICAgY29uc3QgYyA9ICh5IDw8IDEyIHwgMHg4MDggfCB4IDw8IDQpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoYykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCB1cCA9IChjIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgICAgY29uc3QgZG93biA9IChjICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgICAgY29uc3QgbGVmdCA9IChjIC0gMHg4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gKGMgKyAweDgpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKCh0aGlzLmdyaWQuZ2V0KHVwKSB8fCB0aGlzLmdyaWQuZ2V0KGRvd24pKSAmJlxuICAgICAgICAgICAgKHRoaXMuZ3JpZC5nZXQobGVmdCkgfHwgdGhpcy5ncmlkLmdldChyaWdodCkpKSB7XG4gICAgICAgICAgaWYgKHRoaXMucmFuZG9tLm5leHRJbnQoMikpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQodXAsICcnKTtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQoZG93biwgJycpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KGxlZnQsICcnKTtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQocmlnaHQsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhgcmVtb3ZlICR7eX0gJHt4fTpcXG4ke3RoaXMuZ3JpZC5zaG93KCl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZW1vdmVUaWdodExvb3BzKCkge1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oIC0gMTsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSB5IDw8IDEyIHwgMHg4MDA7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMudyAtIDE7IHgrKykge1xuICAgICAgICBjb25zdCBjb29yZCA9IChyb3cgfCAoeCA8PCA0KSB8IDgpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKHRoaXMuaXNUaWdodExvb3AoY29vcmQpKSB0aGlzLmJyZWFrVGlnaHRMb29wKGNvb3JkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpc1RpZ2h0TG9vcChjb29yZDogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgZm9yIChsZXQgZHkgPSAwOyBkeSA8IDB4MTgwMDsgZHkgKz0gMHg4MDApIHtcbiAgICAgIGZvciAobGV0IGR4ID0gMDsgZHggPCAweDE4OyBkeCArPSA4KSB7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gZHkgfCBkeFxuICAgICAgICBpZiAoZGVsdGEgPT09IDB4ODA4KSBjb250aW51ZTtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoKGNvb3JkICsgZGVsdGEpIGFzIEdyaWRDb29yZCkgIT09ICdjJykgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGJyZWFrVGlnaHRMb29wKGNvb3JkOiBHcmlkQ29vcmQpIHtcbiAgICAvLyBQaWNrIGEgZGVsdGEgLSBlaXRoZXIgOCwgMTAwOCwgODAwLCA4MTBcbiAgICBjb25zdCByID0gdGhpcy5yYW5kb20ubmV4dEludCgweDEwMDAwKTtcbiAgICBjb25zdCBkZWx0YSA9IHIgJiAxID8gKHIgJiAweDEwMDApIHwgOCA6IChyICYgMHgxMCkgfCAweDgwMDtcbiAgICB0aGlzLmdyaWQuc2V0KChjb29yZCArIGRlbHRhKSBhcyBHcmlkQ29vcmQsICcnKTtcbiAgfVxuXG4gIGFkZFN0YWlycyh1cCA9IDAsIGRvd24gPSAwKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBGaW5kIHNwb3RzIHdoZXJlIHdlIGNhbiBhZGQgc3RhaXJzXG4vL2lmKHRoaXMucGFyYW1zLmlkPT09NSlkZWJ1Z2dlcjtcbiAgICBjb25zdCBzdGFpcnMgPSBbdXAsIGRvd25dO1xuICAgIGlmICghc3RhaXJzWzBdICYmICFzdGFpcnNbMV0pIHJldHVybiBPSzsgLy8gbm8gc3RhaXJzXG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBpZiAoIXRoaXMudHJ5QWRkU3RhaXIoYywgc3RhaXJzKSkgY29udGludWU7XG4gICAgICBpZiAoIXN0YWlyc1swXSAmJiAhc3RhaXJzWzFdKSByZXR1cm4gT0s7IC8vIG5vIHN0YWlyc1xuICAgIH1cbiAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYHN0YWlyc2B9OyAvL1xcbiR7dGhpcy5ncmlkLnNob3coKX1gfTtcbiAgfVxuXG4gIGFkZEVhcmx5U3RhaXIoYzogR3JpZENvb3JkLCBzdGFpcjogc3RyaW5nKTogQXJyYXk8W0dyaWRDb29yZCwgc3RyaW5nXT4ge1xuICAgIGNvbnN0IG1vZHM6IEFycmF5PFtHcmlkQ29vcmQsIHN0cmluZ10+ID0gW107XG4gICAgY29uc3QgbGVmdCA9IGMgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IGMgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCB1cCA9IGMgLSAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgZG93biA9IGMgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgbGV0IG5laWdoYm9ycyA9IFtjIC0gOCwgYyArIDhdIGFzIEdyaWRDb29yZFtdO1xuICAgIGlmIChzdGFpciA9PT0gJzwnKSB7XG4gICAgICBuZWlnaGJvcnMucHVzaChkb3duKTtcbiAgICAgIG1vZHMucHVzaChbdXAsICcnXSk7XG4gICAgICBpZiAodGhpcy5ncmlkLmdldChsZWZ0KSA9PT0gJ2MnICYmIHRoaXMuZ3JpZC5nZXQocmlnaHQpID09PSAnYycgJiZcbiAgICAgICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KDMpKSB7XG4gICAgICAgIG1vZHMucHVzaChbZG93biwgJyddLCBbYywgJzwnXSk7XG4gICAgICAgIHJldHVybiBtb2RzO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc3RhaXIgPT09ICc+Jykge1xuICAgICAgbmVpZ2hib3JzLnB1c2godXApO1xuICAgICAgbW9kcy5wdXNoKFtkb3duLCAnJ10pO1xuICAgIH1cbiAgICAvLyBOT1RFOiBpZiB3ZSBkZWxldGUgdGhlbiB3ZSBmb3JnZXQgdG8gemVybyBpdCBvdXQuLi5cbiAgICAvLyBCdXQgaXQgd291bGQgc3RpbGwgYmUgbmljZSB0byBcInBvaW50XCIgdGhlbSBpbiB0aGUgZWFzeSBkaXJlY3Rpb24/XG4gICAgLy8gaWYgKHRoaXMuZGVsdGEgPCAtMTYpIG5laWdoYm9ycy5zcGxpY2UoMiwgMSk7XG4gICAgLy8gaWYgKCh0aGlzLmRlbHRhICYgMHhmKSA8IDgpIG5laWdoYm9ycy5zcGxpY2UoMSwgMSk7XG4gICAgbmVpZ2hib3JzID0gbmVpZ2hib3JzLmZpbHRlcihjID0+IHRoaXMuZ3JpZC5nZXQoYykgPT09ICdjJyk7XG4gICAgaWYgKCFuZWlnaGJvcnMubGVuZ3RoKSByZXR1cm4gW107XG4gICAgY29uc3Qga2VlcCA9IHRoaXMucmFuZG9tLm5leHRJbnQobmVpZ2hib3JzLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBuZWlnaGJvcnMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmIChqICE9PSBrZWVwKSBtb2RzLnB1c2goW25laWdoYm9yc1tqXSwgJyddKTtcbiAgICB9XG4gICAgbW9kcy5wdXNoKFtjLCBzdGFpcl0pO1xuICAgIHJldHVybiBtb2RzO1xuICB9XG5cbiAgdHJ5QWRkU3RhaXIoYzogR3JpZENvb3JkLCBzdGFpcnM6IG51bWJlcltdKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuZml4ZWQuaGFzKChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZCkpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgYyk7XG4gICAgY29uc3QgYm90aCA9IHN0YWlyc1swXSAmJiBzdGFpcnNbMV07XG4gICAgY29uc3QgdG90YWwgPSBzdGFpcnNbMF0gKyBzdGFpcnNbMV07XG4gICAgY29uc3QgdXAgPSB0aGlzLnJhbmRvbS5uZXh0SW50KHRvdGFsKSA8IHN0YWlyc1swXTtcbiAgICBjb25zdCBjYW5kaWRhdGVzID0gW3VwID8gMCA6IDFdO1xuICAgIGlmIChib3RoKSBjYW5kaWRhdGVzLnB1c2godXAgPyAxIDogMCk7XG4gICAgZm9yIChjb25zdCBzdGFpciBvZiBjYW5kaWRhdGVzKSB7XG4gICAgICBjb25zdCBzdGFpckNoYXIgPSAnPD4nW3N0YWlyXTtcbiAgICAgIGNvbnN0IHN0YWlyVGlsZSA9IHRpbGUuc3Vic3RyaW5nKDAsIDQpICsgc3RhaXJDaGFyICsgdGlsZS5zdWJzdHJpbmcoNSk7XG4gICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhzdGFpclRpbGUpLmxlbmd0aCkge1xuICAgICAgICB0aGlzLmdyaWQuc2V0KChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZCwgc3RhaXJDaGFyKTtcbiAgICAgICAgc3RhaXJzW3N0YWlyXS0tO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gbWFrZSBhIHBhdGggY29ubmVjdGluZyBzdGFydCB0byBlbmQgKGJvdGggY2VudGVycykuXG4gICAqIFJlcXVpcmVzIGFsbCAuLi4/XG4gICAqL1xuICB0cnlDb25uZWN0KHN0YXJ0OiBHcmlkQ29vcmQsIGVuZDogR3JpZENvb3JkLFxuICAgICAgICAgICAgIGNoYXI6IHN0cmluZywgYXR0ZW1wdHMgPSAxKTogYm9vbGVhbiB7XG4gICAgd2hpbGUgKGF0dGVtcHRzLS0gPiAwKSB7XG4gICAgICBjb25zdCByZXBsYWNlID0gbmV3IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4oKTtcbiAgICAgIGxldCBwb3MgPSBzdGFydDtcbiAgICAgIGlmICgoc3RhcnQgJiBlbmQgJiAweDgwOCkgIT09IDB4ODA4KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgYmFkIHN0YXJ0ICR7aGV4KHN0YXJ0KX0gb3IgZW5kICR7aGV4KGVuZCl9YCk7XG4gICAgICB9XG4gICAgICByZXBsYWNlLnNldChwb3MsIGNoYXIpO1xuICAgICAgd2hpbGUgKHBvcyAhPT0gZW5kKSB7XG4gICAgICAgIC8vIG9uIGEgY2VudGVyIC0gZmluZCBlbGlnaWJsZSBkaXJlY3Rpb25zXG4gICAgICAgIGNvbnN0IGRpcnM6IG51bWJlcltdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZGlyIG9mIFs4LCAtOCwgMHg4MDAsIC0weDgwMF0pIHtcbiAgICAgICAgICBjb25zdCBwb3MxID0gcG9zICsgZGlyIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBjb25zdCBwb3MyID0gcG9zICsgMiAqIGRpciBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgaWYgKHRoaXMuZml4ZWQuaGFzKHBvczIpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAocmVwbGFjZS5nZXQocG9zMikgPz8gdGhpcy5ncmlkLmdldChwb3MyKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihwb3MxKSkgY29udGludWU7XG4gICAgICAgICAgZGlycy5wdXNoKGRpcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkaXJzLmxlbmd0aCkgYnJlYWs7XG4gICAgICAgIGNvbnN0IGR5ID0gKGVuZCA+PiAxMikgLSAocG9zID4+IDEyKVxuICAgICAgICBjb25zdCBkeCA9IChlbmQgJiAweGYwKSAtIChwb3MgJiAweGYwKTtcbiAgICAgICAgY29uc3QgcHJlZmVycmVkID0gbmV3IFNldDxudW1iZXI+KGRpcnMpO1xuICAgICAgICBpZiAoZHkgPCAwKSBwcmVmZXJyZWQuZGVsZXRlKDB4ODAwKTtcbiAgICAgICAgaWYgKGR5ID4gMCkgcHJlZmVycmVkLmRlbGV0ZSgtMHg4MDApO1xuICAgICAgICBpZiAoZHggPCAwKSBwcmVmZXJyZWQuZGVsZXRlKDgpO1xuICAgICAgICBpZiAoZHggPiAwKSBwcmVmZXJyZWQuZGVsZXRlKC04KTtcbiAgICAgICAgLy8gMzoxIGJpYXMgZm9yIHByZWZlcnJlZCBkaXJlY3Rpb25zICAoVE9ETyAtIGJhY2t0cmFja2luZz8pXG4gICAgICAgIGRpcnMucHVzaCguLi5wcmVmZXJyZWQsIC4uLnByZWZlcnJlZCk7XG4gICAgICAgIGNvbnN0IGRpciA9IHRoaXMucmFuZG9tLnBpY2soZGlycyk7XG4gICAgICAgIHJlcGxhY2Uuc2V0KHBvcyArIGRpciBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAgICAgICByZXBsYWNlLnNldChwb3MgPSBwb3MgKyAyICogZGlyIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gICAgICB9XG4gICAgICBpZiAocG9zICE9PSBlbmQpIGNvbnRpbnVlO1xuICAgICAgLy8gSWYgd2UgZ290IHRoZXJlLCBtYWtlIHRoZSBjaGFuZ2VzLlxuICAgICAgZm9yIChjb25zdCBbYywgdl0gb2YgcmVwbGFjZSkge1xuICAgICAgICB0aGlzLmdyaWQuc2V0KGMsIHYpO1xuICAgICAgICBpZiAoKGMgJiAweDgwOCkgPT09IDB4ODA4KSB0aGlzLmNvdW50Kys7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdHJ5QWRkTG9vcChjaGFyOiBzdHJpbmcsIGF0dGVtcHRzID0gMSk6IGJvb2xlYW4ge1xuICAgIC8vIHBpY2sgYSBwYWlyIG9mIGNvb3JkcyBmb3Igc3RhcnQgYW5kIGVuZFxuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxHcmlkQ29vcmQ+KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYyA9IHRoaXMuZ3JpZC5jb29yZChpIGFzIEdyaWRJbmRleCk7XG4gICAgICBpZiAodGhpcy5ncmlkLmdldChjKSB8fCB0aGlzLmdyaWQuaXNCb3JkZXIoYykpIGNvbnRpbnVlO1xuICAgICAgaWYgKCF0aGlzLmdyaWQuZ2V0KEUoYykpKSB1Zi51bmlvbihbYywgRShjKV0pO1xuICAgICAgaWYgKCF0aGlzLmdyaWQuZ2V0KFMoYykpKSB1Zi51bmlvbihbYywgUyhjKV0pO1xuICAgIH1cbiAgICBjb25zdCBlbGlnaWJsZSA9XG4gICAgICAgIG5ldyBEZWZhdWx0TWFwPHVua25vd24sIFtHcmlkQ29vcmQsIEdyaWRDb29yZF1bXT4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgcyBvZiB0aGlzLmdyaWQuc2NyZWVucygpKSB7XG4gICAgICBjb25zdCBjID0gcyArIDB4ODA4IGFzIEdyaWRDb29yZDtcbiAgICAgIGlmICghdGhpcy5ncmlkLmdldChjKSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGQgb2YgWzgsIC04LCAweDgwMCwgLTB4ODAwXSkge1xuICAgICAgICBjb25zdCBlMSA9IGMgKyBkIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihlMSkgfHwgdGhpcy5ncmlkLmdldChlMSkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBlMiA9IGMgKyAyICogZCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGUyKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHJlcGxhY2UgPSBuZXcgTWFwKFtbZTEgYXMgR3JpZENvb3JkLCBjaGFyXV0pO1xuICAgICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgcywge3JlcGxhY2V9KTtcbiAgICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcodGlsZSkubGVuZ3RoKSB7XG4gICAgICAgICAgZWxpZ2libGUuZ2V0KHVmLmZpbmQoZTIpKS5wdXNoKFtlMSwgZTJdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB3ZWlnaHRlZE1hcCA9IG5ldyBNYXA8R3JpZENvb3JkLCBbR3JpZENvb3JkLCBHcmlkQ29vcmRdW10+KCk7XG4gICAgZm9yIChjb25zdCBwYXJ0aXRpb24gb2YgZWxpZ2libGUudmFsdWVzKCkpIHtcbiAgICAgIGlmIChwYXJ0aXRpb24ubGVuZ3RoIDwgMikgY29udGludWU7IC8vIFRPRE8gLSAzIG9yIDQ/XG4gICAgICBmb3IgKGNvbnN0IFtlMV0gb2YgcGFydGl0aW9uKSB7XG4gICAgICAgIHdlaWdodGVkTWFwLnNldChlMSwgcGFydGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgd2VpZ2h0ZWQgPSBbLi4ud2VpZ2h0ZWRNYXAudmFsdWVzKCldO1xuICAgIGlmICghd2VpZ2h0ZWQubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgd2hpbGUgKGF0dGVtcHRzLS0gPiAwKSB7XG4gICAgICBjb25zdCBwYXJ0aXRpb24gPSB0aGlzLnJhbmRvbS5waWNrKHdlaWdodGVkKTtcbiAgICAgIGNvbnN0IFtbZTAsIGMwXSwgW2UxLCBjMV1dID0gdGhpcy5yYW5kb20uaXNodWZmbGUocGFydGl0aW9uKTtcbiAgICAgIHRoaXMuZ3JpZC5zZXQoZTAsIGNoYXIpO1xuICAgICAgdGhpcy5ncmlkLnNldChlMSwgY2hhcik7XG4gICAgICBpZiAodGhpcy50cnlDb25uZWN0KGMwLCBjMSwgY2hhciwgNSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICB0aGlzLmdyaWQuc2V0KGUwLCAnJyk7XG4gICAgICB0aGlzLmdyaWQuc2V0KGUxLCAnJyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIGV4dGVuZCBhbiBleGlzdGluZyBzY3JlZW4gaW50byBhIGRpcmVjdGlvbiB0aGF0J3NcbiAgICogY3VycmVudGx5IGVtcHR5LiAgTGVuZ3RoIGlzIHByb2JhYmlsaXN0aWMsIGVhY2ggc3VjY2Vzc2Z1bFxuICAgKiBhdHRlbXB0IHdpbGwgaGF2ZSBhIDEvbGVuZ3RoIGNoYW5jZSBvZiBzdG9wcGluZy4gIFJldHVybnMgbnVtYmVyXG4gICAqIG9mIHNjcmVlbnMgYWRkZWQuXG4gICAqL1xuICB0cnlFeHRydWRlKGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsIGF0dGVtcHRzID0gMSk6IG51bWJlciB7XG4gICAgLy8gTG9vayBmb3IgYSBwbGFjZSB0byBzdGFydC5cbiAgICB3aGlsZSAoYXR0ZW1wdHMtLSkge1xuICAgICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICAgIGNvbnN0IG1pZCA9IGMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICghdGhpcy5ncmlkLmdldChtaWQpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIGMpO1xuICAgICAgICBmb3IgKGxldCBkaXIgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWzAsIDEsIDIsIDNdKSkge1xuICAgICAgICAgIGNvbnN0IG4xID0gbWlkICsgR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBjb25zdCBuMiA9IG1pZCArIDIgKiBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuLy9jb25zb2xlLmxvZyhgbWlkOiAke21pZC50b1N0cmluZygxNil9OyBuMSgke24xLnRvU3RyaW5nKDE2KX0pOiAke3RoaXMuZ3JpZC5nZXQobjEpfTsgbjIoJHtuMi50b1N0cmluZygxNil9KTogJHt0aGlzLmdyaWQuZ2V0KG4yKX1gKTtcbiAgICAgICAgICBpZiAodGhpcy5ncmlkLmdldChuMSkgfHwgdGhpcy5ncmlkLmlzQm9yZGVyKG4xKSB8fCB0aGlzLmdyaWQuZ2V0KG4yKSkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgaSA9IFRJTEVESVJbZGlyXTtcbiAgICAgICAgICBjb25zdCByZXAgPSB0aWxlLnN1YnN0cmluZygwLCBpKSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcocmVwKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobjEsIGNoYXIpO1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChuMiwgY2hhcik7XG4gICAgICAgICAgICBjb25zdCBhZGRlZCA9IHRoaXMudHJ5Q29udGludWVFeHRydWRlKGNoYXIsIGxlbmd0aCwgbjIpO1xuICAgICAgICAgICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQ7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KG4yLCAnJyk7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KG4xLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFJlY3Vyc2l2ZSBhdHRlbXB0LiAqL1xuICB0cnlDb250aW51ZUV4dHJ1ZGUoY2hhcjogc3RyaW5nLCBsZW5ndGg6IG51bWJlciwgYzogR3JpZENvb3JkKTogbnVtYmVyIHtcbiAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgYyAtIDB4ODA4IGFzIEdyaWRDb29yZCk7XG4gICAgY29uc3Qgb2sgPSB0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpLmxlbmd0aCA+IDA7XG4gICAgaWYgKGxlbmd0aCA9PT0gMSkgcmV0dXJuIG9rID8gMSA6IDA7XG4gICAgLy8gbWF5YmUgcmV0dXJuIGVhcmx5XG4gICAgaWYgKG9rICYmICF0aGlzLnJhbmRvbS5uZXh0SW50KGxlbmd0aCkpIHJldHVybiAxO1xuICAgIC8vIGZpbmQgYSBuZXcgZGlyZWN0aW9uXG4gICAgZm9yIChjb25zdCBkaXIgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWzAsIDEsIDIsIDNdKSkge1xuICAgICAgY29uc3QgbjEgPSBjICsgR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IG4yID0gYyArIDIgKiBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQobjEpIHx8IHRoaXMuZ3JpZC5pc0JvcmRlcihuMSkgfHwgdGhpcy5ncmlkLmdldChuMikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaSA9IFRJTEVESVJbZGlyXTtcbiAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQobjEsIGNoYXIpO1xuICAgICAgICB0aGlzLmdyaWQuc2V0KG4yLCBjaGFyKTtcbiAgICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShjaGFyLCBsZW5ndGggLSAxLCBuMik7XG4gICAgICAgIGlmIChhZGRlZCkgcmV0dXJuIGFkZGVkICsgMTtcbiAgICAgICAgdGhpcy5ncmlkLnNldChuMiwgJycpO1xuICAgICAgICB0aGlzLmdyaWQuc2V0KG4xLCAnJyk7XG4gICAgICB9XG4gICAgICBpZiAob2spIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gb2sgPyAxIDogMDtcbiAgfVxuXG4gIC8qKiBBdHRlbXB0IHRvIGFkZCBhIGdyaWQgdHlwZS4gKi9cbiAgdHJ5QWRkKG9wdHM6IEFkZE9wdHMgPSB7fSk6IG51bWJlciB7XG4gICAgLy8gT3B0aW9uYWxseSBzdGFydCBhdCB0aGUgZ2l2ZW4gc2NyZWVuIG9ubHkuXG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMub3JpZy50aWxlc2V0O1xuICAgIGNvbnN0IHthdHRlbXB0cyA9IDEsIGNoYXIgPSAnYycsIHN0YXJ0LCBsb29wID0gZmFsc2V9ID0gb3B0cztcbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IGF0dGVtcHRzOyBhdHRlbXB0KyspIHtcbiAgICAgIGNvbnN0IHN0YXJ0SXRlciA9XG4gICAgICAgICAgc3RhcnQgIT0gbnVsbCA/XG4gICAgICAgICAgICAgIFsoc3RhcnQgJiAweGYwZjApIGFzIEdyaWRDb29yZF0gOlxuICAgICAgICAgICAgICB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmdyaWQuc2NyZWVucygpKTtcbiAgICAgIGZvciAoY29uc3QgYyBvZiBzdGFydEl0ZXIpIHtcbiAgICAgICAgY29uc3QgbWlkID0gYyArIDB4ODA4IGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKCF0aGlzLmdyaWQuZ2V0KG1pZCkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgYyk7XG4gICAgICAgIGZvciAobGV0IGRpciBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbMCwgMSwgMiwgM10pKSB7XG4gICAgICAgICAgY29uc3QgbjEgPSBtaWQgKyBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGNvbnN0IG4yID0gbWlkICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgaWYgKHRoaXMuZml4ZWQuaGFzKG4xKSB8fCB0aGlzLmZpeGVkLmhhcyhuMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IG8xID0gdGhpcy5ncmlkLmdldChuMSk7XG4gICAgICAgICAgY29uc3QgbzIgPSB0aGlzLmdyaWQuZ2V0KG4yKTtcbi8vY29uc29sZS5sb2coYG1pZCgke21pZC50b1N0cmluZygxNil9KTogJHt0aGlzLmdyaWQuZ2V0KG1pZCl9OyBuMSgke24xLnRvU3RyaW5nKDE2KX0pOiAke3RoaXMuZ3JpZC5nZXQobjEpfTsgbjIoJHtuMi50b1N0cmluZygxNil9KTogJHt0aGlzLmdyaWQuZ2V0KG4yKX1gKTtcbiAgICAgICAgICAvLyBhbGxvdyBtYWtpbmcgcHJvZ3Jlc3Mgb24gdG9wIG9mIGFuIGVkZ2Utb25seSBjb25uZWN0aW9uLlxuICAgICAgICAgIGlmICgobzEgJiYgKG8yIHx8IG8xICE9PSBjaGFyKSkgfHwgdGhpcy5ncmlkLmlzQm9yZGVyKG4xKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKCFsb29wKSB7XG4gICAgICAgICAgICBjb25zdCBuZWlnaGJvclRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBuMiAtIDB4ODA4IGFzIEdyaWRDb29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cmVwbGFjZTogbmV3IE1hcChbW24xLCAnJ11dKX0pO1xuICAgICAgICAgICAgaWYgKC9cXFMvLnRlc3QobmVpZ2hib3JUaWxlKSkgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gICAgICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAgICAgICAgIGlmICh0aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcocmVwKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY291bnQrKztcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobjEsIGNoYXIpO1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChuMiwgY2hhcik7XG4gICAgICAgICAgICAvLyBpZiAobGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgLy8gICBjb25zdCBhZGRlZCA9IHRoaXMudHJ5Q29udGludWVFeHRydWRlKGNoYXIsIGxlbmd0aCwgbjIpO1xuICAgICAgICAgICAgLy8gICBpZiAoYWRkZWQpIHJldHVybiBhZGRlZDtcbiAgICAgICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBuZWlnaGJvclRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBuMiAtIDB4ODA4IGFzIEdyaWRDb29yZCk7XG4gICAgICAgICAgICBpZiAodGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKG5laWdoYm9yVGlsZSkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobjIsIG8yKTtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobjEsIG8xKTtcbiAgICAgICAgICAgIHRoaXMuY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvLyAvKipcbiAgLy8gICogQXR0ZW1wdCB0byBleHRlbmQgYW4gZXhpc3Rpbmcgc2NyZWVuIGludG8gYSBkaXJlY3Rpb24gdGhhdCdzXG4gIC8vICAqIGN1cnJlbnRseSBlbXB0eS4gIExlbmd0aCBpcyBwcm9iYWJpbGlzdGljLCBlYWNoIHN1Y2Nlc3NmdWxcbiAgLy8gICogYXR0ZW1wdCB3aWxsIGhhdmUgYSAxL2xlbmd0aCBjaGFuY2Ugb2Ygc3RvcHBpbmcuICBSZXR1cm5zIG51bWJlclxuICAvLyAgKiBvZiBzY3JlZW5zIGFkZGVkLlxuICAvLyAgKi9cbiAgLy8gdHJ5RXh0cnVkZShjaGFyOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyLCBhdHRlbXB0cyA9IDEpOiBudW1iZXIge1xuICAvLyAgIC8vIExvb2sgZm9yIGEgcGxhY2UgdG8gc3RhcnQuXG4gIC8vICAgd2hpbGUgKGF0dGVtcHRzLS0pIHtcbiAgLy8gICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmdyaWQuc2NyZWVucygpKSkge1xuICAvLyAgICAgICBjb25zdCBtaWQgPSBjICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAvLyAgICAgICBpZiAoIXRoaXMuZ3JpZC5nZXQobWlkKSkgY29udGludWU7XG4gIC8vICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBjKTtcbiAgLy8gICAgICAgZm9yIChsZXQgZGlyIG9mIFswLCAxLCAyLCAzXSkge1xuICAvLyAgICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KG1pZCArIDIgKiBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkKSkgY29udGludWU7XG4gIC8vICAgICAgICAgY29uc3QgaSA9IFRJTEVESVJbZGlyXTtcbiAgLy8gICAgICAgICBpZiAodGlsZVtpXSAhPT0gJyAnKSBjb250aW51ZTtcbiAgLy8gICAgICAgICBjb25zdCByZXAgPSB0aWxlLnN1YnN0cmluZygwLCBpKSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyhpICsgMSk7XG4gIC8vICAgICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcocmVwKS5sZW5ndGgpIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlDb250aW51ZUV4dHJ1ZGUoY2hhciwgbGVuZ3RoLCBtaWQsIGRpcik7XG4gIC8vICAgICAgICAgICBpZiAoYWRkZWQpIHJldHVybiBhZGRlZDtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIDA7XG4gIC8vIH1cblxuICAvLyB0cnlDb250aW51ZUV4dHJ1ZGUoY2hhcjogc3RyaW5nLCBsZW5ndGg6IG51bWJlcixcbiAgLy8gICAgICAgICAgICAgICAgICAgIG1pZDogR3JpZENvb3JkLCBkaXI6IG51bWJlcik6IG51bWJlciB7XG4gIC8vICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KFtdKTtcbiAgLy8gICBsZXQgd29ya3M6IEFycmF5PFtHcmlkQ29vcmQsIHN0cmluZ10+fHVuZGVmaW5lZDtcbiAgLy8gICBsZXQgd2VpZ2h0ID0gMDtcbiAgLy8gICBPVVRFUjpcbiAgLy8gICB3aGlsZSAodHJ1ZSkge1xuICAvLyAgICAgcmVwbGFjZS5zZXQobWlkICsgR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gIC8vICAgICByZXBsYWNlLnNldChtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gIC8vICAgICBtaWQgPSAobWlkICsgMiAqIEdSSURESVJbZGlyXSkgYXMgR3JpZENvb3JkO1xuXG4gIC8vICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgbWlkIC0gMHg4MDggYXMgR3JpZENvb3JkLCB7cmVwbGFjZX0pO1xuICAvLyAgICAgd2VpZ2h0Kys7XG4gIC8vICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKS5sZW5ndGgpIHtcbiAgLy8gICAgICAgd29ya3MgPSBbLi4ucmVwbGFjZV07XG4gIC8vICAgICAgIC8vIHdlIGNhbiBxdWl0IG5vdyAtIHNlZSBpZiB3ZSBzaG91bGQuXG4gIC8vICAgICAgIHdoaWxlICh3ZWlnaHQgPiAwKSB7XG4gIC8vICAgICAgICAgaWYgKCF0aGlzLnJhbmRvbS5uZXh0SW50KGxlbmd0aCkpIGJyZWFrIE9VVEVSO1xuICAvLyAgICAgICAgIHdlaWdodC0tO1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG5cbiAgLy8gICAgIC8vIEZpbmQgYSB2aWFibGUgbmV4dCBzdGVwLlxuICAvLyAgICAgZm9yIChjb25zdCBuZXh0RGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgLy8gICAgICAgY29uc3QgZGVsdGEgPSBHUklERElSW25leHREaXJdO1xuICAvLyAgICAgICBjb25zdCBlZGdlID0gbWlkICsgZGVsdGEgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKGVkZ2UpKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKHJlcGxhY2UuZ2V0KC4uLikgfHwgdGhpcy5ncmlkLmdldChtaWQgKyAyICogZGVsdGEgYXMgR3JpZENvb3JkKSkgY29udGludWU7XG4gIC8vICAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gIC8vICAgICAgIGlmICh0aWxlW2ldICE9PSAnICcpIGNvbnRpbnVlO1xuICAvLyAgICAgICBjb25zdCByZXAgPSB0aWxlLnN1YnN0cmluZygwLCBpKSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyhpICsgMSk7XG4gIC8vICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gIC8vICAgICAgICAgcmVwbGFjZS5zZXQobWlkICsgZGVsdGEgYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgLy8gICAgICAgICByZXBsYWNlLnNldChtaWQgKyAyICogZGVsdGEgYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgLy8gICAgICAgICBkaXIgPSBuZXh0RGlyO1xuICAvLyAgICAgICAgIGNvbnRpbnVlIE9VVEVSO1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgICBicmVhazsgLy8gbmV2ZXIgZm91bmQgYSBmb2xsb3ctdXAsIHNvIHF1aXRcbiAgLy8gICB9XG4gIC8vICAgaWYgKCF3b3JrcykgcmV0dXJuIDA7XG4gIC8vICAgZm9yIChjb25zdCBbYywgdl0gb2Ygd29ya3MpIHtcbiAgLy8gICAgIHRoaXMuZ3JpZC5zZXQoYywgdik7XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiB3b3Jrcy5sZW5ndGggPj4+IDE7XG4gIC8vIH1cblxuICAvKiogTWFrZSBhcnJhbmdlbWVudHMgdG8gbWF4aW1pemUgdGhlIHN1Y2Nlc3MgY2hhbmNlcyBvZiBpbmZlci4gKi9cbiAgcHJlaW5mZXIoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmICh0aGlzLnBhcmFtcy5mZWF0dXJlcz8uc3Bpa2UpIHtcbiAgICAgIGlmICgocmVzdWx0ID0gdGhpcy5wcmVpbmZlclNwaWtlcygpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgcHJlaW5mZXJTcGlrZXMoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBtYWtlIHN1cmUgdGhlcmUncyBhICdjJyBhYm92ZSBlYWNoICdzJ1xuICAgIC8vIGNoZWNrIHNpZGVzP1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGluZmVyU2NyZWVucygpOiBSZXN1bHQ8TWV0YWxvY2F0aW9uPiB7XG4gICAgY29uc3Qgc2NyZWVuczogTWV0YXNjcmVlbltdID0gW107XG4gICAgZm9yIChjb25zdCBzIG9mIHRoaXMuZ3JpZC5zY3JlZW5zKCkpIHtcbiAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBzKTtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPVxuICAgICAgICAgIHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcodGlsZSlcbiAgICAgICAgICAgICAgLmZpbHRlcihzID0+ICFzLmRhdGEubW9kKTtcbiAgICAgIGlmICghY2FuZGlkYXRlcy5sZW5ndGgpIHtcbiAgICAgICAgLy9jb25zb2xlLmVycm9yKHRoaXMuZ3JpZC5zaG93KCkpO1xuaWYgKHRoaXMuZ3JpZC5zaG93KCkubGVuZ3RoID4gMTAwMDAwKSBkZWJ1Z2dlcjtcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBpbmZlciBzY3JlZW4gJHtoZXgocyl9OiBbJHt0aWxlfV1cXG4ke3RoaXMuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgICBjb25zdCBwaWNrID0gdGhpcy5yYW5kb20ucGljayhjYW5kaWRhdGVzKTtcbiAgICAgIHNjcmVlbnMucHVzaChwaWNrKTtcbiAgICAgIGlmIChwaWNrLmhhc0ZlYXR1cmUoJ3dhbGwnKSkgdGhpcy53YWxscysrO1xuICAgICAgaWYgKHBpY2suaGFzRmVhdHVyZSgnYnJpZGdlJykpIHRoaXMuYnJpZGdlcysrO1xuXG4gICAgICAvLyBUT0RPIC0gYW55IG90aGVyIGZlYXR1cmVzIHRvIHRyYWNrP1xuXG4gICAgfVxuXG4gICAgbGV0IGFsbEVtcHR5ID0gdHJ1ZTtcbiAgICBjb25zdCBtZXRhID0gbmV3IE1ldGFsb2NhdGlvbih0aGlzLnBhcmFtcy5pZCwgdGhpcy5vcmlnLnRpbGVzZXQsIHRoaXMuaCwgdGhpcy53KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMudzsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHNjcmVlbnNbeSAqIHRoaXMudyArIHhdO1xuICAgICAgICBtZXRhLnNldCh5IDw8IDQgfCB4LCBzY3IpO1xuICAgICAgICBpZiAoIXNjci5pc0VtcHR5KCkpIGFsbEVtcHR5ID0gZmFsc2U7XG4gICAgICAgIGlmICh5KSB7XG4gICAgICAgICAgY29uc3QgYWJvdmUgPSBtZXRhLmdldCgoeSAtIDEpIDw8IDQgfCB4KTtcbiAgICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuaXNCYW5uZWRWZXJ0aWNhbChhYm92ZSwgc2NyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGZhaWw6IGBiYWQgdmVydGljYWwgbmVpZ2hib3IgYXQgJHt5fSR7eH06ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhYm92ZS5uYW1lfSAke3Njci5uYW1lfWB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoeCkge1xuICAgICAgICAgIGNvbnN0IGxlZnQgPSBtZXRhLmdldCh5IDw8IDQgfCAoeCAtIDEpKTtcbiAgICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuaXNCYW5uZWRIb3Jpem9udGFsKGxlZnQsIHNjcikpIHtcbiAgICAgICAgICAgIHJldHVybiB7b2s6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBmYWlsOiBgYmFkIGhvcml6b250YWwgbmVpZ2hib3IgYXQgJHt5fSR7eH06ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBsZWZ0Lm5hbWV9ICR7c2NyLm5hbWV9YH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChhbGxFbXB0eSkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBhbGwgc2NyZWVucyBlbXB0eWB9O1xuXG4gICAgcmV0dXJuIHtvazogdHJ1ZSwgdmFsdWU6IG1ldGF9O1xuICB9XG5cbiAgcmVmaW5lTWV0YXNjcmVlbnMobWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBtYWtlIHN1cmUgd2UgaGF2ZSB0aGUgcmlnaHQgbnVtYmVyIG9mIHdhbGxzIGFuZCBicmlkZ2VzXG4gICAgLy8gdGhpcy53YWxscyA9IHRoaXMuYnJpZGdlcyA9IDA7IC8vIFRPRE8gLSBkb24ndCBib3RoZXIgbWFraW5nIHRoZXNlIGluc3RhbmNlXG4gICAgLy8gZm9yIChjb25zdCBwb3Mgb2YgbWV0YS5hbGxQb3MoKSkge1xuICAgIC8vICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAvLyAgIGlmIChzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHtjb25zb2xlLndhcm4oaGV4KHBvcykpOyB0aGlzLmJyaWRnZXMrKzt9XG4gICAgLy8gICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkgdGhpcy53YWxscysrO1xuICAgIC8vIH1cbiAgICBjb25zdCBicmlkZ2VzID0gdGhpcy5wYXJhbXMuZmVhdHVyZXM/LmJyaWRnZSB8fCAwO1xuICAgIGNvbnN0IHdhbGxzID0gdGhpcy5wYXJhbXMuZmVhdHVyZXM/LndhbGwgfHwgMDtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShtZXRhLmFsbFBvcygpKSkge1xuICAgICAgY29uc3QgYyA9ICgocG9zIDw8IDggfCBwb3MgPDwgNCkgJiAweGYwZjApIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBjKVxuICAgICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAgIGlmICh0aGlzLmJyaWRnZXMgPD0gYnJpZGdlcyAmJiBzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIGNvbnRpbnVlO1xuICAgICAgaWYgKHRoaXMuYWRkQmxvY2tzICYmXG4gICAgICAgICAgdGhpcy50cnlNZXRhKG1ldGEsIHBvcywgdGhpcy5vcmlnLnRpbGVzZXQud2l0aE1vZCh0aWxlLCAnYmxvY2snKSkpIHtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgdGhpcy5icmlkZ2VzLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge1xuICAgICAgICBpZiAodGhpcy50cnlNZXRhKG1ldGEsIHBvcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICdicmlkZ2UnKSkpIHtcbiAgICAgICAgICB0aGlzLmJyaWRnZXMtLTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgLy8gfSBlbHNlIGlmIChicmlkZ2VzIDwgdGhpcy5icmlkZ2VzICYmIHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge1xuICAgICAgLy8gICAvLyBjYW4ndCBhZGQgYnJpZGdlcz9cbiAgICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMud2FsbHMgPCB3YWxscyAmJiAhc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkge1xuICAgICAgICBpZiAodGhpcy50cnlNZXRhKG1ldGEsIHBvcywgdGhpcy5vcmlnLnRpbGVzZXQud2l0aE1vZCh0aWxlLCAnd2FsbCcpKSkge1xuICAgICAgICAgIHRoaXMud2FsbHMrKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb25zb2xlLndhcm4oYGJyaWRnZXMgJHt0aGlzLmJyaWRnZXN9ICR7YnJpZGdlc30gLyB3YWxscyAke3RoaXMud2FsbHN9ICR7d2FsbHN9XFxuJHt0aGlzLmdyaWQuc2hvdygpfVxcbiR7bWV0YS5zaG93KCl9YCk7XG4gICAgaWYgKHRoaXMuYnJpZGdlcyAhPT0gYnJpZGdlcykge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsXG4gICAgICAgICAgICAgIGZhaWw6IGByZWZpbmVNZXRhIGJyaWRnZXMgd2FudCAke2JyaWRnZXN9IGdvdCAke3RoaXMuYnJpZGdlc31cXG4ke21ldGEuc2hvdygpfWB9O1xuICAgIH1cbiAgICBpZiAodGhpcy53YWxscyAhPT0gd2FsbHMpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLFxuICAgICAgICAgICAgICBmYWlsOiBgcmVmaW5lTWV0YSB3YWxscyB3YW50ICR7d2FsbHN9IGdvdCAke3RoaXMud2FsbHN9XFxuJHttZXRhLnNob3coKX1gfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgdHJ5TWV0YShtZXRhOiBNZXRhbG9jYXRpb24sIHBvczogUG9zLFxuICAgICAgICAgIHNjcmVlbnM6IEl0ZXJhYmxlPE1ldGFzY3JlZW4+KTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBzIG9mIHNjcmVlbnMpIHtcbiAgICAgIGlmICghdGhpcy5jaGVja01ldGEobWV0YSwgbmV3IE1hcChbW3Bvcywgc11dKSkpIGNvbnRpbnVlO1xuICAgICAgbWV0YS5zZXQocG9zLCBzKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjaGVja01ldGEobWV0YTogTWV0YWxvY2F0aW9uLCByZXBsYWNlbWVudHM/OiBNYXA8UG9zLCBNZXRhc2NyZWVuPik6IGJvb2xlYW4ge1xuXG4gICAgLy8gVE9ETyAtIGZsaWdodD8gIG1heSBoYXZlIGEgZGlmZiAjIG9mIGZsaWdodCB2cyBub24tZmxpZ2h0IHBhcnRpdGlvbnNcbiAgICBjb25zdCBvcHRzID0gcmVwbGFjZW1lbnRzID8ge3dpdGg6IHJlcGxhY2VtZW50c30gOiB7fTtcbiAgICBjb25zdCBwYXJ0cyA9IG1ldGEudHJhdmVyc2Uob3B0cyk7XG4gICAgcmV0dXJuIG5ldyBTZXQocGFydHMudmFsdWVzKCkpLnNpemUgPT09IHRoaXMubWF4UGFydGl0aW9ucztcbiAgfVxuXG4gIHJlcXVpcmVFbGlnaWJsZVBpdERlc3RpbmF0aW9uKG1ldGE6IE1ldGFsb2NhdGlvbik6IGJvb2xlYW4ge1xuICAgIGxldCB2ID0gZmFsc2U7XG4gICAgbGV0IGggPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyaXZlcicpIHx8IHNjci5oYXNGZWF0dXJlKCdlbXB0eScpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGVkZ2VzID1cbiAgICAgICAgKHNjci5kYXRhLmVkZ2VzIHx8ICcnKS5zcGxpdCgnJykubWFwKHggPT4geCA9PT0gJyAnID8gJycgOiB4KTtcbiAgICAgIGlmIChlZGdlc1swXSAmJiBlZGdlc1syXSkgdiA9IHRydWU7XG4gICAgICAvLyBOT1RFOiB3ZSBjbGFtcCB0aGUgdGFyZ2V0IFggY29vcmRzIHNvIHRoYXQgc3Bpa2Ugc2NyZWVucyBhcmUgYWxsIGdvb2RcbiAgICAgIC8vIHRoaXMgcHJldmVudHMgZXJyb3JzIGZyb20gbm90IGhhdmluZyBhIHZpYWJsZSBkZXN0aW5hdGlvbiBzY3JlZW4uXG4gICAgICBpZiAoKGVkZ2VzWzFdICYmIGVkZ2VzWzNdKSB8fCBzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgaCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodiAmJiBoKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY2hlY2tNZXRhc2NyZWVucyhtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGlmICghdGhpcy5wYXJhbXMuZmVhdHVyZXM/LnN0YXR1ZSkgcmV0dXJuIE9LO1xuICAgIGxldCBzdGF0dWVzID0gMDtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgc3RhdHVlcyArPSBzY3IuZGF0YS5zdGF0dWVzPy5sZW5ndGggfHwgMDtcbiAgICB9XG4gICAgaWYgKHN0YXR1ZXMgPCB0aGlzLnBhcmFtcy5mZWF0dXJlcy5zdGF0dWUpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgaW5zdWZmaWNpZW50IHN0YXR1ZSBzY3JlZW5zYH07XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxufVxuXG4vLyBUT0RPOlxuLy8gIC0gd2hlbiB0aGVyZSdzIGEgYnJpZGdlLCBuZXcgcnVsZSB0byByZXF1aXJlIGEgc3RhaXIgb3IgcG9pXG4vLyAgICB0byBiZSBwYXJ0aXRpb25lZCBvZmYgaWYgYnJpZGdlIHRpbGUgaXMgcmVtb3ZlZFxuLy8gIC0gcG9zc2libHkgYWxzbyAqbGluayogdG8gb3RoZXIgc2NyZWVuP1xuLy8gIC0gcGxhY2UgYnJpZGdlIGVhcmx5IG9yIGxhdGU/XG4vLyAgICAtIGlmIGVhcmx5IHRoZW4gbm8gd2F5IHRvIGVuZm9yY2UgdGhyb3VnaG5lc3MgcnVsZVxuLy8gICAgLSBpZiBsYXRlIHRoZW4gaGFyZCB0byBzeW5jIHVwIHdpdGggb3RoZXIgZmxvb3Jcbi8vIEFMU08sIHdlIGRvbid0IGhhdmUgYSByZWYgdG8gdGhlIHRpbGVzZXQgcmlnaHQgbm93LCBkb24ndCBldmVuXG4vLyBrbm93IHdoYXQgdGhlIHRpbGVzIGFyZSEgIE5lZWQgdG8gbWFwIHRoZSAzeDMgZ3JpZCBvZiAoPz8pIHRvXG4vLyBtZXRhdGlsZXMuXG4vLyAgLSBjb25zaWRlciB1cGRhdGluZyBcImVkZ2VcIiB0byBiZSB3aG9sZSA5eDk/XG4vLyAgICAgJyBjIC9jY2MvICAgJ1xuLy8gICAgIGNhdmUoJ2NjIGMnLCAnYycpXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHwgYyB8XG4vLyAgICAgICB8Y2NjfFxuLy8gICAgICAgfCAgIHxgLFxuLy9cbi8vICAgICB0aWxlYFxuLy8gICAgICAgfCAgIHxcbi8vICAgICAgIHxjdSB8XG4vLyAgICAgICB8ICAgfGAsXG4vL1xuLy8gQmFzaWMgaWRlYSB3b3VsZCBiZSB0byBzaW1wbGlmeSB0aGUgXCJmZWF0dXJlc1wiIGJpdCBxdWl0ZSBhIGJpdCxcbi8vIGFuZCBlbmNhcHN1bGF0ZSB0aGUgd2hvbGUgdGhpbmcgaW50byB0aGUgdGlsZSAtIGVkZ2VzLCBjb3JuZXJzLCBjZW50ZXIuXG4vL1xuLy8gRm9yIG92ZXJ3b3JsZCwgJ28nIG1lYW5zIG9wZW4sICdnJyBmb3IgZ3Jhc3MsIGV0Yy4uLj9cbi8vIC0gdGhlbiB0aGUgbGV0dGVycyBhcmUgYWx3YXlzIHRoZSB3YWxrYWJsZSB0aWxlcywgd2hpY2ggbWFrZXMgc2Vuc2Vcbi8vICAgc2luY2UgdGhvc2UgYXJlIHRoZSBvbmVzIHRoYXQgaGF2ZSBhbGwgdGhlIHZhcmlldHkuXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHxvbyB8XG4vLyAgICAgICB8b28gfFxuLy8gICAgICAgfCAgIHxgLFxuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8b28gfFxuLy8gICAgICAgfG9vb3xcbi8vICAgICAgIHxvZ298YCxcblxuLy8gZXhwb3J0IGNsYXNzIENhdmVTaHVmZmxlQXR0ZW1wdCBleHRlbmRzIE1hemVTaHVmZmxlQXR0ZW1wdCB7XG5cbi8vICAgcmVhZG9ubHkgdGlsZXNldDogTWV0YXRpbGVzZXQ7XG4vLyAgIHJlYWRvbmx5IGdyaWQ6IEdyaWQ8c3RyaW5nPjtcbi8vICAgcmVhZG9ubHkgZml4ZWQgPSBuZXcgU2V0PEdyaWRDb29yZD4oKTtcbi8vICAgcmVhZG9ubHkgc2NyZWVuczogcmVhZG9ubHkgR3JpZENvb3JkW10gPSBbXTtcbi8vICAgbWV0YSE6IE1ldGFsb2NhdGlvbjtcbi8vICAgY291bnQgPSAwO1xuLy8gICB3YWxscyA9IDA7XG4vLyAgIGJyaWRnZXMgPSAwO1xuLy8gICBtYXhQYXJ0aXRpb25zID0gMTtcbi8vICAgbWluU3Bpa2VzID0gMjtcblxuLy8gICBjb25zdHJ1Y3RvcihyZWFkb25seSBoOiBudW1iZXIsIHJlYWRvbmx5IHc6IG51bWJlcixcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgcGFyYW1zOiBTdXJ2ZXksIHJlYWRvbmx5IHJhbmRvbTogUmFuZG9tKSB7XG4vLyAgICAgc3VwZXIoKTtcbi8vICAgICB0aGlzLmdyaWQgPSBuZXcgR3JpZChoLCB3KTtcbi8vICAgICB0aGlzLmdyaWQuZGF0YS5maWxsKCcnKTtcbi8vICAgICBmb3IgKGxldCB5ID0gMC41OyB5IDwgaDsgeSsrKSB7XG4vLyAgICAgICBmb3IgKGxldCB4ID0gMC41OyB4IDwgdzsgeCsrKSB7XG4vLyAgICAgICAgIGlmICh5ID4gMSkgdGhpcy5ncmlkLnNldDIoeSAtIDAuNSwgeCwgJ2MnKTtcbi8vICAgICAgICAgaWYgKHggPiAxKSB0aGlzLmdyaWQuc2V0Mih5LCB4IC0gMC41LCAnYycpO1xuLy8gICAgICAgICB0aGlzLmdyaWQuc2V0Mih5LCB4LCAnYycpO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgICB0aGlzLmNvdW50ID0gaCAqIHc7XG4vLyAgICAgY29uc3Qgc2NyZWVuczogR3JpZENvb3JkW10gPSBbXTtcbi8vICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaDsgeSsrKSB7XG4vLyAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMudzsgeCsrKSB7XG4vLyAgICAgICAgIHNjcmVlbnMucHVzaCgoeSA8PCAxMiB8IHggPDwgNCkgYXMgR3JpZENvb3JkKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgdGhpcy5zY3JlZW5zID0gc2NyZWVucztcbi8vICAgfVxuXG5cbiAgLy8gY2hlY2tSZWFjaGFiaWxpdHkocmVwbGFjZT86IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4pOiBib29sZWFuIHtcbiAgLy8gICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgLy8gfVxuXG5cbmV4cG9ydCBjbGFzcyBXaWRlQ2F2ZVNodWZmbGUgZXh0ZW5kcyBDYXZlU2h1ZmZsZSB7XG4gIGluaXRpYWxGaWxsVHlwZSA9ICd3JztcbiAgdXBFZGdlVHlwZSA9ICduJztcbiAgc2V0VXBFZGdlVHlwZSh0OiBzdHJpbmcpOiB0aGlzIHtcbiAgICB0aGlzLnVwRWRnZVR5cGUgPSB0O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIGlzRWxpZ2libGVBcmVuYShtaWRkbGU6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIC8vIEFyZW5hcyBjYW4gb25seSBiZSBwbGFjZWQgaW4gdGhlIHRvcCByb3dcbiAgICByZXR1cm4gIShtaWRkbGUgJiAweGYwMDApICYmIHN1cGVyLmlzRWxpZ2libGVBcmVuYShtaWRkbGUpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDcnlwdEVudHJhbmNlU2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcbiAgcmVmaW5lTWV0YXNjcmVlbnMobWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBjaGFuZ2UgYXJlbmEgaW50byBjcnlwdCBhcmVuYVxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53OyB4KyspIHtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoKHkgPDwgMTIgfCB4IDw8IDQgfCAweDgwOCkgYXMgR3JpZENvb3JkKSA9PT0gJ2EnKSB7XG4gICAgICAgICAgbWV0YS5zZXQoeSA8PCA0IHwgeCwgbWV0YS5yb20ubWV0YXNjcmVlbnMuY3J5cHRBcmVuYV9zdGF0dWVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXIucmVmaW5lTWV0YXNjcmVlbnMobWV0YSk7XG4gIH1cblxuICBpc0VsaWdpYmxlQXJlbmEoYzogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICF0aGlzLmdyaWQuZ2V0KGMgLSAweDgwMCBhcyBHcmlkQ29vcmQpICYmIHN1cGVyLmlzRWxpZ2libGVBcmVuYShjKTtcbiAgfVxufVxuXG5jb25zdCBUSUxFRElSID0gWzEsIDMsIDcsIDVdO1xuY29uc3QgR1JJRERJUiA9IFstMHg4MDAsIC04LCAweDgwMCwgOF07XG5cbi8vIFRoaXMgbWlnaHQgY292ZXIgYWxsIG9mIHRyeUV4dHJ1ZGUsIHRyeUNvbnRpbnVlRXh0cnVkZSwgdHJ5Q29ubmVjdFxuLy8gIC0gY291bGQgYWxzbyBmaW5kIGEgd2F5IHRvIGFkZCB0cnlBZGRMb29wP1xuaW50ZXJmYWNlIEFkZE9wdHMge1xuICBjaGFyPzogc3RyaW5nO1xuICAvLyBsZW5ndGg6IG51bWJlcjtcbiAgc3RhcnQ/OiBHcmlkQ29vcmQ7XG4gIC8vIGVuZDogR3JpZENvb3JkO1xuICBsb29wPzogYm9vbGVhbjsgLy8gYWxsb3cgdnMgcmVxdWlyZT9cblxuICBhdHRlbXB0cz86IG51bWJlcjtcblxuICAvLyBicmFuY2g6IGJvb2xlYW47XG4gIC8vIHJlZHVjZVBhcnRpdGlvbnM6IGJvb2xlYW47ICAtLSBvciBwcm92aWRlIGEgXCJzbWFydCBwaWNrIHN0YXJ0L2VuZFwiIHdyYXBwZXJcblxuICAvLyBUT0RPIC0gc29tZSBpZGVhIG9mIHdoZXRoZXIgdG8gcHJlZmVyIGV4dGVuZGluZyBhbiBleGlzdGluZ1xuICAvLyBkZWFkIGVuZCBvciBub3QgLSB0aGlzIHdvdWxkIHByb3ZpZGUgc29tZSBzb3J0IG9mIFwiYnJhbmNoaW5nIGZhY3RvclwiXG4gIC8vIHdoZXJlYnkgd2UgY2FuIHRpZ2h0bHkgY29udHJvbCBob3cgbWFueSBkZWFkIGVuZHMgd2UgZ2V0Li4uP1xuICAvLyBQcm92aWRlIGEgXCJmaW5kIGRlYWQgZW5kc1wiIGZ1bmN0aW9uP1xuICAvLyAgIC0gaW1hZ2luZSBhIHZlcnNpb24gb2Ygd2luZG1pbGwgY2F2ZSB3aGVyZSB3ZSB3YW5kZXIgdHdvIHNjcmVlbnMsXG4gIC8vICAgICB0aGVuIGNvbm5lY3QgdGhlIGRlYWQgZW5kcywgdGhlbiBicmFuY2ggYW5kIHdhbmRlciBhIGxpdHRsZSBtb3JlP1xufVxuXG4vLyBUT0RPIC0gcG90ZW50aWFsbHkgd2UgY291bGQgbG9vayBhdCB0aGUgd2hvbGUgcHJvYmxlbVxuLy8gYXMgbWFraW5nIGEgbGlzdCBvZiBleHRydWRlL2ZlYXR1cmUgdHlwZXM6XG4vLyAgIC0gciwgYywgYnJhbmNoLCBhcmVuYSwgYnJpZGdlLCBzdGFpciwgLi4uP1xuLy8gbnVjbGVhdGUgdy8gYW55IGVkZ2VzLCBoYXZlIGEgbGlzdCBvZiB0aGVzZSBvcGVyYXRpb25zIGFuZCB0aGVuXG4vLyB0cnkgZWFjaCBvbmUsIGlmIGl0IGRvZXNuJ3Qgd29yaywgcmVzaHVmZmxlIGl0IGxhdGVyIChmaXhlZCAjIG9mIGRyYXdzXG4vLyBiZWZvcmUgZ2l2aW5nIHVwKS5cbiJdfQ==