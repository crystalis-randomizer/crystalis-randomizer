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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBTyxLQUFLLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDdEMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUNuQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFL0MsT0FBTyxFQUFDLE9BQU8sRUFDUCxlQUFlLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUM5QyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFDdEMsa0JBQWtCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFN0MsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUkxRCxPQUFPLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUM7QUFFMUMsTUFBTSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQztBQXVCckMsTUFBTSxJQUFJLEdBQUc7SUFDWCxPQUFPLEVBQUUsTUFBTTtJQUNmLEtBQUssRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0lBQzFDLE9BQU8sRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0NBQ3BDLENB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QUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQzthQUN0RCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBUyxHQUFHLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEQsSUFBSSxDQUFDLFNBQVM7WUFDWixLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxhQUFhLEdBQUcsV0FBVyxDQUFDLEVBQzVELENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUNyQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FB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QzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsSUFBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLEtBQUssRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztDQUMvQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4uL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHtFeHByfSBmcm9tICcuLi9hc20vZXhwci5qcyc7XG5pbXBvcnQge01vZHVsZX0gZnJvbSAnLi4vYXNtL21vZHVsZS5qcyc7XG5pbXBvcnQge0FyZWEsIEFyZWFzfSBmcm9tICcuL2FyZWEuanMnO1xuaW1wb3J0IHtFbnRpdHl9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7TWV0YWxvY2F0aW9ufSBmcm9tICcuL21ldGFsb2NhdGlvbi5qcyc7XG5pbXBvcnQge1NjcmVlbn0gZnJvbSAnLi9zY3JlZW4uanMnO1xuaW1wb3J0IHtTZWdtZW50LFxuICAgICAgICBjb25jYXRJdGVyYWJsZXMsIGZyZWUsIGdyb3VwLCBoZXgsIGluaXRpYWxpemVyLFxuICAgICAgICByZWFkTGl0dGxlRW5kaWFuLCBzZXEsIHR1cGxlLCB2YXJTbGljZSxcbiAgICAgICAgdXBwZXJDYW1lbFRvU3BhY2VzfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7YXNzZXJ0TmV2ZXIsIGl0ZXJzLCBEZWZhdWx0TWFwfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9tb25zdGVyLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuXG5pbXBvcnQge0VudHJhbmNlLCBFeGl0LCBGbGFnLCBQaXQsIFNwYXdufSBmcm9tICcuL2xvY2F0aW9udGFibGVzLmpzJztcbmV4cG9ydCB7RW50cmFuY2UsIEV4aXQsIEZsYWcsIFBpdCwgU3Bhd259OyAvLyBUT0RPIC0gcmVtb3ZlIHRoZSByZS1leHBvcnRcblxuY29uc3QgeyQwYSwgJDBiLCAkMGMsICQwZH0gPSBTZWdtZW50O1xuXG4vLyBOdW1iZXIgaW5kaWNhdGVzIHRvIGNvcHkgd2hhdGV2ZXIncyBhdCB0aGUgZ2l2ZW4gZXhpdFxudHlwZSBHcm91cEtleSA9IHN0cmluZyB8IHN5bWJvbCB8IG51bWJlcjtcbi8vIExvY2FsIGZvciBkZWZpbmluZyBuYW1lcyBvbiBMb2NhdGlvbnMgb2JqZWN0cy5cbmludGVyZmFjZSBMb2NhdGlvbkluaXQge1xuICBhcmVhPzogQXJlYTtcbiAgc3ViQXJlYT86IHN0cmluZztcbiAgbXVzaWM/OiBHcm91cEtleSB8ICgoYXJlYTogQXJlYSkgPT4gR3JvdXBLZXkpO1xuICBwYWxldHRlPzogR3JvdXBLZXkgfCAoKGFyZWE6IEFyZWEpID0+IEdyb3VwS2V5KTtcbiAgYm9zc1NjcmVlbj86IG51bWJlcjtcbiAgZml4ZWQ/OiByZWFkb25seSBudW1iZXJbXTtcbn1cbmludGVyZmFjZSBMb2NhdGlvbkRhdGEge1xuICBhcmVhOiBBcmVhO1xuICBuYW1lOiBzdHJpbmc7XG4gIG11c2ljOiBHcm91cEtleTtcbiAgcGFsZXR0ZTogR3JvdXBLZXk7XG4gIHN1YkFyZWE/OiBzdHJpbmc7XG4gIGJvc3NTY3JlZW4/OiBudW1iZXI7XG4gIGZpeGVkPzogcmVhZG9ubHkgbnVtYmVyW107IC8vIGZpeGVkIHNwYXduIHNsb3RzP1xufVxuXG5jb25zdCBDQVZFID0ge1xuICBzdWJBcmVhOiAnY2F2ZScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1DYXZlYCxcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tQ2F2ZWAsXG59IGFzIGNvbnN0O1xuY29uc3QgSE9VU0UgPSB7XG4gIHN1YkFyZWE6ICdob3VzZScsXG4gIHBhbGV0dGU6ICgpID0+IFN5bWJvbCgpLFxufSBhcyBjb25zdDtcbmNvbnN0IEZPUlRVTkVfVEVMTEVSID0ge1xuICBzdWJBcmVhOiAnaG91c2UnLFxuICBwYWxldHRlOiAoKSA9PiBTeW1ib2woKSxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUZvcnR1bmVUZWxsZXJgLFxufSBhcyBjb25zdDtcbmNvbnN0IE1FU0lBID0ge1xuICBuYW1lOiAnbWVzaWEnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tTWVzaWFgLFxuICAvLyBNZXNpYSBpbiB0b3dlciBrZWVwcyBzYW1lIHBhbGV0dGVcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGFyZWEubmFtZSA9PT0gJ1Rvd2VyJyA/XG4gICAgICBhcmVhLm5hbWUgOiBgJHthcmVhLm5hbWV9LU1lc2lhYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBEWU5BID0ge1xuICBuYW1lOiAnZHluYScsXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1EeW5hYCxcbiAgcGFsZXR0ZTogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tRHluYWAsXG59IGFzIGNvbnN0O1xuY29uc3QgS0VMQkVTUVVFID0ge1xuICBuYW1lOiAnZ29hIDEnLFxuICBtdXNpYzogJ2dvYSAxJyxcbiAgcGFsZXR0ZTogJ2dvYSAxJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBTQUJFUkEgPSB7XG4gIG5hbWU6ICdnb2EgMicsXG4gIG11c2ljOiAnZ29hIDInLFxuICBwYWxldHRlOiAnZ29hIDInLFxufSBhcyBjb25zdDtcbmNvbnN0IE1BRE9fTE9XRVIgPSB7XG4gIG5hbWU6ICdnb2EgMycsXG4gIG11c2ljOiAnZ29hIDMnLFxuICBwYWxldHRlOiAnZ29hIDMnLFxufSBhcyBjb25zdDtcbmNvbnN0IE1BRE9fVVBQRVIgPSB7Li4uTUFET19MT1dFUiwgcGFsZXR0ZTogJ2dvYSAzIHVwcGVyJ30gYXMgY29uc3Q7XG5jb25zdCBLQVJNSU5FX1VQUEVSID0ge1xuICBuYW1lOiAnZ29hIDQnLFxuICBtdXNpYzogJ2dvYSA0JyxcbiAgcGFsZXR0ZTogJ2dvYSA0Jyxcbn0gYXMgY29uc3Q7XG5jb25zdCBLQVJNSU5FX0xPV0VSID0gey4uLktBUk1JTkVfVVBQRVIsIHBhbGV0dGU6ICdnb2EgNCBsb3dlcid9IGFzIGNvbnN0O1xuXG50eXBlIEluaXRQYXJhbXMgPSByZWFkb25seSBbbnVtYmVyLCBMb2NhdGlvbkluaXQ/XTtcbnR5cGUgSW5pdCA9IHsoLi4uYXJnczogSW5pdFBhcmFtcyk6IExvY2F0aW9uLFxuICAgICAgICAgICAgIGNvbW1pdChsb2NhdGlvbnM6IExvY2F0aW9ucyk6IHZvaWR9O1xuY29uc3QgJDogSW5pdCA9ICgoKSA9PiB7XG4gIGNvbnN0ICQgPSBpbml0aWFsaXplcjxbbnVtYmVyLCBMb2NhdGlvbkluaXRdLCBMb2NhdGlvbj4oKTtcbiAgbGV0IGFyZWEhOiBBcmVhO1xuICBmdW5jdGlvbiAkJChpZDogbnVtYmVyLCBkYXRhOiBMb2NhdGlvbkluaXQgPSB7fSk6IExvY2F0aW9uIHtcbiAgICBkYXRhID0gey4uLmRhdGF9O1xuICAgIGFyZWEgPSBkYXRhLmFyZWEgPSBkYXRhLmFyZWEgfHwgYXJlYTtcbiAgICByZXR1cm4gJChpZCwgZGF0YSk7XG4gIH07XG4gICgkJCBhcyBJbml0KS5jb21taXQgPSAobG9jYXRpb25zOiBMb2NhdGlvbnMpID0+IHtcbiAgICAkLmNvbW1pdChsb2NhdGlvbnMsIChwcm9wOiBzdHJpbmcsIGlkOiBudW1iZXIsIGluaXQ6IExvY2F0aW9uSW5pdCkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IHVwcGVyQ2FtZWxUb1NwYWNlcyhwcm9wKTtcbiAgICAgIGNvbnN0IGFyZWEgPSBpbml0LmFyZWEhO1xuICAgICAgY29uc3QgbXVzaWMgPSB0eXBlb2YgaW5pdC5tdXNpYyA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgaW5pdC5tdXNpYyhhcmVhKSA6IGluaXQubXVzaWMgIT0gbnVsbCA/XG4gICAgICAgICAgaW5pdC5tdXNpYyA6IGFyZWEubmFtZTtcbiAgICAgIGNvbnN0IHBhbGV0dGUgPSB0eXBlb2YgaW5pdC5wYWxldHRlID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICBpbml0LnBhbGV0dGUoYXJlYSkgOiBpbml0LnBhbGV0dGUgfHwgYXJlYS5uYW1lO1xuICAgICAgY29uc3QgZGF0YTogTG9jYXRpb25EYXRhID0ge2FyZWEsIG5hbWUsIG11c2ljLCBwYWxldHRlfTtcbiAgICAgIGlmIChpbml0LnN1YkFyZWEgIT0gbnVsbCkgZGF0YS5zdWJBcmVhID0gaW5pdC5zdWJBcmVhO1xuICAgICAgaWYgKGluaXQuYm9zc1NjcmVlbiAhPSBudWxsKSBkYXRhLmJvc3NTY3JlZW4gPSBpbml0LmJvc3NTY3JlZW47XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IG5ldyBMb2NhdGlvbihsb2NhdGlvbnMucm9tLCBpZCwgZGF0YSk7XG4gICAgICAvLyBuZWdhdGl2ZSBpZCBpbmRpY2F0ZXMgaXQncyBub3QgcmVnaXN0ZXJlZC5cbiAgICAgIGlmIChpZCA+PSAwKSBsb2NhdGlvbnNbaWRdID0gbG9jYXRpb247XG4gICAgICByZXR1cm4gbG9jYXRpb247XG4gICAgfSk7XG4gIH07XG4gIHJldHVybiAkJCBhcyBJbml0O1xufSkoKTtcblxuZXhwb3J0IGNsYXNzIExvY2F0aW9ucyBleHRlbmRzIEFycmF5PExvY2F0aW9uPiB7XG5cbiAgcmVhZG9ubHkgTWV6YW1lU2hyaW5lICAgICAgICAgICAgID0gJCgweDAwLCB7YXJlYTogQXJlYXMuTWV6YW1lfSk7XG4gIHJlYWRvbmx5IExlYWZfT3V0c2lkZVN0YXJ0ICAgICAgICA9ICQoMHgwMSwge211c2ljOiAxfSk7XG4gIHJlYWRvbmx5IExlYWYgICAgICAgICAgICAgICAgICAgICA9ICQoMHgwMiwge2FyZWE6IEFyZWFzLkxlYWZ9KTtcbiAgcmVhZG9ubHkgVmFsbGV5T2ZXaW5kICAgICAgICAgICAgID0gJCgweDAzLCB7YXJlYTogQXJlYXMuVmFsbGV5T2ZXaW5kfSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmUxICAgICAgICAgICAgICA9ICQoMHgwNCwge2FyZWE6IEFyZWFzLlNlYWxlZENhdmV9KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTIgICAgICAgICAgICAgID0gJCgweDA1KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTYgICAgICAgICAgICAgID0gJCgweDA2KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTQgICAgICAgICAgICAgID0gJCgweDA3KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTUgICAgICAgICAgICAgID0gJCgweDA4KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTMgICAgICAgICAgICAgID0gJCgweDA5KTtcbiAgcmVhZG9ubHkgU2VhbGVkQ2F2ZTcgICAgICAgICAgICAgID0gJCgweDBhLCB7Ym9zc1NjcmVlbjogMHg5MX0pO1xuICAvLyBJTlZBTElEOiAweDBiXG4gIHJlYWRvbmx5IFNlYWxlZENhdmU4ICAgICAgICAgICAgICA9ICQoMHgwYyk7XG4gIC8vIElOVkFMSUQ6IDB4MGRcbiAgcmVhZG9ubHkgV2luZG1pbGxDYXZlICAgICAgICAgICAgID0gJCgweDBlLCB7YXJlYTogQXJlYXMuV2luZG1pbGxDYXZlfSk7XG4gIHJlYWRvbmx5IFdpbmRtaWxsICAgICAgICAgICAgICAgICA9ICQoMHgwZiwge2FyZWE6IEFyZWFzLldpbmRtaWxsLCBtdXNpYzogMH0pO1xuICByZWFkb25seSBaZWJ1Q2F2ZSAgICAgICAgICAgICAgICAgPSAkKDB4MTAsIHthcmVhOiBBcmVhcy5aZWJ1Q2F2ZX0pO1xuICByZWFkb25seSBNdFNhYnJlV2VzdF9DYXZlMSAgICAgICAgPSAkKDB4MTEsIHthcmVhOiBBcmVhcy5NdFNhYnJlV2VzdCwgLi4uQ0FWRX0pO1xuICAvLyBJTlZBTElEOiAweDEyXG4gIC8vIElOVkFMSUQ6IDB4MTNcbiAgcmVhZG9ubHkgQ29yZGVsUGxhaW5XZXN0ICAgICAgICAgID0gJCgweDE0LCB7YXJlYTogQXJlYXMuQ29yZGVsUGxhaW59KTtcbiAgcmVhZG9ubHkgQ29yZGVsUGxhaW5FYXN0ICAgICAgICAgID0gJCgweDE1KTtcbiAgLy8gSU5WQUxJRDogMHgxNiAtLSB1bnVzZWQgY29weSBvZiAxOFxuICAvLyBJTlZBTElEOiAweDE3XG4gIHJlYWRvbmx5IEJyeW5tYWVyICAgICAgICAgICAgICAgICA9ICQoMHgxOCwge2FyZWE6IEFyZWFzLkJyeW5tYWVyfSk7XG4gIHJlYWRvbmx5IE91dHNpZGVTdG9tSG91c2UgICAgICAgICA9ICQoMHgxOSwge2FyZWE6IEFyZWFzLlN0b21Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgU3dhbXAgICAgICAgICAgICAgICAgICAgID0gJCgweDFhLCB7YXJlYTogQXJlYXMuU3dhbXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4N2N9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXMgICAgICAgICAgICAgICAgID0gJCgweDFiLCB7YXJlYTogQXJlYXMuQW1hem9uZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpeGVkOiBbMHgwZCwgMHgwZV19KTtcbiAgcmVhZG9ubHkgT2FrICAgICAgICAgICAgICAgICAgICAgID0gJCgweDFjLCB7YXJlYTogQXJlYXMuT2FrfSk7XG4gIC8vIElOVkFMSUQ6IDB4MWRcbiAgcmVhZG9ubHkgU3RvbUhvdXNlICAgICAgICAgICAgICAgID0gJCgweDFlLCB7YXJlYTogQXJlYXMuU3RvbUhvdXNlfSk7XG4gIC8vIElOVkFMSUQ6IDB4MWZcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfTG93ZXIgICAgICAgID0gJCgweDIwLCB7YXJlYTogQXJlYXMuTXRTYWJyZVdlc3R9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfVXBwZXIgICAgICAgID0gJCgweDIxKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTIgICAgICAgID0gJCgweDIyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTMgICAgICAgID0gJCgweDIzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTQgICAgICAgID0gJCgweDI0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTUgICAgICAgID0gJCgweDI1LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTYgICAgICAgID0gJCgweDI2LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTcgICAgICAgID0gJCgweDI3LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX01haW4gICAgICAgID0gJCgweDI4LCB7YXJlYTogQXJlYXMuTXRTYWJyZU5vcnRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweGI1fSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9NaWRkbGUgICAgICA9ICQoMHgyOSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlMiAgICAgICA9ICQoMHgyYSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlMyAgICAgICA9ICQoMHgyYiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNCAgICAgICA9ICQoMHgyYywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNSAgICAgICA9ICQoMHgyZCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlNiAgICAgICA9ICQoMHgyZSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9Qcmlzb25IYWxsICA9ICQoMHgyZiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9MZWZ0Q2VsbCAgICA9ICQoMHgzMCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9MZWZ0Q2VsbDIgICA9ICQoMHgzMSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9SaWdodENlbGwgICA9ICQoMHgzMiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlOCAgICAgICA9ICQoMHgzMywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9DYXZlOSAgICAgICA9ICQoMHgzNCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9TdW1taXRDYXZlICA9ICQoMHgzNSwgQ0FWRSk7XG4gIC8vIElOVkFMSUQ6IDB4MzZcbiAgLy8gSU5WQUxJRDogMHgzN1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTEgICAgICAgPSAkKDB4MzgsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTcgICAgICAgPSAkKDB4MzksIENBVkUpO1xuICAvLyBJTlZBTElEOiAweDNhXG4gIC8vIElOVkFMSUQ6IDB4M2JcbiAgcmVhZG9ubHkgTmFkYXJlX0lubiAgICAgICAgICAgICAgID0gJCgweDNjLCB7YXJlYTogQXJlYXMuTmFkYXJlLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBOYWRhcmVfVG9vbFNob3AgICAgICAgICAgPSAkKDB4M2QsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTmFkYXJlX0JhY2tSb29tICAgICAgICAgID0gJCgweDNlLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4M2ZcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsVmFsbGV5Tm9ydGggICAgID0gJCgweDQwLCB7YXJlYTogQXJlYXMuV2F0ZXJmYWxsVmFsbGV5fSk7XG4gIHJlYWRvbmx5IFdhdGVyZmFsbFZhbGxleVNvdXRoICAgICA9ICQoMHg0MSk7XG4gIHJlYWRvbmx5IExpbWVUcmVlVmFsbGV5ICAgICAgICAgICA9ICQoMHg0Miwge2FyZWE6IEFyZWFzLkxpbWVUcmVlVmFsbGV5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBMaW1lVHJlZUxha2UgICAgICAgICAgICAgPSAkKDB4NDMsIHthcmVhOiBBcmVhcy5MaW1lVHJlZUxha2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IEtpcmlzYVBsYW50Q2F2ZTEgICAgICAgICA9ICQoMHg0NCwge2FyZWE6IEFyZWFzLktpcmlzYVBsYW50Q2F2ZX0pO1xuICByZWFkb25seSBLaXJpc2FQbGFudENhdmUyICAgICAgICAgPSAkKDB4NDUpO1xuICByZWFkb25seSBLaXJpc2FQbGFudENhdmUzICAgICAgICAgPSAkKDB4NDYpO1xuICByZWFkb25seSBLaXJpc2FNZWFkb3cgICAgICAgICAgICAgPSAkKDB4NDcsIHthcmVhOiBBcmVhcy5LaXJpc2FNZWFkb3d9KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUxICAgICAgICAgICAgID0gJCgweDQ4LCB7YXJlYTogQXJlYXMuRm9nTGFtcENhdmV9KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUyICAgICAgICAgICAgID0gJCgweDQ5KTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmUzICAgICAgICAgICAgID0gJCgweDRhKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmVEZWFkRW5kICAgICAgID0gJCgweDRiKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU0ICAgICAgICAgICAgID0gJCgweDRjKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU1ICAgICAgICAgICAgID0gJCgweDRkKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU2ICAgICAgICAgICAgID0gJCgweDRlKTtcbiAgcmVhZG9ubHkgRm9nTGFtcENhdmU3ICAgICAgICAgICAgID0gJCgweDRmKTtcbiAgcmVhZG9ubHkgUG9ydG9hICAgICAgICAgICAgICAgICAgID0gJCgweDUwLCB7YXJlYTogQXJlYXMuUG9ydG9hfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9GaXNoZXJtYW5Jc2xhbmQgICA9ICQoMHg1MSwge2FyZWE6IEFyZWFzLkZpc2hlcm1hbkhvdXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBNZXNpYVNocmluZSAgICAgICAgICAgICAgPSAkKDB4NTIsIHthcmVhOiBBcmVhcy5MaW1lVHJlZUxha2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLk1FU0lBfSk7XG4gIC8vIElOVkFMSUQ6IDB4NTNcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTEgICAgICAgICAgID0gJCgweDU0LCB7YXJlYTogQXJlYXMuV2F0ZXJmYWxsQ2F2ZX0pO1xuICByZWFkb25seSBXYXRlcmZhbGxDYXZlMiAgICAgICAgICAgPSAkKDB4NTUpO1xuICByZWFkb25seSBXYXRlcmZhbGxDYXZlMyAgICAgICAgICAgPSAkKDB4NTYpO1xuICByZWFkb25seSBXYXRlcmZhbGxDYXZlNCAgICAgICAgICAgPSAkKDB4NTcpO1xuICByZWFkb25seSBUb3dlckVudHJhbmNlICAgICAgICAgICAgPSAkKDB4NTgsIHthcmVhOiBBcmVhcy5Ub3dlcn0pO1xuICByZWFkb25seSBUb3dlcjEgICAgICAgICAgICAgICAgICAgPSAkKDB4NTkpO1xuICByZWFkb25seSBUb3dlcjIgICAgICAgICAgICAgICAgICAgPSAkKDB4NWEpO1xuICByZWFkb25seSBUb3dlcjMgICAgICAgICAgICAgICAgICAgPSAkKDB4NWIpO1xuICByZWFkb25seSBUb3dlck91dHNpZGVNZXNpYSAgICAgICAgPSAkKDB4NWMpO1xuICByZWFkb25seSBUb3dlck91dHNpZGVEeW5hICAgICAgICAgPSAkKDB4NWQpO1xuICByZWFkb25seSBUb3dlck1lc2lhICAgICAgICAgICAgICAgPSAkKDB4NWUsIE1FU0lBKTtcbiAgcmVhZG9ubHkgVG93ZXJEeW5hICAgICAgICAgICAgICAgID0gJCgweDVmLCBEWU5BKTtcbiAgcmVhZG9ubHkgQW5ncnlTZWEgICAgICAgICAgICAgICAgID0gJCgweDYwLCB7YXJlYTogQXJlYXMuQW5ncnlTZWF9KTtcbiAgcmVhZG9ubHkgQm9hdEhvdXNlICAgICAgICAgICAgICAgID0gJCgweDYxKTtcbiAgcmVhZG9ubHkgSm9lbExpZ2h0aG91c2UgICAgICAgICAgID0gJCgweDYyLCB7YXJlYTogQXJlYXMuTGlnaHRob3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgLy8gSU5WQUxJRDogMHg2M1xuICByZWFkb25seSBVbmRlcmdyb3VuZENoYW5uZWwgICAgICAgPSAkKDB4NjQsIHthcmVhOiBBcmVhcy5VbmRlcmdyb3VuZENoYW5uZWx9KTtcbiAgcmVhZG9ubHkgWm9tYmllVG93biAgICAgICAgICAgICAgID0gJCgweDY1LCB7YXJlYTogQXJlYXMuWm9tYmllVG93bn0pO1xuICAvLyBJTlZBTElEOiAweDY2XG4gIC8vIElOVkFMSUQ6IDB4NjdcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDEgICAgICAgID0gJCgweDY4LCB7YXJlYTogQXJlYXMuRXZpbFNwaXJpdElzbGFuZEVudHJhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMX0pO1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kMiAgICAgICAgPSAkKDB4NjksIHthcmVhOiBBcmVhcy5FdmlsU3Bpcml0SXNsYW5kfSk7XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQzICAgICAgICA9ICQoMHg2YSk7XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQ0ICAgICAgICA9ICQoMHg2Yik7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTEgICAgICAgICAgICA9ICQoMHg2Yywge2FyZWE6IEFyZWFzLlNhYmVyYUZvcnRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweGZkfSk7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTIgICAgICAgICAgICA9ICQoMHg2ZCk7XG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTJfV2VzdCAgICAgICA9ICQoLTEpOyAgLy8gd2lsbCBnZXQgdGhlIHdlc3QgcGFydCBvZiBwYWxhY2UyXG4gIHJlYWRvbmx5IFNhYmVyYVBhbGFjZTMgICAgICAgICAgICA9ICQoMHg2ZSwge2Jvc3NTY3JlZW46IDB4ZmR9KTtcbiAgLy8gSU5WQUxJRDogMHg2ZiAtLSBTYWJlcmEgUGFsYWNlIDMgdW51c2VkIGNvcHlcbiAgcmVhZG9ubHkgSm9lbFNlY3JldFBhc3NhZ2UgICAgICAgID0gJCgweDcwLCB7YXJlYTogQXJlYXMuSm9lbFBhc3NhZ2V9KTtcbiAgcmVhZG9ubHkgSm9lbCAgICAgICAgICAgICAgICAgICAgID0gJCgweDcxLCB7YXJlYTogQXJlYXMuSm9lbH0pO1xuICByZWFkb25seSBTd2FuICAgICAgICAgICAgICAgICAgICAgPSAkKDB4NzIsIHthcmVhOiBBcmVhcy5Td2FuLCBtdXNpYzogMX0pO1xuICByZWFkb25seSBTd2FuR2F0ZSAgICAgICAgICAgICAgICAgPSAkKDB4NzMsIHthcmVhOiBBcmVhcy5Td2FuR2F0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDF9KTtcbiAgLy8gSU5WQUxJRDogMHg3NFxuICAvLyBJTlZBTElEOiAweDc1XG4gIC8vIElOVkFMSUQ6IDB4NzZcbiAgLy8gSU5WQUxJRDogMHg3N1xuICByZWFkb25seSBHb2FWYWxsZXkgICAgICAgICAgICAgICAgPSAkKDB4NzgsIHthcmVhOiBBcmVhcy5Hb2FWYWxsZXl9KTtcbiAgLy8gSU5WQUxJRDogMHg3OVxuICAvLyBJTlZBTElEOiAweDdhXG4gIC8vIElOVkFMSUQ6IDB4N2JcbiAgcmVhZG9ubHkgTXRIeWRyYSAgICAgICAgICAgICAgICAgID0gJCgweDdjLCB7YXJlYTogQXJlYXMuTXRIeWRyYX0pO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUxICAgICAgICAgICAgPSAkKDB4N2QsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX091dHNpZGVTaHlyb24gICAgPSAkKDB4N2UsIHtmaXhlZDogWzB4MGQsIDB4MGVdfSk7IC8vIGd1YXJkc1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUyICAgICAgICAgICAgPSAkKDB4N2YsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUzICAgICAgICAgICAgPSAkKDB4ODAsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU0ICAgICAgICAgICAgPSAkKDB4ODEsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU1ICAgICAgICAgICAgPSAkKDB4ODIsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU2ICAgICAgICAgICAgPSAkKDB4ODMsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU3ICAgICAgICAgICAgPSAkKDB4ODQsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU4ICAgICAgICAgICAgPSAkKDB4ODUsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmU5ICAgICAgICAgICAgPSAkKDB4ODYsIENBVkUpO1xuICByZWFkb25seSBNdEh5ZHJhX0NhdmUxMCAgICAgICAgICAgPSAkKDB4ODcsIENBVkUpO1xuICByZWFkb25seSBTdHl4MSAgICAgICAgICAgICAgICAgICAgPSAkKDB4ODgsIHthcmVhOiBBcmVhcy5TdHl4fSk7XG4gIHJlYWRvbmx5IFN0eXgyICAgICAgICAgICAgICAgICAgICA9ICQoMHg4OSk7XG4gIHJlYWRvbmx5IFN0eXgyX0Vhc3QgICAgICAgICAgICAgICA9ICQoLTEpOyAgLy8gd2lsbCBnZXQgdGhlIGVhc3QgcGFydCBvZiBzdHh5IDJcbiAgcmVhZG9ubHkgU3R5eDMgICAgICAgICAgICAgICAgICAgID0gJCgweDhhKTtcbiAgLy8gSU5WQUxJRDogMHg4YlxuICByZWFkb25seSBTaHlyb24gICAgICAgICAgICAgICAgICAgPSAkKDB4OGMsIHthcmVhOiBBcmVhcy5TaHlyb259KTtcbiAgLy8gSU5WQUxJRDogMHg4ZFxuICByZWFkb25seSBHb2EgICAgICAgICAgICAgICAgICAgICAgPSAkKDB4OGUsIHthcmVhOiBBcmVhcy5Hb2F9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NCYXNlbWVudCAgICAgID0gJCgweDhmLCB7YXJlYTogQXJlYXMuRm9ydHJlc3NCYXNlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgRGVzZXJ0MSAgICAgICAgICAgICAgICAgID0gJCgweDkwLCB7YXJlYTogQXJlYXMuRGVzZXJ0MX0pO1xuICByZWFkb25seSBPYXNpc0NhdmVNYWluICAgICAgICAgICAgPSAkKDB4OTEsIHthcmVhOiBBcmVhcy5PYXNpc0NhdmV9KTtcbiAgcmVhZG9ubHkgRGVzZXJ0Q2F2ZTEgICAgICAgICAgICAgID0gJCgweDkyLCB7YXJlYTogQXJlYXMuRGVzZXJ0Q2F2ZTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFNhaGFyYSAgICAgICAgICAgICAgICAgICA9ICQoMHg5Mywge2FyZWE6IEFyZWFzLlNhaGFyYX0pO1xuICByZWFkb25seSBTYWhhcmFPdXRzaWRlQ2F2ZSAgICAgICAgPSAkKDB4OTQsIHttdXNpYzogMH0pOyAvLyBUT0RPIC0gc2FoYXJhPz8gZ2VuZXJpYz8/XG4gIHJlYWRvbmx5IERlc2VydENhdmUyICAgICAgICAgICAgICA9ICQoMHg5NSwge2FyZWE6IEFyZWFzLkRlc2VydENhdmUyLCBtdXNpYzogMX0pO1xuICByZWFkb25seSBTYWhhcmFNZWFkb3cgICAgICAgICAgICAgPSAkKDB4OTYsIHthcmVhOiBBcmVhcy5TYWhhcmFNZWFkb3csIG11c2ljOiAwfSk7XG4gIC8vIElOVkFMSUQ6IDB4OTdcbiAgcmVhZG9ubHkgRGVzZXJ0MiAgICAgICAgICAgICAgICAgID0gJCgweDk4LCB7YXJlYTogQXJlYXMuRGVzZXJ0Mn0pO1xuICAvLyBJTlZBTElEOiAweDk5XG4gIC8vIElOVkFMSUQ6IDB4OWFcbiAgLy8gSU5WQUxJRDogMHg5YlxuICByZWFkb25seSBQeXJhbWlkX0VudHJhbmNlICAgICAgICAgPSAkKDB4OWMsIHthcmVhOiBBcmVhcy5QeXJhbWlkfSk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfQnJhbmNoICAgICAgICAgICA9ICQoMHg5ZCk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfTWFpbiAgICAgICAgICAgICA9ICQoMHg5ZSk7XG4gIHJlYWRvbmx5IFB5cmFtaWRfRHJheWdvbiAgICAgICAgICA9ICQoMHg5Zik7XG4gIHJlYWRvbmx5IENyeXB0X0VudHJhbmNlICAgICAgICAgICA9ICQoMHhhMCwge2FyZWE6IEFyZWFzLkNyeXB0fSk7XG4gIHJlYWRvbmx5IENyeXB0X0hhbGwxICAgICAgICAgICAgICA9ICQoMHhhMSk7XG4gIHJlYWRvbmx5IENyeXB0X0JyYW5jaCAgICAgICAgICAgICA9ICQoMHhhMik7XG4gIHJlYWRvbmx5IENyeXB0X0RlYWRFbmRMZWZ0ICAgICAgICA9ICQoMHhhMyk7XG4gIHJlYWRvbmx5IENyeXB0X0RlYWRFbmRSaWdodCAgICAgICA9ICQoMHhhNCk7XG4gIHJlYWRvbmx5IENyeXB0X0hhbGwyICAgICAgICAgICAgICA9ICQoMHhhNSk7XG4gIHJlYWRvbmx5IENyeXB0X0RyYXlnb24yICAgICAgICAgICA9ICQoMHhhNik7XG4gIHJlYWRvbmx5IENyeXB0X1RlbGVwb3J0ZXIgICAgICAgICA9ICQoMHhhNywge211c2ljOiAnQ3J5cHQtVGVsZXBvcnRlcid9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfRW50cmFuY2UgICAgID0gJCgweGE4LCB7YXJlYTogQXJlYXMuR29hRm9ydHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAxfSk7IC8vIHNhbWUgYXMgbmV4dCBhcmVhXG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0tlbGJlc3F1ZSAgICA9ICQoMHhhOSwge2Jvc3NTY3JlZW46IDB4NzMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLktFTEJFU1FVRX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19aZWJ1ICAgICAgICAgPSAkKDB4YWEsIHsuLi5LRUxCRVNRVUUsIHBhbGV0dGU6IDF9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfU2FiZXJhICAgICAgID0gJCgweGFiLCBTQUJFUkEpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19Ub3JuZWwgICAgICAgPSAkKDB4YWMsIHtib3NzU2NyZWVuOiAweDkxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5TQUJFUkEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhbGV0dGU6IDF9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfTWFkbzEgICAgICAgID0gJCgweGFkLCBNQURPX0xPV0VSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfTWFkbzIgICAgICAgID0gJCgweGFlLCBNQURPX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfTWFkbzMgICAgICAgID0gJCgweGFmLCBNQURPX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTEgICAgID0gJCgweGIwLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTIgICAgID0gJCgweGIxLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTMgICAgID0gJCgweGIyLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTQgICAgID0gJCgweGIzLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTUgICAgID0gJCgweGI0LCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTYgICAgID0gJCgweGI1LCBLQVJNSU5FX0xPV0VSKTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2FybWluZTcgICAgID0gJCgweGI2LCB7Ym9zc1NjcmVlbjogMHhmZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uS0FSTUlORV9MT1dFUn0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19FeGl0ICAgICAgICAgPSAkKDB4YjcsIHttdXNpYzogMH0pOyAvLyBzYW1lIGFzIHRvcCBnb2FcbiAgcmVhZG9ubHkgT2FzaXNDYXZlX0VudHJhbmNlICAgICAgID0gJCgweGI4LCB7YXJlYTogQXJlYXMuT2FzaXNFbnRyYW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDJ9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfQXNpbmEgICAgICAgID0gJCgweGI5LCB7YXJlYTogQXJlYXMuR29hRm9ydHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLk1BRE9fVVBQRVIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4OTF9KTtcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2Vuc3UgICAgICAgID0gJCgweGJhLCBLQVJNSU5FX1VQUEVSKTtcbiAgcmVhZG9ubHkgR29hX0hvdXNlICAgICAgICAgICAgICAgID0gJCgweGJiLCB7YXJlYTogQXJlYXMuR29hLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBHb2FfSW5uICAgICAgICAgICAgICAgICAgPSAkKDB4YmMsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhiZFxuICByZWFkb25seSBHb2FfVG9vbFNob3AgICAgICAgICAgICAgPSAkKDB4YmUsIEhPVVNFKTtcbiAgcmVhZG9ubHkgR29hX1RhdmVybiAgICAgICAgICAgICAgID0gJCgweGJmLCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfRWxkZXJIb3VzZSAgICAgICAgICA9ICQoMHhjMCwge2FyZWE6IEFyZWFzLkxlYWYsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IExlYWZfUmFiYml0SHV0ICAgICAgICAgICA9ICQoMHhjMSwgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX0lubiAgICAgICAgICAgICAgICAgPSAkKDB4YzIsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9Ub29sU2hvcCAgICAgICAgICAgID0gJCgweGMzLCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfQXJtb3JTaG9wICAgICAgICAgICA9ICQoMHhjNCwgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX1N0dWRlbnRIb3VzZSAgICAgICAgPSAkKDB4YzUsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfVGF2ZXJuICAgICAgICAgID0gJCgweGM2LCB7YXJlYTogQXJlYXMuQnJ5bm1hZXIsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX1Bhd25TaG9wICAgICAgICA9ICQoMHhjNywgSE9VU0UpO1xuICByZWFkb25seSBCcnlubWFlcl9Jbm4gICAgICAgICAgICAgPSAkKDB4YzgsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfQXJtb3JTaG9wICAgICAgID0gJCgweGM5LCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4Y2FcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfSXRlbVNob3AgICAgICAgID0gJCgweGNiLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4Y2NcbiAgcmVhZG9ubHkgT2FrX0VsZGVySG91c2UgICAgICAgICAgID0gJCgweGNkLCB7YXJlYTogQXJlYXMuT2FrLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBPYWtfTW90aGVySG91c2UgICAgICAgICAgPSAkKDB4Y2UsIEhPVVNFKTtcbiAgcmVhZG9ubHkgT2FrX1Rvb2xTaG9wICAgICAgICAgICAgID0gJCgweGNmLCBIT1VTRSk7XG4gIHJlYWRvbmx5IE9ha19Jbm4gICAgICAgICAgICAgICAgICA9ICQoMHhkMCwgSE9VU0UpO1xuICByZWFkb25seSBBbWF6b25lc19Jbm4gICAgICAgICAgICAgPSAkKDB4ZDEsIHthcmVhOiBBcmVhcy5BbWF6b25lcywgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfSXRlbVNob3AgICAgICAgID0gJCgweGQyLCBIT1VTRSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0FybW9yU2hvcCAgICAgICA9ICQoMHhkMywgSE9VU0UpO1xuICByZWFkb25seSBBbWF6b25lc19FbGRlciAgICAgICAgICAgPSAkKDB4ZDQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTmFkYXJlICAgICAgICAgICAgICAgICAgID0gJCgweGQ1LCB7YXJlYTogQXJlYXMuTmFkYXJlfSk7IC8vIGVkZ2UtZG9vcj9cbiAgcmVhZG9ubHkgUG9ydG9hX0Zpc2hlcm1hbkhvdXNlICAgID0gJCgweGQ2LCB7YXJlYTogQXJlYXMuRmlzaGVybWFuSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFLCBtdXNpYzogMH0pO1xuICByZWFkb25seSBQb3J0b2FfUGFsYWNlRW50cmFuY2UgICAgPSAkKDB4ZDcsIHthcmVhOiBBcmVhcy5Qb3J0b2FQYWxhY2V9KTtcbiAgcmVhZG9ubHkgUG9ydG9hX0ZvcnR1bmVUZWxsZXIgICAgID0gJCgweGQ4LCB7YXJlYTogQXJlYXMuUG9ydG9hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXhlZDogWzB4MGQsIDB4MGVdLCAvLyBndWFyZC9lbXB0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5GT1JUVU5FX1RFTExFUn0pO1xuICByZWFkb25seSBQb3J0b2FfUGF3blNob3AgICAgICAgICAgPSAkKDB4ZDksIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hX0FybW9yU2hvcCAgICAgICAgID0gJCgweGRhLCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4ZGJcbiAgcmVhZG9ubHkgUG9ydG9hX0lubiAgICAgICAgICAgICAgID0gJCgweGRjLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhkZCwgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfTGVmdCAgICAgICAgPSAkKDB4ZGUsIHthcmVhOiBBcmVhcy5Qb3J0b2FQYWxhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IFBvcnRvYVBhbGFjZV9UaHJvbmVSb29tICA9ICQoMHhkZiwgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FQYWxhY2VfUmlnaHQgICAgICAgPSAkKDB4ZTAsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hX0FzaW5hUm9vbSAgICAgICAgID0gJCgweGUxLCB7YXJlYTogQXJlYXMuVW5kZXJncm91bmRDaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRSwgbXVzaWM6ICdhc2luYSd9KTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfRWxkZXJEb3duc3RhaXJzID0gJCgweGUyLCB7YXJlYTogQXJlYXMuQW1hem9uZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEpvZWxfRWxkZXJIb3VzZSAgICAgICAgICA9ICQoMHhlMywge2FyZWE6IEFyZWFzLkpvZWwsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEpvZWxfU2hlZCAgICAgICAgICAgICAgICA9ICQoMHhlNCwgSE9VU0UpO1xuICByZWFkb25seSBKb2VsX1Rvb2xTaG9wICAgICAgICAgICAgPSAkKDB4ZTUsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhlNlxuICByZWFkb25seSBKb2VsX0lubiAgICAgICAgICAgICAgICAgPSAkKDB4ZTcsIEhPVVNFKTtcbiAgcmVhZG9ubHkgWm9tYmllVG93bl9Ib3VzZSAgICAgICAgID0gJCgweGU4LCB7YXJlYTogQXJlYXMuWm9tYmllVG93bixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgWm9tYmllVG93bl9Ib3VzZUJhc2VtZW50ID0gJCgweGU5LCBIT1VTRSk7XG4gIC8vIElOVkFMSUQ6IDB4ZWFcbiAgcmVhZG9ubHkgU3dhbl9Ub29sU2hvcCAgICAgICAgICAgID0gJCgweGViLCB7YXJlYTogQXJlYXMuU3dhbiwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgU3dhbl9TdG9tSHV0ICAgICAgICAgICAgID0gJCgweGVjLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fSW5uICAgICAgICAgICAgICAgICA9ICQoMHhlZCwgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX0FybW9yU2hvcCAgICAgICAgICAgPSAkKDB4ZWUsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9UYXZlcm4gICAgICAgICAgICAgID0gJCgweGVmLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fUGF3blNob3AgICAgICAgICAgICA9ICQoMHhmMCwgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX0RhbmNlSGFsbCAgICAgICAgICAgPSAkKDB4ZjEsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2h5cm9uX1RlbXBsZSAgICAgICAgICAgID0gJCgweGYyLCB7YXJlYTogQXJlYXMuU2h5cm9uVGVtcGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDcwfSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9UcmFpbmluZ0hhbGwgICAgICA9ICQoMHhmMywge2FyZWE6IEFyZWFzLlNoeXJvbiwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgU2h5cm9uX0hvc3BpdGFsICAgICAgICAgID0gJCgweGY0LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Bcm1vclNob3AgICAgICAgICA9ICQoMHhmNSwgSE9VU0UpO1xuICByZWFkb25seSBTaHlyb25fVG9vbFNob3AgICAgICAgICAgPSAkKDB4ZjYsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2h5cm9uX0lubiAgICAgICAgICAgICAgID0gJCgweGY3LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9Jbm4gICAgICAgICAgICAgICA9ICQoMHhmOCwge2FyZWE6IEFyZWFzLlNhaGFyYSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgU2FoYXJhX1Rvb2xTaG9wICAgICAgICAgID0gJCgweGY5LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9FbGRlckhvdXNlICAgICAgICA9ICQoMHhmYSwgSE9VU0UpO1xuICByZWFkb25seSBTYWhhcmFfUGF3blNob3AgICAgICAgICAgPSAkKDB4ZmIsIEhPVVNFKTtcblxuICAvLyBOZXcgbG9jYXRpb25zLCBubyBJRCBwcm9jdXJlZCB5ZXQuXG4gIHJlYWRvbmx5IEVhc3RDYXZlMSAgICAgID0gJCgtMSwge2FyZWE6IEFyZWFzLkVhc3RDYXZlfSk7XG4gIHJlYWRvbmx5IEVhc3RDYXZlMiAgICAgID0gJCgtMSk7XG4gIHJlYWRvbmx5IEVhc3RDYXZlMyAgICAgID0gJCgtMSk7XG4gIHJlYWRvbmx5IEZpc2hlcm1hbkJlYWNoID0gJCgtMSwge2FyZWE6IEFyZWFzLkZpc2hlcm1hbkhvdXNlLCAuLi5IT1VTRX0pO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jc0J5U2NyZWVuID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBMb2NhdGlvbltdPigoKSA9PiBbXSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICBzdXBlcigweDEwMCk7XG4gICAgJC5jb21taXQodGhpcyk7XG4gICAgLy8gRmlsbCBpbiBhbnkgbWlzc2luZyBvbmVzXG4gICAgZm9yIChsZXQgaWQgPSAwOyBpZCA8IDB4MTAwOyBpZCsrKSB7XG4gICAgICBpZiAodGhpc1tpZF0pIHtcbiAgICAgICAgdGhpcy5pbmRleFNjcmVlbnModGhpc1tpZF0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXNbaWRdID0gbmV3IExvY2F0aW9uKHJvbSwgaWQsIHtcbiAgICAgICAgYXJlYTogQXJlYXMuVW51c2VkLFxuICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgbXVzaWM6ICcnLFxuICAgICAgICBwYWxldHRlOiAnJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBUT0RPIC0gbWV0aG9kIHRvIGFkZCBhbiB1bnJlZ2lzdGVyZWQgbG9jYXRpb24gdG8gYW4gZW1wdHkgaW5kZXguXG4gIH1cblxuICBpbmRleFNjcmVlbnMobG9jOiBMb2NhdGlvbikge1xuICAgIGZvciAoY29uc3Qgcm93IG9mIGxvYy5zY3JlZW5zKSB7XG4gICAgICBmb3IgKGNvbnN0IHMgb2Ygcm93KSB7XG4gICAgICAgIHRoaXMubG9jc0J5U2NyZWVuLmdldChzKS5wdXNoKGxvYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVudW1iZXJTY3JlZW4ob2xkSWQ6IG51bWJlciwgbmV3SWQ6IG51bWJlcikge1xuICAgIGNvbnN0IGxvY3MgPSB0aGlzLmxvY3NCeVNjcmVlbi5nZXQob2xkSWQpO1xuICAgIHRoaXMubG9jc0J5U2NyZWVuLnNldChuZXdJZCwgbG9jcyk7XG4gICAgdGhpcy5sb2NzQnlTY3JlZW4uZGVsZXRlKG9sZElkKTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBsb2NzKSB7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvdy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChyb3dbaV0gPT09IG9sZElkKSByb3dbaV0gPSBuZXdJZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFsbG9jYXRlKGxvY2F0aW9uOiBMb2NhdGlvbiwgYWZ0ZXI/OiBMb2NhdGlvbik6IExvY2F0aW9uIHtcbiAgICAvLyBwaWNrIGFuIHVudXNlZCBsb2NhdGlvblxuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzKSB7XG4gICAgICBpZiAobC51c2VkIHx8IChhZnRlciAmJiBsLmlkIDwgYWZ0ZXIuaWQpKSBjb250aW51ZTtcbiAgICAgIChsb2NhdGlvbiBhcyBhbnkpLmlkID0gbC5pZDtcbiAgICAgIGxvY2F0aW9uLnVzZWQgPSB0cnVlO1xuICAgICAgdGhpcy5pbmRleFNjcmVlbnMobG9jYXRpb24pO1xuICAgICAgcmV0dXJuIHRoaXNbbC5pZF0gPSBsb2NhdGlvbjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyB1bnVzZWQgbG9jYXRpb24nKTtcbiAgfVxuXG4gIHdyaXRlKCk6IE1vZHVsZVtdIHtcbiAgICBjb25zdCBhID0gdGhpcy5yb20uYXNzZW1ibGVyKCk7XG4gICAgZnJlZShhLCAkMGEsIDB4ODRmOCwgMHhhMDAwKTtcbiAgICBmcmVlKGEsICQwYiwgMHhhMDAwLCAweGJlMDApO1xuICAgIGZyZWUoYSwgJDBjLCAweDkzZjksIDB4YTAwMCk7XG4gICAgZnJlZShhLCAkMGQsIDB4YTAwMCwgMHhhYzAwKTtcbiAgICBmcmVlKGEsICQwZCwgMHhhZTAwLCAweGMwMDApOyAvLyBiZjAwID8/P1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcykge1xuICAgICAgbG9jYXRpb24uYXNzZW1ibGUoYSk7XG4gICAgfVxuICAgIHJldHVybiBbYS5tb2R1bGUoKV07XG4gIH1cblxuICBsb2NhdGlvbigpIHtcblxuICB9XG59XG5cbi8vIExvY2F0aW9uIGVudGl0aWVzXG5leHBvcnQgY2xhc3MgTG9jYXRpb24gZXh0ZW5kcyBFbnRpdHkge1xuXG4gIHVzZWQ6IGJvb2xlYW47XG5cbiAgYmdtOiBudW1iZXI7XG4gIG9yaWdpbmFsQmdtOiBudW1iZXI7XG4gIGxheW91dFdpZHRoOiBudW1iZXI7XG4gIGxheW91dEhlaWdodDogbnVtYmVyO1xuICBhbmltYXRpb246IG51bWJlcjtcbiAgLy8gU2NyZWVuIGluZGljZXMgYXJlIChleHRlbmRlZCA8PCA4IHwgc2NyZWVuKVxuICAvLyBleHRlbmRlZDogbnVtYmVyO1xuICBzY3JlZW5zOiBudW1iZXJbXVtdO1xuXG4gIHRpbGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgdGlsZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gIG9yaWdpbmFsVGlsZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gIHRpbGVzZXQ6IG51bWJlcjtcbiAgdGlsZUVmZmVjdHM6IG51bWJlcjtcblxuICBlbnRyYW5jZXM6IEVudHJhbmNlW107XG4gIGV4aXRzOiBFeGl0W107XG4gIGZsYWdzOiBGbGFnW107XG4gIHBpdHM6IFBpdFtdO1xuXG4gIHNwcml0ZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzcHJpdGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgc3Bhd25zOiBTcGF3bltdO1xuXG4gIHByaXZhdGUgX2lzU2hvcDogYm9vbGVhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX21ldGE/OiBNZXRhbG9jYXRpb24gPSB1bmRlZmluZWQ7XG4gIC8vIExhemlseS1wb3B1bGF0ZWQgbWFwIGtleXMgZm9yIGtlZXBpbmcgY29uc2lzdGVudCBtdXNpYyBhbmQgY29sb3JzLlxuICBwcml2YXRlIF9tdXNpY0dyb3VwPzogc3RyaW5nfHN5bWJvbDtcbiAgcHJpdmF0ZSBfY29sb3JHcm91cD86IHN0cmluZ3xzeW1ib2w7XG5cbiAgY29uc3RydWN0b3Iocm9tOiBSb20sIGlkOiBudW1iZXIsIHJlYWRvbmx5IGRhdGE6IExvY2F0aW9uRGF0YSkge1xuICAgIC8vIHdpbGwgaW5jbHVkZSBib3RoIE1hcERhdGEgKmFuZCogTnBjRGF0YSwgc2luY2UgdGhleSBzaGFyZSBhIGtleS5cbiAgICBzdXBlcihyb20sIGlkKTtcblxuICAgIGNvbnN0IG1hcERhdGFCYXNlID1cbiAgICAgICAgaWQgPj0gMCA/IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhUG9pbnRlcikgKyAweGMwMDAgOiAwO1xuICAgIC8vIFRPRE8gLSBwYXNzIHRoaXMgaW4gYW5kIG1vdmUgTE9DQVRJT05TIHRvIGxvY2F0aW9ucy50c1xuICAgIHRoaXMudXNlZCA9IG1hcERhdGFCYXNlID4gMHhjMDAwICYmICEhdGhpcy5uYW1lO1xuXG4gICAgaWYgKCF0aGlzLnVzZWQpIHtcbiAgICAgIHRoaXMuYmdtID0gdGhpcy5vcmlnaW5hbEJnbSA9IDA7XG4gICAgICB0aGlzLmxheW91dFdpZHRoID0gMDtcbiAgICAgIHRoaXMubGF5b3V0SGVpZ2h0ID0gMDtcbiAgICAgIHRoaXMuYW5pbWF0aW9uID0gMDtcbiAgICAgIC8vIHRoaXMuZXh0ZW5kZWQgPSAwO1xuICAgICAgdGhpcy5zY3JlZW5zID0gW1swXV07XG4gICAgICB0aGlzLnRpbGVQYWxldHRlcyA9IFsweDI0LCAweDAxLCAweDI2XTtcbiAgICAgIHRoaXMub3JpZ2luYWxUaWxlUGFsZXR0ZXMgPSBbMHgyNCwgMHgwMSwgMHgyNl07XG4gICAgICB0aGlzLnRpbGVzZXQgPSAweDgwO1xuICAgICAgdGhpcy50aWxlRWZmZWN0cyA9IDB4YjM7XG4gICAgICB0aGlzLnRpbGVQYXR0ZXJucyA9IFsyLCA0XTtcbiAgICAgIHRoaXMuZXhpdHMgPSBbXTtcbiAgICAgIHRoaXMuZW50cmFuY2VzID0gW107XG4gICAgICB0aGlzLmZsYWdzID0gW107XG4gICAgICB0aGlzLnBpdHMgPSBbXTtcbiAgICAgIHRoaXMuc3Bhd25zID0gW107XG4gICAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID0gWzAsIDBdO1xuICAgICAgdGhpcy5zcHJpdGVQYXR0ZXJucyA9IFswLCAwXTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBsYXlvdXRCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSkgKyAweGMwMDA7XG4gICAgY29uc3QgZ3JhcGhpY3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDIpICsgMHhjMDAwO1xuICAgIGNvbnN0IGVudHJhbmNlc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgNCkgKyAweGMwMDA7XG4gICAgY29uc3QgZXhpdHNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDYpICsgMHhjMDAwO1xuICAgIGNvbnN0IGZsYWdzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyA4KSArIDB4YzAwMDtcblxuICAgIC8vIFJlYWQgdGhlIGV4aXRzIGZpcnN0IHNvIHRoYXQgd2UgY2FuIGRldGVybWluZSBpZiB0aGVyZSdzIGVudHJhbmNlL3BpdHNcbiAgICAvLyBtZXRhZGF0YSBlbmNvZGVkIGF0IHRoZSBlbmQuXG4gICAgbGV0IGhhc1BpdHMgPSB0aGlzLnVzZWQgJiYgbGF5b3V0QmFzZSAhPT0gbWFwRGF0YUJhc2UgKyAxMDtcbiAgICBsZXQgZW50cmFuY2VMZW4gPSBleGl0c0Jhc2UgLSBlbnRyYW5jZXNCYXNlO1xuICAgIHRoaXMuZXhpdHMgPSAoKCkgPT4ge1xuICAgICAgY29uc3QgZXhpdHMgPSBbXTtcbiAgICAgIGxldCBpID0gZXhpdHNCYXNlO1xuICAgICAgd2hpbGUgKCEocm9tLnByZ1tpXSAmIDB4ODApKSB7XG4gICAgICAgIC8vIE5PVEU6IHNldCBkZXN0IHRvIEZGIHRvIGRpc2FibGUgYW4gZXhpdCAoaXQncyBhbiBpbnZhbGlkIGxvY2F0aW9uIGFueXdheSlcbiAgICAgICAgaWYgKHJvbS5wcmdbaSArIDJdICE9IDB4ZmYpIHtcbiAgICAgICAgICBleGl0cy5wdXNoKEV4aXQuZnJvbShyb20ucHJnLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgaSArPSA0O1xuICAgICAgfVxuICAgICAgaWYgKHJvbS5wcmdbaV0gIT09IDB4ZmYpIHtcbiAgICAgICAgaGFzUGl0cyA9ICEhKHJvbS5wcmdbaV0gJiAweDQwKTtcbiAgICAgICAgZW50cmFuY2VMZW4gPSAocm9tLnByZ1tpXSAmIDB4MWYpIDw8IDI7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXhpdHM7XG4gICAgfSkoKTtcblxuICAgIC8vIFRPRE8gLSB0aGVzZSBoZXVyaXN0aWNzIHdpbGwgbm90IHdvcmsgdG8gcmUtcmVhZCB0aGUgbG9jYXRpb25zLlxuICAgIC8vICAgICAgLSB3ZSBjYW4gbG9vayBhdCB0aGUgb3JkZXI6IGlmIHRoZSBkYXRhIGlzIEJFRk9SRSB0aGUgcG9pbnRlcnNcbiAgICAvLyAgICAgICAgdGhlbiB3ZSdyZSBpbiBhIHJld3JpdHRlbiBzdGF0ZTsgaW4gdGhhdCBjYXNlLCB3ZSBuZWVkIHRvIHNpbXBseVxuICAgIC8vICAgICAgICBmaW5kIGFsbCByZWZzIGFuZCBtYXguLi4/XG4gICAgLy8gICAgICAtIGNhbiB3ZSByZWFkIHRoZXNlIHBhcnRzIGxhemlseT9cbiAgICBjb25zdCBwaXRzQmFzZSA9XG4gICAgICAgICFoYXNQaXRzID8gMCA6IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyAxMCkgKyAweGMwMDA7XG5cbiAgICB0aGlzLmJnbSA9IHRoaXMub3JpZ2luYWxCZ20gPSByb20ucHJnW2xheW91dEJhc2VdO1xuICAgIHRoaXMubGF5b3V0V2lkdGggPSByb20ucHJnW2xheW91dEJhc2UgKyAxXTtcbiAgICB0aGlzLmxheW91dEhlaWdodCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDJdO1xuICAgIHRoaXMuYW5pbWF0aW9uID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgM107XG4gICAgLy8gdGhpcy5leHRlbmRlZCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDRdO1xuICAgIGNvbnN0IGV4dGVuZGVkID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgNF0gPyAweDEwMCA6IDA7XG4gICAgdGhpcy5zY3JlZW5zID0gc2VxKFxuICAgICAgICB0aGlzLmhlaWdodCxcbiAgICAgICAgeSA9PiB0dXBsZShyb20ucHJnLCBsYXlvdXRCYXNlICsgNSArIHkgKiB0aGlzLndpZHRoLCB0aGlzLndpZHRoKVxuICAgICAgICAgICAgICAgICAubWFwKHMgPT4gZXh0ZW5kZWQgfCBzKSk7XG4gICAgdGhpcy50aWxlUGFsZXR0ZXMgPSB0dXBsZTxudW1iZXI+KHJvbS5wcmcsIGdyYXBoaWNzQmFzZSwgMyk7XG4gICAgdGhpcy5vcmlnaW5hbFRpbGVQYWxldHRlcyA9IHR1cGxlKHRoaXMudGlsZVBhbGV0dGVzLCAwLCAzKTtcbiAgICB0aGlzLnRpbGVzZXQgPSByb20ucHJnW2dyYXBoaWNzQmFzZSArIDNdO1xuICAgIHRoaXMudGlsZUVmZmVjdHMgPSByb20ucHJnW2dyYXBoaWNzQmFzZSArIDRdO1xuICAgIHRoaXMudGlsZVBhdHRlcm5zID0gdHVwbGUocm9tLnByZywgZ3JhcGhpY3NCYXNlICsgNSwgMik7XG5cbiAgICB0aGlzLmVudHJhbmNlcyA9XG4gICAgICBncm91cCg0LCByb20ucHJnLnNsaWNlKGVudHJhbmNlc0Jhc2UsIGVudHJhbmNlc0Jhc2UgKyBlbnRyYW5jZUxlbiksXG4gICAgICAgICAgICB4ID0+IEVudHJhbmNlLmZyb20oeCkpO1xuICAgIHRoaXMuZmxhZ3MgPSB2YXJTbGljZShyb20ucHJnLCBmbGFnc0Jhc2UsIDIsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IEZsYWcuZnJvbSh4KSk7XG4gICAgdGhpcy5waXRzID0gcGl0c0Jhc2UgPyB2YXJTbGljZShyb20ucHJnLCBwaXRzQmFzZSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IFBpdC5mcm9tKHgpKSA6IFtdO1xuXG4gICAgY29uc3QgbnBjRGF0YUJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubnBjRGF0YVBvaW50ZXIpICsgMHgxMDAwMDtcbiAgICBjb25zdCBoYXNTcGF3bnMgPSBucGNEYXRhQmFzZSAhPT0gMHgxMDAwMDtcbiAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID1cbiAgICAgICAgaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgbnBjRGF0YUJhc2UgKyAxLCAyKSA6IFswLCAwXTtcbiAgICB0aGlzLnNwcml0ZVBhdHRlcm5zID1cbiAgICAgICAgaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgbnBjRGF0YUJhc2UgKyAzLCAyKSA6IFswLCAwXTtcbiAgICB0aGlzLnNwYXducyA9XG4gICAgICAgIGhhc1NwYXducyA/IHZhclNsaWNlKHJvbS5wcmcsIG5wY0RhdGFCYXNlICsgNSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gU3Bhd24uZnJvbSh4KSkgOiBbXTtcbiAgfVxuXG4gIHNldCBtZXRhKG1ldGE6IE1ldGFsb2NhdGlvbikge1xuICAgIHRoaXMuX21ldGEgPSBtZXRhO1xuICB9XG4gIGdldCBtZXRhKCk6IE1ldGFsb2NhdGlvbiB7XG4gICAgdGhpcy5lbnN1cmVNZXRhKCk7XG4gICAgcmV0dXJuIHRoaXMuX21ldGEhO1xuICB9XG4gIGVuc3VyZU1ldGEoKSB7XG4gICAgaWYgKCF0aGlzLl9tZXRhKSB0aGlzLl9tZXRhID0gTWV0YWxvY2F0aW9uLm9mKHRoaXMpO1xuICB9XG5cbiAgc2V0IG11c2ljR3JvdXAoZ3JvdXA6IHN0cmluZ3xzeW1ib2wpIHtcbiAgICB0aGlzLl9tdXNpY0dyb3VwID0gZ3JvdXA7XG4gIH1cbiAgZ2V0IG11c2ljR3JvdXAoKTogc3RyaW5nfHN5bWJvbCB7XG4gICAgdGhpcy5lbnN1cmVNdXNpY0dyb3VwKCk7XG4gICAgcmV0dXJuIHRoaXMuX211c2ljR3JvdXAhO1xuICB9XG4gIGVuc3VyZU11c2ljR3JvdXAoKSB7XG4gICAgaWYgKHRoaXMuX211c2ljR3JvdXAgPT0gbnVsbCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5kYXRhLm11c2ljO1xuICAgICAgdGhpcy5fbXVzaWNHcm91cCA9XG4gICAgICAgICAgdHlwZW9mIGtleSAhPT0gJ251bWJlcicgPyBrZXkgOlxuICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5leGl0c1trZXldLmRlc3RdLm11c2ljR3JvdXA7XG4gICAgfVxuICB9XG5cbiAgc2V0IGNvbG9yR3JvdXAoZ3JvdXA6IHN0cmluZ3xzeW1ib2wpIHtcbiAgICB0aGlzLl9jb2xvckdyb3VwID0gZ3JvdXA7XG4gIH1cbiAgZ2V0IGNvbG9yR3JvdXAoKTogc3RyaW5nfHN5bWJvbCB7XG4gICAgdGhpcy5lbnN1cmVDb2xvckdyb3VwKCk7XG4gICAgcmV0dXJuIHRoaXMuX2NvbG9yR3JvdXAhO1xuICB9XG4gIGVuc3VyZUNvbG9yR3JvdXAoKSB7XG4gICAgaWYgKHRoaXMuX2NvbG9yR3JvdXAgPT0gbnVsbCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5kYXRhLm11c2ljO1xuICAgICAgdGhpcy5fY29sb3JHcm91cCA9XG4gICAgICAgICAgdHlwZW9mIGtleSAhPT0gJ251bWJlcicgPyBrZXkgOlxuICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5leGl0c1trZXldLmRlc3RdLmNvbG9yR3JvdXA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERvIGFsbCB0aGUgaW5pdGlhbGl6YXRpb24gdGhhdCBoYXMgdG8gaGFwcGVuIGFmdGVyIGFsbCBsb2NhdGlvbnNcbiAgICogaGF2ZSBiZWVuIGNvbnN0cnVjdGVkLlxuICAgKi9cbiAgbGF6eUluaXRpYWxpemF0aW9uKCkge1xuICAgIHRoaXMuZW5zdXJlTWV0YSgpO1xuICAgIHRoaXMuZW5zdXJlTXVzaWNHcm91cCgpO1xuICAgIHRoaXMuZW5zdXJlQ29sb3JHcm91cCgpO1xuICB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLm5hbWU7XG4gIH1cblxuICBnZXQgbWFwRGF0YVBvaW50ZXIoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5pZCA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gbWFwZGF0YSBwb2ludGVyIGZvciAke3RoaXMubmFtZX1gKTtcbiAgICByZXR1cm4gMHgxNDMwMCArICh0aGlzLmlkIDw8IDEpO1xuICB9XG5cbiAgZ2V0IG5wY0RhdGFQb2ludGVyKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuaWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG5wY2RhdGEgcG9pbnRlciBmb3IgJHt0aGlzLm5hbWV9YCk7XG4gICAgcmV0dXJuIDB4MTkyMDEgKyAodGhpcy5pZCA8PCAxKTtcbiAgfVxuXG4gIGdldCBoYXNTcGF3bnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3Bhd25zLmxlbmd0aCA+IDA7XG4gIH1cblxuICAvLyAvLyBPZmZzZXQgdG8gT1Igd2l0aCBzY3JlZW4gSURzLlxuICAvLyBnZXQgc2NyZWVuUGFnZSgpOiBudW1iZXIge1xuICAvLyAgIGlmICghdGhpcy5yb20uY29tcHJlc3NlZE1hcERhdGEpIHJldHVybiB0aGlzLmV4dGVuZGVkID8gMHgxMDAgOiAwO1xuICAvLyAgIHJldHVybiB0aGlzLmV4dGVuZGVkIDw8IDg7XG4gIC8vIH1cblxuICBtYXBQbGFuZSgpOiBudW1iZXIge1xuICAgIGNvbnN0IHNldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHRoaXMuc2NyZWVucykge1xuICAgICAgZm9yIChjb25zdCBzIG9mIHJvdykge1xuICAgICAgICBzZXQuYWRkKHMgPj4+IDgpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2V0LnNpemUgIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSBzY3JlZW4gcGFnZTogJHtbLi4uc2V0XS5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgICByZXR1cm4gc2V0W1N5bWJvbC5pdGVyYXRvcl0oKS5uZXh0KCkudmFsdWU7XG4gIH1cblxuICBpc1Nob3AoKTogYm9vbGVhbiB7XG4gICAgLy9yZXR1cm4gdGhpcy5yb20uc2hvcHMuZmluZEluZGV4KHMgPT4gcy5sb2NhdGlvbiA9PT0gdGhpcy5pZCkgPj0gMDtcbiAgICBpZiAodGhpcy5faXNTaG9wID09IG51bGwpIHtcbiAgICAgIHRoaXMuX2lzU2hvcCA9IHRoaXMucm9tLnNob3BzLmZpbmRJbmRleChzID0+IHMubG9jYXRpb24gPT09IHRoaXMuaWQpID49IDA7XG4gICAgICAvLyBOT1RFOiBzYWhhcmEgcGF3biBzaG9wIGlzIG5vdCBhY3R1YWxseSBpbiB0aGUgdGFibGUgKHBhd24gc2hvcHMgZG9uJ3RcbiAgICAgIC8vIHN0cmljdGx5IG5lZWQgdG8gYmUpISAgVE9ETyAtIGhhbmRsZSB0aGlzIGJldHRlci5cbiAgICAgIGlmICh0aGlzLmlkID09PSAweGZiKSB0aGlzLl9pc1Nob3AgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faXNTaG9wO1xuICB9XG5cbiAgLy9zZXRJc1Nob3AoaXNTaG9wOiBib29sZWFuKSB7IHRoaXMuX2lzU2hvcCA9IGlzU2hvcDsgfVxuXG4gIHNwYXduKGlkOiBudW1iZXIpOiBTcGF3biB7XG4gICAgY29uc3Qgc3Bhd24gPSB0aGlzLnNwYXduc1tpZCAtIDB4ZF07XG4gICAgaWYgKCFzcGF3bikgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBzcGF3biAkJHtoZXgoaWQpfWApO1xuICAgIHJldHVybiBzcGF3bjtcbiAgfVxuXG4gIGdldCB3aWR0aCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sYXlvdXRXaWR0aCArIDE7IH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIpIHsgdGhpcy5sYXlvdXRXaWR0aCA9IHdpZHRoIC0gMTsgfVxuXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubGF5b3V0SGVpZ2h0ICsgMTsgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7IHRoaXMubGF5b3V0SGVpZ2h0ID0gaGVpZ2h0IC0gMTsgfVxuXG4gIGZpbmRPckFkZEVudHJhbmNlKHNjcmVlbjogbnVtYmVyLCBjb29yZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZW50cmFuY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBlbnRyYW5jZSA9IHRoaXMuZW50cmFuY2VzW2ldO1xuICAgICAgaWYgKGVudHJhbmNlLnNjcmVlbiA9PT0gc2NyZWVuICYmIGVudHJhbmNlLmNvb3JkID09PSBjb29yZCkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHRoaXMuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3NjcmVlbiwgY29vcmR9KSk7XG4gICAgcmV0dXJuIHRoaXMuZW50cmFuY2VzLmxlbmd0aCAtIDE7XG4gIH1cblxuICAvLyBtb25zdGVycygpIHtcbiAgLy8gICBpZiAoIXRoaXMuc3Bhd25zKSByZXR1cm4gW107XG4gIC8vICAgcmV0dXJuIHRoaXMuc3Bhd25zLmZsYXRNYXAoXG4gIC8vICAgICAoWywsIHR5cGUsIGlkXSwgc2xvdCkgPT5cbiAgLy8gICAgICAgdHlwZSAmIDcgfHwgIXRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdID8gW10gOiBbXG4gIC8vICAgICAgICAgW3RoaXMuaWQsXG4gIC8vICAgICAgICAgIHNsb3QgKyAweDBkLFxuICAvLyAgICAgICAgICB0eXBlICYgMHg4MCA/IDEgOiAwLFxuICAvLyAgICAgICAgICBpZCArIDB4NTAsXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGF0dGVybnNbdHlwZSAmIDB4ODAgPyAxIDogMF0sXG4gIC8vICAgICAgICAgIHRoaXMucm9tLnNwYXduc1tpZCArIDB4NTBdLnBhbGV0dGVzKClbMF0sXG4gIC8vICAgICAgICAgIHRoaXMuc3ByaXRlUGFsZXR0ZXNbdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSAtIDJdLFxuICAvLyAgICAgICAgIF1dKTtcbiAgLy8gfVxuXG4gIGFzc2VtYmxlKGE6IEFzc2VtYmxlcikge1xuICAgIGlmICghdGhpcy51c2VkKSByZXR1cm47XG4gICAgY29uc3QgaWQgPSB0aGlzLmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpO1xuICAgIC8vIGNvbnN0ICRsYXlvdXQgPSBgTGF5b3V0XyR7aWR9YDtcbiAgICAvLyBjb25zdCAkZ3JhcGhpY3MgPSBgR3JhcGhpY3NfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRlbnRyYW5jZXMgPSBgRW50cmFuY2VzXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkZXhpdHMgPSBgRXhpdHNfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRmbGFncyA9IGBGbGFnc18ke2lkfWA7XG4gICAgLy8gY29uc3QgJHBpdHMgPSBgUGl0c18ke2lkfWA7XG4gICAgLy8gY29uc3QgJG1hcGRhdGEgPSBgTWFwRGF0YV8ke2lkfWA7XG4gICAgLy8gY29uc3QgJG5wY2RhdGEgPSBgTnBjRGF0YV8ke2lkfWA7XG5cbiAgICBjb25zdCBzcHJpdGVQYWwgPSB0aGlzLnNwYXducy5sZW5ndGggPyB0aGlzLnNwcml0ZVBhbGV0dGVzIDogWzB4ZmYsIDB4ZmZdO1xuICAgIGNvbnN0IHNwcml0ZVBhdCA9IHRoaXMuc3Bhd25zLmxlbmd0aCA/IHRoaXMuc3ByaXRlUGF0dGVybnMgOiBbMHhmZiwgMHhmZl07XG4gICAgY29uc3QgbWFwRGF0YTogRXhwcltdID0gW107XG4gICAgLy8gd3JpdGUgTlBDIGRhdGEgZmlyc3QsIGlmIHByZXNlbnQuLi5cbiAgICBjb25zdCBucGNEYXRhID0gWzAsIC4uLnNwcml0ZVBhbCwgLi4uc3ByaXRlUGF0LFxuICAgICAgICAgICAgICAgICAgICAgLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuc3Bhd25zKSwgMHhmZl07XG4gICAgYS5zZWdtZW50KCcwYycsICcwZCcpO1xuICAgIGEucmVsb2MoYE5wY0RhdGFfJHtpZH1gKTtcbiAgICBjb25zdCAkbnBjRGF0YSA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4ubnBjRGF0YSk7XG4gICAgYS5vcmcoMHg5MjAxICsgKHRoaXMuaWQgPDwgMSksIGBOcGNEYXRhXyR7aWR9X1B0cmApO1xuICAgIGEud29yZCgkbnBjRGF0YSk7XG5cbiAgICAvLyB3aXRlIG1hcGRhdGFcbiAgICBhLnNlZ21lbnQoJzBhJywgJzBiJyk7XG4gICAgLy9jb25zdCBleHQgPSBuZXcgU2V0KHRoaXMuc2NyZWVucy5tYXAocyA9PiBzID4+IDgpKTtcbiAgICBjb25zdCBzY3JlZW5zID0gW107XG4gICAgZm9yIChjb25zdCBzIG9mIGNvbmNhdEl0ZXJhYmxlcyh0aGlzLnNjcmVlbnMpKSB7XG4gICAgICBzY3JlZW5zLnB1c2gocyAmIDB4ZmYpO1xuICAgIH1cbiAgICBjb25zdCBsYXlvdXQgPSB0aGlzLnJvbS5jb21wcmVzc2VkTWFwRGF0YSA/IFtcbiAgICAgIHRoaXMuYmdtLFxuICAgICAgLy8gQ29tcHJlc3NlZCB2ZXJzaW9uOiB5eCBpbiBvbmUgYnl0ZSwgZXh0K2FuaW0gaW4gb25lIGJ5dGVcbiAgICAgIHRoaXMubGF5b3V0SGVpZ2h0IDw8IDQgfCB0aGlzLmxheW91dFdpZHRoLFxuICAgICAgdGhpcy5tYXBQbGFuZSgpIDw8IDIgfCB0aGlzLmFuaW1hdGlvbiwgLi4uc2NyZWVucyxcbiAgICBdIDogW1xuICAgICAgdGhpcy5iZ20sIHRoaXMubGF5b3V0V2lkdGgsIHRoaXMubGF5b3V0SGVpZ2h0LFxuICAgICAgdGhpcy5hbmltYXRpb24sIHRoaXMubWFwUGxhbmUoKSA/IDB4ODAgOiAwLCAuLi5zY3JlZW5zLFxuICAgIF07XG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9MYXlvdXRgKTtcbiAgICBjb25zdCAkbGF5b3V0ID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi5sYXlvdXQpO1xuICAgIG1hcERhdGEucHVzaCgkbGF5b3V0KTtcblxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fR3JhcGhpY3NgKTtcbiAgICBjb25zdCAkZ3JhcGhpY3MgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLnRoaXMudGlsZVBhbGV0dGVzLFxuICAgICAgICAgICB0aGlzLnRpbGVzZXQsIHRoaXMudGlsZUVmZmVjdHMsXG4gICAgICAgICAgIC4uLnRoaXMudGlsZVBhdHRlcm5zKTtcbiAgICBtYXBEYXRhLnB1c2goJGdyYXBoaWNzKTtcblxuICAgIC8vIFF1aWNrIHNhbml0eSBjaGVjazogaWYgYW4gZW50cmFuY2UvZXhpdCBpcyBiZWxvdyB0aGUgSFVEIG9uIGFcbiAgICAvLyBub24tdmVydGljYWxseSBzY3JvbGxpbmcgbWFwLCB0aGVuIHdlIG5lZWQgdG8gbW92ZSBpdCB1cFxuICAgIC8vIE5PVEU6IHRoaXMgaXMgaWRlbXBvdGVudC4uXG4gICAgaWYgKHRoaXMuaGVpZ2h0ID09PSAxKSB7XG4gICAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICAgIGlmICghZW50cmFuY2UudXNlZCkgY29udGludWU7XG4gICAgICAgIGlmIChlbnRyYW5jZS55ID4gMHhiZikgZW50cmFuY2UueSA9IDB4YmY7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0cykge1xuICAgICAgICBpZiAoZXhpdC55dCA+IDB4MGMpIGV4aXQueXQgPSAweDBjO1xuICAgICAgfVxuICAgIH1cbiAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9X0VudHJhbmNlc2ApO1xuICAgIGNvbnN0ICRlbnRyYW5jZXMgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmVudHJhbmNlcykpO1xuICAgIG1hcERhdGEucHVzaCgkZW50cmFuY2VzKTtcblxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fRXhpdHNgKTtcbiAgICBjb25zdCAkZXhpdHMgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmV4aXRzKSxcbiAgICAgICAgICAgMHg4MCB8ICh0aGlzLnBpdHMubGVuZ3RoID8gMHg0MCA6IDApIHwgdGhpcy5lbnRyYW5jZXMubGVuZ3RoKTtcbiAgICBtYXBEYXRhLnB1c2goJGV4aXRzKTtcblxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fRmxhZ3NgKTtcbiAgICBjb25zdCAkZmxhZ3MgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLmNvbmNhdEl0ZXJhYmxlcyh0aGlzLmZsYWdzKSwgMHhmZik7XG4gICAgbWFwRGF0YS5wdXNoKCRmbGFncyk7XG5cbiAgICBjb25zdCBwaXRzID0gY29uY2F0SXRlcmFibGVzKHRoaXMucGl0cyk7XG4gICAgaWYgKHBpdHMubGVuZ3RoKSB7XG4gICAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9X1BpdHNgKTtcbiAgICAgIGNvbnN0ICRwaXRzID0gYS5wYygpO1xuICAgICAgYS5ieXRlKC4uLnBpdHMpO1xuICAgICAgbWFwRGF0YS5wdXNoKCRwaXRzKTtcbiAgICB9XG5cbiAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9YCk7XG4gICAgY29uc3QgJG1hcERhdGEgPSBhLnBjKCk7XG4gICAgYS53b3JkKC4uLm1hcERhdGEpO1xuXG4gICAgYS5vcmcoMHg4MzAwICsgKHRoaXMuaWQgPDwgMSksIGBNYXBEYXRhXyR7aWR9X1B0cmApO1xuICAgIGEud29yZCgkbWFwRGF0YSk7XG5cbiAgICAvLyBJZiB0aGlzIGlzIGEgYm9zcyByb29tLCB3cml0ZSB0aGUgcmVzdG9yYXRpb24uXG4gICAgY29uc3QgYm9zc0lkID0gdGhpcy5ib3NzSWQoKTtcbiAgICBpZiAoYm9zc0lkICE9IG51bGwgJiYgdGhpcy5pZCAhPT0gMHg1ZikgeyAvLyBkb24ndCByZXN0b3JlIGR5bmFcbiAgICAgIC8vIFRoaXMgdGFibGUgc2hvdWxkIHJlc3RvcmUgcGF0MCBidXQgbm90IHBhdDFcbiAgICAgIGxldCBwYXRzID0gW3Nwcml0ZVBhdFswXSwgdW5kZWZpbmVkXTtcbiAgICAgIGlmICh0aGlzLmlkID09PSAweGE2KSBwYXRzID0gWzB4NTMsIDB4NTBdOyAvLyBkcmF5Z29uIDJcbiAgICAgIGNvbnN0IGJvc3NCYXNlID0gdGhpcy5yb20uYm9zc0tpbGxzW2Jvc3NJZF0uYmFzZTtcbiAgICAgIC8vIFNldCB0aGUgXCJyZXN0b3JlIG11c2ljXCIgYnl0ZSBmb3IgdGhlIGJvc3MsIGJ1dCBpZiBpdCdzIERyYXlnb24gMiwgc2V0XG4gICAgICAvLyBpdCB0byB6ZXJvIHNpbmNlIG5vIG11c2ljIGlzIGFjdHVhbGx5IHBsYXlpbmcsIGFuZCBpZiB0aGUgbXVzaWMgaW4gdGhlXG4gICAgICAvLyB0ZWxlcG9ydGVyIHJvb20gaGFwcGVucyB0byBiZSB0aGUgc2FtZSBhcyB0aGUgbXVzaWMgaW4gdGhlIGNyeXB0LCB0aGVuXG4gICAgICAvLyByZXNldHRpbmcgdG8gdGhhdCBtZWFucyBpdCB3aWxsIGp1c3QgcmVtYWluIHNpbGVudCwgYW5kIG5vdCByZXN0YXJ0LlxuICAgICAgY29uc3QgcmVzdG9yZUJnbSA9IHRoaXMuaWQgPT09IDB4YTYgPyAwIDogdGhpcy5iZ207XG4gICAgICBjb25zdCBib3NzUmVzdG9yZSA9IFtcbiAgICAgICAgLCwsIHJlc3RvcmVCZ20sLFxuICAgICAgICAuLi50aGlzLnRpbGVQYWxldHRlcywsLCwgdGhpcy5zcHJpdGVQYWxldHRlc1swXSwsXG4gICAgICAgICwsLCwgLypwYXRzWzBdKi8sIC8qcGF0c1sxXSovLFxuICAgICAgICB0aGlzLmFuaW1hdGlvbixcbiAgICAgIF07XG4gICAgICBjb25zdCBbXSA9IFtwYXRzXTsgLy8gYXZvaWQgZXJyb3JcblxuICAgICAgLy8gaWYgKHJlYWRMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgYm9zc0Jhc2UpID09PSAweGJhOTgpIHtcbiAgICAgIC8vICAgLy8gZXNjYXBlIGFuaW1hdGlvbjogZG9uJ3QgY2xvYmJlciBwYXR0ZXJucyB5ZXQ/XG4gICAgICAvLyB9XG4gICAgICBhLnNlZ21lbnQoJzBmJyk7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJvc3NSZXN0b3JlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGNvbnN0IHJlc3RvcmVkID0gYm9zc1Jlc3RvcmVbal07XG4gICAgICAgIGlmIChyZXN0b3JlZCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgYS5vcmcoYm9zc0Jhc2UgKyBqLCBgQm9zc18ke2Jvc3NJZH1fJHtqfWApO1xuICAgICAgICBhLmJ5dGUocmVzdG9yZWQpO1xuICAgICAgfVxuICAgICAgLy8gbGF0ZXIgc3BvdCBmb3IgcGFsMyBhbmQgcGF0MSAqYWZ0ZXIqIGV4cGxvc2lvblxuICAgICAgY29uc3QgYm9zc0Jhc2UyID0gMHhiN2MxICsgNSAqIGJvc3NJZDsgLy8gMWY3YzFcbiAgICAgIGEub3JnKGJvc3NCYXNlMiwgYEJvc3NfJHtib3NzSWR9X1Bvc3RgKTtcbiAgICAgIGEuYnl0ZShzcHJpdGVQYWxbMV0pO1xuICAgICAgLy8gTk9URTogVGhpcyBydWlucyB0aGUgdHJlYXN1cmUgY2hlc3QuXG4gICAgICAvLyBUT0RPIC0gYWRkIHNvbWUgYXNtIGFmdGVyIGEgY2hlc3QgaXMgY2xlYXJlZCB0byByZWxvYWQgcGF0dGVybnM/XG4gICAgICAvLyBBbm90aGVyIG9wdGlvbiB3b3VsZCBiZSB0byBhZGQgYSBsb2NhdGlvbi1zcGVjaWZpYyBjb250cmFpbnQgdG8gYmVcbiAgICAgIC8vIHdoYXRldmVyIHRoZSBib3NzIFxuICAgICAgLy93cml0ZXIucm9tW2Jvc3NCYXNlMiArIDFdID0gdGhpcy5zcHJpdGVQYXR0ZXJuc1sxXTtcbiAgICB9XG4gIH1cblxuICBhbGxTY3JlZW5zKCk6IFNldDxTY3JlZW4+IHtcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IFNldDxTY3JlZW4+KCk7XG4gICAgZm9yIChjb25zdCByb3cgb2YgdGhpcy5zY3JlZW5zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiByb3cpIHtcbiAgICAgICAgc2NyZWVucy5hZGQodGhpcy5yb20uc2NyZWVuc1tzY3JlZW5dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNjcmVlbnM7XG4gIH1cblxuICBib3NzSWQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MGU7IGkrKykge1xuICAgICAgaWYgKHRoaXMucm9tLnByZ1sweDFmOTVkICsgaV0gPT09IHRoaXMuaWQpIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gbmVpZ2hib3JzKGpvaW5OZXh1c2VzOiBib29sZWFuID0gZmFsc2UpOiBTZXQ8TG9jYXRpb24+IHtcbiAgLy8gICBjb25zdCBvdXQgPSBuZXcgU2V0PExvY2F0aW9uPigpO1xuICAvLyAgIGNvbnN0IGFkZE5laWdoYm9ycyA9IChsOiBMb2NhdGlvbikgPT4ge1xuICAvLyAgICAgZm9yIChjb25zdCBleGl0IG9mIGwuZXhpdHMpIHtcbiAgLy8gICAgICAgY29uc3QgaWQgPSBleGl0LmRlc3Q7XG4gIC8vICAgICAgIGNvbnN0IG5laWdoYm9yID0gdGhpcy5yb20ubG9jYXRpb25zW2lkXTtcbiAgLy8gICAgICAgaWYgKG5laWdoYm9yICYmIG5laWdoYm9yLnVzZWQgJiZcbiAgLy8gICAgICAgICAgIG5laWdoYm9yICE9PSB0aGlzICYmICFvdXQuaGFzKG5laWdoYm9yKSkge1xuICAvLyAgICAgICAgIG91dC5hZGQobmVpZ2hib3IpO1xuICAvLyAgICAgICAgIGlmIChqb2luTmV4dXNlcyAmJiBORVhVU0VTW25laWdoYm9yLmtleV0pIHtcbiAgLy8gICAgICAgICAgIGFkZE5laWdoYm9ycyhuZWlnaGJvcik7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIGFkZE5laWdoYm9ycyh0aGlzKTtcbiAgLy8gICByZXR1cm4gb3V0O1xuICAvLyB9XG5cbiAgaGFzRG9scGhpbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pZCA9PT0gMHg2MCB8fCB0aGlzLmlkID09PSAweDY0IHx8IHRoaXMuaWQgPT09IDB4Njg7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybiBNYXAgb2YgdGlsZXMgKCRZWHl4KSByZWFjaGFibGUgZnJvbSBhbnkgZW50cmFuY2UgdG9cbiAgICogdW5mbGFnZ2VkIHRpbGVlZmZlY3RzLlxuICAgKi9cbiAgcmVhY2hhYmxlVGlsZXMoZmx5ID0gZmFsc2UpOiBNYXA8bnVtYmVyLCBudW1iZXI+IHtcbiAgICAvLyBUT0RPIC0gYXJncyBmb3IgKDEpIHVzZSBub24tMmVmIGZsYWdzLCAoMikgb25seSBmcm9tIGdpdmVuIGVudHJhbmNlL3RpbGVcbiAgICAvLyBEb2xwaGluIG1ha2VzIE5PX1dBTEsgb2theSBmb3Igc29tZSBsZXZlbHMuXG4gICAgaWYgKHRoaXMuaGFzRG9scGhpbigpKSBmbHkgPSB0cnVlO1xuICAgIC8vIFRha2UgaW50byBhY2NvdW50IHRoZSB0aWxlc2V0IGFuZCBmbGFncyBidXQgbm90IGFueSBvdmVybGF5LlxuICAgIGNvbnN0IGV4aXRzID0gbmV3IFNldCh0aGlzLmV4aXRzLm1hcChleGl0ID0+IGV4aXQuc2NyZWVuIDw8IDggfCBleGl0LnRpbGUpKTtcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0c1t0aGlzLnRpbGVzZXRdO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbdGhpcy50aWxlRWZmZWN0cyAtIDB4YjNdO1xuICAgIGNvbnN0IHBhc3NhYmxlID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmhlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSB0aGlzLnNjcmVlbnNbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMud2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Jvd1t4XV07XG4gICAgICAgIGNvbnN0IHBvcyA9IHkgPDwgNCB8IHg7XG4gICAgICAgIGNvbnN0IGZsYWcgPSB0aGlzLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gcG9zKTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWxlSWQgPSBwb3MgPDwgOCB8IHQ7XG4gICAgICAgICAgaWYgKGV4aXRzLmhhcyh0aWxlSWQpKSBjb250aW51ZTsgLy8gZG9uJ3QgZ28gcGFzdCBleGl0c1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBsZXQgZWZmZWN0cyA9IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgbGV0IGJsb2NrZWQgPSBmbHkgPyBlZmZlY3RzICYgMHgwNCA6IGVmZmVjdHMgJiAweDA2O1xuICAgICAgICAgIGlmIChmbGFnICYmIGJsb2NrZWQgJiYgdGlsZSA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdICE9IHRpbGUpIHtcbiAgICAgICAgICAgIHRpbGUgPSB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV07XG4gICAgICAgICAgICBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICAgIGJsb2NrZWQgPSBmbHkgPyBlZmZlY3RzICYgMHgwNCA6IGVmZmVjdHMgJiAweDA2O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWJsb2NrZWQpIHBhc3NhYmxlLmFkZCh0aWxlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChsZXQgdCBvZiBwYXNzYWJsZSkge1xuICAgICAgY29uc3QgcmlnaHQgPSAodCAmIDB4MGYpID09PSAweDBmID8gdCArIDB4ZjEgOiB0ICsgMTtcbiAgICAgIGlmIChwYXNzYWJsZS5oYXMocmlnaHQpKSB1Zi51bmlvbihbdCwgcmlnaHRdKTtcbiAgICAgIGNvbnN0IGJlbG93ID0gKHQgJiAweGYwKSA9PT0gMHhlMCA/IHQgKyAweGYyMCA6IHQgKyAxNjtcbiAgICAgIGlmIChwYXNzYWJsZS5oYXMoYmVsb3cpKSB1Zi51bmlvbihbdCwgYmVsb3ddKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXAgPSB1Zi5tYXAoKTtcbiAgICBjb25zdCBzZXRzID0gbmV3IFNldDxTZXQ8bnVtYmVyPj4oKTtcbiAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHRoaXMuZW50cmFuY2VzKSB7XG4gICAgICBpZiAoIWVudHJhbmNlLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWQgPSBlbnRyYW5jZS5zY3JlZW4gPDwgOCB8IGVudHJhbmNlLnRpbGU7XG4gICAgICAvLyBOT1RFOiBtYXAgc2hvdWxkIGFsd2F5cyBoYXZlIGlkLCBidXQgYm9ndXMgZW50cmFuY2VzXG4gICAgICAvLyAoZS5nLiBHb2EgVmFsbGV5IGVudHJhbmNlIDIpIGNhbiBjYXVzZSBwcm9ibGVtcy5cbiAgICAgIHNldHMuYWRkKG1hcC5nZXQoaWQpIHx8IG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IHNldCBvZiBzZXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHQgb2Ygc2V0KSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHgwZl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbc2NyXTtcbiAgICAgICAgb3V0LnNldCh0LCB0aWxlRWZmZWN0cy5lZmZlY3RzW3NjcmVlbi50aWxlc1t0ICYgMHhmZl1dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIC8qKiBTYWZlciB2ZXJzaW9uIG9mIHRoZSBiZWxvdz8gKi9cbiAgc2NyZWVuTW92ZXIoKTogKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB2b2lkIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIEFycmF5PHtzY3JlZW46IG51bWJlcn0+PigoKSA9PiBbXSk7XG4gICAgY29uc3Qgb2JqcyA9XG4gICAgICAgIGl0ZXJzLmNvbmNhdDx7c2NyZWVuOiBudW1iZXJ9Pih0aGlzLnNwYXducywgdGhpcy5leGl0cywgdGhpcy5lbnRyYW5jZXMpO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIG9ianMpIHtcbiAgICAgIG1hcC5nZXQob2JqLnNjcmVlbikucHVzaChvYmopO1xuICAgIH1cbiAgICByZXR1cm4gKG9yaWc6IG51bWJlciwgcmVwbDogbnVtYmVyKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG9iaiBvZiBtYXAuZ2V0KG9yaWcpKSB7XG4gICAgICAgIG9iai5zY3JlZW4gPSByZXBsO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYWxsIHNwYXducywgZW50cmFuY2VzLCBhbmQgZXhpdHMuXG4gICAqIEBwYXJhbSBvcmlnIFlYIG9mIHRoZSBvcmlnaW5hbCBzY3JlZW4uXG4gICAqIEBwYXJhbSByZXBsIFlYIG9mIHRoZSBlcXVpdmFsZW50IHJlcGxhY2VtZW50IHNjcmVlbi5cbiAgICovXG4gIG1vdmVTY3JlZW4ob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgaWYgKG9iai5zY3JlZW4gPT09IG9yaWcpIG9iai5zY3JlZW4gPSByZXBsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gLSBmYWN0b3IgdGhpcyBvdXQgaW50byBhIHNlcGFyYXRlIGNsYXNzP1xuICAvLyAgIC0gaG9sZHMgbWV0YWRhdGEgYWJvdXQgbWFwIHRpbGVzIGluIGdlbmVyYWw/XG4gIC8vICAgLSBuZWVkIHRvIGZpZ3VyZSBvdXQgd2hhdCB0byBkbyB3aXRoIHBpdHMuLi5cbiAgbW9uc3RlclBsYWNlcihyYW5kb206IFJhbmRvbSk6IChtOiBNb25zdGVyKSA9PiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIC8vIElmIHRoZXJlJ3MgYSBib3NzIHNjcmVlbiwgZXhjbHVkZSBpdCBmcm9tIGdldHRpbmcgZW5lbWllcy5cbiAgICBjb25zdCBib3NzID0gdGhpcy5kYXRhLmJvc3NTY3JlZW47XG4gICAgLy8gU3RhcnQgd2l0aCBsaXN0IG9mIHJlYWNoYWJsZSB0aWxlcy5cbiAgICBjb25zdCByZWFjaGFibGUgPSB0aGlzLnJlYWNoYWJsZVRpbGVzKGZhbHNlKTtcbiAgICAvLyBEbyBhIGJyZWFkdGgtZmlyc3Qgc2VhcmNoIG9mIGFsbCB0aWxlcyB0byBmaW5kIFwiZGlzdGFuY2VcIiAoMS1ub3JtKS5cbiAgICBjb25zdCBmYXIgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPihbLi4ucmVhY2hhYmxlLmtleXMoKV0ubWFwKHggPT4gW3gsIDBdKSk7XG4gICAgY29uc3Qgbm9ybWFsOiBudW1iZXJbXSA9IFtdOyAvLyByZWFjaGFibGUsIG5vdCBzbG9wZSBvciB3YXRlclxuICAgIGNvbnN0IG1vdGhzOiBudW1iZXJbXSA9IFtdOyAgLy8gZGlzdGFuY2Ug4oiIIDMuLjdcbiAgICBjb25zdCBiaXJkczogbnVtYmVyW10gPSBbXTsgIC8vIGRpc3RhbmNlID4gMTJcbiAgICBjb25zdCBwbGFudHM6IG51bWJlcltdID0gW107IC8vIGRpc3RhbmNlIOKIiCAyLi40XG4gICAgY29uc3QgcGxhY2VkOiBBcnJheTxbTW9uc3RlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl0+ID0gW107XG4gICAgY29uc3Qgbm9ybWFsVGVycmFpbk1hc2sgPSB0aGlzLmhhc0RvbHBoaW4oKSA/IDB4MjUgOiAweDI3O1xuICAgIGZvciAoY29uc3QgW3QsIGRpc3RhbmNlXSBvZiBmYXIpIHtcbiAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1t0ID4+PiAxMl1bKHQgPj4+IDgpICYgMHhmXTtcbiAgICAgIGlmIChzY3IgPT09IGJvc3MpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBuIG9mIG5laWdoYm9ycyh0LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCkpIHtcbiAgICAgICAgaWYgKGZhci5oYXMobikpIGNvbnRpbnVlO1xuICAgICAgICBmYXIuc2V0KG4sIGRpc3RhbmNlICsgMSk7XG4gICAgICB9XG4gICAgICBpZiAoIWRpc3RhbmNlICYmICEocmVhY2hhYmxlLmdldCh0KSEgJiBub3JtYWxUZXJyYWluTWFzaykpIG5vcm1hbC5wdXNoKHQpO1xuICAgICAgaWYgKHRoaXMuaWQgPT09IDB4MWEpIHtcbiAgICAgICAgLy8gU3BlY2lhbC1jYXNlIHRoZSBzd2FtcCBmb3IgcGxhbnQgcGxhY2VtZW50XG4gICAgICAgIGlmICh0aGlzLnJvbS5zY3JlZW5zW3Njcl0udGlsZXNbdCAmIDB4ZmZdID09PSAweGYwKSBwbGFudHMucHVzaCh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChkaXN0YW5jZSA+PSAyICYmIGRpc3RhbmNlIDw9IDQpIHBsYW50cy5wdXNoKHQpO1xuICAgICAgfVxuICAgICAgaWYgKGRpc3RhbmNlID49IDMgJiYgZGlzdGFuY2UgPD0gNykgbW90aHMucHVzaCh0KTtcbiAgICAgIGlmIChkaXN0YW5jZSA+PSAxMikgYmlyZHMucHVzaCh0KTtcbiAgICAgIC8vIFRPRE8gLSBzcGVjaWFsLWNhc2Ugc3dhbXAgZm9yIHBsYW50IGxvY2F0aW9ucz9cbiAgICB9XG4gICAgLy8gV2Ugbm93IGtub3cgYWxsIHRoZSBwb3NzaWJsZSBwbGFjZXMgdG8gcGxhY2UgdGhpbmdzLlxuICAgIC8vICAtIE5PVEU6IHN0aWxsIG5lZWQgdG8gbW92ZSBjaGVzdHMgdG8gZGVhZCBlbmRzLCBldGM/XG4gICAgcmV0dXJuIChtOiBNb25zdGVyKSA9PiB7XG4gICAgICAvLyBjaGVjayBmb3IgcGxhY2VtZW50LlxuICAgICAgY29uc3QgcGxhY2VtZW50ID0gbS5wbGFjZW1lbnQoKTtcbiAgICAgIGNvbnN0IHBvb2wgPSBbLi4uKHBsYWNlbWVudCA9PT0gJ25vcm1hbCcgPyBub3JtYWwgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAnbW90aCcgPyBtb3RocyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdiaXJkJyA/IGJpcmRzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ3BsYW50JyA/IHBsYW50cyA6XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnROZXZlcihwbGFjZW1lbnQpKV1cbiAgICAgIFBPT0w6XG4gICAgICB3aGlsZSAocG9vbC5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgaSA9IHJhbmRvbS5uZXh0SW50KHBvb2wubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgW3Bvc10gPSBwb29sLnNwbGljZShpLCAxKTtcblxuICAgICAgICBjb25zdCB4ID0gKHBvcyAmIDB4ZjAwKSA+Pj4gNCB8IChwb3MgJiAweGYpO1xuICAgICAgICBjb25zdCB5ID0gKHBvcyAmIDB4ZjAwMCkgPj4+IDggfCAocG9zICYgMHhmMCkgPj4+IDQ7XG4gICAgICAgIGNvbnN0IHIgPSBtLmNsZWFyYW5jZSgpO1xuXG4gICAgICAgIC8vIHRlc3QgZGlzdGFuY2UgZnJvbSBvdGhlciBlbmVtaWVzLlxuICAgICAgICBmb3IgKGNvbnN0IFssIHgxLCB5MSwgcjFdIG9mIHBsYWNlZCkge1xuICAgICAgICAgIGNvbnN0IHoyID0gKCh5IC0geTEpICoqIDIgKyAoeCAtIHgxKSAqKiAyKTtcbiAgICAgICAgICBpZiAoejIgPCAociArIHIxKSAqKiAyKSBjb250aW51ZSBQT09MO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRlc3QgZGlzdGFuY2UgZnJvbSBlbnRyYW5jZXMuXG4gICAgICAgIGZvciAoY29uc3Qge3g6IHgxLCB5OiB5MSwgdXNlZH0gb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgICAgICBpZiAoIXVzZWQpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IHoyID0gKCh5IC0gKHkxID4+IDQpKSAqKiAyICsgKHggLSAoeDEgPj4gNCkpICoqIDIpO1xuICAgICAgICAgIGlmICh6MiA8IChyICsgMSkgKiogMikgY29udGludWUgUE9PTDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZhbGlkIHNwb3QgKHN0aWxsLCBob3cgdG9hIGFwcHJveGltYXRlbHkgKm1heGltaXplKiBkaXN0YW5jZXM/KVxuICAgICAgICBwbGFjZWQucHVzaChbbSwgeCwgeSwgcl0pO1xuICAgICAgICBjb25zdCBzY3IgPSAoeSAmIDB4ZjApIHwgKHggJiAweGYwKSA+Pj4gNDtcbiAgICAgICAgY29uc3QgdGlsZSA9ICh5ICYgMHgwZikgPDwgNCB8ICh4ICYgMHgwZik7XG4gICAgICAgIHJldHVybiBzY3IgPDwgOCB8IHRpbGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICAvLyBUT0RPIC0gYWxsb3cgbGVzcyByYW5kb21uZXNzIGZvciBjZXJ0YWluIGNhc2VzLCBlLmcuIHRvcCBvZiBub3J0aCBzYWJyZSBvclxuICAvLyBhcHByb3ByaWF0ZSBzaWRlIG9mIGNvcmRlbC5cblxuICAvKiogQHJldHVybiB7IVNldDxudW1iZXI+fSAqL1xuICAvLyBhbGxUaWxlcygpIHtcbiAgLy8gICBjb25zdCB0aWxlcyA9IG5ldyBTZXQoKTtcbiAgLy8gICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgLy8gICAgIGZvciAoY29uc3QgdGlsZSBvZiBzY3JlZW4uYWxsVGlsZXMoKSkge1xuICAvLyAgICAgICB0aWxlcy5hZGQodGlsZSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiB0aWxlcztcbiAgLy8gfVxuXG5cbiAgLy8gVE9ETyAtIHVzZSBtZXRhc2NyZWVuIGZvciB0aGlzIGxhdGVyXG4gIHJlc2l6ZVNjcmVlbnModG9wOiBudW1iZXIsIGxlZnQ6IG51bWJlciwgYm90dG9tOiBudW1iZXIsIHJpZ2h0OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgZmlsbCA9IDApIHtcbiAgICBjb25zdCBuZXdXaWR0aCA9IHRoaXMud2lkdGggKyBsZWZ0ICsgcmlnaHQ7XG4gICAgY29uc3QgbmV3SGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyB0b3AgKyBib3R0b207XG4gICAgY29uc3QgbmV3U2NyZWVucyA9IEFycmF5LmZyb20oe2xlbmd0aDogbmV3SGVpZ2h0fSwgKF8sIHkpID0+IHtcbiAgICAgIHkgLT0gdG9wO1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oe2xlbmd0aDogbmV3V2lkdGh9LCAoXywgeCkgPT4ge1xuICAgICAgICB4IC09IGxlZnQ7XG4gICAgICAgIGlmICh5IDwgMCB8fCB4IDwgMCB8fCB5ID49IHRoaXMuaGVpZ2h0IHx8IHggPj0gdGhpcy53aWR0aCkgcmV0dXJuIGZpbGw7XG4gICAgICAgIHJldHVybiB0aGlzLnNjcmVlbnNbeV1beF07XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLndpZHRoID0gbmV3V2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBuZXdIZWlnaHQ7XG4gICAgdGhpcy5zY3JlZW5zID0gbmV3U2NyZWVucztcbiAgICAvLyBUT0RPIC0gaWYgYW55IG9mIHRoZXNlIGdvIG5lZ2F0aXZlLCB3ZSdyZSBpbiB0cm91YmxlLi4uXG4gICAgLy8gUHJvYmFibHkgdGhlIGJlc3QgYmV0IHdvdWxkIGJlIHRvIHB1dCBhIGNoZWNrIGluIHRoZSBzZXR0ZXI/XG4gICAgZm9yIChjb25zdCBmIG9mIHRoaXMuZmxhZ3MpIHtcbiAgICAgIGYueHMgKz0gbGVmdDtcbiAgICAgIGYueXMgKz0gdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHAgb2YgdGhpcy5waXRzKSB7XG4gICAgICBwLmZyb21YcyArPSBsZWZ0O1xuICAgICAgcC5mcm9tWXMgKz0gdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHMgb2YgWy4uLnRoaXMuc3Bhd25zLCAuLi50aGlzLmV4aXRzXSkge1xuICAgICAgcy54dCArPSAxNiAqIGxlZnQ7XG4gICAgICBzLnl0ICs9IDE2ICogdG9wO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGUgb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgIGlmICghZS51c2VkKSBjb250aW51ZTtcbiAgICAgIGUueCArPSAyNTYgKiBsZWZ0O1xuICAgICAgZS55ICs9IDI1NiAqIHRvcDtcbiAgICB9XG4gIH1cblxuICAvKiogTk9URTogaWYgYSBzY3JlZW4gaXMgbmVnYXRpdmUsIHNldHMgdGhlIEFsd2F5c1RydWUgZmxhZy4gKi9cbiAgd3JpdGVTY3JlZW5zMmQoc3RhcnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgZGF0YTogUmVhZG9ubHlBcnJheTxSZWFkb25seUFycmF5PG51bWJlciB8IG51bGw+Pikge1xuICAgIGNvbnN0IHgwID0gc3RhcnQgJiAweGY7XG4gICAgY29uc3QgeTAgPSBzdGFydCA+Pj4gNDtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGRhdGEubGVuZ3RoOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGRhdGFbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHJvdy5sZW5ndGg7IHgrKykge1xuICAgICAgICBsZXQgdGlsZSA9IHJvd1t4XTtcbiAgICAgICAgaWYgKHRpbGUgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGlmICh0aWxlIDwgMCkge1xuICAgICAgICAgIHRpbGUgPSB+dGlsZTtcbiAgICAgICAgICB0aGlzLmZsYWdzLnB1c2goRmxhZy5vZih7c2NyZWVuOiAoeTAgKyB5KSA8PCA0IHwgKHgwICsgeCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWc6IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWR9KSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY3JlZW5zW3kwICsgeV1beDAgKyB4XSA9IHRpbGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ29ubmVjdCB0d28gc2NyZWVucyB2aWEgZW50cmFuY2VzLlxuICAvLyBBc3N1bWVzIGV4aXRzIGFuZCBlbnRyYW5jZXMgYXJlIGNvbXBsZXRlbHkgYWJzZW50LlxuICAvLyBTY3JlZW4gSURzIG11c3QgYmUgaW4gc2NyZWVuRXhpdHMuXG4gIC8vIFNVUEVSIEhBQ0tZIC0gaWYgcG9zIGlzIG5lZ2F0aXZlLCB1c2UgY29tcGxlbWVudCBhbmQgYWx0ZXJuYXRlIHN0YWlycy5cbiAgY29ubmVjdChwb3M6IG51bWJlciwgdGhhdDogTG9jYXRpb24sIHRoYXRQb3M6IG51bWJlcikge1xuICAgIGNvbnN0IHRoaXNBbHQgPSBwb3MgPCAwID8gMHgxMDAgOiAwO1xuICAgIGNvbnN0IHRoYXRBbHQgPSB0aGF0UG9zIDwgMCA/IDB4MTAwIDogMDtcbiAgICBwb3MgPSBwb3MgPCAwID8gfnBvcyA6IHBvcztcbiAgICB0aGF0UG9zID0gdGhhdFBvcyA8IDAgPyB+dGhhdFBvcyA6IHRoYXRQb3M7XG4gICAgY29uc3QgdGhpc1kgPSBwb3MgPj4+IDQ7XG4gICAgY29uc3QgdGhpc1ggPSBwb3MgJiAweGY7XG4gICAgY29uc3QgdGhhdFkgPSB0aGF0UG9zID4+PiA0O1xuICAgIGNvbnN0IHRoYXRYID0gdGhhdFBvcyAmIDB4ZjtcbiAgICBjb25zdCB0aGlzVGlsZSA9IHRoaXMuc2NyZWVuc1t0aGlzWV1bdGhpc1hdO1xuICAgIGNvbnN0IHRoYXRUaWxlID0gdGhhdC5zY3JlZW5zW3RoYXRZXVt0aGF0WF07XG4gICAgY29uc3QgW3RoaXNFbnRyYW5jZSwgdGhpc0V4aXRzXSA9IHNjcmVlbkV4aXRzW3RoaXNBbHQgfCB0aGlzVGlsZV07XG4gICAgY29uc3QgW3RoYXRFbnRyYW5jZSwgdGhhdEV4aXRzXSA9IHNjcmVlbkV4aXRzW3RoYXRBbHQgfCB0aGF0VGlsZV07XG4gICAgY29uc3QgdGhpc0VudHJhbmNlSW5kZXggPSB0aGlzLmVudHJhbmNlcy5sZW5ndGg7XG4gICAgY29uc3QgdGhhdEVudHJhbmNlSW5kZXggPSB0aGF0LmVudHJhbmNlcy5sZW5ndGg7XG4gICAgdGhpcy5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eTogdGhpc1kgPDwgOCB8IHRoaXNFbnRyYW5jZSA+Pj4gOCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB0aGlzWCA8PCA4IHwgdGhpc0VudHJhbmNlICYgMHhmZn0pKTtcbiAgICB0aGF0LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt5OiB0aGF0WSA8PCA4IHwgdGhhdEVudHJhbmNlID4+PiA4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHRoYXRYIDw8IDggfCB0aGF0RW50cmFuY2UgJiAweGZmfSkpO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzRXhpdHMpIHtcbiAgICAgIHRoaXMuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHBvcywgdGlsZTogZXhpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0OiB0aGF0LmlkLCBlbnRyYW5jZTogdGhhdEVudHJhbmNlSW5kZXh9KSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGF0RXhpdHMpIHtcbiAgICAgIHRoYXQuZXhpdHMucHVzaChFeGl0Lm9mKHtzY3JlZW46IHRoYXRQb3MsIHRpbGU6IGV4aXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdDogdGhpcy5pZCwgZW50cmFuY2U6IHRoaXNFbnRyYW5jZUluZGV4fSkpO1xuICAgIH1cbiAgfVxuXG4gIG5laWdoYm9yRm9yRW50cmFuY2UoZW50cmFuY2VJZDogbnVtYmVyKTogTG9jYXRpb24ge1xuICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZXNbZW50cmFuY2VJZF07XG4gICAgaWYgKCFlbnRyYW5jZSkgdGhyb3cgbmV3IEVycm9yKGBubyBlbnRyYW5jZSAke2hleCh0aGlzLmlkKX06JHtlbnRyYW5jZUlkfWApO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC5zY3JlZW4gIT09IGVudHJhbmNlLnNjcmVlbikgY29udGludWU7XG4gICAgICBjb25zdCBkeCA9IE1hdGguYWJzKGV4aXQueCAtIGVudHJhbmNlLngpO1xuICAgICAgY29uc3QgZHkgPSBNYXRoLmFicyhleGl0LnkgLSBlbnRyYW5jZS55KTtcbiAgICAgIGlmIChkeCA8IDI0ICYmIGR5IDwgMjQpIHJldHVybiB0aGlzLnJvbS5sb2NhdGlvbnNbZXhpdC5kZXN0XTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBubyBleGl0IGZvdW5kIG5lYXIgJHtoZXgodGhpcy5pZCl9OiR7ZW50cmFuY2VJZH1gKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBgJHtzdXBlci50b1N0cmluZygpfSAke3RoaXMubmFtZX1gO1xuICB9XG59XG5cbi8vIFRPRE8gLSBtb3ZlIHRvIGEgYmV0dGVyLW9yZ2FuaXplZCBkZWRpY2F0ZWQgXCJnZW9tZXRyeVwiIG1vZHVsZT9cbmZ1bmN0aW9uIG5laWdoYm9ycyh0aWxlOiBudW1iZXIsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgY29uc3QgeSA9IHRpbGUgJiAweGYwZjA7XG4gIGNvbnN0IHggPSB0aWxlICYgMHgwZjBmO1xuICBpZiAoeSA8ICgoaGVpZ2h0IC0gMSkgPDwgMTIgfCAweGUwKSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4ZTAgPyB0aWxlICsgMHgwZjIwIDogdGlsZSArIDE2KTtcbiAgfVxuICBpZiAoeSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHhmMCkgPT09IDB4MDAgPyB0aWxlIC0gMHgwZjIwIDogdGlsZSAtIDE2KTtcbiAgfVxuICBpZiAoeCA8ICgod2lkdGggLSAxKSA8PCA4IHwgMHgwZikpIHtcbiAgICBvdXQucHVzaCgodGlsZSAmIDB4MGYpID09PSAweDBmID8gdGlsZSArIDB4MDBmMSA6IHRpbGUgKyAxKTtcbiAgfVxuICBpZiAoeCkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHgwZikgPT09IDB4MDAgPyB0aWxlIC0gMHgwMGYxIDogdGlsZSAtIDEpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIHZlcnkgc2ltcGxlIHZlcnNpb24gb2Ygd2hhdCB3ZSdyZSBkb2luZyB3aXRoIG1ldGFzY3JlZW5zXG5jb25zdCBzY3JlZW5FeGl0czoge1tpZDogbnVtYmVyXTogcmVhZG9ubHkgW251bWJlciwgcmVhZG9ubHkgW251bWJlciwgbnVtYmVyXV19ID0ge1xuICAweDE1OiBbMHg5MF9hMCwgWzB4ODksIDB4OGFdXSwgLy8gY2F2ZSBvbiBsZWZ0IGJvdW5kYXJ5XG4gIDB4MTk6IFsweDYwXzkwLCBbMHg1OCwgMHg1OV1dLCAvLyBjYXZlIG9uIHJpZ2h0IGJvdW5kYXJ5IChub3Qgb24gZ3Jhc3MpXG4gIDB4OTY6IFsweDQwXzMwLCBbMHgzMiwgMHgzM11dLCAvLyB1cCBzdGFpciBmcm9tIGxlZnRcbiAgMHg5NzogWzB4YWZfMzAsIFsweGIyLCAweGIzXV0sIC8vIGRvd24gc3RhaXIgZnJvbSBsZWZ0XG4gIDB4OTg6IFsweDQwX2QwLCBbMHgzYywgMHgzZF1dLCAvLyB1cCBzdGFpciBmcm9tIHJpZ2h0XG4gIDB4OTk6IFsweGFmX2QwLCBbMHhiYywgMHhiZF1dLCAvLyBkb3duIHN0YWlyIGZyb20gcmlnaHRcbiAgMHg5YTogWzB4MWZfODAsIFsweDI3LCAweDI4XV0sIC8vIGRvd24gc3RhaXIgKGRvdWJsZSAtIGp1c3QgdXNlIGRvd24hKVxuICAweDllOiBbMHhkZl84MCwgWzB4ZTcsIDB4ZThdXSwgLy8gYm90dG9tIGVkZ2VcbiAgMHhjMTogWzB4NTBfYTAsIFsweDQ5LCAweDRhXV0sIC8vIGNhdmUgb24gdG9wIGJvdW5kYXJ5XG4gIDB4YzI6IFsweDYwX2IwLCBbMHg1YSwgMHg1Yl1dLCAvLyBjYXZlIG9uIGJvdHRvbS1yaWdodCBib3VuZGFyeVxuICAweDE5YTogWzB4ZDBfODAsIFsweGM3LCAweGM4XV0sIC8vIHVwIHN0YWlyIG9uIGRvdWJsZVxufTtcbiJdfQ==