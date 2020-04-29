import { Exit, Flag as LocationFlag, Pit } from './locationtables.js';
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
            reachableScreens.add(entrance.screen);
        }
        for (const exit of location.exits) {
            reachableScreens.add(exit.screen);
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
        for (const exit of location.exits) {
            const srcPos = exit.screen;
            if (!reachableScreens.has(srcPos))
                continue;
            const srcScreen = screens[srcPos];
            const srcExit = srcScreen.findExitType(exit.tile, height === 1, !!(exit.entrance & 0x20));
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
                const destPos = srcPos + (tile < 0 ? -16 : tile >= 0xf0 ? 16 : -0);
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
        }
        const pits = new Map();
        for (const pit of location.pits) {
            pits.set(pit.fromScreen, pit.dest << 8 | pit.toScreen);
        }
        const metaloc = new Metalocation(location.id, tileset, height, width);
        metaloc._screens = screens;
        metaloc._exits = exits;
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
    attach(srcPos, dest, destPos, srcType, destType) {
        if (!srcType)
            srcType = this.pickTypeFromExits(srcPos);
        if (!destType)
            destType = dest.pickTypeFromExits(destPos);
        const destTile = dest.id << 8 | destPos;
        const prevDest = this._exits.get(srcPos, srcType);
        if (prevDest) {
            const [prevDestTile, prevDestType] = prevDest;
            if (prevDestTile === destTile && prevDestType === destType)
                return;
        }
        const prevSrc = dest._exits.get(destPos, destType);
        this._exits.set(srcPos, srcType, [destTile, destType]);
        dest._exits.set(destPos, destType, [this.id << 8 | srcPos, srcType]);
        if (prevSrc && prevDest) {
            const [prevDestTile, prevDestType] = prevDest;
            const [prevSrcTile, prevSrcType] = prevSrc;
            const prevSrcMeta = this.rom.locations[prevSrcTile >> 8].meta;
            const prevDestMeta = this.rom.locations[prevDestTile >> 8].meta;
            prevSrcMeta._exits.set(prevSrcTile & 0xff, prevSrcType, prevDest);
            prevDestMeta._exits.set(prevDestTile & 0xff, prevDestType, prevSrc);
        }
        else if (prevSrc || prevDest) {
            const [prevTile, prevType] = prevSrc || prevDest;
            const prevMeta = this.rom.locations[prevTile >> 8].meta;
            prevMeta._exits.delete(prevTile & 0xff, prevType);
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
    transferPits(orig, random) {
        var _a;
        this._pits.clear();
        const dests = new Set();
        for (const [, dest] of orig._pits) {
            dests.add(this.rom.locations[dest >>> 8].id);
        }
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
            if (closest[0] < 0)
                throw new Error(`no exit found`);
            pits.get(closest[1]).push([pos, closest[0]]);
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
                const dir = edges[0] === 'c' && edges[2] === 'c' ? 0 : 1;
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
        for (const spawn of random.shuffle(loc.spawns)) {
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
            else if (spawn.isNpc() || spawn.isBoss() || spawn.isTrigger()) {
                let best = [-1, -1, Infinity];
                for (const [y0, x0, y1, x1, dmax] of map) {
                    const d = (spawn.yt - y0) ** 2 + (spawn.xt - x0) ** 2;
                    if (d <= dmax && d < best[2]) {
                        best = [spawn.yt + y1 - y0, spawn.xt + x1 - x0, d];
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
    write() {
        var _a, _b, _c, _d, _e, _f, _g;
        const srcLoc = this.rom.locations[this.id];
        let seamlessPartner;
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
                seamlessPartner = destLoc;
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
                srcLoc.exits.push(Exit.of({ screen: srcPos, tile, dest, entrance }));
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
        srcLoc.flags = [];
        const freeFlags = [...this.freeFlags];
        for (const screen of this.allPos()) {
            const scr = this._screens[screen];
            let flag;
            if (scr.data.wall != null && !seamlessPartner) {
                flag = (_d = (_c = freeFlags.pop()) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : this.rom.flags.alloc(0x200);
            }
            else if (scr.flag === 'always') {
                flag = this.rom.flags.AlwaysTrue.id;
            }
            else if (scr.flag === 'calm') {
                flag = this.rom.flags.CalmedAngrySea.id;
            }
            else if (scr.flag === 'custom:false') {
                flag = (_e = this.customFlags.get(screen)) === null || _e === void 0 ? void 0 : _e.id;
            }
            else if (scr.flag === 'custom:true') {
                flag = (_g = (_f = this.customFlags.get(screen)) === null || _f === void 0 ? void 0 : _f.id) !== null && _g !== void 0 ? _g : this.rom.flags.AlwaysTrue.id;
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
            if (monster.isUntouchedMonster())
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBSXRFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFaEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBc0NqQixNQUFNLE9BQU8sWUFBWTtJQWlDdkIsWUFBcUIsRUFBVSxFQUFXLE9BQW9CLEVBQ2xELE1BQWMsRUFBRSxLQUFhO1FBRHBCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBM0I5RCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFDbkMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFRLENBQUM7UUFPcEIsU0FBSSxHQUFvQixTQUFTLENBQUM7UUFFbEMsV0FBTSxHQUFHLElBQUksS0FBSyxFQUFpQyxDQUFDO1FBQ3BELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBa0JyQyxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLElB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LEVBQUUsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUM7SUFDdkIsTUFBTSxFQUFFLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQztJQUN2QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLENBQUM7QUFHRCxNQUFNLFNBQVMsR0FBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvY2F0aW9uIH0gZnJvbSAnLi9sb2NhdGlvbi5qcyc7IC8vIGltcG9ydCB0eXBlXG5pbXBvcnQgeyBFeGl0LCBGbGFnIGFzIExvY2F0aW9uRmxhZywgUGl0IH0gZnJvbSAnLi9sb2NhdGlvbnRhYmxlcy5qcyc7XG5pbXBvcnQgeyBGbGFnIH0gZnJvbSAnLi9mbGFncy5qcyc7XG5pbXBvcnQgeyBNZXRhc2NyZWVuLCBVaWQgfSBmcm9tICcuL21ldGFzY3JlZW4uanMnO1xuaW1wb3J0IHsgTWV0YXRpbGVzZXQgfSBmcm9tICcuL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7IGhleCB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQgeyBSb20gfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHsgRGVmYXVsdE1hcCwgVGFibGUsIGl0ZXJzLCBmb3JtYXQgfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7IFVuaW9uRmluZCB9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQgeyBDb25uZWN0aW9uVHlwZSB9IGZyb20gJy4vbWV0YXNjcmVlbmRhdGEuanMnO1xuaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7IE1vbnN0ZXIgfSBmcm9tICcuL21vbnN0ZXIuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG4vLyBNb2RlbCBvZiBhIGxvY2F0aW9uIHdpdGggbWV0YXNjcmVlbnMsIGV0Yy5cblxuLy8gVHJpY2s6IHdlIG5lZWQgc29tZXRoaW5nIHRvIG93biB0aGUgbmVpZ2hib3IgY2FjaGUuXG4vLyAgLSBwcm9iYWJseSB0aGlzIGJlbG9uZ3MgaW4gdGhlIE1ldGF0aWxlc2V0LlxuLy8gIC0gbWV0aG9kIHRvIHJlZ2VuZXJhdGUsIGRvIGl0IGFmdGVyIHRoZSBzY3JlZW4gbW9kcz9cbi8vIERhdGEgd2Ugd2FudCB0byBrZWVwIHRyYWNrIG9mOlxuLy8gIC0gZ2l2ZW4gdHdvIHNjcmVlbnMgYW5kIGEgZGlyZWN0aW9uLCBjYW4gdGhleSBhYnV0P1xuLy8gIC0gZ2l2ZW4gYSBzY3JlZW4gYW5kIGEgZGlyZWN0aW9uLCB3aGF0IHNjcmVlbnMgb3Blbi9jbG9zZSB0aGF0IGVkZ2U/XG4vLyAgICAtIHdoaWNoIG9uZSBpcyB0aGUgXCJkZWZhdWx0XCI/XG5cbi8vIFRPRE8gLSBjb25zaWRlciBhYnN0cmFjdGluZyBleGl0cyBoZXJlP1xuLy8gIC0gZXhpdHM6IEFycmF5PFtFeGl0U3BlYywgbnVtYmVyLCBFeGl0U3BlY10+XG4vLyAgLSBFeGl0U3BlYyA9IHt0eXBlPzogQ29ubmVjdGlvblR5cGUsIHNjcj86IG51bWJlcn1cbi8vIEhvdyB0byBoYW5kbGUgY29ubmVjdGluZyB0aGVtIGNvcnJlY3RseT9cbi8vICAtIHNpbXBseSBzYXlpbmcgXCItPiB3YXRlcmZhbGwgdmFsbGV5IGNhdmVcIiBpcyBub3QgaGVscGZ1bCBzaW5jZSB0aGVyZSdzIDJcbi8vICAgIG9yIFwiLT4gd2luZCB2YWxsZXkgY2F2ZVwiIHdoZW4gdGhlcmUncyA1LlxuLy8gIC0gdXNlIHNjcklkIGFzIHVuaXF1ZSBpZGVudGlmaWVyPyAgb25seSBwcm9ibGVtIGlzIHNlYWxlZCBjYXZlIGhhcyAzLi4uXG4vLyAgLSBtb3ZlIHRvIGRpZmZlcmVudCBzY3JlZW4gYXMgbmVjZXNzYXJ5Li4uXG4vLyAgICAoY291bGQgYWxzbyBqdXN0IGRpdGNoIHRoZSBvdGhlciB0d28gYW5kIHRyZWF0IHdpbmRtaWxsIGVudHJhbmNlIGFzXG4vLyAgICAgYSBkb3duIGVudHJhbmNlIC0gc2FtZSB3LyBsaWdodGhvdXNlPylcbi8vICAtIG9ubHkgYSBzbWFsbCBoYW5kZnVsbCBvZiBsb2NhdGlvbnMgaGF2ZSBkaXNjb25uZWN0ZWQgY29tcG9uZW50czpcbi8vICAgICAgd2luZG1pbGwsIGxpZ2h0aG91c2UsIHB5cmFtaWQsIGdvYSBiYWNrZG9vciwgc2FiZXJhLCBzYWJyZS9oeWRyYSBsZWRnZXNcbi8vICAtIHdlIHJlYWxseSBkbyBjYXJlIHdoaWNoIGlzIGluIHdoaWNoIGNvbXBvbmVudC5cbi8vICAgIGJ1dCBtYXAgZWRpdHMgbWF5IGNoYW5nZSBldmVuIHRoZSBudW1iZXIgb2YgY29tcG9uZW50cz8/P1xuLy8gIC0gZG8gd2UgZG8gZW50cmFuY2Ugc2h1ZmZsZSBmaXJzdCBvciBtYXAgc2h1ZmZsZSBmaXJzdD9cbi8vICAgIG9yIGFyZSB0aGV5IGludGVybGVhdmVkPyE/XG4vLyAgICBpZiB3ZSBzaHVmZmxlIHNhYnJlIG92ZXJ3b3JsZCB0aGVuIHdlIG5lZWQgdG8ga25vdyB3aGljaCBjYXZlcyBjb25uZWN0XG4vLyAgICB0byB3aGljaC4uLiBhbmQgcG9zc2libHkgY2hhbmdlIHRoZSBjb25uZWN0aW9ucz9cbi8vICAgIC0gbWF5IG5lZWQgbGVld2F5IHRvIGFkZC9zdWJ0cmFjdCBjYXZlIGV4aXRzPz9cbi8vIFByb2JsZW0gaXMgdGhhdCBlYWNoIGV4aXQgaXMgY28tb3duZWQgYnkgdHdvIG1ldGFsb2NhdGlvbnMuXG5cblxuZXhwb3J0IHR5cGUgUG9zID0gbnVtYmVyO1xuZXhwb3J0IHR5cGUgTG9jUG9zID0gbnVtYmVyOyAvLyBsb2NhdGlvbiA8PCA4IHwgcG9zXG5leHBvcnQgdHlwZSBFeGl0U3BlYyA9IHJlYWRvbmx5IFtMb2NQb3MsIENvbm5lY3Rpb25UeXBlXTtcblxuZXhwb3J0IGNsYXNzIE1ldGFsb2NhdGlvbiB7XG5cbiAgLy8gVE9ETyAtIHN0b3JlIG1ldGFkYXRhIGFib3V0IHdpbmRtaWxsIGZsYWc/ICB0d28gbWV0YWxvY3Mgd2lsbCBuZWVkIGEgcG9zIHRvXG4gIC8vIGluZGljYXRlIHdoZXJlIHRoYXQgZmxhZyBzaG91bGQgZ28uLi4/ICBPciBzdG9yZSBpdCBpbiB0aGUgbWV0YXNjcmVlbj9cblxuICAvLyBDYXZlcyBhcmUgYXNzdW1lZCB0byBiZSBhbHdheXMgb3BlbiB1bmxlc3MgdGhlcmUncyBhIGZsYWcgc2V0IGhlcmUuLi5cbiAgY3VzdG9tRmxhZ3MgPSBuZXcgTWFwPFBvcywgRmxhZz4oKTtcbiAgZnJlZUZsYWdzID0gbmV3IFNldDxGbGFnPigpO1xuXG4gIHJlYWRvbmx5IHJvbTogUm9tO1xuXG4gIHByaXZhdGUgX2hlaWdodDogbnVtYmVyO1xuICBwcml2YXRlIF93aWR0aDogbnVtYmVyO1xuXG4gIHByaXZhdGUgX3BvczogUG9zW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIHByaXZhdGUgX2V4aXRzID0gbmV3IFRhYmxlPFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjPigpO1xuICBwcml2YXRlIF9waXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTsgLy8gTWFwcyB0byBsb2MgPDwgOCB8IHBvc1xuXG4gIC8vcHJpdmF0ZSBfbW9uc3RlcnNJbnZhbGlkYXRlZCA9IGZhbHNlO1xuXG4gIC8qKiBLZXk6ICh5PDw0KXx4ICovXG4gIHByaXZhdGUgX3NjcmVlbnM6IE1ldGFzY3JlZW5bXTtcblxuICAvLyBOT1RFOiBrZWVwaW5nIHRyYWNrIG9mIHJlYWNoYWJpbGl0eSBpcyBpbXBvcnRhbnQgYmVjYXVzZSB3aGVuIHdlXG4gIC8vIGRvIHRoZSBzdXJ2ZXkgd2UgbmVlZCB0byBvbmx5IGNvdW50IFJFQUNIQUJMRSB0aWxlcyEgIFNlYW1sZXNzXG4gIC8vIHBhaXJzIGFuZCBicmlkZ2VzIGNhbiBjYXVzZSBsb3RzIG9mIGltcG9ydGFudC10by1yZXRhaW4gdW5yZWFjaGFibGVcbiAgLy8gdGlsZXMuICBNb3Jlb3Zlciwgc29tZSBkZWFkLWVuZCB0aWxlcyBjYW4ndCBhY3R1YWxseSBiZSB3YWxrZWQgb24uXG4gIC8vIEZvciBub3cgd2UnbGwganVzdCB6ZXJvIG91dCBmZWF0dXJlIG1ldGFzY3JlZW5zIHRoYXQgYXJlbid0XG4gIC8vIHJlYWNoYWJsZSwgc2luY2UgdHJ5aW5nIHRvIGRvIGl0IGNvcnJlY3RseSByZXF1aXJlcyBzdG9yaW5nXG4gIC8vIHJlYWNoYWJpbGl0eSBhdCB0aGUgdGlsZSBsZXZlbCAoYWdhaW4gZHVlIHRvIGJyaWRnZSBkb3VibGUgc3RhaXJzKS5cbiAgLy8gcHJpdmF0ZSBfcmVhY2hhYmxlOiBVaW50OEFycmF5fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBpZDogbnVtYmVyLCByZWFkb25seSB0aWxlc2V0OiBNZXRhdGlsZXNldCxcbiAgICAgICAgICAgICAgaGVpZ2h0OiBudW1iZXIsIHdpZHRoOiBudW1iZXIpIHtcbiAgICB0aGlzLnJvbSA9IHRpbGVzZXQucm9tO1xuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX3NjcmVlbnMgPSBuZXcgQXJyYXkoaGVpZ2h0IDw8IDQpLmZpbGwodGlsZXNldC5lbXB0eSk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugb3V0IGEgbWV0YWxvY2F0aW9uIGZyb20gdGhlIGdpdmVuIGxvY2F0aW9uLiAgSW5mZXIgdGhlXG4gICAqIHRpbGVzZXQgaWYgcG9zc2libGUsIG90aGVyd2lzZSBpdCBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxuICAgKi9cbiAgc3RhdGljIG9mKGxvY2F0aW9uOiBMb2NhdGlvbiwgdGlsZXNldD86IE1ldGF0aWxlc2V0KTogTWV0YWxvY2F0aW9uIHtcbiAgICBjb25zdCB7cm9tLCB3aWR0aCwgaGVpZ2h0fSA9IGxvY2F0aW9uO1xuICAgIGlmICghdGlsZXNldCkge1xuICAgICAgLy8gSW5mZXIgdGhlIHRpbGVzZXQuICBTdGFydCBieSBhZGRpbmcgYWxsIGNvbXBhdGlibGUgbWV0YXRpbGVzZXRzLlxuICAgICAgY29uc3Qge2ZvcnRyZXNzLCBsYWJ5cmludGh9ID0gcm9tLm1ldGF0aWxlc2V0cztcbiAgICAgIGNvbnN0IHRpbGVzZXRzID0gbmV3IFNldDxNZXRhdGlsZXNldD4oKTtcbiAgICAgIGZvciAoY29uc3QgdHMgb2Ygcm9tLm1ldGF0aWxlc2V0cykge1xuICAgICAgICBpZiAobG9jYXRpb24udGlsZXNldCA9PT0gdHMudGlsZXNldC5pZCkgdGlsZXNldHMuYWRkKHRzKTtcbiAgICAgIH1cbiAgICAgIC8vIEl0J3MgaW1wb3NzaWJsZSB0byBkaXN0aW5ndWlzaCBmb3J0cmVzcyBhbmQgbGFieXJpbnRoLCBzbyB3ZSBoYXJkY29kZVxuICAgICAgLy8gaXQgYmFzZWQgb24gbG9jYXRpb246IG9ubHkgJGE5IGlzIGxhYnlyaW50aC5cbiAgICAgIHRpbGVzZXRzLmRlbGV0ZShsb2NhdGlvbi5pZCA9PT0gMHhhOSA/IGZvcnRyZXNzIDogbGFieXJpbnRoKTtcbiAgICAgIC8vIEZpbHRlciBvdXQgYW55IHRpbGVzZXRzIHRoYXQgZG9uJ3QgaW5jbHVkZSBuZWNlc3Nhcnkgc2NyZWVuIGlkcy5cbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIG5ldyBTZXQoaXRlcnMuY29uY2F0KC4uLmxvY2F0aW9uLnNjcmVlbnMpKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHRpbGVzZXQgb2YgdGlsZXNldHMpIHtcbiAgICAgICAgICBpZiAoIXRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMoc2NyZWVuKS5sZW5ndGgpIHRpbGVzZXRzLmRlbGV0ZSh0aWxlc2V0KTtcbiAgICAgICAgICBpZiAoIXRpbGVzZXRzLnNpemUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdGlsZXNldCBmb3IgJHtoZXgoc2NyZWVuKX0gaW4gJHtsb2NhdGlvbn1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0aWxlc2V0cy5zaXplICE9PSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSB0aWxlc2V0IGZvciAke2xvY2F0aW9ufTogWyR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgQXJyYXkuZnJvbSh0aWxlc2V0cywgdCA9PiB0Lm5hbWUpLmpvaW4oJywgJyl9XWApO1xuICAgICAgfVxuICAgICAgdGlsZXNldCA9IFsuLi50aWxlc2V0c11bMF07XG4gICAgfVxuXG4gICAgLy8gVHJhdmVyc2UgdGhlIGxvY2F0aW9uIGZvciBhbGwgdGlsZXMgcmVhY2hhYmxlIGZyb20gYW4gZW50cmFuY2UuXG4gICAgLy8gVGhpcyBpcyB1c2VkIHRvIGluZm9ybSB3aGljaCBtZXRhc2NyZWVuIHRvIHNlbGVjdCBmb3Igc29tZSBvZiB0aGVcbiAgICAvLyByZWR1bmRhbnQgb25lcyAoaS5lLiBkb3VibGUgZGVhZCBlbmRzKS4gIFRoaXMgaXMgYSBzaW1wbGUgdHJhdmVyc2FsXG4gICAgY29uc3QgcmVhY2hhYmxlID0gbG9jYXRpb24ucmVhY2hhYmxlVGlsZXModHJ1ZSk7IC8vIHRyYXZlcnNlUmVhY2hhYmxlKDB4MDQpO1xuICAgIGNvbnN0IHJlYWNoYWJsZVNjcmVlbnMgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgcmVhY2hhYmxlLmtleXMoKSkge1xuICAgICAgcmVhY2hhYmxlU2NyZWVucy5hZGQodGlsZSA+Pj4gOCk7XG4gICAgICAvL3JlYWNoYWJsZVNjcmVlbnMuYWRkKCh0aWxlICYgMHhmMDAwKSA+Pj4gOCB8ICh0aWxlICYgMHhmMCkgPj4+IDQpO1xuICAgIH1cbiAgICAvLyBOT1RFOiBzb21lIGVudHJhbmNlcyBhcmUgb24gaW1wYXNzYWJsZSB0aWxlcyBidXQgd2Ugc3RpbGwgY2FyZSBhYm91dFxuICAgIC8vIHRoZSBzY3JlZW5zIHVuZGVyIHRoZW0gKGUuZy4gYm9hdCBhbmQgc2hvcCBlbnRyYW5jZXMpLiAgQWxzbyBtYWtlIHN1cmVcbiAgICAvLyB0byBoYW5kbGUgdGhlIHNlYW1sZXNzIHRvd2VyIGV4aXRzLlxuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgbG9jYXRpb24uZW50cmFuY2VzKSB7XG4gICAgICByZWFjaGFibGVTY3JlZW5zLmFkZChlbnRyYW5jZS5zY3JlZW4pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIHJlYWNoYWJsZVNjcmVlbnMuYWRkKGV4aXQuc2NyZWVuKTtcbiAgICB9XG4gICAgLy9jb25zdCBleGl0ID0gdGlsZXNldC5leGl0O1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgQXJyYXk8TWV0YXNjcmVlbj4oaGVpZ2h0IDw8IDQpLmZpbGwodGlsZXNldC5lbXB0eSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHQwID0geSA8PCA0IHwgeDtcbiAgICAgICAgY29uc3QgbWV0YXNjcmVlbnMgPSB0aWxlc2V0LmdldE1ldGFzY3JlZW5zKGxvY2F0aW9uLnNjcmVlbnNbeV1beF0pO1xuICAgICAgICBsZXQgbWV0YXNjcmVlbjogTWV0YXNjcmVlbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChtZXRhc2NyZWVucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBtZXRhc2NyZWVuID0gbWV0YXNjcmVlbnNbMF07XG4gICAgICAgIH0gZWxzZSBpZiAoIW1ldGFzY3JlZW5zLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRPT0QgLSBmaWx0ZXIgYmFzZWQgb24gd2hvIGhhcyBhIG1hdGNoIGZ1bmN0aW9uLCBvciBtYXRjaGluZyBmbGFnc1xuICAgICAgICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09ICgoeSA8PCA0KSB8IHgpKTtcbiAgICAgICAgICBjb25zdCBtYXRjaGVyczogTWV0YXNjcmVlbltdID0gW107XG4gICAgICAgICAgY29uc3QgYmVzdDogTWV0YXNjcmVlbltdID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1ldGFzY3JlZW5zKSB7XG4gICAgICAgICAgICBpZiAocy5kYXRhLm1hdGNoKSB7XG4gICAgICAgICAgICAgIG1hdGNoZXJzLnB1c2gocyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHMuZmxhZyA9PT0gJ2Fsd2F5cycgJiYgZmxhZz8uZmxhZyA9PT0gMHgyZmUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIXMuZmxhZyAmJiAhcy5kYXRhLndhbGwgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgICAgYmVzdC51bnNoaWZ0KHMpOyAvLyBmcm9udC1sb2FkIG1hdGNoaW5nIGZsYWdzXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBiZXN0LnB1c2gocyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChtYXRjaGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlYWNoKGR5OiBudW1iZXIsIGR4OiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgY29uc3QgeDAgPSAoeCA8PCA4KSArIGR4O1xuICAgICAgICAgICAgICBjb25zdCB5MCA9ICh5IDw8IDgpICsgZHk7XG4gICAgICAgICAgICAgIGNvbnN0IHQgPVxuICAgICAgICAgICAgICAgICAgKHkwIDw8IDQpICYgMHhmMDAwIHwgeDAgJiAweGYwMCB8IHkwICYgMHhmMCB8ICh4MCA+PiA0KSAmIDB4ZjtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlYWNoYWJsZS5oYXModCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1hdGNoZXIgb2YgbWF0Y2hlcnMpIHtcbiAgICAgICAgICAgICAgaWYgKCFtYXRjaGVyLmRhdGEubWF0Y2ghKHJlYWNoLCBmbGFnICE9IG51bGwpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgbWV0YXNjcmVlbiA9IG1hdGNoZXI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIW1ldGFzY3JlZW4pIG1ldGFzY3JlZW4gPSBiZXN0WzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbWV0YXNjcmVlbikgdGhyb3cgbmV3IEVycm9yKCdpbXBvc3NpYmxlJyk7XG4gICAgICAgIC8vIGlmICgobWV0YXNjcmVlbi5kYXRhLmV4aXRzIHx8IG1ldGFzY3JlZW4uZGF0YS53YWxsKSAmJlxuICAgICAgICAvLyAgICAgIXJlYWNoYWJsZVNjcmVlbnMuaGFzKHQwKSAmJlxuICAgICAgICAvLyAgICAgdGlsZXNldCAhPT0gcm9tLm1ldGF0aWxlc2V0cy50b3dlcikge1xuICAgICAgICAvLyAgIC8vIE1ha2Ugc3VyZSB3ZSBkb24ndCBzdXJ2ZXkgdW5yZWFjaGFibGUgc2NyZWVucyAoYW5kIGl0J3MgaGFyZCB0b1xuICAgICAgICAvLyAgIC8vIHRvIGZpZ3VyZSBvdXQgd2hpY2ggaXMgd2hpY2ggbGF0ZXIpLiAgTWFrZSBzdXJlIG5vdCB0byBkbyB0aGlzIGZvclxuICAgICAgICAvLyAgIC8vIHRvd2VyIGJlY2F1c2Ugb3RoZXJ3aXNlIGl0J2xsIGNsb2JiZXIgaW1wb3J0YW50IHBhcnRzIG9mIHRoZSBtYXAuXG4gICAgICAgIC8vICAgbWV0YXNjcmVlbiA9IHRpbGVzZXQuZW1wdHk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgc2NyZWVuc1t0MF0gPSBtZXRhc2NyZWVuO1xuICAgICAgICAvLyAvLyBJZiB3ZSdyZSBvbiB0aGUgYm9yZGVyIGFuZCBpdCdzIGFuIGVkZ2UgZXhpdCB0aGVuIGNoYW5nZSB0aGUgYm9yZGVyXG4gICAgICAgIC8vIC8vIHNjcmVlbiB0byByZWZsZWN0IGFuIGV4aXQuXG4gICAgICAgIC8vIGNvbnN0IGVkZ2VzID0gbWV0YXNjcmVlbi5lZGdlRXhpdHMoKTtcbiAgICAgICAgLy8gaWYgKHkgPT09IDAgJiYgKGVkZ2VzICYgMSkpIHNjcmVlbnNbdDAgLSAxNl0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeCA9PT0gMCAmJiAoZWRnZXMgJiAyKSkgc2NyZWVuc1t0MCAtIDFdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHkgPT09IGhlaWdodCAmJiAoZWRnZXMgJiA0KSkgc2NyZWVuc1t0MCArIDE2XSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh4ID09PSB3aWR0aCAmJiAoZWRnZXMgJiA4KSkgc2NyZWVuc1t0MCArIDFdID0gZXhpdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaWd1cmUgb3V0IGV4aXRzXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgVGFibGU8UG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWM+KCk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBjb25zdCBzcmNQb3MgPSBleGl0LnNjcmVlbjtcbiAgICAgIGlmICghcmVhY2hhYmxlU2NyZWVucy5oYXMoc3JjUG9zKSkgY29udGludWU7XG4gICAgICBjb25zdCBzcmNTY3JlZW4gPSBzY3JlZW5zW3NyY1Bvc107XG4gICAgICBjb25zdCBzcmNFeGl0ID0gc3JjU2NyZWVuLmZpbmRFeGl0VHlwZShleGl0LnRpbGUsIGhlaWdodCA9PT0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICEhKGV4aXQuZW50cmFuY2UgJiAweDIwKSk7XG4gICAgICBjb25zdCBzcmNUeXBlID0gc3JjRXhpdD8udHlwZTtcbiAgICAgIGlmICghc3JjVHlwZSkge1xuICAgICAgICBjb25zdCBpZCA9IGxvY2F0aW9uLmlkIDw8IDE2IHwgc3JjUG9zIDw8IDggfCBleGl0LnRpbGU7XG4gICAgICAgIGlmICh1bmtub3duRXhpdFdoaXRlbGlzdC5oYXMoaWQpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgYWxsID0gc3JjU2NyZWVuLmRhdGEuZXhpdHM/Lm1hcChcbiAgICAgICAgICAgIGUgPT4gZS50eXBlICsgJzogJyArIGUuZXhpdHMubWFwKGhleCkuam9pbignLCAnKSkuam9pbignXFxuICAnKTtcbiAgICAgICAgY29uc29sZS53YXJuKGBVbmtub3duIGV4aXQgJHtoZXgoZXhpdC50aWxlKX06ICR7c3JjU2NyZWVuLm5hbWV9IGluICR7XG4gICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb259IEAgJHtoZXgoc3JjUG9zKX06XFxuICAke2FsbH1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoZXhpdHMuaGFzKHNyY1Bvcywgc3JjVHlwZSkpIGNvbnRpbnVlOyAvLyBhbHJlYWR5IGhhbmRsZWRcbiAgICAgIGNvbnN0IGRlc3QgPSByb20ubG9jYXRpb25zW2V4aXQuZGVzdF07XG4gICAgICBpZiAoc3JjVHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgIGNvbnN0IGRvd24gPSBzcmNUeXBlID09PSAnc2VhbWxlc3M6ZG93bic7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgc2VlbXMgd3JvbmcgLSB0aGUgZG93biBleGl0IGlzIEJFTE9XIHRoZSB1cCBleGl0Li4uP1xuICAgICAgICBjb25zdCB0aWxlID0gc3JjRXhpdCEuZXhpdHNbMF0gKyAoZG93biA/IC0xNiA6IDE2KTtcbiAgICAgICAgY29uc3QgZGVzdFBvcyA9IHNyY1BvcyArICh0aWxlIDwgMCA/IC0xNiA6IHRpbGUgPj0gMHhmMCA/IDE2IDogLTApO1xuICAgICAgICBjb25zdCBkZXN0VHlwZSA9IGRvd24gPyAnc2VhbWxlc3M6dXAnIDogJ3NlYW1sZXNzOmRvd24nO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGAke3NyY1R5cGV9ICR7aGV4KGxvY2F0aW9uLmlkKX0gJHtkb3dufSAke2hleCh0aWxlKX0gJHtoZXgoZGVzdFBvcyl9ICR7ZGVzdFR5cGV9ICR7aGV4KGRlc3QuaWQpfWApO1xuICAgICAgICBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBlbnRyYW5jZSA9IGRlc3QuZW50cmFuY2VzW2V4aXQuZW50cmFuY2UgJiAweDFmXTtcbiAgICAgIGxldCBkZXN0UG9zID0gZW50cmFuY2Uuc2NyZWVuO1xuICAgICAgbGV0IGRlc3RDb29yZCA9IGVudHJhbmNlLmNvb3JkO1xuICAgICAgaWYgKHNyY1R5cGUgPT09ICdkb29yJyAmJiAoZW50cmFuY2UueSAmIDB4ZjApID09PSAwKSB7XG4gICAgICAgIC8vIE5PVEU6IFRoZSBpdGVtIHNob3AgZG9vciBpbiBPYWsgc3RyYWRkbGVzIHR3byBzY3JlZW5zIChleGl0IGlzIG9uXG4gICAgICAgIC8vIHRoZSBOVyBzY3JlZW4gd2hpbGUgZW50cmFuY2UgaXMgb24gU1cgc2NyZWVuKS4gIERvIGEgcXVpY2sgaGFjayB0b1xuICAgICAgICAvLyBkZXRlY3QgdGhpcyAocHJveHlpbmcgXCJkb29yXCIgZm9yIFwidXB3YXJkIGV4aXRcIikgYW5kIGFkanVzdCBzZWFyY2hcbiAgICAgICAgLy8gdGFyZ2V0IGFjY29yZGluZ2x5LlxuICAgICAgICBkZXN0UG9zIC09IDB4MTA7XG4gICAgICAgIGRlc3RDb29yZCArPSAweDEwMDAwO1xuICAgICAgfVxuICAgICAgLy8gRmlndXJlIG91dCB0aGUgY29ubmVjdGlvbiB0eXBlIGZvciB0aGUgZGVzdFRpbGUuXG4gICAgICBjb25zdCBkZXN0U2NySWQgPSBkZXN0LnNjcmVlbnNbZGVzdFBvcyA+PiA0XVtkZXN0UG9zICYgMHhmXTtcbiAgICAgIGNvbnN0IGRlc3RUeXBlID0gZmluZEVudHJhbmNlVHlwZShkZXN0LCBkZXN0U2NySWQsIGRlc3RDb29yZCk7XG4gICAgICAvLyBOT1RFOiBpbml0aWFsIHNwYXduIGhhcyBubyB0eXBlLi4uP1xuICAgICAgaWYgKCFkZXN0VHlwZSkge1xuICAgICAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRlc3RTY3Igb2Ygcm9tLm1ldGFzY3JlZW5zLmdldEJ5SWQoZGVzdFNjcklkLCBkZXN0LnRpbGVzZXQpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBleGl0IG9mIGRlc3RTY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICAgICAgaWYgKGV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgICAgIGxpbmVzLnB1c2goYCAgJHtkZXN0U2NyLm5hbWV9ICR7ZXhpdC50eXBlfTogJHtoZXgoZXhpdC5lbnRyYW5jZSl9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUud2FybihgQmFkIGVudHJhbmNlICR7aGV4KGRlc3RDb29yZCl9OiByYXcgJHtoZXgoZGVzdFNjcklkKVxuICAgICAgICAgICAgICAgICAgICAgIH0gaW4gJHtkZXN0fSBAICR7aGV4KGRlc3RQb3MpfVxcbiR7bGluZXMuam9pbignXFxuJyl9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgICAvLyBpZiAoZGVzdFR5cGUpIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIHRoZSBwaXRzIG1hcC5cbiAgICBjb25zdCBwaXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHBpdCBvZiBsb2NhdGlvbi5waXRzKSB7XG4gICAgICBwaXRzLnNldChwaXQuZnJvbVNjcmVlbiwgcGl0LmRlc3QgPDwgOCB8IHBpdC50b1NjcmVlbik7XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YWxvYyA9IG5ldyBNZXRhbG9jYXRpb24obG9jYXRpb24uaWQsIHRpbGVzZXQsIGhlaWdodCwgd2lkdGgpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgc2NyZWVucy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgbWV0YWxvYy5zZXRJbnRlcm5hbChpLCBzY3JlZW5zW2ldKTtcbiAgICAvLyB9XG4gICAgbWV0YWxvYy5fc2NyZWVucyA9IHNjcmVlbnM7XG4gICAgbWV0YWxvYy5fZXhpdHMgPSBleGl0cztcbiAgICBtZXRhbG9jLl9waXRzID0gcGl0cztcblxuICAgIC8vIEZpbGwgaW4gY3VzdG9tIGZsYWdzXG4gICAgZm9yIChjb25zdCBmIG9mIGxvY2F0aW9uLmZsYWdzKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhbG9jLl9zY3JlZW5zW2Yuc2NyZWVuXTtcbiAgICAgIGlmIChzY3IuZmxhZz8uc3RhcnRzV2l0aCgnY3VzdG9tJykpIHtcbiAgICAgICAgbWV0YWxvYy5jdXN0b21GbGFncy5zZXQoZi5zY3JlZW4sIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAgIH0gZWxzZSBpZiAoIXNjci5mbGFnKSB7XG4gICAgICAgIG1ldGFsb2MuZnJlZUZsYWdzLmFkZChyb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGZvciAoY29uc3QgcG9zIG9mIG1ldGFsb2MuYWxsUG9zKCkpIHtcbiAgICAvLyAgIGNvbnN0IHNjciA9IHJvbS5tZXRhc2NyZWVuc1ttZXRhbG9jLl9zY3JlZW5zW3BvcyArIDE2XV07XG4gICAgLy8gICBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b20nKSB7XG4gICAgLy8gICAgIGNvbnN0IGYgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IHBvcyk7XG4gICAgLy8gICAgIGlmIChmKSBtZXRhbG9jLmN1c3RvbUZsYWdzLnNldChwb3MsIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cbiAgICAvLyBUT0RPIC0gc3RvcmUgcmVhY2hhYmlsaXR5IG1hcD9cbiAgICByZXR1cm4gbWV0YWxvYztcblxuICAgIGZ1bmN0aW9uIGZpbmRFbnRyYW5jZVR5cGUoZGVzdDogTG9jYXRpb24sIHNjcklkOiBudW1iZXIsIGNvb3JkOiBudW1iZXIpIHtcbiAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChzY3JJZCwgZGVzdC50aWxlc2V0KSkge1xuICAgICAgICBjb25zdCB0eXBlID0gZGVzdFNjci5maW5kRW50cmFuY2VUeXBlKGNvb3JkLCBkZXN0LmhlaWdodCA9PT0gMSk7XG4gICAgICAgIGlmICh0eXBlICE9IG51bGwpIHJldHVybiB0eXBlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvLyBpc1JlYWNoYWJsZShwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAvLyAgIHRoaXMuY29tcHV0ZVJlYWNoYWJsZSgpO1xuICAvLyAgIHJldHVybiAhISh0aGlzLl9yZWFjaGFibGUhW3BvcyA+Pj4gNF0gJiAoMSA8PCAocG9zICYgNykpKTtcbiAgLy8gfVxuXG4gIC8vIGNvbXB1dGVSZWFjaGFibGUoKSB7XG4gIC8vICAgaWYgKHRoaXMuX3JlYWNoYWJsZSkgcmV0dXJuO1xuICAvLyAgIHRoaXMuX3JlYWNoYWJsZSA9IG5ldyBVaW50OEFycmF5KHRoaXMuaGVpZ2h0KTtcbiAgLy8gICBjb25zdCBtYXAgPSB0aGlzLnRyYXZlcnNlKHtmbGlnaHQ6IHRydWV9KTtcbiAgLy8gICBjb25zdCBzZWVuID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxQb3M+KCk7XG4gIC8vICAgZm9yIChjb25zdCBbcG9zXSBvZiB0aGlzLl9leGl0cykge1xuICAvLyAgICAgY29uc3Qgc2V0ID0gbWFwLmdldChwb3MpXG4gIC8vICAgfVxuICAvLyB9XG5cbiAgZ2V0VWlkKHBvczogUG9zKTogVWlkIHtcbiAgICByZXR1cm4gdGhpcy5fc2NyZWVuc1twb3NdLnVpZDtcbiAgfVxuXG4gIGdldChwb3M6IFBvcyk6IE1ldGFzY3JlZW4ge1xuICAgIHJldHVybiB0aGlzLl9zY3JlZW5zW3Bvc107XG4gIH1cblxuICAvLyBSZWFkb25seSBhY2Nlc3Nvci5cbiAgLy8gZ2V0IHNjcmVlbnMoKTogcmVhZG9ubHkgVWlkW10ge1xuICAvLyAgIHJldHVybiB0aGlzLl9zY3JlZW5zO1xuICAvLyB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoO1xuICB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX2hlaWdodCA+IGhlaWdodCkge1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UoKGhlaWdodCArIDIpIDw8IDQsICh0aGlzLl9oZWlnaHQgLSBoZWlnaHQpIDw8IDQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faGVpZ2h0IDwgaGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmxlbmd0aCA9IChoZWlnaHQgKyAyKSA8PCA0O1xuICAgICAgdGhpcy5fc2NyZWVucy5maWxsKHRoaXMudGlsZXNldC5lbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5oZWlnaHQgKyAyKSA8PCA0LCB0aGlzLl9zY3JlZW5zLmxlbmd0aCk7XG4gICAgfVxuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBUT0RPIC0gcmVzaXplIGZ1bmN0aW9uP1xuXG4gIGFsbFBvcygpOiByZWFkb25seSBQb3NbXSB7XG4gICAgaWYgKHRoaXMuX3BvcykgcmV0dXJuIHRoaXMuX3BvcztcbiAgICBjb25zdCBwOiBudW1iZXJbXSA9IHRoaXMuX3BvcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5faGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fd2lkdGg7IHgrKykge1xuICAgICAgICBwLnB1c2goeSA8PCA0IHwgeCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9XG5cbiAgc2V0KHBvczogUG9zLCBzY3I6IE1ldGFzY3JlZW4gfCBudWxsKSB7XG4gICAgdGhpcy5fc2NyZWVuc1twb3NdID0gc2NyID8/IHRoaXMudGlsZXNldC5lbXB0eTtcbiAgfVxuXG4gIC8vaW52YWxpZGF0ZU1vbnN0ZXJzKCkgeyB0aGlzLl9tb25zdGVyc0ludmFsaWRhdGVkID0gdHJ1ZTsgfVxuXG4gIGluQm91bmRzKHBvczogUG9zKTogYm9vbGVhbiB7XG4gICAgLy8gcmV0dXJuIGluQm91bmRzKHBvcywgdGhpcy5oZWlnaHQsIHRoaXMud2lkdGgpO1xuICAgIHJldHVybiAocG9zICYgMTUpIDwgdGhpcy53aWR0aCAmJiBwb3MgPj0gMCAmJiBwb3MgPj4+IDQgPCB0aGlzLmhlaWdodDtcbiAgfVxuXG4gIC8vIGlzRml4ZWQocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdGhpcy5fZml4ZWQuaGFzKHBvcyk7XG4gIC8vIH1cblxuICAvKipcbiAgICogRm9yY2Utb3ZlcndyaXRlcyB0aGUgZ2l2ZW4gcmFuZ2Ugb2Ygc2NyZWVucy4gIERvZXMgdmFsaWRpdHkgY2hlY2tpbmdcbiAgICogb25seSBhdCB0aGUgZW5kLiAgRG9lcyBub3QgZG8gYW55dGhpbmcgd2l0aCBmZWF0dXJlcywgc2luY2UgdGhleSdyZVxuICAgKiBvbmx5IHNldCBpbiBsYXRlciBwYXNzZXMgKGkuZS4gc2h1ZmZsZSwgd2hpY2ggaXMgbGFzdCkuXG4gICAqL1xuICBzZXQyZChwb3M6IFBvcyxcbiAgICAgICAgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE9wdGlvbmFsPE1ldGFzY3JlZW4+Pj4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiBzY3JlZW5zKSB7XG4gICAgICBsZXQgZHggPSAwO1xuICAgICAgZm9yIChjb25zdCBzY3Igb2Ygcm93KSB7XG4gICAgICAgIGlmIChzY3IpIHRoaXMuc2V0KHBvcyArIGR4LCBzY3IpO1xuICAgICAgICBkeCsrO1xuICAgICAgfVxuICAgICAgcG9zICs9IDE2O1xuICAgIH1cbiAgICAvLyByZXR1cm4gdGhpcy52ZXJpZnkocG9zMCwgc2NyZWVucy5sZW5ndGgsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIE1hdGgubWF4KC4uLnNjcmVlbnMubWFwKHIgPT4gci5sZW5ndGgpKSk7XG4gICAgLy8gVE9ETyAtIHRoaXMgaXMga2luZCBvZiBicm9rZW4uLi4gOi0oXG4gICAgLy8gcmV0dXJuIHRoaXMudmFsaWRhdGUoKTtcbiAgICAvL3JldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqIENoZWNrIGFsbCB0aGUgY3VycmVudGx5IGludmFsaWRhdGVkIGVkZ2VzLCB0aGVuIGNsZWFycyBpdC4gKi9cbiAgdmFsaWRhdGUoKTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBkaXIgb2YgWzAsIDFdKSB7XG4gICAgICBmb3IgKGxldCB5ID0gZGlyID8gMCA6IDE7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICAgIGZvciAobGV0IHggPSBkaXI7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBwb3MwOiBQb3MgPSB5IDw8IDQgfCB4O1xuICAgICAgICAgIGNvbnN0IHNjcjAgPSB0aGlzLl9zY3JlZW5zW3BvczBdO1xuICAgICAgICAgIGNvbnN0IHBvczE6IFBvcyA9IHBvczAgLSAoZGlyID8gMSA6IDE2KTtcbiAgICAgICAgICBjb25zdCBzY3IxID0gdGhpcy5fc2NyZWVuc1twb3MxXTtcbiAgICAgICAgICBpZiAoc2NyMC5pc0VtcHR5KCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChzY3IxLmlzRW1wdHkoKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKCFzY3IwLmNoZWNrTmVpZ2hib3Ioc2NyMSwgZGlyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZvcm1hdCgnYmFkIG5laWdoYm9yICVzICglMDJ4KSAlcyAlcyAoJTAyeCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3IxLm5hbWUsIHBvczEsIERJUl9OQU1FW2Rpcl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcjAubmFtZSwgcG9zMCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHNwbGljZUNvbHVtbnMobGVmdDogbnVtYmVyLCBkZWxldGVkOiBudW1iZXIsIGluc2VydGVkOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE1ldGFzY3JlZW4+Pikge1xuICAgIC8vIEZpcnN0IGFkanVzdCB0aGUgc2NyZWVucy5cbiAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuX3NjcmVlbnMubGVuZ3RoOyBwICs9IDE2KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmNvcHlXaXRoaW4ocCArIGxlZnQgKyBpbnNlcnRlZCwgcCArIGxlZnQgKyBkZWxldGVkLCBwICsgMTApO1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UocCArIGxlZnQsIGluc2VydGVkLCAuLi5zY3JlZW5zW3AgPj4gNF0pO1xuICAgIH1cbiAgICAvLyBVcGRhdGUgZGltZW5zaW9ucyBhbmQgYWNjb3VudGluZ1xuICAgIGNvbnN0IGRlbHRhID0gaW5zZXJ0ZWQgLSBkZWxldGVkO1xuICAgIHRoaXMud2lkdGggKz0gZGVsdGE7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICAgIC8vIE1vdmUgcmVsZXZhbnQgZXhpdHNcbiAgICBjb25zdCBtb3ZlOiBbUG9zLCBDb25uZWN0aW9uVHlwZSwgUG9zLCBDb25uZWN0aW9uVHlwZV1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHggPSBwb3MgJiAweGY7XG4gICAgICBpZiAoeCA8IGxlZnQgKyBkZWxldGVkKSB7XG4gICAgICAgIGlmICh4ID49IGxlZnQpIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG1vdmUucHVzaChbcG9zLCB0eXBlLCBwb3MgKyBkZWx0YSwgdHlwZV0pO1xuICAgIH1cbiAgICB0aGlzLm1vdmVFeGl0cyguLi5tb3ZlKTtcbiAgICAvLyBNb3ZlIGZsYWdzIGFuZCBzcGF3bnMgaW4gcGFyZW50IGxvY2F0aW9uXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGNvbnN0IHh0MCA9IChsZWZ0ICsgZGVsZXRlZCkgPDwgNDtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHBhcmVudC5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi54dCA8IHh0MCkgY29udGludWU7XG4gICAgICBzcGF3bi54dCAtPSAoZGVsdGEgPDwgNCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZmxhZyBvZiBwYXJlbnQuZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnLnhzIDwgbGVmdCArIGRlbGV0ZWQpIHtcbiAgICAgICAgaWYgKGZsYWcueHMgPj0gbGVmdCkgZmxhZy5zY3JlZW4gPSAweGZmO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZsYWcueHMgLT0gZGVsdGE7XG4gICAgfVxuICAgIHBhcmVudC5mbGFncyA9IHBhcmVudC5mbGFncy5maWx0ZXIoZiA9PiBmLnNjcmVlbiAhPT0gMHhmZik7XG5cbiAgICAvLyBUT0RPIC0gbW92ZSBwaXRzPz9cblxuICB9XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyBFeGl0IGhhbmRsaW5nXG5cbiAgc2V0RXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUsIHNwZWM6IEV4aXRTcGVjKSB7XG4gICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5sb2NhdGlvbnNbc3BlY1swXSA+Pj4gOF0ubWV0YTtcbiAgICBpZiAoIW90aGVyKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBzZXQgdHdvLXdheSBleGl0IHdpdGhvdXQgbWV0YWApO1xuICAgIHRoaXMuc2V0RXhpdE9uZVdheShwb3MsIHR5cGUsIHNwZWMpO1xuICAgIG90aGVyLnNldEV4aXRPbmVXYXkoc3BlY1swXSAmIDB4ZmYsIHNwZWNbMV0sIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgfVxuICBzZXRFeGl0T25lV2F5KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSwgc3BlYzogRXhpdFNwZWMpIHtcbiAgICAvLyBjb25zdCBwcmV2ID0gdGhpcy5fZXhpdHMuZ2V0KHBvcywgdHlwZSk7XG4gICAgLy8gaWYgKHByZXYpIHtcbiAgICAvLyAgIGNvbnN0IG90aGVyID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZbMF0gPj4+IDhdLm1ldGE7XG4gICAgLy8gICBpZiAob3RoZXIpIG90aGVyLl9leGl0cy5kZWxldGUocHJldlswXSAmIDB4ZmYsIHByZXZbMV0pO1xuICAgIC8vIH1cbiAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBzcGVjKTtcbiAgfVxuICBkZWxldGVFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSkge1xuICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICB9XG5cbiAgZ2V0RXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUpOiBFeGl0U3BlY3x1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9leGl0cy5nZXQocG9zLCB0eXBlKTtcbiAgfVxuXG4gIGV4aXRzKCk6IEl0ZXJhYmxlPHJlYWRvbmx5IFtQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlY10+IHtcbiAgICByZXR1cm4gdGhpcy5fZXhpdHM7XG4gIH1cblxuICAvLyBUT0RPIC0gY291bnRlZCBjYW5kaWRhdGVzP1xuICBleGl0Q2FuZGlkYXRlcyh0eXBlOiBDb25uZWN0aW9uVHlwZSk6IE1ldGFzY3JlZW5bXSB7XG4gICAgLy8gVE9ETyAtIGZpZ3VyZSBvdXQgYSB3YXkgdG8gdXNlIHRoZSBkb3VibGUtc3RhaXJjYXNlPyAgaXQgd29uJ3RcbiAgICAvLyBoYXBwZW4gY3VycmVudGx5IGJlY2F1c2UgaXQncyBmaXhlZCwgc28gaXQncyBleGNsdWRlZC4uLi4/XG4gICAgY29uc3QgaGFzRXhpdDogTWV0YXNjcmVlbltdID0gW107XG4gICAgZm9yIChjb25zdCBzY3Igb2YgdGhpcy50aWxlc2V0KSB7XG4gICAgICBpZiAoc2NyLmRhdGEuZXhpdHM/LnNvbWUoZSA9PiBlLnR5cGUgPT09IHR5cGUpKSBoYXNFeGl0LnB1c2goc2NyKTtcbiAgICB9XG4gICAgcmV0dXJuIGhhc0V4aXQ7XG4gIH1cblxuICAvLyBUT0RPIC0gc2hvcnQgdnMgZnVsbD9cbiAgc2hvdygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgbGV0IGxpbmUgPSBbXTtcbiAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgbGluZS5wdXNoKHgudG9TdHJpbmcoMTYpKTtcbiAgICB9XG4gICAgbGluZXMucHVzaCgnICAgJyArIGxpbmUuam9pbignICAnKSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCByID0gMDsgciA8IDM7IHIrKykge1xuICAgICAgICBsaW5lID0gW3IgPT09IDEgPyB5LnRvU3RyaW5nKDE2KSA6ICcgJywgJyAnXTtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLl9zY3JlZW5zW3kgPDwgNCB8IHhdO1xuICAgICAgICAgIGxpbmUucHVzaChzY3JlZW4/LmRhdGEuaWNvbj8uZnVsbFtyXSA/PyAociA9PT0gMSA/ICcgPyAnIDogJyAgICcpKTtcbiAgICAgICAgfVxuICAgICAgICBsaW5lcy5wdXNoKGxpbmUuam9pbignJykpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICBzY3JlZW5OYW1lcygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBsZXQgbGluZSA9IFtdO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XTtcbiAgICAgICAgbGluZS5wdXNoKHNjcmVlbj8ubmFtZSk7XG4gICAgICB9XG4gICAgICBsaW5lcy5wdXNoKGxpbmUuam9pbignICcpKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgdHJhdmVyc2Uob3B0czogVHJhdmVyc2VPcHRzID0ge30pOiBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4ge1xuICAgIC8vIFJldHVybnMgYSBtYXAgZnJvbSB1bmlvbmZpbmQgcm9vdCB0byBhIGxpc3Qgb2YgYWxsIHJlYWNoYWJsZSB0aWxlcy5cbiAgICAvLyBBbGwgZWxlbWVudHMgb2Ygc2V0IGFyZSBrZXlzIHBvaW50aW5nIHRvIHRoZSBzYW1lIHZhbHVlIHJlZi5cbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IGNvbm5lY3Rpb25UeXBlID0gKG9wdHMuZmxpZ2h0ID8gMiA6IDApIHwgKG9wdHMubm9GbGFnZ2VkID8gMSA6IDApO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG9wdHMud2l0aD8uZ2V0KHBvcykgPz8gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNjci5jb25uZWN0aW9uc1tjb25uZWN0aW9uVHlwZV0pIHtcbiAgICAgICAgaWYgKCFzZWdtZW50Lmxlbmd0aCkgY29udGludWU7IC8vIGUuZy4gZW1wdHlcbiAgICAgICAgLy8gQ29ubmVjdCB3aXRoaW4gZWFjaCBzZWdtZW50XG4gICAgICAgIHVmLnVuaW9uKHNlZ21lbnQubWFwKGMgPT4gKHBvcyA8PCA4KSArIGMpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KCk7XG4gICAgY29uc3Qgc2V0cyA9IHVmLnNldHMoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHNldCA9IHNldHNbaV07XG4gICAgICBmb3IgKGNvbnN0IGVsZW0gb2Ygc2V0KSB7XG4gICAgICAgIG1hcC5zZXQoZWxlbSwgc2V0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbWFwO1xuICB9ICBcblxuICAvKiogQHBhcmFtIGVkZ2UgQSB2YWx1ZSBmcm9tIGEgdHJhdmVyc2Ugc2V0LiAqL1xuICBleGl0VHlwZShlZGdlOiBudW1iZXIpOiBDb25uZWN0aW9uVHlwZXx1bmRlZmluZWQge1xuICAgIGlmICgoZWRnZSAmIDB4ZjApICE9PSAweGUwKSByZXR1cm47XG4gICAgY29uc3QgcG9zID0gZWRnZSA+Pj4gODtcbiAgICBjb25zdCBzY3IgPSB0aGlzLmdldChwb3MpO1xuICAgIGNvbnN0IHR5cGUgPSBzY3IuZGF0YS5leGl0cz8uW2VkZ2UgJiAweGZdLnR5cGU7XG4gICAgaWYgKCF0eXBlPy5zdGFydHNXaXRoKCdlZGdlOicpKSByZXR1cm4gdHlwZTtcbiAgICAvLyBtYXkgbm90IGFjdHVhbGx5IGJlIGFuIGV4aXQuXG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOnRvcCcgJiYgKHBvcyA+Pj4gNCkpIHJldHVybjtcbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiAocG9zID4+PiA0KSA9PT0gdGhpcy5oZWlnaHQgLSAxKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmxlZnQnICYmIChwb3MgJiAweGYpKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgKHBvcyAmIDB4ZikgPT09IHRoaXMud2lkdGggLSAxKSByZXR1cm47XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGVkZ2UgQSB2YWx1ZSBmcm9tIGEgdHJhdmVyc2Ugc2V0LlxuICAgKiBAcmV0dXJuIEFuIFl5WHggcG9zaXRpb24gZm9yIHRoZSBnaXZlbiBwb2ksIGlmIGl0IGV4aXN0cy5cbiAgICovXG4gIHBvaVRpbGUoZWRnZTogbnVtYmVyKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRhY2ggYW4gZXhpdC9lbnRyYW5jZSBwYWlyIGluIHR3byBkaXJlY3Rpb25zLlxuICAgKiBBbHNvIHJlYXR0YWNoZXMgdGhlIGZvcm1lciBvdGhlciBlbmRzIG9mIGVhY2ggdG8gZWFjaCBvdGhlci5cbiAgICovXG4gIGF0dGFjaChzcmNQb3M6IFBvcywgZGVzdDogTWV0YWxvY2F0aW9uLCBkZXN0UG9zOiBQb3MsXG4gICAgICAgICBzcmNUeXBlPzogQ29ubmVjdGlvblR5cGUsIGRlc3RUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXNyY1R5cGUpIHNyY1R5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbUV4aXRzKHNyY1Bvcyk7XG4gICAgaWYgKCFkZXN0VHlwZSkgZGVzdFR5cGUgPSBkZXN0LnBpY2tUeXBlRnJvbUV4aXRzKGRlc3RQb3MpO1xuXG4gICAgLy8gVE9ETyAtIHdoYXQgaWYgbXVsdGlwbGUgcmV2ZXJzZXM/ICBlLmcuIGNvcmRlbCBlYXN0L3dlc3Q/XG4gICAgLy8gICAgICAtIGNvdWxkIGRldGVybWluZSBpZiB0aGlzIGFuZC9vciBkZXN0IGhhcyBhbnkgc2VhbWxlc3MuXG4gICAgLy8gTm86IGluc3RlYWQsIGRvIGEgcG9zdC1wcm9jZXNzLiAgT25seSBjb3JkZWwgbWF0dGVycywgc28gZ29cbiAgICAvLyB0aHJvdWdoIGFuZCBhdHRhY2ggYW55IHJlZHVuZGFudCBleGl0cy5cblxuICAgIGNvbnN0IGRlc3RUaWxlID0gZGVzdC5pZCA8PCA4IHwgZGVzdFBvcztcbiAgICBjb25zdCBwcmV2RGVzdCA9IHRoaXMuX2V4aXRzLmdldChzcmNQb3MsIHNyY1R5cGUpITtcbiAgICBpZiAocHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2RGVzdFRpbGUsIHByZXZEZXN0VHlwZV0gPSBwcmV2RGVzdDtcbiAgICAgIGlmIChwcmV2RGVzdFRpbGUgPT09IGRlc3RUaWxlICYmIHByZXZEZXN0VHlwZSA9PT0gZGVzdFR5cGUpIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcHJldlNyYyA9IGRlc3QuX2V4aXRzLmdldChkZXN0UG9zLCBkZXN0VHlwZSkhO1xuICAgIHRoaXMuX2V4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdKTtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFBvcywgZGVzdFR5cGUsIFt0aGlzLmlkIDw8IDggfCBzcmNQb3MsIHNyY1R5cGVdKTtcbiAgICAvLyBhbHNvIGhvb2sgdXAgcHJldmlvdXMgcGFpclxuICAgIGlmIChwcmV2U3JjICYmIHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldkRlc3RUaWxlLCBwcmV2RGVzdFR5cGVdID0gcHJldkRlc3Q7XG4gICAgICBjb25zdCBbcHJldlNyY1RpbGUsIHByZXZTcmNUeXBlXSA9IHByZXZTcmM7XG4gICAgICBjb25zdCBwcmV2U3JjTWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2U3JjVGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIGNvbnN0IHByZXZEZXN0TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2RGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBwcmV2U3JjTWV0YS5fZXhpdHMuc2V0KHByZXZTcmNUaWxlICYgMHhmZiwgcHJldlNyY1R5cGUsIHByZXZEZXN0KTtcbiAgICAgIHByZXZEZXN0TWV0YS5fZXhpdHMuc2V0KHByZXZEZXN0VGlsZSAmIDB4ZmYsIHByZXZEZXN0VHlwZSwgcHJldlNyYyk7XG4gICAgfSBlbHNlIGlmIChwcmV2U3JjIHx8IHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldlRpbGUsIHByZXZUeXBlXSA9IHByZXZTcmMgfHwgcHJldkRlc3Q7XG4gICAgICBjb25zdCBwcmV2TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIHByZXZNZXRhLl9leGl0cy5kZWxldGUocHJldlRpbGUgJiAweGZmLCBwcmV2VHlwZSk7ICAgICAgXG4gICAgfVxuICB9XG5cbiAgcGlja1R5cGVGcm9tRXhpdHMocG9zOiBQb3MpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgY29uc3QgdHlwZXMgPSBbLi4udGhpcy5fZXhpdHMucm93KHBvcykua2V5cygpXTtcbiAgICBpZiAoIXR5cGVzLmxlbmd0aCkgcmV0dXJuIHRoaXMucGlja1R5cGVGcm9tU2NyZWVucyhwb3MpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHNpbmdsZSB0eXBlIGZvciAke2hleChwb3MpfTogWyR7dHlwZXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlc1swXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbiBleGl0IGZyb20gb25lIHBvcy90eXBlIHRvIGFub3RoZXIuXG4gICAqIEFsc28gdXBkYXRlcyB0aGUgbWV0YWxvY2F0aW9uIG9uIHRoZSBvdGhlciBlbmQgb2YgdGhlIGV4aXQuXG4gICAqIFRoaXMgc2hvdWxkIHR5cGljYWxseSBiZSBkb25lIGF0b21pY2FsbHkgaWYgcmVidWlsZGluZyBhIG1hcC5cbiAgICovXG4gIC8vIFRPRE8gLSByZWJ1aWxkaW5nIGEgbWFwIGludm9sdmVzIG1vdmluZyB0byBhIE5FVyBtZXRhbG9jYXRpb24uLi5cbiAgLy8gICAgICAtIGdpdmVuIHRoaXMsIHdlIG5lZWQgYSBkaWZmZXJlbnQgYXBwcm9hY2g/XG4gIG1vdmVFeGl0cyguLi5tb3ZlczogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIExvY1BvcywgQ29ubmVjdGlvblR5cGVdPikge1xuICAgIGNvbnN0IG5ld0V4aXRzOiBBcnJheTxbUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgW29sZFBvcywgb2xkVHlwZSwgbmV3UG9zLCBuZXdUeXBlXSBvZiBtb3Zlcykge1xuICAgICAgY29uc3QgZGVzdEV4aXQgPSB0aGlzLl9leGl0cy5nZXQob2xkUG9zLCBvbGRUeXBlKSE7XG4gICAgICBjb25zdCBbZGVzdFRpbGUsIGRlc3RUeXBlXSA9IGRlc3RFeGl0O1xuICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgIFt0aGlzLmlkIDw8IDggfCBuZXdQb3MsIG5ld1R5cGVdKTtcbiAgICAgIG5ld0V4aXRzLnB1c2goW25ld1BvcywgbmV3VHlwZSwgZGVzdEV4aXRdKTtcbiAgICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShvbGRQb3MsIG9sZFR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIGV4aXRdIG9mIG5ld0V4aXRzKSB7XG4gICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gIH1cblxuICBtb3ZlRXhpdChwcmV2OiBQb3MsIG5leHQ6IFBvcyxcbiAgICAgICAgICAgcHJldlR5cGU/OiBDb25uZWN0aW9uVHlwZSwgbmV4dFR5cGU/OiBDb25uZWN0aW9uVHlwZSkge1xuICAgIGlmICghcHJldlR5cGUpIHByZXZUeXBlID0gdGhpcy5waWNrVHlwZUZyb21FeGl0cyhwcmV2KTtcbiAgICBpZiAoIW5leHRUeXBlKSBuZXh0VHlwZSA9IHRoaXMucGlja1R5cGVGcm9tU2NyZWVucyhuZXh0KTtcbiAgICBjb25zdCBkZXN0RXhpdCA9IHRoaXMuX2V4aXRzLmdldChwcmV2LCBwcmV2VHlwZSkhO1xuICAgIGNvbnN0IFtkZXN0VGlsZSwgZGVzdFR5cGVdID0gZGVzdEV4aXQ7XG4gICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgW3RoaXMuaWQgPDwgOCB8IG5leHQsIG5leHRUeXBlXSk7XG4gICAgdGhpcy5fZXhpdHMuc2V0KG5leHQsIG5leHRUeXBlLCBkZXN0RXhpdCk7XG4gICAgdGhpcy5fZXhpdHMuZGVsZXRlKHByZXYsIHByZXZUeXBlKTtcbiAgfVxuXG4gIG1vdmVFeGl0c0FuZFBpdHNUbyhvdGhlcjogTWV0YWxvY2F0aW9uKSB7XG4gICAgY29uc3QgbW92ZWQgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBvdGhlci5hbGxQb3MoKSkge1xuICAgICAgaWYgKCFvdGhlci5nZXQocG9zKS5kYXRhLmRlbGV0ZSkge1xuICAgICAgICBtb3ZlZC5hZGQocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGlmICghbW92ZWQuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF0ubWV0YTtcbiAgICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLCBbb3RoZXIuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICAgICAgb3RoZXIuX2V4aXRzLnNldChwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdKTtcbiAgICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtmcm9tLCB0b10gb2YgdGhpcy5fcGl0cykge1xuICAgICAgaWYgKCFtb3ZlZC5oYXMoZnJvbSkpIGNvbnRpbnVlO1xuICAgICAgb3RoZXIuX3BpdHMuc2V0KGZyb20sIHRvKTtcbiAgICAgIHRoaXMuX3BpdHMuZGVsZXRlKGZyb20pO1xuICAgIH1cbiAgfVxuXG4gIHBpY2tUeXBlRnJvbVNjcmVlbnMocG9zOiBQb3MpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgY29uc3QgZXhpdHMgPSB0aGlzLl9zY3JlZW5zW3Bvc10uZGF0YS5leGl0cztcbiAgICBjb25zdCB0eXBlcyA9IChleGl0cyA/PyBbXSkubWFwKGUgPT4gZS50eXBlKTtcbiAgICBpZiAodHlwZXMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHNpbmdsZSB0eXBlIGZvciAke2hleChwb3MpfTogWyR7dHlwZXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlc1swXTtcbiAgfVxuXG4gIHRyYW5zZmVyRmxhZ3Mob3JpZzogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIENvcHkgb3ZlciB0aGUgZnJlZSBmbGFnc1xuICAgIHRoaXMuZnJlZUZsYWdzID0gbmV3IFNldChvcmlnLmZyZWVGbGFncyk7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIGN1c3RvbSBmbGFncy5cbiAgICBjb25zdCBjdXN0b21zID0gbmV3IERlZmF1bHRNYXA8TWV0YXNjcmVlbiwgRmxhZ1tdPigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBbcG9zLCBmbGFnXSBvZiBvcmlnLmN1c3RvbUZsYWdzKSB7XG4gICAgICBjdXN0b21zLmdldChvcmlnLl9zY3JlZW5zW3Bvc10pLnB1c2goZmxhZyk7XG4gICAgfVxuICAgIC8vIFNodWZmbGUgdGhlbSBqdXN0IGluIGNhc2UgdGhleSdyZSBub3QgYWxsIHRoZSBzYW1lLi4uXG4gICAgLy8gVE9ETyAtIGZvciBzZWFtbGVzcyBwYWlycywgb25seSBzaHVmZmxlIG9uY2UsIHRoZW4gY29weS5cbiAgICBmb3IgKGNvbnN0IGZsYWdzIG9mIGN1c3RvbXMudmFsdWVzKCkpIHJhbmRvbS5zaHVmZmxlKGZsYWdzKTtcbiAgICAvLyBGaW5kIGFsbCB0aGUgY3VzdG9tLWZsYWcgc2NyZWVucyBpbiB0aGUgbmV3IGxvY2F0aW9uLlxuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGlmIChzY3IuZmxhZz8uc3RhcnRzV2l0aCgnY3VzdG9tJykpIHtcbiAgICAgICAgY29uc3QgZmxhZyA9IGN1c3RvbXMuZ2V0KHNjcikucG9wKCk7XG4gICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZmxhZyBmb3IgJHtzY3IubmFtZX0gYXQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX0gQCR7aGV4KHBvcyl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXN0b21GbGFncy5zZXQocG9zLCBmbGFnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogUmVhZCBwaXRzIGZyb20gdGhlIG9yaWdpbmFsLiAgVGhlIGRlc3RpbmF0aW9uIG11c3QgYmUgc2h1ZmZsZWQgYWxyZWFkeS4gKi9cbiAgdHJhbnNmZXJQaXRzKG9yaWc6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBGaW5kIGFsbCBwaXQgZGVzdGluYXRpb25zLlxuICAgIHRoaXMuX3BpdHMuY2xlYXIoKTtcbiAgICBjb25zdCBkZXN0cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgWywgZGVzdF0gb2Ygb3JpZy5fcGl0cykge1xuICAgICAgZGVzdHMuYWRkKHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0ID4+PiA4XS5pZCk7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgZXhpc3RpbmcgcGl0cy4gIFNvcnQgYnkgbG9jYXRpb24sIFtwaXQgcG9zLCBkZXN0IHBvc11cbiAgICBjb25zdCBwaXRzID0gbmV3IERlZmF1bHRNYXA8TWV0YWxvY2F0aW9uLCBBcnJheTxbUG9zLCBQb3NdPj4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuZ2V0KHBvcyk7XG4gICAgICBpZiAoIXNjci5oYXNGZWF0dXJlKCdwaXQnKSkgY29udGludWU7XG4gICAgICAvLyBGaW5kIHRoZSBuZWFyZXN0IGV4aXQgdG8gb25lIG9mIHRob3NlIGRlc3RpbmF0aW9uczogW2RlbHRhLCBsb2MsIGRpc3RdXG4gICAgICBsZXQgY2xvc2VzdDogW1BvcywgTWV0YWxvY2F0aW9uLCBudW1iZXJdID0gWy0xLCB0aGlzLCBJbmZpbml0eV07XG4gICAgICBmb3IgKGNvbnN0IFtleGl0UG9zLCwgW2Rlc3RdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgICBjb25zdCBkaXN0ID0gZGlzdGFuY2UocG9zLCBleGl0UG9zKTtcbiAgICAgICAgaWYgKGRlc3RzLmhhcyhkZXN0ID4+PiA4KSAmJiBkaXN0IDwgY2xvc2VzdFsyXSkge1xuICAgICAgICAgIGNvbnN0IGRsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdCA+Pj4gOF0ubWV0YTtcbiAgICAgICAgICBjb25zdCBkcG9zID0gZGVzdCAmIDB4ZmY7XG4gICAgICAgICAgY2xvc2VzdCA9IFthZGREZWx0YShwb3MsIGRwb3MsIGV4aXRQb3MsIGRsb2MpLCBkbG9jLCBkaXN0XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNsb3Nlc3RbMF0gPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGV4aXQgZm91bmRgKTtcbiAgICAgIHBpdHMuZ2V0KGNsb3Nlc3RbMV0pLnB1c2goW3BvcywgY2xvc2VzdFswXV0pO1xuICAgIH1cblxuICAgIC8vIEZvciBlYWNoIGRlc3RpbmF0aW9uIGxvY2F0aW9uLCBsb29rIGZvciBzcGlrZXMsIHRoZXNlIHdpbGwgb3ZlcnJpZGVcbiAgICAvLyBhbnkgcG9zaXRpb24tYmFzZWQgZGVzdGluYXRpb25zLlxuICAgIGZvciAoY29uc3QgW2Rlc3QsIGxpc3RdIG9mIHBpdHMpIHtcbiAgICAgIC8vIHZlcnRpY2FsLCBob3Jpem9udGFsXG4gICAgICBjb25zdCBlbGlnaWJsZTogUG9zW11bXSA9IFtbXSwgW11dO1xuICAgICAgY29uc3Qgc3Bpa2VzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIGRlc3QuYWxsUG9zKCkpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gZGVzdC5nZXQocG9zKTtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyaXZlcicpIHx8IHNjci5oYXNGZWF0dXJlKCdlbXB0eScpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZWRnZXMgPVxuICAgICAgICAgICAgKHNjci5kYXRhLmVkZ2VzIHx8ICcnKS5zcGxpdCgnJykubWFwKHggPT4geCA9PT0gJyAnID8gJycgOiB4KTtcbiAgICAgICAgaWYgKGVkZ2VzWzBdICYmIGVkZ2VzWzJdKSBlbGlnaWJsZVswXS5wdXNoKHBvcyk7XG4gICAgICAgIC8vIE5PVEU6IHdlIGNsYW1wIHRoZSB0YXJnZXQgWCBjb29yZHMgc28gdGhhdCBzcGlrZSBzY3JlZW5zIGFyZSBhbGwgZ29vZFxuICAgICAgICAvLyB0aGlzIHByZXZlbnRzIGVycm9ycyBmcm9tIG5vdCBoYXZpbmcgYSB2aWFibGUgZGVzdGluYXRpb24gc2NyZWVuLlxuICAgICAgICBpZiAoKGVkZ2VzWzFdICYmIGVkZ2VzWzNdKSB8fCBzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgICBlbGlnaWJsZVsxXS5wdXNoKHBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkge1xuICAgICAgICAgIHNwaWtlcy5zZXQocG9zLCBbLi4uZWRnZXNdLmZpbHRlcihjID0+IGMgPT09ICdzJykubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfVxuLy9jb25zb2xlLmxvZyhgZGVzdDpcXG4ke2Rlc3Quc2hvdygpfVxcbmVsaWdpYmxlOiAke2VsaWdpYmxlLm1hcChlID0+IGUubWFwKGggPT4gaC50b1N0cmluZygxNikpLmpvaW4oJywnKSkuam9pbignICAnKX1gKTtcbiAgICAgIC8vIGZpbmQgdGhlIGNsb3Nlc3QgZGVzdGluYXRpb24gZm9yIHRoZSBmaXJzdCBwaXQsIGtlZXAgYSBydW5uaW5nIGRlbHRhLlxuICAgICAgbGV0IGRlbHRhOiBbUG9zLCBQb3NdID0gWzAsIDBdO1xuICAgICAgZm9yIChjb25zdCBbdXBzdGFpcnMsIGRvd25zdGFpcnNdIG9mIGxpc3QpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5nZXQodXBzdGFpcnMpO1xuICAgICAgICBjb25zdCBlZGdlcyA9IHNjci5kYXRhLmVkZ2VzIHx8ICcnO1xuICAgICAgICBjb25zdCBkaXIgPSBlZGdlc1swXSA9PT0gJ2MnICYmIGVkZ2VzWzJdID09PSAnYycgPyAwIDogMVxuICAgICAgICAvLyBlbGlnaWJsZSBkZXN0IHRpbGUsIGRpc3RhbmNlXG4gICAgICAgIGxldCBjbG9zZXN0OiBbUG9zLCBudW1iZXIsIG51bWJlcl0gPSBbLTEsIEluZmluaXR5LCAwXTtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gYWRkRGVsdGEoZG93bnN0YWlycywgZGVsdGFbMF0sIGRlbHRhWzFdLCBkZXN0KTtcbiAgICAgICAgZm9yIChjb25zdCBwb3Mgb2YgZWxpZ2libGVbZGlyXSkgeyAvL2ZvciAobGV0IGkgPSAwOyBpIDwgZWxpZ2libGVbZGlyXS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIC8vICAgICAgICAgIGNvbnN0IHBvcyA9IGVsaWdpYmxlW2Rpcl1baV07XG4gICAgICAgICAgY29uc3Qgc3Bpa2VDb3VudCA9IHNwaWtlcy5nZXQocG9zKSA/PyAwO1xuICAgICAgICAgIGlmIChzcGlrZUNvdW50IDwgY2xvc2VzdFsyXSkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgZGlzdCA9IGRpc3RhbmNlKHRhcmdldCwgcG9zKTtcbiAgICAgICAgICBpZiAoZGlzdCA8IGNsb3Nlc3RbMV0pIHtcbiAgICAgICAgICAgIGNsb3Nlc3QgPSBbcG9zLCBkaXN0LCBzcGlrZUNvdW50XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW5kUG9zID0gY2xvc2VzdFswXTtcbiAgICAgICAgaWYgKGVuZFBvcyA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gZWxpZ2libGUgZGVzdGApO1xuICAgICAgICBkZWx0YSA9IFtlbmRQb3MsIHRhcmdldF07XG4gICAgICAgIHRoaXMuX3BpdHMuc2V0KHVwc3RhaXJzLCBkZXN0LmlkIDw8IDggfCBlbmRQb3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlcyBvd25lcnNoaXAgb2YgZXhpdHMgZnJvbSBhbm90aGVyIG1ldGFsb2NhdGlvbiB3aXRoIHRoZSBzYW1lIElELlxuICAgKiBAcGFyYW0ge2ZpeGVkfSBtYXBzIGRlc3RpbmF0aW9uIGxvY2F0aW9uIElEIHRvIHBvcyB3aGVyZSB0aGUgZXhpdCBpcy5cbiAgICovXG4gIHRyYW5zZmVyRXhpdHMob3JpZzogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIERldGVybWluZSBhbGwgdGhlIGVsaWdpYmxlIGV4aXQgc2NyZWVucy5cbiAgICBjb25zdCBleGl0cyA9IG5ldyBEZWZhdWx0TWFwPENvbm5lY3Rpb25UeXBlLCBQb3NbXT4oKCkgPT4gW10pO1xuICAgIGNvbnN0IHNlbGZFeGl0cyA9IG5ldyBEZWZhdWx0TWFwPENvbm5lY3Rpb25UeXBlLCBTZXQ8UG9zPj4oKCkgPT4gbmV3IFNldCgpKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IHt0eXBlfSBvZiBzY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6dG9wJyAmJiAocG9zID4+PiA0KSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0JyAmJiAocG9zICYgMHhmKSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgPj4+IDQpIDwgdGhpcy5oZWlnaHQgLSAxKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnJpZ2h0JyAmJiAocG9zICYgMHhmKSA8IHRoaXMud2lkdGggLSAxKSBjb250aW51ZTtcbiAgICAgICAgZXhpdHMuZ2V0KHR5cGUpLnB1c2gocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBhcnIgb2YgZXhpdHMudmFsdWVzKCkpIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKGFycik7XG4gICAgfVxuICAgIC8vIEZpbmQgYSBtYXRjaCBmb3IgZWFjaCBvcmlnaW5hbCBleGl0LlxuICAgIGZvciAoY29uc3QgW29wb3MsIHR5cGUsIGV4aXRdIG9mIG9yaWcuX2V4aXRzKSB7XG4gICAgICBpZiAoc2VsZkV4aXRzLmdldCh0eXBlKS5oYXMob3BvcykpIGNvbnRpbnVlO1xuICAgICAgLy8gb3BvcyxleGl0IGZyb20gb3JpZ2luYWwgdmVyc2lvbiBvZiB0aGlzIG1ldGFsb2NhdGlvblxuICAgICAgY29uc3QgcG9zID0gZXhpdHMuZ2V0KHR5cGUpLnBvcCgpOyAvLyBhIFBvcyBpbiB0aGlzIG1ldGFsb2NhdGlvblxuICAgICAgaWYgKHBvcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHRyYW5zZmVyIGV4aXQgJHt0eXBlfSBpbiAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX06IG5vIGVsaWdpYmxlIHNjcmVlblxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICAvLyBMb29rIGZvciBhIHJldmVyc2UgZXhpdDogZXhpdCBpcyB0aGUgc3BlYyBmcm9tIG9sZCBtZXRhLlxuICAgICAgLy8gRmluZCB0aGUgbWV0YWxvY2F0aW9uIGl0IHJlZmVycyB0byBhbmQgc2VlIGlmIHRoZSBleGl0XG4gICAgICAvLyBnb2VzIGJhY2sgdG8gdGhlIG9yaWdpbmFsIHBvc2l0aW9uLlxuICAgICAgY29uc3QgZWxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tleGl0WzBdID4+PiA4XS5tZXRhO1xuICAgICAgY29uc3QgZXBvcyA9IGV4aXRbMF0gJiAweGZmO1xuICAgICAgY29uc3QgZXR5cGUgPSBleGl0WzFdO1xuICAgICAgaWYgKGVsb2MgPT09IG9yaWcpIHtcbiAgICAgICAgLy8gU3BlY2lhbCBjYXNlIG9mIGEgc2VsZi1leGl0IChoYXBwZW5zIGluIGh5ZHJhIGFuZCBweXJhbWlkKS5cbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlLCBqdXN0IHBpY2sgYW4gZXhpdCBvZiB0aGUgY29ycmVjdCB0eXBlLlxuICAgICAgICBjb25zdCBucG9zID0gZXhpdHMuZ2V0KGV0eXBlKS5wb3AoKTtcbiAgICAgICAgaWYgKG5wb3MgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlYCk7XG4gICAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIFt0aGlzLmlkIDw8IDggfCBucG9zLCBldHlwZV0pO1xuICAgICAgICB0aGlzLl9leGl0cy5zZXQobnBvcywgZXR5cGUsIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgICAgLy8gQWxzbyBkb24ndCB2aXNpdCB0aGUgb3RoZXIgZXhpdCBsYXRlci5cbiAgICAgICAgc2VsZkV4aXRzLmdldChldHlwZSkuYWRkKGVwb3MpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJldCA9IGVsb2MuX2V4aXRzLmdldChlcG9zLCBldHlwZSkhO1xuICAgICAgaWYgKCFyZXQpIHtcbiAgICAgICAgY29uc3QgZWVsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdFswXSA+Pj4gOF07XG4gICAgICAgIGNvbnNvbGUubG9nKGVsb2MpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGV4aXQgZm9yICR7ZWVsb2N9IGF0ICR7aGV4KGVwb3MpfSAke2V0eXBlfVxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZWxvYy5zaG93KCl9XFxuJHt0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19IGF0ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaGV4KG9wb3MpfSAke3R5cGV9XFxuJHt0aGlzLnNob3coKX1gKTtcbiAgICAgIH1cbiAgICAgIGlmICgocmV0WzBdID4+PiA4KSA9PT0gdGhpcy5pZCAmJiAoKHJldFswXSAmIDB4ZmYpID09PSBvcG9zKSAmJlxuICAgICAgICAgIHJldFsxXSA9PT0gdHlwZSkge1xuICAgICAgICBlbG9jLl9leGl0cy5zZXQoZXBvcywgZXR5cGUsIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBOUENzLCB0cmlnZ2VycywgYW5kIGNoZXN0cyBiYXNlZCBvbiBwcm94aW1pdHkgdG8gc2NyZWVucyxcbiAgICogZXhpdHMsIGFuZCBQT0kuXG4gICAqL1xuICB0cmFuc2ZlclNwYXducyh0aGF0OiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gU3RhcnQgYnkgYnVpbGRpbmcgYSBtYXAgYmV0d2VlbiBleGl0cyBhbmQgc3BlY2lmaWMgc2NyZWVuIHR5cGVzLlxuICAgIGNvbnN0IHJldmVyc2VFeGl0cyA9IG5ldyBNYXA8RXhpdFNwZWMsIFtudW1iZXIsIG51bWJlcl0+KCk7IC8vIG1hcCB0byB5LHhcbiAgICBjb25zdCBwaXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTsgLy8gbWFwcyB0byBkaXIgKDAgPSB2ZXJ0LCAxID0gaG9yaXopXG4gICAgY29uc3Qgc3RhdHVlczogQXJyYXk8W1BvcywgbnVtYmVyXT4gPSBbXTsgLy8gYXJyYXkgb2Ygc3Bhd24gW3NjcmVlbiwgY29vcmRdXG4gICAgLy8gQXJyYXkgb2YgW29sZCB5LCBvbGQgeCwgbmV3IHksIG5ldyB4LCBtYXggZGlzdGFuY2UgKHNxdWFyZWQpXVxuICAgIGNvbnN0IG1hcDogQXJyYXk8W251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCB3YWxsczogQXJyYXk8W251bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCBicmlkZ2VzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIC8vIFBhaXIgdXAgYXJlbmFzLlxuICAgIGNvbnN0IGFyZW5hczogQXJyYXk8W251bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIGxvYy5hbGxQb3MoKSkge1xuICAgICAgICBjb25zdCBzY3IgPSBsb2MuX3NjcmVlbnNbcG9zXTtcbiAgICAgICAgY29uc3QgeSA9IHBvcyAmIDB4ZjA7XG4gICAgICAgIGNvbnN0IHggPSAocG9zICYgMHhmKSA8PCA0O1xuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3BpdCcpICYmIGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIHBpdHMuc2V0KHBvcywgc2NyLmVkZ2VJbmRleCgnYycpID09PSA1ID8gMCA6IDEpO1xuICAgICAgICB9IGVsc2UgaWYgKHNjci5kYXRhLnN0YXR1ZXM/Lmxlbmd0aCAmJiBsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjci5kYXRhLnN0YXR1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHNjci5kYXRhLnN0YXR1ZXNbaV0gPDwgMTI7XG4gICAgICAgICAgICBjb25zdCBwYXJpdHkgPSAoKHBvcyAmIDB4ZikgXiAocG9zID4+PiA0KSBeIGkpICYgMTtcbiAgICAgICAgICAgIGNvbnN0IGNvbCA9IHBhcml0eSA/IDB4NTAgOiAweGEwO1xuICAgICAgICAgICAgc3RhdHVlcy5wdXNoKFtwb3MsIHJvdyB8IGNvbF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobG9jID09PSB0aGlzICYmIHNjci5oYXNGZWF0dXJlKCd3YWxsJykpIHtcbiAgICAgICAgICBpZiAoc2NyLmRhdGEud2FsbCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgd2FsbCBwcm9wYCk7XG4gICAgICAgICAgY29uc3Qgd2FsbCA9IFt5IHwgKHNjci5kYXRhLndhbGwgPj4gNCksIHggfCAoc2NyLmRhdGEud2FsbCAmIDB4ZildO1xuICAgICAgICAgIHdhbGxzLnB1c2god2FsbCBhcyBbbnVtYmVyLCBudW1iZXJdKTtcbiAgICAgICAgICAvLyBTcGVjaWFsLWNhc2UgdGhlIFwiZG91YmxlIGJyaWRnZVwiIGluIGxpbWUgdHJlZSBsYWtlXG4gICAgICAgICAgaWYgKHNjci5kYXRhLnRpbGVzZXRzLmxpbWUpIHdhbGxzLnB1c2goW3dhbGxbMF0gLSAxLCB3YWxsWzFdXSk7XG4gICAgICAgIH0gZWxzZSBpZiAobG9jID09PSB0aGlzICYmIHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge1xuICAgICAgICAgIGlmIChzY3IuZGF0YS53YWxsID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB3YWxsIHByb3BgKTtcbiAgICAgICAgICBicmlkZ2VzLnB1c2goW3kgfCAoc2NyLmRhdGEud2FsbCA+PiA0KSwgeCB8IChzY3IuZGF0YS53YWxsICYgMHhmKV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2NyLmhhc0ZlYXR1cmUoJ2FyZW5hJykpIGNvbnRpbnVlO1xuICAgICAgICBpZiAobG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgYXJlbmFzLnB1c2goW3kgfCA4LCB4IHwgOF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IFtueSwgbnhdID0gYXJlbmFzLnBvcCgpITtcbiAgICAgICAgICBtYXAucHVzaChbeSB8IDgsIHggfCA4LCBueSwgbngsIDE0NF0pOyAvLyAxMiB0aWxlc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobG9jID09PSB0aGlzKSB7IC8vIFRPRE8gLSB0aGlzIGlzIGEgbWVzcywgZmFjdG9yIG91dCB0aGUgY29tbW9uYWxpdHlcbiAgICAgICAgcmFuZG9tLnNodWZmbGUoYXJlbmFzKTtcbiAgICAgICAgcmFuZG9tLnNodWZmbGUoc3RhdHVlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE5vdyBwYWlyIHVwIGV4aXRzLlxuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBleGl0XSBvZiBsb2MuX2V4aXRzKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGxvYy5fc2NyZWVuc1twb3NdO1xuICAgICAgICBjb25zdCBzcGVjID0gc2NyLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IHR5cGUpO1xuICAgICAgICBpZiAoIXNwZWMpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBleGl0OiAke3Njci5uYW1lfSAke3R5cGV9YCk7XG4gICAgICAgIGNvbnN0IHgwID0gcG9zICYgMHhmO1xuICAgICAgICBjb25zdCB5MCA9IHBvcyA+Pj4gNDtcbiAgICAgICAgY29uc3QgeDEgPSBzcGVjLmV4aXRzWzBdICYgMHhmO1xuICAgICAgICBjb25zdCB5MSA9IHNwZWMuZXhpdHNbMF0gPj4+IDQ7XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICByZXZlcnNlRXhpdHMuc2V0KGV4aXQsIFt5MCA8PCA0IHwgeTEsIHgwIDw8IDQgfCB4MV0pO1xuICAgICAgICB9IGVsc2UgaWYgKChleGl0WzBdID4+PiA4KSAhPT0gdGhpcy5pZCkgeyAvLyBza2lwIHNlbGYtZXhpdHNcbiAgICAgICAgICBjb25zdCBbbnksIG54XSA9IHJldmVyc2VFeGl0cy5nZXQoZXhpdCkhO1xuICAgICAgICAgIG1hcC5wdXNoKFt5MCA8PCA0IHwgeTEsIHgwIDw8IDQgfCB4MSwgbnksIG54LCAyNV0pOyAvLyA1IHRpbGVzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gTWFrZSBhIGxpc3Qgb2YgUE9JIGJ5IHByaW9yaXR5ICgwLi41KS5cblxuXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGZpcnN0IHBhcnRpdGlvbmluZyB0aGUgc2NyZWVucyB3aXRoIGltcGFzc2libGVcbiAgICAvLyB3YWxscyBhbmQgcGxhY2luZyBwb2kgaW50byBhcyBtYW55IHNlcGFyYXRlIHBhcnRpdGlvbnMgKGZyb21cbiAgICAvLyBzdGFpcnMvZW50cmFuY2VzKSBhcyBwb3NzaWJsZSA/Pz8gIE9yIG1heWJlIGp1c3Qgd2VpZ2h0IHRob3NlXG4gICAgLy8gaGlnaGVyPyAgZG9uJ3Qgd2FudCB0byBfZm9yY2VfIHRoaW5ncyB0byBiZSBpbmFjY2Vzc2libGUuLi4/XG5cbiAgICBjb25zdCBwcG9pOiBBcnJheTxBcnJheTxbbnVtYmVyLCBudW1iZXJdPj4gPSBbW10sIFtdLCBbXSwgW10sIFtdLCBbXV07XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgZm9yIChjb25zdCBbcCwgZHkgPSAweDcwLCBkeCA9IDB4NzhdIG9mIHNjci5kYXRhLnBvaSA/PyBbXSkge1xuICAgICAgICBjb25zdCB5ID0gKChwb3MgJiAweGYwKSA8PCA0KSArIGR5O1xuICAgICAgICBjb25zdCB4ID0gKChwb3MgJiAweDBmKSA8PCA4KSArIGR4O1xuICAgICAgICBwcG9pW3BdLnB1c2goW3ksIHhdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBwb2kgb2YgcHBvaSkge1xuICAgICAgcmFuZG9tLnNodWZmbGUocG9pKTtcbiAgICB9XG4gICAgY29uc3QgYWxsUG9pID0gWy4uLml0ZXJzLmNvbmNhdCguLi5wcG9pKV07XG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBzcGF3bnMsIGxvb2sgZm9yIE5QQy9jaGVzdC90cmlnZ2VyLlxuICAgIGNvbnN0IGxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHJhbmRvbS5zaHVmZmxlKGxvYy5zcGF3bnMpKSB7XG4gICAgICBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBQTEFURk9STVMuaW5kZXhPZihzcGF3bi5tb25zdGVySWQpO1xuICAgICAgICBpZiAocGxhdGZvcm0gPj0gMCAmJiBwaXRzLnNpemUpIHtcbiAgICAgICAgICBjb25zdCBbW3BvcywgZGlyXV0gPSBwaXRzO1xuICAgICAgICAgIHBpdHMuZGVsZXRlKHBvcyk7XG4gICAgICAgICAgc3Bhd24ubW9uc3RlcklkID0gUExBVEZPUk1TW3BsYXRmb3JtICYgMiB8IGRpcl07XG4gICAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zO1xuICAgICAgICAgIHNwYXduLnRpbGUgPSBkaXIgPyAweDczIDogMHg0NztcbiAgICAgICAgfSBlbHNlIGlmIChzcGF3bi5tb25zdGVySWQgPT09IDB4OGYgJiYgc3RhdHVlcy5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBbc2NyZWVuLCBjb29yZF0gPSBzdGF0dWVzLnBvcCgpITtcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSBzY3JlZW47XG4gICAgICAgICAgc3Bhd24uY29vcmQgPSBjb29yZDtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTsgLy8gdGhlc2UgYXJlIGhhbmRsZWQgZWxzZXdoZXJlLlxuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICBjb25zdCB3YWxsID0gKHNwYXduLndhbGxUeXBlKCkgPT09ICdicmlkZ2UnID8gYnJpZGdlcyA6IHdhbGxzKS5wb3AoKTtcbiAgICAgICAgaWYgKCF3YWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoICR7c3Bhd24ud2FsbFR5cGUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBzY3JlZW5zIGluIG5ldyBtZXRhbG9jYXRpb246ICR7bG9jfVxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3coKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBbeSwgeF0gPSB3YWxsO1xuICAgICAgICBzcGF3bi55dCA9IHk7XG4gICAgICAgIHNwYXduLnh0ID0geDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkgfHwgc3Bhd24uaXNCb3NzKCkgfHwgc3Bhd24uaXNUcmlnZ2VyKCkpIHtcbiAgICAgICAgLy9sZXQgaiA9IDA7XG4gICAgICAgIGxldCBiZXN0ID0gWy0xLCAtMSwgSW5maW5pdHldO1xuICAgICAgICBmb3IgKGNvbnN0IFt5MCwgeDAsIHkxLCB4MSwgZG1heF0gb2YgbWFwKSB7XG4gICAgICAgICAgY29uc3QgZCA9IChzcGF3bi55dCAtIHkwKSAqKiAyICsgKHNwYXduLnh0IC0geDApICoqIDI7XG4gICAgICAgICAgaWYgKGQgPD0gZG1heCAmJiBkIDwgYmVzdFsyXSkge1xuICAgICAgICAgICAgYmVzdCA9IFtzcGF3bi55dCArIHkxIC0geTAsIHNwYXduLnh0ICsgeDEgLSB4MCwgZF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUoYmVzdFsyXSkpIHtcbiAgICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIGFueSBOUENzIHdlIGFscmVhZHkgbW92ZWQgc28gdGhhdCBhbnl0aGluZyB0aGF0J3NcbiAgICAgICAgICAvLyBvbiB0b3Agb2YgaXQgKGkuZS4gZHVhbCBzcGF3bnMpIG1vdmUgYWxvbmcgd2l0aC5cbiAgICAgICAgICAvL2lmIChiZXN0WzJdID4gNCkgbWFwLnB1c2goW3NwYXduLnh0LCBzcGF3bi55dCwgYmVzdFswXSwgYmVzdFsxXSwgNF0pO1xuICAgICAgICAgIC8vIC0gVE9ETyAtIEkgZG9uJ3QgdGhpbmsgd2UgbmVlZCB0aGlzLCBzaW5jZSBhbnkgZnV0dXJlIHNwYXduIHNob3VsZFxuICAgICAgICAgIC8vICAgYmUgcGxhY2VkIGJ5IHRoZSBzYW1lIHJ1bGVzLlxuICAgICAgICAgIFtzcGF3bi55dCwgc3Bhd24ueHRdID0gYmVzdDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gV2Fzbid0IGFibGUgdG8gbWFwIGFuIGFyZW5hIG9yIGV4aXQuICBQaWNrIGEgbmV3IFBPSSwgYnV0IHRyaWdnZXJzIGFuZFxuICAgICAgLy8gYm9zc2VzIGFyZSBpbmVsaWdpYmxlLlxuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpIHx8IHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHBsYWNlICR7bG9jfSAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduLmlzQm9zcygpID8gJ0Jvc3MnIDogJ1RyaWdnZXInfSAke3NwYXduLmhleCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiR7dGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXh0ID0gYWxsUG9pLnNoaWZ0KCk7XG4gICAgICBpZiAoIW5leHQpIHRocm93IG5ldyBFcnJvcihgUmFuIG91dCBvZiBQT0kgZm9yICR7bG9jfWApO1xuICAgICAgY29uc3QgW3ksIHhdID0gbmV4dDtcbiAgICAgIG1hcC5wdXNoKFtzcGF3bi55ID4+PiA0LCBzcGF3bi54ID4+PiA0LCB5ID4+PiA0LCB4ID4+PiA0LCA0XSk7XG4gICAgICBzcGF3bi55ID0geTtcbiAgICAgIHNwYXduLnggPSB4O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIHNlYW1sZXNzIHBhaXIgbG9jYXRpb24sIHN5bmMgdXAgdGhlIGV4aXRzLiAgRm9yIGVhY2ggZXhpdCBvZlxuICAgKiBlaXRoZXIsIGNoZWNrIGlmIGl0J3Mgc3ltbWV0cmljLCBhbmQgaWYgc28sIGNvcHkgaXQgb3ZlciB0byB0aGUgb3RoZXIgc2lkZS5cbiAgICovXG4gIHJlY29uY2lsZUV4aXRzKHRoYXQ6IE1ldGFsb2NhdGlvbikge1xuICAgIGNvbnN0IGFkZDogW01ldGFsb2NhdGlvbiwgUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdW10gPSBbXTtcbiAgICBjb25zdCBkZWw6IFtNZXRhbG9jYXRpb24sIFBvcywgQ29ubmVjdGlvblR5cGVdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIGxvYy5fZXhpdHMpIHtcbiAgICAgICAgaWYgKGRlc3RUeXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+PiA4XTtcbiAgICAgICAgY29uc3QgcmV2ZXJzZSA9IGRlc3QubWV0YS5fZXhpdHMuZ2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUpO1xuICAgICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICAgIGNvbnN0IFtyZXZUaWxlLCByZXZUeXBlXSA9IHJldmVyc2U7XG4gICAgICAgICAgaWYgKChyZXZUaWxlID4+PiA4KSA9PT0gbG9jLmlkICYmIChyZXZUaWxlICYgMHhmZikgPT09IHBvcyAmJlxuICAgICAgICAgICAgICByZXZUeXBlID09PSB0eXBlKSB7XG4gICAgICAgICAgICBhZGQucHVzaChbbG9jID09PSB0aGlzID8gdGhhdCA6IHRoaXMsIHBvcywgdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICBbZGVzdFRpbGUsIGRlc3RUeXBlXV0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGRlbC5wdXNoKFtsb2MsIHBvcywgdHlwZV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsb2MsIHBvcywgdHlwZV0gb2YgZGVsKSB7XG4gICAgICBsb2MuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsb2MsIHBvcywgdHlwZSwgZXhpdF0gb2YgYWRkKSB7XG4gICAgICBsb2MuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgICAvLyB0aGlzLl9leGl0cyA9IG5ldyBUYWJsZShleGl0cyk7XG4gICAgLy8gdGhhdC5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNhdmVzIHRoZSBjdXJyZW50IHN0YXRlIGJhY2sgaW50byB0aGUgdW5kZXJseWluZyBsb2NhdGlvbi5cbiAgICogQ3VycmVudGx5IHRoaXMgb25seSBkZWFscyB3aXRoIGVudHJhbmNlcy9leGl0cy5cbiAgICovXG4gIHdyaXRlKCkge1xuICAgIGNvbnN0IHNyY0xvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBsZXQgc2VhbWxlc3NQYXJ0bmVyOiBMb2NhdGlvbnx1bmRlZmluZWQ7XG4gICAgZm9yIChjb25zdCBbc3JjUG9zLCBzcmNUeXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHRoaXMuX3NjcmVlbnNbc3JjUG9zXTtcbiAgICAgIGNvbnN0IGRlc3QgPSBkZXN0VGlsZSA+PiA4O1xuICAgICAgbGV0IGRlc3RQb3MgPSBkZXN0VGlsZSAmIDB4ZmY7XG4gICAgICBjb25zdCBkZXN0TG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdO1xuICAgICAgY29uc3QgZGVzdE1ldGEgPSBkZXN0TG9jLm1ldGEhO1xuICAgICAgY29uc3QgZGVzdFNjcmVlbiA9IGRlc3RNZXRhLl9zY3JlZW5zW2Rlc3RUaWxlICYgMHhmZl07XG4gICAgICBjb25zdCBzcmNFeGl0ID0gc3JjU2NyZWVuLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IHNyY1R5cGUpO1xuICAgICAgY29uc3QgZGVzdEV4aXQgPSBkZXN0U2NyZWVuLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IGRlc3RUeXBlKTtcbiAgICAgIGlmICghc3JjRXhpdCB8fCAhZGVzdEV4aXQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nICR7c3JjRXhpdCA/ICdkZXN0JyA6ICdzb3VyY2UnfSBleGl0OlxuICBGcm9tOiAke3NyY0xvY30gQCAke2hleChzcmNQb3MpfToke3NyY1R5cGV9ICR7c3JjU2NyZWVuLm5hbWV9XG4gIFRvOiAgICR7ZGVzdExvY30gQCAke2hleChkZXN0UG9zKX06JHtkZXN0VHlwZX0gJHtkZXN0U2NyZWVuLm5hbWV9YCk7XG4gICAgICB9XG4gICAgICAvLyBTZWUgaWYgdGhlIGRlc3QgZW50cmFuY2UgZXhpc3RzIHlldC4uLlxuICAgICAgbGV0IGVudHJhbmNlID0gMHgyMDtcbiAgICAgIGlmIChkZXN0RXhpdC50eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgc2VhbWxlc3NQYXJ0bmVyID0gZGVzdExvYztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBkZXN0Q29vcmQgPSBkZXN0RXhpdC5lbnRyYW5jZTtcbiAgICAgICAgaWYgKGRlc3RDb29yZCA+IDB4ZWZmZikgeyAvLyBoYW5kbGUgc3BlY2lhbCBjYXNlIGluIE9ha1xuICAgICAgICAgIGRlc3RQb3MgKz0gMHgxMDtcbiAgICAgICAgICBkZXN0Q29vcmQgLT0gMHgxMDAwMDtcbiAgICAgICAgfVxuICAgICAgICBlbnRyYW5jZSA9IGRlc3RMb2MuZmluZE9yQWRkRW50cmFuY2UoZGVzdFBvcywgZGVzdENvb3JkKTtcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IHRpbGUgb2Ygc3JjRXhpdC5leGl0cykge1xuICAgICAgICAvL2lmIChzcmNFeGl0LnR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgdGhpcy5oZWlnaHQgPT09IDEpIHRpbGUgLT0gMHgyMDtcbiAgICAgICAgc3JjTG9jLmV4aXRzLnB1c2goRXhpdC5vZih7c2NyZWVuOiBzcmNQb3MsIHRpbGUsIGRlc3QsIGVudHJhbmNlfSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBzcmNMb2Mud2lkdGggPSB0aGlzLl93aWR0aDtcbiAgICBzcmNMb2MuaGVpZ2h0ID0gdGhpcy5faGVpZ2h0O1xuICAgIHNyY0xvYy5zY3JlZW5zID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93OiBudW1iZXJbXSA9IFtdO1xuICAgICAgc3JjTG9jLnNjcmVlbnMucHVzaChyb3cpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl93aWR0aDsgeCsrKSB7XG4gICAgICAgIHJvdy5wdXNoKHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF0uc2lkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3JjTG9jLnRpbGVzZXQgPSB0aGlzLnRpbGVzZXQudGlsZXNldElkO1xuICAgIHNyY0xvYy50aWxlRWZmZWN0cyA9IHRoaXMudGlsZXNldC5lZmZlY3RzKCkuaWQ7XG5cbiAgICAvLyB3cml0ZSBmbGFnc1xuICAgIHNyY0xvYy5mbGFncyA9IFtdO1xuICAgIGNvbnN0IGZyZWVGbGFncyA9IFsuLi50aGlzLmZyZWVGbGFnc107XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1tzY3JlZW5dO1xuICAgICAgbGV0IGZsYWc6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgICBpZiAoc2NyLmRhdGEud2FsbCAhPSBudWxsICYmICFzZWFtbGVzc1BhcnRuZXIpIHtcbiAgICAgICAgZmxhZyA9IGZyZWVGbGFncy5wb3AoKT8uaWQgPz8gdGhpcy5yb20uZmxhZ3MuYWxsb2MoMHgyMDApO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2Fsd2F5cycpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY2FsbScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMucm9tLmZsYWdzLkNhbG1lZEFuZ3J5U2VhLmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2N1c3RvbTpmYWxzZScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMuY3VzdG9tRmxhZ3MuZ2V0KHNjcmVlbik/LmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2N1c3RvbTp0cnVlJykge1xuICAgICAgICBmbGFnID0gdGhpcy5jdXN0b21GbGFncy5nZXQoc2NyZWVuKT8uaWQgPz8gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZDtcbiAgICAgIH1cbiAgICAgIGlmIChmbGFnICE9IG51bGwpIHtcbiAgICAgICAgc3JjTG9jLmZsYWdzLnB1c2goTG9jYXRpb25GbGFnLm9mKHtzY3JlZW4sIGZsYWd9KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgcGl0c1xuICAgIHNyY0xvYy5waXRzID0gW107XG4gICAgZm9yIChjb25zdCBbZnJvbVNjcmVlbiwgdG9dIG9mIHRoaXMuX3BpdHMpIHtcbiAgICAgIGNvbnN0IHRvU2NyZWVuID0gdG8gJiAweGZmO1xuICAgICAgY29uc3QgZGVzdCA9IHRvID4+PiA4O1xuICAgICAgc3JjTG9jLnBpdHMucHVzaChQaXQub2Yoe2Zyb21TY3JlZW4sIHRvU2NyZWVuLCBkZXN0fSkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5PVEU6IHRoaXMgY2FuIG9ubHkgYmUgZG9uZSBBRlRFUiBjb3B5aW5nIHRvIHRoZSBsb2NhdGlvbiFcbiAgcmVwbGFjZU1vbnN0ZXJzKHJhbmRvbTogUmFuZG9tKSB7XG4gICAgaWYgKHRoaXMuaWQgPT09IDB4NjgpIHJldHVybjsgLy8gd2F0ZXIgbGV2ZWxzLCBkb24ndCBwbGFjZSBvbiBsYW5kPz8/XG4gICAgLy8gTW92ZSBhbGwgdGhlIG1vbnN0ZXJzIHRvIHJlYXNvbmFibGUgbG9jYXRpb25zLlxuICAgIGNvbnN0IGxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBjb25zdCBwbGFjZXIgPSBsb2MubW9uc3RlclBsYWNlcihyYW5kb20pO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jLnNwYXducykge1xuICAgICAgaWYgKCFzcGF3bi51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmICghc3Bhd24uaXNNb25zdGVyKCkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbW9uc3RlciA9IGxvYy5yb20ub2JqZWN0c1tzcGF3bi5tb25zdGVySWRdO1xuICAgICAgaWYgKCEobW9uc3RlciBpbnN0YW5jZW9mIE1vbnN0ZXIpKSBjb250aW51ZTtcbiAgICAgIGlmIChtb25zdGVyLmlzVW50b3VjaGVkTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHBvcyA9IHBsYWNlcihtb25zdGVyKTtcbiAgICAgIGlmIChwb3MgPT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBubyB2YWxpZCBsb2NhdGlvbiBmb3IgJHtoZXgobW9uc3Rlci5pZCl9IGluICR7bG9jfWApO1xuICAgICAgICBzcGF3bi51c2VkID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGF3bi5zY3JlZW4gPSBwb3MgPj4+IDg7XG4gICAgICAgIHNwYXduLnRpbGUgPSBwb3MgJiAweGZmO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgVHJhdmVyc2VPcHRzIHtcbiAgLy8gRG8gbm90IHBhc3MgY2VydGFpbiB0aWxlcyBpbiB0cmF2ZXJzZVxuICByZWFkb25seSB3aXRoPzogUmVhZG9ubHlNYXA8UG9zLCBNZXRhc2NyZWVuPjtcbiAgLy8gV2hldGhlciB0byBicmVhayB3YWxscy9mb3JtIGJyaWRnZXNcbiAgcmVhZG9ubHkgbm9GbGFnZ2VkPzogYm9vbGVhbjtcbiAgLy8gV2hldGhlciB0byBhc3N1bWUgZmxpZ2h0XG4gIHJlYWRvbmx5IGZsaWdodD86IGJvb2xlYW47XG59XG5cblxuY29uc3QgdW5rbm93bkV4aXRXaGl0ZWxpc3QgPSBuZXcgU2V0KFtcbiAgMHgwMTAwM2EsIC8vIHRvcCBwYXJ0IG9mIGNhdmUgb3V0c2lkZSBzdGFydFxuICAweDAxMDAzYixcbiAgMHgxNTQwYTAsIC8vIFwiIFwiIHNlYW1sZXNzIGVxdWl2YWxlbnQgXCIgXCJcbiAgMHgxYTMwNjAsIC8vIHN3YW1wIGV4aXRcbiAgMHg0MDIwMDAsIC8vIGJyaWRnZSB0byBmaXNoZXJtYW4gaXNsYW5kXG4gIDB4NDAyMDMwLFxuICAweDQxODBkMCwgLy8gYmVsb3cgZXhpdCB0byBsaW1lIHRyZWUgdmFsbGV5XG4gIDB4NjA4N2JmLCAvLyBiZWxvdyBib2F0IGNoYW5uZWxcbiAgMHhhMTAzMjYsIC8vIGNyeXB0IDIgYXJlbmEgbm9ydGggZWRnZVxuICAweGExMDMyOSxcbiAgMHhhOTA2MjYsIC8vIHN0YWlycyBhYm92ZSBrZWxieSAyXG4gIDB4YTkwNjI5LFxuXSk7XG5cbi8vY29uc3QgRFBPUyA9IFstMTYsIC0xLCAxNiwgMV07XG5jb25zdCBESVJfTkFNRSA9IFsnYWJvdmUnLCAnbGVmdCBvZicsICdiZWxvdycsICdyaWdodCBvZiddO1xuXG50eXBlIE9wdGlvbmFsPFQ+ID0gVHxudWxsfHVuZGVmaW5lZDtcblxuZnVuY3Rpb24gZGlzdGFuY2UoYTogUG9zLCBiOiBQb3MpOiBudW1iZXIge1xuICByZXR1cm4gKChhID4+PiA0KSAtIChiID4+PiA0KSkgKiogMiArICgoYSAmIDB4ZikgLSAoYiAmIDB4ZikpICoqIDI7XG59XG5cbmZ1bmN0aW9uIGFkZERlbHRhKHN0YXJ0OiBQb3MsIHBsdXM6IFBvcywgbWludXM6IFBvcywgbWV0YTogTWV0YWxvY2F0aW9uKTogUG9zIHtcbiAgY29uc3QgcHggPSBwbHVzICYgMHhmO1xuICBjb25zdCBweSA9IHBsdXMgPj4+IDQ7XG4gIGNvbnN0IG14ID0gbWludXMgJiAweGY7XG4gIGNvbnN0IG15ID0gbWludXMgPj4+IDQ7XG4gIGNvbnN0IHN4ID0gc3RhcnQgJiAweGY7XG4gIGNvbnN0IHN5ID0gc3RhcnQgPj4+IDQ7XG4gIGNvbnN0IG94ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obWV0YS53aWR0aCAtIDEsIHN4ICsgcHggLSBteCkpO1xuICBjb25zdCBveSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1ldGEuaGVpZ2h0IC0gMSwgc3kgKyBweSAtIG15KSk7XG4gIHJldHVybiBveSA8PCA0IHwgb3g7XG59XG5cbi8vIGJpdCAxID0gY3J1bWJsaW5nLCBiaXQgMCA9IGhvcml6b250YWw6IFt2LCBoLCBjdiwgY2hdXG5jb25zdCBQTEFURk9STVM6IHJlYWRvbmx5IG51bWJlcltdID0gWzB4N2UsIDB4N2YsIDB4OWYsIDB4OGRdO1xuIl19