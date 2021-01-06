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
        this.Amazones = $(0x1b, { area: Areas.Amazones,
            fixed: [0x0d, 0x0e] });
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
        this.Styx1 = $(0x88, { area: Areas.Styx });
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
            music: 1 });
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
            fixed: [0x0d, 0x0e],
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
        const set = new Set();
        for (const row of this.screens) {
            for (const s of row) {
                set.add(s >>> 8);
            }
        }
        if (set.size !== 1) {
            throw new Error(`Non-unique screen page: ${[...set].join(', ')}`);
        }
        return set[Symbol.iterator]().next().value;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBTyxLQUFLLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDdEMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUNuQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFL0MsT0FBTyxFQUFDLE9BQU8sRUFDUCxlQUFlLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUM5QyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFDdEMsa0JBQWtCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFN0MsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUkxRCxPQUFPLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUM7QUFFMUMsTUFBTSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQztBQXVCckMsTUFBTSxJQUFJLEdBQUc7SUFDWCxPQUFPLEVBQUUsTUFBTTtJQUNmLEtBQUssRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0lBQzFDLE9BQU8sRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0NBQ3BDLENB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QUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQ3BDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFdkQsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsT0FBTyxDQUFDO1FBQzdFLE1BQU0sU0FBUyxHQUFHLFdBQVcsS0FBSyxPQUFPLENBQUM7UUFDMUMsSUFBSSxDQUFDLGNBQWM7WUFDZixTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxjQUFjO1lBQ2YsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxXQUFXLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsTUFBTTtZQUNQLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFDM0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVsRCxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEVB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QVU7UUFDZCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsS0FBSztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsSUFBSSxLQUFLLEtBQWEsT0FBTyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEQsSUFBSSxLQUFLLENBQUMsS0FBYSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFMUQsSUFBSSxNQUFNLEtBQWEsT0FBTyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsSUFBSSxNQUFNLENBQUMsTUFBYyxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFOUQsaUJBQWlCLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDN0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxRQUFRLENBQUMsS0FBSyxLQUFLLEtBQUs7Z0JBQUUsT0FBTyxDQUFDLENBQUM7U0FDdEU7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJ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ZW50IjpbImltcG9ydCB7QXNzZW1ibGVyfSBmcm9tICcuLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7RXhwcn0gZnJvbSAnLi4vYXNtL2V4cHIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4uL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtBcmVhLCBBcmVhc30gZnJvbSAnLi9hcmVhLmpzJztcbmltcG9ydCB7RW50aXR5fSBmcm9tICcuL2VudGl0eS5qcyc7XG5pbXBvcnQge01ldGFsb2NhdGlvbn0gZnJvbSAnLi9tZXRhbG9jYXRpb24uanMnO1xuaW1wb3J0IHtTY3JlZW59IGZyb20gJy4vc2NyZWVuLmpzJztcbmltcG9ydCB7U2VnbWVudCxcbiAgICAgICAgY29uY2F0SXRlcmFibGVzLCBmcmVlLCBncm91cCwgaGV4LCBpbml0aWFsaXplcixcbiAgICAgICAgcmVhZExpdHRsZUVuZGlhbiwgc2VxLCB0dXBsZSwgdmFyU2xpY2UsXG4gICAgICAgIHVwcGVyQ2FtZWxUb1NwYWNlc30gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtVbmlvbkZpbmR9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQge2Fzc2VydE5ldmVyLCBpdGVycywgRGVmYXVsdE1hcH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge01vbnN0ZXJ9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcblxuaW1wb3J0IHtFbnRyYW5jZSwgRXhpdCwgRmxhZywgUGl0LCBTcGF3bn0gZnJvbSAnLi9sb2NhdGlvbnRhYmxlcy5qcyc7XG5leHBvcnQge0VudHJhbmNlLCBFeGl0LCBGbGFnLCBQaXQsIFNwYXdufTsgLy8gVE9ETyAtIHJlbW92ZSB0aGUgcmUtZXhwb3J0XG5cbmNvbnN0IHskMGEsICQwYiwgJDBjLCAkMGR9ID0gU2VnbWVudDtcblxuLy8gTnVtYmVyIGluZGljYXRlcyB0byBjb3B5IHdoYXRldmVyJ3MgYXQgdGhlIGdpdmVuIGV4aXRcbnR5cGUgR3JvdXBLZXkgPSBzdHJpbmcgfCBzeW1ib2wgfCBudW1iZXI7XG4vLyBMb2NhbCBmb3IgZGVmaW5pbmcgbmFtZXMgb24gTG9jYXRpb25zIG9iamVjdHMuXG5pbnRlcmZhY2UgTG9jYXRpb25Jbml0IHtcbiAgYXJlYT86IEFyZWE7XG4gIHN1YkFyZWE/OiBzdHJpbmc7XG4gIG11c2ljPzogR3JvdXBLZXkgfCAoKGFyZWE6IEFyZWEpID0+IEdyb3VwS2V5KTtcbiAgcGFsZXR0ZT86IEdyb3VwS2V5IHwgKChhcmVhOiBBcmVhKSA9PiBHcm91cEtleSk7XG4gIGJvc3NTY3JlZW4/OiBudW1iZXI7XG4gIGZpeGVkPzogcmVhZG9ubHkgbnVtYmVyW107XG59XG5pbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYTogQXJlYTtcbiAgbmFtZTogc3RyaW5nO1xuICBtdXNpYzogR3JvdXBLZXk7XG4gIHBhbGV0dGU6IEdyb3VwS2V5O1xuICBzdWJBcmVhPzogc3RyaW5nO1xuICBib3NzU2NyZWVuPzogbnVtYmVyO1xuICBmaXhlZD86IHJlYWRvbmx5IG51bWJlcltdOyAvLyBmaXhlZCBzcGF3biBzbG90cz9cbn1cblxuY29uc3QgQ0FWRSA9IHtcbiAgc3ViQXJlYTogJ2NhdmUnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tQ2F2ZWAsXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUNhdmVgLFxufSBhcyBjb25zdDtcbmNvbnN0IEhPVVNFID0ge1xuICBzdWJBcmVhOiAnaG91c2UnLFxuICBwYWxldHRlOiAoKSA9PiBTeW1ib2woKSxcbn0gYXMgY29uc3Q7XG5jb25zdCBGT1JUVU5FX1RFTExFUiA9IHtcbiAgc3ViQXJlYTogJ2hvdXNlJyxcbiAgcGFsZXR0ZTogKCkgPT4gU3ltYm9sKCksXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1Gb3J0dW5lVGVsbGVyYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBNRVNJQSA9IHtcbiAgbmFtZTogJ21lc2lhJyxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LU1lc2lhYCxcbiAgLy8gTWVzaWEgaW4gdG93ZXIga2VlcHMgc2FtZSBwYWxldHRlXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBhcmVhLm5hbWUgPT09ICdUb3dlcicgP1xuICAgICAgYXJlYS5uYW1lIDogYCR7YXJlYS5uYW1lfS1NZXNpYWAsXG59IGFzIGNvbnN0O1xuY29uc3QgRFlOQSA9IHtcbiAgbmFtZTogJ2R5bmEnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tRHluYWAsXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUR5bmFgLFxufSBhcyBjb25zdDtcbmNvbnN0IEtFTEJFU1FVRSA9IHtcbiAgbmFtZTogJ2dvYSAxJyxcbiAgbXVzaWM6ICdnb2EgMScsXG4gIHBhbGV0dGU6ICdnb2EgMScsXG59IGFzIGNvbnN0O1xuY29uc3QgU0FCRVJBID0ge1xuICBuYW1lOiAnZ29hIDInLFxuICBtdXNpYzogJ2dvYSAyJyxcbiAgcGFsZXR0ZTogJ2dvYSAyJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBNQURPX0xPV0VSID0ge1xuICBuYW1lOiAnZ29hIDMnLFxuICBtdXNpYzogJ2dvYSAzJyxcbiAgcGFsZXR0ZTogJ2dvYSAzJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBNQURPX1VQUEVSID0gey4uLk1BRE9fTE9XRVIsIHBhbGV0dGU6ICdnb2EgMyB1cHBlcid9IGFzIGNvbnN0O1xuY29uc3QgS0FSTUlORV9VUFBFUiA9IHtcbiAgbmFtZTogJ2dvYSA0JyxcbiAgbXVzaWM6ICdnb2EgNCcsXG4gIHBhbGV0dGU6ICdnb2EgNCcsXG59IGFzIGNvbnN0O1xuY29uc3QgS0FSTUlORV9MT1dFUiA9IHsuLi5LQVJNSU5FX1VQUEVSLCBwYWxldHRlOiAnZ29hIDQgbG93ZXInfSBhcyBjb25zdDtcblxudHlwZSBJbml0UGFyYW1zID0gcmVhZG9ubHkgW251bWJlciwgTG9jYXRpb25Jbml0P107XG50eXBlIEluaXQgPSB7KC4uLmFyZ3M6IEluaXRQYXJhbXMpOiBMb2NhdGlvbixcbiAgICAgICAgICAgICBjb21taXQobG9jYXRpb25zOiBMb2NhdGlvbnMpOiB2b2lkfTtcbmNvbnN0ICQ6IEluaXQgPSAoKCkgPT4ge1xuICBjb25zdCAkID0gaW5pdGlhbGl6ZXI8W251bWJlciwgTG9jYXRpb25Jbml0XSwgTG9jYXRpb24+KCk7XG4gIGxldCBhcmVhITogQXJlYTtcbiAgZnVuY3Rpb24gJCQoaWQ6IG51bWJlciwgZGF0YTogTG9jYXRpb25Jbml0ID0ge30pOiBMb2NhdGlvbiB7XG4gICAgZGF0YSA9IHsuLi5kYXRhfTtcbiAgICBhcmVhID0gZGF0YS5hcmVhID0gZGF0YS5hcmVhIHx8IGFyZWE7XG4gICAgcmV0dXJuICQoaWQsIGRhdGEpO1xuICB9O1xuICAoJCQgYXMgSW5pdCkuY29tbWl0ID0gKGxvY2F0aW9uczogTG9jYXRpb25zKSA9PiB7XG4gICAgJC5jb21taXQobG9jYXRpb25zLCAocHJvcDogc3RyaW5nLCBpZDogbnVtYmVyLCBpbml0OiBMb2NhdGlvbkluaXQpID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB1cHBlckNhbWVsVG9TcGFjZXMocHJvcCk7XG4gICAgICBjb25zdCBhcmVhID0gaW5pdC5hcmVhITtcbiAgICAgIGNvbnN0IG11c2ljID0gdHlwZW9mIGluaXQubXVzaWMgPT09ICdmdW5jdGlvbicgP1xuICAgICAgICAgIGluaXQubXVzaWMoYXJlYSkgOiBpbml0Lm11c2ljICE9IG51bGwgP1xuICAgICAgICAgIGluaXQubXVzaWMgOiBhcmVhLm5hbWU7XG4gICAgICBjb25zdCBwYWxldHRlID0gdHlwZW9mIGluaXQucGFsZXR0ZSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgaW5pdC5wYWxldHRlKGFyZWEpIDogaW5pdC5wYWxldHRlIHx8IGFyZWEubmFtZTtcbiAgICAgIGNvbnN0IGRhdGE6IExvY2F0aW9uRGF0YSA9IHthcmVhLCBuYW1lLCBtdXNpYywgcGFsZXR0ZX07XG4gICAgICBpZiAoaW5pdC5zdWJBcmVhICE9IG51bGwpIGRhdGEuc3ViQXJlYSA9IGluaXQuc3ViQXJlYTtcbiAgICAgIGlmIChpbml0LmJvc3NTY3JlZW4gIT0gbnVsbCkgZGF0YS5ib3NzU2NyZWVuID0gaW5pdC5ib3NzU2NyZWVuO1xuICAgICAgY29uc3QgbG9jYXRpb24gPSBuZXcgTG9jYXRpb24obG9jYXRpb25zLnJvbSwgaWQsIGRhdGEpO1xuICAgICAgLy8gbmVnYXRpdmUgaWQgaW5kaWNhdGVzIGl0J3Mgbm90IHJlZ2lzdGVyZWQuXG4gICAgICBpZiAoaWQgPj0gMCkgbG9jYXRpb25zW2lkXSA9IGxvY2F0aW9uO1xuICAgICAgcmV0dXJuIGxvY2F0aW9uO1xuICAgIH0pO1xuICB9O1xuICByZXR1cm4gJCQgYXMgSW5pdDtcbn0pKCk7XG5cbmV4cG9ydCBjbGFzcyBMb2NhdGlvbnMgZXh0ZW5kcyBBcnJheTxMb2NhdGlvbj4ge1xuXG4gIHJlYWRvbmx5IE1lemFtZVNocmluZSAgICAgICAgICAgICA9ICQoMHgwMCwge2FyZWE6IEFyZWFzLk1lemFtZX0pO1xuICByZWFkb25seSBMZWFmX091dHNpZGVTdGFydCAgICAgICAgPSAkKDB4MDEsIHttdXNpYzogMX0pO1xuICByZWFkb25seSBMZWFmICAgICAgICAgICAgICAgICAgICAgPSAkKDB4MDIsIHthcmVhOiBBcmVhcy5MZWFmfSk7XG4gIHJlYWRvbmx5IFZhbGxleU9mV2luZCAgICAgICAgICAgICA9ICQoMHgwMywge2FyZWE6IEFyZWFzLlZhbGxleU9mV2luZH0pO1xuICByZWFkb25seSBTZWFsZWRDYXZlMSAgICAgICAgICAgICAgPSAkKDB4MDQsIHthcmVhOiBBcmVhcy5TZWFsZWRDYXZlfSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmUyICAgICAgICAgICAgICA9ICQoMHgwNSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmU2ICAgICAgICAgICAgICA9ICQoMHgwNik7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmU0ICAgICAgICAgICAgICA9ICQoMHgwNyk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmU1ICAgICAgICAgICAgICA9ICQoMHgwOCk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmUzICAgICAgICAgICAgICA9ICQoMHgwOSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmU3ICAgICAgICAgICAgICA9ICQoMHgwYSwge2Jvc3NTY3JlZW46IDB4OTF9KTtcbiAgLy8gSU5WQUxJRDogMHgwYlxuICByZWFkb25seSBTZWFsZWRDYXZlOCAgICAgICAgICAgICAgPSAkKDB4MGMpO1xuICAvLyBJTlZBTElEOiAweDBkXG4gIHJlYWRvbmx5IFdpbmRtaWxsQ2F2ZSAgICAgICAgICAgICA9ICQoMHgwZSwge2FyZWE6IEFyZWFzLldpbmRtaWxsQ2F2ZX0pO1xuICByZWFkb25seSBXaW5kbWlsbCAgICAgICAgICAgICAgICAgPSAkKDB4MGYsIHthcmVhOiBBcmVhcy5XaW5kbWlsbCwgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgWmVidUNhdmUgICAgICAgICAgICAgICAgID0gJCgweDEwLCB7YXJlYTogQXJlYXMuWmVidUNhdmV9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTEgICAgICAgID0gJCgweDExLCB7YXJlYTogQXJlYXMuTXRTYWJyZVdlc3QsIC4uLkNBVkV9KTtcbiAgLy8gSU5WQUxJRDogMHgxMlxuICAvLyBJTlZBTElEOiAweDEzXG4gIHJlYWRvbmx5IENvcmRlbFBsYWluV2VzdCAgICAgICAgICA9ICQoMHgxNCwge2FyZWE6IEFyZWFzLkNvcmRlbFBsYWlufSk7XG4gIHJlYWRvbmx5IENvcmRlbFBsYWluRWFzdCAgICAgICAgICA9ICQoMHgxNSk7XG4gIC8vIElOVkFMSUQ6IDB4MTYgLS0gdW51c2VkIGNvcHkgb2YgMThcbiAgLy8gSU5WQUxJRDogMHgxN1xuICByZWFkb25seSBCcnlubWFlciAgICAgICAgICAgICAgICAgPSAkKDB4MTgsIHthcmVhOiBBcmVhcy5CcnlubWFlcn0pO1xuICByZWFkb25seSBPdXRzaWRlU3RvbUhvdXNlICAgICAgICAgPSAkKDB4MTksIHthcmVhOiBBcmVhcy5TdG9tSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFN3YW1wICAgICAgICAgICAgICAgICAgICA9ICQoMHgxYSwge2FyZWE6IEFyZWFzLlN3YW1wLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDdjfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzICAgICAgICAgICAgICAgICA9ICQoMHgxYiwge2FyZWE6IEFyZWFzLkFtYXpvbmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXhlZDogWzB4MGQsIDB4MGVdfSk7XG4gIHJlYWRvbmx5IE9hayAgICAgICAgICAgICAgICAgICAgICA9ICQoMHgxYywge2FyZWE6IEFyZWFzLk9ha30pO1xuICAvLyBJTlZBTElEOiAweDFkXG4gIHJlYWRvbmx5IFN0b21Ib3VzZSAgICAgICAgICAgICAgICA9ICQoMHgxZSwge2FyZWE6IEFyZWFzLlN0b21Ib3VzZX0pO1xuICAvLyBJTlZBTElEOiAweDFmXG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0xvd2VyICAgICAgICA9ICQoMHgyMCwge2FyZWE6IEFyZWFzLk10U2FicmVXZXN0fSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X1VwcGVyICAgICAgICA9ICQoMHgyMSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmUyICAgICAgICA9ICQoMHgyMiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmUzICAgICAgICA9ICQoMHgyMywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU0ICAgICAgICA9ICQoMHgyNCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU1ICAgICAgICA9ICQoMHgyNSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU2ICAgICAgICA9ICQoMHgyNiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU3ICAgICAgICA9ICQoMHgyNywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9NYWluICAgICAgICA9ICQoMHgyOCwge2FyZWE6IEFyZWFzLk10U2FicmVOb3J0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHhiNX0pO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTWlkZGxlICAgICAgPSAkKDB4MjkpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTIgICAgICAgPSAkKDB4MmEsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTMgICAgICAgPSAkKDB4MmIsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTQgICAgICAgPSAkKDB4MmMsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTUgICAgICAgPSAkKDB4MmQsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTYgICAgICAgPSAkKDB4MmUsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfUHJpc29uSGFsbCAgPSAkKDB4MmYsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTGVmdENlbGwgICAgPSAkKDB4MzAsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTGVmdENlbGwyICAgPSAkKDB4MzEsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfUmlnaHRDZWxsICAgPSAkKDB4MzIsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTggICAgICAgPSAkKDB4MzMsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTkgICAgICAgPSAkKDB4MzQsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfU3VtbWl0Q2F2ZSAgPSAkKDB4MzUsIENBVkUpO1xuICAvLyBJTlZBTElEOiAweDM2XG4gIC8vIElOVkFMSUQ6IDB4MzdcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUxICAgICAgID0gJCgweDM4LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU3ICAgICAgID0gJCgweDM5LCBDQVZFKTtcbiAgLy8gSU5WQUxJRDogMHgzYVxuICAvLyBJTlZBTElEOiAweDNiXG4gIHJlYWRvbmx5IE5hZGFyZV9Jbm4gICAgICAgICAgICAgICA9ICQoMHgzYywge2FyZWE6IEFyZWFzLk5hZGFyZSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgTmFkYXJlX1Rvb2xTaG9wICAgICAgICAgID0gJCgweDNkLCBIT1VTRSk7XG4gIHJlYWRvbmx5IE5hZGFyZV9CYWNrUm9vbSAgICAgICAgICA9ICQoMHgzZSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweDNmXG4gIHJlYWRvbmx5IFdhdGVyZmFsbFZhbGxleU5vcnRoICAgICA9ICQoMHg0MCwge2FyZWE6IEFyZWFzLldhdGVyZmFsbFZhbGxleX0pO1xuICByZWFkb25seSBXYXRlcmZhbGxWYWxsZXlTb3V0aCAgICAgPSAkKDB4NDEpO1xuICByZWFkb25seSBMaW1lVHJlZVZhbGxleSAgICAgICAgICAgPSAkKDB4NDIsIHthcmVhOiBBcmVhcy5MaW1lVHJlZVZhbGxleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgTGltZVRyZWVMYWtlICAgICAgICAgICAgID0gJCgweDQzLCB7YXJlYTogQXJlYXMuTGltZVRyZWVMYWtlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBLaXJpc2FQbGFudENhdmUxICAgICAgICAgPSAkKDB4NDQsIHthcmVhOiBBcmVhcy5LaXJpc2FQbGFudENhdmV9KTtcbiAgcmVhZG9ubHkgS2lyaXNhUGxhbnRDYXZlMiAgICAgICAgID0gJCgweDQ1KTtcbiAgcmVhZG9ubHkgS2lyaXNhUGxhbnRDYXZlMyAgICAgICAgID0gJCgweDQ2KTtcbiAgcmVhZG9ubHkgS2lyaXNhTWVhZG93ICAgICAgICAgICAgID0gJCgweDQ3LCB7YXJlYTogQXJlYXMuS2lyaXNhTWVhZG93fSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlMSAgICAgICAgICAgICA9ICQoMHg0OCwge2FyZWE6IEFyZWFzLkZvZ0xhbXBDYXZlfSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlMiAgICAgICAgICAgICA9ICQoMHg0OSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlMyAgICAgICAgICAgICA9ICQoMHg0YSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlRGVhZEVuZCAgICAgICA9ICQoMHg0Yik7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNCAgICAgICAgICAgICA9ICQoMHg0Yyk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNSAgICAgICAgICAgICA9ICQoMHg0ZCk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNiAgICAgICAgICAgICA9ICQoMHg0ZSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNyAgICAgICAgICAgICA9ICQoMHg0Zik7XG4gIHJlYWRvbmx5IFBvcnRvYSAgICAgICAgICAgICAgICAgICA9ICQoMHg1MCwge2FyZWE6IEFyZWFzLlBvcnRvYX0pO1xuICByZWFkb25seSBQb3J0b2FfRmlzaGVybWFuSXNsYW5kICAgPSAkKDB4NTEsIHthcmVhOiBBcmVhcy5GaXNoZXJtYW5Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgTWVzaWFTaHJpbmUgICAgICAgICAgICAgID0gJCgweDUyLCB7YXJlYTogQXJlYXMuTGltZVRyZWVMYWtlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5NRVNJQX0pO1xuICAvLyBJTlZBTElEOiAweDUzXG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUxICAgICAgICAgICA9ICQoMHg1NCwge2FyZWE6IEFyZWFzLldhdGVyZmFsbENhdmV9KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTIgICAgICAgICAgID0gJCgweDU1KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTMgICAgICAgICAgID0gJCgweDU2KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTQgICAgICAgICAgID0gJCgweDU3KTtcbiAgcmVhZG9ubHkgVG93ZXJFbnRyYW5jZSAgICAgICAgICAgID0gJCgweDU4LCB7YXJlYTogQXJlYXMuVG93ZXJ9KTtcbiAgcmVhZG9ubHkgVG93ZXIxICAgICAgICAgICAgICAgICAgID0gJCgweDU5KTtcbiAgcmVhZG9ubHkgVG93ZXIyICAgICAgICAgICAgICAgICAgID0gJCgweDVhKTtcbiAgcmVhZG9ubHkgVG93ZXIzICAgICAgICAgICAgICAgICAgID0gJCgweDViKTtcbiAgcmVhZG9ubHkgVG93ZXJPdXRzaWRlTWVzaWEgICAgICAgID0gJCgweDVjKTtcbiAgcmVhZG9ubHkgVG93ZXJPdXRzaWRlRHluYSAgICAgICAgID0gJCgweDVkKTtcbiAgcmVhZG9ubHkgVG93ZXJNZXNpYSAgICAgICAgICAgICAgID0gJCgweDVlLCBNRVNJQSk7XG4gIHJlYWRvbmx5IFRvd2VyRHluYSAgICAgICAgICAgICAgICA9ICQoMHg1ZiwgRFlOQSk7XG4gIHJlYWRvbmx5IEFuZ3J5U2VhICAgICAgICAgICAgICAgICA9ICQoMHg2MCwge2FyZWE6IEFyZWFzLkFuZ3J5U2VhfSk7XG4gIHJlYWRvbmx5IEJvYXRIb3VzZSAgICAgICAgICAgICAgICA9ICQoMHg2MSk7XG4gIHJlYWRvbmx5IEpvZWxMaWdodGhvdXNlICAgICAgICAgICA9ICQoMHg2Miwge2FyZWE6IEFyZWFzLkxpZ2h0aG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIC8vIElOVkFMSUQ6IDB4NjNcbiAgcmVhZG9ubHkgVW5kZXJncm91bmRDaGFubmVsICAgICAgID0gJCgweDY0LCB7YXJlYTogQXJlYXMuVW5kZXJncm91bmRDaGFubmVsfSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd24gICAgICAgICAgICAgICA9ICQoMHg2NSwge2FyZWE6IEFyZWFzLlpvbWJpZVRvd259KTtcbiAgLy8gSU5WQUxJRDogMHg2NlxuICAvLyBJTlZBTElEOiAweDY3XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQxICAgICAgICA9ICQoMHg2OCwge2FyZWE6IEFyZWFzLkV2aWxTcGlyaXRJc2xhbmRFbnRyYW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDIgICAgICAgID0gJCgweDY5LCB7YXJlYTogQXJlYXMuRXZpbFNwaXJpdElzbGFuZH0pO1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kMyAgICAgICAgPSAkKDB4NmEpO1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kNCAgICAgICAgPSAkKDB4NmIpO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UxICAgICAgICAgICAgPSAkKDB4NmMsIHthcmVhOiBBcmVhcy5TYWJlcmFGb3J0cmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHhmZH0pO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UyICAgICAgICAgICAgPSAkKDB4NmQpO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UyX1dlc3QgICAgICAgPSAkKC0xKTsgIC8vIHdpbGwgZ2V0IHRoZSB3ZXN0IHBhcnQgb2YgcGFsYWNlMlxuICByZWFkb25seSBTYWJlcmFQYWxhY2UzICAgICAgICAgICAgPSAkKDB4NmUsIHtib3NzU2NyZWVuOiAweGZkfSk7XG4gIC8vIElOVkFMSUQ6IDB4NmYgLS0gU2FiZXJhIFBhbGFjZSAzIHVudXNlZCBjb3B5XG4gIHJlYWRvbmx5IEpvZWxTZWNyZXRQYXNzYWdlICAgICAgICA9ICQoMHg3MCwge2FyZWE6IEFyZWFzLkpvZWxQYXNzYWdlfSk7XG4gIHJlYWRvbmx5IEpvZWwgICAgICAgICAgICAgICAgICAgICA9ICQoMHg3MSwge2FyZWE6IEFyZWFzLkpvZWx9KTtcbiAgcmVhZG9ubHkgU3dhbiAgICAgICAgICAgICAgICAgICAgID0gJCgweDcyLCB7YXJlYTogQXJlYXMuU3dhbiwgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgU3dhbkdhdGUgICAgICAgICAgICAgICAgID0gJCgweDczLCB7YXJlYTogQXJlYXMuU3dhbkdhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAxfSk7XG4gIC8vIElOVkFMSUQ6IDB4NzRcbiAgLy8gSU5WQUxJRDogMHg3NVxuICAvLyBJTlZBTElEOiAweDc2XG4gIC8vIElOVkFMSUQ6IDB4NzdcbiAgcmVhZG9ubHkgR29hVmFsbGV5ICAgICAgICAgICAgICAgID0gJCgweDc4LCB7YXJlYTogQXJlYXMuR29hVmFsbGV5fSk7XG4gIC8vIElOVkFMSUQ6IDB4NzlcbiAgLy8gSU5WQUxJRDogMHg3YVxuICAvLyBJTlZBTElEOiAweDdiXG4gIHJlYWRvbmx5IE10SHlkcmEgICAgICAgICAgICAgICAgICA9ICQoMHg3Yywge2FyZWE6IEFyZWFzLk10SHlkcmF9KTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMSAgICAgICAgICAgID0gJCgweDdkLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9PdXRzaWRlU2h5cm9uICAgID0gJCgweDdlLCB7Zml4ZWQ6IFsweDBkLCAweDBlXX0pOyAvLyBndWFyZHNcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMiAgICAgICAgICAgID0gJCgweDdmLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMyAgICAgICAgICAgID0gJCgweDgwLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNCAgICAgICAgICAgID0gJCgweDgxLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNSAgICAgICAgICAgID0gJCgweDgyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNiAgICAgICAgICAgID0gJCgweDgzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNyAgICAgICAgICAgID0gJCgweDg0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlOCAgICAgICAgICAgID0gJCgweDg1LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlOSAgICAgICAgICAgID0gJCgweDg2LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMTAgICAgICAgICAgID0gJCgweDg3LCBDQVZFKTtcbiAgcmVhZG9ubHkgU3R5eDEgICAgICAgICAgICAgICAgICAgID0gJCgweDg4LCB7YXJlYTogQXJlYXMuU3R5eH0pO1xuICByZWFkb25seSBTdHl4MiAgICAgICAgICAgICAgICAgICAgPSAkKDB4ODkpO1xuICByZWFkb25seSBTdHl4Ml9FYXN0ICAgICAgICAgICAgICAgPSAkKC0xKTsgIC8vIHdpbGwgZ2V0IHRoZSBlYXN0IHBhcnQgb2Ygc3R4eSAyXG4gIHJlYWRvbmx5IFN0eXgzICAgICAgICAgICAgICAgICAgICA9ICQoMHg4YSk7XG4gIC8vIElOVkFMSUQ6IDB4OGJcbiAgcmVhZG9ubHkgU2h5cm9uICAgICAgICAgICAgICAgICAgID0gJCgweDhjLCB7YXJlYTogQXJlYXMuU2h5cm9ufSk7XG4gIC8vIElOVkFMSUQ6IDB4OGRcbiAgcmVhZG9ubHkgR29hICAgICAgICAgICAgICAgICAgICAgID0gJCgweDhlLCB7YXJlYTogQXJlYXMuR29hfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzQmFzZW1lbnQgICAgICA9ICQoMHg4Ziwge2FyZWE6IEFyZWFzLkZvcnRyZXNzQmFzZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IERlc2VydDEgICAgICAgICAgICAgICAgICA9ICQoMHg5MCwge2FyZWE6IEFyZWFzLkRlc2VydDF9KTtcbiAgcmVhZG9ubHkgT2FzaXNDYXZlTWFpbiAgICAgICAgICAgID0gJCgweDkxLCB7YXJlYTogQXJlYXMuT2FzaXNDYXZlfSk7XG4gIHJlYWRvbmx5IERlc2VydENhdmUxICAgICAgICAgICAgICA9ICQoMHg5Miwge2FyZWE6IEFyZWFzLkRlc2VydENhdmUxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBTYWhhcmEgICAgICAgICAgICAgICAgICAgPSAkKDB4OTMsIHthcmVhOiBBcmVhcy5TYWhhcmF9KTtcbiAgcmVhZG9ubHkgU2FoYXJhT3V0c2lkZUNhdmUgICAgICAgID0gJCgweDk0LCB7bXVzaWM6IDB9KTsgLy8gVE9ETyAtIHNhaGFyYT8/IGdlbmVyaWM/P1xuICByZWFkb25seSBEZXNlcnRDYXZlMiAgICAgICAgICAgICAgPSAkKDB4OTUsIHthcmVhOiBBcmVhcy5EZXNlcnRDYXZlMiwgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgU2FoYXJhTWVhZG93ICAgICAgICAgICAgID0gJCgweDk2LCB7YXJlYTogQXJlYXMuU2FoYXJhTWVhZG93LCBtdXNpYzogMH0pO1xuICAvLyBJTlZBTElEOiAweDk3XG4gIHJlYWRvbmx5IERlc2VydDIgICAgICAgICAgICAgICAgICA9ICQoMHg5OCwge2FyZWE6IEFyZWFzLkRlc2VydDJ9KTtcbiAgLy8gSU5WQUxJRDogMHg5OVxuICAvLyBJTlZBTElEOiAweDlhXG4gIC8vIElOVkFMSUQ6IDB4OWJcbiAgcmVhZG9ubHkgUHlyYW1pZF9FbnRyYW5jZSAgICAgICAgID0gJCgweDljLCB7YXJlYTogQXJlYXMuUHlyYW1pZH0pO1xuICByZWFkb25seSBQeXJhbWlkX0JyYW5jaCAgICAgICAgICAgPSAkKDB4OWQpO1xuICByZWFkb25seSBQeXJhbWlkX01haW4gICAgICAgICAgICAgPSAkKDB4OWUpO1xuICByZWFkb25seSBQeXJhbWlkX0RyYXlnb24gICAgICAgICAgPSAkKDB4OWYpO1xuICByZWFkb25seSBDcnlwdF9FbnRyYW5jZSAgICAgICAgICAgPSAkKDB4YTAsIHthcmVhOiBBcmVhcy5DcnlwdH0pO1xuICByZWFkb25seSBDcnlwdF9IYWxsMSAgICAgICAgICAgICAgPSAkKDB4YTEpO1xuICByZWFkb25seSBDcnlwdF9CcmFuY2ggICAgICAgICAgICAgPSAkKDB4YTIpO1xuICByZWFkb25seSBDcnlwdF9EZWFkRW5kTGVmdCAgICAgICAgPSAkKDB4YTMpO1xuICByZWFkb25seSBDcnlwdF9EZWFkRW5kUmlnaHQgICAgICAgPSAkKDB4YTQpO1xuICByZWFkb25seSBDcnlwdF9IYWxsMiAgICAgICAgICAgICAgPSAkKDB4YTUpO1xuICByZWFkb25seSBDcnlwdF9EcmF5Z29uMiAgICAgICAgICAgPSAkKDB4YTYpO1xuICByZWFkb25seSBDcnlwdF9UZWxlcG9ydGVyICAgICAgICAgPSAkKDB4YTcsIHttdXNpYzogJ0NyeXB0LVRlbGVwb3J0ZXInfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0VudHJhbmNlICAgICA9ICQoMHhhOCwge2FyZWE6IEFyZWFzLkdvYUZvcnRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMX0pOyAvLyBzYW1lIGFzIG5leHQgYXJlYVxuICByZWFkb25seSBHb2FGb3J0cmVzc19LZWxiZXNxdWUgICAgPSAkKDB4YTksIHtib3NzU2NyZWVuOiAweDczLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5LRUxCRVNRVUV9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfWmVidSAgICAgICAgID0gJCgweGFhLCB7Li4uS0VMQkVTUVVFLCBwYWxldHRlOiAxfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX1NhYmVyYSAgICAgICA9ICQoMHhhYiwgU0FCRVJBKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfVG9ybmVsICAgICAgID0gJCgweGFjLCB7Ym9zc1NjcmVlbjogMHg5MSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uU0FCRVJBLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWxldHRlOiAxfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8xICAgICAgICA9ICQoMHhhZCwgTUFET19MT1dFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8yICAgICAgICA9ICQoMHhhZSwgTUFET19VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX01hZG8zICAgICAgICA9ICQoMHhhZiwgTUFET19VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUxICAgICA9ICQoMHhiMCwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUyICAgICA9ICQoMHhiMSwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmUzICAgICA9ICQoMHhiMiwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU0ICAgICA9ICQoMHhiMywgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU1ICAgICA9ICQoMHhiNCwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU2ICAgICA9ICQoMHhiNSwgS0FSTUlORV9MT1dFUik7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0thcm1pbmU3ICAgICA9ICQoMHhiNiwge2Jvc3NTY3JlZW46IDB4ZmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLktBUk1JTkVfTE9XRVJ9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfRXhpdCAgICAgICAgID0gJCgweGI3LCB7bXVzaWM6IDB9KTsgLy8gc2FtZSBhcyB0b3AgZ29hXG4gIHJlYWRvbmx5IE9hc2lzQ2F2ZV9FbnRyYW5jZSAgICAgICA9ICQoMHhiOCwge2FyZWE6IEFyZWFzLk9hc2lzRW50cmFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAyfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0FzaW5hICAgICAgICA9ICQoMHhiOSwge2FyZWE6IEFyZWFzLkdvYUZvcnRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5NQURPX1VQUEVSLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDkxfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0tlbnN1ICAgICAgICA9ICQoMHhiYSwgS0FSTUlORV9VUFBFUik7XG4gIHJlYWRvbmx5IEdvYV9Ib3VzZSAgICAgICAgICAgICAgICA9ICQoMHhiYiwge2FyZWE6IEFyZWFzLkdvYSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgR29hX0lubiAgICAgICAgICAgICAgICAgID0gJCgweGJjLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4YmRcbiAgcmVhZG9ubHkgR29hX1Rvb2xTaG9wICAgICAgICAgICAgID0gJCgweGJlLCBIT1VTRSk7XG4gIHJlYWRvbmx5IEdvYV9UYXZlcm4gICAgICAgICAgICAgICA9ICQoMHhiZiwgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX0VsZGVySG91c2UgICAgICAgICAgPSAkKDB4YzAsIHthcmVhOiBBcmVhcy5MZWFmLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBMZWFmX1JhYmJpdEh1dCAgICAgICAgICAgPSAkKDB4YzEsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGMyLCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhjMywgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX0FybW9yU2hvcCAgICAgICAgICAgPSAkKDB4YzQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9TdHVkZW50SG91c2UgICAgICAgID0gJCgweGM1LCBIT1VTRSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX1RhdmVybiAgICAgICAgICA9ICQoMHhjNiwge2FyZWE6IEFyZWFzLkJyeW5tYWVyLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBCcnlubWFlcl9QYXduU2hvcCAgICAgICAgPSAkKDB4YzcsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfSW5uICAgICAgICAgICAgID0gJCgweGM4LCBIT1VTRSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX0FybW9yU2hvcCAgICAgICA9ICQoMHhjOSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGNhXG4gIHJlYWRvbmx5IEJyeW5tYWVyX0l0ZW1TaG9wICAgICAgICA9ICQoMHhjYiwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGNjXG4gIHJlYWRvbmx5IE9ha19FbGRlckhvdXNlICAgICAgICAgICA9ICQoMHhjZCwge2FyZWE6IEFyZWFzLk9haywgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgT2FrX01vdGhlckhvdXNlICAgICAgICAgID0gJCgweGNlLCBIT1VTRSk7XG4gIHJlYWRvbmx5IE9ha19Ub29sU2hvcCAgICAgICAgICAgICA9ICQoMHhjZiwgSE9VU0UpO1xuICByZWFkb25seSBPYWtfSW5uICAgICAgICAgICAgICAgICAgPSAkKDB4ZDAsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfSW5uICAgICAgICAgICAgID0gJCgweGQxLCB7YXJlYTogQXJlYXMuQW1hem9uZXMsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0l0ZW1TaG9wICAgICAgICA9ICQoMHhkMiwgSE9VU0UpO1xuICByZWFkb25seSBBbWF6b25lc19Bcm1vclNob3AgICAgICAgPSAkKDB4ZDMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfRWxkZXIgICAgICAgICAgID0gJCgweGQ0LCBIT1VTRSk7XG4gIHJlYWRvbmx5IE5hZGFyZSAgICAgICAgICAgICAgICAgICA9ICQoMHhkNSwge2FyZWE6IEFyZWFzLk5hZGFyZX0pOyAvLyBlZGdlLWRvb3I/XG4gIHJlYWRvbmx5IFBvcnRvYV9GaXNoZXJtYW5Ib3VzZSAgICA9ICQoMHhkNiwge2FyZWE6IEFyZWFzLkZpc2hlcm1hbkhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRSwgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX1BhbGFjZUVudHJhbmNlICAgID0gJCgweGQ3LCB7YXJlYTogQXJlYXMuUG9ydG9hUGFsYWNlfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Gb3J0dW5lVGVsbGVyICAgICA9ICQoMHhkOCwge2FyZWE6IEFyZWFzLlBvcnRvYSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZml4ZWQ6IFsweDBkLCAweDBlXSwgLy8gZ3VhcmQvZW1wdHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uRk9SVFVORV9URUxMRVJ9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX1Bhd25TaG9wICAgICAgICAgID0gJCgweGQ5LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Bcm1vclNob3AgICAgICAgICA9ICQoMHhkYSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGRiXG4gIHJlYWRvbmx5IFBvcnRvYV9Jbm4gICAgICAgICAgICAgICA9ICQoMHhkYywgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FfVG9vbFNob3AgICAgICAgICAgPSAkKDB4ZGQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hUGFsYWNlX0xlZnQgICAgICAgID0gJCgweGRlLCB7YXJlYTogQXJlYXMuUG9ydG9hUGFsYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRX0pO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfVGhyb25lUm9vbSAgPSAkKDB4ZGYsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hUGFsYWNlX1JpZ2h0ICAgICAgID0gJCgweGUwLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Bc2luYVJvb20gICAgICAgICA9ICQoMHhlMSwge2FyZWE6IEFyZWFzLlVuZGVyZ3JvdW5kQ2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0UsIG11c2ljOiAnYXNpbmEnfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0VsZGVyRG93bnN0YWlycyA9ICQoMHhlMiwge2FyZWE6IEFyZWFzLkFtYXpvbmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRX0pO1xuICByZWFkb25seSBKb2VsX0VsZGVySG91c2UgICAgICAgICAgPSAkKDB4ZTMsIHthcmVhOiBBcmVhcy5Kb2VsLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBKb2VsX1NoZWQgICAgICAgICAgICAgICAgPSAkKDB4ZTQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgSm9lbF9Ub29sU2hvcCAgICAgICAgICAgID0gJCgweGU1LCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4ZTZcbiAgcmVhZG9ubHkgSm9lbF9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGU3LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd25fSG91c2UgICAgICAgICA9ICQoMHhlOCwge2FyZWE6IEFyZWFzLlpvbWJpZVRvd24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd25fSG91c2VCYXNlbWVudCA9ICQoMHhlOSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGVhXG4gIHJlYWRvbmx5IFN3YW5fVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhlYiwge2FyZWE6IEFyZWFzLlN3YW4sIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFN3YW5fU3RvbUh1dCAgICAgICAgICAgICA9ICQoMHhlYywgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX0lubiAgICAgICAgICAgICAgICAgPSAkKDB4ZWQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9Bcm1vclNob3AgICAgICAgICAgID0gJCgweGVlLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fVGF2ZXJuICAgICAgICAgICAgICA9ICQoMHhlZiwgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX1Bhd25TaG9wICAgICAgICAgICAgPSAkKDB4ZjAsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9EYW5jZUhhbGwgICAgICAgICAgID0gJCgweGYxLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9UZW1wbGUgICAgICAgICAgICA9ICQoMHhmMiwge2FyZWE6IEFyZWFzLlNoeXJvblRlbXBsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHg3MH0pO1xuICByZWFkb25seSBTaHlyb25fVHJhaW5pbmdIYWxsICAgICAgPSAkKDB4ZjMsIHthcmVhOiBBcmVhcy5TaHlyb24sIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Ib3NwaXRhbCAgICAgICAgICA9ICQoMHhmNCwgSE9VU0UpO1xuICByZWFkb25seSBTaHlyb25fQXJtb3JTaG9wICAgICAgICAgPSAkKDB4ZjUsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2h5cm9uX1Rvb2xTaG9wICAgICAgICAgID0gJCgweGY2LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Jbm4gICAgICAgICAgICAgICA9ICQoMHhmNywgSE9VU0UpO1xuICByZWFkb25seSBTYWhhcmFfSW5uICAgICAgICAgICAgICAgPSAkKDB4ZjgsIHthcmVhOiBBcmVhcy5TYWhhcmEsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhmOSwgSE9VU0UpO1xuICByZWFkb25seSBTYWhhcmFfRWxkZXJIb3VzZSAgICAgICAgPSAkKDB4ZmEsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2FoYXJhX1Bhd25TaG9wICAgICAgICAgID0gJCgweGZiLCBIT1VTRSk7XG5cbiAgLy8gTmV3IGxvY2F0aW9ucywgbm8gSUQgcHJvY3VyZWQgeWV0LlxuICByZWFkb25seSBFYXN0Q2F2ZTEgICAgICA9ICQoLTEsIHthcmVhOiBBcmVhcy5FYXN0Q2F2ZX0pO1xuICByZWFkb25seSBFYXN0Q2F2ZTIgICAgICA9ICQoLTEpO1xuICByZWFkb25seSBFYXN0Q2F2ZTMgICAgICA9ICQoLTEpO1xuICByZWFkb25seSBGaXNoZXJtYW5CZWFjaCA9ICQoLTEsIHthcmVhOiBBcmVhcy5GaXNoZXJtYW5Ib3VzZSwgLi4uSE9VU0V9KTtcblxuICBwcml2YXRlIHJlYWRvbmx5IGxvY3NCeVNjcmVlbiA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgTG9jYXRpb25bXT4oKCkgPT4gW10pO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tKSB7XG4gICAgc3VwZXIoMHgxMDApO1xuICAgICQuY29tbWl0KHRoaXMpO1xuICAgIC8vIEZpbGwgaW4gYW55IG1pc3Npbmcgb25lc1xuICAgIGZvciAobGV0IGlkID0gMDsgaWQgPCAweDEwMDsgaWQrKykge1xuICAgICAgaWYgKHRoaXNbaWRdKSB7XG4gICAgICAgIHRoaXMuaW5kZXhTY3JlZW5zKHRoaXNbaWRdKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aGlzW2lkXSA9IG5ldyBMb2NhdGlvbihyb20sIGlkLCB7XG4gICAgICAgIGFyZWE6IEFyZWFzLlVudXNlZCxcbiAgICAgICAgbmFtZTogJycsXG4gICAgICAgIG11c2ljOiAnJyxcbiAgICAgICAgcGFsZXR0ZTogJycsXG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gVE9ETyAtIG1ldGhvZCB0byBhZGQgYW4gdW5yZWdpc3RlcmVkIGxvY2F0aW9uIHRvIGFuIGVtcHR5IGluZGV4LlxuICB9XG5cbiAgaW5kZXhTY3JlZW5zKGxvYzogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgZm9yIChjb25zdCBzIG9mIHJvdykge1xuICAgICAgICB0aGlzLmxvY3NCeVNjcmVlbi5nZXQocykucHVzaChsb2MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlbnVtYmVyU2NyZWVuKG9sZElkOiBudW1iZXIsIG5ld0lkOiBudW1iZXIpIHtcbiAgICBjb25zdCBsb2NzID0gdGhpcy5sb2NzQnlTY3JlZW4uZ2V0KG9sZElkKTtcbiAgICB0aGlzLmxvY3NCeVNjcmVlbi5zZXQobmV3SWQsIGxvY3MpO1xuICAgIHRoaXMubG9jc0J5U2NyZWVuLmRlbGV0ZShvbGRJZCk7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgbG9jcykge1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb3cubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAocm93W2ldID09PSBvbGRJZCkgcm93W2ldID0gbmV3SWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhbGxvY2F0ZShsb2NhdGlvbjogTG9jYXRpb24sIGFmdGVyPzogTG9jYXRpb24pOiBMb2NhdGlvbiB7XG4gICAgLy8gcGljayBhbiB1bnVzZWQgbG9jYXRpb25cbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcykge1xuICAgICAgaWYgKGwudXNlZCB8fCAoYWZ0ZXIgJiYgbC5pZCA8IGFmdGVyLmlkKSkgY29udGludWU7XG4gICAgICAobG9jYXRpb24gYXMgYW55KS5pZCA9IGwuaWQ7XG4gICAgICBsb2NhdGlvbi51c2VkID0gdHJ1ZTtcbiAgICAgIHRoaXMuaW5kZXhTY3JlZW5zKGxvY2F0aW9uKTtcbiAgICAgIHJldHVybiB0aGlzW2wuaWRdID0gbG9jYXRpb247XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignTm8gdW51c2VkIGxvY2F0aW9uJyk7XG4gIH1cblxuICB3cml0ZSgpOiBNb2R1bGVbXSB7XG4gICAgY29uc3QgYSA9IHRoaXMucm9tLmFzc2VtYmxlcigpO1xuICAgIGZyZWUoYSwgJDBhLCAweDg0ZjgsIDB4YTAwMCk7XG4gICAgZnJlZShhLCAkMGIsIDB4YTAwMCwgMHhiZTAwKTtcbiAgICBmcmVlKGEsICQwYywgMHg5M2Y5LCAweGEwMDApO1xuICAgIGZyZWUoYSwgJDBkLCAweGEwMDAsIDB4YWMwMCk7XG4gICAgZnJlZShhLCAkMGQsIDB4YWUwMCwgMHhjMDAwKTsgLy8gYmYwMCA/Pz9cbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMpIHtcbiAgICAgIGxvY2F0aW9uLmFzc2VtYmxlKGEpO1xuICAgIH1cbiAgICByZXR1cm4gW2EubW9kdWxlKCldO1xuICB9XG5cbiAgbG9jYXRpb24oKSB7XG4gICAgLy8gPz8/IHdoYXQgd2FzIHRoaXMgc3VwcG9zZWQgdG8gYmU/XG4gIH1cbn1cblxuLy8gTG9jYXRpb24gZW50aXRpZXNcbmV4cG9ydCBjbGFzcyBMb2NhdGlvbiBleHRlbmRzIEVudGl0eSB7XG5cbiAgdXNlZDogYm9vbGVhbjtcblxuICBjaGVja3BvaW50OiBib29sZWFuO1xuICBzYXZlYWJsZTogYm9vbGVhbjtcblxuICBiZ206IG51bWJlcjtcbiAgb3JpZ2luYWxCZ206IG51bWJlcjtcbiAgbGF5b3V0V2lkdGg6IG51bWJlcjtcbiAgbGF5b3V0SGVpZ2h0OiBudW1iZXI7XG4gIGFuaW1hdGlvbjogbnVtYmVyO1xuICAvLyBTY3JlZW4gaW5kaWNlcyBhcmUgKGV4dGVuZGVkIDw8IDggfCBzY3JlZW4pXG4gIC8vIGV4dGVuZGVkOiBudW1iZXI7XG4gIHNjcmVlbnM6IG51bWJlcltdW107XG5cbiAgdGlsZVBhdHRlcm5zOiBbbnVtYmVyLCBudW1iZXJdO1xuICB0aWxlUGFsZXR0ZXM6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgb3JpZ2luYWxUaWxlUGFsZXR0ZXM6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgdGlsZXNldDogbnVtYmVyO1xuICB0aWxlRWZmZWN0czogbnVtYmVyO1xuXG4gIGVudHJhbmNlczogRW50cmFuY2VbXTtcbiAgZXhpdHM6IEV4aXRbXTtcbiAgZmxhZ3M6IEZsYWdbXTtcbiAgcGl0czogUGl0W107XG5cbiAgc3ByaXRlUGFsZXR0ZXM6IFtudW1iZXIsIG51bWJlcl07XG4gIHNwcml0ZVBhdHRlcm5zOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzcGF3bnM6IFNwYXduW107XG5cbiAgcHJpdmF0ZSBfaXNTaG9wOiBib29sZWFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfbWV0YT86IE1ldGFsb2NhdGlvbiA9IHVuZGVmaW5lZDtcbiAgLy8gTGF6aWx5LXBvcHVsYXRlZCBtYXAga2V5cyBmb3Iga2VlcGluZyBjb25zaXN0ZW50IG11c2ljIGFuZCBjb2xvcnMuXG4gIHByaXZhdGUgX211c2ljR3JvdXA/OiBzdHJpbmd8c3ltYm9sO1xuICBwcml2YXRlIF9jb2xvckdyb3VwPzogc3RyaW5nfHN5bWJvbDtcblxuICBjb25zdHJ1Y3Rvcihyb206IFJvbSwgaWQ6IG51bWJlciwgcmVhZG9ubHkgZGF0YTogTG9jYXRpb25EYXRhKSB7XG4gICAgLy8gd2lsbCBpbmNsdWRlIGJvdGggTWFwRGF0YSAqYW5kKiBOcGNEYXRhLCBzaW5jZSB0aGV5IHNoYXJlIGEga2V5LlxuICAgIHN1cGVyKHJvbSwgaWQpO1xuXG4gICAgY29uc3QgbWFwRGF0YUJhc2UgPVxuICAgICAgICBpZCA+PSAwID8gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCB0aGlzLm1hcERhdGFQb2ludGVyKSArIDB4YzAwMCA6IDA7XG4gICAgLy8gVE9ETyAtIHBhc3MgdGhpcyBpbiBhbmQgbW92ZSBMT0NBVElPTlMgdG8gbG9jYXRpb25zLnRzXG4gICAgdGhpcy51c2VkID0gbWFwRGF0YUJhc2UgPiAweGMwMDAgJiYgISF0aGlzLm5hbWU7XG5cbiAgICBpZiAoIXRoaXMudXNlZCkge1xuICAgICAgdGhpcy5iZ20gPSB0aGlzLm9yaWdpbmFsQmdtID0gMDtcbiAgICAgIHRoaXMubGF5b3V0V2lkdGggPSAwO1xuICAgICAgdGhpcy5sYXlvdXRIZWlnaHQgPSAwO1xuICAgICAgdGhpcy5hbmltYXRpb24gPSAwO1xuICAgICAgLy8gdGhpcy5leHRlbmRlZCA9IDA7XG4gICAgICB0aGlzLnNjcmVlbnMgPSBbWzBdXTtcbiAgICAgIHRoaXMudGlsZVBhbGV0dGVzID0gWzB4MjQsIDB4MDEsIDB4MjZdO1xuICAgICAgdGhpcy5vcmlnaW5hbFRpbGVQYWxldHRlcyA9IFsweDI0LCAweDAxLCAweDI2XTtcbiAgICAgIHRoaXMudGlsZXNldCA9IDB4ODA7XG4gICAgICB0aGlzLnRpbGVFZmZlY3RzID0gMHhiMztcbiAgICAgIHRoaXMudGlsZVBhdHRlcm5zID0gWzIsIDRdO1xuICAgICAgdGhpcy5leGl0cyA9IFtdO1xuICAgICAgdGhpcy5lbnRyYW5jZXMgPSBbXTtcbiAgICAgIHRoaXMuZmxhZ3MgPSBbXTtcbiAgICAgIHRoaXMucGl0cyA9IFtdO1xuICAgICAgdGhpcy5zcGF3bnMgPSBbXTtcbiAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXMgPSBbMCwgMF07XG4gICAgICB0aGlzLnNwcml0ZVBhdHRlcm5zID0gWzAsIDBdO1xuICAgICAgdGhpcy5jaGVja3BvaW50ID0gdGhpcy5zYXZlYWJsZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxheW91dEJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlKSArIDB4YzAwMDtcbiAgICBjb25zdCBncmFwaGljc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgMikgKyAweGMwMDA7XG4gICAgY29uc3QgZW50cmFuY2VzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyA0KSArIDB4YzAwMDtcbiAgICBjb25zdCBleGl0c0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgNikgKyAweGMwMDA7XG4gICAgY29uc3QgZmxhZ3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDgpICsgMHhjMDAwO1xuXG4gICAgLy8gUmVhZCB0aGUgZXhpdHMgZmlyc3Qgc28gdGhhdCB3ZSBjYW4gZGV0ZXJtaW5lIGlmIHRoZXJlJ3MgZW50cmFuY2UvcGl0c1xuICAgIC8vIG1ldGFkYXRhIGVuY29kZWQgYXQgdGhlIGVuZC5cbiAgICBsZXQgaGFzUGl0cyA9IHRoaXMudXNlZCAmJiBsYXlvdXRCYXNlICE9PSBtYXBEYXRhQmFzZSArIDEwO1xuICAgIGxldCBlbnRyYW5jZUxlbiA9IGV4aXRzQmFzZSAtIGVudHJhbmNlc0Jhc2U7XG4gICAgdGhpcy5leGl0cyA9ICgoKSA9PiB7XG4gICAgICBjb25zdCBleGl0cyA9IFtdO1xuICAgICAgbGV0IGkgPSBleGl0c0Jhc2U7XG4gICAgICB3aGlsZSAoIShyb20ucHJnW2ldICYgMHg4MCkpIHtcbiAgICAgICAgLy8gTk9URTogc2V0IGRlc3QgdG8gRkYgdG8gZGlzYWJsZSBhbiBleGl0IChpdCdzIGFuIGludmFsaWQgbG9jYXRpb24gYW55d2F5KVxuICAgICAgICBpZiAocm9tLnByZ1tpICsgMl0gIT0gMHhmZikge1xuICAgICAgICAgIGV4aXRzLnB1c2goRXhpdC5mcm9tKHJvbS5wcmcsIGkpKTtcbiAgICAgICAgfVxuICAgICAgICBpICs9IDQ7XG4gICAgICB9XG4gICAgICBpZiAocm9tLnByZ1tpXSAhPT0gMHhmZikge1xuICAgICAgICBoYXNQaXRzID0gISEocm9tLnByZ1tpXSAmIDB4NDApO1xuICAgICAgICBlbnRyYW5jZUxlbiA9IChyb20ucHJnW2ldICYgMHgxZikgPDwgMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBleGl0cztcbiAgICB9KSgpO1xuXG4gICAgLy8gVE9ETyAtIHRoZXNlIGhldXJpc3RpY3Mgd2lsbCBub3Qgd29yayB0byByZS1yZWFkIHRoZSBsb2NhdGlvbnMuXG4gICAgLy8gICAgICAtIHdlIGNhbiBsb29rIGF0IHRoZSBvcmRlcjogaWYgdGhlIGRhdGEgaXMgQkVGT1JFIHRoZSBwb2ludGVyc1xuICAgIC8vICAgICAgICB0aGVuIHdlJ3JlIGluIGEgcmV3cml0dGVuIHN0YXRlOyBpbiB0aGF0IGNhc2UsIHdlIG5lZWQgdG8gc2ltcGx5XG4gICAgLy8gICAgICAgIGZpbmQgYWxsIHJlZnMgYW5kIG1heC4uLj9cbiAgICAvLyAgICAgIC0gY2FuIHdlIHJlYWQgdGhlc2UgcGFydHMgbGF6aWx5P1xuICAgIGNvbnN0IHBpdHNCYXNlID1cbiAgICAgICAgIWhhc1BpdHMgPyAwIDogcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDEwKSArIDB4YzAwMDtcblxuICAgIHRoaXMuYmdtID0gdGhpcy5vcmlnaW5hbEJnbSA9IHJvbS5wcmdbbGF5b3V0QmFzZV07XG4gICAgdGhpcy5sYXlvdXRXaWR0aCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDFdO1xuICAgIHRoaXMubGF5b3V0SGVpZ2h0ID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgMl07XG4gICAgdGhpcy5hbmltYXRpb24gPSByb20ucHJnW2xheW91dEJhc2UgKyAzXTtcbiAgICAvLyB0aGlzLmV4dGVuZGVkID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgNF07XG4gICAgY29uc3QgZXh0ZW5kZWQgPSByb20ucHJnW2xheW91dEJhc2UgKyA0XSA/IDB4MTAwIDogMDtcbiAgICB0aGlzLnNjcmVlbnMgPSBzZXEoXG4gICAgICAgIHRoaXMuaGVpZ2h0LFxuICAgICAgICB5ID0+IHR1cGxlKHJvbS5wcmcsIGxheW91dEJhc2UgKyA1ICsgeSAqIHRoaXMud2lkdGgsIHRoaXMud2lkdGgpXG4gICAgICAgICAgICAgICAgIC5tYXAocyA9PiBleHRlbmRlZCB8IHMpKTtcbiAgICB0aGlzLnRpbGVQYWxldHRlcyA9IHR1cGxlPG51bWJlcj4ocm9tLnByZywgZ3JhcGhpY3NCYXNlLCAzKTtcbiAgICB0aGlzLm9yaWdpbmFsVGlsZVBhbGV0dGVzID0gdHVwbGUodGhpcy50aWxlUGFsZXR0ZXMsIDAsIDMpO1xuICAgIHRoaXMudGlsZXNldCA9IHJvbS5wcmdbZ3JhcGhpY3NCYXNlICsgM107XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHJvbS5wcmdbZ3JhcGhpY3NCYXNlICsgNF07XG4gICAgdGhpcy50aWxlUGF0dGVybnMgPSB0dXBsZShyb20ucHJnLCBncmFwaGljc0Jhc2UgKyA1LCAyKTtcblxuICAgIHRoaXMuZW50cmFuY2VzID1cbiAgICAgIGdyb3VwKDQsIHJvbS5wcmcuc2xpY2UoZW50cmFuY2VzQmFzZSwgZW50cmFuY2VzQmFzZSArIGVudHJhbmNlTGVuKSxcbiAgICAgICAgICAgIHggPT4gRW50cmFuY2UuZnJvbSh4KSk7XG4gICAgdGhpcy5mbGFncyA9IHZhclNsaWNlKHJvbS5wcmcsIGZsYWdzQmFzZSwgMiwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gRmxhZy5mcm9tKHgpKTtcbiAgICB0aGlzLnBpdHMgPSBwaXRzQmFzZSA/IHZhclNsaWNlKHJvbS5wcmcsIHBpdHNCYXNlLCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gUGl0LmZyb20oeCkpIDogW107XG5cbiAgICBjb25zdCBucGNEYXRhQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5ucGNEYXRhUG9pbnRlcikgKyAweDEwMDAwO1xuICAgIGNvbnN0IGhhc1NwYXducyA9IG5wY0RhdGFCYXNlICE9PSAweDEwMDAwO1xuICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXMgPVxuICAgICAgICBoYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCBucGNEYXRhQmFzZSArIDEsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3ByaXRlUGF0dGVybnMgPVxuICAgICAgICBoYXNTcGF3bnMgPyB0dXBsZShyb20ucHJnLCBucGNEYXRhQmFzZSArIDMsIDIpIDogWzAsIDBdO1xuICAgIHRoaXMuc3Bhd25zID1cbiAgICAgICAgaGFzU3Bhd25zID8gdmFyU2xpY2Uocm9tLnByZywgbnBjRGF0YUJhc2UgKyA1LCA0LCAweGZmLCBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBTcGF3bi5mcm9tKHgpKSA6IFtdO1xuXG4gICAgdGhpcy5jaGVja3BvaW50ID0gISEocm9tLnByZ1sweDJmZjAwIHwgaWRdICYgMHg4MCk7XG4gICAgdGhpcy5zYXZlYWJsZSA9ICEhKHJvbS5wcmdbMHgyZmYwMCB8IGlkXSAmIDB4MDEpO1xuICB9XG5cbiAgc2V0IG1ldGEobWV0YTogTWV0YWxvY2F0aW9uKSB7XG4gICAgdGhpcy5fbWV0YSA9IG1ldGE7XG4gIH1cbiAgZ2V0IG1ldGEoKTogTWV0YWxvY2F0aW9uIHtcbiAgICB0aGlzLmVuc3VyZU1ldGEoKTtcbiAgICByZXR1cm4gdGhpcy5fbWV0YSE7XG4gIH1cbiAgZW5zdXJlTWV0YSgpIHtcbiAgICBpZiAoIXRoaXMuX21ldGEpIHRoaXMuX21ldGEgPSBNZXRhbG9jYXRpb24ub2YodGhpcyk7XG4gIH1cblxuICBzZXQgbXVzaWNHcm91cChncm91cDogc3RyaW5nfHN5bWJvbCkge1xuICAgIHRoaXMuX211c2ljR3JvdXAgPSBncm91cDtcbiAgfVxuICBnZXQgbXVzaWNHcm91cCgpOiBzdHJpbmd8c3ltYm9sIHtcbiAgICB0aGlzLmVuc3VyZU11c2ljR3JvdXAoKTtcbiAgICByZXR1cm4gdGhpcy5fbXVzaWNHcm91cCE7XG4gIH1cbiAgZW5zdXJlTXVzaWNHcm91cCgpIHtcbiAgICBpZiAodGhpcy5fbXVzaWNHcm91cCA9PSBudWxsKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLmRhdGEubXVzaWM7XG4gICAgICB0aGlzLl9tdXNpY0dyb3VwID1cbiAgICAgICAgICB0eXBlb2Yga2V5ICE9PSAnbnVtYmVyJyA/IGtleSA6XG4gICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmV4aXRzW2tleV0uZGVzdF0ubXVzaWNHcm91cDtcbiAgICB9XG4gIH1cblxuICBzZXQgY29sb3JHcm91cChncm91cDogc3RyaW5nfHN5bWJvbCkge1xuICAgIHRoaXMuX2NvbG9yR3JvdXAgPSBncm91cDtcbiAgfVxuICBnZXQgY29sb3JHcm91cCgpOiBzdHJpbmd8c3ltYm9sIHtcbiAgICB0aGlzLmVuc3VyZUNvbG9yR3JvdXAoKTtcbiAgICByZXR1cm4gdGhpcy5fY29sb3JHcm91cCE7XG4gIH1cbiAgZW5zdXJlQ29sb3JHcm91cCgpIHtcbiAgICBpZiAodGhpcy5fY29sb3JHcm91cCA9PSBudWxsKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLmRhdGEubXVzaWM7XG4gICAgICB0aGlzLl9jb2xvckdyb3VwID1cbiAgICAgICAgICB0eXBlb2Yga2V5ICE9PSAnbnVtYmVyJyA/IGtleSA6XG4gICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9uc1t0aGlzLmV4aXRzW2tleV0uZGVzdF0uY29sb3JHcm91cDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRG8gYWxsIHRoZSBpbml0aWFsaXphdGlvbiB0aGF0IGhhcyB0byBoYXBwZW4gYWZ0ZXIgYWxsIGxvY2F0aW9uc1xuICAgKiBoYXZlIGJlZW4gY29uc3RydWN0ZWQuXG4gICAqL1xuICBsYXp5SW5pdGlhbGl6YXRpb24oKSB7XG4gICAgdGhpcy5lbnN1cmVNZXRhKCk7XG4gICAgdGhpcy5lbnN1cmVNdXNpY0dyb3VwKCk7XG4gICAgdGhpcy5lbnN1cmVDb2xvckdyb3VwKCk7XG4gIH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRhdGEubmFtZTtcbiAgfVxuXG4gIGdldCBtYXBEYXRhUG9pbnRlcigpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmlkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyBtYXBkYXRhIHBvaW50ZXIgZm9yICR7dGhpcy5uYW1lfWApO1xuICAgIHJldHVybiAweDE0MzAwICsgKHRoaXMuaWQgPDwgMSk7XG4gIH1cblxuICBnZXQgbnBjRGF0YVBvaW50ZXIoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5pZCA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gbnBjZGF0YSBwb2ludGVyIGZvciAke3RoaXMubmFtZX1gKTtcbiAgICByZXR1cm4gMHgxOTIwMSArICh0aGlzLmlkIDw8IDEpO1xuICB9XG5cbiAgZ2V0IGhhc1NwYXducygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zcGF3bnMubGVuZ3RoID4gMDtcbiAgfVxuXG4gIC8vIC8vIE9mZnNldCB0byBPUiB3aXRoIHNjcmVlbiBJRHMuXG4gIC8vIGdldCBzY3JlZW5QYWdlKCk6IG51bWJlciB7XG4gIC8vICAgaWYgKCF0aGlzLnJvbS5jb21wcmVzc2VkTWFwRGF0YSkgcmV0dXJuIHRoaXMuZXh0ZW5kZWQgPyAweDEwMCA6IDA7XG4gIC8vICAgcmV0dXJuIHRoaXMuZXh0ZW5kZWQgPDwgODtcbiAgLy8gfVxuXG4gIG1hcFBsYW5lKCk6IG51bWJlciB7XG4gICAgY29uc3Qgc2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCByb3cgb2YgdGhpcy5zY3JlZW5zKSB7XG4gICAgICBmb3IgKGNvbnN0IHMgb2Ygcm93KSB7XG4gICAgICAgIHNldC5hZGQocyA+Pj4gOCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChzZXQuc2l6ZSAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tdW5pcXVlIHNjcmVlbiBwYWdlOiAke1suLi5zZXRdLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIHJldHVybiBzZXRbU3ltYm9sLml0ZXJhdG9yXSgpLm5leHQoKS52YWx1ZTtcbiAgfVxuXG4gIGlzU2hvcCgpOiBib29sZWFuIHtcbiAgICAvL3JldHVybiB0aGlzLnJvbS5zaG9wcy5maW5kSW5kZXgocyA9PiBzLmxvY2F0aW9uID09PSB0aGlzLmlkKSA+PSAwO1xuICAgIGlmICh0aGlzLl9pc1Nob3AgPT0gbnVsbCkge1xuICAgICAgdGhpcy5faXNTaG9wID0gdGhpcy5yb20uc2hvcHMuZmluZEluZGV4KHMgPT4gcy5sb2NhdGlvbiA9PT0gdGhpcy5pZCkgPj0gMDtcbiAgICAgIC8vIE5PVEU6IHNhaGFyYSBwYXduIHNob3AgaXMgbm90IGFjdHVhbGx5IGluIHRoZSB0YWJsZSAocGF3biBzaG9wcyBkb24ndFxuICAgICAgLy8gc3RyaWN0bHkgbmVlZCB0byBiZSkhICBUT0RPIC0gaGFuZGxlIHRoaXMgYmV0dGVyLlxuICAgICAgaWYgKHRoaXMuaWQgPT09IDB4ZmIpIHRoaXMuX2lzU2hvcCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pc1Nob3A7XG4gIH1cblxuICAvL3NldElzU2hvcChpc1Nob3A6IGJvb2xlYW4pIHsgdGhpcy5faXNTaG9wID0gaXNTaG9wOyB9XG5cbiAgc3Bhd24oaWQ6IG51bWJlcik6IFNwYXduIHtcbiAgICBjb25zdCBzcGF3biA9IHRoaXMuc3Bhd25zW2lkIC0gMHhkXTtcbiAgICBpZiAoIXNwYXduKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHNwYXduICQke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHNwYXduO1xuICB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmxheW91dFdpZHRoICsgMTsgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlcikgeyB0aGlzLmxheW91dFdpZHRoID0gd2lkdGggLSAxOyB9XG5cbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sYXlvdXRIZWlnaHQgKyAxOyB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHsgdGhpcy5sYXlvdXRIZWlnaHQgPSBoZWlnaHQgLSAxOyB9XG5cbiAgZmluZE9yQWRkRW50cmFuY2Uoc2NyZWVuOiBudW1iZXIsIGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5lbnRyYW5jZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZXNbaV07XG4gICAgICBpZiAoZW50cmFuY2Uuc2NyZWVuID09PSBzY3JlZW4gJiYgZW50cmFuY2UuY29vcmQgPT09IGNvb3JkKSByZXR1cm4gaTtcbiAgICB9XG4gICAgdGhpcy5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7c2NyZWVuLCBjb29yZH0pKTtcbiAgICByZXR1cm4gdGhpcy5lbnRyYW5jZXMubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIC8vIG1vbnN0ZXJzKCkge1xuICAvLyAgIGlmICghdGhpcy5zcGF3bnMpIHJldHVybiBbXTtcbiAgLy8gICByZXR1cm4gdGhpcy5zcGF3bnMuZmxhdE1hcChcbiAgLy8gICAgIChbLCwgdHlwZSwgaWRdLCBzbG90KSA9PlxuICAvLyAgICAgICB0eXBlICYgNyB8fCAhdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0gPyBbXSA6IFtcbiAgLy8gICAgICAgICBbdGhpcy5pZCxcbiAgLy8gICAgICAgICAgc2xvdCArIDB4MGQsXG4gIC8vICAgICAgICAgIHR5cGUgJiAweDgwID8gMSA6IDAsXG4gIC8vICAgICAgICAgIGlkICsgMHg1MCxcbiAgLy8gICAgICAgICAgdGhpcy5zcHJpdGVQYXR0ZXJuc1t0eXBlICYgMHg4MCA/IDEgOiAwXSxcbiAgLy8gICAgICAgICAgdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSxcbiAgLy8gICAgICAgICAgdGhpcy5zcHJpdGVQYWxldHRlc1t0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXS5wYWxldHRlcygpWzBdIC0gMl0sXG4gIC8vICAgICAgICAgXV0pO1xuICAvLyB9XG5cbiAgYXNzZW1ibGUoYTogQXNzZW1ibGVyKSB7XG4gICAgaWYgKCF0aGlzLnVzZWQpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHRoaXMuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgLy8gY29uc3QgJGxheW91dCA9IGBMYXlvdXRfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRncmFwaGljcyA9IGBHcmFwaGljc18ke2lkfWA7XG4gICAgLy8gY29uc3QgJGVudHJhbmNlcyA9IGBFbnRyYW5jZXNfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRleGl0cyA9IGBFeGl0c18ke2lkfWA7XG4gICAgLy8gY29uc3QgJGZsYWdzID0gYEZsYWdzXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkcGl0cyA9IGBQaXRzXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkbWFwZGF0YSA9IGBNYXBEYXRhXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkbnBjZGF0YSA9IGBOcGNEYXRhXyR7aWR9YDtcblxuICAgIGNvbnN0IHNwcml0ZVBhbCA9IHRoaXMuc3Bhd25zLmxlbmd0aCA/IHRoaXMuc3ByaXRlUGFsZXR0ZXMgOiBbMHhmZiwgMHhmZl07XG4gICAgY29uc3Qgc3ByaXRlUGF0ID0gdGhpcy5zcGF3bnMubGVuZ3RoID8gdGhpcy5zcHJpdGVQYXR0ZXJucyA6IFsweGZmLCAweGZmXTtcbiAgICBjb25zdCBtYXBEYXRhOiBFeHByW10gPSBbXTtcbiAgICAvLyB3cml0ZSBOUEMgZGF0YSBmaXJzdCwgaWYgcHJlc2VudC4uLlxuICAgIGNvbnN0IG5wY0RhdGEgPSBbMCwgLi4uc3ByaXRlUGFsLCAuLi5zcHJpdGVQYXQsXG4gICAgICAgICAgICAgICAgICAgICAuLi5jb25jYXRJdGVyYWJsZXModGhpcy5zcGF3bnMpLCAweGZmXTtcbiAgICBhLnNlZ21lbnQoJzBjJywgJzBkJyk7XG4gICAgYS5yZWxvYyhgTnBjRGF0YV8ke2lkfWApO1xuICAgIGNvbnN0ICRucGNEYXRhID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi5ucGNEYXRhKTtcbiAgICBhLm9yZygweDkyMDEgKyAodGhpcy5pZCA8PCAxKSwgYE5wY0RhdGFfJHtpZH1fUHRyYCk7XG4gICAgYS53b3JkKCRucGNEYXRhKTtcblxuICAgIC8vIHdyaXRlIGNoZWNrcG9pbnQvc2F2ZWFibGVcbiAgICBhLnNlZ21lbnQoJzE3Jyk7XG4gICAgYS5vcmcoMHhiZjAwIHwgdGhpcy5pZCk7XG4gICAgYS5ieXRlKCt0aGlzLmNoZWNrcG9pbnQgPDwgNyB8ICt0aGlzLnNhdmVhYmxlKVxuXG4gICAgLy8gd2l0ZSBtYXBkYXRhXG4gICAgYS5zZWdtZW50KCcwYScsICcwYicpO1xuICAgIC8vY29uc3QgZXh0ID0gbmV3IFNldCh0aGlzLnNjcmVlbnMubWFwKHMgPT4gcyA+PiA4KSk7XG4gICAgY29uc3Qgc2NyZWVucyA9IFtdO1xuICAgIGZvciAoY29uc3QgcyBvZiBjb25jYXRJdGVyYWJsZXModGhpcy5zY3JlZW5zKSkge1xuICAgICAgc2NyZWVucy5wdXNoKHMgJiAweGZmKTtcbiAgICB9XG4gICAgY29uc3QgbGF5b3V0ID0gdGhpcy5yb20uY29tcHJlc3NlZE1hcERhdGEgPyBbXG4gICAgICB0aGlzLmJnbSxcbiAgICAgIC8vIENvbXByZXNzZWQgdmVyc2lvbjogeXggaW4gb25lIGJ5dGUsIGV4dCthbmltIGluIG9uZSBieXRlXG4gICAgICB0aGlzLmxheW91dEhlaWdodCA8PCA0IHwgdGhpcy5sYXlvdXRXaWR0aCxcbiAgICAgIHRoaXMubWFwUGxhbmUoKSA8PCAyIHwgdGhpcy5hbmltYXRpb24sIC4uLnNjcmVlbnMsXG4gICAgXSA6IFtcbiAgICAgIHRoaXMuYmdtLCB0aGlzLmxheW91dFdpZHRoLCB0aGlzLmxheW91dEhlaWdodCxcbiAgICAgIHRoaXMuYW5pbWF0aW9uLCB0aGlzLm1hcFBsYW5lKCkgPyAweDgwIDogMCwgLi4uc2NyZWVucyxcbiAgICBdO1xuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fTGF5b3V0YCk7XG4gICAgY29uc3QgJGxheW91dCA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4ubGF5b3V0KTtcbiAgICBtYXBEYXRhLnB1c2goJGxheW91dCk7XG5cbiAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9X0dyYXBoaWNzYCk7XG4gICAgY29uc3QgJGdyYXBoaWNzID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi50aGlzLnRpbGVQYWxldHRlcyxcbiAgICAgICAgICAgdGhpcy50aWxlc2V0LCB0aGlzLnRpbGVFZmZlY3RzLFxuICAgICAgICAgICAuLi50aGlzLnRpbGVQYXR0ZXJucyk7XG4gICAgbWFwRGF0YS5wdXNoKCRncmFwaGljcyk7XG5cbiAgICAvLyBRdWljayBzYW5pdHkgY2hlY2s6IGlmIGFuIGVudHJhbmNlL2V4aXQgaXMgYmVsb3cgdGhlIEhVRCBvbiBhXG4gICAgLy8gbm9uLXZlcnRpY2FsbHkgc2Nyb2xsaW5nIG1hcCwgdGhlbiB3ZSBuZWVkIHRvIG1vdmUgaXQgdXBcbiAgICAvLyBOT1RFOiB0aGlzIGlzIGlkZW1wb3RlbnQuLlxuICAgIGlmICh0aGlzLmhlaWdodCA9PT0gMSkge1xuICAgICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgICBpZiAoIWVudHJhbmNlLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZW50cmFuY2UueSA+IDB4YmYpIGVudHJhbmNlLnkgPSAweGJmO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgICAgaWYgKGV4aXQueXQgPiAweDBjKSBleGl0Lnl0ID0gMHgwYztcbiAgICAgIH1cbiAgICB9XG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9FbnRyYW5jZXNgKTtcbiAgICBjb25zdCAkZW50cmFuY2VzID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi5jb25jYXRJdGVyYWJsZXModGhpcy5lbnRyYW5jZXMpKTtcbiAgICBtYXBEYXRhLnB1c2goJGVudHJhbmNlcyk7XG5cbiAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9X0V4aXRzYCk7XG4gICAgY29uc3QgJGV4aXRzID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi5jb25jYXRJdGVyYWJsZXModGhpcy5leGl0cyksXG4gICAgICAgICAgIDB4ODAgfCAodGhpcy5waXRzLmxlbmd0aCA/IDB4NDAgOiAwKSB8IHRoaXMuZW50cmFuY2VzLmxlbmd0aCk7XG4gICAgbWFwRGF0YS5wdXNoKCRleGl0cyk7XG5cbiAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9X0ZsYWdzYCk7XG4gICAgY29uc3QgJGZsYWdzID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi5jb25jYXRJdGVyYWJsZXModGhpcy5mbGFncyksIDB4ZmYpO1xuICAgIG1hcERhdGEucHVzaCgkZmxhZ3MpO1xuXG4gICAgY29uc3QgcGl0cyA9IGNvbmNhdEl0ZXJhYmxlcyh0aGlzLnBpdHMpO1xuICAgIGlmIChwaXRzLmxlbmd0aCkge1xuICAgICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9QaXRzYCk7XG4gICAgICBjb25zdCAkcGl0cyA9IGEucGMoKTtcbiAgICAgIGEuYnl0ZSguLi5waXRzKTtcbiAgICAgIG1hcERhdGEucHVzaCgkcGl0cyk7XG4gICAgfVxuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfWApO1xuICAgIGNvbnN0ICRtYXBEYXRhID0gYS5wYygpO1xuICAgIGEud29yZCguLi5tYXBEYXRhKTtcblxuICAgIGEub3JnKDB4ODMwMCArICh0aGlzLmlkIDw8IDEpLCBgTWFwRGF0YV8ke2lkfV9QdHJgKTtcbiAgICBhLndvcmQoJG1hcERhdGEpO1xuXG4gICAgLy8gSWYgdGhpcyBpcyBhIGJvc3Mgcm9vbSwgd3JpdGUgdGhlIHJlc3RvcmF0aW9uLlxuICAgIGNvbnN0IGJvc3NJZCA9IHRoaXMuYm9zc0lkKCk7XG4gICAgaWYgKGJvc3NJZCAhPSBudWxsICYmIHRoaXMuaWQgIT09IDB4NWYpIHsgLy8gZG9uJ3QgcmVzdG9yZSBkeW5hXG4gICAgICAvLyBUaGlzIHRhYmxlIHNob3VsZCByZXN0b3JlIHBhdDAgYnV0IG5vdCBwYXQxXG4gICAgICBsZXQgcGF0cyA9IFtzcHJpdGVQYXRbMF0sIHVuZGVmaW5lZF07XG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHhhNikgcGF0cyA9IFsweDUzLCAweDUwXTsgLy8gZHJheWdvbiAyXG4gICAgICBjb25zdCBib3NzQmFzZSA9IHRoaXMucm9tLmJvc3NLaWxsc1tib3NzSWRdLmJhc2U7XG4gICAgICAvLyBTZXQgdGhlIFwicmVzdG9yZSBtdXNpY1wiIGJ5dGUgZm9yIHRoZSBib3NzLCBidXQgaWYgaXQncyBEcmF5Z29uIDIsIHNldFxuICAgICAgLy8gaXQgdG8gemVybyBzaW5jZSBubyBtdXNpYyBpcyBhY3R1YWxseSBwbGF5aW5nLCBhbmQgaWYgdGhlIG11c2ljIGluIHRoZVxuICAgICAgLy8gdGVsZXBvcnRlciByb29tIGhhcHBlbnMgdG8gYmUgdGhlIHNhbWUgYXMgdGhlIG11c2ljIGluIHRoZSBjcnlwdCwgdGhlblxuICAgICAgLy8gcmVzZXR0aW5nIHRvIHRoYXQgbWVhbnMgaXQgd2lsbCBqdXN0IHJlbWFpbiBzaWxlbnQsIGFuZCBub3QgcmVzdGFydC5cbiAgICAgIGNvbnN0IHJlc3RvcmVCZ20gPSB0aGlzLmlkID09PSAweGE2ID8gMCA6IHRoaXMuYmdtO1xuICAgICAgY29uc3QgYm9zc1Jlc3RvcmUgPSBbXG4gICAgICAgICwsLCByZXN0b3JlQmdtLCxcbiAgICAgICAgLi4udGhpcy50aWxlUGFsZXR0ZXMsLCwsIHRoaXMuc3ByaXRlUGFsZXR0ZXNbMF0sLFxuICAgICAgICAsLCwsIC8qcGF0c1swXSovLCAvKnBhdHNbMV0qLyxcbiAgICAgICAgdGhpcy5hbmltYXRpb24sXG4gICAgICBdO1xuICAgICAgY29uc3QgW10gPSBbcGF0c107IC8vIGF2b2lkIGVycm9yXG5cbiAgICAgIC8vIGlmIChyZWFkTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIGJvc3NCYXNlKSA9PT0gMHhiYTk4KSB7XG4gICAgICAvLyAgIC8vIGVzY2FwZSBhbmltYXRpb246IGRvbid0IGNsb2JiZXIgcGF0dGVybnMgeWV0P1xuICAgICAgLy8gfVxuICAgICAgYS5zZWdtZW50KCcwZicpO1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBib3NzUmVzdG9yZS5sZW5ndGg7IGorKykge1xuICAgICAgICBjb25zdCByZXN0b3JlZCA9IGJvc3NSZXN0b3JlW2pdO1xuICAgICAgICBpZiAocmVzdG9yZWQgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGEub3JnKGJvc3NCYXNlICsgaiwgYEJvc3NfJHtib3NzSWR9XyR7an1gKTtcbiAgICAgICAgYS5ieXRlKHJlc3RvcmVkKTtcbiAgICAgIH1cbiAgICAgIC8vIGxhdGVyIHNwb3QgZm9yIHBhbDMgYW5kIHBhdDEgKmFmdGVyKiBleHBsb3Npb25cbiAgICAgIGNvbnN0IGJvc3NCYXNlMiA9IDB4YjdjMSArIDUgKiBib3NzSWQ7IC8vIDFmN2MxXG4gICAgICBhLm9yZyhib3NzQmFzZTIsIGBCb3NzXyR7Ym9zc0lkfV9Qb3N0YCk7XG4gICAgICBhLmJ5dGUoc3ByaXRlUGFsWzFdKTtcbiAgICAgIC8vIE5PVEU6IFRoaXMgcnVpbnMgdGhlIHRyZWFzdXJlIGNoZXN0LlxuICAgICAgLy8gVE9ETyAtIGFkZCBzb21lIGFzbSBhZnRlciBhIGNoZXN0IGlzIGNsZWFyZWQgdG8gcmVsb2FkIHBhdHRlcm5zP1xuICAgICAgLy8gQW5vdGhlciBvcHRpb24gd291bGQgYmUgdG8gYWRkIGEgbG9jYXRpb24tc3BlY2lmaWMgY29udHJhaW50IHRvIGJlXG4gICAgICAvLyB3aGF0ZXZlciB0aGUgYm9zcyBcbiAgICAgIC8vd3JpdGVyLnJvbVtib3NzQmFzZTIgKyAxXSA9IHRoaXMuc3ByaXRlUGF0dGVybnNbMV07XG4gICAgfVxuICB9XG5cbiAgYWxsU2NyZWVucygpOiBTZXQ8U2NyZWVuPiB7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBTZXQ8U2NyZWVuPigpO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHRoaXMuc2NyZWVucykge1xuICAgICAgZm9yIChjb25zdCBzY3JlZW4gb2Ygcm93KSB7XG4gICAgICAgIHNjcmVlbnMuYWRkKHRoaXMucm9tLnNjcmVlbnNbc2NyZWVuXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzY3JlZW5zO1xuICB9XG5cbiAgYm9zc0lkKCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDBlOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLnJvbS5wcmdbMHgxZjk1ZCArIGldID09PSB0aGlzLmlkKSByZXR1cm4gaTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIG5laWdoYm9ycyhqb2luTmV4dXNlczogYm9vbGVhbiA9IGZhbHNlKTogU2V0PExvY2F0aW9uPiB7XG4gIC8vICAgY29uc3Qgb3V0ID0gbmV3IFNldDxMb2NhdGlvbj4oKTtcbiAgLy8gICBjb25zdCBhZGROZWlnaGJvcnMgPSAobDogTG9jYXRpb24pID0+IHtcbiAgLy8gICAgIGZvciAoY29uc3QgZXhpdCBvZiBsLmV4aXRzKSB7XG4gIC8vICAgICAgIGNvbnN0IGlkID0gZXhpdC5kZXN0O1xuICAvLyAgICAgICBjb25zdCBuZWlnaGJvciA9IHRoaXMucm9tLmxvY2F0aW9uc1tpZF07XG4gIC8vICAgICAgIGlmIChuZWlnaGJvciAmJiBuZWlnaGJvci51c2VkICYmXG4gIC8vICAgICAgICAgICBuZWlnaGJvciAhPT0gdGhpcyAmJiAhb3V0LmhhcyhuZWlnaGJvcikpIHtcbiAgLy8gICAgICAgICBvdXQuYWRkKG5laWdoYm9yKTtcbiAgLy8gICAgICAgICBpZiAoam9pbk5leHVzZXMgJiYgTkVYVVNFU1tuZWlnaGJvci5rZXldKSB7XG4gIC8vICAgICAgICAgICBhZGROZWlnaGJvcnMobmVpZ2hib3IpO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICBhZGROZWlnaGJvcnModGhpcyk7XG4gIC8vICAgcmV0dXJuIG91dDtcbiAgLy8gfVxuXG4gIGhhc0RvbHBoaW4oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaWQgPT09IDB4NjAgfHwgdGhpcy5pZCA9PT0gMHg2NCB8fCB0aGlzLmlkID09PSAweDY4O1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm4gTWFwIG9mIHRpbGVzICgkWVh5eCkgcmVhY2hhYmxlIGZyb20gYW55IGVudHJhbmNlIHRvXG4gICAqIHVuZmxhZ2dlZCB0aWxlZWZmZWN0cy5cbiAgICovXG4gIHJlYWNoYWJsZVRpbGVzKGZseSA9IGZhbHNlKTogTWFwPG51bWJlciwgbnVtYmVyPiB7XG4gICAgLy8gVE9ETyAtIGFyZ3MgZm9yICgxKSB1c2Ugbm9uLTJlZiBmbGFncywgKDIpIG9ubHkgZnJvbSBnaXZlbiBlbnRyYW5jZS90aWxlXG4gICAgLy8gRG9scGhpbiBtYWtlcyBOT19XQUxLIG9rYXkgZm9yIHNvbWUgbGV2ZWxzLlxuICAgIGlmICh0aGlzLmhhc0RvbHBoaW4oKSkgZmx5ID0gdHJ1ZTtcbiAgICAvLyBUYWtlIGludG8gYWNjb3VudCB0aGUgdGlsZXNldCBhbmQgZmxhZ3MgYnV0IG5vdCBhbnkgb3ZlcmxheS5cbiAgICBjb25zdCBleGl0cyA9IG5ldyBTZXQodGhpcy5leGl0cy5tYXAoZXhpdCA9PiBleGl0LnNjcmVlbiA8PCA4IHwgZXhpdC50aWxlKSk7XG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPG51bWJlcj4oKTtcbiAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5yb20udGlsZXNldHNbdGhpcy50aWxlc2V0XTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW3RoaXMudGlsZUVmZmVjdHMgLSAweGIzXTtcbiAgICBjb25zdCBwYXNzYWJsZSA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIFxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gdGhpcy5zY3JlZW5zW3ldO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLndpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tyb3dbeF1dO1xuICAgICAgICBjb25zdCBwb3MgPSB5IDw8IDQgfCB4O1xuICAgICAgICBjb25zdCBmbGFnID0gdGhpcy5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IHBvcyk7XG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICAgICAgY29uc3QgdGlsZUlkID0gcG9zIDw8IDggfCB0O1xuICAgICAgICAgIGlmIChleGl0cy5oYXModGlsZUlkKSkgY29udGludWU7IC8vIGRvbid0IGdvIHBhc3QgZXhpdHNcbiAgICAgICAgICBsZXQgdGlsZSA9IHNjcmVlbi50aWxlc1t0XTtcbiAgICAgICAgICAvLyBmbGFnIDJlZiBpcyBcImFsd2F5cyBvblwiLCBkb24ndCBldmVuIGJvdGhlciBtYWtpbmcgaXQgY29uZGl0aW9uYWwuXG4gICAgICAgICAgbGV0IGVmZmVjdHMgPSB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgIGxldCBibG9ja2VkID0gZmx5ID8gZWZmZWN0cyAmIDB4MDQgOiBlZmZlY3RzICYgMHgwNjtcbiAgICAgICAgICBpZiAoZmxhZyAmJiBibG9ja2VkICYmIHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPSB0aWxlKSB7XG4gICAgICAgICAgICB0aWxlID0gdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdO1xuICAgICAgICAgICAgZWZmZWN0cyA9IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgICBibG9ja2VkID0gZmx5ID8gZWZmZWN0cyAmIDB4MDQgOiBlZmZlY3RzICYgMHgwNjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFibG9ja2VkKSBwYXNzYWJsZS5hZGQodGlsZUlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAobGV0IHQgb2YgcGFzc2FibGUpIHtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gKHQgJiAweDBmKSA9PT0gMHgwZiA/IHQgKyAweGYxIDogdCArIDE7XG4gICAgICBpZiAocGFzc2FibGUuaGFzKHJpZ2h0KSkgdWYudW5pb24oW3QsIHJpZ2h0XSk7XG4gICAgICBjb25zdCBiZWxvdyA9ICh0ICYgMHhmMCkgPT09IDB4ZTAgPyB0ICsgMHhmMjAgOiB0ICsgMTY7XG4gICAgICBpZiAocGFzc2FibGUuaGFzKGJlbG93KSkgdWYudW5pb24oW3QsIGJlbG93XSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gdWYubWFwKCk7XG4gICAgY29uc3Qgc2V0cyA9IG5ldyBTZXQ8U2V0PG51bWJlcj4+KCk7XG4gICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgaWYgKCFlbnRyYW5jZS51c2VkKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlkID0gZW50cmFuY2Uuc2NyZWVuIDw8IDggfCBlbnRyYW5jZS50aWxlO1xuICAgICAgLy8gTk9URTogbWFwIHNob3VsZCBhbHdheXMgaGF2ZSBpZCwgYnV0IGJvZ3VzIGVudHJhbmNlc1xuICAgICAgLy8gKGUuZy4gR29hIFZhbGxleSBlbnRyYW5jZSAyKSBjYW4gY2F1c2UgcHJvYmxlbXMuXG4gICAgICBzZXRzLmFkZChtYXAuZ2V0KGlkKSB8fCBuZXcgU2V0KCkpO1xuICAgIH1cblxuICAgIGNvbnN0IG91dCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBzZXQgb2Ygc2V0cykge1xuICAgICAgZm9yIChjb25zdCB0IG9mIHNldCkge1xuICAgICAgICBjb25zdCBzY3IgPSB0aGlzLnNjcmVlbnNbdCA+Pj4gMTJdWyh0ID4+PiA4KSAmIDB4MGZdO1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Njcl07XG4gICAgICAgIG91dC5zZXQodCwgdGlsZUVmZmVjdHMuZWZmZWN0c1tzY3JlZW4udGlsZXNbdCAmIDB4ZmZdXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICAvKiogU2FmZXIgdmVyc2lvbiBvZiB0aGUgYmVsb3c/ICovXG4gIHNjcmVlbk1vdmVyKCk6IChvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcikgPT4gdm9pZCB7XG4gICAgY29uc3QgbWFwID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBBcnJheTx7c2NyZWVuOiBudW1iZXJ9Pj4oKCkgPT4gW10pO1xuICAgIGNvbnN0IG9ianMgPVxuICAgICAgICBpdGVycy5jb25jYXQ8e3NjcmVlbjogbnVtYmVyfT4odGhpcy5zcGF3bnMsIHRoaXMuZXhpdHMsIHRoaXMuZW50cmFuY2VzKTtcbiAgICBmb3IgKGNvbnN0IG9iaiBvZiBvYmpzKSB7XG4gICAgICBtYXAuZ2V0KG9iai5zY3JlZW4pLnB1c2gob2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIChvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcikgPT4ge1xuICAgICAgZm9yIChjb25zdCBvYmogb2YgbWFwLmdldChvcmlnKSkge1xuICAgICAgICBvYmouc2NyZWVuID0gcmVwbDtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIGFsbCBzcGF3bnMsIGVudHJhbmNlcywgYW5kIGV4aXRzLlxuICAgKiBAcGFyYW0gb3JpZyBZWCBvZiB0aGUgb3JpZ2luYWwgc2NyZWVuLlxuICAgKiBAcGFyYW0gcmVwbCBZWCBvZiB0aGUgZXF1aXZhbGVudCByZXBsYWNlbWVudCBzY3JlZW4uXG4gICAqL1xuICBtb3ZlU2NyZWVuKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc3Qgb2JqcyA9XG4gICAgICAgIGl0ZXJzLmNvbmNhdDx7c2NyZWVuOiBudW1iZXJ9Pih0aGlzLnNwYXducywgdGhpcy5leGl0cywgdGhpcy5lbnRyYW5jZXMpO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIG9ianMpIHtcbiAgICAgIGlmIChvYmouc2NyZWVuID09PSBvcmlnKSBvYmouc2NyZWVuID0gcmVwbDtcbiAgICB9XG4gIH1cblxuICAvLyBUT0RPIC0gZmFjdG9yIHRoaXMgb3V0IGludG8gYSBzZXBhcmF0ZSBjbGFzcz9cbiAgLy8gICAtIGhvbGRzIG1ldGFkYXRhIGFib3V0IG1hcCB0aWxlcyBpbiBnZW5lcmFsP1xuICAvLyAgIC0gbmVlZCB0byBmaWd1cmUgb3V0IHdoYXQgdG8gZG8gd2l0aCBwaXRzLi4uXG4gIG1vbnN0ZXJQbGFjZXIocmFuZG9tOiBSYW5kb20pOiAobTogTW9uc3RlcikgPT4gbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAvLyBJZiB0aGVyZSdzIGEgYm9zcyBzY3JlZW4sIGV4Y2x1ZGUgaXQgZnJvbSBnZXR0aW5nIGVuZW1pZXMuXG4gICAgY29uc3QgYm9zcyA9IHRoaXMuZGF0YS5ib3NzU2NyZWVuO1xuICAgIC8vIFN0YXJ0IHdpdGggbGlzdCBvZiByZWFjaGFibGUgdGlsZXMuXG4gICAgY29uc3QgcmVhY2hhYmxlID0gdGhpcy5yZWFjaGFibGVUaWxlcyhmYWxzZSk7XG4gICAgLy8gRG8gYSBicmVhZHRoLWZpcnN0IHNlYXJjaCBvZiBhbGwgdGlsZXMgdG8gZmluZCBcImRpc3RhbmNlXCIgKDEtbm9ybSkuXG4gICAgY29uc3QgZmFyID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oWy4uLnJlYWNoYWJsZS5rZXlzKCldLm1hcCh4ID0+IFt4LCAwXSkpO1xuICAgIGNvbnN0IG5vcm1hbDogbnVtYmVyW10gPSBbXTsgLy8gcmVhY2hhYmxlLCBub3Qgc2xvcGUgb3Igd2F0ZXJcbiAgICBjb25zdCBtb3RoczogbnVtYmVyW10gPSBbXTsgIC8vIGRpc3RhbmNlIOKIiCAzLi43XG4gICAgY29uc3QgYmlyZHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSA+IDEyXG4gICAgY29uc3QgcGxhbnRzOiBudW1iZXJbXSA9IFtdOyAvLyBkaXN0YW5jZSDiiIggMi4uNFxuICAgIGNvbnN0IHBsYWNlZDogQXJyYXk8W01vbnN0ZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGNvbnN0IG5vcm1hbFRlcnJhaW5NYXNrID0gdGhpcy5oYXNEb2xwaGluKCkgPyAweDI1IDogMHgyNztcbiAgICBmb3IgKGNvbnN0IFt0LCBkaXN0YW5jZV0gb2YgZmFyKSB7XG4gICAgICBjb25zdCBzY3IgPSB0aGlzLnNjcmVlbnNbdCA+Pj4gMTJdWyh0ID4+PiA4KSAmIDB4Zl07XG4gICAgICBpZiAoc2NyID09PSBib3NzKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgbiBvZiBuZWlnaGJvcnModCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpKSB7XG4gICAgICAgIGlmIChmYXIuaGFzKG4pKSBjb250aW51ZTtcbiAgICAgICAgZmFyLnNldChuLCBkaXN0YW5jZSArIDEpO1xuICAgICAgfVxuICAgICAgaWYgKCFkaXN0YW5jZSAmJiAhKHJlYWNoYWJsZS5nZXQodCkhICYgbm9ybWFsVGVycmFpbk1hc2spKSBub3JtYWwucHVzaCh0KTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweDFhKSB7XG4gICAgICAgIC8vIFNwZWNpYWwtY2FzZSB0aGUgc3dhbXAgZm9yIHBsYW50IHBsYWNlbWVudFxuICAgICAgICBpZiAodGhpcy5yb20uc2NyZWVuc1tzY3JdLnRpbGVzW3QgJiAweGZmXSA9PT0gMHhmMCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZGlzdGFuY2UgPj0gMiAmJiBkaXN0YW5jZSA8PSA0KSBwbGFudHMucHVzaCh0KTtcbiAgICAgIH1cbiAgICAgIGlmIChkaXN0YW5jZSA+PSAzICYmIGRpc3RhbmNlIDw9IDcpIG1vdGhzLnB1c2godCk7XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMTIpIGJpcmRzLnB1c2godCk7XG4gICAgICAvLyBUT0RPIC0gc3BlY2lhbC1jYXNlIHN3YW1wIGZvciBwbGFudCBsb2NhdGlvbnM/XG4gICAgfVxuICAgIC8vIFdlIG5vdyBrbm93IGFsbCB0aGUgcG9zc2libGUgcGxhY2VzIHRvIHBsYWNlIHRoaW5ncy5cbiAgICAvLyAgLSBOT1RFOiBzdGlsbCBuZWVkIHRvIG1vdmUgY2hlc3RzIHRvIGRlYWQgZW5kcywgZXRjP1xuICAgIHJldHVybiAobTogTW9uc3RlcikgPT4ge1xuICAgICAgLy8gY2hlY2sgZm9yIHBsYWNlbWVudC5cbiAgICAgIGNvbnN0IHBsYWNlbWVudCA9IG0ucGxhY2VtZW50KCk7XG4gICAgICBjb25zdCBwb29sID0gWy4uLihwbGFjZW1lbnQgPT09ICdub3JtYWwnID8gbm9ybWFsIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ21vdGgnID8gbW90aHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnYmlyZCcgPyBiaXJkcyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdwbGFudCcgPyBwbGFudHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0TmV2ZXIocGxhY2VtZW50KSldXG4gICAgICBQT09MOlxuICAgICAgd2hpbGUgKHBvb2wubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGkgPSByYW5kb20ubmV4dEludChwb29sLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IFtwb3NdID0gcG9vbC5zcGxpY2UoaSwgMSk7XG5cbiAgICAgICAgY29uc3QgeCA9IChwb3MgJiAweGYwMCkgPj4+IDQgfCAocG9zICYgMHhmKTtcbiAgICAgICAgY29uc3QgeSA9IChwb3MgJiAweGYwMDApID4+PiA4IHwgKHBvcyAmIDB4ZjApID4+PiA0O1xuICAgICAgICBjb25zdCByID0gbS5jbGVhcmFuY2UoKTtcblxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gb3RoZXIgZW5lbWllcy5cbiAgICAgICAgZm9yIChjb25zdCBbLCB4MSwgeTEsIHIxXSBvZiBwbGFjZWQpIHtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtIHkxKSAqKiAyICsgKHggLSB4MSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyByMSkgKiogMikgY29udGludWUgUE9PTDtcbiAgICAgICAgfVxuICAgICAgICAvLyB0ZXN0IGRpc3RhbmNlIGZyb20gZW50cmFuY2VzLlxuICAgICAgICBmb3IgKGNvbnN0IHt4OiB4MSwgeTogeTEsIHVzZWR9IG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICAgICAgaWYgKCF1c2VkKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCB6MiA9ICgoeSAtICh5MSA+PiA0KSkgKiogMiArICh4IC0gKHgxID4+IDQpKSAqKiAyKTtcbiAgICAgICAgICBpZiAoejIgPCAociArIDEpICoqIDIpIGNvbnRpbnVlIFBPT0w7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZCBzcG90IChzdGlsbCwgaG93IHRvYSBhcHByb3hpbWF0ZWx5ICptYXhpbWl6ZSogZGlzdGFuY2VzPylcbiAgICAgICAgcGxhY2VkLnB1c2goW20sIHgsIHksIHJdKTtcbiAgICAgICAgY29uc3Qgc2NyID0gKHkgJiAweGYwKSB8ICh4ICYgMHhmMCkgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHRpbGUgPSAoeSAmIDB4MGYpIDw8IDQgfCAoeCAmIDB4MGYpO1xuICAgICAgICByZXR1cm4gc2NyIDw8IDggfCB0aWxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbiAgLy8gVE9ETyAtIGFsbG93IGxlc3MgcmFuZG9tbmVzcyBmb3IgY2VydGFpbiBjYXNlcywgZS5nLiB0b3Agb2Ygbm9ydGggc2FicmUgb3JcbiAgLy8gYXBwcm9wcmlhdGUgc2lkZSBvZiBjb3JkZWwuXG5cbiAgLyoqIEByZXR1cm4geyFTZXQ8bnVtYmVyPn0gKi9cbiAgLy8gYWxsVGlsZXMoKSB7XG4gIC8vICAgY29uc3QgdGlsZXMgPSBuZXcgU2V0KCk7XG4gIC8vICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5zY3JlZW5zKSB7XG4gIC8vICAgICBmb3IgKGNvbnN0IHRpbGUgb2Ygc2NyZWVuLmFsbFRpbGVzKCkpIHtcbiAgLy8gICAgICAgdGlsZXMuYWRkKHRpbGUpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gdGlsZXM7XG4gIC8vIH1cblxuXG4gIC8vIFRPRE8gLSB1c2UgbWV0YXNjcmVlbiBmb3IgdGhpcyBsYXRlclxuICByZXNpemVTY3JlZW5zKHRvcDogbnVtYmVyLCBsZWZ0OiBudW1iZXIsIGJvdHRvbTogbnVtYmVyLCByaWdodDogbnVtYmVyLFxuICAgICAgICAgICAgICAgIGZpbGwgPSAwKSB7XG4gICAgY29uc3QgbmV3V2lkdGggPSB0aGlzLndpZHRoICsgbGVmdCArIHJpZ2h0O1xuICAgIGNvbnN0IG5ld0hlaWdodCA9IHRoaXMuaGVpZ2h0ICsgdG9wICsgYm90dG9tO1xuICAgIGNvbnN0IG5ld1NjcmVlbnMgPSBBcnJheS5mcm9tKHtsZW5ndGg6IG5ld0hlaWdodH0sIChfLCB5KSA9PiB7XG4gICAgICB5IC09IHRvcDtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKHtsZW5ndGg6IG5ld1dpZHRofSwgKF8sIHgpID0+IHtcbiAgICAgICAgeCAtPSBsZWZ0O1xuICAgICAgICBpZiAoeSA8IDAgfHwgeCA8IDAgfHwgeSA+PSB0aGlzLmhlaWdodCB8fCB4ID49IHRoaXMud2lkdGgpIHJldHVybiBmaWxsO1xuICAgICAgICByZXR1cm4gdGhpcy5zY3JlZW5zW3ldW3hdO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy53aWR0aCA9IG5ld1dpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gbmV3SGVpZ2h0O1xuICAgIHRoaXMuc2NyZWVucyA9IG5ld1NjcmVlbnM7XG4gICAgLy8gVE9ETyAtIGlmIGFueSBvZiB0aGVzZSBnbyBuZWdhdGl2ZSwgd2UncmUgaW4gdHJvdWJsZS4uLlxuICAgIC8vIFByb2JhYmx5IHRoZSBiZXN0IGJldCB3b3VsZCBiZSB0byBwdXQgYSBjaGVjayBpbiB0aGUgc2V0dGVyP1xuICAgIGZvciAoY29uc3QgZiBvZiB0aGlzLmZsYWdzKSB7XG4gICAgICBmLnhzICs9IGxlZnQ7XG4gICAgICBmLnlzICs9IHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwIG9mIHRoaXMucGl0cykge1xuICAgICAgcC5mcm9tWHMgKz0gbGVmdDtcbiAgICAgIHAuZnJvbVlzICs9IHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzIG9mIFsuLi50aGlzLnNwYXducywgLi4udGhpcy5leGl0c10pIHtcbiAgICAgIHMueHQgKz0gMTYgKiBsZWZ0O1xuICAgICAgcy55dCArPSAxNiAqIHRvcDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICBpZiAoIWUudXNlZCkgY29udGludWU7XG4gICAgICBlLnggKz0gMjU2ICogbGVmdDtcbiAgICAgIGUueSArPSAyNTYgKiB0b3A7XG4gICAgfVxuICB9XG5cbiAgLyoqIE5PVEU6IGlmIGEgc2NyZWVuIGlzIG5lZ2F0aXZlLCBzZXRzIHRoZSBBbHdheXNUcnVlIGZsYWcuICovXG4gIHdyaXRlU2NyZWVuczJkKHN0YXJ0OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgIGRhdGE6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxudW1iZXIgfCBudWxsPj4pIHtcbiAgICBjb25zdCB4MCA9IHN0YXJ0ICYgMHhmO1xuICAgIGNvbnN0IHkwID0gc3RhcnQgPj4+IDQ7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBkYXRhLmxlbmd0aDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBkYXRhW3ldO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCByb3cubGVuZ3RoOyB4KyspIHtcbiAgICAgICAgbGV0IHRpbGUgPSByb3dbeF07XG4gICAgICAgIGlmICh0aWxlID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodGlsZSA8IDApIHtcbiAgICAgICAgICB0aWxlID0gfnRpbGU7XG4gICAgICAgICAgdGhpcy5mbGFncy5wdXNoKEZsYWcub2Yoe3NjcmVlbjogKHkwICsgeSkgPDwgNCB8ICh4MCArIHgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnOiB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkfSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2NyZWVuc1t5MCArIHldW3gwICsgeF0gPSB0aWxlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENvbm5lY3QgdHdvIHNjcmVlbnMgdmlhIGVudHJhbmNlcy5cbiAgLy8gQXNzdW1lcyBleGl0cyBhbmQgZW50cmFuY2VzIGFyZSBjb21wbGV0ZWx5IGFic2VudC5cbiAgLy8gU2NyZWVuIElEcyBtdXN0IGJlIGluIHNjcmVlbkV4aXRzLlxuICAvLyBTVVBFUiBIQUNLWSAtIGlmIHBvcyBpcyBuZWdhdGl2ZSwgdXNlIGNvbXBsZW1lbnQgYW5kIGFsdGVybmF0ZSBzdGFpcnMuXG4gIGNvbm5lY3QocG9zOiBudW1iZXIsIHRoYXQ6IExvY2F0aW9uLCB0aGF0UG9zOiBudW1iZXIpIHtcbiAgICBjb25zdCB0aGlzQWx0ID0gcG9zIDwgMCA/IDB4MTAwIDogMDtcbiAgICBjb25zdCB0aGF0QWx0ID0gdGhhdFBvcyA8IDAgPyAweDEwMCA6IDA7XG4gICAgcG9zID0gcG9zIDwgMCA/IH5wb3MgOiBwb3M7XG4gICAgdGhhdFBvcyA9IHRoYXRQb3MgPCAwID8gfnRoYXRQb3MgOiB0aGF0UG9zO1xuICAgIGNvbnN0IHRoaXNZID0gcG9zID4+PiA0O1xuICAgIGNvbnN0IHRoaXNYID0gcG9zICYgMHhmO1xuICAgIGNvbnN0IHRoYXRZID0gdGhhdFBvcyA+Pj4gNDtcbiAgICBjb25zdCB0aGF0WCA9IHRoYXRQb3MgJiAweGY7XG4gICAgY29uc3QgdGhpc1RpbGUgPSB0aGlzLnNjcmVlbnNbdGhpc1ldW3RoaXNYXTtcbiAgICBjb25zdCB0aGF0VGlsZSA9IHRoYXQuc2NyZWVuc1t0aGF0WV1bdGhhdFhdO1xuICAgIGNvbnN0IFt0aGlzRW50cmFuY2UsIHRoaXNFeGl0c10gPSBzY3JlZW5FeGl0c1t0aGlzQWx0IHwgdGhpc1RpbGVdO1xuICAgIGNvbnN0IFt0aGF0RW50cmFuY2UsIHRoYXRFeGl0c10gPSBzY3JlZW5FeGl0c1t0aGF0QWx0IHwgdGhhdFRpbGVdO1xuICAgIGNvbnN0IHRoaXNFbnRyYW5jZUluZGV4ID0gdGhpcy5lbnRyYW5jZXMubGVuZ3RoO1xuICAgIGNvbnN0IHRoYXRFbnRyYW5jZUluZGV4ID0gdGhhdC5lbnRyYW5jZXMubGVuZ3RoO1xuICAgIHRoaXMuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3k6IHRoaXNZIDw8IDggfCB0aGlzRW50cmFuY2UgPj4+IDgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogdGhpc1ggPDwgOCB8IHRoaXNFbnRyYW5jZSAmIDB4ZmZ9KSk7XG4gICAgdGhhdC5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eTogdGhhdFkgPDwgOCB8IHRoYXRFbnRyYW5jZSA+Pj4gOCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB0aGF0WCA8PCA4IHwgdGhhdEVudHJhbmNlICYgMHhmZn0pKTtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpc0V4aXRzKSB7XG4gICAgICB0aGlzLmV4aXRzLnB1c2goRXhpdC5vZih7c2NyZWVuOiBwb3MsIHRpbGU6IGV4aXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdDogdGhhdC5pZCwgZW50cmFuY2U6IHRoYXRFbnRyYW5jZUluZGV4fSkpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhhdEV4aXRzKSB7XG4gICAgICB0aGF0LmV4aXRzLnB1c2goRXhpdC5vZih7c2NyZWVuOiB0aGF0UG9zLCB0aWxlOiBleGl0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3Q6IHRoaXMuaWQsIGVudHJhbmNlOiB0aGlzRW50cmFuY2VJbmRleH0pKTtcbiAgICB9XG4gIH1cblxuICBuZWlnaGJvckZvckVudHJhbmNlKGVudHJhbmNlSWQ6IG51bWJlcik6IExvY2F0aW9uIHtcbiAgICBjb25zdCBlbnRyYW5jZSA9IHRoaXMuZW50cmFuY2VzW2VudHJhbmNlSWRdO1xuICAgIGlmICghZW50cmFuY2UpIHRocm93IG5ldyBFcnJvcihgbm8gZW50cmFuY2UgJHtoZXgodGhpcy5pZCl9OiR7ZW50cmFuY2VJZH1gKTtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0cykge1xuICAgICAgaWYgKGV4aXQuc2NyZWVuICE9PSBlbnRyYW5jZS5zY3JlZW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZHggPSBNYXRoLmFicyhleGl0LnggLSBlbnRyYW5jZS54KTtcbiAgICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZXhpdC55IC0gZW50cmFuY2UueSk7XG4gICAgICBpZiAoZHggPCAyNCAmJiBkeSA8IDI0KSByZXR1cm4gdGhpcy5yb20ubG9jYXRpb25zW2V4aXQuZGVzdF07XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgbm8gZXhpdCBmb3VuZCBuZWFyICR7aGV4KHRoaXMuaWQpfToke2VudHJhbmNlSWR9YCk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gYCR7c3VwZXIudG9TdHJpbmcoKX0gJHt0aGlzLm5hbWV9YDtcbiAgfVxufVxuXG4vLyBUT0RPIC0gbW92ZSB0byBhIGJldHRlci1vcmdhbml6ZWQgZGVkaWNhdGVkIFwiZ2VvbWV0cnlcIiBtb2R1bGU/XG5mdW5jdGlvbiBuZWlnaGJvcnModGlsZTogbnVtYmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IG51bWJlcltdIHtcbiAgY29uc3Qgb3V0ID0gW107XG4gIGNvbnN0IHkgPSB0aWxlICYgMHhmMGYwO1xuICBjb25zdCB4ID0gdGlsZSAmIDB4MGYwZjtcbiAgaWYgKHkgPCAoKGhlaWdodCAtIDEpIDw8IDEyIHwgMHhlMCkpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4ZjApID09PSAweGUwID8gdGlsZSArIDB4MGYyMCA6IHRpbGUgKyAxNik7XG4gIH1cbiAgaWYgKHkpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4ZjApID09PSAweDAwID8gdGlsZSAtIDB4MGYyMCA6IHRpbGUgLSAxNik7XG4gIH1cbiAgaWYgKHggPCAoKHdpZHRoIC0gMSkgPDwgOCB8IDB4MGYpKSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweDBmKSA9PT0gMHgwZiA/IHRpbGUgKyAweDAwZjEgOiB0aWxlICsgMSk7XG4gIH1cbiAgaWYgKHgpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDAwID8gdGlsZSAtIDB4MDBmMSA6IHRpbGUgLSAxKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG4vLyB2ZXJ5IHNpbXBsZSB2ZXJzaW9uIG9mIHdoYXQgd2UncmUgZG9pbmcgd2l0aCBtZXRhc2NyZWVuc1xuY29uc3Qgc2NyZWVuRXhpdHM6IHtbaWQ6IG51bWJlcl06IHJlYWRvbmx5IFtudW1iZXIsIHJlYWRvbmx5IFtudW1iZXIsIG51bWJlcl1dfSA9IHtcbiAgMHgxNTogWzB4OTBfYTAsIFsweDg5LCAweDhhXV0sIC8vIGNhdmUgb24gbGVmdCBib3VuZGFyeVxuICAweDE5OiBbMHg2MF85MCwgWzB4NTgsIDB4NTldXSwgLy8gY2F2ZSBvbiByaWdodCBib3VuZGFyeSAobm90IG9uIGdyYXNzKVxuICAweDk2OiBbMHg0MF8zMCwgWzB4MzIsIDB4MzNdXSwgLy8gdXAgc3RhaXIgZnJvbSBsZWZ0XG4gIDB4OTc6IFsweGFmXzMwLCBbMHhiMiwgMHhiM11dLCAvLyBkb3duIHN0YWlyIGZyb20gbGVmdFxuICAweDk4OiBbMHg0MF9kMCwgWzB4M2MsIDB4M2RdXSwgLy8gdXAgc3RhaXIgZnJvbSByaWdodFxuICAweDk5OiBbMHhhZl9kMCwgWzB4YmMsIDB4YmRdXSwgLy8gZG93biBzdGFpciBmcm9tIHJpZ2h0XG4gIDB4OWE6IFsweDFmXzgwLCBbMHgyNywgMHgyOF1dLCAvLyBkb3duIHN0YWlyIChkb3VibGUgLSBqdXN0IHVzZSBkb3duISlcbiAgMHg5ZTogWzB4ZGZfODAsIFsweGU3LCAweGU4XV0sIC8vIGJvdHRvbSBlZGdlXG4gIDB4YzE6IFsweDUwX2EwLCBbMHg0OSwgMHg0YV1dLCAvLyBjYXZlIG9uIHRvcCBib3VuZGFyeVxuICAweGMyOiBbMHg2MF9iMCwgWzB4NWEsIDB4NWJdXSwgLy8gY2F2ZSBvbiBib3R0b20tcmlnaHQgYm91bmRhcnlcbiAgMHgxOWE6IFsweGQwXzgwLCBbMHhjNywgMHhjOF1dLCAvLyB1cCBzdGFpciBvbiBkb3VibGVcbn07XG4iXX0=