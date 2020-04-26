import { Exit, Flag as LocationFlag } from './locationtables.js';
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
        const metaloc = new Metalocation(location.id, tileset, height, width);
        metaloc._screens = screens;
        metaloc._exits = exits;
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
        var _a, _b;
        const reverseExits = new Map();
        const map = [];
        const walls = [];
        const bridges = [];
        const arenas = [];
        for (const loc of [this, that]) {
            for (const pos of loc.allPos()) {
                const scr = loc._screens[pos];
                const y = pos & 0xf0;
                const x = (pos & 0xf) << 4;
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
            if (loc === this)
                random.shuffle(arenas);
        }
        for (const loc of [this, that]) {
            for (const [pos, type, exit] of loc._exits) {
                const scr = loc._screens[pos];
                const spec = (_a = scr.data.exits) === null || _a === void 0 ? void 0 : _a.find(e => e.type === type);
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
            for (const [p, dy = 0x70, dx = 0x78] of (_b = scr.data.poi) !== null && _b !== void 0 ? _b : []) {
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
    }
    replaceMonsters(random) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFJL0QsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUU5QixPQUFPLEVBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQzVELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUcxQyxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBRXJDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFzQ2pCLE1BQU0sT0FBTyxZQUFZO0lBZ0N2QixZQUFxQixFQUFVLEVBQVcsT0FBb0IsRUFDbEQsTUFBYyxFQUFFLEtBQWE7UUFEcEIsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUFXLFlBQU8sR0FBUCxPQUFPLENBQWE7UUExQjlELGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUNuQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVEsQ0FBQztRQU9wQixTQUFJLEdBQW9CLFNBQVMsQ0FBQztRQUVsQyxXQUFNLEdBQUcsSUFBSSxLQUFLLEVBQWlDLENBQUM7UUFrQjFELElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FB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RyxLQUFLLENBQUMsQ0FBQztnQkFDekIsS0FBSyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO2FBQ3pCO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUFZRCxNQUFNLG9CQUFvQixHQUFHLElBQUksR0FBRyxDQUFDO0lBQ25DLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtDQUNULENBQUMsQ0FBQztBQUdILE1BQU0sUUFBUSxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0xvY2F0aW9ufSBmcm9tICcuL2xvY2F0aW9uLmpzJzsgLy8gaW1wb3J0IHR5cGVcbmltcG9ydCB7RXhpdCwgRmxhZyBhcyBMb2NhdGlvbkZsYWd9IGZyb20gJy4vbG9jYXRpb250YWJsZXMuanMnO1xuaW1wb3J0IHtGbGFnfSBmcm9tICcuL2ZsYWdzLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbiwgVWlkfSBmcm9tICcuL21ldGFzY3JlZW4uanMnO1xuaW1wb3J0IHtNZXRhdGlsZXNldH0gZnJvbSAnLi9tZXRhdGlsZXNldC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwLCBUYWJsZSwgaXRlcnMsIGZvcm1hdH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7Q29ubmVjdGlvblR5cGV9IGZyb20gJy4vbWV0YXNjcmVlbmRhdGEuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQge01vbnN0ZXJ9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbi8vIE1vZGVsIG9mIGEgbG9jYXRpb24gd2l0aCBtZXRhc2NyZWVucywgZXRjLlxuXG4vLyBUcmljazogd2UgbmVlZCBzb21ldGhpbmcgdG8gb3duIHRoZSBuZWlnaGJvciBjYWNoZS5cbi8vICAtIHByb2JhYmx5IHRoaXMgYmVsb25ncyBpbiB0aGUgTWV0YXRpbGVzZXQuXG4vLyAgLSBtZXRob2QgdG8gcmVnZW5lcmF0ZSwgZG8gaXQgYWZ0ZXIgdGhlIHNjcmVlbiBtb2RzP1xuLy8gRGF0YSB3ZSB3YW50IHRvIGtlZXAgdHJhY2sgb2Y6XG4vLyAgLSBnaXZlbiB0d28gc2NyZWVucyBhbmQgYSBkaXJlY3Rpb24sIGNhbiB0aGV5IGFidXQ/XG4vLyAgLSBnaXZlbiBhIHNjcmVlbiBhbmQgYSBkaXJlY3Rpb24sIHdoYXQgc2NyZWVucyBvcGVuL2Nsb3NlIHRoYXQgZWRnZT9cbi8vICAgIC0gd2hpY2ggb25lIGlzIHRoZSBcImRlZmF1bHRcIj9cblxuLy8gVE9ETyAtIGNvbnNpZGVyIGFic3RyYWN0aW5nIGV4aXRzIGhlcmU/XG4vLyAgLSBleGl0czogQXJyYXk8W0V4aXRTcGVjLCBudW1iZXIsIEV4aXRTcGVjXT5cbi8vICAtIEV4aXRTcGVjID0ge3R5cGU/OiBDb25uZWN0aW9uVHlwZSwgc2NyPzogbnVtYmVyfVxuLy8gSG93IHRvIGhhbmRsZSBjb25uZWN0aW5nIHRoZW0gY29ycmVjdGx5P1xuLy8gIC0gc2ltcGx5IHNheWluZyBcIi0+IHdhdGVyZmFsbCB2YWxsZXkgY2F2ZVwiIGlzIG5vdCBoZWxwZnVsIHNpbmNlIHRoZXJlJ3MgMlxuLy8gICAgb3IgXCItPiB3aW5kIHZhbGxleSBjYXZlXCIgd2hlbiB0aGVyZSdzIDUuXG4vLyAgLSB1c2Ugc2NySWQgYXMgdW5pcXVlIGlkZW50aWZpZXI/ICBvbmx5IHByb2JsZW0gaXMgc2VhbGVkIGNhdmUgaGFzIDMuLi5cbi8vICAtIG1vdmUgdG8gZGlmZmVyZW50IHNjcmVlbiBhcyBuZWNlc3NhcnkuLi5cbi8vICAgIChjb3VsZCBhbHNvIGp1c3QgZGl0Y2ggdGhlIG90aGVyIHR3byBhbmQgdHJlYXQgd2luZG1pbGwgZW50cmFuY2UgYXNcbi8vICAgICBhIGRvd24gZW50cmFuY2UgLSBzYW1lIHcvIGxpZ2h0aG91c2U/KVxuLy8gIC0gb25seSBhIHNtYWxsIGhhbmRmdWxsIG9mIGxvY2F0aW9ucyBoYXZlIGRpc2Nvbm5lY3RlZCBjb21wb25lbnRzOlxuLy8gICAgICB3aW5kbWlsbCwgbGlnaHRob3VzZSwgcHlyYW1pZCwgZ29hIGJhY2tkb29yLCBzYWJlcmEsIHNhYnJlL2h5ZHJhIGxlZGdlc1xuLy8gIC0gd2UgcmVhbGx5IGRvIGNhcmUgd2hpY2ggaXMgaW4gd2hpY2ggY29tcG9uZW50LlxuLy8gICAgYnV0IG1hcCBlZGl0cyBtYXkgY2hhbmdlIGV2ZW4gdGhlIG51bWJlciBvZiBjb21wb25lbnRzPz8/XG4vLyAgLSBkbyB3ZSBkbyBlbnRyYW5jZSBzaHVmZmxlIGZpcnN0IG9yIG1hcCBzaHVmZmxlIGZpcnN0P1xuLy8gICAgb3IgYXJlIHRoZXkgaW50ZXJsZWF2ZWQ/IT9cbi8vICAgIGlmIHdlIHNodWZmbGUgc2FicmUgb3ZlcndvcmxkIHRoZW4gd2UgbmVlZCB0byBrbm93IHdoaWNoIGNhdmVzIGNvbm5lY3Rcbi8vICAgIHRvIHdoaWNoLi4uIGFuZCBwb3NzaWJseSBjaGFuZ2UgdGhlIGNvbm5lY3Rpb25zP1xuLy8gICAgLSBtYXkgbmVlZCBsZWV3YXkgdG8gYWRkL3N1YnRyYWN0IGNhdmUgZXhpdHM/P1xuLy8gUHJvYmxlbSBpcyB0aGF0IGVhY2ggZXhpdCBpcyBjby1vd25lZCBieSB0d28gbWV0YWxvY2F0aW9ucy5cblxuXG5leHBvcnQgdHlwZSBQb3MgPSBudW1iZXI7XG5leHBvcnQgdHlwZSBMb2NQb3MgPSBudW1iZXI7IC8vIGxvY2F0aW9uIDw8IDggfCBwb3NcbmV4cG9ydCB0eXBlIEV4aXRTcGVjID0gcmVhZG9ubHkgW0xvY1BvcywgQ29ubmVjdGlvblR5cGVdO1xuXG5leHBvcnQgY2xhc3MgTWV0YWxvY2F0aW9uIHtcblxuICAvLyBUT0RPIC0gc3RvcmUgbWV0YWRhdGEgYWJvdXQgd2luZG1pbGwgZmxhZz8gIHR3byBtZXRhbG9jcyB3aWxsIG5lZWQgYSBwb3MgdG9cbiAgLy8gaW5kaWNhdGUgd2hlcmUgdGhhdCBmbGFnIHNob3VsZCBnby4uLj8gIE9yIHN0b3JlIGl0IGluIHRoZSBtZXRhc2NyZWVuP1xuXG4gIC8vIENhdmVzIGFyZSBhc3N1bWVkIHRvIGJlIGFsd2F5cyBvcGVuIHVubGVzcyB0aGVyZSdzIGEgZmxhZyBzZXQgaGVyZS4uLlxuICBjdXN0b21GbGFncyA9IG5ldyBNYXA8UG9zLCBGbGFnPigpO1xuICBmcmVlRmxhZ3MgPSBuZXcgU2V0PEZsYWc+KCk7XG5cbiAgcmVhZG9ubHkgcm9tOiBSb207XG5cbiAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gIHByaXZhdGUgX3dpZHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBfcG9zOiBQb3NbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgcHJpdmF0ZSBfZXhpdHMgPSBuZXcgVGFibGU8UG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWM+KCk7XG5cbiAgLy9wcml2YXRlIF9tb25zdGVyc0ludmFsaWRhdGVkID0gZmFsc2U7XG5cbiAgLyoqIEtleTogKHk8PDQpfHggKi9cbiAgcHJpdmF0ZSBfc2NyZWVuczogTWV0YXNjcmVlbltdO1xuXG4gIC8vIE5PVEU6IGtlZXBpbmcgdHJhY2sgb2YgcmVhY2hhYmlsaXR5IGlzIGltcG9ydGFudCBiZWNhdXNlIHdoZW4gd2VcbiAgLy8gZG8gdGhlIHN1cnZleSB3ZSBuZWVkIHRvIG9ubHkgY291bnQgUkVBQ0hBQkxFIHRpbGVzISAgU2VhbWxlc3NcbiAgLy8gcGFpcnMgYW5kIGJyaWRnZXMgY2FuIGNhdXNlIGxvdHMgb2YgaW1wb3J0YW50LXRvLXJldGFpbiB1bnJlYWNoYWJsZVxuICAvLyB0aWxlcy4gIE1vcmVvdmVyLCBzb21lIGRlYWQtZW5kIHRpbGVzIGNhbid0IGFjdHVhbGx5IGJlIHdhbGtlZCBvbi5cbiAgLy8gRm9yIG5vdyB3ZSdsbCBqdXN0IHplcm8gb3V0IGZlYXR1cmUgbWV0YXNjcmVlbnMgdGhhdCBhcmVuJ3RcbiAgLy8gcmVhY2hhYmxlLCBzaW5jZSB0cnlpbmcgdG8gZG8gaXQgY29ycmVjdGx5IHJlcXVpcmVzIHN0b3JpbmdcbiAgLy8gcmVhY2hhYmlsaXR5IGF0IHRoZSB0aWxlIGxldmVsIChhZ2FpbiBkdWUgdG8gYnJpZGdlIGRvdWJsZSBzdGFpcnMpLlxuICAvLyBwcml2YXRlIF9yZWFjaGFibGU6IFVpbnQ4QXJyYXl8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGlkOiBudW1iZXIsIHJlYWRvbmx5IHRpbGVzZXQ6IE1ldGF0aWxlc2V0LFxuICAgICAgICAgICAgICBoZWlnaHQ6IG51bWJlciwgd2lkdGg6IG51bWJlcikge1xuICAgIHRoaXMucm9tID0gdGlsZXNldC5yb207XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuX3dpZHRoID0gd2lkdGg7XG4gICAgdGhpcy5fc2NyZWVucyA9IG5ldyBBcnJheShoZWlnaHQgPDwgNCkuZmlsbCh0aWxlc2V0LmVtcHR5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBvdXQgYSBtZXRhbG9jYXRpb24gZnJvbSB0aGUgZ2l2ZW4gbG9jYXRpb24uICBJbmZlciB0aGVcbiAgICogdGlsZXNldCBpZiBwb3NzaWJsZSwgb3RoZXJ3aXNlIGl0IG11c3QgYmUgZXhwbGljaXRseSBzcGVjaWZpZWQuXG4gICAqL1xuICBzdGF0aWMgb2YobG9jYXRpb246IExvY2F0aW9uLCB0aWxlc2V0PzogTWV0YXRpbGVzZXQpOiBNZXRhbG9jYXRpb24ge1xuICAgIGNvbnN0IHtyb20sIHdpZHRoLCBoZWlnaHR9ID0gbG9jYXRpb247XG4gICAgaWYgKCF0aWxlc2V0KSB7XG4gICAgICAvLyBJbmZlciB0aGUgdGlsZXNldC4gIFN0YXJ0IGJ5IGFkZGluZyBhbGwgY29tcGF0aWJsZSBtZXRhdGlsZXNldHMuXG4gICAgICBjb25zdCB7Zm9ydHJlc3MsIGxhYnlyaW50aH0gPSByb20ubWV0YXRpbGVzZXRzO1xuICAgICAgY29uc3QgdGlsZXNldHMgPSBuZXcgU2V0PE1ldGF0aWxlc2V0PigpO1xuICAgICAgZm9yIChjb25zdCB0cyBvZiByb20ubWV0YXRpbGVzZXRzKSB7XG4gICAgICAgIGlmIChsb2NhdGlvbi50aWxlc2V0ID09PSB0cy50aWxlc2V0LmlkKSB0aWxlc2V0cy5hZGQodHMpO1xuICAgICAgfVxuICAgICAgLy8gSXQncyBpbXBvc3NpYmxlIHRvIGRpc3Rpbmd1aXNoIGZvcnRyZXNzIGFuZCBsYWJ5cmludGgsIHNvIHdlIGhhcmRjb2RlXG4gICAgICAvLyBpdCBiYXNlZCBvbiBsb2NhdGlvbjogb25seSAkYTkgaXMgbGFieXJpbnRoLlxuICAgICAgdGlsZXNldHMuZGVsZXRlKGxvY2F0aW9uLmlkID09PSAweGE5ID8gZm9ydHJlc3MgOiBsYWJ5cmludGgpO1xuICAgICAgLy8gRmlsdGVyIG91dCBhbnkgdGlsZXNldHMgdGhhdCBkb24ndCBpbmNsdWRlIG5lY2Vzc2FyeSBzY3JlZW4gaWRzLlxuICAgICAgZm9yIChjb25zdCBzY3JlZW4gb2YgbmV3IFNldChpdGVycy5jb25jYXQoLi4ubG9jYXRpb24uc2NyZWVucykpKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGlsZXNldCBvZiB0aWxlc2V0cykge1xuICAgICAgICAgIGlmICghdGlsZXNldC5nZXRNZXRhc2NyZWVucyhzY3JlZW4pLmxlbmd0aCkgdGlsZXNldHMuZGVsZXRlKHRpbGVzZXQpO1xuICAgICAgICAgIGlmICghdGlsZXNldHMuc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB0aWxlc2V0IGZvciAke2hleChzY3JlZW4pfSBpbiAke2xvY2F0aW9ufWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHRpbGVzZXRzLnNpemUgIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tdW5pcXVlIHRpbGVzZXQgZm9yICR7bG9jYXRpb259OiBbJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5mcm9tKHRpbGVzZXRzLCB0ID0+IHQubmFtZSkuam9pbignLCAnKX1dYCk7XG4gICAgICB9XG4gICAgICB0aWxlc2V0ID0gWy4uLnRpbGVzZXRzXVswXTtcbiAgICB9XG5cbiAgICAvLyBUcmF2ZXJzZSB0aGUgbG9jYXRpb24gZm9yIGFsbCB0aWxlcyByZWFjaGFibGUgZnJvbSBhbiBlbnRyYW5jZS5cbiAgICAvLyBUaGlzIGlzIHVzZWQgdG8gaW5mb3JtIHdoaWNoIG1ldGFzY3JlZW4gdG8gc2VsZWN0IGZvciBzb21lIG9mIHRoZVxuICAgIC8vIHJlZHVuZGFudCBvbmVzIChpLmUuIGRvdWJsZSBkZWFkIGVuZHMpLiAgVGhpcyBpcyBhIHNpbXBsZSB0cmF2ZXJzYWxcbiAgICBjb25zdCByZWFjaGFibGUgPSBsb2NhdGlvbi5yZWFjaGFibGVUaWxlcyh0cnVlKTsgLy8gdHJhdmVyc2VSZWFjaGFibGUoMHgwNCk7XG4gICAgY29uc3QgcmVhY2hhYmxlU2NyZWVucyA9IG5ldyBTZXQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiByZWFjaGFibGUua2V5cygpKSB7XG4gICAgICByZWFjaGFibGVTY3JlZW5zLmFkZCh0aWxlID4+PiA4KTtcbiAgICAgIC8vcmVhY2hhYmxlU2NyZWVucy5hZGQoKHRpbGUgJiAweGYwMDApID4+PiA4IHwgKHRpbGUgJiAweGYwKSA+Pj4gNCk7XG4gICAgfVxuICAgIC8vIE5PVEU6IHNvbWUgZW50cmFuY2VzIGFyZSBvbiBpbXBhc3NhYmxlIHRpbGVzIGJ1dCB3ZSBzdGlsbCBjYXJlIGFib3V0XG4gICAgLy8gdGhlIHNjcmVlbnMgdW5kZXIgdGhlbSAoZS5nLiBib2F0IGFuZCBzaG9wIGVudHJhbmNlcykuICBBbHNvIG1ha2Ugc3VyZVxuICAgIC8vIHRvIGhhbmRsZSB0aGUgc2VhbWxlc3MgdG93ZXIgZXhpdHMuXG4gICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiBsb2NhdGlvbi5lbnRyYW5jZXMpIHtcbiAgICAgIHJlYWNoYWJsZVNjcmVlbnMuYWRkKGVudHJhbmNlLnNjcmVlbik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgcmVhY2hhYmxlU2NyZWVucy5hZGQoZXhpdC5zY3JlZW4pO1xuICAgIH1cbiAgICAvL2NvbnN0IGV4aXQgPSB0aWxlc2V0LmV4aXQ7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBBcnJheTxNZXRhc2NyZWVuPihoZWlnaHQgPDwgNCkuZmlsbCh0aWxlc2V0LmVtcHR5KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3QgdDAgPSB5IDw8IDQgfCB4O1xuICAgICAgICBjb25zdCBtZXRhc2NyZWVucyA9IHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMobG9jYXRpb24uc2NyZWVuc1t5XVt4XSk7XG4gICAgICAgIGxldCBtZXRhc2NyZWVuOiBNZXRhc2NyZWVufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG1ldGFzY3JlZW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIG1ldGFzY3JlZW4gPSBtZXRhc2NyZWVuc1swXTtcbiAgICAgICAgfSBlbHNlIGlmICghbWV0YXNjcmVlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbXBvc3NpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVE9PRCAtIGZpbHRlciBiYXNlZCBvbiB3aG8gaGFzIGEgbWF0Y2ggZnVuY3Rpb24sIG9yIG1hdGNoaW5nIGZsYWdzXG4gICAgICAgICAgY29uc3QgZmxhZyA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gKCh5IDw8IDQpIHwgeCkpO1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXJzOiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICAgICAgICBjb25zdCBiZXN0OiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWV0YXNjcmVlbnMpIHtcbiAgICAgICAgICAgIGlmIChzLmRhdGEubWF0Y2gpIHtcbiAgICAgICAgICAgICAgbWF0Y2hlcnMucHVzaChzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocy5mbGFnID09PSAnYWx3YXlzJyAmJiBmbGFnPy5mbGFnID09PSAweDJmZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAhcy5mbGFnICYmICFzLmRhdGEud2FsbCAmJiAhZmxhZykge1xuICAgICAgICAgICAgICBiZXN0LnVuc2hpZnQocyk7IC8vIGZyb250LWxvYWQgbWF0Y2hpbmcgZmxhZ3NcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGJlc3QucHVzaChzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1hdGNoZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZnVuY3Rpb24gcmVhY2goZHk6IG51bWJlciwgZHg6IG51bWJlcikge1xuICAgICAgICAgICAgICBjb25zdCB4MCA9ICh4IDw8IDgpICsgZHg7XG4gICAgICAgICAgICAgIGNvbnN0IHkwID0gKHkgPDwgOCkgKyBkeTtcbiAgICAgICAgICAgICAgY29uc3QgdCA9XG4gICAgICAgICAgICAgICAgICAoeTAgPDwgNCkgJiAweGYwMDAgfCB4MCAmIDB4ZjAwIHwgeTAgJiAweGYwIHwgKHgwID4+IDQpICYgMHhmO1xuICAgICAgICAgICAgICByZXR1cm4gcmVhY2hhYmxlLmhhcyh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgbWF0Y2hlciBvZiBtYXRjaGVycykge1xuICAgICAgICAgICAgICBpZiAoIW1hdGNoZXIuZGF0YS5tYXRjaCEocmVhY2gsIGZsYWcgIT0gbnVsbCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICBtZXRhc2NyZWVuID0gbWF0Y2hlcjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghbWV0YXNjcmVlbikgbWV0YXNjcmVlbiA9IGJlc3RbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtZXRhc2NyZWVuKSB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGUnKTtcbiAgICAgICAgLy8gaWYgKChtZXRhc2NyZWVuLmRhdGEuZXhpdHMgfHwgbWV0YXNjcmVlbi5kYXRhLndhbGwpICYmXG4gICAgICAgIC8vICAgICAhcmVhY2hhYmxlU2NyZWVucy5oYXModDApICYmXG4gICAgICAgIC8vICAgICB0aWxlc2V0ICE9PSByb20ubWV0YXRpbGVzZXRzLnRvd2VyKSB7XG4gICAgICAgIC8vICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHN1cnZleSB1bnJlYWNoYWJsZSBzY3JlZW5zIChhbmQgaXQncyBoYXJkIHRvXG4gICAgICAgIC8vICAgLy8gdG8gZmlndXJlIG91dCB3aGljaCBpcyB3aGljaCBsYXRlcikuICBNYWtlIHN1cmUgbm90IHRvIGRvIHRoaXMgZm9yXG4gICAgICAgIC8vICAgLy8gdG93ZXIgYmVjYXVzZSBvdGhlcndpc2UgaXQnbGwgY2xvYmJlciBpbXBvcnRhbnQgcGFydHMgb2YgdGhlIG1hcC5cbiAgICAgICAgLy8gICBtZXRhc2NyZWVuID0gdGlsZXNldC5lbXB0eTtcbiAgICAgICAgLy8gfVxuICAgICAgICBzY3JlZW5zW3QwXSA9IG1ldGFzY3JlZW47XG4gICAgICAgIC8vIC8vIElmIHdlJ3JlIG9uIHRoZSBib3JkZXIgYW5kIGl0J3MgYW4gZWRnZSBleGl0IHRoZW4gY2hhbmdlIHRoZSBib3JkZXJcbiAgICAgICAgLy8gLy8gc2NyZWVuIHRvIHJlZmxlY3QgYW4gZXhpdC5cbiAgICAgICAgLy8gY29uc3QgZWRnZXMgPSBtZXRhc2NyZWVuLmVkZ2VFeGl0cygpO1xuICAgICAgICAvLyBpZiAoeSA9PT0gMCAmJiAoZWRnZXMgJiAxKSkgc2NyZWVuc1t0MCAtIDE2XSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh4ID09PSAwICYmIChlZGdlcyAmIDIpKSBzY3JlZW5zW3QwIC0gMV0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeSA9PT0gaGVpZ2h0ICYmIChlZGdlcyAmIDQpKSBzY3JlZW5zW3QwICsgMTZdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHggPT09IHdpZHRoICYmIChlZGdlcyAmIDgpKSBzY3JlZW5zW3QwICsgMV0gPSBleGl0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgZXhpdHNcbiAgICBjb25zdCBleGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHNyY1BvcyA9IGV4aXQuc2NyZWVuO1xuICAgICAgaWYgKCFyZWFjaGFibGVTY3JlZW5zLmhhcyhzcmNQb3MpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHNjcmVlbnNbc3JjUG9zXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZmluZEV4aXRUeXBlKGV4aXQudGlsZSwgaGVpZ2h0ID09PSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgISEoZXhpdC5lbnRyYW5jZSAmIDB4MjApKTtcbiAgICAgIGNvbnN0IHNyY1R5cGUgPSBzcmNFeGl0Py50eXBlO1xuICAgICAgaWYgKCFzcmNUeXBlKSB7XG4gICAgICAgIGNvbnN0IGlkID0gbG9jYXRpb24uaWQgPDwgMTYgfCBzcmNQb3MgPDwgOCB8IGV4aXQudGlsZTtcbiAgICAgICAgaWYgKHVua25vd25FeGl0V2hpdGVsaXN0LmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBhbGwgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8ubWFwKFxuICAgICAgICAgICAgZSA9PiBlLnR5cGUgKyAnOiAnICsgZS5leGl0cy5tYXAoaGV4KS5qb2luKCcsICcpKS5qb2luKCdcXG4gICcpO1xuICAgICAgICBjb25zb2xlLndhcm4oYFVua25vd24gZXhpdCAke2hleChleGl0LnRpbGUpfTogJHtzcmNTY3JlZW4ubmFtZX0gaW4gJHtcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbn0gQCAke2hleChzcmNQb3MpfTpcXG4gICR7YWxsfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChleGl0cy5oYXMoc3JjUG9zLCBzcmNUeXBlKSkgY29udGludWU7IC8vIGFscmVhZHkgaGFuZGxlZFxuICAgICAgY29uc3QgZGVzdCA9IHJvbS5sb2NhdGlvbnNbZXhpdC5kZXN0XTtcbiAgICAgIGlmIChzcmNUeXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgY29uc3QgZG93biA9IHNyY1R5cGUgPT09ICdzZWFtbGVzczpkb3duJztcbiAgICAgICAgLy8gTk9URTogdGhpcyBzZWVtcyB3cm9uZyAtIHRoZSBkb3duIGV4aXQgaXMgQkVMT1cgdGhlIHVwIGV4aXQuLi4/XG4gICAgICAgIGNvbnN0IHRpbGUgPSBzcmNFeGl0IS5leGl0c1swXSArIChkb3duID8gLTE2IDogMTYpO1xuICAgICAgICBjb25zdCBkZXN0UG9zID0gc3JjUG9zICsgKHRpbGUgPCAwID8gLTE2IDogdGlsZSA+PSAweGYwID8gMTYgOiAtMCk7XG4gICAgICAgIGNvbnN0IGRlc3RUeXBlID0gZG93biA/ICdzZWFtbGVzczp1cCcgOiAnc2VhbWxlc3M6ZG93bic7XG4gICAgICAgIC8vY29uc29sZS5sb2coYCR7c3JjVHlwZX0gJHtoZXgobG9jYXRpb24uaWQpfSAke2Rvd259ICR7aGV4KHRpbGUpfSAke2hleChkZXN0UG9zKX0gJHtkZXN0VHlwZX0gJHtoZXgoZGVzdC5pZCl9YCk7XG4gICAgICAgIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGVudHJhbmNlID0gZGVzdC5lbnRyYW5jZXNbZXhpdC5lbnRyYW5jZSAmIDB4MWZdO1xuICAgICAgbGV0IGRlc3RQb3MgPSBlbnRyYW5jZS5zY3JlZW47XG4gICAgICBsZXQgZGVzdENvb3JkID0gZW50cmFuY2UuY29vcmQ7XG4gICAgICBpZiAoc3JjVHlwZSA9PT0gJ2Rvb3InICYmIChlbnRyYW5jZS55ICYgMHhmMCkgPT09IDApIHtcbiAgICAgICAgLy8gTk9URTogVGhlIGl0ZW0gc2hvcCBkb29yIGluIE9hayBzdHJhZGRsZXMgdHdvIHNjcmVlbnMgKGV4aXQgaXMgb25cbiAgICAgICAgLy8gdGhlIE5XIHNjcmVlbiB3aGlsZSBlbnRyYW5jZSBpcyBvbiBTVyBzY3JlZW4pLiAgRG8gYSBxdWljayBoYWNrIHRvXG4gICAgICAgIC8vIGRldGVjdCB0aGlzIChwcm94eWluZyBcImRvb3JcIiBmb3IgXCJ1cHdhcmQgZXhpdFwiKSBhbmQgYWRqdXN0IHNlYXJjaFxuICAgICAgICAvLyB0YXJnZXQgYWNjb3JkaW5nbHkuXG4gICAgICAgIGRlc3RQb3MgLT0gMHgxMDtcbiAgICAgICAgZGVzdENvb3JkICs9IDB4MTAwMDA7XG4gICAgICB9XG4gICAgICAvLyBGaWd1cmUgb3V0IHRoZSBjb25uZWN0aW9uIHR5cGUgZm9yIHRoZSBkZXN0VGlsZS5cbiAgICAgIGNvbnN0IGRlc3RTY3JJZCA9IGRlc3Quc2NyZWVuc1tkZXN0UG9zID4+IDRdW2Rlc3RQb3MgJiAweGZdO1xuICAgICAgY29uc3QgZGVzdFR5cGUgPSBmaW5kRW50cmFuY2VUeXBlKGRlc3QsIGRlc3RTY3JJZCwgZGVzdENvb3JkKTtcbiAgICAgIC8vIE5PVEU6IGluaXRpYWwgc3Bhd24gaGFzIG5vIHR5cGUuLi4/XG4gICAgICBpZiAoIWRlc3RUeXBlKSB7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChkZXN0U2NySWQsIGRlc3QudGlsZXNldCkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgZGVzdFNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgICAgICBpZiAoZXhpdC50eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGluZXMucHVzaChgICAke2Rlc3RTY3IubmFtZX0gJHtleGl0LnR5cGV9OiAke2hleChleGl0LmVudHJhbmNlKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS53YXJuKGBCYWQgZW50cmFuY2UgJHtoZXgoZGVzdENvb3JkKX06IHJhdyAke2hleChkZXN0U2NySWQpXG4gICAgICAgICAgICAgICAgICAgICAgfSBpbiAke2Rlc3R9IEAgJHtoZXgoZGVzdFBvcyl9XFxuJHtsaW5lcy5qb2luKCdcXG4nKX1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICAgIC8vIGlmIChkZXN0VHlwZSkgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YWxvYyA9IG5ldyBNZXRhbG9jYXRpb24obG9jYXRpb24uaWQsIHRpbGVzZXQsIGhlaWdodCwgd2lkdGgpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgc2NyZWVucy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgbWV0YWxvYy5zZXRJbnRlcm5hbChpLCBzY3JlZW5zW2ldKTtcbiAgICAvLyB9XG4gICAgbWV0YWxvYy5fc2NyZWVucyA9IHNjcmVlbnM7XG4gICAgbWV0YWxvYy5fZXhpdHMgPSBleGl0cztcblxuICAgIC8vIEZpbGwgaW4gY3VzdG9tIGZsYWdzXG4gICAgZm9yIChjb25zdCBmIG9mIGxvY2F0aW9uLmZsYWdzKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhbG9jLl9zY3JlZW5zW2Yuc2NyZWVuXTtcbiAgICAgIGlmIChzY3IuZmxhZz8uc3RhcnRzV2l0aCgnY3VzdG9tJykpIHtcbiAgICAgICAgbWV0YWxvYy5jdXN0b21GbGFncy5zZXQoZi5zY3JlZW4sIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAgIH0gZWxzZSBpZiAoIXNjci5mbGFnKSB7XG4gICAgICAgIG1ldGFsb2MuZnJlZUZsYWdzLmFkZChyb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGZvciAoY29uc3QgcG9zIG9mIG1ldGFsb2MuYWxsUG9zKCkpIHtcbiAgICAvLyAgIGNvbnN0IHNjciA9IHJvbS5tZXRhc2NyZWVuc1ttZXRhbG9jLl9zY3JlZW5zW3BvcyArIDE2XV07XG4gICAgLy8gICBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b20nKSB7XG4gICAgLy8gICAgIGNvbnN0IGYgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IHBvcyk7XG4gICAgLy8gICAgIGlmIChmKSBtZXRhbG9jLmN1c3RvbUZsYWdzLnNldChwb3MsIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cbiAgICAvLyBUT0RPIC0gc3RvcmUgcmVhY2hhYmlsaXR5IG1hcD9cbiAgICByZXR1cm4gbWV0YWxvYztcblxuICAgIGZ1bmN0aW9uIGZpbmRFbnRyYW5jZVR5cGUoZGVzdDogTG9jYXRpb24sIHNjcklkOiBudW1iZXIsIGNvb3JkOiBudW1iZXIpIHtcbiAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChzY3JJZCwgZGVzdC50aWxlc2V0KSkge1xuICAgICAgICBjb25zdCB0eXBlID0gZGVzdFNjci5maW5kRW50cmFuY2VUeXBlKGNvb3JkLCBkZXN0LmhlaWdodCA9PT0gMSk7XG4gICAgICAgIGlmICh0eXBlICE9IG51bGwpIHJldHVybiB0eXBlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvLyBpc1JlYWNoYWJsZShwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAvLyAgIHRoaXMuY29tcHV0ZVJlYWNoYWJsZSgpO1xuICAvLyAgIHJldHVybiAhISh0aGlzLl9yZWFjaGFibGUhW3BvcyA+Pj4gNF0gJiAoMSA8PCAocG9zICYgNykpKTtcbiAgLy8gfVxuXG4gIC8vIGNvbXB1dGVSZWFjaGFibGUoKSB7XG4gIC8vICAgaWYgKHRoaXMuX3JlYWNoYWJsZSkgcmV0dXJuO1xuICAvLyAgIHRoaXMuX3JlYWNoYWJsZSA9IG5ldyBVaW50OEFycmF5KHRoaXMuaGVpZ2h0KTtcbiAgLy8gICBjb25zdCBtYXAgPSB0aGlzLnRyYXZlcnNlKHtmbGlnaHQ6IHRydWV9KTtcbiAgLy8gICBjb25zdCBzZWVuID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxQb3M+KCk7XG4gIC8vICAgZm9yIChjb25zdCBbcG9zXSBvZiB0aGlzLl9leGl0cykge1xuICAvLyAgICAgY29uc3Qgc2V0ID0gbWFwLmdldChwb3MpXG4gIC8vICAgfVxuICAvLyB9XG5cbiAgZ2V0VWlkKHBvczogUG9zKTogVWlkIHtcbiAgICByZXR1cm4gdGhpcy5fc2NyZWVuc1twb3NdLnVpZDtcbiAgfVxuXG4gIGdldChwb3M6IFBvcyk6IE1ldGFzY3JlZW4ge1xuICAgIHJldHVybiB0aGlzLl9zY3JlZW5zW3Bvc107XG4gIH1cblxuICAvLyBSZWFkb25seSBhY2Nlc3Nvci5cbiAgLy8gZ2V0IHNjcmVlbnMoKTogcmVhZG9ubHkgVWlkW10ge1xuICAvLyAgIHJldHVybiB0aGlzLl9zY3JlZW5zO1xuICAvLyB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoO1xuICB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX2hlaWdodCA+IGhlaWdodCkge1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UoKGhlaWdodCArIDIpIDw8IDQsICh0aGlzLl9oZWlnaHQgLSBoZWlnaHQpIDw8IDQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faGVpZ2h0IDwgaGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmxlbmd0aCA9IChoZWlnaHQgKyAyKSA8PCA0O1xuICAgICAgdGhpcy5fc2NyZWVucy5maWxsKHRoaXMudGlsZXNldC5lbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5oZWlnaHQgKyAyKSA8PCA0LCB0aGlzLl9zY3JlZW5zLmxlbmd0aCk7XG4gICAgfVxuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBUT0RPIC0gcmVzaXplIGZ1bmN0aW9uP1xuXG4gIGFsbFBvcygpOiByZWFkb25seSBQb3NbXSB7XG4gICAgaWYgKHRoaXMuX3BvcykgcmV0dXJuIHRoaXMuX3BvcztcbiAgICBjb25zdCBwOiBudW1iZXJbXSA9IHRoaXMuX3BvcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5faGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fd2lkdGg7IHgrKykge1xuICAgICAgICBwLnB1c2goeSA8PCA0IHwgeCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9XG5cbiAgc2V0KHBvczogUG9zLCBzY3I6IE1ldGFzY3JlZW4gfCBudWxsKSB7XG4gICAgdGhpcy5fc2NyZWVuc1twb3NdID0gc2NyID8/IHRoaXMudGlsZXNldC5lbXB0eTtcbiAgfVxuXG4gIC8vaW52YWxpZGF0ZU1vbnN0ZXJzKCkgeyB0aGlzLl9tb25zdGVyc0ludmFsaWRhdGVkID0gdHJ1ZTsgfVxuXG4gIGluQm91bmRzKHBvczogUG9zKTogYm9vbGVhbiB7XG4gICAgLy8gcmV0dXJuIGluQm91bmRzKHBvcywgdGhpcy5oZWlnaHQsIHRoaXMud2lkdGgpO1xuICAgIHJldHVybiAocG9zICYgMTUpIDwgdGhpcy53aWR0aCAmJiBwb3MgPj0gMCAmJiBwb3MgPj4+IDQgPCB0aGlzLmhlaWdodDtcbiAgfVxuXG4gIC8vIGlzRml4ZWQocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdGhpcy5fZml4ZWQuaGFzKHBvcyk7XG4gIC8vIH1cblxuICAvKipcbiAgICogRm9yY2Utb3ZlcndyaXRlcyB0aGUgZ2l2ZW4gcmFuZ2Ugb2Ygc2NyZWVucy4gIERvZXMgdmFsaWRpdHkgY2hlY2tpbmdcbiAgICogb25seSBhdCB0aGUgZW5kLiAgRG9lcyBub3QgZG8gYW55dGhpbmcgd2l0aCBmZWF0dXJlcywgc2luY2UgdGhleSdyZVxuICAgKiBvbmx5IHNldCBpbiBsYXRlciBwYXNzZXMgKGkuZS4gc2h1ZmZsZSwgd2hpY2ggaXMgbGFzdCkuXG4gICAqL1xuICBzZXQyZChwb3M6IFBvcyxcbiAgICAgICAgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE9wdGlvbmFsPE1ldGFzY3JlZW4+Pj4pOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiBzY3JlZW5zKSB7XG4gICAgICBsZXQgZHggPSAwO1xuICAgICAgZm9yIChjb25zdCBzY3Igb2Ygcm93KSB7XG4gICAgICAgIGlmIChzY3IpIHRoaXMuc2V0KHBvcyArIGR4LCBzY3IpO1xuICAgICAgICBkeCsrO1xuICAgICAgfVxuICAgICAgcG9zICs9IDE2O1xuICAgIH1cbiAgICAvLyByZXR1cm4gdGhpcy52ZXJpZnkocG9zMCwgc2NyZWVucy5sZW5ndGgsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIE1hdGgubWF4KC4uLnNjcmVlbnMubWFwKHIgPT4gci5sZW5ndGgpKSk7XG4gICAgcmV0dXJuIHRoaXMudmFsaWRhdGUoKTtcbiAgfVxuXG4gIC8qKiBDaGVjayBhbGwgdGhlIGN1cnJlbnRseSBpbnZhbGlkYXRlZCBlZGdlcywgdGhlbiBjbGVhcnMgaXQuICovXG4gIHZhbGlkYXRlKCk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgZGlyIG9mIFswLCAxXSkge1xuICAgICAgZm9yIChsZXQgeSA9IGRpciA/IDAgOiAxOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgICBmb3IgKGxldCB4ID0gZGlyOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgY29uc3QgcG9zMDogUG9zID0geSA8PCA0IHwgeDtcbiAgICAgICAgICBjb25zdCBzY3IwID0gdGhpcy5fc2NyZWVuc1twb3MwXTtcbiAgICAgICAgICBjb25zdCBwb3MxOiBQb3MgPSBwb3MwIC0gKGRpciA/IDEgOiAxNik7XG4gICAgICAgICAgY29uc3Qgc2NyMSA9IHRoaXMuX3NjcmVlbnNbcG9zMV07XG4gICAgICAgICAgaWYgKHNjcjAuaXNFbXB0eSgpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoc2NyMS5pc0VtcHR5KCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICghc2NyMC5jaGVja05laWdoYm9yKHNjcjEsIGRpcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihmb3JtYXQoJ2JhZCBuZWlnaGJvciAlcyAoJTAyeCkgJXMgJXMgKCUwMngpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyMS5uYW1lLCBwb3MxLCBESVJfTkFNRVtkaXJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3IwLm5hbWUsIHBvczApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzcGxpY2VDb2x1bW5zKGxlZnQ6IG51bWJlciwgZGVsZXRlZDogbnVtYmVyLCBpbnNlcnRlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgIHNjcmVlbnM6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxNZXRhc2NyZWVuPj4pIHtcbiAgICAvLyBGaXJzdCBhZGp1c3QgdGhlIHNjcmVlbnMuXG4gICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLl9zY3JlZW5zLmxlbmd0aDsgcCArPSAxNikge1xuICAgICAgdGhpcy5fc2NyZWVucy5jb3B5V2l0aGluKHAgKyBsZWZ0ICsgaW5zZXJ0ZWQsIHAgKyBsZWZ0ICsgZGVsZXRlZCwgcCArIDEwKTtcbiAgICAgIHRoaXMuX3NjcmVlbnMuc3BsaWNlKHAgKyBsZWZ0LCBpbnNlcnRlZCwgLi4uc2NyZWVuc1twID4+IDRdKTtcbiAgICB9XG4gICAgLy8gVXBkYXRlIGRpbWVuc2lvbnMgYW5kIGFjY291bnRpbmdcbiAgICBjb25zdCBkZWx0YSA9IGluc2VydGVkIC0gZGVsZXRlZDtcbiAgICB0aGlzLndpZHRoICs9IGRlbHRhO1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgICAvLyBNb3ZlIHJlbGV2YW50IGV4aXRzXG4gICAgY29uc3QgbW92ZTogW1BvcywgQ29ubmVjdGlvblR5cGUsIFBvcywgQ29ubmVjdGlvblR5cGVdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGVdIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBjb25zdCB4ID0gcG9zICYgMHhmO1xuICAgICAgaWYgKHggPCBsZWZ0ICsgZGVsZXRlZCkge1xuICAgICAgICBpZiAoeCA+PSBsZWZ0KSB0aGlzLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBtb3ZlLnB1c2goW3BvcywgdHlwZSwgcG9zICsgZGVsdGEsIHR5cGVdKTtcbiAgICB9XG4gICAgdGhpcy5tb3ZlRXhpdHMoLi4ubW92ZSk7XG4gICAgLy8gTW92ZSBmbGFncyBhbmQgc3Bhd25zIGluIHBhcmVudCBsb2NhdGlvblxuICAgIGNvbnN0IHBhcmVudCA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBjb25zdCB4dDAgPSAobGVmdCArIGRlbGV0ZWQpIDw8IDQ7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBwYXJlbnQuc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24ueHQgPCB4dDApIGNvbnRpbnVlO1xuICAgICAgc3Bhd24ueHQgLT0gKGRlbHRhIDw8IDQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgcGFyZW50LmZsYWdzKSB7XG4gICAgICBpZiAoZmxhZy54cyA8IGxlZnQgKyBkZWxldGVkKSB7XG4gICAgICAgIGlmIChmbGFnLnhzID49IGxlZnQpIGZsYWcuc2NyZWVuID0gMHhmZjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmbGFnLnhzIC09IGRlbHRhO1xuICAgIH1cbiAgICBwYXJlbnQuZmxhZ3MgPSBwYXJlbnQuZmxhZ3MuZmlsdGVyKGYgPT4gZi5zY3JlZW4gIT09IDB4ZmYpO1xuXG4gICAgLy8gVE9ETyAtIG1vdmUgcGl0cz8/XG5cbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gRXhpdCBoYW5kbGluZ1xuXG4gIHNldEV4aXQocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlLCBzcGVjOiBFeGl0U3BlYykge1xuICAgIGNvbnN0IG90aGVyID0gdGhpcy5yb20ubG9jYXRpb25zW3NwZWNbMF0gPj4+IDhdLm1ldGE7XG4gICAgaWYgKCFvdGhlcikgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3Qgc2V0IHR3by13YXkgZXhpdCB3aXRob3V0IG1ldGFgKTtcbiAgICB0aGlzLnNldEV4aXRPbmVXYXkocG9zLCB0eXBlLCBzcGVjKTtcbiAgICBvdGhlci5zZXRFeGl0T25lV2F5KHNwZWNbMF0gJiAweGZmLCBzcGVjWzFdLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gIH1cbiAgc2V0RXhpdE9uZVdheShwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUsIHNwZWM6IEV4aXRTcGVjKSB7XG4gICAgLy8gY29uc3QgcHJldiA9IHRoaXMuX2V4aXRzLmdldChwb3MsIHR5cGUpO1xuICAgIC8vIGlmIChwcmV2KSB7XG4gICAgLy8gICBjb25zdCBvdGhlciA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2WzBdID4+PiA4XS5tZXRhO1xuICAgIC8vICAgaWYgKG90aGVyKSBvdGhlci5fZXhpdHMuZGVsZXRlKHByZXZbMF0gJiAweGZmLCBwcmV2WzFdKTtcbiAgICAvLyB9XG4gICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgc3BlYyk7XG4gIH1cblxuICBnZXRFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSk6IEV4aXRTcGVjfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX2V4aXRzLmdldChwb3MsIHR5cGUpO1xuICB9XG5cbiAgZXhpdHMoKTogSXRlcmFibGU8cmVhZG9ubHkgW1BvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXT4ge1xuICAgIHJldHVybiB0aGlzLl9leGl0cztcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb3VudGVkIGNhbmRpZGF0ZXM/XG4gIGV4aXRDYW5kaWRhdGVzKHR5cGU6IENvbm5lY3Rpb25UeXBlKTogTWV0YXNjcmVlbltdIHtcbiAgICAvLyBUT0RPIC0gZmlndXJlIG91dCBhIHdheSB0byB1c2UgdGhlIGRvdWJsZS1zdGFpcmNhc2U/ICBpdCB3b24ndFxuICAgIC8vIGhhcHBlbiBjdXJyZW50bHkgYmVjYXVzZSBpdCdzIGZpeGVkLCBzbyBpdCdzIGV4Y2x1ZGVkLi4uLj9cbiAgICBjb25zdCBoYXNFeGl0OiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNjciBvZiB0aGlzLnRpbGVzZXQpIHtcbiAgICAgIGlmIChzY3IuZGF0YS5leGl0cz8uc29tZShlID0+IGUudHlwZSA9PT0gdHlwZSkpIGhhc0V4aXQucHVzaChzY3IpO1xuICAgIH1cbiAgICByZXR1cm4gaGFzRXhpdDtcbiAgfVxuXG4gIC8vIFRPRE8gLSBzaG9ydCB2cyBmdWxsP1xuICBzaG93KCk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICBsZXQgbGluZSA9IFtdO1xuICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICBsaW5lLnB1c2goeC50b1N0cmluZygxNikpO1xuICAgIH1cbiAgICBsaW5lcy5wdXNoKCcgICAnICsgbGluZS5qb2luKCcgICcpKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgMzsgcisrKSB7XG4gICAgICAgIGxpbmUgPSBbciA9PT0gMSA/IHkudG9TdHJpbmcoMTYpIDogJyAnLCAnICddO1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF07XG4gICAgICAgICAgbGluZS5wdXNoKHNjcmVlbj8uZGF0YS5pY29uPy5mdWxsW3JdID8/IChyID09PSAxID8gJyA/ICcgOiAnICAgJykpO1xuICAgICAgICB9XG4gICAgICAgIGxpbmVzLnB1c2gobGluZS5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHNjcmVlbk5hbWVzKCk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGxldCBsaW5lID0gW107XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLl9zY3JlZW5zW3kgPDwgNCB8IHhdO1xuICAgICAgICBsaW5lLnB1c2goc2NyZWVuPy5uYW1lKTtcbiAgICAgIH1cbiAgICAgIGxpbmVzLnB1c2gobGluZS5qb2luKCcgJykpO1xuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICB0cmF2ZXJzZShvcHRzOiBUcmF2ZXJzZU9wdHMgPSB7fSk6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PiB7XG4gICAgLy8gUmV0dXJucyBhIG1hcCBmcm9tIHVuaW9uZmluZCByb290IHRvIGEgbGlzdCBvZiBhbGwgcmVhY2hhYmxlIHRpbGVzLlxuICAgIC8vIEFsbCBlbGVtZW50cyBvZiBzZXQgYXJlIGtleXMgcG9pbnRpbmcgdG8gdGhlIHNhbWUgdmFsdWUgcmVmLlxuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxudW1iZXI+KCk7XG4gICAgY29uc3QgY29ubmVjdGlvblR5cGUgPSAob3B0cy5mbGlnaHQgPyAyIDogMCkgfCAob3B0cy5ub0ZsYWdnZWQgPyAxIDogMCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gb3B0cy53aXRoPy5nZXQocG9zKSA/PyB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2NyLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25UeXBlXSkge1xuICAgICAgICBpZiAoIXNlZ21lbnQubGVuZ3RoKSBjb250aW51ZTsgLy8gZS5nLiBlbXB0eVxuICAgICAgICAvLyBDb25uZWN0IHdpdGhpbiBlYWNoIHNlZ21lbnRcbiAgICAgICAgdWYudW5pb24oc2VnbWVudC5tYXAoYyA9PiAocG9zIDw8IDgpICsgYykpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgICBjb25zdCBzZXRzID0gdWYuc2V0cygpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc2V0ID0gc2V0c1tpXTtcbiAgICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZXQpIHtcbiAgICAgICAgbWFwLnNldChlbGVtLCBzZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYXA7XG4gIH0gIFxuXG4gIC8qKlxuICAgKiBBdHRhY2ggYW4gZXhpdC9lbnRyYW5jZSBwYWlyIGluIHR3byBkaXJlY3Rpb25zLlxuICAgKiBBbHNvIHJlYXR0YWNoZXMgdGhlIGZvcm1lciBvdGhlciBlbmRzIG9mIGVhY2ggdG8gZWFjaCBvdGhlci5cbiAgICovXG4gIGF0dGFjaChzcmNQb3M6IFBvcywgZGVzdDogTWV0YWxvY2F0aW9uLCBkZXN0UG9zOiBQb3MsXG4gICAgICAgICBzcmNUeXBlPzogQ29ubmVjdGlvblR5cGUsIGRlc3RUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXNyY1R5cGUpIHNyY1R5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbUV4aXRzKHNyY1Bvcyk7XG4gICAgaWYgKCFkZXN0VHlwZSkgZGVzdFR5cGUgPSBkZXN0LnBpY2tUeXBlRnJvbUV4aXRzKGRlc3RQb3MpO1xuXG4gICAgLy8gVE9ETyAtIHdoYXQgaWYgbXVsdGlwbGUgcmV2ZXJzZXM/ICBlLmcuIGNvcmRlbCBlYXN0L3dlc3Q/XG4gICAgLy8gICAgICAtIGNvdWxkIGRldGVybWluZSBpZiB0aGlzIGFuZC9vciBkZXN0IGhhcyBhbnkgc2VhbWxlc3MuXG4gICAgLy8gTm86IGluc3RlYWQsIGRvIGEgcG9zdC1wcm9jZXNzLiAgT25seSBjb3JkZWwgbWF0dGVycywgc28gZ29cbiAgICAvLyB0aHJvdWdoIGFuZCBhdHRhY2ggYW55IHJlZHVuZGFudCBleGl0cy5cblxuICAgIGNvbnN0IGRlc3RUaWxlID0gZGVzdC5pZCA8PCA4IHwgZGVzdFBvcztcbiAgICBjb25zdCBwcmV2RGVzdCA9IHRoaXMuX2V4aXRzLmdldChzcmNQb3MsIHNyY1R5cGUpITtcbiAgICBpZiAocHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2RGVzdFRpbGUsIHByZXZEZXN0VHlwZV0gPSBwcmV2RGVzdDtcbiAgICAgIGlmIChwcmV2RGVzdFRpbGUgPT09IGRlc3RUaWxlICYmIHByZXZEZXN0VHlwZSA9PT0gZGVzdFR5cGUpIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcHJldlNyYyA9IGRlc3QuX2V4aXRzLmdldChkZXN0UG9zLCBkZXN0VHlwZSkhO1xuICAgIHRoaXMuX2V4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdKTtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFBvcywgZGVzdFR5cGUsIFt0aGlzLmlkIDw8IDggfCBzcmNQb3MsIHNyY1R5cGVdKTtcbiAgICAvLyBhbHNvIGhvb2sgdXAgcHJldmlvdXMgcGFpclxuICAgIGlmIChwcmV2U3JjICYmIHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldkRlc3RUaWxlLCBwcmV2RGVzdFR5cGVdID0gcHJldkRlc3Q7XG4gICAgICBjb25zdCBbcHJldlNyY1RpbGUsIHByZXZTcmNUeXBlXSA9IHByZXZTcmM7XG4gICAgICBjb25zdCBwcmV2U3JjTWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2U3JjVGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIGNvbnN0IHByZXZEZXN0TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2RGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBwcmV2U3JjTWV0YS5fZXhpdHMuc2V0KHByZXZTcmNUaWxlICYgMHhmZiwgcHJldlNyY1R5cGUsIHByZXZEZXN0KTtcbiAgICAgIHByZXZEZXN0TWV0YS5fZXhpdHMuc2V0KHByZXZEZXN0VGlsZSAmIDB4ZmYsIHByZXZEZXN0VHlwZSwgcHJldlNyYyk7XG4gICAgfSBlbHNlIGlmIChwcmV2U3JjIHx8IHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldlRpbGUsIHByZXZUeXBlXSA9IHByZXZTcmMgfHwgcHJldkRlc3Q7XG4gICAgICBjb25zdCBwcmV2TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIHByZXZNZXRhLl9leGl0cy5kZWxldGUocHJldlRpbGUgJiAweGZmLCBwcmV2VHlwZSk7ICAgICAgXG4gICAgfVxuICB9XG5cbiAgcGlja1R5cGVGcm9tRXhpdHMocG9zOiBQb3MpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgY29uc3QgdHlwZXMgPSBbLi4udGhpcy5fZXhpdHMucm93KHBvcykua2V5cygpXTtcbiAgICBpZiAoIXR5cGVzLmxlbmd0aCkgcmV0dXJuIHRoaXMucGlja1R5cGVGcm9tU2NyZWVucyhwb3MpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHNpbmdsZSB0eXBlIGZvciAke2hleChwb3MpfTogWyR7dHlwZXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlc1swXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbiBleGl0IGZyb20gb25lIHBvcy90eXBlIHRvIGFub3RoZXIuXG4gICAqIEFsc28gdXBkYXRlcyB0aGUgbWV0YWxvY2F0aW9uIG9uIHRoZSBvdGhlciBlbmQgb2YgdGhlIGV4aXQuXG4gICAqIFRoaXMgc2hvdWxkIHR5cGljYWxseSBiZSBkb25lIGF0b21pY2FsbHkgaWYgcmVidWlsZGluZyBhIG1hcC5cbiAgICovXG4gIC8vIFRPRE8gLSByZWJ1aWxkaW5nIGEgbWFwIGludm9sdmVzIG1vdmluZyB0byBhIE5FVyBtZXRhbG9jYXRpb24uLi5cbiAgLy8gICAgICAtIGdpdmVuIHRoaXMsIHdlIG5lZWQgYSBkaWZmZXJlbnQgYXBwcm9hY2g/XG4gIG1vdmVFeGl0cyguLi5tb3ZlczogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIExvY1BvcywgQ29ubmVjdGlvblR5cGVdPikge1xuICAgIGNvbnN0IG5ld0V4aXRzOiBBcnJheTxbUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgW29sZFBvcywgb2xkVHlwZSwgbmV3UG9zLCBuZXdUeXBlXSBvZiBtb3Zlcykge1xuICAgICAgY29uc3QgZGVzdEV4aXQgPSB0aGlzLl9leGl0cy5nZXQob2xkUG9zLCBvbGRUeXBlKSE7XG4gICAgICBjb25zdCBbZGVzdFRpbGUsIGRlc3RUeXBlXSA9IGRlc3RFeGl0O1xuICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgIFt0aGlzLmlkIDw8IDggfCBuZXdQb3MsIG5ld1R5cGVdKTtcbiAgICAgIG5ld0V4aXRzLnB1c2goW25ld1BvcywgbmV3VHlwZSwgZGVzdEV4aXRdKTtcbiAgICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShvbGRQb3MsIG9sZFR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIGV4aXRdIG9mIG5ld0V4aXRzKSB7XG4gICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gIH1cblxuICBtb3ZlRXhpdChwcmV2OiBQb3MsIG5leHQ6IFBvcyxcbiAgICAgICAgICAgcHJldlR5cGU/OiBDb25uZWN0aW9uVHlwZSwgbmV4dFR5cGU/OiBDb25uZWN0aW9uVHlwZSkge1xuICAgIGlmICghcHJldlR5cGUpIHByZXZUeXBlID0gdGhpcy5waWNrVHlwZUZyb21FeGl0cyhwcmV2KTtcbiAgICBpZiAoIW5leHRUeXBlKSBuZXh0VHlwZSA9IHRoaXMucGlja1R5cGVGcm9tU2NyZWVucyhuZXh0KTtcbiAgICBjb25zdCBkZXN0RXhpdCA9IHRoaXMuX2V4aXRzLmdldChwcmV2LCBwcmV2VHlwZSkhO1xuICAgIGNvbnN0IFtkZXN0VGlsZSwgZGVzdFR5cGVdID0gZGVzdEV4aXQ7XG4gICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgW3RoaXMuaWQgPDwgOCB8IG5leHQsIG5leHRUeXBlXSk7XG4gICAgdGhpcy5fZXhpdHMuc2V0KG5leHQsIG5leHRUeXBlLCBkZXN0RXhpdCk7XG4gICAgdGhpcy5fZXhpdHMuZGVsZXRlKHByZXYsIHByZXZUeXBlKTtcbiAgfSAgXG5cbiAgcGlja1R5cGVGcm9tU2NyZWVucyhwb3M6IFBvcyk6IENvbm5lY3Rpb25UeXBlIHtcbiAgICBjb25zdCBleGl0cyA9IHRoaXMuX3NjcmVlbnNbcG9zXS5kYXRhLmV4aXRzO1xuICAgIGNvbnN0IHR5cGVzID0gKGV4aXRzID8/IFtdKS5tYXAoZSA9PiBlLnR5cGUpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc2luZ2xlIHR5cGUgZm9yICR7aGV4KHBvcyl9OiBbJHt0eXBlcy5qb2luKCcsICcpfV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVzWzBdO1xuICB9XG5cbiAgdHJhbnNmZXJGbGFncyhvcmlnOiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gQ29weSBvdmVyIHRoZSBmcmVlIGZsYWdzXG4gICAgdGhpcy5mcmVlRmxhZ3MgPSBuZXcgU2V0KG9yaWcuZnJlZUZsYWdzKTtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgY3VzdG9tIGZsYWdzLlxuICAgIGNvbnN0IGN1c3RvbXMgPSBuZXcgRGVmYXVsdE1hcDxNZXRhc2NyZWVuLCBGbGFnW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IFtwb3MsIGZsYWddIG9mIG9yaWcuY3VzdG9tRmxhZ3MpIHtcbiAgICAgIGN1c3RvbXMuZ2V0KG9yaWcuX3NjcmVlbnNbcG9zXSkucHVzaChmbGFnKTtcbiAgICB9XG4gICAgLy8gU2h1ZmZsZSB0aGVtIGp1c3QgaW4gY2FzZSB0aGV5J3JlIG5vdCBhbGwgdGhlIHNhbWUuLi5cbiAgICAvLyBUT0RPIC0gZm9yIHNlYW1sZXNzIHBhaXJzLCBvbmx5IHNodWZmbGUgb25jZSwgdGhlbiBjb3B5LlxuICAgIGZvciAoY29uc3QgZmxhZ3Mgb2YgY3VzdG9tcy52YWx1ZXMoKSkgcmFuZG9tLnNodWZmbGUoZmxhZ3MpO1xuICAgIC8vIEZpbmQgYWxsIHRoZSBjdXN0b20tZmxhZyBzY3JlZW5zIGluIHRoZSBuZXcgbG9jYXRpb24uXG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgaWYgKHNjci5mbGFnPy5zdGFydHNXaXRoKCdjdXN0b20nKSkge1xuICAgICAgICBjb25zdCBmbGFnID0gY3VzdG9tcy5nZXQoc2NyKS5wb3AoKTtcbiAgICAgICAgaWYgKCFmbGFnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBmbGFnIGZvciAke3Njci5uYW1lfSBhdCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfSBAJHtoZXgocG9zKX1gKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmN1c3RvbUZsYWdzLnNldChwb3MsIGZsYWcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlcyBvd25lcnNoaXAgb2YgZXhpdHMgZnJvbSBhbm90aGVyIG1ldGFsb2NhdGlvbiB3aXRoIHRoZSBzYW1lIElELlxuICAgKiBAcGFyYW0ge2ZpeGVkfSBtYXBzIGRlc3RpbmF0aW9uIGxvY2F0aW9uIElEIHRvIHBvcyB3aGVyZSB0aGUgZXhpdCBpcy5cbiAgICovXG4gIHRyYW5zZmVyRXhpdHMob3JpZzogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIERldGVybWluZSBhbGwgdGhlIGVsaWdpYmxlIGV4aXQgc2NyZWVucy5cbiAgICBjb25zdCBleGl0cyA9IG5ldyBEZWZhdWx0TWFwPENvbm5lY3Rpb25UeXBlLCBQb3NbXT4oKCkgPT4gW10pO1xuICAgIGNvbnN0IHNlbGZFeGl0cyA9IG5ldyBEZWZhdWx0TWFwPENvbm5lY3Rpb25UeXBlLCBTZXQ8UG9zPj4oKCkgPT4gbmV3IFNldCgpKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IHt0eXBlfSBvZiBzY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6dG9wJyAmJiAocG9zID4+PiA0KSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0JyAmJiAocG9zICYgMHhmKSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgPj4+IDQpIDwgdGhpcy5oZWlnaHQgLSAxKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnJpZ2h0JyAmJiAocG9zICYgMHhmKSA8IHRoaXMud2lkdGggLSAxKSBjb250aW51ZTtcbiAgICAgICAgZXhpdHMuZ2V0KHR5cGUpLnB1c2gocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBhcnIgb2YgZXhpdHMudmFsdWVzKCkpIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKGFycik7XG4gICAgfVxuICAgIC8vIEZpbmQgYSBtYXRjaCBmb3IgZWFjaCBvcmlnaW5hbCBleGl0LlxuICAgIGZvciAoY29uc3QgW29wb3MsIHR5cGUsIGV4aXRdIG9mIG9yaWcuX2V4aXRzKSB7XG4gICAgICBpZiAoc2VsZkV4aXRzLmdldCh0eXBlKS5oYXMob3BvcykpIGNvbnRpbnVlO1xuICAgICAgLy8gb3BvcyxleGl0IGZyb20gb3JpZ2luYWwgdmVyc2lvbiBvZiB0aGlzIG1ldGFsb2NhdGlvblxuICAgICAgY29uc3QgcG9zID0gZXhpdHMuZ2V0KHR5cGUpLnBvcCgpOyAvLyBhIFBvcyBpbiB0aGlzIG1ldGFsb2NhdGlvblxuICAgICAgaWYgKHBvcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHRyYW5zZmVyIGV4aXQgJHt0eXBlfSBpbiAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX06IG5vIGVsaWdpYmxlIHNjcmVlblxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICAvLyBMb29rIGZvciBhIHJldmVyc2UgZXhpdDogZXhpdCBpcyB0aGUgc3BlYyBmcm9tIG9sZCBtZXRhLlxuICAgICAgLy8gRmluZCB0aGUgbWV0YWxvY2F0aW9uIGl0IHJlZmVycyB0byBhbmQgc2VlIGlmIHRoZSBleGl0XG4gICAgICAvLyBnb2VzIGJhY2sgdG8gdGhlIG9yaWdpbmFsIHBvc2l0aW9uLlxuICAgICAgY29uc3QgZWxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tleGl0WzBdID4+PiA4XS5tZXRhO1xuICAgICAgY29uc3QgZXBvcyA9IGV4aXRbMF0gJiAweGZmO1xuICAgICAgY29uc3QgZXR5cGUgPSBleGl0WzFdO1xuICAgICAgaWYgKGVsb2MgPT09IG9yaWcpIHtcbiAgICAgICAgLy8gU3BlY2lhbCBjYXNlIG9mIGEgc2VsZi1leGl0IChoYXBwZW5zIGluIGh5ZHJhIGFuZCBweXJhbWlkKS5cbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlLCBqdXN0IHBpY2sgYW4gZXhpdCBvZiB0aGUgY29ycmVjdCB0eXBlLlxuICAgICAgICBjb25zdCBucG9zID0gZXhpdHMuZ2V0KGV0eXBlKS5wb3AoKTtcbiAgICAgICAgaWYgKG5wb3MgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlYCk7XG4gICAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIFt0aGlzLmlkIDw8IDggfCBucG9zLCBldHlwZV0pO1xuICAgICAgICB0aGlzLl9leGl0cy5zZXQobnBvcywgZXR5cGUsIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgICAgLy8gQWxzbyBkb24ndCB2aXNpdCB0aGUgb3RoZXIgZXhpdCBsYXRlci5cbiAgICAgICAgc2VsZkV4aXRzLmdldChldHlwZSkuYWRkKGVwb3MpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJldCA9IGVsb2MuX2V4aXRzLmdldChlcG9zLCBldHlwZSkhO1xuICAgICAgaWYgKCFyZXQpIHtcbiAgICAgICAgY29uc3QgZWVsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdFswXSA+Pj4gOF07XG4gICAgICAgIGNvbnNvbGUubG9nKGVsb2MpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGV4aXQgZm9yICR7ZWVsb2N9IGF0ICR7aGV4KGVwb3MpfSAke2V0eXBlfVxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZWxvYy5zaG93KCl9XFxuJHt0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19IGF0ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaGV4KG9wb3MpfSAke3R5cGV9XFxuJHt0aGlzLnNob3coKX1gKTtcbiAgICAgIH1cbiAgICAgIGlmICgocmV0WzBdID4+PiA4KSA9PT0gdGhpcy5pZCAmJiAoKHJldFswXSAmIDB4ZmYpID09PSBvcG9zKSAmJlxuICAgICAgICAgIHJldFsxXSA9PT0gdHlwZSkge1xuICAgICAgICBlbG9jLl9leGl0cy5zZXQoZXBvcywgZXR5cGUsIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBOUENzLCB0cmlnZ2VycywgYW5kIGNoZXN0cyBiYXNlZCBvbiBwcm94aW1pdHkgdG8gc2NyZWVucyxcbiAgICogZXhpdHMsIGFuZCBQT0kuXG4gICAqL1xuICB0cmFuc2ZlclNwYXducyh0aGF0OiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gU3RhcnQgYnkgYnVpbGRpbmcgYSBtYXAgYmV0d2VlbiBleGl0cyBhbmQgc3BlY2lmaWMgc2NyZWVuIHR5cGVzLlxuICAgIGNvbnN0IHJldmVyc2VFeGl0cyA9IG5ldyBNYXA8RXhpdFNwZWMsIFtudW1iZXIsIG51bWJlcl0+KCk7IC8vIG1hcCB0byB5LHhcbiAgICAvLyBBcnJheSBvZiBbb2xkIHksIG9sZCB4LCBuZXcgeSwgbmV3IHgsIG1heCBkaXN0YW5jZSAoc3F1YXJlZCldXG4gICAgY29uc3QgbWFwOiBBcnJheTxbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IHdhbGxzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IGJyaWRnZXM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgLy8gUGFpciB1cCBhcmVuYXMuXG4gICAgY29uc3QgYXJlbmFzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgbG9jLmFsbFBvcygpKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGxvYy5fc2NyZWVuc1twb3NdO1xuICAgICAgICBjb25zdCB5ID0gcG9zICYgMHhmMDtcbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYpIDw8IDQ7XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkge1xuICAgICAgICAgIGlmIChzY3IuZGF0YS53YWxsID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB3YWxsIHByb3BgKTtcbiAgICAgICAgICBjb25zdCB3YWxsID0gW3kgfCAoc2NyLmRhdGEud2FsbCA+PiA0KSwgeCB8IChzY3IuZGF0YS53YWxsICYgMHhmKV07XG4gICAgICAgICAgd2FsbHMucHVzaCh3YWxsIGFzIFtudW1iZXIsIG51bWJlcl0pO1xuICAgICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgXCJkb3VibGUgYnJpZGdlXCIgaW4gbGltZSB0cmVlIGxha2VcbiAgICAgICAgICBpZiAoc2NyLmRhdGEudGlsZXNldHMubGltZSkgd2FsbHMucHVzaChbd2FsbFswXSAtIDEsIHdhbGxbMV1dKTtcbiAgICAgICAgfSBlbHNlIGlmIChsb2MgPT09IHRoaXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAgICAgaWYgKHNjci5kYXRhLndhbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHdhbGwgcHJvcGApO1xuICAgICAgICAgIGJyaWRnZXMucHVzaChbeSB8IChzY3IuZGF0YS53YWxsID4+IDQpLCB4IHwgKHNjci5kYXRhLndhbGwgJiAweGYpXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzY3IuaGFzRmVhdHVyZSgnYXJlbmEnKSkgY29udGludWU7XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBhcmVuYXMucHVzaChbeSB8IDgsIHggfCA4XSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgW255LCBueF0gPSBhcmVuYXMucG9wKCkhO1xuICAgICAgICAgIG1hcC5wdXNoKFt5IHwgOCwgeCB8IDgsIG55LCBueCwgMTQ0XSk7IC8vIDEyIHRpbGVzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChsb2MgPT09IHRoaXMpIHJhbmRvbS5zaHVmZmxlKGFyZW5hcyk7XG4gICAgfVxuICAgIC8vIE5vdyBwYWlyIHVwIGV4aXRzLlxuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBleGl0XSBvZiBsb2MuX2V4aXRzKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGxvYy5fc2NyZWVuc1twb3NdO1xuICAgICAgICBjb25zdCBzcGVjID0gc2NyLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IHR5cGUpO1xuICAgICAgICBpZiAoIXNwZWMpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBleGl0OiAke3Njci5uYW1lfSAke3R5cGV9YCk7XG4gICAgICAgIGNvbnN0IHgwID0gcG9zICYgMHhmO1xuICAgICAgICBjb25zdCB5MCA9IHBvcyA+Pj4gNDtcbiAgICAgICAgY29uc3QgeDEgPSBzcGVjLmV4aXRzWzBdICYgMHhmO1xuICAgICAgICBjb25zdCB5MSA9IHNwZWMuZXhpdHNbMF0gPj4+IDQ7XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICByZXZlcnNlRXhpdHMuc2V0KGV4aXQsIFt5MCA8PCA0IHwgeTEsIHgwIDw8IDQgfCB4MV0pO1xuICAgICAgICB9IGVsc2UgaWYgKChleGl0WzBdID4+PiA4KSAhPT0gdGhpcy5pZCkgeyAvLyBza2lwIHNlbGYtZXhpdHNcbiAgICAgICAgICBjb25zdCBbbnksIG54XSA9IHJldmVyc2VFeGl0cy5nZXQoZXhpdCkhO1xuICAgICAgICAgIG1hcC5wdXNoKFt5MCA8PCA0IHwgeTEsIHgwIDw8IDQgfCB4MSwgbnksIG54LCAyNV0pOyAvLyA1IHRpbGVzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gTWFrZSBhIGxpc3Qgb2YgUE9JIGJ5IHByaW9yaXR5ICgwLi41KS5cblxuXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGZpcnN0IHBhcnRpdGlvbmluZyB0aGUgc2NyZWVucyB3aXRoIGltcGFzc2libGVcbiAgICAvLyB3YWxscyBhbmQgcGxhY2luZyBwb2kgaW50byBhcyBtYW55IHNlcGFyYXRlIHBhcnRpdGlvbnMgKGZyb21cbiAgICAvLyBzdGFpcnMvZW50cmFuY2VzKSBhcyBwb3NzaWJsZSA/Pz8gIE9yIG1heWJlIGp1c3Qgd2VpZ2h0IHRob3NlXG4gICAgLy8gaGlnaGVyPyAgZG9uJ3Qgd2FudCB0byBfZm9yY2VfIHRoaW5ncyB0byBiZSBpbmFjY2Vzc2libGUuLi4/XG5cblxuICAgIGNvbnN0IHBwb2k6IEFycmF5PEFycmF5PFtudW1iZXIsIG51bWJlcl0+PiA9IFtbXSwgW10sIFtdLCBbXSwgW10sIFtdXTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IFtwLCBkeSA9IDB4NzAsIGR4ID0gMHg3OF0gb2Ygc2NyLmRhdGEucG9pID8/IFtdKSB7XG4gICAgICAgIGNvbnN0IHkgPSAoKHBvcyAmIDB4ZjApIDw8IDQpICsgZHk7XG4gICAgICAgIGNvbnN0IHggPSAoKHBvcyAmIDB4MGYpIDw8IDgpICsgZHg7XG4gICAgICAgIHBwb2lbcF0ucHVzaChbeSwgeF0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBvaSBvZiBwcG9pKSB7XG4gICAgICByYW5kb20uc2h1ZmZsZShwb2kpO1xuICAgIH1cbiAgICBjb25zdCBhbGxQb2kgPSBbLi4uaXRlcnMuY29uY2F0KC4uLnBwb2kpXTtcbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIHNwYXducywgbG9vayBmb3IgTlBDL2NoZXN0L3RyaWdnZXIuXG4gICAgY29uc3QgbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgcmFuZG9tLnNodWZmbGUobG9jLnNwYXducykpIHtcbiAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkge1xuICAgICAgICAvLyBUT0RPIC0gbW92ZSBwbGF0Zm9ybXMsIHN0YXR1ZXM/XG4gICAgICAgIGNvbnRpbnVlOyAvLyB0aGVzZSBhcmUgaGFuZGxlZCBlbHNld2hlcmUuXG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgIGNvbnN0IHdhbGwgPSAoc3Bhd24ud2FsbFR5cGUoKSA9PT0gJ2JyaWRnZScgPyBicmlkZ2VzIDogd2FsbHMpLnBvcCgpO1xuICAgICAgICBpZiAoIXdhbGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBlbm91Z2ggJHtzcGF3bi53YWxsVHlwZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9IHNjcmVlbnMgaW4gbmV3IG1ldGFsb2NhdGlvbjogJHtsb2N9XFxuJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFt5LCB4XSA9IHdhbGw7XG4gICAgICAgIHNwYXduLnl0ID0geTtcbiAgICAgICAgc3Bhd24ueHQgPSB4O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSB8fCBzcGF3bi5pc0Jvc3MoKSB8fCBzcGF3bi5pc1RyaWdnZXIoKSkge1xuICAgICAgICAvL2xldCBqID0gMDtcbiAgICAgICAgbGV0IGJlc3QgPSBbLTEsIC0xLCBJbmZpbml0eV07XG4gICAgICAgIGZvciAoY29uc3QgW3kwLCB4MCwgeTEsIHgxLCBkbWF4XSBvZiBtYXApIHtcbiAgICAgICAgICBjb25zdCBkID0gKHNwYXduLnl0IC0geTApICoqIDIgKyAoc3Bhd24ueHQgLSB4MCkgKiogMjtcbiAgICAgICAgICBpZiAoZCA8PSBkbWF4ICYmIGQgPCBiZXN0WzJdKSB7XG4gICAgICAgICAgICBiZXN0ID0gW3NwYXduLnl0ICsgeTEgLSB5MCwgc3Bhd24ueHQgKyB4MSAtIHgwLCBkXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShiZXN0WzJdKSkge1xuICAgICAgICAgIC8vIEtlZXAgdHJhY2sgb2YgYW55IE5QQ3Mgd2UgYWxyZWFkeSBtb3ZlZCBzbyB0aGF0IGFueXRoaW5nIHRoYXQnc1xuICAgICAgICAgIC8vIG9uIHRvcCBvZiBpdCAoaS5lLiBkdWFsIHNwYXducykgbW92ZSBhbG9uZyB3aXRoLlxuICAgICAgICAgIC8vaWYgKGJlc3RbMl0gPiA0KSBtYXAucHVzaChbc3Bhd24ueHQsIHNwYXduLnl0LCBiZXN0WzBdLCBiZXN0WzFdLCA0XSk7XG4gICAgICAgICAgLy8gLSBUT0RPIC0gSSBkb24ndCB0aGluayB3ZSBuZWVkIHRoaXMsIHNpbmNlIGFueSBmdXR1cmUgc3Bhd24gc2hvdWxkXG4gICAgICAgICAgLy8gICBiZSBwbGFjZWQgYnkgdGhlIHNhbWUgcnVsZXMuXG4gICAgICAgICAgW3NwYXduLnl0LCBzcGF3bi54dF0gPSBiZXN0O1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBXYXNuJ3QgYWJsZSB0byBtYXAgYW4gYXJlbmEgb3IgZXhpdC4gIFBpY2sgYSBuZXcgUE9JLCBidXQgdHJpZ2dlcnMgYW5kXG4gICAgICAvLyBib3NzZXMgYXJlIGluZWxpZ2libGUuXG4gICAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgfHwgc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcGxhY2UgJHtsb2N9ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgc3Bhd24uaXNCb3NzKCkgPyAnQm9zcycgOiAnVHJpZ2dlcid9ICR7c3Bhd24uaGV4KClcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XFxuJHt0aGlzLnNob3coKX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5leHQgPSBhbGxQb2kuc2hpZnQoKTtcbiAgICAgIGlmICghbmV4dCkgdGhyb3cgbmV3IEVycm9yKGBSYW4gb3V0IG9mIFBPSSBmb3IgJHtsb2N9YCk7XG4gICAgICBjb25zdCBbeSwgeF0gPSBuZXh0O1xuICAgICAgbWFwLnB1c2goW3NwYXduLnkgPj4+IDQsIHNwYXduLnggPj4+IDQsIHkgPj4+IDQsIHggPj4+IDQsIDRdKTtcbiAgICAgIHNwYXduLnkgPSB5O1xuICAgICAgc3Bhd24ueCA9IHg7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgc2VhbWxlc3MgcGFpciBsb2NhdGlvbiwgc3luYyB1cCB0aGUgZXhpdHMuICBGb3IgZWFjaCBleGl0IG9mXG4gICAqIGVpdGhlciwgY2hlY2sgaWYgaXQncyBzeW1tZXRyaWMsIGFuZCBpZiBzbywgY29weSBpdCBvdmVyIHRvIHRoZSBvdGhlciBzaWRlLlxuICAgKi9cbiAgcmVjb25jaWxlRXhpdHModGhhdDogTWV0YWxvY2F0aW9uKSB7XG4gICAgY29uc3QgYWRkOiBbTWV0YWxvY2F0aW9uLCBQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlY11bXSA9IFtdO1xuICAgIGNvbnN0IGRlbDogW01ldGFsb2NhdGlvbiwgUG9zLCBDb25uZWN0aW9uVHlwZV1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgbG9jLl9leGl0cykge1xuICAgICAgICBpZiAoZGVzdFR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4+IDhdO1xuICAgICAgICBjb25zdCByZXZlcnNlID0gZGVzdC5tZXRhLl9leGl0cy5nZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSk7XG4gICAgICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICAgICAgY29uc3QgW3JldlRpbGUsIHJldlR5cGVdID0gcmV2ZXJzZTtcbiAgICAgICAgICBpZiAoKHJldlRpbGUgPj4+IDgpID09PSBsb2MuaWQgJiYgKHJldlRpbGUgJiAweGZmKSA9PT0gcG9zICYmXG4gICAgICAgICAgICAgIHJldlR5cGUgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIGFkZC5wdXNoKFtsb2MgPT09IHRoaXMgPyB0aGF0IDogdGhpcywgcG9zLCB0eXBlLFxuICAgICAgICAgICAgICAgICAgICAgIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZGVsLnB1c2goW2xvYywgcG9zLCB0eXBlXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2xvYywgcG9zLCB0eXBlXSBvZiBkZWwpIHtcbiAgICAgIGxvYy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2xvYywgcG9zLCB0eXBlLCBleGl0XSBvZiBhZGQpIHtcbiAgICAgIGxvYy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgZXhpdCk7XG4gICAgfVxuICAgIC8vIHRoaXMuX2V4aXRzID0gbmV3IFRhYmxlKGV4aXRzKTtcbiAgICAvLyB0aGF0Ll9leGl0cyA9IG5ldyBUYWJsZShleGl0cyk7XG4gIH1cblxuICAvKipcbiAgICogU2F2ZXMgdGhlIGN1cnJlbnQgc3RhdGUgYmFjayBpbnRvIHRoZSB1bmRlcmx5aW5nIGxvY2F0aW9uLlxuICAgKiBDdXJyZW50bHkgdGhpcyBvbmx5IGRlYWxzIHdpdGggZW50cmFuY2VzL2V4aXRzLlxuICAgKi9cbiAgd3JpdGUoKSB7XG4gICAgY29uc3Qgc3JjTG9jID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGxldCBzZWFtbGVzc1BhcnRuZXI6IExvY2F0aW9ufHVuZGVmaW5lZDtcbiAgICBmb3IgKGNvbnN0IFtzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgY29uc3Qgc3JjU2NyZWVuID0gdGhpcy5fc2NyZWVuc1tzcmNQb3NdO1xuICAgICAgY29uc3QgZGVzdCA9IGRlc3RUaWxlID4+IDg7XG4gICAgICBsZXQgZGVzdFBvcyA9IGRlc3RUaWxlICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3RMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF07XG4gICAgICBjb25zdCBkZXN0TWV0YSA9IGRlc3RMb2MubWV0YSE7XG4gICAgICBjb25zdCBkZXN0U2NyZWVuID0gZGVzdE1ldGEuX3NjcmVlbnNbZGVzdFRpbGUgJiAweGZmXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gc3JjVHlwZSk7XG4gICAgICBjb25zdCBkZXN0RXhpdCA9IGRlc3RTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gZGVzdFR5cGUpO1xuICAgICAgaWYgKCFzcmNFeGl0IHx8ICFkZXN0RXhpdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgJHtzcmNFeGl0ID8gJ2Rlc3QnIDogJ3NvdXJjZSd9IGV4aXQ6XG4gIEZyb206ICR7c3JjTG9jfSBAICR7aGV4KHNyY1Bvcyl9OiR7c3JjVHlwZX0gJHtzcmNTY3JlZW4ubmFtZX1cbiAgVG86ICAgJHtkZXN0TG9jfSBAICR7aGV4KGRlc3RQb3MpfToke2Rlc3RUeXBlfSAke2Rlc3RTY3JlZW4ubmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIC8vIFNlZSBpZiB0aGUgZGVzdCBlbnRyYW5jZSBleGlzdHMgeWV0Li4uXG4gICAgICBsZXQgZW50cmFuY2UgPSAweDIwO1xuICAgICAgaWYgKGRlc3RFeGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICBzZWFtbGVzc1BhcnRuZXIgPSBkZXN0TG9jO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGRlc3RDb29yZCA9IGRlc3RFeGl0LmVudHJhbmNlO1xuICAgICAgICBpZiAoZGVzdENvb3JkID4gMHhlZmZmKSB7IC8vIGhhbmRsZSBzcGVjaWFsIGNhc2UgaW4gT2FrXG4gICAgICAgICAgZGVzdFBvcyArPSAweDEwO1xuICAgICAgICAgIGRlc3RDb29yZCAtPSAweDEwMDAwO1xuICAgICAgICB9XG4gICAgICAgIGVudHJhbmNlID0gZGVzdExvYy5maW5kT3JBZGRFbnRyYW5jZShkZXN0UG9zLCBkZXN0Q29vcmQpO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgdGlsZSBvZiBzcmNFeGl0LmV4aXRzKSB7XG4gICAgICAgIC8vaWYgKHNyY0V4aXQudHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiB0aGlzLmhlaWdodCA9PT0gMSkgdGlsZSAtPSAweDIwO1xuICAgICAgICBzcmNMb2MuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHNyY1BvcywgdGlsZSwgZGVzdCwgZW50cmFuY2V9KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHNyY0xvYy53aWR0aCA9IHRoaXMuX3dpZHRoO1xuICAgIHNyY0xvYy5oZWlnaHQgPSB0aGlzLl9oZWlnaHQ7XG4gICAgc3JjTG9jLnNjcmVlbnMgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX2hlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3c6IG51bWJlcltdID0gW107XG4gICAgICBzcmNMb2Muc2NyZWVucy5wdXNoKHJvdyk7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX3dpZHRoOyB4KyspIHtcbiAgICAgICAgcm93LnB1c2godGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XS5zaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBzcmNMb2MudGlsZXNldCA9IHRoaXMudGlsZXNldC50aWxlc2V0SWQ7XG4gICAgc3JjTG9jLnRpbGVFZmZlY3RzID0gdGhpcy50aWxlc2V0LmVmZmVjdHMoKS5pZDtcblxuICAgIC8vIHdyaXRlIGZsYWdzXG4gICAgc3JjTG9jLmZsYWdzID0gW107XG4gICAgY29uc3QgZnJlZUZsYWdzID0gWy4uLnRoaXMuZnJlZUZsYWdzXTtcbiAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3NjcmVlbl07XG4gICAgICBsZXQgZmxhZzogbnVtYmVyfHVuZGVmaW5lZDtcbiAgICAgIGlmIChzY3IuZGF0YS53YWxsICE9IG51bGwgJiYgIXNlYW1sZXNzUGFydG5lcikge1xuICAgICAgICBmbGFnID0gZnJlZUZsYWdzLnBvcCgpPy5pZCA/PyB0aGlzLnJvbS5mbGFncy5hbGxvYygweDIwMCk7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnYWx3YXlzJykge1xuICAgICAgICBmbGFnID0gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjYWxtJykge1xuICAgICAgICBmbGFnID0gdGhpcy5yb20uZmxhZ3MuQ2FsbWVkQW5ncnlTZWEuaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tOmZhbHNlJykge1xuICAgICAgICBmbGFnID0gdGhpcy5jdXN0b21GbGFncy5nZXQoc2NyZWVuKT8uaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tOnRydWUnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZCA/PyB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfVxuICAgICAgaWYgKGZsYWcgIT0gbnVsbCkge1xuICAgICAgICBzcmNMb2MuZmxhZ3MucHVzaChMb2NhdGlvbkZsYWcub2Yoe3NjcmVlbiwgZmxhZ30pKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBOT1RFOiB0aGlzIGNhbiBvbmx5IGJlIGRvbmUgQUZURVIgY29weWluZyB0byB0aGUgbG9jYXRpb24hXG4gIHJlcGxhY2VNb25zdGVycyhyYW5kb206IFJhbmRvbSkge1xuICAgIC8vIE1vdmUgYWxsIHRoZSBtb25zdGVycyB0byByZWFzb25hYmxlIGxvY2F0aW9ucy5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgY29uc3QgcGxhY2VyID0gbG9jLm1vbnN0ZXJQbGFjZXIocmFuZG9tKTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghc3Bhd24udXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXNwYXduLmlzTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG1vbnN0ZXIgPSBsb2Mucm9tLm9iamVjdHNbc3Bhd24ubW9uc3RlcklkXTtcbiAgICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkgY29udGludWU7XG4gICAgICBpZiAobW9uc3Rlci5pc1VudG91Y2hlZE1vbnN0ZXIoKSkgY29udGludWU7XG4gICAgICBjb25zdCBwb3MgPSBwbGFjZXIobW9uc3Rlcik7XG4gICAgICBpZiAocG9zID09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgbm8gdmFsaWQgbG9jYXRpb24gZm9yICR7aGV4KG1vbnN0ZXIuaWQpfSBpbiAke2xvY31gKTtcbiAgICAgICAgc3Bhd24udXNlZCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zID4+PiA4O1xuICAgICAgICBzcGF3bi50aWxlID0gcG9zICYgMHhmZjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRyYXZlcnNlT3B0cyB7XG4gIC8vIERvIG5vdCBwYXNzIGNlcnRhaW4gdGlsZXMgaW4gdHJhdmVyc2VcbiAgcmVhZG9ubHkgd2l0aD86IFJlYWRvbmx5TWFwPFBvcywgTWV0YXNjcmVlbj47XG4gIC8vIFdoZXRoZXIgdG8gYnJlYWsgd2FsbHMvZm9ybSBicmlkZ2VzXG4gIHJlYWRvbmx5IG5vRmxhZ2dlZD86IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdG8gYXNzdW1lIGZsaWdodFxuICByZWFkb25seSBmbGlnaHQ/OiBib29sZWFuO1xufVxuXG5cbmNvbnN0IHVua25vd25FeGl0V2hpdGVsaXN0ID0gbmV3IFNldChbXG4gIDB4MDEwMDNhLCAvLyB0b3AgcGFydCBvZiBjYXZlIG91dHNpZGUgc3RhcnRcbiAgMHgwMTAwM2IsXG4gIDB4MTU0MGEwLCAvLyBcIiBcIiBzZWFtbGVzcyBlcXVpdmFsZW50IFwiIFwiXG4gIDB4MWEzMDYwLCAvLyBzd2FtcCBleGl0XG4gIDB4NDAyMDAwLCAvLyBicmlkZ2UgdG8gZmlzaGVybWFuIGlzbGFuZFxuICAweDQwMjAzMCxcbiAgMHg0MTgwZDAsIC8vIGJlbG93IGV4aXQgdG8gbGltZSB0cmVlIHZhbGxleVxuICAweDYwODdiZiwgLy8gYmVsb3cgYm9hdCBjaGFubmVsXG4gIDB4YTEwMzI2LCAvLyBjcnlwdCAyIGFyZW5hIG5vcnRoIGVkZ2VcbiAgMHhhMTAzMjksXG4gIDB4YTkwNjI2LCAvLyBzdGFpcnMgYWJvdmUga2VsYnkgMlxuICAweGE5MDYyOSxcbl0pO1xuXG4vL2NvbnN0IERQT1MgPSBbLTE2LCAtMSwgMTYsIDFdO1xuY29uc3QgRElSX05BTUUgPSBbJ2Fib3ZlJywgJ2xlZnQgb2YnLCAnYmVsb3cnLCAncmlnaHQgb2YnXTtcblxudHlwZSBPcHRpb25hbDxUPiA9IFR8bnVsbHx1bmRlZmluZWQ7XG4iXX0=