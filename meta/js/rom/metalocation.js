import { Exit, Flag as LocationFlag } from './locationtables.js';
import { Dir } from './metatileset.js';
import { hex } from './util.js';
import { Multiset, Table, iters } from '../util.js';
import { UnionFind } from '../unionfind.js';
import { featureMask } from './metascreendata.js';
const [] = [hex];
export class Metalocation {
    constructor(id, tileset, height, width) {
        this.id = id;
        this.tileset = tileset;
        this.customFlags = new Map();
        this.freeFlags = new Set();
        this._pos = undefined;
        this._counted = new Map();
        this._filled = 0;
        this._features = new Map();
        this._exits = new Table();
        this._monstersInvalidated = false;
        this.rom = tileset.rom;
        this._empty = tileset.empty.uid;
        this._height = height;
        this._width = width;
        this._screens = new Array((height + 2) << 4).fill(this._empty);
        this._counts = tileset.data.consolidated ? new Multiset() : undefined;
        if (this._counts) {
            for (const screen of tileset) {
                if (screen.hasFeature('consolidate')) {
                    this._counted.set(screen.uid, screen.id);
                }
            }
        }
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
                    if (!tileset.getMetascreens(screen).size)
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
        const exit = tileset.exit.uid;
        const screens = new Array((height + 2) << 4).fill(tileset.empty.uid);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const metascreens = tileset.getMetascreens(location.screens[y][x]);
                let metascreen = undefined;
                if (metascreens.size === 1) {
                    [metascreen] = metascreens;
                }
                else if (!metascreens.size) {
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
                const t0 = (y + 1) << 4 | x;
                screens[t0] = metascreen.uid;
                const edges = metascreen.edgeExits();
                if (y === 0 && (edges & 1))
                    screens[t0 - 16] = exit;
                if (x === 0 && (edges & 2))
                    screens[t0 - 1] = exit;
                if (y === height && (edges & 4))
                    screens[t0 + 16] = exit;
                if (x === width && (edges & 8))
                    screens[t0 + 1] = exit;
            }
        }
        const exits = new Table();
        for (const exit of location.exits) {
            const srcPos = exit.screen;
            const srcScreen = rom.metascreens[screens[srcPos + 16]];
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
        for (let i = 0; i < screens.length; i++) {
            metaloc.setInternal(i, screens[i]);
        }
        metaloc._screens = screens;
        metaloc._exits = exits;
        for (const f of location.flags) {
            const scr = rom.metascreens[metaloc._screens[f.screen + 16]];
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
        return this._screens[pos + 16];
    }
    get(pos) {
        return this.rom.metascreens[this._screens[pos + 16]];
    }
    get size() {
        return this._filled;
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
            this._screens.fill(this._empty, (this.height + 2) << 4, this._screens.length);
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
    setInternal(pos, uid) {
        const inBounds = this.inBounds(pos);
        const t0 = pos + 16;
        if (inBounds && this._screens[t0] !== this._empty)
            this._filled--;
        if (inBounds && uid !== this._empty)
            this._filled++;
        const prev = this._counted.get(this._screens[t0]);
        if (uid == null)
            uid = this._empty;
        this._screens[t0] = uid;
        if (this._counts) {
            if (prev != null)
                this._counts.delete(prev);
            const next = this._counted.get(uid);
            if (next != null)
                this._counts.add(next);
        }
    }
    invalidateMonsters() { this._monstersInvalidated = true; }
    inBounds(pos) {
        return (pos & 15) < this.width && pos >= 0 && pos >>> 4 < this.height;
    }
    setFeature(pos, feature) {
        this._features.set(pos, this._features.get(pos) | featureMask[feature]);
    }
    set2d(pos, screens) {
        this.saveExcursion(() => {
            const pos0 = pos;
            for (const row of screens) {
                let dx = 0;
                for (const scr of row) {
                    if (scr)
                        this.setInternal(pos + dx++, scr.uid);
                }
                pos += 16;
            }
            this.verify(pos0, screens.length, Math.max(...screens.map(r => r.length)));
            return true;
        });
    }
    verify(pos0, height, width) {
        const maxY = (this.height + 1) << 4;
        for (let dy = 0; dy <= height; dy++) {
            const pos = pos0 + 16 + (dy << 4);
            for (let dx = 0; dx <= width; dx++) {
                const index = pos + dx;
                const scr = this._screens[index];
                if (scr == null)
                    break;
                const above = this._screens[index - 16];
                const left = this._screens[index - 1];
                if ((index & 0xf) < this.width && !this.tileset.check(above, scr, 16)) {
                    const aboveName = this.rom.metascreens[above].name;
                    const scrName = this.rom.metascreens[scr].name;
                    throw new Error(`bad neighbor ${aboveName} above ${scrName} at ${this.rom.locations[this.id]} @ ${hex(index - 32)}`);
                }
                if (index < maxY && !this.tileset.check(left, scr, 1)) {
                    const leftName = this.rom.metascreens[left].name;
                    const scrName = this.rom.metascreens[scr].name;
                    throw new Error(`bad neighbor ${leftName} left of ${scrName} at ${this.rom.locations[this.id]} @ ${hex(index - 17)}`);
                }
            }
        }
    }
    bookkeep() {
        this._pos = undefined;
        this._filled = 0;
        if (this._counts)
            this._counts = new Multiset();
        for (const pos of this.allPos()) {
            const scr = this._screens[pos + 16];
            if (this._counts) {
                const counted = this._counted.get(scr);
                if (counted != null)
                    this._counts.add(counted);
            }
            if (scr != this.tileset.empty.id)
                this._filled++;
        }
    }
    spliceColumns(left, deleted, inserted, screens) {
        if (this._features.size)
            throw new Error(`bad features`);
        this.saveExcursion(() => {
            for (let p = 0; p < this._screens.length; p += 16) {
                this._screens.copyWithin(p + left + inserted, p + left + deleted, p + 10);
                this._screens.splice(p + left, inserted, ...screens[p >> 4].map(s => s.uid));
            }
            return true;
        });
        const delta = inserted - deleted;
        this.width += delta;
        this._pos = undefined;
        this.bookkeep();
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
    set(pos, uid) {
        const scr = this.rom.metascreens[uid];
        const features = this._features.get(pos);
        if (features != null && !scr.hasFeatures(features))
            return false;
        for (let dir = 0; dir < 4; dir++) {
            const delta = DPOS[dir];
            const other = pos + delta;
            if (!this.tileset.check(uid, this._screens[other], delta))
                return false;
        }
        this.setInternal(pos, uid);
        return true;
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
    exitCandidates(type) {
        var _a;
        const hasExit = [];
        for (const scr of this.tileset) {
            if ((_a = scr.data.exits) === null || _a === void 0 ? void 0 : _a.some(e => e.type === type))
                hasExit.push(scr.id);
        }
        return hasExit;
    }
    tryAddOneOf(pos, candidates) {
        for (const candidate of candidates) {
            if (this.set(pos, candidate))
                return true;
        }
        return false;
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
                    const screen = this.rom.metascreens[this._screens[(y + 1) << 4 | x]];
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
                const screen = this.rom.metascreens[this._screens[(y + 1) << 4 | x]];
                line.push(screen === null || screen === void 0 ? void 0 : screen.name);
            }
            lines.push(line.join(' '));
        }
        return lines.join('\n');
    }
    saveExcursion(f) {
        let screens = [...this._screens];
        let counts = this._counts && [...this._counts];
        let filled = this._filled;
        let features = [...this._features];
        let ok = false;
        try {
            ok = f();
        }
        finally {
            if (ok)
                return true;
            this._screens = screens;
            if (counts)
                this._counts = new Multiset(counts);
            this._filled = filled;
            this._features = new Map(features);
        }
        return false;
    }
    traverse(opts = {}) {
        const without = new Set(opts.without || []);
        const uf = new UnionFind();
        const connectionType = (opts.flight ? 2 : 0) | (opts.noFlagged ? 1 : 0);
        for (const pos of this.allPos()) {
            if (without.has(pos))
                continue;
            const scr = this._screens[pos + 16];
            const ms = this.rom.metascreens[scr];
            for (const segment of ms.connections[connectionType]) {
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
    *borders() {
        const exit = this.tileset.exit.uid;
        for (let x = 0; x < this.width; x++) {
            const top = x;
            const bottom = this.height << 4 | x;
            yield [top, Dir.N, this._screens[top + 16], this._screens[top] === exit];
            yield [bottom, Dir.S, this._screens[bottom + 16],
                this._screens[bottom + 32] === exit];
        }
        for (let y = 1; y <= this.height; y++) {
            const left = y << 4;
            const right = left | (this.width - 1);
            yield [left, Dir.W, this._screens[left + 16],
                this._screens[left + 15] === exit];
            yield [right, Dir.E, this._screens[right + 16],
                this._screens[right + 17] === exit];
        }
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
        const exits = this.rom.metascreens[this._screens[pos + 16]].data.exits;
        const types = (exits !== null && exits !== void 0 ? exits : []).map(e => e.type);
        if (types.length !== 1) {
            throw new Error(`No single type for ${hex(pos)}: [${types.join(', ')}]`);
        }
        return types[0];
    }
    reconcileExits(that) {
        const exits = [];
        for (const loc of [this, that]) {
            for (const [pos, type, [destTile, destType]] of loc._exits) {
                const dest = this.rom.locations[destTile >>> 8];
                const reverse = dest.meta._exits.get(destTile & 0xff, destType);
                if (!reverse)
                    continue;
                const [revTile, revType] = reverse;
                if ((revTile >>> 8) === loc.id && (revTile & 0xff) === pos &&
                    revType === type) {
                    exits.push([pos, type, [destTile, destType]]);
                }
            }
        }
        this._exits = new Table(exits);
        that._exits = new Table(exits);
    }
    write() {
        var _a, _b, _c, _d, _e, _f, _g;
        const srcLoc = this.rom.locations[this.id];
        for (const [srcPos, srcType, [destTile, destType]] of this._exits) {
            const srcScreen = this.rom.metascreens[this._screens[srcPos + 0x10]];
            const dest = destTile >> 8;
            let destPos = destTile & 0xff;
            const destLoc = this.rom.locations[dest];
            const destMeta = destLoc.meta;
            const destScreen = this.rom.metascreens[destMeta._screens[(destTile & 0xff) + 0x10]];
            const srcExit = (_a = srcScreen.data.exits) === null || _a === void 0 ? void 0 : _a.find(e => e.type === srcType);
            const destExit = (_b = destScreen.data.exits) === null || _b === void 0 ? void 0 : _b.find(e => e.type === destType);
            if (!srcExit || !destExit) {
                throw new Error(`Missing exit:
  From: ${srcLoc} @ ${hex(srcPos)}:${srcType} ${srcScreen.name}
  To:   ${destLoc} @ ${hex(destPos)}:${destType} ${destScreen.name}`);
            }
            let entrance = 0x20;
            if (!destExit.type.startsWith('seamless')) {
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
                row.push(this.rom.metascreens[this._screens[(y + 1) << 4 | x]].id);
            }
        }
        srcLoc.tileset = this.tileset.tilesetId;
        srcLoc.tileEffects = this.tileset.effects().id;
        srcLoc.flags = [];
        const freeFlags = [...this.freeFlags];
        for (const screen of this.allPos()) {
            const scr = this.rom.metascreens[this._screens[screen + 16]];
            let flag;
            if (scr.data.wall != null) {
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
        if (this._monstersInvalidated) {
        }
    }
}
const unknownExitWhitelist = new Set([
    0x01003a,
    0x01003b,
    0x010070,
    0x02115f,
    0x1440a0,
    0x1540a0,
    0x1a3060,
    0x1a30a0,
    0x402000,
    0x402030,
    0x4180d0,
    0x6087bf,
    0xa10326,
    0xa10329,
    0xa90626,
    0xa90629,
]);
const DPOS = [-16, -1, 16, 1];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFHL0QsT0FBTyxFQUFDLEdBQUcsRUFBYyxNQUFNLGtCQUFrQixDQUFDO0FBQ2xELE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFOUIsT0FBTyxFQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2xELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUMxQyxPQUFPLEVBQTBCLFdBQVcsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRXpFLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFxQ2pCLE1BQU0sT0FBTyxZQUFZO0lBOEJ2QixZQUFxQixFQUFVLEVBQVcsT0FBb0IsRUFDbEQsTUFBYyxFQUFFLEtBQWE7UUFEcEIsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUFXLFlBQU8sR0FBUCxPQUFPLENBQWE7UUF4QjlELGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUNuQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVEsQ0FBQztRQVVwQixTQUFJLEdBQW9CLFNBQVMsQ0FBQztRQUt6QixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFOUMsWUFBTyxHQUFHLENBQUMsQ0FBQztRQUNaLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBQ25DLFdBQU0sR0FBRyxJQUFJLEtBQUssRUFBaUMsQ0FBQztRQUVwRCx5QkFBb0IsR0FBRyxLQUFLLENBQUM7UUFJbkMsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ3ZC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QyxJQUFJLEtBQUssYUFBYSxFQUFFO2dCQUNyQyxJQUFJLGVBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLDBDQUFFLEVBQUUsbUNBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQzthQUN6RTtZQUNELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUM7YUFDcEQ7U0FDRjtRQUVELElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFO1NBRTlCO0lBQ0gsQ0FBQztDQUNGO0FBWUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUNuQyxRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0lBQ1IsUUFBUTtJQUNSLFFBQVE7SUFDUixRQUFRO0NBQ1QsQ0FBQyxDQUFDO0FBRUgsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0xvY2F0aW9ufSBmcm9tICcuL2xvY2F0aW9uLmpzJzsgLy8gaW1wb3J0IHR5cGVcbmltcG9ydCB7RXhpdCwgRmxhZyBhcyBMb2NhdGlvbkZsYWd9IGZyb20gJy4vbG9jYXRpb250YWJsZXMuanMnO1xuaW1wb3J0IHtGbGFnfSBmcm9tICcuL2ZsYWdzLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbiwgVWlkfSBmcm9tICcuL21ldGFzY3JlZW4uanMnO1xuaW1wb3J0IHtEaXIsIE1ldGF0aWxlc2V0fSBmcm9tICcuL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge011bHRpc2V0LCBUYWJsZSwgaXRlcnN9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtVbmlvbkZpbmR9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQge0Nvbm5lY3Rpb25UeXBlLCBGZWF0dXJlLCBmZWF0dXJlTWFza30gZnJvbSAnLi9tZXRhc2NyZWVuZGF0YS5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbi8vIE1vZGVsIG9mIGEgbG9jYXRpb24gd2l0aCBtZXRhc2NyZWVucywgZXRjLlxuXG4vLyBUcmljazogd2UgbmVlZCBzb21ldGhpbmcgdG8gb3duIHRoZSBuZWlnaGJvciBjYWNoZS5cbi8vICAtIHByb2JhYmx5IHRoaXMgYmVsb25ncyBpbiB0aGUgTWV0YXRpbGVzZXQuXG4vLyAgLSBtZXRob2QgdG8gcmVnZW5lcmF0ZSwgZG8gaXQgYWZ0ZXIgdGhlIHNjcmVlbiBtb2RzP1xuLy8gRGF0YSB3ZSB3YW50IHRvIGtlZXAgdHJhY2sgb2Y6XG4vLyAgLSBnaXZlbiB0d28gc2NyZWVucyBhbmQgYSBkaXJlY3Rpb24sIGNhbiB0aGV5IGFidXQ/XG4vLyAgLSBnaXZlbiBhIHNjcmVlbiBhbmQgYSBkaXJlY3Rpb24sIHdoYXQgc2NyZWVucyBvcGVuL2Nsb3NlIHRoYXQgZWRnZT9cbi8vICAgIC0gd2hpY2ggb25lIGlzIHRoZSBcImRlZmF1bHRcIj9cblxuLy8gVE9ETyAtIGNvbnNpZGVyIGFic3RyYWN0aW5nIGV4aXRzIGhlcmU/XG4vLyAgLSBleGl0czogQXJyYXk8W0V4aXRTcGVjLCBudW1iZXIsIEV4aXRTcGVjXT5cbi8vICAtIEV4aXRTcGVjID0ge3R5cGU/OiBDb25uZWN0aW9uVHlwZSwgc2NyPzogbnVtYmVyfVxuLy8gSG93IHRvIGhhbmRsZSBjb25uZWN0aW5nIHRoZW0gY29ycmVjdGx5P1xuLy8gIC0gc2ltcGx5IHNheWluZyBcIi0+IHdhdGVyZmFsbCB2YWxsZXkgY2F2ZVwiIGlzIG5vdCBoZWxwZnVsIHNpbmNlIHRoZXJlJ3MgMlxuLy8gICAgb3IgXCItPiB3aW5kIHZhbGxleSBjYXZlXCIgd2hlbiB0aGVyZSdzIDUuXG4vLyAgLSB1c2Ugc2NySWQgYXMgdW5pcXVlIGlkZW50aWZpZXI/ICBvbmx5IHByb2JsZW0gaXMgc2VhbGVkIGNhdmUgaGFzIDMuLi5cbi8vICAtIG1vdmUgdG8gZGlmZmVyZW50IHNjcmVlbiBhcyBuZWNlc3NhcnkuLi5cbi8vICAgIChjb3VsZCBhbHNvIGp1c3QgZGl0Y2ggdGhlIG90aGVyIHR3byBhbmQgdHJlYXQgd2luZG1pbGwgZW50cmFuY2UgYXNcbi8vICAgICBhIGRvd24gZW50cmFuY2UgLSBzYW1lIHcvIGxpZ2h0aG91c2U/KVxuLy8gIC0gb25seSBhIHNtYWxsIGhhbmRmdWxsIG9mIGxvY2F0aW9ucyBoYXZlIGRpc2Nvbm5lY3RlZCBjb21wb25lbnRzOlxuLy8gICAgICB3aW5kbWlsbCwgbGlnaHRob3VzZSwgcHlyYW1pZCwgZ29hIGJhY2tkb29yLCBzYWJlcmEsIHNhYnJlL2h5ZHJhIGxlZGdlc1xuLy8gIC0gd2UgcmVhbGx5IGRvIGNhcmUgd2hpY2ggaXMgaW4gd2hpY2ggY29tcG9uZW50LlxuLy8gICAgYnV0IG1hcCBlZGl0cyBtYXkgY2hhbmdlIGV2ZW4gdGhlIG51bWJlciBvZiBjb21wb25lbnRzPz8/XG4vLyAgLSBkbyB3ZSBkbyBlbnRyYW5jZSBzaHVmZmxlIGZpcnN0IG9yIG1hcCBzaHVmZmxlIGZpcnN0P1xuLy8gICAgb3IgYXJlIHRoZXkgaW50ZXJsZWF2ZWQ/IT9cbi8vICAgIGlmIHdlIHNodWZmbGUgc2FicmUgb3ZlcndvcmxkIHRoZW4gd2UgbmVlZCB0byBrbm93IHdoaWNoIGNhdmVzIGNvbm5lY3Rcbi8vICAgIHRvIHdoaWNoLi4uIGFuZCBwb3NzaWJseSBjaGFuZ2UgdGhlIGNvbm5lY3Rpb25zP1xuLy8gICAgLSBtYXkgbmVlZCBsZWV3YXkgdG8gYWRkL3N1YnRyYWN0IGNhdmUgZXhpdHM/P1xuLy8gUHJvYmxlbSBpcyB0aGF0IGVhY2ggZXhpdCBpcyBjby1vd25lZCBieSB0d28gbWV0YWxvY2F0aW9ucy5cblxuXG5leHBvcnQgdHlwZSBQb3MgPSBudW1iZXI7XG5leHBvcnQgdHlwZSBFeGl0U3BlYyA9IHJlYWRvbmx5IFtQb3MsIENvbm5lY3Rpb25UeXBlXTtcblxuZXhwb3J0IGNsYXNzIE1ldGFsb2NhdGlvbiB7XG5cbiAgLy8gVE9ETyAtIHN0b3JlIG1ldGFkYXRhIGFib3V0IHdpbmRtaWxsIGZsYWc/ICB0d28gbWV0YWxvY3Mgd2lsbCBuZWVkIGEgcG9zIHRvXG4gIC8vIGluZGljYXRlIHdoZXJlIHRoYXQgZmxhZyBzaG91bGQgZ28uLi4/ICBPciBzdG9yZSBpdCBpbiB0aGUgbWV0YXNjcmVlbj9cblxuICAvLyBDYXZlcyBhcmUgYXNzdW1lZCB0byBiZSBhbHdheXMgb3BlbiB1bmxlc3MgdGhlcmUncyBhIGZsYWcgc2V0IGhlcmUuLi5cbiAgY3VzdG9tRmxhZ3MgPSBuZXcgTWFwPFBvcywgRmxhZz4oKTtcbiAgZnJlZUZsYWdzID0gbmV3IFNldDxGbGFnPigpO1xuXG4gIHJlYWRvbmx5IHJvbTogUm9tO1xuICBwcml2YXRlIHJlYWRvbmx5IF9lbXB0eTogVWlkO1xuXG4gIHByaXZhdGUgX2hlaWdodDogbnVtYmVyO1xuICBwcml2YXRlIF93aWR0aDogbnVtYmVyO1xuXG4gIC8qKiBLZXk6ICgoeSsxKTw8NCl8eDsgVmFsdWU6IFVpZCAqL1xuICBwcml2YXRlIF9zY3JlZW5zOiBVaWRbXTtcbiAgcHJpdmF0ZSBfcG9zOiBQb3NbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgLyoqIENvdW50IG9mIGNvbnNvbGlkYXRlYWJsZSBzY3JlZW4gdGlsZSBJRHMuICovXG4gIHByaXZhdGUgX2NvdW50cz86IE11bHRpc2V0PG51bWJlcj47XG4gIC8qKiBNYXBzIFVJRCB0byBJRCBvZiBjb3VudGVkIG1ldGFzY3JlZW5zLiAqL1xuICBwcml2YXRlIHJlYWRvbmx5IF9jb3VudGVkID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcblxuICBwcml2YXRlIF9maWxsZWQgPSAwO1xuICBwcml2YXRlIF9mZWF0dXJlcyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7IC8vIG1hcHMgdG8gcmVxdWlyZWQgbWFza1xuICBwcml2YXRlIF9leGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcblxuICBwcml2YXRlIF9tb25zdGVyc0ludmFsaWRhdGVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgaWQ6IG51bWJlciwgcmVhZG9ubHkgdGlsZXNldDogTWV0YXRpbGVzZXQsXG4gICAgICAgICAgICAgIGhlaWdodDogbnVtYmVyLCB3aWR0aDogbnVtYmVyKSB7XG4gICAgdGhpcy5yb20gPSB0aWxlc2V0LnJvbTtcbiAgICB0aGlzLl9lbXB0eSA9IHRpbGVzZXQuZW1wdHkudWlkO1xuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX3NjcmVlbnMgPSBuZXcgQXJyYXkoKGhlaWdodCArIDIpIDw8IDQpLmZpbGwodGhpcy5fZW1wdHkpO1xuICAgIHRoaXMuX2NvdW50cyA9IHRpbGVzZXQuZGF0YS5jb25zb2xpZGF0ZWQgPyBuZXcgTXVsdGlzZXQoKSA6IHVuZGVmaW5lZDtcbiAgICBpZiAodGhpcy5fY291bnRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aWxlc2V0KSB7XG4gICAgICAgIGlmIChzY3JlZW4uaGFzRmVhdHVyZSgnY29uc29saWRhdGUnKSkge1xuICAgICAgICAgIHRoaXMuX2NvdW50ZWQuc2V0KHNjcmVlbi51aWQsIHNjcmVlbi5pZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugb3V0IGEgbWV0YWxvY2F0aW9uIGZyb20gdGhlIGdpdmVuIGxvY2F0aW9uLiAgSW5mZXIgdGhlXG4gICAqIHRpbGVzZXQgaWYgcG9zc2libGUsIG90aGVyd2lzZSBpdCBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxuICAgKi9cbiAgc3RhdGljIG9mKGxvY2F0aW9uOiBMb2NhdGlvbiwgdGlsZXNldD86IE1ldGF0aWxlc2V0KTogTWV0YWxvY2F0aW9uIHtcbiAgICBjb25zdCB7cm9tLCB3aWR0aCwgaGVpZ2h0fSA9IGxvY2F0aW9uO1xuICAgIGlmICghdGlsZXNldCkge1xuICAgICAgLy8gSW5mZXIgdGhlIHRpbGVzZXQuICBTdGFydCBieSBhZGRpbmcgYWxsIGNvbXBhdGlibGUgbWV0YXRpbGVzZXRzLlxuICAgICAgY29uc3Qge2ZvcnRyZXNzLCBsYWJ5cmludGh9ID0gcm9tLm1ldGF0aWxlc2V0cztcbiAgICAgIGNvbnN0IHRpbGVzZXRzID0gbmV3IFNldDxNZXRhdGlsZXNldD4oKTtcbiAgICAgIGZvciAoY29uc3QgdHMgb2Ygcm9tLm1ldGF0aWxlc2V0cykge1xuICAgICAgICBpZiAobG9jYXRpb24udGlsZXNldCA9PT0gdHMudGlsZXNldC5pZCkgdGlsZXNldHMuYWRkKHRzKTtcbiAgICAgIH1cbiAgICAgIC8vIEl0J3MgaW1wb3NzaWJsZSB0byBkaXN0aW5ndWlzaCBmb3J0cmVzcyBhbmQgbGFieXJpbnRoLCBzbyB3ZSBoYXJkY29kZVxuICAgICAgLy8gaXQgYmFzZWQgb24gbG9jYXRpb246IG9ubHkgJGE5IGlzIGxhYnlyaW50aC5cbiAgICAgIHRpbGVzZXRzLmRlbGV0ZShsb2NhdGlvbi5pZCA9PT0gMHhhOSA/IGZvcnRyZXNzIDogbGFieXJpbnRoKTtcbiAgICAgIC8vIEZpbHRlciBvdXQgYW55IHRpbGVzZXRzIHRoYXQgZG9uJ3QgaW5jbHVkZSBuZWNlc3Nhcnkgc2NyZWVuIGlkcy5cbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIG5ldyBTZXQoaXRlcnMuY29uY2F0KC4uLmxvY2F0aW9uLnNjcmVlbnMpKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHRpbGVzZXQgb2YgdGlsZXNldHMpIHtcbiAgICAgICAgICBpZiAoIXRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMoc2NyZWVuKS5zaXplKSB0aWxlc2V0cy5kZWxldGUodGlsZXNldCk7XG4gICAgICAgICAgaWYgKCF0aWxlc2V0cy5zaXplKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHRpbGVzZXQgZm9yICR7aGV4KHNjcmVlbil9IGluICR7bG9jYXRpb259YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodGlsZXNldHMuc2l6ZSAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgdGlsZXNldCBmb3IgJHtsb2NhdGlvbn06IFske1xuICAgICAgICAgICAgICAgICAgICAgICAgIEFycmF5LmZyb20odGlsZXNldHMsIHQgPT4gdC5uYW1lKS5qb2luKCcsICcpfV1gKTtcbiAgICAgIH1cbiAgICAgIHRpbGVzZXQgPSBbLi4udGlsZXNldHNdWzBdO1xuICAgIH1cblxuICAgIC8vIFRyYXZlcnNlIHRoZSBsb2NhdGlvbiBmb3IgYWxsIHRpbGVzIHJlYWNoYWJsZSBmcm9tIGFuIGVudHJhbmNlLlxuICAgIC8vIFRoaXMgaXMgdXNlZCB0byBpbmZvcm0gd2hpY2ggbWV0YXNjcmVlbiB0byBzZWxlY3QgZm9yIHNvbWUgb2YgdGhlXG4gICAgLy8gcmVkdW5kYW50IG9uZXMgKGkuZS4gZG91YmxlIGRlYWQgZW5kcykuICBUaGlzIGlzIGEgc2ltcGxlIHRyYXZlcnNhbFxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IGxvY2F0aW9uLnJlYWNoYWJsZVRpbGVzKHRydWUpOyAvLyB0cmF2ZXJzZVJlYWNoYWJsZSgweDA0KTtcbiAgICBjb25zdCBleGl0ID0gdGlsZXNldC5leGl0LnVpZDtcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IEFycmF5PFVpZD4oKGhlaWdodCArIDIpIDw8IDQpLmZpbGwodGlsZXNldC5lbXB0eS51aWQpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBtZXRhc2NyZWVucyA9IHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMobG9jYXRpb24uc2NyZWVuc1t5XVt4XSk7XG4gICAgICAgIGxldCBtZXRhc2NyZWVuOiBNZXRhc2NyZWVufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG1ldGFzY3JlZW5zLnNpemUgPT09IDEpIHtcbiAgICAgICAgICBbbWV0YXNjcmVlbl0gPSBtZXRhc2NyZWVucztcbiAgICAgICAgfSBlbHNlIGlmICghbWV0YXNjcmVlbnMuc2l6ZSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRPT0QgLSBmaWx0ZXIgYmFzZWQgb24gd2hvIGhhcyBhIG1hdGNoIGZ1bmN0aW9uLCBvciBtYXRjaGluZyBmbGFnc1xuICAgICAgICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09ICgoeSA8PCA0KSB8IHgpKTtcbiAgICAgICAgICBjb25zdCBtYXRjaGVyczogTWV0YXNjcmVlbltdID0gW107XG4gICAgICAgICAgY29uc3QgYmVzdDogTWV0YXNjcmVlbltdID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1ldGFzY3JlZW5zKSB7XG4gICAgICAgICAgICBpZiAocy5kYXRhLm1hdGNoKSB7XG4gICAgICAgICAgICAgIG1hdGNoZXJzLnB1c2gocyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHMuZmxhZyA9PT0gJ2Fsd2F5cycgJiYgZmxhZz8uZmxhZyA9PT0gMHgyZmUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIXMuZmxhZyAmJiAhcy5kYXRhLndhbGwgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgICAgYmVzdC51bnNoaWZ0KHMpOyAvLyBmcm9udC1sb2FkIG1hdGNoaW5nIGZsYWdzXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBiZXN0LnB1c2gocyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChtYXRjaGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlYWNoKGR5OiBudW1iZXIsIGR4OiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgY29uc3QgeDAgPSAoeCA8PCA4KSArIGR4O1xuICAgICAgICAgICAgICBjb25zdCB5MCA9ICh5IDw8IDgpICsgZHk7XG4gICAgICAgICAgICAgIGNvbnN0IHQgPVxuICAgICAgICAgICAgICAgICAgKHkwIDw8IDQpICYgMHhmMDAwIHwgeDAgJiAweGYwMCB8IHkwICYgMHhmMCB8ICh4MCA+PiA0KSAmIDB4ZjtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlYWNoYWJsZS5oYXModCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1hdGNoZXIgb2YgbWF0Y2hlcnMpIHtcbiAgICAgICAgICAgICAgaWYgKCFtYXRjaGVyLmRhdGEubWF0Y2ghKHJlYWNoLCBmbGFnICE9IG51bGwpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgbWV0YXNjcmVlbiA9IG1hdGNoZXI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIW1ldGFzY3JlZW4pIG1ldGFzY3JlZW4gPSBiZXN0WzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbWV0YXNjcmVlbikgdGhyb3cgbmV3IEVycm9yKCdpbXBvc3NpYmxlJyk7XG4gICAgICAgIGNvbnN0IHQwID0gKHkgKyAxKSA8PCA0IHwgeDtcbiAgICAgICAgc2NyZWVuc1t0MF0gPSBtZXRhc2NyZWVuLnVpZDtcbiAgICAgICAgLy8gSWYgd2UncmUgb24gdGhlIGJvcmRlciBhbmQgaXQncyBhbiBlZGdlIGV4aXQgdGhlbiBjaGFuZ2UgdGhlIGJvcmRlclxuICAgICAgICAvLyBzY3JlZW4gdG8gcmVmbGVjdCBhbiBleGl0LlxuICAgICAgICBjb25zdCBlZGdlcyA9IG1ldGFzY3JlZW4uZWRnZUV4aXRzKCk7XG4gICAgICAgIGlmICh5ID09PSAwICYmIChlZGdlcyAmIDEpKSBzY3JlZW5zW3QwIC0gMTZdID0gZXhpdDtcbiAgICAgICAgaWYgKHggPT09IDAgJiYgKGVkZ2VzICYgMikpIHNjcmVlbnNbdDAgLSAxXSA9IGV4aXQ7XG4gICAgICAgIGlmICh5ID09PSBoZWlnaHQgJiYgKGVkZ2VzICYgNCkpIHNjcmVlbnNbdDAgKyAxNl0gPSBleGl0O1xuICAgICAgICBpZiAoeCA9PT0gd2lkdGggJiYgKGVkZ2VzICYgOCkpIHNjcmVlbnNbdDAgKyAxXSA9IGV4aXQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmlndXJlIG91dCBleGl0c1xuICAgIGNvbnN0IGV4aXRzID0gbmV3IFRhYmxlPFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjPigpO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgY29uc3Qgc3JjUG9zID0gZXhpdC5zY3JlZW47XG4gICAgICBjb25zdCBzcmNTY3JlZW4gPSByb20ubWV0YXNjcmVlbnNbc2NyZWVuc1tzcmNQb3MgKyAxNl1dO1xuICAgICAgY29uc3Qgc3JjRXhpdCA9IHNyY1NjcmVlbi5maW5kRXhpdFR5cGUoZXhpdC50aWxlLCBoZWlnaHQgPT09IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAhIShleGl0LmVudHJhbmNlICYgMHgyMCkpO1xuICAgICAgY29uc3Qgc3JjVHlwZSA9IHNyY0V4aXQ/LnR5cGU7XG4gICAgICBpZiAoIXNyY1R5cGUpIHtcbiAgICAgICAgY29uc3QgaWQgPSBsb2NhdGlvbi5pZCA8PCAxNiB8IHNyY1BvcyA8PCA4IHwgZXhpdC50aWxlO1xuICAgICAgICBpZiAodW5rbm93bkV4aXRXaGl0ZWxpc3QuaGFzKGlkKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGFsbCA9IHNyY1NjcmVlbi5kYXRhLmV4aXRzPy5tYXAoXG4gICAgICAgICAgICBlID0+IGUudHlwZSArICc6ICcgKyBlLmV4aXRzLm1hcChoZXgpLmpvaW4oJywgJykpLmpvaW4oJ1xcbiAgJyk7XG4gICAgICAgIGNvbnNvbGUud2FybihgVW5rbm93biBleGl0ICR7aGV4KGV4aXQudGlsZSl9OiAke3NyY1NjcmVlbi5uYW1lfSBpbiAke1xuICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9ufSBAICR7aGV4KHNyY1Bvcyl9OlxcbiAgJHthbGx9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGV4aXRzLmhhcyhzcmNQb3MsIHNyY1R5cGUpKSBjb250aW51ZTsgLy8gYWxyZWFkeSBoYW5kbGVkXG4gICAgICBjb25zdCBkZXN0ID0gcm9tLmxvY2F0aW9uc1tleGl0LmRlc3RdO1xuICAgICAgaWYgKHNyY1R5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICBjb25zdCBkb3duID0gc3JjVHlwZSA9PT0gJ3NlYW1sZXNzOmRvd24nO1xuICAgICAgICAvLyBOT1RFOiB0aGlzIHNlZW1zIHdyb25nIC0gdGhlIGRvd24gZXhpdCBpcyBCRUxPVyB0aGUgdXAgZXhpdC4uLj9cbiAgICAgICAgY29uc3QgdGlsZSA9IHNyY0V4aXQhLmV4aXRzWzBdICsgKGRvd24gPyAtMTYgOiAxNik7XG4gICAgICAgIGNvbnN0IGRlc3RQb3MgPSBzcmNQb3MgKyAodGlsZSA8IDAgPyAtMTYgOiB0aWxlID49IDB4ZjAgPyAxNiA6IC0wKTtcbiAgICAgICAgY29uc3QgZGVzdFR5cGUgPSBkb3duID8gJ3NlYW1sZXNzOnVwJyA6ICdzZWFtbGVzczpkb3duJztcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgJHtzcmNUeXBlfSAke2hleChsb2NhdGlvbi5pZCl9ICR7ZG93bn0gJHtoZXgodGlsZSl9ICR7aGV4KGRlc3RQb3MpfSAke2Rlc3RUeXBlfSAke2hleChkZXN0LmlkKX1gKTtcbiAgICAgICAgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZW50cmFuY2UgPSBkZXN0LmVudHJhbmNlc1tleGl0LmVudHJhbmNlICYgMHgxZl07XG4gICAgICBsZXQgZGVzdFBvcyA9IGVudHJhbmNlLnNjcmVlbjtcbiAgICAgIGxldCBkZXN0Q29vcmQgPSBlbnRyYW5jZS5jb29yZDtcbiAgICAgIGlmIChzcmNUeXBlID09PSAnZG9vcicgJiYgKGVudHJhbmNlLnkgJiAweGYwKSA9PT0gMCkge1xuICAgICAgICAvLyBOT1RFOiBUaGUgaXRlbSBzaG9wIGRvb3IgaW4gT2FrIHN0cmFkZGxlcyB0d28gc2NyZWVucyAoZXhpdCBpcyBvblxuICAgICAgICAvLyB0aGUgTlcgc2NyZWVuIHdoaWxlIGVudHJhbmNlIGlzIG9uIFNXIHNjcmVlbikuICBEbyBhIHF1aWNrIGhhY2sgdG9cbiAgICAgICAgLy8gZGV0ZWN0IHRoaXMgKHByb3h5aW5nIFwiZG9vclwiIGZvciBcInVwd2FyZCBleGl0XCIpIGFuZCBhZGp1c3Qgc2VhcmNoXG4gICAgICAgIC8vIHRhcmdldCBhY2NvcmRpbmdseS5cbiAgICAgICAgZGVzdFBvcyAtPSAweDEwO1xuICAgICAgICBkZXN0Q29vcmQgKz0gMHgxMDAwMDtcbiAgICAgIH1cbiAgICAgIC8vIEZpZ3VyZSBvdXQgdGhlIGNvbm5lY3Rpb24gdHlwZSBmb3IgdGhlIGRlc3RUaWxlLlxuICAgICAgY29uc3QgZGVzdFNjcklkID0gZGVzdC5zY3JlZW5zW2Rlc3RQb3MgPj4gNF1bZGVzdFBvcyAmIDB4Zl07XG4gICAgICBjb25zdCBkZXN0VHlwZSA9IGZpbmRFbnRyYW5jZVR5cGUoZGVzdCwgZGVzdFNjcklkLCBkZXN0Q29vcmQpO1xuICAgICAgLy8gTk9URTogaW5pdGlhbCBzcGF3biBoYXMgbm8gdHlwZS4uLj9cbiAgICAgIGlmICghZGVzdFR5cGUpIHtcbiAgICAgICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBkZXN0U2NyIG9mIHJvbS5tZXRhc2NyZWVucy5nZXRCeUlkKGRlc3RTY3JJZCwgZGVzdC50aWxlc2V0KSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZXhpdCBvZiBkZXN0U2NyLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgICAgICAgIGlmIChleGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkgY29udGludWU7XG4gICAgICAgICAgICBsaW5lcy5wdXNoKGAgICR7ZGVzdFNjci5uYW1lfSAke2V4aXQudHlwZX06ICR7aGV4KGV4aXQuZW50cmFuY2UpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLndhcm4oYEJhZCBlbnRyYW5jZSAke2hleChkZXN0Q29vcmQpfTogcmF3ICR7aGV4KGRlc3RTY3JJZClcbiAgICAgICAgICAgICAgICAgICAgICB9IGluICR7ZGVzdH0gQCAke2hleChkZXN0UG9zKX1cXG4ke2xpbmVzLmpvaW4oJ1xcbicpfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgICAgLy8gaWYgKGRlc3RUeXBlKSBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhbG9jID0gbmV3IE1ldGFsb2NhdGlvbihsb2NhdGlvbi5pZCwgdGlsZXNldCwgaGVpZ2h0LCB3aWR0aCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY3JlZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBtZXRhbG9jLnNldEludGVybmFsKGksIHNjcmVlbnNbaV0pO1xuICAgIH1cbiAgICBtZXRhbG9jLl9zY3JlZW5zID0gc2NyZWVucztcbiAgICBtZXRhbG9jLl9leGl0cyA9IGV4aXRzO1xuXG4gICAgLy8gRmlsbCBpbiBjdXN0b20gZmxhZ3NcbiAgICBmb3IgKGNvbnN0IGYgb2YgbG9jYXRpb24uZmxhZ3MpIHtcbiAgICAgIGNvbnN0IHNjciA9IHJvbS5tZXRhc2NyZWVuc1ttZXRhbG9jLl9zY3JlZW5zW2Yuc2NyZWVuICsgMTZdXTtcbiAgICAgIGlmIChzY3IuZmxhZz8uc3RhcnRzV2l0aCgnY3VzdG9tJykpIHtcbiAgICAgICAgbWV0YWxvYy5jdXN0b21GbGFncy5zZXQoZi5zY3JlZW4sIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAgIH0gZWxzZSBpZiAoIXNjci5mbGFnKSB7XG4gICAgICAgIG1ldGFsb2MuZnJlZUZsYWdzLmFkZChyb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGZvciAoY29uc3QgcG9zIG9mIG1ldGFsb2MuYWxsUG9zKCkpIHtcbiAgICAvLyAgIGNvbnN0IHNjciA9IHJvbS5tZXRhc2NyZWVuc1ttZXRhbG9jLl9zY3JlZW5zW3BvcyArIDE2XV07XG4gICAgLy8gICBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b20nKSB7XG4gICAgLy8gICAgIGNvbnN0IGYgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IHBvcyk7XG4gICAgLy8gICAgIGlmIChmKSBtZXRhbG9jLmN1c3RvbUZsYWdzLnNldChwb3MsIHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cbiAgICAvLyBUT0RPIC0gc3RvcmUgcmVhY2hhYmlsaXR5IG1hcD9cbiAgICByZXR1cm4gbWV0YWxvYztcblxuICAgIGZ1bmN0aW9uIGZpbmRFbnRyYW5jZVR5cGUoZGVzdDogTG9jYXRpb24sIHNjcklkOiBudW1iZXIsIGNvb3JkOiBudW1iZXIpIHtcbiAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChzY3JJZCwgZGVzdC50aWxlc2V0KSkge1xuICAgICAgICBjb25zdCB0eXBlID0gZGVzdFNjci5maW5kRW50cmFuY2VUeXBlKGNvb3JkLCBkZXN0LmhlaWdodCA9PT0gMSk7XG4gICAgICAgIGlmICh0eXBlICE9IG51bGwpIHJldHVybiB0eXBlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBnZXRVaWQocG9zOiBQb3MpOiBVaWQge1xuICAgIHJldHVybiB0aGlzLl9zY3JlZW5zW3BvcyArIDE2XTtcbiAgfVxuXG4gIGdldChwb3M6IFBvcyk6IE1ldGFzY3JlZW4ge1xuICAgIHJldHVybiB0aGlzLnJvbS5tZXRhc2NyZWVuc1t0aGlzLl9zY3JlZW5zW3BvcyArIDE2XV07XG4gIH1cblxuICBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9maWxsZWQ7XG4gIH1cblxuICAvLyBSZWFkb25seSBhY2Nlc3Nvci5cbiAgLy8gZ2V0IHNjcmVlbnMoKTogcmVhZG9ubHkgVWlkW10ge1xuICAvLyAgIHJldHVybiB0aGlzLl9zY3JlZW5zO1xuICAvLyB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoO1xuICB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX2hlaWdodCA+IGhlaWdodCkge1xuICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UoKGhlaWdodCArIDIpIDw8IDQsICh0aGlzLl9oZWlnaHQgLSBoZWlnaHQpIDw8IDQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faGVpZ2h0IDwgaGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLmxlbmd0aCA9IChoZWlnaHQgKyAyKSA8PCA0O1xuICAgICAgdGhpcy5fc2NyZWVucy5maWxsKHRoaXMuX2VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmhlaWdodCArIDIpIDw8IDQsIHRoaXMuX3NjcmVlbnMubGVuZ3RoKTtcbiAgICB9XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIFRPRE8gLSByZXNpemUgZnVuY3Rpb24/XG5cbiAgYWxsUG9zKCk6IHJlYWRvbmx5IFBvc1tdIHtcbiAgICBpZiAodGhpcy5fcG9zKSByZXR1cm4gdGhpcy5fcG9zO1xuICAgIGNvbnN0IHA6IG51bWJlcltdID0gdGhpcy5fcG9zID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl93aWR0aDsgeCsrKSB7XG4gICAgICAgIHAucHVzaCh5IDw8IDQgfCB4KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBwcml2YXRlIHNldEludGVybmFsKHBvczogUG9zLCB1aWQ6IFVpZCB8IG51bGwpIHtcbiAgICBjb25zdCBpbkJvdW5kcyA9IHRoaXMuaW5Cb3VuZHMocG9zKTtcbiAgICBjb25zdCB0MCA9IHBvcyArIDE2O1xuICAgIGlmIChpbkJvdW5kcyAmJiB0aGlzLl9zY3JlZW5zW3QwXSAhPT0gdGhpcy5fZW1wdHkpIHRoaXMuX2ZpbGxlZC0tO1xuICAgIGlmIChpbkJvdW5kcyAmJiB1aWQgIT09IHRoaXMuX2VtcHR5KSB0aGlzLl9maWxsZWQrKztcbiAgICBjb25zdCBwcmV2ID0gdGhpcy5fY291bnRlZC5nZXQodGhpcy5fc2NyZWVuc1t0MF0pO1xuICAgIGlmICh1aWQgPT0gbnVsbCkgdWlkID0gdGhpcy5fZW1wdHk7XG4gICAgdGhpcy5fc2NyZWVuc1t0MF0gPSB1aWQ7XG4gICAgaWYgKHRoaXMuX2NvdW50cykge1xuICAgICAgaWYgKHByZXYgIT0gbnVsbCkgdGhpcy5fY291bnRzLmRlbGV0ZShwcmV2KTtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLl9jb3VudGVkLmdldCh1aWQpO1xuICAgICAgaWYgKG5leHQgIT0gbnVsbCkgdGhpcy5fY291bnRzLmFkZChuZXh0KTtcbiAgICB9XG4gIH1cblxuICBpbnZhbGlkYXRlTW9uc3RlcnMoKSB7IHRoaXMuX21vbnN0ZXJzSW52YWxpZGF0ZWQgPSB0cnVlOyB9XG5cbiAgaW5Cb3VuZHMocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgICAvLyByZXR1cm4gaW5Cb3VuZHMocG9zLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCk7XG4gICAgcmV0dXJuIChwb3MgJiAxNSkgPCB0aGlzLndpZHRoICYmIHBvcyA+PSAwICYmIHBvcyA+Pj4gNCA8IHRoaXMuaGVpZ2h0O1xuICB9XG5cbiAgc2V0RmVhdHVyZShwb3M6IFBvcywgZmVhdHVyZTogRmVhdHVyZSkge1xuICAgIHRoaXMuX2ZlYXR1cmVzLnNldChwb3MsIHRoaXMuX2ZlYXR1cmVzLmdldChwb3MpISB8IGZlYXR1cmVNYXNrW2ZlYXR1cmVdKTtcbiAgfVxuXG4gIC8vIGlzRml4ZWQocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdGhpcy5fZml4ZWQuaGFzKHBvcyk7XG4gIC8vIH1cblxuICAvKipcbiAgICogRm9yY2Utb3ZlcndyaXRlcyB0aGUgZ2l2ZW4gcmFuZ2Ugb2Ygc2NyZWVucy4gIERvZXMgdmFsaWRpdHkgY2hlY2tpbmdcbiAgICogb25seSBhdCB0aGUgZW5kLiAgRG9lcyBub3QgZG8gYW55dGhpbmcgd2l0aCBmZWF0dXJlcywgc2luY2UgdGhleSdyZVxuICAgKiBvbmx5IHNldCBpbiBsYXRlciBwYXNzZXMgKGkuZS4gc2h1ZmZsZSwgd2hpY2ggaXMgbGFzdCkuXG4gICAqL1xuICBzZXQyZChwb3M6IFBvcywgc2NyZWVuczogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PE1ldGFzY3JlZW58bnVsbD4+KSB7XG4gICAgdGhpcy5zYXZlRXhjdXJzaW9uKCgpID0+IHtcbiAgICAgIGNvbnN0IHBvczAgPSBwb3M7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBzY3JlZW5zKSB7XG4gICAgICAgIGxldCBkeCA9IDA7XG4gICAgICAgIGZvciAoY29uc3Qgc2NyIG9mIHJvdykge1xuICAgICAgICAgIGlmIChzY3IpIHRoaXMuc2V0SW50ZXJuYWwocG9zICsgZHgrKywgc2NyLnVpZCk7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDE2O1xuICAgICAgfVxuICAgICAgdGhpcy52ZXJpZnkocG9zMCwgc2NyZWVucy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICBNYXRoLm1heCguLi5zY3JlZW5zLm1hcChyID0+IHIubGVuZ3RoKSkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH1cblxuICAvKiogQ2hlY2sgYWxsIHNjcmVlbnMgaW4gdGhlIGdpdmVuIHJlY3RhbmdsZS4gVGhyb3cgaWYgaW52YWxpZC4gKi9cbiAgdmVyaWZ5KHBvczA6IFBvcywgaGVpZ2h0OiBudW1iZXIsIHdpZHRoOiBudW1iZXIpIHtcbiAgICBjb25zdCBtYXhZID0gKHRoaXMuaGVpZ2h0ICsgMSkgPDwgNDtcbiAgICBmb3IgKGxldCBkeSA9IDA7IGR5IDw9IGhlaWdodDsgZHkrKykge1xuICAgICAgY29uc3QgcG9zID0gcG9zMCArIDE2ICsgKGR5IDw8IDQpO1xuICAgICAgZm9yIChsZXQgZHggPSAwOyBkeCA8PSB3aWR0aDsgZHgrKykge1xuICAgICAgICBjb25zdCBpbmRleCA9IHBvcyArIGR4O1xuICAgICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW2luZGV4XTtcbiAgICAgICAgaWYgKHNjciA9PSBudWxsKSBicmVhazsgLy8gaGFwcGVucyB3aGVuIHNldHRpbmcgYm9yZGVyIHNjcmVlbnMgdmlhIHNldDJkXG4gICAgICAgIGNvbnN0IGFib3ZlID0gdGhpcy5fc2NyZWVuc1tpbmRleCAtIDE2XTtcbiAgICAgICAgY29uc3QgbGVmdCA9IHRoaXMuX3NjcmVlbnNbaW5kZXggLSAxXTtcbiAgICAgICAgaWYgKChpbmRleCAmIDB4ZikgPCB0aGlzLndpZHRoICYmICF0aGlzLnRpbGVzZXQuY2hlY2soYWJvdmUsIHNjciwgMTYpKSB7XG4gICAgICAgICAgY29uc3QgYWJvdmVOYW1lID0gdGhpcy5yb20ubWV0YXNjcmVlbnNbYWJvdmVdLm5hbWU7XG4gICAgICAgICAgY29uc3Qgc2NyTmFtZSA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW3Njcl0ubmFtZTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGJhZCBuZWlnaGJvciAke2Fib3ZlTmFtZX0gYWJvdmUgJHtzY3JOYW1lfSBhdCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfSBAICR7aGV4KGluZGV4IC0gMzIpfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbmRleCA8IG1heFkgJiYgIXRoaXMudGlsZXNldC5jaGVjayhsZWZ0LCBzY3IsIDEpKSB7XG4gICAgICAgICAgY29uc3QgbGVmdE5hbWUgPSB0aGlzLnJvbS5tZXRhc2NyZWVuc1tsZWZ0XS5uYW1lO1xuICAgICAgICAgIGNvbnN0IHNjck5hbWUgPSB0aGlzLnJvbS5tZXRhc2NyZWVuc1tzY3JdLm5hbWU7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBiYWQgbmVpZ2hib3IgJHtsZWZ0TmFtZX0gbGVmdCBvZiAke3Njck5hbWV9IGF0ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19IEAgJHtoZXgoaW5kZXggLSAxNyl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZWNvbXB1dGVzIGFsbCB0aGUgbWVtb2l6ZWQgZGF0YSAoZS5nLiBhZnRlciBhIGxhcmdlIGNoYW5nZSkuXG4gIGJvb2trZWVwKCkge1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9maWxsZWQgPSAwO1xuICAgIGlmICh0aGlzLl9jb3VudHMpIHRoaXMuX2NvdW50cyA9IG5ldyBNdWx0aXNldCgpO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zICsgMTZdO1xuICAgICAgaWYgKHRoaXMuX2NvdW50cykge1xuICAgICAgICBjb25zdCBjb3VudGVkID0gdGhpcy5fY291bnRlZC5nZXQoc2NyKTtcbiAgICAgICAgaWYgKGNvdW50ZWQgIT0gbnVsbCkgdGhpcy5fY291bnRzLmFkZChjb3VudGVkKTtcbiAgICAgIH1cbiAgICAgIGlmIChzY3IgIT0gdGhpcy50aWxlc2V0LmVtcHR5LmlkKSB0aGlzLl9maWxsZWQrKztcbiAgICB9XG4gIH1cblxuICBzcGxpY2VDb2x1bW5zKGxlZnQ6IG51bWJlciwgZGVsZXRlZDogbnVtYmVyLCBpbnNlcnRlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgIHNjcmVlbnM6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxNZXRhc2NyZWVuPj4pIHtcbiAgICBpZiAodGhpcy5fZmVhdHVyZXMuc2l6ZSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmVhdHVyZXNgKTtcbiAgICB0aGlzLnNhdmVFeGN1cnNpb24oKCkgPT4ge1xuICAgICAgLy8gRmlyc3QgYWRqdXN0IHRoZSBzY3JlZW5zLlxuICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLl9zY3JlZW5zLmxlbmd0aDsgcCArPSAxNikge1xuICAgICAgICB0aGlzLl9zY3JlZW5zLmNvcHlXaXRoaW4ocCArIGxlZnQgKyBpbnNlcnRlZCwgcCArIGxlZnQgKyBkZWxldGVkLCBwICsgMTApO1xuICAgICAgICB0aGlzLl9zY3JlZW5zLnNwbGljZShwICsgbGVmdCwgaW5zZXJ0ZWQsIC4uLnNjcmVlbnNbcCA+PiA0XS5tYXAocyA9PiBzLnVpZCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgLy8gVXBkYXRlIGRpbWVuc2lvbnMgYW5kIGFjY291bnRpbmdcbiAgICBjb25zdCBkZWx0YSA9IGluc2VydGVkIC0gZGVsZXRlZDtcbiAgICB0aGlzLndpZHRoICs9IGRlbHRhO1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmJvb2trZWVwKCk7XG4gICAgLy8gTW92ZSByZWxldmFudCBleGl0c1xuICAgIGNvbnN0IG1vdmU6IFtQb3MsIENvbm5lY3Rpb25UeXBlLCBQb3MsIENvbm5lY3Rpb25UeXBlXVtdID0gW107XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgY29uc3QgeCA9IHBvcyAmIDB4ZjtcbiAgICAgIGlmICh4IDwgbGVmdCArIGRlbGV0ZWQpIHtcbiAgICAgICAgaWYgKHggPj0gbGVmdCkgdGhpcy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbW92ZS5wdXNoKFtwb3MsIHR5cGUsIHBvcyArIGRlbHRhLCB0eXBlXSk7XG4gICAgfVxuICAgIHRoaXMubW92ZUV4aXRzKC4uLm1vdmUpO1xuICAgIC8vIE1vdmUgZmxhZ3MgYW5kIHNwYXducyBpbiBwYXJlbnQgbG9jYXRpb25cbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgY29uc3QgeHQwID0gKGxlZnQgKyBkZWxldGVkKSA8PCA0O1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgcGFyZW50LnNwYXducykge1xuICAgICAgaWYgKHNwYXduLnh0IDwgeHQwKSBjb250aW51ZTtcbiAgICAgIHNwYXduLnh0IC09IChkZWx0YSA8PCA0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHBhcmVudC5mbGFncykge1xuICAgICAgaWYgKGZsYWcueHMgPCBsZWZ0ICsgZGVsZXRlZCkge1xuICAgICAgICBpZiAoZmxhZy54cyA+PSBsZWZ0KSBmbGFnLnNjcmVlbiA9IDB4ZmY7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZmxhZy54cyAtPSBkZWx0YTtcbiAgICB9XG4gICAgcGFyZW50LmZsYWdzID0gcGFyZW50LmZsYWdzLmZpbHRlcihmID0+IGYuc2NyZWVuICE9PSAweGZmKTtcblxuICAgIC8vIFRPRE8gLSBtb3ZlIHBpdHM/P1xuXG4gIH1cblxuICAvLyBPcHRpb25zIGZvciBzZXR0aW5nOiA/Pz9cbiAgc2V0KHBvczogUG9zLCB1aWQ6IFVpZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNjciA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW3VpZF07XG4gICAgY29uc3QgZmVhdHVyZXMgPSB0aGlzLl9mZWF0dXJlcy5nZXQocG9zKTtcbiAgICBpZiAoZmVhdHVyZXMgIT0gbnVsbCAmJiAhc2NyLmhhc0ZlYXR1cmVzKGZlYXR1cmVzKSkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAobGV0IGRpciA9IDA7IGRpciA8IDQ7IGRpcisrKSB7XG4gICAgICBjb25zdCBkZWx0YSA9IERQT1NbZGlyXTtcbiAgICAgIGNvbnN0IG90aGVyID0gcG9zICsgZGVsdGE7XG4gICAgICBpZiAoIXRoaXMudGlsZXNldC5jaGVjayh1aWQsIHRoaXMuX3NjcmVlbnNbb3RoZXJdLCBkZWx0YSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5zZXRJbnRlcm5hbChwb3MsIHVpZCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzZXRFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSwgc3BlYzogRXhpdFNwZWMpIHtcbiAgICBjb25zdCBvdGhlciA9IHRoaXMucm9tLmxvY2F0aW9uc1tzcGVjWzBdID4+PiA4XS5tZXRhO1xuICAgIGlmICghb3RoZXIpIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHNldCB0d28td2F5IGV4aXQgd2l0aG91dCBtZXRhYCk7XG4gICAgdGhpcy5zZXRFeGl0T25lV2F5KHBvcywgdHlwZSwgc3BlYyk7XG4gICAgb3RoZXIuc2V0RXhpdE9uZVdheShzcGVjWzBdICYgMHhmZiwgc3BlY1sxXSwgW3RoaXMuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICB9XG4gIHNldEV4aXRPbmVXYXkocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlLCBzcGVjOiBFeGl0U3BlYykge1xuICAgIC8vIGNvbnN0IHByZXYgPSB0aGlzLl9leGl0cy5nZXQocG9zLCB0eXBlKTtcbiAgICAvLyBpZiAocHJldikge1xuICAgIC8vICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlswXSA+Pj4gOF0ubWV0YTtcbiAgICAvLyAgIGlmIChvdGhlcikgb3RoZXIuX2V4aXRzLmRlbGV0ZShwcmV2WzBdICYgMHhmZiwgcHJldlsxXSk7XG4gICAgLy8gfVxuICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIHNwZWMpO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvdW50ZWQgY2FuZGlkYXRlcz9cbiAgZXhpdENhbmRpZGF0ZXModHlwZTogQ29ubmVjdGlvblR5cGUpOiBudW1iZXJbXSB7XG4gICAgLy8gVE9ETyAtIGZpZ3VyZSBvdXQgYSB3YXkgdG8gdXNlIHRoZSBkb3VibGUtc3RhaXJjYXNlPyAgaXQgd29uJ3RcbiAgICAvLyBoYXBwZW4gY3VycmVudGx5IGJlY2F1c2UgaXQncyBmaXhlZCwgc28gaXQncyBleGNsdWRlZC4uLi4/XG4gICAgY29uc3QgaGFzRXhpdDogbnVtYmVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNjciBvZiB0aGlzLnRpbGVzZXQpIHtcbiAgICAgIGlmIChzY3IuZGF0YS5leGl0cz8uc29tZShlID0+IGUudHlwZSA9PT0gdHlwZSkpIGhhc0V4aXQucHVzaChzY3IuaWQpO1xuICAgIH1cbiAgICByZXR1cm4gaGFzRXhpdDtcbiAgfVxuXG4gIC8vIE5PVEU6IGNhbmRpZGF0ZXMgcHJlLXNodWZmbGVkP1xuICB0cnlBZGRPbmVPZihwb3M6IFBvcywgY2FuZGlkYXRlczogVWlkW10pOiBib29sZWFuIHtcbiAgICAvLyBjaGVjayBuZWlnaGJvcnMuLi4gLSBUT0RPIC0gbmVlZCB0byBkaXN0aW5ndWlzaCBlbXB0eSBmcm9tIHVuc2V0Li4uIDotKFxuICAgIC8vIGFsdGVybmF0aXZlbHksIHdlIGNvdWxkIF9GSVhfIHRoZSBtYW5kYXRvcnkgZW1wdGllcy4uLj9cblxuICAgIC8vIEJVVC4uLiB3aGVyZSBkbyB3ZSBldmVuIGtlZXAgdHJhY2sgb2YgaXQ/XG4gICAgLy8gIC0gaXMgZml4ZWQgdGhlIGNvbmNlcm4gb2YgY2F2ZSBvciBtZXRhbG9jP1xuICAgIC8vIGNvbnN0IGZlYXR1cmUgPSB0aGlzLl9mZWF0dXJlcy5nZXQocG9zKTtcbiAgICBcblxuICAgIC8vIGNvbnN0IHNjciA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW3VpZF07XG4gICAgLy8gaWYgKGZlYXR1cmUgIT0gbnVsbCAmJiAhc2NyLmhhc0ZlYXR1cmUoZmVhdHVyZSkpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XG4gICAgICBpZiAodGhpcy5zZXQocG9zLCBjYW5kaWRhdGUpKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuXG5cbiAgfVxuXG4gIC8vIFRPRE8gLSBzaG9ydCB2cyBmdWxsP1xuICBzaG93KCk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICBsZXQgbGluZSA9IFtdO1xuICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICBsaW5lLnB1c2goeC50b1N0cmluZygxNikpO1xuICAgIH1cbiAgICBsaW5lcy5wdXNoKCcgICAnICsgbGluZS5qb2luKCcgICcpKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgMzsgcisrKSB7XG4gICAgICAgIGxpbmUgPSBbciA9PT0gMSA/IHkudG9TdHJpbmcoMTYpIDogJyAnLCAnICddO1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW3RoaXMuX3NjcmVlbnNbKHkgKyAxKSA8PCA0IHwgeF1dO1xuICAgICAgICAgIGxpbmUucHVzaChzY3JlZW4/LmRhdGEuaWNvbj8uZnVsbFtyXSA/PyAociA9PT0gMSA/ICcgPyAnIDogJyAgICcpKTtcbiAgICAgICAgfVxuICAgICAgICBsaW5lcy5wdXNoKGxpbmUuam9pbignJykpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICBzY3JlZW5OYW1lcygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBsZXQgbGluZSA9IFtdO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20ubWV0YXNjcmVlbnNbdGhpcy5fc2NyZWVuc1soeSArIDEpIDw8IDQgfCB4XV07XG4gICAgICAgIGxpbmUucHVzaChzY3JlZW4/Lm5hbWUpO1xuICAgICAgfVxuICAgICAgbGluZXMucHVzaChsaW5lLmpvaW4oJyAnKSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHNhdmVFeGN1cnNpb24oZjogKCkgPT4gYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGxldCBzY3JlZW5zID0gWy4uLnRoaXMuX3NjcmVlbnNdO1xuICAgIGxldCBjb3VudHMgPSB0aGlzLl9jb3VudHMgJiYgWy4uLnRoaXMuX2NvdW50c107XG4gICAgbGV0IGZpbGxlZCA9IHRoaXMuX2ZpbGxlZDtcbiAgICBsZXQgZmVhdHVyZXMgPSBbLi4udGhpcy5fZmVhdHVyZXNdO1xuICAgIGxldCBvayA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBvayA9IGYoKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKG9rKSByZXR1cm4gdHJ1ZTtcbiAgICAgIHRoaXMuX3NjcmVlbnMgPSBzY3JlZW5zO1xuICAgICAgaWYgKGNvdW50cykgdGhpcy5fY291bnRzID0gbmV3IE11bHRpc2V0KGNvdW50cyk7XG4gICAgICB0aGlzLl9maWxsZWQgPSBmaWxsZWQ7XG4gICAgICB0aGlzLl9mZWF0dXJlcyA9IG5ldyBNYXAoZmVhdHVyZXMpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB0cmF2ZXJzZShvcHRzOiBUcmF2ZXJzZU9wdHMgPSB7fSk6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PiB7XG4gICAgLy8gUmV0dXJucyBhIG1hcCBmcm9tIHVuaW9uZmluZCByb290IHRvIGEgbGlzdCBvZiBhbGwgcmVhY2hhYmxlIHRpbGVzLlxuICAgIC8vIEFsbCBlbGVtZW50cyBvZiBzZXQgYXJlIGtleXMgcG9pbnRpbmcgdG8gdGhlIHNhbWUgdmFsdWUgcmVmLlxuICAgIGNvbnN0IHdpdGhvdXQgPSBuZXcgU2V0KG9wdHMud2l0aG91dCB8fCBbXSk7XG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPG51bWJlcj4oKTtcbiAgICBjb25zdCBjb25uZWN0aW9uVHlwZSA9IChvcHRzLmZsaWdodCA/IDIgOiAwKSB8IChvcHRzLm5vRmxhZ2dlZCA/IDEgOiAwKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBpZiAod2l0aG91dC5oYXMocG9zKSkgY29udGludWU7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3BvcyArIDE2XTtcbiAgICAgIGNvbnN0IG1zID0gdGhpcy5yb20ubWV0YXNjcmVlbnNbc2NyXTtcbiAgICAgIC8vaWYgKG9wdHMuZmxpZ2h0ICYmIHNwZWMuZGVhZEVuZCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2YgbXMuY29ubmVjdGlvbnNbY29ubmVjdGlvblR5cGVdKSB7XG4gICAgICAgIC8vIENvbm5lY3Qgd2l0aGluIGVhY2ggc2VnbWVudFxuICAgICAgICB1Zi51bmlvbihzZWdtZW50Lm1hcChjID0+IChwb3MgPDwgOCkgKyBjKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigpO1xuICAgIGNvbnN0IHNldHMgPSB1Zi5zZXRzKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzZXQgPSBzZXRzW2ldO1xuICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNldCkge1xuICAgICAgICBtYXAuc2V0KGVsZW0sIHNldCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hcDtcbiAgfSAgXG5cbiAgLyoqIEByZXR1cm4gW3Bvc2l0aW9uLCBkaXJlY3Rpb24gb2YgZWRnZSwgc2NyZWVuIGF0IGVkZ2UsIHRydWUgaWYgZXhpdC4gKi9cbiAgKiBib3JkZXJzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W1BvcywgRGlyLCBVaWQsIGJvb2xlYW5dPiB7XG4gICAgY29uc3QgZXhpdCA9IHRoaXMudGlsZXNldC5leGl0LnVpZDtcbiAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgY29uc3QgdG9wID0geDtcbiAgICAgIGNvbnN0IGJvdHRvbSA9IHRoaXMuaGVpZ2h0IDw8IDQgfCB4O1xuICAgICAgeWllbGQgW3RvcCwgRGlyLk4sIHRoaXMuX3NjcmVlbnNbdG9wICsgMTZdLCB0aGlzLl9zY3JlZW5zW3RvcF0gPT09IGV4aXRdO1xuICAgICAgeWllbGQgW2JvdHRvbSwgRGlyLlMsIHRoaXMuX3NjcmVlbnNbYm90dG9tICsgMTZdLFxuICAgICAgICAgICAgIHRoaXMuX3NjcmVlbnNbYm90dG9tICsgMzJdID09PSBleGl0XTtcbiAgICB9XG4gICAgZm9yIChsZXQgeSA9IDE7IHkgPD0gdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3QgbGVmdCA9IHkgPDwgNDtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gbGVmdCB8ICh0aGlzLndpZHRoIC0gMSk7XG4gICAgICB5aWVsZCBbbGVmdCwgRGlyLlcsIHRoaXMuX3NjcmVlbnNbbGVmdCArIDE2XSxcbiAgICAgICAgICAgICB0aGlzLl9zY3JlZW5zW2xlZnQgKyAxNV0gPT09IGV4aXRdO1xuICAgICAgeWllbGQgW3JpZ2h0LCBEaXIuRSwgdGhpcy5fc2NyZWVuc1tyaWdodCArIDE2XSxcbiAgICAgICAgICAgICB0aGlzLl9zY3JlZW5zW3JpZ2h0ICsgMTddID09PSBleGl0XTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXR0YWNoIGFuIGV4aXQvZW50cmFuY2UgcGFpciBpbiB0d28gZGlyZWN0aW9ucy5cbiAgICogQWxzbyByZWF0dGFjaGVzIHRoZSBmb3JtZXIgb3RoZXIgZW5kcyBvZiBlYWNoIHRvIGVhY2ggb3RoZXIuXG4gICAqL1xuICBhdHRhY2goc3JjUG9zOiBQb3MsIGRlc3Q6IE1ldGFsb2NhdGlvbiwgZGVzdFBvczogUG9zLFxuICAgICAgICAgc3JjVHlwZT86IENvbm5lY3Rpb25UeXBlLCBkZXN0VHlwZT86IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgaWYgKCFzcmNUeXBlKSBzcmNUeXBlID0gdGhpcy5waWNrVHlwZUZyb21FeGl0cyhzcmNQb3MpO1xuICAgIGlmICghZGVzdFR5cGUpIGRlc3RUeXBlID0gZGVzdC5waWNrVHlwZUZyb21FeGl0cyhkZXN0UG9zKTtcblxuICAgIC8vIFRPRE8gLSB3aGF0IGlmIG11bHRpcGxlIHJldmVyc2VzPyAgZS5nLiBjb3JkZWwgZWFzdC93ZXN0P1xuICAgIC8vICAgICAgLSBjb3VsZCBkZXRlcm1pbmUgaWYgdGhpcyBhbmQvb3IgZGVzdCBoYXMgYW55IHNlYW1sZXNzLlxuICAgIC8vIE5vOiBpbnN0ZWFkLCBkbyBhIHBvc3QtcHJvY2Vzcy4gIE9ubHkgY29yZGVsIG1hdHRlcnMsIHNvIGdvXG4gICAgLy8gdGhyb3VnaCBhbmQgYXR0YWNoIGFueSByZWR1bmRhbnQgZXhpdHMuXG5cbiAgICBjb25zdCBkZXN0VGlsZSA9IGRlc3QuaWQgPDwgOCB8IGRlc3RQb3M7XG4gICAgY29uc3QgcHJldkRlc3QgPSB0aGlzLl9leGl0cy5nZXQoc3JjUG9zLCBzcmNUeXBlKSE7XG4gICAgaWYgKHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldkRlc3RUaWxlLCBwcmV2RGVzdFR5cGVdID0gcHJldkRlc3Q7XG4gICAgICBpZiAocHJldkRlc3RUaWxlID09PSBkZXN0VGlsZSAmJiBwcmV2RGVzdFR5cGUgPT09IGRlc3RUeXBlKSByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHByZXZTcmMgPSBkZXN0Ll9leGl0cy5nZXQoZGVzdFBvcywgZGVzdFR5cGUpITtcbiAgICB0aGlzLl9leGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXSk7XG4gICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RQb3MsIGRlc3RUeXBlLCBbdGhpcy5pZCA8PCA4IHwgc3JjUG9zLCBzcmNUeXBlXSk7XG4gICAgLy8gYWxzbyBob29rIHVwIHByZXZpb3VzIHBhaXJcbiAgICBpZiAocHJldlNyYyAmJiBwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZEZXN0VGlsZSwgcHJldkRlc3RUeXBlXSA9IHByZXZEZXN0O1xuICAgICAgY29uc3QgW3ByZXZTcmNUaWxlLCBwcmV2U3JjVHlwZV0gPSBwcmV2U3JjO1xuICAgICAgY29uc3QgcHJldlNyY01ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlNyY1RpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBjb25zdCBwcmV2RGVzdE1ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldkRlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgcHJldlNyY01ldGEuX2V4aXRzLnNldChwcmV2U3JjVGlsZSAmIDB4ZmYsIHByZXZTcmNUeXBlLCBwcmV2RGVzdCk7XG4gICAgICBwcmV2RGVzdE1ldGEuX2V4aXRzLnNldChwcmV2RGVzdFRpbGUgJiAweGZmLCBwcmV2RGVzdFR5cGUsIHByZXZTcmMpO1xuICAgIH0gZWxzZSBpZiAocHJldlNyYyB8fCBwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZUaWxlLCBwcmV2VHlwZV0gPSBwcmV2U3JjIHx8IHByZXZEZXN0O1xuICAgICAgY29uc3QgcHJldk1ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBwcmV2TWV0YS5fZXhpdHMuZGVsZXRlKHByZXZUaWxlICYgMHhmZiwgcHJldlR5cGUpOyAgICAgIFxuICAgIH1cbiAgfVxuXG4gIHBpY2tUeXBlRnJvbUV4aXRzKHBvczogUG9zKTogQ29ubmVjdGlvblR5cGUge1xuICAgIGNvbnN0IHR5cGVzID0gWy4uLnRoaXMuX2V4aXRzLnJvdyhwb3MpLmtleXMoKV07XG4gICAgaWYgKCF0eXBlcy5sZW5ndGgpIHJldHVybiB0aGlzLnBpY2tUeXBlRnJvbVNjcmVlbnMocG9zKTtcbiAgICBpZiAodHlwZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzaW5nbGUgdHlwZSBmb3IgJHtoZXgocG9zKX06IFske3R5cGVzLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZXNbMF07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYW4gZXhpdCBmcm9tIG9uZSBwb3MvdHlwZSB0byBhbm90aGVyLlxuICAgKiBBbHNvIHVwZGF0ZXMgdGhlIG1ldGFsb2NhdGlvbiBvbiB0aGUgb3RoZXIgZW5kIG9mIHRoZSBleGl0LlxuICAgKiBUaGlzIHNob3VsZCB0eXBpY2FsbHkgYmUgZG9uZSBhdG9taWNhbGx5IGlmIHJlYnVpbGRpbmcgYSBtYXAuXG4gICAqL1xuICAvLyBUT0RPIC0gcmVidWlsZGluZyBhIG1hcCBpbnZvbHZlcyBtb3ZpbmcgdG8gYSBORVcgbWV0YWxvY2F0aW9uLi4uXG4gIC8vICAgICAgLSBnaXZlbiB0aGlzLCB3ZSBuZWVkIGEgZGlmZmVyZW50IGFwcHJvYWNoP1xuICBtb3ZlRXhpdHMoLi4ubW92ZXM6IEFycmF5PFtQb3MsIENvbm5lY3Rpb25UeXBlLCBQb3MsIENvbm5lY3Rpb25UeXBlXT4pIHtcbiAgICBjb25zdCBuZXdFeGl0czogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtvbGRQb3MsIG9sZFR5cGUsIG5ld1BvcywgbmV3VHlwZV0gb2YgbW92ZXMpIHtcbiAgICAgIGNvbnN0IGRlc3RFeGl0ID0gdGhpcy5fZXhpdHMuZ2V0KG9sZFBvcywgb2xkVHlwZSkhO1xuICAgICAgY29uc3QgW2Rlc3RUaWxlLCBkZXN0VHlwZV0gPSBkZXN0RXhpdDtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICBbdGhpcy5pZCA8PCA4IHwgbmV3UG9zLCBuZXdUeXBlXSk7XG4gICAgICBuZXdFeGl0cy5wdXNoKFtuZXdQb3MsIG5ld1R5cGUsIGRlc3RFeGl0XSk7XG4gICAgICB0aGlzLl9leGl0cy5kZWxldGUob2xkUG9zLCBvbGRUeXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBleGl0XSBvZiBuZXdFeGl0cykge1xuICAgICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgZXhpdCk7XG4gICAgfVxuICB9XG5cbiAgbW92ZUV4aXQocHJldjogUG9zLCBuZXh0OiBQb3MsXG4gICAgICAgICAgIHByZXZUeXBlPzogQ29ubmVjdGlvblR5cGUsIG5leHRUeXBlPzogQ29ubmVjdGlvblR5cGUpIHtcbiAgICBpZiAoIXByZXZUeXBlKSBwcmV2VHlwZSA9IHRoaXMucGlja1R5cGVGcm9tRXhpdHMocHJldik7XG4gICAgaWYgKCFuZXh0VHlwZSkgbmV4dFR5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbVNjcmVlbnMobmV4dCk7XG4gICAgY29uc3QgZGVzdEV4aXQgPSB0aGlzLl9leGl0cy5nZXQocHJldiwgcHJldlR5cGUpITtcbiAgICBjb25zdCBbZGVzdFRpbGUsIGRlc3RUeXBlXSA9IGRlc3RFeGl0O1xuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIFt0aGlzLmlkIDw8IDggfCBuZXh0LCBuZXh0VHlwZV0pO1xuICAgIHRoaXMuX2V4aXRzLnNldChuZXh0LCBuZXh0VHlwZSwgZGVzdEV4aXQpO1xuICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwcmV2LCBwcmV2VHlwZSk7XG4gIH0gIFxuXG4gIHBpY2tUeXBlRnJvbVNjcmVlbnMocG9zOiBQb3MpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgY29uc3QgZXhpdHMgPSB0aGlzLnJvbS5tZXRhc2NyZWVuc1t0aGlzLl9zY3JlZW5zW3BvcyArIDE2XV0uZGF0YS5leGl0cztcbiAgICBjb25zdCB0eXBlcyA9IChleGl0cyA/PyBbXSkubWFwKGUgPT4gZS50eXBlKTtcbiAgICBpZiAodHlwZXMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHNpbmdsZSB0eXBlIGZvciAke2hleChwb3MpfTogWyR7dHlwZXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlc1swXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIHNlYW1sZXNzIHBhaXIgbG9jYXRpb24sIHN5bmMgdXAgdGhlIGV4aXRzLiAgRm9yIGVhY2ggZXhpdCBvZlxuICAgKiBlaXRoZXIsIGNoZWNrIGlmIGl0J3Mgc3ltbWV0cmljLCBhbmQgaWYgc28sIGNvcHkgaXQgb3ZlciB0byB0aGUgb3RoZXIgc2lkZS5cbiAgICovXG4gIHJlY29uY2lsZUV4aXRzKHRoYXQ6IE1ldGFsb2NhdGlvbikge1xuICAgIGNvbnN0IGV4aXRzOiBbUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dIG9mIGxvYy5fZXhpdHMpIHtcbiAgICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF07XG4gICAgICAgIGNvbnN0IHJldmVyc2UgPSBkZXN0Lm1ldGEuX2V4aXRzLmdldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlKTtcbiAgICAgICAgaWYgKCFyZXZlcnNlKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgW3JldlRpbGUsIHJldlR5cGVdID0gcmV2ZXJzZTtcbiAgICAgICAgaWYgKChyZXZUaWxlID4+PiA4KSA9PT0gbG9jLmlkICYmIChyZXZUaWxlICYgMHhmZikgPT09IHBvcyAmJlxuICAgICAgICAgICAgcmV2VHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgIGV4aXRzLnB1c2goW3BvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9leGl0cyA9IG5ldyBUYWJsZShleGl0cyk7XG4gICAgdGhhdC5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNhdmVzIHRoZSBjdXJyZW50IHN0YXRlIGJhY2sgaW50byB0aGUgdW5kZXJseWluZyBsb2NhdGlvbi5cbiAgICogQ3VycmVudGx5IHRoaXMgb25seSBkZWFscyB3aXRoIGVudHJhbmNlcy9leGl0cy5cbiAgICovXG4gIHdyaXRlKCkge1xuICAgIGNvbnN0IHNyY0xvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBmb3IgKGNvbnN0IFtzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgY29uc3Qgc3JjU2NyZWVuID0gdGhpcy5yb20ubWV0YXNjcmVlbnNbdGhpcy5fc2NyZWVuc1tzcmNQb3MgKyAweDEwXV07XG4gICAgICBjb25zdCBkZXN0ID0gZGVzdFRpbGUgPj4gODtcbiAgICAgIGxldCBkZXN0UG9zID0gZGVzdFRpbGUgJiAweGZmO1xuICAgICAgY29uc3QgZGVzdExvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0XTtcbiAgICAgIGNvbnN0IGRlc3RNZXRhID0gZGVzdExvYy5tZXRhITtcbiAgICAgIGNvbnN0IGRlc3RTY3JlZW4gPVxuICAgICAgICAgIHRoaXMucm9tLm1ldGFzY3JlZW5zW2Rlc3RNZXRhLl9zY3JlZW5zWyhkZXN0VGlsZSAmIDB4ZmYpICsgMHgxMF1dO1xuICAgICAgY29uc3Qgc3JjRXhpdCA9IHNyY1NjcmVlbi5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSBzcmNUeXBlKTtcbiAgICAgIGNvbnN0IGRlc3RFeGl0ID0gZGVzdFNjcmVlbi5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSBkZXN0VHlwZSk7XG4gICAgICBpZiAoIXNyY0V4aXQgfHwgIWRlc3RFeGl0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBleGl0OlxuICBGcm9tOiAke3NyY0xvY30gQCAke2hleChzcmNQb3MpfToke3NyY1R5cGV9ICR7c3JjU2NyZWVuLm5hbWV9XG4gIFRvOiAgICR7ZGVzdExvY30gQCAke2hleChkZXN0UG9zKX06JHtkZXN0VHlwZX0gJHtkZXN0U2NyZWVuLm5hbWV9YCk7XG4gICAgICB9XG4gICAgICAvLyBTZWUgaWYgdGhlIGRlc3QgZW50cmFuY2UgZXhpc3RzIHlldC4uLlxuICAgICAgbGV0IGVudHJhbmNlID0gMHgyMDtcbiAgICAgIGlmICghZGVzdEV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgIGxldCBkZXN0Q29vcmQgPSBkZXN0RXhpdC5lbnRyYW5jZTtcbiAgICAgICAgaWYgKGRlc3RDb29yZCA+IDB4ZWZmZikgeyAvLyBoYW5kbGUgc3BlY2lhbCBjYXNlIGluIE9ha1xuICAgICAgICAgIGRlc3RQb3MgKz0gMHgxMDtcbiAgICAgICAgICBkZXN0Q29vcmQgLT0gMHgxMDAwMDtcbiAgICAgICAgfVxuICAgICAgICBlbnRyYW5jZSA9IGRlc3RMb2MuZmluZE9yQWRkRW50cmFuY2UoZGVzdFBvcywgZGVzdENvb3JkKTtcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IHRpbGUgb2Ygc3JjRXhpdC5leGl0cykge1xuICAgICAgICAvL2lmIChzcmNFeGl0LnR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgdGhpcy5oZWlnaHQgPT09IDEpIHRpbGUgLT0gMHgyMDtcbiAgICAgICAgc3JjTG9jLmV4aXRzLnB1c2goRXhpdC5vZih7c2NyZWVuOiBzcmNQb3MsIHRpbGUsIGRlc3QsIGVudHJhbmNlfSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBzcmNMb2Mud2lkdGggPSB0aGlzLl93aWR0aDtcbiAgICBzcmNMb2MuaGVpZ2h0ID0gdGhpcy5faGVpZ2h0O1xuICAgIHNyY0xvYy5zY3JlZW5zID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93OiBudW1iZXJbXSA9IFtdO1xuICAgICAgc3JjTG9jLnNjcmVlbnMucHVzaChyb3cpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl93aWR0aDsgeCsrKSB7XG4gICAgICAgIHJvdy5wdXNoKHRoaXMucm9tLm1ldGFzY3JlZW5zW3RoaXMuX3NjcmVlbnNbKHkgKyAxKSA8PCA0IHwgeF1dLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3JjTG9jLnRpbGVzZXQgPSB0aGlzLnRpbGVzZXQudGlsZXNldElkO1xuICAgIHNyY0xvYy50aWxlRWZmZWN0cyA9IHRoaXMudGlsZXNldC5lZmZlY3RzKCkuaWQ7XG5cbiAgICAvLyB3cml0ZSBmbGFnc1xuICAgIHNyY0xvYy5mbGFncyA9IFtdO1xuICAgIGNvbnN0IGZyZWVGbGFncyA9IFsuLi50aGlzLmZyZWVGbGFnc107XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5yb20ubWV0YXNjcmVlbnNbdGhpcy5fc2NyZWVuc1tzY3JlZW4gKyAxNl1dO1xuICAgICAgbGV0IGZsYWc6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgICBpZiAoc2NyLmRhdGEud2FsbCAhPSBudWxsKSB7XG4gICAgICAgIGZsYWcgPSBmcmVlRmxhZ3MucG9wKCk/LmlkID8/IHRoaXMucm9tLmZsYWdzLmFsbG9jKDB4MjAwKTtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdhbHdheXMnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2NhbG0nKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5DYWxtZWRBbmdyeVNlYS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206ZmFsc2UnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206dHJ1ZScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMuY3VzdG9tRmxhZ3MuZ2V0KHNjcmVlbik/LmlkID8/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQ7XG4gICAgICB9XG4gICAgICBpZiAoZmxhZyAhPSBudWxsKSB7XG4gICAgICAgIHNyY0xvYy5mbGFncy5wdXNoKExvY2F0aW9uRmxhZy5vZih7c2NyZWVuLCBmbGFnfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9tb25zdGVyc0ludmFsaWRhdGVkKSB7XG4gICAgICAvLyBUT0RPIC0gaWYgbW9uc3RlcnMgaW52YWxpZGF0ZWQsIHRoZW4gcmVwbGFjZSB0aGVtLi4uXG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBUcmF2ZXJzZU9wdHMge1xuICAvLyBEbyBub3QgcGFzcyBjZXJ0YWluIHRpbGVzIGluIHRyYXZlcnNlXG4gIHJlYWRvbmx5IHdpdGhvdXQ/OiByZWFkb25seSBQb3NbXTtcbiAgLy8gV2hldGhlciB0byBicmVhayB3YWxscy9mb3JtIGJyaWRnZXNcbiAgcmVhZG9ubHkgbm9GbGFnZ2VkPzogYm9vbGVhbjtcbiAgLy8gV2hldGhlciB0byBhc3N1bWUgZmxpZ2h0XG4gIHJlYWRvbmx5IGZsaWdodD86IGJvb2xlYW47XG59XG5cblxuY29uc3QgdW5rbm93bkV4aXRXaGl0ZWxpc3QgPSBuZXcgU2V0KFtcbiAgMHgwMTAwM2EsIC8vIHRvcCBwYXJ0IG9mIGNhdmUgb3V0c2lkZSBzdGFydFxuICAweDAxMDAzYixcbiAgMHgwMTAwNzAsIC8vIGJlbmVhdGggZW50cmFuY2UgdG8gbGVhZlxuICAweDAyMTE1ZiwgLy8gbGVhZiBzaWRlIG9mIHRoZSBhYm92ZVxuICAweDE0NDBhMCwgLy8gYmVuZWF0aCBlbnRyYW5jZSB0byBicnlubWFlclxuICAweDE1NDBhMCwgLy8gXCIgXCIgc2VhbWxlc3MgZXF1aXZhbGVudCBcIiBcIlxuICAweDFhMzA2MCwgLy8gc3dhbXAgZXhpdFxuICAweDFhMzBhMCxcbiAgMHg0MDIwMDAsIC8vIGJyaWRnZSB0byBmaXNoZXJtYW4gaXNsYW5kXG4gIDB4NDAyMDMwLFxuICAweDQxODBkMCwgLy8gYmVsb3cgZXhpdCB0byBsaW1lIHRyZWUgdmFsbGV5XG4gIDB4NjA4N2JmLCAvLyBiZWxvdyBib2F0IGNoYW5uZWxcbiAgMHhhMTAzMjYsIC8vIGNyeXB0IDIgYXJlbmEgbm9ydGggZWRnZVxuICAweGExMDMyOSxcbiAgMHhhOTA2MjYsIC8vIHN0YWlycyBhYm92ZSBrZWxieSAyXG4gIDB4YTkwNjI5LFxuXSk7XG5cbmNvbnN0IERQT1MgPSBbLTE2LCAtMSwgMTYsIDFdO1xuIl19