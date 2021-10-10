import { Exit, Flag as LocationFlag, Pit, ytDiff, ytAdd, Entrance } from './locationtables.js';
import { hex } from './util.js';
import { DefaultMap, Table, iters, format } from '../util.js';
import { UnionFind } from '../unionfind.js';
import { Monster } from './monster.js';
const [] = [hex];
export class Metalocation {
    constructor(id, tileset, height, width) {
        this.id = id;
        this.tileset = tileset;
        this.customFlags = new Map();
        this.freeFlags = new Set();
        this._pos = undefined;
        this._exits = new Table();
        this._pits = new Map();
        this.rom = tileset.rom;
        this._height = height;
        this._width = width;
        this._screens = new Array(height << 4).fill(tileset.empty);
    }
    static of(location, tileset) {
        var _a, _b, _c;
        const { rom, width, height } = location;
        if (!tileset) {
            const { fortress, labyrinth } = rom.metatilesets;
            const tilesets = new Set();
            for (const ts of rom.metatilesets) {
                if (location.tileset === ts.tileset.id)
                    tilesets.add(ts);
            }
            tilesets.delete(location.id === 0xa9 ? fortress : labyrinth);
            for (const screen of new Set(iters.concat(...location.screens))) {
                for (const tileset of tilesets) {
                    if (!tileset.getMetascreens(screen).length)
                        tilesets.delete(tileset);
                    if (!tilesets.size) {
                        throw new Error(`No tileset for ${hex(screen)} in ${location}`);
                    }
                }
            }
            if (tilesets.size !== 1) {
                throw new Error(`Non-unique tileset for ${location}: [${Array.from(tilesets, t => t.name).join(', ')}]`);
            }
            tileset = [...tilesets][0];
        }
        const reachable = location.reachableTiles(true);
        const reachableScreens = new Set();
        for (const tile of reachable.keys()) {
            reachableScreens.add(tile >>> 8);
        }
        for (const entrance of location.entrances) {
            if (entrance.used)
                reachableScreens.add(entrance.screen);
        }
        for (const exit of location.exits) {
            reachableScreens.add(exit.screen);
            if (exit.isSeamless()) {
                const y = exit.tile >>> 4;
                if (y === 0) {
                    reachable.set((exit.screen - 16) << 8 | 0x88, 1);
                }
                else if (y === 0xe) {
                    reachable.set((exit.screen) << 8 | 0x88, 1);
                }
            }
        }
        const screens = new Array(height << 4).fill(tileset.empty);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const t0 = y << 4 | x;
                const metascreens = tileset.getMetascreens(location.screens[y][x]);
                let metascreen = undefined;
                if (metascreens.length === 1) {
                    metascreen = metascreens[0];
                }
                else if (!metascreens.length) {
                    throw new Error('impossible');
                }
                else {
                    const flag = location.flags.find(f => f.screen === ((y << 4) | x));
                    const matchers = [];
                    const best = [];
                    for (const s of metascreens) {
                        if (s.data.match) {
                            matchers.push(s);
                        }
                        else if (s.flag === 'always' && (flag === null || flag === void 0 ? void 0 : flag.flag) === 0x2fe ||
                            !s.flag && !s.data.wall && !flag) {
                            best.unshift(s);
                        }
                        else {
                            best.push(s);
                        }
                    }
                    if (matchers.length) {
                        function reach(dy, dx) {
                            const x0 = (x << 8) + dx;
                            const y0 = (y << 8) + dy;
                            const t = (y0 << 4) & 0xf000 | x0 & 0xf00 | y0 & 0xf0 | (x0 >> 4) & 0xf;
                            return reachable.has(t);
                        }
                        for (const matcher of matchers) {
                            if (!matcher.data.match(reach, flag != null))
                                continue;
                            metascreen = matcher;
                            break;
                        }
                    }
                    if (!metascreen)
                        metascreen = best[0];
                }
                if (!metascreen)
                    throw new Error('impossible');
                screens[t0] = metascreen;
            }
        }
        const exits = new Table();
        let entrance0;
        for (const exit of location.exits) {
            if (exit.dest === 0xff)
                continue;
            let srcPos = exit.screen;
            let tile = exit.tile;
            if (exit.isSeamless() && !(exit.yt & 0xf) &&
                (location.id & 0x58) !== 0x58) {
                srcPos -= 16;
                tile |= 0xf0;
            }
            if (!reachableScreens.has(srcPos))
                throw new Error('impossible?');
            const srcScreen = screens[srcPos];
            const srcExit = srcScreen.findExitType(tile, height === 1, !!(exit.entrance & 0x20));
            const srcType = srcExit === null || srcExit === void 0 ? void 0 : srcExit.type;
            if (!srcType) {
                const id = location.id << 16 | srcPos << 8 | exit.tile;
                if (unknownExitWhitelist.has(id))
                    continue;
                const all = (_a = srcScreen.data.exits) === null || _a === void 0 ? void 0 : _a.map(e => e.type + ': ' + e.exits.map(hex).join(', ')).join('\n  ');
                console.warn(`Unknown exit ${hex(exit.tile)}: ${srcScreen.name} in ${location} @ ${hex(srcPos)}:\n  ${all}`);
                continue;
            }
            if (exits.has(srcPos, srcType))
                continue;
            const dest = rom.locations[exit.dest];
            if (srcType.startsWith('seamless')) {
                const down = srcType === 'seamless:down';
                const tile = srcExit.exits[0] + (down ? -16 : 16);
                const destPos = srcPos + (tile < 0 ? -16 : 0);
                const destType = down ? 'seamless:up' : 'seamless:down';
                exits.set(srcPos, srcType, [dest.id << 8 | destPos, destType]);
                continue;
            }
            const entrance = dest.entrances[exit.entrance & 0x1f];
            let destPos = entrance.screen;
            let destCoord = entrance.coord;
            if (srcType === 'door' && (entrance.y & 0xf0) === 0) {
                destPos -= 0x10;
                destCoord += 0x10000;
            }
            const destScrId = dest.screens[destPos >> 4][destPos & 0xf];
            const destType = findEntranceType(dest, destScrId, destCoord);
            if (!destType) {
                const lines = [];
                for (const destScr of rom.metascreens.getById(destScrId, dest.tileset)) {
                    for (const exit of (_b = destScr.data.exits) !== null && _b !== void 0 ? _b : []) {
                        if (exit.type.startsWith('seamless'))
                            continue;
                        lines.push(`  ${destScr.name} ${exit.type}: ${hex(exit.entrance)}`);
                    }
                }
                console.warn(`Bad entrance ${hex(destCoord)}: raw ${hex(destScrId)} in ${dest} @ ${hex(destPos)}\n${lines.join('\n')}`);
                continue;
            }
            exits.set(srcPos, srcType, [dest.id << 8 | destPos, destType]);
            if (location.entrances[0].screen === srcPos) {
                const coord = location.entrances[0].coord;
                const exit = srcScreen.findExitByType(srcType);
                if (((exit.entrance & 0xff) - (coord & 0xff)) ** 2 +
                    ((exit.entrance >>> 8) - (coord >>> 8)) ** 2 <= 0x400) {
                    entrance0 = srcType;
                }
            }
        }
        const pits = new Map();
        for (const pit of location.pits) {
            pits.set(pit.fromScreen, pit.dest << 8 | pit.toScreen);
        }
        const metaloc = new Metalocation(location.id, tileset, height, width);
        metaloc._screens = screens;
        metaloc._exits = exits;
        metaloc._entrance0 = entrance0;
        metaloc._pits = pits;
        for (const f of location.flags) {
            const scr = metaloc._screens[f.screen];
            if ((_c = scr.flag) === null || _c === void 0 ? void 0 : _c.startsWith('custom')) {
                metaloc.customFlags.set(f.screen, rom.flags[f.flag]);
            }
            else if (!scr.flag) {
                metaloc.freeFlags.add(rom.flags[f.flag]);
            }
        }
        return metaloc;
        function findEntranceType(dest, scrId, coord) {
            for (const destScr of rom.metascreens.getById(scrId, dest.tileset)) {
                const type = destScr.findEntranceType(coord, dest.height === 1);
                if (type != null)
                    return type;
            }
            return undefined;
        }
    }
    getUid(pos) {
        return this._screens[pos].uid;
    }
    get(pos) {
        return this._screens[pos];
    }
    get width() {
        return this._width;
    }
    set width(width) {
        this._width = width;
        this._pos = undefined;
    }
    get height() {
        return this._height;
    }
    set height(height) {
        if (this._height > height) {
            this._screens.splice((height + 2) << 4, (this._height - height) << 4);
        }
        else if (this._height < height) {
            this._screens.length = (height + 2) << 4;
            this._screens.fill(this.tileset.empty, (this.height + 2) << 4, this._screens.length);
        }
        this._height = height;
        this._pos = undefined;
    }
    allPos() {
        if (this._pos)
            return this._pos;
        const p = this._pos = [];
        for (let y = 0; y < this._height; y++) {
            for (let x = 0; x < this._width; x++) {
                p.push(y << 4 | x);
            }
        }
        return p;
    }
    set(pos, scr) {
        this._screens[pos] = scr !== null && scr !== void 0 ? scr : this.tileset.empty;
    }
    inBounds(pos) {
        return (pos & 15) < this.width && pos >= 0 && pos >>> 4 < this.height;
    }
    set2d(pos, screens) {
        for (const row of screens) {
            let dx = 0;
            for (const scr of row) {
                if (scr)
                    this.set(pos + dx, scr);
                dx++;
            }
            pos += 16;
        }
    }
    validate() {
        for (const dir of [0, 1]) {
            for (let y = dir ? 0 : 1; y < this.height; y++) {
                for (let x = dir; x < this.width; x++) {
                    const pos0 = y << 4 | x;
                    const scr0 = this._screens[pos0];
                    const pos1 = pos0 - (dir ? 1 : 16);
                    const scr1 = this._screens[pos1];
                    if (scr0.isEmpty())
                        continue;
                    if (scr1.isEmpty())
                        continue;
                    if (!scr0.checkNeighbor(scr1, dir)) {
                        throw new Error(format('bad neighbor %s (%02x) %s %s (%02x)', scr1.name, pos1, DIR_NAME[dir], scr0.name, pos0));
                    }
                }
            }
        }
        return true;
    }
    spliceColumns(left, deleted, inserted, screens) {
        for (let p = 0; p < this._screens.length; p += 16) {
            this._screens.copyWithin(p + left + inserted, p + left + deleted, p + 10);
            this._screens.splice(p + left, inserted, ...screens[p >> 4]);
        }
        const delta = inserted - deleted;
        this.width += delta;
        this._pos = undefined;
        const move = [];
        for (const [pos, type] of this._exits) {
            const x = pos & 0xf;
            if (x < left + deleted) {
                if (x >= left)
                    this._exits.delete(pos, type);
                continue;
            }
            move.push([pos, type, pos + delta, type]);
        }
        this.moveExits(...move);
        const parent = this.rom.locations[this.id];
        const xt0 = (left + deleted) << 4;
        for (const spawn of parent.spawns) {
            if (spawn.xt < xt0)
                continue;
            spawn.xt -= (delta << 4);
        }
        for (const flag of parent.flags) {
            if (flag.xs < left + deleted) {
                if (flag.xs >= left)
                    flag.screen = 0xff;
                continue;
            }
            flag.xs -= delta;
        }
        parent.flags = parent.flags.filter(f => f.screen !== 0xff);
    }
    setExit(pos, type, spec) {
        const other = this.rom.locations[spec[0] >>> 8].meta;
        if (!other)
            throw new Error(`Cannot set two-way exit without meta`);
        this.setExitOneWay(pos, type, spec);
        other.setExitOneWay(spec[0] & 0xff, spec[1], [this.id << 8 | pos, type]);
    }
    setExitOneWay(pos, type, spec) {
        this._exits.set(pos, type, spec);
    }
    deleteExit(pos, type) {
        this._exits.delete(pos, type);
    }
    getExit(pos, type) {
        return this._exits.get(pos, type);
    }
    exits() {
        return this._exits;
    }
    exitCandidates(type) {
        var _a;
        const hasExit = [];
        for (const scr of this.tileset) {
            if ((_a = scr.data.exits) === null || _a === void 0 ? void 0 : _a.some(e => e.type === type))
                hasExit.push(scr);
        }
        return hasExit;
    }
    show() {
        var _a, _b;
        const lines = [];
        let line = [];
        for (let x = 0; x < this.width; x++) {
            line.push(x.toString(16));
        }
        lines.push('   ' + line.join('  '));
        for (let y = 0; y < this.height; y++) {
            for (let r = 0; r < 3; r++) {
                line = [r === 1 ? y.toString(16) : ' ', ' '];
                for (let x = 0; x < this.width; x++) {
                    const screen = this._screens[y << 4 | x];
                    line.push((_b = (_a = screen === null || screen === void 0 ? void 0 : screen.data.icon) === null || _a === void 0 ? void 0 : _a.full[r]) !== null && _b !== void 0 ? _b : (r === 1 ? ' ? ' : '   '));
                }
                lines.push(line.join(''));
            }
        }
        return lines.join('\n');
    }
    screenNames() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = [];
            for (let x = 0; x < this.width; x++) {
                const screen = this._screens[y << 4 | x];
                line.push(screen === null || screen === void 0 ? void 0 : screen.name);
            }
            lines.push(line.join(' '));
        }
        return lines.join('\n');
    }
    traverse(opts = {}) {
        var _a, _b;
        const uf = new UnionFind();
        const connectionType = (opts.flight ? 2 : 0) | (opts.noFlagged ? 1 : 0);
        for (const pos of this.allPos()) {
            const scr = (_b = (_a = opts.with) === null || _a === void 0 ? void 0 : _a.get(pos)) !== null && _b !== void 0 ? _b : this._screens[pos];
            for (const segment of scr.connections[connectionType]) {
                if (!segment.length)
                    continue;
                uf.union(segment.map(c => (pos << 8) + c));
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
    exitType(edge) {
        var _a;
        if ((edge & 0xf0) !== 0xe0)
            return;
        const pos = edge >>> 8;
        const scr = this.get(pos);
        const type = (_a = scr.data.exits) === null || _a === void 0 ? void 0 : _a[edge & 0xf].type;
        if (!(type === null || type === void 0 ? void 0 : type.startsWith('edge:')))
            return type;
        if (type === 'edge:top' && (pos >>> 4))
            return;
        if (type === 'edge:bottom' && (pos >>> 4) === this.height - 1)
            return;
        if (type === 'edge:left' && (pos & 0xf))
            return;
        if (type === 'edge:bottom' && (pos & 0xf) === this.width - 1)
            return;
        return type;
    }
    poiTile(edge) {
        throw new Error('not implemented');
    }
    static connect(rom, a, b) {
        const locA = rom.locations[a[0] >>> 8].meta;
        const locB = rom.locations[b[0] >>> 8].meta;
        locA.attach(a[0] & 0xff, locB, b[0] & 0xff, a[1], b[1]);
    }
    static findExitTiles(rom, exit) {
        const loc = rom.locations[exit[0] >>> 8];
        const scr = loc.meta._screens[exit[0] & 0xff];
        const con = scr.findExitByType(exit[1]);
        return con.exits.map(tile => tile | (exit[0] & 0xff) << 8);
    }
    attach(srcPos, dest, destPos, srcType, destType) {
        if (!srcType)
            srcType = this.pickTypeFromExits(srcPos);
        if (!destType)
            destType = dest.pickTypeFromExits(destPos);
        const destTile = dest.id << 8 | destPos;
        const srcTile = this.id << 8 | srcPos;
        const prevDest = this._exits.get(srcPos, srcType);
        const prevSrc = dest._exits.get(destPos, destType);
        if (prevDest && prevSrc) {
            const [prevDestTile, prevDestType] = prevDest;
            const [prevSrcTile, prevSrcType] = prevSrc;
            if (prevDestTile === destTile && prevDestType === destType &&
                prevSrcTile === srcTile && prevSrcType === srcType) {
                return;
            }
        }
        this._exits.set(srcPos, srcType, [destTile, destType]);
        dest._exits.set(destPos, destType, [srcTile, srcType]);
        if (prevSrc && prevDest) {
            const [prevDestTile, prevDestType] = prevDest;
            const [prevSrcTile, prevSrcType] = prevSrc;
            const prevSrcMeta = this.rom.locations[prevSrcTile >> 8].meta;
            const prevDestMeta = this.rom.locations[prevDestTile >> 8].meta;
            prevSrcMeta._exits.set(prevSrcTile & 0xff, prevSrcType, prevDest);
            prevDestMeta._exits.set(prevDestTile & 0xff, prevDestType, prevSrc);
        }
        else if (prevSrc || prevDest) {
            const [prevTile, prevType] = (prevSrc || prevDest);
            if ((prevTile !== srcTile || prevType !== srcType) &&
                (prevTile !== destTile || prevType !== destType)) {
                const prevMeta = this.rom.locations[prevTile >> 8].meta;
                prevMeta._exits.delete(prevTile & 0xff, prevType);
            }
        }
    }
    pickTypeFromExits(pos) {
        const types = [...this._exits.row(pos).keys()];
        if (!types.length)
            return this.pickTypeFromScreens(pos);
        if (types.length > 1) {
            throw new Error(`No single type for ${hex(pos)}: [${types.join(', ')}]`);
        }
        return types[0];
    }
    moveExits(...moves) {
        const newExits = [];
        for (const [oldPos, oldType, newPos, newType] of moves) {
            const destExit = this._exits.get(oldPos, oldType);
            const [destTile, destType] = destExit;
            const dest = this.rom.locations[destTile >> 8].meta;
            dest._exits.set(destTile & 0xff, destType, [this.id << 8 | newPos, newType]);
            newExits.push([newPos, newType, destExit]);
            this._exits.delete(oldPos, oldType);
        }
        for (const [pos, type, exit] of newExits) {
            this._exits.set(pos, type, exit);
        }
    }
    moveExit(prev, next, prevType, nextType) {
        if (!prevType)
            prevType = this.pickTypeFromExits(prev);
        if (!nextType)
            nextType = this.pickTypeFromScreens(next);
        const destExit = this._exits.get(prev, prevType);
        const [destTile, destType] = destExit;
        const dest = this.rom.locations[destTile >> 8].meta;
        dest._exits.set(destTile & 0xff, destType, [this.id << 8 | next, nextType]);
        this._exits.set(next, nextType, destExit);
        this._exits.delete(prev, prevType);
    }
    moveExitsAndPitsTo(other) {
        const moved = new Set();
        for (const pos of other.allPos()) {
            if (!other.get(pos).data.delete) {
                moved.add(pos);
            }
        }
        for (const [pos, type, [destTile, destType]] of this._exits) {
            if (!moved.has(pos))
                continue;
            const dest = this.rom.locations[destTile >>> 8].meta;
            dest._exits.set(destTile & 0xff, destType, [other.id << 8 | pos, type]);
            other._exits.set(pos, type, [destTile, destType]);
            this._exits.delete(pos, type);
        }
        for (const [from, to] of this._pits) {
            if (!moved.has(from))
                continue;
            other._pits.set(from, to);
            this._pits.delete(from);
        }
    }
    pickTypeFromScreens(pos) {
        const exits = this._screens[pos].data.exits;
        const types = (exits !== null && exits !== void 0 ? exits : []).map(e => e.type);
        if (types.length !== 1) {
            throw new Error(`No single type for ${hex(pos)}: [${types.join(', ')}]`);
        }
        return types[0];
    }
    transferFlags(orig, random) {
        var _a;
        this.freeFlags = new Set(orig.freeFlags);
        const customs = new DefaultMap(() => []);
        for (const [pos, flag] of orig.customFlags) {
            customs.get(orig._screens[pos]).push(flag);
        }
        for (const flags of customs.values())
            random.shuffle(flags);
        for (const pos of this.allPos()) {
            const scr = this._screens[pos];
            if ((_a = scr.flag) === null || _a === void 0 ? void 0 : _a.startsWith('custom')) {
                const flag = customs.get(scr).pop();
                if (!flag) {
                    throw new Error(`No flag for ${scr.name} at ${this.rom.locations[this.id]} @${hex(pos)}`);
                }
                this.customFlags.set(pos, flag);
            }
        }
    }
    transferPits(orig) {
        this._pits = orig._pits;
    }
    shufflePits(random) {
        var _a;
        if (!this._pits.size)
            return;
        const dests = new Set();
        for (const [, dest] of this._pits) {
            dests.add(this.rom.locations[dest >>> 8].id);
        }
        this._pits.clear();
        const pits = new DefaultMap(() => []);
        for (const pos of this.allPos()) {
            const scr = this.get(pos);
            if (!scr.hasFeature('pit'))
                continue;
            let closest = [-1, this, Infinity];
            for (const [exitPos, , [dest]] of this._exits) {
                const dist = distance(pos, exitPos);
                if (dests.has(dest >>> 8) && dist < closest[2]) {
                    const dloc = this.rom.locations[dest >>> 8].meta;
                    const dpos = dest & 0xff;
                    closest = [addDelta(pos, dpos, exitPos, dloc), dloc, dist];
                }
            }
            if (closest[0] >= 0)
                pits.get(closest[1]).push([pos, closest[0]]);
        }
        for (const dest of dests) {
            const list = pits.get(this.rom.locations[dest].meta);
            if (!list.length)
                list.push([0, 0xf0]);
        }
        for (const [dest, list] of pits) {
            const eligible = [[], []];
            const spikes = new Map();
            for (const pos of dest.allPos()) {
                const scr = dest.get(pos);
                if (scr.hasFeature('river') || scr.hasFeature('empty'))
                    continue;
                const edges = (scr.data.edges || '').split('').map(x => x === ' ' ? '' : x);
                if (edges[0] && edges[2])
                    eligible[0].push(pos);
                if ((edges[1] && edges[3]) || scr.hasFeature('spikes')) {
                    eligible[1].push(pos);
                }
                if (scr.hasFeature('spikes')) {
                    spikes.set(pos, [...edges].filter(c => c === 's').length);
                }
            }
            let delta = [0, 0];
            for (const [upstairs, downstairs] of list) {
                const scr = this.get(upstairs);
                const edges = scr.data.edges || '';
                const dir = edges[1] === 'c' && edges[3] === 'c' ? 1 : 0;
                let closest = [-1, Infinity, 0];
                const target = addDelta(downstairs, delta[0], delta[1], dest);
                for (const pos of eligible[dir]) {
                    const spikeCount = (_a = spikes.get(pos)) !== null && _a !== void 0 ? _a : 0;
                    if (spikeCount < closest[2])
                        continue;
                    const dist = distance(target, pos);
                    if (dist < closest[1]) {
                        closest = [pos, dist, spikeCount];
                    }
                }
                const endPos = closest[0];
                if (endPos < 0)
                    throw new Error(`no eligible dest`);
                delta = [endPos, target];
                this._pits.set(upstairs, dest.id << 8 | endPos);
            }
        }
    }
    transferExits(orig, random) {
        var _a;
        const exits = new DefaultMap(() => []);
        const selfExits = new DefaultMap(() => new Set());
        for (const pos of this.allPos()) {
            const scr = this._screens[pos];
            for (const { type } of (_a = scr.data.exits) !== null && _a !== void 0 ? _a : []) {
                if (type === 'edge:top' && (pos >>> 4))
                    continue;
                if (type === 'edge:left' && (pos & 0xf))
                    continue;
                if (type === 'edge:bottom' && (pos >>> 4) < this.height - 1)
                    continue;
                if (type === 'edge:right' && (pos & 0xf) < this.width - 1)
                    continue;
                exits.get(type).push(pos);
            }
        }
        for (const arr of exits.values()) {
            random.shuffle(arr);
        }
        for (const [opos, type, exit] of orig._exits) {
            if (selfExits.get(type).has(opos))
                continue;
            const pos = exits.get(type).pop();
            if (pos == null) {
                throw new Error(`Could not transfer exit ${type} in ${this.rom.locations[this.id]}: no eligible screen\n${this.show()}`);
            }
            const eloc = this.rom.locations[exit[0] >>> 8].meta;
            const epos = exit[0] & 0xff;
            const etype = exit[1];
            if (eloc === orig) {
                const npos = exits.get(etype).pop();
                if (npos == null)
                    throw new Error(`Impossible`);
                this._exits.set(pos, type, [this.id << 8 | npos, etype]);
                this._exits.set(npos, etype, [this.id << 8 | pos, type]);
                selfExits.get(etype).add(epos);
                continue;
            }
            const ret = eloc._exits.get(epos, etype);
            if (!ret) {
                const eeloc = this.rom.locations[exit[0] >>> 8];
                console.log(eloc);
                throw new Error(`No exit for ${eeloc} at ${hex(epos)} ${etype}\n${eloc.show()}\n${this.rom.locations[this.id]} at ${hex(opos)} ${type}\n${this.show()}`);
            }
            if ((ret[0] >>> 8) === this.id && ((ret[0] & 0xff) === opos) &&
                ret[1] === type) {
                eloc._exits.set(epos, etype, [this.id << 8 | pos, type]);
            }
            this._exits.set(pos, type, exit);
        }
    }
    transferSpawns(that, random) {
        var _a, _b, _c;
        const reverseExits = new Map();
        const pits = new Map();
        const statues = [];
        const map = [];
        const walls = [];
        const bridges = [];
        const arenas = [];
        for (const loc of [this, that]) {
            for (const pos of loc.allPos()) {
                const scr = loc._screens[pos];
                const y = pos & 0xf0;
                const x = (pos & 0xf) << 4;
                if (scr.hasFeature('pit') && loc === this) {
                    pits.set(pos, scr.edgeIndex('c') === 5 ? 0 : 1);
                }
                else if (((_a = scr.data.statues) === null || _a === void 0 ? void 0 : _a.length) && loc === this) {
                    for (let i = 0; i < scr.data.statues.length; i++) {
                        const row = scr.data.statues[i] << 12;
                        const parity = ((pos & 0xf) ^ (pos >>> 4) ^ i) & 1;
                        const col = parity ? 0x50 : 0xa0;
                        statues.push([pos, row | col]);
                    }
                }
                if (loc === this && scr.hasFeature('wall')) {
                    if (scr.data.wall == null)
                        throw new Error(`Missing wall prop`);
                    const wall = [y | (scr.data.wall >> 4), x | (scr.data.wall & 0xf)];
                    walls.push(wall);
                    if (scr.data.tilesets.lime)
                        walls.push([wall[0] - 1, wall[1]]);
                }
                else if (loc === this && scr.hasFeature('bridge')) {
                    if (scr.data.wall == null)
                        throw new Error(`Missing wall prop`);
                    bridges.push([y | (scr.data.wall >> 4), x | (scr.data.wall & 0xf)]);
                }
                if (!scr.hasFeature('arena'))
                    continue;
                if (loc === this) {
                    arenas.push([y | 8, x | 8]);
                }
                else {
                    const [ny, nx] = arenas.pop();
                    map.push([y | 8, x | 8, ny, nx, 144, 'arena']);
                }
            }
            if (loc === this) {
                random.shuffle(arenas);
                random.shuffle(statues);
            }
        }
        for (const loc of [this, that]) {
            for (const [pos, type, exit] of loc._exits) {
                const scr = loc._screens[pos];
                const spec = (_b = scr.data.exits) === null || _b === void 0 ? void 0 : _b.find(e => e.type === type);
                if (!spec)
                    throw new Error(`Invalid exit: ${scr.name} ${type}`);
                const x0 = pos & 0xf;
                const y0 = pos >>> 4;
                const x1 = spec.exits[0] & 0xf;
                const y1 = spec.exits[0] >>> 4;
                if (loc === this) {
                    reverseExits.set(exit, [y0 << 4 | y1, x0 << 4 | x1]);
                }
                else if ((exit[0] >>> 8) !== this.id) {
                    const [ny, nx] = reverseExits.get(exit);
                    map.push([y0 << 4 | y1, x0 << 4 | x1, ny, nx, 25, 'exit']);
                }
            }
        }
        const ppoi = [[], [], [], [], [], []];
        for (const pos of this.allPos()) {
            const scr = this._screens[pos];
            for (const [p, dy = 0x70, dx = 0x78] of (_c = scr.data.poi) !== null && _c !== void 0 ? _c : []) {
                const y = ((pos & 0xf0) << 4) + dy;
                const x = ((pos & 0x0f) << 8) + dx;
                ppoi[p].push([y, x]);
            }
        }
        for (const poi of ppoi) {
            random.shuffle(poi);
        }
        const allPoi = [...iters.concat(...ppoi)];
        const loc = this.rom.locations[this.id];
        for (const spawn of random.ishuffle(loc.spawns)) {
            if (spawn.isMonster()) {
                const platform = PLATFORMS.indexOf(spawn.monsterId);
                if (platform >= 0 && pits.size) {
                    const [[pos, dir]] = pits;
                    pits.delete(pos);
                    spawn.monsterId = PLATFORMS[platform & 2 | dir];
                    spawn.screen = pos;
                    spawn.tile = dir ? 0x73 : 0x47;
                }
                else if (spawn.monsterId === 0x8f && statues.length) {
                    const [screen, coord] = statues.pop();
                    spawn.screen = screen;
                    spawn.coord = coord;
                }
                continue;
            }
            else if (spawn.isWall()) {
                const wall = (spawn.wallType() === 'bridge' ? bridges : walls).pop();
                if (!wall) {
                    throw new Error(`Not enough ${spawn.wallType()} screens in new metalocation: ${loc}\n${this.show()}`);
                }
                const [y, x] = wall;
                spawn.yt = y;
                spawn.xt = x;
                continue;
            }
            else if (spawn.isNpc() || spawn.isBoss() || spawn.isTrigger() ||
                spawn.isGeneric()) {
                let best = [-1, -1, Infinity];
                for (const [y0, x0, y1, x1, dmax, typ] of map) {
                    if (typ !== 'arena' && spawn.isBoss())
                        continue;
                    const d = (ytDiff(spawn.yt, y0)) ** 2 + (spawn.xt - x0) ** 2;
                    if (d <= dmax && d < best[2]) {
                        best = [ytAdd(spawn.yt, ytDiff(y1, y0)), spawn.xt + x1 - x0, d];
                    }
                }
                if (Number.isFinite(best[2])) {
                    [spawn.yt, spawn.xt] = best;
                    continue;
                }
            }
            if (spawn.isTrigger() || spawn.isBoss()) {
                throw new Error(`Could not place ${loc} ${spawn.isBoss() ? 'Boss' : 'Trigger'} ${spawn.hex()}\n${this.show()}`);
            }
            const next = allPoi.shift();
            if (!next)
                throw new Error(`Ran out of POI for ${loc}`);
            const [y, x] = next;
            console.error(`Weird map addition: ${loc} ${spawn.hex()}`);
            map.push([spawn.y >>> 4, spawn.x >>> 4, y >>> 4, x >>> 4, 4, '???']);
            spawn.y = y;
            spawn.x = x;
        }
    }
    reconcileExits(that) {
        const add = [];
        const del = [];
        for (const loc of [this, that]) {
            for (const [pos, type, [destTile, destType]] of loc._exits) {
                if (destType.startsWith('seamless'))
                    continue;
                const dest = this.rom.locations[destTile >>> 8];
                const reverse = dest.meta._exits.get(destTile & 0xff, destType);
                if (reverse) {
                    const [revTile, revType] = reverse;
                    if ((revTile >>> 8) === loc.id && (revTile & 0xff) === pos &&
                        revType === type) {
                        add.push([loc === this ? that : this, pos, type,
                            [destTile, destType]]);
                        continue;
                    }
                }
                del.push([loc, pos, type]);
            }
        }
        for (const [loc, pos, type] of del) {
            loc._exits.delete(pos, type);
        }
        for (const [loc, pos, type, exit] of add) {
            loc._exits.set(pos, type, exit);
        }
    }
    writeEntrance0() {
        if (!this._entrance0)
            return;
        for (const [pos, type] of this._exits) {
            if (type !== this._entrance0)
                continue;
            const exit = this._screens[pos].findExitByType(type);
            this.rom.locations[this.id].entrances[0] =
                Entrance.of({ screen: pos, coord: exit.entrance });
            return;
        }
    }
    write() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const srcLoc = this.rom.locations[this.id];
        const seamlessPos = new Set();
        for (const [srcPos, srcType, [destTile, destType]] of this._exits) {
            const srcScreen = this._screens[srcPos];
            const dest = destTile >> 8;
            let destPos = destTile & 0xff;
            const destLoc = this.rom.locations[dest];
            const destMeta = destLoc.meta;
            const destScreen = destMeta._screens[destTile & 0xff];
            const srcExit = (_a = srcScreen.data.exits) === null || _a === void 0 ? void 0 : _a.find(e => e.type === srcType);
            const destExit = (_b = destScreen.data.exits) === null || _b === void 0 ? void 0 : _b.find(e => e.type === destType);
            if (!srcExit || !destExit) {
                throw new Error(`Missing ${srcExit ? 'dest' : 'source'} exit:
  From: ${srcLoc} @ ${hex(srcPos)}:${srcType} ${srcScreen.name}
  To:   ${destLoc} @ ${hex(destPos)}:${destType} ${destScreen.name}`);
            }
            let entrance = 0x20;
            if (destExit.type.startsWith('seamless')) {
                seamlessPos.add(srcPos);
            }
            else {
                let destCoord = destExit.entrance;
                if (destCoord > 0xefff) {
                    destPos += 0x10;
                    destCoord -= 0x10000;
                }
                entrance = destLoc.findOrAddEntrance(destPos, destCoord);
            }
            for (let tile of srcExit.exits) {
                let screen = srcPos;
                if ((tile & 0xf0) === 0xf0) {
                    screen += 0x10;
                    tile &= 0xf;
                }
                srcLoc.exits.push(Exit.of({ screen, tile, dest, entrance }));
            }
        }
        srcLoc.width = this._width;
        srcLoc.height = this._height;
        srcLoc.screens = [];
        for (let y = 0; y < this._height; y++) {
            const row = [];
            srcLoc.screens.push(row);
            for (let x = 0; x < this._width; x++) {
                row.push(this._screens[y << 4 | x].sid);
            }
        }
        srcLoc.tileset = this.tileset.tilesetId;
        srcLoc.tileEffects = this.tileset.effects().id;
        const uf = new UnionFind();
        for (const pos of this.allPos()) {
            if (seamlessPos.has(pos))
                continue;
            const scr = this._screens[pos];
            const below = pos + 16;
            const right = pos + 1;
            if (!seamlessPos.has(below) && ((_d = (_c = scr.data.edges) === null || _c === void 0 ? void 0 : _c[2]) !== null && _d !== void 0 ? _d : ' ') !== ' ') {
                uf.union([pos, below]);
            }
            if (!seamlessPos.has(right) && ((_f = (_e = scr.data.edges) === null || _e === void 0 ? void 0 : _e[3]) !== null && _f !== void 0 ? _f : ' ') !== ' ') {
                uf.union([pos, right]);
            }
            uf.union([pos]);
        }
        const reachableMap = uf.map();
        const reachable = new Set();
        for (const [srcPos] of this._exits) {
            for (const pos of (_g = reachableMap.get(srcPos)) !== null && _g !== void 0 ? _g : []) {
                reachable.add(pos);
            }
        }
        srcLoc.flags = [];
        const freeFlags = [...this.freeFlags];
        for (const screen of this.allPos()) {
            const scr = this._screens[screen];
            let flag;
            if (scr.data.wall != null && reachable.has(screen)) {
                flag = (_j = (_h = freeFlags.pop()) === null || _h === void 0 ? void 0 : _h.id) !== null && _j !== void 0 ? _j : this.rom.flags.alloc(0x200);
            }
            else if (scr.flag === 'always') {
                flag = this.rom.flags.AlwaysTrue.id;
            }
            else if (scr.flag === 'calm') {
                flag = this.rom.flags.CalmedAngrySea.id;
            }
            else if (scr.flag === 'custom:false') {
                flag = (_k = this.customFlags.get(screen)) === null || _k === void 0 ? void 0 : _k.id;
            }
            else if (scr.flag === 'custom:true') {
                flag = (_m = (_l = this.customFlags.get(screen)) === null || _l === void 0 ? void 0 : _l.id) !== null && _m !== void 0 ? _m : this.rom.flags.AlwaysTrue.id;
            }
            if (flag != null) {
                srcLoc.flags.push(LocationFlag.of({ screen, flag }));
            }
        }
        srcLoc.pits = [];
        for (const [fromScreen, to] of this._pits) {
            const toScreen = to & 0xff;
            const dest = to >>> 8;
            srcLoc.pits.push(Pit.of({ fromScreen, toScreen, dest }));
        }
    }
    replaceMonsters(random) {
        if (this.id === 0x68)
            return;
        const loc = this.rom.locations[this.id];
        const placer = loc.monsterPlacer(random);
        for (const spawn of loc.spawns) {
            if (!spawn.used)
                continue;
            if (!spawn.isMonster())
                continue;
            const monster = loc.rom.objects[spawn.monsterId];
            if (!(monster instanceof Monster))
                continue;
            const pos = placer(monster);
            if (pos == null) {
                console.error(`no valid location for ${hex(monster.id)} in ${loc}`);
                spawn.used = false;
            }
            else {
                spawn.screen = pos >>> 8;
                spawn.tile = pos & 0xff;
            }
        }
    }
}
const unknownExitWhitelist = new Set([
    0x01003a,
    0x01003b,
    0x1540a0,
    0x1a3060,
    0x402000,
    0x402030,
    0x4180d0,
    0x6087bf,
    0xa10326,
    0xa10329,
    0xa90626,
    0xa90629,
]);
const DIR_NAME = ['above', 'left of', 'below', 'right of'];
function distance(a, b) {
    return ((a >>> 4) - (b >>> 4)) ** 2 + ((a & 0xf) - (b & 0xf)) ** 2;
}
function addDelta(start, plus, minus, meta) {
    const px = plus & 0xf;
    const py = plus >>> 4;
    const mx = minus & 0xf;
    const my = minus >>> 4;
    const sx = start & 0xf;
    const sy = start >>> 4;
    const ox = Math.max(0, Math.min(meta.width - 1, sx + px - mx));
    const oy = Math.max(0, Math.min(meta.height - 1, sy + py - my));
    return oy << 4 | ox;
}
const PLATFORMS = [0x7e, 0x7f, 0x9f, 0x8d];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBSS9GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFaEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBc0NqQixNQUFNLE9BQU8sWUFBWTtJQW1DdkIsWUFBcUIsRUFBVSxFQUFXLE9BQW9CLEVBQ2xELE1BQWMsRUFBRSxLQUFhO1FBRHBCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBN0I5RCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFDbkMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFRLENBQUM7UUFPcEIsU0FBSSxHQUFvQixTQUFTLENBQUM7UUFFbEMsV0FBTSxHQUFHLElBQUksS0FBSyxFQUFpQyxDQUFDO1FBR3BELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBa0JyQyxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFB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QUM7SUFDdkIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEUsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN0QixDQUFDO0FBR0QsTUFBTSxTQUFTLEdBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2NhdGlvbiB9IGZyb20gJy4vbG9jYXRpb24uanMnOyAvLyBpbXBvcnQgdHlwZVxuaW1wb3J0IHsgRXhpdCwgRmxhZyBhcyBMb2NhdGlvbkZsYWcsIFBpdCwgeXREaWZmLCB5dEFkZCwgRW50cmFuY2UgfSBmcm9tICcuL2xvY2F0aW9udGFibGVzLmpzJztcbmltcG9ydCB7IEZsYWcgfSBmcm9tICcuL2ZsYWdzLmpzJztcbmltcG9ydCB7IE1ldGFzY3JlZW4sIFVpZCB9IGZyb20gJy4vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQgeyBNZXRhdGlsZXNldCB9IGZyb20gJy4vbWV0YXRpbGVzZXQuanMnO1xuaW1wb3J0IHsgaGV4IH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7IFJvbSB9IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQgeyBEZWZhdWx0TWFwLCBUYWJsZSwgaXRlcnMsIGZvcm1hdCB9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHsgVW5pb25GaW5kIH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7IENvbm5lY3Rpb25UeXBlIH0gZnJvbSAnLi9tZXRhc2NyZWVuZGF0YS5qcyc7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbi8vIE1vZGVsIG9mIGEgbG9jYXRpb24gd2l0aCBtZXRhc2NyZWVucywgZXRjLlxuXG4vLyBUcmljazogd2UgbmVlZCBzb21ldGhpbmcgdG8gb3duIHRoZSBuZWlnaGJvciBjYWNoZS5cbi8vICAtIHByb2JhYmx5IHRoaXMgYmVsb25ncyBpbiB0aGUgTWV0YXRpbGVzZXQuXG4vLyAgLSBtZXRob2QgdG8gcmVnZW5lcmF0ZSwgZG8gaXQgYWZ0ZXIgdGhlIHNjcmVlbiBtb2RzP1xuLy8gRGF0YSB3ZSB3YW50IHRvIGtlZXAgdHJhY2sgb2Y6XG4vLyAgLSBnaXZlbiB0d28gc2NyZWVucyBhbmQgYSBkaXJlY3Rpb24sIGNhbiB0aGV5IGFidXQ/XG4vLyAgLSBnaXZlbiBhIHNjcmVlbiBhbmQgYSBkaXJlY3Rpb24sIHdoYXQgc2NyZWVucyBvcGVuL2Nsb3NlIHRoYXQgZWRnZT9cbi8vICAgIC0gd2hpY2ggb25lIGlzIHRoZSBcImRlZmF1bHRcIj9cblxuLy8gVE9ETyAtIGNvbnNpZGVyIGFic3RyYWN0aW5nIGV4aXRzIGhlcmU/XG4vLyAgLSBleGl0czogQXJyYXk8W0V4aXRTcGVjLCBudW1iZXIsIEV4aXRTcGVjXT5cbi8vICAtIEV4aXRTcGVjID0ge3R5cGU/OiBDb25uZWN0aW9uVHlwZSwgc2NyPzogbnVtYmVyfVxuLy8gSG93IHRvIGhhbmRsZSBjb25uZWN0aW5nIHRoZW0gY29ycmVjdGx5P1xuLy8gIC0gc2ltcGx5IHNheWluZyBcIi0+IHdhdGVyZmFsbCB2YWxsZXkgY2F2ZVwiIGlzIG5vdCBoZWxwZnVsIHNpbmNlIHRoZXJlJ3MgMlxuLy8gICAgb3IgXCItPiB3aW5kIHZhbGxleSBjYXZlXCIgd2hlbiB0aGVyZSdzIDUuXG4vLyAgLSB1c2Ugc2NySWQgYXMgdW5pcXVlIGlkZW50aWZpZXI/ICBvbmx5IHByb2JsZW0gaXMgc2VhbGVkIGNhdmUgaGFzIDMuLi5cbi8vICAtIG1vdmUgdG8gZGlmZmVyZW50IHNjcmVlbiBhcyBuZWNlc3NhcnkuLi5cbi8vICAgIChjb3VsZCBhbHNvIGp1c3QgZGl0Y2ggdGhlIG90aGVyIHR3byBhbmQgdHJlYXQgd2luZG1pbGwgZW50cmFuY2UgYXNcbi8vICAgICBhIGRvd24gZW50cmFuY2UgLSBzYW1lIHcvIGxpZ2h0aG91c2U/KVxuLy8gIC0gb25seSBhIHNtYWxsIGhhbmRmdWxsIG9mIGxvY2F0aW9ucyBoYXZlIGRpc2Nvbm5lY3RlZCBjb21wb25lbnRzOlxuLy8gICAgICB3aW5kbWlsbCwgbGlnaHRob3VzZSwgcHlyYW1pZCwgZ29hIGJhY2tkb29yLCBzYWJlcmEsIHNhYnJlL2h5ZHJhIGxlZGdlc1xuLy8gIC0gd2UgcmVhbGx5IGRvIGNhcmUgd2hpY2ggaXMgaW4gd2hpY2ggY29tcG9uZW50LlxuLy8gICAgYnV0IG1hcCBlZGl0cyBtYXkgY2hhbmdlIGV2ZW4gdGhlIG51bWJlciBvZiBjb21wb25lbnRzPz8/XG4vLyAgLSBkbyB3ZSBkbyBlbnRyYW5jZSBzaHVmZmxlIGZpcnN0IG9yIG1hcCBzaHVmZmxlIGZpcnN0P1xuLy8gICAgb3IgYXJlIHRoZXkgaW50ZXJsZWF2ZWQ/IT9cbi8vICAgIGlmIHdlIHNodWZmbGUgc2FicmUgb3ZlcndvcmxkIHRoZW4gd2UgbmVlZCB0byBrbm93IHdoaWNoIGNhdmVzIGNvbm5lY3Rcbi8vICAgIHRvIHdoaWNoLi4uIGFuZCBwb3NzaWJseSBjaGFuZ2UgdGhlIGNvbm5lY3Rpb25zP1xuLy8gICAgLSBtYXkgbmVlZCBsZWV3YXkgdG8gYWRkL3N1YnRyYWN0IGNhdmUgZXhpdHM/P1xuLy8gUHJvYmxlbSBpcyB0aGF0IGVhY2ggZXhpdCBpcyBjby1vd25lZCBieSB0d28gbWV0YWxvY2F0aW9ucy5cblxuXG5leHBvcnQgdHlwZSBQb3MgPSBudW1iZXI7XG5leHBvcnQgdHlwZSBMb2NQb3MgPSBudW1iZXI7IC8vIGxvY2F0aW9uIDw8IDggfCBwb3NcbmV4cG9ydCB0eXBlIEV4aXRTcGVjID0gcmVhZG9ubHkgW0xvY1BvcywgQ29ubmVjdGlvblR5cGVdO1xuXG5leHBvcnQgY2xhc3MgTWV0YWxvY2F0aW9uIHtcblxuICAvLyBUT0RPIC0gc3RvcmUgbWV0YWRhdGEgYWJvdXQgd2luZG1pbGwgZmxhZz8gIHR3byBtZXRhbG9jcyB3aWxsIG5lZWQgYSBwb3MgdG9cbiAgLy8gaW5kaWNhdGUgd2hlcmUgdGhhdCBmbGFnIHNob3VsZCBnby4uLj8gIE9yIHN0b3JlIGl0IGluIHRoZSBtZXRhc2NyZWVuP1xuXG4gIC8vIENhdmVzIGFyZSBhc3N1bWVkIHRvIGJlIGFsd2F5cyBvcGVuIHVubGVzcyB0aGVyZSdzIGEgZmxhZyBzZXQgaGVyZS4uLlxuICBjdXN0b21GbGFncyA9IG5ldyBNYXA8UG9zLCBGbGFnPigpO1xuICBmcmVlRmxhZ3MgPSBuZXcgU2V0PEZsYWc+KCk7XG5cbiAgcmVhZG9ubHkgcm9tOiBSb207XG5cbiAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gIHByaXZhdGUgX3dpZHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBfcG9zOiBQb3NbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgcHJpdmF0ZSBfZXhpdHMgPSBuZXcgVGFibGU8UG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWM+KCk7XG4gIC8vcHJpdmF0ZSBfZW50cmFuY2VzID0gbmV3IERlZmF1bHRNYXA8Q29ubmVjdGlvblR5cGUsIFNldDxudW1iZXI+PigoKSA9PiBuZXcgU2V0KCkpO1xuICBwcml2YXRlIF9lbnRyYW5jZTA/OiBDb25uZWN0aW9uVHlwZTtcbiAgcHJpdmF0ZSBfcGl0cyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7IC8vIE1hcHMgdG8gbG9jIDw8IDggfCBwb3NcblxuICAvL3ByaXZhdGUgX21vbnN0ZXJzSW52YWxpZGF0ZWQgPSBmYWxzZTtcblxuICAvKiogS2V5OiAoeTw8NCl8eCAqL1xuICBwcml2YXRlIF9zY3JlZW5zOiBNZXRhc2NyZWVuW107XG5cbiAgLy8gTk9URToga2VlcGluZyB0cmFjayBvZiByZWFjaGFiaWxpdHkgaXMgaW1wb3J0YW50IGJlY2F1c2Ugd2hlbiB3ZVxuICAvLyBkbyB0aGUgc3VydmV5IHdlIG5lZWQgdG8gb25seSBjb3VudCBSRUFDSEFCTEUgdGlsZXMhICBTZWFtbGVzc1xuICAvLyBwYWlycyBhbmQgYnJpZGdlcyBjYW4gY2F1c2UgbG90cyBvZiBpbXBvcnRhbnQtdG8tcmV0YWluIHVucmVhY2hhYmxlXG4gIC8vIHRpbGVzLiAgTW9yZW92ZXIsIHNvbWUgZGVhZC1lbmQgdGlsZXMgY2FuJ3QgYWN0dWFsbHkgYmUgd2Fsa2VkIG9uLlxuICAvLyBGb3Igbm93IHdlJ2xsIGp1c3QgemVybyBvdXQgZmVhdHVyZSBtZXRhc2NyZWVucyB0aGF0IGFyZW4ndFxuICAvLyByZWFjaGFibGUsIHNpbmNlIHRyeWluZyB0byBkbyBpdCBjb3JyZWN0bHkgcmVxdWlyZXMgc3RvcmluZ1xuICAvLyByZWFjaGFiaWxpdHkgYXQgdGhlIHRpbGUgbGV2ZWwgKGFnYWluIGR1ZSB0byBicmlkZ2UgZG91YmxlIHN0YWlycykuXG4gIC8vIHByaXZhdGUgX3JlYWNoYWJsZTogVWludDhBcnJheXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgaWQ6IG51bWJlciwgcmVhZG9ubHkgdGlsZXNldDogTWV0YXRpbGVzZXQsXG4gICAgICAgICAgICAgIGhlaWdodDogbnVtYmVyLCB3aWR0aDogbnVtYmVyKSB7XG4gICAgdGhpcy5yb20gPSB0aWxlc2V0LnJvbTtcbiAgICB0aGlzLl9oZWlnaHQgPSBoZWlnaHQ7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLl9zY3JlZW5zID0gbmV3IEFycmF5KGhlaWdodCA8PCA0KS5maWxsKHRpbGVzZXQuZW1wdHkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIG91dCBhIG1ldGFsb2NhdGlvbiBmcm9tIHRoZSBnaXZlbiBsb2NhdGlvbi4gIEluZmVyIHRoZVxuICAgKiB0aWxlc2V0IGlmIHBvc3NpYmxlLCBvdGhlcndpc2UgaXQgbXVzdCBiZSBleHBsaWNpdGx5IHNwZWNpZmllZC5cbiAgICovXG4gIHN0YXRpYyBvZihsb2NhdGlvbjogTG9jYXRpb24sIHRpbGVzZXQ/OiBNZXRhdGlsZXNldCk6IE1ldGFsb2NhdGlvbiB7XG4gICAgY29uc3Qge3JvbSwgd2lkdGgsIGhlaWdodH0gPSBsb2NhdGlvbjtcbiAgICBpZiAoIXRpbGVzZXQpIHtcbiAgICAgIC8vIEluZmVyIHRoZSB0aWxlc2V0LiAgU3RhcnQgYnkgYWRkaW5nIGFsbCBjb21wYXRpYmxlIG1ldGF0aWxlc2V0cy5cbiAgICAgIGNvbnN0IHtmb3J0cmVzcywgbGFieXJpbnRofSA9IHJvbS5tZXRhdGlsZXNldHM7XG4gICAgICBjb25zdCB0aWxlc2V0cyA9IG5ldyBTZXQ8TWV0YXRpbGVzZXQ+KCk7XG4gICAgICBmb3IgKGNvbnN0IHRzIG9mIHJvbS5tZXRhdGlsZXNldHMpIHtcbiAgICAgICAgaWYgKGxvY2F0aW9uLnRpbGVzZXQgPT09IHRzLnRpbGVzZXQuaWQpIHRpbGVzZXRzLmFkZCh0cyk7XG4gICAgICB9XG4gICAgICAvLyBJdCdzIGltcG9zc2libGUgdG8gZGlzdGluZ3Vpc2ggZm9ydHJlc3MgYW5kIGxhYnlyaW50aCwgc28gd2UgaGFyZGNvZGVcbiAgICAgIC8vIGl0IGJhc2VkIG9uIGxvY2F0aW9uOiBvbmx5ICRhOSBpcyBsYWJ5cmludGguXG4gICAgICB0aWxlc2V0cy5kZWxldGUobG9jYXRpb24uaWQgPT09IDB4YTkgPyBmb3J0cmVzcyA6IGxhYnlyaW50aCk7XG4gICAgICAvLyBGaWx0ZXIgb3V0IGFueSB0aWxlc2V0cyB0aGF0IGRvbid0IGluY2x1ZGUgbmVjZXNzYXJ5IHNjcmVlbiBpZHMuXG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiBuZXcgU2V0KGl0ZXJzLmNvbmNhdCguLi5sb2NhdGlvbi5zY3JlZW5zKSkpIHtcbiAgICAgICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRpbGVzZXRzKSB7XG4gICAgICAgICAgaWYgKCF0aWxlc2V0LmdldE1ldGFzY3JlZW5zKHNjcmVlbikubGVuZ3RoKSB0aWxlc2V0cy5kZWxldGUodGlsZXNldCk7XG4gICAgICAgICAgaWYgKCF0aWxlc2V0cy5zaXplKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHRpbGVzZXQgZm9yICR7aGV4KHNjcmVlbil9IGluICR7bG9jYXRpb259YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodGlsZXNldHMuc2l6ZSAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgdGlsZXNldCBmb3IgJHtsb2NhdGlvbn06IFske1xuICAgICAgICAgICAgICAgICAgICAgICAgIEFycmF5LmZyb20odGlsZXNldHMsIHQgPT4gdC5uYW1lKS5qb2luKCcsICcpfV1gKTtcbiAgICAgIH1cbiAgICAgIHRpbGVzZXQgPSBbLi4udGlsZXNldHNdWzBdO1xuICAgIH1cblxuICAgIC8vIFRyYXZlcnNlIHRoZSBsb2NhdGlvbiBmb3IgYWxsIHRpbGVzIHJlYWNoYWJsZSBmcm9tIGFuIGVudHJhbmNlLlxuICAgIC8vIFRoaXMgaXMgdXNlZCB0byBpbmZvcm0gd2hpY2ggbWV0YXNjcmVlbiB0byBzZWxlY3QgZm9yIHNvbWUgb2YgdGhlXG4gICAgLy8gcmVkdW5kYW50IG9uZXMgKGkuZS4gZG91YmxlIGRlYWQgZW5kcykuICBUaGlzIGlzIGEgc2ltcGxlIHRyYXZlcnNhbFxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IGxvY2F0aW9uLnJlYWNoYWJsZVRpbGVzKHRydWUpOyAvLyB0cmF2ZXJzZVJlYWNoYWJsZSgweDA0KTtcbiAgICBjb25zdCByZWFjaGFibGVTY3JlZW5zID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIHJlYWNoYWJsZS5rZXlzKCkpIHtcbiAgICAgIHJlYWNoYWJsZVNjcmVlbnMuYWRkKHRpbGUgPj4+IDgpO1xuICAgICAgLy9yZWFjaGFibGVTY3JlZW5zLmFkZCgodGlsZSAmIDB4ZjAwMCkgPj4+IDggfCAodGlsZSAmIDB4ZjApID4+PiA0KTtcbiAgICB9XG4gICAgLy8gTk9URTogc29tZSBlbnRyYW5jZXMgYXJlIG9uIGltcGFzc2FibGUgdGlsZXMgYnV0IHdlIHN0aWxsIGNhcmUgYWJvdXRcbiAgICAvLyB0aGUgc2NyZWVucyB1bmRlciB0aGVtIChlLmcuIGJvYXQgYW5kIHNob3AgZW50cmFuY2VzKS4gIEFsc28gbWFrZSBzdXJlXG4gICAgLy8gdG8gaGFuZGxlIHRoZSBzZWFtbGVzcyB0b3dlciBleGl0cy5cbiAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIGxvY2F0aW9uLmVudHJhbmNlcykge1xuICAgICAgaWYgKGVudHJhbmNlLnVzZWQpIHJlYWNoYWJsZVNjcmVlbnMuYWRkKGVudHJhbmNlLnNjcmVlbik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgcmVhY2hhYmxlU2NyZWVucy5hZGQoZXhpdC5zY3JlZW4pO1xuICAgICAgaWYgKGV4aXQuaXNTZWFtbGVzcygpKSB7XG4gICAgICAgIC8vIEhhbmRsZSBzZWFtbGVzcyBleGl0cyBvbiBzY3JlZW4gZWRnZXM6IG1hcmsgX2p1c3RfIHRoZSBuZWlnaGJvclxuICAgICAgICAvLyBzY3JlZW4gYXMgcmVhY2hhYmxlIChpbmNsdWRpbmcgZGVhZCBjZW50ZXIgdGlsZSBmb3IgbWF0Y2gpLlxuICAgICAgICBjb25zdCB5ID0gZXhpdC50aWxlID4+PiA0O1xuICAgICAgICBpZiAoeSA9PT0gMCkge1xuICAgICAgICAgIHJlYWNoYWJsZS5zZXQoKGV4aXQuc2NyZWVuIC0gMTYpIDw8IDggfCAweDg4LCAxKTtcbiAgICAgICAgfSBlbHNlIGlmICh5ID09PSAweGUpIHtcbiAgICAgICAgICAvLyBUT0RPIC0gd2h5IGRvZXMgKzE2IG5vdCB3b3JrIGhlcmU/XG4gICAgICAgICAgcmVhY2hhYmxlLnNldCgoZXhpdC5zY3JlZW4gLyorIDE2Ki8pIDw8IDggfCAweDg4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvL2NvbnN0IGV4aXQgPSB0aWxlc2V0LmV4aXQ7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBBcnJheTxNZXRhc2NyZWVuPihoZWlnaHQgPDwgNCkuZmlsbCh0aWxlc2V0LmVtcHR5KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3QgdDAgPSB5IDw8IDQgfCB4O1xuICAgICAgICBjb25zdCBtZXRhc2NyZWVucyA9IHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMobG9jYXRpb24uc2NyZWVuc1t5XVt4XSk7XG4gICAgICAgIGxldCBtZXRhc2NyZWVuOiBNZXRhc2NyZWVufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG1ldGFzY3JlZW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIG1ldGFzY3JlZW4gPSBtZXRhc2NyZWVuc1swXTtcbiAgICAgICAgfSBlbHNlIGlmICghbWV0YXNjcmVlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbXBvc3NpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVE9PRCAtIGZpbHRlciBiYXNlZCBvbiB3aG8gaGFzIGEgbWF0Y2ggZnVuY3Rpb24sIG9yIG1hdGNoaW5nIGZsYWdzXG4gICAgICAgICAgY29uc3QgZmxhZyA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gKCh5IDw8IDQpIHwgeCkpO1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXJzOiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICAgICAgICBjb25zdCBiZXN0OiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWV0YXNjcmVlbnMpIHtcbiAgICAgICAgICAgIGlmIChzLmRhdGEubWF0Y2gpIHtcbiAgICAgICAgICAgICAgbWF0Y2hlcnMucHVzaChzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocy5mbGFnID09PSAnYWx3YXlzJyAmJiBmbGFnPy5mbGFnID09PSAweDJmZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAhcy5mbGFnICYmICFzLmRhdGEud2FsbCAmJiAhZmxhZykge1xuICAgICAgICAgICAgICBiZXN0LnVuc2hpZnQocyk7IC8vIGZyb250LWxvYWQgbWF0Y2hpbmcgZmxhZ3NcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGJlc3QucHVzaChzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1hdGNoZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZnVuY3Rpb24gcmVhY2goZHk6IG51bWJlciwgZHg6IG51bWJlcikge1xuICAgICAgICAgICAgICBjb25zdCB4MCA9ICh4IDw8IDgpICsgZHg7XG4gICAgICAgICAgICAgIGNvbnN0IHkwID0gKHkgPDwgOCkgKyBkeTtcbiAgICAgICAgICAgICAgY29uc3QgdCA9XG4gICAgICAgICAgICAgICAgICAoeTAgPDwgNCkgJiAweGYwMDAgfCB4MCAmIDB4ZjAwIHwgeTAgJiAweGYwIHwgKHgwID4+IDQpICYgMHhmO1xuICAgICAgICAgICAgICByZXR1cm4gcmVhY2hhYmxlLmhhcyh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgbWF0Y2hlciBvZiBtYXRjaGVycykge1xuICAgICAgICAgICAgICBpZiAoIW1hdGNoZXIuZGF0YS5tYXRjaCEocmVhY2gsIGZsYWcgIT0gbnVsbCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICBtZXRhc2NyZWVuID0gbWF0Y2hlcjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghbWV0YXNjcmVlbikgbWV0YXNjcmVlbiA9IGJlc3RbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtZXRhc2NyZWVuKSB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGUnKTtcbiAgICAgICAgLy8gaWYgKChtZXRhc2NyZWVuLmRhdGEuZXhpdHMgfHwgbWV0YXNjcmVlbi5kYXRhLndhbGwpICYmXG4gICAgICAgIC8vICAgICAhcmVhY2hhYmxlU2NyZWVucy5oYXModDApICYmXG4gICAgICAgIC8vICAgICB0aWxlc2V0ICE9PSByb20ubWV0YXRpbGVzZXRzLnRvd2VyKSB7XG4gICAgICAgIC8vICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHN1cnZleSB1bnJlYWNoYWJsZSBzY3JlZW5zIChhbmQgaXQncyBoYXJkIHRvXG4gICAgICAgIC8vICAgLy8gdG8gZmlndXJlIG91dCB3aGljaCBpcyB3aGljaCBsYXRlcikuICBNYWtlIHN1cmUgbm90IHRvIGRvIHRoaXMgZm9yXG4gICAgICAgIC8vICAgLy8gdG93ZXIgYmVjYXVzZSBvdGhlcndpc2UgaXQnbGwgY2xvYmJlciBpbXBvcnRhbnQgcGFydHMgb2YgdGhlIG1hcC5cbiAgICAgICAgLy8gICBtZXRhc2NyZWVuID0gdGlsZXNldC5lbXB0eTtcbiAgICAgICAgLy8gfVxuICAgICAgICBzY3JlZW5zW3QwXSA9IG1ldGFzY3JlZW47XG4gICAgICAgIC8vIC8vIElmIHdlJ3JlIG9uIHRoZSBib3JkZXIgYW5kIGl0J3MgYW4gZWRnZSBleGl0IHRoZW4gY2hhbmdlIHRoZSBib3JkZXJcbiAgICAgICAgLy8gLy8gc2NyZWVuIHRvIHJlZmxlY3QgYW4gZXhpdC5cbiAgICAgICAgLy8gY29uc3QgZWRnZXMgPSBtZXRhc2NyZWVuLmVkZ2VFeGl0cygpO1xuICAgICAgICAvLyBpZiAoeSA9PT0gMCAmJiAoZWRnZXMgJiAxKSkgc2NyZWVuc1t0MCAtIDE2XSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh4ID09PSAwICYmIChlZGdlcyAmIDIpKSBzY3JlZW5zW3QwIC0gMV0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeSA9PT0gaGVpZ2h0ICYmIChlZGdlcyAmIDQpKSBzY3JlZW5zW3QwICsgMTZdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHggPT09IHdpZHRoICYmIChlZGdlcyAmIDgpKSBzY3JlZW5zW3QwICsgMV0gPSBleGl0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgZXhpdHNcbiAgICBjb25zdCBleGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcbiAgICBsZXQgZW50cmFuY2UwOiBDb25uZWN0aW9uVHlwZXx1bmRlZmluZWQ7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC5kZXN0ID09PSAweGZmKSBjb250aW51ZTtcbiAgICAgIGxldCBzcmNQb3MgPSBleGl0LnNjcmVlbjtcbiAgICAgIGxldCB0aWxlID0gZXhpdC50aWxlO1xuICAgICAgLy8gS2Vuc3UgYXJlbmEgZXhpdCBpcyBkZWNsYXJlZCBhdCB5PWYsIGJ1dCB0aGUgZXhpdCdzIGFjdHVhbCBzY3JlZW5cbiAgICAgIC8vIGluIHRoZSByb20gd2lsbCBiZSBzdG9yZWQgYXMgdGhlIHNjcmVlbiBiZW5lYXRoLiAgU2FtZSB0aGluZyBnb2VzXG4gICAgICAvLyBmb3IgdGhlIHRvd2VyIGVzY2FsYXRvcnMsIGJ1dCBpbiB0aG9zZSBjYXNlcywgd2UgYWxyZWFkeSBhZGRlZFxuICAgICAgLy8gdGhlIGNvcnJlc3BvbmRpbmcgZXhpdCBvbiB0aGUgcGFpcmVkIHNjcmVlbiwgc28gd2UgZG9uJ3QgbmVlZCB0byBmaXguXG4gICAgICBpZiAoZXhpdC5pc1NlYW1sZXNzKCkgJiYgIShleGl0Lnl0ICYgMHhmKSAmJlxuICAgICAgICAgIChsb2NhdGlvbi5pZCAmIDB4NTgpICE9PSAweDU4KSB7XG4gICAgICAgIHNyY1BvcyAtPSAxNjtcbiAgICAgICAgdGlsZSB8PSAweGYwO1xuICAgICAgfVxuICAgICAgaWYgKCFyZWFjaGFibGVTY3JlZW5zLmhhcyhzcmNQb3MpKSB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGU/Jyk7XG4gICAgICBjb25zdCBzcmNTY3JlZW4gPSBzY3JlZW5zW3NyY1Bvc107XG4gICAgICBjb25zdCBzcmNFeGl0ID0gc3JjU2NyZWVuLmZpbmRFeGl0VHlwZSh0aWxlLCBoZWlnaHQgPT09IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAhIShleGl0LmVudHJhbmNlICYgMHgyMCkpO1xuICAgICAgY29uc3Qgc3JjVHlwZSA9IHNyY0V4aXQ/LnR5cGU7XG4gICAgICBpZiAoIXNyY1R5cGUpIHtcbiAgICAgICAgY29uc3QgaWQgPSBsb2NhdGlvbi5pZCA8PCAxNiB8IHNyY1BvcyA8PCA4IHwgZXhpdC50aWxlO1xuICAgICAgICBpZiAodW5rbm93bkV4aXRXaGl0ZWxpc3QuaGFzKGlkKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGFsbCA9IHNyY1NjcmVlbi5kYXRhLmV4aXRzPy5tYXAoXG4gICAgICAgICAgICBlID0+IGUudHlwZSArICc6ICcgKyBlLmV4aXRzLm1hcChoZXgpLmpvaW4oJywgJykpLmpvaW4oJ1xcbiAgJyk7XG4gICAgICAgIGNvbnNvbGUud2FybihgVW5rbm93biBleGl0ICR7aGV4KGV4aXQudGlsZSl9OiAke3NyY1NjcmVlbi5uYW1lfSBpbiAke1xuICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9ufSBAICR7aGV4KHNyY1Bvcyl9OlxcbiAgJHthbGx9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGV4aXRzLmhhcyhzcmNQb3MsIHNyY1R5cGUpKSBjb250aW51ZTsgLy8gYWxyZWFkeSBoYW5kbGVkXG4gICAgICBjb25zdCBkZXN0ID0gcm9tLmxvY2F0aW9uc1tleGl0LmRlc3RdO1xuICAgICAgaWYgKHNyY1R5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICBjb25zdCBkb3duID0gc3JjVHlwZSA9PT0gJ3NlYW1sZXNzOmRvd24nO1xuICAgICAgICAvLyBOT1RFOiB0aGlzIHNlZW1zIHdyb25nIC0gdGhlIGRvd24gZXhpdCBpcyBCRUxPVyB0aGUgdXAgZXhpdC4uLj9cbiAgICAgICAgY29uc3QgdGlsZSA9IHNyY0V4aXQhLmV4aXRzWzBdICsgKGRvd24gPyAtMTYgOiAxNik7XG4gICAgICAgIC8vY29uc3QgZGVzdFBvcyA9IHNyY1BvcyArICh0aWxlIDwgMCA/IC0xNiA6IHRpbGUgPj0gMHhmMCA/IDE2IDogLTApO1xuICAgICAgICAvLyBOT1RFOiBib3R0b20tZWRnZSBzZWFtbGVzcyBpcyB0cmVhdGVkIGFzIGRlc3RpbmF0aW9uIGYwXG4gICAgICAgIGNvbnN0IGRlc3RQb3MgPSBzcmNQb3MgKyAodGlsZSA8IDAgPyAtMTYgOiAwKTtcbiAgICAgICAgY29uc3QgZGVzdFR5cGUgPSBkb3duID8gJ3NlYW1sZXNzOnVwJyA6ICdzZWFtbGVzczpkb3duJztcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgJHtzcmNUeXBlfSAke2hleChsb2NhdGlvbi5pZCl9ICR7ZG93bn0gJHtoZXgodGlsZSl9ICR7aGV4KGRlc3RQb3MpfSAke2Rlc3RUeXBlfSAke2hleChkZXN0LmlkKX1gKTtcbiAgICAgICAgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZW50cmFuY2UgPSBkZXN0LmVudHJhbmNlc1tleGl0LmVudHJhbmNlICYgMHgxZl07XG4gICAgICBsZXQgZGVzdFBvcyA9IGVudHJhbmNlLnNjcmVlbjtcbiAgICAgIGxldCBkZXN0Q29vcmQgPSBlbnRyYW5jZS5jb29yZDtcbiAgICAgIGlmIChzcmNUeXBlID09PSAnZG9vcicgJiYgKGVudHJhbmNlLnkgJiAweGYwKSA9PT0gMCkge1xuICAgICAgICAvLyBOT1RFOiBUaGUgaXRlbSBzaG9wIGRvb3IgaW4gT2FrIHN0cmFkZGxlcyB0d28gc2NyZWVucyAoZXhpdCBpcyBvblxuICAgICAgICAvLyB0aGUgTlcgc2NyZWVuIHdoaWxlIGVudHJhbmNlIGlzIG9uIFNXIHNjcmVlbikuICBEbyBhIHF1aWNrIGhhY2sgdG9cbiAgICAgICAgLy8gZGV0ZWN0IHRoaXMgKHByb3h5aW5nIFwiZG9vclwiIGZvciBcInVwd2FyZCBleGl0XCIpIGFuZCBhZGp1c3Qgc2VhcmNoXG4gICAgICAgIC8vIHRhcmdldCBhY2NvcmRpbmdseS5cbiAgICAgICAgZGVzdFBvcyAtPSAweDEwO1xuICAgICAgICBkZXN0Q29vcmQgKz0gMHgxMDAwMDtcbiAgICAgIH1cbiAgICAgIC8vIEZpZ3VyZSBvdXQgdGhlIGNvbm5lY3Rpb24gdHlwZSBmb3IgdGhlIGRlc3RUaWxlLlxuICAgICAgY29uc3QgZGVzdFNjcklkID0gZGVzdC5zY3JlZW5zW2Rlc3RQb3MgPj4gNF1bZGVzdFBvcyAmIDB4Zl07XG4gICAgICBjb25zdCBkZXN0VHlwZSA9IGZpbmRFbnRyYW5jZVR5cGUoZGVzdCwgZGVzdFNjcklkLCBkZXN0Q29vcmQpO1xuICAgICAgLy8gTk9URTogaW5pdGlhbCBzcGF3biBoYXMgbm8gdHlwZS4uLj9cbiAgICAgIGlmICghZGVzdFR5cGUpIHtcbiAgICAgICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBkZXN0U2NyIG9mIHJvbS5tZXRhc2NyZWVucy5nZXRCeUlkKGRlc3RTY3JJZCwgZGVzdC50aWxlc2V0KSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZXhpdCBvZiBkZXN0U2NyLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgICAgICAgIGlmIChleGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkgY29udGludWU7XG4gICAgICAgICAgICBsaW5lcy5wdXNoKGAgICR7ZGVzdFNjci5uYW1lfSAke2V4aXQudHlwZX06ICR7aGV4KGV4aXQuZW50cmFuY2UpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLndhcm4oYEJhZCBlbnRyYW5jZSAke2hleChkZXN0Q29vcmQpfTogcmF3ICR7aGV4KGRlc3RTY3JJZClcbiAgICAgICAgICAgICAgICAgICAgICB9IGluICR7ZGVzdH0gQCAke2hleChkZXN0UG9zKX1cXG4ke2xpbmVzLmpvaW4oJ1xcbicpfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuXG4gICAgICBpZiAobG9jYXRpb24uZW50cmFuY2VzWzBdLnNjcmVlbiA9PT0gc3JjUG9zKSB7XG4gICAgICAgIGNvbnN0IGNvb3JkID0gbG9jYXRpb24uZW50cmFuY2VzWzBdLmNvb3JkO1xuICAgICAgICBjb25zdCBleGl0ID0gc3JjU2NyZWVuLmZpbmRFeGl0QnlUeXBlKHNyY1R5cGUpO1xuICAgICAgICBpZiAoKChleGl0LmVudHJhbmNlICYgMHhmZikgLSAoY29vcmQgJiAweGZmKSkgKiogMiArXG4gICAgICAgICAgICAoKGV4aXQuZW50cmFuY2UgPj4+IDgpIC0gKGNvb3JkID4+PiA4KSkgKiogMiA8PSAweDQwMCkge1xuICAgICAgICAgIC8vIE5PVEU6IGZvciBzaW5nbGUtaGVpZ2h0IG1hcHMsIHRoZXJlIG1heSBiZSBhIDItdGlsZSBvZmZzZXQgYmV0d2VlblxuICAgICAgICAgIC8vIHRoZSBleHBlY3RlZCBhbmQgYWN0dWFsIGxvY2F0aW9uIG9mIGEgYm90dG9tIGVudHJhbmNlLlxuICAgICAgICAgIGVudHJhbmNlMCA9IHNyY1R5cGU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gLy8gRmluZCB0aGUgZW50cmFuY2UgaW5kZXggZm9yIGVhY2ggZXhpdCBhbmQgc3RvcmUgaXQgc2VwYXJhdGVseS5cbiAgICAgIC8vIC8vIE5PVEU6IHdlIGNvdWxkIHByb2JhYmx5IGRvIHRoaXMgTyhuKSB3aXRoIGEgc2luZ2xlIGZvciBsb29wP1xuICAgICAgLy8gbGV0IGNsb3Nlc3RFbnRyYW5jZSA9IC0xO1xuICAgICAgLy8gbGV0IGNsb3Nlc3REaXN0ID0gSW5maW5pdHk7XG4gICAgICAvLyBmb3IgKGxldCBpID0gMDsgaSA8IGxvY2F0aW9uLmVudHJhbmNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gICBpZiAobG9jYXRpb24uZW50cmFuY2VzW2ldLnNjcmVlbiAhPT0gc3JjUG9zKSBjb250aW51ZTtcbiAgICAgIC8vICAgY29uc3QgdGlsZSA9IGxvY2F0aW9uLmVudHJhbmNlc1tpXS50aWxlO1xuICAgICAgLy8gICBmb3IgKGNvbnN0IGV4aXQgb2Ygc3JjU2NyZWVuLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgIC8vICAgICBpZiAoZXhpdC50eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIGNvbnRpbnVlO1xuICAgICAgLy8gICAgIGNvbnN0IGRpc3QgPSAoKGV4aXQuZW50cmFuY2UgPj4+IDQgJiAweGYpIC0gKHRpbGUgJiAweGYpKSAqKiAyICtcbiAgICAgIC8vICAgICAgICgoZXhpdC5lbnRyYW5jZSA+Pj4gMTIgJiAweGYpIC0gKHRpbGUgPj4+IDQpKSAqKiAyO1xuICAgICAgLy8gICAgIGlmIChkaXN0IDwgNCAmJiBkaXN0IDwgY2xvc2VzdERpc3QpIHtcbiAgICAgIC8vICAgICAgIGNsb3Nlc3REaXN0ID0gZGlzdDtcbiAgICAgIC8vICAgICAgIGNsb3Nlc3RFbnRyYW5jZSA9IGk7XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9XG4gICAgICAvLyB9XG4gICAgICAvLyBpZiAoY2xvc2VzdEVudHJhbmNlID49IDApIGVudHJhbmNlcy5nZXQoc3JjVHlwZSkuYWRkKGNsb3Nlc3RFbnRyYW5jZSk7XG4gICAgICAvLyBpZiAoY2xvc2VzdEVudHJhbmNlID09PSAwKVxuICAgICAgLy8gaWYgKGRlc3RUeXBlKSBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCB0aGUgcGl0cyBtYXAuXG4gICAgY29uc3QgcGl0cyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBwaXQgb2YgbG9jYXRpb24ucGl0cykge1xuICAgICAgcGl0cy5zZXQocGl0LmZyb21TY3JlZW4sIHBpdC5kZXN0IDw8IDggfCBwaXQudG9TY3JlZW4pO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGFsb2MgPSBuZXcgTWV0YWxvY2F0aW9uKGxvY2F0aW9uLmlkLCB0aWxlc2V0LCBoZWlnaHQsIHdpZHRoKTtcbiAgICAvLyBmb3IgKGxldCBpID0gMDsgaSA8IHNjcmVlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyAgIG1ldGFsb2Muc2V0SW50ZXJuYWwoaSwgc2NyZWVuc1tpXSk7XG4gICAgLy8gfVxuICAgIG1ldGFsb2MuX3NjcmVlbnMgPSBzY3JlZW5zO1xuICAgIG1ldGFsb2MuX2V4aXRzID0gZXhpdHM7XG4gICAgbWV0YWxvYy5fZW50cmFuY2UwID0gZW50cmFuY2UwO1xuICAgIG1ldGFsb2MuX3BpdHMgPSBwaXRzO1xuXG4gICAgLy8gRmlsbCBpbiBjdXN0b20gZmxhZ3NcbiAgICBmb3IgKGNvbnN0IGYgb2YgbG9jYXRpb24uZmxhZ3MpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGFsb2MuX3NjcmVlbnNbZi5zY3JlZW5dO1xuICAgICAgaWYgKHNjci5mbGFnPy5zdGFydHNXaXRoKCdjdXN0b20nKSkge1xuICAgICAgICBtZXRhbG9jLmN1c3RvbUZsYWdzLnNldChmLnNjcmVlbiwgcm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgICAgfSBlbHNlIGlmICghc2NyLmZsYWcpIHtcbiAgICAgICAgbWV0YWxvYy5mcmVlRmxhZ3MuYWRkKHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZm9yIChjb25zdCBwb3Mgb2YgbWV0YWxvYy5hbGxQb3MoKSkge1xuICAgIC8vICAgY29uc3Qgc2NyID0gcm9tLm1ldGFzY3JlZW5zW21ldGFsb2MuX3NjcmVlbnNbcG9zICsgMTZdXTtcbiAgICAvLyAgIGlmIChzY3IuZmxhZyA9PT0gJ2N1c3RvbScpIHtcbiAgICAvLyAgICAgY29uc3QgZiA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gcG9zKTtcbiAgICAvLyAgICAgaWYgKGYpIG1ldGFsb2MuY3VzdG9tRmxhZ3Muc2V0KHBvcywgcm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIC8vIFRPRE8gLSBzdG9yZSByZWFjaGFiaWxpdHkgbWFwP1xuICAgIHJldHVybiBtZXRhbG9jO1xuXG4gICAgZnVuY3Rpb24gZmluZEVudHJhbmNlVHlwZShkZXN0OiBMb2NhdGlvbiwgc2NySWQ6IG51bWJlciwgY29vcmQ6IG51bWJlcikge1xuICAgICAgZm9yIChjb25zdCBkZXN0U2NyIG9mIHJvbS5tZXRhc2NyZWVucy5nZXRCeUlkKHNjcklkLCBkZXN0LnRpbGVzZXQpKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBkZXN0U2NyLmZpbmRFbnRyYW5jZVR5cGUoY29vcmQsIGRlc3QuaGVpZ2h0ID09PSAxKTtcbiAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCkgcmV0dXJuIHR5cGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlzUmVhY2hhYmxlKHBvczogUG9zKTogYm9vbGVhbiB7XG4gIC8vICAgdGhpcy5jb21wdXRlUmVhY2hhYmxlKCk7XG4gIC8vICAgcmV0dXJuICEhKHRoaXMuX3JlYWNoYWJsZSFbcG9zID4+PiA0XSAmICgxIDw8IChwb3MgJiA3KSkpO1xuICAvLyB9XG5cbiAgLy8gY29tcHV0ZVJlYWNoYWJsZSgpIHtcbiAgLy8gICBpZiAodGhpcy5fcmVhY2hhYmxlKSByZXR1cm47XG4gIC8vICAgdGhpcy5fcmVhY2hhYmxlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5oZWlnaHQpO1xuICAvLyAgIGNvbnN0IG1hcCA9IHRoaXMudHJhdmVyc2Uoe2ZsaWdodDogdHJ1ZX0pO1xuICAvLyAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gICBjb25zdCByZWFjaGFibGUgPSBuZXcgU2V0PFBvcz4oKTtcbiAgLy8gICBmb3IgKGNvbnN0IFtwb3NdIG9mIHRoaXMuX2V4aXRzKSB7XG4gIC8vICAgICBjb25zdCBzZXQgPSBtYXAuZ2V0KHBvcylcbiAgLy8gICB9XG4gIC8vIH1cblxuICBnZXRVaWQocG9zOiBQb3MpOiBVaWQge1xuICAgIHJldHVybiB0aGlzLl9zY3JlZW5zW3Bvc10udWlkO1xuICB9XG5cbiAgZ2V0KHBvczogUG9zKTogTWV0YXNjcmVlbiB7XG4gICAgcmV0dXJuIHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgfVxuXG4gIC8vIFJlYWRvbmx5IGFjY2Vzc29yLlxuICAvLyBnZXQgc2NyZWVucygpOiByZWFkb25seSBVaWRbXSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuX3NjcmVlbnM7XG4gIC8vIH1cblxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fd2lkdGg7XG4gIH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIpIHtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5faGVpZ2h0ID4gaGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLnNwbGljZSgoaGVpZ2h0ICsgMikgPDwgNCwgKHRoaXMuX2hlaWdodCAtIGhlaWdodCkgPDwgNCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9oZWlnaHQgPCBoZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NjcmVlbnMubGVuZ3RoID0gKGhlaWdodCArIDIpIDw8IDQ7XG4gICAgICB0aGlzLl9zY3JlZW5zLmZpbGwodGhpcy50aWxlc2V0LmVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmhlaWdodCArIDIpIDw8IDQsIHRoaXMuX3NjcmVlbnMubGVuZ3RoKTtcbiAgICB9XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIFRPRE8gLSByZXNpemUgZnVuY3Rpb24/XG5cbiAgYWxsUG9zKCk6IHJlYWRvbmx5IFBvc1tdIHtcbiAgICBpZiAodGhpcy5fcG9zKSByZXR1cm4gdGhpcy5fcG9zO1xuICAgIGNvbnN0IHA6IG51bWJlcltdID0gdGhpcy5fcG9zID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl93aWR0aDsgeCsrKSB7XG4gICAgICAgIHAucHVzaCh5IDw8IDQgfCB4KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBzZXQocG9zOiBQb3MsIHNjcjogTWV0YXNjcmVlbiB8IG51bGwpIHtcbiAgICB0aGlzLl9zY3JlZW5zW3Bvc10gPSBzY3IgPz8gdGhpcy50aWxlc2V0LmVtcHR5O1xuICB9XG5cbiAgLy9pbnZhbGlkYXRlTW9uc3RlcnMoKSB7IHRoaXMuX21vbnN0ZXJzSW52YWxpZGF0ZWQgPSB0cnVlOyB9XG5cbiAgaW5Cb3VuZHMocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgICAvLyByZXR1cm4gaW5Cb3VuZHMocG9zLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCk7XG4gICAgcmV0dXJuIChwb3MgJiAxNSkgPCB0aGlzLndpZHRoICYmIHBvcyA+PSAwICYmIHBvcyA+Pj4gNCA8IHRoaXMuaGVpZ2h0O1xuICB9XG5cbiAgLy8gaXNGaXhlZChwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0aGlzLl9maXhlZC5oYXMocG9zKTtcbiAgLy8gfVxuXG4gIC8qKlxuICAgKiBGb3JjZS1vdmVyd3JpdGVzIHRoZSBnaXZlbiByYW5nZSBvZiBzY3JlZW5zLiAgRG9lcyB2YWxpZGl0eSBjaGVja2luZ1xuICAgKiBvbmx5IGF0IHRoZSBlbmQuICBEb2VzIG5vdCBkbyBhbnl0aGluZyB3aXRoIGZlYXR1cmVzLCBzaW5jZSB0aGV5J3JlXG4gICAqIG9ubHkgc2V0IGluIGxhdGVyIHBhc3NlcyAoaS5lLiBzaHVmZmxlLCB3aGljaCBpcyBsYXN0KS5cbiAgICovXG4gIHNldDJkKHBvczogUG9zLFxuICAgICAgICBzY3JlZW5zOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8T3B0aW9uYWw8TWV0YXNjcmVlbj4+Pik6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHNjcmVlbnMpIHtcbiAgICAgIGxldCBkeCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IHNjciBvZiByb3cpIHtcbiAgICAgICAgaWYgKHNjcikgdGhpcy5zZXQocG9zICsgZHgsIHNjcik7XG4gICAgICAgIGR4Kys7XG4gICAgICB9XG4gICAgICBwb3MgKz0gMTY7XG4gICAgfVxuICAgIC8vIHJldHVybiB0aGlzLnZlcmlmeShwb3MwLCBzY3JlZW5zLmxlbmd0aCxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgTWF0aC5tYXgoLi4uc2NyZWVucy5tYXAociA9PiByLmxlbmd0aCkpKTtcbiAgICAvLyBUT0RPIC0gdGhpcyBpcyBraW5kIG9mIGJyb2tlbi4uLiA6LShcbiAgICAvLyByZXR1cm4gdGhpcy52YWxpZGF0ZSgpO1xuICAgIC8vcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKiogQ2hlY2sgYWxsIHRoZSBjdXJyZW50bHkgaW52YWxpZGF0ZWQgZWRnZXMsIHRoZW4gY2xlYXJzIGl0LiAqL1xuICB2YWxpZGF0ZSgpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBbMCwgMV0pIHtcbiAgICAgIGZvciAobGV0IHkgPSBkaXIgPyAwIDogMTsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IGRpcjsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICAgIGNvbnN0IHBvczA6IFBvcyA9IHkgPDwgNCB8IHg7XG4gICAgICAgICAgY29uc3Qgc2NyMCA9IHRoaXMuX3NjcmVlbnNbcG9zMF07XG4gICAgICAgICAgY29uc3QgcG9zMTogUG9zID0gcG9zMCAtIChkaXIgPyAxIDogMTYpO1xuICAgICAgICAgIGNvbnN0IHNjcjEgPSB0aGlzLl9zY3JlZW5zW3BvczFdO1xuICAgICAgICAgIGlmIChzY3IwLmlzRW1wdHkoKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKHNjcjEuaXNFbXB0eSgpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoIXNjcjAuY2hlY2tOZWlnaGJvcihzY3IxLCBkaXIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZm9ybWF0KCdiYWQgbmVpZ2hib3IgJXMgKCUwMngpICVzICVzICglMDJ4KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcjEubmFtZSwgcG9zMSwgRElSX05BTUVbZGlyXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyMC5uYW1lLCBwb3MwKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc3BsaWNlQ29sdW1ucyhsZWZ0OiBudW1iZXIsIGRlbGV0ZWQ6IG51bWJlciwgaW5zZXJ0ZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICBzY3JlZW5zOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8TWV0YXNjcmVlbj4+KSB7XG4gICAgLy8gRmlyc3QgYWRqdXN0IHRoZSBzY3JlZW5zLlxuICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5fc2NyZWVucy5sZW5ndGg7IHAgKz0gMTYpIHtcbiAgICAgIHRoaXMuX3NjcmVlbnMuY29weVdpdGhpbihwICsgbGVmdCArIGluc2VydGVkLCBwICsgbGVmdCArIGRlbGV0ZWQsIHAgKyAxMCk7XG4gICAgICB0aGlzLl9zY3JlZW5zLnNwbGljZShwICsgbGVmdCwgaW5zZXJ0ZWQsIC4uLnNjcmVlbnNbcCA+PiA0XSk7XG4gICAgfVxuICAgIC8vIFVwZGF0ZSBkaW1lbnNpb25zIGFuZCBhY2NvdW50aW5nXG4gICAgY29uc3QgZGVsdGEgPSBpbnNlcnRlZCAtIGRlbGV0ZWQ7XG4gICAgdGhpcy53aWR0aCArPSBkZWx0YTtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gICAgLy8gTW92ZSByZWxldmFudCBleGl0c1xuICAgIGNvbnN0IG1vdmU6IFtQb3MsIENvbm5lY3Rpb25UeXBlLCBQb3MsIENvbm5lY3Rpb25UeXBlXVtdID0gW107XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgY29uc3QgeCA9IHBvcyAmIDB4ZjtcbiAgICAgIGlmICh4IDwgbGVmdCArIGRlbGV0ZWQpIHtcbiAgICAgICAgaWYgKHggPj0gbGVmdCkgdGhpcy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbW92ZS5wdXNoKFtwb3MsIHR5cGUsIHBvcyArIGRlbHRhLCB0eXBlXSk7XG4gICAgfVxuICAgIHRoaXMubW92ZUV4aXRzKC4uLm1vdmUpO1xuICAgIC8vIE1vdmUgZmxhZ3MgYW5kIHNwYXducyBpbiBwYXJlbnQgbG9jYXRpb25cbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgY29uc3QgeHQwID0gKGxlZnQgKyBkZWxldGVkKSA8PCA0O1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgcGFyZW50LnNwYXducykge1xuICAgICAgaWYgKHNwYXduLnh0IDwgeHQwKSBjb250aW51ZTtcbiAgICAgIHNwYXduLnh0IC09IChkZWx0YSA8PCA0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHBhcmVudC5mbGFncykge1xuICAgICAgaWYgKGZsYWcueHMgPCBsZWZ0ICsgZGVsZXRlZCkge1xuICAgICAgICBpZiAoZmxhZy54cyA+PSBsZWZ0KSBmbGFnLnNjcmVlbiA9IDB4ZmY7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZmxhZy54cyAtPSBkZWx0YTtcbiAgICB9XG4gICAgcGFyZW50LmZsYWdzID0gcGFyZW50LmZsYWdzLmZpbHRlcihmID0+IGYuc2NyZWVuICE9PSAweGZmKTtcblxuICAgIC8vIFRPRE8gLSBtb3ZlIHBpdHM/P1xuXG4gIH1cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vIEV4aXQgaGFuZGxpbmdcblxuICBzZXRFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSwgc3BlYzogRXhpdFNwZWMpIHtcbiAgICBjb25zdCBvdGhlciA9IHRoaXMucm9tLmxvY2F0aW9uc1tzcGVjWzBdID4+PiA4XS5tZXRhO1xuICAgIGlmICghb3RoZXIpIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHNldCB0d28td2F5IGV4aXQgd2l0aG91dCBtZXRhYCk7XG4gICAgdGhpcy5zZXRFeGl0T25lV2F5KHBvcywgdHlwZSwgc3BlYyk7XG4gICAgb3RoZXIuc2V0RXhpdE9uZVdheShzcGVjWzBdICYgMHhmZiwgc3BlY1sxXSwgW3RoaXMuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICB9XG4gIHNldEV4aXRPbmVXYXkocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlLCBzcGVjOiBFeGl0U3BlYykge1xuICAgIC8vIGNvbnN0IHByZXYgPSB0aGlzLl9leGl0cy5nZXQocG9zLCB0eXBlKTtcbiAgICAvLyBpZiAocHJldikge1xuICAgIC8vICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlswXSA+Pj4gOF0ubWV0YTtcbiAgICAvLyAgIGlmIChvdGhlcikgb3RoZXIuX2V4aXRzLmRlbGV0ZShwcmV2WzBdICYgMHhmZiwgcHJldlsxXSk7XG4gICAgLy8gfVxuICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIHNwZWMpO1xuICB9XG4gIGRlbGV0ZUV4aXQocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgdGhpcy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gIH1cblxuICBnZXRFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSk6IEV4aXRTcGVjfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX2V4aXRzLmdldChwb3MsIHR5cGUpO1xuICB9XG5cbiAgZXhpdHMoKTogSXRlcmFibGU8cmVhZG9ubHkgW1BvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXT4ge1xuICAgIHJldHVybiB0aGlzLl9leGl0cztcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb3VudGVkIGNhbmRpZGF0ZXM/XG4gIGV4aXRDYW5kaWRhdGVzKHR5cGU6IENvbm5lY3Rpb25UeXBlKTogTWV0YXNjcmVlbltdIHtcbiAgICAvLyBUT0RPIC0gZmlndXJlIG91dCBhIHdheSB0byB1c2UgdGhlIGRvdWJsZS1zdGFpcmNhc2U/ICBpdCB3b24ndFxuICAgIC8vIGhhcHBlbiBjdXJyZW50bHkgYmVjYXVzZSBpdCdzIGZpeGVkLCBzbyBpdCdzIGV4Y2x1ZGVkLi4uLj9cbiAgICBjb25zdCBoYXNFeGl0OiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNjciBvZiB0aGlzLnRpbGVzZXQpIHtcbiAgICAgIGlmIChzY3IuZGF0YS5leGl0cz8uc29tZShlID0+IGUudHlwZSA9PT0gdHlwZSkpIGhhc0V4aXQucHVzaChzY3IpO1xuICAgIH1cbiAgICByZXR1cm4gaGFzRXhpdDtcbiAgfVxuXG4gIC8vIFRPRE8gLSBzaG9ydCB2cyBmdWxsP1xuICBzaG93KCk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICBsZXQgbGluZSA9IFtdO1xuICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICBsaW5lLnB1c2goeC50b1N0cmluZygxNikpO1xuICAgIH1cbiAgICBsaW5lcy5wdXNoKCcgICAnICsgbGluZS5qb2luKCcgICcpKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgMzsgcisrKSB7XG4gICAgICAgIGxpbmUgPSBbciA9PT0gMSA/IHkudG9TdHJpbmcoMTYpIDogJyAnLCAnICddO1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF07XG4gICAgICAgICAgbGluZS5wdXNoKHNjcmVlbj8uZGF0YS5pY29uPy5mdWxsW3JdID8/IChyID09PSAxID8gJyA/ICcgOiAnICAgJykpO1xuICAgICAgICB9XG4gICAgICAgIGxpbmVzLnB1c2gobGluZS5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHNjcmVlbk5hbWVzKCk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGxldCBsaW5lID0gW107XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLl9zY3JlZW5zW3kgPDwgNCB8IHhdO1xuICAgICAgICBsaW5lLnB1c2goc2NyZWVuPy5uYW1lKTtcbiAgICAgIH1cbiAgICAgIGxpbmVzLnB1c2gobGluZS5qb2luKCcgJykpO1xuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICB0cmF2ZXJzZShvcHRzOiBUcmF2ZXJzZU9wdHMgPSB7fSk6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PiB7XG4gICAgLy8gUmV0dXJucyBhIG1hcCBmcm9tIHVuaW9uZmluZCByb290IHRvIGEgbGlzdCBvZiBhbGwgcmVhY2hhYmxlIHRpbGVzLlxuICAgIC8vIEFsbCBlbGVtZW50cyBvZiBzZXQgYXJlIGtleXMgcG9pbnRpbmcgdG8gdGhlIHNhbWUgdmFsdWUgcmVmLlxuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxudW1iZXI+KCk7XG4gICAgY29uc3QgY29ubmVjdGlvblR5cGUgPSAob3B0cy5mbGlnaHQgPyAyIDogMCkgfCAob3B0cy5ub0ZsYWdnZWQgPyAxIDogMCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gb3B0cy53aXRoPy5nZXQocG9zKSA/PyB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2NyLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25UeXBlXSkge1xuICAgICAgICBpZiAoIXNlZ21lbnQubGVuZ3RoKSBjb250aW51ZTsgLy8gZS5nLiBlbXB0eVxuICAgICAgICAvLyBDb25uZWN0IHdpdGhpbiBlYWNoIHNlZ21lbnRcbiAgICAgICAgdWYudW5pb24oc2VnbWVudC5tYXAoYyA9PiAocG9zIDw8IDgpICsgYykpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgICBjb25zdCBzZXRzID0gdWYuc2V0cygpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc2V0ID0gc2V0c1tpXTtcbiAgICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZXQpIHtcbiAgICAgICAgbWFwLnNldChlbGVtLCBzZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYXA7XG4gIH0gIFxuXG4gIC8qKiBAcGFyYW0gZWRnZSBBIHZhbHVlIGZyb20gYSB0cmF2ZXJzZSBzZXQuICovXG4gIGV4aXRUeXBlKGVkZ2U6IG51bWJlcik6IENvbm5lY3Rpb25UeXBlfHVuZGVmaW5lZCB7XG4gICAgaWYgKChlZGdlICYgMHhmMCkgIT09IDB4ZTApIHJldHVybjtcbiAgICBjb25zdCBwb3MgPSBlZGdlID4+PiA4O1xuICAgIGNvbnN0IHNjciA9IHRoaXMuZ2V0KHBvcyk7XG4gICAgY29uc3QgdHlwZSA9IHNjci5kYXRhLmV4aXRzPy5bZWRnZSAmIDB4Zl0udHlwZTtcbiAgICBpZiAoIXR5cGU/LnN0YXJ0c1dpdGgoJ2VkZ2U6JykpIHJldHVybiB0eXBlO1xuICAgIC8vIG1heSBub3QgYWN0dWFsbHkgYmUgYW4gZXhpdC5cbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6dG9wJyAmJiAocG9zID4+PiA0KSkgcmV0dXJuO1xuICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgPj4+IDQpID09PSB0aGlzLmhlaWdodCAtIDEpIHJldHVybjtcbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6bGVmdCcgJiYgKHBvcyAmIDB4ZikpIHJldHVybjtcbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiAocG9zICYgMHhmKSA9PT0gdGhpcy53aWR0aCAtIDEpIHJldHVybjtcbiAgICByZXR1cm4gdHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0gZWRnZSBBIHZhbHVlIGZyb20gYSB0cmF2ZXJzZSBzZXQuXG4gICAqIEByZXR1cm4gQW4gWXlYeCBwb3NpdGlvbiBmb3IgdGhlIGdpdmVuIHBvaSwgaWYgaXQgZXhpc3RzLlxuICAgKi9cbiAgcG9pVGlsZShlZGdlOiBudW1iZXIpOiBudW1iZXJ8dW5kZWZpbmVkIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICB9XG5cbiAgLyoqIFN0YXRpYyBoZWxwZXIgbWV0aG9kIHRvIGNvbm5lY3QgdHdvIGV4aXQgc3BlY3MuICovXG4gIHN0YXRpYyBjb25uZWN0KHJvbTogUm9tLCBhOiBFeGl0U3BlYywgYjogRXhpdFNwZWMpIHtcbiAgICBjb25zdCBsb2NBID0gcm9tLmxvY2F0aW9uc1thWzBdID4+PiA4XS5tZXRhO1xuICAgIGNvbnN0IGxvY0IgPSByb20ubG9jYXRpb25zW2JbMF0gPj4+IDhdLm1ldGE7XG4gICAgbG9jQS5hdHRhY2goYVswXSAmIDB4ZmYsIGxvY0IsIGJbMF0gJiAweGZmLCBhWzFdLCBiWzFdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgYWN0dWFsIGZ1bGwgdGlsZSBjb29yZGluYXRlIChZWHl4KSBvZiB0aGVcbiAgICogZ2l2ZW4gZXhpdC5cbiAgICovXG4gIHN0YXRpYyBmaW5kRXhpdFRpbGVzKHJvbTogUm9tLCBleGl0OiBFeGl0U3BlYyk6IFBvc1tdIHtcbiAgICBjb25zdCBsb2MgPSByb20ubG9jYXRpb25zW2V4aXRbMF0gPj4+IDhdO1xuICAgIGNvbnN0IHNjciA9IGxvYy5tZXRhLl9zY3JlZW5zW2V4aXRbMF0gJiAweGZmXTtcbiAgICBjb25zdCBjb24gPSBzY3IuZmluZEV4aXRCeVR5cGUoZXhpdFsxXSk7XG4gICAgcmV0dXJuIGNvbi5leGl0cy5tYXAodGlsZSA9PiB0aWxlIHwgKGV4aXRbMF0gJiAweGZmKSA8PCA4KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRhY2ggYW4gZXhpdC9lbnRyYW5jZSBwYWlyIGluIHR3byBkaXJlY3Rpb25zLlxuICAgKiBBbHNvIHJlYXR0YWNoZXMgdGhlIGZvcm1lciBvdGhlciBlbmRzIG9mIGVhY2ggdG8gZWFjaCBvdGhlci5cbiAgICovXG4gIGF0dGFjaChzcmNQb3M6IFBvcywgZGVzdDogTWV0YWxvY2F0aW9uLCBkZXN0UG9zOiBQb3MsXG4gICAgICAgICBzcmNUeXBlPzogQ29ubmVjdGlvblR5cGUsIGRlc3RUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXNyY1R5cGUpIHNyY1R5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbUV4aXRzKHNyY1Bvcyk7XG4gICAgaWYgKCFkZXN0VHlwZSkgZGVzdFR5cGUgPSBkZXN0LnBpY2tUeXBlRnJvbUV4aXRzKGRlc3RQb3MpO1xuXG4gICAgLy8gVE9ETyAtIHdoYXQgaWYgbXVsdGlwbGUgcmV2ZXJzZXM/ICBlLmcuIGNvcmRlbCBlYXN0L3dlc3Q/XG4gICAgLy8gICAgICAtIGNvdWxkIGRldGVybWluZSBpZiB0aGlzIGFuZC9vciBkZXN0IGhhcyBhbnkgc2VhbWxlc3MuXG4gICAgLy8gTm86IGluc3RlYWQsIGRvIGEgcG9zdC1wcm9jZXNzLiAgT25seSBjb3JkZWwgbWF0dGVycywgc28gZ29cbiAgICAvLyB0aHJvdWdoIGFuZCBhdHRhY2ggYW55IHJlZHVuZGFudCBleGl0cy5cblxuICAgIGNvbnN0IGRlc3RUaWxlID0gZGVzdC5pZCA8PCA4IHwgZGVzdFBvcztcbiAgICBjb25zdCBzcmNUaWxlID0gdGhpcy5pZCA8PCA4IHwgc3JjUG9zO1xuICAgIGNvbnN0IHByZXZEZXN0ID0gdGhpcy5fZXhpdHMuZ2V0KHNyY1Bvcywgc3JjVHlwZSk7XG4gICAgY29uc3QgcHJldlNyYyA9IGRlc3QuX2V4aXRzLmdldChkZXN0UG9zLCBkZXN0VHlwZSk7XG4gICAgaWYgKHByZXZEZXN0ICYmIHByZXZTcmMpIHtcbiAgICAgIGNvbnN0IFtwcmV2RGVzdFRpbGUsIHByZXZEZXN0VHlwZV0gPSBwcmV2RGVzdDtcbiAgICAgIGNvbnN0IFtwcmV2U3JjVGlsZSwgcHJldlNyY1R5cGVdID0gcHJldlNyYztcbiAgICAgIGlmIChwcmV2RGVzdFRpbGUgPT09IGRlc3RUaWxlICYmIHByZXZEZXN0VHlwZSA9PT0gZGVzdFR5cGUgJiZcbiAgICAgICAgICBwcmV2U3JjVGlsZSA9PT0gc3JjVGlsZSAmJiBwcmV2U3JjVHlwZSA9PT0gc3JjVHlwZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2V4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdKTtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFBvcywgZGVzdFR5cGUsIFtzcmNUaWxlLCBzcmNUeXBlXSk7XG4gICAgLy8gYWxzbyBob29rIHVwIHByZXZpb3VzIHBhaXJcbiAgICBpZiAocHJldlNyYyAmJiBwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZEZXN0VGlsZSwgcHJldkRlc3RUeXBlXSA9IHByZXZEZXN0O1xuICAgICAgY29uc3QgW3ByZXZTcmNUaWxlLCBwcmV2U3JjVHlwZV0gPSBwcmV2U3JjO1xuICAgICAgY29uc3QgcHJldlNyY01ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlNyY1RpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBjb25zdCBwcmV2RGVzdE1ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldkRlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgcHJldlNyY01ldGEuX2V4aXRzLnNldChwcmV2U3JjVGlsZSAmIDB4ZmYsIHByZXZTcmNUeXBlLCBwcmV2RGVzdCk7XG4gICAgICBwcmV2RGVzdE1ldGEuX2V4aXRzLnNldChwcmV2RGVzdFRpbGUgJiAweGZmLCBwcmV2RGVzdFR5cGUsIHByZXZTcmMpO1xuICAgIH0gZWxzZSBpZiAocHJldlNyYyB8fCBwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZUaWxlLCBwcmV2VHlwZV0gPSAocHJldlNyYyB8fCBwcmV2RGVzdCkhO1xuICAgICAgLy8gTk9URTogaWYgd2UgdXNlZCBhdHRhY2ggdG8gaG9vayB1cCB0aGUgcmV2ZXJzZSBvZiBhIG9uZS13YXkgZXhpdFxuICAgICAgLy8gKGkuZS4gdG93ZXIgZXhpdCBwYXRjaCkgdGhlbiB3ZSBuZWVkIHRvICpub3QqIHJlbW92ZSB0aGUgb3RoZXIgc2lkZS5cbiAgICAgIGlmICgocHJldlRpbGUgIT09IHNyY1RpbGUgfHwgcHJldlR5cGUgIT09IHNyY1R5cGUpICYmXG4gICAgICAgICAgKHByZXZUaWxlICE9PSBkZXN0VGlsZSB8fCBwcmV2VHlwZSAhPT0gZGVzdFR5cGUpKSB7XG4gICAgICAgIGNvbnN0IHByZXZNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgICBwcmV2TWV0YS5fZXhpdHMuZGVsZXRlKHByZXZUaWxlICYgMHhmZiwgcHJldlR5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHBpY2tUeXBlRnJvbUV4aXRzKHBvczogUG9zKTogQ29ubmVjdGlvblR5cGUge1xuICAgIGNvbnN0IHR5cGVzID0gWy4uLnRoaXMuX2V4aXRzLnJvdyhwb3MpLmtleXMoKV07XG4gICAgaWYgKCF0eXBlcy5sZW5ndGgpIHJldHVybiB0aGlzLnBpY2tUeXBlRnJvbVNjcmVlbnMocG9zKTtcbiAgICBpZiAodHlwZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzaW5nbGUgdHlwZSBmb3IgJHtoZXgocG9zKX06IFske3R5cGVzLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZXNbMF07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYW4gZXhpdCBmcm9tIG9uZSBwb3MvdHlwZSB0byBhbm90aGVyLlxuICAgKiBBbHNvIHVwZGF0ZXMgdGhlIG1ldGFsb2NhdGlvbiBvbiB0aGUgb3RoZXIgZW5kIG9mIHRoZSBleGl0LlxuICAgKiBUaGlzIHNob3VsZCB0eXBpY2FsbHkgYmUgZG9uZSBhdG9taWNhbGx5IGlmIHJlYnVpbGRpbmcgYSBtYXAuXG4gICAqL1xuICAvLyBUT0RPIC0gcmVidWlsZGluZyBhIG1hcCBpbnZvbHZlcyBtb3ZpbmcgdG8gYSBORVcgbWV0YWxvY2F0aW9uLi4uXG4gIC8vICAgICAgLSBnaXZlbiB0aGlzLCB3ZSBuZWVkIGEgZGlmZmVyZW50IGFwcHJvYWNoP1xuICBtb3ZlRXhpdHMoLi4ubW92ZXM6IEFycmF5PFtQb3MsIENvbm5lY3Rpb25UeXBlLCBMb2NQb3MsIENvbm5lY3Rpb25UeXBlXT4pIHtcbiAgICBjb25zdCBuZXdFeGl0czogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtvbGRQb3MsIG9sZFR5cGUsIG5ld1BvcywgbmV3VHlwZV0gb2YgbW92ZXMpIHtcbiAgICAgIGNvbnN0IGRlc3RFeGl0ID0gdGhpcy5fZXhpdHMuZ2V0KG9sZFBvcywgb2xkVHlwZSkhO1xuICAgICAgY29uc3QgW2Rlc3RUaWxlLCBkZXN0VHlwZV0gPSBkZXN0RXhpdDtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICBbdGhpcy5pZCA8PCA4IHwgbmV3UG9zLCBuZXdUeXBlXSk7XG4gICAgICBuZXdFeGl0cy5wdXNoKFtuZXdQb3MsIG5ld1R5cGUsIGRlc3RFeGl0XSk7XG4gICAgICB0aGlzLl9leGl0cy5kZWxldGUob2xkUG9zLCBvbGRUeXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBleGl0XSBvZiBuZXdFeGl0cykge1xuICAgICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgZXhpdCk7XG4gICAgfVxuICB9XG5cbiAgbW92ZUV4aXQocHJldjogUG9zLCBuZXh0OiBQb3MsXG4gICAgICAgICAgIHByZXZUeXBlPzogQ29ubmVjdGlvblR5cGUsIG5leHRUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXByZXZUeXBlKSBwcmV2VHlwZSA9IHRoaXMucGlja1R5cGVGcm9tRXhpdHMocHJldik7XG4gICAgaWYgKCFuZXh0VHlwZSkgbmV4dFR5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbVNjcmVlbnMobmV4dCk7XG4gICAgY29uc3QgZGVzdEV4aXQgPSB0aGlzLl9leGl0cy5nZXQocHJldiwgcHJldlR5cGUpITtcbiAgICBjb25zdCBbZGVzdFRpbGUsIGRlc3RUeXBlXSA9IGRlc3RFeGl0O1xuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIFt0aGlzLmlkIDw8IDggfCBuZXh0LCBuZXh0VHlwZV0pO1xuICAgIHRoaXMuX2V4aXRzLnNldChuZXh0LCBuZXh0VHlwZSwgZGVzdEV4aXQpO1xuICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwcmV2LCBwcmV2VHlwZSk7XG4gIH1cblxuICBtb3ZlRXhpdHNBbmRQaXRzVG8ob3RoZXI6IE1ldGFsb2NhdGlvbikge1xuICAgIGNvbnN0IG1vdmVkID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2Ygb3RoZXIuYWxsUG9zKCkpIHtcbiAgICAgIGlmICghb3RoZXIuZ2V0KHBvcykuZGF0YS5kZWxldGUpIHtcbiAgICAgICAgbW92ZWQuYWRkKHBvcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBpZiAoIW1vdmVkLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4+IDhdLm1ldGE7XG4gICAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSwgW290aGVyLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgIG90aGVyLl9leGl0cy5zZXQocG9zLCB0eXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXSk7XG4gICAgICB0aGlzLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbZnJvbSwgdG9dIG9mIHRoaXMuX3BpdHMpIHtcbiAgICAgIGlmICghbW92ZWQuaGFzKGZyb20pKSBjb250aW51ZTtcbiAgICAgIG90aGVyLl9waXRzLnNldChmcm9tLCB0byk7XG4gICAgICB0aGlzLl9waXRzLmRlbGV0ZShmcm9tKTtcbiAgICB9XG4gIH1cblxuICBwaWNrVHlwZUZyb21TY3JlZW5zKHBvczogUG9zKTogQ29ubmVjdGlvblR5cGUge1xuICAgIGNvbnN0IGV4aXRzID0gdGhpcy5fc2NyZWVuc1twb3NdLmRhdGEuZXhpdHM7XG4gICAgY29uc3QgdHlwZXMgPSAoZXhpdHMgPz8gW10pLm1hcChlID0+IGUudHlwZSk7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzaW5nbGUgdHlwZSBmb3IgJHtoZXgocG9zKX06IFske3R5cGVzLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZXNbMF07XG4gIH1cblxuICB0cmFuc2ZlckZsYWdzKG9yaWc6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBDb3B5IG92ZXIgdGhlIGZyZWUgZmxhZ3NcbiAgICB0aGlzLmZyZWVGbGFncyA9IG5ldyBTZXQob3JpZy5mcmVlRmxhZ3MpO1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBjdXN0b20gZmxhZ3MuXG4gICAgY29uc3QgY3VzdG9tcyA9IG5ldyBEZWZhdWx0TWFwPE1ldGFzY3JlZW4sIEZsYWdbXT4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgW3BvcywgZmxhZ10gb2Ygb3JpZy5jdXN0b21GbGFncykge1xuICAgICAgY3VzdG9tcy5nZXQob3JpZy5fc2NyZWVuc1twb3NdKS5wdXNoKGZsYWcpO1xuICAgIH1cbiAgICAvLyBTaHVmZmxlIHRoZW0ganVzdCBpbiBjYXNlIHRoZXkncmUgbm90IGFsbCB0aGUgc2FtZS4uLlxuICAgIC8vIFRPRE8gLSBmb3Igc2VhbWxlc3MgcGFpcnMsIG9ubHkgc2h1ZmZsZSBvbmNlLCB0aGVuIGNvcHkuXG4gICAgZm9yIChjb25zdCBmbGFncyBvZiBjdXN0b21zLnZhbHVlcygpKSByYW5kb20uc2h1ZmZsZShmbGFncyk7XG4gICAgLy8gRmluZCBhbGwgdGhlIGN1c3RvbS1mbGFnIHNjcmVlbnMgaW4gdGhlIG5ldyBsb2NhdGlvbi5cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBpZiAoc2NyLmZsYWc/LnN0YXJ0c1dpdGgoJ2N1c3RvbScpKSB7XG4gICAgICAgIGNvbnN0IGZsYWcgPSBjdXN0b21zLmdldChzY3IpLnBvcCgpO1xuICAgICAgICBpZiAoIWZsYWcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGZsYWcgZm9yICR7c2NyLm5hbWV9IGF0ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19IEAke2hleChwb3MpfWApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3VzdG9tRmxhZ3Muc2V0KHBvcywgZmxhZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvcHkgcGl0IGRlc3RpbmF0aW9ucyBmcm9tIHRoZSBvcmlnaW5hbC4gIE5PVEU6IHRoZXJlIGlzIE5PIHNhZmV0eVxuICAgKiBjaGVjayBoZXJlIGZvciB0aGUgcGl0cyBiZWluZyByZWFzb25hYmxlLiAgVGhhdCBtdXN0IGJlIGRvbmUgZWxzZXdoZXJlLlxuICAgKiBXZSBkb24ndCB3YW50IHBpdCBzYWZldHkgdG8gYmUgY29udGluZ2VudCBvbiBzdWNjZXNzZnVsIHNodWZmbGluZyBvZlxuICAgKiB0aGUgdXBzdGFpcnMgbWFwLlxuICAgKi9cbiAgdHJhbnNmZXJQaXRzKG9yaWc6IE1ldGFsb2NhdGlvbikge1xuICAgIHRoaXMuX3BpdHMgPSBvcmlnLl9waXRzO1xuICB9XG5cbiAgLyoqIEVuc3VyZSBhbGwgcGl0cyBnbyB0byB2YWxpZCBsb2NhdGlvbnMuICovXG4gIHNodWZmbGVQaXRzKHJhbmRvbTogUmFuZG9tKSB7XG4gICAgaWYgKCF0aGlzLl9waXRzLnNpemUpIHJldHVybjtcbiAgICAvLyBGaW5kIGFsbCBwaXQgZGVzdGluYXRpb25zLlxuICAgIGNvbnN0IGRlc3RzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBbLCBkZXN0XSBvZiB0aGlzLl9waXRzKSB7XG4gICAgICBkZXN0cy5hZGQodGhpcy5yb20ubG9jYXRpb25zW2Rlc3QgPj4+IDhdLmlkKTtcbiAgICB9XG4gICAgdGhpcy5fcGl0cy5jbGVhcigpO1xuXG4gICAgLy8gTG9vayBmb3IgZXhpc3RpbmcgcGl0cy4gIFNvcnQgYnkgbG9jYXRpb24sIFtwaXQgcG9zLCBkZXN0IHBvc11cbiAgICBjb25zdCBwaXRzID0gbmV3IERlZmF1bHRNYXA8TWV0YWxvY2F0aW9uLCBBcnJheTxbUG9zLCBQb3NdPj4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuZ2V0KHBvcyk7XG4gICAgICBpZiAoIXNjci5oYXNGZWF0dXJlKCdwaXQnKSkgY29udGludWU7XG4gICAgICAvLyBGaW5kIHRoZSBuZWFyZXN0IGV4aXQgdG8gb25lIG9mIHRob3NlIGRlc3RpbmF0aW9uczogW2RlbHRhLCBsb2MsIGRpc3RdXG4gICAgICBsZXQgY2xvc2VzdDogW1BvcywgTWV0YWxvY2F0aW9uLCBudW1iZXJdID0gWy0xLCB0aGlzLCBJbmZpbml0eV07XG4gICAgICBmb3IgKGNvbnN0IFtleGl0UG9zLCwgW2Rlc3RdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgICBjb25zdCBkaXN0ID0gZGlzdGFuY2UocG9zLCBleGl0UG9zKTtcbiAgICAgICAgaWYgKGRlc3RzLmhhcyhkZXN0ID4+PiA4KSAmJiBkaXN0IDwgY2xvc2VzdFsyXSkge1xuICAgICAgICAgIGNvbnN0IGRsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdCA+Pj4gOF0ubWV0YTtcbiAgICAgICAgICBjb25zdCBkcG9zID0gZGVzdCAmIDB4ZmY7XG4gICAgICAgICAgY2xvc2VzdCA9IFthZGREZWx0YShwb3MsIGRwb3MsIGV4aXRQb3MsIGRsb2MpLCBkbG9jLCBkaXN0XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNsb3Nlc3RbMF0gPj0gMCkgcGl0cy5nZXQoY2xvc2VzdFsxXSkucHVzaChbcG9zLCBjbG9zZXN0WzBdXSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZGVzdCBvZiBkZXN0cykge1xuICAgICAgY29uc3QgbGlzdCA9IHBpdHMuZ2V0KHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0XS5tZXRhKTtcbiAgICAgIC8vIElmIHRoZXJlJ3MgZXZlciBub3QgYSBkaXJlY3QgZXhpdCB0byBhbnkgZGVzdGluYXRpb24sIGp1c3QgcHVzaFxuICAgICAgLy8gYSBsYXJnZSBkZWx0YSB0b3dhcmQgdGhlIGJvdHRvbSBvZiB0aGUgbWFwLlxuICAgICAgaWYgKCFsaXN0Lmxlbmd0aCkgbGlzdC5wdXNoKFswLCAweGYwXSk7XG4gICAgfVxuXG4gICAgLy8gRm9yIGVhY2ggZGVzdGluYXRpb24gbG9jYXRpb24sIGxvb2sgZm9yIHNwaWtlcywgdGhlc2Ugd2lsbCBvdmVycmlkZVxuICAgIC8vIGFueSBwb3NpdGlvbi1iYXNlZCBkZXN0aW5hdGlvbnMuXG4gICAgZm9yIChjb25zdCBbZGVzdCwgbGlzdF0gb2YgcGl0cykge1xuICAgICAgLy8gdmVydGljYWwsIGhvcml6b250YWxcbiAgICAgIGNvbnN0IGVsaWdpYmxlOiBQb3NbXVtdID0gW1tdLCBbXV07XG4gICAgICBjb25zdCBzcGlrZXMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpO1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgZGVzdC5hbGxQb3MoKSkge1xuICAgICAgICBjb25zdCBzY3IgPSBkZXN0LmdldChwb3MpO1xuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JpdmVyJykgfHwgc2NyLmhhc0ZlYXR1cmUoJ2VtcHR5JykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBlZGdlcyA9XG4gICAgICAgICAgICAoc2NyLmRhdGEuZWRnZXMgfHwgJycpLnNwbGl0KCcnKS5tYXAoeCA9PiB4ID09PSAnICcgPyAnJyA6IHgpO1xuICAgICAgICBpZiAoZWRnZXNbMF0gJiYgZWRnZXNbMl0pIGVsaWdpYmxlWzBdLnB1c2gocG9zKTtcbiAgICAgICAgLy8gTk9URTogd2UgY2xhbXAgdGhlIHRhcmdldCBYIGNvb3JkcyBzbyB0aGF0IHNwaWtlIHNjcmVlbnMgYXJlIGFsbCBnb29kXG4gICAgICAgIC8vIHRoaXMgcHJldmVudHMgZXJyb3JzIGZyb20gbm90IGhhdmluZyBhIHZpYWJsZSBkZXN0aW5hdGlvbiBzY3JlZW4uXG4gICAgICAgIGlmICgoZWRnZXNbMV0gJiYgZWRnZXNbM10pIHx8IHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkge1xuICAgICAgICAgIGVsaWdpYmxlWzFdLnB1c2gocG9zKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSB7XG4gICAgICAgICAgc3Bpa2VzLnNldChwb3MsIFsuLi5lZGdlc10uZmlsdGVyKGMgPT4gYyA9PT0gJ3MnKS5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICB9XG4vL2NvbnNvbGUubG9nKGBkZXN0OlxcbiR7ZGVzdC5zaG93KCl9XFxuZWxpZ2libGU6ICR7ZWxpZ2libGUubWFwKGUgPT4gZS5tYXAoaCA9PiBoLnRvU3RyaW5nKDE2KSkuam9pbignLCcpKS5qb2luKCcgICcpfWApO1xuICAgICAgLy8gZmluZCB0aGUgY2xvc2VzdCBkZXN0aW5hdGlvbiBmb3IgdGhlIGZpcnN0IHBpdCwga2VlcCBhIHJ1bm5pbmcgZGVsdGEuXG4gICAgICBsZXQgZGVsdGE6IFtQb3MsIFBvc10gPSBbMCwgMF07XG4gICAgICBmb3IgKGNvbnN0IFt1cHN0YWlycywgZG93bnN0YWlyc10gb2YgbGlzdCkge1xuICAgICAgICBjb25zdCBzY3IgPSB0aGlzLmdldCh1cHN0YWlycyk7XG4gICAgICAgIGNvbnN0IGVkZ2VzID0gc2NyLmRhdGEuZWRnZXMgfHwgJyc7XG4gICAgICAgIGNvbnN0IGRpciA9IGVkZ2VzWzFdID09PSAnYycgJiYgZWRnZXNbM10gPT09ICdjJyA/IDEgOiAwO1xuICAgICAgICAvLyBlbGlnaWJsZSBkZXN0IHRpbGUsIGRpc3RhbmNlXG4gICAgICAgIGxldCBjbG9zZXN0OiBbUG9zLCBudW1iZXIsIG51bWJlcl0gPSBbLTEsIEluZmluaXR5LCAwXTtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gYWRkRGVsdGEoZG93bnN0YWlycywgZGVsdGFbMF0sIGRlbHRhWzFdLCBkZXN0KTtcbiAgICAgICAgZm9yIChjb25zdCBwb3Mgb2YgZWxpZ2libGVbZGlyXSkgeyAvL2ZvciAobGV0IGkgPSAwOyBpIDwgZWxpZ2libGVbZGlyXS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIC8vICAgICAgICAgIGNvbnN0IHBvcyA9IGVsaWdpYmxlW2Rpcl1baV07XG4gICAgICAgICAgY29uc3Qgc3Bpa2VDb3VudCA9IHNwaWtlcy5nZXQocG9zKSA/PyAwO1xuICAgICAgICAgIGlmIChzcGlrZUNvdW50IDwgY2xvc2VzdFsyXSkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgZGlzdCA9IGRpc3RhbmNlKHRhcmdldCwgcG9zKTtcbiAgICAgICAgICBpZiAoZGlzdCA8IGNsb3Nlc3RbMV0pIHtcbiAgICAgICAgICAgIGNsb3Nlc3QgPSBbcG9zLCBkaXN0LCBzcGlrZUNvdW50XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW5kUG9zID0gY2xvc2VzdFswXTtcbiAgICAgICAgaWYgKGVuZFBvcyA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gZWxpZ2libGUgZGVzdGApO1xuICAgICAgICBkZWx0YSA9IFtlbmRQb3MsIHRhcmdldF07XG4gICAgICAgIHRoaXMuX3BpdHMuc2V0KHVwc3RhaXJzLCBkZXN0LmlkIDw8IDggfCBlbmRQb3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlcyBvd25lcnNoaXAgb2YgZXhpdHMgZnJvbSBhbm90aGVyIG1ldGFsb2NhdGlvbiB3aXRoIHRoZSBzYW1lIElELlxuICAgKiBAcGFyYW0ge2ZpeGVkfSBtYXBzIGRlc3RpbmF0aW9uIGxvY2F0aW9uIElEIHRvIHBvcyB3aGVyZSB0aGUgZXhpdCBpcy5cbiAgICovXG4gIHRyYW5zZmVyRXhpdHMob3JpZzogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIERldGVybWluZSBhbGwgdGhlIGVsaWdpYmxlIGV4aXQgc2NyZWVucy5cbiAgICBjb25zdCBleGl0cyA9IG5ldyBEZWZhdWx0TWFwPENvbm5lY3Rpb25UeXBlLCBQb3NbXT4oKCkgPT4gW10pO1xuICAgIGNvbnN0IHNlbGZFeGl0cyA9IG5ldyBEZWZhdWx0TWFwPENvbm5lY3Rpb25UeXBlLCBTZXQ8UG9zPj4oKCkgPT4gbmV3IFNldCgpKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IHt0eXBlfSBvZiBzY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6dG9wJyAmJiAocG9zID4+PiA0KSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0JyAmJiAocG9zICYgMHhmKSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgPj4+IDQpIDwgdGhpcy5oZWlnaHQgLSAxKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnJpZ2h0JyAmJiAocG9zICYgMHhmKSA8IHRoaXMud2lkdGggLSAxKSBjb250aW51ZTtcbiAgICAgICAgZXhpdHMuZ2V0KHR5cGUpLnB1c2gocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBhcnIgb2YgZXhpdHMudmFsdWVzKCkpIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKGFycik7XG4gICAgfVxuICAgIC8vIEZpbmQgYSBtYXRjaCBmb3IgZWFjaCBvcmlnaW5hbCBleGl0LlxuICAgIGZvciAoY29uc3QgW29wb3MsIHR5cGUsIGV4aXRdIG9mIG9yaWcuX2V4aXRzKSB7XG4gICAgICBpZiAoc2VsZkV4aXRzLmdldCh0eXBlKS5oYXMob3BvcykpIGNvbnRpbnVlO1xuICAgICAgLy8gb3BvcyxleGl0IGZyb20gb3JpZ2luYWwgdmVyc2lvbiBvZiB0aGlzIG1ldGFsb2NhdGlvblxuICAgICAgY29uc3QgcG9zID0gZXhpdHMuZ2V0KHR5cGUpLnBvcCgpOyAvLyBhIFBvcyBpbiB0aGlzIG1ldGFsb2NhdGlvblxuICAgICAgaWYgKHBvcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHRyYW5zZmVyIGV4aXQgJHt0eXBlfSBpbiAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX06IG5vIGVsaWdpYmxlIHNjcmVlblxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICAvLyBMb29rIGZvciBhIHJldmVyc2UgZXhpdDogZXhpdCBpcyB0aGUgc3BlYyBmcm9tIG9sZCBtZXRhLlxuICAgICAgLy8gRmluZCB0aGUgbWV0YWxvY2F0aW9uIGl0IHJlZmVycyB0byBhbmQgc2VlIGlmIHRoZSBleGl0XG4gICAgICAvLyBnb2VzIGJhY2sgdG8gdGhlIG9yaWdpbmFsIHBvc2l0aW9uLlxuICAgICAgY29uc3QgZWxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tleGl0WzBdID4+PiA4XS5tZXRhO1xuICAgICAgY29uc3QgZXBvcyA9IGV4aXRbMF0gJiAweGZmO1xuICAgICAgY29uc3QgZXR5cGUgPSBleGl0WzFdO1xuICAgICAgaWYgKGVsb2MgPT09IG9yaWcpIHtcbiAgICAgICAgLy8gU3BlY2lhbCBjYXNlIG9mIGEgc2VsZi1leGl0IChoYXBwZW5zIGluIGh5ZHJhIGFuZCBweXJhbWlkKS5cbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlLCBqdXN0IHBpY2sgYW4gZXhpdCBvZiB0aGUgY29ycmVjdCB0eXBlLlxuICAgICAgICBjb25zdCBucG9zID0gZXhpdHMuZ2V0KGV0eXBlKS5wb3AoKTtcbiAgICAgICAgaWYgKG5wb3MgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlYCk7XG4gICAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIFt0aGlzLmlkIDw8IDggfCBucG9zLCBldHlwZV0pO1xuICAgICAgICB0aGlzLl9leGl0cy5zZXQobnBvcywgZXR5cGUsIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgICAgLy8gQWxzbyBkb24ndCB2aXNpdCB0aGUgb3RoZXIgZXhpdCBsYXRlci5cbiAgICAgICAgc2VsZkV4aXRzLmdldChldHlwZSkuYWRkKGVwb3MpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJldCA9IGVsb2MuX2V4aXRzLmdldChlcG9zLCBldHlwZSkhO1xuICAgICAgaWYgKCFyZXQpIHtcbiAgICAgICAgY29uc3QgZWVsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdFswXSA+Pj4gOF07XG4gICAgICAgIGNvbnNvbGUubG9nKGVsb2MpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGV4aXQgZm9yICR7ZWVsb2N9IGF0ICR7aGV4KGVwb3MpfSAke2V0eXBlfVxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZWxvYy5zaG93KCl9XFxuJHt0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19IGF0ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaGV4KG9wb3MpfSAke3R5cGV9XFxuJHt0aGlzLnNob3coKX1gKTtcbiAgICAgIH1cbiAgICAgIGlmICgocmV0WzBdID4+PiA4KSA9PT0gdGhpcy5pZCAmJiAoKHJldFswXSAmIDB4ZmYpID09PSBvcG9zKSAmJlxuICAgICAgICAgIHJldFsxXSA9PT0gdHlwZSkge1xuICAgICAgICBlbG9jLl9leGl0cy5zZXQoZXBvcywgZXR5cGUsIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBOUENzLCB0cmlnZ2VycywgYW5kIGNoZXN0cyBiYXNlZCBvbiBwcm94aW1pdHkgdG8gc2NyZWVucyxcbiAgICogZXhpdHMsIGFuZCBQT0kuXG4gICAqL1xuICB0cmFuc2ZlclNwYXducyh0aGF0OiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gU3RhcnQgYnkgYnVpbGRpbmcgYSBtYXAgYmV0d2VlbiBleGl0cyBhbmQgc3BlY2lmaWMgc2NyZWVuIHR5cGVzLlxuICAgIGNvbnN0IHJldmVyc2VFeGl0cyA9IG5ldyBNYXA8RXhpdFNwZWMsIFtudW1iZXIsIG51bWJlcl0+KCk7IC8vIG1hcCB0byB5LHhcbiAgICBjb25zdCBwaXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTsgLy8gbWFwcyB0byBkaXIgKDAgPSB2ZXJ0LCAxID0gaG9yaXopXG4gICAgY29uc3Qgc3RhdHVlczogQXJyYXk8W1BvcywgbnVtYmVyXT4gPSBbXTsgLy8gYXJyYXkgb2Ygc3Bhd24gW3NjcmVlbiwgY29vcmRdXG4gICAgLy8gQXJyYXkgb2YgW29sZCB5LCBvbGQgeCwgbmV3IHksIG5ldyB4LCBtYXggZGlzdGFuY2UgKHNxdWFyZWQpLCB0eXBlXVxuICAgIGNvbnN0IG1hcDogQXJyYXk8W251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyLCBzdHJpbmddPiA9IFtdO1xuICAgIGNvbnN0IHdhbGxzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IGJyaWRnZXM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgLy8gUGFpciB1cCBhcmVuYXMuXG4gICAgY29uc3QgYXJlbmFzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgbG9jLmFsbFBvcygpKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGxvYy5fc2NyZWVuc1twb3NdO1xuICAgICAgICBjb25zdCB5ID0gcG9zICYgMHhmMDtcbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYpIDw8IDQ7XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncGl0JykgJiYgbG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgcGl0cy5zZXQocG9zLCBzY3IuZWRnZUluZGV4KCdjJykgPT09IDUgPyAwIDogMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2NyLmRhdGEuc3RhdHVlcz8ubGVuZ3RoICYmIGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2NyLmRhdGEuc3RhdHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gc2NyLmRhdGEuc3RhdHVlc1tpXSA8PCAxMjtcbiAgICAgICAgICAgIGNvbnN0IHBhcml0eSA9ICgocG9zICYgMHhmKSBeIChwb3MgPj4+IDQpIF4gaSkgJiAxO1xuICAgICAgICAgICAgY29uc3QgY29sID0gcGFyaXR5ID8gMHg1MCA6IDB4YTA7XG4gICAgICAgICAgICBzdGF0dWVzLnB1c2goW3Bvcywgcm93IHwgY29sXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkge1xuICAgICAgICAgIGlmIChzY3IuZGF0YS53YWxsID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB3YWxsIHByb3BgKTtcbiAgICAgICAgICBjb25zdCB3YWxsID0gW3kgfCAoc2NyLmRhdGEud2FsbCA+PiA0KSwgeCB8IChzY3IuZGF0YS53YWxsICYgMHhmKV07XG4gICAgICAgICAgd2FsbHMucHVzaCh3YWxsIGFzIFtudW1iZXIsIG51bWJlcl0pO1xuICAgICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgXCJkb3VibGUgYnJpZGdlXCIgaW4gbGltZSB0cmVlIGxha2VcbiAgICAgICAgICBpZiAoc2NyLmRhdGEudGlsZXNldHMubGltZSkgd2FsbHMucHVzaChbd2FsbFswXSAtIDEsIHdhbGxbMV1dKTtcbiAgICAgICAgfSBlbHNlIGlmIChsb2MgPT09IHRoaXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAgICAgaWYgKHNjci5kYXRhLndhbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHdhbGwgcHJvcGApO1xuICAgICAgICAgIGJyaWRnZXMucHVzaChbeSB8IChzY3IuZGF0YS53YWxsID4+IDQpLCB4IHwgKHNjci5kYXRhLndhbGwgJiAweGYpXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzY3IuaGFzRmVhdHVyZSgnYXJlbmEnKSkgY29udGludWU7XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBhcmVuYXMucHVzaChbeSB8IDgsIHggfCA4XSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgW255LCBueF0gPSBhcmVuYXMucG9wKCkhO1xuICAgICAgICAgIG1hcC5wdXNoKFt5IHwgOCwgeCB8IDgsIG55LCBueCwgMTQ0LCAnYXJlbmEnXSk7IC8vIDEyIHRpbGVzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChsb2MgPT09IHRoaXMpIHsgLy8gVE9ETyAtIHRoaXMgaXMgYSBtZXNzLCBmYWN0b3Igb3V0IHRoZSBjb21tb25hbGl0eVxuICAgICAgICByYW5kb20uc2h1ZmZsZShhcmVuYXMpO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShzdGF0dWVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gTm93IHBhaXIgdXAgZXhpdHMuXG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIGV4aXRdIG9mIGxvYy5fZXhpdHMpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gbG9jLl9zY3JlZW5zW3Bvc107XG4gICAgICAgIGNvbnN0IHNwZWMgPSBzY3IuZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gdHlwZSk7XG4gICAgICAgIGlmICghc3BlYykgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGV4aXQ6ICR7c2NyLm5hbWV9ICR7dHlwZX1gKTtcbiAgICAgICAgY29uc3QgeDAgPSBwb3MgJiAweGY7XG4gICAgICAgIGNvbnN0IHkwID0gcG9zID4+PiA0O1xuICAgICAgICBjb25zdCB4MSA9IHNwZWMuZXhpdHNbMF0gJiAweGY7XG4gICAgICAgIGNvbnN0IHkxID0gc3BlYy5leGl0c1swXSA+Pj4gNDtcbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIHJldmVyc2VFeGl0cy5zZXQoZXhpdCwgW3kwIDw8IDQgfCB5MSwgeDAgPDwgNCB8IHgxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKGV4aXRbMF0gPj4+IDgpICE9PSB0aGlzLmlkKSB7IC8vIHNraXAgc2VsZi1leGl0c1xuICAgICAgICAgIGNvbnN0IFtueSwgbnhdID0gcmV2ZXJzZUV4aXRzLmdldChleGl0KSE7XG4gICAgICAgICAgbWFwLnB1c2goW3kwIDw8IDQgfCB5MSwgeDAgPDwgNCB8IHgxLCBueSwgbngsIDI1LCAnZXhpdCddKTsgLy8gNSB0aWxlc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE1ha2UgYSBsaXN0IG9mIFBPSSBieSBwcmlvcml0eSAoMC4uNSkuXG5cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBmaXJzdCBwYXJ0aXRpb25pbmcgdGhlIHNjcmVlbnMgd2l0aCBpbXBhc3NpYmxlXG4gICAgLy8gd2FsbHMgYW5kIHBsYWNpbmcgcG9pIGludG8gYXMgbWFueSBzZXBhcmF0ZSBwYXJ0aXRpb25zIChmcm9tXG4gICAgLy8gc3RhaXJzL2VudHJhbmNlcykgYXMgcG9zc2libGUgPz8/ICBPciBtYXliZSBqdXN0IHdlaWdodCB0aG9zZVxuICAgIC8vIGhpZ2hlcj8gIGRvbid0IHdhbnQgdG8gX2ZvcmNlXyB0aGluZ3MgdG8gYmUgaW5hY2Nlc3NpYmxlLi4uP1xuXG4gICAgY29uc3QgcHBvaTogQXJyYXk8QXJyYXk8W251bWJlciwgbnVtYmVyXT4+ID0gW1tdLCBbXSwgW10sIFtdLCBbXSwgW11dO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3QgW3AsIGR5ID0gMHg3MCwgZHggPSAweDc4XSBvZiBzY3IuZGF0YS5wb2kgPz8gW10pIHtcbiAgICAgICAgY29uc3QgeSA9ICgocG9zICYgMHhmMCkgPDwgNCkgKyBkeTtcbiAgICAgICAgY29uc3QgeCA9ICgocG9zICYgMHgwZikgPDwgOCkgKyBkeDtcbiAgICAgICAgcHBvaVtwXS5wdXNoKFt5LCB4XSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9pIG9mIHBwb2kpIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKHBvaSk7XG4gICAgfVxuICAgIGNvbnN0IGFsbFBvaSA9IFsuLi5pdGVycy5jb25jYXQoLi4ucHBvaSldO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgc3Bhd25zLCBsb29rIGZvciBOUEMvY2hlc3QvdHJpZ2dlci5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgXG4gICAgZm9yIChjb25zdCBzcGF3biBvZiByYW5kb20uaXNodWZmbGUobG9jLnNwYXducykpIHtcbiAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkge1xuICAgICAgICBjb25zdCBwbGF0Zm9ybSA9IFBMQVRGT1JNUy5pbmRleE9mKHNwYXduLm1vbnN0ZXJJZCk7XG4gICAgICAgIGlmIChwbGF0Zm9ybSA+PSAwICYmIHBpdHMuc2l6ZSkge1xuICAgICAgICAgIGNvbnN0IFtbcG9zLCBkaXJdXSA9IHBpdHM7XG4gICAgICAgICAgcGl0cy5kZWxldGUocG9zKTtcbiAgICAgICAgICBzcGF3bi5tb25zdGVySWQgPSBQTEFURk9STVNbcGxhdGZvcm0gJiAyIHwgZGlyXTtcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSBwb3M7XG4gICAgICAgICAgc3Bhd24udGlsZSA9IGRpciA/IDB4NzMgOiAweDQ3O1xuICAgICAgICB9IGVsc2UgaWYgKHNwYXduLm1vbnN0ZXJJZCA9PT0gMHg4ZiAmJiBzdGF0dWVzLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IFtzY3JlZW4sIGNvb3JkXSA9IHN0YXR1ZXMucG9wKCkhO1xuICAgICAgICAgIHNwYXduLnNjcmVlbiA9IHNjcmVlbjtcbiAgICAgICAgICBzcGF3bi5jb29yZCA9IGNvb3JkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlOyAvLyB0aGVzZSBhcmUgaGFuZGxlZCBlbHNld2hlcmUuXG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgIGNvbnN0IHdhbGwgPSAoc3Bhd24ud2FsbFR5cGUoKSA9PT0gJ2JyaWRnZScgPyBicmlkZ2VzIDogd2FsbHMpLnBvcCgpO1xuICAgICAgICBpZiAoIXdhbGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBlbm91Z2ggJHtzcGF3bi53YWxsVHlwZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9IHNjcmVlbnMgaW4gbmV3IG1ldGFsb2NhdGlvbjogJHtsb2N9XFxuJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFt5LCB4XSA9IHdhbGw7XG4gICAgICAgIHNwYXduLnl0ID0geTtcbiAgICAgICAgc3Bhd24ueHQgPSB4O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSB8fCBzcGF3bi5pc0Jvc3MoKSB8fCBzcGF3bi5pc1RyaWdnZXIoKSB8fFxuICAgICAgICAgICAgICAgICBzcGF3bi5pc0dlbmVyaWMoKSkge1xuICAgICAgICAvL2xldCBqID0gMDtcbiAgICAgICAgbGV0IGJlc3QgPSBbLTEsIC0xLCBJbmZpbml0eV07XG4gICAgICAgIGZvciAoY29uc3QgW3kwLCB4MCwgeTEsIHgxLCBkbWF4LCB0eXBdIG9mIG1hcCkge1xuICAgICAgICAgIGlmICh0eXAgIT09ICdhcmVuYScgJiYgc3Bhd24uaXNCb3NzKCkpIGNvbnRpbnVlOyAvLyBib3NzZXMgbmVlZCBhcmVuYVxuICAgICAgICAgIGNvbnN0IGQgPSAoeXREaWZmKHNwYXduLnl0LCB5MCkpICoqIDIgKyAoc3Bhd24ueHQgLSB4MCkgKiogMjtcbiAgICAgICAgICBpZiAoZCA8PSBkbWF4ICYmIGQgPCBiZXN0WzJdKSB7XG4gICAgICAgICAgICBiZXN0ID0gW3l0QWRkKHNwYXduLnl0LCB5dERpZmYoeTEsIHkwKSksIHNwYXduLnh0ICsgeDEgLSB4MCwgZF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUoYmVzdFsyXSkpIHtcbiAgICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIGFueSBOUENzIHdlIGFscmVhZHkgbW92ZWQgc28gdGhhdCBhbnl0aGluZyB0aGF0J3NcbiAgICAgICAgICAvLyBvbiB0b3Agb2YgaXQgKGkuZS4gZHVhbCBzcGF3bnMpIG1vdmUgYWxvbmcgd2l0aC5cbiAgICAgICAgICAvL2lmIChiZXN0WzJdID4gNCkgbWFwLnB1c2goW3NwYXduLnh0LCBzcGF3bi55dCwgYmVzdFswXSwgYmVzdFsxXSwgNF0pO1xuICAgICAgICAgIC8vIC0gVE9ETyAtIEkgZG9uJ3QgdGhpbmsgd2UgbmVlZCB0aGlzLCBzaW5jZSBhbnkgZnV0dXJlIHNwYXduIHNob3VsZFxuICAgICAgICAgIC8vICAgYmUgcGxhY2VkIGJ5IHRoZSBzYW1lIHJ1bGVzLlxuICAgICAgICAgIFtzcGF3bi55dCwgc3Bhd24ueHRdID0gYmVzdDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gV2Fzbid0IGFibGUgdG8gbWFwIGFuIGFyZW5hIG9yIGV4aXQuICBQaWNrIGEgbmV3IFBPSSwgYnV0IHRyaWdnZXJzIGFuZFxuICAgICAgLy8gYm9zc2VzIGFyZSBpbmVsaWdpYmxlLlxuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpIHx8IHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHBsYWNlICR7bG9jfSAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduLmlzQm9zcygpID8gJ0Jvc3MnIDogJ1RyaWdnZXInfSAke3NwYXduLmhleCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiR7dGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXh0ID0gYWxsUG9pLnNoaWZ0KCk7XG4gICAgICBpZiAoIW5leHQpIHRocm93IG5ldyBFcnJvcihgUmFuIG91dCBvZiBQT0kgZm9yICR7bG9jfWApO1xuICAgICAgY29uc3QgW3ksIHhdID0gbmV4dDtcbiAgICAgIC8vIFRPRE8gLSB3aGF0IGlzIHRoaXMgYWJvdXQ/IEkgc2VlbSB0byBoYXZlIGZvcmdvdHRlbi5cbiAgICAgIC8vIE1heWJlIHRoaXMgaXMganVzdCBhIGZhbGwtYmFjayBpbiBjYXNlIHdlIGNhbid0IGZpbmQgYXl0aGluZyBlbHNlP1xuICAgICAgY29uc29sZS5lcnJvcihgV2VpcmQgbWFwIGFkZGl0aW9uOiAke2xvY30gJHtzcGF3bi5oZXgoKX1gKTtcbiAgICAgIG1hcC5wdXNoKFtzcGF3bi55ID4+PiA0LCBzcGF3bi54ID4+PiA0LCB5ID4+PiA0LCB4ID4+PiA0LCA0LCAnPz8/J10pO1xuICAgICAgc3Bhd24ueSA9IHk7XG4gICAgICBzcGF3bi54ID0geDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzZWFtbGVzcyBwYWlyIGxvY2F0aW9uLCBzeW5jIHVwIHRoZSBleGl0cy4gIEZvciBlYWNoIGV4aXQgb2ZcbiAgICogZWl0aGVyLCBjaGVjayBpZiBpdCdzIHN5bW1ldHJpYywgYW5kIGlmIHNvLCBjb3B5IGl0IG92ZXIgdG8gdGhlIG90aGVyIHNpZGUuXG4gICAqL1xuICByZWNvbmNpbGVFeGl0cyh0aGF0OiBNZXRhbG9jYXRpb24pIHtcbiAgICBjb25zdCBhZGQ6IFtNZXRhbG9jYXRpb24sIFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXVtdID0gW107XG4gICAgY29uc3QgZGVsOiBbTWV0YWxvY2F0aW9uLCBQb3MsIENvbm5lY3Rpb25UeXBlXVtdID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiBsb2MuX2V4aXRzKSB7XG4gICAgICAgIGlmIChkZXN0VHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF07XG4gICAgICAgIGNvbnN0IHJldmVyc2UgPSBkZXN0Lm1ldGEuX2V4aXRzLmdldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlKTtcbiAgICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgICBjb25zdCBbcmV2VGlsZSwgcmV2VHlwZV0gPSByZXZlcnNlO1xuICAgICAgICAgIGlmICgocmV2VGlsZSA+Pj4gOCkgPT09IGxvYy5pZCAmJiAocmV2VGlsZSAmIDB4ZmYpID09PSBwb3MgJiZcbiAgICAgICAgICAgICAgcmV2VHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgYWRkLnB1c2goW2xvYyA9PT0gdGhpcyA/IHRoYXQgOiB0aGlzLCBwb3MsIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkZWwucHVzaChbbG9jLCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGVdIG9mIGRlbCkge1xuICAgICAgbG9jLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGUsIGV4aXRdIG9mIGFkZCkge1xuICAgICAgbG9jLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gICAgLy8gdGhpcy5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICAgIC8vIHRoYXQuX2V4aXRzID0gbmV3IFRhYmxlKGV4aXRzKTtcbiAgfVxuXG4gIC8qKiBXcml0ZXMgdGhlIGVudHJhbmNlMCBpZiBwb3NzaWJsZS4gKi9cbiAgd3JpdGVFbnRyYW5jZTAoKSB7XG4gICAgaWYgKCF0aGlzLl9lbnRyYW5jZTApIHJldHVybjtcbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGVdIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBpZiAodHlwZSAhPT0gdGhpcy5fZW50cmFuY2UwKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGV4aXQgPSB0aGlzLl9zY3JlZW5zW3Bvc10uZmluZEV4aXRCeVR5cGUodHlwZSk7XG4gICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF0uZW50cmFuY2VzWzBdID1cbiAgICAgICAgICBFbnRyYW5jZS5vZih7c2NyZWVuOiBwb3MsIGNvb3JkOiBleGl0LmVudHJhbmNlfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNhdmVzIHRoZSBjdXJyZW50IHN0YXRlIGJhY2sgaW50byB0aGUgdW5kZXJseWluZyBsb2NhdGlvbi5cbiAgICogQ3VycmVudGx5IHRoaXMgb25seSBkZWFscyB3aXRoIGVudHJhbmNlcy9leGl0cyAoPz8pXG4gICAqL1xuICB3cml0ZSgpIHtcbiAgICBjb25zdCBzcmNMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgLy9sZXQgc2VhbWxlc3NQYXJ0bmVyOiBMb2NhdGlvbnx1bmRlZmluZWQ7XG4gICAgY29uc3Qgc2VhbWxlc3NQb3MgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IFtzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgY29uc3Qgc3JjU2NyZWVuID0gdGhpcy5fc2NyZWVuc1tzcmNQb3NdO1xuICAgICAgY29uc3QgZGVzdCA9IGRlc3RUaWxlID4+IDg7XG4gICAgICBsZXQgZGVzdFBvcyA9IGRlc3RUaWxlICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3RMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF07XG4gICAgICBjb25zdCBkZXN0TWV0YSA9IGRlc3RMb2MubWV0YSE7XG4gICAgICBjb25zdCBkZXN0U2NyZWVuID0gZGVzdE1ldGEuX3NjcmVlbnNbZGVzdFRpbGUgJiAweGZmXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gc3JjVHlwZSk7XG4gICAgICBjb25zdCBkZXN0RXhpdCA9IGRlc3RTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gZGVzdFR5cGUpO1xuICAgICAgaWYgKCFzcmNFeGl0IHx8ICFkZXN0RXhpdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgJHtzcmNFeGl0ID8gJ2Rlc3QnIDogJ3NvdXJjZSd9IGV4aXQ6XG4gIEZyb206ICR7c3JjTG9jfSBAICR7aGV4KHNyY1Bvcyl9OiR7c3JjVHlwZX0gJHtzcmNTY3JlZW4ubmFtZX1cbiAgVG86ICAgJHtkZXN0TG9jfSBAICR7aGV4KGRlc3RQb3MpfToke2Rlc3RUeXBlfSAke2Rlc3RTY3JlZW4ubmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIC8vIFNlZSBpZiB0aGUgZGVzdCBlbnRyYW5jZSBleGlzdHMgeWV0Li4uXG4gICAgICBsZXQgZW50cmFuY2UgPSAweDIwO1xuICAgICAgaWYgKGRlc3RFeGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICBzZWFtbGVzc1Bvcy5hZGQoc3JjUG9zKTtcbiAgICAgICAgLy9zZWFtbGVzc1BhcnRuZXIgPSBkZXN0TG9jO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGRlc3RDb29yZCA9IGRlc3RFeGl0LmVudHJhbmNlO1xuICAgICAgICBpZiAoZGVzdENvb3JkID4gMHhlZmZmKSB7IC8vIGhhbmRsZSBzcGVjaWFsIGNhc2UgaW4gT2FrXG4gICAgICAgICAgZGVzdFBvcyArPSAweDEwO1xuICAgICAgICAgIGRlc3RDb29yZCAtPSAweDEwMDAwO1xuICAgICAgICB9XG4gICAgICAgIGVudHJhbmNlID0gZGVzdExvYy5maW5kT3JBZGRFbnRyYW5jZShkZXN0UG9zLCBkZXN0Q29vcmQpO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgdGlsZSBvZiBzcmNFeGl0LmV4aXRzKSB7XG4gICAgICAgIGxldCBzY3JlZW4gPSBzcmNQb3M7XG4gICAgICAgIGlmICgodGlsZSAmIDB4ZjApID09PSAweGYwKSB7XG4gICAgICAgICAgc2NyZWVuICs9IDB4MTA7XG4gICAgICAgICAgdGlsZSAmPSAweGY7XG4gICAgICAgIH1cbiAgICAgICAgLy9pZiAoc3JjRXhpdC50eXBlID09PSAnZWRnZTpib3R0b20nICYmIHRoaXMuaGVpZ2h0ID09PSAxKSB0aWxlIC09IDB4MjA7XG4gICAgICAgIHNyY0xvYy5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbiwgdGlsZSwgZGVzdCwgZW50cmFuY2V9KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHNyY0xvYy53aWR0aCA9IHRoaXMuX3dpZHRoO1xuICAgIHNyY0xvYy5oZWlnaHQgPSB0aGlzLl9oZWlnaHQ7XG4gICAgc3JjTG9jLnNjcmVlbnMgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX2hlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3c6IG51bWJlcltdID0gW107XG4gICAgICBzcmNMb2Muc2NyZWVucy5wdXNoKHJvdyk7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX3dpZHRoOyB4KyspIHtcbiAgICAgICAgcm93LnB1c2godGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XS5zaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBzcmNMb2MudGlsZXNldCA9IHRoaXMudGlsZXNldC50aWxlc2V0SWQ7XG4gICAgc3JjTG9jLnRpbGVFZmZlY3RzID0gdGhpcy50aWxlc2V0LmVmZmVjdHMoKS5pZDtcblxuICAgIC8vIGZpbmQgcmVhY2hhYmxlIHBvcyBmcm9tIGFueSBleGl0XG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBpZiAoc2VhbWxlc3NQb3MuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgY29uc3QgYmVsb3cgPSBwb3MgKyAxNjtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gcG9zICsgMTtcbiAgICAgIGlmICghc2VhbWxlc3NQb3MuaGFzKGJlbG93KSAmJiAoc2NyLmRhdGEuZWRnZXM/LlsyXSA/PyAnICcpICE9PSAnICcpIHtcbiAgICAgICAgdWYudW5pb24oW3BvcywgYmVsb3ddKTtcbiAgICAgIH1cbiAgICAgIGlmICghc2VhbWxlc3NQb3MuaGFzKHJpZ2h0KSAmJiAoc2NyLmRhdGEuZWRnZXM/LlszXSA/PyAnICcpICE9PSAnICcpIHtcbiAgICAgICAgdWYudW5pb24oW3BvcywgcmlnaHRdKTtcbiAgICAgIH1cbiAgICAgIHVmLnVuaW9uKFtwb3NdKTtcbiAgICB9XG4gICAgY29uc3QgcmVhY2hhYmxlTWFwID0gdWYubWFwKCk7XG4gICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBbc3JjUG9zXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgcmVhY2hhYmxlTWFwLmdldChzcmNQb3MpID8/IFtdKSB7XG4gICAgICAgIHJlYWNoYWJsZS5hZGQocG9zKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSBmbGFnc1xuICAgIHNyY0xvYy5mbGFncyA9IFtdO1xuICAgIGNvbnN0IGZyZWVGbGFncyA9IFsuLi50aGlzLmZyZWVGbGFnc107XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1tzY3JlZW5dO1xuICAgICAgbGV0IGZsYWc6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgICBpZiAoc2NyLmRhdGEud2FsbCAhPSBudWxsICYmIHJlYWNoYWJsZS5oYXMoc2NyZWVuKSkge1xuICAgICAgICAvLyAhc2VhbWxlc3NQYXJ0bmVyKSB7XG4gICAgICAgIGZsYWcgPSBmcmVlRmxhZ3MucG9wKCk/LmlkID8/IHRoaXMucm9tLmZsYWdzLmFsbG9jKDB4MjAwKTtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdhbHdheXMnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2NhbG0nKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5DYWxtZWRBbmdyeVNlYS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206ZmFsc2UnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206dHJ1ZScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMuY3VzdG9tRmxhZ3MuZ2V0KHNjcmVlbik/LmlkID8/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQ7XG4gICAgICB9XG4gICAgICBpZiAoZmxhZyAhPSBudWxsKSB7XG4gICAgICAgIHNyY0xvYy5mbGFncy5wdXNoKExvY2F0aW9uRmxhZy5vZih7c2NyZWVuLCBmbGFnfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdyaXRlIHBpdHNcbiAgICBzcmNMb2MucGl0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2Zyb21TY3JlZW4sIHRvXSBvZiB0aGlzLl9waXRzKSB7XG4gICAgICBjb25zdCB0b1NjcmVlbiA9IHRvICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3QgPSB0byA+Pj4gODtcbiAgICAgIHNyY0xvYy5waXRzLnB1c2goUGl0Lm9mKHtmcm9tU2NyZWVuLCB0b1NjcmVlbiwgZGVzdH0pKTtcbiAgICB9XG4gIH1cblxuICAvLyBOT1RFOiB0aGlzIGNhbiBvbmx5IGJlIGRvbmUgQUZURVIgY29weWluZyB0byB0aGUgbG9jYXRpb24hXG4gIHJlcGxhY2VNb25zdGVycyhyYW5kb206IFJhbmRvbSkge1xuICAgIGlmICh0aGlzLmlkID09PSAweDY4KSByZXR1cm47IC8vIHdhdGVyIGxldmVscywgZG9uJ3QgcGxhY2Ugb24gbGFuZD8/P1xuICAgIC8vIE1vdmUgYWxsIHRoZSBtb25zdGVycyB0byByZWFzb25hYmxlIGxvY2F0aW9ucy5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgY29uc3QgcGxhY2VyID0gbG9jLm1vbnN0ZXJQbGFjZXIocmFuZG9tKTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghc3Bhd24udXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXNwYXduLmlzTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG1vbnN0ZXIgPSBsb2Mucm9tLm9iamVjdHNbc3Bhd24ubW9uc3RlcklkXTtcbiAgICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkgY29udGludWU7XG4gICAgICBjb25zdCBwb3MgPSBwbGFjZXIobW9uc3Rlcik7XG4gICAgICBpZiAocG9zID09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgbm8gdmFsaWQgbG9jYXRpb24gZm9yICR7aGV4KG1vbnN0ZXIuaWQpfSBpbiAke2xvY31gKTtcbiAgICAgICAgc3Bhd24udXNlZCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zID4+PiA4O1xuICAgICAgICBzcGF3bi50aWxlID0gcG9zICYgMHhmZjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRyYXZlcnNlT3B0cyB7XG4gIC8vIERvIG5vdCBwYXNzIGNlcnRhaW4gdGlsZXMgaW4gdHJhdmVyc2VcbiAgcmVhZG9ubHkgd2l0aD86IFJlYWRvbmx5TWFwPFBvcywgTWV0YXNjcmVlbj47XG4gIC8vIFdoZXRoZXIgdG8gYnJlYWsgd2FsbHMvZm9ybSBicmlkZ2VzXG4gIHJlYWRvbmx5IG5vRmxhZ2dlZD86IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdG8gYXNzdW1lIGZsaWdodFxuICByZWFkb25seSBmbGlnaHQ/OiBib29sZWFuO1xufVxuXG5cbmNvbnN0IHVua25vd25FeGl0V2hpdGVsaXN0ID0gbmV3IFNldChbXG4gIDB4MDEwMDNhLCAvLyB0b3AgcGFydCBvZiBjYXZlIG91dHNpZGUgc3RhcnRcbiAgMHgwMTAwM2IsXG4gIDB4MTU0MGEwLCAvLyBcIiBcIiBzZWFtbGVzcyBlcXVpdmFsZW50IFwiIFwiXG4gIDB4MWEzMDYwLCAvLyBzd2FtcCBleGl0XG4gIDB4NDAyMDAwLCAvLyBicmlkZ2UgdG8gZmlzaGVybWFuIGlzbGFuZFxuICAweDQwMjAzMCxcbiAgMHg0MTgwZDAsIC8vIGJlbG93IGV4aXQgdG8gbGltZSB0cmVlIHZhbGxleVxuICAweDYwODdiZiwgLy8gYmVsb3cgYm9hdCBjaGFubmVsXG4gIDB4YTEwMzI2LCAvLyBjcnlwdCAyIGFyZW5hIG5vcnRoIGVkZ2VcbiAgMHhhMTAzMjksXG4gIDB4YTkwNjI2LCAvLyBzdGFpcnMgYWJvdmUga2VsYnkgMlxuICAweGE5MDYyOSxcbl0pO1xuXG4vL2NvbnN0IERQT1MgPSBbLTE2LCAtMSwgMTYsIDFdO1xuY29uc3QgRElSX05BTUUgPSBbJ2Fib3ZlJywgJ2xlZnQgb2YnLCAnYmVsb3cnLCAncmlnaHQgb2YnXTtcblxudHlwZSBPcHRpb25hbDxUPiA9IFR8bnVsbHx1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGRpc3RhbmNlKGE6IFBvcywgYjogUG9zKTogbnVtYmVyIHtcbiAgcmV0dXJuICgoYSA+Pj4gNCkgLSAoYiA+Pj4gNCkpICoqIDIgKyAoKGEgJiAweGYpIC0gKGIgJiAweGYpKSAqKiAyO1xufVxuXG5mdW5jdGlvbiBhZGREZWx0YShzdGFydDogUG9zLCBwbHVzOiBQb3MsIG1pbnVzOiBQb3MsIG1ldGE6IE1ldGFsb2NhdGlvbik6IFBvcyB7XG4gIGNvbnN0IHB4ID0gcGx1cyAmIDB4ZjtcbiAgY29uc3QgcHkgPSBwbHVzID4+PiA0O1xuICBjb25zdCBteCA9IG1pbnVzICYgMHhmO1xuICBjb25zdCBteSA9IG1pbnVzID4+PiA0O1xuICBjb25zdCBzeCA9IHN0YXJ0ICYgMHhmO1xuICBjb25zdCBzeSA9IHN0YXJ0ID4+PiA0O1xuICBjb25zdCBveCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1ldGEud2lkdGggLSAxLCBzeCArIHB4IC0gbXgpKTtcbiAgY29uc3Qgb3kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtZXRhLmhlaWdodCAtIDEsIHN5ICsgcHkgLSBteSkpO1xuICByZXR1cm4gb3kgPDwgNCB8IG94O1xufVxuXG4vLyBiaXQgMSA9IGNydW1ibGluZywgYml0IDAgPSBob3Jpem9udGFsOiBbdiwgaCwgY3YsIGNoXVxuY29uc3QgUExBVEZPUk1TOiByZWFkb25seSBudW1iZXJbXSA9IFsweDdlLCAweDdmLCAweDlmLCAweDhkXTtcbiJdfQ==