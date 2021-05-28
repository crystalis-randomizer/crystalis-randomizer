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
                    map.push([y | 8, x | 8, ny, nx, 144]);
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
                    map.push([y0 << 4 | y1, x0 << 4 | x1, ny, nx, 25]);
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
                for (const [y0, x0, y1, x1, dmax] of map) {
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
            map.push([spawn.y >>> 4, spawn.x >>> 4, y >>> 4, x >>> 4, 4]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBSS9GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFaEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBc0NqQixNQUFNLE9BQU8sWUFBWTtJQW1DdkIsWUFBcUIsRUFBVSxFQUFXLE9BQW9CLEVBQ2xELE1BQWMsRUFBRSxLQUFhO1FBRHBCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBN0I5RCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFDbkMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFRLENBQUM7UUFPcEIsU0FBSSxHQUFvQixTQUFTLENBQUM7UUFFbEMsV0FBTSxHQUFHLElBQUksS0FBSyxFQUFpQyxDQUFDO1FBR3BELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBa0JyQyxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFB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QyxRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7Q0FDVCxDQUFDLENBQUM7QUFHSCxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBSTNELFNBQVMsUUFBUSxDQUFDLENBQU0sRUFBRSxDQUFNO0lBQzlCLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxLQUFVLEVBQUUsSUFBUyxFQUFFLEtBQVUsRUFBRSxJQUFrQjtJQUNyRSxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDO0lBQ3RCLE1BQU0sRUFBRSxHQUFHLElBQUksS0FBSyxDQUFDLENBQUM7SUFDdEIsTUFBTSxFQUFFLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUN2QixNQUFNLEVBQUUsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUM7SUFDdkIsTUFBTSxFQUFFLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQztJQUN2QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLENBQUM7QUFHRCxNQUFNLFNBQVMsR0FBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvY2F0aW9uIH0gZnJvbSAnLi9sb2NhdGlvbi5qcyc7IC8vIGltcG9ydCB0eXBlXG5pbXBvcnQgeyBFeGl0LCBGbGFnIGFzIExvY2F0aW9uRmxhZywgUGl0LCB5dERpZmYsIHl0QWRkLCBFbnRyYW5jZSB9IGZyb20gJy4vbG9jYXRpb250YWJsZXMuanMnO1xuaW1wb3J0IHsgRmxhZyB9IGZyb20gJy4vZmxhZ3MuanMnO1xuaW1wb3J0IHsgTWV0YXNjcmVlbiwgVWlkIH0gZnJvbSAnLi9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7IE1ldGF0aWxlc2V0IH0gZnJvbSAnLi9tZXRhdGlsZXNldC5qcyc7XG5pbXBvcnQgeyBoZXggfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHsgUm9tIH0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7IERlZmF1bHRNYXAsIFRhYmxlLCBpdGVycywgZm9ybWF0IH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgQ29ubmVjdGlvblR5cGUgfSBmcm9tICcuL21ldGFzY3JlZW5kYXRhLmpzJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQgeyBNb25zdGVyIH0gZnJvbSAnLi9tb25zdGVyLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxuLy8gTW9kZWwgb2YgYSBsb2NhdGlvbiB3aXRoIG1ldGFzY3JlZW5zLCBldGMuXG5cbi8vIFRyaWNrOiB3ZSBuZWVkIHNvbWV0aGluZyB0byBvd24gdGhlIG5laWdoYm9yIGNhY2hlLlxuLy8gIC0gcHJvYmFibHkgdGhpcyBiZWxvbmdzIGluIHRoZSBNZXRhdGlsZXNldC5cbi8vICAtIG1ldGhvZCB0byByZWdlbmVyYXRlLCBkbyBpdCBhZnRlciB0aGUgc2NyZWVuIG1vZHM/XG4vLyBEYXRhIHdlIHdhbnQgdG8ga2VlcCB0cmFjayBvZjpcbi8vICAtIGdpdmVuIHR3byBzY3JlZW5zIGFuZCBhIGRpcmVjdGlvbiwgY2FuIHRoZXkgYWJ1dD9cbi8vICAtIGdpdmVuIGEgc2NyZWVuIGFuZCBhIGRpcmVjdGlvbiwgd2hhdCBzY3JlZW5zIG9wZW4vY2xvc2UgdGhhdCBlZGdlP1xuLy8gICAgLSB3aGljaCBvbmUgaXMgdGhlIFwiZGVmYXVsdFwiP1xuXG4vLyBUT0RPIC0gY29uc2lkZXIgYWJzdHJhY3RpbmcgZXhpdHMgaGVyZT9cbi8vICAtIGV4aXRzOiBBcnJheTxbRXhpdFNwZWMsIG51bWJlciwgRXhpdFNwZWNdPlxuLy8gIC0gRXhpdFNwZWMgPSB7dHlwZT86IENvbm5lY3Rpb25UeXBlLCBzY3I/OiBudW1iZXJ9XG4vLyBIb3cgdG8gaGFuZGxlIGNvbm5lY3RpbmcgdGhlbSBjb3JyZWN0bHk/XG4vLyAgLSBzaW1wbHkgc2F5aW5nIFwiLT4gd2F0ZXJmYWxsIHZhbGxleSBjYXZlXCIgaXMgbm90IGhlbHBmdWwgc2luY2UgdGhlcmUncyAyXG4vLyAgICBvciBcIi0+IHdpbmQgdmFsbGV5IGNhdmVcIiB3aGVuIHRoZXJlJ3MgNS5cbi8vICAtIHVzZSBzY3JJZCBhcyB1bmlxdWUgaWRlbnRpZmllcj8gIG9ubHkgcHJvYmxlbSBpcyBzZWFsZWQgY2F2ZSBoYXMgMy4uLlxuLy8gIC0gbW92ZSB0byBkaWZmZXJlbnQgc2NyZWVuIGFzIG5lY2Vzc2FyeS4uLlxuLy8gICAgKGNvdWxkIGFsc28ganVzdCBkaXRjaCB0aGUgb3RoZXIgdHdvIGFuZCB0cmVhdCB3aW5kbWlsbCBlbnRyYW5jZSBhc1xuLy8gICAgIGEgZG93biBlbnRyYW5jZSAtIHNhbWUgdy8gbGlnaHRob3VzZT8pXG4vLyAgLSBvbmx5IGEgc21hbGwgaGFuZGZ1bGwgb2YgbG9jYXRpb25zIGhhdmUgZGlzY29ubmVjdGVkIGNvbXBvbmVudHM6XG4vLyAgICAgIHdpbmRtaWxsLCBsaWdodGhvdXNlLCBweXJhbWlkLCBnb2EgYmFja2Rvb3IsIHNhYmVyYSwgc2FicmUvaHlkcmEgbGVkZ2VzXG4vLyAgLSB3ZSByZWFsbHkgZG8gY2FyZSB3aGljaCBpcyBpbiB3aGljaCBjb21wb25lbnQuXG4vLyAgICBidXQgbWFwIGVkaXRzIG1heSBjaGFuZ2UgZXZlbiB0aGUgbnVtYmVyIG9mIGNvbXBvbmVudHM/Pz9cbi8vICAtIGRvIHdlIGRvIGVudHJhbmNlIHNodWZmbGUgZmlyc3Qgb3IgbWFwIHNodWZmbGUgZmlyc3Q/XG4vLyAgICBvciBhcmUgdGhleSBpbnRlcmxlYXZlZD8hP1xuLy8gICAgaWYgd2Ugc2h1ZmZsZSBzYWJyZSBvdmVyd29ybGQgdGhlbiB3ZSBuZWVkIHRvIGtub3cgd2hpY2ggY2F2ZXMgY29ubmVjdFxuLy8gICAgdG8gd2hpY2guLi4gYW5kIHBvc3NpYmx5IGNoYW5nZSB0aGUgY29ubmVjdGlvbnM/XG4vLyAgICAtIG1heSBuZWVkIGxlZXdheSB0byBhZGQvc3VidHJhY3QgY2F2ZSBleGl0cz8/XG4vLyBQcm9ibGVtIGlzIHRoYXQgZWFjaCBleGl0IGlzIGNvLW93bmVkIGJ5IHR3byBtZXRhbG9jYXRpb25zLlxuXG5cbmV4cG9ydCB0eXBlIFBvcyA9IG51bWJlcjtcbmV4cG9ydCB0eXBlIExvY1BvcyA9IG51bWJlcjsgLy8gbG9jYXRpb24gPDwgOCB8IHBvc1xuZXhwb3J0IHR5cGUgRXhpdFNwZWMgPSByZWFkb25seSBbTG9jUG9zLCBDb25uZWN0aW9uVHlwZV07XG5cbmV4cG9ydCBjbGFzcyBNZXRhbG9jYXRpb24ge1xuXG4gIC8vIFRPRE8gLSBzdG9yZSBtZXRhZGF0YSBhYm91dCB3aW5kbWlsbCBmbGFnPyAgdHdvIG1ldGFsb2NzIHdpbGwgbmVlZCBhIHBvcyB0b1xuICAvLyBpbmRpY2F0ZSB3aGVyZSB0aGF0IGZsYWcgc2hvdWxkIGdvLi4uPyAgT3Igc3RvcmUgaXQgaW4gdGhlIG1ldGFzY3JlZW4/XG5cbiAgLy8gQ2F2ZXMgYXJlIGFzc3VtZWQgdG8gYmUgYWx3YXlzIG9wZW4gdW5sZXNzIHRoZXJlJ3MgYSBmbGFnIHNldCBoZXJlLi4uXG4gIGN1c3RvbUZsYWdzID0gbmV3IE1hcDxQb3MsIEZsYWc+KCk7XG4gIGZyZWVGbGFncyA9IG5ldyBTZXQ8RmxhZz4oKTtcblxuICByZWFkb25seSByb206IFJvbTtcblxuICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgcHJpdmF0ZSBfd2lkdGg6IG51bWJlcjtcblxuICBwcml2YXRlIF9wb3M6IFBvc1tdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBwcml2YXRlIF9leGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcbiAgLy9wcml2YXRlIF9lbnRyYW5jZXMgPSBuZXcgRGVmYXVsdE1hcDxDb25uZWN0aW9uVHlwZSwgU2V0PG51bWJlcj4+KCgpID0+IG5ldyBTZXQoKSk7XG4gIHByaXZhdGUgX2VudHJhbmNlMD86IENvbm5lY3Rpb25UeXBlO1xuICBwcml2YXRlIF9waXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTsgLy8gTWFwcyB0byBsb2MgPDwgOCB8IHBvc1xuXG4gIC8vcHJpdmF0ZSBfbW9uc3RlcnNJbnZhbGlkYXRlZCA9IGZhbHNlO1xuXG4gIC8qKiBLZXk6ICh5PDw0KXx4ICovXG4gIHByaXZhdGUgX3NjcmVlbnM6IE1ldGFzY3JlZW5bXTtcblxuICAvLyBOT1RFOiBrZWVwaW5nIHRyYWNrIG9mIHJlYWNoYWJpbGl0eSBpcyBpbXBvcnRhbnQgYmVjYXVzZSB3aGVuIHdlXG4gIC8vIGRvIHRoZSBzdXJ2ZXkgd2UgbmVlZCB0byBvbmx5IGNvdW50IFJFQUNIQUJMRSB0aWxlcyEgIFNlYW1sZXNzXG4gIC8vIHBhaXJzIGFuZCBicmlkZ2VzIGNhbiBjYXVzZSBsb3RzIG9mIGltcG9ydGFudC10by1yZXRhaW4gdW5yZWFjaGFibGVcbiAgLy8gdGlsZXMuICBNb3Jlb3Zlciwgc29tZSBkZWFkLWVuZCB0aWxlcyBjYW4ndCBhY3R1YWxseSBiZSB3YWxrZWQgb24uXG4gIC8vIEZvciBub3cgd2UnbGwganVzdCB6ZXJvIG91dCBmZWF0dXJlIG1ldGFzY3JlZW5zIHRoYXQgYXJlbid0XG4gIC8vIHJlYWNoYWJsZSwgc2luY2UgdHJ5aW5nIHRvIGRvIGl0IGNvcnJlY3RseSByZXF1aXJlcyBzdG9yaW5nXG4gIC8vIHJlYWNoYWJpbGl0eSBhdCB0aGUgdGlsZSBsZXZlbCAoYWdhaW4gZHVlIHRvIGJyaWRnZSBkb3VibGUgc3RhaXJzKS5cbiAgLy8gcHJpdmF0ZSBfcmVhY2hhYmxlOiBVaW50OEFycmF5fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBpZDogbnVtYmVyLCByZWFkb25seSB0aWxlc2V0OiBNZXRhdGlsZXNldCxcbiAgICAgICAgICAgICAgaGVpZ2h0OiBudW1iZXIsIHdpZHRoOiBudW1iZXIpIHtcbiAgICB0aGlzLnJvbSA9IHRpbGVzZXQucm9tO1xuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX3NjcmVlbnMgPSBuZXcgQXJyYXkoaGVpZ2h0IDw8IDQpLmZpbGwodGlsZXNldC5lbXB0eSk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugb3V0IGEgbWV0YWxvY2F0aW9uIGZyb20gdGhlIGdpdmVuIGxvY2F0aW9uLiAgSW5mZXIgdGhlXG4gICAqIHRpbGVzZXQgaWYgcG9zc2libGUsIG90aGVyd2lzZSBpdCBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxuICAgKi9cbiAgc3RhdGljIG9mKGxvY2F0aW9uOiBMb2NhdGlvbiwgdGlsZXNldD86IE1ldGF0aWxlc2V0KTogTWV0YWxvY2F0aW9uIHtcbiAgICBjb25zdCB7cm9tLCB3aWR0aCwgaGVpZ2h0fSA9IGxvY2F0aW9uO1xuICAgIGlmICghdGlsZXNldCkge1xuICAgICAgLy8gSW5mZXIgdGhlIHRpbGVzZXQuICBTdGFydCBieSBhZGRpbmcgYWxsIGNvbXBhdGlibGUgbWV0YXRpbGVzZXRzLlxuICAgICAgY29uc3Qge2ZvcnRyZXNzLCBsYWJ5cmludGh9ID0gcm9tLm1ldGF0aWxlc2V0cztcbiAgICAgIGNvbnN0IHRpbGVzZXRzID0gbmV3IFNldDxNZXRhdGlsZXNldD4oKTtcbiAgICAgIGZvciAoY29uc3QgdHMgb2Ygcm9tLm1ldGF0aWxlc2V0cykge1xuICAgICAgICBpZiAobG9jYXRpb24udGlsZXNldCA9PT0gdHMudGlsZXNldC5pZCkgdGlsZXNldHMuYWRkKHRzKTtcbiAgICAgIH1cbiAgICAgIC8vIEl0J3MgaW1wb3NzaWJsZSB0byBkaXN0aW5ndWlzaCBmb3J0cmVzcyBhbmQgbGFieXJpbnRoLCBzbyB3ZSBoYXJkY29kZVxuICAgICAgLy8gaXQgYmFzZWQgb24gbG9jYXRpb246IG9ubHkgJGE5IGlzIGxhYnlyaW50aC5cbiAgICAgIHRpbGVzZXRzLmRlbGV0ZShsb2NhdGlvbi5pZCA9PT0gMHhhOSA/IGZvcnRyZXNzIDogbGFieXJpbnRoKTtcbiAgICAgIC8vIEZpbHRlciBvdXQgYW55IHRpbGVzZXRzIHRoYXQgZG9uJ3QgaW5jbHVkZSBuZWNlc3Nhcnkgc2NyZWVuIGlkcy5cbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIG5ldyBTZXQoaXRlcnMuY29uY2F0KC4uLmxvY2F0aW9uLnNjcmVlbnMpKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHRpbGVzZXQgb2YgdGlsZXNldHMpIHtcbiAgICAgICAgICBpZiAoIXRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMoc2NyZWVuKS5sZW5ndGgpIHRpbGVzZXRzLmRlbGV0ZSh0aWxlc2V0KTtcbiAgICAgICAgICBpZiAoIXRpbGVzZXRzLnNpemUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdGlsZXNldCBmb3IgJHtoZXgoc2NyZWVuKX0gaW4gJHtsb2NhdGlvbn1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0aWxlc2V0cy5zaXplICE9PSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSB0aWxlc2V0IGZvciAke2xvY2F0aW9ufTogWyR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgQXJyYXkuZnJvbSh0aWxlc2V0cywgdCA9PiB0Lm5hbWUpLmpvaW4oJywgJyl9XWApO1xuICAgICAgfVxuICAgICAgdGlsZXNldCA9IFsuLi50aWxlc2V0c11bMF07XG4gICAgfVxuXG4gICAgLy8gVHJhdmVyc2UgdGhlIGxvY2F0aW9uIGZvciBhbGwgdGlsZXMgcmVhY2hhYmxlIGZyb20gYW4gZW50cmFuY2UuXG4gICAgLy8gVGhpcyBpcyB1c2VkIHRvIGluZm9ybSB3aGljaCBtZXRhc2NyZWVuIHRvIHNlbGVjdCBmb3Igc29tZSBvZiB0aGVcbiAgICAvLyByZWR1bmRhbnQgb25lcyAoaS5lLiBkb3VibGUgZGVhZCBlbmRzKS4gIFRoaXMgaXMgYSBzaW1wbGUgdHJhdmVyc2FsXG4gICAgY29uc3QgcmVhY2hhYmxlID0gbG9jYXRpb24ucmVhY2hhYmxlVGlsZXModHJ1ZSk7IC8vIHRyYXZlcnNlUmVhY2hhYmxlKDB4MDQpO1xuICAgIGNvbnN0IHJlYWNoYWJsZVNjcmVlbnMgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgcmVhY2hhYmxlLmtleXMoKSkge1xuICAgICAgcmVhY2hhYmxlU2NyZWVucy5hZGQodGlsZSA+Pj4gOCk7XG4gICAgICAvL3JlYWNoYWJsZVNjcmVlbnMuYWRkKCh0aWxlICYgMHhmMDAwKSA+Pj4gOCB8ICh0aWxlICYgMHhmMCkgPj4+IDQpO1xuICAgIH1cbiAgICAvLyBOT1RFOiBzb21lIGVudHJhbmNlcyBhcmUgb24gaW1wYXNzYWJsZSB0aWxlcyBidXQgd2Ugc3RpbGwgY2FyZSBhYm91dFxuICAgIC8vIHRoZSBzY3JlZW5zIHVuZGVyIHRoZW0gKGUuZy4gYm9hdCBhbmQgc2hvcCBlbnRyYW5jZXMpLiAgQWxzbyBtYWtlIHN1cmVcbiAgICAvLyB0byBoYW5kbGUgdGhlIHNlYW1sZXNzIHRvd2VyIGV4aXRzLlxuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgbG9jYXRpb24uZW50cmFuY2VzKSB7XG4gICAgICBpZiAoZW50cmFuY2UudXNlZCkgcmVhY2hhYmxlU2NyZWVucy5hZGQoZW50cmFuY2Uuc2NyZWVuKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICByZWFjaGFibGVTY3JlZW5zLmFkZChleGl0LnNjcmVlbik7XG4gICAgICBpZiAoZXhpdC5pc1NlYW1sZXNzKCkpIHtcbiAgICAgICAgLy8gSGFuZGxlIHNlYW1sZXNzIGV4aXRzIG9uIHNjcmVlbiBlZGdlczogbWFyayBfanVzdF8gdGhlIG5laWdoYm9yXG4gICAgICAgIC8vIHNjcmVlbiBhcyByZWFjaGFibGUgKGluY2x1ZGluZyBkZWFkIGNlbnRlciB0aWxlIGZvciBtYXRjaCkuXG4gICAgICAgIGNvbnN0IHkgPSBleGl0LnRpbGUgPj4+IDQ7XG4gICAgICAgIGlmICh5ID09PSAwKSB7XG4gICAgICAgICAgcmVhY2hhYmxlLnNldCgoZXhpdC5zY3JlZW4gLSAxNikgPDwgOCB8IDB4ODgsIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKHkgPT09IDB4ZSkge1xuICAgICAgICAgIC8vIFRPRE8gLSB3aHkgZG9lcyArMTYgbm90IHdvcmsgaGVyZT9cbiAgICAgICAgICByZWFjaGFibGUuc2V0KChleGl0LnNjcmVlbiAvKisgMTYqLykgPDwgOCB8IDB4ODgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vY29uc3QgZXhpdCA9IHRpbGVzZXQuZXhpdDtcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IEFycmF5PE1ldGFzY3JlZW4+KGhlaWdodCA8PCA0KS5maWxsKHRpbGVzZXQuZW1wdHkpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCB0MCA9IHkgPDwgNCB8IHg7XG4gICAgICAgIGNvbnN0IG1ldGFzY3JlZW5zID0gdGlsZXNldC5nZXRNZXRhc2NyZWVucyhsb2NhdGlvbi5zY3JlZW5zW3ldW3hdKTtcbiAgICAgICAgbGV0IG1ldGFzY3JlZW46IE1ldGFzY3JlZW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAobWV0YXNjcmVlbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgbWV0YXNjcmVlbiA9IG1ldGFzY3JlZW5zWzBdO1xuICAgICAgICB9IGVsc2UgaWYgKCFtZXRhc2NyZWVucy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUT09EIC0gZmlsdGVyIGJhc2VkIG9uIHdobyBoYXMgYSBtYXRjaCBmdW5jdGlvbiwgb3IgbWF0Y2hpbmcgZmxhZ3NcbiAgICAgICAgICBjb25zdCBmbGFnID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSAoKHkgPDwgNCkgfCB4KSk7XG4gICAgICAgICAgY29uc3QgbWF0Y2hlcnM6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgICAgICAgIGNvbnN0IGJlc3Q6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtZXRhc2NyZWVucykge1xuICAgICAgICAgICAgaWYgKHMuZGF0YS5tYXRjaCkge1xuICAgICAgICAgICAgICBtYXRjaGVycy5wdXNoKHMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzLmZsYWcgPT09ICdhbHdheXMnICYmIGZsYWc/LmZsYWcgPT09IDB4MmZlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICFzLmZsYWcgJiYgIXMuZGF0YS53YWxsICYmICFmbGFnKSB7XG4gICAgICAgICAgICAgIGJlc3QudW5zaGlmdChzKTsgLy8gZnJvbnQtbG9hZCBtYXRjaGluZyBmbGFnc1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYmVzdC5wdXNoKHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobWF0Y2hlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiByZWFjaChkeTogbnVtYmVyLCBkeDogbnVtYmVyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHgwID0gKHggPDwgOCkgKyBkeDtcbiAgICAgICAgICAgICAgY29uc3QgeTAgPSAoeSA8PCA4KSArIGR5O1xuICAgICAgICAgICAgICBjb25zdCB0ID1cbiAgICAgICAgICAgICAgICAgICh5MCA8PCA0KSAmIDB4ZjAwMCB8IHgwICYgMHhmMDAgfCB5MCAmIDB4ZjAgfCAoeDAgPj4gNCkgJiAweGY7XG4gICAgICAgICAgICAgIHJldHVybiByZWFjaGFibGUuaGFzKHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBtYXRjaGVyIG9mIG1hdGNoZXJzKSB7XG4gICAgICAgICAgICAgIGlmICghbWF0Y2hlci5kYXRhLm1hdGNoIShyZWFjaCwgZmxhZyAhPSBudWxsKSkgY29udGludWU7XG4gICAgICAgICAgICAgIG1ldGFzY3JlZW4gPSBtYXRjaGVyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFtZXRhc2NyZWVuKSBtZXRhc2NyZWVuID0gYmVzdFswXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1ldGFzY3JlZW4pIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZScpO1xuICAgICAgICAvLyBpZiAoKG1ldGFzY3JlZW4uZGF0YS5leGl0cyB8fCBtZXRhc2NyZWVuLmRhdGEud2FsbCkgJiZcbiAgICAgICAgLy8gICAgICFyZWFjaGFibGVTY3JlZW5zLmhhcyh0MCkgJiZcbiAgICAgICAgLy8gICAgIHRpbGVzZXQgIT09IHJvbS5tZXRhdGlsZXNldHMudG93ZXIpIHtcbiAgICAgICAgLy8gICAvLyBNYWtlIHN1cmUgd2UgZG9uJ3Qgc3VydmV5IHVucmVhY2hhYmxlIHNjcmVlbnMgKGFuZCBpdCdzIGhhcmQgdG9cbiAgICAgICAgLy8gICAvLyB0byBmaWd1cmUgb3V0IHdoaWNoIGlzIHdoaWNoIGxhdGVyKS4gIE1ha2Ugc3VyZSBub3QgdG8gZG8gdGhpcyBmb3JcbiAgICAgICAgLy8gICAvLyB0b3dlciBiZWNhdXNlIG90aGVyd2lzZSBpdCdsbCBjbG9iYmVyIGltcG9ydGFudCBwYXJ0cyBvZiB0aGUgbWFwLlxuICAgICAgICAvLyAgIG1ldGFzY3JlZW4gPSB0aWxlc2V0LmVtcHR5O1xuICAgICAgICAvLyB9XG4gICAgICAgIHNjcmVlbnNbdDBdID0gbWV0YXNjcmVlbjtcbiAgICAgICAgLy8gLy8gSWYgd2UncmUgb24gdGhlIGJvcmRlciBhbmQgaXQncyBhbiBlZGdlIGV4aXQgdGhlbiBjaGFuZ2UgdGhlIGJvcmRlclxuICAgICAgICAvLyAvLyBzY3JlZW4gdG8gcmVmbGVjdCBhbiBleGl0LlxuICAgICAgICAvLyBjb25zdCBlZGdlcyA9IG1ldGFzY3JlZW4uZWRnZUV4aXRzKCk7XG4gICAgICAgIC8vIGlmICh5ID09PSAwICYmIChlZGdlcyAmIDEpKSBzY3JlZW5zW3QwIC0gMTZdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHggPT09IDAgJiYgKGVkZ2VzICYgMikpIHNjcmVlbnNbdDAgLSAxXSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh5ID09PSBoZWlnaHQgJiYgKGVkZ2VzICYgNCkpIHNjcmVlbnNbdDAgKyAxNl0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeCA9PT0gd2lkdGggJiYgKGVkZ2VzICYgOCkpIHNjcmVlbnNbdDAgKyAxXSA9IGV4aXQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmlndXJlIG91dCBleGl0c1xuICAgIGNvbnN0IGV4aXRzID0gbmV3IFRhYmxlPFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjPigpO1xuICAgIGxldCBlbnRyYW5jZTA6IENvbm5lY3Rpb25UeXBlfHVuZGVmaW5lZDtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0LmRlc3QgPT09IDB4ZmYpIGNvbnRpbnVlO1xuICAgICAgbGV0IHNyY1BvcyA9IGV4aXQuc2NyZWVuO1xuICAgICAgbGV0IHRpbGUgPSBleGl0LnRpbGU7XG4gICAgICAvLyBLZW5zdSBhcmVuYSBleGl0IGlzIGRlY2xhcmVkIGF0IHk9ZiwgYnV0IHRoZSBleGl0J3MgYWN0dWFsIHNjcmVlblxuICAgICAgLy8gaW4gdGhlIHJvbSB3aWxsIGJlIHN0b3JlZCBhcyB0aGUgc2NyZWVuIGJlbmVhdGguICBTYW1lIHRoaW5nIGdvZXNcbiAgICAgIC8vIGZvciB0aGUgdG93ZXIgZXNjYWxhdG9ycywgYnV0IGluIHRob3NlIGNhc2VzLCB3ZSBhbHJlYWR5IGFkZGVkXG4gICAgICAvLyB0aGUgY29ycmVzcG9uZGluZyBleGl0IG9uIHRoZSBwYWlyZWQgc2NyZWVuLCBzbyB3ZSBkb24ndCBuZWVkIHRvIGZpeC5cbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSAmJiAhKGV4aXQueXQgJiAweGYpICYmXG4gICAgICAgICAgKGxvY2F0aW9uLmlkICYgMHg1OCkgIT09IDB4NTgpIHtcbiAgICAgICAgc3JjUG9zIC09IDE2O1xuICAgICAgICB0aWxlIHw9IDB4ZjA7XG4gICAgICB9XG4gICAgICBpZiAoIXJlYWNoYWJsZVNjcmVlbnMuaGFzKHNyY1BvcykpIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZT8nKTtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHNjcmVlbnNbc3JjUG9zXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZmluZEV4aXRUeXBlKHRpbGUsIGhlaWdodCA9PT0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICEhKGV4aXQuZW50cmFuY2UgJiAweDIwKSk7XG4gICAgICBjb25zdCBzcmNUeXBlID0gc3JjRXhpdD8udHlwZTtcbiAgICAgIGlmICghc3JjVHlwZSkge1xuICAgICAgICBjb25zdCBpZCA9IGxvY2F0aW9uLmlkIDw8IDE2IHwgc3JjUG9zIDw8IDggfCBleGl0LnRpbGU7XG4gICAgICAgIGlmICh1bmtub3duRXhpdFdoaXRlbGlzdC5oYXMoaWQpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgYWxsID0gc3JjU2NyZWVuLmRhdGEuZXhpdHM/Lm1hcChcbiAgICAgICAgICAgIGUgPT4gZS50eXBlICsgJzogJyArIGUuZXhpdHMubWFwKGhleCkuam9pbignLCAnKSkuam9pbignXFxuICAnKTtcbiAgICAgICAgY29uc29sZS53YXJuKGBVbmtub3duIGV4aXQgJHtoZXgoZXhpdC50aWxlKX06ICR7c3JjU2NyZWVuLm5hbWV9IGluICR7XG4gICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb259IEAgJHtoZXgoc3JjUG9zKX06XFxuICAke2FsbH1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoZXhpdHMuaGFzKHNyY1Bvcywgc3JjVHlwZSkpIGNvbnRpbnVlOyAvLyBhbHJlYWR5IGhhbmRsZWRcbiAgICAgIGNvbnN0IGRlc3QgPSByb20ubG9jYXRpb25zW2V4aXQuZGVzdF07XG4gICAgICBpZiAoc3JjVHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgIGNvbnN0IGRvd24gPSBzcmNUeXBlID09PSAnc2VhbWxlc3M6ZG93bic7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgc2VlbXMgd3JvbmcgLSB0aGUgZG93biBleGl0IGlzIEJFTE9XIHRoZSB1cCBleGl0Li4uP1xuICAgICAgICBjb25zdCB0aWxlID0gc3JjRXhpdCEuZXhpdHNbMF0gKyAoZG93biA/IC0xNiA6IDE2KTtcbiAgICAgICAgLy9jb25zdCBkZXN0UG9zID0gc3JjUG9zICsgKHRpbGUgPCAwID8gLTE2IDogdGlsZSA+PSAweGYwID8gMTYgOiAtMCk7XG4gICAgICAgIC8vIE5PVEU6IGJvdHRvbS1lZGdlIHNlYW1sZXNzIGlzIHRyZWF0ZWQgYXMgZGVzdGluYXRpb24gZjBcbiAgICAgICAgY29uc3QgZGVzdFBvcyA9IHNyY1BvcyArICh0aWxlIDwgMCA/IC0xNiA6IDApO1xuICAgICAgICBjb25zdCBkZXN0VHlwZSA9IGRvd24gPyAnc2VhbWxlc3M6dXAnIDogJ3NlYW1sZXNzOmRvd24nO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGAke3NyY1R5cGV9ICR7aGV4KGxvY2F0aW9uLmlkKX0gJHtkb3dufSAke2hleCh0aWxlKX0gJHtoZXgoZGVzdFBvcyl9ICR7ZGVzdFR5cGV9ICR7aGV4KGRlc3QuaWQpfWApO1xuICAgICAgICBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBlbnRyYW5jZSA9IGRlc3QuZW50cmFuY2VzW2V4aXQuZW50cmFuY2UgJiAweDFmXTtcbiAgICAgIGxldCBkZXN0UG9zID0gZW50cmFuY2Uuc2NyZWVuO1xuICAgICAgbGV0IGRlc3RDb29yZCA9IGVudHJhbmNlLmNvb3JkO1xuICAgICAgaWYgKHNyY1R5cGUgPT09ICdkb29yJyAmJiAoZW50cmFuY2UueSAmIDB4ZjApID09PSAwKSB7XG4gICAgICAgIC8vIE5PVEU6IFRoZSBpdGVtIHNob3AgZG9vciBpbiBPYWsgc3RyYWRkbGVzIHR3byBzY3JlZW5zIChleGl0IGlzIG9uXG4gICAgICAgIC8vIHRoZSBOVyBzY3JlZW4gd2hpbGUgZW50cmFuY2UgaXMgb24gU1cgc2NyZWVuKS4gIERvIGEgcXVpY2sgaGFjayB0b1xuICAgICAgICAvLyBkZXRlY3QgdGhpcyAocHJveHlpbmcgXCJkb29yXCIgZm9yIFwidXB3YXJkIGV4aXRcIikgYW5kIGFkanVzdCBzZWFyY2hcbiAgICAgICAgLy8gdGFyZ2V0IGFjY29yZGluZ2x5LlxuICAgICAgICBkZXN0UG9zIC09IDB4MTA7XG4gICAgICAgIGRlc3RDb29yZCArPSAweDEwMDAwO1xuICAgICAgfVxuICAgICAgLy8gRmlndXJlIG91dCB0aGUgY29ubmVjdGlvbiB0eXBlIGZvciB0aGUgZGVzdFRpbGUuXG4gICAgICBjb25zdCBkZXN0U2NySWQgPSBkZXN0LnNjcmVlbnNbZGVzdFBvcyA+PiA0XVtkZXN0UG9zICYgMHhmXTtcbiAgICAgIGNvbnN0IGRlc3RUeXBlID0gZmluZEVudHJhbmNlVHlwZShkZXN0LCBkZXN0U2NySWQsIGRlc3RDb29yZCk7XG4gICAgICAvLyBOT1RFOiBpbml0aWFsIHNwYXduIGhhcyBubyB0eXBlLi4uP1xuICAgICAgaWYgKCFkZXN0VHlwZSkge1xuICAgICAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRlc3RTY3Igb2Ygcm9tLm1ldGFzY3JlZW5zLmdldEJ5SWQoZGVzdFNjcklkLCBkZXN0LnRpbGVzZXQpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBleGl0IG9mIGRlc3RTY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICAgICAgaWYgKGV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgICAgIGxpbmVzLnB1c2goYCAgJHtkZXN0U2NyLm5hbWV9ICR7ZXhpdC50eXBlfTogJHtoZXgoZXhpdC5lbnRyYW5jZSl9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUud2FybihgQmFkIGVudHJhbmNlICR7aGV4KGRlc3RDb29yZCl9OiByYXcgJHtoZXgoZGVzdFNjcklkKVxuICAgICAgICAgICAgICAgICAgICAgIH0gaW4gJHtkZXN0fSBAICR7aGV4KGRlc3RQb3MpfVxcbiR7bGluZXMuam9pbignXFxuJyl9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG5cbiAgICAgIGlmIChsb2NhdGlvbi5lbnRyYW5jZXNbMF0uc2NyZWVuID09PSBzcmNQb3MpIHtcbiAgICAgICAgY29uc3QgY29vcmQgPSBsb2NhdGlvbi5lbnRyYW5jZXNbMF0uY29vcmQ7XG4gICAgICAgIGNvbnN0IGV4aXQgPSBzcmNTY3JlZW4uZmluZEV4aXRCeVR5cGUoc3JjVHlwZSk7XG4gICAgICAgIGlmICgoKGV4aXQuZW50cmFuY2UgJiAweGZmKSAtIChjb29yZCAmIDB4ZmYpKSAqKiAyICtcbiAgICAgICAgICAgICgoZXhpdC5lbnRyYW5jZSA+Pj4gOCkgLSAoY29vcmQgPj4+IDgpKSAqKiAyIDw9IDB4NDAwKSB7XG4gICAgICAgICAgLy8gTk9URTogZm9yIHNpbmdsZS1oZWlnaHQgbWFwcywgdGhlcmUgbWF5IGJlIGEgMi10aWxlIG9mZnNldCBiZXR3ZWVuXG4gICAgICAgICAgLy8gdGhlIGV4cGVjdGVkIGFuZCBhY3R1YWwgbG9jYXRpb24gb2YgYSBib3R0b20gZW50cmFuY2UuXG4gICAgICAgICAgZW50cmFuY2UwID0gc3JjVHlwZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyAvLyBGaW5kIHRoZSBlbnRyYW5jZSBpbmRleCBmb3IgZWFjaCBleGl0IGFuZCBzdG9yZSBpdCBzZXBhcmF0ZWx5LlxuICAgICAgLy8gLy8gTk9URTogd2UgY291bGQgcHJvYmFibHkgZG8gdGhpcyBPKG4pIHdpdGggYSBzaW5nbGUgZm9yIGxvb3A/XG4gICAgICAvLyBsZXQgY2xvc2VzdEVudHJhbmNlID0gLTE7XG4gICAgICAvLyBsZXQgY2xvc2VzdERpc3QgPSBJbmZpbml0eTtcbiAgICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgbG9jYXRpb24uZW50cmFuY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyAgIGlmIChsb2NhdGlvbi5lbnRyYW5jZXNbaV0uc2NyZWVuICE9PSBzcmNQb3MpIGNvbnRpbnVlO1xuICAgICAgLy8gICBjb25zdCB0aWxlID0gbG9jYXRpb24uZW50cmFuY2VzW2ldLnRpbGU7XG4gICAgICAvLyAgIGZvciAoY29uc3QgZXhpdCBvZiBzcmNTY3JlZW4uZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgLy8gICAgIGlmIChleGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkgY29udGludWU7XG4gICAgICAvLyAgICAgY29uc3QgZGlzdCA9ICgoZXhpdC5lbnRyYW5jZSA+Pj4gNCAmIDB4ZikgLSAodGlsZSAmIDB4ZikpICoqIDIgK1xuICAgICAgLy8gICAgICAgKChleGl0LmVudHJhbmNlID4+PiAxMiAmIDB4ZikgLSAodGlsZSA+Pj4gNCkpICoqIDI7XG4gICAgICAvLyAgICAgaWYgKGRpc3QgPCA0ICYmIGRpc3QgPCBjbG9zZXN0RGlzdCkge1xuICAgICAgLy8gICAgICAgY2xvc2VzdERpc3QgPSBkaXN0O1xuICAgICAgLy8gICAgICAgY2xvc2VzdEVudHJhbmNlID0gaTtcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH1cbiAgICAgIC8vIH1cbiAgICAgIC8vIGlmIChjbG9zZXN0RW50cmFuY2UgPj0gMCkgZW50cmFuY2VzLmdldChzcmNUeXBlKS5hZGQoY2xvc2VzdEVudHJhbmNlKTtcbiAgICAgIC8vIGlmIChjbG9zZXN0RW50cmFuY2UgPT09IDApXG4gICAgICAvLyBpZiAoZGVzdFR5cGUpIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIHRoZSBwaXRzIG1hcC5cbiAgICBjb25zdCBwaXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHBpdCBvZiBsb2NhdGlvbi5waXRzKSB7XG4gICAgICBwaXRzLnNldChwaXQuZnJvbVNjcmVlbiwgcGl0LmRlc3QgPDwgOCB8IHBpdC50b1NjcmVlbik7XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YWxvYyA9IG5ldyBNZXRhbG9jYXRpb24obG9jYXRpb24uaWQsIHRpbGVzZXQsIGhlaWdodCwgd2lkdGgpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgc2NyZWVucy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgbWV0YWxvYy5zZXRJbnRlcm5hbChpLCBzY3JlZW5zW2ldKTtcbiAgICAvLyB9XG4gICAgbWV0YWxvYy5fc2NyZWVucyA9IHNjcmVlbnM7XG4gICAgbWV0YWxvYy5fZXhpdHMgPSBleGl0cztcbiAgICBtZXRhbG9jLl9lbnRyYW5jZTAgPSBlbnRyYW5jZTA7XG4gICAgbWV0YWxvYy5fcGl0cyA9IHBpdHM7XG5cbiAgICAvLyBGaWxsIGluIGN1c3RvbSBmbGFnc1xuICAgIGZvciAoY29uc3QgZiBvZiBsb2NhdGlvbi5mbGFncykge1xuICAgICAgY29uc3Qgc2NyID0gbWV0YWxvYy5fc2NyZWVuc1tmLnNjcmVlbl07XG4gICAgICBpZiAoc2NyLmZsYWc/LnN0YXJ0c1dpdGgoJ2N1c3RvbScpKSB7XG4gICAgICAgIG1ldGFsb2MuY3VzdG9tRmxhZ3Muc2V0KGYuc2NyZWVuLCByb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgICB9IGVsc2UgaWYgKCFzY3IuZmxhZykge1xuICAgICAgICBtZXRhbG9jLmZyZWVGbGFncy5hZGQocm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhbG9jLmFsbFBvcygpKSB7XG4gICAgLy8gICBjb25zdCBzY3IgPSByb20ubWV0YXNjcmVlbnNbbWV0YWxvYy5fc2NyZWVuc1twb3MgKyAxNl1dO1xuICAgIC8vICAgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tJykge1xuICAgIC8vICAgICBjb25zdCBmID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBwb3MpO1xuICAgIC8vICAgICBpZiAoZikgbWV0YWxvYy5jdXN0b21GbGFncy5zZXQocG9zLCByb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuXG4gICAgLy8gVE9ETyAtIHN0b3JlIHJlYWNoYWJpbGl0eSBtYXA/XG4gICAgcmV0dXJuIG1ldGFsb2M7XG5cbiAgICBmdW5jdGlvbiBmaW5kRW50cmFuY2VUeXBlKGRlc3Q6IExvY2F0aW9uLCBzY3JJZDogbnVtYmVyLCBjb29yZDogbnVtYmVyKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlc3RTY3Igb2Ygcm9tLm1ldGFzY3JlZW5zLmdldEJ5SWQoc2NySWQsIGRlc3QudGlsZXNldCkpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGRlc3RTY3IuZmluZEVudHJhbmNlVHlwZShjb29yZCwgZGVzdC5oZWlnaHQgPT09IDEpO1xuICAgICAgICBpZiAodHlwZSAhPSBudWxsKSByZXR1cm4gdHlwZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLy8gaXNSZWFjaGFibGUocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgLy8gICB0aGlzLmNvbXB1dGVSZWFjaGFibGUoKTtcbiAgLy8gICByZXR1cm4gISEodGhpcy5fcmVhY2hhYmxlIVtwb3MgPj4+IDRdICYgKDEgPDwgKHBvcyAmIDcpKSk7XG4gIC8vIH1cblxuICAvLyBjb21wdXRlUmVhY2hhYmxlKCkge1xuICAvLyAgIGlmICh0aGlzLl9yZWFjaGFibGUpIHJldHVybjtcbiAgLy8gICB0aGlzLl9yZWFjaGFibGUgPSBuZXcgVWludDhBcnJheSh0aGlzLmhlaWdodCk7XG4gIC8vICAgY29uc3QgbWFwID0gdGhpcy50cmF2ZXJzZSh7ZmxpZ2h0OiB0cnVlfSk7XG4gIC8vICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvLyAgIGNvbnN0IHJlYWNoYWJsZSA9IG5ldyBTZXQ8UG9zPigpO1xuICAvLyAgIGZvciAoY29uc3QgW3Bvc10gb2YgdGhpcy5fZXhpdHMpIHtcbiAgLy8gICAgIGNvbnN0IHNldCA9IG1hcC5nZXQocG9zKVxuICAvLyAgIH1cbiAgLy8gfVxuXG4gIGdldFVpZChwb3M6IFBvcyk6IFVpZCB7XG4gICAgcmV0dXJuIHRoaXMuX3NjcmVlbnNbcG9zXS51aWQ7XG4gIH1cblxuICBnZXQocG9zOiBQb3MpOiBNZXRhc2NyZWVuIHtcbiAgICByZXR1cm4gdGhpcy5fc2NyZWVuc1twb3NdO1xuICB9XG5cbiAgLy8gUmVhZG9ubHkgYWNjZXNzb3IuXG4gIC8vIGdldCBzY3JlZW5zKCk6IHJlYWRvbmx5IFVpZFtdIHtcbiAgLy8gICByZXR1cm4gdGhpcy5fc2NyZWVucztcbiAgLy8gfVxuXG4gIGdldCB3aWR0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl93aWR0aDtcbiAgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlcikge1xuICAgIHRoaXMuX3dpZHRoID0gd2lkdGg7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gIH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9oZWlnaHQgPiBoZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NjcmVlbnMuc3BsaWNlKChoZWlnaHQgKyAyKSA8PCA0LCAodGhpcy5faGVpZ2h0IC0gaGVpZ2h0KSA8PCA0KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2hlaWdodCA8IGhlaWdodCkge1xuICAgICAgdGhpcy5fc2NyZWVucy5sZW5ndGggPSAoaGVpZ2h0ICsgMikgPDwgNDtcbiAgICAgIHRoaXMuX3NjcmVlbnMuZmlsbCh0aGlzLnRpbGVzZXQuZW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuaGVpZ2h0ICsgMikgPDwgNCwgdGhpcy5fc2NyZWVucy5sZW5ndGgpO1xuICAgIH1cbiAgICB0aGlzLl9oZWlnaHQgPSBoZWlnaHQ7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gVE9ETyAtIHJlc2l6ZSBmdW5jdGlvbj9cblxuICBhbGxQb3MoKTogcmVhZG9ubHkgUG9zW10ge1xuICAgIGlmICh0aGlzLl9wb3MpIHJldHVybiB0aGlzLl9wb3M7XG4gICAgY29uc3QgcDogbnVtYmVyW10gPSB0aGlzLl9wb3MgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX2hlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX3dpZHRoOyB4KyspIHtcbiAgICAgICAgcC5wdXNoKHkgPDwgNCB8IHgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIHNldChwb3M6IFBvcywgc2NyOiBNZXRhc2NyZWVuIHwgbnVsbCkge1xuICAgIHRoaXMuX3NjcmVlbnNbcG9zXSA9IHNjciA/PyB0aGlzLnRpbGVzZXQuZW1wdHk7XG4gIH1cblxuICAvL2ludmFsaWRhdGVNb25zdGVycygpIHsgdGhpcy5fbW9uc3RlcnNJbnZhbGlkYXRlZCA9IHRydWU7IH1cblxuICBpbkJvdW5kcyhwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAgIC8vIHJldHVybiBpbkJvdW5kcyhwb3MsIHRoaXMuaGVpZ2h0LCB0aGlzLndpZHRoKTtcbiAgICByZXR1cm4gKHBvcyAmIDE1KSA8IHRoaXMud2lkdGggJiYgcG9zID49IDAgJiYgcG9zID4+PiA0IDwgdGhpcy5oZWlnaHQ7XG4gIH1cblxuICAvLyBpc0ZpeGVkKHBvczogUG9zKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRoaXMuX2ZpeGVkLmhhcyhwb3MpO1xuICAvLyB9XG5cbiAgLyoqXG4gICAqIEZvcmNlLW92ZXJ3cml0ZXMgdGhlIGdpdmVuIHJhbmdlIG9mIHNjcmVlbnMuICBEb2VzIHZhbGlkaXR5IGNoZWNraW5nXG4gICAqIG9ubHkgYXQgdGhlIGVuZC4gIERvZXMgbm90IGRvIGFueXRoaW5nIHdpdGggZmVhdHVyZXMsIHNpbmNlIHRoZXkncmVcbiAgICogb25seSBzZXQgaW4gbGF0ZXIgcGFzc2VzIChpLmUuIHNodWZmbGUsIHdoaWNoIGlzIGxhc3QpLlxuICAgKi9cbiAgc2V0MmQocG9zOiBQb3MsXG4gICAgICAgIHNjcmVlbnM6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxPcHRpb25hbDxNZXRhc2NyZWVuPj4+KTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByb3cgb2Ygc2NyZWVucykge1xuICAgICAgbGV0IGR4ID0gMDtcbiAgICAgIGZvciAoY29uc3Qgc2NyIG9mIHJvdykge1xuICAgICAgICBpZiAoc2NyKSB0aGlzLnNldChwb3MgKyBkeCwgc2NyKTtcbiAgICAgICAgZHgrKztcbiAgICAgIH1cbiAgICAgIHBvcyArPSAxNjtcbiAgICB9XG4gICAgLy8gcmV0dXJuIHRoaXMudmVyaWZ5KHBvczAsIHNjcmVlbnMubGVuZ3RoLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICBNYXRoLm1heCguLi5zY3JlZW5zLm1hcChyID0+IHIubGVuZ3RoKSkpO1xuICAgIC8vIFRPRE8gLSB0aGlzIGlzIGtpbmQgb2YgYnJva2VuLi4uIDotKFxuICAgIC8vIHJldHVybiB0aGlzLnZhbGlkYXRlKCk7XG4gICAgLy9yZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKiBDaGVjayBhbGwgdGhlIGN1cnJlbnRseSBpbnZhbGlkYXRlZCBlZGdlcywgdGhlbiBjbGVhcnMgaXQuICovXG4gIHZhbGlkYXRlKCk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgZGlyIG9mIFswLCAxXSkge1xuICAgICAgZm9yIChsZXQgeSA9IGRpciA/IDAgOiAxOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgICBmb3IgKGxldCB4ID0gZGlyOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgY29uc3QgcG9zMDogUG9zID0geSA8PCA0IHwgeDtcbiAgICAgICAgICBjb25zdCBzY3IwID0gdGhpcy5fc2NyZWVuc1twb3MwXTtcbiAgICAgICAgICBjb25zdCBwb3MxOiBQb3MgPSBwb3MwIC0gKGRpciA/IDEgOiAxNik7XG4gICAgICAgICAgY29uc3Qgc2NyMSA9IHRoaXMuX3NjcmVlbnNbcG9zMV07XG4gICAgICAgICAgaWYgKHNjcjAuaXNFbXB0eSgpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoc2NyMS5pc0VtcHR5KCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICghc2NyMC5jaGVja05laWdoYm9yKHNjcjEsIGRpcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihmb3JtYXQoJ2JhZCBuZWlnaGJvciAlcyAoJTAyeCkgJXMgJXMgKCUwMngpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyMS5uYW1lLCBwb3MxLCBESVJfTkFNRVtkaXJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3IwLm5hbWUsIHBvczApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzcGxpY2VDb2x1bW5zKGxlZnQ6IG51bWJlciwgZGVsZXRlZDogbnVtYmVyLCBpbnNlcnRlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgIHNjcmVlbnM6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxNZXRhc2NyZWVuPj4pIHtcbiAgICAvLyBGaXJzdCBhZGp1c3QgdGhlIHNjcmVlbnMuXG4gICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLl9zY3JlZW5zLmxlbmd0aDsgcCArPSAxNikge1xuICAgICAgdGhpcy5fc2NyZWVucy5jb3B5V2l0aGluKHAgKyBsZWZ0ICsgaW5zZXJ0ZWQsIHAgKyBsZWZ0ICsgZGVsZXRlZCwgcCArIDEwKTtcbiAgICAgIHRoaXMuX3NjcmVlbnMuc3BsaWNlKHAgKyBsZWZ0LCBpbnNlcnRlZCwgLi4uc2NyZWVuc1twID4+IDRdKTtcbiAgICB9XG4gICAgLy8gVXBkYXRlIGRpbWVuc2lvbnMgYW5kIGFjY291bnRpbmdcbiAgICBjb25zdCBkZWx0YSA9IGluc2VydGVkIC0gZGVsZXRlZDtcbiAgICB0aGlzLndpZHRoICs9IGRlbHRhO1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgICAvLyBNb3ZlIHJlbGV2YW50IGV4aXRzXG4gICAgY29uc3QgbW92ZTogW1BvcywgQ29ubmVjdGlvblR5cGUsIFBvcywgQ29ubmVjdGlvblR5cGVdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGVdIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBjb25zdCB4ID0gcG9zICYgMHhmO1xuICAgICAgaWYgKHggPCBsZWZ0ICsgZGVsZXRlZCkge1xuICAgICAgICBpZiAoeCA+PSBsZWZ0KSB0aGlzLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBtb3ZlLnB1c2goW3BvcywgdHlwZSwgcG9zICsgZGVsdGEsIHR5cGVdKTtcbiAgICB9XG4gICAgdGhpcy5tb3ZlRXhpdHMoLi4ubW92ZSk7XG4gICAgLy8gTW92ZSBmbGFncyBhbmQgc3Bhd25zIGluIHBhcmVudCBsb2NhdGlvblxuICAgIGNvbnN0IHBhcmVudCA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBjb25zdCB4dDAgPSAobGVmdCArIGRlbGV0ZWQpIDw8IDQ7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBwYXJlbnQuc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24ueHQgPCB4dDApIGNvbnRpbnVlO1xuICAgICAgc3Bhd24ueHQgLT0gKGRlbHRhIDw8IDQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgcGFyZW50LmZsYWdzKSB7XG4gICAgICBpZiAoZmxhZy54cyA8IGxlZnQgKyBkZWxldGVkKSB7XG4gICAgICAgIGlmIChmbGFnLnhzID49IGxlZnQpIGZsYWcuc2NyZWVuID0gMHhmZjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmbGFnLnhzIC09IGRlbHRhO1xuICAgIH1cbiAgICBwYXJlbnQuZmxhZ3MgPSBwYXJlbnQuZmxhZ3MuZmlsdGVyKGYgPT4gZi5zY3JlZW4gIT09IDB4ZmYpO1xuXG4gICAgLy8gVE9ETyAtIG1vdmUgcGl0cz8/XG5cbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gRXhpdCBoYW5kbGluZ1xuXG4gIHNldEV4aXQocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlLCBzcGVjOiBFeGl0U3BlYykge1xuICAgIGNvbnN0IG90aGVyID0gdGhpcy5yb20ubG9jYXRpb25zW3NwZWNbMF0gPj4+IDhdLm1ldGE7XG4gICAgaWYgKCFvdGhlcikgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3Qgc2V0IHR3by13YXkgZXhpdCB3aXRob3V0IG1ldGFgKTtcbiAgICB0aGlzLnNldEV4aXRPbmVXYXkocG9zLCB0eXBlLCBzcGVjKTtcbiAgICBvdGhlci5zZXRFeGl0T25lV2F5KHNwZWNbMF0gJiAweGZmLCBzcGVjWzFdLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gIH1cbiAgc2V0RXhpdE9uZVdheShwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUsIHNwZWM6IEV4aXRTcGVjKSB7XG4gICAgLy8gY29uc3QgcHJldiA9IHRoaXMuX2V4aXRzLmdldChwb3MsIHR5cGUpO1xuICAgIC8vIGlmIChwcmV2KSB7XG4gICAgLy8gICBjb25zdCBvdGhlciA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2WzBdID4+PiA4XS5tZXRhO1xuICAgIC8vICAgaWYgKG90aGVyKSBvdGhlci5fZXhpdHMuZGVsZXRlKHByZXZbMF0gJiAweGZmLCBwcmV2WzFdKTtcbiAgICAvLyB9XG4gICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgc3BlYyk7XG4gIH1cbiAgZGVsZXRlRXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUpIHtcbiAgICB0aGlzLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgfVxuXG4gIGdldEV4aXQocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlKTogRXhpdFNwZWN8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fZXhpdHMuZ2V0KHBvcywgdHlwZSk7XG4gIH1cblxuICBleGl0cygpOiBJdGVyYWJsZTxyZWFkb25seSBbUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdPiB7XG4gICAgcmV0dXJuIHRoaXMuX2V4aXRzO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvdW50ZWQgY2FuZGlkYXRlcz9cbiAgZXhpdENhbmRpZGF0ZXModHlwZTogQ29ubmVjdGlvblR5cGUpOiBNZXRhc2NyZWVuW10ge1xuICAgIC8vIFRPRE8gLSBmaWd1cmUgb3V0IGEgd2F5IHRvIHVzZSB0aGUgZG91YmxlLXN0YWlyY2FzZT8gIGl0IHdvbid0XG4gICAgLy8gaGFwcGVuIGN1cnJlbnRseSBiZWNhdXNlIGl0J3MgZml4ZWQsIHNvIGl0J3MgZXhjbHVkZWQuLi4uP1xuICAgIGNvbnN0IGhhc0V4aXQ6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2NyIG9mIHRoaXMudGlsZXNldCkge1xuICAgICAgaWYgKHNjci5kYXRhLmV4aXRzPy5zb21lKGUgPT4gZS50eXBlID09PSB0eXBlKSkgaGFzRXhpdC5wdXNoKHNjcik7XG4gICAgfVxuICAgIHJldHVybiBoYXNFeGl0O1xuICB9XG5cbiAgLy8gVE9ETyAtIHNob3J0IHZzIGZ1bGw/XG4gIHNob3coKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIGxldCBsaW5lID0gW107XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgIGxpbmUucHVzaCh4LnRvU3RyaW5nKDE2KSk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goJyAgICcgKyBsaW5lLmpvaW4oJyAgJykpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCAzOyByKyspIHtcbiAgICAgICAgbGluZSA9IFtyID09PSAxID8geS50b1N0cmluZygxNikgOiAnICcsICcgJ107XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XTtcbiAgICAgICAgICBsaW5lLnB1c2goc2NyZWVuPy5kYXRhLmljb24/LmZ1bGxbcl0gPz8gKHIgPT09IDEgPyAnID8gJyA6ICcgICAnKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGluZXMucHVzaChsaW5lLmpvaW4oJycpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgc2NyZWVuTmFtZXMoKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgbGV0IGxpbmUgPSBbXTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF07XG4gICAgICAgIGxpbmUucHVzaChzY3JlZW4/Lm5hbWUpO1xuICAgICAgfVxuICAgICAgbGluZXMucHVzaChsaW5lLmpvaW4oJyAnKSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHRyYXZlcnNlKG9wdHM6IFRyYXZlcnNlT3B0cyA9IHt9KTogTWFwPG51bWJlciwgU2V0PG51bWJlcj4+IHtcbiAgICAvLyBSZXR1cm5zIGEgbWFwIGZyb20gdW5pb25maW5kIHJvb3QgdG8gYSBsaXN0IG9mIGFsbCByZWFjaGFibGUgdGlsZXMuXG4gICAgLy8gQWxsIGVsZW1lbnRzIG9mIHNldCBhcmUga2V5cyBwb2ludGluZyB0byB0aGUgc2FtZSB2YWx1ZSByZWYuXG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPG51bWJlcj4oKTtcbiAgICBjb25zdCBjb25uZWN0aW9uVHlwZSA9IChvcHRzLmZsaWdodCA/IDIgOiAwKSB8IChvcHRzLm5vRmxhZ2dlZCA/IDEgOiAwKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBvcHRzLndpdGg/LmdldChwb3MpID8/IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzY3IuY29ubmVjdGlvbnNbY29ubmVjdGlvblR5cGVdKSB7XG4gICAgICAgIGlmICghc2VnbWVudC5sZW5ndGgpIGNvbnRpbnVlOyAvLyBlLmcuIGVtcHR5XG4gICAgICAgIC8vIENvbm5lY3Qgd2l0aGluIGVhY2ggc2VnbWVudFxuICAgICAgICB1Zi51bmlvbihzZWdtZW50Lm1hcChjID0+IChwb3MgPDwgOCkgKyBjKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigpO1xuICAgIGNvbnN0IHNldHMgPSB1Zi5zZXRzKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzZXQgPSBzZXRzW2ldO1xuICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNldCkge1xuICAgICAgICBtYXAuc2V0KGVsZW0sIHNldCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hcDtcbiAgfSAgXG5cbiAgLyoqIEBwYXJhbSBlZGdlIEEgdmFsdWUgZnJvbSBhIHRyYXZlcnNlIHNldC4gKi9cbiAgZXhpdFR5cGUoZWRnZTogbnVtYmVyKTogQ29ubmVjdGlvblR5cGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoKGVkZ2UgJiAweGYwKSAhPT0gMHhlMCkgcmV0dXJuO1xuICAgIGNvbnN0IHBvcyA9IGVkZ2UgPj4+IDg7XG4gICAgY29uc3Qgc2NyID0gdGhpcy5nZXQocG9zKTtcbiAgICBjb25zdCB0eXBlID0gc2NyLmRhdGEuZXhpdHM/LltlZGdlICYgMHhmXS50eXBlO1xuICAgIGlmICghdHlwZT8uc3RhcnRzV2l0aCgnZWRnZTonKSkgcmV0dXJuIHR5cGU7XG4gICAgLy8gbWF5IG5vdCBhY3R1YWxseSBiZSBhbiBleGl0LlxuICAgIGlmICh0eXBlID09PSAnZWRnZTp0b3AnICYmIChwb3MgPj4+IDQpKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgKHBvcyA+Pj4gNCkgPT09IHRoaXMuaGVpZ2h0IC0gMSkgcmV0dXJuO1xuICAgIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0JyAmJiAocG9zICYgMHhmKSkgcmV0dXJuO1xuICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgJiAweGYpID09PSB0aGlzLndpZHRoIC0gMSkgcmV0dXJuO1xuICAgIHJldHVybiB0eXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBlZGdlIEEgdmFsdWUgZnJvbSBhIHRyYXZlcnNlIHNldC5cbiAgICogQHJldHVybiBBbiBZeVh4IHBvc2l0aW9uIGZvciB0aGUgZ2l2ZW4gcG9pLCBpZiBpdCBleGlzdHMuXG4gICAqL1xuICBwb2lUaWxlKGVkZ2U6IG51bWJlcik6IG51bWJlcnx1bmRlZmluZWQge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gIH1cblxuICAvKiogU3RhdGljIGhlbHBlciBtZXRob2QgdG8gY29ubmVjdCB0d28gZXhpdCBzcGVjcy4gKi9cbiAgc3RhdGljIGNvbm5lY3Qocm9tOiBSb20sIGE6IEV4aXRTcGVjLCBiOiBFeGl0U3BlYykge1xuICAgIGNvbnN0IGxvY0EgPSByb20ubG9jYXRpb25zW2FbMF0gPj4+IDhdLm1ldGE7XG4gICAgY29uc3QgbG9jQiA9IHJvbS5sb2NhdGlvbnNbYlswXSA+Pj4gOF0ubWV0YTtcbiAgICBsb2NBLmF0dGFjaChhWzBdICYgMHhmZiwgbG9jQiwgYlswXSAmIDB4ZmYsIGFbMV0sIGJbMV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBhY3R1YWwgZnVsbCB0aWxlIGNvb3JkaW5hdGUgKFlYeXgpIG9mIHRoZVxuICAgKiBnaXZlbiBleGl0LlxuICAgKi9cbiAgc3RhdGljIGZpbmRFeGl0VGlsZXMocm9tOiBSb20sIGV4aXQ6IEV4aXRTcGVjKSB7XG4gICAgY29uc3QgbG9jID0gcm9tLmxvY2F0aW9uc1tleGl0WzBdID4+PiA4XTtcbiAgICBjb25zdCBzY3IgPSBsb2MubWV0YS5fc2NyZWVuc1tleGl0WzBdICYgMHhmZl07XG4gICAgY29uc3QgY29uID0gc2NyLmZpbmRFeGl0QnlUeXBlKGV4aXRbMV0pO1xuICAgIHJldHVybiBjb24uZXhpdHMubWFwKHRpbGUgPT4gdGlsZSB8IChleGl0WzBdICYgMHhmZikgPDwgOCk7XG4gIH1cblxuICAvKipcbiAgICogQXR0YWNoIGFuIGV4aXQvZW50cmFuY2UgcGFpciBpbiB0d28gZGlyZWN0aW9ucy5cbiAgICogQWxzbyByZWF0dGFjaGVzIHRoZSBmb3JtZXIgb3RoZXIgZW5kcyBvZiBlYWNoIHRvIGVhY2ggb3RoZXIuXG4gICAqL1xuICBhdHRhY2goc3JjUG9zOiBQb3MsIGRlc3Q6IE1ldGFsb2NhdGlvbiwgZGVzdFBvczogUG9zLFxuICAgICAgICAgc3JjVHlwZT86IENvbm5lY3Rpb25UeXBlLCBkZXN0VHlwZT86IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgaWYgKCFzcmNUeXBlKSBzcmNUeXBlID0gdGhpcy5waWNrVHlwZUZyb21FeGl0cyhzcmNQb3MpO1xuICAgIGlmICghZGVzdFR5cGUpIGRlc3RUeXBlID0gZGVzdC5waWNrVHlwZUZyb21FeGl0cyhkZXN0UG9zKTtcblxuICAgIC8vIFRPRE8gLSB3aGF0IGlmIG11bHRpcGxlIHJldmVyc2VzPyAgZS5nLiBjb3JkZWwgZWFzdC93ZXN0P1xuICAgIC8vICAgICAgLSBjb3VsZCBkZXRlcm1pbmUgaWYgdGhpcyBhbmQvb3IgZGVzdCBoYXMgYW55IHNlYW1sZXNzLlxuICAgIC8vIE5vOiBpbnN0ZWFkLCBkbyBhIHBvc3QtcHJvY2Vzcy4gIE9ubHkgY29yZGVsIG1hdHRlcnMsIHNvIGdvXG4gICAgLy8gdGhyb3VnaCBhbmQgYXR0YWNoIGFueSByZWR1bmRhbnQgZXhpdHMuXG5cbiAgICBjb25zdCBkZXN0VGlsZSA9IGRlc3QuaWQgPDwgOCB8IGRlc3RQb3M7XG4gICAgY29uc3Qgc3JjVGlsZSA9IHRoaXMuaWQgPDwgOCB8IHNyY1BvcztcbiAgICBjb25zdCBwcmV2RGVzdCA9IHRoaXMuX2V4aXRzLmdldChzcmNQb3MsIHNyY1R5cGUpO1xuICAgIGNvbnN0IHByZXZTcmMgPSBkZXN0Ll9leGl0cy5nZXQoZGVzdFBvcywgZGVzdFR5cGUpO1xuICAgIGlmIChwcmV2RGVzdCAmJiBwcmV2U3JjKSB7XG4gICAgICBjb25zdCBbcHJldkRlc3RUaWxlLCBwcmV2RGVzdFR5cGVdID0gcHJldkRlc3Q7XG4gICAgICBjb25zdCBbcHJldlNyY1RpbGUsIHByZXZTcmNUeXBlXSA9IHByZXZTcmM7XG4gICAgICBpZiAocHJldkRlc3RUaWxlID09PSBkZXN0VGlsZSAmJiBwcmV2RGVzdFR5cGUgPT09IGRlc3RUeXBlICYmXG4gICAgICAgICAgcHJldlNyY1RpbGUgPT09IHNyY1RpbGUgJiYgcHJldlNyY1R5cGUgPT09IHNyY1R5cGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9leGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXSk7XG4gICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RQb3MsIGRlc3RUeXBlLCBbc3JjVGlsZSwgc3JjVHlwZV0pO1xuICAgIC8vIGFsc28gaG9vayB1cCBwcmV2aW91cyBwYWlyXG4gICAgaWYgKHByZXZTcmMgJiYgcHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2RGVzdFRpbGUsIHByZXZEZXN0VHlwZV0gPSBwcmV2RGVzdDtcbiAgICAgIGNvbnN0IFtwcmV2U3JjVGlsZSwgcHJldlNyY1R5cGVdID0gcHJldlNyYztcbiAgICAgIGNvbnN0IHByZXZTcmNNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZTcmNUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgY29uc3QgcHJldkRlc3RNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZEZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIHByZXZTcmNNZXRhLl9leGl0cy5zZXQocHJldlNyY1RpbGUgJiAweGZmLCBwcmV2U3JjVHlwZSwgcHJldkRlc3QpO1xuICAgICAgcHJldkRlc3RNZXRhLl9leGl0cy5zZXQocHJldkRlc3RUaWxlICYgMHhmZiwgcHJldkRlc3RUeXBlLCBwcmV2U3JjKTtcbiAgICB9IGVsc2UgaWYgKHByZXZTcmMgfHwgcHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2VGlsZSwgcHJldlR5cGVdID0gKHByZXZTcmMgfHwgcHJldkRlc3QpITtcbiAgICAgIC8vIE5PVEU6IGlmIHdlIHVzZWQgYXR0YWNoIHRvIGhvb2sgdXAgdGhlIHJldmVyc2Ugb2YgYSBvbmUtd2F5IGV4aXRcbiAgICAgIC8vIChpLmUuIHRvd2VyIGV4aXQgcGF0Y2gpIHRoZW4gd2UgbmVlZCB0byAqbm90KiByZW1vdmUgdGhlIG90aGVyIHNpZGUuXG4gICAgICBpZiAoKHByZXZUaWxlICE9PSBzcmNUaWxlIHx8IHByZXZUeXBlICE9PSBzcmNUeXBlKSAmJlxuICAgICAgICAgIChwcmV2VGlsZSAhPT0gZGVzdFRpbGUgfHwgcHJldlR5cGUgIT09IGRlc3RUeXBlKSkge1xuICAgICAgICBjb25zdCBwcmV2TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgICAgcHJldk1ldGEuX2V4aXRzLmRlbGV0ZShwcmV2VGlsZSAmIDB4ZmYsIHByZXZUeXBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwaWNrVHlwZUZyb21FeGl0cyhwb3M6IFBvcyk6IENvbm5lY3Rpb25UeXBlIHtcbiAgICBjb25zdCB0eXBlcyA9IFsuLi50aGlzLl9leGl0cy5yb3cocG9zKS5rZXlzKCldO1xuICAgIGlmICghdHlwZXMubGVuZ3RoKSByZXR1cm4gdGhpcy5waWNrVHlwZUZyb21TY3JlZW5zKHBvcyk7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc2luZ2xlIHR5cGUgZm9yICR7aGV4KHBvcyl9OiBbJHt0eXBlcy5qb2luKCcsICcpfV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVzWzBdO1xuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIGFuIGV4aXQgZnJvbSBvbmUgcG9zL3R5cGUgdG8gYW5vdGhlci5cbiAgICogQWxzbyB1cGRhdGVzIHRoZSBtZXRhbG9jYXRpb24gb24gdGhlIG90aGVyIGVuZCBvZiB0aGUgZXhpdC5cbiAgICogVGhpcyBzaG91bGQgdHlwaWNhbGx5IGJlIGRvbmUgYXRvbWljYWxseSBpZiByZWJ1aWxkaW5nIGEgbWFwLlxuICAgKi9cbiAgLy8gVE9ETyAtIHJlYnVpbGRpbmcgYSBtYXAgaW52b2x2ZXMgbW92aW5nIHRvIGEgTkVXIG1ldGFsb2NhdGlvbi4uLlxuICAvLyAgICAgIC0gZ2l2ZW4gdGhpcywgd2UgbmVlZCBhIGRpZmZlcmVudCBhcHByb2FjaD9cbiAgbW92ZUV4aXRzKC4uLm1vdmVzOiBBcnJheTxbUG9zLCBDb25uZWN0aW9uVHlwZSwgTG9jUG9zLCBDb25uZWN0aW9uVHlwZV0+KSB7XG4gICAgY29uc3QgbmV3RXhpdHM6IEFycmF5PFtQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlY10+ID0gW107XG4gICAgZm9yIChjb25zdCBbb2xkUG9zLCBvbGRUeXBlLCBuZXdQb3MsIG5ld1R5cGVdIG9mIG1vdmVzKSB7XG4gICAgICBjb25zdCBkZXN0RXhpdCA9IHRoaXMuX2V4aXRzLmdldChvbGRQb3MsIG9sZFR5cGUpITtcbiAgICAgIGNvbnN0IFtkZXN0VGlsZSwgZGVzdFR5cGVdID0gZGVzdEV4aXQ7XG4gICAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgW3RoaXMuaWQgPDwgOCB8IG5ld1BvcywgbmV3VHlwZV0pO1xuICAgICAgbmV3RXhpdHMucHVzaChbbmV3UG9zLCBuZXdUeXBlLCBkZXN0RXhpdF0pO1xuICAgICAgdGhpcy5fZXhpdHMuZGVsZXRlKG9sZFBvcywgb2xkVHlwZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgZXhpdF0gb2YgbmV3RXhpdHMpIHtcbiAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgfVxuXG4gIG1vdmVFeGl0KHByZXY6IFBvcywgbmV4dDogUG9zLFxuICAgICAgICAgICBwcmV2VHlwZT86IENvbm5lY3Rpb25UeXBlLCBuZXh0VHlwZT86IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgaWYgKCFwcmV2VHlwZSkgcHJldlR5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbUV4aXRzKHByZXYpO1xuICAgIGlmICghbmV4dFR5cGUpIG5leHRUeXBlID0gdGhpcy5waWNrVHlwZUZyb21TY3JlZW5zKG5leHQpO1xuICAgIGNvbnN0IGRlc3RFeGl0ID0gdGhpcy5fZXhpdHMuZ2V0KHByZXYsIHByZXZUeXBlKSE7XG4gICAgY29uc3QgW2Rlc3RUaWxlLCBkZXN0VHlwZV0gPSBkZXN0RXhpdDtcbiAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICBbdGhpcy5pZCA8PCA4IHwgbmV4dCwgbmV4dFR5cGVdKTtcbiAgICB0aGlzLl9leGl0cy5zZXQobmV4dCwgbmV4dFR5cGUsIGRlc3RFeGl0KTtcbiAgICB0aGlzLl9leGl0cy5kZWxldGUocHJldiwgcHJldlR5cGUpO1xuICB9XG5cbiAgbW92ZUV4aXRzQW5kUGl0c1RvKG90aGVyOiBNZXRhbG9jYXRpb24pIHtcbiAgICBjb25zdCBtb3ZlZCA9IG5ldyBTZXQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIG90aGVyLmFsbFBvcygpKSB7XG4gICAgICBpZiAoIW90aGVyLmdldChwb3MpLmRhdGEuZGVsZXRlKSB7XG4gICAgICAgIG1vdmVkLmFkZChwb3MpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgaWYgKCFtb3ZlZC5oYXMocG9zKSkgY29udGludWU7XG4gICAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+PiA4XS5tZXRhO1xuICAgICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsIFtvdGhlci5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gICAgICBvdGhlci5fZXhpdHMuc2V0KHBvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV0pO1xuICAgICAgdGhpcy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2Zyb20sIHRvXSBvZiB0aGlzLl9waXRzKSB7XG4gICAgICBpZiAoIW1vdmVkLmhhcyhmcm9tKSkgY29udGludWU7XG4gICAgICBvdGhlci5fcGl0cy5zZXQoZnJvbSwgdG8pO1xuICAgICAgdGhpcy5fcGl0cy5kZWxldGUoZnJvbSk7XG4gICAgfVxuICB9XG5cbiAgcGlja1R5cGVGcm9tU2NyZWVucyhwb3M6IFBvcyk6IENvbm5lY3Rpb25UeXBlIHtcbiAgICBjb25zdCBleGl0cyA9IHRoaXMuX3NjcmVlbnNbcG9zXS5kYXRhLmV4aXRzO1xuICAgIGNvbnN0IHR5cGVzID0gKGV4aXRzID8/IFtdKS5tYXAoZSA9PiBlLnR5cGUpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc2luZ2xlIHR5cGUgZm9yICR7aGV4KHBvcyl9OiBbJHt0eXBlcy5qb2luKCcsICcpfV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVzWzBdO1xuICB9XG5cbiAgdHJhbnNmZXJGbGFncyhvcmlnOiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gQ29weSBvdmVyIHRoZSBmcmVlIGZsYWdzXG4gICAgdGhpcy5mcmVlRmxhZ3MgPSBuZXcgU2V0KG9yaWcuZnJlZUZsYWdzKTtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgY3VzdG9tIGZsYWdzLlxuICAgIGNvbnN0IGN1c3RvbXMgPSBuZXcgRGVmYXVsdE1hcDxNZXRhc2NyZWVuLCBGbGFnW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IFtwb3MsIGZsYWddIG9mIG9yaWcuY3VzdG9tRmxhZ3MpIHtcbiAgICAgIGN1c3RvbXMuZ2V0KG9yaWcuX3NjcmVlbnNbcG9zXSkucHVzaChmbGFnKTtcbiAgICB9XG4gICAgLy8gU2h1ZmZsZSB0aGVtIGp1c3QgaW4gY2FzZSB0aGV5J3JlIG5vdCBhbGwgdGhlIHNhbWUuLi5cbiAgICAvLyBUT0RPIC0gZm9yIHNlYW1sZXNzIHBhaXJzLCBvbmx5IHNodWZmbGUgb25jZSwgdGhlbiBjb3B5LlxuICAgIGZvciAoY29uc3QgZmxhZ3Mgb2YgY3VzdG9tcy52YWx1ZXMoKSkgcmFuZG9tLnNodWZmbGUoZmxhZ3MpO1xuICAgIC8vIEZpbmQgYWxsIHRoZSBjdXN0b20tZmxhZyBzY3JlZW5zIGluIHRoZSBuZXcgbG9jYXRpb24uXG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgaWYgKHNjci5mbGFnPy5zdGFydHNXaXRoKCdjdXN0b20nKSkge1xuICAgICAgICBjb25zdCBmbGFnID0gY3VzdG9tcy5nZXQoc2NyKS5wb3AoKTtcbiAgICAgICAgaWYgKCFmbGFnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBmbGFnIGZvciAke3Njci5uYW1lfSBhdCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfSBAJHtoZXgocG9zKX1gKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmN1c3RvbUZsYWdzLnNldChwb3MsIGZsYWcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb3B5IHBpdCBkZXN0aW5hdGlvbnMgZnJvbSB0aGUgb3JpZ2luYWwuICBOT1RFOiB0aGVyZSBpcyBOTyBzYWZldHlcbiAgICogY2hlY2sgaGVyZSBmb3IgdGhlIHBpdHMgYmVpbmcgcmVhc29uYWJsZS4gIFRoYXQgbXVzdCBiZSBkb25lIGVsc2V3aGVyZS5cbiAgICogV2UgZG9uJ3Qgd2FudCBwaXQgc2FmZXR5IHRvIGJlIGNvbnRpbmdlbnQgb24gc3VjY2Vzc2Z1bCBzaHVmZmxpbmcgb2ZcbiAgICogdGhlIHVwc3RhaXJzIG1hcC5cbiAgICovXG4gIHRyYW5zZmVyUGl0cyhvcmlnOiBNZXRhbG9jYXRpb24pIHtcbiAgICB0aGlzLl9waXRzID0gb3JpZy5fcGl0cztcbiAgfVxuXG4gIC8qKiBFbnN1cmUgYWxsIHBpdHMgZ28gdG8gdmFsaWQgbG9jYXRpb25zLiAqL1xuICBzaHVmZmxlUGl0cyhyYW5kb206IFJhbmRvbSkge1xuICAgIGlmICghdGhpcy5fcGl0cy5zaXplKSByZXR1cm47XG4gICAgLy8gRmluZCBhbGwgcGl0IGRlc3RpbmF0aW9ucy5cbiAgICBjb25zdCBkZXN0cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgWywgZGVzdF0gb2YgdGhpcy5fcGl0cykge1xuICAgICAgZGVzdHMuYWRkKHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0ID4+PiA4XS5pZCk7XG4gICAgfVxuICAgIHRoaXMuX3BpdHMuY2xlYXIoKTtcblxuICAgIC8vIExvb2sgZm9yIGV4aXN0aW5nIHBpdHMuICBTb3J0IGJ5IGxvY2F0aW9uLCBbcGl0IHBvcywgZGVzdCBwb3NdXG4gICAgY29uc3QgcGl0cyA9IG5ldyBEZWZhdWx0TWFwPE1ldGFsb2NhdGlvbiwgQXJyYXk8W1BvcywgUG9zXT4+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLmdldChwb3MpO1xuICAgICAgaWYgKCFzY3IuaGFzRmVhdHVyZSgncGl0JykpIGNvbnRpbnVlO1xuICAgICAgLy8gRmluZCB0aGUgbmVhcmVzdCBleGl0IHRvIG9uZSBvZiB0aG9zZSBkZXN0aW5hdGlvbnM6IFtkZWx0YSwgbG9jLCBkaXN0XVxuICAgICAgbGV0IGNsb3Nlc3Q6IFtQb3MsIE1ldGFsb2NhdGlvbiwgbnVtYmVyXSA9IFstMSwgdGhpcywgSW5maW5pdHldO1xuICAgICAgZm9yIChjb25zdCBbZXhpdFBvcywsIFtkZXN0XV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgICAgY29uc3QgZGlzdCA9IGRpc3RhbmNlKHBvcywgZXhpdFBvcyk7XG4gICAgICAgIGlmIChkZXN0cy5oYXMoZGVzdCA+Pj4gOCkgJiYgZGlzdCA8IGNsb3Nlc3RbMl0pIHtcbiAgICAgICAgICBjb25zdCBkbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3QgPj4+IDhdLm1ldGE7XG4gICAgICAgICAgY29uc3QgZHBvcyA9IGRlc3QgJiAweGZmO1xuICAgICAgICAgIGNsb3Nlc3QgPSBbYWRkRGVsdGEocG9zLCBkcG9zLCBleGl0UG9zLCBkbG9jKSwgZGxvYywgZGlzdF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChjbG9zZXN0WzBdID49IDApIHBpdHMuZ2V0KGNsb3Nlc3RbMV0pLnB1c2goW3BvcywgY2xvc2VzdFswXV0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGRlc3Qgb2YgZGVzdHMpIHtcbiAgICAgIGNvbnN0IGxpc3QgPSBwaXRzLmdldCh0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF0ubWV0YSk7XG4gICAgICAvLyBJZiB0aGVyZSdzIGV2ZXIgbm90IGEgZGlyZWN0IGV4aXQgdG8gYW55IGRlc3RpbmF0aW9uLCBqdXN0IHB1c2hcbiAgICAgIC8vIGEgbGFyZ2UgZGVsdGEgdG93YXJkIHRoZSBib3R0b20gb2YgdGhlIG1hcC5cbiAgICAgIGlmICghbGlzdC5sZW5ndGgpIGxpc3QucHVzaChbMCwgMHhmMF0pO1xuICAgIH1cblxuICAgIC8vIEZvciBlYWNoIGRlc3RpbmF0aW9uIGxvY2F0aW9uLCBsb29rIGZvciBzcGlrZXMsIHRoZXNlIHdpbGwgb3ZlcnJpZGVcbiAgICAvLyBhbnkgcG9zaXRpb24tYmFzZWQgZGVzdGluYXRpb25zLlxuICAgIGZvciAoY29uc3QgW2Rlc3QsIGxpc3RdIG9mIHBpdHMpIHtcbiAgICAgIC8vIHZlcnRpY2FsLCBob3Jpem9udGFsXG4gICAgICBjb25zdCBlbGlnaWJsZTogUG9zW11bXSA9IFtbXSwgW11dO1xuICAgICAgY29uc3Qgc3Bpa2VzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIGRlc3QuYWxsUG9zKCkpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gZGVzdC5nZXQocG9zKTtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyaXZlcicpIHx8IHNjci5oYXNGZWF0dXJlKCdlbXB0eScpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZWRnZXMgPVxuICAgICAgICAgICAgKHNjci5kYXRhLmVkZ2VzIHx8ICcnKS5zcGxpdCgnJykubWFwKHggPT4geCA9PT0gJyAnID8gJycgOiB4KTtcbiAgICAgICAgaWYgKGVkZ2VzWzBdICYmIGVkZ2VzWzJdKSBlbGlnaWJsZVswXS5wdXNoKHBvcyk7XG4gICAgICAgIC8vIE5PVEU6IHdlIGNsYW1wIHRoZSB0YXJnZXQgWCBjb29yZHMgc28gdGhhdCBzcGlrZSBzY3JlZW5zIGFyZSBhbGwgZ29vZFxuICAgICAgICAvLyB0aGlzIHByZXZlbnRzIGVycm9ycyBmcm9tIG5vdCBoYXZpbmcgYSB2aWFibGUgZGVzdGluYXRpb24gc2NyZWVuLlxuICAgICAgICBpZiAoKGVkZ2VzWzFdICYmIGVkZ2VzWzNdKSB8fCBzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgICBlbGlnaWJsZVsxXS5wdXNoKHBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkge1xuICAgICAgICAgIHNwaWtlcy5zZXQocG9zLCBbLi4uZWRnZXNdLmZpbHRlcihjID0+IGMgPT09ICdzJykubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfVxuLy9jb25zb2xlLmxvZyhgZGVzdDpcXG4ke2Rlc3Quc2hvdygpfVxcbmVsaWdpYmxlOiAke2VsaWdpYmxlLm1hcChlID0+IGUubWFwKGggPT4gaC50b1N0cmluZygxNikpLmpvaW4oJywnKSkuam9pbignICAnKX1gKTtcbiAgICAgIC8vIGZpbmQgdGhlIGNsb3Nlc3QgZGVzdGluYXRpb24gZm9yIHRoZSBmaXJzdCBwaXQsIGtlZXAgYSBydW5uaW5nIGRlbHRhLlxuICAgICAgbGV0IGRlbHRhOiBbUG9zLCBQb3NdID0gWzAsIDBdO1xuICAgICAgZm9yIChjb25zdCBbdXBzdGFpcnMsIGRvd25zdGFpcnNdIG9mIGxpc3QpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5nZXQodXBzdGFpcnMpO1xuICAgICAgICBjb25zdCBlZGdlcyA9IHNjci5kYXRhLmVkZ2VzIHx8ICcnO1xuICAgICAgICBjb25zdCBkaXIgPSBlZGdlc1sxXSA9PT0gJ2MnICYmIGVkZ2VzWzNdID09PSAnYycgPyAxIDogMDtcbiAgICAgICAgLy8gZWxpZ2libGUgZGVzdCB0aWxlLCBkaXN0YW5jZVxuICAgICAgICBsZXQgY2xvc2VzdDogW1BvcywgbnVtYmVyLCBudW1iZXJdID0gWy0xLCBJbmZpbml0eSwgMF07XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGFkZERlbHRhKGRvd25zdGFpcnMsIGRlbHRhWzBdLCBkZWx0YVsxXSwgZGVzdCk7XG4gICAgICAgIGZvciAoY29uc3QgcG9zIG9mIGVsaWdpYmxlW2Rpcl0pIHsgLy9mb3IgKGxldCBpID0gMDsgaSA8IGVsaWdpYmxlW2Rpcl0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAvLyAgICAgICAgICBjb25zdCBwb3MgPSBlbGlnaWJsZVtkaXJdW2ldO1xuICAgICAgICAgIGNvbnN0IHNwaWtlQ291bnQgPSBzcGlrZXMuZ2V0KHBvcykgPz8gMDtcbiAgICAgICAgICBpZiAoc3Bpa2VDb3VudCA8IGNsb3Nlc3RbMl0pIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGRpc3QgPSBkaXN0YW5jZSh0YXJnZXQsIHBvcyk7XG4gICAgICAgICAgaWYgKGRpc3QgPCBjbG9zZXN0WzFdKSB7XG4gICAgICAgICAgICBjbG9zZXN0ID0gW3BvcywgZGlzdCwgc3Bpa2VDb3VudF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVuZFBvcyA9IGNsb3Nlc3RbMF07XG4gICAgICAgIGlmIChlbmRQb3MgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGVsaWdpYmxlIGRlc3RgKTtcbiAgICAgICAgZGVsdGEgPSBbZW5kUG9zLCB0YXJnZXRdO1xuICAgICAgICB0aGlzLl9waXRzLnNldCh1cHN0YWlycywgZGVzdC5pZCA8PCA4IHwgZW5kUG9zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGFrZXMgb3duZXJzaGlwIG9mIGV4aXRzIGZyb20gYW5vdGhlciBtZXRhbG9jYXRpb24gd2l0aCB0aGUgc2FtZSBJRC5cbiAgICogQHBhcmFtIHtmaXhlZH0gbWFwcyBkZXN0aW5hdGlvbiBsb2NhdGlvbiBJRCB0byBwb3Mgd2hlcmUgdGhlIGV4aXQgaXMuXG4gICAqL1xuICB0cmFuc2ZlckV4aXRzKG9yaWc6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBEZXRlcm1pbmUgYWxsIHRoZSBlbGlnaWJsZSBleGl0IHNjcmVlbnMuXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgRGVmYXVsdE1hcDxDb25uZWN0aW9uVHlwZSwgUG9zW10+KCgpID0+IFtdKTtcbiAgICBjb25zdCBzZWxmRXhpdHMgPSBuZXcgRGVmYXVsdE1hcDxDb25uZWN0aW9uVHlwZSwgU2V0PFBvcz4+KCgpID0+IG5ldyBTZXQoKSk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgZm9yIChjb25zdCB7dHlwZX0gb2Ygc2NyLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnRvcCcgJiYgKHBvcyA+Pj4gNCkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6bGVmdCcgJiYgKHBvcyAmIDB4ZikpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiAocG9zID4+PiA0KSA8IHRoaXMuaGVpZ2h0IC0gMSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpyaWdodCcgJiYgKHBvcyAmIDB4ZikgPCB0aGlzLndpZHRoIC0gMSkgY29udGludWU7XG4gICAgICAgIGV4aXRzLmdldCh0eXBlKS5wdXNoKHBvcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgYXJyIG9mIGV4aXRzLnZhbHVlcygpKSB7XG4gICAgICByYW5kb20uc2h1ZmZsZShhcnIpO1xuICAgIH1cbiAgICAvLyBGaW5kIGEgbWF0Y2ggZm9yIGVhY2ggb3JpZ2luYWwgZXhpdC5cbiAgICBmb3IgKGNvbnN0IFtvcG9zLCB0eXBlLCBleGl0XSBvZiBvcmlnLl9leGl0cykge1xuICAgICAgaWYgKHNlbGZFeGl0cy5nZXQodHlwZSkuaGFzKG9wb3MpKSBjb250aW51ZTtcbiAgICAgIC8vIG9wb3MsZXhpdCBmcm9tIG9yaWdpbmFsIHZlcnNpb24gb2YgdGhpcyBtZXRhbG9jYXRpb25cbiAgICAgIGNvbnN0IHBvcyA9IGV4aXRzLmdldCh0eXBlKS5wb3AoKTsgLy8gYSBQb3MgaW4gdGhpcyBtZXRhbG9jYXRpb25cbiAgICAgIGlmIChwb3MgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB0cmFuc2ZlciBleGl0ICR7dHlwZX0gaW4gJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19OiBubyBlbGlnaWJsZSBzY3JlZW5cXG4ke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpfWApO1xuICAgICAgfVxuICAgICAgLy8gTG9vayBmb3IgYSByZXZlcnNlIGV4aXQ6IGV4aXQgaXMgdGhlIHNwZWMgZnJvbSBvbGQgbWV0YS5cbiAgICAgIC8vIEZpbmQgdGhlIG1ldGFsb2NhdGlvbiBpdCByZWZlcnMgdG8gYW5kIHNlZSBpZiB0aGUgZXhpdFxuICAgICAgLy8gZ29lcyBiYWNrIHRvIHRoZSBvcmlnaW5hbCBwb3NpdGlvbi5cbiAgICAgIGNvbnN0IGVsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdFswXSA+Pj4gOF0ubWV0YTtcbiAgICAgIGNvbnN0IGVwb3MgPSBleGl0WzBdICYgMHhmZjtcbiAgICAgIGNvbnN0IGV0eXBlID0gZXhpdFsxXTtcbiAgICAgIGlmIChlbG9jID09PSBvcmlnKSB7XG4gICAgICAgIC8vIFNwZWNpYWwgY2FzZSBvZiBhIHNlbGYtZXhpdCAoaGFwcGVucyBpbiBoeWRyYSBhbmQgcHlyYW1pZCkuXG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSwganVzdCBwaWNrIGFuIGV4aXQgb2YgdGhlIGNvcnJlY3QgdHlwZS5cbiAgICAgICAgY29uc3QgbnBvcyA9IGV4aXRzLmdldChldHlwZSkucG9wKCk7XG4gICAgICAgIGlmIChucG9zID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZWApO1xuICAgICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBbdGhpcy5pZCA8PCA4IHwgbnBvcywgZXR5cGVdKTtcbiAgICAgICAgdGhpcy5fZXhpdHMuc2V0KG5wb3MsIGV0eXBlLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gICAgICAgIC8vIEFsc28gZG9uJ3QgdmlzaXQgdGhlIG90aGVyIGV4aXQgbGF0ZXIuXG4gICAgICAgIHNlbGZFeGl0cy5nZXQoZXR5cGUpLmFkZChlcG9zKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCByZXQgPSBlbG9jLl9leGl0cy5nZXQoZXBvcywgZXR5cGUpITtcbiAgICAgIGlmICghcmV0KSB7XG4gICAgICAgIGNvbnN0IGVlbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2V4aXRbMF0gPj4+IDhdO1xuICAgICAgICBjb25zb2xlLmxvZyhlbG9jKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBleGl0IGZvciAke2VlbG9jfSBhdCAke2hleChlcG9zKX0gJHtldHlwZX1cXG4ke1xuICAgICAgICAgICAgICAgICAgICAgICAgIGVsb2Muc2hvdygpfVxcbiR7dGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfSBhdCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIGhleChvcG9zKX0gJHt0eXBlfVxcbiR7dGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICBpZiAoKHJldFswXSA+Pj4gOCkgPT09IHRoaXMuaWQgJiYgKChyZXRbMF0gJiAweGZmKSA9PT0gb3BvcykgJiZcbiAgICAgICAgICByZXRbMV0gPT09IHR5cGUpIHtcbiAgICAgICAgZWxvYy5fZXhpdHMuc2V0KGVwb3MsIGV0eXBlLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgTlBDcywgdHJpZ2dlcnMsIGFuZCBjaGVzdHMgYmFzZWQgb24gcHJveGltaXR5IHRvIHNjcmVlbnMsXG4gICAqIGV4aXRzLCBhbmQgUE9JLlxuICAgKi9cbiAgdHJhbnNmZXJTcGF3bnModGhhdDogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIFN0YXJ0IGJ5IGJ1aWxkaW5nIGEgbWFwIGJldHdlZW4gZXhpdHMgYW5kIHNwZWNpZmljIHNjcmVlbiB0eXBlcy5cbiAgICBjb25zdCByZXZlcnNlRXhpdHMgPSBuZXcgTWFwPEV4aXRTcGVjLCBbbnVtYmVyLCBudW1iZXJdPigpOyAvLyBtYXAgdG8geSx4XG4gICAgY29uc3QgcGl0cyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7IC8vIG1hcHMgdG8gZGlyICgwID0gdmVydCwgMSA9IGhvcml6KVxuICAgIGNvbnN0IHN0YXR1ZXM6IEFycmF5PFtQb3MsIG51bWJlcl0+ID0gW107IC8vIGFycmF5IG9mIHNwYXduIFtzY3JlZW4sIGNvb3JkXVxuICAgIC8vIEFycmF5IG9mIFtvbGQgeSwgb2xkIHgsIG5ldyB5LCBuZXcgeCwgbWF4IGRpc3RhbmNlIChzcXVhcmVkKV1cbiAgICBjb25zdCBtYXA6IEFycmF5PFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgY29uc3Qgd2FsbHM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgY29uc3QgYnJpZGdlczogQXJyYXk8W251bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICAvLyBQYWlyIHVwIGFyZW5hcy5cbiAgICBjb25zdCBhcmVuYXM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiBsb2MuYWxsUG9zKCkpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gbG9jLl9zY3JlZW5zW3Bvc107XG4gICAgICAgIGNvbnN0IHkgPSBwb3MgJiAweGYwO1xuICAgICAgICBjb25zdCB4ID0gKHBvcyAmIDB4ZikgPDwgNDtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdwaXQnKSAmJiBsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBwaXRzLnNldChwb3MsIHNjci5lZGdlSW5kZXgoJ2MnKSA9PT0gNSA/IDAgOiAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChzY3IuZGF0YS5zdGF0dWVzPy5sZW5ndGggJiYgbG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY3IuZGF0YS5zdGF0dWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBzY3IuZGF0YS5zdGF0dWVzW2ldIDw8IDEyO1xuICAgICAgICAgICAgY29uc3QgcGFyaXR5ID0gKChwb3MgJiAweGYpIF4gKHBvcyA+Pj4gNCkgXiBpKSAmIDE7XG4gICAgICAgICAgICBjb25zdCBjb2wgPSBwYXJpdHkgPyAweDUwIDogMHhhMDtcbiAgICAgICAgICAgIHN0YXR1ZXMucHVzaChbcG9zLCByb3cgfCBjb2xdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcyAmJiBzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSB7XG4gICAgICAgICAgaWYgKHNjci5kYXRhLndhbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHdhbGwgcHJvcGApO1xuICAgICAgICAgIGNvbnN0IHdhbGwgPSBbeSB8IChzY3IuZGF0YS53YWxsID4+IDQpLCB4IHwgKHNjci5kYXRhLndhbGwgJiAweGYpXTtcbiAgICAgICAgICB3YWxscy5wdXNoKHdhbGwgYXMgW251bWJlciwgbnVtYmVyXSk7XG4gICAgICAgICAgLy8gU3BlY2lhbC1jYXNlIHRoZSBcImRvdWJsZSBicmlkZ2VcIiBpbiBsaW1lIHRyZWUgbGFrZVxuICAgICAgICAgIGlmIChzY3IuZGF0YS50aWxlc2V0cy5saW1lKSB3YWxscy5wdXNoKFt3YWxsWzBdIC0gMSwgd2FsbFsxXV0pO1xuICAgICAgICB9IGVsc2UgaWYgKGxvYyA9PT0gdGhpcyAmJiBzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHtcbiAgICAgICAgICBpZiAoc2NyLmRhdGEud2FsbCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgd2FsbCBwcm9wYCk7XG4gICAgICAgICAgYnJpZGdlcy5wdXNoKFt5IHwgKHNjci5kYXRhLndhbGwgPj4gNCksIHggfCAoc2NyLmRhdGEud2FsbCAmIDB4ZildKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNjci5oYXNGZWF0dXJlKCdhcmVuYScpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIGFyZW5hcy5wdXNoKFt5IHwgOCwgeCB8IDhdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBbbnksIG54XSA9IGFyZW5hcy5wb3AoKSE7XG4gICAgICAgICAgbWFwLnB1c2goW3kgfCA4LCB4IHwgOCwgbnksIG54LCAxNDRdKTsgLy8gMTIgdGlsZXNcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGxvYyA9PT0gdGhpcykgeyAvLyBUT0RPIC0gdGhpcyBpcyBhIG1lc3MsIGZhY3RvciBvdXQgdGhlIGNvbW1vbmFsaXR5XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKGFyZW5hcyk7XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKHN0YXR1ZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBOb3cgcGFpciB1cCBleGl0cy5cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgZXhpdF0gb2YgbG9jLl9leGl0cykge1xuICAgICAgICBjb25zdCBzY3IgPSBsb2MuX3NjcmVlbnNbcG9zXTtcbiAgICAgICAgY29uc3Qgc3BlYyA9IHNjci5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSB0eXBlKTtcbiAgICAgICAgaWYgKCFzcGVjKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZXhpdDogJHtzY3IubmFtZX0gJHt0eXBlfWApO1xuICAgICAgICBjb25zdCB4MCA9IHBvcyAmIDB4ZjtcbiAgICAgICAgY29uc3QgeTAgPSBwb3MgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHgxID0gc3BlYy5leGl0c1swXSAmIDB4ZjtcbiAgICAgICAgY29uc3QgeTEgPSBzcGVjLmV4aXRzWzBdID4+PiA0O1xuICAgICAgICBpZiAobG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgcmV2ZXJzZUV4aXRzLnNldChleGl0LCBbeTAgPDwgNCB8IHkxLCB4MCA8PCA0IHwgeDFdKTtcbiAgICAgICAgfSBlbHNlIGlmICgoZXhpdFswXSA+Pj4gOCkgIT09IHRoaXMuaWQpIHsgLy8gc2tpcCBzZWxmLWV4aXRzXG4gICAgICAgICAgY29uc3QgW255LCBueF0gPSByZXZlcnNlRXhpdHMuZ2V0KGV4aXQpITtcbiAgICAgICAgICBtYXAucHVzaChbeTAgPDwgNCB8IHkxLCB4MCA8PCA0IHwgeDEsIG55LCBueCwgMjVdKTsgLy8gNSB0aWxlc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE1ha2UgYSBsaXN0IG9mIFBPSSBieSBwcmlvcml0eSAoMC4uNSkuXG5cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBmaXJzdCBwYXJ0aXRpb25pbmcgdGhlIHNjcmVlbnMgd2l0aCBpbXBhc3NpYmxlXG4gICAgLy8gd2FsbHMgYW5kIHBsYWNpbmcgcG9pIGludG8gYXMgbWFueSBzZXBhcmF0ZSBwYXJ0aXRpb25zIChmcm9tXG4gICAgLy8gc3RhaXJzL2VudHJhbmNlcykgYXMgcG9zc2libGUgPz8/ICBPciBtYXliZSBqdXN0IHdlaWdodCB0aG9zZVxuICAgIC8vIGhpZ2hlcj8gIGRvbid0IHdhbnQgdG8gX2ZvcmNlXyB0aGluZ3MgdG8gYmUgaW5hY2Nlc3NpYmxlLi4uP1xuXG4gICAgY29uc3QgcHBvaTogQXJyYXk8QXJyYXk8W251bWJlciwgbnVtYmVyXT4+ID0gW1tdLCBbXSwgW10sIFtdLCBbXSwgW11dO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3QgW3AsIGR5ID0gMHg3MCwgZHggPSAweDc4XSBvZiBzY3IuZGF0YS5wb2kgPz8gW10pIHtcbiAgICAgICAgY29uc3QgeSA9ICgocG9zICYgMHhmMCkgPDwgNCkgKyBkeTtcbiAgICAgICAgY29uc3QgeCA9ICgocG9zICYgMHgwZikgPDwgOCkgKyBkeDtcbiAgICAgICAgcHBvaVtwXS5wdXNoKFt5LCB4XSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9pIG9mIHBwb2kpIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKHBvaSk7XG4gICAgfVxuICAgIGNvbnN0IGFsbFBvaSA9IFsuLi5pdGVycy5jb25jYXQoLi4ucHBvaSldO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgc3Bhd25zLCBsb29rIGZvciBOUEMvY2hlc3QvdHJpZ2dlci5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgXG4gICAgZm9yIChjb25zdCBzcGF3biBvZiByYW5kb20uaXNodWZmbGUobG9jLnNwYXducykpIHtcbiAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkge1xuICAgICAgICBjb25zdCBwbGF0Zm9ybSA9IFBMQVRGT1JNUy5pbmRleE9mKHNwYXduLm1vbnN0ZXJJZCk7XG4gICAgICAgIGlmIChwbGF0Zm9ybSA+PSAwICYmIHBpdHMuc2l6ZSkge1xuICAgICAgICAgIGNvbnN0IFtbcG9zLCBkaXJdXSA9IHBpdHM7XG4gICAgICAgICAgcGl0cy5kZWxldGUocG9zKTtcbiAgICAgICAgICBzcGF3bi5tb25zdGVySWQgPSBQTEFURk9STVNbcGxhdGZvcm0gJiAyIHwgZGlyXTtcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSBwb3M7XG4gICAgICAgICAgc3Bhd24udGlsZSA9IGRpciA/IDB4NzMgOiAweDQ3O1xuICAgICAgICB9IGVsc2UgaWYgKHNwYXduLm1vbnN0ZXJJZCA9PT0gMHg4ZiAmJiBzdGF0dWVzLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IFtzY3JlZW4sIGNvb3JkXSA9IHN0YXR1ZXMucG9wKCkhO1xuICAgICAgICAgIHNwYXduLnNjcmVlbiA9IHNjcmVlbjtcbiAgICAgICAgICBzcGF3bi5jb29yZCA9IGNvb3JkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlOyAvLyB0aGVzZSBhcmUgaGFuZGxlZCBlbHNld2hlcmUuXG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgIGNvbnN0IHdhbGwgPSAoc3Bhd24ud2FsbFR5cGUoKSA9PT0gJ2JyaWRnZScgPyBicmlkZ2VzIDogd2FsbHMpLnBvcCgpO1xuICAgICAgICBpZiAoIXdhbGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBlbm91Z2ggJHtzcGF3bi53YWxsVHlwZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9IHNjcmVlbnMgaW4gbmV3IG1ldGFsb2NhdGlvbjogJHtsb2N9XFxuJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFt5LCB4XSA9IHdhbGw7XG4gICAgICAgIHNwYXduLnl0ID0geTtcbiAgICAgICAgc3Bhd24ueHQgPSB4O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSB8fCBzcGF3bi5pc0Jvc3MoKSB8fCBzcGF3bi5pc1RyaWdnZXIoKSB8fFxuICAgICAgICAgICAgICAgICBzcGF3bi5pc0dlbmVyaWMoKSkge1xuICAgICAgICAvL2xldCBqID0gMDtcbiAgICAgICAgbGV0IGJlc3QgPSBbLTEsIC0xLCBJbmZpbml0eV07XG4gICAgICAgIGZvciAoY29uc3QgW3kwLCB4MCwgeTEsIHgxLCBkbWF4XSBvZiBtYXApIHtcbiAgICAgICAgICBjb25zdCBkID0gKHl0RGlmZihzcGF3bi55dCwgeTApKSAqKiAyICsgKHNwYXduLnh0IC0geDApICoqIDI7XG4gICAgICAgICAgaWYgKGQgPD0gZG1heCAmJiBkIDwgYmVzdFsyXSkge1xuICAgICAgICAgICAgYmVzdCA9IFt5dEFkZChzcGF3bi55dCwgeXREaWZmKHkxLCB5MCkpLCBzcGF3bi54dCArIHgxIC0geDAsIGRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKGJlc3RbMl0pKSB7XG4gICAgICAgICAgLy8gS2VlcCB0cmFjayBvZiBhbnkgTlBDcyB3ZSBhbHJlYWR5IG1vdmVkIHNvIHRoYXQgYW55dGhpbmcgdGhhdCdzXG4gICAgICAgICAgLy8gb24gdG9wIG9mIGl0IChpLmUuIGR1YWwgc3Bhd25zKSBtb3ZlIGFsb25nIHdpdGguXG4gICAgICAgICAgLy9pZiAoYmVzdFsyXSA+IDQpIG1hcC5wdXNoKFtzcGF3bi54dCwgc3Bhd24ueXQsIGJlc3RbMF0sIGJlc3RbMV0sIDRdKTtcbiAgICAgICAgICAvLyAtIFRPRE8gLSBJIGRvbid0IHRoaW5rIHdlIG5lZWQgdGhpcywgc2luY2UgYW55IGZ1dHVyZSBzcGF3biBzaG91bGRcbiAgICAgICAgICAvLyAgIGJlIHBsYWNlZCBieSB0aGUgc2FtZSBydWxlcy5cbiAgICAgICAgICBbc3Bhd24ueXQsIHNwYXduLnh0XSA9IGJlc3Q7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIFdhc24ndCBhYmxlIHRvIG1hcCBhbiBhcmVuYSBvciBleGl0LiAgUGljayBhIG5ldyBQT0ksIGJ1dCB0cmlnZ2VycyBhbmRcbiAgICAgIC8vIGJvc3NlcyBhcmUgaW5lbGlnaWJsZS5cbiAgICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSB8fCBzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBwbGFjZSAke2xvY30gJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBzcGF3bi5pc0Jvc3MoKSA/ICdCb3NzJyA6ICdUcmlnZ2VyJ30gJHtzcGF3bi5oZXgoKVxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4ke3RoaXMuc2hvdygpfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV4dCA9IGFsbFBvaS5zaGlmdCgpO1xuICAgICAgaWYgKCFuZXh0KSB0aHJvdyBuZXcgRXJyb3IoYFJhbiBvdXQgb2YgUE9JIGZvciAke2xvY31gKTtcbiAgICAgIGNvbnN0IFt5LCB4XSA9IG5leHQ7XG4gICAgICBtYXAucHVzaChbc3Bhd24ueSA+Pj4gNCwgc3Bhd24ueCA+Pj4gNCwgeSA+Pj4gNCwgeCA+Pj4gNCwgNF0pO1xuICAgICAgc3Bhd24ueSA9IHk7XG4gICAgICBzcGF3bi54ID0geDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzZWFtbGVzcyBwYWlyIGxvY2F0aW9uLCBzeW5jIHVwIHRoZSBleGl0cy4gIEZvciBlYWNoIGV4aXQgb2ZcbiAgICogZWl0aGVyLCBjaGVjayBpZiBpdCdzIHN5bW1ldHJpYywgYW5kIGlmIHNvLCBjb3B5IGl0IG92ZXIgdG8gdGhlIG90aGVyIHNpZGUuXG4gICAqL1xuICByZWNvbmNpbGVFeGl0cyh0aGF0OiBNZXRhbG9jYXRpb24pIHtcbiAgICBjb25zdCBhZGQ6IFtNZXRhbG9jYXRpb24sIFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXVtdID0gW107XG4gICAgY29uc3QgZGVsOiBbTWV0YWxvY2F0aW9uLCBQb3MsIENvbm5lY3Rpb25UeXBlXVtdID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiBsb2MuX2V4aXRzKSB7XG4gICAgICAgIGlmIChkZXN0VHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF07XG4gICAgICAgIGNvbnN0IHJldmVyc2UgPSBkZXN0Lm1ldGEuX2V4aXRzLmdldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlKTtcbiAgICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgICBjb25zdCBbcmV2VGlsZSwgcmV2VHlwZV0gPSByZXZlcnNlO1xuICAgICAgICAgIGlmICgocmV2VGlsZSA+Pj4gOCkgPT09IGxvYy5pZCAmJiAocmV2VGlsZSAmIDB4ZmYpID09PSBwb3MgJiZcbiAgICAgICAgICAgICAgcmV2VHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgYWRkLnB1c2goW2xvYyA9PT0gdGhpcyA/IHRoYXQgOiB0aGlzLCBwb3MsIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkZWwucHVzaChbbG9jLCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGVdIG9mIGRlbCkge1xuICAgICAgbG9jLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGUsIGV4aXRdIG9mIGFkZCkge1xuICAgICAgbG9jLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gICAgLy8gdGhpcy5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICAgIC8vIHRoYXQuX2V4aXRzID0gbmV3IFRhYmxlKGV4aXRzKTtcbiAgfVxuXG4gIC8qKiBXcml0ZXMgdGhlIGVudHJhbmNlMCBpZiBwb3NzaWJsZS4gKi9cbiAgd3JpdGVFbnRyYW5jZTAoKSB7XG4gICAgaWYgKCF0aGlzLl9lbnRyYW5jZTApIHJldHVybjtcbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGVdIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBpZiAodHlwZSAhPT0gdGhpcy5fZW50cmFuY2UwKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGV4aXQgPSB0aGlzLl9zY3JlZW5zW3Bvc10uZmluZEV4aXRCeVR5cGUodHlwZSk7XG4gICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF0uZW50cmFuY2VzWzBdID1cbiAgICAgICAgICBFbnRyYW5jZS5vZih7c2NyZWVuOiBwb3MsIGNvb3JkOiBleGl0LmVudHJhbmNlfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNhdmVzIHRoZSBjdXJyZW50IHN0YXRlIGJhY2sgaW50byB0aGUgdW5kZXJseWluZyBsb2NhdGlvbi5cbiAgICogQ3VycmVudGx5IHRoaXMgb25seSBkZWFscyB3aXRoIGVudHJhbmNlcy9leGl0cyAoPz8pXG4gICAqL1xuICB3cml0ZSgpIHtcbiAgICBjb25zdCBzcmNMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgLy9sZXQgc2VhbWxlc3NQYXJ0bmVyOiBMb2NhdGlvbnx1bmRlZmluZWQ7XG4gICAgY29uc3Qgc2VhbWxlc3NQb3MgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IFtzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgY29uc3Qgc3JjU2NyZWVuID0gdGhpcy5fc2NyZWVuc1tzcmNQb3NdO1xuICAgICAgY29uc3QgZGVzdCA9IGRlc3RUaWxlID4+IDg7XG4gICAgICBsZXQgZGVzdFBvcyA9IGRlc3RUaWxlICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3RMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF07XG4gICAgICBjb25zdCBkZXN0TWV0YSA9IGRlc3RMb2MubWV0YSE7XG4gICAgICBjb25zdCBkZXN0U2NyZWVuID0gZGVzdE1ldGEuX3NjcmVlbnNbZGVzdFRpbGUgJiAweGZmXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gc3JjVHlwZSk7XG4gICAgICBjb25zdCBkZXN0RXhpdCA9IGRlc3RTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gZGVzdFR5cGUpO1xuICAgICAgaWYgKCFzcmNFeGl0IHx8ICFkZXN0RXhpdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgJHtzcmNFeGl0ID8gJ2Rlc3QnIDogJ3NvdXJjZSd9IGV4aXQ6XG4gIEZyb206ICR7c3JjTG9jfSBAICR7aGV4KHNyY1Bvcyl9OiR7c3JjVHlwZX0gJHtzcmNTY3JlZW4ubmFtZX1cbiAgVG86ICAgJHtkZXN0TG9jfSBAICR7aGV4KGRlc3RQb3MpfToke2Rlc3RUeXBlfSAke2Rlc3RTY3JlZW4ubmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIC8vIFNlZSBpZiB0aGUgZGVzdCBlbnRyYW5jZSBleGlzdHMgeWV0Li4uXG4gICAgICBsZXQgZW50cmFuY2UgPSAweDIwO1xuICAgICAgaWYgKGRlc3RFeGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICBzZWFtbGVzc1Bvcy5hZGQoc3JjUG9zKTtcbiAgICAgICAgLy9zZWFtbGVzc1BhcnRuZXIgPSBkZXN0TG9jO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGRlc3RDb29yZCA9IGRlc3RFeGl0LmVudHJhbmNlO1xuICAgICAgICBpZiAoZGVzdENvb3JkID4gMHhlZmZmKSB7IC8vIGhhbmRsZSBzcGVjaWFsIGNhc2UgaW4gT2FrXG4gICAgICAgICAgZGVzdFBvcyArPSAweDEwO1xuICAgICAgICAgIGRlc3RDb29yZCAtPSAweDEwMDAwO1xuICAgICAgICB9XG4gICAgICAgIGVudHJhbmNlID0gZGVzdExvYy5maW5kT3JBZGRFbnRyYW5jZShkZXN0UG9zLCBkZXN0Q29vcmQpO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgdGlsZSBvZiBzcmNFeGl0LmV4aXRzKSB7XG4gICAgICAgIGxldCBzY3JlZW4gPSBzcmNQb3M7XG4gICAgICAgIGlmICgodGlsZSAmIDB4ZjApID09PSAweGYwKSB7XG4gICAgICAgICAgc2NyZWVuICs9IDB4MTA7XG4gICAgICAgICAgdGlsZSAmPSAweGY7XG4gICAgICAgIH1cbiAgICAgICAgLy9pZiAoc3JjRXhpdC50eXBlID09PSAnZWRnZTpib3R0b20nICYmIHRoaXMuaGVpZ2h0ID09PSAxKSB0aWxlIC09IDB4MjA7XG4gICAgICAgIHNyY0xvYy5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbiwgdGlsZSwgZGVzdCwgZW50cmFuY2V9KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHNyY0xvYy53aWR0aCA9IHRoaXMuX3dpZHRoO1xuICAgIHNyY0xvYy5oZWlnaHQgPSB0aGlzLl9oZWlnaHQ7XG4gICAgc3JjTG9jLnNjcmVlbnMgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX2hlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3c6IG51bWJlcltdID0gW107XG4gICAgICBzcmNMb2Muc2NyZWVucy5wdXNoKHJvdyk7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX3dpZHRoOyB4KyspIHtcbiAgICAgICAgcm93LnB1c2godGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XS5zaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBzcmNMb2MudGlsZXNldCA9IHRoaXMudGlsZXNldC50aWxlc2V0SWQ7XG4gICAgc3JjTG9jLnRpbGVFZmZlY3RzID0gdGhpcy50aWxlc2V0LmVmZmVjdHMoKS5pZDtcblxuICAgIC8vIGZpbmQgcmVhY2hhYmxlIHBvcyBmcm9tIGFueSBleGl0XG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBpZiAoc2VhbWxlc3NQb3MuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgY29uc3QgYmVsb3cgPSBwb3MgKyAxNjtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gcG9zICsgMTtcbiAgICAgIGlmICghc2VhbWxlc3NQb3MuaGFzKGJlbG93KSAmJiAoc2NyLmRhdGEuZWRnZXM/LlsyXSA/PyAnICcpICE9PSAnICcpIHtcbiAgICAgICAgdWYudW5pb24oW3BvcywgYmVsb3ddKTtcbiAgICAgIH1cbiAgICAgIGlmICghc2VhbWxlc3NQb3MuaGFzKHJpZ2h0KSAmJiAoc2NyLmRhdGEuZWRnZXM/LlszXSA/PyAnICcpICE9PSAnICcpIHtcbiAgICAgICAgdWYudW5pb24oW3BvcywgcmlnaHRdKTtcbiAgICAgIH1cbiAgICAgIHVmLnVuaW9uKFtwb3NdKTtcbiAgICB9XG4gICAgY29uc3QgcmVhY2hhYmxlTWFwID0gdWYubWFwKCk7XG4gICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBbc3JjUG9zXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgcmVhY2hhYmxlTWFwLmdldChzcmNQb3MpID8/IFtdKSB7XG4gICAgICAgIHJlYWNoYWJsZS5hZGQocG9zKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSBmbGFnc1xuICAgIHNyY0xvYy5mbGFncyA9IFtdO1xuICAgIGNvbnN0IGZyZWVGbGFncyA9IFsuLi50aGlzLmZyZWVGbGFnc107XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1tzY3JlZW5dO1xuICAgICAgbGV0IGZsYWc6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgICBpZiAoc2NyLmRhdGEud2FsbCAhPSBudWxsICYmIHJlYWNoYWJsZS5oYXMoc2NyZWVuKSkge1xuICAgICAgICAvLyAhc2VhbWxlc3NQYXJ0bmVyKSB7XG4gICAgICAgIGZsYWcgPSBmcmVlRmxhZ3MucG9wKCk/LmlkID8/IHRoaXMucm9tLmZsYWdzLmFsbG9jKDB4MjAwKTtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdhbHdheXMnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2NhbG0nKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5DYWxtZWRBbmdyeVNlYS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206ZmFsc2UnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206dHJ1ZScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMuY3VzdG9tRmxhZ3MuZ2V0KHNjcmVlbik/LmlkID8/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQ7XG4gICAgICB9XG4gICAgICBpZiAoZmxhZyAhPSBudWxsKSB7XG4gICAgICAgIHNyY0xvYy5mbGFncy5wdXNoKExvY2F0aW9uRmxhZy5vZih7c2NyZWVuLCBmbGFnfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdyaXRlIHBpdHNcbiAgICBzcmNMb2MucGl0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2Zyb21TY3JlZW4sIHRvXSBvZiB0aGlzLl9waXRzKSB7XG4gICAgICBjb25zdCB0b1NjcmVlbiA9IHRvICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3QgPSB0byA+Pj4gODtcbiAgICAgIHNyY0xvYy5waXRzLnB1c2goUGl0Lm9mKHtmcm9tU2NyZWVuLCB0b1NjcmVlbiwgZGVzdH0pKTtcbiAgICB9XG4gIH1cblxuICAvLyBOT1RFOiB0aGlzIGNhbiBvbmx5IGJlIGRvbmUgQUZURVIgY29weWluZyB0byB0aGUgbG9jYXRpb24hXG4gIHJlcGxhY2VNb25zdGVycyhyYW5kb206IFJhbmRvbSkge1xuICAgIGlmICh0aGlzLmlkID09PSAweDY4KSByZXR1cm47IC8vIHdhdGVyIGxldmVscywgZG9uJ3QgcGxhY2Ugb24gbGFuZD8/P1xuICAgIC8vIE1vdmUgYWxsIHRoZSBtb25zdGVycyB0byByZWFzb25hYmxlIGxvY2F0aW9ucy5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgY29uc3QgcGxhY2VyID0gbG9jLm1vbnN0ZXJQbGFjZXIocmFuZG9tKTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghc3Bhd24udXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXNwYXduLmlzTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG1vbnN0ZXIgPSBsb2Mucm9tLm9iamVjdHNbc3Bhd24ubW9uc3RlcklkXTtcbiAgICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkgY29udGludWU7XG4gICAgICBjb25zdCBwb3MgPSBwbGFjZXIobW9uc3Rlcik7XG4gICAgICBpZiAocG9zID09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgbm8gdmFsaWQgbG9jYXRpb24gZm9yICR7aGV4KG1vbnN0ZXIuaWQpfSBpbiAke2xvY31gKTtcbiAgICAgICAgc3Bhd24udXNlZCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zID4+PiA4O1xuICAgICAgICBzcGF3bi50aWxlID0gcG9zICYgMHhmZjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRyYXZlcnNlT3B0cyB7XG4gIC8vIERvIG5vdCBwYXNzIGNlcnRhaW4gdGlsZXMgaW4gdHJhdmVyc2VcbiAgcmVhZG9ubHkgd2l0aD86IFJlYWRvbmx5TWFwPFBvcywgTWV0YXNjcmVlbj47XG4gIC8vIFdoZXRoZXIgdG8gYnJlYWsgd2FsbHMvZm9ybSBicmlkZ2VzXG4gIHJlYWRvbmx5IG5vRmxhZ2dlZD86IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdG8gYXNzdW1lIGZsaWdodFxuICByZWFkb25seSBmbGlnaHQ/OiBib29sZWFuO1xufVxuXG5cbmNvbnN0IHVua25vd25FeGl0V2hpdGVsaXN0ID0gbmV3IFNldChbXG4gIDB4MDEwMDNhLCAvLyB0b3AgcGFydCBvZiBjYXZlIG91dHNpZGUgc3RhcnRcbiAgMHgwMTAwM2IsXG4gIDB4MTU0MGEwLCAvLyBcIiBcIiBzZWFtbGVzcyBlcXVpdmFsZW50IFwiIFwiXG4gIDB4MWEzMDYwLCAvLyBzd2FtcCBleGl0XG4gIDB4NDAyMDAwLCAvLyBicmlkZ2UgdG8gZmlzaGVybWFuIGlzbGFuZFxuICAweDQwMjAzMCxcbiAgMHg0MTgwZDAsIC8vIGJlbG93IGV4aXQgdG8gbGltZSB0cmVlIHZhbGxleVxuICAweDYwODdiZiwgLy8gYmVsb3cgYm9hdCBjaGFubmVsXG4gIDB4YTEwMzI2LCAvLyBjcnlwdCAyIGFyZW5hIG5vcnRoIGVkZ2VcbiAgMHhhMTAzMjksXG4gIDB4YTkwNjI2LCAvLyBzdGFpcnMgYWJvdmUga2VsYnkgMlxuICAweGE5MDYyOSxcbl0pO1xuXG4vL2NvbnN0IERQT1MgPSBbLTE2LCAtMSwgMTYsIDFdO1xuY29uc3QgRElSX05BTUUgPSBbJ2Fib3ZlJywgJ2xlZnQgb2YnLCAnYmVsb3cnLCAncmlnaHQgb2YnXTtcblxudHlwZSBPcHRpb25hbDxUPiA9IFR8bnVsbHx1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGRpc3RhbmNlKGE6IFBvcywgYjogUG9zKTogbnVtYmVyIHtcbiAgcmV0dXJuICgoYSA+Pj4gNCkgLSAoYiA+Pj4gNCkpICoqIDIgKyAoKGEgJiAweGYpIC0gKGIgJiAweGYpKSAqKiAyO1xufVxuXG5mdW5jdGlvbiBhZGREZWx0YShzdGFydDogUG9zLCBwbHVzOiBQb3MsIG1pbnVzOiBQb3MsIG1ldGE6IE1ldGFsb2NhdGlvbik6IFBvcyB7XG4gIGNvbnN0IHB4ID0gcGx1cyAmIDB4ZjtcbiAgY29uc3QgcHkgPSBwbHVzID4+PiA0O1xuICBjb25zdCBteCA9IG1pbnVzICYgMHhmO1xuICBjb25zdCBteSA9IG1pbnVzID4+PiA0O1xuICBjb25zdCBzeCA9IHN0YXJ0ICYgMHhmO1xuICBjb25zdCBzeSA9IHN0YXJ0ID4+PiA0O1xuICBjb25zdCBveCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1ldGEud2lkdGggLSAxLCBzeCArIHB4IC0gbXgpKTtcbiAgY29uc3Qgb3kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtZXRhLmhlaWdodCAtIDEsIHN5ICsgcHkgLSBteSkpO1xuICByZXR1cm4gb3kgPDwgNCB8IG94O1xufVxuXG4vLyBiaXQgMSA9IGNydW1ibGluZywgYml0IDAgPSBob3Jpem9udGFsOiBbdiwgaCwgY3YsIGNoXVxuY29uc3QgUExBVEZPUk1TOiByZWFkb25seSBudW1iZXJbXSA9IFsweDdlLCAweDdmLCAweDlmLCAweDhkXTtcbiJdfQ==