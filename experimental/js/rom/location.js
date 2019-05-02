import { Entity } from './entity.js';
import { DataTuple, addr, concatIterables, group, hex, seq, slice, tuple, varSlice, writeLittleEndian } from './util.js';
export class Location extends Entity {
    constructor(rom, id) {
        super(rom, id);
        const locationData = LOCATIONS[id] || { name: '' };
        this.mapDataPointer = 0x14300 + (id << 1);
        this.mapDataBase = addr(rom.prg, this.mapDataPointer, 0xc000);
        this.name = locationData.name || '';
        this.used = this.mapDataBase > 0xc000 && !!this.name;
        this.layoutBase = addr(rom.prg, this.mapDataBase, 0xc000);
        this.graphicsBase = addr(rom.prg, this.mapDataBase + 2, 0xc000);
        this.entrancesBase = addr(rom.prg, this.mapDataBase + 4, 0xc000);
        this.exitsBase = addr(rom.prg, this.mapDataBase + 6, 0xc000);
        this.flagsBase = addr(rom.prg, this.mapDataBase + 8, 0xc000);
        this.pitsBase = this.layoutBase === this.mapDataBase + 10 ? 0 :
            addr(rom.prg, this.mapDataBase + 10, 0xc000);
        this.bgm = rom.prg[this.layoutBase];
        this.layoutWidth = rom.prg[this.layoutBase + 1];
        this.layoutHeight = rom.prg[this.layoutBase + 2];
        this.animation = rom.prg[this.layoutBase + 3];
        this.extended = rom.prg[this.layoutBase + 4];
        this.screens = seq(this.height, y => tuple(rom.prg, this.layoutBase + 5 + y * this.width, this.width));
        for (const [x, y, replacement] of locationData.replace || []) {
            this.screens[y][x] = replacement;
        }
        this.tilePalettes = tuple(rom.prg, this.graphicsBase, 3);
        this.tileset = rom.prg[this.graphicsBase + 3];
        this.tileEffects = rom.prg[this.graphicsBase + 4];
        this.tilePatterns = slice(rom.prg, this.graphicsBase + 5, 2);
        this.entrances =
            group(4, rom.prg.slice(this.entrancesBase, this.exitsBase), x => new Entrance(x));
        this.exits = varSlice(rom.prg, this.exitsBase, 4, 0xff, this.flagsBase, x => new Exit(x));
        this.flags = varSlice(rom.prg, this.flagsBase, 2, 0xff, Infinity, x => new Flag(x));
        this.pits = this.pitsBase ? varSlice(rom.prg, this.pitsBase, 4, 0xff, Infinity, x => new Pit(x)) : [];
        this.npcDataPointer = 0x19201 + (id << 1);
        this.npcDataBase = addr(rom.prg, this.npcDataPointer, 0x10000);
        this.hasSpawns = this.npcDataBase !== 0x10000;
        this.spritePalettes =
            this.hasSpawns ? slice(rom.prg, this.npcDataBase + 1, 2) : [0, 0];
        this.spritePatterns =
            this.hasSpawns ? slice(rom.prg, this.npcDataBase + 3, 2) : [0, 0];
        this.spawns =
            this.hasSpawns ? varSlice(rom.prg, this.npcDataBase + 5, 4, 0xff, Infinity, x => new Spawn(x)) : [];
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
        const entrances = concatIterables(this.entrances);
        const exits = [...concatIterables(this.exits), 0xff];
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
}
export const Entrance = DataTuple.make(4, {
    x: DataTuple.prop([0], [1, 0xff, -8]),
    y: DataTuple.prop([2], [3, 0xff, -8]),
    toString() {
        return `Entrance ${this.hex()}: (${hex(this.x)}, ${hex(this.y)})`;
    },
});
export const Exit = DataTuple.make(4, {
    x: DataTuple.prop([0, 0xff, -4]),
    xt: DataTuple.prop([0]),
    y: DataTuple.prop([1, 0xff, -4]),
    yt: DataTuple.prop([1]),
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
    patternBank: DataTuple.prop([2, 0x80, 7]),
    type: DataTuple.prop([2, 0x07]),
    id: DataTuple.prop([3]),
    monsterId: { get() { return (this.id + 0x50) & 0xff; },
        set(id) { this.id = (id - 0x50) & 0xff; } },
    isChest() { return this.type === 2 && this.id < 0x80; },
    isTrigger() { return this.type === 2 && this.id >= 0x80; },
    isMonster() { return this.type === 0; },
    toString() {
        return `Spawn ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) ${this.timed ? 'timed' : 'fixed'} ${this.type}:${hex(this.id)}`;
    },
});
export const LOCATIONS = (() => {
    const locs = [];
    function loc(index, name, { replace } = {}) {
        const data = { name };
        if (replace)
            data.replace = replace;
        locs[index] = data;
    }
    loc(0x00, 'Mezame Shrine');
    loc(0x01, 'Leaf - Outside Start');
    loc(0x02, 'Leaf');
    loc(0x03, 'Valley of Wind');
    loc(0x04, 'Sealed Cave 1');
    loc(0x05, 'Sealed Cave 2');
    loc(0x06, 'Sealed Cave 6');
    loc(0x07, 'Sealed Cave 4');
    loc(0x08, 'Sealed Cave 5');
    loc(0x09, 'Sealed Cave 3');
    loc(0x0a, 'Sealed Cave 7');
    loc(0x0c, 'Sealed Cave 8');
    loc(0x0e, 'Windmill Cave');
    loc(0x0f, 'Windmill');
    loc(0x10, 'Zebu Cave');
    loc(0x11, 'Mt Sabre West - Cave 1');
    loc(0x14, 'Cordel Plains West');
    loc(0x15, 'Cordel Plains East');
    loc(0x18, 'Brynmaer');
    loc(0x19, 'Outside Stom House');
    loc(0x1a, 'Swamp');
    loc(0x1b, 'Amazones');
    loc(0x1c, 'Oak');
    loc(0x1e, 'Stom House');
    loc(0x20, 'Mt Sabre West - Lower');
    loc(0x21, 'Mt Sabre West - Upper');
    loc(0x22, 'Mt Sabre West - Cave 2');
    loc(0x23, 'Mt Sabre West - Cave 3');
    loc(0x24, 'Mt Sabre West - Cave 4', { replace: [[3, 4, 0x80]] });
    loc(0x25, 'Mt Sabre West - Cave 5');
    loc(0x26, 'Mt Sabre West - Cave 6');
    loc(0x27, 'Mt Sabre West - Cave 7');
    loc(0x28, 'Mt Sabre North - Main');
    loc(0x29, 'Mt Sabre North - Middle');
    loc(0x2a, 'Mt Sabre North - Cave 2');
    loc(0x2b, 'Mt Sabre North - Cave 3');
    loc(0x2c, 'Mt Sabre North - Cave 4');
    loc(0x2d, 'Mt Sabre North - Cave 5');
    loc(0x2e, 'Mt Sabre North - Cave 6');
    loc(0x2f, 'Mt Sabre North - Prison Hall');
    loc(0x30, 'Mt Sabre North - Left Cell');
    loc(0x31, 'Mt Sabre North - Left Cell 2');
    loc(0x32, 'Mt Sabre North - Right Cell');
    loc(0x33, 'Mt Sabre North - Cave 8');
    loc(0x34, 'Mt Sabre North - Cave 9');
    loc(0x35, 'Mt Sabre North - Summit Cave');
    loc(0x38, 'Mt Sabre North - Cave 1');
    loc(0x39, 'Mt Sabre North - Cave 7');
    loc(0x3c, 'Nadare - Inn');
    loc(0x3d, 'Nadare - Tool Shop');
    loc(0x3e, 'Nadare - Back Room');
    loc(0x40, 'Waterfall Valley North');
    loc(0x41, 'Waterfall Valley South');
    loc(0x42, 'Lime Tree Valley', { replace: [[0, 2, 0x00]] });
    loc(0x43, 'Lime Tree Lake');
    loc(0x44, 'Kirisa Plant Cave 1');
    loc(0x45, 'Kirisa Plant Cave 2');
    loc(0x46, 'Kirisa Plant Cave 3');
    loc(0x47, 'Kirisa Meadow');
    loc(0x48, 'Fog Lamp Cave 1');
    loc(0x49, 'Fog Lamp Cave 2');
    loc(0x4a, 'Fog Lamp Cave 3');
    loc(0x4b, 'Fog Lamp Cave Dead End');
    loc(0x4c, 'Fog Lamp Cave 4');
    loc(0x4d, 'Fog Lamp Cave 5');
    loc(0x4e, 'Fog Lamp Cave 6');
    loc(0x4f, 'Fog Lamp Cave 7');
    loc(0x50, 'Portoa');
    loc(0x51, 'Portoa - Fisherman Island');
    loc(0x52, 'Mesia Shrine');
    loc(0x54, 'Waterfall Cave 1');
    loc(0x55, 'Waterfall Cave 2');
    loc(0x56, 'Waterfall Cave 3');
    loc(0x57, 'Waterfall Cave 4');
    loc(0x58, 'Tower - Entrance');
    loc(0x59, 'Tower 1');
    loc(0x5a, 'Tower 2');
    loc(0x5b, 'Tower 3');
    loc(0x5c, 'Tower - Outside Mesia');
    loc(0x5d, 'Tower - Outside Dyna');
    loc(0x5e, 'Tower - Mesia');
    loc(0x5f, 'Tower - Dyna');
    loc(0x60, 'Angry Sea');
    loc(0x61, 'Boat House');
    loc(0x62, 'Joel - Lighthouse');
    loc(0x64, 'Underground Channel');
    loc(0x65, 'Zombie Town');
    loc(0x68, 'Evil Spirit Island 1');
    loc(0x69, 'Evil Spirit Island 2');
    loc(0x6a, 'Evil Spirit Island 3');
    loc(0x6b, 'Evil Spirit Island 4');
    loc(0x6c, 'Sabera Palace 1');
    loc(0x6d, 'Sabera Palace 2');
    loc(0x6e, 'Sabera Palace 3');
    loc(0x70, 'Joel - Secret Passage');
    loc(0x71, 'Joel');
    loc(0x72, 'Swan');
    loc(0x73, 'Swan - Gate');
    loc(0x78, 'Goa Valley');
    loc(0x7c, 'Mt Hydra');
    loc(0x7d, 'Mt Hydra - Cave 1');
    loc(0x7e, 'Mt Hydra - Outside Shyron');
    loc(0x7f, 'Mt Hydra - Cave 2');
    loc(0x80, 'Mt Hydra - Cave 3');
    loc(0x81, 'Mt Hydra - Cave 4');
    loc(0x82, 'Mt Hydra - Cave 5');
    loc(0x83, 'Mt Hydra - Cave 6');
    loc(0x84, 'Mt Hydra - Cave 7');
    loc(0x85, 'Mt Hydra - Cave 8');
    loc(0x86, 'Mt Hydra - Cave 9');
    loc(0x87, 'Mt Hydra - Cave 10');
    loc(0x88, 'Styx 1');
    loc(0x89, 'Styx 2');
    loc(0x8a, 'Styx 3');
    loc(0x8c, 'Shyron');
    loc(0x8e, 'Goa');
    loc(0x8f, 'Goa Fortress - Oasis Entrance');
    loc(0x90, 'Desert 1');
    loc(0x91, 'Oasis Cave - Main', { replace: [
            [0, 11, 0x80], [1, 11, 0x80], [2, 11, 0x80], [3, 11, 0x80],
            [4, 11, 0x80], [5, 11, 0x80], [6, 11, 0x80], [7, 11, 0x80]
        ] });
    loc(0x92, 'Desert Cave 1');
    loc(0x93, 'Sahara');
    loc(0x94, 'Sahara - Outside Cave');
    loc(0x95, 'Desert Cave 2');
    loc(0x96, 'Sahara Meadow');
    loc(0x98, 'Desert 2');
    loc(0x9c, 'Pyramid Front - Entrance');
    loc(0x9d, 'Pyramid Front - Branch');
    loc(0x9e, 'Pyramid Front - Main');
    loc(0x9f, 'Pyramid Front - Draygon');
    loc(0xa0, 'Pyramid Back - Entrance');
    loc(0xa1, 'Pyramid Back - Hall 1');
    loc(0xa2, 'Pyramid Back - Branch');
    loc(0xa3, 'Pyramid Back - Dead End Left');
    loc(0xa4, 'Pyramid Back - Dead End Right');
    loc(0xa5, 'Pyramid Back - Hall 2');
    loc(0xa6, 'Pyramid Back - Draygon Revisited');
    loc(0xa7, 'Pyramid Back - Teleporter');
    loc(0xa8, 'Goa Fortress - Entrance');
    loc(0xa9, 'Goa Fortress - Kelbesque');
    loc(0xaa, 'Goa Fortress - Zebu');
    loc(0xab, 'Goa Fortress - Sabera');
    loc(0xac, 'Goa Fortress - Tornel');
    loc(0xad, 'Goa Fortress - Mado 1');
    loc(0xae, 'Goa Fortress - Mado 2');
    loc(0xaf, 'Goa Fortress - Mado 3');
    loc(0xb0, 'Goa Fortress - Karmine 1');
    loc(0xb1, 'Goa Fortress - Karmine 2');
    loc(0xb2, 'Goa Fortress - Karmine 3');
    loc(0xb3, 'Goa Fortress - Karmine 4');
    loc(0xb4, 'Goa Fortress - Karmine 5');
    loc(0xb5, 'Goa Fortress - Karmine 6');
    loc(0xb6, 'Goa Fortress - Karmine 7');
    loc(0xb7, 'Goa Fortress - Exit');
    loc(0xb8, 'Oasis Cave - Entrance');
    loc(0xb9, 'Goa Fortress - Asina');
    loc(0xba, 'Goa Fortress - Kensu');
    loc(0xbb, 'Goa - House');
    loc(0xbc, 'Goa - Inn');
    loc(0xbe, 'Goa - Tool Shop');
    loc(0xbf, 'Goa - Tavern');
    loc(0xc0, 'Leaf - Elder House');
    loc(0xc1, 'Leaf - Rabbit Hut');
    loc(0xc2, 'Leaf - Inn');
    loc(0xc3, 'Leaf - Tool Shop');
    loc(0xc4, 'Leaf - Armor Shop');
    loc(0xc5, 'Leaf - Student House');
    loc(0xc6, 'Brynmaer - Tavern');
    loc(0xc7, 'Brynmaer - Pawn Shop');
    loc(0xc8, 'Brynmaer - Inn');
    loc(0xc9, 'Brynmaer - Armor Shop');
    loc(0xcb, 'Brynmaer - Item Shop');
    loc(0xcd, 'Oak - Elder House');
    loc(0xce, 'Oak - Mother House');
    loc(0xcf, 'Oak - Tool Shop');
    loc(0xd0, 'Oak - Inn');
    loc(0xd1, 'Amazones - Inn');
    loc(0xd2, 'Amazones - Item Shop');
    loc(0xd3, 'Amazones - Armor Shop');
    loc(0xd4, 'Amazones - Elder');
    loc(0xd5, 'Nadare');
    loc(0xd6, 'Portoa - Fisherman House');
    loc(0xd7, 'Portoa - Palace Entrance');
    loc(0xd8, 'Portoa - Fortune Teller');
    loc(0xd9, 'Portoa - Pawn Shop');
    loc(0xda, 'Portoa - Armor Shop');
    loc(0xdc, 'Portoa - Inn');
    loc(0xdd, 'Portoa - Tool Shop');
    loc(0xde, 'Portoa - Palace Left');
    loc(0xdf, 'Portoa - Palace Throne Room');
    loc(0xe0, 'Portoa - Palace Right');
    loc(0xe1, 'Portoa - Asina Room');
    loc(0xe2, 'Amazones - Elder Downstairs');
    loc(0xe3, 'Joel - Elder House');
    loc(0xe4, 'Joel - Shed');
    loc(0xe5, 'Joel - Tool Shop');
    loc(0xe7, 'Joel - Inn');
    loc(0xe8, 'Zombie Town - House');
    loc(0xe9, 'Zombie Town - House Basement');
    loc(0xeb, 'Swan - Tool Shop');
    loc(0xec, 'Swan - Stom Hut');
    loc(0xed, 'Swan - Inn');
    loc(0xee, 'Swan - Armor Shop');
    loc(0xef, 'Swan - Tavern');
    loc(0xf0, 'Swan - Pawn Shop');
    loc(0xf1, 'Swan - Dance Hall');
    loc(0xf2, 'Shyron - Fortress');
    loc(0xf3, 'Shyron - Training Hall');
    loc(0xf4, 'Shyron - Hospital');
    loc(0xf5, 'Shyron - Armor Shop');
    loc(0xf6, 'Shyron - Tool Shop');
    loc(0xf7, 'Shyron - Inn');
    loc(0xf8, 'Sahara - Inn');
    loc(0xf9, 'Sahara - Tool Shop');
    loc(0xfa, 'Sahara - Elder House');
    loc(0xfb, 'Sahara - Pawn Shop');
    return locs;
})();
//# sourceMappingURL=location.js.map