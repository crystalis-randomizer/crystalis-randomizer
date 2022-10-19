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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBTyxLQUFLLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDdEMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUNuQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFL0MsT0FBTyxFQUFDLE9BQU8sRUFDUCxlQUFlLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUM5QyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFDdEMsa0JBQWtCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFN0MsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUkxRCxPQUFPLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUM7QUFFMUMsTUFBTSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQztBQTJCckMsTUFBTSxJQUFJLEdBQUc7SUFDWCxPQUFPLEVBQUUsTUFBTTtJQUNmLEtBQUssRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0lBQzFDLE9BQU8sRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0NBQ3BDLENB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QU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyRCxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO2dCQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUM5QyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdkQsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztnQkFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDL0M7UUFFRCxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQztRQUNwQyxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFDN0IsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztZQUdoRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3BDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDdEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDdEIsS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUU7Z0JBQ25C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SUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsS0FBSyxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQy9CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Fzc2VtYmxlcn0gZnJvbSAnLi4vYXNtL2Fzc2VtYmxlci5qcyc7XG5pbXBvcnQge0V4cHJ9IGZyb20gJy4uL2FzbS9leHByLmpzJztcbmltcG9ydCB7TW9kdWxlfSBmcm9tICcuLi9hc20vbW9kdWxlLmpzJztcbmltcG9ydCB7QXJlYSwgQXJlYXN9IGZyb20gJy4vYXJlYS5qcyc7XG5pbXBvcnQge0VudGl0eX0gZnJvbSAnLi9lbnRpdHkuanMnO1xuaW1wb3J0IHtNZXRhbG9jYXRpb259IGZyb20gJy4vbWV0YWxvY2F0aW9uLmpzJztcbmltcG9ydCB7U2NyZWVufSBmcm9tICcuL3NjcmVlbi5qcyc7XG5pbXBvcnQge1NlZ21lbnQsXG4gICAgICAgIGNvbmNhdEl0ZXJhYmxlcywgZnJlZSwgZ3JvdXAsIGhleCwgaW5pdGlhbGl6ZXIsXG4gICAgICAgIHJlYWRMaXR0bGVFbmRpYW4sIHNlcSwgdHVwbGUsIHZhclNsaWNlLFxuICAgICAgICB1cHBlckNhbWVsVG9TcGFjZXN9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHthc3NlcnROZXZlciwgaXRlcnMsIERlZmF1bHRNYXB9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtNb25zdGVyfSBmcm9tICcuL21vbnN0ZXIuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5cbmltcG9ydCB7RW50cmFuY2UsIEV4aXQsIEZsYWcsIFBpdCwgU3Bhd259IGZyb20gJy4vbG9jYXRpb250YWJsZXMuanMnO1xuZXhwb3J0IHtFbnRyYW5jZSwgRXhpdCwgRmxhZywgUGl0LCBTcGF3bn07IC8vIFRPRE8gLSByZW1vdmUgdGhlIHJlLWV4cG9ydFxuXG5jb25zdCB7JDBhLCAkMGIsICQwYywgJDBkfSA9IFNlZ21lbnQ7XG5cbmV4cG9ydCB0eXBlIEhvdXNlVHlwZSA9ICdpbm4nIHwgJ2FybW9yJyB8ICd0b29sJyB8ICd0YXZlcm4nIHwgJ3Bhd24nIHxcbiAgICAgICAgICAgICAgICAgICAgICAgICdzaGVkJyB8ICdob3VzZScgfCAncGFsYWNlJyB8ICdvdXRzaWRlJztcbi8vIE51bWJlciBpbmRpY2F0ZXMgdG8gY29weSB3aGF0ZXZlcidzIGF0IHRoZSBnaXZlbiBleGl0XG50eXBlIEdyb3VwS2V5ID0gc3RyaW5nIHwgc3ltYm9sIHwgbnVtYmVyO1xuLy8gTG9jYWwgZm9yIGRlZmluaW5nIG5hbWVzIG9uIExvY2F0aW9ucyBvYmplY3RzLlxuaW50ZXJmYWNlIExvY2F0aW9uSW5pdCB7XG4gIGFyZWE/OiBBcmVhO1xuICBzdWJBcmVhPzogc3RyaW5nO1xuICBtdXNpYz86IEdyb3VwS2V5IHwgKChhcmVhOiBBcmVhKSA9PiBHcm91cEtleSk7XG4gIHBhbGV0dGU/OiBHcm91cEtleSB8ICgoYXJlYTogQXJlYSkgPT4gR3JvdXBLZXkpO1xuICBib3NzU2NyZWVuPzogbnVtYmVyO1xuICBmaXhlZD86IHJlYWRvbmx5IG51bWJlcltdO1xuICBob3VzZVR5cGU/OiBIb3VzZVR5cGU7XG59XG5pbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYTogQXJlYTtcbiAgbmFtZTogc3RyaW5nO1xuICBtdXNpYzogR3JvdXBLZXk7XG4gIHBhbGV0dGU6IEdyb3VwS2V5O1xuICBzdWJBcmVhPzogc3RyaW5nO1xuICBib3NzU2NyZWVuPzogbnVtYmVyO1xuICBmaXhlZD86IHJlYWRvbmx5IG51bWJlcltdOyAvLyBmaXhlZCBzcGF3biBzbG90cz9cbiAgaG91c2VUeXBlPzogSG91c2VUeXBlO1xufVxuXG5jb25zdCBDQVZFID0ge1xuICBzdWJBcmVhOiAnY2F2ZScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1DYXZlYCxcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tQ2F2ZWAsXG59IGFzIGNvbnN0O1xuY29uc3QgSE9VU0UgPSB7XG4gIHN1YkFyZWE6ICdob3VzZScsXG4gIHBhbGV0dGU6ICgpID0+IFN5bWJvbCgpLFxufSBhcyBjb25zdDtcbmNvbnN0IEZPUlRVTkVfVEVMTEVSID0ge1xuICBzdWJBcmVhOiAnaG91c2UnLFxuICBwYWxldHRlOiAoKSA9PiBTeW1ib2woKSxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUZvcnR1bmVUZWxsZXJgLFxufSBhcyBjb25zdDtcbmNvbnN0IE1FU0lBID0ge1xuICBuYW1lOiAnbWVzaWEnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tTWVzaWFgLFxuICAvLyBNZXNpYSBpbiB0b3dlciBrZWVwcyBzYW1lIHBhbGV0dGVcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGFyZWEubmFtZSA9PT0gJ1Rvd2VyJyA/XG4gICAgICBhcmVhLm5hbWUgOiBgJHthcmVhLm5hbWV9LU1lc2lhYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBEWU5BID0ge1xuICBuYW1lOiAnZHluYScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1EeW5hYCxcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tRHluYWAsXG59IGFzIGNvbnN0O1xuY29uc3QgS0VMQkVTUVVFID0ge1xuICBuYW1lOiAnZ29hIDEnLFxuICBtdXNpYzogJ2dvYSAxJyxcbiAgcGFsZXR0ZTogJ2dvYSAxJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBTQUJFUkEgPSB7XG4gIG5hbWU6ICdnb2EgMicsXG4gIG11c2ljOiAnZ29hIDInLFxuICBwYWxldHRlOiAnZ29hIDInLFxufSBhcyBjb25zdDtcbmNvbnN0IE1BRE9fTE9XRVIgPSB7XG4gIG5hbWU6ICdnb2EgMycsXG4gIG11c2ljOiAnZ29hIDMnLFxuICBwYWxldHRlOiAnZ29hIDMnLFxufSBhcyBjb25zdDtcbmNvbnN0IE1BRE9fVVBQRVIgPSB7Li4uTUFET19MT1dFUiwgcGFsZXR0ZTogJ2dvYSAzIHVwcGVyJ30gYXMgY29uc3Q7XG5jb25zdCBLQVJNSU5FX1VQUEVSID0ge1xuICBuYW1lOiAnZ29hIDQnLFxuICBtdXNpYzogJ2dvYSA0JyxcbiAgcGFsZXR0ZTogJ2dvYSA0Jyxcbn0gYXMgY29uc3Q7XG5jb25zdCBLQVJNSU5FX0xPV0VSID0gey4uLktBUk1JTkVfVVBQRVIsIHBhbGV0dGU6ICdnb2EgNCBsb3dlcid9IGFzIGNvbnN0O1xuXG50eXBlIEluaXRQYXJhbXMgPSByZWFkb25seSBbbnVtYmVyLCBMb2NhdGlvbkluaXQ/XTtcbnR5cGUgSW5pdCA9IHsoLi4uYXJnczogSW5pdFBhcmFtcyk6IExvY2F0aW9uLFxuICAgICAgICAgICAgIGNvbW1pdChsb2NhdGlvbnM6IExvY2F0aW9ucyk6IHZvaWR9O1xuY29uc3QgJDogSW5pdCA9ICgoKSA9PiB7XG4gIGNvbnN0ICQgPSBpbml0aWFsaXplcjxbbnVtYmVyLCBMb2NhdGlvbkluaXRdLCBMb2NhdGlvbj4oKTtcbiAgbGV0IGFyZWEhOiBBcmVhO1xuICBmdW5jdGlvbiAkJChpZDogbnVtYmVyLCBkYXRhOiBMb2NhdGlvbkluaXQgPSB7fSk6IExvY2F0aW9uIHtcbiAgICBkYXRhID0gey4uLmRhdGF9O1xuICAgIGFyZWEgPSBkYXRhLmFyZWEgPSBkYXRhLmFyZWEgfHwgYXJlYTtcbiAgICByZXR1cm4gJChpZCwgZGF0YSk7XG4gIH07XG4gICgkJCBhcyBJbml0KS5jb21taXQgPSAobG9jYXRpb25zOiBMb2NhdGlvbnMpID0+IHtcbiAgICAkLmNvbW1pdChsb2NhdGlvbnMsIChwcm9wOiBzdHJpbmcsIGlkOiBudW1iZXIsIGluaXQ6IExvY2F0aW9uSW5pdCkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IHVwcGVyQ2FtZWxUb1NwYWNlcyhwcm9wKTtcbiAgICAgIGNvbnN0IGFyZWEgPSBpbml0LmFyZWEhO1xuICAgICAgY29uc3QgbXVzaWMgPSB0eXBlb2YgaW5pdC5tdXNpYyA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgaW5pdC5tdXNpYyhhcmVhKSA6IGluaXQubXVzaWMgIT0gbnVsbCA/XG4gICAgICAgICAgaW5pdC5tdXNpYyA6IGFyZWEubmFtZTtcbiAgICAgIGNvbnN0IHBhbGV0dGUgPSB0eXBlb2YgaW5pdC5wYWxldHRlID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICBpbml0LnBhbGV0dGUoYXJlYSkgOiBpbml0LnBhbGV0dGUgfHwgYXJlYS5uYW1lO1xuICAgICAgY29uc3QgZGF0YTogTG9jYXRpb25EYXRhID0ge2FyZWEsIG5hbWUsIG11c2ljLCBwYWxldHRlfTtcbiAgICAgIGlmIChpbml0LmhvdXNlVHlwZSAhPSBudWxsKSBkYXRhLmhvdXNlVHlwZSA9IGluaXQuaG91c2VUeXBlO1xuICAgICAgaWYgKGluaXQuc3ViQXJlYSAhPSBudWxsKSBkYXRhLnN1YkFyZWEgPSBpbml0LnN1YkFyZWE7XG4gICAgICBpZiAoaW5pdC5ib3NzU2NyZWVuICE9IG51bGwpIGRhdGEuYm9zc1NjcmVlbiA9IGluaXQuYm9zc1NjcmVlbjtcbiAgICAgIGNvbnN0IGxvY2F0aW9uID0gbmV3IExvY2F0aW9uKGxvY2F0aW9ucy5yb20sIGlkLCBkYXRhKTtcbiAgICAgIC8vIG5lZ2F0aXZlIGlkIGluZGljYXRlcyBpdCdzIG5vdCByZWdpc3RlcmVkLlxuICAgICAgaWYgKGlkID49IDApIGxvY2F0aW9uc1tpZF0gPSBsb2NhdGlvbjtcbiAgICAgIHJldHVybiBsb2NhdGlvbjtcbiAgICB9KTtcbiAgfTtcbiAgcmV0dXJuICQkIGFzIEluaXQ7XG59KSgpO1xuXG5leHBvcnQgY2xhc3MgTG9jYXRpb25zIGV4dGVuZHMgQXJyYXk8TG9jYXRpb24+IHtcblxuICByZWFkb25seSBNZXphbWVTaHJpbmUgICAgICAgICAgICAgPSAkKDB4MDAsIHthcmVhOiBBcmVhcy5NZXphbWV9KTtcbiAgcmVhZG9ubHkgTGVhZl9PdXRzaWRlU3RhcnQgICAgICAgID0gJCgweDAxLCB7bXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgTGVhZiAgICAgICAgICAgICAgICAgICAgID0gJCgweDAyLCB7YXJlYTogQXJlYXMuTGVhZn0pO1xuICByZWFkb25seSBWYWxsZXlPZldpbmQgICAgICAgICAgICAgPSAkKDB4MDMsIHthcmVhOiBBcmVhcy5WYWxsZXlPZldpbmR9KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTEgICAgICAgICAgICAgID0gJCgweDA0LCB7YXJlYTogQXJlYXMuU2VhbGVkQ2F2ZX0pO1xuICByZWFkb25seSBTZWFsZWRDYXZlMiAgICAgICAgICAgICAgPSAkKDB4MDUpO1xuICByZWFkb25seSBTZWFsZWRDYXZlNiAgICAgICAgICAgICAgPSAkKDB4MDYpO1xuICByZWFkb25seSBTZWFsZWRDYXZlNCAgICAgICAgICAgICAgPSAkKDB4MDcpO1xuICByZWFkb25seSBTZWFsZWRDYXZlNSAgICAgICAgICAgICAgPSAkKDB4MDgpO1xuICByZWFkb25seSBTZWFsZWRDYXZlMyAgICAgICAgICAgICAgPSAkKDB4MDkpO1xuICByZWFkb25seSBTZWFsZWRDYXZlNyAgICAgICAgICAgICAgPSAkKDB4MGEsIHtib3NzU2NyZWVuOiAweDkxfSk7XG4gIC8vIElOVkFMSUQ6IDB4MGJcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTggICAgICAgICAgICAgID0gJCgweDBjKTtcbiAgLy8gSU5WQUxJRDogMHgwZFxuICByZWFkb25seSBXaW5kbWlsbENhdmUgICAgICAgICAgICAgPSAkKDB4MGUsIHthcmVhOiBBcmVhcy5XaW5kbWlsbENhdmV9KTtcbiAgcmVhZG9ubHkgV2luZG1pbGwgICAgICAgICAgICAgICAgID0gJCgweDBmLCB7YXJlYTogQXJlYXMuV2luZG1pbGwsIG11c2ljOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdvdXRzaWRlJ30pO1xuICByZWFkb25seSBaZWJ1Q2F2ZSAgICAgICAgICAgICAgICAgPSAkKDB4MTAsIHthcmVhOiBBcmVhcy5aZWJ1Q2F2ZX0pO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlMSAgICAgICAgPSAkKDB4MTEsIHthcmVhOiBBcmVhcy5NdFNhYnJlV2VzdCwgLi4uQ0FWRX0pO1xuICAvLyBJTlZBTElEOiAweDEyXG4gIC8vIElOVkFMSUQ6IDB4MTNcbiAgcmVhZG9ubHkgQ29yZGVsUGxhaW5XZXN0ICAgICAgICAgID0gJCgweDE0LCB7YXJlYTogQXJlYXMuQ29yZGVsUGxhaW59KTtcbiAgcmVhZG9ubHkgQ29yZGVsUGxhaW5FYXN0ICAgICAgICAgID0gJCgweDE1KTtcbiAgLy8gSU5WQUxJRDogMHgxNiAtLSB1bnVzZWQgY29weSBvZiAxOFxuICAvLyBJTlZBTElEOiAweDE3XG4gIHJlYWRvbmx5IEJyeW5tYWVyICAgICAgICAgICAgICAgICA9ICQoMHgxOCwge2FyZWE6IEFyZWFzLkJyeW5tYWVyfSk7XG4gIHJlYWRvbmx5IE91dHNpZGVTdG9tSG91c2UgICAgICAgICA9ICQoMHgxOSwge2FyZWE6IEFyZWFzLlN0b21Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgU3dhbXAgICAgICAgICAgICAgICAgICAgID0gJCgweDFhLCB7YXJlYTogQXJlYXMuU3dhbXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4N2N9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXMgICAgICAgICAgICAgICAgID0gJCgweDFiLCB7YXJlYTogQXJlYXMuQW1hem9uZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpeGVkOiBbMHgwZCwgMHgwZV19KTtcbiAgcmVhZG9ubHkgT2FrICAgICAgICAgICAgICAgICAgICAgID0gJCgweDFjLCB7YXJlYTogQXJlYXMuT2FrfSk7XG4gIC8vIElOVkFMSUQ6IDB4MWRcbiAgcmVhZG9ubHkgU3RvbUhvdXNlICAgICAgICAgICAgICAgID0gJCgweDFlLCB7YXJlYTogQXJlYXMuU3RvbUhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdvdXRzaWRlJ30pO1xuICAvLyBJTlZBTElEOiAweDFmXG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0xvd2VyICAgICAgICA9ICQoMHgyMCwge2FyZWE6IEFyZWFzLk10U2FicmVXZXN0fSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X1VwcGVyICAgICAgICA9ICQoMHgyMSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmUyICAgICAgICA9ICQoMHgyMiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmUzICAgICAgICA9ICQoMHgyMywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU0ICAgICAgICA9ICQoMHgyNCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU1ICAgICAgICA9ICQoMHgyNSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU2ICAgICAgICA9ICQoMHgyNiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU3ICAgICAgICA9ICQoMHgyNywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9NYWluICAgICAgICA9ICQoMHgyOCwge2FyZWE6IEFyZWFzLk10U2FicmVOb3J0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHhiNX0pO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTWlkZGxlICAgICAgPSAkKDB4MjkpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTIgICAgICAgPSAkKDB4MmEsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTMgICAgICAgPSAkKDB4MmIsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTQgICAgICAgPSAkKDB4MmMsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTUgICAgICAgPSAkKDB4MmQsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTYgICAgICAgPSAkKDB4MmUsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfUHJpc29uSGFsbCAgPSAkKDB4MmYsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTGVmdENlbGwgICAgPSAkKDB4MzAsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTGVmdENlbGwyICAgPSAkKDB4MzEsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfUmlnaHRDZWxsICAgPSAkKDB4MzIsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTggICAgICAgPSAkKDB4MzMsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTkgICAgICAgPSAkKDB4MzQsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfU3VtbWl0Q2F2ZSAgPSAkKDB4MzUsIENBVkUpO1xuICAvLyBJTlZBTElEOiAweDM2XG4gIC8vIElOVkFMSUQ6IDB4MzdcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUxICAgICAgID0gJCgweDM4LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU3ICAgICAgID0gJCgweDM5LCBDQVZFKTtcbiAgLy8gSU5WQUxJRDogMHgzYVxuICAvLyBJTlZBTElEOiAweDNiXG4gIHJlYWRvbmx5IE5hZGFyZV9Jbm4gICAgICAgICAgICAgICA9ICQoMHgzYywge2FyZWE6IEFyZWFzLk5hZGFyZSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgTmFkYXJlX1Rvb2xTaG9wICAgICAgICAgID0gJCgweDNkLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ3Rvb2wnfSk7XG4gIHJlYWRvbmx5IE5hZGFyZV9CYWNrUm9vbSAgICAgICAgICA9ICQoMHgzZSwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgLy8gSU5WQUxJRDogMHgzZlxuICByZWFkb25seSBXYXRlcmZhbGxWYWxsZXlOb3J0aCAgICAgPSAkKDB4NDAsIHthcmVhOiBBcmVhcy5XYXRlcmZhbGxWYWxsZXl9KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsVmFsbGV5U291dGggICAgID0gJCgweDQxKTtcbiAgcmVhZG9ubHkgTGltZVRyZWVWYWxsZXkgICAgICAgICAgID0gJCgweDQyLCB7YXJlYTogQXJlYXMuTGltZVRyZWVWYWxsZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IExpbWVUcmVlTGFrZSAgICAgICAgICAgICA9ICQoMHg0Mywge2FyZWE6IEFyZWFzLkxpbWVUcmVlTGFrZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgS2lyaXNhUGxhbnRDYXZlMSAgICAgICAgID0gJCgweDQ0LCB7YXJlYTogQXJlYXMuS2lyaXNhUGxhbnRDYXZlfSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTIgICAgICAgICA9ICQoMHg0NSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTMgICAgICAgICA9ICQoMHg0Nik7XG4gIHJlYWRvbmx5IEtpcmlzYU1lYWRvdyAgICAgICAgICAgICA9ICQoMHg0Nywge2FyZWE6IEFyZWFzLktpcmlzYU1lYWRvd30pO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTEgICAgICAgICAgICAgPSAkKDB4NDgsIHthcmVhOiBBcmVhcy5Gb2dMYW1wQ2F2ZX0pO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTIgICAgICAgICAgICAgPSAkKDB4NDkpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTMgICAgICAgICAgICAgPSAkKDB4NGEpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZURlYWRFbmQgICAgICAgPSAkKDB4NGIpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTQgICAgICAgICAgICAgPSAkKDB4NGMpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTUgICAgICAgICAgICAgPSAkKDB4NGQpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTYgICAgICAgICAgICAgPSAkKDB4NGUpO1xuICByZWFkb25seSBGb2dMYW1wQ2F2ZTcgICAgICAgICAgICAgPSAkKDB4NGYpO1xuICByZWFkb25seSBQb3J0b2EgICAgICAgICAgICAgICAgICAgPSAkKDB4NTAsIHthcmVhOiBBcmVhcy5Qb3J0b2F9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX0Zpc2hlcm1hbklzbGFuZCAgID0gJCgweDUxLCB7YXJlYTogQXJlYXMuRmlzaGVybWFuSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IE1lc2lhU2hyaW5lICAgICAgICAgICAgICA9ICQoMHg1Miwge2FyZWE6IEFyZWFzLkxpbWVUcmVlTGFrZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uTUVTSUF9KTtcbiAgLy8gSU5WQUxJRDogMHg1M1xuICByZWFkb25seSBXYXRlcmZhbGxDYXZlMSAgICAgICAgICAgPSAkKDB4NTQsIHthcmVhOiBBcmVhcy5XYXRlcmZhbGxDYXZlfSk7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUyICAgICAgICAgICA9ICQoMHg1NSk7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUzICAgICAgICAgICA9ICQoMHg1Nik7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmU0ICAgICAgICAgICA9ICQoMHg1Nyk7XG4gIHJlYWRvbmx5IFRvd2VyRW50cmFuY2UgICAgICAgICAgICA9ICQoMHg1OCwge2FyZWE6IEFyZWFzLlRvd2VyfSk7XG4gIHJlYWRvbmx5IFRvd2VyMSAgICAgICAgICAgICAgICAgICA9ICQoMHg1OSk7XG4gIHJlYWRvbmx5IFRvd2VyMiAgICAgICAgICAgICAgICAgICA9ICQoMHg1YSk7XG4gIHJlYWRvbmx5IFRvd2VyMyAgICAgICAgICAgICAgICAgICA9ICQoMHg1Yik7XG4gIHJlYWRvbmx5IFRvd2VyT3V0c2lkZU1lc2lhICAgICAgICA9ICQoMHg1Yyk7XG4gIHJlYWRvbmx5IFRvd2VyT3V0c2lkZUR5bmEgICAgICAgICA9ICQoMHg1ZCk7XG4gIHJlYWRvbmx5IFRvd2VyTWVzaWEgICAgICAgICAgICAgICA9ICQoMHg1ZSwgTUVTSUEpO1xuICByZWFkb25seSBUb3dlckR5bmEgICAgICAgICAgICAgICAgPSAkKDB4NWYsIERZTkEpO1xuICByZWFkb25seSBBbmdyeVNlYSAgICAgICAgICAgICAgICAgPSAkKDB4NjAsIHthcmVhOiBBcmVhcy5BbmdyeVNlYX0pO1xuICByZWFkb25seSBCb2F0SG91c2UgICAgICAgICAgICAgICAgPSAkKDB4NjEsIHtob3VzZVR5cGU6ICdvdXRzaWRlJ30pO1xuICByZWFkb25seSBKb2VsTGlnaHRob3VzZSAgICAgICAgICAgPSAkKDB4NjIsIHthcmVhOiBBcmVhcy5MaWdodGhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMCwgaG91c2VUeXBlOiAnb3V0c2lkZSd9KTtcbiAgLy8gSU5WQUxJRDogMHg2M1xuICByZWFkb25seSBVbmRlcmdyb3VuZENoYW5uZWwgICAgICAgPSAkKDB4NjQsIHthcmVhOiBBcmVhcy5VbmRlcmdyb3VuZENoYW5uZWx9KTtcbiAgcmVhZG9ubHkgWm9tYmllVG93biAgICAgICAgICAgICAgID0gJCgweDY1LCB7YXJlYTogQXJlYXMuWm9tYmllVG93bn0pO1xuICAvLyBJTlZBTElEOiAweDY2XG4gIC8vIElOVkFMSUQ6IDB4NjdcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDEgICAgICAgID0gJCgweDY4LCB7YXJlYTogQXJlYXMuRXZpbFNwaXJpdElzbGFuZEVudHJhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMX0pO1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kMiAgICAgICAgPSAkKDB4NjksIHthcmVhOiBBcmVhcy5FdmlsU3Bpcml0SXNsYW5kfSk7XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQzICAgICAgICA9ICQoMHg2YSk7XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQ0ICAgICAgICA9ICQoMHg2Yik7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTEgICAgICAgICAgICA9ICQoMHg2Yywge2FyZWE6IEFyZWFzLlNhYmVyYUZvcnRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweGZkLCBob3VzZVR5cGU6ICdwYWxhY2UnfSk7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTIgICAgICAgICAgICA9ICQoMHg2ZCk7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTJfV2VzdCAgICAgICA9ICQoLTEpOyAgLy8gd2lsbCBnZXQgdGhlIHdlc3QgcGFydCBvZiBwYWxhY2UyXG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTMgICAgICAgICAgICA9ICQoMHg2ZSwge2Jvc3NTY3JlZW46IDB4ZmR9KTtcbiAgLy8gSU5WQUxJRDogMHg2ZiAtLSBTYWJlcmEgUGFsYWNlIDMgdW51c2VkIGNvcHlcbiAgcmVhZG9ubHkgSm9lbFNlY3JldFBhc3NhZ2UgICAgICAgID0gJCgweDcwLCB7YXJlYTogQXJlYXMuSm9lbFBhc3NhZ2V9KTtcbiAgcmVhZG9ubHkgSm9lbCAgICAgICAgICAgICAgICAgICAgID0gJCgweDcxLCB7YXJlYTogQXJlYXMuSm9lbH0pO1xuICByZWFkb25seSBTd2FuICAgICAgICAgICAgICAgICAgICAgPSAkKDB4NzIsIHthcmVhOiBBcmVhcy5Td2FuLCBtdXNpYzogMX0pO1xuICByZWFkb25seSBTd2FuR2F0ZSAgICAgICAgICAgICAgICAgPSAkKDB4NzMsIHthcmVhOiBBcmVhcy5Td2FuR2F0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDF9KTtcbiAgLy8gSU5WQUxJRDogMHg3NFxuICAvLyBJTlZBTElEOiAweDc1XG4gIC8vIElOVkFMSUQ6IDB4NzZcbiAgLy8gSU5WQUxJRDogMHg3N1xuICByZWFkb25seSBHb2FWYWxsZXkgICAgICAgICAgICAgICAgPSAkKDB4NzgsIHthcmVhOiBBcmVhcy5Hb2FWYWxsZXl9KTtcbiAgLy8gSU5WQUxJRDogMHg3OVxuICAvLyBJTlZBTElEOiAweDdhXG4gIC8vIElOVkFMSUQ6IDB4N2JcbiAgcmVhZG9ubHkgTXRIeWRyYSAgICAgICAgICAgICAgICAgID0gJCgweDdjLCB7YXJlYTogQXJlYXMuTXRIeWRyYX0pO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUxICAgICAgICAgICAgPSAkKDB4N2QsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX091dHNpZGVTaHlyb24gICAgPSAkKDB4N2UsIHtmaXhlZDogWzB4MGQsIDB4MGVdfSk7IC8vIGd1YXJkc1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUyICAgICAgICAgICAgPSAkKDB4N2YsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUzICAgICAgICAgICAgPSAkKDB4ODAsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU0ICAgICAgICAgICAgPSAkKDB4ODEsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU1ICAgICAgICAgICAgPSAkKDB4ODIsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU2ICAgICAgICAgICAgPSAkKDB4ODMsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU3ICAgICAgICAgICAgPSAkKDB4ODQsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU4ICAgICAgICAgICAgPSAkKDB4ODUsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU5ICAgICAgICAgICAgPSAkKDB4ODYsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUxMCAgICAgICAgICAgPSAkKDB4ODcsIENBVkUpO1xuICByZWFkb25seSBTdHl4MSAgICAgICAgICAgICAgICAgICAgPSAkKDB4ODgsIHthcmVhOiBBcmVhcy5TdHl4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdwYWxhY2UnfSk7XG4gIHJlYWRvbmx5IFN0eXgyICAgICAgICAgICAgICAgICAgICA9ICQoMHg4OSk7XG4gIHJlYWRvbmx5IFN0eXgyX0Vhc3QgICAgICAgICAgICAgICA9ICQoLTEpOyAgLy8gd2lsbCBnZXQgdGhlIGVhc3QgcGFydCBvZiBzdHh5IDJcbiAgcmVhZG9ubHkgU3R5eDMgICAgICAgICAgICAgICAgICAgID0gJCgweDhhKTtcbiAgLy8gSU5WQUxJRDogMHg4YlxuICByZWFkb25seSBTaHlyb24gICAgICAgICAgICAgICAgICAgPSAkKDB4OGMsIHthcmVhOiBBcmVhcy5TaHlyb259KTtcbiAgLy8gSU5WQUxJRDogMHg4ZFxuICByZWFkb25seSBHb2EgICAgICAgICAgICAgICAgICAgICAgPSAkKDB4OGUsIHthcmVhOiBBcmVhcy5Hb2F9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NCYXNlbWVudCAgICAgID0gJCgweDhmLCB7YXJlYTogQXJlYXMuRm9ydHJlc3NCYXNlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgRGVzZXJ0MSAgICAgICAgICAgICAgICAgID0gJCgweDkwLCB7YXJlYTogQXJlYXMuRGVzZXJ0MX0pO1xuICByZWFkb25seSBPYXNpc0NhdmVNYWluICAgICAgICAgICAgPSAkKDB4OTEsIHthcmVhOiBBcmVhcy5PYXNpc0NhdmV9KTtcbiAgcmVhZG9ubHkgRGVzZXJ0Q2F2ZTEgICAgICAgICAgICAgID0gJCgweDkyLCB7YXJlYTogQXJlYXMuRGVzZXJ0Q2F2ZTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFNhaGFyYSAgICAgICAgICAgICAgICAgICA9ICQoMHg5Mywge2FyZWE6IEFyZWFzLlNhaGFyYX0pO1xuICByZWFkb25seSBTYWhhcmFPdXRzaWRlQ2F2ZSAgICAgICAgPSAkKDB4OTQsIHttdXNpYzogMH0pOyAvLyBUT0RPIC0gc2FoYXJhPz8gZ2VuZXJpYz8/XG4gIHJlYWRvbmx5IERlc2VydENhdmUyICAgICAgICAgICAgICA9ICQoMHg5NSwge2FyZWE6IEFyZWFzLkRlc2VydENhdmUyLCBtdXNpYzogMX0pO1xuICByZWFkb25seSBTYWhhcmFNZWFkb3cgICAgICAgICAgICAgPSAkKDB4OTYsIHthcmVhOiBBcmVhcy5TYWhhcmFNZWFkb3csIG11c2ljOiAwfSk7XG4gIC8vIElOVkFMSUQ6IDB4OTdcbiAgcmVhZG9ubHkgRGVzZXJ0MiAgICAgICAgICAgICAgICAgID0gJCgweDk4LCB7YXJlYTogQXJlYXMuRGVzZXJ0Mn0pO1xuICAvLyBJTlZBTElEOiAweDk5XG4gIC8vIElOVkFMSUQ6IDB4OWFcbiAgLy8gSU5WQUxJRDogMHg5YlxuICByZWFkb25seSBQeXJhbWlkX0VudHJhbmNlICAgICAgICAgPSAkKDB4OWMsIHthcmVhOiBBcmVhcy5QeXJhbWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdwYWxhY2UnfSk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfQnJhbmNoICAgICAgICAgICA9ICQoMHg5ZCk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfTWFpbiAgICAgICAgICAgICA9ICQoMHg5ZSk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfRHJheWdvbiAgICAgICAgICA9ICQoMHg5Zik7XG4gIHJlYWRvbmx5IENyeXB0X0VudHJhbmNlICAgICAgICAgICA9ICQoMHhhMCwge2FyZWE6IEFyZWFzLkNyeXB0fSk7XG4gIHJlYWRvbmx5IENyeXB0X0hhbGwxICAgICAgICAgICAgICA9ICQoMHhhMSk7XG4gIHJlYWRvbmx5IENyeXB0X0JyYW5jaCAgICAgICAgICAgICA9ICQoMHhhMik7XG4gIHJlYWRvbmx5IENyeXB0X0RlYWRFbmRMZWZ0ICAgICAgICA9ICQoMHhhMyk7XG4gIHJlYWRvbmx5IENyeXB0X0RlYWRFbmRSaWdodCAgICAgICA9ICQoMHhhNCk7XG4gIHJlYWRvbmx5IENyeXB0X0hhbGwyICAgICAgICAgICAgICA9ICQoMHhhNSk7XG4gIHJlYWRvbmx5IENyeXB0X0RyYXlnb24yICAgICAgICAgICA9ICQoMHhhNik7XG4gIHJlYWRvbmx5IENyeXB0X1RlbGVwb3J0ZXIgICAgICAgICA9ICQoMHhhNywge211c2ljOiAnQ3J5cHQtVGVsZXBvcnRlcid9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfRW50cmFuY2UgICAgID0gJCgweGE4LCB7YXJlYTogQXJlYXMuR29hRm9ydHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAxLCAvLyBzYW1lIGFzIG5leHQgYXJlYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdwYWxhY2UnfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0tlbGJlc3F1ZSAgICA9ICQoMHhhOSwge2Jvc3NTY3JlZW46IDB4NzMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLktFTEJFU1FVRX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19aZWJ1ICAgICAgICAgPSAkKDB4YWEsIHsuLi5LRUxCRVNRVUUsIHBhbGV0dGU6IDF9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfU2FiZXJhICAgICAgID0gJCgweGFiLCBTQUJFUkEpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19Ub3JuZWwgICAgICAgPSAkKDB4YWMsIHtib3NzU2NyZWVuOiAweDkxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5TQUJFUkEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhbGV0dGU6IDF9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfTWFkbzEgICAgICAgID0gJCgweGFkLCBNQURPX0xPV0VSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfTWFkbzIgICAgICAgID0gJCgweGFlLCBNQURPX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfTWFkbzMgICAgICAgID0gJCgweGFmLCBNQURPX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTEgICAgID0gJCgweGIwLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTIgICAgID0gJCgweGIxLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTMgICAgID0gJCgweGIyLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTQgICAgID0gJCgweGIzLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTUgICAgID0gJCgweGI0LCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTYgICAgID0gJCgweGI1LCBLQVJNSU5FX0xPV0VSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTcgICAgID0gJCgweGI2LCB7Ym9zc1NjcmVlbjogMHhmZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uS0FSTUlORV9MT1dFUn0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19FeGl0ICAgICAgICAgPSAkKDB4YjcsIHttdXNpYzogMH0pOyAvLyBzYW1lIGFzIHRvcCBnb2FcbiAgcmVhZG9ubHkgT2FzaXNDYXZlX0VudHJhbmNlICAgICAgID0gJCgweGI4LCB7YXJlYTogQXJlYXMuT2FzaXNFbnRyYW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDJ9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfQXNpbmEgICAgICAgID0gJCgweGI5LCB7YXJlYTogQXJlYXMuR29hRm9ydHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLk1BRE9fVVBQRVIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4OTF9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2Vuc3UgICAgICAgID0gJCgweGJhLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hX0hvdXNlICAgICAgICAgICAgICAgID0gJCgweGJiLCB7YXJlYTogQXJlYXMuR29hLCAuLi5IT1VTRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IEdvYV9Jbm4gICAgICAgICAgICAgICAgICA9ICQoMHhiYywgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdpbm4nfSk7XG4gIC8vIElOVkFMSUQ6IDB4YmRcbiAgcmVhZG9ubHkgR29hX1Rvb2xTaG9wICAgICAgICAgICAgID0gJCgweGJlLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ3Rvb2wnfSk7XG4gIHJlYWRvbmx5IEdvYV9UYXZlcm4gICAgICAgICAgICAgICA9ICQoMHhiZiwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0YXZlcm4nfSk7XG4gIHJlYWRvbmx5IExlYWZfRWxkZXJIb3VzZSAgICAgICAgICA9ICQoMHhjMCwge2FyZWE6IEFyZWFzLkxlYWYsIC4uLkhPVVNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgTGVhZl9SYWJiaXRIdXQgICAgICAgICAgID0gJCgweGMxLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ3NoZWQnfSk7XG4gIHJlYWRvbmx5IExlYWZfSW5uICAgICAgICAgICAgICAgICA9ICQoMHhjMiwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdpbm4nfSk7XG4gIHJlYWRvbmx5IExlYWZfVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhjMywgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICByZWFkb25seSBMZWFmX0FybW9yU2hvcCAgICAgICAgICAgPSAkKDB4YzQsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnYXJtb3InfSk7XG4gIHJlYWRvbmx5IExlYWZfU3R1ZGVudEhvdXNlICAgICAgICA9ICQoMHhjNSwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfVGF2ZXJuICAgICAgICAgID0gJCgweGM2LCB7YXJlYTogQXJlYXMuQnJ5bm1hZXIsIC4uLkhPVVNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICd0YXZlcm4nfSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX1Bhd25TaG9wICAgICAgICA9ICQoMHhjNywgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdwYXduJ30pO1xuICByZWFkb25seSBCcnlubWFlcl9Jbm4gICAgICAgICAgICAgPSAkKDB4YzgsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaW5uJ30pO1xuICByZWFkb25seSBCcnlubWFlcl9Bcm1vclNob3AgICAgICAgPSAkKDB4YzksIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnYXJtb3InfSk7XG4gIC8vIElOVkFMSUQ6IDB4Y2FcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfSXRlbVNob3AgICAgICAgID0gJCgweGNiLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ3Rvb2wnfSk7XG4gIC8vIElOVkFMSUQ6IDB4Y2NcbiAgcmVhZG9ubHkgT2FrX0VsZGVySG91c2UgICAgICAgICAgID0gJCgweGNkLCB7YXJlYTogQXJlYXMuT2FrLCAuLi5IT1VTRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IE9ha19Nb3RoZXJIb3VzZSAgICAgICAgICA9ICQoMHhjZSwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgT2FrX1Rvb2xTaG9wICAgICAgICAgICAgID0gJCgweGNmLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ3Rvb2wnfSk7XG4gIHJlYWRvbmx5IE9ha19Jbm4gICAgICAgICAgICAgICAgICA9ICQoMHhkMCwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdpbm4nfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0lubiAgICAgICAgICAgICA9ICQoMHhkMSwge2FyZWE6IEFyZWFzLkFtYXpvbmVzLCAuLi5IT1VTRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnaW5uJ30pO1xuICByZWFkb25seSBBbWF6b25lc19JdGVtU2hvcCAgICAgICAgPSAkKDB4ZDIsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAndG9vbCd9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfQXJtb3JTaG9wICAgICAgID0gJCgweGQzLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2FybW9yJ30pO1xuICByZWFkb25seSBBbWF6b25lc19FbGRlciAgICAgICAgICAgPSAkKDB4ZDQsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaG91c2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXhlZDogWzB4MGQsIDB4MGVdfSk7IC8vIGd1YXJkc1xuICByZWFkb25seSBOYWRhcmUgICAgICAgICAgICAgICAgICAgPSAkKDB4ZDUsIHthcmVhOiBBcmVhcy5OYWRhcmV9KTsgLy8gZWRnZS1kb29yP1xuICByZWFkb25seSBQb3J0b2FfRmlzaGVybWFuSG91c2UgICAgPSAkKDB4ZDYsIHthcmVhOiBBcmVhcy5GaXNoZXJtYW5Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0UsIG11c2ljOiAwLCBob3VzZVR5cGU6ICdvdXRzaWRlJ30pO1xuICByZWFkb25seSBQb3J0b2FfUGFsYWNlRW50cmFuY2UgICAgPSAkKDB4ZDcsIHthcmVhOiBBcmVhcy5Qb3J0b2FQYWxhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdXNlVHlwZTogJ3BhbGFjZSd9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX0ZvcnR1bmVUZWxsZXIgICAgID0gJCgweGQ4LCB7YXJlYTogQXJlYXMuUG9ydG9hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXhlZDogWzB4MGQsIDB4MGVdLCAvLyBndWFyZC9lbXB0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5GT1JUVU5FX1RFTExFUixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9QYXduU2hvcCAgICAgICAgICA9ICQoMHhkOSwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdwYXduJ30pO1xuICByZWFkb25seSBQb3J0b2FfQXJtb3JTaG9wICAgICAgICAgPSAkKDB4ZGEsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnYXJtb3InfSk7XG4gIC8vIElOVkFMSUQ6IDB4ZGJcbiAgcmVhZG9ubHkgUG9ydG9hX0lubiAgICAgICAgICAgICAgID0gJCgweGRjLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2lubid9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX1Rvb2xTaG9wICAgICAgICAgID0gJCgweGRkLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ3Rvb2wnfSk7XG4gIHJlYWRvbmx5IFBvcnRvYVBhbGFjZV9MZWZ0ICAgICAgICA9ICQoMHhkZSwge2FyZWE6IEFyZWFzLlBvcnRvYVBhbGFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0UsIGhvdXNlVHlwZTogJ2hvdXNlJ30pO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfVGhyb25lUm9vbSAgPSAkKDB4ZGYsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hUGFsYWNlX1JpZ2h0ICAgICAgID0gJCgweGUwLCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2hvdXNlJ30pO1xuICByZWFkb25seSBQb3J0b2FfQXNpbmFSb29tICAgICAgICAgPSAkKDB4ZTEsIHthcmVhOiBBcmVhcy5VbmRlcmdyb3VuZENoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFLCBtdXNpYzogJ2FzaW5hJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyAtIGNvbnNpZGVyIHBhbGFjZS9ob3VzZT9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfRWxkZXJEb3duc3RhaXJzID0gJCgweGUyLCB7YXJlYTogQXJlYXMuQW1hem9uZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEpvZWxfRWxkZXJIb3VzZSAgICAgICAgICA9ICQoMHhlMywge2FyZWE6IEFyZWFzLkpvZWwsIC4uLkhPVVNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgSm9lbF9TaGVkICAgICAgICAgICAgICAgID0gJCgweGU0LCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ3NoZWQnfSk7XG4gIHJlYWRvbmx5IEpvZWxfVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhlNSwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICAvLyBJTlZBTElEOiAweGU2XG4gIHJlYWRvbmx5IEpvZWxfSW5uICAgICAgICAgICAgICAgICA9ICQoMHhlNywgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdpbm4nfSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd25fSG91c2UgICAgICAgICA9ICQoMHhlOCwge2FyZWE6IEFyZWFzLlpvbWJpZVRvd24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFLCBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgWm9tYmllVG93bl9Ib3VzZUJhc2VtZW50ID0gJCgweGU5LCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4ZWFcbiAgcmVhZG9ubHkgU3dhbl9Ub29sU2hvcCAgICAgICAgICAgID0gJCgweGViLCB7YXJlYTogQXJlYXMuU3dhbiwgLi4uSE9VU0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdXNlVHlwZTogJ3Rvb2wnfSk7XG4gIHJlYWRvbmx5IFN3YW5fU3RvbUh1dCAgICAgICAgICAgICA9ICQoMHhlYywgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdzaGVkJ30pO1xuICByZWFkb25seSBTd2FuX0lubiAgICAgICAgICAgICAgICAgPSAkKDB4ZWQsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaW5uJ30pO1xuICByZWFkb25seSBTd2FuX0FybW9yU2hvcCAgICAgICAgICAgPSAkKDB4ZWUsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnYXJtb3InfSk7XG4gIHJlYWRvbmx5IFN3YW5fVGF2ZXJuICAgICAgICAgICAgICA9ICQoMHhlZiwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0YXZlcm4nfSk7XG4gIHJlYWRvbmx5IFN3YW5fUGF3blNob3AgICAgICAgICAgICA9ICQoMHhmMCwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdwYXduJ30pO1xuICByZWFkb25seSBTd2FuX0RhbmNlSGFsbCAgICAgICAgICAgPSAkKDB4ZjEsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9UZW1wbGUgICAgICAgICAgICA9ICQoMHhmMiwge2FyZWE6IEFyZWFzLlNoeXJvblRlbXBsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHg3MCwgaG91c2VUeXBlOiAncGFsYWNlJ30pO1xuICByZWFkb25seSBTaHlyb25fVHJhaW5pbmdIYWxsICAgICAgPSAkKDB4ZjMsIHthcmVhOiBBcmVhcy5TaHlyb24sIC4uLkhPVVNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdob3VzZSd9KTtcbiAgcmVhZG9ubHkgU2h5cm9uX0hvc3BpdGFsICAgICAgICAgID0gJCgweGY0LCB7Li4uSE9VU0UsIGhvdXNlVHlwZTogJ2hvdXNlJ30pO1xuICByZWFkb25seSBTaHlyb25fQXJtb3JTaG9wICAgICAgICAgPSAkKDB4ZjUsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnYXJtb3InfSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhmNiwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICByZWFkb25seSBTaHlyb25fSW5uICAgICAgICAgICAgICAgPSAkKDB4ZjcsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaW5uJ30pO1xuICByZWFkb25seSBTYWhhcmFfSW5uICAgICAgICAgICAgICAgPSAkKDB4ZjgsIHthcmVhOiBBcmVhcy5TYWhhcmEsIC4uLkhPVVNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VzZVR5cGU6ICdpbm4nfSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhmOSwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICd0b29sJ30pO1xuICByZWFkb25seSBTYWhhcmFfRWxkZXJIb3VzZSAgICAgICAgPSAkKDB4ZmEsIHsuLi5IT1VTRSwgaG91c2VUeXBlOiAnaG91c2UnfSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9QYXduU2hvcCAgICAgICAgICA9ICQoMHhmYiwgey4uLkhPVVNFLCBob3VzZVR5cGU6ICdwYXduJ30pO1xuXG4gIC8vIE5ldyBsb2NhdGlvbnMsIG5vIElEIHByb2N1cmVkIHlldC5cbiAgcmVhZG9ubHkgRWFzdENhdmUxICAgICAgPSAkKC0xLCB7YXJlYTogQXJlYXMuRWFzdENhdmV9KTtcbiAgcmVhZG9ubHkgRWFzdENhdmUyICAgICAgPSAkKC0xKTtcbiAgcmVhZG9ubHkgRWFzdENhdmUzICAgICAgPSAkKC0xKTtcbiAgcmVhZG9ubHkgRmlzaGVybWFuQmVhY2ggPSAkKC0xLCB7YXJlYTogQXJlYXMuRmlzaGVybWFuSG91c2UsIC4uLkhPVVNFfSk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBsb2NzQnlTY3JlZW4gPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIExvY2F0aW9uW10+KCgpID0+IFtdKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHN1cGVyKDB4MTAwKTtcbiAgICAkLmNvbW1pdCh0aGlzKTtcbiAgICAvLyBGaWxsIGluIGFueSBtaXNzaW5nIG9uZXNcbiAgICBmb3IgKGxldCBpZCA9IDA7IGlkIDwgMHgxMDA7IGlkKyspIHtcbiAgICAgIGlmICh0aGlzW2lkXSkge1xuICAgICAgICB0aGlzLmluZGV4U2NyZWVucyh0aGlzW2lkXSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpc1tpZF0gPSBuZXcgTG9jYXRpb24ocm9tLCBpZCwge1xuICAgICAgICBhcmVhOiBBcmVhcy5VbnVzZWQsXG4gICAgICAgIG5hbWU6ICcnLFxuICAgICAgICBtdXNpYzogJycsXG4gICAgICAgIHBhbGV0dGU6ICcnLFxuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIFRPRE8gLSBtZXRob2QgdG8gYWRkIGFuIHVucmVnaXN0ZXJlZCBsb2NhdGlvbiB0byBhbiBlbXB0eSBpbmRleC5cbiAgfVxuXG4gIGluZGV4U2NyZWVucyhsb2M6IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3QgcyBvZiByb3cpIHtcbiAgICAgICAgdGhpcy5sb2NzQnlTY3JlZW4uZ2V0KHMpLnB1c2gobG9jKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZW51bWJlclNjcmVlbihvbGRJZDogbnVtYmVyLCBuZXdJZDogbnVtYmVyKSB7XG4gICAgY29uc3QgbG9jcyA9IHRoaXMubG9jc0J5U2NyZWVuLmdldChvbGRJZCk7XG4gICAgdGhpcy5sb2NzQnlTY3JlZW4uc2V0KG5ld0lkLCBsb2NzKTtcbiAgICB0aGlzLmxvY3NCeVNjcmVlbi5kZWxldGUob2xkSWQpO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIGxvY3MpIHtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIGxvYy5zY3JlZW5zKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm93Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHJvd1tpXSA9PT0gb2xkSWQpIHJvd1tpXSA9IG5ld0lkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWxsb2NhdGUobG9jYXRpb246IExvY2F0aW9uLCBhZnRlcj86IExvY2F0aW9uKTogTG9jYXRpb24ge1xuICAgIC8vIHBpY2sgYW4gdW51c2VkIGxvY2F0aW9uXG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMpIHtcbiAgICAgIGlmIChsLnVzZWQgfHwgKGFmdGVyICYmIGwuaWQgPCBhZnRlci5pZCkpIGNvbnRpbnVlO1xuICAgICAgKGxvY2F0aW9uIGFzIGFueSkuaWQgPSBsLmlkO1xuICAgICAgbG9jYXRpb24udXNlZCA9IHRydWU7XG4gICAgICB0aGlzLmluZGV4U2NyZWVucyhsb2NhdGlvbik7XG4gICAgICByZXR1cm4gdGhpc1tsLmlkXSA9IGxvY2F0aW9uO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHVudXNlZCBsb2NhdGlvbicpO1xuICB9XG5cbiAgd3JpdGUoKTogTW9kdWxlW10ge1xuICAgIGNvbnN0IGEgPSB0aGlzLnJvbS5hc3NlbWJsZXIoKTtcbiAgICBmcmVlKGEsICQwYSwgMHg4NGY4LCAweGEwMDApO1xuICAgIGZyZWUoYSwgJDBiLCAweGEwMDAsIDB4YmUwMCk7XG4gICAgZnJlZShhLCAkMGMsIDB4OTNmOSwgMHhhMDAwKTtcbiAgICBmcmVlKGEsICQwZCwgMHhhMDAwLCAweGFjMDApO1xuICAgIGZyZWUoYSwgJDBkLCAweGFlMDAsIDB4YzAwMCk7IC8vIGJmMDAgPz8/XG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzKSB7XG4gICAgICBsb2NhdGlvbi5hc3NlbWJsZShhKTtcbiAgICB9XG4gICAgcmV0dXJuIFthLm1vZHVsZSgpXTtcbiAgfVxuXG4gIGxvY2F0aW9uKCkge1xuICAgIC8vID8/PyB3aGF0IHdhcyB0aGlzIHN1cHBvc2VkIHRvIGJlP1xuICB9XG59XG5cbi8vIExvY2F0aW9uIGVudGl0aWVzXG5leHBvcnQgY2xhc3MgTG9jYXRpb24gZXh0ZW5kcyBFbnRpdHkge1xuXG4gIHVzZWQ6IGJvb2xlYW47XG5cbiAgY2hlY2twb2ludDogYm9vbGVhbjtcbiAgc2F2ZWFibGU6IGJvb2xlYW47XG5cbiAgYmdtOiBudW1iZXI7XG4gIG9yaWdpbmFsQmdtOiBudW1iZXI7XG4gIGxheW91dFdpZHRoOiBudW1iZXI7XG4gIGxheW91dEhlaWdodDogbnVtYmVyO1xuICBhbmltYXRpb246IG51bWJlcjtcbiAgLy8gU2NyZWVuIGluZGljZXMgYXJlIChleHRlbmRlZCA8PCA4IHwgc2NyZWVuKVxuICAvLyBleHRlbmRlZDogbnVtYmVyO1xuICBzY3JlZW5zOiBudW1iZXJbXVtdO1xuXG4gIHRpbGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgdGlsZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gIG9yaWdpbmFsVGlsZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gIHRpbGVzZXQ6IG51bWJlcjtcbiAgdGlsZUVmZmVjdHM6IG51bWJlcjtcblxuICBlbnRyYW5jZXM6IEVudHJhbmNlW107XG4gIGV4aXRzOiBFeGl0W107XG4gIGZsYWdzOiBGbGFnW107XG4gIHBpdHM6IFBpdFtdO1xuXG4gIHNwcml0ZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzcHJpdGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgc3Bhd25zOiBTcGF3bltdO1xuXG4gIG1vbnN0ZXJzTW92ZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIF9pc1Nob3A6IGJvb2xlYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9tZXRhPzogTWV0YWxvY2F0aW9uID0gdW5kZWZpbmVkO1xuICAvLyBMYXppbHktcG9wdWxhdGVkIG1hcCBrZXlzIGZvciBrZWVwaW5nIGNvbnNpc3RlbnQgbXVzaWMgYW5kIGNvbG9ycy5cbiAgcHJpdmF0ZSBfbXVzaWNHcm91cD86IHN0cmluZ3xzeW1ib2w7XG4gIHByaXZhdGUgX2NvbG9yR3JvdXA/OiBzdHJpbmd8c3ltYm9sO1xuXG4gIGNvbnN0cnVjdG9yKHJvbTogUm9tLCBpZDogbnVtYmVyLCByZWFkb25seSBkYXRhOiBMb2NhdGlvbkRhdGEpIHtcbiAgICAvLyB3aWxsIGluY2x1ZGUgYm90aCBNYXBEYXRhICphbmQqIE5wY0RhdGEsIHNpbmNlIHRoZXkgc2hhcmUgYSBrZXkuXG4gICAgc3VwZXIocm9tLCBpZCk7XG5cbiAgICBjb25zdCBtYXBEYXRhQmFzZSA9XG4gICAgICAgIGlkID49IDAgPyByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubWFwRGF0YVBvaW50ZXIpICsgMHhjMDAwIDogMDtcbiAgICAvLyBUT0RPIC0gcGFzcyB0aGlzIGluIGFuZCBtb3ZlIExPQ0FUSU9OUyB0byBsb2NhdGlvbnMudHNcbiAgICB0aGlzLnVzZWQgPSBtYXBEYXRhQmFzZSA+IDB4YzAwMCAmJiAhIXRoaXMubmFtZTtcblxuICAgIGlmICghdGhpcy51c2VkKSB7XG4gICAgICB0aGlzLmJnbSA9IHRoaXMub3JpZ2luYWxCZ20gPSAwO1xuICAgICAgdGhpcy5sYXlvdXRXaWR0aCA9IDA7XG4gICAgICB0aGlzLmxheW91dEhlaWdodCA9IDA7XG4gICAgICB0aGlzLmFuaW1hdGlvbiA9IDA7XG4gICAgICAvLyB0aGlzLmV4dGVuZGVkID0gMDtcbiAgICAgIHRoaXMuc2NyZWVucyA9IFtbMF1dO1xuICAgICAgdGhpcy50aWxlUGFsZXR0ZXMgPSBbMHgyNCwgMHgwMSwgMHgyNl07XG4gICAgICB0aGlzLm9yaWdpbmFsVGlsZVBhbGV0dGVzID0gWzB4MjQsIDB4MDEsIDB4MjZdO1xuICAgICAgdGhpcy50aWxlc2V0ID0gMHg4MDtcbiAgICAgIHRoaXMudGlsZUVmZmVjdHMgPSAweGIzO1xuICAgICAgdGhpcy50aWxlUGF0dGVybnMgPSBbMiwgNF07XG4gICAgICB0aGlzLmV4aXRzID0gW107XG4gICAgICB0aGlzLmVudHJhbmNlcyA9IFtdO1xuICAgICAgdGhpcy5mbGFncyA9IFtdO1xuICAgICAgdGhpcy5waXRzID0gW107XG4gICAgICB0aGlzLnNwYXducyA9IFtdO1xuICAgICAgdGhpcy5zcHJpdGVQYWxldHRlcyA9IFswLCAwXTtcbiAgICAgIHRoaXMuc3ByaXRlUGF0dGVybnMgPSBbMCwgMF07XG4gICAgICB0aGlzLmNoZWNrcG9pbnQgPSB0aGlzLnNhdmVhYmxlID0gZmFsc2U7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbGF5b3V0QmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UpICsgMHhjMDAwO1xuICAgIGNvbnN0IGdyYXBoaWNzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyAyKSArIDB4YzAwMDtcbiAgICBjb25zdCBlbnRyYW5jZXNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDQpICsgMHhjMDAwO1xuICAgIGNvbnN0IGV4aXRzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyA2KSArIDB4YzAwMDtcbiAgICBjb25zdCBmbGFnc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgOCkgKyAweGMwMDA7XG5cbiAgICAvLyBSZWFkIHRoZSBleGl0cyBmaXJzdCBzbyB0aGF0IHdlIGNhbiBkZXRlcm1pbmUgaWYgdGhlcmUncyBlbnRyYW5jZS9waXRzXG4gICAgLy8gbWV0YWRhdGEgZW5jb2RlZCBhdCB0aGUgZW5kLlxuICAgIGxldCBoYXNQaXRzID0gdGhpcy51c2VkICYmIGxheW91dEJhc2UgIT09IG1hcERhdGFCYXNlICsgMTA7XG4gICAgbGV0IGVudHJhbmNlTGVuID0gZXhpdHNCYXNlIC0gZW50cmFuY2VzQmFzZTtcbiAgICB0aGlzLmV4aXRzID0gKCgpID0+IHtcbiAgICAgIGNvbnN0IGV4aXRzID0gW107XG4gICAgICBsZXQgaSA9IGV4aXRzQmFzZTtcbiAgICAgIHdoaWxlICghKHJvbS5wcmdbaV0gJiAweDgwKSkge1xuICAgICAgICAvLyBOT1RFOiBzZXQgZGVzdCB0byBGRiB0byBkaXNhYmxlIGFuIGV4aXQgKGl0J3MgYW4gaW52YWxpZCBsb2NhdGlvbiBhbnl3YXkpXG4gICAgICAgIGlmIChyb20ucHJnW2kgKyAyXSAhPSAweGZmKSB7XG4gICAgICAgICAgZXhpdHMucHVzaChFeGl0LmZyb20ocm9tLnByZywgaSkpO1xuICAgICAgICB9XG4gICAgICAgIGkgKz0gNDtcbiAgICAgIH1cbiAgICAgIGlmIChyb20ucHJnW2ldICE9PSAweGZmKSB7XG4gICAgICAgIGhhc1BpdHMgPSAhIShyb20ucHJnW2ldICYgMHg0MCk7XG4gICAgICAgIGVudHJhbmNlTGVuID0gKHJvbS5wcmdbaV0gJiAweDFmKSA8PCAyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGV4aXRzO1xuICAgIH0pKCk7XG5cbiAgICAvLyBUT0RPIC0gdGhlc2UgaGV1cmlzdGljcyB3aWxsIG5vdCB3b3JrIHRvIHJlLXJlYWQgdGhlIGxvY2F0aW9ucy5cbiAgICAvLyAgICAgIC0gd2UgY2FuIGxvb2sgYXQgdGhlIG9yZGVyOiBpZiB0aGUgZGF0YSBpcyBCRUZPUkUgdGhlIHBvaW50ZXJzXG4gICAgLy8gICAgICAgIHRoZW4gd2UncmUgaW4gYSByZXdyaXR0ZW4gc3RhdGU7IGluIHRoYXQgY2FzZSwgd2UgbmVlZCB0byBzaW1wbHlcbiAgICAvLyAgICAgICAgZmluZCBhbGwgcmVmcyBhbmQgbWF4Li4uP1xuICAgIC8vICAgICAgLSBjYW4gd2UgcmVhZCB0aGVzZSBwYXJ0cyBsYXppbHk/XG4gICAgY29uc3QgcGl0c0Jhc2UgPVxuICAgICAgICAhaGFzUGl0cyA/IDAgOiByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgMTApICsgMHhjMDAwO1xuXG4gICAgdGhpcy5iZ20gPSB0aGlzLm9yaWdpbmFsQmdtID0gcm9tLnByZ1tsYXlvdXRCYXNlXTtcbiAgICB0aGlzLmxheW91dFdpZHRoID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgMV07XG4gICAgdGhpcy5sYXlvdXRIZWlnaHQgPSByb20ucHJnW2xheW91dEJhc2UgKyAyXTtcbiAgICB0aGlzLmFuaW1hdGlvbiA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDNdO1xuICAgIC8vIHRoaXMuZXh0ZW5kZWQgPSByb20ucHJnW2xheW91dEJhc2UgKyA0XTtcbiAgICBjb25zdCBleHRlbmRlZCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDRdID8gMHgxMDAgOiAwO1xuICAgIHRoaXMuc2NyZWVucyA9IHNlcShcbiAgICAgICAgdGhpcy5oZWlnaHQsXG4gICAgICAgIHkgPT4gdHVwbGUocm9tLnByZywgbGF5b3V0QmFzZSArIDUgKyB5ICogdGhpcy53aWR0aCwgdGhpcy53aWR0aClcbiAgICAgICAgICAgICAgICAgLm1hcChzID0+IGV4dGVuZGVkIHwgcykpO1xuICAgIHRoaXMudGlsZVBhbGV0dGVzID0gdHVwbGU8bnVtYmVyPihyb20ucHJnLCBncmFwaGljc0Jhc2UsIDMpO1xuICAgIHRoaXMub3JpZ2luYWxUaWxlUGFsZXR0ZXMgPSB0dXBsZSh0aGlzLnRpbGVQYWxldHRlcywgMCwgMyk7XG4gICAgdGhpcy50aWxlc2V0ID0gcm9tLnByZ1tncmFwaGljc0Jhc2UgKyAzXTtcbiAgICB0aGlzLnRpbGVFZmZlY3RzID0gcm9tLnByZ1tncmFwaGljc0Jhc2UgKyA0XTtcbiAgICB0aGlzLnRpbGVQYXR0ZXJucyA9IHR1cGxlKHJvbS5wcmcsIGdyYXBoaWNzQmFzZSArIDUsIDIpO1xuXG4gICAgdGhpcy5lbnRyYW5jZXMgPVxuICAgICAgZ3JvdXAoNCwgcm9tLnByZy5zbGljZShlbnRyYW5jZXNCYXNlLCBlbnRyYW5jZXNCYXNlICsgZW50cmFuY2VMZW4pLFxuICAgICAgICAgICAgeCA9PiBFbnRyYW5jZS5mcm9tKHgpKTtcbiAgICB0aGlzLmZsYWdzID0gdmFyU2xpY2Uocm9tLnByZywgZmxhZ3NCYXNlLCAyLCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBGbGFnLmZyb20oeCkpO1xuICAgIHRoaXMucGl0cyA9IHBpdHNCYXNlID8gdmFyU2xpY2Uocm9tLnByZywgcGl0c0Jhc2UsIDQsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBQaXQuZnJvbSh4KSkgOiBbXTtcblxuICAgIGNvbnN0IG5wY0RhdGFCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm5wY0RhdGFQb2ludGVyKSArIDB4MTAwMDA7XG4gICAgY29uc3QgaGFzU3Bhd25zID0gbnBjRGF0YUJhc2UgIT09IDB4MTAwMDA7XG4gICAgdGhpcy5zcHJpdGVQYWxldHRlcyA9XG4gICAgICAgIGhhc1NwYXducyA/IHR1cGxlKHJvbS5wcmcsIG5wY0RhdGFCYXNlICsgMSwgMikgOiBbMCwgMF07XG4gICAgdGhpcy5zcHJpdGVQYXR0ZXJucyA9XG4gICAgICAgIGhhc1NwYXducyA/IHR1cGxlKHJvbS5wcmcsIG5wY0RhdGFCYXNlICsgMywgMikgOiBbMCwgMF07XG4gICAgdGhpcy5zcGF3bnMgPVxuICAgICAgICBoYXNTcGF3bnMgPyB2YXJTbGljZShyb20ucHJnLCBucGNEYXRhQmFzZSArIDUsIDQsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IFNwYXduLmZyb20oeCkpIDogW107XG5cbiAgICB0aGlzLmNoZWNrcG9pbnQgPSAhIShyb20ucHJnWzB4MmZmMDAgfCBpZF0gJiAweDgwKTtcbiAgICB0aGlzLnNhdmVhYmxlID0gISEocm9tLnByZ1sweDJmZjAwIHwgaWRdICYgMHgwMSk7XG4gIH1cblxuICBzZXQgbWV0YShtZXRhOiBNZXRhbG9jYXRpb24pIHtcbiAgICB0aGlzLl9tZXRhID0gbWV0YTtcbiAgfVxuICBnZXQgbWV0YSgpOiBNZXRhbG9jYXRpb24ge1xuICAgIHRoaXMuZW5zdXJlTWV0YSgpO1xuICAgIHJldHVybiB0aGlzLl9tZXRhITtcbiAgfVxuICBlbnN1cmVNZXRhKCkge1xuICAgIGlmICghdGhpcy5fbWV0YSkgdGhpcy5fbWV0YSA9IE1ldGFsb2NhdGlvbi5vZih0aGlzKTtcbiAgfVxuXG4gIHNldCBtdXNpY0dyb3VwKGdyb3VwOiBzdHJpbmd8c3ltYm9sKSB7XG4gICAgdGhpcy5fbXVzaWNHcm91cCA9IGdyb3VwO1xuICB9XG4gIGdldCBtdXNpY0dyb3VwKCk6IHN0cmluZ3xzeW1ib2wge1xuICAgIHRoaXMuZW5zdXJlTXVzaWNHcm91cCgpO1xuICAgIHJldHVybiB0aGlzLl9tdXNpY0dyb3VwITtcbiAgfVxuICBlbnN1cmVNdXNpY0dyb3VwKCkge1xuICAgIGlmICh0aGlzLl9tdXNpY0dyb3VwID09IG51bGwpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMuZGF0YS5tdXNpYztcbiAgICAgIHRoaXMuX211c2ljR3JvdXAgPVxuICAgICAgICAgIHR5cGVvZiBrZXkgIT09ICdudW1iZXInID8ga2V5IDpcbiAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuZXhpdHNba2V5XS5kZXN0XS5tdXNpY0dyb3VwO1xuICAgIH1cbiAgfVxuXG4gIHNldCBjb2xvckdyb3VwKGdyb3VwOiBzdHJpbmd8c3ltYm9sKSB7XG4gICAgdGhpcy5fY29sb3JHcm91cCA9IGdyb3VwO1xuICB9XG4gIGdldCBjb2xvckdyb3VwKCk6IHN0cmluZ3xzeW1ib2wge1xuICAgIHRoaXMuZW5zdXJlQ29sb3JHcm91cCgpO1xuICAgIHJldHVybiB0aGlzLl9jb2xvckdyb3VwITtcbiAgfVxuICBlbnN1cmVDb2xvckdyb3VwKCkge1xuICAgIGlmICh0aGlzLl9jb2xvckdyb3VwID09IG51bGwpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMuZGF0YS5tdXNpYztcbiAgICAgIHRoaXMuX2NvbG9yR3JvdXAgPVxuICAgICAgICAgIHR5cGVvZiBrZXkgIT09ICdudW1iZXInID8ga2V5IDpcbiAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zW3RoaXMuZXhpdHNba2V5XS5kZXN0XS5jb2xvckdyb3VwO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEbyBhbGwgdGhlIGluaXRpYWxpemF0aW9uIHRoYXQgaGFzIHRvIGhhcHBlbiBhZnRlciBhbGwgbG9jYXRpb25zXG4gICAqIGhhdmUgYmVlbiBjb25zdHJ1Y3RlZC5cbiAgICovXG4gIGxhenlJbml0aWFsaXphdGlvbigpIHtcbiAgICB0aGlzLmVuc3VyZU1ldGEoKTtcbiAgICB0aGlzLmVuc3VyZU11c2ljR3JvdXAoKTtcbiAgICB0aGlzLmVuc3VyZUNvbG9yR3JvdXAoKTtcbiAgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5uYW1lO1xuICB9XG5cbiAgZ2V0IG1hcERhdGFQb2ludGVyKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuaWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG1hcGRhdGEgcG9pbnRlciBmb3IgJHt0aGlzLm5hbWV9YCk7XG4gICAgcmV0dXJuIDB4MTQzMDAgKyAodGhpcy5pZCA8PCAxKTtcbiAgfVxuXG4gIGdldCBucGNEYXRhUG9pbnRlcigpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmlkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyBucGNkYXRhIHBvaW50ZXIgZm9yICR7dGhpcy5uYW1lfWApO1xuICAgIHJldHVybiAweDE5MjAxICsgKHRoaXMuaWQgPDwgMSk7XG4gIH1cblxuICBnZXQgaGFzU3Bhd25zKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNwYXducy5sZW5ndGggPiAwO1xuICB9XG5cbiAgLy8gLy8gT2Zmc2V0IHRvIE9SIHdpdGggc2NyZWVuIElEcy5cbiAgLy8gZ2V0IHNjcmVlblBhZ2UoKTogbnVtYmVyIHtcbiAgLy8gICBpZiAoIXRoaXMucm9tLmNvbXByZXNzZWRNYXBEYXRhKSByZXR1cm4gdGhpcy5leHRlbmRlZCA/IDB4MTAwIDogMDtcbiAgLy8gICByZXR1cm4gdGhpcy5leHRlbmRlZCA8PCA4O1xuICAvLyB9XG5cbiAgbWFwUGxhbmUoKTogbnVtYmVyIHtcbiAgICBjb25zdCBzZXQgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigoKSA9PiBuZXcgU2V0KCkpO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHRoaXMuc2NyZWVucykge1xuICAgICAgZm9yIChjb25zdCBzIG9mIHJvdykge1xuICAgICAgICBzZXQuZ2V0KHMgPj4+IDgpLmFkZChzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNldC5zaXplICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgc2NyZWVuIHBhZ2UgZm9yICR7dGhpc306ICR7XG4gICAgICAgICAgWy4uLnNldC52YWx1ZXMoKV0ubWFwKHNpZHMgPT5cbiAgICAgICAgICAgIFsuLi5zaWRzXS5tYXAoc2lkID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgW3Njcl0gPSB0aGlzLnJvbS5tZXRhc2NyZWVucy5nZXRCeUlkKHNpZCk7XG4gICAgICAgICAgICAgIHJldHVybiBgJHtoZXgoc2lkKX0gJHtzY3I/Lm5hbWUgPz8gJz8/J31gO1xuICAgICAgICAgICAgfSkuam9pbignLCAnKVxuICAgICAgICAgICkuam9pbignLCAnKX1gKTtcbiAgICB9XG4gICAgY29uc3QgW3Jlc3VsdF0gPSBzZXQua2V5cygpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBpc1Nob3AoKTogYm9vbGVhbiB7XG4gICAgLy9yZXR1cm4gdGhpcy5yb20uc2hvcHMuZmluZEluZGV4KHMgPT4gcy5sb2NhdGlvbiA9PT0gdGhpcy5pZCkgPj0gMDtcbiAgICBpZiAodGhpcy5faXNTaG9wID09IG51bGwpIHtcbiAgICAgIHRoaXMuX2lzU2hvcCA9IHRoaXMucm9tLnNob3BzLmZpbmRJbmRleChzID0+IHMubG9jYXRpb24gPT09IHRoaXMuaWQpID49IDA7XG4gICAgICAvLyBOT1RFOiBzYWhhcmEgcGF3biBzaG9wIGlzIG5vdCBhY3R1YWxseSBpbiB0aGUgdGFibGUgKHBhd24gc2hvcHMgZG9uJ3RcbiAgICAgIC8vIHN0cmljdGx5IG5lZWQgdG8gYmUpISAgVE9ETyAtIGhhbmRsZSB0aGlzIGJldHRlci5cbiAgICAgIGlmICh0aGlzLmlkID09PSAweGZiKSB0aGlzLl9pc1Nob3AgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faXNTaG9wO1xuICB9XG5cbiAgLy9zZXRJc1Nob3AoaXNTaG9wOiBib29sZWFuKSB7IHRoaXMuX2lzU2hvcCA9IGlzU2hvcDsgfVxuXG4gIHNwYXduKGlkOiBudW1iZXIpOiBTcGF3biB7XG4gICAgY29uc3Qgc3Bhd24gPSB0aGlzLnNwYXduc1tpZCAtIDB4ZF07XG4gICAgaWYgKCFzcGF3bikgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBzcGF3biAkJHtoZXgoaWQpfWApO1xuICAgIHJldHVybiBzcGF3bjtcbiAgfVxuXG4gIGdldCB3aWR0aCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sYXlvdXRXaWR0aCArIDE7IH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIpIHsgdGhpcy5sYXlvdXRXaWR0aCA9IHdpZHRoIC0gMTsgfVxuXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubGF5b3V0SGVpZ2h0ICsgMTsgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7IHRoaXMubGF5b3V0SGVpZ2h0ID0gaGVpZ2h0IC0gMTsgfVxuXG4gIGZpbmRPckFkZEVudHJhbmNlKHNjcmVlbjogbnVtYmVyLCBjb29yZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZW50cmFuY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBlbnRyYW5jZSA9IHRoaXMuZW50cmFuY2VzW2ldO1xuICAgICAgaWYgKGVudHJhbmNlLnNjcmVlbiA9PT0gc2NyZWVuICYmIGVudHJhbmNlLmNvb3JkID09PSBjb29yZCkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHRoaXMuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3NjcmVlbiwgY29vcmR9KSk7XG4gICAgcmV0dXJuIHRoaXMuZW50cmFuY2VzLmxlbmd0aCAtIDE7XG4gIH1cblxuICAvLyBtb25zdGVycygpIHtcbiAgLy8gICBpZiAoIXRoaXMuc3Bhd25zKSByZXR1cm4gW107XG4gIC8vICAgcmV0dXJuIHRoaXMuc3Bhd25zLmZsYXRNYXAoXG4gIC8vICAgICAoWywsIHR5cGUsIGlkXSwgc2xvdCkgPT5cbiAgLy8gICAgICAgdHlwZSAmIDcgfHwgIXRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdID8gW10gOiBbXG4gIC8vICAgICAgICAgW3RoaXMuaWQsXG4gIC8vICAgICAgICAgIHNsb3QgKyAweDBkLFxuICAvLyAgICAgICAgICB0eXBlICYgMHg4MCA/IDEgOiAwLFxuICAvLyAgICAgICAgICBpZCArIDB4NTAsXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGF0dGVybnNbdHlwZSAmIDB4ODAgPyAxIDogMF0sXG4gIC8vICAgICAgICAgIHRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdLnBhbGV0dGVzKClbMF0sXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXNbdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSAtIDJdLFxuICAvLyAgICAgICAgIF1dKTtcbiAgLy8gfVxuXG4gIGFzc2VtYmxlKGE6IEFzc2VtYmxlcikge1xuICAgIGlmICghdGhpcy51c2VkKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSB0aGlzLmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpO1xuICAgIC8vIGNvbnN0ICRsYXlvdXQgPSBgTGF5b3V0XyR7aWR9YDtcbiAgICAvLyBjb25zdCAkZ3JhcGhpY3MgPSBgR3JhcGhpY3NfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRlbnRyYW5jZXMgPSBgRW50cmFuY2VzXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkZXhpdHMgPSBgRXhpdHNfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRmbGFncyA9IGBGbGFnc18ke2lkfWA7XG4gICAgLy8gY29uc3QgJHBpdHMgPSBgUGl0c18ke2lkfWA7XG4gICAgLy8gY29uc3QgJG1hcGRhdGEgPSBgTWFwRGF0YV8ke2lkfWA7XG4gICAgLy8gY29uc3QgJG5wY2RhdGEgPSBgTnBjRGF0YV8ke2lkfWA7XG5cbiAgICBjb25zdCBzcHJpdGVQYWwgPSB0aGlzLnNwYXducy5sZW5ndGggPyB0aGlzLnNwcml0ZVBhbGV0dGVzIDogWzB4ZmYsIDB4ZmZdO1xuICAgIGNvbnN0IHNwcml0ZVBhdCA9IHRoaXMuc3Bhd25zLmxlbmd0aCA/IHRoaXMuc3ByaXRlUGF0dGVybnMgOiBbMHhmZiwgMHhmZl07XG4gICAgY29uc3QgbWFwRGF0YTogRXhwcltdID0gW107XG4gICAgLy8gd3JpdGUgTlBDIGRhdGEgZmlyc3QsIGlmIHByZXNlbnQuLi5cbiAgICBjb25zdCBucGNEYXRhID0gWzAsIC4uLnNwcml0ZVBhbCwgLi4uc3ByaXRlUGF0LFxuICAgICAgICAgICAgICAgICAgICAgLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuc3Bhd25zKSwgMHhmZl07XG4gICAgYS5zZWdtZW50KCcwYycsICcwZCcpO1xuICAgIGEucmVsb2MoYE5wY0RhdGFfJHtpZH1gKTtcbiAgICBjb25zdCAkbnBjRGF0YSA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4ubnBjRGF0YSk7XG4gICAgYS5vcmcoMHg5MjAxICsgKHRoaXMuaWQgPDwgMSksIGBOcGNEYXRhXyR7aWR9X1B0cmApO1xuICAgIGEud29yZCgkbnBjRGF0YSk7XG5cbiAgICAvLyB3cml0ZSBjaGVja3BvaW50L3NhdmVhYmxlXG4gICAgYS5zZWdtZW50KCcxNycpO1xuICAgIGEub3JnKDB4YmYwMCB8IHRoaXMuaWQpO1xuICAgIGEuYnl0ZSgrdGhpcy5jaGVja3BvaW50IDw8IDcgfCArdGhpcy5zYXZlYWJsZSlcblxuICAgIC8vIHdpdGUgbWFwZGF0YVxuICAgIGEuc2VnbWVudCgnMGEnLCAnMGInKTtcbiAgICAvL2NvbnN0IGV4dCA9IG5ldyBTZXQodGhpcy5zY3JlZW5zLm1hcChzID0+IHMgPj4gOCkpO1xuICAgIGNvbnN0IHNjcmVlbnMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgY29uY2F0SXRlcmFibGVzKHRoaXMuc2NyZWVucykpIHtcbiAgICAgIHNjcmVlbnMucHVzaChzICYgMHhmZik7XG4gICAgfVxuICAgIGNvbnN0IGxheW91dCA9IHRoaXMucm9tLmNvbXByZXNzZWRNYXBEYXRhID8gW1xuICAgICAgdGhpcy5iZ20sXG4gICAgICAvLyBDb21wcmVzc2VkIHZlcnNpb246IHl4IGluIG9uZSBieXRlLCBleHQrYW5pbSBpbiBvbmUgYnl0ZVxuICAgICAgdGhpcy5sYXlvdXRIZWlnaHQgPDwgNCB8IHRoaXMubGF5b3V0V2lkdGgsXG4gICAgICB0aGlzLm1hcFBsYW5lKCkgPDwgMiB8IHRoaXMuYW5pbWF0aW9uLCAuLi5zY3JlZW5zLFxuICAgIF0gOiBbXG4gICAgICB0aGlzLmJnbSwgdGhpcy5sYXlvdXRXaWR0aCwgdGhpcy5sYXlvdXRIZWlnaHQsXG4gICAgICB0aGlzLmFuaW1hdGlvbiwgdGhpcy5tYXBQbGFuZSgpID8gMHg4MCA6IDAsIC4uLnNjcmVlbnMsXG4gICAgXTtcbiAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9X0xheW91dGApO1xuICAgIGNvbnN0ICRsYXlvdXQgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLmxheW91dCk7XG4gICAgbWFwRGF0YS5wdXNoKCRsYXlvdXQpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9HcmFwaGljc2ApO1xuICAgIGNvbnN0ICRncmFwaGljcyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4udGhpcy50aWxlUGFsZXR0ZXMsXG4gICAgICAgICAgIHRoaXMudGlsZXNldCwgdGhpcy50aWxlRWZmZWN0cyxcbiAgICAgICAgICAgLi4udGhpcy50aWxlUGF0dGVybnMpO1xuICAgIG1hcERhdGEucHVzaCgkZ3JhcGhpY3MpO1xuXG4gICAgLy8gUXVpY2sgc2FuaXR5IGNoZWNrOiBpZiBhbiBlbnRyYW5jZS9leGl0IGlzIGJlbG93IHRoZSBIVUQgb24gYVxuICAgIC8vIG5vbi12ZXJ0aWNhbGx5IHNjcm9sbGluZyBtYXAsIHRoZW4gd2UgbmVlZCB0byBtb3ZlIGl0IHVwXG4gICAgLy8gTk9URTogdGhpcyBpcyBpZGVtcG90ZW50Li5cbiAgICBpZiAodGhpcy5oZWlnaHQgPT09IDEpIHtcbiAgICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgICAgaWYgKCFlbnRyYW5jZS51c2VkKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGVudHJhbmNlLnkgPiAweGJmKSBlbnRyYW5jZS55ID0gMHhiZjtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICAgIGlmIChleGl0Lnl0ID4gMHgwYykgZXhpdC55dCA9IDB4MGM7XG4gICAgICB9XG4gICAgfVxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fRW50cmFuY2VzYCk7XG4gICAgY29uc3QgJGVudHJhbmNlcyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZW50cmFuY2VzKSk7XG4gICAgbWFwRGF0YS5wdXNoKCRlbnRyYW5jZXMpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9FeGl0c2ApO1xuICAgIGNvbnN0ICRleGl0cyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZXhpdHMpLFxuICAgICAgICAgICAweDgwIHwgKHRoaXMucGl0cy5sZW5ndGggPyAweDQwIDogMCkgfCB0aGlzLmVudHJhbmNlcy5sZW5ndGgpO1xuICAgIG1hcERhdGEucHVzaCgkZXhpdHMpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9GbGFnc2ApO1xuICAgIGNvbnN0ICRmbGFncyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZmxhZ3MpLCAweGZmKTtcbiAgICBtYXBEYXRhLnB1c2goJGZsYWdzKTtcblxuICAgIGNvbnN0IHBpdHMgPSBjb25jYXRJdGVyYWJsZXModGhpcy5waXRzKTtcbiAgICBpZiAocGl0cy5sZW5ndGgpIHtcbiAgICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fUGl0c2ApO1xuICAgICAgY29uc3QgJHBpdHMgPSBhLnBjKCk7XG4gICAgICBhLmJ5dGUoLi4ucGl0cyk7XG4gICAgICBtYXBEYXRhLnB1c2goJHBpdHMpO1xuICAgIH1cblxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1gKTtcbiAgICBjb25zdCAkbWFwRGF0YSA9IGEucGMoKTtcbiAgICBhLndvcmQoLi4ubWFwRGF0YSk7XG5cbiAgICBhLm9yZygweDgzMDAgKyAodGhpcy5pZCA8PCAxKSwgYE1hcERhdGFfJHtpZH1fUHRyYCk7XG4gICAgYS53b3JkKCRtYXBEYXRhKTtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBib3NzIHJvb20sIHdyaXRlIHRoZSByZXN0b3JhdGlvbi5cbiAgICBjb25zdCBib3NzSWQgPSB0aGlzLmJvc3NJZCgpO1xuICAgIGlmIChib3NzSWQgIT0gbnVsbCAmJiB0aGlzLmlkICE9PSAweDVmKSB7IC8vIGRvbid0IHJlc3RvcmUgZHluYVxuICAgICAgLy8gVGhpcyB0YWJsZSBzaG91bGQgcmVzdG9yZSBwYXQwIGJ1dCBub3QgcGF0MVxuICAgICAgbGV0IHBhdHMgPSBbc3ByaXRlUGF0WzBdLCB1bmRlZmluZWRdO1xuICAgICAgaWYgKHRoaXMuaWQgPT09IDB4YTYpIHBhdHMgPSBbMHg1MywgMHg1MF07IC8vIGRyYXlnb24gMlxuICAgICAgY29uc3QgYm9zc0Jhc2UgPSB0aGlzLnJvbS5ib3NzS2lsbHNbYm9zc0lkXS5iYXNlO1xuICAgICAgLy8gU2V0IHRoZSBcInJlc3RvcmUgbXVzaWNcIiBieXRlIGZvciB0aGUgYm9zcywgYnV0IGlmIGl0J3MgRHJheWdvbiAyLCBzZXRcbiAgICAgIC8vIGl0IHRvIHplcm8gc2luY2Ugbm8gbXVzaWMgaXMgYWN0dWFsbHkgcGxheWluZywgYW5kIGlmIHRoZSBtdXNpYyBpbiB0aGVcbiAgICAgIC8vIHRlbGVwb3J0ZXIgcm9vbSBoYXBwZW5zIHRvIGJlIHRoZSBzYW1lIGFzIHRoZSBtdXNpYyBpbiB0aGUgY3J5cHQsIHRoZW5cbiAgICAgIC8vIHJlc2V0dGluZyB0byB0aGF0IG1lYW5zIGl0IHdpbGwganVzdCByZW1haW4gc2lsZW50LCBhbmQgbm90IHJlc3RhcnQuXG4gICAgICBjb25zdCByZXN0b3JlQmdtID0gdGhpcy5pZCA9PT0gMHhhNiA/IDAgOiB0aGlzLmJnbTtcbiAgICAgIGNvbnN0IGJvc3NSZXN0b3JlID0gW1xuICAgICAgICAsLCwgcmVzdG9yZUJnbSwsXG4gICAgICAgIC4uLnRoaXMudGlsZVBhbGV0dGVzLCwsLCB0aGlzLnNwcml0ZVBhbGV0dGVzWzBdLCxcbiAgICAgICAgLCwsLCAvKnBhdHNbMF0qLywgLypwYXRzWzFdKi8sXG4gICAgICAgIHRoaXMuYW5pbWF0aW9uLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IFtdID0gW3BhdHNdOyAvLyBhdm9pZCBlcnJvclxuXG4gICAgICAvLyBpZiAocmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBib3NzQmFzZSkgPT09IDB4YmE5OCkge1xuICAgICAgLy8gICAvLyBlc2NhcGUgYW5pbWF0aW9uOiBkb24ndCBjbG9iYmVyIHBhdHRlcm5zIHlldD9cbiAgICAgIC8vIH1cbiAgICAgIGEuc2VnbWVudCgnMGYnKTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYm9zc1Jlc3RvcmUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgY29uc3QgcmVzdG9yZWQgPSBib3NzUmVzdG9yZVtqXTtcbiAgICAgICAgaWYgKHJlc3RvcmVkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBhLm9yZyhib3NzQmFzZSArIGosIGBCb3NzXyR7Ym9zc0lkfV8ke2p9YCk7XG4gICAgICAgIGEuYnl0ZShyZXN0b3JlZCk7XG4gICAgICB9XG4gICAgICAvLyBsYXRlciBzcG90IGZvciBwYWwzIGFuZCBwYXQxICphZnRlciogZXhwbG9zaW9uXG4gICAgICBjb25zdCBib3NzQmFzZTIgPSAweGI3YzEgKyA1ICogYm9zc0lkOyAvLyAxZjdjMVxuICAgICAgYS5vcmcoYm9zc0Jhc2UyLCBgQm9zc18ke2Jvc3NJZH1fUG9zdGApO1xuICAgICAgYS5ieXRlKHNwcml0ZVBhbFsxXSk7XG4gICAgICAvLyBOT1RFOiBUaGlzIHJ1aW5zIHRoZSB0cmVhc3VyZSBjaGVzdC5cbiAgICAgIC8vIFRPRE8gLSBhZGQgc29tZSBhc20gYWZ0ZXIgYSBjaGVzdCBpcyBjbGVhcmVkIHRvIHJlbG9hZCBwYXR0ZXJucz9cbiAgICAgIC8vIEFub3RoZXIgb3B0aW9uIHdvdWxkIGJlIHRvIGFkZCBhIGxvY2F0aW9uLXNwZWNpZmljIGNvbnRyYWludCB0byBiZVxuICAgICAgLy8gd2hhdGV2ZXIgdGhlIGJvc3MgXG4gICAgICAvL3dyaXRlci5yb21bYm9zc0Jhc2UyICsgMV0gPSB0aGlzLnNwcml0ZVBhdHRlcm5zWzFdO1xuICAgIH1cbiAgfVxuXG4gIGFsbFNjcmVlbnMoKTogU2V0PFNjcmVlbj4ge1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHJvdykge1xuICAgICAgICBzY3JlZW5zLmFkZCh0aGlzLnJvbS5zY3JlZW5zW3NjcmVlbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2NyZWVucztcbiAgfVxuXG4gIGJvc3NJZCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgwZTsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5yb20ucHJnWzB4MWY5NWQgKyBpXSA9PT0gdGhpcy5pZCkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBuZWlnaGJvcnMoam9pbk5leHVzZXM6IGJvb2xlYW4gPSBmYWxzZSk6IFNldDxMb2NhdGlvbj4ge1xuICAvLyAgIGNvbnN0IG91dCA9IG5ldyBTZXQ8TG9jYXRpb24+KCk7XG4gIC8vICAgY29uc3QgYWRkTmVpZ2hib3JzID0gKGw6IExvY2F0aW9uKSA9PiB7XG4gIC8vICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbC5leGl0cykge1xuICAvLyAgICAgICBjb25zdCBpZCA9IGV4aXQuZGVzdDtcbiAgLy8gICAgICAgY29uc3QgbmVpZ2hib3IgPSB0aGlzLnJvbS5sb2NhdGlvbnNbaWRdO1xuICAvLyAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IudXNlZCAmJlxuICAvLyAgICAgICAgICAgbmVpZ2hib3IgIT09IHRoaXMgJiYgIW91dC5oYXMobmVpZ2hib3IpKSB7XG4gIC8vICAgICAgICAgb3V0LmFkZChuZWlnaGJvcik7XG4gIC8vICAgICAgICAgaWYgKGpvaW5OZXh1c2VzICYmIE5FWFVTRVNbbmVpZ2hib3Iua2V5XSkge1xuICAvLyAgICAgICAgICAgYWRkTmVpZ2hib3JzKG5laWdoYm9yKTtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgYWRkTmVpZ2hib3JzKHRoaXMpO1xuICAvLyAgIHJldHVybiBvdXQ7XG4gIC8vIH1cblxuICBoYXNEb2xwaGluKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlkID09PSAweDYwIHx8IHRoaXMuaWQgPT09IDB4NjQgfHwgdGhpcy5pZCA9PT0gMHg2ODtcbiAgfVxuXG4gIGlzVG93ZXIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICh0aGlzLmlkICYgMHhmOCkgPT09IDB4NTg7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBNYXAgb2YgdGlsZXMgKCRZWHl4KSByZWFjaGFibGUgZnJvbSBhbnkgZW50cmFuY2UgdG9cbiAgICogdW5mbGFnZ2VkIHRpbGVlZmZlY3RzLlxuICAgKi9cbiAgcmVhY2hhYmxlVGlsZXMoZmx5ID0gZmFsc2UpOiBNYXA8bnVtYmVyLCBudW1iZXI+IHtcbiAgICAvLyBUT0RPIC0gYXJncyBmb3IgKDEpIHVzZSBub24tMmVmIGZsYWdzLCAoMikgb25seSBmcm9tIGdpdmVuIGVudHJhbmNlL3RpbGVcbiAgICAvLyBEb2xwaGluIG1ha2VzIE5PX1dBTEsgb2theSBmb3Igc29tZSBsZXZlbHMuXG4gICAgaWYgKHRoaXMuaGFzRG9scGhpbigpKSBmbHkgPSB0cnVlO1xuICAgIC8vIFRha2UgaW50byBhY2NvdW50IHRoZSB0aWxlc2V0IGFuZCBmbGFncyBidXQgbm90IGFueSBvdmVybGF5LlxuICAgIGNvbnN0IGV4aXRzID0gbmV3IFNldCh0aGlzLmV4aXRzLm1hcChleGl0ID0+IGV4aXQuc2NyZWVuIDw8IDggfCBleGl0LnRpbGUpKTtcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0c1t0aGlzLnRpbGVzZXRdO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbdGhpcy50aWxlRWZmZWN0cyAtIDB4YjNdO1xuICAgIGNvbnN0IHBhc3NhYmxlID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSB0aGlzLnNjcmVlbnNbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Jvd1t4XV07XG4gICAgICAgIGNvbnN0IHBvcyA9IHkgPDwgNCB8IHg7XG4gICAgICAgIGNvbnN0IGZsYWcgPSB0aGlzLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gcG9zKTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWxlSWQgPSBwb3MgPDwgOCB8IHQ7XG4gICAgICAgICAgaWYgKGV4aXRzLmhhcyh0aWxlSWQpKSBjb250aW51ZTsgLy8gZG9uJ3QgZ28gcGFzdCBleGl0c1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBsZXQgZWZmZWN0cyA9IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgbGV0IGJsb2NrZWQgPSBmbHkgPyBlZmZlY3RzICYgMHgwNCA6IGVmZmVjdHMgJiAweDA2O1xuICAgICAgICAgIGlmIChmbGFnICYmIGJsb2NrZWQgJiYgdGlsZSA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdICE9IHRpbGUpIHtcbiAgICAgICAgICAgIHRpbGUgPSB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV07XG4gICAgICAgICAgICBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICAgIGJsb2NrZWQgPSBmbHkgPyBlZmZlY3RzICYgMHgwNCA6IGVmZmVjdHMgJiAweDA2O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWJsb2NrZWQpIHBhc3NhYmxlLmFkZCh0aWxlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChsZXQgdCBvZiBwYXNzYWJsZSkge1xuICAgICAgY29uc3QgcmlnaHQgPSAodCAmIDB4MGYpID09PSAweDBmID8gdCArIDB4ZjEgOiB0ICsgMTtcbiAgICAgIGlmIChwYXNzYWJsZS5oYXMocmlnaHQpKSB1Zi51bmlvbihbdCwgcmlnaHRdKTtcbiAgICAgIGNvbnN0IGJlbG93ID0gKHQgJiAweGYwKSA9PT0gMHhlMCA/IHQgKyAweGYyMCA6IHQgKyAxNjtcbiAgICAgIGlmIChwYXNzYWJsZS5oYXMoYmVsb3cpKSB1Zi51bmlvbihbdCwgYmVsb3ddKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXAgPSB1Zi5tYXAoKTtcbiAgICBjb25zdCBzZXRzID0gbmV3IFNldDxTZXQ8bnVtYmVyPj4oKTtcbiAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICBpZiAoIWVudHJhbmNlLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWQgPSBlbnRyYW5jZS5zY3JlZW4gPDwgOCB8IGVudHJhbmNlLnRpbGU7XG4gICAgICAvLyBOT1RFOiBtYXAgc2hvdWxkIGFsd2F5cyBoYXZlIGlkLCBidXQgYm9ndXMgZW50cmFuY2VzXG4gICAgICAvLyAoZS5nLiBHb2EgVmFsbGV5IGVudHJhbmNlIDIpIGNhbiBjYXVzZSBwcm9ibGVtcy5cbiAgICAgIHNldHMuYWRkKG1hcC5nZXQoaWQpIHx8IG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHNldCBvZiBzZXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHQgb2Ygc2V0KSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHgwZl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbc2NyXTtcbiAgICAgICAgb3V0LnNldCh0LCB0aWxlRWZmZWN0cy5lZmZlY3RzW3NjcmVlbi50aWxlc1t0ICYgMHhmZl1dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIC8qKiBTYWZlciB2ZXJzaW9uIG9mIHRoZSBiZWxvdz8gKi9cbiAgc2NyZWVuTW92ZXIoKTogKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB2b2lkIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIEFycmF5PHtzY3JlZW46IG51bWJlcn0+PigoKSA9PiBbXSk7XG4gICAgY29uc3Qgb2JqcyA9XG4gICAgICAgIGl0ZXJzLmNvbmNhdDx7c2NyZWVuOiBudW1iZXJ9Pih0aGlzLnNwYXducywgdGhpcy5leGl0cywgdGhpcy5lbnRyYW5jZXMpO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIG9ianMpIHtcbiAgICAgIG1hcC5nZXQob2JqLnNjcmVlbikucHVzaChvYmopO1xuICAgIH1cbiAgICByZXR1cm4gKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG9iaiBvZiBtYXAuZ2V0KG9yaWcpKSB7XG4gICAgICAgIG9iai5zY3JlZW4gPSByZXBsO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYWxsIHNwYXducywgZW50cmFuY2VzLCBhbmQgZXhpdHMuXG4gICAqIEBwYXJhbSBvcmlnIFlYIG9mIHRoZSBvcmlnaW5hbCBzY3JlZW4uXG4gICAqIEBwYXJhbSByZXBsIFlYIG9mIHRoZSBlcXVpdmFsZW50IHJlcGxhY2VtZW50IHNjcmVlbi5cbiAgICovXG4gIG1vdmVTY3JlZW4ob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgaWYgKG9iai5zY3JlZW4gPT09IG9yaWcpIG9iai5zY3JlZW4gPSByZXBsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gLSBmYWN0b3IgdGhpcyBvdXQgaW50byBhIHNlcGFyYXRlIGNsYXNzP1xuICAvLyAgIC0gaG9sZHMgbWV0YWRhdGEgYWJvdXQgbWFwIHRpbGVzIGluIGdlbmVyYWw/XG4gIC8vICAgLSBuZWVkIHRvIGZpZ3VyZSBvdXQgd2hhdCB0byBkbyB3aXRoIHBpdHMuLi5cbiAgbW9uc3RlclBsYWNlcihyYW5kb206IFJhbmRvbSk6IChtOiBNb25zdGVyKSA9PiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIHRoaXMubW9uc3RlcnNNb3ZlZCA9IHRydWU7XG4gICAgLy8gSWYgdGhlcmUncyBhIGJvc3Mgc2NyZWVuLCBleGNsdWRlIGl0IGZyb20gZ2V0dGluZyBlbmVtaWVzLlxuICAgIGNvbnN0IGJvc3MgPSB0aGlzLmRhdGEuYm9zc1NjcmVlbjtcbiAgICAvLyBTdGFydCB3aXRoIGxpc3Qgb2YgcmVhY2hhYmxlIHRpbGVzLlxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IHRoaXMucmVhY2hhYmxlVGlsZXMoZmFsc2UpO1xuICAgIC8vIERvIGEgYnJlYWR0aC1maXJzdCBzZWFyY2ggb2YgYWxsIHRpbGVzIHRvIGZpbmQgXCJkaXN0YW5jZVwiICgxLW5vcm0pLlxuICAgIGNvbnN0IGZhciA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KFsuLi5yZWFjaGFibGUua2V5cygpXS5tYXAoeCA9PiBbeCwgMF0pKTtcbiAgICBjb25zdCBub3JtYWw6IG51bWJlcltdID0gW107IC8vIHJlYWNoYWJsZSwgbm90IHNsb3BlIG9yIHdhdGVyXG4gICAgY29uc3QgbW90aHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSDiiIggMy4uN1xuICAgIGNvbnN0IGJpcmRzOiBudW1iZXJbXSA9IFtdOyAgLy8gZGlzdGFuY2UgPiAxMlxuICAgIGNvbnN0IHBsYW50czogbnVtYmVyW10gPSBbXTsgLy8gZGlzdGFuY2Ug4oiIIDIuLjRcbiAgICBjb25zdCBwbGFjZWQ6IEFycmF5PFtNb25zdGVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCBub3JtYWxUZXJyYWluTWFzayA9IHRoaXMuaGFzRG9scGhpbigpID8gMHgyNSA6IDB4Mjc7XG4gICAgZm9yIChjb25zdCBbdCwgZGlzdGFuY2VdIG9mIGZhcikge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweGZdO1xuICAgICAgaWYgKHNjciA9PT0gYm9zcykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IG4gb2YgbmVpZ2hib3JzKHQsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSkge1xuICAgICAgICBpZiAoZmFyLmhhcyhuKSkgY29udGludWU7XG4gICAgICAgIGZhci5zZXQobiwgZGlzdGFuY2UgKyAxKTtcbiAgICAgIH1cbiAgICAgIGlmICghZGlzdGFuY2UgJiYgIShyZWFjaGFibGUuZ2V0KHQpISAmIG5vcm1hbFRlcnJhaW5NYXNrKSkgbm9ybWFsLnB1c2godCk7XG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHgxYSkge1xuICAgICAgICAvLyBTcGVjaWFsLWNhc2UgdGhlIHN3YW1wIGZvciBwbGFudCBwbGFjZW1lbnRcbiAgICAgICAgaWYgKHRoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl0gPT09IDB4ZjApIHBsYW50cy5wdXNoKHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGRpc3RhbmNlID49IDIgJiYgZGlzdGFuY2UgPD0gNCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMyAmJiBkaXN0YW5jZSA8PSA3KSBtb3Rocy5wdXNoKHQpO1xuICAgICAgaWYgKGRpc3RhbmNlID49IDEyKSBiaXJkcy5wdXNoKHQpO1xuICAgICAgLy8gVE9ETyAtIHNwZWNpYWwtY2FzZSBzd2FtcCBmb3IgcGxhbnQgbG9jYXRpb25zP1xuICAgIH1cbiAgICAvLyBXZSBub3cga25vdyBhbGwgdGhlIHBvc3NpYmxlIHBsYWNlcyB0byBwbGFjZSB0aGluZ3MuXG4gICAgLy8gIC0gTk9URTogc3RpbGwgbmVlZCB0byBtb3ZlIGNoZXN0cyB0byBkZWFkIGVuZHMsIGV0Yz9cbiAgICByZXR1cm4gKG06IE1vbnN0ZXIpID0+IHtcbiAgICAgIC8vIGNoZWNrIGZvciBwbGFjZW1lbnQuXG4gICAgICBjb25zdCByID0gbS5jbGVhcmFuY2UoKTtcbiAgICAgIGNvbnN0IHBsYWNlbWVudCA9IG0ucGxhY2VtZW50KCk7XG4gICAgICBjb25zdCBwb29sID0gWy4uLihwbGFjZW1lbnQgPT09ICdub3JtYWwnID8gbm9ybWFsIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ21vdGgnID8gbW90aHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnYmlyZCcgPyBiaXJkcyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdwbGFudCcgPyBwbGFudHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0TmV2ZXIocGxhY2VtZW50KSldXG4gICAgICBsZXQgcmVzdWx0ITogW251bWJlciwgbnVtYmVyLCBudW1iZXJdfHVuZGVmaW5lZDsgLy8geCwgeSwgejJcbiAgICAgIFBPT0w6XG4gICAgICB3aGlsZSAocG9vbC5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgaSA9IHJhbmRvbS5uZXh0SW50KHBvb2wubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgW3Bvc10gPSBwb29sLnNwbGljZShpLCAxKTtcblxuICAgICAgICBjb25zdCB4ID0gKHBvcyAmIDB4ZjAwKSA+Pj4gNCB8IChwb3MgJiAweGYpO1xuICAgICAgICBjb25zdCB5ID0gKHBvcyAmIDB4ZjAwMCkgPj4+IDggfCAocG9zICYgMHhmMCkgPj4+IDQ7XG5cbiAgICAgICAgLy8gdGVzdCBkaXN0YW5jZSBmcm9tIGVudHJhbmNlcy5cbiAgICAgICAgZm9yIChjb25zdCB7eDogeDEsIHk6IHkxLCB1c2VkfSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgICAgIGlmICghdXNlZCkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSAoeTEgPj4gNCkpICoqIDIgKyAoeCAtICh4MSA+PiA0KSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyAxKSAqKiAyKSBjb250aW51ZSBQT09MO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRlc3QgZGlzdGFuY2UgZnJvbSBvdGhlciBlbmVtaWVzLlxuICAgICAgICBmb3IgKGNvbnN0IFssIHgxLCB5MSwgcjFdIG9mIHBsYWNlZCkge1xuICAgICAgICAgIGNvbnN0IHoyID0gKCh5IC0geTEpICoqIDIgKyAoeCAtIHgxKSAqKiAyKTtcbiAgICAgICAgICBpZiAoIXoyKSBjb250aW51ZSBQT09MOyAgLy8gbm8gb3ZlcmxhcFxuICAgICAgICAgIGlmICh6MiA8IChyICsgcjEpICoqIDIpIHtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8IHJlc3VsdFsyXSA8IHoyKSByZXN1bHQgPSBbeCwgeSwgejJdO1xuICAgICAgICAgICAgY29udGludWUgUE9PTDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVmFsaWQgc3BvdCAoYnV0IHN0aWxsLCBob3cgdG8gYXBwcm94aW1hdGVseSAqbWF4aW1pemUqIGRpc3RhbmNlcz8pXG4gICAgICAgIHJlc3VsdCA9IFt4LCB5LCBJbmZpbml0eV07IC8vIHoyIHVycmVsZXZhbnRcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgY29uc3QgW3gsIHldID0gcmVzdWx0O1xuICAgICAgICBwbGFjZWQucHVzaChbbSwgeCwgeSwgcl0pO1xuICAgICAgICBjb25zdCBzY3IgPSAoeSAmIDB4ZjApIHwgKHggJiAweGYwKSA+Pj4gNDtcbiAgICAgICAgY29uc3QgdGlsZSA9ICh5ICYgMHgwZikgPDwgNCB8ICh4ICYgMHgwZik7XG4gICAgICAgIHJldHVybiBzY3IgPDwgOCB8IHRpbGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICAvLyBUT0RPIC0gYWxsb3cgbGVzcyByYW5kb21uZXNzIGZvciBjZXJ0YWluIGNhc2VzLCBlLmcuIHRvcCBvZiBub3J0aCBzYWJyZSBvclxuICAvLyBhcHByb3ByaWF0ZSBzaWRlIG9mIGNvcmRlbC5cblxuICAvKiogQHJldHVybiB7IVNldDxudW1iZXI+fSAqL1xuICAvLyBhbGxUaWxlcygpIHtcbiAgLy8gICBjb25zdCB0aWxlcyA9IG5ldyBTZXQoKTtcbiAgLy8gICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgLy8gICAgIGZvciAoY29uc3QgdGlsZSBvZiBzY3JlZW4uYWxsVGlsZXMoKSkge1xuICAvLyAgICAgICB0aWxlcy5hZGQodGlsZSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiB0aWxlcztcbiAgLy8gfVxuXG5cbiAgLy8gVE9ETyAtIHVzZSBtZXRhc2NyZWVuIGZvciB0aGlzIGxhdGVyXG4gIHJlc2l6ZVNjcmVlbnModG9wOiBudW1iZXIsIGxlZnQ6IG51bWJlciwgYm90dG9tOiBudW1iZXIsIHJpZ2h0OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgZmlsbCA9IDApIHtcbiAgICBjb25zdCBuZXdXaWR0aCA9IHRoaXMud2lkdGggKyBsZWZ0ICsgcmlnaHQ7XG4gICAgY29uc3QgbmV3SGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyB0b3AgKyBib3R0b207XG4gICAgY29uc3QgbmV3U2NyZWVucyA9IEFycmF5LmZyb20oe2xlbmd0aDogbmV3SGVpZ2h0fSwgKF8sIHkpID0+IHtcbiAgICAgIHkgLT0gdG9wO1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oe2xlbmd0aDogbmV3V2lkdGh9LCAoXywgeCkgPT4ge1xuICAgICAgICB4IC09IGxlZnQ7XG4gICAgICAgIGlmICh5IDwgMCB8fCB4IDwgMCB8fCB5ID49IHRoaXMuaGVpZ2h0IHx8IHggPj0gdGhpcy53aWR0aCkgcmV0dXJuIGZpbGw7XG4gICAgICAgIHJldHVybiB0aGlzLnNjcmVlbnNbeV1beF07XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLndpZHRoID0gbmV3V2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgdGhpcy5zY3JlZW5zID0gbmV3U2NyZWVucztcbiAgICAvLyBUT0RPIC0gaWYgYW55IG9mIHRoZXNlIGdvIG5lZ2F0aXZlLCB3ZSdyZSBpbiB0cm91YmxlLi4uXG4gICAgLy8gUHJvYmFibHkgdGhlIGJlc3QgYmV0IHdvdWxkIGJlIHRvIHB1dCBhIGNoZWNrIGluIHRoZSBzZXR0ZXI/XG4gICAgZm9yIChjb25zdCBmIG9mIHRoaXMuZmxhZ3MpIHtcbiAgICAgIGYueHMgKz0gbGVmdDtcbiAgICAgIGYueXMgKz0gdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHAgb2YgdGhpcy5waXRzKSB7XG4gICAgICBwLmZyb21YcyArPSBsZWZ0O1xuICAgICAgcC5mcm9tWXMgKz0gdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHMgb2YgWy4uLnRoaXMuc3Bhd25zLCAuLi50aGlzLmV4aXRzXSkge1xuICAgICAgcy54dCArPSAxNiAqIGxlZnQ7XG4gICAgICBzLnl0ICs9IDE2ICogdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGUgb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgIGlmICghZS51c2VkKSBjb250aW51ZTtcbiAgICAgIGUueCArPSAyNTYgKiBsZWZ0O1xuICAgICAgZS55ICs9IDI1NiAqIHRvcDtcbiAgICB9XG4gIH1cblxuICAvKiogTk9URTogaWYgYSBzY3JlZW4gaXMgbmVnYXRpdmUsIHNldHMgdGhlIEFsd2F5c1RydWUgZmxhZy4gKi9cbiAgd3JpdGVTY3JlZW5zMmQoc3RhcnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgZGF0YTogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PG51bWJlciB8IG51bGw+Pikge1xuICAgIGNvbnN0IHgwID0gc3RhcnQgJiAweGY7XG4gICAgY29uc3QgeTAgPSBzdGFydCA+Pj4gNDtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGRhdGEubGVuZ3RoOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGRhdGFbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHJvdy5sZW5ndGg7IHgrKykge1xuICAgICAgICBsZXQgdGlsZSA9IHJvd1t4XTtcbiAgICAgICAgaWYgKHRpbGUgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGlmICh0aWxlIDwgMCkge1xuICAgICAgICAgIHRpbGUgPSB+dGlsZTtcbiAgICAgICAgICB0aGlzLmZsYWdzLnB1c2goRmxhZy5vZih7c2NyZWVuOiAoeTAgKyB5KSA8PCA0IHwgKHgwICsgeCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWc6IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWR9KSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY3JlZW5zW3kwICsgeV1beDAgKyB4XSA9IHRpbGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ29ubmVjdCB0d28gc2NyZWVucyB2aWEgZW50cmFuY2VzLlxuICAvLyBBc3N1bWVzIGV4aXRzIGFuZCBlbnRyYW5jZXMgYXJlIGNvbXBsZXRlbHkgYWJzZW50LlxuICAvLyBTY3JlZW4gSURzIG11c3QgYmUgaW4gc2NyZWVuRXhpdHMuXG4gIC8vIFNVUEVSIEhBQ0tZIC0gaWYgcG9zIGlzIG5lZ2F0aXZlLCB1c2UgY29tcGxlbWVudCBhbmQgYWx0ZXJuYXRlIHN0YWlycy5cbiAgY29ubmVjdChwb3M6IG51bWJlciwgdGhhdDogTG9jYXRpb24sIHRoYXRQb3M6IG51bWJlcikge1xuICAgIGNvbnN0IHRoaXNBbHQgPSBwb3MgPCAwID8gMHgxMDAgOiAwO1xuICAgIGNvbnN0IHRoYXRBbHQgPSB0aGF0UG9zIDwgMCA/IDB4MTAwIDogMDtcbiAgICBwb3MgPSBwb3MgPCAwID8gfnBvcyA6IHBvcztcbiAgICB0aGF0UG9zID0gdGhhdFBvcyA8IDAgPyB+dGhhdFBvcyA6IHRoYXRQb3M7XG4gICAgY29uc3QgdGhpc1kgPSBwb3MgPj4+IDQ7XG4gICAgY29uc3QgdGhpc1ggPSBwb3MgJiAweGY7XG4gICAgY29uc3QgdGhhdFkgPSB0aGF0UG9zID4+PiA0O1xuICAgIGNvbnN0IHRoYXRYID0gdGhhdFBvcyAmIDB4ZjtcbiAgICBjb25zdCB0aGlzVGlsZSA9IHRoaXMuc2NyZWVuc1t0aGlzWV1bdGhpc1hdO1xuICAgIGNvbnN0IHRoYXRUaWxlID0gdGhhdC5zY3JlZW5zW3RoYXRZXVt0aGF0WF07XG4gICAgY29uc3QgW3RoaXNFbnRyYW5jZSwgdGhpc0V4aXRzXSA9IHNjcmVlbkV4aXRzW3RoaXNBbHQgfCB0aGlzVGlsZV07XG4gICAgY29uc3QgW3RoYXRFbnRyYW5jZSwgdGhhdEV4aXRzXSA9IHNjcmVlbkV4aXRzW3RoYXRBbHQgfCB0aGF0VGlsZV07XG4gICAgY29uc3QgdGhpc0VudHJhbmNlSW5kZXggPSB0aGlzLmVudHJhbmNlcy5sZW5ndGg7XG4gICAgY29uc3QgdGhhdEVudHJhbmNlSW5kZXggPSB0aGF0LmVudHJhbmNlcy5sZW5ndGg7XG4gICAgdGhpcy5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eTogdGhpc1kgPDwgOCB8IHRoaXNFbnRyYW5jZSA+Pj4gOCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB0aGlzWCA8PCA4IHwgdGhpc0VudHJhbmNlICYgMHhmZn0pKTtcbiAgICB0aGF0LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt5OiB0aGF0WSA8PCA4IHwgdGhhdEVudHJhbmNlID4+PiA4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHRoYXRYIDw8IDggfCB0aGF0RW50cmFuY2UgJiAweGZmfSkpO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzRXhpdHMpIHtcbiAgICAgIHRoaXMuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHBvcywgdGlsZTogZXhpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0OiB0aGF0LmlkLCBlbnRyYW5jZTogdGhhdEVudHJhbmNlSW5kZXh9KSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGF0RXhpdHMpIHtcbiAgICAgIHRoYXQuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHRoYXRQb3MsIHRpbGU6IGV4aXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdDogdGhpcy5pZCwgZW50cmFuY2U6IHRoaXNFbnRyYW5jZUluZGV4fSkpO1xuICAgIH1cbiAgfVxuXG4gIG5laWdoYm9yRm9yRW50cmFuY2UoZW50cmFuY2VJZDogbnVtYmVyKTogTG9jYXRpb24ge1xuICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZXNbZW50cmFuY2VJZF07XG4gICAgaWYgKCFlbnRyYW5jZSkgdGhyb3cgbmV3IEVycm9yKGBubyBlbnRyYW5jZSAke2hleCh0aGlzLmlkKX06JHtlbnRyYW5jZUlkfWApO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC5zY3JlZW4gIT09IGVudHJhbmNlLnNjcmVlbikgY29udGludWU7XG4gICAgICBjb25zdCBkeCA9IE1hdGguYWJzKGV4aXQueCAtIGVudHJhbmNlLngpO1xuICAgICAgY29uc3QgZHkgPSBNYXRoLmFicyhleGl0LnkgLSBlbnRyYW5jZS55KTtcbiAgICAgIGlmIChkeCA8IDI0ICYmIGR5IDwgMjQpIHJldHVybiB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdC5kZXN0XTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBubyBleGl0IGZvdW5kIG5lYXIgJHtoZXgodGhpcy5pZCl9OiR7ZW50cmFuY2VJZH1gKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBgJHtzdXBlci50b1N0cmluZygpfSAke3RoaXMubmFtZX1gO1xuICB9XG59XG5cbi8vIFRPRE8gLSBtb3ZlIHRvIGEgYmV0dGVyLW9yZ2FuaXplZCBkZWRpY2F0ZWQgXCJnZW9tZXRyeVwiIG1vZHVsZT9cbmZ1bmN0aW9uIG5laWdoYm9ycyh0aWxlOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgY29uc3QgeSA9IHRpbGUgJiAweGYwZjA7XG4gIGNvbnN0IHggPSB0aWxlICYgMHgwZjBmO1xuICBpZiAoeSA8ICgoaGVpZ2h0IC0gMSkgPDwgMTIgfCAweGUwKSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4ZTAgPyB0aWxlICsgMHgwZjIwIDogdGlsZSArIDE2KTtcbiAgfVxuICBpZiAoeSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4MDAgPyB0aWxlIC0gMHgwZjIwIDogdGlsZSAtIDE2KTtcbiAgfVxuICBpZiAoeCA8ICgod2lkdGggLSAxKSA8PCA4IHwgMHgwZikpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDBmID8gdGlsZSArIDB4MDBmMSA6IHRpbGUgKyAxKTtcbiAgfVxuICBpZiAoeCkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHgwZikgPT09IDB4MDAgPyB0aWxlIC0gMHgwMGYxIDogdGlsZSAtIDEpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIHZlcnkgc2ltcGxlIHZlcnNpb24gb2Ygd2hhdCB3ZSdyZSBkb2luZyB3aXRoIG1ldGFzY3JlZW5zXG5jb25zdCBzY3JlZW5FeGl0czoge1tpZDogbnVtYmVyXTogcmVhZG9ubHkgW251bWJlciwgcmVhZG9ubHkgW251bWJlciwgbnVtYmVyXV19ID0ge1xuICAweDE1OiBbMHg5MF9hMCwgWzB4ODksIDB4OGFdXSwgLy8gY2F2ZSBvbiBsZWZ0IGJvdW5kYXJ5XG4gIDB4MTk6IFsweDYwXzkwLCBbMHg1OCwgMHg1OV1dLCAvLyBjYXZlIG9uIHJpZ2h0IGJvdW5kYXJ5IChub3Qgb24gZ3Jhc3MpXG4gIDB4OTY6IFsweDQwXzMwLCBbMHgzMiwgMHgzM11dLCAvLyB1cCBzdGFpciBmcm9tIGxlZnRcbiAgMHg5NzogWzB4YWZfMzAsIFsweGIyLCAweGIzXV0sIC8vIGRvd24gc3RhaXIgZnJvbSBsZWZ0XG4gIDB4OTg6IFsweDQwX2QwLCBbMHgzYywgMHgzZF1dLCAvLyB1cCBzdGFpciBmcm9tIHJpZ2h0XG4gIDB4OTk6IFsweGFmX2QwLCBbMHhiYywgMHhiZF1dLCAvLyBkb3duIHN0YWlyIGZyb20gcmlnaHRcbiAgMHg5YTogWzB4MWZfODAsIFsweDI3LCAweDI4XV0sIC8vIGRvd24gc3RhaXIgKGRvdWJsZSAtIGp1c3QgdXNlIGRvd24hKVxuICAweDllOiBbMHhkZl84MCwgWzB4ZTcsIDB4ZThdXSwgLy8gYm90dG9tIGVkZ2VcbiAgMHhjMTogWzB4NTBfYTAsIFsweDQ5LCAweDRhXV0sIC8vIGNhdmUgb24gdG9wIGJvdW5kYXJ5XG4gIDB4YzI6IFsweDYwX2IwLCBbMHg1YSwgMHg1Yl1dLCAvLyBjYXZlIG9uIGJvdHRvbS1yaWdodCBib3VuZGFyeVxuICAweDE5YTogWzB4ZDBfODAsIFsweGM3LCAweGM4XV0sIC8vIHVwIHN0YWlyIG9uIGRvdWJsZVxufTtcbiJdfQ==