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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFHL0QsT0FBTyxFQUFDLEdBQUcsRUFBYyxNQUFNLGtCQUFrQixDQUFDO0FBQ2xELE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFOUIsT0FBTyxFQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2xELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUMxQyxPQUFPLEVBQTBCLFdBQVcsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRXpFLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFxQ2pCLE1BQU0sT0FBTyxZQUFZO0lBOEJ2QixZQUFxQixFQUFVLEVBQVcsT0FBb0IsRUFDbEQsTUFBYyxFQUFFLEtBQWE7UUFEcEIsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUFXLFlBQU8sR0FBUCxPQUFPLENBQWE7UUF4QjlELGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUNuQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVEsQ0FBQztRQVVwQixTQUFJLEdBQW9CLFNBQVMsQ0FBQztRQUt6QixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFOUMsWUFBTyxHQUFHLENBQUMsQ0FBQztRQUNaLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBQ25DLFdBQU0sR0FBRyxJQUFJLEtBQUssRUFBaUMsQ0FBQztRQUVwRCx5QkFBb0IsR0FBRyxLQUFLLENBQUM7UUFJbkMsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ3ZC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UixRQUFRO0lBQ1IsUUFBUTtDQUNULENBQUMsQ0FBQztBQUVILE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnLi9sb2NhdGlvbi5qcyc7IC8vIGltcG9ydCB0eXBlXG5pbXBvcnQge0V4aXQsIEZsYWcgYXMgTG9jYXRpb25GbGFnfSBmcm9tICcuL2xvY2F0aW9udGFibGVzLmpzJztcbmltcG9ydCB7RmxhZ30gZnJvbSAnLi9mbGFncy5qcyc7XG5pbXBvcnQge01ldGFzY3JlZW4sIFVpZH0gZnJvbSAnLi9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7RGlyLCBNZXRhdGlsZXNldH0gZnJvbSAnLi9tZXRhdGlsZXNldC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtNdWx0aXNldCwgVGFibGUsIGl0ZXJzfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHtDb25uZWN0aW9uVHlwZSwgRmVhdHVyZSwgZmVhdHVyZU1hc2t9IGZyb20gJy4vbWV0YXNjcmVlbmRhdGEuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG4vLyBNb2RlbCBvZiBhIGxvY2F0aW9uIHdpdGggbWV0YXNjcmVlbnMsIGV0Yy5cblxuLy8gVHJpY2s6IHdlIG5lZWQgc29tZXRoaW5nIHRvIG93biB0aGUgbmVpZ2hib3IgY2FjaGUuXG4vLyAgLSBwcm9iYWJseSB0aGlzIGJlbG9uZ3MgaW4gdGhlIE1ldGF0aWxlc2V0LlxuLy8gIC0gbWV0aG9kIHRvIHJlZ2VuZXJhdGUsIGRvIGl0IGFmdGVyIHRoZSBzY3JlZW4gbW9kcz9cbi8vIERhdGEgd2Ugd2FudCB0byBrZWVwIHRyYWNrIG9mOlxuLy8gIC0gZ2l2ZW4gdHdvIHNjcmVlbnMgYW5kIGEgZGlyZWN0aW9uLCBjYW4gdGhleSBhYnV0P1xuLy8gIC0gZ2l2ZW4gYSBzY3JlZW4gYW5kIGEgZGlyZWN0aW9uLCB3aGF0IHNjcmVlbnMgb3Blbi9jbG9zZSB0aGF0IGVkZ2U/XG4vLyAgICAtIHdoaWNoIG9uZSBpcyB0aGUgXCJkZWZhdWx0XCI/XG5cbi8vIFRPRE8gLSBjb25zaWRlciBhYnN0cmFjdGluZyBleGl0cyBoZXJlP1xuLy8gIC0gZXhpdHM6IEFycmF5PFtFeGl0U3BlYywgbnVtYmVyLCBFeGl0U3BlY10+XG4vLyAgLSBFeGl0U3BlYyA9IHt0eXBlPzogQ29ubmVjdGlvblR5cGUsIHNjcj86IG51bWJlcn1cbi8vIEhvdyB0byBoYW5kbGUgY29ubmVjdGluZyB0aGVtIGNvcnJlY3RseT9cbi8vICAtIHNpbXBseSBzYXlpbmcgXCItPiB3YXRlcmZhbGwgdmFsbGV5IGNhdmVcIiBpcyBub3QgaGVscGZ1bCBzaW5jZSB0aGVyZSdzIDJcbi8vICAgIG9yIFwiLT4gd2luZCB2YWxsZXkgY2F2ZVwiIHdoZW4gdGhlcmUncyA1LlxuLy8gIC0gdXNlIHNjcklkIGFzIHVuaXF1ZSBpZGVudGlmaWVyPyAgb25seSBwcm9ibGVtIGlzIHNlYWxlZCBjYXZlIGhhcyAzLi4uXG4vLyAgLSBtb3ZlIHRvIGRpZmZlcmVudCBzY3JlZW4gYXMgbmVjZXNzYXJ5Li4uXG4vLyAgICAoY291bGQgYWxzbyBqdXN0IGRpdGNoIHRoZSBvdGhlciB0d28gYW5kIHRyZWF0IHdpbmRtaWxsIGVudHJhbmNlIGFzXG4vLyAgICAgYSBkb3duIGVudHJhbmNlIC0gc2FtZSB3LyBsaWdodGhvdXNlPylcbi8vICAtIG9ubHkgYSBzbWFsbCBoYW5kZnVsbCBvZiBsb2NhdGlvbnMgaGF2ZSBkaXNjb25uZWN0ZWQgY29tcG9uZW50czpcbi8vICAgICAgd2luZG1pbGwsIGxpZ2h0aG91c2UsIHB5cmFtaWQsIGdvYSBiYWNrZG9vciwgc2FiZXJhLCBzYWJyZS9oeWRyYSBsZWRnZXNcbi8vICAtIHdlIHJlYWxseSBkbyBjYXJlIHdoaWNoIGlzIGluIHdoaWNoIGNvbXBvbmVudC5cbi8vICAgIGJ1dCBtYXAgZWRpdHMgbWF5IGNoYW5nZSBldmVuIHRoZSBudW1iZXIgb2YgY29tcG9uZW50cz8/P1xuLy8gIC0gZG8gd2UgZG8gZW50cmFuY2Ugc2h1ZmZsZSBmaXJzdCBvciBtYXAgc2h1ZmZsZSBmaXJzdD9cbi8vICAgIG9yIGFyZSB0aGV5IGludGVybGVhdmVkPyE/XG4vLyAgICBpZiB3ZSBzaHVmZmxlIHNhYnJlIG92ZXJ3b3JsZCB0aGVuIHdlIG5lZWQgdG8ga25vdyB3aGljaCBjYXZlcyBjb25uZWN0XG4vLyAgICB0byB3aGljaC4uLiBhbmQgcG9zc2libHkgY2hhbmdlIHRoZSBjb25uZWN0aW9ucz9cbi8vICAgIC0gbWF5IG5lZWQgbGVld2F5IHRvIGFkZC9zdWJ0cmFjdCBjYXZlIGV4aXRzPz9cbi8vIFByb2JsZW0gaXMgdGhhdCBlYWNoIGV4aXQgaXMgY28tb3duZWQgYnkgdHdvIG1ldGFsb2NhdGlvbnMuXG5cblxuZXhwb3J0IHR5cGUgUG9zID0gbnVtYmVyO1xuZXhwb3J0IHR5cGUgRXhpdFNwZWMgPSByZWFkb25seSBbUG9zLCBDb25uZWN0aW9uVHlwZV07XG5cbmV4cG9ydCBjbGFzcyBNZXRhbG9jYXRpb24ge1xuXG4gIC8vIFRPRE8gLSBzdG9yZSBtZXRhZGF0YSBhYm91dCB3aW5kbWlsbCBmbGFnPyAgdHdvIG1ldGFsb2NzIHdpbGwgbmVlZCBhIHBvcyB0b1xuICAvLyBpbmRpY2F0ZSB3aGVyZSB0aGF0IGZsYWcgc2hvdWxkIGdvLi4uPyAgT3Igc3RvcmUgaXQgaW4gdGhlIG1ldGFzY3JlZW4/XG5cbiAgLy8gQ2F2ZXMgYXJlIGFzc3VtZWQgdG8gYmUgYWx3YXlzIG9wZW4gdW5sZXNzIHRoZXJlJ3MgYSBmbGFnIHNldCBoZXJlLi4uXG4gIGN1c3RvbUZsYWdzID0gbmV3IE1hcDxQb3MsIEZsYWc+KCk7XG4gIGZyZWVGbGFncyA9IG5ldyBTZXQ8RmxhZz4oKTtcblxuICByZWFkb25seSByb206IFJvbTtcbiAgcHJpdmF0ZSByZWFkb25seSBfZW1wdHk6IFVpZDtcblxuICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgcHJpdmF0ZSBfd2lkdGg6IG51bWJlcjtcblxuICAvKiogS2V5OiAoKHkrMSk8PDQpfHg7IFZhbHVlOiBVaWQgKi9cbiAgcHJpdmF0ZSBfc2NyZWVuczogVWlkW107XG4gIHByaXZhdGUgX3BvczogUG9zW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIC8qKiBDb3VudCBvZiBjb25zb2xpZGF0ZWFibGUgc2NyZWVuIHRpbGUgSURzLiAqL1xuICBwcml2YXRlIF9jb3VudHM/OiBNdWx0aXNldDxudW1iZXI+O1xuICAvKiogTWFwcyBVSUQgdG8gSUQgb2YgY291bnRlZCBtZXRhc2NyZWVucy4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfY291bnRlZCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG5cbiAgcHJpdmF0ZSBfZmlsbGVkID0gMDtcbiAgcHJpdmF0ZSBfZmVhdHVyZXMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpOyAvLyBtYXBzIHRvIHJlcXVpcmVkIG1hc2tcbiAgcHJpdmF0ZSBfZXhpdHMgPSBuZXcgVGFibGU8UG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWM+KCk7XG5cbiAgcHJpdmF0ZSBfbW9uc3RlcnNJbnZhbGlkYXRlZCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGlkOiBudW1iZXIsIHJlYWRvbmx5IHRpbGVzZXQ6IE1ldGF0aWxlc2V0LFxuICAgICAgICAgICAgICBoZWlnaHQ6IG51bWJlciwgd2lkdGg6IG51bWJlcikge1xuICAgIHRoaXMucm9tID0gdGlsZXNldC5yb207XG4gICAgdGhpcy5fZW1wdHkgPSB0aWxlc2V0LmVtcHR5LnVpZDtcbiAgICB0aGlzLl9oZWlnaHQgPSBoZWlnaHQ7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLl9zY3JlZW5zID0gbmV3IEFycmF5KChoZWlnaHQgKyAyKSA8PCA0KS5maWxsKHRoaXMuX2VtcHR5KTtcbiAgICB0aGlzLl9jb3VudHMgPSB0aWxlc2V0LmRhdGEuY29uc29saWRhdGVkID8gbmV3IE11bHRpc2V0KCkgOiB1bmRlZmluZWQ7XG4gICAgaWYgKHRoaXMuX2NvdW50cykge1xuICAgICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGlsZXNldCkge1xuICAgICAgICBpZiAoc2NyZWVuLmhhc0ZlYXR1cmUoJ2NvbnNvbGlkYXRlJykpIHtcbiAgICAgICAgICB0aGlzLl9jb3VudGVkLnNldChzY3JlZW4udWlkLCBzY3JlZW4uaWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIG91dCBhIG1ldGFsb2NhdGlvbiBmcm9tIHRoZSBnaXZlbiBsb2NhdGlvbi4gIEluZmVyIHRoZVxuICAgKiB0aWxlc2V0IGlmIHBvc3NpYmxlLCBvdGhlcndpc2UgaXQgbXVzdCBiZSBleHBsaWNpdGx5IHNwZWNpZmllZC5cbiAgICovXG4gIHN0YXRpYyBvZihsb2NhdGlvbjogTG9jYXRpb24sIHRpbGVzZXQ/OiBNZXRhdGlsZXNldCk6IE1ldGFsb2NhdGlvbiB7XG4gICAgY29uc3Qge3JvbSwgd2lkdGgsIGhlaWdodH0gPSBsb2NhdGlvbjtcbiAgICBpZiAoIXRpbGVzZXQpIHtcbiAgICAgIC8vIEluZmVyIHRoZSB0aWxlc2V0LiAgU3RhcnQgYnkgYWRkaW5nIGFsbCBjb21wYXRpYmxlIG1ldGF0aWxlc2V0cy5cbiAgICAgIGNvbnN0IHtmb3J0cmVzcywgbGFieXJpbnRofSA9IHJvbS5tZXRhdGlsZXNldHM7XG4gICAgICBjb25zdCB0aWxlc2V0cyA9IG5ldyBTZXQ8TWV0YXRpbGVzZXQ+KCk7XG4gICAgICBmb3IgKGNvbnN0IHRzIG9mIHJvbS5tZXRhdGlsZXNldHMpIHtcbiAgICAgICAgaWYgKGxvY2F0aW9uLnRpbGVzZXQgPT09IHRzLnRpbGVzZXQuaWQpIHRpbGVzZXRzLmFkZCh0cyk7XG4gICAgICB9XG4gICAgICAvLyBJdCdzIGltcG9zc2libGUgdG8gZGlzdGluZ3Vpc2ggZm9ydHJlc3MgYW5kIGxhYnlyaW50aCwgc28gd2UgaGFyZGNvZGVcbiAgICAgIC8vIGl0IGJhc2VkIG9uIGxvY2F0aW9uOiBvbmx5ICRhOSBpcyBsYWJ5cmludGguXG4gICAgICB0aWxlc2V0cy5kZWxldGUobG9jYXRpb24uaWQgPT09IDB4YTkgPyBmb3J0cmVzcyA6IGxhYnlyaW50aCk7XG4gICAgICAvLyBGaWx0ZXIgb3V0IGFueSB0aWxlc2V0cyB0aGF0IGRvbid0IGluY2x1ZGUgbmVjZXNzYXJ5IHNjcmVlbiBpZHMuXG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiBuZXcgU2V0KGl0ZXJzLmNvbmNhdCguLi5sb2NhdGlvbi5zY3JlZW5zKSkpIHtcbiAgICAgICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRpbGVzZXRzKSB7XG4gICAgICAgICAgaWYgKCF0aWxlc2V0LmdldE1ldGFzY3JlZW5zKHNjcmVlbikuc2l6ZSkgdGlsZXNldHMuZGVsZXRlKHRpbGVzZXQpO1xuICAgICAgICAgIGlmICghdGlsZXNldHMuc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB0aWxlc2V0IGZvciAke2hleChzY3JlZW4pfSBpbiAke2xvY2F0aW9ufWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHRpbGVzZXRzLnNpemUgIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tdW5pcXVlIHRpbGVzZXQgZm9yICR7bG9jYXRpb259OiBbJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5mcm9tKHRpbGVzZXRzLCB0ID0+IHQubmFtZSkuam9pbignLCAnKX1dYCk7XG4gICAgICB9XG4gICAgICB0aWxlc2V0ID0gWy4uLnRpbGVzZXRzXVswXTtcbiAgICB9XG5cbiAgICAvLyBUcmF2ZXJzZSB0aGUgbG9jYXRpb24gZm9yIGFsbCB0aWxlcyByZWFjaGFibGUgZnJvbSBhbiBlbnRyYW5jZS5cbiAgICAvLyBUaGlzIGlzIHVzZWQgdG8gaW5mb3JtIHdoaWNoIG1ldGFzY3JlZW4gdG8gc2VsZWN0IGZvciBzb21lIG9mIHRoZVxuICAgIC8vIHJlZHVuZGFudCBvbmVzIChpLmUuIGRvdWJsZSBkZWFkIGVuZHMpLiAgVGhpcyBpcyBhIHNpbXBsZSB0cmF2ZXJzYWxcbiAgICBjb25zdCByZWFjaGFibGUgPSBsb2NhdGlvbi5yZWFjaGFibGVUaWxlcyh0cnVlKTsgLy8gdHJhdmVyc2VSZWFjaGFibGUoMHgwNCk7XG4gICAgY29uc3QgZXhpdCA9IHRpbGVzZXQuZXhpdC51aWQ7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBBcnJheTxVaWQ+KChoZWlnaHQgKyAyKSA8PCA0KS5maWxsKHRpbGVzZXQuZW1wdHkudWlkKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3QgbWV0YXNjcmVlbnMgPSB0aWxlc2V0LmdldE1ldGFzY3JlZW5zKGxvY2F0aW9uLnNjcmVlbnNbeV1beF0pO1xuICAgICAgICBsZXQgbWV0YXNjcmVlbjogTWV0YXNjcmVlbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChtZXRhc2NyZWVucy5zaXplID09PSAxKSB7XG4gICAgICAgICAgW21ldGFzY3JlZW5dID0gbWV0YXNjcmVlbnM7XG4gICAgICAgIH0gZWxzZSBpZiAoIW1ldGFzY3JlZW5zLnNpemUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUT09EIC0gZmlsdGVyIGJhc2VkIG9uIHdobyBoYXMgYSBtYXRjaCBmdW5jdGlvbiwgb3IgbWF0Y2hpbmcgZmxhZ3NcbiAgICAgICAgICBjb25zdCBmbGFnID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSAoKHkgPDwgNCkgfCB4KSk7XG4gICAgICAgICAgY29uc3QgbWF0Y2hlcnM6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgICAgICAgIGNvbnN0IGJlc3Q6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtZXRhc2NyZWVucykge1xuICAgICAgICAgICAgaWYgKHMuZGF0YS5tYXRjaCkge1xuICAgICAgICAgICAgICBtYXRjaGVycy5wdXNoKHMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzLmZsYWcgPT09ICdhbHdheXMnICYmIGZsYWc/LmZsYWcgPT09IDB4MmZlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICFzLmZsYWcgJiYgIXMuZGF0YS53YWxsICYmICFmbGFnKSB7XG4gICAgICAgICAgICAgIGJlc3QudW5zaGlmdChzKTsgLy8gZnJvbnQtbG9hZCBtYXRjaGluZyBmbGFnc1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYmVzdC5wdXNoKHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobWF0Y2hlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiByZWFjaChkeTogbnVtYmVyLCBkeDogbnVtYmVyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHgwID0gKHggPDwgOCkgKyBkeDtcbiAgICAgICAgICAgICAgY29uc3QgeTAgPSAoeSA8PCA4KSArIGR5O1xuICAgICAgICAgICAgICBjb25zdCB0ID1cbiAgICAgICAgICAgICAgICAgICh5MCA8PCA0KSAmIDB4ZjAwMCB8IHgwICYgMHhmMDAgfCB5MCAmIDB4ZjAgfCAoeDAgPj4gNCkgJiAweGY7XG4gICAgICAgICAgICAgIHJldHVybiByZWFjaGFibGUuaGFzKHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBtYXRjaGVyIG9mIG1hdGNoZXJzKSB7XG4gICAgICAgICAgICAgIGlmICghbWF0Y2hlci5kYXRhLm1hdGNoIShyZWFjaCwgZmxhZyAhPSBudWxsKSkgY29udGludWU7XG4gICAgICAgICAgICAgIG1ldGFzY3JlZW4gPSBtYXRjaGVyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFtZXRhc2NyZWVuKSBtZXRhc2NyZWVuID0gYmVzdFswXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1ldGFzY3JlZW4pIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZScpO1xuICAgICAgICBjb25zdCB0MCA9ICh5ICsgMSkgPDwgNCB8IHg7XG4gICAgICAgIHNjcmVlbnNbdDBdID0gbWV0YXNjcmVlbi51aWQ7XG4gICAgICAgIC8vIElmIHdlJ3JlIG9uIHRoZSBib3JkZXIgYW5kIGl0J3MgYW4gZWRnZSBleGl0IHRoZW4gY2hhbmdlIHRoZSBib3JkZXJcbiAgICAgICAgLy8gc2NyZWVuIHRvIHJlZmxlY3QgYW4gZXhpdC5cbiAgICAgICAgY29uc3QgZWRnZXMgPSBtZXRhc2NyZWVuLmVkZ2VFeGl0cygpO1xuICAgICAgICBpZiAoeSA9PT0gMCAmJiAoZWRnZXMgJiAxKSkgc2NyZWVuc1t0MCAtIDE2XSA9IGV4aXQ7XG4gICAgICAgIGlmICh4ID09PSAwICYmIChlZGdlcyAmIDIpKSBzY3JlZW5zW3QwIC0gMV0gPSBleGl0O1xuICAgICAgICBpZiAoeSA9PT0gaGVpZ2h0ICYmIChlZGdlcyAmIDQpKSBzY3JlZW5zW3QwICsgMTZdID0gZXhpdDtcbiAgICAgICAgaWYgKHggPT09IHdpZHRoICYmIChlZGdlcyAmIDgpKSBzY3JlZW5zW3QwICsgMV0gPSBleGl0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgZXhpdHNcbiAgICBjb25zdCBleGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHNyY1BvcyA9IGV4aXQuc2NyZWVuO1xuICAgICAgY29uc3Qgc3JjU2NyZWVuID0gcm9tLm1ldGFzY3JlZW5zW3NjcmVlbnNbc3JjUG9zICsgMTZdXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZmluZEV4aXRUeXBlKGV4aXQudGlsZSwgaGVpZ2h0ID09PSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgISEoZXhpdC5lbnRyYW5jZSAmIDB4MjApKTtcbiAgICAgIGNvbnN0IHNyY1R5cGUgPSBzcmNFeGl0Py50eXBlO1xuICAgICAgaWYgKCFzcmNUeXBlKSB7XG4gICAgICAgIGNvbnN0IGlkID0gbG9jYXRpb24uaWQgPDwgMTYgfCBzcmNQb3MgPDwgOCB8IGV4aXQudGlsZTtcbiAgICAgICAgaWYgKHVua25vd25FeGl0V2hpdGVsaXN0LmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBhbGwgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8ubWFwKFxuICAgICAgICAgICAgZSA9PiBlLnR5cGUgKyAnOiAnICsgZS5leGl0cy5tYXAoaGV4KS5qb2luKCcsICcpKS5qb2luKCdcXG4gICcpO1xuICAgICAgICBjb25zb2xlLndhcm4oYFVua25vd24gZXhpdCAke2hleChleGl0LnRpbGUpfTogJHtzcmNTY3JlZW4ubmFtZX0gaW4gJHtcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbn0gQCAke2hleChzcmNQb3MpfTpcXG4gICR7YWxsfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChleGl0cy5oYXMoc3JjUG9zLCBzcmNUeXBlKSkgY29udGludWU7IC8vIGFscmVhZHkgaGFuZGxlZFxuICAgICAgY29uc3QgZGVzdCA9IHJvbS5sb2NhdGlvbnNbZXhpdC5kZXN0XTtcbiAgICAgIGlmIChzcmNUeXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgY29uc3QgZG93biA9IHNyY1R5cGUgPT09ICdzZWFtbGVzczpkb3duJztcbiAgICAgICAgLy8gTk9URTogdGhpcyBzZWVtcyB3cm9uZyAtIHRoZSBkb3duIGV4aXQgaXMgQkVMT1cgdGhlIHVwIGV4aXQuLi4/XG4gICAgICAgIGNvbnN0IHRpbGUgPSBzcmNFeGl0IS5leGl0c1swXSArIChkb3duID8gLTE2IDogMTYpO1xuICAgICAgICBjb25zdCBkZXN0UG9zID0gc3JjUG9zICsgKHRpbGUgPCAwID8gLTE2IDogdGlsZSA+PSAweGYwID8gMTYgOiAtMCk7XG4gICAgICAgIGNvbnN0IGRlc3RUeXBlID0gZG93biA/ICdzZWFtbGVzczp1cCcgOiAnc2VhbWxlc3M6ZG93bic7XG4gICAgICAgIC8vY29uc29sZS5sb2coYCR7c3JjVHlwZX0gJHtoZXgobG9jYXRpb24uaWQpfSAke2Rvd259ICR7aGV4KHRpbGUpfSAke2hleChkZXN0UG9zKX0gJHtkZXN0VHlwZX0gJHtoZXgoZGVzdC5pZCl9YCk7XG4gICAgICAgIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGVudHJhbmNlID0gZGVzdC5lbnRyYW5jZXNbZXhpdC5lbnRyYW5jZSAmIDB4MWZdO1xuICAgICAgbGV0IGRlc3RQb3MgPSBlbnRyYW5jZS5zY3JlZW47XG4gICAgICBsZXQgZGVzdENvb3JkID0gZW50cmFuY2UuY29vcmQ7XG4gICAgICBpZiAoc3JjVHlwZSA9PT0gJ2Rvb3InICYmIChlbnRyYW5jZS55ICYgMHhmMCkgPT09IDApIHtcbiAgICAgICAgLy8gTk9URTogVGhlIGl0ZW0gc2hvcCBkb29yIGluIE9hayBzdHJhZGRsZXMgdHdvIHNjcmVlbnMgKGV4aXQgaXMgb25cbiAgICAgICAgLy8gdGhlIE5XIHNjcmVlbiB3aGlsZSBlbnRyYW5jZSBpcyBvbiBTVyBzY3JlZW4pLiAgRG8gYSBxdWljayBoYWNrIHRvXG4gICAgICAgIC8vIGRldGVjdCB0aGlzIChwcm94eWluZyBcImRvb3JcIiBmb3IgXCJ1cHdhcmQgZXhpdFwiKSBhbmQgYWRqdXN0IHNlYXJjaFxuICAgICAgICAvLyB0YXJnZXQgYWNjb3JkaW5nbHkuXG4gICAgICAgIGRlc3RQb3MgLT0gMHgxMDtcbiAgICAgICAgZGVzdENvb3JkICs9IDB4MTAwMDA7XG4gICAgICB9XG4gICAgICAvLyBGaWd1cmUgb3V0IHRoZSBjb25uZWN0aW9uIHR5cGUgZm9yIHRoZSBkZXN0VGlsZS5cbiAgICAgIGNvbnN0IGRlc3RTY3JJZCA9IGRlc3Quc2NyZWVuc1tkZXN0UG9zID4+IDRdW2Rlc3RQb3MgJiAweGZdO1xuICAgICAgY29uc3QgZGVzdFR5cGUgPSBmaW5kRW50cmFuY2VUeXBlKGRlc3QsIGRlc3RTY3JJZCwgZGVzdENvb3JkKTtcbiAgICAgIC8vIE5PVEU6IGluaXRpYWwgc3Bhd24gaGFzIG5vIHR5cGUuLi4/XG4gICAgICBpZiAoIWRlc3RUeXBlKSB7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChkZXN0U2NySWQsIGRlc3QudGlsZXNldCkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgZGVzdFNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgICAgICBpZiAoZXhpdC50eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGluZXMucHVzaChgICAke2Rlc3RTY3IubmFtZX0gJHtleGl0LnR5cGV9OiAke2hleChleGl0LmVudHJhbmNlKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS53YXJuKGBCYWQgZW50cmFuY2UgJHtoZXgoZGVzdENvb3JkKX06IHJhdyAke2hleChkZXN0U2NySWQpXG4gICAgICAgICAgICAgICAgICAgICAgfSBpbiAke2Rlc3R9IEAgJHtoZXgoZGVzdFBvcyl9XFxuJHtsaW5lcy5qb2luKCdcXG4nKX1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICAgIC8vIGlmIChkZXN0VHlwZSkgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YWxvYyA9IG5ldyBNZXRhbG9jYXRpb24obG9jYXRpb24uaWQsIHRpbGVzZXQsIGhlaWdodCwgd2lkdGgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2NyZWVucy5sZW5ndGg7IGkrKykge1xuICAgICAgbWV0YWxvYy5zZXRJbnRlcm5hbChpLCBzY3JlZW5zW2ldKTtcbiAgICB9XG4gICAgbWV0YWxvYy5fc2NyZWVucyA9IHNjcmVlbnM7XG4gICAgbWV0YWxvYy5fZXhpdHMgPSBleGl0cztcblxuICAgIC8vIEZpbGwgaW4gY3VzdG9tIGZsYWdzXG4gICAgZm9yIChjb25zdCBmIG9mIGxvY2F0aW9uLmZsYWdzKSB7XG4gICAgICBjb25zdCBzY3IgPSByb20ubWV0YXNjcmVlbnNbbWV0YWxvYy5fc2NyZWVuc1tmLnNjcmVlbiArIDE2XV07XG4gICAgICBpZiAoc2NyLmZsYWc/LnN0YXJ0c1dpdGgoJ2N1c3RvbScpKSB7XG4gICAgICAgIG1ldGFsb2MuY3VzdG9tRmxhZ3Muc2V0KGYuc2NyZWVuLCByb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgICB9IGVsc2UgaWYgKCFzY3IuZmxhZykge1xuICAgICAgICBtZXRhbG9jLmZyZWVGbGFncy5hZGQocm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhbG9jLmFsbFBvcygpKSB7XG4gICAgLy8gICBjb25zdCBzY3IgPSByb20ubWV0YXNjcmVlbnNbbWV0YWxvYy5fc2NyZWVuc1twb3MgKyAxNl1dO1xuICAgIC8vICAgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tJykge1xuICAgIC8vICAgICBjb25zdCBmID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBwb3MpO1xuICAgIC8vICAgICBpZiAoZikgbWV0YWxvYy5jdXN0b21GbGFncy5zZXQocG9zLCByb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuXG4gICAgLy8gVE9ETyAtIHN0b3JlIHJlYWNoYWJpbGl0eSBtYXA/XG4gICAgcmV0dXJuIG1ldGFsb2M7XG5cbiAgICBmdW5jdGlvbiBmaW5kRW50cmFuY2VUeXBlKGRlc3Q6IExvY2F0aW9uLCBzY3JJZDogbnVtYmVyLCBjb29yZDogbnVtYmVyKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlc3RTY3Igb2Ygcm9tLm1ldGFzY3JlZW5zLmdldEJ5SWQoc2NySWQsIGRlc3QudGlsZXNldCkpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGRlc3RTY3IuZmluZEVudHJhbmNlVHlwZShjb29yZCwgZGVzdC5oZWlnaHQgPT09IDEpO1xuICAgICAgICBpZiAodHlwZSAhPSBudWxsKSByZXR1cm4gdHlwZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgZ2V0VWlkKHBvczogUG9zKTogVWlkIHtcbiAgICByZXR1cm4gdGhpcy5fc2NyZWVuc1twb3MgKyAxNl07XG4gIH1cblxuICBnZXQocG9zOiBQb3MpOiBNZXRhc2NyZWVuIHtcbiAgICByZXR1cm4gdGhpcy5yb20ubWV0YXNjcmVlbnNbdGhpcy5fc2NyZWVuc1twb3MgKyAxNl1dO1xuICB9XG5cbiAgZ2V0IHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fZmlsbGVkO1xuICB9XG5cbiAgLy8gUmVhZG9ubHkgYWNjZXNzb3IuXG4gIC8vIGdldCBzY3JlZW5zKCk6IHJlYWRvbmx5IFVpZFtdIHtcbiAgLy8gICByZXR1cm4gdGhpcy5fc2NyZWVucztcbiAgLy8gfVxuXG4gIGdldCB3aWR0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl93aWR0aDtcbiAgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlcikge1xuICAgIHRoaXMuX3dpZHRoID0gd2lkdGg7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gIH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9oZWlnaHQgPiBoZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NjcmVlbnMuc3BsaWNlKChoZWlnaHQgKyAyKSA8PCA0LCAodGhpcy5faGVpZ2h0IC0gaGVpZ2h0KSA8PCA0KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2hlaWdodCA8IGhlaWdodCkge1xuICAgICAgdGhpcy5fc2NyZWVucy5sZW5ndGggPSAoaGVpZ2h0ICsgMikgPDwgNDtcbiAgICAgIHRoaXMuX3NjcmVlbnMuZmlsbCh0aGlzLl9lbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5oZWlnaHQgKyAyKSA8PCA0LCB0aGlzLl9zY3JlZW5zLmxlbmd0aCk7XG4gICAgfVxuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBUT0RPIC0gcmVzaXplIGZ1bmN0aW9uP1xuXG4gIGFsbFBvcygpOiByZWFkb25seSBQb3NbXSB7XG4gICAgaWYgKHRoaXMuX3BvcykgcmV0dXJuIHRoaXMuX3BvcztcbiAgICBjb25zdCBwOiBudW1iZXJbXSA9IHRoaXMuX3BvcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5faGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fd2lkdGg7IHgrKykge1xuICAgICAgICBwLnB1c2goeSA8PCA0IHwgeCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRJbnRlcm5hbChwb3M6IFBvcywgdWlkOiBVaWQgfCBudWxsKSB7XG4gICAgY29uc3QgaW5Cb3VuZHMgPSB0aGlzLmluQm91bmRzKHBvcyk7XG4gICAgY29uc3QgdDAgPSBwb3MgKyAxNjtcbiAgICBpZiAoaW5Cb3VuZHMgJiYgdGhpcy5fc2NyZWVuc1t0MF0gIT09IHRoaXMuX2VtcHR5KSB0aGlzLl9maWxsZWQtLTtcbiAgICBpZiAoaW5Cb3VuZHMgJiYgdWlkICE9PSB0aGlzLl9lbXB0eSkgdGhpcy5fZmlsbGVkKys7XG4gICAgY29uc3QgcHJldiA9IHRoaXMuX2NvdW50ZWQuZ2V0KHRoaXMuX3NjcmVlbnNbdDBdKTtcbiAgICBpZiAodWlkID09IG51bGwpIHVpZCA9IHRoaXMuX2VtcHR5O1xuICAgIHRoaXMuX3NjcmVlbnNbdDBdID0gdWlkO1xuICAgIGlmICh0aGlzLl9jb3VudHMpIHtcbiAgICAgIGlmIChwcmV2ICE9IG51bGwpIHRoaXMuX2NvdW50cy5kZWxldGUocHJldik7XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy5fY291bnRlZC5nZXQodWlkKTtcbiAgICAgIGlmIChuZXh0ICE9IG51bGwpIHRoaXMuX2NvdW50cy5hZGQobmV4dCk7XG4gICAgfVxuICB9XG5cbiAgaW52YWxpZGF0ZU1vbnN0ZXJzKCkgeyB0aGlzLl9tb25zdGVyc0ludmFsaWRhdGVkID0gdHJ1ZTsgfVxuXG4gIGluQm91bmRzKHBvczogUG9zKTogYm9vbGVhbiB7XG4gICAgLy8gcmV0dXJuIGluQm91bmRzKHBvcywgdGhpcy5oZWlnaHQsIHRoaXMud2lkdGgpO1xuICAgIHJldHVybiAocG9zICYgMTUpIDwgdGhpcy53aWR0aCAmJiBwb3MgPj0gMCAmJiBwb3MgPj4+IDQgPCB0aGlzLmhlaWdodDtcbiAgfVxuXG4gIHNldEZlYXR1cmUocG9zOiBQb3MsIGZlYXR1cmU6IEZlYXR1cmUpIHtcbiAgICB0aGlzLl9mZWF0dXJlcy5zZXQocG9zLCB0aGlzLl9mZWF0dXJlcy5nZXQocG9zKSEgfCBmZWF0dXJlTWFza1tmZWF0dXJlXSk7XG4gIH1cblxuICAvLyBpc0ZpeGVkKHBvczogUG9zKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRoaXMuX2ZpeGVkLmhhcyhwb3MpO1xuICAvLyB9XG5cbiAgLyoqXG4gICAqIEZvcmNlLW92ZXJ3cml0ZXMgdGhlIGdpdmVuIHJhbmdlIG9mIHNjcmVlbnMuICBEb2VzIHZhbGlkaXR5IGNoZWNraW5nXG4gICAqIG9ubHkgYXQgdGhlIGVuZC4gIERvZXMgbm90IGRvIGFueXRoaW5nIHdpdGggZmVhdHVyZXMsIHNpbmNlIHRoZXkncmVcbiAgICogb25seSBzZXQgaW4gbGF0ZXIgcGFzc2VzIChpLmUuIHNodWZmbGUsIHdoaWNoIGlzIGxhc3QpLlxuICAgKi9cbiAgc2V0MmQocG9zOiBQb3MsIHNjcmVlbnM6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxNZXRhc2NyZWVufG51bGw+Pikge1xuICAgIHRoaXMuc2F2ZUV4Y3Vyc2lvbigoKSA9PiB7XG4gICAgICBjb25zdCBwb3MwID0gcG9zO1xuICAgICAgZm9yIChjb25zdCByb3cgb2Ygc2NyZWVucykge1xuICAgICAgICBsZXQgZHggPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHNjciBvZiByb3cpIHtcbiAgICAgICAgICBpZiAoc2NyKSB0aGlzLnNldEludGVybmFsKHBvcyArIGR4KyssIHNjci51aWQpO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSAxNjtcbiAgICAgIH1cbiAgICAgIHRoaXMudmVyaWZ5KHBvczAsIHNjcmVlbnMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgTWF0aC5tYXgoLi4uc2NyZWVucy5tYXAociA9PiByLmxlbmd0aCkpKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIENoZWNrIGFsbCBzY3JlZW5zIGluIHRoZSBnaXZlbiByZWN0YW5nbGUuIFRocm93IGlmIGludmFsaWQuICovXG4gIHZlcmlmeShwb3MwOiBQb3MsIGhlaWdodDogbnVtYmVyLCB3aWR0aDogbnVtYmVyKSB7XG4gICAgY29uc3QgbWF4WSA9ICh0aGlzLmhlaWdodCArIDEpIDw8IDQ7XG4gICAgZm9yIChsZXQgZHkgPSAwOyBkeSA8PSBoZWlnaHQ7IGR5KyspIHtcbiAgICAgIGNvbnN0IHBvcyA9IHBvczAgKyAxNiArIChkeSA8PCA0KTtcbiAgICAgIGZvciAobGV0IGR4ID0gMDsgZHggPD0gd2lkdGg7IGR4KyspIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBwb3MgKyBkeDtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1tpbmRleF07XG4gICAgICAgIGlmIChzY3IgPT0gbnVsbCkgYnJlYWs7IC8vIGhhcHBlbnMgd2hlbiBzZXR0aW5nIGJvcmRlciBzY3JlZW5zIHZpYSBzZXQyZFxuICAgICAgICBjb25zdCBhYm92ZSA9IHRoaXMuX3NjcmVlbnNbaW5kZXggLSAxNl07XG4gICAgICAgIGNvbnN0IGxlZnQgPSB0aGlzLl9zY3JlZW5zW2luZGV4IC0gMV07XG4gICAgICAgIGlmICgoaW5kZXggJiAweGYpIDwgdGhpcy53aWR0aCAmJiAhdGhpcy50aWxlc2V0LmNoZWNrKGFib3ZlLCBzY3IsIDE2KSkge1xuICAgICAgICAgIGNvbnN0IGFib3ZlTmFtZSA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW2Fib3ZlXS5uYW1lO1xuICAgICAgICAgIGNvbnN0IHNjck5hbWUgPSB0aGlzLnJvbS5tZXRhc2NyZWVuc1tzY3JdLm5hbWU7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBiYWQgbmVpZ2hib3IgJHthYm92ZU5hbWV9IGFib3ZlICR7c2NyTmFtZX0gYXQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX0gQCAke2hleChpbmRleCAtIDMyKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5kZXggPCBtYXhZICYmICF0aGlzLnRpbGVzZXQuY2hlY2sobGVmdCwgc2NyLCAxKSkge1xuICAgICAgICAgIGNvbnN0IGxlZnROYW1lID0gdGhpcy5yb20ubWV0YXNjcmVlbnNbbGVmdF0ubmFtZTtcbiAgICAgICAgICBjb25zdCBzY3JOYW1lID0gdGhpcy5yb20ubWV0YXNjcmVlbnNbc2NyXS5uYW1lO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgYmFkIG5laWdoYm9yICR7bGVmdE5hbWV9IGxlZnQgb2YgJHtzY3JOYW1lfSBhdCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfSBAICR7aGV4KGluZGV4IC0gMTcpfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUmVjb21wdXRlcyBhbGwgdGhlIG1lbW9pemVkIGRhdGEgKGUuZy4gYWZ0ZXIgYSBsYXJnZSBjaGFuZ2UpLlxuICBib29ra2VlcCgpIHtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fZmlsbGVkID0gMDtcbiAgICBpZiAodGhpcy5fY291bnRzKSB0aGlzLl9jb3VudHMgPSBuZXcgTXVsdGlzZXQoKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3BvcyArIDE2XTtcbiAgICAgIGlmICh0aGlzLl9jb3VudHMpIHtcbiAgICAgICAgY29uc3QgY291bnRlZCA9IHRoaXMuX2NvdW50ZWQuZ2V0KHNjcik7XG4gICAgICAgIGlmIChjb3VudGVkICE9IG51bGwpIHRoaXMuX2NvdW50cy5hZGQoY291bnRlZCk7XG4gICAgICB9XG4gICAgICBpZiAoc2NyICE9IHRoaXMudGlsZXNldC5lbXB0eS5pZCkgdGhpcy5fZmlsbGVkKys7XG4gICAgfVxuICB9XG5cbiAgc3BsaWNlQ29sdW1ucyhsZWZ0OiBudW1iZXIsIGRlbGV0ZWQ6IG51bWJlciwgaW5zZXJ0ZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICBzY3JlZW5zOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8TWV0YXNjcmVlbj4+KSB7XG4gICAgaWYgKHRoaXMuX2ZlYXR1cmVzLnNpemUpIHRocm93IG5ldyBFcnJvcihgYmFkIGZlYXR1cmVzYCk7XG4gICAgdGhpcy5zYXZlRXhjdXJzaW9uKCgpID0+IHtcbiAgICAgIC8vIEZpcnN0IGFkanVzdCB0aGUgc2NyZWVucy5cbiAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5fc2NyZWVucy5sZW5ndGg7IHAgKz0gMTYpIHtcbiAgICAgICAgdGhpcy5fc2NyZWVucy5jb3B5V2l0aGluKHAgKyBsZWZ0ICsgaW5zZXJ0ZWQsIHAgKyBsZWZ0ICsgZGVsZXRlZCwgcCArIDEwKTtcbiAgICAgICAgdGhpcy5fc2NyZWVucy5zcGxpY2UocCArIGxlZnQsIGluc2VydGVkLCAuLi5zY3JlZW5zW3AgPj4gNF0ubWFwKHMgPT4gcy51aWQpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIC8vIFVwZGF0ZSBkaW1lbnNpb25zIGFuZCBhY2NvdW50aW5nXG4gICAgY29uc3QgZGVsdGEgPSBpbnNlcnRlZCAtIGRlbGV0ZWQ7XG4gICAgdGhpcy53aWR0aCArPSBkZWx0YTtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5ib29ra2VlcCgpO1xuICAgIC8vIE1vdmUgcmVsZXZhbnQgZXhpdHNcbiAgICBjb25zdCBtb3ZlOiBbUG9zLCBDb25uZWN0aW9uVHlwZSwgUG9zLCBDb25uZWN0aW9uVHlwZV1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHggPSBwb3MgJiAweGY7XG4gICAgICBpZiAoeCA8IGxlZnQgKyBkZWxldGVkKSB7XG4gICAgICAgIGlmICh4ID49IGxlZnQpIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG1vdmUucHVzaChbcG9zLCB0eXBlLCBwb3MgKyBkZWx0YSwgdHlwZV0pO1xuICAgIH1cbiAgICB0aGlzLm1vdmVFeGl0cyguLi5tb3ZlKTtcbiAgICAvLyBNb3ZlIGZsYWdzIGFuZCBzcGF3bnMgaW4gcGFyZW50IGxvY2F0aW9uXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGNvbnN0IHh0MCA9IChsZWZ0ICsgZGVsZXRlZCkgPDwgNDtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHBhcmVudC5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi54dCA8IHh0MCkgY29udGludWU7XG4gICAgICBzcGF3bi54dCAtPSAoZGVsdGEgPDwgNCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZmxhZyBvZiBwYXJlbnQuZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnLnhzIDwgbGVmdCArIGRlbGV0ZWQpIHtcbiAgICAgICAgaWYgKGZsYWcueHMgPj0gbGVmdCkgZmxhZy5zY3JlZW4gPSAweGZmO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZsYWcueHMgLT0gZGVsdGE7XG4gICAgfVxuICAgIHBhcmVudC5mbGFncyA9IHBhcmVudC5mbGFncy5maWx0ZXIoZiA9PiBmLnNjcmVlbiAhPT0gMHhmZik7XG5cbiAgICAvLyBUT0RPIC0gbW92ZSBwaXRzPz9cblxuICB9XG5cbiAgLy8gT3B0aW9ucyBmb3Igc2V0dGluZzogPz8/XG4gIHNldChwb3M6IFBvcywgdWlkOiBVaWQpOiBib29sZWFuIHtcbiAgICBjb25zdCBzY3IgPSB0aGlzLnJvbS5tZXRhc2NyZWVuc1t1aWRdO1xuICAgIGNvbnN0IGZlYXR1cmVzID0gdGhpcy5fZmVhdHVyZXMuZ2V0KHBvcyk7XG4gICAgaWYgKGZlYXR1cmVzICE9IG51bGwgJiYgIXNjci5oYXNGZWF0dXJlcyhmZWF0dXJlcykpIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGxldCBkaXIgPSAwOyBkaXIgPCA0OyBkaXIrKykge1xuICAgICAgY29uc3QgZGVsdGEgPSBEUE9TW2Rpcl07XG4gICAgICBjb25zdCBvdGhlciA9IHBvcyArIGRlbHRhO1xuICAgICAgaWYgKCF0aGlzLnRpbGVzZXQuY2hlY2sodWlkLCB0aGlzLl9zY3JlZW5zW290aGVyXSwgZGVsdGEpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuc2V0SW50ZXJuYWwocG9zLCB1aWQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc2V0RXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUsIHNwZWM6IEV4aXRTcGVjKSB7XG4gICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5sb2NhdGlvbnNbc3BlY1swXSA+Pj4gOF0ubWV0YTtcbiAgICBpZiAoIW90aGVyKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBzZXQgdHdvLXdheSBleGl0IHdpdGhvdXQgbWV0YWApO1xuICAgIHRoaXMuc2V0RXhpdE9uZVdheShwb3MsIHR5cGUsIHNwZWMpO1xuICAgIG90aGVyLnNldEV4aXRPbmVXYXkoc3BlY1swXSAmIDB4ZmYsIHNwZWNbMV0sIFt0aGlzLmlkIDw8IDggfCBwb3MsIHR5cGVdKTtcbiAgfVxuICBzZXRFeGl0T25lV2F5KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSwgc3BlYzogRXhpdFNwZWMpIHtcbiAgICAvLyBjb25zdCBwcmV2ID0gdGhpcy5fZXhpdHMuZ2V0KHBvcywgdHlwZSk7XG4gICAgLy8gaWYgKHByZXYpIHtcbiAgICAvLyAgIGNvbnN0IG90aGVyID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZbMF0gPj4+IDhdLm1ldGE7XG4gICAgLy8gICBpZiAob3RoZXIpIG90aGVyLl9leGl0cy5kZWxldGUocHJldlswXSAmIDB4ZmYsIHByZXZbMV0pO1xuICAgIC8vIH1cbiAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBzcGVjKTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb3VudGVkIGNhbmRpZGF0ZXM/XG4gIGV4aXRDYW5kaWRhdGVzKHR5cGU6IENvbm5lY3Rpb25UeXBlKTogbnVtYmVyW10ge1xuICAgIC8vIFRPRE8gLSBmaWd1cmUgb3V0IGEgd2F5IHRvIHVzZSB0aGUgZG91YmxlLXN0YWlyY2FzZT8gIGl0IHdvbid0XG4gICAgLy8gaGFwcGVuIGN1cnJlbnRseSBiZWNhdXNlIGl0J3MgZml4ZWQsIHNvIGl0J3MgZXhjbHVkZWQuLi4uP1xuICAgIGNvbnN0IGhhc0V4aXQ6IG51bWJlcltdID0gW107XG4gICAgZm9yIChjb25zdCBzY3Igb2YgdGhpcy50aWxlc2V0KSB7XG4gICAgICBpZiAoc2NyLmRhdGEuZXhpdHM/LnNvbWUoZSA9PiBlLnR5cGUgPT09IHR5cGUpKSBoYXNFeGl0LnB1c2goc2NyLmlkKTtcbiAgICB9XG4gICAgcmV0dXJuIGhhc0V4aXQ7XG4gIH1cblxuICAvLyBOT1RFOiBjYW5kaWRhdGVzIHByZS1zaHVmZmxlZD9cbiAgdHJ5QWRkT25lT2YocG9zOiBQb3MsIGNhbmRpZGF0ZXM6IFVpZFtdKTogYm9vbGVhbiB7XG4gICAgLy8gY2hlY2sgbmVpZ2hib3JzLi4uIC0gVE9ETyAtIG5lZWQgdG8gZGlzdGluZ3Vpc2ggZW1wdHkgZnJvbSB1bnNldC4uLiA6LShcbiAgICAvLyBhbHRlcm5hdGl2ZWx5LCB3ZSBjb3VsZCBfRklYXyB0aGUgbWFuZGF0b3J5IGVtcHRpZXMuLi4/XG5cbiAgICAvLyBCVVQuLi4gd2hlcmUgZG8gd2UgZXZlbiBrZWVwIHRyYWNrIG9mIGl0P1xuICAgIC8vICAtIGlzIGZpeGVkIHRoZSBjb25jZXJuIG9mIGNhdmUgb3IgbWV0YWxvYz9cbiAgICAvLyBjb25zdCBmZWF0dXJlID0gdGhpcy5fZmVhdHVyZXMuZ2V0KHBvcyk7XG4gICAgXG5cbiAgICAvLyBjb25zdCBzY3IgPSB0aGlzLnJvbS5tZXRhc2NyZWVuc1t1aWRdO1xuICAgIC8vIGlmIChmZWF0dXJlICE9IG51bGwgJiYgIXNjci5oYXNGZWF0dXJlKGZlYXR1cmUpKSByZXR1cm4gZmFsc2U7XG4gICAgXG4gICAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgICAgaWYgKHRoaXMuc2V0KHBvcywgY2FuZGlkYXRlKSkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcblxuXG4gIH1cblxuICAvLyBUT0RPIC0gc2hvcnQgdnMgZnVsbD9cbiAgc2hvdygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgbGV0IGxpbmUgPSBbXTtcbiAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgbGluZS5wdXNoKHgudG9TdHJpbmcoMTYpKTtcbiAgICB9XG4gICAgbGluZXMucHVzaCgnICAgJyArIGxpbmUuam9pbignICAnKSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCByID0gMDsgciA8IDM7IHIrKykge1xuICAgICAgICBsaW5lID0gW3IgPT09IDEgPyB5LnRvU3RyaW5nKDE2KSA6ICcgJywgJyAnXTtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5tZXRhc2NyZWVuc1t0aGlzLl9zY3JlZW5zWyh5ICsgMSkgPDwgNCB8IHhdXTtcbiAgICAgICAgICBsaW5lLnB1c2goc2NyZWVuPy5kYXRhLmljb24/LmZ1bGxbcl0gPz8gKHIgPT09IDEgPyAnID8gJyA6ICcgICAnKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGluZXMucHVzaChsaW5lLmpvaW4oJycpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgc2NyZWVuTmFtZXMoKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgbGV0IGxpbmUgPSBbXTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW3RoaXMuX3NjcmVlbnNbKHkgKyAxKSA8PCA0IHwgeF1dO1xuICAgICAgICBsaW5lLnB1c2goc2NyZWVuPy5uYW1lKTtcbiAgICAgIH1cbiAgICAgIGxpbmVzLnB1c2gobGluZS5qb2luKCcgJykpO1xuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICBzYXZlRXhjdXJzaW9uKGY6ICgpID0+IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBsZXQgc2NyZWVucyA9IFsuLi50aGlzLl9zY3JlZW5zXTtcbiAgICBsZXQgY291bnRzID0gdGhpcy5fY291bnRzICYmIFsuLi50aGlzLl9jb3VudHNdO1xuICAgIGxldCBmaWxsZWQgPSB0aGlzLl9maWxsZWQ7XG4gICAgbGV0IGZlYXR1cmVzID0gWy4uLnRoaXMuX2ZlYXR1cmVzXTtcbiAgICBsZXQgb2sgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgb2sgPSBmKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChvaykgcmV0dXJuIHRydWU7XG4gICAgICB0aGlzLl9zY3JlZW5zID0gc2NyZWVucztcbiAgICAgIGlmIChjb3VudHMpIHRoaXMuX2NvdW50cyA9IG5ldyBNdWx0aXNldChjb3VudHMpO1xuICAgICAgdGhpcy5fZmlsbGVkID0gZmlsbGVkO1xuICAgICAgdGhpcy5fZmVhdHVyZXMgPSBuZXcgTWFwKGZlYXR1cmVzKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdHJhdmVyc2Uob3B0czogVHJhdmVyc2VPcHRzID0ge30pOiBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4ge1xuICAgIC8vIFJldHVybnMgYSBtYXAgZnJvbSB1bmlvbmZpbmQgcm9vdCB0byBhIGxpc3Qgb2YgYWxsIHJlYWNoYWJsZSB0aWxlcy5cbiAgICAvLyBBbGwgZWxlbWVudHMgb2Ygc2V0IGFyZSBrZXlzIHBvaW50aW5nIHRvIHRoZSBzYW1lIHZhbHVlIHJlZi5cbiAgICBjb25zdCB3aXRob3V0ID0gbmV3IFNldChvcHRzLndpdGhvdXQgfHwgW10pO1xuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxudW1iZXI+KCk7XG4gICAgY29uc3QgY29ubmVjdGlvblR5cGUgPSAob3B0cy5mbGlnaHQgPyAyIDogMCkgfCAob3B0cy5ub0ZsYWdnZWQgPyAxIDogMCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgaWYgKHdpdGhvdXQuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3MgKyAxNl07XG4gICAgICBjb25zdCBtcyA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW3Njcl07XG4gICAgICAvL2lmIChvcHRzLmZsaWdodCAmJiBzcGVjLmRlYWRFbmQpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBzZWdtZW50IG9mIG1zLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25UeXBlXSkge1xuICAgICAgICAvLyBDb25uZWN0IHdpdGhpbiBlYWNoIHNlZ21lbnRcbiAgICAgICAgdWYudW5pb24oc2VnbWVudC5tYXAoYyA9PiAocG9zIDw8IDgpICsgYykpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgICBjb25zdCBzZXRzID0gdWYuc2V0cygpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc2V0ID0gc2V0c1tpXTtcbiAgICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZXQpIHtcbiAgICAgICAgbWFwLnNldChlbGVtLCBzZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYXA7XG4gIH0gIFxuXG4gIC8qKiBAcmV0dXJuIFtwb3NpdGlvbiwgZGlyZWN0aW9uIG9mIGVkZ2UsIHNjcmVlbiBhdCBlZGdlLCB0cnVlIGlmIGV4aXQuICovXG4gICogYm9yZGVycygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtQb3MsIERpciwgVWlkLCBib29sZWFuXT4ge1xuICAgIGNvbnN0IGV4aXQgPSB0aGlzLnRpbGVzZXQuZXhpdC51aWQ7XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgIGNvbnN0IHRvcCA9IHg7XG4gICAgICBjb25zdCBib3R0b20gPSB0aGlzLmhlaWdodCA8PCA0IHwgeDtcbiAgICAgIHlpZWxkIFt0b3AsIERpci5OLCB0aGlzLl9zY3JlZW5zW3RvcCArIDE2XSwgdGhpcy5fc2NyZWVuc1t0b3BdID09PSBleGl0XTtcbiAgICAgIHlpZWxkIFtib3R0b20sIERpci5TLCB0aGlzLl9zY3JlZW5zW2JvdHRvbSArIDE2XSxcbiAgICAgICAgICAgICB0aGlzLl9zY3JlZW5zW2JvdHRvbSArIDMyXSA9PT0gZXhpdF07XG4gICAgfVxuICAgIGZvciAobGV0IHkgPSAxOyB5IDw9IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IGxlZnQgPSB5IDw8IDQ7XG4gICAgICBjb25zdCByaWdodCA9IGxlZnQgfCAodGhpcy53aWR0aCAtIDEpO1xuICAgICAgeWllbGQgW2xlZnQsIERpci5XLCB0aGlzLl9zY3JlZW5zW2xlZnQgKyAxNl0sXG4gICAgICAgICAgICAgdGhpcy5fc2NyZWVuc1tsZWZ0ICsgMTVdID09PSBleGl0XTtcbiAgICAgIHlpZWxkIFtyaWdodCwgRGlyLkUsIHRoaXMuX3NjcmVlbnNbcmlnaHQgKyAxNl0sXG4gICAgICAgICAgICAgdGhpcy5fc2NyZWVuc1tyaWdodCArIDE3XSA9PT0gZXhpdF07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEF0dGFjaCBhbiBleGl0L2VudHJhbmNlIHBhaXIgaW4gdHdvIGRpcmVjdGlvbnMuXG4gICAqIEFsc28gcmVhdHRhY2hlcyB0aGUgZm9ybWVyIG90aGVyIGVuZHMgb2YgZWFjaCB0byBlYWNoIG90aGVyLlxuICAgKi9cbiAgYXR0YWNoKHNyY1BvczogUG9zLCBkZXN0OiBNZXRhbG9jYXRpb24sIGRlc3RQb3M6IFBvcyxcbiAgICAgICAgIHNyY1R5cGU/OiBDb25uZWN0aW9uVHlwZSwgZGVzdFR5cGU/OiBDb25uZWN0aW9uVHlwZSkge1xuICAgIGlmICghc3JjVHlwZSkgc3JjVHlwZSA9IHRoaXMucGlja1R5cGVGcm9tRXhpdHMoc3JjUG9zKTtcbiAgICBpZiAoIWRlc3RUeXBlKSBkZXN0VHlwZSA9IGRlc3QucGlja1R5cGVGcm9tRXhpdHMoZGVzdFBvcyk7XG5cbiAgICAvLyBUT0RPIC0gd2hhdCBpZiBtdWx0aXBsZSByZXZlcnNlcz8gIGUuZy4gY29yZGVsIGVhc3Qvd2VzdD9cbiAgICAvLyAgICAgIC0gY291bGQgZGV0ZXJtaW5lIGlmIHRoaXMgYW5kL29yIGRlc3QgaGFzIGFueSBzZWFtbGVzcy5cbiAgICAvLyBObzogaW5zdGVhZCwgZG8gYSBwb3N0LXByb2Nlc3MuICBPbmx5IGNvcmRlbCBtYXR0ZXJzLCBzbyBnb1xuICAgIC8vIHRocm91Z2ggYW5kIGF0dGFjaCBhbnkgcmVkdW5kYW50IGV4aXRzLlxuXG4gICAgY29uc3QgZGVzdFRpbGUgPSBkZXN0LmlkIDw8IDggfCBkZXN0UG9zO1xuICAgIGNvbnN0IHByZXZEZXN0ID0gdGhpcy5fZXhpdHMuZ2V0KHNyY1Bvcywgc3JjVHlwZSkhO1xuICAgIGlmIChwcmV2RGVzdCkge1xuICAgICAgY29uc3QgW3ByZXZEZXN0VGlsZSwgcHJldkRlc3RUeXBlXSA9IHByZXZEZXN0O1xuICAgICAgaWYgKHByZXZEZXN0VGlsZSA9PT0gZGVzdFRpbGUgJiYgcHJldkRlc3RUeXBlID09PSBkZXN0VHlwZSkgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBwcmV2U3JjID0gZGVzdC5fZXhpdHMuZ2V0KGRlc3RQb3MsIGRlc3RUeXBlKSE7XG4gICAgdGhpcy5fZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV0pO1xuICAgIGRlc3QuX2V4aXRzLnNldChkZXN0UG9zLCBkZXN0VHlwZSwgW3RoaXMuaWQgPDwgOCB8IHNyY1Bvcywgc3JjVHlwZV0pO1xuICAgIC8vIGFsc28gaG9vayB1cCBwcmV2aW91cyBwYWlyXG4gICAgaWYgKHByZXZTcmMgJiYgcHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2RGVzdFRpbGUsIHByZXZEZXN0VHlwZV0gPSBwcmV2RGVzdDtcbiAgICAgIGNvbnN0IFtwcmV2U3JjVGlsZSwgcHJldlNyY1R5cGVdID0gcHJldlNyYztcbiAgICAgIGNvbnN0IHByZXZTcmNNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZTcmNUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgY29uc3QgcHJldkRlc3RNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZEZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIHByZXZTcmNNZXRhLl9leGl0cy5zZXQocHJldlNyY1RpbGUgJiAweGZmLCBwcmV2U3JjVHlwZSwgcHJldkRlc3QpO1xuICAgICAgcHJldkRlc3RNZXRhLl9leGl0cy5zZXQocHJldkRlc3RUaWxlICYgMHhmZiwgcHJldkRlc3RUeXBlLCBwcmV2U3JjKTtcbiAgICB9IGVsc2UgaWYgKHByZXZTcmMgfHwgcHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2VGlsZSwgcHJldlR5cGVdID0gcHJldlNyYyB8fCBwcmV2RGVzdDtcbiAgICAgIGNvbnN0IHByZXZNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgcHJldk1ldGEuX2V4aXRzLmRlbGV0ZShwcmV2VGlsZSAmIDB4ZmYsIHByZXZUeXBlKTsgICAgICBcbiAgICB9XG4gIH1cblxuICBwaWNrVHlwZUZyb21FeGl0cyhwb3M6IFBvcyk6IENvbm5lY3Rpb25UeXBlIHtcbiAgICBjb25zdCB0eXBlcyA9IFsuLi50aGlzLl9leGl0cy5yb3cocG9zKS5rZXlzKCldO1xuICAgIGlmICghdHlwZXMubGVuZ3RoKSByZXR1cm4gdGhpcy5waWNrVHlwZUZyb21TY3JlZW5zKHBvcyk7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc2luZ2xlIHR5cGUgZm9yICR7aGV4KHBvcyl9OiBbJHt0eXBlcy5qb2luKCcsICcpfV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVzWzBdO1xuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIGFuIGV4aXQgZnJvbSBvbmUgcG9zL3R5cGUgdG8gYW5vdGhlci5cbiAgICogQWxzbyB1cGRhdGVzIHRoZSBtZXRhbG9jYXRpb24gb24gdGhlIG90aGVyIGVuZCBvZiB0aGUgZXhpdC5cbiAgICogVGhpcyBzaG91bGQgdHlwaWNhbGx5IGJlIGRvbmUgYXRvbWljYWxseSBpZiByZWJ1aWxkaW5nIGEgbWFwLlxuICAgKi9cbiAgLy8gVE9ETyAtIHJlYnVpbGRpbmcgYSBtYXAgaW52b2x2ZXMgbW92aW5nIHRvIGEgTkVXIG1ldGFsb2NhdGlvbi4uLlxuICAvLyAgICAgIC0gZ2l2ZW4gdGhpcywgd2UgbmVlZCBhIGRpZmZlcmVudCBhcHByb2FjaD9cbiAgbW92ZUV4aXRzKC4uLm1vdmVzOiBBcnJheTxbUG9zLCBDb25uZWN0aW9uVHlwZSwgUG9zLCBDb25uZWN0aW9uVHlwZV0+KSB7XG4gICAgY29uc3QgbmV3RXhpdHM6IEFycmF5PFtQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlY10+ID0gW107XG4gICAgZm9yIChjb25zdCBbb2xkUG9zLCBvbGRUeXBlLCBuZXdQb3MsIG5ld1R5cGVdIG9mIG1vdmVzKSB7XG4gICAgICBjb25zdCBkZXN0RXhpdCA9IHRoaXMuX2V4aXRzLmdldChvbGRQb3MsIG9sZFR5cGUpITtcbiAgICAgIGNvbnN0IFtkZXN0VGlsZSwgZGVzdFR5cGVdID0gZGVzdEV4aXQ7XG4gICAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgW3RoaXMuaWQgPDwgOCB8IG5ld1BvcywgbmV3VHlwZV0pO1xuICAgICAgbmV3RXhpdHMucHVzaChbbmV3UG9zLCBuZXdUeXBlLCBkZXN0RXhpdF0pO1xuICAgICAgdGhpcy5fZXhpdHMuZGVsZXRlKG9sZFBvcywgb2xkVHlwZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgZXhpdF0gb2YgbmV3RXhpdHMpIHtcbiAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgfVxuXG4gIG1vdmVFeGl0KHByZXY6IFBvcywgbmV4dDogUG9zLFxuICAgICAgICAgICBwcmV2VHlwZT86IENvbm5lY3Rpb25UeXBlLCBuZXh0VHlwZT86IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgaWYgKCFwcmV2VHlwZSkgcHJldlR5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbUV4aXRzKHByZXYpO1xuICAgIGlmICghbmV4dFR5cGUpIG5leHRUeXBlID0gdGhpcy5waWNrVHlwZUZyb21TY3JlZW5zKG5leHQpO1xuICAgIGNvbnN0IGRlc3RFeGl0ID0gdGhpcy5fZXhpdHMuZ2V0KHByZXYsIHByZXZUeXBlKSE7XG4gICAgY29uc3QgW2Rlc3RUaWxlLCBkZXN0VHlwZV0gPSBkZXN0RXhpdDtcbiAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICBbdGhpcy5pZCA8PCA4IHwgbmV4dCwgbmV4dFR5cGVdKTtcbiAgICB0aGlzLl9leGl0cy5zZXQobmV4dCwgbmV4dFR5cGUsIGRlc3RFeGl0KTtcbiAgICB0aGlzLl9leGl0cy5kZWxldGUocHJldiwgcHJldlR5cGUpO1xuICB9ICBcblxuICBwaWNrVHlwZUZyb21TY3JlZW5zKHBvczogUG9zKTogQ29ubmVjdGlvblR5cGUge1xuICAgIGNvbnN0IGV4aXRzID0gdGhpcy5yb20ubWV0YXNjcmVlbnNbdGhpcy5fc2NyZWVuc1twb3MgKyAxNl1dLmRhdGEuZXhpdHM7XG4gICAgY29uc3QgdHlwZXMgPSAoZXhpdHMgPz8gW10pLm1hcChlID0+IGUudHlwZSk7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBzaW5nbGUgdHlwZSBmb3IgJHtoZXgocG9zKX06IFske3R5cGVzLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZXNbMF07XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzZWFtbGVzcyBwYWlyIGxvY2F0aW9uLCBzeW5jIHVwIHRoZSBleGl0cy4gIEZvciBlYWNoIGV4aXQgb2ZcbiAgICogZWl0aGVyLCBjaGVjayBpZiBpdCdzIHN5bW1ldHJpYywgYW5kIGlmIHNvLCBjb3B5IGl0IG92ZXIgdG8gdGhlIG90aGVyIHNpZGUuXG4gICAqL1xuICByZWNvbmNpbGVFeGl0cyh0aGF0OiBNZXRhbG9jYXRpb24pIHtcbiAgICBjb25zdCBhZGQ6IFtNZXRhbG9jYXRpb24sIFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXVtdID0gW107XG4gICAgY29uc3QgZGVsOiBbTWV0YWxvY2F0aW9uLCBQb3MsIENvbm5lY3Rpb25UeXBlXVtdID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiBsb2MuX2V4aXRzKSB7XG4gICAgICAgIGlmIChkZXN0VHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF07XG4gICAgICAgIGNvbnN0IHJldmVyc2UgPSBkZXN0Lm1ldGEuX2V4aXRzLmdldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlKTtcbiAgICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgICBjb25zdCBbcmV2VGlsZSwgcmV2VHlwZV0gPSByZXZlcnNlO1xuICAgICAgICAgIGlmICgocmV2VGlsZSA+Pj4gOCkgPT09IGxvYy5pZCAmJiAocmV2VGlsZSAmIDB4ZmYpID09PSBwb3MgJiZcbiAgICAgICAgICAgICAgcmV2VHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgYWRkLnB1c2goW2xvYyA9PT0gdGhpcyA/IHRoYXQgOiB0aGlzLCBwb3MsIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkZWwucHVzaChbbG9jLCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGVdIG9mIGRlbCkge1xuICAgICAgbG9jLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGUsIGV4aXRdIG9mIGFkZCkge1xuICAgICAgbG9jLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gICAgLy8gdGhpcy5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICAgIC8vIHRoYXQuX2V4aXRzID0gbmV3IFRhYmxlKGV4aXRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTYXZlcyB0aGUgY3VycmVudCBzdGF0ZSBiYWNrIGludG8gdGhlIHVuZGVybHlpbmcgbG9jYXRpb24uXG4gICAqIEN1cnJlbnRseSB0aGlzIG9ubHkgZGVhbHMgd2l0aCBlbnRyYW5jZXMvZXhpdHMuXG4gICAqL1xuICB3cml0ZSgpIHtcbiAgICBjb25zdCBzcmNMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgZm9yIChjb25zdCBbc3JjUG9zLCBzcmNUeXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW3RoaXMuX3NjcmVlbnNbc3JjUG9zICsgMHgxMF1dO1xuICAgICAgY29uc3QgZGVzdCA9IGRlc3RUaWxlID4+IDg7XG4gICAgICBsZXQgZGVzdFBvcyA9IGRlc3RUaWxlICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3RMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF07XG4gICAgICBjb25zdCBkZXN0TWV0YSA9IGRlc3RMb2MubWV0YSE7XG4gICAgICBjb25zdCBkZXN0U2NyZWVuID1cbiAgICAgICAgICB0aGlzLnJvbS5tZXRhc2NyZWVuc1tkZXN0TWV0YS5fc2NyZWVuc1soZGVzdFRpbGUgJiAweGZmKSArIDB4MTBdXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gc3JjVHlwZSk7XG4gICAgICBjb25zdCBkZXN0RXhpdCA9IGRlc3RTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gZGVzdFR5cGUpO1xuICAgICAgaWYgKCFzcmNFeGl0IHx8ICFkZXN0RXhpdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZXhpdDpcbiAgRnJvbTogJHtzcmNMb2N9IEAgJHtoZXgoc3JjUG9zKX06JHtzcmNUeXBlfSAke3NyY1NjcmVlbi5uYW1lfVxuICBUbzogICAke2Rlc3RMb2N9IEAgJHtoZXgoZGVzdFBvcyl9OiR7ZGVzdFR5cGV9ICR7ZGVzdFNjcmVlbi5uYW1lfWApO1xuICAgICAgfVxuICAgICAgLy8gU2VlIGlmIHRoZSBkZXN0IGVudHJhbmNlIGV4aXN0cyB5ZXQuLi5cbiAgICAgIGxldCBlbnRyYW5jZSA9IDB4MjA7XG4gICAgICBpZiAoIWRlc3RFeGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICBsZXQgZGVzdENvb3JkID0gZGVzdEV4aXQuZW50cmFuY2U7XG4gICAgICAgIGlmIChkZXN0Q29vcmQgPiAweGVmZmYpIHsgLy8gaGFuZGxlIHNwZWNpYWwgY2FzZSBpbiBPYWtcbiAgICAgICAgICBkZXN0UG9zICs9IDB4MTA7XG4gICAgICAgICAgZGVzdENvb3JkIC09IDB4MTAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZW50cmFuY2UgPSBkZXN0TG9jLmZpbmRPckFkZEVudHJhbmNlKGRlc3RQb3MsIGRlc3RDb29yZCk7XG4gICAgICB9XG4gICAgICBmb3IgKGxldCB0aWxlIG9mIHNyY0V4aXQuZXhpdHMpIHtcbiAgICAgICAgLy9pZiAoc3JjRXhpdC50eXBlID09PSAnZWRnZTpib3R0b20nICYmIHRoaXMuaGVpZ2h0ID09PSAxKSB0aWxlIC09IDB4MjA7XG4gICAgICAgIHNyY0xvYy5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbjogc3JjUG9zLCB0aWxlLCBkZXN0LCBlbnRyYW5jZX0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3JjTG9jLndpZHRoID0gdGhpcy5fd2lkdGg7XG4gICAgc3JjTG9jLmhlaWdodCA9IHRoaXMuX2hlaWdodDtcbiAgICBzcmNMb2Muc2NyZWVucyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5faGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdzogbnVtYmVyW10gPSBbXTtcbiAgICAgIHNyY0xvYy5zY3JlZW5zLnB1c2gocm93KTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fd2lkdGg7IHgrKykge1xuICAgICAgICByb3cucHVzaCh0aGlzLnJvbS5tZXRhc2NyZWVuc1t0aGlzLl9zY3JlZW5zWyh5ICsgMSkgPDwgNCB8IHhdXS5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHNyY0xvYy50aWxlc2V0ID0gdGhpcy50aWxlc2V0LnRpbGVzZXRJZDtcbiAgICBzcmNMb2MudGlsZUVmZmVjdHMgPSB0aGlzLnRpbGVzZXQuZWZmZWN0cygpLmlkO1xuXG4gICAgLy8gd3JpdGUgZmxhZ3NcbiAgICBzcmNMb2MuZmxhZ3MgPSBbXTtcbiAgICBjb25zdCBmcmVlRmxhZ3MgPSBbLi4udGhpcy5mcmVlRmxhZ3NdO1xuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMucm9tLm1ldGFzY3JlZW5zW3RoaXMuX3NjcmVlbnNbc2NyZWVuICsgMTZdXTtcbiAgICAgIGxldCBmbGFnOiBudW1iZXJ8dW5kZWZpbmVkO1xuICAgICAgaWYgKHNjci5kYXRhLndhbGwgIT0gbnVsbCkge1xuICAgICAgICBmbGFnID0gZnJlZUZsYWdzLnBvcCgpPy5pZCA/PyB0aGlzLnJvbS5mbGFncy5hbGxvYygweDIwMCk7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnYWx3YXlzJykge1xuICAgICAgICBmbGFnID0gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjYWxtJykge1xuICAgICAgICBmbGFnID0gdGhpcy5yb20uZmxhZ3MuQ2FsbWVkQW5ncnlTZWEuaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tOmZhbHNlJykge1xuICAgICAgICBmbGFnID0gdGhpcy5jdXN0b21GbGFncy5nZXQoc2NyZWVuKT8uaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tOnRydWUnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZCA/PyB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfVxuICAgICAgaWYgKGZsYWcgIT0gbnVsbCkge1xuICAgICAgICBzcmNMb2MuZmxhZ3MucHVzaChMb2NhdGlvbkZsYWcub2Yoe3NjcmVlbiwgZmxhZ30pKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fbW9uc3RlcnNJbnZhbGlkYXRlZCkge1xuICAgICAgLy8gVE9ETyAtIGlmIG1vbnN0ZXJzIGludmFsaWRhdGVkLCB0aGVuIHJlcGxhY2UgdGhlbS4uLlxuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgVHJhdmVyc2VPcHRzIHtcbiAgLy8gRG8gbm90IHBhc3MgY2VydGFpbiB0aWxlcyBpbiB0cmF2ZXJzZVxuICByZWFkb25seSB3aXRob3V0PzogcmVhZG9ubHkgUG9zW107XG4gIC8vIFdoZXRoZXIgdG8gYnJlYWsgd2FsbHMvZm9ybSBicmlkZ2VzXG4gIHJlYWRvbmx5IG5vRmxhZ2dlZD86IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdG8gYXNzdW1lIGZsaWdodFxuICByZWFkb25seSBmbGlnaHQ/OiBib29sZWFuO1xufVxuXG5cbmNvbnN0IHVua25vd25FeGl0V2hpdGVsaXN0ID0gbmV3IFNldChbXG4gIDB4MDEwMDNhLCAvLyB0b3AgcGFydCBvZiBjYXZlIG91dHNpZGUgc3RhcnRcbiAgMHgwMTAwM2IsXG4gIDB4MTQ0MGEwLCAvLyBiZW5lYXRoIGVudHJhbmNlIHRvIGJyeW5tYWVyXG4gIDB4MTU0MGEwLCAvLyBcIiBcIiBzZWFtbGVzcyBlcXVpdmFsZW50IFwiIFwiXG4gIDB4MWEzMDYwLCAvLyBzd2FtcCBleGl0XG4gIDB4MWEzMGEwLFxuICAweDQwMjAwMCwgLy8gYnJpZGdlIHRvIGZpc2hlcm1hbiBpc2xhbmRcbiAgMHg0MDIwMzAsXG4gIDB4NDE4MGQwLCAvLyBiZWxvdyBleGl0IHRvIGxpbWUgdHJlZSB2YWxsZXlcbiAgMHg2MDg3YmYsIC8vIGJlbG93IGJvYXQgY2hhbm5lbFxuICAweGExMDMyNiwgLy8gY3J5cHQgMiBhcmVuYSBub3J0aCBlZGdlXG4gIDB4YTEwMzI5LFxuICAweGE5MDYyNiwgLy8gc3RhaXJzIGFib3ZlIGtlbGJ5IDJcbiAgMHhhOTA2MjksXG5dKTtcblxuY29uc3QgRFBPUyA9IFstMTYsIC0xLCAxNiwgMV07XG4iXX0=