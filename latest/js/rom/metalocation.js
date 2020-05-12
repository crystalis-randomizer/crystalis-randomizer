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
            if (entrance.used)
                reachableScreens.add(entrance.screen);
        }
        for (const exit of location.exits) {
            reachableScreens.add(exit.screen);
            if (exit.isSeamless()) {
                const y = exit.tile >>> 4;
                if (y === 0 || y === 0xe) {
                    reachable.set(exit.screen << 8 | 0x88, 1);
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
        for (const exit of location.exits) {
            if (exit.dest === 0xff)
                continue;
            let srcPos = exit.screen;
            if (exit.isSeamless() && !(exit.yt & 0x0f))
                srcPos--;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBSXRFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFaEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBc0NqQixNQUFNLE9BQU8sWUFBWTtJQWlDdkIsWUFBcUIsRUFBVSxFQUFXLE9BQW9CLEVBQ2xELE1BQWMsRUFBRSxLQUFhO1FBRHBCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBM0I5RCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFDbkMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFRLENBQUM7UUFPcEIsU0FBSSxHQUFvQixTQUFTLENBQUM7UUFFbEMsV0FBTSxHQUFHLElBQUksS0FBSyxFQUFpQyxDQUFDO1FBQ3BELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBa0JyQyxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLElB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Q0FBQyxDQUFDO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUM7SUFDdkIsTUFBTSxFQUFFLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQztJQUN2QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLENBQUM7QUFHRCxNQUFNLFNBQVMsR0FBc0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvY2F0aW9uIH0gZnJvbSAnLi9sb2NhdGlvbi5qcyc7IC8vIGltcG9ydCB0eXBlXG5pbXBvcnQgeyBFeGl0LCBGbGFnIGFzIExvY2F0aW9uRmxhZywgUGl0IH0gZnJvbSAnLi9sb2NhdGlvbnRhYmxlcy5qcyc7XG5pbXBvcnQgeyBGbGFnIH0gZnJvbSAnLi9mbGFncy5qcyc7XG5pbXBvcnQgeyBNZXRhc2NyZWVuLCBVaWQgfSBmcm9tICcuL21ldGFzY3JlZW4uanMnO1xuaW1wb3J0IHsgTWV0YXRpbGVzZXQgfSBmcm9tICcuL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7IGhleCB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQgeyBSb20gfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHsgRGVmYXVsdE1hcCwgVGFibGUsIGl0ZXJzLCBmb3JtYXQgfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7IFVuaW9uRmluZCB9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQgeyBDb25uZWN0aW9uVHlwZSB9IGZyb20gJy4vbWV0YXNjcmVlbmRhdGEuanMnO1xuaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7IE1vbnN0ZXIgfSBmcm9tICcuL21vbnN0ZXIuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG4vLyBNb2RlbCBvZiBhIGxvY2F0aW9uIHdpdGggbWV0YXNjcmVlbnMsIGV0Yy5cblxuLy8gVHJpY2s6IHdlIG5lZWQgc29tZXRoaW5nIHRvIG93biB0aGUgbmVpZ2hib3IgY2FjaGUuXG4vLyAgLSBwcm9iYWJseSB0aGlzIGJlbG9uZ3MgaW4gdGhlIE1ldGF0aWxlc2V0LlxuLy8gIC0gbWV0aG9kIHRvIHJlZ2VuZXJhdGUsIGRvIGl0IGFmdGVyIHRoZSBzY3JlZW4gbW9kcz9cbi8vIERhdGEgd2Ugd2FudCB0byBrZWVwIHRyYWNrIG9mOlxuLy8gIC0gZ2l2ZW4gdHdvIHNjcmVlbnMgYW5kIGEgZGlyZWN0aW9uLCBjYW4gdGhleSBhYnV0P1xuLy8gIC0gZ2l2ZW4gYSBzY3JlZW4gYW5kIGEgZGlyZWN0aW9uLCB3aGF0IHNjcmVlbnMgb3Blbi9jbG9zZSB0aGF0IGVkZ2U/XG4vLyAgICAtIHdoaWNoIG9uZSBpcyB0aGUgXCJkZWZhdWx0XCI/XG5cbi8vIFRPRE8gLSBjb25zaWRlciBhYnN0cmFjdGluZyBleGl0cyBoZXJlP1xuLy8gIC0gZXhpdHM6IEFycmF5PFtFeGl0U3BlYywgbnVtYmVyLCBFeGl0U3BlY10+XG4vLyAgLSBFeGl0U3BlYyA9IHt0eXBlPzogQ29ubmVjdGlvblR5cGUsIHNjcj86IG51bWJlcn1cbi8vIEhvdyB0byBoYW5kbGUgY29ubmVjdGluZyB0aGVtIGNvcnJlY3RseT9cbi8vICAtIHNpbXBseSBzYXlpbmcgXCItPiB3YXRlcmZhbGwgdmFsbGV5IGNhdmVcIiBpcyBub3QgaGVscGZ1bCBzaW5jZSB0aGVyZSdzIDJcbi8vICAgIG9yIFwiLT4gd2luZCB2YWxsZXkgY2F2ZVwiIHdoZW4gdGhlcmUncyA1LlxuLy8gIC0gdXNlIHNjcklkIGFzIHVuaXF1ZSBpZGVudGlmaWVyPyAgb25seSBwcm9ibGVtIGlzIHNlYWxlZCBjYXZlIGhhcyAzLi4uXG4vLyAgLSBtb3ZlIHRvIGRpZmZlcmVudCBzY3JlZW4gYXMgbmVjZXNzYXJ5Li4uXG4vLyAgICAoY291bGQgYWxzbyBqdXN0IGRpdGNoIHRoZSBvdGhlciB0d28gYW5kIHRyZWF0IHdpbmRtaWxsIGVudHJhbmNlIGFzXG4vLyAgICAgYSBkb3duIGVudHJhbmNlIC0gc2FtZSB3LyBsaWdodGhvdXNlPylcbi8vICAtIG9ubHkgYSBzbWFsbCBoYW5kZnVsbCBvZiBsb2NhdGlvbnMgaGF2ZSBkaXNjb25uZWN0ZWQgY29tcG9uZW50czpcbi8vICAgICAgd2luZG1pbGwsIGxpZ2h0aG91c2UsIHB5cmFtaWQsIGdvYSBiYWNrZG9vciwgc2FiZXJhLCBzYWJyZS9oeWRyYSBsZWRnZXNcbi8vICAtIHdlIHJlYWxseSBkbyBjYXJlIHdoaWNoIGlzIGluIHdoaWNoIGNvbXBvbmVudC5cbi8vICAgIGJ1dCBtYXAgZWRpdHMgbWF5IGNoYW5nZSBldmVuIHRoZSBudW1iZXIgb2YgY29tcG9uZW50cz8/P1xuLy8gIC0gZG8gd2UgZG8gZW50cmFuY2Ugc2h1ZmZsZSBmaXJzdCBvciBtYXAgc2h1ZmZsZSBmaXJzdD9cbi8vICAgIG9yIGFyZSB0aGV5IGludGVybGVhdmVkPyE/XG4vLyAgICBpZiB3ZSBzaHVmZmxlIHNhYnJlIG92ZXJ3b3JsZCB0aGVuIHdlIG5lZWQgdG8ga25vdyB3aGljaCBjYXZlcyBjb25uZWN0XG4vLyAgICB0byB3aGljaC4uLiBhbmQgcG9zc2libHkgY2hhbmdlIHRoZSBjb25uZWN0aW9ucz9cbi8vICAgIC0gbWF5IG5lZWQgbGVld2F5IHRvIGFkZC9zdWJ0cmFjdCBjYXZlIGV4aXRzPz9cbi8vIFByb2JsZW0gaXMgdGhhdCBlYWNoIGV4aXQgaXMgY28tb3duZWQgYnkgdHdvIG1ldGFsb2NhdGlvbnMuXG5cblxuZXhwb3J0IHR5cGUgUG9zID0gbnVtYmVyO1xuZXhwb3J0IHR5cGUgTG9jUG9zID0gbnVtYmVyOyAvLyBsb2NhdGlvbiA8PCA4IHwgcG9zXG5leHBvcnQgdHlwZSBFeGl0U3BlYyA9IHJlYWRvbmx5IFtMb2NQb3MsIENvbm5lY3Rpb25UeXBlXTtcblxuZXhwb3J0IGNsYXNzIE1ldGFsb2NhdGlvbiB7XG5cbiAgLy8gVE9ETyAtIHN0b3JlIG1ldGFkYXRhIGFib3V0IHdpbmRtaWxsIGZsYWc/ICB0d28gbWV0YWxvY3Mgd2lsbCBuZWVkIGEgcG9zIHRvXG4gIC8vIGluZGljYXRlIHdoZXJlIHRoYXQgZmxhZyBzaG91bGQgZ28uLi4/ICBPciBzdG9yZSBpdCBpbiB0aGUgbWV0YXNjcmVlbj9cblxuICAvLyBDYXZlcyBhcmUgYXNzdW1lZCB0byBiZSBhbHdheXMgb3BlbiB1bmxlc3MgdGhlcmUncyBhIGZsYWcgc2V0IGhlcmUuLi5cbiAgY3VzdG9tRmxhZ3MgPSBuZXcgTWFwPFBvcywgRmxhZz4oKTtcbiAgZnJlZUZsYWdzID0gbmV3IFNldDxGbGFnPigpO1xuXG4gIHJlYWRvbmx5IHJvbTogUm9tO1xuXG4gIHByaXZhdGUgX2hlaWdodDogbnVtYmVyO1xuICBwcml2YXRlIF93aWR0aDogbnVtYmVyO1xuXG4gIHByaXZhdGUgX3BvczogUG9zW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIHByaXZhdGUgX2V4aXRzID0gbmV3IFRhYmxlPFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjPigpO1xuICBwcml2YXRlIF9waXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTsgLy8gTWFwcyB0byBsb2MgPDwgOCB8IHBvc1xuXG4gIC8vcHJpdmF0ZSBfbW9uc3RlcnNJbnZhbGlkYXRlZCA9IGZhbHNlO1xuXG4gIC8qKiBLZXk6ICh5PDw0KXx4ICovXG4gIHByaXZhdGUgX3NjcmVlbnM6IE1ldGFzY3JlZW5bXTtcblxuICAvLyBOT1RFOiBrZWVwaW5nIHRyYWNrIG9mIHJlYWNoYWJpbGl0eSBpcyBpbXBvcnRhbnQgYmVjYXVzZSB3aGVuIHdlXG4gIC8vIGRvIHRoZSBzdXJ2ZXkgd2UgbmVlZCB0byBvbmx5IGNvdW50IFJFQUNIQUJMRSB0aWxlcyEgIFNlYW1sZXNzXG4gIC8vIHBhaXJzIGFuZCBicmlkZ2VzIGNhbiBjYXVzZSBsb3RzIG9mIGltcG9ydGFudC10by1yZXRhaW4gdW5yZWFjaGFibGVcbiAgLy8gdGlsZXMuICBNb3Jlb3Zlciwgc29tZSBkZWFkLWVuZCB0aWxlcyBjYW4ndCBhY3R1YWxseSBiZSB3YWxrZWQgb24uXG4gIC8vIEZvciBub3cgd2UnbGwganVzdCB6ZXJvIG91dCBmZWF0dXJlIG1ldGFzY3JlZW5zIHRoYXQgYXJlbid0XG4gIC8vIHJlYWNoYWJsZSwgc2luY2UgdHJ5aW5nIHRvIGRvIGl0IGNvcnJlY3RseSByZXF1aXJlcyBzdG9yaW5nXG4gIC8vIHJlYWNoYWJpbGl0eSBhdCB0aGUgdGlsZSBsZXZlbCAoYWdhaW4gZHVlIHRvIGJyaWRnZSBkb3VibGUgc3RhaXJzKS5cbiAgLy8gcHJpdmF0ZSBfcmVhY2hhYmxlOiBVaW50OEFycmF5fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBpZDogbnVtYmVyLCByZWFkb25seSB0aWxlc2V0OiBNZXRhdGlsZXNldCxcbiAgICAgICAgICAgICAgaGVpZ2h0OiBudW1iZXIsIHdpZHRoOiBudW1iZXIpIHtcbiAgICB0aGlzLnJvbSA9IHRpbGVzZXQucm9tO1xuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX3NjcmVlbnMgPSBuZXcgQXJyYXkoaGVpZ2h0IDw8IDQpLmZpbGwodGlsZXNldC5lbXB0eSk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugb3V0IGEgbWV0YWxvY2F0aW9uIGZyb20gdGhlIGdpdmVuIGxvY2F0aW9uLiAgSW5mZXIgdGhlXG4gICAqIHRpbGVzZXQgaWYgcG9zc2libGUsIG90aGVyd2lzZSBpdCBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxuICAgKi9cbiAgc3RhdGljIG9mKGxvY2F0aW9uOiBMb2NhdGlvbiwgdGlsZXNldD86IE1ldGF0aWxlc2V0KTogTWV0YWxvY2F0aW9uIHtcbiAgICBjb25zdCB7cm9tLCB3aWR0aCwgaGVpZ2h0fSA9IGxvY2F0aW9uO1xuICAgIGlmICghdGlsZXNldCkge1xuICAgICAgLy8gSW5mZXIgdGhlIHRpbGVzZXQuICBTdGFydCBieSBhZGRpbmcgYWxsIGNvbXBhdGlibGUgbWV0YXRpbGVzZXRzLlxuICAgICAgY29uc3Qge2ZvcnRyZXNzLCBsYWJ5cmludGh9ID0gcm9tLm1ldGF0aWxlc2V0cztcbiAgICAgIGNvbnN0IHRpbGVzZXRzID0gbmV3IFNldDxNZXRhdGlsZXNldD4oKTtcbiAgICAgIGZvciAoY29uc3QgdHMgb2Ygcm9tLm1ldGF0aWxlc2V0cykge1xuICAgICAgICBpZiAobG9jYXRpb24udGlsZXNldCA9PT0gdHMudGlsZXNldC5pZCkgdGlsZXNldHMuYWRkKHRzKTtcbiAgICAgIH1cbiAgICAgIC8vIEl0J3MgaW1wb3NzaWJsZSB0byBkaXN0aW5ndWlzaCBmb3J0cmVzcyBhbmQgbGFieXJpbnRoLCBzbyB3ZSBoYXJkY29kZVxuICAgICAgLy8gaXQgYmFzZWQgb24gbG9jYXRpb246IG9ubHkgJGE5IGlzIGxhYnlyaW50aC5cbiAgICAgIHRpbGVzZXRzLmRlbGV0ZShsb2NhdGlvbi5pZCA9PT0gMHhhOSA/IGZvcnRyZXNzIDogbGFieXJpbnRoKTtcbiAgICAgIC8vIEZpbHRlciBvdXQgYW55IHRpbGVzZXRzIHRoYXQgZG9uJ3QgaW5jbHVkZSBuZWNlc3Nhcnkgc2NyZWVuIGlkcy5cbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIG5ldyBTZXQoaXRlcnMuY29uY2F0KC4uLmxvY2F0aW9uLnNjcmVlbnMpKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHRpbGVzZXQgb2YgdGlsZXNldHMpIHtcbiAgICAgICAgICBpZiAoIXRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMoc2NyZWVuKS5sZW5ndGgpIHRpbGVzZXRzLmRlbGV0ZSh0aWxlc2V0KTtcbiAgICAgICAgICBpZiAoIXRpbGVzZXRzLnNpemUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdGlsZXNldCBmb3IgJHtoZXgoc2NyZWVuKX0gaW4gJHtsb2NhdGlvbn1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0aWxlc2V0cy5zaXplICE9PSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSB0aWxlc2V0IGZvciAke2xvY2F0aW9ufTogWyR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgQXJyYXkuZnJvbSh0aWxlc2V0cywgdCA9PiB0Lm5hbWUpLmpvaW4oJywgJyl9XWApO1xuICAgICAgfVxuICAgICAgdGlsZXNldCA9IFsuLi50aWxlc2V0c11bMF07XG4gICAgfVxuXG4gICAgLy8gVHJhdmVyc2UgdGhlIGxvY2F0aW9uIGZvciBhbGwgdGlsZXMgcmVhY2hhYmxlIGZyb20gYW4gZW50cmFuY2UuXG4gICAgLy8gVGhpcyBpcyB1c2VkIHRvIGluZm9ybSB3aGljaCBtZXRhc2NyZWVuIHRvIHNlbGVjdCBmb3Igc29tZSBvZiB0aGVcbiAgICAvLyByZWR1bmRhbnQgb25lcyAoaS5lLiBkb3VibGUgZGVhZCBlbmRzKS4gIFRoaXMgaXMgYSBzaW1wbGUgdHJhdmVyc2FsXG4gICAgY29uc3QgcmVhY2hhYmxlID0gbG9jYXRpb24ucmVhY2hhYmxlVGlsZXModHJ1ZSk7IC8vIHRyYXZlcnNlUmVhY2hhYmxlKDB4MDQpO1xuICAgIGNvbnN0IHJlYWNoYWJsZVNjcmVlbnMgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgcmVhY2hhYmxlLmtleXMoKSkge1xuICAgICAgcmVhY2hhYmxlU2NyZWVucy5hZGQodGlsZSA+Pj4gOCk7XG4gICAgICAvL3JlYWNoYWJsZVNjcmVlbnMuYWRkKCh0aWxlICYgMHhmMDAwKSA+Pj4gOCB8ICh0aWxlICYgMHhmMCkgPj4+IDQpO1xuICAgIH1cbiAgICAvLyBOT1RFOiBzb21lIGVudHJhbmNlcyBhcmUgb24gaW1wYXNzYWJsZSB0aWxlcyBidXQgd2Ugc3RpbGwgY2FyZSBhYm91dFxuICAgIC8vIHRoZSBzY3JlZW5zIHVuZGVyIHRoZW0gKGUuZy4gYm9hdCBhbmQgc2hvcCBlbnRyYW5jZXMpLiAgQWxzbyBtYWtlIHN1cmVcbiAgICAvLyB0byBoYW5kbGUgdGhlIHNlYW1sZXNzIHRvd2VyIGV4aXRzLlxuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgbG9jYXRpb24uZW50cmFuY2VzKSB7XG4gICAgICBpZiAoZW50cmFuY2UudXNlZCkgcmVhY2hhYmxlU2NyZWVucy5hZGQoZW50cmFuY2Uuc2NyZWVuKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICByZWFjaGFibGVTY3JlZW5zLmFkZChleGl0LnNjcmVlbik7XG4gICAgICBpZiAoZXhpdC5pc1NlYW1sZXNzKCkpIHtcbiAgICAgICAgLy8gSGFuZGxlIHNlYW1sZXNzIGV4aXRzIG9uIHNjcmVlbiBlZGdlczogbWFyayBfanVzdF8gdGhlIG5laWdoYm9yXG4gICAgICAgIC8vIHNjcmVlbiBhcyByZWFjaGFibGUgKGluY2x1ZGluZyBkZWFkIGNlbnRlciB0aWxlIGZvciBtYXRjaCkuXG4gICAgICAgIGNvbnN0IHkgPSBleGl0LnRpbGUgPj4+IDQ7XG4gICAgICAgIGlmICh5ID09PSAwIHx8IHkgPT09IDB4ZSkge1xuICAgICAgICAgIHJlYWNoYWJsZS5zZXQoZXhpdC5zY3JlZW4gPDwgOCB8IDB4ODgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vY29uc3QgZXhpdCA9IHRpbGVzZXQuZXhpdDtcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IEFycmF5PE1ldGFzY3JlZW4+KGhlaWdodCA8PCA0KS5maWxsKHRpbGVzZXQuZW1wdHkpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCB0MCA9IHkgPDwgNCB8IHg7XG4gICAgICAgIGNvbnN0IG1ldGFzY3JlZW5zID0gdGlsZXNldC5nZXRNZXRhc2NyZWVucyhsb2NhdGlvbi5zY3JlZW5zW3ldW3hdKTtcbiAgICAgICAgbGV0IG1ldGFzY3JlZW46IE1ldGFzY3JlZW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAobWV0YXNjcmVlbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgbWV0YXNjcmVlbiA9IG1ldGFzY3JlZW5zWzBdO1xuICAgICAgICB9IGVsc2UgaWYgKCFtZXRhc2NyZWVucy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUT09EIC0gZmlsdGVyIGJhc2VkIG9uIHdobyBoYXMgYSBtYXRjaCBmdW5jdGlvbiwgb3IgbWF0Y2hpbmcgZmxhZ3NcbiAgICAgICAgICBjb25zdCBmbGFnID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSAoKHkgPDwgNCkgfCB4KSk7XG4gICAgICAgICAgY29uc3QgbWF0Y2hlcnM6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgICAgICAgIGNvbnN0IGJlc3Q6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtZXRhc2NyZWVucykge1xuICAgICAgICAgICAgaWYgKHMuZGF0YS5tYXRjaCkge1xuICAgICAgICAgICAgICBtYXRjaGVycy5wdXNoKHMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzLmZsYWcgPT09ICdhbHdheXMnICYmIGZsYWc/LmZsYWcgPT09IDB4MmZlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICFzLmZsYWcgJiYgIXMuZGF0YS53YWxsICYmICFmbGFnKSB7XG4gICAgICAgICAgICAgIGJlc3QudW5zaGlmdChzKTsgLy8gZnJvbnQtbG9hZCBtYXRjaGluZyBmbGFnc1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYmVzdC5wdXNoKHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobWF0Y2hlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiByZWFjaChkeTogbnVtYmVyLCBkeDogbnVtYmVyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHgwID0gKHggPDwgOCkgKyBkeDtcbiAgICAgICAgICAgICAgY29uc3QgeTAgPSAoeSA8PCA4KSArIGR5O1xuICAgICAgICAgICAgICBjb25zdCB0ID1cbiAgICAgICAgICAgICAgICAgICh5MCA8PCA0KSAmIDB4ZjAwMCB8IHgwICYgMHhmMDAgfCB5MCAmIDB4ZjAgfCAoeDAgPj4gNCkgJiAweGY7XG4gICAgICAgICAgICAgIHJldHVybiByZWFjaGFibGUuaGFzKHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBtYXRjaGVyIG9mIG1hdGNoZXJzKSB7XG4gICAgICAgICAgICAgIGlmICghbWF0Y2hlci5kYXRhLm1hdGNoIShyZWFjaCwgZmxhZyAhPSBudWxsKSkgY29udGludWU7XG4gICAgICAgICAgICAgIG1ldGFzY3JlZW4gPSBtYXRjaGVyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFtZXRhc2NyZWVuKSBtZXRhc2NyZWVuID0gYmVzdFswXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1ldGFzY3JlZW4pIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZScpO1xuICAgICAgICAvLyBpZiAoKG1ldGFzY3JlZW4uZGF0YS5leGl0cyB8fCBtZXRhc2NyZWVuLmRhdGEud2FsbCkgJiZcbiAgICAgICAgLy8gICAgICFyZWFjaGFibGVTY3JlZW5zLmhhcyh0MCkgJiZcbiAgICAgICAgLy8gICAgIHRpbGVzZXQgIT09IHJvbS5tZXRhdGlsZXNldHMudG93ZXIpIHtcbiAgICAgICAgLy8gICAvLyBNYWtlIHN1cmUgd2UgZG9uJ3Qgc3VydmV5IHVucmVhY2hhYmxlIHNjcmVlbnMgKGFuZCBpdCdzIGhhcmQgdG9cbiAgICAgICAgLy8gICAvLyB0byBmaWd1cmUgb3V0IHdoaWNoIGlzIHdoaWNoIGxhdGVyKS4gIE1ha2Ugc3VyZSBub3QgdG8gZG8gdGhpcyBmb3JcbiAgICAgICAgLy8gICAvLyB0b3dlciBiZWNhdXNlIG90aGVyd2lzZSBpdCdsbCBjbG9iYmVyIGltcG9ydGFudCBwYXJ0cyBvZiB0aGUgbWFwLlxuICAgICAgICAvLyAgIG1ldGFzY3JlZW4gPSB0aWxlc2V0LmVtcHR5O1xuICAgICAgICAvLyB9XG4gICAgICAgIHNjcmVlbnNbdDBdID0gbWV0YXNjcmVlbjtcbiAgICAgICAgLy8gLy8gSWYgd2UncmUgb24gdGhlIGJvcmRlciBhbmQgaXQncyBhbiBlZGdlIGV4aXQgdGhlbiBjaGFuZ2UgdGhlIGJvcmRlclxuICAgICAgICAvLyAvLyBzY3JlZW4gdG8gcmVmbGVjdCBhbiBleGl0LlxuICAgICAgICAvLyBjb25zdCBlZGdlcyA9IG1ldGFzY3JlZW4uZWRnZUV4aXRzKCk7XG4gICAgICAgIC8vIGlmICh5ID09PSAwICYmIChlZGdlcyAmIDEpKSBzY3JlZW5zW3QwIC0gMTZdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHggPT09IDAgJiYgKGVkZ2VzICYgMikpIHNjcmVlbnNbdDAgLSAxXSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh5ID09PSBoZWlnaHQgJiYgKGVkZ2VzICYgNCkpIHNjcmVlbnNbdDAgKyAxNl0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeCA9PT0gd2lkdGggJiYgKGVkZ2VzICYgOCkpIHNjcmVlbnNbdDAgKyAxXSA9IGV4aXQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmlndXJlIG91dCBleGl0c1xuICAgIGNvbnN0IGV4aXRzID0gbmV3IFRhYmxlPFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjPigpO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgaWYgKGV4aXQuZGVzdCA9PT0gMHhmZikgY29udGludWU7XG4gICAgICBsZXQgc3JjUG9zID0gZXhpdC5zY3JlZW47XG4gICAgICAvLyBLZW5zdSBhcmVuYSBleGl0IGlzIGRlY2xhcmVkIGF0IHk9ZlxuICAgICAgaWYgKGV4aXQuaXNTZWFtbGVzcygpICYmICEoZXhpdC55dCAmIDB4MGYpKSBzcmNQb3MtLTtcbiAgICAgIGlmICghcmVhY2hhYmxlU2NyZWVucy5oYXMoc3JjUG9zKSkgY29udGludWU7XG4gICAgICBjb25zdCBzcmNTY3JlZW4gPSBzY3JlZW5zW3NyY1Bvc107XG4gICAgICBjb25zdCBzcmNFeGl0ID0gc3JjU2NyZWVuLmZpbmRFeGl0VHlwZShleGl0LnRpbGUsIGhlaWdodCA9PT0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICEhKGV4aXQuZW50cmFuY2UgJiAweDIwKSk7XG4gICAgICBjb25zdCBzcmNUeXBlID0gc3JjRXhpdD8udHlwZTtcbiAgICAgIGlmICghc3JjVHlwZSkge1xuICAgICAgICBjb25zdCBpZCA9IGxvY2F0aW9uLmlkIDw8IDE2IHwgc3JjUG9zIDw8IDggfCBleGl0LnRpbGU7XG4gICAgICAgIGlmICh1bmtub3duRXhpdFdoaXRlbGlzdC5oYXMoaWQpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgYWxsID0gc3JjU2NyZWVuLmRhdGEuZXhpdHM/Lm1hcChcbiAgICAgICAgICAgIGUgPT4gZS50eXBlICsgJzogJyArIGUuZXhpdHMubWFwKGhleCkuam9pbignLCAnKSkuam9pbignXFxuICAnKTtcbiAgICAgICAgY29uc29sZS53YXJuKGBVbmtub3duIGV4aXQgJHtoZXgoZXhpdC50aWxlKX06ICR7c3JjU2NyZWVuLm5hbWV9IGluICR7XG4gICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb259IEAgJHtoZXgoc3JjUG9zKX06XFxuICAke2FsbH1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoZXhpdHMuaGFzKHNyY1Bvcywgc3JjVHlwZSkpIGNvbnRpbnVlOyAvLyBhbHJlYWR5IGhhbmRsZWRcbiAgICAgIGNvbnN0IGRlc3QgPSByb20ubG9jYXRpb25zW2V4aXQuZGVzdF07XG4gICAgICBpZiAoc3JjVHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgIGNvbnN0IGRvd24gPSBzcmNUeXBlID09PSAnc2VhbWxlc3M6ZG93bic7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgc2VlbXMgd3JvbmcgLSB0aGUgZG93biBleGl0IGlzIEJFTE9XIHRoZSB1cCBleGl0Li4uP1xuICAgICAgICBjb25zdCB0aWxlID0gc3JjRXhpdCEuZXhpdHNbMF0gKyAoZG93biA/IC0xNiA6IDE2KTtcbiAgICAgICAgLy9jb25zdCBkZXN0UG9zID0gc3JjUG9zICsgKHRpbGUgPCAwID8gLTE2IDogdGlsZSA+PSAweGYwID8gMTYgOiAtMCk7XG4gICAgICAgIC8vIE5PVEU6IGJvdHRvbS1lZGdlIHNlYW1sZXNzIGlzIHRyZWF0ZWQgYXMgZGVzdGluYXRpb24gZjBcbiAgICAgICAgY29uc3QgZGVzdFBvcyA9IHNyY1BvcyArICh0aWxlIDwgMCA/IC0xNiA6IDApO1xuICAgICAgICBjb25zdCBkZXN0VHlwZSA9IGRvd24gPyAnc2VhbWxlc3M6dXAnIDogJ3NlYW1sZXNzOmRvd24nO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGAke3NyY1R5cGV9ICR7aGV4KGxvY2F0aW9uLmlkKX0gJHtkb3dufSAke2hleCh0aWxlKX0gJHtoZXgoZGVzdFBvcyl9ICR7ZGVzdFR5cGV9ICR7aGV4KGRlc3QuaWQpfWApO1xuICAgICAgICBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBlbnRyYW5jZSA9IGRlc3QuZW50cmFuY2VzW2V4aXQuZW50cmFuY2UgJiAweDFmXTtcbiAgICAgIGxldCBkZXN0UG9zID0gZW50cmFuY2Uuc2NyZWVuO1xuICAgICAgbGV0IGRlc3RDb29yZCA9IGVudHJhbmNlLmNvb3JkO1xuICAgICAgaWYgKHNyY1R5cGUgPT09ICdkb29yJyAmJiAoZW50cmFuY2UueSAmIDB4ZjApID09PSAwKSB7XG4gICAgICAgIC8vIE5PVEU6IFRoZSBpdGVtIHNob3AgZG9vciBpbiBPYWsgc3RyYWRkbGVzIHR3byBzY3JlZW5zIChleGl0IGlzIG9uXG4gICAgICAgIC8vIHRoZSBOVyBzY3JlZW4gd2hpbGUgZW50cmFuY2UgaXMgb24gU1cgc2NyZWVuKS4gIERvIGEgcXVpY2sgaGFjayB0b1xuICAgICAgICAvLyBkZXRlY3QgdGhpcyAocHJveHlpbmcgXCJkb29yXCIgZm9yIFwidXB3YXJkIGV4aXRcIikgYW5kIGFkanVzdCBzZWFyY2hcbiAgICAgICAgLy8gdGFyZ2V0IGFjY29yZGluZ2x5LlxuICAgICAgICBkZXN0UG9zIC09IDB4MTA7XG4gICAgICAgIGRlc3RDb29yZCArPSAweDEwMDAwO1xuICAgICAgfVxuICAgICAgLy8gRmlndXJlIG91dCB0aGUgY29ubmVjdGlvbiB0eXBlIGZvciB0aGUgZGVzdFRpbGUuXG4gICAgICBjb25zdCBkZXN0U2NySWQgPSBkZXN0LnNjcmVlbnNbZGVzdFBvcyA+PiA0XVtkZXN0UG9zICYgMHhmXTtcbiAgICAgIGNvbnN0IGRlc3RUeXBlID0gZmluZEVudHJhbmNlVHlwZShkZXN0LCBkZXN0U2NySWQsIGRlc3RDb29yZCk7XG4gICAgICAvLyBOT1RFOiBpbml0aWFsIHNwYXduIGhhcyBubyB0eXBlLi4uP1xuICAgICAgaWYgKCFkZXN0VHlwZSkge1xuICAgICAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRlc3RTY3Igb2Ygcm9tLm1ldGFzY3JlZW5zLmdldEJ5SWQoZGVzdFNjcklkLCBkZXN0LnRpbGVzZXQpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBleGl0IG9mIGRlc3RTY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICAgICAgaWYgKGV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgICAgIGxpbmVzLnB1c2goYCAgJHtkZXN0U2NyLm5hbWV9ICR7ZXhpdC50eXBlfTogJHtoZXgoZXhpdC5lbnRyYW5jZSl9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUud2FybihgQmFkIGVudHJhbmNlICR7aGV4KGRlc3RDb29yZCl9OiByYXcgJHtoZXgoZGVzdFNjcklkKVxuICAgICAgICAgICAgICAgICAgICAgIH0gaW4gJHtkZXN0fSBAICR7aGV4KGRlc3RQb3MpfVxcbiR7bGluZXMuam9pbignXFxuJyl9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgICAvLyBpZiAoZGVzdFR5cGUpIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIHRoZSBwaXRzIG1hcC5cbiAgICBjb25zdCBwaXRzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHBpdCBvZiBsb2NhdGlvbi5waXRzKSB7XG4gICAgICBwaXRzLnNldChwaXQuZnJvbVNjcmVlbiwgcGl0LmRlc3QgPDwgOCB8IHBpdC50b1NjcmVlbik7XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YWxvYyA9IG5ldyBNZXRhbG9jYXRpb24obG9jYXRpb24uaWQsIHRpbGVzZXQsIGhlaWdodCwgd2lkdGgpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgc2NyZWVucy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgbWV0YWxvYy5zZXRJbnRlcm5hbChpLCBzY3JlZW5zW2ldKTtcbiAgICAvLyB9XG4gICAgbWV0YWxvYy5fc2NyZWVucyA9IHNjcmVlbnM7XG4gICAgbWV0YWxvYy5fZXhpdHMgPSBleGl0cztcbiAgICBtZXRhbG9jLl9waXRzID0gcGl0cztcblxuICAgIC8vIEZpbGwgaW4gY3VzdG9tIGZsYWdzXG4gICAgZm9yIChjb25zdCBmIG9mIGxvY2F0aW9uLmZsYWdzKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhbG9jLl9zY3JlZW5zW2Yuc2NyZWVuXTtcbiAgICAgIGlmIChzY3IuZmxhZz8uc3RhcnRzV2l0aCgnY3VzdG9tJykpIHtcbiAgICAgICAgbWV0YWxvYy5jdXN0b21GbGFncy5zZXQoZi5zY3JlZW4sIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAgIH0gZWxzZSBpZiAoIXNjci5mbGFnKSB7XG4gICAgICAgIG1ldGFsb2MuZnJlZUZsYWdzLmFkZChyb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGZvciAoY29uc3QgcG9zIG9mIG1ldGFsb2MuYWxsUG9zKCkpIHtcbiAgICAvLyAgIGNvbnN0IHNjciA9IHJvbS5tZXRhc2NyZWVuc1ttZXRhbG9jLl9zY3JlZW5zW3BvcyArIDE2XV07XG4gICAgLy8gICBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b20nKSB7XG4gICAgLy8gICAgIGNvbnN0IGYgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IHBvcyk7XG4gICAgLy8gICAgIGlmIChmKSBtZXRhbG9jLmN1c3RvbUZsYWdzLnNldChwb3MsIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cbiAgICAvLyBUT0RPIC0gc3RvcmUgcmVhY2hhYmlsaXR5IG1hcD9cbiAgICByZXR1cm4gbWV0YWxvYztcblxuICAgIGZ1bmN0aW9uIGZpbmRFbnRyYW5jZVR5cGUoZGVzdDogTG9jYXRpb24sIHNjcklkOiBudW1iZXIsIGNvb3JkOiBudW1iZXIpIHtcbiAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChzY3JJZCwgZGVzdC50aWxlc2V0KSkge1xuICAgICAgICBjb25zdCB0eXBlID0gZGVzdFNjci5maW5kRW50cmFuY2VUeXBlKGNvb3JkLCBkZXN0LmhlaWdodCA9PT0gMSk7XG4gICAgICAgIGlmICh0eXBlICE9IG51bGwpIHJldHVybiB0eXBlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvLyBpc1JlYWNoYWJsZShwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAvLyAgIHRoaXMuY29tcHV0ZVJlYWNoYWJsZSgpO1xuICAvLyAgIHJldHVybiAhISh0aGlzLl9yZWFjaGFibGUhW3BvcyA+Pj4gNF0gJiAoMSA8PCAocG9zICYgNykpKTtcbiAgLy8gfVxuXG4gIC8vIGNvbXB1dGVSZWFjaGFibGUoKSB7XG4gIC8vICAgaWYgKHRoaXMuX3JlYWNoYWJsZSkgcmV0dXJuO1xuICAvLyAgIHRoaXMuX3JlYWNoYWJsZSA9IG5ldyBVaW50OEFycmF5KHRoaXMuaGVpZ2h0KTtcbiAgLy8gICBjb25zdCBtYXAgPSB0aGlzLnRyYXZlcnNlKHtmbGlnaHQ6IHRydWV9KTtcbiAgLy8gICBjb25zdCBzZWVuID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxQb3M+KCk7XG4gIC8vICAgZm9yIChjb25zdCBbcG9zXSBvZiB0aGlzLl9leGl0cykge1xuICAvLyAgICAgY29uc3Qgc2V0ID0gbWFwLmdldChwb3MpXG4gIC8vICAgfVxuICAvLyB9XG5cbiAgZ2V0VWlkKHBvczogUG9zKTogVWlkIHtcbiAgICByZXR1cm4gdGhpcy5fc2NyZWVuc1twb3NdLnVpZDtcbiAgfVxuXG4gIGdldChwb3M6IFBvcyk6IE1ldGFzY3JlZW4ge1xuICAgIHJldHVybiB0aGlzLl9zY3JlZW5zW3Bvc107XG4gIH1cblxuICAvLyBSZWFkb25seSBhY2Nlc3Nvci5cbiAgLy8gZ2V0IHNjcmVlbnMoKTogcmVhZG9ubHkgVWlkW10ge1xuICAvLyAgIHJldHVybiB0aGlzLl9zY3JlZW5zO1xuICAvLyB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoO1xuICB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX2hlaWdodCA+IGhlaWdodCkge1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UoKGhlaWdodCArIDIpIDw8IDQsICh0aGlzLl9oZWlnaHQgLSBoZWlnaHQpIDw8IDQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faGVpZ2h0IDwgaGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmxlbmd0aCA9IChoZWlnaHQgKyAyKSA8PCA0O1xuICAgICAgdGhpcy5fc2NyZWVucy5maWxsKHRoaXMudGlsZXNldC5lbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5oZWlnaHQgKyAyKSA8PCA0LCB0aGlzLl9zY3JlZW5zLmxlbmd0aCk7XG4gICAgfVxuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBUT0RPIC0gcmVzaXplIGZ1bmN0aW9uP1xuXG4gIGFsbFBvcygpOiByZWFkb25seSBQb3NbXSB7XG4gICAgaWYgKHRoaXMuX3BvcykgcmV0dXJuIHRoaXMuX3BvcztcbiAgICBjb25zdCBwOiBudW1iZXJbXSA9IHRoaXMuX3BvcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5faGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fd2lkdGg7IHgrKykge1xuICAgICAgICBwLnB1c2goeSA8PCA0IHwgeCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9XG5cbiAgc2V0KHBvczogUG9zLCBzY3I6IE1ldGFzY3JlZW4gfCBudWxsKSB7XG4gICAgdGhpcy5fc2NyZWVuc1twb3NdID0gc2NyID8/IHRoaXMudGlsZXNldC5lbXB0eTtcbiAgfVxuXG4gIC8vaW52YWxpZGF0ZU1vbnN0ZXJzKCkgeyB0aGlzLl9tb25zdGVyc0ludmFsaWRhdGVkID0gdHJ1ZTsgfVxuXG4gIGluQm91bmRzKHBvczogUG9zKTogYm9vbGVhbiB7XG4gICAgLy8gcmV0dXJuIGluQm91bmRzKHBvcywgdGhpcy5oZWlnaHQsIHRoaXMud2lkdGgpO1xuICAgIHJldHVybiAocG9zICYgMTUpIDwgdGhpcy53aWR0aCAmJiBwb3MgPj0gMCAmJiBwb3MgPj4+IDQgPCB0aGlzLmhlaWdodDtcbiAgfVxuXG4gIC8vIGlzRml4ZWQocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdGhpcy5fZml4ZWQuaGFzKHBvcyk7XG4gIC8vIH1cblxuICAvKipcbiAgICogRm9yY2Utb3ZlcndyaXRlcyB0aGUgZ2l2ZW4gcmFuZ2Ugb2Ygc2NyZWVucy4gIERvZXMgdmFsaWRpdHkgY2hlY2tpbmdcbiAgICogb25seSBhdCB0aGUgZW5kLiAgRG9lcyBub3QgZG8gYW55dGhpbmcgd2l0aCBmZWF0dXJlcywgc2luY2UgdGhleSdyZVxuICAgKiBvbmx5IHNldCBpbiBsYXRlciBwYXNzZXMgKGkuZS4gc2h1ZmZsZSwgd2hpY2ggaXMgbGFzdCkuXG4gICAqL1xuICBzZXQyZChwb3M6IFBvcyxcbiAgICAgICAgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE9wdGlvbmFsPE1ldGFzY3JlZW4+Pj4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiBzY3JlZW5zKSB7XG4gICAgICBsZXQgZHggPSAwO1xuICAgICAgZm9yIChjb25zdCBzY3Igb2Ygcm93KSB7XG4gICAgICAgIGlmIChzY3IpIHRoaXMuc2V0KHBvcyArIGR4LCBzY3IpO1xuICAgICAgICBkeCsrO1xuICAgICAgfVxuICAgICAgcG9zICs9IDE2O1xuICAgIH1cbiAgICAvLyByZXR1cm4gdGhpcy52ZXJpZnkocG9zMCwgc2NyZWVucy5sZW5ndGgsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIE1hdGgubWF4KC4uLnNjcmVlbnMubWFwKHIgPT4gci5sZW5ndGgpKSk7XG4gICAgLy8gVE9ETyAtIHRoaXMgaXMga2luZCBvZiBicm9rZW4uLi4gOi0oXG4gICAgLy8gcmV0dXJuIHRoaXMudmFsaWRhdGUoKTtcbiAgICAvL3JldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqIENoZWNrIGFsbCB0aGUgY3VycmVudGx5IGludmFsaWRhdGVkIGVkZ2VzLCB0aGVuIGNsZWFycyBpdC4gKi9cbiAgdmFsaWRhdGUoKTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBkaXIgb2YgWzAsIDFdKSB7XG4gICAgICBmb3IgKGxldCB5ID0gZGlyID8gMCA6IDE7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICAgIGZvciAobGV0IHggPSBkaXI7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBwb3MwOiBQb3MgPSB5IDw8IDQgfCB4O1xuICAgICAgICAgIGNvbnN0IHNjcjAgPSB0aGlzLl9zY3JlZW5zW3BvczBdO1xuICAgICAgICAgIGNvbnN0IHBvczE6IFBvcyA9IHBvczAgLSAoZGlyID8gMSA6IDE2KTtcbiAgICAgICAgICBjb25zdCBzY3IxID0gdGhpcy5fc2NyZWVuc1twb3MxXTtcbiAgICAgICAgICBpZiAoc2NyMC5pc0VtcHR5KCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChzY3IxLmlzRW1wdHkoKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKCFzY3IwLmNoZWNrTmVpZ2hib3Ioc2NyMSwgZGlyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZvcm1hdCgnYmFkIG5laWdoYm9yICVzICglMDJ4KSAlcyAlcyAoJTAyeCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3IxLm5hbWUsIHBvczEsIERJUl9OQU1FW2Rpcl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcjAubmFtZSwgcG9zMCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHNwbGljZUNvbHVtbnMobGVmdDogbnVtYmVyLCBkZWxldGVkOiBudW1iZXIsIGluc2VydGVkOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE1ldGFzY3JlZW4+Pikge1xuICAgIC8vIEZpcnN0IGFkanVzdCB0aGUgc2NyZWVucy5cbiAgICBmb3IgKGxldCBwID0gMDsgcCA8IHRoaXMuX3NjcmVlbnMubGVuZ3RoOyBwICs9IDE2KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmNvcHlXaXRoaW4ocCArIGxlZnQgKyBpbnNlcnRlZCwgcCArIGxlZnQgKyBkZWxldGVkLCBwICsgMTApO1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UocCArIGxlZnQsIGluc2VydGVkLCAuLi5zY3JlZW5zW3AgPj4gNF0pO1xuICAgIH1cbiAgICAvLyBVcGRhdGUgZGltZW5zaW9ucyBhbmQgYWNjb3VudGluZ1xuICAgIGNvbnN0IGRlbHRhID0gaW5zZXJ0ZWQgLSBkZWxldGVkO1xuICAgIHRoaXMud2lkdGggKz0gZGVsdGE7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICAgIC8vIE1vdmUgcmVsZXZhbnQgZXhpdHNcbiAgICBjb25zdCBtb3ZlOiBbUG9zLCBDb25uZWN0aW9uVHlwZSwgUG9zLCBDb25uZWN0aW9uVHlwZV1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHggPSBwb3MgJiAweGY7XG4gICAgICBpZiAoeCA8IGxlZnQgKyBkZWxldGVkKSB7XG4gICAgICAgIGlmICh4ID49IGxlZnQpIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG1vdmUucHVzaChbcG9zLCB0eXBlLCBwb3MgKyBkZWx0YSwgdHlwZV0pO1xuICAgIH1cbiAgICB0aGlzLm1vdmVFeGl0cyguLi5tb3ZlKTtcbiAgICAvLyBNb3ZlIGZsYWdzIGFuZCBzcGF3bnMgaW4gcGFyZW50IGxvY2F0aW9uXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGNvbnN0IHh0MCA9IChsZWZ0ICsgZGVsZXRlZCkgPDwgNDtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHBhcmVudC5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi54dCA8IHh0MCkgY29udGludWU7XG4gICAgICBzcGF3bi54dCAtPSAoZGVsdGEgPDwgNCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZmxhZyBvZiBwYXJlbnQuZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnLnhzIDwgbGVmdCArIGRlbGV0ZWQpIHtcbiAgICAgICAgaWYgKGZsYWcueHMgPj0gbGVmdCkgZmxhZy5zY3JlZW4gPSAweGZmO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZsYWcueHMgLT0gZGVsdGE7XG4gICAgfVxuICAgIHBhcmVudC5mbGFncyA9IHBhcmVudC5mbGFncy5maWx0ZXIoZiA9PiBmLnNjcmVlbiAhPT0gMHhmZik7XG5cbiAgICAvLyBUT0RPIC0gbW92ZSBwaXRzPz9cblxuICB9XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyBFeGl0IGhhbmRsaW5nXG5cbiAgc2V0RXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUsIHNwZWM6IEV4aXRTcGVjKSB7XG4gICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5sb2NhdGlvbnNbc3BlY1swXSA+Pj4gOF0ubWV0YTtcbiAgICBpZiAoIW90aGVyKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBzZXQgdHdvLXdheSBleGl0IHdpdGhvdXQgbWV0YWApO1xuICAgIHRoaXMuc2V0RXhpdE9uZVdheShwb3MsIHR5cGUsIHNwZWMpO1xuICAgIG90aGVyLnNldEV4aXRPbmVXYXkoc3BlY1swXSAmIDB4ZmYsIHNwZWNbMV0sIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgfVxuICBzZXRFeGl0T25lV2F5KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSwgc3BlYzogRXhpdFNwZWMpIHtcbiAgICAvLyBjb25zdCBwcmV2ID0gdGhpcy5fZXhpdHMuZ2V0KHBvcywgdHlwZSk7XG4gICAgLy8gaWYgKHByZXYpIHtcbiAgICAvLyAgIGNvbnN0IG90aGVyID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZbMF0gPj4+IDhdLm1ldGE7XG4gICAgLy8gICBpZiAob3RoZXIpIG90aGVyLl9leGl0cy5kZWxldGUocHJldlswXSAmIDB4ZmYsIHByZXZbMV0pO1xuICAgIC8vIH1cbiAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBzcGVjKTtcbiAgfVxuICBkZWxldGVFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSkge1xuICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICB9XG5cbiAgZ2V0RXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUpOiBFeGl0U3BlY3x1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9leGl0cy5nZXQocG9zLCB0eXBlKTtcbiAgfVxuXG4gIGV4aXRzKCk6IEl0ZXJhYmxlPHJlYWRvbmx5IFtQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlY10+IHtcbiAgICByZXR1cm4gdGhpcy5fZXhpdHM7XG4gIH1cblxuICAvLyBUT0RPIC0gY291bnRlZCBjYW5kaWRhdGVzP1xuICBleGl0Q2FuZGlkYXRlcyh0eXBlOiBDb25uZWN0aW9uVHlwZSk6IE1ldGFzY3JlZW5bXSB7XG4gICAgLy8gVE9ETyAtIGZpZ3VyZSBvdXQgYSB3YXkgdG8gdXNlIHRoZSBkb3VibGUtc3RhaXJjYXNlPyAgaXQgd29uJ3RcbiAgICAvLyBoYXBwZW4gY3VycmVudGx5IGJlY2F1c2UgaXQncyBmaXhlZCwgc28gaXQncyBleGNsdWRlZC4uLi4/XG4gICAgY29uc3QgaGFzRXhpdDogTWV0YXNjcmVlbltdID0gW107XG4gICAgZm9yIChjb25zdCBzY3Igb2YgdGhpcy50aWxlc2V0KSB7XG4gICAgICBpZiAoc2NyLmRhdGEuZXhpdHM/LnNvbWUoZSA9PiBlLnR5cGUgPT09IHR5cGUpKSBoYXNFeGl0LnB1c2goc2NyKTtcbiAgICB9XG4gICAgcmV0dXJuIGhhc0V4aXQ7XG4gIH1cblxuICAvLyBUT0RPIC0gc2hvcnQgdnMgZnVsbD9cbiAgc2hvdygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgbGV0IGxpbmUgPSBbXTtcbiAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgbGluZS5wdXNoKHgudG9TdHJpbmcoMTYpKTtcbiAgICB9XG4gICAgbGluZXMucHVzaCgnICAgJyArIGxpbmUuam9pbignICAnKSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCByID0gMDsgciA8IDM7IHIrKykge1xuICAgICAgICBsaW5lID0gW3IgPT09IDEgPyB5LnRvU3RyaW5nKDE2KSA6ICcgJywgJyAnXTtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLl9zY3JlZW5zW3kgPDwgNCB8IHhdO1xuICAgICAgICAgIGxpbmUucHVzaChzY3JlZW4/LmRhdGEuaWNvbj8uZnVsbFtyXSA/PyAociA9PT0gMSA/ICcgPyAnIDogJyAgICcpKTtcbiAgICAgICAgfVxuICAgICAgICBsaW5lcy5wdXNoKGxpbmUuam9pbignJykpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICBzY3JlZW5OYW1lcygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBsZXQgbGluZSA9IFtdO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XTtcbiAgICAgICAgbGluZS5wdXNoKHNjcmVlbj8ubmFtZSk7XG4gICAgICB9XG4gICAgICBsaW5lcy5wdXNoKGxpbmUuam9pbignICcpKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgdHJhdmVyc2Uob3B0czogVHJhdmVyc2VPcHRzID0ge30pOiBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4ge1xuICAgIC8vIFJldHVybnMgYSBtYXAgZnJvbSB1bmlvbmZpbmQgcm9vdCB0byBhIGxpc3Qgb2YgYWxsIHJlYWNoYWJsZSB0aWxlcy5cbiAgICAvLyBBbGwgZWxlbWVudHMgb2Ygc2V0IGFyZSBrZXlzIHBvaW50aW5nIHRvIHRoZSBzYW1lIHZhbHVlIHJlZi5cbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IGNvbm5lY3Rpb25UeXBlID0gKG9wdHMuZmxpZ2h0ID8gMiA6IDApIHwgKG9wdHMubm9GbGFnZ2VkID8gMSA6IDApO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG9wdHMud2l0aD8uZ2V0KHBvcykgPz8gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNjci5jb25uZWN0aW9uc1tjb25uZWN0aW9uVHlwZV0pIHtcbiAgICAgICAgaWYgKCFzZWdtZW50Lmxlbmd0aCkgY29udGludWU7IC8vIGUuZy4gZW1wdHlcbiAgICAgICAgLy8gQ29ubmVjdCB3aXRoaW4gZWFjaCBzZWdtZW50XG4gICAgICAgIHVmLnVuaW9uKHNlZ21lbnQubWFwKGMgPT4gKHBvcyA8PCA4KSArIGMpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KCk7XG4gICAgY29uc3Qgc2V0cyA9IHVmLnNldHMoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHNldCA9IHNldHNbaV07XG4gICAgICBmb3IgKGNvbnN0IGVsZW0gb2Ygc2V0KSB7XG4gICAgICAgIG1hcC5zZXQoZWxlbSwgc2V0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbWFwO1xuICB9ICBcblxuICAvKiogQHBhcmFtIGVkZ2UgQSB2YWx1ZSBmcm9tIGEgdHJhdmVyc2Ugc2V0LiAqL1xuICBleGl0VHlwZShlZGdlOiBudW1iZXIpOiBDb25uZWN0aW9uVHlwZXx1bmRlZmluZWQge1xuICAgIGlmICgoZWRnZSAmIDB4ZjApICE9PSAweGUwKSByZXR1cm47XG4gICAgY29uc3QgcG9zID0gZWRnZSA+Pj4gODtcbiAgICBjb25zdCBzY3IgPSB0aGlzLmdldChwb3MpO1xuICAgIGNvbnN0IHR5cGUgPSBzY3IuZGF0YS5leGl0cz8uW2VkZ2UgJiAweGZdLnR5cGU7XG4gICAgaWYgKCF0eXBlPy5zdGFydHNXaXRoKCdlZGdlOicpKSByZXR1cm4gdHlwZTtcbiAgICAvLyBtYXkgbm90IGFjdHVhbGx5IGJlIGFuIGV4aXQuXG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOnRvcCcgJiYgKHBvcyA+Pj4gNCkpIHJldHVybjtcbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiAocG9zID4+PiA0KSA9PT0gdGhpcy5oZWlnaHQgLSAxKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmxlZnQnICYmIChwb3MgJiAweGYpKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgKHBvcyAmIDB4ZikgPT09IHRoaXMud2lkdGggLSAxKSByZXR1cm47XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGVkZ2UgQSB2YWx1ZSBmcm9tIGEgdHJhdmVyc2Ugc2V0LlxuICAgKiBAcmV0dXJuIEFuIFl5WHggcG9zaXRpb24gZm9yIHRoZSBnaXZlbiBwb2ksIGlmIGl0IGV4aXN0cy5cbiAgICovXG4gIHBvaVRpbGUoZWRnZTogbnVtYmVyKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRhY2ggYW4gZXhpdC9lbnRyYW5jZSBwYWlyIGluIHR3byBkaXJlY3Rpb25zLlxuICAgKiBBbHNvIHJlYXR0YWNoZXMgdGhlIGZvcm1lciBvdGhlciBlbmRzIG9mIGVhY2ggdG8gZWFjaCBvdGhlci5cbiAgICovXG4gIGF0dGFjaChzcmNQb3M6IFBvcywgZGVzdDogTWV0YWxvY2F0aW9uLCBkZXN0UG9zOiBQb3MsXG4gICAgICAgICBzcmNUeXBlPzogQ29ubmVjdGlvblR5cGUsIGRlc3RUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXNyY1R5cGUpIHNyY1R5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbUV4aXRzKHNyY1Bvcyk7XG4gICAgaWYgKCFkZXN0VHlwZSkgZGVzdFR5cGUgPSBkZXN0LnBpY2tUeXBlRnJvbUV4aXRzKGRlc3RQb3MpO1xuXG4gICAgLy8gVE9ETyAtIHdoYXQgaWYgbXVsdGlwbGUgcmV2ZXJzZXM/ICBlLmcuIGNvcmRlbCBlYXN0L3dlc3Q/XG4gICAgLy8gICAgICAtIGNvdWxkIGRldGVybWluZSBpZiB0aGlzIGFuZC9vciBkZXN0IGhhcyBhbnkgc2VhbWxlc3MuXG4gICAgLy8gTm86IGluc3RlYWQsIGRvIGEgcG9zdC1wcm9jZXNzLiAgT25seSBjb3JkZWwgbWF0dGVycywgc28gZ29cbiAgICAvLyB0aHJvdWdoIGFuZCBhdHRhY2ggYW55IHJlZHVuZGFudCBleGl0cy5cblxuICAgIGNvbnN0IGRlc3RUaWxlID0gZGVzdC5pZCA8PCA4IHwgZGVzdFBvcztcbiAgICBjb25zdCBwcmV2RGVzdCA9IHRoaXMuX2V4aXRzLmdldChzcmNQb3MsIHNyY1R5cGUpITtcbiAgICBpZiAocHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2RGVzdFRpbGUsIHByZXZEZXN0VHlwZV0gPSBwcmV2RGVzdDtcbiAgICAgIGlmIChwcmV2RGVzdFRpbGUgPT09IGRlc3RUaWxlICYmIHByZXZEZXN0VHlwZSA9PT0gZGVzdFR5cGUpIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcHJldlNyYyA9IGRlc3QuX2V4aXRzLmdldChkZXN0UG9zLCBkZXN0VHlwZSkhO1xuICAgIHRoaXMuX2V4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdKTtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFBvcywgZGVzdFR5cGUsIFt0aGlzLmlkIDw8IDggfCBzcmNQb3MsIHNyY1R5cGVdKTtcbiAgICAvLyBhbHNvIGhvb2sgdXAgcHJldmlvdXMgcGFpclxuICAgIGlmIChwcmV2U3JjICYmIHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldkRlc3RUaWxlLCBwcmV2RGVzdFR5cGVdID0gcHJldkRlc3Q7XG4gICAgICBjb25zdCBbcHJldlNyY1RpbGUsIHByZXZTcmNUeXBlXSA9IHByZXZTcmM7XG4gICAgICBjb25zdCBwcmV2U3JjTWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2U3JjVGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIGNvbnN0IHByZXZEZXN0TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2RGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBwcmV2U3JjTWV0YS5fZXhpdHMuc2V0KHByZXZTcmNUaWxlICYgMHhmZiwgcHJldlNyY1R5cGUsIHByZXZEZXN0KTtcbiAgICAgIHByZXZEZXN0TWV0YS5fZXhpdHMuc2V0KHByZXZEZXN0VGlsZSAmIDB4ZmYsIHByZXZEZXN0VHlwZSwgcHJldlNyYyk7XG4gICAgfSBlbHNlIGlmIChwcmV2U3JjIHx8IHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldlRpbGUsIHByZXZUeXBlXSA9IHByZXZTcmMgfHwgcHJldkRlc3Q7XG4gICAgICBjb25zdCBwcmV2TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIHByZXZNZXRhLl9leGl0cy5kZWxldGUocHJldlRpbGUgJiAweGZmLCBwcmV2VHlwZSk7ICAgICAgXG4gICAgfVxuICB9XG5cbiAgcGlja1R5cGVGcm9tRXhpdHMocG9zOiBQb3MpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgY29uc3QgdHlwZXMgPSBbLi4udGhpcy5fZXhpdHMucm93KHBvcykua2V5cygpXTtcbiAgICBpZiAoIXR5cGVzLmxlbmd0aCkgcmV0dXJuIHRoaXMucGlja1R5cGVGcm9tU2NyZWVucyhwb3MpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHNpbmdsZSB0eXBlIGZvciAke2hleChwb3MpfTogWyR7dHlwZXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlc1swXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbiBleGl0IGZyb20gb25lIHBvcy90eXBlIHRvIGFub3RoZXIuXG4gICAqIEFsc28gdXBkYXRlcyB0aGUgbWV0YWxvY2F0aW9uIG9uIHRoZSBvdGhlciBlbmQgb2YgdGhlIGV4aXQuXG4gICAqIFRoaXMgc2hvdWxkIHR5cGljYWxseSBiZSBkb25lIGF0b21pY2FsbHkgaWYgcmVidWlsZGluZyBhIG1hcC5cbiAgICovXG4gIC8vIFRPRE8gLSByZWJ1aWxkaW5nIGEgbWFwIGludm9sdmVzIG1vdmluZyB0byBhIE5FVyBtZXRhbG9jYXRpb24uLi5cbiAgLy8gICAgICAtIGdpdmVuIHRoaXMsIHdlIG5lZWQgYSBkaWZmZXJlbnQgYXBwcm9hY2g/XG4gIG1vdmVFeGl0cyguLi5tb3ZlczogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIExvY1BvcywgQ29ubmVjdGlvblR5cGVdPikge1xuICAgIGNvbnN0IG5ld0V4aXRzOiBBcnJheTxbUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgW29sZFBvcywgb2xkVHlwZSwgbmV3UG9zLCBuZXdUeXBlXSBvZiBtb3Zlcykge1xuICAgICAgY29uc3QgZGVzdEV4aXQgPSB0aGlzLl9leGl0cy5nZXQob2xkUG9zLCBvbGRUeXBlKSE7XG4gICAgICBjb25zdCBbZGVzdFRpbGUsIGRlc3RUeXBlXSA9IGRlc3RFeGl0O1xuICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgIFt0aGlzLmlkIDw8IDggfCBuZXdQb3MsIG5ld1R5cGVdKTtcbiAgICAgIG5ld0V4aXRzLnB1c2goW25ld1BvcywgbmV3VHlwZSwgZGVzdEV4aXRdKTtcbiAgICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShvbGRQb3MsIG9sZFR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIGV4aXRdIG9mIG5ld0V4aXRzKSB7XG4gICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gIH1cblxuICBtb3ZlRXhpdChwcmV2OiBQb3MsIG5leHQ6IFBvcyxcbiAgICAgICAgICAgcHJldlR5cGU/OiBDb25uZWN0aW9uVHlwZSwgbmV4dFR5cGU/OiBDb25uZWN0aW9uVHlwZSkge1xuICAgIGlmICghcHJldlR5cGUpIHByZXZUeXBlID0gdGhpcy5waWNrVHlwZUZyb21FeGl0cyhwcmV2KTtcbiAgICBpZiAoIW5leHRUeXBlKSBuZXh0VHlwZSA9IHRoaXMucGlja1R5cGVGcm9tU2NyZWVucyhuZXh0KTtcbiAgICBjb25zdCBkZXN0RXhpdCA9IHRoaXMuX2V4aXRzLmdldChwcmV2LCBwcmV2VHlwZSkhO1xuICAgIGNvbnN0IFtkZXN0VGlsZSwgZGVzdFR5cGVdID0gZGVzdEV4aXQ7XG4gICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgW3RoaXMuaWQgPDwgOCB8IG5leHQsIG5leHRUeXBlXSk7XG4gICAgdGhpcy5fZXhpdHMuc2V0KG5leHQsIG5leHRUeXBlLCBkZXN0RXhpdCk7XG4gICAgdGhpcy5fZXhpdHMuZGVsZXRlKHByZXYsIHByZXZUeXBlKTtcbiAgfVxuXG4gIG1vdmVFeGl0c0FuZFBpdHNUbyhvdGhlcjogTWV0YWxvY2F0aW9uKSB7XG4gICAgY29uc3QgbW92ZWQgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBvdGhlci5hbGxQb3MoKSkge1xuICAgICAgaWYgKCFvdGhlci5nZXQocG9zKS5kYXRhLmRlbGV0ZSkge1xuICAgICAgICBtb3ZlZC5hZGQocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGlmICghbW92ZWQuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF0ubWV0YTtcbiAgICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLCBbb3RoZXIuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICAgICAgb3RoZXIuX2V4aXRzLnNldChwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdKTtcbiAgICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtmcm9tLCB0b10gb2YgdGhpcy5fcGl0cykge1xuICAgICAgaWYgKCFtb3ZlZC5oYXMoZnJvbSkpIGNvbnRpbnVlO1xuICAgICAgb3RoZXIuX3BpdHMuc2V0KGZyb20sIHRvKTtcbiAgICAgIHRoaXMuX3BpdHMuZGVsZXRlKGZyb20pO1xuICAgIH1cbiAgfVxuXG4gIHBpY2tUeXBlRnJvbVNjcmVlbnMocG9zOiBQb3MpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgY29uc3QgZXhpdHMgPSB0aGlzLl9zY3JlZW5zW3Bvc10uZGF0YS5leGl0cztcbiAgICBjb25zdCB0eXBlcyA9IChleGl0cyA/PyBbXSkubWFwKGUgPT4gZS50eXBlKTtcbiAgICBpZiAodHlwZXMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHNpbmdsZSB0eXBlIGZvciAke2hleChwb3MpfTogWyR7dHlwZXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlc1swXTtcbiAgfVxuXG4gIHRyYW5zZmVyRmxhZ3Mob3JpZzogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIENvcHkgb3ZlciB0aGUgZnJlZSBmbGFnc1xuICAgIHRoaXMuZnJlZUZsYWdzID0gbmV3IFNldChvcmlnLmZyZWVGbGFncyk7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIGN1c3RvbSBmbGFncy5cbiAgICBjb25zdCBjdXN0b21zID0gbmV3IERlZmF1bHRNYXA8TWV0YXNjcmVlbiwgRmxhZ1tdPigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBbcG9zLCBmbGFnXSBvZiBvcmlnLmN1c3RvbUZsYWdzKSB7XG4gICAgICBjdXN0b21zLmdldChvcmlnLl9zY3JlZW5zW3Bvc10pLnB1c2goZmxhZyk7XG4gICAgfVxuICAgIC8vIFNodWZmbGUgdGhlbSBqdXN0IGluIGNhc2UgdGhleSdyZSBub3QgYWxsIHRoZSBzYW1lLi4uXG4gICAgLy8gVE9ETyAtIGZvciBzZWFtbGVzcyBwYWlycywgb25seSBzaHVmZmxlIG9uY2UsIHRoZW4gY29weS5cbiAgICBmb3IgKGNvbnN0IGZsYWdzIG9mIGN1c3RvbXMudmFsdWVzKCkpIHJhbmRvbS5zaHVmZmxlKGZsYWdzKTtcbiAgICAvLyBGaW5kIGFsbCB0aGUgY3VzdG9tLWZsYWcgc2NyZWVucyBpbiB0aGUgbmV3IGxvY2F0aW9uLlxuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGlmIChzY3IuZmxhZz8uc3RhcnRzV2l0aCgnY3VzdG9tJykpIHtcbiAgICAgICAgY29uc3QgZmxhZyA9IGN1c3RvbXMuZ2V0KHNjcikucG9wKCk7XG4gICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZmxhZyBmb3IgJHtzY3IubmFtZX0gYXQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX0gQCR7aGV4KHBvcyl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXN0b21GbGFncy5zZXQocG9zLCBmbGFnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29weSBwaXQgZGVzdGluYXRpb25zIGZyb20gdGhlIG9yaWdpbmFsLiAgTk9URTogdGhlcmUgaXMgTk8gc2FmZXR5XG4gICAqIGNoZWNrIGhlcmUgZm9yIHRoZSBwaXRzIGJlaW5nIHJlYXNvbmFibGUuICBUaGF0IG11c3QgYmUgZG9uZSBlbHNld2hlcmUuXG4gICAqIFdlIGRvbid0IHdhbnQgcGl0IHNhZmV0eSB0byBiZSBjb250aW5nZW50IG9uIHN1Y2Nlc3NmdWwgc2h1ZmZsaW5nIG9mXG4gICAqIHRoZSB1cHN0YWlycyBtYXAuXG4gICAqL1xuICB0cmFuc2ZlclBpdHMob3JpZzogTWV0YWxvY2F0aW9uKSB7XG4gICAgdGhpcy5fcGl0cyA9IG9yaWcuX3BpdHM7XG4gIH1cblxuICAvKiogRW5zdXJlIGFsbCBwaXRzIGdvIHRvIHZhbGlkIGxvY2F0aW9ucy4gKi9cbiAgc2h1ZmZsZVBpdHMocmFuZG9tOiBSYW5kb20pIHtcbiAgICBpZiAoIXRoaXMuX3BpdHMuc2l6ZSkgcmV0dXJuO1xuICAgIC8vIEZpbmQgYWxsIHBpdCBkZXN0aW5hdGlvbnMuXG4gICAgY29uc3QgZGVzdHMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IFssIGRlc3RdIG9mIHRoaXMuX3BpdHMpIHtcbiAgICAgIGRlc3RzLmFkZCh0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdCA+Pj4gOF0uaWQpO1xuICAgIH1cbiAgICB0aGlzLl9waXRzLmNsZWFyKCk7XG5cbiAgICAvLyBMb29rIGZvciBleGlzdGluZyBwaXRzLiAgU29ydCBieSBsb2NhdGlvbiwgW3BpdCBwb3MsIGRlc3QgcG9zXVxuICAgIGNvbnN0IHBpdHMgPSBuZXcgRGVmYXVsdE1hcDxNZXRhbG9jYXRpb24sIEFycmF5PFtQb3MsIFBvc10+PigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5nZXQocG9zKTtcbiAgICAgIGlmICghc2NyLmhhc0ZlYXR1cmUoJ3BpdCcpKSBjb250aW51ZTtcbiAgICAgIC8vIEZpbmQgdGhlIG5lYXJlc3QgZXhpdCB0byBvbmUgb2YgdGhvc2UgZGVzdGluYXRpb25zOiBbZGVsdGEsIGxvYywgZGlzdF1cbiAgICAgIGxldCBjbG9zZXN0OiBbUG9zLCBNZXRhbG9jYXRpb24sIG51bWJlcl0gPSBbLTEsIHRoaXMsIEluZmluaXR5XTtcbiAgICAgIGZvciAoY29uc3QgW2V4aXRQb3MsLCBbZGVzdF1dIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICAgIGNvbnN0IGRpc3QgPSBkaXN0YW5jZShwb3MsIGV4aXRQb3MpO1xuICAgICAgICBpZiAoZGVzdHMuaGFzKGRlc3QgPj4+IDgpICYmIGRpc3QgPCBjbG9zZXN0WzJdKSB7XG4gICAgICAgICAgY29uc3QgZGxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0ID4+PiA4XS5tZXRhO1xuICAgICAgICAgIGNvbnN0IGRwb3MgPSBkZXN0ICYgMHhmZjtcbiAgICAgICAgICBjbG9zZXN0ID0gW2FkZERlbHRhKHBvcywgZHBvcywgZXhpdFBvcywgZGxvYyksIGRsb2MsIGRpc3RdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2xvc2VzdFswXSA+PSAwKSBwaXRzLmdldChjbG9zZXN0WzFdKS5wdXNoKFtwb3MsIGNsb3Nlc3RbMF1dKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBkZXN0IG9mIGRlc3RzKSB7XG4gICAgICBjb25zdCBsaXN0ID0gcGl0cy5nZXQodGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdLm1ldGEpO1xuICAgICAgLy8gSWYgdGhlcmUncyBldmVyIG5vdCBhIGRpcmVjdCBleGl0IHRvIGFueSBkZXN0aW5hdGlvbiwganVzdCBwdXNoXG4gICAgICAvLyBhIGxhcmdlIGRlbHRhIHRvd2FyZCB0aGUgYm90dG9tIG9mIHRoZSBtYXAuXG4gICAgICBpZiAoIWxpc3QubGVuZ3RoKSBsaXN0LnB1c2goWzAsIDB4ZjBdKTtcbiAgICB9XG5cbiAgICAvLyBGb3IgZWFjaCBkZXN0aW5hdGlvbiBsb2NhdGlvbiwgbG9vayBmb3Igc3Bpa2VzLCB0aGVzZSB3aWxsIG92ZXJyaWRlXG4gICAgLy8gYW55IHBvc2l0aW9uLWJhc2VkIGRlc3RpbmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IFtkZXN0LCBsaXN0XSBvZiBwaXRzKSB7XG4gICAgICAvLyB2ZXJ0aWNhbCwgaG9yaXpvbnRhbFxuICAgICAgY29uc3QgZWxpZ2libGU6IFBvc1tdW10gPSBbW10sIFtdXTtcbiAgICAgIGNvbnN0IHNwaWtlcyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiBkZXN0LmFsbFBvcygpKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGRlc3QuZ2V0KHBvcyk7XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncml2ZXInKSB8fCBzY3IuaGFzRmVhdHVyZSgnZW1wdHknKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGVkZ2VzID1cbiAgICAgICAgICAgIChzY3IuZGF0YS5lZGdlcyB8fCAnJykuc3BsaXQoJycpLm1hcCh4ID0+IHggPT09ICcgJyA/ICcnIDogeCk7XG4gICAgICAgIGlmIChlZGdlc1swXSAmJiBlZGdlc1syXSkgZWxpZ2libGVbMF0ucHVzaChwb3MpO1xuICAgICAgICAvLyBOT1RFOiB3ZSBjbGFtcCB0aGUgdGFyZ2V0IFggY29vcmRzIHNvIHRoYXQgc3Bpa2Ugc2NyZWVucyBhcmUgYWxsIGdvb2RcbiAgICAgICAgLy8gdGhpcyBwcmV2ZW50cyBlcnJvcnMgZnJvbSBub3QgaGF2aW5nIGEgdmlhYmxlIGRlc3RpbmF0aW9uIHNjcmVlbi5cbiAgICAgICAgaWYgKChlZGdlc1sxXSAmJiBlZGdlc1szXSkgfHwgc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSB7XG4gICAgICAgICAgZWxpZ2libGVbMV0ucHVzaChwb3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgICBzcGlrZXMuc2V0KHBvcywgWy4uLmVkZ2VzXS5maWx0ZXIoYyA9PiBjID09PSAncycpLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbi8vY29uc29sZS5sb2coYGRlc3Q6XFxuJHtkZXN0LnNob3coKX1cXG5lbGlnaWJsZTogJHtlbGlnaWJsZS5tYXAoZSA9PiBlLm1hcChoID0+IGgudG9TdHJpbmcoMTYpKS5qb2luKCcsJykpLmpvaW4oJyAgJyl9YCk7XG4gICAgICAvLyBmaW5kIHRoZSBjbG9zZXN0IGRlc3RpbmF0aW9uIGZvciB0aGUgZmlyc3QgcGl0LCBrZWVwIGEgcnVubmluZyBkZWx0YS5cbiAgICAgIGxldCBkZWx0YTogW1BvcywgUG9zXSA9IFswLCAwXTtcbiAgICAgIGZvciAoY29uc3QgW3Vwc3RhaXJzLCBkb3duc3RhaXJzXSBvZiBsaXN0KSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuZ2V0KHVwc3RhaXJzKTtcbiAgICAgICAgY29uc3QgZWRnZXMgPSBzY3IuZGF0YS5lZGdlcyB8fCAnJztcbiAgICAgICAgY29uc3QgZGlyID0gZWRnZXNbMV0gPT09ICdjJyAmJiBlZGdlc1szXSA9PT0gJ2MnID8gMSA6IDA7XG4gICAgICAgIC8vIGVsaWdpYmxlIGRlc3QgdGlsZSwgZGlzdGFuY2VcbiAgICAgICAgbGV0IGNsb3Nlc3Q6IFtQb3MsIG51bWJlciwgbnVtYmVyXSA9IFstMSwgSW5maW5pdHksIDBdO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhZGREZWx0YShkb3duc3RhaXJzLCBkZWx0YVswXSwgZGVsdGFbMV0sIGRlc3QpO1xuICAgICAgICBmb3IgKGNvbnN0IHBvcyBvZiBlbGlnaWJsZVtkaXJdKSB7IC8vZm9yIChsZXQgaSA9IDA7IGkgPCBlbGlnaWJsZVtkaXJdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgLy8gICAgICAgICAgY29uc3QgcG9zID0gZWxpZ2libGVbZGlyXVtpXTtcbiAgICAgICAgICBjb25zdCBzcGlrZUNvdW50ID0gc3Bpa2VzLmdldChwb3MpID8/IDA7XG4gICAgICAgICAgaWYgKHNwaWtlQ291bnQgPCBjbG9zZXN0WzJdKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBkaXN0ID0gZGlzdGFuY2UodGFyZ2V0LCBwb3MpO1xuICAgICAgICAgIGlmIChkaXN0IDwgY2xvc2VzdFsxXSkge1xuICAgICAgICAgICAgY2xvc2VzdCA9IFtwb3MsIGRpc3QsIHNwaWtlQ291bnRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbmRQb3MgPSBjbG9zZXN0WzBdO1xuICAgICAgICBpZiAoZW5kUG9zIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyBlbGlnaWJsZSBkZXN0YCk7XG4gICAgICAgIGRlbHRhID0gW2VuZFBvcywgdGFyZ2V0XTtcbiAgICAgICAgdGhpcy5fcGl0cy5zZXQodXBzdGFpcnMsIGRlc3QuaWQgPDwgOCB8IGVuZFBvcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRha2VzIG93bmVyc2hpcCBvZiBleGl0cyBmcm9tIGFub3RoZXIgbWV0YWxvY2F0aW9uIHdpdGggdGhlIHNhbWUgSUQuXG4gICAqIEBwYXJhbSB7Zml4ZWR9IG1hcHMgZGVzdGluYXRpb24gbG9jYXRpb24gSUQgdG8gcG9zIHdoZXJlIHRoZSBleGl0IGlzLlxuICAgKi9cbiAgdHJhbnNmZXJFeGl0cyhvcmlnOiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gRGV0ZXJtaW5lIGFsbCB0aGUgZWxpZ2libGUgZXhpdCBzY3JlZW5zLlxuICAgIGNvbnN0IGV4aXRzID0gbmV3IERlZmF1bHRNYXA8Q29ubmVjdGlvblR5cGUsIFBvc1tdPigoKSA9PiBbXSk7XG4gICAgY29uc3Qgc2VsZkV4aXRzID0gbmV3IERlZmF1bHRNYXA8Q29ubmVjdGlvblR5cGUsIFNldDxQb3M+PigoKSA9PiBuZXcgU2V0KCkpO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3Qge3R5cGV9IG9mIHNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTp0b3AnICYmIChwb3MgPj4+IDQpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOmxlZnQnICYmIChwb3MgJiAweGYpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgKHBvcyA+Pj4gNCkgPCB0aGlzLmhlaWdodCAtIDEpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6cmlnaHQnICYmIChwb3MgJiAweGYpIDwgdGhpcy53aWR0aCAtIDEpIGNvbnRpbnVlO1xuICAgICAgICBleGl0cy5nZXQodHlwZSkucHVzaChwb3MpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGFyciBvZiBleGl0cy52YWx1ZXMoKSkge1xuICAgICAgcmFuZG9tLnNodWZmbGUoYXJyKTtcbiAgICB9XG4gICAgLy8gRmluZCBhIG1hdGNoIGZvciBlYWNoIG9yaWdpbmFsIGV4aXQuXG4gICAgZm9yIChjb25zdCBbb3BvcywgdHlwZSwgZXhpdF0gb2Ygb3JpZy5fZXhpdHMpIHtcbiAgICAgIGlmIChzZWxmRXhpdHMuZ2V0KHR5cGUpLmhhcyhvcG9zKSkgY29udGludWU7XG4gICAgICAvLyBvcG9zLGV4aXQgZnJvbSBvcmlnaW5hbCB2ZXJzaW9uIG9mIHRoaXMgbWV0YWxvY2F0aW9uXG4gICAgICBjb25zdCBwb3MgPSBleGl0cy5nZXQodHlwZSkucG9wKCk7IC8vIGEgUG9zIGluIHRoaXMgbWV0YWxvY2F0aW9uXG4gICAgICBpZiAocG9zID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgdHJhbnNmZXIgZXhpdCAke3R5cGV9IGluICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfTogbm8gZWxpZ2libGUgc2NyZWVuXFxuJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3coKX1gKTtcbiAgICAgIH1cbiAgICAgIC8vIExvb2sgZm9yIGEgcmV2ZXJzZSBleGl0OiBleGl0IGlzIHRoZSBzcGVjIGZyb20gb2xkIG1ldGEuXG4gICAgICAvLyBGaW5kIHRoZSBtZXRhbG9jYXRpb24gaXQgcmVmZXJzIHRvIGFuZCBzZWUgaWYgdGhlIGV4aXRcbiAgICAgIC8vIGdvZXMgYmFjayB0byB0aGUgb3JpZ2luYWwgcG9zaXRpb24uXG4gICAgICBjb25zdCBlbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2V4aXRbMF0gPj4+IDhdLm1ldGE7XG4gICAgICBjb25zdCBlcG9zID0gZXhpdFswXSAmIDB4ZmY7XG4gICAgICBjb25zdCBldHlwZSA9IGV4aXRbMV07XG4gICAgICBpZiAoZWxvYyA9PT0gb3JpZykge1xuICAgICAgICAvLyBTcGVjaWFsIGNhc2Ugb2YgYSBzZWxmLWV4aXQgKGhhcHBlbnMgaW4gaHlkcmEgYW5kIHB5cmFtaWQpLlxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIGp1c3QgcGljayBhbiBleGl0IG9mIHRoZSBjb3JyZWN0IHR5cGUuXG4gICAgICAgIGNvbnN0IG5wb3MgPSBleGl0cy5nZXQoZXR5cGUpLnBvcCgpO1xuICAgICAgICBpZiAobnBvcyA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGVgKTtcbiAgICAgICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgW3RoaXMuaWQgPDwgOCB8IG5wb3MsIGV0eXBlXSk7XG4gICAgICAgIHRoaXMuX2V4aXRzLnNldChucG9zLCBldHlwZSwgW3RoaXMuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICAgICAgICAvLyBBbHNvIGRvbid0IHZpc2l0IHRoZSBvdGhlciBleGl0IGxhdGVyLlxuICAgICAgICBzZWxmRXhpdHMuZ2V0KGV0eXBlKS5hZGQoZXBvcyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgcmV0ID0gZWxvYy5fZXhpdHMuZ2V0KGVwb3MsIGV0eXBlKSE7XG4gICAgICBpZiAoIXJldCkge1xuICAgICAgICBjb25zdCBlZWxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tleGl0WzBdID4+PiA4XTtcbiAgICAgICAgY29uc29sZS5sb2coZWxvYyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZXhpdCBmb3IgJHtlZWxvY30gYXQgJHtoZXgoZXBvcyl9ICR7ZXR5cGV9XFxuJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBlbG9jLnNob3coKX1cXG4ke3RoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX0gYXQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBoZXgob3Bvcyl9ICR7dHlwZX1cXG4ke3RoaXMuc2hvdygpfWApO1xuICAgICAgfVxuICAgICAgaWYgKChyZXRbMF0gPj4+IDgpID09PSB0aGlzLmlkICYmICgocmV0WzBdICYgMHhmZikgPT09IG9wb3MpICYmXG4gICAgICAgICAgcmV0WzFdID09PSB0eXBlKSB7XG4gICAgICAgIGVsb2MuX2V4aXRzLnNldChlcG9zLCBldHlwZSwgW3RoaXMuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICAgICAgfVxuICAgICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgZXhpdCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIE5QQ3MsIHRyaWdnZXJzLCBhbmQgY2hlc3RzIGJhc2VkIG9uIHByb3hpbWl0eSB0byBzY3JlZW5zLFxuICAgKiBleGl0cywgYW5kIFBPSS5cbiAgICovXG4gIHRyYW5zZmVyU3Bhd25zKHRoYXQ6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBTdGFydCBieSBidWlsZGluZyBhIG1hcCBiZXR3ZWVuIGV4aXRzIGFuZCBzcGVjaWZpYyBzY3JlZW4gdHlwZXMuXG4gICAgY29uc3QgcmV2ZXJzZUV4aXRzID0gbmV3IE1hcDxFeGl0U3BlYywgW251bWJlciwgbnVtYmVyXT4oKTsgLy8gbWFwIHRvIHkseFxuICAgIGNvbnN0IHBpdHMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpOyAvLyBtYXBzIHRvIGRpciAoMCA9IHZlcnQsIDEgPSBob3JpeilcbiAgICBjb25zdCBzdGF0dWVzOiBBcnJheTxbUG9zLCBudW1iZXJdPiA9IFtdOyAvLyBhcnJheSBvZiBzcGF3biBbc2NyZWVuLCBjb29yZF1cbiAgICAvLyBBcnJheSBvZiBbb2xkIHksIG9sZCB4LCBuZXcgeSwgbmV3IHgsIG1heCBkaXN0YW5jZSAoc3F1YXJlZCldXG4gICAgY29uc3QgbWFwOiBBcnJheTxbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IHdhbGxzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IGJyaWRnZXM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgLy8gUGFpciB1cCBhcmVuYXMuXG4gICAgY29uc3QgYXJlbmFzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgbG9jLmFsbFBvcygpKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGxvYy5fc2NyZWVuc1twb3NdO1xuICAgICAgICBjb25zdCB5ID0gcG9zICYgMHhmMDtcbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYpIDw8IDQ7XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncGl0JykgJiYgbG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgcGl0cy5zZXQocG9zLCBzY3IuZWRnZUluZGV4KCdjJykgPT09IDUgPyAwIDogMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2NyLmRhdGEuc3RhdHVlcz8ubGVuZ3RoICYmIGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2NyLmRhdGEuc3RhdHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gc2NyLmRhdGEuc3RhdHVlc1tpXSA8PCAxMjtcbiAgICAgICAgICAgIGNvbnN0IHBhcml0eSA9ICgocG9zICYgMHhmKSBeIChwb3MgPj4+IDQpIF4gaSkgJiAxO1xuICAgICAgICAgICAgY29uc3QgY29sID0gcGFyaXR5ID8gMHg1MCA6IDB4YTA7XG4gICAgICAgICAgICBzdGF0dWVzLnB1c2goW3Bvcywgcm93IHwgY29sXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkge1xuICAgICAgICAgIGlmIChzY3IuZGF0YS53YWxsID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB3YWxsIHByb3BgKTtcbiAgICAgICAgICBjb25zdCB3YWxsID0gW3kgfCAoc2NyLmRhdGEud2FsbCA+PiA0KSwgeCB8IChzY3IuZGF0YS53YWxsICYgMHhmKV07XG4gICAgICAgICAgd2FsbHMucHVzaCh3YWxsIGFzIFtudW1iZXIsIG51bWJlcl0pO1xuICAgICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgXCJkb3VibGUgYnJpZGdlXCIgaW4gbGltZSB0cmVlIGxha2VcbiAgICAgICAgICBpZiAoc2NyLmRhdGEudGlsZXNldHMubGltZSkgd2FsbHMucHVzaChbd2FsbFswXSAtIDEsIHdhbGxbMV1dKTtcbiAgICAgICAgfSBlbHNlIGlmIChsb2MgPT09IHRoaXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAgICAgaWYgKHNjci5kYXRhLndhbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHdhbGwgcHJvcGApO1xuICAgICAgICAgIGJyaWRnZXMucHVzaChbeSB8IChzY3IuZGF0YS53YWxsID4+IDQpLCB4IHwgKHNjci5kYXRhLndhbGwgJiAweGYpXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzY3IuaGFzRmVhdHVyZSgnYXJlbmEnKSkgY29udGludWU7XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBhcmVuYXMucHVzaChbeSB8IDgsIHggfCA4XSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgW255LCBueF0gPSBhcmVuYXMucG9wKCkhO1xuICAgICAgICAgIG1hcC5wdXNoKFt5IHwgOCwgeCB8IDgsIG55LCBueCwgMTQ0XSk7IC8vIDEyIHRpbGVzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChsb2MgPT09IHRoaXMpIHsgLy8gVE9ETyAtIHRoaXMgaXMgYSBtZXNzLCBmYWN0b3Igb3V0IHRoZSBjb21tb25hbGl0eVxuICAgICAgICByYW5kb20uc2h1ZmZsZShhcmVuYXMpO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShzdGF0dWVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gTm93IHBhaXIgdXAgZXhpdHMuXG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIGV4aXRdIG9mIGxvYy5fZXhpdHMpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gbG9jLl9zY3JlZW5zW3Bvc107XG4gICAgICAgIGNvbnN0IHNwZWMgPSBzY3IuZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gdHlwZSk7XG4gICAgICAgIGlmICghc3BlYykgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGV4aXQ6ICR7c2NyLm5hbWV9ICR7dHlwZX1gKTtcbiAgICAgICAgY29uc3QgeDAgPSBwb3MgJiAweGY7XG4gICAgICAgIGNvbnN0IHkwID0gcG9zID4+PiA0O1xuICAgICAgICBjb25zdCB4MSA9IHNwZWMuZXhpdHNbMF0gJiAweGY7XG4gICAgICAgIGNvbnN0IHkxID0gc3BlYy5leGl0c1swXSA+Pj4gNDtcbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIHJldmVyc2VFeGl0cy5zZXQoZXhpdCwgW3kwIDw8IDQgfCB5MSwgeDAgPDwgNCB8IHgxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKGV4aXRbMF0gPj4+IDgpICE9PSB0aGlzLmlkKSB7IC8vIHNraXAgc2VsZi1leGl0c1xuICAgICAgICAgIGNvbnN0IFtueSwgbnhdID0gcmV2ZXJzZUV4aXRzLmdldChleGl0KSE7XG4gICAgICAgICAgbWFwLnB1c2goW3kwIDw8IDQgfCB5MSwgeDAgPDwgNCB8IHgxLCBueSwgbngsIDI1XSk7IC8vIDUgdGlsZXNcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBNYWtlIGEgbGlzdCBvZiBQT0kgYnkgcHJpb3JpdHkgKDAuLjUpLlxuXG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgZmlyc3QgcGFydGl0aW9uaW5nIHRoZSBzY3JlZW5zIHdpdGggaW1wYXNzaWJsZVxuICAgIC8vIHdhbGxzIGFuZCBwbGFjaW5nIHBvaSBpbnRvIGFzIG1hbnkgc2VwYXJhdGUgcGFydGl0aW9ucyAoZnJvbVxuICAgIC8vIHN0YWlycy9lbnRyYW5jZXMpIGFzIHBvc3NpYmxlID8/PyAgT3IgbWF5YmUganVzdCB3ZWlnaHQgdGhvc2VcbiAgICAvLyBoaWdoZXI/ICBkb24ndCB3YW50IHRvIF9mb3JjZV8gdGhpbmdzIHRvIGJlIGluYWNjZXNzaWJsZS4uLj9cblxuICAgIGNvbnN0IHBwb2k6IEFycmF5PEFycmF5PFtudW1iZXIsIG51bWJlcl0+PiA9IFtbXSwgW10sIFtdLCBbXSwgW10sIFtdXTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IFtwLCBkeSA9IDB4NzAsIGR4ID0gMHg3OF0gb2Ygc2NyLmRhdGEucG9pID8/IFtdKSB7XG4gICAgICAgIGNvbnN0IHkgPSAoKHBvcyAmIDB4ZjApIDw8IDQpICsgZHk7XG4gICAgICAgIGNvbnN0IHggPSAoKHBvcyAmIDB4MGYpIDw8IDgpICsgZHg7XG4gICAgICAgIHBwb2lbcF0ucHVzaChbeSwgeF0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBvaSBvZiBwcG9pKSB7XG4gICAgICByYW5kb20uc2h1ZmZsZShwb2kpO1xuICAgIH1cbiAgICBjb25zdCBhbGxQb2kgPSBbLi4uaXRlcnMuY29uY2F0KC4uLnBwb2kpXTtcbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIHNwYXducywgbG9vayBmb3IgTlBDL2NoZXN0L3RyaWdnZXIuXG4gICAgY29uc3QgbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIFxuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgcmFuZG9tLmlzaHVmZmxlKGxvYy5zcGF3bnMpKSB7XG4gICAgICBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBQTEFURk9STVMuaW5kZXhPZihzcGF3bi5tb25zdGVySWQpO1xuICAgICAgICBpZiAocGxhdGZvcm0gPj0gMCAmJiBwaXRzLnNpemUpIHtcbiAgICAgICAgICBjb25zdCBbW3BvcywgZGlyXV0gPSBwaXRzO1xuICAgICAgICAgIHBpdHMuZGVsZXRlKHBvcyk7XG4gICAgICAgICAgc3Bhd24ubW9uc3RlcklkID0gUExBVEZPUk1TW3BsYXRmb3JtICYgMiB8IGRpcl07XG4gICAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zO1xuICAgICAgICAgIHNwYXduLnRpbGUgPSBkaXIgPyAweDczIDogMHg0NztcbiAgICAgICAgfSBlbHNlIGlmIChzcGF3bi5tb25zdGVySWQgPT09IDB4OGYgJiYgc3RhdHVlcy5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBbc2NyZWVuLCBjb29yZF0gPSBzdGF0dWVzLnBvcCgpITtcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSBzY3JlZW47XG4gICAgICAgICAgc3Bhd24uY29vcmQgPSBjb29yZDtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTsgLy8gdGhlc2UgYXJlIGhhbmRsZWQgZWxzZXdoZXJlLlxuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICBjb25zdCB3YWxsID0gKHNwYXduLndhbGxUeXBlKCkgPT09ICdicmlkZ2UnID8gYnJpZGdlcyA6IHdhbGxzKS5wb3AoKTtcbiAgICAgICAgaWYgKCF3YWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoICR7c3Bhd24ud2FsbFR5cGUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBzY3JlZW5zIGluIG5ldyBtZXRhbG9jYXRpb246ICR7bG9jfVxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3coKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBbeSwgeF0gPSB3YWxsO1xuICAgICAgICBzcGF3bi55dCA9IHk7XG4gICAgICAgIHNwYXduLnh0ID0geDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkgfHwgc3Bhd24uaXNCb3NzKCkgfHwgc3Bhd24uaXNUcmlnZ2VyKCkpIHtcbiAgICAgICAgLy9sZXQgaiA9IDA7XG4gICAgICAgIGxldCBiZXN0ID0gWy0xLCAtMSwgSW5maW5pdHldO1xuICAgICAgICBmb3IgKGNvbnN0IFt5MCwgeDAsIHkxLCB4MSwgZG1heF0gb2YgbWFwKSB7XG4gICAgICAgICAgY29uc3QgZCA9IChzcGF3bi55dCAtIHkwKSAqKiAyICsgKHNwYXduLnh0IC0geDApICoqIDI7XG4gICAgICAgICAgaWYgKGQgPD0gZG1heCAmJiBkIDwgYmVzdFsyXSkge1xuICAgICAgICAgICAgYmVzdCA9IFtzcGF3bi55dCArIHkxIC0geTAsIHNwYXduLnh0ICsgeDEgLSB4MCwgZF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUoYmVzdFsyXSkpIHtcbiAgICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIGFueSBOUENzIHdlIGFscmVhZHkgbW92ZWQgc28gdGhhdCBhbnl0aGluZyB0aGF0J3NcbiAgICAgICAgICAvLyBvbiB0b3Agb2YgaXQgKGkuZS4gZHVhbCBzcGF3bnMpIG1vdmUgYWxvbmcgd2l0aC5cbiAgICAgICAgICAvL2lmIChiZXN0WzJdID4gNCkgbWFwLnB1c2goW3NwYXduLnh0LCBzcGF3bi55dCwgYmVzdFswXSwgYmVzdFsxXSwgNF0pO1xuICAgICAgICAgIC8vIC0gVE9ETyAtIEkgZG9uJ3QgdGhpbmsgd2UgbmVlZCB0aGlzLCBzaW5jZSBhbnkgZnV0dXJlIHNwYXduIHNob3VsZFxuICAgICAgICAgIC8vICAgYmUgcGxhY2VkIGJ5IHRoZSBzYW1lIHJ1bGVzLlxuICAgICAgICAgIFtzcGF3bi55dCwgc3Bhd24ueHRdID0gYmVzdDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gV2Fzbid0IGFibGUgdG8gbWFwIGFuIGFyZW5hIG9yIGV4aXQuICBQaWNrIGEgbmV3IFBPSSwgYnV0IHRyaWdnZXJzIGFuZFxuICAgICAgLy8gYm9zc2VzIGFyZSBpbmVsaWdpYmxlLlxuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpIHx8IHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHBsYWNlICR7bG9jfSAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduLmlzQm9zcygpID8gJ0Jvc3MnIDogJ1RyaWdnZXInfSAke3NwYXduLmhleCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiR7dGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXh0ID0gYWxsUG9pLnNoaWZ0KCk7XG4gICAgICBpZiAoIW5leHQpIHRocm93IG5ldyBFcnJvcihgUmFuIG91dCBvZiBQT0kgZm9yICR7bG9jfWApO1xuICAgICAgY29uc3QgW3ksIHhdID0gbmV4dDtcbiAgICAgIG1hcC5wdXNoKFtzcGF3bi55ID4+PiA0LCBzcGF3bi54ID4+PiA0LCB5ID4+PiA0LCB4ID4+PiA0LCA0XSk7XG4gICAgICBzcGF3bi55ID0geTtcbiAgICAgIHNwYXduLnggPSB4O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIHNlYW1sZXNzIHBhaXIgbG9jYXRpb24sIHN5bmMgdXAgdGhlIGV4aXRzLiAgRm9yIGVhY2ggZXhpdCBvZlxuICAgKiBlaXRoZXIsIGNoZWNrIGlmIGl0J3Mgc3ltbWV0cmljLCBhbmQgaWYgc28sIGNvcHkgaXQgb3ZlciB0byB0aGUgb3RoZXIgc2lkZS5cbiAgICovXG4gIHJlY29uY2lsZUV4aXRzKHRoYXQ6IE1ldGFsb2NhdGlvbikge1xuICAgIGNvbnN0IGFkZDogW01ldGFsb2NhdGlvbiwgUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdW10gPSBbXTtcbiAgICBjb25zdCBkZWw6IFtNZXRhbG9jYXRpb24sIFBvcywgQ29ubmVjdGlvblR5cGVdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIGxvYy5fZXhpdHMpIHtcbiAgICAgICAgaWYgKGRlc3RUeXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+PiA4XTtcbiAgICAgICAgY29uc3QgcmV2ZXJzZSA9IGRlc3QubWV0YS5fZXhpdHMuZ2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUpO1xuICAgICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICAgIGNvbnN0IFtyZXZUaWxlLCByZXZUeXBlXSA9IHJldmVyc2U7XG4gICAgICAgICAgaWYgKChyZXZUaWxlID4+PiA4KSA9PT0gbG9jLmlkICYmIChyZXZUaWxlICYgMHhmZikgPT09IHBvcyAmJlxuICAgICAgICAgICAgICByZXZUeXBlID09PSB0eXBlKSB7XG4gICAgICAgICAgICBhZGQucHVzaChbbG9jID09PSB0aGlzID8gdGhhdCA6IHRoaXMsIHBvcywgdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICBbZGVzdFRpbGUsIGRlc3RUeXBlXV0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGRlbC5wdXNoKFtsb2MsIHBvcywgdHlwZV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsb2MsIHBvcywgdHlwZV0gb2YgZGVsKSB7XG4gICAgICBsb2MuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtsb2MsIHBvcywgdHlwZSwgZXhpdF0gb2YgYWRkKSB7XG4gICAgICBsb2MuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgICAvLyB0aGlzLl9leGl0cyA9IG5ldyBUYWJsZShleGl0cyk7XG4gICAgLy8gdGhhdC5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNhdmVzIHRoZSBjdXJyZW50IHN0YXRlIGJhY2sgaW50byB0aGUgdW5kZXJseWluZyBsb2NhdGlvbi5cbiAgICogQ3VycmVudGx5IHRoaXMgb25seSBkZWFscyB3aXRoIGVudHJhbmNlcy9leGl0cy5cbiAgICovXG4gIHdyaXRlKCkge1xuICAgIGNvbnN0IHNyY0xvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICAvL2xldCBzZWFtbGVzc1BhcnRuZXI6IExvY2F0aW9ufHVuZGVmaW5lZDtcbiAgICBjb25zdCBzZWFtbGVzc1BvcyA9IG5ldyBTZXQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgW3NyY1Bvcywgc3JjVHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBjb25zdCBzcmNTY3JlZW4gPSB0aGlzLl9zY3JlZW5zW3NyY1Bvc107XG4gICAgICBjb25zdCBkZXN0ID0gZGVzdFRpbGUgPj4gODtcbiAgICAgIGxldCBkZXN0UG9zID0gZGVzdFRpbGUgJiAweGZmO1xuICAgICAgY29uc3QgZGVzdExvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0XTtcbiAgICAgIGNvbnN0IGRlc3RNZXRhID0gZGVzdExvYy5tZXRhITtcbiAgICAgIGNvbnN0IGRlc3RTY3JlZW4gPSBkZXN0TWV0YS5fc2NyZWVuc1tkZXN0VGlsZSAmIDB4ZmZdO1xuICAgICAgY29uc3Qgc3JjRXhpdCA9IHNyY1NjcmVlbi5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSBzcmNUeXBlKTtcbiAgICAgIGNvbnN0IGRlc3RFeGl0ID0gZGVzdFNjcmVlbi5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSBkZXN0VHlwZSk7XG4gICAgICBpZiAoIXNyY0V4aXQgfHwgIWRlc3RFeGl0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyAke3NyY0V4aXQgPyAnZGVzdCcgOiAnc291cmNlJ30gZXhpdDpcbiAgRnJvbTogJHtzcmNMb2N9IEAgJHtoZXgoc3JjUG9zKX06JHtzcmNUeXBlfSAke3NyY1NjcmVlbi5uYW1lfVxuICBUbzogICAke2Rlc3RMb2N9IEAgJHtoZXgoZGVzdFBvcyl9OiR7ZGVzdFR5cGV9ICR7ZGVzdFNjcmVlbi5uYW1lfWApO1xuICAgICAgfVxuICAgICAgLy8gU2VlIGlmIHRoZSBkZXN0IGVudHJhbmNlIGV4aXN0cyB5ZXQuLi5cbiAgICAgIGxldCBlbnRyYW5jZSA9IDB4MjA7XG4gICAgICBpZiAoZGVzdEV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgIHNlYW1sZXNzUG9zLmFkZChzcmNQb3MpO1xuICAgICAgICAvL3NlYW1sZXNzUGFydG5lciA9IGRlc3RMb2M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgZGVzdENvb3JkID0gZGVzdEV4aXQuZW50cmFuY2U7XG4gICAgICAgIGlmIChkZXN0Q29vcmQgPiAweGVmZmYpIHsgLy8gaGFuZGxlIHNwZWNpYWwgY2FzZSBpbiBPYWtcbiAgICAgICAgICBkZXN0UG9zICs9IDB4MTA7XG4gICAgICAgICAgZGVzdENvb3JkIC09IDB4MTAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZW50cmFuY2UgPSBkZXN0TG9jLmZpbmRPckFkZEVudHJhbmNlKGRlc3RQb3MsIGRlc3RDb29yZCk7XG4gICAgICB9XG4gICAgICBmb3IgKGxldCB0aWxlIG9mIHNyY0V4aXQuZXhpdHMpIHtcbiAgICAgICAgbGV0IHNjcmVlbiA9IHNyY1BvcztcbiAgICAgICAgaWYgKCh0aWxlICYgMHhmMCkgPT09IDB4ZjApIHtcbiAgICAgICAgICBzY3JlZW4gKz0gMHgxMDtcbiAgICAgICAgICB0aWxlICY9IDB4ZjtcbiAgICAgICAgfVxuICAgICAgICAvL2lmIChzcmNFeGl0LnR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgdGhpcy5oZWlnaHQgPT09IDEpIHRpbGUgLT0gMHgyMDtcbiAgICAgICAgc3JjTG9jLmV4aXRzLnB1c2goRXhpdC5vZih7c2NyZWVuLCB0aWxlLCBkZXN0LCBlbnRyYW5jZX0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3JjTG9jLndpZHRoID0gdGhpcy5fd2lkdGg7XG4gICAgc3JjTG9jLmhlaWdodCA9IHRoaXMuX2hlaWdodDtcbiAgICBzcmNMb2Muc2NyZWVucyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5faGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdzogbnVtYmVyW10gPSBbXTtcbiAgICAgIHNyY0xvYy5zY3JlZW5zLnB1c2gocm93KTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fd2lkdGg7IHgrKykge1xuICAgICAgICByb3cucHVzaCh0aGlzLl9zY3JlZW5zW3kgPDwgNCB8IHhdLnNpZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHNyY0xvYy50aWxlc2V0ID0gdGhpcy50aWxlc2V0LnRpbGVzZXRJZDtcbiAgICBzcmNMb2MudGlsZUVmZmVjdHMgPSB0aGlzLnRpbGVzZXQuZWZmZWN0cygpLmlkO1xuXG4gICAgLy8gZmluZCByZWFjaGFibGUgcG9zIGZyb20gYW55IGV4aXRcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGlmIChzZWFtbGVzc1Bvcy5oYXMocG9zKSkgY29udGludWU7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBjb25zdCBiZWxvdyA9IHBvcyArIDE2O1xuICAgICAgY29uc3QgcmlnaHQgPSBwb3MgKyAxO1xuICAgICAgaWYgKCFzZWFtbGVzc1Bvcy5oYXMoYmVsb3cpICYmIChzY3IuZGF0YS5lZGdlcz8uWzJdID8/ICcgJykgIT09ICcgJykge1xuICAgICAgICB1Zi51bmlvbihbcG9zLCBiZWxvd10pO1xuICAgICAgfVxuICAgICAgaWYgKCFzZWFtbGVzc1Bvcy5oYXMocmlnaHQpICYmIChzY3IuZGF0YS5lZGdlcz8uWzNdID8/ICcgJykgIT09ICcgJykge1xuICAgICAgICB1Zi51bmlvbihbcG9zLCByaWdodF0pO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCByZWFjaGFibGVNYXAgPSB1Zi5tYXAoKTtcbiAgICBjb25zdCByZWFjaGFibGUgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IFtzcmNQb3NdIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiByZWFjaGFibGVNYXAuZ2V0KHNyY1BvcykgPz8gW10pIHtcbiAgICAgICAgcmVhY2hhYmxlLmFkZChwb3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdyaXRlIGZsYWdzXG4gICAgc3JjTG9jLmZsYWdzID0gW107XG4gICAgY29uc3QgZnJlZUZsYWdzID0gWy4uLnRoaXMuZnJlZUZsYWdzXTtcbiAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3NjcmVlbl07XG4gICAgICBsZXQgZmxhZzogbnVtYmVyfHVuZGVmaW5lZDtcbiAgICAgIGlmIChzY3IuZGF0YS53YWxsICE9IG51bGwgJiYgcmVhY2hhYmxlLmhhcyhzY3JlZW4pKSB7XG4gICAgICAgIC8vICFzZWFtbGVzc1BhcnRuZXIpIHtcbiAgICAgICAgZmxhZyA9IGZyZWVGbGFncy5wb3AoKT8uaWQgPz8gdGhpcy5yb20uZmxhZ3MuYWxsb2MoMHgyMDApO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2Fsd2F5cycpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY2FsbScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMucm9tLmZsYWdzLkNhbG1lZEFuZ3J5U2VhLmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2N1c3RvbTpmYWxzZScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMuY3VzdG9tRmxhZ3MuZ2V0KHNjcmVlbik/LmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2N1c3RvbTp0cnVlJykge1xuICAgICAgICBmbGFnID0gdGhpcy5jdXN0b21GbGFncy5nZXQoc2NyZWVuKT8uaWQgPz8gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZDtcbiAgICAgIH1cbiAgICAgIGlmIChmbGFnICE9IG51bGwpIHtcbiAgICAgICAgc3JjTG9jLmZsYWdzLnB1c2goTG9jYXRpb25GbGFnLm9mKHtzY3JlZW4sIGZsYWd9KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgcGl0c1xuICAgIHNyY0xvYy5waXRzID0gW107XG4gICAgZm9yIChjb25zdCBbZnJvbVNjcmVlbiwgdG9dIG9mIHRoaXMuX3BpdHMpIHtcbiAgICAgIGNvbnN0IHRvU2NyZWVuID0gdG8gJiAweGZmO1xuICAgICAgY29uc3QgZGVzdCA9IHRvID4+PiA4O1xuICAgICAgc3JjTG9jLnBpdHMucHVzaChQaXQub2Yoe2Zyb21TY3JlZW4sIHRvU2NyZWVuLCBkZXN0fSkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5PVEU6IHRoaXMgY2FuIG9ubHkgYmUgZG9uZSBBRlRFUiBjb3B5aW5nIHRvIHRoZSBsb2NhdGlvbiFcbiAgcmVwbGFjZU1vbnN0ZXJzKHJhbmRvbTogUmFuZG9tKSB7XG4gICAgaWYgKHRoaXMuaWQgPT09IDB4NjgpIHJldHVybjsgLy8gd2F0ZXIgbGV2ZWxzLCBkb24ndCBwbGFjZSBvbiBsYW5kPz8/XG4gICAgLy8gTW92ZSBhbGwgdGhlIG1vbnN0ZXJzIHRvIHJlYXNvbmFibGUgbG9jYXRpb25zLlxuICAgIGNvbnN0IGxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBjb25zdCBwbGFjZXIgPSBsb2MubW9uc3RlclBsYWNlcihyYW5kb20pO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jLnNwYXducykge1xuICAgICAgaWYgKCFzcGF3bi51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmICghc3Bhd24uaXNNb25zdGVyKCkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbW9uc3RlciA9IGxvYy5yb20ub2JqZWN0c1tzcGF3bi5tb25zdGVySWRdO1xuICAgICAgaWYgKCEobW9uc3RlciBpbnN0YW5jZW9mIE1vbnN0ZXIpKSBjb250aW51ZTtcbiAgICAgIGlmIChtb25zdGVyLmlzVW50b3VjaGVkTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHBvcyA9IHBsYWNlcihtb25zdGVyKTtcbiAgICAgIGlmIChwb3MgPT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBubyB2YWxpZCBsb2NhdGlvbiBmb3IgJHtoZXgobW9uc3Rlci5pZCl9IGluICR7bG9jfWApO1xuICAgICAgICBzcGF3bi51c2VkID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGF3bi5zY3JlZW4gPSBwb3MgPj4+IDg7XG4gICAgICAgIHNwYXduLnRpbGUgPSBwb3MgJiAweGZmO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgVHJhdmVyc2VPcHRzIHtcbiAgLy8gRG8gbm90IHBhc3MgY2VydGFpbiB0aWxlcyBpbiB0cmF2ZXJzZVxuICByZWFkb25seSB3aXRoPzogUmVhZG9ubHlNYXA8UG9zLCBNZXRhc2NyZWVuPjtcbiAgLy8gV2hldGhlciB0byBicmVhayB3YWxscy9mb3JtIGJyaWRnZXNcbiAgcmVhZG9ubHkgbm9GbGFnZ2VkPzogYm9vbGVhbjtcbiAgLy8gV2hldGhlciB0byBhc3N1bWUgZmxpZ2h0XG4gIHJlYWRvbmx5IGZsaWdodD86IGJvb2xlYW47XG59XG5cblxuY29uc3QgdW5rbm93bkV4aXRXaGl0ZWxpc3QgPSBuZXcgU2V0KFtcbiAgMHgwMTAwM2EsIC8vIHRvcCBwYXJ0IG9mIGNhdmUgb3V0c2lkZSBzdGFydFxuICAweDAxMDAzYixcbiAgMHgxNTQwYTAsIC8vIFwiIFwiIHNlYW1sZXNzIGVxdWl2YWxlbnQgXCIgXCJcbiAgMHgxYTMwNjAsIC8vIHN3YW1wIGV4aXRcbiAgMHg0MDIwMDAsIC8vIGJyaWRnZSB0byBmaXNoZXJtYW4gaXNsYW5kXG4gIDB4NDAyMDMwLFxuICAweDQxODBkMCwgLy8gYmVsb3cgZXhpdCB0byBsaW1lIHRyZWUgdmFsbGV5XG4gIDB4NjA4N2JmLCAvLyBiZWxvdyBib2F0IGNoYW5uZWxcbiAgMHhhMTAzMjYsIC8vIGNyeXB0IDIgYXJlbmEgbm9ydGggZWRnZVxuICAweGExMDMyOSxcbiAgMHhhOTA2MjYsIC8vIHN0YWlycyBhYm92ZSBrZWxieSAyXG4gIDB4YTkwNjI5LFxuXSk7XG5cbi8vY29uc3QgRFBPUyA9IFstMTYsIC0xLCAxNiwgMV07XG5jb25zdCBESVJfTkFNRSA9IFsnYWJvdmUnLCAnbGVmdCBvZicsICdiZWxvdycsICdyaWdodCBvZiddO1xuXG50eXBlIE9wdGlvbmFsPFQ+ID0gVHxudWxsfHVuZGVmaW5lZDtcblxuZnVuY3Rpb24gZGlzdGFuY2UoYTogUG9zLCBiOiBQb3MpOiBudW1iZXIge1xuICByZXR1cm4gKChhID4+PiA0KSAtIChiID4+PiA0KSkgKiogMiArICgoYSAmIDB4ZikgLSAoYiAmIDB4ZikpICoqIDI7XG59XG5cbmZ1bmN0aW9uIGFkZERlbHRhKHN0YXJ0OiBQb3MsIHBsdXM6IFBvcywgbWludXM6IFBvcywgbWV0YTogTWV0YWxvY2F0aW9uKTogUG9zIHtcbiAgY29uc3QgcHggPSBwbHVzICYgMHhmO1xuICBjb25zdCBweSA9IHBsdXMgPj4+IDQ7XG4gIGNvbnN0IG14ID0gbWludXMgJiAweGY7XG4gIGNvbnN0IG15ID0gbWludXMgPj4+IDQ7XG4gIGNvbnN0IHN4ID0gc3RhcnQgJiAweGY7XG4gIGNvbnN0IHN5ID0gc3RhcnQgPj4+IDQ7XG4gIGNvbnN0IG94ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obWV0YS53aWR0aCAtIDEsIHN4ICsgcHggLSBteCkpO1xuICBjb25zdCBveSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1ldGEuaGVpZ2h0IC0gMSwgc3kgKyBweSAtIG15KSk7XG4gIHJldHVybiBveSA8PCA0IHwgb3g7XG59XG5cbi8vIGJpdCAxID0gY3J1bWJsaW5nLCBiaXQgMCA9IGhvcml6b250YWw6IFt2LCBoLCBjdiwgY2hdXG5jb25zdCBQTEFURk9STVM6IHJlYWRvbmx5IG51bWJlcltdID0gWzB4N2UsIDB4N2YsIDB4OWYsIDB4OGRdO1xuIl19