import { Entity } from './entity.js';
import { DataTuple, concatIterables, group, hex, readLittleEndian, seq, tuple, varSlice, writeLittleEndian } from './util.js';
import { UnionFind } from '../unionfind.js';
import { iters, assertNever, DefaultMap } from '../util.js';
export class Location extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.mapDataPointer = 0x14300 + (id << 1);
        this.mapDataBase = readLittleEndian(rom.prg, this.mapDataPointer) + 0xc000;
        this.name = locationNames[this.id] || '';
        this.key = locationKeys[this.id] || '';
        this.used = this.mapDataBase > 0xc000 && !!this.name;
        this.layoutBase = readLittleEndian(rom.prg, this.mapDataBase) + 0xc000;
        this.graphicsBase = readLittleEndian(rom.prg, this.mapDataBase + 2) + 0xc000;
        this.entrancesBase = readLittleEndian(rom.prg, this.mapDataBase + 4) + 0xc000;
        this.exitsBase = readLittleEndian(rom.prg, this.mapDataBase + 6) + 0xc000;
        this.flagsBase = readLittleEndian(rom.prg, this.mapDataBase + 8) + 0xc000;
        let hasPits = this.layoutBase !== this.mapDataBase + 10;
        let entranceLen = this.exitsBase - this.entrancesBase;
        this.exits = (() => {
            const exits = [];
            let i = this.exitsBase;
            while (!(rom.prg[i] & 0x80)) {
                exits.push(new Exit(rom.prg.slice(i, i + 4)));
                i += 4;
            }
            if (rom.prg[i] !== 0xff) {
                hasPits = !!(rom.prg[i] & 0x40);
                entranceLen = (rom.prg[i] & 0x1f) << 2;
            }
            return exits;
        })();
        this.pitsBase = !hasPits ? 0 :
            readLittleEndian(rom.prg, this.mapDataBase + 10) + 0xc000;
        this.bgm = rom.prg[this.layoutBase];
        this.layoutWidth = rom.prg[this.layoutBase + 1];
        this.layoutHeight = rom.prg[this.layoutBase + 2];
        this.animation = rom.prg[this.layoutBase + 3];
        this.extended = rom.prg[this.layoutBase + 4];
        this.screens = seq(this.height, y => tuple(rom.prg, this.layoutBase + 5 + y * this.width, this.width));
        this.tilePalettes = tuple(rom.prg, this.graphicsBase, 3);
        this.tileset = rom.prg[this.graphicsBase + 3];
        this.tileEffects = rom.prg[this.graphicsBase + 4];
        this.tilePatterns = tuple(rom.prg, this.graphicsBase + 5, 2);
        this.entrances =
            group(4, rom.prg.slice(this.entrancesBase, this.entrancesBase + entranceLen), x => new Entrance(x));
        this.flags = varSlice(rom.prg, this.flagsBase, 2, 0xff, Infinity, x => new Flag(x));
        this.pits = this.pitsBase ? varSlice(rom.prg, this.pitsBase, 4, 0xff, Infinity, x => new Pit(x)) : [];
        this.npcDataPointer = 0x19201 + (id << 1);
        this.npcDataBase = readLittleEndian(rom.prg, this.npcDataPointer) + 0x10000;
        this.hasSpawns = this.npcDataBase !== 0x10000;
        this.spritePalettes =
            this.hasSpawns ? tuple(rom.prg, this.npcDataBase + 1, 2) : [0, 0];
        this.spritePatterns =
            this.hasSpawns ? tuple(rom.prg, this.npcDataBase + 3, 2) : [0, 0];
        this.spawns =
            this.hasSpawns ? varSlice(rom.prg, this.npcDataBase + 5, 4, 0xff, Infinity, x => new Spawn(x)) : [];
    }
    spawn(id) {
        const spawn = this.spawns[id - 0xd];
        if (!spawn)
            throw new Error(`Expected spawn $${hex(id)}`);
        return spawn;
    }
    get width() { return this.layoutWidth + 1; }
    set width(width) { this.layoutWidth = width - 1; }
    get height() { return this.layoutHeight + 1; }
    set height(height) { this.layoutHeight = height - 1; }
    async write(writer) {
        if (!this.used)
            return;
        const promises = [];
        if (this.hasSpawns) {
            const data = [0, ...this.spritePalettes, ...this.spritePatterns,
                ...concatIterables(this.spawns), 0xff];
            promises.push(writer.write(data, 0x18000, 0x1bfff, `NpcData ${hex(this.id)}`)
                .then(address => writeLittleEndian(writer.rom, this.npcDataPointer, address - 0x10000)));
        }
        const write = (data, name) => writer.write(data, 0x14000, 0x17fff, `${name} ${hex(this.id)}`);
        const layout = [
            this.bgm,
            this.layoutWidth, this.layoutHeight, this.animation, this.extended,
            ...concatIterables(this.screens)
        ];
        const graphics = [...this.tilePalettes,
            this.tileset, this.tileEffects,
            ...this.tilePatterns];
        if (this.height === 1) {
            for (const entrance of this.entrances) {
                if (entrance.y > 0xbf)
                    entrance.y = 0xbf;
            }
            for (const exit of this.exits) {
                if (exit.yt > 0x0c)
                    exit.yt = 0x0c;
            }
        }
        const entrances = concatIterables(this.entrances);
        const exits = [...concatIterables(this.exits),
            0x80 | (this.pits.length ? 0x40 : 0) | this.entrances.length,
        ];
        const flags = [...concatIterables(this.flags), 0xff];
        const pits = concatIterables(this.pits);
        const [layoutAddr, graphicsAddr, entrancesAddr, exitsAddr, flagsAddr, pitsAddr] = await Promise.all([
            write(layout, 'Layout'),
            write(graphics, 'Graphics'),
            write(entrances, 'Entrances'),
            write(exits, 'Exits'),
            write(flags, 'Flags'),
            ...(pits.length ? [write(pits, 'Pits')] : []),
        ]);
        const addresses = [
            layoutAddr & 0xff, (layoutAddr >>> 8) - 0xc0,
            graphicsAddr & 0xff, (graphicsAddr >>> 8) - 0xc0,
            entrancesAddr & 0xff, (entrancesAddr >>> 8) - 0xc0,
            exitsAddr & 0xff, (exitsAddr >>> 8) - 0xc0,
            flagsAddr & 0xff, (flagsAddr >>> 8) - 0xc0,
            ...(pitsAddr ? [pitsAddr & 0xff, (pitsAddr >> 8) - 0xc0] : []),
        ];
        const base = await write(addresses, 'MapData');
        writeLittleEndian(writer.rom, this.mapDataPointer, base - 0xc000);
        await Promise.all(promises);
        const bossId = this.bossId();
        if (bossId != null && this.id !== 0x5f) {
            let pats = [this.spritePatterns[0], undefined];
            if (this.id === 0xa6)
                pats = [0x53, 0x50];
            const bossBase = readLittleEndian(writer.rom, 0x1f96b + 2 * bossId) + 0x14000;
            const bossRestore = [
                ,
                , , this.bgm, ,
                ...this.tilePalettes, , , , this.spritePalettes[0], ,
                ,
                , , , , ,
                this.animation,
            ];
            const [] = [pats];
            for (let j = 0; j < bossRestore.length; j++) {
                const restored = bossRestore[j];
                if (restored == null)
                    continue;
                writer.rom[bossBase + j] = restored;
            }
            const bossBase2 = 0x1f7c1 + 5 * bossId;
            writer.rom[bossBase2] = this.spritePalettes[1];
        }
    }
    allScreens() {
        const screens = new Set();
        const ext = this.extended ? 0x100 : 0;
        for (const row of this.screens) {
            for (const screen of row) {
                screens.add(this.rom.screens[screen + ext]);
            }
        }
        return screens;
    }
    bossId() {
        for (let i = 0; i < 0x0e; i++) {
            if (this.rom.prg[0x1f95d + i] === this.id)
                return i;
        }
        return undefined;
    }
    neighbors(joinNexuses = false) {
        const out = new Set();
        const addNeighbors = (l) => {
            for (const exit of l.exits) {
                const id = exit.dest;
                const neighbor = this.rom.locations[id];
                if (neighbor && neighbor.used &&
                    neighbor !== this && !out.has(neighbor)) {
                    out.add(neighbor);
                    if (joinNexuses && NEXUSES[neighbor.key]) {
                        addNeighbors(neighbor);
                    }
                }
            }
        };
        addNeighbors(this);
        return out;
    }
    hasDolphin() {
        return this.id === 0x60 || this.id === 0x64 || this.id === 0x68;
    }
    reachableTiles(fly = false) {
        if (this.hasDolphin())
            fly = true;
        const exits = new Set(this.exits.map(exit => exit.screen << 8 | exit.tile));
        const uf = new UnionFind();
        const tileset = this.rom.tileset(this.tileset);
        const tileEffects = this.rom.tileEffects[this.tileEffects - 0xb3];
        const passable = new Set();
        for (let y = 0; y < this.height; y++) {
            const row = this.screens[y];
            for (let x = 0; x < this.width; x++) {
                const screen = this.rom.screens[row[x] | (this.extended ? 0x100 : 0)];
                const pos = y << 4 | x;
                const flag = this.flags.find(f => f.screen === pos);
                for (let t = 0; t < 0xf0; t++) {
                    const tileId = pos << 8 | t;
                    if (exits.has(tileId))
                        continue;
                    let tile = screen.tiles[t];
                    let effects = tileEffects.effects[tile];
                    let blocked = fly ? effects & 0x04 : effects & 0x06;
                    if (flag && blocked && tile < 0x20 && tileset.alternates[tile] != tile) {
                        tile = tileset.alternates[tile];
                        effects = tileEffects.effects[tile];
                        blocked = fly ? effects & 0x04 : effects & 0x06;
                    }
                    if (!blocked)
                        passable.add(tileId);
                }
            }
        }
        for (let t of passable) {
            const right = (t & 0x0f) === 0x0f ? t + 0xf1 : t + 1;
            if (passable.has(right))
                uf.union([t, right]);
            const below = (t & 0xf0) === 0xe0 ? t + 0xf20 : t + 16;
            if (passable.has(below))
                uf.union([t, below]);
        }
        const map = uf.map();
        const sets = new Set();
        for (const entrance of this.entrances) {
            const id = entrance.screen << 8 | entrance.tile;
            sets.add(map.get(id) || new Set());
        }
        const out = new Map();
        for (const set of sets) {
            for (const t of set) {
                const scr = this.screens[t >>> 12][(t >>> 8) & 0x0f];
                const screen = this.rom.screens[scr | (this.extended ? 0x100 : 0)];
                out.set(t, tileEffects.effects[screen.tiles[t & 0xff]]);
            }
        }
        return out;
    }
    screenMover() {
        const map = new DefaultMap(() => []);
        const objs = iters.concat(this.spawns, this.exits, this.entrances);
        for (const obj of objs) {
            map.get(obj.screen).push(obj);
        }
        return (orig, repl) => {
            for (const obj of map.get(orig)) {
                obj.screen = repl;
            }
        };
    }
    moveScreen(orig, repl) {
        const objs = iters.concat(this.spawns, this.exits, this.entrances);
        for (const obj of objs) {
            if (obj.screen === orig)
                obj.screen = repl;
        }
    }
    monsterPlacer(random) {
        const boss = BOSS_SCREENS[this.key];
        const reachable = this.reachableTiles(false);
        const extended = new Map([...reachable.keys()].map(x => [x, 0]));
        const normal = [];
        const moths = [];
        const birds = [];
        const plants = [];
        const placed = [];
        const normalTerrainMask = this.hasDolphin() ? 0x25 : 0x27;
        for (const [t, distance] of extended) {
            const scr = this.screens[t >>> 12][(t >>> 8) & 0xf];
            if (scr === boss)
                continue;
            for (const n of neighbors(t, this.width, this.height)) {
                if (extended.has(n))
                    continue;
                extended.set(n, distance + 1);
            }
            if (!distance && !(reachable.get(t) & normalTerrainMask))
                normal.push(t);
            if (this.id === 0x1a) {
                if (this.rom.screens[scr].tiles[t & 0xff] === 0xf0)
                    plants.push(t);
            }
            else {
                if (distance >= 2 && distance <= 4)
                    plants.push(t);
            }
            if (distance >= 3 && distance <= 7)
                moths.push(t);
            if (distance >= 12)
                birds.push(t);
        }
        return (m) => {
            const placement = m.placement();
            const pool = [...(placement === 'normal' ? normal :
                    placement === 'moth' ? moths :
                        placement === 'bird' ? birds :
                            placement === 'plant' ? plants :
                                assertNever(placement))];
            POOL: while (pool.length) {
                const i = random.nextInt(pool.length);
                const [pos] = pool.splice(i, 1);
                const x = (pos & 0xf00) >>> 4 | (pos & 0xf);
                const y = (pos & 0xf000) >>> 8 | (pos & 0xf0) >>> 4;
                const r = m.clearance();
                for (const [, x1, y1, r1] of placed) {
                    const z2 = ((y - y1) ** 2 + (x - x1) ** 2);
                    if (z2 < (r + r1) ** 2)
                        continue POOL;
                }
                for (const { x: x1, y: y1 } of this.entrances) {
                    const z2 = ((y - (y1 >> 4)) ** 2 + (x - (x1 >> 4)) ** 2);
                    if (z2 < (r + 1) ** 2)
                        continue POOL;
                }
                placed.push([m, x, y, r]);
                const scr = (y & 0xf0) | (x & 0xf0) >>> 4;
                const tile = (y & 0x0f) << 4 | (x & 0x0f);
                return scr << 8 | tile;
            }
            return undefined;
        };
    }
}
function neighbors(tile, width, height) {
    const out = [];
    const y = tile & 0xf0f0;
    const x = tile & 0x0f0f;
    if (y < ((height - 1) << 12 | 0xe0)) {
        out.push((tile & 0xf0) === 0xe0 ? tile + 0x0f20 : tile + 16);
    }
    if (y) {
        out.push((tile & 0xf0) === 0x00 ? tile - 0x0f20 : tile - 16);
    }
    if (x < ((width - 1) << 8 | 0x0f)) {
        out.push((tile & 0x0f) === 0x0f ? tile + 0x00f1 : tile + 1);
    }
    if (x) {
        out.push((tile & 0x0f) === 0x00 ? tile - 0x00f1 : tile - 1);
    }
    return out;
}
export const Entrance = DataTuple.make(4, {
    x: DataTuple.prop([0], [1, 0xff, -8]),
    y: DataTuple.prop([2], [3, 0xff, -8]),
    screen: DataTuple.prop([3, 0x0f, -4], [1, 0x0f]),
    tile: DataTuple.prop([2, 0xf0], [0, 0xf0, 4]),
    coord: DataTuple.prop([2, 0xff, -8], [0, 0xff]),
    toString() {
        return `Entrance ${this.hex()}: (${hex(this.x)}, ${hex(this.y)})`;
    },
});
export const Exit = DataTuple.make(4, {
    x: DataTuple.prop([0, 0xff, -4]),
    xt: DataTuple.prop([0]),
    y: DataTuple.prop([1, 0xff, -4]),
    yt: DataTuple.prop([1]),
    screen: DataTuple.prop([1, 0xf0], [0, 0xf0, 4]),
    tile: DataTuple.prop([1, 0x0f, -4], [0, 0x0f]),
    dest: DataTuple.prop([2]),
    entrance: DataTuple.prop([3]),
    toString() {
        return `Exit ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) => ${this.dest}:${this.entrance}`;
    },
});
export const Flag = DataTuple.make(2, {
    flag: {
        get() { return this.data[0] | 0x200; },
        set(f) {
            if ((f & ~0xff) !== 0x200)
                throw new Error(`bad flag: ${hex(f)}`);
            this.data[0] = f & 0xff;
        },
    },
    x: DataTuple.prop([1, 0x07, -8]),
    xs: DataTuple.prop([1, 0x07]),
    y: DataTuple.prop([1, 0xf0, -4]),
    ys: DataTuple.prop([1, 0xf0, 4]),
    yx: DataTuple.prop([1]),
    screen: DataTuple.prop([1]),
    toString() {
        return `Flag ${this.hex()}: (${hex(this.xs)}, ${hex(this.ys)}) @ ${hex(this.flag)}`;
    },
});
export const Pit = DataTuple.make(4, {
    fromXs: DataTuple.prop([1, 0x70, 4]),
    toXs: DataTuple.prop([1, 0x07]),
    fromYs: DataTuple.prop([3, 0xf0, 4]),
    toYs: DataTuple.prop([3, 0x0f]),
    dest: DataTuple.prop([0]),
    toString() {
        return `Pit ${this.hex()}: (${hex(this.fromXs)}, ${hex(this.fromYs)}) => ${hex(this.dest)}:(${hex(this.toXs)}, ${hex(this.toYs)})`;
    },
});
export const Spawn = DataTuple.make(4, {
    y: DataTuple.prop([0, 0xff, -4]),
    yt: DataTuple.prop([0]),
    timed: DataTuple.booleanProp([1, 0x80, 7]),
    x: DataTuple.prop([1, 0x7f, -4], [2, 0x40, 3]),
    xt: DataTuple.prop([1, 0x7f]),
    screen: DataTuple.prop([0, 0xf0], [1, 0x70, 4]),
    tile: DataTuple.prop([0, 0x0f, -4], [1, 0x0f]),
    patternBank: DataTuple.prop([2, 0x80, 7]),
    type: DataTuple.prop([2, 0x07]),
    id: DataTuple.prop([3]),
    used: { get() { return this.data[0] !== 0xfe; },
        set(used) { this.data[0] = used ? 0 : 0xfe; } },
    monsterId: { get() { return (this.id + 0x50) & 0xff; },
        set(id) { this.id = (id - 0x50) & 0xff; } },
    isChest() { return this.type === 2 && this.id < 0x80; },
    isInvisible() {
        return this.isChest() && Boolean(this.data[2] & 0x20);
    },
    isTrigger() { return this.type === 2 && this.id >= 0x80; },
    isNpc() { return this.type === 1 && this.id < 0xc0; },
    isBoss() { return this.type === 1 && this.id >= 0xc0; },
    isMonster() { return this.type === 0; },
    isWall() {
        return Boolean(this.type === 3 && (this.id < 4 || (this.data[2] & 0x20)));
    },
    wallType() {
        if (this.type !== 3)
            return '';
        const obj = this.data[2] & 0x20 ? this.id >>> 4 : this.id;
        if (obj >= 4)
            return '';
        return obj === 2 ? 'bridge' : 'wall';
    },
    wallElement() {
        if (!this.isWall())
            return -1;
        return this.id & 3;
    },
    toString() {
        return `Spawn ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) ${this.timed ? 'timed' : 'fixed'} ${this.type}:${hex(this.id)}`;
    },
});
export const LOCATIONS = {
    mezameShrine: [0x00, 'Mezame Shrine'],
    leafOutsideStart: [0x01, 'Leaf - Outside Start'],
    leaf: [0x02, 'Leaf'],
    valleyOfWind: [0x03, 'Valley of Wind'],
    sealedCave1: [0x04, 'Sealed Cave 1'],
    sealedCave2: [0x05, 'Sealed Cave 2'],
    sealedCave6: [0x06, 'Sealed Cave 6'],
    sealedCave4: [0x07, 'Sealed Cave 4'],
    sealedCave5: [0x08, 'Sealed Cave 5'],
    sealedCave3: [0x09, 'Sealed Cave 3'],
    sealedCave7: [0x0a, 'Sealed Cave 7'],
    sealedCave8: [0x0c, 'Sealed Cave 8'],
    windmillCave: [0x0e, 'Windmill Cave'],
    windmill: [0x0f, 'Windmill'],
    zebuCave: [0x10, 'Zebu Cave'],
    mtSabreWestCave1: [0x11, 'Mt Sabre West - Cave 1'],
    cordelPlainsWest: [0x14, 'Cordel Plains West'],
    cordelPlainsEast: [0x15, 'Cordel Plains East'],
    brynmaer: [0x18, 'Brynmaer'],
    outsideStomHouse: [0x19, 'Outside Stom House'],
    swamp: [0x1a, 'Swamp'],
    amazones: [0x1b, 'Amazones'],
    oak: [0x1c, 'Oak'],
    stomHouse: [0x1e, 'Stom House'],
    mtSabreWestLower: [0x20, 'Mt Sabre West - Lower'],
    mtSabreWestUpper: [0x21, 'Mt Sabre West - Upper'],
    mtSabreWestCave2: [0x22, 'Mt Sabre West - Cave 2'],
    mtSabreWestCave3: [0x23, 'Mt Sabre West - Cave 3'],
    mtSabreWestCave4: [0x24, 'Mt Sabre West - Cave 4'],
    mtSabreWestCave5: [0x25, 'Mt Sabre West - Cave 5'],
    mtSabreWestCave6: [0x26, 'Mt Sabre West - Cave 6'],
    mtSabreWestCave7: [0x27, 'Mt Sabre West - Cave 7'],
    mtSabreNorthMain: [0x28, 'Mt Sabre North - Main'],
    mtSabreNorthMiddle: [0x29, 'Mt Sabre North - Middle'],
    mtSabreNorthCave2: [0x2a, 'Mt Sabre North - Cave 2'],
    mtSabreNorthCave3: [0x2b, 'Mt Sabre North - Cave 3'],
    mtSabreNorthCave4: [0x2c, 'Mt Sabre North - Cave 4'],
    mtSabreNorthCave5: [0x2d, 'Mt Sabre North - Cave 5'],
    mtSabreNorthCave6: [0x2e, 'Mt Sabre North - Cave 6'],
    mtSabreNorthPrisonHall: [0x2f, 'Mt Sabre North - Prison Hall'],
    mtSabreNorthLeftCell: [0x30, 'Mt Sabre North - Left Cell'],
    mtSabreNorthLeftCell2: [0x31, 'Mt Sabre North - Left Cell 2'],
    mtSabreNorthRightCell: [0x32, 'Mt Sabre North - Right Cell'],
    mtSabreNorthCave8: [0x33, 'Mt Sabre North - Cave 8'],
    mtSabreNorthCave9: [0x34, 'Mt Sabre North - Cave 9'],
    mtSabreNorthSummitCave: [0x35, 'Mt Sabre North - Summit Cave'],
    mtSabreNorthCave1: [0x38, 'Mt Sabre North - Cave 1'],
    mtSabreNorthCave7: [0x39, 'Mt Sabre North - Cave 7'],
    nadareInn: [0x3c, 'Nadare - Inn'],
    nadareToolShop: [0x3d, 'Nadare - Tool Shop'],
    nadareBackRoom: [0x3e, 'Nadare - Back Room'],
    waterfallValleyNorth: [0x40, 'Waterfall Valley North'],
    waterfallValleySouth: [0x41, 'Waterfall Valley South'],
    limeTreeValley: [0x42, 'Lime Tree Valley'],
    limeTreeLake: [0x43, 'Lime Tree Lake'],
    kirisaPlantCave1: [0x44, 'Kirisa Plant Cave 1'],
    kirisaPlantCave2: [0x45, 'Kirisa Plant Cave 2'],
    kirisaPlantCave3: [0x46, 'Kirisa Plant Cave 3'],
    kirisaMeadow: [0x47, 'Kirisa Meadow'],
    fogLampCave1: [0x48, 'Fog Lamp Cave 1'],
    fogLampCave2: [0x49, 'Fog Lamp Cave 2'],
    fogLampCave3: [0x4a, 'Fog Lamp Cave 3'],
    fogLampCaveDeadEnd: [0x4b, 'Fog Lamp Cave Dead End'],
    fogLampCave4: [0x4c, 'Fog Lamp Cave 4'],
    fogLampCave5: [0x4d, 'Fog Lamp Cave 5'],
    fogLampCave6: [0x4e, 'Fog Lamp Cave 6'],
    fogLampCave7: [0x4f, 'Fog Lamp Cave 7'],
    portoa: [0x50, 'Portoa'],
    portoaFishermanIsland: [0x51, 'Portoa - Fisherman Island'],
    mesiaShrine: [0x52, 'Mesia Shrine'],
    waterfallCave1: [0x54, 'Waterfall Cave 1'],
    waterfallCave2: [0x55, 'Waterfall Cave 2'],
    waterfallCave3: [0x56, 'Waterfall Cave 3'],
    waterfallCave4: [0x57, 'Waterfall Cave 4'],
    towerEntrance: [0x58, 'Tower - Entrance'],
    tower1: [0x59, 'Tower 1'],
    tower2: [0x5a, 'Tower 2'],
    tower3: [0x5b, 'Tower 3'],
    towerOutsideMesia: [0x5c, 'Tower - Outside Mesia'],
    towerOutsideDyna: [0x5d, 'Tower - Outside Dyna'],
    towerMesia: [0x5e, 'Tower - Mesia'],
    towerDyna: [0x5f, 'Tower - Dyna'],
    angrySea: [0x60, 'Angry Sea'],
    boatHouse: [0x61, 'Boat House'],
    joelLighthouse: [0x62, 'Joel - Lighthouse'],
    undergroundChannel: [0x64, 'Underground Channel'],
    zombieTown: [0x65, 'Zombie Town'],
    evilSpiritIsland1: [0x68, 'Evil Spirit Island 1'],
    evilSpiritIsland2: [0x69, 'Evil Spirit Island 2'],
    evilSpiritIsland3: [0x6a, 'Evil Spirit Island 3'],
    evilSpiritIsland4: [0x6b, 'Evil Spirit Island 4'],
    saberaPalace1: [0x6c, 'Sabera Palace 1'],
    saberaPalace2: [0x6d, 'Sabera Palace 2'],
    saberaPalace3: [0x6e, 'Sabera Palace 3'],
    joelSecretPassage: [0x70, 'Joel - Secret Passage'],
    joel: [0x71, 'Joel'],
    swan: [0x72, 'Swan'],
    swanGate: [0x73, 'Swan - Gate'],
    goaValley: [0x78, 'Goa Valley'],
    mtHydra: [0x7c, 'Mt Hydra'],
    mtHydraCave1: [0x7d, 'Mt Hydra - Cave 1'],
    mtHydraOutsideShyron: [0x7e, 'Mt Hydra - Outside Shyron'],
    mtHydraCave2: [0x7f, 'Mt Hydra - Cave 2'],
    mtHydraCave3: [0x80, 'Mt Hydra - Cave 3'],
    mtHydraCave4: [0x81, 'Mt Hydra - Cave 4'],
    mtHydraCave5: [0x82, 'Mt Hydra - Cave 5'],
    mtHydraCave6: [0x83, 'Mt Hydra - Cave 6'],
    mtHydraCave7: [0x84, 'Mt Hydra - Cave 7'],
    mtHydraCave8: [0x85, 'Mt Hydra - Cave 8'],
    mtHydraCave9: [0x86, 'Mt Hydra - Cave 9'],
    mtHydraCave10: [0x87, 'Mt Hydra - Cave 10'],
    styx1: [0x88, 'Styx 1'],
    styx2: [0x89, 'Styx 2'],
    styx3: [0x8a, 'Styx 3'],
    shyron: [0x8c, 'Shyron'],
    goa: [0x8e, 'Goa'],
    goaFortressOasisEntrance: [0x8f, 'Goa Fortress - Oasis Entrance'],
    desert1: [0x90, 'Desert 1'],
    oasisCaveMain: [0x91, 'Oasis Cave - Main'],
    desertCave1: [0x92, 'Desert Cave 1'],
    sahara: [0x93, 'Sahara'],
    saharaOutsideCave: [0x94, 'Sahara - Outside Cave'],
    desertCave2: [0x95, 'Desert Cave 2'],
    saharaMeadow: [0x96, 'Sahara Meadow'],
    desert2: [0x98, 'Desert 2'],
    pyramidEntrance: [0x9c, 'Pyramid - Entrance'],
    pyramidBranch: [0x9d, 'Pyramid - Branch'],
    pyramidMain: [0x9e, 'Pyramid - Main'],
    pyramidDraygon: [0x9f, 'Pyramid - Draygon'],
    cryptEntrance: [0xa0, 'Crypt - Entrance'],
    cryptHall1: [0xa1, 'Crypt - Hall 1'],
    cryptBranch: [0xa2, 'Crypt - Branch'],
    cryptDeadEndLeft: [0xa3, 'Crypt - Dead End Left'],
    cryptDeadEndRight: [0xa4, 'Crypt - Dead End Right'],
    cryptHall2: [0xa5, 'Crypt - Hall 2'],
    cryptDraygon2: [0xa6, 'Crypt - Draygon 2'],
    cryptTeleporter: [0xa7, 'Crypt - Teleporter'],
    goaFortressEntrance: [0xa8, 'Goa Fortress - Entrance'],
    goaFortressKelbesque: [0xa9, 'Goa Fortress - Kelbesque'],
    goaFortressZebu: [0xaa, 'Goa Fortress - Zebu'],
    goaFortressSabera: [0xab, 'Goa Fortress - Sabera'],
    goaFortressTornel: [0xac, 'Goa Fortress - Tornel'],
    goaFortressMado1: [0xad, 'Goa Fortress - Mado 1'],
    goaFortressMado2: [0xae, 'Goa Fortress - Mado 2'],
    goaFortressMado3: [0xaf, 'Goa Fortress - Mado 3'],
    goaFortressKarmine1: [0xb0, 'Goa Fortress - Karmine 1'],
    goaFortressKarmine2: [0xb1, 'Goa Fortress - Karmine 2'],
    goaFortressKarmine3: [0xb2, 'Goa Fortress - Karmine 3'],
    goaFortressKarmine4: [0xb3, 'Goa Fortress - Karmine 4'],
    goaFortressKarmine5: [0xb4, 'Goa Fortress - Karmine 5'],
    goaFortressKarmine6: [0xb5, 'Goa Fortress - Karmine 6'],
    goaFortressKarmine7: [0xb6, 'Goa Fortress - Karmine 7'],
    goaFortressExit: [0xb7, 'Goa Fortress - Exit'],
    oasisCaveEntrance: [0xb8, 'Oasis Cave - Entrance'],
    goaFortressAsina: [0xb9, 'Goa Fortress - Asina'],
    goaFortressKensu: [0xba, 'Goa Fortress - Kensu'],
    goaHouse: [0xbb, 'Goa - House'],
    goaInn: [0xbc, 'Goa - Inn'],
    goaToolShop: [0xbe, 'Goa - Tool Shop'],
    goaTavern: [0xbf, 'Goa - Tavern'],
    leafElderHouse: [0xc0, 'Leaf - Elder House'],
    leafRabbitHut: [0xc1, 'Leaf - Rabbit Hut'],
    leafInn: [0xc2, 'Leaf - Inn'],
    leafToolShop: [0xc3, 'Leaf - Tool Shop'],
    leafArmorShop: [0xc4, 'Leaf - Armor Shop'],
    leafStudentHouse: [0xc5, 'Leaf - Student House'],
    brynmaerTavern: [0xc6, 'Brynmaer - Tavern'],
    brynmaerPawnShop: [0xc7, 'Brynmaer - Pawn Shop'],
    brynmaerInn: [0xc8, 'Brynmaer - Inn'],
    brynmaerArmorShop: [0xc9, 'Brynmaer - Armor Shop'],
    brynmaerItemShop: [0xcb, 'Brynmaer - Item Shop'],
    oakElderHouse: [0xcd, 'Oak - Elder House'],
    oakMotherHouse: [0xce, 'Oak - Mother House'],
    oakToolShop: [0xcf, 'Oak - Tool Shop'],
    oakInn: [0xd0, 'Oak - Inn'],
    amazonesInn: [0xd1, 'Amazones - Inn'],
    amazonesItemShop: [0xd2, 'Amazones - Item Shop'],
    amazonesArmorShop: [0xd3, 'Amazones - Armor Shop'],
    amazonesElder: [0xd4, 'Amazones - Elder'],
    nadare: [0xd5, 'Nadare'],
    portoaFishermanHouse: [0xd6, 'Portoa - Fisherman House'],
    portoaPalaceEntrance: [0xd7, 'Portoa - Palace Entrance'],
    portoaFortuneTeller: [0xd8, 'Portoa - Fortune Teller'],
    portoaPawnShop: [0xd9, 'Portoa - Pawn Shop'],
    portoaArmorShop: [0xda, 'Portoa - Armor Shop'],
    portoaInn: [0xdc, 'Portoa - Inn'],
    portoaToolShop: [0xdd, 'Portoa - Tool Shop'],
    portoaPalaceLeft: [0xde, 'Portoa - Palace Left'],
    portoaPalaceThroneRoom: [0xdf, 'Portoa - Palace Throne Room'],
    portoaPalaceRight: [0xe0, 'Portoa - Palace Right'],
    portoaAsinaRoom: [0xe1, 'Portoa - Asina Room'],
    amazonesElderDownstairs: [0xe2, 'Amazones - Elder Downstairs'],
    joelElderHouse: [0xe3, 'Joel - Elder House'],
    joelShed: [0xe4, 'Joel - Shed'],
    joelToolShop: [0xe5, 'Joel - Tool Shop'],
    joelInn: [0xe7, 'Joel - Inn'],
    zombieTownHouse: [0xe8, 'Zombie Town - House'],
    zombieTownHouseBasement: [0xe9, 'Zombie Town - House Basement'],
    swanToolShop: [0xeb, 'Swan - Tool Shop'],
    swanStomHut: [0xec, 'Swan - Stom Hut'],
    swanInn: [0xed, 'Swan - Inn'],
    swanArmorShop: [0xee, 'Swan - Armor Shop'],
    swanTavern: [0xef, 'Swan - Tavern'],
    swanPawnShop: [0xf0, 'Swan - Pawn Shop'],
    swanDanceHall: [0xf1, 'Swan - Dance Hall'],
    shyronFortress: [0xf2, 'Shyron - Fortress'],
    shyronTrainingHall: [0xf3, 'Shyron - Training Hall'],
    shyronHospital: [0xf4, 'Shyron - Hospital'],
    shyronArmorShop: [0xf5, 'Shyron - Armor Shop'],
    shyronToolShop: [0xf6, 'Shyron - Tool Shop'],
    shyronInn: [0xf7, 'Shyron - Inn'],
    saharaInn: [0xf8, 'Sahara - Inn'],
    saharaToolShop: [0xf9, 'Sahara - Tool Shop'],
    saharaElderHouse: [0xfa, 'Sahara - Elder House'],
    saharaPawnShop: [0xfb, 'Sahara - Pawn Shop'],
};
const locationNames = (() => {
    const names = [];
    for (const key of Object.keys(LOCATIONS)) {
        const [id, name] = LOCATIONS[key];
        names[id] = name;
    }
    return names;
})();
const locationKeys = (() => {
    const keys = [];
    for (const key of Object.keys(LOCATIONS)) {
        const [id] = LOCATIONS[key];
        keys[id] = key;
    }
    return keys;
})();
const NEXUSES = {
    mtSabreWestLower: true,
    mtSabreWestUpper: true,
    mtSabreNorthMain: true,
    mtSabreNorthMiddle: true,
    mtSabreNorthCave1: true,
    mtSabreNorthCave2: true,
    mtHydra: true,
    mtHydraOutsideShyron: true,
    mtHydraCave1: true,
};
const BOSS_SCREENS = {
    sealedCave7: 0x91,
    swamp: 0x7c,
    mtSabreNorthMain: 0xb5,
    saberaPalace1: 0xfd,
    saberaPalace3: 0xfd,
    shyronFortress: 0x70,
    goaFortressKelbesque: 0x73,
    goaFortressTornel: 0x91,
    goaFortressAsina: 0x91,
    goaFortressKarmine7: 0xfd,
    pyramidDraygon: 0xf9,
    cryptDraygon2: 0xfa,
    towerDyna: 0x5c,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFFbkMsT0FBTyxFQUFPLFNBQVMsRUFDZixlQUFlLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFDN0MsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUs1RCxNQUFNLE9BQU8sUUFBUyxTQUFRLE1BQU07SUF3Q2xDLFlBQVksR0FBUSxFQUFFLEVBQVU7UUFFOUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVmLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBRTNFLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekMsSUFBSSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQVMsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBRXJELElBQUksQ0FBQyxVQUFVLEdBQUcs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SCxDQUFDO0NBY0Y7QUFHRCxTQUFTLFNBQVMsQ0FBQyxJQUFZLEVBQUUsS0FBYSxFQUFFLE1BQWM7SUFDNUQsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2YsTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQztJQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFO1FBQ25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7S0FDOUQ7SUFDRCxJQUFJLENBQUMsRUFBRTtRQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7S0FDOUQ7SUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRTtRQUNqQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzdEO0lBQ0QsSUFBSSxDQUFDLEVBQUU7UUFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzdEO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQ3hDLENBQUMsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVyQyxNQUFNLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRCxJQUFJLEVBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0MsS0FBSyxFQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFaEQsUUFBUTtRQUNOLE9BQU8sWUFBWSxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDcEUsQ0FBQztDQUNGLENBQUMsQ0FBQztBQUdILE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtJQUNwQyxDQUFDLEVBQVMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxFQUFFLEVBQVEsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTdCLENBQUMsRUFBUyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLEVBQUUsRUFBUSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFN0IsTUFBTSxFQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pELElBQUksRUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWxELElBQUksRUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFN0IsUUFBUSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU3QixRQUFRO1FBQ04sT0FBTyxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQ2xELElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7Q0FDRixDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDcEMsSUFBSSxFQUFHO1FBQ0wsR0FBRyxLQUFzQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN2RCxHQUFHLENBQVksQ0FBUztZQUN0QixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSztnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNsRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDMUIsQ0FBQztLQUNGO0lBRUQsQ0FBQyxFQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEMsRUFBRSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFaEMsQ0FBQyxFQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEMsRUFBRSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBR25DLEVBQUUsRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUIsTUFBTSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUzQixRQUFRO1FBQ04sT0FBTyxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQ3BELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUMzQixDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBR0gsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQ25DLE1BQU0sRUFBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQyxJQUFJLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVsQyxNQUFNLEVBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckMsSUFBSSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFbEMsSUFBSSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU1QixRQUFRO1FBQ04sT0FBTyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQzNELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDbEUsQ0FBQztDQUNGLENBQUMsQ0FBQztBQUdILE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtJQUNyQyxDQUFDLEVBQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQyxFQUFFLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTFCLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDLEVBQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJ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QUUsd0JBQXdCLENBQUM7SUFDbEQsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUM7SUFDbEQsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUM7SUFDbEQsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUM7SUFDbEQsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUM7SUFDbEQsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUM7SUFDakQsa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDckQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDcEQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDcEQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDcEQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDcEQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDcEQsc0JBQXNCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLENBQUM7SUFDOUQsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLENBQUM7SUFDMUQscUJBQXFCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLENBQUM7SUFDN0QscUJBQXFCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLENBQUM7SUFDNUQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDcEQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDcEQsc0JBQXNCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLENBQUM7SUFHOUQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDcEQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVB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Z0JBQWdCLEVBQUUsSUFBSTtJQUN0QixhQUFhLEVBQUUsSUFBSTtJQUNuQixhQUFhLEVBQUUsSUFBSTtJQUNuQixjQUFjLEVBQUUsSUFBSTtJQUNwQixvQkFBb0IsRUFBRSxJQUFJO0lBQzFCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLFNBQVMsRUFBRSxJQUFJO0NBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0VudGl0eX0gZnJvbSAnLi9lbnRpdHkuanMnO1xuaW1wb3J0IHtTY3JlZW59IGZyb20gJy4vc2NyZWVuLmpzJztcbmltcG9ydCB7RGF0YSwgRGF0YVR1cGxlLFxuICAgICAgICBjb25jYXRJdGVyYWJsZXMsIGdyb3VwLCBoZXgsIHJlYWRMaXR0bGVFbmRpYW4sXG4gICAgICAgIHNlcSwgdHVwbGUsIHZhclNsaWNlLCB3cml0ZUxpdHRsZUVuZGlhbn0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7V3JpdGVyfSBmcm9tICcuL3dyaXRlci5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7IFVuaW9uRmluZCB9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQgeyBpdGVycywgYXNzZXJ0TmV2ZXIsIERlZmF1bHRNYXAgfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7IE1vbnN0ZXIgfSBmcm9tICcuL21vbnN0ZXIuanMnO1xuaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnLi4vcmFuZG9tLmpzJztcblxuLy8gTG9jYXRpb24gZW50aXRpZXNcbmV4cG9ydCBjbGFzcyBMb2NhdGlvbiBleHRlbmRzIEVudGl0eSB7XG5cbiAgdXNlZDogYm9vbGVhbjtcbiAgbmFtZTogc3RyaW5nO1xuICBrZXk6IGtleW9mIHR5cGVvZiBMT0NBVElPTlM7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBtYXBEYXRhUG9pbnRlcjogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IG1hcERhdGFCYXNlOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBsYXlvdXRCYXNlOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ3JhcGhpY3NCYXNlOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgZW50cmFuY2VzQmFzZTogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGV4aXRzQmFzZTogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGZsYWdzQmFzZTogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHBpdHNCYXNlOiBudW1iZXI7XG5cbiAgYmdtOiBudW1iZXI7XG4gIGxheW91dFdpZHRoOiBudW1iZXI7XG4gIGxheW91dEhlaWdodDogbnVtYmVyO1xuICBhbmltYXRpb246IG51bWJlcjtcbiAgZXh0ZW5kZWQ6IG51bWJlcjtcbiAgc2NyZWVuczogbnVtYmVyW11bXTtcblxuICB0aWxlUGF0dGVybnM6IFtudW1iZXIsIG51bWJlcl07XG4gIHRpbGVQYWxldHRlczogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICB0aWxlc2V0OiBudW1iZXI7XG4gIHRpbGVFZmZlY3RzOiBudW1iZXI7XG5cbiAgZW50cmFuY2VzOiBFbnRyYW5jZVtdO1xuICBleGl0czogRXhpdFtdO1xuICBmbGFnczogRmxhZ1tdO1xuICBwaXRzOiBQaXRbXTtcblxuICBoYXNTcGF3bnM6IGJvb2xlYW47XG4gIG5wY0RhdGFQb2ludGVyOiBudW1iZXI7XG4gIG5wY0RhdGFCYXNlOiBudW1iZXI7XG4gIHNwcml0ZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzcHJpdGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgc3Bhd25zOiBTcGF3bltdO1xuXG4gIGNvbnN0cnVjdG9yKHJvbTogUm9tLCBpZDogbnVtYmVyKSB7XG4gICAgLy8gd2lsbCBpbmNsdWRlIGJvdGggTWFwRGF0YSAqYW5kKiBOcGNEYXRhLCBzaW5jZSB0aGV5IHNoYXJlIGEga2V5LlxuICAgIHN1cGVyKHJvbSwgaWQpO1xuXG4gICAgdGhpcy5tYXBEYXRhUG9pbnRlciA9IDB4MTQzMDAgKyAoaWQgPDwgMSk7XG4gICAgdGhpcy5tYXBEYXRhQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhUG9pbnRlcikgKyAweGMwMDA7XG4gICAgLy8gVE9ETyAtIHBhc3MgdGhpcyBpbiBhbmQgbW92ZSBMT0NBVElPTlMgdG8gbG9jYXRpb25zLnRzXG4gICAgdGhpcy5uYW1lID0gbG9jYXRpb25OYW1lc1t0aGlzLmlkXSB8fCAnJztcbiAgICB0aGlzLmtleSA9IGxvY2F0aW9uS2V5c1t0aGlzLmlkXSB8fCAnJyBhcyBhbnk7XG4gICAgdGhpcy51c2VkID0gdGhpcy5tYXBEYXRhQmFzZSA+IDB4YzAwMCAmJiAhIXRoaXMubmFtZTtcblxuICAgIHRoaXMubGF5b3V0QmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhQmFzZSkgKyAweGMwMDA7XG4gICAgdGhpcy5ncmFwaGljc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UgKyAyKSArIDB4YzAwMDtcbiAgICB0aGlzLmVudHJhbmNlc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UgKyA0KSArIDB4YzAwMDtcbiAgICB0aGlzLmV4aXRzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhQmFzZSArIDYpICsgMHhjMDAwO1xuICAgIHRoaXMuZmxhZ3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFCYXNlICsgOCkgKyAweGMwMDA7XG5cbiAgICAvLyBSZWFkIHRoZSBleGl0cyBmaXJzdCBzbyB0aGF0IHdlIGNhbiBkZXRlcm1pbmUgaWYgdGhlcmUncyBlbnRyYW5jZS9waXRzXG4gICAgLy8gbWV0YWRhdGEgZW5jb2RlZCBhdCB0aGUgZW5kLlxuICAgIGxldCBoYXNQaXRzID0gdGhpcy5sYXlvdXRCYXNlICE9PSB0aGlzLm1hcERhdGFCYXNlICsgMTA7XG4gICAgbGV0IGVudHJhbmNlTGVuID0gdGhpcy5leGl0c0Jhc2UgLSB0aGlzLmVudHJhbmNlc0Jhc2U7XG4gICAgdGhpcy5leGl0cyA9ICgoKSA9PiB7XG4gICAgICBjb25zdCBleGl0cyA9IFtdO1xuICAgICAgbGV0IGkgPSB0aGlzLmV4aXRzQmFzZTtcbiAgICAgIHdoaWxlICghKHJvbS5wcmdbaV0gJiAweDgwKSkge1xuICAgICAgICBleGl0cy5wdXNoKG5ldyBFeGl0KHJvbS5wcmcuc2xpY2UoaSwgaSArIDQpKSk7XG4gICAgICAgIGkgKz0gNDtcbiAgICAgIH1cbiAgICAgIGlmIChyb20ucHJnW2ldICE9PSAweGZmKSB7XG4gICAgICAgIGhhc1BpdHMgPSAhIShyb20ucHJnW2ldICYgMHg0MCk7XG4gICAgICAgIGVudHJhbmNlTGVuID0gKHJvbS5wcmdbaV0gJiAweDFmKSA8PCAyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGV4aXRzO1xuICAgIH0pKCk7XG5cbiAgICAvLyBUT0RPIC0gdGhlc2UgaGV1cmlzdGljcyB3aWxsIG5vdCB3b3JrIHRvIHJlLXJlYWQgdGhlIGxvY2F0aW9ucy5cbiAgICAvLyAgICAgIC0gd2UgY2FuIGxvb2sgYXQgdGhlIG9yZGVyOiBpZiB0aGUgZGF0YSBpcyBCRUZPUkUgdGhlIHBvaW50ZXJzXG4gICAgLy8gICAgICAgIHRoZW4gd2UncmUgaW4gYSByZXdyaXR0ZW4gc3RhdGU7IGluIHRoYXQgY2FzZSwgd2UgbmVlZCB0byBzaW1wbHlcbiAgICAvLyAgICAgICAgZmluZCBhbGwgcmVmcyBhbmQgbWF4Li4uP1xuICAgIC8vICAgICAgLSBjYW4gd2UgcmVhZCB0aGVzZSBwYXJ0cyBsYXppbHk/XG4gICAgdGhpcy5waXRzQmFzZSA9ICFoYXNQaXRzID8gMCA6XG4gICAgICAgIHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhQmFzZSArIDEwKSArIDB4YzAwMDtcblxuICAgIHRoaXMuYmdtID0gcm9tLnByZ1t0aGlzLmxheW91dEJhc2VdO1xuICAgIHRoaXMubGF5b3V0V2lkdGggPSByb20ucHJnW3RoaXMubGF5b3V0QmFzZSArIDFdO1xuICAgIHRoaXMubGF5b3V0SGVpZ2h0ID0gcm9tLnByZ1t0aGlzLmxheW91dEJhc2UgKyAyXTtcbiAgICB0aGlzLmFuaW1hdGlvbiA9IHJvbS5wcmdbdGhpcy5sYXlvdXRCYXNlICsgM107XG4gICAgdGhpcy5leHRlbmRlZCA9IHJvbS5wcmdbdGhpcy5sYXlvdXRCYXNlICsgNF07XG4gICAgdGhpcy5zY3JlZW5zID0gc2VxKFxuICAgICAgICB0aGlzLmhlaWdodCxcbiAgICAgICAgeSA9PiB0dXBsZShyb20ucHJnLCB0aGlzLmxheW91dEJhc2UgKyA1ICsgeSAqIHRoaXMud2lkdGgsIHRoaXMud2lkdGgpKTtcbiAgICB0aGlzLnRpbGVQYWxldHRlcyA9IHR1cGxlPG51bWJlcj4ocm9tLnByZywgdGhpcy5ncmFwaGljc0Jhc2UsIDMpO1xuICAgIHRoaXMudGlsZXNldCA9IHJvbS5wcmdbdGhpcy5ncmFwaGljc0Jhc2UgKyAzXTtcbiAgICB0aGlzLnRpbGVFZmZlY3RzID0gcm9tLnByZ1t0aGlzLmdyYXBoaWNzQmFzZSArIDRdO1xuICAgIHRoaXMudGlsZVBhdHRlcm5zID0gdHVwbGUocm9tLnByZywgdGhpcy5ncmFwaGljc0Jhc2UgKyA1LCAyKTtcblxuICAgIHRoaXMuZW50cmFuY2VzID1cbiAgICAgIGdyb3VwKDQsIHJvbS5wcmcuc2xpY2UodGhpcy5lbnRyYW5jZXNCYXNlLCB0aGlzLmVudHJhbmNlc0Jhc2UgKyBlbnRyYW5jZUxlbiksXG4gICAgICAgICAgICB4ID0+IG5ldyBFbnRyYW5jZSh4KSk7XG4gICAgdGhpcy5mbGFncyA9IHZhclNsaWNlKHJvbS5wcmcsIHRoaXMuZmxhZ3NCYXNlLCAyLCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBuZXcgRmxhZyh4KSk7XG4gICAgdGhpcy5waXRzID0gdGhpcy5waXRzQmFzZSA/IHZhclNsaWNlKHJvbS5wcmcsIHRoaXMucGl0c0Jhc2UsIDQsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IG5ldyBQaXQoeCkpIDogW107XG5cbiAgICB0aGlzLm5wY0RhdGFQb2ludGVyID0gMHgxOTIwMSArIChpZCA8PCAxKTtcbiAgICB0aGlzLm5wY0RhdGFCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm5wY0RhdGFQb2ludGVyKSArIDB4MTAwMDA7XG4gICAgdGhpcy5oYXNTcGF3bnMgPSB0aGlzLm5wY0RhdGFCYXNlICE9PSAweDEwMDAwO1xuICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXMgPVxuICAgICAgICB0aGlzLmhhc1NwYXducyA/IHR1cGxlKHJvbS5wcmcsIHRoaXMubnBjRGF0YUJhc2UgKyAxLCAyKSA6IFswLCAwXTtcbiAgICB0aGlzLnNwcml0ZVBhdHRlcm5zID1cbiAgICAgICAgdGhpcy5oYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCB0aGlzLm5wY0RhdGFCYXNlICsgMywgMikgOiBbMCwgMF07XG4gICAgdGhpcy5zcGF3bnMgPVxuICAgICAgICB0aGlzLmhhc1NwYXducyA/IHZhclNsaWNlKHJvbS5wcmcsIHRoaXMubnBjRGF0YUJhc2UgKyA1LCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IG5ldyBTcGF3bih4KSkgOiBbXTtcbiAgfVxuXG4gIHNwYXduKGlkOiBudW1iZXIpOiBTcGF3biB7XG4gICAgY29uc3Qgc3Bhd24gPSB0aGlzLnNwYXduc1tpZCAtIDB4ZF07XG4gICAgaWYgKCFzcGF3bikgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBzcGF3biAkJHtoZXgoaWQpfWApO1xuICAgIHJldHVybiBzcGF3bjtcbiAgfVxuXG4gIGdldCB3aWR0aCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sYXlvdXRXaWR0aCArIDE7IH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIpIHsgdGhpcy5sYXlvdXRXaWR0aCA9IHdpZHRoIC0gMTsgfVxuXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubGF5b3V0SGVpZ2h0ICsgMTsgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7IHRoaXMubGF5b3V0SGVpZ2h0ID0gaGVpZ2h0IC0gMTsgfVxuXG4gIC8vIG1vbnN0ZXJzKCkge1xuICAvLyAgIGlmICghdGhpcy5zcGF3bnMpIHJldHVybiBbXTtcbiAgLy8gICByZXR1cm4gdGhpcy5zcGF3bnMuZmxhdE1hcChcbiAgLy8gICAgIChbLCwgdHlwZSwgaWRdLCBzbG90KSA9PlxuICAvLyAgICAgICB0eXBlICYgNyB8fCAhdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0gPyBbXSA6IFtcbiAgLy8gICAgICAgICBbdGhpcy5pZCxcbiAgLy8gICAgICAgICAgc2xvdCArIDB4MGQsXG4gIC8vICAgICAgICAgIHR5cGUgJiAweDgwID8gMSA6IDAsXG4gIC8vICAgICAgICAgIGlkICsgMHg1MCxcbiAgLy8gICAgICAgICAgdGhpcy5zcHJpdGVQYXR0ZXJuc1t0eXBlICYgMHg4MCA/IDEgOiAwXSxcbiAgLy8gICAgICAgICAgdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSxcbiAgLy8gICAgICAgICAgdGhpcy5zcHJpdGVQYWxldHRlc1t0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXS5wYWxldHRlcygpWzBdIC0gMl0sXG4gIC8vICAgICAgICAgXV0pO1xuICAvLyB9XG5cbiAgYXN5bmMgd3JpdGUod3JpdGVyOiBXcml0ZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMudXNlZCkgcmV0dXJuO1xuICAgIGNvbnN0IHByb21pc2VzID0gW107XG4gICAgaWYgKHRoaXMuaGFzU3Bhd25zKSB7XG4gICAgICAvLyB3cml0ZSBOUEMgZGF0YSBmaXJzdCwgaWYgcHJlc2VudC4uLlxuICAgICAgY29uc3QgZGF0YSA9IFswLCAuLi50aGlzLnNwcml0ZVBhbGV0dGVzLCAuLi50aGlzLnNwcml0ZVBhdHRlcm5zLFxuICAgICAgICAgICAgICAgICAgICAuLi5jb25jYXRJdGVyYWJsZXModGhpcy5zcGF3bnMpLCAweGZmXTtcbiAgICAgIHByb21pc2VzLnB1c2goXG4gICAgICAgICAgd3JpdGVyLndyaXRlKGRhdGEsIDB4MTgwMDAsIDB4MWJmZmYsIGBOcGNEYXRhICR7aGV4KHRoaXMuaWQpfWApXG4gICAgICAgICAgICAgIC50aGVuKGFkZHJlc3MgPT4gd3JpdGVMaXR0bGVFbmRpYW4oXG4gICAgICAgICAgICAgICAgICB3cml0ZXIucm9tLCB0aGlzLm5wY0RhdGFQb2ludGVyLCBhZGRyZXNzIC0gMHgxMDAwMCkpKTtcbiAgICB9XG5cbiAgICBjb25zdCB3cml0ZSA9IChkYXRhOiBEYXRhPG51bWJlcj4sIG5hbWU6IHN0cmluZykgPT5cbiAgICAgICAgd3JpdGVyLndyaXRlKGRhdGEsIDB4MTQwMDAsIDB4MTdmZmYsIGAke25hbWV9ICR7aGV4KHRoaXMuaWQpfWApO1xuICAgIGNvbnN0IGxheW91dCA9IFtcbiAgICAgIHRoaXMuYmdtLFxuICAgICAgdGhpcy5sYXlvdXRXaWR0aCwgdGhpcy5sYXlvdXRIZWlnaHQsIHRoaXMuYW5pbWF0aW9uLCB0aGlzLmV4dGVuZGVkLFxuICAgICAgLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuc2NyZWVucyldO1xuICAgIGNvbnN0IGdyYXBoaWNzID1cbiAgICAgICAgWy4uLnRoaXMudGlsZVBhbGV0dGVzLFxuICAgICAgICAgdGhpcy50aWxlc2V0LCB0aGlzLnRpbGVFZmZlY3RzLFxuICAgICAgICAgLi4udGhpcy50aWxlUGF0dGVybnNdO1xuICAgIC8vIFF1aWNrIHNhbml0eSBjaGVjazogaWYgYW4gZW50cmFuY2UvZXhpdCBpcyBiZWxvdyB0aGUgSFVEIG9uIGFcbiAgICAvLyBub24tdmVydGljYWxseSBzY3JvbGxpbmcgbWFwLCB0aGVuIHdlIG5lZWQgdG8gbW92ZSBpdCB1cC5cbiAgICBpZiAodGhpcy5oZWlnaHQgPT09IDEpIHtcbiAgICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgICAgaWYgKGVudHJhbmNlLnkgPiAweGJmKSBlbnRyYW5jZS55ID0gMHhiZjtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICAgIGlmIChleGl0Lnl0ID4gMHgwYykgZXhpdC55dCA9IDB4MGM7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGVudHJhbmNlcyA9IGNvbmNhdEl0ZXJhYmxlcyh0aGlzLmVudHJhbmNlcyk7XG4gICAgY29uc3QgZXhpdHMgPSBbLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZXhpdHMpLFxuICAgICAgICAgICAgICAgICAgIDB4ODAgfCAodGhpcy5waXRzLmxlbmd0aCA/IDB4NDAgOiAwKSB8IHRoaXMuZW50cmFuY2VzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgIF07XG4gICAgY29uc3QgZmxhZ3MgPSBbLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZmxhZ3MpLCAweGZmXTtcbiAgICBjb25zdCBwaXRzID0gY29uY2F0SXRlcmFibGVzKHRoaXMucGl0cyk7XG4gICAgY29uc3QgW2xheW91dEFkZHIsIGdyYXBoaWNzQWRkciwgZW50cmFuY2VzQWRkciwgZXhpdHNBZGRyLCBmbGFnc0FkZHIsIHBpdHNBZGRyXSA9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICB3cml0ZShsYXlvdXQsICdMYXlvdXQnKSxcbiAgICAgICAgICB3cml0ZShncmFwaGljcywgJ0dyYXBoaWNzJyksXG4gICAgICAgICAgd3JpdGUoZW50cmFuY2VzLCAnRW50cmFuY2VzJyksXG4gICAgICAgICAgd3JpdGUoZXhpdHMsICdFeGl0cycpLFxuICAgICAgICAgIHdyaXRlKGZsYWdzLCAnRmxhZ3MnKSxcbiAgICAgICAgICAuLi4ocGl0cy5sZW5ndGggPyBbd3JpdGUocGl0cywgJ1BpdHMnKV0gOiBbXSksXG4gICAgICAgIF0pO1xuICAgIGNvbnN0IGFkZHJlc3NlcyA9IFtcbiAgICAgIGxheW91dEFkZHIgJiAweGZmLCAobGF5b3V0QWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZ3JhcGhpY3NBZGRyICYgMHhmZiwgKGdyYXBoaWNzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZW50cmFuY2VzQWRkciAmIDB4ZmYsIChlbnRyYW5jZXNBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICBleGl0c0FkZHIgJiAweGZmLCAoZXhpdHNBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICBmbGFnc0FkZHIgJiAweGZmLCAoZmxhZ3NBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICAuLi4ocGl0c0FkZHIgPyBbcGl0c0FkZHIgJiAweGZmLCAocGl0c0FkZHIgPj4gOCkgLSAweGMwXSA6IFtdKSxcbiAgICBdO1xuICAgIGNvbnN0IGJhc2UgPSBhd2FpdCB3cml0ZShhZGRyZXNzZXMsICdNYXBEYXRhJyk7XG4gICAgd3JpdGVMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgdGhpcy5tYXBEYXRhUG9pbnRlciwgYmFzZSAtIDB4YzAwMCk7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgLy8gSWYgdGhpcyBpcyBhIGJvc3Mgcm9vbSwgd3JpdGUgdGhlIHJlc3RvcmF0aW9uLlxuICAgIGNvbnN0IGJvc3NJZCA9IHRoaXMuYm9zc0lkKCk7XG4gICAgaWYgKGJvc3NJZCAhPSBudWxsICYmIHRoaXMuaWQgIT09IDB4NWYpIHsgLy8gZG9uJ3QgcmVzdG9yZSBkeW5hXG4gICAgICAvLyBUaGlzIHRhYmxlIHNob3VsZCByZXN0b3JlIHBhdDAgYnV0IG5vdCBwYXQxXG4gICAgICBsZXQgcGF0cyA9IFt0aGlzLnNwcml0ZVBhdHRlcm5zWzBdLCB1bmRlZmluZWRdO1xuICAgICAgaWYgKHRoaXMuaWQgPT09IDB4YTYpIHBhdHMgPSBbMHg1MywgMHg1MF07IC8vIGRyYXlnb24gMlxuICAgICAgY29uc3QgYm9zc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIDB4MWY5NmIgKyAyICogYm9zc0lkKSArIDB4MTQwMDA7XG4gICAgICBjb25zdCBib3NzUmVzdG9yZSA9IFtcbiAgICAgICAgLCwsIHRoaXMuYmdtLCxcbiAgICAgICAgLi4udGhpcy50aWxlUGFsZXR0ZXMsLCwsIHRoaXMuc3ByaXRlUGFsZXR0ZXNbMF0sLFxuICAgICAgICAsLCwsIC8qcGF0c1swXSovLCAvKnBhdHNbMV0qLyxcbiAgICAgICAgdGhpcy5hbmltYXRpb24sXG4gICAgICBdO1xuICAgICAgY29uc3QgW10gPSBbcGF0c107IC8vIGF2b2lkIGVycm9yXG5cbiAgICAgIC8vIGlmIChyZWFkTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIGJvc3NCYXNlKSA9PT0gMHhiYTk4KSB7XG4gICAgICAvLyAgIC8vIGVzY2FwZSBhbmltYXRpb246IGRvbid0IGNsb2JiZXIgcGF0dGVybnMgeWV0P1xuICAgICAgLy8gfVxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBib3NzUmVzdG9yZS5sZW5ndGg7IGorKykge1xuICAgICAgICBjb25zdCByZXN0b3JlZCA9IGJvc3NSZXN0b3JlW2pdO1xuICAgICAgICBpZiAocmVzdG9yZWQgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHdyaXRlci5yb21bYm9zc0Jhc2UgKyBqXSA9IHJlc3RvcmVkO1xuICAgICAgfVxuICAgICAgLy8gbGF0ZXIgc3BvdCBmb3IgcGFsMyBhbmQgcGF0MSAqYWZ0ZXIqIGV4cGxvc2lvblxuICAgICAgY29uc3QgYm9zc0Jhc2UyID0gMHgxZjdjMSArIDUgKiBib3NzSWQ7XG4gICAgICB3cml0ZXIucm9tW2Jvc3NCYXNlMl0gPSB0aGlzLnNwcml0ZVBhbGV0dGVzWzFdO1xuICAgICAgLy8gTk9URTogVGhpcyBydWlucyB0aGUgdHJlYXN1cmUgY2hlc3QuXG4gICAgICAvLyBUT0RPIC0gYWRkIHNvbWUgYXNtIGFmdGVyIGEgY2hlc3QgaXMgY2xlYXJlZCB0byByZWxvYWQgcGF0dGVybnM/XG4gICAgICAvLyBBbm90aGVyIG9wdGlvbiB3b3VsZCBiZSB0byBhZGQgYSBsb2NhdGlvbi1zcGVjaWZpYyBjb250cmFpbnQgdG8gYmVcbiAgICAgIC8vIHdoYXRldmVyIHRoZSBib3NzIFxuICAgICAgLy93cml0ZXIucm9tW2Jvc3NCYXNlMiArIDFdID0gdGhpcy5zcHJpdGVQYXR0ZXJuc1sxXTtcbiAgICB9XG4gIH1cblxuICBhbGxTY3JlZW5zKCk6IFNldDxTY3JlZW4+IHtcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IFNldDxTY3JlZW4+KCk7XG4gICAgY29uc3QgZXh0ID0gdGhpcy5leHRlbmRlZCA/IDB4MTAwIDogMDtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHJvdykge1xuICAgICAgICBzY3JlZW5zLmFkZCh0aGlzLnJvbS5zY3JlZW5zW3NjcmVlbiArIGV4dF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2NyZWVucztcbiAgfVxuXG4gIGJvc3NJZCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgwZTsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5yb20ucHJnWzB4MWY5NWQgKyBpXSA9PT0gdGhpcy5pZCkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBuZWlnaGJvcnMoam9pbk5leHVzZXM6IGJvb2xlYW4gPSBmYWxzZSk6IFNldDxMb2NhdGlvbj4ge1xuICAgIGNvbnN0IG91dCA9IG5ldyBTZXQ8TG9jYXRpb24+KCk7XG4gICAgY29uc3QgYWRkTmVpZ2hib3JzID0gKGw6IExvY2F0aW9uKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbC5leGl0cykge1xuICAgICAgICBjb25zdCBpZCA9IGV4aXQuZGVzdDtcbiAgICAgICAgY29uc3QgbmVpZ2hib3IgPSB0aGlzLnJvbS5sb2NhdGlvbnNbaWRdO1xuICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IudXNlZCAmJlxuICAgICAgICAgICAgbmVpZ2hib3IgIT09IHRoaXMgJiYgIW91dC5oYXMobmVpZ2hib3IpKSB7XG4gICAgICAgICAgb3V0LmFkZChuZWlnaGJvcik7XG4gICAgICAgICAgaWYgKGpvaW5OZXh1c2VzICYmIE5FWFVTRVNbbmVpZ2hib3Iua2V5XSkge1xuICAgICAgICAgICAgYWRkTmVpZ2hib3JzKG5laWdoYm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgYWRkTmVpZ2hib3JzKHRoaXMpO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBoYXNEb2xwaGluKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlkID09PSAweDYwIHx8IHRoaXMuaWQgPT09IDB4NjQgfHwgdGhpcy5pZCA9PT0gMHg2ODtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIE1hcCBvZiB0aWxlcyAoJFlYeXgpIHJlYWNoYWJsZSBmcm9tIGFueSBlbnRyYW5jZSB0b1xuICAgKiB1bmZsYWdnZWQgdGlsZWVmZmVjdHMuXG4gICAqL1xuICByZWFjaGFibGVUaWxlcyhmbHkgPSBmYWxzZSk6IE1hcDxudW1iZXIsIG51bWJlcj4ge1xuICAgIC8vIFRPRE8gLSBhcmdzIGZvciAoMSkgdXNlIG5vbi0yZWYgZmxhZ3MsICgyKSBvbmx5IGZyb20gZ2l2ZW4gZW50cmFuY2UvdGlsZVxuICAgIC8vIERvbHBoaW4gbWFrZXMgTk9fV0FMSyBva2F5IGZvciBzb21lIGxldmVscy5cbiAgICBpZiAodGhpcy5oYXNEb2xwaGluKCkpIGZseSA9IHRydWU7XG4gICAgLy8gVGFrZSBpbnRvIGFjY291bnQgdGhlIHRpbGVzZXQgYW5kIGZsYWdzIGJ1dCBub3QgYW55IG92ZXJsYXkuXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgU2V0KHRoaXMuZXhpdHMubWFwKGV4aXQgPT4gZXhpdC5zY3JlZW4gPDwgOCB8IGV4aXQudGlsZSkpO1xuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxudW1iZXI+KCk7XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXQodGhpcy50aWxlc2V0KTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW3RoaXMudGlsZUVmZmVjdHMgLSAweGIzXTtcbiAgICBjb25zdCBwYXNzYWJsZSA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIFxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gdGhpcy5zY3JlZW5zW3ldO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tyb3dbeF0gfCAodGhpcy5leHRlbmRlZCA/IDB4MTAwIDogMCldO1xuICAgICAgICBjb25zdCBwb3MgPSB5IDw8IDQgfCB4O1xuICAgICAgICBjb25zdCBmbGFnID0gdGhpcy5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IHBvcyk7XG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICAgICAgY29uc3QgdGlsZUlkID0gcG9zIDw8IDggfCB0O1xuICAgICAgICAgIGlmIChleGl0cy5oYXModGlsZUlkKSkgY29udGludWU7IC8vIGRvbid0IGdvIHBhc3QgZXhpdHNcbiAgICAgICAgICBsZXQgdGlsZSA9IHNjcmVlbi50aWxlc1t0XTtcbiAgICAgICAgICAvLyBmbGFnIDJlZiBpcyBcImFsd2F5cyBvblwiLCBkb24ndCBldmVuIGJvdGhlciBtYWtpbmcgaXQgY29uZGl0aW9uYWwuXG4gICAgICAgICAgbGV0IGVmZmVjdHMgPSB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgIGxldCBibG9ja2VkID0gZmx5ID8gZWZmZWN0cyAmIDB4MDQgOiBlZmZlY3RzICYgMHgwNjtcbiAgICAgICAgICBpZiAoZmxhZyAmJiBibG9ja2VkICYmIHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPSB0aWxlKSB7XG4gICAgICAgICAgICB0aWxlID0gdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdO1xuICAgICAgICAgICAgZWZmZWN0cyA9IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgICBibG9ja2VkID0gZmx5ID8gZWZmZWN0cyAmIDB4MDQgOiBlZmZlY3RzICYgMHgwNjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFibG9ja2VkKSBwYXNzYWJsZS5hZGQodGlsZUlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAobGV0IHQgb2YgcGFzc2FibGUpIHtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gKHQgJiAweDBmKSA9PT0gMHgwZiA/IHQgKyAweGYxIDogdCArIDE7XG4gICAgICBpZiAocGFzc2FibGUuaGFzKHJpZ2h0KSkgdWYudW5pb24oW3QsIHJpZ2h0XSk7XG4gICAgICBjb25zdCBiZWxvdyA9ICh0ICYgMHhmMCkgPT09IDB4ZTAgPyB0ICsgMHhmMjAgOiB0ICsgMTY7XG4gICAgICBpZiAocGFzc2FibGUuaGFzKGJlbG93KSkgdWYudW5pb24oW3QsIGJlbG93XSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gdWYubWFwKCk7XG4gICAgY29uc3Qgc2V0cyA9IG5ldyBTZXQ8U2V0PG51bWJlcj4+KCk7XG4gICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgY29uc3QgaWQgPSBlbnRyYW5jZS5zY3JlZW4gPDwgOCB8IGVudHJhbmNlLnRpbGU7XG4gICAgICAvLyBOT1RFOiBtYXAgc2hvdWxkIGFsd2F5cyBoYXZlIGlkLCBidXQgYm9ndXMgZW50cmFuY2VzXG4gICAgICAvLyAoZS5nLiBHb2EgVmFsbGV5IGVudHJhbmNlIDIpIGNhbiBjYXVzZSBwcm9ibGVtcy5cbiAgICAgIHNldHMuYWRkKG1hcC5nZXQoaWQpIHx8IG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHNldCBvZiBzZXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHQgb2Ygc2V0KSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHgwZl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbc2NyIHwgKHRoaXMuZXh0ZW5kZWQgPyAweDEwMCA6IDApXTtcbiAgICAgICAgb3V0LnNldCh0LCB0aWxlRWZmZWN0cy5lZmZlY3RzW3NjcmVlbi50aWxlc1t0ICYgMHhmZl1dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIC8qKiBTYWZlciB2ZXJzaW9uIG9mIHRoZSBiZWxvdz8gKi9cbiAgc2NyZWVuTW92ZXIoKTogKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB2b2lkIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIEFycmF5PHtzY3JlZW46IG51bWJlcn0+PigoKSA9PiBbXSk7XG4gICAgY29uc3Qgb2JqcyA9XG4gICAgICAgIGl0ZXJzLmNvbmNhdDx7c2NyZWVuOiBudW1iZXJ9Pih0aGlzLnNwYXducywgdGhpcy5leGl0cywgdGhpcy5lbnRyYW5jZXMpO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIG9ianMpIHtcbiAgICAgIG1hcC5nZXQob2JqLnNjcmVlbikucHVzaChvYmopO1xuICAgIH1cbiAgICByZXR1cm4gKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG9iaiBvZiBtYXAuZ2V0KG9yaWcpKSB7XG4gICAgICAgIG9iai5zY3JlZW4gPSByZXBsO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYWxsIHNwYXducywgZW50cmFuY2VzLCBhbmQgZXhpdHMuXG4gICAqIEBwYXJhbSBvcmlnIFlYIG9mIHRoZSBvcmlnaW5hbCBzY3JlZW4uXG4gICAqIEBwYXJhbSByZXBsIFlYIG9mIHRoZSBlcXVpdmFsZW50IHJlcGxhY2VtZW50IHNjcmVlbi5cbiAgICovXG4gIG1vdmVTY3JlZW4ob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgaWYgKG9iai5zY3JlZW4gPT09IG9yaWcpIG9iai5zY3JlZW4gPSByZXBsO1xuICAgIH1cbiAgfVxuXG4gIG1vbnN0ZXJQbGFjZXIocmFuZG9tOiBSYW5kb20pOiAobTogTW9uc3RlcikgPT4gbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAvLyBJZiB0aGVyZSdzIGEgYm9zcyBzY3JlZW4sIGV4Y2x1ZGUgaXQgZnJvbSBnZXR0aW5nIGVuZW1pZXMuXG4gICAgY29uc3QgYm9zcyA9IEJPU1NfU0NSRUVOU1t0aGlzLmtleV07XG4gICAgLy8gU3RhcnQgd2l0aCBsaXN0IG9mIHJlYWNoYWJsZSB0aWxlcy5cbiAgICBjb25zdCByZWFjaGFibGUgPSB0aGlzLnJlYWNoYWJsZVRpbGVzKGZhbHNlKTtcbiAgICAvLyBEbyBhIGJyZWFkdGgtZmlyc3Qgc2VhcmNoIG9mIGFsbCB0aWxlcyB0byBmaW5kIFwiZGlzdGFuY2VcIiAoMS1ub3JtKS5cbiAgICBjb25zdCBleHRlbmRlZCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KFsuLi5yZWFjaGFibGUua2V5cygpXS5tYXAoeCA9PiBbeCwgMF0pKTtcbiAgICBjb25zdCBub3JtYWw6IG51bWJlcltdID0gW107IC8vIHJlYWNoYWJsZSwgbm90IHNsb3BlIG9yIHdhdGVyXG4gICAgY29uc3QgbW90aHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSDiiIggMy4uN1xuICAgIGNvbnN0IGJpcmRzOiBudW1iZXJbXSA9IFtdOyAgLy8gZGlzdGFuY2UgPiAxMlxuICAgIGNvbnN0IHBsYW50czogbnVtYmVyW10gPSBbXTsgLy8gZGlzdGFuY2Ug4oiIIDIuLjRcbiAgICBjb25zdCBwbGFjZWQ6IEFycmF5PFtNb25zdGVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCBub3JtYWxUZXJyYWluTWFzayA9IHRoaXMuaGFzRG9scGhpbigpID8gMHgyNSA6IDB4Mjc7XG4gICAgZm9yIChjb25zdCBbdCwgZGlzdGFuY2VdIG9mIGV4dGVuZGVkKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLnNjcmVlbnNbdCA+Pj4gMTJdWyh0ID4+PiA4KSAmIDB4Zl07XG4gICAgICBpZiAoc2NyID09PSBib3NzKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgbiBvZiBuZWlnaGJvcnModCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpKSB7XG4gICAgICAgIGlmIChleHRlbmRlZC5oYXMobikpIGNvbnRpbnVlO1xuICAgICAgICBleHRlbmRlZC5zZXQobiwgZGlzdGFuY2UgKyAxKTtcbiAgICAgIH1cbiAgICAgIGlmICghZGlzdGFuY2UgJiYgIShyZWFjaGFibGUuZ2V0KHQpISAmIG5vcm1hbFRlcnJhaW5NYXNrKSkgbm9ybWFsLnB1c2godCk7XG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHgxYSkge1xuICAgICAgICAvLyBTcGVjaWFsLWNhc2UgdGhlIHN3YW1wIGZvciBwbGFudCBwbGFjZW1lbnRcbiAgICAgICAgaWYgKHRoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl0gPT09IDB4ZjApIHBsYW50cy5wdXNoKHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGRpc3RhbmNlID49IDIgJiYgZGlzdGFuY2UgPD0gNCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMyAmJiBkaXN0YW5jZSA8PSA3KSBtb3Rocy5wdXNoKHQpO1xuICAgICAgaWYgKGRpc3RhbmNlID49IDEyKSBiaXJkcy5wdXNoKHQpO1xuICAgICAgLy8gVE9ETyAtIHNwZWNpYWwtY2FzZSBzd2FtcCBmb3IgcGxhbnQgbG9jYXRpb25zP1xuICAgIH1cbiAgICAvLyBXZSBub3cga25vdyBhbGwgdGhlIHBvc3NpYmxlIHBsYWNlcyB0byBwbGFjZSB0aGluZ3MuXG4gICAgLy8gIC0gTk9URTogc3RpbGwgbmVlZCB0byBtb3ZlIGNoZXN0cyB0byBkZWFkIGVuZHMsIGV0Yz9cbiAgICByZXR1cm4gKG06IE1vbnN0ZXIpID0+IHtcbiAgICAgIC8vIGNoZWNrIGZvciBwbGFjZW1lbnQuXG4gICAgICBjb25zdCBwbGFjZW1lbnQgPSBtLnBsYWNlbWVudCgpO1xuICAgICAgY29uc3QgcG9vbCA9IFsuLi4ocGxhY2VtZW50ID09PSAnbm9ybWFsJyA/IG5vcm1hbCA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdtb3RoJyA/IG1vdGhzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ2JpcmQnID8gYmlyZHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAncGxhbnQnID8gcGxhbnRzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydE5ldmVyKHBsYWNlbWVudCkpXVxuICAgICAgUE9PTDpcbiAgICAgIHdoaWxlIChwb29sLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBpID0gcmFuZG9tLm5leHRJbnQocG9vbC5sZW5ndGgpO1xuICAgICAgICBjb25zdCBbcG9zXSA9IHBvb2wuc3BsaWNlKGksIDEpO1xuXG4gICAgICAgIGNvbnN0IHggPSAocG9zICYgMHhmMDApID4+PiA0IHwgKHBvcyAmIDB4Zik7XG4gICAgICAgIGNvbnN0IHkgPSAocG9zICYgMHhmMDAwKSA+Pj4gOCB8IChwb3MgJiAweGYwKSA+Pj4gNDtcbiAgICAgICAgY29uc3QgciA9IG0uY2xlYXJhbmNlKCk7XG5cbiAgICAgICAgLy8gdGVzdCBkaXN0YW5jZSBmcm9tIG90aGVyIGVuZW1pZXMuXG4gICAgICAgIGZvciAoY29uc3QgWywgeDEsIHkxLCByMV0gb2YgcGxhY2VkKSB7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSB5MSkgKiogMiArICh4IC0geDEpICoqIDIpO1xuICAgICAgICAgIGlmICh6MiA8IChyICsgcjEpICoqIDIpIGNvbnRpbnVlIFBPT0w7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGVzdCBkaXN0YW5jZSBmcm9tIGVudHJhbmNlcy5cbiAgICAgICAgZm9yIChjb25zdCB7eDogeDEsIHk6IHkxfSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgICAgIGNvbnN0IHoyID0gKCh5IC0gKHkxID4+IDQpKSAqKiAyICsgKHggLSAoeDEgPj4gNCkpICoqIDIpO1xuICAgICAgICAgIGlmICh6MiA8IChyICsgMSkgKiogMikgY29udGludWUgUE9PTDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZhbGlkIHNwb3QgKHN0aWxsLCBob3cgdG9hIGFwcHJveGltYXRlbHkgKm1heGltaXplKiBkaXN0YW5jZXM/KVxuICAgICAgICBwbGFjZWQucHVzaChbbSwgeCwgeSwgcl0pO1xuICAgICAgICBjb25zdCBzY3IgPSAoeSAmIDB4ZjApIHwgKHggJiAweGYwKSA+Pj4gNDtcbiAgICAgICAgY29uc3QgdGlsZSA9ICh5ICYgMHgwZikgPDwgNCB8ICh4ICYgMHgwZik7XG4gICAgICAgIHJldHVybiBzY3IgPDwgOCB8IHRpbGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICAvLyBUT0RPIC0gYWxsb3cgbGVzcyByYW5kb21uZXNzIGZvciBjZXJ0YWluIGNhc2VzLCBlLmcuIHRvcCBvZiBub3J0aCBzYWJyZSBvclxuICAvLyBhcHByb3ByaWF0ZSBzaWRlIG9mIGNvcmRlbC5cblxuICAvKiogQHJldHVybiB7IVNldDxudW1iZXI+fSAqL1xuICAvLyBhbGxUaWxlcygpIHtcbiAgLy8gICBjb25zdCB0aWxlcyA9IG5ldyBTZXQoKTtcbiAgLy8gICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgLy8gICAgIGZvciAoY29uc3QgdGlsZSBvZiBzY3JlZW4uYWxsVGlsZXMoKSkge1xuICAvLyAgICAgICB0aWxlcy5hZGQodGlsZSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiB0aWxlcztcbiAgLy8gfVxufVxuXG4vLyBUT0RPIC0gbW92ZSB0byBhIGJldHRlci1vcmdhbml6ZWQgZGVkaWNhdGVkIFwiZ2VvbWV0cnlcIiBtb2R1bGU/XG5mdW5jdGlvbiBuZWlnaGJvcnModGlsZTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IG51bWJlcltdIHtcbiAgY29uc3Qgb3V0ID0gW107XG4gIGNvbnN0IHkgPSB0aWxlICYgMHhmMGYwO1xuICBjb25zdCB4ID0gdGlsZSAmIDB4MGYwZjtcbiAgaWYgKHkgPCAoKGhlaWdodCAtIDEpIDw8IDEyIHwgMHhlMCkpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4ZjApID09PSAweGUwID8gdGlsZSArIDB4MGYyMCA6IHRpbGUgKyAxNik7XG4gIH1cbiAgaWYgKHkpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4ZjApID09PSAweDAwID8gdGlsZSAtIDB4MGYyMCA6IHRpbGUgLSAxNik7XG4gIH1cbiAgaWYgKHggPCAoKHdpZHRoIC0gMSkgPDwgOCB8IDB4MGYpKSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweDBmKSA9PT0gMHgwZiA/IHRpbGUgKyAweDAwZjEgOiB0aWxlICsgMSk7XG4gIH1cbiAgaWYgKHgpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDAwID8gdGlsZSAtIDB4MDBmMSA6IHRpbGUgLSAxKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgY29uc3QgRW50cmFuY2UgPSBEYXRhVHVwbGUubWFrZSg0LCB7XG4gIHg6IERhdGFUdXBsZS5wcm9wKFswXSwgWzEsIDB4ZmYsIC04XSksXG4gIHk6IERhdGFUdXBsZS5wcm9wKFsyXSwgWzMsIDB4ZmYsIC04XSksXG5cbiAgc2NyZWVuOiBEYXRhVHVwbGUucHJvcChbMywgMHgwZiwgLTRdLCBbMSwgMHgwZl0pLFxuICB0aWxlOiAgIERhdGFUdXBsZS5wcm9wKFsyLCAweGYwXSwgWzAsIDB4ZjAsIDRdKSxcbiAgY29vcmQ6ICBEYXRhVHVwbGUucHJvcChbMiwgMHhmZiwgLThdLCBbMCwgMHhmZl0pLFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBFbnRyYW5jZSAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy54KX0sICR7aGV4KHRoaXMueSl9KWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIEVudHJhbmNlID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBFbnRyYW5jZT47XG5cbmV4cG9ydCBjb25zdCBFeGl0ID0gRGF0YVR1cGxlLm1ha2UoNCwge1xuICB4OiAgICAgICAgRGF0YVR1cGxlLnByb3AoWzAsIDB4ZmYsIC00XSksXG4gIHh0OiAgICAgICBEYXRhVHVwbGUucHJvcChbMF0pLFxuXG4gIHk6ICAgICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHhmZiwgLTRdKSxcbiAgeXQ6ICAgICAgIERhdGFUdXBsZS5wcm9wKFsxXSksXG5cbiAgc2NyZWVuOiAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGYwXSwgWzAsIDB4ZjAsIDRdKSxcbiAgdGlsZTogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDBmLCAtNF0sIFswLCAweDBmXSksXG5cbiAgZGVzdDogICAgIERhdGFUdXBsZS5wcm9wKFsyXSksXG5cbiAgZW50cmFuY2U6IERhdGFUdXBsZS5wcm9wKFszXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEV4aXQgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSkgPT4gJHtcbiAgICAgICAgICAgIHRoaXMuZGVzdH06JHt0aGlzLmVudHJhbmNlfWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIEV4aXQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIEV4aXQ+O1xuXG5leHBvcnQgY29uc3QgRmxhZyA9IERhdGFUdXBsZS5tYWtlKDIsIHtcbiAgZmxhZzogIHtcbiAgICBnZXQodGhpczogYW55KTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YVswXSB8IDB4MjAwOyB9LFxuICAgIHNldCh0aGlzOiBhbnksIGY6IG51bWJlcikge1xuICAgICAgaWYgKChmICYgfjB4ZmYpICE9PSAweDIwMCkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmxhZzogJHtoZXgoZil9YCk7XG4gICAgICB0aGlzLmRhdGFbMF0gPSBmICYgMHhmZjtcbiAgICB9LFxuICB9LFxuXG4gIHg6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHgwNywgLThdKSxcbiAgeHM6ICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDA3XSksXG5cbiAgeTogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGYwLCAtNF0pLFxuICB5czogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4ZjAsIDRdKSxcblxuICAvLyBUT0RPIC0gcmVtb3ZlIHRoZSAneXgnIHZlcnNpb25cbiAgeXg6ICAgIERhdGFUdXBsZS5wcm9wKFsxXSksIC8vIHkgaW4gaGkgbmliYmxlLCB4IGluIGxvLlxuICBzY3JlZW46IERhdGFUdXBsZS5wcm9wKFsxXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEZsYWcgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueHMpfSwgJHtoZXgodGhpcy55cyl9KSBAICR7XG4gICAgICAgICAgICBoZXgodGhpcy5mbGFnKX1gO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBGbGFnID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBGbGFnPjtcblxuZXhwb3J0IGNvbnN0IFBpdCA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgZnJvbVhzOiAgRGF0YVR1cGxlLnByb3AoWzEsIDB4NzAsIDRdKSxcbiAgdG9YczogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4MDddKSxcblxuICBmcm9tWXM6ICBEYXRhVHVwbGUucHJvcChbMywgMHhmMCwgNF0pLFxuICB0b1lzOiAgICBEYXRhVHVwbGUucHJvcChbMywgMHgwZl0pLFxuXG4gIGRlc3Q6ICAgIERhdGFUdXBsZS5wcm9wKFswXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFBpdCAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy5mcm9tWHMpfSwgJHtoZXgodGhpcy5mcm9tWXMpfSkgPT4gJHtcbiAgICAgICAgICAgIGhleCh0aGlzLmRlc3QpfTooJHtoZXgodGhpcy50b1hzKX0sICR7aGV4KHRoaXMudG9Zcyl9KWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIFBpdCA9IEluc3RhbmNlVHlwZTx0eXBlb2YgUGl0PjtcblxuZXhwb3J0IGNvbnN0IFNwYXduID0gRGF0YVR1cGxlLm1ha2UoNCwge1xuICB5OiAgICAgRGF0YVR1cGxlLnByb3AoWzAsIDB4ZmYsIC00XSksXG4gIHl0OiAgICBEYXRhVHVwbGUucHJvcChbMF0pLFxuXG4gIHRpbWVkOiBEYXRhVHVwbGUuYm9vbGVhblByb3AoWzEsIDB4ODAsIDddKSxcbiAgeDogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDdmLCAtNF0sIFsyLCAweDQwLCAzXSksXG4gIHh0OiAgICBEYXRhVHVwbGUucHJvcChbMSwgMHg3Zl0pLFxuXG4gIHNjcmVlbjogRGF0YVR1cGxlLnByb3AoWzAsIDB4ZjBdLCBbMSwgMHg3MCwgNF0pLFxuICB0aWxlOiAgIERhdGFUdXBsZS5wcm9wKFswLCAweDBmLCAtNF0sIFsxLCAweDBmXSksXG5cbiAgcGF0dGVybkJhbms6IERhdGFUdXBsZS5wcm9wKFsyLCAweDgwLCA3XSksXG4gIHR5cGU6ICBEYXRhVHVwbGUucHJvcChbMiwgMHgwN10pLFxuXG4vLyBwYXR0ZXJuQmFuazoge2dldCh0aGlzOiBhbnkpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5kYXRhWzJdID4+PiA3OyB9LFxuLy8gICAgICAgICAgICAgICBzZXQodGhpczogYW55LCB2OiBudW1iZXIpIHsgaWYgKHRoaXMuZGF0YVszXSA9PT0gMTIwKSBkZWJ1Z2dlcjtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB0aGlzLmRhdGFbMl0gfD0gMHg4MDsgZWxzZSB0aGlzLmRhdGFbMl0gJj0gMHg3ZjsgfX0sXG4gIGlkOiAgICBEYXRhVHVwbGUucHJvcChbM10pLFxuXG4gIHVzZWQ6IHtnZXQodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRhdGFbMF0gIT09IDB4ZmU7IH0sXG4gICAgICAgICBzZXQodGhpczogYW55LCB1c2VkOiBib29sZWFuKSB7IHRoaXMuZGF0YVswXSA9IHVzZWQgPyAwIDogMHhmZTsgfX0sXG4gIG1vbnN0ZXJJZDoge2dldCh0aGlzOiBhbnkpOiBudW1iZXIgeyByZXR1cm4gKHRoaXMuaWQgKyAweDUwKSAmIDB4ZmY7IH0sXG4gICAgICAgICAgICAgIHNldCh0aGlzOiBhbnksIGlkOiBudW1iZXIpIHsgdGhpcy5pZCA9IChpZCAtIDB4NTApICYgMHhmZjsgfX0sXG4gIC8qKiBOb3RlOiB0aGlzIGluY2x1ZGVzIG1pbWljcy4gKi9cbiAgaXNDaGVzdCh0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMiAmJiB0aGlzLmlkIDwgMHg4MDsgfSxcbiAgaXNJbnZpc2libGUodGhpczogYW55KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNDaGVzdCgpICYmIEJvb2xlYW4odGhpcy5kYXRhWzJdICYgMHgyMCk7XG4gIH0sXG4gIGlzVHJpZ2dlcih0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMiAmJiB0aGlzLmlkID49IDB4ODA7IH0sXG4gIGlzTnBjKHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAxICYmIHRoaXMuaWQgPCAweGMwOyB9LFxuICBpc0Jvc3ModGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDEgJiYgdGhpcy5pZCA+PSAweGMwOyB9LFxuICBpc01vbnN0ZXIodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDA7IH0sXG4gIGlzV2FsbCh0aGlzOiBhbnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gQm9vbGVhbih0aGlzLnR5cGUgPT09IDMgJiYgKHRoaXMuaWQgPCA0IHx8ICh0aGlzLmRhdGFbMl0gJiAweDIwKSkpO1xuICB9LFxuICB3YWxsVHlwZSh0aGlzOiBhbnkpOiAnJyB8ICd3YWxsJyB8ICdicmlkZ2UnIHtcbiAgICBpZiAodGhpcy50eXBlICE9PSAzKSByZXR1cm4gJyc7XG4gICAgY29uc3Qgb2JqID0gdGhpcy5kYXRhWzJdICYgMHgyMCA/IHRoaXMuaWQgPj4+IDQgOiB0aGlzLmlkO1xuICAgIGlmIChvYmogPj0gNCkgcmV0dXJuICcnO1xuICAgIHJldHVybiBvYmogPT09IDIgPyAnYnJpZGdlJyA6ICd3YWxsJztcbiAgfSxcbiAgd2FsbEVsZW1lbnQodGhpczogYW55KTogbnVtYmVyIHtcbiAgICBpZiAoIXRoaXMuaXNXYWxsKCkpIHJldHVybiAtMTtcbiAgICByZXR1cm4gdGhpcy5pZCAmIDM7XG4gIH0sXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBTcGF3biAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy54KX0sICR7aGV4KHRoaXMueSl9KSAke1xuICAgICAgICAgICAgdGhpcy50aW1lZCA/ICd0aW1lZCcgOiAnZml4ZWQnfSAke3RoaXMudHlwZX06JHtoZXgodGhpcy5pZCl9YDtcbiAgfSxcbn0pO1xuZXhwb3J0IHR5cGUgU3Bhd24gPSBJbnN0YW5jZVR5cGU8dHlwZW9mIFNwYXduPjtcblxuZXhwb3J0IGNvbnN0IExPQ0FUSU9OUyA9IHtcbiAgbWV6YW1lU2hyaW5lOiBbMHgwMCwgJ01lemFtZSBTaHJpbmUnXSxcbiAgbGVhZk91dHNpZGVTdGFydDogWzB4MDEsICdMZWFmIC0gT3V0c2lkZSBTdGFydCddLFxuICBsZWFmOiBbMHgwMiwgJ0xlYWYnXSxcbiAgdmFsbGV5T2ZXaW5kOiBbMHgwMywgJ1ZhbGxleSBvZiBXaW5kJ10sXG4gIHNlYWxlZENhdmUxOiBbMHgwNCwgJ1NlYWxlZCBDYXZlIDEnXSxcbiAgc2VhbGVkQ2F2ZTI6IFsweDA1LCAnU2VhbGVkIENhdmUgMiddLFxuICBzZWFsZWRDYXZlNjogWzB4MDYsICdTZWFsZWQgQ2F2ZSA2J10sXG4gIHNlYWxlZENhdmU0OiBbMHgwNywgJ1NlYWxlZCBDYXZlIDQnXSxcbiAgc2VhbGVkQ2F2ZTU6IFsweDA4LCAnU2VhbGVkIENhdmUgNSddLFxuICBzZWFsZWRDYXZlMzogWzB4MDksICdTZWFsZWQgQ2F2ZSAzJ10sXG4gIHNlYWxlZENhdmU3OiBbMHgwYSwgJ1NlYWxlZCBDYXZlIDcnXSxcbiAgLy8gSU5WQUxJRDogMHgwYlxuICBzZWFsZWRDYXZlODogWzB4MGMsICdTZWFsZWQgQ2F2ZSA4J10sXG4gIC8vIElOVkFMSUQ6IDB4MGRcbiAgd2luZG1pbGxDYXZlOiBbMHgwZSwgJ1dpbmRtaWxsIENhdmUnXSxcbiAgd2luZG1pbGw6IFsweDBmLCAnV2luZG1pbGwnXSxcbiAgemVidUNhdmU6IFsweDEwLCAnWmVidSBDYXZlJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTE6IFsweDExLCAnTXQgU2FicmUgV2VzdCAtIENhdmUgMSddLFxuICAvLyBJTlZBTElEOiAweDEyXG4gIC8vIElOVkFMSUQ6IDB4MTNcbiAgY29yZGVsUGxhaW5zV2VzdDogWzB4MTQsICdDb3JkZWwgUGxhaW5zIFdlc3QnXSxcbiAgY29yZGVsUGxhaW5zRWFzdDogWzB4MTUsICdDb3JkZWwgUGxhaW5zIEVhc3QnXSxcbiAgLy8gSU5WQUxJRDogMHgxNiAtLSB1bnVzZWQgY29weSBvZiAxOFxuICAvLyBJTlZBTElEOiAweDE3XG4gIGJyeW5tYWVyOiBbMHgxOCwgJ0JyeW5tYWVyJ10sXG4gIG91dHNpZGVTdG9tSG91c2U6IFsweDE5LCAnT3V0c2lkZSBTdG9tIEhvdXNlJ10sXG4gIHN3YW1wOiBbMHgxYSwgJ1N3YW1wJ10sXG4gIGFtYXpvbmVzOiBbMHgxYiwgJ0FtYXpvbmVzJ10sXG4gIG9hazogWzB4MWMsICdPYWsnXSxcbiAgLy8gSU5WQUxJRDogMHgxZFxuICBzdG9tSG91c2U6IFsweDFlLCAnU3RvbSBIb3VzZSddLFxuICAvLyBJTlZBTElEOiAweDFmXG4gIG10U2FicmVXZXN0TG93ZXI6IFsweDIwLCAnTXQgU2FicmUgV2VzdCAtIExvd2VyJ10sXG4gIG10U2FicmVXZXN0VXBwZXI6IFsweDIxLCAnTXQgU2FicmUgV2VzdCAtIFVwcGVyJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTI6IFsweDIyLCAnTXQgU2FicmUgV2VzdCAtIENhdmUgMiddLFxuICBtdFNhYnJlV2VzdENhdmUzOiBbMHgyMywgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDMnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNDogWzB4MjQsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA0J10sXG4gIG10U2FicmVXZXN0Q2F2ZTU6IFsweDI1LCAnTXQgU2FicmUgV2VzdCAtIENhdmUgNSddLFxuICBtdFNhYnJlV2VzdENhdmU2OiBbMHgyNiwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDYnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNzogWzB4MjcsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA3J10sXG4gIG10U2FicmVOb3J0aE1haW46IFsweDI4LCAnTXQgU2FicmUgTm9ydGggLSBNYWluJ10sXG4gIG10U2FicmVOb3J0aE1pZGRsZTogWzB4MjksICdNdCBTYWJyZSBOb3J0aCAtIE1pZGRsZSddLFxuICBtdFNhYnJlTm9ydGhDYXZlMjogWzB4MmEsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgMiddLFxuICBtdFNhYnJlTm9ydGhDYXZlMzogWzB4MmIsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgMyddLFxuICBtdFNhYnJlTm9ydGhDYXZlNDogWzB4MmMsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNCddLFxuICBtdFNhYnJlTm9ydGhDYXZlNTogWzB4MmQsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNSddLFxuICBtdFNhYnJlTm9ydGhDYXZlNjogWzB4MmUsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNiddLFxuICBtdFNhYnJlTm9ydGhQcmlzb25IYWxsOiBbMHgyZiwgJ010IFNhYnJlIE5vcnRoIC0gUHJpc29uIEhhbGwnXSxcbiAgbXRTYWJyZU5vcnRoTGVmdENlbGw6IFsweDMwLCAnTXQgU2FicmUgTm9ydGggLSBMZWZ0IENlbGwnXSxcbiAgbXRTYWJyZU5vcnRoTGVmdENlbGwyOiBbMHgzMSwgJ010IFNhYnJlIE5vcnRoIC0gTGVmdCBDZWxsIDInXSxcbiAgbXRTYWJyZU5vcnRoUmlnaHRDZWxsOiBbMHgzMiwgJ010IFNhYnJlIE5vcnRoIC0gUmlnaHQgQ2VsbCddLFxuICBtdFNhYnJlTm9ydGhDYXZlODogWzB4MzMsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgOCddLFxuICBtdFNhYnJlTm9ydGhDYXZlOTogWzB4MzQsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgOSddLFxuICBtdFNhYnJlTm9ydGhTdW1taXRDYXZlOiBbMHgzNSwgJ010IFNhYnJlIE5vcnRoIC0gU3VtbWl0IENhdmUnXSxcbiAgLy8gSU5WQUxJRDogMHgzNlxuICAvLyBJTlZBTElEOiAweDM3XG4gIG10U2FicmVOb3J0aENhdmUxOiBbMHgzOCwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSAxJ10sXG4gIG10U2FicmVOb3J0aENhdmU3OiBbMHgzOSwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSA3J10sXG4gIC8vIElOVkFMSUQ6IDB4M2FcbiAgLy8gSU5WQUxJRDogMHgzYlxuICBuYWRhcmVJbm46IFsweDNjLCAnTmFkYXJlIC0gSW5uJ10sXG4gIG5hZGFyZVRvb2xTaG9wOiBbMHgzZCwgJ05hZGFyZSAtIFRvb2wgU2hvcCddLFxuICBuYWRhcmVCYWNrUm9vbTogWzB4M2UsICdOYWRhcmUgLSBCYWNrIFJvb20nXSxcbiAgLy8gSU5WQUxJRDogMHgzZlxuICB3YXRlcmZhbGxWYWxsZXlOb3J0aDogWzB4NDAsICdXYXRlcmZhbGwgVmFsbGV5IE5vcnRoJ10sXG4gIHdhdGVyZmFsbFZhbGxleVNvdXRoOiBbMHg0MSwgJ1dhdGVyZmFsbCBWYWxsZXkgU291dGgnXSxcbiAgbGltZVRyZWVWYWxsZXk6IFsweDQyLCAnTGltZSBUcmVlIFZhbGxleSddLFxuICBsaW1lVHJlZUxha2U6IFsweDQzLCAnTGltZSBUcmVlIExha2UnXSxcbiAga2lyaXNhUGxhbnRDYXZlMTogWzB4NDQsICdLaXJpc2EgUGxhbnQgQ2F2ZSAxJ10sXG4gIGtpcmlzYVBsYW50Q2F2ZTI6IFsweDQ1LCAnS2lyaXNhIFBsYW50IENhdmUgMiddLFxuICBraXJpc2FQbGFudENhdmUzOiBbMHg0NiwgJ0tpcmlzYSBQbGFudCBDYXZlIDMnXSxcbiAga2lyaXNhTWVhZG93OiBbMHg0NywgJ0tpcmlzYSBNZWFkb3cnXSxcbiAgZm9nTGFtcENhdmUxOiBbMHg0OCwgJ0ZvZyBMYW1wIENhdmUgMSddLFxuICBmb2dMYW1wQ2F2ZTI6IFsweDQ5LCAnRm9nIExhbXAgQ2F2ZSAyJ10sXG4gIGZvZ0xhbXBDYXZlMzogWzB4NGEsICdGb2cgTGFtcCBDYXZlIDMnXSxcbiAgZm9nTGFtcENhdmVEZWFkRW5kOiBbMHg0YiwgJ0ZvZyBMYW1wIENhdmUgRGVhZCBFbmQnXSxcbiAgZm9nTGFtcENhdmU0OiBbMHg0YywgJ0ZvZyBMYW1wIENhdmUgNCddLFxuICBmb2dMYW1wQ2F2ZTU6IFsweDRkLCAnRm9nIExhbXAgQ2F2ZSA1J10sXG4gIGZvZ0xhbXBDYXZlNjogWzB4NGUsICdGb2cgTGFtcCBDYXZlIDYnXSxcbiAgZm9nTGFtcENhdmU3OiBbMHg0ZiwgJ0ZvZyBMYW1wIENhdmUgNyddLFxuICBwb3J0b2E6IFsweDUwLCAnUG9ydG9hJ10sXG4gIHBvcnRvYUZpc2hlcm1hbklzbGFuZDogWzB4NTEsICdQb3J0b2EgLSBGaXNoZXJtYW4gSXNsYW5kJ10sXG4gIG1lc2lhU2hyaW5lOiBbMHg1MiwgJ01lc2lhIFNocmluZSddLFxuICAvLyBJTlZBTElEOiAweDUzXG4gIHdhdGVyZmFsbENhdmUxOiBbMHg1NCwgJ1dhdGVyZmFsbCBDYXZlIDEnXSxcbiAgd2F0ZXJmYWxsQ2F2ZTI6IFsweDU1LCAnV2F0ZXJmYWxsIENhdmUgMiddLFxuICB3YXRlcmZhbGxDYXZlMzogWzB4NTYsICdXYXRlcmZhbGwgQ2F2ZSAzJ10sXG4gIHdhdGVyZmFsbENhdmU0OiBbMHg1NywgJ1dhdGVyZmFsbCBDYXZlIDQnXSxcbiAgdG93ZXJFbnRyYW5jZTogWzB4NTgsICdUb3dlciAtIEVudHJhbmNlJ10sXG4gIHRvd2VyMTogWzB4NTksICdUb3dlciAxJ10sXG4gIHRvd2VyMjogWzB4NWEsICdUb3dlciAyJ10sXG4gIHRvd2VyMzogWzB4NWIsICdUb3dlciAzJ10sXG4gIHRvd2VyT3V0c2lkZU1lc2lhOiBbMHg1YywgJ1Rvd2VyIC0gT3V0c2lkZSBNZXNpYSddLFxuICB0b3dlck91dHNpZGVEeW5hOiBbMHg1ZCwgJ1Rvd2VyIC0gT3V0c2lkZSBEeW5hJ10sXG4gIHRvd2VyTWVzaWE6IFsweDVlLCAnVG93ZXIgLSBNZXNpYSddLFxuICB0b3dlckR5bmE6IFsweDVmLCAnVG93ZXIgLSBEeW5hJ10sXG4gIGFuZ3J5U2VhOiBbMHg2MCwgJ0FuZ3J5IFNlYSddLFxuICBib2F0SG91c2U6IFsweDYxLCAnQm9hdCBIb3VzZSddLFxuICBqb2VsTGlnaHRob3VzZTogWzB4NjIsICdKb2VsIC0gTGlnaHRob3VzZSddLFxuICAvLyBJTlZBTElEOiAweDYzXG4gIHVuZGVyZ3JvdW5kQ2hhbm5lbDogWzB4NjQsICdVbmRlcmdyb3VuZCBDaGFubmVsJ10sXG4gIHpvbWJpZVRvd246IFsweDY1LCAnWm9tYmllIFRvd24nXSxcbiAgLy8gSU5WQUxJRDogMHg2NlxuICAvLyBJTlZBTElEOiAweDY3XG4gIGV2aWxTcGlyaXRJc2xhbmQxOiBbMHg2OCwgJ0V2aWwgU3Bpcml0IElzbGFuZCAxJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQyOiBbMHg2OSwgJ0V2aWwgU3Bpcml0IElzbGFuZCAyJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQzOiBbMHg2YSwgJ0V2aWwgU3Bpcml0IElzbGFuZCAzJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQ0OiBbMHg2YiwgJ0V2aWwgU3Bpcml0IElzbGFuZCA0J10sXG4gIHNhYmVyYVBhbGFjZTE6IFsweDZjLCAnU2FiZXJhIFBhbGFjZSAxJ10sXG4gIHNhYmVyYVBhbGFjZTI6IFsweDZkLCAnU2FiZXJhIFBhbGFjZSAyJ10sXG4gIHNhYmVyYVBhbGFjZTM6IFsweDZlLCAnU2FiZXJhIFBhbGFjZSAzJ10sXG4gIC8vIElOVkFMSUQ6IDB4NmYgLS0gU2FiZXJhIFBhbGFjZSAzIHVudXNlZCBjb3B5XG4gIGpvZWxTZWNyZXRQYXNzYWdlOiBbMHg3MCwgJ0pvZWwgLSBTZWNyZXQgUGFzc2FnZSddLFxuICBqb2VsOiBbMHg3MSwgJ0pvZWwnXSxcbiAgc3dhbjogWzB4NzIsICdTd2FuJ10sXG4gIHN3YW5HYXRlOiBbMHg3MywgJ1N3YW4gLSBHYXRlJ10sXG4gIC8vIElOVkFMSUQ6IDB4NzRcbiAgLy8gSU5WQUxJRDogMHg3NVxuICAvLyBJTlZBTElEOiAweDc2XG4gIC8vIElOVkFMSUQ6IDB4NzdcbiAgZ29hVmFsbGV5OiBbMHg3OCwgJ0dvYSBWYWxsZXknXSxcbiAgLy8gSU5WQUxJRDogMHg3OVxuICAvLyBJTlZBTElEOiAweDdhXG4gIC8vIElOVkFMSUQ6IDB4N2JcbiAgbXRIeWRyYTogWzB4N2MsICdNdCBIeWRyYSddLFxuICBtdEh5ZHJhQ2F2ZTE6IFsweDdkLCAnTXQgSHlkcmEgLSBDYXZlIDEnXSxcbiAgbXRIeWRyYU91dHNpZGVTaHlyb246IFsweDdlLCAnTXQgSHlkcmEgLSBPdXRzaWRlIFNoeXJvbiddLFxuICBtdEh5ZHJhQ2F2ZTI6IFsweDdmLCAnTXQgSHlkcmEgLSBDYXZlIDInXSxcbiAgbXRIeWRyYUNhdmUzOiBbMHg4MCwgJ010IEh5ZHJhIC0gQ2F2ZSAzJ10sXG4gIG10SHlkcmFDYXZlNDogWzB4ODEsICdNdCBIeWRyYSAtIENhdmUgNCddLFxuICBtdEh5ZHJhQ2F2ZTU6IFsweDgyLCAnTXQgSHlkcmEgLSBDYXZlIDUnXSxcbiAgbXRIeWRyYUNhdmU2OiBbMHg4MywgJ010IEh5ZHJhIC0gQ2F2ZSA2J10sXG4gIG10SHlkcmFDYXZlNzogWzB4ODQsICdNdCBIeWRyYSAtIENhdmUgNyddLFxuICBtdEh5ZHJhQ2F2ZTg6IFsweDg1LCAnTXQgSHlkcmEgLSBDYXZlIDgnXSxcbiAgbXRIeWRyYUNhdmU5OiBbMHg4NiwgJ010IEh5ZHJhIC0gQ2F2ZSA5J10sXG4gIG10SHlkcmFDYXZlMTA6IFsweDg3LCAnTXQgSHlkcmEgLSBDYXZlIDEwJ10sXG4gIHN0eXgxOiBbMHg4OCwgJ1N0eXggMSddLFxuICBzdHl4MjogWzB4ODksICdTdHl4IDInXSxcbiAgc3R5eDM6IFsweDhhLCAnU3R5eCAzJ10sXG4gIC8vIElOVkFMSUQ6IDB4OGJcbiAgc2h5cm9uOiBbMHg4YywgJ1NoeXJvbiddLFxuICAvLyBJTlZBTElEOiAweDhkXG4gIGdvYTogWzB4OGUsICdHb2EnXSxcbiAgZ29hRm9ydHJlc3NPYXNpc0VudHJhbmNlOiBbMHg4ZiwgJ0dvYSBGb3J0cmVzcyAtIE9hc2lzIEVudHJhbmNlJ10sXG4gIGRlc2VydDE6IFsweDkwLCAnRGVzZXJ0IDEnXSxcbiAgb2FzaXNDYXZlTWFpbjogWzB4OTEsICdPYXNpcyBDYXZlIC0gTWFpbiddLFxuICBkZXNlcnRDYXZlMTogWzB4OTIsICdEZXNlcnQgQ2F2ZSAxJ10sXG4gIHNhaGFyYTogWzB4OTMsICdTYWhhcmEnXSxcbiAgc2FoYXJhT3V0c2lkZUNhdmU6IFsweDk0LCAnU2FoYXJhIC0gT3V0c2lkZSBDYXZlJ10sXG4gIGRlc2VydENhdmUyOiBbMHg5NSwgJ0Rlc2VydCBDYXZlIDInXSxcbiAgc2FoYXJhTWVhZG93OiBbMHg5NiwgJ1NhaGFyYSBNZWFkb3cnXSxcbiAgLy8gSU5WQUxJRDogMHg5N1xuICBkZXNlcnQyOiBbMHg5OCwgJ0Rlc2VydCAyJ10sXG4gIC8vIElOVkFMSUQ6IDB4OTlcbiAgLy8gSU5WQUxJRDogMHg5YVxuICAvLyBJTlZBTElEOiAweDliXG4gIHB5cmFtaWRFbnRyYW5jZTogWzB4OWMsICdQeXJhbWlkIC0gRW50cmFuY2UnXSxcbiAgcHlyYW1pZEJyYW5jaDogWzB4OWQsICdQeXJhbWlkIC0gQnJhbmNoJ10sXG4gIHB5cmFtaWRNYWluOiBbMHg5ZSwgJ1B5cmFtaWQgLSBNYWluJ10sXG4gIHB5cmFtaWREcmF5Z29uOiBbMHg5ZiwgJ1B5cmFtaWQgLSBEcmF5Z29uJ10sXG4gIGNyeXB0RW50cmFuY2U6IFsweGEwLCAnQ3J5cHQgLSBFbnRyYW5jZSddLFxuICBjcnlwdEhhbGwxOiBbMHhhMSwgJ0NyeXB0IC0gSGFsbCAxJ10sXG4gIGNyeXB0QnJhbmNoOiBbMHhhMiwgJ0NyeXB0IC0gQnJhbmNoJ10sXG4gIGNyeXB0RGVhZEVuZExlZnQ6IFsweGEzLCAnQ3J5cHQgLSBEZWFkIEVuZCBMZWZ0J10sXG4gIGNyeXB0RGVhZEVuZFJpZ2h0OiBbMHhhNCwgJ0NyeXB0IC0gRGVhZCBFbmQgUmlnaHQnXSxcbiAgY3J5cHRIYWxsMjogWzB4YTUsICdDcnlwdCAtIEhhbGwgMiddLFxuICBjcnlwdERyYXlnb24yOiBbMHhhNiwgJ0NyeXB0IC0gRHJheWdvbiAyJ10sXG4gIGNyeXB0VGVsZXBvcnRlcjogWzB4YTcsICdDcnlwdCAtIFRlbGVwb3J0ZXInXSxcbiAgZ29hRm9ydHJlc3NFbnRyYW5jZTogWzB4YTgsICdHb2EgRm9ydHJlc3MgLSBFbnRyYW5jZSddLFxuICBnb2FGb3J0cmVzc0tlbGJlc3F1ZTogWzB4YTksICdHb2EgRm9ydHJlc3MgLSBLZWxiZXNxdWUnXSxcbiAgZ29hRm9ydHJlc3NaZWJ1OiBbMHhhYSwgJ0dvYSBGb3J0cmVzcyAtIFplYnUnXSxcbiAgZ29hRm9ydHJlc3NTYWJlcmE6IFsweGFiLCAnR29hIEZvcnRyZXNzIC0gU2FiZXJhJ10sXG4gIGdvYUZvcnRyZXNzVG9ybmVsOiBbMHhhYywgJ0dvYSBGb3J0cmVzcyAtIFRvcm5lbCddLFxuICBnb2FGb3J0cmVzc01hZG8xOiBbMHhhZCwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMSddLFxuICBnb2FGb3J0cmVzc01hZG8yOiBbMHhhZSwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMiddLFxuICBnb2FGb3J0cmVzc01hZG8zOiBbMHhhZiwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMyddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUxOiBbMHhiMCwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMSddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUyOiBbMHhiMSwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMiddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUzOiBbMHhiMiwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMyddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU0OiBbMHhiMywgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNCddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU1OiBbMHhiNCwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNSddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU2OiBbMHhiNSwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNiddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU3OiBbMHhiNiwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNyddLFxuICBnb2FGb3J0cmVzc0V4aXQ6IFsweGI3LCAnR29hIEZvcnRyZXNzIC0gRXhpdCddLFxuICBvYXNpc0NhdmVFbnRyYW5jZTogWzB4YjgsICdPYXNpcyBDYXZlIC0gRW50cmFuY2UnXSxcbiAgZ29hRm9ydHJlc3NBc2luYTogWzB4YjksICdHb2EgRm9ydHJlc3MgLSBBc2luYSddLFxuICBnb2FGb3J0cmVzc0tlbnN1OiBbMHhiYSwgJ0dvYSBGb3J0cmVzcyAtIEtlbnN1J10sXG4gIGdvYUhvdXNlOiBbMHhiYiwgJ0dvYSAtIEhvdXNlJ10sXG4gIGdvYUlubjogWzB4YmMsICdHb2EgLSBJbm4nXSxcbiAgLy8gSU5WQUxJRDogMHhiZFxuICBnb2FUb29sU2hvcDogWzB4YmUsICdHb2EgLSBUb29sIFNob3AnXSxcbiAgZ29hVGF2ZXJuOiBbMHhiZiwgJ0dvYSAtIFRhdmVybiddLFxuICBsZWFmRWxkZXJIb3VzZTogWzB4YzAsICdMZWFmIC0gRWxkZXIgSG91c2UnXSxcbiAgbGVhZlJhYmJpdEh1dDogWzB4YzEsICdMZWFmIC0gUmFiYml0IEh1dCddLFxuICBsZWFmSW5uOiBbMHhjMiwgJ0xlYWYgLSBJbm4nXSxcbiAgbGVhZlRvb2xTaG9wOiBbMHhjMywgJ0xlYWYgLSBUb29sIFNob3AnXSxcbiAgbGVhZkFybW9yU2hvcDogWzB4YzQsICdMZWFmIC0gQXJtb3IgU2hvcCddLFxuICBsZWFmU3R1ZGVudEhvdXNlOiBbMHhjNSwgJ0xlYWYgLSBTdHVkZW50IEhvdXNlJ10sXG4gIGJyeW5tYWVyVGF2ZXJuOiBbMHhjNiwgJ0JyeW5tYWVyIC0gVGF2ZXJuJ10sXG4gIGJyeW5tYWVyUGF3blNob3A6IFsweGM3LCAnQnJ5bm1hZXIgLSBQYXduIFNob3AnXSxcbiAgYnJ5bm1hZXJJbm46IFsweGM4LCAnQnJ5bm1hZXIgLSBJbm4nXSxcbiAgYnJ5bm1hZXJBcm1vclNob3A6IFsweGM5LCAnQnJ5bm1hZXIgLSBBcm1vciBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4Y2FcbiAgYnJ5bm1hZXJJdGVtU2hvcDogWzB4Y2IsICdCcnlubWFlciAtIEl0ZW0gU2hvcCddLFxuICAvLyBJTlZBTElEOiAweGNjXG4gIG9ha0VsZGVySG91c2U6IFsweGNkLCAnT2FrIC0gRWxkZXIgSG91c2UnXSxcbiAgb2FrTW90aGVySG91c2U6IFsweGNlLCAnT2FrIC0gTW90aGVyIEhvdXNlJ10sXG4gIG9ha1Rvb2xTaG9wOiBbMHhjZiwgJ09hayAtIFRvb2wgU2hvcCddLFxuICBvYWtJbm46IFsweGQwLCAnT2FrIC0gSW5uJ10sXG4gIGFtYXpvbmVzSW5uOiBbMHhkMSwgJ0FtYXpvbmVzIC0gSW5uJ10sXG4gIGFtYXpvbmVzSXRlbVNob3A6IFsweGQyLCAnQW1hem9uZXMgLSBJdGVtIFNob3AnXSxcbiAgYW1hem9uZXNBcm1vclNob3A6IFsweGQzLCAnQW1hem9uZXMgLSBBcm1vciBTaG9wJ10sXG4gIGFtYXpvbmVzRWxkZXI6IFsweGQ0LCAnQW1hem9uZXMgLSBFbGRlciddLFxuICBuYWRhcmU6IFsweGQ1LCAnTmFkYXJlJ10sXG4gIHBvcnRvYUZpc2hlcm1hbkhvdXNlOiBbMHhkNiwgJ1BvcnRvYSAtIEZpc2hlcm1hbiBIb3VzZSddLFxuICBwb3J0b2FQYWxhY2VFbnRyYW5jZTogWzB4ZDcsICdQb3J0b2EgLSBQYWxhY2UgRW50cmFuY2UnXSxcbiAgcG9ydG9hRm9ydHVuZVRlbGxlcjogWzB4ZDgsICdQb3J0b2EgLSBGb3J0dW5lIFRlbGxlciddLFxuICBwb3J0b2FQYXduU2hvcDogWzB4ZDksICdQb3J0b2EgLSBQYXduIFNob3AnXSxcbiAgcG9ydG9hQXJtb3JTaG9wOiBbMHhkYSwgJ1BvcnRvYSAtIEFybW9yIFNob3AnXSxcbiAgLy8gSU5WQUxJRDogMHhkYlxuICBwb3J0b2FJbm46IFsweGRjLCAnUG9ydG9hIC0gSW5uJ10sXG4gIHBvcnRvYVRvb2xTaG9wOiBbMHhkZCwgJ1BvcnRvYSAtIFRvb2wgU2hvcCddLFxuICBwb3J0b2FQYWxhY2VMZWZ0OiBbMHhkZSwgJ1BvcnRvYSAtIFBhbGFjZSBMZWZ0J10sXG4gIHBvcnRvYVBhbGFjZVRocm9uZVJvb206IFsweGRmLCAnUG9ydG9hIC0gUGFsYWNlIFRocm9uZSBSb29tJ10sXG4gIHBvcnRvYVBhbGFjZVJpZ2h0OiBbMHhlMCwgJ1BvcnRvYSAtIFBhbGFjZSBSaWdodCddLFxuICBwb3J0b2FBc2luYVJvb206IFsweGUxLCAnUG9ydG9hIC0gQXNpbmEgUm9vbSddLFxuICBhbWF6b25lc0VsZGVyRG93bnN0YWlyczogWzB4ZTIsICdBbWF6b25lcyAtIEVsZGVyIERvd25zdGFpcnMnXSxcbiAgam9lbEVsZGVySG91c2U6IFsweGUzLCAnSm9lbCAtIEVsZGVyIEhvdXNlJ10sXG4gIGpvZWxTaGVkOiBbMHhlNCwgJ0pvZWwgLSBTaGVkJ10sXG4gIGpvZWxUb29sU2hvcDogWzB4ZTUsICdKb2VsIC0gVG9vbCBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4ZTZcbiAgam9lbElubjogWzB4ZTcsICdKb2VsIC0gSW5uJ10sXG4gIHpvbWJpZVRvd25Ib3VzZTogWzB4ZTgsICdab21iaWUgVG93biAtIEhvdXNlJ10sXG4gIHpvbWJpZVRvd25Ib3VzZUJhc2VtZW50OiBbMHhlOSwgJ1pvbWJpZSBUb3duIC0gSG91c2UgQmFzZW1lbnQnXSxcbiAgLy8gSU5WQUxJRDogMHhlYVxuICBzd2FuVG9vbFNob3A6IFsweGViLCAnU3dhbiAtIFRvb2wgU2hvcCddLFxuICBzd2FuU3RvbUh1dDogWzB4ZWMsICdTd2FuIC0gU3RvbSBIdXQnXSxcbiAgc3dhbklubjogWzB4ZWQsICdTd2FuIC0gSW5uJ10sXG4gIHN3YW5Bcm1vclNob3A6IFsweGVlLCAnU3dhbiAtIEFybW9yIFNob3AnXSxcbiAgc3dhblRhdmVybjogWzB4ZWYsICdTd2FuIC0gVGF2ZXJuJ10sXG4gIHN3YW5QYXduU2hvcDogWzB4ZjAsICdTd2FuIC0gUGF3biBTaG9wJ10sXG4gIHN3YW5EYW5jZUhhbGw6IFsweGYxLCAnU3dhbiAtIERhbmNlIEhhbGwnXSxcbiAgc2h5cm9uRm9ydHJlc3M6IFsweGYyLCAnU2h5cm9uIC0gRm9ydHJlc3MnXSxcbiAgc2h5cm9uVHJhaW5pbmdIYWxsOiBbMHhmMywgJ1NoeXJvbiAtIFRyYWluaW5nIEhhbGwnXSxcbiAgc2h5cm9uSG9zcGl0YWw6IFsweGY0LCAnU2h5cm9uIC0gSG9zcGl0YWwnXSxcbiAgc2h5cm9uQXJtb3JTaG9wOiBbMHhmNSwgJ1NoeXJvbiAtIEFybW9yIFNob3AnXSxcbiAgc2h5cm9uVG9vbFNob3A6IFsweGY2LCAnU2h5cm9uIC0gVG9vbCBTaG9wJ10sXG4gIHNoeXJvbklubjogWzB4ZjcsICdTaHlyb24gLSBJbm4nXSxcbiAgc2FoYXJhSW5uOiBbMHhmOCwgJ1NhaGFyYSAtIElubiddLFxuICBzYWhhcmFUb29sU2hvcDogWzB4ZjksICdTYWhhcmEgLSBUb29sIFNob3AnXSxcbiAgc2FoYXJhRWxkZXJIb3VzZTogWzB4ZmEsICdTYWhhcmEgLSBFbGRlciBIb3VzZSddLFxuICBzYWhhcmFQYXduU2hvcDogWzB4ZmIsICdTYWhhcmEgLSBQYXduIFNob3AnXSxcbn0gYXMgY29uc3Q7XG4vLyB0eXBlIExvY2F0aW9ucyA9IHR5cGVvZiBMT0NBVElPTlM7XG5cbi8vIE5PVEU6IHRoaXMgd29ya3MgdG8gY29uc3RyYWluIHRoZSBrZXlzIHRvIGV4YWN0bHkgdGhlIHNhbWUuXG4vLyBjb25zdCB4OiB7cmVhZG9ubHkgW1QgaW4ga2V5b2YgdHlwZW9mIExPQ0FUSU9OU10/OiBzdHJpbmd9ID0ge307XG5cbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgYWxsb3dzIHByZXR0eSByb2J1c3QgY2hlY2tzIVxuLy8gY29uc3QgeCA9IGNoZWNrPEtleXNPZjxMb2NhdGlvbnMsIHN0cmluZyB8IGJvb2xlYW4+PigpKHtcbi8vICAgbGVhZjogJ3gnLFxuLy8gICBzd2FuOiB0cnVlLFxuLy8gfSk7XG4vLyBjb25zdCB5ID0gY2hlY2s8S2V5c09mPHR5cGVvZiB4LCBudW1iZXIsIHN0cmluZz4+KCkoe1xuLy8gICBzd2FuOiAxLFxuLy8gfSk7XG5cbi8vIHR5cGUgS2V5c09mPFQsIFYgPSB1bmtub3duLCBSID0gdW5rbm93bj4gPSB7W0sgaW4ga2V5b2YgVF0/OiBUW0tdIGV4dGVuZHMgUiA/IFYgOiBuZXZlcn07XG5cbi8vIGZ1bmN0aW9uIGNoZWNrPFQ+KCk6IDxVIGV4dGVuZHMgVD4oYXJnOiBVKSA9PiBVIHtcbi8vICAgcmV0dXJuIGFyZyA9PiBhcmc7XG4vLyB9XG5cbmNvbnN0IGxvY2F0aW9uTmFtZXM6IChzdHJpbmcgfCB1bmRlZmluZWQpW10gPSAoKCkgPT4ge1xuICBjb25zdCBuYW1lcyA9IFtdO1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhMT0NBVElPTlMpKSB7XG4gICAgY29uc3QgW2lkLCBuYW1lXSA9IChMT0NBVElPTlMgYXMgYW55KVtrZXldO1xuICAgIG5hbWVzW2lkXSA9IG5hbWU7XG4gIH1cbiAgcmV0dXJuIG5hbWVzO1xufSkoKTtcblxuY29uc3QgbG9jYXRpb25LZXlzOiAoa2V5b2YgdHlwZW9mIExPQ0FUSU9OUyB8IHVuZGVmaW5lZClbXSA9ICgoKSA9PiB7XG4gIGNvbnN0IGtleXMgPSBbXTtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoTE9DQVRJT05TKSkge1xuICAgIGNvbnN0IFtpZF0gPSAoTE9DQVRJT05TIGFzIGFueSlba2V5XTtcbiAgICBrZXlzW2lkXSA9IGtleTtcbiAgfVxuICByZXR1cm4ga2V5cyBhcyBhbnk7XG59KSgpO1xuXG5cbi8vIGJ1aWxkaW5nIHRoZSBDU1YgZm9yIHRoZSBsb2NhdGlvbiB0YWJsZS5cbi8vY29uc3QgaD0oeCk9Png9PW51bGw/J251bGwnOickJyt4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApO1xuLy8naWQsbmFtZSxiZ20sd2lkdGgsaGVpZ2h0LGFuaW1hdGlvbixleHRlbmRlZCx0aWxlcGF0MCx0aWxlcGF0MSx0aWxlcGFsMCx0aWxlcGFsMSx0aWxlc2V0LHRpbGUgZWZmZWN0cyxleGl0cyxzcHJwYXQwLHNwcnBhdDEsc3BycGFsMCxzcHJwYWwxLG9iajBkLG9iajBlLG9iajBmLG9iajEwLG9iajExLG9iajEyLG9iajEzLG9iajE0LG9iajE1LG9iajE2LG9iajE3LG9iajE4LG9iajE5LG9iajFhLG9iajFiLG9iajFjLG9iajFkLG9iajFlLG9iajFmXFxuJytyb20ubG9jYXRpb25zLm1hcChsPT4hbHx8IWwudXNlZD8nJzpbaChsLmlkKSxsLm5hbWUsaChsLmJnbSksbC5sYXlvdXRXaWR0aCxsLmxheW91dEhlaWdodCxsLmFuaW1hdGlvbixsLmV4dGVuZGVkLGgoKGwudGlsZVBhdHRlcm5zfHxbXSlbMF0pLGgoKGwudGlsZVBhdHRlcm5zfHxbXSlbMV0pLGgoKGwudGlsZVBhbGV0dGVzfHxbXSlbMF0pLGgoKGwudGlsZVBhbGV0dGVzfHxbXSlbMV0pLGgobC50aWxlc2V0KSxoKGwudGlsZUVmZmVjdHMpLFsuLi5uZXcgU2V0KGwuZXhpdHMubWFwKHg9PmgoeFsyXSkpKV0uam9pbignOicpLGgoKGwuc3ByaXRlUGF0dGVybnN8fFtdKVswXSksaCgobC5zcHJpdGVQYXR0ZXJuc3x8W10pWzFdKSxoKChsLnNwcml0ZVBhbGV0dGVzfHxbXSlbMF0pLGgoKGwuc3ByaXRlUGFsZXR0ZXN8fFtdKVsxXSksLi4ubmV3IEFycmF5KDE5KS5maWxsKDApLm1hcCgodixpKT0+KChsLm9iamVjdHN8fFtdKVtpXXx8W10pLnNsaWNlKDIpLm1hcCh4PT54LnRvU3RyaW5nKDE2KSkuam9pbignOicpKV0pLmZpbHRlcih4PT54KS5qb2luKCdcXG4nKVxuXG4vLyBidWlsZGluZyBjc3YgZm9yIGxvYy1vYmogY3Jvc3MtcmVmZXJlbmNlIHRhYmxlXG4vLyBzZXE9KHMsZSxmKT0+bmV3IEFycmF5KGUtcykuZmlsbCgwKS5tYXAoKHgsaSk9PmYoaStzKSk7XG4vLyB1bmlxPShhcnIpPT57XG4vLyAgIGNvbnN0IG09e307XG4vLyAgIGZvciAobGV0IG8gb2YgYXJyKSB7XG4vLyAgICAgb1s2XT1vWzVdPzE6MDtcbi8vICAgICBpZighb1s1XSltW29bMl1dPShtW29bMl1dfHwwKSsxO1xuLy8gICB9XG4vLyAgIGZvciAobGV0IG8gb2YgYXJyKSB7XG4vLyAgICAgaWYob1syXSBpbiBtKW9bNl09bVtvWzJdXTtcbi8vICAgICBkZWxldGUgbVtvWzJdXTtcbi8vICAgfVxuLy8gICByZXR1cm4gYXJyO1xuLy8gfVxuLy8gJ2xvYyxsb2NuYW1lLG1vbixtb25uYW1lLHNwYXduLHR5cGUsdW5pcSxwYXRzbG90LHBhdCxwYWxzbG90LHBhbDIscGFsM1xcbicrXG4vLyByb20ubG9jYXRpb25zLmZsYXRNYXAobD0+IWx8fCFsLnVzZWQ/W106dW5pcShzZXEoMHhkLDB4MjAscz0+e1xuLy8gICBjb25zdCBvPShsLm9iamVjdHN8fFtdKVtzLTB4ZF18fG51bGw7XG4vLyAgIGlmICghbykgcmV0dXJuIG51bGw7XG4vLyAgIGNvbnN0IHR5cGU9b1syXSY3O1xuLy8gICBjb25zdCBtPXR5cGU/bnVsbDoweDUwK29bM107XG4vLyAgIGNvbnN0IHBhdFNsb3Q9b1syXSYweDgwPzE6MDtcbi8vICAgY29uc3QgbW9uPW0/cm9tLm9iamVjdHNbbV06bnVsbDtcbi8vICAgY29uc3QgcGFsU2xvdD0obW9uP21vbi5wYWxldHRlcyhmYWxzZSk6W10pWzBdO1xuLy8gICBjb25zdCBhbGxQYWw9bmV3IFNldChtb24/bW9uLnBhbGV0dGVzKHRydWUpOltdKTtcbi8vICAgcmV0dXJuIFtoKGwuaWQpLGwubmFtZSxoKG0pLCcnLGgocyksdHlwZSwwLHBhdFNsb3QsbT9oKChsLnNwcml0ZVBhdHRlcm5zfHxbXSlbcGF0U2xvdF0pOicnLHBhbFNsb3QsYWxsUGFsLmhhcygyKT9oKChsLnNwcml0ZVBhbGV0dGVzfHxbXSlbMF0pOicnLGFsbFBhbC5oYXMoMyk/aCgobC5zcHJpdGVQYWxldHRlc3x8W10pWzFdKTonJ107XG4vLyB9KS5maWx0ZXIoeD0+eCkpKS5tYXAoYT0+YS5qb2luKCcsJykpLmZpbHRlcih4PT54KS5qb2luKCdcXG4nKTtcblxuLyoqXG4gKiBMb2NhdGlvbnMgd2l0aCBjYXZlIHN5c3RlbXMgdGhhdCBzaG91bGQgYWxsIGJlIHRyZWF0ZWQgYXMgbmVpZ2hib3JpbmcuXG4gKi9cbmNvbnN0IE5FWFVTRVM6IHtbVCBpbiBrZXlvZiB0eXBlb2YgTE9DQVRJT05TXT86IHRydWV9ID0ge1xuICBtdFNhYnJlV2VzdExvd2VyOiB0cnVlLFxuICBtdFNhYnJlV2VzdFVwcGVyOiB0cnVlLFxuICBtdFNhYnJlTm9ydGhNYWluOiB0cnVlLFxuICBtdFNhYnJlTm9ydGhNaWRkbGU6IHRydWUsXG4gIG10U2FicmVOb3J0aENhdmUxOiB0cnVlLFxuICBtdFNhYnJlTm9ydGhDYXZlMjogdHJ1ZSxcbiAgbXRIeWRyYTogdHJ1ZSxcbiAgbXRIeWRyYU91dHNpZGVTaHlyb246IHRydWUsXG4gIG10SHlkcmFDYXZlMTogdHJ1ZSxcbn07XG5cbmNvbnN0IEJPU1NfU0NSRUVOUzoge1tUIGluIGtleW9mIHR5cGVvZiBMT0NBVElPTlNdPzogbnVtYmVyfSA9IHtcbiAgc2VhbGVkQ2F2ZTc6IDB4OTEsXG4gIHN3YW1wOiAweDdjLFxuICBtdFNhYnJlTm9ydGhNYWluOiAweGI1LFxuICBzYWJlcmFQYWxhY2UxOiAweGZkLFxuICBzYWJlcmFQYWxhY2UzOiAweGZkLFxuICBzaHlyb25Gb3J0cmVzczogMHg3MCxcbiAgZ29hRm9ydHJlc3NLZWxiZXNxdWU6IDB4NzMsXG4gIGdvYUZvcnRyZXNzVG9ybmVsOiAweDkxLFxuICBnb2FGb3J0cmVzc0FzaW5hOiAweDkxLFxuICBnb2FGb3J0cmVzc0thcm1pbmU3OiAweGZkLFxuICBweXJhbWlkRHJheWdvbjogMHhmOSxcbiAgY3J5cHREcmF5Z29uMjogMHhmYSxcbiAgdG93ZXJEeW5hOiAweDVjLFxufTtcbiJdfQ==