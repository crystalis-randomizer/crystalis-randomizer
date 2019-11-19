import { Areas } from './area.js';
import { Entity } from './entity.js';
import { DataTuple, concatIterables, group, hex, initializer, readLittleEndian, seq, tuple, varSlice, writeLittleEndian, upperCamelToSpaces } from './util.js';
import { UnionFind } from '../unionfind.js';
import { assertNever, iters, DefaultMap } from '../util.js';
const CAVE = {
    subArea: 'cave',
    music: (area) => `${area.name}-Cave`,
    palette: (area) => `${area.name}-Cave`,
};
const HOUSE = {
    subArea: 'house',
    palette: () => Symbol(),
};
const FORTUNE_TELLER = {
    subArea: 'house',
    palette: () => Symbol(),
    music: (area) => `${area.name}-FortuneTeller`,
};
const MESIA = {
    name: 'mesia',
    music: (area) => `${area.name}-Mesia`,
    palette: (area) => area.name === 'Tower' ?
        area.name : `${area.name}-Mesia`,
};
const DYNA = {
    name: 'dyna',
    music: (area) => `${area.name}-Dyna`,
    palette: (area) => `${area.name}-Dyna`,
};
const KELBESQUE = {
    name: 'goa 1',
    music: 'goa 1',
    palette: 'goa 1',
};
const SABERA = {
    name: 'goa 2',
    music: 'goa 2',
    palette: 'goa 2',
};
const MADO_LOWER = {
    name: 'goa 3',
    music: 'goa 3',
    palette: 'goa 3',
};
const MADO_UPPER = { ...MADO_LOWER, palette: 'goa 3 upper' };
const KARMINE_UPPER = {
    name: 'goa 4',
    music: 'goa 4',
    palette: 'goa 4',
};
const KARMINE_LOWER = { ...KARMINE_UPPER, palette: 'goa 4 lower' };
const $ = (() => {
    const $ = initializer();
    let area;
    function $$(id, data = {}) {
        data = { ...data };
        area = data.area = data.area || area;
        return $(id, data);
    }
    ;
    $$.commit = (locations) => {
        $.commit(locations, (prop, id, init) => {
            const name = upperCamelToSpaces(prop);
            const area = init.area;
            const music = typeof init.music === 'function' ?
                init.music(area) : init.music != null ?
                init.music : area.name;
            const palette = typeof init.palette === 'function' ?
                init.palette(area) : init.palette || area.name;
            const data = { area, name, music, palette };
            if (init.subArea != null)
                data.subArea = init.subArea;
            if (init.bossScreen != null)
                data.bossScreen = init.bossScreen;
            const location = new Location(locations.rom, id, data);
            if (id >= 0)
                locations[id] = location;
            return location;
        });
    };
    return $$;
})();
export class Locations extends Array {
    constructor(rom) {
        super(0x100);
        this.rom = rom;
        this.MezameShrine = $(0x00, { area: Areas.Mezame });
        this.Leaf_OutsideStart = $(0x01, { music: 1 });
        this.Leaf = $(0x02, { area: Areas.Leaf });
        this.ValleyOfWind = $(0x03, { area: Areas.ValleyOfWind });
        this.SealedCave1 = $(0x04, { area: Areas.SealedCave });
        this.SealedCave2 = $(0x05);
        this.SealedCave6 = $(0x06);
        this.SealedCave4 = $(0x07);
        this.SealedCave5 = $(0x08);
        this.SealedCave3 = $(0x09);
        this.SealedCave7 = $(0x0a, { bossScreen: 0x91 });
        this.SealedCave8 = $(0x0c);
        this.WindmillCave = $(0x0e, { area: Areas.WindmillCave });
        this.Windmill = $(0x0f, { area: Areas.Windmill, music: 0 });
        this.ZebuCave = $(0x10, { area: Areas.ZebuCave });
        this.MtSabreWest_Cave1 = $(0x11, { area: Areas.MtSabreWest, ...CAVE });
        this.CordelPlainWest = $(0x14, { area: Areas.CordelPlain });
        this.CordelPlainEast = $(0x15);
        this.Brynmaer = $(0x18, { area: Areas.Brynmaer });
        this.OutsideStomHouse = $(0x19, { area: Areas.StomHouse,
            music: 0 });
        this.Swamp = $(0x1a, { area: Areas.Swamp,
            bossScreen: 0x7c });
        this.Amazones = $(0x1b, { area: Areas.Amazones });
        this.Oak = $(0x1c, { area: Areas.Oak });
        this.StomHouse = $(0x1e, { area: Areas.StomHouse });
        this.MtSabreWest_Lower = $(0x20, { area: Areas.MtSabreWest });
        this.MtSabreWest_Upper = $(0x21);
        this.MtSabreWest_Cave2 = $(0x22, CAVE);
        this.MtSabreWest_Cave3 = $(0x23, CAVE);
        this.MtSabreWest_Cave4 = $(0x24, CAVE);
        this.MtSabreWest_Cave5 = $(0x25, CAVE);
        this.MtSabreWest_Cave6 = $(0x26, CAVE);
        this.MtSabreWest_Cave7 = $(0x27, CAVE);
        this.MtSabreNorth_Main = $(0x28, { area: Areas.MtSabreNorth,
            bossScreen: 0xb5 });
        this.MtSabreNorth_Middle = $(0x29);
        this.MtSabreNorth_Cave2 = $(0x2a, CAVE);
        this.MtSabreNorth_Cave3 = $(0x2b, CAVE);
        this.MtSabreNorth_Cave4 = $(0x2c, CAVE);
        this.MtSabreNorth_Cave5 = $(0x2d, CAVE);
        this.MtSabreNorth_Cave6 = $(0x2e, CAVE);
        this.MtSabreNorth_PrisonHall = $(0x2f, CAVE);
        this.MtSabreNorth_LeftCell = $(0x30, CAVE);
        this.MtSabreNorth_LeftCell2 = $(0x31, CAVE);
        this.MtSabreNorth_RightCell = $(0x32, CAVE);
        this.MtSabreNorth_Cave8 = $(0x33, CAVE);
        this.MtSabreNorth_Cave9 = $(0x34, CAVE);
        this.MtSabreNorth_SummitCave = $(0x35, CAVE);
        this.MtSabreNorth_Cave1 = $(0x38, CAVE);
        this.MtSabreNorth_Cave7 = $(0x39, CAVE);
        this.Nadare_Inn = $(0x3c, { area: Areas.Nadare, ...HOUSE });
        this.Nadare_ToolShop = $(0x3d, HOUSE);
        this.Nadare_BackRoom = $(0x3e, HOUSE);
        this.WaterfallValleyNorth = $(0x40, { area: Areas.WaterfallValley });
        this.WaterfallValleySouth = $(0x41);
        this.LimeTreeValley = $(0x42, { area: Areas.LimeTreeValley,
            music: 0 });
        this.LimeTreeLake = $(0x43, { area: Areas.LimeTreeLake,
            music: 0 });
        this.KirisaPlantCave1 = $(0x44, { area: Areas.KirisaPlantCave });
        this.KirisaPlantCave2 = $(0x45);
        this.KirisaPlantCave3 = $(0x46);
        this.KirisaMeadow = $(0x47, { area: Areas.KirisaMeadow });
        this.FogLampCave1 = $(0x48, { area: Areas.FogLampCave });
        this.FogLampCave2 = $(0x49);
        this.FogLampCave3 = $(0x4a);
        this.FogLampCaveDeadEnd = $(0x4b);
        this.FogLampCave4 = $(0x4c);
        this.FogLampCave5 = $(0x4d);
        this.FogLampCave6 = $(0x4e);
        this.FogLampCave7 = $(0x4f);
        this.Portoa = $(0x50, { area: Areas.Portoa });
        this.Portoa_FishermanIsland = $(0x51, { area: Areas.FishermanHouse,
            music: 0 });
        this.MesiaShrine = $(0x52, { area: Areas.LimeTreeLake,
            ...MESIA });
        this.WaterfallCave1 = $(0x54, { area: Areas.WaterfallCave });
        this.WaterfallCave2 = $(0x55);
        this.WaterfallCave3 = $(0x56);
        this.WaterfallCave4 = $(0x57);
        this.TowerEntrance = $(0x58, { area: Areas.Tower });
        this.Tower1 = $(0x59);
        this.Tower2 = $(0x5a);
        this.Tower3 = $(0x5b);
        this.TowerOutsideMesia = $(0x5c);
        this.TowerOutsideDyna = $(0x5d);
        this.TowerMesia = $(0x5e, MESIA);
        this.TowerDyna = $(0x5f, DYNA);
        this.AngrySea = $(0x60, { area: Areas.AngrySea });
        this.BoatHouse = $(0x61);
        this.JoelLighthouse = $(0x62, { area: Areas.Lighthouse,
            music: 0 });
        this.UndergroundChannel = $(0x64, { area: Areas.UndergroundChannel });
        this.ZombieTown = $(0x65, { area: Areas.ZombieTown });
        this.EvilSpiritIsland1 = $(0x68, { area: Areas.EvilSpiritIslandEntrance,
            music: 1 });
        this.EvilSpiritIsland2 = $(0x69, { area: Areas.EvilSpiritIsland });
        this.EvilSpiritIsland3 = $(0x6a);
        this.EvilSpiritIsland4 = $(0x6b);
        this.SaberaPalace1 = $(0x6c, { area: Areas.SaberaFortress,
            bossScreen: 0xfd });
        this.SaberaPalace2 = $(0x6d);
        this.SaberaPalace3 = $(0x6e, { bossScreen: 0xfd });
        this.JoelSecretPassage = $(0x70, { area: Areas.JoelPassage });
        this.Joel = $(0x71, { area: Areas.Joel });
        this.Swan = $(0x72, { area: Areas.Swan, music: 1 });
        this.SwanGate = $(0x73, { area: Areas.SwanGate,
            music: 1 });
        this.GoaValley = $(0x78, { area: Areas.GoaValley });
        this.MtHydra = $(0x7c, { area: Areas.MtHydra });
        this.MtHydra_Cave1 = $(0x7d, CAVE);
        this.MtHydra_OutsideShyron = $(0x7e);
        this.MtHydra_Cave2 = $(0x7f, CAVE);
        this.MtHydra_Cave3 = $(0x80, CAVE);
        this.MtHydra_Cave4 = $(0x81, CAVE);
        this.MtHydra_Cave5 = $(0x82, CAVE);
        this.MtHydra_Cave6 = $(0x83, CAVE);
        this.MtHydra_Cave7 = $(0x84, CAVE);
        this.MtHydra_Cave8 = $(0x85, CAVE);
        this.MtHydra_Cave9 = $(0x86, CAVE);
        this.MtHydra_Cave10 = $(0x87, CAVE);
        this.Styx1 = $(0x88, { area: Areas.Styx });
        this.Styx2 = $(0x89);
        this.Styx3 = $(0x8a);
        this.Shyron = $(0x8c, { area: Areas.Shyron });
        this.Goa = $(0x8e, { area: Areas.Goa });
        this.GoaFortressBasement = $(0x8f, { area: Areas.FortressBasement,
            music: 0 });
        this.Desert1 = $(0x90, { area: Areas.Desert1 });
        this.OasisCaveMain = $(0x91, { area: Areas.OasisCave });
        this.DesertCave1 = $(0x92, { area: Areas.DesertCave1,
            music: 0 });
        this.Sahara = $(0x93, { area: Areas.Sahara });
        this.SaharaOutsideCave = $(0x94, { music: 0 });
        this.DesertCave2 = $(0x95, { area: Areas.DesertCave2, music: 1 });
        this.SaharaMeadow = $(0x96, { area: Areas.SaharaMeadow, music: 0 });
        this.Desert2 = $(0x98, { area: Areas.Desert2 });
        this.Pyramid_Entrance = $(0x9c, { area: Areas.Pyramid });
        this.Pyramid_Branch = $(0x9d);
        this.Pyramid_Main = $(0x9e);
        this.Pyramid_Draygon = $(0x9f);
        this.Crypt_Entrance = $(0xa0, { area: Areas.Crypt });
        this.Crypt_Hall1 = $(0xa1);
        this.Crypt_Branch = $(0xa2);
        this.Crypt_DeadEndLeft = $(0xa3);
        this.Crypt_DeadEndRight = $(0xa4);
        this.Crypt_Hall2 = $(0xa5);
        this.Crypt_Draygon2 = $(0xa6);
        this.Crypt_Teleporter = $(0xa7, { music: 'Crypt-Teleporter' });
        this.GoaFortress_Entrance = $(0xa8, { area: Areas.GoaFortress,
            music: KELBESQUE.music });
        this.GoaFortress_Kelbesque = $(0xa9, { bossScreen: 0x73,
            ...KELBESQUE });
        this.GoaFortress_Zebu = $(0xaa, { ...KELBESQUE,
            palette: SABERA.palette });
        this.GoaFortress_Sabera = $(0xab, SABERA);
        this.GoaFortress_Tornel = $(0xac, { bossScreen: 0x91,
            ...SABERA,
            palette: MADO_LOWER.palette });
        this.GoaFortress_Mado1 = $(0xad, MADO_LOWER);
        this.GoaFortress_Mado2 = $(0xae, MADO_UPPER);
        this.GoaFortress_Mado3 = $(0xaf, MADO_UPPER);
        this.GoaFortress_Karmine1 = $(0xb0, KARMINE_UPPER);
        this.GoaFortress_Karmine2 = $(0xb1, KARMINE_UPPER);
        this.GoaFortress_Karmine3 = $(0xb2, KARMINE_UPPER);
        this.GoaFortress_Karmine4 = $(0xb3, KARMINE_UPPER);
        this.GoaFortress_Karmine5 = $(0xb4, KARMINE_UPPER);
        this.GoaFortress_Karmine6 = $(0xb5, KARMINE_LOWER);
        this.GoaFortress_Karmine7 = $(0xb6, { bossScreen: 0xfd,
            ...KARMINE_LOWER });
        this.GoaFortress_Exit = $(0xb7, { music: KARMINE_UPPER.music });
        this.OasisCave_Entrance = $(0xb8, { area: Areas.OasisEntrance,
            music: 2 });
        this.GoaFortress_Asina = $(0xb9, { area: Areas.GoaFortress,
            ...MADO_UPPER,
            bossScreen: 0x91 });
        this.GoaFortress_Kensu = $(0xba, KARMINE_UPPER);
        this.Goa_House = $(0xbb, { area: Areas.Goa, ...HOUSE });
        this.Goa_Inn = $(0xbc, HOUSE);
        this.Goa_ToolShop = $(0xbe, HOUSE);
        this.Goa_Tavern = $(0xbf, HOUSE);
        this.Leaf_ElderHouse = $(0xc0, { area: Areas.Leaf, ...HOUSE });
        this.Leaf_RabbitHut = $(0xc1, HOUSE);
        this.Leaf_Inn = $(0xc2, HOUSE);
        this.Leaf_ToolShop = $(0xc3, HOUSE);
        this.Leaf_ArmorShop = $(0xc4, HOUSE);
        this.Leaf_StudentHouse = $(0xc5, HOUSE);
        this.Brynmaer_Tavern = $(0xc6, { area: Areas.Brynmaer, ...HOUSE });
        this.Brynmaer_PawnShop = $(0xc7, HOUSE);
        this.Brynmaer_Inn = $(0xc8, HOUSE);
        this.Brynmaer_ArmorShop = $(0xc9, HOUSE);
        this.Brynmaer_ItemShop = $(0xcb, HOUSE);
        this.Oak_ElderHouse = $(0xcd, { area: Areas.Oak, ...HOUSE });
        this.Oak_MotherHouse = $(0xce, HOUSE);
        this.Oak_ToolShop = $(0xcf, HOUSE);
        this.Oak_Inn = $(0xd0, HOUSE);
        this.Amazones_Inn = $(0xd1, { area: Areas.Amazones, ...HOUSE });
        this.Amazones_ItemShop = $(0xd2, HOUSE);
        this.Amazones_ArmorShop = $(0xd3, HOUSE);
        this.Amazones_Elder = $(0xd4, HOUSE);
        this.Nadare = $(0xd5, { area: Areas.Nadare });
        this.Portoa_FishermanHouse = $(0xd6, { area: Areas.FishermanHouse,
            ...HOUSE, music: 0 });
        this.Portoa_PalaceEntrance = $(0xd7, { area: Areas.PortoaPalace });
        this.Portoa_FortuneTeller = $(0xd8, { area: Areas.Portoa,
            ...FORTUNE_TELLER });
        this.Portoa_PawnShop = $(0xd9, HOUSE);
        this.Portoa_ArmorShop = $(0xda, HOUSE);
        this.Portoa_Inn = $(0xdc, HOUSE);
        this.Portoa_ToolShop = $(0xdd, HOUSE);
        this.PortoaPalace_Left = $(0xde, { area: Areas.PortoaPalace,
            ...HOUSE });
        this.PortoaPalace_ThroneRoom = $(0xdf, HOUSE);
        this.PortoaPalace_Right = $(0xe0, HOUSE);
        this.Portoa_AsinaRoom = $(0xe1, { area: Areas.UndergroundChannel,
            ...HOUSE, music: 'asina' });
        this.Amazones_ElderDownstairs = $(0xe2, { area: Areas.Amazones,
            ...HOUSE });
        this.Joel_ElderHouse = $(0xe3, { area: Areas.Joel, ...HOUSE });
        this.Joel_Shed = $(0xe4, HOUSE);
        this.Joel_ToolShop = $(0xe5, HOUSE);
        this.Joel_Inn = $(0xe7, HOUSE);
        this.ZombieTown_House = $(0xe8, { area: Areas.ZombieTown,
            ...HOUSE });
        this.ZombieTown_HouseBasement = $(0xe9, HOUSE);
        this.Swan_ToolShop = $(0xeb, { area: Areas.Swan, ...HOUSE });
        this.Swan_StomHut = $(0xec, HOUSE);
        this.Swan_Inn = $(0xed, HOUSE);
        this.Swan_ArmorShop = $(0xee, HOUSE);
        this.Swan_Tavern = $(0xef, HOUSE);
        this.Swan_PawnShop = $(0xf0, HOUSE);
        this.Swan_DanceHall = $(0xf1, HOUSE);
        this.Shyron_Temple = $(0xf2, { area: Areas.ShyronTemple,
            bossScreen: 0x70 });
        this.Shyron_TrainingHall = $(0xf3, { area: Areas.Shyron, ...HOUSE });
        this.Shyron_Hospital = $(0xf4, HOUSE);
        this.Shyron_ArmorShop = $(0xf5, HOUSE);
        this.Shyron_ToolShop = $(0xf6, HOUSE);
        this.Shyron_Inn = $(0xf7, HOUSE);
        this.Sahara_Inn = $(0xf8, { area: Areas.Sahara, ...HOUSE });
        this.Sahara_ToolShop = $(0xf9, HOUSE);
        this.Sahara_ElderHouse = $(0xfa, HOUSE);
        this.Sahara_PawnShop = $(0xfb, HOUSE);
        this.EastCave1 = $(-1, { area: Areas.EastCave });
        this.EastCave2 = $(-1);
        this.FishermanBeach = $(-1, { area: Areas.FishermanHouse, ...HOUSE });
        $.commit(this);
        for (let id = 0; id < 0x100; id++) {
            if (this[id])
                continue;
            this[id] = new Location(rom, id, {
                area: Areas.Unused,
                name: '',
                music: '',
                palette: '',
            });
        }
    }
    allocate(location) {
        for (const l of this) {
            if (l.used)
                continue;
            location.id = l.id;
            location.used = true;
            return this[l.id] = location;
        }
        throw new Error('No unused location');
    }
}
export class Location extends Entity {
    constructor(rom, id, data) {
        super(rom, id);
        this.data = data;
        const mapDataBase = id >= 0 ? readLittleEndian(rom.prg, this.mapDataPointer) + 0xc000 : 0;
        this.used = mapDataBase > 0xc000 && !!this.name;
        if (!this.used) {
            this.bgm = 0;
            this.layoutWidth = 0;
            this.layoutHeight = 0;
            this.animation = 0;
            this.extended = 0;
            this.screens = [[0]];
            this.tilePalettes = [0x24, 0x01, 0x26];
            this.tileset = 0x80;
            this.tileEffects = 0xb3;
            this.tilePatterns = [2, 4];
            this.exits = [];
            this.entrances = [];
            this.flags = [];
            this.pits = [];
            this.spawns = [];
            this.spritePalettes = [0, 0];
            this.spritePatterns = [0, 0];
            return;
        }
        const layoutBase = readLittleEndian(rom.prg, mapDataBase) + 0xc000;
        const graphicsBase = readLittleEndian(rom.prg, mapDataBase + 2) + 0xc000;
        const entrancesBase = readLittleEndian(rom.prg, mapDataBase + 4) + 0xc000;
        const exitsBase = readLittleEndian(rom.prg, mapDataBase + 6) + 0xc000;
        const flagsBase = readLittleEndian(rom.prg, mapDataBase + 8) + 0xc000;
        let hasPits = this.used && layoutBase !== mapDataBase + 10;
        let entranceLen = exitsBase - entrancesBase;
        this.exits = (() => {
            const exits = [];
            let i = exitsBase;
            while (!(rom.prg[i] & 0x80)) {
                if (rom.prg[i + 2] != 0xff) {
                    exits.push(Exit.from(rom.prg, i));
                }
                i += 4;
            }
            if (rom.prg[i] !== 0xff) {
                hasPits = !!(rom.prg[i] & 0x40);
                entranceLen = (rom.prg[i] & 0x1f) << 2;
            }
            return exits;
        })();
        const pitsBase = !hasPits ? 0 : readLittleEndian(rom.prg, mapDataBase + 10) + 0xc000;
        this.bgm = rom.prg[layoutBase];
        this.layoutWidth = rom.prg[layoutBase + 1];
        this.layoutHeight = rom.prg[layoutBase + 2];
        this.animation = rom.prg[layoutBase + 3];
        this.extended = rom.prg[layoutBase + 4];
        this.screens = seq(this.height, y => tuple(rom.prg, layoutBase + 5 + y * this.width, this.width));
        this.tilePalettes = tuple(rom.prg, graphicsBase, 3);
        this.tileset = rom.prg[graphicsBase + 3];
        this.tileEffects = rom.prg[graphicsBase + 4];
        this.tilePatterns = tuple(rom.prg, graphicsBase + 5, 2);
        this.entrances =
            group(4, rom.prg.slice(entrancesBase, entrancesBase + entranceLen), x => Entrance.from(x));
        this.flags = varSlice(rom.prg, flagsBase, 2, 0xff, Infinity, x => Flag.from(x));
        this.pits = pitsBase ? varSlice(rom.prg, pitsBase, 4, 0xff, Infinity, x => Pit.from(x)) : [];
        const npcDataBase = readLittleEndian(rom.prg, this.npcDataPointer) + 0x10000;
        const hasSpawns = npcDataBase !== 0x10000;
        this.spritePalettes =
            hasSpawns ? tuple(rom.prg, npcDataBase + 1, 2) : [0, 0];
        this.spritePatterns =
            hasSpawns ? tuple(rom.prg, npcDataBase + 3, 2) : [0, 0];
        this.spawns =
            hasSpawns ? varSlice(rom.prg, npcDataBase + 5, 4, 0xff, Infinity, x => Spawn.from(x)) : [];
    }
    get name() {
        return this.data.name;
    }
    get mapDataPointer() {
        if (this.id < 0)
            throw new Error(`no mapdata pointer for ${this.name}`);
        return 0x14300 + (this.id << 1);
    }
    get npcDataPointer() {
        if (this.id < 0)
            throw new Error(`no npcdata pointer for ${this.name}`);
        return 0x19201 + (this.id << 1);
    }
    get hasSpawns() {
        return this.spawns.length > 0;
    }
    get screenPage() {
        if (!this.rom.compressedMapData)
            return this.extended ? 0x100 : 0;
        return this.extended << 8;
    }
    isShop() {
        return this.rom.shops.findIndex(s => s.location === this.id) >= 0;
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
        if (!this.spawns.length) {
            this.spritePalettes = [0xff, 0xff];
            this.spritePatterns = [0xff, 0xff];
        }
        const data = [0, ...this.spritePalettes, ...this.spritePatterns,
            ...concatIterables(this.spawns), 0xff];
        promises.push(writer.write(data, 0x18000, 0x1bfff, `NpcData ${hex(this.id)}`)
            .then(address => writeLittleEndian(writer.rom, this.npcDataPointer, address - 0x10000)));
        const write = (data, name) => writer.write(data, 0x14000, 0x17fff, `${name} ${hex(this.id)}`);
        const layout = this.rom.compressedMapData ? [
            this.bgm,
            this.layoutHeight << 4 | this.layoutWidth,
            this.extended << 2 | this.animation,
            ...concatIterables(this.screens),
        ] : [
            this.bgm,
            this.layoutWidth, this.layoutHeight, this.animation, this.extended,
            ...concatIterables(this.screens),
        ];
        const graphics = [...this.tilePalettes,
            this.tileset, this.tileEffects,
            ...this.tilePatterns];
        if (this.height === 1) {
            for (const entrance of this.entrances) {
                if (!entrance.used)
                    continue;
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
            const restoreBgm = this.id === 0xa6 ? 0 : this.bgm;
            const bossRestore = [
                ,
                , , restoreBgm, ,
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
        const ext = this.screenPage;
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
    hasDolphin() {
        return this.id === 0x60 || this.id === 0x64 || this.id === 0x68;
    }
    reachableTiles(fly = false) {
        if (this.hasDolphin())
            fly = true;
        const exits = new Set(this.exits.map(exit => exit.screen << 8 | exit.tile));
        const uf = new UnionFind();
        const tileset = this.rom.tilesets[this.tileset];
        const tileEffects = this.rom.tileEffects[this.tileEffects - 0xb3];
        const passable = new Set();
        for (let y = 0; y < this.height; y++) {
            const row = this.screens[y];
            for (let x = 0; x < this.width; x++) {
                const screen = this.rom.screens[row[x] | this.screenPage];
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
            if (!entrance.used)
                continue;
            const id = entrance.screen << 8 | entrance.tile;
            sets.add(map.get(id) || new Set());
        }
        const out = new Map();
        for (const set of sets) {
            for (const t of set) {
                const scr = this.screens[t >>> 12][(t >>> 8) & 0x0f];
                const screen = this.rom.screens[scr | this.screenPage];
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
        const boss = this.data.bossScreen;
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
                for (const { x: x1, y: y1, used } of this.entrances) {
                    if (!used)
                        continue;
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
    resizeScreens(top, left, bottom, right) {
        const newWidth = this.width + left + right;
        const newHeight = this.height + top + bottom;
        const newScreens = Array.from({ length: newHeight }, (_, y) => {
            y -= top;
            return Array.from({ length: newWidth }, (_, x) => {
                x -= left;
                if (y < 0 || x < 0 || y >= this.height || x >= this.width)
                    return 0;
                return this.screens[y][x];
            });
        });
        this.width = newWidth;
        this.height = newHeight;
        this.screens = newScreens;
        for (const f of this.flags) {
            f.xs += left;
            f.ys += top;
        }
        for (const p of this.pits) {
            p.fromXs += left;
            p.fromYs += top;
        }
        for (const s of [...this.spawns, ...this.exits]) {
            s.xt += 16 * left;
            s.yt += 16 * top;
        }
        for (const e of this.entrances) {
            if (!e.used)
                continue;
            e.x += 256 * left;
            e.y += 256 * top;
        }
    }
    writeScreens2d(start, data) {
        const x0 = start & 0xf;
        const y0 = start >>> 4;
        for (let y = 0; y < data.length; y++) {
            const row = data[y];
            for (let x = 0; x < row.length; x++) {
                const tile = row[x];
                if (tile != null)
                    this.screens[y0 + y][x0 + x] = tile;
            }
        }
    }
    connect(pos, that, thatPos) {
        const thisY = pos >>> 4;
        const thisX = pos & 0xf;
        const thatY = thatPos >>> 4;
        const thatX = thatPos & 0xf;
        const thisTile = this.screens[thisY][thisX];
        const thatTile = that.screens[thatY][thatX];
        const [thisEntrance, thisExits] = screenExits[thisTile];
        const [thatEntrance, thatExits] = screenExits[thatTile];
        const thisEntranceIndex = this.entrances.length;
        const thatEntranceIndex = that.entrances.length;
        this.entrances.push(Entrance.of({ y: thisY << 8 | thisEntrance >>> 8,
            x: thisX << 8 | thisEntrance & 0xff }));
        that.entrances.push(Entrance.of({ y: thatY << 8 | thatEntrance >>> 8,
            x: thatX << 8 | thatEntrance & 0xff }));
        for (const exit of thisExits) {
            this.exits.push(Exit.of({ screen: pos, tile: exit,
                dest: that.id, entrance: thatEntranceIndex }));
        }
        for (const exit of thatExits) {
            that.exits.push(Exit.of({ screen: thatPos, tile: exit,
                dest: this.id, entrance: thisEntranceIndex }));
        }
    }
    neighborForEntrance(entranceId) {
        const entrance = this.entrances[entranceId];
        if (!entrance)
            throw new Error(`no entrance ${hex(this.id)}:${entranceId}`);
        for (const exit of this.exits) {
            if (exit.screen !== entrance.screen)
                continue;
            const dx = Math.abs(exit.x - entrance.x);
            const dy = Math.abs(exit.y - entrance.y);
            if (dx < 24 && dy < 24)
                return this.rom.locations[exit.dest];
        }
        throw new Error(`no exit found near ${hex(this.id)}:${entranceId}`);
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
export class Entrance extends DataTuple {
    constructor() {
        super(...arguments);
        this.x = this.prop([0], [1, 0xff, -8]);
        this.y = this.prop([2], [3, 0xff, -8]);
        this.screen = this.prop([3, 0x0f, -4], [1, 0x0f]);
        this.tile = this.prop([2, 0xf0], [0, 0xf0, 4]);
        this.coord = this.prop([2, 0xff, -8], [0, 0xff]);
    }
    get used() {
        return this.data[1] != 0xff;
    }
    ;
    toString() {
        return `Entrance ${this.hex()}: (${hex(this.y)}, ${hex(this.x)})`;
    }
}
Entrance.size = 4;
export class Exit extends DataTuple {
    constructor() {
        super(...arguments);
        this.x = this.prop([0, 0xff, -4]);
        this.xt = this.prop([0]);
        this.y = this.prop([1, 0xff, -4]);
        this.yt = this.prop([1]);
        this.screen = this.prop([1, 0xf0], [0, 0xf0, 4]);
        this.tile = this.prop([1, 0x0f, -4], [0, 0x0f]);
        this.coord = this.prop([1, 0x0f, -12], [0, 0x0f, -4]);
        this.dest = this.prop([2]);
        this.entrance = this.prop([3]);
    }
    toString() {
        return `Exit ${this.hex()}: (${hex(this.y)}, ${hex(this.x)}) => ${this.dest}:${this.entrance}`;
    }
}
Exit.size = 4;
export class Flag extends DataTuple {
    constructor() {
        super(...arguments);
        this.x = this.prop([1, 0x07, -8]);
        this.xs = this.prop([1, 0x07]);
        this.y = this.prop([1, 0xf0, -4]);
        this.ys = this.prop([1, 0xf0, 4]);
        this.screen = this.prop([1]);
    }
    get flag() {
        return this.data[0] | 0x200;
    }
    set flag(f) {
        if ((f & ~0xff) !== 0x200)
            throw new Error(`bad flag: ${hex(f)}`);
        this.data[0] = f & 0xff;
    }
    toString() {
        return `Flag ${this.hex()}: ${hex(this.screen)} @ ${hex(this.flag)}`;
    }
}
Flag.size = 2;
export class Pit extends DataTuple {
    constructor() {
        super(...arguments);
        this.fromXs = this.prop([1, 0x70, 4]);
        this.toXs = this.prop([1, 0x07]);
        this.fromYs = this.prop([3, 0xf0, 4]);
        this.toYs = this.prop([3, 0x0f]);
        this.dest = this.prop([0]);
    }
    toString() {
        return `Pit ${this.hex()}: (${hex(this.fromXs)}, ${hex(this.fromYs)}) => ${hex(this.dest)}:(${hex(this.toXs)}, ${hex(this.toYs)})`;
    }
}
Pit.size = 4;
export class Spawn extends DataTuple {
    constructor() {
        super(...arguments);
        this.y = this.prop([0, 0xff, -4]);
        this.yt = this.prop([0]);
        this.x = this.prop([1, 0x7f, -4], [2, 0x40, 3]);
        this.xt = this.prop([1, 0x7f]);
        this.timed = this.booleanProp(1, 7);
        this.screen = this.prop([0, 0xf0], [1, 0x70, 4]);
        this.tile = this.prop([0, 0x0f, -4], [1, 0x0f]);
        this.coord = this.prop([0, 0xff, -8], [1, 0x7f, -4], [2, 0x40, 3]);
        this.type = this.prop([2, 0x07]);
        this.id = this.prop([3]);
        this.patternBank = this.prop([2, 0x80, 7]);
    }
    get used() {
        return this.data[0] !== 0xfe;
    }
    set used(used) {
        this.data[0] = used ? 0 : 0xfe;
    }
    get monsterId() {
        return (this.id + 0x50) & 0xff;
    }
    set monsterId(id) {
        this.id = (id - 0x50) & 0xff;
    }
    isChest() { return this.type === 2 && this.id < 0x80; }
    isInvisible() {
        return this.isChest() && Boolean(this.data[2] & 0x20);
    }
    isTrigger() { return this.type === 2 && this.id >= 0x80; }
    isNpc() { return this.type === 1 && this.id < 0xc0; }
    isBoss() { return this.type === 1 && this.id >= 0xc0; }
    isMonster() { return this.type === 0; }
    isWall() {
        return Boolean(this.type === 3 && (this.id < 4 || (this.data[2] & 0x20)));
    }
    isShootingWall(location) {
        return this.isWall() &&
            !!(this.data[2] & 0x20 ? this.data[2] & 0x10 :
                location.id === 0x8f || location.id === 0xa8);
    }
    wallType() {
        if (this.type !== 3)
            return '';
        const obj = this.data[2] & 0x20 ? this.id >>> 4 : this.id;
        if (obj >= 4)
            return '';
        return obj === 2 ? 'bridge' : 'wall';
    }
    wallElement() {
        if (!this.isWall())
            return -1;
        return this.id & 3;
    }
    toString() {
        return `Spawn ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) ${this.timed ? 'timed' : 'fixed'} ${this.type}:${hex(this.id)}`;
    }
}
Spawn.size = 4;
const screenExits = {
    0x15: [37024, [0x89, 0x8a]],
    0x19: [24720, [0x58, 0x59]],
    0x96: [16432, [0x32, 0x33]],
    0x97: [44848, [0xb2, 0xb3]],
    0x98: [16592, [0x3c, 0x3d]],
    0x99: [45008, [0xbc, 0xbd]],
    0x9a: [8064, [0x27, 0x28]],
    0x9e: [57216, [0xe7, 0xe8]],
    0xc2: [24752, [0x5a, 0x5b]],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBTyxLQUFLLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDdEMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUVuQyxPQUFPLEVBQU8sU0FBUyxFQUNmLGVBQWUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFDeEMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQ3RDLGlCQUFpQixFQUFFLGtCQUFrQixFQUFDLE1BQU0sV0FBVyxDQUFDO0FBR2hFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUMxQyxPQUFPLEVBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUMsTUFBTSxZQUFZLENBQUM7QUF1QjFELE1BQU0sSUFBSSxHQUFHO0lBQ1gsT0FBTyxFQUFFLE1BQU07SUFDZixLQUFLLEVBQUUsQ0FBQyxJQUFVLEVBQUUsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksT0FBTztJQUMxQyxPQUFPLEVBQUUsQ0FBQyxJQUFVLEVBQUUsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksT0FBTztDQUNwQyxDQUFDO0FBQ1gsTUFBTSxLQUFLLEdBQUc7SUFDWixPQUFPLEVBQUUsT0FBTztJQUNoQixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFO0NBQ2YsQ0FBQztBQUNYLE1BQU0sY0FBYyxHQUFHO0lBQ3JCLE9BQU8sRUFBRSxPQUFPO0lBQ2hCLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUU7SUFDdkIsS0FBSyxFQUFFLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLGdCQUFnQjtDQUMzQyxDQUFDO0FBQ1gsTUFBTSxL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TUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckQsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsR0FDM0UsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2hCLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO1lBQ3ZCLEtBQUssQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDO1lBQzNCLEtBQUssQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDO1lBQzdCLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO1lBQ3JCLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO1lBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1NBQzlDLENBQUMsQ0FBQztRQUNQLE1BQU0sU0FBUyxHQUFHO1lBQ2hCLFVBQVUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSTtZQUM1QyxZQUFZLEdBQUcsSUFBSSxFQUFFLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUk7WUFDaEQsYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDLGFBQWEsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJO1lBQ2xELFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSTtZQUMxQyxTQUFTLEdBQUcsSUFBSSxFQUFFLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUk7WUFDMUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFD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QyxDQUFDO0tBQzlEO0lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUU7UUFDakMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM3RDtJQUNELElBQUksQ0FBQyxFQUFFO1FBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM3RDtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQW1FRCxNQUFNLE9BQU8sUUFBUyxTQUFRLFNBQVM7SUFBdkM7O1FBU0UsTUFBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWxDLE1BQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQU9sQyxXQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTdDLFNBQUksR0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVDLFVBQUssR0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFVL0MsQ0FBQztJQVBDLElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDOUIsQ0FBQztJQUFBLENBQUM7SUFFRixRQUFRO1FBQ04sT0FBTyxZQUFZLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUNwRSxDQUFDOztBQTVCTSxhQUFJLEdBQUcsQ0FBQyxDQUFDO0FBZ0NsQixNQUFNLE9BQU8sSUFBSyxTQUFRLFNBQVM7SUFBbkM7O1FBSUUsTUFBQyxHQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwQyxPQUFFLEdBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFHMUIsTUFBQyxHQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwQyxPQUFFLEdBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFHMUIsV0FBTSxHQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUMsU0FBSSxHQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FB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QUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLElBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQzlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FyZWEsIEFyZWFzfSBmcm9tICcuL2FyZWEuanMnO1xuaW1wb3J0IHtFbnRpdHl9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7U2NyZWVufSBmcm9tICcuL3NjcmVlbi5qcyc7XG5pbXBvcnQge0RhdGEsIERhdGFUdXBsZSxcbiAgICAgICAgY29uY2F0SXRlcmFibGVzLCBncm91cCwgaGV4LCBpbml0aWFsaXplcixcbiAgICAgICAgcmVhZExpdHRsZUVuZGlhbiwgc2VxLCB0dXBsZSwgdmFyU2xpY2UsXG4gICAgICAgIHdyaXRlTGl0dGxlRW5kaWFuLCB1cHBlckNhbWVsVG9TcGFjZXN9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1dyaXRlcn0gZnJvbSAnLi93cml0ZXIuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7YXNzZXJ0TmV2ZXIsIGl0ZXJzLCBEZWZhdWx0TWFwfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9tb25zdGVyLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuXG4vLyBOdW1iZXIgaW5kaWNhdGVzIHRvIGNvcHkgd2hhdGV2ZXIncyBhdCB0aGUgZ2l2ZW4gZXhpdFxudHlwZSBLZXkgPSBzdHJpbmcgfCBzeW1ib2wgfCBudW1iZXI7XG4vLyBMb2NhbCBmb3IgZGVmaW5pbmcgbmFtZXMgb24gTG9jYXRpb25zIG9iamVjdHMuXG5pbnRlcmZhY2UgTG9jYXRpb25Jbml0IHtcbiAgYXJlYT86IEFyZWE7XG4gIHN1YkFyZWE/OiBzdHJpbmc7XG4gIG11c2ljPzogS2V5IHwgKChhcmVhOiBBcmVhKSA9PiBLZXkpO1xuICBwYWxldHRlPzogS2V5IHwgKChhcmVhOiBBcmVhKSA9PiBLZXkpO1xuICBib3NzU2NyZWVuPzogbnVtYmVyO1xufVxuaW50ZXJmYWNlIExvY2F0aW9uRGF0YSB7XG4gIGFyZWE6IEFyZWE7XG4gIG5hbWU6IHN0cmluZztcbiAgbXVzaWM6IEtleTtcbiAgcGFsZXR0ZTogS2V5O1xuICBzdWJBcmVhPzogc3RyaW5nO1xuICBib3NzU2NyZWVuPzogbnVtYmVyO1xufVxuXG5jb25zdCBDQVZFID0ge1xuICBzdWJBcmVhOiAnY2F2ZScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1DYXZlYCxcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tQ2F2ZWAsXG59IGFzIGNvbnN0O1xuY29uc3QgSE9VU0UgPSB7XG4gIHN1YkFyZWE6ICdob3VzZScsXG4gIHBhbGV0dGU6ICgpID0+IFN5bWJvbCgpLFxufSBhcyBjb25zdDtcbmNvbnN0IEZPUlRVTkVfVEVMTEVSID0ge1xuICBzdWJBcmVhOiAnaG91c2UnLFxuICBwYWxldHRlOiAoKSA9PiBTeW1ib2woKSxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUZvcnR1bmVUZWxsZXJgLFxufSBhcyBjb25zdDtcbmNvbnN0IE1FU0lBID0ge1xuICBuYW1lOiAnbWVzaWEnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tTWVzaWFgLFxuICAvLyBNZXNpYSBpbiB0b3dlciBrZWVwcyBzYW1lIHBhbGV0dGVcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGFyZWEubmFtZSA9PT0gJ1Rvd2VyJyA/XG4gICAgICBhcmVhLm5hbWUgOiBgJHthcmVhLm5hbWV9LU1lc2lhYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBEWU5BID0ge1xuICBuYW1lOiAnZHluYScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1EeW5hYCxcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tRHluYWAsXG59IGFzIGNvbnN0O1xuY29uc3QgS0VMQkVTUVVFID0ge1xuICBuYW1lOiAnZ29hIDEnLFxuICBtdXNpYzogJ2dvYSAxJyxcbiAgcGFsZXR0ZTogJ2dvYSAxJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBTQUJFUkEgPSB7XG4gIG5hbWU6ICdnb2EgMicsXG4gIG11c2ljOiAnZ29hIDInLFxuICBwYWxldHRlOiAnZ29hIDInLFxufSBhcyBjb25zdDtcbmNvbnN0IE1BRE9fTE9XRVIgPSB7XG4gIG5hbWU6ICdnb2EgMycsXG4gIG11c2ljOiAnZ29hIDMnLFxuICBwYWxldHRlOiAnZ29hIDMnLFxufSBhcyBjb25zdDtcbmNvbnN0IE1BRE9fVVBQRVIgPSB7Li4uTUFET19MT1dFUiwgcGFsZXR0ZTogJ2dvYSAzIHVwcGVyJ30gYXMgY29uc3Q7XG5jb25zdCBLQVJNSU5FX1VQUEVSID0ge1xuICBuYW1lOiAnZ29hIDQnLFxuICBtdXNpYzogJ2dvYSA0JyxcbiAgcGFsZXR0ZTogJ2dvYSA0Jyxcbn0gYXMgY29uc3Q7XG5jb25zdCBLQVJNSU5FX0xPV0VSID0gey4uLktBUk1JTkVfVVBQRVIsIHBhbGV0dGU6ICdnb2EgNCBsb3dlcid9IGFzIGNvbnN0O1xuXG50eXBlIEluaXRQYXJhbXMgPSByZWFkb25seSBbbnVtYmVyLCBMb2NhdGlvbkluaXQ/XTtcbnR5cGUgSW5pdCA9IHsoLi4uYXJnczogSW5pdFBhcmFtcyk6IExvY2F0aW9uLFxuICAgICAgICAgICAgIGNvbW1pdChsb2NhdGlvbnM6IExvY2F0aW9ucyk6IHZvaWR9O1xuY29uc3QgJDogSW5pdCA9ICgoKSA9PiB7XG4gIGNvbnN0ICQgPSBpbml0aWFsaXplcjxbbnVtYmVyLCBMb2NhdGlvbkluaXRdLCBMb2NhdGlvbj4oKTtcbiAgbGV0IGFyZWEhOiBBcmVhO1xuICBmdW5jdGlvbiAkJChpZDogbnVtYmVyLCBkYXRhOiBMb2NhdGlvbkluaXQgPSB7fSk6IExvY2F0aW9uIHtcbiAgICBkYXRhID0gey4uLmRhdGF9O1xuICAgIGFyZWEgPSBkYXRhLmFyZWEgPSBkYXRhLmFyZWEgfHwgYXJlYTtcbiAgICByZXR1cm4gJChpZCwgZGF0YSk7XG4gIH07XG4gICgkJCBhcyBJbml0KS5jb21taXQgPSAobG9jYXRpb25zOiBMb2NhdGlvbnMpID0+IHtcbiAgICAkLmNvbW1pdChsb2NhdGlvbnMsIChwcm9wOiBzdHJpbmcsIGlkOiBudW1iZXIsIGluaXQ6IExvY2F0aW9uSW5pdCkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IHVwcGVyQ2FtZWxUb1NwYWNlcyhwcm9wKTtcbiAgICAgIGNvbnN0IGFyZWEgPSBpbml0LmFyZWEhO1xuICAgICAgY29uc3QgbXVzaWMgPSB0eXBlb2YgaW5pdC5tdXNpYyA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgaW5pdC5tdXNpYyhhcmVhKSA6IGluaXQubXVzaWMgIT0gbnVsbCA/XG4gICAgICAgICAgaW5pdC5tdXNpYyA6IGFyZWEubmFtZTtcbiAgICAgIGNvbnN0IHBhbGV0dGUgPSB0eXBlb2YgaW5pdC5wYWxldHRlID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICBpbml0LnBhbGV0dGUoYXJlYSkgOiBpbml0LnBhbGV0dGUgfHwgYXJlYS5uYW1lO1xuICAgICAgY29uc3QgZGF0YTogTG9jYXRpb25EYXRhID0ge2FyZWEsIG5hbWUsIG11c2ljLCBwYWxldHRlfTtcbiAgICAgIGlmIChpbml0LnN1YkFyZWEgIT0gbnVsbCkgZGF0YS5zdWJBcmVhID0gaW5pdC5zdWJBcmVhO1xuICAgICAgaWYgKGluaXQuYm9zc1NjcmVlbiAhPSBudWxsKSBkYXRhLmJvc3NTY3JlZW4gPSBpbml0LmJvc3NTY3JlZW47XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IG5ldyBMb2NhdGlvbihsb2NhdGlvbnMucm9tLCBpZCwgZGF0YSk7XG4gICAgICAvLyBuZWdhdGl2ZSBpZCBpbmRpY2F0ZXMgaXQncyBub3QgcmVnaXN0ZXJlZC5cbiAgICAgIGlmIChpZCA+PSAwKSBsb2NhdGlvbnNbaWRdID0gbG9jYXRpb247XG4gICAgICByZXR1cm4gbG9jYXRpb247XG4gICAgfSk7XG4gIH07XG4gIHJldHVybiAkJCBhcyBJbml0O1xufSkoKTtcblxuZXhwb3J0IGNsYXNzIExvY2F0aW9ucyBleHRlbmRzIEFycmF5PExvY2F0aW9uPiB7XG5cbiAgcmVhZG9ubHkgTWV6YW1lU2hyaW5lICAgICAgICAgICAgID0gJCgweDAwLCB7YXJlYTogQXJlYXMuTWV6YW1lfSk7XG4gIHJlYWRvbmx5IExlYWZfT3V0c2lkZVN0YXJ0ICAgICAgICA9ICQoMHgwMSwge211c2ljOiAxfSk7XG4gIHJlYWRvbmx5IExlYWYgICAgICAgICAgICAgICAgICAgICA9ICQoMHgwMiwge2FyZWE6IEFyZWFzLkxlYWZ9KTtcbiAgcmVhZG9ubHkgVmFsbGV5T2ZXaW5kICAgICAgICAgICAgID0gJCgweDAzLCB7YXJlYTogQXJlYXMuVmFsbGV5T2ZXaW5kfSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmUxICAgICAgICAgICAgICA9ICQoMHgwNCwge2FyZWE6IEFyZWFzLlNlYWxlZENhdmV9KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTIgICAgICAgICAgICAgID0gJCgweDA1KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTYgICAgICAgICAgICAgID0gJCgweDA2KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTQgICAgICAgICAgICAgID0gJCgweDA3KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTUgICAgICAgICAgICAgID0gJCgweDA4KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTMgICAgICAgICAgICAgID0gJCgweDA5KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTcgICAgICAgICAgICAgID0gJCgweDBhLCB7Ym9zc1NjcmVlbjogMHg5MX0pO1xuICAvLyBJTlZBTElEOiAweDBiXG4gIHJlYWRvbmx5IFNlYWxlZENhdmU4ICAgICAgICAgICAgICA9ICQoMHgwYyk7XG4gIC8vIElOVkFMSUQ6IDB4MGRcbiAgcmVhZG9ubHkgV2luZG1pbGxDYXZlICAgICAgICAgICAgID0gJCgweDBlLCB7YXJlYTogQXJlYXMuV2luZG1pbGxDYXZlfSk7XG4gIHJlYWRvbmx5IFdpbmRtaWxsICAgICAgICAgICAgICAgICA9ICQoMHgwZiwge2FyZWE6IEFyZWFzLldpbmRtaWxsLCBtdXNpYzogMH0pO1xuICByZWFkb25seSBaZWJ1Q2F2ZSAgICAgICAgICAgICAgICAgPSAkKDB4MTAsIHthcmVhOiBBcmVhcy5aZWJ1Q2F2ZX0pO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlMSAgICAgICAgPSAkKDB4MTEsIHthcmVhOiBBcmVhcy5NdFNhYnJlV2VzdCwgLi4uQ0FWRX0pO1xuICAvLyBJTlZBTElEOiAweDEyXG4gIC8vIElOVkFMSUQ6IDB4MTNcbiAgcmVhZG9ubHkgQ29yZGVsUGxhaW5XZXN0ICAgICAgICAgID0gJCgweDE0LCB7YXJlYTogQXJlYXMuQ29yZGVsUGxhaW59KTtcbiAgcmVhZG9ubHkgQ29yZGVsUGxhaW5FYXN0ICAgICAgICAgID0gJCgweDE1KTtcbiAgLy8gSU5WQUxJRDogMHgxNiAtLSB1bnVzZWQgY29weSBvZiAxOFxuICAvLyBJTlZBTElEOiAweDE3XG4gIHJlYWRvbmx5IEJyeW5tYWVyICAgICAgICAgICAgICAgICA9ICQoMHgxOCwge2FyZWE6IEFyZWFzLkJyeW5tYWVyfSk7XG4gIHJlYWRvbmx5IE91dHNpZGVTdG9tSG91c2UgICAgICAgICA9ICQoMHgxOSwge2FyZWE6IEFyZWFzLlN0b21Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgU3dhbXAgICAgICAgICAgICAgICAgICAgID0gJCgweDFhLCB7YXJlYTogQXJlYXMuU3dhbXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4N2N9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXMgICAgICAgICAgICAgICAgID0gJCgweDFiLCB7YXJlYTogQXJlYXMuQW1hem9uZXN9KTtcbiAgcmVhZG9ubHkgT2FrICAgICAgICAgICAgICAgICAgICAgID0gJCgweDFjLCB7YXJlYTogQXJlYXMuT2FrfSk7XG4gIC8vIElOVkFMSUQ6IDB4MWRcbiAgcmVhZG9ubHkgU3RvbUhvdXNlICAgICAgICAgICAgICAgID0gJCgweDFlLCB7YXJlYTogQXJlYXMuU3RvbUhvdXNlfSk7XG4gIC8vIElOVkFMSUQ6IDB4MWZcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfTG93ZXIgICAgICAgID0gJCgweDIwLCB7YXJlYTogQXJlYXMuTXRTYWJyZVdlc3R9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfVXBwZXIgICAgICAgID0gJCgweDIxKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTIgICAgICAgID0gJCgweDIyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTMgICAgICAgID0gJCgweDIzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTQgICAgICAgID0gJCgweDI0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTUgICAgICAgID0gJCgweDI1LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTYgICAgICAgID0gJCgweDI2LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTcgICAgICAgID0gJCgweDI3LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX01haW4gICAgICAgID0gJCgweDI4LCB7YXJlYTogQXJlYXMuTXRTYWJyZU5vcnRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4YjV9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX01pZGRsZSAgICAgID0gJCgweDI5KTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUyICAgICAgID0gJCgweDJhLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUzICAgICAgID0gJCgweDJiLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU0ICAgICAgID0gJCgweDJjLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU1ICAgICAgID0gJCgweDJkLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU2ICAgICAgID0gJCgweDJlLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1ByaXNvbkhhbGwgID0gJCgweDJmLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0xlZnRDZWxsICAgID0gJCgweDMwLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0xlZnRDZWxsMiAgID0gJCgweDMxLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1JpZ2h0Q2VsbCAgID0gJCgweDMyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU4ICAgICAgID0gJCgweDMzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU5ICAgICAgID0gJCgweDM0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1N1bW1pdENhdmUgID0gJCgweDM1LCBDQVZFKTtcbiAgLy8gSU5WQUxJRDogMHgzNlxuICAvLyBJTlZBTElEOiAweDM3XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlMSAgICAgICA9ICQoMHgzOCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNyAgICAgICA9ICQoMHgzOSwgQ0FWRSk7XG4gIC8vIElOVkFMSUQ6IDB4M2FcbiAgLy8gSU5WQUxJRDogMHgzYlxuICByZWFkb25seSBOYWRhcmVfSW5uICAgICAgICAgICAgICAgPSAkKDB4M2MsIHthcmVhOiBBcmVhcy5OYWRhcmUsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IE5hZGFyZV9Ub29sU2hvcCAgICAgICAgICA9ICQoMHgzZCwgSE9VU0UpO1xuICByZWFkb25seSBOYWRhcmVfQmFja1Jvb20gICAgICAgICAgPSAkKDB4M2UsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHgzZlxuICByZWFkb25seSBXYXRlcmZhbGxWYWxsZXlOb3J0aCAgICAgPSAkKDB4NDAsIHthcmVhOiBBcmVhcy5XYXRlcmZhbGxWYWxsZXl9KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsVmFsbGV5U291dGggICAgID0gJCgweDQxKTtcbiAgcmVhZG9ubHkgTGltZVRyZWVWYWxsZXkgICAgICAgICAgID0gJCgweDQyLCB7YXJlYTogQXJlYXMuTGltZVRyZWVWYWxsZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IExpbWVUcmVlTGFrZSAgICAgICAgICAgICA9ICQoMHg0Mywge2FyZWE6IEFyZWFzLkxpbWVUcmVlTGFrZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgS2lyaXNhUGxhbnRDYXZlMSAgICAgICAgID0gJCgweDQ0LCB7YXJlYTogQXJlYXMuS2lyaXNhUGxhbnRDYXZlfSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTIgICAgICAgICA9ICQoMHg0NSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTMgICAgICAgICA9ICQoMHg0Nik7XG4gIHJlYWRvbmx5IEtpcmlzYU1lYWRvdyAgICAgICAgICAgICA9ICQoMHg0Nywge2FyZWE6IEFyZWFzLktpcmlzYU1lYWRvd30pO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTEgICAgICAgICAgICAgPSAkKDB4NDgsIHthcmVhOiBBcmVhcy5Gb2dMYW1wQ2F2ZX0pO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTIgICAgICAgICAgICAgPSAkKDB4NDkpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTMgICAgICAgICAgICAgPSAkKDB4NGEpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZURlYWRFbmQgICAgICAgPSAkKDB4NGIpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTQgICAgICAgICAgICAgPSAkKDB4NGMpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTUgICAgICAgICAgICAgPSAkKDB4NGQpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTYgICAgICAgICAgICAgPSAkKDB4NGUpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTcgICAgICAgICAgICAgPSAkKDB4NGYpO1xuICByZWFkb25seSBQb3J0b2EgICAgICAgICAgICAgICAgICAgPSAkKDB4NTAsIHthcmVhOiBBcmVhcy5Qb3J0b2F9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX0Zpc2hlcm1hbklzbGFuZCAgID0gJCgweDUxLCB7YXJlYTogQXJlYXMuRmlzaGVybWFuSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IE1lc2lhU2hyaW5lICAgICAgICAgICAgICA9ICQoMHg1Miwge2FyZWE6IEFyZWFzLkxpbWVUcmVlTGFrZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uTUVTSUF9KTtcbiAgLy8gSU5WQUxJRDogMHg1M1xuICByZWFkb25seSBXYXRlcmZhbGxDYXZlMSAgICAgICAgICAgPSAkKDB4NTQsIHthcmVhOiBBcmVhcy5XYXRlcmZhbGxDYXZlfSk7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUyICAgICAgICAgICA9ICQoMHg1NSk7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUzICAgICAgICAgICA9ICQoMHg1Nik7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmU0ICAgICAgICAgICA9ICQoMHg1Nyk7XG4gIHJlYWRvbmx5IFRvd2VyRW50cmFuY2UgICAgICAgICAgICA9ICQoMHg1OCwge2FyZWE6IEFyZWFzLlRvd2VyfSk7XG4gIHJlYWRvbmx5IFRvd2VyMSAgICAgICAgICAgICAgICAgICA9ICQoMHg1OSk7XG4gIHJlYWRvbmx5IFRvd2VyMiAgICAgICAgICAgICAgICAgICA9ICQoMHg1YSk7XG4gIHJlYWRvbmx5IFRvd2VyMyAgICAgICAgICAgICAgICAgICA9ICQoMHg1Yik7XG4gIHJlYWRvbmx5IFRvd2VyT3V0c2lkZU1lc2lhICAgICAgICA9ICQoMHg1Yyk7XG4gIHJlYWRvbmx5IFRvd2VyT3V0c2lkZUR5bmEgICAgICAgICA9ICQoMHg1ZCk7XG4gIHJlYWRvbmx5IFRvd2VyTWVzaWEgICAgICAgICAgICAgICA9ICQoMHg1ZSwgTUVTSUEpO1xuICByZWFkb25seSBUb3dlckR5bmEgICAgICAgICAgICAgICAgPSAkKDB4NWYsIERZTkEpO1xuICByZWFkb25seSBBbmdyeVNlYSAgICAgICAgICAgICAgICAgPSAkKDB4NjAsIHthcmVhOiBBcmVhcy5BbmdyeVNlYX0pO1xuICByZWFkb25seSBCb2F0SG91c2UgICAgICAgICAgICAgICAgPSAkKDB4NjEpO1xuICByZWFkb25seSBKb2VsTGlnaHRob3VzZSAgICAgICAgICAgPSAkKDB4NjIsIHthcmVhOiBBcmVhcy5MaWdodGhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICAvLyBJTlZBTElEOiAweDYzXG4gIHJlYWRvbmx5IFVuZGVyZ3JvdW5kQ2hhbm5lbCAgICAgICA9ICQoMHg2NCwge2FyZWE6IEFyZWFzLlVuZGVyZ3JvdW5kQ2hhbm5lbH0pO1xuICByZWFkb25seSBab21iaWVUb3duICAgICAgICAgICAgICAgPSAkKDB4NjUsIHthcmVhOiBBcmVhcy5ab21iaWVUb3dufSk7XG4gIC8vIElOVkFMSUQ6IDB4NjZcbiAgLy8gSU5WQUxJRDogMHg2N1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kMSAgICAgICAgPSAkKDB4NjgsIHthcmVhOiBBcmVhcy5FdmlsU3Bpcml0SXNsYW5kRW50cmFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAxfSk7XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQyICAgICAgICA9ICQoMHg2OSwge2FyZWE6IEFyZWFzLkV2aWxTcGlyaXRJc2xhbmR9KTtcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDMgICAgICAgID0gJCgweDZhKTtcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDQgICAgICAgID0gJCgweDZiKTtcbiAgcmVhZG9ubHkgU2FiZXJhUGFsYWNlMSAgICAgICAgICAgID0gJCgweDZjLCB7YXJlYTogQXJlYXMuU2FiZXJhRm9ydHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4ZmR9KTtcbiAgcmVhZG9ubHkgU2FiZXJhUGFsYWNlMiAgICAgICAgICAgID0gJCgweDZkKTtcbiAgcmVhZG9ubHkgU2FiZXJhUGFsYWNlMyAgICAgICAgICAgID0gJCgweDZlLCB7Ym9zc1NjcmVlbjogMHhmZH0pO1xuICAvLyBJTlZBTElEOiAweDZmIC0tIFNhYmVyYSBQYWxhY2UgMyB1bnVzZWQgY29weVxuICByZWFkb25seSBKb2VsU2VjcmV0UGFzc2FnZSAgICAgICAgPSAkKDB4NzAsIHthcmVhOiBBcmVhcy5Kb2VsUGFzc2FnZX0pO1xuICByZWFkb25seSBKb2VsICAgICAgICAgICAgICAgICAgICAgPSAkKDB4NzEsIHthcmVhOiBBcmVhcy5Kb2VsfSk7XG4gIHJlYWRvbmx5IFN3YW4gICAgICAgICAgICAgICAgICAgICA9ICQoMHg3Miwge2FyZWE6IEFyZWFzLlN3YW4sIG11c2ljOiAxfSk7XG4gIHJlYWRvbmx5IFN3YW5HYXRlICAgICAgICAgICAgICAgICA9ICQoMHg3Mywge2FyZWE6IEFyZWFzLlN3YW5HYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMX0pO1xuICAvLyBJTlZBTElEOiAweDc0XG4gIC8vIElOVkFMSUQ6IDB4NzVcbiAgLy8gSU5WQUxJRDogMHg3NlxuICAvLyBJTlZBTElEOiAweDc3XG4gIHJlYWRvbmx5IEdvYVZhbGxleSAgICAgICAgICAgICAgICA9ICQoMHg3OCwge2FyZWE6IEFyZWFzLkdvYVZhbGxleX0pO1xuICAvLyBJTlZBTElEOiAweDc5XG4gIC8vIElOVkFMSUQ6IDB4N2FcbiAgLy8gSU5WQUxJRDogMHg3YlxuICByZWFkb25seSBNdEh5ZHJhICAgICAgICAgICAgICAgICAgPSAkKDB4N2MsIHthcmVhOiBBcmVhcy5NdEh5ZHJhfSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTEgICAgICAgICAgICA9ICQoMHg3ZCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfT3V0c2lkZVNoeXJvbiAgICA9ICQoMHg3ZSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTIgICAgICAgICAgICA9ICQoMHg3ZiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTMgICAgICAgICAgICA9ICQoMHg4MCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTQgICAgICAgICAgICA9ICQoMHg4MSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTUgICAgICAgICAgICA9ICQoMHg4MiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTYgICAgICAgICAgICA9ICQoMHg4MywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTcgICAgICAgICAgICA9ICQoMHg4NCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTggICAgICAgICAgICA9ICQoMHg4NSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTkgICAgICAgICAgICA9ICQoMHg4NiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10SHlkcmFfQ2F2ZTEwICAgICAgICAgICA9ICQoMHg4NywgQ0FWRSk7XG4gIHJlYWRvbmx5IFN0eXgxICAgICAgICAgICAgICAgICAgICA9ICQoMHg4OCwge2FyZWE6IEFyZWFzLlN0eXh9KTtcbiAgcmVhZG9ubHkgU3R5eDIgICAgICAgICAgICAgICAgICAgID0gJCgweDg5KTtcbiAgcmVhZG9ubHkgU3R5eDMgICAgICAgICAgICAgICAgICAgID0gJCgweDhhKTtcbiAgLy8gSU5WQUxJRDogMHg4YlxuICByZWFkb25seSBTaHlyb24gICAgICAgICAgICAgICAgICAgPSAkKDB4OGMsIHthcmVhOiBBcmVhcy5TaHlyb259KTtcbiAgLy8gSU5WQUxJRDogMHg4ZFxuICByZWFkb25seSBHb2EgICAgICAgICAgICAgICAgICAgICAgPSAkKDB4OGUsIHthcmVhOiBBcmVhcy5Hb2F9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NCYXNlbWVudCAgICAgID0gJCgweDhmLCB7YXJlYTogQXJlYXMuRm9ydHJlc3NCYXNlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgRGVzZXJ0MSAgICAgICAgICAgICAgICAgID0gJCgweDkwLCB7YXJlYTogQXJlYXMuRGVzZXJ0MX0pO1xuICByZWFkb25seSBPYXNpc0NhdmVNYWluICAgICAgICAgICAgPSAkKDB4OTEsIHthcmVhOiBBcmVhcy5PYXNpc0NhdmV9KTtcbiAgcmVhZG9ubHkgRGVzZXJ0Q2F2ZTEgICAgICAgICAgICAgID0gJCgweDkyLCB7YXJlYTogQXJlYXMuRGVzZXJ0Q2F2ZTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFNhaGFyYSAgICAgICAgICAgICAgICAgICA9ICQoMHg5Mywge2FyZWE6IEFyZWFzLlNhaGFyYX0pO1xuICByZWFkb25seSBTYWhhcmFPdXRzaWRlQ2F2ZSAgICAgICAgPSAkKDB4OTQsIHttdXNpYzogMH0pOyAvLyBUT0RPIC0gc2FoYXJhPz8gZ2VuZXJpYz8/XG4gIHJlYWRvbmx5IERlc2VydENhdmUyICAgICAgICAgICAgICA9ICQoMHg5NSwge2FyZWE6IEFyZWFzLkRlc2VydENhdmUyLCBtdXNpYzogMX0pO1xuICByZWFkb25seSBTYWhhcmFNZWFkb3cgICAgICAgICAgICAgPSAkKDB4OTYsIHthcmVhOiBBcmVhcy5TYWhhcmFNZWFkb3csIG11c2ljOiAwfSk7XG4gIC8vIElOVkFMSUQ6IDB4OTdcbiAgcmVhZG9ubHkgRGVzZXJ0MiAgICAgICAgICAgICAgICAgID0gJCgweDk4LCB7YXJlYTogQXJlYXMuRGVzZXJ0Mn0pO1xuICAvLyBJTlZBTElEOiAweDk5XG4gIC8vIElOVkFMSUQ6IDB4OWFcbiAgLy8gSU5WQUxJRDogMHg5YlxuICByZWFkb25seSBQeXJhbWlkX0VudHJhbmNlICAgICAgICAgPSAkKDB4OWMsIHthcmVhOiBBcmVhcy5QeXJhbWlkfSk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfQnJhbmNoICAgICAgICAgICA9ICQoMHg5ZCk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfTWFpbiAgICAgICAgICAgICA9ICQoMHg5ZSk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfRHJheWdvbiAgICAgICAgICA9ICQoMHg5Zik7XG4gIHJlYWRvbmx5IENyeXB0X0VudHJhbmNlICAgICAgICAgICA9ICQoMHhhMCwge2FyZWE6IEFyZWFzLkNyeXB0fSk7XG4gIHJlYWRvbmx5IENyeXB0X0hhbGwxICAgICAgICAgICAgICA9ICQoMHhhMSk7XG4gIHJlYWRvbmx5IENyeXB0X0JyYW5jaCAgICAgICAgICAgICA9ICQoMHhhMik7XG4gIHJlYWRvbmx5IENyeXB0X0RlYWRFbmRMZWZ0ICAgICAgICA9ICQoMHhhMyk7XG4gIHJlYWRvbmx5IENyeXB0X0RlYWRFbmRSaWdodCAgICAgICA9ICQoMHhhNCk7XG4gIHJlYWRvbmx5IENyeXB0X0hhbGwyICAgICAgICAgICAgICA9ICQoMHhhNSk7XG4gIHJlYWRvbmx5IENyeXB0X0RyYXlnb24yICAgICAgICAgICA9ICQoMHhhNik7XG4gIHJlYWRvbmx5IENyeXB0X1RlbGVwb3J0ZXIgICAgICAgICA9ICQoMHhhNywge211c2ljOiAnQ3J5cHQtVGVsZXBvcnRlcid9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfRW50cmFuY2UgICAgID0gJCgweGE4LCB7YXJlYTogQXJlYXMuR29hRm9ydHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiBLRUxCRVNRVUUubXVzaWN9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2VsYmVzcXVlICAgID0gJCgweGE5LCB7Ym9zc1NjcmVlbjogMHg3MyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uS0VMQkVTUVVFfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX1plYnUgICAgICAgICA9ICQoMHhhYSwgey4uLktFTEJFU1FVRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZTogU0FCRVJBLnBhbGV0dGV9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfU2FiZXJhICAgICAgID0gJCgweGFiLCBTQUJFUkEpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19Ub3JuZWwgICAgICAgPSAkKDB4YWMsIHtib3NzU2NyZWVuOiAweDkxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5TQUJFUkEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhbGV0dGU6IE1BRE9fTE9XRVIucGFsZXR0ZX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMSAgICAgICAgPSAkKDB4YWQsIE1BRE9fTE9XRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMiAgICAgICAgPSAkKDB4YWUsIE1BRE9fVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMyAgICAgICAgPSAkKDB4YWYsIE1BRE9fVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMSAgICAgPSAkKDB4YjAsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMiAgICAgPSAkKDB4YjEsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMyAgICAgPSAkKDB4YjIsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNCAgICAgPSAkKDB4YjMsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNSAgICAgPSAkKDB4YjQsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNiAgICAgPSAkKDB4YjUsIEtBUk1JTkVfTE9XRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNyAgICAgPSAkKDB4YjYsIHtib3NzU2NyZWVuOiAweGZkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5LQVJNSU5FX0xPV0VSfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0V4aXQgICAgICAgICA9ICQoMHhiNywge211c2ljOiBLQVJNSU5FX1VQUEVSLm11c2ljfSk7XG4gIHJlYWRvbmx5IE9hc2lzQ2F2ZV9FbnRyYW5jZSAgICAgICA9ICQoMHhiOCwge2FyZWE6IEFyZWFzLk9hc2lzRW50cmFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAyfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0FzaW5hICAgICAgICA9ICQoMHhiOSwge2FyZWE6IEFyZWFzLkdvYUZvcnRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5NQURPX1VQUEVSLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDkxfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0tlbnN1ICAgICAgICA9ICQoMHhiYSwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYV9Ib3VzZSAgICAgICAgICAgICAgICA9ICQoMHhiYiwge2FyZWE6IEFyZWFzLkdvYSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgR29hX0lubiAgICAgICAgICAgICAgICAgID0gJCgweGJjLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4YmRcbiAgcmVhZG9ubHkgR29hX1Rvb2xTaG9wICAgICAgICAgICAgID0gJCgweGJlLCBIT1VTRSk7XG4gIHJlYWRvbmx5IEdvYV9UYXZlcm4gICAgICAgICAgICAgICA9ICQoMHhiZiwgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX0VsZGVySG91c2UgICAgICAgICAgPSAkKDB4YzAsIHthcmVhOiBBcmVhcy5MZWFmLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBMZWFmX1JhYmJpdEh1dCAgICAgICAgICAgPSAkKDB4YzEsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGMyLCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhjMywgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX0FybW9yU2hvcCAgICAgICAgICAgPSAkKDB4YzQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9TdHVkZW50SG91c2UgICAgICAgID0gJCgweGM1LCBIT1VTRSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX1RhdmVybiAgICAgICAgICA9ICQoMHhjNiwge2FyZWE6IEFyZWFzLkJyeW5tYWVyLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBCcnlubWFlcl9QYXduU2hvcCAgICAgICAgPSAkKDB4YzcsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfSW5uICAgICAgICAgICAgID0gJCgweGM4LCBIT1VTRSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX0FybW9yU2hvcCAgICAgICA9ICQoMHhjOSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGNhXG4gIHJlYWRvbmx5IEJyeW5tYWVyX0l0ZW1TaG9wICAgICAgICA9ICQoMHhjYiwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGNjXG4gIHJlYWRvbmx5IE9ha19FbGRlckhvdXNlICAgICAgICAgICA9ICQoMHhjZCwge2FyZWE6IEFyZWFzLk9haywgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgT2FrX01vdGhlckhvdXNlICAgICAgICAgID0gJCgweGNlLCBIT1VTRSk7XG4gIHJlYWRvbmx5IE9ha19Ub29sU2hvcCAgICAgICAgICAgICA9ICQoMHhjZiwgSE9VU0UpO1xuICByZWFkb25seSBPYWtfSW5uICAgICAgICAgICAgICAgICAgPSAkKDB4ZDAsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfSW5uICAgICAgICAgICAgID0gJCgweGQxLCB7YXJlYTogQXJlYXMuQW1hem9uZXMsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0l0ZW1TaG9wICAgICAgICA9ICQoMHhkMiwgSE9VU0UpO1xuICByZWFkb25seSBBbWF6b25lc19Bcm1vclNob3AgICAgICAgPSAkKDB4ZDMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfRWxkZXIgICAgICAgICAgID0gJCgweGQ0LCBIT1VTRSk7XG4gIHJlYWRvbmx5IE5hZGFyZSAgICAgICAgICAgICAgICAgICA9ICQoMHhkNSwge2FyZWE6IEFyZWFzLk5hZGFyZX0pOyAvLyBlZGdlLWRvb3I/XG4gIHJlYWRvbmx5IFBvcnRvYV9GaXNoZXJtYW5Ib3VzZSAgICA9ICQoMHhkNiwge2FyZWE6IEFyZWFzLkZpc2hlcm1hbkhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRSwgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX1BhbGFjZUVudHJhbmNlICAgID0gJCgweGQ3LCB7YXJlYTogQXJlYXMuUG9ydG9hUGFsYWNlfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Gb3J0dW5lVGVsbGVyICAgICA9ICQoMHhkOCwge2FyZWE6IEFyZWFzLlBvcnRvYSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uRk9SVFVORV9URUxMRVJ9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX1Bhd25TaG9wICAgICAgICAgID0gJCgweGQ5LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Bcm1vclNob3AgICAgICAgICA9ICQoMHhkYSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGRiXG4gIHJlYWRvbmx5IFBvcnRvYV9Jbm4gICAgICAgICAgICAgICA9ICQoMHhkYywgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FfVG9vbFNob3AgICAgICAgICAgPSAkKDB4ZGQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hUGFsYWNlX0xlZnQgICAgICAgID0gJCgweGRlLCB7YXJlYTogQXJlYXMuUG9ydG9hUGFsYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRX0pO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfVGhyb25lUm9vbSAgPSAkKDB4ZGYsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hUGFsYWNlX1JpZ2h0ICAgICAgID0gJCgweGUwLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Bc2luYVJvb20gICAgICAgICA9ICQoMHhlMSwge2FyZWE6IEFyZWFzLlVuZGVyZ3JvdW5kQ2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0UsIG11c2ljOiAnYXNpbmEnfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0VsZGVyRG93bnN0YWlycyA9ICQoMHhlMiwge2FyZWE6IEFyZWFzLkFtYXpvbmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRX0pO1xuICByZWFkb25seSBKb2VsX0VsZGVySG91c2UgICAgICAgICAgPSAkKDB4ZTMsIHthcmVhOiBBcmVhcy5Kb2VsLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBKb2VsX1NoZWQgICAgICAgICAgICAgICAgPSAkKDB4ZTQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgSm9lbF9Ub29sU2hvcCAgICAgICAgICAgID0gJCgweGU1LCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4ZTZcbiAgcmVhZG9ubHkgSm9lbF9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGU3LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd25fSG91c2UgICAgICAgICA9ICQoMHhlOCwge2FyZWE6IEFyZWFzLlpvbWJpZVRvd24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd25fSG91c2VCYXNlbWVudCA9ICQoMHhlOSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGVhXG4gIHJlYWRvbmx5IFN3YW5fVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhlYiwge2FyZWE6IEFyZWFzLlN3YW4sIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFN3YW5fU3RvbUh1dCAgICAgICAgICAgICA9ICQoMHhlYywgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX0lubiAgICAgICAgICAgICAgICAgPSAkKDB4ZWQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9Bcm1vclNob3AgICAgICAgICAgID0gJCgweGVlLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fVGF2ZXJuICAgICAgICAgICAgICA9ICQoMHhlZiwgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX1Bhd25TaG9wICAgICAgICAgICAgPSAkKDB4ZjAsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9EYW5jZUhhbGwgICAgICAgICAgID0gJCgweGYxLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9UZW1wbGUgICAgICAgICAgICA9ICQoMHhmMiwge2FyZWE6IEFyZWFzLlNoeXJvblRlbXBsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHg3MH0pO1xuICByZWFkb25seSBTaHlyb25fVHJhaW5pbmdIYWxsICAgICAgPSAkKDB4ZjMsIHthcmVhOiBBcmVhcy5TaHlyb24sIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Ib3NwaXRhbCAgICAgICAgICA9ICQoMHhmNCwgSE9VU0UpO1xuICByZWFkb25seSBTaHlyb25fQXJtb3JTaG9wICAgICAgICAgPSAkKDB4ZjUsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2h5cm9uX1Rvb2xTaG9wICAgICAgICAgID0gJCgweGY2LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Jbm4gICAgICAgICAgICAgICA9ICQoMHhmNywgSE9VU0UpO1xuICByZWFkb25seSBTYWhhcmFfSW5uICAgICAgICAgICAgICAgPSAkKDB4ZjgsIHthcmVhOiBBcmVhcy5TYWhhcmEsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhmOSwgSE9VU0UpO1xuICByZWFkb25seSBTYWhhcmFfRWxkZXJIb3VzZSAgICAgICAgPSAkKDB4ZmEsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2FoYXJhX1Bhd25TaG9wICAgICAgICAgID0gJCgweGZiLCBIT1VTRSk7XG5cbiAgLy8gTmV3IGxvY2F0aW9ucywgbm8gSUQgcHJvY3VyZWQgeWV0LlxuICByZWFkb25seSBFYXN0Q2F2ZTEgICAgICA9ICQoLTEsIHthcmVhOiBBcmVhcy5FYXN0Q2F2ZX0pO1xuICByZWFkb25seSBFYXN0Q2F2ZTIgICAgICA9ICQoLTEpO1xuICByZWFkb25seSBGaXNoZXJtYW5CZWFjaCA9ICQoLTEsIHthcmVhOiBBcmVhcy5GaXNoZXJtYW5Ib3VzZSwgLi4uSE9VU0V9KTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHN1cGVyKDB4MTAwKTtcbiAgICAkLmNvbW1pdCh0aGlzKTtcbiAgICAvLyBGaWxsIGluIGFueSBtaXNzaW5nIG9uZXNcbiAgICBmb3IgKGxldCBpZCA9IDA7IGlkIDwgMHgxMDA7IGlkKyspIHtcbiAgICAgIGlmICh0aGlzW2lkXSkgY29udGludWU7XG4gICAgICB0aGlzW2lkXSA9IG5ldyBMb2NhdGlvbihyb20sIGlkLCB7XG4gICAgICAgIGFyZWE6IEFyZWFzLlVudXNlZCxcbiAgICAgICAgbmFtZTogJycsXG4gICAgICAgIG11c2ljOiAnJyxcbiAgICAgICAgcGFsZXR0ZTogJycsXG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gVE9ETyAtIG1ldGhvZCB0byBhZGQgYW4gdW5yZWdpc3RlcmVkIGxvY2F0aW9uIHRvIGFuIGVtcHR5IGluZGV4LlxuICB9XG5cbiAgYWxsb2NhdGUobG9jYXRpb246IExvY2F0aW9uKTogTG9jYXRpb24ge1xuICAgIC8vIHBpY2sgYW4gdW51c2VkIGxvY2F0aW9uXG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMpIHtcbiAgICAgIGlmIChsLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgKGxvY2F0aW9uIGFzIGFueSkuaWQgPSBsLmlkO1xuICAgICAgbG9jYXRpb24udXNlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpc1tsLmlkXSA9IGxvY2F0aW9uO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHVudXNlZCBsb2NhdGlvbicpO1xuICB9XG5cbiAgLy8gLy8gRmluZCBhbGwgZ3JvdXBzIG9mIG5laWdoYm9yaW5nIGxvY2F0aW9ucyB3aXRoIG1hdGNoaW5nIHByb3BlcnRpZXMuXG4gIC8vIC8vIFRPRE8gLSBvcHRpb25hbCBhcmc6IGNoZWNrIGFkamFjZW50ICMgSURzLi4uP1xuICAvLyBwYXJ0aXRpb248VD4oZnVuYzogKGxvYzogTG9jYXRpb24pID0+IFQsIGVxOiBFcTxUPiA9IChhLCBiKSA9PiBhID09PSBiLCBqb2luTmV4dXNlcyA9IGZhbHNlKTogW0xvY2F0aW9uW10sIFRdW10ge1xuICAvLyAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PExvY2F0aW9uPigpO1xuICAvLyAgIGNvbnN0IG91dDogW0xvY2F0aW9uW10sIFRdW10gPSBbXTtcbiAgLy8gICBmb3IgKGxldCBsb2Mgb2YgdGhpcykge1xuICAvLyAgICAgaWYgKHNlZW4uaGFzKGxvYykgfHwgIWxvYy51c2VkKSBjb250aW51ZTtcbiAgLy8gICAgIHNlZW4uYWRkKGxvYyk7XG4gIC8vICAgICBjb25zdCB2YWx1ZSA9IGZ1bmMobG9jKTtcbiAgLy8gICAgIGNvbnN0IGdyb3VwID0gW107XG4gIC8vICAgICBjb25zdCBxdWV1ZSA9IFtsb2NdO1xuICAvLyAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCkge1xuICAvLyAgICAgICBjb25zdCBuZXh0ID0gcXVldWUucG9wKCkhO1xuICAvLyAgICAgICBncm91cC5wdXNoKG5leHQpO1xuICAvLyAgICAgICBmb3IgKGNvbnN0IG4gb2YgbmV4dC5uZWlnaGJvcnMoam9pbk5leHVzZXMpKSB7XG4gIC8vICAgICAgICAgaWYgKCFzZWVuLmhhcyhuKSAmJiBlcShmdW5jKG4pLCB2YWx1ZSkpIHtcbiAgLy8gICAgICAgICAgIHNlZW4uYWRkKG4pO1xuICAvLyAgICAgICAgICAgcXVldWUucHVzaChuKTtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIG91dC5wdXNoKFtbLi4uZ3JvdXBdLCB2YWx1ZV0pO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gb3V0O1xuICAvLyB9XG59XG5cbi8vIExvY2F0aW9uIGVudGl0aWVzXG5leHBvcnQgY2xhc3MgTG9jYXRpb24gZXh0ZW5kcyBFbnRpdHkge1xuXG4gIHVzZWQ6IGJvb2xlYW47XG5cbiAgYmdtOiBudW1iZXI7XG4gIGxheW91dFdpZHRoOiBudW1iZXI7XG4gIGxheW91dEhlaWdodDogbnVtYmVyO1xuICBhbmltYXRpb246IG51bWJlcjtcbiAgLy8gU2NyZWVuIGluZGljZXMgYXJlIChleHRlbmRlZCA8PCA4IHwgc2NyZWVuKVxuICBleHRlbmRlZDogbnVtYmVyO1xuICBzY3JlZW5zOiBudW1iZXJbXVtdO1xuXG4gIHRpbGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgdGlsZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gIHRpbGVzZXQ6IG51bWJlcjtcbiAgdGlsZUVmZmVjdHM6IG51bWJlcjtcblxuICBlbnRyYW5jZXM6IEVudHJhbmNlW107XG4gIGV4aXRzOiBFeGl0W107XG4gIGZsYWdzOiBGbGFnW107XG4gIHBpdHM6IFBpdFtdO1xuXG4gIHNwcml0ZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzcHJpdGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgc3Bhd25zOiBTcGF3bltdO1xuXG4gIGNvbnN0cnVjdG9yKHJvbTogUm9tLCBpZDogbnVtYmVyLCByZWFkb25seSBkYXRhOiBMb2NhdGlvbkRhdGEpIHtcbiAgICAvLyB3aWxsIGluY2x1ZGUgYm90aCBNYXBEYXRhICphbmQqIE5wY0RhdGEsIHNpbmNlIHRoZXkgc2hhcmUgYSBrZXkuXG4gICAgc3VwZXIocm9tLCBpZCk7XG5cbiAgICBjb25zdCBtYXBEYXRhQmFzZSA9XG4gICAgICAgIGlkID49IDAgPyByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YVBvaW50ZXIpICsgMHhjMDAwIDogMDtcbiAgICAvLyBUT0RPIC0gcGFzcyB0aGlzIGluIGFuZCBtb3ZlIExPQ0FUSU9OUyB0byBsb2NhdGlvbnMudHNcbiAgICB0aGlzLnVzZWQgPSBtYXBEYXRhQmFzZSA+IDB4YzAwMCAmJiAhIXRoaXMubmFtZTtcblxuICAgIGlmICghdGhpcy51c2VkKSB7XG4gICAgICB0aGlzLmJnbSA9IDA7XG4gICAgICB0aGlzLmxheW91dFdpZHRoID0gMDtcbiAgICAgIHRoaXMubGF5b3V0SGVpZ2h0ID0gMDtcbiAgICAgIHRoaXMuYW5pbWF0aW9uID0gMDtcbiAgICAgIHRoaXMuZXh0ZW5kZWQgPSAwO1xuICAgICAgdGhpcy5zY3JlZW5zID0gW1swXV07XG4gICAgICB0aGlzLnRpbGVQYWxldHRlcyA9IFsweDI0LCAweDAxLCAweDI2XTtcbiAgICAgIHRoaXMudGlsZXNldCA9IDB4ODA7XG4gICAgICB0aGlzLnRpbGVFZmZlY3RzID0gMHhiMztcbiAgICAgIHRoaXMudGlsZVBhdHRlcm5zID0gWzIsIDRdO1xuICAgICAgdGhpcy5leGl0cyA9IFtdO1xuICAgICAgdGhpcy5lbnRyYW5jZXMgPSBbXTtcbiAgICAgIHRoaXMuZmxhZ3MgPSBbXTtcbiAgICAgIHRoaXMucGl0cyA9IFtdO1xuICAgICAgdGhpcy5zcGF3bnMgPSBbXTtcbiAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXMgPSBbMCwgMF07XG4gICAgICB0aGlzLnNwcml0ZVBhdHRlcm5zID0gWzAsIDBdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxheW91dEJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlKSArIDB4YzAwMDtcbiAgICBjb25zdCBncmFwaGljc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgMikgKyAweGMwMDA7XG4gICAgY29uc3QgZW50cmFuY2VzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyA0KSArIDB4YzAwMDtcbiAgICBjb25zdCBleGl0c0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgNikgKyAweGMwMDA7XG4gICAgY29uc3QgZmxhZ3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDgpICsgMHhjMDAwO1xuXG4gICAgLy8gUmVhZCB0aGUgZXhpdHMgZmlyc3Qgc28gdGhhdCB3ZSBjYW4gZGV0ZXJtaW5lIGlmIHRoZXJlJ3MgZW50cmFuY2UvcGl0c1xuICAgIC8vIG1ldGFkYXRhIGVuY29kZWQgYXQgdGhlIGVuZC5cbiAgICBsZXQgaGFzUGl0cyA9IHRoaXMudXNlZCAmJiBsYXlvdXRCYXNlICE9PSBtYXBEYXRhQmFzZSArIDEwO1xuICAgIGxldCBlbnRyYW5jZUxlbiA9IGV4aXRzQmFzZSAtIGVudHJhbmNlc0Jhc2U7XG4gICAgdGhpcy5leGl0cyA9ICgoKSA9PiB7XG4gICAgICBjb25zdCBleGl0cyA9IFtdO1xuICAgICAgbGV0IGkgPSBleGl0c0Jhc2U7XG4gICAgICB3aGlsZSAoIShyb20ucHJnW2ldICYgMHg4MCkpIHtcbiAgICAgICAgLy8gTk9URTogc2V0IGRlc3QgdG8gRkYgdG8gZGlzYWJsZSBhbiBleGl0IChpdCdzIGFuIGludmFsaWQgbG9jYXRpb24gYW55d2F5KVxuICAgICAgICBpZiAocm9tLnByZ1tpICsgMl0gIT0gMHhmZikge1xuICAgICAgICAgIGV4aXRzLnB1c2goRXhpdC5mcm9tKHJvbS5wcmcsIGkpKTtcbiAgICAgICAgfVxuICAgICAgICBpICs9IDQ7XG4gICAgICB9XG4gICAgICBpZiAocm9tLnByZ1tpXSAhPT0gMHhmZikge1xuICAgICAgICBoYXNQaXRzID0gISEocm9tLnByZ1tpXSAmIDB4NDApO1xuICAgICAgICBlbnRyYW5jZUxlbiA9IChyb20ucHJnW2ldICYgMHgxZikgPDwgMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBleGl0cztcbiAgICB9KSgpO1xuXG4gICAgLy8gVE9ETyAtIHRoZXNlIGhldXJpc3RpY3Mgd2lsbCBub3Qgd29yayB0byByZS1yZWFkIHRoZSBsb2NhdGlvbnMuXG4gICAgLy8gICAgICAtIHdlIGNhbiBsb29rIGF0IHRoZSBvcmRlcjogaWYgdGhlIGRhdGEgaXMgQkVGT1JFIHRoZSBwb2ludGVyc1xuICAgIC8vICAgICAgICB0aGVuIHdlJ3JlIGluIGEgcmV3cml0dGVuIHN0YXRlOyBpbiB0aGF0IGNhc2UsIHdlIG5lZWQgdG8gc2ltcGx5XG4gICAgLy8gICAgICAgIGZpbmQgYWxsIHJlZnMgYW5kIG1heC4uLj9cbiAgICAvLyAgICAgIC0gY2FuIHdlIHJlYWQgdGhlc2UgcGFydHMgbGF6aWx5P1xuICAgIGNvbnN0IHBpdHNCYXNlID1cbiAgICAgICAgIWhhc1BpdHMgPyAwIDogcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDEwKSArIDB4YzAwMDtcblxuICAgIHRoaXMuYmdtID0gcm9tLnByZ1tsYXlvdXRCYXNlXTtcbiAgICB0aGlzLmxheW91dFdpZHRoID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgMV07XG4gICAgdGhpcy5sYXlvdXRIZWlnaHQgPSByb20ucHJnW2xheW91dEJhc2UgKyAyXTtcbiAgICB0aGlzLmFuaW1hdGlvbiA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDNdO1xuICAgIHRoaXMuZXh0ZW5kZWQgPSByb20ucHJnW2xheW91dEJhc2UgKyA0XTtcbiAgICB0aGlzLnNjcmVlbnMgPSBzZXEoXG4gICAgICAgIHRoaXMuaGVpZ2h0LFxuICAgICAgICB5ID0+IHR1cGxlKHJvbS5wcmcsIGxheW91dEJhc2UgKyA1ICsgeSAqIHRoaXMud2lkdGgsIHRoaXMud2lkdGgpKTtcbiAgICB0aGlzLnRpbGVQYWxldHRlcyA9IHR1cGxlPG51bWJlcj4ocm9tLnByZywgZ3JhcGhpY3NCYXNlLCAzKTtcbiAgICB0aGlzLnRpbGVzZXQgPSByb20ucHJnW2dyYXBoaWNzQmFzZSArIDNdO1xuICAgIHRoaXMudGlsZUVmZmVjdHMgPSByb20ucHJnW2dyYXBoaWNzQmFzZSArIDRdO1xuICAgIHRoaXMudGlsZVBhdHRlcm5zID0gdHVwbGUocm9tLnByZywgZ3JhcGhpY3NCYXNlICsgNSwgMik7XG5cbiAgICB0aGlzLmVudHJhbmNlcyA9XG4gICAgICBncm91cCg0LCByb20ucHJnLnNsaWNlKGVudHJhbmNlc0Jhc2UsIGVudHJhbmNlc0Jhc2UgKyBlbnRyYW5jZUxlbiksXG4gICAgICAgICAgICB4ID0+IEVudHJhbmNlLmZyb20oeCkpO1xuICAgIHRoaXMuZmxhZ3MgPSB2YXJTbGljZShyb20ucHJnLCBmbGFnc0Jhc2UsIDIsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IEZsYWcuZnJvbSh4KSk7XG4gICAgdGhpcy5waXRzID0gcGl0c0Jhc2UgPyB2YXJTbGljZShyb20ucHJnLCBwaXRzQmFzZSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IFBpdC5mcm9tKHgpKSA6IFtdO1xuXG4gICAgY29uc3QgbnBjRGF0YUJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubnBjRGF0YVBvaW50ZXIpICsgMHgxMDAwMDtcbiAgICBjb25zdCBoYXNTcGF3bnMgPSBucGNEYXRhQmFzZSAhPT0gMHgxMDAwMDtcbiAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID1cbiAgICAgICAgaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgbnBjRGF0YUJhc2UgKyAxLCAyKSA6IFswLCAwXTtcbiAgICB0aGlzLnNwcml0ZVBhdHRlcm5zID1cbiAgICAgICAgaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgbnBjRGF0YUJhc2UgKyAzLCAyKSA6IFswLCAwXTtcbiAgICB0aGlzLnNwYXducyA9XG4gICAgICAgIGhhc1NwYXducyA/IHZhclNsaWNlKHJvbS5wcmcsIG5wY0RhdGFCYXNlICsgNSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gU3Bhd24uZnJvbSh4KSkgOiBbXTtcbiAgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5uYW1lO1xuICB9XG5cbiAgZ2V0IG1hcERhdGFQb2ludGVyKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuaWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG1hcGRhdGEgcG9pbnRlciBmb3IgJHt0aGlzLm5hbWV9YCk7XG4gICAgcmV0dXJuIDB4MTQzMDAgKyAodGhpcy5pZCA8PCAxKTtcbiAgfVxuXG4gIGdldCBucGNEYXRhUG9pbnRlcigpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmlkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyBucGNkYXRhIHBvaW50ZXIgZm9yICR7dGhpcy5uYW1lfWApO1xuICAgIHJldHVybiAweDE5MjAxICsgKHRoaXMuaWQgPDwgMSk7XG4gIH1cblxuICBnZXQgaGFzU3Bhd25zKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNwYXducy5sZW5ndGggPiAwO1xuICB9XG5cbiAgLy8gT2Zmc2V0IHRvIE9SIHdpdGggc2NyZWVuIElEcy5cbiAgZ2V0IHNjcmVlblBhZ2UoKTogbnVtYmVyIHtcbiAgICBpZiAoIXRoaXMucm9tLmNvbXByZXNzZWRNYXBEYXRhKSByZXR1cm4gdGhpcy5leHRlbmRlZCA/IDB4MTAwIDogMDtcbiAgICByZXR1cm4gdGhpcy5leHRlbmRlZCA8PCA4O1xuICB9XG5cbiAgaXNTaG9wKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnJvbS5zaG9wcy5maW5kSW5kZXgocyA9PiBzLmxvY2F0aW9uID09PSB0aGlzLmlkKSA+PSAwO1xuICB9XG5cbiAgc3Bhd24oaWQ6IG51bWJlcik6IFNwYXduIHtcbiAgICBjb25zdCBzcGF3biA9IHRoaXMuc3Bhd25zW2lkIC0gMHhkXTtcbiAgICBpZiAoIXNwYXduKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHNwYXduICQke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHNwYXduO1xuICB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmxheW91dFdpZHRoICsgMTsgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlcikgeyB0aGlzLmxheW91dFdpZHRoID0gd2lkdGggLSAxOyB9XG5cbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sYXlvdXRIZWlnaHQgKyAxOyB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHsgdGhpcy5sYXlvdXRIZWlnaHQgPSBoZWlnaHQgLSAxOyB9XG5cbiAgLy8gbW9uc3RlcnMoKSB7XG4gIC8vICAgaWYgKCF0aGlzLnNwYXducykgcmV0dXJuIFtdO1xuICAvLyAgIHJldHVybiB0aGlzLnNwYXducy5mbGF0TWFwKFxuICAvLyAgICAgKFssLCB0eXBlLCBpZF0sIHNsb3QpID0+XG4gIC8vICAgICAgIHR5cGUgJiA3IHx8ICF0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXSA/IFtdIDogW1xuICAvLyAgICAgICAgIFt0aGlzLmlkLFxuICAvLyAgICAgICAgICBzbG90ICsgMHgwZCxcbiAgLy8gICAgICAgICAgdHlwZSAmIDB4ODAgPyAxIDogMCxcbiAgLy8gICAgICAgICAgaWQgKyAweDUwLFxuICAvLyAgICAgICAgICB0aGlzLnNwcml0ZVBhdHRlcm5zW3R5cGUgJiAweDgwID8gMSA6IDBdLFxuICAvLyAgICAgICAgICB0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXS5wYWxldHRlcygpWzBdLFxuICAvLyAgICAgICAgICB0aGlzLnNwcml0ZVBhbGV0dGVzW3RoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdLnBhbGV0dGVzKClbMF0gLSAyXSxcbiAgLy8gICAgICAgICBdXSk7XG4gIC8vIH1cblxuICBhc3luYyB3cml0ZSh3cml0ZXI6IFdyaXRlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy51c2VkKSByZXR1cm47XG4gICAgY29uc3QgcHJvbWlzZXMgPSBbXTtcbiAgICBpZiAoIXRoaXMuc3Bhd25zLmxlbmd0aCkge1xuICAgICAgdGhpcy5zcHJpdGVQYWxldHRlcyA9IFsweGZmLCAweGZmXTtcbiAgICAgIHRoaXMuc3ByaXRlUGF0dGVybnMgPSBbMHhmZiwgMHhmZl07XG4gICAgfVxuICAgIC8vIHdyaXRlIE5QQyBkYXRhIGZpcnN0LCBpZiBwcmVzZW50Li4uXG4gICAgY29uc3QgZGF0YSA9IFswLCAuLi50aGlzLnNwcml0ZVBhbGV0dGVzLCAuLi50aGlzLnNwcml0ZVBhdHRlcm5zLFxuICAgICAgICAgICAgICAgICAgLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuc3Bhd25zKSwgMHhmZl07XG4gICAgcHJvbWlzZXMucHVzaChcbiAgICAgICAgd3JpdGVyLndyaXRlKGRhdGEsIDB4MTgwMDAsIDB4MWJmZmYsIGBOcGNEYXRhICR7aGV4KHRoaXMuaWQpfWApXG4gICAgICAgICAgICAudGhlbihhZGRyZXNzID0+IHdyaXRlTGl0dGxlRW5kaWFuKFxuICAgICAgICAgICAgICAgIHdyaXRlci5yb20sIHRoaXMubnBjRGF0YVBvaW50ZXIsIGFkZHJlc3MgLSAweDEwMDAwKSkpO1xuICAgIGNvbnN0IHdyaXRlID0gKGRhdGE6IERhdGE8bnVtYmVyPiwgbmFtZTogc3RyaW5nKSA9PlxuICAgICAgICB3cml0ZXIud3JpdGUoZGF0YSwgMHgxNDAwMCwgMHgxN2ZmZiwgYCR7bmFtZX0gJHtoZXgodGhpcy5pZCl9YCk7XG4gICAgY29uc3QgbGF5b3V0ID0gdGhpcy5yb20uY29tcHJlc3NlZE1hcERhdGEgPyBbXG4gICAgICB0aGlzLmJnbSxcbiAgICAgIC8vIENvbXByZXNzZWQgdmVyc2lvbjogeXggaW4gb25lIGJ5dGUsIGV4dCthbmltIGluIG9uZSBieXRlXG4gICAgICB0aGlzLmxheW91dEhlaWdodCA8PCA0IHwgdGhpcy5sYXlvdXRXaWR0aCxcbiAgICAgIHRoaXMuZXh0ZW5kZWQgPDwgMiB8IHRoaXMuYW5pbWF0aW9uLFxuICAgICAgLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuc2NyZWVucyksXG4gICAgXSA6IFtcbiAgICAgIHRoaXMuYmdtLFxuICAgICAgdGhpcy5sYXlvdXRXaWR0aCwgdGhpcy5sYXlvdXRIZWlnaHQsIHRoaXMuYW5pbWF0aW9uLCB0aGlzLmV4dGVuZGVkLFxuICAgICAgLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuc2NyZWVucyksXG4gICAgXTtcbiAgICBjb25zdCBncmFwaGljcyA9XG4gICAgICAgIFsuLi50aGlzLnRpbGVQYWxldHRlcyxcbiAgICAgICAgIHRoaXMudGlsZXNldCwgdGhpcy50aWxlRWZmZWN0cyxcbiAgICAgICAgIC4uLnRoaXMudGlsZVBhdHRlcm5zXTtcbiAgICAvLyBRdWljayBzYW5pdHkgY2hlY2s6IGlmIGFuIGVudHJhbmNlL2V4aXQgaXMgYmVsb3cgdGhlIEhVRCBvbiBhXG4gICAgLy8gbm9uLXZlcnRpY2FsbHkgc2Nyb2xsaW5nIG1hcCwgdGhlbiB3ZSBuZWVkIHRvIG1vdmUgaXQgdXAuXG4gICAgaWYgKHRoaXMuaGVpZ2h0ID09PSAxKSB7XG4gICAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICAgIGlmICghZW50cmFuY2UudXNlZCkgY29udGludWU7XG4gICAgICAgIGlmIChlbnRyYW5jZS55ID4gMHhiZikgZW50cmFuY2UueSA9IDB4YmY7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0cykge1xuICAgICAgICBpZiAoZXhpdC55dCA+IDB4MGMpIGV4aXQueXQgPSAweDBjO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBlbnRyYW5jZXMgPSBjb25jYXRJdGVyYWJsZXModGhpcy5lbnRyYW5jZXMpO1xuICAgIGNvbnN0IGV4aXRzID0gWy4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmV4aXRzKSxcbiAgICAgICAgICAgICAgICAgICAweDgwIHwgKHRoaXMucGl0cy5sZW5ndGggPyAweDQwIDogMCkgfCB0aGlzLmVudHJhbmNlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICBdO1xuICAgIGNvbnN0IGZsYWdzID0gWy4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmZsYWdzKSwgMHhmZl07XG4gICAgY29uc3QgcGl0cyA9IGNvbmNhdEl0ZXJhYmxlcyh0aGlzLnBpdHMpO1xuICAgIGNvbnN0IFtsYXlvdXRBZGRyLCBncmFwaGljc0FkZHIsIGVudHJhbmNlc0FkZHIsIGV4aXRzQWRkciwgZmxhZ3NBZGRyLCBwaXRzQWRkcl0gPVxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgd3JpdGUobGF5b3V0LCAnTGF5b3V0JyksXG4gICAgICAgICAgd3JpdGUoZ3JhcGhpY3MsICdHcmFwaGljcycpLFxuICAgICAgICAgIHdyaXRlKGVudHJhbmNlcywgJ0VudHJhbmNlcycpLFxuICAgICAgICAgIHdyaXRlKGV4aXRzLCAnRXhpdHMnKSxcbiAgICAgICAgICB3cml0ZShmbGFncywgJ0ZsYWdzJyksXG4gICAgICAgICAgLi4uKHBpdHMubGVuZ3RoID8gW3dyaXRlKHBpdHMsICdQaXRzJyldIDogW10pLFxuICAgICAgICBdKTtcbiAgICBjb25zdCBhZGRyZXNzZXMgPSBbXG4gICAgICBsYXlvdXRBZGRyICYgMHhmZiwgKGxheW91dEFkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGdyYXBoaWNzQWRkciAmIDB4ZmYsIChncmFwaGljc0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGVudHJhbmNlc0FkZHIgJiAweGZmLCAoZW50cmFuY2VzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZXhpdHNBZGRyICYgMHhmZiwgKGV4aXRzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZmxhZ3NBZGRyICYgMHhmZiwgKGZsYWdzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgLi4uKHBpdHNBZGRyID8gW3BpdHNBZGRyICYgMHhmZiwgKHBpdHNBZGRyID4+IDgpIC0gMHhjMF0gOiBbXSksXG4gICAgXTtcbiAgICBjb25zdCBiYXNlID0gYXdhaXQgd3JpdGUoYWRkcmVzc2VzLCAnTWFwRGF0YScpO1xuICAgIHdyaXRlTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIHRoaXMubWFwRGF0YVBvaW50ZXIsIGJhc2UgLSAweGMwMDApO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBib3NzIHJvb20sIHdyaXRlIHRoZSByZXN0b3JhdGlvbi5cbiAgICBjb25zdCBib3NzSWQgPSB0aGlzLmJvc3NJZCgpO1xuICAgIGlmIChib3NzSWQgIT0gbnVsbCAmJiB0aGlzLmlkICE9PSAweDVmKSB7IC8vIGRvbid0IHJlc3RvcmUgZHluYVxuICAgICAgLy8gVGhpcyB0YWJsZSBzaG91bGQgcmVzdG9yZSBwYXQwIGJ1dCBub3QgcGF0MVxuICAgICAgbGV0IHBhdHMgPSBbdGhpcy5zcHJpdGVQYXR0ZXJuc1swXSwgdW5kZWZpbmVkXTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweGE2KSBwYXRzID0gWzB4NTMsIDB4NTBdOyAvLyBkcmF5Z29uIDJcbiAgICAgIGNvbnN0IGJvc3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCAweDFmOTZiICsgMiAqIGJvc3NJZCkgKyAweDE0MDAwO1xuICAgICAgLy8gU2V0IHRoZSBcInJlc3RvcmUgbXVzaWNcIiBieXRlIGZvciB0aGUgYm9zcywgYnV0IGlmIGl0J3MgRHJheWdvbiAyLCBzZXRcbiAgICAgIC8vIGl0IHRvIHplcm8gc2luY2Ugbm8gbXVzaWMgaXMgYWN0dWFsbHkgcGxheWluZywgYW5kIGlmIHRoZSBtdXNpYyBpbiB0aGVcbiAgICAgIC8vIHRlbGVwb3J0ZXIgcm9vbSBoYXBwZW5zIHRvIGJlIHRoZSBzYW1lIGFzIHRoZSBtdXNpYyBpbiB0aGUgY3J5cHQsIHRoZW5cbiAgICAgIC8vIHJlc2V0dGluZyB0byB0aGF0IG1lYW5zIGl0IHdpbGwganVzdCByZW1haW4gc2lsZW50LCBhbmQgbm90IHJlc3RhcnQuXG4gICAgICBjb25zdCByZXN0b3JlQmdtID0gdGhpcy5pZCA9PT0gMHhhNiA/IDAgOiB0aGlzLmJnbTtcbiAgICAgIGNvbnN0IGJvc3NSZXN0b3JlID0gW1xuICAgICAgICAsLCwgcmVzdG9yZUJnbSwsXG4gICAgICAgIC4uLnRoaXMudGlsZVBhbGV0dGVzLCwsLCB0aGlzLnNwcml0ZVBhbGV0dGVzWzBdLCxcbiAgICAgICAgLCwsLCAvKnBhdHNbMF0qLywgLypwYXRzWzFdKi8sXG4gICAgICAgIHRoaXMuYW5pbWF0aW9uLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IFtdID0gW3BhdHNdOyAvLyBhdm9pZCBlcnJvclxuXG4gICAgICAvLyBpZiAocmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBib3NzQmFzZSkgPT09IDB4YmE5OCkge1xuICAgICAgLy8gICAvLyBlc2NhcGUgYW5pbWF0aW9uOiBkb24ndCBjbG9iYmVyIHBhdHRlcm5zIHlldD9cbiAgICAgIC8vIH1cbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYm9zc1Jlc3RvcmUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgY29uc3QgcmVzdG9yZWQgPSBib3NzUmVzdG9yZVtqXTtcbiAgICAgICAgaWYgKHJlc3RvcmVkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICB3cml0ZXIucm9tW2Jvc3NCYXNlICsgal0gPSByZXN0b3JlZDtcbiAgICAgIH1cbiAgICAgIC8vIGxhdGVyIHNwb3QgZm9yIHBhbDMgYW5kIHBhdDEgKmFmdGVyKiBleHBsb3Npb25cbiAgICAgIGNvbnN0IGJvc3NCYXNlMiA9IDB4MWY3YzEgKyA1ICogYm9zc0lkO1xuICAgICAgd3JpdGVyLnJvbVtib3NzQmFzZTJdID0gdGhpcy5zcHJpdGVQYWxldHRlc1sxXTtcbiAgICAgIC8vIE5PVEU6IFRoaXMgcnVpbnMgdGhlIHRyZWFzdXJlIGNoZXN0LlxuICAgICAgLy8gVE9ETyAtIGFkZCBzb21lIGFzbSBhZnRlciBhIGNoZXN0IGlzIGNsZWFyZWQgdG8gcmVsb2FkIHBhdHRlcm5zP1xuICAgICAgLy8gQW5vdGhlciBvcHRpb24gd291bGQgYmUgdG8gYWRkIGEgbG9jYXRpb24tc3BlY2lmaWMgY29udHJhaW50IHRvIGJlXG4gICAgICAvLyB3aGF0ZXZlciB0aGUgYm9zcyBcbiAgICAgIC8vd3JpdGVyLnJvbVtib3NzQmFzZTIgKyAxXSA9IHRoaXMuc3ByaXRlUGF0dGVybnNbMV07XG4gICAgfVxuICB9XG5cbiAgYWxsU2NyZWVucygpOiBTZXQ8U2NyZWVuPiB7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBTZXQ8U2NyZWVuPigpO1xuICAgIGNvbnN0IGV4dCA9IHRoaXMuc2NyZWVuUGFnZTtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHJvdykge1xuICAgICAgICBzY3JlZW5zLmFkZCh0aGlzLnJvbS5zY3JlZW5zW3NjcmVlbiArIGV4dF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2NyZWVucztcbiAgfVxuXG4gIGJvc3NJZCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgwZTsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5yb20ucHJnWzB4MWY5NWQgKyBpXSA9PT0gdGhpcy5pZCkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBuZWlnaGJvcnMoam9pbk5leHVzZXM6IGJvb2xlYW4gPSBmYWxzZSk6IFNldDxMb2NhdGlvbj4ge1xuICAvLyAgIGNvbnN0IG91dCA9IG5ldyBTZXQ8TG9jYXRpb24+KCk7XG4gIC8vICAgY29uc3QgYWRkTmVpZ2hib3JzID0gKGw6IExvY2F0aW9uKSA9PiB7XG4gIC8vICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbC5leGl0cykge1xuICAvLyAgICAgICBjb25zdCBpZCA9IGV4aXQuZGVzdDtcbiAgLy8gICAgICAgY29uc3QgbmVpZ2hib3IgPSB0aGlzLnJvbS5sb2NhdGlvbnNbaWRdO1xuICAvLyAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IudXNlZCAmJlxuICAvLyAgICAgICAgICAgbmVpZ2hib3IgIT09IHRoaXMgJiYgIW91dC5oYXMobmVpZ2hib3IpKSB7XG4gIC8vICAgICAgICAgb3V0LmFkZChuZWlnaGJvcik7XG4gIC8vICAgICAgICAgaWYgKGpvaW5OZXh1c2VzICYmIE5FWFVTRVNbbmVpZ2hib3Iua2V5XSkge1xuICAvLyAgICAgICAgICAgYWRkTmVpZ2hib3JzKG5laWdoYm9yKTtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgYWRkTmVpZ2hib3JzKHRoaXMpO1xuICAvLyAgIHJldHVybiBvdXQ7XG4gIC8vIH1cblxuICBoYXNEb2xwaGluKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlkID09PSAweDYwIHx8IHRoaXMuaWQgPT09IDB4NjQgfHwgdGhpcy5pZCA9PT0gMHg2ODtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIE1hcCBvZiB0aWxlcyAoJFlYeXgpIHJlYWNoYWJsZSBmcm9tIGFueSBlbnRyYW5jZSB0b1xuICAgKiB1bmZsYWdnZWQgdGlsZWVmZmVjdHMuXG4gICAqL1xuICByZWFjaGFibGVUaWxlcyhmbHkgPSBmYWxzZSk6IE1hcDxudW1iZXIsIG51bWJlcj4ge1xuICAgIC8vIFRPRE8gLSBhcmdzIGZvciAoMSkgdXNlIG5vbi0yZWYgZmxhZ3MsICgyKSBvbmx5IGZyb20gZ2l2ZW4gZW50cmFuY2UvdGlsZVxuICAgIC8vIERvbHBoaW4gbWFrZXMgTk9fV0FMSyBva2F5IGZvciBzb21lIGxldmVscy5cbiAgICBpZiAodGhpcy5oYXNEb2xwaGluKCkpIGZseSA9IHRydWU7XG4gICAgLy8gVGFrZSBpbnRvIGFjY291bnQgdGhlIHRpbGVzZXQgYW5kIGZsYWdzIGJ1dCBub3QgYW55IG92ZXJsYXkuXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgU2V0KHRoaXMuZXhpdHMubWFwKGV4aXQgPT4gZXhpdC5zY3JlZW4gPDwgOCB8IGV4aXQudGlsZSkpO1xuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxudW1iZXI+KCk7XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXRzW3RoaXMudGlsZXNldF07XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1t0aGlzLnRpbGVFZmZlY3RzIC0gMHhiM107XG4gICAgY29uc3QgcGFzc2FibGUgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IHRoaXMuc2NyZWVuc1t5XTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbcm93W3hdIHwgdGhpcy5zY3JlZW5QYWdlXTtcbiAgICAgICAgY29uc3QgcG9zID0geSA8PCA0IHwgeDtcbiAgICAgICAgY29uc3QgZmxhZyA9IHRoaXMuZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBwb3MpO1xuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDB4ZjA7IHQrKykge1xuICAgICAgICAgIGNvbnN0IHRpbGVJZCA9IHBvcyA8PCA4IHwgdDtcbiAgICAgICAgICBpZiAoZXhpdHMuaGFzKHRpbGVJZCkpIGNvbnRpbnVlOyAvLyBkb24ndCBnbyBwYXN0IGV4aXRzXG4gICAgICAgICAgbGV0IHRpbGUgPSBzY3JlZW4udGlsZXNbdF07XG4gICAgICAgICAgLy8gZmxhZyAyZWYgaXMgXCJhbHdheXMgb25cIiwgZG9uJ3QgZXZlbiBib3RoZXIgbWFraW5nIGl0IGNvbmRpdGlvbmFsLlxuICAgICAgICAgIGxldCBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICBsZXQgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgaWYgKGZsYWcgJiYgYmxvY2tlZCAmJiB0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT0gdGlsZSkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICAgIGVmZmVjdHMgPSB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgICAgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYmxvY2tlZCkgcGFzc2FibGUuYWRkKHRpbGVJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCB0IG9mIHBhc3NhYmxlKSB7XG4gICAgICBjb25zdCByaWdodCA9ICh0ICYgMHgwZikgPT09IDB4MGYgPyB0ICsgMHhmMSA6IHQgKyAxO1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhyaWdodCkpIHVmLnVuaW9uKFt0LCByaWdodF0pO1xuICAgICAgY29uc3QgYmVsb3cgPSAodCAmIDB4ZjApID09PSAweGUwID8gdCArIDB4ZjIwIDogdCArIDE2O1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhiZWxvdykpIHVmLnVuaW9uKFt0LCBiZWxvd10pO1xuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IHVmLm1hcCgpO1xuICAgIGNvbnN0IHNldHMgPSBuZXcgU2V0PFNldDxudW1iZXI+PigpO1xuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgIGlmICghZW50cmFuY2UudXNlZCkgY29udGludWU7XG4gICAgICBjb25zdCBpZCA9IGVudHJhbmNlLnNjcmVlbiA8PCA4IHwgZW50cmFuY2UudGlsZTtcbiAgICAgIC8vIE5PVEU6IG1hcCBzaG91bGQgYWx3YXlzIGhhdmUgaWQsIGJ1dCBib2d1cyBlbnRyYW5jZXNcbiAgICAgIC8vIChlLmcuIEdvYSBWYWxsZXkgZW50cmFuY2UgMikgY2FuIGNhdXNlIHByb2JsZW1zLlxuICAgICAgc2V0cy5hZGQobWFwLmdldChpZCkgfHwgbmV3IFNldCgpKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXQgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHNldHMpIHtcbiAgICAgIGZvciAoY29uc3QgdCBvZiBzZXQpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweDBmXTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tzY3IgfCB0aGlzLnNjcmVlblBhZ2VdO1xuICAgICAgICBvdXQuc2V0KHQsIHRpbGVFZmZlY3RzLmVmZmVjdHNbc2NyZWVuLnRpbGVzW3QgJiAweGZmXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgLyoqIFNhZmVyIHZlcnNpb24gb2YgdGhlIGJlbG93PyAqL1xuICBzY3JlZW5Nb3ZlcigpOiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHZvaWQge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgQXJyYXk8e3NjcmVlbjogbnVtYmVyfT4+KCgpID0+IFtdKTtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgbWFwLmdldChvYmouc2NyZWVuKS5wdXNoKG9iaik7XG4gICAgfVxuICAgIHJldHVybiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHtcbiAgICAgIGZvciAoY29uc3Qgb2JqIG9mIG1hcC5nZXQob3JpZykpIHtcbiAgICAgICAgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbGwgc3Bhd25zLCBlbnRyYW5jZXMsIGFuZCBleGl0cy5cbiAgICogQHBhcmFtIG9yaWcgWVggb2YgdGhlIG9yaWdpbmFsIHNjcmVlbi5cbiAgICogQHBhcmFtIHJlcGwgWVggb2YgdGhlIGVxdWl2YWxlbnQgcmVwbGFjZW1lbnQgc2NyZWVuLlxuICAgKi9cbiAgbW92ZVNjcmVlbihvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IG9ianMgPVxuICAgICAgICBpdGVycy5jb25jYXQ8e3NjcmVlbjogbnVtYmVyfT4odGhpcy5zcGF3bnMsIHRoaXMuZXhpdHMsIHRoaXMuZW50cmFuY2VzKTtcbiAgICBmb3IgKGNvbnN0IG9iaiBvZiBvYmpzKSB7XG4gICAgICBpZiAob2JqLnNjcmVlbiA9PT0gb3JpZykgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgfVxuICB9XG5cbiAgLy8gVE9ETyAtIGZhY3RvciB0aGlzIG91dCBpbnRvIGEgc2VwYXJhdGUgY2xhc3M/XG4gIC8vICAgLSBob2xkcyBtZXRhZGF0YSBhYm91dCBtYXAgdGlsZXMgaW4gZ2VuZXJhbD9cbiAgLy8gICAtIG5lZWQgdG8gZmlndXJlIG91dCB3aGF0IHRvIGRvIHdpdGggcGl0cy4uLlxuICBtb25zdGVyUGxhY2VyKHJhbmRvbTogUmFuZG9tKTogKG06IE1vbnN0ZXIpID0+IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgLy8gSWYgdGhlcmUncyBhIGJvc3Mgc2NyZWVuLCBleGNsdWRlIGl0IGZyb20gZ2V0dGluZyBlbmVtaWVzLlxuICAgIGNvbnN0IGJvc3MgPSB0aGlzLmRhdGEuYm9zc1NjcmVlbjtcbiAgICAvLyBTdGFydCB3aXRoIGxpc3Qgb2YgcmVhY2hhYmxlIHRpbGVzLlxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IHRoaXMucmVhY2hhYmxlVGlsZXMoZmFsc2UpO1xuICAgIC8vIERvIGEgYnJlYWR0aC1maXJzdCBzZWFyY2ggb2YgYWxsIHRpbGVzIHRvIGZpbmQgXCJkaXN0YW5jZVwiICgxLW5vcm0pLlxuICAgIGNvbnN0IGV4dGVuZGVkID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oWy4uLnJlYWNoYWJsZS5rZXlzKCldLm1hcCh4ID0+IFt4LCAwXSkpO1xuICAgIGNvbnN0IG5vcm1hbDogbnVtYmVyW10gPSBbXTsgLy8gcmVhY2hhYmxlLCBub3Qgc2xvcGUgb3Igd2F0ZXJcbiAgICBjb25zdCBtb3RoczogbnVtYmVyW10gPSBbXTsgIC8vIGRpc3RhbmNlIOKIiCAzLi43XG4gICAgY29uc3QgYmlyZHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSA+IDEyXG4gICAgY29uc3QgcGxhbnRzOiBudW1iZXJbXSA9IFtdOyAvLyBkaXN0YW5jZSDiiIggMi4uNFxuICAgIGNvbnN0IHBsYWNlZDogQXJyYXk8W01vbnN0ZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IG5vcm1hbFRlcnJhaW5NYXNrID0gdGhpcy5oYXNEb2xwaGluKCkgPyAweDI1IDogMHgyNztcbiAgICBmb3IgKGNvbnN0IFt0LCBkaXN0YW5jZV0gb2YgZXh0ZW5kZWQpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHhmXTtcbiAgICAgIGlmIChzY3IgPT09IGJvc3MpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBuIG9mIG5laWdoYm9ycyh0LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCkpIHtcbiAgICAgICAgaWYgKGV4dGVuZGVkLmhhcyhuKSkgY29udGludWU7XG4gICAgICAgIGV4dGVuZGVkLnNldChuLCBkaXN0YW5jZSArIDEpO1xuICAgICAgfVxuICAgICAgaWYgKCFkaXN0YW5jZSAmJiAhKHJlYWNoYWJsZS5nZXQodCkhICYgbm9ybWFsVGVycmFpbk1hc2spKSBub3JtYWwucHVzaCh0KTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweDFhKSB7XG4gICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgc3dhbXAgZm9yIHBsYW50IHBsYWNlbWVudFxuICAgICAgICBpZiAodGhpcy5yb20uc2NyZWVuc1tzY3JdLnRpbGVzW3QgJiAweGZmXSA9PT0gMHhmMCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZGlzdGFuY2UgPj0gMiAmJiBkaXN0YW5jZSA8PSA0KSBwbGFudHMucHVzaCh0KTtcbiAgICAgIH1cbiAgICAgIGlmIChkaXN0YW5jZSA+PSAzICYmIGRpc3RhbmNlIDw9IDcpIG1vdGhzLnB1c2godCk7XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMTIpIGJpcmRzLnB1c2godCk7XG4gICAgICAvLyBUT0RPIC0gc3BlY2lhbC1jYXNlIHN3YW1wIGZvciBwbGFudCBsb2NhdGlvbnM/XG4gICAgfVxuICAgIC8vIFdlIG5vdyBrbm93IGFsbCB0aGUgcG9zc2libGUgcGxhY2VzIHRvIHBsYWNlIHRoaW5ncy5cbiAgICAvLyAgLSBOT1RFOiBzdGlsbCBuZWVkIHRvIG1vdmUgY2hlc3RzIHRvIGRlYWQgZW5kcywgZXRjP1xuICAgIHJldHVybiAobTogTW9uc3RlcikgPT4ge1xuICAgICAgLy8gY2hlY2sgZm9yIHBsYWNlbWVudC5cbiAgICAgIGNvbnN0IHBsYWNlbWVudCA9IG0ucGxhY2VtZW50KCk7XG4gICAgICBjb25zdCBwb29sID0gWy4uLihwbGFjZW1lbnQgPT09ICdub3JtYWwnID8gbm9ybWFsIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ21vdGgnID8gbW90aHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnYmlyZCcgPyBiaXJkcyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdwbGFudCcgPyBwbGFudHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0TmV2ZXIocGxhY2VtZW50KSldXG4gICAgICBQT09MOlxuICAgICAgd2hpbGUgKHBvb2wubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGkgPSByYW5kb20ubmV4dEludChwb29sLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IFtwb3NdID0gcG9vbC5zcGxpY2UoaSwgMSk7XG5cbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYwMCkgPj4+IDQgfCAocG9zICYgMHhmKTtcbiAgICAgICAgY29uc3QgeSA9IChwb3MgJiAweGYwMDApID4+PiA4IHwgKHBvcyAmIDB4ZjApID4+PiA0O1xuICAgICAgICBjb25zdCByID0gbS5jbGVhcmFuY2UoKTtcblxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gb3RoZXIgZW5lbWllcy5cbiAgICAgICAgZm9yIChjb25zdCBbLCB4MSwgeTEsIHIxXSBvZiBwbGFjZWQpIHtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtIHkxKSAqKiAyICsgKHggLSB4MSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyByMSkgKiogMikgY29udGludWUgUE9PTDtcbiAgICAgICAgfVxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gZW50cmFuY2VzLlxuICAgICAgICBmb3IgKGNvbnN0IHt4OiB4MSwgeTogeTEsIHVzZWR9IG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICAgICAgaWYgKCF1c2VkKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtICh5MSA+PiA0KSkgKiogMiArICh4IC0gKHgxID4+IDQpKSAqKiAyKTtcbiAgICAgICAgICBpZiAoejIgPCAociArIDEpICoqIDIpIGNvbnRpbnVlIFBPT0w7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZCBzcG90IChzdGlsbCwgaG93IHRvYSBhcHByb3hpbWF0ZWx5ICptYXhpbWl6ZSogZGlzdGFuY2VzPylcbiAgICAgICAgcGxhY2VkLnB1c2goW20sIHgsIHksIHJdKTtcbiAgICAgICAgY29uc3Qgc2NyID0gKHkgJiAweGYwKSB8ICh4ICYgMHhmMCkgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHRpbGUgPSAoeSAmIDB4MGYpIDw8IDQgfCAoeCAmIDB4MGYpO1xuICAgICAgICByZXR1cm4gc2NyIDw8IDggfCB0aWxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbiAgLy8gVE9ETyAtIGFsbG93IGxlc3MgcmFuZG9tbmVzcyBmb3IgY2VydGFpbiBjYXNlcywgZS5nLiB0b3Agb2Ygbm9ydGggc2FicmUgb3JcbiAgLy8gYXBwcm9wcmlhdGUgc2lkZSBvZiBjb3JkZWwuXG5cbiAgLyoqIEByZXR1cm4geyFTZXQ8bnVtYmVyPn0gKi9cbiAgLy8gYWxsVGlsZXMoKSB7XG4gIC8vICAgY29uc3QgdGlsZXMgPSBuZXcgU2V0KCk7XG4gIC8vICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5zY3JlZW5zKSB7XG4gIC8vICAgICBmb3IgKGNvbnN0IHRpbGUgb2Ygc2NyZWVuLmFsbFRpbGVzKCkpIHtcbiAgLy8gICAgICAgdGlsZXMuYWRkKHRpbGUpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gdGlsZXM7XG4gIC8vIH1cblxuXG4gIC8vIFRPRE8gLSB1c2UgbWV0YXNjcmVlbiBmb3IgdGhpcyBsYXRlclxuICByZXNpemVTY3JlZW5zKHRvcDogbnVtYmVyLCBsZWZ0OiBudW1iZXIsIGJvdHRvbTogbnVtYmVyLCByaWdodDogbnVtYmVyKSB7XG4gICAgY29uc3QgbmV3V2lkdGggPSB0aGlzLndpZHRoICsgbGVmdCArIHJpZ2h0O1xuICAgIGNvbnN0IG5ld0hlaWdodCA9IHRoaXMuaGVpZ2h0ICsgdG9wICsgYm90dG9tO1xuICAgIGNvbnN0IG5ld1NjcmVlbnMgPSBBcnJheS5mcm9tKHtsZW5ndGg6IG5ld0hlaWdodH0sIChfLCB5KSA9PiB7XG4gICAgICB5IC09IHRvcDtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKHtsZW5ndGg6IG5ld1dpZHRofSwgKF8sIHgpID0+IHtcbiAgICAgICAgeCAtPSBsZWZ0O1xuICAgICAgICBpZiAoeSA8IDAgfHwgeCA8IDAgfHwgeSA+PSB0aGlzLmhlaWdodCB8fCB4ID49IHRoaXMud2lkdGgpIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gdGhpcy5zY3JlZW5zW3ldW3hdO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy53aWR0aCA9IG5ld1dpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gbmV3SGVpZ2h0O1xuICAgIHRoaXMuc2NyZWVucyA9IG5ld1NjcmVlbnM7XG4gICAgLy8gVE9ETyAtIGlmIGFueSBvZiB0aGVzZSBnbyBuZWdhdGl2ZSwgd2UncmUgaW4gdHJvdWJsZS4uLlxuICAgIC8vIFByb2JhYmx5IHRoZSBiZXN0IGJldCB3b3VsZCBiZSB0byBwdXQgYSBjaGVjayBpbiB0aGUgc2V0dGVyP1xuICAgIGZvciAoY29uc3QgZiBvZiB0aGlzLmZsYWdzKSB7XG4gICAgICBmLnhzICs9IGxlZnQ7XG4gICAgICBmLnlzICs9IHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwIG9mIHRoaXMucGl0cykge1xuICAgICAgcC5mcm9tWHMgKz0gbGVmdDtcbiAgICAgIHAuZnJvbVlzICs9IHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzIG9mIFsuLi50aGlzLnNwYXducywgLi4udGhpcy5leGl0c10pIHtcbiAgICAgIHMueHQgKz0gMTYgKiBsZWZ0O1xuICAgICAgcy55dCArPSAxNiAqIHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICBpZiAoIWUudXNlZCkgY29udGludWU7XG4gICAgICBlLnggKz0gMjU2ICogbGVmdDtcbiAgICAgIGUueSArPSAyNTYgKiB0b3A7XG4gICAgfVxuICB9XG5cbiAgd3JpdGVTY3JlZW5zMmQoc3RhcnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgZGF0YTogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PG51bWJlciB8IG51bGw+Pikge1xuICAgIGNvbnN0IHgwID0gc3RhcnQgJiAweGY7XG4gICAgY29uc3QgeTAgPSBzdGFydCA+Pj4gNDtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGRhdGEubGVuZ3RoOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGRhdGFbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHJvdy5sZW5ndGg7IHgrKykge1xuICAgICAgICBjb25zdCB0aWxlID0gcm93W3hdO1xuICAgICAgICBpZiAodGlsZSAhPSBudWxsKSB0aGlzLnNjcmVlbnNbeTAgKyB5XVt4MCArIHhdID0gdGlsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb25uZWN0IHR3byBzY3JlZW5zIHZpYSBlbnRyYW5jZXMuXG4gIC8vIEFzc3VtZXMgZXhpdHMgYW5kIGVudHJhbmNlcyBhcmUgY29tcGxldGVseSBhYnNlbnQuXG4gIC8vIFNjcmVlbiBJRHMgbXVzdCBiZSBpbiBzY3JlZW5FeGl0cy5cbiAgY29ubmVjdChwb3M6IG51bWJlciwgdGhhdDogTG9jYXRpb24sIHRoYXRQb3M6IG51bWJlcikge1xuICAgIGNvbnN0IHRoaXNZID0gcG9zID4+PiA0O1xuICAgIGNvbnN0IHRoaXNYID0gcG9zICYgMHhmO1xuICAgIGNvbnN0IHRoYXRZID0gdGhhdFBvcyA+Pj4gNDtcbiAgICBjb25zdCB0aGF0WCA9IHRoYXRQb3MgJiAweGY7XG4gICAgY29uc3QgdGhpc1RpbGUgPSB0aGlzLnNjcmVlbnNbdGhpc1ldW3RoaXNYXTtcbiAgICBjb25zdCB0aGF0VGlsZSA9IHRoYXQuc2NyZWVuc1t0aGF0WV1bdGhhdFhdO1xuICAgIGNvbnN0IFt0aGlzRW50cmFuY2UsIHRoaXNFeGl0c10gPSBzY3JlZW5FeGl0c1t0aGlzVGlsZV07XG4gICAgY29uc3QgW3RoYXRFbnRyYW5jZSwgdGhhdEV4aXRzXSA9IHNjcmVlbkV4aXRzW3RoYXRUaWxlXTtcbiAgICBjb25zdCB0aGlzRW50cmFuY2VJbmRleCA9IHRoaXMuZW50cmFuY2VzLmxlbmd0aDtcbiAgICBjb25zdCB0aGF0RW50cmFuY2VJbmRleCA9IHRoYXQuZW50cmFuY2VzLmxlbmd0aDtcbiAgICB0aGlzLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt5OiB0aGlzWSA8PCA4IHwgdGhpc0VudHJhbmNlID4+PiA4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHRoaXNYIDw8IDggfCB0aGlzRW50cmFuY2UgJiAweGZmfSkpO1xuICAgIHRoYXQuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3k6IHRoYXRZIDw8IDggfCB0aGF0RW50cmFuY2UgPj4+IDgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogdGhhdFggPDwgOCB8IHRoYXRFbnRyYW5jZSAmIDB4ZmZ9KSk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXNFeGl0cykge1xuICAgICAgdGhpcy5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbjogcG9zLCB0aWxlOiBleGl0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3Q6IHRoYXQuaWQsIGVudHJhbmNlOiB0aGF0RW50cmFuY2VJbmRleH0pKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoYXRFeGl0cykge1xuICAgICAgdGhhdC5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbjogdGhhdFBvcywgdGlsZTogZXhpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0OiB0aGlzLmlkLCBlbnRyYW5jZTogdGhpc0VudHJhbmNlSW5kZXh9KSk7XG4gICAgfVxuICB9XG5cbiAgbmVpZ2hib3JGb3JFbnRyYW5jZShlbnRyYW5jZUlkOiBudW1iZXIpOiBMb2NhdGlvbiB7XG4gICAgY29uc3QgZW50cmFuY2UgPSB0aGlzLmVudHJhbmNlc1tlbnRyYW5jZUlkXTtcbiAgICBpZiAoIWVudHJhbmNlKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGVudHJhbmNlICR7aGV4KHRoaXMuaWQpfToke2VudHJhbmNlSWR9YCk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIGlmIChleGl0LnNjcmVlbiAhPT0gZW50cmFuY2Uuc2NyZWVuKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGR4ID0gTWF0aC5hYnMoZXhpdC54IC0gZW50cmFuY2UueCk7XG4gICAgICBjb25zdCBkeSA9IE1hdGguYWJzKGV4aXQueSAtIGVudHJhbmNlLnkpO1xuICAgICAgaWYgKGR4IDwgMjQgJiYgZHkgPCAyNCkgcmV0dXJuIHRoaXMucm9tLmxvY2F0aW9uc1tleGl0LmRlc3RdO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGV4aXQgZm91bmQgbmVhciAke2hleCh0aGlzLmlkKX06JHtlbnRyYW5jZUlkfWApO1xuICB9XG59XG5cbi8vIFRPRE8gLSBtb3ZlIHRvIGEgYmV0dGVyLW9yZ2FuaXplZCBkZWRpY2F0ZWQgXCJnZW9tZXRyeVwiIG1vZHVsZT9cbmZ1bmN0aW9uIG5laWdoYm9ycyh0aWxlOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgY29uc3QgeSA9IHRpbGUgJiAweGYwZjA7XG4gIGNvbnN0IHggPSB0aWxlICYgMHgwZjBmO1xuICBpZiAoeSA8ICgoaGVpZ2h0IC0gMSkgPDwgMTIgfCAweGUwKSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4ZTAgPyB0aWxlICsgMHgwZjIwIDogdGlsZSArIDE2KTtcbiAgfVxuICBpZiAoeSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4MDAgPyB0aWxlIC0gMHgwZjIwIDogdGlsZSAtIDE2KTtcbiAgfVxuICBpZiAoeCA8ICgod2lkdGggLSAxKSA8PCA4IHwgMHgwZikpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDBmID8gdGlsZSArIDB4MDBmMSA6IHRpbGUgKyAxKTtcbiAgfVxuICBpZiAoeCkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHgwZikgPT09IDB4MDAgPyB0aWxlIC0gMHgwMGYxIDogdGlsZSAtIDEpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIGNsYXNzIF9FbnRyYW5jZSBleHRlbmRzIERhdGFUdXBsZS5CYXNlIHtcbi8vICAgeCA9IERhdGFUdXBsZS5wcm9wKFswXSwgWzEsIDB4ZmYsIC04XSk7XG4vLyAgIHkgPSBEYXRhVHVwbGUucHJvcChbMl0sIFszLCAweGZmLCAtOF0pO1xuLy8gICBzY3JlZW4gPSBEYXRhVHVwbGUucHJvcChbMywgMHgwZiwgLTRdLCBbeCwgMHgwZl0pO1xuLy8gfVxuLy8gZXhwb3J0IGNsYXNzIEVudHJhbmNlIGV4dGVuZHMgX0VudHJhbmNlIHtcbi8vICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgc3VwZXIoKTtcbi8vICAgICBEYXRhVHVwbGUuZml4KHRoaXMpO1xuLy8gICB9XG4vLyB9XG5cbi8vIGV4cG9ydCBjbGFzcyBFbnRyYW5jZSBleHRlbmRzIERhdGFUdXBsZS5vZig0LCBjbGFzcyB7XG4vLyAgIHggPSBEYXRhVHVwbGUucHJvcChbMF0sIFsxLCAweGZmLCAtOF0pLFxuLy8gICB5ID0gRGF0YVR1cGxlLnByb3AoWzJdLCBbMywgMHhmZiwgLThdKSxcblxuLy8gICB0b1N0cmluZygpOiBzdHJpbmcge1xuLy8gICAgIHJldHVybiBgRW50cmFuY2UgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSlgO1xuLy8gICB9ICAgIFxuLy8gfSk7XG5cblxuLy8gZnVuY3Rpb24gRGF0YVR1cGxlPFQ+KHNpemU6IG51bWJlciwgYmFzZTogVCk6IFxuXG4vLyBleHBvcnQgY2xhc3MgRW50cmFuY2UgZXh0ZW5kcyBEYXRhVHVwbGUoNCwge1xuLy8gICB4OiB0aGlzLnByb3AoJ3gnLCBbMF0sIFsxLCAweGZmLCAtOF0pXG4vLyAgIHk6IHRoaXMucHJvcChbMl0sIFszLCAweGZmLCAtOF0pXG4vLyB9XG5cbi8vIGNsYXNzIERhdGFUdXBsZUJhc2Uge1xuXG4vLyB9XG4vLyBmdW5jdGlvbiBEYXRhVHVwbGUoc2l6ZTogbnVtYmVyKTogdHlwZW9mIERhdGFUdXBsZUJhc2Uge1xuLy8gICByZXR1cm4gY2xhc3MgZXh0ZW5kcyBEYXRhVHVwbGVCYXNlIHtcbi8vICAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPG51bWJlcj4pIHtcbi8vICAgICAgIHN1cGVyKHNpemUsIGRhdGEpO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuLy8gY2xhc3MgRGF0YVR1cGxlQmFzZSB7XG4vLyAgIHN0YXRpYyBvZjxUIGV4dGVuZHMgdHlwZW9mIERhdGFUdXBsZUJhc2U+KHRoaXM6IFQsIGluaXRzOiBhbnkpOiBJbnN0YW5jZVR5cGU8VD4ge1xuICAgIFxuLy8gICB9XG4vLyAgIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB0eXBlb2YgRGF0YVR1cGxlQmFzZT4odGhpczogVCwgZGF0YTogRGF0YTxudW1iZXI+LCBvZmZzZXQgPSAwKTogSW5zdGFuY2VUeXBlPFQ+IHtcbiAgICBcbi8vICAgfVxuLy8gICBwcm90ZWN0ZWQgcHJvcCguLi5zcGVjOiBBcnJheTxbbnVtYmVyLCBudW1iZXI/LCBudW1iZXI/XT4pOiBudW1iZXIge1xuXG4vLyAgIH1cbi8vICAgcHJvdGVjdGVkIGJvb2xlYW5Qcm9wKC4uLnNwZWM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+KTogYm9vbGVhbiB7XG5cbi8vICAgfVxuICBcbi8vIH1cblxuLy8gSURFQTogd2UgbWFrZSBhIG5ldyBpbXBsZW1lbnRhdGlvbiBpbiBvZigpIGFuZCBmcm9tKCkgYW5kXG4vLyAgICAgICBwYXRjaCBpdCBpbiB0byBEYXRhVHVwbGUncyBjdG9yIGJ1dCB3aXRoIHRoZSBzdWJjbGFzcyBwcm90b3R5cGUuXG5cbi8vIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFbnRyYW5jZSBleHRlbmRzIERhdGFUdXBsZSB7XG4vLyAgIHN0YXRpYyBzaXplID0gNDtcbi8vICAgeCA9IHRoaXMucHJvcChbMF0sIFsxLCAweGZmLCAtOF0pO1xuLy8gICB5ID0gdGhpcy5wcm9wKFsyXSwgWzMsIDB4ZmYsIC04XSk7XG4vLyB9XG5cbi8qKiBBIHNpbmdsZSBzY3JlZW4gZW50cmFuY2UgY29vcmRpbmF0ZS4gKi9cbmV4cG9ydCBjbGFzcyBFbnRyYW5jZSBleHRlbmRzIERhdGFUdXBsZSB7XG4gIC8vIEJhc2ljIHBhdHRlcm46IHhsbyB4aGkgeWxvIHloaSA9ICh4cCkoeHQpICh4cykoMCkgKHlwKSh5dCkgKHlzKSgwKVxuICAvLyB3aGVyZSB4cCBpcyBwaXhlbCBwb3NpdGlvbiB3aXRoaW4gdGlsZSwgeHQgaXMgdGlsZSwgYW5kIHhzIGlzIHNjcmVlblxuICBzdGF0aWMgc2l6ZSA9IDQ7XG5cbiAgLy8geCA9IHRoaXMuYml0cyhbMCwgMTZdKVxuICAvLyB5ID0gdGhpcy5iaXRzKFsxNiwgMzJdKVxuXG4gIC8qKiBGdWxsIDExLWJpdCB4LWNvb3JkaW5hdGUgb2YgdGhlIGVudHJhbmNlLiAqL1xuICB4ID0gdGhpcy5wcm9wKFswXSwgWzEsIDB4ZmYsIC04XSk7XG4gIC8qKiBGdWxsIDEyLWJpdCB5LWNvb3JkaW5hdGUgb2YgdGhlIGVudHJhbmNlLiAqL1xuICB5ID0gdGhpcy5wcm9wKFsyXSwgWzMsIDB4ZmYsIC04XSk7XG5cbiAgLy8gc2NyZWVuID0gdGhpcy5iaXRzKFs4LCAxMl0sIFsyNCwgMjhdKTtcbiAgLy8gdGlsZSAgID0gdGhpcy5iaXRzKFs0LCA4XSwgWzIwLCAyNF0pO1xuICAvLyBjb29yZCAgPSB0aGlzLmJpdHMoWzAsIDhdLCBbMTYsIDI0XSk7XG5cbiAgLyoqIDgtYml0IHNjcmVlbiAoeXgpLiAqL1xuICBzY3JlZW4gPSB0aGlzLnByb3AoWzMsIDB4MGYsIC00XSwgWzEsIDB4MGZdKTtcbiAgLyoqIDgtYml0IHRpbGUgd2l0aGluIHRoZSBzY3JlZW4gKHl4KS4gKi9cbiAgdGlsZSAgID0gdGhpcy5wcm9wKFsyLCAweGYwXSwgWzAsIDB4ZjAsIDRdKTtcbiAgLyoqIDE2LWJpdCBjb29yZGluYXRlIHdpdGhpbiB0aGUgc2NyZWVuICh5eXh4KS4gKi9cbiAgY29vcmQgID0gdGhpcy5wcm9wKFsyLCAweGZmLCAtOF0sIFswLCAweGZmXSk7XG5cbiAgLyoqIFdoZXRoZXIgdGhlIGVudHJhbmNlIGhhcyBub3QgYmVlbiBkaXNhYmxlZCBieSBzZXR0aW5nIGl0cyB4IHRvIGZmX18uICovXG4gIGdldCB1c2VkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRhdGFbMV0gIT0gMHhmZjtcbiAgfTtcblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgRW50cmFuY2UgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueSl9LCAke2hleCh0aGlzLngpfSlgO1xuICB9XG59XG5cbi8qKiBBIHNpbmdsZSBzY3JlZW4gZXhpdCB0aWxlLiAqL1xuZXhwb3J0IGNsYXNzIEV4aXQgZXh0ZW5kcyBEYXRhVHVwbGUge1xuICBzdGF0aWMgc2l6ZSA9IDQ7XG5cbiAgLyoqIDExLWJpdCB4LWNvb3JkaW5hdGUgb2YgZXhpdCBwaXhlbCAobG93IDQgYml0cyBhbHdheXMgemVybykuICovXG4gIHggICAgICAgID0gdGhpcy5wcm9wKFswLCAweGZmLCAtNF0pO1xuICAvKiogNy1iaXQgeC1jb29yZGluYXRlIG9mIGV4aXQgdGlsZSAoc2NyZWVuLXRpbGUpLiAqL1xuICB4dCAgICAgICA9IHRoaXMucHJvcChbMF0pO1xuXG4gIC8qKiAxMi1iaXQgeS1jb29yZGluYXRlIG9mIGV4aXQgcGl4ZWwgKGxvdyA0IGJpdHMgYWx3YXlzIHplcm8pLiAqL1xuICB5ICAgICAgICA9IHRoaXMucHJvcChbMSwgMHhmZiwgLTRdKTtcbiAgLyoqIDgtYml0IHktY29vcmRpbmF0ZSBvZiBleGl0IHRpbGUgKHNjcmVlbi10aWxlKS4gKi9cbiAgeXQgICAgICAgPSB0aGlzLnByb3AoWzFdKTtcblxuICAvKiogOC1iaXQgc2NyZWVuICh5eCkuICovXG4gIHNjcmVlbiAgID0gdGhpcy5wcm9wKFsxLCAweGYwXSwgWzAsIDB4ZjAsIDRdKTtcbiAgLyoqIDgtYml0IHRpbGUgd2l0aGluIHRoZSBzY3JlZW4gKHl4KS4gKi9cbiAgdGlsZSAgICAgPSB0aGlzLnByb3AoWzEsIDB4MGYsIC00XSwgWzAsIDB4MGZdKTtcbiAgLyoqIDE2LWJpdCBjb29yZGluYXRlIHdpdGhpbiB0aGUgc2NyZWVuICh5MHgwKS4gKi9cbiAgY29vcmQgICAgPSB0aGlzLnByb3AoWzEsIDB4MGYsIC0xMl0sIFswLCAweDBmLCAtNF0pO1xuXG4gIC8qKiBEZXN0aW5hdGlvbiBsb2NhdGlvbiBJRC4gKi9cbiAgZGVzdCAgICAgPSB0aGlzLnByb3AoWzJdKTtcblxuICAvKiogRGVzdGluYXRpb24gZW50cmFuY2UgaW5kZXguICovXG4gIGVudHJhbmNlID0gdGhpcy5wcm9wKFszXSk7XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEV4aXQgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueSl9LCAke2hleCh0aGlzLngpfSkgPT4gJHtcbiAgICAgICAgICAgIHRoaXMuZGVzdH06JHt0aGlzLmVudHJhbmNlfWA7XG4gIH1cbn1cblxuLyoqIE1hcHBpbmcgZnJvbSBzY3JlZW4gcG9zaXRpb24gdG8gZmxhZyBJRC4gKi9cbmV4cG9ydCBjbGFzcyBGbGFnIGV4dGVuZHMgRGF0YVR1cGxlIHtcbiAgc3RhdGljIHNpemUgPSAyO1xuXG4gIC8qKiBNYXBwZWQgZmxhZywgYWx3YXlzIGJldHdlZW4gJDIwMCBhbmQgJDJmZi4gKi9cbiAgZ2V0IGZsYWcoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhWzBdIHwgMHgyMDA7XG4gIH1cbiAgc2V0IGZsYWcoZjogbnVtYmVyKSB7XG4gICAgaWYgKChmICYgfjB4ZmYpICE9PSAweDIwMCkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmxhZzogJHtoZXgoZil9YCk7XG4gICAgdGhpcy5kYXRhWzBdID0gZiAmIDB4ZmY7XG4gIH1cblxuICAvKiogMTEtYml0IHgtY29vcmRpbmF0ZSBvZiB0b3AtbGVmdCBwaXhlbCBvZiB0aGUgZmxhZ2dlZCBzY3JlZW4uICovXG4gIHggICAgICA9IHRoaXMucHJvcChbMSwgMHgwNywgLThdKTtcbiAgLyoqIDMtYml0IHgtY29vcmRpbmF0ZSBvZiBmbGFnZ2VkIHNjcmVlbi4gKi9cbiAgeHMgICAgID0gdGhpcy5wcm9wKFsxLCAweDA3XSk7XG5cbiAgLyoqIDEyLWJpdCB5LWNvb3JkaW5hdGUgb2YgdG9wLWxlZnQgcGl4ZWwgb2YgdGhlIGZsYWdnZWQgc2NyZWVuLiAqL1xuICB5ICAgICAgPSB0aGlzLnByb3AoWzEsIDB4ZjAsIC00XSk7XG4gIC8qKiA0LWJpdCB5LWNvb3JkaW5hdGUgb2YgZmxhZ2dlZCBzY3JlZW4uICovXG4gIHlzICAgICA9IHRoaXMucHJvcChbMSwgMHhmMCwgNF0pO1xuXG4gIC8vIFRPRE8gLSByZW1vdmUgdGhlICd5eCcgdmVyc2lvblxuICAvLyB5eCAgICAgPSB0aGlzLnByb3AoWzFdKTsgLy8geSBpbiBoaSBuaWJibGUsIHggaW4gbG9cbiAgLyoqIDgtYml0IHNjcmVlbiAoeXgpLiAqL1xuICBzY3JlZW4gPSB0aGlzLnByb3AoWzFdKTtcblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgRmxhZyAke3RoaXMuaGV4KCl9OiAke2hleCh0aGlzLnNjcmVlbil9IEAgJHtoZXgodGhpcy5mbGFnKX1gO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQaXQgZXh0ZW5kcyBEYXRhVHVwbGUge1xuICBzdGF0aWMgc2l6ZSA9IDQ7XG5cbiAgLyoqIDMtYml0IHgtY29vcmRpbmF0ZSBvZiBwaXQncyBzY3JlZW4gb24gdGhpcyBtYXAuICovXG4gIGZyb21YcyA9IHRoaXMucHJvcChbMSwgMHg3MCwgNF0pO1xuICAvKiogMy1iaXQgeC1jb29yZGluYXRlIG9mIGRlc3RpbmF0aW9uIHNjcmVlbiBvbiBkZXN0aW5hdGlvbiBtYXAuICovXG4gIHRvWHMgICA9IHRoaXMucHJvcChbMSwgMHgwN10pO1xuXG4gIC8qKiA0LWJpdCB5LWNvb3JkaW5hdGUgb2YgcGl0J3Mgc2NyZWVuIG9uIHRoaXMgbWFwLiAqL1xuICBmcm9tWXMgPSB0aGlzLnByb3AoWzMsIDB4ZjAsIDRdKTtcbiAgLyoqIDQtYml0IHktY29vcmRpbmF0ZSBvZiBkZXN0aW5hdGlvbiBzY3JlZW4gb24gZGVzdGluYXRpb24gbWFwLiAqL1xuICB0b1lzICAgPSB0aGlzLnByb3AoWzMsIDB4MGZdKTtcblxuICAvKiogTG9jYXRpb24gSUQgb2YgZGVzdGluYXRpb24uICovXG4gIGRlc3QgICA9IHRoaXMucHJvcChbMF0pO1xuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBQaXQgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMuZnJvbVhzKX0sICR7aGV4KHRoaXMuZnJvbVlzKX0pID0+ICR7XG4gICAgICAgICAgICBoZXgodGhpcy5kZXN0KX06KCR7aGV4KHRoaXMudG9Ycyl9LCAke2hleCh0aGlzLnRvWXMpfSlgO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTcGF3biBleHRlbmRzIERhdGFUdXBsZSB7XG4gIHN0YXRpYyBzaXplID0gNDtcblxuICAvLyBnZXQgeSgpOiBudW1iZXIgIHsgcmV0dXJuIFNQQVdOX1kuZ2V0KHRoaXMpOyB9XG4gIC8vIHNldCB5KHk6IG51bWJlcikgeyBTUEFXTl9ZLnNldCh0aGlzLCB5KTsgfVxuXG4gIC8qKiAxMi1iaXQgeS1jb29yZGluYXRlIG9mIHNwYXduIHBpeGVsLiAqL1xuICB5ICAgICAgPSB0aGlzLnByb3AoWzAsIDB4ZmYsIC00XSk7XG4gIC8qKiA4LWJpdCB5LWNvb3JkaW5hdGUgb2Ygc3Bhd24gdGlsZS4gKi9cbiAgeXQgICAgID0gdGhpcy5wcm9wKFswXSk7XG5cbiAgLyoqIDExLWJpdCB4LWNvb3JkaW5hdGUgb2Ygc3Bhd24gcGl4ZWwuICovXG4gIHggICAgICA9IHRoaXMucHJvcChbMSwgMHg3ZiwgLTRdLCBbMiwgMHg0MCwgM10pO1xuICAvKiogNy1iaXQgeC1jb29yZGluYXRlIG9mIHNwYXduIHRpbGUuICovXG4gIHh0ICAgICA9IHRoaXMucHJvcChbMSwgMHg3Zl0pO1xuXG4gIC8qKiBUcnVlIGZvciB0aW1lZCByZXNwYXduLCBmYWxzZSBmb3IgaW5pdGlhbCBzcGF3bi4gKi9cbiAgdGltZWQgID0gdGhpcy5ib29sZWFuUHJvcCgxLCA3KTtcblxuICAvKiogOC1iaXQgc2NyZWVuIGNvb3JkaW5hdGUgKHl4KS4gKi9cbiAgc2NyZWVuID0gdGhpcy5wcm9wKFswLCAweGYwXSwgWzEsIDB4NzAsIDRdKTtcbiAgLyoqIDgtYml0IHRpbGUgY29vcmRpbmF0ZSB3aXRoaW4gdGhlIHNjcmVlbiAoeXgpLiAqL1xuICB0aWxlICAgPSB0aGlzLnByb3AoWzAsIDB4MGYsIC00XSwgWzEsIDB4MGZdKTtcbiAgLyoqIDE2LWJpdCBwaXhlbCBjb29yZGluYXRlIHdpdGhpbiB0aGUgc2NyZWVuICh5MHh4KS4gKi9cbiAgY29vcmQgID0gdGhpcy5wcm9wKFswLCAweGZmLCAtOF0sIFsxLCAweDdmLCAtNF0sIFsyLCAweDQwLCAzXSk7XG5cbiAgLyoqIFNwYXduIHR5cGUgKDAuLjQpLiAqL1xuICB0eXBlICAgPSB0aGlzLnByb3AoWzIsIDB4MDddKTtcbiAgLyoqIFNwYXduZWQgb2JqZWN0IElEIChleGFjdCBpbnRlcnByZXRhdGlvbiBkZXBlbmRzIG9uIHR5cGUpLiAqL1xuICBpZCAgICAgPSB0aGlzLnByb3AoWzNdKTtcblxuICAvKiogUGF0dGVybiBiYW5rIHNoaWZ0ICgwIG9yIDEpIHRvIHN0b3JlIGluIDM4MCx4OjIwLiAqL1xuICBwYXR0ZXJuQmFuayA9IHRoaXMucHJvcChbMiwgMHg4MCwgN10pO1xuXG4vLyBwYXR0ZXJuQmFuazoge2dldCh0aGlzOiBhbnkpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5kYXRhWzJdID4+PiA3OyB9LFxuLy8gICAgICAgICAgICAgICBzZXQodGhpczogYW55LCB2OiBudW1iZXIpIHsgaWYgKHRoaXMuZGF0YVszXSA9PT0gMTIwKSBkZWJ1Z2dlcjtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB0aGlzLmRhdGFbMl0gfD0gMHg4MDsgZWxzZSB0aGlzLmRhdGFbMl0gJj0gMHg3ZjsgfX0sXG5cbiAgLyoqIFdoZXRoZXIgdGhpcyBzcGF3biBpcyBhY3RpdmUgKGluYWN0aXZlIGluZGljYXRlZCBieSAkZmUgaW4gWzBdKS4gKi9cbiAgZ2V0IHVzZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVswXSAhPT0gMHhmZTtcbiAgfVxuICBzZXQgdXNlZCh1c2VkOiBib29sZWFuKSB7XG4gICAgdGhpcy5kYXRhWzBdID0gdXNlZCA/IDAgOiAweGZlO1xuICB9XG5cbiAgLyoqIE9iamVjdCBJRCBvZiBtb25zdGVyIHNwYXduIChzaGlmdGVkIGJ5ICQ1MCBmcm9tIElEKS4gKi9cbiAgZ2V0IG1vbnN0ZXJJZCgpOiBudW1iZXIge1xuICAgIHJldHVybiAodGhpcy5pZCArIDB4NTApICYgMHhmZjtcbiAgfVxuICBzZXQgbW9uc3RlcklkKGlkOiBudW1iZXIpIHtcbiAgICB0aGlzLmlkID0gKGlkIC0gMHg1MCkgJiAweGZmO1xuICB9XG5cbiAgLyoqIFdoZXRoZXIgdGhpcyBzcGF3biBpcyBhIHRyZWFzdXJlIGNoZXN0IChub3RlOiBpbmNsdWRlcyBtaW1pY3MpLiAqL1xuICBpc0NoZXN0KCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAyICYmIHRoaXMuaWQgPCAweDgwOyB9XG4gIC8qKiBXaGV0aGVyIHRoaXMgc3Bhd24gaXMgYW4gaW52aXNpYmxlIHRyZWFzdXJlIGNoZXN0LiAqL1xuICBpc0ludmlzaWJsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc0NoZXN0KCkgJiYgQm9vbGVhbih0aGlzLmRhdGFbMl0gJiAweDIwKTtcbiAgfVxuICAvKiogV2hldGhlciB0aGlzIHNwYXduIGlzIGEgdHJpZ2dlciAodHlwZSAyLCB1cHBlciBJRHMpLiAqL1xuICBpc1RyaWdnZXIoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDIgJiYgdGhpcy5pZCA+PSAweDgwOyB9XG4gIC8qKiBXaGV0aGVyIHRoaXMgc3Bhd24gaXMgYW4gTlBDICh0eXBlIDEsIGxvd2VyIElEcykuICovXG4gIGlzTnBjKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAxICYmIHRoaXMuaWQgPCAweGMwOyB9XG4gIC8qKiBXaGV0aGVyIHRoaXMgc3Bhd24gaXMgYSBib3NzICh0eXBlIDEsIHVwcGVyIElEcykuICovXG4gIGlzQm9zcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMSAmJiB0aGlzLmlkID49IDB4YzA7IH1cbiAgLyoqIFdoZXRoZXIgdGhpcyBzcGF3biBpcyBhIG1vbnN0ZXIgKHR5cGUgMCkuICovXG4gIGlzTW9uc3RlcigpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMDsgfVxuICAvKiogV2hldGhlciB0aGlzIHNwYXduIGlzIGEgd2FsbCBoaXRib3ggKHR5cGUgMywgbW9zdGx5KS4gKi9cbiAgaXNXYWxsKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBCb29sZWFuKHRoaXMudHlwZSA9PT0gMyAmJiAodGhpcy5pZCA8IDQgfHwgKHRoaXMuZGF0YVsyXSAmIDB4MjApKSk7XG4gIH1cbiAgLyoqIFdoZXRoZXIgdGhpcyBzcGF3biBpcyBhIHNob290aW5nIHdhbGwgKHVzZXMgY3VzdG9tIGxvZ2ljKS4gKi9cbiAgaXNTaG9vdGluZ1dhbGwobG9jYXRpb246IExvY2F0aW9uKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNXYWxsKCkgJiZcbiAgICAgICAgISEodGhpcy5kYXRhWzJdICYgMHgyMCA/IHRoaXMuZGF0YVsyXSAmIDB4MTAgOlxuICAgICAgICAgICBsb2NhdGlvbi5pZCA9PT0gMHg4ZiB8fCBsb2NhdGlvbi5pZCA9PT0gMHhhOCk7XG4gIH1cbiAgLyoqIFR5cGUgb2Ygd2FsbCAoaS5lLiB3YWxsL2JyaWRnZSkgb3IgZW1wdHkgaWYgbmVpdGhlci4gKi9cbiAgd2FsbFR5cGUoKTogJycgfCAnd2FsbCcgfCAnYnJpZGdlJyB7XG4gICAgaWYgKHRoaXMudHlwZSAhPT0gMykgcmV0dXJuICcnO1xuICAgIGNvbnN0IG9iaiA9IHRoaXMuZGF0YVsyXSAmIDB4MjAgPyB0aGlzLmlkID4+PiA0IDogdGhpcy5pZDtcbiAgICBpZiAob2JqID49IDQpIHJldHVybiAnJztcbiAgICByZXR1cm4gb2JqID09PSAyID8gJ2JyaWRnZScgOiAnd2FsbCc7XG4gIH1cbiAgLyoqIEVsZW1lbnQgb2Ygd2FsbCAoMC4uMykgb3IgLTEgaWYgbm90IGEgd2FsbC4gKi9cbiAgd2FsbEVsZW1lbnQoKTogbnVtYmVyIHtcbiAgICBpZiAoIXRoaXMuaXNXYWxsKCkpIHJldHVybiAtMTtcbiAgICByZXR1cm4gdGhpcy5pZCAmIDM7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgU3Bhd24gJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSkgJHtcbiAgICAgICAgICAgIHRoaXMudGltZWQgPyAndGltZWQnIDogJ2ZpeGVkJ30gJHt0aGlzLnR5cGV9OiR7aGV4KHRoaXMuaWQpfWA7XG4gIH1cbn1cblxuXG4vLyB2ZXJ5IHNpbXBsZSB2ZXJzaW9uIG9mIHdoYXQgd2UncmUgZG9pbmcgd2l0aCBtZXRhc2NyZWVuc1xuY29uc3Qgc2NyZWVuRXhpdHM6IHtbaWQ6IG51bWJlcl06IHJlYWRvbmx5IFtudW1iZXIsIHJlYWRvbmx5IFtudW1iZXIsIG51bWJlcl1dfSA9IHtcbiAgMHgxNTogWzB4OTBfYTAsIFsweDg5LCAweDhhXV0sIC8vIGNhdmUgb24gbGVmdCBib3VuZGFyeVxuICAweDE5OiBbMHg2MF85MCwgWzB4NTgsIDB4NTldXSwgLy8gY2F2ZSBvbiByaWdodCBib3VuZGFyeSAobm90IG9uIGdyYXNzKVxuICAweDk2OiBbMHg0MF8zMCwgWzB4MzIsIDB4MzNdXSwgLy8gdXAgc3RhaXIgZnJvbSBsZWZ0XG4gIDB4OTc6IFsweGFmXzMwLCBbMHhiMiwgMHhiM11dLCAvLyBkb3duIHN0YWlyIGZyb20gbGVmdFxuICAweDk4OiBbMHg0MF9kMCwgWzB4M2MsIDB4M2RdXSwgLy8gdXAgc3RhaXIgZnJvbSByaWdodFxuICAweDk5OiBbMHhhZl9kMCwgWzB4YmMsIDB4YmRdXSwgLy8gZG93biBzdGFpciBmcm9tIHJpZ2h0XG4gIDB4OWE6IFsweDFmXzgwLCBbMHgyNywgMHgyOF1dLCAvLyBkb3duIHN0YWlyIChkb3VibGUgLSBqdXN0IHVzZSBkb3duISlcbiAgMHg5ZTogWzB4ZGZfODAsIFsweGU3LCAweGU4XV0sIC8vIGJvdHRvbSBlZGdlXG4gIDB4YzI6IFsweDYwX2IwLCBbMHg1YSwgMHg1Yl1dLCAvLyBjYXZlIG9uIGJvdHRvbS1yaWdodCBib3VuZGFyeVxufTtcbiJdfQ==