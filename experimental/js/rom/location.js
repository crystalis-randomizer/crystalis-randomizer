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
        this.Crypt_Teleporter = $(0xa7, { music: 'Crypt-Teleporter' });
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
        this.EastCave3 = $(-1);
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
        const thisAlt = pos < 0 ? 0x100 : 0;
        const thatAlt = thatPos < 0 ? 0x100 : 0;
        pos = pos < 0 ? ~pos : pos;
        thatPos = thatPos < 0 ? ~thatPos : thatPos;
        const thisY = pos >>> 4;
        const thisX = pos & 0xf;
        const thatY = thatPos >>> 4;
        const thatX = thatPos & 0xf;
        const thisTile = this.screens[thisY][thisX];
        const thatTile = that.screens[thatY][thatX];
        const [thisEntrance, thisExits] = screenExits[thisAlt | thisTile];
        const [thatEntrance, thatExits] = screenExits[thatAlt | thatTile];
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
    0xc1: [20640, [0x49, 0x4a]],
    0xc2: [24752, [0x5a, 0x5b]],
    0x19a: [53376, [0xc7, 0xc8]],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFFbkMsT0FBTyxFQUFPLFNBQVMsRUFDZixlQUFlLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQ3hDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUN0QyxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUdoRSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDMUMsT0FBTyxFQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBdUIxRCxNQUFNLElBQUksR0FBRztJQUNYLE9BQU8sRUFBRSxNQUFNO0lBQ2YsS0FBSyxFQUFFLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLE9BQU87SUFDMUMsT0FBTyxFQUFFLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLE9BQU87Q0FDcEMsQ0FBQztBQUNYLE1BQU0sS0FBSyxHQUFHO0lBQ1osT0FBTyxFQUFFLE9BQU87SUFDaEIsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRTtDQUNmLENBQUM7QUFDWCxNQUFNLGNBQWMsR0FBRztJQUNyQixPQUFPLEVBQUUsT0FBTztJQUNoQixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFO0lBQ3ZCLEtBQUssRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxnQkFBZ0I7Q0FDM0MsQ0FBQztBQUNYLE1BQU0sS0FBSyxHQUFHO0lBQ1osSUFBSSxFQUFFLE9BQU87SUFDYixLQUFLLEVB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QUFVLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUNkLElBQUksQ0FBQyxNQUFNLEVBQ1gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxVQUFVLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFTLEdBQUcsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEQsSUFBSSxDQUFDLFNBQVM7WUFDWixLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxhQUFhLEdBQUcsV0FBVyxD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RUQsS0FBSyxJQUFJLENBQUMsSUFBSSxRQUFRLEVBQUU7WUFDdEIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JELElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7Z0JBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUN2RCxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO2dCQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUMvQztRQUVELE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNyQixNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBQ3BDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUM3QixNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBR2hELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDcEM7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUN0QyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtZ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QyxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0tBQzlEO0lBQ0QsSUFBSSxDQUFDLEVBQUU7UUFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0tBQzlEO0lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUU7UUFDakMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM3RDtJQUNELElBQUksQ0FBQyxFQUFFO1FBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM3RDtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtJQUN4QyxDQUFDLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLENBQUMsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFckMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMs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QUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQyxFQUFFLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVoQyxDQUFDLEVBQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQyxFQUFFLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFHbkMsRUFBRSxFQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixNQUFNLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTNCLFFBQVE7UUFDTixPQUFPLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FDcEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQzNCLENBQUM7Q0FDRixDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDbkMsTUFBTSxFQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLElBQUksRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWxDLE1BQU0sRUFBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQyxJQUFJLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVsQyxJQUFJLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVCLFFBQVE7UUFDTixPQUFPLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFDM0QsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsRSxDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBR0gsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQ3JDLENBQUMsRUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLEVBQUUsRUFBSyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFMUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUMsRUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRCxFQUFFLEVBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVoQyxNQUFNLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0MsSUFB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YyxFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO0NBQ3BDLENBQUM7QUF5Q1gsTUFBTSxXQUFXLEdBQWlFO0lBQ2hGLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLElBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixLQUFLLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Q0FDL0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXJlYSwgQXJlYXN9IGZyb20gJy4vYXJlYS5qcyc7XG5pbXBvcnQge0VudGl0eX0gZnJvbSAnLi9lbnRpdHkuanMnO1xuaW1wb3J0IHtTY3JlZW59IGZyb20gJy4vc2NyZWVuLmpzJztcbmltcG9ydCB7RGF0YSwgRGF0YVR1cGxlLFxuICAgICAgICBjb25jYXRJdGVyYWJsZXMsIGdyb3VwLCBoZXgsIGluaXRpYWxpemVyLFxuICAgICAgICByZWFkTGl0dGxlRW5kaWFuLCBzZXEsIHR1cGxlLCB2YXJTbGljZSxcbiAgICAgICAgd3JpdGVMaXR0bGVFbmRpYW4sIHVwcGVyQ2FtZWxUb1NwYWNlc30gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7V3JpdGVyfSBmcm9tICcuL3dyaXRlci5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHthc3NlcnROZXZlciwgaXRlcnMsIERlZmF1bHRNYXB9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtNb25zdGVyfSBmcm9tICcuL21vbnN0ZXIuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5cbi8vIE51bWJlciBpbmRpY2F0ZXMgdG8gY29weSB3aGF0ZXZlcidzIGF0IHRoZSBnaXZlbiBleGl0XG50eXBlIEtleSA9IHN0cmluZyB8IHN5bWJvbCB8IG51bWJlcjtcbi8vIExvY2FsIGZvciBkZWZpbmluZyBuYW1lcyBvbiBMb2NhdGlvbnMgb2JqZWN0cy5cbmludGVyZmFjZSBMb2NhdGlvbkluaXQge1xuICBhcmVhPzogKGFyZWFzOiBBcmVhcykgPT4gQXJlYTtcbiAgc3ViQXJlYT86IHN0cmluZztcbiAgbXVzaWM/OiBLZXkgfCAoKGFyZWE6IEFyZWEpID0+IEtleSk7XG4gIHBhbGV0dGU/OiBLZXkgfCAoKGFyZWE6IEFyZWEpID0+IEtleSk7XG4gIGJvc3NTY3JlZW4/OiBudW1iZXI7XG59XG5pbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYTogQXJlYTtcbiAgbmFtZTogc3RyaW5nO1xuICBtdXNpYzogS2V5O1xuICBwYWxldHRlOiBLZXk7XG4gIHN1YkFyZWE/OiBzdHJpbmc7XG4gIGJvc3NTY3JlZW4/OiBudW1iZXI7XG59XG5cbmNvbnN0IENBVkUgPSB7XG4gIHN1YkFyZWE6ICdjYXZlJyxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUNhdmVgLFxuICBwYWxldHRlOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1DYXZlYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBIT1VTRSA9IHtcbiAgc3ViQXJlYTogJ2hvdXNlJyxcbiAgcGFsZXR0ZTogKCkgPT4gU3ltYm9sKCksXG59IGFzIGNvbnN0O1xuY29uc3QgRk9SVFVORV9URUxMRVIgPSB7XG4gIHN1YkFyZWE6ICdob3VzZScsXG4gIHBhbGV0dGU6ICgpID0+IFN5bWJvbCgpLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tRm9ydHVuZVRlbGxlcmAsXG59IGFzIGNvbnN0O1xuY29uc3QgTUVTSUEgPSB7XG4gIG5hbWU6ICdtZXNpYScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1NZXNpYWAsXG4gIC8vIE1lc2lhIGluIHRvd2VyIGtlZXBzIHNhbWUgcGFsZXR0ZVxuICBwYWxldHRlOiAoYXJlYTogQXJlYSkgPT4gYXJlYS5uYW1lID09PSAnVG93ZXInID9cbiAgICAgIGFyZWEubmFtZSA6IGAke2FyZWEubmFtZX0tTWVzaWFgLFxufSBhcyBjb25zdDtcbmNvbnN0IERZTkEgPSB7XG4gIG5hbWU6ICdkeW5hJyxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUR5bmFgLFxuICBwYWxldHRlOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1EeW5hYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBLRUxCRVNRVUUgPSB7XG4gIG5hbWU6ICdnb2EgMScsXG4gIG11c2ljOiAnZ29hIDEnLFxuICBwYWxldHRlOiAnZ29hIDEnLFxufSBhcyBjb25zdDtcbmNvbnN0IFNBQkVSQSA9IHtcbiAgbmFtZTogJ2dvYSAyJyxcbiAgbXVzaWM6ICdnb2EgMicsXG4gIHBhbGV0dGU6ICdnb2EgMicsXG59IGFzIGNvbnN0O1xuY29uc3QgTUFET19MT1dFUiA9IHtcbiAgbmFtZTogJ2dvYSAzJyxcbiAgbXVzaWM6ICdnb2EgMycsXG4gIHBhbGV0dGU6ICdnb2EgMycsXG59IGFzIGNvbnN0O1xuY29uc3QgTUFET19VUFBFUiA9IHsuLi5NQURPX0xPV0VSLCBwYWxldHRlOiAnZ29hIDMgdXBwZXInfSBhcyBjb25zdDtcbmNvbnN0IEtBUk1JTkVfVVBQRVIgPSB7XG4gIG5hbWU6ICdnb2EgNCcsXG4gIG11c2ljOiAnZ29hIDQnLFxuICBwYWxldHRlOiAnZ29hIDQnLFxufSBhcyBjb25zdDtcbmNvbnN0IEtBUk1JTkVfTE9XRVIgPSB7Li4uS0FSTUlORV9VUFBFUiwgcGFsZXR0ZTogJ2dvYSA0IGxvd2VyJ30gYXMgY29uc3Q7XG5cbnR5cGUgSW5pdFBhcmFtcyA9IHJlYWRvbmx5IFtudW1iZXIsIExvY2F0aW9uSW5pdD9dO1xudHlwZSBJbml0ID0geyguLi5hcmdzOiBJbml0UGFyYW1zKTogTG9jYXRpb24sXG4gICAgICAgICAgICAgY29tbWl0KGxvY2F0aW9uczogTG9jYXRpb25zKTogdm9pZH07XG5jb25zdCAkOiBJbml0ID0gKCgpID0+IHtcbiAgY29uc3QgJCA9IGluaXRpYWxpemVyPFtudW1iZXIsIExvY2F0aW9uSW5pdF0sIExvY2F0aW9uPigpO1xuICBsZXQgYXJlYSE6IChhcmVhczogQXJlYXMpID0+IEFyZWE7XG4gIGZ1bmN0aW9uICQkKGlkOiBudW1iZXIsIGRhdGE6IExvY2F0aW9uSW5pdCA9IHt9KTogTG9jYXRpb24ge1xuICAgIGRhdGEgPSB7Li4uZGF0YX07XG4gICAgYXJlYSA9IGRhdGEuYXJlYSA9IGRhdGEuYXJlYSB8fCBhcmVhO1xuICAgIHJldHVybiAkKGlkLCBkYXRhKTtcbiAgfTtcbiAgKCQkIGFzIEluaXQpLmNvbW1pdCA9IChsb2NhdGlvbnM6IExvY2F0aW9ucykgPT4ge1xuICAgIGNvbnN0IGFyZWFzID0gbG9jYXRpb25zLnJvbS5hcmVhcztcbiAgICAkLmNvbW1pdChsb2NhdGlvbnMsIChwcm9wOiBzdHJpbmcsIGlkOiBudW1iZXIsIGluaXQ6IExvY2F0aW9uSW5pdCkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IHVwcGVyQ2FtZWxUb1NwYWNlcyhwcm9wKTtcbiAgICAgIGNvbnN0IGFyZWEgPSBpbml0LmFyZWEhKGFyZWFzKTtcbiAgICAgIGNvbnN0IG11c2ljID0gdHlwZW9mIGluaXQubXVzaWMgPT09ICdmdW5jdGlvbicgP1xuICAgICAgICAgIGluaXQubXVzaWMoYXJlYSkgOiBpbml0Lm11c2ljICE9IG51bGwgP1xuICAgICAgICAgIGluaXQubXVzaWMgOiBhcmVhLm5hbWU7XG4gICAgICBjb25zdCBwYWxldHRlID0gdHlwZW9mIGluaXQucGFsZXR0ZSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgaW5pdC5wYWxldHRlKGFyZWEpIDogaW5pdC5wYWxldHRlIHx8IGFyZWEubmFtZTtcbiAgICAgIGNvbnN0IGRhdGE6IExvY2F0aW9uRGF0YSA9IHthcmVhLCBuYW1lLCBtdXNpYywgcGFsZXR0ZX07XG4gICAgICBpZiAoaW5pdC5zdWJBcmVhICE9IG51bGwpIGRhdGEuc3ViQXJlYSA9IGluaXQuc3ViQXJlYTtcbiAgICAgIGlmIChpbml0LmJvc3NTY3JlZW4gIT0gbnVsbCkgZGF0YS5ib3NzU2NyZWVuID0gaW5pdC5ib3NzU2NyZWVuO1xuICAgICAgY29uc3QgbG9jYXRpb24gPSBuZXcgTG9jYXRpb24obG9jYXRpb25zLnJvbSwgaWQsIGRhdGEpO1xuICAgICAgLy8gbmVnYXRpdmUgaWQgaW5kaWNhdGVzIGl0J3Mgbm90IHJlZ2lzdGVyZWQuXG4gICAgICBpZiAoaWQgPj0gMCkgbG9jYXRpb25zW2lkXSA9IGxvY2F0aW9uO1xuICAgICAgcmV0dXJuIGxvY2F0aW9uO1xuICAgIH0pO1xuICB9O1xuICByZXR1cm4gJCQgYXMgSW5pdDtcbn0pKCk7XG5cbmV4cG9ydCBjbGFzcyBMb2NhdGlvbnMgZXh0ZW5kcyBBcnJheTxMb2NhdGlvbj4ge1xuXG4gIHJlYWRvbmx5IE1lemFtZVNocmluZSAgICAgICAgICAgICA9ICQoMHgwMCwge2FyZWE6IGEgPT4gYS5NZXphbWV9KTtcbiAgcmVhZG9ubHkgTGVhZl9PdXRzaWRlU3RhcnQgICAgICAgID0gJCgweDAxLCB7bXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgTGVhZiAgICAgICAgICAgICAgICAgICAgID0gJCgweDAyLCB7YXJlYTogYSA9PiBhLkxlYWZ9KTtcbiAgcmVhZG9ubHkgVmFsbGV5T2ZXaW5kICAgICAgICAgICAgID0gJCgweDAzLCB7YXJlYTogYSA9PiBhLlZhbGxleU9mV2luZH0pO1xuICByZWFkb25seSBTZWFsZWRDYXZlMSAgICAgICAgICAgICAgPSAkKDB4MDQsIHthcmVhOiBhID0+IGEuU2VhbGVkQ2F2ZX0pO1xuICByZWFkb25seSBTZWFsZWRDYXZlMiAgICAgICAgICAgICAgPSAkKDB4MDUpO1xuICByZWFkb25seSBTZWFsZWRDYXZlNiAgICAgICAgICAgICAgPSAkKDB4MDYpO1xuICByZWFkb25seSBTZWFsZWRDYXZlNCAgICAgICAgICAgICAgPSAkKDB4MDcpO1xuICByZWFkb25seSBTZWFsZWRDYXZlNSAgICAgICAgICAgICAgPSAkKDB4MDgpO1xuICByZWFkb25seSBTZWFsZWRDYXZlMyAgICAgICAgICAgICAgPSAkKDB4MDkpO1xuICByZWFkb25seSBTZWFsZWRDYXZlNyAgICAgICAgICAgICAgPSAkKDB4MGEsIHtib3NzU2NyZWVuOiAweDkxfSk7XG4gIC8vIElOVkFMSUQ6IDB4MGJcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTggICAgICAgICAgICAgID0gJCgweDBjKTtcbiAgLy8gSU5WQUxJRDogMHgwZFxuICByZWFkb25seSBXaW5kbWlsbENhdmUgICAgICAgICAgICAgPSAkKDB4MGUsIHthcmVhOiBhID0+IGEuV2luZG1pbGxDYXZlfSk7XG4gIHJlYWRvbmx5IFdpbmRtaWxsICAgICAgICAgICAgICAgICA9ICQoMHgwZiwge2FyZWE6IGEgPT4gYS5XaW5kbWlsbCwgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgWmVidUNhdmUgICAgICAgICAgICAgICAgID0gJCgweDEwLCB7YXJlYTogYSA9PiBhLlplYnVDYXZlfSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmUxICAgICAgICA9ICQoMHgxMSwge2FyZWE6IGEgPT4gYS5NdFNhYnJlV2VzdCwgLi4uQ0FWRX0pO1xuICAvLyBJTlZBTElEOiAweDEyXG4gIC8vIElOVkFMSUQ6IDB4MTNcbiAgcmVhZG9ubHkgQ29yZGVsUGxhaW5XZXN0ICAgICAgICAgID0gJCgweDE0LCB7YXJlYTogYSA9PiBhLkNvcmRlbFBsYWlufSk7XG4gIHJlYWRvbmx5IENvcmRlbFBsYWluRWFzdCAgICAgICAgICA9ICQoMHgxNSk7XG4gIC8vIElOVkFMSUQ6IDB4MTYgLS0gdW51c2VkIGNvcHkgb2YgMThcbiAgLy8gSU5WQUxJRDogMHgxN1xuICByZWFkb25seSBCcnlubWFlciAgICAgICAgICAgICAgICAgPSAkKDB4MTgsIHthcmVhOiBhID0+IGEuQnJ5bm1hZXJ9KTtcbiAgcmVhZG9ubHkgT3V0c2lkZVN0b21Ib3VzZSAgICAgICAgID0gJCgweDE5LCB7YXJlYTogYSA9PiBhLlN0b21Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgU3dhbXAgICAgICAgICAgICAgICAgICAgID0gJCgweDFhLCB7YXJlYTogYSA9PiBhLlN3YW1wLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDdjfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzICAgICAgICAgICAgICAgICA9ICQoMHgxYiwge2FyZWE6IGEgPT4gYS5BbWF6b25lc30pO1xuICByZWFkb25seSBPYWsgICAgICAgICAgICAgICAgICAgICAgPSAkKDB4MWMsIHthcmVhOiBhID0+IGEuT2FrfSk7XG4gIC8vIElOVkFMSUQ6IDB4MWRcbiAgcmVhZG9ubHkgU3RvbUhvdXNlICAgICAgICAgICAgICAgID0gJCgweDFlLCB7YXJlYTogYSA9PiBhLlN0b21Ib3VzZX0pO1xuICAvLyBJTlZBTElEOiAweDFmXG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0xvd2VyICAgICAgICA9ICQoMHgyMCwge2FyZWE6IGEgPT4gYS5NdFNhYnJlV2VzdH0pO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9VcHBlciAgICAgICAgPSAkKDB4MjEpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlMiAgICAgICAgPSAkKDB4MjIsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlMyAgICAgICAgPSAkKDB4MjMsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlNCAgICAgICAgPSAkKDB4MjQsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlNSAgICAgICAgPSAkKDB4MjUsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlNiAgICAgICAgPSAkKDB4MjYsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlNyAgICAgICAgPSAkKDB4MjcsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTWFpbiAgICAgICAgPSAkKDB4MjgsIHthcmVhOiBhID0+IGEuTXRTYWJyZU5vcnRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4YjV9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX01pZGRsZSAgICAgID0gJCgweDI5KTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUyICAgICAgID0gJCgweDJhLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUzICAgICAgID0gJCgweDJiLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU0ICAgICAgID0gJCgweDJjLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU1ICAgICAgID0gJCgweDJkLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU2ICAgICAgID0gJCgweDJlLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1ByaXNvbkhhbGwgID0gJCgweDJmLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0xlZnRDZWxsICAgID0gJCgweDMwLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0xlZnRDZWxsMiAgID0gJCgweDMxLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1JpZ2h0Q2VsbCAgID0gJCgweDMyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU4ICAgICAgID0gJCgweDMzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU5ICAgICAgID0gJCgweDM0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1N1bW1pdENhdmUgID0gJCgweDM1LCBDQVZFKTtcbiAgLy8gSU5WQUxJRDogMHgzNlxuICAvLyBJTlZBTElEOiAweDM3XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlMSAgICAgICA9ICQoMHgzOCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNyAgICAgICA9ICQoMHgzOSwgQ0FWRSk7XG4gIC8vIElOVkFMSUQ6IDB4M2FcbiAgLy8gSU5WQUxJRDogMHgzYlxuICByZWFkb25seSBOYWRhcmVfSW5uICAgICAgICAgICAgICAgPSAkKDB4M2MsIHthcmVhOiBhID0+IGEuTmFkYXJlLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBOYWRhcmVfVG9vbFNob3AgICAgICAgICAgPSAkKDB4M2QsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTmFkYXJlX0JhY2tSb29tICAgICAgICAgID0gJCgweDNlLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4M2ZcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsVmFsbGV5Tm9ydGggICAgID0gJCgweDQwLCB7YXJlYTogYSA9PiBhLldhdGVyZmFsbFZhbGxleX0pO1xuICByZWFkb25seSBXYXRlcmZhbGxWYWxsZXlTb3V0aCAgICAgPSAkKDB4NDEpO1xuICByZWFkb25seSBMaW1lVHJlZVZhbGxleSAgICAgICAgICAgPSAkKDB4NDIsIHthcmVhOiBhID0+IGEuTGltZVRyZWVWYWxsZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IExpbWVUcmVlTGFrZSAgICAgICAgICAgICA9ICQoMHg0Mywge2FyZWE6IGEgPT4gYS5MaW1lVHJlZUxha2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTEgICAgICAgICA9ICQoMHg0NCwge2FyZWE6IGEgPT4gYS5LaXJpc2FQbGFudENhdmV9KTtcbiAgcmVhZG9ubHkgS2lyaXNhUGxhbnRDYXZlMiAgICAgICAgID0gJCgweDQ1KTtcbiAgcmVhZG9ubHkgS2lyaXNhUGxhbnRDYXZlMyAgICAgICAgID0gJCgweDQ2KTtcbiAgcmVhZG9ubHkgS2lyaXNhTWVhZG93ICAgICAgICAgICAgID0gJCgweDQ3LCB7YXJlYTogYSA9PiBhLktpcmlzYU1lYWRvd30pO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTEgICAgICAgICAgICAgPSAkKDB4NDgsIHthcmVhOiBhID0+IGEuRm9nTGFtcENhdmV9KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUyICAgICAgICAgICAgID0gJCgweDQ5KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUzICAgICAgICAgICAgID0gJCgweDRhKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmVEZWFkRW5kICAgICAgID0gJCgweDRiKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU0ICAgICAgICAgICAgID0gJCgweDRjKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU1ICAgICAgICAgICAgID0gJCgweDRkKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU2ICAgICAgICAgICAgID0gJCgweDRlKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU3ICAgICAgICAgICAgID0gJCgweDRmKTtcbiAgcmVhZG9ubHkgUG9ydG9hICAgICAgICAgICAgICAgICAgID0gJCgweDUwLCB7YXJlYTogYSA9PiBhLlBvcnRvYX0pO1xuICByZWFkb25seSBQb3J0b2FfRmlzaGVybWFuSXNsYW5kICAgPSAkKDB4NTEsIHthcmVhOiBhID0+IGEuRmlzaGVybWFuSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IE1lc2lhU2hyaW5lICAgICAgICAgICAgICA9ICQoMHg1Miwge2FyZWE6IGEgPT4gYS5MaW1lVHJlZUxha2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLk1FU0lBfSk7XG4gIC8vIElOVkFMSUQ6IDB4NTNcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTEgICAgICAgICAgID0gJCgweDU0LCB7YXJlYTogYSA9PiBhLldhdGVyZmFsbENhdmV9KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTIgICAgICAgICAgID0gJCgweDU1KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTMgICAgICAgICAgID0gJCgweDU2KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTQgICAgICAgICAgID0gJCgweDU3KTtcbiAgcmVhZG9ubHkgVG93ZXJFbnRyYW5jZSAgICAgICAgICAgID0gJCgweDU4LCB7YXJlYTogYSA9PiBhLlRvd2VyfSk7XG4gIHJlYWRvbmx5IFRvd2VyMSAgICAgICAgICAgICAgICAgICA9ICQoMHg1OSk7XG4gIHJlYWRvbmx5IFRvd2VyMiAgICAgICAgICAgICAgICAgICA9ICQoMHg1YSk7XG4gIHJlYWRvbmx5IFRvd2VyMyAgICAgICAgICAgICAgICAgICA9ICQoMHg1Yik7XG4gIHJlYWRvbmx5IFRvd2VyT3V0c2lkZU1lc2lhICAgICAgICA9ICQoMHg1Yyk7XG4gIHJlYWRvbmx5IFRvd2VyT3V0c2lkZUR5bmEgICAgICAgICA9ICQoMHg1ZCk7XG4gIHJlYWRvbmx5IFRvd2VyTWVzaWEgICAgICAgICAgICAgICA9ICQoMHg1ZSwgTUVTSUEpO1xuICByZWFkb25seSBUb3dlckR5bmEgICAgICAgICAgICAgICAgPSAkKDB4NWYsIERZTkEpO1xuICByZWFkb25seSBBbmdyeVNlYSAgICAgICAgICAgICAgICAgPSAkKDB4NjAsIHthcmVhOiBhID0+IGEuQW5ncnlTZWF9KTtcbiAgcmVhZG9ubHkgQm9hdEhvdXNlICAgICAgICAgICAgICAgID0gJCgweDYxKTtcbiAgcmVhZG9ubHkgSm9lbExpZ2h0aG91c2UgICAgICAgICAgID0gJCgweDYyLCB7YXJlYTogYSA9PiBhLkxpZ2h0aG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIC8vIElOVkFMSUQ6IDB4NjNcbiAgcmVhZG9ubHkgVW5kZXJncm91bmRDaGFubmVsICAgICAgID0gJCgweDY0LCB7YXJlYTogYSA9PiBhLlVuZGVyZ3JvdW5kQ2hhbm5lbH0pO1xuICByZWFkb25seSBab21iaWVUb3duICAgICAgICAgICAgICAgPSAkKDB4NjUsIHthcmVhOiBhID0+IGEuWm9tYmllVG93bn0pO1xuICAvLyBJTlZBTElEOiAweDY2XG4gIC8vIElOVkFMSUQ6IDB4NjdcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDEgICAgICAgID0gJCgweDY4LCB7YXJlYTogYSA9PiBhLkV2aWxTcGlyaXRJc2xhbmRFbnRyYW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDIgICAgICAgID0gJCgweDY5LCB7YXJlYTogYSA9PiBhLkV2aWxTcGlyaXRJc2xhbmR9KTtcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDMgICAgICAgID0gJCgweDZhKTtcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDQgICAgICAgID0gJCgweDZiKTtcbiAgcmVhZG9ubHkgU2FiZXJhUGFsYWNlMSAgICAgICAgICAgID0gJCgweDZjLCB7YXJlYTogYSA9PiBhLlNhYmVyYUZvcnRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweGZkfSk7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTIgICAgICAgICAgICA9ICQoMHg2ZCk7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTMgICAgICAgICAgICA9ICQoMHg2ZSwge2Jvc3NTY3JlZW46IDB4ZmR9KTtcbiAgLy8gSU5WQUxJRDogMHg2ZiAtLSBTYWJlcmEgUGFsYWNlIDMgdW51c2VkIGNvcHlcbiAgcmVhZG9ubHkgSm9lbFNlY3JldFBhc3NhZ2UgICAgICAgID0gJCgweDcwLCB7YXJlYTogYSA9PiBhLkpvZWxQYXNzYWdlfSk7XG4gIHJlYWRvbmx5IEpvZWwgICAgICAgICAgICAgICAgICAgICA9ICQoMHg3MSwge2FyZWE6IGEgPT4gYS5Kb2VsfSk7XG4gIHJlYWRvbmx5IFN3YW4gICAgICAgICAgICAgICAgICAgICA9ICQoMHg3Miwge2FyZWE6IGEgPT4gYS5Td2FuLCBtdXNpYzogMX0pO1xuICByZWFkb25seSBTd2FuR2F0ZSAgICAgICAgICAgICAgICAgPSAkKDB4NzMsIHthcmVhOiBhID0+IGEuU3dhbkdhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAxfSk7XG4gIC8vIElOVkFMSUQ6IDB4NzRcbiAgLy8gSU5WQUxJRDogMHg3NVxuICAvLyBJTlZBTElEOiAweDc2XG4gIC8vIElOVkFMSUQ6IDB4NzdcbiAgcmVhZG9ubHkgR29hVmFsbGV5ICAgICAgICAgICAgICAgID0gJCgweDc4LCB7YXJlYTogYSA9PiBhLkdvYVZhbGxleX0pO1xuICAvLyBJTlZBTElEOiAweDc5XG4gIC8vIElOVkFMSUQ6IDB4N2FcbiAgLy8gSU5WQUxJRDogMHg3YlxuICByZWFkb25seSBNdEh5ZHJhICAgICAgICAgICAgICAgICAgPSAkKDB4N2MsIHthcmVhOiBhID0+IGEuTXRIeWRyYX0pO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUxICAgICAgICAgICAgPSAkKDB4N2QsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX091dHNpZGVTaHlyb24gICAgPSAkKDB4N2UpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUyICAgICAgICAgICAgPSAkKDB4N2YsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUzICAgICAgICAgICAgPSAkKDB4ODAsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU0ICAgICAgICAgICAgPSAkKDB4ODEsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU1ICAgICAgICAgICAgPSAkKDB4ODIsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU2ICAgICAgICAgICAgPSAkKDB4ODMsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU3ICAgICAgICAgICAgPSAkKDB4ODQsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU4ICAgICAgICAgICAgPSAkKDB4ODUsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU5ICAgICAgICAgICAgPSAkKDB4ODYsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUxMCAgICAgICAgICAgPSAkKDB4ODcsIENBVkUpO1xuICByZWFkb25seSBTdHl4MSAgICAgICAgICAgICAgICAgICAgPSAkKDB4ODgsIHthcmVhOiBhID0+IGEuU3R5eH0pO1xuICByZWFkb25seSBTdHl4MiAgICAgICAgICAgICAgICAgICAgPSAkKDB4ODkpO1xuICByZWFkb25seSBTdHl4MyAgICAgICAgICAgICAgICAgICAgPSAkKDB4OGEpO1xuICAvLyBJTlZBTElEOiAweDhiXG4gIHJlYWRvbmx5IFNoeXJvbiAgICAgICAgICAgICAgICAgICA9ICQoMHg4Yywge2FyZWE6IGEgPT4gYS5TaHlyb259KTtcbiAgLy8gSU5WQUxJRDogMHg4ZFxuICByZWFkb25seSBHb2EgICAgICAgICAgICAgICAgICAgICAgPSAkKDB4OGUsIHthcmVhOiBhID0+IGEuR29hfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzQmFzZW1lbnQgICAgICA9ICQoMHg4Ziwge2FyZWE6IGEgPT4gYS5Gb3J0cmVzc0Jhc2VtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBEZXNlcnQxICAgICAgICAgICAgICAgICAgPSAkKDB4OTAsIHthcmVhOiBhID0+IGEuRGVzZXJ0MX0pO1xuICByZWFkb25seSBPYXNpc0NhdmVNYWluICAgICAgICAgICAgPSAkKDB4OTEsIHthcmVhOiBhID0+IGEuT2FzaXNDYXZlfSk7XG4gIHJlYWRvbmx5IERlc2VydENhdmUxICAgICAgICAgICAgICA9ICQoMHg5Miwge2FyZWE6IGEgPT4gYS5EZXNlcnRDYXZlMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgU2FoYXJhICAgICAgICAgICAgICAgICAgID0gJCgweDkzLCB7YXJlYTogYSA9PiBhLlNhaGFyYX0pO1xuICByZWFkb25seSBTYWhhcmFPdXRzaWRlQ2F2ZSAgICAgICAgPSAkKDB4OTQsIHttdXNpYzogMH0pOyAvLyBUT0RPIC0gc2FoYXJhPz8gZ2VuZXJpYz8/XG4gIHJlYWRvbmx5IERlc2VydENhdmUyICAgICAgICAgICAgICA9ICQoMHg5NSwge2FyZWE6IGEgPT4gYS5EZXNlcnRDYXZlMiwgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgU2FoYXJhTWVhZG93ICAgICAgICAgICAgID0gJCgweDk2LCB7YXJlYTogYSA9PiBhLlNhaGFyYU1lYWRvdywgbXVzaWM6IDB9KTtcbiAgLy8gSU5WQUxJRDogMHg5N1xuICByZWFkb25seSBEZXNlcnQyICAgICAgICAgICAgICAgICAgPSAkKDB4OTgsIHthcmVhOiBhID0+IGEuRGVzZXJ0Mn0pO1xuICAvLyBJTlZBTElEOiAweDk5XG4gIC8vIElOVkFMSUQ6IDB4OWFcbiAgLy8gSU5WQUxJRDogMHg5YlxuICByZWFkb25seSBQeXJhbWlkX0VudHJhbmNlICAgICAgICAgPSAkKDB4OWMsIHthcmVhOiBhID0+IGEuUHlyYW1pZH0pO1xuICByZWFkb25seSBQeXJhbWlkX0JyYW5jaCAgICAgICAgICAgPSAkKDB4OWQpO1xuICByZWFkb25seSBQeXJhbWlkX01haW4gICAgICAgICAgICAgPSAkKDB4OWUpO1xuICByZWFkb25seSBQeXJhbWlkX0RyYXlnb24gICAgICAgICAgPSAkKDB4OWYpO1xuICByZWFkb25seSBDcnlwdF9FbnRyYW5jZSAgICAgICAgICAgPSAkKDB4YTAsIHthcmVhOiBhID0+IGEuQ3J5cHR9KTtcbiAgcmVhZG9ubHkgQ3J5cHRfSGFsbDEgICAgICAgICAgICAgID0gJCgweGExKTtcbiAgcmVhZG9ubHkgQ3J5cHRfQnJhbmNoICAgICAgICAgICAgID0gJCgweGEyKTtcbiAgcmVhZG9ubHkgQ3J5cHRfRGVhZEVuZExlZnQgICAgICAgID0gJCgweGEzKTtcbiAgcmVhZG9ubHkgQ3J5cHRfRGVhZEVuZFJpZ2h0ICAgICAgID0gJCgweGE0KTtcbiAgcmVhZG9ubHkgQ3J5cHRfSGFsbDIgICAgICAgICAgICAgID0gJCgweGE1KTtcbiAgcmVhZG9ubHkgQ3J5cHRfRHJheWdvbjIgICAgICAgICAgID0gJCgweGE2KTtcbiAgcmVhZG9ubHkgQ3J5cHRfVGVsZXBvcnRlciAgICAgICAgID0gJCgweGE3LCB7bXVzaWM6ICdDcnlwdC1UZWxlcG9ydGVyJ30pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19FbnRyYW5jZSAgICAgPSAkKDB4YTgsIHthcmVhOiBhID0+IGEuR29hRm9ydHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiBLRUxCRVNRVUUubXVzaWN9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2VsYmVzcXVlICAgID0gJCgweGE5LCB7Ym9zc1NjcmVlbjogMHg3MyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uS0VMQkVTUVVFfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX1plYnUgICAgICAgICA9ICQoMHhhYSwgey4uLktFTEJFU1FVRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZTogU0FCRVJBLnBhbGV0dGV9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfU2FiZXJhICAgICAgID0gJCgweGFiLCBTQUJFUkEpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19Ub3JuZWwgICAgICAgPSAkKDB4YWMsIHtib3NzU2NyZWVuOiAweDkxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5TQUJFUkEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhbGV0dGU6IE1BRE9fTE9XRVIucGFsZXR0ZX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMSAgICAgICAgPSAkKDB4YWQsIE1BRE9fTE9XRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMiAgICAgICAgPSAkKDB4YWUsIE1BRE9fVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMyAgICAgICAgPSAkKDB4YWYsIE1BRE9fVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMSAgICAgPSAkKDB4YjAsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMiAgICAgPSAkKDB4YjEsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMyAgICAgPSAkKDB4YjIsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNCAgICAgPSAkKDB4YjMsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNSAgICAgPSAkKDB4YjQsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNiAgICAgPSAkKDB4YjUsIEtBUk1JTkVfTE9XRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNyAgICAgPSAkKDB4YjYsIHtib3NzU2NyZWVuOiAweGZkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5LQVJNSU5FX0xPV0VSfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0V4aXQgICAgICAgICA9ICQoMHhiNywge211c2ljOiBLQVJNSU5FX1VQUEVSLm11c2ljfSk7XG4gIHJlYWRvbmx5IE9hc2lzQ2F2ZV9FbnRyYW5jZSAgICAgICA9ICQoMHhiOCwge2FyZWE6IGEgPT4gYS5PYXNpc0VudHJhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMn0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19Bc2luYSAgICAgICAgPSAkKDB4YjksIHthcmVhOiBhID0+IGEuR29hRm9ydHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLk1BRE9fVVBQRVIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4OTF9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2Vuc3UgICAgICAgID0gJCgweGJhLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hX0hvdXNlICAgICAgICAgICAgICAgID0gJCgweGJiLCB7YXJlYTogYSA9PiBhLkdvYSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgR29hX0lubiAgICAgICAgICAgICAgICAgID0gJCgweGJjLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4YmRcbiAgcmVhZG9ubHkgR29hX1Rvb2xTaG9wICAgICAgICAgICAgID0gJCgweGJlLCBIT1VTRSk7XG4gIHJlYWRvbmx5IEdvYV9UYXZlcm4gICAgICAgICAgICAgICA9ICQoMHhiZiwgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX0VsZGVySG91c2UgICAgICAgICAgPSAkKDB4YzAsIHthcmVhOiBhID0+IGEuTGVhZiwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgTGVhZl9SYWJiaXRIdXQgICAgICAgICAgID0gJCgweGMxLCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfSW5uICAgICAgICAgICAgICAgICA9ICQoMHhjMiwgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX1Rvb2xTaG9wICAgICAgICAgICAgPSAkKDB4YzMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9Bcm1vclNob3AgICAgICAgICAgID0gJCgweGM0LCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfU3R1ZGVudEhvdXNlICAgICAgICA9ICQoMHhjNSwgSE9VU0UpO1xuICByZWFkb25seSBCcnlubWFlcl9UYXZlcm4gICAgICAgICAgPSAkKDB4YzYsIHthcmVhOiBhID0+IGEuQnJ5bm1hZXIsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX1Bhd25TaG9wICAgICAgICA9ICQoMHhjNywgSE9VU0UpO1xuICByZWFkb25seSBCcnlubWFlcl9Jbm4gICAgICAgICAgICAgPSAkKDB4YzgsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfQXJtb3JTaG9wICAgICAgID0gJCgweGM5LCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4Y2FcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfSXRlbVNob3AgICAgICAgID0gJCgweGNiLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4Y2NcbiAgcmVhZG9ubHkgT2FrX0VsZGVySG91c2UgICAgICAgICAgID0gJCgweGNkLCB7YXJlYTogYSA9PiBhLk9haywgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgT2FrX01vdGhlckhvdXNlICAgICAgICAgID0gJCgweGNlLCBIT1VTRSk7XG4gIHJlYWRvbmx5IE9ha19Ub29sU2hvcCAgICAgICAgICAgICA9ICQoMHhjZiwgSE9VU0UpO1xuICByZWFkb25seSBPYWtfSW5uICAgICAgICAgICAgICAgICAgPSAkKDB4ZDAsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfSW5uICAgICAgICAgICAgID0gJCgweGQxLCB7YXJlYTogYSA9PiBhLkFtYXpvbmVzLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBBbWF6b25lc19JdGVtU2hvcCAgICAgICAgPSAkKDB4ZDIsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfQXJtb3JTaG9wICAgICAgID0gJCgweGQzLCBIT1VTRSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0VsZGVyICAgICAgICAgICA9ICQoMHhkNCwgSE9VU0UpO1xuICByZWFkb25seSBOYWRhcmUgICAgICAgICAgICAgICAgICAgPSAkKDB4ZDUsIHthcmVhOiBhID0+IGEuTmFkYXJlfSk7IC8vIGVkZ2UtZG9vcj9cbiAgcmVhZG9ubHkgUG9ydG9hX0Zpc2hlcm1hbkhvdXNlICAgID0gJCgweGQ2LCB7YXJlYTogYSA9PiBhLkZpc2hlcm1hbkhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRSwgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX1BhbGFjZUVudHJhbmNlICAgID0gJCgweGQ3LCB7YXJlYTogYSA9PiBhLlBvcnRvYVBhbGFjZX0pO1xuICByZWFkb25seSBQb3J0b2FfRm9ydHVuZVRlbGxlciAgICAgPSAkKDB4ZDgsIHthcmVhOiBhID0+IGEuUG9ydG9hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5GT1JUVU5FX1RFTExFUn0pO1xuICByZWFkb25seSBQb3J0b2FfUGF3blNob3AgICAgICAgICAgPSAkKDB4ZDksIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hX0FybW9yU2hvcCAgICAgICAgID0gJCgweGRhLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4ZGJcbiAgcmVhZG9ubHkgUG9ydG9hX0lubiAgICAgICAgICAgICAgID0gJCgweGRjLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhkZCwgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfTGVmdCAgICAgICAgPSAkKDB4ZGUsIHthcmVhOiBhID0+IGEuUG9ydG9hUGFsYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRX0pO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfVGhyb25lUm9vbSAgPSAkKDB4ZGYsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hUGFsYWNlX1JpZ2h0ICAgICAgID0gJCgweGUwLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Bc2luYVJvb20gICAgICAgICA9ICQoMHhlMSwge2FyZWE6IGEgPT4gYS5VbmRlcmdyb3VuZENoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFLCBtdXNpYzogJ2FzaW5hJ30pO1xuICByZWFkb25seSBBbWF6b25lc19FbGRlckRvd25zdGFpcnMgPSAkKDB4ZTIsIHthcmVhOiBhID0+IGEuQW1hem9uZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEpvZWxfRWxkZXJIb3VzZSAgICAgICAgICA9ICQoMHhlMywge2FyZWE6IGEgPT4gYS5Kb2VsLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBKb2VsX1NoZWQgICAgICAgICAgICAgICAgPSAkKDB4ZTQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgSm9lbF9Ub29sU2hvcCAgICAgICAgICAgID0gJCgweGU1LCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4ZTZcbiAgcmVhZG9ubHkgSm9lbF9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGU3LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd25fSG91c2UgICAgICAgICA9ICQoMHhlOCwge2FyZWE6IGEgPT4gYS5ab21iaWVUb3duLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRX0pO1xuICByZWFkb25seSBab21iaWVUb3duX0hvdXNlQmFzZW1lbnQgPSAkKDB4ZTksIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhlYVxuICByZWFkb25seSBTd2FuX1Rvb2xTaG9wICAgICAgICAgICAgPSAkKDB4ZWIsIHthcmVhOiBhID0+IGEuU3dhbiwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgU3dhbl9TdG9tSHV0ICAgICAgICAgICAgID0gJCgweGVjLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fSW5uICAgICAgICAgICAgICAgICA9ICQoMHhlZCwgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX0FybW9yU2hvcCAgICAgICAgICAgPSAkKDB4ZWUsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9UYXZlcm4gICAgICAgICAgICAgID0gJCgweGVmLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fUGF3blNob3AgICAgICAgICAgICA9ICQoMHhmMCwgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX0RhbmNlSGFsbCAgICAgICAgICAgPSAkKDB4ZjEsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2h5cm9uX1RlbXBsZSAgICAgICAgICAgID0gJCgweGYyLCB7YXJlYTogYSA9PiBhLlNoeXJvblRlbXBsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHg3MH0pO1xuICByZWFkb25seSBTaHlyb25fVHJhaW5pbmdIYWxsICAgICAgPSAkKDB4ZjMsIHthcmVhOiBhID0+IGEuU2h5cm9uLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBTaHlyb25fSG9zcGl0YWwgICAgICAgICAgPSAkKDB4ZjQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2h5cm9uX0FybW9yU2hvcCAgICAgICAgID0gJCgweGY1LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhmNiwgSE9VU0UpO1xuICByZWFkb25seSBTaHlyb25fSW5uICAgICAgICAgICAgICAgPSAkKDB4ZjcsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2FoYXJhX0lubiAgICAgICAgICAgICAgID0gJCgweGY4LCB7YXJlYTogYSA9PiBhLlNhaGFyYSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgU2FoYXJhX1Rvb2xTaG9wICAgICAgICAgID0gJCgweGY5LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9FbGRlckhvdXNlICAgICAgICA9ICQoMHhmYSwgSE9VU0UpO1xuICByZWFkb25seSBTYWhhcmFfUGF3blNob3AgICAgICAgICAgPSAkKDB4ZmIsIEhPVVNFKTtcblxuICAvLyBOZXcgbG9jYXRpb25zLCBubyBJRCBwcm9jdXJlZCB5ZXQuXG4gIHJlYWRvbmx5IEVhc3RDYXZlMSAgICAgID0gJCgtMSwge2FyZWE6IGEgPT4gYS5FYXN0Q2F2ZX0pO1xuICByZWFkb25seSBFYXN0Q2F2ZTIgICAgICA9ICQoLTEpO1xuICByZWFkb25seSBFYXN0Q2F2ZTMgICAgICA9ICQoLTEpO1xuICByZWFkb25seSBGaXNoZXJtYW5CZWFjaCA9ICQoLTEsIHthcmVhOiBhID0+IGEuRmlzaGVybWFuSG91c2UsIC4uLkhPVVNFfSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICBzdXBlcigweDEwMCk7XG4gICAgJC5jb21taXQodGhpcyk7XG4gICAgLy8gRmlsbCBpbiBhbnkgbWlzc2luZyBvbmVzXG4gICAgZm9yIChsZXQgaWQgPSAwOyBpZCA8IDB4MTAwOyBpZCsrKSB7XG4gICAgICBpZiAodGhpc1tpZF0pIGNvbnRpbnVlO1xuICAgICAgdGhpc1tpZF0gPSBuZXcgTG9jYXRpb24ocm9tLCBpZCwge1xuICAgICAgICBhcmVhOiByb20uYXJlYXMuRW1wdHksXG4gICAgICAgIG5hbWU6ICcnLFxuICAgICAgICBtdXNpYzogJycsXG4gICAgICAgIHBhbGV0dGU6ICcnLFxuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIFRPRE8gLSBtZXRob2QgdG8gYWRkIGFuIHVucmVnaXN0ZXJlZCBsb2NhdGlvbiB0byBhbiBlbXB0eSBpbmRleC5cbiAgfVxuXG4gIGFsbG9jYXRlKGxvY2F0aW9uOiBMb2NhdGlvbik6IExvY2F0aW9uIHtcbiAgICAvLyBwaWNrIGFuIHVudXNlZCBsb2NhdGlvblxuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzKSB7XG4gICAgICBpZiAobC51c2VkKSBjb250aW51ZTtcbiAgICAgIChsb2NhdGlvbiBhcyBhbnkpLmlkID0gbC5pZDtcbiAgICAgIGxvY2F0aW9uLnVzZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXNbbC5pZF0gPSBsb2NhdGlvbjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyB1bnVzZWQgbG9jYXRpb24nKTtcbiAgfVxuXG4gIC8vIC8vIEZpbmQgYWxsIGdyb3VwcyBvZiBuZWlnaGJvcmluZyBsb2NhdGlvbnMgd2l0aCBtYXRjaGluZyBwcm9wZXJ0aWVzLlxuICAvLyAvLyBUT0RPIC0gb3B0aW9uYWwgYXJnOiBjaGVjayBhZGphY2VudCAjIElEcy4uLj9cbiAgLy8gcGFydGl0aW9uPFQ+KGZ1bmM6IChsb2M6IExvY2F0aW9uKSA9PiBULCBlcTogRXE8VD4gPSAoYSwgYikgPT4gYSA9PT0gYiwgam9pbk5leHVzZXMgPSBmYWxzZSk6IFtMb2NhdGlvbltdLCBUXVtdIHtcbiAgLy8gICBjb25zdCBzZWVuID0gbmV3IFNldDxMb2NhdGlvbj4oKTtcbiAgLy8gICBjb25zdCBvdXQ6IFtMb2NhdGlvbltdLCBUXVtdID0gW107XG4gIC8vICAgZm9yIChsZXQgbG9jIG9mIHRoaXMpIHtcbiAgLy8gICAgIGlmIChzZWVuLmhhcyhsb2MpIHx8ICFsb2MudXNlZCkgY29udGludWU7XG4gIC8vICAgICBzZWVuLmFkZChsb2MpO1xuICAvLyAgICAgY29uc3QgdmFsdWUgPSBmdW5jKGxvYyk7XG4gIC8vICAgICBjb25zdCBncm91cCA9IFtdO1xuICAvLyAgICAgY29uc3QgcXVldWUgPSBbbG9jXTtcbiAgLy8gICAgIHdoaWxlIChxdWV1ZS5sZW5ndGgpIHtcbiAgLy8gICAgICAgY29uc3QgbmV4dCA9IHF1ZXVlLnBvcCgpITtcbiAgLy8gICAgICAgZ3JvdXAucHVzaChuZXh0KTtcbiAgLy8gICAgICAgZm9yIChjb25zdCBuIG9mIG5leHQubmVpZ2hib3JzKGpvaW5OZXh1c2VzKSkge1xuICAvLyAgICAgICAgIGlmICghc2Vlbi5oYXMobikgJiYgZXEoZnVuYyhuKSwgdmFsdWUpKSB7XG4gIC8vICAgICAgICAgICBzZWVuLmFkZChuKTtcbiAgLy8gICAgICAgICAgIHF1ZXVlLnB1c2gobik7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgICBvdXQucHVzaChbWy4uLmdyb3VwXSwgdmFsdWVdKTtcbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIG91dDtcbiAgLy8gfVxufVxuXG4vLyBMb2NhdGlvbiBlbnRpdGllc1xuZXhwb3J0IGNsYXNzIExvY2F0aW9uIGV4dGVuZHMgRW50aXR5IHtcblxuICB1c2VkOiBib29sZWFuO1xuXG4gIGJnbTogbnVtYmVyO1xuICBsYXlvdXRXaWR0aDogbnVtYmVyO1xuICBsYXlvdXRIZWlnaHQ6IG51bWJlcjtcbiAgYW5pbWF0aW9uOiBudW1iZXI7XG4gIGV4dGVuZGVkOiBudW1iZXI7XG4gIHNjcmVlbnM6IG51bWJlcltdW107XG5cbiAgdGlsZVBhdHRlcm5zOiBbbnVtYmVyLCBudW1iZXJdO1xuICB0aWxlUGFsZXR0ZXM6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgdGlsZXNldDogbnVtYmVyO1xuICB0aWxlRWZmZWN0czogbnVtYmVyO1xuXG4gIGVudHJhbmNlczogRW50cmFuY2VbXTtcbiAgZXhpdHM6IEV4aXRbXTtcbiAgZmxhZ3M6IEZsYWdbXTtcbiAgcGl0czogUGl0W107XG5cbiAgc3ByaXRlUGFsZXR0ZXM6IFtudW1iZXIsIG51bWJlcl07XG4gIHNwcml0ZVBhdHRlcm5zOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzcGF3bnM6IFNwYXduW107XG5cbiAgY29uc3RydWN0b3Iocm9tOiBSb20sIGlkOiBudW1iZXIsIHJlYWRvbmx5IGRhdGE6IExvY2F0aW9uRGF0YSkge1xuICAgIC8vIHdpbGwgaW5jbHVkZSBib3RoIE1hcERhdGEgKmFuZCogTnBjRGF0YSwgc2luY2UgdGhleSBzaGFyZSBhIGtleS5cbiAgICBzdXBlcihyb20sIGlkKTtcblxuICAgIGNvbnN0IG1hcERhdGFCYXNlID1cbiAgICAgICAgaWQgPj0gMCA/IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhUG9pbnRlcikgKyAweGMwMDAgOiAwO1xuICAgIC8vIFRPRE8gLSBwYXNzIHRoaXMgaW4gYW5kIG1vdmUgTE9DQVRJT05TIHRvIGxvY2F0aW9ucy50c1xuICAgIHRoaXMudXNlZCA9IG1hcERhdGFCYXNlID4gMHhjMDAwICYmICEhdGhpcy5uYW1lO1xuXG4gICAgaWYgKCF0aGlzLnVzZWQpIHtcbiAgICAgIHRoaXMuYmdtID0gMDtcbiAgICAgIHRoaXMubGF5b3V0V2lkdGggPSAwO1xuICAgICAgdGhpcy5sYXlvdXRIZWlnaHQgPSAwO1xuICAgICAgdGhpcy5hbmltYXRpb24gPSAwO1xuICAgICAgdGhpcy5leHRlbmRlZCA9IDA7XG4gICAgICB0aGlzLnNjcmVlbnMgPSBbWzBdXTtcbiAgICAgIHRoaXMudGlsZVBhbGV0dGVzID0gWzB4MjQsIDB4MDEsIDB4MjZdO1xuICAgICAgdGhpcy50aWxlc2V0ID0gMHg4MDtcbiAgICAgIHRoaXMudGlsZUVmZmVjdHMgPSAweGIzO1xuICAgICAgdGhpcy50aWxlUGF0dGVybnMgPSBbMiwgNF07XG4gICAgICB0aGlzLmV4aXRzID0gW107XG4gICAgICB0aGlzLmVudHJhbmNlcyA9IFtdO1xuICAgICAgdGhpcy5mbGFncyA9IFtdO1xuICAgICAgdGhpcy5waXRzID0gW107XG4gICAgICB0aGlzLnNwYXducyA9IFtdO1xuICAgICAgdGhpcy5zcHJpdGVQYWxldHRlcyA9IFswLCAwXTtcbiAgICAgIHRoaXMuc3ByaXRlUGF0dGVybnMgPSBbMCwgMF07XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbGF5b3V0QmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UpICsgMHhjMDAwO1xuICAgIGNvbnN0IGdyYXBoaWNzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyAyKSArIDB4YzAwMDtcbiAgICBjb25zdCBlbnRyYW5jZXNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDQpICsgMHhjMDAwO1xuICAgIGNvbnN0IGV4aXRzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyA2KSArIDB4YzAwMDtcbiAgICBjb25zdCBmbGFnc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgOCkgKyAweGMwMDA7XG5cbiAgICAvLyBSZWFkIHRoZSBleGl0cyBmaXJzdCBzbyB0aGF0IHdlIGNhbiBkZXRlcm1pbmUgaWYgdGhlcmUncyBlbnRyYW5jZS9waXRzXG4gICAgLy8gbWV0YWRhdGEgZW5jb2RlZCBhdCB0aGUgZW5kLlxuICAgIGxldCBoYXNQaXRzID0gdGhpcy51c2VkICYmIGxheW91dEJhc2UgIT09IG1hcERhdGFCYXNlICsgMTA7XG4gICAgbGV0IGVudHJhbmNlTGVuID0gZXhpdHNCYXNlIC0gZW50cmFuY2VzQmFzZTtcbiAgICB0aGlzLmV4aXRzID0gKCgpID0+IHtcbiAgICAgIGNvbnN0IGV4aXRzID0gW107XG4gICAgICBsZXQgaSA9IGV4aXRzQmFzZTtcbiAgICAgIHdoaWxlICghKHJvbS5wcmdbaV0gJiAweDgwKSkge1xuICAgICAgICAvLyBOT1RFOiBzZXQgZGVzdCB0byBGRiB0byBkaXNhYmxlIGFuIGV4aXQgKGl0J3MgYW4gaW52YWxpZCBsb2NhdGlvbiBhbnl3YXkpXG4gICAgICAgIGlmIChyb20ucHJnW2kgKyAyXSAhPSAweGZmKSB7XG4gICAgICAgICAgZXhpdHMucHVzaChFeGl0LmZyb20ocm9tLnByZywgaSkpO1xuICAgICAgICB9XG4gICAgICAgIGkgKz0gNDtcbiAgICAgIH1cbiAgICAgIGlmIChyb20ucHJnW2ldICE9PSAweGZmKSB7XG4gICAgICAgIGhhc1BpdHMgPSAhIShyb20ucHJnW2ldICYgMHg0MCk7XG4gICAgICAgIGVudHJhbmNlTGVuID0gKHJvbS5wcmdbaV0gJiAweDFmKSA8PCAyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGV4aXRzO1xuICAgIH0pKCk7XG5cbiAgICAvLyBUT0RPIC0gdGhlc2UgaGV1cmlzdGljcyB3aWxsIG5vdCB3b3JrIHRvIHJlLXJlYWQgdGhlIGxvY2F0aW9ucy5cbiAgICAvLyAgICAgIC0gd2UgY2FuIGxvb2sgYXQgdGhlIG9yZGVyOiBpZiB0aGUgZGF0YSBpcyBCRUZPUkUgdGhlIHBvaW50ZXJzXG4gICAgLy8gICAgICAgIHRoZW4gd2UncmUgaW4gYSByZXdyaXR0ZW4gc3RhdGU7IGluIHRoYXQgY2FzZSwgd2UgbmVlZCB0byBzaW1wbHlcbiAgICAvLyAgICAgICAgZmluZCBhbGwgcmVmcyBhbmQgbWF4Li4uP1xuICAgIC8vICAgICAgLSBjYW4gd2UgcmVhZCB0aGVzZSBwYXJ0cyBsYXppbHk/XG4gICAgY29uc3QgcGl0c0Jhc2UgPVxuICAgICAgICAhaGFzUGl0cyA/IDAgOiByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgMTApICsgMHhjMDAwO1xuXG4gICAgdGhpcy5iZ20gPSByb20ucHJnW2xheW91dEJhc2VdO1xuICAgIHRoaXMubGF5b3V0V2lkdGggPSByb20ucHJnW2xheW91dEJhc2UgKyAxXTtcbiAgICB0aGlzLmxheW91dEhlaWdodCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDJdO1xuICAgIHRoaXMuYW5pbWF0aW9uID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgM107XG4gICAgdGhpcy5leHRlbmRlZCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDRdO1xuICAgIHRoaXMuc2NyZWVucyA9IHNlcShcbiAgICAgICAgdGhpcy5oZWlnaHQsXG4gICAgICAgIHkgPT4gdHVwbGUocm9tLnByZywgbGF5b3V0QmFzZSArIDUgKyB5ICogdGhpcy53aWR0aCwgdGhpcy53aWR0aCkpO1xuICAgIHRoaXMudGlsZVBhbGV0dGVzID0gdHVwbGU8bnVtYmVyPihyb20ucHJnLCBncmFwaGljc0Jhc2UsIDMpO1xuICAgIHRoaXMudGlsZXNldCA9IHJvbS5wcmdbZ3JhcGhpY3NCYXNlICsgM107XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHJvbS5wcmdbZ3JhcGhpY3NCYXNlICsgNF07XG4gICAgdGhpcy50aWxlUGF0dGVybnMgPSB0dXBsZShyb20ucHJnLCBncmFwaGljc0Jhc2UgKyA1LCAyKTtcblxuICAgIHRoaXMuZW50cmFuY2VzID1cbiAgICAgIGdyb3VwKDQsIHJvbS5wcmcuc2xpY2UoZW50cmFuY2VzQmFzZSwgZW50cmFuY2VzQmFzZSArIGVudHJhbmNlTGVuKSxcbiAgICAgICAgICAgIHggPT4gRW50cmFuY2UuZnJvbSh4KSk7XG4gICAgdGhpcy5mbGFncyA9IHZhclNsaWNlKHJvbS5wcmcsIGZsYWdzQmFzZSwgMiwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gRmxhZy5mcm9tKHgpKTtcbiAgICB0aGlzLnBpdHMgPSBwaXRzQmFzZSA/IHZhclNsaWNlKHJvbS5wcmcsIHBpdHNCYXNlLCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gUGl0LmZyb20oeCkpIDogW107XG5cbiAgICBjb25zdCBucGNEYXRhQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5ucGNEYXRhUG9pbnRlcikgKyAweDEwMDAwO1xuICAgIGNvbnN0IGhhc1NwYXducyA9IG5wY0RhdGFCYXNlICE9PSAweDEwMDAwO1xuICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXMgPVxuICAgICAgICBoYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCBucGNEYXRhQmFzZSArIDEsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3ByaXRlUGF0dGVybnMgPVxuICAgICAgICBoYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCBucGNEYXRhQmFzZSArIDMsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3Bhd25zID1cbiAgICAgICAgaGFzU3Bhd25zID8gdmFyU2xpY2Uocm9tLnByZywgbnBjRGF0YUJhc2UgKyA1LCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBTcGF3bi5mcm9tKHgpKSA6IFtdO1xuICB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLm5hbWU7XG4gIH1cblxuICBnZXQgbWFwRGF0YVBvaW50ZXIoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5pZCA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gbWFwZGF0YSBwb2ludGVyIGZvciAke3RoaXMubmFtZX1gKTtcbiAgICByZXR1cm4gMHgxNDMwMCArICh0aGlzLmlkIDw8IDEpO1xuICB9XG5cbiAgZ2V0IG5wY0RhdGFQb2ludGVyKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuaWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG5wY2RhdGEgcG9pbnRlciBmb3IgJHt0aGlzLm5hbWV9YCk7XG4gICAgcmV0dXJuIDB4MTkyMDEgKyAodGhpcy5pZCA8PCAxKTtcbiAgfVxuXG4gIGdldCBoYXNTcGF3bnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3Bhd25zLmxlbmd0aCA+IDA7XG4gIH1cblxuICAvLyBPZmZzZXQgdG8gT1Igd2l0aCBzY3JlZW4gSURzLlxuICBnZXQgc2NyZWVuUGFnZSgpOiBudW1iZXIge1xuICAgIGlmICghdGhpcy5yb20uY29tcHJlc3NlZE1hcERhdGEpIHJldHVybiB0aGlzLmV4dGVuZGVkID8gMHgxMDAgOiAwO1xuICAgIHJldHVybiB0aGlzLmV4dGVuZGVkIDw8IDg7XG4gIH1cblxuICBpc1Nob3AoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucm9tLnNob3BzLmZpbmRJbmRleChzID0+IHMubG9jYXRpb24gPT09IHRoaXMuaWQpID49IDA7XG4gIH1cblxuICBzcGF3bihpZDogbnVtYmVyKTogU3Bhd24ge1xuICAgIGNvbnN0IHNwYXduID0gdGhpcy5zcGF3bnNbaWQgLSAweGRdO1xuICAgIGlmICghc3Bhd24pIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgc3Bhd24gJCR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gc3Bhd247XG4gIH1cblxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubGF5b3V0V2lkdGggKyAxOyB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7IHRoaXMubGF5b3V0V2lkdGggPSB3aWR0aCAtIDE7IH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7IHJldHVybiB0aGlzLmxheW91dEhlaWdodCArIDE7IH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlcikgeyB0aGlzLmxheW91dEhlaWdodCA9IGhlaWdodCAtIDE7IH1cblxuICAvLyBtb25zdGVycygpIHtcbiAgLy8gICBpZiAoIXRoaXMuc3Bhd25zKSByZXR1cm4gW107XG4gIC8vICAgcmV0dXJuIHRoaXMuc3Bhd25zLmZsYXRNYXAoXG4gIC8vICAgICAoWywsIHR5cGUsIGlkXSwgc2xvdCkgPT5cbiAgLy8gICAgICAgdHlwZSAmIDcgfHwgIXRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdID8gW10gOiBbXG4gIC8vICAgICAgICAgW3RoaXMuaWQsXG4gIC8vICAgICAgICAgIHNsb3QgKyAweDBkLFxuICAvLyAgICAgICAgICB0eXBlICYgMHg4MCA/IDEgOiAwLFxuICAvLyAgICAgICAgICBpZCArIDB4NTAsXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGF0dGVybnNbdHlwZSAmIDB4ODAgPyAxIDogMF0sXG4gIC8vICAgICAgICAgIHRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdLnBhbGV0dGVzKClbMF0sXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXNbdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSAtIDJdLFxuICAvLyAgICAgICAgIF1dKTtcbiAgLy8gfVxuXG4gIGFzeW5jIHdyaXRlKHdyaXRlcjogV3JpdGVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnVzZWQpIHJldHVybjtcbiAgICBjb25zdCBwcm9taXNlcyA9IFtdO1xuICAgIGlmICghdGhpcy5zcGF3bnMubGVuZ3RoKSB7XG4gICAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID0gWzB4ZmYsIDB4ZmZdO1xuICAgICAgdGhpcy5zcHJpdGVQYXR0ZXJucyA9IFsweGZmLCAweGZmXTtcbiAgICB9XG4gICAgLy8gd3JpdGUgTlBDIGRhdGEgZmlyc3QsIGlmIHByZXNlbnQuLi5cbiAgICBjb25zdCBkYXRhID0gWzAsIC4uLnRoaXMuc3ByaXRlUGFsZXR0ZXMsIC4uLnRoaXMuc3ByaXRlUGF0dGVybnMsXG4gICAgICAgICAgICAgICAgICAuLi5jb25jYXRJdGVyYWJsZXModGhpcy5zcGF3bnMpLCAweGZmXTtcbiAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgICB3cml0ZXIud3JpdGUoZGF0YSwgMHgxODAwMCwgMHgxYmZmZiwgYE5wY0RhdGEgJHtoZXgodGhpcy5pZCl9YClcbiAgICAgICAgICAgIC50aGVuKGFkZHJlc3MgPT4gd3JpdGVMaXR0bGVFbmRpYW4oXG4gICAgICAgICAgICAgICAgd3JpdGVyLnJvbSwgdGhpcy5ucGNEYXRhUG9pbnRlciwgYWRkcmVzcyAtIDB4MTAwMDApKSk7XG4gICAgY29uc3Qgd3JpdGUgPSAoZGF0YTogRGF0YTxudW1iZXI+LCBuYW1lOiBzdHJpbmcpID0+XG4gICAgICAgIHdyaXRlci53cml0ZShkYXRhLCAweDE0MDAwLCAweDE3ZmZmLCBgJHtuYW1lfSAke2hleCh0aGlzLmlkKX1gKTtcbiAgICBjb25zdCBsYXlvdXQgPSB0aGlzLnJvbS5jb21wcmVzc2VkTWFwRGF0YSA/IFtcbiAgICAgIHRoaXMuYmdtLFxuICAgICAgLy8gQ29tcHJlc3NlZCB2ZXJzaW9uOiB5eCBpbiBvbmUgYnl0ZSwgZXh0K2FuaW0gaW4gb25lIGJ5dGVcbiAgICAgIHRoaXMubGF5b3V0SGVpZ2h0IDw8IDQgfCB0aGlzLmxheW91dFdpZHRoLFxuICAgICAgdGhpcy5leHRlbmRlZCA8PCAyIHwgdGhpcy5hbmltYXRpb24sXG4gICAgICAuLi5jb25jYXRJdGVyYWJsZXModGhpcy5zY3JlZW5zKSxcbiAgICBdIDogW1xuICAgICAgdGhpcy5iZ20sXG4gICAgICB0aGlzLmxheW91dFdpZHRoLCB0aGlzLmxheW91dEhlaWdodCwgdGhpcy5hbmltYXRpb24sIHRoaXMuZXh0ZW5kZWQsXG4gICAgICAuLi5jb25jYXRJdGVyYWJsZXModGhpcy5zY3JlZW5zKSxcbiAgICBdO1xuICAgIGNvbnN0IGdyYXBoaWNzID1cbiAgICAgICAgWy4uLnRoaXMudGlsZVBhbGV0dGVzLFxuICAgICAgICAgdGhpcy50aWxlc2V0LCB0aGlzLnRpbGVFZmZlY3RzLFxuICAgICAgICAgLi4udGhpcy50aWxlUGF0dGVybnNdO1xuICAgIC8vIFF1aWNrIHNhbml0eSBjaGVjazogaWYgYW4gZW50cmFuY2UvZXhpdCBpcyBiZWxvdyB0aGUgSFVEIG9uIGFcbiAgICAvLyBub24tdmVydGljYWxseSBzY3JvbGxpbmcgbWFwLCB0aGVuIHdlIG5lZWQgdG8gbW92ZSBpdCB1cC5cbiAgICBpZiAodGhpcy5oZWlnaHQgPT09IDEpIHtcbiAgICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgICAgaWYgKCFlbnRyYW5jZS51c2VkKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGVudHJhbmNlLnkgPiAweGJmKSBlbnRyYW5jZS55ID0gMHhiZjtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICAgIGlmIChleGl0Lnl0ID4gMHgwYykgZXhpdC55dCA9IDB4MGM7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGVudHJhbmNlcyA9IGNvbmNhdEl0ZXJhYmxlcyh0aGlzLmVudHJhbmNlcyk7XG4gICAgY29uc3QgZXhpdHMgPSBbLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZXhpdHMpLFxuICAgICAgICAgICAgICAgICAgIDB4ODAgfCAodGhpcy5waXRzLmxlbmd0aCA/IDB4NDAgOiAwKSB8IHRoaXMuZW50cmFuY2VzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgIF07XG4gICAgY29uc3QgZmxhZ3MgPSBbLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZmxhZ3MpLCAweGZmXTtcbiAgICBjb25zdCBwaXRzID0gY29uY2F0SXRlcmFibGVzKHRoaXMucGl0cyk7XG4gICAgY29uc3QgW2xheW91dEFkZHIsIGdyYXBoaWNzQWRkciwgZW50cmFuY2VzQWRkciwgZXhpdHNBZGRyLCBmbGFnc0FkZHIsIHBpdHNBZGRyXSA9XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICB3cml0ZShsYXlvdXQsICdMYXlvdXQnKSxcbiAgICAgICAgICB3cml0ZShncmFwaGljcywgJ0dyYXBoaWNzJyksXG4gICAgICAgICAgd3JpdGUoZW50cmFuY2VzLCAnRW50cmFuY2VzJyksXG4gICAgICAgICAgd3JpdGUoZXhpdHMsICdFeGl0cycpLFxuICAgICAgICAgIHdyaXRlKGZsYWdzLCAnRmxhZ3MnKSxcbiAgICAgICAgICAuLi4ocGl0cy5sZW5ndGggPyBbd3JpdGUocGl0cywgJ1BpdHMnKV0gOiBbXSksXG4gICAgICAgIF0pO1xuICAgIGNvbnN0IGFkZHJlc3NlcyA9IFtcbiAgICAgIGxheW91dEFkZHIgJiAweGZmLCAobGF5b3V0QWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZ3JhcGhpY3NBZGRyICYgMHhmZiwgKGdyYXBoaWNzQWRkciA+Pj4gOCkgLSAweGMwLFxuICAgICAgZW50cmFuY2VzQWRkciAmIDB4ZmYsIChlbnRyYW5jZXNBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICBleGl0c0FkZHIgJiAweGZmLCAoZXhpdHNBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICBmbGFnc0FkZHIgJiAweGZmLCAoZmxhZ3NBZGRyID4+PiA4KSAtIDB4YzAsXG4gICAgICAuLi4ocGl0c0FkZHIgPyBbcGl0c0FkZHIgJiAweGZmLCAocGl0c0FkZHIgPj4gOCkgLSAweGMwXSA6IFtdKSxcbiAgICBdO1xuICAgIGNvbnN0IGJhc2UgPSBhd2FpdCB3cml0ZShhZGRyZXNzZXMsICdNYXBEYXRhJyk7XG4gICAgd3JpdGVMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgdGhpcy5tYXBEYXRhUG9pbnRlciwgYmFzZSAtIDB4YzAwMCk7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgLy8gSWYgdGhpcyBpcyBhIGJvc3Mgcm9vbSwgd3JpdGUgdGhlIHJlc3RvcmF0aW9uLlxuICAgIGNvbnN0IGJvc3NJZCA9IHRoaXMuYm9zc0lkKCk7XG4gICAgaWYgKGJvc3NJZCAhPSBudWxsICYmIHRoaXMuaWQgIT09IDB4NWYpIHsgLy8gZG9uJ3QgcmVzdG9yZSBkeW5hXG4gICAgICAvLyBUaGlzIHRhYmxlIHNob3VsZCByZXN0b3JlIHBhdDAgYnV0IG5vdCBwYXQxXG4gICAgICBsZXQgcGF0cyA9IFt0aGlzLnNwcml0ZVBhdHRlcm5zWzBdLCB1bmRlZmluZWRdO1xuICAgICAgaWYgKHRoaXMuaWQgPT09IDB4YTYpIHBhdHMgPSBbMHg1MywgMHg1MF07IC8vIGRyYXlnb24gMlxuICAgICAgY29uc3QgYm9zc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIDB4MWY5NmIgKyAyICogYm9zc0lkKSArIDB4MTQwMDA7XG4gICAgICAvLyBTZXQgdGhlIFwicmVzdG9yZSBtdXNpY1wiIGJ5dGUgZm9yIHRoZSBib3NzLCBidXQgaWYgaXQncyBEcmF5Z29uIDIsIHNldFxuICAgICAgLy8gaXQgdG8gemVybyBzaW5jZSBubyBtdXNpYyBpcyBhY3R1YWxseSBwbGF5aW5nLCBhbmQgaWYgdGhlIG11c2ljIGluIHRoZVxuICAgICAgLy8gdGVsZXBvcnRlciByb29tIGhhcHBlbnMgdG8gYmUgdGhlIHNhbWUgYXMgdGhlIG11c2ljIGluIHRoZSBjcnlwdCwgdGhlblxuICAgICAgLy8gcmVzZXR0aW5nIHRvIHRoYXQgbWVhbnMgaXQgd2lsbCBqdXN0IHJlbWFpbiBzaWxlbnQsIGFuZCBub3QgcmVzdGFydC5cbiAgICAgIGNvbnN0IHJlc3RvcmVCZ20gPSB0aGlzLmlkID09PSAweGE2ID8gMCA6IHRoaXMuYmdtO1xuICAgICAgY29uc3QgYm9zc1Jlc3RvcmUgPSBbXG4gICAgICAgICwsLCByZXN0b3JlQmdtLCxcbiAgICAgICAgLi4udGhpcy50aWxlUGFsZXR0ZXMsLCwsIHRoaXMuc3ByaXRlUGFsZXR0ZXNbMF0sLFxuICAgICAgICAsLCwsIC8qcGF0c1swXSovLCAvKnBhdHNbMV0qLyxcbiAgICAgICAgdGhpcy5hbmltYXRpb24sXG4gICAgICBdO1xuICAgICAgY29uc3QgW10gPSBbcGF0c107IC8vIGF2b2lkIGVycm9yXG5cbiAgICAgIC8vIGlmIChyZWFkTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIGJvc3NCYXNlKSA9PT0gMHhiYTk4KSB7XG4gICAgICAvLyAgIC8vIGVzY2FwZSBhbmltYXRpb246IGRvbid0IGNsb2JiZXIgcGF0dGVybnMgeWV0P1xuICAgICAgLy8gfVxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBib3NzUmVzdG9yZS5sZW5ndGg7IGorKykge1xuICAgICAgICBjb25zdCByZXN0b3JlZCA9IGJvc3NSZXN0b3JlW2pdO1xuICAgICAgICBpZiAocmVzdG9yZWQgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHdyaXRlci5yb21bYm9zc0Jhc2UgKyBqXSA9IHJlc3RvcmVkO1xuICAgICAgfVxuICAgICAgLy8gbGF0ZXIgc3BvdCBmb3IgcGFsMyBhbmQgcGF0MSAqYWZ0ZXIqIGV4cGxvc2lvblxuICAgICAgY29uc3QgYm9zc0Jhc2UyID0gMHgxZjdjMSArIDUgKiBib3NzSWQ7XG4gICAgICB3cml0ZXIucm9tW2Jvc3NCYXNlMl0gPSB0aGlzLnNwcml0ZVBhbGV0dGVzWzFdO1xuICAgICAgLy8gTk9URTogVGhpcyBydWlucyB0aGUgdHJlYXN1cmUgY2hlc3QuXG4gICAgICAvLyBUT0RPIC0gYWRkIHNvbWUgYXNtIGFmdGVyIGEgY2hlc3QgaXMgY2xlYXJlZCB0byByZWxvYWQgcGF0dGVybnM/XG4gICAgICAvLyBBbm90aGVyIG9wdGlvbiB3b3VsZCBiZSB0byBhZGQgYSBsb2NhdGlvbi1zcGVjaWZpYyBjb250cmFpbnQgdG8gYmVcbiAgICAgIC8vIHdoYXRldmVyIHRoZSBib3NzIFxuICAgICAgLy93cml0ZXIucm9tW2Jvc3NCYXNlMiArIDFdID0gdGhpcy5zcHJpdGVQYXR0ZXJuc1sxXTtcbiAgICB9XG4gIH1cblxuICBhbGxTY3JlZW5zKCk6IFNldDxTY3JlZW4+IHtcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IFNldDxTY3JlZW4+KCk7XG4gICAgY29uc3QgZXh0ID0gdGhpcy5zY3JlZW5QYWdlO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHRoaXMuc2NyZWVucykge1xuICAgICAgZm9yIChjb25zdCBzY3JlZW4gb2Ygcm93KSB7XG4gICAgICAgIHNjcmVlbnMuYWRkKHRoaXMucm9tLnNjcmVlbnNbc2NyZWVuICsgZXh0XSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzY3JlZW5zO1xuICB9XG5cbiAgYm9zc0lkKCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDBlOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLnJvbS5wcmdbMHgxZjk1ZCArIGldID09PSB0aGlzLmlkKSByZXR1cm4gaTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIG5laWdoYm9ycyhqb2luTmV4dXNlczogYm9vbGVhbiA9IGZhbHNlKTogU2V0PExvY2F0aW9uPiB7XG4gIC8vICAgY29uc3Qgb3V0ID0gbmV3IFNldDxMb2NhdGlvbj4oKTtcbiAgLy8gICBjb25zdCBhZGROZWlnaGJvcnMgPSAobDogTG9jYXRpb24pID0+IHtcbiAgLy8gICAgIGZvciAoY29uc3QgZXhpdCBvZiBsLmV4aXRzKSB7XG4gIC8vICAgICAgIGNvbnN0IGlkID0gZXhpdC5kZXN0O1xuICAvLyAgICAgICBjb25zdCBuZWlnaGJvciA9IHRoaXMucm9tLmxvY2F0aW9uc1tpZF07XG4gIC8vICAgICAgIGlmIChuZWlnaGJvciAmJiBuZWlnaGJvci51c2VkICYmXG4gIC8vICAgICAgICAgICBuZWlnaGJvciAhPT0gdGhpcyAmJiAhb3V0LmhhcyhuZWlnaGJvcikpIHtcbiAgLy8gICAgICAgICBvdXQuYWRkKG5laWdoYm9yKTtcbiAgLy8gICAgICAgICBpZiAoam9pbk5leHVzZXMgJiYgTkVYVVNFU1tuZWlnaGJvci5rZXldKSB7XG4gIC8vICAgICAgICAgICBhZGROZWlnaGJvcnMobmVpZ2hib3IpO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICBhZGROZWlnaGJvcnModGhpcyk7XG4gIC8vICAgcmV0dXJuIG91dDtcbiAgLy8gfVxuXG4gIGhhc0RvbHBoaW4oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaWQgPT09IDB4NjAgfHwgdGhpcy5pZCA9PT0gMHg2NCB8fCB0aGlzLmlkID09PSAweDY4O1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gTWFwIG9mIHRpbGVzICgkWVh5eCkgcmVhY2hhYmxlIGZyb20gYW55IGVudHJhbmNlIHRvXG4gICAqIHVuZmxhZ2dlZCB0aWxlZWZmZWN0cy5cbiAgICovXG4gIHJlYWNoYWJsZVRpbGVzKGZseSA9IGZhbHNlKTogTWFwPG51bWJlciwgbnVtYmVyPiB7XG4gICAgLy8gVE9ETyAtIGFyZ3MgZm9yICgxKSB1c2Ugbm9uLTJlZiBmbGFncywgKDIpIG9ubHkgZnJvbSBnaXZlbiBlbnRyYW5jZS90aWxlXG4gICAgLy8gRG9scGhpbiBtYWtlcyBOT19XQUxLIG9rYXkgZm9yIHNvbWUgbGV2ZWxzLlxuICAgIGlmICh0aGlzLmhhc0RvbHBoaW4oKSkgZmx5ID0gdHJ1ZTtcbiAgICAvLyBUYWtlIGludG8gYWNjb3VudCB0aGUgdGlsZXNldCBhbmQgZmxhZ3MgYnV0IG5vdCBhbnkgb3ZlcmxheS5cbiAgICBjb25zdCBleGl0cyA9IG5ldyBTZXQodGhpcy5leGl0cy5tYXAoZXhpdCA9PiBleGl0LnNjcmVlbiA8PCA4IHwgZXhpdC50aWxlKSk7XG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPG51bWJlcj4oKTtcbiAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5yb20udGlsZXNldCh0aGlzLnRpbGVzZXQpO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbdGhpcy50aWxlRWZmZWN0cyAtIDB4YjNdO1xuICAgIGNvbnN0IHBhc3NhYmxlID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSB0aGlzLnNjcmVlbnNbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Jvd1t4XSB8IHRoaXMuc2NyZWVuUGFnZV07XG4gICAgICAgIGNvbnN0IHBvcyA9IHkgPDwgNCB8IHg7XG4gICAgICAgIGNvbnN0IGZsYWcgPSB0aGlzLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gcG9zKTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWxlSWQgPSBwb3MgPDwgOCB8IHQ7XG4gICAgICAgICAgaWYgKGV4aXRzLmhhcyh0aWxlSWQpKSBjb250aW51ZTsgLy8gZG9uJ3QgZ28gcGFzdCBleGl0c1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBsZXQgZWZmZWN0cyA9IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgbGV0IGJsb2NrZWQgPSBmbHkgPyBlZmZlY3RzICYgMHgwNCA6IGVmZmVjdHMgJiAweDA2O1xuICAgICAgICAgIGlmIChmbGFnICYmIGJsb2NrZWQgJiYgdGlsZSA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdICE9IHRpbGUpIHtcbiAgICAgICAgICAgIHRpbGUgPSB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV07XG4gICAgICAgICAgICBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICAgIGJsb2NrZWQgPSBmbHkgPyBlZmZlY3RzICYgMHgwNCA6IGVmZmVjdHMgJiAweDA2O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWJsb2NrZWQpIHBhc3NhYmxlLmFkZCh0aWxlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChsZXQgdCBvZiBwYXNzYWJsZSkge1xuICAgICAgY29uc3QgcmlnaHQgPSAodCAmIDB4MGYpID09PSAweDBmID8gdCArIDB4ZjEgOiB0ICsgMTtcbiAgICAgIGlmIChwYXNzYWJsZS5oYXMocmlnaHQpKSB1Zi51bmlvbihbdCwgcmlnaHRdKTtcbiAgICAgIGNvbnN0IGJlbG93ID0gKHQgJiAweGYwKSA9PT0gMHhlMCA/IHQgKyAweGYyMCA6IHQgKyAxNjtcbiAgICAgIGlmIChwYXNzYWJsZS5oYXMoYmVsb3cpKSB1Zi51bmlvbihbdCwgYmVsb3ddKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXAgPSB1Zi5tYXAoKTtcbiAgICBjb25zdCBzZXRzID0gbmV3IFNldDxTZXQ8bnVtYmVyPj4oKTtcbiAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICBpZiAoIWVudHJhbmNlLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWQgPSBlbnRyYW5jZS5zY3JlZW4gPDwgOCB8IGVudHJhbmNlLnRpbGU7XG4gICAgICAvLyBOT1RFOiBtYXAgc2hvdWxkIGFsd2F5cyBoYXZlIGlkLCBidXQgYm9ndXMgZW50cmFuY2VzXG4gICAgICAvLyAoZS5nLiBHb2EgVmFsbGV5IGVudHJhbmNlIDIpIGNhbiBjYXVzZSBwcm9ibGVtcy5cbiAgICAgIHNldHMuYWRkKG1hcC5nZXQoaWQpIHx8IG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHNldCBvZiBzZXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHQgb2Ygc2V0KSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHgwZl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbc2NyIHwgdGhpcy5zY3JlZW5QYWdlXTtcbiAgICAgICAgb3V0LnNldCh0LCB0aWxlRWZmZWN0cy5lZmZlY3RzW3NjcmVlbi50aWxlc1t0ICYgMHhmZl1dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIC8qKiBTYWZlciB2ZXJzaW9uIG9mIHRoZSBiZWxvdz8gKi9cbiAgc2NyZWVuTW92ZXIoKTogKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB2b2lkIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIEFycmF5PHtzY3JlZW46IG51bWJlcn0+PigoKSA9PiBbXSk7XG4gICAgY29uc3Qgb2JqcyA9XG4gICAgICAgIGl0ZXJzLmNvbmNhdDx7c2NyZWVuOiBudW1iZXJ9Pih0aGlzLnNwYXducywgdGhpcy5leGl0cywgdGhpcy5lbnRyYW5jZXMpO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIG9ianMpIHtcbiAgICAgIG1hcC5nZXQob2JqLnNjcmVlbikucHVzaChvYmopO1xuICAgIH1cbiAgICByZXR1cm4gKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG9iaiBvZiBtYXAuZ2V0KG9yaWcpKSB7XG4gICAgICAgIG9iai5zY3JlZW4gPSByZXBsO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYWxsIHNwYXducywgZW50cmFuY2VzLCBhbmQgZXhpdHMuXG4gICAqIEBwYXJhbSBvcmlnIFlYIG9mIHRoZSBvcmlnaW5hbCBzY3JlZW4uXG4gICAqIEBwYXJhbSByZXBsIFlYIG9mIHRoZSBlcXVpdmFsZW50IHJlcGxhY2VtZW50IHNjcmVlbi5cbiAgICovXG4gIG1vdmVTY3JlZW4ob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgaWYgKG9iai5zY3JlZW4gPT09IG9yaWcpIG9iai5zY3JlZW4gPSByZXBsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gLSBmYWN0b3IgdGhpcyBvdXQgaW50byBhIHNlcGFyYXRlIGNsYXNzP1xuICAvLyAgIC0gaG9sZHMgbWV0YWRhdGEgYWJvdXQgbWFwIHRpbGVzIGluIGdlbmVyYWw/XG4gIC8vICAgLSBuZWVkIHRvIGZpZ3VyZSBvdXQgd2hhdCB0byBkbyB3aXRoIHBpdHMuLi5cbiAgbW9uc3RlclBsYWNlcihyYW5kb206IFJhbmRvbSk6IChtOiBNb25zdGVyKSA9PiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIC8vIElmIHRoZXJlJ3MgYSBib3NzIHNjcmVlbiwgZXhjbHVkZSBpdCBmcm9tIGdldHRpbmcgZW5lbWllcy5cbiAgICBjb25zdCBib3NzID0gdGhpcy5kYXRhLmJvc3NTY3JlZW47XG4gICAgLy8gU3RhcnQgd2l0aCBsaXN0IG9mIHJlYWNoYWJsZSB0aWxlcy5cbiAgICBjb25zdCByZWFjaGFibGUgPSB0aGlzLnJlYWNoYWJsZVRpbGVzKGZhbHNlKTtcbiAgICAvLyBEbyBhIGJyZWFkdGgtZmlyc3Qgc2VhcmNoIG9mIGFsbCB0aWxlcyB0byBmaW5kIFwiZGlzdGFuY2VcIiAoMS1ub3JtKS5cbiAgICBjb25zdCBleHRlbmRlZCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KFsuLi5yZWFjaGFibGUua2V5cygpXS5tYXAoeCA9PiBbeCwgMF0pKTtcbiAgICBjb25zdCBub3JtYWw6IG51bWJlcltdID0gW107IC8vIHJlYWNoYWJsZSwgbm90IHNsb3BlIG9yIHdhdGVyXG4gICAgY29uc3QgbW90aHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSDiiIggMy4uN1xuICAgIGNvbnN0IGJpcmRzOiBudW1iZXJbXSA9IFtdOyAgLy8gZGlzdGFuY2UgPiAxMlxuICAgIGNvbnN0IHBsYW50czogbnVtYmVyW10gPSBbXTsgLy8gZGlzdGFuY2Ug4oiIIDIuLjRcbiAgICBjb25zdCBwbGFjZWQ6IEFycmF5PFtNb25zdGVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCBub3JtYWxUZXJyYWluTWFzayA9IHRoaXMuaGFzRG9scGhpbigpID8gMHgyNSA6IDB4Mjc7XG4gICAgZm9yIChjb25zdCBbdCwgZGlzdGFuY2VdIG9mIGV4dGVuZGVkKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLnNjcmVlbnNbdCA+Pj4gMTJdWyh0ID4+PiA4KSAmIDB4Zl07XG4gICAgICBpZiAoc2NyID09PSBib3NzKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgbiBvZiBuZWlnaGJvcnModCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpKSB7XG4gICAgICAgIGlmIChleHRlbmRlZC5oYXMobikpIGNvbnRpbnVlO1xuICAgICAgICBleHRlbmRlZC5zZXQobiwgZGlzdGFuY2UgKyAxKTtcbiAgICAgIH1cbiAgICAgIGlmICghZGlzdGFuY2UgJiYgIShyZWFjaGFibGUuZ2V0KHQpISAmIG5vcm1hbFRlcnJhaW5NYXNrKSkgbm9ybWFsLnB1c2godCk7XG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHgxYSkge1xuICAgICAgICAvLyBTcGVjaWFsLWNhc2UgdGhlIHN3YW1wIGZvciBwbGFudCBwbGFjZW1lbnRcbiAgICAgICAgaWYgKHRoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl0gPT09IDB4ZjApIHBsYW50cy5wdXNoKHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGRpc3RhbmNlID49IDIgJiYgZGlzdGFuY2UgPD0gNCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMyAmJiBkaXN0YW5jZSA8PSA3KSBtb3Rocy5wdXNoKHQpO1xuICAgICAgaWYgKGRpc3RhbmNlID49IDEyKSBiaXJkcy5wdXNoKHQpO1xuICAgICAgLy8gVE9ETyAtIHNwZWNpYWwtY2FzZSBzd2FtcCBmb3IgcGxhbnQgbG9jYXRpb25zP1xuICAgIH1cbiAgICAvLyBXZSBub3cga25vdyBhbGwgdGhlIHBvc3NpYmxlIHBsYWNlcyB0byBwbGFjZSB0aGluZ3MuXG4gICAgLy8gIC0gTk9URTogc3RpbGwgbmVlZCB0byBtb3ZlIGNoZXN0cyB0byBkZWFkIGVuZHMsIGV0Yz9cbiAgICByZXR1cm4gKG06IE1vbnN0ZXIpID0+IHtcbiAgICAgIC8vIGNoZWNrIGZvciBwbGFjZW1lbnQuXG4gICAgICBjb25zdCBwbGFjZW1lbnQgPSBtLnBsYWNlbWVudCgpO1xuICAgICAgY29uc3QgcG9vbCA9IFsuLi4ocGxhY2VtZW50ID09PSAnbm9ybWFsJyA/IG5vcm1hbCA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdtb3RoJyA/IG1vdGhzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ2JpcmQnID8gYmlyZHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAncGxhbnQnID8gcGxhbnRzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydE5ldmVyKHBsYWNlbWVudCkpXVxuICAgICAgUE9PTDpcbiAgICAgIHdoaWxlIChwb29sLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBpID0gcmFuZG9tLm5leHRJbnQocG9vbC5sZW5ndGgpO1xuICAgICAgICBjb25zdCBbcG9zXSA9IHBvb2wuc3BsaWNlKGksIDEpO1xuXG4gICAgICAgIGNvbnN0IHggPSAocG9zICYgMHhmMDApID4+PiA0IHwgKHBvcyAmIDB4Zik7XG4gICAgICAgIGNvbnN0IHkgPSAocG9zICYgMHhmMDAwKSA+Pj4gOCB8IChwb3MgJiAweGYwKSA+Pj4gNDtcbiAgICAgICAgY29uc3QgciA9IG0uY2xlYXJhbmNlKCk7XG5cbiAgICAgICAgLy8gdGVzdCBkaXN0YW5jZSBmcm9tIG90aGVyIGVuZW1pZXMuXG4gICAgICAgIGZvciAoY29uc3QgWywgeDEsIHkxLCByMV0gb2YgcGxhY2VkKSB7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSB5MSkgKiogMiArICh4IC0geDEpICoqIDIpO1xuICAgICAgICAgIGlmICh6MiA8IChyICsgcjEpICoqIDIpIGNvbnRpbnVlIFBPT0w7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGVzdCBkaXN0YW5jZSBmcm9tIGVudHJhbmNlcy5cbiAgICAgICAgZm9yIChjb25zdCB7eDogeDEsIHk6IHkxLCB1c2VkfSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgICAgIGlmICghdXNlZCkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSAoeTEgPj4gNCkpICoqIDIgKyAoeCAtICh4MSA+PiA0KSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyAxKSAqKiAyKSBjb250aW51ZSBQT09MO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVmFsaWQgc3BvdCAoc3RpbGwsIGhvdyB0b2EgYXBwcm94aW1hdGVseSAqbWF4aW1pemUqIGRpc3RhbmNlcz8pXG4gICAgICAgIHBsYWNlZC5wdXNoKFttLCB4LCB5LCByXSk7XG4gICAgICAgIGNvbnN0IHNjciA9ICh5ICYgMHhmMCkgfCAoeCAmIDB4ZjApID4+PiA0O1xuICAgICAgICBjb25zdCB0aWxlID0gKHkgJiAweDBmKSA8PCA0IHwgKHggJiAweDBmKTtcbiAgICAgICAgcmV0dXJuIHNjciA8PCA4IHwgdGlsZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG4gIC8vIFRPRE8gLSBhbGxvdyBsZXNzIHJhbmRvbW5lc3MgZm9yIGNlcnRhaW4gY2FzZXMsIGUuZy4gdG9wIG9mIG5vcnRoIHNhYnJlIG9yXG4gIC8vIGFwcHJvcHJpYXRlIHNpZGUgb2YgY29yZGVsLlxuXG4gIC8qKiBAcmV0dXJuIHshU2V0PG51bWJlcj59ICovXG4gIC8vIGFsbFRpbGVzKCkge1xuICAvLyAgIGNvbnN0IHRpbGVzID0gbmV3IFNldCgpO1xuICAvLyAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuc2NyZWVucykge1xuICAvLyAgICAgZm9yIChjb25zdCB0aWxlIG9mIHNjcmVlbi5hbGxUaWxlcygpKSB7XG4gIC8vICAgICAgIHRpbGVzLmFkZCh0aWxlKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIHRpbGVzO1xuICAvLyB9XG5cblxuICAvLyBUT0RPIC0gdXNlIG1ldGFzY3JlZW4gZm9yIHRoaXMgbGF0ZXJcbiAgcmVzaXplU2NyZWVucyh0b3A6IG51bWJlciwgbGVmdDogbnVtYmVyLCBib3R0b206IG51bWJlciwgcmlnaHQ6IG51bWJlcikge1xuICAgIGNvbnN0IG5ld1dpZHRoID0gdGhpcy53aWR0aCArIGxlZnQgKyByaWdodDtcbiAgICBjb25zdCBuZXdIZWlnaHQgPSB0aGlzLmhlaWdodCArIHRvcCArIGJvdHRvbTtcbiAgICBjb25zdCBuZXdTY3JlZW5zID0gQXJyYXkuZnJvbSh7bGVuZ3RoOiBuZXdIZWlnaHR9LCAoXywgeSkgPT4ge1xuICAgICAgeSAtPSB0b3A7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbSh7bGVuZ3RoOiBuZXdXaWR0aH0sIChfLCB4KSA9PiB7XG4gICAgICAgIHggLT0gbGVmdDtcbiAgICAgICAgaWYgKHkgPCAwIHx8IHggPCAwIHx8IHkgPj0gdGhpcy5oZWlnaHQgfHwgeCA+PSB0aGlzLndpZHRoKSByZXR1cm4gMDtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NyZWVuc1t5XVt4XTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMud2lkdGggPSBuZXdXaWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IG5ld0hlaWdodDtcbiAgICB0aGlzLnNjcmVlbnMgPSBuZXdTY3JlZW5zO1xuICAgIC8vIFRPRE8gLSBpZiBhbnkgb2YgdGhlc2UgZ28gbmVnYXRpdmUsIHdlJ3JlIGluIHRyb3VibGUuLi5cbiAgICAvLyBQcm9iYWJseSB0aGUgYmVzdCBiZXQgd291bGQgYmUgdG8gcHV0IGEgY2hlY2sgaW4gdGhlIHNldHRlcj9cbiAgICBmb3IgKGNvbnN0IGYgb2YgdGhpcy5mbGFncykge1xuICAgICAgZi54cyArPSBsZWZ0O1xuICAgICAgZi55cyArPSB0b3A7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcCBvZiB0aGlzLnBpdHMpIHtcbiAgICAgIHAuZnJvbVhzICs9IGxlZnQ7XG4gICAgICBwLmZyb21ZcyArPSB0b3A7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcyBvZiBbLi4udGhpcy5zcGF3bnMsIC4uLnRoaXMuZXhpdHNdKSB7XG4gICAgICBzLnh0ICs9IDE2ICogbGVmdDtcbiAgICAgIHMueXQgKz0gMTYgKiB0b3A7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgaWYgKCFlLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgZS54ICs9IDI1NiAqIGxlZnQ7XG4gICAgICBlLnkgKz0gMjU2ICogdG9wO1xuICAgIH1cbiAgfVxuXG4gIHdyaXRlU2NyZWVuczJkKHN0YXJ0OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgIGRhdGE6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxudW1iZXIgfCBudWxsPj4pIHtcbiAgICBjb25zdCB4MCA9IHN0YXJ0ICYgMHhmO1xuICAgIGNvbnN0IHkwID0gc3RhcnQgPj4+IDQ7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBkYXRhLmxlbmd0aDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBkYXRhW3ldO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCByb3cubGVuZ3RoOyB4KyspIHtcbiAgICAgICAgY29uc3QgdGlsZSA9IHJvd1t4XTtcbiAgICAgICAgaWYgKHRpbGUgIT0gbnVsbCkgdGhpcy5zY3JlZW5zW3kwICsgeV1beDAgKyB4XSA9IHRpbGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ29ubmVjdCB0d28gc2NyZWVucyB2aWEgZW50cmFuY2VzLlxuICAvLyBBc3N1bWVzIGV4aXRzIGFuZCBlbnRyYW5jZXMgYXJlIGNvbXBsZXRlbHkgYWJzZW50LlxuICAvLyBTY3JlZW4gSURzIG11c3QgYmUgaW4gc2NyZWVuRXhpdHMuXG4gIC8vIFNVUEVSIEhBQ0tZIC0gaWYgcG9zIGlzIG5lZ2F0aXZlLCB1c2UgY29tcGxlbWVudCBhbmQgYWx0ZXJuYXRlIHN0YWlycy5cbiAgY29ubmVjdChwb3M6IG51bWJlciwgdGhhdDogTG9jYXRpb24sIHRoYXRQb3M6IG51bWJlcikge1xuICAgIGNvbnN0IHRoaXNBbHQgPSBwb3MgPCAwID8gMHgxMDAgOiAwO1xuICAgIGNvbnN0IHRoYXRBbHQgPSB0aGF0UG9zIDwgMCA/IDB4MTAwIDogMDtcbiAgICBwb3MgPSBwb3MgPCAwID8gfnBvcyA6IHBvcztcbiAgICB0aGF0UG9zID0gdGhhdFBvcyA8IDAgPyB+dGhhdFBvcyA6IHRoYXRQb3M7XG4gICAgY29uc3QgdGhpc1kgPSBwb3MgPj4+IDQ7XG4gICAgY29uc3QgdGhpc1ggPSBwb3MgJiAweGY7XG4gICAgY29uc3QgdGhhdFkgPSB0aGF0UG9zID4+PiA0O1xuICAgIGNvbnN0IHRoYXRYID0gdGhhdFBvcyAmIDB4ZjtcbiAgICBjb25zdCB0aGlzVGlsZSA9IHRoaXMuc2NyZWVuc1t0aGlzWV1bdGhpc1hdO1xuICAgIGNvbnN0IHRoYXRUaWxlID0gdGhhdC5zY3JlZW5zW3RoYXRZXVt0aGF0WF07XG4gICAgY29uc3QgW3RoaXNFbnRyYW5jZSwgdGhpc0V4aXRzXSA9IHNjcmVlbkV4aXRzW3RoaXNBbHQgfCB0aGlzVGlsZV07XG4gICAgY29uc3QgW3RoYXRFbnRyYW5jZSwgdGhhdEV4aXRzXSA9IHNjcmVlbkV4aXRzW3RoYXRBbHQgfCB0aGF0VGlsZV07XG4gICAgY29uc3QgdGhpc0VudHJhbmNlSW5kZXggPSB0aGlzLmVudHJhbmNlcy5sZW5ndGg7XG4gICAgY29uc3QgdGhhdEVudHJhbmNlSW5kZXggPSB0aGF0LmVudHJhbmNlcy5sZW5ndGg7XG4gICAgdGhpcy5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eTogdGhpc1kgPDwgOCB8IHRoaXNFbnRyYW5jZSA+Pj4gOCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB0aGlzWCA8PCA4IHwgdGhpc0VudHJhbmNlICYgMHhmZn0pKTtcbiAgICB0aGF0LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt5OiB0aGF0WSA8PCA4IHwgdGhhdEVudHJhbmNlID4+PiA4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHRoYXRYIDw8IDggfCB0aGF0RW50cmFuY2UgJiAweGZmfSkpO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzRXhpdHMpIHtcbiAgICAgIHRoaXMuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHBvcywgdGlsZTogZXhpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0OiB0aGF0LmlkLCBlbnRyYW5jZTogdGhhdEVudHJhbmNlSW5kZXh9KSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGF0RXhpdHMpIHtcbiAgICAgIHRoYXQuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHRoYXRQb3MsIHRpbGU6IGV4aXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdDogdGhpcy5pZCwgZW50cmFuY2U6IHRoaXNFbnRyYW5jZUluZGV4fSkpO1xuICAgIH1cbiAgfVxuXG4gIG5laWdoYm9yRm9yRW50cmFuY2UoZW50cmFuY2VJZDogbnVtYmVyKTogTG9jYXRpb24ge1xuICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZXNbZW50cmFuY2VJZF07XG4gICAgaWYgKCFlbnRyYW5jZSkgdGhyb3cgbmV3IEVycm9yKGBubyBlbnRyYW5jZSAke2hleCh0aGlzLmlkKX06JHtlbnRyYW5jZUlkfWApO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC5zY3JlZW4gIT09IGVudHJhbmNlLnNjcmVlbikgY29udGludWU7XG4gICAgICBjb25zdCBkeCA9IE1hdGguYWJzKGV4aXQueCAtIGVudHJhbmNlLngpO1xuICAgICAgY29uc3QgZHkgPSBNYXRoLmFicyhleGl0LnkgLSBlbnRyYW5jZS55KTtcbiAgICAgIGlmIChkeCA8IDI0ICYmIGR5IDwgMjQpIHJldHVybiB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdC5kZXN0XTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBubyBleGl0IGZvdW5kIG5lYXIgJHtoZXgodGhpcy5pZCl9OiR7ZW50cmFuY2VJZH1gKTtcbiAgfVxufVxuXG4vLyBUT0RPIC0gbW92ZSB0byBhIGJldHRlci1vcmdhbml6ZWQgZGVkaWNhdGVkIFwiZ2VvbWV0cnlcIiBtb2R1bGU/XG5mdW5jdGlvbiBuZWlnaGJvcnModGlsZTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IG51bWJlcltdIHtcbiAgY29uc3Qgb3V0ID0gW107XG4gIGNvbnN0IHkgPSB0aWxlICYgMHhmMGYwO1xuICBjb25zdCB4ID0gdGlsZSAmIDB4MGYwZjtcbiAgaWYgKHkgPCAoKGhlaWdodCAtIDEpIDw8IDEyIHwgMHhlMCkpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4ZjApID09PSAweGUwID8gdGlsZSArIDB4MGYyMCA6IHRpbGUgKyAxNik7XG4gIH1cbiAgaWYgKHkpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4ZjApID09PSAweDAwID8gdGlsZSAtIDB4MGYyMCA6IHRpbGUgLSAxNik7XG4gIH1cbiAgaWYgKHggPCAoKHdpZHRoIC0gMSkgPDwgOCB8IDB4MGYpKSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweDBmKSA9PT0gMHgwZiA/IHRpbGUgKyAweDAwZjEgOiB0aWxlICsgMSk7XG4gIH1cbiAgaWYgKHgpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDAwID8gdGlsZSAtIDB4MDBmMSA6IHRpbGUgLSAxKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgY29uc3QgRW50cmFuY2UgPSBEYXRhVHVwbGUubWFrZSg0LCB7XG4gIHg6IERhdGFUdXBsZS5wcm9wKFswXSwgWzEsIDB4ZmYsIC04XSksXG4gIHk6IERhdGFUdXBsZS5wcm9wKFsyXSwgWzMsIDB4ZmYsIC04XSksXG5cbiAgc2NyZWVuOiBEYXRhVHVwbGUucHJvcChbMywgMHgwZiwgLTRdLCBbMSwgMHgwZl0pLFxuICB0aWxlOiAgIERhdGFUdXBsZS5wcm9wKFsyLCAweGYwXSwgWzAsIDB4ZjAsIDRdKSxcbiAgY29vcmQ6ICBEYXRhVHVwbGUucHJvcChbMiwgMHhmZiwgLThdLCBbMCwgMHhmZl0pLFxuXG4gIHVzZWQ6IHtcbiAgICBnZXQodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRhdGFbMV0gIT0gMHhmZjsgfSxcbiAgfSxcblxuICB0b1N0cmluZyh0aGlzOiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgRW50cmFuY2UgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSlgO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBFbnRyYW5jZSA9IEluc3RhbmNlVHlwZTx0eXBlb2YgRW50cmFuY2U+O1xuXG5leHBvcnQgY29uc3QgRXhpdCA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgeDogICAgICAgIERhdGFUdXBsZS5wcm9wKFswLCAweGZmLCAtNF0pLFxuICB4dDogICAgICAgRGF0YVR1cGxlLnByb3AoWzBdKSxcblxuICB5OiAgICAgICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4ZmYsIC00XSksXG4gIHl0OiAgICAgICBEYXRhVHVwbGUucHJvcChbMV0pLFxuXG4gIHNjcmVlbjogICBEYXRhVHVwbGUucHJvcChbMSwgMHhmMF0sIFswLCAweGYwLCA0XSksXG4gIHRpbGU6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHgwZiwgLTRdLCBbMCwgMHgwZl0pLFxuXG4gIGRlc3Q6ICAgICBEYXRhVHVwbGUucHJvcChbMl0pLFxuXG4gIGVudHJhbmNlOiBEYXRhVHVwbGUucHJvcChbM10pLFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBFeGl0ICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLngpfSwgJHtoZXgodGhpcy55KX0pID0+ICR7XG4gICAgICAgICAgICB0aGlzLmRlc3R9OiR7dGhpcy5lbnRyYW5jZX1gO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBFeGl0ID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBFeGl0PjtcblxuZXhwb3J0IGNvbnN0IEZsYWcgPSBEYXRhVHVwbGUubWFrZSgyLCB7XG4gIGZsYWc6ICB7XG4gICAgZ2V0KHRoaXM6IGFueSk6IG51bWJlciB7IHJldHVybiB0aGlzLmRhdGFbMF0gfCAweDIwMDsgfSxcbiAgICBzZXQodGhpczogYW55LCBmOiBudW1iZXIpIHtcbiAgICAgIGlmICgoZiAmIH4weGZmKSAhPT0gMHgyMDApIHRocm93IG5ldyBFcnJvcihgYmFkIGZsYWc6ICR7aGV4KGYpfWApO1xuICAgICAgdGhpcy5kYXRhWzBdID0gZiAmIDB4ZmY7XG4gICAgfSxcbiAgfSxcblxuICB4OiAgICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4MDcsIC04XSksXG4gIHhzOiAgICBEYXRhVHVwbGUucHJvcChbMSwgMHgwN10pLFxuXG4gIHk6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHhmMCwgLTRdKSxcbiAgeXM6ICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweGYwLCA0XSksXG5cbiAgLy8gVE9ETyAtIHJlbW92ZSB0aGUgJ3l4JyB2ZXJzaW9uXG4gIHl4OiAgICBEYXRhVHVwbGUucHJvcChbMV0pLCAvLyB5IGluIGhpIG5pYmJsZSwgeCBpbiBsby5cbiAgc2NyZWVuOiBEYXRhVHVwbGUucHJvcChbMV0pLFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBGbGFnICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLnhzKX0sICR7aGV4KHRoaXMueXMpfSkgQCAke1xuICAgICAgICAgICAgaGV4KHRoaXMuZmxhZyl9YDtcbiAgfSxcbn0pO1xuZXhwb3J0IHR5cGUgRmxhZyA9IEluc3RhbmNlVHlwZTx0eXBlb2YgRmxhZz47XG5cbmV4cG9ydCBjb25zdCBQaXQgPSBEYXRhVHVwbGUubWFrZSg0LCB7XG4gIGZyb21YczogIERhdGFUdXBsZS5wcm9wKFsxLCAweDcwLCA0XSksXG4gIHRvWHM6ICAgIERhdGFUdXBsZS5wcm9wKFsxLCAweDA3XSksXG5cbiAgZnJvbVlzOiAgRGF0YVR1cGxlLnByb3AoWzMsIDB4ZjAsIDRdKSxcbiAgdG9ZczogICAgRGF0YVR1cGxlLnByb3AoWzMsIDB4MGZdKSxcblxuICBkZXN0OiAgICBEYXRhVHVwbGUucHJvcChbMF0pLFxuXG4gIHRvU3RyaW5nKHRoaXM6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBQaXQgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMuZnJvbVhzKX0sICR7aGV4KHRoaXMuZnJvbVlzKX0pID0+ICR7XG4gICAgICAgICAgICBoZXgodGhpcy5kZXN0KX06KCR7aGV4KHRoaXMudG9Ycyl9LCAke2hleCh0aGlzLnRvWXMpfSlgO1xuICB9LFxufSk7XG5leHBvcnQgdHlwZSBQaXQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIFBpdD47XG5cbmV4cG9ydCBjb25zdCBTcGF3biA9IERhdGFUdXBsZS5tYWtlKDQsIHtcbiAgeTogICAgIERhdGFUdXBsZS5wcm9wKFswLCAweGZmLCAtNF0pLFxuICB5dDogICAgRGF0YVR1cGxlLnByb3AoWzBdKSxcblxuICB0aW1lZDogRGF0YVR1cGxlLmJvb2xlYW5Qcm9wKFsxLCAweDgwLCA3XSksXG4gIHg6ICAgICBEYXRhVHVwbGUucHJvcChbMSwgMHg3ZiwgLTRdLCBbMiwgMHg0MCwgM10pLFxuICB4dDogICAgRGF0YVR1cGxlLnByb3AoWzEsIDB4N2ZdKSxcblxuICBzY3JlZW46IERhdGFUdXBsZS5wcm9wKFswLCAweGYwXSwgWzEsIDB4NzAsIDRdKSxcbiAgdGlsZTogICBEYXRhVHVwbGUucHJvcChbMCwgMHgwZiwgLTRdLCBbMSwgMHgwZl0pLFxuXG4gIHBhdHRlcm5CYW5rOiBEYXRhVHVwbGUucHJvcChbMiwgMHg4MCwgN10pLFxuICB0eXBlOiAgRGF0YVR1cGxlLnByb3AoWzIsIDB4MDddKSxcblxuLy8gcGF0dGVybkJhbms6IHtnZXQodGhpczogYW55KTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YVsyXSA+Pj4gNzsgfSxcbi8vICAgICAgICAgICAgICAgc2V0KHRoaXM6IGFueSwgdjogbnVtYmVyKSB7IGlmICh0aGlzLmRhdGFbM10gPT09IDEyMCkgZGVidWdnZXI7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodikgdGhpcy5kYXRhWzJdIHw9IDB4ODA7IGVsc2UgdGhpcy5kYXRhWzJdICY9IDB4N2Y7IH19LFxuICBpZDogICAgRGF0YVR1cGxlLnByb3AoWzNdKSxcblxuICB1c2VkOiB7Z2V0KHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5kYXRhWzBdICE9PSAweGZlOyB9LFxuICAgICAgICAgc2V0KHRoaXM6IGFueSwgdXNlZDogYm9vbGVhbikgeyB0aGlzLmRhdGFbMF0gPSB1c2VkID8gMCA6IDB4ZmU7IH19LFxuICBtb25zdGVySWQ6IHtnZXQodGhpczogYW55KTogbnVtYmVyIHsgcmV0dXJuICh0aGlzLmlkICsgMHg1MCkgJiAweGZmOyB9LFxuICAgICAgICAgICAgICBzZXQodGhpczogYW55LCBpZDogbnVtYmVyKSB7IHRoaXMuaWQgPSAoaWQgLSAweDUwKSAmIDB4ZmY7IH19LFxuICAvKiogTm90ZTogdGhpcyBpbmNsdWRlcyBtaW1pY3MuICovXG4gIGlzQ2hlc3QodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDIgJiYgdGhpcy5pZCA8IDB4ODA7IH0sXG4gIGlzSW52aXNpYmxlKHRoaXM6IGFueSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzQ2hlc3QoKSAmJiBCb29sZWFuKHRoaXMuZGF0YVsyXSAmIDB4MjApO1xuICB9LFxuICBpc1RyaWdnZXIodGhpczogYW55KTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDIgJiYgdGhpcy5pZCA+PSAweDgwOyB9LFxuICBpc05wYyh0aGlzOiBhbnkpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMSAmJiB0aGlzLmlkIDwgMHhjMDsgfSxcbiAgaXNCb3NzKHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAxICYmIHRoaXMuaWQgPj0gMHhjMDsgfSxcbiAgaXNNb25zdGVyKHRoaXM6IGFueSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAwOyB9LFxuICBpc1dhbGwodGhpczogYW55KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIEJvb2xlYW4odGhpcy50eXBlID09PSAzICYmICh0aGlzLmlkIDwgNCB8fCAodGhpcy5kYXRhWzJdICYgMHgyMCkpKTtcbiAgfSxcbiAgaXNTaG9vdGluZ1dhbGwodGhpczogYW55LCBsb2NhdGlvbjogTG9jYXRpb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc1dhbGwoKSAmJlxuICAgICAgICAhISh0aGlzLmRhdGFbMl0gJiAweDIwID8gdGhpcy5kYXRhWzJdICYgMHgxMCA6XG4gICAgICAgICAgIGxvY2F0aW9uLmlkID09PSAweDhmIHx8IGxvY2F0aW9uLmlkID09PSAweGE4KTtcbiAgfSxcbiAgd2FsbFR5cGUodGhpczogYW55KTogJycgfCAnd2FsbCcgfCAnYnJpZGdlJyB7XG4gICAgaWYgKHRoaXMudHlwZSAhPT0gMykgcmV0dXJuICcnO1xuICAgIGNvbnN0IG9iaiA9IHRoaXMuZGF0YVsyXSAmIDB4MjAgPyB0aGlzLmlkID4+PiA0IDogdGhpcy5pZDtcbiAgICBpZiAob2JqID49IDQpIHJldHVybiAnJztcbiAgICByZXR1cm4gb2JqID09PSAyID8gJ2JyaWRnZScgOiAnd2FsbCc7XG4gIH0sXG4gIHdhbGxFbGVtZW50KHRoaXM6IGFueSk6IG51bWJlciB7XG4gICAgaWYgKCF0aGlzLmlzV2FsbCgpKSByZXR1cm4gLTE7XG4gICAgcmV0dXJuIHRoaXMuaWQgJiAzO1xuICB9LFxuICB0b1N0cmluZyh0aGlzOiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgU3Bhd24gJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMueCl9LCAke2hleCh0aGlzLnkpfSkgJHtcbiAgICAgICAgICAgIHRoaXMudGltZWQgPyAndGltZWQnIDogJ2ZpeGVkJ30gJHt0aGlzLnR5cGV9OiR7aGV4KHRoaXMuaWQpfWA7XG4gIH0sXG59KTtcbmV4cG9ydCB0eXBlIFNwYXduID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBTcGF3bj47XG5cbmV4cG9ydCBjb25zdCBMT0NBVElPTlMgPSB7XG4gIG1lemFtZVNocmluZTogWzB4MDAsICdNZXphbWUgU2hyaW5lJ10sXG4gIGxlYWZPdXRzaWRlU3RhcnQ6IFsweDAxLCAnTGVhZiAtIE91dHNpZGUgU3RhcnQnXSxcbiAgbGVhZjogWzB4MDIsICdMZWFmJ10sXG4gIHZhbGxleU9mV2luZDogWzB4MDMsICdWYWxsZXkgb2YgV2luZCddLFxuICBzZWFsZWRDYXZlMTogWzB4MDQsICdTZWFsZWQgQ2F2ZSAxJ10sXG4gIHNlYWxlZENhdmUyOiBbMHgwNSwgJ1NlYWxlZCBDYXZlIDInXSxcbiAgc2VhbGVkQ2F2ZTY6IFsweDA2LCAnU2VhbGVkIENhdmUgNiddLFxuICBzZWFsZWRDYXZlNDogWzB4MDcsICdTZWFsZWQgQ2F2ZSA0J10sXG4gIHNlYWxlZENhdmU1OiBbMHgwOCwgJ1NlYWxlZCBDYXZlIDUnXSxcbiAgc2VhbGVkQ2F2ZTM6IFsweDA5LCAnU2VhbGVkIENhdmUgMyddLFxuICBzZWFsZWRDYXZlNzogWzB4MGEsICdTZWFsZWQgQ2F2ZSA3J10sXG4gIC8vIElOVkFMSUQ6IDB4MGJcbiAgc2VhbGVkQ2F2ZTg6IFsweDBjLCAnU2VhbGVkIENhdmUgOCddLFxuICAvLyBJTlZBTElEOiAweDBkXG4gIHdpbmRtaWxsQ2F2ZTogWzB4MGUsICdXaW5kbWlsbCBDYXZlJ10sXG4gIHdpbmRtaWxsOiBbMHgwZiwgJ1dpbmRtaWxsJ10sXG4gIHplYnVDYXZlOiBbMHgxMCwgJ1plYnUgQ2F2ZSddLFxuICBtdFNhYnJlV2VzdENhdmUxOiBbMHgxMSwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDEnXSxcbiAgLy8gSU5WQUxJRDogMHgxMlxuICAvLyBJTlZBTElEOiAweDEzXG4gIGNvcmRlbFBsYWluc1dlc3Q6IFsweDE0LCAnQ29yZGVsIFBsYWlucyBXZXN0J10sXG4gIGNvcmRlbFBsYWluc0Vhc3Q6IFsweDE1LCAnQ29yZGVsIFBsYWlucyBFYXN0J10sXG4gIC8vIElOVkFMSUQ6IDB4MTYgLS0gdW51c2VkIGNvcHkgb2YgMThcbiAgLy8gSU5WQUxJRDogMHgxN1xuICBicnlubWFlcjogWzB4MTgsICdCcnlubWFlciddLFxuICBvdXRzaWRlU3RvbUhvdXNlOiBbMHgxOSwgJ091dHNpZGUgU3RvbSBIb3VzZSddLFxuICBzd2FtcDogWzB4MWEsICdTd2FtcCddLFxuICBhbWF6b25lczogWzB4MWIsICdBbWF6b25lcyddLFxuICBvYWs6IFsweDFjLCAnT2FrJ10sXG4gIC8vIElOVkFMSUQ6IDB4MWRcbiAgc3RvbUhvdXNlOiBbMHgxZSwgJ1N0b20gSG91c2UnXSxcbiAgLy8gSU5WQUxJRDogMHgxZlxuICBtdFNhYnJlV2VzdExvd2VyOiBbMHgyMCwgJ010IFNhYnJlIFdlc3QgLSBMb3dlciddLFxuICBtdFNhYnJlV2VzdFVwcGVyOiBbMHgyMSwgJ010IFNhYnJlIFdlc3QgLSBVcHBlciddLFxuICBtdFNhYnJlV2VzdENhdmUyOiBbMHgyMiwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDInXSxcbiAgbXRTYWJyZVdlc3RDYXZlMzogWzB4MjMsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSAzJ10sXG4gIG10U2FicmVXZXN0Q2F2ZTQ6IFsweDI0LCAnTXQgU2FicmUgV2VzdCAtIENhdmUgNCddLFxuICBtdFNhYnJlV2VzdENhdmU1OiBbMHgyNSwgJ010IFNhYnJlIFdlc3QgLSBDYXZlIDUnXSxcbiAgbXRTYWJyZVdlc3RDYXZlNjogWzB4MjYsICdNdCBTYWJyZSBXZXN0IC0gQ2F2ZSA2J10sXG4gIG10U2FicmVXZXN0Q2F2ZTc6IFsweDI3LCAnTXQgU2FicmUgV2VzdCAtIENhdmUgNyddLFxuICBtdFNhYnJlTm9ydGhNYWluOiBbMHgyOCwgJ010IFNhYnJlIE5vcnRoIC0gTWFpbiddLFxuICBtdFNhYnJlTm9ydGhNaWRkbGU6IFsweDI5LCAnTXQgU2FicmUgTm9ydGggLSBNaWRkbGUnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTI6IFsweDJhLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDInXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTM6IFsweDJiLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDMnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTQ6IFsweDJjLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDQnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTU6IFsweDJkLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDUnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTY6IFsweDJlLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDYnXSxcbiAgbXRTYWJyZU5vcnRoUHJpc29uSGFsbDogWzB4MmYsICdNdCBTYWJyZSBOb3J0aCAtIFByaXNvbiBIYWxsJ10sXG4gIG10U2FicmVOb3J0aExlZnRDZWxsOiBbMHgzMCwgJ010IFNhYnJlIE5vcnRoIC0gTGVmdCBDZWxsJ10sXG4gIG10U2FicmVOb3J0aExlZnRDZWxsMjogWzB4MzEsICdNdCBTYWJyZSBOb3J0aCAtIExlZnQgQ2VsbCAyJ10sXG4gIG10U2FicmVOb3J0aFJpZ2h0Q2VsbDogWzB4MzIsICdNdCBTYWJyZSBOb3J0aCAtIFJpZ2h0IENlbGwnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTg6IFsweDMzLCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDgnXSxcbiAgbXRTYWJyZU5vcnRoQ2F2ZTk6IFsweDM0LCAnTXQgU2FicmUgTm9ydGggLSBDYXZlIDknXSxcbiAgbXRTYWJyZU5vcnRoU3VtbWl0Q2F2ZTogWzB4MzUsICdNdCBTYWJyZSBOb3J0aCAtIFN1bW1pdCBDYXZlJ10sXG4gIC8vIElOVkFMSUQ6IDB4MzZcbiAgLy8gSU5WQUxJRDogMHgzN1xuICBtdFNhYnJlTm9ydGhDYXZlMTogWzB4MzgsICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgMSddLFxuICBtdFNhYnJlTm9ydGhDYXZlNzogWzB4MzksICdNdCBTYWJyZSBOb3J0aCAtIENhdmUgNyddLFxuICAvLyBJTlZBTElEOiAweDNhXG4gIC8vIElOVkFMSUQ6IDB4M2JcbiAgbmFkYXJlSW5uOiBbMHgzYywgJ05hZGFyZSAtIElubiddLFxuICBuYWRhcmVUb29sU2hvcDogWzB4M2QsICdOYWRhcmUgLSBUb29sIFNob3AnXSxcbiAgbmFkYXJlQmFja1Jvb206IFsweDNlLCAnTmFkYXJlIC0gQmFjayBSb29tJ10sXG4gIC8vIElOVkFMSUQ6IDB4M2ZcbiAgd2F0ZXJmYWxsVmFsbGV5Tm9ydGg6IFsweDQwLCAnV2F0ZXJmYWxsIFZhbGxleSBOb3J0aCddLFxuICB3YXRlcmZhbGxWYWxsZXlTb3V0aDogWzB4NDEsICdXYXRlcmZhbGwgVmFsbGV5IFNvdXRoJ10sXG4gIGxpbWVUcmVlVmFsbGV5OiBbMHg0MiwgJ0xpbWUgVHJlZSBWYWxsZXknXSxcbiAgbGltZVRyZWVMYWtlOiBbMHg0MywgJ0xpbWUgVHJlZSBMYWtlJ10sXG4gIGtpcmlzYVBsYW50Q2F2ZTE6IFsweDQ0LCAnS2lyaXNhIFBsYW50IENhdmUgMSddLFxuICBraXJpc2FQbGFudENhdmUyOiBbMHg0NSwgJ0tpcmlzYSBQbGFudCBDYXZlIDInXSxcbiAga2lyaXNhUGxhbnRDYXZlMzogWzB4NDYsICdLaXJpc2EgUGxhbnQgQ2F2ZSAzJ10sXG4gIGtpcmlzYU1lYWRvdzogWzB4NDcsICdLaXJpc2EgTWVhZG93J10sXG4gIGZvZ0xhbXBDYXZlMTogWzB4NDgsICdGb2cgTGFtcCBDYXZlIDEnXSxcbiAgZm9nTGFtcENhdmUyOiBbMHg0OSwgJ0ZvZyBMYW1wIENhdmUgMiddLFxuICBmb2dMYW1wQ2F2ZTM6IFsweDRhLCAnRm9nIExhbXAgQ2F2ZSAzJ10sXG4gIGZvZ0xhbXBDYXZlRGVhZEVuZDogWzB4NGIsICdGb2cgTGFtcCBDYXZlIERlYWQgRW5kJ10sXG4gIGZvZ0xhbXBDYXZlNDogWzB4NGMsICdGb2cgTGFtcCBDYXZlIDQnXSxcbiAgZm9nTGFtcENhdmU1OiBbMHg0ZCwgJ0ZvZyBMYW1wIENhdmUgNSddLFxuICBmb2dMYW1wQ2F2ZTY6IFsweDRlLCAnRm9nIExhbXAgQ2F2ZSA2J10sXG4gIGZvZ0xhbXBDYXZlNzogWzB4NGYsICdGb2cgTGFtcCBDYXZlIDcnXSxcbiAgcG9ydG9hOiBbMHg1MCwgJ1BvcnRvYSddLFxuICBwb3J0b2FGaXNoZXJtYW5Jc2xhbmQ6IFsweDUxLCAnUG9ydG9hIC0gRmlzaGVybWFuIElzbGFuZCddLFxuICBtZXNpYVNocmluZTogWzB4NTIsICdNZXNpYSBTaHJpbmUnXSxcbiAgLy8gSU5WQUxJRDogMHg1M1xuICB3YXRlcmZhbGxDYXZlMTogWzB4NTQsICdXYXRlcmZhbGwgQ2F2ZSAxJ10sXG4gIHdhdGVyZmFsbENhdmUyOiBbMHg1NSwgJ1dhdGVyZmFsbCBDYXZlIDInXSxcbiAgd2F0ZXJmYWxsQ2F2ZTM6IFsweDU2LCAnV2F0ZXJmYWxsIENhdmUgMyddLFxuICB3YXRlcmZhbGxDYXZlNDogWzB4NTcsICdXYXRlcmZhbGwgQ2F2ZSA0J10sXG4gIHRvd2VyRW50cmFuY2U6IFsweDU4LCAnVG93ZXIgLSBFbnRyYW5jZSddLFxuICB0b3dlcjE6IFsweDU5LCAnVG93ZXIgMSddLFxuICB0b3dlcjI6IFsweDVhLCAnVG93ZXIgMiddLFxuICB0b3dlcjM6IFsweDViLCAnVG93ZXIgMyddLFxuICB0b3dlck91dHNpZGVNZXNpYTogWzB4NWMsICdUb3dlciAtIE91dHNpZGUgTWVzaWEnXSxcbiAgdG93ZXJPdXRzaWRlRHluYTogWzB4NWQsICdUb3dlciAtIE91dHNpZGUgRHluYSddLFxuICB0b3dlck1lc2lhOiBbMHg1ZSwgJ1Rvd2VyIC0gTWVzaWEnXSxcbiAgdG93ZXJEeW5hOiBbMHg1ZiwgJ1Rvd2VyIC0gRHluYSddLFxuICBhbmdyeVNlYTogWzB4NjAsICdBbmdyeSBTZWEnXSxcbiAgYm9hdEhvdXNlOiBbMHg2MSwgJ0JvYXQgSG91c2UnXSxcbiAgam9lbExpZ2h0aG91c2U6IFsweDYyLCAnSm9lbCAtIExpZ2h0aG91c2UnXSxcbiAgLy8gSU5WQUxJRDogMHg2M1xuICB1bmRlcmdyb3VuZENoYW5uZWw6IFsweDY0LCAnVW5kZXJncm91bmQgQ2hhbm5lbCddLFxuICB6b21iaWVUb3duOiBbMHg2NSwgJ1pvbWJpZSBUb3duJ10sXG4gIC8vIElOVkFMSUQ6IDB4NjZcbiAgLy8gSU5WQUxJRDogMHg2N1xuICBldmlsU3Bpcml0SXNsYW5kMTogWzB4NjgsICdFdmlsIFNwaXJpdCBJc2xhbmQgMSddLFxuICBldmlsU3Bpcml0SXNsYW5kMjogWzB4NjksICdFdmlsIFNwaXJpdCBJc2xhbmQgMiddLFxuICBldmlsU3Bpcml0SXNsYW5kMzogWzB4NmEsICdFdmlsIFNwaXJpdCBJc2xhbmQgMyddLFxuICBldmlsU3Bpcml0SXNsYW5kNDogWzB4NmIsICdFdmlsIFNwaXJpdCBJc2xhbmQgNCddLFxuICBzYWJlcmFQYWxhY2UxOiBbMHg2YywgJ1NhYmVyYSBQYWxhY2UgMSddLFxuICBzYWJlcmFQYWxhY2UyOiBbMHg2ZCwgJ1NhYmVyYSBQYWxhY2UgMiddLFxuICBzYWJlcmFQYWxhY2UzOiBbMHg2ZSwgJ1NhYmVyYSBQYWxhY2UgMyddLFxuICAvLyBJTlZBTElEOiAweDZmIC0tIFNhYmVyYSBQYWxhY2UgMyB1bnVzZWQgY29weVxuICBqb2VsU2VjcmV0UGFzc2FnZTogWzB4NzAsICdKb2VsIC0gU2VjcmV0IFBhc3NhZ2UnXSxcbiAgam9lbDogWzB4NzEsICdKb2VsJ10sXG4gIHN3YW46IFsweDcyLCAnU3dhbiddLFxuICBzd2FuR2F0ZTogWzB4NzMsICdTd2FuIC0gR2F0ZSddLFxuICAvLyBJTlZBTElEOiAweDc0XG4gIC8vIElOVkFMSUQ6IDB4NzVcbiAgLy8gSU5WQUxJRDogMHg3NlxuICAvLyBJTlZBTElEOiAweDc3XG4gIGdvYVZhbGxleTogWzB4NzgsICdHb2EgVmFsbGV5J10sXG4gIC8vIElOVkFMSUQ6IDB4NzlcbiAgLy8gSU5WQUxJRDogMHg3YVxuICAvLyBJTlZBTElEOiAweDdiXG4gIG10SHlkcmE6IFsweDdjLCAnTXQgSHlkcmEnXSxcbiAgbXRIeWRyYUNhdmUxOiBbMHg3ZCwgJ010IEh5ZHJhIC0gQ2F2ZSAxJ10sXG4gIG10SHlkcmFPdXRzaWRlU2h5cm9uOiBbMHg3ZSwgJ010IEh5ZHJhIC0gT3V0c2lkZSBTaHlyb24nXSxcbiAgbXRIeWRyYUNhdmUyOiBbMHg3ZiwgJ010IEh5ZHJhIC0gQ2F2ZSAyJ10sXG4gIG10SHlkcmFDYXZlMzogWzB4ODAsICdNdCBIeWRyYSAtIENhdmUgMyddLFxuICBtdEh5ZHJhQ2F2ZTQ6IFsweDgxLCAnTXQgSHlkcmEgLSBDYXZlIDQnXSxcbiAgbXRIeWRyYUNhdmU1OiBbMHg4MiwgJ010IEh5ZHJhIC0gQ2F2ZSA1J10sXG4gIG10SHlkcmFDYXZlNjogWzB4ODMsICdNdCBIeWRyYSAtIENhdmUgNiddLFxuICBtdEh5ZHJhQ2F2ZTc6IFsweDg0LCAnTXQgSHlkcmEgLSBDYXZlIDcnXSxcbiAgbXRIeWRyYUNhdmU4OiBbMHg4NSwgJ010IEh5ZHJhIC0gQ2F2ZSA4J10sXG4gIG10SHlkcmFDYXZlOTogWzB4ODYsICdNdCBIeWRyYSAtIENhdmUgOSddLFxuICBtdEh5ZHJhQ2F2ZTEwOiBbMHg4NywgJ010IEh5ZHJhIC0gQ2F2ZSAxMCddLFxuICBzdHl4MTogWzB4ODgsICdTdHl4IDEnXSxcbiAgc3R5eDI6IFsweDg5LCAnU3R5eCAyJ10sXG4gIHN0eXgzOiBbMHg4YSwgJ1N0eXggMyddLFxuICAvLyBJTlZBTElEOiAweDhiXG4gIHNoeXJvbjogWzB4OGMsICdTaHlyb24nXSxcbiAgLy8gSU5WQUxJRDogMHg4ZFxuICBnb2E6IFsweDhlLCAnR29hJ10sXG4gIGdvYUZvcnRyZXNzT2FzaXNFbnRyYW5jZTogWzB4OGYsICdHb2EgRm9ydHJlc3MgLSBPYXNpcyBFbnRyYW5jZSddLFxuICBkZXNlcnQxOiBbMHg5MCwgJ0Rlc2VydCAxJ10sXG4gIG9hc2lzQ2F2ZU1haW46IFsweDkxLCAnT2FzaXMgQ2F2ZSAtIE1haW4nXSxcbiAgZGVzZXJ0Q2F2ZTE6IFsweDkyLCAnRGVzZXJ0IENhdmUgMSddLFxuICBzYWhhcmE6IFsweDkzLCAnU2FoYXJhJ10sXG4gIHNhaGFyYU91dHNpZGVDYXZlOiBbMHg5NCwgJ1NhaGFyYSAtIE91dHNpZGUgQ2F2ZSddLFxuICBkZXNlcnRDYXZlMjogWzB4OTUsICdEZXNlcnQgQ2F2ZSAyJ10sXG4gIHNhaGFyYU1lYWRvdzogWzB4OTYsICdTYWhhcmEgTWVhZG93J10sXG4gIC8vIElOVkFMSUQ6IDB4OTdcbiAgZGVzZXJ0MjogWzB4OTgsICdEZXNlcnQgMiddLFxuICAvLyBJTlZBTElEOiAweDk5XG4gIC8vIElOVkFMSUQ6IDB4OWFcbiAgLy8gSU5WQUxJRDogMHg5YlxuICBweXJhbWlkRW50cmFuY2U6IFsweDljLCAnUHlyYW1pZCAtIEVudHJhbmNlJ10sXG4gIHB5cmFtaWRCcmFuY2g6IFsweDlkLCAnUHlyYW1pZCAtIEJyYW5jaCddLFxuICBweXJhbWlkTWFpbjogWzB4OWUsICdQeXJhbWlkIC0gTWFpbiddLFxuICBweXJhbWlkRHJheWdvbjogWzB4OWYsICdQeXJhbWlkIC0gRHJheWdvbiddLFxuICBjcnlwdEVudHJhbmNlOiBbMHhhMCwgJ0NyeXB0IC0gRW50cmFuY2UnXSxcbiAgY3J5cHRIYWxsMTogWzB4YTEsICdDcnlwdCAtIEhhbGwgMSddLFxuICBjcnlwdEJyYW5jaDogWzB4YTIsICdDcnlwdCAtIEJyYW5jaCddLFxuICBjcnlwdERlYWRFbmRMZWZ0OiBbMHhhMywgJ0NyeXB0IC0gRGVhZCBFbmQgTGVmdCddLFxuICBjcnlwdERlYWRFbmRSaWdodDogWzB4YTQsICdDcnlwdCAtIERlYWQgRW5kIFJpZ2h0J10sXG4gIGNyeXB0SGFsbDI6IFsweGE1LCAnQ3J5cHQgLSBIYWxsIDInXSxcbiAgY3J5cHREcmF5Z29uMjogWzB4YTYsICdDcnlwdCAtIERyYXlnb24gMiddLFxuICBjcnlwdFRlbGVwb3J0ZXI6IFsweGE3LCAnQ3J5cHQgLSBUZWxlcG9ydGVyJ10sXG4gIGdvYUZvcnRyZXNzRW50cmFuY2U6IFsweGE4LCAnR29hIEZvcnRyZXNzIC0gRW50cmFuY2UnXSxcbiAgZ29hRm9ydHJlc3NLZWxiZXNxdWU6IFsweGE5LCAnR29hIEZvcnRyZXNzIC0gS2VsYmVzcXVlJ10sXG4gIGdvYUZvcnRyZXNzWmVidTogWzB4YWEsICdHb2EgRm9ydHJlc3MgLSBaZWJ1J10sXG4gIGdvYUZvcnRyZXNzU2FiZXJhOiBbMHhhYiwgJ0dvYSBGb3J0cmVzcyAtIFNhYmVyYSddLFxuICBnb2FGb3J0cmVzc1Rvcm5lbDogWzB4YWMsICdHb2EgRm9ydHJlc3MgLSBUb3JuZWwnXSxcbiAgZ29hRm9ydHJlc3NNYWRvMTogWzB4YWQsICdHb2EgRm9ydHJlc3MgLSBNYWRvIDEnXSxcbiAgZ29hRm9ydHJlc3NNYWRvMjogWzB4YWUsICdHb2EgRm9ydHJlc3MgLSBNYWRvIDInXSxcbiAgZ29hRm9ydHJlc3NNYWRvMzogWzB4YWYsICdHb2EgRm9ydHJlc3MgLSBNYWRvIDMnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lMTogWzB4YjAsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDEnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lMjogWzB4YjEsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDInXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lMzogWzB4YjIsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDMnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNDogWzB4YjMsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDQnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNTogWzB4YjQsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDUnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNjogWzB4YjUsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDYnXSxcbiAgZ29hRm9ydHJlc3NLYXJtaW5lNzogWzB4YjYsICdHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDcnXSxcbiAgZ29hRm9ydHJlc3NFeGl0OiBbMHhiNywgJ0dvYSBGb3J0cmVzcyAtIEV4aXQnXSxcbiAgb2FzaXNDYXZlRW50cmFuY2U6IFsweGI4LCAnT2FzaXMgQ2F2ZSAtIEVudHJhbmNlJ10sXG4gIGdvYUZvcnRyZXNzQXNpbmE6IFsweGI5LCAnR29hIEZvcnRyZXNzIC0gQXNpbmEnXSxcbiAgZ29hRm9ydHJlc3NLZW5zdTogWzB4YmEsICdHb2EgRm9ydHJlc3MgLSBLZW5zdSddLFxuICBnb2FIb3VzZTogWzB4YmIsICdHb2EgLSBIb3VzZSddLFxuICBnb2FJbm46IFsweGJjLCAnR29hIC0gSW5uJ10sXG4gIC8vIElOVkFMSUQ6IDB4YmRcbiAgZ29hVG9vbFNob3A6IFsweGJlLCAnR29hIC0gVG9vbCBTaG9wJ10sXG4gIGdvYVRhdmVybjogWzB4YmYsICdHb2EgLSBUYXZlcm4nXSxcbiAgbGVhZkVsZGVySG91c2U6IFsweGMwLCAnTGVhZiAtIEVsZGVyIEhvdXNlJ10sXG4gIGxlYWZSYWJiaXRIdXQ6IFsweGMxLCAnTGVhZiAtIFJhYmJpdCBIdXQnXSxcbiAgbGVhZklubjogWzB4YzIsICdMZWFmIC0gSW5uJ10sXG4gIGxlYWZUb29sU2hvcDogWzB4YzMsICdMZWFmIC0gVG9vbCBTaG9wJ10sXG4gIGxlYWZBcm1vclNob3A6IFsweGM0LCAnTGVhZiAtIEFybW9yIFNob3AnXSxcbiAgbGVhZlN0dWRlbnRIb3VzZTogWzB4YzUsICdMZWFmIC0gU3R1ZGVudCBIb3VzZSddLFxuICBicnlubWFlclRhdmVybjogWzB4YzYsICdCcnlubWFlciAtIFRhdmVybiddLFxuICBicnlubWFlclBhd25TaG9wOiBbMHhjNywgJ0JyeW5tYWVyIC0gUGF3biBTaG9wJ10sXG4gIGJyeW5tYWVySW5uOiBbMHhjOCwgJ0JyeW5tYWVyIC0gSW5uJ10sXG4gIGJyeW5tYWVyQXJtb3JTaG9wOiBbMHhjOSwgJ0JyeW5tYWVyIC0gQXJtb3IgU2hvcCddLFxuICAvLyBJTlZBTElEOiAweGNhXG4gIGJyeW5tYWVySXRlbVNob3A6IFsweGNiLCAnQnJ5bm1hZXIgLSBJdGVtIFNob3AnXSxcbiAgLy8gSU5WQUxJRDogMHhjY1xuICBvYWtFbGRlckhvdXNlOiBbMHhjZCwgJ09hayAtIEVsZGVyIEhvdXNlJ10sXG4gIG9ha01vdGhlckhvdXNlOiBbMHhjZSwgJ09hayAtIE1vdGhlciBIb3VzZSddLFxuICBvYWtUb29sU2hvcDogWzB4Y2YsICdPYWsgLSBUb29sIFNob3AnXSxcbiAgb2FrSW5uOiBbMHhkMCwgJ09hayAtIElubiddLFxuICBhbWF6b25lc0lubjogWzB4ZDEsICdBbWF6b25lcyAtIElubiddLFxuICBhbWF6b25lc0l0ZW1TaG9wOiBbMHhkMiwgJ0FtYXpvbmVzIC0gSXRlbSBTaG9wJ10sXG4gIGFtYXpvbmVzQXJtb3JTaG9wOiBbMHhkMywgJ0FtYXpvbmVzIC0gQXJtb3IgU2hvcCddLFxuICBhbWF6b25lc0VsZGVyOiBbMHhkNCwgJ0FtYXpvbmVzIC0gRWxkZXInXSxcbiAgbmFkYXJlOiBbMHhkNSwgJ05hZGFyZSddLFxuICBwb3J0b2FGaXNoZXJtYW5Ib3VzZTogWzB4ZDYsICdQb3J0b2EgLSBGaXNoZXJtYW4gSG91c2UnXSxcbiAgcG9ydG9hUGFsYWNlRW50cmFuY2U6IFsweGQ3LCAnUG9ydG9hIC0gUGFsYWNlIEVudHJhbmNlJ10sXG4gIHBvcnRvYUZvcnR1bmVUZWxsZXI6IFsweGQ4LCAnUG9ydG9hIC0gRm9ydHVuZSBUZWxsZXInXSxcbiAgcG9ydG9hUGF3blNob3A6IFsweGQ5LCAnUG9ydG9hIC0gUGF3biBTaG9wJ10sXG4gIHBvcnRvYUFybW9yU2hvcDogWzB4ZGEsICdQb3J0b2EgLSBBcm1vciBTaG9wJ10sXG4gIC8vIElOVkFMSUQ6IDB4ZGJcbiAgcG9ydG9hSW5uOiBbMHhkYywgJ1BvcnRvYSAtIElubiddLFxuICBwb3J0b2FUb29sU2hvcDogWzB4ZGQsICdQb3J0b2EgLSBUb29sIFNob3AnXSxcbiAgcG9ydG9hUGFsYWNlTGVmdDogWzB4ZGUsICdQb3J0b2EgLSBQYWxhY2UgTGVmdCddLFxuICBwb3J0b2FQYWxhY2VUaHJvbmVSb29tOiBbMHhkZiwgJ1BvcnRvYSAtIFBhbGFjZSBUaHJvbmUgUm9vbSddLFxuICBwb3J0b2FQYWxhY2VSaWdodDogWzB4ZTAsICdQb3J0b2EgLSBQYWxhY2UgUmlnaHQnXSxcbiAgcG9ydG9hQXNpbmFSb29tOiBbMHhlMSwgJ1BvcnRvYSAtIEFzaW5hIFJvb20nXSxcbiAgYW1hem9uZXNFbGRlckRvd25zdGFpcnM6IFsweGUyLCAnQW1hem9uZXMgLSBFbGRlciBEb3duc3RhaXJzJ10sXG4gIGpvZWxFbGRlckhvdXNlOiBbMHhlMywgJ0pvZWwgLSBFbGRlciBIb3VzZSddLFxuICBqb2VsU2hlZDogWzB4ZTQsICdKb2VsIC0gU2hlZCddLFxuICBqb2VsVG9vbFNob3A6IFsweGU1LCAnSm9lbCAtIFRvb2wgU2hvcCddLFxuICAvLyBJTlZBTElEOiAweGU2XG4gIGpvZWxJbm46IFsweGU3LCAnSm9lbCAtIElubiddLFxuICB6b21iaWVUb3duSG91c2U6IFsweGU4LCAnWm9tYmllIFRvd24gLSBIb3VzZSddLFxuICB6b21iaWVUb3duSG91c2VCYXNlbWVudDogWzB4ZTksICdab21iaWUgVG93biAtIEhvdXNlIEJhc2VtZW50J10sXG4gIC8vIElOVkFMSUQ6IDB4ZWFcbiAgc3dhblRvb2xTaG9wOiBbMHhlYiwgJ1N3YW4gLSBUb29sIFNob3AnXSxcbiAgc3dhblN0b21IdXQ6IFsweGVjLCAnU3dhbiAtIFN0b20gSHV0J10sXG4gIHN3YW5Jbm46IFsweGVkLCAnU3dhbiAtIElubiddLFxuICBzd2FuQXJtb3JTaG9wOiBbMHhlZSwgJ1N3YW4gLSBBcm1vciBTaG9wJ10sXG4gIHN3YW5UYXZlcm46IFsweGVmLCAnU3dhbiAtIFRhdmVybiddLFxuICBzd2FuUGF3blNob3A6IFsweGYwLCAnU3dhbiAtIFBhd24gU2hvcCddLFxuICBzd2FuRGFuY2VIYWxsOiBbMHhmMSwgJ1N3YW4gLSBEYW5jZSBIYWxsJ10sXG4gIHNoeXJvbkZvcnRyZXNzOiBbMHhmMiwgJ1NoeXJvbiAtIEZvcnRyZXNzJ10sXG4gIHNoeXJvblRyYWluaW5nSGFsbDogWzB4ZjMsICdTaHlyb24gLSBUcmFpbmluZyBIYWxsJ10sXG4gIHNoeXJvbkhvc3BpdGFsOiBbMHhmNCwgJ1NoeXJvbiAtIEhvc3BpdGFsJ10sXG4gIHNoeXJvbkFybW9yU2hvcDogWzB4ZjUsICdTaHlyb24gLSBBcm1vciBTaG9wJ10sXG4gIHNoeXJvblRvb2xTaG9wOiBbMHhmNiwgJ1NoeXJvbiAtIFRvb2wgU2hvcCddLFxuICBzaHlyb25Jbm46IFsweGY3LCAnU2h5cm9uIC0gSW5uJ10sXG4gIHNhaGFyYUlubjogWzB4ZjgsICdTYWhhcmEgLSBJbm4nXSxcbiAgc2FoYXJhVG9vbFNob3A6IFsweGY5LCAnU2FoYXJhIC0gVG9vbCBTaG9wJ10sXG4gIHNhaGFyYUVsZGVySG91c2U6IFsweGZhLCAnU2FoYXJhIC0gRWxkZXIgSG91c2UnXSxcbiAgc2FoYXJhUGF3blNob3A6IFsweGZiLCAnU2FoYXJhIC0gUGF3biBTaG9wJ10sXG59IGFzIGNvbnN0O1xuLy8gdHlwZSBMb2NhdGlvbnMgPSB0eXBlb2YgTE9DQVRJT05TO1xuXG4vLyBOT1RFOiB0aGlzIHdvcmtzIHRvIGNvbnN0cmFpbiB0aGUga2V5cyB0byBleGFjdGx5IHRoZSBzYW1lLlxuLy8gY29uc3QgeDoge3JlYWRvbmx5IFtUIGluIGtleW9mIHR5cGVvZiBMT0NBVElPTlNdPzogc3RyaW5nfSA9IHt9O1xuXG4vLyBOT1RFOiB0aGUgZm9sbG93aW5nIGFsbG93cyBwcmV0dHkgcm9idXN0IGNoZWNrcyFcbi8vIGNvbnN0IHggPSBjaGVjazxLZXlzT2Y8TG9jYXRpb25zLCBzdHJpbmcgfCBib29sZWFuPj4oKSh7XG4vLyAgIGxlYWY6ICd4Jyxcbi8vICAgc3dhbjogdHJ1ZSxcbi8vIH0pO1xuLy8gY29uc3QgeSA9IGNoZWNrPEtleXNPZjx0eXBlb2YgeCwgbnVtYmVyLCBzdHJpbmc+PigpKHtcbi8vICAgc3dhbjogMSxcbi8vIH0pO1xuXG4vLyB0eXBlIEtleXNPZjxULCBWID0gdW5rbm93biwgUiA9IHVua25vd24+ID0ge1tLIGluIGtleW9mIFRdPzogVFtLXSBleHRlbmRzIFIgPyBWIDogbmV2ZXJ9O1xuXG4vLyBmdW5jdGlvbiBjaGVjazxUPigpOiA8VSBleHRlbmRzIFQ+KGFyZzogVSkgPT4gVSB7XG4vLyAgIHJldHVybiBhcmcgPT4gYXJnO1xuLy8gfVxuXG4vLyBjb25zdCBsb2NhdGlvbk5hbWVzOiAoc3RyaW5nIHwgdW5kZWZpbmVkKVtdID0gKCgpID0+IHtcbi8vICAgY29uc3QgbmFtZXMgPSBbXTtcbi8vICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoTE9DQVRJT05TKSkge1xuLy8gICAgIGNvbnN0IFtpZCwgbmFtZV0gPSAoTE9DQVRJT05TIGFzIGFueSlba2V5XTtcbi8vICAgICBuYW1lc1tpZF0gPSBuYW1lO1xuLy8gICB9XG4vLyAgIHJldHVybiBuYW1lcztcbi8vIH0pKCk7XG5cbi8vIGNvbnN0IGxvY2F0aW9uS2V5czogKGxvY2F0aW9uS2V5IHwgdW5kZWZpbmVkKVtdID0gKCgpID0+IHtcbi8vICAgY29uc3Qga2V5cyA9IFtdO1xuLy8gICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhMT0NBVElPTlMpKSB7XG4vLyAgICAgY29uc3QgW2lkXSA9IChMT0NBVElPTlMgYXMgYW55KVtrZXldO1xuLy8gICAgIGtleXNbaWRdID0ga2V5O1xuLy8gICB9XG4vLyAgIHJldHVybiBrZXlzIGFzIGFueTtcbi8vIH0pKCk7XG5cblxuLy8gdmVyeSBzaW1wbGUgdmVyc2lvbiBvZiB3aGF0IHdlJ3JlIGRvaW5nIHdpdGggbWV0YXNjcmVlbnNcbmNvbnN0IHNjcmVlbkV4aXRzOiB7W2lkOiBudW1iZXJdOiByZWFkb25seSBbbnVtYmVyLCByZWFkb25seSBbbnVtYmVyLCBudW1iZXJdXX0gPSB7XG4gIDB4MTU6IFsweDkwX2EwLCBbMHg4OSwgMHg4YV1dLCAvLyBjYXZlIG9uIGxlZnQgYm91bmRhcnlcbiAgMHgxOTogWzB4NjBfOTAsIFsweDU4LCAweDU5XV0sIC8vIGNhdmUgb24gcmlnaHQgYm91bmRhcnkgKG5vdCBvbiBncmFzcylcbiAgMHg5NjogWzB4NDBfMzAsIFsweDMyLCAweDMzXV0sIC8vIHVwIHN0YWlyIGZyb20gbGVmdFxuICAweDk3OiBbMHhhZl8zMCwgWzB4YjIsIDB4YjNdXSwgLy8gZG93biBzdGFpciBmcm9tIGxlZnRcbiAgMHg5ODogWzB4NDBfZDAsIFsweDNjLCAweDNkXV0sIC8vIHVwIHN0YWlyIGZyb20gcmlnaHRcbiAgMHg5OTogWzB4YWZfZDAsIFsweGJjLCAweGJkXV0sIC8vIGRvd24gc3RhaXIgZnJvbSByaWdodFxuICAweDlhOiBbMHgxZl84MCwgWzB4MjcsIDB4MjhdXSwgLy8gZG93biBzdGFpciAoZG91YmxlIC0ganVzdCB1c2UgZG93biEpXG4gIDB4OWU6IFsweGRmXzgwLCBbMHhlNywgMHhlOF1dLCAvLyBib3R0b20gZWRnZVxuICAweGMxOiBbMHg1MF9hMCwgWzB4NDksIDB4NGFdXSwgLy8gY2F2ZSBvbiB0b3AgYm91bmRhcnlcbiAgMHhjMjogWzB4NjBfYjAsIFsweDVhLCAweDViXV0sIC8vIGNhdmUgb24gYm90dG9tLXJpZ2h0IGJvdW5kYXJ5XG4gIDB4MTlhOiBbMHhkMF84MCwgWzB4YzcsIDB4YzhdXSwgLy8gdXAgc3RhaXIgb24gZG91YmxlXG59O1xuXG4vLyBidWlsZGluZyB0aGUgQ1NWIGZvciB0aGUgbG9jYXRpb24gdGFibGUuXG4vL2NvbnN0IGg9KHgpPT54PT1udWxsPydudWxsJzonJCcreC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKTtcbi8vJ2lkLG5hbWUsYmdtLHdpZHRoLGhlaWdodCxhbmltYXRpb24sZXh0ZW5kZWQsdGlsZXBhdDAsdGlsZXBhdDEsdGlsZXBhbDAsdGlsZXBhbDEsdGlsZXNldCx0aWxlIGVmZmVjdHMsZXhpdHMsc3BycGF0MCxzcHJwYXQxLHNwcnBhbDAsc3BycGFsMSxvYmowZCxvYmowZSxvYmowZixvYmoxMCxvYmoxMSxvYmoxMixvYmoxMyxvYmoxNCxvYmoxNSxvYmoxNixvYmoxNyxvYmoxOCxvYmoxOSxvYmoxYSxvYmoxYixvYmoxYyxvYmoxZCxvYmoxZSxvYmoxZlxcbicrcm9tLmxvY2F0aW9ucy5tYXAobD0+IWx8fCFsLnVzZWQ/Jyc6W2gobC5pZCksbC5uYW1lLGgobC5iZ20pLGwubGF5b3V0V2lkdGgsbC5sYXlvdXRIZWlnaHQsbC5hbmltYXRpb24sbC5leHRlbmRlZCxoKChsLnRpbGVQYXR0ZXJuc3x8W10pWzBdKSxoKChsLnRpbGVQYXR0ZXJuc3x8W10pWzFdKSxoKChsLnRpbGVQYWxldHRlc3x8W10pWzBdKSxoKChsLnRpbGVQYWxldHRlc3x8W10pWzFdKSxoKGwudGlsZXNldCksaChsLnRpbGVFZmZlY3RzKSxbLi4ubmV3IFNldChsLmV4aXRzLm1hcCh4PT5oKHhbMl0pKSldLmpvaW4oJzonKSxoKChsLnNwcml0ZVBhdHRlcm5zfHxbXSlbMF0pLGgoKGwuc3ByaXRlUGF0dGVybnN8fFtdKVsxXSksaCgobC5zcHJpdGVQYWxldHRlc3x8W10pWzBdKSxoKChsLnNwcml0ZVBhbGV0dGVzfHxbXSlbMV0pLC4uLm5ldyBBcnJheSgxOSkuZmlsbCgwKS5tYXAoKHYsaSk9PigobC5vYmplY3RzfHxbXSlbaV18fFtdKS5zbGljZSgyKS5tYXAoeD0+eC50b1N0cmluZygxNikpLmpvaW4oJzonKSldKS5maWx0ZXIoeD0+eCkuam9pbignXFxuJylcblxuLy8gYnVpbGRpbmcgY3N2IGZvciBsb2Mtb2JqIGNyb3NzLXJlZmVyZW5jZSB0YWJsZVxuLy8gc2VxPShzLGUsZik9Pm5ldyBBcnJheShlLXMpLmZpbGwoMCkubWFwKCh4LGkpPT5mKGkrcykpO1xuLy8gdW5pcT0oYXJyKT0+e1xuLy8gICBjb25zdCBtPXt9O1xuLy8gICBmb3IgKGxldCBvIG9mIGFycikge1xuLy8gICAgIG9bNl09b1s1XT8xOjA7XG4vLyAgICAgaWYoIW9bNV0pbVtvWzJdXT0obVtvWzJdXXx8MCkrMTtcbi8vICAgfVxuLy8gICBmb3IgKGxldCBvIG9mIGFycikge1xuLy8gICAgIGlmKG9bMl0gaW4gbSlvWzZdPW1bb1syXV07XG4vLyAgICAgZGVsZXRlIG1bb1syXV07XG4vLyAgIH1cbi8vICAgcmV0dXJuIGFycjtcbi8vIH1cbi8vICdsb2MsbG9jbmFtZSxtb24sbW9ubmFtZSxzcGF3bix0eXBlLHVuaXEscGF0c2xvdCxwYXQscGFsc2xvdCxwYWwyLHBhbDNcXG4nK1xuLy8gcm9tLmxvY2F0aW9ucy5mbGF0TWFwKGw9PiFsfHwhbC51c2VkP1tdOnVuaXEoc2VxKDB4ZCwweDIwLHM9Pntcbi8vICAgY29uc3Qgbz0obC5vYmplY3RzfHxbXSlbcy0weGRdfHxudWxsO1xuLy8gICBpZiAoIW8pIHJldHVybiBudWxsO1xuLy8gICBjb25zdCB0eXBlPW9bMl0mNztcbi8vICAgY29uc3QgbT10eXBlP251bGw6MHg1MCtvWzNdO1xuLy8gICBjb25zdCBwYXRTbG90PW9bMl0mMHg4MD8xOjA7XG4vLyAgIGNvbnN0IG1vbj1tP3JvbS5vYmplY3RzW21dOm51bGw7XG4vLyAgIGNvbnN0IHBhbFNsb3Q9KG1vbj9tb24ucGFsZXR0ZXMoZmFsc2UpOltdKVswXTtcbi8vICAgY29uc3QgYWxsUGFsPW5ldyBTZXQobW9uP21vbi5wYWxldHRlcyh0cnVlKTpbXSk7XG4vLyAgIHJldHVybiBbaChsLmlkKSxsLm5hbWUsaChtKSwnJyxoKHMpLHR5cGUsMCxwYXRTbG90LG0/aCgobC5zcHJpdGVQYXR0ZXJuc3x8W10pW3BhdFNsb3RdKTonJyxwYWxTbG90LGFsbFBhbC5oYXMoMik/aCgobC5zcHJpdGVQYWxldHRlc3x8W10pWzBdKTonJyxhbGxQYWwuaGFzKDMpP2goKGwuc3ByaXRlUGFsZXR0ZXN8fFtdKVsxXSk6JyddO1xuLy8gfSkuZmlsdGVyKHg9PngpKSkubWFwKGE9PmEuam9pbignLCcpKS5maWx0ZXIoeD0+eCkuam9pbignXFxuJyk7XG4iXX0=