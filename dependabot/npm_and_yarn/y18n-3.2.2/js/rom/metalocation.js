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
                    ((exit.entrance >>> 8) - (coord >>> 8)) ** 2 < 0x400) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBSS9GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFaEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBc0NqQixNQUFNLE9BQU8sWUFBWTtJQW1DdkIsWUFBcUIsRUFBVSxFQUFXLE9BQW9CLEVBQ2xELE1BQWMsRUFBRSxLQUFhO1FBRHBCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBN0I5RCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFDbkMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFRLENBQUM7UUFPcEIsU0FBSSxHQUFvQixTQUFTLENBQUM7UUFFbEMsV0FBTSxHQUFHLElBQUksS0FBSyxFQUFpQyxDQUFDO1FBR3BELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBa0JyQyxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFB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QyxRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7Q0FDVCxDQUFDLENBQUM7QUFHSCxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBSTNELFNBQVMsUUFBUSxDQUFDLENBQU0sRUFBRSxDQUFNO0lBQzlCLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxLQUFVLEVBQUUsSUFBUyxFQUFFLEtBQVUsRUFBRSxJQUFrQjtJQUNyRSxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDO0lBQ3RCLE1BQU0sRUFBRSxHQUFHLElBQUksS0FBSyxDQUFDLENBQUM7SUFDdEIsTUFBTSxFQUFFLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUN2QixNQUFNLEVBQUUsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUM7SUFDdkIsTUFBTSxFQUFFLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQztJQUN2QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLENBQUM7QUFHRCxNQUFNLFNBQVMsR0FBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvY2F0aW9uIH0gZnJvbSAnLi9sb2NhdGlvbi5qcyc7IC8vIGltcG9ydCB0eXBlXG5pbXBvcnQgeyBFeGl0LCBGbGFnIGFzIExvY2F0aW9uRmxhZywgUGl0LCB5dERpZmYsIHl0QWRkLCBFbnRyYW5jZSB9IGZyb20gJy4vbG9jYXRpb250YWJsZXMuanMnO1xuaW1wb3J0IHsgRmxhZyB9IGZyb20gJy4vZmxhZ3MuanMnO1xuaW1wb3J0IHsgTWV0YXNjcmVlbiwgVWlkIH0gZnJvbSAnLi9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7IE1ldGF0aWxlc2V0IH0gZnJvbSAnLi9tZXRhdGlsZXNldC5qcyc7XG5pbXBvcnQgeyBoZXggfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHsgUm9tIH0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7IERlZmF1bHRNYXAsIFRhYmxlLCBpdGVycywgZm9ybWF0IH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgQ29ubmVjdGlvblR5cGUgfSBmcm9tICcuL21ldGFzY3JlZW5kYXRhLmpzJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQgeyBNb25zdGVyIH0gZnJvbSAnLi9tb25zdGVyLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxuLy8gTW9kZWwgb2YgYSBsb2NhdGlvbiB3aXRoIG1ldGFzY3JlZW5zLCBldGMuXG5cbi8vIFRyaWNrOiB3ZSBuZWVkIHNvbWV0aGluZyB0byBvd24gdGhlIG5laWdoYm9yIGNhY2hlLlxuLy8gIC0gcHJvYmFibHkgdGhpcyBiZWxvbmdzIGluIHRoZSBNZXRhdGlsZXNldC5cbi8vICAtIG1ldGhvZCB0byByZWdlbmVyYXRlLCBkbyBpdCBhZnRlciB0aGUgc2NyZWVuIG1vZHM/XG4vLyBEYXRhIHdlIHdhbnQgdG8ga2VlcCB0cmFjayBvZjpcbi8vICAtIGdpdmVuIHR3byBzY3JlZW5zIGFuZCBhIGRpcmVjdGlvbiwgY2FuIHRoZXkgYWJ1dD9cbi8vICAtIGdpdmVuIGEgc2NyZWVuIGFuZCBhIGRpcmVjdGlvbiwgd2hhdCBzY3JlZW5zIG9wZW4vY2xvc2UgdGhhdCBlZGdlP1xuLy8gICAgLSB3aGljaCBvbmUgaXMgdGhlIFwiZGVmYXVsdFwiP1xuXG4vLyBUT0RPIC0gY29uc2lkZXIgYWJzdHJhY3RpbmcgZXhpdHMgaGVyZT9cbi8vICAtIGV4aXRzOiBBcnJheTxbRXhpdFNwZWMsIG51bWJlciwgRXhpdFNwZWNdPlxuLy8gIC0gRXhpdFNwZWMgPSB7dHlwZT86IENvbm5lY3Rpb25UeXBlLCBzY3I/OiBudW1iZXJ9XG4vLyBIb3cgdG8gaGFuZGxlIGNvbm5lY3RpbmcgdGhlbSBjb3JyZWN0bHk/XG4vLyAgLSBzaW1wbHkgc2F5aW5nIFwiLT4gd2F0ZXJmYWxsIHZhbGxleSBjYXZlXCIgaXMgbm90IGhlbHBmdWwgc2luY2UgdGhlcmUncyAyXG4vLyAgICBvciBcIi0+IHdpbmQgdmFsbGV5IGNhdmVcIiB3aGVuIHRoZXJlJ3MgNS5cbi8vICAtIHVzZSBzY3JJZCBhcyB1bmlxdWUgaWRlbnRpZmllcj8gIG9ubHkgcHJvYmxlbSBpcyBzZWFsZWQgY2F2ZSBoYXMgMy4uLlxuLy8gIC0gbW92ZSB0byBkaWZmZXJlbnQgc2NyZWVuIGFzIG5lY2Vzc2FyeS4uLlxuLy8gICAgKGNvdWxkIGFsc28ganVzdCBkaXRjaCB0aGUgb3RoZXIgdHdvIGFuZCB0cmVhdCB3aW5kbWlsbCBlbnRyYW5jZSBhc1xuLy8gICAgIGEgZG93biBlbnRyYW5jZSAtIHNhbWUgdy8gbGlnaHRob3VzZT8pXG4vLyAgLSBvbmx5IGEgc21hbGwgaGFuZGZ1bGwgb2YgbG9jYXRpb25zIGhhdmUgZGlzY29ubmVjdGVkIGNvbXBvbmVudHM6XG4vLyAgICAgIHdpbmRtaWxsLCBsaWdodGhvdXNlLCBweXJhbWlkLCBnb2EgYmFja2Rvb3IsIHNhYmVyYSwgc2FicmUvaHlkcmEgbGVkZ2VzXG4vLyAgLSB3ZSByZWFsbHkgZG8gY2FyZSB3aGljaCBpcyBpbiB3aGljaCBjb21wb25lbnQuXG4vLyAgICBidXQgbWFwIGVkaXRzIG1heSBjaGFuZ2UgZXZlbiB0aGUgbnVtYmVyIG9mIGNvbXBvbmVudHM/Pz9cbi8vICAtIGRvIHdlIGRvIGVudHJhbmNlIHNodWZmbGUgZmlyc3Qgb3IgbWFwIHNodWZmbGUgZmlyc3Q/XG4vLyAgICBvciBhcmUgdGhleSBpbnRlcmxlYXZlZD8hP1xuLy8gICAgaWYgd2Ugc2h1ZmZsZSBzYWJyZSBvdmVyd29ybGQgdGhlbiB3ZSBuZWVkIHRvIGtub3cgd2hpY2ggY2F2ZXMgY29ubmVjdFxuLy8gICAgdG8gd2hpY2guLi4gYW5kIHBvc3NpYmx5IGNoYW5nZSB0aGUgY29ubmVjdGlvbnM/XG4vLyAgICAtIG1heSBuZWVkIGxlZXdheSB0byBhZGQvc3VidHJhY3QgY2F2ZSBleGl0cz8/XG4vLyBQcm9ibGVtIGlzIHRoYXQgZWFjaCBleGl0IGlzIGNvLW93bmVkIGJ5IHR3byBtZXRhbG9jYXRpb25zLlxuXG5cbmV4cG9ydCB0eXBlIFBvcyA9IG51bWJlcjtcbmV4cG9ydCB0eXBlIExvY1BvcyA9IG51bWJlcjsgLy8gbG9jYXRpb24gPDwgOCB8IHBvc1xuZXhwb3J0IHR5cGUgRXhpdFNwZWMgPSByZWFkb25seSBbTG9jUG9zLCBDb25uZWN0aW9uVHlwZV07XG5cbmV4cG9ydCBjbGFzcyBNZXRhbG9jYXRpb24ge1xuXG4gIC8vIFRPRE8gLSBzdG9yZSBtZXRhZGF0YSBhYm91dCB3aW5kbWlsbCBmbGFnPyAgdHdvIG1ldGFsb2NzIHdpbGwgbmVlZCBhIHBvcyB0b1xuICAvLyBpbmRpY2F0ZSB3aGVyZSB0aGF0IGZsYWcgc2hvdWxkIGdvLi4uPyAgT3Igc3RvcmUgaXQgaW4gdGhlIG1ldGFzY3JlZW4/XG5cbiAgLy8gQ2F2ZXMgYXJlIGFzc3VtZWQgdG8gYmUgYWx3YXlzIG9wZW4gdW5sZXNzIHRoZXJlJ3MgYSBmbGFnIHNldCBoZXJlLi4uXG4gIGN1c3RvbUZsYWdzID0gbmV3IE1hcDxQb3MsIEZsYWc+KCk7XG4gIGZyZWVGbGFncyA9IG5ldyBTZXQ8RmxhZz4oKTtcblxuICByZWFkb25seSByb206IFJvbTtcblxuICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgcHJpdmF0ZSBfd2lkdGg6IG51bWJlcjtcblxuICBwcml2YXRlIF9wb3M6IFBvc1tdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBwcml2YXRlIF9leGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcbiAgLy9wcml2YXRlIF9lbnRyYW5jZXMgPSBuZXcgRGVmYXVsdE1hcDxDb25uZWN0aW9uVHlwZSwgU2V0PG51bWJlcj4+KCgpID0+IG5ldyBTZXQoKSk7XG4gIHByaXZhdGUgX2VudHJhbmNlMD86IENvbm5lY3Rpb25UeXBlO1xuICBwcml2YXRlIF9waXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTsgLy8gTWFwcyB0byBsb2MgPDwgOCB8IHBvc1xuXG4gIC8vcHJpdmF0ZSBfbW9uc3RlcnNJbnZhbGlkYXRlZCA9IGZhbHNlO1xuXG4gIC8qKiBLZXk6ICh5PDw0KXx4ICovXG4gIHByaXZhdGUgX3NjcmVlbnM6IE1ldGFzY3JlZW5bXTtcblxuICAvLyBOT1RFOiBrZWVwaW5nIHRyYWNrIG9mIHJlYWNoYWJpbGl0eSBpcyBpbXBvcnRhbnQgYmVjYXVzZSB3aGVuIHdlXG4gIC8vIGRvIHRoZSBzdXJ2ZXkgd2UgbmVlZCB0byBvbmx5IGNvdW50IFJFQUNIQUJMRSB0aWxlcyEgIFNlYW1sZXNzXG4gIC8vIHBhaXJzIGFuZCBicmlkZ2VzIGNhbiBjYXVzZSBsb3RzIG9mIGltcG9ydGFudC10by1yZXRhaW4gdW5yZWFjaGFibGVcbiAgLy8gdGlsZXMuICBNb3Jlb3Zlciwgc29tZSBkZWFkLWVuZCB0aWxlcyBjYW4ndCBhY3R1YWxseSBiZSB3YWxrZWQgb24uXG4gIC8vIEZvciBub3cgd2UnbGwganVzdCB6ZXJvIG91dCBmZWF0dXJlIG1ldGFzY3JlZW5zIHRoYXQgYXJlbid0XG4gIC8vIHJlYWNoYWJsZSwgc2luY2UgdHJ5aW5nIHRvIGRvIGl0IGNvcnJlY3RseSByZXF1aXJlcyBzdG9yaW5nXG4gIC8vIHJlYWNoYWJpbGl0eSBhdCB0aGUgdGlsZSBsZXZlbCAoYWdhaW4gZHVlIHRvIGJyaWRnZSBkb3VibGUgc3RhaXJzKS5cbiAgLy8gcHJpdmF0ZSBfcmVhY2hhYmxlOiBVaW50OEFycmF5fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBpZDogbnVtYmVyLCByZWFkb25seSB0aWxlc2V0OiBNZXRhdGlsZXNldCxcbiAgICAgICAgICAgICAgaGVpZ2h0OiBudW1iZXIsIHdpZHRoOiBudW1iZXIpIHtcbiAgICB0aGlzLnJvbSA9IHRpbGVzZXQucm9tO1xuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX3NjcmVlbnMgPSBuZXcgQXJyYXkoaGVpZ2h0IDw8IDQpLmZpbGwodGlsZXNldC5lbXB0eSk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugb3V0IGEgbWV0YWxvY2F0aW9uIGZyb20gdGhlIGdpdmVuIGxvY2F0aW9uLiAgSW5mZXIgdGhlXG4gICAqIHRpbGVzZXQgaWYgcG9zc2libGUsIG90aGVyd2lzZSBpdCBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxuICAgKi9cbiAgc3RhdGljIG9mKGxvY2F0aW9uOiBMb2NhdGlvbiwgdGlsZXNldD86IE1ldGF0aWxlc2V0KTogTWV0YWxvY2F0aW9uIHtcbiAgICBjb25zdCB7cm9tLCB3aWR0aCwgaGVpZ2h0fSA9IGxvY2F0aW9uO1xuICAgIGlmICghdGlsZXNldCkge1xuICAgICAgLy8gSW5mZXIgdGhlIHRpbGVzZXQuICBTdGFydCBieSBhZGRpbmcgYWxsIGNvbXBhdGlibGUgbWV0YXRpbGVzZXRzLlxuICAgICAgY29uc3Qge2ZvcnRyZXNzLCBsYWJ5cmludGh9ID0gcm9tLm1ldGF0aWxlc2V0cztcbiAgICAgIGNvbnN0IHRpbGVzZXRzID0gbmV3IFNldDxNZXRhdGlsZXNldD4oKTtcbiAgICAgIGZvciAoY29uc3QgdHMgb2Ygcm9tLm1ldGF0aWxlc2V0cykge1xuICAgICAgICBpZiAobG9jYXRpb24udGlsZXNldCA9PT0gdHMudGlsZXNldC5pZCkgdGlsZXNldHMuYWRkKHRzKTtcbiAgICAgIH1cbiAgICAgIC8vIEl0J3MgaW1wb3NzaWJsZSB0byBkaXN0aW5ndWlzaCBmb3J0cmVzcyBhbmQgbGFieXJpbnRoLCBzbyB3ZSBoYXJkY29kZVxuICAgICAgLy8gaXQgYmFzZWQgb24gbG9jYXRpb246IG9ubHkgJGE5IGlzIGxhYnlyaW50aC5cbiAgICAgIHRpbGVzZXRzLmRlbGV0ZShsb2NhdGlvbi5pZCA9PT0gMHhhOSA/IGZvcnRyZXNzIDogbGFieXJpbnRoKTtcbiAgICAgIC8vIEZpbHRlciBvdXQgYW55IHRpbGVzZXRzIHRoYXQgZG9uJ3QgaW5jbHVkZSBuZWNlc3Nhcnkgc2NyZWVuIGlkcy5cbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIG5ldyBTZXQoaXRlcnMuY29uY2F0KC4uLmxvY2F0aW9uLnNjcmVlbnMpKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHRpbGVzZXQgb2YgdGlsZXNldHMpIHtcbiAgICAgICAgICBpZiAoIXRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMoc2NyZWVuKS5sZW5ndGgpIHRpbGVzZXRzLmRlbGV0ZSh0aWxlc2V0KTtcbiAgICAgICAgICBpZiAoIXRpbGVzZXRzLnNpemUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdGlsZXNldCBmb3IgJHtoZXgoc2NyZWVuKX0gaW4gJHtsb2NhdGlvbn1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0aWxlc2V0cy5zaXplICE9PSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSB0aWxlc2V0IGZvciAke2xvY2F0aW9ufTogWyR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgQXJyYXkuZnJvbSh0aWxlc2V0cywgdCA9PiB0Lm5hbWUpLmpvaW4oJywgJyl9XWApO1xuICAgICAgfVxuICAgICAgdGlsZXNldCA9IFsuLi50aWxlc2V0c11bMF07XG4gICAgfVxuXG4gICAgLy8gVHJhdmVyc2UgdGhlIGxvY2F0aW9uIGZvciBhbGwgdGlsZXMgcmVhY2hhYmxlIGZyb20gYW4gZW50cmFuY2UuXG4gICAgLy8gVGhpcyBpcyB1c2VkIHRvIGluZm9ybSB3aGljaCBtZXRhc2NyZWVuIHRvIHNlbGVjdCBmb3Igc29tZSBvZiB0aGVcbiAgICAvLyByZWR1bmRhbnQgb25lcyAoaS5lLiBkb3VibGUgZGVhZCBlbmRzKS4gIFRoaXMgaXMgYSBzaW1wbGUgdHJhdmVyc2FsXG4gICAgY29uc3QgcmVhY2hhYmxlID0gbG9jYXRpb24ucmVhY2hhYmxlVGlsZXModHJ1ZSk7IC8vIHRyYXZlcnNlUmVhY2hhYmxlKDB4MDQpO1xuICAgIGNvbnN0IHJlYWNoYWJsZVNjcmVlbnMgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgcmVhY2hhYmxlLmtleXMoKSkge1xuICAgICAgcmVhY2hhYmxlU2NyZWVucy5hZGQodGlsZSA+Pj4gOCk7XG4gICAgICAvL3JlYWNoYWJsZVNjcmVlbnMuYWRkKCh0aWxlICYgMHhmMDAwKSA+Pj4gOCB8ICh0aWxlICYgMHhmMCkgPj4+IDQpO1xuICAgIH1cbiAgICAvLyBOT1RFOiBzb21lIGVudHJhbmNlcyBhcmUgb24gaW1wYXNzYWJsZSB0aWxlcyBidXQgd2Ugc3RpbGwgY2FyZSBhYm91dFxuICAgIC8vIHRoZSBzY3JlZW5zIHVuZGVyIHRoZW0gKGUuZy4gYm9hdCBhbmQgc2hvcCBlbnRyYW5jZXMpLiAgQWxzbyBtYWtlIHN1cmVcbiAgICAvLyB0byBoYW5kbGUgdGhlIHNlYW1sZXNzIHRvd2VyIGV4aXRzLlxuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgbG9jYXRpb24uZW50cmFuY2VzKSB7XG4gICAgICBpZiAoZW50cmFuY2UudXNlZCkgcmVhY2hhYmxlU2NyZWVucy5hZGQoZW50cmFuY2Uuc2NyZWVuKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICByZWFjaGFibGVTY3JlZW5zLmFkZChleGl0LnNjcmVlbik7XG4gICAgICBpZiAoZXhpdC5pc1NlYW1sZXNzKCkpIHtcbiAgICAgICAgLy8gSGFuZGxlIHNlYW1sZXNzIGV4aXRzIG9uIHNjcmVlbiBlZGdlczogbWFyayBfanVzdF8gdGhlIG5laWdoYm9yXG4gICAgICAgIC8vIHNjcmVlbiBhcyByZWFjaGFibGUgKGluY2x1ZGluZyBkZWFkIGNlbnRlciB0aWxlIGZvciBtYXRjaCkuXG4gICAgICAgIGNvbnN0IHkgPSBleGl0LnRpbGUgPj4+IDQ7XG4gICAgICAgIGlmICh5ID09PSAwKSB7XG4gICAgICAgICAgcmVhY2hhYmxlLnNldCgoZXhpdC5zY3JlZW4gLSAxNikgPDwgOCB8IDB4ODgsIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKHkgPT09IDB4ZSkge1xuICAgICAgICAgIC8vIFRPRE8gLSB3aHkgZG9lcyArMTYgbm90IHdvcmsgaGVyZT9cbiAgICAgICAgICByZWFjaGFibGUuc2V0KChleGl0LnNjcmVlbiAvKisgMTYqLykgPDwgOCB8IDB4ODgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vY29uc3QgZXhpdCA9IHRpbGVzZXQuZXhpdDtcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IEFycmF5PE1ldGFzY3JlZW4+KGhlaWdodCA8PCA0KS5maWxsKHRpbGVzZXQuZW1wdHkpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCB0MCA9IHkgPDwgNCB8IHg7XG4gICAgICAgIGNvbnN0IG1ldGFzY3JlZW5zID0gdGlsZXNldC5nZXRNZXRhc2NyZWVucyhsb2NhdGlvbi5zY3JlZW5zW3ldW3hdKTtcbiAgICAgICAgbGV0IG1ldGFzY3JlZW46IE1ldGFzY3JlZW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAobWV0YXNjcmVlbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgbWV0YXNjcmVlbiA9IG1ldGFzY3JlZW5zWzBdO1xuICAgICAgICB9IGVsc2UgaWYgKCFtZXRhc2NyZWVucy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUT09EIC0gZmlsdGVyIGJhc2VkIG9uIHdobyBoYXMgYSBtYXRjaCBmdW5jdGlvbiwgb3IgbWF0Y2hpbmcgZmxhZ3NcbiAgICAgICAgICBjb25zdCBmbGFnID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSAoKHkgPDwgNCkgfCB4KSk7XG4gICAgICAgICAgY29uc3QgbWF0Y2hlcnM6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgICAgICAgIGNvbnN0IGJlc3Q6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtZXRhc2NyZWVucykge1xuICAgICAgICAgICAgaWYgKHMuZGF0YS5tYXRjaCkge1xuICAgICAgICAgICAgICBtYXRjaGVycy5wdXNoKHMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzLmZsYWcgPT09ICdhbHdheXMnICYmIGZsYWc/LmZsYWcgPT09IDB4MmZlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICFzLmZsYWcgJiYgIXMuZGF0YS53YWxsICYmICFmbGFnKSB7XG4gICAgICAgICAgICAgIGJlc3QudW5zaGlmdChzKTsgLy8gZnJvbnQtbG9hZCBtYXRjaGluZyBmbGFnc1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYmVzdC5wdXNoKHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobWF0Y2hlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiByZWFjaChkeTogbnVtYmVyLCBkeDogbnVtYmVyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHgwID0gKHggPDwgOCkgKyBkeDtcbiAgICAgICAgICAgICAgY29uc3QgeTAgPSAoeSA8PCA4KSArIGR5O1xuICAgICAgICAgICAgICBjb25zdCB0ID1cbiAgICAgICAgICAgICAgICAgICh5MCA8PCA0KSAmIDB4ZjAwMCB8IHgwICYgMHhmMDAgfCB5MCAmIDB4ZjAgfCAoeDAgPj4gNCkgJiAweGY7XG4gICAgICAgICAgICAgIHJldHVybiByZWFjaGFibGUuaGFzKHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBtYXRjaGVyIG9mIG1hdGNoZXJzKSB7XG4gICAgICAgICAgICAgIGlmICghbWF0Y2hlci5kYXRhLm1hdGNoIShyZWFjaCwgZmxhZyAhPSBudWxsKSkgY29udGludWU7XG4gICAgICAgICAgICAgIG1ldGFzY3JlZW4gPSBtYXRjaGVyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFtZXRhc2NyZWVuKSBtZXRhc2NyZWVuID0gYmVzdFswXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1ldGFzY3JlZW4pIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZScpO1xuICAgICAgICAvLyBpZiAoKG1ldGFzY3JlZW4uZGF0YS5leGl0cyB8fCBtZXRhc2NyZWVuLmRhdGEud2FsbCkgJiZcbiAgICAgICAgLy8gICAgICFyZWFjaGFibGVTY3JlZW5zLmhhcyh0MCkgJiZcbiAgICAgICAgLy8gICAgIHRpbGVzZXQgIT09IHJvbS5tZXRhdGlsZXNldHMudG93ZXIpIHtcbiAgICAgICAgLy8gICAvLyBNYWtlIHN1cmUgd2UgZG9uJ3Qgc3VydmV5IHVucmVhY2hhYmxlIHNjcmVlbnMgKGFuZCBpdCdzIGhhcmQgdG9cbiAgICAgICAgLy8gICAvLyB0byBmaWd1cmUgb3V0IHdoaWNoIGlzIHdoaWNoIGxhdGVyKS4gIE1ha2Ugc3VyZSBub3QgdG8gZG8gdGhpcyBmb3JcbiAgICAgICAgLy8gICAvLyB0b3dlciBiZWNhdXNlIG90aGVyd2lzZSBpdCdsbCBjbG9iYmVyIGltcG9ydGFudCBwYXJ0cyBvZiB0aGUgbWFwLlxuICAgICAgICAvLyAgIG1ldGFzY3JlZW4gPSB0aWxlc2V0LmVtcHR5O1xuICAgICAgICAvLyB9XG4gICAgICAgIHNjcmVlbnNbdDBdID0gbWV0YXNjcmVlbjtcbiAgICAgICAgLy8gLy8gSWYgd2UncmUgb24gdGhlIGJvcmRlciBhbmQgaXQncyBhbiBlZGdlIGV4aXQgdGhlbiBjaGFuZ2UgdGhlIGJvcmRlclxuICAgICAgICAvLyAvLyBzY3JlZW4gdG8gcmVmbGVjdCBhbiBleGl0LlxuICAgICAgICAvLyBjb25zdCBlZGdlcyA9IG1ldGFzY3JlZW4uZWRnZUV4aXRzKCk7XG4gICAgICAgIC8vIGlmICh5ID09PSAwICYmIChlZGdlcyAmIDEpKSBzY3JlZW5zW3QwIC0gMTZdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHggPT09IDAgJiYgKGVkZ2VzICYgMikpIHNjcmVlbnNbdDAgLSAxXSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh5ID09PSBoZWlnaHQgJiYgKGVkZ2VzICYgNCkpIHNjcmVlbnNbdDAgKyAxNl0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeCA9PT0gd2lkdGggJiYgKGVkZ2VzICYgOCkpIHNjcmVlbnNbdDAgKyAxXSA9IGV4aXQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmlndXJlIG91dCBleGl0c1xuICAgIGNvbnN0IGV4aXRzID0gbmV3IFRhYmxlPFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjPigpO1xuICAgIGxldCBlbnRyYW5jZTA6IENvbm5lY3Rpb25UeXBlfHVuZGVmaW5lZDtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0LmRlc3QgPT09IDB4ZmYpIGNvbnRpbnVlO1xuICAgICAgbGV0IHNyY1BvcyA9IGV4aXQuc2NyZWVuO1xuICAgICAgbGV0IHRpbGUgPSBleGl0LnRpbGU7XG4gICAgICAvLyBLZW5zdSBhcmVuYSBleGl0IGlzIGRlY2xhcmVkIGF0IHk9ZiwgYnV0IHRoZSBleGl0J3MgYWN0dWFsIHNjcmVlblxuICAgICAgLy8gaW4gdGhlIHJvbSB3aWxsIGJlIHN0b3JlZCBhcyB0aGUgc2NyZWVuIGJlbmVhdGguICBTYW1lIHRoaW5nIGdvZXNcbiAgICAgIC8vIGZvciB0aGUgdG93ZXIgZXNjYWxhdG9ycywgYnV0IGluIHRob3NlIGNhc2VzLCB3ZSBhbHJlYWR5IGFkZGVkXG4gICAgICAvLyB0aGUgY29ycmVzcG9uZGluZyBleGl0IG9uIHRoZSBwYWlyZWQgc2NyZWVuLCBzbyB3ZSBkb24ndCBuZWVkIHRvIGZpeC5cbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSAmJiAhKGV4aXQueXQgJiAweGYpICYmXG4gICAgICAgICAgKGxvY2F0aW9uLmlkICYgMHg1OCkgIT09IDB4NTgpIHtcbiAgICAgICAgc3JjUG9zIC09IDE2O1xuICAgICAgICB0aWxlIHw9IDB4ZjA7XG4gICAgICB9XG4gICAgICBpZiAoIXJlYWNoYWJsZVNjcmVlbnMuaGFzKHNyY1BvcykpIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZT8nKTtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHNjcmVlbnNbc3JjUG9zXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZmluZEV4aXRUeXBlKHRpbGUsIGhlaWdodCA9PT0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICEhKGV4aXQuZW50cmFuY2UgJiAweDIwKSk7XG4gICAgICBjb25zdCBzcmNUeXBlID0gc3JjRXhpdD8udHlwZTtcbiAgICAgIGlmICghc3JjVHlwZSkge1xuICAgICAgICBjb25zdCBpZCA9IGxvY2F0aW9uLmlkIDw8IDE2IHwgc3JjUG9zIDw8IDggfCBleGl0LnRpbGU7XG4gICAgICAgIGlmICh1bmtub3duRXhpdFdoaXRlbGlzdC5oYXMoaWQpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgYWxsID0gc3JjU2NyZWVuLmRhdGEuZXhpdHM/Lm1hcChcbiAgICAgICAgICAgIGUgPT4gZS50eXBlICsgJzogJyArIGUuZXhpdHMubWFwKGhleCkuam9pbignLCAnKSkuam9pbignXFxuICAnKTtcbiAgICAgICAgY29uc29sZS53YXJuKGBVbmtub3duIGV4aXQgJHtoZXgoZXhpdC50aWxlKX06ICR7c3JjU2NyZWVuLm5hbWV9IGluICR7XG4gICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb259IEAgJHtoZXgoc3JjUG9zKX06XFxuICAke2FsbH1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoZXhpdHMuaGFzKHNyY1Bvcywgc3JjVHlwZSkpIGNvbnRpbnVlOyAvLyBhbHJlYWR5IGhhbmRsZWRcbiAgICAgIGNvbnN0IGRlc3QgPSByb20ubG9jYXRpb25zW2V4aXQuZGVzdF07XG4gICAgICBpZiAoc3JjVHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgIGNvbnN0IGRvd24gPSBzcmNUeXBlID09PSAnc2VhbWxlc3M6ZG93bic7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgc2VlbXMgd3JvbmcgLSB0aGUgZG93biBleGl0IGlzIEJFTE9XIHRoZSB1cCBleGl0Li4uP1xuICAgICAgICBjb25zdCB0aWxlID0gc3JjRXhpdCEuZXhpdHNbMF0gKyAoZG93biA/IC0xNiA6IDE2KTtcbiAgICAgICAgLy9jb25zdCBkZXN0UG9zID0gc3JjUG9zICsgKHRpbGUgPCAwID8gLTE2IDogdGlsZSA+PSAweGYwID8gMTYgOiAtMCk7XG4gICAgICAgIC8vIE5PVEU6IGJvdHRvbS1lZGdlIHNlYW1sZXNzIGlzIHRyZWF0ZWQgYXMgZGVzdGluYXRpb24gZjBcbiAgICAgICAgY29uc3QgZGVzdFBvcyA9IHNyY1BvcyArICh0aWxlIDwgMCA/IC0xNiA6IDApO1xuICAgICAgICBjb25zdCBkZXN0VHlwZSA9IGRvd24gPyAnc2VhbWxlc3M6dXAnIDogJ3NlYW1sZXNzOmRvd24nO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGAke3NyY1R5cGV9ICR7aGV4KGxvY2F0aW9uLmlkKX0gJHtkb3dufSAke2hleCh0aWxlKX0gJHtoZXgoZGVzdFBvcyl9ICR7ZGVzdFR5cGV9ICR7aGV4KGRlc3QuaWQpfWApO1xuICAgICAgICBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBlbnRyYW5jZSA9IGRlc3QuZW50cmFuY2VzW2V4aXQuZW50cmFuY2UgJiAweDFmXTtcbiAgICAgIGxldCBkZXN0UG9zID0gZW50cmFuY2Uuc2NyZWVuO1xuICAgICAgbGV0IGRlc3RDb29yZCA9IGVudHJhbmNlLmNvb3JkO1xuICAgICAgaWYgKHNyY1R5cGUgPT09ICdkb29yJyAmJiAoZW50cmFuY2UueSAmIDB4ZjApID09PSAwKSB7XG4gICAgICAgIC8vIE5PVEU6IFRoZSBpdGVtIHNob3AgZG9vciBpbiBPYWsgc3RyYWRkbGVzIHR3byBzY3JlZW5zIChleGl0IGlzIG9uXG4gICAgICAgIC8vIHRoZSBOVyBzY3JlZW4gd2hpbGUgZW50cmFuY2UgaXMgb24gU1cgc2NyZWVuKS4gIERvIGEgcXVpY2sgaGFjayB0b1xuICAgICAgICAvLyBkZXRlY3QgdGhpcyAocHJveHlpbmcgXCJkb29yXCIgZm9yIFwidXB3YXJkIGV4aXRcIikgYW5kIGFkanVzdCBzZWFyY2hcbiAgICAgICAgLy8gdGFyZ2V0IGFjY29yZGluZ2x5LlxuICAgICAgICBkZXN0UG9zIC09IDB4MTA7XG4gICAgICAgIGRlc3RDb29yZCArPSAweDEwMDAwO1xuICAgICAgfVxuICAgICAgLy8gRmlndXJlIG91dCB0aGUgY29ubmVjdGlvbiB0eXBlIGZvciB0aGUgZGVzdFRpbGUuXG4gICAgICBjb25zdCBkZXN0U2NySWQgPSBkZXN0LnNjcmVlbnNbZGVzdFBvcyA+PiA0XVtkZXN0UG9zICYgMHhmXTtcbiAgICAgIGNvbnN0IGRlc3RUeXBlID0gZmluZEVudHJhbmNlVHlwZShkZXN0LCBkZXN0U2NySWQsIGRlc3RDb29yZCk7XG4gICAgICAvLyBOT1RFOiBpbml0aWFsIHNwYXduIGhhcyBubyB0eXBlLi4uP1xuICAgICAgaWYgKCFkZXN0VHlwZSkge1xuICAgICAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRlc3RTY3Igb2Ygcm9tLm1ldGFzY3JlZW5zLmdldEJ5SWQoZGVzdFNjcklkLCBkZXN0LnRpbGVzZXQpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBleGl0IG9mIGRlc3RTY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICAgICAgaWYgKGV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgICAgIGxpbmVzLnB1c2goYCAgJHtkZXN0U2NyLm5hbWV9ICR7ZXhpdC50eXBlfTogJHtoZXgoZXhpdC5lbnRyYW5jZSl9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUud2FybihgQmFkIGVudHJhbmNlICR7aGV4KGRlc3RDb29yZCl9OiByYXcgJHtoZXgoZGVzdFNjcklkKVxuICAgICAgICAgICAgICAgICAgICAgIH0gaW4gJHtkZXN0fSBAICR7aGV4KGRlc3RQb3MpfVxcbiR7bGluZXMuam9pbignXFxuJyl9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG5cbiAgICAgIGlmIChsb2NhdGlvbi5lbnRyYW5jZXNbMF0uc2NyZWVuID09PSBzcmNQb3MpIHtcbiAgICAgICAgY29uc3QgY29vcmQgPSBsb2NhdGlvbi5lbnRyYW5jZXNbMF0uY29vcmQ7XG4gICAgICAgIGNvbnN0IGV4aXQgPSBzcmNTY3JlZW4uZmluZEV4aXRCeVR5cGUoc3JjVHlwZSk7XG4gICAgICAgIGlmICgoKGV4aXQuZW50cmFuY2UgJiAweGZmKSAtIChjb29yZCAmIDB4ZmYpKSAqKiAyICtcbiAgICAgICAgICAgICgoZXhpdC5lbnRyYW5jZSA+Pj4gOCkgLSAoY29vcmQgPj4+IDgpKSAqKiAyIDwgMHg0MDApIHtcbiAgICAgICAgICBlbnRyYW5jZTAgPSBzcmNUeXBlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIC8vIEZpbmQgdGhlIGVudHJhbmNlIGluZGV4IGZvciBlYWNoIGV4aXQgYW5kIHN0b3JlIGl0IHNlcGFyYXRlbHkuXG4gICAgICAvLyAvLyBOT1RFOiB3ZSBjb3VsZCBwcm9iYWJseSBkbyB0aGlzIE8obikgd2l0aCBhIHNpbmdsZSBmb3IgbG9vcD9cbiAgICAgIC8vIGxldCBjbG9zZXN0RW50cmFuY2UgPSAtMTtcbiAgICAgIC8vIGxldCBjbG9zZXN0RGlzdCA9IEluZmluaXR5O1xuICAgICAgLy8gZm9yIChsZXQgaSA9IDA7IGkgPCBsb2NhdGlvbi5lbnRyYW5jZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vICAgaWYgKGxvY2F0aW9uLmVudHJhbmNlc1tpXS5zY3JlZW4gIT09IHNyY1BvcykgY29udGludWU7XG4gICAgICAvLyAgIGNvbnN0IHRpbGUgPSBsb2NhdGlvbi5lbnRyYW5jZXNbaV0udGlsZTtcbiAgICAgIC8vICAgZm9yIChjb25zdCBleGl0IG9mIHNyY1NjcmVlbi5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAvLyAgICAgaWYgKGV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgIC8vICAgICBjb25zdCBkaXN0ID0gKChleGl0LmVudHJhbmNlID4+PiA0ICYgMHhmKSAtICh0aWxlICYgMHhmKSkgKiogMiArXG4gICAgICAvLyAgICAgICAoKGV4aXQuZW50cmFuY2UgPj4+IDEyICYgMHhmKSAtICh0aWxlID4+PiA0KSkgKiogMjtcbiAgICAgIC8vICAgICBpZiAoZGlzdCA8IDQgJiYgZGlzdCA8IGNsb3Nlc3REaXN0KSB7XG4gICAgICAvLyAgICAgICBjbG9zZXN0RGlzdCA9IGRpc3Q7XG4gICAgICAvLyAgICAgICBjbG9zZXN0RW50cmFuY2UgPSBpO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfVxuICAgICAgLy8gfVxuICAgICAgLy8gaWYgKGNsb3Nlc3RFbnRyYW5jZSA+PSAwKSBlbnRyYW5jZXMuZ2V0KHNyY1R5cGUpLmFkZChjbG9zZXN0RW50cmFuY2UpO1xuICAgICAgLy8gaWYgKGNsb3Nlc3RFbnRyYW5jZSA9PT0gMClcbiAgICAgIC8vIGlmIChkZXN0VHlwZSkgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgdGhlIHBpdHMgbWFwLlxuICAgIGNvbnN0IHBpdHMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgcGl0IG9mIGxvY2F0aW9uLnBpdHMpIHtcbiAgICAgIHBpdHMuc2V0KHBpdC5mcm9tU2NyZWVuLCBwaXQuZGVzdCA8PCA4IHwgcGl0LnRvU2NyZWVuKTtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhbG9jID0gbmV3IE1ldGFsb2NhdGlvbihsb2NhdGlvbi5pZCwgdGlsZXNldCwgaGVpZ2h0LCB3aWR0aCk7XG4gICAgLy8gZm9yIChsZXQgaSA9IDA7IGkgPCBzY3JlZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gICBtZXRhbG9jLnNldEludGVybmFsKGksIHNjcmVlbnNbaV0pO1xuICAgIC8vIH1cbiAgICBtZXRhbG9jLl9zY3JlZW5zID0gc2NyZWVucztcbiAgICBtZXRhbG9jLl9leGl0cyA9IGV4aXRzO1xuICAgIG1ldGFsb2MuX2VudHJhbmNlMCA9IGVudHJhbmNlMDtcbiAgICBtZXRhbG9jLl9waXRzID0gcGl0cztcblxuICAgIC8vIEZpbGwgaW4gY3VzdG9tIGZsYWdzXG4gICAgZm9yIChjb25zdCBmIG9mIGxvY2F0aW9uLmZsYWdzKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhbG9jLl9zY3JlZW5zW2Yuc2NyZWVuXTtcbiAgICAgIGlmIChzY3IuZmxhZz8uc3RhcnRzV2l0aCgnY3VzdG9tJykpIHtcbiAgICAgICAgbWV0YWxvYy5jdXN0b21GbGFncy5zZXQoZi5zY3JlZW4sIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAgIH0gZWxzZSBpZiAoIXNjci5mbGFnKSB7XG4gICAgICAgIG1ldGFsb2MuZnJlZUZsYWdzLmFkZChyb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGZvciAoY29uc3QgcG9zIG9mIG1ldGFsb2MuYWxsUG9zKCkpIHtcbiAgICAvLyAgIGNvbnN0IHNjciA9IHJvbS5tZXRhc2NyZWVuc1ttZXRhbG9jLl9zY3JlZW5zW3BvcyArIDE2XV07XG4gICAgLy8gICBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b20nKSB7XG4gICAgLy8gICAgIGNvbnN0IGYgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IHBvcyk7XG4gICAgLy8gICAgIGlmIChmKSBtZXRhbG9jLmN1c3RvbUZsYWdzLnNldChwb3MsIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cbiAgICAvLyBUT0RPIC0gc3RvcmUgcmVhY2hhYmlsaXR5IG1hcD9cbiAgICByZXR1cm4gbWV0YWxvYztcblxuICAgIGZ1bmN0aW9uIGZpbmRFbnRyYW5jZVR5cGUoZGVzdDogTG9jYXRpb24sIHNjcklkOiBudW1iZXIsIGNvb3JkOiBudW1iZXIpIHtcbiAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChzY3JJZCwgZGVzdC50aWxlc2V0KSkge1xuICAgICAgICBjb25zdCB0eXBlID0gZGVzdFNjci5maW5kRW50cmFuY2VUeXBlKGNvb3JkLCBkZXN0LmhlaWdodCA9PT0gMSk7XG4gICAgICAgIGlmICh0eXBlICE9IG51bGwpIHJldHVybiB0eXBlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvLyBpc1JlYWNoYWJsZShwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAvLyAgIHRoaXMuY29tcHV0ZVJlYWNoYWJsZSgpO1xuICAvLyAgIHJldHVybiAhISh0aGlzLl9yZWFjaGFibGUhW3BvcyA+Pj4gNF0gJiAoMSA8PCAocG9zICYgNykpKTtcbiAgLy8gfVxuXG4gIC8vIGNvbXB1dGVSZWFjaGFibGUoKSB7XG4gIC8vICAgaWYgKHRoaXMuX3JlYWNoYWJsZSkgcmV0dXJuO1xuICAvLyAgIHRoaXMuX3JlYWNoYWJsZSA9IG5ldyBVaW50OEFycmF5KHRoaXMuaGVpZ2h0KTtcbiAgLy8gICBjb25zdCBtYXAgPSB0aGlzLnRyYXZlcnNlKHtmbGlnaHQ6IHRydWV9KTtcbiAgLy8gICBjb25zdCBzZWVuID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxQb3M+KCk7XG4gIC8vICAgZm9yIChjb25zdCBbcG9zXSBvZiB0aGlzLl9leGl0cykge1xuICAvLyAgICAgY29uc3Qgc2V0ID0gbWFwLmdldChwb3MpXG4gIC8vICAgfVxuICAvLyB9XG5cbiAgZ2V0VWlkKHBvczogUG9zKTogVWlkIHtcbiAgICByZXR1cm4gdGhpcy5fc2NyZWVuc1twb3NdLnVpZDtcbiAgfVxuXG4gIGdldChwb3M6IFBvcyk6IE1ldGFzY3JlZW4ge1xuICAgIHJldHVybiB0aGlzLl9zY3JlZW5zW3Bvc107XG4gIH1cblxuICAvLyBSZWFkb25seSBhY2Nlc3Nvci5cbiAgLy8gZ2V0IHNjcmVlbnMoKTogcmVhZG9ubHkgVWlkW10ge1xuICAvLyAgIHJldHVybiB0aGlzLl9zY3JlZW5zO1xuICAvLyB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoO1xuICB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX2hlaWdodCA+IGhlaWdodCkge1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UoKGhlaWdodCArIDIpIDw8IDQsICh0aGlzLl9oZWlnaHQgLSBoZWlnaHQpIDw8IDQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faGVpZ2h0IDwgaGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmxlbmd0aCA9IChoZWlnaHQgKyAyKSA8PCA0O1xuICAgICAgdGhpcy5fc2NyZWVucy5maWxsKHRoaXMudGlsZXNldC5lbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5oZWlnaHQgKyAyKSA8PCA0LCB0aGlzLl9zY3JlZW5zLmxlbmd0aCk7XG4gICAgfVxuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBUT0RPIC0gcmVzaXplIGZ1bmN0aW9uP1xuXG4gIGFsbFBvcygpOiByZWFkb25seSBQb3NbXSB7XG4gICAgaWYgKHRoaXMuX3BvcykgcmV0dXJuIHRoaXMuX3BvcztcbiAgICBjb25zdCBwOiBudW1iZXJbXSA9IHRoaXMuX3BvcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5faGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fd2lkdGg7IHgrKykge1xuICAgICAgICBwLnB1c2goeSA8PCA0IHwgeCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9XG5cbiAgc2V0KHBvczogUG9zLCBzY3I6IE1ldGFzY3JlZW4gfCBudWxsKSB7XG4gICAgdGhpcy5fc2NyZWVuc1twb3NdID0gc2NyID8/IHRoaXMudGlsZXNldC5lbXB0eTtcbiAgfVxuXG4gIC8vaW52YWxpZGF0ZU1vbnN0ZXJzKCkgeyB0aGlzLl9tb25zdGVyc0ludmFsaWRhdGVkID0gdHJ1ZTsgfVxuXG4gIGluQm91bmRzKHBvczogUG9zKTogYm9vbGVhbiB7XG4gICAgLy8gcmV0dXJuIGluQm91bmRzKHBvcywgdGhpcy5oZWlnaHQsIHRoaXMud2lkdGgpO1xuICAgIHJldHVybiAocG9zICYgMTUpIDwgdGhpcy53aWR0aCAmJiBwb3MgPj0gMCAmJiBwb3MgPj4+IDQgPCB0aGlzLmhlaWdodDtcbiAgfVxuXG4gIC8vIGlzRml4ZWQocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdGhpcy5fZml4ZWQuaGFzKHBvcyk7XG4gIC8vIH1cblxuICAvKipcbiAgICogRm9yY2Utb3ZlcndyaXRlcyB0aGUgZ2l2ZW4gcmFuZ2Ugb2Ygc2NyZWVucy4gIERvZXMgdmFsaWRpdHkgY2hlY2tpbmdcbiAgICogb25seSBhdCB0aGUgZW5kLiAgRG9lcyBub3QgZG8gYW55dGhpbmcgd2l0aCBmZWF0dXJlcywgc2luY2UgdGhleSdyZVxuICAgKiBvbmx5IHNldCBpbiBsYXRlciBwYXNzZXMgKGkuZS4gc2h1ZmZsZSwgd2hpY2ggaXMgbGFzdCkuXG4gICAqL1xuICBzZXQyZChwb3M6IFBvcyxcbiAgICAgICAgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE9wdGlvbmFsPE1ldGFzY3JlZW4+Pj4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiBzY3JlZW5zKSB7XG4gICAgICBsZXQgZHggPSAwO1xuICAgICAgZm9yIChjb25zdCBzY3Igb2Ygcm93KSB7XG4gICAgICAgIGlmIChzY3IpIHRoaXMuc2V0KHBvcyArIGR4LCBzY3IpO1xuICAgICAgICBkeCsrO1xuICAgICAgfVxuICAgICAgcG9zICs9IDE2O1xuICAgIH1cbiAgICAvLyByZXR1cm4gdGhpcy52ZXJpZnkocG9zMCwgc2NyZWVucy5sZW5ndGgsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIE1hdGgubWF4KC4uLnNjcmVlbnMubWFwKHIgPT4gci5sZW5ndGgpKSk7XG4gICAgLy8gVE9ETyAtIHRoaXMgaXMga2luZCBvZiBicm9rZW4uLi4gOi0oXG4gICAgLy8gcmV0dXJuIHRoaXMudmFsaWRhdGUoKTtcbiAgICAvL3JldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqIENoZWNrIGFsbCB0aGUgY3VycmVudGx5IGludmFsaWRhdGVkIGVkZ2VzLCB0aGVuIGNsZWFycyBpdC4gKi9cbiAgdmFsaWRhdGUoKTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBkaXIgb2YgWzAsIDFdKSB7XG4gICAgICBmb3IgKGxldCB5ID0gZGlyID8gMCA6IDE7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICAgIGZvciAobGV0IHggPSBkaXI7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBwb3MwOiBQb3MgPSB5IDw8IDQgfCB4O1xuICAgICAgICAgIGNvbnN0IHNjcjAgPSB0aGlzLl9zY3JlZW5zW3BvczBdO1xuICAgICAgICAgIGNvbnN0IHBvczE6IFBvcyA9IHBvczAgLSAoZGlyID8gMSA6IDE2KTtcbiAgICAgICAgICBjb25zdCBzY3IxID0gdGhpcy5fc2NyZWVuc1twb3MxXTtcbiAgICAgICAgICBpZiAoc2NyMC5pc0VtcHR5KCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChzY3IxLmlzRW1wdHkoKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKCFzY3IwLmNoZWNrTmVpZ2hib3Ioc2NyMSwgZGlyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZvcm1hdCgnYmFkIG5laWdoYm9yICVzICglMDJ4KSAlcyAlcyAoJTAyeCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3IxLm5hbWUsIHBvczEsIERJUl9OQU1FW2Rpcl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcjAubmFtZSwgcG9zMCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHNwbGljZUNvbHVtbnMobGVmdDogbnVtYmVyLCBkZWxldGVkOiBudW1iZXIsIGluc2VydGVkOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE1ldGFzY3JlZW4+Pikge1xuICAgIC8vIEZpcnN0IGFkanVzdCB0aGUgc2NyZWVucy5cbiAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuX3NjcmVlbnMubGVuZ3RoOyBwICs9IDE2KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmNvcHlXaXRoaW4ocCArIGxlZnQgKyBpbnNlcnRlZCwgcCArIGxlZnQgKyBkZWxldGVkLCBwICsgMTApO1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UocCArIGxlZnQsIGluc2VydGVkLCAuLi5zY3JlZW5zW3AgPj4gNF0pO1xuICAgIH1cbiAgICAvLyBVcGRhdGUgZGltZW5zaW9ucyBhbmQgYWNjb3VudGluZ1xuICAgIGNvbnN0IGRlbHRhID0gaW5zZXJ0ZWQgLSBkZWxldGVkO1xuICAgIHRoaXMud2lkdGggKz0gZGVsdGE7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICAgIC8vIE1vdmUgcmVsZXZhbnQgZXhpdHNcbiAgICBjb25zdCBtb3ZlOiBbUG9zLCBDb25uZWN0aW9uVHlwZSwgUG9zLCBDb25uZWN0aW9uVHlwZV1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHggPSBwb3MgJiAweGY7XG4gICAgICBpZiAoeCA8IGxlZnQgKyBkZWxldGVkKSB7XG4gICAgICAgIGlmICh4ID49IGxlZnQpIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG1vdmUucHVzaChbcG9zLCB0eXBlLCBwb3MgKyBkZWx0YSwgdHlwZV0pO1xuICAgIH1cbiAgICB0aGlzLm1vdmVFeGl0cyguLi5tb3ZlKTtcbiAgICAvLyBNb3ZlIGZsYWdzIGFuZCBzcGF3bnMgaW4gcGFyZW50IGxvY2F0aW9uXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGNvbnN0IHh0MCA9IChsZWZ0ICsgZGVsZXRlZCkgPDwgNDtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHBhcmVudC5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi54dCA8IHh0MCkgY29udGludWU7XG4gICAgICBzcGF3bi54dCAtPSAoZGVsdGEgPDwgNCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZmxhZyBvZiBwYXJlbnQuZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnLnhzIDwgbGVmdCArIGRlbGV0ZWQpIHtcbiAgICAgICAgaWYgKGZsYWcueHMgPj0gbGVmdCkgZmxhZy5zY3JlZW4gPSAweGZmO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZsYWcueHMgLT0gZGVsdGE7XG4gICAgfVxuICAgIHBhcmVudC5mbGFncyA9IHBhcmVudC5mbGFncy5maWx0ZXIoZiA9PiBmLnNjcmVlbiAhPT0gMHhmZik7XG5cbiAgICAvLyBUT0RPIC0gbW92ZSBwaXRzPz9cblxuICB9XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyBFeGl0IGhhbmRsaW5nXG5cbiAgc2V0RXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUsIHNwZWM6IEV4aXRTcGVjKSB7XG4gICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5sb2NhdGlvbnNbc3BlY1swXSA+Pj4gOF0ubWV0YTtcbiAgICBpZiAoIW90aGVyKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBzZXQgdHdvLXdheSBleGl0IHdpdGhvdXQgbWV0YWApO1xuICAgIHRoaXMuc2V0RXhpdE9uZVdheShwb3MsIHR5cGUsIHNwZWMpO1xuICAgIG90aGVyLnNldEV4aXRPbmVXYXkoc3BlY1swXSAmIDB4ZmYsIHNwZWNbMV0sIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgfVxuICBzZXRFeGl0T25lV2F5KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSwgc3BlYzogRXhpdFNwZWMpIHtcbiAgICAvLyBjb25zdCBwcmV2ID0gdGhpcy5fZXhpdHMuZ2V0KHBvcywgdHlwZSk7XG4gICAgLy8gaWYgKHByZXYpIHtcbiAgICAvLyAgIGNvbnN0IG90aGVyID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZbMF0gPj4+IDhdLm1ldGE7XG4gICAgLy8gICBpZiAob3RoZXIpIG90aGVyLl9leGl0cy5kZWxldGUocHJldlswXSAmIDB4ZmYsIHByZXZbMV0pO1xuICAgIC8vIH1cbiAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBzcGVjKTtcbiAgfVxuICBkZWxldGVFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSkge1xuICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICB9XG5cbiAgZ2V0RXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUpOiBFeGl0U3BlY3x1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9leGl0cy5nZXQocG9zLCB0eXBlKTtcbiAgfVxuXG4gIGV4aXRzKCk6IEl0ZXJhYmxlPHJlYWRvbmx5IFtQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlY10+IHtcbiAgICByZXR1cm4gdGhpcy5fZXhpdHM7XG4gIH1cblxuICAvLyBUT0RPIC0gY291bnRlZCBjYW5kaWRhdGVzP1xuICBleGl0Q2FuZGlkYXRlcyh0eXBlOiBDb25uZWN0aW9uVHlwZSk6IE1ldGFzY3JlZW5bXSB7XG4gICAgLy8gVE9ETyAtIGZpZ3VyZSBvdXQgYSB3YXkgdG8gdXNlIHRoZSBkb3VibGUtc3RhaXJjYXNlPyAgaXQgd29uJ3RcbiAgICAvLyBoYXBwZW4gY3VycmVudGx5IGJlY2F1c2UgaXQncyBmaXhlZCwgc28gaXQncyBleGNsdWRlZC4uLi4/XG4gICAgY29uc3QgaGFzRXhpdDogTWV0YXNjcmVlbltdID0gW107XG4gICAgZm9yIChjb25zdCBzY3Igb2YgdGhpcy50aWxlc2V0KSB7XG4gICAgICBpZiAoc2NyLmRhdGEuZXhpdHM/LnNvbWUoZSA9PiBlLnR5cGUgPT09IHR5cGUpKSBoYXNFeGl0LnB1c2goc2NyKTtcbiAgICB9XG4gICAgcmV0dXJuIGhhc0V4aXQ7XG4gIH1cblxuICAvLyBUT0RPIC0gc2hvcnQgdnMgZnVsbD9cbiAgc2hvdygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgbGV0IGxpbmUgPSBbXTtcbiAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgbGluZS5wdXNoKHgudG9TdHJpbmcoMTYpKTtcbiAgICB9XG4gICAgbGluZXMucHVzaCgnICAgJyArIGxpbmUuam9pbignICAnKSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCByID0gMDsgciA8IDM7IHIrKykge1xuICAgICAgICBsaW5lID0gW3IgPT09IDEgPyB5LnRvU3RyaW5nKDE2KSA6ICcgJywgJyAnXTtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLl9zY3JlZW5zW3kgPDwgNCB8IHhdO1xuICAgICAgICAgIGxpbmUucHVzaChzY3JlZW4/LmRhdGEuaWNvbj8uZnVsbFtyXSA/PyAociA9PT0gMSA/ICcgPyAnIDogJyAgICcpKTtcbiAgICAgICAgfVxuICAgICAgICBsaW5lcy5wdXNoKGxpbmUuam9pbignJykpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICBzY3JlZW5OYW1lcygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBsZXQgbGluZSA9IFtdO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XTtcbiAgICAgICAgbGluZS5wdXNoKHNjcmVlbj8ubmFtZSk7XG4gICAgICB9XG4gICAgICBsaW5lcy5wdXNoKGxpbmUuam9pbignICcpKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgdHJhdmVyc2Uob3B0czogVHJhdmVyc2VPcHRzID0ge30pOiBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4ge1xuICAgIC8vIFJldHVybnMgYSBtYXAgZnJvbSB1bmlvbmZpbmQgcm9vdCB0byBhIGxpc3Qgb2YgYWxsIHJlYWNoYWJsZSB0aWxlcy5cbiAgICAvLyBBbGwgZWxlbWVudHMgb2Ygc2V0IGFyZSBrZXlzIHBvaW50aW5nIHRvIHRoZSBzYW1lIHZhbHVlIHJlZi5cbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IGNvbm5lY3Rpb25UeXBlID0gKG9wdHMuZmxpZ2h0ID8gMiA6IDApIHwgKG9wdHMubm9GbGFnZ2VkID8gMSA6IDApO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG9wdHMud2l0aD8uZ2V0KHBvcykgPz8gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNjci5jb25uZWN0aW9uc1tjb25uZWN0aW9uVHlwZV0pIHtcbiAgICAgICAgaWYgKCFzZWdtZW50Lmxlbmd0aCkgY29udGludWU7IC8vIGUuZy4gZW1wdHlcbiAgICAgICAgLy8gQ29ubmVjdCB3aXRoaW4gZWFjaCBzZWdtZW50XG4gICAgICAgIHVmLnVuaW9uKHNlZ21lbnQubWFwKGMgPT4gKHBvcyA8PCA4KSArIGMpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KCk7XG4gICAgY29uc3Qgc2V0cyA9IHVmLnNldHMoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHNldCA9IHNldHNbaV07XG4gICAgICBmb3IgKGNvbnN0IGVsZW0gb2Ygc2V0KSB7XG4gICAgICAgIG1hcC5zZXQoZWxlbSwgc2V0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbWFwO1xuICB9ICBcblxuICAvKiogQHBhcmFtIGVkZ2UgQSB2YWx1ZSBmcm9tIGEgdHJhdmVyc2Ugc2V0LiAqL1xuICBleGl0VHlwZShlZGdlOiBudW1iZXIpOiBDb25uZWN0aW9uVHlwZXx1bmRlZmluZWQge1xuICAgIGlmICgoZWRnZSAmIDB4ZjApICE9PSAweGUwKSByZXR1cm47XG4gICAgY29uc3QgcG9zID0gZWRnZSA+Pj4gODtcbiAgICBjb25zdCBzY3IgPSB0aGlzLmdldChwb3MpO1xuICAgIGNvbnN0IHR5cGUgPSBzY3IuZGF0YS5leGl0cz8uW2VkZ2UgJiAweGZdLnR5cGU7XG4gICAgaWYgKCF0eXBlPy5zdGFydHNXaXRoKCdlZGdlOicpKSByZXR1cm4gdHlwZTtcbiAgICAvLyBtYXkgbm90IGFjdHVhbGx5IGJlIGFuIGV4aXQuXG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOnRvcCcgJiYgKHBvcyA+Pj4gNCkpIHJldHVybjtcbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiAocG9zID4+PiA0KSA9PT0gdGhpcy5oZWlnaHQgLSAxKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmxlZnQnICYmIChwb3MgJiAweGYpKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgKHBvcyAmIDB4ZikgPT09IHRoaXMud2lkdGggLSAxKSByZXR1cm47XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGVkZ2UgQSB2YWx1ZSBmcm9tIGEgdHJhdmVyc2Ugc2V0LlxuICAgKiBAcmV0dXJuIEFuIFl5WHggcG9zaXRpb24gZm9yIHRoZSBnaXZlbiBwb2ksIGlmIGl0IGV4aXN0cy5cbiAgICovXG4gIHBvaVRpbGUoZWRnZTogbnVtYmVyKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgfVxuXG4gIC8qKiBTdGF0aWMgaGVscGVyIG1ldGhvZCB0byBjb25uZWN0IHR3byBleGl0IHNwZWNzLiAqL1xuICBzdGF0aWMgY29ubmVjdChyb206IFJvbSwgYTogRXhpdFNwZWMsIGI6IEV4aXRTcGVjKSB7XG4gICAgY29uc3QgbG9jQSA9IHJvbS5sb2NhdGlvbnNbYVswXSA+Pj4gOF0ubWV0YTtcbiAgICBjb25zdCBsb2NCID0gcm9tLmxvY2F0aW9uc1tiWzBdID4+PiA4XS5tZXRhO1xuICAgIGxvY0EuYXR0YWNoKGFbMF0gJiAweGZmLCBsb2NCLCBiWzBdICYgMHhmZiwgYVsxXSwgYlsxXSk7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgdGhlIGFjdHVhbCBmdWxsIHRpbGUgY29vcmRpbmF0ZSAoWVh5eCkgb2YgdGhlXG4gICAqIGdpdmVuIGV4aXQuXG4gICAqL1xuICBzdGF0aWMgZmluZEV4aXRUaWxlcyhyb206IFJvbSwgZXhpdDogRXhpdFNwZWMpIHtcbiAgICBjb25zdCBsb2MgPSByb20ubG9jYXRpb25zW2V4aXRbMF0gPj4+IDhdO1xuICAgIGNvbnN0IHNjciA9IGxvYy5tZXRhLl9zY3JlZW5zW2V4aXRbMF0gJiAweGZmXTtcbiAgICBjb25zdCBjb24gPSBzY3IuZmluZEV4aXRCeVR5cGUoZXhpdFsxXSk7XG4gICAgcmV0dXJuIGNvbi5leGl0cy5tYXAodGlsZSA9PiB0aWxlIHwgKGV4aXRbMF0gJiAweGZmKSA8PCA4KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRhY2ggYW4gZXhpdC9lbnRyYW5jZSBwYWlyIGluIHR3byBkaXJlY3Rpb25zLlxuICAgKiBBbHNvIHJlYXR0YWNoZXMgdGhlIGZvcm1lciBvdGhlciBlbmRzIG9mIGVhY2ggdG8gZWFjaCBvdGhlci5cbiAgICovXG4gIGF0dGFjaChzcmNQb3M6IFBvcywgZGVzdDogTWV0YWxvY2F0aW9uLCBkZXN0UG9zOiBQb3MsXG4gICAgICAgICBzcmNUeXBlPzogQ29ubmVjdGlvblR5cGUsIGRlc3RUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXNyY1R5cGUpIHNyY1R5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbUV4aXRzKHNyY1Bvcyk7XG4gICAgaWYgKCFkZXN0VHlwZSkgZGVzdFR5cGUgPSBkZXN0LnBpY2tUeXBlRnJvbUV4aXRzKGRlc3RQb3MpO1xuXG4gICAgLy8gVE9ETyAtIHdoYXQgaWYgbXVsdGlwbGUgcmV2ZXJzZXM/ICBlLmcuIGNvcmRlbCBlYXN0L3dlc3Q/XG4gICAgLy8gICAgICAtIGNvdWxkIGRldGVybWluZSBpZiB0aGlzIGFuZC9vciBkZXN0IGhhcyBhbnkgc2VhbWxlc3MuXG4gICAgLy8gTm86IGluc3RlYWQsIGRvIGEgcG9zdC1wcm9jZXNzLiAgT25seSBjb3JkZWwgbWF0dGVycywgc28gZ29cbiAgICAvLyB0aHJvdWdoIGFuZCBhdHRhY2ggYW55IHJlZHVuZGFudCBleGl0cy5cblxuICAgIGNvbnN0IGRlc3RUaWxlID0gZGVzdC5pZCA8PCA4IHwgZGVzdFBvcztcbiAgICBjb25zdCBzcmNUaWxlID0gdGhpcy5pZCA8PCA4IHwgc3JjUG9zO1xuICAgIGNvbnN0IHByZXZEZXN0ID0gdGhpcy5fZXhpdHMuZ2V0KHNyY1Bvcywgc3JjVHlwZSk7XG4gICAgY29uc3QgcHJldlNyYyA9IGRlc3QuX2V4aXRzLmdldChkZXN0UG9zLCBkZXN0VHlwZSk7XG4gICAgaWYgKHByZXZEZXN0ICYmIHByZXZTcmMpIHtcbiAgICAgIGNvbnN0IFtwcmV2RGVzdFRpbGUsIHByZXZEZXN0VHlwZV0gPSBwcmV2RGVzdDtcbiAgICAgIGNvbnN0IFtwcmV2U3JjVGlsZSwgcHJldlNyY1R5cGVdID0gcHJldlNyYztcbiAgICAgIGlmIChwcmV2RGVzdFRpbGUgPT09IGRlc3RUaWxlICYmIHByZXZEZXN0VHlwZSA9PT0gZGVzdFR5cGUgJiZcbiAgICAgICAgICBwcmV2U3JjVGlsZSA9PT0gc3JjVGlsZSAmJiBwcmV2U3JjVHlwZSA9PT0gc3JjVHlwZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2V4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdKTtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFBvcywgZGVzdFR5cGUsIFtzcmNUaWxlLCBzcmNUeXBlXSk7XG4gICAgLy8gYWxzbyBob29rIHVwIHByZXZpb3VzIHBhaXJcbiAgICBpZiAocHJldlNyYyAmJiBwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZEZXN0VGlsZSwgcHJldkRlc3RUeXBlXSA9IHByZXZEZXN0O1xuICAgICAgY29uc3QgW3ByZXZTcmNUaWxlLCBwcmV2U3JjVHlwZV0gPSBwcmV2U3JjO1xuICAgICAgY29uc3QgcHJldlNyY01ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlNyY1RpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBjb25zdCBwcmV2RGVzdE1ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldkRlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgcHJldlNyY01ldGEuX2V4aXRzLnNldChwcmV2U3JjVGlsZSAmIDB4ZmYsIHByZXZTcmNUeXBlLCBwcmV2RGVzdCk7XG4gICAgICBwcmV2RGVzdE1ldGEuX2V4aXRzLnNldChwcmV2RGVzdFRpbGUgJiAweGZmLCBwcmV2RGVzdFR5cGUsIHByZXZTcmMpO1xuICAgIH0gZWxzZSBpZiAocHJldlNyYyB8fCBwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZUaWxlLCBwcmV2VHlwZV0gPSAocHJldlNyYyB8fCBwcmV2RGVzdCkhO1xuICAgICAgLy8gTk9URTogaWYgd2UgdXNlZCBhdHRhY2ggdG8gaG9vayB1cCB0aGUgcmV2ZXJzZSBvZiBhIG9uZS13YXkgZXhpdFxuICAgICAgLy8gKGkuZS4gdG93ZXIgZXhpdCBwYXRjaCkgdGhlbiB3ZSBuZWVkIHRvICpub3QqIHJlbW92ZSB0aGUgb3RoZXIgc2lkZS5cbiAgICAgIGlmICgocHJldlRpbGUgIT09IHNyY1RpbGUgfHwgcHJldlR5cGUgIT09IHNyY1R5cGUpICYmXG4gICAgICAgICAgKHByZXZUaWxlICE9PSBkZXN0VGlsZSB8fCBwcmV2VHlwZSAhPT0gZGVzdFR5cGUpKSB7XG4gICAgICAgIGNvbnN0IHByZXZNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgICBwcmV2TWV0YS5fZXhpdHMuZGVsZXRlKHByZXZUaWxlICYgMHhmZiwgcHJldlR5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHBpY2tUeXBlRnJvbUV4aXRzKHBvczogUG9zKTogQ29ubmVjdGlvblR5cGUge1xuICAgIGNvbnN0IHR5cGVzID0gWy4uLnRoaXMuX2V4aXRzLnJvdyhwb3MpLmtleXMoKV07XG4gICAgaWYgKCF0eXBlcy5sZW5ndGgpIHJldHVybiB0aGlzLnBpY2tUeXBlRnJvbVNjcmVlbnMocG9zKTtcbiAgICBpZiAodHlwZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzaW5nbGUgdHlwZSBmb3IgJHtoZXgocG9zKX06IFske3R5cGVzLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZXNbMF07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYW4gZXhpdCBmcm9tIG9uZSBwb3MvdHlwZSB0byBhbm90aGVyLlxuICAgKiBBbHNvIHVwZGF0ZXMgdGhlIG1ldGFsb2NhdGlvbiBvbiB0aGUgb3RoZXIgZW5kIG9mIHRoZSBleGl0LlxuICAgKiBUaGlzIHNob3VsZCB0eXBpY2FsbHkgYmUgZG9uZSBhdG9taWNhbGx5IGlmIHJlYnVpbGRpbmcgYSBtYXAuXG4gICAqL1xuICAvLyBUT0RPIC0gcmVidWlsZGluZyBhIG1hcCBpbnZvbHZlcyBtb3ZpbmcgdG8gYSBORVcgbWV0YWxvY2F0aW9uLi4uXG4gIC8vICAgICAgLSBnaXZlbiB0aGlzLCB3ZSBuZWVkIGEgZGlmZmVyZW50IGFwcHJvYWNoP1xuICBtb3ZlRXhpdHMoLi4ubW92ZXM6IEFycmF5PFtQb3MsIENvbm5lY3Rpb25UeXBlLCBMb2NQb3MsIENvbm5lY3Rpb25UeXBlXT4pIHtcbiAgICBjb25zdCBuZXdFeGl0czogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtvbGRQb3MsIG9sZFR5cGUsIG5ld1BvcywgbmV3VHlwZV0gb2YgbW92ZXMpIHtcbiAgICAgIGNvbnN0IGRlc3RFeGl0ID0gdGhpcy5fZXhpdHMuZ2V0KG9sZFBvcywgb2xkVHlwZSkhO1xuICAgICAgY29uc3QgW2Rlc3RUaWxlLCBkZXN0VHlwZV0gPSBkZXN0RXhpdDtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICBbdGhpcy5pZCA8PCA4IHwgbmV3UG9zLCBuZXdUeXBlXSk7XG4gICAgICBuZXdFeGl0cy5wdXNoKFtuZXdQb3MsIG5ld1R5cGUsIGRlc3RFeGl0XSk7XG4gICAgICB0aGlzLl9leGl0cy5kZWxldGUob2xkUG9zLCBvbGRUeXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBleGl0XSBvZiBuZXdFeGl0cykge1xuICAgICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgZXhpdCk7XG4gICAgfVxuICB9XG5cbiAgbW92ZUV4aXQocHJldjogUG9zLCBuZXh0OiBQb3MsXG4gICAgICAgICAgIHByZXZUeXBlPzogQ29ubmVjdGlvblR5cGUsIG5leHRUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXByZXZUeXBlKSBwcmV2VHlwZSA9IHRoaXMucGlja1R5cGVGcm9tRXhpdHMocHJldik7XG4gICAgaWYgKCFuZXh0VHlwZSkgbmV4dFR5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbVNjcmVlbnMobmV4dCk7XG4gICAgY29uc3QgZGVzdEV4aXQgPSB0aGlzLl9leGl0cy5nZXQocHJldiwgcHJldlR5cGUpITtcbiAgICBjb25zdCBbZGVzdFRpbGUsIGRlc3RUeXBlXSA9IGRlc3RFeGl0O1xuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIFt0aGlzLmlkIDw8IDggfCBuZXh0LCBuZXh0VHlwZV0pO1xuICAgIHRoaXMuX2V4aXRzLnNldChuZXh0LCBuZXh0VHlwZSwgZGVzdEV4aXQpO1xuICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwcmV2LCBwcmV2VHlwZSk7XG4gIH1cblxuICBtb3ZlRXhpdHNBbmRQaXRzVG8ob3RoZXI6IE1ldGFsb2NhdGlvbikge1xuICAgIGNvbnN0IG1vdmVkID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2Ygb3RoZXIuYWxsUG9zKCkpIHtcbiAgICAgIGlmICghb3RoZXIuZ2V0KHBvcykuZGF0YS5kZWxldGUpIHtcbiAgICAgICAgbW92ZWQuYWRkKHBvcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBpZiAoIW1vdmVkLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4+IDhdLm1ldGE7XG4gICAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSwgW290aGVyLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgIG90aGVyLl9leGl0cy5zZXQocG9zLCB0eXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXSk7XG4gICAgICB0aGlzLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbZnJvbSwgdG9dIG9mIHRoaXMuX3BpdHMpIHtcbiAgICAgIGlmICghbW92ZWQuaGFzKGZyb20pKSBjb250aW51ZTtcbiAgICAgIG90aGVyLl9waXRzLnNldChmcm9tLCB0byk7XG4gICAgICB0aGlzLl9waXRzLmRlbGV0ZShmcm9tKTtcbiAgICB9XG4gIH1cblxuICBwaWNrVHlwZUZyb21TY3JlZW5zKHBvczogUG9zKTogQ29ubmVjdGlvblR5cGUge1xuICAgIGNvbnN0IGV4aXRzID0gdGhpcy5fc2NyZWVuc1twb3NdLmRhdGEuZXhpdHM7XG4gICAgY29uc3QgdHlwZXMgPSAoZXhpdHMgPz8gW10pLm1hcChlID0+IGUudHlwZSk7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzaW5nbGUgdHlwZSBmb3IgJHtoZXgocG9zKX06IFske3R5cGVzLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZXNbMF07XG4gIH1cblxuICB0cmFuc2ZlckZsYWdzKG9yaWc6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBDb3B5IG92ZXIgdGhlIGZyZWUgZmxhZ3NcbiAgICB0aGlzLmZyZWVGbGFncyA9IG5ldyBTZXQob3JpZy5mcmVlRmxhZ3MpO1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBjdXN0b20gZmxhZ3MuXG4gICAgY29uc3QgY3VzdG9tcyA9IG5ldyBEZWZhdWx0TWFwPE1ldGFzY3JlZW4sIEZsYWdbXT4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgW3BvcywgZmxhZ10gb2Ygb3JpZy5jdXN0b21GbGFncykge1xuICAgICAgY3VzdG9tcy5nZXQob3JpZy5fc2NyZWVuc1twb3NdKS5wdXNoKGZsYWcpO1xuICAgIH1cbiAgICAvLyBTaHVmZmxlIHRoZW0ganVzdCBpbiBjYXNlIHRoZXkncmUgbm90IGFsbCB0aGUgc2FtZS4uLlxuICAgIC8vIFRPRE8gLSBmb3Igc2VhbWxlc3MgcGFpcnMsIG9ubHkgc2h1ZmZsZSBvbmNlLCB0aGVuIGNvcHkuXG4gICAgZm9yIChjb25zdCBmbGFncyBvZiBjdXN0b21zLnZhbHVlcygpKSByYW5kb20uc2h1ZmZsZShmbGFncyk7XG4gICAgLy8gRmluZCBhbGwgdGhlIGN1c3RvbS1mbGFnIHNjcmVlbnMgaW4gdGhlIG5ldyBsb2NhdGlvbi5cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBpZiAoc2NyLmZsYWc/LnN0YXJ0c1dpdGgoJ2N1c3RvbScpKSB7XG4gICAgICAgIGNvbnN0IGZsYWcgPSBjdXN0b21zLmdldChzY3IpLnBvcCgpO1xuICAgICAgICBpZiAoIWZsYWcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGZsYWcgZm9yICR7c2NyLm5hbWV9IGF0ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19IEAke2hleChwb3MpfWApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3VzdG9tRmxhZ3Muc2V0KHBvcywgZmxhZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvcHkgcGl0IGRlc3RpbmF0aW9ucyBmcm9tIHRoZSBvcmlnaW5hbC4gIE5PVEU6IHRoZXJlIGlzIE5PIHNhZmV0eVxuICAgKiBjaGVjayBoZXJlIGZvciB0aGUgcGl0cyBiZWluZyByZWFzb25hYmxlLiAgVGhhdCBtdXN0IGJlIGRvbmUgZWxzZXdoZXJlLlxuICAgKiBXZSBkb24ndCB3YW50IHBpdCBzYWZldHkgdG8gYmUgY29udGluZ2VudCBvbiBzdWNjZXNzZnVsIHNodWZmbGluZyBvZlxuICAgKiB0aGUgdXBzdGFpcnMgbWFwLlxuICAgKi9cbiAgdHJhbnNmZXJQaXRzKG9yaWc6IE1ldGFsb2NhdGlvbikge1xuICAgIHRoaXMuX3BpdHMgPSBvcmlnLl9waXRzO1xuICB9XG5cbiAgLyoqIEVuc3VyZSBhbGwgcGl0cyBnbyB0byB2YWxpZCBsb2NhdGlvbnMuICovXG4gIHNodWZmbGVQaXRzKHJhbmRvbTogUmFuZG9tKSB7XG4gICAgaWYgKCF0aGlzLl9waXRzLnNpemUpIHJldHVybjtcbiAgICAvLyBGaW5kIGFsbCBwaXQgZGVzdGluYXRpb25zLlxuICAgIGNvbnN0IGRlc3RzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBbLCBkZXN0XSBvZiB0aGlzLl9waXRzKSB7XG4gICAgICBkZXN0cy5hZGQodGhpcy5yb20ubG9jYXRpb25zW2Rlc3QgPj4+IDhdLmlkKTtcbiAgICB9XG4gICAgdGhpcy5fcGl0cy5jbGVhcigpO1xuXG4gICAgLy8gTG9vayBmb3IgZXhpc3RpbmcgcGl0cy4gIFNvcnQgYnkgbG9jYXRpb24sIFtwaXQgcG9zLCBkZXN0IHBvc11cbiAgICBjb25zdCBwaXRzID0gbmV3IERlZmF1bHRNYXA8TWV0YWxvY2F0aW9uLCBBcnJheTxbUG9zLCBQb3NdPj4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuZ2V0KHBvcyk7XG4gICAgICBpZiAoIXNjci5oYXNGZWF0dXJlKCdwaXQnKSkgY29udGludWU7XG4gICAgICAvLyBGaW5kIHRoZSBuZWFyZXN0IGV4aXQgdG8gb25lIG9mIHRob3NlIGRlc3RpbmF0aW9uczogW2RlbHRhLCBsb2MsIGRpc3RdXG4gICAgICBsZXQgY2xvc2VzdDogW1BvcywgTWV0YWxvY2F0aW9uLCBudW1iZXJdID0gWy0xLCB0aGlzLCBJbmZpbml0eV07XG4gICAgICBmb3IgKGNvbnN0IFtleGl0UG9zLCwgW2Rlc3RdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgICBjb25zdCBkaXN0ID0gZGlzdGFuY2UocG9zLCBleGl0UG9zKTtcbiAgICAgICAgaWYgKGRlc3RzLmhhcyhkZXN0ID4+PiA4KSAmJiBkaXN0IDwgY2xvc2VzdFsyXSkge1xuICAgICAgICAgIGNvbnN0IGRsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdCA+Pj4gOF0ubWV0YTtcbiAgICAgICAgICBjb25zdCBkcG9zID0gZGVzdCAmIDB4ZmY7XG4gICAgICAgICAgY2xvc2VzdCA9IFthZGREZWx0YShwb3MsIGRwb3MsIGV4aXRQb3MsIGRsb2MpLCBkbG9jLCBkaXN0XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNsb3Nlc3RbMF0gPj0gMCkgcGl0cy5nZXQoY2xvc2VzdFsxXSkucHVzaChbcG9zLCBjbG9zZXN0WzBdXSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZGVzdCBvZiBkZXN0cykge1xuICAgICAgY29uc3QgbGlzdCA9IHBpdHMuZ2V0KHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0XS5tZXRhKTtcbiAgICAgIC8vIElmIHRoZXJlJ3MgZXZlciBub3QgYSBkaXJlY3QgZXhpdCB0byBhbnkgZGVzdGluYXRpb24sIGp1c3QgcHVzaFxuICAgICAgLy8gYSBsYXJnZSBkZWx0YSB0b3dhcmQgdGhlIGJvdHRvbSBvZiB0aGUgbWFwLlxuICAgICAgaWYgKCFsaXN0Lmxlbmd0aCkgbGlzdC5wdXNoKFswLCAweGYwXSk7XG4gICAgfVxuXG4gICAgLy8gRm9yIGVhY2ggZGVzdGluYXRpb24gbG9jYXRpb24sIGxvb2sgZm9yIHNwaWtlcywgdGhlc2Ugd2lsbCBvdmVycmlkZVxuICAgIC8vIGFueSBwb3NpdGlvbi1iYXNlZCBkZXN0aW5hdGlvbnMuXG4gICAgZm9yIChjb25zdCBbZGVzdCwgbGlzdF0gb2YgcGl0cykge1xuICAgICAgLy8gdmVydGljYWwsIGhvcml6b250YWxcbiAgICAgIGNvbnN0IGVsaWdpYmxlOiBQb3NbXVtdID0gW1tdLCBbXV07XG4gICAgICBjb25zdCBzcGlrZXMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpO1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgZGVzdC5hbGxQb3MoKSkge1xuICAgICAgICBjb25zdCBzY3IgPSBkZXN0LmdldChwb3MpO1xuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JpdmVyJykgfHwgc2NyLmhhc0ZlYXR1cmUoJ2VtcHR5JykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBlZGdlcyA9XG4gICAgICAgICAgICAoc2NyLmRhdGEuZWRnZXMgfHwgJycpLnNwbGl0KCcnKS5tYXAoeCA9PiB4ID09PSAnICcgPyAnJyA6IHgpO1xuICAgICAgICBpZiAoZWRnZXNbMF0gJiYgZWRnZXNbMl0pIGVsaWdpYmxlWzBdLnB1c2gocG9zKTtcbiAgICAgICAgLy8gTk9URTogd2UgY2xhbXAgdGhlIHRhcmdldCBYIGNvb3JkcyBzbyB0aGF0IHNwaWtlIHNjcmVlbnMgYXJlIGFsbCBnb29kXG4gICAgICAgIC8vIHRoaXMgcHJldmVudHMgZXJyb3JzIGZyb20gbm90IGhhdmluZyBhIHZpYWJsZSBkZXN0aW5hdGlvbiBzY3JlZW4uXG4gICAgICAgIGlmICgoZWRnZXNbMV0gJiYgZWRnZXNbM10pIHx8IHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkge1xuICAgICAgICAgIGVsaWdpYmxlWzFdLnB1c2gocG9zKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSB7XG4gICAgICAgICAgc3Bpa2VzLnNldChwb3MsIFsuLi5lZGdlc10uZmlsdGVyKGMgPT4gYyA9PT0gJ3MnKS5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICB9XG4vL2NvbnNvbGUubG9nKGBkZXN0OlxcbiR7ZGVzdC5zaG93KCl9XFxuZWxpZ2libGU6ICR7ZWxpZ2libGUubWFwKGUgPT4gZS5tYXAoaCA9PiBoLnRvU3RyaW5nKDE2KSkuam9pbignLCcpKS5qb2luKCcgICcpfWApO1xuICAgICAgLy8gZmluZCB0aGUgY2xvc2VzdCBkZXN0aW5hdGlvbiBmb3IgdGhlIGZpcnN0IHBpdCwga2VlcCBhIHJ1bm5pbmcgZGVsdGEuXG4gICAgICBsZXQgZGVsdGE6IFtQb3MsIFBvc10gPSBbMCwgMF07XG4gICAgICBmb3IgKGNvbnN0IFt1cHN0YWlycywgZG93bnN0YWlyc10gb2YgbGlzdCkge1xuICAgICAgICBjb25zdCBzY3IgPSB0aGlzLmdldCh1cHN0YWlycyk7XG4gICAgICAgIGNvbnN0IGVkZ2VzID0gc2NyLmRhdGEuZWRnZXMgfHwgJyc7XG4gICAgICAgIGNvbnN0IGRpciA9IGVkZ2VzWzFdID09PSAnYycgJiYgZWRnZXNbM10gPT09ICdjJyA/IDEgOiAwO1xuICAgICAgICAvLyBlbGlnaWJsZSBkZXN0IHRpbGUsIGRpc3RhbmNlXG4gICAgICAgIGxldCBjbG9zZXN0OiBbUG9zLCBudW1iZXIsIG51bWJlcl0gPSBbLTEsIEluZmluaXR5LCAwXTtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gYWRkRGVsdGEoZG93bnN0YWlycywgZGVsdGFbMF0sIGRlbHRhWzFdLCBkZXN0KTtcbiAgICAgICAgZm9yIChjb25zdCBwb3Mgb2YgZWxpZ2libGVbZGlyXSkgeyAvL2ZvciAobGV0IGkgPSAwOyBpIDwgZWxpZ2libGVbZGlyXS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIC8vICAgICAgICAgIGNvbnN0IHBvcyA9IGVsaWdpYmxlW2Rpcl1baV07XG4gICAgICAgICAgY29uc3Qgc3Bpa2VDb3VudCA9IHNwaWtlcy5nZXQocG9zKSA/PyAwO1xuICAgICAgICAgIGlmIChzcGlrZUNvdW50IDwgY2xvc2VzdFsyXSkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgZGlzdCA9IGRpc3RhbmNlKHRhcmdldCwgcG9zKTtcbiAgICAgICAgICBpZiAoZGlzdCA8IGNsb3Nlc3RbMV0pIHtcbiAgICAgICAgICAgIGNsb3Nlc3QgPSBbcG9zLCBkaXN0LCBzcGlrZUNvdW50XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW5kUG9zID0gY2xvc2VzdFswXTtcbiAgICAgICAgaWYgKGVuZFBvcyA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gZWxpZ2libGUgZGVzdGApO1xuICAgICAgICBkZWx0YSA9IFtlbmRQb3MsIHRhcmdldF07XG4gICAgICAgIHRoaXMuX3BpdHMuc2V0KHVwc3RhaXJzLCBkZXN0LmlkIDw8IDggfCBlbmRQb3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlcyBvd25lcnNoaXAgb2YgZXhpdHMgZnJvbSBhbm90aGVyIG1ldGFsb2NhdGlvbiB3aXRoIHRoZSBzYW1lIElELlxuICAgKiBAcGFyYW0ge2ZpeGVkfSBtYXBzIGRlc3RpbmF0aW9uIGxvY2F0aW9uIElEIHRvIHBvcyB3aGVyZSB0aGUgZXhpdCBpcy5cbiAgICovXG4gIHRyYW5zZmVyRXhpdHMob3JpZzogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIERldGVybWluZSBhbGwgdGhlIGVsaWdpYmxlIGV4aXQgc2NyZWVucy5cbiAgICBjb25zdCBleGl0cyA9IG5ldyBEZWZhdWx0TWFwPENvbm5lY3Rpb25UeXBlLCBQb3NbXT4oKCkgPT4gW10pO1xuICAgIGNvbnN0IHNlbGZFeGl0cyA9IG5ldyBEZWZhdWx0TWFwPENvbm5lY3Rpb25UeXBlLCBTZXQ8UG9zPj4oKCkgPT4gbmV3IFNldCgpKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IHt0eXBlfSBvZiBzY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6dG9wJyAmJiAocG9zID4+PiA0KSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0JyAmJiAocG9zICYgMHhmKSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgPj4+IDQpIDwgdGhpcy5oZWlnaHQgLSAxKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnJpZ2h0JyAmJiAocG9zICYgMHhmKSA8IHRoaXMud2lkdGggLSAxKSBjb250aW51ZTtcbiAgICAgICAgZXhpdHMuZ2V0KHR5cGUpLnB1c2gocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBhcnIgb2YgZXhpdHMudmFsdWVzKCkpIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKGFycik7XG4gICAgfVxuICAgIC8vIEZpbmQgYSBtYXRjaCBmb3IgZWFjaCBvcmlnaW5hbCBleGl0LlxuICAgIGZvciAoY29uc3QgW29wb3MsIHR5cGUsIGV4aXRdIG9mIG9yaWcuX2V4aXRzKSB7XG4gICAgICBpZiAoc2VsZkV4aXRzLmdldCh0eXBlKS5oYXMob3BvcykpIGNvbnRpbnVlO1xuICAgICAgLy8gb3BvcyxleGl0IGZyb20gb3JpZ2luYWwgdmVyc2lvbiBvZiB0aGlzIG1ldGFsb2NhdGlvblxuICAgICAgY29uc3QgcG9zID0gZXhpdHMuZ2V0KHR5cGUpLnBvcCgpOyAvLyBhIFBvcyBpbiB0aGlzIG1ldGFsb2NhdGlvblxuICAgICAgaWYgKHBvcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHRyYW5zZmVyIGV4aXQgJHt0eXBlfSBpbiAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX06IG5vIGVsaWdpYmxlIHNjcmVlblxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICAvLyBMb29rIGZvciBhIHJldmVyc2UgZXhpdDogZXhpdCBpcyB0aGUgc3BlYyBmcm9tIG9sZCBtZXRhLlxuICAgICAgLy8gRmluZCB0aGUgbWV0YWxvY2F0aW9uIGl0IHJlZmVycyB0byBhbmQgc2VlIGlmIHRoZSBleGl0XG4gICAgICAvLyBnb2VzIGJhY2sgdG8gdGhlIG9yaWdpbmFsIHBvc2l0aW9uLlxuICAgICAgY29uc3QgZWxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tleGl0WzBdID4+PiA4XS5tZXRhO1xuICAgICAgY29uc3QgZXBvcyA9IGV4aXRbMF0gJiAweGZmO1xuICAgICAgY29uc3QgZXR5cGUgPSBleGl0WzFdO1xuICAgICAgaWYgKGVsb2MgPT09IG9yaWcpIHtcbiAgICAgICAgLy8gU3BlY2lhbCBjYXNlIG9mIGEgc2VsZi1leGl0IChoYXBwZW5zIGluIGh5ZHJhIGFuZCBweXJhbWlkKS5cbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlLCBqdXN0IHBpY2sgYW4gZXhpdCBvZiB0aGUgY29ycmVjdCB0eXBlLlxuICAgICAgICBjb25zdCBucG9zID0gZXhpdHMuZ2V0KGV0eXBlKS5wb3AoKTtcbiAgICAgICAgaWYgKG5wb3MgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlYCk7XG4gICAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIFt0aGlzLmlkIDw8IDggfCBucG9zLCBldHlwZV0pO1xuICAgICAgICB0aGlzLl9leGl0cy5zZXQobnBvcywgZXR5cGUsIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgICAgLy8gQWxzbyBkb24ndCB2aXNpdCB0aGUgb3RoZXIgZXhpdCBsYXRlci5cbiAgICAgICAgc2VsZkV4aXRzLmdldChldHlwZSkuYWRkKGVwb3MpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJldCA9IGVsb2MuX2V4aXRzLmdldChlcG9zLCBldHlwZSkhO1xuICAgICAgaWYgKCFyZXQpIHtcbiAgICAgICAgY29uc3QgZWVsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdFswXSA+Pj4gOF07XG4gICAgICAgIGNvbnNvbGUubG9nKGVsb2MpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGV4aXQgZm9yICR7ZWVsb2N9IGF0ICR7aGV4KGVwb3MpfSAke2V0eXBlfVxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZWxvYy5zaG93KCl9XFxuJHt0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19IGF0ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaGV4KG9wb3MpfSAke3R5cGV9XFxuJHt0aGlzLnNob3coKX1gKTtcbiAgICAgIH1cbiAgICAgIGlmICgocmV0WzBdID4+PiA4KSA9PT0gdGhpcy5pZCAmJiAoKHJldFswXSAmIDB4ZmYpID09PSBvcG9zKSAmJlxuICAgICAgICAgIHJldFsxXSA9PT0gdHlwZSkge1xuICAgICAgICBlbG9jLl9leGl0cy5zZXQoZXBvcywgZXR5cGUsIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBOUENzLCB0cmlnZ2VycywgYW5kIGNoZXN0cyBiYXNlZCBvbiBwcm94aW1pdHkgdG8gc2NyZWVucyxcbiAgICogZXhpdHMsIGFuZCBQT0kuXG4gICAqL1xuICB0cmFuc2ZlclNwYXducyh0aGF0OiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gU3RhcnQgYnkgYnVpbGRpbmcgYSBtYXAgYmV0d2VlbiBleGl0cyBhbmQgc3BlY2lmaWMgc2NyZWVuIHR5cGVzLlxuICAgIGNvbnN0IHJldmVyc2VFeGl0cyA9IG5ldyBNYXA8RXhpdFNwZWMsIFtudW1iZXIsIG51bWJlcl0+KCk7IC8vIG1hcCB0byB5LHhcbiAgICBjb25zdCBwaXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTsgLy8gbWFwcyB0byBkaXIgKDAgPSB2ZXJ0LCAxID0gaG9yaXopXG4gICAgY29uc3Qgc3RhdHVlczogQXJyYXk8W1BvcywgbnVtYmVyXT4gPSBbXTsgLy8gYXJyYXkgb2Ygc3Bhd24gW3NjcmVlbiwgY29vcmRdXG4gICAgLy8gQXJyYXkgb2YgW29sZCB5LCBvbGQgeCwgbmV3IHksIG5ldyB4LCBtYXggZGlzdGFuY2UgKHNxdWFyZWQpXVxuICAgIGNvbnN0IG1hcDogQXJyYXk8W251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCB3YWxsczogQXJyYXk8W251bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCBicmlkZ2VzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIC8vIFBhaXIgdXAgYXJlbmFzLlxuICAgIGNvbnN0IGFyZW5hczogQXJyYXk8W251bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIGxvYy5hbGxQb3MoKSkge1xuICAgICAgICBjb25zdCBzY3IgPSBsb2MuX3NjcmVlbnNbcG9zXTtcbiAgICAgICAgY29uc3QgeSA9IHBvcyAmIDB4ZjA7XG4gICAgICAgIGNvbnN0IHggPSAocG9zICYgMHhmKSA8PCA0O1xuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3BpdCcpICYmIGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIHBpdHMuc2V0KHBvcywgc2NyLmVkZ2VJbmRleCgnYycpID09PSA1ID8gMCA6IDEpO1xuICAgICAgICB9IGVsc2UgaWYgKHNjci5kYXRhLnN0YXR1ZXM/Lmxlbmd0aCAmJiBsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjci5kYXRhLnN0YXR1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHNjci5kYXRhLnN0YXR1ZXNbaV0gPDwgMTI7XG4gICAgICAgICAgICBjb25zdCBwYXJpdHkgPSAoKHBvcyAmIDB4ZikgXiAocG9zID4+PiA0KSBeIGkpICYgMTtcbiAgICAgICAgICAgIGNvbnN0IGNvbCA9IHBhcml0eSA/IDB4NTAgOiAweGEwO1xuICAgICAgICAgICAgc3RhdHVlcy5wdXNoKFtwb3MsIHJvdyB8IGNvbF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobG9jID09PSB0aGlzICYmIHNjci5oYXNGZWF0dXJlKCd3YWxsJykpIHtcbiAgICAgICAgICBpZiAoc2NyLmRhdGEud2FsbCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgd2FsbCBwcm9wYCk7XG4gICAgICAgICAgY29uc3Qgd2FsbCA9IFt5IHwgKHNjci5kYXRhLndhbGwgPj4gNCksIHggfCAoc2NyLmRhdGEud2FsbCAmIDB4ZildO1xuICAgICAgICAgIHdhbGxzLnB1c2god2FsbCBhcyBbbnVtYmVyLCBudW1iZXJdKTtcbiAgICAgICAgICAvLyBTcGVjaWFsLWNhc2UgdGhlIFwiZG91YmxlIGJyaWRnZVwiIGluIGxpbWUgdHJlZSBsYWtlXG4gICAgICAgICAgaWYgKHNjci5kYXRhLnRpbGVzZXRzLmxpbWUpIHdhbGxzLnB1c2goW3dhbGxbMF0gLSAxLCB3YWxsWzFdXSk7XG4gICAgICAgIH0gZWxzZSBpZiAobG9jID09PSB0aGlzICYmIHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge1xuICAgICAgICAgIGlmIChzY3IuZGF0YS53YWxsID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB3YWxsIHByb3BgKTtcbiAgICAgICAgICBicmlkZ2VzLnB1c2goW3kgfCAoc2NyLmRhdGEud2FsbCA+PiA0KSwgeCB8IChzY3IuZGF0YS53YWxsICYgMHhmKV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2NyLmhhc0ZlYXR1cmUoJ2FyZW5hJykpIGNvbnRpbnVlO1xuICAgICAgICBpZiAobG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgYXJlbmFzLnB1c2goW3kgfCA4LCB4IHwgOF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IFtueSwgbnhdID0gYXJlbmFzLnBvcCgpITtcbiAgICAgICAgICBtYXAucHVzaChbeSB8IDgsIHggfCA4LCBueSwgbngsIDE0NF0pOyAvLyAxMiB0aWxlc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobG9jID09PSB0aGlzKSB7IC8vIFRPRE8gLSB0aGlzIGlzIGEgbWVzcywgZmFjdG9yIG91dCB0aGUgY29tbW9uYWxpdHlcbiAgICAgICAgcmFuZG9tLnNodWZmbGUoYXJlbmFzKTtcbiAgICAgICAgcmFuZG9tLnNodWZmbGUoc3RhdHVlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE5vdyBwYWlyIHVwIGV4aXRzLlxuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBleGl0XSBvZiBsb2MuX2V4aXRzKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGxvYy5fc2NyZWVuc1twb3NdO1xuICAgICAgICBjb25zdCBzcGVjID0gc2NyLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IHR5cGUpO1xuICAgICAgICBpZiAoIXNwZWMpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBleGl0OiAke3Njci5uYW1lfSAke3R5cGV9YCk7XG4gICAgICAgIGNvbnN0IHgwID0gcG9zICYgMHhmO1xuICAgICAgICBjb25zdCB5MCA9IHBvcyA+Pj4gNDtcbiAgICAgICAgY29uc3QgeDEgPSBzcGVjLmV4aXRzWzBdICYgMHhmO1xuICAgICAgICBjb25zdCB5MSA9IHNwZWMuZXhpdHNbMF0gPj4+IDQ7XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICByZXZlcnNlRXhpdHMuc2V0KGV4aXQsIFt5MCA8PCA0IHwgeTEsIHgwIDw8IDQgfCB4MV0pO1xuICAgICAgICB9IGVsc2UgaWYgKChleGl0WzBdID4+PiA4KSAhPT0gdGhpcy5pZCkgeyAvLyBza2lwIHNlbGYtZXhpdHNcbiAgICAgICAgICBjb25zdCBbbnksIG54XSA9IHJldmVyc2VFeGl0cy5nZXQoZXhpdCkhO1xuICAgICAgICAgIG1hcC5wdXNoKFt5MCA8PCA0IHwgeTEsIHgwIDw8IDQgfCB4MSwgbnksIG54LCAyNV0pOyAvLyA1IHRpbGVzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gTWFrZSBhIGxpc3Qgb2YgUE9JIGJ5IHByaW9yaXR5ICgwLi41KS5cblxuXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGZpcnN0IHBhcnRpdGlvbmluZyB0aGUgc2NyZWVucyB3aXRoIGltcGFzc2libGVcbiAgICAvLyB3YWxscyBhbmQgcGxhY2luZyBwb2kgaW50byBhcyBtYW55IHNlcGFyYXRlIHBhcnRpdGlvbnMgKGZyb21cbiAgICAvLyBzdGFpcnMvZW50cmFuY2VzKSBhcyBwb3NzaWJsZSA/Pz8gIE9yIG1heWJlIGp1c3Qgd2VpZ2h0IHRob3NlXG4gICAgLy8gaGlnaGVyPyAgZG9uJ3Qgd2FudCB0byBfZm9yY2VfIHRoaW5ncyB0byBiZSBpbmFjY2Vzc2libGUuLi4/XG5cbiAgICBjb25zdCBwcG9pOiBBcnJheTxBcnJheTxbbnVtYmVyLCBudW1iZXJdPj4gPSBbW10sIFtdLCBbXSwgW10sIFtdLCBbXV07XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgZm9yIChjb25zdCBbcCwgZHkgPSAweDcwLCBkeCA9IDB4NzhdIG9mIHNjci5kYXRhLnBvaSA/PyBbXSkge1xuICAgICAgICBjb25zdCB5ID0gKChwb3MgJiAweGYwKSA8PCA0KSArIGR5O1xuICAgICAgICBjb25zdCB4ID0gKChwb3MgJiAweDBmKSA8PCA4KSArIGR4O1xuICAgICAgICBwcG9pW3BdLnB1c2goW3ksIHhdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBwb2kgb2YgcHBvaSkge1xuICAgICAgcmFuZG9tLnNodWZmbGUocG9pKTtcbiAgICB9XG4gICAgY29uc3QgYWxsUG9pID0gWy4uLml0ZXJzLmNvbmNhdCguLi5wcG9pKV07XG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBzcGF3bnMsIGxvb2sgZm9yIE5QQy9jaGVzdC90cmlnZ2VyLlxuICAgIGNvbnN0IGxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHJhbmRvbS5pc2h1ZmZsZShsb2Muc3Bhd25zKSkge1xuICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpKSB7XG4gICAgICAgIGNvbnN0IHBsYXRmb3JtID0gUExBVEZPUk1TLmluZGV4T2Yoc3Bhd24ubW9uc3RlcklkKTtcbiAgICAgICAgaWYgKHBsYXRmb3JtID49IDAgJiYgcGl0cy5zaXplKSB7XG4gICAgICAgICAgY29uc3QgW1twb3MsIGRpcl1dID0gcGl0cztcbiAgICAgICAgICBwaXRzLmRlbGV0ZShwb3MpO1xuICAgICAgICAgIHNwYXduLm1vbnN0ZXJJZCA9IFBMQVRGT1JNU1twbGF0Zm9ybSAmIDIgfCBkaXJdO1xuICAgICAgICAgIHNwYXduLnNjcmVlbiA9IHBvcztcbiAgICAgICAgICBzcGF3bi50aWxlID0gZGlyID8gMHg3MyA6IDB4NDc7XG4gICAgICAgIH0gZWxzZSBpZiAoc3Bhd24ubW9uc3RlcklkID09PSAweDhmICYmIHN0YXR1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgW3NjcmVlbiwgY29vcmRdID0gc3RhdHVlcy5wb3AoKSE7XG4gICAgICAgICAgc3Bhd24uc2NyZWVuID0gc2NyZWVuO1xuICAgICAgICAgIHNwYXduLmNvb3JkID0gY29vcmQ7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7IC8vIHRoZXNlIGFyZSBoYW5kbGVkIGVsc2V3aGVyZS5cbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgY29uc3Qgd2FsbCA9IChzcGF3bi53YWxsVHlwZSgpID09PSAnYnJpZGdlJyA/IGJyaWRnZXMgOiB3YWxscykucG9wKCk7XG4gICAgICAgIGlmICghd2FsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGVub3VnaCAke3NwYXduLndhbGxUeXBlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gc2NyZWVucyBpbiBuZXcgbWV0YWxvY2F0aW9uOiAke2xvY31cXG4ke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93KCl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgW3ksIHhdID0gd2FsbDtcbiAgICAgICAgc3Bhd24ueXQgPSB5O1xuICAgICAgICBzcGF3bi54dCA9IHg7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc05wYygpIHx8IHNwYXduLmlzQm9zcygpIHx8IHNwYXduLmlzVHJpZ2dlcigpIHx8XG4gICAgICAgICAgICAgICAgIHNwYXduLmlzR2VuZXJpYygpKSB7XG4gICAgICAgIC8vbGV0IGogPSAwO1xuICAgICAgICBsZXQgYmVzdCA9IFstMSwgLTEsIEluZmluaXR5XTtcbiAgICAgICAgZm9yIChjb25zdCBbeTAsIHgwLCB5MSwgeDEsIGRtYXhdIG9mIG1hcCkge1xuICAgICAgICAgIGNvbnN0IGQgPSAoeXREaWZmKHNwYXduLnl0LCB5MCkpICoqIDIgKyAoc3Bhd24ueHQgLSB4MCkgKiogMjtcbiAgICAgICAgICBpZiAoZCA8PSBkbWF4ICYmIGQgPCBiZXN0WzJdKSB7XG4gICAgICAgICAgICBiZXN0ID0gW3l0QWRkKHNwYXduLnl0LCB5dERpZmYoeTEsIHkwKSksIHNwYXduLnh0ICsgeDEgLSB4MCwgZF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUoYmVzdFsyXSkpIHtcbiAgICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIGFueSBOUENzIHdlIGFscmVhZHkgbW92ZWQgc28gdGhhdCBhbnl0aGluZyB0aGF0J3NcbiAgICAgICAgICAvLyBvbiB0b3Agb2YgaXQgKGkuZS4gZHVhbCBzcGF3bnMpIG1vdmUgYWxvbmcgd2l0aC5cbiAgICAgICAgICAvL2lmIChiZXN0WzJdID4gNCkgbWFwLnB1c2goW3NwYXduLnh0LCBzcGF3bi55dCwgYmVzdFswXSwgYmVzdFsxXSwgNF0pO1xuICAgICAgICAgIC8vIC0gVE9ETyAtIEkgZG9uJ3QgdGhpbmsgd2UgbmVlZCB0aGlzLCBzaW5jZSBhbnkgZnV0dXJlIHNwYXduIHNob3VsZFxuICAgICAgICAgIC8vICAgYmUgcGxhY2VkIGJ5IHRoZSBzYW1lIHJ1bGVzLlxuICAgICAgICAgIFtzcGF3bi55dCwgc3Bhd24ueHRdID0gYmVzdDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gV2Fzbid0IGFibGUgdG8gbWFwIGFuIGFyZW5hIG9yIGV4aXQuICBQaWNrIGEgbmV3IFBPSSwgYnV0IHRyaWdnZXJzIGFuZFxuICAgICAgLy8gYm9zc2VzIGFyZSBpbmVsaWdpYmxlLlxuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpIHx8IHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHBsYWNlICR7bG9jfSAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduLmlzQm9zcygpID8gJ0Jvc3MnIDogJ1RyaWdnZXInfSAke3NwYXduLmhleCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiR7dGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXh0ID0gYWxsUG9pLnNoaWZ0KCk7XG4gICAgICBpZiAoIW5leHQpIHRocm93IG5ldyBFcnJvcihgUmFuIG91dCBvZiBQT0kgZm9yICR7bG9jfWApO1xuICAgICAgY29uc3QgW3ksIHhdID0gbmV4dDtcbiAgICAgIG1hcC5wdXNoKFtzcGF3bi55ID4+PiA0LCBzcGF3bi54ID4+PiA0LCB5ID4+PiA0LCB4ID4+PiA0LCA0XSk7XG4gICAgICBzcGF3bi55ID0geTtcbiAgICAgIHNwYXduLnggPSB4O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIHNlYW1sZXNzIHBhaXIgbG9jYXRpb24sIHN5bmMgdXAgdGhlIGV4aXRzLiAgRm9yIGVhY2ggZXhpdCBvZlxuICAgKiBlaXRoZXIsIGNoZWNrIGlmIGl0J3Mgc3ltbWV0cmljLCBhbmQgaWYgc28sIGNvcHkgaXQgb3ZlciB0byB0aGUgb3RoZXIgc2lkZS5cbiAgICovXG4gIHJlY29uY2lsZUV4aXRzKHRoYXQ6IE1ldGFsb2NhdGlvbikge1xuICAgIGNvbnN0IGFkZDogW01ldGFsb2NhdGlvbiwgUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdW10gPSBbXTtcbiAgICBjb25zdCBkZWw6IFtNZXRhbG9jYXRpb24sIFBvcywgQ29ubmVjdGlvblR5cGVdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIGxvYy5fZXhpdHMpIHtcbiAgICAgICAgaWYgKGRlc3RUeXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+PiA4XTtcbiAgICAgICAgY29uc3QgcmV2ZXJzZSA9IGRlc3QubWV0YS5fZXhpdHMuZ2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUpO1xuICAgICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICAgIGNvbnN0IFtyZXZUaWxlLCByZXZUeXBlXSA9IHJldmVyc2U7XG4gICAgICAgICAgaWYgKChyZXZUaWxlID4+PiA4KSA9PT0gbG9jLmlkICYmIChyZXZUaWxlICYgMHhmZikgPT09IHBvcyAmJlxuICAgICAgICAgICAgICByZXZUeXBlID09PSB0eXBlKSB7XG4gICAgICAgICAgICBhZGQucHVzaChbbG9jID09PSB0aGlzID8gdGhhdCA6IHRoaXMsIHBvcywgdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICBbZGVzdFRpbGUsIGRlc3RUeXBlXV0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGRlbC5wdXNoKFtsb2MsIHBvcywgdHlwZV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsb2MsIHBvcywgdHlwZV0gb2YgZGVsKSB7XG4gICAgICBsb2MuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsb2MsIHBvcywgdHlwZSwgZXhpdF0gb2YgYWRkKSB7XG4gICAgICBsb2MuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgICAvLyB0aGlzLl9leGl0cyA9IG5ldyBUYWJsZShleGl0cyk7XG4gICAgLy8gdGhhdC5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICB9XG5cbiAgLyoqIFdyaXRlcyB0aGUgZW50cmFuY2UwIGlmIHBvc3NpYmxlLiAqL1xuICB3cml0ZUVudHJhbmNlMCgpIHtcbiAgICBpZiAoIXRoaXMuX2VudHJhbmNlMCkgcmV0dXJuO1xuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGlmICh0eXBlICE9PSB0aGlzLl9lbnRyYW5jZTApIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZXhpdCA9IHRoaXMuX3NjcmVlbnNbcG9zXS5maW5kRXhpdEJ5VHlwZSh0eXBlKTtcbiAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXS5lbnRyYW5jZXNbMF0gPVxuICAgICAgICAgIEVudHJhbmNlLm9mKHtzY3JlZW46IHBvcywgY29vcmQ6IGV4aXQuZW50cmFuY2V9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2F2ZXMgdGhlIGN1cnJlbnQgc3RhdGUgYmFjayBpbnRvIHRoZSB1bmRlcmx5aW5nIGxvY2F0aW9uLlxuICAgKiBDdXJyZW50bHkgdGhpcyBvbmx5IGRlYWxzIHdpdGggZW50cmFuY2VzL2V4aXRzLlxuICAgKi9cbiAgd3JpdGUoKSB7XG4gICAgY29uc3Qgc3JjTG9jID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIC8vbGV0IHNlYW1sZXNzUGFydG5lcjogTG9jYXRpb258dW5kZWZpbmVkO1xuICAgIGNvbnN0IHNlYW1sZXNzUG9zID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBbc3JjUG9zLCBzcmNUeXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHRoaXMuX3NjcmVlbnNbc3JjUG9zXTtcbiAgICAgIGNvbnN0IGRlc3QgPSBkZXN0VGlsZSA+PiA4O1xuICAgICAgbGV0IGRlc3RQb3MgPSBkZXN0VGlsZSAmIDB4ZmY7XG4gICAgICBjb25zdCBkZXN0TG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdO1xuICAgICAgY29uc3QgZGVzdE1ldGEgPSBkZXN0TG9jLm1ldGEhO1xuICAgICAgY29uc3QgZGVzdFNjcmVlbiA9IGRlc3RNZXRhLl9zY3JlZW5zW2Rlc3RUaWxlICYgMHhmZl07XG4gICAgICBjb25zdCBzcmNFeGl0ID0gc3JjU2NyZWVuLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IHNyY1R5cGUpO1xuICAgICAgY29uc3QgZGVzdEV4aXQgPSBkZXN0U2NyZWVuLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IGRlc3RUeXBlKTtcbiAgICAgIGlmICghc3JjRXhpdCB8fCAhZGVzdEV4aXQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nICR7c3JjRXhpdCA/ICdkZXN0JyA6ICdzb3VyY2UnfSBleGl0OlxuICBGcm9tOiAke3NyY0xvY30gQCAke2hleChzcmNQb3MpfToke3NyY1R5cGV9ICR7c3JjU2NyZWVuLm5hbWV9XG4gIFRvOiAgICR7ZGVzdExvY30gQCAke2hleChkZXN0UG9zKX06JHtkZXN0VHlwZX0gJHtkZXN0U2NyZWVuLm5hbWV9YCk7XG4gICAgICB9XG4gICAgICAvLyBTZWUgaWYgdGhlIGRlc3QgZW50cmFuY2UgZXhpc3RzIHlldC4uLlxuICAgICAgbGV0IGVudHJhbmNlID0gMHgyMDtcbiAgICAgIGlmIChkZXN0RXhpdC50eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgc2VhbWxlc3NQb3MuYWRkKHNyY1Bvcyk7XG4gICAgICAgIC8vc2VhbWxlc3NQYXJ0bmVyID0gZGVzdExvYztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBkZXN0Q29vcmQgPSBkZXN0RXhpdC5lbnRyYW5jZTtcbiAgICAgICAgaWYgKGRlc3RDb29yZCA+IDB4ZWZmZikgeyAvLyBoYW5kbGUgc3BlY2lhbCBjYXNlIGluIE9ha1xuICAgICAgICAgIGRlc3RQb3MgKz0gMHgxMDtcbiAgICAgICAgICBkZXN0Q29vcmQgLT0gMHgxMDAwMDtcbiAgICAgICAgfVxuICAgICAgICBlbnRyYW5jZSA9IGRlc3RMb2MuZmluZE9yQWRkRW50cmFuY2UoZGVzdFBvcywgZGVzdENvb3JkKTtcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IHRpbGUgb2Ygc3JjRXhpdC5leGl0cykge1xuICAgICAgICBsZXQgc2NyZWVuID0gc3JjUG9zO1xuICAgICAgICBpZiAoKHRpbGUgJiAweGYwKSA9PT0gMHhmMCkge1xuICAgICAgICAgIHNjcmVlbiArPSAweDEwO1xuICAgICAgICAgIHRpbGUgJj0gMHhmO1xuICAgICAgICB9XG4gICAgICAgIC8vaWYgKHNyY0V4aXQudHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiB0aGlzLmhlaWdodCA9PT0gMSkgdGlsZSAtPSAweDIwO1xuICAgICAgICBzcmNMb2MuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW4sIHRpbGUsIGRlc3QsIGVudHJhbmNlfSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBzcmNMb2Mud2lkdGggPSB0aGlzLl93aWR0aDtcbiAgICBzcmNMb2MuaGVpZ2h0ID0gdGhpcy5faGVpZ2h0O1xuICAgIHNyY0xvYy5zY3JlZW5zID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93OiBudW1iZXJbXSA9IFtdO1xuICAgICAgc3JjTG9jLnNjcmVlbnMucHVzaChyb3cpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl93aWR0aDsgeCsrKSB7XG4gICAgICAgIHJvdy5wdXNoKHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF0uc2lkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3JjTG9jLnRpbGVzZXQgPSB0aGlzLnRpbGVzZXQudGlsZXNldElkO1xuICAgIHNyY0xvYy50aWxlRWZmZWN0cyA9IHRoaXMudGlsZXNldC5lZmZlY3RzKCkuaWQ7XG5cbiAgICAvLyBmaW5kIHJlYWNoYWJsZSBwb3MgZnJvbSBhbnkgZXhpdFxuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgaWYgKHNlYW1sZXNzUG9zLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGNvbnN0IGJlbG93ID0gcG9zICsgMTY7XG4gICAgICBjb25zdCByaWdodCA9IHBvcyArIDE7XG4gICAgICBpZiAoIXNlYW1sZXNzUG9zLmhhcyhiZWxvdykgJiYgKHNjci5kYXRhLmVkZ2VzPy5bMl0gPz8gJyAnKSAhPT0gJyAnKSB7XG4gICAgICAgIHVmLnVuaW9uKFtwb3MsIGJlbG93XSk7XG4gICAgICB9XG4gICAgICBpZiAoIXNlYW1sZXNzUG9zLmhhcyhyaWdodCkgJiYgKHNjci5kYXRhLmVkZ2VzPy5bM10gPz8gJyAnKSAhPT0gJyAnKSB7XG4gICAgICAgIHVmLnVuaW9uKFtwb3MsIHJpZ2h0XSk7XG4gICAgICB9XG4gICAgICB1Zi51bmlvbihbcG9zXSk7XG4gICAgfVxuICAgIGNvbnN0IHJlYWNoYWJsZU1hcCA9IHVmLm1hcCgpO1xuICAgIGNvbnN0IHJlYWNoYWJsZSA9IG5ldyBTZXQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgW3NyY1Bvc10gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIHJlYWNoYWJsZU1hcC5nZXQoc3JjUG9zKSA/PyBbXSkge1xuICAgICAgICByZWFjaGFibGUuYWRkKHBvcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgZmxhZ3NcbiAgICBzcmNMb2MuZmxhZ3MgPSBbXTtcbiAgICBjb25zdCBmcmVlRmxhZ3MgPSBbLi4udGhpcy5mcmVlRmxhZ3NdO1xuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbc2NyZWVuXTtcbiAgICAgIGxldCBmbGFnOiBudW1iZXJ8dW5kZWZpbmVkO1xuICAgICAgaWYgKHNjci5kYXRhLndhbGwgIT0gbnVsbCAmJiByZWFjaGFibGUuaGFzKHNjcmVlbikpIHtcbiAgICAgICAgLy8gIXNlYW1sZXNzUGFydG5lcikge1xuICAgICAgICBmbGFnID0gZnJlZUZsYWdzLnBvcCgpPy5pZCA/PyB0aGlzLnJvbS5mbGFncy5hbGxvYygweDIwMCk7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnYWx3YXlzJykge1xuICAgICAgICBmbGFnID0gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjYWxtJykge1xuICAgICAgICBmbGFnID0gdGhpcy5yb20uZmxhZ3MuQ2FsbWVkQW5ncnlTZWEuaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tOmZhbHNlJykge1xuICAgICAgICBmbGFnID0gdGhpcy5jdXN0b21GbGFncy5nZXQoc2NyZWVuKT8uaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tOnRydWUnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZCA/PyB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfVxuICAgICAgaWYgKGZsYWcgIT0gbnVsbCkge1xuICAgICAgICBzcmNMb2MuZmxhZ3MucHVzaChMb2NhdGlvbkZsYWcub2Yoe3NjcmVlbiwgZmxhZ30pKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSBwaXRzXG4gICAgc3JjTG9jLnBpdHMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtmcm9tU2NyZWVuLCB0b10gb2YgdGhpcy5fcGl0cykge1xuICAgICAgY29uc3QgdG9TY3JlZW4gPSB0byAmIDB4ZmY7XG4gICAgICBjb25zdCBkZXN0ID0gdG8gPj4+IDg7XG4gICAgICBzcmNMb2MucGl0cy5wdXNoKFBpdC5vZih7ZnJvbVNjcmVlbiwgdG9TY3JlZW4sIGRlc3R9KSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTk9URTogdGhpcyBjYW4gb25seSBiZSBkb25lIEFGVEVSIGNvcHlpbmcgdG8gdGhlIGxvY2F0aW9uIVxuICByZXBsYWNlTW9uc3RlcnMocmFuZG9tOiBSYW5kb20pIHtcbiAgICBpZiAodGhpcy5pZCA9PT0gMHg2OCkgcmV0dXJuOyAvLyB3YXRlciBsZXZlbHMsIGRvbid0IHBsYWNlIG9uIGxhbmQ/Pz9cbiAgICAvLyBNb3ZlIGFsbCB0aGUgbW9uc3RlcnMgdG8gcmVhc29uYWJsZSBsb2NhdGlvbnMuXG4gICAgY29uc3QgbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGNvbnN0IHBsYWNlciA9IGxvYy5tb25zdGVyUGxhY2VyKHJhbmRvbSk7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICBpZiAoIXNwYXduLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzcGF3bi5pc01vbnN0ZXIoKSkgY29udGludWU7XG4gICAgICBjb25zdCBtb25zdGVyID0gbG9jLnJvbS5vYmplY3RzW3NwYXduLm1vbnN0ZXJJZF07XG4gICAgICBpZiAoIShtb25zdGVyIGluc3RhbmNlb2YgTW9uc3RlcikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcG9zID0gcGxhY2VyKG1vbnN0ZXIpO1xuICAgICAgaWYgKHBvcyA9PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYG5vIHZhbGlkIGxvY2F0aW9uIGZvciAke2hleChtb25zdGVyLmlkKX0gaW4gJHtsb2N9YCk7XG4gICAgICAgIHNwYXduLnVzZWQgPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNwYXduLnNjcmVlbiA9IHBvcyA+Pj4gODtcbiAgICAgICAgc3Bhd24udGlsZSA9IHBvcyAmIDB4ZmY7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBUcmF2ZXJzZU9wdHMge1xuICAvLyBEbyBub3QgcGFzcyBjZXJ0YWluIHRpbGVzIGluIHRyYXZlcnNlXG4gIHJlYWRvbmx5IHdpdGg/OiBSZWFkb25seU1hcDxQb3MsIE1ldGFzY3JlZW4+O1xuICAvLyBXaGV0aGVyIHRvIGJyZWFrIHdhbGxzL2Zvcm0gYnJpZGdlc1xuICByZWFkb25seSBub0ZsYWdnZWQ/OiBib29sZWFuO1xuICAvLyBXaGV0aGVyIHRvIGFzc3VtZSBmbGlnaHRcbiAgcmVhZG9ubHkgZmxpZ2h0PzogYm9vbGVhbjtcbn1cblxuXG5jb25zdCB1bmtub3duRXhpdFdoaXRlbGlzdCA9IG5ldyBTZXQoW1xuICAweDAxMDAzYSwgLy8gdG9wIHBhcnQgb2YgY2F2ZSBvdXRzaWRlIHN0YXJ0XG4gIDB4MDEwMDNiLFxuICAweDE1NDBhMCwgLy8gXCIgXCIgc2VhbWxlc3MgZXF1aXZhbGVudCBcIiBcIlxuICAweDFhMzA2MCwgLy8gc3dhbXAgZXhpdFxuICAweDQwMjAwMCwgLy8gYnJpZGdlIHRvIGZpc2hlcm1hbiBpc2xhbmRcbiAgMHg0MDIwMzAsXG4gIDB4NDE4MGQwLCAvLyBiZWxvdyBleGl0IHRvIGxpbWUgdHJlZSB2YWxsZXlcbiAgMHg2MDg3YmYsIC8vIGJlbG93IGJvYXQgY2hhbm5lbFxuICAweGExMDMyNiwgLy8gY3J5cHQgMiBhcmVuYSBub3J0aCBlZGdlXG4gIDB4YTEwMzI5LFxuICAweGE5MDYyNiwgLy8gc3RhaXJzIGFib3ZlIGtlbGJ5IDJcbiAgMHhhOTA2MjksXG5dKTtcblxuLy9jb25zdCBEUE9TID0gWy0xNiwgLTEsIDE2LCAxXTtcbmNvbnN0IERJUl9OQU1FID0gWydhYm92ZScsICdsZWZ0IG9mJywgJ2JlbG93JywgJ3JpZ2h0IG9mJ107XG5cbnR5cGUgT3B0aW9uYWw8VD4gPSBUfG51bGx8dW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBkaXN0YW5jZShhOiBQb3MsIGI6IFBvcyk6IG51bWJlciB7XG4gIHJldHVybiAoKGEgPj4+IDQpIC0gKGIgPj4+IDQpKSAqKiAyICsgKChhICYgMHhmKSAtIChiICYgMHhmKSkgKiogMjtcbn1cblxuZnVuY3Rpb24gYWRkRGVsdGEoc3RhcnQ6IFBvcywgcGx1czogUG9zLCBtaW51czogUG9zLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBQb3Mge1xuICBjb25zdCBweCA9IHBsdXMgJiAweGY7XG4gIGNvbnN0IHB5ID0gcGx1cyA+Pj4gNDtcbiAgY29uc3QgbXggPSBtaW51cyAmIDB4ZjtcbiAgY29uc3QgbXkgPSBtaW51cyA+Pj4gNDtcbiAgY29uc3Qgc3ggPSBzdGFydCAmIDB4ZjtcbiAgY29uc3Qgc3kgPSBzdGFydCA+Pj4gNDtcbiAgY29uc3Qgb3ggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtZXRhLndpZHRoIC0gMSwgc3ggKyBweCAtIG14KSk7XG4gIGNvbnN0IG95ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obWV0YS5oZWlnaHQgLSAxLCBzeSArIHB5IC0gbXkpKTtcbiAgcmV0dXJuIG95IDw8IDQgfCBveDtcbn1cblxuLy8gYml0IDEgPSBjcnVtYmxpbmcsIGJpdCAwID0gaG9yaXpvbnRhbDogW3YsIGgsIGN2LCBjaF1cbmNvbnN0IFBMQVRGT1JNUzogcmVhZG9ubHkgbnVtYmVyW10gPSBbMHg3ZSwgMHg3ZiwgMHg5ZiwgMHg4ZF07XG4iXX0=