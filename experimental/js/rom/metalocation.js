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
        return this.validate();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBSXRFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFaEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBc0NqQixNQUFNLE9BQU8sWUFBWTtJQWlDdkIsWUFBcUIsRUFBVSxFQUFXLE9BQW9CLEVBQ2xELE1BQWMsRUFBRSxLQUFhO1FBRHBCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBM0I5RCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFDbkMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFRLENBQUM7UUFPcEIsU0FBSSxHQUFvQixTQUFTLENBQUM7UUFFbEMsV0FBTSxHQUFHLElBQUksS0FBSyxFQUFpQyxDQUFDO1FBQ3BELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBa0JyQyxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBTUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFrQixFQUFFLE9BQXFCOztRQUNqRCxNQUFNLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsR0FBRyxRQUFRLENBQUM7UUFDdEMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUVaLE1BQU0sRUFBQyxRQUFRLEVBQUUsU0FBUyxFQUFDLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQztZQUMvQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1lBQ3hDLEtBQUssTUFBTSxFQUFFLElBQUksR0FBRyxDQUFDLFlBQVksRUFBRTtnQkFDakMsSUFBSSxRQUFRLENBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzFEO1lBR0QsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUU3RCxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtnQkFDL0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUU7b0JBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU07d0JBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDckUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7d0JBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxRQUFRLEVBQUUsQ0FBQyxDQUFDO3FCQUNqRTtpQkFDRjthQUNGO1lBQ0QsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsUUFBUSxNQUNqQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ25FO1lBQ0QsT0FBTyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM1QjtRQUtELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBTyxDQUFDO1FBQ3hDLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ25DLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FFbEM7UUFJRCxLQUFLLE1BQU0sUUFBUSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUU7WUFDekMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN2QztRQUNELEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtZQUNqQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25DO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUM5QixNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdEIsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25FLElBQUksVUFBVSxHQUF5QixTQUFTLENBQUM7Z0JBQ2pELElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQzVCLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzdCO3FCQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFO29CQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO2lCQUMvQjtxQkFBTTtvQkFFTCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNuRSxNQUFNLFFBQVEsR0FBaUIsRUFBRSxDQUFDO29CQUNsQyxNQUFNLElBQUksR0FBaUIsRUFBRSxDQUFDO29CQUM5QixLQUFLLE1BQU0sQ0FBQyxJQUFJLFdBQVcsRUFBRTt3QkFDM0IsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTs0QkFDaEIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDbEI7NkJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxDQUFBLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxJQUFJLE1BQUssS0FBSzs0QkFDM0MsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7NEJBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7eUJBQ2pCOzZCQUFNOzRCQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7eUJBQ2Q7cUJBQ0Y7b0JBQ0QsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFO3dCQUNuQixTQUFTLEtBQUssQ0FBQyxFQUFVLEVBQUUsRUFBVTs0QkFDbkMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDOzRCQUN6QixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7NEJBQ3pCLE1BQU0sQ0FBQyxHQUNILENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDOzRCQUNsRSxPQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzFCLENBQUM7d0JBQ0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUU7NEJBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FBQztnQ0FBRSxTQUFTOzRCQUN4RCxVQUFVLEdBQUcsT0FBTyxDQUFDOzRCQUNyQixNQUFNO3lCQUNQO3FCQUNGO29CQUNELElBQUksQ0FBQyxVQUFVO3dCQUFFLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ3ZDO2dCQUNELElBQUksQ0FBQyxVQUFVO29CQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBUy9DLE9BQU8sQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUM7YUFRMUI7U0FDRjtRQUdELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFpQyxDQUFDO1FBQ3pELEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtZQUNqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO2dCQUFFLFNBQVM7WUFDNUMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEtBQUssQ0FBQyxFQUN2QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDakUsTUFBTSxPQUFPLEdBQUcsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLElBQUksQ0FBQztZQUM5QixJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNaLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDdkQsSUFBSSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUFFLFNBQVM7Z0JBQzNDLE1BQU0sR0FBRyxTQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSywwQ0FBRSxHQUFHLENBQ2pDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkUsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLENBQUMsSUFBSSxPQUNoRCxRQUFRLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3RELFNBQVM7YUFDVjtZQUNELElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO2dCQUFFLFNBQVM7WUFDekMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNsQyxNQUFNLElBQUksR0FBRyxPQUFPLEtBQUssZUFBZSxDQUFDO2dCQUV6QyxNQUFNLElBQUksR0FBRyxPQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7Z0JBRXhELEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUMvRCxTQUFTO2FBQ1Y7WUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDdEQsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUM5QixJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQy9CLElBQUksT0FBTyxLQUFLLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUtuRCxPQUFPLElBQUksSUFBSSxDQUFDO2dCQUNoQixTQUFTLElBQUksT0FBTyxDQUFDO2FBQ3RCO1lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzVELE1BQU0sUUFBUSxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFOUQsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDYixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLEtBQUssTUFBTSxPQUFPLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDdEUsS0FBSyxNQUFNLElBQUksVUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssbUNBQUksRUFBRSxFQUFFO3dCQUMzQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQzs0QkFBRSxTQUFTO3dCQUMvQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssT0FBTyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNyRTtpQkFDRjtnQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxDQUFDLFNBQVMsQ0FDbkQsT0FBTyxJQUFJLE1BQU0sR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRSxTQUFTO2FBQ1Y7WUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztTQUVoRTtRQUdELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFDcEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQy9CLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDeEQ7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFJdEUsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDM0IsT0FBTyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDdkIsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFHckIsS0FBSyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFO1lBQzlCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLFVBQUksR0FBRyxDQUFDLElBQUksMENBQUUsVUFBVSxDQUFDLFFBQVEsR0FBRztnQkFDbEMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ3REO2lCQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO2dCQUNwQixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQzFDO1NBQ0Y7UUFVRCxPQUFPLE9BQU8sQ0FBQztRQUVmLFNBQVMsZ0JBQWdCLENBQUMsSUFBYyxFQUFFLEtBQWEsRUFBRSxLQUFhO1lBQ3BFLEtBQUssTUFBTSxPQUFPLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDbEUsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxJQUFJLElBQUksSUFBSSxJQUFJO29CQUFFLE9BQU8sSUFBSSxDQUFDO2FBQy9CO1lBQ0QsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztJQUNILENBQUM7SUFrQkQsTUFBTSxDQUFDLEdBQVE7UUFDYixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBUTtRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBT0QsSUFBSSxLQUFLO1FBQ1AsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxJQUFJLEtBQUssQ0FBQyxLQUFhO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDdEIsQ0FBQztJQUNELElBQUksTUFBTSxDQUFDLE1BQWM7UUFDdkIsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sRUFBRTtZQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3ZFO2FBQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sRUFBRTtZQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQ2xCLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNsRTtRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFJRCxNQUFNO1FBQ0osSUFBSSxJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztRQUNoQyxNQUFNLENBQUMsR0FBYSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNyQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDcEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQ3BCO1NBQ0Y7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBUSxFQUFFLEdBQXNCO1FBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxhQUFILEdBQUcsY0FBSCxHQUFHLEdBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDakQsQ0FBQztJQUlELFFBQVEsQ0FBQyxHQUFRO1FBRWYsT0FBTyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3hFLENBQUM7SUFXRCxLQUFLLENBQUMsR0FBUSxFQUNSLE9BQTJEO1FBQy9ELEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFO1lBQ3pCLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNYLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFO2dCQUNyQixJQUFJLEdBQUc7b0JBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxFQUFFLEVBQUUsQ0FBQzthQUNOO1lBQ0QsR0FBRyxJQUFJLEVBQUUsQ0FBQztTQUNYO1FBR0QsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUdELFFBQVE7UUFDTixLQUFLLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQ3JDLE1BQU0sSUFBSSxHQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNqQyxNQUFNLElBQUksR0FBUSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3hDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2pDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFBRSxTQUFTO29CQUM3QixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7d0JBQUUsU0FBUztvQkFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO3dCQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxxQ0FBcUMsRUFDckMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUM5QixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7cUJBQzFDO2lCQUNGO2FBQ0Y7U0FDRjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFZLEVBQUUsT0FBZSxFQUFFLFFBQWdCLEVBQy9DLE9BQWlEO1FBRTdELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ2pELElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsUUFBUSxFQUFFLENBQUMsR0FBRyxJQUFJLEdBQUcsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUMxRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5RDtRQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDakMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7UUFFdEIsTUFBTSxJQUFJLEdBQWlELEVBQUUsQ0FBQztRQUM5RCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNyQyxNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQ3BCLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLEVBQUU7Z0JBQ3RCLElBQUksQ0FBQyxJQUFJLElBQUk7b0JBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM3QyxTQUFTO2FBQ1Y7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDM0M7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDakMsSUFBSSxLQUFLLENBQUMsRUFBRSxHQUFHLEdBQUc7Z0JBQUUsU0FBUztZQUM3QixLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQy9CLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLEdBQUcsT0FBTyxFQUFFO2dCQUM1QixJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSTtvQkFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDeEMsU0FBUzthQUNWO1lBQ0QsSUFBSSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUM7U0FDbEI7UUFDRCxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsQ0FBQztJQUk3RCxDQUFDO0lBS0QsT0FBTyxDQUFDLEdBQVEsRUFBRSxJQUFvQixFQUFFLElBQWM7UUFDcEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNyRCxJQUFJLENBQUMsS0FBSztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFDRCxhQUFhLENBQUMsR0FBUSxFQUFFLElBQW9CLEVBQUUsSUFBYztRQU0xRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBUSxFQUFFLElBQW9CO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxLQUFLO1FBQ0gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFHRCxjQUFjLENBQUMsSUFBb0I7O1FBR2pDLE1BQU0sT0FBTyxHQUFpQixFQUFFLENBQUM7UUFDakMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQzlCLFVBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLDBDQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSTtnQkFBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ25FO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUdELElBQUk7O1FBQ0YsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzNCO1FBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFCLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDN0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDekMsSUFBSSxDQUFDLElBQUksYUFBQyxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsSUFBSSxDQUFDLElBQUksMENBQUUsSUFBSSxDQUFDLENBQUMsb0NBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7aUJBQ3BFO2dCQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzNCO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELFdBQVc7UUFDVCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsSUFBSSxDQUFDLENBQUM7YUFDekI7WUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUM1QjtRQUNELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRUQsUUFBUSxDQUFDLE9BQXFCLEVBQUU7O1FBRzlCLE1BQU0sRUFBRSxHQUFHLElBQUksU0FBUyxFQUFVLENBQUM7UUFDbkMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RSxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMvQixNQUFNLEdBQUcsZUFBRyxJQUFJLENBQUMsSUFBSSwwQ0FBRSxHQUFHLENBQUMsR0FBRyxvQ0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RELEtBQUssTUFBTSxPQUFPLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsRUFBRTtnQkFDckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNO29CQUFFLFNBQVM7Z0JBRTlCLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDNUM7U0FDRjtRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQzNDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN2QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLEVBQUU7Z0JBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ3BCO1NBQ0Y7UUFFRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFHRCxRQUFRLENBQUMsSUFBWTs7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJO1lBQUUsT0FBTztRQUNuQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsTUFBTSxJQUFJLFNBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLDBDQUFHLElBQUksR0FBRyxHQUFHLEVBQUUsSUFBSSxDQUFDO1FBQy9DLElBQUksRUFBQyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsVUFBVSxDQUFDLE9BQU8sRUFBQztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBRTVDLElBQUksSUFBSSxLQUFLLFVBQVUsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7WUFBRSxPQUFPO1FBQy9DLElBQUksSUFBSSxLQUFLLGFBQWEsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7WUFBRSxPQUFPO1FBQ3RFLElBQUksSUFBSSxLQUFLLFdBQVcsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFBRSxPQUFPO1FBQ2hELElBQUksSUFBSSxLQUFLLGFBQWEsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUM7WUFBRSxPQUFPO1FBQ3JFLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQU1ELE9BQU8sQ0FBQyxJQUFZO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBTUQsTUFBTSxDQUFDLE1BQVcsRUFBRSxJQUFrQixFQUFFLE9BQVksRUFDN0MsT0FBd0IsRUFBRSxRQUF5QjtRQUN4RCxJQUFJLENBQUMsT0FBTztZQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFFBQVE7WUFBRSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBTzFELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQztRQUN4QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFDbkQsSUFBSSxRQUFRLEVBQUU7WUFDWixNQUFNLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxHQUFHLFFBQVEsQ0FBQztZQUM5QyxJQUFJLFlBQVksS0FBSyxRQUFRLElBQUksWUFBWSxLQUFLLFFBQVE7Z0JBQUUsT0FBTztTQUNwRTtRQUNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUUsQ0FBQztRQUNwRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRXJFLElBQUksT0FBTyxJQUFJLFFBQVEsRUFBRTtZQUN2QixNQUFNLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxHQUFHLFFBQVEsQ0FBQztZQUM5QyxNQUFNLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxHQUFHLE9BQU8sQ0FBQztZQUMzQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSyxDQUFDO1lBQy9ELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFLLENBQUM7WUFDakUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbEUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDckU7YUFBTSxJQUFJLE9BQU8sSUFBSSxRQUFRLEVBQUU7WUFDOUIsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxPQUFPLElBQUksUUFBUSxDQUFDO1lBQ2pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFLLENBQUM7WUFDekQsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNuRDtJQUNILENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxHQUFRO1FBQ3hCLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUFFLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQVNELFNBQVMsQ0FBQyxHQUFHLEtBQTJEO1FBQ3RFLE1BQU0sUUFBUSxHQUEyQyxFQUFFLENBQUM7UUFDNUQsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksS0FBSyxFQUFFO1lBQ3RELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUUsQ0FBQztZQUNuRCxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHLFFBQVEsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSyxDQUFDO1lBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxJQUFJLEVBQUUsUUFBUSxFQUN6QixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2xELFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxRQUFRLEVBQUU7WUFDeEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNsQztJQUNILENBQUM7SUFFRCxRQUFRLENBQUMsSUFBUyxFQUFFLElBQVMsRUFDcEIsUUFBeUIsRUFBRSxRQUF5QjtRQUMzRCxJQUFJLENBQUMsUUFBUTtZQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFFBQVE7WUFBRSxRQUFRLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUUsQ0FBQztRQUNsRCxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHLFFBQVEsQ0FBQztRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSyxDQUFDO1FBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxJQUFJLEVBQUUsUUFBUSxFQUN6QixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxLQUFtQjtRQUNwQyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBTyxDQUFDO1FBQzdCLEtBQUssTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQy9CLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEI7U0FDRjtRQUNELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxTQUFTO1lBQzlCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDckQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN4RSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQy9CO1FBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUFFLFNBQVM7WUFDL0IsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3pCO0lBQ0gsQ0FBQztJQUVELG1CQUFtQixDQUFDLEdBQVE7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQzVDLE1BQU0sS0FBSyxHQUFHLENBQUMsS0FBSyxhQUFMLEtBQUssY0FBTCxLQUFLLEdBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFrQixFQUFFLE1BQWM7O1FBRTlDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXpDLE1BQU0sT0FBTyxHQUFHLElBQUksVUFBVSxDQUFxQixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDNUM7UUFHRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTVELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQy9CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0IsVUFBSSxHQUFHLENBQUMsSUFBSSwwQ0FBRSxVQUFVLENBQUMsUUFBUSxHQUFHO2dCQUNsQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsSUFBSSxFQUFFO29CQUNULE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsSUFBSSxPQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDOUQ7Z0JBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ2pDO1NBQ0Y7SUFDSCxDQUFDO0lBR0QsWUFBWSxDQUFDLElBQWtCLEVBQUUsTUFBYzs7UUFFN0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNuQixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ2hDLEtBQUssTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNqQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM5QztRQUdELE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxDQUFrQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RSxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMvQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFCLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztnQkFBRSxTQUFTO1lBRXJDLElBQUksT0FBTyxHQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNoRSxLQUFLLE1BQU0sQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDNUMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUM5QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUNqRCxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO29CQUN6QixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUM1RDthQUNGO1lBQ0QsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUM7UUFJRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFO1lBRS9CLE1BQU0sUUFBUSxHQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7WUFDdEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQy9CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFCLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQztvQkFBRSxTQUFTO2dCQUNqRSxNQUFNLEtBQUssR0FDUCxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBR2hELElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDdEQsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkI7Z0JBQ0QsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUM1QixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUMzRDthQUNGO1lBR0QsSUFBSSxLQUFLLEdBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL0IsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFDekMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDL0IsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNuQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUV4RCxJQUFJLE9BQU8sR0FBMEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDOUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBRS9CLE1BQU0sVUFBVSxTQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLG1DQUFJLENBQUMsQ0FBQztvQkFDeEMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFBRSxTQUFTO29CQUN0QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNuQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ3JCLE9BQU8sR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7cUJBQ25DO2lCQUNGO2dCQUNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxNQUFNLEdBQUcsQ0FBQztvQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ3BELEtBQUssR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO2FBQ2pEO1NBQ0Y7SUFDSCxDQUFDO0lBTUQsYUFBYSxDQUFDLElBQWtCLEVBQUUsTUFBYzs7UUFFOUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQXdCLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlELE1BQU0sU0FBUyxHQUFHLElBQUksVUFBVSxDQUEyQixHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDNUUsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDL0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQixLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUMsVUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssbUNBQUksRUFBRSxFQUFFO2dCQUN6QyxJQUFJLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO29CQUFFLFNBQVM7Z0JBQ2pELElBQUksSUFBSSxLQUFLLFdBQVcsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7b0JBQUUsU0FBUztnQkFDbEQsSUFBSSxJQUFJLEtBQUssYUFBYSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztvQkFBRSxTQUFTO2dCQUN0RSxJQUFJLElBQUksS0FBSyxZQUFZLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDO29CQUFFLFNBQVM7Z0JBQ3BFLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzNCO1NBQ0Y7UUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNoQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3JCO1FBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzVDLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUFFLFNBQVM7WUFFNUMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNsQyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsSUFBSSxPQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHlCQUMzQixJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ2pDO1lBSUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBR2pCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksSUFBSSxJQUFJLElBQUk7b0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBRXpELFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQixTQUFTO2FBQ1Y7WUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDUixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxLQUFLLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssS0FDNUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FDM0MsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZEO1lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDO2dCQUN4RCxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDMUQ7WUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ2xDO0lBQ0gsQ0FBQztJQU1ELGNBQWMsQ0FBQyxJQUFrQixFQUFFLE1BQWM7O1FBRS9DLE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1FBQzNELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFDcEMsTUFBTSxPQUFPLEdBQXlCLEVBQUUsQ0FBQztRQUV6QyxNQUFNLEdBQUcsR0FBb0QsRUFBRSxDQUFDO1FBQ2hFLE1BQU0sS0FBSyxHQUE0QixFQUFFLENBQUM7UUFDMUMsTUFBTSxPQUFPLEdBQTRCLEVBQUUsQ0FBQztRQUU1QyxNQUFNLE1BQU0sR0FBNEIsRUFBRSxDQUFDO1FBQzNDLEtBQUssTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDOUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzlCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7b0JBQ3pDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNqRDtxQkFBTSxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLDBDQUFFLE1BQU0sS0FBSSxHQUFHLEtBQUssSUFBSSxFQUFFO29CQUNuRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUNoRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQ3RDLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNuRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO3FCQUNoQztpQkFDRjtnQkFDRCxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDMUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJO3dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztvQkFDaEUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNuRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQXdCLENBQUMsQ0FBQztvQkFFckMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJO3dCQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2hFO3FCQUFNLElBQUksR0FBRyxLQUFLLElBQUksSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUNuRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUk7d0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO29CQUNoRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNyRTtnQkFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7b0JBQUUsU0FBUztnQkFDdkMsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO29CQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDN0I7cUJBQU07b0JBQ0wsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFHLENBQUM7b0JBQy9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUN2QzthQUNGO1lBQ0QsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO2dCQUNoQixNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN2QixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3pCO1NBQ0Y7UUFFRCxLQUFLLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQzlCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtnQkFDMUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLFNBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLDBDQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7Z0JBQ3hELElBQUksQ0FBQyxJQUFJO29CQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDaEUsTUFBTSxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFDckIsTUFBTSxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDckIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7Z0JBQy9CLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMvQixJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7b0JBQ2hCLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUN0RDtxQkFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLEVBQUU7b0JBQ3RDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztvQkFDekMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDcEQ7YUFDRjtTQUNGO1FBU0QsTUFBTSxJQUFJLEdBQW1DLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0RSxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMvQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQy9CLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsbUNBQUksRUFBRSxFQUFFO2dCQUMxRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN0QjtTQUNGO1FBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDdEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNyQjtRQUNELE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUUxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFeEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM5QyxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFDckIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3BELElBQUksUUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO29CQUM5QixNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7b0JBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2pCLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQ2hELEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO29CQUNuQixLQUFLLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7aUJBQ2hDO3FCQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsS0FBSyxJQUFJLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtvQkFDckQsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFHLENBQUM7b0JBQ3ZDLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO29CQUN0QixLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztpQkFDckI7Z0JBQ0QsU0FBUzthQUNWO2lCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUN6QixNQUFNLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3JFLElBQUksQ0FBQyxJQUFJLEVBQUU7b0JBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLEtBQUssQ0FBQyxRQUFRLEVBQzNCLGlDQUFpQyxHQUFHLEtBQ3BDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ2pDO2dCQUNELE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDYixLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDYixTQUFTO2FBQ1Y7aUJBQU0sSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFFL0QsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDOUIsS0FBSyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRTtvQkFDeEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN0RCxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTt3QkFDNUIsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztxQkFDcEQ7aUJBQ0Y7Z0JBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQU01QixDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztvQkFDNUIsU0FBUztpQkFDVjthQUNGO1lBR0QsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixHQUFHLElBQ3JCLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLEdBQUcsRUFDaEQsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3RDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxJQUFJO2dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDeEQsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDcEIsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlELEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ1osS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjtJQUNILENBQUM7SUFNRCxjQUFjLENBQUMsSUFBa0I7UUFDL0IsTUFBTSxHQUFHLEdBQW9ELEVBQUUsQ0FBQztRQUNoRSxNQUFNLEdBQUcsR0FBMEMsRUFBRSxDQUFDO1FBQ3RELEtBQUssTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDOUIsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7Z0JBQzFELElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7b0JBQUUsU0FBUztnQkFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNoRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxPQUFPLEVBQUU7b0JBQ1gsTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUM7b0JBQ25DLElBQUksQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHO3dCQUN0RCxPQUFPLEtBQUssSUFBSSxFQUFFO3dCQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUk7NEJBQ3JDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDakMsU0FBUztxQkFDVjtpQkFDRjtnQkFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQzVCO1NBQ0Y7UUFDRCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRTtZQUNsQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDOUI7UUFDRCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUU7WUFDeEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNqQztJQUdILENBQUM7SUFNRCxLQUFLOztRQUNILE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzQyxJQUFJLGVBQW1DLENBQUM7UUFDeEMsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDakUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QyxNQUFNLElBQUksR0FBRyxRQUFRLElBQUksQ0FBQyxDQUFDO1lBQzNCLElBQUksT0FBTyxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDOUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLElBQUssQ0FBQztZQUMvQixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUN0RCxNQUFNLE9BQU8sU0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssMENBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsQ0FBQztZQUNwRSxNQUFNLFFBQVEsU0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssMENBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVE7VUFDcEQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxPQUFPLElBQUksU0FBUyxDQUFDLElBQUk7VUFDcEQsT0FBTyxNQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxRQUFRLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7YUFDL0Q7WUFFRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDcEIsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDeEMsZUFBZSxHQUFHLE9BQU8sQ0FBQzthQUMzQjtpQkFBTTtnQkFDTCxJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDO2dCQUNsQyxJQUFJLFNBQVMsR0FBRyxNQUFNLEVBQUU7b0JBQ3RCLE9BQU8sSUFBSSxJQUFJLENBQUM7b0JBQ2hCLFNBQVMsSUFBSSxPQUFPLENBQUM7aUJBQ3RCO2dCQUNELFFBQVEsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQzFEO1lBQ0QsS0FBSyxJQUFJLElBQUksSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO2dCQUU5QixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQUMsQ0FBQzthQUNwRTtTQUNGO1FBQ0QsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM3QixNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNwQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNyQyxNQUFNLEdBQUcsR0FBYSxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3pDO1NBQ0Y7UUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFHL0MsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDbEIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xDLElBQUksSUFBc0IsQ0FBQztZQUMzQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDN0MsSUFBSSxlQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsMENBQUUsRUFBRSxtQ0FBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDM0Q7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtnQkFDaEMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7YUFDckM7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDOUIsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7YUFDekM7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRTtnQkFDdEMsSUFBSSxTQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQywwQ0FBRSxFQUFFLENBQUM7YUFDekM7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFBRTtnQkFDckMsSUFBSSxlQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQywwQ0FBRSxFQUFFLG1DQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7YUFDekU7WUFDRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3BEO1NBQ0Y7UUFHRCxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNqQixLQUFLLE1BQU0sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUN6QyxNQUFNLFFBQVEsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3hEO0lBQ0gsQ0FBQztJQUdELGVBQWUsQ0FBQyxNQUFjO1FBQzVCLElBQUksSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJO1lBQUUsT0FBTztRQUU3QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxLQUFLLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7WUFDOUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFDMUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUU7Z0JBQUUsU0FBUztZQUNqQyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLE9BQU8sQ0FBQztnQkFBRSxTQUFTO1lBQzVDLElBQUksT0FBTyxDQUFDLGtCQUFrQixFQUFFO2dCQUFFLFNBQVM7WUFDM0MsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3BFLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQ3BCO2lCQUFNO2dCQUNMLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDekIsS0FBSyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO2FBQ3pCO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUFZRCxNQUFNLG9CQUFvQixHQUFHLElBQUksR0FBRyxDQUFDO0lBQ25DLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtDQUNULENBQUMsQ0FBQztBQUdILE1BQU0sUUFBUSxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFJM0QsU0FBUyxRQUFRLENBQUMsQ0FBTSxFQUFFLENBQU07SUFDOUIsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckUsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLEtBQVUsRUFBRSxJQUFTLEVBQUUsS0FBVSxFQUFFLElBQWtCO0lBQ3JFLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxHQUFHLENBQUM7SUFDdEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQztJQUN0QixNQUFNLEVBQUUsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLEtBQUssS0FBSyxDQUFDLENBQUM7SUFDdkIsTUFBTSxFQUFFLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUN2QixNQUFNLEVBQUUsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDdEIsQ0FBQztBQUdELE1BQU0sU0FBUyxHQUFzQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9jYXRpb24gfSBmcm9tICcuL2xvY2F0aW9uLmpzJzsgLy8gaW1wb3J0IHR5cGVcbmltcG9ydCB7IEV4aXQsIEZsYWcgYXMgTG9jYXRpb25GbGFnLCBQaXQgfSBmcm9tICcuL2xvY2F0aW9udGFibGVzLmpzJztcbmltcG9ydCB7IEZsYWcgfSBmcm9tICcuL2ZsYWdzLmpzJztcbmltcG9ydCB7IE1ldGFzY3JlZW4sIFVpZCB9IGZyb20gJy4vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQgeyBNZXRhdGlsZXNldCB9IGZyb20gJy4vbWV0YXRpbGVzZXQuanMnO1xuaW1wb3J0IHsgaGV4IH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7IFJvbSB9IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQgeyBEZWZhdWx0TWFwLCBUYWJsZSwgaXRlcnMsIGZvcm1hdCB9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHsgVW5pb25GaW5kIH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7IENvbm5lY3Rpb25UeXBlIH0gZnJvbSAnLi9tZXRhc2NyZWVuZGF0YS5qcyc7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbi8vIE1vZGVsIG9mIGEgbG9jYXRpb24gd2l0aCBtZXRhc2NyZWVucywgZXRjLlxuXG4vLyBUcmljazogd2UgbmVlZCBzb21ldGhpbmcgdG8gb3duIHRoZSBuZWlnaGJvciBjYWNoZS5cbi8vICAtIHByb2JhYmx5IHRoaXMgYmVsb25ncyBpbiB0aGUgTWV0YXRpbGVzZXQuXG4vLyAgLSBtZXRob2QgdG8gcmVnZW5lcmF0ZSwgZG8gaXQgYWZ0ZXIgdGhlIHNjcmVlbiBtb2RzP1xuLy8gRGF0YSB3ZSB3YW50IHRvIGtlZXAgdHJhY2sgb2Y6XG4vLyAgLSBnaXZlbiB0d28gc2NyZWVucyBhbmQgYSBkaXJlY3Rpb24sIGNhbiB0aGV5IGFidXQ/XG4vLyAgLSBnaXZlbiBhIHNjcmVlbiBhbmQgYSBkaXJlY3Rpb24sIHdoYXQgc2NyZWVucyBvcGVuL2Nsb3NlIHRoYXQgZWRnZT9cbi8vICAgIC0gd2hpY2ggb25lIGlzIHRoZSBcImRlZmF1bHRcIj9cblxuLy8gVE9ETyAtIGNvbnNpZGVyIGFic3RyYWN0aW5nIGV4aXRzIGhlcmU/XG4vLyAgLSBleGl0czogQXJyYXk8W0V4aXRTcGVjLCBudW1iZXIsIEV4aXRTcGVjXT5cbi8vICAtIEV4aXRTcGVjID0ge3R5cGU/OiBDb25uZWN0aW9uVHlwZSwgc2NyPzogbnVtYmVyfVxuLy8gSG93IHRvIGhhbmRsZSBjb25uZWN0aW5nIHRoZW0gY29ycmVjdGx5P1xuLy8gIC0gc2ltcGx5IHNheWluZyBcIi0+IHdhdGVyZmFsbCB2YWxsZXkgY2F2ZVwiIGlzIG5vdCBoZWxwZnVsIHNpbmNlIHRoZXJlJ3MgMlxuLy8gICAgb3IgXCItPiB3aW5kIHZhbGxleSBjYXZlXCIgd2hlbiB0aGVyZSdzIDUuXG4vLyAgLSB1c2Ugc2NySWQgYXMgdW5pcXVlIGlkZW50aWZpZXI/ICBvbmx5IHByb2JsZW0gaXMgc2VhbGVkIGNhdmUgaGFzIDMuLi5cbi8vICAtIG1vdmUgdG8gZGlmZmVyZW50IHNjcmVlbiBhcyBuZWNlc3NhcnkuLi5cbi8vICAgIChjb3VsZCBhbHNvIGp1c3QgZGl0Y2ggdGhlIG90aGVyIHR3byBhbmQgdHJlYXQgd2luZG1pbGwgZW50cmFuY2UgYXNcbi8vICAgICBhIGRvd24gZW50cmFuY2UgLSBzYW1lIHcvIGxpZ2h0aG91c2U/KVxuLy8gIC0gb25seSBhIHNtYWxsIGhhbmRmdWxsIG9mIGxvY2F0aW9ucyBoYXZlIGRpc2Nvbm5lY3RlZCBjb21wb25lbnRzOlxuLy8gICAgICB3aW5kbWlsbCwgbGlnaHRob3VzZSwgcHlyYW1pZCwgZ29hIGJhY2tkb29yLCBzYWJlcmEsIHNhYnJlL2h5ZHJhIGxlZGdlc1xuLy8gIC0gd2UgcmVhbGx5IGRvIGNhcmUgd2hpY2ggaXMgaW4gd2hpY2ggY29tcG9uZW50LlxuLy8gICAgYnV0IG1hcCBlZGl0cyBtYXkgY2hhbmdlIGV2ZW4gdGhlIG51bWJlciBvZiBjb21wb25lbnRzPz8/XG4vLyAgLSBkbyB3ZSBkbyBlbnRyYW5jZSBzaHVmZmxlIGZpcnN0IG9yIG1hcCBzaHVmZmxlIGZpcnN0P1xuLy8gICAgb3IgYXJlIHRoZXkgaW50ZXJsZWF2ZWQ/IT9cbi8vICAgIGlmIHdlIHNodWZmbGUgc2FicmUgb3ZlcndvcmxkIHRoZW4gd2UgbmVlZCB0byBrbm93IHdoaWNoIGNhdmVzIGNvbm5lY3Rcbi8vICAgIHRvIHdoaWNoLi4uIGFuZCBwb3NzaWJseSBjaGFuZ2UgdGhlIGNvbm5lY3Rpb25zP1xuLy8gICAgLSBtYXkgbmVlZCBsZWV3YXkgdG8gYWRkL3N1YnRyYWN0IGNhdmUgZXhpdHM/P1xuLy8gUHJvYmxlbSBpcyB0aGF0IGVhY2ggZXhpdCBpcyBjby1vd25lZCBieSB0d28gbWV0YWxvY2F0aW9ucy5cblxuXG5leHBvcnQgdHlwZSBQb3MgPSBudW1iZXI7XG5leHBvcnQgdHlwZSBMb2NQb3MgPSBudW1iZXI7IC8vIGxvY2F0aW9uIDw8IDggfCBwb3NcbmV4cG9ydCB0eXBlIEV4aXRTcGVjID0gcmVhZG9ubHkgW0xvY1BvcywgQ29ubmVjdGlvblR5cGVdO1xuXG5leHBvcnQgY2xhc3MgTWV0YWxvY2F0aW9uIHtcblxuICAvLyBUT0RPIC0gc3RvcmUgbWV0YWRhdGEgYWJvdXQgd2luZG1pbGwgZmxhZz8gIHR3byBtZXRhbG9jcyB3aWxsIG5lZWQgYSBwb3MgdG9cbiAgLy8gaW5kaWNhdGUgd2hlcmUgdGhhdCBmbGFnIHNob3VsZCBnby4uLj8gIE9yIHN0b3JlIGl0IGluIHRoZSBtZXRhc2NyZWVuP1xuXG4gIC8vIENhdmVzIGFyZSBhc3N1bWVkIHRvIGJlIGFsd2F5cyBvcGVuIHVubGVzcyB0aGVyZSdzIGEgZmxhZyBzZXQgaGVyZS4uLlxuICBjdXN0b21GbGFncyA9IG5ldyBNYXA8UG9zLCBGbGFnPigpO1xuICBmcmVlRmxhZ3MgPSBuZXcgU2V0PEZsYWc+KCk7XG5cbiAgcmVhZG9ubHkgcm9tOiBSb207XG5cbiAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gIHByaXZhdGUgX3dpZHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBfcG9zOiBQb3NbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgcHJpdmF0ZSBfZXhpdHMgPSBuZXcgVGFibGU8UG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWM+KCk7XG4gIHByaXZhdGUgX3BpdHMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpOyAvLyBNYXBzIHRvIGxvYyA8PCA4IHwgcG9zXG5cbiAgLy9wcml2YXRlIF9tb25zdGVyc0ludmFsaWRhdGVkID0gZmFsc2U7XG5cbiAgLyoqIEtleTogKHk8PDQpfHggKi9cbiAgcHJpdmF0ZSBfc2NyZWVuczogTWV0YXNjcmVlbltdO1xuXG4gIC8vIE5PVEU6IGtlZXBpbmcgdHJhY2sgb2YgcmVhY2hhYmlsaXR5IGlzIGltcG9ydGFudCBiZWNhdXNlIHdoZW4gd2VcbiAgLy8gZG8gdGhlIHN1cnZleSB3ZSBuZWVkIHRvIG9ubHkgY291bnQgUkVBQ0hBQkxFIHRpbGVzISAgU2VhbWxlc3NcbiAgLy8gcGFpcnMgYW5kIGJyaWRnZXMgY2FuIGNhdXNlIGxvdHMgb2YgaW1wb3J0YW50LXRvLXJldGFpbiB1bnJlYWNoYWJsZVxuICAvLyB0aWxlcy4gIE1vcmVvdmVyLCBzb21lIGRlYWQtZW5kIHRpbGVzIGNhbid0IGFjdHVhbGx5IGJlIHdhbGtlZCBvbi5cbiAgLy8gRm9yIG5vdyB3ZSdsbCBqdXN0IHplcm8gb3V0IGZlYXR1cmUgbWV0YXNjcmVlbnMgdGhhdCBhcmVuJ3RcbiAgLy8gcmVhY2hhYmxlLCBzaW5jZSB0cnlpbmcgdG8gZG8gaXQgY29ycmVjdGx5IHJlcXVpcmVzIHN0b3JpbmdcbiAgLy8gcmVhY2hhYmlsaXR5IGF0IHRoZSB0aWxlIGxldmVsIChhZ2FpbiBkdWUgdG8gYnJpZGdlIGRvdWJsZSBzdGFpcnMpLlxuICAvLyBwcml2YXRlIF9yZWFjaGFibGU6IFVpbnQ4QXJyYXl8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGlkOiBudW1iZXIsIHJlYWRvbmx5IHRpbGVzZXQ6IE1ldGF0aWxlc2V0LFxuICAgICAgICAgICAgICBoZWlnaHQ6IG51bWJlciwgd2lkdGg6IG51bWJlcikge1xuICAgIHRoaXMucm9tID0gdGlsZXNldC5yb207XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuX3dpZHRoID0gd2lkdGg7XG4gICAgdGhpcy5fc2NyZWVucyA9IG5ldyBBcnJheShoZWlnaHQgPDwgNCkuZmlsbCh0aWxlc2V0LmVtcHR5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBvdXQgYSBtZXRhbG9jYXRpb24gZnJvbSB0aGUgZ2l2ZW4gbG9jYXRpb24uICBJbmZlciB0aGVcbiAgICogdGlsZXNldCBpZiBwb3NzaWJsZSwgb3RoZXJ3aXNlIGl0IG11c3QgYmUgZXhwbGljaXRseSBzcGVjaWZpZWQuXG4gICAqL1xuICBzdGF0aWMgb2YobG9jYXRpb246IExvY2F0aW9uLCB0aWxlc2V0PzogTWV0YXRpbGVzZXQpOiBNZXRhbG9jYXRpb24ge1xuICAgIGNvbnN0IHtyb20sIHdpZHRoLCBoZWlnaHR9ID0gbG9jYXRpb247XG4gICAgaWYgKCF0aWxlc2V0KSB7XG4gICAgICAvLyBJbmZlciB0aGUgdGlsZXNldC4gIFN0YXJ0IGJ5IGFkZGluZyBhbGwgY29tcGF0aWJsZSBtZXRhdGlsZXNldHMuXG4gICAgICBjb25zdCB7Zm9ydHJlc3MsIGxhYnlyaW50aH0gPSByb20ubWV0YXRpbGVzZXRzO1xuICAgICAgY29uc3QgdGlsZXNldHMgPSBuZXcgU2V0PE1ldGF0aWxlc2V0PigpO1xuICAgICAgZm9yIChjb25zdCB0cyBvZiByb20ubWV0YXRpbGVzZXRzKSB7XG4gICAgICAgIGlmIChsb2NhdGlvbi50aWxlc2V0ID09PSB0cy50aWxlc2V0LmlkKSB0aWxlc2V0cy5hZGQodHMpO1xuICAgICAgfVxuICAgICAgLy8gSXQncyBpbXBvc3NpYmxlIHRvIGRpc3Rpbmd1aXNoIGZvcnRyZXNzIGFuZCBsYWJ5cmludGgsIHNvIHdlIGhhcmRjb2RlXG4gICAgICAvLyBpdCBiYXNlZCBvbiBsb2NhdGlvbjogb25seSAkYTkgaXMgbGFieXJpbnRoLlxuICAgICAgdGlsZXNldHMuZGVsZXRlKGxvY2F0aW9uLmlkID09PSAweGE5ID8gZm9ydHJlc3MgOiBsYWJ5cmludGgpO1xuICAgICAgLy8gRmlsdGVyIG91dCBhbnkgdGlsZXNldHMgdGhhdCBkb24ndCBpbmNsdWRlIG5lY2Vzc2FyeSBzY3JlZW4gaWRzLlxuICAgICAgZm9yIChjb25zdCBzY3JlZW4gb2YgbmV3IFNldChpdGVycy5jb25jYXQoLi4ubG9jYXRpb24uc2NyZWVucykpKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGlsZXNldCBvZiB0aWxlc2V0cykge1xuICAgICAgICAgIGlmICghdGlsZXNldC5nZXRNZXRhc2NyZWVucyhzY3JlZW4pLmxlbmd0aCkgdGlsZXNldHMuZGVsZXRlKHRpbGVzZXQpO1xuICAgICAgICAgIGlmICghdGlsZXNldHMuc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB0aWxlc2V0IGZvciAke2hleChzY3JlZW4pfSBpbiAke2xvY2F0aW9ufWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHRpbGVzZXRzLnNpemUgIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tdW5pcXVlIHRpbGVzZXQgZm9yICR7bG9jYXRpb259OiBbJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5mcm9tKHRpbGVzZXRzLCB0ID0+IHQubmFtZSkuam9pbignLCAnKX1dYCk7XG4gICAgICB9XG4gICAgICB0aWxlc2V0ID0gWy4uLnRpbGVzZXRzXVswXTtcbiAgICB9XG5cbiAgICAvLyBUcmF2ZXJzZSB0aGUgbG9jYXRpb24gZm9yIGFsbCB0aWxlcyByZWFjaGFibGUgZnJvbSBhbiBlbnRyYW5jZS5cbiAgICAvLyBUaGlzIGlzIHVzZWQgdG8gaW5mb3JtIHdoaWNoIG1ldGFzY3JlZW4gdG8gc2VsZWN0IGZvciBzb21lIG9mIHRoZVxuICAgIC8vIHJlZHVuZGFudCBvbmVzIChpLmUuIGRvdWJsZSBkZWFkIGVuZHMpLiAgVGhpcyBpcyBhIHNpbXBsZSB0cmF2ZXJzYWxcbiAgICBjb25zdCByZWFjaGFibGUgPSBsb2NhdGlvbi5yZWFjaGFibGVUaWxlcyh0cnVlKTsgLy8gdHJhdmVyc2VSZWFjaGFibGUoMHgwNCk7XG4gICAgY29uc3QgcmVhY2hhYmxlU2NyZWVucyA9IG5ldyBTZXQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiByZWFjaGFibGUua2V5cygpKSB7XG4gICAgICByZWFjaGFibGVTY3JlZW5zLmFkZCh0aWxlID4+PiA4KTtcbiAgICAgIC8vcmVhY2hhYmxlU2NyZWVucy5hZGQoKHRpbGUgJiAweGYwMDApID4+PiA4IHwgKHRpbGUgJiAweGYwKSA+Pj4gNCk7XG4gICAgfVxuICAgIC8vIE5PVEU6IHNvbWUgZW50cmFuY2VzIGFyZSBvbiBpbXBhc3NhYmxlIHRpbGVzIGJ1dCB3ZSBzdGlsbCBjYXJlIGFib3V0XG4gICAgLy8gdGhlIHNjcmVlbnMgdW5kZXIgdGhlbSAoZS5nLiBib2F0IGFuZCBzaG9wIGVudHJhbmNlcykuICBBbHNvIG1ha2Ugc3VyZVxuICAgIC8vIHRvIGhhbmRsZSB0aGUgc2VhbWxlc3MgdG93ZXIgZXhpdHMuXG4gICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiBsb2NhdGlvbi5lbnRyYW5jZXMpIHtcbiAgICAgIHJlYWNoYWJsZVNjcmVlbnMuYWRkKGVudHJhbmNlLnNjcmVlbik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgcmVhY2hhYmxlU2NyZWVucy5hZGQoZXhpdC5zY3JlZW4pO1xuICAgIH1cbiAgICAvL2NvbnN0IGV4aXQgPSB0aWxlc2V0LmV4aXQ7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBBcnJheTxNZXRhc2NyZWVuPihoZWlnaHQgPDwgNCkuZmlsbCh0aWxlc2V0LmVtcHR5KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3QgdDAgPSB5IDw8IDQgfCB4O1xuICAgICAgICBjb25zdCBtZXRhc2NyZWVucyA9IHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMobG9jYXRpb24uc2NyZWVuc1t5XVt4XSk7XG4gICAgICAgIGxldCBtZXRhc2NyZWVuOiBNZXRhc2NyZWVufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG1ldGFzY3JlZW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIG1ldGFzY3JlZW4gPSBtZXRhc2NyZWVuc1swXTtcbiAgICAgICAgfSBlbHNlIGlmICghbWV0YXNjcmVlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbXBvc3NpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVE9PRCAtIGZpbHRlciBiYXNlZCBvbiB3aG8gaGFzIGEgbWF0Y2ggZnVuY3Rpb24sIG9yIG1hdGNoaW5nIGZsYWdzXG4gICAgICAgICAgY29uc3QgZmxhZyA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gKCh5IDw8IDQpIHwgeCkpO1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXJzOiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICAgICAgICBjb25zdCBiZXN0OiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWV0YXNjcmVlbnMpIHtcbiAgICAgICAgICAgIGlmIChzLmRhdGEubWF0Y2gpIHtcbiAgICAgICAgICAgICAgbWF0Y2hlcnMucHVzaChzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocy5mbGFnID09PSAnYWx3YXlzJyAmJiBmbGFnPy5mbGFnID09PSAweDJmZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAhcy5mbGFnICYmICFzLmRhdGEud2FsbCAmJiAhZmxhZykge1xuICAgICAgICAgICAgICBiZXN0LnVuc2hpZnQocyk7IC8vIGZyb250LWxvYWQgbWF0Y2hpbmcgZmxhZ3NcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGJlc3QucHVzaChzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1hdGNoZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZnVuY3Rpb24gcmVhY2goZHk6IG51bWJlciwgZHg6IG51bWJlcikge1xuICAgICAgICAgICAgICBjb25zdCB4MCA9ICh4IDw8IDgpICsgZHg7XG4gICAgICAgICAgICAgIGNvbnN0IHkwID0gKHkgPDwgOCkgKyBkeTtcbiAgICAgICAgICAgICAgY29uc3QgdCA9XG4gICAgICAgICAgICAgICAgICAoeTAgPDwgNCkgJiAweGYwMDAgfCB4MCAmIDB4ZjAwIHwgeTAgJiAweGYwIHwgKHgwID4+IDQpICYgMHhmO1xuICAgICAgICAgICAgICByZXR1cm4gcmVhY2hhYmxlLmhhcyh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgbWF0Y2hlciBvZiBtYXRjaGVycykge1xuICAgICAgICAgICAgICBpZiAoIW1hdGNoZXIuZGF0YS5tYXRjaCEocmVhY2gsIGZsYWcgIT0gbnVsbCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICBtZXRhc2NyZWVuID0gbWF0Y2hlcjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghbWV0YXNjcmVlbikgbWV0YXNjcmVlbiA9IGJlc3RbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtZXRhc2NyZWVuKSB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGUnKTtcbiAgICAgICAgLy8gaWYgKChtZXRhc2NyZWVuLmRhdGEuZXhpdHMgfHwgbWV0YXNjcmVlbi5kYXRhLndhbGwpICYmXG4gICAgICAgIC8vICAgICAhcmVhY2hhYmxlU2NyZWVucy5oYXModDApICYmXG4gICAgICAgIC8vICAgICB0aWxlc2V0ICE9PSByb20ubWV0YXRpbGVzZXRzLnRvd2VyKSB7XG4gICAgICAgIC8vICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHN1cnZleSB1bnJlYWNoYWJsZSBzY3JlZW5zIChhbmQgaXQncyBoYXJkIHRvXG4gICAgICAgIC8vICAgLy8gdG8gZmlndXJlIG91dCB3aGljaCBpcyB3aGljaCBsYXRlcikuICBNYWtlIHN1cmUgbm90IHRvIGRvIHRoaXMgZm9yXG4gICAgICAgIC8vICAgLy8gdG93ZXIgYmVjYXVzZSBvdGhlcndpc2UgaXQnbGwgY2xvYmJlciBpbXBvcnRhbnQgcGFydHMgb2YgdGhlIG1hcC5cbiAgICAgICAgLy8gICBtZXRhc2NyZWVuID0gdGlsZXNldC5lbXB0eTtcbiAgICAgICAgLy8gfVxuICAgICAgICBzY3JlZW5zW3QwXSA9IG1ldGFzY3JlZW47XG4gICAgICAgIC8vIC8vIElmIHdlJ3JlIG9uIHRoZSBib3JkZXIgYW5kIGl0J3MgYW4gZWRnZSBleGl0IHRoZW4gY2hhbmdlIHRoZSBib3JkZXJcbiAgICAgICAgLy8gLy8gc2NyZWVuIHRvIHJlZmxlY3QgYW4gZXhpdC5cbiAgICAgICAgLy8gY29uc3QgZWRnZXMgPSBtZXRhc2NyZWVuLmVkZ2VFeGl0cygpO1xuICAgICAgICAvLyBpZiAoeSA9PT0gMCAmJiAoZWRnZXMgJiAxKSkgc2NyZWVuc1t0MCAtIDE2XSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh4ID09PSAwICYmIChlZGdlcyAmIDIpKSBzY3JlZW5zW3QwIC0gMV0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeSA9PT0gaGVpZ2h0ICYmIChlZGdlcyAmIDQpKSBzY3JlZW5zW3QwICsgMTZdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHggPT09IHdpZHRoICYmIChlZGdlcyAmIDgpKSBzY3JlZW5zW3QwICsgMV0gPSBleGl0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgZXhpdHNcbiAgICBjb25zdCBleGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHNyY1BvcyA9IGV4aXQuc2NyZWVuO1xuICAgICAgaWYgKCFyZWFjaGFibGVTY3JlZW5zLmhhcyhzcmNQb3MpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHNjcmVlbnNbc3JjUG9zXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZmluZEV4aXRUeXBlKGV4aXQudGlsZSwgaGVpZ2h0ID09PSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgISEoZXhpdC5lbnRyYW5jZSAmIDB4MjApKTtcbiAgICAgIGNvbnN0IHNyY1R5cGUgPSBzcmNFeGl0Py50eXBlO1xuICAgICAgaWYgKCFzcmNUeXBlKSB7XG4gICAgICAgIGNvbnN0IGlkID0gbG9jYXRpb24uaWQgPDwgMTYgfCBzcmNQb3MgPDwgOCB8IGV4aXQudGlsZTtcbiAgICAgICAgaWYgKHVua25vd25FeGl0V2hpdGVsaXN0LmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBhbGwgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8ubWFwKFxuICAgICAgICAgICAgZSA9PiBlLnR5cGUgKyAnOiAnICsgZS5leGl0cy5tYXAoaGV4KS5qb2luKCcsICcpKS5qb2luKCdcXG4gICcpO1xuICAgICAgICBjb25zb2xlLndhcm4oYFVua25vd24gZXhpdCAke2hleChleGl0LnRpbGUpfTogJHtzcmNTY3JlZW4ubmFtZX0gaW4gJHtcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbn0gQCAke2hleChzcmNQb3MpfTpcXG4gICR7YWxsfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChleGl0cy5oYXMoc3JjUG9zLCBzcmNUeXBlKSkgY29udGludWU7IC8vIGFscmVhZHkgaGFuZGxlZFxuICAgICAgY29uc3QgZGVzdCA9IHJvbS5sb2NhdGlvbnNbZXhpdC5kZXN0XTtcbiAgICAgIGlmIChzcmNUeXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgY29uc3QgZG93biA9IHNyY1R5cGUgPT09ICdzZWFtbGVzczpkb3duJztcbiAgICAgICAgLy8gTk9URTogdGhpcyBzZWVtcyB3cm9uZyAtIHRoZSBkb3duIGV4aXQgaXMgQkVMT1cgdGhlIHVwIGV4aXQuLi4/XG4gICAgICAgIGNvbnN0IHRpbGUgPSBzcmNFeGl0IS5leGl0c1swXSArIChkb3duID8gLTE2IDogMTYpO1xuICAgICAgICBjb25zdCBkZXN0UG9zID0gc3JjUG9zICsgKHRpbGUgPCAwID8gLTE2IDogdGlsZSA+PSAweGYwID8gMTYgOiAtMCk7XG4gICAgICAgIGNvbnN0IGRlc3RUeXBlID0gZG93biA/ICdzZWFtbGVzczp1cCcgOiAnc2VhbWxlc3M6ZG93bic7XG4gICAgICAgIC8vY29uc29sZS5sb2coYCR7c3JjVHlwZX0gJHtoZXgobG9jYXRpb24uaWQpfSAke2Rvd259ICR7aGV4KHRpbGUpfSAke2hleChkZXN0UG9zKX0gJHtkZXN0VHlwZX0gJHtoZXgoZGVzdC5pZCl9YCk7XG4gICAgICAgIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGVudHJhbmNlID0gZGVzdC5lbnRyYW5jZXNbZXhpdC5lbnRyYW5jZSAmIDB4MWZdO1xuICAgICAgbGV0IGRlc3RQb3MgPSBlbnRyYW5jZS5zY3JlZW47XG4gICAgICBsZXQgZGVzdENvb3JkID0gZW50cmFuY2UuY29vcmQ7XG4gICAgICBpZiAoc3JjVHlwZSA9PT0gJ2Rvb3InICYmIChlbnRyYW5jZS55ICYgMHhmMCkgPT09IDApIHtcbiAgICAgICAgLy8gTk9URTogVGhlIGl0ZW0gc2hvcCBkb29yIGluIE9hayBzdHJhZGRsZXMgdHdvIHNjcmVlbnMgKGV4aXQgaXMgb25cbiAgICAgICAgLy8gdGhlIE5XIHNjcmVlbiB3aGlsZSBlbnRyYW5jZSBpcyBvbiBTVyBzY3JlZW4pLiAgRG8gYSBxdWljayBoYWNrIHRvXG4gICAgICAgIC8vIGRldGVjdCB0aGlzIChwcm94eWluZyBcImRvb3JcIiBmb3IgXCJ1cHdhcmQgZXhpdFwiKSBhbmQgYWRqdXN0IHNlYXJjaFxuICAgICAgICAvLyB0YXJnZXQgYWNjb3JkaW5nbHkuXG4gICAgICAgIGRlc3RQb3MgLT0gMHgxMDtcbiAgICAgICAgZGVzdENvb3JkICs9IDB4MTAwMDA7XG4gICAgICB9XG4gICAgICAvLyBGaWd1cmUgb3V0IHRoZSBjb25uZWN0aW9uIHR5cGUgZm9yIHRoZSBkZXN0VGlsZS5cbiAgICAgIGNvbnN0IGRlc3RTY3JJZCA9IGRlc3Quc2NyZWVuc1tkZXN0UG9zID4+IDRdW2Rlc3RQb3MgJiAweGZdO1xuICAgICAgY29uc3QgZGVzdFR5cGUgPSBmaW5kRW50cmFuY2VUeXBlKGRlc3QsIGRlc3RTY3JJZCwgZGVzdENvb3JkKTtcbiAgICAgIC8vIE5PVEU6IGluaXRpYWwgc3Bhd24gaGFzIG5vIHR5cGUuLi4/XG4gICAgICBpZiAoIWRlc3RUeXBlKSB7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChkZXN0U2NySWQsIGRlc3QudGlsZXNldCkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgZGVzdFNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgICAgICBpZiAoZXhpdC50eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGluZXMucHVzaChgICAke2Rlc3RTY3IubmFtZX0gJHtleGl0LnR5cGV9OiAke2hleChleGl0LmVudHJhbmNlKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS53YXJuKGBCYWQgZW50cmFuY2UgJHtoZXgoZGVzdENvb3JkKX06IHJhdyAke2hleChkZXN0U2NySWQpXG4gICAgICAgICAgICAgICAgICAgICAgfSBpbiAke2Rlc3R9IEAgJHtoZXgoZGVzdFBvcyl9XFxuJHtsaW5lcy5qb2luKCdcXG4nKX1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICAgIC8vIGlmIChkZXN0VHlwZSkgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgdGhlIHBpdHMgbWFwLlxuICAgIGNvbnN0IHBpdHMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgcGl0IG9mIGxvY2F0aW9uLnBpdHMpIHtcbiAgICAgIHBpdHMuc2V0KHBpdC5mcm9tU2NyZWVuLCBwaXQuZGVzdCA8PCA4IHwgcGl0LnRvU2NyZWVuKTtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhbG9jID0gbmV3IE1ldGFsb2NhdGlvbihsb2NhdGlvbi5pZCwgdGlsZXNldCwgaGVpZ2h0LCB3aWR0aCk7XG4gICAgLy8gZm9yIChsZXQgaSA9IDA7IGkgPCBzY3JlZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gICBtZXRhbG9jLnNldEludGVybmFsKGksIHNjcmVlbnNbaV0pO1xuICAgIC8vIH1cbiAgICBtZXRhbG9jLl9zY3JlZW5zID0gc2NyZWVucztcbiAgICBtZXRhbG9jLl9leGl0cyA9IGV4aXRzO1xuICAgIG1ldGFsb2MuX3BpdHMgPSBwaXRzO1xuXG4gICAgLy8gRmlsbCBpbiBjdXN0b20gZmxhZ3NcbiAgICBmb3IgKGNvbnN0IGYgb2YgbG9jYXRpb24uZmxhZ3MpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGFsb2MuX3NjcmVlbnNbZi5zY3JlZW5dO1xuICAgICAgaWYgKHNjci5mbGFnPy5zdGFydHNXaXRoKCdjdXN0b20nKSkge1xuICAgICAgICBtZXRhbG9jLmN1c3RvbUZsYWdzLnNldChmLnNjcmVlbiwgcm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgICAgfSBlbHNlIGlmICghc2NyLmZsYWcpIHtcbiAgICAgICAgbWV0YWxvYy5mcmVlRmxhZ3MuYWRkKHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZm9yIChjb25zdCBwb3Mgb2YgbWV0YWxvYy5hbGxQb3MoKSkge1xuICAgIC8vICAgY29uc3Qgc2NyID0gcm9tLm1ldGFzY3JlZW5zW21ldGFsb2MuX3NjcmVlbnNbcG9zICsgMTZdXTtcbiAgICAvLyAgIGlmIChzY3IuZmxhZyA9PT0gJ2N1c3RvbScpIHtcbiAgICAvLyAgICAgY29uc3QgZiA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gcG9zKTtcbiAgICAvLyAgICAgaWYgKGYpIG1ldGFsb2MuY3VzdG9tRmxhZ3Muc2V0KHBvcywgcm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIC8vIFRPRE8gLSBzdG9yZSByZWFjaGFiaWxpdHkgbWFwP1xuICAgIHJldHVybiBtZXRhbG9jO1xuXG4gICAgZnVuY3Rpb24gZmluZEVudHJhbmNlVHlwZShkZXN0OiBMb2NhdGlvbiwgc2NySWQ6IG51bWJlciwgY29vcmQ6IG51bWJlcikge1xuICAgICAgZm9yIChjb25zdCBkZXN0U2NyIG9mIHJvbS5tZXRhc2NyZWVucy5nZXRCeUlkKHNjcklkLCBkZXN0LnRpbGVzZXQpKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBkZXN0U2NyLmZpbmRFbnRyYW5jZVR5cGUoY29vcmQsIGRlc3QuaGVpZ2h0ID09PSAxKTtcbiAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCkgcmV0dXJuIHR5cGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlzUmVhY2hhYmxlKHBvczogUG9zKTogYm9vbGVhbiB7XG4gIC8vICAgdGhpcy5jb21wdXRlUmVhY2hhYmxlKCk7XG4gIC8vICAgcmV0dXJuICEhKHRoaXMuX3JlYWNoYWJsZSFbcG9zID4+PiA0XSAmICgxIDw8IChwb3MgJiA3KSkpO1xuICAvLyB9XG5cbiAgLy8gY29tcHV0ZVJlYWNoYWJsZSgpIHtcbiAgLy8gICBpZiAodGhpcy5fcmVhY2hhYmxlKSByZXR1cm47XG4gIC8vICAgdGhpcy5fcmVhY2hhYmxlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5oZWlnaHQpO1xuICAvLyAgIGNvbnN0IG1hcCA9IHRoaXMudHJhdmVyc2Uoe2ZsaWdodDogdHJ1ZX0pO1xuICAvLyAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gICBjb25zdCByZWFjaGFibGUgPSBuZXcgU2V0PFBvcz4oKTtcbiAgLy8gICBmb3IgKGNvbnN0IFtwb3NdIG9mIHRoaXMuX2V4aXRzKSB7XG4gIC8vICAgICBjb25zdCBzZXQgPSBtYXAuZ2V0KHBvcylcbiAgLy8gICB9XG4gIC8vIH1cblxuICBnZXRVaWQocG9zOiBQb3MpOiBVaWQge1xuICAgIHJldHVybiB0aGlzLl9zY3JlZW5zW3Bvc10udWlkO1xuICB9XG5cbiAgZ2V0KHBvczogUG9zKTogTWV0YXNjcmVlbiB7XG4gICAgcmV0dXJuIHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgfVxuXG4gIC8vIFJlYWRvbmx5IGFjY2Vzc29yLlxuICAvLyBnZXQgc2NyZWVucygpOiByZWFkb25seSBVaWRbXSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuX3NjcmVlbnM7XG4gIC8vIH1cblxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fd2lkdGg7XG4gIH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIpIHtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5faGVpZ2h0ID4gaGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLnNwbGljZSgoaGVpZ2h0ICsgMikgPDwgNCwgKHRoaXMuX2hlaWdodCAtIGhlaWdodCkgPDwgNCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9oZWlnaHQgPCBoZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NjcmVlbnMubGVuZ3RoID0gKGhlaWdodCArIDIpIDw8IDQ7XG4gICAgICB0aGlzLl9zY3JlZW5zLmZpbGwodGhpcy50aWxlc2V0LmVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmhlaWdodCArIDIpIDw8IDQsIHRoaXMuX3NjcmVlbnMubGVuZ3RoKTtcbiAgICB9XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIFRPRE8gLSByZXNpemUgZnVuY3Rpb24/XG5cbiAgYWxsUG9zKCk6IHJlYWRvbmx5IFBvc1tdIHtcbiAgICBpZiAodGhpcy5fcG9zKSByZXR1cm4gdGhpcy5fcG9zO1xuICAgIGNvbnN0IHA6IG51bWJlcltdID0gdGhpcy5fcG9zID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl93aWR0aDsgeCsrKSB7XG4gICAgICAgIHAucHVzaCh5IDw8IDQgfCB4KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBzZXQocG9zOiBQb3MsIHNjcjogTWV0YXNjcmVlbiB8IG51bGwpIHtcbiAgICB0aGlzLl9zY3JlZW5zW3Bvc10gPSBzY3IgPz8gdGhpcy50aWxlc2V0LmVtcHR5O1xuICB9XG5cbiAgLy9pbnZhbGlkYXRlTW9uc3RlcnMoKSB7IHRoaXMuX21vbnN0ZXJzSW52YWxpZGF0ZWQgPSB0cnVlOyB9XG5cbiAgaW5Cb3VuZHMocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgICAvLyByZXR1cm4gaW5Cb3VuZHMocG9zLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCk7XG4gICAgcmV0dXJuIChwb3MgJiAxNSkgPCB0aGlzLndpZHRoICYmIHBvcyA+PSAwICYmIHBvcyA+Pj4gNCA8IHRoaXMuaGVpZ2h0O1xuICB9XG5cbiAgLy8gaXNGaXhlZChwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0aGlzLl9maXhlZC5oYXMocG9zKTtcbiAgLy8gfVxuXG4gIC8qKlxuICAgKiBGb3JjZS1vdmVyd3JpdGVzIHRoZSBnaXZlbiByYW5nZSBvZiBzY3JlZW5zLiAgRG9lcyB2YWxpZGl0eSBjaGVja2luZ1xuICAgKiBvbmx5IGF0IHRoZSBlbmQuICBEb2VzIG5vdCBkbyBhbnl0aGluZyB3aXRoIGZlYXR1cmVzLCBzaW5jZSB0aGV5J3JlXG4gICAqIG9ubHkgc2V0IGluIGxhdGVyIHBhc3NlcyAoaS5lLiBzaHVmZmxlLCB3aGljaCBpcyBsYXN0KS5cbiAgICovXG4gIHNldDJkKHBvczogUG9zLFxuICAgICAgICBzY3JlZW5zOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8T3B0aW9uYWw8TWV0YXNjcmVlbj4+Pik6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHNjcmVlbnMpIHtcbiAgICAgIGxldCBkeCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IHNjciBvZiByb3cpIHtcbiAgICAgICAgaWYgKHNjcikgdGhpcy5zZXQocG9zICsgZHgsIHNjcik7XG4gICAgICAgIGR4Kys7XG4gICAgICB9XG4gICAgICBwb3MgKz0gMTY7XG4gICAgfVxuICAgIC8vIHJldHVybiB0aGlzLnZlcmlmeShwb3MwLCBzY3JlZW5zLmxlbmd0aCxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgTWF0aC5tYXgoLi4uc2NyZWVucy5tYXAociA9PiByLmxlbmd0aCkpKTtcbiAgICByZXR1cm4gdGhpcy52YWxpZGF0ZSgpO1xuICB9XG5cbiAgLyoqIENoZWNrIGFsbCB0aGUgY3VycmVudGx5IGludmFsaWRhdGVkIGVkZ2VzLCB0aGVuIGNsZWFycyBpdC4gKi9cbiAgdmFsaWRhdGUoKTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBkaXIgb2YgWzAsIDFdKSB7XG4gICAgICBmb3IgKGxldCB5ID0gZGlyID8gMCA6IDE7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICAgIGZvciAobGV0IHggPSBkaXI7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBwb3MwOiBQb3MgPSB5IDw8IDQgfCB4O1xuICAgICAgICAgIGNvbnN0IHNjcjAgPSB0aGlzLl9zY3JlZW5zW3BvczBdO1xuICAgICAgICAgIGNvbnN0IHBvczE6IFBvcyA9IHBvczAgLSAoZGlyID8gMSA6IDE2KTtcbiAgICAgICAgICBjb25zdCBzY3IxID0gdGhpcy5fc2NyZWVuc1twb3MxXTtcbiAgICAgICAgICBpZiAoc2NyMC5pc0VtcHR5KCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChzY3IxLmlzRW1wdHkoKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKCFzY3IwLmNoZWNrTmVpZ2hib3Ioc2NyMSwgZGlyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZvcm1hdCgnYmFkIG5laWdoYm9yICVzICglMDJ4KSAlcyAlcyAoJTAyeCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3IxLm5hbWUsIHBvczEsIERJUl9OQU1FW2Rpcl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcjAubmFtZSwgcG9zMCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHNwbGljZUNvbHVtbnMobGVmdDogbnVtYmVyLCBkZWxldGVkOiBudW1iZXIsIGluc2VydGVkOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE1ldGFzY3JlZW4+Pikge1xuICAgIC8vIEZpcnN0IGFkanVzdCB0aGUgc2NyZWVucy5cbiAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuX3NjcmVlbnMubGVuZ3RoOyBwICs9IDE2KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmNvcHlXaXRoaW4ocCArIGxlZnQgKyBpbnNlcnRlZCwgcCArIGxlZnQgKyBkZWxldGVkLCBwICsgMTApO1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UocCArIGxlZnQsIGluc2VydGVkLCAuLi5zY3JlZW5zW3AgPj4gNF0pO1xuICAgIH1cbiAgICAvLyBVcGRhdGUgZGltZW5zaW9ucyBhbmQgYWNjb3VudGluZ1xuICAgIGNvbnN0IGRlbHRhID0gaW5zZXJ0ZWQgLSBkZWxldGVkO1xuICAgIHRoaXMud2lkdGggKz0gZGVsdGE7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICAgIC8vIE1vdmUgcmVsZXZhbnQgZXhpdHNcbiAgICBjb25zdCBtb3ZlOiBbUG9zLCBDb25uZWN0aW9uVHlwZSwgUG9zLCBDb25uZWN0aW9uVHlwZV1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHggPSBwb3MgJiAweGY7XG4gICAgICBpZiAoeCA8IGxlZnQgKyBkZWxldGVkKSB7XG4gICAgICAgIGlmICh4ID49IGxlZnQpIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG1vdmUucHVzaChbcG9zLCB0eXBlLCBwb3MgKyBkZWx0YSwgdHlwZV0pO1xuICAgIH1cbiAgICB0aGlzLm1vdmVFeGl0cyguLi5tb3ZlKTtcbiAgICAvLyBNb3ZlIGZsYWdzIGFuZCBzcGF3bnMgaW4gcGFyZW50IGxvY2F0aW9uXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGNvbnN0IHh0MCA9IChsZWZ0ICsgZGVsZXRlZCkgPDwgNDtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHBhcmVudC5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi54dCA8IHh0MCkgY29udGludWU7XG4gICAgICBzcGF3bi54dCAtPSAoZGVsdGEgPDwgNCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZmxhZyBvZiBwYXJlbnQuZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnLnhzIDwgbGVmdCArIGRlbGV0ZWQpIHtcbiAgICAgICAgaWYgKGZsYWcueHMgPj0gbGVmdCkgZmxhZy5zY3JlZW4gPSAweGZmO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZsYWcueHMgLT0gZGVsdGE7XG4gICAgfVxuICAgIHBhcmVudC5mbGFncyA9IHBhcmVudC5mbGFncy5maWx0ZXIoZiA9PiBmLnNjcmVlbiAhPT0gMHhmZik7XG5cbiAgICAvLyBUT0RPIC0gbW92ZSBwaXRzPz9cblxuICB9XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyBFeGl0IGhhbmRsaW5nXG5cbiAgc2V0RXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUsIHNwZWM6IEV4aXRTcGVjKSB7XG4gICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5sb2NhdGlvbnNbc3BlY1swXSA+Pj4gOF0ubWV0YTtcbiAgICBpZiAoIW90aGVyKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBzZXQgdHdvLXdheSBleGl0IHdpdGhvdXQgbWV0YWApO1xuICAgIHRoaXMuc2V0RXhpdE9uZVdheShwb3MsIHR5cGUsIHNwZWMpO1xuICAgIG90aGVyLnNldEV4aXRPbmVXYXkoc3BlY1swXSAmIDB4ZmYsIHNwZWNbMV0sIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgfVxuICBzZXRFeGl0T25lV2F5KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSwgc3BlYzogRXhpdFNwZWMpIHtcbiAgICAvLyBjb25zdCBwcmV2ID0gdGhpcy5fZXhpdHMuZ2V0KHBvcywgdHlwZSk7XG4gICAgLy8gaWYgKHByZXYpIHtcbiAgICAvLyAgIGNvbnN0IG90aGVyID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZbMF0gPj4+IDhdLm1ldGE7XG4gICAgLy8gICBpZiAob3RoZXIpIG90aGVyLl9leGl0cy5kZWxldGUocHJldlswXSAmIDB4ZmYsIHByZXZbMV0pO1xuICAgIC8vIH1cbiAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBzcGVjKTtcbiAgfVxuXG4gIGdldEV4aXQocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlKTogRXhpdFNwZWN8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fZXhpdHMuZ2V0KHBvcywgdHlwZSk7XG4gIH1cblxuICBleGl0cygpOiBJdGVyYWJsZTxyZWFkb25seSBbUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdPiB7XG4gICAgcmV0dXJuIHRoaXMuX2V4aXRzO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvdW50ZWQgY2FuZGlkYXRlcz9cbiAgZXhpdENhbmRpZGF0ZXModHlwZTogQ29ubmVjdGlvblR5cGUpOiBNZXRhc2NyZWVuW10ge1xuICAgIC8vIFRPRE8gLSBmaWd1cmUgb3V0IGEgd2F5IHRvIHVzZSB0aGUgZG91YmxlLXN0YWlyY2FzZT8gIGl0IHdvbid0XG4gICAgLy8gaGFwcGVuIGN1cnJlbnRseSBiZWNhdXNlIGl0J3MgZml4ZWQsIHNvIGl0J3MgZXhjbHVkZWQuLi4uP1xuICAgIGNvbnN0IGhhc0V4aXQ6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2NyIG9mIHRoaXMudGlsZXNldCkge1xuICAgICAgaWYgKHNjci5kYXRhLmV4aXRzPy5zb21lKGUgPT4gZS50eXBlID09PSB0eXBlKSkgaGFzRXhpdC5wdXNoKHNjcik7XG4gICAgfVxuICAgIHJldHVybiBoYXNFeGl0O1xuICB9XG5cbiAgLy8gVE9ETyAtIHNob3J0IHZzIGZ1bGw/XG4gIHNob3coKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIGxldCBsaW5lID0gW107XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgIGxpbmUucHVzaCh4LnRvU3RyaW5nKDE2KSk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goJyAgICcgKyBsaW5lLmpvaW4oJyAgJykpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCAzOyByKyspIHtcbiAgICAgICAgbGluZSA9IFtyID09PSAxID8geS50b1N0cmluZygxNikgOiAnICcsICcgJ107XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XTtcbiAgICAgICAgICBsaW5lLnB1c2goc2NyZWVuPy5kYXRhLmljb24/LmZ1bGxbcl0gPz8gKHIgPT09IDEgPyAnID8gJyA6ICcgICAnKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGluZXMucHVzaChsaW5lLmpvaW4oJycpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgc2NyZWVuTmFtZXMoKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgbGV0IGxpbmUgPSBbXTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF07XG4gICAgICAgIGxpbmUucHVzaChzY3JlZW4/Lm5hbWUpO1xuICAgICAgfVxuICAgICAgbGluZXMucHVzaChsaW5lLmpvaW4oJyAnKSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHRyYXZlcnNlKG9wdHM6IFRyYXZlcnNlT3B0cyA9IHt9KTogTWFwPG51bWJlciwgU2V0PG51bWJlcj4+IHtcbiAgICAvLyBSZXR1cm5zIGEgbWFwIGZyb20gdW5pb25maW5kIHJvb3QgdG8gYSBsaXN0IG9mIGFsbCByZWFjaGFibGUgdGlsZXMuXG4gICAgLy8gQWxsIGVsZW1lbnRzIG9mIHNldCBhcmUga2V5cyBwb2ludGluZyB0byB0aGUgc2FtZSB2YWx1ZSByZWYuXG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPG51bWJlcj4oKTtcbiAgICBjb25zdCBjb25uZWN0aW9uVHlwZSA9IChvcHRzLmZsaWdodCA/IDIgOiAwKSB8IChvcHRzLm5vRmxhZ2dlZCA/IDEgOiAwKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBvcHRzLndpdGg/LmdldChwb3MpID8/IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzY3IuY29ubmVjdGlvbnNbY29ubmVjdGlvblR5cGVdKSB7XG4gICAgICAgIGlmICghc2VnbWVudC5sZW5ndGgpIGNvbnRpbnVlOyAvLyBlLmcuIGVtcHR5XG4gICAgICAgIC8vIENvbm5lY3Qgd2l0aGluIGVhY2ggc2VnbWVudFxuICAgICAgICB1Zi51bmlvbihzZWdtZW50Lm1hcChjID0+IChwb3MgPDwgOCkgKyBjKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigpO1xuICAgIGNvbnN0IHNldHMgPSB1Zi5zZXRzKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzZXQgPSBzZXRzW2ldO1xuICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNldCkge1xuICAgICAgICBtYXAuc2V0KGVsZW0sIHNldCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hcDtcbiAgfSAgXG5cbiAgLyoqIEBwYXJhbSBlZGdlIEEgdmFsdWUgZnJvbSBhIHRyYXZlcnNlIHNldC4gKi9cbiAgZXhpdFR5cGUoZWRnZTogbnVtYmVyKTogQ29ubmVjdGlvblR5cGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoKGVkZ2UgJiAweGYwKSAhPT0gMHhlMCkgcmV0dXJuO1xuICAgIGNvbnN0IHBvcyA9IGVkZ2UgPj4+IDg7XG4gICAgY29uc3Qgc2NyID0gdGhpcy5nZXQocG9zKTtcbiAgICBjb25zdCB0eXBlID0gc2NyLmRhdGEuZXhpdHM/LltlZGdlICYgMHhmXS50eXBlO1xuICAgIGlmICghdHlwZT8uc3RhcnRzV2l0aCgnZWRnZTonKSkgcmV0dXJuIHR5cGU7XG4gICAgLy8gbWF5IG5vdCBhY3R1YWxseSBiZSBhbiBleGl0LlxuICAgIGlmICh0eXBlID09PSAnZWRnZTp0b3AnICYmIChwb3MgPj4+IDQpKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgKHBvcyA+Pj4gNCkgPT09IHRoaXMuaGVpZ2h0IC0gMSkgcmV0dXJuO1xuICAgIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0JyAmJiAocG9zICYgMHhmKSkgcmV0dXJuO1xuICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgJiAweGYpID09PSB0aGlzLndpZHRoIC0gMSkgcmV0dXJuO1xuICAgIHJldHVybiB0eXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBlZGdlIEEgdmFsdWUgZnJvbSBhIHRyYXZlcnNlIHNldC5cbiAgICogQHJldHVybiBBbiBZeVh4IHBvc2l0aW9uIGZvciB0aGUgZ2l2ZW4gcG9pLCBpZiBpdCBleGlzdHMuXG4gICAqL1xuICBwb2lUaWxlKGVkZ2U6IG51bWJlcik6IG51bWJlcnx1bmRlZmluZWQge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gIH1cblxuICAvKipcbiAgICogQXR0YWNoIGFuIGV4aXQvZW50cmFuY2UgcGFpciBpbiB0d28gZGlyZWN0aW9ucy5cbiAgICogQWxzbyByZWF0dGFjaGVzIHRoZSBmb3JtZXIgb3RoZXIgZW5kcyBvZiBlYWNoIHRvIGVhY2ggb3RoZXIuXG4gICAqL1xuICBhdHRhY2goc3JjUG9zOiBQb3MsIGRlc3Q6IE1ldGFsb2NhdGlvbiwgZGVzdFBvczogUG9zLFxuICAgICAgICAgc3JjVHlwZT86IENvbm5lY3Rpb25UeXBlLCBkZXN0VHlwZT86IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgaWYgKCFzcmNUeXBlKSBzcmNUeXBlID0gdGhpcy5waWNrVHlwZUZyb21FeGl0cyhzcmNQb3MpO1xuICAgIGlmICghZGVzdFR5cGUpIGRlc3RUeXBlID0gZGVzdC5waWNrVHlwZUZyb21FeGl0cyhkZXN0UG9zKTtcblxuICAgIC8vIFRPRE8gLSB3aGF0IGlmIG11bHRpcGxlIHJldmVyc2VzPyAgZS5nLiBjb3JkZWwgZWFzdC93ZXN0P1xuICAgIC8vICAgICAgLSBjb3VsZCBkZXRlcm1pbmUgaWYgdGhpcyBhbmQvb3IgZGVzdCBoYXMgYW55IHNlYW1sZXNzLlxuICAgIC8vIE5vOiBpbnN0ZWFkLCBkbyBhIHBvc3QtcHJvY2Vzcy4gIE9ubHkgY29yZGVsIG1hdHRlcnMsIHNvIGdvXG4gICAgLy8gdGhyb3VnaCBhbmQgYXR0YWNoIGFueSByZWR1bmRhbnQgZXhpdHMuXG5cbiAgICBjb25zdCBkZXN0VGlsZSA9IGRlc3QuaWQgPDwgOCB8IGRlc3RQb3M7XG4gICAgY29uc3QgcHJldkRlc3QgPSB0aGlzLl9leGl0cy5nZXQoc3JjUG9zLCBzcmNUeXBlKSE7XG4gICAgaWYgKHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldkRlc3RUaWxlLCBwcmV2RGVzdFR5cGVdID0gcHJldkRlc3Q7XG4gICAgICBpZiAocHJldkRlc3RUaWxlID09PSBkZXN0VGlsZSAmJiBwcmV2RGVzdFR5cGUgPT09IGRlc3RUeXBlKSByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHByZXZTcmMgPSBkZXN0Ll9leGl0cy5nZXQoZGVzdFBvcywgZGVzdFR5cGUpITtcbiAgICB0aGlzLl9leGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXSk7XG4gICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RQb3MsIGRlc3RUeXBlLCBbdGhpcy5pZCA8PCA4IHwgc3JjUG9zLCBzcmNUeXBlXSk7XG4gICAgLy8gYWxzbyBob29rIHVwIHByZXZpb3VzIHBhaXJcbiAgICBpZiAocHJldlNyYyAmJiBwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZEZXN0VGlsZSwgcHJldkRlc3RUeXBlXSA9IHByZXZEZXN0O1xuICAgICAgY29uc3QgW3ByZXZTcmNUaWxlLCBwcmV2U3JjVHlwZV0gPSBwcmV2U3JjO1xuICAgICAgY29uc3QgcHJldlNyY01ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlNyY1RpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBjb25zdCBwcmV2RGVzdE1ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldkRlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgcHJldlNyY01ldGEuX2V4aXRzLnNldChwcmV2U3JjVGlsZSAmIDB4ZmYsIHByZXZTcmNUeXBlLCBwcmV2RGVzdCk7XG4gICAgICBwcmV2RGVzdE1ldGEuX2V4aXRzLnNldChwcmV2RGVzdFRpbGUgJiAweGZmLCBwcmV2RGVzdFR5cGUsIHByZXZTcmMpO1xuICAgIH0gZWxzZSBpZiAocHJldlNyYyB8fCBwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZUaWxlLCBwcmV2VHlwZV0gPSBwcmV2U3JjIHx8IHByZXZEZXN0O1xuICAgICAgY29uc3QgcHJldk1ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBwcmV2TWV0YS5fZXhpdHMuZGVsZXRlKHByZXZUaWxlICYgMHhmZiwgcHJldlR5cGUpOyAgICAgIFxuICAgIH1cbiAgfVxuXG4gIHBpY2tUeXBlRnJvbUV4aXRzKHBvczogUG9zKTogQ29ubmVjdGlvblR5cGUge1xuICAgIGNvbnN0IHR5cGVzID0gWy4uLnRoaXMuX2V4aXRzLnJvdyhwb3MpLmtleXMoKV07XG4gICAgaWYgKCF0eXBlcy5sZW5ndGgpIHJldHVybiB0aGlzLnBpY2tUeXBlRnJvbVNjcmVlbnMocG9zKTtcbiAgICBpZiAodHlwZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzaW5nbGUgdHlwZSBmb3IgJHtoZXgocG9zKX06IFske3R5cGVzLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZXNbMF07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYW4gZXhpdCBmcm9tIG9uZSBwb3MvdHlwZSB0byBhbm90aGVyLlxuICAgKiBBbHNvIHVwZGF0ZXMgdGhlIG1ldGFsb2NhdGlvbiBvbiB0aGUgb3RoZXIgZW5kIG9mIHRoZSBleGl0LlxuICAgKiBUaGlzIHNob3VsZCB0eXBpY2FsbHkgYmUgZG9uZSBhdG9taWNhbGx5IGlmIHJlYnVpbGRpbmcgYSBtYXAuXG4gICAqL1xuICAvLyBUT0RPIC0gcmVidWlsZGluZyBhIG1hcCBpbnZvbHZlcyBtb3ZpbmcgdG8gYSBORVcgbWV0YWxvY2F0aW9uLi4uXG4gIC8vICAgICAgLSBnaXZlbiB0aGlzLCB3ZSBuZWVkIGEgZGlmZmVyZW50IGFwcHJvYWNoP1xuICBtb3ZlRXhpdHMoLi4ubW92ZXM6IEFycmF5PFtQb3MsIENvbm5lY3Rpb25UeXBlLCBMb2NQb3MsIENvbm5lY3Rpb25UeXBlXT4pIHtcbiAgICBjb25zdCBuZXdFeGl0czogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtvbGRQb3MsIG9sZFR5cGUsIG5ld1BvcywgbmV3VHlwZV0gb2YgbW92ZXMpIHtcbiAgICAgIGNvbnN0IGRlc3RFeGl0ID0gdGhpcy5fZXhpdHMuZ2V0KG9sZFBvcywgb2xkVHlwZSkhO1xuICAgICAgY29uc3QgW2Rlc3RUaWxlLCBkZXN0VHlwZV0gPSBkZXN0RXhpdDtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICBbdGhpcy5pZCA8PCA4IHwgbmV3UG9zLCBuZXdUeXBlXSk7XG4gICAgICBuZXdFeGl0cy5wdXNoKFtuZXdQb3MsIG5ld1R5cGUsIGRlc3RFeGl0XSk7XG4gICAgICB0aGlzLl9leGl0cy5kZWxldGUob2xkUG9zLCBvbGRUeXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBleGl0XSBvZiBuZXdFeGl0cykge1xuICAgICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgZXhpdCk7XG4gICAgfVxuICB9XG5cbiAgbW92ZUV4aXQocHJldjogUG9zLCBuZXh0OiBQb3MsXG4gICAgICAgICAgIHByZXZUeXBlPzogQ29ubmVjdGlvblR5cGUsIG5leHRUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXByZXZUeXBlKSBwcmV2VHlwZSA9IHRoaXMucGlja1R5cGVGcm9tRXhpdHMocHJldik7XG4gICAgaWYgKCFuZXh0VHlwZSkgbmV4dFR5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbVNjcmVlbnMobmV4dCk7XG4gICAgY29uc3QgZGVzdEV4aXQgPSB0aGlzLl9leGl0cy5nZXQocHJldiwgcHJldlR5cGUpITtcbiAgICBjb25zdCBbZGVzdFRpbGUsIGRlc3RUeXBlXSA9IGRlc3RFeGl0O1xuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIFt0aGlzLmlkIDw8IDggfCBuZXh0LCBuZXh0VHlwZV0pO1xuICAgIHRoaXMuX2V4aXRzLnNldChuZXh0LCBuZXh0VHlwZSwgZGVzdEV4aXQpO1xuICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwcmV2LCBwcmV2VHlwZSk7XG4gIH1cblxuICBtb3ZlRXhpdHNBbmRQaXRzVG8ob3RoZXI6IE1ldGFsb2NhdGlvbikge1xuICAgIGNvbnN0IG1vdmVkID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2Ygb3RoZXIuYWxsUG9zKCkpIHtcbiAgICAgIGlmICghb3RoZXIuZ2V0KHBvcykuZGF0YS5kZWxldGUpIHtcbiAgICAgICAgbW92ZWQuYWRkKHBvcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBpZiAoIW1vdmVkLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4+IDhdLm1ldGE7XG4gICAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSwgW290aGVyLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgIG90aGVyLl9leGl0cy5zZXQocG9zLCB0eXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXSk7XG4gICAgICB0aGlzLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbZnJvbSwgdG9dIG9mIHRoaXMuX3BpdHMpIHtcbiAgICAgIGlmICghbW92ZWQuaGFzKGZyb20pKSBjb250aW51ZTtcbiAgICAgIG90aGVyLl9waXRzLnNldChmcm9tLCB0byk7XG4gICAgICB0aGlzLl9waXRzLmRlbGV0ZShmcm9tKTtcbiAgICB9XG4gIH1cblxuICBwaWNrVHlwZUZyb21TY3JlZW5zKHBvczogUG9zKTogQ29ubmVjdGlvblR5cGUge1xuICAgIGNvbnN0IGV4aXRzID0gdGhpcy5fc2NyZWVuc1twb3NdLmRhdGEuZXhpdHM7XG4gICAgY29uc3QgdHlwZXMgPSAoZXhpdHMgPz8gW10pLm1hcChlID0+IGUudHlwZSk7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzaW5nbGUgdHlwZSBmb3IgJHtoZXgocG9zKX06IFske3R5cGVzLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZXNbMF07XG4gIH1cblxuICB0cmFuc2ZlckZsYWdzKG9yaWc6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBDb3B5IG92ZXIgdGhlIGZyZWUgZmxhZ3NcbiAgICB0aGlzLmZyZWVGbGFncyA9IG5ldyBTZXQob3JpZy5mcmVlRmxhZ3MpO1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBjdXN0b20gZmxhZ3MuXG4gICAgY29uc3QgY3VzdG9tcyA9IG5ldyBEZWZhdWx0TWFwPE1ldGFzY3JlZW4sIEZsYWdbXT4oKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgW3BvcywgZmxhZ10gb2Ygb3JpZy5jdXN0b21GbGFncykge1xuICAgICAgY3VzdG9tcy5nZXQob3JpZy5fc2NyZWVuc1twb3NdKS5wdXNoKGZsYWcpO1xuICAgIH1cbiAgICAvLyBTaHVmZmxlIHRoZW0ganVzdCBpbiBjYXNlIHRoZXkncmUgbm90IGFsbCB0aGUgc2FtZS4uLlxuICAgIC8vIFRPRE8gLSBmb3Igc2VhbWxlc3MgcGFpcnMsIG9ubHkgc2h1ZmZsZSBvbmNlLCB0aGVuIGNvcHkuXG4gICAgZm9yIChjb25zdCBmbGFncyBvZiBjdXN0b21zLnZhbHVlcygpKSByYW5kb20uc2h1ZmZsZShmbGFncyk7XG4gICAgLy8gRmluZCBhbGwgdGhlIGN1c3RvbS1mbGFnIHNjcmVlbnMgaW4gdGhlIG5ldyBsb2NhdGlvbi5cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBpZiAoc2NyLmZsYWc/LnN0YXJ0c1dpdGgoJ2N1c3RvbScpKSB7XG4gICAgICAgIGNvbnN0IGZsYWcgPSBjdXN0b21zLmdldChzY3IpLnBvcCgpO1xuICAgICAgICBpZiAoIWZsYWcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGZsYWcgZm9yICR7c2NyLm5hbWV9IGF0ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19IEAke2hleChwb3MpfWApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3VzdG9tRmxhZ3Muc2V0KHBvcywgZmxhZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIFJlYWQgcGl0cyBmcm9tIHRoZSBvcmlnaW5hbC4gIFRoZSBkZXN0aW5hdGlvbiBtdXN0IGJlIHNodWZmbGVkIGFscmVhZHkuICovXG4gIHRyYW5zZmVyUGl0cyhvcmlnOiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gRmluZCBhbGwgcGl0IGRlc3RpbmF0aW9ucy5cbiAgICB0aGlzLl9waXRzLmNsZWFyKCk7XG4gICAgY29uc3QgZGVzdHMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IFssIGRlc3RdIG9mIG9yaWcuX3BpdHMpIHtcbiAgICAgIGRlc3RzLmFkZCh0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdCA+Pj4gOF0uaWQpO1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIGV4aXN0aW5nIHBpdHMuICBTb3J0IGJ5IGxvY2F0aW9uLCBbcGl0IHBvcywgZGVzdCBwb3NdXG4gICAgY29uc3QgcGl0cyA9IG5ldyBEZWZhdWx0TWFwPE1ldGFsb2NhdGlvbiwgQXJyYXk8W1BvcywgUG9zXT4+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLmdldChwb3MpO1xuICAgICAgaWYgKCFzY3IuaGFzRmVhdHVyZSgncGl0JykpIGNvbnRpbnVlO1xuICAgICAgLy8gRmluZCB0aGUgbmVhcmVzdCBleGl0IHRvIG9uZSBvZiB0aG9zZSBkZXN0aW5hdGlvbnM6IFtkZWx0YSwgbG9jLCBkaXN0XVxuICAgICAgbGV0IGNsb3Nlc3Q6IFtQb3MsIE1ldGFsb2NhdGlvbiwgbnVtYmVyXSA9IFstMSwgdGhpcywgSW5maW5pdHldO1xuICAgICAgZm9yIChjb25zdCBbZXhpdFBvcywsIFtkZXN0XV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgICAgY29uc3QgZGlzdCA9IGRpc3RhbmNlKHBvcywgZXhpdFBvcyk7XG4gICAgICAgIGlmIChkZXN0cy5oYXMoZGVzdCA+Pj4gOCkgJiYgZGlzdCA8IGNsb3Nlc3RbMl0pIHtcbiAgICAgICAgICBjb25zdCBkbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3QgPj4+IDhdLm1ldGE7XG4gICAgICAgICAgY29uc3QgZHBvcyA9IGRlc3QgJiAweGZmO1xuICAgICAgICAgIGNsb3Nlc3QgPSBbYWRkRGVsdGEocG9zLCBkcG9zLCBleGl0UG9zLCBkbG9jKSwgZGxvYywgZGlzdF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChjbG9zZXN0WzBdIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyBleGl0IGZvdW5kYCk7XG4gICAgICBwaXRzLmdldChjbG9zZXN0WzFdKS5wdXNoKFtwb3MsIGNsb3Nlc3RbMF1dKTtcbiAgICB9XG5cbiAgICAvLyBGb3IgZWFjaCBkZXN0aW5hdGlvbiBsb2NhdGlvbiwgbG9vayBmb3Igc3Bpa2VzLCB0aGVzZSB3aWxsIG92ZXJyaWRlXG4gICAgLy8gYW55IHBvc2l0aW9uLWJhc2VkIGRlc3RpbmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IFtkZXN0LCBsaXN0XSBvZiBwaXRzKSB7XG4gICAgICAvLyB2ZXJ0aWNhbCwgaG9yaXpvbnRhbFxuICAgICAgY29uc3QgZWxpZ2libGU6IFBvc1tdW10gPSBbW10sIFtdXTtcbiAgICAgIGNvbnN0IHNwaWtlcyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiBkZXN0LmFsbFBvcygpKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGRlc3QuZ2V0KHBvcyk7XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncml2ZXInKSB8fCBzY3IuaGFzRmVhdHVyZSgnZW1wdHknKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGVkZ2VzID1cbiAgICAgICAgICAgIChzY3IuZGF0YS5lZGdlcyB8fCAnJykuc3BsaXQoJycpLm1hcCh4ID0+IHggPT09ICcgJyA/ICcnIDogeCk7XG4gICAgICAgIGlmIChlZGdlc1swXSAmJiBlZGdlc1syXSkgZWxpZ2libGVbMF0ucHVzaChwb3MpO1xuICAgICAgICAvLyBOT1RFOiB3ZSBjbGFtcCB0aGUgdGFyZ2V0IFggY29vcmRzIHNvIHRoYXQgc3Bpa2Ugc2NyZWVucyBhcmUgYWxsIGdvb2RcbiAgICAgICAgLy8gdGhpcyBwcmV2ZW50cyBlcnJvcnMgZnJvbSBub3QgaGF2aW5nIGEgdmlhYmxlIGRlc3RpbmF0aW9uIHNjcmVlbi5cbiAgICAgICAgaWYgKChlZGdlc1sxXSAmJiBlZGdlc1szXSkgfHwgc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSB7XG4gICAgICAgICAgZWxpZ2libGVbMV0ucHVzaChwb3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgICBzcGlrZXMuc2V0KHBvcywgWy4uLmVkZ2VzXS5maWx0ZXIoYyA9PiBjID09PSAncycpLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbi8vY29uc29sZS5sb2coYGRlc3Q6XFxuJHtkZXN0LnNob3coKX1cXG5lbGlnaWJsZTogJHtlbGlnaWJsZS5tYXAoZSA9PiBlLm1hcChoID0+IGgudG9TdHJpbmcoMTYpKS5qb2luKCcsJykpLmpvaW4oJyAgJyl9YCk7XG4gICAgICAvLyBmaW5kIHRoZSBjbG9zZXN0IGRlc3RpbmF0aW9uIGZvciB0aGUgZmlyc3QgcGl0LCBrZWVwIGEgcnVubmluZyBkZWx0YS5cbiAgICAgIGxldCBkZWx0YTogW1BvcywgUG9zXSA9IFswLCAwXTtcbiAgICAgIGZvciAoY29uc3QgW3Vwc3RhaXJzLCBkb3duc3RhaXJzXSBvZiBsaXN0KSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuZ2V0KHVwc3RhaXJzKTtcbiAgICAgICAgY29uc3QgZWRnZXMgPSBzY3IuZGF0YS5lZGdlcyB8fCAnJztcbiAgICAgICAgY29uc3QgZGlyID0gZWRnZXNbMF0gPT09ICdjJyAmJiBlZGdlc1syXSA9PT0gJ2MnID8gMCA6IDFcbiAgICAgICAgLy8gZWxpZ2libGUgZGVzdCB0aWxlLCBkaXN0YW5jZVxuICAgICAgICBsZXQgY2xvc2VzdDogW1BvcywgbnVtYmVyLCBudW1iZXJdID0gWy0xLCBJbmZpbml0eSwgMF07XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGFkZERlbHRhKGRvd25zdGFpcnMsIGRlbHRhWzBdLCBkZWx0YVsxXSwgZGVzdCk7XG4gICAgICAgIGZvciAoY29uc3QgcG9zIG9mIGVsaWdpYmxlW2Rpcl0pIHsgLy9mb3IgKGxldCBpID0gMDsgaSA8IGVsaWdpYmxlW2Rpcl0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAvLyAgICAgICAgICBjb25zdCBwb3MgPSBlbGlnaWJsZVtkaXJdW2ldO1xuICAgICAgICAgIGNvbnN0IHNwaWtlQ291bnQgPSBzcGlrZXMuZ2V0KHBvcykgPz8gMDtcbiAgICAgICAgICBpZiAoc3Bpa2VDb3VudCA8IGNsb3Nlc3RbMl0pIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGRpc3QgPSBkaXN0YW5jZSh0YXJnZXQsIHBvcyk7XG4gICAgICAgICAgaWYgKGRpc3QgPCBjbG9zZXN0WzFdKSB7XG4gICAgICAgICAgICBjbG9zZXN0ID0gW3BvcywgZGlzdCwgc3Bpa2VDb3VudF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVuZFBvcyA9IGNsb3Nlc3RbMF07XG4gICAgICAgIGlmIChlbmRQb3MgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGVsaWdpYmxlIGRlc3RgKTtcbiAgICAgICAgZGVsdGEgPSBbZW5kUG9zLCB0YXJnZXRdO1xuICAgICAgICB0aGlzLl9waXRzLnNldCh1cHN0YWlycywgZGVzdC5pZCA8PCA4IHwgZW5kUG9zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGFrZXMgb3duZXJzaGlwIG9mIGV4aXRzIGZyb20gYW5vdGhlciBtZXRhbG9jYXRpb24gd2l0aCB0aGUgc2FtZSBJRC5cbiAgICogQHBhcmFtIHtmaXhlZH0gbWFwcyBkZXN0aW5hdGlvbiBsb2NhdGlvbiBJRCB0byBwb3Mgd2hlcmUgdGhlIGV4aXQgaXMuXG4gICAqL1xuICB0cmFuc2ZlckV4aXRzKG9yaWc6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBEZXRlcm1pbmUgYWxsIHRoZSBlbGlnaWJsZSBleGl0IHNjcmVlbnMuXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgRGVmYXVsdE1hcDxDb25uZWN0aW9uVHlwZSwgUG9zW10+KCgpID0+IFtdKTtcbiAgICBjb25zdCBzZWxmRXhpdHMgPSBuZXcgRGVmYXVsdE1hcDxDb25uZWN0aW9uVHlwZSwgU2V0PFBvcz4+KCgpID0+IG5ldyBTZXQoKSk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgZm9yIChjb25zdCB7dHlwZX0gb2Ygc2NyLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnRvcCcgJiYgKHBvcyA+Pj4gNCkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6bGVmdCcgJiYgKHBvcyAmIDB4ZikpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiAocG9zID4+PiA0KSA8IHRoaXMuaGVpZ2h0IC0gMSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpyaWdodCcgJiYgKHBvcyAmIDB4ZikgPCB0aGlzLndpZHRoIC0gMSkgY29udGludWU7XG4gICAgICAgIGV4aXRzLmdldCh0eXBlKS5wdXNoKHBvcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgYXJyIG9mIGV4aXRzLnZhbHVlcygpKSB7XG4gICAgICByYW5kb20uc2h1ZmZsZShhcnIpO1xuICAgIH1cbiAgICAvLyBGaW5kIGEgbWF0Y2ggZm9yIGVhY2ggb3JpZ2luYWwgZXhpdC5cbiAgICBmb3IgKGNvbnN0IFtvcG9zLCB0eXBlLCBleGl0XSBvZiBvcmlnLl9leGl0cykge1xuICAgICAgaWYgKHNlbGZFeGl0cy5nZXQodHlwZSkuaGFzKG9wb3MpKSBjb250aW51ZTtcbiAgICAgIC8vIG9wb3MsZXhpdCBmcm9tIG9yaWdpbmFsIHZlcnNpb24gb2YgdGhpcyBtZXRhbG9jYXRpb25cbiAgICAgIGNvbnN0IHBvcyA9IGV4aXRzLmdldCh0eXBlKS5wb3AoKTsgLy8gYSBQb3MgaW4gdGhpcyBtZXRhbG9jYXRpb25cbiAgICAgIGlmIChwb3MgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB0cmFuc2ZlciBleGl0ICR7dHlwZX0gaW4gJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19OiBubyBlbGlnaWJsZSBzY3JlZW5cXG4ke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpfWApO1xuICAgICAgfVxuICAgICAgLy8gTG9vayBmb3IgYSByZXZlcnNlIGV4aXQ6IGV4aXQgaXMgdGhlIHNwZWMgZnJvbSBvbGQgbWV0YS5cbiAgICAgIC8vIEZpbmQgdGhlIG1ldGFsb2NhdGlvbiBpdCByZWZlcnMgdG8gYW5kIHNlZSBpZiB0aGUgZXhpdFxuICAgICAgLy8gZ29lcyBiYWNrIHRvIHRoZSBvcmlnaW5hbCBwb3NpdGlvbi5cbiAgICAgIGNvbnN0IGVsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdFswXSA+Pj4gOF0ubWV0YTtcbiAgICAgIGNvbnN0IGVwb3MgPSBleGl0WzBdICYgMHhmZjtcbiAgICAgIGNvbnN0IGV0eXBlID0gZXhpdFsxXTtcbiAgICAgIGlmIChlbG9jID09PSBvcmlnKSB7XG4gICAgICAgIC8vIFNwZWNpYWwgY2FzZSBvZiBhIHNlbGYtZXhpdCAoaGFwcGVucyBpbiBoeWRyYSBhbmQgcHlyYW1pZCkuXG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSwganVzdCBwaWNrIGFuIGV4aXQgb2YgdGhlIGNvcnJlY3QgdHlwZS5cbiAgICAgICAgY29uc3QgbnBvcyA9IGV4aXRzLmdldChldHlwZSkucG9wKCk7XG4gICAgICAgIGlmIChucG9zID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZWApO1xuICAgICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBbdGhpcy5pZCA8PCA4IHwgbnBvcywgZXR5cGVdKTtcbiAgICAgICAgdGhpcy5fZXhpdHMuc2V0KG5wb3MsIGV0eXBlLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gICAgICAgIC8vIEFsc28gZG9uJ3QgdmlzaXQgdGhlIG90aGVyIGV4aXQgbGF0ZXIuXG4gICAgICAgIHNlbGZFeGl0cy5nZXQoZXR5cGUpLmFkZChlcG9zKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCByZXQgPSBlbG9jLl9leGl0cy5nZXQoZXBvcywgZXR5cGUpITtcbiAgICAgIGlmICghcmV0KSB7XG4gICAgICAgIGNvbnN0IGVlbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2V4aXRbMF0gPj4+IDhdO1xuICAgICAgICBjb25zb2xlLmxvZyhlbG9jKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBleGl0IGZvciAke2VlbG9jfSBhdCAke2hleChlcG9zKX0gJHtldHlwZX1cXG4ke1xuICAgICAgICAgICAgICAgICAgICAgICAgIGVsb2Muc2hvdygpfVxcbiR7dGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfSBhdCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIGhleChvcG9zKX0gJHt0eXBlfVxcbiR7dGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICBpZiAoKHJldFswXSA+Pj4gOCkgPT09IHRoaXMuaWQgJiYgKChyZXRbMF0gJiAweGZmKSA9PT0gb3BvcykgJiZcbiAgICAgICAgICByZXRbMV0gPT09IHR5cGUpIHtcbiAgICAgICAgZWxvYy5fZXhpdHMuc2V0KGVwb3MsIGV0eXBlLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgTlBDcywgdHJpZ2dlcnMsIGFuZCBjaGVzdHMgYmFzZWQgb24gcHJveGltaXR5IHRvIHNjcmVlbnMsXG4gICAqIGV4aXRzLCBhbmQgUE9JLlxuICAgKi9cbiAgdHJhbnNmZXJTcGF3bnModGhhdDogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIFN0YXJ0IGJ5IGJ1aWxkaW5nIGEgbWFwIGJldHdlZW4gZXhpdHMgYW5kIHNwZWNpZmljIHNjcmVlbiB0eXBlcy5cbiAgICBjb25zdCByZXZlcnNlRXhpdHMgPSBuZXcgTWFwPEV4aXRTcGVjLCBbbnVtYmVyLCBudW1iZXJdPigpOyAvLyBtYXAgdG8geSx4XG4gICAgY29uc3QgcGl0cyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7IC8vIG1hcHMgdG8gZGlyICgwID0gdmVydCwgMSA9IGhvcml6KVxuICAgIGNvbnN0IHN0YXR1ZXM6IEFycmF5PFtQb3MsIG51bWJlcl0+ID0gW107IC8vIGFycmF5IG9mIHNwYXduIFtzY3JlZW4sIGNvb3JkXVxuICAgIC8vIEFycmF5IG9mIFtvbGQgeSwgb2xkIHgsIG5ldyB5LCBuZXcgeCwgbWF4IGRpc3RhbmNlIChzcXVhcmVkKV1cbiAgICBjb25zdCBtYXA6IEFycmF5PFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgY29uc3Qgd2FsbHM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgY29uc3QgYnJpZGdlczogQXJyYXk8W251bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICAvLyBQYWlyIHVwIGFyZW5hcy5cbiAgICBjb25zdCBhcmVuYXM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiBsb2MuYWxsUG9zKCkpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gbG9jLl9zY3JlZW5zW3Bvc107XG4gICAgICAgIGNvbnN0IHkgPSBwb3MgJiAweGYwO1xuICAgICAgICBjb25zdCB4ID0gKHBvcyAmIDB4ZikgPDwgNDtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdwaXQnKSAmJiBsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBwaXRzLnNldChwb3MsIHNjci5lZGdlSW5kZXgoJ2MnKSA9PT0gNSA/IDAgOiAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChzY3IuZGF0YS5zdGF0dWVzPy5sZW5ndGggJiYgbG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY3IuZGF0YS5zdGF0dWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBzY3IuZGF0YS5zdGF0dWVzW2ldIDw8IDEyO1xuICAgICAgICAgICAgY29uc3QgcGFyaXR5ID0gKChwb3MgJiAweGYpIF4gKHBvcyA+Pj4gNCkgXiBpKSAmIDE7XG4gICAgICAgICAgICBjb25zdCBjb2wgPSBwYXJpdHkgPyAweDUwIDogMHhhMDtcbiAgICAgICAgICAgIHN0YXR1ZXMucHVzaChbcG9zLCByb3cgfCBjb2xdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcyAmJiBzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSB7XG4gICAgICAgICAgaWYgKHNjci5kYXRhLndhbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHdhbGwgcHJvcGApO1xuICAgICAgICAgIGNvbnN0IHdhbGwgPSBbeSB8IChzY3IuZGF0YS53YWxsID4+IDQpLCB4IHwgKHNjci5kYXRhLndhbGwgJiAweGYpXTtcbiAgICAgICAgICB3YWxscy5wdXNoKHdhbGwgYXMgW251bWJlciwgbnVtYmVyXSk7XG4gICAgICAgICAgLy8gU3BlY2lhbC1jYXNlIHRoZSBcImRvdWJsZSBicmlkZ2VcIiBpbiBsaW1lIHRyZWUgbGFrZVxuICAgICAgICAgIGlmIChzY3IuZGF0YS50aWxlc2V0cy5saW1lKSB3YWxscy5wdXNoKFt3YWxsWzBdIC0gMSwgd2FsbFsxXV0pO1xuICAgICAgICB9IGVsc2UgaWYgKGxvYyA9PT0gdGhpcyAmJiBzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHtcbiAgICAgICAgICBpZiAoc2NyLmRhdGEud2FsbCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgd2FsbCBwcm9wYCk7XG4gICAgICAgICAgYnJpZGdlcy5wdXNoKFt5IHwgKHNjci5kYXRhLndhbGwgPj4gNCksIHggfCAoc2NyLmRhdGEud2FsbCAmIDB4ZildKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNjci5oYXNGZWF0dXJlKCdhcmVuYScpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIGFyZW5hcy5wdXNoKFt5IHwgOCwgeCB8IDhdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBbbnksIG54XSA9IGFyZW5hcy5wb3AoKSE7XG4gICAgICAgICAgbWFwLnB1c2goW3kgfCA4LCB4IHwgOCwgbnksIG54LCAxNDRdKTsgLy8gMTIgdGlsZXNcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGxvYyA9PT0gdGhpcykgeyAvLyBUT0RPIC0gdGhpcyBpcyBhIG1lc3MsIGZhY3RvciBvdXQgdGhlIGNvbW1vbmFsaXR5XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKGFyZW5hcyk7XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKHN0YXR1ZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBOb3cgcGFpciB1cCBleGl0cy5cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgZXhpdF0gb2YgbG9jLl9leGl0cykge1xuICAgICAgICBjb25zdCBzY3IgPSBsb2MuX3NjcmVlbnNbcG9zXTtcbiAgICAgICAgY29uc3Qgc3BlYyA9IHNjci5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSB0eXBlKTtcbiAgICAgICAgaWYgKCFzcGVjKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZXhpdDogJHtzY3IubmFtZX0gJHt0eXBlfWApO1xuICAgICAgICBjb25zdCB4MCA9IHBvcyAmIDB4ZjtcbiAgICAgICAgY29uc3QgeTAgPSBwb3MgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHgxID0gc3BlYy5leGl0c1swXSAmIDB4ZjtcbiAgICAgICAgY29uc3QgeTEgPSBzcGVjLmV4aXRzWzBdID4+PiA0O1xuICAgICAgICBpZiAobG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgcmV2ZXJzZUV4aXRzLnNldChleGl0LCBbeTAgPDwgNCB8IHkxLCB4MCA8PCA0IHwgeDFdKTtcbiAgICAgICAgfSBlbHNlIGlmICgoZXhpdFswXSA+Pj4gOCkgIT09IHRoaXMuaWQpIHsgLy8gc2tpcCBzZWxmLWV4aXRzXG4gICAgICAgICAgY29uc3QgW255LCBueF0gPSByZXZlcnNlRXhpdHMuZ2V0KGV4aXQpITtcbiAgICAgICAgICBtYXAucHVzaChbeTAgPDwgNCB8IHkxLCB4MCA8PCA0IHwgeDEsIG55LCBueCwgMjVdKTsgLy8gNSB0aWxlc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE1ha2UgYSBsaXN0IG9mIFBPSSBieSBwcmlvcml0eSAoMC4uNSkuXG5cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBmaXJzdCBwYXJ0aXRpb25pbmcgdGhlIHNjcmVlbnMgd2l0aCBpbXBhc3NpYmxlXG4gICAgLy8gd2FsbHMgYW5kIHBsYWNpbmcgcG9pIGludG8gYXMgbWFueSBzZXBhcmF0ZSBwYXJ0aXRpb25zIChmcm9tXG4gICAgLy8gc3RhaXJzL2VudHJhbmNlcykgYXMgcG9zc2libGUgPz8/ICBPciBtYXliZSBqdXN0IHdlaWdodCB0aG9zZVxuICAgIC8vIGhpZ2hlcj8gIGRvbid0IHdhbnQgdG8gX2ZvcmNlXyB0aGluZ3MgdG8gYmUgaW5hY2Nlc3NpYmxlLi4uP1xuXG4gICAgY29uc3QgcHBvaTogQXJyYXk8QXJyYXk8W251bWJlciwgbnVtYmVyXT4+ID0gW1tdLCBbXSwgW10sIFtdLCBbXSwgW11dO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3QgW3AsIGR5ID0gMHg3MCwgZHggPSAweDc4XSBvZiBzY3IuZGF0YS5wb2kgPz8gW10pIHtcbiAgICAgICAgY29uc3QgeSA9ICgocG9zICYgMHhmMCkgPDwgNCkgKyBkeTtcbiAgICAgICAgY29uc3QgeCA9ICgocG9zICYgMHgwZikgPDwgOCkgKyBkeDtcbiAgICAgICAgcHBvaVtwXS5wdXNoKFt5LCB4XSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9pIG9mIHBwb2kpIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKHBvaSk7XG4gICAgfVxuICAgIGNvbnN0IGFsbFBvaSA9IFsuLi5pdGVycy5jb25jYXQoLi4ucHBvaSldO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgc3Bhd25zLCBsb29rIGZvciBOUEMvY2hlc3QvdHJpZ2dlci5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgXG4gICAgZm9yIChjb25zdCBzcGF3biBvZiByYW5kb20uc2h1ZmZsZShsb2Muc3Bhd25zKSkge1xuICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpKSB7XG4gICAgICAgIGNvbnN0IHBsYXRmb3JtID0gUExBVEZPUk1TLmluZGV4T2Yoc3Bhd24ubW9uc3RlcklkKTtcbiAgICAgICAgaWYgKHBsYXRmb3JtID49IDAgJiYgcGl0cy5zaXplKSB7XG4gICAgICAgICAgY29uc3QgW1twb3MsIGRpcl1dID0gcGl0cztcbiAgICAgICAgICBwaXRzLmRlbGV0ZShwb3MpO1xuICAgICAgICAgIHNwYXduLm1vbnN0ZXJJZCA9IFBMQVRGT1JNU1twbGF0Zm9ybSAmIDIgfCBkaXJdO1xuICAgICAgICAgIHNwYXduLnNjcmVlbiA9IHBvcztcbiAgICAgICAgICBzcGF3bi50aWxlID0gZGlyID8gMHg3MyA6IDB4NDc7XG4gICAgICAgIH0gZWxzZSBpZiAoc3Bhd24ubW9uc3RlcklkID09PSAweDhmICYmIHN0YXR1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgW3NjcmVlbiwgY29vcmRdID0gc3RhdHVlcy5wb3AoKSE7XG4gICAgICAgICAgc3Bhd24uc2NyZWVuID0gc2NyZWVuO1xuICAgICAgICAgIHNwYXduLmNvb3JkID0gY29vcmQ7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7IC8vIHRoZXNlIGFyZSBoYW5kbGVkIGVsc2V3aGVyZS5cbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgY29uc3Qgd2FsbCA9IChzcGF3bi53YWxsVHlwZSgpID09PSAnYnJpZGdlJyA/IGJyaWRnZXMgOiB3YWxscykucG9wKCk7XG4gICAgICAgIGlmICghd2FsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGVub3VnaCAke3NwYXduLndhbGxUeXBlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gc2NyZWVucyBpbiBuZXcgbWV0YWxvY2F0aW9uOiAke2xvY31cXG4ke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93KCl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgW3ksIHhdID0gd2FsbDtcbiAgICAgICAgc3Bhd24ueXQgPSB5O1xuICAgICAgICBzcGF3bi54dCA9IHg7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc05wYygpIHx8IHNwYXduLmlzQm9zcygpIHx8IHNwYXduLmlzVHJpZ2dlcigpKSB7XG4gICAgICAgIC8vbGV0IGogPSAwO1xuICAgICAgICBsZXQgYmVzdCA9IFstMSwgLTEsIEluZmluaXR5XTtcbiAgICAgICAgZm9yIChjb25zdCBbeTAsIHgwLCB5MSwgeDEsIGRtYXhdIG9mIG1hcCkge1xuICAgICAgICAgIGNvbnN0IGQgPSAoc3Bhd24ueXQgLSB5MCkgKiogMiArIChzcGF3bi54dCAtIHgwKSAqKiAyO1xuICAgICAgICAgIGlmIChkIDw9IGRtYXggJiYgZCA8IGJlc3RbMl0pIHtcbiAgICAgICAgICAgIGJlc3QgPSBbc3Bhd24ueXQgKyB5MSAtIHkwLCBzcGF3bi54dCArIHgxIC0geDAsIGRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKGJlc3RbMl0pKSB7XG4gICAgICAgICAgLy8gS2VlcCB0cmFjayBvZiBhbnkgTlBDcyB3ZSBhbHJlYWR5IG1vdmVkIHNvIHRoYXQgYW55dGhpbmcgdGhhdCdzXG4gICAgICAgICAgLy8gb24gdG9wIG9mIGl0IChpLmUuIGR1YWwgc3Bhd25zKSBtb3ZlIGFsb25nIHdpdGguXG4gICAgICAgICAgLy9pZiAoYmVzdFsyXSA+IDQpIG1hcC5wdXNoKFtzcGF3bi54dCwgc3Bhd24ueXQsIGJlc3RbMF0sIGJlc3RbMV0sIDRdKTtcbiAgICAgICAgICAvLyAtIFRPRE8gLSBJIGRvbid0IHRoaW5rIHdlIG5lZWQgdGhpcywgc2luY2UgYW55IGZ1dHVyZSBzcGF3biBzaG91bGRcbiAgICAgICAgICAvLyAgIGJlIHBsYWNlZCBieSB0aGUgc2FtZSBydWxlcy5cbiAgICAgICAgICBbc3Bhd24ueXQsIHNwYXduLnh0XSA9IGJlc3Q7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIFdhc24ndCBhYmxlIHRvIG1hcCBhbiBhcmVuYSBvciBleGl0LiAgUGljayBhIG5ldyBQT0ksIGJ1dCB0cmlnZ2VycyBhbmRcbiAgICAgIC8vIGJvc3NlcyBhcmUgaW5lbGlnaWJsZS5cbiAgICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSB8fCBzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBwbGFjZSAke2xvY30gJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBzcGF3bi5pc0Jvc3MoKSA/ICdCb3NzJyA6ICdUcmlnZ2VyJ30gJHtzcGF3bi5oZXgoKVxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4ke3RoaXMuc2hvdygpfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV4dCA9IGFsbFBvaS5zaGlmdCgpO1xuICAgICAgaWYgKCFuZXh0KSB0aHJvdyBuZXcgRXJyb3IoYFJhbiBvdXQgb2YgUE9JIGZvciAke2xvY31gKTtcbiAgICAgIGNvbnN0IFt5LCB4XSA9IG5leHQ7XG4gICAgICBtYXAucHVzaChbc3Bhd24ueSA+Pj4gNCwgc3Bhd24ueCA+Pj4gNCwgeSA+Pj4gNCwgeCA+Pj4gNCwgNF0pO1xuICAgICAgc3Bhd24ueSA9IHk7XG4gICAgICBzcGF3bi54ID0geDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzZWFtbGVzcyBwYWlyIGxvY2F0aW9uLCBzeW5jIHVwIHRoZSBleGl0cy4gIEZvciBlYWNoIGV4aXQgb2ZcbiAgICogZWl0aGVyLCBjaGVjayBpZiBpdCdzIHN5bW1ldHJpYywgYW5kIGlmIHNvLCBjb3B5IGl0IG92ZXIgdG8gdGhlIG90aGVyIHNpZGUuXG4gICAqL1xuICByZWNvbmNpbGVFeGl0cyh0aGF0OiBNZXRhbG9jYXRpb24pIHtcbiAgICBjb25zdCBhZGQ6IFtNZXRhbG9jYXRpb24sIFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXVtdID0gW107XG4gICAgY29uc3QgZGVsOiBbTWV0YWxvY2F0aW9uLCBQb3MsIENvbm5lY3Rpb25UeXBlXVtdID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiBsb2MuX2V4aXRzKSB7XG4gICAgICAgIGlmIChkZXN0VHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF07XG4gICAgICAgIGNvbnN0IHJldmVyc2UgPSBkZXN0Lm1ldGEuX2V4aXRzLmdldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlKTtcbiAgICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgICBjb25zdCBbcmV2VGlsZSwgcmV2VHlwZV0gPSByZXZlcnNlO1xuICAgICAgICAgIGlmICgocmV2VGlsZSA+Pj4gOCkgPT09IGxvYy5pZCAmJiAocmV2VGlsZSAmIDB4ZmYpID09PSBwb3MgJiZcbiAgICAgICAgICAgICAgcmV2VHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgYWRkLnB1c2goW2xvYyA9PT0gdGhpcyA/IHRoYXQgOiB0aGlzLCBwb3MsIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkZWwucHVzaChbbG9jLCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGVdIG9mIGRlbCkge1xuICAgICAgbG9jLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGUsIGV4aXRdIG9mIGFkZCkge1xuICAgICAgbG9jLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gICAgLy8gdGhpcy5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICAgIC8vIHRoYXQuX2V4aXRzID0gbmV3IFRhYmxlKGV4aXRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTYXZlcyB0aGUgY3VycmVudCBzdGF0ZSBiYWNrIGludG8gdGhlIHVuZGVybHlpbmcgbG9jYXRpb24uXG4gICAqIEN1cnJlbnRseSB0aGlzIG9ubHkgZGVhbHMgd2l0aCBlbnRyYW5jZXMvZXhpdHMuXG4gICAqL1xuICB3cml0ZSgpIHtcbiAgICBjb25zdCBzcmNMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgbGV0IHNlYW1sZXNzUGFydG5lcjogTG9jYXRpb258dW5kZWZpbmVkO1xuICAgIGZvciAoY29uc3QgW3NyY1Bvcywgc3JjVHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBjb25zdCBzcmNTY3JlZW4gPSB0aGlzLl9zY3JlZW5zW3NyY1Bvc107XG4gICAgICBjb25zdCBkZXN0ID0gZGVzdFRpbGUgPj4gODtcbiAgICAgIGxldCBkZXN0UG9zID0gZGVzdFRpbGUgJiAweGZmO1xuICAgICAgY29uc3QgZGVzdExvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0XTtcbiAgICAgIGNvbnN0IGRlc3RNZXRhID0gZGVzdExvYy5tZXRhITtcbiAgICAgIGNvbnN0IGRlc3RTY3JlZW4gPSBkZXN0TWV0YS5fc2NyZWVuc1tkZXN0VGlsZSAmIDB4ZmZdO1xuICAgICAgY29uc3Qgc3JjRXhpdCA9IHNyY1NjcmVlbi5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSBzcmNUeXBlKTtcbiAgICAgIGNvbnN0IGRlc3RFeGl0ID0gZGVzdFNjcmVlbi5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSBkZXN0VHlwZSk7XG4gICAgICBpZiAoIXNyY0V4aXQgfHwgIWRlc3RFeGl0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyAke3NyY0V4aXQgPyAnZGVzdCcgOiAnc291cmNlJ30gZXhpdDpcbiAgRnJvbTogJHtzcmNMb2N9IEAgJHtoZXgoc3JjUG9zKX06JHtzcmNUeXBlfSAke3NyY1NjcmVlbi5uYW1lfVxuICBUbzogICAke2Rlc3RMb2N9IEAgJHtoZXgoZGVzdFBvcyl9OiR7ZGVzdFR5cGV9ICR7ZGVzdFNjcmVlbi5uYW1lfWApO1xuICAgICAgfVxuICAgICAgLy8gU2VlIGlmIHRoZSBkZXN0IGVudHJhbmNlIGV4aXN0cyB5ZXQuLi5cbiAgICAgIGxldCBlbnRyYW5jZSA9IDB4MjA7XG4gICAgICBpZiAoZGVzdEV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgIHNlYW1sZXNzUGFydG5lciA9IGRlc3RMb2M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgZGVzdENvb3JkID0gZGVzdEV4aXQuZW50cmFuY2U7XG4gICAgICAgIGlmIChkZXN0Q29vcmQgPiAweGVmZmYpIHsgLy8gaGFuZGxlIHNwZWNpYWwgY2FzZSBpbiBPYWtcbiAgICAgICAgICBkZXN0UG9zICs9IDB4MTA7XG4gICAgICAgICAgZGVzdENvb3JkIC09IDB4MTAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZW50cmFuY2UgPSBkZXN0TG9jLmZpbmRPckFkZEVudHJhbmNlKGRlc3RQb3MsIGRlc3RDb29yZCk7XG4gICAgICB9XG4gICAgICBmb3IgKGxldCB0aWxlIG9mIHNyY0V4aXQuZXhpdHMpIHtcbiAgICAgICAgLy9pZiAoc3JjRXhpdC50eXBlID09PSAnZWRnZTpib3R0b20nICYmIHRoaXMuaGVpZ2h0ID09PSAxKSB0aWxlIC09IDB4MjA7XG4gICAgICAgIHNyY0xvYy5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbjogc3JjUG9zLCB0aWxlLCBkZXN0LCBlbnRyYW5jZX0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3JjTG9jLndpZHRoID0gdGhpcy5fd2lkdGg7XG4gICAgc3JjTG9jLmhlaWdodCA9IHRoaXMuX2hlaWdodDtcbiAgICBzcmNMb2Muc2NyZWVucyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5faGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdzogbnVtYmVyW10gPSBbXTtcbiAgICAgIHNyY0xvYy5zY3JlZW5zLnB1c2gocm93KTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fd2lkdGg7IHgrKykge1xuICAgICAgICByb3cucHVzaCh0aGlzLl9zY3JlZW5zW3kgPDwgNCB8IHhdLnNpZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHNyY0xvYy50aWxlc2V0ID0gdGhpcy50aWxlc2V0LnRpbGVzZXRJZDtcbiAgICBzcmNMb2MudGlsZUVmZmVjdHMgPSB0aGlzLnRpbGVzZXQuZWZmZWN0cygpLmlkO1xuXG4gICAgLy8gd3JpdGUgZmxhZ3NcbiAgICBzcmNMb2MuZmxhZ3MgPSBbXTtcbiAgICBjb25zdCBmcmVlRmxhZ3MgPSBbLi4udGhpcy5mcmVlRmxhZ3NdO1xuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbc2NyZWVuXTtcbiAgICAgIGxldCBmbGFnOiBudW1iZXJ8dW5kZWZpbmVkO1xuICAgICAgaWYgKHNjci5kYXRhLndhbGwgIT0gbnVsbCAmJiAhc2VhbWxlc3NQYXJ0bmVyKSB7XG4gICAgICAgIGZsYWcgPSBmcmVlRmxhZ3MucG9wKCk/LmlkID8/IHRoaXMucm9tLmZsYWdzLmFsbG9jKDB4MjAwKTtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdhbHdheXMnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2NhbG0nKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5DYWxtZWRBbmdyeVNlYS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206ZmFsc2UnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206dHJ1ZScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMuY3VzdG9tRmxhZ3MuZ2V0KHNjcmVlbik/LmlkID8/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQ7XG4gICAgICB9XG4gICAgICBpZiAoZmxhZyAhPSBudWxsKSB7XG4gICAgICAgIHNyY0xvYy5mbGFncy5wdXNoKExvY2F0aW9uRmxhZy5vZih7c2NyZWVuLCBmbGFnfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdyaXRlIHBpdHNcbiAgICBzcmNMb2MucGl0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2Zyb21TY3JlZW4sIHRvXSBvZiB0aGlzLl9waXRzKSB7XG4gICAgICBjb25zdCB0b1NjcmVlbiA9IHRvICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3QgPSB0byA+Pj4gODtcbiAgICAgIHNyY0xvYy5waXRzLnB1c2goUGl0Lm9mKHtmcm9tU2NyZWVuLCB0b1NjcmVlbiwgZGVzdH0pKTtcbiAgICB9XG4gIH1cblxuICAvLyBOT1RFOiB0aGlzIGNhbiBvbmx5IGJlIGRvbmUgQUZURVIgY29weWluZyB0byB0aGUgbG9jYXRpb24hXG4gIHJlcGxhY2VNb25zdGVycyhyYW5kb206IFJhbmRvbSkge1xuICAgIGlmICh0aGlzLmlkID09PSAweDY4KSByZXR1cm47IC8vIHdhdGVyIGxldmVscywgZG9uJ3QgcGxhY2Ugb24gbGFuZD8/P1xuICAgIC8vIE1vdmUgYWxsIHRoZSBtb25zdGVycyB0byByZWFzb25hYmxlIGxvY2F0aW9ucy5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgY29uc3QgcGxhY2VyID0gbG9jLm1vbnN0ZXJQbGFjZXIocmFuZG9tKTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghc3Bhd24udXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXNwYXduLmlzTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG1vbnN0ZXIgPSBsb2Mucm9tLm9iamVjdHNbc3Bhd24ubW9uc3RlcklkXTtcbiAgICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkgY29udGludWU7XG4gICAgICBpZiAobW9uc3Rlci5pc1VudG91Y2hlZE1vbnN0ZXIoKSkgY29udGludWU7XG4gICAgICBjb25zdCBwb3MgPSBwbGFjZXIobW9uc3Rlcik7XG4gICAgICBpZiAocG9zID09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgbm8gdmFsaWQgbG9jYXRpb24gZm9yICR7aGV4KG1vbnN0ZXIuaWQpfSBpbiAke2xvY31gKTtcbiAgICAgICAgc3Bhd24udXNlZCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zID4+PiA4O1xuICAgICAgICBzcGF3bi50aWxlID0gcG9zICYgMHhmZjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRyYXZlcnNlT3B0cyB7XG4gIC8vIERvIG5vdCBwYXNzIGNlcnRhaW4gdGlsZXMgaW4gdHJhdmVyc2VcbiAgcmVhZG9ubHkgd2l0aD86IFJlYWRvbmx5TWFwPFBvcywgTWV0YXNjcmVlbj47XG4gIC8vIFdoZXRoZXIgdG8gYnJlYWsgd2FsbHMvZm9ybSBicmlkZ2VzXG4gIHJlYWRvbmx5IG5vRmxhZ2dlZD86IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdG8gYXNzdW1lIGZsaWdodFxuICByZWFkb25seSBmbGlnaHQ/OiBib29sZWFuO1xufVxuXG5cbmNvbnN0IHVua25vd25FeGl0V2hpdGVsaXN0ID0gbmV3IFNldChbXG4gIDB4MDEwMDNhLCAvLyB0b3AgcGFydCBvZiBjYXZlIG91dHNpZGUgc3RhcnRcbiAgMHgwMTAwM2IsXG4gIDB4MTU0MGEwLCAvLyBcIiBcIiBzZWFtbGVzcyBlcXVpdmFsZW50IFwiIFwiXG4gIDB4MWEzMDYwLCAvLyBzd2FtcCBleGl0XG4gIDB4NDAyMDAwLCAvLyBicmlkZ2UgdG8gZmlzaGVybWFuIGlzbGFuZFxuICAweDQwMjAzMCxcbiAgMHg0MTgwZDAsIC8vIGJlbG93IGV4aXQgdG8gbGltZSB0cmVlIHZhbGxleVxuICAweDYwODdiZiwgLy8gYmVsb3cgYm9hdCBjaGFubmVsXG4gIDB4YTEwMzI2LCAvLyBjcnlwdCAyIGFyZW5hIG5vcnRoIGVkZ2VcbiAgMHhhMTAzMjksXG4gIDB4YTkwNjI2LCAvLyBzdGFpcnMgYWJvdmUga2VsYnkgMlxuICAweGE5MDYyOSxcbl0pO1xuXG4vL2NvbnN0IERQT1MgPSBbLTE2LCAtMSwgMTYsIDFdO1xuY29uc3QgRElSX05BTUUgPSBbJ2Fib3ZlJywgJ2xlZnQgb2YnLCAnYmVsb3cnLCAncmlnaHQgb2YnXTtcblxudHlwZSBPcHRpb25hbDxUPiA9IFR8bnVsbHx1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGRpc3RhbmNlKGE6IFBvcywgYjogUG9zKTogbnVtYmVyIHtcbiAgcmV0dXJuICgoYSA+Pj4gNCkgLSAoYiA+Pj4gNCkpICoqIDIgKyAoKGEgJiAweGYpIC0gKGIgJiAweGYpKSAqKiAyO1xufVxuXG5mdW5jdGlvbiBhZGREZWx0YShzdGFydDogUG9zLCBwbHVzOiBQb3MsIG1pbnVzOiBQb3MsIG1ldGE6IE1ldGFsb2NhdGlvbik6IFBvcyB7XG4gIGNvbnN0IHB4ID0gcGx1cyAmIDB4ZjtcbiAgY29uc3QgcHkgPSBwbHVzID4+PiA0O1xuICBjb25zdCBteCA9IG1pbnVzICYgMHhmO1xuICBjb25zdCBteSA9IG1pbnVzID4+PiA0O1xuICBjb25zdCBzeCA9IHN0YXJ0ICYgMHhmO1xuICBjb25zdCBzeSA9IHN0YXJ0ID4+PiA0O1xuICBjb25zdCBveCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1ldGEud2lkdGggLSAxLCBzeCArIHB4IC0gbXgpKTtcbiAgY29uc3Qgb3kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtZXRhLmhlaWdodCAtIDEsIHN5ICsgcHkgLSBteSkpO1xuICByZXR1cm4gb3kgPDwgNCB8IG94O1xufVxuXG4vLyBiaXQgMSA9IGNydW1ibGluZywgYml0IDAgPSBob3Jpem9udGFsOiBbdiwgaCwgY3YsIGNoXVxuY29uc3QgUExBVEZPUk1TOiByZWFkb25seSBudW1iZXJbXSA9IFsweDdlLCAweDdmLCAweDlmLCAweDhkXTtcbiJdfQ==