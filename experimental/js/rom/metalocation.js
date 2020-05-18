import { Exit, Flag as LocationFlag, Pit, ytDiff, ytAdd } from './locationtables.js';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFJckYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVoQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUc1QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRXZDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFzQ2pCLE1BQU0sT0FBTyxZQUFZO0lBaUN2QixZQUFxQixFQUFVLEVBQVcsT0FBb0IsRUFDbEQsTUFBYyxFQUFFLEtBQWE7UUFEcEIsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUFXLFlBQU8sR0FBUCxPQUFPLENBQWE7UUEzQjlELGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUNuQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVEsQ0FBQztRQU9wQixTQUFJLEdBQW9CLFNBQVMsQ0FBQztRQUVsQyxXQUFNLEdBQUcsSUFBSSxLQUFLLEVBQWlDLENBQUM7UUFDcEQsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFrQnJDLElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLElB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QyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckUsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLEtBQVUsRUFBRSxJQUFTLEVBQUUsS0FBVSxFQUFFLElBQWtCO0lBQ3JFLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxHQUFHLENBQUM7SUFDdEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQztJQUN0QixNQUFNLEVBQUUsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLEtBQUssS0FBSyxDQUFDLENBQUM7SUFDdkIsTUFBTSxFQUFFLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUN2QixNQUFNLEVBQUUsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDdEIsQ0FBQztBQUdELE1BQU0sU0FBUyxHQUFzQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9jYXRpb24gfSBmcm9tICcuL2xvY2F0aW9uLmpzJzsgLy8gaW1wb3J0IHR5cGVcbmltcG9ydCB7IEV4aXQsIEZsYWcgYXMgTG9jYXRpb25GbGFnLCBQaXQsIHl0RGlmZiwgeXRBZGQgfSBmcm9tICcuL2xvY2F0aW9udGFibGVzLmpzJztcbmltcG9ydCB7IEZsYWcgfSBmcm9tICcuL2ZsYWdzLmpzJztcbmltcG9ydCB7IE1ldGFzY3JlZW4sIFVpZCB9IGZyb20gJy4vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQgeyBNZXRhdGlsZXNldCB9IGZyb20gJy4vbWV0YXRpbGVzZXQuanMnO1xuaW1wb3J0IHsgaGV4IH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7IFJvbSB9IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQgeyBEZWZhdWx0TWFwLCBUYWJsZSwgaXRlcnMsIGZvcm1hdCB9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHsgVW5pb25GaW5kIH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7IENvbm5lY3Rpb25UeXBlIH0gZnJvbSAnLi9tZXRhc2NyZWVuZGF0YS5qcyc7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbi8vIE1vZGVsIG9mIGEgbG9jYXRpb24gd2l0aCBtZXRhc2NyZWVucywgZXRjLlxuXG4vLyBUcmljazogd2UgbmVlZCBzb21ldGhpbmcgdG8gb3duIHRoZSBuZWlnaGJvciBjYWNoZS5cbi8vICAtIHByb2JhYmx5IHRoaXMgYmVsb25ncyBpbiB0aGUgTWV0YXRpbGVzZXQuXG4vLyAgLSBtZXRob2QgdG8gcmVnZW5lcmF0ZSwgZG8gaXQgYWZ0ZXIgdGhlIHNjcmVlbiBtb2RzP1xuLy8gRGF0YSB3ZSB3YW50IHRvIGtlZXAgdHJhY2sgb2Y6XG4vLyAgLSBnaXZlbiB0d28gc2NyZWVucyBhbmQgYSBkaXJlY3Rpb24sIGNhbiB0aGV5IGFidXQ/XG4vLyAgLSBnaXZlbiBhIHNjcmVlbiBhbmQgYSBkaXJlY3Rpb24sIHdoYXQgc2NyZWVucyBvcGVuL2Nsb3NlIHRoYXQgZWRnZT9cbi8vICAgIC0gd2hpY2ggb25lIGlzIHRoZSBcImRlZmF1bHRcIj9cblxuLy8gVE9ETyAtIGNvbnNpZGVyIGFic3RyYWN0aW5nIGV4aXRzIGhlcmU/XG4vLyAgLSBleGl0czogQXJyYXk8W0V4aXRTcGVjLCBudW1iZXIsIEV4aXRTcGVjXT5cbi8vICAtIEV4aXRTcGVjID0ge3R5cGU/OiBDb25uZWN0aW9uVHlwZSwgc2NyPzogbnVtYmVyfVxuLy8gSG93IHRvIGhhbmRsZSBjb25uZWN0aW5nIHRoZW0gY29ycmVjdGx5P1xuLy8gIC0gc2ltcGx5IHNheWluZyBcIi0+IHdhdGVyZmFsbCB2YWxsZXkgY2F2ZVwiIGlzIG5vdCBoZWxwZnVsIHNpbmNlIHRoZXJlJ3MgMlxuLy8gICAgb3IgXCItPiB3aW5kIHZhbGxleSBjYXZlXCIgd2hlbiB0aGVyZSdzIDUuXG4vLyAgLSB1c2Ugc2NySWQgYXMgdW5pcXVlIGlkZW50aWZpZXI/ICBvbmx5IHByb2JsZW0gaXMgc2VhbGVkIGNhdmUgaGFzIDMuLi5cbi8vICAtIG1vdmUgdG8gZGlmZmVyZW50IHNjcmVlbiBhcyBuZWNlc3NhcnkuLi5cbi8vICAgIChjb3VsZCBhbHNvIGp1c3QgZGl0Y2ggdGhlIG90aGVyIHR3byBhbmQgdHJlYXQgd2luZG1pbGwgZW50cmFuY2UgYXNcbi8vICAgICBhIGRvd24gZW50cmFuY2UgLSBzYW1lIHcvIGxpZ2h0aG91c2U/KVxuLy8gIC0gb25seSBhIHNtYWxsIGhhbmRmdWxsIG9mIGxvY2F0aW9ucyBoYXZlIGRpc2Nvbm5lY3RlZCBjb21wb25lbnRzOlxuLy8gICAgICB3aW5kbWlsbCwgbGlnaHRob3VzZSwgcHlyYW1pZCwgZ29hIGJhY2tkb29yLCBzYWJlcmEsIHNhYnJlL2h5ZHJhIGxlZGdlc1xuLy8gIC0gd2UgcmVhbGx5IGRvIGNhcmUgd2hpY2ggaXMgaW4gd2hpY2ggY29tcG9uZW50LlxuLy8gICAgYnV0IG1hcCBlZGl0cyBtYXkgY2hhbmdlIGV2ZW4gdGhlIG51bWJlciBvZiBjb21wb25lbnRzPz8/XG4vLyAgLSBkbyB3ZSBkbyBlbnRyYW5jZSBzaHVmZmxlIGZpcnN0IG9yIG1hcCBzaHVmZmxlIGZpcnN0P1xuLy8gICAgb3IgYXJlIHRoZXkgaW50ZXJsZWF2ZWQ/IT9cbi8vICAgIGlmIHdlIHNodWZmbGUgc2FicmUgb3ZlcndvcmxkIHRoZW4gd2UgbmVlZCB0byBrbm93IHdoaWNoIGNhdmVzIGNvbm5lY3Rcbi8vICAgIHRvIHdoaWNoLi4uIGFuZCBwb3NzaWJseSBjaGFuZ2UgdGhlIGNvbm5lY3Rpb25zP1xuLy8gICAgLSBtYXkgbmVlZCBsZWV3YXkgdG8gYWRkL3N1YnRyYWN0IGNhdmUgZXhpdHM/P1xuLy8gUHJvYmxlbSBpcyB0aGF0IGVhY2ggZXhpdCBpcyBjby1vd25lZCBieSB0d28gbWV0YWxvY2F0aW9ucy5cblxuXG5leHBvcnQgdHlwZSBQb3MgPSBudW1iZXI7XG5leHBvcnQgdHlwZSBMb2NQb3MgPSBudW1iZXI7IC8vIGxvY2F0aW9uIDw8IDggfCBwb3NcbmV4cG9ydCB0eXBlIEV4aXRTcGVjID0gcmVhZG9ubHkgW0xvY1BvcywgQ29ubmVjdGlvblR5cGVdO1xuXG5leHBvcnQgY2xhc3MgTWV0YWxvY2F0aW9uIHtcblxuICAvLyBUT0RPIC0gc3RvcmUgbWV0YWRhdGEgYWJvdXQgd2luZG1pbGwgZmxhZz8gIHR3byBtZXRhbG9jcyB3aWxsIG5lZWQgYSBwb3MgdG9cbiAgLy8gaW5kaWNhdGUgd2hlcmUgdGhhdCBmbGFnIHNob3VsZCBnby4uLj8gIE9yIHN0b3JlIGl0IGluIHRoZSBtZXRhc2NyZWVuP1xuXG4gIC8vIENhdmVzIGFyZSBhc3N1bWVkIHRvIGJlIGFsd2F5cyBvcGVuIHVubGVzcyB0aGVyZSdzIGEgZmxhZyBzZXQgaGVyZS4uLlxuICBjdXN0b21GbGFncyA9IG5ldyBNYXA8UG9zLCBGbGFnPigpO1xuICBmcmVlRmxhZ3MgPSBuZXcgU2V0PEZsYWc+KCk7XG5cbiAgcmVhZG9ubHkgcm9tOiBSb207XG5cbiAgcHJpdmF0ZSBfaGVpZ2h0OiBudW1iZXI7XG4gIHByaXZhdGUgX3dpZHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBfcG9zOiBQb3NbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgcHJpdmF0ZSBfZXhpdHMgPSBuZXcgVGFibGU8UG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWM+KCk7XG4gIHByaXZhdGUgX3BpdHMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpOyAvLyBNYXBzIHRvIGxvYyA8PCA4IHwgcG9zXG5cbiAgLy9wcml2YXRlIF9tb25zdGVyc0ludmFsaWRhdGVkID0gZmFsc2U7XG5cbiAgLyoqIEtleTogKHk8PDQpfHggKi9cbiAgcHJpdmF0ZSBfc2NyZWVuczogTWV0YXNjcmVlbltdO1xuXG4gIC8vIE5PVEU6IGtlZXBpbmcgdHJhY2sgb2YgcmVhY2hhYmlsaXR5IGlzIGltcG9ydGFudCBiZWNhdXNlIHdoZW4gd2VcbiAgLy8gZG8gdGhlIHN1cnZleSB3ZSBuZWVkIHRvIG9ubHkgY291bnQgUkVBQ0hBQkxFIHRpbGVzISAgU2VhbWxlc3NcbiAgLy8gcGFpcnMgYW5kIGJyaWRnZXMgY2FuIGNhdXNlIGxvdHMgb2YgaW1wb3J0YW50LXRvLXJldGFpbiB1bnJlYWNoYWJsZVxuICAvLyB0aWxlcy4gIE1vcmVvdmVyLCBzb21lIGRlYWQtZW5kIHRpbGVzIGNhbid0IGFjdHVhbGx5IGJlIHdhbGtlZCBvbi5cbiAgLy8gRm9yIG5vdyB3ZSdsbCBqdXN0IHplcm8gb3V0IGZlYXR1cmUgbWV0YXNjcmVlbnMgdGhhdCBhcmVuJ3RcbiAgLy8gcmVhY2hhYmxlLCBzaW5jZSB0cnlpbmcgdG8gZG8gaXQgY29ycmVjdGx5IHJlcXVpcmVzIHN0b3JpbmdcbiAgLy8gcmVhY2hhYmlsaXR5IGF0IHRoZSB0aWxlIGxldmVsIChhZ2FpbiBkdWUgdG8gYnJpZGdlIGRvdWJsZSBzdGFpcnMpLlxuICAvLyBwcml2YXRlIF9yZWFjaGFibGU6IFVpbnQ4QXJyYXl8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGlkOiBudW1iZXIsIHJlYWRvbmx5IHRpbGVzZXQ6IE1ldGF0aWxlc2V0LFxuICAgICAgICAgICAgICBoZWlnaHQ6IG51bWJlciwgd2lkdGg6IG51bWJlcikge1xuICAgIHRoaXMucm9tID0gdGlsZXNldC5yb207XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuX3dpZHRoID0gd2lkdGg7XG4gICAgdGhpcy5fc2NyZWVucyA9IG5ldyBBcnJheShoZWlnaHQgPDwgNCkuZmlsbCh0aWxlc2V0LmVtcHR5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBvdXQgYSBtZXRhbG9jYXRpb24gZnJvbSB0aGUgZ2l2ZW4gbG9jYXRpb24uICBJbmZlciB0aGVcbiAgICogdGlsZXNldCBpZiBwb3NzaWJsZSwgb3RoZXJ3aXNlIGl0IG11c3QgYmUgZXhwbGljaXRseSBzcGVjaWZpZWQuXG4gICAqL1xuICBzdGF0aWMgb2YobG9jYXRpb246IExvY2F0aW9uLCB0aWxlc2V0PzogTWV0YXRpbGVzZXQpOiBNZXRhbG9jYXRpb24ge1xuICAgIGNvbnN0IHtyb20sIHdpZHRoLCBoZWlnaHR9ID0gbG9jYXRpb247XG4gICAgaWYgKCF0aWxlc2V0KSB7XG4gICAgICAvLyBJbmZlciB0aGUgdGlsZXNldC4gIFN0YXJ0IGJ5IGFkZGluZyBhbGwgY29tcGF0aWJsZSBtZXRhdGlsZXNldHMuXG4gICAgICBjb25zdCB7Zm9ydHJlc3MsIGxhYnlyaW50aH0gPSByb20ubWV0YXRpbGVzZXRzO1xuICAgICAgY29uc3QgdGlsZXNldHMgPSBuZXcgU2V0PE1ldGF0aWxlc2V0PigpO1xuICAgICAgZm9yIChjb25zdCB0cyBvZiByb20ubWV0YXRpbGVzZXRzKSB7XG4gICAgICAgIGlmIChsb2NhdGlvbi50aWxlc2V0ID09PSB0cy50aWxlc2V0LmlkKSB0aWxlc2V0cy5hZGQodHMpO1xuICAgICAgfVxuICAgICAgLy8gSXQncyBpbXBvc3NpYmxlIHRvIGRpc3Rpbmd1aXNoIGZvcnRyZXNzIGFuZCBsYWJ5cmludGgsIHNvIHdlIGhhcmRjb2RlXG4gICAgICAvLyBpdCBiYXNlZCBvbiBsb2NhdGlvbjogb25seSAkYTkgaXMgbGFieXJpbnRoLlxuICAgICAgdGlsZXNldHMuZGVsZXRlKGxvY2F0aW9uLmlkID09PSAweGE5ID8gZm9ydHJlc3MgOiBsYWJ5cmludGgpO1xuICAgICAgLy8gRmlsdGVyIG91dCBhbnkgdGlsZXNldHMgdGhhdCBkb24ndCBpbmNsdWRlIG5lY2Vzc2FyeSBzY3JlZW4gaWRzLlxuICAgICAgZm9yIChjb25zdCBzY3JlZW4gb2YgbmV3IFNldChpdGVycy5jb25jYXQoLi4ubG9jYXRpb24uc2NyZWVucykpKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGlsZXNldCBvZiB0aWxlc2V0cykge1xuICAgICAgICAgIGlmICghdGlsZXNldC5nZXRNZXRhc2NyZWVucyhzY3JlZW4pLmxlbmd0aCkgdGlsZXNldHMuZGVsZXRlKHRpbGVzZXQpO1xuICAgICAgICAgIGlmICghdGlsZXNldHMuc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB0aWxlc2V0IGZvciAke2hleChzY3JlZW4pfSBpbiAke2xvY2F0aW9ufWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHRpbGVzZXRzLnNpemUgIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tdW5pcXVlIHRpbGVzZXQgZm9yICR7bG9jYXRpb259OiBbJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5mcm9tKHRpbGVzZXRzLCB0ID0+IHQubmFtZSkuam9pbignLCAnKX1dYCk7XG4gICAgICB9XG4gICAgICB0aWxlc2V0ID0gWy4uLnRpbGVzZXRzXVswXTtcbiAgICB9XG5cbiAgICAvLyBUcmF2ZXJzZSB0aGUgbG9jYXRpb24gZm9yIGFsbCB0aWxlcyByZWFjaGFibGUgZnJvbSBhbiBlbnRyYW5jZS5cbiAgICAvLyBUaGlzIGlzIHVzZWQgdG8gaW5mb3JtIHdoaWNoIG1ldGFzY3JlZW4gdG8gc2VsZWN0IGZvciBzb21lIG9mIHRoZVxuICAgIC8vIHJlZHVuZGFudCBvbmVzIChpLmUuIGRvdWJsZSBkZWFkIGVuZHMpLiAgVGhpcyBpcyBhIHNpbXBsZSB0cmF2ZXJzYWxcbiAgICBjb25zdCByZWFjaGFibGUgPSBsb2NhdGlvbi5yZWFjaGFibGVUaWxlcyh0cnVlKTsgLy8gdHJhdmVyc2VSZWFjaGFibGUoMHgwNCk7XG4gICAgY29uc3QgcmVhY2hhYmxlU2NyZWVucyA9IG5ldyBTZXQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiByZWFjaGFibGUua2V5cygpKSB7XG4gICAgICByZWFjaGFibGVTY3JlZW5zLmFkZCh0aWxlID4+PiA4KTtcbiAgICAgIC8vcmVhY2hhYmxlU2NyZWVucy5hZGQoKHRpbGUgJiAweGYwMDApID4+PiA4IHwgKHRpbGUgJiAweGYwKSA+Pj4gNCk7XG4gICAgfVxuICAgIC8vIE5PVEU6IHNvbWUgZW50cmFuY2VzIGFyZSBvbiBpbXBhc3NhYmxlIHRpbGVzIGJ1dCB3ZSBzdGlsbCBjYXJlIGFib3V0XG4gICAgLy8gdGhlIHNjcmVlbnMgdW5kZXIgdGhlbSAoZS5nLiBib2F0IGFuZCBzaG9wIGVudHJhbmNlcykuICBBbHNvIG1ha2Ugc3VyZVxuICAgIC8vIHRvIGhhbmRsZSB0aGUgc2VhbWxlc3MgdG93ZXIgZXhpdHMuXG4gICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiBsb2NhdGlvbi5lbnRyYW5jZXMpIHtcbiAgICAgIGlmIChlbnRyYW5jZS51c2VkKSByZWFjaGFibGVTY3JlZW5zLmFkZChlbnRyYW5jZS5zY3JlZW4pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIHJlYWNoYWJsZVNjcmVlbnMuYWRkKGV4aXQuc2NyZWVuKTtcbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSkge1xuICAgICAgICAvLyBIYW5kbGUgc2VhbWxlc3MgZXhpdHMgb24gc2NyZWVuIGVkZ2VzOiBtYXJrIF9qdXN0XyB0aGUgbmVpZ2hib3JcbiAgICAgICAgLy8gc2NyZWVuIGFzIHJlYWNoYWJsZSAoaW5jbHVkaW5nIGRlYWQgY2VudGVyIHRpbGUgZm9yIG1hdGNoKS5cbiAgICAgICAgY29uc3QgeSA9IGV4aXQudGlsZSA+Pj4gNDtcbiAgICAgICAgaWYgKHkgPT09IDAgfHwgeSA9PT0gMHhlKSB7XG4gICAgICAgICAgcmVhY2hhYmxlLnNldChleGl0LnNjcmVlbiA8PCA4IHwgMHg4OCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy9jb25zdCBleGl0ID0gdGlsZXNldC5leGl0O1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgQXJyYXk8TWV0YXNjcmVlbj4oaGVpZ2h0IDw8IDQpLmZpbGwodGlsZXNldC5lbXB0eSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHQwID0geSA8PCA0IHwgeDtcbiAgICAgICAgY29uc3QgbWV0YXNjcmVlbnMgPSB0aWxlc2V0LmdldE1ldGFzY3JlZW5zKGxvY2F0aW9uLnNjcmVlbnNbeV1beF0pO1xuICAgICAgICBsZXQgbWV0YXNjcmVlbjogTWV0YXNjcmVlbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChtZXRhc2NyZWVucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBtZXRhc2NyZWVuID0gbWV0YXNjcmVlbnNbMF07XG4gICAgICAgIH0gZWxzZSBpZiAoIW1ldGFzY3JlZW5zLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW1wb3NzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRPT0QgLSBmaWx0ZXIgYmFzZWQgb24gd2hvIGhhcyBhIG1hdGNoIGZ1bmN0aW9uLCBvciBtYXRjaGluZyBmbGFnc1xuICAgICAgICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09ICgoeSA8PCA0KSB8IHgpKTtcbiAgICAgICAgICBjb25zdCBtYXRjaGVyczogTWV0YXNjcmVlbltdID0gW107XG4gICAgICAgICAgY29uc3QgYmVzdDogTWV0YXNjcmVlbltdID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1ldGFzY3JlZW5zKSB7XG4gICAgICAgICAgICBpZiAocy5kYXRhLm1hdGNoKSB7XG4gICAgICAgICAgICAgIG1hdGNoZXJzLnB1c2gocyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHMuZmxhZyA9PT0gJ2Fsd2F5cycgJiYgZmxhZz8uZmxhZyA9PT0gMHgyZmUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIXMuZmxhZyAmJiAhcy5kYXRhLndhbGwgJiYgIWZsYWcpIHtcbiAgICAgICAgICAgICAgYmVzdC51bnNoaWZ0KHMpOyAvLyBmcm9udC1sb2FkIG1hdGNoaW5nIGZsYWdzXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBiZXN0LnB1c2gocyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChtYXRjaGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlYWNoKGR5OiBudW1iZXIsIGR4OiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgY29uc3QgeDAgPSAoeCA8PCA4KSArIGR4O1xuICAgICAgICAgICAgICBjb25zdCB5MCA9ICh5IDw8IDgpICsgZHk7XG4gICAgICAgICAgICAgIGNvbnN0IHQgPVxuICAgICAgICAgICAgICAgICAgKHkwIDw8IDQpICYgMHhmMDAwIHwgeDAgJiAweGYwMCB8IHkwICYgMHhmMCB8ICh4MCA+PiA0KSAmIDB4ZjtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlYWNoYWJsZS5oYXModCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1hdGNoZXIgb2YgbWF0Y2hlcnMpIHtcbiAgICAgICAgICAgICAgaWYgKCFtYXRjaGVyLmRhdGEubWF0Y2ghKHJlYWNoLCBmbGFnICE9IG51bGwpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgbWV0YXNjcmVlbiA9IG1hdGNoZXI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIW1ldGFzY3JlZW4pIG1ldGFzY3JlZW4gPSBiZXN0WzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbWV0YXNjcmVlbikgdGhyb3cgbmV3IEVycm9yKCdpbXBvc3NpYmxlJyk7XG4gICAgICAgIC8vIGlmICgobWV0YXNjcmVlbi5kYXRhLmV4aXRzIHx8IG1ldGFzY3JlZW4uZGF0YS53YWxsKSAmJlxuICAgICAgICAvLyAgICAgIXJlYWNoYWJsZVNjcmVlbnMuaGFzKHQwKSAmJlxuICAgICAgICAvLyAgICAgdGlsZXNldCAhPT0gcm9tLm1ldGF0aWxlc2V0cy50b3dlcikge1xuICAgICAgICAvLyAgIC8vIE1ha2Ugc3VyZSB3ZSBkb24ndCBzdXJ2ZXkgdW5yZWFjaGFibGUgc2NyZWVucyAoYW5kIGl0J3MgaGFyZCB0b1xuICAgICAgICAvLyAgIC8vIHRvIGZpZ3VyZSBvdXQgd2hpY2ggaXMgd2hpY2ggbGF0ZXIpLiAgTWFrZSBzdXJlIG5vdCB0byBkbyB0aGlzIGZvclxuICAgICAgICAvLyAgIC8vIHRvd2VyIGJlY2F1c2Ugb3RoZXJ3aXNlIGl0J2xsIGNsb2JiZXIgaW1wb3J0YW50IHBhcnRzIG9mIHRoZSBtYXAuXG4gICAgICAgIC8vICAgbWV0YXNjcmVlbiA9IHRpbGVzZXQuZW1wdHk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgc2NyZWVuc1t0MF0gPSBtZXRhc2NyZWVuO1xuICAgICAgICAvLyAvLyBJZiB3ZSdyZSBvbiB0aGUgYm9yZGVyIGFuZCBpdCdzIGFuIGVkZ2UgZXhpdCB0aGVuIGNoYW5nZSB0aGUgYm9yZGVyXG4gICAgICAgIC8vIC8vIHNjcmVlbiB0byByZWZsZWN0IGFuIGV4aXQuXG4gICAgICAgIC8vIGNvbnN0IGVkZ2VzID0gbWV0YXNjcmVlbi5lZGdlRXhpdHMoKTtcbiAgICAgICAgLy8gaWYgKHkgPT09IDAgJiYgKGVkZ2VzICYgMSkpIHNjcmVlbnNbdDAgLSAxNl0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeCA9PT0gMCAmJiAoZWRnZXMgJiAyKSkgc2NyZWVuc1t0MCAtIDFdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHkgPT09IGhlaWdodCAmJiAoZWRnZXMgJiA0KSkgc2NyZWVuc1t0MCArIDE2XSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh4ID09PSB3aWR0aCAmJiAoZWRnZXMgJiA4KSkgc2NyZWVuc1t0MCArIDFdID0gZXhpdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaWd1cmUgb3V0IGV4aXRzXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgVGFibGU8UG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWM+KCk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC5kZXN0ID09PSAweGZmKSBjb250aW51ZTtcbiAgICAgIGxldCBzcmNQb3MgPSBleGl0LnNjcmVlbjtcbiAgICAgIC8vIEtlbnN1IGFyZW5hIGV4aXQgaXMgZGVjbGFyZWQgYXQgeT1mXG4gICAgICBpZiAoZXhpdC5pc1NlYW1sZXNzKCkgJiYgIShleGl0Lnl0ICYgMHgwZikpIHNyY1Bvcy0tO1xuICAgICAgaWYgKCFyZWFjaGFibGVTY3JlZW5zLmhhcyhzcmNQb3MpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHNjcmVlbnNbc3JjUG9zXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZmluZEV4aXRUeXBlKGV4aXQudGlsZSwgaGVpZ2h0ID09PSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgISEoZXhpdC5lbnRyYW5jZSAmIDB4MjApKTtcbiAgICAgIGNvbnN0IHNyY1R5cGUgPSBzcmNFeGl0Py50eXBlO1xuICAgICAgaWYgKCFzcmNUeXBlKSB7XG4gICAgICAgIGNvbnN0IGlkID0gbG9jYXRpb24uaWQgPDwgMTYgfCBzcmNQb3MgPDwgOCB8IGV4aXQudGlsZTtcbiAgICAgICAgaWYgKHVua25vd25FeGl0V2hpdGVsaXN0LmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBhbGwgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8ubWFwKFxuICAgICAgICAgICAgZSA9PiBlLnR5cGUgKyAnOiAnICsgZS5leGl0cy5tYXAoaGV4KS5qb2luKCcsICcpKS5qb2luKCdcXG4gICcpO1xuICAgICAgICBjb25zb2xlLndhcm4oYFVua25vd24gZXhpdCAke2hleChleGl0LnRpbGUpfTogJHtzcmNTY3JlZW4ubmFtZX0gaW4gJHtcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbn0gQCAke2hleChzcmNQb3MpfTpcXG4gICR7YWxsfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChleGl0cy5oYXMoc3JjUG9zLCBzcmNUeXBlKSkgY29udGludWU7IC8vIGFscmVhZHkgaGFuZGxlZFxuICAgICAgY29uc3QgZGVzdCA9IHJvbS5sb2NhdGlvbnNbZXhpdC5kZXN0XTtcbiAgICAgIGlmIChzcmNUeXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgY29uc3QgZG93biA9IHNyY1R5cGUgPT09ICdzZWFtbGVzczpkb3duJztcbiAgICAgICAgLy8gTk9URTogdGhpcyBzZWVtcyB3cm9uZyAtIHRoZSBkb3duIGV4aXQgaXMgQkVMT1cgdGhlIHVwIGV4aXQuLi4/XG4gICAgICAgIGNvbnN0IHRpbGUgPSBzcmNFeGl0IS5leGl0c1swXSArIChkb3duID8gLTE2IDogMTYpO1xuICAgICAgICAvL2NvbnN0IGRlc3RQb3MgPSBzcmNQb3MgKyAodGlsZSA8IDAgPyAtMTYgOiB0aWxlID49IDB4ZjAgPyAxNiA6IC0wKTtcbiAgICAgICAgLy8gTk9URTogYm90dG9tLWVkZ2Ugc2VhbWxlc3MgaXMgdHJlYXRlZCBhcyBkZXN0aW5hdGlvbiBmMFxuICAgICAgICBjb25zdCBkZXN0UG9zID0gc3JjUG9zICsgKHRpbGUgPCAwID8gLTE2IDogMCk7XG4gICAgICAgIGNvbnN0IGRlc3RUeXBlID0gZG93biA/ICdzZWFtbGVzczp1cCcgOiAnc2VhbWxlc3M6ZG93bic7XG4gICAgICAgIC8vY29uc29sZS5sb2coYCR7c3JjVHlwZX0gJHtoZXgobG9jYXRpb24uaWQpfSAke2Rvd259ICR7aGV4KHRpbGUpfSAke2hleChkZXN0UG9zKX0gJHtkZXN0VHlwZX0gJHtoZXgoZGVzdC5pZCl9YCk7XG4gICAgICAgIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGVudHJhbmNlID0gZGVzdC5lbnRyYW5jZXNbZXhpdC5lbnRyYW5jZSAmIDB4MWZdO1xuICAgICAgbGV0IGRlc3RQb3MgPSBlbnRyYW5jZS5zY3JlZW47XG4gICAgICBsZXQgZGVzdENvb3JkID0gZW50cmFuY2UuY29vcmQ7XG4gICAgICBpZiAoc3JjVHlwZSA9PT0gJ2Rvb3InICYmIChlbnRyYW5jZS55ICYgMHhmMCkgPT09IDApIHtcbiAgICAgICAgLy8gTk9URTogVGhlIGl0ZW0gc2hvcCBkb29yIGluIE9hayBzdHJhZGRsZXMgdHdvIHNjcmVlbnMgKGV4aXQgaXMgb25cbiAgICAgICAgLy8gdGhlIE5XIHNjcmVlbiB3aGlsZSBlbnRyYW5jZSBpcyBvbiBTVyBzY3JlZW4pLiAgRG8gYSBxdWljayBoYWNrIHRvXG4gICAgICAgIC8vIGRldGVjdCB0aGlzIChwcm94eWluZyBcImRvb3JcIiBmb3IgXCJ1cHdhcmQgZXhpdFwiKSBhbmQgYWRqdXN0IHNlYXJjaFxuICAgICAgICAvLyB0YXJnZXQgYWNjb3JkaW5nbHkuXG4gICAgICAgIGRlc3RQb3MgLT0gMHgxMDtcbiAgICAgICAgZGVzdENvb3JkICs9IDB4MTAwMDA7XG4gICAgICB9XG4gICAgICAvLyBGaWd1cmUgb3V0IHRoZSBjb25uZWN0aW9uIHR5cGUgZm9yIHRoZSBkZXN0VGlsZS5cbiAgICAgIGNvbnN0IGRlc3RTY3JJZCA9IGRlc3Quc2NyZWVuc1tkZXN0UG9zID4+IDRdW2Rlc3RQb3MgJiAweGZdO1xuICAgICAgY29uc3QgZGVzdFR5cGUgPSBmaW5kRW50cmFuY2VUeXBlKGRlc3QsIGRlc3RTY3JJZCwgZGVzdENvb3JkKTtcbiAgICAgIC8vIE5PVEU6IGluaXRpYWwgc3Bhd24gaGFzIG5vIHR5cGUuLi4/XG4gICAgICBpZiAoIWRlc3RUeXBlKSB7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZGVzdFNjciBvZiByb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChkZXN0U2NySWQsIGRlc3QudGlsZXNldCkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgZGVzdFNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgICAgICBpZiAoZXhpdC50eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGluZXMucHVzaChgICAke2Rlc3RTY3IubmFtZX0gJHtleGl0LnR5cGV9OiAke2hleChleGl0LmVudHJhbmNlKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS53YXJuKGBCYWQgZW50cmFuY2UgJHtoZXgoZGVzdENvb3JkKX06IHJhdyAke2hleChkZXN0U2NySWQpXG4gICAgICAgICAgICAgICAgICAgICAgfSBpbiAke2Rlc3R9IEAgJHtoZXgoZGVzdFBvcyl9XFxuJHtsaW5lcy5qb2luKCdcXG4nKX1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICAgIC8vIGlmIChkZXN0VHlwZSkgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgdGhlIHBpdHMgbWFwLlxuICAgIGNvbnN0IHBpdHMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgcGl0IG9mIGxvY2F0aW9uLnBpdHMpIHtcbiAgICAgIHBpdHMuc2V0KHBpdC5mcm9tU2NyZWVuLCBwaXQuZGVzdCA8PCA4IHwgcGl0LnRvU2NyZWVuKTtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhbG9jID0gbmV3IE1ldGFsb2NhdGlvbihsb2NhdGlvbi5pZCwgdGlsZXNldCwgaGVpZ2h0LCB3aWR0aCk7XG4gICAgLy8gZm9yIChsZXQgaSA9IDA7IGkgPCBzY3JlZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gICBtZXRhbG9jLnNldEludGVybmFsKGksIHNjcmVlbnNbaV0pO1xuICAgIC8vIH1cbiAgICBtZXRhbG9jLl9zY3JlZW5zID0gc2NyZWVucztcbiAgICBtZXRhbG9jLl9leGl0cyA9IGV4aXRzO1xuICAgIG1ldGFsb2MuX3BpdHMgPSBwaXRzO1xuXG4gICAgLy8gRmlsbCBpbiBjdXN0b20gZmxhZ3NcbiAgICBmb3IgKGNvbnN0IGYgb2YgbG9jYXRpb24uZmxhZ3MpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGFsb2MuX3NjcmVlbnNbZi5zY3JlZW5dO1xuICAgICAgaWYgKHNjci5mbGFnPy5zdGFydHNXaXRoKCdjdXN0b20nKSkge1xuICAgICAgICBtZXRhbG9jLmN1c3RvbUZsYWdzLnNldChmLnNjcmVlbiwgcm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgICAgfSBlbHNlIGlmICghc2NyLmZsYWcpIHtcbiAgICAgICAgbWV0YWxvYy5mcmVlRmxhZ3MuYWRkKHJvbS5mbGFnc1tmLmZsYWddKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZm9yIChjb25zdCBwb3Mgb2YgbWV0YWxvYy5hbGxQb3MoKSkge1xuICAgIC8vICAgY29uc3Qgc2NyID0gcm9tLm1ldGFzY3JlZW5zW21ldGFsb2MuX3NjcmVlbnNbcG9zICsgMTZdXTtcbiAgICAvLyAgIGlmIChzY3IuZmxhZyA9PT0gJ2N1c3RvbScpIHtcbiAgICAvLyAgICAgY29uc3QgZiA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gcG9zKTtcbiAgICAvLyAgICAgaWYgKGYpIG1ldGFsb2MuY3VzdG9tRmxhZ3Muc2V0KHBvcywgcm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIC8vIFRPRE8gLSBzdG9yZSByZWFjaGFiaWxpdHkgbWFwP1xuICAgIHJldHVybiBtZXRhbG9jO1xuXG4gICAgZnVuY3Rpb24gZmluZEVudHJhbmNlVHlwZShkZXN0OiBMb2NhdGlvbiwgc2NySWQ6IG51bWJlciwgY29vcmQ6IG51bWJlcikge1xuICAgICAgZm9yIChjb25zdCBkZXN0U2NyIG9mIHJvbS5tZXRhc2NyZWVucy5nZXRCeUlkKHNjcklkLCBkZXN0LnRpbGVzZXQpKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBkZXN0U2NyLmZpbmRFbnRyYW5jZVR5cGUoY29vcmQsIGRlc3QuaGVpZ2h0ID09PSAxKTtcbiAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCkgcmV0dXJuIHR5cGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlzUmVhY2hhYmxlKHBvczogUG9zKTogYm9vbGVhbiB7XG4gIC8vICAgdGhpcy5jb21wdXRlUmVhY2hhYmxlKCk7XG4gIC8vICAgcmV0dXJuICEhKHRoaXMuX3JlYWNoYWJsZSFbcG9zID4+PiA0XSAmICgxIDw8IChwb3MgJiA3KSkpO1xuICAvLyB9XG5cbiAgLy8gY29tcHV0ZVJlYWNoYWJsZSgpIHtcbiAgLy8gICBpZiAodGhpcy5fcmVhY2hhYmxlKSByZXR1cm47XG4gIC8vICAgdGhpcy5fcmVhY2hhYmxlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5oZWlnaHQpO1xuICAvLyAgIGNvbnN0IG1hcCA9IHRoaXMudHJhdmVyc2Uoe2ZsaWdodDogdHJ1ZX0pO1xuICAvLyAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gICBjb25zdCByZWFjaGFibGUgPSBuZXcgU2V0PFBvcz4oKTtcbiAgLy8gICBmb3IgKGNvbnN0IFtwb3NdIG9mIHRoaXMuX2V4aXRzKSB7XG4gIC8vICAgICBjb25zdCBzZXQgPSBtYXAuZ2V0KHBvcylcbiAgLy8gICB9XG4gIC8vIH1cblxuICBnZXRVaWQocG9zOiBQb3MpOiBVaWQge1xuICAgIHJldHVybiB0aGlzLl9zY3JlZW5zW3Bvc10udWlkO1xuICB9XG5cbiAgZ2V0KHBvczogUG9zKTogTWV0YXNjcmVlbiB7XG4gICAgcmV0dXJuIHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgfVxuXG4gIC8vIFJlYWRvbmx5IGFjY2Vzc29yLlxuICAvLyBnZXQgc2NyZWVucygpOiByZWFkb25seSBVaWRbXSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuX3NjcmVlbnM7XG4gIC8vIH1cblxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fd2lkdGg7XG4gIH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIpIHtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5faGVpZ2h0ID4gaGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zY3JlZW5zLnNwbGljZSgoaGVpZ2h0ICsgMikgPDwgNCwgKHRoaXMuX2hlaWdodCAtIGhlaWdodCkgPDwgNCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9oZWlnaHQgPCBoZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NjcmVlbnMubGVuZ3RoID0gKGhlaWdodCArIDIpIDw8IDQ7XG4gICAgICB0aGlzLl9zY3JlZW5zLmZpbGwodGhpcy50aWxlc2V0LmVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmhlaWdodCArIDIpIDw8IDQsIHRoaXMuX3NjcmVlbnMubGVuZ3RoKTtcbiAgICB9XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIFRPRE8gLSByZXNpemUgZnVuY3Rpb24/XG5cbiAgYWxsUG9zKCk6IHJlYWRvbmx5IFBvc1tdIHtcbiAgICBpZiAodGhpcy5fcG9zKSByZXR1cm4gdGhpcy5fcG9zO1xuICAgIGNvbnN0IHA6IG51bWJlcltdID0gdGhpcy5fcG9zID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl93aWR0aDsgeCsrKSB7XG4gICAgICAgIHAucHVzaCh5IDw8IDQgfCB4KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBzZXQocG9zOiBQb3MsIHNjcjogTWV0YXNjcmVlbiB8IG51bGwpIHtcbiAgICB0aGlzLl9zY3JlZW5zW3Bvc10gPSBzY3IgPz8gdGhpcy50aWxlc2V0LmVtcHR5O1xuICB9XG5cbiAgLy9pbnZhbGlkYXRlTW9uc3RlcnMoKSB7IHRoaXMuX21vbnN0ZXJzSW52YWxpZGF0ZWQgPSB0cnVlOyB9XG5cbiAgaW5Cb3VuZHMocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgICAvLyByZXR1cm4gaW5Cb3VuZHMocG9zLCB0aGlzLmhlaWdodCwgdGhpcy53aWR0aCk7XG4gICAgcmV0dXJuIChwb3MgJiAxNSkgPCB0aGlzLndpZHRoICYmIHBvcyA+PSAwICYmIHBvcyA+Pj4gNCA8IHRoaXMuaGVpZ2h0O1xuICB9XG5cbiAgLy8gaXNGaXhlZChwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0aGlzLl9maXhlZC5oYXMocG9zKTtcbiAgLy8gfVxuXG4gIC8qKlxuICAgKiBGb3JjZS1vdmVyd3JpdGVzIHRoZSBnaXZlbiByYW5nZSBvZiBzY3JlZW5zLiAgRG9lcyB2YWxpZGl0eSBjaGVja2luZ1xuICAgKiBvbmx5IGF0IHRoZSBlbmQuICBEb2VzIG5vdCBkbyBhbnl0aGluZyB3aXRoIGZlYXR1cmVzLCBzaW5jZSB0aGV5J3JlXG4gICAqIG9ubHkgc2V0IGluIGxhdGVyIHBhc3NlcyAoaS5lLiBzaHVmZmxlLCB3aGljaCBpcyBsYXN0KS5cbiAgICovXG4gIHNldDJkKHBvczogUG9zLFxuICAgICAgICBzY3JlZW5zOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8T3B0aW9uYWw8TWV0YXNjcmVlbj4+Pik6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHNjcmVlbnMpIHtcbiAgICAgIGxldCBkeCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IHNjciBvZiByb3cpIHtcbiAgICAgICAgaWYgKHNjcikgdGhpcy5zZXQocG9zICsgZHgsIHNjcik7XG4gICAgICAgIGR4Kys7XG4gICAgICB9XG4gICAgICBwb3MgKz0gMTY7XG4gICAgfVxuICAgIC8vIHJldHVybiB0aGlzLnZlcmlmeShwb3MwLCBzY3JlZW5zLmxlbmd0aCxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgTWF0aC5tYXgoLi4uc2NyZWVucy5tYXAociA9PiByLmxlbmd0aCkpKTtcbiAgICAvLyBUT0RPIC0gdGhpcyBpcyBraW5kIG9mIGJyb2tlbi4uLiA6LShcbiAgICAvLyByZXR1cm4gdGhpcy52YWxpZGF0ZSgpO1xuICAgIC8vcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKiogQ2hlY2sgYWxsIHRoZSBjdXJyZW50bHkgaW52YWxpZGF0ZWQgZWRnZXMsIHRoZW4gY2xlYXJzIGl0LiAqL1xuICB2YWxpZGF0ZSgpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBbMCwgMV0pIHtcbiAgICAgIGZvciAobGV0IHkgPSBkaXIgPyAwIDogMTsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IGRpcjsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICAgIGNvbnN0IHBvczA6IFBvcyA9IHkgPDwgNCB8IHg7XG4gICAgICAgICAgY29uc3Qgc2NyMCA9IHRoaXMuX3NjcmVlbnNbcG9zMF07XG4gICAgICAgICAgY29uc3QgcG9zMTogUG9zID0gcG9zMCAtIChkaXIgPyAxIDogMTYpO1xuICAgICAgICAgIGNvbnN0IHNjcjEgPSB0aGlzLl9zY3JlZW5zW3BvczFdO1xuICAgICAgICAgIGlmIChzY3IwLmlzRW1wdHkoKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKHNjcjEuaXNFbXB0eSgpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoIXNjcjAuY2hlY2tOZWlnaGJvcihzY3IxLCBkaXIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZm9ybWF0KCdiYWQgbmVpZ2hib3IgJXMgKCUwMngpICVzICVzICglMDJ4KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcjEubmFtZSwgcG9zMSwgRElSX05BTUVbZGlyXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyMC5uYW1lLCBwb3MwKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc3BsaWNlQ29sdW1ucyhsZWZ0OiBudW1iZXIsIGRlbGV0ZWQ6IG51bWJlciwgaW5zZXJ0ZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICBzY3JlZW5zOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8TWV0YXNjcmVlbj4+KSB7XG4gICAgLy8gRmlyc3QgYWRqdXN0IHRoZSBzY3JlZW5zLlxuICAgIGZvciAobGV0IHAgPSAwOyBwIDwgdGhpcy5fc2NyZWVucy5sZW5ndGg7IHAgKz0gMTYpIHtcbiAgICAgIHRoaXMuX3NjcmVlbnMuY29weVdpdGhpbihwICsgbGVmdCArIGluc2VydGVkLCBwICsgbGVmdCArIGRlbGV0ZWQsIHAgKyAxMCk7XG4gICAgICB0aGlzLl9zY3JlZW5zLnNwbGljZShwICsgbGVmdCwgaW5zZXJ0ZWQsIC4uLnNjcmVlbnNbcCA+PiA0XSk7XG4gICAgfVxuICAgIC8vIFVwZGF0ZSBkaW1lbnNpb25zIGFuZCBhY2NvdW50aW5nXG4gICAgY29uc3QgZGVsdGEgPSBpbnNlcnRlZCAtIGRlbGV0ZWQ7XG4gICAgdGhpcy53aWR0aCArPSBkZWx0YTtcbiAgICB0aGlzLl9wb3MgPSB1bmRlZmluZWQ7XG4gICAgLy8gTW92ZSByZWxldmFudCBleGl0c1xuICAgIGNvbnN0IG1vdmU6IFtQb3MsIENvbm5lY3Rpb25UeXBlLCBQb3MsIENvbm5lY3Rpb25UeXBlXVtdID0gW107XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgY29uc3QgeCA9IHBvcyAmIDB4ZjtcbiAgICAgIGlmICh4IDwgbGVmdCArIGRlbGV0ZWQpIHtcbiAgICAgICAgaWYgKHggPj0gbGVmdCkgdGhpcy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbW92ZS5wdXNoKFtwb3MsIHR5cGUsIHBvcyArIGRlbHRhLCB0eXBlXSk7XG4gICAgfVxuICAgIHRoaXMubW92ZUV4aXRzKC4uLm1vdmUpO1xuICAgIC8vIE1vdmUgZmxhZ3MgYW5kIHNwYXducyBpbiBwYXJlbnQgbG9jYXRpb25cbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgY29uc3QgeHQwID0gKGxlZnQgKyBkZWxldGVkKSA8PCA0O1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgcGFyZW50LnNwYXducykge1xuICAgICAgaWYgKHNwYXduLnh0IDwgeHQwKSBjb250aW51ZTtcbiAgICAgIHNwYXduLnh0IC09IChkZWx0YSA8PCA0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHBhcmVudC5mbGFncykge1xuICAgICAgaWYgKGZsYWcueHMgPCBsZWZ0ICsgZGVsZXRlZCkge1xuICAgICAgICBpZiAoZmxhZy54cyA+PSBsZWZ0KSBmbGFnLnNjcmVlbiA9IDB4ZmY7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZmxhZy54cyAtPSBkZWx0YTtcbiAgICB9XG4gICAgcGFyZW50LmZsYWdzID0gcGFyZW50LmZsYWdzLmZpbHRlcihmID0+IGYuc2NyZWVuICE9PSAweGZmKTtcblxuICAgIC8vIFRPRE8gLSBtb3ZlIHBpdHM/P1xuXG4gIH1cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vIEV4aXQgaGFuZGxpbmdcblxuICBzZXRFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSwgc3BlYzogRXhpdFNwZWMpIHtcbiAgICBjb25zdCBvdGhlciA9IHRoaXMucm9tLmxvY2F0aW9uc1tzcGVjWzBdID4+PiA4XS5tZXRhO1xuICAgIGlmICghb3RoZXIpIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHNldCB0d28td2F5IGV4aXQgd2l0aG91dCBtZXRhYCk7XG4gICAgdGhpcy5zZXRFeGl0T25lV2F5KHBvcywgdHlwZSwgc3BlYyk7XG4gICAgb3RoZXIuc2V0RXhpdE9uZVdheShzcGVjWzBdICYgMHhmZiwgc3BlY1sxXSwgW3RoaXMuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICB9XG4gIHNldEV4aXRPbmVXYXkocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlLCBzcGVjOiBFeGl0U3BlYykge1xuICAgIC8vIGNvbnN0IHByZXYgPSB0aGlzLl9leGl0cy5nZXQocG9zLCB0eXBlKTtcbiAgICAvLyBpZiAocHJldikge1xuICAgIC8vICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlswXSA+Pj4gOF0ubWV0YTtcbiAgICAvLyAgIGlmIChvdGhlcikgb3RoZXIuX2V4aXRzLmRlbGV0ZShwcmV2WzBdICYgMHhmZiwgcHJldlsxXSk7XG4gICAgLy8gfVxuICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIHNwZWMpO1xuICB9XG4gIGRlbGV0ZUV4aXQocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgdGhpcy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gIH1cblxuICBnZXRFeGl0KHBvczogUG9zLCB0eXBlOiBDb25uZWN0aW9uVHlwZSk6IEV4aXRTcGVjfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX2V4aXRzLmdldChwb3MsIHR5cGUpO1xuICB9XG5cbiAgZXhpdHMoKTogSXRlcmFibGU8cmVhZG9ubHkgW1BvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXT4ge1xuICAgIHJldHVybiB0aGlzLl9leGl0cztcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb3VudGVkIGNhbmRpZGF0ZXM/XG4gIGV4aXRDYW5kaWRhdGVzKHR5cGU6IENvbm5lY3Rpb25UeXBlKTogTWV0YXNjcmVlbltdIHtcbiAgICAvLyBUT0RPIC0gZmlndXJlIG91dCBhIHdheSB0byB1c2UgdGhlIGRvdWJsZS1zdGFpcmNhc2U/ICBpdCB3b24ndFxuICAgIC8vIGhhcHBlbiBjdXJyZW50bHkgYmVjYXVzZSBpdCdzIGZpeGVkLCBzbyBpdCdzIGV4Y2x1ZGVkLi4uLj9cbiAgICBjb25zdCBoYXNFeGl0OiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNjciBvZiB0aGlzLnRpbGVzZXQpIHtcbiAgICAgIGlmIChzY3IuZGF0YS5leGl0cz8uc29tZShlID0+IGUudHlwZSA9PT0gdHlwZSkpIGhhc0V4aXQucHVzaChzY3IpO1xuICAgIH1cbiAgICByZXR1cm4gaGFzRXhpdDtcbiAgfVxuXG4gIC8vIFRPRE8gLSBzaG9ydCB2cyBmdWxsP1xuICBzaG93KCk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICBsZXQgbGluZSA9IFtdO1xuICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICBsaW5lLnB1c2goeC50b1N0cmluZygxNikpO1xuICAgIH1cbiAgICBsaW5lcy5wdXNoKCcgICAnICsgbGluZS5qb2luKCcgICcpKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgMzsgcisrKSB7XG4gICAgICAgIGxpbmUgPSBbciA9PT0gMSA/IHkudG9TdHJpbmcoMTYpIDogJyAnLCAnICddO1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF07XG4gICAgICAgICAgbGluZS5wdXNoKHNjcmVlbj8uZGF0YS5pY29uPy5mdWxsW3JdID8/IChyID09PSAxID8gJyA/ICcgOiAnICAgJykpO1xuICAgICAgICB9XG4gICAgICAgIGxpbmVzLnB1c2gobGluZS5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHNjcmVlbk5hbWVzKCk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGxldCBsaW5lID0gW107XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLl9zY3JlZW5zW3kgPDwgNCB8IHhdO1xuICAgICAgICBsaW5lLnB1c2goc2NyZWVuPy5uYW1lKTtcbiAgICAgIH1cbiAgICAgIGxpbmVzLnB1c2gobGluZS5qb2luKCcgJykpO1xuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICB0cmF2ZXJzZShvcHRzOiBUcmF2ZXJzZU9wdHMgPSB7fSk6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PiB7XG4gICAgLy8gUmV0dXJucyBhIG1hcCBmcm9tIHVuaW9uZmluZCByb290IHRvIGEgbGlzdCBvZiBhbGwgcmVhY2hhYmxlIHRpbGVzLlxuICAgIC8vIEFsbCBlbGVtZW50cyBvZiBzZXQgYXJlIGtleXMgcG9pbnRpbmcgdG8gdGhlIHNhbWUgdmFsdWUgcmVmLlxuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxudW1iZXI+KCk7XG4gICAgY29uc3QgY29ubmVjdGlvblR5cGUgPSAob3B0cy5mbGlnaHQgPyAyIDogMCkgfCAob3B0cy5ub0ZsYWdnZWQgPyAxIDogMCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gb3B0cy53aXRoPy5nZXQocG9zKSA/PyB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2NyLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25UeXBlXSkge1xuICAgICAgICBpZiAoIXNlZ21lbnQubGVuZ3RoKSBjb250aW51ZTsgLy8gZS5nLiBlbXB0eVxuICAgICAgICAvLyBDb25uZWN0IHdpdGhpbiBlYWNoIHNlZ21lbnRcbiAgICAgICAgdWYudW5pb24oc2VnbWVudC5tYXAoYyA9PiAocG9zIDw8IDgpICsgYykpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgICBjb25zdCBzZXRzID0gdWYuc2V0cygpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc2V0ID0gc2V0c1tpXTtcbiAgICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZXQpIHtcbiAgICAgICAgbWFwLnNldChlbGVtLCBzZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYXA7XG4gIH0gIFxuXG4gIC8qKiBAcGFyYW0gZWRnZSBBIHZhbHVlIGZyb20gYSB0cmF2ZXJzZSBzZXQuICovXG4gIGV4aXRUeXBlKGVkZ2U6IG51bWJlcik6IENvbm5lY3Rpb25UeXBlfHVuZGVmaW5lZCB7XG4gICAgaWYgKChlZGdlICYgMHhmMCkgIT09IDB4ZTApIHJldHVybjtcbiAgICBjb25zdCBwb3MgPSBlZGdlID4+PiA4O1xuICAgIGNvbnN0IHNjciA9IHRoaXMuZ2V0KHBvcyk7XG4gICAgY29uc3QgdHlwZSA9IHNjci5kYXRhLmV4aXRzPy5bZWRnZSAmIDB4Zl0udHlwZTtcbiAgICBpZiAoIXR5cGU/LnN0YXJ0c1dpdGgoJ2VkZ2U6JykpIHJldHVybiB0eXBlO1xuICAgIC8vIG1heSBub3QgYWN0dWFsbHkgYmUgYW4gZXhpdC5cbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6dG9wJyAmJiAocG9zID4+PiA0KSkgcmV0dXJuO1xuICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgPj4+IDQpID09PSB0aGlzLmhlaWdodCAtIDEpIHJldHVybjtcbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6bGVmdCcgJiYgKHBvcyAmIDB4ZikpIHJldHVybjtcbiAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiAocG9zICYgMHhmKSA9PT0gdGhpcy53aWR0aCAtIDEpIHJldHVybjtcbiAgICByZXR1cm4gdHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0gZWRnZSBBIHZhbHVlIGZyb20gYSB0cmF2ZXJzZSBzZXQuXG4gICAqIEByZXR1cm4gQW4gWXlYeCBwb3NpdGlvbiBmb3IgdGhlIGdpdmVuIHBvaSwgaWYgaXQgZXhpc3RzLlxuICAgKi9cbiAgcG9pVGlsZShlZGdlOiBudW1iZXIpOiBudW1iZXJ8dW5kZWZpbmVkIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGFjaCBhbiBleGl0L2VudHJhbmNlIHBhaXIgaW4gdHdvIGRpcmVjdGlvbnMuXG4gICAqIEFsc28gcmVhdHRhY2hlcyB0aGUgZm9ybWVyIG90aGVyIGVuZHMgb2YgZWFjaCB0byBlYWNoIG90aGVyLlxuICAgKi9cbiAgYXR0YWNoKHNyY1BvczogUG9zLCBkZXN0OiBNZXRhbG9jYXRpb24sIGRlc3RQb3M6IFBvcyxcbiAgICAgICAgIHNyY1R5cGU/OiBDb25uZWN0aW9uVHlwZSwgZGVzdFR5cGU/OiBDb25uZWN0aW9uVHlwZSkge1xuICAgIGlmICghc3JjVHlwZSkgc3JjVHlwZSA9IHRoaXMucGlja1R5cGVGcm9tRXhpdHMoc3JjUG9zKTtcbiAgICBpZiAoIWRlc3RUeXBlKSBkZXN0VHlwZSA9IGRlc3QucGlja1R5cGVGcm9tRXhpdHMoZGVzdFBvcyk7XG5cbiAgICAvLyBUT0RPIC0gd2hhdCBpZiBtdWx0aXBsZSByZXZlcnNlcz8gIGUuZy4gY29yZGVsIGVhc3Qvd2VzdD9cbiAgICAvLyAgICAgIC0gY291bGQgZGV0ZXJtaW5lIGlmIHRoaXMgYW5kL29yIGRlc3QgaGFzIGFueSBzZWFtbGVzcy5cbiAgICAvLyBObzogaW5zdGVhZCwgZG8gYSBwb3N0LXByb2Nlc3MuICBPbmx5IGNvcmRlbCBtYXR0ZXJzLCBzbyBnb1xuICAgIC8vIHRocm91Z2ggYW5kIGF0dGFjaCBhbnkgcmVkdW5kYW50IGV4aXRzLlxuXG4gICAgY29uc3QgZGVzdFRpbGUgPSBkZXN0LmlkIDw8IDggfCBkZXN0UG9zO1xuICAgIGNvbnN0IHNyY1RpbGUgPSB0aGlzLmlkIDw8IDggfCBzcmNQb3M7XG4gICAgY29uc3QgcHJldkRlc3QgPSB0aGlzLl9leGl0cy5nZXQoc3JjUG9zLCBzcmNUeXBlKTtcbiAgICBjb25zdCBwcmV2U3JjID0gZGVzdC5fZXhpdHMuZ2V0KGRlc3RQb3MsIGRlc3RUeXBlKTtcbiAgICBpZiAocHJldkRlc3QgJiYgcHJldlNyYykge1xuICAgICAgY29uc3QgW3ByZXZEZXN0VGlsZSwgcHJldkRlc3RUeXBlXSA9IHByZXZEZXN0O1xuICAgICAgY29uc3QgW3ByZXZTcmNUaWxlLCBwcmV2U3JjVHlwZV0gPSBwcmV2U3JjO1xuICAgICAgaWYgKHByZXZEZXN0VGlsZSA9PT0gZGVzdFRpbGUgJiYgcHJldkRlc3RUeXBlID09PSBkZXN0VHlwZSAmJlxuICAgICAgICAgIHByZXZTcmNUaWxlID09PSBzcmNUaWxlICYmIHByZXZTcmNUeXBlID09PSBzcmNUeXBlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV0pO1xuICAgIGRlc3QuX2V4aXRzLnNldChkZXN0UG9zLCBkZXN0VHlwZSwgW3NyY1RpbGUsIHNyY1R5cGVdKTtcbiAgICAvLyBhbHNvIGhvb2sgdXAgcHJldmlvdXMgcGFpclxuICAgIGlmIChwcmV2U3JjICYmIHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldkRlc3RUaWxlLCBwcmV2RGVzdFR5cGVdID0gcHJldkRlc3Q7XG4gICAgICBjb25zdCBbcHJldlNyY1RpbGUsIHByZXZTcmNUeXBlXSA9IHByZXZTcmM7XG4gICAgICBjb25zdCBwcmV2U3JjTWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2U3JjVGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIGNvbnN0IHByZXZEZXN0TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2RGVzdFRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICBwcmV2U3JjTWV0YS5fZXhpdHMuc2V0KHByZXZTcmNUaWxlICYgMHhmZiwgcHJldlNyY1R5cGUsIHByZXZEZXN0KTtcbiAgICAgIHByZXZEZXN0TWV0YS5fZXhpdHMuc2V0KHByZXZEZXN0VGlsZSAmIDB4ZmYsIHByZXZEZXN0VHlwZSwgcHJldlNyYyk7XG4gICAgfSBlbHNlIGlmIChwcmV2U3JjIHx8IHByZXZEZXN0KSB7XG4gICAgICBjb25zdCBbcHJldlRpbGUsIHByZXZUeXBlXSA9IChwcmV2U3JjIHx8IHByZXZEZXN0KSE7XG4gICAgICAvLyBOT1RFOiBpZiB3ZSB1c2VkIGF0dGFjaCB0byBob29rIHVwIHRoZSByZXZlcnNlIG9mIGEgb25lLXdheSBleGl0XG4gICAgICAvLyAoaS5lLiB0b3dlciBleGl0IHBhdGNoKSB0aGVuIHdlIG5lZWQgdG8gKm5vdCogcmVtb3ZlIHRoZSBvdGhlciBzaWRlLlxuICAgICAgaWYgKChwcmV2VGlsZSAhPT0gc3JjVGlsZSB8fCBwcmV2VHlwZSAhPT0gc3JjVHlwZSkgJiZcbiAgICAgICAgICAocHJldlRpbGUgIT09IGRlc3RUaWxlIHx8IHByZXZUeXBlICE9PSBkZXN0VHlwZSkpIHtcbiAgICAgICAgY29uc3QgcHJldk1ldGEgPSB0aGlzLnJvbS5sb2NhdGlvbnNbcHJldlRpbGUgPj4gOF0ubWV0YSE7XG4gICAgICAgIHByZXZNZXRhLl9leGl0cy5kZWxldGUocHJldlRpbGUgJiAweGZmLCBwcmV2VHlwZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcGlja1R5cGVGcm9tRXhpdHMocG9zOiBQb3MpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgY29uc3QgdHlwZXMgPSBbLi4udGhpcy5fZXhpdHMucm93KHBvcykua2V5cygpXTtcbiAgICBpZiAoIXR5cGVzLmxlbmd0aCkgcmV0dXJuIHRoaXMucGlja1R5cGVGcm9tU2NyZWVucyhwb3MpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHNpbmdsZSB0eXBlIGZvciAke2hleChwb3MpfTogWyR7dHlwZXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlc1swXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbiBleGl0IGZyb20gb25lIHBvcy90eXBlIHRvIGFub3RoZXIuXG4gICAqIEFsc28gdXBkYXRlcyB0aGUgbWV0YWxvY2F0aW9uIG9uIHRoZSBvdGhlciBlbmQgb2YgdGhlIGV4aXQuXG4gICAqIFRoaXMgc2hvdWxkIHR5cGljYWxseSBiZSBkb25lIGF0b21pY2FsbHkgaWYgcmVidWlsZGluZyBhIG1hcC5cbiAgICovXG4gIC8vIFRPRE8gLSByZWJ1aWxkaW5nIGEgbWFwIGludm9sdmVzIG1vdmluZyB0byBhIE5FVyBtZXRhbG9jYXRpb24uLi5cbiAgLy8gICAgICAtIGdpdmVuIHRoaXMsIHdlIG5lZWQgYSBkaWZmZXJlbnQgYXBwcm9hY2g/XG4gIG1vdmVFeGl0cyguLi5tb3ZlczogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIExvY1BvcywgQ29ubmVjdGlvblR5cGVdPikge1xuICAgIGNvbnN0IG5ld0V4aXRzOiBBcnJheTxbUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgW29sZFBvcywgb2xkVHlwZSwgbmV3UG9zLCBuZXdUeXBlXSBvZiBtb3Zlcykge1xuICAgICAgY29uc3QgZGVzdEV4aXQgPSB0aGlzLl9leGl0cy5nZXQob2xkUG9zLCBvbGRUeXBlKSE7XG4gICAgICBjb25zdCBbZGVzdFRpbGUsIGRlc3RUeXBlXSA9IGRlc3RFeGl0O1xuICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgIFt0aGlzLmlkIDw8IDggfCBuZXdQb3MsIG5ld1R5cGVdKTtcbiAgICAgIG5ld0V4aXRzLnB1c2goW25ld1BvcywgbmV3VHlwZSwgZGVzdEV4aXRdKTtcbiAgICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShvbGRQb3MsIG9sZFR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIGV4aXRdIG9mIG5ld0V4aXRzKSB7XG4gICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gIH1cblxuICBtb3ZlRXhpdChwcmV2OiBQb3MsIG5leHQ6IFBvcyxcbiAgICAgICAgICAgcHJldlR5cGU/OiBDb25uZWN0aW9uVHlwZSwgbmV4dFR5cGU/OiBDb25uZWN0aW9uVHlwZSkge1xuICAgIGlmICghcHJldlR5cGUpIHByZXZUeXBlID0gdGhpcy5waWNrVHlwZUZyb21FeGl0cyhwcmV2KTtcbiAgICBpZiAoIW5leHRUeXBlKSBuZXh0VHlwZSA9IHRoaXMucGlja1R5cGVGcm9tU2NyZWVucyhuZXh0KTtcbiAgICBjb25zdCBkZXN0RXhpdCA9IHRoaXMuX2V4aXRzLmdldChwcmV2LCBwcmV2VHlwZSkhO1xuICAgIGNvbnN0IFtkZXN0VGlsZSwgZGVzdFR5cGVdID0gZGVzdEV4aXQ7XG4gICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICBkZXN0Ll9leGl0cy5zZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgW3RoaXMuaWQgPDwgOCB8IG5leHQsIG5leHRUeXBlXSk7XG4gICAgdGhpcy5fZXhpdHMuc2V0KG5leHQsIG5leHRUeXBlLCBkZXN0RXhpdCk7XG4gICAgdGhpcy5fZXhpdHMuZGVsZXRlKHByZXYsIHByZXZUeXBlKTtcbiAgfVxuXG4gIG1vdmVFeGl0c0FuZFBpdHNUbyhvdGhlcjogTWV0YWxvY2F0aW9uKSB7XG4gICAgY29uc3QgbW92ZWQgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBvdGhlci5hbGxQb3MoKSkge1xuICAgICAgaWYgKCFvdGhlci5nZXQocG9zKS5kYXRhLmRlbGV0ZSkge1xuICAgICAgICBtb3ZlZC5hZGQocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGlmICghbW92ZWQuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF0ubWV0YTtcbiAgICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLCBbb3RoZXIuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICAgICAgb3RoZXIuX2V4aXRzLnNldChwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdKTtcbiAgICAgIHRoaXMuX2V4aXRzLmRlbGV0ZShwb3MsIHR5cGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtmcm9tLCB0b10gb2YgdGhpcy5fcGl0cykge1xuICAgICAgaWYgKCFtb3ZlZC5oYXMoZnJvbSkpIGNvbnRpbnVlO1xuICAgICAgb3RoZXIuX3BpdHMuc2V0KGZyb20sIHRvKTtcbiAgICAgIHRoaXMuX3BpdHMuZGVsZXRlKGZyb20pO1xuICAgIH1cbiAgfVxuXG4gIHBpY2tUeXBlRnJvbVNjcmVlbnMocG9zOiBQb3MpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgY29uc3QgZXhpdHMgPSB0aGlzLl9zY3JlZW5zW3Bvc10uZGF0YS5leGl0cztcbiAgICBjb25zdCB0eXBlcyA9IChleGl0cyA/PyBbXSkubWFwKGUgPT4gZS50eXBlKTtcbiAgICBpZiAodHlwZXMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHNpbmdsZSB0eXBlIGZvciAke2hleChwb3MpfTogWyR7dHlwZXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlc1swXTtcbiAgfVxuXG4gIHRyYW5zZmVyRmxhZ3Mob3JpZzogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIENvcHkgb3ZlciB0aGUgZnJlZSBmbGFnc1xuICAgIHRoaXMuZnJlZUZsYWdzID0gbmV3IFNldChvcmlnLmZyZWVGbGFncyk7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIGN1c3RvbSBmbGFncy5cbiAgICBjb25zdCBjdXN0b21zID0gbmV3IERlZmF1bHRNYXA8TWV0YXNjcmVlbiwgRmxhZ1tdPigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBbcG9zLCBmbGFnXSBvZiBvcmlnLmN1c3RvbUZsYWdzKSB7XG4gICAgICBjdXN0b21zLmdldChvcmlnLl9zY3JlZW5zW3Bvc10pLnB1c2goZmxhZyk7XG4gICAgfVxuICAgIC8vIFNodWZmbGUgdGhlbSBqdXN0IGluIGNhc2UgdGhleSdyZSBub3QgYWxsIHRoZSBzYW1lLi4uXG4gICAgLy8gVE9ETyAtIGZvciBzZWFtbGVzcyBwYWlycywgb25seSBzaHVmZmxlIG9uY2UsIHRoZW4gY29weS5cbiAgICBmb3IgKGNvbnN0IGZsYWdzIG9mIGN1c3RvbXMudmFsdWVzKCkpIHJhbmRvbS5zaHVmZmxlKGZsYWdzKTtcbiAgICAvLyBGaW5kIGFsbCB0aGUgY3VzdG9tLWZsYWcgc2NyZWVucyBpbiB0aGUgbmV3IGxvY2F0aW9uLlxuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGlmIChzY3IuZmxhZz8uc3RhcnRzV2l0aCgnY3VzdG9tJykpIHtcbiAgICAgICAgY29uc3QgZmxhZyA9IGN1c3RvbXMuZ2V0KHNjcikucG9wKCk7XG4gICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZmxhZyBmb3IgJHtzY3IubmFtZX0gYXQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX0gQCR7aGV4KHBvcyl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXN0b21GbGFncy5zZXQocG9zLCBmbGFnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29weSBwaXQgZGVzdGluYXRpb25zIGZyb20gdGhlIG9yaWdpbmFsLiAgTk9URTogdGhlcmUgaXMgTk8gc2FmZXR5XG4gICAqIGNoZWNrIGhlcmUgZm9yIHRoZSBwaXRzIGJlaW5nIHJlYXNvbmFibGUuICBUaGF0IG11c3QgYmUgZG9uZSBlbHNld2hlcmUuXG4gICAqIFdlIGRvbid0IHdhbnQgcGl0IHNhZmV0eSB0byBiZSBjb250aW5nZW50IG9uIHN1Y2Nlc3NmdWwgc2h1ZmZsaW5nIG9mXG4gICAqIHRoZSB1cHN0YWlycyBtYXAuXG4gICAqL1xuICB0cmFuc2ZlclBpdHMob3JpZzogTWV0YWxvY2F0aW9uKSB7XG4gICAgdGhpcy5fcGl0cyA9IG9yaWcuX3BpdHM7XG4gIH1cblxuICAvKiogRW5zdXJlIGFsbCBwaXRzIGdvIHRvIHZhbGlkIGxvY2F0aW9ucy4gKi9cbiAgc2h1ZmZsZVBpdHMocmFuZG9tOiBSYW5kb20pIHtcbiAgICBpZiAoIXRoaXMuX3BpdHMuc2l6ZSkgcmV0dXJuO1xuICAgIC8vIEZpbmQgYWxsIHBpdCBkZXN0aW5hdGlvbnMuXG4gICAgY29uc3QgZGVzdHMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IFssIGRlc3RdIG9mIHRoaXMuX3BpdHMpIHtcbiAgICAgIGRlc3RzLmFkZCh0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdCA+Pj4gOF0uaWQpO1xuICAgIH1cbiAgICB0aGlzLl9waXRzLmNsZWFyKCk7XG5cbiAgICAvLyBMb29rIGZvciBleGlzdGluZyBwaXRzLiAgU29ydCBieSBsb2NhdGlvbiwgW3BpdCBwb3MsIGRlc3QgcG9zXVxuICAgIGNvbnN0IHBpdHMgPSBuZXcgRGVmYXVsdE1hcDxNZXRhbG9jYXRpb24sIEFycmF5PFtQb3MsIFBvc10+PigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5nZXQocG9zKTtcbiAgICAgIGlmICghc2NyLmhhc0ZlYXR1cmUoJ3BpdCcpKSBjb250aW51ZTtcbiAgICAgIC8vIEZpbmQgdGhlIG5lYXJlc3QgZXhpdCB0byBvbmUgb2YgdGhvc2UgZGVzdGluYXRpb25zOiBbZGVsdGEsIGxvYywgZGlzdF1cbiAgICAgIGxldCBjbG9zZXN0OiBbUG9zLCBNZXRhbG9jYXRpb24sIG51bWJlcl0gPSBbLTEsIHRoaXMsIEluZmluaXR5XTtcbiAgICAgIGZvciAoY29uc3QgW2V4aXRQb3MsLCBbZGVzdF1dIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICAgIGNvbnN0IGRpc3QgPSBkaXN0YW5jZShwb3MsIGV4aXRQb3MpO1xuICAgICAgICBpZiAoZGVzdHMuaGFzKGRlc3QgPj4+IDgpICYmIGRpc3QgPCBjbG9zZXN0WzJdKSB7XG4gICAgICAgICAgY29uc3QgZGxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0ID4+PiA4XS5tZXRhO1xuICAgICAgICAgIGNvbnN0IGRwb3MgPSBkZXN0ICYgMHhmZjtcbiAgICAgICAgICBjbG9zZXN0ID0gW2FkZERlbHRhKHBvcywgZHBvcywgZXhpdFBvcywgZGxvYyksIGRsb2MsIGRpc3RdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2xvc2VzdFswXSA+PSAwKSBwaXRzLmdldChjbG9zZXN0WzFdKS5wdXNoKFtwb3MsIGNsb3Nlc3RbMF1dKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBkZXN0IG9mIGRlc3RzKSB7XG4gICAgICBjb25zdCBsaXN0ID0gcGl0cy5nZXQodGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdLm1ldGEpO1xuICAgICAgLy8gSWYgdGhlcmUncyBldmVyIG5vdCBhIGRpcmVjdCBleGl0IHRvIGFueSBkZXN0aW5hdGlvbiwganVzdCBwdXNoXG4gICAgICAvLyBhIGxhcmdlIGRlbHRhIHRvd2FyZCB0aGUgYm90dG9tIG9mIHRoZSBtYXAuXG4gICAgICBpZiAoIWxpc3QubGVuZ3RoKSBsaXN0LnB1c2goWzAsIDB4ZjBdKTtcbiAgICB9XG5cbiAgICAvLyBGb3IgZWFjaCBkZXN0aW5hdGlvbiBsb2NhdGlvbiwgbG9vayBmb3Igc3Bpa2VzLCB0aGVzZSB3aWxsIG92ZXJyaWRlXG4gICAgLy8gYW55IHBvc2l0aW9uLWJhc2VkIGRlc3RpbmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IFtkZXN0LCBsaXN0XSBvZiBwaXRzKSB7XG4gICAgICAvLyB2ZXJ0aWNhbCwgaG9yaXpvbnRhbFxuICAgICAgY29uc3QgZWxpZ2libGU6IFBvc1tdW10gPSBbW10sIFtdXTtcbiAgICAgIGNvbnN0IHNwaWtlcyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiBkZXN0LmFsbFBvcygpKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGRlc3QuZ2V0KHBvcyk7XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncml2ZXInKSB8fCBzY3IuaGFzRmVhdHVyZSgnZW1wdHknKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGVkZ2VzID1cbiAgICAgICAgICAgIChzY3IuZGF0YS5lZGdlcyB8fCAnJykuc3BsaXQoJycpLm1hcCh4ID0+IHggPT09ICcgJyA/ICcnIDogeCk7XG4gICAgICAgIGlmIChlZGdlc1swXSAmJiBlZGdlc1syXSkgZWxpZ2libGVbMF0ucHVzaChwb3MpO1xuICAgICAgICAvLyBOT1RFOiB3ZSBjbGFtcCB0aGUgdGFyZ2V0IFggY29vcmRzIHNvIHRoYXQgc3Bpa2Ugc2NyZWVucyBhcmUgYWxsIGdvb2RcbiAgICAgICAgLy8gdGhpcyBwcmV2ZW50cyBlcnJvcnMgZnJvbSBub3QgaGF2aW5nIGEgdmlhYmxlIGRlc3RpbmF0aW9uIHNjcmVlbi5cbiAgICAgICAgaWYgKChlZGdlc1sxXSAmJiBlZGdlc1szXSkgfHwgc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSB7XG4gICAgICAgICAgZWxpZ2libGVbMV0ucHVzaChwb3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgICBzcGlrZXMuc2V0KHBvcywgWy4uLmVkZ2VzXS5maWx0ZXIoYyA9PiBjID09PSAncycpLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbi8vY29uc29sZS5sb2coYGRlc3Q6XFxuJHtkZXN0LnNob3coKX1cXG5lbGlnaWJsZTogJHtlbGlnaWJsZS5tYXAoZSA9PiBlLm1hcChoID0+IGgudG9TdHJpbmcoMTYpKS5qb2luKCcsJykpLmpvaW4oJyAgJyl9YCk7XG4gICAgICAvLyBmaW5kIHRoZSBjbG9zZXN0IGRlc3RpbmF0aW9uIGZvciB0aGUgZmlyc3QgcGl0LCBrZWVwIGEgcnVubmluZyBkZWx0YS5cbiAgICAgIGxldCBkZWx0YTogW1BvcywgUG9zXSA9IFswLCAwXTtcbiAgICAgIGZvciAoY29uc3QgW3Vwc3RhaXJzLCBkb3duc3RhaXJzXSBvZiBsaXN0KSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuZ2V0KHVwc3RhaXJzKTtcbiAgICAgICAgY29uc3QgZWRnZXMgPSBzY3IuZGF0YS5lZGdlcyB8fCAnJztcbiAgICAgICAgY29uc3QgZGlyID0gZWRnZXNbMV0gPT09ICdjJyAmJiBlZGdlc1szXSA9PT0gJ2MnID8gMSA6IDA7XG4gICAgICAgIC8vIGVsaWdpYmxlIGRlc3QgdGlsZSwgZGlzdGFuY2VcbiAgICAgICAgbGV0IGNsb3Nlc3Q6IFtQb3MsIG51bWJlciwgbnVtYmVyXSA9IFstMSwgSW5maW5pdHksIDBdO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhZGREZWx0YShkb3duc3RhaXJzLCBkZWx0YVswXSwgZGVsdGFbMV0sIGRlc3QpO1xuICAgICAgICBmb3IgKGNvbnN0IHBvcyBvZiBlbGlnaWJsZVtkaXJdKSB7IC8vZm9yIChsZXQgaSA9IDA7IGkgPCBlbGlnaWJsZVtkaXJdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgLy8gICAgICAgICAgY29uc3QgcG9zID0gZWxpZ2libGVbZGlyXVtpXTtcbiAgICAgICAgICBjb25zdCBzcGlrZUNvdW50ID0gc3Bpa2VzLmdldChwb3MpID8/IDA7XG4gICAgICAgICAgaWYgKHNwaWtlQ291bnQgPCBjbG9zZXN0WzJdKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBkaXN0ID0gZGlzdGFuY2UodGFyZ2V0LCBwb3MpO1xuICAgICAgICAgIGlmIChkaXN0IDwgY2xvc2VzdFsxXSkge1xuICAgICAgICAgICAgY2xvc2VzdCA9IFtwb3MsIGRpc3QsIHNwaWtlQ291bnRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbmRQb3MgPSBjbG9zZXN0WzBdO1xuICAgICAgICBpZiAoZW5kUG9zIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyBlbGlnaWJsZSBkZXN0YCk7XG4gICAgICAgIGRlbHRhID0gW2VuZFBvcywgdGFyZ2V0XTtcbiAgICAgICAgdGhpcy5fcGl0cy5zZXQodXBzdGFpcnMsIGRlc3QuaWQgPDwgOCB8IGVuZFBvcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRha2VzIG93bmVyc2hpcCBvZiBleGl0cyBmcm9tIGFub3RoZXIgbWV0YWxvY2F0aW9uIHdpdGggdGhlIHNhbWUgSUQuXG4gICAqIEBwYXJhbSB7Zml4ZWR9IG1hcHMgZGVzdGluYXRpb24gbG9jYXRpb24gSUQgdG8gcG9zIHdoZXJlIHRoZSBleGl0IGlzLlxuICAgKi9cbiAgdHJhbnNmZXJFeGl0cyhvcmlnOiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gRGV0ZXJtaW5lIGFsbCB0aGUgZWxpZ2libGUgZXhpdCBzY3JlZW5zLlxuICAgIGNvbnN0IGV4aXRzID0gbmV3IERlZmF1bHRNYXA8Q29ubmVjdGlvblR5cGUsIFBvc1tdPigoKSA9PiBbXSk7XG4gICAgY29uc3Qgc2VsZkV4aXRzID0gbmV3IERlZmF1bHRNYXA8Q29ubmVjdGlvblR5cGUsIFNldDxQb3M+PigoKSA9PiBuZXcgU2V0KCkpO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3Qge3R5cGV9IG9mIHNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTp0b3AnICYmIChwb3MgPj4+IDQpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOmxlZnQnICYmIChwb3MgJiAweGYpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgKHBvcyA+Pj4gNCkgPCB0aGlzLmhlaWdodCAtIDEpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6cmlnaHQnICYmIChwb3MgJiAweGYpIDwgdGhpcy53aWR0aCAtIDEpIGNvbnRpbnVlO1xuICAgICAgICBleGl0cy5nZXQodHlwZSkucHVzaChwb3MpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGFyciBvZiBleGl0cy52YWx1ZXMoKSkge1xuICAgICAgcmFuZG9tLnNodWZmbGUoYXJyKTtcbiAgICB9XG4gICAgLy8gRmluZCBhIG1hdGNoIGZvciBlYWNoIG9yaWdpbmFsIGV4aXQuXG4gICAgZm9yIChjb25zdCBbb3BvcywgdHlwZSwgZXhpdF0gb2Ygb3JpZy5fZXhpdHMpIHtcbiAgICAgIGlmIChzZWxmRXhpdHMuZ2V0KHR5cGUpLmhhcyhvcG9zKSkgY29udGludWU7XG4gICAgICAvLyBvcG9zLGV4aXQgZnJvbSBvcmlnaW5hbCB2ZXJzaW9uIG9mIHRoaXMgbWV0YWxvY2F0aW9uXG4gICAgICBjb25zdCBwb3MgPSBleGl0cy5nZXQodHlwZSkucG9wKCk7IC8vIGEgUG9zIGluIHRoaXMgbWV0YWxvY2F0aW9uXG4gICAgICBpZiAocG9zID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgdHJhbnNmZXIgZXhpdCAke3R5cGV9IGluICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfTogbm8gZWxpZ2libGUgc2NyZWVuXFxuJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3coKX1gKTtcbiAgICAgIH1cbiAgICAgIC8vIExvb2sgZm9yIGEgcmV2ZXJzZSBleGl0OiBleGl0IGlzIHRoZSBzcGVjIGZyb20gb2xkIG1ldGEuXG4gICAgICAvLyBGaW5kIHRoZSBtZXRhbG9jYXRpb24gaXQgcmVmZXJzIHRvIGFuZCBzZWUgaWYgdGhlIGV4aXRcbiAgICAgIC8vIGdvZXMgYmFjayB0byB0aGUgb3JpZ2luYWwgcG9zaXRpb24uXG4gICAgICBjb25zdCBlbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2V4aXRbMF0gPj4+IDhdLm1ldGE7XG4gICAgICBjb25zdCBlcG9zID0gZXhpdFswXSAmIDB4ZmY7XG4gICAgICBjb25zdCBldHlwZSA9IGV4aXRbMV07XG4gICAgICBpZiAoZWxvYyA9PT0gb3JpZykge1xuICAgICAgICAvLyBTcGVjaWFsIGNhc2Ugb2YgYSBzZWxmLWV4aXQgKGhhcHBlbnMgaW4gaHlkcmEgYW5kIHB5cmFtaWQpLlxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIGp1c3QgcGljayBhbiBleGl0IG9mIHRoZSBjb3JyZWN0IHR5cGUuXG4gICAgICAgIGNvbnN0IG5wb3MgPSBleGl0cy5nZXQoZXR5cGUpLnBvcCgpO1xuICAgICAgICBpZiAobnBvcyA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGVgKTtcbiAgICAgICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgW3RoaXMuaWQgPDwgOCB8IG5wb3MsIGV0eXBlXSk7XG4gICAgICAgIHRoaXMuX2V4aXRzLnNldChucG9zLCBldHlwZSwgW3RoaXMuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICAgICAgICAvLyBBbHNvIGRvbid0IHZpc2l0IHRoZSBvdGhlciBleGl0IGxhdGVyLlxuICAgICAgICBzZWxmRXhpdHMuZ2V0KGV0eXBlKS5hZGQoZXBvcyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgcmV0ID0gZWxvYy5fZXhpdHMuZ2V0KGVwb3MsIGV0eXBlKSE7XG4gICAgICBpZiAoIXJldCkge1xuICAgICAgICBjb25zdCBlZWxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tleGl0WzBdID4+PiA4XTtcbiAgICAgICAgY29uc29sZS5sb2coZWxvYyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZXhpdCBmb3IgJHtlZWxvY30gYXQgJHtoZXgoZXBvcyl9ICR7ZXR5cGV9XFxuJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBlbG9jLnNob3coKX1cXG4ke3RoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXX0gYXQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBoZXgob3Bvcyl9ICR7dHlwZX1cXG4ke3RoaXMuc2hvdygpfWApO1xuICAgICAgfVxuICAgICAgaWYgKChyZXRbMF0gPj4+IDgpID09PSB0aGlzLmlkICYmICgocmV0WzBdICYgMHhmZikgPT09IG9wb3MpICYmXG4gICAgICAgICAgcmV0WzFdID09PSB0eXBlKSB7XG4gICAgICAgIGVsb2MuX2V4aXRzLnNldChlcG9zLCBldHlwZSwgW3RoaXMuaWQgPDwgOCB8IHBvcywgdHlwZV0pO1xuICAgICAgfVxuICAgICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgZXhpdCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIE5QQ3MsIHRyaWdnZXJzLCBhbmQgY2hlc3RzIGJhc2VkIG9uIHByb3hpbWl0eSB0byBzY3JlZW5zLFxuICAgKiBleGl0cywgYW5kIFBPSS5cbiAgICovXG4gIHRyYW5zZmVyU3Bhd25zKHRoYXQ6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBTdGFydCBieSBidWlsZGluZyBhIG1hcCBiZXR3ZWVuIGV4aXRzIGFuZCBzcGVjaWZpYyBzY3JlZW4gdHlwZXMuXG4gICAgY29uc3QgcmV2ZXJzZUV4aXRzID0gbmV3IE1hcDxFeGl0U3BlYywgW251bWJlciwgbnVtYmVyXT4oKTsgLy8gbWFwIHRvIHkseFxuICAgIGNvbnN0IHBpdHMgPSBuZXcgTWFwPFBvcywgbnVtYmVyPigpOyAvLyBtYXBzIHRvIGRpciAoMCA9IHZlcnQsIDEgPSBob3JpeilcbiAgICBjb25zdCBzdGF0dWVzOiBBcnJheTxbUG9zLCBudW1iZXJdPiA9IFtdOyAvLyBhcnJheSBvZiBzcGF3biBbc2NyZWVuLCBjb29yZF1cbiAgICAvLyBBcnJheSBvZiBbb2xkIHksIG9sZCB4LCBuZXcgeSwgbmV3IHgsIG1heCBkaXN0YW5jZSAoc3F1YXJlZCldXG4gICAgY29uc3QgbWFwOiBBcnJheTxbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IHdhbGxzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IGJyaWRnZXM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgLy8gUGFpciB1cCBhcmVuYXMuXG4gICAgY29uc3QgYXJlbmFzOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgbG9jLmFsbFBvcygpKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IGxvYy5fc2NyZWVuc1twb3NdO1xuICAgICAgICBjb25zdCB5ID0gcG9zICYgMHhmMDtcbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYpIDw8IDQ7XG4gICAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncGl0JykgJiYgbG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgcGl0cy5zZXQocG9zLCBzY3IuZWRnZUluZGV4KCdjJykgPT09IDUgPyAwIDogMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2NyLmRhdGEuc3RhdHVlcz8ubGVuZ3RoICYmIGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2NyLmRhdGEuc3RhdHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gc2NyLmRhdGEuc3RhdHVlc1tpXSA8PCAxMjtcbiAgICAgICAgICAgIGNvbnN0IHBhcml0eSA9ICgocG9zICYgMHhmKSBeIChwb3MgPj4+IDQpIF4gaSkgJiAxO1xuICAgICAgICAgICAgY29uc3QgY29sID0gcGFyaXR5ID8gMHg1MCA6IDB4YTA7XG4gICAgICAgICAgICBzdGF0dWVzLnB1c2goW3Bvcywgcm93IHwgY29sXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkge1xuICAgICAgICAgIGlmIChzY3IuZGF0YS53YWxsID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB3YWxsIHByb3BgKTtcbiAgICAgICAgICBjb25zdCB3YWxsID0gW3kgfCAoc2NyLmRhdGEud2FsbCA+PiA0KSwgeCB8IChzY3IuZGF0YS53YWxsICYgMHhmKV07XG4gICAgICAgICAgd2FsbHMucHVzaCh3YWxsIGFzIFtudW1iZXIsIG51bWJlcl0pO1xuICAgICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgXCJkb3VibGUgYnJpZGdlXCIgaW4gbGltZSB0cmVlIGxha2VcbiAgICAgICAgICBpZiAoc2NyLmRhdGEudGlsZXNldHMubGltZSkgd2FsbHMucHVzaChbd2FsbFswXSAtIDEsIHdhbGxbMV1dKTtcbiAgICAgICAgfSBlbHNlIGlmIChsb2MgPT09IHRoaXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAgICAgaWYgKHNjci5kYXRhLndhbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHdhbGwgcHJvcGApO1xuICAgICAgICAgIGJyaWRnZXMucHVzaChbeSB8IChzY3IuZGF0YS53YWxsID4+IDQpLCB4IHwgKHNjci5kYXRhLndhbGwgJiAweGYpXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzY3IuaGFzRmVhdHVyZSgnYXJlbmEnKSkgY29udGludWU7XG4gICAgICAgIGlmIChsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBhcmVuYXMucHVzaChbeSB8IDgsIHggfCA4XSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgW255LCBueF0gPSBhcmVuYXMucG9wKCkhO1xuICAgICAgICAgIG1hcC5wdXNoKFt5IHwgOCwgeCB8IDgsIG55LCBueCwgMTQ0XSk7IC8vIDEyIHRpbGVzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChsb2MgPT09IHRoaXMpIHsgLy8gVE9ETyAtIHRoaXMgaXMgYSBtZXNzLCBmYWN0b3Igb3V0IHRoZSBjb21tb25hbGl0eVxuICAgICAgICByYW5kb20uc2h1ZmZsZShhcmVuYXMpO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShzdGF0dWVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gTm93IHBhaXIgdXAgZXhpdHMuXG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIGV4aXRdIG9mIGxvYy5fZXhpdHMpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gbG9jLl9zY3JlZW5zW3Bvc107XG4gICAgICAgIGNvbnN0IHNwZWMgPSBzY3IuZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gdHlwZSk7XG4gICAgICAgIGlmICghc3BlYykgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGV4aXQ6ICR7c2NyLm5hbWV9ICR7dHlwZX1gKTtcbiAgICAgICAgY29uc3QgeDAgPSBwb3MgJiAweGY7XG4gICAgICAgIGNvbnN0IHkwID0gcG9zID4+PiA0O1xuICAgICAgICBjb25zdCB4MSA9IHNwZWMuZXhpdHNbMF0gJiAweGY7XG4gICAgICAgIGNvbnN0IHkxID0gc3BlYy5leGl0c1swXSA+Pj4gNDtcbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIHJldmVyc2VFeGl0cy5zZXQoZXhpdCwgW3kwIDw8IDQgfCB5MSwgeDAgPDwgNCB8IHgxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKGV4aXRbMF0gPj4+IDgpICE9PSB0aGlzLmlkKSB7IC8vIHNraXAgc2VsZi1leGl0c1xuICAgICAgICAgIGNvbnN0IFtueSwgbnhdID0gcmV2ZXJzZUV4aXRzLmdldChleGl0KSE7XG4gICAgICAgICAgbWFwLnB1c2goW3kwIDw8IDQgfCB5MSwgeDAgPDwgNCB8IHgxLCBueSwgbngsIDI1XSk7IC8vIDUgdGlsZXNcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBNYWtlIGEgbGlzdCBvZiBQT0kgYnkgcHJpb3JpdHkgKDAuLjUpLlxuXG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgZmlyc3QgcGFydGl0aW9uaW5nIHRoZSBzY3JlZW5zIHdpdGggaW1wYXNzaWJsZVxuICAgIC8vIHdhbGxzIGFuZCBwbGFjaW5nIHBvaSBpbnRvIGFzIG1hbnkgc2VwYXJhdGUgcGFydGl0aW9ucyAoZnJvbVxuICAgIC8vIHN0YWlycy9lbnRyYW5jZXMpIGFzIHBvc3NpYmxlID8/PyAgT3IgbWF5YmUganVzdCB3ZWlnaHQgdGhvc2VcbiAgICAvLyBoaWdoZXI/ICBkb24ndCB3YW50IHRvIF9mb3JjZV8gdGhpbmdzIHRvIGJlIGluYWNjZXNzaWJsZS4uLj9cblxuICAgIGNvbnN0IHBwb2k6IEFycmF5PEFycmF5PFtudW1iZXIsIG51bWJlcl0+PiA9IFtbXSwgW10sIFtdLCBbXSwgW10sIFtdXTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLl9zY3JlZW5zW3Bvc107XG4gICAgICBmb3IgKGNvbnN0IFtwLCBkeSA9IDB4NzAsIGR4ID0gMHg3OF0gb2Ygc2NyLmRhdGEucG9pID8/IFtdKSB7XG4gICAgICAgIGNvbnN0IHkgPSAoKHBvcyAmIDB4ZjApIDw8IDQpICsgZHk7XG4gICAgICAgIGNvbnN0IHggPSAoKHBvcyAmIDB4MGYpIDw8IDgpICsgZHg7XG4gICAgICAgIHBwb2lbcF0ucHVzaChbeSwgeF0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBvaSBvZiBwcG9pKSB7XG4gICAgICByYW5kb20uc2h1ZmZsZShwb2kpO1xuICAgIH1cbiAgICBjb25zdCBhbGxQb2kgPSBbLi4uaXRlcnMuY29uY2F0KC4uLnBwb2kpXTtcbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIHNwYXducywgbG9vayBmb3IgTlBDL2NoZXN0L3RyaWdnZXIuXG4gICAgY29uc3QgbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIFxuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgcmFuZG9tLmlzaHVmZmxlKGxvYy5zcGF3bnMpKSB7XG4gICAgICBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgY29uc3QgcGxhdGZvcm0gPSBQTEFURk9STVMuaW5kZXhPZihzcGF3bi5tb25zdGVySWQpO1xuICAgICAgICBpZiAocGxhdGZvcm0gPj0gMCAmJiBwaXRzLnNpemUpIHtcbiAgICAgICAgICBjb25zdCBbW3BvcywgZGlyXV0gPSBwaXRzO1xuICAgICAgICAgIHBpdHMuZGVsZXRlKHBvcyk7XG4gICAgICAgICAgc3Bhd24ubW9uc3RlcklkID0gUExBVEZPUk1TW3BsYXRmb3JtICYgMiB8IGRpcl07XG4gICAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zO1xuICAgICAgICAgIHNwYXduLnRpbGUgPSBkaXIgPyAweDczIDogMHg0NztcbiAgICAgICAgfSBlbHNlIGlmIChzcGF3bi5tb25zdGVySWQgPT09IDB4OGYgJiYgc3RhdHVlcy5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBbc2NyZWVuLCBjb29yZF0gPSBzdGF0dWVzLnBvcCgpITtcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSBzY3JlZW47XG4gICAgICAgICAgc3Bhd24uY29vcmQgPSBjb29yZDtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTsgLy8gdGhlc2UgYXJlIGhhbmRsZWQgZWxzZXdoZXJlLlxuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICBjb25zdCB3YWxsID0gKHNwYXduLndhbGxUeXBlKCkgPT09ICdicmlkZ2UnID8gYnJpZGdlcyA6IHdhbGxzKS5wb3AoKTtcbiAgICAgICAgaWYgKCF3YWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoICR7c3Bhd24ud2FsbFR5cGUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBzY3JlZW5zIGluIG5ldyBtZXRhbG9jYXRpb246ICR7bG9jfVxcbiR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3coKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBbeSwgeF0gPSB3YWxsO1xuICAgICAgICBzcGF3bi55dCA9IHk7XG4gICAgICAgIHNwYXduLnh0ID0geDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkgfHwgc3Bhd24uaXNCb3NzKCkgfHwgc3Bhd24uaXNUcmlnZ2VyKCkgfHxcbiAgICAgICAgICAgICAgICAgc3Bhd24uaXNHZW5lcmljKCkpIHtcbiAgICAgICAgLy9sZXQgaiA9IDA7XG4gICAgICAgIGxldCBiZXN0ID0gWy0xLCAtMSwgSW5maW5pdHldO1xuICAgICAgICBmb3IgKGNvbnN0IFt5MCwgeDAsIHkxLCB4MSwgZG1heF0gb2YgbWFwKSB7XG4gICAgICAgICAgY29uc3QgZCA9ICh5dERpZmYoc3Bhd24ueXQsIHkwKSkgKiogMiArIChzcGF3bi54dCAtIHgwKSAqKiAyO1xuICAgICAgICAgIGlmIChkIDw9IGRtYXggJiYgZCA8IGJlc3RbMl0pIHtcbiAgICAgICAgICAgIGJlc3QgPSBbeXRBZGQoc3Bhd24ueXQsIHl0RGlmZih5MSwgeTApKSwgc3Bhd24ueHQgKyB4MSAtIHgwLCBkXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShiZXN0WzJdKSkge1xuICAgICAgICAgIC8vIEtlZXAgdHJhY2sgb2YgYW55IE5QQ3Mgd2UgYWxyZWFkeSBtb3ZlZCBzbyB0aGF0IGFueXRoaW5nIHRoYXQnc1xuICAgICAgICAgIC8vIG9uIHRvcCBvZiBpdCAoaS5lLiBkdWFsIHNwYXducykgbW92ZSBhbG9uZyB3aXRoLlxuICAgICAgICAgIC8vaWYgKGJlc3RbMl0gPiA0KSBtYXAucHVzaChbc3Bhd24ueHQsIHNwYXduLnl0LCBiZXN0WzBdLCBiZXN0WzFdLCA0XSk7XG4gICAgICAgICAgLy8gLSBUT0RPIC0gSSBkb24ndCB0aGluayB3ZSBuZWVkIHRoaXMsIHNpbmNlIGFueSBmdXR1cmUgc3Bhd24gc2hvdWxkXG4gICAgICAgICAgLy8gICBiZSBwbGFjZWQgYnkgdGhlIHNhbWUgcnVsZXMuXG4gICAgICAgICAgW3NwYXduLnl0LCBzcGF3bi54dF0gPSBiZXN0O1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBXYXNuJ3QgYWJsZSB0byBtYXAgYW4gYXJlbmEgb3IgZXhpdC4gIFBpY2sgYSBuZXcgUE9JLCBidXQgdHJpZ2dlcnMgYW5kXG4gICAgICAvLyBib3NzZXMgYXJlIGluZWxpZ2libGUuXG4gICAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgfHwgc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcGxhY2UgJHtsb2N9ICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgc3Bhd24uaXNCb3NzKCkgPyAnQm9zcycgOiAnVHJpZ2dlcid9ICR7c3Bhd24uaGV4KClcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XFxuJHt0aGlzLnNob3coKX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5leHQgPSBhbGxQb2kuc2hpZnQoKTtcbiAgICAgIGlmICghbmV4dCkgdGhyb3cgbmV3IEVycm9yKGBSYW4gb3V0IG9mIFBPSSBmb3IgJHtsb2N9YCk7XG4gICAgICBjb25zdCBbeSwgeF0gPSBuZXh0O1xuICAgICAgbWFwLnB1c2goW3NwYXduLnkgPj4+IDQsIHNwYXduLnggPj4+IDQsIHkgPj4+IDQsIHggPj4+IDQsIDRdKTtcbiAgICAgIHNwYXduLnkgPSB5O1xuICAgICAgc3Bhd24ueCA9IHg7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgc2VhbWxlc3MgcGFpciBsb2NhdGlvbiwgc3luYyB1cCB0aGUgZXhpdHMuICBGb3IgZWFjaCBleGl0IG9mXG4gICAqIGVpdGhlciwgY2hlY2sgaWYgaXQncyBzeW1tZXRyaWMsIGFuZCBpZiBzbywgY29weSBpdCBvdmVyIHRvIHRoZSBvdGhlciBzaWRlLlxuICAgKi9cbiAgcmVjb25jaWxlRXhpdHModGhhdDogTWV0YWxvY2F0aW9uKSB7XG4gICAgY29uc3QgYWRkOiBbTWV0YWxvY2F0aW9uLCBQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlY11bXSA9IFtdO1xuICAgIGNvbnN0IGRlbDogW01ldGFsb2NhdGlvbiwgUG9zLCBDb25uZWN0aW9uVHlwZV1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFt0aGlzLCB0aGF0XSkge1xuICAgICAgZm9yIChjb25zdCBbcG9zLCB0eXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgbG9jLl9leGl0cykge1xuICAgICAgICBpZiAoZGVzdFR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdFRpbGUgPj4+IDhdO1xuICAgICAgICBjb25zdCByZXZlcnNlID0gZGVzdC5tZXRhLl9leGl0cy5nZXQoZGVzdFRpbGUgJiAweGZmLCBkZXN0VHlwZSk7XG4gICAgICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICAgICAgY29uc3QgW3JldlRpbGUsIHJldlR5cGVdID0gcmV2ZXJzZTtcbiAgICAgICAgICBpZiAoKHJldlRpbGUgPj4+IDgpID09PSBsb2MuaWQgJiYgKHJldlRpbGUgJiAweGZmKSA9PT0gcG9zICYmXG4gICAgICAgICAgICAgIHJldlR5cGUgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIGFkZC5wdXNoKFtsb2MgPT09IHRoaXMgPyB0aGF0IDogdGhpcywgcG9zLCB0eXBlLFxuICAgICAgICAgICAgICAgICAgICAgIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZGVsLnB1c2goW2xvYywgcG9zLCB0eXBlXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2xvYywgcG9zLCB0eXBlXSBvZiBkZWwpIHtcbiAgICAgIGxvYy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2xvYywgcG9zLCB0eXBlLCBleGl0XSBvZiBhZGQpIHtcbiAgICAgIGxvYy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgZXhpdCk7XG4gICAgfVxuICAgIC8vIHRoaXMuX2V4aXRzID0gbmV3IFRhYmxlKGV4aXRzKTtcbiAgICAvLyB0aGF0Ll9leGl0cyA9IG5ldyBUYWJsZShleGl0cyk7XG4gIH1cblxuICAvKipcbiAgICogU2F2ZXMgdGhlIGN1cnJlbnQgc3RhdGUgYmFjayBpbnRvIHRoZSB1bmRlcmx5aW5nIGxvY2F0aW9uLlxuICAgKiBDdXJyZW50bHkgdGhpcyBvbmx5IGRlYWxzIHdpdGggZW50cmFuY2VzL2V4aXRzLlxuICAgKi9cbiAgd3JpdGUoKSB7XG4gICAgY29uc3Qgc3JjTG9jID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIC8vbGV0IHNlYW1sZXNzUGFydG5lcjogTG9jYXRpb258dW5kZWZpbmVkO1xuICAgIGNvbnN0IHNlYW1sZXNzUG9zID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBbc3JjUG9zLCBzcmNUeXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGNvbnN0IHNyY1NjcmVlbiA9IHRoaXMuX3NjcmVlbnNbc3JjUG9zXTtcbiAgICAgIGNvbnN0IGRlc3QgPSBkZXN0VGlsZSA+PiA4O1xuICAgICAgbGV0IGRlc3RQb3MgPSBkZXN0VGlsZSAmIDB4ZmY7XG4gICAgICBjb25zdCBkZXN0TG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdO1xuICAgICAgY29uc3QgZGVzdE1ldGEgPSBkZXN0TG9jLm1ldGEhO1xuICAgICAgY29uc3QgZGVzdFNjcmVlbiA9IGRlc3RNZXRhLl9zY3JlZW5zW2Rlc3RUaWxlICYgMHhmZl07XG4gICAgICBjb25zdCBzcmNFeGl0ID0gc3JjU2NyZWVuLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IHNyY1R5cGUpO1xuICAgICAgY29uc3QgZGVzdEV4aXQgPSBkZXN0U2NyZWVuLmRhdGEuZXhpdHM/LmZpbmQoZSA9PiBlLnR5cGUgPT09IGRlc3RUeXBlKTtcbiAgICAgIGlmICghc3JjRXhpdCB8fCAhZGVzdEV4aXQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nICR7c3JjRXhpdCA/ICdkZXN0JyA6ICdzb3VyY2UnfSBleGl0OlxuICBGcm9tOiAke3NyY0xvY30gQCAke2hleChzcmNQb3MpfToke3NyY1R5cGV9ICR7c3JjU2NyZWVuLm5hbWV9XG4gIFRvOiAgICR7ZGVzdExvY30gQCAke2hleChkZXN0UG9zKX06JHtkZXN0VHlwZX0gJHtkZXN0U2NyZWVuLm5hbWV9YCk7XG4gICAgICB9XG4gICAgICAvLyBTZWUgaWYgdGhlIGRlc3QgZW50cmFuY2UgZXhpc3RzIHlldC4uLlxuICAgICAgbGV0IGVudHJhbmNlID0gMHgyMDtcbiAgICAgIGlmIChkZXN0RXhpdC50eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgc2VhbWxlc3NQb3MuYWRkKHNyY1Bvcyk7XG4gICAgICAgIC8vc2VhbWxlc3NQYXJ0bmVyID0gZGVzdExvYztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBkZXN0Q29vcmQgPSBkZXN0RXhpdC5lbnRyYW5jZTtcbiAgICAgICAgaWYgKGRlc3RDb29yZCA+IDB4ZWZmZikgeyAvLyBoYW5kbGUgc3BlY2lhbCBjYXNlIGluIE9ha1xuICAgICAgICAgIGRlc3RQb3MgKz0gMHgxMDtcbiAgICAgICAgICBkZXN0Q29vcmQgLT0gMHgxMDAwMDtcbiAgICAgICAgfVxuICAgICAgICBlbnRyYW5jZSA9IGRlc3RMb2MuZmluZE9yQWRkRW50cmFuY2UoZGVzdFBvcywgZGVzdENvb3JkKTtcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IHRpbGUgb2Ygc3JjRXhpdC5leGl0cykge1xuICAgICAgICBsZXQgc2NyZWVuID0gc3JjUG9zO1xuICAgICAgICBpZiAoKHRpbGUgJiAweGYwKSA9PT0gMHhmMCkge1xuICAgICAgICAgIHNjcmVlbiArPSAweDEwO1xuICAgICAgICAgIHRpbGUgJj0gMHhmO1xuICAgICAgICB9XG4gICAgICAgIC8vaWYgKHNyY0V4aXQudHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiB0aGlzLmhlaWdodCA9PT0gMSkgdGlsZSAtPSAweDIwO1xuICAgICAgICBzcmNMb2MuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW4sIHRpbGUsIGRlc3QsIGVudHJhbmNlfSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBzcmNMb2Mud2lkdGggPSB0aGlzLl93aWR0aDtcbiAgICBzcmNMb2MuaGVpZ2h0ID0gdGhpcy5faGVpZ2h0O1xuICAgIHNyY0xvYy5zY3JlZW5zID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93OiBudW1iZXJbXSA9IFtdO1xuICAgICAgc3JjTG9jLnNjcmVlbnMucHVzaChyb3cpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl93aWR0aDsgeCsrKSB7XG4gICAgICAgIHJvdy5wdXNoKHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF0uc2lkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3JjTG9jLnRpbGVzZXQgPSB0aGlzLnRpbGVzZXQudGlsZXNldElkO1xuICAgIHNyY0xvYy50aWxlRWZmZWN0cyA9IHRoaXMudGlsZXNldC5lZmZlY3RzKCkuaWQ7XG5cbiAgICAvLyBmaW5kIHJlYWNoYWJsZSBwb3MgZnJvbSBhbnkgZXhpdFxuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgaWYgKHNlYW1sZXNzUG9zLmhhcyhwb3MpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGNvbnN0IGJlbG93ID0gcG9zICsgMTY7XG4gICAgICBjb25zdCByaWdodCA9IHBvcyArIDE7XG4gICAgICBpZiAoIXNlYW1sZXNzUG9zLmhhcyhiZWxvdykgJiYgKHNjci5kYXRhLmVkZ2VzPy5bMl0gPz8gJyAnKSAhPT0gJyAnKSB7XG4gICAgICAgIHVmLnVuaW9uKFtwb3MsIGJlbG93XSk7XG4gICAgICB9XG4gICAgICBpZiAoIXNlYW1sZXNzUG9zLmhhcyhyaWdodCkgJiYgKHNjci5kYXRhLmVkZ2VzPy5bM10gPz8gJyAnKSAhPT0gJyAnKSB7XG4gICAgICAgIHVmLnVuaW9uKFtwb3MsIHJpZ2h0XSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlYWNoYWJsZU1hcCA9IHVmLm1hcCgpO1xuICAgIGNvbnN0IHJlYWNoYWJsZSA9IG5ldyBTZXQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgW3NyY1Bvc10gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIHJlYWNoYWJsZU1hcC5nZXQoc3JjUG9zKSA/PyBbXSkge1xuICAgICAgICByZWFjaGFibGUuYWRkKHBvcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgZmxhZ3NcbiAgICBzcmNMb2MuZmxhZ3MgPSBbXTtcbiAgICBjb25zdCBmcmVlRmxhZ3MgPSBbLi4udGhpcy5mcmVlRmxhZ3NdO1xuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbc2NyZWVuXTtcbiAgICAgIGxldCBmbGFnOiBudW1iZXJ8dW5kZWZpbmVkO1xuICAgICAgaWYgKHNjci5kYXRhLndhbGwgIT0gbnVsbCAmJiByZWFjaGFibGUuaGFzKHNjcmVlbikpIHtcbiAgICAgICAgLy8gIXNlYW1sZXNzUGFydG5lcikge1xuICAgICAgICBmbGFnID0gZnJlZUZsYWdzLnBvcCgpPy5pZCA/PyB0aGlzLnJvbS5mbGFncy5hbGxvYygweDIwMCk7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnYWx3YXlzJykge1xuICAgICAgICBmbGFnID0gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjYWxtJykge1xuICAgICAgICBmbGFnID0gdGhpcy5yb20uZmxhZ3MuQ2FsbWVkQW5ncnlTZWEuaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tOmZhbHNlJykge1xuICAgICAgICBmbGFnID0gdGhpcy5jdXN0b21GbGFncy5nZXQoc2NyZWVuKT8uaWQ7XG4gICAgICB9IGVsc2UgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tOnRydWUnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZCA/PyB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfVxuICAgICAgaWYgKGZsYWcgIT0gbnVsbCkge1xuICAgICAgICBzcmNMb2MuZmxhZ3MucHVzaChMb2NhdGlvbkZsYWcub2Yoe3NjcmVlbiwgZmxhZ30pKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSBwaXRzXG4gICAgc3JjTG9jLnBpdHMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtmcm9tU2NyZWVuLCB0b10gb2YgdGhpcy5fcGl0cykge1xuICAgICAgY29uc3QgdG9TY3JlZW4gPSB0byAmIDB4ZmY7XG4gICAgICBjb25zdCBkZXN0ID0gdG8gPj4+IDg7XG4gICAgICBzcmNMb2MucGl0cy5wdXNoKFBpdC5vZih7ZnJvbVNjcmVlbiwgdG9TY3JlZW4sIGRlc3R9KSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTk9URTogdGhpcyBjYW4gb25seSBiZSBkb25lIEFGVEVSIGNvcHlpbmcgdG8gdGhlIGxvY2F0aW9uIVxuICByZXBsYWNlTW9uc3RlcnMocmFuZG9tOiBSYW5kb20pIHtcbiAgICBpZiAodGhpcy5pZCA9PT0gMHg2OCkgcmV0dXJuOyAvLyB3YXRlciBsZXZlbHMsIGRvbid0IHBsYWNlIG9uIGxhbmQ/Pz9cbiAgICAvLyBNb3ZlIGFsbCB0aGUgbW9uc3RlcnMgdG8gcmVhc29uYWJsZSBsb2NhdGlvbnMuXG4gICAgY29uc3QgbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdO1xuICAgIGNvbnN0IHBsYWNlciA9IGxvYy5tb25zdGVyUGxhY2VyKHJhbmRvbSk7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICBpZiAoIXNwYXduLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzcGF3bi5pc01vbnN0ZXIoKSkgY29udGludWU7XG4gICAgICBjb25zdCBtb25zdGVyID0gbG9jLnJvbS5vYmplY3RzW3NwYXduLm1vbnN0ZXJJZF07XG4gICAgICBpZiAoIShtb25zdGVyIGluc3RhbmNlb2YgTW9uc3RlcikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcG9zID0gcGxhY2VyKG1vbnN0ZXIpO1xuICAgICAgaWYgKHBvcyA9PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYG5vIHZhbGlkIGxvY2F0aW9uIGZvciAke2hleChtb25zdGVyLmlkKX0gaW4gJHtsb2N9YCk7XG4gICAgICAgIHNwYXduLnVzZWQgPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNwYXduLnNjcmVlbiA9IHBvcyA+Pj4gODtcbiAgICAgICAgc3Bhd24udGlsZSA9IHBvcyAmIDB4ZmY7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBUcmF2ZXJzZU9wdHMge1xuICAvLyBEbyBub3QgcGFzcyBjZXJ0YWluIHRpbGVzIGluIHRyYXZlcnNlXG4gIHJlYWRvbmx5IHdpdGg/OiBSZWFkb25seU1hcDxQb3MsIE1ldGFzY3JlZW4+O1xuICAvLyBXaGV0aGVyIHRvIGJyZWFrIHdhbGxzL2Zvcm0gYnJpZGdlc1xuICByZWFkb25seSBub0ZsYWdnZWQ/OiBib29sZWFuO1xuICAvLyBXaGV0aGVyIHRvIGFzc3VtZSBmbGlnaHRcbiAgcmVhZG9ubHkgZmxpZ2h0PzogYm9vbGVhbjtcbn1cblxuXG5jb25zdCB1bmtub3duRXhpdFdoaXRlbGlzdCA9IG5ldyBTZXQoW1xuICAweDAxMDAzYSwgLy8gdG9wIHBhcnQgb2YgY2F2ZSBvdXRzaWRlIHN0YXJ0XG4gIDB4MDEwMDNiLFxuICAweDE1NDBhMCwgLy8gXCIgXCIgc2VhbWxlc3MgZXF1aXZhbGVudCBcIiBcIlxuICAweDFhMzA2MCwgLy8gc3dhbXAgZXhpdFxuICAweDQwMjAwMCwgLy8gYnJpZGdlIHRvIGZpc2hlcm1hbiBpc2xhbmRcbiAgMHg0MDIwMzAsXG4gIDB4NDE4MGQwLCAvLyBiZWxvdyBleGl0IHRvIGxpbWUgdHJlZSB2YWxsZXlcbiAgMHg2MDg3YmYsIC8vIGJlbG93IGJvYXQgY2hhbm5lbFxuICAweGExMDMyNiwgLy8gY3J5cHQgMiBhcmVuYSBub3J0aCBlZGdlXG4gIDB4YTEwMzI5LFxuICAweGE5MDYyNiwgLy8gc3RhaXJzIGFib3ZlIGtlbGJ5IDJcbiAgMHhhOTA2MjksXG5dKTtcblxuLy9jb25zdCBEUE9TID0gWy0xNiwgLTEsIDE2LCAxXTtcbmNvbnN0IERJUl9OQU1FID0gWydhYm92ZScsICdsZWZ0IG9mJywgJ2JlbG93JywgJ3JpZ2h0IG9mJ107XG5cbnR5cGUgT3B0aW9uYWw8VD4gPSBUfG51bGx8dW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBkaXN0YW5jZShhOiBQb3MsIGI6IFBvcyk6IG51bWJlciB7XG4gIHJldHVybiAoKGEgPj4+IDQpIC0gKGIgPj4+IDQpKSAqKiAyICsgKChhICYgMHhmKSAtIChiICYgMHhmKSkgKiogMjtcbn1cblxuZnVuY3Rpb24gYWRkRGVsdGEoc3RhcnQ6IFBvcywgcGx1czogUG9zLCBtaW51czogUG9zLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBQb3Mge1xuICBjb25zdCBweCA9IHBsdXMgJiAweGY7XG4gIGNvbnN0IHB5ID0gcGx1cyA+Pj4gNDtcbiAgY29uc3QgbXggPSBtaW51cyAmIDB4ZjtcbiAgY29uc3QgbXkgPSBtaW51cyA+Pj4gNDtcbiAgY29uc3Qgc3ggPSBzdGFydCAmIDB4ZjtcbiAgY29uc3Qgc3kgPSBzdGFydCA+Pj4gNDtcbiAgY29uc3Qgb3ggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtZXRhLndpZHRoIC0gMSwgc3ggKyBweCAtIG14KSk7XG4gIGNvbnN0IG95ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obWV0YS5oZWlnaHQgLSAxLCBzeSArIHB5IC0gbXkpKTtcbiAgcmV0dXJuIG95IDw8IDQgfCBveDtcbn1cblxuLy8gYml0IDEgPSBjcnVtYmxpbmcsIGJpdCAwID0gaG9yaXpvbnRhbDogW3YsIGgsIGN2LCBjaF1cbmNvbnN0IFBMQVRGT1JNUzogcmVhZG9ubHkgbnVtYmVyW10gPSBbMHg3ZSwgMHg3ZiwgMHg5ZiwgMHg4ZF07XG4iXX0=