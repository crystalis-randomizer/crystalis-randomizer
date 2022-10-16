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
    addEdges() {
        var _a;
        const g = this.grid;
        const result = super.addEdges();
        if (!result.ok)
            return result;
        let arenas = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.arena;
        if (!arenas)
            return OK;
        const edges = [];
        for (let x = 0; x < this.w; x++) {
            const c = (x << 4 | 0x808);
            if (g.get(c - 0x800))
                edges.push(c);
        }
        if (edges.length < arenas) {
            return { ok: false, fail: `not enough edges\n${g.show()}` };
        }
        for (const edge of this.random.ishuffle(edges)) {
            if (!arenas)
                break;
            const left = (edge - 8);
            const left2 = (left - 8);
            const left3 = (left2 - 8);
            const left2Up = (left2 - 0x800);
            const left2Down = (left2 + 0x800);
            const right = (edge + 8);
            const right2 = (right + 8);
            const right3 = (right2 + 8);
            const right2Up = (right2 - 0x800);
            const right2Down = (right2 + 0x800);
            if (!g.isBorder(left)) {
                if (g.isBorder(left3) && g.get(left3))
                    continue;
                if (g.isBorder(left2Up) && g.get(left2Up))
                    continue;
                if (g.isBorder(left2Down) && g.get(left2Down))
                    continue;
            }
            if (!g.isBorder(right)) {
                if (g.isBorder(right3) && g.get(right3))
                    continue;
                if (g.isBorder(right2Up) && g.get(right2Up))
                    continue;
                if (g.isBorder(right2Down) && g.get(right2Down))
                    continue;
            }
            this.fixed.add(edge);
            g.set(edge, 'a');
            g.set(left, '');
            g.set(left2, '');
            g.set(right, '');
            g.set(right2, '');
            this.grid.set(edge, 'a');
            arenas--;
        }
        return OK;
    }
    addArenas() {
        return true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUF3QixDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFMUMsT0FBTyxFQUFFLFlBQVksRUFBTyxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxFQUFFLEVBQWtCLE1BQU0saUJBQWlCLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFeEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUVqQixNQUFNLE9BQU8sV0FBWSxTQUFRLG1CQUFtQjtJQUFwRDs7UUFHRSxrQkFBYSxHQUFHLENBQUMsQ0FBQztRQUNsQixjQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLGNBQVMsR0FBRyxJQUFJLENBQUM7UUFDakIsb0JBQWUsR0FBRyxHQUFHLENBQUM7UUFDdEIsZUFBVSxHQUFHLEdBQUcsQ0FBQztRQUNULDJCQUFzQixHQUFHLEtBQUssQ0FBQztRQUd2QyxXQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLFVBQUssR0FBRyxDQUFDLENBQUM7UUFDVixZQUFPLEdBQUcsQ0FBQyxDQUFDO0lBeXJDZCxDQUFDO0lBdnJDQyxLQUFLO1FBQ0gsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2QsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDaEIsSUFBSSxDQUFDLEtBQUss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QUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQWtCLENBQUMsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBHcmlkQ29vcmQsIEdyaWRJbmRleCwgRSwgUyB9IGZyb20gJy4vZ3JpZC5qcyc7XG5pbXBvcnQgeyBzZXEsIGhleCB9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7IE1ldGFzY3JlZW4gfSBmcm9tICcuLi9yb20vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQgeyBNZXRhbG9jYXRpb24sIFBvcyB9IGZyb20gJy4uL3JvbS9tZXRhbG9jYXRpb24uanMnO1xuaW1wb3J0IHsgQWJzdHJhY3RNYXplU2h1ZmZsZSwgT0ssIFJlc3VsdCwgU3VydmV5IH0gZnJvbSAnLi4vbWF6ZS9tYXplLmpzJztcbmltcG9ydCB7IFVuaW9uRmluZCB9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQgeyBEZWZhdWx0TWFwIH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbmV4cG9ydCBjbGFzcyBDYXZlU2h1ZmZsZSBleHRlbmRzIEFic3RyYWN0TWF6ZVNodWZmbGUge1xuXG4gIC8vIFNodWZmbGUgY29uZmlndXJhdGlvbi5cbiAgbWF4UGFydGl0aW9ucyA9IDE7XG4gIG1pblNwaWtlcyA9IDI7XG4gIG1heFNwaWtlcyA9IDU7XG4gIGxvb3NlUmVmaW5lID0gZmFsc2U7XG4gIGFkZEJsb2NrcyA9IHRydWU7XG4gIGluaXRpYWxGaWxsVHlwZSA9ICdjJztcbiAgdXBFZGdlVHlwZSA9ICdjJztcbiAgcHJpdmF0ZSBfcmVxdWlyZVBpdERlc3RpbmF0aW9uID0gZmFsc2U7XG5cbiAgLy8gRXh0cmEgYXR0ZW1wdCBzdGF0ZS5cbiAgcml2ZXJzID0gMDtcbiAgd2lkZXMgPSAwO1xuICB3YWxscyA9IDA7XG4gIGJyaWRnZXMgPSAwO1xuXG4gIHJlc2V0KCkge1xuICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgdGhpcy5yaXZlcnMgPSAwO1xuICAgIHRoaXMud2lkZXMgPSAwO1xuICAgIHRoaXMud2FsbHMgPSAwO1xuICAgIHRoaXMuYnJpZGdlcyA9IDA7XG4gIH1cblxuICByZXF1aXJlUGl0RGVzdGluYXRpb24oKTogdGhpcyB7XG4gICAgdGhpcy5fcmVxdWlyZVBpdERlc3RpbmF0aW9uID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNodWZmbGUobG9jOiBMb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgLy8gICBjb25zdCBtZXRhID0gbG9jLm1ldGE7XG4gIC8vICAgY29uc3Qgc3VydmV5ID0gdGhpcy5zdXJ2ZXkobWV0YSk7XG4gIC8vICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCAxMDA7IGF0dGVtcHQrKykge1xuICAvLyAgICAgY29uc3Qgd2lkdGggPVxuICAvLyAgICAgICAgIE1hdGgubWF4KDEsIE1hdGgubWluKDgsIGxvYy5tZXRhLndpZHRoICtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmZsb29yKChyYW5kb20ubmV4dEludCg2KSAtIDEpIC8gMykpKTtcbiAgLy8gICAgIGNvbnN0IGhlaWdodCA9XG4gIC8vICAgICAgICAgTWF0aC5tYXgoMSwgTWF0aC5taW4oMTYsIGxvYy5tZXRhLmhlaWdodCArXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigocmFuZG9tLm5leHRJbnQoNikgLSAxKSAvIDMpKSk7XG4gIC8vICAgICBjb25zdCBzaHVmZmxlID0gbmV3IENhdmVTaHVmZmxlQXR0ZW1wdChoZWlnaHQsIHdpZHRoLCBzdXJ2ZXksIHJhbmRvbSk7XG4gIC8vICAgICBjb25zdCByZXN1bHQgPSBzaHVmZmxlLmJ1aWxkKCk7XG4gIC8vICAgICBpZiAocmVzdWx0KSB7XG4gIC8vICAgICAgIGlmIChsb2MuaWQgPT09IDB4MzEpIGNvbnNvbGUuZXJyb3IoYFNodWZmbGUgZmFpbGVkOiAke3Jlc3VsdH1gKTtcbiAgLy8gICAgIH0gZWxzZSB7XG4gIC8vICAgICAgIHRoaXMuZmluaXNoKGxvYywgc2h1ZmZsZS5tZXRhLCByYW5kb20pO1xuICAvLyAgICAgICByZXR1cm47XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHRocm93IG5ldyBFcnJvcihgQ29tcGxldGVseSBmYWlsZWQgdG8gbWFwIHNodWZmbGUgJHtsb2N9YCk7XG4gIC8vIH1cblxuICBzdXJ2ZXkobWV0YTogTWV0YWxvY2F0aW9uKTogU3VydmV5IHtcbiAgICAvLyB0YWtlIGEgc3VydmV5LlxuICAgIGNvbnN0IHN1cnZleSA9IHtcbiAgICAgIG1ldGEsXG4gICAgICBpZDogbWV0YS5pZCxcbiAgICAgIHRpbGVzZXQ6IG1ldGEudGlsZXNldCxcbiAgICAgIHNpemU6IDAsXG4gICAgICBlZGdlczogWzAsIDAsIDAsIDBdLFxuICAgICAgc3RhaXJzOiBbMCwgMF0sXG4gICAgICBmZWF0dXJlczoge1xuICAgICAgICBhcmVuYTogMCxcbiAgICAgICAgYnJpZGdlOiAwLFxuICAgICAgICBvdmVyOiAwLFxuICAgICAgICBwaXQ6IDAsXG4gICAgICAgIHJhbXA6IDAsXG4gICAgICAgIHJpdmVyOiAwLFxuICAgICAgICBzcGlrZTogMCxcbiAgICAgICAgc3RhdHVlOiAwLFxuICAgICAgICB1bmRlcjogMCxcbiAgICAgICAgd2FsbDogMCxcbiAgICAgICAgd2lkZTogMCxcbiAgICAgIH0sXG4gICAgfTtcbiAgICBpZiAobWV0YS5pZCA+PSAwKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIG1ldGEucm9tLmxvY2F0aW9uc1ttZXRhLmlkXS5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLm1vbnN0ZXJJZCA9PT0gMHg4Zikge1xuICAgICAgICAgIHN1cnZleS5mZWF0dXJlcy5zdGF0dWUrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKCFzY3IuaXNFbXB0eSgpIHx8IHNjci5kYXRhLmV4aXRzPy5sZW5ndGgpIHN1cnZleS5zaXplKys7XG4gICAgICBmb3IgKGNvbnN0IGV4aXQgb2Ygc2NyLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgICAgY29uc3Qge3R5cGV9ID0gZXhpdDtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnRvcCcpIHtcbiAgICAgICAgICBpZiAoKHBvcyA+Pj4gNCkgPT09IDApIHN1cnZleS5lZGdlc1swXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdlZGdlOmxlZnQnKSB7XG4gICAgICAgICAgaWYgKChwb3MgJiAweGYpID09PSAwKSBzdXJ2ZXkuZWRnZXNbMV0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nKSB7XG4gICAgICAgICAgaWYgKChwb3MgPj4+IDQpID09PSBtZXRhLmhlaWdodCAtIDEpIHN1cnZleS5lZGdlc1syXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdlZGdlOnJpZ2h0Jykge1xuICAgICAgICAgIGlmICgocG9zICYgMHhmKSA9PT0gbWV0YS53aWR0aCAtIDEpIHN1cnZleS5lZGdlc1szXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdjcnlwdCcpIHtcbiAgICAgICAgICAvLyBzdGFpciBpcyBidWlsdCBpbnRvIGFyZW5hXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgICAgLy8gZG8gbm90aGluZy4uLlxuICAgICAgICB9IGVsc2UgaWYgKGV4aXQuZGlyICYgMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQmFkIGV4aXQgZGlyZWN0aW9uOiAke2V4aXQuZGlyfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1cnZleS5zdGFpcnNbZXhpdC5kaXIgPj4+IDFdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnYXJlbmEnKSkgc3VydmV5LmZlYXR1cmVzLmFyZW5hKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSBzdXJ2ZXkuZmVhdHVyZXMuYnJpZGdlKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ292ZXJwYXNzJykpIHN1cnZleS5mZWF0dXJlcy5vdmVyKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3BpdCcpKSBzdXJ2ZXkuZmVhdHVyZXMucGl0Kys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JhbXAnKSkgc3VydmV5LmZlYXR1cmVzLnJhbXArKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHN1cnZleS5mZWF0dXJlcy5zcGlrZSsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCd1bmRlcnBhc3MnKSkgc3VydmV5LmZlYXR1cmVzLnVuZGVyKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkgc3VydmV5LmZlYXR1cmVzLndhbGwrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncml2ZXInKSkgc3VydmV5LmZlYXR1cmVzLnJpdmVyKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3dpZGUnKSkgc3VydmV5LmZlYXR1cmVzLndpZGUrKztcbiAgICB9XG4gICAgaWYgKHN1cnZleS5zaXplIDwgMiAmJiAobWV0YS53aWR0aCA+IDEgfHwgbWV0YS5oZWlnaHQgPiAxKSkgc3VydmV5LnNpemUgPSAyO1xuICAgIHJldHVybiBzdXJ2ZXk7XG4gIH1cblxuICBidWlsZCgpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIHRoaXMuaW5pdCgpO1xuICAgIGxldCByZXN1bHQ6IFJlc3VsdDx2b2lkPjtcbiAgICAvL2NvbnN0IHIgPSB0aGlzLnJhbmRvbTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuZmlsbEdyaWQoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG5cbiAgICAvLyB0cnkgdG8gdHJhbnNsYXRlIHRvIG1ldGFzY3JlZW5zIGF0IHRoaXMgcG9pbnQuLi5cbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucHJlaW5mZXIoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuaW5mZXJTY3JlZW5zKCk7XG4gICAgaWYgKCFtZXRhLm9rKSByZXR1cm4gbWV0YTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucmVmaW5lTWV0YXNjcmVlbnMobWV0YS52YWx1ZSkpLCAhcmVzdWx0Lm9rKSB7XG4gICAgICAvL2NvbnNvbGUuZXJyb3IobWV0YS52YWx1ZS5zaG93KCkpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmNoZWNrTWV0YXNjcmVlbnMobWV0YS52YWx1ZSkpLCAhcmVzdWx0Lm9rKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBpZiAodGhpcy5fcmVxdWlyZVBpdERlc3RpbmF0aW9uICYmXG4gICAgICAgICF0aGlzLnJlcXVpcmVFbGlnaWJsZVBpdERlc3RpbmF0aW9uKG1ldGEudmFsdWUpKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYG5vIGVsaWdpYmxlIHBpdCBkZXN0aW5hdGlvbmB9O1xuICAgIH1cbiAgICB0aGlzLm1ldGEgPSBtZXRhLnZhbHVlO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGZpbGxHcmlkKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0PHZvaWQ+O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5pbml0aWFsRmlsbCgpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2lmICghdGhpcy5hZGRFYXJseUZlYXR1cmVzKCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkRWRnZXMoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmFkZEVhcmx5RmVhdHVyZXMoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgLy9jb25zb2xlLmxvZyhgcmVmaW5lOlxcbiR7dGhpcy5ncmlkLnNob3coKX1gKTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucmVmaW5lKCkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vY29uc29sZS5sb2coYHBvc3RyZWZpbmU6XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgIGlmICghdGhpcy5yZWZpbmVFZGdlcygpKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ3JlZmluZUVkZ2VzJ307XG4gICAgdGhpcy5yZW1vdmVTcHVycygpO1xuICAgIHRoaXMucmVtb3ZlVGlnaHRMb29wcygpO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRMYXRlRmVhdHVyZXMoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmFkZFN0YWlycyguLi4odGhpcy5wYXJhbXMuc3RhaXJzID8/IFtdKSkpLFxuICAgICAgICAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gQXR0ZW1wdCBtZXRob2RzXG5cbiAgaW5pdCgpIHt9XG5cbiAgLy8gSW5pdGlhbCBmaWxsLlxuICBpbml0aWFsRmlsbCgpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIHRoaXMuZmlsbENhdmUodGhpcy5pbml0aWFsRmlsbFR5cGUpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGZpbGxDYXZlKHM6IHN0cmluZykge1xuICAgIC8vIFRPRE8gLSBtb3ZlIHRvIE1hemVTaHVmZmxlLmZpbGw/XG4gICAgZm9yIChsZXQgeSA9IDAuNTsgeSA8IHRoaXMuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMC41OyB4IDwgdGhpcy53OyB4KyspIHtcbiAgICAgICAgaWYgKHkgPiAxKSB0aGlzLmdyaWQuc2V0Mih5IC0gMC41LCB4LCBzKTtcbiAgICAgICAgaWYgKHggPiAxKSB0aGlzLmdyaWQuc2V0Mih5LCB4IC0gMC41LCBzKTtcbiAgICAgICAgdGhpcy5ncmlkLnNldDIoeSwgeCwgcyk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuY291bnQgPSB0aGlzLmggKiB0aGlzLnc7XG4gIH1cblxuICAvLyBBZGQgZWRnZSBhbmQvb3Igc3RhaXIgZXhpdHNcbiAgYWRkRWRnZXMoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvL2xldCBhdHRlbXB0cyA9IDA7XG4gICAgaWYgKCF0aGlzLnBhcmFtcy5lZGdlcykgcmV0dXJuIE9LO1xuICAgIGZvciAobGV0IGRpciA9IDA7IGRpciA8IDQ7IGRpcisrKSB7XG4gICAgICBsZXQgY291bnQgPSB0aGlzLnBhcmFtcy5lZGdlc1tkaXJdIHx8IDA7XG4gICAgICBpZiAoIWNvdW50KSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGVkZ2VzID1cbiAgICAgICAgICBzZXEoZGlyICYgMSA/IHRoaXMuaCA6IHRoaXMudywgaSA9PiB0aGlzLmdyaWQuYm9yZGVyKGRpciwgaSkpO1xuICAgICAgZm9yIChjb25zdCBlZGdlIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGVkZ2VzKSkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKGBlZGdlOiAke2VkZ2UudG9TdHJpbmcoMTYpfSBjb3VudCAke2NvdW50fSBkaXIgJHtkaXJ9YCk7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGVkZ2UpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGRpciAmIDEpIHtcbiAgICAgICAgICBpZiAoZGlyID09PSAxKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGRMZWZ0RWRnZShlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkUmlnaHRFZGdlKGVkZ2UpKSBjb3VudC0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZGlyID09PSAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGRVcEVkZ2UoZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZERvd25FZGdlKGVkZ2UpKSBjb3VudC0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvdW50KSBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChjb3VudCkge1xuICAgICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGNhbid0IGZpdCBhbGwgZWRnZXMgc2h1ZmZsaW5nICR7dGhpcy5sb2NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cXG5taXNzaW5nICR7Y291bnR9ICR7ZGlyfWB9O1xuICAgICAgICAvL1xcbiR7dGhpcy5ncmlkLnNob3coKX1gfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiBhZGRVcEVkZ2UoZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgLy8gVXAgZWRnZXMgbXVzdCBhbHdheXMgYmUgYXJlbmEgc2NyZWVucywgc28gY3V0IG9mZiBib3RoXG4gICAgLy8gdGhlIEUtVyBlZGdlcyBBTkQgdGhlIG5laWdoYm9yaW5nIHNjcmVlbnMgYXMgd2VsbCAocHJvdmlkZWRcbiAgICAvLyB0aGVyZSBpcyBub3QgYWxzbyBhbiBleGl0IG5leHQgdG8gdGhlbSwgc2luY2UgdGhhdCB3b3VsZCBiZVxuICAgIC8vIGEgcHJvYmxlbS4gIChUaGVzZSBhcmUgcHJldHR5IGxpbWl0ZWQ6IHZhbXBpcmUgMSwgcHJpc29uLFxuICAgIC8vIHN0eHkgMSwgcHlyYW1pZCAxLCBjcnlwdCAyLCBkcmF5Z29uIDIpLlxuICAgIGNvbnN0IGJlbG93ID0gZWRnZSArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0ID0gYmVsb3cgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MiA9IGxlZnQgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MyA9IGxlZnQyIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSBiZWxvdyArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0MiA9IHJpZ2h0ICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQzID0gcmlnaHQyICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihsZWZ0KSkge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQobGVmdCkpIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoZWRnZSAtIDE2IGFzIEdyaWRDb29yZCkpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIobGVmdDMpICYmIHRoaXMuZ3JpZC5nZXQobGVmdDMpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIocmlnaHQpKSB7XG4gICAgICBpZiAodGhpcy5ncmlkLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoZWRnZSArIDE2IGFzIEdyaWRDb29yZCkpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIocmlnaHQzKSAmJiB0aGlzLmdyaWQuZ2V0KHJpZ2h0MykpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5maXhlZC5hZGQoZWRnZSk7XG4gICAgdGhpcy5ncmlkLnNldChlZGdlLCB0aGlzLnVwRWRnZVR5cGUpO1xuICAgIHRoaXMuZ3JpZC5zZXQobGVmdCwgJycpO1xuICAgIHRoaXMuZ3JpZC5zZXQocmlnaHQsICcnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZERvd25FZGdlKGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIC8vIGRvd24gZWRnZXMgbXVzdCBoYXZlIHN0cmFpZ2h0IE4tUyBzY3JlZW5zLCBzbyBjdXQgb2ZmXG4gICAgLy8gdGhlIEUtVyBlZGdlcyBuZXh0IHRvIHRoZW0uXG4gICAgY29uc3QgYWJvdmUgPSBlZGdlIC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQgPSBhYm92ZSAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gYWJvdmUgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBpZiAoIXRoaXMuZ3JpZC5nZXQoYWJvdmUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihsZWZ0KSAmJiB0aGlzLmdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihyaWdodCkgJiYgdGhpcy5ncmlkLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICB0aGlzLmZpeGVkLmFkZChlZGdlKTtcbiAgICB0aGlzLmdyaWQuc2V0KGVkZ2UsICduJyk7XG4gICAgdGhpcy5ncmlkLnNldChsZWZ0LCAnJyk7XG4gICAgdGhpcy5ncmlkLnNldChyaWdodCwgJycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkTGVmdEVkZ2UoZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcmlnaHQgPSBlZGdlICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHRVcCA9IHJpZ2h0IC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0RG93biA9IHJpZ2h0ICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuLy9jb25zb2xlLmxvZyhgYWRkTGVmdCAke2hleChlZGdlKX0gcmlnaHQgJHtoZXgocmlnaHQpfToke3RoaXMuZ3JpZC5nZXQocmlnaHQpfSBydSAke2hleChyaWdodFVwKX06JHt0aGlzLmdyaWQuaXNCb3JkZXIocmlnaHRVcCl9OiR7dGhpcy5ncmlkLmdldChyaWdodFVwKX0gcmQgJHtoZXgocmlnaHREb3duKX06JHt0aGlzLmdyaWQuaXNCb3JkZXIocmlnaHREb3duKX06JHt0aGlzLmdyaWQuZ2V0KHJpZ2h0RG93bil9YCk7XG4gICAgaWYgKCF0aGlzLmdyaWQuZ2V0KHJpZ2h0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIocmlnaHRVcCkgJiYgdGhpcy5ncmlkLmdldChyaWdodFVwKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIocmlnaHREb3duKSAmJiB0aGlzLmdyaWQuZ2V0KHJpZ2h0RG93bikpIHJldHVybiBmYWxzZTtcbiAgICB0aGlzLmZpeGVkLmFkZChlZGdlKTtcbiAgICB0aGlzLmdyaWQuc2V0KGVkZ2UsICdjJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRSaWdodEVkZ2UoZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVmdCA9IGVkZ2UgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0VXAgPSBsZWZ0IC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnREb3duID0gbGVmdCArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBpZiAoIXRoaXMuZ3JpZC5nZXQobGVmdCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKGxlZnRVcCkgJiYgdGhpcy5ncmlkLmdldChsZWZ0VXApKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihsZWZ0RG93bikgJiYgdGhpcy5ncmlkLmdldChsZWZ0RG93bikpIHJldHVybiBmYWxzZTtcbiAgICB0aGlzLmZpeGVkLmFkZChlZGdlKTtcbiAgICB0aGlzLmdyaWQuc2V0KGVkZ2UsICdjJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBhZGRBcmVuYXNFYXJseSgpOiBib29sZWFuIHtcbiAgLy8gICAvLyBTcGVjaWZpY2FsbHksIGp1c3QgYXJlbmFzLi4uXG4gIC8vICAgbGV0IGFyZW5hcyA9IHRoaXMucGFyYW1zLmZlYXR1cmVzPy5hcmVuYTtcbiAgLy8gICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gIC8vICAgY29uc3QgZyA9IHRoaXMuZ3JpZDtcbiAgLy8gICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoZy5zY3JlZW5zKCkpKSB7XG4gIC8vICAgICBpZiAoYyAmIDB4ZjAwMCkgY29udGludWU7XG4gIC8vICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0ID0gKG1pZGRsZSAtIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQyID0gKGxlZnQgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MyA9IChsZWZ0MiAtIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQyVXAgPSAobGVmdDIgLSAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDJEb3duID0gKGxlZnQyICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0ID0gKG1pZGRsZSArIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0MiA9IChyaWdodCArIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0MyA9IChyaWdodDIgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDJVcCA9IChyaWdodDIgLSAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQyRG93biA9IChyaWdodDIgKyAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgaWYgKCFnLmlzQm9yZGVyKGxlZnQpKSB7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKGxlZnQzKSAmJiBnLmdldChsZWZ0MykpIGNvbnRpbnVlO1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihsZWZ0MlVwKSAmJiBnLmdldChsZWZ0MlVwKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKGxlZnQyRG93bikgJiYgZy5nZXQobGVmdDJEb3duKSkgY29udGludWU7XG4gIC8vICAgICB9XG4gIC8vICAgICBpZiAoIWcuaXNCb3JkZXIocmlnaHQpKSB7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKHJpZ2h0MykgJiYgZy5nZXQocmlnaHQzKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKHJpZ2h0MlVwKSAmJiBnLmdldChyaWdodDJVcCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihyaWdodDJEb3duKSAmJiBnLmdldChyaWdodDJEb3duKSkgY29udGludWU7XG4gIC8vICAgICB9XG4gIC8vICAgICB0aGlzLmZpeGVkLmFkZChtaWRkbGUpO1xuICAvLyAgICAgZy5zZXQobWlkZGxlLCAnYScpO1xuICAvLyAgICAgZy5zZXQobGVmdCwgJycpO1xuICAvLyAgICAgZy5zZXQobGVmdDIsICcnKTtcbiAgLy8gICAgIGcuc2V0KHJpZ2h0LCAnJyk7XG4gIC8vICAgICBnLnNldChyaWdodDIsICcnKTtcbiAgLy8gICAgIGFyZW5hcy0tO1xuICAvLyAgICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gZmFsc2U7XG4gIC8vIH1cblxuICBhZGRFYXJseUZlYXR1cmVzKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmFkZFNwaWtlcyh0aGlzLnBhcmFtcy5mZWF0dXJlcz8uc3Bpa2UgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgYWRkIHNwaWtlc1xcbiR7dGhpcy5ncmlkLnNob3coKX1gfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFkZE92ZXJwYXNzZXModGhpcy5wYXJhbXMuZmVhdHVyZXM/Lm92ZXIgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkIG92ZXJwYXNzZXMnfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgYWRkTGF0ZUZlYXR1cmVzKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmFkZEFyZW5hcyh0aGlzLnBhcmFtcy5mZWF0dXJlcz8uYXJlbmEgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgYWRkQXJlbmFzXFxuJHt0aGlzLmdyaWQuc2hvdygpfWB9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkVW5kZXJwYXNzZXModGhpcy5wYXJhbXMuZmVhdHVyZXM/LnVuZGVyID8/IDApKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ2FkZFVuZGVycGFzc2VzJ307XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRQaXRzKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5waXQgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkUGl0cyd9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkUmFtcHModGhpcy5wYXJhbXMuZmVhdHVyZXM/LnJhbXAgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkUmFtcHMnfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgYWRkQXJlbmFzKGFyZW5hczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGcgPSB0aGlzLmdyaWQ7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoIXRoaXMuaXNFbGlnaWJsZUFyZW5hKG1pZGRsZSkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIGMpO1xuICAgICAgY29uc3QgYXJlbmFUaWxlID0gdGlsZS5zdWJzdHJpbmcoMCwgNCkgKyAnYScgKyB0aWxlLnN1YnN0cmluZyg1KTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKGFyZW5hVGlsZSk7XG4gICAgICBpZiAoIW9wdGlvbnMubGVuZ3RoKSB7Y29uc29sZS5sb2coYG5vIHRpbGUgJHthcmVuYVRpbGV9YCk7IGNvbnRpbnVlO31cbiAgICAgIHRoaXMuZml4ZWQuYWRkKG1pZGRsZSk7XG4gICAgICBnLnNldChtaWRkbGUsICdhJyk7XG4gICAgICAvLyBnLnNldChsZWZ0LCAnJyk7XG4gICAgICAvLyBnLnNldChsZWZ0MiwgJycpO1xuICAgICAgLy8gZy5zZXQocmlnaHQsICcnKTtcbiAgICAgIC8vIGcuc2V0KHJpZ2h0MiwgJycpO1xuICAgICAgYXJlbmFzLS07XG4gICAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vY29uc29sZS5lcnJvcignY291bGQgbm90IGFkZCBhcmVuYScpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzRWxpZ2libGVBcmVuYShtaWRkbGU6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGcgPSB0aGlzLmdyaWQ7XG4gICAgY29uc3QgbGVmdCA9IChtaWRkbGUgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdDIgPSAobGVmdCAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IChtaWRkbGUgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQyID0gKHJpZ2h0ICsgOCkgYXMgR3JpZENvb3JkO1xuICAgIGlmIChnLmdldChtaWRkbGUpICE9PSAnYycgJiYgZy5nZXQobWlkZGxlKSAhPT0gJ3cnKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGcuZ2V0KGxlZnQpIHx8IGcuZ2V0KHJpZ2h0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghZy5pc0JvcmRlcihsZWZ0KSAmJiBnLmdldChsZWZ0MikpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIWcuaXNCb3JkZXIocmlnaHQpICYmIGcuZ2V0KHJpZ2h0MikpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZFVuZGVycGFzc2VzKHVuZGVyOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAvLyBPbmx5IGFkZCBob3Jpem9udGFsICcgICB8Y2JjfCAgICcsIG5vdCAnIGMgfCBiIHwgYyAnLiAgQ291bGQgcG9zc2libHlcbiAgICAvLyB1c2UgJ2InIGFuZCAnQicgaW5zdGVhZD9cbiAgICByZXR1cm4gdGhpcy5hZGRTdHJhaWdodFNjcmVlbkxhdGUodW5kZXIsICdiJywgMHg4MDApO1xuICB9XG5cbiAgYWRkT3ZlcnBhc3NlcyhvdmVyOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlIChvdmVyKSB7XG4gICAgICBjb25zdCB5ID0gdGhpcy5yYW5kb20ubmV4dEludCh0aGlzLmggLSAyKSArIDE7XG4gICAgICBjb25zdCB4ID0gdGhpcy5yYW5kb20ubmV4dEludCh0aGlzLncgLSAyKSArIDE7XG4gICAgICBjb25zdCBjID0gKHkgPDwgMTIgfCB4IDw8IDQgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoYykgIT09ICdjJykge1xuICAgICAgICBpZiAoKythdHRlbXB0cyA+IDEwKSB0aHJvdyBuZXcgRXJyb3IoJ0JhZCBhdHRlbXB0cycpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZ3JpZC5zZXQoYywgJ2InKTtcbiAgICAgIHRoaXMuZml4ZWQuYWRkKGMpO1xuICAgICAgdGhpcy5ncmlkLnNldChjIC0gOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAgIHRoaXMuZ3JpZC5zZXQoYyArIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgICBvdmVyLS07XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkUGl0cyhwaXRzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5hZGRTdHJhaWdodFNjcmVlbkxhdGUocGl0cywgJ3AnKTtcbiAgfVxuXG4gIGFkZFJhbXBzKHJhbXBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5hZGRTdHJhaWdodFNjcmVlbkxhdGUocmFtcHMsICcvJywgOCk7XG4gIH1cblxuICAvKiogQHBhcmFtIGRlbHRhIEdyaWRDb29yZCBkaWZmZXJlbmNlIGZvciBlZGdlcyB0aGF0IG5lZWQgdG8gYmUgZW1wdHkuICovXG4gIGFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShjb3VudDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhcjogc3RyaW5nLCBkZWx0YT86IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICghY291bnQpIHJldHVybiB0cnVlO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgY29uc3QgbWlkZGxlID0gKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQobWlkZGxlKSAhPT0gJ2MnKSBjb250aW51ZTtcbiAgICAgIGlmIChkZWx0YSkge1xuICAgICAgICBjb25zdCBzaWRlMSA9IChtaWRkbGUgLSBkZWx0YSkgYXMgR3JpZENvb3JkO1xuICAgICAgICBjb25zdCBzaWRlMiA9IChtaWRkbGUgKyBkZWx0YSkgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAodGhpcy5ncmlkLmdldChzaWRlMSkgfHwgdGhpcy5ncmlkLmdldChzaWRlMikpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIGMpO1xuICAgICAgY29uc3QgbmV3VGlsZSA9IHRpbGUuc3Vic3RyaW5nKDAsIDQpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcobmV3VGlsZSk7XG4gICAgICBpZiAoIW9wdGlvbnMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIC8vIFRPRE8gLSByZXR1cm4gZmFsc2UgaWYgbm90IG9uIGEgY3JpdGljYWwgcGF0aD8/P1xuICAgICAgLy8gICAgICAtIGJ1dCBQT0kgYXJlbid0IHBsYWNlZCB5ZXQuXG4gICAgICB0aGlzLmZpeGVkLmFkZChtaWRkbGUpO1xuICAgICAgdGhpcy5ncmlkLnNldChtaWRkbGUsIGNoYXIpO1xuICAgICAgY291bnQtLTtcbiAgICAgIGlmICghY291bnQpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvL2NvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCBhZGQgcmFtcCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFkZFNwaWtlcyhzcGlrZXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICghc3Bpa2VzKSByZXR1cm4gdHJ1ZTtcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlIChzcGlrZXMgPiAwKSB7XG4gICAgICBpZiAoKythdHRlbXB0cyA+IDIwKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgIC8vIFRPRE8gLSB0cnkgdG8gYmUgc21hcnRlciBhYm91dCBzcGlrZXNcbiAgICAgIC8vICAtIGlmIHRvdGFsID4gMiB0aGVuIHVzZSBtaW4odG90YWwsIGgqLjYsID8/KSBhcyBsZW5cbiAgICAgIC8vICAtIGlmIGxlbiA+IDIgYW5kIHcgPiAzLCBhdm9pZCBwdXR0aW5nIHNwaWtlcyBvbiBlZGdlP1xuICAgICAgbGV0IGxlbiA9IE1hdGgubWluKHNwaWtlcywgTWF0aC5mbG9vcih0aGlzLmggKiAwLjYpLCB0aGlzLm1heFNwaWtlcyk7XG4gICAgICB3aGlsZSAobGVuIDwgc3Bpa2VzIC0gMSAmJiBsZW4gPiB0aGlzLm1pblNwaWtlcykge1xuICAgICAgICBpZiAodGhpcy5yYW5kb20ubmV4dCgpIDwgMC4yKSBsZW4tLTtcbiAgICAgIH1cbiAgICAgIC8vaWYgKGxlbiA9PT0gc3Bpa2VzIC0gMSkgbGVuKys7XG4gICAgICBjb25zdCB4ID1cbiAgICAgICAgICAobGVuID4gMiAmJiB0aGlzLncgPiAzKSA/IHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy53IC0gMikgKyAxIDpcbiAgICAgICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMudyk7XG4gICAgICAvLyBjb25zdCByID1cbiAgICAgIC8vICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KE1hdGgubWluKHRoaXMuaCAtIDIsIHNwaWtlcykgLSB0aGlzLm1pblNwaWtlcyk7XG4gICAgICAvLyBsZXQgbGVuID0gdGhpcy5taW5TcGlrZXMgKyByO1xuICAgICAgaWYgKGxlbiA+IHNwaWtlcyAtIHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgIGlmIChsZW4gPj0gdGhpcy5oIC0gMikgeyAvLyAmJiBsZW4gPiB0aGlzLm1pblNwaWtlcykge1xuICAgICAgICAgIGxlbiA9IHRoaXMuaCAtIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGVuID0gc3Bpa2VzOyAvLyA/Pz8gaXMgdGhpcyBldmVuIHZhbGlkID8/P1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCB5MCA9IHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy5oIC0gbGVuIC0gMikgKyAxO1xuICAgICAgY29uc3QgdDAgPSB5MCA8PCAxMiB8IHggPDwgNCB8IDB4ODA4O1xuICAgICAgY29uc3QgdDEgPSB0MCArICgobGVuIC0gMSkgPDwgMTIpO1xuICAgICAgZm9yIChsZXQgdCA9IHQwIC0gMHgxMDAwOyBsZW4gJiYgdCA8PSB0MSArIDB4MTAwMDsgdCArPSAweDgwMCkge1xuICAgICAgICBpZiAodGhpcy5ncmlkLmdldCh0IGFzIEdyaWRDb29yZCkgIT09ICdjJykgbGVuID0gMDtcbiAgICAgIH1cbiAgICAgIGlmICghbGVuKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNsZWFyZWQgPSBbdDAgLSA4LCB0MCArIDgsIHQxIC0gOCwgdDEgKyA4XSBhcyBHcmlkQ29vcmRbXTtcbiAgICAgIGNvbnN0IG9ycGhhbmVkID0gdGhpcy50cnlDbGVhcihjbGVhcmVkKTtcbiAgICAgIGlmICghb3JwaGFuZWQubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgYyBvZiBvcnBoYW5lZCkge1xuICAgICAgICB0aGlzLmdyaWQuc2V0KGMsICcnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZml4ZWQuYWRkKCh0MCAtIDB4ODAwKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgdGhpcy5maXhlZC5hZGQoKHQwIC0gMHgxMDAwKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgdGhpcy5maXhlZC5hZGQoKHQxICsgMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgICB0aGlzLmZpeGVkLmFkZCgodDEgKyAweDEwMDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBmb3IgKGxldCB0ID0gdDA7IHQgPD0gdDE7IHQgKz0gMHg4MDApIHtcbiAgICAgICAgdGhpcy5maXhlZC5hZGQodCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICB0aGlzLmdyaWQuc2V0KHQgYXMgR3JpZENvb3JkLCAncycpO1xuICAgICAgfVxuICAgICAgc3Bpa2VzIC09IGxlbjtcbiAgICAgIGF0dGVtcHRzID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHNwaWtlcyA9PT0gMDtcbiAgfVxuXG4gIGNhblJlbW92ZShjOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBOb3RhYmx5LCBleGNsdWRlIHN0YWlycywgbmFycm93IGVkZ2VzLCBhcmVuYXMsIGV0Yy5cbiAgICByZXR1cm4gYyA9PT0gdGhpcy5pbml0aWFsRmlsbFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogRG9lcyBhIHRyYXZlcnNhbCB3aXRoIHRoZSBnaXZlbiBjb29yZGluYXRlKHMpIGNsZWFyZWQsIGFuZCByZXR1cm5zXG4gICAqIGFuIGFycmF5IG9mIGNvb3JkaW5hdGVzIHRoYXQgd291bGQgYmUgY3V0IG9mZiAoaW5jbHVkaW5nIHRoZSBjbGVhcmVkXG4gICAqIGNvb3JkaW5hdGVzKS4gIElmIGNsZWFyaW5nIHdvdWxkIGNyZWF0ZSBtb3JlIHRoYW4gdGhlIGFsbG93ZWQgbnVtYmVyXG4gICAqIG9mIHBhcnRpdGlvbnMgKHVzdWFsbHkgMSksIHRoZW4gcmV0dXJucyBhbiBlbXB0eSBhcnJheSB0byBzaWduaWZ5XG4gICAqIHRoYXQgdGhlIGNsZWFyIGlzIG5vdCBhbGxvd2VkLlxuICAgKi9cbiAgdHJ5Q2xlYXIoY29vcmRzOiBHcmlkQ29vcmRbXSk6IEdyaWRDb29yZFtdIHtcbiAgICBjb25zdCByZXBsYWNlID0gbmV3IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGMgb2YgY29vcmRzKSB7XG4gICAgICBpZiAodGhpcy5maXhlZC5oYXMoYykpIHJldHVybiBbXTtcbiAgICAgIHJlcGxhY2Uuc2V0KGMsICcnKTtcbiAgICB9XG4gICAgY29uc3QgcGFydHMgPSB0aGlzLmdyaWQucGFydGl0aW9uKHJlcGxhY2UpO1xuICAgIC8vIENoZWNrIHNpbXBsZSBjYXNlIGZpcnN0IC0gb25seSBvbmUgcGFydGl0aW9uXG4gICAgY29uc3QgW2ZpcnN0XSA9IHBhcnRzLnZhbHVlcygpO1xuICAgIGlmIChmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplKSB7IC8vIGEgc2luZ2xlIHBhcnRpdGlvblxuICAgICAgcmV0dXJuIFsuLi5jb29yZHNdO1xuICAgIH1cbiAgICAvLyBNb3JlIGNvbXBsZXggY2FzZSAtIG5lZWQgdG8gc2VlIHdoYXQgd2UgYWN0dWFsbHkgaGF2ZSxcbiAgICAvLyBzZWUgaWYgYW55dGhpbmcgZ290IGN1dCBvZmYuXG4gICAgY29uc3QgY29ubmVjdGVkID0gbmV3IFNldDxTZXQ8R3JpZENvb3JkPj4oKTtcbiAgICBjb25zdCBhbGxQYXJ0cyA9IG5ldyBTZXQ8U2V0PEdyaWRDb29yZD4+KHBhcnRzLnZhbHVlcygpKTtcbiAgICBmb3IgKGNvbnN0IGZpeGVkIG9mIHRoaXMuZml4ZWQpIHtcbiAgICAgIGNvbm5lY3RlZC5hZGQocGFydHMuZ2V0KGZpeGVkKSEpO1xuICAgIH1cbiAgICBpZiAoY29ubmVjdGVkLnNpemUgPiB0aGlzLm1heFBhcnRpdGlvbnMpIHJldHVybiBbXTsgLy8gbm8gZ29vZFxuICAgIGNvbnN0IG9ycGhhbmVkID0gWy4uLmNvb3Jkc107XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIGFsbFBhcnRzKSB7XG4gICAgICBpZiAoY29ubmVjdGVkLmhhcyhwYXJ0KSkgY29udGludWU7XG4gICAgICBvcnBoYW5lZC5wdXNoKC4uLnBhcnQpO1xuICAgIH1cbiAgICByZXR1cm4gb3JwaGFuZWQ7XG4gIH1cblxuICByZWZpbmUoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBsZXQgZmlsbGVkID0gbmV3IFNldDxHcmlkQ29vcmQ+KCk7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgR3JpZEluZGV4OyBpIDwgdGhpcy5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZGF0YVtpXSkgZmlsbGVkLmFkZCh0aGlzLmdyaWQuY29vcmQoaSkpO1xuICAgIH1cbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlICh0aGlzLmNvdW50ID4gdGhpcy5zaXplKSB7XG4gICAgICBpZiAoYXR0ZW1wdHMrKyA+IDUwKSB0aHJvdyBuZXcgRXJyb3IoYHJlZmluZSBmYWlsZWQ6IGF0dGVtcHRzYCk7XG4gICAgICAvL2NvbnNvbGUubG9nKGBtYWluOiAke3RoaXMuY291bnR9ID4gJHt0aGlzLnNpemV9YCk7XG4gICAgICBsZXQgcmVtb3ZlZCA9IDA7XG4vL2lmKHRoaXMucGFyYW1zLmlkPT09NCl7ZGVidWdnZXI7Wy4uLnRoaXMucmFuZG9tLmlzaHVmZmxlKGZpbGxlZCldO31cbiAgICAgIGZvciAoY29uc3QgY29vcmQgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWy4uLmZpbGxlZF0pKSB7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIoY29vcmQpIHx8XG4gICAgICAgICAgICAhdGhpcy5jYW5SZW1vdmUodGhpcy5ncmlkLmdldChjb29yZCkpIHx8XG4gICAgICAgICAgICB0aGlzLmZpeGVkLmhhcyhjb29yZCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVtb3ZlZCA+IDMpIGJyZWFrO1xuXG4gICAgICAgIGNvbnN0IHBhcnRzID0gdGhpcy5ncmlkLnBhcnRpdGlvbih0aGlzLnJlbW92YWxNYXAoY29vcmQpKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgICBjb29yZDogJHtjb29yZC50b1N0cmluZygxNil9ID0+ICR7cGFydHMuc2l6ZX1gKTtcbiAgICAgICAgY29uc3QgW2ZpcnN0XSA9IHBhcnRzLnZhbHVlcygpO1xuICAgICAgICBpZiAoZmlyc3Quc2l6ZSA9PT0gcGFydHMuc2l6ZSAmJiBwYXJ0cy5zaXplID4gMSkgeyAvLyBhIHNpbmdsZSBwYXJ0aXRpb25cbiAgICAgICAgICAvLyBvayB0byByZW1vdmVcbiAgICAgICAgICByZW1vdmVkKys7XG4gICAgICAgICAgZmlsbGVkLmRlbGV0ZShjb29yZCk7XG4gICAgICAgICAgaWYgKChjb29yZCAmIDB4ODA4KSA9PT0gMHg4MDgpIHRoaXMuY291bnQtLTtcbiAgICAgICAgICB0aGlzLmdyaWQuc2V0KGNvb3JkLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZmluZCB0aGUgYmlnZ2VzdCBwYXJ0aXRpb24uXG4gICAgICAgICAgbGV0IHBhcnQhOiBTZXQ8R3JpZENvb3JkPjtcbiAgICAgICAgICBmb3IgKGNvbnN0IHNldCBvZiBwYXJ0cy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKCFwYXJ0IHx8IHNldC5zaXplID4gcGFydC5zaXplKSBwYXJ0ID0gc2V0O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBtYWtlIHN1cmUgYWxsIHRoZSBmaXhlZCBzY3JlZW5zIGFyZSBpbiBpdC5cbiAgICAgICAgICBpZiAoIVsuLi50aGlzLmZpeGVkXS5ldmVyeShjID0+IHBhcnQuaGFzKGMpKSkgY29udGludWU7XG4gICAgICAgICAgLy8gY2hlY2sgdGhhdCBpdCdzIGJpZyBlbm91Z2guXG4gICAgICAgICAgY29uc3QgY291bnQgPSBbLi4ucGFydF0uZmlsdGVyKGMgPT4gKGMgJiAweDgwOCkgPT0gMHg4MDgpLmxlbmd0aDtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKGBwYXJ0OiAke1suLi5wYXJ0XS5tYXAoeD0+eC50b1N0cmluZygxNikpLmpvaW4oJywnKX0gY291bnQ9JHtjb3VudH1gKTtcbiAgICAgICAgICBpZiAoY291bnQgPCB0aGlzLnNpemUpIGNvbnRpbnVlO1xuICAgICAgICAgIC8vIG9rIHRvIHJlbW92ZVxuICAgICAgICAgIHJlbW92ZWQrKztcbiAgICAgICAgICBmaWxsZWQgPSBwYXJ0O1xuICAgICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICAgICAgICB0aGlzLmdyaWQuc2V0KGNvb3JkLCAnJyk7XG4gICAgICAgICAgZm9yIChjb25zdCBbaywgdl0gb2YgcGFydHMpIHtcbiAgICAgICAgICAgIGlmICh2ICE9PSBwYXJ0KSB0aGlzLmdyaWQuc2V0KGssICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghcmVtb3ZlZCkge1xuICAgICAgICBpZiAodGhpcy5sb29zZVJlZmluZSkgcmV0dXJuIE9LO1xuICAgICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYHJlZmluZSAke3RoaXMuY291bnR9ID4gJHt0aGlzLnNpemV9XFxuJHt0aGlzLmdyaWQuc2hvdygpfWB9O1xuLy9gfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgcmVtb3ZhbE1hcChjb29yZDogR3JpZENvb3JkKTogTWFwPEdyaWRDb29yZCwgc3RyaW5nPiB7XG4gICAgcmV0dXJuIG5ldyBNYXAoW1tjb29yZCwgJyddXSk7XG4gIH1cblxuICAvKiogUmVtb3ZlIG9ubHkgZWRnZXMuIENhbGxlZCBhZnRlciByZWZpbmUoKS4gKi9cbiAgcmVmaW5lRWRnZXMoKTogYm9vbGVhbiB7XG4gICAgbGV0IGVkZ2VzOiBHcmlkQ29vcmRbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwIGFzIEdyaWRJbmRleDsgaSA8IHRoaXMuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMuZ3JpZC5kYXRhW2ldKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNvb3JkID0gdGhpcy5ncmlkLmNvb3JkKGkpO1xuICAgICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihjb29yZCkgfHwgdGhpcy5maXhlZC5oYXMoY29vcmQpKSBjb250aW51ZTtcbiAgICAgIC8vIE9ubHkgYWRkIGVkZ2VzLlxuICAgICAgaWYgKChjb29yZCBeIChjb29yZCA+PiA4KSkgJiA4KSBlZGdlcy5wdXNoKGNvb3JkKTtcbiAgICB9XG4gICAgdGhpcy5yYW5kb20uc2h1ZmZsZShlZGdlcyk7XG4gICAgY29uc3Qgb3JpZyA9IHRoaXMuZ3JpZC5wYXJ0aXRpb24obmV3IE1hcCgpKTtcbiAgICBsZXQgc2l6ZSA9IG9yaWcuc2l6ZTtcbiAgICBjb25zdCBwYXJ0Q291bnQgPSBuZXcgU2V0KG9yaWcudmFsdWVzKCkpLnNpemU7XG4gICAgZm9yIChjb25zdCBlIG9mIGVkZ2VzKSB7XG4gICAgICBjb25zdCBwYXJ0cyA9IHRoaXMuZ3JpZC5wYXJ0aXRpb24obmV3IE1hcChbW2UsICcnXV0pKTtcbiAgICAgIC8vY29uc29sZS5sb2coYCAgY29vcmQ6ICR7Y29vcmQudG9TdHJpbmcoMTYpfSA9PiAke3BhcnRzLnNpemV9YCk7XG4gICAgICBjb25zdCBbZmlyc3RdID0gcGFydHMudmFsdWVzKCk7XG4gICAgICBjb25zdCBvayA9IGZpcnN0LnNpemUgPT09IHBhcnRzLnNpemUgP1xuICAgICAgICAgIC8vIGEgc2luZ2xlIHBhcnRpdGlvbiAtIG1ha2Ugc3VyZSB3ZSBkaWRuJ3QgbG9zZSBhbnl0aGluZyBlbHNlLlxuICAgICAgICAgIHBhcnRzLnNpemUgPT09IHNpemUgLSAxIDpcbiAgICAgICAgICAvLyByZXF1aXJlIG5vIG5ldyBwYXJ0aXRpb25zXG4gICAgICAgICAgbmV3IFNldChwYXJ0cy52YWx1ZXMoKSkuc2l6ZSA9PT0gcGFydENvdW50ICYmIHBhcnRzLnNpemUgPT09IHNpemUgLSAxO1xuICAgICAgaWYgKG9rKSB7XG4gICAgICAgIHNpemUtLTtcbiAgICAgICAgdGhpcy5ncmlkLnNldChlLCAnJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFdlIGNhbid0IGhhbmRsZSBhIHRpbGUgJyBjIHxjICB8ICAgJyBzbyBnZXQgcmlkIG9mIG9uZSBvciB0aGVcbiAgICogb3RoZXIgb2YgdGhlIGVkZ2VzLiAgTGVhdmUgdGlsZXMgb2YgdGhlIGZvcm0gJyBjIHwgICB8IGMgJyBzaW5jZVxuICAgKiB0aGF0IHdvcmtzIGZpbmUuICBUT0RPIC0gaG93IHRvIHByZXNlcnZlICcgPiB8ICAgfCA8ICc/XG4gICAqL1xuICByZW1vdmVTcHVycygpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMudzsgeCsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSAoeSA8PCAxMiB8IDB4ODA4IHwgeCA8PCA0KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGMpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdXAgPSAoYyAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IGRvd24gPSAoYyArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IGxlZnQgPSAoYyAtIDB4OCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBjb25zdCByaWdodCA9IChjICsgMHg4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICgodGhpcy5ncmlkLmdldCh1cCkgfHwgdGhpcy5ncmlkLmdldChkb3duKSkgJiZcbiAgICAgICAgICAgICh0aGlzLmdyaWQuZ2V0KGxlZnQpIHx8IHRoaXMuZ3JpZC5nZXQocmlnaHQpKSkge1xuICAgICAgICAgIGlmICh0aGlzLnJhbmRvbS5uZXh0SW50KDIpKSB7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KHVwLCAnJyk7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KGRvd24sICcnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChsZWZ0LCAnJyk7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vY29uc29sZS5sb2coYHJlbW92ZSAke3l9ICR7eH06XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlVGlnaHRMb29wcygpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaCAtIDE7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0geSA8PCAxMiB8IDB4ODAwO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLncgLSAxOyB4KyspIHtcbiAgICAgICAgY29uc3QgY29vcmQgPSAocm93IHwgKHggPDwgNCkgfCA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh0aGlzLmlzVGlnaHRMb29wKGNvb3JkKSkgdGhpcy5icmVha1RpZ2h0TG9vcChjb29yZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaXNUaWdodExvb3AoY29vcmQ6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGZvciAobGV0IGR5ID0gMDsgZHkgPCAweDE4MDA7IGR5ICs9IDB4ODAwKSB7XG4gICAgICBmb3IgKGxldCBkeCA9IDA7IGR4IDwgMHgxODsgZHggKz0gOCkge1xuICAgICAgICBjb25zdCBkZWx0YSA9IGR5IHwgZHhcbiAgICAgICAgaWYgKGRlbHRhID09PSAweDgwOCkgY29udGludWU7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KChjb29yZCArIGRlbHRhKSBhcyBHcmlkQ29vcmQpICE9PSAnYycpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBicmVha1RpZ2h0TG9vcChjb29yZDogR3JpZENvb3JkKSB7XG4gICAgLy8gUGljayBhIGRlbHRhIC0gZWl0aGVyIDgsIDEwMDgsIDgwMCwgODEwXG4gICAgY29uc3QgciA9IHRoaXMucmFuZG9tLm5leHRJbnQoMHgxMDAwMCk7XG4gICAgY29uc3QgZGVsdGEgPSByICYgMSA/IChyICYgMHgxMDAwKSB8IDggOiAociAmIDB4MTApIHwgMHg4MDA7XG4gICAgdGhpcy5ncmlkLnNldCgoY29vcmQgKyBkZWx0YSkgYXMgR3JpZENvb3JkLCAnJyk7XG4gIH1cblxuICBhZGRTdGFpcnModXAgPSAwLCBkb3duID0gMCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gRmluZCBzcG90cyB3aGVyZSB3ZSBjYW4gYWRkIHN0YWlyc1xuLy9pZih0aGlzLnBhcmFtcy5pZD09PTUpZGVidWdnZXI7XG4gICAgY29uc3Qgc3RhaXJzID0gW3VwLCBkb3duXTtcbiAgICBpZiAoIXN0YWlyc1swXSAmJiAhc3RhaXJzWzFdKSByZXR1cm4gT0s7IC8vIG5vIHN0YWlyc1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgaWYgKCF0aGlzLnRyeUFkZFN0YWlyKGMsIHN0YWlycykpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzdGFpcnNbMF0gJiYgIXN0YWlyc1sxXSkgcmV0dXJuIE9LOyAvLyBubyBzdGFpcnNcbiAgICB9XG4gICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBzdGFpcnNgfTsgLy9cXG4ke3RoaXMuZ3JpZC5zaG93KCl9YH07XG4gIH1cblxuICBhZGRFYXJseVN0YWlyKGM6IEdyaWRDb29yZCwgc3RhaXI6IHN0cmluZyk6IEFycmF5PFtHcmlkQ29vcmQsIHN0cmluZ10+IHtcbiAgICBjb25zdCBtb2RzOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPiA9IFtdO1xuICAgIGNvbnN0IGxlZnQgPSBjIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSBjICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgdXAgPSBjIC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGRvd24gPSBjICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGxldCBuZWlnaGJvcnMgPSBbYyAtIDgsIGMgKyA4XSBhcyBHcmlkQ29vcmRbXTtcbiAgICBpZiAoc3RhaXIgPT09ICc8Jykge1xuICAgICAgbmVpZ2hib3JzLnB1c2goZG93bik7XG4gICAgICBtb2RzLnB1c2goW3VwLCAnJ10pO1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQobGVmdCkgPT09ICdjJyAmJiB0aGlzLmdyaWQuZ2V0KHJpZ2h0KSA9PT0gJ2MnICYmXG4gICAgICAgICAgdGhpcy5yYW5kb20ubmV4dEludCgzKSkge1xuICAgICAgICBtb2RzLnB1c2goW2Rvd24sICcnXSwgW2MsICc8J10pO1xuICAgICAgICByZXR1cm4gbW9kcztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHN0YWlyID09PSAnPicpIHtcbiAgICAgIG5laWdoYm9ycy5wdXNoKHVwKTtcbiAgICAgIG1vZHMucHVzaChbZG93biwgJyddKTtcbiAgICB9XG4gICAgLy8gTk9URTogaWYgd2UgZGVsZXRlIHRoZW4gd2UgZm9yZ2V0IHRvIHplcm8gaXQgb3V0Li4uXG4gICAgLy8gQnV0IGl0IHdvdWxkIHN0aWxsIGJlIG5pY2UgdG8gXCJwb2ludFwiIHRoZW0gaW4gdGhlIGVhc3kgZGlyZWN0aW9uP1xuICAgIC8vIGlmICh0aGlzLmRlbHRhIDwgLTE2KSBuZWlnaGJvcnMuc3BsaWNlKDIsIDEpO1xuICAgIC8vIGlmICgodGhpcy5kZWx0YSAmIDB4ZikgPCA4KSBuZWlnaGJvcnMuc3BsaWNlKDEsIDEpO1xuICAgIG5laWdoYm9ycyA9IG5laWdoYm9ycy5maWx0ZXIoYyA9PiB0aGlzLmdyaWQuZ2V0KGMpID09PSAnYycpO1xuICAgIGlmICghbmVpZ2hib3JzLmxlbmd0aCkgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGtlZXAgPSB0aGlzLnJhbmRvbS5uZXh0SW50KG5laWdoYm9ycy5sZW5ndGgpO1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgbmVpZ2hib3JzLmxlbmd0aDsgaisrKSB7XG4gICAgICBpZiAoaiAhPT0ga2VlcCkgbW9kcy5wdXNoKFtuZWlnaGJvcnNbal0sICcnXSk7XG4gICAgfVxuICAgIG1vZHMucHVzaChbYywgc3RhaXJdKTtcbiAgICByZXR1cm4gbW9kcztcbiAgfVxuXG4gIHRyeUFkZFN0YWlyKGM6IEdyaWRDb29yZCwgc3RhaXJzOiBudW1iZXJbXSk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLmZpeGVkLmhhcygoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIGMpO1xuICAgIGNvbnN0IGJvdGggPSBzdGFpcnNbMF0gJiYgc3RhaXJzWzFdO1xuICAgIGNvbnN0IHRvdGFsID0gc3RhaXJzWzBdICsgc3RhaXJzWzFdO1xuICAgIGNvbnN0IHVwID0gdGhpcy5yYW5kb20ubmV4dEludCh0b3RhbCkgPCBzdGFpcnNbMF07XG4gICAgY29uc3QgY2FuZGlkYXRlcyA9IFt1cCA/IDAgOiAxXTtcbiAgICBpZiAoYm90aCkgY2FuZGlkYXRlcy5wdXNoKHVwID8gMSA6IDApO1xuICAgIGZvciAoY29uc3Qgc3RhaXIgb2YgY2FuZGlkYXRlcykge1xuICAgICAgY29uc3Qgc3RhaXJDaGFyID0gJzw+J1tzdGFpcl07XG4gICAgICBjb25zdCBzdGFpclRpbGUgPSB0aWxlLnN1YnN0cmluZygwLCA0KSArIHN0YWlyQ2hhciArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcoc3RhaXJUaWxlKS5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5ncmlkLnNldCgoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQsIHN0YWlyQ2hhcik7XG4gICAgICAgIHN0YWlyc1tzdGFpcl0tLTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIG1ha2UgYSBwYXRoIGNvbm5lY3Rpbmcgc3RhcnQgdG8gZW5kIChib3RoIGNlbnRlcnMpLlxuICAgKiBSZXF1aXJlcyBhbGwgLi4uP1xuICAgKi9cbiAgdHJ5Q29ubmVjdChzdGFydDogR3JpZENvb3JkLCBlbmQ6IEdyaWRDb29yZCxcbiAgICAgICAgICAgICBjaGFyOiBzdHJpbmcsIGF0dGVtcHRzID0gMSk6IGJvb2xlYW4ge1xuICAgIHdoaWxlIChhdHRlbXB0cy0tID4gMCkge1xuICAgICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KCk7XG4gICAgICBsZXQgcG9zID0gc3RhcnQ7XG4gICAgICBpZiAoKHN0YXJ0ICYgZW5kICYgMHg4MDgpICE9PSAweDgwOCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGJhZCBzdGFydCAke2hleChzdGFydCl9IG9yIGVuZCAke2hleChlbmQpfWApO1xuICAgICAgfVxuICAgICAgcmVwbGFjZS5zZXQocG9zLCBjaGFyKTtcbiAgICAgIHdoaWxlIChwb3MgIT09IGVuZCkge1xuICAgICAgICAvLyBvbiBhIGNlbnRlciAtIGZpbmQgZWxpZ2libGUgZGlyZWN0aW9uc1xuICAgICAgICBjb25zdCBkaXJzOiBudW1iZXJbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBbOCwgLTgsIDB4ODAwLCAtMHg4MDBdKSB7XG4gICAgICAgICAgY29uc3QgcG9zMSA9IHBvcyArIGRpciBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgcG9zMiA9IHBvcyArIDIgKiBkaXIgYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhwb3MyKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKHJlcGxhY2UuZ2V0KHBvczIpID8/IHRoaXMuZ3JpZC5nZXQocG9zMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIocG9zMSkpIGNvbnRpbnVlO1xuICAgICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGlycy5sZW5ndGgpIGJyZWFrO1xuICAgICAgICBjb25zdCBkeSA9IChlbmQgPj4gMTIpIC0gKHBvcyA+PiAxMilcbiAgICAgICAgY29uc3QgZHggPSAoZW5kICYgMHhmMCkgLSAocG9zICYgMHhmMCk7XG4gICAgICAgIGNvbnN0IHByZWZlcnJlZCA9IG5ldyBTZXQ8bnVtYmVyPihkaXJzKTtcbiAgICAgICAgaWYgKGR5IDwgMCkgcHJlZmVycmVkLmRlbGV0ZSgweDgwMCk7XG4gICAgICAgIGlmIChkeSA+IDApIHByZWZlcnJlZC5kZWxldGUoLTB4ODAwKTtcbiAgICAgICAgaWYgKGR4IDwgMCkgcHJlZmVycmVkLmRlbGV0ZSg4KTtcbiAgICAgICAgaWYgKGR4ID4gMCkgcHJlZmVycmVkLmRlbGV0ZSgtOCk7XG4gICAgICAgIC8vIDM6MSBiaWFzIGZvciBwcmVmZXJyZWQgZGlyZWN0aW9ucyAgKFRPRE8gLSBiYWNrdHJhY2tpbmc/KVxuICAgICAgICBkaXJzLnB1c2goLi4ucHJlZmVycmVkLCAuLi5wcmVmZXJyZWQpO1xuICAgICAgICBjb25zdCBkaXIgPSB0aGlzLnJhbmRvbS5waWNrKGRpcnMpO1xuICAgICAgICByZXBsYWNlLnNldChwb3MgKyBkaXIgYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgICAgICAgcmVwbGFjZS5zZXQocG9zID0gcG9zICsgMiAqIGRpciBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAgICAgfVxuICAgICAgaWYgKHBvcyAhPT0gZW5kKSBjb250aW51ZTtcbiAgICAgIC8vIElmIHdlIGdvdCB0aGVyZSwgbWFrZSB0aGUgY2hhbmdlcy5cbiAgICAgIGZvciAoY29uc3QgW2MsIHZdIG9mIHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5ncmlkLnNldChjLCB2KTtcbiAgICAgICAgaWYgKChjICYgMHg4MDgpID09PSAweDgwOCkgdGhpcy5jb3VudCsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRyeUFkZExvb3AoY2hhcjogc3RyaW5nLCBhdHRlbXB0cyA9IDEpOiBib29sZWFuIHtcbiAgICAvLyBwaWNrIGEgcGFpciBvZiBjb29yZHMgZm9yIHN0YXJ0IGFuZCBlbmRcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8R3JpZENvb3JkPigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpO1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoYykgfHwgdGhpcy5ncmlkLmlzQm9yZGVyKGMpKSBjb250aW51ZTtcbiAgICAgIGlmICghdGhpcy5ncmlkLmdldChFKGMpKSkgdWYudW5pb24oW2MsIEUoYyldKTtcbiAgICAgIGlmICghdGhpcy5ncmlkLmdldChTKGMpKSkgdWYudW5pb24oW2MsIFMoYyldKTtcbiAgICB9XG4gICAgY29uc3QgZWxpZ2libGUgPVxuICAgICAgICBuZXcgRGVmYXVsdE1hcDx1bmtub3duLCBbR3JpZENvb3JkLCBHcmlkQ29vcmRdW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgdGhpcy5ncmlkLnNjcmVlbnMoKSkge1xuICAgICAgY29uc3QgYyA9IHMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoIXRoaXMuZ3JpZC5nZXQoYykpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBkIG9mIFs4LCAtOCwgMHg4MDAsIC0weDgwMF0pIHtcbiAgICAgICAgY29uc3QgZTEgPSBjICsgZCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIoZTEpIHx8IHRoaXMuZ3JpZC5nZXQoZTEpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZTIgPSBjICsgMiAqIGQgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAodGhpcy5ncmlkLmdldChlMikpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCByZXBsYWNlID0gbmV3IE1hcChbW2UxIGFzIEdyaWRDb29yZCwgY2hhcl1dKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIHMsIHtyZXBsYWNlfSk7XG4gICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpLmxlbmd0aCkge1xuICAgICAgICAgIGVsaWdpYmxlLmdldCh1Zi5maW5kKGUyKSkucHVzaChbZTEsIGUyXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgd2VpZ2h0ZWRNYXAgPSBuZXcgTWFwPEdyaWRDb29yZCwgW0dyaWRDb29yZCwgR3JpZENvb3JkXVtdPigpO1xuICAgIGZvciAoY29uc3QgcGFydGl0aW9uIG9mIGVsaWdpYmxlLnZhbHVlcygpKSB7XG4gICAgICBpZiAocGFydGl0aW9uLmxlbmd0aCA8IDIpIGNvbnRpbnVlOyAvLyBUT0RPIC0gMyBvciA0P1xuICAgICAgZm9yIChjb25zdCBbZTFdIG9mIHBhcnRpdGlvbikge1xuICAgICAgICB3ZWlnaHRlZE1hcC5zZXQoZTEsIHBhcnRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHdlaWdodGVkID0gWy4uLndlaWdodGVkTWFwLnZhbHVlcygpXTtcbiAgICBpZiAoIXdlaWdodGVkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIHdoaWxlIChhdHRlbXB0cy0tID4gMCkge1xuICAgICAgY29uc3QgcGFydGl0aW9uID0gdGhpcy5yYW5kb20ucGljayh3ZWlnaHRlZCk7XG4gICAgICBjb25zdCBbW2UwLCBjMF0sIFtlMSwgYzFdXSA9IHRoaXMucmFuZG9tLmlzaHVmZmxlKHBhcnRpdGlvbik7XG4gICAgICB0aGlzLmdyaWQuc2V0KGUwLCBjaGFyKTtcbiAgICAgIHRoaXMuZ3JpZC5zZXQoZTEsIGNoYXIpO1xuICAgICAgaWYgKHRoaXMudHJ5Q29ubmVjdChjMCwgYzEsIGNoYXIsIDUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5ncmlkLnNldChlMCwgJycpO1xuICAgICAgdGhpcy5ncmlkLnNldChlMSwgJycpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byBleHRlbmQgYW4gZXhpc3Rpbmcgc2NyZWVuIGludG8gYSBkaXJlY3Rpb24gdGhhdCdzXG4gICAqIGN1cnJlbnRseSBlbXB0eS4gIExlbmd0aCBpcyBwcm9iYWJpbGlzdGljLCBlYWNoIHN1Y2Nlc3NmdWxcbiAgICogYXR0ZW1wdCB3aWxsIGhhdmUgYSAxL2xlbmd0aCBjaGFuY2Ugb2Ygc3RvcHBpbmcuICBSZXR1cm5zIG51bWJlclxuICAgKiBvZiBzY3JlZW5zIGFkZGVkLlxuICAgKi9cbiAgdHJ5RXh0cnVkZShjaGFyOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyLCBhdHRlbXB0cyA9IDEpOiBudW1iZXIge1xuICAgIC8vIExvb2sgZm9yIGEgcGxhY2UgdG8gc3RhcnQuXG4gICAgd2hpbGUgKGF0dGVtcHRzLS0pIHtcbiAgICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgICBjb25zdCBtaWQgPSBjICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoIXRoaXMuZ3JpZC5nZXQobWlkKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBjKTtcbiAgICAgICAgZm9yIChsZXQgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgICAgICAgICBjb25zdCBuMSA9IG1pZCArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgbjIgPSBtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbi8vY29uc29sZS5sb2coYG1pZDogJHttaWQudG9TdHJpbmcoMTYpfTsgbjEoJHtuMS50b1N0cmluZygxNil9KTogJHt0aGlzLmdyaWQuZ2V0KG4xKX07IG4yKCR7bjIudG9TdHJpbmcoMTYpfSk6ICR7dGhpcy5ncmlkLmdldChuMil9YCk7XG4gICAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQobjEpIHx8IHRoaXMuZ3JpZC5pc0JvcmRlcihuMSkgfHwgdGhpcy5ncmlkLmdldChuMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gICAgICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAgICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobjIsIGNoYXIpO1xuICAgICAgICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShjaGFyLCBsZW5ndGgsIG4yKTtcbiAgICAgICAgICAgIGlmIChhZGRlZCkgcmV0dXJuIGFkZGVkO1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChuMiwgJycpO1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChuMSwgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBSZWN1cnNpdmUgYXR0ZW1wdC4gKi9cbiAgdHJ5Q29udGludWVFeHRydWRlKGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsIGM6IEdyaWRDb29yZCk6IG51bWJlciB7XG4gICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIGMgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgIGNvbnN0IG9rID0gdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKS5sZW5ndGggPiAwO1xuICAgIGlmIChsZW5ndGggPT09IDEpIHJldHVybiBvayA/IDEgOiAwO1xuICAgIC8vIG1heWJlIHJldHVybiBlYXJseVxuICAgIGlmIChvayAmJiAhdGhpcy5yYW5kb20ubmV4dEludChsZW5ndGgpKSByZXR1cm4gMTtcbiAgICAvLyBmaW5kIGEgbmV3IGRpcmVjdGlvblxuICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgICAgIGNvbnN0IG4xID0gYyArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBuMiA9IGMgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KG4xKSB8fCB0aGlzLmdyaWQuaXNCb3JkZXIobjEpIHx8IHRoaXMuZ3JpZC5nZXQobjIpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gICAgICBjb25zdCByZXAgPSB0aWxlLnN1YnN0cmluZygwLCBpKSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAgICAgICB0aGlzLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgdGhpcy5ncmlkLnNldChuMiwgY2hhcik7XG4gICAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlDb250aW51ZUV4dHJ1ZGUoY2hhciwgbGVuZ3RoIC0gMSwgbjIpO1xuICAgICAgICBpZiAoYWRkZWQpIHJldHVybiBhZGRlZCArIDE7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQobjIsICcnKTtcbiAgICAgICAgdGhpcy5ncmlkLnNldChuMSwgJycpO1xuICAgICAgfVxuICAgICAgaWYgKG9rKSBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIG9rID8gMSA6IDA7XG4gIH1cblxuICAvKiogQXR0ZW1wdCB0byBhZGQgYSBncmlkIHR5cGUuICovXG4gIHRyeUFkZChvcHRzOiBBZGRPcHRzID0ge30pOiBudW1iZXIge1xuICAgIC8vIE9wdGlvbmFsbHkgc3RhcnQgYXQgdGhlIGdpdmVuIHNjcmVlbiBvbmx5LlxuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLm9yaWcudGlsZXNldDtcbiAgICBjb25zdCB7YXR0ZW1wdHMgPSAxLCBjaGFyID0gJ2MnLCBzdGFydCwgbG9vcCA9IGZhbHNlfSA9IG9wdHM7XG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCBhdHRlbXB0czsgYXR0ZW1wdCsrKSB7XG4gICAgICBjb25zdCBzdGFydEl0ZXIgPVxuICAgICAgICAgIHN0YXJ0ICE9IG51bGwgP1xuICAgICAgICAgICAgICBbKHN0YXJ0ICYgMHhmMGYwKSBhcyBHcmlkQ29vcmRdIDpcbiAgICAgICAgICAgICAgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5ncmlkLnNjcmVlbnMoKSk7XG4gICAgICBmb3IgKGNvbnN0IGMgb2Ygc3RhcnRJdGVyKSB7XG4gICAgICAgIGNvbnN0IG1pZCA9IGMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICghdGhpcy5ncmlkLmdldChtaWQpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIGMpO1xuICAgICAgICBmb3IgKGxldCBkaXIgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWzAsIDEsIDIsIDNdKSkge1xuICAgICAgICAgIGNvbnN0IG4xID0gbWlkICsgR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBjb25zdCBuMiA9IG1pZCArIDIgKiBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhuMSkgfHwgdGhpcy5maXhlZC5oYXMobjIpKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBvMSA9IHRoaXMuZ3JpZC5nZXQobjEpO1xuICAgICAgICAgIGNvbnN0IG8yID0gdGhpcy5ncmlkLmdldChuMik7XG4vL2NvbnNvbGUubG9nKGBtaWQoJHttaWQudG9TdHJpbmcoMTYpfSk6ICR7dGhpcy5ncmlkLmdldChtaWQpfTsgbjEoJHtuMS50b1N0cmluZygxNil9KTogJHt0aGlzLmdyaWQuZ2V0KG4xKX07IG4yKCR7bjIudG9TdHJpbmcoMTYpfSk6ICR7dGhpcy5ncmlkLmdldChuMil9YCk7XG4gICAgICAgICAgLy8gYWxsb3cgbWFraW5nIHByb2dyZXNzIG9uIHRvcCBvZiBhbiBlZGdlLW9ubHkgY29ubmVjdGlvbi5cbiAgICAgICAgICBpZiAoKG8xICYmIChvMiB8fCBvMSAhPT0gY2hhcikpIHx8IHRoaXMuZ3JpZC5pc0JvcmRlcihuMSkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICghbG9vcCkge1xuICAgICAgICAgICAgY29uc3QgbmVpZ2hib3JUaWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgbjIgLSAweDgwOCBhcyBHcmlkQ29vcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3JlcGxhY2U6IG5ldyBNYXAoW1tuMSwgJyddXSl9KTtcbiAgICAgICAgICAgIGlmICgvXFxTLy50ZXN0KG5laWdoYm9yVGlsZSkpIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAgICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICAgICAgICBpZiAodGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmNvdW50Kys7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobjIsIGNoYXIpO1xuICAgICAgICAgICAgLy8gaWYgKGxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIC8vICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShjaGFyLCBsZW5ndGgsIG4yKTtcbiAgICAgICAgICAgIC8vICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQ7XG4gICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbmVpZ2hib3JUaWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgbjIgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICAgICAgaWYgKHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhuZWlnaGJvclRpbGUpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KG4yLCBvMik7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KG4xLCBvMSk7XG4gICAgICAgICAgICB0aGlzLmNvdW50LS07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLy8gLyoqXG4gIC8vICAqIEF0dGVtcHQgdG8gZXh0ZW5kIGFuIGV4aXN0aW5nIHNjcmVlbiBpbnRvIGEgZGlyZWN0aW9uIHRoYXQnc1xuICAvLyAgKiBjdXJyZW50bHkgZW1wdHkuICBMZW5ndGggaXMgcHJvYmFiaWxpc3RpYywgZWFjaCBzdWNjZXNzZnVsXG4gIC8vICAqIGF0dGVtcHQgd2lsbCBoYXZlIGEgMS9sZW5ndGggY2hhbmNlIG9mIHN0b3BwaW5nLiAgUmV0dXJucyBudW1iZXJcbiAgLy8gICogb2Ygc2NyZWVucyBhZGRlZC5cbiAgLy8gICovXG4gIC8vIHRyeUV4dHJ1ZGUoY2hhcjogc3RyaW5nLCBsZW5ndGg6IG51bWJlciwgYXR0ZW1wdHMgPSAxKTogbnVtYmVyIHtcbiAgLy8gICAvLyBMb29rIGZvciBhIHBsYWNlIHRvIHN0YXJ0LlxuICAvLyAgIHdoaWxlIChhdHRlbXB0cy0tKSB7XG4gIC8vICAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgLy8gICAgICAgY29uc3QgbWlkID0gYyArIDB4ODA4IGFzIEdyaWRDb29yZDtcbiAgLy8gICAgICAgaWYgKCF0aGlzLmdyaWQuZ2V0KG1pZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgYyk7XG4gIC8vICAgICAgIGZvciAobGV0IGRpciBvZiBbMCwgMSwgMiwgM10pIHtcbiAgLy8gICAgICAgICBpZiAodGhpcy5ncmlkLmdldChtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gIC8vICAgICAgICAgaWYgKHRpbGVbaV0gIT09ICcgJykgY29udGludWU7XG4gIC8vICAgICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAvLyAgICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gIC8vICAgICAgICAgICBjb25zdCBhZGRlZCA9IHRoaXMudHJ5Q29udGludWVFeHRydWRlKGNoYXIsIGxlbmd0aCwgbWlkLCBkaXIpO1xuICAvLyAgICAgICAgICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQ7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiAwO1xuICAvLyB9XG5cbiAgLy8gdHJ5Q29udGludWVFeHRydWRlKGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsXG4gIC8vICAgICAgICAgICAgICAgICAgICBtaWQ6IEdyaWRDb29yZCwgZGlyOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAgIGNvbnN0IHJlcGxhY2UgPSBuZXcgTWFwPEdyaWRDb29yZCwgc3RyaW5nPihbXSk7XG4gIC8vICAgbGV0IHdvcmtzOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPnx1bmRlZmluZWQ7XG4gIC8vICAgbGV0IHdlaWdodCA9IDA7XG4gIC8vICAgT1VURVI6XG4gIC8vICAgd2hpbGUgKHRydWUpIHtcbiAgLy8gICAgIHJlcGxhY2Uuc2V0KG1pZCArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgcmVwbGFjZS5zZXQobWlkICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgbWlkID0gKG1pZCArIDIgKiBHUklERElSW2Rpcl0pIGFzIEdyaWRDb29yZDtcblxuICAvLyAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIG1pZCAtIDB4ODA4IGFzIEdyaWRDb29yZCwge3JlcGxhY2V9KTtcbiAgLy8gICAgIHdlaWdodCsrO1xuICAvLyAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcodGlsZSkubGVuZ3RoKSB7XG4gIC8vICAgICAgIHdvcmtzID0gWy4uLnJlcGxhY2VdO1xuICAvLyAgICAgICAvLyB3ZSBjYW4gcXVpdCBub3cgLSBzZWUgaWYgd2Ugc2hvdWxkLlxuICAvLyAgICAgICB3aGlsZSAod2VpZ2h0ID4gMCkge1xuICAvLyAgICAgICAgIGlmICghdGhpcy5yYW5kb20ubmV4dEludChsZW5ndGgpKSBicmVhayBPVVRFUjtcbiAgLy8gICAgICAgICB3ZWlnaHQtLTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuXG4gIC8vICAgICAvLyBGaW5kIGEgdmlhYmxlIG5leHQgc3RlcC5cbiAgLy8gICAgIGZvciAoY29uc3QgbmV4dERpciBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbMCwgMSwgMiwgM10pKSB7XG4gIC8vICAgICAgIGNvbnN0IGRlbHRhID0gR1JJRERJUltuZXh0RGlyXTtcbiAgLy8gICAgICAgY29uc3QgZWRnZSA9IG1pZCArIGRlbHRhIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihlZGdlKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChyZXBsYWNlLmdldCguLi4pIHx8IHRoaXMuZ3JpZC5nZXQobWlkICsgMiAqIGRlbHRhIGFzIEdyaWRDb29yZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAvLyAgICAgICBpZiAodGlsZVtpXSAhPT0gJyAnKSBjb250aW51ZTtcbiAgLy8gICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAvLyAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAvLyAgICAgICAgIHJlcGxhY2Uuc2V0KG1pZCArIGRlbHRhIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gIC8vICAgICAgICAgcmVwbGFjZS5zZXQobWlkICsgMiAqIGRlbHRhIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gIC8vICAgICAgICAgZGlyID0gbmV4dERpcjtcbiAgLy8gICAgICAgICBjb250aW51ZSBPVVRFUjtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgICAgYnJlYWs7IC8vIG5ldmVyIGZvdW5kIGEgZm9sbG93LXVwLCBzbyBxdWl0XG4gIC8vICAgfVxuICAvLyAgIGlmICghd29ya3MpIHJldHVybiAwO1xuICAvLyAgIGZvciAoY29uc3QgW2MsIHZdIG9mIHdvcmtzKSB7XG4gIC8vICAgICB0aGlzLmdyaWQuc2V0KGMsIHYpO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gd29ya3MubGVuZ3RoID4+PiAxO1xuICAvLyB9XG5cbiAgLyoqIE1ha2UgYXJyYW5nZW1lbnRzIHRvIG1heGltaXplIHRoZSBzdWNjZXNzIGNoYW5jZXMgb2YgaW5mZXIuICovXG4gIHByZWluZmVyKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAodGhpcy5wYXJhbXMuZmVhdHVyZXM/LnNwaWtlKSB7XG4gICAgICBpZiAoKHJlc3VsdCA9IHRoaXMucHJlaW5mZXJTcGlrZXMoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHByZWluZmVyU3Bpa2VzKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gbWFrZSBzdXJlIHRoZXJlJ3MgYSAnYycgYWJvdmUgZWFjaCAncydcbiAgICAvLyBjaGVjayBzaWRlcz9cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBpbmZlclNjcmVlbnMoKTogUmVzdWx0PE1ldGFsb2NhdGlvbj4ge1xuICAgIGNvbnN0IHNjcmVlbnM6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcyBvZiB0aGlzLmdyaWQuc2NyZWVucygpKSB7XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgcyk7XG4gICAgICBjb25zdCBjYW5kaWRhdGVzID1cbiAgICAgICAgICB0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpXG4gICAgICAgICAgICAgIC5maWx0ZXIocyA9PiAhcy5kYXRhLm1vZCk7XG4gICAgICBpZiAoIWNhbmRpZGF0ZXMubGVuZ3RoKSB7XG4gICAgICAgIC8vY29uc29sZS5lcnJvcih0aGlzLmdyaWQuc2hvdygpKTtcbmlmICh0aGlzLmdyaWQuc2hvdygpLmxlbmd0aCA+IDEwMDAwMCkgZGVidWdnZXI7XG4gICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgaW5mZXIgc2NyZWVuICR7aGV4KHMpfTogWyR7dGlsZX1dXFxuJHt0aGlzLmdyaWQuc2hvdygpfWB9O1xuICAgICAgfVxuICAgICAgY29uc3QgcGljayA9IHRoaXMucmFuZG9tLnBpY2soY2FuZGlkYXRlcyk7XG4gICAgICBzY3JlZW5zLnB1c2gocGljayk7XG4gICAgICBpZiAocGljay5oYXNGZWF0dXJlKCd3YWxsJykpIHRoaXMud2FsbHMrKztcbiAgICAgIGlmIChwaWNrLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB0aGlzLmJyaWRnZXMrKztcblxuICAgICAgLy8gVE9ETyAtIGFueSBvdGhlciBmZWF0dXJlcyB0byB0cmFjaz9cblxuICAgIH1cblxuICAgIGxldCBhbGxFbXB0eSA9IHRydWU7XG4gICAgY29uc3QgbWV0YSA9IG5ldyBNZXRhbG9jYXRpb24odGhpcy5wYXJhbXMuaWQsIHRoaXMub3JpZy50aWxlc2V0LCB0aGlzLmgsIHRoaXMudyk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnc7IHgrKykge1xuICAgICAgICBjb25zdCBzY3IgPSBzY3JlZW5zW3kgKiB0aGlzLncgKyB4XTtcbiAgICAgICAgbWV0YS5zZXQoeSA8PCA0IHwgeCwgc2NyKTtcbiAgICAgICAgaWYgKCFzY3IuaXNFbXB0eSgpKSBhbGxFbXB0eSA9IGZhbHNlO1xuICAgICAgICBpZiAoeSkge1xuICAgICAgICAgIGNvbnN0IGFib3ZlID0gbWV0YS5nZXQoKHkgLSAxKSA8PCA0IHwgeCk7XG4gICAgICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmlzQmFubmVkVmVydGljYWwoYWJvdmUsIHNjcikpIHtcbiAgICAgICAgICAgIHJldHVybiB7b2s6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBmYWlsOiBgYmFkIHZlcnRpY2FsIG5laWdoYm9yIGF0ICR7eX0ke3h9OiAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWJvdmUubmFtZX0gJHtzY3IubmFtZX1gfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHgpIHtcbiAgICAgICAgICBjb25zdCBsZWZ0ID0gbWV0YS5nZXQoeSA8PCA0IHwgKHggLSAxKSk7XG4gICAgICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmlzQmFubmVkSG9yaXpvbnRhbChsZWZ0LCBzY3IpKSB7XG4gICAgICAgICAgICByZXR1cm4ge29rOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZmFpbDogYGJhZCBob3Jpem9udGFsIG5laWdoYm9yIGF0ICR7eX0ke3h9OiAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdC5uYW1lfSAke3Njci5uYW1lfWB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoYWxsRW1wdHkpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgYWxsIHNjcmVlbnMgZW1wdHlgfTtcblxuICAgIHJldHVybiB7b2s6IHRydWUsIHZhbHVlOiBtZXRhfTtcbiAgfVxuXG4gIHJlZmluZU1ldGFzY3JlZW5zKG1ldGE6IE1ldGFsb2NhdGlvbik6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gbWFrZSBzdXJlIHdlIGhhdmUgdGhlIHJpZ2h0IG51bWJlciBvZiB3YWxscyBhbmQgYnJpZGdlc1xuICAgIC8vIHRoaXMud2FsbHMgPSB0aGlzLmJyaWRnZXMgPSAwOyAvLyBUT0RPIC0gZG9uJ3QgYm90aGVyIG1ha2luZyB0aGVzZSBpbnN0YW5jZVxuICAgIC8vIGZvciAoY29uc3QgcG9zIG9mIG1ldGEuYWxsUG9zKCkpIHtcbiAgICAvLyAgIGNvbnN0IHNjciA9IG1ldGEuZ2V0KHBvcyk7XG4gICAgLy8gICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7Y29uc29sZS53YXJuKGhleChwb3MpKTsgdGhpcy5icmlkZ2VzKys7fVxuICAgIC8vICAgaWYgKHNjci5oYXNGZWF0dXJlKCd3YWxsJykpIHRoaXMud2FsbHMrKztcbiAgICAvLyB9XG4gICAgY29uc3QgYnJpZGdlcyA9IHRoaXMucGFyYW1zLmZlYXR1cmVzPy5icmlkZ2UgfHwgMDtcbiAgICBjb25zdCB3YWxscyA9IHRoaXMucGFyYW1zLmZlYXR1cmVzPy53YWxsIHx8IDA7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUobWV0YS5hbGxQb3MoKSkpIHtcbiAgICAgIGNvbnN0IGMgPSAoKHBvcyA8PCA4IHwgcG9zIDw8IDQpICYgMHhmMGYwKSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgYylcbiAgICAgIGNvbnN0IHNjciA9IG1ldGEuZ2V0KHBvcyk7XG4gICAgICBpZiAodGhpcy5icmlkZ2VzIDw9IGJyaWRnZXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSBjb250aW51ZTtcbiAgICAgIGlmICh0aGlzLmFkZEJsb2NrcyAmJlxuICAgICAgICAgIHRoaXMudHJ5TWV0YShtZXRhLCBwb3MsIHRoaXMub3JpZy50aWxlc2V0LndpdGhNb2QodGlsZSwgJ2Jsb2NrJykpKSB7XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHRoaXMuYnJpZGdlcy0tO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHtcbiAgICAgICAgaWYgKHRoaXMudHJ5TWV0YShtZXRhLCBwb3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcmlnLnRpbGVzZXQud2l0aE1vZCh0aWxlLCAnYnJpZGdlJykpKSB7XG4gICAgICAgICAgdGhpcy5icmlkZ2VzLS07XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIC8vIH0gZWxzZSBpZiAoYnJpZGdlcyA8IHRoaXMuYnJpZGdlcyAmJiBzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHtcbiAgICAgIC8vICAgLy8gY2FuJ3QgYWRkIGJyaWRnZXM/XG4gICAgICAvLyAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLndhbGxzIDwgd2FsbHMgJiYgIXNjci5oYXNGZWF0dXJlKCd3YWxsJykpIHtcbiAgICAgICAgaWYgKHRoaXMudHJ5TWV0YShtZXRhLCBwb3MsIHRoaXMub3JpZy50aWxlc2V0LndpdGhNb2QodGlsZSwgJ3dhbGwnKSkpIHtcbiAgICAgICAgICB0aGlzLndhbGxzKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY29uc29sZS53YXJuKGBicmlkZ2VzICR7dGhpcy5icmlkZ2VzfSAke2JyaWRnZXN9IC8gd2FsbHMgJHt0aGlzLndhbGxzfSAke3dhbGxzfVxcbiR7dGhpcy5ncmlkLnNob3coKX1cXG4ke21ldGEuc2hvdygpfWApO1xuICAgIGlmICh0aGlzLmJyaWRnZXMgIT09IGJyaWRnZXMpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLFxuICAgICAgICAgICAgICBmYWlsOiBgcmVmaW5lTWV0YSBicmlkZ2VzIHdhbnQgJHticmlkZ2VzfSBnb3QgJHt0aGlzLmJyaWRnZXN9XFxuJHttZXRhLnNob3coKX1gfTtcbiAgICB9XG4gICAgaWYgKHRoaXMud2FsbHMgIT09IHdhbGxzKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSxcbiAgICAgICAgICAgICAgZmFpbDogYHJlZmluZU1ldGEgd2FsbHMgd2FudCAke3dhbGxzfSBnb3QgJHt0aGlzLndhbGxzfVxcbiR7bWV0YS5zaG93KCl9YH07XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHRyeU1ldGEobWV0YTogTWV0YWxvY2F0aW9uLCBwb3M6IFBvcyxcbiAgICAgICAgICBzY3JlZW5zOiBJdGVyYWJsZTxNZXRhc2NyZWVuPik6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgcyBvZiBzY3JlZW5zKSB7XG4gICAgICBpZiAoIXRoaXMuY2hlY2tNZXRhKG1ldGEsIG5ldyBNYXAoW1twb3MsIHNdXSkpKSBjb250aW51ZTtcbiAgICAgIG1ldGEuc2V0KHBvcywgcyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY2hlY2tNZXRhKG1ldGE6IE1ldGFsb2NhdGlvbiwgcmVwbGFjZW1lbnRzPzogTWFwPFBvcywgTWV0YXNjcmVlbj4pOiBib29sZWFuIHtcblxuICAgIC8vIFRPRE8gLSBmbGlnaHQ/ICBtYXkgaGF2ZSBhIGRpZmYgIyBvZiBmbGlnaHQgdnMgbm9uLWZsaWdodCBwYXJ0aXRpb25zXG4gICAgY29uc3Qgb3B0cyA9IHJlcGxhY2VtZW50cyA/IHt3aXRoOiByZXBsYWNlbWVudHN9IDoge307XG4gICAgY29uc3QgcGFydHMgPSBtZXRhLnRyYXZlcnNlKG9wdHMpO1xuICAgIHJldHVybiBuZXcgU2V0KHBhcnRzLnZhbHVlcygpKS5zaXplID09PSB0aGlzLm1heFBhcnRpdGlvbnM7XG4gIH1cblxuICByZXF1aXJlRWxpZ2libGVQaXREZXN0aW5hdGlvbihtZXRhOiBNZXRhbG9jYXRpb24pOiBib29sZWFuIHtcbiAgICBsZXQgdiA9IGZhbHNlO1xuICAgIGxldCBoID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgbWV0YS5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncml2ZXInKSB8fCBzY3IuaGFzRmVhdHVyZSgnZW1wdHknKSkgY29udGludWU7XG4gICAgICBjb25zdCBlZGdlcyA9XG4gICAgICAgIChzY3IuZGF0YS5lZGdlcyB8fCAnJykuc3BsaXQoJycpLm1hcCh4ID0+IHggPT09ICcgJyA/ICcnIDogeCk7XG4gICAgICBpZiAoZWRnZXNbMF0gJiYgZWRnZXNbMl0pIHYgPSB0cnVlO1xuICAgICAgLy8gTk9URTogd2UgY2xhbXAgdGhlIHRhcmdldCBYIGNvb3JkcyBzbyB0aGF0IHNwaWtlIHNjcmVlbnMgYXJlIGFsbCBnb29kXG4gICAgICAvLyB0aGlzIHByZXZlbnRzIGVycm9ycyBmcm9tIG5vdCBoYXZpbmcgYSB2aWFibGUgZGVzdGluYXRpb24gc2NyZWVuLlxuICAgICAgaWYgKChlZGdlc1sxXSAmJiBlZGdlc1szXSkgfHwgc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSB7XG4gICAgICAgIGggPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHYgJiYgaCkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNoZWNrTWV0YXNjcmVlbnMobWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMucGFyYW1zLmZlYXR1cmVzPy5zdGF0dWUpIHJldHVybiBPSztcbiAgICBsZXQgc3RhdHVlcyA9IDA7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgbWV0YS5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAgIHN0YXR1ZXMgKz0gc2NyLmRhdGEuc3RhdHVlcz8ubGVuZ3RoIHx8IDA7XG4gICAgfVxuICAgIGlmIChzdGF0dWVzIDwgdGhpcy5wYXJhbXMuZmVhdHVyZXMuc3RhdHVlKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGluc3VmZmljaWVudCBzdGF0dWUgc2NyZWVuc2B9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cbn1cblxuLy8gVE9ETzpcbi8vICAtIHdoZW4gdGhlcmUncyBhIGJyaWRnZSwgbmV3IHJ1bGUgdG8gcmVxdWlyZSBhIHN0YWlyIG9yIHBvaVxuLy8gICAgdG8gYmUgcGFydGl0aW9uZWQgb2ZmIGlmIGJyaWRnZSB0aWxlIGlzIHJlbW92ZWRcbi8vICAtIHBvc3NpYmx5IGFsc28gKmxpbmsqIHRvIG90aGVyIHNjcmVlbj9cbi8vICAtIHBsYWNlIGJyaWRnZSBlYXJseSBvciBsYXRlP1xuLy8gICAgLSBpZiBlYXJseSB0aGVuIG5vIHdheSB0byBlbmZvcmNlIHRocm91Z2huZXNzIHJ1bGVcbi8vICAgIC0gaWYgbGF0ZSB0aGVuIGhhcmQgdG8gc3luYyB1cCB3aXRoIG90aGVyIGZsb29yXG4vLyBBTFNPLCB3ZSBkb24ndCBoYXZlIGEgcmVmIHRvIHRoZSB0aWxlc2V0IHJpZ2h0IG5vdywgZG9uJ3QgZXZlblxuLy8ga25vdyB3aGF0IHRoZSB0aWxlcyBhcmUhICBOZWVkIHRvIG1hcCB0aGUgM3gzIGdyaWQgb2YgKD8/KSB0b1xuLy8gbWV0YXRpbGVzLlxuLy8gIC0gY29uc2lkZXIgdXBkYXRpbmcgXCJlZGdlXCIgdG8gYmUgd2hvbGUgOXg5P1xuLy8gICAgICcgYyAvY2NjLyAgICdcbi8vICAgICBjYXZlKCdjYyBjJywgJ2MnKVxuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8IGMgfFxuLy8gICAgICAgfGNjY3xcbi8vICAgICAgIHwgICB8YCxcbi8vXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHwgICB8XG4vLyAgICAgICB8Y3UgfFxuLy8gICAgICAgfCAgIHxgLFxuLy9cbi8vIEJhc2ljIGlkZWEgd291bGQgYmUgdG8gc2ltcGxpZnkgdGhlIFwiZmVhdHVyZXNcIiBiaXQgcXVpdGUgYSBiaXQsXG4vLyBhbmQgZW5jYXBzdWxhdGUgdGhlIHdob2xlIHRoaW5nIGludG8gdGhlIHRpbGUgLSBlZGdlcywgY29ybmVycywgY2VudGVyLlxuLy9cbi8vIEZvciBvdmVyd29ybGQsICdvJyBtZWFucyBvcGVuLCAnZycgZm9yIGdyYXNzLCBldGMuLi4/XG4vLyAtIHRoZW4gdGhlIGxldHRlcnMgYXJlIGFsd2F5cyB0aGUgd2Fsa2FibGUgdGlsZXMsIHdoaWNoIG1ha2VzIHNlbnNlXG4vLyAgIHNpbmNlIHRob3NlIGFyZSB0aGUgb25lcyB0aGF0IGhhdmUgYWxsIHRoZSB2YXJpZXR5LlxuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8b28gfFxuLy8gICAgICAgfG9vIHxcbi8vICAgICAgIHwgICB8YCxcbi8vICAgICB0aWxlYFxuLy8gICAgICAgfG9vIHxcbi8vICAgICAgIHxvb298XG4vLyAgICAgICB8b2dvfGAsXG5cbi8vIGV4cG9ydCBjbGFzcyBDYXZlU2h1ZmZsZUF0dGVtcHQgZXh0ZW5kcyBNYXplU2h1ZmZsZUF0dGVtcHQge1xuXG4vLyAgIHJlYWRvbmx5IHRpbGVzZXQ6IE1ldGF0aWxlc2V0O1xuLy8gICByZWFkb25seSBncmlkOiBHcmlkPHN0cmluZz47XG4vLyAgIHJlYWRvbmx5IGZpeGVkID0gbmV3IFNldDxHcmlkQ29vcmQ+KCk7XG4vLyAgIHJlYWRvbmx5IHNjcmVlbnM6IHJlYWRvbmx5IEdyaWRDb29yZFtdID0gW107XG4vLyAgIG1ldGEhOiBNZXRhbG9jYXRpb247XG4vLyAgIGNvdW50ID0gMDtcbi8vICAgd2FsbHMgPSAwO1xuLy8gICBicmlkZ2VzID0gMDtcbi8vICAgbWF4UGFydGl0aW9ucyA9IDE7XG4vLyAgIG1pblNwaWtlcyA9IDI7XG5cbi8vICAgY29uc3RydWN0b3IocmVhZG9ubHkgaDogbnVtYmVyLCByZWFkb25seSB3OiBudW1iZXIsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IHBhcmFtczogU3VydmV5LCByZWFkb25seSByYW5kb206IFJhbmRvbSkge1xuLy8gICAgIHN1cGVyKCk7XG4vLyAgICAgdGhpcy5ncmlkID0gbmV3IEdyaWQoaCwgdyk7XG4vLyAgICAgdGhpcy5ncmlkLmRhdGEuZmlsbCgnJyk7XG4vLyAgICAgZm9yIChsZXQgeSA9IDAuNTsgeSA8IGg7IHkrKykge1xuLy8gICAgICAgZm9yIChsZXQgeCA9IDAuNTsgeCA8IHc7IHgrKykge1xuLy8gICAgICAgICBpZiAoeSA+IDEpIHRoaXMuZ3JpZC5zZXQyKHkgLSAwLjUsIHgsICdjJyk7XG4vLyAgICAgICAgIGlmICh4ID4gMSkgdGhpcy5ncmlkLnNldDIoeSwgeCAtIDAuNSwgJ2MnKTtcbi8vICAgICAgICAgdGhpcy5ncmlkLnNldDIoeSwgeCwgJ2MnKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgdGhpcy5jb3VudCA9IGggKiB3O1xuLy8gICAgIGNvbnN0IHNjcmVlbnM6IEdyaWRDb29yZFtdID0gW107XG4vLyAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmg7IHkrKykge1xuLy8gICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnc7IHgrKykge1xuLy8gICAgICAgICBzY3JlZW5zLnB1c2goKHkgPDwgMTIgfCB4IDw8IDQpIGFzIEdyaWRDb29yZCk7XG4vLyAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIHRoaXMuc2NyZWVucyA9IHNjcmVlbnM7XG4vLyAgIH1cblxuXG4gIC8vIGNoZWNrUmVhY2hhYmlsaXR5KHJlcGxhY2U/OiBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KTogYm9vbGVhbiB7XG4gIC8vICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIC8vIH1cblxuXG5leHBvcnQgY2xhc3MgV2lkZUNhdmVTaHVmZmxlIGV4dGVuZHMgQ2F2ZVNodWZmbGUge1xuICBpbml0aWFsRmlsbFR5cGUgPSAndyc7XG4gIHVwRWRnZVR5cGUgPSAnbic7XG4gIHNldFVwRWRnZVR5cGUodDogc3RyaW5nKTogdGhpcyB7XG4gICAgdGhpcy51cEVkZ2VUeXBlID0gdDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIE5PVEU6IEkgZG9uJ3QgdGhpbmsgdGhpcyBpcyBhY3R1YWxseSB1c2VkP1xuICBpc0VsaWdpYmxlQXJlbmEobWlkZGxlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICAvLyBBcmVuYXMgY2FuIG9ubHkgYmUgcGxhY2VkIGluIHRoZSB0b3Agcm93XG4gICAgcmV0dXJuICEobWlkZGxlICYgMHhmMDAwKSAmJiBzdXBlci5pc0VsaWdpYmxlQXJlbmEobWlkZGxlKTtcbiAgfVxuXG4gIC8vIFBhdGNoIGFkZEVkZ2VzIHRvIGFkZCBhcmVuYXMgaW1tZWRpYXRlbHkgYWZ0ZXJ3YXJkcywgc2luY2Ugd2lkZSBjYXZlXG4gIC8vIGFyZW5hcyBjYW4gb25seSBnbyBhbG9uZyB0aGUgdG9wIGVkZ2UuICBXZSBjb3VsZCBwb3NzaWJseSBsaWZ0IHRoaXNcbiAgLy8gcmVxdWlyZW1lbnQgYnkgYWRkaW5nIGFuIGV4dHJhIGFyZW5hIHdpdGggYSB3aWRlIHRvcCBlZGdlLCBpbiB3aGljaCBjYXNlXG4gIC8vIHdlIGNvdWxkIHJlbW92ZSBhbGwgdGhlIGFyZW5hIHNwZWNpYWwgY2FzaW5nLlxuICBhZGRFZGdlcygpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGNvbnN0IGcgPSB0aGlzLmdyaWQ7XG4gICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuYWRkRWRnZXMoKTtcbiAgICBpZiAoIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICBsZXQgYXJlbmFzID0gdGhpcy5wYXJhbXMuZmVhdHVyZXM/LmFyZW5hO1xuICAgIGlmICghYXJlbmFzKSByZXR1cm4gT0s7XG4gICAgY29uc3QgZWRnZXM6IEdyaWRDb29yZFtdID0gW107XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnc7IHgrKykge1xuICAgICAgY29uc3QgYyA9ICh4IDw8IDQgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKGcuZ2V0KGMgLSAweDgwMCBhcyBHcmlkQ29vcmQpKSBlZGdlcy5wdXNoKGMpO1xuICAgIH1cbiAgICBpZiAoZWRnZXMubGVuZ3RoIDwgYXJlbmFzKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYG5vdCBlbm91Z2ggZWRnZXNcXG4ke2cuc2hvdygpfWB9O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGVkZ2Ugb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoZWRnZXMpKSB7XG4gICAgICBpZiAoIWFyZW5hcykgYnJlYWs7XG5cbiAgICAgIGNvbnN0IGxlZnQgPSAoZWRnZSAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGxlZnQyID0gKGxlZnQgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBsZWZ0MyA9IChsZWZ0MiAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGxlZnQyVXAgPSAobGVmdDIgLSAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgbGVmdDJEb3duID0gKGxlZnQyICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gKGVkZ2UgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCByaWdodDMgPSAocmlnaHQyICsgOCkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgcmlnaHQyVXAgPSAocmlnaHQyIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IHJpZ2h0MkRvd24gPSAocmlnaHQyICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmICghZy5pc0JvcmRlcihsZWZ0KSkge1xuICAgICAgICBpZiAoZy5pc0JvcmRlcihsZWZ0MykgJiYgZy5nZXQobGVmdDMpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDJVcCkgJiYgZy5nZXQobGVmdDJVcCkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZy5pc0JvcmRlcihsZWZ0MkRvd24pICYmIGcuZ2V0KGxlZnQyRG93bikpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCFnLmlzQm9yZGVyKHJpZ2h0KSkge1xuICAgICAgICBpZiAoZy5pc0JvcmRlcihyaWdodDMpICYmIGcuZ2V0KHJpZ2h0MykpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZy5pc0JvcmRlcihyaWdodDJVcCkgJiYgZy5nZXQocmlnaHQyVXApKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQyRG93bikgJiYgZy5nZXQocmlnaHQyRG93bikpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5maXhlZC5hZGQoZWRnZSk7XG4gICAgICBnLnNldChlZGdlLCAnYScpO1xuICAgICAgZy5zZXQobGVmdCwgJycpO1xuICAgICAgZy5zZXQobGVmdDIsICcnKTtcbiAgICAgIGcuc2V0KHJpZ2h0LCAnJyk7XG4gICAgICBnLnNldChyaWdodDIsICcnKTtcbiAgICAgIHRoaXMuZ3JpZC5zZXQoZWRnZSwgJ2EnKTtcbiAgICAgIGFyZW5hcy0tO1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICAvLyBBZGRlZCB0aGVtIGFscmVhZHkgZHVyaW5nIGFkZEVkZ2VzLlxuICBhZGRBcmVuYXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENyeXB0RW50cmFuY2VTaHVmZmxlIGV4dGVuZHMgQ2F2ZVNodWZmbGUge1xuICByZWZpbmVNZXRhc2NyZWVucyhtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIGNoYW5nZSBhcmVuYSBpbnRvIGNyeXB0IGFyZW5hXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnc7IHgrKykge1xuICAgICAgICBpZiAodGhpcy5ncmlkLmdldCgoeSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQpID09PSAnYScpIHtcbiAgICAgICAgICBtZXRhLnNldCh5IDw8IDQgfCB4LCBtZXRhLnJvbS5tZXRhc2NyZWVucy5jcnlwdEFyZW5hX3N0YXR1ZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5yZWZpbmVNZXRhc2NyZWVucyhtZXRhKTtcbiAgfVxuXG4gIGlzRWxpZ2libGVBcmVuYShjOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIXRoaXMuZ3JpZC5nZXQoYyAtIDB4ODAwIGFzIEdyaWRDb29yZCkgJiYgc3VwZXIuaXNFbGlnaWJsZUFyZW5hKGMpO1xuICB9XG59XG5cbmNvbnN0IFRJTEVESVIgPSBbMSwgMywgNywgNV07XG5jb25zdCBHUklERElSID0gWy0weDgwMCwgLTgsIDB4ODAwLCA4XTtcblxuLy8gVGhpcyBtaWdodCBjb3ZlciBhbGwgb2YgdHJ5RXh0cnVkZSwgdHJ5Q29udGludWVFeHRydWRlLCB0cnlDb25uZWN0XG4vLyAgLSBjb3VsZCBhbHNvIGZpbmQgYSB3YXkgdG8gYWRkIHRyeUFkZExvb3A/XG5pbnRlcmZhY2UgQWRkT3B0cyB7XG4gIGNoYXI/OiBzdHJpbmc7XG4gIC8vIGxlbmd0aDogbnVtYmVyO1xuICBzdGFydD86IEdyaWRDb29yZDtcbiAgLy8gZW5kOiBHcmlkQ29vcmQ7XG4gIGxvb3A/OiBib29sZWFuOyAvLyBhbGxvdyB2cyByZXF1aXJlP1xuXG4gIGF0dGVtcHRzPzogbnVtYmVyO1xuXG4gIC8vIGJyYW5jaDogYm9vbGVhbjtcbiAgLy8gcmVkdWNlUGFydGl0aW9uczogYm9vbGVhbjsgIC0tIG9yIHByb3ZpZGUgYSBcInNtYXJ0IHBpY2sgc3RhcnQvZW5kXCIgd3JhcHBlclxuXG4gIC8vIFRPRE8gLSBzb21lIGlkZWEgb2Ygd2hldGhlciB0byBwcmVmZXIgZXh0ZW5kaW5nIGFuIGV4aXN0aW5nXG4gIC8vIGRlYWQgZW5kIG9yIG5vdCAtIHRoaXMgd291bGQgcHJvdmlkZSBzb21lIHNvcnQgb2YgXCJicmFuY2hpbmcgZmFjdG9yXCJcbiAgLy8gd2hlcmVieSB3ZSBjYW4gdGlnaHRseSBjb250cm9sIGhvdyBtYW55IGRlYWQgZW5kcyB3ZSBnZXQuLi4/XG4gIC8vIFByb3ZpZGUgYSBcImZpbmQgZGVhZCBlbmRzXCIgZnVuY3Rpb24/XG4gIC8vICAgLSBpbWFnaW5lIGEgdmVyc2lvbiBvZiB3aW5kbWlsbCBjYXZlIHdoZXJlIHdlIHdhbmRlciB0d28gc2NyZWVucyxcbiAgLy8gICAgIHRoZW4gY29ubmVjdCB0aGUgZGVhZCBlbmRzLCB0aGVuIGJyYW5jaCBhbmQgd2FuZGVyIGEgbGl0dGxlIG1vcmU/XG59XG5cbi8vIFRPRE8gLSBwb3RlbnRpYWxseSB3ZSBjb3VsZCBsb29rIGF0IHRoZSB3aG9sZSBwcm9ibGVtXG4vLyBhcyBtYWtpbmcgYSBsaXN0IG9mIGV4dHJ1ZGUvZmVhdHVyZSB0eXBlczpcbi8vICAgLSByLCBjLCBicmFuY2gsIGFyZW5hLCBicmlkZ2UsIHN0YWlyLCAuLi4/XG4vLyBudWNsZWF0ZSB3LyBhbnkgZWRnZXMsIGhhdmUgYSBsaXN0IG9mIHRoZXNlIG9wZXJhdGlvbnMgYW5kIHRoZW5cbi8vIHRyeSBlYWNoIG9uZSwgaWYgaXQgZG9lc24ndCB3b3JrLCByZXNodWZmbGUgaXQgbGF0ZXIgKGZpeGVkICMgb2YgZHJhd3Ncbi8vIGJlZm9yZSBnaXZpbmcgdXApLlxuIl19