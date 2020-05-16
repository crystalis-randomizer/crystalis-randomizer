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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWxvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9tZXRhbG9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFJckYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVoQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUc1QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRXZDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFzQ2pCLE1BQU0sT0FBTyxZQUFZO0lBaUN2QixZQUFxQixFQUFVLEVBQVcsT0FBb0IsRUFDbEQsTUFBYyxFQUFFLEtBQWE7UUFEcEIsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUFXLFlBQU8sR0FBUCxPQUFPLENBQWE7UUEzQjlELGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUNuQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVEsQ0FBQztRQU9wQixTQUFJLEdBQW9CLFNBQVMsQ0FBQztRQUVsQyxXQUFNLEdBQUcsSUFBSSxLQUFLLEVBQWlDLENBQUM7UUFDcEQsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFrQnJDLElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLElB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biB9IGZyb20gJy4vbG9jYXRpb24uanMnOyAvLyBpbXBvcnQgdHlwZVxuaW1wb3J0IHsgRXhpdCwgRmxhZyBhcyBMb2NhdGlvbkZsYWcsIFBpdCwgeXREaWZmLCB5dEFkZCB9IGZyb20gJy4vbG9jYXRpb250YWJsZXMuanMnO1xuaW1wb3J0IHsgRmxhZyB9IGZyb20gJy4vZmxhZ3MuanMnO1xuaW1wb3J0IHsgTWV0YXNjcmVlbiwgVWlkIH0gZnJvbSAnLi9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7IE1ldGF0aWxlc2V0IH0gZnJvbSAnLi9tZXRhdGlsZXNldC5qcyc7XG5pbXBvcnQgeyBoZXggfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHsgUm9tIH0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7IERlZmF1bHRNYXAsIFRhYmxlLCBpdGVycywgZm9ybWF0IH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgQ29ubmVjdGlvblR5cGUgfSBmcm9tICcuL21ldGFzY3JlZW5kYXRhLmpzJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQgeyBNb25zdGVyIH0gZnJvbSAnLi9tb25zdGVyLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxuLy8gTW9kZWwgb2YgYSBsb2NhdGlvbiB3aXRoIG1ldGFzY3JlZW5zLCBldGMuXG5cbi8vIFRyaWNrOiB3ZSBuZWVkIHNvbWV0aGluZyB0byBvd24gdGhlIG5laWdoYm9yIGNhY2hlLlxuLy8gIC0gcHJvYmFibHkgdGhpcyBiZWxvbmdzIGluIHRoZSBNZXRhdGlsZXNldC5cbi8vICAtIG1ldGhvZCB0byByZWdlbmVyYXRlLCBkbyBpdCBhZnRlciB0aGUgc2NyZWVuIG1vZHM/XG4vLyBEYXRhIHdlIHdhbnQgdG8ga2VlcCB0cmFjayBvZjpcbi8vICAtIGdpdmVuIHR3byBzY3JlZW5zIGFuZCBhIGRpcmVjdGlvbiwgY2FuIHRoZXkgYWJ1dD9cbi8vICAtIGdpdmVuIGEgc2NyZWVuIGFuZCBhIGRpcmVjdGlvbiwgd2hhdCBzY3JlZW5zIG9wZW4vY2xvc2UgdGhhdCBlZGdlP1xuLy8gICAgLSB3aGljaCBvbmUgaXMgdGhlIFwiZGVmYXVsdFwiP1xuXG4vLyBUT0RPIC0gY29uc2lkZXIgYWJzdHJhY3RpbmcgZXhpdHMgaGVyZT9cbi8vICAtIGV4aXRzOiBBcnJheTxbRXhpdFNwZWMsIG51bWJlciwgRXhpdFNwZWNdPlxuLy8gIC0gRXhpdFNwZWMgPSB7dHlwZT86IENvbm5lY3Rpb25UeXBlLCBzY3I/OiBudW1iZXJ9XG4vLyBIb3cgdG8gaGFuZGxlIGNvbm5lY3RpbmcgdGhlbSBjb3JyZWN0bHk/XG4vLyAgLSBzaW1wbHkgc2F5aW5nIFwiLT4gd2F0ZXJmYWxsIHZhbGxleSBjYXZlXCIgaXMgbm90IGhlbHBmdWwgc2luY2UgdGhlcmUncyAyXG4vLyAgICBvciBcIi0+IHdpbmQgdmFsbGV5IGNhdmVcIiB3aGVuIHRoZXJlJ3MgNS5cbi8vICAtIHVzZSBzY3JJZCBhcyB1bmlxdWUgaWRlbnRpZmllcj8gIG9ubHkgcHJvYmxlbSBpcyBzZWFsZWQgY2F2ZSBoYXMgMy4uLlxuLy8gIC0gbW92ZSB0byBkaWZmZXJlbnQgc2NyZWVuIGFzIG5lY2Vzc2FyeS4uLlxuLy8gICAgKGNvdWxkIGFsc28ganVzdCBkaXRjaCB0aGUgb3RoZXIgdHdvIGFuZCB0cmVhdCB3aW5kbWlsbCBlbnRyYW5jZSBhc1xuLy8gICAgIGEgZG93biBlbnRyYW5jZSAtIHNhbWUgdy8gbGlnaHRob3VzZT8pXG4vLyAgLSBvbmx5IGEgc21hbGwgaGFuZGZ1bGwgb2YgbG9jYXRpb25zIGhhdmUgZGlzY29ubmVjdGVkIGNvbXBvbmVudHM6XG4vLyAgICAgIHdpbmRtaWxsLCBsaWdodGhvdXNlLCBweXJhbWlkLCBnb2EgYmFja2Rvb3IsIHNhYmVyYSwgc2FicmUvaHlkcmEgbGVkZ2VzXG4vLyAgLSB3ZSByZWFsbHkgZG8gY2FyZSB3aGljaCBpcyBpbiB3aGljaCBjb21wb25lbnQuXG4vLyAgICBidXQgbWFwIGVkaXRzIG1heSBjaGFuZ2UgZXZlbiB0aGUgbnVtYmVyIG9mIGNvbXBvbmVudHM/Pz9cbi8vICAtIGRvIHdlIGRvIGVudHJhbmNlIHNodWZmbGUgZmlyc3Qgb3IgbWFwIHNodWZmbGUgZmlyc3Q/XG4vLyAgICBvciBhcmUgdGhleSBpbnRlcmxlYXZlZD8hP1xuLy8gICAgaWYgd2Ugc2h1ZmZsZSBzYWJyZSBvdmVyd29ybGQgdGhlbiB3ZSBuZWVkIHRvIGtub3cgd2hpY2ggY2F2ZXMgY29ubmVjdFxuLy8gICAgdG8gd2hpY2guLi4gYW5kIHBvc3NpYmx5IGNoYW5nZSB0aGUgY29ubmVjdGlvbnM/XG4vLyAgICAtIG1heSBuZWVkIGxlZXdheSB0byBhZGQvc3VidHJhY3QgY2F2ZSBleGl0cz8/XG4vLyBQcm9ibGVtIGlzIHRoYXQgZWFjaCBleGl0IGlzIGNvLW93bmVkIGJ5IHR3byBtZXRhbG9jYXRpb25zLlxuXG5cbmV4cG9ydCB0eXBlIFBvcyA9IG51bWJlcjtcbmV4cG9ydCB0eXBlIExvY1BvcyA9IG51bWJlcjsgLy8gbG9jYXRpb24gPDwgOCB8IHBvc1xuZXhwb3J0IHR5cGUgRXhpdFNwZWMgPSByZWFkb25seSBbTG9jUG9zLCBDb25uZWN0aW9uVHlwZV07XG5cbmV4cG9ydCBjbGFzcyBNZXRhbG9jYXRpb24ge1xuXG4gIC8vIFRPRE8gLSBzdG9yZSBtZXRhZGF0YSBhYm91dCB3aW5kbWlsbCBmbGFnPyAgdHdvIG1ldGFsb2NzIHdpbGwgbmVlZCBhIHBvcyB0b1xuICAvLyBpbmRpY2F0ZSB3aGVyZSB0aGF0IGZsYWcgc2hvdWxkIGdvLi4uPyAgT3Igc3RvcmUgaXQgaW4gdGhlIG1ldGFzY3JlZW4/XG5cbiAgLy8gQ2F2ZXMgYXJlIGFzc3VtZWQgdG8gYmUgYWx3YXlzIG9wZW4gdW5sZXNzIHRoZXJlJ3MgYSBmbGFnIHNldCBoZXJlLi4uXG4gIGN1c3RvbUZsYWdzID0gbmV3IE1hcDxQb3MsIEZsYWc+KCk7XG4gIGZyZWVGbGFncyA9IG5ldyBTZXQ8RmxhZz4oKTtcblxuICByZWFkb25seSByb206IFJvbTtcblxuICBwcml2YXRlIF9oZWlnaHQ6IG51bWJlcjtcbiAgcHJpdmF0ZSBfd2lkdGg6IG51bWJlcjtcblxuICBwcml2YXRlIF9wb3M6IFBvc1tdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBwcml2YXRlIF9leGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcbiAgcHJpdmF0ZSBfcGl0cyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7IC8vIE1hcHMgdG8gbG9jIDw8IDggfCBwb3NcblxuICAvL3ByaXZhdGUgX21vbnN0ZXJzSW52YWxpZGF0ZWQgPSBmYWxzZTtcblxuICAvKiogS2V5OiAoeTw8NCl8eCAqL1xuICBwcml2YXRlIF9zY3JlZW5zOiBNZXRhc2NyZWVuW107XG5cbiAgLy8gTk9URToga2VlcGluZyB0cmFjayBvZiByZWFjaGFiaWxpdHkgaXMgaW1wb3J0YW50IGJlY2F1c2Ugd2hlbiB3ZVxuICAvLyBkbyB0aGUgc3VydmV5IHdlIG5lZWQgdG8gb25seSBjb3VudCBSRUFDSEFCTEUgdGlsZXMhICBTZWFtbGVzc1xuICAvLyBwYWlycyBhbmQgYnJpZGdlcyBjYW4gY2F1c2UgbG90cyBvZiBpbXBvcnRhbnQtdG8tcmV0YWluIHVucmVhY2hhYmxlXG4gIC8vIHRpbGVzLiAgTW9yZW92ZXIsIHNvbWUgZGVhZC1lbmQgdGlsZXMgY2FuJ3QgYWN0dWFsbHkgYmUgd2Fsa2VkIG9uLlxuICAvLyBGb3Igbm93IHdlJ2xsIGp1c3QgemVybyBvdXQgZmVhdHVyZSBtZXRhc2NyZWVucyB0aGF0IGFyZW4ndFxuICAvLyByZWFjaGFibGUsIHNpbmNlIHRyeWluZyB0byBkbyBpdCBjb3JyZWN0bHkgcmVxdWlyZXMgc3RvcmluZ1xuICAvLyByZWFjaGFiaWxpdHkgYXQgdGhlIHRpbGUgbGV2ZWwgKGFnYWluIGR1ZSB0byBicmlkZ2UgZG91YmxlIHN0YWlycykuXG4gIC8vIHByaXZhdGUgX3JlYWNoYWJsZTogVWludDhBcnJheXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgaWQ6IG51bWJlciwgcmVhZG9ubHkgdGlsZXNldDogTWV0YXRpbGVzZXQsXG4gICAgICAgICAgICAgIGhlaWdodDogbnVtYmVyLCB3aWR0aDogbnVtYmVyKSB7XG4gICAgdGhpcy5yb20gPSB0aWxlc2V0LnJvbTtcbiAgICB0aGlzLl9oZWlnaHQgPSBoZWlnaHQ7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLl9zY3JlZW5zID0gbmV3IEFycmF5KGhlaWdodCA8PCA0KS5maWxsKHRpbGVzZXQuZW1wdHkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIG91dCBhIG1ldGFsb2NhdGlvbiBmcm9tIHRoZSBnaXZlbiBsb2NhdGlvbi4gIEluZmVyIHRoZVxuICAgKiB0aWxlc2V0IGlmIHBvc3NpYmxlLCBvdGhlcndpc2UgaXQgbXVzdCBiZSBleHBsaWNpdGx5IHNwZWNpZmllZC5cbiAgICovXG4gIHN0YXRpYyBvZihsb2NhdGlvbjogTG9jYXRpb24sIHRpbGVzZXQ/OiBNZXRhdGlsZXNldCk6IE1ldGFsb2NhdGlvbiB7XG4gICAgY29uc3Qge3JvbSwgd2lkdGgsIGhlaWdodH0gPSBsb2NhdGlvbjtcbiAgICBpZiAoIXRpbGVzZXQpIHtcbiAgICAgIC8vIEluZmVyIHRoZSB0aWxlc2V0LiAgU3RhcnQgYnkgYWRkaW5nIGFsbCBjb21wYXRpYmxlIG1ldGF0aWxlc2V0cy5cbiAgICAgIGNvbnN0IHtmb3J0cmVzcywgbGFieXJpbnRofSA9IHJvbS5tZXRhdGlsZXNldHM7XG4gICAgICBjb25zdCB0aWxlc2V0cyA9IG5ldyBTZXQ8TWV0YXRpbGVzZXQ+KCk7XG4gICAgICBmb3IgKGNvbnN0IHRzIG9mIHJvbS5tZXRhdGlsZXNldHMpIHtcbiAgICAgICAgaWYgKGxvY2F0aW9uLnRpbGVzZXQgPT09IHRzLnRpbGVzZXQuaWQpIHRpbGVzZXRzLmFkZCh0cyk7XG4gICAgICB9XG4gICAgICAvLyBJdCdzIGltcG9zc2libGUgdG8gZGlzdGluZ3Vpc2ggZm9ydHJlc3MgYW5kIGxhYnlyaW50aCwgc28gd2UgaGFyZGNvZGVcbiAgICAgIC8vIGl0IGJhc2VkIG9uIGxvY2F0aW9uOiBvbmx5ICRhOSBpcyBsYWJ5cmludGguXG4gICAgICB0aWxlc2V0cy5kZWxldGUobG9jYXRpb24uaWQgPT09IDB4YTkgPyBmb3J0cmVzcyA6IGxhYnlyaW50aCk7XG4gICAgICAvLyBGaWx0ZXIgb3V0IGFueSB0aWxlc2V0cyB0aGF0IGRvbid0IGluY2x1ZGUgbmVjZXNzYXJ5IHNjcmVlbiBpZHMuXG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiBuZXcgU2V0KGl0ZXJzLmNvbmNhdCguLi5sb2NhdGlvbi5zY3JlZW5zKSkpIHtcbiAgICAgICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRpbGVzZXRzKSB7XG4gICAgICAgICAgaWYgKCF0aWxlc2V0LmdldE1ldGFzY3JlZW5zKHNjcmVlbikubGVuZ3RoKSB0aWxlc2V0cy5kZWxldGUodGlsZXNldCk7XG4gICAgICAgICAgaWYgKCF0aWxlc2V0cy5zaXplKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHRpbGVzZXQgZm9yICR7aGV4KHNjcmVlbil9IGluICR7bG9jYXRpb259YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodGlsZXNldHMuc2l6ZSAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgdGlsZXNldCBmb3IgJHtsb2NhdGlvbn06IFske1xuICAgICAgICAgICAgICAgICAgICAgICAgIEFycmF5LmZyb20odGlsZXNldHMsIHQgPT4gdC5uYW1lKS5qb2luKCcsICcpfV1gKTtcbiAgICAgIH1cbiAgICAgIHRpbGVzZXQgPSBbLi4udGlsZXNldHNdWzBdO1xuICAgIH1cblxuICAgIC8vIFRyYXZlcnNlIHRoZSBsb2NhdGlvbiBmb3IgYWxsIHRpbGVzIHJlYWNoYWJsZSBmcm9tIGFuIGVudHJhbmNlLlxuICAgIC8vIFRoaXMgaXMgdXNlZCB0byBpbmZvcm0gd2hpY2ggbWV0YXNjcmVlbiB0byBzZWxlY3QgZm9yIHNvbWUgb2YgdGhlXG4gICAgLy8gcmVkdW5kYW50IG9uZXMgKGkuZS4gZG91YmxlIGRlYWQgZW5kcykuICBUaGlzIGlzIGEgc2ltcGxlIHRyYXZlcnNhbFxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IGxvY2F0aW9uLnJlYWNoYWJsZVRpbGVzKHRydWUpOyAvLyB0cmF2ZXJzZVJlYWNoYWJsZSgweDA0KTtcbiAgICBjb25zdCByZWFjaGFibGVTY3JlZW5zID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIHJlYWNoYWJsZS5rZXlzKCkpIHtcbiAgICAgIHJlYWNoYWJsZVNjcmVlbnMuYWRkKHRpbGUgPj4+IDgpO1xuICAgICAgLy9yZWFjaGFibGVTY3JlZW5zLmFkZCgodGlsZSAmIDB4ZjAwMCkgPj4+IDggfCAodGlsZSAmIDB4ZjApID4+PiA0KTtcbiAgICB9XG4gICAgLy8gTk9URTogc29tZSBlbnRyYW5jZXMgYXJlIG9uIGltcGFzc2FibGUgdGlsZXMgYnV0IHdlIHN0aWxsIGNhcmUgYWJvdXRcbiAgICAvLyB0aGUgc2NyZWVucyB1bmRlciB0aGVtIChlLmcuIGJvYXQgYW5kIHNob3AgZW50cmFuY2VzKS4gIEFsc28gbWFrZSBzdXJlXG4gICAgLy8gdG8gaGFuZGxlIHRoZSBzZWFtbGVzcyB0b3dlciBleGl0cy5cbiAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIGxvY2F0aW9uLmVudHJhbmNlcykge1xuICAgICAgaWYgKGVudHJhbmNlLnVzZWQpIHJlYWNoYWJsZVNjcmVlbnMuYWRkKGVudHJhbmNlLnNjcmVlbik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgcmVhY2hhYmxlU2NyZWVucy5hZGQoZXhpdC5zY3JlZW4pO1xuICAgICAgaWYgKGV4aXQuaXNTZWFtbGVzcygpKSB7XG4gICAgICAgIC8vIEhhbmRsZSBzZWFtbGVzcyBleGl0cyBvbiBzY3JlZW4gZWRnZXM6IG1hcmsgX2p1c3RfIHRoZSBuZWlnaGJvclxuICAgICAgICAvLyBzY3JlZW4gYXMgcmVhY2hhYmxlIChpbmNsdWRpbmcgZGVhZCBjZW50ZXIgdGlsZSBmb3IgbWF0Y2gpLlxuICAgICAgICBjb25zdCB5ID0gZXhpdC50aWxlID4+PiA0O1xuICAgICAgICBpZiAoeSA9PT0gMCB8fCB5ID09PSAweGUpIHtcbiAgICAgICAgICByZWFjaGFibGUuc2V0KGV4aXQuc2NyZWVuIDw8IDggfCAweDg4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvL2NvbnN0IGV4aXQgPSB0aWxlc2V0LmV4aXQ7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBBcnJheTxNZXRhc2NyZWVuPihoZWlnaHQgPDwgNCkuZmlsbCh0aWxlc2V0LmVtcHR5KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3QgdDAgPSB5IDw8IDQgfCB4O1xuICAgICAgICBjb25zdCBtZXRhc2NyZWVucyA9IHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnMobG9jYXRpb24uc2NyZWVuc1t5XVt4XSk7XG4gICAgICAgIGxldCBtZXRhc2NyZWVuOiBNZXRhc2NyZWVufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG1ldGFzY3JlZW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIG1ldGFzY3JlZW4gPSBtZXRhc2NyZWVuc1swXTtcbiAgICAgICAgfSBlbHNlIGlmICghbWV0YXNjcmVlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbXBvc3NpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVE9PRCAtIGZpbHRlciBiYXNlZCBvbiB3aG8gaGFzIGEgbWF0Y2ggZnVuY3Rpb24sIG9yIG1hdGNoaW5nIGZsYWdzXG4gICAgICAgICAgY29uc3QgZmxhZyA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gKCh5IDw8IDQpIHwgeCkpO1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXJzOiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICAgICAgICBjb25zdCBiZXN0OiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWV0YXNjcmVlbnMpIHtcbiAgICAgICAgICAgIGlmIChzLmRhdGEubWF0Y2gpIHtcbiAgICAgICAgICAgICAgbWF0Y2hlcnMucHVzaChzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocy5mbGFnID09PSAnYWx3YXlzJyAmJiBmbGFnPy5mbGFnID09PSAweDJmZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAhcy5mbGFnICYmICFzLmRhdGEud2FsbCAmJiAhZmxhZykge1xuICAgICAgICAgICAgICBiZXN0LnVuc2hpZnQocyk7IC8vIGZyb250LWxvYWQgbWF0Y2hpbmcgZmxhZ3NcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGJlc3QucHVzaChzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1hdGNoZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZnVuY3Rpb24gcmVhY2goZHk6IG51bWJlciwgZHg6IG51bWJlcikge1xuICAgICAgICAgICAgICBjb25zdCB4MCA9ICh4IDw8IDgpICsgZHg7XG4gICAgICAgICAgICAgIGNvbnN0IHkwID0gKHkgPDwgOCkgKyBkeTtcbiAgICAgICAgICAgICAgY29uc3QgdCA9XG4gICAgICAgICAgICAgICAgICAoeTAgPDwgNCkgJiAweGYwMDAgfCB4MCAmIDB4ZjAwIHwgeTAgJiAweGYwIHwgKHgwID4+IDQpICYgMHhmO1xuICAgICAgICAgICAgICByZXR1cm4gcmVhY2hhYmxlLmhhcyh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgbWF0Y2hlciBvZiBtYXRjaGVycykge1xuICAgICAgICAgICAgICBpZiAoIW1hdGNoZXIuZGF0YS5tYXRjaCEocmVhY2gsIGZsYWcgIT0gbnVsbCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICBtZXRhc2NyZWVuID0gbWF0Y2hlcjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghbWV0YXNjcmVlbikgbWV0YXNjcmVlbiA9IGJlc3RbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtZXRhc2NyZWVuKSB0aHJvdyBuZXcgRXJyb3IoJ2ltcG9zc2libGUnKTtcbiAgICAgICAgLy8gaWYgKChtZXRhc2NyZWVuLmRhdGEuZXhpdHMgfHwgbWV0YXNjcmVlbi5kYXRhLndhbGwpICYmXG4gICAgICAgIC8vICAgICAhcmVhY2hhYmxlU2NyZWVucy5oYXModDApICYmXG4gICAgICAgIC8vICAgICB0aWxlc2V0ICE9PSByb20ubWV0YXRpbGVzZXRzLnRvd2VyKSB7XG4gICAgICAgIC8vICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHN1cnZleSB1bnJlYWNoYWJsZSBzY3JlZW5zIChhbmQgaXQncyBoYXJkIHRvXG4gICAgICAgIC8vICAgLy8gdG8gZmlndXJlIG91dCB3aGljaCBpcyB3aGljaCBsYXRlcikuICBNYWtlIHN1cmUgbm90IHRvIGRvIHRoaXMgZm9yXG4gICAgICAgIC8vICAgLy8gdG93ZXIgYmVjYXVzZSBvdGhlcndpc2UgaXQnbGwgY2xvYmJlciBpbXBvcnRhbnQgcGFydHMgb2YgdGhlIG1hcC5cbiAgICAgICAgLy8gICBtZXRhc2NyZWVuID0gdGlsZXNldC5lbXB0eTtcbiAgICAgICAgLy8gfVxuICAgICAgICBzY3JlZW5zW3QwXSA9IG1ldGFzY3JlZW47XG4gICAgICAgIC8vIC8vIElmIHdlJ3JlIG9uIHRoZSBib3JkZXIgYW5kIGl0J3MgYW4gZWRnZSBleGl0IHRoZW4gY2hhbmdlIHRoZSBib3JkZXJcbiAgICAgICAgLy8gLy8gc2NyZWVuIHRvIHJlZmxlY3QgYW4gZXhpdC5cbiAgICAgICAgLy8gY29uc3QgZWRnZXMgPSBtZXRhc2NyZWVuLmVkZ2VFeGl0cygpO1xuICAgICAgICAvLyBpZiAoeSA9PT0gMCAmJiAoZWRnZXMgJiAxKSkgc2NyZWVuc1t0MCAtIDE2XSA9IGV4aXQ7XG4gICAgICAgIC8vIGlmICh4ID09PSAwICYmIChlZGdlcyAmIDIpKSBzY3JlZW5zW3QwIC0gMV0gPSBleGl0O1xuICAgICAgICAvLyBpZiAoeSA9PT0gaGVpZ2h0ICYmIChlZGdlcyAmIDQpKSBzY3JlZW5zW3QwICsgMTZdID0gZXhpdDtcbiAgICAgICAgLy8gaWYgKHggPT09IHdpZHRoICYmIChlZGdlcyAmIDgpKSBzY3JlZW5zW3QwICsgMV0gPSBleGl0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgZXhpdHNcbiAgICBjb25zdCBleGl0cyA9IG5ldyBUYWJsZTxQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlYz4oKTtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0LmRlc3QgPT09IDB4ZmYpIGNvbnRpbnVlO1xuICAgICAgbGV0IHNyY1BvcyA9IGV4aXQuc2NyZWVuO1xuICAgICAgLy8gS2Vuc3UgYXJlbmEgZXhpdCBpcyBkZWNsYXJlZCBhdCB5PWZcbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSAmJiAhKGV4aXQueXQgJiAweDBmKSkgc3JjUG9zLS07XG4gICAgICBpZiAoIXJlYWNoYWJsZVNjcmVlbnMuaGFzKHNyY1BvcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc3JjU2NyZWVuID0gc2NyZWVuc1tzcmNQb3NdO1xuICAgICAgY29uc3Qgc3JjRXhpdCA9IHNyY1NjcmVlbi5maW5kRXhpdFR5cGUoZXhpdC50aWxlLCBoZWlnaHQgPT09IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAhIShleGl0LmVudHJhbmNlICYgMHgyMCkpO1xuICAgICAgY29uc3Qgc3JjVHlwZSA9IHNyY0V4aXQ/LnR5cGU7XG4gICAgICBpZiAoIXNyY1R5cGUpIHtcbiAgICAgICAgY29uc3QgaWQgPSBsb2NhdGlvbi5pZCA8PCAxNiB8IHNyY1BvcyA8PCA4IHwgZXhpdC50aWxlO1xuICAgICAgICBpZiAodW5rbm93bkV4aXRXaGl0ZWxpc3QuaGFzKGlkKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGFsbCA9IHNyY1NjcmVlbi5kYXRhLmV4aXRzPy5tYXAoXG4gICAgICAgICAgICBlID0+IGUudHlwZSArICc6ICcgKyBlLmV4aXRzLm1hcChoZXgpLmpvaW4oJywgJykpLmpvaW4oJ1xcbiAgJyk7XG4gICAgICAgIGNvbnNvbGUud2FybihgVW5rbm93biBleGl0ICR7aGV4KGV4aXQudGlsZSl9OiAke3NyY1NjcmVlbi5uYW1lfSBpbiAke1xuICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9ufSBAICR7aGV4KHNyY1Bvcyl9OlxcbiAgJHthbGx9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGV4aXRzLmhhcyhzcmNQb3MsIHNyY1R5cGUpKSBjb250aW51ZTsgLy8gYWxyZWFkeSBoYW5kbGVkXG4gICAgICBjb25zdCBkZXN0ID0gcm9tLmxvY2F0aW9uc1tleGl0LmRlc3RdO1xuICAgICAgaWYgKHNyY1R5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICBjb25zdCBkb3duID0gc3JjVHlwZSA9PT0gJ3NlYW1sZXNzOmRvd24nO1xuICAgICAgICAvLyBOT1RFOiB0aGlzIHNlZW1zIHdyb25nIC0gdGhlIGRvd24gZXhpdCBpcyBCRUxPVyB0aGUgdXAgZXhpdC4uLj9cbiAgICAgICAgY29uc3QgdGlsZSA9IHNyY0V4aXQhLmV4aXRzWzBdICsgKGRvd24gPyAtMTYgOiAxNik7XG4gICAgICAgIC8vY29uc3QgZGVzdFBvcyA9IHNyY1BvcyArICh0aWxlIDwgMCA/IC0xNiA6IHRpbGUgPj0gMHhmMCA/IDE2IDogLTApO1xuICAgICAgICAvLyBOT1RFOiBib3R0b20tZWRnZSBzZWFtbGVzcyBpcyB0cmVhdGVkIGFzIGRlc3RpbmF0aW9uIGYwXG4gICAgICAgIGNvbnN0IGRlc3RQb3MgPSBzcmNQb3MgKyAodGlsZSA8IDAgPyAtMTYgOiAwKTtcbiAgICAgICAgY29uc3QgZGVzdFR5cGUgPSBkb3duID8gJ3NlYW1sZXNzOnVwJyA6ICdzZWFtbGVzczpkb3duJztcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgJHtzcmNUeXBlfSAke2hleChsb2NhdGlvbi5pZCl9ICR7ZG93bn0gJHtoZXgodGlsZSl9ICR7aGV4KGRlc3RQb3MpfSAke2Rlc3RUeXBlfSAke2hleChkZXN0LmlkKX1gKTtcbiAgICAgICAgZXhpdHMuc2V0KHNyY1Bvcywgc3JjVHlwZSwgW2Rlc3QuaWQgPDwgOCB8IGRlc3RQb3MsIGRlc3RUeXBlXSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZW50cmFuY2UgPSBkZXN0LmVudHJhbmNlc1tleGl0LmVudHJhbmNlICYgMHgxZl07XG4gICAgICBsZXQgZGVzdFBvcyA9IGVudHJhbmNlLnNjcmVlbjtcbiAgICAgIGxldCBkZXN0Q29vcmQgPSBlbnRyYW5jZS5jb29yZDtcbiAgICAgIGlmIChzcmNUeXBlID09PSAnZG9vcicgJiYgKGVudHJhbmNlLnkgJiAweGYwKSA9PT0gMCkge1xuICAgICAgICAvLyBOT1RFOiBUaGUgaXRlbSBzaG9wIGRvb3IgaW4gT2FrIHN0cmFkZGxlcyB0d28gc2NyZWVucyAoZXhpdCBpcyBvblxuICAgICAgICAvLyB0aGUgTlcgc2NyZWVuIHdoaWxlIGVudHJhbmNlIGlzIG9uIFNXIHNjcmVlbikuICBEbyBhIHF1aWNrIGhhY2sgdG9cbiAgICAgICAgLy8gZGV0ZWN0IHRoaXMgKHByb3h5aW5nIFwiZG9vclwiIGZvciBcInVwd2FyZCBleGl0XCIpIGFuZCBhZGp1c3Qgc2VhcmNoXG4gICAgICAgIC8vIHRhcmdldCBhY2NvcmRpbmdseS5cbiAgICAgICAgZGVzdFBvcyAtPSAweDEwO1xuICAgICAgICBkZXN0Q29vcmQgKz0gMHgxMDAwMDtcbiAgICAgIH1cbiAgICAgIC8vIEZpZ3VyZSBvdXQgdGhlIGNvbm5lY3Rpb24gdHlwZSBmb3IgdGhlIGRlc3RUaWxlLlxuICAgICAgY29uc3QgZGVzdFNjcklkID0gZGVzdC5zY3JlZW5zW2Rlc3RQb3MgPj4gNF1bZGVzdFBvcyAmIDB4Zl07XG4gICAgICBjb25zdCBkZXN0VHlwZSA9IGZpbmRFbnRyYW5jZVR5cGUoZGVzdCwgZGVzdFNjcklkLCBkZXN0Q29vcmQpO1xuICAgICAgLy8gTk9URTogaW5pdGlhbCBzcGF3biBoYXMgbm8gdHlwZS4uLj9cbiAgICAgIGlmICghZGVzdFR5cGUpIHtcbiAgICAgICAgY29uc3QgbGluZXMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBkZXN0U2NyIG9mIHJvbS5tZXRhc2NyZWVucy5nZXRCeUlkKGRlc3RTY3JJZCwgZGVzdC50aWxlc2V0KSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZXhpdCBvZiBkZXN0U2NyLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgICAgICAgIGlmIChleGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkgY29udGludWU7XG4gICAgICAgICAgICBsaW5lcy5wdXNoKGAgICR7ZGVzdFNjci5uYW1lfSAke2V4aXQudHlwZX06ICR7aGV4KGV4aXQuZW50cmFuY2UpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLndhcm4oYEJhZCBlbnRyYW5jZSAke2hleChkZXN0Q29vcmQpfTogcmF3ICR7aGV4KGRlc3RTY3JJZClcbiAgICAgICAgICAgICAgICAgICAgICB9IGluICR7ZGVzdH0gQCAke2hleChkZXN0UG9zKX1cXG4ke2xpbmVzLmpvaW4oJ1xcbicpfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGV4aXRzLnNldChzcmNQb3MsIHNyY1R5cGUsIFtkZXN0LmlkIDw8IDggfCBkZXN0UG9zLCBkZXN0VHlwZV0pO1xuICAgICAgLy8gaWYgKGRlc3RUeXBlKSBleGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdC5pZCA8PCA4IHwgZGVzdFBvcywgZGVzdFR5cGVdKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCB0aGUgcGl0cyBtYXAuXG4gICAgY29uc3QgcGl0cyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBwaXQgb2YgbG9jYXRpb24ucGl0cykge1xuICAgICAgcGl0cy5zZXQocGl0LmZyb21TY3JlZW4sIHBpdC5kZXN0IDw8IDggfCBwaXQudG9TY3JlZW4pO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGFsb2MgPSBuZXcgTWV0YWxvY2F0aW9uKGxvY2F0aW9uLmlkLCB0aWxlc2V0LCBoZWlnaHQsIHdpZHRoKTtcbiAgICAvLyBmb3IgKGxldCBpID0gMDsgaSA8IHNjcmVlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyAgIG1ldGFsb2Muc2V0SW50ZXJuYWwoaSwgc2NyZWVuc1tpXSk7XG4gICAgLy8gfVxuICAgIG1ldGFsb2MuX3NjcmVlbnMgPSBzY3JlZW5zO1xuICAgIG1ldGFsb2MuX2V4aXRzID0gZXhpdHM7XG4gICAgbWV0YWxvYy5fcGl0cyA9IHBpdHM7XG5cbiAgICAvLyBGaWxsIGluIGN1c3RvbSBmbGFnc1xuICAgIGZvciAoY29uc3QgZiBvZiBsb2NhdGlvbi5mbGFncykge1xuICAgICAgY29uc3Qgc2NyID0gbWV0YWxvYy5fc2NyZWVuc1tmLnNjcmVlbl07XG4gICAgICBpZiAoc2NyLmZsYWc/LnN0YXJ0c1dpdGgoJ2N1c3RvbScpKSB7XG4gICAgICAgIG1ldGFsb2MuY3VzdG9tRmxhZ3Muc2V0KGYuc2NyZWVuLCByb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgICB9IGVsc2UgaWYgKCFzY3IuZmxhZykge1xuICAgICAgICBtZXRhbG9jLmZyZWVGbGFncy5hZGQocm9tLmZsYWdzW2YuZmxhZ10pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhbG9jLmFsbFBvcygpKSB7XG4gICAgLy8gICBjb25zdCBzY3IgPSByb20ubWV0YXNjcmVlbnNbbWV0YWxvYy5fc2NyZWVuc1twb3MgKyAxNl1dO1xuICAgIC8vICAgaWYgKHNjci5mbGFnID09PSAnY3VzdG9tJykge1xuICAgIC8vICAgICBjb25zdCBmID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBwb3MpO1xuICAgIC8vICAgICBpZiAoZikgbWV0YWxvYy5jdXN0b21GbGFncy5zZXQocG9zLCByb20uZmxhZ3NbZi5mbGFnXSk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuXG4gICAgLy8gVE9ETyAtIHN0b3JlIHJlYWNoYWJpbGl0eSBtYXA/XG4gICAgcmV0dXJuIG1ldGFsb2M7XG5cbiAgICBmdW5jdGlvbiBmaW5kRW50cmFuY2VUeXBlKGRlc3Q6IExvY2F0aW9uLCBzY3JJZDogbnVtYmVyLCBjb29yZDogbnVtYmVyKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlc3RTY3Igb2Ygcm9tLm1ldGFzY3JlZW5zLmdldEJ5SWQoc2NySWQsIGRlc3QudGlsZXNldCkpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGRlc3RTY3IuZmluZEVudHJhbmNlVHlwZShjb29yZCwgZGVzdC5oZWlnaHQgPT09IDEpO1xuICAgICAgICBpZiAodHlwZSAhPSBudWxsKSByZXR1cm4gdHlwZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLy8gaXNSZWFjaGFibGUocG9zOiBQb3MpOiBib29sZWFuIHtcbiAgLy8gICB0aGlzLmNvbXB1dGVSZWFjaGFibGUoKTtcbiAgLy8gICByZXR1cm4gISEodGhpcy5fcmVhY2hhYmxlIVtwb3MgPj4+IDRdICYgKDEgPDwgKHBvcyAmIDcpKSk7XG4gIC8vIH1cblxuICAvLyBjb21wdXRlUmVhY2hhYmxlKCkge1xuICAvLyAgIGlmICh0aGlzLl9yZWFjaGFibGUpIHJldHVybjtcbiAgLy8gICB0aGlzLl9yZWFjaGFibGUgPSBuZXcgVWludDhBcnJheSh0aGlzLmhlaWdodCk7XG4gIC8vICAgY29uc3QgbWFwID0gdGhpcy50cmF2ZXJzZSh7ZmxpZ2h0OiB0cnVlfSk7XG4gIC8vICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvLyAgIGNvbnN0IHJlYWNoYWJsZSA9IG5ldyBTZXQ8UG9zPigpO1xuICAvLyAgIGZvciAoY29uc3QgW3Bvc10gb2YgdGhpcy5fZXhpdHMpIHtcbiAgLy8gICAgIGNvbnN0IHNldCA9IG1hcC5nZXQocG9zKVxuICAvLyAgIH1cbiAgLy8gfVxuXG4gIGdldFVpZChwb3M6IFBvcyk6IFVpZCB7XG4gICAgcmV0dXJuIHRoaXMuX3NjcmVlbnNbcG9zXS51aWQ7XG4gIH1cblxuICBnZXQocG9zOiBQb3MpOiBNZXRhc2NyZWVuIHtcbiAgICByZXR1cm4gdGhpcy5fc2NyZWVuc1twb3NdO1xuICB9XG5cbiAgLy8gUmVhZG9ubHkgYWNjZXNzb3IuXG4gIC8vIGdldCBzY3JlZW5zKCk6IHJlYWRvbmx5IFVpZFtdIHtcbiAgLy8gICByZXR1cm4gdGhpcy5fc2NyZWVucztcbiAgLy8gfVxuXG4gIGdldCB3aWR0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl93aWR0aDtcbiAgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlcikge1xuICAgIHRoaXMuX3dpZHRoID0gd2lkdGg7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gIH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9oZWlnaHQgPiBoZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NjcmVlbnMuc3BsaWNlKChoZWlnaHQgKyAyKSA8PCA0LCAodGhpcy5faGVpZ2h0IC0gaGVpZ2h0KSA8PCA0KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2hlaWdodCA8IGhlaWdodCkge1xuICAgICAgdGhpcy5fc2NyZWVucy5sZW5ndGggPSAoaGVpZ2h0ICsgMikgPDwgNDtcbiAgICAgIHRoaXMuX3NjcmVlbnMuZmlsbCh0aGlzLnRpbGVzZXQuZW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuaGVpZ2h0ICsgMikgPDwgNCwgdGhpcy5fc2NyZWVucy5sZW5ndGgpO1xuICAgIH1cbiAgICB0aGlzLl9oZWlnaHQgPSBoZWlnaHQ7XG4gICAgdGhpcy5fcG9zID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gVE9ETyAtIHJlc2l6ZSBmdW5jdGlvbj9cblxuICBhbGxQb3MoKTogcmVhZG9ubHkgUG9zW10ge1xuICAgIGlmICh0aGlzLl9wb3MpIHJldHVybiB0aGlzLl9wb3M7XG4gICAgY29uc3QgcDogbnVtYmVyW10gPSB0aGlzLl9wb3MgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX2hlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX3dpZHRoOyB4KyspIHtcbiAgICAgICAgcC5wdXNoKHkgPDwgNCB8IHgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIHNldChwb3M6IFBvcywgc2NyOiBNZXRhc2NyZWVuIHwgbnVsbCkge1xuICAgIHRoaXMuX3NjcmVlbnNbcG9zXSA9IHNjciA/PyB0aGlzLnRpbGVzZXQuZW1wdHk7XG4gIH1cblxuICAvL2ludmFsaWRhdGVNb25zdGVycygpIHsgdGhpcy5fbW9uc3RlcnNJbnZhbGlkYXRlZCA9IHRydWU7IH1cblxuICBpbkJvdW5kcyhwb3M6IFBvcyk6IGJvb2xlYW4ge1xuICAgIC8vIHJldHVybiBpbkJvdW5kcyhwb3MsIHRoaXMuaGVpZ2h0LCB0aGlzLndpZHRoKTtcbiAgICByZXR1cm4gKHBvcyAmIDE1KSA8IHRoaXMud2lkdGggJiYgcG9zID49IDAgJiYgcG9zID4+PiA0IDwgdGhpcy5oZWlnaHQ7XG4gIH1cblxuICAvLyBpc0ZpeGVkKHBvczogUG9zKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRoaXMuX2ZpeGVkLmhhcyhwb3MpO1xuICAvLyB9XG5cbiAgLyoqXG4gICAqIEZvcmNlLW92ZXJ3cml0ZXMgdGhlIGdpdmVuIHJhbmdlIG9mIHNjcmVlbnMuICBEb2VzIHZhbGlkaXR5IGNoZWNraW5nXG4gICAqIG9ubHkgYXQgdGhlIGVuZC4gIERvZXMgbm90IGRvIGFueXRoaW5nIHdpdGggZmVhdHVyZXMsIHNpbmNlIHRoZXkncmVcbiAgICogb25seSBzZXQgaW4gbGF0ZXIgcGFzc2VzIChpLmUuIHNodWZmbGUsIHdoaWNoIGlzIGxhc3QpLlxuICAgKi9cbiAgc2V0MmQocG9zOiBQb3MsXG4gICAgICAgIHNjcmVlbnM6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxPcHRpb25hbDxNZXRhc2NyZWVuPj4+KTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByb3cgb2Ygc2NyZWVucykge1xuICAgICAgbGV0IGR4ID0gMDtcbiAgICAgIGZvciAoY29uc3Qgc2NyIG9mIHJvdykge1xuICAgICAgICBpZiAoc2NyKSB0aGlzLnNldChwb3MgKyBkeCwgc2NyKTtcbiAgICAgICAgZHgrKztcbiAgICAgIH1cbiAgICAgIHBvcyArPSAxNjtcbiAgICB9XG4gICAgLy8gcmV0dXJuIHRoaXMudmVyaWZ5KHBvczAsIHNjcmVlbnMubGVuZ3RoLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICBNYXRoLm1heCguLi5zY3JlZW5zLm1hcChyID0+IHIubGVuZ3RoKSkpO1xuICAgIC8vIFRPRE8gLSB0aGlzIGlzIGtpbmQgb2YgYnJva2VuLi4uIDotKFxuICAgIC8vIHJldHVybiB0aGlzLnZhbGlkYXRlKCk7XG4gICAgLy9yZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKiBDaGVjayBhbGwgdGhlIGN1cnJlbnRseSBpbnZhbGlkYXRlZCBlZGdlcywgdGhlbiBjbGVhcnMgaXQuICovXG4gIHZhbGlkYXRlKCk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgZGlyIG9mIFswLCAxXSkge1xuICAgICAgZm9yIChsZXQgeSA9IGRpciA/IDAgOiAxOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgICBmb3IgKGxldCB4ID0gZGlyOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgY29uc3QgcG9zMDogUG9zID0geSA8PCA0IHwgeDtcbiAgICAgICAgICBjb25zdCBzY3IwID0gdGhpcy5fc2NyZWVuc1twb3MwXTtcbiAgICAgICAgICBjb25zdCBwb3MxOiBQb3MgPSBwb3MwIC0gKGRpciA/IDEgOiAxNik7XG4gICAgICAgICAgY29uc3Qgc2NyMSA9IHRoaXMuX3NjcmVlbnNbcG9zMV07XG4gICAgICAgICAgaWYgKHNjcjAuaXNFbXB0eSgpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoc2NyMS5pc0VtcHR5KCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICghc2NyMC5jaGVja05laWdoYm9yKHNjcjEsIGRpcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihmb3JtYXQoJ2JhZCBuZWlnaGJvciAlcyAoJTAyeCkgJXMgJXMgKCUwMngpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyMS5uYW1lLCBwb3MxLCBESVJfTkFNRVtkaXJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3IwLm5hbWUsIHBvczApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzcGxpY2VDb2x1bW5zKGxlZnQ6IG51bWJlciwgZGVsZXRlZDogbnVtYmVyLCBpbnNlcnRlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgIHNjcmVlbnM6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxNZXRhc2NyZWVuPj4pIHtcbiAgICAvLyBGaXJzdCBhZGp1c3QgdGhlIHNjcmVlbnMuXG4gICAgZm9yIChsZXQgcCA9IDA7IHAgPCB0aGlzLl9zY3JlZW5zLmxlbmd0aDsgcCArPSAxNikge1xuICAgICAgdGhpcy5fc2NyZWVucy5jb3B5V2l0aGluKHAgKyBsZWZ0ICsgaW5zZXJ0ZWQsIHAgKyBsZWZ0ICsgZGVsZXRlZCwgcCArIDEwKTtcbiAgICAgIHRoaXMuX3NjcmVlbnMuc3BsaWNlKHAgKyBsZWZ0LCBpbnNlcnRlZCwgLi4uc2NyZWVuc1twID4+IDRdKTtcbiAgICB9XG4gICAgLy8gVXBkYXRlIGRpbWVuc2lvbnMgYW5kIGFjY291bnRpbmdcbiAgICBjb25zdCBkZWx0YSA9IGluc2VydGVkIC0gZGVsZXRlZDtcbiAgICB0aGlzLndpZHRoICs9IGRlbHRhO1xuICAgIHRoaXMuX3BvcyA9IHVuZGVmaW5lZDtcbiAgICAvLyBNb3ZlIHJlbGV2YW50IGV4aXRzXG4gICAgY29uc3QgbW92ZTogW1BvcywgQ29ubmVjdGlvblR5cGUsIFBvcywgQ29ubmVjdGlvblR5cGVdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGVdIG9mIHRoaXMuX2V4aXRzKSB7XG4gICAgICBjb25zdCB4ID0gcG9zICYgMHhmO1xuICAgICAgaWYgKHggPCBsZWZ0ICsgZGVsZXRlZCkge1xuICAgICAgICBpZiAoeCA+PSBsZWZ0KSB0aGlzLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBtb3ZlLnB1c2goW3BvcywgdHlwZSwgcG9zICsgZGVsdGEsIHR5cGVdKTtcbiAgICB9XG4gICAgdGhpcy5tb3ZlRXhpdHMoLi4ubW92ZSk7XG4gICAgLy8gTW92ZSBmbGFncyBhbmQgc3Bhd25zIGluIHBhcmVudCBsb2NhdGlvblxuICAgIGNvbnN0IHBhcmVudCA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmlkXTtcbiAgICBjb25zdCB4dDAgPSAobGVmdCArIGRlbGV0ZWQpIDw8IDQ7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBwYXJlbnQuc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24ueHQgPCB4dDApIGNvbnRpbnVlO1xuICAgICAgc3Bhd24ueHQgLT0gKGRlbHRhIDw8IDQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgcGFyZW50LmZsYWdzKSB7XG4gICAgICBpZiAoZmxhZy54cyA8IGxlZnQgKyBkZWxldGVkKSB7XG4gICAgICAgIGlmIChmbGFnLnhzID49IGxlZnQpIGZsYWcuc2NyZWVuID0gMHhmZjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmbGFnLnhzIC09IGRlbHRhO1xuICAgIH1cbiAgICBwYXJlbnQuZmxhZ3MgPSBwYXJlbnQuZmxhZ3MuZmlsdGVyKGYgPT4gZi5zY3JlZW4gIT09IDB4ZmYpO1xuXG4gICAgLy8gVE9ETyAtIG1vdmUgcGl0cz8/XG5cbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gRXhpdCBoYW5kbGluZ1xuXG4gIHNldEV4aXQocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlLCBzcGVjOiBFeGl0U3BlYykge1xuICAgIGNvbnN0IG90aGVyID0gdGhpcy5yb20ubG9jYXRpb25zW3NwZWNbMF0gPj4+IDhdLm1ldGE7XG4gICAgaWYgKCFvdGhlcikgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3Qgc2V0IHR3by13YXkgZXhpdCB3aXRob3V0IG1ldGFgKTtcbiAgICB0aGlzLnNldEV4aXRPbmVXYXkocG9zLCB0eXBlLCBzcGVjKTtcbiAgICBvdGhlci5zZXRFeGl0T25lV2F5KHNwZWNbMF0gJiAweGZmLCBzcGVjWzFdLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gIH1cbiAgc2V0RXhpdE9uZVdheShwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUsIHNwZWM6IEV4aXRTcGVjKSB7XG4gICAgLy8gY29uc3QgcHJldiA9IHRoaXMuX2V4aXRzLmdldChwb3MsIHR5cGUpO1xuICAgIC8vIGlmIChwcmV2KSB7XG4gICAgLy8gICBjb25zdCBvdGhlciA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2WzBdID4+PiA4XS5tZXRhO1xuICAgIC8vICAgaWYgKG90aGVyKSBvdGhlci5fZXhpdHMuZGVsZXRlKHByZXZbMF0gJiAweGZmLCBwcmV2WzFdKTtcbiAgICAvLyB9XG4gICAgdGhpcy5fZXhpdHMuc2V0KHBvcywgdHlwZSwgc3BlYyk7XG4gIH1cbiAgZGVsZXRlRXhpdChwb3M6IFBvcywgdHlwZTogQ29ubmVjdGlvblR5cGUpIHtcbiAgICB0aGlzLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgfVxuXG4gIGdldEV4aXQocG9zOiBQb3MsIHR5cGU6IENvbm5lY3Rpb25UeXBlKTogRXhpdFNwZWN8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fZXhpdHMuZ2V0KHBvcywgdHlwZSk7XG4gIH1cblxuICBleGl0cygpOiBJdGVyYWJsZTxyZWFkb25seSBbUG9zLCBDb25uZWN0aW9uVHlwZSwgRXhpdFNwZWNdPiB7XG4gICAgcmV0dXJuIHRoaXMuX2V4aXRzO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvdW50ZWQgY2FuZGlkYXRlcz9cbiAgZXhpdENhbmRpZGF0ZXModHlwZTogQ29ubmVjdGlvblR5cGUpOiBNZXRhc2NyZWVuW10ge1xuICAgIC8vIFRPRE8gLSBmaWd1cmUgb3V0IGEgd2F5IHRvIHVzZSB0aGUgZG91YmxlLXN0YWlyY2FzZT8gIGl0IHdvbid0XG4gICAgLy8gaGFwcGVuIGN1cnJlbnRseSBiZWNhdXNlIGl0J3MgZml4ZWQsIHNvIGl0J3MgZXhjbHVkZWQuLi4uP1xuICAgIGNvbnN0IGhhc0V4aXQ6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2NyIG9mIHRoaXMudGlsZXNldCkge1xuICAgICAgaWYgKHNjci5kYXRhLmV4aXRzPy5zb21lKGUgPT4gZS50eXBlID09PSB0eXBlKSkgaGFzRXhpdC5wdXNoKHNjcik7XG4gICAgfVxuICAgIHJldHVybiBoYXNFeGl0O1xuICB9XG5cbiAgLy8gVE9ETyAtIHNob3J0IHZzIGZ1bGw/XG4gIHNob3coKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIGxldCBsaW5lID0gW107XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgIGxpbmUucHVzaCh4LnRvU3RyaW5nKDE2KSk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goJyAgICcgKyBsaW5lLmpvaW4oJyAgJykpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCAzOyByKyspIHtcbiAgICAgICAgbGluZSA9IFtyID09PSAxID8geS50b1N0cmluZygxNikgOiAnICcsICcgJ107XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XTtcbiAgICAgICAgICBsaW5lLnB1c2goc2NyZWVuPy5kYXRhLmljb24/LmZ1bGxbcl0gPz8gKHIgPT09IDEgPyAnID8gJyA6ICcgICAnKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGluZXMucHVzaChsaW5lLmpvaW4oJycpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgc2NyZWVuTmFtZXMoKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgbGV0IGxpbmUgPSBbXTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMuX3NjcmVlbnNbeSA8PCA0IHwgeF07XG4gICAgICAgIGxpbmUucHVzaChzY3JlZW4/Lm5hbWUpO1xuICAgICAgfVxuICAgICAgbGluZXMucHVzaChsaW5lLmpvaW4oJyAnKSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHRyYXZlcnNlKG9wdHM6IFRyYXZlcnNlT3B0cyA9IHt9KTogTWFwPG51bWJlciwgU2V0PG51bWJlcj4+IHtcbiAgICAvLyBSZXR1cm5zIGEgbWFwIGZyb20gdW5pb25maW5kIHJvb3QgdG8gYSBsaXN0IG9mIGFsbCByZWFjaGFibGUgdGlsZXMuXG4gICAgLy8gQWxsIGVsZW1lbnRzIG9mIHNldCBhcmUga2V5cyBwb2ludGluZyB0byB0aGUgc2FtZSB2YWx1ZSByZWYuXG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPG51bWJlcj4oKTtcbiAgICBjb25zdCBjb25uZWN0aW9uVHlwZSA9IChvcHRzLmZsaWdodCA/IDIgOiAwKSB8IChvcHRzLm5vRmxhZ2dlZCA/IDEgOiAwKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBvcHRzLndpdGg/LmdldChwb3MpID8/IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzY3IuY29ubmVjdGlvbnNbY29ubmVjdGlvblR5cGVdKSB7XG4gICAgICAgIGlmICghc2VnbWVudC5sZW5ndGgpIGNvbnRpbnVlOyAvLyBlLmcuIGVtcHR5XG4gICAgICAgIC8vIENvbm5lY3Qgd2l0aGluIGVhY2ggc2VnbWVudFxuICAgICAgICB1Zi51bmlvbihzZWdtZW50Lm1hcChjID0+IChwb3MgPDwgOCkgKyBjKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigpO1xuICAgIGNvbnN0IHNldHMgPSB1Zi5zZXRzKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzZXQgPSBzZXRzW2ldO1xuICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNldCkge1xuICAgICAgICBtYXAuc2V0KGVsZW0sIHNldCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hcDtcbiAgfSAgXG5cbiAgLyoqIEBwYXJhbSBlZGdlIEEgdmFsdWUgZnJvbSBhIHRyYXZlcnNlIHNldC4gKi9cbiAgZXhpdFR5cGUoZWRnZTogbnVtYmVyKTogQ29ubmVjdGlvblR5cGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoKGVkZ2UgJiAweGYwKSAhPT0gMHhlMCkgcmV0dXJuO1xuICAgIGNvbnN0IHBvcyA9IGVkZ2UgPj4+IDg7XG4gICAgY29uc3Qgc2NyID0gdGhpcy5nZXQocG9zKTtcbiAgICBjb25zdCB0eXBlID0gc2NyLmRhdGEuZXhpdHM/LltlZGdlICYgMHhmXS50eXBlO1xuICAgIGlmICghdHlwZT8uc3RhcnRzV2l0aCgnZWRnZTonKSkgcmV0dXJuIHR5cGU7XG4gICAgLy8gbWF5IG5vdCBhY3R1YWxseSBiZSBhbiBleGl0LlxuICAgIGlmICh0eXBlID09PSAnZWRnZTp0b3AnICYmIChwb3MgPj4+IDQpKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScgJiYgKHBvcyA+Pj4gNCkgPT09IHRoaXMuaGVpZ2h0IC0gMSkgcmV0dXJuO1xuICAgIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0JyAmJiAocG9zICYgMHhmKSkgcmV0dXJuO1xuICAgIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nICYmIChwb3MgJiAweGYpID09PSB0aGlzLndpZHRoIC0gMSkgcmV0dXJuO1xuICAgIHJldHVybiB0eXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBlZGdlIEEgdmFsdWUgZnJvbSBhIHRyYXZlcnNlIHNldC5cbiAgICogQHJldHVybiBBbiBZeVh4IHBvc2l0aW9uIGZvciB0aGUgZ2l2ZW4gcG9pLCBpZiBpdCBleGlzdHMuXG4gICAqL1xuICBwb2lUaWxlKGVkZ2U6IG51bWJlcik6IG51bWJlcnx1bmRlZmluZWQge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gIH1cblxuICAvKipcbiAgICogQXR0YWNoIGFuIGV4aXQvZW50cmFuY2UgcGFpciBpbiB0d28gZGlyZWN0aW9ucy5cbiAgICogQWxzbyByZWF0dGFjaGVzIHRoZSBmb3JtZXIgb3RoZXIgZW5kcyBvZiBlYWNoIHRvIGVhY2ggb3RoZXIuXG4gICAqL1xuICBhdHRhY2goc3JjUG9zOiBQb3MsIGRlc3Q6IE1ldGFsb2NhdGlvbiwgZGVzdFBvczogUG9zLFxuICAgICAgICAgc3JjVHlwZT86IENvbm5lY3Rpb25UeXBlLCBkZXN0VHlwZT86IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgaWYgKCFzcmNUeXBlKSBzcmNUeXBlID0gdGhpcy5waWNrVHlwZUZyb21FeGl0cyhzcmNQb3MpO1xuICAgIGlmICghZGVzdFR5cGUpIGRlc3RUeXBlID0gZGVzdC5waWNrVHlwZUZyb21FeGl0cyhkZXN0UG9zKTtcblxuICAgIC8vIFRPRE8gLSB3aGF0IGlmIG11bHRpcGxlIHJldmVyc2VzPyAgZS5nLiBjb3JkZWwgZWFzdC93ZXN0P1xuICAgIC8vICAgICAgLSBjb3VsZCBkZXRlcm1pbmUgaWYgdGhpcyBhbmQvb3IgZGVzdCBoYXMgYW55IHNlYW1sZXNzLlxuICAgIC8vIE5vOiBpbnN0ZWFkLCBkbyBhIHBvc3QtcHJvY2Vzcy4gIE9ubHkgY29yZGVsIG1hdHRlcnMsIHNvIGdvXG4gICAgLy8gdGhyb3VnaCBhbmQgYXR0YWNoIGFueSByZWR1bmRhbnQgZXhpdHMuXG5cbiAgICBjb25zdCBkZXN0VGlsZSA9IGRlc3QuaWQgPDwgOCB8IGRlc3RQb3M7XG4gICAgY29uc3Qgc3JjVGlsZSA9IHRoaXMuaWQgPDwgOCB8IHNyY1BvcztcbiAgICBjb25zdCBwcmV2RGVzdCA9IHRoaXMuX2V4aXRzLmdldChzcmNQb3MsIHNyY1R5cGUpO1xuICAgIGNvbnN0IHByZXZTcmMgPSBkZXN0Ll9leGl0cy5nZXQoZGVzdFBvcywgZGVzdFR5cGUpO1xuICAgIGlmIChwcmV2RGVzdCAmJiBwcmV2U3JjKSB7XG4gICAgICBjb25zdCBbcHJldkRlc3RUaWxlLCBwcmV2RGVzdFR5cGVdID0gcHJldkRlc3Q7XG4gICAgICBjb25zdCBbcHJldlNyY1RpbGUsIHByZXZTcmNUeXBlXSA9IHByZXZTcmM7XG4gICAgICBpZiAocHJldkRlc3RUaWxlID09PSBkZXN0VGlsZSAmJiBwcmV2RGVzdFR5cGUgPT09IGRlc3RUeXBlICYmXG4gICAgICAgICAgcHJldlNyY1RpbGUgPT09IHNyY1RpbGUgJiYgcHJldlNyY1R5cGUgPT09IHNyY1R5cGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9leGl0cy5zZXQoc3JjUG9zLCBzcmNUeXBlLCBbZGVzdFRpbGUsIGRlc3RUeXBlXSk7XG4gICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RQb3MsIGRlc3RUeXBlLCBbc3JjVGlsZSwgc3JjVHlwZV0pO1xuICAgIC8vIGFsc28gaG9vayB1cCBwcmV2aW91cyBwYWlyXG4gICAgaWYgKHByZXZTcmMgJiYgcHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2RGVzdFRpbGUsIHByZXZEZXN0VHlwZV0gPSBwcmV2RGVzdDtcbiAgICAgIGNvbnN0IFtwcmV2U3JjVGlsZSwgcHJldlNyY1R5cGVdID0gcHJldlNyYztcbiAgICAgIGNvbnN0IHByZXZTcmNNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZTcmNUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgY29uc3QgcHJldkRlc3RNZXRhID0gdGhpcy5yb20ubG9jYXRpb25zW3ByZXZEZXN0VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgIHByZXZTcmNNZXRhLl9leGl0cy5zZXQocHJldlNyY1RpbGUgJiAweGZmLCBwcmV2U3JjVHlwZSwgcHJldkRlc3QpO1xuICAgICAgcHJldkRlc3RNZXRhLl9leGl0cy5zZXQocHJldkRlc3RUaWxlICYgMHhmZiwgcHJldkRlc3RUeXBlLCBwcmV2U3JjKTtcbiAgICB9IGVsc2UgaWYgKHByZXZTcmMgfHwgcHJldkRlc3QpIHtcbiAgICAgIGNvbnN0IFtwcmV2VGlsZSwgcHJldlR5cGVdID0gKHByZXZTcmMgfHwgcHJldkRlc3QpITtcbiAgICAgIC8vIE5PVEU6IGlmIHdlIHVzZWQgYXR0YWNoIHRvIGhvb2sgdXAgdGhlIHJldmVyc2Ugb2YgYSBvbmUtd2F5IGV4aXRcbiAgICAgIC8vIChpLmUuIHRvd2VyIGV4aXQgcGF0Y2gpIHRoZW4gd2UgbmVlZCB0byAqbm90KiByZW1vdmUgdGhlIG90aGVyIHNpZGUuXG4gICAgICBpZiAoKHByZXZUaWxlICE9PSBzcmNUaWxlIHx8IHByZXZUeXBlICE9PSBzcmNUeXBlKSAmJlxuICAgICAgICAgIChwcmV2VGlsZSAhPT0gZGVzdFRpbGUgfHwgcHJldlR5cGUgIT09IGRlc3RUeXBlKSkge1xuICAgICAgICBjb25zdCBwcmV2TWV0YSA9IHRoaXMucm9tLmxvY2F0aW9uc1twcmV2VGlsZSA+PiA4XS5tZXRhITtcbiAgICAgICAgcHJldk1ldGEuX2V4aXRzLmRlbGV0ZShwcmV2VGlsZSAmIDB4ZmYsIHByZXZUeXBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwaWNrVHlwZUZyb21FeGl0cyhwb3M6IFBvcyk6IENvbm5lY3Rpb25UeXBlIHtcbiAgICBjb25zdCB0eXBlcyA9IFsuLi50aGlzLl9leGl0cy5yb3cocG9zKS5rZXlzKCldO1xuICAgIGlmICghdHlwZXMubGVuZ3RoKSByZXR1cm4gdGhpcy5waWNrVHlwZUZyb21TY3JlZW5zKHBvcyk7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc2luZ2xlIHR5cGUgZm9yICR7aGV4KHBvcyl9OiBbJHt0eXBlcy5qb2luKCcsICcpfV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVzWzBdO1xuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIGFuIGV4aXQgZnJvbSBvbmUgcG9zL3R5cGUgdG8gYW5vdGhlci5cbiAgICogQWxzbyB1cGRhdGVzIHRoZSBtZXRhbG9jYXRpb24gb24gdGhlIG90aGVyIGVuZCBvZiB0aGUgZXhpdC5cbiAgICogVGhpcyBzaG91bGQgdHlwaWNhbGx5IGJlIGRvbmUgYXRvbWljYWxseSBpZiByZWJ1aWxkaW5nIGEgbWFwLlxuICAgKi9cbiAgLy8gVE9ETyAtIHJlYnVpbGRpbmcgYSBtYXAgaW52b2x2ZXMgbW92aW5nIHRvIGEgTkVXIG1ldGFsb2NhdGlvbi4uLlxuICAvLyAgICAgIC0gZ2l2ZW4gdGhpcywgd2UgbmVlZCBhIGRpZmZlcmVudCBhcHByb2FjaD9cbiAgbW92ZUV4aXRzKC4uLm1vdmVzOiBBcnJheTxbUG9zLCBDb25uZWN0aW9uVHlwZSwgTG9jUG9zLCBDb25uZWN0aW9uVHlwZV0+KSB7XG4gICAgY29uc3QgbmV3RXhpdHM6IEFycmF5PFtQb3MsIENvbm5lY3Rpb25UeXBlLCBFeGl0U3BlY10+ID0gW107XG4gICAgZm9yIChjb25zdCBbb2xkUG9zLCBvbGRUeXBlLCBuZXdQb3MsIG5ld1R5cGVdIG9mIG1vdmVzKSB7XG4gICAgICBjb25zdCBkZXN0RXhpdCA9IHRoaXMuX2V4aXRzLmdldChvbGRQb3MsIG9sZFR5cGUpITtcbiAgICAgIGNvbnN0IFtkZXN0VGlsZSwgZGVzdFR5cGVdID0gZGVzdEV4aXQ7XG4gICAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgW3RoaXMuaWQgPDwgOCB8IG5ld1BvcywgbmV3VHlwZV0pO1xuICAgICAgbmV3RXhpdHMucHVzaChbbmV3UG9zLCBuZXdUeXBlLCBkZXN0RXhpdF0pO1xuICAgICAgdGhpcy5fZXhpdHMuZGVsZXRlKG9sZFBvcywgb2xkVHlwZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgZXhpdF0gb2YgbmV3RXhpdHMpIHtcbiAgICAgIHRoaXMuX2V4aXRzLnNldChwb3MsIHR5cGUsIGV4aXQpO1xuICAgIH1cbiAgfVxuXG4gIG1vdmVFeGl0KHByZXY6IFBvcywgbmV4dDogUG9zLFxuICAgICAgICAgICBwcmV2VHlwZT86IENvbm5lY3Rpb25UeXBlLCBuZXh0VHlwZT86IENvbm5lY3Rpb25UeXBlKSB7XG4gICAgaWYgKCFwcmV2VHlwZSkgcHJldlR5cGUgPSB0aGlzLnBpY2tUeXBlRnJvbUV4aXRzKHByZXYpO1xuICAgIGlmICghbmV4dFR5cGUpIG5leHRUeXBlID0gdGhpcy5waWNrVHlwZUZyb21TY3JlZW5zKG5leHQpO1xuICAgIGNvbnN0IGRlc3RFeGl0ID0gdGhpcy5fZXhpdHMuZ2V0KHByZXYsIHByZXZUeXBlKSE7XG4gICAgY29uc3QgW2Rlc3RUaWxlLCBkZXN0VHlwZV0gPSBkZXN0RXhpdDtcbiAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+IDhdLm1ldGEhO1xuICAgIGRlc3QuX2V4aXRzLnNldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICBbdGhpcy5pZCA8PCA4IHwgbmV4dCwgbmV4dFR5cGVdKTtcbiAgICB0aGlzLl9leGl0cy5zZXQobmV4dCwgbmV4dFR5cGUsIGRlc3RFeGl0KTtcbiAgICB0aGlzLl9leGl0cy5kZWxldGUocHJldiwgcHJldlR5cGUpO1xuICB9XG5cbiAgbW92ZUV4aXRzQW5kUGl0c1RvKG90aGVyOiBNZXRhbG9jYXRpb24pIHtcbiAgICBjb25zdCBtb3ZlZCA9IG5ldyBTZXQ8UG9zPigpO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIG90aGVyLmFsbFBvcygpKSB7XG4gICAgICBpZiAoIW90aGVyLmdldChwb3MpLmRhdGEuZGVsZXRlKSB7XG4gICAgICAgIG1vdmVkLmFkZChwb3MpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgaWYgKCFtb3ZlZC5oYXMocG9zKSkgY29udGludWU7XG4gICAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3RUaWxlID4+PiA4XS5tZXRhO1xuICAgICAgZGVzdC5fZXhpdHMuc2V0KGRlc3RUaWxlICYgMHhmZiwgZGVzdFR5cGUsIFtvdGhlci5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gICAgICBvdGhlci5fZXhpdHMuc2V0KHBvcywgdHlwZSwgW2Rlc3RUaWxlLCBkZXN0VHlwZV0pO1xuICAgICAgdGhpcy5fZXhpdHMuZGVsZXRlKHBvcywgdHlwZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2Zyb20sIHRvXSBvZiB0aGlzLl9waXRzKSB7XG4gICAgICBpZiAoIW1vdmVkLmhhcyhmcm9tKSkgY29udGludWU7XG4gICAgICBvdGhlci5fcGl0cy5zZXQoZnJvbSwgdG8pO1xuICAgICAgdGhpcy5fcGl0cy5kZWxldGUoZnJvbSk7XG4gICAgfVxuICB9XG5cbiAgcGlja1R5cGVGcm9tU2NyZWVucyhwb3M6IFBvcyk6IENvbm5lY3Rpb25UeXBlIHtcbiAgICBjb25zdCBleGl0cyA9IHRoaXMuX3NjcmVlbnNbcG9zXS5kYXRhLmV4aXRzO1xuICAgIGNvbnN0IHR5cGVzID0gKGV4aXRzID8/IFtdKS5tYXAoZSA9PiBlLnR5cGUpO1xuICAgIGlmICh0eXBlcy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc2luZ2xlIHR5cGUgZm9yICR7aGV4KHBvcyl9OiBbJHt0eXBlcy5qb2luKCcsICcpfV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVzWzBdO1xuICB9XG5cbiAgdHJhbnNmZXJGbGFncyhvcmlnOiBNZXRhbG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgLy8gQ29weSBvdmVyIHRoZSBmcmVlIGZsYWdzXG4gICAgdGhpcy5mcmVlRmxhZ3MgPSBuZXcgU2V0KG9yaWcuZnJlZUZsYWdzKTtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgY3VzdG9tIGZsYWdzLlxuICAgIGNvbnN0IGN1c3RvbXMgPSBuZXcgRGVmYXVsdE1hcDxNZXRhc2NyZWVuLCBGbGFnW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IFtwb3MsIGZsYWddIG9mIG9yaWcuY3VzdG9tRmxhZ3MpIHtcbiAgICAgIGN1c3RvbXMuZ2V0KG9yaWcuX3NjcmVlbnNbcG9zXSkucHVzaChmbGFnKTtcbiAgICB9XG4gICAgLy8gU2h1ZmZsZSB0aGVtIGp1c3QgaW4gY2FzZSB0aGV5J3JlIG5vdCBhbGwgdGhlIHNhbWUuLi5cbiAgICAvLyBUT0RPIC0gZm9yIHNlYW1sZXNzIHBhaXJzLCBvbmx5IHNodWZmbGUgb25jZSwgdGhlbiBjb3B5LlxuICAgIGZvciAoY29uc3QgZmxhZ3Mgb2YgY3VzdG9tcy52YWx1ZXMoKSkgcmFuZG9tLnNodWZmbGUoZmxhZ3MpO1xuICAgIC8vIEZpbmQgYWxsIHRoZSBjdXN0b20tZmxhZyBzY3JlZW5zIGluIHRoZSBuZXcgbG9jYXRpb24uXG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgaWYgKHNjci5mbGFnPy5zdGFydHNXaXRoKCdjdXN0b20nKSkge1xuICAgICAgICBjb25zdCBmbGFnID0gY3VzdG9tcy5nZXQoc2NyKS5wb3AoKTtcbiAgICAgICAgaWYgKCFmbGFnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBmbGFnIGZvciAke3Njci5uYW1lfSBhdCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfSBAJHtoZXgocG9zKX1gKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmN1c3RvbUZsYWdzLnNldChwb3MsIGZsYWcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb3B5IHBpdCBkZXN0aW5hdGlvbnMgZnJvbSB0aGUgb3JpZ2luYWwuICBOT1RFOiB0aGVyZSBpcyBOTyBzYWZldHlcbiAgICogY2hlY2sgaGVyZSBmb3IgdGhlIHBpdHMgYmVpbmcgcmVhc29uYWJsZS4gIFRoYXQgbXVzdCBiZSBkb25lIGVsc2V3aGVyZS5cbiAgICogV2UgZG9uJ3Qgd2FudCBwaXQgc2FmZXR5IHRvIGJlIGNvbnRpbmdlbnQgb24gc3VjY2Vzc2Z1bCBzaHVmZmxpbmcgb2ZcbiAgICogdGhlIHVwc3RhaXJzIG1hcC5cbiAgICovXG4gIHRyYW5zZmVyUGl0cyhvcmlnOiBNZXRhbG9jYXRpb24pIHtcbiAgICB0aGlzLl9waXRzID0gb3JpZy5fcGl0cztcbiAgfVxuXG4gIC8qKiBFbnN1cmUgYWxsIHBpdHMgZ28gdG8gdmFsaWQgbG9jYXRpb25zLiAqL1xuICBzaHVmZmxlUGl0cyhyYW5kb206IFJhbmRvbSkge1xuICAgIGlmICghdGhpcy5fcGl0cy5zaXplKSByZXR1cm47XG4gICAgLy8gRmluZCBhbGwgcGl0IGRlc3RpbmF0aW9ucy5cbiAgICBjb25zdCBkZXN0cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgWywgZGVzdF0gb2YgdGhpcy5fcGl0cykge1xuICAgICAgZGVzdHMuYWRkKHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0ID4+PiA4XS5pZCk7XG4gICAgfVxuICAgIHRoaXMuX3BpdHMuY2xlYXIoKTtcblxuICAgIC8vIExvb2sgZm9yIGV4aXN0aW5nIHBpdHMuICBTb3J0IGJ5IGxvY2F0aW9uLCBbcGl0IHBvcywgZGVzdCBwb3NdXG4gICAgY29uc3QgcGl0cyA9IG5ldyBEZWZhdWx0TWFwPE1ldGFsb2NhdGlvbiwgQXJyYXk8W1BvcywgUG9zXT4+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLmdldChwb3MpO1xuICAgICAgaWYgKCFzY3IuaGFzRmVhdHVyZSgncGl0JykpIGNvbnRpbnVlO1xuICAgICAgLy8gRmluZCB0aGUgbmVhcmVzdCBleGl0IHRvIG9uZSBvZiB0aG9zZSBkZXN0aW5hdGlvbnM6IFtkZWx0YSwgbG9jLCBkaXN0XVxuICAgICAgbGV0IGNsb3Nlc3Q6IFtQb3MsIE1ldGFsb2NhdGlvbiwgbnVtYmVyXSA9IFstMSwgdGhpcywgSW5maW5pdHldO1xuICAgICAgZm9yIChjb25zdCBbZXhpdFBvcywsIFtkZXN0XV0gb2YgdGhpcy5fZXhpdHMpIHtcbiAgICAgICAgY29uc3QgZGlzdCA9IGRpc3RhbmNlKHBvcywgZXhpdFBvcyk7XG4gICAgICAgIGlmIChkZXN0cy5oYXMoZGVzdCA+Pj4gOCkgJiYgZGlzdCA8IGNsb3Nlc3RbMl0pIHtcbiAgICAgICAgICBjb25zdCBkbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2Rlc3QgPj4+IDhdLm1ldGE7XG4gICAgICAgICAgY29uc3QgZHBvcyA9IGRlc3QgJiAweGZmO1xuICAgICAgICAgIGNsb3Nlc3QgPSBbYWRkRGVsdGEocG9zLCBkcG9zLCBleGl0UG9zLCBkbG9jKSwgZGxvYywgZGlzdF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChjbG9zZXN0WzBdID49IDApIHBpdHMuZ2V0KGNsb3Nlc3RbMV0pLnB1c2goW3BvcywgY2xvc2VzdFswXV0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGRlc3Qgb2YgZGVzdHMpIHtcbiAgICAgIGNvbnN0IGxpc3QgPSBwaXRzLmdldCh0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF0ubWV0YSk7XG4gICAgICAvLyBJZiB0aGVyZSdzIGV2ZXIgbm90IGEgZGlyZWN0IGV4aXQgdG8gYW55IGRlc3RpbmF0aW9uLCBqdXN0IHB1c2hcbiAgICAgIC8vIGEgbGFyZ2UgZGVsdGEgdG93YXJkIHRoZSBib3R0b20gb2YgdGhlIG1hcC5cbiAgICAgIGlmICghbGlzdC5sZW5ndGgpIGxpc3QucHVzaChbMCwgMHhmMF0pO1xuICAgIH1cblxuICAgIC8vIEZvciBlYWNoIGRlc3RpbmF0aW9uIGxvY2F0aW9uLCBsb29rIGZvciBzcGlrZXMsIHRoZXNlIHdpbGwgb3ZlcnJpZGVcbiAgICAvLyBhbnkgcG9zaXRpb24tYmFzZWQgZGVzdGluYXRpb25zLlxuICAgIGZvciAoY29uc3QgW2Rlc3QsIGxpc3RdIG9mIHBpdHMpIHtcbiAgICAgIC8vIHZlcnRpY2FsLCBob3Jpem9udGFsXG4gICAgICBjb25zdCBlbGlnaWJsZTogUG9zW11bXSA9IFtbXSwgW11dO1xuICAgICAgY29uc3Qgc3Bpa2VzID0gbmV3IE1hcDxQb3MsIG51bWJlcj4oKTtcbiAgICAgIGZvciAoY29uc3QgcG9zIG9mIGRlc3QuYWxsUG9zKCkpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gZGVzdC5nZXQocG9zKTtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyaXZlcicpIHx8IHNjci5oYXNGZWF0dXJlKCdlbXB0eScpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZWRnZXMgPVxuICAgICAgICAgICAgKHNjci5kYXRhLmVkZ2VzIHx8ICcnKS5zcGxpdCgnJykubWFwKHggPT4geCA9PT0gJyAnID8gJycgOiB4KTtcbiAgICAgICAgaWYgKGVkZ2VzWzBdICYmIGVkZ2VzWzJdKSBlbGlnaWJsZVswXS5wdXNoKHBvcyk7XG4gICAgICAgIC8vIE5PVEU6IHdlIGNsYW1wIHRoZSB0YXJnZXQgWCBjb29yZHMgc28gdGhhdCBzcGlrZSBzY3JlZW5zIGFyZSBhbGwgZ29vZFxuICAgICAgICAvLyB0aGlzIHByZXZlbnRzIGVycm9ycyBmcm9tIG5vdCBoYXZpbmcgYSB2aWFibGUgZGVzdGluYXRpb24gc2NyZWVuLlxuICAgICAgICBpZiAoKGVkZ2VzWzFdICYmIGVkZ2VzWzNdKSB8fCBzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgICBlbGlnaWJsZVsxXS5wdXNoKHBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkge1xuICAgICAgICAgIHNwaWtlcy5zZXQocG9zLCBbLi4uZWRnZXNdLmZpbHRlcihjID0+IGMgPT09ICdzJykubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfVxuLy9jb25zb2xlLmxvZyhgZGVzdDpcXG4ke2Rlc3Quc2hvdygpfVxcbmVsaWdpYmxlOiAke2VsaWdpYmxlLm1hcChlID0+IGUubWFwKGggPT4gaC50b1N0cmluZygxNikpLmpvaW4oJywnKSkuam9pbignICAnKX1gKTtcbiAgICAgIC8vIGZpbmQgdGhlIGNsb3Nlc3QgZGVzdGluYXRpb24gZm9yIHRoZSBmaXJzdCBwaXQsIGtlZXAgYSBydW5uaW5nIGRlbHRhLlxuICAgICAgbGV0IGRlbHRhOiBbUG9zLCBQb3NdID0gWzAsIDBdO1xuICAgICAgZm9yIChjb25zdCBbdXBzdGFpcnMsIGRvd25zdGFpcnNdIG9mIGxpc3QpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5nZXQodXBzdGFpcnMpO1xuICAgICAgICBjb25zdCBlZGdlcyA9IHNjci5kYXRhLmVkZ2VzIHx8ICcnO1xuICAgICAgICBjb25zdCBkaXIgPSBlZGdlc1sxXSA9PT0gJ2MnICYmIGVkZ2VzWzNdID09PSAnYycgPyAxIDogMDtcbiAgICAgICAgLy8gZWxpZ2libGUgZGVzdCB0aWxlLCBkaXN0YW5jZVxuICAgICAgICBsZXQgY2xvc2VzdDogW1BvcywgbnVtYmVyLCBudW1iZXJdID0gWy0xLCBJbmZpbml0eSwgMF07XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGFkZERlbHRhKGRvd25zdGFpcnMsIGRlbHRhWzBdLCBkZWx0YVsxXSwgZGVzdCk7XG4gICAgICAgIGZvciAoY29uc3QgcG9zIG9mIGVsaWdpYmxlW2Rpcl0pIHsgLy9mb3IgKGxldCBpID0gMDsgaSA8IGVsaWdpYmxlW2Rpcl0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAvLyAgICAgICAgICBjb25zdCBwb3MgPSBlbGlnaWJsZVtkaXJdW2ldO1xuICAgICAgICAgIGNvbnN0IHNwaWtlQ291bnQgPSBzcGlrZXMuZ2V0KHBvcykgPz8gMDtcbiAgICAgICAgICBpZiAoc3Bpa2VDb3VudCA8IGNsb3Nlc3RbMl0pIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGRpc3QgPSBkaXN0YW5jZSh0YXJnZXQsIHBvcyk7XG4gICAgICAgICAgaWYgKGRpc3QgPCBjbG9zZXN0WzFdKSB7XG4gICAgICAgICAgICBjbG9zZXN0ID0gW3BvcywgZGlzdCwgc3Bpa2VDb3VudF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVuZFBvcyA9IGNsb3Nlc3RbMF07XG4gICAgICAgIGlmIChlbmRQb3MgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGVsaWdpYmxlIGRlc3RgKTtcbiAgICAgICAgZGVsdGEgPSBbZW5kUG9zLCB0YXJnZXRdO1xuICAgICAgICB0aGlzLl9waXRzLnNldCh1cHN0YWlycywgZGVzdC5pZCA8PCA4IHwgZW5kUG9zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGFrZXMgb3duZXJzaGlwIG9mIGV4aXRzIGZyb20gYW5vdGhlciBtZXRhbG9jYXRpb24gd2l0aCB0aGUgc2FtZSBJRC5cbiAgICogQHBhcmFtIHtmaXhlZH0gbWFwcyBkZXN0aW5hdGlvbiBsb2NhdGlvbiBJRCB0byBwb3Mgd2hlcmUgdGhlIGV4aXQgaXMuXG4gICAqL1xuICB0cmFuc2ZlckV4aXRzKG9yaWc6IE1ldGFsb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBEZXRlcm1pbmUgYWxsIHRoZSBlbGlnaWJsZSBleGl0IHNjcmVlbnMuXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgRGVmYXVsdE1hcDxDb25uZWN0aW9uVHlwZSwgUG9zW10+KCgpID0+IFtdKTtcbiAgICBjb25zdCBzZWxmRXhpdHMgPSBuZXcgRGVmYXVsdE1hcDxDb25uZWN0aW9uVHlwZSwgU2V0PFBvcz4+KCgpID0+IG5ldyBTZXQoKSk7XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgZm9yIChjb25zdCB7dHlwZX0gb2Ygc2NyLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnRvcCcgJiYgKHBvcyA+Pj4gNCkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6bGVmdCcgJiYgKHBvcyAmIDB4ZikpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiAocG9zID4+PiA0KSA8IHRoaXMuaGVpZ2h0IC0gMSkgY29udGludWU7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTpyaWdodCcgJiYgKHBvcyAmIDB4ZikgPCB0aGlzLndpZHRoIC0gMSkgY29udGludWU7XG4gICAgICAgIGV4aXRzLmdldCh0eXBlKS5wdXNoKHBvcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgYXJyIG9mIGV4aXRzLnZhbHVlcygpKSB7XG4gICAgICByYW5kb20uc2h1ZmZsZShhcnIpO1xuICAgIH1cbiAgICAvLyBGaW5kIGEgbWF0Y2ggZm9yIGVhY2ggb3JpZ2luYWwgZXhpdC5cbiAgICBmb3IgKGNvbnN0IFtvcG9zLCB0eXBlLCBleGl0XSBvZiBvcmlnLl9leGl0cykge1xuICAgICAgaWYgKHNlbGZFeGl0cy5nZXQodHlwZSkuaGFzKG9wb3MpKSBjb250aW51ZTtcbiAgICAgIC8vIG9wb3MsZXhpdCBmcm9tIG9yaWdpbmFsIHZlcnNpb24gb2YgdGhpcyBtZXRhbG9jYXRpb25cbiAgICAgIGNvbnN0IHBvcyA9IGV4aXRzLmdldCh0eXBlKS5wb3AoKTsgLy8gYSBQb3MgaW4gdGhpcyBtZXRhbG9jYXRpb25cbiAgICAgIGlmIChwb3MgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB0cmFuc2ZlciBleGl0ICR7dHlwZX0gaW4gJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF19OiBubyBlbGlnaWJsZSBzY3JlZW5cXG4ke1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpfWApO1xuICAgICAgfVxuICAgICAgLy8gTG9vayBmb3IgYSByZXZlcnNlIGV4aXQ6IGV4aXQgaXMgdGhlIHNwZWMgZnJvbSBvbGQgbWV0YS5cbiAgICAgIC8vIEZpbmQgdGhlIG1ldGFsb2NhdGlvbiBpdCByZWZlcnMgdG8gYW5kIHNlZSBpZiB0aGUgZXhpdFxuICAgICAgLy8gZ29lcyBiYWNrIHRvIHRoZSBvcmlnaW5hbCBwb3NpdGlvbi5cbiAgICAgIGNvbnN0IGVsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdFswXSA+Pj4gOF0ubWV0YTtcbiAgICAgIGNvbnN0IGVwb3MgPSBleGl0WzBdICYgMHhmZjtcbiAgICAgIGNvbnN0IGV0eXBlID0gZXhpdFsxXTtcbiAgICAgIGlmIChlbG9jID09PSBvcmlnKSB7XG4gICAgICAgIC8vIFNwZWNpYWwgY2FzZSBvZiBhIHNlbGYtZXhpdCAoaGFwcGVucyBpbiBoeWRyYSBhbmQgcHlyYW1pZCkuXG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSwganVzdCBwaWNrIGFuIGV4aXQgb2YgdGhlIGNvcnJlY3QgdHlwZS5cbiAgICAgICAgY29uc3QgbnBvcyA9IGV4aXRzLmdldChldHlwZSkucG9wKCk7XG4gICAgICAgIGlmIChucG9zID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZWApO1xuICAgICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBbdGhpcy5pZCA8PCA4IHwgbnBvcywgZXR5cGVdKTtcbiAgICAgICAgdGhpcy5fZXhpdHMuc2V0KG5wb3MsIGV0eXBlLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gICAgICAgIC8vIEFsc28gZG9uJ3QgdmlzaXQgdGhlIG90aGVyIGV4aXQgbGF0ZXIuXG4gICAgICAgIHNlbGZFeGl0cy5nZXQoZXR5cGUpLmFkZChlcG9zKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCByZXQgPSBlbG9jLl9leGl0cy5nZXQoZXBvcywgZXR5cGUpITtcbiAgICAgIGlmICghcmV0KSB7XG4gICAgICAgIGNvbnN0IGVlbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2V4aXRbMF0gPj4+IDhdO1xuICAgICAgICBjb25zb2xlLmxvZyhlbG9jKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBleGl0IGZvciAke2VlbG9jfSBhdCAke2hleChlcG9zKX0gJHtldHlwZX1cXG4ke1xuICAgICAgICAgICAgICAgICAgICAgICAgIGVsb2Muc2hvdygpfVxcbiR7dGhpcy5yb20ubG9jYXRpb25zW3RoaXMuaWRdfSBhdCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgIGhleChvcG9zKX0gJHt0eXBlfVxcbiR7dGhpcy5zaG93KCl9YCk7XG4gICAgICB9XG4gICAgICBpZiAoKHJldFswXSA+Pj4gOCkgPT09IHRoaXMuaWQgJiYgKChyZXRbMF0gJiAweGZmKSA9PT0gb3BvcykgJiZcbiAgICAgICAgICByZXRbMV0gPT09IHR5cGUpIHtcbiAgICAgICAgZWxvYy5fZXhpdHMuc2V0KGVwb3MsIGV0eXBlLCBbdGhpcy5pZCA8PCA4IHwgcG9zLCB0eXBlXSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgTlBDcywgdHJpZ2dlcnMsIGFuZCBjaGVzdHMgYmFzZWQgb24gcHJveGltaXR5IHRvIHNjcmVlbnMsXG4gICAqIGV4aXRzLCBhbmQgUE9JLlxuICAgKi9cbiAgdHJhbnNmZXJTcGF3bnModGhhdDogTWV0YWxvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAgIC8vIFN0YXJ0IGJ5IGJ1aWxkaW5nIGEgbWFwIGJldHdlZW4gZXhpdHMgYW5kIHNwZWNpZmljIHNjcmVlbiB0eXBlcy5cbiAgICBjb25zdCByZXZlcnNlRXhpdHMgPSBuZXcgTWFwPEV4aXRTcGVjLCBbbnVtYmVyLCBudW1iZXJdPigpOyAvLyBtYXAgdG8geSx4XG4gICAgY29uc3QgcGl0cyA9IG5ldyBNYXA8UG9zLCBudW1iZXI+KCk7IC8vIG1hcHMgdG8gZGlyICgwID0gdmVydCwgMSA9IGhvcml6KVxuICAgIGNvbnN0IHN0YXR1ZXM6IEFycmF5PFtQb3MsIG51bWJlcl0+ID0gW107IC8vIGFycmF5IG9mIHNwYXduIFtzY3JlZW4sIGNvb3JkXVxuICAgIC8vIEFycmF5IG9mIFtvbGQgeSwgb2xkIHgsIG5ldyB5LCBuZXcgeCwgbWF4IGRpc3RhbmNlIChzcXVhcmVkKV1cbiAgICBjb25zdCBtYXA6IEFycmF5PFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgY29uc3Qgd2FsbHM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgY29uc3QgYnJpZGdlczogQXJyYXk8W251bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICAvLyBQYWlyIHVwIGFyZW5hcy5cbiAgICBjb25zdCBhcmVuYXM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IHBvcyBvZiBsb2MuYWxsUG9zKCkpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gbG9jLl9zY3JlZW5zW3Bvc107XG4gICAgICAgIGNvbnN0IHkgPSBwb3MgJiAweGYwO1xuICAgICAgICBjb25zdCB4ID0gKHBvcyAmIDB4ZikgPDwgNDtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdwaXQnKSAmJiBsb2MgPT09IHRoaXMpIHtcbiAgICAgICAgICBwaXRzLnNldChwb3MsIHNjci5lZGdlSW5kZXgoJ2MnKSA9PT0gNSA/IDAgOiAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChzY3IuZGF0YS5zdGF0dWVzPy5sZW5ndGggJiYgbG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY3IuZGF0YS5zdGF0dWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBzY3IuZGF0YS5zdGF0dWVzW2ldIDw8IDEyO1xuICAgICAgICAgICAgY29uc3QgcGFyaXR5ID0gKChwb3MgJiAweGYpIF4gKHBvcyA+Pj4gNCkgXiBpKSAmIDE7XG4gICAgICAgICAgICBjb25zdCBjb2wgPSBwYXJpdHkgPyAweDUwIDogMHhhMDtcbiAgICAgICAgICAgIHN0YXR1ZXMucHVzaChbcG9zLCByb3cgfCBjb2xdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcyAmJiBzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSB7XG4gICAgICAgICAgaWYgKHNjci5kYXRhLndhbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHdhbGwgcHJvcGApO1xuICAgICAgICAgIGNvbnN0IHdhbGwgPSBbeSB8IChzY3IuZGF0YS53YWxsID4+IDQpLCB4IHwgKHNjci5kYXRhLndhbGwgJiAweGYpXTtcbiAgICAgICAgICB3YWxscy5wdXNoKHdhbGwgYXMgW251bWJlciwgbnVtYmVyXSk7XG4gICAgICAgICAgLy8gU3BlY2lhbC1jYXNlIHRoZSBcImRvdWJsZSBicmlkZ2VcIiBpbiBsaW1lIHRyZWUgbGFrZVxuICAgICAgICAgIGlmIChzY3IuZGF0YS50aWxlc2V0cy5saW1lKSB3YWxscy5wdXNoKFt3YWxsWzBdIC0gMSwgd2FsbFsxXV0pO1xuICAgICAgICB9IGVsc2UgaWYgKGxvYyA9PT0gdGhpcyAmJiBzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHtcbiAgICAgICAgICBpZiAoc2NyLmRhdGEud2FsbCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgd2FsbCBwcm9wYCk7XG4gICAgICAgICAgYnJpZGdlcy5wdXNoKFt5IHwgKHNjci5kYXRhLndhbGwgPj4gNCksIHggfCAoc2NyLmRhdGEud2FsbCAmIDB4ZildKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNjci5oYXNGZWF0dXJlKCdhcmVuYScpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGxvYyA9PT0gdGhpcykge1xuICAgICAgICAgIGFyZW5hcy5wdXNoKFt5IHwgOCwgeCB8IDhdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBbbnksIG54XSA9IGFyZW5hcy5wb3AoKSE7XG4gICAgICAgICAgbWFwLnB1c2goW3kgfCA4LCB4IHwgOCwgbnksIG54LCAxNDRdKTsgLy8gMTIgdGlsZXNcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGxvYyA9PT0gdGhpcykgeyAvLyBUT0RPIC0gdGhpcyBpcyBhIG1lc3MsIGZhY3RvciBvdXQgdGhlIGNvbW1vbmFsaXR5XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKGFyZW5hcyk7XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKHN0YXR1ZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBOb3cgcGFpciB1cCBleGl0cy5cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbdGhpcywgdGhhdF0pIHtcbiAgICAgIGZvciAoY29uc3QgW3BvcywgdHlwZSwgZXhpdF0gb2YgbG9jLl9leGl0cykge1xuICAgICAgICBjb25zdCBzY3IgPSBsb2MuX3NjcmVlbnNbcG9zXTtcbiAgICAgICAgY29uc3Qgc3BlYyA9IHNjci5kYXRhLmV4aXRzPy5maW5kKGUgPT4gZS50eXBlID09PSB0eXBlKTtcbiAgICAgICAgaWYgKCFzcGVjKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZXhpdDogJHtzY3IubmFtZX0gJHt0eXBlfWApO1xuICAgICAgICBjb25zdCB4MCA9IHBvcyAmIDB4ZjtcbiAgICAgICAgY29uc3QgeTAgPSBwb3MgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHgxID0gc3BlYy5leGl0c1swXSAmIDB4ZjtcbiAgICAgICAgY29uc3QgeTEgPSBzcGVjLmV4aXRzWzBdID4+PiA0O1xuICAgICAgICBpZiAobG9jID09PSB0aGlzKSB7XG4gICAgICAgICAgcmV2ZXJzZUV4aXRzLnNldChleGl0LCBbeTAgPDwgNCB8IHkxLCB4MCA8PCA0IHwgeDFdKTtcbiAgICAgICAgfSBlbHNlIGlmICgoZXhpdFswXSA+Pj4gOCkgIT09IHRoaXMuaWQpIHsgLy8gc2tpcCBzZWxmLWV4aXRzXG4gICAgICAgICAgY29uc3QgW255LCBueF0gPSByZXZlcnNlRXhpdHMuZ2V0KGV4aXQpITtcbiAgICAgICAgICBtYXAucHVzaChbeTAgPDwgNCB8IHkxLCB4MCA8PCA0IHwgeDEsIG55LCBueCwgMjVdKTsgLy8gNSB0aWxlc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE1ha2UgYSBsaXN0IG9mIFBPSSBieSBwcmlvcml0eSAoMC4uNSkuXG5cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBmaXJzdCBwYXJ0aXRpb25pbmcgdGhlIHNjcmVlbnMgd2l0aCBpbXBhc3NpYmxlXG4gICAgLy8gd2FsbHMgYW5kIHBsYWNpbmcgcG9pIGludG8gYXMgbWFueSBzZXBhcmF0ZSBwYXJ0aXRpb25zIChmcm9tXG4gICAgLy8gc3RhaXJzL2VudHJhbmNlcykgYXMgcG9zc2libGUgPz8/ICBPciBtYXliZSBqdXN0IHdlaWdodCB0aG9zZVxuICAgIC8vIGhpZ2hlcj8gIGRvbid0IHdhbnQgdG8gX2ZvcmNlXyB0aGluZ3MgdG8gYmUgaW5hY2Nlc3NpYmxlLi4uP1xuXG4gICAgY29uc3QgcHBvaTogQXJyYXk8QXJyYXk8W251bWJlciwgbnVtYmVyXT4+ID0gW1tdLCBbXSwgW10sIFtdLCBbXSwgW11dO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuX3NjcmVlbnNbcG9zXTtcbiAgICAgIGZvciAoY29uc3QgW3AsIGR5ID0gMHg3MCwgZHggPSAweDc4XSBvZiBzY3IuZGF0YS5wb2kgPz8gW10pIHtcbiAgICAgICAgY29uc3QgeSA9ICgocG9zICYgMHhmMCkgPDwgNCkgKyBkeTtcbiAgICAgICAgY29uc3QgeCA9ICgocG9zICYgMHgwZikgPDwgOCkgKyBkeDtcbiAgICAgICAgcHBvaVtwXS5wdXNoKFt5LCB4XSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9pIG9mIHBwb2kpIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKHBvaSk7XG4gICAgfVxuICAgIGNvbnN0IGFsbFBvaSA9IFsuLi5pdGVycy5jb25jYXQoLi4ucHBvaSldO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgc3Bhd25zLCBsb29rIGZvciBOUEMvY2hlc3QvdHJpZ2dlci5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgXG4gICAgZm9yIChjb25zdCBzcGF3biBvZiByYW5kb20uaXNodWZmbGUobG9jLnNwYXducykpIHtcbiAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkge1xuICAgICAgICBjb25zdCBwbGF0Zm9ybSA9IFBMQVRGT1JNUy5pbmRleE9mKHNwYXduLm1vbnN0ZXJJZCk7XG4gICAgICAgIGlmIChwbGF0Zm9ybSA+PSAwICYmIHBpdHMuc2l6ZSkge1xuICAgICAgICAgIGNvbnN0IFtbcG9zLCBkaXJdXSA9IHBpdHM7XG4gICAgICAgICAgcGl0cy5kZWxldGUocG9zKTtcbiAgICAgICAgICBzcGF3bi5tb25zdGVySWQgPSBQTEFURk9STVNbcGxhdGZvcm0gJiAyIHwgZGlyXTtcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSBwb3M7XG4gICAgICAgICAgc3Bhd24udGlsZSA9IGRpciA/IDB4NzMgOiAweDQ3O1xuICAgICAgICB9IGVsc2UgaWYgKHNwYXduLm1vbnN0ZXJJZCA9PT0gMHg4ZiAmJiBzdGF0dWVzLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IFtzY3JlZW4sIGNvb3JkXSA9IHN0YXR1ZXMucG9wKCkhO1xuICAgICAgICAgIHNwYXduLnNjcmVlbiA9IHNjcmVlbjtcbiAgICAgICAgICBzcGF3bi5jb29yZCA9IGNvb3JkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlOyAvLyB0aGVzZSBhcmUgaGFuZGxlZCBlbHNld2hlcmUuXG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgIGNvbnN0IHdhbGwgPSAoc3Bhd24ud2FsbFR5cGUoKSA9PT0gJ2JyaWRnZScgPyBicmlkZ2VzIDogd2FsbHMpLnBvcCgpO1xuICAgICAgICBpZiAoIXdhbGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBlbm91Z2ggJHtzcGF3bi53YWxsVHlwZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9IHNjcmVlbnMgaW4gbmV3IG1ldGFsb2NhdGlvbjogJHtsb2N9XFxuJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFt5LCB4XSA9IHdhbGw7XG4gICAgICAgIHNwYXduLnl0ID0geTtcbiAgICAgICAgc3Bhd24ueHQgPSB4O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSB8fCBzcGF3bi5pc0Jvc3MoKSB8fCBzcGF3bi5pc1RyaWdnZXIoKSB8fFxuICAgICAgICAgICAgICAgICBzcGF3bi5pc0dlbmVyaWMoKSkge1xuICAgICAgICAvL2xldCBqID0gMDtcbiAgICAgICAgbGV0IGJlc3QgPSBbLTEsIC0xLCBJbmZpbml0eV07XG4gICAgICAgIGZvciAoY29uc3QgW3kwLCB4MCwgeTEsIHgxLCBkbWF4XSBvZiBtYXApIHtcbiAgICAgICAgICBjb25zdCBkID0gKHl0RGlmZihzcGF3bi55dCwgeTApKSAqKiAyICsgKHNwYXduLnh0IC0geDApICoqIDI7XG4gICAgICAgICAgaWYgKGQgPD0gZG1heCAmJiBkIDwgYmVzdFsyXSkge1xuICAgICAgICAgICAgYmVzdCA9IFt5dEFkZChzcGF3bi55dCwgeXREaWZmKHkxLCB5MCkpLCBzcGF3bi54dCArIHgxIC0geDAsIGRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKGJlc3RbMl0pKSB7XG4gICAgICAgICAgLy8gS2VlcCB0cmFjayBvZiBhbnkgTlBDcyB3ZSBhbHJlYWR5IG1vdmVkIHNvIHRoYXQgYW55dGhpbmcgdGhhdCdzXG4gICAgICAgICAgLy8gb24gdG9wIG9mIGl0IChpLmUuIGR1YWwgc3Bhd25zKSBtb3ZlIGFsb25nIHdpdGguXG4gICAgICAgICAgLy9pZiAoYmVzdFsyXSA+IDQpIG1hcC5wdXNoKFtzcGF3bi54dCwgc3Bhd24ueXQsIGJlc3RbMF0sIGJlc3RbMV0sIDRdKTtcbiAgICAgICAgICAvLyAtIFRPRE8gLSBJIGRvbid0IHRoaW5rIHdlIG5lZWQgdGhpcywgc2luY2UgYW55IGZ1dHVyZSBzcGF3biBzaG91bGRcbiAgICAgICAgICAvLyAgIGJlIHBsYWNlZCBieSB0aGUgc2FtZSBydWxlcy5cbiAgICAgICAgICBbc3Bhd24ueXQsIHNwYXduLnh0XSA9IGJlc3Q7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIFdhc24ndCBhYmxlIHRvIG1hcCBhbiBhcmVuYSBvciBleGl0LiAgUGljayBhIG5ldyBQT0ksIGJ1dCB0cmlnZ2VycyBhbmRcbiAgICAgIC8vIGJvc3NlcyBhcmUgaW5lbGlnaWJsZS5cbiAgICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSB8fCBzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBwbGFjZSAke2xvY30gJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBzcGF3bi5pc0Jvc3MoKSA/ICdCb3NzJyA6ICdUcmlnZ2VyJ30gJHtzcGF3bi5oZXgoKVxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4ke3RoaXMuc2hvdygpfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV4dCA9IGFsbFBvaS5zaGlmdCgpO1xuICAgICAgaWYgKCFuZXh0KSB0aHJvdyBuZXcgRXJyb3IoYFJhbiBvdXQgb2YgUE9JIGZvciAke2xvY31gKTtcbiAgICAgIGNvbnN0IFt5LCB4XSA9IG5leHQ7XG4gICAgICBtYXAucHVzaChbc3Bhd24ueSA+Pj4gNCwgc3Bhd24ueCA+Pj4gNCwgeSA+Pj4gNCwgeCA+Pj4gNCwgNF0pO1xuICAgICAgc3Bhd24ueSA9IHk7XG4gICAgICBzcGF3bi54ID0geDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBzZWFtbGVzcyBwYWlyIGxvY2F0aW9uLCBzeW5jIHVwIHRoZSBleGl0cy4gIEZvciBlYWNoIGV4aXQgb2ZcbiAgICogZWl0aGVyLCBjaGVjayBpZiBpdCdzIHN5bW1ldHJpYywgYW5kIGlmIHNvLCBjb3B5IGl0IG92ZXIgdG8gdGhlIG90aGVyIHNpZGUuXG4gICAqL1xuICByZWNvbmNpbGVFeGl0cyh0aGF0OiBNZXRhbG9jYXRpb24pIHtcbiAgICBjb25zdCBhZGQ6IFtNZXRhbG9jYXRpb24sIFBvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXVtdID0gW107XG4gICAgY29uc3QgZGVsOiBbTWV0YWxvY2F0aW9uLCBQb3MsIENvbm5lY3Rpb25UeXBlXVtdID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgW3RoaXMsIHRoYXRdKSB7XG4gICAgICBmb3IgKGNvbnN0IFtwb3MsIHR5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiBsb2MuX2V4aXRzKSB7XG4gICAgICAgIGlmIChkZXN0VHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0VGlsZSA+Pj4gOF07XG4gICAgICAgIGNvbnN0IHJldmVyc2UgPSBkZXN0Lm1ldGEuX2V4aXRzLmdldChkZXN0VGlsZSAmIDB4ZmYsIGRlc3RUeXBlKTtcbiAgICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgICBjb25zdCBbcmV2VGlsZSwgcmV2VHlwZV0gPSByZXZlcnNlO1xuICAgICAgICAgIGlmICgocmV2VGlsZSA+Pj4gOCkgPT09IGxvYy5pZCAmJiAocmV2VGlsZSAmIDB4ZmYpID09PSBwb3MgJiZcbiAgICAgICAgICAgICAgcmV2VHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgYWRkLnB1c2goW2xvYyA9PT0gdGhpcyA/IHRoYXQgOiB0aGlzLCBwb3MsIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgW2Rlc3RUaWxlLCBkZXN0VHlwZV1dKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkZWwucHVzaChbbG9jLCBwb3MsIHR5cGVdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGVdIG9mIGRlbCkge1xuICAgICAgbG9jLl9leGl0cy5kZWxldGUocG9zLCB0eXBlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbbG9jLCBwb3MsIHR5cGUsIGV4aXRdIG9mIGFkZCkge1xuICAgICAgbG9jLl9leGl0cy5zZXQocG9zLCB0eXBlLCBleGl0KTtcbiAgICB9XG4gICAgLy8gdGhpcy5fZXhpdHMgPSBuZXcgVGFibGUoZXhpdHMpO1xuICAgIC8vIHRoYXQuX2V4aXRzID0gbmV3IFRhYmxlKGV4aXRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTYXZlcyB0aGUgY3VycmVudCBzdGF0ZSBiYWNrIGludG8gdGhlIHVuZGVybHlpbmcgbG9jYXRpb24uXG4gICAqIEN1cnJlbnRseSB0aGlzIG9ubHkgZGVhbHMgd2l0aCBlbnRyYW5jZXMvZXhpdHMuXG4gICAqL1xuICB3cml0ZSgpIHtcbiAgICBjb25zdCBzcmNMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgLy9sZXQgc2VhbWxlc3NQYXJ0bmVyOiBMb2NhdGlvbnx1bmRlZmluZWQ7XG4gICAgY29uc3Qgc2VhbWxlc3NQb3MgPSBuZXcgU2V0PFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IFtzcmNQb3MsIHNyY1R5cGUsIFtkZXN0VGlsZSwgZGVzdFR5cGVdXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgY29uc3Qgc3JjU2NyZWVuID0gdGhpcy5fc2NyZWVuc1tzcmNQb3NdO1xuICAgICAgY29uc3QgZGVzdCA9IGRlc3RUaWxlID4+IDg7XG4gICAgICBsZXQgZGVzdFBvcyA9IGRlc3RUaWxlICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3RMb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF07XG4gICAgICBjb25zdCBkZXN0TWV0YSA9IGRlc3RMb2MubWV0YSE7XG4gICAgICBjb25zdCBkZXN0U2NyZWVuID0gZGVzdE1ldGEuX3NjcmVlbnNbZGVzdFRpbGUgJiAweGZmXTtcbiAgICAgIGNvbnN0IHNyY0V4aXQgPSBzcmNTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gc3JjVHlwZSk7XG4gICAgICBjb25zdCBkZXN0RXhpdCA9IGRlc3RTY3JlZW4uZGF0YS5leGl0cz8uZmluZChlID0+IGUudHlwZSA9PT0gZGVzdFR5cGUpO1xuICAgICAgaWYgKCFzcmNFeGl0IHx8ICFkZXN0RXhpdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgJHtzcmNFeGl0ID8gJ2Rlc3QnIDogJ3NvdXJjZSd9IGV4aXQ6XG4gIEZyb206ICR7c3JjTG9jfSBAICR7aGV4KHNyY1Bvcyl9OiR7c3JjVHlwZX0gJHtzcmNTY3JlZW4ubmFtZX1cbiAgVG86ICAgJHtkZXN0TG9jfSBAICR7aGV4KGRlc3RQb3MpfToke2Rlc3RUeXBlfSAke2Rlc3RTY3JlZW4ubmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIC8vIFNlZSBpZiB0aGUgZGVzdCBlbnRyYW5jZSBleGlzdHMgeWV0Li4uXG4gICAgICBsZXQgZW50cmFuY2UgPSAweDIwO1xuICAgICAgaWYgKGRlc3RFeGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICBzZWFtbGVzc1Bvcy5hZGQoc3JjUG9zKTtcbiAgICAgICAgLy9zZWFtbGVzc1BhcnRuZXIgPSBkZXN0TG9jO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGRlc3RDb29yZCA9IGRlc3RFeGl0LmVudHJhbmNlO1xuICAgICAgICBpZiAoZGVzdENvb3JkID4gMHhlZmZmKSB7IC8vIGhhbmRsZSBzcGVjaWFsIGNhc2UgaW4gT2FrXG4gICAgICAgICAgZGVzdFBvcyArPSAweDEwO1xuICAgICAgICAgIGRlc3RDb29yZCAtPSAweDEwMDAwO1xuICAgICAgICB9XG4gICAgICAgIGVudHJhbmNlID0gZGVzdExvYy5maW5kT3JBZGRFbnRyYW5jZShkZXN0UG9zLCBkZXN0Q29vcmQpO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgdGlsZSBvZiBzcmNFeGl0LmV4aXRzKSB7XG4gICAgICAgIGxldCBzY3JlZW4gPSBzcmNQb3M7XG4gICAgICAgIGlmICgodGlsZSAmIDB4ZjApID09PSAweGYwKSB7XG4gICAgICAgICAgc2NyZWVuICs9IDB4MTA7XG4gICAgICAgICAgdGlsZSAmPSAweGY7XG4gICAgICAgIH1cbiAgICAgICAgLy9pZiAoc3JjRXhpdC50eXBlID09PSAnZWRnZTpib3R0b20nICYmIHRoaXMuaGVpZ2h0ID09PSAxKSB0aWxlIC09IDB4MjA7XG4gICAgICAgIHNyY0xvYy5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbiwgdGlsZSwgZGVzdCwgZW50cmFuY2V9KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHNyY0xvYy53aWR0aCA9IHRoaXMuX3dpZHRoO1xuICAgIHNyY0xvYy5oZWlnaHQgPSB0aGlzLl9oZWlnaHQ7XG4gICAgc3JjTG9jLnNjcmVlbnMgPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX2hlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3c6IG51bWJlcltdID0gW107XG4gICAgICBzcmNMb2Muc2NyZWVucy5wdXNoKHJvdyk7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX3dpZHRoOyB4KyspIHtcbiAgICAgICAgcm93LnB1c2godGhpcy5fc2NyZWVuc1t5IDw8IDQgfCB4XS5zaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBzcmNMb2MudGlsZXNldCA9IHRoaXMudGlsZXNldC50aWxlc2V0SWQ7XG4gICAgc3JjTG9jLnRpbGVFZmZlY3RzID0gdGhpcy50aWxlc2V0LmVmZmVjdHMoKS5pZDtcblxuICAgIC8vIGZpbmQgcmVhY2hhYmxlIHBvcyBmcm9tIGFueSBleGl0XG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPFBvcz4oKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLmFsbFBvcygpKSB7XG4gICAgICBpZiAoc2VhbWxlc3NQb3MuaGFzKHBvcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1twb3NdO1xuICAgICAgY29uc3QgYmVsb3cgPSBwb3MgKyAxNjtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gcG9zICsgMTtcbiAgICAgIGlmICghc2VhbWxlc3NQb3MuaGFzKGJlbG93KSAmJiAoc2NyLmRhdGEuZWRnZXM/LlsyXSA/PyAnICcpICE9PSAnICcpIHtcbiAgICAgICAgdWYudW5pb24oW3BvcywgYmVsb3ddKTtcbiAgICAgIH1cbiAgICAgIGlmICghc2VhbWxlc3NQb3MuaGFzKHJpZ2h0KSAmJiAoc2NyLmRhdGEuZWRnZXM/LlszXSA/PyAnICcpICE9PSAnICcpIHtcbiAgICAgICAgdWYudW5pb24oW3BvcywgcmlnaHRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcmVhY2hhYmxlTWFwID0gdWYubWFwKCk7XG4gICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxQb3M+KCk7XG4gICAgZm9yIChjb25zdCBbc3JjUG9zXSBvZiB0aGlzLl9leGl0cykge1xuICAgICAgZm9yIChjb25zdCBwb3Mgb2YgcmVhY2hhYmxlTWFwLmdldChzcmNQb3MpID8/IFtdKSB7XG4gICAgICAgIHJlYWNoYWJsZS5hZGQocG9zKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSBmbGFnc1xuICAgIHNyY0xvYy5mbGFncyA9IFtdO1xuICAgIGNvbnN0IGZyZWVGbGFncyA9IFsuLi50aGlzLmZyZWVGbGFnc107XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5fc2NyZWVuc1tzY3JlZW5dO1xuICAgICAgbGV0IGZsYWc6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgICBpZiAoc2NyLmRhdGEud2FsbCAhPSBudWxsICYmIHJlYWNoYWJsZS5oYXMoc2NyZWVuKSkge1xuICAgICAgICAvLyAhc2VhbWxlc3NQYXJ0bmVyKSB7XG4gICAgICAgIGZsYWcgPSBmcmVlRmxhZ3MucG9wKCk/LmlkID8/IHRoaXMucm9tLmZsYWdzLmFsbG9jKDB4MjAwKTtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdhbHdheXMnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkO1xuICAgICAgfSBlbHNlIGlmIChzY3IuZmxhZyA9PT0gJ2NhbG0nKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLnJvbS5mbGFncy5DYWxtZWRBbmdyeVNlYS5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206ZmFsc2UnKSB7XG4gICAgICAgIGZsYWcgPSB0aGlzLmN1c3RvbUZsYWdzLmdldChzY3JlZW4pPy5pZDtcbiAgICAgIH0gZWxzZSBpZiAoc2NyLmZsYWcgPT09ICdjdXN0b206dHJ1ZScpIHtcbiAgICAgICAgZmxhZyA9IHRoaXMuY3VzdG9tRmxhZ3MuZ2V0KHNjcmVlbik/LmlkID8/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQ7XG4gICAgICB9XG4gICAgICBpZiAoZmxhZyAhPSBudWxsKSB7XG4gICAgICAgIHNyY0xvYy5mbGFncy5wdXNoKExvY2F0aW9uRmxhZy5vZih7c2NyZWVuLCBmbGFnfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdyaXRlIHBpdHNcbiAgICBzcmNMb2MucGl0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2Zyb21TY3JlZW4sIHRvXSBvZiB0aGlzLl9waXRzKSB7XG4gICAgICBjb25zdCB0b1NjcmVlbiA9IHRvICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3QgPSB0byA+Pj4gODtcbiAgICAgIHNyY0xvYy5waXRzLnB1c2goUGl0Lm9mKHtmcm9tU2NyZWVuLCB0b1NjcmVlbiwgZGVzdH0pKTtcbiAgICB9XG4gIH1cblxuICAvLyBOT1RFOiB0aGlzIGNhbiBvbmx5IGJlIGRvbmUgQUZURVIgY29weWluZyB0byB0aGUgbG9jYXRpb24hXG4gIHJlcGxhY2VNb25zdGVycyhyYW5kb206IFJhbmRvbSkge1xuICAgIGlmICh0aGlzLmlkID09PSAweDY4KSByZXR1cm47IC8vIHdhdGVyIGxldmVscywgZG9uJ3QgcGxhY2Ugb24gbGFuZD8/P1xuICAgIC8vIE1vdmUgYWxsIHRoZSBtb25zdGVycyB0byByZWFzb25hYmxlIGxvY2F0aW9ucy5cbiAgICBjb25zdCBsb2MgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5pZF07XG4gICAgY29uc3QgcGxhY2VyID0gbG9jLm1vbnN0ZXJQbGFjZXIocmFuZG9tKTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghc3Bhd24udXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXNwYXduLmlzTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG1vbnN0ZXIgPSBsb2Mucm9tLm9iamVjdHNbc3Bhd24ubW9uc3RlcklkXTtcbiAgICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkgY29udGludWU7XG4gICAgICBpZiAobW9uc3Rlci5pc1VudG91Y2hlZE1vbnN0ZXIoKSkgY29udGludWU7XG4gICAgICBjb25zdCBwb3MgPSBwbGFjZXIobW9uc3Rlcik7XG4gICAgICBpZiAocG9zID09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgbm8gdmFsaWQgbG9jYXRpb24gZm9yICR7aGV4KG1vbnN0ZXIuaWQpfSBpbiAke2xvY31gKTtcbiAgICAgICAgc3Bhd24udXNlZCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zID4+PiA4O1xuICAgICAgICBzcGF3bi50aWxlID0gcG9zICYgMHhmZjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRyYXZlcnNlT3B0cyB7XG4gIC8vIERvIG5vdCBwYXNzIGNlcnRhaW4gdGlsZXMgaW4gdHJhdmVyc2VcbiAgcmVhZG9ubHkgd2l0aD86IFJlYWRvbmx5TWFwPFBvcywgTWV0YXNjcmVlbj47XG4gIC8vIFdoZXRoZXIgdG8gYnJlYWsgd2FsbHMvZm9ybSBicmlkZ2VzXG4gIHJlYWRvbmx5IG5vRmxhZ2dlZD86IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdG8gYXNzdW1lIGZsaWdodFxuICByZWFkb25seSBmbGlnaHQ/OiBib29sZWFuO1xufVxuXG5cbmNvbnN0IHVua25vd25FeGl0V2hpdGVsaXN0ID0gbmV3IFNldChbXG4gIDB4MDEwMDNhLCAvLyB0b3AgcGFydCBvZiBjYXZlIG91dHNpZGUgc3RhcnRcbiAgMHgwMTAwM2IsXG4gIDB4MTU0MGEwLCAvLyBcIiBcIiBzZWFtbGVzcyBlcXVpdmFsZW50IFwiIFwiXG4gIDB4MWEzMDYwLCAvLyBzd2FtcCBleGl0XG4gIDB4NDAyMDAwLCAvLyBicmlkZ2UgdG8gZmlzaGVybWFuIGlzbGFuZFxuICAweDQwMjAzMCxcbiAgMHg0MTgwZDAsIC8vIGJlbG93IGV4aXQgdG8gbGltZSB0cmVlIHZhbGxleVxuICAweDYwODdiZiwgLy8gYmVsb3cgYm9hdCBjaGFubmVsXG4gIDB4YTEwMzI2LCAvLyBjcnlwdCAyIGFyZW5hIG5vcnRoIGVkZ2VcbiAgMHhhMTAzMjksXG4gIDB4YTkwNjI2LCAvLyBzdGFpcnMgYWJvdmUga2VsYnkgMlxuICAweGE5MDYyOSxcbl0pO1xuXG4vL2NvbnN0IERQT1MgPSBbLTE2LCAtMSwgMTYsIDFdO1xuY29uc3QgRElSX05BTUUgPSBbJ2Fib3ZlJywgJ2xlZnQgb2YnLCAnYmVsb3cnLCAncmlnaHQgb2YnXTtcblxudHlwZSBPcHRpb25hbDxUPiA9IFR8bnVsbHx1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGRpc3RhbmNlKGE6IFBvcywgYjogUG9zKTogbnVtYmVyIHtcbiAgcmV0dXJuICgoYSA+Pj4gNCkgLSAoYiA+Pj4gNCkpICoqIDIgKyAoKGEgJiAweGYpIC0gKGIgJiAweGYpKSAqKiAyO1xufVxuXG5mdW5jdGlvbiBhZGREZWx0YShzdGFydDogUG9zLCBwbHVzOiBQb3MsIG1pbnVzOiBQb3MsIG1ldGE6IE1ldGFsb2NhdGlvbik6IFBvcyB7XG4gIGNvbnN0IHB4ID0gcGx1cyAmIDB4ZjtcbiAgY29uc3QgcHkgPSBwbHVzID4+PiA0O1xuICBjb25zdCBteCA9IG1pbnVzICYgMHhmO1xuICBjb25zdCBteSA9IG1pbnVzID4+PiA0O1xuICBjb25zdCBzeCA9IHN0YXJ0ICYgMHhmO1xuICBjb25zdCBzeSA9IHN0YXJ0ID4+PiA0O1xuICBjb25zdCBveCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1ldGEud2lkdGggLSAxLCBzeCArIHB4IC0gbXgpKTtcbiAgY29uc3Qgb3kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtZXRhLmhlaWdodCAtIDEsIHN5ICsgcHkgLSBteSkpO1xuICByZXR1cm4gb3kgPDwgNCB8IG94O1xufVxuXG4vLyBiaXQgMSA9IGNydW1ibGluZywgYml0IDAgPSBob3Jpem9udGFsOiBbdiwgaCwgY3YsIGNoXVxuY29uc3QgUExBVEZPUk1TOiByZWFkb25seSBudW1iZXJbXSA9IFsweDdlLCAweDdmLCAweDlmLCAweDhkXTtcbiJdfQ==