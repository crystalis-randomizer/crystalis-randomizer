import { Areas } from './area.js';
import { Entity } from './entity.js';
import { Metalocation } from './metalocation.js';
import { Segment, concatIterables, free, group, hex, initializer, readLittleEndian, seq, tuple, varSlice, upperCamelToSpaces } from './util.js';
import { UnionFind } from '../unionfind.js';
import { assertNever, iters, DefaultMap } from '../util.js';
import { Entrance, Exit, Flag, Pit, Spawn } from './locationtables.js';
export { Entrance, Exit, Flag, Pit, Spawn };
const { $0a, $0b, $0c, $0d } = Segment;
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
            if (init.houseType != null)
                data.houseType = init.houseType;
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
        this.Windmill = $(0x0f, { area: Areas.Windmill, music: 0,
            houseType: 'outside' });
        this.ZebuCave = $(0x10, { area: Areas.ZebuCave });
        this.MtSabreWest_Cave1 = $(0x11, { area: Areas.MtSabreWest, ...CAVE });
        this.CordelPlainWest = $(0x14, { area: Areas.CordelPlain });
        this.CordelPlainEast = $(0x15);
        this.Brynmaer = $(0x18, { area: Areas.Brynmaer });
        this.OutsideStomHouse = $(0x19, { area: Areas.StomHouse,
            music: 0 });
        this.Swamp = $(0x1a, { area: Areas.Swamp,
            bossScreen: 0x7c });
        this.Amazones = $(0x1b, { area: Areas.Amazones,
            fixed: [0x0d, 0x0e] });
        this.Oak = $(0x1c, { area: Areas.Oak });
        this.StomHouse = $(0x1e, { area: Areas.StomHouse,
            houseType: 'outside' });
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
        this.Nadare_ToolShop = $(0x3d, { ...HOUSE, houseType: 'tool' });
        this.Nadare_BackRoom = $(0x3e, { ...HOUSE, houseType: 'house' });
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
        this.BoatHouse = $(0x61, { houseType: 'outside' });
        this.JoelLighthouse = $(0x62, { area: Areas.Lighthouse,
            music: 0, houseType: 'outside' });
        this.UndergroundChannel = $(0x64, { area: Areas.UndergroundChannel });
        this.ZombieTown = $(0x65, { area: Areas.ZombieTown });
        this.EvilSpiritIsland1 = $(0x68, { area: Areas.EvilSpiritIslandEntrance,
            music: 1 });
        this.EvilSpiritIsland2 = $(0x69, { area: Areas.EvilSpiritIsland });
        this.EvilSpiritIsland3 = $(0x6a);
        this.EvilSpiritIsland4 = $(0x6b);
        this.SaberaPalace1 = $(0x6c, { area: Areas.SaberaFortress,
            bossScreen: 0xfd, houseType: 'palace' });
        this.SaberaPalace2 = $(0x6d);
        this.SaberaPalace2_West = $(-1);
        this.SaberaPalace3 = $(0x6e, { bossScreen: 0xfd });
        this.JoelSecretPassage = $(0x70, { area: Areas.JoelPassage });
        this.Joel = $(0x71, { area: Areas.Joel });
        this.Swan = $(0x72, { area: Areas.Swan, music: 1 });
        this.SwanGate = $(0x73, { area: Areas.SwanGate,
            music: 1 });
        this.GoaValley = $(0x78, { area: Areas.GoaValley });
        this.MtHydra = $(0x7c, { area: Areas.MtHydra });
        this.MtHydra_Cave1 = $(0x7d, CAVE);
        this.MtHydra_OutsideShyron = $(0x7e, { fixed: [0x0d, 0x0e] });
        this.MtHydra_Cave2 = $(0x7f, CAVE);
        this.MtHydra_Cave3 = $(0x80, CAVE);
        this.MtHydra_Cave4 = $(0x81, CAVE);
        this.MtHydra_Cave5 = $(0x82, CAVE);
        this.MtHydra_Cave6 = $(0x83, CAVE);
        this.MtHydra_Cave7 = $(0x84, CAVE);
        this.MtHydra_Cave8 = $(0x85, CAVE);
        this.MtHydra_Cave9 = $(0x86, CAVE);
        this.MtHydra_Cave10 = $(0x87, CAVE);
        this.Styx1 = $(0x88, { area: Areas.Styx,
            houseType: 'palace' });
        this.Styx2 = $(0x89);
        this.Styx2_East = $(-1);
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
        this.Pyramid_Entrance = $(0x9c, { area: Areas.Pyramid,
            houseType: 'palace' });
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
            music: 1,
            houseType: 'palace' });
        this.GoaFortress_Kelbesque = $(0xa9, { bossScreen: 0x73,
            ...KELBESQUE });
        this.GoaFortress_Zebu = $(0xaa, { ...KELBESQUE, palette: 1 });
        this.GoaFortress_Sabera = $(0xab, SABERA);
        this.GoaFortress_Tornel = $(0xac, { bossScreen: 0x91,
            ...SABERA,
            palette: 1 });
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
        this.GoaFortress_Exit = $(0xb7, { music: 0 });
        this.OasisCave_Entrance = $(0xb8, { area: Areas.OasisEntrance,
            music: 2 });
        this.GoaFortress_Asina = $(0xb9, { area: Areas.GoaFortress,
            ...MADO_UPPER,
            bossScreen: 0x91 });
        this.GoaFortress_Kensu = $(0xba, KARMINE_UPPER);
        this.Goa_House = $(0xbb, { area: Areas.Goa, ...HOUSE,
            houseType: 'house' });
        this.Goa_Inn = $(0xbc, { ...HOUSE, houseType: 'inn' });
        this.Goa_ToolShop = $(0xbe, { ...HOUSE, houseType: 'tool' });
        this.Goa_Tavern = $(0xbf, { ...HOUSE, houseType: 'tavern' });
        this.Leaf_ElderHouse = $(0xc0, { area: Areas.Leaf, ...HOUSE,
            houseType: 'house' });
        this.Leaf_RabbitHut = $(0xc1, { ...HOUSE, houseType: 'shed' });
        this.Leaf_Inn = $(0xc2, { ...HOUSE, houseType: 'inn' });
        this.Leaf_ToolShop = $(0xc3, { ...HOUSE, houseType: 'tool' });
        this.Leaf_ArmorShop = $(0xc4, { ...HOUSE, houseType: 'armor' });
        this.Leaf_StudentHouse = $(0xc5, { ...HOUSE, houseType: 'house' });
        this.Brynmaer_Tavern = $(0xc6, { area: Areas.Brynmaer, ...HOUSE,
            houseType: 'tavern' });
        this.Brynmaer_PawnShop = $(0xc7, { ...HOUSE, houseType: 'pawn' });
        this.Brynmaer_Inn = $(0xc8, { ...HOUSE, houseType: 'inn' });
        this.Brynmaer_ArmorShop = $(0xc9, { ...HOUSE, houseType: 'armor' });
        this.Brynmaer_ItemShop = $(0xcb, { ...HOUSE, houseType: 'tool' });
        this.Oak_ElderHouse = $(0xcd, { area: Areas.Oak, ...HOUSE,
            houseType: 'house' });
        this.Oak_MotherHouse = $(0xce, { ...HOUSE, houseType: 'house' });
        this.Oak_ToolShop = $(0xcf, { ...HOUSE, houseType: 'tool' });
        this.Oak_Inn = $(0xd0, { ...HOUSE, houseType: 'inn' });
        this.Amazones_Inn = $(0xd1, { area: Areas.Amazones, ...HOUSE,
            houseType: 'inn' });
        this.Amazones_ItemShop = $(0xd2, { ...HOUSE, houseType: 'tool' });
        this.Amazones_ArmorShop = $(0xd3, { ...HOUSE, houseType: 'armor' });
        this.Amazones_Elder = $(0xd4, { ...HOUSE, houseType: 'house',
            fixed: [0x0d, 0x0e] });
        this.Nadare = $(0xd5, { area: Areas.Nadare });
        this.Portoa_FishermanHouse = $(0xd6, { area: Areas.FishermanHouse,
            ...HOUSE, music: 0, houseType: 'outside' });
        this.Portoa_PalaceEntrance = $(0xd7, { area: Areas.PortoaPalace,
            houseType: 'palace' });
        this.Portoa_FortuneTeller = $(0xd8, { area: Areas.Portoa,
            fixed: [0x0d, 0x0e],
            ...FORTUNE_TELLER,
            houseType: 'house' });
        this.Portoa_PawnShop = $(0xd9, { ...HOUSE, houseType: 'pawn' });
        this.Portoa_ArmorShop = $(0xda, { ...HOUSE, houseType: 'armor' });
        this.Portoa_Inn = $(0xdc, { ...HOUSE, houseType: 'inn' });
        this.Portoa_ToolShop = $(0xdd, { ...HOUSE, houseType: 'tool' });
        this.PortoaPalace_Left = $(0xde, { area: Areas.PortoaPalace,
            ...HOUSE, houseType: 'house' });
        this.PortoaPalace_ThroneRoom = $(0xdf, HOUSE);
        this.PortoaPalace_Right = $(0xe0, { ...HOUSE, houseType: 'house' });
        this.Portoa_AsinaRoom = $(0xe1, { area: Areas.UndergroundChannel,
            ...HOUSE, music: 'asina',
        });
        this.Amazones_ElderDownstairs = $(0xe2, { area: Areas.Amazones,
            ...HOUSE });
        this.Joel_ElderHouse = $(0xe3, { area: Areas.Joel, ...HOUSE,
            houseType: 'house' });
        this.Joel_Shed = $(0xe4, { ...HOUSE, houseType: 'shed' });
        this.Joel_ToolShop = $(0xe5, { ...HOUSE, houseType: 'tool' });
        this.Joel_Inn = $(0xe7, { ...HOUSE, houseType: 'inn' });
        this.ZombieTown_House = $(0xe8, { area: Areas.ZombieTown,
            ...HOUSE, houseType: 'house' });
        this.ZombieTown_HouseBasement = $(0xe9, HOUSE);
        this.Swan_ToolShop = $(0xeb, { area: Areas.Swan, ...HOUSE,
            houseType: 'tool' });
        this.Swan_StomHut = $(0xec, { ...HOUSE, houseType: 'shed' });
        this.Swan_Inn = $(0xed, { ...HOUSE, houseType: 'inn' });
        this.Swan_ArmorShop = $(0xee, { ...HOUSE, houseType: 'armor' });
        this.Swan_Tavern = $(0xef, { ...HOUSE, houseType: 'tavern' });
        this.Swan_PawnShop = $(0xf0, { ...HOUSE, houseType: 'pawn' });
        this.Swan_DanceHall = $(0xf1, { ...HOUSE, houseType: 'house' });
        this.Shyron_Temple = $(0xf2, { area: Areas.ShyronTemple,
            bossScreen: 0x70, houseType: 'palace' });
        this.Shyron_TrainingHall = $(0xf3, { area: Areas.Shyron, ...HOUSE,
            houseType: 'house' });
        this.Shyron_Hospital = $(0xf4, { ...HOUSE, houseType: 'house' });
        this.Shyron_ArmorShop = $(0xf5, { ...HOUSE, houseType: 'armor' });
        this.Shyron_ToolShop = $(0xf6, { ...HOUSE, houseType: 'tool' });
        this.Shyron_Inn = $(0xf7, { ...HOUSE, houseType: 'inn' });
        this.Sahara_Inn = $(0xf8, { area: Areas.Sahara, ...HOUSE,
            houseType: 'inn' });
        this.Sahara_ToolShop = $(0xf9, { ...HOUSE, houseType: 'tool' });
        this.Sahara_ElderHouse = $(0xfa, { ...HOUSE, houseType: 'house' });
        this.Sahara_PawnShop = $(0xfb, { ...HOUSE, houseType: 'pawn' });
        this.EastCave1 = $(-1, { area: Areas.EastCave });
        this.EastCave2 = $(-1);
        this.EastCave3 = $(-1);
        this.FishermanBeach = $(-1, { area: Areas.FishermanHouse, ...HOUSE });
        this.locsByScreen = new DefaultMap(() => []);
        $.commit(this);
        for (let id = 0; id < 0x100; id++) {
            if (this[id]) {
                this.indexScreens(this[id]);
                continue;
            }
            this[id] = new Location(rom, id, {
                area: Areas.Unused,
                name: '',
                music: '',
                palette: '',
            });
        }
    }
    indexScreens(loc) {
        for (const row of loc.screens) {
            for (const s of row) {
                this.locsByScreen.get(s).push(loc);
            }
        }
    }
    renumberScreen(oldId, newId) {
        const locs = this.locsByScreen.get(oldId);
        this.locsByScreen.set(newId, locs);
        this.locsByScreen.delete(oldId);
        for (const loc of locs) {
            for (const row of loc.screens) {
                for (let i = 0; i < row.length; i++) {
                    if (row[i] === oldId)
                        row[i] = newId;
                }
            }
        }
    }
    allocate(location, after) {
        for (const l of this) {
            if (l.used || (after && l.id < after.id))
                continue;
            location.id = l.id;
            location.used = true;
            this.indexScreens(location);
            return this[l.id] = location;
        }
        throw new Error('No unused location');
    }
    write() {
        const a = this.rom.assembler();
        free(a, $0a, 0x84f8, 0xa000);
        free(a, $0b, 0xa000, 0xbe00);
        free(a, $0c, 0x93f9, 0xa000);
        free(a, $0d, 0xa000, 0xac00);
        free(a, $0d, 0xae00, 0xc000);
        for (const location of this) {
            location.assemble(a);
        }
        return [a.module()];
    }
    location() {
    }
}
export class Location extends Entity {
    constructor(rom, id, data) {
        super(rom, id);
        this.data = data;
        this.monstersMoved = false;
        this._isShop = undefined;
        this._meta = undefined;
        const mapDataBase = id >= 0 ? readLittleEndian(rom.prg, this.mapDataPointer) + 0xc000 : 0;
        this.used = mapDataBase > 0xc000 && !!this.name;
        if (!this.used) {
            this.bgm = this.originalBgm = 0;
            this.layoutWidth = 0;
            this.layoutHeight = 0;
            this.animation = 0;
            this.screens = [[0]];
            this.tilePalettes = [0x24, 0x01, 0x26];
            this.originalTilePalettes = [0x24, 0x01, 0x26];
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
            this.checkpoint = this.saveable = false;
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
        this.bgm = this.originalBgm = rom.prg[layoutBase];
        this.layoutWidth = rom.prg[layoutBase + 1];
        this.layoutHeight = rom.prg[layoutBase + 2];
        this.animation = rom.prg[layoutBase + 3];
        const extended = rom.prg[layoutBase + 4] ? 0x100 : 0;
        this.screens = seq(this.height, y => tuple(rom.prg, layoutBase + 5 + y * this.width, this.width)
            .map(s => extended | s));
        this.tilePalettes = tuple(rom.prg, graphicsBase, 3);
        this.originalTilePalettes = tuple(this.tilePalettes, 0, 3);
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
        this.checkpoint = !!(rom.prg[0x2ff00 | id] & 0x80);
        this.saveable = !!(rom.prg[0x2ff00 | id] & 0x01);
    }
    set meta(meta) {
        this._meta = meta;
    }
    get meta() {
        this.ensureMeta();
        return this._meta;
    }
    ensureMeta() {
        if (!this._meta)
            this._meta = Metalocation.of(this);
    }
    set musicGroup(group) {
        this._musicGroup = group;
    }
    get musicGroup() {
        this.ensureMusicGroup();
        return this._musicGroup;
    }
    ensureMusicGroup() {
        if (this._musicGroup == null) {
            const key = this.data.music;
            this._musicGroup =
                typeof key !== 'number' ? key :
                    this.rom.locations[this.exits[key].dest].musicGroup;
        }
    }
    set colorGroup(group) {
        this._colorGroup = group;
    }
    get colorGroup() {
        this.ensureColorGroup();
        return this._colorGroup;
    }
    ensureColorGroup() {
        if (this._colorGroup == null) {
            const key = this.data.music;
            this._colorGroup =
                typeof key !== 'number' ? key :
                    this.rom.locations[this.exits[key].dest].colorGroup;
        }
    }
    lazyInitialization() {
        this.ensureMeta();
        this.ensureMusicGroup();
        this.ensureColorGroup();
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
    mapPlane() {
        const set = new DefaultMap(() => new Set());
        for (const row of this.screens) {
            for (const s of row) {
                set.get(s >>> 8).add(s);
            }
        }
        if (set.size !== 1) {
            throw new Error(`Non-unique screen page for ${this}: ${[...set.values()].map(sids => [...sids].map(sid => {
                var _a;
                const [scr] = this.rom.metascreens.getById(sid);
                return `${hex(sid)} ${(_a = scr === null || scr === void 0 ? void 0 : scr.name) !== null && _a !== void 0 ? _a : '??'}`;
            }).join(', ')).join(', ')}`);
        }
        const [result] = set.keys();
        return result;
    }
    isShop() {
        if (this._isShop == null) {
            this._isShop = this.rom.shops.findIndex(s => s.location === this.id) >= 0;
            if (this.id === 0xfb)
                this._isShop = true;
        }
        return this._isShop;
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
    findOrAddEntrance(screen, coord) {
        for (let i = 0; i < this.entrances.length; i++) {
            const entrance = this.entrances[i];
            if (entrance.screen === screen && entrance.coord === coord)
                return i;
        }
        this.entrances.push(Entrance.of({ screen, coord }));
        return this.entrances.length - 1;
    }
    assemble(a) {
        if (!this.used)
            return;
        const id = this.id.toString(16).padStart(2, '0');
        const spritePal = this.spawns.length ? this.spritePalettes : [0xff, 0xff];
        const spritePat = this.spawns.length ? this.spritePatterns : [0xff, 0xff];
        const mapData = [];
        const npcData = [0, ...spritePal, ...spritePat,
            ...concatIterables(this.spawns), 0xff];
        a.segment('0c', '0d');
        a.reloc(`NpcData_${id}`);
        const $npcData = a.pc();
        a.byte(...npcData);
        a.org(0x9201 + (this.id << 1), `NpcData_${id}_Ptr`);
        a.word($npcData);
        a.segment('17');
        a.org(0xbf00 | this.id);
        a.byte(+this.checkpoint << 7 | +this.saveable);
        a.segment('0a', '0b');
        const screens = [];
        for (const s of concatIterables(this.screens)) {
            screens.push(s & 0xff);
        }
        const layout = this.rom.compressedMapData ? [
            this.bgm,
            this.layoutHeight << 4 | this.layoutWidth,
            this.mapPlane() << 2 | this.animation, ...screens,
        ] : [
            this.bgm, this.layoutWidth, this.layoutHeight,
            this.animation, this.mapPlane() ? 0x80 : 0, ...screens,
        ];
        a.reloc(`MapData_${id}_Layout`);
        const $layout = a.pc();
        a.byte(...layout);
        mapData.push($layout);
        a.reloc(`MapData_${id}_Graphics`);
        const $graphics = a.pc();
        a.byte(...this.tilePalettes, this.tileset, this.tileEffects, ...this.tilePatterns);
        mapData.push($graphics);
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
        a.reloc(`MapData_${id}_Entrances`);
        const $entrances = a.pc();
        a.byte(...concatIterables(this.entrances));
        mapData.push($entrances);
        a.reloc(`MapData_${id}_Exits`);
        const $exits = a.pc();
        a.byte(...concatIterables(this.exits), 0x80 | (this.pits.length ? 0x40 : 0) | this.entrances.length);
        mapData.push($exits);
        a.reloc(`MapData_${id}_Flags`);
        const $flags = a.pc();
        a.byte(...concatIterables(this.flags), 0xff);
        mapData.push($flags);
        const pits = concatIterables(this.pits);
        if (pits.length) {
            a.reloc(`MapData_${id}_Pits`);
            const $pits = a.pc();
            a.byte(...pits);
            mapData.push($pits);
        }
        a.reloc(`MapData_${id}`);
        const $mapData = a.pc();
        a.word(...mapData);
        a.org(0x8300 + (this.id << 1), `MapData_${id}_Ptr`);
        a.word($mapData);
        const bossId = this.bossId();
        if (bossId != null && this.id !== 0x5f) {
            let pats = [spritePat[0], undefined];
            if (this.id === 0xa6)
                pats = [0x53, 0x50];
            const bossBase = this.rom.bossKills[bossId].base;
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
            a.segment('0f');
            for (let j = 0; j < bossRestore.length; j++) {
                const restored = bossRestore[j];
                if (restored == null)
                    continue;
                a.org(bossBase + j, `Boss_${bossId}_${j}`);
                a.byte(restored);
            }
            const bossBase2 = 0xb7c1 + 5 * bossId;
            a.org(bossBase2, `Boss_${bossId}_Post`);
            a.byte(spritePal[1]);
        }
    }
    allScreens() {
        const screens = new Set();
        for (const row of this.screens) {
            for (const screen of row) {
                screens.add(this.rom.screens[screen]);
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
    isTower() {
        return (this.id & 0xf8) === 0x58;
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
                const screen = this.rom.screens[row[x]];
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
                const screen = this.rom.screens[scr];
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
        this.monstersMoved = true;
        const boss = this.data.bossScreen;
        const reachable = this.reachableTiles(false);
        const far = new Map([...reachable.keys()].map(x => [x, 0]));
        const normal = [];
        const moths = [];
        const birds = [];
        const plants = [];
        const placed = [];
        const normalTerrainMask = this.hasDolphin() ? 0x25 : 0x27;
        for (const [t, distance] of far) {
            const scr = this.screens[t >>> 12][(t >>> 8) & 0xf];
            if (scr === boss)
                continue;
            for (const n of neighbors(t, this.width, this.height)) {
                if (far.has(n))
                    continue;
                far.set(n, distance + 1);
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
            const r = m.clearance();
            const placement = m.placement();
            const pool = [...(placement === 'normal' ? normal :
                    placement === 'moth' ? moths :
                        placement === 'bird' ? birds :
                            placement === 'plant' ? plants :
                                assertNever(placement))];
            let result;
            POOL: while (pool.length) {
                const i = random.nextInt(pool.length);
                const [pos] = pool.splice(i, 1);
                const x = (pos & 0xf00) >>> 4 | (pos & 0xf);
                const y = (pos & 0xf000) >>> 8 | (pos & 0xf0) >>> 4;
                for (const { x: x1, y: y1, used } of this.entrances) {
                    if (!used)
                        continue;
                    const z2 = ((y - (y1 >> 4)) ** 2 + (x - (x1 >> 4)) ** 2);
                    if (z2 < (r + 1) ** 2)
                        continue POOL;
                }
                for (const exit of this.exits) {
                    if (!exit.isSeamless())
                        continue;
                    const { x: x1, y: y1 } = exit;
                    const z2 = ((y - (y1 >> 4)) ** 2 + (x - (x1 >> 4)) ** 2);
                    if (z2 < (r + 8) ** 2)
                        continue POOL;
                }
                for (const [, x1, y1, r1] of placed) {
                    const z2 = ((y - y1) ** 2 + (x - x1) ** 2);
                    if (!z2)
                        continue POOL;
                    if (z2 < (r + r1) ** 2) {
                        if (!result || result[2] < z2)
                            result = [x, y, z2];
                        continue POOL;
                    }
                }
                result = [x, y, Infinity];
                break;
            }
            if (result) {
                const [x, y] = result;
                placed.push([m, x, y, r]);
                const scr = (y & 0xf0) | (x & 0xf0) >>> 4;
                const tile = (y & 0x0f) << 4 | (x & 0x0f);
                return scr << 8 | tile;
            }
            return undefined;
        };
    }
    resizeScreens(top, left, bottom, right, fill = 0) {
        const newWidth = this.width + left + right;
        const newHeight = this.height + top + bottom;
        const newScreens = Array.from({ length: newHeight }, (_, y) => {
            y -= top;
            return Array.from({ length: newWidth }, (_, x) => {
                x -= left;
                if (y < 0 || x < 0 || y >= this.height || x >= this.width)
                    return fill;
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
                let tile = row[x];
                if (tile == null)
                    continue;
                if (tile < 0) {
                    tile = ~tile;
                    this.flags.push(Flag.of({ screen: (y0 + y) << 4 | (x0 + x),
                        flag: this.rom.flags.AlwaysTrue.id }));
                }
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
    toString() {
        return `${super.toString()} ${this.name}`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBTyxLQUFLLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDdEMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUNuQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFL0MsT0FBTyxFQUFDLE9BQU8sRUFDUCxlQUFlLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUM5QyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFDdEMsa0JBQWtCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFN0MsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUkxRCxPQUFPLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUM7QUFFMUMsTUFBTSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQztBQTJCckMsTUFBTSxJQUFJLEdBQUc7SUFDWCxPQUFPLEVBQUUsTUFBTTtJQUNmLEtBQUssRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0lBQzFDLE9BQU8sRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0NBQ3BDLENB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QU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyRCxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO2dCQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUM5QyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdkQsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztnQkFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDL0M7UUFFRCxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQztRQUNwQyxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFDN0IsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztZQUdoRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3BDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDdEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDdEIsS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUU7Z0JBQ25C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O0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsSUFBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLEtBQUssRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztDQUMvQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4uL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHtFeHByfSBmcm9tICcuLi9hc20vZXhwci5qcyc7XG5pbXBvcnQge01vZHVsZX0gZnJvbSAnLi4vYXNtL21vZHVsZS5qcyc7XG5pbXBvcnQge0FyZWEsIEFyZWFzfSBmcm9tICcuL2FyZWEuanMnO1xuaW1wb3J0IHtFbnRpdHl9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7TWV0YWxvY2F0aW9ufSBmcm9tICcuL21ldGFsb2NhdGlvbi5qcyc7XG5pbXBvcnQge1NjcmVlbn0gZnJvbSAnLi9zY3JlZW4uanMnO1xuaW1wb3J0IHtTZWdtZW50LFxuICAgICAgICBjb25jYXRJdGVyYWJsZXMsIGZyZWUsIGdyb3VwLCBoZXgsIGluaXRpYWxpemVyLFxuICAgICAgICByZWFkTGl0dGxlRW5kaWFuLCBzZXEsIHR1cGxlLCB2YXJTbGljZSxcbiAgICAgICAgdXBwZXJDYW1lbFRvU3BhY2VzfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7YXNzZXJ0TmV2ZXIsIGl0ZXJzLCBEZWZhdWx0TWFwfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9tb25zdGVyLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuXG5pbXBvcnQge0VudHJhbmNlLCBFeGl0LCBGbGFnLCBQaXQsIFNwYXdufSBmcm9tICcuL2xvY2F0aW9udGFibGVzLmpzJztcbmV4cG9ydCB7RW50cmFuY2UsIEV4aXQsIEZsYWcsIFBpdCwgU3Bhd259OyAvLyBUT0RPIC0gcmVtb3ZlIHRoZSByZS1leHBvcnRcblxuY29uc3QgeyQwYSwgJDBiLCAkMGMsICQwZH0gPSBTZWdtZW50O1xuXG5leHBvcnQgdHlwZSBIb3VzZVR5cGUgPSAnaW5uJyB8ICdhcm1vcicgfCAndG9vbCcgfCAndGF2ZXJuJyB8ICdwYXduJyB8XG4gICAgICAgICAgICAgICAgICAgICAgICAnc2hlZCcgfCAnaG91c2UnIHwgJ3BhbGFjZScgfCAnb3V0c2lkZSc7XG4vLyBOdW1iZXIgaW5kaWNhdGVzIHRvIGNvcHkgd2hhdGV2ZXIncyBhdCB0aGUgZ2l2ZW4gZXhpdFxudHlwZSBHcm91cEtleSA9IHN0cmluZyB8IHN5bWJvbCB8IG51bWJlcjtcbi8vIExvY2FsIGZvciBkZWZpbmluZyBuYW1lcyBvbiBMb2NhdGlvbnMgb2JqZWN0cy5cbmludGVyZmFjZSBMb2NhdGlvbkluaXQge1xuICBhcmVhPzogQXJlYTtcbiAgc3ViQXJlYT86IHN0cmluZztcbiAgbXVzaWM/OiBHcm91cEtleSB8ICgoYXJlYTogQXJlYSkgPT4gR3JvdXBLZXkpO1xuICBwYWxldHRlPzogR3JvdXBLZXkgfCAoKGFyZWE6IEFyZWEpID0+IEdyb3VwS2V5KTtcbiAgYm9zc1NjcmVlbj86IG51bWJlcjtcbiAgZml4ZWQ/OiByZWFkb25seSBudW1iZXJbXTtcbiAgaG91c2VUeXBlPzogSG91c2VUeXBlO1xufVxuaW50ZXJmYWNlIExvY2F0aW9uRGF0YSB7XG4gIGFyZWE6IEFyZWE7XG4gIG5hbWU6IHN0cmluZztcbiAgbXVzaWM6IEdyb3VwS2V5O1xuICBwYWxldHRlOiBHcm91cEtleTtcbiAgc3ViQXJlYT86IHN0cmluZztcbiAgYm9zc1NjcmVlbj86IG51bWJlcjtcbiAgZml4ZWQ/OiByZWFkb25seSBudW1iZXJbXTsgLy8gZml4ZWQgc3Bhd24gc2xvdHM/XG4gIGhvdXNlVHlwZT86IEhvdXNlVHlwZTtcbn1cblxuY29uc3QgQ0FWRSA9IHtcbiAgc3ViQXJlYTogJ2NhdmUnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tQ2F2ZWAsXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUNhdmVgLFxufSBhcyBjb25zdDtcbmNvbnN0IEhPVVNFID0ge1xuICBzdWJBcmVhOiAnaG91c2UnLFxuICBwYWxldHRlOiAoKSA9PiBTeW1ib2woKSxcbn0gYXMgY29uc3Q7XG5jb25zdCBGT1JUVU5FX1RFTExFUiA9IHtcbiAgc3ViQXJlYTogJ2hvdXNlJyxcbiAgcGFsZXR0ZTogKCkgPT4gU3ltYm9sKCksXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1Gb3J0dW5lVGVsbGVyYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBNRVNJQSA9IHtcbiAgbmFtZTogJ21lc2lhJyxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LU1lc2lhYCxcbiAgLy8gTWVzaWEgaW4gdG93ZXIga2VlcHMgc2FtZSBwYWxldHRlXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBhcmVhLm5hbWUgPT09ICdUb3dlcicgP1xuICAgICAgYXJlYS5uYW1lIDogYCR7YXJlYS5uYW1lfS1NZXNpYWAsXG59IGFzIGNvbnN0O1xuY29uc3QgRFlOQSA9IHtcbiAgbmFtZTogJ2R5bmEnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tRHluYWAsXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUR5bmFgLFxufSBhcyBjb25zdDtcbmNvbnN0IEtFTEJFU1FVRSA9IHtcbiAgbmFtZTogJ2dvYSAxJyxcbiAgbXVzaWM6ICdnb2EgMScsXG4gIHBhbGV0dGU6ICdnb2EgMScsXG59IGFzIGNvbnN0O1xuY29uc3QgU0FCRVJBID0ge1xuICBuYW1lOiAnZ29hIDInLFxuICBtdXNpYzogJ2dvYSAyJyxcbiAgcGFsZXR0ZTogJ2dvYSAyJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBNQURPX0xPV0VSID0ge1xuICBuYW1lOiAnZ29hIDMnLFxuICBtdXNpYzogJ2dvYSAzJyxcbiAgcGFsZXR0ZTogJ2dvYSAzJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBNQURPX1VQUEVSID0gey4uLk1BRE9fTE9XRVIsIHBhbGV0dGU6ICdnb2EgMyB1cHBlcid9IGFzIGNvbnN0O1xuY29uc3QgS0FSTUlORV9VUFBFUiA9IHtcbiAgbmFtZTogJ2dvYSA0JyxcbiAgbXVzaWM6ICdnb2EgNCcsXG4gIHBhbGV0dGU6ICdnb2EgNCcsXG59IGFzIGNvbnN0O1xuY29uc3QgS0FSTUlORV9MT1dFUiA9IHsuLi5LQVJNSU5FX1VQUEVSLCBwYWxldHRlOiAnZ29hIDQgbG93ZXInfSBhcyBjb25zdDtcblxudHlwZSBJbml0UGFyYW1zID0gcmVhZG9ubHkgW251bWJlciwgTG9jYXRpb25Jbml0P107XG50eXBlIEluaXQgPSB7KC4uLmFyZ3M6IEluaXRQYXJhbXMpOiBMb2NhdGlvbixcbiAgICAgICAgICAgICBjb21taXQobG9jYXRpb25zOiBMb2NhdGlvbnMpOiB2b2lkfTtcbmNvbnN0ICQ6IEluaXQgPSAoKCkgPT4ge1xuICBjb25zdCAkID0gaW5pdGlhbGl6ZXI8W251bWJlciwgTG9jYXRpb25Jbml0XSwgTG9jYXRpb24+KCk7XG4gIGxldCBhcmVhITogQXJlYTtcbiAgZnVuY3Rpb24gJCQoaWQ6IG51bWJlciwgZGF0YTogTG9jYXRpb25Jbml0ID0ge30pOiBMb2NhdGlvbiB7XG4gICAgZGF0YSA9IHsuLi5kYXRhfTtcbiAgICBhcmVhID0gZGF0YS5hcmVhID0gZGF0YS5hcmVhIHx8IGFyZWE7XG4gICAgcmV0dXJuICQoaWQsIGRhdGEpO1xuICB9O1xuICAoJCQgYXMgSW5pdCkuY29tbWl0ID0gKGxvY2F0aW9uczogTG9jYXRpb25zKSA9PiB7XG4gICAgJC5jb21taXQobG9jYXRpb25zLCAocHJvcDogc3RyaW5nLCBpZDogbnVtYmVyLCBpbml0OiBMb2NhdGlvbkluaXQpID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB1cHBlckNhbWVsVG9TcGFjZXMocHJvcCk7XG4gICAgICBjb25zdCBhcmVhID0gaW5pdC5hcmVhITtcbiAgICAgIGNvbnN0IG11c2ljID0gdHlwZW9mIGluaXQubXVzaWMgPT09ICdmdW5jdGlvbicgP1xuICAgICAgICAgIGluaXQubXVzaWMoYXJlYSkgOiBpbml0Lm11c2ljICE9IG51bGwgP1xuICAgICAgICAgIGluaXQubXVzaWMgOiBhcmVhLm5hbWU7XG4gICAgICBjb25zdCBwYWxldHRlID0gdHlwZW9mIGluaXQucGFsZXR0ZSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgaW5pdC5wYWxldHRlKGFyZWEpIDogaW5pdC5wYWxldHRlIHx8IGFyZWEubmFtZTtcbiAgICAgIGNvbnN0IGRhdGE6IExvY2F0aW9uRGF0YSA9IHthcmVhLCBuYW1lLCBtdXNpYywgcGFsZXR0ZX07XG4gICAgICBpZiAoaW5pdC5ob3VzZVR5cGUgIT0gbnVsbCkgZGF0YS5ob3VzZVR5cGUgPSBpbml0LmhvdXNlVHlwZTtcbiAgICAgIGlmIChpbml0LnN1YkFyZWEgIT0gbnVsbCkgZGF0YS5zdWJBcmVhID0gaW5pdC5zdWJBcmVhO1xuICAgICAgaWYgKGluaXQuYm9zc1NjcmVlbiAhPSBudWxsKSBkYXRhLmJvc3NTY3JlZW4gPSBpbml0LmJvc3NTY3JlZW47XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IG5ldyBMb2NhdGlvbihsb2NhdGlvbnMucm9tLCBpZCwgZGF0YSk7XG4gICAgICAvLyBuZWdhdGl2ZSBpZCBpbmRpY2F0ZXMgaXQncyBub3QgcmVnaXN0ZXJlZC5cbiAgICAgIGlmIChpZCA+PSAwKSBsb2NhdGlvbnNbaWRdID0gbG9jYXRpb247XG4gICAgICByZXR1cm4gbG9jYXRpb247XG4gICAgfSk7XG4gIH07XG4gIHJldHVybiAkJCBhcyBJbml0O1xufSkoKTtcblxuZXhwb3J0IGNsYXNzIExvY2F0aW9ucyBleHRlbmRzIEFycmF5PExvY2F0aW9uPiB7XG5cbiAgcmVhZG9ubHkgTWV6YW1lU2hyaW5lICAgICAgICAgICAgID0gJCgweDAwLCB7YXJlYTogQXJlYXMuTWV6YW1lfSk7XG4gIHJlYWRvbmx5IExlYWZfT3V0c2lkZVN0YXJ0ICAgICAgICA9ICQoMHgwMSwge211c2ljOiAxfSk7XG4gIHJlYWRvbmx5IExlYWYgICAgICAgICAgICAgICAgICAgICA9ICQoMHgwMiwge2FyZWE6IEFyZWFzLkxlYWZ9KTtcbiAgcmVhZG9ubHkgVmFsbGV5T2ZXaW5kICAgICAgICAgICAgID0gJCgweDAzLCB7YXJlYTogQXJlYXMuVmFsbGV5T2ZXaW5kfSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmUxICAgICAgICAgICAgICA9ICQoMHgwNCwge2FyZWE6IEFyZWFzLlNlYWxlZENhdmV9KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTIgICAgICAgICAgICAgID0gJCgweDA1KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTYgICAgICAgICAgICAgID0gJCgweDA2KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTQgICAgICAgICAgICAgID0gJCgweDA3KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTUgICAgICAgICAgICAgID0gJCgweDA4KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTMgICAgICAgICAgICAgID0gJCgweDA5KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTcgICAgICAgICAgICAgID0gJCgweDBhLCB7Ym9zc1NjcmVlbjogMHg5MX0pO1xuICAvLyBJTlZBTElEOiAweDBiXG4gIHJlYWRvbmx5IFNlYWxlZENhdmU4ICAgICAgICAgICAgICA9ICQoMHgwYyk7XG4gIC8vIElOVkFMSUQ6IDB4MGRcbiAgcmVhZG9ubHkgV2luZG1pbGxDYXZlICAgICAgICAgICAgID0gJCgweDBlLCB7YXJlYTogQXJlYXMuV2luZG1pbGxDYXZlfSk7XG4gIHJlYWRvbmx5IFdpbmRtaWxsICAgICAgICAgICAgICAgICA9ICQoMHgwZiwge2FyZWE6IEFyZWFzLldpbmRtaWxsLCBtdXNpYzogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnb3V0c2lkZSd9KTtcbiAgcmVhZG9ubHkgWmVidUNhdmUgICAgICAgICAgICAgICAgID0gJCgweDEwLCB7YXJlYTogQXJlYXMuWmVidUNhdmV9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTEgICAgICAgID0gJCgweDExLCB7YXJlYTogQXJlYXMuTXRTYWJyZVdlc3QsIC4uLkNBVkV9KTtcbiAgLy8gSU5WQUxJRDogMHgxMlxuICAvLyBJTlZBTElEOiAweDEzXG4gIHJlYWRvbmx5IENvcmRlbFBsYWluV2VzdCAgICAgICAgICA9ICQoMHgxNCwge2FyZWE6IEFyZWFzLkNvcmRlbFBsYWlufSk7XG4gIHJlYWRvbmx5IENvcmRlbFBsYWluRWFzdCAgICAgICAgICA9ICQoMHgxNSk7XG4gIC8vIElOVkFMSUQ6IDB4MTYgLS0gdW51c2VkIGNvcHkgb2YgMThcbiAgLy8gSU5WQUxJRDogMHgxN1xuICByZWFkb25seSBCcnlubWFlciAgICAgICAgICAgICAgICAgPSAkKDB4MTgsIHthcmVhOiBBcmVhcy5CcnlubWFlcn0pO1xuICByZWFkb25seSBPdXRzaWRlU3RvbUhvdXNlICAgICAgICAgPSAkKDB4MTksIHthcmVhOiBBcmVhcy5TdG9tSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFN3YW1wICAgICAgICAgICAgICAgICAgICA9ICQoMHgxYSwge2FyZWE6IEFyZWFzLlN3YW1wLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDdjfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzICAgICAgICAgICAgICAgICA9ICQoMHgxYiwge2FyZWE6IEFyZWFzLkFtYXpvbmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXhlZDogWzB4MGQsIDB4MGVdfSk7XG4gIHJlYWRvbmx5IE9hayAgICAgICAgICAgICAgICAgICAgICA9ICQoMHgxYywge2FyZWE6IEFyZWFzLk9ha30pO1xuICAvLyBJTlZBTElEOiAweDFkXG4gIHJlYWRvbmx5IFN0b21Ib3VzZSAgICAgICAgICAgICAgICA9ICQoMHgxZSwge2FyZWE6IEFyZWFzLlN0b21Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnb3V0c2lkZSd9KTtcbiAgLy8gSU5WQUxJRDogMHgxZlxuICByZWFkb25seSBNdFNhYnJlV2VzdF9Mb3dlciAgICAgICAgPSAkKDB4MjAsIHthcmVhOiBBcmVhcy5NdFNhYnJlV2VzdH0pO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9VcHBlciAgICAgICAgPSAkKDB4MjEpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlMiAgICAgICAgPSAkKDB4MjIsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlMyAgICAgICAgPSAkKDB4MjMsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlNCAgICAgICAgPSAkKDB4MjQsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlNSAgICAgICAgPSAkKDB4MjUsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlNiAgICAgICAgPSAkKDB4MjYsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlNyAgICAgICAgPSAkKDB4MjcsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTWFpbiAgICAgICAgPSAkKDB4MjgsIHthcmVhOiBBcmVhcy5NdFNhYnJlTm9ydGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4YjV9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX01pZGRsZSAgICAgID0gJCgweDI5KTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUyICAgICAgID0gJCgweDJhLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUzICAgICAgID0gJCgweDJiLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU0ICAgICAgID0gJCgweDJjLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU1ICAgICAgID0gJCgweDJkLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU2ICAgICAgID0gJCgweDJlLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1ByaXNvbkhhbGwgID0gJCgweDJmLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0xlZnRDZWxsICAgID0gJCgweDMwLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0xlZnRDZWxsMiAgID0gJCgweDMxLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1JpZ2h0Q2VsbCAgID0gJCgweDMyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU4ICAgICAgID0gJCgweDMzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU5ICAgICAgID0gJCgweDM0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX1N1bW1pdENhdmUgID0gJCgweDM1LCBDQVZFKTtcbiAgLy8gSU5WQUxJRDogMHgzNlxuICAvLyBJTlZBTElEOiAweDM3XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlMSAgICAgICA9ICQoMHgzOCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNyAgICAgICA9ICQoMHgzOSwgQ0FWRSk7XG4gIC8vIElOVkFMSUQ6IDB4M2FcbiAgLy8gSU5WQUxJRDogMHgzYlxuICByZWFkb25seSBOYWRhcmVfSW5uICAgICAgICAgICAgICAgPSAkKDB4M2MsIHthcmVhOiBBcmVhcy5OYWRhcmUsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IE5hZGFyZV9Ub29sU2hvcCAgICAgICAgICA9ICQoMHgzZCwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICByZWFkb25seSBOYWRhcmVfQmFja1Jvb20gICAgICAgICAgPSAkKDB4M2UsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIC8vIElOVkFMSUQ6IDB4M2ZcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsVmFsbGV5Tm9ydGggICAgID0gJCgweDQwLCB7YXJlYTogQXJlYXMuV2F0ZXJmYWxsVmFsbGV5fSk7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbFZhbGxleVNvdXRoICAgICA9ICQoMHg0MSk7XG4gIHJlYWRvbmx5IExpbWVUcmVlVmFsbGV5ICAgICAgICAgICA9ICQoMHg0Miwge2FyZWE6IEFyZWFzLkxpbWVUcmVlVmFsbGV5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBMaW1lVHJlZUxha2UgICAgICAgICAgICAgPSAkKDB4NDMsIHthcmVhOiBBcmVhcy5MaW1lVHJlZUxha2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTEgICAgICAgICA9ICQoMHg0NCwge2FyZWE6IEFyZWFzLktpcmlzYVBsYW50Q2F2ZX0pO1xuICByZWFkb25seSBLaXJpc2FQbGFudENhdmUyICAgICAgICAgPSAkKDB4NDUpO1xuICByZWFkb25seSBLaXJpc2FQbGFudENhdmUzICAgICAgICAgPSAkKDB4NDYpO1xuICByZWFkb25seSBLaXJpc2FNZWFkb3cgICAgICAgICAgICAgPSAkKDB4NDcsIHthcmVhOiBBcmVhcy5LaXJpc2FNZWFkb3d9KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUxICAgICAgICAgICAgID0gJCgweDQ4LCB7YXJlYTogQXJlYXMuRm9nTGFtcENhdmV9KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUyICAgICAgICAgICAgID0gJCgweDQ5KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUzICAgICAgICAgICAgID0gJCgweDRhKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmVEZWFkRW5kICAgICAgID0gJCgweDRiKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU0ICAgICAgICAgICAgID0gJCgweDRjKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU1ICAgICAgICAgICAgID0gJCgweDRkKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU2ICAgICAgICAgICAgID0gJCgweDRlKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU3ICAgICAgICAgICAgID0gJCgweDRmKTtcbiAgcmVhZG9ubHkgUG9ydG9hICAgICAgICAgICAgICAgICAgID0gJCgweDUwLCB7YXJlYTogQXJlYXMuUG9ydG9hfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9GaXNoZXJtYW5Jc2xhbmQgICA9ICQoMHg1MSwge2FyZWE6IEFyZWFzLkZpc2hlcm1hbkhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBNZXNpYVNocmluZSAgICAgICAgICAgICAgPSAkKDB4NTIsIHthcmVhOiBBcmVhcy5MaW1lVHJlZUxha2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLk1FU0lBfSk7XG4gIC8vIElOVkFMSUQ6IDB4NTNcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTEgICAgICAgICAgID0gJCgweDU0LCB7YXJlYTogQXJlYXMuV2F0ZXJmYWxsQ2F2ZX0pO1xuICByZWFkb25seSBXYXRlcmZhbGxDYXZlMiAgICAgICAgICAgPSAkKDB4NTUpO1xuICByZWFkb25seSBXYXRlcmZhbGxDYXZlMyAgICAgICAgICAgPSAkKDB4NTYpO1xuICByZWFkb25seSBXYXRlcmZhbGxDYXZlNCAgICAgICAgICAgPSAkKDB4NTcpO1xuICByZWFkb25seSBUb3dlckVudHJhbmNlICAgICAgICAgICAgPSAkKDB4NTgsIHthcmVhOiBBcmVhcy5Ub3dlcn0pO1xuICByZWFkb25seSBUb3dlcjEgICAgICAgICAgICAgICAgICAgPSAkKDB4NTkpO1xuICByZWFkb25seSBUb3dlcjIgICAgICAgICAgICAgICAgICAgPSAkKDB4NWEpO1xuICByZWFkb25seSBUb3dlcjMgICAgICAgICAgICAgICAgICAgPSAkKDB4NWIpO1xuICByZWFkb25seSBUb3dlck91dHNpZGVNZXNpYSAgICAgICAgPSAkKDB4NWMpO1xuICByZWFkb25seSBUb3dlck91dHNpZGVEeW5hICAgICAgICAgPSAkKDB4NWQpO1xuICByZWFkb25seSBUb3dlck1lc2lhICAgICAgICAgICAgICAgPSAkKDB4NWUsIE1FU0lBKTtcbiAgcmVhZG9ubHkgVG93ZXJEeW5hICAgICAgICAgICAgICAgID0gJCgweDVmLCBEWU5BKTtcbiAgcmVhZG9ubHkgQW5ncnlTZWEgICAgICAgICAgICAgICAgID0gJCgweDYwLCB7YXJlYTogQXJlYXMuQW5ncnlTZWF9KTtcbiAgcmVhZG9ubHkgQm9hdEhvdXNlICAgICAgICAgICAgICAgID0gJCgweDYxLCB7aG91c2VUeXBlOiAnb3V0c2lkZSd9KTtcbiAgcmVhZG9ubHkgSm9lbExpZ2h0aG91c2UgICAgICAgICAgID0gJCgweDYyLCB7YXJlYTogQXJlYXMuTGlnaHRob3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDAsIGhvdXNlVHlwZTogJ291dHNpZGUnfSk7XG4gIC8vIElOVkFMSUQ6IDB4NjNcbiAgcmVhZG9ubHkgVW5kZXJncm91bmRDaGFubmVsICAgICAgID0gJCgweDY0LCB7YXJlYTogQXJlYXMuVW5kZXJncm91bmRDaGFubmVsfSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd24gICAgICAgICAgICAgICA9ICQoMHg2NSwge2FyZWE6IEFyZWFzLlpvbWJpZVRvd259KTtcbiAgLy8gSU5WQUxJRDogMHg2NlxuICAvLyBJTlZBTElEOiAweDY3XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQxICAgICAgICA9ICQoMHg2OCwge2FyZWE6IEFyZWFzLkV2aWxTcGlyaXRJc2xhbmRFbnRyYW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDIgICAgICAgID0gJCgweDY5LCB7YXJlYTogQXJlYXMuRXZpbFNwaXJpdElzbGFuZH0pO1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kMyAgICAgICAgPSAkKDB4NmEpO1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kNCAgICAgICAgPSAkKDB4NmIpO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UxICAgICAgICAgICAgPSAkKDB4NmMsIHthcmVhOiBBcmVhcy5TYWJlcmFGb3J0cmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHhmZCwgaG91c2VUeXBlOiAncGFsYWNlJ30pO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UyICAgICAgICAgICAgPSAkKDB4NmQpO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UyX1dlc3QgICAgICAgPSAkKC0xKTsgIC8vIHdpbGwgZ2V0IHRoZSB3ZXN0IHBhcnQgb2YgcGFsYWNlMlxuICByZWFkb25seSBTYWJlcmFQYWxhY2UzICAgICAgICAgICAgPSAkKDB4NmUsIHtib3NzU2NyZWVuOiAweGZkfSk7XG4gIC8vIElOVkFMSUQ6IDB4NmYgLS0gU2FiZXJhIFBhbGFjZSAzIHVudXNlZCBjb3B5XG4gIHJlYWRvbmx5IEpvZWxTZWNyZXRQYXNzYWdlICAgICAgICA9ICQoMHg3MCwge2FyZWE6IEFyZWFzLkpvZWxQYXNzYWdlfSk7XG4gIHJlYWRvbmx5IEpvZWwgICAgICAgICAgICAgICAgICAgICA9ICQoMHg3MSwge2FyZWE6IEFyZWFzLkpvZWx9KTtcbiAgcmVhZG9ubHkgU3dhbiAgICAgICAgICAgICAgICAgICAgID0gJCgweDcyLCB7YXJlYTogQXJlYXMuU3dhbiwgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgU3dhbkdhdGUgICAgICAgICAgICAgICAgID0gJCgweDczLCB7YXJlYTogQXJlYXMuU3dhbkdhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAxfSk7XG4gIC8vIElOVkFMSUQ6IDB4NzRcbiAgLy8gSU5WQUxJRDogMHg3NVxuICAvLyBJTlZBTElEOiAweDc2XG4gIC8vIElOVkFMSUQ6IDB4NzdcbiAgcmVhZG9ubHkgR29hVmFsbGV5ICAgICAgICAgICAgICAgID0gJCgweDc4LCB7YXJlYTogQXJlYXMuR29hVmFsbGV5fSk7XG4gIC8vIElOVkFMSUQ6IDB4NzlcbiAgLy8gSU5WQUxJRDogMHg3YVxuICAvLyBJTlZBTElEOiAweDdiXG4gIHJlYWRvbmx5IE10SHlkcmEgICAgICAgICAgICAgICAgICA9ICQoMHg3Yywge2FyZWE6IEFyZWFzLk10SHlkcmF9KTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMSAgICAgICAgICAgID0gJCgweDdkLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9PdXRzaWRlU2h5cm9uICAgID0gJCgweDdlLCB7Zml4ZWQ6IFsweDBkLCAweDBlXX0pOyAvLyBndWFyZHNcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMiAgICAgICAgICAgID0gJCgweDdmLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMyAgICAgICAgICAgID0gJCgweDgwLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNCAgICAgICAgICAgID0gJCgweDgxLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNSAgICAgICAgICAgID0gJCgweDgyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNiAgICAgICAgICAgID0gJCgweDgzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNyAgICAgICAgICAgID0gJCgweDg0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlOCAgICAgICAgICAgID0gJCgweDg1LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlOSAgICAgICAgICAgID0gJCgweDg2LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMTAgICAgICAgICAgID0gJCgweDg3LCBDQVZFKTtcbiAgcmVhZG9ubHkgU3R5eDEgICAgICAgICAgICAgICAgICAgID0gJCgweDg4LCB7YXJlYTogQXJlYXMuU3R5eCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAncGFsYWNlJ30pO1xuICByZWFkb25seSBTdHl4MiAgICAgICAgICAgICAgICAgICAgPSAkKDB4ODkpO1xuICByZWFkb25seSBTdHl4Ml9FYXN0ICAgICAgICAgICAgICAgPSAkKC0xKTsgIC8vIHdpbGwgZ2V0IHRoZSBlYXN0IHBhcnQgb2Ygc3R4eSAyXG4gIHJlYWRvbmx5IFN0eXgzICAgICAgICAgICAgICAgICAgICA9ICQoMHg4YSk7XG4gIC8vIElOVkFMSUQ6IDB4OGJcbiAgcmVhZG9ubHkgU2h5cm9uICAgICAgICAgICAgICAgICAgID0gJCgweDhjLCB7YXJlYTogQXJlYXMuU2h5cm9ufSk7XG4gIC8vIElOVkFMSUQ6IDB4OGRcbiAgcmVhZG9ubHkgR29hICAgICAgICAgICAgICAgICAgICAgID0gJCgweDhlLCB7YXJlYTogQXJlYXMuR29hfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzQmFzZW1lbnQgICAgICA9ICQoMHg4Ziwge2FyZWE6IEFyZWFzLkZvcnRyZXNzQmFzZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IERlc2VydDEgICAgICAgICAgICAgICAgICA9ICQoMHg5MCwge2FyZWE6IEFyZWFzLkRlc2VydDF9KTtcbiAgcmVhZG9ubHkgT2FzaXNDYXZlTWFpbiAgICAgICAgICAgID0gJCgweDkxLCB7YXJlYTogQXJlYXMuT2FzaXNDYXZlfSk7XG4gIHJlYWRvbmx5IERlc2VydENhdmUxICAgICAgICAgICAgICA9ICQoMHg5Miwge2FyZWE6IEFyZWFzLkRlc2VydENhdmUxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBTYWhhcmEgICAgICAgICAgICAgICAgICAgPSAkKDB4OTMsIHthcmVhOiBBcmVhcy5TYWhhcmF9KTtcbiAgcmVhZG9ubHkgU2FoYXJhT3V0c2lkZUNhdmUgICAgICAgID0gJCgweDk0LCB7bXVzaWM6IDB9KTsgLy8gVE9ETyAtIHNhaGFyYT8/IGdlbmVyaWM/P1xuICByZWFkb25seSBEZXNlcnRDYXZlMiAgICAgICAgICAgICAgPSAkKDB4OTUsIHthcmVhOiBBcmVhcy5EZXNlcnRDYXZlMiwgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgU2FoYXJhTWVhZG93ICAgICAgICAgICAgID0gJCgweDk2LCB7YXJlYTogQXJlYXMuU2FoYXJhTWVhZG93LCBtdXNpYzogMH0pO1xuICAvLyBJTlZBTElEOiAweDk3XG4gIHJlYWRvbmx5IERlc2VydDIgICAgICAgICAgICAgICAgICA9ICQoMHg5OCwge2FyZWE6IEFyZWFzLkRlc2VydDJ9KTtcbiAgLy8gSU5WQUxJRDogMHg5OVxuICAvLyBJTlZBTElEOiAweDlhXG4gIC8vIElOVkFMSUQ6IDB4OWJcbiAgcmVhZG9ubHkgUHlyYW1pZF9FbnRyYW5jZSAgICAgICAgID0gJCgweDljLCB7YXJlYTogQXJlYXMuUHlyYW1pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAncGFsYWNlJ30pO1xuICByZWFkb25seSBQeXJhbWlkX0JyYW5jaCAgICAgICAgICAgPSAkKDB4OWQpO1xuICByZWFkb25seSBQeXJhbWlkX01haW4gICAgICAgICAgICAgPSAkKDB4OWUpO1xuICByZWFkb25seSBQeXJhbWlkX0RyYXlnb24gICAgICAgICAgPSAkKDB4OWYpO1xuICByZWFkb25seSBDcnlwdF9FbnRyYW5jZSAgICAgICAgICAgPSAkKDB4YTAsIHthcmVhOiBBcmVhcy5DcnlwdH0pO1xuICByZWFkb25seSBDcnlwdF9IYWxsMSAgICAgICAgICAgICAgPSAkKDB4YTEpO1xuICByZWFkb25seSBDcnlwdF9CcmFuY2ggICAgICAgICAgICAgPSAkKDB4YTIpO1xuICByZWFkb25seSBDcnlwdF9EZWFkRW5kTGVmdCAgICAgICAgPSAkKDB4YTMpO1xuICByZWFkb25seSBDcnlwdF9EZWFkRW5kUmlnaHQgICAgICAgPSAkKDB4YTQpO1xuICByZWFkb25seSBDcnlwdF9IYWxsMiAgICAgICAgICAgICAgPSAkKDB4YTUpO1xuICByZWFkb25seSBDcnlwdF9EcmF5Z29uMiAgICAgICAgICAgPSAkKDB4YTYpO1xuICByZWFkb25seSBDcnlwdF9UZWxlcG9ydGVyICAgICAgICAgPSAkKDB4YTcsIHttdXNpYzogJ0NyeXB0LVRlbGVwb3J0ZXInfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0VudHJhbmNlICAgICA9ICQoMHhhOCwge2FyZWE6IEFyZWFzLkdvYUZvcnRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMSwgLy8gc2FtZSBhcyBuZXh0IGFyZWFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAncGFsYWNlJ30pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LZWxiZXNxdWUgICAgPSAkKDB4YTksIHtib3NzU2NyZWVuOiAweDczLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5LRUxCRVNRVUV9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfWmVidSAgICAgICAgID0gJCgweGFhLCB7Li4uS0VMQkVTUVVFLCBwYWxldHRlOiAxfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX1NhYmVyYSAgICAgICA9ICQoMHhhYiwgU0FCRVJBKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfVG9ybmVsICAgICAgID0gJCgweGFjLCB7Ym9zc1NjcmVlbjogMHg5MSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uU0FCRVJBLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWxldHRlOiAxfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8xICAgICAgICA9ICQoMHhhZCwgTUFET19MT1dFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8yICAgICAgICA9ICQoMHhhZSwgTUFET19VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8zICAgICAgICA9ICQoMHhhZiwgTUFET19VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUxICAgICA9ICQoMHhiMCwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUyICAgICA9ICQoMHhiMSwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUzICAgICA9ICQoMHhiMiwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU0ICAgICA9ICQoMHhiMywgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU1ICAgICA9ICQoMHhiNCwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU2ICAgICA9ICQoMHhiNSwgS0FSTUlORV9MT1dFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU3ICAgICA9ICQoMHhiNiwge2Jvc3NTY3JlZW46IDB4ZmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLktBUk1JTkVfTE9XRVJ9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfRXhpdCAgICAgICAgID0gJCgweGI3LCB7bXVzaWM6IDB9KTsgLy8gc2FtZSBhcyB0b3AgZ29hXG4gIHJlYWRvbmx5IE9hc2lzQ2F2ZV9FbnRyYW5jZSAgICAgICA9ICQoMHhiOCwge2FyZWE6IEFyZWFzLk9hc2lzRW50cmFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAyfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0FzaW5hICAgICAgICA9ICQoMHhiOSwge2FyZWE6IEFyZWFzLkdvYUZvcnRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5NQURPX1VQUEVSLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDkxfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0tlbnN1ICAgICAgICA9ICQoMHhiYSwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYV9Ib3VzZSAgICAgICAgICAgICAgICA9ICQoMHhiYiwge2FyZWE6IEFyZWFzLkdvYSwgLi4uSE9VU0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdXNlVHlwZTogJ2hvdXNlJ30pO1xuICByZWFkb25seSBHb2FfSW5uICAgICAgICAgICAgICAgICAgPSAkKDB4YmMsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaW5uJ30pO1xuICAvLyBJTlZBTElEOiAweGJkXG4gIHJlYWRvbmx5IEdvYV9Ub29sU2hvcCAgICAgICAgICAgICA9ICQoMHhiZSwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICByZWFkb25seSBHb2FfVGF2ZXJuICAgICAgICAgICAgICAgPSAkKDB4YmYsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAndGF2ZXJuJ30pO1xuICByZWFkb25seSBMZWFmX0VsZGVySG91c2UgICAgICAgICAgPSAkKDB4YzAsIHthcmVhOiBBcmVhcy5MZWFmLCAuLi5IT1VTRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IExlYWZfUmFiYml0SHV0ICAgICAgICAgICA9ICQoMHhjMSwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdzaGVkJ30pO1xuICByZWFkb25seSBMZWFmX0lubiAgICAgICAgICAgICAgICAgPSAkKDB4YzIsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaW5uJ30pO1xuICByZWFkb25seSBMZWFmX1Rvb2xTaG9wICAgICAgICAgICAgPSAkKDB4YzMsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAndG9vbCd9KTtcbiAgcmVhZG9ubHkgTGVhZl9Bcm1vclNob3AgICAgICAgICAgID0gJCgweGM0LCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2FybW9yJ30pO1xuICByZWFkb25seSBMZWFmX1N0dWRlbnRIb3VzZSAgICAgICAgPSAkKDB4YzUsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX1RhdmVybiAgICAgICAgICA9ICQoMHhjNiwge2FyZWE6IEFyZWFzLkJyeW5tYWVyLCAuLi5IT1VTRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAndGF2ZXJuJ30pO1xuICByZWFkb25seSBCcnlubWFlcl9QYXduU2hvcCAgICAgICAgPSAkKDB4YzcsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAncGF3bid9KTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfSW5uICAgICAgICAgICAgID0gJCgweGM4LCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2lubid9KTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfQXJtb3JTaG9wICAgICAgID0gJCgweGM5LCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2FybW9yJ30pO1xuICAvLyBJTlZBTElEOiAweGNhXG4gIHJlYWRvbmx5IEJyeW5tYWVyX0l0ZW1TaG9wICAgICAgICA9ICQoMHhjYiwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICAvLyBJTlZBTElEOiAweGNjXG4gIHJlYWRvbmx5IE9ha19FbGRlckhvdXNlICAgICAgICAgICA9ICQoMHhjZCwge2FyZWE6IEFyZWFzLk9haywgLi4uSE9VU0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdXNlVHlwZTogJ2hvdXNlJ30pO1xuICByZWFkb25seSBPYWtfTW90aGVySG91c2UgICAgICAgICAgPSAkKDB4Y2UsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IE9ha19Ub29sU2hvcCAgICAgICAgICAgICA9ICQoMHhjZiwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICByZWFkb25seSBPYWtfSW5uICAgICAgICAgICAgICAgICAgPSAkKDB4ZDAsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaW5uJ30pO1xuICByZWFkb25seSBBbWF6b25lc19Jbm4gICAgICAgICAgICAgPSAkKDB4ZDEsIHthcmVhOiBBcmVhcy5BbWF6b25lcywgLi4uSE9VU0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdXNlVHlwZTogJ2lubid9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfSXRlbVNob3AgICAgICAgID0gJCgweGQyLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ3Rvb2wnfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0FybW9yU2hvcCAgICAgICA9ICQoMHhkMywgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdhcm1vcid9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfRWxkZXIgICAgICAgICAgID0gJCgweGQ0LCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2hvdXNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZml4ZWQ6IFsweDBkLCAweDBlXX0pOyAvLyBndWFyZHNcbiAgcmVhZG9ubHkgTmFkYXJlICAgICAgICAgICAgICAgICAgID0gJCgweGQ1LCB7YXJlYTogQXJlYXMuTmFkYXJlfSk7IC8vIGVkZ2UtZG9vcj9cbiAgcmVhZG9ubHkgUG9ydG9hX0Zpc2hlcm1hbkhvdXNlICAgID0gJCgweGQ2LCB7YXJlYTogQXJlYXMuRmlzaGVybWFuSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFLCBtdXNpYzogMCwgaG91c2VUeXBlOiAnb3V0c2lkZSd9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX1BhbGFjZUVudHJhbmNlICAgID0gJCgweGQ3LCB7YXJlYTogQXJlYXMuUG9ydG9hUGFsYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdwYWxhY2UnfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Gb3J0dW5lVGVsbGVyICAgICA9ICQoMHhkOCwge2FyZWE6IEFyZWFzLlBvcnRvYSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZml4ZWQ6IFsweDBkLCAweDBlXSwgLy8gZ3VhcmQvZW1wdHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uRk9SVFVORV9URUxMRVIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdXNlVHlwZTogJ2hvdXNlJ30pO1xuICByZWFkb25seSBQb3J0b2FfUGF3blNob3AgICAgICAgICAgPSAkKDB4ZDksIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAncGF3bid9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX0FybW9yU2hvcCAgICAgICAgID0gJCgweGRhLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2FybW9yJ30pO1xuICAvLyBJTlZBTElEOiAweGRiXG4gIHJlYWRvbmx5IFBvcnRvYV9Jbm4gICAgICAgICAgICAgICA9ICQoMHhkYywgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdpbm4nfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhkZCwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfTGVmdCAgICAgICAgPSAkKDB4ZGUsIHthcmVhOiBBcmVhcy5Qb3J0b2FQYWxhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFLCBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgUG9ydG9hUGFsYWNlX1Rocm9uZVJvb20gID0gJCgweGRmLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYVBhbGFjZV9SaWdodCAgICAgICA9ICQoMHhlMCwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX0FzaW5hUm9vbSAgICAgICAgID0gJCgweGUxLCB7YXJlYTogQXJlYXMuVW5kZXJncm91bmRDaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRSwgbXVzaWM6ICdhc2luYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gLSBjb25zaWRlciBwYWxhY2UvaG91c2U/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0VsZGVyRG93bnN0YWlycyA9ICQoMHhlMiwge2FyZWE6IEFyZWFzLkFtYXpvbmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRX0pO1xuICByZWFkb25seSBKb2VsX0VsZGVySG91c2UgICAgICAgICAgPSAkKDB4ZTMsIHthcmVhOiBBcmVhcy5Kb2VsLCAuLi5IT1VTRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IEpvZWxfU2hlZCAgICAgICAgICAgICAgICA9ICQoMHhlNCwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdzaGVkJ30pO1xuICByZWFkb25seSBKb2VsX1Rvb2xTaG9wICAgICAgICAgICAgPSAkKDB4ZTUsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAndG9vbCd9KTtcbiAgLy8gSU5WQUxJRDogMHhlNlxuICByZWFkb25seSBKb2VsX0lubiAgICAgICAgICAgICAgICAgPSAkKDB4ZTcsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaW5uJ30pO1xuICByZWFkb25seSBab21iaWVUb3duX0hvdXNlICAgICAgICAgPSAkKDB4ZTgsIHthcmVhOiBBcmVhcy5ab21iaWVUb3duLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRSwgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd25fSG91c2VCYXNlbWVudCA9ICQoMHhlOSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGVhXG4gIHJlYWRvbmx5IFN3YW5fVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhlYiwge2FyZWE6IEFyZWFzLlN3YW4sIC4uLkhPVVNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICd0b29sJ30pO1xuICByZWFkb25seSBTd2FuX1N0b21IdXQgICAgICAgICAgICAgPSAkKDB4ZWMsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnc2hlZCd9KTtcbiAgcmVhZG9ubHkgU3dhbl9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGVkLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2lubid9KTtcbiAgcmVhZG9ubHkgU3dhbl9Bcm1vclNob3AgICAgICAgICAgID0gJCgweGVlLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2FybW9yJ30pO1xuICByZWFkb25seSBTd2FuX1RhdmVybiAgICAgICAgICAgICAgPSAkKDB4ZWYsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAndGF2ZXJuJ30pO1xuICByZWFkb25seSBTd2FuX1Bhd25TaG9wICAgICAgICAgICAgPSAkKDB4ZjAsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAncGF3bid9KTtcbiAgcmVhZG9ubHkgU3dhbl9EYW5jZUhhbGwgICAgICAgICAgID0gJCgweGYxLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2hvdXNlJ30pO1xuICByZWFkb25seSBTaHlyb25fVGVtcGxlICAgICAgICAgICAgPSAkKDB4ZjIsIHthcmVhOiBBcmVhcy5TaHlyb25UZW1wbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4NzAsIGhvdXNlVHlwZTogJ3BhbGFjZSd9KTtcbiAgcmVhZG9ubHkgU2h5cm9uX1RyYWluaW5nSGFsbCAgICAgID0gJCgweGYzLCB7YXJlYTogQXJlYXMuU2h5cm9uLCAuLi5IT1VTRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Ib3NwaXRhbCAgICAgICAgICA9ICQoMHhmNCwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgU2h5cm9uX0FybW9yU2hvcCAgICAgICAgID0gJCgweGY1LCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2FybW9yJ30pO1xuICByZWFkb25seSBTaHlyb25fVG9vbFNob3AgICAgICAgICAgPSAkKDB4ZjYsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAndG9vbCd9KTtcbiAgcmVhZG9ubHkgU2h5cm9uX0lubiAgICAgICAgICAgICAgID0gJCgweGY3LCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2lubid9KTtcbiAgcmVhZG9ubHkgU2FoYXJhX0lubiAgICAgICAgICAgICAgID0gJCgweGY4LCB7YXJlYTogQXJlYXMuU2FoYXJhLCAuLi5IT1VTRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnaW5uJ30pO1xuICByZWFkb25seSBTYWhhcmFfVG9vbFNob3AgICAgICAgICAgPSAkKDB4ZjksIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAndG9vbCd9KTtcbiAgcmVhZG9ubHkgU2FoYXJhX0VsZGVySG91c2UgICAgICAgID0gJCgweGZhLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2hvdXNlJ30pO1xuICByZWFkb25seSBTYWhhcmFfUGF3blNob3AgICAgICAgICAgPSAkKDB4ZmIsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAncGF3bid9KTtcblxuICAvLyBOZXcgbG9jYXRpb25zLCBubyBJRCBwcm9jdXJlZCB5ZXQuXG4gIHJlYWRvbmx5IEVhc3RDYXZlMSAgICAgID0gJCgtMSwge2FyZWE6IEFyZWFzLkVhc3RDYXZlfSk7XG4gIHJlYWRvbmx5IEVhc3RDYXZlMiAgICAgID0gJCgtMSk7XG4gIHJlYWRvbmx5IEVhc3RDYXZlMyAgICAgID0gJCgtMSk7XG4gIHJlYWRvbmx5IEZpc2hlcm1hbkJlYWNoID0gJCgtMSwge2FyZWE6IEFyZWFzLkZpc2hlcm1hbkhvdXNlLCAuLi5IT1VTRX0pO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jc0J5U2NyZWVuID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBMb2NhdGlvbltdPigoKSA9PiBbXSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICBzdXBlcigweDEwMCk7XG4gICAgJC5jb21taXQodGhpcyk7XG4gICAgLy8gRmlsbCBpbiBhbnkgbWlzc2luZyBvbmVzXG4gICAgZm9yIChsZXQgaWQgPSAwOyBpZCA8IDB4MTAwOyBpZCsrKSB7XG4gICAgICBpZiAodGhpc1tpZF0pIHtcbiAgICAgICAgdGhpcy5pbmRleFNjcmVlbnModGhpc1tpZF0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXNbaWRdID0gbmV3IExvY2F0aW9uKHJvbSwgaWQsIHtcbiAgICAgICAgYXJlYTogQXJlYXMuVW51c2VkLFxuICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgbXVzaWM6ICcnLFxuICAgICAgICBwYWxldHRlOiAnJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBUT0RPIC0gbWV0aG9kIHRvIGFkZCBhbiB1bnJlZ2lzdGVyZWQgbG9jYXRpb24gdG8gYW4gZW1wdHkgaW5kZXguXG4gIH1cblxuICBpbmRleFNjcmVlbnMobG9jOiBMb2NhdGlvbikge1xuICAgIGZvciAoY29uc3Qgcm93IG9mIGxvYy5zY3JlZW5zKSB7XG4gICAgICBmb3IgKGNvbnN0IHMgb2Ygcm93KSB7XG4gICAgICAgIHRoaXMubG9jc0J5U2NyZWVuLmdldChzKS5wdXNoKGxvYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVudW1iZXJTY3JlZW4ob2xkSWQ6IG51bWJlciwgbmV3SWQ6IG51bWJlcikge1xuICAgIGNvbnN0IGxvY3MgPSB0aGlzLmxvY3NCeVNjcmVlbi5nZXQob2xkSWQpO1xuICAgIHRoaXMubG9jc0J5U2NyZWVuLnNldChuZXdJZCwgbG9jcyk7XG4gICAgdGhpcy5sb2NzQnlTY3JlZW4uZGVsZXRlKG9sZElkKTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBsb2NzKSB7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvdy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChyb3dbaV0gPT09IG9sZElkKSByb3dbaV0gPSBuZXdJZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFsbG9jYXRlKGxvY2F0aW9uOiBMb2NhdGlvbiwgYWZ0ZXI/OiBMb2NhdGlvbik6IExvY2F0aW9uIHtcbiAgICAvLyBwaWNrIGFuIHVudXNlZCBsb2NhdGlvblxuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzKSB7XG4gICAgICBpZiAobC51c2VkIHx8IChhZnRlciAmJiBsLmlkIDwgYWZ0ZXIuaWQpKSBjb250aW51ZTtcbiAgICAgIChsb2NhdGlvbiBhcyBhbnkpLmlkID0gbC5pZDtcbiAgICAgIGxvY2F0aW9uLnVzZWQgPSB0cnVlO1xuICAgICAgdGhpcy5pbmRleFNjcmVlbnMobG9jYXRpb24pO1xuICAgICAgcmV0dXJuIHRoaXNbbC5pZF0gPSBsb2NhdGlvbjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyB1bnVzZWQgbG9jYXRpb24nKTtcbiAgfVxuXG4gIHdyaXRlKCk6IE1vZHVsZVtdIHtcbiAgICBjb25zdCBhID0gdGhpcy5yb20uYXNzZW1ibGVyKCk7XG4gICAgZnJlZShhLCAkMGEsIDB4ODRmOCwgMHhhMDAwKTtcbiAgICBmcmVlKGEsICQwYiwgMHhhMDAwLCAweGJlMDApO1xuICAgIGZyZWUoYSwgJDBjLCAweDkzZjksIDB4YTAwMCk7XG4gICAgZnJlZShhLCAkMGQsIDB4YTAwMCwgMHhhYzAwKTtcbiAgICBmcmVlKGEsICQwZCwgMHhhZTAwLCAweGMwMDApOyAvLyBiZjAwID8/P1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcykge1xuICAgICAgbG9jYXRpb24uYXNzZW1ibGUoYSk7XG4gICAgfVxuICAgIHJldHVybiBbYS5tb2R1bGUoKV07XG4gIH1cblxuICBsb2NhdGlvbigpIHtcbiAgICAvLyA/Pz8gd2hhdCB3YXMgdGhpcyBzdXBwb3NlZCB0byBiZT9cbiAgfVxufVxuXG4vLyBMb2NhdGlvbiBlbnRpdGllc1xuZXhwb3J0IGNsYXNzIExvY2F0aW9uIGV4dGVuZHMgRW50aXR5IHtcblxuICB1c2VkOiBib29sZWFuO1xuXG4gIGNoZWNrcG9pbnQ6IGJvb2xlYW47XG4gIHNhdmVhYmxlOiBib29sZWFuO1xuXG4gIGJnbTogbnVtYmVyO1xuICBvcmlnaW5hbEJnbTogbnVtYmVyO1xuICBsYXlvdXRXaWR0aDogbnVtYmVyO1xuICBsYXlvdXRIZWlnaHQ6IG51bWJlcjtcbiAgYW5pbWF0aW9uOiBudW1iZXI7XG4gIC8vIFNjcmVlbiBpbmRpY2VzIGFyZSAoZXh0ZW5kZWQgPDwgOCB8IHNjcmVlbilcbiAgLy8gZXh0ZW5kZWQ6IG51bWJlcjtcbiAgc2NyZWVuczogbnVtYmVyW11bXTtcblxuICB0aWxlUGF0dGVybnM6IFtudW1iZXIsIG51bWJlcl07XG4gIHRpbGVQYWxldHRlczogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICBvcmlnaW5hbFRpbGVQYWxldHRlczogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICB0aWxlc2V0OiBudW1iZXI7XG4gIHRpbGVFZmZlY3RzOiBudW1iZXI7XG5cbiAgZW50cmFuY2VzOiBFbnRyYW5jZVtdO1xuICBleGl0czogRXhpdFtdO1xuICBmbGFnczogRmxhZ1tdO1xuICBwaXRzOiBQaXRbXTtcblxuICBzcHJpdGVQYWxldHRlczogW251bWJlciwgbnVtYmVyXTtcbiAgc3ByaXRlUGF0dGVybnM6IFtudW1iZXIsIG51bWJlcl07XG4gIHNwYXduczogU3Bhd25bXTtcblxuICBtb25zdGVyc01vdmVkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBfaXNTaG9wOiBib29sZWFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfbWV0YT86IE1ldGFsb2NhdGlvbiA9IHVuZGVmaW5lZDtcbiAgLy8gTGF6aWx5LXBvcHVsYXRlZCBtYXAga2V5cyBmb3Iga2VlcGluZyBjb25zaXN0ZW50IG11c2ljIGFuZCBjb2xvcnMuXG4gIHByaXZhdGUgX211c2ljR3JvdXA/OiBzdHJpbmd8c3ltYm9sO1xuICBwcml2YXRlIF9jb2xvckdyb3VwPzogc3RyaW5nfHN5bWJvbDtcblxuICBjb25zdHJ1Y3Rvcihyb206IFJvbSwgaWQ6IG51bWJlciwgcmVhZG9ubHkgZGF0YTogTG9jYXRpb25EYXRhKSB7XG4gICAgLy8gd2lsbCBpbmNsdWRlIGJvdGggTWFwRGF0YSAqYW5kKiBOcGNEYXRhLCBzaW5jZSB0aGV5IHNoYXJlIGEga2V5LlxuICAgIHN1cGVyKHJvbSwgaWQpO1xuXG4gICAgY29uc3QgbWFwRGF0YUJhc2UgPVxuICAgICAgICBpZCA+PSAwID8gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFQb2ludGVyKSArIDB4YzAwMCA6IDA7XG4gICAgLy8gVE9ETyAtIHBhc3MgdGhpcyBpbiBhbmQgbW92ZSBMT0NBVElPTlMgdG8gbG9jYXRpb25zLnRzXG4gICAgdGhpcy51c2VkID0gbWFwRGF0YUJhc2UgPiAweGMwMDAgJiYgISF0aGlzLm5hbWU7XG5cbiAgICBpZiAoIXRoaXMudXNlZCkge1xuICAgICAgdGhpcy5iZ20gPSB0aGlzLm9yaWdpbmFsQmdtID0gMDtcbiAgICAgIHRoaXMubGF5b3V0V2lkdGggPSAwO1xuICAgICAgdGhpcy5sYXlvdXRIZWlnaHQgPSAwO1xuICAgICAgdGhpcy5hbmltYXRpb24gPSAwO1xuICAgICAgLy8gdGhpcy5leHRlbmRlZCA9IDA7XG4gICAgICB0aGlzLnNjcmVlbnMgPSBbWzBdXTtcbiAgICAgIHRoaXMudGlsZVBhbGV0dGVzID0gWzB4MjQsIDB4MDEsIDB4MjZdO1xuICAgICAgdGhpcy5vcmlnaW5hbFRpbGVQYWxldHRlcyA9IFsweDI0LCAweDAxLCAweDI2XTtcbiAgICAgIHRoaXMudGlsZXNldCA9IDB4ODA7XG4gICAgICB0aGlzLnRpbGVFZmZlY3RzID0gMHhiMztcbiAgICAgIHRoaXMudGlsZVBhdHRlcm5zID0gWzIsIDRdO1xuICAgICAgdGhpcy5leGl0cyA9IFtdO1xuICAgICAgdGhpcy5lbnRyYW5jZXMgPSBbXTtcbiAgICAgIHRoaXMuZmxhZ3MgPSBbXTtcbiAgICAgIHRoaXMucGl0cyA9IFtdO1xuICAgICAgdGhpcy5zcGF3bnMgPSBbXTtcbiAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXMgPSBbMCwgMF07XG4gICAgICB0aGlzLnNwcml0ZVBhdHRlcm5zID0gWzAsIDBdO1xuICAgICAgdGhpcy5jaGVja3BvaW50ID0gdGhpcy5zYXZlYWJsZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxheW91dEJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlKSArIDB4YzAwMDtcbiAgICBjb25zdCBncmFwaGljc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgMikgKyAweGMwMDA7XG4gICAgY29uc3QgZW50cmFuY2VzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyA0KSArIDB4YzAwMDtcbiAgICBjb25zdCBleGl0c0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgNikgKyAweGMwMDA7XG4gICAgY29uc3QgZmxhZ3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDgpICsgMHhjMDAwO1xuXG4gICAgLy8gUmVhZCB0aGUgZXhpdHMgZmlyc3Qgc28gdGhhdCB3ZSBjYW4gZGV0ZXJtaW5lIGlmIHRoZXJlJ3MgZW50cmFuY2UvcGl0c1xuICAgIC8vIG1ldGFkYXRhIGVuY29kZWQgYXQgdGhlIGVuZC5cbiAgICBsZXQgaGFzUGl0cyA9IHRoaXMudXNlZCAmJiBsYXlvdXRCYXNlICE9PSBtYXBEYXRhQmFzZSArIDEwO1xuICAgIGxldCBlbnRyYW5jZUxlbiA9IGV4aXRzQmFzZSAtIGVudHJhbmNlc0Jhc2U7XG4gICAgdGhpcy5leGl0cyA9ICgoKSA9PiB7XG4gICAgICBjb25zdCBleGl0cyA9IFtdO1xuICAgICAgbGV0IGkgPSBleGl0c0Jhc2U7XG4gICAgICB3aGlsZSAoIShyb20ucHJnW2ldICYgMHg4MCkpIHtcbiAgICAgICAgLy8gTk9URTogc2V0IGRlc3QgdG8gRkYgdG8gZGlzYWJsZSBhbiBleGl0IChpdCdzIGFuIGludmFsaWQgbG9jYXRpb24gYW55d2F5KVxuICAgICAgICBpZiAocm9tLnByZ1tpICsgMl0gIT0gMHhmZikge1xuICAgICAgICAgIGV4aXRzLnB1c2goRXhpdC5mcm9tKHJvbS5wcmcsIGkpKTtcbiAgICAgICAgfVxuICAgICAgICBpICs9IDQ7XG4gICAgICB9XG4gICAgICBpZiAocm9tLnByZ1tpXSAhPT0gMHhmZikge1xuICAgICAgICBoYXNQaXRzID0gISEocm9tLnByZ1tpXSAmIDB4NDApO1xuICAgICAgICBlbnRyYW5jZUxlbiA9IChyb20ucHJnW2ldICYgMHgxZikgPDwgMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBleGl0cztcbiAgICB9KSgpO1xuXG4gICAgLy8gVE9ETyAtIHRoZXNlIGhldXJpc3RpY3Mgd2lsbCBub3Qgd29yayB0byByZS1yZWFkIHRoZSBsb2NhdGlvbnMuXG4gICAgLy8gICAgICAtIHdlIGNhbiBsb29rIGF0IHRoZSBvcmRlcjogaWYgdGhlIGRhdGEgaXMgQkVGT1JFIHRoZSBwb2ludGVyc1xuICAgIC8vICAgICAgICB0aGVuIHdlJ3JlIGluIGEgcmV3cml0dGVuIHN0YXRlOyBpbiB0aGF0IGNhc2UsIHdlIG5lZWQgdG8gc2ltcGx5XG4gICAgLy8gICAgICAgIGZpbmQgYWxsIHJlZnMgYW5kIG1heC4uLj9cbiAgICAvLyAgICAgIC0gY2FuIHdlIHJlYWQgdGhlc2UgcGFydHMgbGF6aWx5P1xuICAgIGNvbnN0IHBpdHNCYXNlID1cbiAgICAgICAgIWhhc1BpdHMgPyAwIDogcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDEwKSArIDB4YzAwMDtcblxuICAgIHRoaXMuYmdtID0gdGhpcy5vcmlnaW5hbEJnbSA9IHJvbS5wcmdbbGF5b3V0QmFzZV07XG4gICAgdGhpcy5sYXlvdXRXaWR0aCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDFdO1xuICAgIHRoaXMubGF5b3V0SGVpZ2h0ID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgMl07XG4gICAgdGhpcy5hbmltYXRpb24gPSByb20ucHJnW2xheW91dEJhc2UgKyAzXTtcbiAgICAvLyB0aGlzLmV4dGVuZGVkID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgNF07XG4gICAgY29uc3QgZXh0ZW5kZWQgPSByb20ucHJnW2xheW91dEJhc2UgKyA0XSA/IDB4MTAwIDogMDtcbiAgICB0aGlzLnNjcmVlbnMgPSBzZXEoXG4gICAgICAgIHRoaXMuaGVpZ2h0LFxuICAgICAgICB5ID0+IHR1cGxlKHJvbS5wcmcsIGxheW91dEJhc2UgKyA1ICsgeSAqIHRoaXMud2lkdGgsIHRoaXMud2lkdGgpXG4gICAgICAgICAgICAgICAgIC5tYXAocyA9PiBleHRlbmRlZCB8IHMpKTtcbiAgICB0aGlzLnRpbGVQYWxldHRlcyA9IHR1cGxlPG51bWJlcj4ocm9tLnByZywgZ3JhcGhpY3NCYXNlLCAzKTtcbiAgICB0aGlzLm9yaWdpbmFsVGlsZVBhbGV0dGVzID0gdHVwbGUodGhpcy50aWxlUGFsZXR0ZXMsIDAsIDMpO1xuICAgIHRoaXMudGlsZXNldCA9IHJvbS5wcmdbZ3JhcGhpY3NCYXNlICsgM107XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHJvbS5wcmdbZ3JhcGhpY3NCYXNlICsgNF07XG4gICAgdGhpcy50aWxlUGF0dGVybnMgPSB0dXBsZShyb20ucHJnLCBncmFwaGljc0Jhc2UgKyA1LCAyKTtcblxuICAgIHRoaXMuZW50cmFuY2VzID1cbiAgICAgIGdyb3VwKDQsIHJvbS5wcmcuc2xpY2UoZW50cmFuY2VzQmFzZSwgZW50cmFuY2VzQmFzZSArIGVudHJhbmNlTGVuKSxcbiAgICAgICAgICAgIHggPT4gRW50cmFuY2UuZnJvbSh4KSk7XG4gICAgdGhpcy5mbGFncyA9IHZhclNsaWNlKHJvbS5wcmcsIGZsYWdzQmFzZSwgMiwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gRmxhZy5mcm9tKHgpKTtcbiAgICB0aGlzLnBpdHMgPSBwaXRzQmFzZSA/IHZhclNsaWNlKHJvbS5wcmcsIHBpdHNCYXNlLCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gUGl0LmZyb20oeCkpIDogW107XG5cbiAgICBjb25zdCBucGNEYXRhQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5ucGNEYXRhUG9pbnRlcikgKyAweDEwMDAwO1xuICAgIGNvbnN0IGhhc1NwYXducyA9IG5wY0RhdGFCYXNlICE9PSAweDEwMDAwO1xuICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXMgPVxuICAgICAgICBoYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCBucGNEYXRhQmFzZSArIDEsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3ByaXRlUGF0dGVybnMgPVxuICAgICAgICBoYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCBucGNEYXRhQmFzZSArIDMsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3Bhd25zID1cbiAgICAgICAgaGFzU3Bhd25zID8gdmFyU2xpY2Uocm9tLnByZywgbnBjRGF0YUJhc2UgKyA1LCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBTcGF3bi5mcm9tKHgpKSA6IFtdO1xuXG4gICAgdGhpcy5jaGVja3BvaW50ID0gISEocm9tLnByZ1sweDJmZjAwIHwgaWRdICYgMHg4MCk7XG4gICAgdGhpcy5zYXZlYWJsZSA9ICEhKHJvbS5wcmdbMHgyZmYwMCB8IGlkXSAmIDB4MDEpO1xuICB9XG5cbiAgc2V0IG1ldGEobWV0YTogTWV0YWxvY2F0aW9uKSB7XG4gICAgdGhpcy5fbWV0YSA9IG1ldGE7XG4gIH1cbiAgZ2V0IG1ldGEoKTogTWV0YWxvY2F0aW9uIHtcbiAgICB0aGlzLmVuc3VyZU1ldGEoKTtcbiAgICByZXR1cm4gdGhpcy5fbWV0YSE7XG4gIH1cbiAgZW5zdXJlTWV0YSgpIHtcbiAgICBpZiAoIXRoaXMuX21ldGEpIHRoaXMuX21ldGEgPSBNZXRhbG9jYXRpb24ub2YodGhpcyk7XG4gIH1cblxuICBzZXQgbXVzaWNHcm91cChncm91cDogc3RyaW5nfHN5bWJvbCkge1xuICAgIHRoaXMuX211c2ljR3JvdXAgPSBncm91cDtcbiAgfVxuICBnZXQgbXVzaWNHcm91cCgpOiBzdHJpbmd8c3ltYm9sIHtcbiAgICB0aGlzLmVuc3VyZU11c2ljR3JvdXAoKTtcbiAgICByZXR1cm4gdGhpcy5fbXVzaWNHcm91cCE7XG4gIH1cbiAgZW5zdXJlTXVzaWNHcm91cCgpIHtcbiAgICBpZiAodGhpcy5fbXVzaWNHcm91cCA9PSBudWxsKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLmRhdGEubXVzaWM7XG4gICAgICB0aGlzLl9tdXNpY0dyb3VwID1cbiAgICAgICAgICB0eXBlb2Yga2V5ICE9PSAnbnVtYmVyJyA/IGtleSA6XG4gICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmV4aXRzW2tleV0uZGVzdF0ubXVzaWNHcm91cDtcbiAgICB9XG4gIH1cblxuICBzZXQgY29sb3JHcm91cChncm91cDogc3RyaW5nfHN5bWJvbCkge1xuICAgIHRoaXMuX2NvbG9yR3JvdXAgPSBncm91cDtcbiAgfVxuICBnZXQgY29sb3JHcm91cCgpOiBzdHJpbmd8c3ltYm9sIHtcbiAgICB0aGlzLmVuc3VyZUNvbG9yR3JvdXAoKTtcbiAgICByZXR1cm4gdGhpcy5fY29sb3JHcm91cCE7XG4gIH1cbiAgZW5zdXJlQ29sb3JHcm91cCgpIHtcbiAgICBpZiAodGhpcy5fY29sb3JHcm91cCA9PSBudWxsKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLmRhdGEubXVzaWM7XG4gICAgICB0aGlzLl9jb2xvckdyb3VwID1cbiAgICAgICAgICB0eXBlb2Yga2V5ICE9PSAnbnVtYmVyJyA/IGtleSA6XG4gICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmV4aXRzW2tleV0uZGVzdF0uY29sb3JHcm91cDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRG8gYWxsIHRoZSBpbml0aWFsaXphdGlvbiB0aGF0IGhhcyB0byBoYXBwZW4gYWZ0ZXIgYWxsIGxvY2F0aW9uc1xuICAgKiBoYXZlIGJlZW4gY29uc3RydWN0ZWQuXG4gICAqL1xuICBsYXp5SW5pdGlhbGl6YXRpb24oKSB7XG4gICAgdGhpcy5lbnN1cmVNZXRhKCk7XG4gICAgdGhpcy5lbnN1cmVNdXNpY0dyb3VwKCk7XG4gICAgdGhpcy5lbnN1cmVDb2xvckdyb3VwKCk7XG4gIH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRhdGEubmFtZTtcbiAgfVxuXG4gIGdldCBtYXBEYXRhUG9pbnRlcigpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmlkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyBtYXBkYXRhIHBvaW50ZXIgZm9yICR7dGhpcy5uYW1lfWApO1xuICAgIHJldHVybiAweDE0MzAwICsgKHRoaXMuaWQgPDwgMSk7XG4gIH1cblxuICBnZXQgbnBjRGF0YVBvaW50ZXIoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5pZCA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gbnBjZGF0YSBwb2ludGVyIGZvciAke3RoaXMubmFtZX1gKTtcbiAgICByZXR1cm4gMHgxOTIwMSArICh0aGlzLmlkIDw8IDEpO1xuICB9XG5cbiAgZ2V0IGhhc1NwYXducygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zcGF3bnMubGVuZ3RoID4gMDtcbiAgfVxuXG4gIC8vIC8vIE9mZnNldCB0byBPUiB3aXRoIHNjcmVlbiBJRHMuXG4gIC8vIGdldCBzY3JlZW5QYWdlKCk6IG51bWJlciB7XG4gIC8vICAgaWYgKCF0aGlzLnJvbS5jb21wcmVzc2VkTWFwRGF0YSkgcmV0dXJuIHRoaXMuZXh0ZW5kZWQgPyAweDEwMCA6IDA7XG4gIC8vICAgcmV0dXJuIHRoaXMuZXh0ZW5kZWQgPDwgODtcbiAgLy8gfVxuXG4gIG1hcFBsYW5lKCk6IG51bWJlciB7XG4gICAgY29uc3Qgc2V0ID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKCkgPT4gbmV3IFNldCgpKTtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3QgcyBvZiByb3cpIHtcbiAgICAgICAgc2V0LmdldChzID4+PiA4KS5hZGQocyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChzZXQuc2l6ZSAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tdW5pcXVlIHNjcmVlbiBwYWdlIGZvciAke3RoaXN9OiAke1xuICAgICAgICAgIFsuLi5zZXQudmFsdWVzKCldLm1hcChzaWRzID0+XG4gICAgICAgICAgICBbLi4uc2lkc10ubWFwKHNpZCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IFtzY3JdID0gdGhpcy5yb20ubWV0YXNjcmVlbnMuZ2V0QnlJZChzaWQpO1xuICAgICAgICAgICAgICByZXR1cm4gYCR7aGV4KHNpZCl9ICR7c2NyPy5uYW1lID8/ICc/Pyd9YDtcbiAgICAgICAgICAgIH0pLmpvaW4oJywgJylcbiAgICAgICAgICApLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIGNvbnN0IFtyZXN1bHRdID0gc2V0LmtleXMoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaXNTaG9wKCk6IGJvb2xlYW4ge1xuICAgIC8vcmV0dXJuIHRoaXMucm9tLnNob3BzLmZpbmRJbmRleChzID0+IHMubG9jYXRpb24gPT09IHRoaXMuaWQpID49IDA7XG4gICAgaWYgKHRoaXMuX2lzU2hvcCA9PSBudWxsKSB7XG4gICAgICB0aGlzLl9pc1Nob3AgPSB0aGlzLnJvbS5zaG9wcy5maW5kSW5kZXgocyA9PiBzLmxvY2F0aW9uID09PSB0aGlzLmlkKSA+PSAwO1xuICAgICAgLy8gTk9URTogc2FoYXJhIHBhd24gc2hvcCBpcyBub3QgYWN0dWFsbHkgaW4gdGhlIHRhYmxlIChwYXduIHNob3BzIGRvbid0XG4gICAgICAvLyBzdHJpY3RseSBuZWVkIHRvIGJlKSEgIFRPRE8gLSBoYW5kbGUgdGhpcyBiZXR0ZXIuXG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHhmYikgdGhpcy5faXNTaG9wID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2lzU2hvcDtcbiAgfVxuXG4gIC8vc2V0SXNTaG9wKGlzU2hvcDogYm9vbGVhbikgeyB0aGlzLl9pc1Nob3AgPSBpc1Nob3A7IH1cblxuICBzcGF3bihpZDogbnVtYmVyKTogU3Bhd24ge1xuICAgIGNvbnN0IHNwYXduID0gdGhpcy5zcGF3bnNbaWQgLSAweGRdO1xuICAgIGlmICghc3Bhd24pIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgc3Bhd24gJCR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gc3Bhd247XG4gIH1cblxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubGF5b3V0V2lkdGggKyAxOyB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyKSB7IHRoaXMubGF5b3V0V2lkdGggPSB3aWR0aCAtIDE7IH1cblxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7IHJldHVybiB0aGlzLmxheW91dEhlaWdodCArIDE7IH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlcikgeyB0aGlzLmxheW91dEhlaWdodCA9IGhlaWdodCAtIDE7IH1cblxuICBmaW5kT3JBZGRFbnRyYW5jZShzY3JlZW46IG51bWJlciwgY29vcmQ6IG51bWJlcik6IG51bWJlciB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmVudHJhbmNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZW50cmFuY2UgPSB0aGlzLmVudHJhbmNlc1tpXTtcbiAgICAgIGlmIChlbnRyYW5jZS5zY3JlZW4gPT09IHNjcmVlbiAmJiBlbnRyYW5jZS5jb29yZCA9PT0gY29vcmQpIHJldHVybiBpO1xuICAgIH1cbiAgICB0aGlzLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHtzY3JlZW4sIGNvb3JkfSkpO1xuICAgIHJldHVybiB0aGlzLmVudHJhbmNlcy5sZW5ndGggLSAxO1xuICB9XG5cbiAgLy8gbW9uc3RlcnMoKSB7XG4gIC8vICAgaWYgKCF0aGlzLnNwYXducykgcmV0dXJuIFtdO1xuICAvLyAgIHJldHVybiB0aGlzLnNwYXducy5mbGF0TWFwKFxuICAvLyAgICAgKFssLCB0eXBlLCBpZF0sIHNsb3QpID0+XG4gIC8vICAgICAgIHR5cGUgJiA3IHx8ICF0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXSA/IFtdIDogW1xuICAvLyAgICAgICAgIFt0aGlzLmlkLFxuICAvLyAgICAgICAgICBzbG90ICsgMHgwZCxcbiAgLy8gICAgICAgICAgdHlwZSAmIDB4ODAgPyAxIDogMCxcbiAgLy8gICAgICAgICAgaWQgKyAweDUwLFxuICAvLyAgICAgICAgICB0aGlzLnNwcml0ZVBhdHRlcm5zW3R5cGUgJiAweDgwID8gMSA6IDBdLFxuICAvLyAgICAgICAgICB0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXS5wYWxldHRlcygpWzBdLFxuICAvLyAgICAgICAgICB0aGlzLnNwcml0ZVBhbGV0dGVzW3RoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdLnBhbGV0dGVzKClbMF0gLSAyXSxcbiAgLy8gICAgICAgICBdXSk7XG4gIC8vIH1cblxuICBhc3NlbWJsZShhOiBBc3NlbWJsZXIpIHtcbiAgICBpZiAoIXRoaXMudXNlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gdGhpcy5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAvLyBjb25zdCAkbGF5b3V0ID0gYExheW91dF8ke2lkfWA7XG4gICAgLy8gY29uc3QgJGdyYXBoaWNzID0gYEdyYXBoaWNzXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkZW50cmFuY2VzID0gYEVudHJhbmNlc18ke2lkfWA7XG4gICAgLy8gY29uc3QgJGV4aXRzID0gYEV4aXRzXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkZmxhZ3MgPSBgRmxhZ3NfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRwaXRzID0gYFBpdHNfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRtYXBkYXRhID0gYE1hcERhdGFfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRucGNkYXRhID0gYE5wY0RhdGFfJHtpZH1gO1xuXG4gICAgY29uc3Qgc3ByaXRlUGFsID0gdGhpcy5zcGF3bnMubGVuZ3RoID8gdGhpcy5zcHJpdGVQYWxldHRlcyA6IFsweGZmLCAweGZmXTtcbiAgICBjb25zdCBzcHJpdGVQYXQgPSB0aGlzLnNwYXducy5sZW5ndGggPyB0aGlzLnNwcml0ZVBhdHRlcm5zIDogWzB4ZmYsIDB4ZmZdO1xuICAgIGNvbnN0IG1hcERhdGE6IEV4cHJbXSA9IFtdO1xuICAgIC8vIHdyaXRlIE5QQyBkYXRhIGZpcnN0LCBpZiBwcmVzZW50Li4uXG4gICAgY29uc3QgbnBjRGF0YSA9IFswLCAuLi5zcHJpdGVQYWwsIC4uLnNwcml0ZVBhdCxcbiAgICAgICAgICAgICAgICAgICAgIC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLnNwYXducyksIDB4ZmZdO1xuICAgIGEuc2VnbWVudCgnMGMnLCAnMGQnKTtcbiAgICBhLnJlbG9jKGBOcGNEYXRhXyR7aWR9YCk7XG4gICAgY29uc3QgJG5wY0RhdGEgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLm5wY0RhdGEpO1xuICAgIGEub3JnKDB4OTIwMSArICh0aGlzLmlkIDw8IDEpLCBgTnBjRGF0YV8ke2lkfV9QdHJgKTtcbiAgICBhLndvcmQoJG5wY0RhdGEpO1xuXG4gICAgLy8gd3JpdGUgY2hlY2twb2ludC9zYXZlYWJsZVxuICAgIGEuc2VnbWVudCgnMTcnKTtcbiAgICBhLm9yZygweGJmMDAgfCB0aGlzLmlkKTtcbiAgICBhLmJ5dGUoK3RoaXMuY2hlY2twb2ludCA8PCA3IHwgK3RoaXMuc2F2ZWFibGUpXG5cbiAgICAvLyB3cml0ZSBtYXBkYXRhXG4gICAgYS5zZWdtZW50KCcwYScsICcwYicpO1xuICAgIC8vY29uc3QgZXh0ID0gbmV3IFNldCh0aGlzLnNjcmVlbnMubWFwKHMgPT4gcyA+PiA4KSk7XG4gICAgY29uc3Qgc2NyZWVucyA9IFtdO1xuICAgIGZvciAoY29uc3QgcyBvZiBjb25jYXRJdGVyYWJsZXModGhpcy5zY3JlZW5zKSkge1xuICAgICAgc2NyZWVucy5wdXNoKHMgJiAweGZmKTtcbiAgICB9XG4gICAgY29uc3QgbGF5b3V0ID0gdGhpcy5yb20uY29tcHJlc3NlZE1hcERhdGEgPyBbXG4gICAgICB0aGlzLmJnbSxcbiAgICAgIC8vIENvbXByZXNzZWQgdmVyc2lvbjogeXggaW4gb25lIGJ5dGUsIGV4dCthbmltIGluIG9uZSBieXRlXG4gICAgICAvLyBOb3RlIHRoYXQgcGxhbmUgaXMgYXQgbW9zdCAzIGJpdHMsIHNvIHdlIHN0aWxsIGhhdmUgMyBiaXRzXG4gICAgICAvLyBvZiB1c2FibGUgc3BhY2UgaW4gdGhpcyBieXRlLlxuICAgICAgdGhpcy5sYXlvdXRIZWlnaHQgPDwgNCB8IHRoaXMubGF5b3V0V2lkdGgsXG4gICAgICB0aGlzLm1hcFBsYW5lKCkgPDwgMiB8IHRoaXMuYW5pbWF0aW9uLCAuLi5zY3JlZW5zLFxuICAgIF0gOiBbXG4gICAgICB0aGlzLmJnbSwgdGhpcy5sYXlvdXRXaWR0aCwgdGhpcy5sYXlvdXRIZWlnaHQsXG4gICAgICB0aGlzLmFuaW1hdGlvbiwgdGhpcy5tYXBQbGFuZSgpID8gMHg4MCA6IDAsIC4uLnNjcmVlbnMsXG4gICAgXTtcbiAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9X0xheW91dGApO1xuICAgIGNvbnN0ICRsYXlvdXQgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLmxheW91dCk7XG4gICAgbWFwRGF0YS5wdXNoKCRsYXlvdXQpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9HcmFwaGljc2ApO1xuICAgIGNvbnN0ICRncmFwaGljcyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4udGhpcy50aWxlUGFsZXR0ZXMsXG4gICAgICAgICAgIHRoaXMudGlsZXNldCwgdGhpcy50aWxlRWZmZWN0cyxcbiAgICAgICAgICAgLi4udGhpcy50aWxlUGF0dGVybnMpO1xuICAgIG1hcERhdGEucHVzaCgkZ3JhcGhpY3MpO1xuXG4gICAgLy8gUXVpY2sgc2FuaXR5IGNoZWNrOiBpZiBhbiBlbnRyYW5jZS9leGl0IGlzIGJlbG93IHRoZSBIVUQgb24gYVxuICAgIC8vIG5vbi12ZXJ0aWNhbGx5IHNjcm9sbGluZyBtYXAsIHRoZW4gd2UgbmVlZCB0byBtb3ZlIGl0IHVwXG4gICAgLy8gTk9URTogdGhpcyBpcyBpZGVtcG90ZW50Li5cbiAgICBpZiAodGhpcy5oZWlnaHQgPT09IDEpIHtcbiAgICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgICAgaWYgKCFlbnRyYW5jZS51c2VkKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGVudHJhbmNlLnkgPiAweGJmKSBlbnRyYW5jZS55ID0gMHhiZjtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICAgIGlmIChleGl0Lnl0ID4gMHgwYykgZXhpdC55dCA9IDB4MGM7XG4gICAgICB9XG4gICAgfVxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fRW50cmFuY2VzYCk7XG4gICAgY29uc3QgJGVudHJhbmNlcyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZW50cmFuY2VzKSk7XG4gICAgbWFwRGF0YS5wdXNoKCRlbnRyYW5jZXMpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9FeGl0c2ApO1xuICAgIGNvbnN0ICRleGl0cyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZXhpdHMpLFxuICAgICAgICAgICAweDgwIHwgKHRoaXMucGl0cy5sZW5ndGggPyAweDQwIDogMCkgfCB0aGlzLmVudHJhbmNlcy5sZW5ndGgpO1xuICAgIG1hcERhdGEucHVzaCgkZXhpdHMpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9GbGFnc2ApO1xuICAgIGNvbnN0ICRmbGFncyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZmxhZ3MpLCAweGZmKTtcbiAgICBtYXBEYXRhLnB1c2goJGZsYWdzKTtcblxuICAgIGNvbnN0IHBpdHMgPSBjb25jYXRJdGVyYWJsZXModGhpcy5waXRzKTtcbiAgICBpZiAocGl0cy5sZW5ndGgpIHtcbiAgICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fUGl0c2ApO1xuICAgICAgY29uc3QgJHBpdHMgPSBhLnBjKCk7XG4gICAgICBhLmJ5dGUoLi4ucGl0cyk7XG4gICAgICBtYXBEYXRhLnB1c2goJHBpdHMpO1xuICAgIH1cblxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1gKTtcbiAgICBjb25zdCAkbWFwRGF0YSA9IGEucGMoKTtcbiAgICBhLndvcmQoLi4ubWFwRGF0YSk7XG5cbiAgICBhLm9yZygweDgzMDAgKyAodGhpcy5pZCA8PCAxKSwgYE1hcERhdGFfJHtpZH1fUHRyYCk7XG4gICAgYS53b3JkKCRtYXBEYXRhKTtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBib3NzIHJvb20sIHdyaXRlIHRoZSByZXN0b3JhdGlvbi5cbiAgICBjb25zdCBib3NzSWQgPSB0aGlzLmJvc3NJZCgpO1xuICAgIGlmIChib3NzSWQgIT0gbnVsbCAmJiB0aGlzLmlkICE9PSAweDVmKSB7IC8vIGRvbid0IHJlc3RvcmUgZHluYVxuICAgICAgLy8gVGhpcyB0YWJsZSBzaG91bGQgcmVzdG9yZSBwYXQwIGJ1dCBub3QgcGF0MVxuICAgICAgbGV0IHBhdHMgPSBbc3ByaXRlUGF0WzBdLCB1bmRlZmluZWRdO1xuICAgICAgaWYgKHRoaXMuaWQgPT09IDB4YTYpIHBhdHMgPSBbMHg1MywgMHg1MF07IC8vIGRyYXlnb24gMlxuICAgICAgY29uc3QgYm9zc0Jhc2UgPSB0aGlzLnJvbS5ib3NzS2lsbHNbYm9zc0lkXS5iYXNlO1xuICAgICAgLy8gU2V0IHRoZSBcInJlc3RvcmUgbXVzaWNcIiBieXRlIGZvciB0aGUgYm9zcywgYnV0IGlmIGl0J3MgRHJheWdvbiAyLCBzZXRcbiAgICAgIC8vIGl0IHRvIHplcm8gc2luY2Ugbm8gbXVzaWMgaXMgYWN0dWFsbHkgcGxheWluZywgYW5kIGlmIHRoZSBtdXNpYyBpbiB0aGVcbiAgICAgIC8vIHRlbGVwb3J0ZXIgcm9vbSBoYXBwZW5zIHRvIGJlIHRoZSBzYW1lIGFzIHRoZSBtdXNpYyBpbiB0aGUgY3J5cHQsIHRoZW5cbiAgICAgIC8vIHJlc2V0dGluZyB0byB0aGF0IG1lYW5zIGl0IHdpbGwganVzdCByZW1haW4gc2lsZW50LCBhbmQgbm90IHJlc3RhcnQuXG4gICAgICBjb25zdCByZXN0b3JlQmdtID0gdGhpcy5pZCA9PT0gMHhhNiA/IDAgOiB0aGlzLmJnbTtcbiAgICAgIGNvbnN0IGJvc3NSZXN0b3JlID0gW1xuICAgICAgICAsLCwgcmVzdG9yZUJnbSwsXG4gICAgICAgIC4uLnRoaXMudGlsZVBhbGV0dGVzLCwsLCB0aGlzLnNwcml0ZVBhbGV0dGVzWzBdLCxcbiAgICAgICAgLCwsLCAvKnBhdHNbMF0qLywgLypwYXRzWzFdKi8sXG4gICAgICAgIHRoaXMuYW5pbWF0aW9uLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IFtdID0gW3BhdHNdOyAvLyBhdm9pZCBlcnJvclxuXG4gICAgICAvLyBpZiAocmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBib3NzQmFzZSkgPT09IDB4YmE5OCkge1xuICAgICAgLy8gICAvLyBlc2NhcGUgYW5pbWF0aW9uOiBkb24ndCBjbG9iYmVyIHBhdHRlcm5zIHlldD9cbiAgICAgIC8vIH1cbiAgICAgIGEuc2VnbWVudCgnMGYnKTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYm9zc1Jlc3RvcmUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgY29uc3QgcmVzdG9yZWQgPSBib3NzUmVzdG9yZVtqXTtcbiAgICAgICAgaWYgKHJlc3RvcmVkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBhLm9yZyhib3NzQmFzZSArIGosIGBCb3NzXyR7Ym9zc0lkfV8ke2p9YCk7XG4gICAgICAgIGEuYnl0ZShyZXN0b3JlZCk7XG4gICAgICB9XG4gICAgICAvLyBsYXRlciBzcG90IGZvciBwYWwzIGFuZCBwYXQxICphZnRlciogZXhwbG9zaW9uXG4gICAgICBjb25zdCBib3NzQmFzZTIgPSAweGI3YzEgKyA1ICogYm9zc0lkOyAvLyAxZjdjMVxuICAgICAgYS5vcmcoYm9zc0Jhc2UyLCBgQm9zc18ke2Jvc3NJZH1fUG9zdGApO1xuICAgICAgYS5ieXRlKHNwcml0ZVBhbFsxXSk7XG4gICAgICAvLyBOT1RFOiBUaGlzIHJ1aW5zIHRoZSB0cmVhc3VyZSBjaGVzdC5cbiAgICAgIC8vIFRPRE8gLSBhZGQgc29tZSBhc20gYWZ0ZXIgYSBjaGVzdCBpcyBjbGVhcmVkIHRvIHJlbG9hZCBwYXR0ZXJucz9cbiAgICAgIC8vIEFub3RoZXIgb3B0aW9uIHdvdWxkIGJlIHRvIGFkZCBhIGxvY2F0aW9uLXNwZWNpZmljIGNvbnRyYWludCB0byBiZVxuICAgICAgLy8gd2hhdGV2ZXIgdGhlIGJvc3MgXG4gICAgICAvL3dyaXRlci5yb21bYm9zc0Jhc2UyICsgMV0gPSB0aGlzLnNwcml0ZVBhdHRlcm5zWzFdO1xuICAgIH1cbiAgfVxuXG4gIGFsbFNjcmVlbnMoKTogU2V0PFNjcmVlbj4ge1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHJvdykge1xuICAgICAgICBzY3JlZW5zLmFkZCh0aGlzLnJvbS5zY3JlZW5zW3NjcmVlbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2NyZWVucztcbiAgfVxuXG4gIGJvc3NJZCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgwZTsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5yb20ucHJnWzB4MWY5NWQgKyBpXSA9PT0gdGhpcy5pZCkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBuZWlnaGJvcnMoam9pbk5leHVzZXM6IGJvb2xlYW4gPSBmYWxzZSk6IFNldDxMb2NhdGlvbj4ge1xuICAvLyAgIGNvbnN0IG91dCA9IG5ldyBTZXQ8TG9jYXRpb24+KCk7XG4gIC8vICAgY29uc3QgYWRkTmVpZ2hib3JzID0gKGw6IExvY2F0aW9uKSA9PiB7XG4gIC8vICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbC5leGl0cykge1xuICAvLyAgICAgICBjb25zdCBpZCA9IGV4aXQuZGVzdDtcbiAgLy8gICAgICAgY29uc3QgbmVpZ2hib3IgPSB0aGlzLnJvbS5sb2NhdGlvbnNbaWRdO1xuICAvLyAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IudXNlZCAmJlxuICAvLyAgICAgICAgICAgbmVpZ2hib3IgIT09IHRoaXMgJiYgIW91dC5oYXMobmVpZ2hib3IpKSB7XG4gIC8vICAgICAgICAgb3V0LmFkZChuZWlnaGJvcik7XG4gIC8vICAgICAgICAgaWYgKGpvaW5OZXh1c2VzICYmIE5FWFVTRVNbbmVpZ2hib3Iua2V5XSkge1xuICAvLyAgICAgICAgICAgYWRkTmVpZ2hib3JzKG5laWdoYm9yKTtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgYWRkTmVpZ2hib3JzKHRoaXMpO1xuICAvLyAgIHJldHVybiBvdXQ7XG4gIC8vIH1cblxuICBoYXNEb2xwaGluKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlkID09PSAweDYwIHx8IHRoaXMuaWQgPT09IDB4NjQgfHwgdGhpcy5pZCA9PT0gMHg2ODtcbiAgfVxuXG4gIGlzVG93ZXIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICh0aGlzLmlkICYgMHhmOCkgPT09IDB4NTg7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBNYXAgb2YgdGlsZXMgKCRZWHl4KSByZWFjaGFibGUgZnJvbSBhbnkgZW50cmFuY2UgdG9cbiAgICogdW5mbGFnZ2VkIHRpbGVlZmZlY3RzLlxuICAgKi9cbiAgcmVhY2hhYmxlVGlsZXMoZmx5ID0gZmFsc2UpOiBNYXA8bnVtYmVyLCBudW1iZXI+IHtcbiAgICAvLyBUT0RPIC0gYXJncyBmb3IgKDEpIHVzZSBub24tMmVmIGZsYWdzLCAoMikgb25seSBmcm9tIGdpdmVuIGVudHJhbmNlL3RpbGVcbiAgICAvLyBEb2xwaGluIG1ha2VzIE5PX1dBTEsgb2theSBmb3Igc29tZSBsZXZlbHMuXG4gICAgaWYgKHRoaXMuaGFzRG9scGhpbigpKSBmbHkgPSB0cnVlO1xuICAgIC8vIFRha2UgaW50byBhY2NvdW50IHRoZSB0aWxlc2V0IGFuZCBmbGFncyBidXQgbm90IGFueSBvdmVybGF5LlxuICAgIGNvbnN0IGV4aXRzID0gbmV3IFNldCh0aGlzLmV4aXRzLm1hcChleGl0ID0+IGV4aXQuc2NyZWVuIDw8IDggfCBleGl0LnRpbGUpKTtcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0c1t0aGlzLnRpbGVzZXRdO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbdGhpcy50aWxlRWZmZWN0cyAtIDB4YjNdO1xuICAgIGNvbnN0IHBhc3NhYmxlID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSB0aGlzLnNjcmVlbnNbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Jvd1t4XV07XG4gICAgICAgIGNvbnN0IHBvcyA9IHkgPDwgNCB8IHg7XG4gICAgICAgIGNvbnN0IGZsYWcgPSB0aGlzLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gcG9zKTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWxlSWQgPSBwb3MgPDwgOCB8IHQ7XG4gICAgICAgICAgaWYgKGV4aXRzLmhhcyh0aWxlSWQpKSBjb250aW51ZTsgLy8gZG9uJ3QgZ28gcGFzdCBleGl0c1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBsZXQgZWZmZWN0cyA9IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgbGV0IGJsb2NrZWQgPSBmbHkgPyBlZmZlY3RzICYgMHgwNCA6IGVmZmVjdHMgJiAweDA2O1xuICAgICAgICAgIGlmIChmbGFnICYmIGJsb2NrZWQgJiYgdGlsZSA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdICE9IHRpbGUpIHtcbiAgICAgICAgICAgIHRpbGUgPSB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV07XG4gICAgICAgICAgICBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICAgIGJsb2NrZWQgPSBmbHkgPyBlZmZlY3RzICYgMHgwNCA6IGVmZmVjdHMgJiAweDA2O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWJsb2NrZWQpIHBhc3NhYmxlLmFkZCh0aWxlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChsZXQgdCBvZiBwYXNzYWJsZSkge1xuICAgICAgY29uc3QgcmlnaHQgPSAodCAmIDB4MGYpID09PSAweDBmID8gdCArIDB4ZjEgOiB0ICsgMTtcbiAgICAgIGlmIChwYXNzYWJsZS5oYXMocmlnaHQpKSB1Zi51bmlvbihbdCwgcmlnaHRdKTtcbiAgICAgIGNvbnN0IGJlbG93ID0gKHQgJiAweGYwKSA9PT0gMHhlMCA/IHQgKyAweGYyMCA6IHQgKyAxNjtcbiAgICAgIGlmIChwYXNzYWJsZS5oYXMoYmVsb3cpKSB1Zi51bmlvbihbdCwgYmVsb3ddKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXAgPSB1Zi5tYXAoKTtcbiAgICBjb25zdCBzZXRzID0gbmV3IFNldDxTZXQ8bnVtYmVyPj4oKTtcbiAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICBpZiAoIWVudHJhbmNlLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWQgPSBlbnRyYW5jZS5zY3JlZW4gPDwgOCB8IGVudHJhbmNlLnRpbGU7XG4gICAgICAvLyBOT1RFOiBtYXAgc2hvdWxkIGFsd2F5cyBoYXZlIGlkLCBidXQgYm9ndXMgZW50cmFuY2VzXG4gICAgICAvLyAoZS5nLiBHb2EgVmFsbGV5IGVudHJhbmNlIDIpIGNhbiBjYXVzZSBwcm9ibGVtcy5cbiAgICAgIHNldHMuYWRkKG1hcC5nZXQoaWQpIHx8IG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHNldCBvZiBzZXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHQgb2Ygc2V0KSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHgwZl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbc2NyXTtcbiAgICAgICAgb3V0LnNldCh0LCB0aWxlRWZmZWN0cy5lZmZlY3RzW3NjcmVlbi50aWxlc1t0ICYgMHhmZl1dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIC8qKiBTYWZlciB2ZXJzaW9uIG9mIHRoZSBiZWxvdz8gKi9cbiAgc2NyZWVuTW92ZXIoKTogKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB2b2lkIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIEFycmF5PHtzY3JlZW46IG51bWJlcn0+PigoKSA9PiBbXSk7XG4gICAgY29uc3Qgb2JqcyA9XG4gICAgICAgIGl0ZXJzLmNvbmNhdDx7c2NyZWVuOiBudW1iZXJ9Pih0aGlzLnNwYXducywgdGhpcy5leGl0cywgdGhpcy5lbnRyYW5jZXMpO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIG9ianMpIHtcbiAgICAgIG1hcC5nZXQob2JqLnNjcmVlbikucHVzaChvYmopO1xuICAgIH1cbiAgICByZXR1cm4gKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG9iaiBvZiBtYXAuZ2V0KG9yaWcpKSB7XG4gICAgICAgIG9iai5zY3JlZW4gPSByZXBsO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYWxsIHNwYXducywgZW50cmFuY2VzLCBhbmQgZXhpdHMuXG4gICAqIEBwYXJhbSBvcmlnIFlYIG9mIHRoZSBvcmlnaW5hbCBzY3JlZW4uXG4gICAqIEBwYXJhbSByZXBsIFlYIG9mIHRoZSBlcXVpdmFsZW50IHJlcGxhY2VtZW50IHNjcmVlbi5cbiAgICovXG4gIG1vdmVTY3JlZW4ob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgaWYgKG9iai5zY3JlZW4gPT09IG9yaWcpIG9iai5zY3JlZW4gPSByZXBsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gLSBmYWN0b3IgdGhpcyBvdXQgaW50byBhIHNlcGFyYXRlIGNsYXNzP1xuICAvLyAgIC0gaG9sZHMgbWV0YWRhdGEgYWJvdXQgbWFwIHRpbGVzIGluIGdlbmVyYWw/XG4gIC8vICAgLSBuZWVkIHRvIGZpZ3VyZSBvdXQgd2hhdCB0byBkbyB3aXRoIHBpdHMuLi5cbiAgbW9uc3RlclBsYWNlcihyYW5kb206IFJhbmRvbSk6IChtOiBNb25zdGVyKSA9PiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIHRoaXMubW9uc3RlcnNNb3ZlZCA9IHRydWU7XG4gICAgLy8gSWYgdGhlcmUncyBhIGJvc3Mgc2NyZWVuLCBleGNsdWRlIGl0IGZyb20gZ2V0dGluZyBlbmVtaWVzLlxuICAgIGNvbnN0IGJvc3MgPSB0aGlzLmRhdGEuYm9zc1NjcmVlbjtcbiAgICAvLyBTdGFydCB3aXRoIGxpc3Qgb2YgcmVhY2hhYmxlIHRpbGVzLlxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IHRoaXMucmVhY2hhYmxlVGlsZXMoZmFsc2UpO1xuICAgIC8vIERvIGEgYnJlYWR0aC1maXJzdCBzZWFyY2ggb2YgYWxsIHRpbGVzIHRvIGZpbmQgXCJkaXN0YW5jZVwiICgxLW5vcm0pLlxuICAgIGNvbnN0IGZhciA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KFsuLi5yZWFjaGFibGUua2V5cygpXS5tYXAoeCA9PiBbeCwgMF0pKTtcbiAgICBjb25zdCBub3JtYWw6IG51bWJlcltdID0gW107IC8vIHJlYWNoYWJsZSwgbm90IHNsb3BlIG9yIHdhdGVyXG4gICAgY29uc3QgbW90aHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSDiiIggMy4uN1xuICAgIGNvbnN0IGJpcmRzOiBudW1iZXJbXSA9IFtdOyAgLy8gZGlzdGFuY2UgPiAxMlxuICAgIGNvbnN0IHBsYW50czogbnVtYmVyW10gPSBbXTsgLy8gZGlzdGFuY2Ug4oiIIDIuLjRcbiAgICBjb25zdCBwbGFjZWQ6IEFycmF5PFtNb25zdGVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCBub3JtYWxUZXJyYWluTWFzayA9IHRoaXMuaGFzRG9scGhpbigpID8gMHgyNSA6IDB4Mjc7XG4gICAgZm9yIChjb25zdCBbdCwgZGlzdGFuY2VdIG9mIGZhcikge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweGZdO1xuICAgICAgaWYgKHNjciA9PT0gYm9zcykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IG4gb2YgbmVpZ2hib3JzKHQsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSkge1xuICAgICAgICBpZiAoZmFyLmhhcyhuKSkgY29udGludWU7XG4gICAgICAgIGZhci5zZXQobiwgZGlzdGFuY2UgKyAxKTtcbiAgICAgIH1cbiAgICAgIGlmICghZGlzdGFuY2UgJiYgIShyZWFjaGFibGUuZ2V0KHQpISAmIG5vcm1hbFRlcnJhaW5NYXNrKSkgbm9ybWFsLnB1c2godCk7XG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHgxYSkge1xuICAgICAgICAvLyBTcGVjaWFsLWNhc2UgdGhlIHN3YW1wIGZvciBwbGFudCBwbGFjZW1lbnRcbiAgICAgICAgaWYgKHRoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl0gPT09IDB4ZjApIHBsYW50cy5wdXNoKHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGRpc3RhbmNlID49IDIgJiYgZGlzdGFuY2UgPD0gNCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMyAmJiBkaXN0YW5jZSA8PSA3KSBtb3Rocy5wdXNoKHQpO1xuICAgICAgaWYgKGRpc3RhbmNlID49IDEyKSBiaXJkcy5wdXNoKHQpO1xuICAgICAgLy8gVE9ETyAtIHNwZWNpYWwtY2FzZSBzd2FtcCBmb3IgcGxhbnQgbG9jYXRpb25zP1xuICAgIH1cbiAgICAvLyBXZSBub3cga25vdyBhbGwgdGhlIHBvc3NpYmxlIHBsYWNlcyB0byBwbGFjZSB0aGluZ3MuXG4gICAgLy8gIC0gTk9URTogc3RpbGwgbmVlZCB0byBtb3ZlIGNoZXN0cyB0byBkZWFkIGVuZHMsIGV0Yz9cbiAgICByZXR1cm4gKG06IE1vbnN0ZXIpID0+IHtcbiAgICAgIC8vIGNoZWNrIGZvciBwbGFjZW1lbnQuXG4gICAgICBjb25zdCByID0gbS5jbGVhcmFuY2UoKTtcbiAgICAgIGNvbnN0IHBsYWNlbWVudCA9IG0ucGxhY2VtZW50KCk7XG4gICAgICBjb25zdCBwb29sID0gWy4uLihwbGFjZW1lbnQgPT09ICdub3JtYWwnID8gbm9ybWFsIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ21vdGgnID8gbW90aHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnYmlyZCcgPyBiaXJkcyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdwbGFudCcgPyBwbGFudHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0TmV2ZXIocGxhY2VtZW50KSldXG4gICAgICBsZXQgcmVzdWx0ITogW251bWJlciwgbnVtYmVyLCBudW1iZXJdfHVuZGVmaW5lZDsgLy8geCwgeSwgejJcbiAgICAgIFBPT0w6XG4gICAgICB3aGlsZSAocG9vbC5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgaSA9IHJhbmRvbS5uZXh0SW50KHBvb2wubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgW3Bvc10gPSBwb29sLnNwbGljZShpLCAxKTtcblxuICAgICAgICBjb25zdCB4ID0gKHBvcyAmIDB4ZjAwKSA+Pj4gNCB8IChwb3MgJiAweGYpO1xuICAgICAgICBjb25zdCB5ID0gKHBvcyAmIDB4ZjAwMCkgPj4+IDggfCAocG9zICYgMHhmMCkgPj4+IDQ7XG5cbiAgICAgICAgLy8gdGVzdCBkaXN0YW5jZSBmcm9tIGVudHJhbmNlcy5cbiAgICAgICAgZm9yIChjb25zdCB7eDogeDEsIHk6IHkxLCB1c2VkfSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgICAgIGlmICghdXNlZCkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSAoeTEgPj4gNCkpICoqIDIgKyAoeCAtICh4MSA+PiA0KSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyAxKSAqKiAyKSBjb250aW51ZSBQT09MO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRlc3QgZGlzdGFuY2UgZnJvbSBzZWFtbGVzcyBleGl0cyAtIHJlcXVpcmUgOCB0aWxlcyFcbiAgICAgICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgICAgICBpZiAoIWV4aXQuaXNTZWFtbGVzcygpKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCB7eDogeDEsIHk6IHkxfSA9IGV4aXQ7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSAoeTEgPj4gNCkpICoqIDIgKyAoeCAtICh4MSA+PiA0KSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyA4KSAqKiAyKSBjb250aW51ZSBQT09MO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRlc3QgZGlzdGFuY2UgZnJvbSBvdGhlciBlbmVtaWVzLlxuICAgICAgICBmb3IgKGNvbnN0IFssIHgxLCB5MSwgcjFdIG9mIHBsYWNlZCkge1xuICAgICAgICAgIGNvbnN0IHoyID0gKCh5IC0geTEpICoqIDIgKyAoeCAtIHgxKSAqKiAyKTtcbiAgICAgICAgICBpZiAoIXoyKSBjb250aW51ZSBQT09MOyAgLy8gbm8gb3ZlcmxhcFxuICAgICAgICAgIGlmICh6MiA8IChyICsgcjEpICoqIDIpIHtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8IHJlc3VsdFsyXSA8IHoyKSByZXN1bHQgPSBbeCwgeSwgejJdO1xuICAgICAgICAgICAgY29udGludWUgUE9PTDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVmFsaWQgc3BvdCAoYnV0IHN0aWxsLCBob3cgdG8gYXBwcm94aW1hdGVseSAqbWF4aW1pemUqIGRpc3RhbmNlcz8pXG4gICAgICAgIHJlc3VsdCA9IFt4LCB5LCBJbmZpbml0eV07IC8vIHoyIHVycmVsZXZhbnRcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgY29uc3QgW3gsIHldID0gcmVzdWx0O1xuICAgICAgICBwbGFjZWQucHVzaChbbSwgeCwgeSwgcl0pO1xuICAgICAgICBjb25zdCBzY3IgPSAoeSAmIDB4ZjApIHwgKHggJiAweGYwKSA+Pj4gNDtcbiAgICAgICAgY29uc3QgdGlsZSA9ICh5ICYgMHgwZikgPDwgNCB8ICh4ICYgMHgwZik7XG4gICAgICAgIHJldHVybiBzY3IgPDwgOCB8IHRpbGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICAvLyBUT0RPIC0gYWxsb3cgbGVzcyByYW5kb21uZXNzIGZvciBjZXJ0YWluIGNhc2VzLCBlLmcuIHRvcCBvZiBub3J0aCBzYWJyZSBvclxuICAvLyBhcHByb3ByaWF0ZSBzaWRlIG9mIGNvcmRlbC5cblxuICAvKiogQHJldHVybiB7IVNldDxudW1iZXI+fSAqL1xuICAvLyBhbGxUaWxlcygpIHtcbiAgLy8gICBjb25zdCB0aWxlcyA9IG5ldyBTZXQoKTtcbiAgLy8gICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgLy8gICAgIGZvciAoY29uc3QgdGlsZSBvZiBzY3JlZW4uYWxsVGlsZXMoKSkge1xuICAvLyAgICAgICB0aWxlcy5hZGQodGlsZSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiB0aWxlcztcbiAgLy8gfVxuXG5cbiAgLy8gVE9ETyAtIHVzZSBtZXRhc2NyZWVuIGZvciB0aGlzIGxhdGVyXG4gIHJlc2l6ZVNjcmVlbnModG9wOiBudW1iZXIsIGxlZnQ6IG51bWJlciwgYm90dG9tOiBudW1iZXIsIHJpZ2h0OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgZmlsbCA9IDApIHtcbiAgICBjb25zdCBuZXdXaWR0aCA9IHRoaXMud2lkdGggKyBsZWZ0ICsgcmlnaHQ7XG4gICAgY29uc3QgbmV3SGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyB0b3AgKyBib3R0b207XG4gICAgY29uc3QgbmV3U2NyZWVucyA9IEFycmF5LmZyb20oe2xlbmd0aDogbmV3SGVpZ2h0fSwgKF8sIHkpID0+IHtcbiAgICAgIHkgLT0gdG9wO1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oe2xlbmd0aDogbmV3V2lkdGh9LCAoXywgeCkgPT4ge1xuICAgICAgICB4IC09IGxlZnQ7XG4gICAgICAgIGlmICh5IDwgMCB8fCB4IDwgMCB8fCB5ID49IHRoaXMuaGVpZ2h0IHx8IHggPj0gdGhpcy53aWR0aCkgcmV0dXJuIGZpbGw7XG4gICAgICAgIHJldHVybiB0aGlzLnNjcmVlbnNbeV1beF07XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLndpZHRoID0gbmV3V2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgdGhpcy5zY3JlZW5zID0gbmV3U2NyZWVucztcbiAgICAvLyBUT0RPIC0gaWYgYW55IG9mIHRoZXNlIGdvIG5lZ2F0aXZlLCB3ZSdyZSBpbiB0cm91YmxlLi4uXG4gICAgLy8gUHJvYmFibHkgdGhlIGJlc3QgYmV0IHdvdWxkIGJlIHRvIHB1dCBhIGNoZWNrIGluIHRoZSBzZXR0ZXI/XG4gICAgZm9yIChjb25zdCBmIG9mIHRoaXMuZmxhZ3MpIHtcbiAgICAgIGYueHMgKz0gbGVmdDtcbiAgICAgIGYueXMgKz0gdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHAgb2YgdGhpcy5waXRzKSB7XG4gICAgICBwLmZyb21YcyArPSBsZWZ0O1xuICAgICAgcC5mcm9tWXMgKz0gdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHMgb2YgWy4uLnRoaXMuc3Bhd25zLCAuLi50aGlzLmV4aXRzXSkge1xuICAgICAgcy54dCArPSAxNiAqIGxlZnQ7XG4gICAgICBzLnl0ICs9IDE2ICogdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGUgb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgIGlmICghZS51c2VkKSBjb250aW51ZTtcbiAgICAgIGUueCArPSAyNTYgKiBsZWZ0O1xuICAgICAgZS55ICs9IDI1NiAqIHRvcDtcbiAgICB9XG4gIH1cblxuICAvKiogTk9URTogaWYgYSBzY3JlZW4gaXMgbmVnYXRpdmUsIHNldHMgdGhlIEFsd2F5c1RydWUgZmxhZy4gKi9cbiAgd3JpdGVTY3JlZW5zMmQoc3RhcnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgZGF0YTogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PG51bWJlciB8IG51bGw+Pikge1xuICAgIGNvbnN0IHgwID0gc3RhcnQgJiAweGY7XG4gICAgY29uc3QgeTAgPSBzdGFydCA+Pj4gNDtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGRhdGEubGVuZ3RoOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGRhdGFbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHJvdy5sZW5ndGg7IHgrKykge1xuICAgICAgICBsZXQgdGlsZSA9IHJvd1t4XTtcbiAgICAgICAgaWYgKHRpbGUgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGlmICh0aWxlIDwgMCkge1xuICAgICAgICAgIHRpbGUgPSB+dGlsZTtcbiAgICAgICAgICB0aGlzLmZsYWdzLnB1c2goRmxhZy5vZih7c2NyZWVuOiAoeTAgKyB5KSA8PCA0IHwgKHgwICsgeCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWc6IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWR9KSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY3JlZW5zW3kwICsgeV1beDAgKyB4XSA9IHRpbGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ29ubmVjdCB0d28gc2NyZWVucyB2aWEgZW50cmFuY2VzLlxuICAvLyBBc3N1bWVzIGV4aXRzIGFuZCBlbnRyYW5jZXMgYXJlIGNvbXBsZXRlbHkgYWJzZW50LlxuICAvLyBTY3JlZW4gSURzIG11c3QgYmUgaW4gc2NyZWVuRXhpdHMuXG4gIC8vIFNVUEVSIEhBQ0tZIC0gaWYgcG9zIGlzIG5lZ2F0aXZlLCB1c2UgY29tcGxlbWVudCBhbmQgYWx0ZXJuYXRlIHN0YWlycy5cbiAgY29ubmVjdChwb3M6IG51bWJlciwgdGhhdDogTG9jYXRpb24sIHRoYXRQb3M6IG51bWJlcikge1xuICAgIGNvbnN0IHRoaXNBbHQgPSBwb3MgPCAwID8gMHgxMDAgOiAwO1xuICAgIGNvbnN0IHRoYXRBbHQgPSB0aGF0UG9zIDwgMCA/IDB4MTAwIDogMDtcbiAgICBwb3MgPSBwb3MgPCAwID8gfnBvcyA6IHBvcztcbiAgICB0aGF0UG9zID0gdGhhdFBvcyA8IDAgPyB+dGhhdFBvcyA6IHRoYXRQb3M7XG4gICAgY29uc3QgdGhpc1kgPSBwb3MgPj4+IDQ7XG4gICAgY29uc3QgdGhpc1ggPSBwb3MgJiAweGY7XG4gICAgY29uc3QgdGhhdFkgPSB0aGF0UG9zID4+PiA0O1xuICAgIGNvbnN0IHRoYXRYID0gdGhhdFBvcyAmIDB4ZjtcbiAgICBjb25zdCB0aGlzVGlsZSA9IHRoaXMuc2NyZWVuc1t0aGlzWV1bdGhpc1hdO1xuICAgIGNvbnN0IHRoYXRUaWxlID0gdGhhdC5zY3JlZW5zW3RoYXRZXVt0aGF0WF07XG4gICAgY29uc3QgW3RoaXNFbnRyYW5jZSwgdGhpc0V4aXRzXSA9IHNjcmVlbkV4aXRzW3RoaXNBbHQgfCB0aGlzVGlsZV07XG4gICAgY29uc3QgW3RoYXRFbnRyYW5jZSwgdGhhdEV4aXRzXSA9IHNjcmVlbkV4aXRzW3RoYXRBbHQgfCB0aGF0VGlsZV07XG4gICAgY29uc3QgdGhpc0VudHJhbmNlSW5kZXggPSB0aGlzLmVudHJhbmNlcy5sZW5ndGg7XG4gICAgY29uc3QgdGhhdEVudHJhbmNlSW5kZXggPSB0aGF0LmVudHJhbmNlcy5sZW5ndGg7XG4gICAgdGhpcy5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eTogdGhpc1kgPDwgOCB8IHRoaXNFbnRyYW5jZSA+Pj4gOCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB0aGlzWCA8PCA4IHwgdGhpc0VudHJhbmNlICYgMHhmZn0pKTtcbiAgICB0aGF0LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt5OiB0aGF0WSA8PCA4IHwgdGhhdEVudHJhbmNlID4+PiA4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHRoYXRYIDw8IDggfCB0aGF0RW50cmFuY2UgJiAweGZmfSkpO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzRXhpdHMpIHtcbiAgICAgIHRoaXMuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHBvcywgdGlsZTogZXhpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0OiB0aGF0LmlkLCBlbnRyYW5jZTogdGhhdEVudHJhbmNlSW5kZXh9KSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGF0RXhpdHMpIHtcbiAgICAgIHRoYXQuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHRoYXRQb3MsIHRpbGU6IGV4aXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdDogdGhpcy5pZCwgZW50cmFuY2U6IHRoaXNFbnRyYW5jZUluZGV4fSkpO1xuICAgIH1cbiAgfVxuXG4gIG5laWdoYm9yRm9yRW50cmFuY2UoZW50cmFuY2VJZDogbnVtYmVyKTogTG9jYXRpb24ge1xuICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZXNbZW50cmFuY2VJZF07XG4gICAgaWYgKCFlbnRyYW5jZSkgdGhyb3cgbmV3IEVycm9yKGBubyBlbnRyYW5jZSAke2hleCh0aGlzLmlkKX06JHtlbnRyYW5jZUlkfWApO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC5zY3JlZW4gIT09IGVudHJhbmNlLnNjcmVlbikgY29udGludWU7XG4gICAgICBjb25zdCBkeCA9IE1hdGguYWJzKGV4aXQueCAtIGVudHJhbmNlLngpO1xuICAgICAgY29uc3QgZHkgPSBNYXRoLmFicyhleGl0LnkgLSBlbnRyYW5jZS55KTtcbiAgICAgIGlmIChkeCA8IDI0ICYmIGR5IDwgMjQpIHJldHVybiB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdC5kZXN0XTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBubyBleGl0IGZvdW5kIG5lYXIgJHtoZXgodGhpcy5pZCl9OiR7ZW50cmFuY2VJZH1gKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBgJHtzdXBlci50b1N0cmluZygpfSAke3RoaXMubmFtZX1gO1xuICB9XG59XG5cbi8vIFRPRE8gLSBtb3ZlIHRvIGEgYmV0dGVyLW9yZ2FuaXplZCBkZWRpY2F0ZWQgXCJnZW9tZXRyeVwiIG1vZHVsZT9cbmZ1bmN0aW9uIG5laWdoYm9ycyh0aWxlOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgY29uc3QgeSA9IHRpbGUgJiAweGYwZjA7XG4gIGNvbnN0IHggPSB0aWxlICYgMHgwZjBmO1xuICBpZiAoeSA8ICgoaGVpZ2h0IC0gMSkgPDwgMTIgfCAweGUwKSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4ZTAgPyB0aWxlICsgMHgwZjIwIDogdGlsZSArIDE2KTtcbiAgfVxuICBpZiAoeSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4MDAgPyB0aWxlIC0gMHgwZjIwIDogdGlsZSAtIDE2KTtcbiAgfVxuICBpZiAoeCA8ICgod2lkdGggLSAxKSA8PCA4IHwgMHgwZikpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDBmID8gdGlsZSArIDB4MDBmMSA6IHRpbGUgKyAxKTtcbiAgfVxuICBpZiAoeCkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHgwZikgPT09IDB4MDAgPyB0aWxlIC0gMHgwMGYxIDogdGlsZSAtIDEpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIHZlcnkgc2ltcGxlIHZlcnNpb24gb2Ygd2hhdCB3ZSdyZSBkb2luZyB3aXRoIG1ldGFzY3JlZW5zXG5jb25zdCBzY3JlZW5FeGl0czoge1tpZDogbnVtYmVyXTogcmVhZG9ubHkgW251bWJlciwgcmVhZG9ubHkgW251bWJlciwgbnVtYmVyXV19ID0ge1xuICAweDE1OiBbMHg5MF9hMCwgWzB4ODksIDB4OGFdXSwgLy8gY2F2ZSBvbiBsZWZ0IGJvdW5kYXJ5XG4gIDB4MTk6IFsweDYwXzkwLCBbMHg1OCwgMHg1OV1dLCAvLyBjYXZlIG9uIHJpZ2h0IGJvdW5kYXJ5IChub3Qgb24gZ3Jhc3MpXG4gIDB4OTY6IFsweDQwXzMwLCBbMHgzMiwgMHgzM11dLCAvLyB1cCBzdGFpciBmcm9tIGxlZnRcbiAgMHg5NzogWzB4YWZfMzAsIFsweGIyLCAweGIzXV0sIC8vIGRvd24gc3RhaXIgZnJvbSBsZWZ0XG4gIDB4OTg6IFsweDQwX2QwLCBbMHgzYywgMHgzZF1dLCAvLyB1cCBzdGFpciBmcm9tIHJpZ2h0XG4gIDB4OTk6IFsweGFmX2QwLCBbMHhiYywgMHhiZF1dLCAvLyBkb3duIHN0YWlyIGZyb20gcmlnaHRcbiAgMHg5YTogWzB4MWZfODAsIFsweDI3LCAweDI4XV0sIC8vIGRvd24gc3RhaXIgKGRvdWJsZSAtIGp1c3QgdXNlIGRvd24hKVxuICAweDllOiBbMHhkZl84MCwgWzB4ZTcsIDB4ZThdXSwgLy8gYm90dG9tIGVkZ2VcbiAgMHhjMTogWzB4NTBfYTAsIFsweDQ5LCAweDRhXV0sIC8vIGNhdmUgb24gdG9wIGJvdW5kYXJ5XG4gIDB4YzI6IFsweDYwX2IwLCBbMHg1YSwgMHg1Yl1dLCAvLyBjYXZlIG9uIGJvdHRvbS1yaWdodCBib3VuZGFyeVxuICAweDE5YTogWzB4ZDBfODAsIFsweGM3LCAweGM4XV0sIC8vIHVwIHN0YWlyIG9uIGRvdWJsZVxufTtcbiJdfQ==