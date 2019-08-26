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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFFbkMsT0FBTyxFQUFPLFNBQVMsRUFDZixlQUFlLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFDN0MsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUs1RCxNQUFNLE9BQU8sUUFBUyxTQUFRLE1BQU07SUF3Q2xDLFlBQVksR0FBUSxFQUFFLEVBQVU7UUFFOUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVmLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBRTNFLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekMsSUFBSSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQVMsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBRXJELElBQUksQ0FBQyxVQUFVLEdBQUcs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RUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckMsSUFBSSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFbEMsTUFBTSxFQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLElBQUksRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWxDLElBQUksRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFNUIsUUFBUTtRQUNOLE9BQU8sT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUMzRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2xFLENBQUM7Q0FDRixDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDckMsQ0FBQyxFQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEMsRUFBRSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUxQixLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxFQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFD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LGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO0lBQ2xELGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDO0lBQ2pELGtCQUFrQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3JELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELHNCQUFzQixFQUFFLENBQUMsSUFBSSxFQUFFLDhCQUE4QixDQUFDO0lBQzlELG9CQUFvQixFQUFFLENBQUMsSUFBSSxFQUFFLDRCQUE0QixDQUFDO0lBQzFELHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLDhCQUE4QixDQUFDO0lBQzdELHFCQUFxQixFQUFFLENBQUMsSUFBSSxFQUFFLDZCQUE2QixDQUFDO0lBQzVELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELHNCQUFzQixFQUFFLENBQUMsSUFBSSxFQUFFLDhCQUE4QixDQUFDO0lBRzlELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBQ3BELGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDO0lBR3BE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dEIsYUFBYSxFQUFFLElBQUk7SUFDbkIsYUFBYSxFQUFFLElBQUk7SUFDbkIsY0FBYyxFQUFFLElBQUk7SUFDcEIsb0JBQW9CLEVBQUUsSUFBSTtJQUMxQixpQkFBaUIsRUFBRSxJQUFJO0lBQ3ZCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsbUJBQW1CLEVBQUUsSUFBSTtJQUN6QixjQUFjLEVBQUUsSUFBSTtJQUNwQixhQUFhLEVBQUUsSUFBSTtJQUNuQixTQUFTLEVBQUUsSUFBSTtDQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtFbnRpdHl9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7U2NyZWVufSBmcm9tICcuL3NjcmVlbi5qcyc7XG5pbXBvcnQge0RhdGEsIERhdGFUdXBsZSxcbiAgICAgICAgY29uY2F0SXRlcmFibGVzLCBncm91cCwgaGV4LCByZWFkTGl0dGxlRW5kaWFuLFxuICAgICAgICBzZXEsIHR1cGxlLCB2YXJTbGljZSwgd3JpdGVMaXR0bGVFbmRpYW59IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1dyaXRlcn0gZnJvbSAnLi93cml0ZXIuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgaXRlcnMsIGFzc2VydE5ldmVyLCBEZWZhdWx0TWFwIH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQgeyBNb25zdGVyIH0gZnJvbSAnLi9tb25zdGVyLmpzJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5cbi8vIExvY2F0aW9uIGVudGl0aWVzXG5leHBvcnQgY2xhc3MgTG9jYXRpb24gZXh0ZW5kcyBFbnRpdHkge1xuXG4gIHVzZWQ6IGJvb2xlYW47XG4gIG5hbWU6IHN0cmluZztcbiAga2V5OiBrZXlvZiB0eXBlb2YgTE9DQVRJT05TO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbWFwRGF0YVBvaW50ZXI6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBtYXBEYXRhQmFzZTogbnVtYmVyO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbGF5b3V0QmFzZTogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGdyYXBoaWNzQmFzZTogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGVudHJhbmNlc0Jhc2U6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBleGl0c0Jhc2U6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBmbGFnc0Jhc2U6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwaXRzQmFzZTogbnVtYmVyO1xuXG4gIGJnbTogbnVtYmVyO1xuICBsYXlvdXRXaWR0aDogbnVtYmVyO1xuICBsYXlvdXRIZWlnaHQ6IG51bWJlcjtcbiAgYW5pbWF0aW9uOiBudW1iZXI7XG4gIGV4dGVuZGVkOiBudW1iZXI7XG4gIHNjcmVlbnM6IG51bWJlcltdW107XG5cbiAgdGlsZVBhdHRlcm5zOiBbbnVtYmVyLCBudW1iZXJdO1xuICB0aWxlUGFsZXR0ZXM6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgdGlsZXNldDogbnVtYmVyO1xuICB0aWxlRWZmZWN0czogbnVtYmVyO1xuXG4gIGVudHJhbmNlczogRW50cmFuY2VbXTtcbiAgZXhpdHM6IEV4aXRbXTtcbiAgZmxhZ3M6IEZsYWdbXTtcbiAgcGl0czogUGl0W107XG5cbiAgaGFzU3Bhd25zOiBib29sZWFuO1xuICBucGNEYXRhUG9pbnRlcjogbnVtYmVyO1xuICBucGNEYXRhQmFzZTogbnVtYmVyO1xuICBzcHJpdGVQYWxldHRlczogW251bWJlciwgbnVtYmVyXTtcbiAgc3ByaXRlUGF0dGVybnM6IFtudW1iZXIsIG51bWJlcl07XG4gIHNwYXduczogU3Bhd25bXTtcblxuICBjb25zdHJ1Y3Rvcihyb206IFJvbSwgaWQ6IG51bWJlcikge1xuICAgIC8vIHdpbGwgaW5jbHVkZSBib3RoIE1hcERhdGEgKmFuZCogTnBjRGF0YSwgc2luY2UgdGhleSBzaGFyZSBhIGtleS5cbiAgICBzdXBlcihyb20sIGlkKTtcblxuICAgIHRoaXMubWFwRGF0YVBvaW50ZXIgPSAweDE0MzAwICsgKGlkIDw8IDEpO1xuICAgIHRoaXMubWFwRGF0YUJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YVBvaW50ZXIpICsgMHhjMDAwO1xuICAgIC8vIFRPRE8gLSBwYXNzIHRoaXMgaW4gYW5kIG1vdmUgTE9DQVRJT05TIHRvIGxvY2F0aW9ucy50c1xuICAgIHRoaXMubmFtZSA9IGxvY2F0aW9uTmFtZXNbdGhpcy5pZF0gfHwgJyc7XG4gICAgdGhpcy5rZXkgPSBsb2NhdGlvbktleXNbdGhpcy5pZF0gfHwgJycgYXMgYW55O1xuICAgIHRoaXMudXNlZCA9IHRoaXMubWFwRGF0YUJhc2UgPiAweGMwMDAgJiYgISF0aGlzLm5hbWU7XG5cbiAgICB0aGlzLmxheW91dEJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UpICsgMHhjMDAwO1xuICAgIHRoaXMuZ3JhcGhpY3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFCYXNlICsgMikgKyAweGMwMDA7XG4gICAgdGhpcy5lbnRyYW5jZXNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFCYXNlICsgNCkgKyAweGMwMDA7XG4gICAgdGhpcy5leGl0c0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UgKyA2KSArIDB4YzAwMDtcbiAgICB0aGlzLmZsYWdzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhQmFzZSArIDgpICsgMHhjMDAwO1xuXG4gICAgLy8gUmVhZCB0aGUgZXhpdHMgZmlyc3Qgc28gdGhhdCB3ZSBjYW4gZGV0ZXJtaW5lIGlmIHRoZXJlJ3MgZW50cmFuY2UvcGl0c1xuICAgIC8vIG1ldGFkYXRhIGVuY29kZWQgYXQgdGhlIGVuZC5cbiAgICBsZXQgaGFzUGl0cyA9IHRoaXMubGF5b3V0QmFzZSAhPT0gdGhpcy5tYXBEYXRhQmFzZSArIDEwO1xuICAgIGxldCBlbnRyYW5jZUxlbiA9IHRoaXMuZXhpdHNCYXNlIC0gdGhpcy5lbnRyYW5jZXNCYXNlO1xuICAgIHRoaXMuZXhpdHMgPSAoKCkgPT4ge1xuICAgICAgY29uc3QgZXhpdHMgPSBbXTtcbiAgICAgIGxldCBpID0gdGhpcy5leGl0c0Jhc2U7XG4gICAgICB3aGlsZSAoIShyb20ucHJnW2ldICYgMHg4MCkpIHtcbiAgICAgICAgZXhpdHMucHVzaChuZXcgRXhpdChyb20ucHJnLnNsaWNlKGksIGkgKyA0KSkpO1xuICAgICAgICBpICs9IDQ7XG4gICAgICB9XG4gICAgICBpZiAocm9tLnByZ1tpXSAhPT0gMHhmZikge1xuICAgICAgICBoYXNQaXRzID0gISEocm9tLnByZ1tpXSAmIDB4NDApO1xuICAgICAgICBlbnRyYW5jZUxlbiA9IChyb20ucHJnW2ldICYgMHgxZikgPDwgMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBleGl0cztcbiAgICB9KSgpO1xuXG4gICAgLy8gVE9ETyAtIHRoZXNlIGhldXJpc3RpY3Mgd2lsbCBub3Qgd29yayB0byByZS1yZWFkIHRoZSBsb2NhdGlvbnMuXG4gICAgLy8gICAgICAtIHdlIGNhbiBsb29rIGF0IHRoZSBvcmRlcjogaWYgdGhlIGRhdGEgaXMgQkVGT1JFIHRoZSBwb2ludGVyc1xuICAgIC8vICAgICAgICB0aGVuIHdlJ3JlIGluIGEgcmV3cml0dGVuIHN0YXRlOyBpbiB0aGF0IGNhc2UsIHdlIG5lZWQgdG8gc2ltcGx5XG4gICAgLy8gICAgICAgIGZpbmQgYWxsIHJlZnMgYW5kIG1heC4uLj9cbiAgICAvLyAgICAgIC0gY2FuIHdlIHJlYWQgdGhlc2UgcGFydHMgbGF6aWx5P1xuICAgIHRoaXMucGl0c0Jhc2UgPSAhaGFzUGl0cyA/IDAgOlxuICAgICAgICByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YUJhc2UgKyAxMCkgKyAweGMwMDA7XG5cbiAgICB0aGlzLmJnbSA9IHJvbS5wcmdbdGhpcy5sYXlvdXRCYXNlXTtcbiAgICB0aGlzLmxheW91dFdpZHRoID0gcm9tLnByZ1t0aGlzLmxheW91dEJhc2UgKyAxXTtcbiAgICB0aGlzLmxheW91dEhlaWdodCA9IHJvbS5wcmdbdGhpcy5sYXlvdXRCYXNlICsgMl07XG4gICAgdGhpcy5hbmltYXRpb24gPSByb20ucHJnW3RoaXMubGF5b3V0QmFzZSArIDNdO1xuICAgIHRoaXMuZXh0ZW5kZWQgPSByb20ucHJnW3RoaXMubGF5b3V0QmFzZSArIDRdO1xuICAgIHRoaXMuc2NyZWVucyA9IHNlcShcbiAgICAgICAgdGhpcy5oZWlnaHQsXG4gICAgICAgIHkgPT4gdHVwbGUocm9tLnByZywgdGhpcy5sYXlvdXRCYXNlICsgNSArIHkgKiB0aGlzLndpZHRoLCB0aGlzLndpZHRoKSk7XG4gICAgdGhpcy50aWxlUGFsZXR0ZXMgPSB0dXBsZTxudW1iZXI+KHJvbS5wcmcsIHRoaXMuZ3JhcGhpY3NCYXNlLCAzKTtcbiAgICB0aGlzLnRpbGVzZXQgPSByb20ucHJnW3RoaXMuZ3JhcGhpY3NCYXNlICsgM107XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHJvbS5wcmdbdGhpcy5ncmFwaGljc0Jhc2UgKyA0XTtcbiAgICB0aGlzLnRpbGVQYXR0ZXJucyA9IHR1cGxlKHJvbS5wcmcsIHRoaXMuZ3JhcGhpY3NCYXNlICsgNSwgMik7XG5cbiAgICB0aGlzLmVudHJhbmNlcyA9XG4gICAgICBncm91cCg0LCByb20ucHJnLnNsaWNlKHRoaXMuZW50cmFuY2VzQmFzZSwgdGhpcy5lbnRyYW5jZXNCYXNlICsgZW50cmFuY2VMZW4pLFxuICAgICAgICAgICAgeCA9PiBuZXcgRW50cmFuY2UoeCkpO1xuICAgIHRoaXMuZmxhZ3MgPSB2YXJTbGljZShyb20ucHJnLCB0aGlzLmZsYWdzQmFzZSwgMiwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gbmV3IEZsYWcoeCkpO1xuICAgIHRoaXMucGl0cyA9IHRoaXMucGl0c0Jhc2UgPyB2YXJTbGljZShyb20ucHJnLCB0aGlzLnBpdHNCYXNlLCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBuZXcgUGl0KHgpKSA6IFtdO1xuXG4gICAgdGhpcy5ucGNEYXRhUG9pbnRlciA9IDB4MTkyMDEgKyAoaWQgPDwgMSk7XG4gICAgdGhpcy5ucGNEYXRhQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5ucGNEYXRhUG9pbnRlcikgKyAweDEwMDAwO1xuICAgIHRoaXMuaGFzU3Bhd25zID0gdGhpcy5ucGNEYXRhQmFzZSAhPT0gMHgxMDAwMDtcbiAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID1cbiAgICAgICAgdGhpcy5oYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCB0aGlzLm5wY0RhdGFCYXNlICsgMSwgMikgOiBbMCwgMF07XG4gICAgdGhpcy5zcHJpdGVQYXR0ZXJucyA9XG4gICAgICAgIHRoaXMuaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgdGhpcy5ucGNEYXRhQmFzZSArIDMsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3Bhd25zID1cbiAgICAgICAgdGhpcy5oYXNTcGF3bnMgPyB2YXJTbGljZShyb20ucHJnLCB0aGlzLm5wY0RhdGFCYXNlICsgNSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBuZXcgU3Bhd24oeCkpIDogW107XG4gIH1cblxuICBzcGF3bihpZDogbnVtYmVyKTogU3Bhd24ge1xuICAgIGNvbnN0IHNwYXduID0gdGhpcy5zcGF3bnNbaWQgLSAweGRdO1xuICAgIGlmICghc3Bhd24pIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgc3Bhd24gJCR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gc3Bhd247XG4gIH1cblxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubGF5b3V0V2lkdGggKyAxOyB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7IHRoaXMubGF5b3V0V2lkdGggPSB3aWR0aCAtIDE7IH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7IHJldHVybiB0aGlzLmxheW91dEhlaWdodCArIDE7IH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlcikgeyB0aGlzLmxheW91dEhlaWdodCA9IGhlaWdodCAtIDE7IH1cblxuICAvLyBtb25zdGVycygpIHtcbiAgLy8gICBpZiAoIXRoaXMuc3Bhd25zKSByZXR1cm4gW107XG4gIC8vICAgcmV0dXJuIHRoaXMuc3Bhd25zLmZsYXRNYXAoXG4gIC8vICAgICAoWywsIHR5cGUsIGlkXSwgc2xvdCkgPT5cbiAgLy8gICAgICAgdHlwZSAmIDcgfHwgIXRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdID8gW10gOiBbXG4gIC8vICAgICAgICAgW3RoaXMuaWQsXG4gIC8vICAgICAgICAgIHNsb3QgKyAweDBkLFxuICAvLyAgICAgICAgICB0eXBlICYgMHg4MCA/IDEgOiAwLFxuICAvLyAgICAgICAgICBpZCArIDB4NTAsXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGF0dGVybnNbdHlwZSAmIDB4ODAgPyAxIDogMF0sXG4gIC8vICAgICAgICAgIHRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdLnBhbGV0dGVzKClbMF0sXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXNbdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSAtIDJdLFxuICAvLyAgICAgICAgIF1dKTtcbiAgLy8gfVxuXG4gIGFzeW5jIHdyaXRlKHdyaXRlcjogV3JpdGVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnVzZWQpIHJldHVybjtcbiAgICBjb25zdCBwcm9taXNlcyA9IFtdO1xuICAgIGlmICh0aGlzLmhhc1NwYXducykge1xuICAgICAgLy8gd3JpdGUgTlBDIGRhdGEgZmlyc3QsIGlmIHByZXNlbnQuLi5cbiAgICAgIGNvbnN0IGRhdGEgPSBbMCwgLi4udGhpcy5zcHJpdGVQYWxldHRlcywgLi4udGhpcy5zcHJpdGVQYXR0ZXJucyxcbiAgICAgICAgICAgICAgICAgICAgLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuc3Bhd25zKSwgMHhmZl07XG4gICAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgICAgIHdyaXRlci53cml0ZShkYXRhLCAweDE4MDAwLCAweDFiZmZmLCBgTnBjRGF0YSAke2hleCh0aGlzLmlkKX1gKVxuICAgICAgICAgICAgICAudGhlbihhZGRyZXNzID0+IHdyaXRlTGl0dGxlRW5kaWFuKFxuICAgICAgICAgICAgICAgICAgd3JpdGVyLnJvbSwgdGhpcy5ucGNEYXRhUG9pbnRlciwgYWRkcmVzcyAtIDB4MTAwMDApKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgd3JpdGUgPSAoZGF0YTogRGF0YTxudW1iZXI+LCBuYW1lOiBzdHJpbmcpID0+XG4gICAgICAgIHdyaXRlci53cml0ZShkYXRhLCAweDE0MDAwLCAweDE3ZmZmLCBgJHtuYW1lfSAke2hleCh0aGlzLmlkKX1gKTtcbiAgICBjb25zdCBsYXlvdXQgPSBbXG4gICAgICB0aGlzLmJnbSxcbiAgICAgIHRoaXMubGF5b3V0V2lkdGgsIHRoaXMubGF5b3V0SGVpZ2h0LCB0aGlzLmFuaW1hdGlvbiwgdGhpcy5leHRlbmRlZCxcbiAgICAgIC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLnNjcmVlbnMpXTtcbiAgICBjb25zdCBncmFwaGljcyA9XG4gICAgICAgIFsuLi50aGlzLnRpbGVQYWxldHRlcyxcbiAgICAgICAgIHRoaXMudGlsZXNldCwgdGhpcy50aWxlRWZmZWN0cyxcbiAgICAgICAgIC4uLnRoaXMudGlsZVBhdHRlcm5zXTtcbiAgICAvLyBRdWljayBzYW5pdHkgY2hlY2s6IGlmIGFuIGVudHJhbmNlL2V4aXQgaXMgYmVsb3cgdGhlIEhVRCBvbiBhXG4gICAgLy8gbm9uLXZlcnRpY2FsbHkgc2Nyb2xsaW5nIG1hcCwgdGhlbiB3ZSBuZWVkIHRvIG1vdmUgaXQgdXAuXG4gICAgaWYgKHRoaXMuaGVpZ2h0ID09PSAxKSB7XG4gICAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICAgIGlmIChlbnRyYW5jZS55ID4gMHhiZikgZW50cmFuY2UueSA9IDB4YmY7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0cykge1xuICAgICAgICBpZiAoZXhpdC55dCA+IDB4MGMpIGV4aXQueXQgPSAweDBjO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBlbnRyYW5jZXMgPSBjb25jYXRJdGVyYWJsZXModGhpcy5lbnRyYW5jZXMpO1xuICAgIGNvbnN0IGV4aXRzID0gWy4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmV4aXRzKSxcbiAgICAgICAgICAgICAgICAgICAweDgwIHwgKHRoaXMucGl0cy5sZW5ndGggPyAweDQwIDogMCkgfCB0aGlzLmVudHJhbmNlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICBdO1xuICAgIGNvbnN0IGZsYWdzID0gWy4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmZsYWdzKSwgMHhmZl07XG4gICAgY29uc3QgcGl0cyA9IGNvbmNhdEl0ZXJhYmxlcyh0aGlzLnBpdHMpO1xuICAgIGNvbnN0IFtsYXlvdXRBZGRyLCBncmFwaGljc0FkZHIsIGVudHJhbmNlc0FkZHIsIGV4aXRzQWRkciwgZmxhZ3NBZGRyLCBwaXRzQWRkcl0gPVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgd3JpdGUobGF5b3V0LCAnTGF5b3V0JyksXG4gICAgICAgICAgd3JpdGUoZ3JhcGhpY3MsICdHcmFwaGljcycpLFxuICAgICAgICAgIHdyaXRlKGVudHJhbmNlcywgJ0VudHJhbmNlcycpLFxuICAgICAgICAgIHdyaXRlKGV4aXRzLCAnRXhpdHMnKSxcbiAgICAgICAgICB3cml0ZShmbGFncywgJ0ZsYWdzJyksXG4gICAgICAgICAgLi4uKHBpdHMubGVuZ3RoID8gW3dyaXRlKHBpdHMsICdQaXRzJyldIDogW10pLFxuICAgICAgICBdKTtcbiAgICBjb25zdCBhZGRyZXNzZXMgPSBbXG4gICAgICBsYXlvdXRBZGRyICYgMHhmZiwgKGxheW91dEFkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGdyYXBoaWNzQWRkciAmIDB4ZmYsIChncmFwaGljc0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGVudHJhbmNlc0FkZHIgJiAweGZmLCAoZW50cmFuY2VzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZXhpdHNBZGRyICYgMHhmZiwgKGV4aXRzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZmxhZ3NBZGRyICYgMHhmZiwgKGZsYWdzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgLi4uKHBpdHNBZGRyID8gW3BpdHNBZGRyICYgMHhmZiwgKHBpdHNBZGRyID4+IDgpIC0gMHhjMF0gOiBbXSksXG4gICAgXTtcbiAgICBjb25zdCBiYXNlID0gYXdhaXQgd3JpdGUoYWRkcmVzc2VzLCAnTWFwRGF0YScpO1xuICAgIHdyaXRlTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIHRoaXMubWFwRGF0YVBvaW50ZXIsIGJhc2UgLSAweGMwMDApO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBib3NzIHJvb20sIHdyaXRlIHRoZSByZXN0b3JhdGlvbi5cbiAgICBjb25zdCBib3NzSWQgPSB0aGlzLmJvc3NJZCgpO1xuICAgIGlmIChib3NzSWQgIT0gbnVsbCAmJiB0aGlzLmlkICE9PSAweDVmKSB7IC8vIGRvbid0IHJlc3RvcmUgZHluYVxuICAgICAgLy8gVGhpcyB0YWJsZSBzaG91bGQgcmVzdG9yZSBwYXQwIGJ1dCBub3QgcGF0MVxuICAgICAgbGV0IHBhdHMgPSBbdGhpcy5zcHJpdGVQYXR0ZXJuc1swXSwgdW5kZWZpbmVkXTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweGE2KSBwYXRzID0gWzB4NTMsIDB4NTBdOyAvLyBkcmF5Z29uIDJcbiAgICAgIGNvbnN0IGJvc3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCAweDFmOTZiICsgMiAqIGJvc3NJZCkgKyAweDE0MDAwO1xuICAgICAgY29uc3QgYm9zc1Jlc3RvcmUgPSBbXG4gICAgICAgICwsLCB0aGlzLmJnbSwsXG4gICAgICAgIC4uLnRoaXMudGlsZVBhbGV0dGVzLCwsLCB0aGlzLnNwcml0ZVBhbGV0dGVzWzBdLCxcbiAgICAgICAgLCwsLCAvKnBhdHNbMF0qLywgLypwYXRzWzFdKi8sXG4gICAgICAgIHRoaXMuYW5pbWF0aW9uLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IFtdID0gW3BhdHNdOyAvLyBhdm9pZCBlcnJvclxuXG4gICAgICAvLyBpZiAocmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBib3NzQmFzZSkgPT09IDB4YmE5OCkge1xuICAgICAgLy8gICAvLyBlc2NhcGUgYW5pbWF0aW9uOiBkb24ndCBjbG9iYmVyIHBhdHRlcm5zIHlldD9cbiAgICAgIC8vIH1cbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYm9zc1Jlc3RvcmUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgY29uc3QgcmVzdG9yZWQgPSBib3NzUmVzdG9yZVtqXTtcbiAgICAgICAgaWYgKHJlc3RvcmVkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICB3cml0ZXIucm9tW2Jvc3NCYXNlICsgal0gPSByZXN0b3JlZDtcbiAgICAgIH1cbiAgICAgIC8vIGxhdGVyIHNwb3QgZm9yIHBhbDMgYW5kIHBhdDEgKmFmdGVyKiBleHBsb3Npb25cbiAgICAgIGNvbnN0IGJvc3NCYXNlMiA9IDB4MWY3YzEgKyA1ICogYm9zc0lkO1xuICAgICAgd3JpdGVyLnJvbVtib3NzQmFzZTJdID0gdGhpcy5zcHJpdGVQYWxldHRlc1sxXTtcbiAgICAgIC8vIE5PVEU6IFRoaXMgcnVpbnMgdGhlIHRyZWFzdXJlIGNoZXN0LlxuICAgICAgLy8gVE9ETyAtIGFkZCBzb21lIGFzbSBhZnRlciBhIGNoZXN0IGlzIGNsZWFyZWQgdG8gcmVsb2FkIHBhdHRlcm5zP1xuICAgICAgLy8gQW5vdGhlciBvcHRpb24gd291bGQgYmUgdG8gYWRkIGEgbG9jYXRpb24tc3BlY2lmaWMgY29udHJhaW50IHRvIGJlXG4gICAgICAvLyB3aGF0ZXZlciB0aGUgYm9zcyBcbiAgICAgIC8vd3JpdGVyLnJvbVtib3NzQmFzZTIgKyAxXSA9IHRoaXMuc3ByaXRlUGF0dGVybnNbMV07XG4gICAgfVxuICB9XG5cbiAgYWxsU2NyZWVucygpOiBTZXQ8U2NyZWVuPiB7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBTZXQ8U2NyZWVuPigpO1xuICAgIGNvbnN0IGV4dCA9IHRoaXMuZXh0ZW5kZWQgPyAweDEwMCA6IDA7XG4gICAgZm9yIChjb25zdCByb3cgb2YgdGhpcy5zY3JlZW5zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiByb3cpIHtcbiAgICAgICAgc2NyZWVucy5hZGQodGhpcy5yb20uc2NyZWVuc1tzY3JlZW4gKyBleHRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNjcmVlbnM7XG4gIH1cblxuICBib3NzSWQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MGU7IGkrKykge1xuICAgICAgaWYgKHRoaXMucm9tLnByZ1sweDFmOTVkICsgaV0gPT09IHRoaXMuaWQpIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgbmVpZ2hib3JzKGpvaW5OZXh1c2VzOiBib29sZWFuID0gZmFsc2UpOiBTZXQ8TG9jYXRpb24+IHtcbiAgICBjb25zdCBvdXQgPSBuZXcgU2V0PExvY2F0aW9uPigpO1xuICAgIGNvbnN0IGFkZE5laWdoYm9ycyA9IChsOiBMb2NhdGlvbikgPT4ge1xuICAgICAgZm9yIChjb25zdCBleGl0IG9mIGwuZXhpdHMpIHtcbiAgICAgICAgY29uc3QgaWQgPSBleGl0LmRlc3Q7XG4gICAgICAgIGNvbnN0IG5laWdoYm9yID0gdGhpcy5yb20ubG9jYXRpb25zW2lkXTtcbiAgICAgICAgaWYgKG5laWdoYm9yICYmIG5laWdoYm9yLnVzZWQgJiZcbiAgICAgICAgICAgIG5laWdoYm9yICE9PSB0aGlzICYmICFvdXQuaGFzKG5laWdoYm9yKSkge1xuICAgICAgICAgIG91dC5hZGQobmVpZ2hib3IpO1xuICAgICAgICAgIGlmIChqb2luTmV4dXNlcyAmJiBORVhVU0VTW25laWdoYm9yLmtleV0pIHtcbiAgICAgICAgICAgIGFkZE5laWdoYm9ycyhuZWlnaGJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGFkZE5laWdoYm9ycyh0aGlzKTtcbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgaGFzRG9scGhpbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pZCA9PT0gMHg2MCB8fCB0aGlzLmlkID09PSAweDY0IHx8IHRoaXMuaWQgPT09IDB4Njg7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBNYXAgb2YgdGlsZXMgKCRZWHl4KSByZWFjaGFibGUgZnJvbSBhbnkgZW50cmFuY2UgdG9cbiAgICogdW5mbGFnZ2VkIHRpbGVlZmZlY3RzLlxuICAgKi9cbiAgcmVhY2hhYmxlVGlsZXMoZmx5ID0gZmFsc2UpOiBNYXA8bnVtYmVyLCBudW1iZXI+IHtcbiAgICAvLyBUT0RPIC0gYXJncyBmb3IgKDEpIHVzZSBub24tMmVmIGZsYWdzLCAoMikgb25seSBmcm9tIGdpdmVuIGVudHJhbmNlL3RpbGVcbiAgICAvLyBEb2xwaGluIG1ha2VzIE5PX1dBTEsgb2theSBmb3Igc29tZSBsZXZlbHMuXG4gICAgaWYgKHRoaXMuaGFzRG9scGhpbigpKSBmbHkgPSB0cnVlO1xuICAgIC8vIFRha2UgaW50byBhY2NvdW50IHRoZSB0aWxlc2V0IGFuZCBmbGFncyBidXQgbm90IGFueSBvdmVybGF5LlxuICAgIGNvbnN0IGV4aXRzID0gbmV3IFNldCh0aGlzLmV4aXRzLm1hcChleGl0ID0+IGV4aXQuc2NyZWVuIDw8IDggfCBleGl0LnRpbGUpKTtcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0KHRoaXMudGlsZXNldCk7XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1t0aGlzLnRpbGVFZmZlY3RzIC0gMHhiM107XG4gICAgY29uc3QgcGFzc2FibGUgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IHRoaXMuc2NyZWVuc1t5XTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbcm93W3hdIHwgKHRoaXMuZXh0ZW5kZWQgPyAweDEwMCA6IDApXTtcbiAgICAgICAgY29uc3QgcG9zID0geSA8PCA0IHwgeDtcbiAgICAgICAgY29uc3QgZmxhZyA9IHRoaXMuZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBwb3MpO1xuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDB4ZjA7IHQrKykge1xuICAgICAgICAgIGNvbnN0IHRpbGVJZCA9IHBvcyA8PCA4IHwgdDtcbiAgICAgICAgICBpZiAoZXhpdHMuaGFzKHRpbGVJZCkpIGNvbnRpbnVlOyAvLyBkb24ndCBnbyBwYXN0IGV4aXRzXG4gICAgICAgICAgbGV0IHRpbGUgPSBzY3JlZW4udGlsZXNbdF07XG4gICAgICAgICAgLy8gZmxhZyAyZWYgaXMgXCJhbHdheXMgb25cIiwgZG9uJ3QgZXZlbiBib3RoZXIgbWFraW5nIGl0IGNvbmRpdGlvbmFsLlxuICAgICAgICAgIGxldCBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICBsZXQgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgaWYgKGZsYWcgJiYgYmxvY2tlZCAmJiB0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT0gdGlsZSkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICAgIGVmZmVjdHMgPSB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgICAgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYmxvY2tlZCkgcGFzc2FibGUuYWRkKHRpbGVJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCB0IG9mIHBhc3NhYmxlKSB7XG4gICAgICBjb25zdCByaWdodCA9ICh0ICYgMHgwZikgPT09IDB4MGYgPyB0ICsgMHhmMSA6IHQgKyAxO1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhyaWdodCkpIHVmLnVuaW9uKFt0LCByaWdodF0pO1xuICAgICAgY29uc3QgYmVsb3cgPSAodCAmIDB4ZjApID09PSAweGUwID8gdCArIDB4ZjIwIDogdCArIDE2O1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhiZWxvdykpIHVmLnVuaW9uKFt0LCBiZWxvd10pO1xuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IHVmLm1hcCgpO1xuICAgIGNvbnN0IHNldHMgPSBuZXcgU2V0PFNldDxudW1iZXI+PigpO1xuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgIGNvbnN0IGlkID0gZW50cmFuY2Uuc2NyZWVuIDw8IDggfCBlbnRyYW5jZS50aWxlO1xuICAgICAgc2V0cy5hZGQobWFwLmdldChpZCkhKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXQgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHNldHMpIHtcbiAgICAgIGZvciAoY29uc3QgdCBvZiBzZXQpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweDBmXTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tzY3IgfCAodGhpcy5leHRlbmRlZCA/IDB4MTAwIDogMCldO1xuICAgICAgICBvdXQuc2V0KHQsIHRpbGVFZmZlY3RzLmVmZmVjdHNbc2NyZWVuLnRpbGVzW3QgJiAweGZmXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgLyoqIFNhZmVyIHZlcnNpb24gb2YgdGhlIGJlbG93PyAqL1xuICBzY3JlZW5Nb3ZlcigpOiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHZvaWQge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgQXJyYXk8e3NjcmVlbjogbnVtYmVyfT4+KCgpID0+IFtdKTtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgbWFwLmdldChvYmouc2NyZWVuKS5wdXNoKG9iaik7XG4gICAgfVxuICAgIHJldHVybiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHtcbiAgICAgIGZvciAoY29uc3Qgb2JqIG9mIG1hcC5nZXQob3JpZykpIHtcbiAgICAgICAgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbGwgc3Bhd25zLCBlbnRyYW5jZXMsIGFuZCBleGl0cy5cbiAgICogQHBhcmFtIG9yaWcgWVggb2YgdGhlIG9yaWdpbmFsIHNjcmVlbi5cbiAgICogQHBhcmFtIHJlcGwgWVggb2YgdGhlIGVxdWl2YWxlbnQgcmVwbGFjZW1lbnQgc2NyZWVuLlxuICAgKi9cbiAgbW92ZVNjcmVlbihvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IG9ianMgPVxuICAgICAgICBpdGVycy5jb25jYXQ8e3NjcmVlbjogbnVtYmVyfT4odGhpcy5zcGF3bnMsIHRoaXMuZXhpdHMsIHRoaXMuZW50cmFuY2VzKTtcbiAgICBmb3IgKGNvbnN0IG9iaiBvZiBvYmpzKSB7XG4gICAgICBpZiAob2JqLnNjcmVlbiA9PT0gb3JpZykgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgfVxuICB9XG5cbiAgbW9uc3RlclBsYWNlcihyYW5kb206IFJhbmRvbSk6IChtOiBNb25zdGVyKSA9PiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIC8vIElmIHRoZXJlJ3MgYSBib3NzIHNjcmVlbiwgZXhjbHVkZSBpdCBmcm9tIGdldHRpbmcgZW5lbWllcy5cbiAgICBjb25zdCBib3NzID0gQk9TU19TQ1JFRU5TW3RoaXMua2V5XTtcbiAgICAvLyBTdGFydCB3aXRoIGxpc3Qgb2YgcmVhY2hhYmxlIHRpbGVzLlxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IHRoaXMucmVhY2hhYmxlVGlsZXMoZmFsc2UpO1xuICAgIC8vIERvIGEgYnJlYWR0aC1maXJzdCBzZWFyY2ggb2YgYWxsIHRpbGVzIHRvIGZpbmQgXCJkaXN0YW5jZVwiICgxLW5vcm0pLlxuICAgIGNvbnN0IGV4dGVuZGVkID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oWy4uLnJlYWNoYWJsZS5rZXlzKCldLm1hcCh4ID0+IFt4LCAwXSkpO1xuICAgIGNvbnN0IG5vcm1hbDogbnVtYmVyW10gPSBbXTsgLy8gcmVhY2hhYmxlLCBub3Qgc2xvcGUgb3Igd2F0ZXJcbiAgICBjb25zdCBtb3RoczogbnVtYmVyW10gPSBbXTsgIC8vIGRpc3RhbmNlIOKIiCAzLi43XG4gICAgY29uc3QgYmlyZHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSA+IDEyXG4gICAgY29uc3QgcGxhbnRzOiBudW1iZXJbXSA9IFtdOyAvLyBkaXN0YW5jZSDiiIggMi4uNFxuICAgIGNvbnN0IHBsYWNlZDogQXJyYXk8W01vbnN0ZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IG5vcm1hbFRlcnJhaW5NYXNrID0gdGhpcy5oYXNEb2xwaGluKCkgPyAweDI1IDogMHgyNztcbiAgICBmb3IgKGNvbnN0IFt0LCBkaXN0YW5jZV0gb2YgZXh0ZW5kZWQpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHhmXTtcbiAgICAgIGlmIChzY3IgPT09IGJvc3MpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBuIG9mIG5laWdoYm9ycyh0LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCkpIHtcbiAgICAgICAgaWYgKGV4dGVuZGVkLmhhcyhuKSkgY29udGludWU7XG4gICAgICAgIGV4dGVuZGVkLnNldChuLCBkaXN0YW5jZSArIDEpO1xuICAgICAgfVxuICAgICAgaWYgKCFkaXN0YW5jZSAmJiAhKHJlYWNoYWJsZS5nZXQodCkhICYgbm9ybWFsVGVycmFpbk1hc2spKSBub3JtYWwucHVzaCh0KTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweDFhKSB7XG4gICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgc3dhbXAgZm9yIHBsYW50IHBsYWNlbWVudFxuICAgICAgICBpZiAodGhpcy5yb20uc2NyZWVuc1tzY3JdLnRpbGVzW3QgJiAweGZmXSA9PT0gMHhmMCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZGlzdGFuY2UgPj0gMiAmJiBkaXN0YW5jZSA8PSA0KSBwbGFudHMucHVzaCh0KTtcbiAgICAgIH1cbiAgICAgIGlmIChkaXN0YW5jZSA+PSAzICYmIGRpc3RhbmNlIDw9IDcpIG1vdGhzLnB1c2godCk7XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMTIpIGJpcmRzLnB1c2godCk7XG4gICAgICAvLyBUT0RPIC0gc3BlY2lhbC1jYXNlIHN3YW1wIGZvciBwbGFudCBsb2NhdGlvbnM/XG4gICAgfVxuICAgIC8vIFdlIG5vdyBrbm93IGFsbCB0aGUgcG9zc2libGUgcGxhY2VzIHRvIHBsYWNlIHRoaW5ncy5cbiAgICAvLyAgLSBOT1RFOiBzdGlsbCBuZWVkIHRvIG1vdmUgY2hlc3RzIHRvIGRlYWQgZW5kcywgZXRjP1xuICAgIHJldHVybiAobTogTW9uc3RlcikgPT4ge1xuICAgICAgLy8gY2hlY2sgZm9yIHBsYWNlbWVudC5cbiAgICAgIGNvbnN0IHBsYWNlbWVudCA9IG0ucGxhY2VtZW50KCk7XG4gICAgICBjb25zdCBwb29sID0gWy4uLihwbGFjZW1lbnQgPT09ICdub3JtYWwnID8gbm9ybWFsIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ21vdGgnID8gbW90aHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnYmlyZCcgPyBiaXJkcyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdwbGFudCcgPyBwbGFudHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0TmV2ZXIocGxhY2VtZW50KSldXG4gICAgICBQT09MOlxuICAgICAgd2hpbGUgKHBvb2wubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGkgPSByYW5kb20ubmV4dEludChwb29sLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IFtwb3NdID0gcG9vbC5zcGxpY2UoaSwgMSk7XG5cbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYwMCkgPj4+IDQgfCAocG9zICYgMHhmKTtcbiAgICAgICAgY29uc3QgeSA9IChwb3MgJiAweGYwMDApID4+PiA4IHwgKHBvcyAmIDB4ZjApID4+PiA0O1xuICAgICAgICBjb25zdCByID0gbS5jbGVhcmFuY2UoKTtcblxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gb3RoZXIgZW5lbWllcy5cbiAgICAgICAgZm9yIChjb25zdCBbLCB4MSwgeTEsIHIxXSBvZiBwbGFjZWQpIHtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtIHkxKSAqKiAyICsgKHggLSB4MSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyByMSkgKiogMikgY29udGludWUgUE9PTDtcbiAgICAgICAgfVxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gZW50cmFuY2VzLlxuICAgICAgICBmb3IgKGNvbnN0IHt4OiB4MSwgeTogeTF9IG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSAoeTEgPj4gNCkpICoqIDIgKyAoeCAtICh4MSA+PiA0KSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyAxKSAqKiAyKSBjb250aW51ZSBQT09MO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVmFsaWQgc3BvdCAoc3RpbGwsIGhvdyB0b2EgYXBwcm94aW1hdGVseSAqbWF4aW1pemUqIGRpc3RhbmNlcz8pXG4gICAgICAgIHBsYWNlZC5wdXNoKFttLCB4LCB5LCByXSk7XG4gICAgICAgIGNvbnN0IHNjciA9ICh5ICYgMHhmMCkgfCAoeCAmIDB4ZjApID4+PiA0O1xuICAgICAgICBjb25zdCB0aWxlID0gKHkgJiAweDBmKSA8PCA0IHwgKHggJiAweDBmKTtcbiAgICAgICAgcmV0dXJuIHNjciA8PCA4IHwgdGlsZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG4gIC8vIFRPRE8gLSBhbGxvdyBsZXNzIHJhbmRvbW5lc3MgZm9yIGNlcnRhaW4gY2FzZXMsIGUuZy4gdG9wIG9mIG5vcnRoIHNhYnJlIG9yXG4gIC8vIGFwcHJvcHJpYXRlIHNpZGUgb2YgY29yZGVsLlxuXG4gIC8qKiBAcmV0dXJuIHshU2V0PG51bWJlcj59ICovXG4gIC8vIGFsbFRpbGVzKCkge1xuICAvLyAgIGNvbnN0IHRpbGVzID0gbmV3IFNldCgpO1xuICAvLyAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuc2NyZWVucykge1xuICAvLyAgICAgZm9yIChjb25zdCB0aWxlIG9mIHNjcmVlbi5hbGxUaWxlcygpKSB7XG4gIC8vICAgICAgIHRpbGVzLmFkZCh0aWxlKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIHRpbGVzO1xuICAvLyB9XG59XG5cbi8vIFRPRE8gLSBtb3ZlIHRvIGEgYmV0dGVyLW9yZ2FuaXplZCBkZWRpY2F0ZWQgXCJnZW9tZXRyeVwiIG1vZHVsZT9cbmZ1bmN0aW9uIG5laWdoYm9ycyh0aWxlOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgY29uc3QgeSA9IHRpbGUgJiAweGYwZjA7XG4gIGNvbnN0IHggPSB0aWxlICYgMHgwZjBmO1xuICBpZiAoeSA8ICgoaGVpZ2h0IC0gMSkgPDwgMTIgfCAweGUwKSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4ZTAgPyB0aWxlICsgMHgwZjIwIDogdGlsZSArIDE2KTtcbiAgfVxuICBpZiAoeSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4MDAgPyB0aWxlIC0gMHgwZjIwIDogdGlsZSAtIDE2KTtcbiAgfVxuICBpZiAoeCA8ICgod2lkdGggLSAxKSA8PCA4IHwgMHgwZikpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDBmID8gdGlsZSArIDB4MDBmMSA6IHRpbGUgKyAxKTtcbiAgfVxuICBpZiAoeCkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHgwZikgPT09IDB4MDAgPyB0aWxlIC0gMHgwMGYxIDogdGlsZSAtIDEpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBjb25zdCBFbnRyYW5jZSA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgeDogRGF0YVR1cGxlLnByb3AoWzBdLCBbMSwgMHhmZiwgLThdKSxcbiAgeTogRGF0YVR1cGxlLnByb3AoWzJdLCBbMywgMHhmZiwgLThdKSxcblxuICBzY3JlZW46IERhdGFUdXBsZS5wcm9wKFszLCAweDBmLCAtNF0sIFsxLCAweDBmXSksXG4gIHRpbGU6ICAgRGF0YVR1cGxlLnByb3AoWzIsIDB4ZjBdLCBbMCwgMHhmMCwgNF0pLFxuICBjb29yZDogIERhdGFUdXBsZS5wcm9wKFsyLCAweGZmLCAtOF0sIFswLCAweGZmXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEVudHJhbmNlICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLngpfSwgJHtoZXgodGhpcy55KX0pYDtcbiAgfSxcbn0pO1xuZXhwb3J0IHR5cGUgRW50cmFuY2UgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIEVudHJhbmNlPjtcblxuZXhwb3J0IGNvbnN0IEV4aXQgPSBEYXRhVHVwbGUubWFrZSg0LCB7XG4gIHg6ICAgICAgICBEYXRhVHVwbGUucHJvcChbMCwgMHhmZiwgLTRdKSxcbiAgeHQ6ICAgICAgIERhdGFUdXBsZS5wcm9wKFswXSksXG5cbiAgeTogICAgICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGZmLCAtNF0pLFxuICB5dDogICAgICAgRGF0YVR1cGxlLnByb3AoWzFdKSxcblxuICBzY3JlZW46ICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4ZjBdLCBbMCwgMHhmMCwgNF0pLFxuICB0aWxlOiAgICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4MGYsIC00XSwgWzAsIDB4MGZdKSxcblxuICBkZXN0OiAgICAgRGF0YVR1cGxlLnByb3AoWzJdKSxcblxuICBlbnRyYW5jZTogRGF0YVR1cGxlLnByb3AoWzNdKSxcblxuICB0b1N0cmluZyh0aGlzOiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgRXhpdCAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy54KX0sICR7aGV4KHRoaXMueSl9KSA9PiAke1xuICAgICAgICAgICAgdGhpcy5kZXN0fToke3RoaXMuZW50cmFuY2V9YDtcbiAgfSxcbn0pO1xuZXhwb3J0IHR5cGUgRXhpdCA9IEluc3RhbmNlVHlwZTx0eXBlb2YgRXhpdD47XG5cbmV4cG9ydCBjb25zdCBGbGFnID0gRGF0YVR1cGxlLm1ha2UoMiwge1xuICBmbGFnOiAge1xuICAgIGdldCh0aGlzOiBhbnkpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5kYXRhWzBdIHwgMHgyMDA7IH0sXG4gICAgc2V0KHRoaXM6IGFueSwgZjogbnVtYmVyKSB7XG4gICAgICBpZiAoKGYgJiB+MHhmZikgIT09IDB4MjAwKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCBmbGFnOiAke2hleChmKX1gKTtcbiAgICAgIHRoaXMuZGF0YVswXSA9IGYgJiAweGZmO1xuICAgIH0sXG4gIH0sXG5cbiAgeDogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDA3LCAtOF0pLFxuICB4czogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4MDddKSxcblxuICB5OiAgICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4ZjAsIC00XSksXG4gIHlzOiAgICBEYXRhVHVwbGUucHJvcChbMSwgMHhmMCwgNF0pLFxuXG4gIC8vIFRPRE8gLSByZW1vdmUgdGhlICd5eCcgdmVyc2lvblxuICB5eDogICAgRGF0YVR1cGxlLnByb3AoWzFdKSwgLy8geSBpbiBoaSBuaWJibGUsIHggaW4gbG8uXG4gIHNjcmVlbjogRGF0YVR1cGxlLnByb3AoWzFdKSxcblxuICB0b1N0cmluZyh0aGlzOiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgRmxhZyAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy54cyl9LCAke2hleCh0aGlzLnlzKX0pIEAgJHtcbiAgICAgICAgICAgIGhleCh0aGlzLmZsYWcpfWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIEZsYWcgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIEZsYWc+O1xuXG5leHBvcnQgY29uc3QgUGl0ID0gRGF0YVR1cGxlLm1ha2UoNCwge1xuICBmcm9tWHM6ICBEYXRhVHVwbGUucHJvcChbMSwgMHg3MCwgNF0pLFxuICB0b1hzOiAgICBEYXRhVHVwbGUucHJvcChbMSwgMHgwN10pLFxuXG4gIGZyb21ZczogIERhdGFUdXBsZS5wcm9wKFszLCAweGYwLCA0XSksXG4gIHRvWXM6ICAgIERhdGFUdXBsZS5wcm9wKFszLCAweDBmXSksXG5cbiAgZGVzdDogICAgRGF0YVR1cGxlLnByb3AoWzBdKSxcblxuICB0b1N0cmluZyh0aGlzOiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgUGl0ICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLmZyb21Ycyl9LCAke2hleCh0aGlzLmZyb21Zcyl9KSA9PiAke1xuICAgICAgICAgICAgaGV4KHRoaXMuZGVzdCl9Oigke2hleCh0aGlzLnRvWHMpfSwgJHtoZXgodGhpcy50b1lzKX0pYDtcbiAgfSxcbn0pO1xuZXhwb3J0IHR5cGUgUGl0ID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBQaXQ+O1xuXG5leHBvcnQgY29uc3QgU3Bhd24gPSBEYXRhVHVwbGUubWFrZSg0LCB7XG4gIHk6ICAgICBEYXRhVHVwbGUucHJvcChbMCwgMHhmZiwgLTRdKSxcbiAgeXQ6ICAgIERhdGFUdXBsZS5wcm9wKFswXSksXG5cbiAgdGltZWQ6IERhdGFUdXBsZS5ib29sZWFuUHJvcChbMSwgMHg4MCwgN10pLFxuICB4OiAgICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4N2YsIC00XSwgWzIsIDB4NDAsIDNdKSxcbiAgeHQ6ICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDdmXSksXG5cbiAgc2NyZWVuOiBEYXRhVHVwbGUucHJvcChbMCwgMHhmMF0sIFsxLCAweGYwLCA0XSksXG4gIHRpbGU6ICAgRGF0YVR1cGxlLnByb3AoWzAsIDB4MGYsIC00XSwgWzEsIDB4MGZdKSxcblxuICBwYXR0ZXJuQmFuazogRGF0YVR1cGxlLnByb3AoWzIsIDB4ODAsIDddKSxcbiAgdHlwZTogIERhdGFUdXBsZS5wcm9wKFsyLCAweDA3XSksXG5cbi8vIHBhdHRlcm5CYW5rOiB7Z2V0KHRoaXM6IGFueSk6IG51bWJlciB7IHJldHVybiB0aGlzLmRhdGFbMl0gPj4+IDc7IH0sXG4vLyAgICAgICAgICAgICAgIHNldCh0aGlzOiBhbnksIHY6IG51bWJlcikgeyBpZiAodGhpcy5kYXRhWzNdID09PSAxMjApIGRlYnVnZ2VyO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHRoaXMuZGF0YVsyXSB8PSAweDgwOyBlbHNlIHRoaXMuZGF0YVsyXSAmPSAweDdmOyB9fSxcbiAgaWQ6ICAgIERhdGFUdXBsZS5wcm9wKFszXSksXG5cbiAgdXNlZDoge2dldCh0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGF0YVswXSAhPT0gMHhmZTsgfSxcbiAgICAgICAgIHNldCh0aGlzOiBhbnksIHVzZWQ6IGJvb2xlYW4pIHsgdGhpcy5kYXRhWzBdID0gdXNlZCA/IDAgOiAweGZlOyB9fSxcbiAgbW9uc3RlcklkOiB7Z2V0KHRoaXM6IGFueSk6IG51bWJlciB7IHJldHVybiAodGhpcy5pZCArIDB4NTApICYgMHhmZjsgfSxcbiAgICAgICAgICAgICAgc2V0KHRoaXM6IGFueSwgaWQ6IG51bWJlcikgeyB0aGlzLmlkID0gKGlkIC0gMHg1MCkgJiAweGZmOyB9fSxcbiAgLyoqIE5vdGU6IHRoaXMgaW5jbHVkZXMgbWltaWNzLiAqL1xuICBpc0NoZXN0KHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAyICYmIHRoaXMuaWQgPCAweDgwOyB9LFxuICBpc0ludmlzaWJsZSh0aGlzOiBhbnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc0NoZXN0KCkgJiYgQm9vbGVhbih0aGlzLmRhdGFbMl0gJiAweDIwKTtcbiAgfSxcbiAgaXNUcmlnZ2VyKHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAyICYmIHRoaXMuaWQgPj0gMHg4MDsgfSxcbiAgaXNOcGModGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDEgJiYgdGhpcy5pZCA8IDB4YzA7IH0sXG4gIGlzQm9zcyh0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMSAmJiB0aGlzLmlkID49IDB4YzA7IH0sXG4gIGlzTW9uc3Rlcih0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMDsgfSxcbiAgaXNXYWxsKHRoaXM6IGFueSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBCb29sZWFuKHRoaXMudHlwZSA9PT0gMyAmJiAodGhpcy5pZCA8IDQgfHwgKHRoaXMuZGF0YVsyXSAmIDB4MjApKSk7XG4gIH0sXG4gIHdhbGxUeXBlKHRoaXM6IGFueSk6ICcnIHwgJ3dhbGwnIHwgJ2JyaWRnZScge1xuICAgIGlmICh0aGlzLnR5cGUgIT09IDMpIHJldHVybiAnJztcbiAgICBjb25zdCBvYmogPSB0aGlzLmRhdGFbMl0gJiAweDIwID8gdGhpcy5pZCA+Pj4gNCA6IHRoaXMuaWQ7XG4gICAgaWYgKG9iaiA+PSA0KSByZXR1cm4gJyc7XG4gICAgcmV0dXJuIG9iaiA9PT0gMiA/ICdicmlkZ2UnIDogJ3dhbGwnO1xuICB9LFxuICB3YWxsRWxlbWVudCh0aGlzOiBhbnkpOiBudW1iZXIge1xuICAgIGlmICghdGhpcy5pc1dhbGwoKSkgcmV0dXJuIC0xO1xuICAgIHJldHVybiB0aGlzLmlkICYgMztcbiAgfSxcbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFNwYXduICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLngpfSwgJHtoZXgodGhpcy55KX0pICR7XG4gICAgICAgICAgICB0aGlzLnRpbWVkID8gJ3RpbWVkJyA6ICdmaXhlZCd9ICR7dGhpcy50eXBlfToke2hleCh0aGlzLmlkKX1gO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBTcGF3biA9IEluc3RhbmNlVHlwZTx0eXBlb2YgU3Bhd24+O1xuXG5leHBvcnQgY29uc3QgTE9DQVRJT05TID0ge1xuICBtZXphbWVTaHJpbmU6IFsweDAwLCAnTWV6YW1lIFNocmluZSddLFxuICBsZWFmT3V0c2lkZVN0YXJ0OiBbMHgwMSwgJ0xlYWYgLSBPdXRzaWRlIFN0YXJ0J10sXG4gIGxlYWY6IFsweDAyLCAnTGVhZiddLFxuICB2YWxsZXlPZldpbmQ6IFsweDAzLCAnVmFsbGV5IG9mIFdpbmQnXSxcbiAgc2VhbGVkQ2F2ZTE6IFsweDA0LCAnU2VhbGVkIENhdmUgMSddLFxuICBzZWFsZWRDYXZlMjogWzB4MDUsICdTZWFsZWQgQ2F2ZSAyJ10sXG4gIHNlYWxlZENhdmU2OiBbMHgwNiwgJ1NlYWxlZCBDYXZlIDYnXSxcbiAgc2VhbGVkQ2F2ZTQ6IFsweDA3LCAnU2VhbGVkIENhdmUgNCddLFxuICBzZWFsZWRDYXZlNTogWzB4MDgsICdTZWFsZWQgQ2F2ZSA1J10sXG4gIHNlYWxlZENhdmUzOiBbMHgwOSwgJ1NlYWxlZCBDYXZlIDMnXSxcbiAgc2VhbGVkQ2F2ZTc6IFsweDBhLCAnU2VhbGVkIENhdmUgNyddLFxuICAvLyBJTlZBTElEOiAweDBiXG4gIHNlYWxlZENhdmU4OiBbMHgwYywgJ1NlYWxlZCBDYXZlIDgnXSxcbiAgLy8gSU5WQUxJRDogMHgwZFxuICB3aW5kbWlsbENhdmU6IFsweDBlLCAnV2luZG1pbGwgQ2F2ZSddLFxuICB3aW5kbWlsbDogWzB4MGYsICdXaW5kbWlsbCddLFxuICB6ZWJ1Q2F2ZTogWzB4MTAsICdaZWJ1IENhdmUnXSxcbiAgbXRTYWJyZVdlc3RDYXZlMTogWzB4MTEsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSAxJ10sXG4gIC8vIElOVkFMSUQ6IDB4MTJcbiAgLy8gSU5WQUxJRDogMHgxM1xuICBjb3JkZWxQbGFpbnNXZXN0OiBbMHgxNCwgJ0NvcmRlbCBQbGFpbnMgV2VzdCddLFxuICBjb3JkZWxQbGFpbnNFYXN0OiBbMHgxNSwgJ0NvcmRlbCBQbGFpbnMgRWFzdCddLFxuICAvLyBJTlZBTElEOiAweDE2IC0tIHVudXNlZCBjb3B5IG9mIDE4XG4gIC8vIElOVkFMSUQ6IDB4MTdcbiAgYnJ5bm1hZXI6IFsweDE4LCAnQnJ5bm1hZXInXSxcbiAgb3V0c2lkZVN0b21Ib3VzZTogWzB4MTksICdPdXRzaWRlIFN0b20gSG91c2UnXSxcbiAgc3dhbXA6IFsweDFhLCAnU3dhbXAnXSxcbiAgYW1hem9uZXM6IFsweDFiLCAnQW1hem9uZXMnXSxcbiAgb2FrOiBbMHgxYywgJ09hayddLFxuICAvLyBJTlZBTElEOiAweDFkXG4gIHN0b21Ib3VzZTogWzB4MWUsICdTdG9tIEhvdXNlJ10sXG4gIC8vIElOVkFMSUQ6IDB4MWZcbiAgbXRTYWJyZVdlc3RMb3dlcjogWzB4MjAsICdNdCBTYWJyZSBXZXN0IC0gTG93ZXInXSxcbiAgbXRTYWJyZVdlc3RVcHBlcjogWzB4MjEsICdNdCBTYWJyZSBXZXN0IC0gVXBwZXInXSxcbiAgbXRTYWJyZVdlc3RDYXZlMjogWzB4MjIsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSAyJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTM6IFsweDIzLCAnTXQgU2FicmUgV2VzdCAtIENhdmUgMyddLFxuICBtdFNhYnJlV2VzdENhdmU0OiBbMHgyNCwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDQnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNTogWzB4MjUsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA1J10sXG4gIG10U2FicmVXZXN0Q2F2ZTY6IFsweDI2LCAnTXQgU2FicmUgV2VzdCAtIENhdmUgNiddLFxuICBtdFNhYnJlV2VzdENhdmU3OiBbMHgyNywgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDcnXSxcbiAgbXRTYWJyZU5vcnRoTWFpbjogWzB4MjgsICdNdCBTYWJyZSBOb3J0aCAtIE1haW4nXSxcbiAgbXRTYWJyZU5vcnRoTWlkZGxlOiBbMHgyOSwgJ010IFNhYnJlIE5vcnRoIC0gTWlkZGxlJ10sXG4gIG10U2FicmVOb3J0aENhdmUyOiBbMHgyYSwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSAyJ10sXG4gIG10U2FicmVOb3J0aENhdmUzOiBbMHgyYiwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSAzJ10sXG4gIG10U2FicmVOb3J0aENhdmU0OiBbMHgyYywgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSA0J10sXG4gIG10U2FicmVOb3J0aENhdmU1OiBbMHgyZCwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSA1J10sXG4gIG10U2FicmVOb3J0aENhdmU2OiBbMHgyZSwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSA2J10sXG4gIG10U2FicmVOb3J0aFByaXNvbkhhbGw6IFsweDJmLCAnTXQgU2FicmUgTm9ydGggLSBQcmlzb24gSGFsbCddLFxuICBtdFNhYnJlTm9ydGhMZWZ0Q2VsbDogWzB4MzAsICdNdCBTYWJyZSBOb3J0aCAtIExlZnQgQ2VsbCddLFxuICBtdFNhYnJlTm9ydGhMZWZ0Q2VsbDI6IFsweDMxLCAnTXQgU2FicmUgTm9ydGggLSBMZWZ0IENlbGwgMiddLFxuICBtdFNhYnJlTm9ydGhSaWdodENlbGw6IFsweDMyLCAnTXQgU2FicmUgTm9ydGggLSBSaWdodCBDZWxsJ10sXG4gIG10U2FicmVOb3J0aENhdmU4OiBbMHgzMywgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSA4J10sXG4gIG10U2FicmVOb3J0aENhdmU5OiBbMHgzNCwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSA5J10sXG4gIG10U2FicmVOb3J0aFN1bW1pdENhdmU6IFsweDM1LCAnTXQgU2FicmUgTm9ydGggLSBTdW1taXQgQ2F2ZSddLFxuICAvLyBJTlZBTElEOiAweDM2XG4gIC8vIElOVkFMSUQ6IDB4MzdcbiAgbXRTYWJyZU5vcnRoQ2F2ZTE6IFsweDM4LCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDEnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTc6IFsweDM5LCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDcnXSxcbiAgLy8gSU5WQUxJRDogMHgzYVxuICAvLyBJTlZBTElEOiAweDNiXG4gIG5hZGFyZUlubjogWzB4M2MsICdOYWRhcmUgLSBJbm4nXSxcbiAgbmFkYXJlVG9vbFNob3A6IFsweDNkLCAnTmFkYXJlIC0gVG9vbCBTaG9wJ10sXG4gIG5hZGFyZUJhY2tSb29tOiBbMHgzZSwgJ05hZGFyZSAtIEJhY2sgUm9vbSddLFxuICAvLyBJTlZBTElEOiAweDNmXG4gIHdhdGVyZmFsbFZhbGxleU5vcnRoOiBbMHg0MCwgJ1dhdGVyZmFsbCBWYWxsZXkgTm9ydGgnXSxcbiAgd2F0ZXJmYWxsVmFsbGV5U291dGg6IFsweDQxLCAnV2F0ZXJmYWxsIFZhbGxleSBTb3V0aCddLFxuICBsaW1lVHJlZVZhbGxleTogWzB4NDIsICdMaW1lIFRyZWUgVmFsbGV5J10sXG4gIGxpbWVUcmVlTGFrZTogWzB4NDMsICdMaW1lIFRyZWUgTGFrZSddLFxuICBraXJpc2FQbGFudENhdmUxOiBbMHg0NCwgJ0tpcmlzYSBQbGFudCBDYXZlIDEnXSxcbiAga2lyaXNhUGxhbnRDYXZlMjogWzB4NDUsICdLaXJpc2EgUGxhbnQgQ2F2ZSAyJ10sXG4gIGtpcmlzYVBsYW50Q2F2ZTM6IFsweDQ2LCAnS2lyaXNhIFBsYW50IENhdmUgMyddLFxuICBraXJpc2FNZWFkb3c6IFsweDQ3LCAnS2lyaXNhIE1lYWRvdyddLFxuICBmb2dMYW1wQ2F2ZTE6IFsweDQ4LCAnRm9nIExhbXAgQ2F2ZSAxJ10sXG4gIGZvZ0xhbXBDYXZlMjogWzB4NDksICdGb2cgTGFtcCBDYXZlIDInXSxcbiAgZm9nTGFtcENhdmUzOiBbMHg0YSwgJ0ZvZyBMYW1wIENhdmUgMyddLFxuICBmb2dMYW1wQ2F2ZURlYWRFbmQ6IFsweDRiLCAnRm9nIExhbXAgQ2F2ZSBEZWFkIEVuZCddLFxuICBmb2dMYW1wQ2F2ZTQ6IFsweDRjLCAnRm9nIExhbXAgQ2F2ZSA0J10sXG4gIGZvZ0xhbXBDYXZlNTogWzB4NGQsICdGb2cgTGFtcCBDYXZlIDUnXSxcbiAgZm9nTGFtcENhdmU2OiBbMHg0ZSwgJ0ZvZyBMYW1wIENhdmUgNiddLFxuICBmb2dMYW1wQ2F2ZTc6IFsweDRmLCAnRm9nIExhbXAgQ2F2ZSA3J10sXG4gIHBvcnRvYTogWzB4NTAsICdQb3J0b2EnXSxcbiAgcG9ydG9hRmlzaGVybWFuSXNsYW5kOiBbMHg1MSwgJ1BvcnRvYSAtIEZpc2hlcm1hbiBJc2xhbmQnXSxcbiAgbWVzaWFTaHJpbmU6IFsweDUyLCAnTWVzaWEgU2hyaW5lJ10sXG4gIC8vIElOVkFMSUQ6IDB4NTNcbiAgd2F0ZXJmYWxsQ2F2ZTE6IFsweDU0LCAnV2F0ZXJmYWxsIENhdmUgMSddLFxuICB3YXRlcmZhbGxDYXZlMjogWzB4NTUsICdXYXRlcmZhbGwgQ2F2ZSAyJ10sXG4gIHdhdGVyZmFsbENhdmUzOiBbMHg1NiwgJ1dhdGVyZmFsbCBDYXZlIDMnXSxcbiAgd2F0ZXJmYWxsQ2F2ZTQ6IFsweDU3LCAnV2F0ZXJmYWxsIENhdmUgNCddLFxuICB0b3dlckVudHJhbmNlOiBbMHg1OCwgJ1Rvd2VyIC0gRW50cmFuY2UnXSxcbiAgdG93ZXIxOiBbMHg1OSwgJ1Rvd2VyIDEnXSxcbiAgdG93ZXIyOiBbMHg1YSwgJ1Rvd2VyIDInXSxcbiAgdG93ZXIzOiBbMHg1YiwgJ1Rvd2VyIDMnXSxcbiAgdG93ZXJPdXRzaWRlTWVzaWE6IFsweDVjLCAnVG93ZXIgLSBPdXRzaWRlIE1lc2lhJ10sXG4gIHRvd2VyT3V0c2lkZUR5bmE6IFsweDVkLCAnVG93ZXIgLSBPdXRzaWRlIER5bmEnXSxcbiAgdG93ZXJNZXNpYTogWzB4NWUsICdUb3dlciAtIE1lc2lhJ10sXG4gIHRvd2VyRHluYTogWzB4NWYsICdUb3dlciAtIER5bmEnXSxcbiAgYW5ncnlTZWE6IFsweDYwLCAnQW5ncnkgU2VhJ10sXG4gIGJvYXRIb3VzZTogWzB4NjEsICdCb2F0IEhvdXNlJ10sXG4gIGpvZWxMaWdodGhvdXNlOiBbMHg2MiwgJ0pvZWwgLSBMaWdodGhvdXNlJ10sXG4gIC8vIElOVkFMSUQ6IDB4NjNcbiAgdW5kZXJncm91bmRDaGFubmVsOiBbMHg2NCwgJ1VuZGVyZ3JvdW5kIENoYW5uZWwnXSxcbiAgem9tYmllVG93bjogWzB4NjUsICdab21iaWUgVG93biddLFxuICAvLyBJTlZBTElEOiAweDY2XG4gIC8vIElOVkFMSUQ6IDB4NjdcbiAgZXZpbFNwaXJpdElzbGFuZDE6IFsweDY4LCAnRXZpbCBTcGlyaXQgSXNsYW5kIDEnXSxcbiAgZXZpbFNwaXJpdElzbGFuZDI6IFsweDY5LCAnRXZpbCBTcGlyaXQgSXNsYW5kIDInXSxcbiAgZXZpbFNwaXJpdElzbGFuZDM6IFsweDZhLCAnRXZpbCBTcGlyaXQgSXNsYW5kIDMnXSxcbiAgZXZpbFNwaXJpdElzbGFuZDQ6IFsweDZiLCAnRXZpbCBTcGlyaXQgSXNsYW5kIDQnXSxcbiAgc2FiZXJhUGFsYWNlMTogWzB4NmMsICdTYWJlcmEgUGFsYWNlIDEnXSxcbiAgc2FiZXJhUGFsYWNlMjogWzB4NmQsICdTYWJlcmEgUGFsYWNlIDInXSxcbiAgc2FiZXJhUGFsYWNlMzogWzB4NmUsICdTYWJlcmEgUGFsYWNlIDMnXSxcbiAgLy8gSU5WQUxJRDogMHg2ZiAtLSBTYWJlcmEgUGFsYWNlIDMgdW51c2VkIGNvcHlcbiAgam9lbFNlY3JldFBhc3NhZ2U6IFsweDcwLCAnSm9lbCAtIFNlY3JldCBQYXNzYWdlJ10sXG4gIGpvZWw6IFsweDcxLCAnSm9lbCddLFxuICBzd2FuOiBbMHg3MiwgJ1N3YW4nXSxcbiAgc3dhbkdhdGU6IFsweDczLCAnU3dhbiAtIEdhdGUnXSxcbiAgLy8gSU5WQUxJRDogMHg3NFxuICAvLyBJTlZBTElEOiAweDc1XG4gIC8vIElOVkFMSUQ6IDB4NzZcbiAgLy8gSU5WQUxJRDogMHg3N1xuICBnb2FWYWxsZXk6IFsweDc4LCAnR29hIFZhbGxleSddLFxuICAvLyBJTlZBTElEOiAweDc5XG4gIC8vIElOVkFMSUQ6IDB4N2FcbiAgLy8gSU5WQUxJRDogMHg3YlxuICBtdEh5ZHJhOiBbMHg3YywgJ010IEh5ZHJhJ10sXG4gIG10SHlkcmFDYXZlMTogWzB4N2QsICdNdCBIeWRyYSAtIENhdmUgMSddLFxuICBtdEh5ZHJhT3V0c2lkZVNoeXJvbjogWzB4N2UsICdNdCBIeWRyYSAtIE91dHNpZGUgU2h5cm9uJ10sXG4gIG10SHlkcmFDYXZlMjogWzB4N2YsICdNdCBIeWRyYSAtIENhdmUgMiddLFxuICBtdEh5ZHJhQ2F2ZTM6IFsweDgwLCAnTXQgSHlkcmEgLSBDYXZlIDMnXSxcbiAgbXRIeWRyYUNhdmU0OiBbMHg4MSwgJ010IEh5ZHJhIC0gQ2F2ZSA0J10sXG4gIG10SHlkcmFDYXZlNTogWzB4ODIsICdNdCBIeWRyYSAtIENhdmUgNSddLFxuICBtdEh5ZHJhQ2F2ZTY6IFsweDgzLCAnTXQgSHlkcmEgLSBDYXZlIDYnXSxcbiAgbXRIeWRyYUNhdmU3OiBbMHg4NCwgJ010IEh5ZHJhIC0gQ2F2ZSA3J10sXG4gIG10SHlkcmFDYXZlODogWzB4ODUsICdNdCBIeWRyYSAtIENhdmUgOCddLFxuICBtdEh5ZHJhQ2F2ZTk6IFsweDg2LCAnTXQgSHlkcmEgLSBDYXZlIDknXSxcbiAgbXRIeWRyYUNhdmUxMDogWzB4ODcsICdNdCBIeWRyYSAtIENhdmUgMTAnXSxcbiAgc3R5eDE6IFsweDg4LCAnU3R5eCAxJ10sXG4gIHN0eXgyOiBbMHg4OSwgJ1N0eXggMiddLFxuICBzdHl4MzogWzB4OGEsICdTdHl4IDMnXSxcbiAgLy8gSU5WQUxJRDogMHg4YlxuICBzaHlyb246IFsweDhjLCAnU2h5cm9uJ10sXG4gIC8vIElOVkFMSUQ6IDB4OGRcbiAgZ29hOiBbMHg4ZSwgJ0dvYSddLFxuICBnb2FGb3J0cmVzc09hc2lzRW50cmFuY2U6IFsweDhmLCAnR29hIEZvcnRyZXNzIC0gT2FzaXMgRW50cmFuY2UnXSxcbiAgZGVzZXJ0MTogWzB4OTAsICdEZXNlcnQgMSddLFxuICBvYXNpc0NhdmVNYWluOiBbMHg5MSwgJ09hc2lzIENhdmUgLSBNYWluJ10sXG4gIGRlc2VydENhdmUxOiBbMHg5MiwgJ0Rlc2VydCBDYXZlIDEnXSxcbiAgc2FoYXJhOiBbMHg5MywgJ1NhaGFyYSddLFxuICBzYWhhcmFPdXRzaWRlQ2F2ZTogWzB4OTQsICdTYWhhcmEgLSBPdXRzaWRlIENhdmUnXSxcbiAgZGVzZXJ0Q2F2ZTI6IFsweDk1LCAnRGVzZXJ0IENhdmUgMiddLFxuICBzYWhhcmFNZWFkb3c6IFsweDk2LCAnU2FoYXJhIE1lYWRvdyddLFxuICAvLyBJTlZBTElEOiAweDk3XG4gIGRlc2VydDI6IFsweDk4LCAnRGVzZXJ0IDInXSxcbiAgLy8gSU5WQUxJRDogMHg5OVxuICAvLyBJTlZBTElEOiAweDlhXG4gIC8vIElOVkFMSUQ6IDB4OWJcbiAgcHlyYW1pZEVudHJhbmNlOiBbMHg5YywgJ1B5cmFtaWQgLSBFbnRyYW5jZSddLFxuICBweXJhbWlkQnJhbmNoOiBbMHg5ZCwgJ1B5cmFtaWQgLSBCcmFuY2gnXSxcbiAgcHlyYW1pZE1haW46IFsweDllLCAnUHlyYW1pZCAtIE1haW4nXSxcbiAgcHlyYW1pZERyYXlnb246IFsweDlmLCAnUHlyYW1pZCAtIERyYXlnb24nXSxcbiAgY3J5cHRFbnRyYW5jZTogWzB4YTAsICdDcnlwdCAtIEVudHJhbmNlJ10sXG4gIGNyeXB0SGFsbDE6IFsweGExLCAnQ3J5cHQgLSBIYWxsIDEnXSxcbiAgY3J5cHRCcmFuY2g6IFsweGEyLCAnQ3J5cHQgLSBCcmFuY2gnXSxcbiAgY3J5cHREZWFkRW5kTGVmdDogWzB4YTMsICdDcnlwdCAtIERlYWQgRW5kIExlZnQnXSxcbiAgY3J5cHREZWFkRW5kUmlnaHQ6IFsweGE0LCAnQ3J5cHQgLSBEZWFkIEVuZCBSaWdodCddLFxuICBjcnlwdEhhbGwyOiBbMHhhNSwgJ0NyeXB0IC0gSGFsbCAyJ10sXG4gIGNyeXB0RHJheWdvbjI6IFsweGE2LCAnQ3J5cHQgLSBEcmF5Z29uIDInXSxcbiAgY3J5cHRUZWxlcG9ydGVyOiBbMHhhNywgJ0NyeXB0IC0gVGVsZXBvcnRlciddLFxuICBnb2FGb3J0cmVzc0VudHJhbmNlOiBbMHhhOCwgJ0dvYSBGb3J0cmVzcyAtIEVudHJhbmNlJ10sXG4gIGdvYUZvcnRyZXNzS2VsYmVzcXVlOiBbMHhhOSwgJ0dvYSBGb3J0cmVzcyAtIEtlbGJlc3F1ZSddLFxuICBnb2FGb3J0cmVzc1plYnU6IFsweGFhLCAnR29hIEZvcnRyZXNzIC0gWmVidSddLFxuICBnb2FGb3J0cmVzc1NhYmVyYTogWzB4YWIsICdHb2EgRm9ydHJlc3MgLSBTYWJlcmEnXSxcbiAgZ29hRm9ydHJlc3NUb3JuZWw6IFsweGFjLCAnR29hIEZvcnRyZXNzIC0gVG9ybmVsJ10sXG4gIGdvYUZvcnRyZXNzTWFkbzE6IFsweGFkLCAnR29hIEZvcnRyZXNzIC0gTWFkbyAxJ10sXG4gIGdvYUZvcnRyZXNzTWFkbzI6IFsweGFlLCAnR29hIEZvcnRyZXNzIC0gTWFkbyAyJ10sXG4gIGdvYUZvcnRyZXNzTWFkbzM6IFsweGFmLCAnR29hIEZvcnRyZXNzIC0gTWFkbyAzJ10sXG4gIGdvYUZvcnRyZXNzS2FybWluZTE6IFsweGIwLCAnR29hIEZvcnRyZXNzIC0gS2FybWluZSAxJ10sXG4gIGdvYUZvcnRyZXNzS2FybWluZTI6IFsweGIxLCAnR29hIEZvcnRyZXNzIC0gS2FybWluZSAyJ10sXG4gIGdvYUZvcnRyZXNzS2FybWluZTM6IFsweGIyLCAnR29hIEZvcnRyZXNzIC0gS2FybWluZSAzJ10sXG4gIGdvYUZvcnRyZXNzS2FybWluZTQ6IFsweGIzLCAnR29hIEZvcnRyZXNzIC0gS2FybWluZSA0J10sXG4gIGdvYUZvcnRyZXNzS2FybWluZTU6IFsweGI0LCAnR29hIEZvcnRyZXNzIC0gS2FybWluZSA1J10sXG4gIGdvYUZvcnRyZXNzS2FybWluZTY6IFsweGI1LCAnR29hIEZvcnRyZXNzIC0gS2FybWluZSA2J10sXG4gIGdvYUZvcnRyZXNzS2FybWluZTc6IFsweGI2LCAnR29hIEZvcnRyZXNzIC0gS2FybWluZSA3J10sXG4gIGdvYUZvcnRyZXNzRXhpdDogWzB4YjcsICdHb2EgRm9ydHJlc3MgLSBFeGl0J10sXG4gIG9hc2lzQ2F2ZUVudHJhbmNlOiBbMHhiOCwgJ09hc2lzIENhdmUgLSBFbnRyYW5jZSddLFxuICBnb2FGb3J0cmVzc0FzaW5hOiBbMHhiOSwgJ0dvYSBGb3J0cmVzcyAtIEFzaW5hJ10sXG4gIGdvYUZvcnRyZXNzS2Vuc3U6IFsweGJhLCAnR29hIEZvcnRyZXNzIC0gS2Vuc3UnXSxcbiAgZ29hSG91c2U6IFsweGJiLCAnR29hIC0gSG91c2UnXSxcbiAgZ29hSW5uOiBbMHhiYywgJ0dvYSAtIElubiddLFxuICAvLyBJTlZBTElEOiAweGJkXG4gIGdvYVRvb2xTaG9wOiBbMHhiZSwgJ0dvYSAtIFRvb2wgU2hvcCddLFxuICBnb2FUYXZlcm46IFsweGJmLCAnR29hIC0gVGF2ZXJuJ10sXG4gIGxlYWZFbGRlckhvdXNlOiBbMHhjMCwgJ0xlYWYgLSBFbGRlciBIb3VzZSddLFxuICBsZWFmUmFiYml0SHV0OiBbMHhjMSwgJ0xlYWYgLSBSYWJiaXQgSHV0J10sXG4gIGxlYWZJbm46IFsweGMyLCAnTGVhZiAtIElubiddLFxuICBsZWFmVG9vbFNob3A6IFsweGMzLCAnTGVhZiAtIFRvb2wgU2hvcCddLFxuICBsZWFmQXJtb3JTaG9wOiBbMHhjNCwgJ0xlYWYgLSBBcm1vciBTaG9wJ10sXG4gIGxlYWZTdHVkZW50SG91c2U6IFsweGM1LCAnTGVhZiAtIFN0dWRlbnQgSG91c2UnXSxcbiAgYnJ5bm1hZXJUYXZlcm46IFsweGM2LCAnQnJ5bm1hZXIgLSBUYXZlcm4nXSxcbiAgYnJ5bm1hZXJQYXduU2hvcDogWzB4YzcsICdCcnlubWFlciAtIFBhd24gU2hvcCddLFxuICBicnlubWFlcklubjogWzB4YzgsICdCcnlubWFlciAtIElubiddLFxuICBicnlubWFlckFybW9yU2hvcDogWzB4YzksICdCcnlubWFlciAtIEFybW9yIFNob3AnXSxcbiAgLy8gSU5WQUxJRDogMHhjYVxuICBicnlubWFlckl0ZW1TaG9wOiBbMHhjYiwgJ0JyeW5tYWVyIC0gSXRlbSBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4Y2NcbiAgb2FrRWxkZXJIb3VzZTogWzB4Y2QsICdPYWsgLSBFbGRlciBIb3VzZSddLFxuICBvYWtNb3RoZXJIb3VzZTogWzB4Y2UsICdPYWsgLSBNb3RoZXIgSG91c2UnXSxcbiAgb2FrVG9vbFNob3A6IFsweGNmLCAnT2FrIC0gVG9vbCBTaG9wJ10sXG4gIG9ha0lubjogWzB4ZDAsICdPYWsgLSBJbm4nXSxcbiAgYW1hem9uZXNJbm46IFsweGQxLCAnQW1hem9uZXMgLSBJbm4nXSxcbiAgYW1hem9uZXNJdGVtU2hvcDogWzB4ZDIsICdBbWF6b25lcyAtIEl0ZW0gU2hvcCddLFxuICBhbWF6b25lc0FybW9yU2hvcDogWzB4ZDMsICdBbWF6b25lcyAtIEFybW9yIFNob3AnXSxcbiAgYW1hem9uZXNFbGRlcjogWzB4ZDQsICdBbWF6b25lcyAtIEVsZGVyJ10sXG4gIG5hZGFyZTogWzB4ZDUsICdOYWRhcmUnXSxcbiAgcG9ydG9hRmlzaGVybWFuSG91c2U6IFsweGQ2LCAnUG9ydG9hIC0gRmlzaGVybWFuIEhvdXNlJ10sXG4gIHBvcnRvYVBhbGFjZUVudHJhbmNlOiBbMHhkNywgJ1BvcnRvYSAtIFBhbGFjZSBFbnRyYW5jZSddLFxuICBwb3J0b2FGb3J0dW5lVGVsbGVyOiBbMHhkOCwgJ1BvcnRvYSAtIEZvcnR1bmUgVGVsbGVyJ10sXG4gIHBvcnRvYVBhd25TaG9wOiBbMHhkOSwgJ1BvcnRvYSAtIFBhd24gU2hvcCddLFxuICBwb3J0b2FBcm1vclNob3A6IFsweGRhLCAnUG9ydG9hIC0gQXJtb3IgU2hvcCddLFxuICAvLyBJTlZBTElEOiAweGRiXG4gIHBvcnRvYUlubjogWzB4ZGMsICdQb3J0b2EgLSBJbm4nXSxcbiAgcG9ydG9hVG9vbFNob3A6IFsweGRkLCAnUG9ydG9hIC0gVG9vbCBTaG9wJ10sXG4gIHBvcnRvYVBhbGFjZUxlZnQ6IFsweGRlLCAnUG9ydG9hIC0gUGFsYWNlIExlZnQnXSxcbiAgcG9ydG9hUGFsYWNlVGhyb25lUm9vbTogWzB4ZGYsICdQb3J0b2EgLSBQYWxhY2UgVGhyb25lIFJvb20nXSxcbiAgcG9ydG9hUGFsYWNlUmlnaHQ6IFsweGUwLCAnUG9ydG9hIC0gUGFsYWNlIFJpZ2h0J10sXG4gIHBvcnRvYUFzaW5hUm9vbTogWzB4ZTEsICdQb3J0b2EgLSBBc2luYSBSb29tJ10sXG4gIGFtYXpvbmVzRWxkZXJEb3duc3RhaXJzOiBbMHhlMiwgJ0FtYXpvbmVzIC0gRWxkZXIgRG93bnN0YWlycyddLFxuICBqb2VsRWxkZXJIb3VzZTogWzB4ZTMsICdKb2VsIC0gRWxkZXIgSG91c2UnXSxcbiAgam9lbFNoZWQ6IFsweGU0LCAnSm9lbCAtIFNoZWQnXSxcbiAgam9lbFRvb2xTaG9wOiBbMHhlNSwgJ0pvZWwgLSBUb29sIFNob3AnXSxcbiAgLy8gSU5WQUxJRDogMHhlNlxuICBqb2VsSW5uOiBbMHhlNywgJ0pvZWwgLSBJbm4nXSxcbiAgem9tYmllVG93bkhvdXNlOiBbMHhlOCwgJ1pvbWJpZSBUb3duIC0gSG91c2UnXSxcbiAgem9tYmllVG93bkhvdXNlQmFzZW1lbnQ6IFsweGU5LCAnWm9tYmllIFRvd24gLSBIb3VzZSBCYXNlbWVudCddLFxuICAvLyBJTlZBTElEOiAweGVhXG4gIHN3YW5Ub29sU2hvcDogWzB4ZWIsICdTd2FuIC0gVG9vbCBTaG9wJ10sXG4gIHN3YW5TdG9tSHV0OiBbMHhlYywgJ1N3YW4gLSBTdG9tIEh1dCddLFxuICBzd2FuSW5uOiBbMHhlZCwgJ1N3YW4gLSBJbm4nXSxcbiAgc3dhbkFybW9yU2hvcDogWzB4ZWUsICdTd2FuIC0gQXJtb3IgU2hvcCddLFxuICBzd2FuVGF2ZXJuOiBbMHhlZiwgJ1N3YW4gLSBUYXZlcm4nXSxcbiAgc3dhblBhd25TaG9wOiBbMHhmMCwgJ1N3YW4gLSBQYXduIFNob3AnXSxcbiAgc3dhbkRhbmNlSGFsbDogWzB4ZjEsICdTd2FuIC0gRGFuY2UgSGFsbCddLFxuICBzaHlyb25Gb3J0cmVzczogWzB4ZjIsICdTaHlyb24gLSBGb3J0cmVzcyddLFxuICBzaHlyb25UcmFpbmluZ0hhbGw6IFsweGYzLCAnU2h5cm9uIC0gVHJhaW5pbmcgSGFsbCddLFxuICBzaHlyb25Ib3NwaXRhbDogWzB4ZjQsICdTaHlyb24gLSBIb3NwaXRhbCddLFxuICBzaHlyb25Bcm1vclNob3A6IFsweGY1LCAnU2h5cm9uIC0gQXJtb3IgU2hvcCddLFxuICBzaHlyb25Ub29sU2hvcDogWzB4ZjYsICdTaHlyb24gLSBUb29sIFNob3AnXSxcbiAgc2h5cm9uSW5uOiBbMHhmNywgJ1NoeXJvbiAtIElubiddLFxuICBzYWhhcmFJbm46IFsweGY4LCAnU2FoYXJhIC0gSW5uJ10sXG4gIHNhaGFyYVRvb2xTaG9wOiBbMHhmOSwgJ1NhaGFyYSAtIFRvb2wgU2hvcCddLFxuICBzYWhhcmFFbGRlckhvdXNlOiBbMHhmYSwgJ1NhaGFyYSAtIEVsZGVyIEhvdXNlJ10sXG4gIHNhaGFyYVBhd25TaG9wOiBbMHhmYiwgJ1NhaGFyYSAtIFBhd24gU2hvcCddLFxufSBhcyBjb25zdDtcbi8vIHR5cGUgTG9jYXRpb25zID0gdHlwZW9mIExPQ0FUSU9OUztcblxuLy8gTk9URTogdGhpcyB3b3JrcyB0byBjb25zdHJhaW4gdGhlIGtleXMgdG8gZXhhY3RseSB0aGUgc2FtZS5cbi8vIGNvbnN0IHg6IHtyZWFkb25seSBbVCBpbiBrZXlvZiB0eXBlb2YgTE9DQVRJT05TXT86IHN0cmluZ30gPSB7fTtcblxuLy8gTk9URTogdGhlIGZvbGxvd2luZyBhbGxvd3MgcHJldHR5IHJvYnVzdCBjaGVja3MhXG4vLyBjb25zdCB4ID0gY2hlY2s8S2V5c09mPExvY2F0aW9ucywgc3RyaW5nIHwgYm9vbGVhbj4+KCkoe1xuLy8gICBsZWFmOiAneCcsXG4vLyAgIHN3YW46IHRydWUsXG4vLyB9KTtcbi8vIGNvbnN0IHkgPSBjaGVjazxLZXlzT2Y8dHlwZW9mIHgsIG51bWJlciwgc3RyaW5nPj4oKSh7XG4vLyAgIHN3YW46IDEsXG4vLyB9KTtcblxuLy8gdHlwZSBLZXlzT2Y8VCwgViA9IHVua25vd24sIFIgPSB1bmtub3duPiA9IHtbSyBpbiBrZXlvZiBUXT86IFRbS10gZXh0ZW5kcyBSID8gViA6IG5ldmVyfTtcblxuLy8gZnVuY3Rpb24gY2hlY2s8VD4oKTogPFUgZXh0ZW5kcyBUPihhcmc6IFUpID0+IFUge1xuLy8gICByZXR1cm4gYXJnID0+IGFyZztcbi8vIH1cblxuY29uc3QgbG9jYXRpb25OYW1lczogKHN0cmluZyB8IHVuZGVmaW5lZClbXSA9ICgoKSA9PiB7XG4gIGNvbnN0IG5hbWVzID0gW107XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKExPQ0FUSU9OUykpIHtcbiAgICBjb25zdCBbaWQsIG5hbWVdID0gKExPQ0FUSU9OUyBhcyBhbnkpW2tleV07XG4gICAgbmFtZXNbaWRdID0gbmFtZTtcbiAgfVxuICByZXR1cm4gbmFtZXM7XG59KSgpO1xuXG5jb25zdCBsb2NhdGlvbktleXM6IChrZXlvZiB0eXBlb2YgTE9DQVRJT05TIHwgdW5kZWZpbmVkKVtdID0gKCgpID0+IHtcbiAgY29uc3Qga2V5cyA9IFtdO1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhMT0NBVElPTlMpKSB7XG4gICAgY29uc3QgW2lkXSA9IChMT0NBVElPTlMgYXMgYW55KVtrZXldO1xuICAgIGtleXNbaWRdID0ga2V5O1xuICB9XG4gIHJldHVybiBrZXlzIGFzIGFueTtcbn0pKCk7XG5cblxuLy8gYnVpbGRpbmcgdGhlIENTViBmb3IgdGhlIGxvY2F0aW9uIHRhYmxlLlxuLy9jb25zdCBoPSh4KT0+eD09bnVsbD8nbnVsbCc6JyQnK3gudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCk7XG4vLydpZCxuYW1lLGJnbSx3aWR0aCxoZWlnaHQsYW5pbWF0aW9uLGV4dGVuZGVkLHRpbGVwYXQwLHRpbGVwYXQxLHRpbGVwYWwwLHRpbGVwYWwxLHRpbGVzZXQsdGlsZSBlZmZlY3RzLGV4aXRzLHNwcnBhdDAsc3BycGF0MSxzcHJwYWwwLHNwcnBhbDEsb2JqMGQsb2JqMGUsb2JqMGYsb2JqMTAsb2JqMTEsb2JqMTIsb2JqMTMsb2JqMTQsb2JqMTUsb2JqMTYsb2JqMTcsb2JqMTgsb2JqMTksb2JqMWEsb2JqMWIsb2JqMWMsb2JqMWQsb2JqMWUsb2JqMWZcXG4nK3JvbS5sb2NhdGlvbnMubWFwKGw9PiFsfHwhbC51c2VkPycnOltoKGwuaWQpLGwubmFtZSxoKGwuYmdtKSxsLmxheW91dFdpZHRoLGwubGF5b3V0SGVpZ2h0LGwuYW5pbWF0aW9uLGwuZXh0ZW5kZWQsaCgobC50aWxlUGF0dGVybnN8fFtdKVswXSksaCgobC50aWxlUGF0dGVybnN8fFtdKVsxXSksaCgobC50aWxlUGFsZXR0ZXN8fFtdKVswXSksaCgobC50aWxlUGFsZXR0ZXN8fFtdKVsxXSksaChsLnRpbGVzZXQpLGgobC50aWxlRWZmZWN0cyksWy4uLm5ldyBTZXQobC5leGl0cy5tYXAoeD0+aCh4WzJdKSkpXS5qb2luKCc6JyksaCgobC5zcHJpdGVQYXR0ZXJuc3x8W10pWzBdKSxoKChsLnNwcml0ZVBhdHRlcm5zfHxbXSlbMV0pLGgoKGwuc3ByaXRlUGFsZXR0ZXN8fFtdKVswXSksaCgobC5zcHJpdGVQYWxldHRlc3x8W10pWzFdKSwuLi5uZXcgQXJyYXkoMTkpLmZpbGwoMCkubWFwKCh2LGkpPT4oKGwub2JqZWN0c3x8W10pW2ldfHxbXSkuc2xpY2UoMikubWFwKHg9PngudG9TdHJpbmcoMTYpKS5qb2luKCc6JykpXSkuZmlsdGVyKHg9PngpLmpvaW4oJ1xcbicpXG5cbi8vIGJ1aWxkaW5nIGNzdiBmb3IgbG9jLW9iaiBjcm9zcy1yZWZlcmVuY2UgdGFibGVcbi8vIHNlcT0ocyxlLGYpPT5uZXcgQXJyYXkoZS1zKS5maWxsKDApLm1hcCgoeCxpKT0+ZihpK3MpKTtcbi8vIHVuaXE9KGFycik9Pntcbi8vICAgY29uc3QgbT17fTtcbi8vICAgZm9yIChsZXQgbyBvZiBhcnIpIHtcbi8vICAgICBvWzZdPW9bNV0/MTowO1xuLy8gICAgIGlmKCFvWzVdKW1bb1syXV09KG1bb1syXV18fDApKzE7XG4vLyAgIH1cbi8vICAgZm9yIChsZXQgbyBvZiBhcnIpIHtcbi8vICAgICBpZihvWzJdIGluIG0pb1s2XT1tW29bMl1dO1xuLy8gICAgIGRlbGV0ZSBtW29bMl1dO1xuLy8gICB9XG4vLyAgIHJldHVybiBhcnI7XG4vLyB9XG4vLyAnbG9jLGxvY25hbWUsbW9uLG1vbm5hbWUsc3Bhd24sdHlwZSx1bmlxLHBhdHNsb3QscGF0LHBhbHNsb3QscGFsMixwYWwzXFxuJytcbi8vIHJvbS5sb2NhdGlvbnMuZmxhdE1hcChsPT4hbHx8IWwudXNlZD9bXTp1bmlxKHNlcSgweGQsMHgyMCxzPT57XG4vLyAgIGNvbnN0IG89KGwub2JqZWN0c3x8W10pW3MtMHhkXXx8bnVsbDtcbi8vICAgaWYgKCFvKSByZXR1cm4gbnVsbDtcbi8vICAgY29uc3QgdHlwZT1vWzJdJjc7XG4vLyAgIGNvbnN0IG09dHlwZT9udWxsOjB4NTArb1szXTtcbi8vICAgY29uc3QgcGF0U2xvdD1vWzJdJjB4ODA/MTowO1xuLy8gICBjb25zdCBtb249bT9yb20ub2JqZWN0c1ttXTpudWxsO1xuLy8gICBjb25zdCBwYWxTbG90PShtb24/bW9uLnBhbGV0dGVzKGZhbHNlKTpbXSlbMF07XG4vLyAgIGNvbnN0IGFsbFBhbD1uZXcgU2V0KG1vbj9tb24ucGFsZXR0ZXModHJ1ZSk6W10pO1xuLy8gICByZXR1cm4gW2gobC5pZCksbC5uYW1lLGgobSksJycsaChzKSx0eXBlLDAscGF0U2xvdCxtP2goKGwuc3ByaXRlUGF0dGVybnN8fFtdKVtwYXRTbG90XSk6JycscGFsU2xvdCxhbGxQYWwuaGFzKDIpP2goKGwuc3ByaXRlUGFsZXR0ZXN8fFtdKVswXSk6JycsYWxsUGFsLmhhcygzKT9oKChsLnNwcml0ZVBhbGV0dGVzfHxbXSlbMV0pOicnXTtcbi8vIH0pLmZpbHRlcih4PT54KSkpLm1hcChhPT5hLmpvaW4oJywnKSkuZmlsdGVyKHg9PngpLmpvaW4oJ1xcbicpO1xuXG4vKipcbiAqIExvY2F0aW9ucyB3aXRoIGNhdmUgc3lzdGVtcyB0aGF0IHNob3VsZCBhbGwgYmUgdHJlYXRlZCBhcyBuZWlnaGJvcmluZy5cbiAqL1xuY29uc3QgTkVYVVNFUzoge1tUIGluIGtleW9mIHR5cGVvZiBMT0NBVElPTlNdPzogdHJ1ZX0gPSB7XG4gIG10U2FicmVXZXN0TG93ZXI6IHRydWUsXG4gIG10U2FicmVXZXN0VXBwZXI6IHRydWUsXG4gIG10U2FicmVOb3J0aE1haW46IHRydWUsXG4gIG10U2FicmVOb3J0aE1pZGRsZTogdHJ1ZSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTE6IHRydWUsXG4gIG10U2FicmVOb3J0aENhdmUyOiB0cnVlLFxuICBtdEh5ZHJhOiB0cnVlLFxuICBtdEh5ZHJhT3V0c2lkZVNoeXJvbjogdHJ1ZSxcbiAgbXRIeWRyYUNhdmUxOiB0cnVlLFxufTtcblxuY29uc3QgQk9TU19TQ1JFRU5TOiB7W1QgaW4ga2V5b2YgdHlwZW9mIExPQ0FUSU9OU10/OiBudW1iZXJ9ID0ge1xuICBzZWFsZWRDYXZlNzogMHg5MSxcbiAgc3dhbXA6IDB4N2MsXG4gIG10U2FicmVOb3J0aE1haW46IDB4YjUsXG4gIHNhYmVyYVBhbGFjZTE6IDB4ZmQsXG4gIHNhYmVyYVBhbGFjZTM6IDB4ZmQsXG4gIHNoeXJvbkZvcnRyZXNzOiAweDcwLFxuICBnb2FGb3J0cmVzc0tlbGJlc3F1ZTogMHg3MyxcbiAgZ29hRm9ydHJlc3NUb3JuZWw6IDB4OTEsXG4gIGdvYUZvcnRyZXNzQXNpbmE6IDB4OTEsXG4gIGdvYUZvcnRyZXNzS2FybWluZTc6IDB4ZmQsXG4gIHB5cmFtaWREcmF5Z29uOiAweGY5LFxuICBjcnlwdERyYXlnb24yOiAweGZhLFxuICB0b3dlckR5bmE6IDB4NWMsXG59O1xuIl19