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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFFbkMsT0FBTyxFQUFPLFNBQVMsRUFDZixlQUFlLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFDN0MsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUs1RCxNQUFNLE9BQU8sUUFBUyxTQUFRLE1BQU07SUF3Q2xDLFlBQVksR0FBUSxFQUFFLEVBQVU7UUFFOUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVmLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBRTNFLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekMsSUFBSSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQVMsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBRXJELElBQUksQ0FBQyxVQUFVLEdBQUcs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QUFDO0FBQ2IsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtJQUN4QyxDQUFDLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLENBQUMsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFckMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEQsSUFBSSxFQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9DLEtBQUssRUFBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWhELFFBQVE7UUFDTixPQUFPLFlBQVksSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBQ3BFLENBQUM7Q0FDRixDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDcEMsQ0FBQyxFQUFTLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFD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QUUsQ0FBQyxDQUFDLENBQUM7SUFDckMsSUFBSSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFbEMsTUFBTSxFQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLElBQUksRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWxDLElBQUksRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFNUIsUUFBUTtRQUNOLE9BQU8sT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUMzRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2xFLENBQUM7Q0FDRixDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDckMsQ0FBQyxFQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEMsRUFBRSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUxQixLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxFQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxD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LENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2pELGtCQUFrQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3JELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELHNCQUFzQixFQUFFLENBQUMsSUFBSSxFQUFFLDhCQUE4QixDQUFDO0lBQzlELG9CQUFvQixFQUFFLENBQUMsSUFBSSxFQUFFLDRCQUE0QixDQUFDO0lBQzFELHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLDhCQUE4QixDQUFDO0lBQzdELHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLDZCQUE2QixDQUFDO0lBQzVELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELHNCQUFzQixFQUFFLENBQUMsSUFBSSxFQUFFLDhCQUE4QixDQUFDO0lBRzlELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBR3BELFNBQVMsRUFBRSxD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LElBQUk7SUFDbkIsYUFBYSxFQUFFLElBQUk7SUFDbkIsY0FBYyxFQUFFLElBQUk7SUFDcEIsb0JBQW9CLEVBQUUsSUFBSTtJQUMxQixpQkFBaUIsRUFBRSxJQUFJO0lBQ3ZCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsbUJBQW1CLEVBQUUsSUFBSTtJQUN6QixjQUFjLEVBQUUsSUFBSTtJQUNwQixhQUFhLEVBQUUsSUFBSTtJQUNuQixTQUFTLEVBQUUsSUFBSTtDQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtFbnRpdHl9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7U2NyZWVufSBmcm9tICcuL3NjcmVlbi5qcyc7XG5pbXBvcnQge0RhdGEsIERhdGFUdXBsZSxcbiAgICAgICAgY29uY2F0SXRlcmFibGVzLCBncm91cCwgaGV4LCByZWFkTGl0dGxlRW5kaWFuLFxuICAgICAgICBzZXEsIHR1cGxlLCB2YXJTbGljZSwgd3JpdGVMaXR0bGVFbmRpYW59IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1dyaXRlcn0gZnJvbSAnLi93cml0ZXIuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgaXRlcnMsIGFzc2VydE5ldmVyLCBEZWZhdWx0TWFwIH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQgeyBNb25zdGVyIH0gZnJvbSAnLi9tb25zdGVyLmpzJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5cbi8vIExvY2F0aW9uIGVudGl0aWVzXG5leHBvcnQgY2xhc3MgTG9jYXRpb24gZXh0ZW5kcyBFbnRpdHkge1xuXG4gIHVzZWQ6IGJvb2xlYW47XG4gIG5hbWU6IHN0cmluZztcbiAga2V5OiBrZXlvZiB0eXBlb2YgTE9DQVRJT05TO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbWFwRGF0YVBvaW50ZXI6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBtYXBEYXRhQmFzZTogbnVtYmVyO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbGF5b3V0QmFzZTogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGdyYXBoaWNzQmFzZTogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGVudHJhbmNlc0Jhc2U6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBleGl0c0Jhc2U6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBmbGFnc0Jhc2U6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwaXRzQmFzZTogbnVtYmVyO1xuXG4gIGJnbTogbnVtYmVyO1xuICBsYXlvdXRXaWR0aDogbnVtYmVyO1xuICBsYXlvdXRIZWlnaHQ6IG51bWJlcjtcbiAgYW5pbWF0aW9uOiBudW1iZXI7XG4gIGV4dGVuZGVkOiBudW1iZXI7XG4gIHNjcmVlbnM6IG51bWJlcltdW107XG5cbiAgdGlsZVBhdHRlcm5zOiBbbnVtYmVyLCBudW1iZXJdO1xuICB0aWxlUGFsZXR0ZXM6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgdGlsZXNldDogbnVtYmVyO1xuICB0aWxlRWZmZWN0czogbnVtYmVyO1xuXG4gIGVudHJhbmNlczogRW50cmFuY2VbXTtcbiAgZXhpdHM6IEV4aXRbXTtcbiAgZmxhZ3M6IEZsYWdbXTtcbiAgcGl0czogUGl0W107XG5cbiAgaGFzU3Bhd25zOiBib29sZWFuO1xuICBucGNEYXRhUG9pbnRlcjogbnVtYmVyO1xuICBucGNEYXRhQmFzZTogbnVtYmVyO1xuICBzcHJpdGVQYWxldHRlczogW251bWJlciwgbnVtYmVyXTtcbiAgc3ByaXRlUGF0dGVybnM6IFtudW1iZXIsIG51bWJlcl07XG4gIHNwYXduczogU3Bhd25bXTtcblxuICBjb25zdHJ1Y3Rvcihyb206IFJvbSwgaWQ6IG51bWJlcikge1xuICAgIC8vIHdpbGwgaW5jbHVkZSBib3RoIE1hcERhdGEgKmFuZCogTnBjRGF0YSwgc2luY2UgdGhleSBzaGFyZSBhIGtleS5cbiAgICBzdXBlcihyb20sIGlkKTtcblxuICAgIHRoaXMubWFwRGF0YVBvaW50ZXIgPSAweDE0MzAwICsgKGlkIDw8IDEpO1xuICAgIHRoaXMubWFwRGF0YUJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YVBvaW50ZXIpICsgMHhjMDAwO1xuICAgIC8vIFRPRE8gLSBwYXNzIHRoaXMgaW4gYW5kIG1vdmUgTE9DQVRJT05TIHRvIGxvY2F0aW9ucy50c1xuICAgIHRoaXMubmFtZSA9IGxvY2F0aW9uTmFtZXNbdGhpcy5pZF0gfHwgJyc7XG4gICAgdGhpcy5rZXkgPSBsb2NhdGlvbktleXNbdGhpcy5pZF0gfHwgJycgYXMgYW55O1xuICAgIHRoaXMudXNlZCA9IHRoaXMubWFwRGF0YUJhc2UgPiAweGMwMDAgJiYgISF0aGlzLm5hbWU7XG5cbiAgICB0aGlzLmxheW91dEJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UpICsgMHhjMDAwO1xuICAgIHRoaXMuZ3JhcGhpY3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFCYXNlICsgMikgKyAweGMwMDA7XG4gICAgdGhpcy5lbnRyYW5jZXNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFCYXNlICsgNCkgKyAweGMwMDA7XG4gICAgdGhpcy5leGl0c0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UgKyA2KSArIDB4YzAwMDtcbiAgICB0aGlzLmZsYWdzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhQmFzZSArIDgpICsgMHhjMDAwO1xuXG4gICAgLy8gUmVhZCB0aGUgZXhpdHMgZmlyc3Qgc28gdGhhdCB3ZSBjYW4gZGV0ZXJtaW5lIGlmIHRoZXJlJ3MgZW50cmFuY2UvcGl0c1xuICAgIC8vIG1ldGFkYXRhIGVuY29kZWQgYXQgdGhlIGVuZC5cbiAgICBsZXQgaGFzUGl0cyA9IHRoaXMubGF5b3V0QmFzZSAhPT0gdGhpcy5tYXBEYXRhQmFzZSArIDEwO1xuICAgIGxldCBlbnRyYW5jZUxlbiA9IHRoaXMuZXhpdHNCYXNlIC0gdGhpcy5lbnRyYW5jZXNCYXNlO1xuICAgIHRoaXMuZXhpdHMgPSAoKCkgPT4ge1xuICAgICAgY29uc3QgZXhpdHMgPSBbXTtcbiAgICAgIGxldCBpID0gdGhpcy5leGl0c0Jhc2U7XG4gICAgICB3aGlsZSAoIShyb20ucHJnW2ldICYgMHg4MCkpIHtcbiAgICAgICAgZXhpdHMucHVzaChuZXcgRXhpdChyb20ucHJnLnNsaWNlKGksIGkgKyA0KSkpO1xuICAgICAgICBpICs9IDQ7XG4gICAgICB9XG4gICAgICBpZiAocm9tLnByZ1tpXSAhPT0gMHhmZikge1xuICAgICAgICBoYXNQaXRzID0gISEocm9tLnByZ1tpXSAmIDB4NDApO1xuICAgICAgICBlbnRyYW5jZUxlbiA9IChyb20ucHJnW2ldICYgMHgxZikgPDwgMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBleGl0cztcbiAgICB9KSgpO1xuXG4gICAgLy8gVE9ETyAtIHRoZXNlIGhldXJpc3RpY3Mgd2lsbCBub3Qgd29yayB0byByZS1yZWFkIHRoZSBsb2NhdGlvbnMuXG4gICAgLy8gICAgICAtIHdlIGNhbiBsb29rIGF0IHRoZSBvcmRlcjogaWYgdGhlIGRhdGEgaXMgQkVGT1JFIHRoZSBwb2ludGVyc1xuICAgIC8vICAgICAgICB0aGVuIHdlJ3JlIGluIGEgcmV3cml0dGVuIHN0YXRlOyBpbiB0aGF0IGNhc2UsIHdlIG5lZWQgdG8gc2ltcGx5XG4gICAgLy8gICAgICAgIGZpbmQgYWxsIHJlZnMgYW5kIG1heC4uLj9cbiAgICAvLyAgICAgIC0gY2FuIHdlIHJlYWQgdGhlc2UgcGFydHMgbGF6aWx5P1xuICAgIHRoaXMucGl0c0Jhc2UgPSAhaGFzUGl0cyA/IDAgOlxuICAgICAgICByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UgKyAxMCkgKyAweGMwMDA7XG5cbiAgICB0aGlzLmJnbSA9IHJvbS5wcmdbdGhpcy5sYXlvdXRCYXNlXTtcbiAgICB0aGlzLmxheW91dFdpZHRoID0gcm9tLnByZ1t0aGlzLmxheW91dEJhc2UgKyAxXTtcbiAgICB0aGlzLmxheW91dEhlaWdodCA9IHJvbS5wcmdbdGhpcy5sYXlvdXRCYXNlICsgMl07XG4gICAgdGhpcy5hbmltYXRpb24gPSByb20ucHJnW3RoaXMubGF5b3V0QmFzZSArIDNdO1xuICAgIHRoaXMuZXh0ZW5kZWQgPSByb20ucHJnW3RoaXMubGF5b3V0QmFzZSArIDRdO1xuICAgIHRoaXMuc2NyZWVucyA9IHNlcShcbiAgICAgICAgdGhpcy5oZWlnaHQsXG4gICAgICAgIHkgPT4gdHVwbGUocm9tLnByZywgdGhpcy5sYXlvdXRCYXNlICsgNSArIHkgKiB0aGlzLndpZHRoLCB0aGlzLndpZHRoKSk7XG4gICAgdGhpcy50aWxlUGFsZXR0ZXMgPSB0dXBsZTxudW1iZXI+KHJvbS5wcmcsIHRoaXMuZ3JhcGhpY3NCYXNlLCAzKTtcbiAgICB0aGlzLnRpbGVzZXQgPSByb20ucHJnW3RoaXMuZ3JhcGhpY3NCYXNlICsgM107XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHJvbS5wcmdbdGhpcy5ncmFwaGljc0Jhc2UgKyA0XTtcbiAgICB0aGlzLnRpbGVQYXR0ZXJucyA9IHR1cGxlKHJvbS5wcmcsIHRoaXMuZ3JhcGhpY3NCYXNlICsgNSwgMik7XG5cbiAgICB0aGlzLmVudHJhbmNlcyA9XG4gICAgICBncm91cCg0LCByb20ucHJnLnNsaWNlKHRoaXMuZW50cmFuY2VzQmFzZSwgdGhpcy5lbnRyYW5jZXNCYXNlICsgZW50cmFuY2VMZW4pLFxuICAgICAgICAgICAgeCA9PiBuZXcgRW50cmFuY2UoeCkpO1xuICAgIHRoaXMuZmxhZ3MgPSB2YXJTbGljZShyb20ucHJnLCB0aGlzLmZsYWdzQmFzZSwgMiwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gbmV3IEZsYWcoeCkpO1xuICAgIHRoaXMucGl0cyA9IHRoaXMucGl0c0Jhc2UgPyB2YXJTbGljZShyb20ucHJnLCB0aGlzLnBpdHNCYXNlLCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBuZXcgUGl0KHgpKSA6IFtdO1xuXG4gICAgdGhpcy5ucGNEYXRhUG9pbnRlciA9IDB4MTkyMDEgKyAoaWQgPDwgMSk7XG4gICAgdGhpcy5ucGNEYXRhQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5ucGNEYXRhUG9pbnRlcikgKyAweDEwMDAwO1xuICAgIHRoaXMuaGFzU3Bhd25zID0gdGhpcy5ucGNEYXRhQmFzZSAhPT0gMHgxMDAwMDtcbiAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID1cbiAgICAgICAgdGhpcy5oYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCB0aGlzLm5wY0RhdGFCYXNlICsgMSwgMikgOiBbMCwgMF07XG4gICAgdGhpcy5zcHJpdGVQYXR0ZXJucyA9XG4gICAgICAgIHRoaXMuaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgdGhpcy5ucGNEYXRhQmFzZSArIDMsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3Bhd25zID1cbiAgICAgICAgdGhpcy5oYXNTcGF3bnMgPyB2YXJTbGljZShyb20ucHJnLCB0aGlzLm5wY0RhdGFCYXNlICsgNSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBuZXcgU3Bhd24oeCkpIDogW107XG4gIH1cblxuICBzcGF3bihpZDogbnVtYmVyKTogU3Bhd24ge1xuICAgIGNvbnN0IHNwYXduID0gdGhpcy5zcGF3bnNbaWQgLSAweGRdO1xuICAgIGlmICghc3Bhd24pIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgc3Bhd24gJCR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gc3Bhd247XG4gIH1cblxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubGF5b3V0V2lkdGggKyAxOyB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7IHRoaXMubGF5b3V0V2lkdGggPSB3aWR0aCAtIDE7IH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7IHJldHVybiB0aGlzLmxheW91dEhlaWdodCArIDE7IH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlcikgeyB0aGlzLmxheW91dEhlaWdodCA9IGhlaWdodCAtIDE7IH1cblxuICAvLyBtb25zdGVycygpIHtcbiAgLy8gICBpZiAoIXRoaXMuc3Bhd25zKSByZXR1cm4gW107XG4gIC8vICAgcmV0dXJuIHRoaXMuc3Bhd25zLmZsYXRNYXAoXG4gIC8vICAgICAoWywsIHR5cGUsIGlkXSwgc2xvdCkgPT5cbiAgLy8gICAgICAgdHlwZSAmIDcgfHwgIXRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdID8gW10gOiBbXG4gIC8vICAgICAgICAgW3RoaXMuaWQsXG4gIC8vICAgICAgICAgIHNsb3QgKyAweDBkLFxuICAvLyAgICAgICAgICB0eXBlICYgMHg4MCA/IDEgOiAwLFxuICAvLyAgICAgICAgICBpZCArIDB4NTAsXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGF0dGVybnNbdHlwZSAmIDB4ODAgPyAxIDogMF0sXG4gIC8vICAgICAgICAgIHRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdLnBhbGV0dGVzKClbMF0sXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXNbdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSAtIDJdLFxuICAvLyAgICAgICAgIF1dKTtcbiAgLy8gfVxuXG4gIGFzeW5jIHdyaXRlKHdyaXRlcjogV3JpdGVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnVzZWQpIHJldHVybjtcbiAgICBjb25zdCBwcm9taXNlcyA9IFtdO1xuICAgIGlmICh0aGlzLmhhc1NwYXducykge1xuICAgICAgLy8gd3JpdGUgTlBDIGRhdGEgZmlyc3QsIGlmIHByZXNlbnQuLi5cbiAgICAgIGNvbnN0IGRhdGEgPSBbMCwgLi4udGhpcy5zcHJpdGVQYWxldHRlcywgLi4udGhpcy5zcHJpdGVQYXR0ZXJucyxcbiAgICAgICAgICAgICAgICAgICAgLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuc3Bhd25zKSwgMHhmZl07XG4gICAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgICAgIHdyaXRlci53cml0ZShkYXRhLCAweDE4MDAwLCAweDFiZmZmLCBgTnBjRGF0YSAke2hleCh0aGlzLmlkKX1gKVxuICAgICAgICAgICAgICAudGhlbihhZGRyZXNzID0+IHdyaXRlTGl0dGxlRW5kaWFuKFxuICAgICAgICAgICAgICAgICAgd3JpdGVyLnJvbSwgdGhpcy5ucGNEYXRhUG9pbnRlciwgYWRkcmVzcyAtIDB4MTAwMDApKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgd3JpdGUgPSAoZGF0YTogRGF0YTxudW1iZXI+LCBuYW1lOiBzdHJpbmcpID0+XG4gICAgICAgIHdyaXRlci53cml0ZShkYXRhLCAweDE0MDAwLCAweDE3ZmZmLCBgJHtuYW1lfSAke2hleCh0aGlzLmlkKX1gKTtcbiAgICBjb25zdCBsYXlvdXQgPSBbXG4gICAgICB0aGlzLmJnbSxcbiAgICAgIHRoaXMubGF5b3V0V2lkdGgsIHRoaXMubGF5b3V0SGVpZ2h0LCB0aGlzLmFuaW1hdGlvbiwgdGhpcy5leHRlbmRlZCxcbiAgICAgIC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLnNjcmVlbnMpXTtcbiAgICBjb25zdCBncmFwaGljcyA9XG4gICAgICAgIFsuLi50aGlzLnRpbGVQYWxldHRlcyxcbiAgICAgICAgIHRoaXMudGlsZXNldCwgdGhpcy50aWxlRWZmZWN0cyxcbiAgICAgICAgIC4uLnRoaXMudGlsZVBhdHRlcm5zXTtcbiAgICAvLyBRdWljayBzYW5pdHkgY2hlY2s6IGlmIGFuIGVudHJhbmNlL2V4aXQgaXMgYmVsb3cgdGhlIEhVRCBvbiBhXG4gICAgLy8gbm9uLXZlcnRpY2FsbHkgc2Nyb2xsaW5nIG1hcCwgdGhlbiB3ZSBuZWVkIHRvIG1vdmUgaXQgdXAuXG4gICAgaWYgKHRoaXMuaGVpZ2h0ID09PSAxKSB7XG4gICAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICAgIGlmIChlbnRyYW5jZS55ID4gMHhiZikgZW50cmFuY2UueSA9IDB4YmY7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0cykge1xuICAgICAgICBpZiAoZXhpdC55dCA+IDB4MGMpIGV4aXQueXQgPSAweDBjO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBlbnRyYW5jZXMgPSBjb25jYXRJdGVyYWJsZXModGhpcy5lbnRyYW5jZXMpO1xuICAgIGNvbnN0IGV4aXRzID0gWy4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmV4aXRzKSxcbiAgICAgICAgICAgICAgICAgICAweDgwIHwgKHRoaXMucGl0cy5sZW5ndGggPyAweDQwIDogMCkgfCB0aGlzLmVudHJhbmNlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICBdO1xuICAgIGNvbnN0IGZsYWdzID0gWy4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmZsYWdzKSwgMHhmZl07XG4gICAgY29uc3QgcGl0cyA9IGNvbmNhdEl0ZXJhYmxlcyh0aGlzLnBpdHMpO1xuICAgIGNvbnN0IFtsYXlvdXRBZGRyLCBncmFwaGljc0FkZHIsIGVudHJhbmNlc0FkZHIsIGV4aXRzQWRkciwgZmxhZ3NBZGRyLCBwaXRzQWRkcl0gPVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgd3JpdGUobGF5b3V0LCAnTGF5b3V0JyksXG4gICAgICAgICAgd3JpdGUoZ3JhcGhpY3MsICdHcmFwaGljcycpLFxuICAgICAgICAgIHdyaXRlKGVudHJhbmNlcywgJ0VudHJhbmNlcycpLFxuICAgICAgICAgIHdyaXRlKGV4aXRzLCAnRXhpdHMnKSxcbiAgICAgICAgICB3cml0ZShmbGFncywgJ0ZsYWdzJyksXG4gICAgICAgICAgLi4uKHBpdHMubGVuZ3RoID8gW3dyaXRlKHBpdHMsICdQaXRzJyldIDogW10pLFxuICAgICAgICBdKTtcbiAgICBjb25zdCBhZGRyZXNzZXMgPSBbXG4gICAgICBsYXlvdXRBZGRyICYgMHhmZiwgKGxheW91dEFkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGdyYXBoaWNzQWRkciAmIDB4ZmYsIChncmFwaGljc0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGVudHJhbmNlc0FkZHIgJiAweGZmLCAoZW50cmFuY2VzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZXhpdHNBZGRyICYgMHhmZiwgKGV4aXRzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZmxhZ3NBZGRyICYgMHhmZiwgKGZsYWdzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgLi4uKHBpdHNBZGRyID8gW3BpdHNBZGRyICYgMHhmZiwgKHBpdHNBZGRyID4+IDgpIC0gMHhjMF0gOiBbXSksXG4gICAgXTtcbiAgICBjb25zdCBiYXNlID0gYXdhaXQgd3JpdGUoYWRkcmVzc2VzLCAnTWFwRGF0YScpO1xuICAgIHdyaXRlTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIHRoaXMubWFwRGF0YVBvaW50ZXIsIGJhc2UgLSAweGMwMDApO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBib3NzIHJvb20sIHdyaXRlIHRoZSByZXN0b3JhdGlvbi5cbiAgICBjb25zdCBib3NzSWQgPSB0aGlzLmJvc3NJZCgpO1xuICAgIGlmIChib3NzSWQgIT0gbnVsbCAmJiB0aGlzLmlkICE9PSAweDVmKSB7IC8vIGRvbid0IHJlc3RvcmUgZHluYVxuICAgICAgLy8gVGhpcyB0YWJsZSBzaG91bGQgcmVzdG9yZSBwYXQwIGJ1dCBub3QgcGF0MVxuICAgICAgbGV0IHBhdHMgPSBbdGhpcy5zcHJpdGVQYXR0ZXJuc1swXSwgdW5kZWZpbmVkXTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweGE2KSBwYXRzID0gWzB4NTMsIDB4NTBdOyAvLyBkcmF5Z29uIDJcbiAgICAgIGNvbnN0IGJvc3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCAweDFmOTZiICsgMiAqIGJvc3NJZCkgKyAweDE0MDAwO1xuICAgICAgY29uc3QgYm9zc1Jlc3RvcmUgPSBbXG4gICAgICAgICwsLCB0aGlzLmJnbSwsXG4gICAgICAgIC4uLnRoaXMudGlsZVBhbGV0dGVzLCwsLCB0aGlzLnNwcml0ZVBhbGV0dGVzWzBdLCxcbiAgICAgICAgLCwsLCBwYXRzWzBdLCBwYXRzWzFdLFxuICAgICAgICB0aGlzLmFuaW1hdGlvbixcbiAgICAgIF07XG5cbiAgICAgIC8vIGlmIChyZWFkTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIGJvc3NCYXNlKSA9PT0gMHhiYTk4KSB7XG4gICAgICAvLyAgIC8vIGVzY2FwZSBhbmltYXRpb246IGRvbid0IGNsb2JiZXIgcGF0dGVybnMgeWV0P1xuICAgICAgLy8gfVxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBib3NzUmVzdG9yZS5sZW5ndGg7IGorKykge1xuICAgICAgICBjb25zdCByZXN0b3JlZCA9IGJvc3NSZXN0b3JlW2pdO1xuICAgICAgICBpZiAocmVzdG9yZWQgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHdyaXRlci5yb21bYm9zc0Jhc2UgKyBqXSA9IHJlc3RvcmVkO1xuICAgICAgfVxuICAgICAgLy8gbGF0ZXIgc3BvdCBmb3IgcGFsMyBhbmQgcGF0MSAqYWZ0ZXIqIGV4cGxvc2lvblxuICAgICAgY29uc3QgYm9zc0Jhc2UyID0gMHgxZjdjMSArIDUgKiBib3NzSWQ7XG4gICAgICB3cml0ZXIucm9tW2Jvc3NCYXNlMl0gPSB0aGlzLnNwcml0ZVBhbGV0dGVzWzFdO1xuICAgICAgLy8gTk9URTogVGhpcyBydWlucyB0aGUgdHJlYXN1cmUgY2hlc3QuXG4gICAgICAvLyBUT0RPIC0gYWRkIHNvbWUgYXNtIGFmdGVyIGEgY2hlc3QgaXMgY2xlYXJlZCB0byByZWxvYWQgcGF0dGVybnM/XG4gICAgICAvLyBBbm90aGVyIG9wdGlvbiB3b3VsZCBiZSB0byBhZGQgYSBsb2NhdGlvbi1zcGVjaWZpYyBjb250cmFpbnQgdG8gYmVcbiAgICAgIC8vIHdoYXRldmVyIHRoZSBib3NzIFxuICAgICAgLy93cml0ZXIucm9tW2Jvc3NCYXNlMiArIDFdID0gdGhpcy5zcHJpdGVQYXR0ZXJuc1sxXTtcbiAgICB9XG4gIH1cblxuICBhbGxTY3JlZW5zKCk6IFNldDxTY3JlZW4+IHtcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IFNldDxTY3JlZW4+KCk7XG4gICAgY29uc3QgZXh0ID0gdGhpcy5leHRlbmRlZCA/IDB4MTAwIDogMDtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHJvdykge1xuICAgICAgICBzY3JlZW5zLmFkZCh0aGlzLnJvbS5zY3JlZW5zW3NjcmVlbiArIGV4dF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2NyZWVucztcbiAgfVxuXG4gIGJvc3NJZCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgwZTsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5yb20ucHJnWzB4MWY5NWQgKyBpXSA9PT0gdGhpcy5pZCkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBuZWlnaGJvcnMoam9pbk5leHVzZXM6IGJvb2xlYW4gPSBmYWxzZSk6IFNldDxMb2NhdGlvbj4ge1xuICAgIGNvbnN0IG91dCA9IG5ldyBTZXQ8TG9jYXRpb24+KCk7XG4gICAgY29uc3QgYWRkTmVpZ2hib3JzID0gKGw6IExvY2F0aW9uKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbC5leGl0cykge1xuICAgICAgICBjb25zdCBpZCA9IGV4aXQuZGVzdDtcbiAgICAgICAgY29uc3QgbmVpZ2hib3IgPSB0aGlzLnJvbS5sb2NhdGlvbnNbaWRdO1xuICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IudXNlZCAmJlxuICAgICAgICAgICAgbmVpZ2hib3IgIT09IHRoaXMgJiYgIW91dC5oYXMobmVpZ2hib3IpKSB7XG4gICAgICAgICAgb3V0LmFkZChuZWlnaGJvcik7XG4gICAgICAgICAgaWYgKGpvaW5OZXh1c2VzICYmIE5FWFVTRVNbbmVpZ2hib3Iua2V5XSkge1xuICAgICAgICAgICAgYWRkTmVpZ2hib3JzKG5laWdoYm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgYWRkTmVpZ2hib3JzKHRoaXMpO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBoYXNEb2xwaGluKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlkID09PSAweDYwIHx8IHRoaXMuaWQgPT09IDB4NjQgfHwgdGhpcy5pZCA9PT0gMHg2ODtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIE1hcCBvZiB0aWxlcyAoJFlYeXgpIHJlYWNoYWJsZSBmcm9tIGFueSBlbnRyYW5jZSB0b1xuICAgKiB1bmZsYWdnZWQgdGlsZWVmZmVjdHMuXG4gICAqL1xuICByZWFjaGFibGVUaWxlcyhmbHkgPSBmYWxzZSk6IE1hcDxudW1iZXIsIG51bWJlcj4ge1xuICAgIC8vIFRPRE8gLSBhcmdzIGZvciAoMSkgdXNlIG5vbi0yZWYgZmxhZ3MsICgyKSBvbmx5IGZyb20gZ2l2ZW4gZW50cmFuY2UvdGlsZVxuICAgIC8vIERvbHBoaW4gbWFrZXMgTk9fV0FMSyBva2F5IGZvciBzb21lIGxldmVscy5cbiAgICBpZiAodGhpcy5oYXNEb2xwaGluKCkpIGZseSA9IHRydWU7XG4gICAgLy8gVGFrZSBpbnRvIGFjY291bnQgdGhlIHRpbGVzZXQgYW5kIGZsYWdzIGJ1dCBub3QgYW55IG92ZXJsYXkuXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgU2V0KHRoaXMuZXhpdHMubWFwKGV4aXQgPT4gZXhpdC5zY3JlZW4gPDwgOCB8IGV4aXQudGlsZSkpO1xuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxudW1iZXI+KCk7XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXQodGhpcy50aWxlc2V0KTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW3RoaXMudGlsZUVmZmVjdHMgLSAweGIzXTtcbiAgICBjb25zdCBwYXNzYWJsZSA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIFxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gdGhpcy5zY3JlZW5zW3ldO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tyb3dbeF0gfCAodGhpcy5leHRlbmRlZCA/IDB4MTAwIDogMCldO1xuICAgICAgICBjb25zdCBwb3MgPSB5IDw8IDQgfCB4O1xuICAgICAgICBjb25zdCBmbGFnID0gdGhpcy5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IHBvcyk7XG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICAgICAgY29uc3QgdGlsZUlkID0gcG9zIDw8IDggfCB0O1xuICAgICAgICAgIGlmIChleGl0cy5oYXModGlsZUlkKSkgY29udGludWU7IC8vIGRvbid0IGdvIHBhc3QgZXhpdHNcbiAgICAgICAgICBsZXQgdGlsZSA9IHNjcmVlbi50aWxlc1t0XTtcbiAgICAgICAgICAvLyBmbGFnIDJlZiBpcyBcImFsd2F5cyBvblwiLCBkb24ndCBldmVuIGJvdGhlciBtYWtpbmcgaXQgY29uZGl0aW9uYWwuXG4gICAgICAgICAgbGV0IGVmZmVjdHMgPSB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgIGxldCBibG9ja2VkID0gZmx5ID8gZWZmZWN0cyAmIDB4MDQgOiBlZmZlY3RzICYgMHgwNjtcbiAgICAgICAgICBpZiAoZmxhZyAmJiBibG9ja2VkICYmIHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPSB0aWxlKSB7XG4gICAgICAgICAgICB0aWxlID0gdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdO1xuICAgICAgICAgICAgZWZmZWN0cyA9IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgICBibG9ja2VkID0gZmx5ID8gZWZmZWN0cyAmIDB4MDQgOiBlZmZlY3RzICYgMHgwNjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFibG9ja2VkKSBwYXNzYWJsZS5hZGQodGlsZUlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAobGV0IHQgb2YgcGFzc2FibGUpIHtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gKHQgJiAweDBmKSA9PT0gMHgwZiA/IHQgKyAweGYxIDogdCArIDE7XG4gICAgICBpZiAocGFzc2FibGUuaGFzKHJpZ2h0KSkgdWYudW5pb24oW3QsIHJpZ2h0XSk7XG4gICAgICBjb25zdCBiZWxvdyA9ICh0ICYgMHhmMCkgPT09IDB4ZTAgPyB0ICsgMHhmMjAgOiB0ICsgMTY7XG4gICAgICBpZiAocGFzc2FibGUuaGFzKGJlbG93KSkgdWYudW5pb24oW3QsIGJlbG93XSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gdWYubWFwKCk7XG4gICAgY29uc3Qgc2V0cyA9IG5ldyBTZXQ8U2V0PG51bWJlcj4+KCk7XG4gICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgY29uc3QgaWQgPSBlbnRyYW5jZS5zY3JlZW4gPDwgOCB8IGVudHJhbmNlLnRpbGU7XG4gICAgICBzZXRzLmFkZChtYXAuZ2V0KGlkKSEpO1xuICAgIH1cblxuICAgIGNvbnN0IG91dCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBzZXQgb2Ygc2V0cykge1xuICAgICAgZm9yIChjb25zdCB0IG9mIHNldCkge1xuICAgICAgICBjb25zdCBzY3IgPSB0aGlzLnNjcmVlbnNbdCA+Pj4gMTJdWyh0ID4+PiA4KSAmIDB4MGZdO1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3NjciB8ICh0aGlzLmV4dGVuZGVkID8gMHgxMDAgOiAwKV07XG4gICAgICAgIG91dC5zZXQodCwgdGlsZUVmZmVjdHMuZWZmZWN0c1tzY3JlZW4udGlsZXNbdCAmIDB4ZmZdXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICAvKiogU2FmZXIgdmVyc2lvbiBvZiB0aGUgYmVsb3c/ICovXG4gIHNjcmVlbk1vdmVyKCk6IChvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcikgPT4gdm9pZCB7XG4gICAgY29uc3QgbWFwID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBBcnJheTx7c2NyZWVuOiBudW1iZXJ9Pj4oKCkgPT4gW10pO1xuICAgIGNvbnN0IG9ianMgPVxuICAgICAgICBpdGVycy5jb25jYXQ8e3NjcmVlbjogbnVtYmVyfT4odGhpcy5zcGF3bnMsIHRoaXMuZXhpdHMsIHRoaXMuZW50cmFuY2VzKTtcbiAgICBmb3IgKGNvbnN0IG9iaiBvZiBvYmpzKSB7XG4gICAgICBtYXAuZ2V0KG9iai5zY3JlZW4pLnB1c2gob2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIChvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcikgPT4ge1xuICAgICAgZm9yIChjb25zdCBvYmogb2YgbWFwLmdldChvcmlnKSkge1xuICAgICAgICBvYmouc2NyZWVuID0gcmVwbDtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIGFsbCBzcGF3bnMsIGVudHJhbmNlcywgYW5kIGV4aXRzLlxuICAgKiBAcGFyYW0gb3JpZyBZWCBvZiB0aGUgb3JpZ2luYWwgc2NyZWVuLlxuICAgKiBAcGFyYW0gcmVwbCBZWCBvZiB0aGUgZXF1aXZhbGVudCByZXBsYWNlbWVudCBzY3JlZW4uXG4gICAqL1xuICBtb3ZlU2NyZWVuKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc3Qgb2JqcyA9XG4gICAgICAgIGl0ZXJzLmNvbmNhdDx7c2NyZWVuOiBudW1iZXJ9Pih0aGlzLnNwYXducywgdGhpcy5leGl0cywgdGhpcy5lbnRyYW5jZXMpO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIG9ianMpIHtcbiAgICAgIGlmIChvYmouc2NyZWVuID09PSBvcmlnKSBvYmouc2NyZWVuID0gcmVwbDtcbiAgICB9XG4gIH1cblxuICBtb25zdGVyUGxhY2VyKHJhbmRvbTogUmFuZG9tKTogKG06IE1vbnN0ZXIpID0+IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgLy8gSWYgdGhlcmUncyBhIGJvc3Mgc2NyZWVuLCBleGNsdWRlIGl0IGZyb20gZ2V0dGluZyBlbmVtaWVzLlxuICAgIGNvbnN0IGJvc3MgPSBCT1NTX1NDUkVFTlNbdGhpcy5rZXldO1xuICAgIC8vIFN0YXJ0IHdpdGggbGlzdCBvZiByZWFjaGFibGUgdGlsZXMuXG4gICAgY29uc3QgcmVhY2hhYmxlID0gdGhpcy5yZWFjaGFibGVUaWxlcyhmYWxzZSk7XG4gICAgLy8gRG8gYSBicmVhZHRoLWZpcnN0IHNlYXJjaCBvZiBhbGwgdGlsZXMgdG8gZmluZCBcImRpc3RhbmNlXCIgKDEtbm9ybSkuXG4gICAgY29uc3QgZXh0ZW5kZWQgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPihbLi4ucmVhY2hhYmxlLmtleXMoKV0ubWFwKHggPT4gW3gsIDBdKSk7XG4gICAgY29uc3Qgbm9ybWFsOiBudW1iZXJbXSA9IFtdOyAvLyByZWFjaGFibGUsIG5vdCBzbG9wZSBvciB3YXRlclxuICAgIGNvbnN0IG1vdGhzOiBudW1iZXJbXSA9IFtdOyAgLy8gZGlzdGFuY2Ug4oiIIDMuLjdcbiAgICBjb25zdCBiaXJkczogbnVtYmVyW10gPSBbXTsgIC8vIGRpc3RhbmNlID4gMTJcbiAgICBjb25zdCBwbGFudHM6IG51bWJlcltdID0gW107IC8vIGRpc3RhbmNlIOKIiCAyLi40XG4gICAgY29uc3QgcGxhY2VkOiBBcnJheTxbTW9uc3RlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgY29uc3Qgbm9ybWFsVGVycmFpbk1hc2sgPSB0aGlzLmhhc0RvbHBoaW4oKSA/IDB4MjUgOiAweDI3O1xuICAgIGZvciAoY29uc3QgW3QsIGRpc3RhbmNlXSBvZiBleHRlbmRlZCkge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweGZdO1xuICAgICAgaWYgKHNjciA9PT0gYm9zcykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IG4gb2YgbmVpZ2hib3JzKHQsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSkge1xuICAgICAgICBpZiAoZXh0ZW5kZWQuaGFzKG4pKSBjb250aW51ZTtcbiAgICAgICAgZXh0ZW5kZWQuc2V0KG4sIGRpc3RhbmNlICsgMSk7XG4gICAgICB9XG4gICAgICBpZiAoIWRpc3RhbmNlICYmICEocmVhY2hhYmxlLmdldCh0KSEgJiBub3JtYWxUZXJyYWluTWFzaykpIG5vcm1hbC5wdXNoKHQpO1xuICAgICAgaWYgKHRoaXMuaWQgPT09IDB4MWEpIHtcbiAgICAgICAgLy8gU3BlY2lhbC1jYXNlIHRoZSBzd2FtcCBmb3IgcGxhbnQgcGxhY2VtZW50XG4gICAgICAgIGlmICh0aGlzLnJvbS5zY3JlZW5zW3Njcl0udGlsZXNbdCAmIDB4ZmZdID09PSAweGYwKSBwbGFudHMucHVzaCh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChkaXN0YW5jZSA+PSAyICYmIGRpc3RhbmNlIDw9IDQpIHBsYW50cy5wdXNoKHQpO1xuICAgICAgfVxuICAgICAgaWYgKGRpc3RhbmNlID49IDMgJiYgZGlzdGFuY2UgPD0gNykgbW90aHMucHVzaCh0KTtcbiAgICAgIGlmIChkaXN0YW5jZSA+PSAxMikgYmlyZHMucHVzaCh0KTtcbiAgICAgIC8vIFRPRE8gLSBzcGVjaWFsLWNhc2Ugc3dhbXAgZm9yIHBsYW50IGxvY2F0aW9ucz9cbiAgICB9XG4gICAgLy8gV2Ugbm93IGtub3cgYWxsIHRoZSBwb3NzaWJsZSBwbGFjZXMgdG8gcGxhY2UgdGhpbmdzLlxuICAgIC8vICAtIE5PVEU6IHN0aWxsIG5lZWQgdG8gbW92ZSBjaGVzdHMgdG8gZGVhZCBlbmRzLCBldGM/XG4gICAgcmV0dXJuIChtOiBNb25zdGVyKSA9PiB7XG4gICAgICAvLyBjaGVjayBmb3IgcGxhY2VtZW50LlxuICAgICAgY29uc3QgcGxhY2VtZW50ID0gbS5wbGFjZW1lbnQoKTtcbiAgICAgIGNvbnN0IHBvb2wgPSBbLi4uKHBsYWNlbWVudCA9PT0gJ25vcm1hbCcgPyBub3JtYWwgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnbW90aCcgPyBtb3RocyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdiaXJkJyA/IGJpcmRzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ3BsYW50JyA/IHBsYW50cyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnROZXZlcihwbGFjZW1lbnQpKV1cbiAgICAgIFBPT0w6XG4gICAgICB3aGlsZSAocG9vbC5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgaSA9IHJhbmRvbS5uZXh0SW50KHBvb2wubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgW3Bvc10gPSBwb29sLnNwbGljZShpLCAxKTtcblxuICAgICAgICBjb25zdCB4ID0gKHBvcyAmIDB4ZjAwKSA+Pj4gNCB8IChwb3MgJiAweGYpO1xuICAgICAgICBjb25zdCB5ID0gKHBvcyAmIDB4ZjAwMCkgPj4+IDggfCAocG9zICYgMHhmMCkgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHIgPSBtLmNsZWFyYW5jZSgpO1xuXG4gICAgICAgIC8vIHRlc3QgZGlzdGFuY2UgZnJvbSBvdGhlciBlbmVtaWVzLlxuICAgICAgICBmb3IgKGNvbnN0IFssIHgxLCB5MSwgcjFdIG9mIHBsYWNlZCkge1xuICAgICAgICAgIGNvbnN0IHoyID0gKCh5IC0geTEpICoqIDIgKyAoeCAtIHgxKSAqKiAyKTtcbiAgICAgICAgICBpZiAoejIgPCAociArIHIxKSAqKiAyKSBjb250aW51ZSBQT09MO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRlc3QgZGlzdGFuY2UgZnJvbSBlbnRyYW5jZXMuXG4gICAgICAgIGZvciAoY29uc3Qge3g6IHgxLCB5OiB5MX0gb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtICh5MSA+PiA0KSkgKiogMiArICh4IC0gKHgxID4+IDQpKSAqKiAyKTtcbiAgICAgICAgICBpZiAoejIgPCAociArIDEpICoqIDIpIGNvbnRpbnVlIFBPT0w7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZCBzcG90IChzdGlsbCwgaG93IHRvYSBhcHByb3hpbWF0ZWx5ICptYXhpbWl6ZSogZGlzdGFuY2VzPylcbiAgICAgICAgcGxhY2VkLnB1c2goW20sIHgsIHksIHJdKTtcbiAgICAgICAgY29uc3Qgc2NyID0gKHkgJiAweGYwKSB8ICh4ICYgMHhmMCkgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHRpbGUgPSAoeSAmIDB4MGYpIDw8IDQgfCAoeCAmIDB4MGYpO1xuICAgICAgICByZXR1cm4gc2NyIDw8IDggfCB0aWxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbiAgLy8gVE9ETyAtIGFsbG93IGxlc3MgcmFuZG9tbmVzcyBmb3IgY2VydGFpbiBjYXNlcywgZS5nLiB0b3Agb2Ygbm9ydGggc2FicmUgb3JcbiAgLy8gYXBwcm9wcmlhdGUgc2lkZSBvZiBjb3JkZWwuXG5cbiAgLyoqIEByZXR1cm4geyFTZXQ8bnVtYmVyPn0gKi9cbiAgLy8gYWxsVGlsZXMoKSB7XG4gIC8vICAgY29uc3QgdGlsZXMgPSBuZXcgU2V0KCk7XG4gIC8vICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5zY3JlZW5zKSB7XG4gIC8vICAgICBmb3IgKGNvbnN0IHRpbGUgb2Ygc2NyZWVuLmFsbFRpbGVzKCkpIHtcbiAgLy8gICAgICAgdGlsZXMuYWRkKHRpbGUpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gdGlsZXM7XG4gIC8vIH1cbn1cblxuLy8gVE9ETyAtIG1vdmUgdG8gYSBiZXR0ZXItb3JnYW5pemVkIGRlZGljYXRlZCBcImdlb21ldHJ5XCIgbW9kdWxlP1xuZnVuY3Rpb24gbmVpZ2hib3JzKHRpbGU6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBudW1iZXJbXSB7XG4gIGNvbnN0IG91dCA9IFtdO1xuICBjb25zdCB5ID0gdGlsZSAmIDB4ZjBmMDtcbiAgY29uc3QgeCA9IHRpbGUgJiAweDBmMGY7XG4gIGlmICh5IDwgKChoZWlnaHQgLSAxKSA8PCAxMiB8IDB4ZTApKSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweGYwKSA9PT0gMHhlMCA/IHRpbGUgKyAweDBmMjAgOiB0aWxlICsgMTYpO1xuICB9XG4gIGlmICh5KSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweGYwKSA9PT0gMHgwMCA/IHRpbGUgLSAweDBmMjAgOiB0aWxlIC0gMTYpO1xuICB9XG4gIGlmICh4IDwgKCh3aWR0aCAtIDEpIDw8IDggfCAweDBmKSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHgwZikgPT09IDB4MGYgPyB0aWxlICsgMHgwMGYxIDogdGlsZSArIDEpO1xuICB9XG4gIGlmICh4KSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweDBmKSA9PT0gMHgwMCA/IHRpbGUgLSAweDAwZjEgOiB0aWxlIC0gMSk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGNvbnN0IEVudHJhbmNlID0gRGF0YVR1cGxlLm1ha2UoNCwge1xuICB4OiBEYXRhVHVwbGUucHJvcChbMF0sIFsxLCAweGZmLCAtOF0pLFxuICB5OiBEYXRhVHVwbGUucHJvcChbMl0sIFszLCAweGZmLCAtOF0pLFxuXG4gIHNjcmVlbjogRGF0YVR1cGxlLnByb3AoWzMsIDB4MGYsIC00XSwgWzEsIDB4MGZdKSxcbiAgdGlsZTogICBEYXRhVHVwbGUucHJvcChbMiwgMHhmMF0sIFswLCAweGYwLCA0XSksXG4gIGNvb3JkOiAgRGF0YVR1cGxlLnByb3AoWzIsIDB4ZmYsIC04XSwgWzAsIDB4ZmZdKSxcblxuICB0b1N0cmluZyh0aGlzOiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgRW50cmFuY2UgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSlgO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBFbnRyYW5jZSA9IEluc3RhbmNlVHlwZTx0eXBlb2YgRW50cmFuY2U+O1xuXG5leHBvcnQgY29uc3QgRXhpdCA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgeDogICAgICAgIERhdGFUdXBsZS5wcm9wKFswLCAweGZmLCAtNF0pLFxuICB4dDogICAgICAgRGF0YVR1cGxlLnByb3AoWzBdKSxcblxuICB5OiAgICAgICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4ZmYsIC00XSksXG4gIHl0OiAgICAgICBEYXRhVHVwbGUucHJvcChbMV0pLFxuXG4gIHNjcmVlbjogICBEYXRhVHVwbGUucHJvcChbMSwgMHhmMF0sIFswLCAweGYwLCA0XSksXG4gIHRpbGU6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHgwZiwgLTRdLCBbMCwgMHgwZl0pLFxuXG4gIGRlc3Q6ICAgICBEYXRhVHVwbGUucHJvcChbMl0pLFxuXG4gIGVudHJhbmNlOiBEYXRhVHVwbGUucHJvcChbM10pLFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBFeGl0ICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLngpfSwgJHtoZXgodGhpcy55KX0pID0+ICR7XG4gICAgICAgICAgICB0aGlzLmRlc3R9OiR7dGhpcy5lbnRyYW5jZX1gO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBFeGl0ID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBFeGl0PjtcblxuZXhwb3J0IGNvbnN0IEZsYWcgPSBEYXRhVHVwbGUubWFrZSgyLCB7XG4gIGZsYWc6ICB7XG4gICAgZ2V0KHRoaXM6IGFueSk6IG51bWJlciB7IHJldHVybiB0aGlzLmRhdGFbMF0gfCAweDIwMDsgfSxcbiAgICBzZXQodGhpczogYW55LCBmOiBudW1iZXIpIHtcbiAgICAgIGlmICgoZiAmIH4weGZmKSAhPT0gMHgyMDApIHRocm93IG5ldyBFcnJvcihgYmFkIGZsYWc6ICR7aGV4KGYpfWApO1xuICAgICAgdGhpcy5kYXRhWzBdID0gZiAmIDB4ZmY7XG4gICAgfSxcbiAgfSxcblxuICB4OiAgICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4MDcsIC04XSksXG4gIHhzOiAgICBEYXRhVHVwbGUucHJvcChbMSwgMHgwN10pLFxuXG4gIHk6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHhmMCwgLTRdKSxcbiAgeXM6ICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGYwLCA0XSksXG5cbiAgLy8gVE9ETyAtIHJlbW92ZSB0aGUgJ3l4JyB2ZXJzaW9uXG4gIHl4OiAgICBEYXRhVHVwbGUucHJvcChbMV0pLCAvLyB5IGluIGhpIG5pYmJsZSwgeCBpbiBsby5cbiAgc2NyZWVuOiBEYXRhVHVwbGUucHJvcChbMV0pLFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBGbGFnICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLnhzKX0sICR7aGV4KHRoaXMueXMpfSkgQCAke1xuICAgICAgICAgICAgaGV4KHRoaXMuZmxhZyl9YDtcbiAgfSxcbn0pO1xuZXhwb3J0IHR5cGUgRmxhZyA9IEluc3RhbmNlVHlwZTx0eXBlb2YgRmxhZz47XG5cbmV4cG9ydCBjb25zdCBQaXQgPSBEYXRhVHVwbGUubWFrZSg0LCB7XG4gIGZyb21YczogIERhdGFUdXBsZS5wcm9wKFsxLCAweDcwLCA0XSksXG4gIHRvWHM6ICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDA3XSksXG5cbiAgZnJvbVlzOiAgRGF0YVR1cGxlLnByb3AoWzMsIDB4ZjAsIDRdKSxcbiAgdG9ZczogICAgRGF0YVR1cGxlLnByb3AoWzMsIDB4MGZdKSxcblxuICBkZXN0OiAgICBEYXRhVHVwbGUucHJvcChbMF0pLFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBQaXQgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMuZnJvbVhzKX0sICR7aGV4KHRoaXMuZnJvbVlzKX0pID0+ICR7XG4gICAgICAgICAgICBoZXgodGhpcy5kZXN0KX06KCR7aGV4KHRoaXMudG9Ycyl9LCAke2hleCh0aGlzLnRvWXMpfSlgO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBQaXQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIFBpdD47XG5cbmV4cG9ydCBjb25zdCBTcGF3biA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgeTogICAgIERhdGFUdXBsZS5wcm9wKFswLCAweGZmLCAtNF0pLFxuICB5dDogICAgRGF0YVR1cGxlLnByb3AoWzBdKSxcblxuICB0aW1lZDogRGF0YVR1cGxlLmJvb2xlYW5Qcm9wKFsxLCAweDgwLCA3XSksXG4gIHg6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHg3ZiwgLTRdLCBbMiwgMHg0MCwgM10pLFxuICB4dDogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4N2ZdKSxcblxuICBzY3JlZW46IERhdGFUdXBsZS5wcm9wKFswLCAweGYwXSwgWzEsIDB4ZjAsIDRdKSxcbiAgdGlsZTogICBEYXRhVHVwbGUucHJvcChbMCwgMHgwZiwgLTRdLCBbMSwgMHgwZl0pLFxuXG4gIHBhdHRlcm5CYW5rOiBEYXRhVHVwbGUucHJvcChbMiwgMHg4MCwgN10pLFxuICB0eXBlOiAgRGF0YVR1cGxlLnByb3AoWzIsIDB4MDddKSxcblxuLy8gcGF0dGVybkJhbms6IHtnZXQodGhpczogYW55KTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YVsyXSA+Pj4gNzsgfSxcbi8vICAgICAgICAgICAgICAgc2V0KHRoaXM6IGFueSwgdjogbnVtYmVyKSB7IGlmICh0aGlzLmRhdGFbM10gPT09IDEyMCkgZGVidWdnZXI7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodikgdGhpcy5kYXRhWzJdIHw9IDB4ODA7IGVsc2UgdGhpcy5kYXRhWzJdICY9IDB4N2Y7IH19LFxuICBpZDogICAgRGF0YVR1cGxlLnByb3AoWzNdKSxcblxuICB1c2VkOiB7Z2V0KHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5kYXRhWzBdICE9PSAweGZlOyB9LFxuICAgICAgICAgc2V0KHRoaXM6IGFueSwgdXNlZDogYm9vbGVhbikgeyB0aGlzLmRhdGFbMF0gPSB1c2VkID8gMCA6IDB4ZmU7IH19LFxuICBtb25zdGVySWQ6IHtnZXQodGhpczogYW55KTogbnVtYmVyIHsgcmV0dXJuICh0aGlzLmlkICsgMHg1MCkgJiAweGZmOyB9LFxuICAgICAgICAgICAgICBzZXQodGhpczogYW55LCBpZDogbnVtYmVyKSB7IHRoaXMuaWQgPSAoaWQgLSAweDUwKSAmIDB4ZmY7IH19LFxuICAvKiogTm90ZTogdGhpcyBpbmNsdWRlcyBtaW1pY3MuICovXG4gIGlzQ2hlc3QodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDIgJiYgdGhpcy5pZCA8IDB4ODA7IH0sXG4gIGlzSW52aXNpYmxlKHRoaXM6IGFueSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzQ2hlc3QoKSAmJiBCb29sZWFuKHRoaXMuZGF0YVsyXSAmIDB4MjApO1xuICB9LFxuICBpc1RyaWdnZXIodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDIgJiYgdGhpcy5pZCA+PSAweDgwOyB9LFxuICBpc05wYyh0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMSAmJiB0aGlzLmlkIDwgMHhjMDsgfSxcbiAgaXNCb3NzKHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAxICYmIHRoaXMuaWQgPj0gMHhjMDsgfSxcbiAgaXNNb25zdGVyKHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAwOyB9LFxuICBpc1dhbGwodGhpczogYW55KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIEJvb2xlYW4odGhpcy50eXBlID09PSAzICYmICh0aGlzLmlkIDwgNCB8fCAodGhpcy5kYXRhWzJdICYgMHgyMCkpKTtcbiAgfSxcbiAgd2FsbFR5cGUodGhpczogYW55KTogJycgfCAnd2FsbCcgfCAnYnJpZGdlJyB7XG4gICAgaWYgKHRoaXMudHlwZSAhPT0gMykgcmV0dXJuICcnO1xuICAgIGNvbnN0IG9iaiA9IHRoaXMuZGF0YVsyXSAmIDB4MjAgPyB0aGlzLmlkID4+PiA0IDogdGhpcy5pZDtcbiAgICBpZiAob2JqID49IDQpIHJldHVybiAnJztcbiAgICByZXR1cm4gb2JqID09PSAyID8gJ2JyaWRnZScgOiAnd2FsbCc7XG4gIH0sXG4gIHdhbGxFbGVtZW50KHRoaXM6IGFueSk6IG51bWJlciB7XG4gICAgaWYgKCF0aGlzLmlzV2FsbCgpKSByZXR1cm4gLTE7XG4gICAgcmV0dXJuIHRoaXMuaWQgJiAzO1xuICB9LFxuICB0b1N0cmluZyh0aGlzOiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgU3Bhd24gJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSkgJHtcbiAgICAgICAgICAgIHRoaXMudGltZWQgPyAndGltZWQnIDogJ2ZpeGVkJ30gJHt0aGlzLnR5cGV9OiR7aGV4KHRoaXMuaWQpfWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIFNwYXduID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBTcGF3bj47XG5cbmV4cG9ydCBjb25zdCBMT0NBVElPTlMgPSB7XG4gIG1lemFtZVNocmluZTogWzB4MDAsICdNZXphbWUgU2hyaW5lJ10sXG4gIGxlYWZPdXRzaWRlU3RhcnQ6IFsweDAxLCAnTGVhZiAtIE91dHNpZGUgU3RhcnQnXSxcbiAgbGVhZjogWzB4MDIsICdMZWFmJ10sXG4gIHZhbGxleU9mV2luZDogWzB4MDMsICdWYWxsZXkgb2YgV2luZCddLFxuICBzZWFsZWRDYXZlMTogWzB4MDQsICdTZWFsZWQgQ2F2ZSAxJ10sXG4gIHNlYWxlZENhdmUyOiBbMHgwNSwgJ1NlYWxlZCBDYXZlIDInXSxcbiAgc2VhbGVkQ2F2ZTY6IFsweDA2LCAnU2VhbGVkIENhdmUgNiddLFxuICBzZWFsZWRDYXZlNDogWzB4MDcsICdTZWFsZWQgQ2F2ZSA0J10sXG4gIHNlYWxlZENhdmU1OiBbMHgwOCwgJ1NlYWxlZCBDYXZlIDUnXSxcbiAgc2VhbGVkQ2F2ZTM6IFsweDA5LCAnU2VhbGVkIENhdmUgMyddLFxuICBzZWFsZWRDYXZlNzogWzB4MGEsICdTZWFsZWQgQ2F2ZSA3J10sXG4gIC8vIElOVkFMSUQ6IDB4MGJcbiAgc2VhbGVkQ2F2ZTg6IFsweDBjLCAnU2VhbGVkIENhdmUgOCddLFxuICAvLyBJTlZBTElEOiAweDBkXG4gIHdpbmRtaWxsQ2F2ZTogWzB4MGUsICdXaW5kbWlsbCBDYXZlJ10sXG4gIHdpbmRtaWxsOiBbMHgwZiwgJ1dpbmRtaWxsJ10sXG4gIHplYnVDYXZlOiBbMHgxMCwgJ1plYnUgQ2F2ZSddLFxuICBtdFNhYnJlV2VzdENhdmUxOiBbMHgxMSwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDEnXSxcbiAgLy8gSU5WQUxJRDogMHgxMlxuICAvLyBJTlZBTElEOiAweDEzXG4gIGNvcmRlbFBsYWluc1dlc3Q6IFsweDE0LCAnQ29yZGVsIFBsYWlucyBXZXN0J10sXG4gIGNvcmRlbFBsYWluc0Vhc3Q6IFsweDE1LCAnQ29yZGVsIFBsYWlucyBFYXN0J10sXG4gIC8vIElOVkFMSUQ6IDB4MTYgLS0gdW51c2VkIGNvcHkgb2YgMThcbiAgLy8gSU5WQUxJRDogMHgxN1xuICBicnlubWFlcjogWzB4MTgsICdCcnlubWFlciddLFxuICBvdXRzaWRlU3RvbUhvdXNlOiBbMHgxOSwgJ091dHNpZGUgU3RvbSBIb3VzZSddLFxuICBzd2FtcDogWzB4MWEsICdTd2FtcCddLFxuICBhbWF6b25lczogWzB4MWIsICdBbWF6b25lcyddLFxuICBvYWs6IFsweDFjLCAnT2FrJ10sXG4gIC8vIElOVkFMSUQ6IDB4MWRcbiAgc3RvbUhvdXNlOiBbMHgxZSwgJ1N0b20gSG91c2UnXSxcbiAgLy8gSU5WQUxJRDogMHgxZlxuICBtdFNhYnJlV2VzdExvd2VyOiBbMHgyMCwgJ010IFNhYnJlIFdlc3QgLSBMb3dlciddLFxuICBtdFNhYnJlV2VzdFVwcGVyOiBbMHgyMSwgJ010IFNhYnJlIFdlc3QgLSBVcHBlciddLFxuICBtdFNhYnJlV2VzdENhdmUyOiBbMHgyMiwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDInXSxcbiAgbXRTYWJyZVdlc3RDYXZlMzogWzB4MjMsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSAzJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTQ6IFsweDI0LCAnTXQgU2FicmUgV2VzdCAtIENhdmUgNCddLFxuICBtdFNhYnJlV2VzdENhdmU1OiBbMHgyNSwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDUnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNjogWzB4MjYsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA2J10sXG4gIG10U2FicmVXZXN0Q2F2ZTc6IFsweDI3LCAnTXQgU2FicmUgV2VzdCAtIENhdmUgNyddLFxuICBtdFNhYnJlTm9ydGhNYWluOiBbMHgyOCwgJ010IFNhYnJlIE5vcnRoIC0gTWFpbiddLFxuICBtdFNhYnJlTm9ydGhNaWRkbGU6IFsweDI5LCAnTXQgU2FicmUgTm9ydGggLSBNaWRkbGUnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTI6IFsweDJhLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDInXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTM6IFsweDJiLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDMnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTQ6IFsweDJjLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDQnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTU6IFsweDJkLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDUnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTY6IFsweDJlLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDYnXSxcbiAgbXRTYWJyZU5vcnRoUHJpc29uSGFsbDogWzB4MmYsICdNdCBTYWJyZSBOb3J0aCAtIFByaXNvbiBIYWxsJ10sXG4gIG10U2FicmVOb3J0aExlZnRDZWxsOiBbMHgzMCwgJ010IFNhYnJlIE5vcnRoIC0gTGVmdCBDZWxsJ10sXG4gIG10U2FicmVOb3J0aExlZnRDZWxsMjogWzB4MzEsICdNdCBTYWJyZSBOb3J0aCAtIExlZnQgQ2VsbCAyJ10sXG4gIG10U2FicmVOb3J0aFJpZ2h0Q2VsbDogWzB4MzIsICdNdCBTYWJyZSBOb3J0aCAtIFJpZ2h0IENlbGwnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTg6IFsweDMzLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDgnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTk6IFsweDM0LCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDknXSxcbiAgbXRTYWJyZU5vcnRoU3VtbWl0Q2F2ZTogWzB4MzUsICdNdCBTYWJyZSBOb3J0aCAtIFN1bW1pdCBDYXZlJ10sXG4gIC8vIElOVkFMSUQ6IDB4MzZcbiAgLy8gSU5WQUxJRDogMHgzN1xuICBtdFNhYnJlTm9ydGhDYXZlMTogWzB4MzgsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgMSddLFxuICBtdFNhYnJlTm9ydGhDYXZlNzogWzB4MzksICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNyddLFxuICAvLyBJTlZBTElEOiAweDNhXG4gIC8vIElOVkFMSUQ6IDB4M2JcbiAgbmFkYXJlSW5uOiBbMHgzYywgJ05hZGFyZSAtIElubiddLFxuICBuYWRhcmVUb29sU2hvcDogWzB4M2QsICdOYWRhcmUgLSBUb29sIFNob3AnXSxcbiAgbmFkYXJlQmFja1Jvb206IFsweDNlLCAnTmFkYXJlIC0gQmFjayBSb29tJ10sXG4gIC8vIElOVkFMSUQ6IDB4M2ZcbiAgd2F0ZXJmYWxsVmFsbGV5Tm9ydGg6IFsweDQwLCAnV2F0ZXJmYWxsIFZhbGxleSBOb3J0aCddLFxuICB3YXRlcmZhbGxWYWxsZXlTb3V0aDogWzB4NDEsICdXYXRlcmZhbGwgVmFsbGV5IFNvdXRoJ10sXG4gIGxpbWVUcmVlVmFsbGV5OiBbMHg0MiwgJ0xpbWUgVHJlZSBWYWxsZXknXSxcbiAgbGltZVRyZWVMYWtlOiBbMHg0MywgJ0xpbWUgVHJlZSBMYWtlJ10sXG4gIGtpcmlzYVBsYW50Q2F2ZTE6IFsweDQ0LCAnS2lyaXNhIFBsYW50IENhdmUgMSddLFxuICBraXJpc2FQbGFudENhdmUyOiBbMHg0NSwgJ0tpcmlzYSBQbGFudCBDYXZlIDInXSxcbiAga2lyaXNhUGxhbnRDYXZlMzogWzB4NDYsICdLaXJpc2EgUGxhbnQgQ2F2ZSAzJ10sXG4gIGtpcmlzYU1lYWRvdzogWzB4NDcsICdLaXJpc2EgTWVhZG93J10sXG4gIGZvZ0xhbXBDYXZlMTogWzB4NDgsICdGb2cgTGFtcCBDYXZlIDEnXSxcbiAgZm9nTGFtcENhdmUyOiBbMHg0OSwgJ0ZvZyBMYW1wIENhdmUgMiddLFxuICBmb2dMYW1wQ2F2ZTM6IFsweDRhLCAnRm9nIExhbXAgQ2F2ZSAzJ10sXG4gIGZvZ0xhbXBDYXZlRGVhZEVuZDogWzB4NGIsICdGb2cgTGFtcCBDYXZlIERlYWQgRW5kJ10sXG4gIGZvZ0xhbXBDYXZlNDogWzB4NGMsICdGb2cgTGFtcCBDYXZlIDQnXSxcbiAgZm9nTGFtcENhdmU1OiBbMHg0ZCwgJ0ZvZyBMYW1wIENhdmUgNSddLFxuICBmb2dMYW1wQ2F2ZTY6IFsweDRlLCAnRm9nIExhbXAgQ2F2ZSA2J10sXG4gIGZvZ0xhbXBDYXZlNzogWzB4NGYsICdGb2cgTGFtcCBDYXZlIDcnXSxcbiAgcG9ydG9hOiBbMHg1MCwgJ1BvcnRvYSddLFxuICBwb3J0b2FGaXNoZXJtYW5Jc2xhbmQ6IFsweDUxLCAnUG9ydG9hIC0gRmlzaGVybWFuIElzbGFuZCddLFxuICBtZXNpYVNocmluZTogWzB4NTIsICdNZXNpYSBTaHJpbmUnXSxcbiAgLy8gSU5WQUxJRDogMHg1M1xuICB3YXRlcmZhbGxDYXZlMTogWzB4NTQsICdXYXRlcmZhbGwgQ2F2ZSAxJ10sXG4gIHdhdGVyZmFsbENhdmUyOiBbMHg1NSwgJ1dhdGVyZmFsbCBDYXZlIDInXSxcbiAgd2F0ZXJmYWxsQ2F2ZTM6IFsweDU2LCAnV2F0ZXJmYWxsIENhdmUgMyddLFxuICB3YXRlcmZhbGxDYXZlNDogWzB4NTcsICdXYXRlcmZhbGwgQ2F2ZSA0J10sXG4gIHRvd2VyRW50cmFuY2U6IFsweDU4LCAnVG93ZXIgLSBFbnRyYW5jZSddLFxuICB0b3dlcjE6IFsweDU5LCAnVG93ZXIgMSddLFxuICB0b3dlcjI6IFsweDVhLCAnVG93ZXIgMiddLFxuICB0b3dlcjM6IFsweDViLCAnVG93ZXIgMyddLFxuICB0b3dlck91dHNpZGVNZXNpYTogWzB4NWMsICdUb3dlciAtIE91dHNpZGUgTWVzaWEnXSxcbiAgdG93ZXJPdXRzaWRlRHluYTogWzB4NWQsICdUb3dlciAtIE91dHNpZGUgRHluYSddLFxuICB0b3dlck1lc2lhOiBbMHg1ZSwgJ1Rvd2VyIC0gTWVzaWEnXSxcbiAgdG93ZXJEeW5hOiBbMHg1ZiwgJ1Rvd2VyIC0gRHluYSddLFxuICBhbmdyeVNlYTogWzB4NjAsICdBbmdyeSBTZWEnXSxcbiAgYm9hdEhvdXNlOiBbMHg2MSwgJ0JvYXQgSG91c2UnXSxcbiAgam9lbExpZ2h0aG91c2U6IFsweDYyLCAnSm9lbCAtIExpZ2h0aG91c2UnXSxcbiAgLy8gSU5WQUxJRDogMHg2M1xuICB1bmRlcmdyb3VuZENoYW5uZWw6IFsweDY0LCAnVW5kZXJncm91bmQgQ2hhbm5lbCddLFxuICB6b21iaWVUb3duOiBbMHg2NSwgJ1pvbWJpZSBUb3duJ10sXG4gIC8vIElOVkFMSUQ6IDB4NjZcbiAgLy8gSU5WQUxJRDogMHg2N1xuICBldmlsU3Bpcml0SXNsYW5kMTogWzB4NjgsICdFdmlsIFNwaXJpdCBJc2xhbmQgMSddLFxuICBldmlsU3Bpcml0SXNsYW5kMjogWzB4NjksICdFdmlsIFNwaXJpdCBJc2xhbmQgMiddLFxuICBldmlsU3Bpcml0SXNsYW5kMzogWzB4NmEsICdFdmlsIFNwaXJpdCBJc2xhbmQgMyddLFxuICBldmlsU3Bpcml0SXNsYW5kNDogWzB4NmIsICdFdmlsIFNwaXJpdCBJc2xhbmQgNCddLFxuICBzYWJlcmFQYWxhY2UxOiBbMHg2YywgJ1NhYmVyYSBQYWxhY2UgMSddLFxuICBzYWJlcmFQYWxhY2UyOiBbMHg2ZCwgJ1NhYmVyYSBQYWxhY2UgMiddLFxuICBzYWJlcmFQYWxhY2UzOiBbMHg2ZSwgJ1NhYmVyYSBQYWxhY2UgMyddLFxuICAvLyBJTlZBTElEOiAweDZmIC0tIFNhYmVyYSBQYWxhY2UgMyB1bnVzZWQgY29weVxuICBqb2VsU2VjcmV0UGFzc2FnZTogWzB4NzAsICdKb2VsIC0gU2VjcmV0IFBhc3NhZ2UnXSxcbiAgam9lbDogWzB4NzEsICdKb2VsJ10sXG4gIHN3YW46IFsweDcyLCAnU3dhbiddLFxuICBzd2FuR2F0ZTogWzB4NzMsICdTd2FuIC0gR2F0ZSddLFxuICAvLyBJTlZBTElEOiAweDc0XG4gIC8vIElOVkFMSUQ6IDB4NzVcbiAgLy8gSU5WQUxJRDogMHg3NlxuICAvLyBJTlZBTElEOiAweDc3XG4gIGdvYVZhbGxleTogWzB4NzgsICdHb2EgVmFsbGV5J10sXG4gIC8vIElOVkFMSUQ6IDB4NzlcbiAgLy8gSU5WQUxJRDogMHg3YVxuICAvLyBJTlZBTElEOiAweDdiXG4gIG10SHlkcmE6IFsweDdjLCAnTXQgSHlkcmEnXSxcbiAgbXRIeWRyYUNhdmUxOiBbMHg3ZCwgJ010IEh5ZHJhIC0gQ2F2ZSAxJ10sXG4gIG10SHlkcmFPdXRzaWRlU2h5cm9uOiBbMHg3ZSwgJ010IEh5ZHJhIC0gT3V0c2lkZSBTaHlyb24nXSxcbiAgbXRIeWRyYUNhdmUyOiBbMHg3ZiwgJ010IEh5ZHJhIC0gQ2F2ZSAyJ10sXG4gIG10SHlkcmFDYXZlMzogWzB4ODAsICdNdCBIeWRyYSAtIENhdmUgMyddLFxuICBtdEh5ZHJhQ2F2ZTQ6IFsweDgxLCAnTXQgSHlkcmEgLSBDYXZlIDQnXSxcbiAgbXRIeWRyYUNhdmU1OiBbMHg4MiwgJ010IEh5ZHJhIC0gQ2F2ZSA1J10sXG4gIG10SHlkcmFDYXZlNjogWzB4ODMsICdNdCBIeWRyYSAtIENhdmUgNiddLFxuICBtdEh5ZHJhQ2F2ZTc6IFsweDg0LCAnTXQgSHlkcmEgLSBDYXZlIDcnXSxcbiAgbXRIeWRyYUNhdmU4OiBbMHg4NSwgJ010IEh5ZHJhIC0gQ2F2ZSA4J10sXG4gIG10SHlkcmFDYXZlOTogWzB4ODYsICdNdCBIeWRyYSAtIENhdmUgOSddLFxuICBtdEh5ZHJhQ2F2ZTEwOiBbMHg4NywgJ010IEh5ZHJhIC0gQ2F2ZSAxMCddLFxuICBzdHl4MTogWzB4ODgsICdTdHl4IDEnXSxcbiAgc3R5eDI6IFsweDg5LCAnU3R5eCAyJ10sXG4gIHN0eXgzOiBbMHg4YSwgJ1N0eXggMyddLFxuICAvLyBJTlZBTElEOiAweDhiXG4gIHNoeXJvbjogWzB4OGMsICdTaHlyb24nXSxcbiAgLy8gSU5WQUxJRDogMHg4ZFxuICBnb2E6IFsweDhlLCAnR29hJ10sXG4gIGdvYUZvcnRyZXNzT2FzaXNFbnRyYW5jZTogWzB4OGYsICdHb2EgRm9ydHJlc3MgLSBPYXNpcyBFbnRyYW5jZSddLFxuICBkZXNlcnQxOiBbMHg5MCwgJ0Rlc2VydCAxJ10sXG4gIG9hc2lzQ2F2ZU1haW46IFsweDkxLCAnT2FzaXMgQ2F2ZSAtIE1haW4nXSxcbiAgZGVzZXJ0Q2F2ZTE6IFsweDkyLCAnRGVzZXJ0IENhdmUgMSddLFxuICBzYWhhcmE6IFsweDkzLCAnU2FoYXJhJ10sXG4gIHNhaGFyYU91dHNpZGVDYXZlOiBbMHg5NCwgJ1NhaGFyYSAtIE91dHNpZGUgQ2F2ZSddLFxuICBkZXNlcnRDYXZlMjogWzB4OTUsICdEZXNlcnQgQ2F2ZSAyJ10sXG4gIHNhaGFyYU1lYWRvdzogWzB4OTYsICdTYWhhcmEgTWVhZG93J10sXG4gIC8vIElOVkFMSUQ6IDB4OTdcbiAgZGVzZXJ0MjogWzB4OTgsICdEZXNlcnQgMiddLFxuICAvLyBJTlZBTElEOiAweDk5XG4gIC8vIElOVkFMSUQ6IDB4OWFcbiAgLy8gSU5WQUxJRDogMHg5YlxuICBweXJhbWlkRW50cmFuY2U6IFsweDljLCAnUHlyYW1pZCAtIEVudHJhbmNlJ10sXG4gIHB5cmFtaWRCcmFuY2g6IFsweDlkLCAnUHlyYW1pZCAtIEJyYW5jaCddLFxuICBweXJhbWlkTWFpbjogWzB4OWUsICdQeXJhbWlkIC0gTWFpbiddLFxuICBweXJhbWlkRHJheWdvbjogWzB4OWYsICdQeXJhbWlkIC0gRHJheWdvbiddLFxuICBjcnlwdEVudHJhbmNlOiBbMHhhMCwgJ0NyeXB0IC0gRW50cmFuY2UnXSxcbiAgY3J5cHRIYWxsMTogWzB4YTEsICdDcnlwdCAtIEhhbGwgMSddLFxuICBjcnlwdEJyYW5jaDogWzB4YTIsICdDcnlwdCAtIEJyYW5jaCddLFxuICBjcnlwdERlYWRFbmRMZWZ0OiBbMHhhMywgJ0NyeXB0IC0gRGVhZCBFbmQgTGVmdCddLFxuICBjcnlwdERlYWRFbmRSaWdodDogWzB4YTQsICdDcnlwdCAtIERlYWQgRW5kIFJpZ2h0J10sXG4gIGNyeXB0SGFsbDI6IFsweGE1LCAnQ3J5cHQgLSBIYWxsIDInXSxcbiAgY3J5cHREcmF5Z29uMjogWzB4YTYsICdDcnlwdCAtIERyYXlnb24gMiddLFxuICBjcnlwdFRlbGVwb3J0ZXI6IFsweGE3LCAnQ3J5cHQgLSBUZWxlcG9ydGVyJ10sXG4gIGdvYUZvcnRyZXNzRW50cmFuY2U6IFsweGE4LCAnR29hIEZvcnRyZXNzIC0gRW50cmFuY2UnXSxcbiAgZ29hRm9ydHJlc3NLZWxiZXNxdWU6IFsweGE5LCAnR29hIEZvcnRyZXNzIC0gS2VsYmVzcXVlJ10sXG4gIGdvYUZvcnRyZXNzWmVidTogWzB4YWEsICdHb2EgRm9ydHJlc3MgLSBaZWJ1J10sXG4gIGdvYUZvcnRyZXNzU2FiZXJhOiBbMHhhYiwgJ0dvYSBGb3J0cmVzcyAtIFNhYmVyYSddLFxuICBnb2FGb3J0cmVzc1Rvcm5lbDogWzB4YWMsICdHb2EgRm9ydHJlc3MgLSBUb3JuZWwnXSxcbiAgZ29hRm9ydHJlc3NNYWRvMTogWzB4YWQsICdHb2EgRm9ydHJlc3MgLSBNYWRvIDEnXSxcbiAgZ29hRm9ydHJlc3NNYWRvMjogWzB4YWUsICdHb2EgRm9ydHJlc3MgLSBNYWRvIDInXSxcbiAgZ29hRm9ydHJlc3NNYWRvMzogWzB4YWYsICdHb2EgRm9ydHJlc3MgLSBNYWRvIDMnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lMTogWzB4YjAsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDEnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lMjogWzB4YjEsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDInXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lMzogWzB4YjIsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDMnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNDogWzB4YjMsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDQnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNTogWzB4YjQsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDUnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNjogWzB4YjUsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDYnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNzogWzB4YjYsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDcnXSxcbiAgZ29hRm9ydHJlc3NFeGl0OiBbMHhiNywgJ0dvYSBGb3J0cmVzcyAtIEV4aXQnXSxcbiAgb2FzaXNDYXZlRW50cmFuY2U6IFsweGI4LCAnT2FzaXMgQ2F2ZSAtIEVudHJhbmNlJ10sXG4gIGdvYUZvcnRyZXNzQXNpbmE6IFsweGI5LCAnR29hIEZvcnRyZXNzIC0gQXNpbmEnXSxcbiAgZ29hRm9ydHJlc3NLZW5zdTogWzB4YmEsICdHb2EgRm9ydHJlc3MgLSBLZW5zdSddLFxuICBnb2FIb3VzZTogWzB4YmIsICdHb2EgLSBIb3VzZSddLFxuICBnb2FJbm46IFsweGJjLCAnR29hIC0gSW5uJ10sXG4gIC8vIElOVkFMSUQ6IDB4YmRcbiAgZ29hVG9vbFNob3A6IFsweGJlLCAnR29hIC0gVG9vbCBTaG9wJ10sXG4gIGdvYVRhdmVybjogWzB4YmYsICdHb2EgLSBUYXZlcm4nXSxcbiAgbGVhZkVsZGVySG91c2U6IFsweGMwLCAnTGVhZiAtIEVsZGVyIEhvdXNlJ10sXG4gIGxlYWZSYWJiaXRIdXQ6IFsweGMxLCAnTGVhZiAtIFJhYmJpdCBIdXQnXSxcbiAgbGVhZklubjogWzB4YzIsICdMZWFmIC0gSW5uJ10sXG4gIGxlYWZUb29sU2hvcDogWzB4YzMsICdMZWFmIC0gVG9vbCBTaG9wJ10sXG4gIGxlYWZBcm1vclNob3A6IFsweGM0LCAnTGVhZiAtIEFybW9yIFNob3AnXSxcbiAgbGVhZlN0dWRlbnRIb3VzZTogWzB4YzUsICdMZWFmIC0gU3R1ZGVudCBIb3VzZSddLFxuICBicnlubWFlclRhdmVybjogWzB4YzYsICdCcnlubWFlciAtIFRhdmVybiddLFxuICBicnlubWFlclBhd25TaG9wOiBbMHhjNywgJ0JyeW5tYWVyIC0gUGF3biBTaG9wJ10sXG4gIGJyeW5tYWVySW5uOiBbMHhjOCwgJ0JyeW5tYWVyIC0gSW5uJ10sXG4gIGJyeW5tYWVyQXJtb3JTaG9wOiBbMHhjOSwgJ0JyeW5tYWVyIC0gQXJtb3IgU2hvcCddLFxuICAvLyBJTlZBTElEOiAweGNhXG4gIGJyeW5tYWVySXRlbVNob3A6IFsweGNiLCAnQnJ5bm1hZXIgLSBJdGVtIFNob3AnXSxcbiAgLy8gSU5WQUxJRDogMHhjY1xuICBvYWtFbGRlckhvdXNlOiBbMHhjZCwgJ09hayAtIEVsZGVyIEhvdXNlJ10sXG4gIG9ha01vdGhlckhvdXNlOiBbMHhjZSwgJ09hayAtIE1vdGhlciBIb3VzZSddLFxuICBvYWtUb29sU2hvcDogWzB4Y2YsICdPYWsgLSBUb29sIFNob3AnXSxcbiAgb2FrSW5uOiBbMHhkMCwgJ09hayAtIElubiddLFxuICBhbWF6b25lc0lubjogWzB4ZDEsICdBbWF6b25lcyAtIElubiddLFxuICBhbWF6b25lc0l0ZW1TaG9wOiBbMHhkMiwgJ0FtYXpvbmVzIC0gSXRlbSBTaG9wJ10sXG4gIGFtYXpvbmVzQXJtb3JTaG9wOiBbMHhkMywgJ0FtYXpvbmVzIC0gQXJtb3IgU2hvcCddLFxuICBhbWF6b25lc0VsZGVyOiBbMHhkNCwgJ0FtYXpvbmVzIC0gRWxkZXInXSxcbiAgbmFkYXJlOiBbMHhkNSwgJ05hZGFyZSddLFxuICBwb3J0b2FGaXNoZXJtYW5Ib3VzZTogWzB4ZDYsICdQb3J0b2EgLSBGaXNoZXJtYW4gSG91c2UnXSxcbiAgcG9ydG9hUGFsYWNlRW50cmFuY2U6IFsweGQ3LCAnUG9ydG9hIC0gUGFsYWNlIEVudHJhbmNlJ10sXG4gIHBvcnRvYUZvcnR1bmVUZWxsZXI6IFsweGQ4LCAnUG9ydG9hIC0gRm9ydHVuZSBUZWxsZXInXSxcbiAgcG9ydG9hUGF3blNob3A6IFsweGQ5LCAnUG9ydG9hIC0gUGF3biBTaG9wJ10sXG4gIHBvcnRvYUFybW9yU2hvcDogWzB4ZGEsICdQb3J0b2EgLSBBcm1vciBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4ZGJcbiAgcG9ydG9hSW5uOiBbMHhkYywgJ1BvcnRvYSAtIElubiddLFxuICBwb3J0b2FUb29sU2hvcDogWzB4ZGQsICdQb3J0b2EgLSBUb29sIFNob3AnXSxcbiAgcG9ydG9hUGFsYWNlTGVmdDogWzB4ZGUsICdQb3J0b2EgLSBQYWxhY2UgTGVmdCddLFxuICBwb3J0b2FQYWxhY2VUaHJvbmVSb29tOiBbMHhkZiwgJ1BvcnRvYSAtIFBhbGFjZSBUaHJvbmUgUm9vbSddLFxuICBwb3J0b2FQYWxhY2VSaWdodDogWzB4ZTAsICdQb3J0b2EgLSBQYWxhY2UgUmlnaHQnXSxcbiAgcG9ydG9hQXNpbmFSb29tOiBbMHhlMSwgJ1BvcnRvYSAtIEFzaW5hIFJvb20nXSxcbiAgYW1hem9uZXNFbGRlckRvd25zdGFpcnM6IFsweGUyLCAnQW1hem9uZXMgLSBFbGRlciBEb3duc3RhaXJzJ10sXG4gIGpvZWxFbGRlckhvdXNlOiBbMHhlMywgJ0pvZWwgLSBFbGRlciBIb3VzZSddLFxuICBqb2VsU2hlZDogWzB4ZTQsICdKb2VsIC0gU2hlZCddLFxuICBqb2VsVG9vbFNob3A6IFsweGU1LCAnSm9lbCAtIFRvb2wgU2hvcCddLFxuICAvLyBJTlZBTElEOiAweGU2XG4gIGpvZWxJbm46IFsweGU3LCAnSm9lbCAtIElubiddLFxuICB6b21iaWVUb3duSG91c2U6IFsweGU4LCAnWm9tYmllIFRvd24gLSBIb3VzZSddLFxuICB6b21iaWVUb3duSG91c2VCYXNlbWVudDogWzB4ZTksICdab21iaWUgVG93biAtIEhvdXNlIEJhc2VtZW50J10sXG4gIC8vIElOVkFMSUQ6IDB4ZWFcbiAgc3dhblRvb2xTaG9wOiBbMHhlYiwgJ1N3YW4gLSBUb29sIFNob3AnXSxcbiAgc3dhblN0b21IdXQ6IFsweGVjLCAnU3dhbiAtIFN0b20gSHV0J10sXG4gIHN3YW5Jbm46IFsweGVkLCAnU3dhbiAtIElubiddLFxuICBzd2FuQXJtb3JTaG9wOiBbMHhlZSwgJ1N3YW4gLSBBcm1vciBTaG9wJ10sXG4gIHN3YW5UYXZlcm46IFsweGVmLCAnU3dhbiAtIFRhdmVybiddLFxuICBzd2FuUGF3blNob3A6IFsweGYwLCAnU3dhbiAtIFBhd24gU2hvcCddLFxuICBzd2FuRGFuY2VIYWxsOiBbMHhmMSwgJ1N3YW4gLSBEYW5jZSBIYWxsJ10sXG4gIHNoeXJvbkZvcnRyZXNzOiBbMHhmMiwgJ1NoeXJvbiAtIEZvcnRyZXNzJ10sXG4gIHNoeXJvblRyYWluaW5nSGFsbDogWzB4ZjMsICdTaHlyb24gLSBUcmFpbmluZyBIYWxsJ10sXG4gIHNoeXJvbkhvc3BpdGFsOiBbMHhmNCwgJ1NoeXJvbiAtIEhvc3BpdGFsJ10sXG4gIHNoeXJvbkFybW9yU2hvcDogWzB4ZjUsICdTaHlyb24gLSBBcm1vciBTaG9wJ10sXG4gIHNoeXJvblRvb2xTaG9wOiBbMHhmNiwgJ1NoeXJvbiAtIFRvb2wgU2hvcCddLFxuICBzaHlyb25Jbm46IFsweGY3LCAnU2h5cm9uIC0gSW5uJ10sXG4gIHNhaGFyYUlubjogWzB4ZjgsICdTYWhhcmEgLSBJbm4nXSxcbiAgc2FoYXJhVG9vbFNob3A6IFsweGY5LCAnU2FoYXJhIC0gVG9vbCBTaG9wJ10sXG4gIHNhaGFyYUVsZGVySG91c2U6IFsweGZhLCAnU2FoYXJhIC0gRWxkZXIgSG91c2UnXSxcbiAgc2FoYXJhUGF3blNob3A6IFsweGZiLCAnU2FoYXJhIC0gUGF3biBTaG9wJ10sXG59IGFzIGNvbnN0O1xuLy8gdHlwZSBMb2NhdGlvbnMgPSB0eXBlb2YgTE9DQVRJT05TO1xuXG4vLyBOT1RFOiB0aGlzIHdvcmtzIHRvIGNvbnN0cmFpbiB0aGUga2V5cyB0byBleGFjdGx5IHRoZSBzYW1lLlxuLy8gY29uc3QgeDoge3JlYWRvbmx5IFtUIGluIGtleW9mIHR5cGVvZiBMT0NBVElPTlNdPzogc3RyaW5nfSA9IHt9O1xuXG4vLyBOT1RFOiB0aGUgZm9sbG93aW5nIGFsbG93cyBwcmV0dHkgcm9idXN0IGNoZWNrcyFcbi8vIGNvbnN0IHggPSBjaGVjazxLZXlzT2Y8TG9jYXRpb25zLCBzdHJpbmcgfCBib29sZWFuPj4oKSh7XG4vLyAgIGxlYWY6ICd4Jyxcbi8vICAgc3dhbjogdHJ1ZSxcbi8vIH0pO1xuLy8gY29uc3QgeSA9IGNoZWNrPEtleXNPZjx0eXBlb2YgeCwgbnVtYmVyLCBzdHJpbmc+PigpKHtcbi8vICAgc3dhbjogMSxcbi8vIH0pO1xuXG4vLyB0eXBlIEtleXNPZjxULCBWID0gdW5rbm93biwgUiA9IHVua25vd24+ID0ge1tLIGluIGtleW9mIFRdPzogVFtLXSBleHRlbmRzIFIgPyBWIDogbmV2ZXJ9O1xuXG4vLyBmdW5jdGlvbiBjaGVjazxUPigpOiA8VSBleHRlbmRzIFQ+KGFyZzogVSkgPT4gVSB7XG4vLyAgIHJldHVybiBhcmcgPT4gYXJnO1xuLy8gfVxuXG5jb25zdCBsb2NhdGlvbk5hbWVzOiAoc3RyaW5nIHwgdW5kZWZpbmVkKVtdID0gKCgpID0+IHtcbiAgY29uc3QgbmFtZXMgPSBbXTtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoTE9DQVRJT05TKSkge1xuICAgIGNvbnN0IFtpZCwgbmFtZV0gPSAoTE9DQVRJT05TIGFzIGFueSlba2V5XTtcbiAgICBuYW1lc1tpZF0gPSBuYW1lO1xuICB9XG4gIHJldHVybiBuYW1lcztcbn0pKCk7XG5cbmNvbnN0IGxvY2F0aW9uS2V5czogKGtleW9mIHR5cGVvZiBMT0NBVElPTlMgfCB1bmRlZmluZWQpW10gPSAoKCkgPT4ge1xuICBjb25zdCBrZXlzID0gW107XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKExPQ0FUSU9OUykpIHtcbiAgICBjb25zdCBbaWRdID0gKExPQ0FUSU9OUyBhcyBhbnkpW2tleV07XG4gICAga2V5c1tpZF0gPSBrZXk7XG4gIH1cbiAgcmV0dXJuIGtleXMgYXMgYW55O1xufSkoKTtcblxuXG4vLyBidWlsZGluZyB0aGUgQ1NWIGZvciB0aGUgbG9jYXRpb24gdGFibGUuXG4vL2NvbnN0IGg9KHgpPT54PT1udWxsPydudWxsJzonJCcreC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKTtcbi8vJ2lkLG5hbWUsYmdtLHdpZHRoLGhlaWdodCxhbmltYXRpb24sZXh0ZW5kZWQsdGlsZXBhdDAsdGlsZXBhdDEsdGlsZXBhbDAsdGlsZXBhbDEsdGlsZXNldCx0aWxlIGVmZmVjdHMsZXhpdHMsc3BycGF0MCxzcHJwYXQxLHNwcnBhbDAsc3BycGFsMSxvYmowZCxvYmowZSxvYmowZixvYmoxMCxvYmoxMSxvYmoxMixvYmoxMyxvYmoxNCxvYmoxNSxvYmoxNixvYmoxNyxvYmoxOCxvYmoxOSxvYmoxYSxvYmoxYixvYmoxYyxvYmoxZCxvYmoxZSxvYmoxZlxcbicrcm9tLmxvY2F0aW9ucy5tYXAobD0+IWx8fCFsLnVzZWQ/Jyc6W2gobC5pZCksbC5uYW1lLGgobC5iZ20pLGwubGF5b3V0V2lkdGgsbC5sYXlvdXRIZWlnaHQsbC5hbmltYXRpb24sbC5leHRlbmRlZCxoKChsLnRpbGVQYXR0ZXJuc3x8W10pWzBdKSxoKChsLnRpbGVQYXR0ZXJuc3x8W10pWzFdKSxoKChsLnRpbGVQYWxldHRlc3x8W10pWzBdKSxoKChsLnRpbGVQYWxldHRlc3x8W10pWzFdKSxoKGwudGlsZXNldCksaChsLnRpbGVFZmZlY3RzKSxbLi4ubmV3IFNldChsLmV4aXRzLm1hcCh4PT5oKHhbMl0pKSldLmpvaW4oJzonKSxoKChsLnNwcml0ZVBhdHRlcm5zfHxbXSlbMF0pLGgoKGwuc3ByaXRlUGF0dGVybnN8fFtdKVsxXSksaCgobC5zcHJpdGVQYWxldHRlc3x8W10pWzBdKSxoKChsLnNwcml0ZVBhbGV0dGVzfHxbXSlbMV0pLC4uLm5ldyBBcnJheSgxOSkuZmlsbCgwKS5tYXAoKHYsaSk9PigobC5vYmplY3RzfHxbXSlbaV18fFtdKS5zbGljZSgyKS5tYXAoeD0+eC50b1N0cmluZygxNikpLmpvaW4oJzonKSldKS5maWx0ZXIoeD0+eCkuam9pbignXFxuJylcblxuLy8gYnVpbGRpbmcgY3N2IGZvciBsb2Mtb2JqIGNyb3NzLXJlZmVyZW5jZSB0YWJsZVxuLy8gc2VxPShzLGUsZik9Pm5ldyBBcnJheShlLXMpLmZpbGwoMCkubWFwKCh4LGkpPT5mKGkrcykpO1xuLy8gdW5pcT0oYXJyKT0+e1xuLy8gICBjb25zdCBtPXt9O1xuLy8gICBmb3IgKGxldCBvIG9mIGFycikge1xuLy8gICAgIG9bNl09b1s1XT8xOjA7XG4vLyAgICAgaWYoIW9bNV0pbVtvWzJdXT0obVtvWzJdXXx8MCkrMTtcbi8vICAgfVxuLy8gICBmb3IgKGxldCBvIG9mIGFycikge1xuLy8gICAgIGlmKG9bMl0gaW4gbSlvWzZdPW1bb1syXV07XG4vLyAgICAgZGVsZXRlIG1bb1syXV07XG4vLyAgIH1cbi8vICAgcmV0dXJuIGFycjtcbi8vIH1cbi8vICdsb2MsbG9jbmFtZSxtb24sbW9ubmFtZSxzcGF3bix0eXBlLHVuaXEscGF0c2xvdCxwYXQscGFsc2xvdCxwYWwyLHBhbDNcXG4nK1xuLy8gcm9tLmxvY2F0aW9ucy5mbGF0TWFwKGw9PiFsfHwhbC51c2VkP1tdOnVuaXEoc2VxKDB4ZCwweDIwLHM9Pntcbi8vICAgY29uc3Qgbz0obC5vYmplY3RzfHxbXSlbcy0weGRdfHxudWxsO1xuLy8gICBpZiAoIW8pIHJldHVybiBudWxsO1xuLy8gICBjb25zdCB0eXBlPW9bMl0mNztcbi8vICAgY29uc3QgbT10eXBlP251bGw6MHg1MCtvWzNdO1xuLy8gICBjb25zdCBwYXRTbG90PW9bMl0mMHg4MD8xOjA7XG4vLyAgIGNvbnN0IG1vbj1tP3JvbS5vYmplY3RzW21dOm51bGw7XG4vLyAgIGNvbnN0IHBhbFNsb3Q9KG1vbj9tb24ucGFsZXR0ZXMoZmFsc2UpOltdKVswXTtcbi8vICAgY29uc3QgYWxsUGFsPW5ldyBTZXQobW9uP21vbi5wYWxldHRlcyh0cnVlKTpbXSk7XG4vLyAgIHJldHVybiBbaChsLmlkKSxsLm5hbWUsaChtKSwnJyxoKHMpLHR5cGUsMCxwYXRTbG90LG0/aCgobC5zcHJpdGVQYXR0ZXJuc3x8W10pW3BhdFNsb3RdKTonJyxwYWxTbG90LGFsbFBhbC5oYXMoMik/aCgobC5zcHJpdGVQYWxldHRlc3x8W10pWzBdKTonJyxhbGxQYWwuaGFzKDMpP2goKGwuc3ByaXRlUGFsZXR0ZXN8fFtdKVsxXSk6JyddO1xuLy8gfSkuZmlsdGVyKHg9PngpKSkubWFwKGE9PmEuam9pbignLCcpKS5maWx0ZXIoeD0+eCkuam9pbignXFxuJyk7XG5cbi8qKlxuICogTG9jYXRpb25zIHdpdGggY2F2ZSBzeXN0ZW1zIHRoYXQgc2hvdWxkIGFsbCBiZSB0cmVhdGVkIGFzIG5laWdoYm9yaW5nLlxuICovXG5jb25zdCBORVhVU0VTOiB7W1QgaW4ga2V5b2YgdHlwZW9mIExPQ0FUSU9OU10/OiB0cnVlfSA9IHtcbiAgbXRTYWJyZVdlc3RMb3dlcjogdHJ1ZSxcbiAgbXRTYWJyZVdlc3RVcHBlcjogdHJ1ZSxcbiAgbXRTYWJyZU5vcnRoTWFpbjogdHJ1ZSxcbiAgbXRTYWJyZU5vcnRoTWlkZGxlOiB0cnVlLFxuICBtdFNhYnJlTm9ydGhDYXZlMTogdHJ1ZSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTI6IHRydWUsXG4gIG10SHlkcmE6IHRydWUsXG4gIG10SHlkcmFPdXRzaWRlU2h5cm9uOiB0cnVlLFxuICBtdEh5ZHJhQ2F2ZTE6IHRydWUsXG59O1xuXG5jb25zdCBCT1NTX1NDUkVFTlM6IHtbVCBpbiBrZXlvZiB0eXBlb2YgTE9DQVRJT05TXT86IG51bWJlcn0gPSB7XG4gIHNlYWxlZENhdmU3OiAweDkxLFxuICBzd2FtcDogMHg3YyxcbiAgbXRTYWJyZU5vcnRoTWFpbjogMHhiNSxcbiAgc2FiZXJhUGFsYWNlMTogMHhmZCxcbiAgc2FiZXJhUGFsYWNlMzogMHhmZCxcbiAgc2h5cm9uRm9ydHJlc3M6IDB4NzAsXG4gIGdvYUZvcnRyZXNzS2VsYmVzcXVlOiAweDczLFxuICBnb2FGb3J0cmVzc1Rvcm5lbDogMHg5MSxcbiAgZ29hRm9ydHJlc3NBc2luYTogMHg5MSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNzogMHhmZCxcbiAgcHlyYW1pZERyYXlnb246IDB4ZjksXG4gIGNyeXB0RHJheWdvbjI6IDB4ZmEsXG4gIHRvd2VyRHluYTogMHg1Yyxcbn07XG4iXX0=