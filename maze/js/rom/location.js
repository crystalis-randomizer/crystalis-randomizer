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
                , , , pats[0], pats[1],
                this.animation,
            ];
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
            sets.add(map.get(id));
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
    screen: DataTuple.prop([0, 0xf0], [1, 0xf0, 4]),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFFbkMsT0FBTyxFQUFPLFNBQVMsRUFDZixlQUFlLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFDN0MsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUs1RCxNQUFNLE9BQU8sUUFBUyxTQUFRLE1BQU07SUF3Q2xDLFlBQVksR0FBUSxFQUFFLEVBQVU7UUFFOUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVmLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBRTNFLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekMsSUFBSSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQVMsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBRXJELElBQUksQ0FBQyxVQUFVLEdBQUcs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LElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztLQUM5RDtJQUNELElBQUksQ0FBQyxFQUFFO1FBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztLQUM5RDtJQUNELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFO1FBQ2pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDN0Q7SUFDRCxJQUFJLENBQUMsRUFBRTtRQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDN0Q7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDeEMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXJDLE1BQU0sRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxF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QztJQUVoQyxDQUFDLEVBQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQyxFQUFFLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFHbkMsRUFBRSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixNQUFNLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTNCLFFBQVE7UUFDTixPQUFPLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FDcEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQzNCLENBQUM7Q0FDRixDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDbkMsTUFBTSxFQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLElBQUksRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWxDLE1BQU0sRUFBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQyxJQUFJLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVsQyxJQUFJLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVCLFFBQVE7UUFDTixPQUFPLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFDM0QsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsRSxDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBR0gsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQ3JDLENBQUMsRUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLEVBQUUsRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFMUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUMsRUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRCxFQUFFLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVoQyxNQUFNLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0MsSUFBSSxFQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFaEQsV0FBVyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLElBQUksRUFBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBS2hDLEVBQUUsRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFMUIsSUFBSSxFQUFFLEVBQUMsR0FBRyxLQUF1QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN6RCxHQUFHLENBQVksSUFBYSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztJQUN6RSxTQUFTLEVBQUUsRUFBQyxHQUFHLEtBQXNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDMUQsR0FBRyxDQUFZLEVBQVUsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztJQUV6RSxPQUFPLEtBQXVCLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLFdBQVc7UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQ0QsU0FBUyxLQUF1QixPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM1RSxLQUFLLEtBQXVCLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLE1BQU0sS0FBdUIsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDekUsU0FBUyxLQUF1QixPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6RCxNQUFNO1FBQ0osT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFDRCxRQUFRO1FBQ04sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUMvQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDMUQsSUFBSSxHQUFHLElBQUksQ0FBQztZQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3hCLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDdkMsQ0FBQztJQUNELFdBQVc7UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQixDQUFDO0lBQ0QsUUFBUTtRQUNOLE9BQU8sU0FBUyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUN4RSxDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBR0gsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHO0lBQ3ZCLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUM7SUFDckMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLENBQUM7SUFDaEQsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUNwQixZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUM7SUFDdEMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQztJQUNwQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDO0lBQ3BDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUM7SUFDcEMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQztJQUNwQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDO0lBQ3BDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUM7SUFDcEMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQztJQUVwQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDO0lBRXBDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUM7SUFDckMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQztJQUM1QixRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDO0lBQzdCLGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBR2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO0lBQzlDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO0lBRzlDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUM7SUFDNUIsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUM7SUFDOUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQztJQUN0QixRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO0lBQzVCLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7SUFFbEIsU0FBUyxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQztJQUUvQixnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQztJQUNqRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQztJQUNqRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztJQUNsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztJQUNsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztJQUNsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztJQUNsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztJQUNsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztJQUNsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQztJQUNqRCxrQkFBa0IsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNyRCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNwRCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNwRCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNwRCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNwRCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNwRCxzQkFBc0IsRUFBRSxDQUFDLElBQUksRUFBRSw4QkFBOEIsQ0FBQztJQUM5RCxvQkFBb0IsRUFBRSxDQUFDLElBQUksRUFBRSw0QkFBNEIsQ0FBQztJQUMxRCxxQkFBcUIsRUFBRSxDQUFDLElBQUksRUFBRSw4QkFBOEIsQ0FBQztJQUM3RCxxQkFBcUIsRUFBRSxDQUFDLElBQUksRUFBRSw2QkFBNkIsQ0FBQztJQUM1RCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNwRCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNwRCxzQkFBc0IsRUFBRSxDQUFDLElBQUksRUFBRSw4QkFBOEIsQ0FBQztJQUc5RCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUNwRCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUdwRCxTQUFTLEVBQUUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDO0lBQ2pDLGNBQWMsRUFBRSxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQztJQUM1QyxjQUFjLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUM7SUFFNUMsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUM7SUFDdEQsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUM7SUFDdEQsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDO0lBQzFDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztJQUN0QyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQztJQUMvQyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQztJQUMvQyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQztJQUMvQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDO0lBQ3JDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztJQUN2QyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUM7SUFDdkMsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDO0lBQ3ZDLGtCQUFrQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ3BELFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztJQUN2QyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUM7SUFDdkMsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDO0lBQ3ZDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztJQUN2QyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO0lBQ3hCLHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLDJCQUEyQixDQUFDO0lBQzFELFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUM7SUFFbkMsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDO0lBQzFDLGNBQWMsRUFBRSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQztJQUMxQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUM7SUFDMUMsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDO0lBQzFDLGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQztJQUN6QyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDO0lBQ3pCLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUM7SUFDekIsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQztJQUN6QixpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQztJQUNsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQztJQUNoRCxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDO0lBQ25DLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUM7SUFDakMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQztJQUM3QixTQUFTLEVBQUUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDO0lBQy9CLGNBQWMsRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztJQUUzQyxrQkFBa0IsRUFBRSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQztJQUNqRCxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDO0lBR2pDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDO0lBQ2pELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDO0lBQ2pELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDO0lBQ2pELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDO0lBQ2pELGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztJQUN4QyxhQUFhLEVBQUUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUM7SUFDeEMsYUFBYSxFQUFFLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDO0lBRXhDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2xELElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7SUFDcEIsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUNwQixRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDO0lBSy9CLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUM7SUFJL0IsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQztJQUMzQixZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUM7SUFDekMsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLENBQUM7SUFDekQsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDO0lBQ3pDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztJQUN6QyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUM7SUFDekMsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDO0lBQ3pDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztJQUN6QyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUM7SUFDekMsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDO0lBQ3pDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztJQUN6QyxhQUFhLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUM7SUFDM0MsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztJQUN2QixLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO0lBQ3ZCLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUM7SUFFdkIsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztJQUV4QixHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO0lBQ2xCLHdCQUF3QixFQUFFLENBQUMsSUFBSSxFQUFFLCtCQUErQixDQUFDO0lBQ2pFLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUM7SUFDM0IsYUFBYSxFQUFFLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDO0lBQzFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUM7SUFDcEMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztJQUN4QixpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQztJQUNsRCxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDO0lBQ3BDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUM7SUFFckMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQztJQUkzQixlQUFlLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUM7SUFDN0MsYUFBYSxFQUFFLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDO0lBQ3pDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztJQUNyQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUM7SUFDM0MsYUFBYSxFQUFFLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDO0lBQ3pDLFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztJQUNwQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUM7SUFDckMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUM7SUFDakQsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLENBQUM7SUFDbkQsVUFBVSxFQUFFLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDO0lBQ3BDLGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztJQUMxQyxlQUFlLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUM7SUFDN0MsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUM7SUFDdEQsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLENBQUM7SUFDeEQsZUFBZSxFQUFFLENBQUMsSUFBSSxFQUFFLHFCQUFxQixDQUFDO0lBQzlDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2xELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2pELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2pELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2pELG1CQUFtQixFQUFFLENBQUMsSUFBSSxFQUFFLDBCQUEwQixDQUFDO0lBQ3ZELG1CQUFtQixFQUFFLENBQUMsSUFBSSxFQUFFLDBCQUEwQixDQUFDO0lBQ3ZELG1CQUFtQixFQUFFLENBQUMsSUFBSSxFQUFFLDBCQUEwQixDQUFDO0lBQ3ZELG1CQUFtQixFQUFFLENBQUMsSUFBSSxFQUFFLDBCQUEwQixDQUFDO0lBQ3ZELG1CQUFtQixFQUFFLENBQUMsSUFBSSxFQUFFLDBCQUEwQixDQUFDO0lBQ3ZELG1CQUFtQixFQUFFLENBQUMsSUFBSSxFQUFFLDBCQUEwQixDQUFDO0lBQ3ZELG1CQUFtQixFQUFFLENBQUMsSUFBSSxFQUFFLDBCQUEwQixDQUFDO0lBQ3ZELGVBQWUsRUFBRSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQztJQUM5QyxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQztJQUNsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQztJQUNoRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQztJQUNoRCxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDO0lBQy9CLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUM7SUFFM0IsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDO0lBQ3RDLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUM7SUFDakMsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO0lBQzVDLGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztJQUMxQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDO0lBQzdCLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQztJQUN4QyxhQUFhLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUM7SUFDMUMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLENBQUM7SUFDaEQsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDO0lBQzNDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDO0lBQ2hELFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztJQUNyQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQztJQUVsRCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQztJQUVoRCxhQUFhLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUM7SUFDMUMsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO0lBQzVDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztJQUN0QyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDO0lBQzNCLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztJQUNyQyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQztJQUNoRCxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQztJQUNsRCxhQUFhLEVBQUUsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUM7SUFDekMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztJQUN4QixvQkFBb0IsRUFBRSxDQUFDLElBQUksRUFBRSwwQkFBMEIsQ0FBQztJQUN4RCxvQkFBb0IsRUFBRSxDQUFDLElBQUksRUFBRSwwQkFBMEIsQ0FBQztJQUN4RCxtQkFBbUIsRUFBRSxDQUFDLElBQUksRUFBRSx5QkFBeUIsQ0FBQztJQUN0RCxjQUFjLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUM7SUFDNUMsZUFBZSxFQUFFLENBQUMsSUFBSSxFQUFFLHFCQUFxQixDQUFDO0lBRTlDLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUM7SUFDakMsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO0lBQzVDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDO0lBQ2hELHNCQUFzQixFQUFFLENBQUMsSUFBSSxFQUFFLDZCQUE2QixDQUFDO0lBQzdELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2xELGVBQWUsRUFBRSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQztJQUM5Qyx1QkFBdUIsRUFBRSxDQUFDLElBQUksRUFBRSw2QkFBNkIsQ0FBQztJQUM5RCxjQUFjLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUM7SUFDNUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQztJQUMvQixZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUM7SUFFeEMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQztJQUM3QixlQUFlLEVBQUUsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUM7SUFDOUMsdUJBQXVCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLENBQUM7SUFFL0QsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDO0lBQ3hDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztJQUN0QyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDO0lBQzdCLGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztJQUMxQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDO0lBQ25DLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQztJQUN4QyxhQUFhLEVBQUUsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUM7SUFDMUMsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDO0lBQzNDLGtCQUFrQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ3BELGNBQWMsRUFBRSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztJQUMzQyxlQUFlLEVBQUUsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUM7SUFDOUMsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO0lBQzVDLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUM7SUFDakMsU0FBUyxFQUFFLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQztJQUNqQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUM7SUFDNUMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLENBQUM7SUFDaEQsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO0NBQ3BDLENBQUM7QUFxQlgsTUFBTSxhQUFhLEdBQTJCLENBQUMsR0FBRyxFQUFFO0lBQ2xELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNqQixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDeEMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBSSxTQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLEtBQUssQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7S0FDbEI7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFTCxNQUFNLFlBQVksR0FBMkMsQ0FBQyxHQUFHLEVBQUU7SUFDakUsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUksU0FBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDO0tBQ2hCO0lBQ0QsT0FBTyxJQUFXLENBQUM7QUFDckIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQXFDTCxNQUFNLE9BQU8sR0FBMkM7SUFDdEQsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsa0JBQWtCLEVBQUUsSUFBSTtJQUN4QixpQkFBaUIsRUFBRSxJQUFJO0lBQ3ZCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsT0FBTyxFQUFFLElBQUk7SUFDYixvQkFBb0IsRUFBRSxJQUFJO0lBQzFCLFlBQVksRUFBRSxJQUFJO0NBQ25CLENBQUM7QUFFRixNQUFNLFlBQVksR0FBNkM7SUFDN0QsV0FBVyxFQUFFLElBQUk7SUFDakIsS0FBSyxFQUFFLElBQUk7SUFDWCxnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLG9CQUFvQixFQUFFLElBQUk7SUFDMUIsaUJBQWlCLEVBQUUsSUFBSTtJQUN2QixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLG1CQUFtQixFQUFFLElBQUk7SUFDekIsY0FBYyxFQUFFLElBQUk7SUFDcEIsYUFBYSxFQUFFLElBQUk7SUFDbkIsU0FBUyxFQUFFLElBQUk7Q0FDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RW50aXR5fSBmcm9tICcuL2VudGl0eS5qcyc7XG5pbXBvcnQge1NjcmVlbn0gZnJvbSAnLi9zY3JlZW4uanMnO1xuaW1wb3J0IHtEYXRhLCBEYXRhVHVwbGUsXG4gICAgICAgIGNvbmNhdEl0ZXJhYmxlcywgZ3JvdXAsIGhleCwgcmVhZExpdHRsZUVuZGlhbixcbiAgICAgICAgc2VxLCB0dXBsZSwgdmFyU2xpY2UsIHdyaXRlTGl0dGxlRW5kaWFufSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtXcml0ZXJ9IGZyb20gJy4vd3JpdGVyLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHsgVW5pb25GaW5kIH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7IGl0ZXJzLCBhc3NlcnROZXZlciwgRGVmYXVsdE1hcCB9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICcuLi9yYW5kb20uanMnO1xuXG4vLyBMb2NhdGlvbiBlbnRpdGllc1xuZXhwb3J0IGNsYXNzIExvY2F0aW9uIGV4dGVuZHMgRW50aXR5IHtcblxuICB1c2VkOiBib29sZWFuO1xuICBuYW1lOiBzdHJpbmc7XG4gIGtleToga2V5b2YgdHlwZW9mIExPQ0FUSU9OUztcblxuICBwcml2YXRlIHJlYWRvbmx5IG1hcERhdGFQb2ludGVyOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWFwRGF0YUJhc2U6IG51bWJlcjtcblxuICBwcml2YXRlIHJlYWRvbmx5IGxheW91dEJhc2U6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBncmFwaGljc0Jhc2U6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBlbnRyYW5jZXNCYXNlOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgZXhpdHNCYXNlOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmxhZ3NCYXNlOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGl0c0Jhc2U6IG51bWJlcjtcblxuICBiZ206IG51bWJlcjtcbiAgbGF5b3V0V2lkdGg6IG51bWJlcjtcbiAgbGF5b3V0SGVpZ2h0OiBudW1iZXI7XG4gIGFuaW1hdGlvbjogbnVtYmVyO1xuICBleHRlbmRlZDogbnVtYmVyO1xuICBzY3JlZW5zOiBudW1iZXJbXVtdO1xuXG4gIHRpbGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgdGlsZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gIHRpbGVzZXQ6IG51bWJlcjtcbiAgdGlsZUVmZmVjdHM6IG51bWJlcjtcblxuICBlbnRyYW5jZXM6IEVudHJhbmNlW107XG4gIGV4aXRzOiBFeGl0W107XG4gIGZsYWdzOiBGbGFnW107XG4gIHBpdHM6IFBpdFtdO1xuXG4gIGhhc1NwYXduczogYm9vbGVhbjtcbiAgbnBjRGF0YVBvaW50ZXI6IG51bWJlcjtcbiAgbnBjRGF0YUJhc2U6IG51bWJlcjtcbiAgc3ByaXRlUGFsZXR0ZXM6IFtudW1iZXIsIG51bWJlcl07XG4gIHNwcml0ZVBhdHRlcm5zOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzcGF3bnM6IFNwYXduW107XG5cbiAgY29uc3RydWN0b3Iocm9tOiBSb20sIGlkOiBudW1iZXIpIHtcbiAgICAvLyB3aWxsIGluY2x1ZGUgYm90aCBNYXBEYXRhICphbmQqIE5wY0RhdGEsIHNpbmNlIHRoZXkgc2hhcmUgYSBrZXkuXG4gICAgc3VwZXIocm9tLCBpZCk7XG5cbiAgICB0aGlzLm1hcERhdGFQb2ludGVyID0gMHgxNDMwMCArIChpZCA8PCAxKTtcbiAgICB0aGlzLm1hcERhdGFCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFQb2ludGVyKSArIDB4YzAwMDtcbiAgICAvLyBUT0RPIC0gcGFzcyB0aGlzIGluIGFuZCBtb3ZlIExPQ0FUSU9OUyB0byBsb2NhdGlvbnMudHNcbiAgICB0aGlzLm5hbWUgPSBsb2NhdGlvbk5hbWVzW3RoaXMuaWRdIHx8ICcnO1xuICAgIHRoaXMua2V5ID0gbG9jYXRpb25LZXlzW3RoaXMuaWRdIHx8ICcnIGFzIGFueTtcbiAgICB0aGlzLnVzZWQgPSB0aGlzLm1hcERhdGFCYXNlID4gMHhjMDAwICYmICEhdGhpcy5uYW1lO1xuXG4gICAgdGhpcy5sYXlvdXRCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFCYXNlKSArIDB4YzAwMDtcbiAgICB0aGlzLmdyYXBoaWNzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhQmFzZSArIDIpICsgMHhjMDAwO1xuICAgIHRoaXMuZW50cmFuY2VzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhQmFzZSArIDQpICsgMHhjMDAwO1xuICAgIHRoaXMuZXhpdHNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFCYXNlICsgNikgKyAweGMwMDA7XG4gICAgdGhpcy5mbGFnc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UgKyA4KSArIDB4YzAwMDtcblxuICAgIC8vIFJlYWQgdGhlIGV4aXRzIGZpcnN0IHNvIHRoYXQgd2UgY2FuIGRldGVybWluZSBpZiB0aGVyZSdzIGVudHJhbmNlL3BpdHNcbiAgICAvLyBtZXRhZGF0YSBlbmNvZGVkIGF0IHRoZSBlbmQuXG4gICAgbGV0IGhhc1BpdHMgPSB0aGlzLmxheW91dEJhc2UgIT09IHRoaXMubWFwRGF0YUJhc2UgKyAxMDtcbiAgICBsZXQgZW50cmFuY2VMZW4gPSB0aGlzLmV4aXRzQmFzZSAtIHRoaXMuZW50cmFuY2VzQmFzZTtcbiAgICB0aGlzLmV4aXRzID0gKCgpID0+IHtcbiAgICAgIGNvbnN0IGV4aXRzID0gW107XG4gICAgICBsZXQgaSA9IHRoaXMuZXhpdHNCYXNlO1xuICAgICAgd2hpbGUgKCEocm9tLnByZ1tpXSAmIDB4ODApKSB7XG4gICAgICAgIGV4aXRzLnB1c2gobmV3IEV4aXQocm9tLnByZy5zbGljZShpLCBpICsgNCkpKTtcbiAgICAgICAgaSArPSA0O1xuICAgICAgfVxuICAgICAgaWYgKHJvbS5wcmdbaV0gIT09IDB4ZmYpIHtcbiAgICAgICAgaGFzUGl0cyA9ICEhKHJvbS5wcmdbaV0gJiAweDQwKTtcbiAgICAgICAgZW50cmFuY2VMZW4gPSAocm9tLnByZ1tpXSAmIDB4MWYpIDw8IDI7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXhpdHM7XG4gICAgfSkoKTtcblxuICAgIC8vIFRPRE8gLSB0aGVzZSBoZXVyaXN0aWNzIHdpbGwgbm90IHdvcmsgdG8gcmUtcmVhZCB0aGUgbG9jYXRpb25zLlxuICAgIC8vICAgICAgLSB3ZSBjYW4gbG9vayBhdCB0aGUgb3JkZXI6IGlmIHRoZSBkYXRhIGlzIEJFRk9SRSB0aGUgcG9pbnRlcnNcbiAgICAvLyAgICAgICAgdGhlbiB3ZSdyZSBpbiBhIHJld3JpdHRlbiBzdGF0ZTsgaW4gdGhhdCBjYXNlLCB3ZSBuZWVkIHRvIHNpbXBseVxuICAgIC8vICAgICAgICBmaW5kIGFsbCByZWZzIGFuZCBtYXguLi4/XG4gICAgLy8gICAgICAtIGNhbiB3ZSByZWFkIHRoZXNlIHBhcnRzIGxhemlseT9cbiAgICB0aGlzLnBpdHNCYXNlID0gIWhhc1BpdHMgPyAwIDpcbiAgICAgICAgcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFCYXNlICsgMTApICsgMHhjMDAwO1xuXG4gICAgdGhpcy5iZ20gPSByb20ucHJnW3RoaXMubGF5b3V0QmFzZV07XG4gICAgdGhpcy5sYXlvdXRXaWR0aCA9IHJvbS5wcmdbdGhpcy5sYXlvdXRCYXNlICsgMV07XG4gICAgdGhpcy5sYXlvdXRIZWlnaHQgPSByb20ucHJnW3RoaXMubGF5b3V0QmFzZSArIDJdO1xuICAgIHRoaXMuYW5pbWF0aW9uID0gcm9tLnByZ1t0aGlzLmxheW91dEJhc2UgKyAzXTtcbiAgICB0aGlzLmV4dGVuZGVkID0gcm9tLnByZ1t0aGlzLmxheW91dEJhc2UgKyA0XTtcbiAgICB0aGlzLnNjcmVlbnMgPSBzZXEoXG4gICAgICAgIHRoaXMuaGVpZ2h0LFxuICAgICAgICB5ID0+IHR1cGxlKHJvbS5wcmcsIHRoaXMubGF5b3V0QmFzZSArIDUgKyB5ICogdGhpcy53aWR0aCwgdGhpcy53aWR0aCkpO1xuICAgIHRoaXMudGlsZVBhbGV0dGVzID0gdHVwbGU8bnVtYmVyPihyb20ucHJnLCB0aGlzLmdyYXBoaWNzQmFzZSwgMyk7XG4gICAgdGhpcy50aWxlc2V0ID0gcm9tLnByZ1t0aGlzLmdyYXBoaWNzQmFzZSArIDNdO1xuICAgIHRoaXMudGlsZUVmZmVjdHMgPSByb20ucHJnW3RoaXMuZ3JhcGhpY3NCYXNlICsgNF07XG4gICAgdGhpcy50aWxlUGF0dGVybnMgPSB0dXBsZShyb20ucHJnLCB0aGlzLmdyYXBoaWNzQmFzZSArIDUsIDIpO1xuXG4gICAgdGhpcy5lbnRyYW5jZXMgPVxuICAgICAgZ3JvdXAoNCwgcm9tLnByZy5zbGljZSh0aGlzLmVudHJhbmNlc0Jhc2UsIHRoaXMuZW50cmFuY2VzQmFzZSArIGVudHJhbmNlTGVuKSxcbiAgICAgICAgICAgIHggPT4gbmV3IEVudHJhbmNlKHgpKTtcbiAgICB0aGlzLmZsYWdzID0gdmFyU2xpY2Uocm9tLnByZywgdGhpcy5mbGFnc0Jhc2UsIDIsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IG5ldyBGbGFnKHgpKTtcbiAgICB0aGlzLnBpdHMgPSB0aGlzLnBpdHNCYXNlID8gdmFyU2xpY2Uocm9tLnByZywgdGhpcy5waXRzQmFzZSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gbmV3IFBpdCh4KSkgOiBbXTtcblxuICAgIHRoaXMubnBjRGF0YVBvaW50ZXIgPSAweDE5MjAxICsgKGlkIDw8IDEpO1xuICAgIHRoaXMubnBjRGF0YUJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubnBjRGF0YVBvaW50ZXIpICsgMHgxMDAwMDtcbiAgICB0aGlzLmhhc1NwYXducyA9IHRoaXMubnBjRGF0YUJhc2UgIT09IDB4MTAwMDA7XG4gICAgdGhpcy5zcHJpdGVQYWxldHRlcyA9XG4gICAgICAgIHRoaXMuaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgdGhpcy5ucGNEYXRhQmFzZSArIDEsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3ByaXRlUGF0dGVybnMgPVxuICAgICAgICB0aGlzLmhhc1NwYXducyA/IHR1cGxlKHJvbS5wcmcsIHRoaXMubnBjRGF0YUJhc2UgKyAzLCAyKSA6IFswLCAwXTtcbiAgICB0aGlzLnNwYXducyA9XG4gICAgICAgIHRoaXMuaGFzU3Bhd25zID8gdmFyU2xpY2Uocm9tLnByZywgdGhpcy5ucGNEYXRhQmFzZSArIDUsIDQsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gbmV3IFNwYXduKHgpKSA6IFtdO1xuICB9XG5cbiAgc3Bhd24oaWQ6IG51bWJlcik6IFNwYXduIHtcbiAgICBjb25zdCBzcGF3biA9IHRoaXMuc3Bhd25zW2lkIC0gMHhkXTtcbiAgICBpZiAoIXNwYXduKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHNwYXduICQke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHNwYXduO1xuICB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmxheW91dFdpZHRoICsgMTsgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlcikgeyB0aGlzLmxheW91dFdpZHRoID0gd2lkdGggLSAxOyB9XG5cbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sYXlvdXRIZWlnaHQgKyAxOyB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHsgdGhpcy5sYXlvdXRIZWlnaHQgPSBoZWlnaHQgLSAxOyB9XG5cbiAgLy8gbW9uc3RlcnMoKSB7XG4gIC8vICAgaWYgKCF0aGlzLnNwYXducykgcmV0dXJuIFtdO1xuICAvLyAgIHJldHVybiB0aGlzLnNwYXducy5mbGF0TWFwKFxuICAvLyAgICAgKFssLCB0eXBlLCBpZF0sIHNsb3QpID0+XG4gIC8vICAgICAgIHR5cGUgJiA3IHx8ICF0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXSA/IFtdIDogW1xuICAvLyAgICAgICAgIFt0aGlzLmlkLFxuICAvLyAgICAgICAgICBzbG90ICsgMHgwZCxcbiAgLy8gICAgICAgICAgdHlwZSAmIDB4ODAgPyAxIDogMCxcbiAgLy8gICAgICAgICAgaWQgKyAweDUwLFxuICAvLyAgICAgICAgICB0aGlzLnNwcml0ZVBhdHRlcm5zW3R5cGUgJiAweDgwID8gMSA6IDBdLFxuICAvLyAgICAgICAgICB0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXS5wYWxldHRlcygpWzBdLFxuICAvLyAgICAgICAgICB0aGlzLnNwcml0ZVBhbGV0dGVzW3RoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdLnBhbGV0dGVzKClbMF0gLSAyXSxcbiAgLy8gICAgICAgICBdXSk7XG4gIC8vIH1cblxuICBhc3luYyB3cml0ZSh3cml0ZXI6IFdyaXRlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy51c2VkKSByZXR1cm47XG4gICAgY29uc3QgcHJvbWlzZXMgPSBbXTtcbiAgICBpZiAodGhpcy5oYXNTcGF3bnMpIHtcbiAgICAgIC8vIHdyaXRlIE5QQyBkYXRhIGZpcnN0LCBpZiBwcmVzZW50Li4uXG4gICAgICBjb25zdCBkYXRhID0gWzAsIC4uLnRoaXMuc3ByaXRlUGFsZXR0ZXMsIC4uLnRoaXMuc3ByaXRlUGF0dGVybnMsXG4gICAgICAgICAgICAgICAgICAgIC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLnNwYXducyksIDB4ZmZdO1xuICAgICAgcHJvbWlzZXMucHVzaChcbiAgICAgICAgICB3cml0ZXIud3JpdGUoZGF0YSwgMHgxODAwMCwgMHgxYmZmZiwgYE5wY0RhdGEgJHtoZXgodGhpcy5pZCl9YClcbiAgICAgICAgICAgICAgLnRoZW4oYWRkcmVzcyA9PiB3cml0ZUxpdHRsZUVuZGlhbihcbiAgICAgICAgICAgICAgICAgIHdyaXRlci5yb20sIHRoaXMubnBjRGF0YVBvaW50ZXIsIGFkZHJlc3MgLSAweDEwMDAwKSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHdyaXRlID0gKGRhdGE6IERhdGE8bnVtYmVyPiwgbmFtZTogc3RyaW5nKSA9PlxuICAgICAgICB3cml0ZXIud3JpdGUoZGF0YSwgMHgxNDAwMCwgMHgxN2ZmZiwgYCR7bmFtZX0gJHtoZXgodGhpcy5pZCl9YCk7XG4gICAgY29uc3QgbGF5b3V0ID0gW1xuICAgICAgdGhpcy5iZ20sXG4gICAgICB0aGlzLmxheW91dFdpZHRoLCB0aGlzLmxheW91dEhlaWdodCwgdGhpcy5hbmltYXRpb24sIHRoaXMuZXh0ZW5kZWQsXG4gICAgICAuLi5jb25jYXRJdGVyYWJsZXModGhpcy5zY3JlZW5zKV07XG4gICAgY29uc3QgZ3JhcGhpY3MgPVxuICAgICAgICBbLi4udGhpcy50aWxlUGFsZXR0ZXMsXG4gICAgICAgICB0aGlzLnRpbGVzZXQsIHRoaXMudGlsZUVmZmVjdHMsXG4gICAgICAgICAuLi50aGlzLnRpbGVQYXR0ZXJuc107XG4gICAgLy8gUXVpY2sgc2FuaXR5IGNoZWNrOiBpZiBhbiBlbnRyYW5jZS9leGl0IGlzIGJlbG93IHRoZSBIVUQgb24gYVxuICAgIC8vIG5vbi12ZXJ0aWNhbGx5IHNjcm9sbGluZyBtYXAsIHRoZW4gd2UgbmVlZCB0byBtb3ZlIGl0IHVwLlxuICAgIGlmICh0aGlzLmhlaWdodCA9PT0gMSkge1xuICAgICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgICBpZiAoZW50cmFuY2UueSA+IDB4YmYpIGVudHJhbmNlLnkgPSAweGJmO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgICAgaWYgKGV4aXQueXQgPiAweDBjKSBleGl0Lnl0ID0gMHgwYztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZW50cmFuY2VzID0gY29uY2F0SXRlcmFibGVzKHRoaXMuZW50cmFuY2VzKTtcbiAgICBjb25zdCBleGl0cyA9IFsuLi5jb25jYXRJdGVyYWJsZXModGhpcy5leGl0cyksXG4gICAgICAgICAgICAgICAgICAgMHg4MCB8ICh0aGlzLnBpdHMubGVuZ3RoID8gMHg0MCA6IDApIHwgdGhpcy5lbnRyYW5jZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgXTtcbiAgICBjb25zdCBmbGFncyA9IFsuLi5jb25jYXRJdGVyYWJsZXModGhpcy5mbGFncyksIDB4ZmZdO1xuICAgIGNvbnN0IHBpdHMgPSBjb25jYXRJdGVyYWJsZXModGhpcy5waXRzKTtcbiAgICBjb25zdCBbbGF5b3V0QWRkciwgZ3JhcGhpY3NBZGRyLCBlbnRyYW5jZXNBZGRyLCBleGl0c0FkZHIsIGZsYWdzQWRkciwgcGl0c0FkZHJdID1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgIHdyaXRlKGxheW91dCwgJ0xheW91dCcpLFxuICAgICAgICAgIHdyaXRlKGdyYXBoaWNzLCAnR3JhcGhpY3MnKSxcbiAgICAgICAgICB3cml0ZShlbnRyYW5jZXMsICdFbnRyYW5jZXMnKSxcbiAgICAgICAgICB3cml0ZShleGl0cywgJ0V4aXRzJyksXG4gICAgICAgICAgd3JpdGUoZmxhZ3MsICdGbGFncycpLFxuICAgICAgICAgIC4uLihwaXRzLmxlbmd0aCA/IFt3cml0ZShwaXRzLCAnUGl0cycpXSA6IFtdKSxcbiAgICAgICAgXSk7XG4gICAgY29uc3QgYWRkcmVzc2VzID0gW1xuICAgICAgbGF5b3V0QWRkciAmIDB4ZmYsIChsYXlvdXRBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICBncmFwaGljc0FkZHIgJiAweGZmLCAoZ3JhcGhpY3NBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICBlbnRyYW5jZXNBZGRyICYgMHhmZiwgKGVudHJhbmNlc0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGV4aXRzQWRkciAmIDB4ZmYsIChleGl0c0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGZsYWdzQWRkciAmIDB4ZmYsIChmbGFnc0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIC4uLihwaXRzQWRkciA/IFtwaXRzQWRkciAmIDB4ZmYsIChwaXRzQWRkciA+PiA4KSAtIDB4YzBdIDogW10pLFxuICAgIF07XG4gICAgY29uc3QgYmFzZSA9IGF3YWl0IHdyaXRlKGFkZHJlc3NlcywgJ01hcERhdGEnKTtcbiAgICB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCB0aGlzLm1hcERhdGFQb2ludGVyLCBiYXNlIC0gMHhjMDAwKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICAvLyBJZiB0aGlzIGlzIGEgYm9zcyByb29tLCB3cml0ZSB0aGUgcmVzdG9yYXRpb24uXG4gICAgY29uc3QgYm9zc0lkID0gdGhpcy5ib3NzSWQoKTtcbiAgICBpZiAoYm9zc0lkICE9IG51bGwgJiYgdGhpcy5pZCAhPT0gMHg1ZikgeyAvLyBkb24ndCByZXN0b3JlIGR5bmFcbiAgICAgIC8vIFRoaXMgdGFibGUgc2hvdWxkIHJlc3RvcmUgcGF0MCBidXQgbm90IHBhdDFcbiAgICAgIGxldCBwYXRzID0gW3RoaXMuc3ByaXRlUGF0dGVybnNbMF0sIHVuZGVmaW5lZF07XG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHhhNikgcGF0cyA9IFsweDUzLCAweDUwXTsgLy8gZHJheWdvbiAyXG4gICAgICBjb25zdCBib3NzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgMHgxZjk2YiArIDIgKiBib3NzSWQpICsgMHgxNDAwMDtcbiAgICAgIGNvbnN0IGJvc3NSZXN0b3JlID0gW1xuICAgICAgICAsLCwgdGhpcy5iZ20sLFxuICAgICAgICAuLi50aGlzLnRpbGVQYWxldHRlcywsLCwgdGhpcy5zcHJpdGVQYWxldHRlc1swXSwsXG4gICAgICAgICwsLCwgcGF0c1swXSwgcGF0c1sxXSxcbiAgICAgICAgdGhpcy5hbmltYXRpb24sXG4gICAgICBdO1xuXG4gICAgICAvLyBpZiAocmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBib3NzQmFzZSkgPT09IDB4YmE5OCkge1xuICAgICAgLy8gICAvLyBlc2NhcGUgYW5pbWF0aW9uOiBkb24ndCBjbG9iYmVyIHBhdHRlcm5zIHlldD9cbiAgICAgIC8vIH1cbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYm9zc1Jlc3RvcmUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgY29uc3QgcmVzdG9yZWQgPSBib3NzUmVzdG9yZVtqXTtcbiAgICAgICAgaWYgKHJlc3RvcmVkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICB3cml0ZXIucm9tW2Jvc3NCYXNlICsgal0gPSByZXN0b3JlZDtcbiAgICAgIH1cbiAgICAgIC8vIGxhdGVyIHNwb3QgZm9yIHBhbDMgYW5kIHBhdDEgKmFmdGVyKiBleHBsb3Npb25cbiAgICAgIGNvbnN0IGJvc3NCYXNlMiA9IDB4MWY3YzEgKyA1ICogYm9zc0lkO1xuICAgICAgd3JpdGVyLnJvbVtib3NzQmFzZTJdID0gdGhpcy5zcHJpdGVQYWxldHRlc1sxXTtcbiAgICAgIC8vIE5PVEU6IFRoaXMgcnVpbnMgdGhlIHRyZWFzdXJlIGNoZXN0LlxuICAgICAgLy8gVE9ETyAtIGFkZCBzb21lIGFzbSBhZnRlciBhIGNoZXN0IGlzIGNsZWFyZWQgdG8gcmVsb2FkIHBhdHRlcm5zP1xuICAgICAgLy8gQW5vdGhlciBvcHRpb24gd291bGQgYmUgdG8gYWRkIGEgbG9jYXRpb24tc3BlY2lmaWMgY29udHJhaW50IHRvIGJlXG4gICAgICAvLyB3aGF0ZXZlciB0aGUgYm9zcyBcbiAgICAgIC8vd3JpdGVyLnJvbVtib3NzQmFzZTIgKyAxXSA9IHRoaXMuc3ByaXRlUGF0dGVybnNbMV07XG4gICAgfVxuICB9XG5cbiAgYWxsU2NyZWVucygpOiBTZXQ8U2NyZWVuPiB7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBTZXQ8U2NyZWVuPigpO1xuICAgIGNvbnN0IGV4dCA9IHRoaXMuZXh0ZW5kZWQgPyAweDEwMCA6IDA7XG4gICAgZm9yIChjb25zdCByb3cgb2YgdGhpcy5zY3JlZW5zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiByb3cpIHtcbiAgICAgICAgc2NyZWVucy5hZGQodGhpcy5yb20uc2NyZWVuc1tzY3JlZW4gKyBleHRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNjcmVlbnM7XG4gIH1cblxuICBib3NzSWQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MGU7IGkrKykge1xuICAgICAgaWYgKHRoaXMucm9tLnByZ1sweDFmOTVkICsgaV0gPT09IHRoaXMuaWQpIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgbmVpZ2hib3JzKGpvaW5OZXh1c2VzOiBib29sZWFuID0gZmFsc2UpOiBTZXQ8TG9jYXRpb24+IHtcbiAgICBjb25zdCBvdXQgPSBuZXcgU2V0PExvY2F0aW9uPigpO1xuICAgIGNvbnN0IGFkZE5laWdoYm9ycyA9IChsOiBMb2NhdGlvbikgPT4ge1xuICAgICAgZm9yIChjb25zdCBleGl0IG9mIGwuZXhpdHMpIHtcbiAgICAgICAgY29uc3QgaWQgPSBleGl0LmRlc3Q7XG4gICAgICAgIGNvbnN0IG5laWdoYm9yID0gdGhpcy5yb20ubG9jYXRpb25zW2lkXTtcbiAgICAgICAgaWYgKG5laWdoYm9yICYmIG5laWdoYm9yLnVzZWQgJiZcbiAgICAgICAgICAgIG5laWdoYm9yICE9PSB0aGlzICYmICFvdXQuaGFzKG5laWdoYm9yKSkge1xuICAgICAgICAgIG91dC5hZGQobmVpZ2hib3IpO1xuICAgICAgICAgIGlmIChqb2luTmV4dXNlcyAmJiBORVhVU0VTW25laWdoYm9yLmtleV0pIHtcbiAgICAgICAgICAgIGFkZE5laWdoYm9ycyhuZWlnaGJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGFkZE5laWdoYm9ycyh0aGlzKTtcbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgaGFzRG9scGhpbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pZCA9PT0gMHg2MCB8fCB0aGlzLmlkID09PSAweDY0IHx8IHRoaXMuaWQgPT09IDB4Njg7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBNYXAgb2YgdGlsZXMgKCRZWHl4KSByZWFjaGFibGUgZnJvbSBhbnkgZW50cmFuY2UgdG9cbiAgICogdW5mbGFnZ2VkIHRpbGVlZmZlY3RzLlxuICAgKi9cbiAgcmVhY2hhYmxlVGlsZXMoZmx5ID0gZmFsc2UpOiBNYXA8bnVtYmVyLCBudW1iZXI+IHtcbiAgICAvLyBUT0RPIC0gYXJncyBmb3IgKDEpIHVzZSBub24tMmVmIGZsYWdzLCAoMikgb25seSBmcm9tIGdpdmVuIGVudHJhbmNlL3RpbGVcbiAgICAvLyBEb2xwaGluIG1ha2VzIE5PX1dBTEsgb2theSBmb3Igc29tZSBsZXZlbHMuXG4gICAgaWYgKHRoaXMuaGFzRG9scGhpbigpKSBmbHkgPSB0cnVlO1xuICAgIC8vIFRha2UgaW50byBhY2NvdW50IHRoZSB0aWxlc2V0IGFuZCBmbGFncyBidXQgbm90IGFueSBvdmVybGF5LlxuICAgIGNvbnN0IGV4aXRzID0gbmV3IFNldCh0aGlzLmV4aXRzLm1hcChleGl0ID0+IGV4aXQuc2NyZWVuIDw8IDggfCBleGl0LnRpbGUpKTtcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0KHRoaXMudGlsZXNldCk7XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1t0aGlzLnRpbGVFZmZlY3RzIC0gMHhiM107XG4gICAgY29uc3QgcGFzc2FibGUgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IHRoaXMuc2NyZWVuc1t5XTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbcm93W3hdIHwgKHRoaXMuZXh0ZW5kZWQgPyAweDEwMCA6IDApXTtcbiAgICAgICAgY29uc3QgcG9zID0geSA8PCA0IHwgeDtcbiAgICAgICAgY29uc3QgZmxhZyA9IHRoaXMuZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBwb3MpO1xuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDB4ZjA7IHQrKykge1xuICAgICAgICAgIGNvbnN0IHRpbGVJZCA9IHBvcyA8PCA4IHwgdDtcbiAgICAgICAgICBpZiAoZXhpdHMuaGFzKHRpbGVJZCkpIGNvbnRpbnVlOyAvLyBkb24ndCBnbyBwYXN0IGV4aXRzXG4gICAgICAgICAgbGV0IHRpbGUgPSBzY3JlZW4udGlsZXNbdF07XG4gICAgICAgICAgLy8gZmxhZyAyZWYgaXMgXCJhbHdheXMgb25cIiwgZG9uJ3QgZXZlbiBib3RoZXIgbWFraW5nIGl0IGNvbmRpdGlvbmFsLlxuICAgICAgICAgIGxldCBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICBsZXQgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgaWYgKGZsYWcgJiYgYmxvY2tlZCAmJiB0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT0gdGlsZSkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICAgIGVmZmVjdHMgPSB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgICAgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYmxvY2tlZCkgcGFzc2FibGUuYWRkKHRpbGVJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCB0IG9mIHBhc3NhYmxlKSB7XG4gICAgICBjb25zdCByaWdodCA9ICh0ICYgMHgwZikgPT09IDB4MGYgPyB0ICsgMHhmMSA6IHQgKyAxO1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhyaWdodCkpIHVmLnVuaW9uKFt0LCByaWdodF0pO1xuICAgICAgY29uc3QgYmVsb3cgPSAodCAmIDB4ZjApID09PSAweGUwID8gdCArIDB4ZjIwIDogdCArIDE2O1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhiZWxvdykpIHVmLnVuaW9uKFt0LCBiZWxvd10pO1xuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IHVmLm1hcCgpO1xuICAgIGNvbnN0IHNldHMgPSBuZXcgU2V0PFNldDxudW1iZXI+PigpO1xuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgIGNvbnN0IGlkID0gZW50cmFuY2Uuc2NyZWVuIDw8IDggfCBlbnRyYW5jZS50aWxlO1xuICAgICAgc2V0cy5hZGQobWFwLmdldChpZCkhKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXQgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHNldHMpIHtcbiAgICAgIGZvciAoY29uc3QgdCBvZiBzZXQpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweDBmXTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tzY3IgfCAodGhpcy5leHRlbmRlZCA/IDB4MTAwIDogMCldO1xuICAgICAgICBvdXQuc2V0KHQsIHRpbGVFZmZlY3RzLmVmZmVjdHNbc2NyZWVuLnRpbGVzW3QgJiAweGZmXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgLyoqIFNhZmVyIHZlcnNpb24gb2YgdGhlIGJlbG93PyAqL1xuICBzY3JlZW5Nb3ZlcigpOiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHZvaWQge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgQXJyYXk8e3NjcmVlbjogbnVtYmVyfT4+KCgpID0+IFtdKTtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgbWFwLmdldChvYmouc2NyZWVuKS5wdXNoKG9iaik7XG4gICAgfVxuICAgIHJldHVybiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHtcbiAgICAgIGZvciAoY29uc3Qgb2JqIG9mIG1hcC5nZXQob3JpZykpIHtcbiAgICAgICAgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbGwgc3Bhd25zLCBlbnRyYW5jZXMsIGFuZCBleGl0cy5cbiAgICogQHBhcmFtIG9yaWcgWVggb2YgdGhlIG9yaWdpbmFsIHNjcmVlbi5cbiAgICogQHBhcmFtIHJlcGwgWVggb2YgdGhlIGVxdWl2YWxlbnQgcmVwbGFjZW1lbnQgc2NyZWVuLlxuICAgKi9cbiAgbW92ZVNjcmVlbihvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IG9ianMgPVxuICAgICAgICBpdGVycy5jb25jYXQ8e3NjcmVlbjogbnVtYmVyfT4odGhpcy5zcGF3bnMsIHRoaXMuZXhpdHMsIHRoaXMuZW50cmFuY2VzKTtcbiAgICBmb3IgKGNvbnN0IG9iaiBvZiBvYmpzKSB7XG4gICAgICBpZiAob2JqLnNjcmVlbiA9PT0gb3JpZykgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgfVxuICB9XG5cbiAgbW9uc3RlclBsYWNlcihyYW5kb206IFJhbmRvbSk6IChtOiBNb25zdGVyKSA9PiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIC8vIElmIHRoZXJlJ3MgYSBib3NzIHNjcmVlbiwgZXhjbHVkZSBpdCBmcm9tIGdldHRpbmcgZW5lbWllcy5cbiAgICBjb25zdCBib3NzID0gQk9TU19TQ1JFRU5TW3RoaXMua2V5XTtcbiAgICAvLyBTdGFydCB3aXRoIGxpc3Qgb2YgcmVhY2hhYmxlIHRpbGVzLlxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IHRoaXMucmVhY2hhYmxlVGlsZXMoZmFsc2UpO1xuICAgIC8vIERvIGEgYnJlYWR0aC1maXJzdCBzZWFyY2ggb2YgYWxsIHRpbGVzIHRvIGZpbmQgXCJkaXN0YW5jZVwiICgxLW5vcm0pLlxuICAgIGNvbnN0IGV4dGVuZGVkID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oWy4uLnJlYWNoYWJsZS5rZXlzKCldLm1hcCh4ID0+IFt4LCAwXSkpO1xuICAgIGNvbnN0IG5vcm1hbDogbnVtYmVyW10gPSBbXTsgLy8gcmVhY2hhYmxlLCBub3Qgc2xvcGUgb3Igd2F0ZXJcbiAgICBjb25zdCBtb3RoczogbnVtYmVyW10gPSBbXTsgIC8vIGRpc3RhbmNlIOKIiCAzLi43XG4gICAgY29uc3QgYmlyZHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSA+IDEyXG4gICAgY29uc3QgcGxhbnRzOiBudW1iZXJbXSA9IFtdOyAvLyBkaXN0YW5jZSDiiIggMi4uNFxuICAgIGNvbnN0IHBsYWNlZDogQXJyYXk8W01vbnN0ZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IG5vcm1hbFRlcnJhaW5NYXNrID0gdGhpcy5oYXNEb2xwaGluKCkgPyAweDI1IDogMHgyNztcbiAgICBmb3IgKGNvbnN0IFt0LCBkaXN0YW5jZV0gb2YgZXh0ZW5kZWQpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHhmXTtcbiAgICAgIGlmIChzY3IgPT09IGJvc3MpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBuIG9mIG5laWdoYm9ycyh0LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCkpIHtcbiAgICAgICAgaWYgKGV4dGVuZGVkLmhhcyhuKSkgY29udGludWU7XG4gICAgICAgIGV4dGVuZGVkLnNldChuLCBkaXN0YW5jZSArIDEpO1xuICAgICAgfVxuICAgICAgaWYgKCFkaXN0YW5jZSAmJiAhKHJlYWNoYWJsZS5nZXQodCkhICYgbm9ybWFsVGVycmFpbk1hc2spKSBub3JtYWwucHVzaCh0KTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweDFhKSB7XG4gICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgc3dhbXAgZm9yIHBsYW50IHBsYWNlbWVudFxuICAgICAgICBpZiAodGhpcy5yb20uc2NyZWVuc1tzY3JdLnRpbGVzW3QgJiAweGZmXSA9PT0gMHhmMCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZGlzdGFuY2UgPj0gMiAmJiBkaXN0YW5jZSA8PSA0KSBwbGFudHMucHVzaCh0KTtcbiAgICAgIH1cbiAgICAgIGlmIChkaXN0YW5jZSA+PSAzICYmIGRpc3RhbmNlIDw9IDcpIG1vdGhzLnB1c2godCk7XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMTIpIGJpcmRzLnB1c2godCk7XG4gICAgICAvLyBUT0RPIC0gc3BlY2lhbC1jYXNlIHN3YW1wIGZvciBwbGFudCBsb2NhdGlvbnM/XG4gICAgfVxuICAgIC8vIFdlIG5vdyBrbm93IGFsbCB0aGUgcG9zc2libGUgcGxhY2VzIHRvIHBsYWNlIHRoaW5ncy5cbiAgICAvLyAgLSBOT1RFOiBzdGlsbCBuZWVkIHRvIG1vdmUgY2hlc3RzIHRvIGRlYWQgZW5kcywgZXRjP1xuICAgIHJldHVybiAobTogTW9uc3RlcikgPT4ge1xuICAgICAgLy8gY2hlY2sgZm9yIHBsYWNlbWVudC5cbiAgICAgIGNvbnN0IHBsYWNlbWVudCA9IG0ucGxhY2VtZW50KCk7XG4gICAgICBjb25zdCBwb29sID0gWy4uLihwbGFjZW1lbnQgPT09ICdub3JtYWwnID8gbm9ybWFsIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ21vdGgnID8gbW90aHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnYmlyZCcgPyBiaXJkcyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdwbGFudCcgPyBwbGFudHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0TmV2ZXIocGxhY2VtZW50KSldXG4gICAgICBQT09MOlxuICAgICAgd2hpbGUgKHBvb2wubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGkgPSByYW5kb20ubmV4dEludChwb29sLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IFtwb3NdID0gcG9vbC5zcGxpY2UoaSwgMSk7XG5cbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYwMCkgPj4+IDQgfCAocG9zICYgMHhmKTtcbiAgICAgICAgY29uc3QgeSA9IChwb3MgJiAweGYwMDApID4+PiA4IHwgKHBvcyAmIDB4ZjApID4+PiA0O1xuICAgICAgICBjb25zdCByID0gbS5jbGVhcmFuY2UoKTtcblxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gb3RoZXIgZW5lbWllcy5cbiAgICAgICAgZm9yIChjb25zdCBbLCB4MSwgeTEsIHIxXSBvZiBwbGFjZWQpIHtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtIHkxKSAqKiAyICsgKHggLSB4MSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyByMSkgKiogMikgY29udGludWUgUE9PTDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZhbGlkIHNwb3QgKHN0aWxsLCBob3cgdG9hIGFwcHJveGltYXRlbHkgKm1heGltaXplKiBkaXN0YW5jZXM/KVxuICAgICAgICBwbGFjZWQucHVzaChbbSwgeCwgeSwgcl0pO1xuICAgICAgICBjb25zdCBzY3IgPSAoeSAmIDB4ZjApIHwgKHggJiAweGYwKSA+Pj4gNDtcbiAgICAgICAgY29uc3QgdGlsZSA9ICh5ICYgMHgwZikgPDwgNCB8ICh4ICYgMHgwZik7XG4gICAgICAgIHJldHVybiBzY3IgPDwgOCB8IHRpbGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICAvLyBUT0RPIC0gYWxsb3cgbGVzcyByYW5kb21uZXNzIGZvciBjZXJ0YWluIGNhc2VzLCBlLmcuIHRvcCBvZiBub3J0aCBzYWJyZSBvclxuICAvLyBhcHByb3ByaWF0ZSBzaWRlIG9mIGNvcmRlbC5cblxuICAvKiogQHJldHVybiB7IVNldDxudW1iZXI+fSAqL1xuICAvLyBhbGxUaWxlcygpIHtcbiAgLy8gICBjb25zdCB0aWxlcyA9IG5ldyBTZXQoKTtcbiAgLy8gICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgLy8gICAgIGZvciAoY29uc3QgdGlsZSBvZiBzY3JlZW4uYWxsVGlsZXMoKSkge1xuICAvLyAgICAgICB0aWxlcy5hZGQodGlsZSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiB0aWxlcztcbiAgLy8gfVxufVxuXG4vLyBUT0RPIC0gbW92ZSB0byBhIGJldHRlci1vcmdhbml6ZWQgZGVkaWNhdGVkIFwiZ2VvbWV0cnlcIiBtb2R1bGU/XG5mdW5jdGlvbiBuZWlnaGJvcnModGlsZTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IG51bWJlcltdIHtcbiAgY29uc3Qgb3V0ID0gW107XG4gIGNvbnN0IHkgPSB0aWxlICYgMHhmMGYwO1xuICBjb25zdCB4ID0gdGlsZSAmIDB4MGYwZjtcbiAgaWYgKHkgPCAoKGhlaWdodCAtIDEpIDw8IDEyIHwgMHhlMCkpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4ZjApID09PSAweGUwID8gdGlsZSArIDB4MGYyMCA6IHRpbGUgKyAxNik7XG4gIH1cbiAgaWYgKHkpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4ZjApID09PSAweDAwID8gdGlsZSAtIDB4MGYyMCA6IHRpbGUgLSAxNik7XG4gIH1cbiAgaWYgKHggPCAoKHdpZHRoIC0gMSkgPDwgOCB8IDB4MGYpKSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweDBmKSA9PT0gMHgwZiA/IHRpbGUgKyAweDAwZjEgOiB0aWxlICsgMSk7XG4gIH1cbiAgaWYgKHgpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDAwID8gdGlsZSAtIDB4MDBmMSA6IHRpbGUgLSAxKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgY29uc3QgRW50cmFuY2UgPSBEYXRhVHVwbGUubWFrZSg0LCB7XG4gIHg6IERhdGFUdXBsZS5wcm9wKFswXSwgWzEsIDB4ZmYsIC04XSksXG4gIHk6IERhdGFUdXBsZS5wcm9wKFsyXSwgWzMsIDB4ZmYsIC04XSksXG5cbiAgc2NyZWVuOiBEYXRhVHVwbGUucHJvcChbMywgMHgwZiwgLTRdLCBbMSwgMHgwZl0pLFxuICB0aWxlOiAgIERhdGFUdXBsZS5wcm9wKFsyLCAweGYwXSwgWzAsIDB4ZjAsIDRdKSxcbiAgY29vcmQ6ICBEYXRhVHVwbGUucHJvcChbMiwgMHhmZiwgLThdLCBbMCwgMHhmZl0pLFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBFbnRyYW5jZSAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy54KX0sICR7aGV4KHRoaXMueSl9KWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIEVudHJhbmNlID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBFbnRyYW5jZT47XG5cbmV4cG9ydCBjb25zdCBFeGl0ID0gRGF0YVR1cGxlLm1ha2UoNCwge1xuICB4OiAgICAgICAgRGF0YVR1cGxlLnByb3AoWzAsIDB4ZmYsIC00XSksXG4gIHh0OiAgICAgICBEYXRhVHVwbGUucHJvcChbMF0pLFxuXG4gIHk6ICAgICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHhmZiwgLTRdKSxcbiAgeXQ6ICAgICAgIERhdGFUdXBsZS5wcm9wKFsxXSksXG5cbiAgc2NyZWVuOiAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGYwXSwgWzAsIDB4ZjAsIDRdKSxcbiAgdGlsZTogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDBmLCAtNF0sIFswLCAweDBmXSksXG5cbiAgZGVzdDogICAgIERhdGFUdXBsZS5wcm9wKFsyXSksXG5cbiAgZW50cmFuY2U6IERhdGFUdXBsZS5wcm9wKFszXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEV4aXQgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSkgPT4gJHtcbiAgICAgICAgICAgIHRoaXMuZGVzdH06JHt0aGlzLmVudHJhbmNlfWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIEV4aXQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIEV4aXQ+O1xuXG5leHBvcnQgY29uc3QgRmxhZyA9IERhdGFUdXBsZS5tYWtlKDIsIHtcbiAgZmxhZzogIHtcbiAgICBnZXQodGhpczogYW55KTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YVswXSB8IDB4MjAwOyB9LFxuICAgIHNldCh0aGlzOiBhbnksIGY6IG51bWJlcikge1xuICAgICAgaWYgKChmICYgfjB4ZmYpICE9PSAweDIwMCkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmxhZzogJHtoZXgoZil9YCk7XG4gICAgICB0aGlzLmRhdGFbMF0gPSBmICYgMHhmZjtcbiAgICB9LFxuICB9LFxuXG4gIHg6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHgwNywgLThdKSxcbiAgeHM6ICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDA3XSksXG5cbiAgeTogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGYwLCAtNF0pLFxuICB5czogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4ZjAsIDRdKSxcblxuICAvLyBUT0RPIC0gcmVtb3ZlIHRoZSAneXgnIHZlcnNpb25cbiAgeXg6ICAgIERhdGFUdXBsZS5wcm9wKFsxXSksIC8vIHkgaW4gaGkgbmliYmxlLCB4IGluIGxvLlxuICBzY3JlZW46IERhdGFUdXBsZS5wcm9wKFsxXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEZsYWcgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueHMpfSwgJHtoZXgodGhpcy55cyl9KSBAICR7XG4gICAgICAgICAgICBoZXgodGhpcy5mbGFnKX1gO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBGbGFnID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBGbGFnPjtcblxuZXhwb3J0IGNvbnN0IFBpdCA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgZnJvbVhzOiAgRGF0YVR1cGxlLnByb3AoWzEsIDB4NzAsIDRdKSxcbiAgdG9YczogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4MDddKSxcblxuICBmcm9tWXM6ICBEYXRhVHVwbGUucHJvcChbMywgMHhmMCwgNF0pLFxuICB0b1lzOiAgICBEYXRhVHVwbGUucHJvcChbMywgMHgwZl0pLFxuXG4gIGRlc3Q6ICAgIERhdGFUdXBsZS5wcm9wKFswXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFBpdCAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy5mcm9tWHMpfSwgJHtoZXgodGhpcy5mcm9tWXMpfSkgPT4gJHtcbiAgICAgICAgICAgIGhleCh0aGlzLmRlc3QpfTooJHtoZXgodGhpcy50b1hzKX0sICR7aGV4KHRoaXMudG9Zcyl9KWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIFBpdCA9IEluc3RhbmNlVHlwZTx0eXBlb2YgUGl0PjtcblxuZXhwb3J0IGNvbnN0IFNwYXduID0gRGF0YVR1cGxlLm1ha2UoNCwge1xuICB5OiAgICAgRGF0YVR1cGxlLnByb3AoWzAsIDB4ZmYsIC00XSksXG4gIHl0OiAgICBEYXRhVHVwbGUucHJvcChbMF0pLFxuXG4gIHRpbWVkOiBEYXRhVHVwbGUuYm9vbGVhblByb3AoWzEsIDB4ODAsIDddKSxcbiAgeDogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDdmLCAtNF0sIFsyLCAweDQwLCAzXSksXG4gIHh0OiAgICBEYXRhVHVwbGUucHJvcChbMSwgMHg3Zl0pLFxuXG4gIHNjcmVlbjogRGF0YVR1cGxlLnByb3AoWzAsIDB4ZjBdLCBbMSwgMHhmMCwgNF0pLFxuICB0aWxlOiAgIERhdGFUdXBsZS5wcm9wKFswLCAweDBmLCAtNF0sIFsxLCAweDBmXSksXG5cbiAgcGF0dGVybkJhbms6IERhdGFUdXBsZS5wcm9wKFsyLCAweDgwLCA3XSksXG4gIHR5cGU6ICBEYXRhVHVwbGUucHJvcChbMiwgMHgwN10pLFxuXG4vLyBwYXR0ZXJuQmFuazoge2dldCh0aGlzOiBhbnkpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5kYXRhWzJdID4+PiA3OyB9LFxuLy8gICAgICAgICAgICAgICBzZXQodGhpczogYW55LCB2OiBudW1iZXIpIHsgaWYgKHRoaXMuZGF0YVszXSA9PT0gMTIwKSBkZWJ1Z2dlcjtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB0aGlzLmRhdGFbMl0gfD0gMHg4MDsgZWxzZSB0aGlzLmRhdGFbMl0gJj0gMHg3ZjsgfX0sXG4gIGlkOiAgICBEYXRhVHVwbGUucHJvcChbM10pLFxuXG4gIHVzZWQ6IHtnZXQodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRhdGFbMF0gIT09IDB4ZmU7IH0sXG4gICAgICAgICBzZXQodGhpczogYW55LCB1c2VkOiBib29sZWFuKSB7IHRoaXMuZGF0YVswXSA9IHVzZWQgPyAwIDogMHhmZTsgfX0sXG4gIG1vbnN0ZXJJZDoge2dldCh0aGlzOiBhbnkpOiBudW1iZXIgeyByZXR1cm4gKHRoaXMuaWQgKyAweDUwKSAmIDB4ZmY7IH0sXG4gICAgICAgICAgICAgIHNldCh0aGlzOiBhbnksIGlkOiBudW1iZXIpIHsgdGhpcy5pZCA9IChpZCAtIDB4NTApICYgMHhmZjsgfX0sXG4gIC8qKiBOb3RlOiB0aGlzIGluY2x1ZGVzIG1pbWljcy4gKi9cbiAgaXNDaGVzdCh0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMiAmJiB0aGlzLmlkIDwgMHg4MDsgfSxcbiAgaXNJbnZpc2libGUodGhpczogYW55KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNDaGVzdCgpICYmIEJvb2xlYW4odGhpcy5kYXRhWzJdICYgMHgyMCk7XG4gIH0sXG4gIGlzVHJpZ2dlcih0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMiAmJiB0aGlzLmlkID49IDB4ODA7IH0sXG4gIGlzTnBjKHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAxICYmIHRoaXMuaWQgPCAweGMwOyB9LFxuICBpc0Jvc3ModGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDEgJiYgdGhpcy5pZCA+PSAweGMwOyB9LFxuICBpc01vbnN0ZXIodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDA7IH0sXG4gIGlzV2FsbCh0aGlzOiBhbnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gQm9vbGVhbih0aGlzLnR5cGUgPT09IDMgJiYgKHRoaXMuaWQgPCA0IHx8ICh0aGlzLmRhdGFbMl0gJiAweDIwKSkpO1xuICB9LFxuICB3YWxsVHlwZSh0aGlzOiBhbnkpOiAnJyB8ICd3YWxsJyB8ICdicmlkZ2UnIHtcbiAgICBpZiAodGhpcy50eXBlICE9PSAzKSByZXR1cm4gJyc7XG4gICAgY29uc3Qgb2JqID0gdGhpcy5kYXRhWzJdICYgMHgyMCA/IHRoaXMuaWQgPj4+IDQgOiB0aGlzLmlkO1xuICAgIGlmIChvYmogPj0gNCkgcmV0dXJuICcnO1xuICAgIHJldHVybiBvYmogPT09IDIgPyAnYnJpZGdlJyA6ICd3YWxsJztcbiAgfSxcbiAgd2FsbEVsZW1lbnQodGhpczogYW55KTogbnVtYmVyIHtcbiAgICBpZiAoIXRoaXMuaXNXYWxsKCkpIHJldHVybiAtMTtcbiAgICByZXR1cm4gdGhpcy5pZCAmIDM7XG4gIH0sXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBTcGF3biAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy54KX0sICR7aGV4KHRoaXMueSl9KSAke1xuICAgICAgICAgICAgdGhpcy50aW1lZCA/ICd0aW1lZCcgOiAnZml4ZWQnfSAke3RoaXMudHlwZX06JHtoZXgodGhpcy5pZCl9YDtcbiAgfSxcbn0pO1xuZXhwb3J0IHR5cGUgU3Bhd24gPSBJbnN0YW5jZVR5cGU8dHlwZW9mIFNwYXduPjtcblxuZXhwb3J0IGNvbnN0IExPQ0FUSU9OUyA9IHtcbiAgbWV6YW1lU2hyaW5lOiBbMHgwMCwgJ01lemFtZSBTaHJpbmUnXSxcbiAgbGVhZk91dHNpZGVTdGFydDogWzB4MDEsICdMZWFmIC0gT3V0c2lkZSBTdGFydCddLFxuICBsZWFmOiBbMHgwMiwgJ0xlYWYnXSxcbiAgdmFsbGV5T2ZXaW5kOiBbMHgwMywgJ1ZhbGxleSBvZiBXaW5kJ10sXG4gIHNlYWxlZENhdmUxOiBbMHgwNCwgJ1NlYWxlZCBDYXZlIDEnXSxcbiAgc2VhbGVkQ2F2ZTI6IFsweDA1LCAnU2VhbGVkIENhdmUgMiddLFxuICBzZWFsZWRDYXZlNjogWzB4MDYsICdTZWFsZWQgQ2F2ZSA2J10sXG4gIHNlYWxlZENhdmU0OiBbMHgwNywgJ1NlYWxlZCBDYXZlIDQnXSxcbiAgc2VhbGVkQ2F2ZTU6IFsweDA4LCAnU2VhbGVkIENhdmUgNSddLFxuICBzZWFsZWRDYXZlMzogWzB4MDksICdTZWFsZWQgQ2F2ZSAzJ10sXG4gIHNlYWxlZENhdmU3OiBbMHgwYSwgJ1NlYWxlZCBDYXZlIDcnXSxcbiAgLy8gSU5WQUxJRDogMHgwYlxuICBzZWFsZWRDYXZlODogWzB4MGMsICdTZWFsZWQgQ2F2ZSA4J10sXG4gIC8vIElOVkFMSUQ6IDB4MGRcbiAgd2luZG1pbGxDYXZlOiBbMHgwZSwgJ1dpbmRtaWxsIENhdmUnXSxcbiAgd2luZG1pbGw6IFsweDBmLCAnV2luZG1pbGwnXSxcbiAgemVidUNhdmU6IFsweDEwLCAnWmVidSBDYXZlJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTE6IFsweDExLCAnTXQgU2FicmUgV2VzdCAtIENhdmUgMSddLFxuICAvLyBJTlZBTElEOiAweDEyXG4gIC8vIElOVkFMSUQ6IDB4MTNcbiAgY29yZGVsUGxhaW5zV2VzdDogWzB4MTQsICdDb3JkZWwgUGxhaW5zIFdlc3QnXSxcbiAgY29yZGVsUGxhaW5zRWFzdDogWzB4MTUsICdDb3JkZWwgUGxhaW5zIEVhc3QnXSxcbiAgLy8gSU5WQUxJRDogMHgxNiAtLSB1bnVzZWQgY29weSBvZiAxOFxuICAvLyBJTlZBTElEOiAweDE3XG4gIGJyeW5tYWVyOiBbMHgxOCwgJ0JyeW5tYWVyJ10sXG4gIG91dHNpZGVTdG9tSG91c2U6IFsweDE5LCAnT3V0c2lkZSBTdG9tIEhvdXNlJ10sXG4gIHN3YW1wOiBbMHgxYSwgJ1N3YW1wJ10sXG4gIGFtYXpvbmVzOiBbMHgxYiwgJ0FtYXpvbmVzJ10sXG4gIG9hazogWzB4MWMsICdPYWsnXSxcbiAgLy8gSU5WQUxJRDogMHgxZFxuICBzdG9tSG91c2U6IFsweDFlLCAnU3RvbSBIb3VzZSddLFxuICAvLyBJTlZBTElEOiAweDFmXG4gIG10U2FicmVXZXN0TG93ZXI6IFsweDIwLCAnTXQgU2FicmUgV2VzdCAtIExvd2VyJ10sXG4gIG10U2FicmVXZXN0VXBwZXI6IFsweDIxLCAnTXQgU2FicmUgV2VzdCAtIFVwcGVyJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTI6IFsweDIyLCAnTXQgU2FicmUgV2VzdCAtIENhdmUgMiddLFxuICBtdFNhYnJlV2VzdENhdmUzOiBbMHgyMywgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDMnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNDogWzB4MjQsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA0J10sXG4gIG10U2FicmVXZXN0Q2F2ZTU6IFsweDI1LCAnTXQgU2FicmUgV2VzdCAtIENhdmUgNSddLFxuICBtdFNhYnJlV2VzdENhdmU2OiBbMHgyNiwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDYnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNzogWzB4MjcsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA3J10sXG4gIG10U2FicmVOb3J0aE1haW46IFsweDI4LCAnTXQgU2FicmUgTm9ydGggLSBNYWluJ10sXG4gIG10U2FicmVOb3J0aE1pZGRsZTogWzB4MjksICdNdCBTYWJyZSBOb3J0aCAtIE1pZGRsZSddLFxuICBtdFNhYnJlTm9ydGhDYXZlMjogWzB4MmEsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgMiddLFxuICBtdFNhYnJlTm9ydGhDYXZlMzogWzB4MmIsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgMyddLFxuICBtdFNhYnJlTm9ydGhDYXZlNDogWzB4MmMsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNCddLFxuICBtdFNhYnJlTm9ydGhDYXZlNTogWzB4MmQsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNSddLFxuICBtdFNhYnJlTm9ydGhDYXZlNjogWzB4MmUsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNiddLFxuICBtdFNhYnJlTm9ydGhQcmlzb25IYWxsOiBbMHgyZiwgJ010IFNhYnJlIE5vcnRoIC0gUHJpc29uIEhhbGwnXSxcbiAgbXRTYWJyZU5vcnRoTGVmdENlbGw6IFsweDMwLCAnTXQgU2FicmUgTm9ydGggLSBMZWZ0IENlbGwnXSxcbiAgbXRTYWJyZU5vcnRoTGVmdENlbGwyOiBbMHgzMSwgJ010IFNhYnJlIE5vcnRoIC0gTGVmdCBDZWxsIDInXSxcbiAgbXRTYWJyZU5vcnRoUmlnaHRDZWxsOiBbMHgzMiwgJ010IFNhYnJlIE5vcnRoIC0gUmlnaHQgQ2VsbCddLFxuICBtdFNhYnJlTm9ydGhDYXZlODogWzB4MzMsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgOCddLFxuICBtdFNhYnJlTm9ydGhDYXZlOTogWzB4MzQsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgOSddLFxuICBtdFNhYnJlTm9ydGhTdW1taXRDYXZlOiBbMHgzNSwgJ010IFNhYnJlIE5vcnRoIC0gU3VtbWl0IENhdmUnXSxcbiAgLy8gSU5WQUxJRDogMHgzNlxuICAvLyBJTlZBTElEOiAweDM3XG4gIG10U2FicmVOb3J0aENhdmUxOiBbMHgzOCwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSAxJ10sXG4gIG10U2FicmVOb3J0aENhdmU3OiBbMHgzOSwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSA3J10sXG4gIC8vIElOVkFMSUQ6IDB4M2FcbiAgLy8gSU5WQUxJRDogMHgzYlxuICBuYWRhcmVJbm46IFsweDNjLCAnTmFkYXJlIC0gSW5uJ10sXG4gIG5hZGFyZVRvb2xTaG9wOiBbMHgzZCwgJ05hZGFyZSAtIFRvb2wgU2hvcCddLFxuICBuYWRhcmVCYWNrUm9vbTogWzB4M2UsICdOYWRhcmUgLSBCYWNrIFJvb20nXSxcbiAgLy8gSU5WQUxJRDogMHgzZlxuICB3YXRlcmZhbGxWYWxsZXlOb3J0aDogWzB4NDAsICdXYXRlcmZhbGwgVmFsbGV5IE5vcnRoJ10sXG4gIHdhdGVyZmFsbFZhbGxleVNvdXRoOiBbMHg0MSwgJ1dhdGVyZmFsbCBWYWxsZXkgU291dGgnXSxcbiAgbGltZVRyZWVWYWxsZXk6IFsweDQyLCAnTGltZSBUcmVlIFZhbGxleSddLFxuICBsaW1lVHJlZUxha2U6IFsweDQzLCAnTGltZSBUcmVlIExha2UnXSxcbiAga2lyaXNhUGxhbnRDYXZlMTogWzB4NDQsICdLaXJpc2EgUGxhbnQgQ2F2ZSAxJ10sXG4gIGtpcmlzYVBsYW50Q2F2ZTI6IFsweDQ1LCAnS2lyaXNhIFBsYW50IENhdmUgMiddLFxuICBraXJpc2FQbGFudENhdmUzOiBbMHg0NiwgJ0tpcmlzYSBQbGFudCBDYXZlIDMnXSxcbiAga2lyaXNhTWVhZG93OiBbMHg0NywgJ0tpcmlzYSBNZWFkb3cnXSxcbiAgZm9nTGFtcENhdmUxOiBbMHg0OCwgJ0ZvZyBMYW1wIENhdmUgMSddLFxuICBmb2dMYW1wQ2F2ZTI6IFsweDQ5LCAnRm9nIExhbXAgQ2F2ZSAyJ10sXG4gIGZvZ0xhbXBDYXZlMzogWzB4NGEsICdGb2cgTGFtcCBDYXZlIDMnXSxcbiAgZm9nTGFtcENhdmVEZWFkRW5kOiBbMHg0YiwgJ0ZvZyBMYW1wIENhdmUgRGVhZCBFbmQnXSxcbiAgZm9nTGFtcENhdmU0OiBbMHg0YywgJ0ZvZyBMYW1wIENhdmUgNCddLFxuICBmb2dMYW1wQ2F2ZTU6IFsweDRkLCAnRm9nIExhbXAgQ2F2ZSA1J10sXG4gIGZvZ0xhbXBDYXZlNjogWzB4NGUsICdGb2cgTGFtcCBDYXZlIDYnXSxcbiAgZm9nTGFtcENhdmU3OiBbMHg0ZiwgJ0ZvZyBMYW1wIENhdmUgNyddLFxuICBwb3J0b2E6IFsweDUwLCAnUG9ydG9hJ10sXG4gIHBvcnRvYUZpc2hlcm1hbklzbGFuZDogWzB4NTEsICdQb3J0b2EgLSBGaXNoZXJtYW4gSXNsYW5kJ10sXG4gIG1lc2lhU2hyaW5lOiBbMHg1MiwgJ01lc2lhIFNocmluZSddLFxuICAvLyBJTlZBTElEOiAweDUzXG4gIHdhdGVyZmFsbENhdmUxOiBbMHg1NCwgJ1dhdGVyZmFsbCBDYXZlIDEnXSxcbiAgd2F0ZXJmYWxsQ2F2ZTI6IFsweDU1LCAnV2F0ZXJmYWxsIENhdmUgMiddLFxuICB3YXRlcmZhbGxDYXZlMzogWzB4NTYsICdXYXRlcmZhbGwgQ2F2ZSAzJ10sXG4gIHdhdGVyZmFsbENhdmU0OiBbMHg1NywgJ1dhdGVyZmFsbCBDYXZlIDQnXSxcbiAgdG93ZXJFbnRyYW5jZTogWzB4NTgsICdUb3dlciAtIEVudHJhbmNlJ10sXG4gIHRvd2VyMTogWzB4NTksICdUb3dlciAxJ10sXG4gIHRvd2VyMjogWzB4NWEsICdUb3dlciAyJ10sXG4gIHRvd2VyMzogWzB4NWIsICdUb3dlciAzJ10sXG4gIHRvd2VyT3V0c2lkZU1lc2lhOiBbMHg1YywgJ1Rvd2VyIC0gT3V0c2lkZSBNZXNpYSddLFxuICB0b3dlck91dHNpZGVEeW5hOiBbMHg1ZCwgJ1Rvd2VyIC0gT3V0c2lkZSBEeW5hJ10sXG4gIHRvd2VyTWVzaWE6IFsweDVlLCAnVG93ZXIgLSBNZXNpYSddLFxuICB0b3dlckR5bmE6IFsweDVmLCAnVG93ZXIgLSBEeW5hJ10sXG4gIGFuZ3J5U2VhOiBbMHg2MCwgJ0FuZ3J5IFNlYSddLFxuICBib2F0SG91c2U6IFsweDYxLCAnQm9hdCBIb3VzZSddLFxuICBqb2VsTGlnaHRob3VzZTogWzB4NjIsICdKb2VsIC0gTGlnaHRob3VzZSddLFxuICAvLyBJTlZBTElEOiAweDYzXG4gIHVuZGVyZ3JvdW5kQ2hhbm5lbDogWzB4NjQsICdVbmRlcmdyb3VuZCBDaGFubmVsJ10sXG4gIHpvbWJpZVRvd246IFsweDY1LCAnWm9tYmllIFRvd24nXSxcbiAgLy8gSU5WQUxJRDogMHg2NlxuICAvLyBJTlZBTElEOiAweDY3XG4gIGV2aWxTcGlyaXRJc2xhbmQxOiBbMHg2OCwgJ0V2aWwgU3Bpcml0IElzbGFuZCAxJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQyOiBbMHg2OSwgJ0V2aWwgU3Bpcml0IElzbGFuZCAyJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQzOiBbMHg2YSwgJ0V2aWwgU3Bpcml0IElzbGFuZCAzJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQ0OiBbMHg2YiwgJ0V2aWwgU3Bpcml0IElzbGFuZCA0J10sXG4gIHNhYmVyYVBhbGFjZTE6IFsweDZjLCAnU2FiZXJhIFBhbGFjZSAxJ10sXG4gIHNhYmVyYVBhbGFjZTI6IFsweDZkLCAnU2FiZXJhIFBhbGFjZSAyJ10sXG4gIHNhYmVyYVBhbGFjZTM6IFsweDZlLCAnU2FiZXJhIFBhbGFjZSAzJ10sXG4gIC8vIElOVkFMSUQ6IDB4NmYgLS0gU2FiZXJhIFBhbGFjZSAzIHVudXNlZCBjb3B5XG4gIGpvZWxTZWNyZXRQYXNzYWdlOiBbMHg3MCwgJ0pvZWwgLSBTZWNyZXQgUGFzc2FnZSddLFxuICBqb2VsOiBbMHg3MSwgJ0pvZWwnXSxcbiAgc3dhbjogWzB4NzIsICdTd2FuJ10sXG4gIHN3YW5HYXRlOiBbMHg3MywgJ1N3YW4gLSBHYXRlJ10sXG4gIC8vIElOVkFMSUQ6IDB4NzRcbiAgLy8gSU5WQUxJRDogMHg3NVxuICAvLyBJTlZBTElEOiAweDc2XG4gIC8vIElOVkFMSUQ6IDB4NzdcbiAgZ29hVmFsbGV5OiBbMHg3OCwgJ0dvYSBWYWxsZXknXSxcbiAgLy8gSU5WQUxJRDogMHg3OVxuICAvLyBJTlZBTElEOiAweDdhXG4gIC8vIElOVkFMSUQ6IDB4N2JcbiAgbXRIeWRyYTogWzB4N2MsICdNdCBIeWRyYSddLFxuICBtdEh5ZHJhQ2F2ZTE6IFsweDdkLCAnTXQgSHlkcmEgLSBDYXZlIDEnXSxcbiAgbXRIeWRyYU91dHNpZGVTaHlyb246IFsweDdlLCAnTXQgSHlkcmEgLSBPdXRzaWRlIFNoeXJvbiddLFxuICBtdEh5ZHJhQ2F2ZTI6IFsweDdmLCAnTXQgSHlkcmEgLSBDYXZlIDInXSxcbiAgbXRIeWRyYUNhdmUzOiBbMHg4MCwgJ010IEh5ZHJhIC0gQ2F2ZSAzJ10sXG4gIG10SHlkcmFDYXZlNDogWzB4ODEsICdNdCBIeWRyYSAtIENhdmUgNCddLFxuICBtdEh5ZHJhQ2F2ZTU6IFsweDgyLCAnTXQgSHlkcmEgLSBDYXZlIDUnXSxcbiAgbXRIeWRyYUNhdmU2OiBbMHg4MywgJ010IEh5ZHJhIC0gQ2F2ZSA2J10sXG4gIG10SHlkcmFDYXZlNzogWzB4ODQsICdNdCBIeWRyYSAtIENhdmUgNyddLFxuICBtdEh5ZHJhQ2F2ZTg6IFsweDg1LCAnTXQgSHlkcmEgLSBDYXZlIDgnXSxcbiAgbXRIeWRyYUNhdmU5OiBbMHg4NiwgJ010IEh5ZHJhIC0gQ2F2ZSA5J10sXG4gIG10SHlkcmFDYXZlMTA6IFsweDg3LCAnTXQgSHlkcmEgLSBDYXZlIDEwJ10sXG4gIHN0eXgxOiBbMHg4OCwgJ1N0eXggMSddLFxuICBzdHl4MjogWzB4ODksICdTdHl4IDInXSxcbiAgc3R5eDM6IFsweDhhLCAnU3R5eCAzJ10sXG4gIC8vIElOVkFMSUQ6IDB4OGJcbiAgc2h5cm9uOiBbMHg4YywgJ1NoeXJvbiddLFxuICAvLyBJTlZBTElEOiAweDhkXG4gIGdvYTogWzB4OGUsICdHb2EnXSxcbiAgZ29hRm9ydHJlc3NPYXNpc0VudHJhbmNlOiBbMHg4ZiwgJ0dvYSBGb3J0cmVzcyAtIE9hc2lzIEVudHJhbmNlJ10sXG4gIGRlc2VydDE6IFsweDkwLCAnRGVzZXJ0IDEnXSxcbiAgb2FzaXNDYXZlTWFpbjogWzB4OTEsICdPYXNpcyBDYXZlIC0gTWFpbiddLFxuICBkZXNlcnRDYXZlMTogWzB4OTIsICdEZXNlcnQgQ2F2ZSAxJ10sXG4gIHNhaGFyYTogWzB4OTMsICdTYWhhcmEnXSxcbiAgc2FoYXJhT3V0c2lkZUNhdmU6IFsweDk0LCAnU2FoYXJhIC0gT3V0c2lkZSBDYXZlJ10sXG4gIGRlc2VydENhdmUyOiBbMHg5NSwgJ0Rlc2VydCBDYXZlIDInXSxcbiAgc2FoYXJhTWVhZG93OiBbMHg5NiwgJ1NhaGFyYSBNZWFkb3cnXSxcbiAgLy8gSU5WQUxJRDogMHg5N1xuICBkZXNlcnQyOiBbMHg5OCwgJ0Rlc2VydCAyJ10sXG4gIC8vIElOVkFMSUQ6IDB4OTlcbiAgLy8gSU5WQUxJRDogMHg5YVxuICAvLyBJTlZBTElEOiAweDliXG4gIHB5cmFtaWRFbnRyYW5jZTogWzB4OWMsICdQeXJhbWlkIC0gRW50cmFuY2UnXSxcbiAgcHlyYW1pZEJyYW5jaDogWzB4OWQsICdQeXJhbWlkIC0gQnJhbmNoJ10sXG4gIHB5cmFtaWRNYWluOiBbMHg5ZSwgJ1B5cmFtaWQgLSBNYWluJ10sXG4gIHB5cmFtaWREcmF5Z29uOiBbMHg5ZiwgJ1B5cmFtaWQgLSBEcmF5Z29uJ10sXG4gIGNyeXB0RW50cmFuY2U6IFsweGEwLCAnQ3J5cHQgLSBFbnRyYW5jZSddLFxuICBjcnlwdEhhbGwxOiBbMHhhMSwgJ0NyeXB0IC0gSGFsbCAxJ10sXG4gIGNyeXB0QnJhbmNoOiBbMHhhMiwgJ0NyeXB0IC0gQnJhbmNoJ10sXG4gIGNyeXB0RGVhZEVuZExlZnQ6IFsweGEzLCAnQ3J5cHQgLSBEZWFkIEVuZCBMZWZ0J10sXG4gIGNyeXB0RGVhZEVuZFJpZ2h0OiBbMHhhNCwgJ0NyeXB0IC0gRGVhZCBFbmQgUmlnaHQnXSxcbiAgY3J5cHRIYWxsMjogWzB4YTUsICdDcnlwdCAtIEhhbGwgMiddLFxuICBjcnlwdERyYXlnb24yOiBbMHhhNiwgJ0NyeXB0IC0gRHJheWdvbiAyJ10sXG4gIGNyeXB0VGVsZXBvcnRlcjogWzB4YTcsICdDcnlwdCAtIFRlbGVwb3J0ZXInXSxcbiAgZ29hRm9ydHJlc3NFbnRyYW5jZTogWzB4YTgsICdHb2EgRm9ydHJlc3MgLSBFbnRyYW5jZSddLFxuICBnb2FGb3J0cmVzc0tlbGJlc3F1ZTogWzB4YTksICdHb2EgRm9ydHJlc3MgLSBLZWxiZXNxdWUnXSxcbiAgZ29hRm9ydHJlc3NaZWJ1OiBbMHhhYSwgJ0dvYSBGb3J0cmVzcyAtIFplYnUnXSxcbiAgZ29hRm9ydHJlc3NTYWJlcmE6IFsweGFiLCAnR29hIEZvcnRyZXNzIC0gU2FiZXJhJ10sXG4gIGdvYUZvcnRyZXNzVG9ybmVsOiBbMHhhYywgJ0dvYSBGb3J0cmVzcyAtIFRvcm5lbCddLFxuICBnb2FGb3J0cmVzc01hZG8xOiBbMHhhZCwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMSddLFxuICBnb2FGb3J0cmVzc01hZG8yOiBbMHhhZSwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMiddLFxuICBnb2FGb3J0cmVzc01hZG8zOiBbMHhhZiwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMyddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUxOiBbMHhiMCwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMSddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUyOiBbMHhiMSwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMiddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUzOiBbMHhiMiwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMyddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU0OiBbMHhiMywgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNCddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU1OiBbMHhiNCwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNSddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU2OiBbMHhiNSwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNiddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU3OiBbMHhiNiwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNyddLFxuICBnb2FGb3J0cmVzc0V4aXQ6IFsweGI3LCAnR29hIEZvcnRyZXNzIC0gRXhpdCddLFxuICBvYXNpc0NhdmVFbnRyYW5jZTogWzB4YjgsICdPYXNpcyBDYXZlIC0gRW50cmFuY2UnXSxcbiAgZ29hRm9ydHJlc3NBc2luYTogWzB4YjksICdHb2EgRm9ydHJlc3MgLSBBc2luYSddLFxuICBnb2FGb3J0cmVzc0tlbnN1OiBbMHhiYSwgJ0dvYSBGb3J0cmVzcyAtIEtlbnN1J10sXG4gIGdvYUhvdXNlOiBbMHhiYiwgJ0dvYSAtIEhvdXNlJ10sXG4gIGdvYUlubjogWzB4YmMsICdHb2EgLSBJbm4nXSxcbiAgLy8gSU5WQUxJRDogMHhiZFxuICBnb2FUb29sU2hvcDogWzB4YmUsICdHb2EgLSBUb29sIFNob3AnXSxcbiAgZ29hVGF2ZXJuOiBbMHhiZiwgJ0dvYSAtIFRhdmVybiddLFxuICBsZWFmRWxkZXJIb3VzZTogWzB4YzAsICdMZWFmIC0gRWxkZXIgSG91c2UnXSxcbiAgbGVhZlJhYmJpdEh1dDogWzB4YzEsICdMZWFmIC0gUmFiYml0IEh1dCddLFxuICBsZWFmSW5uOiBbMHhjMiwgJ0xlYWYgLSBJbm4nXSxcbiAgbGVhZlRvb2xTaG9wOiBbMHhjMywgJ0xlYWYgLSBUb29sIFNob3AnXSxcbiAgbGVhZkFybW9yU2hvcDogWzB4YzQsICdMZWFmIC0gQXJtb3IgU2hvcCddLFxuICBsZWFmU3R1ZGVudEhvdXNlOiBbMHhjNSwgJ0xlYWYgLSBTdHVkZW50IEhvdXNlJ10sXG4gIGJyeW5tYWVyVGF2ZXJuOiBbMHhjNiwgJ0JyeW5tYWVyIC0gVGF2ZXJuJ10sXG4gIGJyeW5tYWVyUGF3blNob3A6IFsweGM3LCAnQnJ5bm1hZXIgLSBQYXduIFNob3AnXSxcbiAgYnJ5bm1hZXJJbm46IFsweGM4LCAnQnJ5bm1hZXIgLSBJbm4nXSxcbiAgYnJ5bm1hZXJBcm1vclNob3A6IFsweGM5LCAnQnJ5bm1hZXIgLSBBcm1vciBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4Y2FcbiAgYnJ5bm1hZXJJdGVtU2hvcDogWzB4Y2IsICdCcnlubWFlciAtIEl0ZW0gU2hvcCddLFxuICAvLyBJTlZBTElEOiAweGNjXG4gIG9ha0VsZGVySG91c2U6IFsweGNkLCAnT2FrIC0gRWxkZXIgSG91c2UnXSxcbiAgb2FrTW90aGVySG91c2U6IFsweGNlLCAnT2FrIC0gTW90aGVyIEhvdXNlJ10sXG4gIG9ha1Rvb2xTaG9wOiBbMHhjZiwgJ09hayAtIFRvb2wgU2hvcCddLFxuICBvYWtJbm46IFsweGQwLCAnT2FrIC0gSW5uJ10sXG4gIGFtYXpvbmVzSW5uOiBbMHhkMSwgJ0FtYXpvbmVzIC0gSW5uJ10sXG4gIGFtYXpvbmVzSXRlbVNob3A6IFsweGQyLCAnQW1hem9uZXMgLSBJdGVtIFNob3AnXSxcbiAgYW1hem9uZXNBcm1vclNob3A6IFsweGQzLCAnQW1hem9uZXMgLSBBcm1vciBTaG9wJ10sXG4gIGFtYXpvbmVzRWxkZXI6IFsweGQ0LCAnQW1hem9uZXMgLSBFbGRlciddLFxuICBuYWRhcmU6IFsweGQ1LCAnTmFkYXJlJ10sXG4gIHBvcnRvYUZpc2hlcm1hbkhvdXNlOiBbMHhkNiwgJ1BvcnRvYSAtIEZpc2hlcm1hbiBIb3VzZSddLFxuICBwb3J0b2FQYWxhY2VFbnRyYW5jZTogWzB4ZDcsICdQb3J0b2EgLSBQYWxhY2UgRW50cmFuY2UnXSxcbiAgcG9ydG9hRm9ydHVuZVRlbGxlcjogWzB4ZDgsICdQb3J0b2EgLSBGb3J0dW5lIFRlbGxlciddLFxuICBwb3J0b2FQYXduU2hvcDogWzB4ZDksICdQb3J0b2EgLSBQYXduIFNob3AnXSxcbiAgcG9ydG9hQXJtb3JTaG9wOiBbMHhkYSwgJ1BvcnRvYSAtIEFybW9yIFNob3AnXSxcbiAgLy8gSU5WQUxJRDogMHhkYlxuICBwb3J0b2FJbm46IFsweGRjLCAnUG9ydG9hIC0gSW5uJ10sXG4gIHBvcnRvYVRvb2xTaG9wOiBbMHhkZCwgJ1BvcnRvYSAtIFRvb2wgU2hvcCddLFxuICBwb3J0b2FQYWxhY2VMZWZ0OiBbMHhkZSwgJ1BvcnRvYSAtIFBhbGFjZSBMZWZ0J10sXG4gIHBvcnRvYVBhbGFjZVRocm9uZVJvb206IFsweGRmLCAnUG9ydG9hIC0gUGFsYWNlIFRocm9uZSBSb29tJ10sXG4gIHBvcnRvYVBhbGFjZVJpZ2h0OiBbMHhlMCwgJ1BvcnRvYSAtIFBhbGFjZSBSaWdodCddLFxuICBwb3J0b2FBc2luYVJvb206IFsweGUxLCAnUG9ydG9hIC0gQXNpbmEgUm9vbSddLFxuICBhbWF6b25lc0VsZGVyRG93bnN0YWlyczogWzB4ZTIsICdBbWF6b25lcyAtIEVsZGVyIERvd25zdGFpcnMnXSxcbiAgam9lbEVsZGVySG91c2U6IFsweGUzLCAnSm9lbCAtIEVsZGVyIEhvdXNlJ10sXG4gIGpvZWxTaGVkOiBbMHhlNCwgJ0pvZWwgLSBTaGVkJ10sXG4gIGpvZWxUb29sU2hvcDogWzB4ZTUsICdKb2VsIC0gVG9vbCBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4ZTZcbiAgam9lbElubjogWzB4ZTcsICdKb2VsIC0gSW5uJ10sXG4gIHpvbWJpZVRvd25Ib3VzZTogWzB4ZTgsICdab21iaWUgVG93biAtIEhvdXNlJ10sXG4gIHpvbWJpZVRvd25Ib3VzZUJhc2VtZW50OiBbMHhlOSwgJ1pvbWJpZSBUb3duIC0gSG91c2UgQmFzZW1lbnQnXSxcbiAgLy8gSU5WQUxJRDogMHhlYVxuICBzd2FuVG9vbFNob3A6IFsweGViLCAnU3dhbiAtIFRvb2wgU2hvcCddLFxuICBzd2FuU3RvbUh1dDogWzB4ZWMsICdTd2FuIC0gU3RvbSBIdXQnXSxcbiAgc3dhbklubjogWzB4ZWQsICdTd2FuIC0gSW5uJ10sXG4gIHN3YW5Bcm1vclNob3A6IFsweGVlLCAnU3dhbiAtIEFybW9yIFNob3AnXSxcbiAgc3dhblRhdmVybjogWzB4ZWYsICdTd2FuIC0gVGF2ZXJuJ10sXG4gIHN3YW5QYXduU2hvcDogWzB4ZjAsICdTd2FuIC0gUGF3biBTaG9wJ10sXG4gIHN3YW5EYW5jZUhhbGw6IFsweGYxLCAnU3dhbiAtIERhbmNlIEhhbGwnXSxcbiAgc2h5cm9uRm9ydHJlc3M6IFsweGYyLCAnU2h5cm9uIC0gRm9ydHJlc3MnXSxcbiAgc2h5cm9uVHJhaW5pbmdIYWxsOiBbMHhmMywgJ1NoeXJvbiAtIFRyYWluaW5nIEhhbGwnXSxcbiAgc2h5cm9uSG9zcGl0YWw6IFsweGY0LCAnU2h5cm9uIC0gSG9zcGl0YWwnXSxcbiAgc2h5cm9uQXJtb3JTaG9wOiBbMHhmNSwgJ1NoeXJvbiAtIEFybW9yIFNob3AnXSxcbiAgc2h5cm9uVG9vbFNob3A6IFsweGY2LCAnU2h5cm9uIC0gVG9vbCBTaG9wJ10sXG4gIHNoeXJvbklubjogWzB4ZjcsICdTaHlyb24gLSBJbm4nXSxcbiAgc2FoYXJhSW5uOiBbMHhmOCwgJ1NhaGFyYSAtIElubiddLFxuICBzYWhhcmFUb29sU2hvcDogWzB4ZjksICdTYWhhcmEgLSBUb29sIFNob3AnXSxcbiAgc2FoYXJhRWxkZXJIb3VzZTogWzB4ZmEsICdTYWhhcmEgLSBFbGRlciBIb3VzZSddLFxuICBzYWhhcmFQYXduU2hvcDogWzB4ZmIsICdTYWhhcmEgLSBQYXduIFNob3AnXSxcbn0gYXMgY29uc3Q7XG4vLyB0eXBlIExvY2F0aW9ucyA9IHR5cGVvZiBMT0NBVElPTlM7XG5cbi8vIE5PVEU6IHRoaXMgd29ya3MgdG8gY29uc3RyYWluIHRoZSBrZXlzIHRvIGV4YWN0bHkgdGhlIHNhbWUuXG4vLyBjb25zdCB4OiB7cmVhZG9ubHkgW1QgaW4ga2V5b2YgdHlwZW9mIExPQ0FUSU9OU10/OiBzdHJpbmd9ID0ge307XG5cbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgYWxsb3dzIHByZXR0eSByb2J1c3QgY2hlY2tzIVxuLy8gY29uc3QgeCA9IGNoZWNrPEtleXNPZjxMb2NhdGlvbnMsIHN0cmluZyB8IGJvb2xlYW4+PigpKHtcbi8vICAgbGVhZjogJ3gnLFxuLy8gICBzd2FuOiB0cnVlLFxuLy8gfSk7XG4vLyBjb25zdCB5ID0gY2hlY2s8S2V5c09mPHR5cGVvZiB4LCBudW1iZXIsIHN0cmluZz4+KCkoe1xuLy8gICBzd2FuOiAxLFxuLy8gfSk7XG5cbi8vIHR5cGUgS2V5c09mPFQsIFYgPSB1bmtub3duLCBSID0gdW5rbm93bj4gPSB7W0sgaW4ga2V5b2YgVF0/OiBUW0tdIGV4dGVuZHMgUiA/IFYgOiBuZXZlcn07XG5cbi8vIGZ1bmN0aW9uIGNoZWNrPFQ+KCk6IDxVIGV4dGVuZHMgVD4oYXJnOiBVKSA9PiBVIHtcbi8vICAgcmV0dXJuIGFyZyA9PiBhcmc7XG4vLyB9XG5cbmNvbnN0IGxvY2F0aW9uTmFtZXM6IChzdHJpbmcgfCB1bmRlZmluZWQpW10gPSAoKCkgPT4ge1xuICBjb25zdCBuYW1lcyA9IFtdO1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhMT0NBVElPTlMpKSB7XG4gICAgY29uc3QgW2lkLCBuYW1lXSA9IChMT0NBVElPTlMgYXMgYW55KVtrZXldO1xuICAgIG5hbWVzW2lkXSA9IG5hbWU7XG4gIH1cbiAgcmV0dXJuIG5hbWVzO1xufSkoKTtcblxuY29uc3QgbG9jYXRpb25LZXlzOiAoa2V5b2YgdHlwZW9mIExPQ0FUSU9OUyB8IHVuZGVmaW5lZClbXSA9ICgoKSA9PiB7XG4gIGNvbnN0IGtleXMgPSBbXTtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoTE9DQVRJT05TKSkge1xuICAgIGNvbnN0IFtpZF0gPSAoTE9DQVRJT05TIGFzIGFueSlba2V5XTtcbiAgICBrZXlzW2lkXSA9IGtleTtcbiAgfVxuICByZXR1cm4ga2V5cyBhcyBhbnk7XG59KSgpO1xuXG5cbi8vIGJ1aWxkaW5nIHRoZSBDU1YgZm9yIHRoZSBsb2NhdGlvbiB0YWJsZS5cbi8vY29uc3QgaD0oeCk9Png9PW51bGw/J251bGwnOickJyt4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApO1xuLy8naWQsbmFtZSxiZ20sd2lkdGgsaGVpZ2h0LGFuaW1hdGlvbixleHRlbmRlZCx0aWxlcGF0MCx0aWxlcGF0MSx0aWxlcGFsMCx0aWxlcGFsMSx0aWxlc2V0LHRpbGUgZWZmZWN0cyxleGl0cyxzcHJwYXQwLHNwcnBhdDEsc3BycGFsMCxzcHJwYWwxLG9iajBkLG9iajBlLG9iajBmLG9iajEwLG9iajExLG9iajEyLG9iajEzLG9iajE0LG9iajE1LG9iajE2LG9iajE3LG9iajE4LG9iajE5LG9iajFhLG9iajFiLG9iajFjLG9iajFkLG9iajFlLG9iajFmXFxuJytyb20ubG9jYXRpb25zLm1hcChsPT4hbHx8IWwudXNlZD8nJzpbaChsLmlkKSxsLm5hbWUsaChsLmJnbSksbC5sYXlvdXRXaWR0aCxsLmxheW91dEhlaWdodCxsLmFuaW1hdGlvbixsLmV4dGVuZGVkLGgoKGwudGlsZVBhdHRlcm5zfHxbXSlbMF0pLGgoKGwudGlsZVBhdHRlcm5zfHxbXSlbMV0pLGgoKGwudGlsZVBhbGV0dGVzfHxbXSlbMF0pLGgoKGwudGlsZVBhbGV0dGVzfHxbXSlbMV0pLGgobC50aWxlc2V0KSxoKGwudGlsZUVmZmVjdHMpLFsuLi5uZXcgU2V0KGwuZXhpdHMubWFwKHg9PmgoeFsyXSkpKV0uam9pbignOicpLGgoKGwuc3ByaXRlUGF0dGVybnN8fFtdKVswXSksaCgobC5zcHJpdGVQYXR0ZXJuc3x8W10pWzFdKSxoKChsLnNwcml0ZVBhbGV0dGVzfHxbXSlbMF0pLGgoKGwuc3ByaXRlUGFsZXR0ZXN8fFtdKVsxXSksLi4ubmV3IEFycmF5KDE5KS5maWxsKDApLm1hcCgodixpKT0+KChsLm9iamVjdHN8fFtdKVtpXXx8W10pLnNsaWNlKDIpLm1hcCh4PT54LnRvU3RyaW5nKDE2KSkuam9pbignOicpKV0pLmZpbHRlcih4PT54KS5qb2luKCdcXG4nKVxuXG4vLyBidWlsZGluZyBjc3YgZm9yIGxvYy1vYmogY3Jvc3MtcmVmZXJlbmNlIHRhYmxlXG4vLyBzZXE9KHMsZSxmKT0+bmV3IEFycmF5KGUtcykuZmlsbCgwKS5tYXAoKHgsaSk9PmYoaStzKSk7XG4vLyB1bmlxPShhcnIpPT57XG4vLyAgIGNvbnN0IG09e307XG4vLyAgIGZvciAobGV0IG8gb2YgYXJyKSB7XG4vLyAgICAgb1s2XT1vWzVdPzE6MDtcbi8vICAgICBpZighb1s1XSltW29bMl1dPShtW29bMl1dfHwwKSsxO1xuLy8gICB9XG4vLyAgIGZvciAobGV0IG8gb2YgYXJyKSB7XG4vLyAgICAgaWYob1syXSBpbiBtKW9bNl09bVtvWzJdXTtcbi8vICAgICBkZWxldGUgbVtvWzJdXTtcbi8vICAgfVxuLy8gICByZXR1cm4gYXJyO1xuLy8gfVxuLy8gJ2xvYyxsb2NuYW1lLG1vbixtb25uYW1lLHNwYXduLHR5cGUsdW5pcSxwYXRzbG90LHBhdCxwYWxzbG90LHBhbDIscGFsM1xcbicrXG4vLyByb20ubG9jYXRpb25zLmZsYXRNYXAobD0+IWx8fCFsLnVzZWQ/W106dW5pcShzZXEoMHhkLDB4MjAscz0+e1xuLy8gICBjb25zdCBvPShsLm9iamVjdHN8fFtdKVtzLTB4ZF18fG51bGw7XG4vLyAgIGlmICghbykgcmV0dXJuIG51bGw7XG4vLyAgIGNvbnN0IHR5cGU9b1syXSY3O1xuLy8gICBjb25zdCBtPXR5cGU/bnVsbDoweDUwK29bM107XG4vLyAgIGNvbnN0IHBhdFNsb3Q9b1syXSYweDgwPzE6MDtcbi8vICAgY29uc3QgbW9uPW0/cm9tLm9iamVjdHNbbV06bnVsbDtcbi8vICAgY29uc3QgcGFsU2xvdD0obW9uP21vbi5wYWxldHRlcyhmYWxzZSk6W10pWzBdO1xuLy8gICBjb25zdCBhbGxQYWw9bmV3IFNldChtb24/bW9uLnBhbGV0dGVzKHRydWUpOltdKTtcbi8vICAgcmV0dXJuIFtoKGwuaWQpLGwubmFtZSxoKG0pLCcnLGgocyksdHlwZSwwLHBhdFNsb3QsbT9oKChsLnNwcml0ZVBhdHRlcm5zfHxbXSlbcGF0U2xvdF0pOicnLHBhbFNsb3QsYWxsUGFsLmhhcygyKT9oKChsLnNwcml0ZVBhbGV0dGVzfHxbXSlbMF0pOicnLGFsbFBhbC5oYXMoMyk/aCgobC5zcHJpdGVQYWxldHRlc3x8W10pWzFdKTonJ107XG4vLyB9KS5maWx0ZXIoeD0+eCkpKS5tYXAoYT0+YS5qb2luKCcsJykpLmZpbHRlcih4PT54KS5qb2luKCdcXG4nKTtcblxuLyoqXG4gKiBMb2NhdGlvbnMgd2l0aCBjYXZlIHN5c3RlbXMgdGhhdCBzaG91bGQgYWxsIGJlIHRyZWF0ZWQgYXMgbmVpZ2hib3JpbmcuXG4gKi9cbmNvbnN0IE5FWFVTRVM6IHtbVCBpbiBrZXlvZiB0eXBlb2YgTE9DQVRJT05TXT86IHRydWV9ID0ge1xuICBtdFNhYnJlV2VzdExvd2VyOiB0cnVlLFxuICBtdFNhYnJlV2VzdFVwcGVyOiB0cnVlLFxuICBtdFNhYnJlTm9ydGhNYWluOiB0cnVlLFxuICBtdFNhYnJlTm9ydGhNaWRkbGU6IHRydWUsXG4gIG10U2FicmVOb3J0aENhdmUxOiB0cnVlLFxuICBtdFNhYnJlTm9ydGhDYXZlMjogdHJ1ZSxcbiAgbXRIeWRyYTogdHJ1ZSxcbiAgbXRIeWRyYU91dHNpZGVTaHlyb246IHRydWUsXG4gIG10SHlkcmFDYXZlMTogdHJ1ZSxcbn07XG5cbmNvbnN0IEJPU1NfU0NSRUVOUzoge1tUIGluIGtleW9mIHR5cGVvZiBMT0NBVElPTlNdPzogbnVtYmVyfSA9IHtcbiAgc2VhbGVkQ2F2ZTc6IDB4OTEsXG4gIHN3YW1wOiAweDdjLFxuICBtdFNhYnJlTm9ydGhNYWluOiAweGI1LFxuICBzYWJlcmFQYWxhY2UxOiAweGZkLFxuICBzYWJlcmFQYWxhY2UzOiAweGZkLFxuICBzaHlyb25Gb3J0cmVzczogMHg3MCxcbiAgZ29hRm9ydHJlc3NLZWxiZXNxdWU6IDB4NzMsXG4gIGdvYUZvcnRyZXNzVG9ybmVsOiAweDkxLFxuICBnb2FGb3J0cmVzc0FzaW5hOiAweDkxLFxuICBnb2FGb3J0cmVzc0thcm1pbmU3OiAweGZkLFxuICBweXJhbWlkRHJheWdvbjogMHhmOSxcbiAgY3J5cHREcmF5Z29uMjogMHhmYSxcbiAgdG93ZXJEeW5hOiAweDVjLFxufTtcbiJdfQ==