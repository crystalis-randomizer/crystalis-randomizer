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
        const areas = locations.rom.areas;
        $.commit(locations, (prop, id, init) => {
            const name = upperCamelToSpaces(prop);
            const area = init.area(areas);
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
        this.MezameShrine = $(0x00, { area: a => a.Mezame });
        this.Leaf_OutsideStart = $(0x01, { music: 1 });
        this.Leaf = $(0x02, { area: a => a.Leaf });
        this.ValleyOfWind = $(0x03, { area: a => a.ValleyOfWind });
        this.SealedCave1 = $(0x04, { area: a => a.SealedCave });
        this.SealedCave2 = $(0x05);
        this.SealedCave6 = $(0x06);
        this.SealedCave4 = $(0x07);
        this.SealedCave5 = $(0x08);
        this.SealedCave3 = $(0x09);
        this.SealedCave7 = $(0x0a, { bossScreen: 0x91 });
        this.SealedCave8 = $(0x0c);
        this.WindmillCave = $(0x0e, { area: a => a.WindmillCave });
        this.Windmill = $(0x0f, { area: a => a.Windmill, music: 0 });
        this.ZebuCave = $(0x10, { area: a => a.ZebuCave });
        this.MtSabreWest_Cave1 = $(0x11, { area: a => a.MtSabreWest, ...CAVE });
        this.CordelPlainWest = $(0x14, { area: a => a.CordelPlain });
        this.CordelPlainEast = $(0x15);
        this.Brynmaer = $(0x18, { area: a => a.Brynmaer });
        this.OutsideStomHouse = $(0x19, { area: a => a.StomHouse,
            music: 0 });
        this.Swamp = $(0x1a, { area: a => a.Swamp,
            bossScreen: 0x7c });
        this.Amazones = $(0x1b, { area: a => a.Amazones });
        this.Oak = $(0x1c, { area: a => a.Oak });
        this.StomHouse = $(0x1e, { area: a => a.StomHouse });
        this.MtSabreWest_Lower = $(0x20, { area: a => a.MtSabreWest });
        this.MtSabreWest_Upper = $(0x21);
        this.MtSabreWest_Cave2 = $(0x22, CAVE);
        this.MtSabreWest_Cave3 = $(0x23, CAVE);
        this.MtSabreWest_Cave4 = $(0x24, CAVE);
        this.MtSabreWest_Cave5 = $(0x25, CAVE);
        this.MtSabreWest_Cave6 = $(0x26, CAVE);
        this.MtSabreWest_Cave7 = $(0x27, CAVE);
        this.MtSabreNorth_Main = $(0x28, { area: a => a.MtSabreNorth,
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
        this.Nadare_Inn = $(0x3c, { area: a => a.Nadare, ...HOUSE });
        this.Nadare_ToolShop = $(0x3d, HOUSE);
        this.Nadare_BackRoom = $(0x3e, HOUSE);
        this.WaterfallValleyNorth = $(0x40, { area: a => a.WaterfallValley });
        this.WaterfallValleySouth = $(0x41);
        this.LimeTreeValley = $(0x42, { area: a => a.LimeTreeValley,
            music: 0 });
        this.LimeTreeLake = $(0x43, { area: a => a.LimeTreeLake,
            music: 0 });
        this.KirisaPlantCave1 = $(0x44, { area: a => a.KirisaPlantCave });
        this.KirisaPlantCave2 = $(0x45);
        this.KirisaPlantCave3 = $(0x46);
        this.KirisaMeadow = $(0x47, { area: a => a.KirisaMeadow });
        this.FogLampCave1 = $(0x48, { area: a => a.FogLampCave });
        this.FogLampCave2 = $(0x49);
        this.FogLampCave3 = $(0x4a);
        this.FogLampCaveDeadEnd = $(0x4b);
        this.FogLampCave4 = $(0x4c);
        this.FogLampCave5 = $(0x4d);
        this.FogLampCave6 = $(0x4e);
        this.FogLampCave7 = $(0x4f);
        this.Portoa = $(0x50, { area: a => a.Portoa });
        this.Portoa_FishermanIsland = $(0x51, { area: a => a.FishermanHouse,
            music: 0 });
        this.MesiaShrine = $(0x52, { area: a => a.LimeTreeLake,
            ...MESIA });
        this.WaterfallCave1 = $(0x54, { area: a => a.WaterfallCave });
        this.WaterfallCave2 = $(0x55);
        this.WaterfallCave3 = $(0x56);
        this.WaterfallCave4 = $(0x57);
        this.TowerEntrance = $(0x58, { area: a => a.Tower });
        this.Tower1 = $(0x59);
        this.Tower2 = $(0x5a);
        this.Tower3 = $(0x5b);
        this.TowerOutsideMesia = $(0x5c);
        this.TowerOutsideDyna = $(0x5d);
        this.TowerMesia = $(0x5e, MESIA);
        this.TowerDyna = $(0x5f, DYNA);
        this.AngrySea = $(0x60, { area: a => a.AngrySea });
        this.BoatHouse = $(0x61);
        this.JoelLighthouse = $(0x62, { area: a => a.Lighthouse,
            music: 0 });
        this.UndergroundChannel = $(0x64, { area: a => a.UndergroundChannel });
        this.ZombieTown = $(0x65, { area: a => a.ZombieTown });
        this.EvilSpiritIsland1 = $(0x68, { area: a => a.EvilSpiritIslandEntrance,
            music: 1 });
        this.EvilSpiritIsland2 = $(0x69, { area: a => a.EvilSpiritIsland });
        this.EvilSpiritIsland3 = $(0x6a);
        this.EvilSpiritIsland4 = $(0x6b);
        this.SaberaPalace1 = $(0x6c, { area: a => a.SaberaFortress,
            bossScreen: 0xfd });
        this.SaberaPalace2 = $(0x6d);
        this.SaberaPalace3 = $(0x6e, { bossScreen: 0xfd });
        this.JoelSecretPassage = $(0x70, { area: a => a.JoelPassage });
        this.Joel = $(0x71, { area: a => a.Joel });
        this.Swan = $(0x72, { area: a => a.Swan, music: 1 });
        this.SwanGate = $(0x73, { area: a => a.SwanGate,
            music: 1 });
        this.GoaValley = $(0x78, { area: a => a.GoaValley });
        this.MtHydra = $(0x7c, { area: a => a.MtHydra });
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
        this.Styx1 = $(0x88, { area: a => a.Styx });
        this.Styx2 = $(0x89);
        this.Styx3 = $(0x8a);
        this.Shyron = $(0x8c, { area: a => a.Shyron });
        this.Goa = $(0x8e, { area: a => a.Goa });
        this.GoaFortressBasement = $(0x8f, { area: a => a.FortressBasement,
            music: 0 });
        this.Desert1 = $(0x90, { area: a => a.Desert1 });
        this.OasisCaveMain = $(0x91, { area: a => a.OasisCave });
        this.DesertCave1 = $(0x92, { area: a => a.DesertCave1,
            music: 0 });
        this.Sahara = $(0x93, { area: a => a.Sahara });
        this.SaharaOutsideCave = $(0x94, { music: 0 });
        this.DesertCave2 = $(0x95, { area: a => a.DesertCave2, music: 1 });
        this.SaharaMeadow = $(0x96, { area: a => a.SaharaMeadow, music: 0 });
        this.Desert2 = $(0x98, { area: a => a.Desert2 });
        this.Pyramid_Entrance = $(0x9c, { area: a => a.Pyramid });
        this.Pyramid_Branch = $(0x9d);
        this.Pyramid_Main = $(0x9e);
        this.Pyramid_Draygon = $(0x9f);
        this.Crypt_Entrance = $(0xa0, { area: a => a.Crypt });
        this.Crypt_Hall1 = $(0xa1);
        this.Crypt_Branch = $(0xa2);
        this.Crypt_DeadEndLeft = $(0xa3);
        this.Crypt_DeadEndRight = $(0xa4);
        this.Crypt_Hall2 = $(0xa5);
        this.Crypt_Draygon2 = $(0xa6);
        this.Crypt_Teleporter = $(0xa7);
        this.GoaFortress_Entrance = $(0xa8, { area: a => a.GoaFortress,
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
        this.OasisCave_Entrance = $(0xb8, { area: a => a.OasisEntrance,
            music: 2 });
        this.GoaFortress_Asina = $(0xb9, { area: a => a.GoaFortress,
            ...MADO_UPPER,
            bossScreen: 0x91 });
        this.GoaFortress_Kensu = $(0xba, KARMINE_UPPER);
        this.Goa_House = $(0xbb, { area: a => a.Goa, ...HOUSE });
        this.Goa_Inn = $(0xbc, HOUSE);
        this.Goa_ToolShop = $(0xbe, HOUSE);
        this.Goa_Tavern = $(0xbf, HOUSE);
        this.Leaf_ElderHouse = $(0xc0, { area: a => a.Leaf, ...HOUSE });
        this.Leaf_RabbitHut = $(0xc1, HOUSE);
        this.Leaf_Inn = $(0xc2, HOUSE);
        this.Leaf_ToolShop = $(0xc3, HOUSE);
        this.Leaf_ArmorShop = $(0xc4, HOUSE);
        this.Leaf_StudentHouse = $(0xc5, HOUSE);
        this.Brynmaer_Tavern = $(0xc6, { area: a => a.Brynmaer, ...HOUSE });
        this.Brynmaer_PawnShop = $(0xc7, HOUSE);
        this.Brynmaer_Inn = $(0xc8, HOUSE);
        this.Brynmaer_ArmorShop = $(0xc9, HOUSE);
        this.Brynmaer_ItemShop = $(0xcb, HOUSE);
        this.Oak_ElderHouse = $(0xcd, { area: a => a.Oak, ...HOUSE });
        this.Oak_MotherHouse = $(0xce, HOUSE);
        this.Oak_ToolShop = $(0xcf, HOUSE);
        this.Oak_Inn = $(0xd0, HOUSE);
        this.Amazones_Inn = $(0xd1, { area: a => a.Amazones, ...HOUSE });
        this.Amazones_ItemShop = $(0xd2, HOUSE);
        this.Amazones_ArmorShop = $(0xd3, HOUSE);
        this.Amazones_Elder = $(0xd4, HOUSE);
        this.Nadare = $(0xd5, { area: a => a.Nadare });
        this.Portoa_FishermanHouse = $(0xd6, { area: a => a.FishermanHouse,
            ...HOUSE, music: 0 });
        this.Portoa_PalaceEntrance = $(0xd7, { area: a => a.PortoaPalace });
        this.Portoa_FortuneTeller = $(0xd8, { area: a => a.Portoa,
            ...FORTUNE_TELLER });
        this.Portoa_PawnShop = $(0xd9, HOUSE);
        this.Portoa_ArmorShop = $(0xda, HOUSE);
        this.Portoa_Inn = $(0xdc, HOUSE);
        this.Portoa_ToolShop = $(0xdd, HOUSE);
        this.PortoaPalace_Left = $(0xde, { area: a => a.PortoaPalace,
            ...HOUSE });
        this.PortoaPalace_ThroneRoom = $(0xdf, HOUSE);
        this.PortoaPalace_Right = $(0xe0, HOUSE);
        this.Portoa_AsinaRoom = $(0xe1, { area: a => a.UndergroundChannel,
            ...HOUSE, music: 'asina' });
        this.Amazones_ElderDownstairs = $(0xe2, { area: a => a.Amazones,
            ...HOUSE });
        this.Joel_ElderHouse = $(0xe3, { area: a => a.Joel, ...HOUSE });
        this.Joel_Shed = $(0xe4, HOUSE);
        this.Joel_ToolShop = $(0xe5, HOUSE);
        this.Joel_Inn = $(0xe7, HOUSE);
        this.ZombieTown_House = $(0xe8, { area: a => a.ZombieTown,
            ...HOUSE });
        this.ZombieTown_HouseBasement = $(0xe9, HOUSE);
        this.Swan_ToolShop = $(0xeb, { area: a => a.Swan, ...HOUSE });
        this.Swan_StomHut = $(0xec, HOUSE);
        this.Swan_Inn = $(0xed, HOUSE);
        this.Swan_ArmorShop = $(0xee, HOUSE);
        this.Swan_Tavern = $(0xef, HOUSE);
        this.Swan_PawnShop = $(0xf0, HOUSE);
        this.Swan_DanceHall = $(0xf1, HOUSE);
        this.Shyron_Temple = $(0xf2, { area: a => a.ShyronTemple,
            bossScreen: 0x70 });
        this.Shyron_TrainingHall = $(0xf3, { area: a => a.Shyron, ...HOUSE });
        this.Shyron_Hospital = $(0xf4, HOUSE);
        this.Shyron_ArmorShop = $(0xf5, HOUSE);
        this.Shyron_ToolShop = $(0xf6, HOUSE);
        this.Shyron_Inn = $(0xf7, HOUSE);
        this.Sahara_Inn = $(0xf8, { area: a => a.Sahara, ...HOUSE });
        this.Sahara_ToolShop = $(0xf9, HOUSE);
        this.Sahara_ElderHouse = $(0xfa, HOUSE);
        this.Sahara_PawnShop = $(0xfb, HOUSE);
        this.EastCave1 = $(-1, { area: a => a.EastCave });
        this.EastCave2 = $(-1);
        this.FishermanBeach = $(-1, { area: a => a.FishermanHouse, ...HOUSE });
        $.commit(this);
        for (let id = 0; id < 0x100; id++) {
            if (this[id])
                continue;
            this[id] = new Location(rom, id, {
                area: rom.areas.Empty,
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
        const tileset = this.rom.tileset(this.tileset);
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
export const Entrance = DataTuple.make(4, {
    x: DataTuple.prop([0], [1, 0xff, -8]),
    y: DataTuple.prop([2], [3, 0xff, -8]),
    screen: DataTuple.prop([3, 0x0f, -4], [1, 0x0f]),
    tile: DataTuple.prop([2, 0xf0], [0, 0xf0, 4]),
    coord: DataTuple.prop([2, 0xff, -8], [0, 0xff]),
    used: {
        get() { return this.data[1] != 0xff; },
    },
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
    isShootingWall(location) {
        return this.isWall() &&
            !!(this.data[2] & 0x20 ? this.data[2] & 0x10 :
                location.id === 0x8f || location.id === 0xa8);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFFbkMsT0FBTyxFQUFPLFNBQVMsRUFDZixlQUFlLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQ3hDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUN0QyxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUdoRSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDMUMsT0FBTyxFQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBdUIxRCxNQUFNLElBQUksR0FBRztJQUNYLE9BQU8sRUFBRSxNQUFNO0lBQ2YsS0FBSyxFQUFFLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLE9BQU87SUFDMUMsT0FBTyxFQUFFLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLE9BQU87Q0FDcEMsQ0FBQztBQUNYLE1BQU0sS0FBSyxHQUFHO0lBQ1osT0FBTyxFQUFFLE9BQU87SUFDaEIsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRTtDQUNmLENBQUM7QUFDWCxNQUFNLGNBQWMsR0FBRztJQUNyQixPQUFPLEVBQUUsT0FBTztJQUNoQixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFO0lBQ3ZCLEtBQUssRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxnQkFBZ0I7Q0FDM0MsQ0FBQztBQUNYLE1BQU0sS0FBSyxHQUFHO0lBQ1osSUFBSSxFQUFFLE9BQU87SUFDYixLQUFLLEVB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QUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQzNCLENBQUM7Q0FDRixDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDbkMsTUFBTSxFQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLElBQUksRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWxDLE1BQU0sRUFBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQyxJQUFJLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVsQyxJQUFJLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVCLFFBQVE7UUFDTixPQUFPLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFDM0QsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsRSxDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBR0gsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQ3JDLENBQUMsRUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLEVBQUUsRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxD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QyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQzlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FyZWEsIEFyZWFzfSBmcm9tICcuL2FyZWEuanMnO1xuaW1wb3J0IHtFbnRpdHl9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7U2NyZWVufSBmcm9tICcuL3NjcmVlbi5qcyc7XG5pbXBvcnQge0RhdGEsIERhdGFUdXBsZSxcbiAgICAgICAgY29uY2F0SXRlcmFibGVzLCBncm91cCwgaGV4LCBpbml0aWFsaXplcixcbiAgICAgICAgcmVhZExpdHRsZUVuZGlhbiwgc2VxLCB0dXBsZSwgdmFyU2xpY2UsXG4gICAgICAgIHdyaXRlTGl0dGxlRW5kaWFuLCB1cHBlckNhbWVsVG9TcGFjZXN9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1dyaXRlcn0gZnJvbSAnLi93cml0ZXIuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7YXNzZXJ0TmV2ZXIsIGl0ZXJzLCBEZWZhdWx0TWFwfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9tb25zdGVyLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuXG4vLyBOdW1iZXIgaW5kaWNhdGVzIHRvIGNvcHkgd2hhdGV2ZXIncyBhdCB0aGUgZ2l2ZW4gZXhpdFxudHlwZSBLZXkgPSBzdHJpbmcgfCBzeW1ib2wgfCBudW1iZXI7XG4vLyBMb2NhbCBmb3IgZGVmaW5pbmcgbmFtZXMgb24gTG9jYXRpb25zIG9iamVjdHMuXG5pbnRlcmZhY2UgTG9jYXRpb25Jbml0IHtcbiAgYXJlYT86IChhcmVhczogQXJlYXMpID0+IEFyZWE7XG4gIHN1YkFyZWE/OiBzdHJpbmc7XG4gIG11c2ljPzogS2V5IHwgKChhcmVhOiBBcmVhKSA9PiBLZXkpO1xuICBwYWxldHRlPzogS2V5IHwgKChhcmVhOiBBcmVhKSA9PiBLZXkpO1xuICBib3NzU2NyZWVuPzogbnVtYmVyO1xufVxuaW50ZXJmYWNlIExvY2F0aW9uRGF0YSB7XG4gIGFyZWE6IEFyZWE7XG4gIG5hbWU6IHN0cmluZztcbiAgbXVzaWM6IEtleTtcbiAgcGFsZXR0ZTogS2V5O1xuICBzdWJBcmVhPzogc3RyaW5nO1xuICBib3NzU2NyZWVuPzogbnVtYmVyO1xufVxuXG5jb25zdCBDQVZFID0ge1xuICBzdWJBcmVhOiAnY2F2ZScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1DYXZlYCxcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tQ2F2ZWAsXG59IGFzIGNvbnN0O1xuY29uc3QgSE9VU0UgPSB7XG4gIHN1YkFyZWE6ICdob3VzZScsXG4gIHBhbGV0dGU6ICgpID0+IFN5bWJvbCgpLFxufSBhcyBjb25zdDtcbmNvbnN0IEZPUlRVTkVfVEVMTEVSID0ge1xuICBzdWJBcmVhOiAnaG91c2UnLFxuICBwYWxldHRlOiAoKSA9PiBTeW1ib2woKSxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUZvcnR1bmVUZWxsZXJgLFxufSBhcyBjb25zdDtcbmNvbnN0IE1FU0lBID0ge1xuICBuYW1lOiAnbWVzaWEnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tTWVzaWFgLFxuICAvLyBNZXNpYSBpbiB0b3dlciBrZWVwcyBzYW1lIHBhbGV0dGVcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGFyZWEubmFtZSA9PT0gJ1Rvd2VyJyA/XG4gICAgICBhcmVhLm5hbWUgOiBgJHthcmVhLm5hbWV9LU1lc2lhYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBEWU5BID0ge1xuICBuYW1lOiAnZHluYScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1EeW5hYCxcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tRHluYWAsXG59IGFzIGNvbnN0O1xuY29uc3QgS0VMQkVTUVVFID0ge1xuICBuYW1lOiAnZ29hIDEnLFxuICBtdXNpYzogJ2dvYSAxJyxcbiAgcGFsZXR0ZTogJ2dvYSAxJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBTQUJFUkEgPSB7XG4gIG5hbWU6ICdnb2EgMicsXG4gIG11c2ljOiAnZ29hIDInLFxuICBwYWxldHRlOiAnZ29hIDInLFxufSBhcyBjb25zdDtcbmNvbnN0IE1BRE9fTE9XRVIgPSB7XG4gIG5hbWU6ICdnb2EgMycsXG4gIG11c2ljOiAnZ29hIDMnLFxuICBwYWxldHRlOiAnZ29hIDMnLFxufSBhcyBjb25zdDtcbmNvbnN0IE1BRE9fVVBQRVIgPSB7Li4uTUFET19MT1dFUiwgcGFsZXR0ZTogJ2dvYSAzIHVwcGVyJ30gYXMgY29uc3Q7XG5jb25zdCBLQVJNSU5FX1VQUEVSID0ge1xuICBuYW1lOiAnZ29hIDQnLFxuICBtdXNpYzogJ2dvYSA0JyxcbiAgcGFsZXR0ZTogJ2dvYSA0Jyxcbn0gYXMgY29uc3Q7XG5jb25zdCBLQVJNSU5FX0xPV0VSID0gey4uLktBUk1JTkVfVVBQRVIsIHBhbGV0dGU6ICdnb2EgNCBsb3dlcid9IGFzIGNvbnN0O1xuXG50eXBlIEluaXRQYXJhbXMgPSByZWFkb25seSBbbnVtYmVyLCBMb2NhdGlvbkluaXQ/XTtcbnR5cGUgSW5pdCA9IHsoLi4uYXJnczogSW5pdFBhcmFtcyk6IExvY2F0aW9uLFxuICAgICAgICAgICAgIGNvbW1pdChsb2NhdGlvbnM6IExvY2F0aW9ucyk6IHZvaWR9O1xuY29uc3QgJDogSW5pdCA9ICgoKSA9PiB7XG4gIGNvbnN0ICQgPSBpbml0aWFsaXplcjxbbnVtYmVyLCBMb2NhdGlvbkluaXRdLCBMb2NhdGlvbj4oKTtcbiAgbGV0IGFyZWEhOiAoYXJlYXM6IEFyZWFzKSA9PiBBcmVhO1xuICBmdW5jdGlvbiAkJChpZDogbnVtYmVyLCBkYXRhOiBMb2NhdGlvbkluaXQgPSB7fSk6IExvY2F0aW9uIHtcbiAgICBkYXRhID0gey4uLmRhdGF9O1xuICAgIGFyZWEgPSBkYXRhLmFyZWEgPSBkYXRhLmFyZWEgfHwgYXJlYTtcbiAgICByZXR1cm4gJChpZCwgZGF0YSk7XG4gIH07XG4gICgkJCBhcyBJbml0KS5jb21taXQgPSAobG9jYXRpb25zOiBMb2NhdGlvbnMpID0+IHtcbiAgICBjb25zdCBhcmVhcyA9IGxvY2F0aW9ucy5yb20uYXJlYXM7XG4gICAgJC5jb21taXQobG9jYXRpb25zLCAocHJvcDogc3RyaW5nLCBpZDogbnVtYmVyLCBpbml0OiBMb2NhdGlvbkluaXQpID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB1cHBlckNhbWVsVG9TcGFjZXMocHJvcCk7XG4gICAgICBjb25zdCBhcmVhID0gaW5pdC5hcmVhIShhcmVhcyk7XG4gICAgICBjb25zdCBtdXNpYyA9IHR5cGVvZiBpbml0Lm11c2ljID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICBpbml0Lm11c2ljKGFyZWEpIDogaW5pdC5tdXNpYyAhPSBudWxsID9cbiAgICAgICAgICBpbml0Lm11c2ljIDogYXJlYS5uYW1lO1xuICAgICAgY29uc3QgcGFsZXR0ZSA9IHR5cGVvZiBpbml0LnBhbGV0dGUgPT09ICdmdW5jdGlvbicgP1xuICAgICAgICAgIGluaXQucGFsZXR0ZShhcmVhKSA6IGluaXQucGFsZXR0ZSB8fCBhcmVhLm5hbWU7XG4gICAgICBjb25zdCBkYXRhOiBMb2NhdGlvbkRhdGEgPSB7YXJlYSwgbmFtZSwgbXVzaWMsIHBhbGV0dGV9O1xuICAgICAgaWYgKGluaXQuc3ViQXJlYSAhPSBudWxsKSBkYXRhLnN1YkFyZWEgPSBpbml0LnN1YkFyZWE7XG4gICAgICBpZiAoaW5pdC5ib3NzU2NyZWVuICE9IG51bGwpIGRhdGEuYm9zc1NjcmVlbiA9IGluaXQuYm9zc1NjcmVlbjtcbiAgICAgIGNvbnN0IGxvY2F0aW9uID0gbmV3IExvY2F0aW9uKGxvY2F0aW9ucy5yb20sIGlkLCBkYXRhKTtcbiAgICAgIC8vIG5lZ2F0aXZlIGlkIGluZGljYXRlcyBpdCdzIG5vdCByZWdpc3RlcmVkLlxuICAgICAgaWYgKGlkID49IDApIGxvY2F0aW9uc1tpZF0gPSBsb2NhdGlvbjtcbiAgICAgIHJldHVybiBsb2NhdGlvbjtcbiAgICB9KTtcbiAgfTtcbiAgcmV0dXJuICQkIGFzIEluaXQ7XG59KSgpO1xuXG5leHBvcnQgY2xhc3MgTG9jYXRpb25zIGV4dGVuZHMgQXJyYXk8TG9jYXRpb24+IHtcblxuICByZWFkb25seSBNZXphbWVTaHJpbmUgICAgICAgICAgICAgPSAkKDB4MDAsIHthcmVhOiBhID0+IGEuTWV6YW1lfSk7XG4gIHJlYWRvbmx5IExlYWZfT3V0c2lkZVN0YXJ0ICAgICAgICA9ICQoMHgwMSwge211c2ljOiAxfSk7XG4gIHJlYWRvbmx5IExlYWYgICAgICAgICAgICAgICAgICAgICA9ICQoMHgwMiwge2FyZWE6IGEgPT4gYS5MZWFmfSk7XG4gIHJlYWRvbmx5IFZhbGxleU9mV2luZCAgICAgICAgICAgICA9ICQoMHgwMywge2FyZWE6IGEgPT4gYS5WYWxsZXlPZldpbmR9KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTEgICAgICAgICAgICAgID0gJCgweDA0LCB7YXJlYTogYSA9PiBhLlNlYWxlZENhdmV9KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTIgICAgICAgICAgICAgID0gJCgweDA1KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTYgICAgICAgICAgICAgID0gJCgweDA2KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTQgICAgICAgICAgICAgID0gJCgweDA3KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTUgICAgICAgICAgICAgID0gJCgweDA4KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTMgICAgICAgICAgICAgID0gJCgweDA5KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTcgICAgICAgICAgICAgID0gJCgweDBhLCB7Ym9zc1NjcmVlbjogMHg5MX0pO1xuICAvLyBJTlZBTElEOiAweDBiXG4gIHJlYWRvbmx5IFNlYWxlZENhdmU4ICAgICAgICAgICAgICA9ICQoMHgwYyk7XG4gIC8vIElOVkFMSUQ6IDB4MGRcbiAgcmVhZG9ubHkgV2luZG1pbGxDYXZlICAgICAgICAgICAgID0gJCgweDBlLCB7YXJlYTogYSA9PiBhLldpbmRtaWxsQ2F2ZX0pO1xuICByZWFkb25seSBXaW5kbWlsbCAgICAgICAgICAgICAgICAgPSAkKDB4MGYsIHthcmVhOiBhID0+IGEuV2luZG1pbGwsIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFplYnVDYXZlICAgICAgICAgICAgICAgICA9ICQoMHgxMCwge2FyZWE6IGEgPT4gYS5aZWJ1Q2F2ZX0pO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlMSAgICAgICAgPSAkKDB4MTEsIHthcmVhOiBhID0+IGEuTXRTYWJyZVdlc3QsIC4uLkNBVkV9KTtcbiAgLy8gSU5WQUxJRDogMHgxMlxuICAvLyBJTlZBTElEOiAweDEzXG4gIHJlYWRvbmx5IENvcmRlbFBsYWluV2VzdCAgICAgICAgICA9ICQoMHgxNCwge2FyZWE6IGEgPT4gYS5Db3JkZWxQbGFpbn0pO1xuICByZWFkb25seSBDb3JkZWxQbGFpbkVhc3QgICAgICAgICAgPSAkKDB4MTUpO1xuICAvLyBJTlZBTElEOiAweDE2IC0tIHVudXNlZCBjb3B5IG9mIDE4XG4gIC8vIElOVkFMSUQ6IDB4MTdcbiAgcmVhZG9ubHkgQnJ5bm1hZXIgICAgICAgICAgICAgICAgID0gJCgweDE4LCB7YXJlYTogYSA9PiBhLkJyeW5tYWVyfSk7XG4gIHJlYWRvbmx5IE91dHNpZGVTdG9tSG91c2UgICAgICAgICA9ICQoMHgxOSwge2FyZWE6IGEgPT4gYS5TdG9tSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFN3YW1wICAgICAgICAgICAgICAgICAgICA9ICQoMHgxYSwge2FyZWE6IGEgPT4gYS5Td2FtcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHg3Y30pO1xuICByZWFkb25seSBBbWF6b25lcyAgICAgICAgICAgICAgICAgPSAkKDB4MWIsIHthcmVhOiBhID0+IGEuQW1hem9uZXN9KTtcbiAgcmVhZG9ubHkgT2FrICAgICAgICAgICAgICAgICAgICAgID0gJCgweDFjLCB7YXJlYTogYSA9PiBhLk9ha30pO1xuICAvLyBJTlZBTElEOiAweDFkXG4gIHJlYWRvbmx5IFN0b21Ib3VzZSAgICAgICAgICAgICAgICA9ICQoMHgxZSwge2FyZWE6IGEgPT4gYS5TdG9tSG91c2V9KTtcbiAgLy8gSU5WQUxJRDogMHgxZlxuICByZWFkb25seSBNdFNhYnJlV2VzdF9Mb3dlciAgICAgICAgPSAkKDB4MjAsIHthcmVhOiBhID0+IGEuTXRTYWJyZVdlc3R9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfVXBwZXIgICAgICAgID0gJCgweDIxKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTIgICAgICAgID0gJCgweDIyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTMgICAgICAgID0gJCgweDIzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTQgICAgICAgID0gJCgweDI0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTUgICAgICAgID0gJCgweDI1LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTYgICAgICAgID0gJCgweDI2LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTcgICAgICAgID0gJCgweDI3LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX01haW4gICAgICAgID0gJCgweDI4LCB7YXJlYTogYSA9PiBhLk10U2FicmVOb3J0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweGI1fSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9NaWRkbGUgICAgICA9ICQoMHgyOSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlMiAgICAgICA9ICQoMHgyYSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlMyAgICAgICA9ICQoMHgyYiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNCAgICAgICA9ICQoMHgyYywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNSAgICAgICA9ICQoMHgyZCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNiAgICAgICA9ICQoMHgyZSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9Qcmlzb25IYWxsICA9ICQoMHgyZiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9MZWZ0Q2VsbCAgICA9ICQoMHgzMCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9MZWZ0Q2VsbDIgICA9ICQoMHgzMSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9SaWdodENlbGwgICA9ICQoMHgzMiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlOCAgICAgICA9ICQoMHgzMywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlOSAgICAgICA9ICQoMHgzNCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9TdW1taXRDYXZlICA9ICQoMHgzNSwgQ0FWRSk7XG4gIC8vIElOVkFMSUQ6IDB4MzZcbiAgLy8gSU5WQUxJRDogMHgzN1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTEgICAgICAgPSAkKDB4MzgsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTcgICAgICAgPSAkKDB4MzksIENBVkUpO1xuICAvLyBJTlZBTElEOiAweDNhXG4gIC8vIElOVkFMSUQ6IDB4M2JcbiAgcmVhZG9ubHkgTmFkYXJlX0lubiAgICAgICAgICAgICAgID0gJCgweDNjLCB7YXJlYTogYSA9PiBhLk5hZGFyZSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgTmFkYXJlX1Rvb2xTaG9wICAgICAgICAgID0gJCgweDNkLCBIT1VTRSk7XG4gIHJlYWRvbmx5IE5hZGFyZV9CYWNrUm9vbSAgICAgICAgICA9ICQoMHgzZSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweDNmXG4gIHJlYWRvbmx5IFdhdGVyZmFsbFZhbGxleU5vcnRoICAgICA9ICQoMHg0MCwge2FyZWE6IGEgPT4gYS5XYXRlcmZhbGxWYWxsZXl9KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsVmFsbGV5U291dGggICAgID0gJCgweDQxKTtcbiAgcmVhZG9ubHkgTGltZVRyZWVWYWxsZXkgICAgICAgICAgID0gJCgweDQyLCB7YXJlYTogYSA9PiBhLkxpbWVUcmVlVmFsbGV5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBMaW1lVHJlZUxha2UgICAgICAgICAgICAgPSAkKDB4NDMsIHthcmVhOiBhID0+IGEuTGltZVRyZWVMYWtlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBLaXJpc2FQbGFudENhdmUxICAgICAgICAgPSAkKDB4NDQsIHthcmVhOiBhID0+IGEuS2lyaXNhUGxhbnRDYXZlfSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTIgICAgICAgICA9ICQoMHg0NSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTMgICAgICAgICA9ICQoMHg0Nik7XG4gIHJlYWRvbmx5IEtpcmlzYU1lYWRvdyAgICAgICAgICAgICA9ICQoMHg0Nywge2FyZWE6IGEgPT4gYS5LaXJpc2FNZWFkb3d9KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUxICAgICAgICAgICAgID0gJCgweDQ4LCB7YXJlYTogYSA9PiBhLkZvZ0xhbXBDYXZlfSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlMiAgICAgICAgICAgICA9ICQoMHg0OSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlMyAgICAgICAgICAgICA9ICQoMHg0YSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlRGVhZEVuZCAgICAgICA9ICQoMHg0Yik7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNCAgICAgICAgICAgICA9ICQoMHg0Yyk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNSAgICAgICAgICAgICA9ICQoMHg0ZCk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNiAgICAgICAgICAgICA9ICQoMHg0ZSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNyAgICAgICAgICAgICA9ICQoMHg0Zik7XG4gIHJlYWRvbmx5IFBvcnRvYSAgICAgICAgICAgICAgICAgICA9ICQoMHg1MCwge2FyZWE6IGEgPT4gYS5Qb3J0b2F9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX0Zpc2hlcm1hbklzbGFuZCAgID0gJCgweDUxLCB7YXJlYTogYSA9PiBhLkZpc2hlcm1hbkhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBNZXNpYVNocmluZSAgICAgICAgICAgICAgPSAkKDB4NTIsIHthcmVhOiBhID0+IGEuTGltZVRyZWVMYWtlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5NRVNJQX0pO1xuICAvLyBJTlZBTElEOiAweDUzXG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUxICAgICAgICAgICA9ICQoMHg1NCwge2FyZWE6IGEgPT4gYS5XYXRlcmZhbGxDYXZlfSk7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUyICAgICAgICAgICA9ICQoMHg1NSk7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUzICAgICAgICAgICA9ICQoMHg1Nik7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmU0ICAgICAgICAgICA9ICQoMHg1Nyk7XG4gIHJlYWRvbmx5IFRvd2VyRW50cmFuY2UgICAgICAgICAgICA9ICQoMHg1OCwge2FyZWE6IGEgPT4gYS5Ub3dlcn0pO1xuICByZWFkb25seSBUb3dlcjEgICAgICAgICAgICAgICAgICAgPSAkKDB4NTkpO1xuICByZWFkb25seSBUb3dlcjIgICAgICAgICAgICAgICAgICAgPSAkKDB4NWEpO1xuICByZWFkb25seSBUb3dlcjMgICAgICAgICAgICAgICAgICAgPSAkKDB4NWIpO1xuICByZWFkb25seSBUb3dlck91dHNpZGVNZXNpYSAgICAgICAgPSAkKDB4NWMpO1xuICByZWFkb25seSBUb3dlck91dHNpZGVEeW5hICAgICAgICAgPSAkKDB4NWQpO1xuICByZWFkb25seSBUb3dlck1lc2lhICAgICAgICAgICAgICAgPSAkKDB4NWUsIE1FU0lBKTtcbiAgcmVhZG9ubHkgVG93ZXJEeW5hICAgICAgICAgICAgICAgID0gJCgweDVmLCBEWU5BKTtcbiAgcmVhZG9ubHkgQW5ncnlTZWEgICAgICAgICAgICAgICAgID0gJCgweDYwLCB7YXJlYTogYSA9PiBhLkFuZ3J5U2VhfSk7XG4gIHJlYWRvbmx5IEJvYXRIb3VzZSAgICAgICAgICAgICAgICA9ICQoMHg2MSk7XG4gIHJlYWRvbmx5IEpvZWxMaWdodGhvdXNlICAgICAgICAgICA9ICQoMHg2Miwge2FyZWE6IGEgPT4gYS5MaWdodGhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICAvLyBJTlZBTElEOiAweDYzXG4gIHJlYWRvbmx5IFVuZGVyZ3JvdW5kQ2hhbm5lbCAgICAgICA9ICQoMHg2NCwge2FyZWE6IGEgPT4gYS5VbmRlcmdyb3VuZENoYW5uZWx9KTtcbiAgcmVhZG9ubHkgWm9tYmllVG93biAgICAgICAgICAgICAgID0gJCgweDY1LCB7YXJlYTogYSA9PiBhLlpvbWJpZVRvd259KTtcbiAgLy8gSU5WQUxJRDogMHg2NlxuICAvLyBJTlZBTElEOiAweDY3XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQxICAgICAgICA9ICQoMHg2OCwge2FyZWE6IGEgPT4gYS5FdmlsU3Bpcml0SXNsYW5kRW50cmFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAxfSk7XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQyICAgICAgICA9ICQoMHg2OSwge2FyZWE6IGEgPT4gYS5FdmlsU3Bpcml0SXNsYW5kfSk7XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQzICAgICAgICA9ICQoMHg2YSk7XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQ0ICAgICAgICA9ICQoMHg2Yik7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTEgICAgICAgICAgICA9ICQoMHg2Yywge2FyZWE6IGEgPT4gYS5TYWJlcmFGb3J0cmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHhmZH0pO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UyICAgICAgICAgICAgPSAkKDB4NmQpO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UzICAgICAgICAgICAgPSAkKDB4NmUsIHtib3NzU2NyZWVuOiAweGZkfSk7XG4gIC8vIElOVkFMSUQ6IDB4NmYgLS0gU2FiZXJhIFBhbGFjZSAzIHVudXNlZCBjb3B5XG4gIHJlYWRvbmx5IEpvZWxTZWNyZXRQYXNzYWdlICAgICAgICA9ICQoMHg3MCwge2FyZWE6IGEgPT4gYS5Kb2VsUGFzc2FnZX0pO1xuICByZWFkb25seSBKb2VsICAgICAgICAgICAgICAgICAgICAgPSAkKDB4NzEsIHthcmVhOiBhID0+IGEuSm9lbH0pO1xuICByZWFkb25seSBTd2FuICAgICAgICAgICAgICAgICAgICAgPSAkKDB4NzIsIHthcmVhOiBhID0+IGEuU3dhbiwgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgU3dhbkdhdGUgICAgICAgICAgICAgICAgID0gJCgweDczLCB7YXJlYTogYSA9PiBhLlN3YW5HYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMX0pO1xuICAvLyBJTlZBTElEOiAweDc0XG4gIC8vIElOVkFMSUQ6IDB4NzVcbiAgLy8gSU5WQUxJRDogMHg3NlxuICAvLyBJTlZBTElEOiAweDc3XG4gIHJlYWRvbmx5IEdvYVZhbGxleSAgICAgICAgICAgICAgICA9ICQoMHg3OCwge2FyZWE6IGEgPT4gYS5Hb2FWYWxsZXl9KTtcbiAgLy8gSU5WQUxJRDogMHg3OVxuICAvLyBJTlZBTElEOiAweDdhXG4gIC8vIElOVkFMSUQ6IDB4N2JcbiAgcmVhZG9ubHkgTXRIeWRyYSAgICAgICAgICAgICAgICAgID0gJCgweDdjLCB7YXJlYTogYSA9PiBhLk10SHlkcmF9KTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMSAgICAgICAgICAgID0gJCgweDdkLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9PdXRzaWRlU2h5cm9uICAgID0gJCgweDdlKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMiAgICAgICAgICAgID0gJCgweDdmLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMyAgICAgICAgICAgID0gJCgweDgwLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNCAgICAgICAgICAgID0gJCgweDgxLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNSAgICAgICAgICAgID0gJCgweDgyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNiAgICAgICAgICAgID0gJCgweDgzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNyAgICAgICAgICAgID0gJCgweDg0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlOCAgICAgICAgICAgID0gJCgweDg1LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlOSAgICAgICAgICAgID0gJCgweDg2LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMTAgICAgICAgICAgID0gJCgweDg3LCBDQVZFKTtcbiAgcmVhZG9ubHkgU3R5eDEgICAgICAgICAgICAgICAgICAgID0gJCgweDg4LCB7YXJlYTogYSA9PiBhLlN0eXh9KTtcbiAgcmVhZG9ubHkgU3R5eDIgICAgICAgICAgICAgICAgICAgID0gJCgweDg5KTtcbiAgcmVhZG9ubHkgU3R5eDMgICAgICAgICAgICAgICAgICAgID0gJCgweDhhKTtcbiAgLy8gSU5WQUxJRDogMHg4YlxuICByZWFkb25seSBTaHlyb24gICAgICAgICAgICAgICAgICAgPSAkKDB4OGMsIHthcmVhOiBhID0+IGEuU2h5cm9ufSk7XG4gIC8vIElOVkFMSUQ6IDB4OGRcbiAgcmVhZG9ubHkgR29hICAgICAgICAgICAgICAgICAgICAgID0gJCgweDhlLCB7YXJlYTogYSA9PiBhLkdvYX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc0Jhc2VtZW50ICAgICAgPSAkKDB4OGYsIHthcmVhOiBhID0+IGEuRm9ydHJlc3NCYXNlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgRGVzZXJ0MSAgICAgICAgICAgICAgICAgID0gJCgweDkwLCB7YXJlYTogYSA9PiBhLkRlc2VydDF9KTtcbiAgcmVhZG9ubHkgT2FzaXNDYXZlTWFpbiAgICAgICAgICAgID0gJCgweDkxLCB7YXJlYTogYSA9PiBhLk9hc2lzQ2F2ZX0pO1xuICByZWFkb25seSBEZXNlcnRDYXZlMSAgICAgICAgICAgICAgPSAkKDB4OTIsIHthcmVhOiBhID0+IGEuRGVzZXJ0Q2F2ZTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFNhaGFyYSAgICAgICAgICAgICAgICAgICA9ICQoMHg5Mywge2FyZWE6IGEgPT4gYS5TYWhhcmF9KTtcbiAgcmVhZG9ubHkgU2FoYXJhT3V0c2lkZUNhdmUgICAgICAgID0gJCgweDk0LCB7bXVzaWM6IDB9KTsgLy8gVE9ETyAtIHNhaGFyYT8/IGdlbmVyaWM/P1xuICByZWFkb25seSBEZXNlcnRDYXZlMiAgICAgICAgICAgICAgPSAkKDB4OTUsIHthcmVhOiBhID0+IGEuRGVzZXJ0Q2F2ZTIsIG11c2ljOiAxfSk7XG4gIHJlYWRvbmx5IFNhaGFyYU1lYWRvdyAgICAgICAgICAgICA9ICQoMHg5Niwge2FyZWE6IGEgPT4gYS5TYWhhcmFNZWFkb3csIG11c2ljOiAwfSk7XG4gIC8vIElOVkFMSUQ6IDB4OTdcbiAgcmVhZG9ubHkgRGVzZXJ0MiAgICAgICAgICAgICAgICAgID0gJCgweDk4LCB7YXJlYTogYSA9PiBhLkRlc2VydDJ9KTtcbiAgLy8gSU5WQUxJRDogMHg5OVxuICAvLyBJTlZBTElEOiAweDlhXG4gIC8vIElOVkFMSUQ6IDB4OWJcbiAgcmVhZG9ubHkgUHlyYW1pZF9FbnRyYW5jZSAgICAgICAgID0gJCgweDljLCB7YXJlYTogYSA9PiBhLlB5cmFtaWR9KTtcbiAgcmVhZG9ubHkgUHlyYW1pZF9CcmFuY2ggICAgICAgICAgID0gJCgweDlkKTtcbiAgcmVhZG9ubHkgUHlyYW1pZF9NYWluICAgICAgICAgICAgID0gJCgweDllKTtcbiAgcmVhZG9ubHkgUHlyYW1pZF9EcmF5Z29uICAgICAgICAgID0gJCgweDlmKTtcbiAgcmVhZG9ubHkgQ3J5cHRfRW50cmFuY2UgICAgICAgICAgID0gJCgweGEwLCB7YXJlYTogYSA9PiBhLkNyeXB0fSk7XG4gIHJlYWRvbmx5IENyeXB0X0hhbGwxICAgICAgICAgICAgICA9ICQoMHhhMSk7XG4gIHJlYWRvbmx5IENyeXB0X0JyYW5jaCAgICAgICAgICAgICA9ICQoMHhhMik7XG4gIHJlYWRvbmx5IENyeXB0X0RlYWRFbmRMZWZ0ICAgICAgICA9ICQoMHhhMyk7XG4gIHJlYWRvbmx5IENyeXB0X0RlYWRFbmRSaWdodCAgICAgICA9ICQoMHhhNCk7XG4gIHJlYWRvbmx5IENyeXB0X0hhbGwyICAgICAgICAgICAgICA9ICQoMHhhNSk7XG4gIHJlYWRvbmx5IENyeXB0X0RyYXlnb24yICAgICAgICAgICA9ICQoMHhhNik7XG4gIHJlYWRvbmx5IENyeXB0X1RlbGVwb3J0ZXIgICAgICAgICA9ICQoMHhhNyk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0VudHJhbmNlICAgICA9ICQoMHhhOCwge2FyZWE6IGEgPT4gYS5Hb2FGb3J0cmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IEtFTEJFU1FVRS5tdXNpY30pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LZWxiZXNxdWUgICAgPSAkKDB4YTksIHtib3NzU2NyZWVuOiAweDczLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5LRUxCRVNRVUV9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfWmVidSAgICAgICAgID0gJCgweGFhLCB7Li4uS0VMQkVTUVVFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWxldHRlOiBTQUJFUkEucGFsZXR0ZX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19TYWJlcmEgICAgICAgPSAkKDB4YWIsIFNBQkVSQSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX1Rvcm5lbCAgICAgICA9ICQoMHhhYywge2Jvc3NTY3JlZW46IDB4OTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLlNBQkVSQSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZTogTUFET19MT1dFUi5wYWxldHRlfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8xICAgICAgICA9ICQoMHhhZCwgTUFET19MT1dFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8yICAgICAgICA9ICQoMHhhZSwgTUFET19VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8zICAgICAgICA9ICQoMHhhZiwgTUFET19VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUxICAgICA9ICQoMHhiMCwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUyICAgICA9ICQoMHhiMSwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUzICAgICA9ICQoMHhiMiwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU0ICAgICA9ICQoMHhiMywgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU1ICAgICA9ICQoMHhiNCwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU2ICAgICA9ICQoMHhiNSwgS0FSTUlORV9MT1dFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU3ICAgICA9ICQoMHhiNiwge2Jvc3NTY3JlZW46IDB4ZmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLktBUk1JTkVfTE9XRVJ9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfRXhpdCAgICAgICAgID0gJCgweGI3LCB7bXVzaWM6IEtBUk1JTkVfVVBQRVIubXVzaWN9KTtcbiAgcmVhZG9ubHkgT2FzaXNDYXZlX0VudHJhbmNlICAgICAgID0gJCgweGI4LCB7YXJlYTogYSA9PiBhLk9hc2lzRW50cmFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAyfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0FzaW5hICAgICAgICA9ICQoMHhiOSwge2FyZWE6IGEgPT4gYS5Hb2FGb3J0cmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uTUFET19VUFBFUixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHg5MX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LZW5zdSAgICAgICAgPSAkKDB4YmEsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FfSG91c2UgICAgICAgICAgICAgICAgPSAkKDB4YmIsIHthcmVhOiBhID0+IGEuR29hLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBHb2FfSW5uICAgICAgICAgICAgICAgICAgPSAkKDB4YmMsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhiZFxuICByZWFkb25seSBHb2FfVG9vbFNob3AgICAgICAgICAgICAgPSAkKDB4YmUsIEhPVVNFKTtcbiAgcmVhZG9ubHkgR29hX1RhdmVybiAgICAgICAgICAgICAgID0gJCgweGJmLCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfRWxkZXJIb3VzZSAgICAgICAgICA9ICQoMHhjMCwge2FyZWE6IGEgPT4gYS5MZWFmLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBMZWFmX1JhYmJpdEh1dCAgICAgICAgICAgPSAkKDB4YzEsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGMyLCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhjMywgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX0FybW9yU2hvcCAgICAgICAgICAgPSAkKDB4YzQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9TdHVkZW50SG91c2UgICAgICAgID0gJCgweGM1LCBIT1VTRSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX1RhdmVybiAgICAgICAgICA9ICQoMHhjNiwge2FyZWE6IGEgPT4gYS5CcnlubWFlciwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfUGF3blNob3AgICAgICAgID0gJCgweGM3LCBIT1VTRSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX0lubiAgICAgICAgICAgICA9ICQoMHhjOCwgSE9VU0UpO1xuICByZWFkb25seSBCcnlubWFlcl9Bcm1vclNob3AgICAgICAgPSAkKDB4YzksIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhjYVxuICByZWFkb25seSBCcnlubWFlcl9JdGVtU2hvcCAgICAgICAgPSAkKDB4Y2IsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhjY1xuICByZWFkb25seSBPYWtfRWxkZXJIb3VzZSAgICAgICAgICAgPSAkKDB4Y2QsIHthcmVhOiBhID0+IGEuT2FrLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBPYWtfTW90aGVySG91c2UgICAgICAgICAgPSAkKDB4Y2UsIEhPVVNFKTtcbiAgcmVhZG9ubHkgT2FrX1Rvb2xTaG9wICAgICAgICAgICAgID0gJCgweGNmLCBIT1VTRSk7XG4gIHJlYWRvbmx5IE9ha19Jbm4gICAgICAgICAgICAgICAgICA9ICQoMHhkMCwgSE9VU0UpO1xuICByZWFkb25seSBBbWF6b25lc19Jbm4gICAgICAgICAgICAgPSAkKDB4ZDEsIHthcmVhOiBhID0+IGEuQW1hem9uZXMsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0l0ZW1TaG9wICAgICAgICA9ICQoMHhkMiwgSE9VU0UpO1xuICByZWFkb25seSBBbWF6b25lc19Bcm1vclNob3AgICAgICAgPSAkKDB4ZDMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfRWxkZXIgICAgICAgICAgID0gJCgweGQ0LCBIT1VTRSk7XG4gIHJlYWRvbmx5IE5hZGFyZSAgICAgICAgICAgICAgICAgICA9ICQoMHhkNSwge2FyZWE6IGEgPT4gYS5OYWRhcmV9KTsgLy8gZWRnZS1kb29yP1xuICByZWFkb25seSBQb3J0b2FfRmlzaGVybWFuSG91c2UgICAgPSAkKDB4ZDYsIHthcmVhOiBhID0+IGEuRmlzaGVybWFuSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFLCBtdXNpYzogMH0pO1xuICByZWFkb25seSBQb3J0b2FfUGFsYWNlRW50cmFuY2UgICAgPSAkKDB4ZDcsIHthcmVhOiBhID0+IGEuUG9ydG9hUGFsYWNlfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Gb3J0dW5lVGVsbGVyICAgICA9ICQoMHhkOCwge2FyZWE6IGEgPT4gYS5Qb3J0b2EsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkZPUlRVTkVfVEVMTEVSfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9QYXduU2hvcCAgICAgICAgICA9ICQoMHhkOSwgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FfQXJtb3JTaG9wICAgICAgICAgPSAkKDB4ZGEsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhkYlxuICByZWFkb25seSBQb3J0b2FfSW5uICAgICAgICAgICAgICAgPSAkKDB4ZGMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hX1Rvb2xTaG9wICAgICAgICAgID0gJCgweGRkLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYVBhbGFjZV9MZWZ0ICAgICAgICA9ICQoMHhkZSwge2FyZWE6IGEgPT4gYS5Qb3J0b2FQYWxhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFBvcnRvYVBhbGFjZV9UaHJvbmVSb29tICA9ICQoMHhkZiwgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfUmlnaHQgICAgICAgPSAkKDB4ZTAsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hX0FzaW5hUm9vbSAgICAgICAgID0gJCgweGUxLCB7YXJlYTogYSA9PiBhLlVuZGVyZ3JvdW5kQ2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0UsIG11c2ljOiAnYXNpbmEnfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0VsZGVyRG93bnN0YWlycyA9ICQoMHhlMiwge2FyZWE6IGEgPT4gYS5BbWF6b25lcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgSm9lbF9FbGRlckhvdXNlICAgICAgICAgID0gJCgweGUzLCB7YXJlYTogYSA9PiBhLkpvZWwsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEpvZWxfU2hlZCAgICAgICAgICAgICAgICA9ICQoMHhlNCwgSE9VU0UpO1xuICByZWFkb25seSBKb2VsX1Rvb2xTaG9wICAgICAgICAgICAgPSAkKDB4ZTUsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhlNlxuICByZWFkb25seSBKb2VsX0lubiAgICAgICAgICAgICAgICAgPSAkKDB4ZTcsIEhPVVNFKTtcbiAgcmVhZG9ubHkgWm9tYmllVG93bl9Ib3VzZSAgICAgICAgID0gJCgweGU4LCB7YXJlYTogYSA9PiBhLlpvbWJpZVRvd24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd25fSG91c2VCYXNlbWVudCA9ICQoMHhlOSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGVhXG4gIHJlYWRvbmx5IFN3YW5fVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhlYiwge2FyZWE6IGEgPT4gYS5Td2FuLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBTd2FuX1N0b21IdXQgICAgICAgICAgICAgPSAkKDB4ZWMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGVkLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fQXJtb3JTaG9wICAgICAgICAgICA9ICQoMHhlZSwgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX1RhdmVybiAgICAgICAgICAgICAgPSAkKDB4ZWYsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9QYXduU2hvcCAgICAgICAgICAgID0gJCgweGYwLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fRGFuY2VIYWxsICAgICAgICAgICA9ICQoMHhmMSwgSE9VU0UpO1xuICByZWFkb25seSBTaHlyb25fVGVtcGxlICAgICAgICAgICAgPSAkKDB4ZjIsIHthcmVhOiBhID0+IGEuU2h5cm9uVGVtcGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDcwfSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9UcmFpbmluZ0hhbGwgICAgICA9ICQoMHhmMywge2FyZWE6IGEgPT4gYS5TaHlyb24sIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Ib3NwaXRhbCAgICAgICAgICA9ICQoMHhmNCwgSE9VU0UpO1xuICByZWFkb25seSBTaHlyb25fQXJtb3JTaG9wICAgICAgICAgPSAkKDB4ZjUsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2h5cm9uX1Rvb2xTaG9wICAgICAgICAgID0gJCgweGY2LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Jbm4gICAgICAgICAgICAgICA9ICQoMHhmNywgSE9VU0UpO1xuICByZWFkb25seSBTYWhhcmFfSW5uICAgICAgICAgICAgICAgPSAkKDB4ZjgsIHthcmVhOiBhID0+IGEuU2FoYXJhLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBTYWhhcmFfVG9vbFNob3AgICAgICAgICAgPSAkKDB4ZjksIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2FoYXJhX0VsZGVySG91c2UgICAgICAgID0gJCgweGZhLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9QYXduU2hvcCAgICAgICAgICA9ICQoMHhmYiwgSE9VU0UpO1xuXG4gIC8vIE5ldyBsb2NhdGlvbnMsIG5vIElEIHByb2N1cmVkIHlldC5cbiAgcmVhZG9ubHkgRWFzdENhdmUxICAgICAgPSAkKC0xLCB7YXJlYTogYSA9PiBhLkVhc3RDYXZlfSk7XG4gIHJlYWRvbmx5IEVhc3RDYXZlMiAgICAgID0gJCgtMSk7XG4gIHJlYWRvbmx5IEZpc2hlcm1hbkJlYWNoID0gJCgtMSwge2FyZWE6IGEgPT4gYS5GaXNoZXJtYW5Ib3VzZSwgLi4uSE9VU0V9KTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHN1cGVyKDB4MTAwKTtcbiAgICAkLmNvbW1pdCh0aGlzKTtcbiAgICAvLyBGaWxsIGluIGFueSBtaXNzaW5nIG9uZXNcbiAgICBmb3IgKGxldCBpZCA9IDA7IGlkIDwgMHgxMDA7IGlkKyspIHtcbiAgICAgIGlmICh0aGlzW2lkXSkgY29udGludWU7XG4gICAgICB0aGlzW2lkXSA9IG5ldyBMb2NhdGlvbihyb20sIGlkLCB7XG4gICAgICAgIGFyZWE6IHJvbS5hcmVhcy5FbXB0eSxcbiAgICAgICAgbmFtZTogJycsXG4gICAgICAgIG11c2ljOiAnJyxcbiAgICAgICAgcGFsZXR0ZTogJycsXG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gVE9ETyAtIG1ldGhvZCB0byBhZGQgYW4gdW5yZWdpc3RlcmVkIGxvY2F0aW9uIHRvIGFuIGVtcHR5IGluZGV4LlxuICB9XG5cbiAgYWxsb2NhdGUobG9jYXRpb246IExvY2F0aW9uKTogTG9jYXRpb24ge1xuICAgIC8vIHBpY2sgYW4gdW51c2VkIGxvY2F0aW9uXG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMpIHtcbiAgICAgIGlmIChsLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgKGxvY2F0aW9uIGFzIGFueSkuaWQgPSBsLmlkO1xuICAgICAgbG9jYXRpb24udXNlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpc1tsLmlkXSA9IGxvY2F0aW9uO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHVudXNlZCBsb2NhdGlvbicpO1xuICB9XG5cbiAgLy8gLy8gRmluZCBhbGwgZ3JvdXBzIG9mIG5laWdoYm9yaW5nIGxvY2F0aW9ucyB3aXRoIG1hdGNoaW5nIHByb3BlcnRpZXMuXG4gIC8vIC8vIFRPRE8gLSBvcHRpb25hbCBhcmc6IGNoZWNrIGFkamFjZW50ICMgSURzLi4uP1xuICAvLyBwYXJ0aXRpb248VD4oZnVuYzogKGxvYzogTG9jYXRpb24pID0+IFQsIGVxOiBFcTxUPiA9IChhLCBiKSA9PiBhID09PSBiLCBqb2luTmV4dXNlcyA9IGZhbHNlKTogW0xvY2F0aW9uW10sIFRdW10ge1xuICAvLyAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PExvY2F0aW9uPigpO1xuICAvLyAgIGNvbnN0IG91dDogW0xvY2F0aW9uW10sIFRdW10gPSBbXTtcbiAgLy8gICBmb3IgKGxldCBsb2Mgb2YgdGhpcykge1xuICAvLyAgICAgaWYgKHNlZW4uaGFzKGxvYykgfHwgIWxvYy51c2VkKSBjb250aW51ZTtcbiAgLy8gICAgIHNlZW4uYWRkKGxvYyk7XG4gIC8vICAgICBjb25zdCB2YWx1ZSA9IGZ1bmMobG9jKTtcbiAgLy8gICAgIGNvbnN0IGdyb3VwID0gW107XG4gIC8vICAgICBjb25zdCBxdWV1ZSA9IFtsb2NdO1xuICAvLyAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCkge1xuICAvLyAgICAgICBjb25zdCBuZXh0ID0gcXVldWUucG9wKCkhO1xuICAvLyAgICAgICBncm91cC5wdXNoKG5leHQpO1xuICAvLyAgICAgICBmb3IgKGNvbnN0IG4gb2YgbmV4dC5uZWlnaGJvcnMoam9pbk5leHVzZXMpKSB7XG4gIC8vICAgICAgICAgaWYgKCFzZWVuLmhhcyhuKSAmJiBlcShmdW5jKG4pLCB2YWx1ZSkpIHtcbiAgLy8gICAgICAgICAgIHNlZW4uYWRkKG4pO1xuICAvLyAgICAgICAgICAgcXVldWUucHVzaChuKTtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIG91dC5wdXNoKFtbLi4uZ3JvdXBdLCB2YWx1ZV0pO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gb3V0O1xuICAvLyB9XG59XG5cbi8vIExvY2F0aW9uIGVudGl0aWVzXG5leHBvcnQgY2xhc3MgTG9jYXRpb24gZXh0ZW5kcyBFbnRpdHkge1xuXG4gIHVzZWQ6IGJvb2xlYW47XG5cbiAgYmdtOiBudW1iZXI7XG4gIGxheW91dFdpZHRoOiBudW1iZXI7XG4gIGxheW91dEhlaWdodDogbnVtYmVyO1xuICBhbmltYXRpb246IG51bWJlcjtcbiAgZXh0ZW5kZWQ6IG51bWJlcjtcbiAgc2NyZWVuczogbnVtYmVyW11bXTtcblxuICB0aWxlUGF0dGVybnM6IFtudW1iZXIsIG51bWJlcl07XG4gIHRpbGVQYWxldHRlczogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICB0aWxlc2V0OiBudW1iZXI7XG4gIHRpbGVFZmZlY3RzOiBudW1iZXI7XG5cbiAgZW50cmFuY2VzOiBFbnRyYW5jZVtdO1xuICBleGl0czogRXhpdFtdO1xuICBmbGFnczogRmxhZ1tdO1xuICBwaXRzOiBQaXRbXTtcblxuICBzcHJpdGVQYWxldHRlczogW251bWJlciwgbnVtYmVyXTtcbiAgc3ByaXRlUGF0dGVybnM6IFtudW1iZXIsIG51bWJlcl07XG4gIHNwYXduczogU3Bhd25bXTtcblxuICBjb25zdHJ1Y3Rvcihyb206IFJvbSwgaWQ6IG51bWJlciwgcmVhZG9ubHkgZGF0YTogTG9jYXRpb25EYXRhKSB7XG4gICAgLy8gd2lsbCBpbmNsdWRlIGJvdGggTWFwRGF0YSAqYW5kKiBOcGNEYXRhLCBzaW5jZSB0aGV5IHNoYXJlIGEga2V5LlxuICAgIHN1cGVyKHJvbSwgaWQpO1xuXG4gICAgY29uc3QgbWFwRGF0YUJhc2UgPVxuICAgICAgICBpZCA+PSAwID8gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFQb2ludGVyKSArIDB4YzAwMCA6IDA7XG4gICAgLy8gVE9ETyAtIHBhc3MgdGhpcyBpbiBhbmQgbW92ZSBMT0NBVElPTlMgdG8gbG9jYXRpb25zLnRzXG4gICAgdGhpcy51c2VkID0gbWFwRGF0YUJhc2UgPiAweGMwMDAgJiYgISF0aGlzLm5hbWU7XG5cbiAgICBpZiAoIXRoaXMudXNlZCkge1xuICAgICAgdGhpcy5iZ20gPSAwO1xuICAgICAgdGhpcy5sYXlvdXRXaWR0aCA9IDA7XG4gICAgICB0aGlzLmxheW91dEhlaWdodCA9IDA7XG4gICAgICB0aGlzLmFuaW1hdGlvbiA9IDA7XG4gICAgICB0aGlzLmV4dGVuZGVkID0gMDtcbiAgICAgIHRoaXMuc2NyZWVucyA9IFtbMF1dO1xuICAgICAgdGhpcy50aWxlUGFsZXR0ZXMgPSBbMHgyNCwgMHgwMSwgMHgyNl07XG4gICAgICB0aGlzLnRpbGVzZXQgPSAweDgwO1xuICAgICAgdGhpcy50aWxlRWZmZWN0cyA9IDB4YjM7XG4gICAgICB0aGlzLnRpbGVQYXR0ZXJucyA9IFsyLCA0XTtcbiAgICAgIHRoaXMuZXhpdHMgPSBbXTtcbiAgICAgIHRoaXMuZW50cmFuY2VzID0gW107XG4gICAgICB0aGlzLmZsYWdzID0gW107XG4gICAgICB0aGlzLnBpdHMgPSBbXTtcbiAgICAgIHRoaXMuc3Bhd25zID0gW107XG4gICAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID0gWzAsIDBdO1xuICAgICAgdGhpcy5zcHJpdGVQYXR0ZXJucyA9IFswLCAwXTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBsYXlvdXRCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSkgKyAweGMwMDA7XG4gICAgY29uc3QgZ3JhcGhpY3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDIpICsgMHhjMDAwO1xuICAgIGNvbnN0IGVudHJhbmNlc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgNCkgKyAweGMwMDA7XG4gICAgY29uc3QgZXhpdHNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDYpICsgMHhjMDAwO1xuICAgIGNvbnN0IGZsYWdzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyA4KSArIDB4YzAwMDtcblxuICAgIC8vIFJlYWQgdGhlIGV4aXRzIGZpcnN0IHNvIHRoYXQgd2UgY2FuIGRldGVybWluZSBpZiB0aGVyZSdzIGVudHJhbmNlL3BpdHNcbiAgICAvLyBtZXRhZGF0YSBlbmNvZGVkIGF0IHRoZSBlbmQuXG4gICAgbGV0IGhhc1BpdHMgPSB0aGlzLnVzZWQgJiYgbGF5b3V0QmFzZSAhPT0gbWFwRGF0YUJhc2UgKyAxMDtcbiAgICBsZXQgZW50cmFuY2VMZW4gPSBleGl0c0Jhc2UgLSBlbnRyYW5jZXNCYXNlO1xuICAgIHRoaXMuZXhpdHMgPSAoKCkgPT4ge1xuICAgICAgY29uc3QgZXhpdHMgPSBbXTtcbiAgICAgIGxldCBpID0gZXhpdHNCYXNlO1xuICAgICAgd2hpbGUgKCEocm9tLnByZ1tpXSAmIDB4ODApKSB7XG4gICAgICAgIC8vIE5PVEU6IHNldCBkZXN0IHRvIEZGIHRvIGRpc2FibGUgYW4gZXhpdCAoaXQncyBhbiBpbnZhbGlkIGxvY2F0aW9uIGFueXdheSlcbiAgICAgICAgaWYgKHJvbS5wcmdbaSArIDJdICE9IDB4ZmYpIHtcbiAgICAgICAgICBleGl0cy5wdXNoKEV4aXQuZnJvbShyb20ucHJnLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgaSArPSA0O1xuICAgICAgfVxuICAgICAgaWYgKHJvbS5wcmdbaV0gIT09IDB4ZmYpIHtcbiAgICAgICAgaGFzUGl0cyA9ICEhKHJvbS5wcmdbaV0gJiAweDQwKTtcbiAgICAgICAgZW50cmFuY2VMZW4gPSAocm9tLnByZ1tpXSAmIDB4MWYpIDw8IDI7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXhpdHM7XG4gICAgfSkoKTtcblxuICAgIC8vIFRPRE8gLSB0aGVzZSBoZXVyaXN0aWNzIHdpbGwgbm90IHdvcmsgdG8gcmUtcmVhZCB0aGUgbG9jYXRpb25zLlxuICAgIC8vICAgICAgLSB3ZSBjYW4gbG9vayBhdCB0aGUgb3JkZXI6IGlmIHRoZSBkYXRhIGlzIEJFRk9SRSB0aGUgcG9pbnRlcnNcbiAgICAvLyAgICAgICAgdGhlbiB3ZSdyZSBpbiBhIHJld3JpdHRlbiBzdGF0ZTsgaW4gdGhhdCBjYXNlLCB3ZSBuZWVkIHRvIHNpbXBseVxuICAgIC8vICAgICAgICBmaW5kIGFsbCByZWZzIGFuZCBtYXguLi4/XG4gICAgLy8gICAgICAtIGNhbiB3ZSByZWFkIHRoZXNlIHBhcnRzIGxhemlseT9cbiAgICBjb25zdCBwaXRzQmFzZSA9XG4gICAgICAgICFoYXNQaXRzID8gMCA6IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyAxMCkgKyAweGMwMDA7XG5cbiAgICB0aGlzLmJnbSA9IHJvbS5wcmdbbGF5b3V0QmFzZV07XG4gICAgdGhpcy5sYXlvdXRXaWR0aCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDFdO1xuICAgIHRoaXMubGF5b3V0SGVpZ2h0ID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgMl07XG4gICAgdGhpcy5hbmltYXRpb24gPSByb20ucHJnW2xheW91dEJhc2UgKyAzXTtcbiAgICB0aGlzLmV4dGVuZGVkID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgNF07XG4gICAgdGhpcy5zY3JlZW5zID0gc2VxKFxuICAgICAgICB0aGlzLmhlaWdodCxcbiAgICAgICAgeSA9PiB0dXBsZShyb20ucHJnLCBsYXlvdXRCYXNlICsgNSArIHkgKiB0aGlzLndpZHRoLCB0aGlzLndpZHRoKSk7XG4gICAgdGhpcy50aWxlUGFsZXR0ZXMgPSB0dXBsZTxudW1iZXI+KHJvbS5wcmcsIGdyYXBoaWNzQmFzZSwgMyk7XG4gICAgdGhpcy50aWxlc2V0ID0gcm9tLnByZ1tncmFwaGljc0Jhc2UgKyAzXTtcbiAgICB0aGlzLnRpbGVFZmZlY3RzID0gcm9tLnByZ1tncmFwaGljc0Jhc2UgKyA0XTtcbiAgICB0aGlzLnRpbGVQYXR0ZXJucyA9IHR1cGxlKHJvbS5wcmcsIGdyYXBoaWNzQmFzZSArIDUsIDIpO1xuXG4gICAgdGhpcy5lbnRyYW5jZXMgPVxuICAgICAgZ3JvdXAoNCwgcm9tLnByZy5zbGljZShlbnRyYW5jZXNCYXNlLCBlbnRyYW5jZXNCYXNlICsgZW50cmFuY2VMZW4pLFxuICAgICAgICAgICAgeCA9PiBFbnRyYW5jZS5mcm9tKHgpKTtcbiAgICB0aGlzLmZsYWdzID0gdmFyU2xpY2Uocm9tLnByZywgZmxhZ3NCYXNlLCAyLCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBGbGFnLmZyb20oeCkpO1xuICAgIHRoaXMucGl0cyA9IHBpdHNCYXNlID8gdmFyU2xpY2Uocm9tLnByZywgcGl0c0Jhc2UsIDQsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBQaXQuZnJvbSh4KSkgOiBbXTtcblxuICAgIGNvbnN0IG5wY0RhdGFCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm5wY0RhdGFQb2ludGVyKSArIDB4MTAwMDA7XG4gICAgY29uc3QgaGFzU3Bhd25zID0gbnBjRGF0YUJhc2UgIT09IDB4MTAwMDA7XG4gICAgdGhpcy5zcHJpdGVQYWxldHRlcyA9XG4gICAgICAgIGhhc1NwYXducyA/IHR1cGxlKHJvbS5wcmcsIG5wY0RhdGFCYXNlICsgMSwgMikgOiBbMCwgMF07XG4gICAgdGhpcy5zcHJpdGVQYXR0ZXJucyA9XG4gICAgICAgIGhhc1NwYXducyA/IHR1cGxlKHJvbS5wcmcsIG5wY0RhdGFCYXNlICsgMywgMikgOiBbMCwgMF07XG4gICAgdGhpcy5zcGF3bnMgPVxuICAgICAgICBoYXNTcGF3bnMgPyB2YXJTbGljZShyb20ucHJnLCBucGNEYXRhQmFzZSArIDUsIDQsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IFNwYXduLmZyb20oeCkpIDogW107XG4gIH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRhdGEubmFtZTtcbiAgfVxuXG4gIGdldCBtYXBEYXRhUG9pbnRlcigpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmlkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyBtYXBkYXRhIHBvaW50ZXIgZm9yICR7dGhpcy5uYW1lfWApO1xuICAgIHJldHVybiAweDE0MzAwICsgKHRoaXMuaWQgPDwgMSk7XG4gIH1cblxuICBnZXQgbnBjRGF0YVBvaW50ZXIoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5pZCA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gbnBjZGF0YSBwb2ludGVyIGZvciAke3RoaXMubmFtZX1gKTtcbiAgICByZXR1cm4gMHgxOTIwMSArICh0aGlzLmlkIDw8IDEpO1xuICB9XG5cbiAgZ2V0IGhhc1NwYXducygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zcGF3bnMubGVuZ3RoID4gMDtcbiAgfVxuXG4gIC8vIE9mZnNldCB0byBPUiB3aXRoIHNjcmVlbiBJRHMuXG4gIGdldCBzY3JlZW5QYWdlKCk6IG51bWJlciB7XG4gICAgaWYgKCF0aGlzLnJvbS5jb21wcmVzc2VkTWFwRGF0YSkgcmV0dXJuIHRoaXMuZXh0ZW5kZWQgPyAweDEwMCA6IDA7XG4gICAgcmV0dXJuIHRoaXMuZXh0ZW5kZWQgPDwgODtcbiAgfVxuXG4gIGlzU2hvcCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5yb20uc2hvcHMuZmluZEluZGV4KHMgPT4gcy5sb2NhdGlvbiA9PT0gdGhpcy5pZCkgPj0gMDtcbiAgfVxuXG4gIHNwYXduKGlkOiBudW1iZXIpOiBTcGF3biB7XG4gICAgY29uc3Qgc3Bhd24gPSB0aGlzLnNwYXduc1tpZCAtIDB4ZF07XG4gICAgaWYgKCFzcGF3bikgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBzcGF3biAkJHtoZXgoaWQpfWApO1xuICAgIHJldHVybiBzcGF3bjtcbiAgfVxuXG4gIGdldCB3aWR0aCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sYXlvdXRXaWR0aCArIDE7IH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIpIHsgdGhpcy5sYXlvdXRXaWR0aCA9IHdpZHRoIC0gMTsgfVxuXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubGF5b3V0SGVpZ2h0ICsgMTsgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7IHRoaXMubGF5b3V0SGVpZ2h0ID0gaGVpZ2h0IC0gMTsgfVxuXG4gIC8vIG1vbnN0ZXJzKCkge1xuICAvLyAgIGlmICghdGhpcy5zcGF3bnMpIHJldHVybiBbXTtcbiAgLy8gICByZXR1cm4gdGhpcy5zcGF3bnMuZmxhdE1hcChcbiAgLy8gICAgIChbLCwgdHlwZSwgaWRdLCBzbG90KSA9PlxuICAvLyAgICAgICB0eXBlICYgNyB8fCAhdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0gPyBbXSA6IFtcbiAgLy8gICAgICAgICBbdGhpcy5pZCxcbiAgLy8gICAgICAgICAgc2xvdCArIDB4MGQsXG4gIC8vICAgICAgICAgIHR5cGUgJiAweDgwID8gMSA6IDAsXG4gIC8vICAgICAgICAgIGlkICsgMHg1MCxcbiAgLy8gICAgICAgICAgdGhpcy5zcHJpdGVQYXR0ZXJuc1t0eXBlICYgMHg4MCA/IDEgOiAwXSxcbiAgLy8gICAgICAgICAgdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSxcbiAgLy8gICAgICAgICAgdGhpcy5zcHJpdGVQYWxldHRlc1t0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXS5wYWxldHRlcygpWzBdIC0gMl0sXG4gIC8vICAgICAgICAgXV0pO1xuICAvLyB9XG5cbiAgYXN5bmMgd3JpdGUod3JpdGVyOiBXcml0ZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMudXNlZCkgcmV0dXJuO1xuICAgIGNvbnN0IHByb21pc2VzID0gW107XG4gICAgaWYgKCF0aGlzLnNwYXducy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXMgPSBbMHhmZiwgMHhmZl07XG4gICAgICB0aGlzLnNwcml0ZVBhdHRlcm5zID0gWzB4ZmYsIDB4ZmZdO1xuICAgIH1cbiAgICAvLyB3cml0ZSBOUEMgZGF0YSBmaXJzdCwgaWYgcHJlc2VudC4uLlxuICAgIGNvbnN0IGRhdGEgPSBbMCwgLi4udGhpcy5zcHJpdGVQYWxldHRlcywgLi4udGhpcy5zcHJpdGVQYXR0ZXJucyxcbiAgICAgICAgICAgICAgICAgIC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLnNwYXducyksIDB4ZmZdO1xuICAgIHByb21pc2VzLnB1c2goXG4gICAgICAgIHdyaXRlci53cml0ZShkYXRhLCAweDE4MDAwLCAweDFiZmZmLCBgTnBjRGF0YSAke2hleCh0aGlzLmlkKX1gKVxuICAgICAgICAgICAgLnRoZW4oYWRkcmVzcyA9PiB3cml0ZUxpdHRsZUVuZGlhbihcbiAgICAgICAgICAgICAgICB3cml0ZXIucm9tLCB0aGlzLm5wY0RhdGFQb2ludGVyLCBhZGRyZXNzIC0gMHgxMDAwMCkpKTtcbiAgICBjb25zdCB3cml0ZSA9IChkYXRhOiBEYXRhPG51bWJlcj4sIG5hbWU6IHN0cmluZykgPT5cbiAgICAgICAgd3JpdGVyLndyaXRlKGRhdGEsIDB4MTQwMDAsIDB4MTdmZmYsIGAke25hbWV9ICR7aGV4KHRoaXMuaWQpfWApO1xuICAgIGNvbnN0IGxheW91dCA9IHRoaXMucm9tLmNvbXByZXNzZWRNYXBEYXRhID8gW1xuICAgICAgdGhpcy5iZ20sXG4gICAgICAvLyBDb21wcmVzc2VkIHZlcnNpb246IHl4IGluIG9uZSBieXRlLCBleHQrYW5pbSBpbiBvbmUgYnl0ZVxuICAgICAgdGhpcy5sYXlvdXRIZWlnaHQgPDwgNCB8IHRoaXMubGF5b3V0V2lkdGgsXG4gICAgICB0aGlzLmV4dGVuZGVkIDw8IDIgfCB0aGlzLmFuaW1hdGlvbixcbiAgICAgIC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLnNjcmVlbnMpLFxuICAgIF0gOiBbXG4gICAgICB0aGlzLmJnbSxcbiAgICAgIHRoaXMubGF5b3V0V2lkdGgsIHRoaXMubGF5b3V0SGVpZ2h0LCB0aGlzLmFuaW1hdGlvbiwgdGhpcy5leHRlbmRlZCxcbiAgICAgIC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLnNjcmVlbnMpLFxuICAgIF07XG4gICAgY29uc3QgZ3JhcGhpY3MgPVxuICAgICAgICBbLi4udGhpcy50aWxlUGFsZXR0ZXMsXG4gICAgICAgICB0aGlzLnRpbGVzZXQsIHRoaXMudGlsZUVmZmVjdHMsXG4gICAgICAgICAuLi50aGlzLnRpbGVQYXR0ZXJuc107XG4gICAgLy8gUXVpY2sgc2FuaXR5IGNoZWNrOiBpZiBhbiBlbnRyYW5jZS9leGl0IGlzIGJlbG93IHRoZSBIVUQgb24gYVxuICAgIC8vIG5vbi12ZXJ0aWNhbGx5IHNjcm9sbGluZyBtYXAsIHRoZW4gd2UgbmVlZCB0byBtb3ZlIGl0IHVwLlxuICAgIGlmICh0aGlzLmhlaWdodCA9PT0gMSkge1xuICAgICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgICBpZiAoIWVudHJhbmNlLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZW50cmFuY2UueSA+IDB4YmYpIGVudHJhbmNlLnkgPSAweGJmO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgICAgaWYgKGV4aXQueXQgPiAweDBjKSBleGl0Lnl0ID0gMHgwYztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZW50cmFuY2VzID0gY29uY2F0SXRlcmFibGVzKHRoaXMuZW50cmFuY2VzKTtcbiAgICBjb25zdCBleGl0cyA9IFsuLi5jb25jYXRJdGVyYWJsZXModGhpcy5leGl0cyksXG4gICAgICAgICAgICAgICAgICAgMHg4MCB8ICh0aGlzLnBpdHMubGVuZ3RoID8gMHg0MCA6IDApIHwgdGhpcy5lbnRyYW5jZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgXTtcbiAgICBjb25zdCBmbGFncyA9IFsuLi5jb25jYXRJdGVyYWJsZXModGhpcy5mbGFncyksIDB4ZmZdO1xuICAgIGNvbnN0IHBpdHMgPSBjb25jYXRJdGVyYWJsZXModGhpcy5waXRzKTtcbiAgICBjb25zdCBbbGF5b3V0QWRkciwgZ3JhcGhpY3NBZGRyLCBlbnRyYW5jZXNBZGRyLCBleGl0c0FkZHIsIGZsYWdzQWRkciwgcGl0c0FkZHJdID1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgIHdyaXRlKGxheW91dCwgJ0xheW91dCcpLFxuICAgICAgICAgIHdyaXRlKGdyYXBoaWNzLCAnR3JhcGhpY3MnKSxcbiAgICAgICAgICB3cml0ZShlbnRyYW5jZXMsICdFbnRyYW5jZXMnKSxcbiAgICAgICAgICB3cml0ZShleGl0cywgJ0V4aXRzJyksXG4gICAgICAgICAgd3JpdGUoZmxhZ3MsICdGbGFncycpLFxuICAgICAgICAgIC4uLihwaXRzLmxlbmd0aCA/IFt3cml0ZShwaXRzLCAnUGl0cycpXSA6IFtdKSxcbiAgICAgICAgXSk7XG4gICAgY29uc3QgYWRkcmVzc2VzID0gW1xuICAgICAgbGF5b3V0QWRkciAmIDB4ZmYsIChsYXlvdXRBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICBncmFwaGljc0FkZHIgJiAweGZmLCAoZ3JhcGhpY3NBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICBlbnRyYW5jZXNBZGRyICYgMHhmZiwgKGVudHJhbmNlc0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGV4aXRzQWRkciAmIDB4ZmYsIChleGl0c0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIGZsYWdzQWRkciAmIDB4ZmYsIChmbGFnc0FkZHIgPj4+IDgpIC0gMHhjMCxcbiAgICAgIC4uLihwaXRzQWRkciA/IFtwaXRzQWRkciAmIDB4ZmYsIChwaXRzQWRkciA+PiA4KSAtIDB4YzBdIDogW10pLFxuICAgIF07XG4gICAgY29uc3QgYmFzZSA9IGF3YWl0IHdyaXRlKGFkZHJlc3NlcywgJ01hcERhdGEnKTtcbiAgICB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCB0aGlzLm1hcERhdGFQb2ludGVyLCBiYXNlIC0gMHhjMDAwKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICAvLyBJZiB0aGlzIGlzIGEgYm9zcyByb29tLCB3cml0ZSB0aGUgcmVzdG9yYXRpb24uXG4gICAgY29uc3QgYm9zc0lkID0gdGhpcy5ib3NzSWQoKTtcbiAgICBpZiAoYm9zc0lkICE9IG51bGwgJiYgdGhpcy5pZCAhPT0gMHg1ZikgeyAvLyBkb24ndCByZXN0b3JlIGR5bmFcbiAgICAgIC8vIFRoaXMgdGFibGUgc2hvdWxkIHJlc3RvcmUgcGF0MCBidXQgbm90IHBhdDFcbiAgICAgIGxldCBwYXRzID0gW3RoaXMuc3ByaXRlUGF0dGVybnNbMF0sIHVuZGVmaW5lZF07XG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHhhNikgcGF0cyA9IFsweDUzLCAweDUwXTsgLy8gZHJheWdvbiAyXG4gICAgICBjb25zdCBib3NzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgMHgxZjk2YiArIDIgKiBib3NzSWQpICsgMHgxNDAwMDtcbiAgICAgIGNvbnN0IGJvc3NSZXN0b3JlID0gW1xuICAgICAgICAsLCwgdGhpcy5iZ20sLFxuICAgICAgICAuLi50aGlzLnRpbGVQYWxldHRlcywsLCwgdGhpcy5zcHJpdGVQYWxldHRlc1swXSwsXG4gICAgICAgICwsLCwgLypwYXRzWzBdKi8sIC8qcGF0c1sxXSovLFxuICAgICAgICB0aGlzLmFuaW1hdGlvbixcbiAgICAgIF07XG4gICAgICBjb25zdCBbXSA9IFtwYXRzXTsgLy8gYXZvaWQgZXJyb3JcblxuICAgICAgLy8gaWYgKHJlYWRMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgYm9zc0Jhc2UpID09PSAweGJhOTgpIHtcbiAgICAgIC8vICAgLy8gZXNjYXBlIGFuaW1hdGlvbjogZG9uJ3QgY2xvYmJlciBwYXR0ZXJucyB5ZXQ/XG4gICAgICAvLyB9XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJvc3NSZXN0b3JlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGNvbnN0IHJlc3RvcmVkID0gYm9zc1Jlc3RvcmVbal07XG4gICAgICAgIGlmIChyZXN0b3JlZCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgd3JpdGVyLnJvbVtib3NzQmFzZSArIGpdID0gcmVzdG9yZWQ7XG4gICAgICB9XG4gICAgICAvLyBsYXRlciBzcG90IGZvciBwYWwzIGFuZCBwYXQxICphZnRlciogZXhwbG9zaW9uXG4gICAgICBjb25zdCBib3NzQmFzZTIgPSAweDFmN2MxICsgNSAqIGJvc3NJZDtcbiAgICAgIHdyaXRlci5yb21bYm9zc0Jhc2UyXSA9IHRoaXMuc3ByaXRlUGFsZXR0ZXNbMV07XG4gICAgICAvLyBOT1RFOiBUaGlzIHJ1aW5zIHRoZSB0cmVhc3VyZSBjaGVzdC5cbiAgICAgIC8vIFRPRE8gLSBhZGQgc29tZSBhc20gYWZ0ZXIgYSBjaGVzdCBpcyBjbGVhcmVkIHRvIHJlbG9hZCBwYXR0ZXJucz9cbiAgICAgIC8vIEFub3RoZXIgb3B0aW9uIHdvdWxkIGJlIHRvIGFkZCBhIGxvY2F0aW9uLXNwZWNpZmljIGNvbnRyYWludCB0byBiZVxuICAgICAgLy8gd2hhdGV2ZXIgdGhlIGJvc3MgXG4gICAgICAvL3dyaXRlci5yb21bYm9zc0Jhc2UyICsgMV0gPSB0aGlzLnNwcml0ZVBhdHRlcm5zWzFdO1xuICAgIH1cbiAgfVxuXG4gIGFsbFNjcmVlbnMoKTogU2V0PFNjcmVlbj4ge1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBjb25zdCBleHQgPSB0aGlzLnNjcmVlblBhZ2U7XG4gICAgZm9yIChjb25zdCByb3cgb2YgdGhpcy5zY3JlZW5zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiByb3cpIHtcbiAgICAgICAgc2NyZWVucy5hZGQodGhpcy5yb20uc2NyZWVuc1tzY3JlZW4gKyBleHRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNjcmVlbnM7XG4gIH1cblxuICBib3NzSWQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MGU7IGkrKykge1xuICAgICAgaWYgKHRoaXMucm9tLnByZ1sweDFmOTVkICsgaV0gPT09IHRoaXMuaWQpIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gbmVpZ2hib3JzKGpvaW5OZXh1c2VzOiBib29sZWFuID0gZmFsc2UpOiBTZXQ8TG9jYXRpb24+IHtcbiAgLy8gICBjb25zdCBvdXQgPSBuZXcgU2V0PExvY2F0aW9uPigpO1xuICAvLyAgIGNvbnN0IGFkZE5laWdoYm9ycyA9IChsOiBMb2NhdGlvbikgPT4ge1xuICAvLyAgICAgZm9yIChjb25zdCBleGl0IG9mIGwuZXhpdHMpIHtcbiAgLy8gICAgICAgY29uc3QgaWQgPSBleGl0LmRlc3Q7XG4gIC8vICAgICAgIGNvbnN0IG5laWdoYm9yID0gdGhpcy5yb20ubG9jYXRpb25zW2lkXTtcbiAgLy8gICAgICAgaWYgKG5laWdoYm9yICYmIG5laWdoYm9yLnVzZWQgJiZcbiAgLy8gICAgICAgICAgIG5laWdoYm9yICE9PSB0aGlzICYmICFvdXQuaGFzKG5laWdoYm9yKSkge1xuICAvLyAgICAgICAgIG91dC5hZGQobmVpZ2hib3IpO1xuICAvLyAgICAgICAgIGlmIChqb2luTmV4dXNlcyAmJiBORVhVU0VTW25laWdoYm9yLmtleV0pIHtcbiAgLy8gICAgICAgICAgIGFkZE5laWdoYm9ycyhuZWlnaGJvcik7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIGFkZE5laWdoYm9ycyh0aGlzKTtcbiAgLy8gICByZXR1cm4gb3V0O1xuICAvLyB9XG5cbiAgaGFzRG9scGhpbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pZCA9PT0gMHg2MCB8fCB0aGlzLmlkID09PSAweDY0IHx8IHRoaXMuaWQgPT09IDB4Njg7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBNYXAgb2YgdGlsZXMgKCRZWHl4KSByZWFjaGFibGUgZnJvbSBhbnkgZW50cmFuY2UgdG9cbiAgICogdW5mbGFnZ2VkIHRpbGVlZmZlY3RzLlxuICAgKi9cbiAgcmVhY2hhYmxlVGlsZXMoZmx5ID0gZmFsc2UpOiBNYXA8bnVtYmVyLCBudW1iZXI+IHtcbiAgICAvLyBUT0RPIC0gYXJncyBmb3IgKDEpIHVzZSBub24tMmVmIGZsYWdzLCAoMikgb25seSBmcm9tIGdpdmVuIGVudHJhbmNlL3RpbGVcbiAgICAvLyBEb2xwaGluIG1ha2VzIE5PX1dBTEsgb2theSBmb3Igc29tZSBsZXZlbHMuXG4gICAgaWYgKHRoaXMuaGFzRG9scGhpbigpKSBmbHkgPSB0cnVlO1xuICAgIC8vIFRha2UgaW50byBhY2NvdW50IHRoZSB0aWxlc2V0IGFuZCBmbGFncyBidXQgbm90IGFueSBvdmVybGF5LlxuICAgIGNvbnN0IGV4aXRzID0gbmV3IFNldCh0aGlzLmV4aXRzLm1hcChleGl0ID0+IGV4aXQuc2NyZWVuIDw8IDggfCBleGl0LnRpbGUpKTtcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0KHRoaXMudGlsZXNldCk7XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1t0aGlzLnRpbGVFZmZlY3RzIC0gMHhiM107XG4gICAgY29uc3QgcGFzc2FibGUgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IHRoaXMuc2NyZWVuc1t5XTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbcm93W3hdIHwgdGhpcy5zY3JlZW5QYWdlXTtcbiAgICAgICAgY29uc3QgcG9zID0geSA8PCA0IHwgeDtcbiAgICAgICAgY29uc3QgZmxhZyA9IHRoaXMuZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBwb3MpO1xuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDB4ZjA7IHQrKykge1xuICAgICAgICAgIGNvbnN0IHRpbGVJZCA9IHBvcyA8PCA4IHwgdDtcbiAgICAgICAgICBpZiAoZXhpdHMuaGFzKHRpbGVJZCkpIGNvbnRpbnVlOyAvLyBkb24ndCBnbyBwYXN0IGV4aXRzXG4gICAgICAgICAgbGV0IHRpbGUgPSBzY3JlZW4udGlsZXNbdF07XG4gICAgICAgICAgLy8gZmxhZyAyZWYgaXMgXCJhbHdheXMgb25cIiwgZG9uJ3QgZXZlbiBib3RoZXIgbWFraW5nIGl0IGNvbmRpdGlvbmFsLlxuICAgICAgICAgIGxldCBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICBsZXQgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgaWYgKGZsYWcgJiYgYmxvY2tlZCAmJiB0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT0gdGlsZSkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICAgIGVmZmVjdHMgPSB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgICAgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYmxvY2tlZCkgcGFzc2FibGUuYWRkKHRpbGVJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCB0IG9mIHBhc3NhYmxlKSB7XG4gICAgICBjb25zdCByaWdodCA9ICh0ICYgMHgwZikgPT09IDB4MGYgPyB0ICsgMHhmMSA6IHQgKyAxO1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhyaWdodCkpIHVmLnVuaW9uKFt0LCByaWdodF0pO1xuICAgICAgY29uc3QgYmVsb3cgPSAodCAmIDB4ZjApID09PSAweGUwID8gdCArIDB4ZjIwIDogdCArIDE2O1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhiZWxvdykpIHVmLnVuaW9uKFt0LCBiZWxvd10pO1xuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IHVmLm1hcCgpO1xuICAgIGNvbnN0IHNldHMgPSBuZXcgU2V0PFNldDxudW1iZXI+PigpO1xuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgIGlmICghZW50cmFuY2UudXNlZCkgY29udGludWU7XG4gICAgICBjb25zdCBpZCA9IGVudHJhbmNlLnNjcmVlbiA8PCA4IHwgZW50cmFuY2UudGlsZTtcbiAgICAgIC8vIE5PVEU6IG1hcCBzaG91bGQgYWx3YXlzIGhhdmUgaWQsIGJ1dCBib2d1cyBlbnRyYW5jZXNcbiAgICAgIC8vIChlLmcuIEdvYSBWYWxsZXkgZW50cmFuY2UgMikgY2FuIGNhdXNlIHByb2JsZW1zLlxuICAgICAgc2V0cy5hZGQobWFwLmdldChpZCkgfHwgbmV3IFNldCgpKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXQgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHNldHMpIHtcbiAgICAgIGZvciAoY29uc3QgdCBvZiBzZXQpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweDBmXTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tzY3IgfCB0aGlzLnNjcmVlblBhZ2VdO1xuICAgICAgICBvdXQuc2V0KHQsIHRpbGVFZmZlY3RzLmVmZmVjdHNbc2NyZWVuLnRpbGVzW3QgJiAweGZmXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgLyoqIFNhZmVyIHZlcnNpb24gb2YgdGhlIGJlbG93PyAqL1xuICBzY3JlZW5Nb3ZlcigpOiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHZvaWQge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgQXJyYXk8e3NjcmVlbjogbnVtYmVyfT4+KCgpID0+IFtdKTtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgbWFwLmdldChvYmouc2NyZWVuKS5wdXNoKG9iaik7XG4gICAgfVxuICAgIHJldHVybiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHtcbiAgICAgIGZvciAoY29uc3Qgb2JqIG9mIG1hcC5nZXQob3JpZykpIHtcbiAgICAgICAgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbGwgc3Bhd25zLCBlbnRyYW5jZXMsIGFuZCBleGl0cy5cbiAgICogQHBhcmFtIG9yaWcgWVggb2YgdGhlIG9yaWdpbmFsIHNjcmVlbi5cbiAgICogQHBhcmFtIHJlcGwgWVggb2YgdGhlIGVxdWl2YWxlbnQgcmVwbGFjZW1lbnQgc2NyZWVuLlxuICAgKi9cbiAgbW92ZVNjcmVlbihvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IG9ianMgPVxuICAgICAgICBpdGVycy5jb25jYXQ8e3NjcmVlbjogbnVtYmVyfT4odGhpcy5zcGF3bnMsIHRoaXMuZXhpdHMsIHRoaXMuZW50cmFuY2VzKTtcbiAgICBmb3IgKGNvbnN0IG9iaiBvZiBvYmpzKSB7XG4gICAgICBpZiAob2JqLnNjcmVlbiA9PT0gb3JpZykgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgfVxuICB9XG5cbiAgLy8gVE9ETyAtIGZhY3RvciB0aGlzIG91dCBpbnRvIGEgc2VwYXJhdGUgY2xhc3M/XG4gIC8vICAgLSBob2xkcyBtZXRhZGF0YSBhYm91dCBtYXAgdGlsZXMgaW4gZ2VuZXJhbD9cbiAgLy8gICAtIG5lZWQgdG8gZmlndXJlIG91dCB3aGF0IHRvIGRvIHdpdGggcGl0cy4uLlxuICBtb25zdGVyUGxhY2VyKHJhbmRvbTogUmFuZG9tKTogKG06IE1vbnN0ZXIpID0+IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgLy8gSWYgdGhlcmUncyBhIGJvc3Mgc2NyZWVuLCBleGNsdWRlIGl0IGZyb20gZ2V0dGluZyBlbmVtaWVzLlxuICAgIGNvbnN0IGJvc3MgPSB0aGlzLmRhdGEuYm9zc1NjcmVlbjtcbiAgICAvLyBTdGFydCB3aXRoIGxpc3Qgb2YgcmVhY2hhYmxlIHRpbGVzLlxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IHRoaXMucmVhY2hhYmxlVGlsZXMoZmFsc2UpO1xuICAgIC8vIERvIGEgYnJlYWR0aC1maXJzdCBzZWFyY2ggb2YgYWxsIHRpbGVzIHRvIGZpbmQgXCJkaXN0YW5jZVwiICgxLW5vcm0pLlxuICAgIGNvbnN0IGV4dGVuZGVkID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oWy4uLnJlYWNoYWJsZS5rZXlzKCldLm1hcCh4ID0+IFt4LCAwXSkpO1xuICAgIGNvbnN0IG5vcm1hbDogbnVtYmVyW10gPSBbXTsgLy8gcmVhY2hhYmxlLCBub3Qgc2xvcGUgb3Igd2F0ZXJcbiAgICBjb25zdCBtb3RoczogbnVtYmVyW10gPSBbXTsgIC8vIGRpc3RhbmNlIOKIiCAzLi43XG4gICAgY29uc3QgYmlyZHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSA+IDEyXG4gICAgY29uc3QgcGxhbnRzOiBudW1iZXJbXSA9IFtdOyAvLyBkaXN0YW5jZSDiiIggMi4uNFxuICAgIGNvbnN0IHBsYWNlZDogQXJyYXk8W01vbnN0ZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IG5vcm1hbFRlcnJhaW5NYXNrID0gdGhpcy5oYXNEb2xwaGluKCkgPyAweDI1IDogMHgyNztcbiAgICBmb3IgKGNvbnN0IFt0LCBkaXN0YW5jZV0gb2YgZXh0ZW5kZWQpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHhmXTtcbiAgICAgIGlmIChzY3IgPT09IGJvc3MpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBuIG9mIG5laWdoYm9ycyh0LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCkpIHtcbiAgICAgICAgaWYgKGV4dGVuZGVkLmhhcyhuKSkgY29udGludWU7XG4gICAgICAgIGV4dGVuZGVkLnNldChuLCBkaXN0YW5jZSArIDEpO1xuICAgICAgfVxuICAgICAgaWYgKCFkaXN0YW5jZSAmJiAhKHJlYWNoYWJsZS5nZXQodCkhICYgbm9ybWFsVGVycmFpbk1hc2spKSBub3JtYWwucHVzaCh0KTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweDFhKSB7XG4gICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgc3dhbXAgZm9yIHBsYW50IHBsYWNlbWVudFxuICAgICAgICBpZiAodGhpcy5yb20uc2NyZWVuc1tzY3JdLnRpbGVzW3QgJiAweGZmXSA9PT0gMHhmMCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZGlzdGFuY2UgPj0gMiAmJiBkaXN0YW5jZSA8PSA0KSBwbGFudHMucHVzaCh0KTtcbiAgICAgIH1cbiAgICAgIGlmIChkaXN0YW5jZSA+PSAzICYmIGRpc3RhbmNlIDw9IDcpIG1vdGhzLnB1c2godCk7XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMTIpIGJpcmRzLnB1c2godCk7XG4gICAgICAvLyBUT0RPIC0gc3BlY2lhbC1jYXNlIHN3YW1wIGZvciBwbGFudCBsb2NhdGlvbnM/XG4gICAgfVxuICAgIC8vIFdlIG5vdyBrbm93IGFsbCB0aGUgcG9zc2libGUgcGxhY2VzIHRvIHBsYWNlIHRoaW5ncy5cbiAgICAvLyAgLSBOT1RFOiBzdGlsbCBuZWVkIHRvIG1vdmUgY2hlc3RzIHRvIGRlYWQgZW5kcywgZXRjP1xuICAgIHJldHVybiAobTogTW9uc3RlcikgPT4ge1xuICAgICAgLy8gY2hlY2sgZm9yIHBsYWNlbWVudC5cbiAgICAgIGNvbnN0IHBsYWNlbWVudCA9IG0ucGxhY2VtZW50KCk7XG4gICAgICBjb25zdCBwb29sID0gWy4uLihwbGFjZW1lbnQgPT09ICdub3JtYWwnID8gbm9ybWFsIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ21vdGgnID8gbW90aHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnYmlyZCcgPyBiaXJkcyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdwbGFudCcgPyBwbGFudHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0TmV2ZXIocGxhY2VtZW50KSldXG4gICAgICBQT09MOlxuICAgICAgd2hpbGUgKHBvb2wubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGkgPSByYW5kb20ubmV4dEludChwb29sLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IFtwb3NdID0gcG9vbC5zcGxpY2UoaSwgMSk7XG5cbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYwMCkgPj4+IDQgfCAocG9zICYgMHhmKTtcbiAgICAgICAgY29uc3QgeSA9IChwb3MgJiAweGYwMDApID4+PiA4IHwgKHBvcyAmIDB4ZjApID4+PiA0O1xuICAgICAgICBjb25zdCByID0gbS5jbGVhcmFuY2UoKTtcblxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gb3RoZXIgZW5lbWllcy5cbiAgICAgICAgZm9yIChjb25zdCBbLCB4MSwgeTEsIHIxXSBvZiBwbGFjZWQpIHtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtIHkxKSAqKiAyICsgKHggLSB4MSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyByMSkgKiogMikgY29udGludWUgUE9PTDtcbiAgICAgICAgfVxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gZW50cmFuY2VzLlxuICAgICAgICBmb3IgKGNvbnN0IHt4OiB4MSwgeTogeTEsIHVzZWR9IG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICAgICAgaWYgKCF1c2VkKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtICh5MSA+PiA0KSkgKiogMiArICh4IC0gKHgxID4+IDQpKSAqKiAyKTtcbiAgICAgICAgICBpZiAoejIgPCAociArIDEpICoqIDIpIGNvbnRpbnVlIFBPT0w7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZCBzcG90IChzdGlsbCwgaG93IHRvYSBhcHByb3hpbWF0ZWx5ICptYXhpbWl6ZSogZGlzdGFuY2VzPylcbiAgICAgICAgcGxhY2VkLnB1c2goW20sIHgsIHksIHJdKTtcbiAgICAgICAgY29uc3Qgc2NyID0gKHkgJiAweGYwKSB8ICh4ICYgMHhmMCkgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHRpbGUgPSAoeSAmIDB4MGYpIDw8IDQgfCAoeCAmIDB4MGYpO1xuICAgICAgICByZXR1cm4gc2NyIDw8IDggfCB0aWxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbiAgLy8gVE9ETyAtIGFsbG93IGxlc3MgcmFuZG9tbmVzcyBmb3IgY2VydGFpbiBjYXNlcywgZS5nLiB0b3Agb2Ygbm9ydGggc2FicmUgb3JcbiAgLy8gYXBwcm9wcmlhdGUgc2lkZSBvZiBjb3JkZWwuXG5cbiAgLyoqIEByZXR1cm4geyFTZXQ8bnVtYmVyPn0gKi9cbiAgLy8gYWxsVGlsZXMoKSB7XG4gIC8vICAgY29uc3QgdGlsZXMgPSBuZXcgU2V0KCk7XG4gIC8vICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5zY3JlZW5zKSB7XG4gIC8vICAgICBmb3IgKGNvbnN0IHRpbGUgb2Ygc2NyZWVuLmFsbFRpbGVzKCkpIHtcbiAgLy8gICAgICAgdGlsZXMuYWRkKHRpbGUpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gdGlsZXM7XG4gIC8vIH1cblxuXG4gIC8vIFRPRE8gLSB1c2UgbWV0YXNjcmVlbiBmb3IgdGhpcyBsYXRlclxuICByZXNpemVTY3JlZW5zKHRvcDogbnVtYmVyLCBsZWZ0OiBudW1iZXIsIGJvdHRvbTogbnVtYmVyLCByaWdodDogbnVtYmVyKSB7XG4gICAgY29uc3QgbmV3V2lkdGggPSB0aGlzLndpZHRoICsgbGVmdCArIHJpZ2h0O1xuICAgIGNvbnN0IG5ld0hlaWdodCA9IHRoaXMuaGVpZ2h0ICsgdG9wICsgYm90dG9tO1xuICAgIGNvbnN0IG5ld1NjcmVlbnMgPSBBcnJheS5mcm9tKHtsZW5ndGg6IG5ld0hlaWdodH0sIChfLCB5KSA9PiB7XG4gICAgICB5IC09IHRvcDtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKHtsZW5ndGg6IG5ld1dpZHRofSwgKF8sIHgpID0+IHtcbiAgICAgICAgeCAtPSBsZWZ0O1xuICAgICAgICBpZiAoeSA8IDAgfHwgeCA8IDAgfHwgeSA+PSB0aGlzLmhlaWdodCB8fCB4ID49IHRoaXMud2lkdGgpIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gdGhpcy5zY3JlZW5zW3ldW3hdO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy53aWR0aCA9IG5ld1dpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gbmV3SGVpZ2h0O1xuICAgIHRoaXMuc2NyZWVucyA9IG5ld1NjcmVlbnM7XG4gICAgLy8gVE9ETyAtIGlmIGFueSBvZiB0aGVzZSBnbyBuZWdhdGl2ZSwgd2UncmUgaW4gdHJvdWJsZS4uLlxuICAgIC8vIFByb2JhYmx5IHRoZSBiZXN0IGJldCB3b3VsZCBiZSB0byBwdXQgYSBjaGVjayBpbiB0aGUgc2V0dGVyP1xuICAgIGZvciAoY29uc3QgZiBvZiB0aGlzLmZsYWdzKSB7XG4gICAgICBmLnhzICs9IGxlZnQ7XG4gICAgICBmLnlzICs9IHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwIG9mIHRoaXMucGl0cykge1xuICAgICAgcC5mcm9tWHMgKz0gbGVmdDtcbiAgICAgIHAuZnJvbVlzICs9IHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzIG9mIFsuLi50aGlzLnNwYXducywgLi4udGhpcy5leGl0c10pIHtcbiAgICAgIHMueHQgKz0gMTYgKiBsZWZ0O1xuICAgICAgcy55dCArPSAxNiAqIHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICBpZiAoIWUudXNlZCkgY29udGludWU7XG4gICAgICBlLnggKz0gMjU2ICogbGVmdDtcbiAgICAgIGUueSArPSAyNTYgKiB0b3A7XG4gICAgfVxuICB9XG5cbiAgd3JpdGVTY3JlZW5zMmQoc3RhcnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgZGF0YTogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PG51bWJlciB8IG51bGw+Pikge1xuICAgIGNvbnN0IHgwID0gc3RhcnQgJiAweGY7XG4gICAgY29uc3QgeTAgPSBzdGFydCA+Pj4gNDtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGRhdGEubGVuZ3RoOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGRhdGFbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHJvdy5sZW5ndGg7IHgrKykge1xuICAgICAgICBjb25zdCB0aWxlID0gcm93W3hdO1xuICAgICAgICBpZiAodGlsZSAhPSBudWxsKSB0aGlzLnNjcmVlbnNbeTAgKyB5XVt4MCArIHhdID0gdGlsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb25uZWN0IHR3byBzY3JlZW5zIHZpYSBlbnRyYW5jZXMuXG4gIC8vIEFzc3VtZXMgZXhpdHMgYW5kIGVudHJhbmNlcyBhcmUgY29tcGxldGVseSBhYnNlbnQuXG4gIC8vIFNjcmVlbiBJRHMgbXVzdCBiZSBpbiBzY3JlZW5FeGl0cy5cbiAgY29ubmVjdChwb3M6IG51bWJlciwgdGhhdDogTG9jYXRpb24sIHRoYXRQb3M6IG51bWJlcikge1xuICAgIGNvbnN0IHRoaXNZID0gcG9zID4+PiA0O1xuICAgIGNvbnN0IHRoaXNYID0gcG9zICYgMHhmO1xuICAgIGNvbnN0IHRoYXRZID0gdGhhdFBvcyA+Pj4gNDtcbiAgICBjb25zdCB0aGF0WCA9IHRoYXRQb3MgJiAweGY7XG4gICAgY29uc3QgdGhpc1RpbGUgPSB0aGlzLnNjcmVlbnNbdGhpc1ldW3RoaXNYXTtcbiAgICBjb25zdCB0aGF0VGlsZSA9IHRoYXQuc2NyZWVuc1t0aGF0WV1bdGhhdFhdO1xuICAgIGNvbnN0IFt0aGlzRW50cmFuY2UsIHRoaXNFeGl0c10gPSBzY3JlZW5FeGl0c1t0aGlzVGlsZV07XG4gICAgY29uc3QgW3RoYXRFbnRyYW5jZSwgdGhhdEV4aXRzXSA9IHNjcmVlbkV4aXRzW3RoYXRUaWxlXTtcbiAgICBjb25zdCB0aGlzRW50cmFuY2VJbmRleCA9IHRoaXMuZW50cmFuY2VzLmxlbmd0aDtcbiAgICBjb25zdCB0aGF0RW50cmFuY2VJbmRleCA9IHRoYXQuZW50cmFuY2VzLmxlbmd0aDtcbiAgICB0aGlzLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt5OiB0aGlzWSA8PCA4IHwgdGhpc0VudHJhbmNlID4+PiA4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHRoaXNYIDw8IDggfCB0aGlzRW50cmFuY2UgJiAweGZmfSkpO1xuICAgIHRoYXQuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3k6IHRoYXRZIDw8IDggfCB0aGF0RW50cmFuY2UgPj4+IDgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogdGhhdFggPDwgOCB8IHRoYXRFbnRyYW5jZSAmIDB4ZmZ9KSk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXNFeGl0cykge1xuICAgICAgdGhpcy5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbjogcG9zLCB0aWxlOiBleGl0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3Q6IHRoYXQuaWQsIGVudHJhbmNlOiB0aGF0RW50cmFuY2VJbmRleH0pKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoYXRFeGl0cykge1xuICAgICAgdGhhdC5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbjogdGhhdFBvcywgdGlsZTogZXhpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0OiB0aGlzLmlkLCBlbnRyYW5jZTogdGhpc0VudHJhbmNlSW5kZXh9KSk7XG4gICAgfVxuICB9XG5cbiAgbmVpZ2hib3JGb3JFbnRyYW5jZShlbnRyYW5jZUlkOiBudW1iZXIpOiBMb2NhdGlvbiB7XG4gICAgY29uc3QgZW50cmFuY2UgPSB0aGlzLmVudHJhbmNlc1tlbnRyYW5jZUlkXTtcbiAgICBpZiAoIWVudHJhbmNlKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGVudHJhbmNlICR7aGV4KHRoaXMuaWQpfToke2VudHJhbmNlSWR9YCk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIGlmIChleGl0LnNjcmVlbiAhPT0gZW50cmFuY2Uuc2NyZWVuKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGR4ID0gTWF0aC5hYnMoZXhpdC54IC0gZW50cmFuY2UueCk7XG4gICAgICBjb25zdCBkeSA9IE1hdGguYWJzKGV4aXQueSAtIGVudHJhbmNlLnkpO1xuICAgICAgaWYgKGR4IDwgMjQgJiYgZHkgPCAyNCkgcmV0dXJuIHRoaXMucm9tLmxvY2F0aW9uc1tleGl0LmRlc3RdO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGV4aXQgZm91bmQgbmVhciAke2hleCh0aGlzLmlkKX06JHtlbnRyYW5jZUlkfWApO1xuICB9XG59XG5cbi8vIFRPRE8gLSBtb3ZlIHRvIGEgYmV0dGVyLW9yZ2FuaXplZCBkZWRpY2F0ZWQgXCJnZW9tZXRyeVwiIG1vZHVsZT9cbmZ1bmN0aW9uIG5laWdoYm9ycyh0aWxlOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgY29uc3QgeSA9IHRpbGUgJiAweGYwZjA7XG4gIGNvbnN0IHggPSB0aWxlICYgMHgwZjBmO1xuICBpZiAoeSA8ICgoaGVpZ2h0IC0gMSkgPDwgMTIgfCAweGUwKSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4ZTAgPyB0aWxlICsgMHgwZjIwIDogdGlsZSArIDE2KTtcbiAgfVxuICBpZiAoeSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4MDAgPyB0aWxlIC0gMHgwZjIwIDogdGlsZSAtIDE2KTtcbiAgfVxuICBpZiAoeCA8ICgod2lkdGggLSAxKSA8PCA4IHwgMHgwZikpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDBmID8gdGlsZSArIDB4MDBmMSA6IHRpbGUgKyAxKTtcbiAgfVxuICBpZiAoeCkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHgwZikgPT09IDB4MDAgPyB0aWxlIC0gMHgwMGYxIDogdGlsZSAtIDEpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBjb25zdCBFbnRyYW5jZSA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgeDogRGF0YVR1cGxlLnByb3AoWzBdLCBbMSwgMHhmZiwgLThdKSxcbiAgeTogRGF0YVR1cGxlLnByb3AoWzJdLCBbMywgMHhmZiwgLThdKSxcblxuICBzY3JlZW46IERhdGFUdXBsZS5wcm9wKFszLCAweDBmLCAtNF0sIFsxLCAweDBmXSksXG4gIHRpbGU6ICAgRGF0YVR1cGxlLnByb3AoWzIsIDB4ZjBdLCBbMCwgMHhmMCwgNF0pLFxuICBjb29yZDogIERhdGFUdXBsZS5wcm9wKFsyLCAweGZmLCAtOF0sIFswLCAweGZmXSksXG5cbiAgdXNlZDoge1xuICAgIGdldCh0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGF0YVsxXSAhPSAweGZmOyB9LFxuICB9LFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBFbnRyYW5jZSAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy54KX0sICR7aGV4KHRoaXMueSl9KWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIEVudHJhbmNlID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBFbnRyYW5jZT47XG5cbmV4cG9ydCBjb25zdCBFeGl0ID0gRGF0YVR1cGxlLm1ha2UoNCwge1xuICB4OiAgICAgICAgRGF0YVR1cGxlLnByb3AoWzAsIDB4ZmYsIC00XSksXG4gIHh0OiAgICAgICBEYXRhVHVwbGUucHJvcChbMF0pLFxuXG4gIHk6ICAgICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHhmZiwgLTRdKSxcbiAgeXQ6ICAgICAgIERhdGFUdXBsZS5wcm9wKFsxXSksXG5cbiAgc2NyZWVuOiAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGYwXSwgWzAsIDB4ZjAsIDRdKSxcbiAgdGlsZTogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDBmLCAtNF0sIFswLCAweDBmXSksXG5cbiAgZGVzdDogICAgIERhdGFUdXBsZS5wcm9wKFsyXSksXG5cbiAgZW50cmFuY2U6IERhdGFUdXBsZS5wcm9wKFszXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEV4aXQgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSkgPT4gJHtcbiAgICAgICAgICAgIHRoaXMuZGVzdH06JHt0aGlzLmVudHJhbmNlfWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIEV4aXQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIEV4aXQ+O1xuXG5leHBvcnQgY29uc3QgRmxhZyA9IERhdGFUdXBsZS5tYWtlKDIsIHtcbiAgZmxhZzogIHtcbiAgICBnZXQodGhpczogYW55KTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YVswXSB8IDB4MjAwOyB9LFxuICAgIHNldCh0aGlzOiBhbnksIGY6IG51bWJlcikge1xuICAgICAgaWYgKChmICYgfjB4ZmYpICE9PSAweDIwMCkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmxhZzogJHtoZXgoZil9YCk7XG4gICAgICB0aGlzLmRhdGFbMF0gPSBmICYgMHhmZjtcbiAgICB9LFxuICB9LFxuXG4gIHg6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHgwNywgLThdKSxcbiAgeHM6ICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDA3XSksXG5cbiAgeTogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGYwLCAtNF0pLFxuICB5czogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4ZjAsIDRdKSxcblxuICAvLyBUT0RPIC0gcmVtb3ZlIHRoZSAneXgnIHZlcnNpb25cbiAgeXg6ICAgIERhdGFUdXBsZS5wcm9wKFsxXSksIC8vIHkgaW4gaGkgbmliYmxlLCB4IGluIGxvLlxuICBzY3JlZW46IERhdGFUdXBsZS5wcm9wKFsxXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEZsYWcgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueHMpfSwgJHtoZXgodGhpcy55cyl9KSBAICR7XG4gICAgICAgICAgICBoZXgodGhpcy5mbGFnKX1gO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBGbGFnID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBGbGFnPjtcblxuZXhwb3J0IGNvbnN0IFBpdCA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgZnJvbVhzOiAgRGF0YVR1cGxlLnByb3AoWzEsIDB4NzAsIDRdKSxcbiAgdG9YczogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4MDddKSxcblxuICBmcm9tWXM6ICBEYXRhVHVwbGUucHJvcChbMywgMHhmMCwgNF0pLFxuICB0b1lzOiAgICBEYXRhVHVwbGUucHJvcChbMywgMHgwZl0pLFxuXG4gIGRlc3Q6ICAgIERhdGFUdXBsZS5wcm9wKFswXSksXG5cbiAgdG9TdHJpbmcodGhpczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFBpdCAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy5mcm9tWHMpfSwgJHtoZXgodGhpcy5mcm9tWXMpfSkgPT4gJHtcbiAgICAgICAgICAgIGhleCh0aGlzLmRlc3QpfTooJHtoZXgodGhpcy50b1hzKX0sICR7aGV4KHRoaXMudG9Zcyl9KWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIFBpdCA9IEluc3RhbmNlVHlwZTx0eXBlb2YgUGl0PjtcblxuZXhwb3J0IGNvbnN0IFNwYXduID0gRGF0YVR1cGxlLm1ha2UoNCwge1xuICB5OiAgICAgRGF0YVR1cGxlLnByb3AoWzAsIDB4ZmYsIC00XSksXG4gIHl0OiAgICBEYXRhVHVwbGUucHJvcChbMF0pLFxuXG4gIHRpbWVkOiBEYXRhVHVwbGUuYm9vbGVhblByb3AoWzEsIDB4ODAsIDddKSxcbiAgeDogICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDdmLCAtNF0sIFsyLCAweDQwLCAzXSksXG4gIHh0OiAgICBEYXRhVHVwbGUucHJvcChbMSwgMHg3Zl0pLFxuXG4gIHNjcmVlbjogRGF0YVR1cGxlLnByb3AoWzAsIDB4ZjBdLCBbMSwgMHg3MCwgNF0pLFxuICB0aWxlOiAgIERhdGFUdXBsZS5wcm9wKFswLCAweDBmLCAtNF0sIFsxLCAweDBmXSksXG5cbiAgcGF0dGVybkJhbms6IERhdGFUdXBsZS5wcm9wKFsyLCAweDgwLCA3XSksXG4gIHR5cGU6ICBEYXRhVHVwbGUucHJvcChbMiwgMHgwN10pLFxuXG4vLyBwYXR0ZXJuQmFuazoge2dldCh0aGlzOiBhbnkpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5kYXRhWzJdID4+PiA3OyB9LFxuLy8gICAgICAgICAgICAgICBzZXQodGhpczogYW55LCB2OiBudW1iZXIpIHsgaWYgKHRoaXMuZGF0YVszXSA9PT0gMTIwKSBkZWJ1Z2dlcjtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB0aGlzLmRhdGFbMl0gfD0gMHg4MDsgZWxzZSB0aGlzLmRhdGFbMl0gJj0gMHg3ZjsgfX0sXG4gIGlkOiAgICBEYXRhVHVwbGUucHJvcChbM10pLFxuXG4gIHVzZWQ6IHtnZXQodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRhdGFbMF0gIT09IDB4ZmU7IH0sXG4gICAgICAgICBzZXQodGhpczogYW55LCB1c2VkOiBib29sZWFuKSB7IHRoaXMuZGF0YVswXSA9IHVzZWQgPyAwIDogMHhmZTsgfX0sXG4gIG1vbnN0ZXJJZDoge2dldCh0aGlzOiBhbnkpOiBudW1iZXIgeyByZXR1cm4gKHRoaXMuaWQgKyAweDUwKSAmIDB4ZmY7IH0sXG4gICAgICAgICAgICAgIHNldCh0aGlzOiBhbnksIGlkOiBudW1iZXIpIHsgdGhpcy5pZCA9IChpZCAtIDB4NTApICYgMHhmZjsgfX0sXG4gIC8qKiBOb3RlOiB0aGlzIGluY2x1ZGVzIG1pbWljcy4gKi9cbiAgaXNDaGVzdCh0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMiAmJiB0aGlzLmlkIDwgMHg4MDsgfSxcbiAgaXNJbnZpc2libGUodGhpczogYW55KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNDaGVzdCgpICYmIEJvb2xlYW4odGhpcy5kYXRhWzJdICYgMHgyMCk7XG4gIH0sXG4gIGlzVHJpZ2dlcih0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMiAmJiB0aGlzLmlkID49IDB4ODA7IH0sXG4gIGlzTnBjKHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAxICYmIHRoaXMuaWQgPCAweGMwOyB9LFxuICBpc0Jvc3ModGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDEgJiYgdGhpcy5pZCA+PSAweGMwOyB9LFxuICBpc01vbnN0ZXIodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDA7IH0sXG4gIGlzV2FsbCh0aGlzOiBhbnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gQm9vbGVhbih0aGlzLnR5cGUgPT09IDMgJiYgKHRoaXMuaWQgPCA0IHx8ICh0aGlzLmRhdGFbMl0gJiAweDIwKSkpO1xuICB9LFxuICBpc1Nob290aW5nV2FsbCh0aGlzOiBhbnksIGxvY2F0aW9uOiBMb2NhdGlvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzV2FsbCgpICYmXG4gICAgICAgICEhKHRoaXMuZGF0YVsyXSAmIDB4MjAgPyB0aGlzLmRhdGFbMl0gJiAweDEwIDpcbiAgICAgICAgICAgbG9jYXRpb24uaWQgPT09IDB4OGYgfHwgbG9jYXRpb24uaWQgPT09IDB4YTgpO1xuICB9LFxuICB3YWxsVHlwZSh0aGlzOiBhbnkpOiAnJyB8ICd3YWxsJyB8ICdicmlkZ2UnIHtcbiAgICBpZiAodGhpcy50eXBlICE9PSAzKSByZXR1cm4gJyc7XG4gICAgY29uc3Qgb2JqID0gdGhpcy5kYXRhWzJdICYgMHgyMCA/IHRoaXMuaWQgPj4+IDQgOiB0aGlzLmlkO1xuICAgIGlmIChvYmogPj0gNCkgcmV0dXJuICcnO1xuICAgIHJldHVybiBvYmogPT09IDIgPyAnYnJpZGdlJyA6ICd3YWxsJztcbiAgfSxcbiAgd2FsbEVsZW1lbnQodGhpczogYW55KTogbnVtYmVyIHtcbiAgICBpZiAoIXRoaXMuaXNXYWxsKCkpIHJldHVybiAtMTtcbiAgICByZXR1cm4gdGhpcy5pZCAmIDM7XG4gIH0sXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBTcGF3biAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy54KX0sICR7aGV4KHRoaXMueSl9KSAke1xuICAgICAgICAgICAgdGhpcy50aW1lZCA/ICd0aW1lZCcgOiAnZml4ZWQnfSAke3RoaXMudHlwZX06JHtoZXgodGhpcy5pZCl9YDtcbiAgfSxcbn0pO1xuZXhwb3J0IHR5cGUgU3Bhd24gPSBJbnN0YW5jZVR5cGU8dHlwZW9mIFNwYXduPjtcblxuZXhwb3J0IGNvbnN0IExPQ0FUSU9OUyA9IHtcbiAgbWV6YW1lU2hyaW5lOiBbMHgwMCwgJ01lemFtZSBTaHJpbmUnXSxcbiAgbGVhZk91dHNpZGVTdGFydDogWzB4MDEsICdMZWFmIC0gT3V0c2lkZSBTdGFydCddLFxuICBsZWFmOiBbMHgwMiwgJ0xlYWYnXSxcbiAgdmFsbGV5T2ZXaW5kOiBbMHgwMywgJ1ZhbGxleSBvZiBXaW5kJ10sXG4gIHNlYWxlZENhdmUxOiBbMHgwNCwgJ1NlYWxlZCBDYXZlIDEnXSxcbiAgc2VhbGVkQ2F2ZTI6IFsweDA1LCAnU2VhbGVkIENhdmUgMiddLFxuICBzZWFsZWRDYXZlNjogWzB4MDYsICdTZWFsZWQgQ2F2ZSA2J10sXG4gIHNlYWxlZENhdmU0OiBbMHgwNywgJ1NlYWxlZCBDYXZlIDQnXSxcbiAgc2VhbGVkQ2F2ZTU6IFsweDA4LCAnU2VhbGVkIENhdmUgNSddLFxuICBzZWFsZWRDYXZlMzogWzB4MDksICdTZWFsZWQgQ2F2ZSAzJ10sXG4gIHNlYWxlZENhdmU3OiBbMHgwYSwgJ1NlYWxlZCBDYXZlIDcnXSxcbiAgLy8gSU5WQUxJRDogMHgwYlxuICBzZWFsZWRDYXZlODogWzB4MGMsICdTZWFsZWQgQ2F2ZSA4J10sXG4gIC8vIElOVkFMSUQ6IDB4MGRcbiAgd2luZG1pbGxDYXZlOiBbMHgwZSwgJ1dpbmRtaWxsIENhdmUnXSxcbiAgd2luZG1pbGw6IFsweDBmLCAnV2luZG1pbGwnXSxcbiAgemVidUNhdmU6IFsweDEwLCAnWmVidSBDYXZlJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTE6IFsweDExLCAnTXQgU2FicmUgV2VzdCAtIENhdmUgMSddLFxuICAvLyBJTlZBTElEOiAweDEyXG4gIC8vIElOVkFMSUQ6IDB4MTNcbiAgY29yZGVsUGxhaW5zV2VzdDogWzB4MTQsICdDb3JkZWwgUGxhaW5zIFdlc3QnXSxcbiAgY29yZGVsUGxhaW5zRWFzdDogWzB4MTUsICdDb3JkZWwgUGxhaW5zIEVhc3QnXSxcbiAgLy8gSU5WQUxJRDogMHgxNiAtLSB1bnVzZWQgY29weSBvZiAxOFxuICAvLyBJTlZBTElEOiAweDE3XG4gIGJyeW5tYWVyOiBbMHgxOCwgJ0JyeW5tYWVyJ10sXG4gIG91dHNpZGVTdG9tSG91c2U6IFsweDE5LCAnT3V0c2lkZSBTdG9tIEhvdXNlJ10sXG4gIHN3YW1wOiBbMHgxYSwgJ1N3YW1wJ10sXG4gIGFtYXpvbmVzOiBbMHgxYiwgJ0FtYXpvbmVzJ10sXG4gIG9hazogWzB4MWMsICdPYWsnXSxcbiAgLy8gSU5WQUxJRDogMHgxZFxuICBzdG9tSG91c2U6IFsweDFlLCAnU3RvbSBIb3VzZSddLFxuICAvLyBJTlZBTElEOiAweDFmXG4gIG10U2FicmVXZXN0TG93ZXI6IFsweDIwLCAnTXQgU2FicmUgV2VzdCAtIExvd2VyJ10sXG4gIG10U2FicmVXZXN0VXBwZXI6IFsweDIxLCAnTXQgU2FicmUgV2VzdCAtIFVwcGVyJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTI6IFsweDIyLCAnTXQgU2FicmUgV2VzdCAtIENhdmUgMiddLFxuICBtdFNhYnJlV2VzdENhdmUzOiBbMHgyMywgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDMnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNDogWzB4MjQsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA0J10sXG4gIG10U2FicmVXZXN0Q2F2ZTU6IFsweDI1LCAnTXQgU2FicmUgV2VzdCAtIENhdmUgNSddLFxuICBtdFNhYnJlV2VzdENhdmU2OiBbMHgyNiwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDYnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNzogWzB4MjcsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA3J10sXG4gIG10U2FicmVOb3J0aE1haW46IFsweDI4LCAnTXQgU2FicmUgTm9ydGggLSBNYWluJ10sXG4gIG10U2FicmVOb3J0aE1pZGRsZTogWzB4MjksICdNdCBTYWJyZSBOb3J0aCAtIE1pZGRsZSddLFxuICBtdFNhYnJlTm9ydGhDYXZlMjogWzB4MmEsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgMiddLFxuICBtdFNhYnJlTm9ydGhDYXZlMzogWzB4MmIsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgMyddLFxuICBtdFNhYnJlTm9ydGhDYXZlNDogWzB4MmMsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNCddLFxuICBtdFNhYnJlTm9ydGhDYXZlNTogWzB4MmQsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNSddLFxuICBtdFNhYnJlTm9ydGhDYXZlNjogWzB4MmUsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNiddLFxuICBtdFNhYnJlTm9ydGhQcmlzb25IYWxsOiBbMHgyZiwgJ010IFNhYnJlIE5vcnRoIC0gUHJpc29uIEhhbGwnXSxcbiAgbXRTYWJyZU5vcnRoTGVmdENlbGw6IFsweDMwLCAnTXQgU2FicmUgTm9ydGggLSBMZWZ0IENlbGwnXSxcbiAgbXRTYWJyZU5vcnRoTGVmdENlbGwyOiBbMHgzMSwgJ010IFNhYnJlIE5vcnRoIC0gTGVmdCBDZWxsIDInXSxcbiAgbXRTYWJyZU5vcnRoUmlnaHRDZWxsOiBbMHgzMiwgJ010IFNhYnJlIE5vcnRoIC0gUmlnaHQgQ2VsbCddLFxuICBtdFNhYnJlTm9ydGhDYXZlODogWzB4MzMsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgOCddLFxuICBtdFNhYnJlTm9ydGhDYXZlOTogWzB4MzQsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgOSddLFxuICBtdFNhYnJlTm9ydGhTdW1taXRDYXZlOiBbMHgzNSwgJ010IFNhYnJlIE5vcnRoIC0gU3VtbWl0IENhdmUnXSxcbiAgLy8gSU5WQUxJRDogMHgzNlxuICAvLyBJTlZBTElEOiAweDM3XG4gIG10U2FicmVOb3J0aENhdmUxOiBbMHgzOCwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSAxJ10sXG4gIG10U2FicmVOb3J0aENhdmU3OiBbMHgzOSwgJ010IFNhYnJlIE5vcnRoIC0gQ2F2ZSA3J10sXG4gIC8vIElOVkFMSUQ6IDB4M2FcbiAgLy8gSU5WQUxJRDogMHgzYlxuICBuYWRhcmVJbm46IFsweDNjLCAnTmFkYXJlIC0gSW5uJ10sXG4gIG5hZGFyZVRvb2xTaG9wOiBbMHgzZCwgJ05hZGFyZSAtIFRvb2wgU2hvcCddLFxuICBuYWRhcmVCYWNrUm9vbTogWzB4M2UsICdOYWRhcmUgLSBCYWNrIFJvb20nXSxcbiAgLy8gSU5WQUxJRDogMHgzZlxuICB3YXRlcmZhbGxWYWxsZXlOb3J0aDogWzB4NDAsICdXYXRlcmZhbGwgVmFsbGV5IE5vcnRoJ10sXG4gIHdhdGVyZmFsbFZhbGxleVNvdXRoOiBbMHg0MSwgJ1dhdGVyZmFsbCBWYWxsZXkgU291dGgnXSxcbiAgbGltZVRyZWVWYWxsZXk6IFsweDQyLCAnTGltZSBUcmVlIFZhbGxleSddLFxuICBsaW1lVHJlZUxha2U6IFsweDQzLCAnTGltZSBUcmVlIExha2UnXSxcbiAga2lyaXNhUGxhbnRDYXZlMTogWzB4NDQsICdLaXJpc2EgUGxhbnQgQ2F2ZSAxJ10sXG4gIGtpcmlzYVBsYW50Q2F2ZTI6IFsweDQ1LCAnS2lyaXNhIFBsYW50IENhdmUgMiddLFxuICBraXJpc2FQbGFudENhdmUzOiBbMHg0NiwgJ0tpcmlzYSBQbGFudCBDYXZlIDMnXSxcbiAga2lyaXNhTWVhZG93OiBbMHg0NywgJ0tpcmlzYSBNZWFkb3cnXSxcbiAgZm9nTGFtcENhdmUxOiBbMHg0OCwgJ0ZvZyBMYW1wIENhdmUgMSddLFxuICBmb2dMYW1wQ2F2ZTI6IFsweDQ5LCAnRm9nIExhbXAgQ2F2ZSAyJ10sXG4gIGZvZ0xhbXBDYXZlMzogWzB4NGEsICdGb2cgTGFtcCBDYXZlIDMnXSxcbiAgZm9nTGFtcENhdmVEZWFkRW5kOiBbMHg0YiwgJ0ZvZyBMYW1wIENhdmUgRGVhZCBFbmQnXSxcbiAgZm9nTGFtcENhdmU0OiBbMHg0YywgJ0ZvZyBMYW1wIENhdmUgNCddLFxuICBmb2dMYW1wQ2F2ZTU6IFsweDRkLCAnRm9nIExhbXAgQ2F2ZSA1J10sXG4gIGZvZ0xhbXBDYXZlNjogWzB4NGUsICdGb2cgTGFtcCBDYXZlIDYnXSxcbiAgZm9nTGFtcENhdmU3OiBbMHg0ZiwgJ0ZvZyBMYW1wIENhdmUgNyddLFxuICBwb3J0b2E6IFsweDUwLCAnUG9ydG9hJ10sXG4gIHBvcnRvYUZpc2hlcm1hbklzbGFuZDogWzB4NTEsICdQb3J0b2EgLSBGaXNoZXJtYW4gSXNsYW5kJ10sXG4gIG1lc2lhU2hyaW5lOiBbMHg1MiwgJ01lc2lhIFNocmluZSddLFxuICAvLyBJTlZBTElEOiAweDUzXG4gIHdhdGVyZmFsbENhdmUxOiBbMHg1NCwgJ1dhdGVyZmFsbCBDYXZlIDEnXSxcbiAgd2F0ZXJmYWxsQ2F2ZTI6IFsweDU1LCAnV2F0ZXJmYWxsIENhdmUgMiddLFxuICB3YXRlcmZhbGxDYXZlMzogWzB4NTYsICdXYXRlcmZhbGwgQ2F2ZSAzJ10sXG4gIHdhdGVyZmFsbENhdmU0OiBbMHg1NywgJ1dhdGVyZmFsbCBDYXZlIDQnXSxcbiAgdG93ZXJFbnRyYW5jZTogWzB4NTgsICdUb3dlciAtIEVudHJhbmNlJ10sXG4gIHRvd2VyMTogWzB4NTksICdUb3dlciAxJ10sXG4gIHRvd2VyMjogWzB4NWEsICdUb3dlciAyJ10sXG4gIHRvd2VyMzogWzB4NWIsICdUb3dlciAzJ10sXG4gIHRvd2VyT3V0c2lkZU1lc2lhOiBbMHg1YywgJ1Rvd2VyIC0gT3V0c2lkZSBNZXNpYSddLFxuICB0b3dlck91dHNpZGVEeW5hOiBbMHg1ZCwgJ1Rvd2VyIC0gT3V0c2lkZSBEeW5hJ10sXG4gIHRvd2VyTWVzaWE6IFsweDVlLCAnVG93ZXIgLSBNZXNpYSddLFxuICB0b3dlckR5bmE6IFsweDVmLCAnVG93ZXIgLSBEeW5hJ10sXG4gIGFuZ3J5U2VhOiBbMHg2MCwgJ0FuZ3J5IFNlYSddLFxuICBib2F0SG91c2U6IFsweDYxLCAnQm9hdCBIb3VzZSddLFxuICBqb2VsTGlnaHRob3VzZTogWzB4NjIsICdKb2VsIC0gTGlnaHRob3VzZSddLFxuICAvLyBJTlZBTElEOiAweDYzXG4gIHVuZGVyZ3JvdW5kQ2hhbm5lbDogWzB4NjQsICdVbmRlcmdyb3VuZCBDaGFubmVsJ10sXG4gIHpvbWJpZVRvd246IFsweDY1LCAnWm9tYmllIFRvd24nXSxcbiAgLy8gSU5WQUxJRDogMHg2NlxuICAvLyBJTlZBTElEOiAweDY3XG4gIGV2aWxTcGlyaXRJc2xhbmQxOiBbMHg2OCwgJ0V2aWwgU3Bpcml0IElzbGFuZCAxJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQyOiBbMHg2OSwgJ0V2aWwgU3Bpcml0IElzbGFuZCAyJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQzOiBbMHg2YSwgJ0V2aWwgU3Bpcml0IElzbGFuZCAzJ10sXG4gIGV2aWxTcGlyaXRJc2xhbmQ0OiBbMHg2YiwgJ0V2aWwgU3Bpcml0IElzbGFuZCA0J10sXG4gIHNhYmVyYVBhbGFjZTE6IFsweDZjLCAnU2FiZXJhIFBhbGFjZSAxJ10sXG4gIHNhYmVyYVBhbGFjZTI6IFsweDZkLCAnU2FiZXJhIFBhbGFjZSAyJ10sXG4gIHNhYmVyYVBhbGFjZTM6IFsweDZlLCAnU2FiZXJhIFBhbGFjZSAzJ10sXG4gIC8vIElOVkFMSUQ6IDB4NmYgLS0gU2FiZXJhIFBhbGFjZSAzIHVudXNlZCBjb3B5XG4gIGpvZWxTZWNyZXRQYXNzYWdlOiBbMHg3MCwgJ0pvZWwgLSBTZWNyZXQgUGFzc2FnZSddLFxuICBqb2VsOiBbMHg3MSwgJ0pvZWwnXSxcbiAgc3dhbjogWzB4NzIsICdTd2FuJ10sXG4gIHN3YW5HYXRlOiBbMHg3MywgJ1N3YW4gLSBHYXRlJ10sXG4gIC8vIElOVkFMSUQ6IDB4NzRcbiAgLy8gSU5WQUxJRDogMHg3NVxuICAvLyBJTlZBTElEOiAweDc2XG4gIC8vIElOVkFMSUQ6IDB4NzdcbiAgZ29hVmFsbGV5OiBbMHg3OCwgJ0dvYSBWYWxsZXknXSxcbiAgLy8gSU5WQUxJRDogMHg3OVxuICAvLyBJTlZBTElEOiAweDdhXG4gIC8vIElOVkFMSUQ6IDB4N2JcbiAgbXRIeWRyYTogWzB4N2MsICdNdCBIeWRyYSddLFxuICBtdEh5ZHJhQ2F2ZTE6IFsweDdkLCAnTXQgSHlkcmEgLSBDYXZlIDEnXSxcbiAgbXRIeWRyYU91dHNpZGVTaHlyb246IFsweDdlLCAnTXQgSHlkcmEgLSBPdXRzaWRlIFNoeXJvbiddLFxuICBtdEh5ZHJhQ2F2ZTI6IFsweDdmLCAnTXQgSHlkcmEgLSBDYXZlIDInXSxcbiAgbXRIeWRyYUNhdmUzOiBbMHg4MCwgJ010IEh5ZHJhIC0gQ2F2ZSAzJ10sXG4gIG10SHlkcmFDYXZlNDogWzB4ODEsICdNdCBIeWRyYSAtIENhdmUgNCddLFxuICBtdEh5ZHJhQ2F2ZTU6IFsweDgyLCAnTXQgSHlkcmEgLSBDYXZlIDUnXSxcbiAgbXRIeWRyYUNhdmU2OiBbMHg4MywgJ010IEh5ZHJhIC0gQ2F2ZSA2J10sXG4gIG10SHlkcmFDYXZlNzogWzB4ODQsICdNdCBIeWRyYSAtIENhdmUgNyddLFxuICBtdEh5ZHJhQ2F2ZTg6IFsweDg1LCAnTXQgSHlkcmEgLSBDYXZlIDgnXSxcbiAgbXRIeWRyYUNhdmU5OiBbMHg4NiwgJ010IEh5ZHJhIC0gQ2F2ZSA5J10sXG4gIG10SHlkcmFDYXZlMTA6IFsweDg3LCAnTXQgSHlkcmEgLSBDYXZlIDEwJ10sXG4gIHN0eXgxOiBbMHg4OCwgJ1N0eXggMSddLFxuICBzdHl4MjogWzB4ODksICdTdHl4IDInXSxcbiAgc3R5eDM6IFsweDhhLCAnU3R5eCAzJ10sXG4gIC8vIElOVkFMSUQ6IDB4OGJcbiAgc2h5cm9uOiBbMHg4YywgJ1NoeXJvbiddLFxuICAvLyBJTlZBTElEOiAweDhkXG4gIGdvYTogWzB4OGUsICdHb2EnXSxcbiAgZ29hRm9ydHJlc3NPYXNpc0VudHJhbmNlOiBbMHg4ZiwgJ0dvYSBGb3J0cmVzcyAtIE9hc2lzIEVudHJhbmNlJ10sXG4gIGRlc2VydDE6IFsweDkwLCAnRGVzZXJ0IDEnXSxcbiAgb2FzaXNDYXZlTWFpbjogWzB4OTEsICdPYXNpcyBDYXZlIC0gTWFpbiddLFxuICBkZXNlcnRDYXZlMTogWzB4OTIsICdEZXNlcnQgQ2F2ZSAxJ10sXG4gIHNhaGFyYTogWzB4OTMsICdTYWhhcmEnXSxcbiAgc2FoYXJhT3V0c2lkZUNhdmU6IFsweDk0LCAnU2FoYXJhIC0gT3V0c2lkZSBDYXZlJ10sXG4gIGRlc2VydENhdmUyOiBbMHg5NSwgJ0Rlc2VydCBDYXZlIDInXSxcbiAgc2FoYXJhTWVhZG93OiBbMHg5NiwgJ1NhaGFyYSBNZWFkb3cnXSxcbiAgLy8gSU5WQUxJRDogMHg5N1xuICBkZXNlcnQyOiBbMHg5OCwgJ0Rlc2VydCAyJ10sXG4gIC8vIElOVkFMSUQ6IDB4OTlcbiAgLy8gSU5WQUxJRDogMHg5YVxuICAvLyBJTlZBTElEOiAweDliXG4gIHB5cmFtaWRFbnRyYW5jZTogWzB4OWMsICdQeXJhbWlkIC0gRW50cmFuY2UnXSxcbiAgcHlyYW1pZEJyYW5jaDogWzB4OWQsICdQeXJhbWlkIC0gQnJhbmNoJ10sXG4gIHB5cmFtaWRNYWluOiBbMHg5ZSwgJ1B5cmFtaWQgLSBNYWluJ10sXG4gIHB5cmFtaWREcmF5Z29uOiBbMHg5ZiwgJ1B5cmFtaWQgLSBEcmF5Z29uJ10sXG4gIGNyeXB0RW50cmFuY2U6IFsweGEwLCAnQ3J5cHQgLSBFbnRyYW5jZSddLFxuICBjcnlwdEhhbGwxOiBbMHhhMSwgJ0NyeXB0IC0gSGFsbCAxJ10sXG4gIGNyeXB0QnJhbmNoOiBbMHhhMiwgJ0NyeXB0IC0gQnJhbmNoJ10sXG4gIGNyeXB0RGVhZEVuZExlZnQ6IFsweGEzLCAnQ3J5cHQgLSBEZWFkIEVuZCBMZWZ0J10sXG4gIGNyeXB0RGVhZEVuZFJpZ2h0OiBbMHhhNCwgJ0NyeXB0IC0gRGVhZCBFbmQgUmlnaHQnXSxcbiAgY3J5cHRIYWxsMjogWzB4YTUsICdDcnlwdCAtIEhhbGwgMiddLFxuICBjcnlwdERyYXlnb24yOiBbMHhhNiwgJ0NyeXB0IC0gRHJheWdvbiAyJ10sXG4gIGNyeXB0VGVsZXBvcnRlcjogWzB4YTcsICdDcnlwdCAtIFRlbGVwb3J0ZXInXSxcbiAgZ29hRm9ydHJlc3NFbnRyYW5jZTogWzB4YTgsICdHb2EgRm9ydHJlc3MgLSBFbnRyYW5jZSddLFxuICBnb2FGb3J0cmVzc0tlbGJlc3F1ZTogWzB4YTksICdHb2EgRm9ydHJlc3MgLSBLZWxiZXNxdWUnXSxcbiAgZ29hRm9ydHJlc3NaZWJ1OiBbMHhhYSwgJ0dvYSBGb3J0cmVzcyAtIFplYnUnXSxcbiAgZ29hRm9ydHJlc3NTYWJlcmE6IFsweGFiLCAnR29hIEZvcnRyZXNzIC0gU2FiZXJhJ10sXG4gIGdvYUZvcnRyZXNzVG9ybmVsOiBbMHhhYywgJ0dvYSBGb3J0cmVzcyAtIFRvcm5lbCddLFxuICBnb2FGb3J0cmVzc01hZG8xOiBbMHhhZCwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMSddLFxuICBnb2FGb3J0cmVzc01hZG8yOiBbMHhhZSwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMiddLFxuICBnb2FGb3J0cmVzc01hZG8zOiBbMHhhZiwgJ0dvYSBGb3J0cmVzcyAtIE1hZG8gMyddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUxOiBbMHhiMCwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMSddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUyOiBbMHhiMSwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMiddLFxuICBnb2FGb3J0cmVzc0thcm1pbmUzOiBbMHhiMiwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgMyddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU0OiBbMHhiMywgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNCddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU1OiBbMHhiNCwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNSddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU2OiBbMHhiNSwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNiddLFxuICBnb2FGb3J0cmVzc0thcm1pbmU3OiBbMHhiNiwgJ0dvYSBGb3J0cmVzcyAtIEthcm1pbmUgNyddLFxuICBnb2FGb3J0cmVzc0V4aXQ6IFsweGI3LCAnR29hIEZvcnRyZXNzIC0gRXhpdCddLFxuICBvYXNpc0NhdmVFbnRyYW5jZTogWzB4YjgsICdPYXNpcyBDYXZlIC0gRW50cmFuY2UnXSxcbiAgZ29hRm9ydHJlc3NBc2luYTogWzB4YjksICdHb2EgRm9ydHJlc3MgLSBBc2luYSddLFxuICBnb2FGb3J0cmVzc0tlbnN1OiBbMHhiYSwgJ0dvYSBGb3J0cmVzcyAtIEtlbnN1J10sXG4gIGdvYUhvdXNlOiBbMHhiYiwgJ0dvYSAtIEhvdXNlJ10sXG4gIGdvYUlubjogWzB4YmMsICdHb2EgLSBJbm4nXSxcbiAgLy8gSU5WQUxJRDogMHhiZFxuICBnb2FUb29sU2hvcDogWzB4YmUsICdHb2EgLSBUb29sIFNob3AnXSxcbiAgZ29hVGF2ZXJuOiBbMHhiZiwgJ0dvYSAtIFRhdmVybiddLFxuICBsZWFmRWxkZXJIb3VzZTogWzB4YzAsICdMZWFmIC0gRWxkZXIgSG91c2UnXSxcbiAgbGVhZlJhYmJpdEh1dDogWzB4YzEsICdMZWFmIC0gUmFiYml0IEh1dCddLFxuICBsZWFmSW5uOiBbMHhjMiwgJ0xlYWYgLSBJbm4nXSxcbiAgbGVhZlRvb2xTaG9wOiBbMHhjMywgJ0xlYWYgLSBUb29sIFNob3AnXSxcbiAgbGVhZkFybW9yU2hvcDogWzB4YzQsICdMZWFmIC0gQXJtb3IgU2hvcCddLFxuICBsZWFmU3R1ZGVudEhvdXNlOiBbMHhjNSwgJ0xlYWYgLSBTdHVkZW50IEhvdXNlJ10sXG4gIGJyeW5tYWVyVGF2ZXJuOiBbMHhjNiwgJ0JyeW5tYWVyIC0gVGF2ZXJuJ10sXG4gIGJyeW5tYWVyUGF3blNob3A6IFsweGM3LCAnQnJ5bm1hZXIgLSBQYXduIFNob3AnXSxcbiAgYnJ5bm1hZXJJbm46IFsweGM4LCAnQnJ5bm1hZXIgLSBJbm4nXSxcbiAgYnJ5bm1hZXJBcm1vclNob3A6IFsweGM5LCAnQnJ5bm1hZXIgLSBBcm1vciBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4Y2FcbiAgYnJ5bm1hZXJJdGVtU2hvcDogWzB4Y2IsICdCcnlubWFlciAtIEl0ZW0gU2hvcCddLFxuICAvLyBJTlZBTElEOiAweGNjXG4gIG9ha0VsZGVySG91c2U6IFsweGNkLCAnT2FrIC0gRWxkZXIgSG91c2UnXSxcbiAgb2FrTW90aGVySG91c2U6IFsweGNlLCAnT2FrIC0gTW90aGVyIEhvdXNlJ10sXG4gIG9ha1Rvb2xTaG9wOiBbMHhjZiwgJ09hayAtIFRvb2wgU2hvcCddLFxuICBvYWtJbm46IFsweGQwLCAnT2FrIC0gSW5uJ10sXG4gIGFtYXpvbmVzSW5uOiBbMHhkMSwgJ0FtYXpvbmVzIC0gSW5uJ10sXG4gIGFtYXpvbmVzSXRlbVNob3A6IFsweGQyLCAnQW1hem9uZXMgLSBJdGVtIFNob3AnXSxcbiAgYW1hem9uZXNBcm1vclNob3A6IFsweGQzLCAnQW1hem9uZXMgLSBBcm1vciBTaG9wJ10sXG4gIGFtYXpvbmVzRWxkZXI6IFsweGQ0LCAnQW1hem9uZXMgLSBFbGRlciddLFxuICBuYWRhcmU6IFsweGQ1LCAnTmFkYXJlJ10sXG4gIHBvcnRvYUZpc2hlcm1hbkhvdXNlOiBbMHhkNiwgJ1BvcnRvYSAtIEZpc2hlcm1hbiBIb3VzZSddLFxuICBwb3J0b2FQYWxhY2VFbnRyYW5jZTogWzB4ZDcsICdQb3J0b2EgLSBQYWxhY2UgRW50cmFuY2UnXSxcbiAgcG9ydG9hRm9ydHVuZVRlbGxlcjogWzB4ZDgsICdQb3J0b2EgLSBGb3J0dW5lIFRlbGxlciddLFxuICBwb3J0b2FQYXduU2hvcDogWzB4ZDksICdQb3J0b2EgLSBQYXduIFNob3AnXSxcbiAgcG9ydG9hQXJtb3JTaG9wOiBbMHhkYSwgJ1BvcnRvYSAtIEFybW9yIFNob3AnXSxcbiAgLy8gSU5WQUxJRDogMHhkYlxuICBwb3J0b2FJbm46IFsweGRjLCAnUG9ydG9hIC0gSW5uJ10sXG4gIHBvcnRvYVRvb2xTaG9wOiBbMHhkZCwgJ1BvcnRvYSAtIFRvb2wgU2hvcCddLFxuICBwb3J0b2FQYWxhY2VMZWZ0OiBbMHhkZSwgJ1BvcnRvYSAtIFBhbGFjZSBMZWZ0J10sXG4gIHBvcnRvYVBhbGFjZVRocm9uZVJvb206IFsweGRmLCAnUG9ydG9hIC0gUGFsYWNlIFRocm9uZSBSb29tJ10sXG4gIHBvcnRvYVBhbGFjZVJpZ2h0OiBbMHhlMCwgJ1BvcnRvYSAtIFBhbGFjZSBSaWdodCddLFxuICBwb3J0b2FBc2luYVJvb206IFsweGUxLCAnUG9ydG9hIC0gQXNpbmEgUm9vbSddLFxuICBhbWF6b25lc0VsZGVyRG93bnN0YWlyczogWzB4ZTIsICdBbWF6b25lcyAtIEVsZGVyIERvd25zdGFpcnMnXSxcbiAgam9lbEVsZGVySG91c2U6IFsweGUzLCAnSm9lbCAtIEVsZGVyIEhvdXNlJ10sXG4gIGpvZWxTaGVkOiBbMHhlNCwgJ0pvZWwgLSBTaGVkJ10sXG4gIGpvZWxUb29sU2hvcDogWzB4ZTUsICdKb2VsIC0gVG9vbCBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4ZTZcbiAgam9lbElubjogWzB4ZTcsICdKb2VsIC0gSW5uJ10sXG4gIHpvbWJpZVRvd25Ib3VzZTogWzB4ZTgsICdab21iaWUgVG93biAtIEhvdXNlJ10sXG4gIHpvbWJpZVRvd25Ib3VzZUJhc2VtZW50OiBbMHhlOSwgJ1pvbWJpZSBUb3duIC0gSG91c2UgQmFzZW1lbnQnXSxcbiAgLy8gSU5WQUxJRDogMHhlYVxuICBzd2FuVG9vbFNob3A6IFsweGViLCAnU3dhbiAtIFRvb2wgU2hvcCddLFxuICBzd2FuU3RvbUh1dDogWzB4ZWMsICdTd2FuIC0gU3RvbSBIdXQnXSxcbiAgc3dhbklubjogWzB4ZWQsICdTd2FuIC0gSW5uJ10sXG4gIHN3YW5Bcm1vclNob3A6IFsweGVlLCAnU3dhbiAtIEFybW9yIFNob3AnXSxcbiAgc3dhblRhdmVybjogWzB4ZWYsICdTd2FuIC0gVGF2ZXJuJ10sXG4gIHN3YW5QYXduU2hvcDogWzB4ZjAsICdTd2FuIC0gUGF3biBTaG9wJ10sXG4gIHN3YW5EYW5jZUhhbGw6IFsweGYxLCAnU3dhbiAtIERhbmNlIEhhbGwnXSxcbiAgc2h5cm9uRm9ydHJlc3M6IFsweGYyLCAnU2h5cm9uIC0gRm9ydHJlc3MnXSxcbiAgc2h5cm9uVHJhaW5pbmdIYWxsOiBbMHhmMywgJ1NoeXJvbiAtIFRyYWluaW5nIEhhbGwnXSxcbiAgc2h5cm9uSG9zcGl0YWw6IFsweGY0LCAnU2h5cm9uIC0gSG9zcGl0YWwnXSxcbiAgc2h5cm9uQXJtb3JTaG9wOiBbMHhmNSwgJ1NoeXJvbiAtIEFybW9yIFNob3AnXSxcbiAgc2h5cm9uVG9vbFNob3A6IFsweGY2LCAnU2h5cm9uIC0gVG9vbCBTaG9wJ10sXG4gIHNoeXJvbklubjogWzB4ZjcsICdTaHlyb24gLSBJbm4nXSxcbiAgc2FoYXJhSW5uOiBbMHhmOCwgJ1NhaGFyYSAtIElubiddLFxuICBzYWhhcmFUb29sU2hvcDogWzB4ZjksICdTYWhhcmEgLSBUb29sIFNob3AnXSxcbiAgc2FoYXJhRWxkZXJIb3VzZTogWzB4ZmEsICdTYWhhcmEgLSBFbGRlciBIb3VzZSddLFxuICBzYWhhcmFQYXduU2hvcDogWzB4ZmIsICdTYWhhcmEgLSBQYXduIFNob3AnXSxcbn0gYXMgY29uc3Q7XG4vLyB0eXBlIExvY2F0aW9ucyA9IHR5cGVvZiBMT0NBVElPTlM7XG5cbi8vIE5PVEU6IHRoaXMgd29ya3MgdG8gY29uc3RyYWluIHRoZSBrZXlzIHRvIGV4YWN0bHkgdGhlIHNhbWUuXG4vLyBjb25zdCB4OiB7cmVhZG9ubHkgW1QgaW4ga2V5b2YgdHlwZW9mIExPQ0FUSU9OU10/OiBzdHJpbmd9ID0ge307XG5cbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgYWxsb3dzIHByZXR0eSByb2J1c3QgY2hlY2tzIVxuLy8gY29uc3QgeCA9IGNoZWNrPEtleXNPZjxMb2NhdGlvbnMsIHN0cmluZyB8IGJvb2xlYW4+PigpKHtcbi8vICAgbGVhZjogJ3gnLFxuLy8gICBzd2FuOiB0cnVlLFxuLy8gfSk7XG4vLyBjb25zdCB5ID0gY2hlY2s8S2V5c09mPHR5cGVvZiB4LCBudW1iZXIsIHN0cmluZz4+KCkoe1xuLy8gICBzd2FuOiAxLFxuLy8gfSk7XG5cbi8vIHR5cGUgS2V5c09mPFQsIFYgPSB1bmtub3duLCBSID0gdW5rbm93bj4gPSB7W0sgaW4ga2V5b2YgVF0/OiBUW0tdIGV4dGVuZHMgUiA/IFYgOiBuZXZlcn07XG5cbi8vIGZ1bmN0aW9uIGNoZWNrPFQ+KCk6IDxVIGV4dGVuZHMgVD4oYXJnOiBVKSA9PiBVIHtcbi8vICAgcmV0dXJuIGFyZyA9PiBhcmc7XG4vLyB9XG5cbi8vIGNvbnN0IGxvY2F0aW9uTmFtZXM6IChzdHJpbmcgfCB1bmRlZmluZWQpW10gPSAoKCkgPT4ge1xuLy8gICBjb25zdCBuYW1lcyA9IFtdO1xuLy8gICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhMT0NBVElPTlMpKSB7XG4vLyAgICAgY29uc3QgW2lkLCBuYW1lXSA9IChMT0NBVElPTlMgYXMgYW55KVtrZXldO1xuLy8gICAgIG5hbWVzW2lkXSA9IG5hbWU7XG4vLyAgIH1cbi8vICAgcmV0dXJuIG5hbWVzO1xuLy8gfSkoKTtcblxuLy8gY29uc3QgbG9jYXRpb25LZXlzOiAobG9jYXRpb25LZXkgfCB1bmRlZmluZWQpW10gPSAoKCkgPT4ge1xuLy8gICBjb25zdCBrZXlzID0gW107XG4vLyAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKExPQ0FUSU9OUykpIHtcbi8vICAgICBjb25zdCBbaWRdID0gKExPQ0FUSU9OUyBhcyBhbnkpW2tleV07XG4vLyAgICAga2V5c1tpZF0gPSBrZXk7XG4vLyAgIH1cbi8vICAgcmV0dXJuIGtleXMgYXMgYW55O1xuLy8gfSkoKTtcblxuXG4vLyB2ZXJ5IHNpbXBsZSB2ZXJzaW9uIG9mIHdoYXQgd2UncmUgZG9pbmcgd2l0aCBtZXRhc2NyZWVuc1xuY29uc3Qgc2NyZWVuRXhpdHM6IHtbaWQ6IG51bWJlcl06IHJlYWRvbmx5IFtudW1iZXIsIHJlYWRvbmx5IFtudW1iZXIsIG51bWJlcl1dfSA9IHtcbiAgMHgxNTogWzB4OTBfYTAsIFsweDg5LCAweDhhXV0sIC8vIGNhdmUgb24gbGVmdCBib3VuZGFyeVxuICAweDE5OiBbMHg2MF85MCwgWzB4NTgsIDB4NTldXSwgLy8gY2F2ZSBvbiByaWdodCBib3VuZGFyeSAobm90IG9uIGdyYXNzKVxuICAweDk2OiBbMHg0MF8zMCwgWzB4MzIsIDB4MzNdXSwgLy8gdXAgc3RhaXIgZnJvbSBsZWZ0XG4gIDB4OTc6IFsweGFmXzMwLCBbMHhiMiwgMHhiM11dLCAvLyBkb3duIHN0YWlyIGZyb20gbGVmdFxuICAweDk4OiBbMHg0MF9kMCwgWzB4M2MsIDB4M2RdXSwgLy8gdXAgc3RhaXIgZnJvbSByaWdodFxuICAweDk5OiBbMHhhZl9kMCwgWzB4YmMsIDB4YmRdXSwgLy8gZG93biBzdGFpciBmcm9tIHJpZ2h0XG4gIDB4OWE6IFsweDFmXzgwLCBbMHgyNywgMHgyOF1dLCAvLyBkb3duIHN0YWlyIChkb3VibGUgLSBqdXN0IHVzZSBkb3duISlcbiAgMHg5ZTogWzB4ZGZfODAsIFsweGU3LCAweGU4XV0sIC8vIGJvdHRvbSBlZGdlXG4gIDB4YzI6IFsweDYwX2IwLCBbMHg1YSwgMHg1Yl1dLCAvLyBjYXZlIG9uIGJvdHRvbS1yaWdodCBib3VuZGFyeVxufTtcblxuLy8gYnVpbGRpbmcgdGhlIENTViBmb3IgdGhlIGxvY2F0aW9uIHRhYmxlLlxuLy9jb25zdCBoPSh4KT0+eD09bnVsbD8nbnVsbCc6JyQnK3gudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCk7XG4vLydpZCxuYW1lLGJnbSx3aWR0aCxoZWlnaHQsYW5pbWF0aW9uLGV4dGVuZGVkLHRpbGVwYXQwLHRpbGVwYXQxLHRpbGVwYWwwLHRpbGVwYWwxLHRpbGVzZXQsdGlsZSBlZmZlY3RzLGV4aXRzLHNwcnBhdDAsc3BycGF0MSxzcHJwYWwwLHNwcnBhbDEsb2JqMGQsb2JqMGUsb2JqMGYsb2JqMTAsb2JqMTEsb2JqMTIsb2JqMTMsb2JqMTQsb2JqMTUsb2JqMTYsb2JqMTcsb2JqMTgsb2JqMTksb2JqMWEsb2JqMWIsb2JqMWMsb2JqMWQsb2JqMWUsb2JqMWZcXG4nK3JvbS5sb2NhdGlvbnMubWFwKGw9PiFsfHwhbC51c2VkPycnOltoKGwuaWQpLGwubmFtZSxoKGwuYmdtKSxsLmxheW91dFdpZHRoLGwubGF5b3V0SGVpZ2h0LGwuYW5pbWF0aW9uLGwuZXh0ZW5kZWQsaCgobC50aWxlUGF0dGVybnN8fFtdKVswXSksaCgobC50aWxlUGF0dGVybnN8fFtdKVsxXSksaCgobC50aWxlUGFsZXR0ZXN8fFtdKVswXSksaCgobC50aWxlUGFsZXR0ZXN8fFtdKVsxXSksaChsLnRpbGVzZXQpLGgobC50aWxlRWZmZWN0cyksWy4uLm5ldyBTZXQobC5leGl0cy5tYXAoeD0+aCh4WzJdKSkpXS5qb2luKCc6JyksaCgobC5zcHJpdGVQYXR0ZXJuc3x8W10pWzBdKSxoKChsLnNwcml0ZVBhdHRlcm5zfHxbXSlbMV0pLGgoKGwuc3ByaXRlUGFsZXR0ZXN8fFtdKVswXSksaCgobC5zcHJpdGVQYWxldHRlc3x8W10pWzFdKSwuLi5uZXcgQXJyYXkoMTkpLmZpbGwoMCkubWFwKCh2LGkpPT4oKGwub2JqZWN0c3x8W10pW2ldfHxbXSkuc2xpY2UoMikubWFwKHg9PngudG9TdHJpbmcoMTYpKS5qb2luKCc6JykpXSkuZmlsdGVyKHg9PngpLmpvaW4oJ1xcbicpXG5cbi8vIGJ1aWxkaW5nIGNzdiBmb3IgbG9jLW9iaiBjcm9zcy1yZWZlcmVuY2UgdGFibGVcbi8vIHNlcT0ocyxlLGYpPT5uZXcgQXJyYXkoZS1zKS5maWxsKDApLm1hcCgoeCxpKT0+ZihpK3MpKTtcbi8vIHVuaXE9KGFycik9Pntcbi8vICAgY29uc3QgbT17fTtcbi8vICAgZm9yIChsZXQgbyBvZiBhcnIpIHtcbi8vICAgICBvWzZdPW9bNV0/MTowO1xuLy8gICAgIGlmKCFvWzVdKW1bb1syXV09KG1bb1syXV18fDApKzE7XG4vLyAgIH1cbi8vICAgZm9yIChsZXQgbyBvZiBhcnIpIHtcbi8vICAgICBpZihvWzJdIGluIG0pb1s2XT1tW29bMl1dO1xuLy8gICAgIGRlbGV0ZSBtW29bMl1dO1xuLy8gICB9XG4vLyAgIHJldHVybiBhcnI7XG4vLyB9XG4vLyAnbG9jLGxvY25hbWUsbW9uLG1vbm5hbWUsc3Bhd24sdHlwZSx1bmlxLHBhdHNsb3QscGF0LHBhbHNsb3QscGFsMixwYWwzXFxuJytcbi8vIHJvbS5sb2NhdGlvbnMuZmxhdE1hcChsPT4hbHx8IWwudXNlZD9bXTp1bmlxKHNlcSgweGQsMHgyMCxzPT57XG4vLyAgIGNvbnN0IG89KGwub2JqZWN0c3x8W10pW3MtMHhkXXx8bnVsbDtcbi8vICAgaWYgKCFvKSByZXR1cm4gbnVsbDtcbi8vICAgY29uc3QgdHlwZT1vWzJdJjc7XG4vLyAgIGNvbnN0IG09dHlwZT9udWxsOjB4NTArb1szXTtcbi8vICAgY29uc3QgcGF0U2xvdD1vWzJdJjB4ODA/MTowO1xuLy8gICBjb25zdCBtb249bT9yb20ub2JqZWN0c1ttXTpudWxsO1xuLy8gICBjb25zdCBwYWxTbG90PShtb24/bW9uLnBhbGV0dGVzKGZhbHNlKTpbXSlbMF07XG4vLyAgIGNvbnN0IGFsbFBhbD1uZXcgU2V0KG1vbj9tb24ucGFsZXR0ZXModHJ1ZSk6W10pO1xuLy8gICByZXR1cm4gW2gobC5pZCksbC5uYW1lLGgobSksJycsaChzKSx0eXBlLDAscGF0U2xvdCxtP2goKGwuc3ByaXRlUGF0dGVybnN8fFtdKVtwYXRTbG90XSk6JycscGFsU2xvdCxhbGxQYWwuaGFzKDIpP2goKGwuc3ByaXRlUGFsZXR0ZXN8fFtdKVswXSk6JycsYWxsUGFsLmhhcygzKT9oKChsLnNwcml0ZVBhbGV0dGVzfHxbXSlbMV0pOicnXTtcbi8vIH0pLmZpbHRlcih4PT54KSkpLm1hcChhPT5hLmpvaW4oJywnKSkuZmlsdGVyKHg9PngpLmpvaW4oJ1xcbicpO1xuIl19