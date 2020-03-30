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
    allocate(location) {
        for (const l of this) {
            if (l.used)
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
    copyFromMeta() {
        this.CordelPlainEast.meta.reconcileExits(this.CordelPlainWest.meta);
        for (const loc of this) {
            if (!loc.used)
                continue;
            loc.exits = [];
            loc.entrances = [];
        }
        for (const loc of this) {
            if (!loc.used)
                continue;
            loc.meta.write();
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBTyxLQUFLLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDdEMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUNuQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFL0MsT0FBTyxFQUFDLE9BQU8sRUFDUCxlQUFlLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUM5QyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFDdEMsa0JBQWtCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFN0MsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUkxRCxPQUFPLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3JFLE9BQU8sRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUM7QUFFMUMsTUFBTSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQztBQXVCckMsTUFBTSxJQUFJLEdBQUc7SUFDWCxPQUFPLEVBQUUsTUFBTTtJQUNmLEtBQUssRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0lBQzFDLE9BQU8sRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxPQUFPO0NBQ3BDLENB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N0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLElBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixJQUFJLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsSUFBSSxFQUFFLENBQUMsS0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdCLElBQUksRUFBRSxDQUFDLEtBQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixLQUFLLEVBQUUsQ0FBQyxLQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Q0FDL0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXNzZW1ibGVyfSBmcm9tICcuLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7RXhwcn0gZnJvbSAnLi4vYXNtL2V4cHIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4uL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtBcmVhLCBBcmVhc30gZnJvbSAnLi9hcmVhLmpzJztcbmltcG9ydCB7RW50aXR5fSBmcm9tICcuL2VudGl0eS5qcyc7XG5pbXBvcnQge01ldGFsb2NhdGlvbn0gZnJvbSAnLi9tZXRhbG9jYXRpb24uanMnO1xuaW1wb3J0IHtTY3JlZW59IGZyb20gJy4vc2NyZWVuLmpzJztcbmltcG9ydCB7U2VnbWVudCxcbiAgICAgICAgY29uY2F0SXRlcmFibGVzLCBmcmVlLCBncm91cCwgaGV4LCBpbml0aWFsaXplcixcbiAgICAgICAgcmVhZExpdHRsZUVuZGlhbiwgc2VxLCB0dXBsZSwgdmFyU2xpY2UsXG4gICAgICAgIHVwcGVyQ2FtZWxUb1NwYWNlc30gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtVbmlvbkZpbmR9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQge2Fzc2VydE5ldmVyLCBpdGVycywgRGVmYXVsdE1hcH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge01vbnN0ZXJ9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcblxuaW1wb3J0IHtFbnRyYW5jZSwgRXhpdCwgRmxhZywgUGl0LCBTcGF3bn0gZnJvbSAnLi9sb2NhdGlvbnRhYmxlcy5qcyc7XG5leHBvcnQge0VudHJhbmNlLCBFeGl0LCBGbGFnLCBQaXQsIFNwYXdufTsgLy8gVE9ETyAtIHJlbW92ZSB0aGUgcmUtZXhwb3J0XG5cbmNvbnN0IHskMGEsICQwYiwgJDBjLCAkMGR9ID0gU2VnbWVudDtcblxuLy8gTnVtYmVyIGluZGljYXRlcyB0byBjb3B5IHdoYXRldmVyJ3MgYXQgdGhlIGdpdmVuIGV4aXRcbnR5cGUgR3JvdXBLZXkgPSBzdHJpbmcgfCBzeW1ib2wgfCBudW1iZXI7XG4vLyBMb2NhbCBmb3IgZGVmaW5pbmcgbmFtZXMgb24gTG9jYXRpb25zIG9iamVjdHMuXG5pbnRlcmZhY2UgTG9jYXRpb25Jbml0IHtcbiAgYXJlYT86IEFyZWE7XG4gIHN1YkFyZWE/OiBzdHJpbmc7XG4gIG11c2ljPzogR3JvdXBLZXkgfCAoKGFyZWE6IEFyZWEpID0+IEdyb3VwS2V5KTtcbiAgcGFsZXR0ZT86IEdyb3VwS2V5IHwgKChhcmVhOiBBcmVhKSA9PiBHcm91cEtleSk7XG4gIGJvc3NTY3JlZW4/OiBudW1iZXI7XG4gIGZpeGVkPzogcmVhZG9ubHkgbnVtYmVyW107XG59XG5pbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYTogQXJlYTtcbiAgbmFtZTogc3RyaW5nO1xuICBtdXNpYzogR3JvdXBLZXk7XG4gIHBhbGV0dGU6IEdyb3VwS2V5O1xuICBzdWJBcmVhPzogc3RyaW5nO1xuICBib3NzU2NyZWVuPzogbnVtYmVyO1xuICBmaXhlZD86IHJlYWRvbmx5IG51bWJlcltdOyAvLyBmaXhlZCBzcGF3biBzbG90cz9cbn1cblxuY29uc3QgQ0FWRSA9IHtcbiAgc3ViQXJlYTogJ2NhdmUnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tQ2F2ZWAsXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUNhdmVgLFxufSBhcyBjb25zdDtcbmNvbnN0IEhPVVNFID0ge1xuICBzdWJBcmVhOiAnaG91c2UnLFxuICBwYWxldHRlOiAoKSA9PiBTeW1ib2woKSxcbn0gYXMgY29uc3Q7XG5jb25zdCBGT1JUVU5FX1RFTExFUiA9IHtcbiAgc3ViQXJlYTogJ2hvdXNlJyxcbiAgcGFsZXR0ZTogKCkgPT4gU3ltYm9sKCksXG4gIG11c2ljOiAoYXJlYTogQXJlYSkgPT4gYCR7YXJlYS5uYW1lfS1Gb3J0dW5lVGVsbGVyYCxcbn0gYXMgY29uc3Q7XG5jb25zdCBNRVNJQSA9IHtcbiAgbmFtZTogJ21lc2lhJyxcbiAgbXVzaWM6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LU1lc2lhYCxcbiAgLy8gTWVzaWEgaW4gdG93ZXIga2VlcHMgc2FtZSBwYWxldHRlXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBhcmVhLm5hbWUgPT09ICdUb3dlcicgP1xuICAgICAgYXJlYS5uYW1lIDogYCR7YXJlYS5uYW1lfS1NZXNpYWAsXG59IGFzIGNvbnN0O1xuY29uc3QgRFlOQSA9IHtcbiAgbmFtZTogJ2R5bmEnLFxuICBtdXNpYzogKGFyZWE6IEFyZWEpID0+IGAke2FyZWEubmFtZX0tRHluYWAsXG4gIHBhbGV0dGU6IChhcmVhOiBBcmVhKSA9PiBgJHthcmVhLm5hbWV9LUR5bmFgLFxufSBhcyBjb25zdDtcbmNvbnN0IEtFTEJFU1FVRSA9IHtcbiAgbmFtZTogJ2dvYSAxJyxcbiAgbXVzaWM6ICdnb2EgMScsXG4gIHBhbGV0dGU6ICdnb2EgMScsXG59IGFzIGNvbnN0O1xuY29uc3QgU0FCRVJBID0ge1xuICBuYW1lOiAnZ29hIDInLFxuICBtdXNpYzogJ2dvYSAyJyxcbiAgcGFsZXR0ZTogJ2dvYSAyJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBNQURPX0xPV0VSID0ge1xuICBuYW1lOiAnZ29hIDMnLFxuICBtdXNpYzogJ2dvYSAzJyxcbiAgcGFsZXR0ZTogJ2dvYSAzJyxcbn0gYXMgY29uc3Q7XG5jb25zdCBNQURPX1VQUEVSID0gey4uLk1BRE9fTE9XRVIsIHBhbGV0dGU6ICdnb2EgMyB1cHBlcid9IGFzIGNvbnN0O1xuY29uc3QgS0FSTUlORV9VUFBFUiA9IHtcbiAgbmFtZTogJ2dvYSA0JyxcbiAgbXVzaWM6ICdnb2EgNCcsXG4gIHBhbGV0dGU6ICdnb2EgNCcsXG59IGFzIGNvbnN0O1xuY29uc3QgS0FSTUlORV9MT1dFUiA9IHsuLi5LQVJNSU5FX1VQUEVSLCBwYWxldHRlOiAnZ29hIDQgbG93ZXInfSBhcyBjb25zdDtcblxudHlwZSBJbml0UGFyYW1zID0gcmVhZG9ubHkgW251bWJlciwgTG9jYXRpb25Jbml0P107XG50eXBlIEluaXQgPSB7KC4uLmFyZ3M6IEluaXRQYXJhbXMpOiBMb2NhdGlvbixcbiAgICAgICAgICAgICBjb21taXQobG9jYXRpb25zOiBMb2NhdGlvbnMpOiB2b2lkfTtcbmNvbnN0ICQ6IEluaXQgPSAoKCkgPT4ge1xuICBjb25zdCAkID0gaW5pdGlhbGl6ZXI8W251bWJlciwgTG9jYXRpb25Jbml0XSwgTG9jYXRpb24+KCk7XG4gIGxldCBhcmVhITogQXJlYTtcbiAgZnVuY3Rpb24gJCQoaWQ6IG51bWJlciwgZGF0YTogTG9jYXRpb25Jbml0ID0ge30pOiBMb2NhdGlvbiB7XG4gICAgZGF0YSA9IHsuLi5kYXRhfTtcbiAgICBhcmVhID0gZGF0YS5hcmVhID0gZGF0YS5hcmVhIHx8IGFyZWE7XG4gICAgcmV0dXJuICQoaWQsIGRhdGEpO1xuICB9O1xuICAoJCQgYXMgSW5pdCkuY29tbWl0ID0gKGxvY2F0aW9uczogTG9jYXRpb25zKSA9PiB7XG4gICAgJC5jb21taXQobG9jYXRpb25zLCAocHJvcDogc3RyaW5nLCBpZDogbnVtYmVyLCBpbml0OiBMb2NhdGlvbkluaXQpID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB1cHBlckNhbWVsVG9TcGFjZXMocHJvcCk7XG4gICAgICBjb25zdCBhcmVhID0gaW5pdC5hcmVhITtcbiAgICAgIGNvbnN0IG11c2ljID0gdHlwZW9mIGluaXQubXVzaWMgPT09ICdmdW5jdGlvbicgP1xuICAgICAgICAgIGluaXQubXVzaWMoYXJlYSkgOiBpbml0Lm11c2ljICE9IG51bGwgP1xuICAgICAgICAgIGluaXQubXVzaWMgOiBhcmVhLm5hbWU7XG4gICAgICBjb25zdCBwYWxldHRlID0gdHlwZW9mIGluaXQucGFsZXR0ZSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgaW5pdC5wYWxldHRlKGFyZWEpIDogaW5pdC5wYWxldHRlIHx8IGFyZWEubmFtZTtcbiAgICAgIGNvbnN0IGRhdGE6IExvY2F0aW9uRGF0YSA9IHthcmVhLCBuYW1lLCBtdXNpYywgcGFsZXR0ZX07XG4gICAgICBpZiAoaW5pdC5zdWJBcmVhICE9IG51bGwpIGRhdGEuc3ViQXJlYSA9IGluaXQuc3ViQXJlYTtcbiAgICAgIGlmIChpbml0LmJvc3NTY3JlZW4gIT0gbnVsbCkgZGF0YS5ib3NzU2NyZWVuID0gaW5pdC5ib3NzU2NyZWVuO1xuICAgICAgY29uc3QgbG9jYXRpb24gPSBuZXcgTG9jYXRpb24obG9jYXRpb25zLnJvbSwgaWQsIGRhdGEpO1xuICAgICAgLy8gbmVnYXRpdmUgaWQgaW5kaWNhdGVzIGl0J3Mgbm90IHJlZ2lzdGVyZWQuXG4gICAgICBpZiAoaWQgPj0gMCkgbG9jYXRpb25zW2lkXSA9IGxvY2F0aW9uO1xuICAgICAgcmV0dXJuIGxvY2F0aW9uO1xuICAgIH0pO1xuICB9O1xuICByZXR1cm4gJCQgYXMgSW5pdDtcbn0pKCk7XG5cbmV4cG9ydCBjbGFzcyBMb2NhdGlvbnMgZXh0ZW5kcyBBcnJheTxMb2NhdGlvbj4ge1xuXG4gIHJlYWRvbmx5IE1lemFtZVNocmluZSAgICAgICAgICAgICA9ICQoMHgwMCwge2FyZWE6IEFyZWFzLk1lemFtZX0pO1xuICByZWFkb25seSBMZWFmX091dHNpZGVTdGFydCAgICAgICAgPSAkKDB4MDEsIHttdXNpYzogMX0pO1xuICByZWFkb25seSBMZWFmICAgICAgICAgICAgICAgICAgICAgPSAkKDB4MDIsIHthcmVhOiBBcmVhcy5MZWFmfSk7XG4gIHJlYWRvbmx5IFZhbGxleU9mV2luZCAgICAgICAgICAgICA9ICQoMHgwMywge2FyZWE6IEFyZWFzLlZhbGxleU9mV2luZH0pO1xuICByZWFkb25seSBTZWFsZWRDYXZlMSAgICAgICAgICAgICAgPSAkKDB4MDQsIHthcmVhOiBBcmVhcy5TZWFsZWRDYXZlfSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmUyICAgICAgICAgICAgICA9ICQoMHgwNSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmU2ICAgICAgICAgICAgICA9ICQoMHgwNik7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmU0ICAgICAgICAgICAgICA9ICQoMHgwNyk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmU1ICAgICAgICAgICAgICA9ICQoMHgwOCk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmUzICAgICAgICAgICAgICA9ICQoMHgwOSk7XG4gIHJlYWRvbmx5IFNlYWxlZENhdmU3ICAgICAgICAgICAgICA9ICQoMHgwYSwge2Jvc3NTY3JlZW46IDB4OTF9KTtcbiAgLy8gSU5WQUxJRDogMHgwYlxuICByZWFkb25seSBTZWFsZWRDYXZlOCAgICAgICAgICAgICAgPSAkKDB4MGMpO1xuICAvLyBJTlZBTElEOiAweDBkXG4gIHJlYWRvbmx5IFdpbmRtaWxsQ2F2ZSAgICAgICAgICAgICA9ICQoMHgwZSwge2FyZWE6IEFyZWFzLldpbmRtaWxsQ2F2ZX0pO1xuICByZWFkb25seSBXaW5kbWlsbCAgICAgICAgICAgICAgICAgPSAkKDB4MGYsIHthcmVhOiBBcmVhcy5XaW5kbWlsbCwgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgWmVidUNhdmUgICAgICAgICAgICAgICAgID0gJCgweDEwLCB7YXJlYTogQXJlYXMuWmVidUNhdmV9KTtcbiAgcmVhZG9ubHkgTXRTYWJyZVdlc3RfQ2F2ZTEgICAgICAgID0gJCgweDExLCB7YXJlYTogQXJlYXMuTXRTYWJyZVdlc3QsIC4uLkNBVkV9KTtcbiAgLy8gSU5WQUxJRDogMHgxMlxuICAvLyBJTlZBTElEOiAweDEzXG4gIHJlYWRvbmx5IENvcmRlbFBsYWluV2VzdCAgICAgICAgICA9ICQoMHgxNCwge2FyZWE6IEFyZWFzLkNvcmRlbFBsYWlufSk7XG4gIHJlYWRvbmx5IENvcmRlbFBsYWluRWFzdCAgICAgICAgICA9ICQoMHgxNSk7XG4gIC8vIElOVkFMSUQ6IDB4MTYgLS0gdW51c2VkIGNvcHkgb2YgMThcbiAgLy8gSU5WQUxJRDogMHgxN1xuICByZWFkb25seSBCcnlubWFlciAgICAgICAgICAgICAgICAgPSAkKDB4MTgsIHthcmVhOiBBcmVhcy5CcnlubWFlcn0pO1xuICByZWFkb25seSBPdXRzaWRlU3RvbUhvdXNlICAgICAgICAgPSAkKDB4MTksIHthcmVhOiBBcmVhcy5TdG9tSG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFN3YW1wICAgICAgICAgICAgICAgICAgICA9ICQoMHgxYSwge2FyZWE6IEFyZWFzLlN3YW1wLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3NzU2NyZWVuOiAweDdjfSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzICAgICAgICAgICAgICAgICA9ICQoMHgxYiwge2FyZWE6IEFyZWFzLkFtYXpvbmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXhlZDogWzB4MGQsIDB4MGVdfSk7XG4gIHJlYWRvbmx5IE9hayAgICAgICAgICAgICAgICAgICAgICA9ICQoMHgxYywge2FyZWE6IEFyZWFzLk9ha30pO1xuICAvLyBJTlZBTElEOiAweDFkXG4gIHJlYWRvbmx5IFN0b21Ib3VzZSAgICAgICAgICAgICAgICA9ICQoMHgxZSwge2FyZWE6IEFyZWFzLlN0b21Ib3VzZX0pO1xuICAvLyBJTlZBTElEOiAweDFmXG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0xvd2VyICAgICAgICA9ICQoMHgyMCwge2FyZWE6IEFyZWFzLk10U2FicmVXZXN0fSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X1VwcGVyICAgICAgICA9ICQoMHgyMSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmUyICAgICAgICA9ICQoMHgyMiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmUzICAgICAgICA9ICQoMHgyMywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU0ICAgICAgICA9ICQoMHgyNCwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU1ICAgICAgICA9ICQoMHgyNSwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU2ICAgICAgICA9ICQoMHgyNiwgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVXZXN0X0NhdmU3ICAgICAgICA9ICQoMHgyNywgQ0FWRSk7XG4gIHJlYWRvbmx5IE10U2FicmVOb3J0aF9NYWluICAgICAgICA9ICQoMHgyOCwge2FyZWE6IEFyZWFzLk10U2FicmVOb3J0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHhiNX0pO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTWlkZGxlICAgICAgPSAkKDB4MjkpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTIgICAgICAgPSAkKDB4MmEsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTMgICAgICAgPSAkKDB4MmIsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTQgICAgICAgPSAkKDB4MmMsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTUgICAgICAgPSAkKDB4MmQsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTYgICAgICAgPSAkKDB4MmUsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfUHJpc29uSGFsbCAgPSAkKDB4MmYsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTGVmdENlbGwgICAgPSAkKDB4MzAsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfTGVmdENlbGwyICAgPSAkKDB4MzEsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfUmlnaHRDZWxsICAgPSAkKDB4MzIsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTggICAgICAgPSAkKDB4MzMsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfQ2F2ZTkgICAgICAgPSAkKDB4MzQsIENBVkUpO1xuICByZWFkb25seSBNdFNhYnJlTm9ydGhfU3VtbWl0Q2F2ZSAgPSAkKDB4MzUsIENBVkUpO1xuICAvLyBJTlZBTElEOiAweDM2XG4gIC8vIElOVkFMSUQ6IDB4MzdcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmUxICAgICAgID0gJCgweDM4LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRTYWJyZU5vcnRoX0NhdmU3ICAgICAgID0gJCgweDM5LCBDQVZFKTtcbiAgLy8gSU5WQUxJRDogMHgzYVxuICAvLyBJTlZBTElEOiAweDNiXG4gIHJlYWRvbmx5IE5hZGFyZV9Jbm4gICAgICAgICAgICAgICA9ICQoMHgzYywge2FyZWE6IEFyZWFzLk5hZGFyZSwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgTmFkYXJlX1Rvb2xTaG9wICAgICAgICAgID0gJCgweDNkLCBIT1VTRSk7XG4gIHJlYWRvbmx5IE5hZGFyZV9CYWNrUm9vbSAgICAgICAgICA9ICQoMHgzZSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweDNmXG4gIHJlYWRvbmx5IFdhdGVyZmFsbFZhbGxleU5vcnRoICAgICA9ICQoMHg0MCwge2FyZWE6IEFyZWFzLldhdGVyZmFsbFZhbGxleX0pO1xuICByZWFkb25seSBXYXRlcmZhbGxWYWxsZXlTb3V0aCAgICAgPSAkKDB4NDEpO1xuICByZWFkb25seSBMaW1lVHJlZVZhbGxleSAgICAgICAgICAgPSAkKDB4NDIsIHthcmVhOiBBcmVhcy5MaW1lVHJlZVZhbGxleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgTGltZVRyZWVMYWtlICAgICAgICAgICAgID0gJCgweDQzLCB7YXJlYTogQXJlYXMuTGltZVRyZWVMYWtlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBLaXJpc2FQbGFudENhdmUxICAgICAgICAgPSAkKDB4NDQsIHthcmVhOiBBcmVhcy5LaXJpc2FQbGFudENhdmV9KTtcbiAgcmVhZG9ubHkgS2lyaXNhUGxhbnRDYXZlMiAgICAgICAgID0gJCgweDQ1KTtcbiAgcmVhZG9ubHkgS2lyaXNhUGxhbnRDYXZlMyAgICAgICAgID0gJCgweDQ2KTtcbiAgcmVhZG9ubHkgS2lyaXNhTWVhZG93ICAgICAgICAgICAgID0gJCgweDQ3LCB7YXJlYTogQXJlYXMuS2lyaXNhTWVhZG93fSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlMSAgICAgICAgICAgICA9ICQoMHg0OCwge2FyZWE6IEFyZWFzLkZvZ0xhbXBDYXZlfSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlMiAgICAgICAgICAgICA9ICQoMHg0OSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlMyAgICAgICAgICAgICA9ICQoMHg0YSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlRGVhZEVuZCAgICAgICA9ICQoMHg0Yik7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNCAgICAgICAgICAgICA9ICQoMHg0Yyk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNSAgICAgICAgICAgICA9ICQoMHg0ZCk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNiAgICAgICAgICAgICA9ICQoMHg0ZSk7XG4gIHJlYWRvbmx5IEZvZ0xhbXBDYXZlNyAgICAgICAgICAgICA9ICQoMHg0Zik7XG4gIHJlYWRvbmx5IFBvcnRvYSAgICAgICAgICAgICAgICAgICA9ICQoMHg1MCwge2FyZWE6IEFyZWFzLlBvcnRvYX0pO1xuICByZWFkb25seSBQb3J0b2FfRmlzaGVybWFuSXNsYW5kICAgPSAkKDB4NTEsIHthcmVhOiBBcmVhcy5GaXNoZXJtYW5Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgTWVzaWFTaHJpbmUgICAgICAgICAgICAgID0gJCgweDUyLCB7YXJlYTogQXJlYXMuTGltZVRyZWVMYWtlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5NRVNJQX0pO1xuICAvLyBJTlZBTElEOiAweDUzXG4gIHJlYWRvbmx5IFdhdGVyZmFsbENhdmUxICAgICAgICAgICA9ICQoMHg1NCwge2FyZWE6IEFyZWFzLldhdGVyZmFsbENhdmV9KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTIgICAgICAgICAgID0gJCgweDU1KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTMgICAgICAgICAgID0gJCgweDU2KTtcbiAgcmVhZG9ubHkgV2F0ZXJmYWxsQ2F2ZTQgICAgICAgICAgID0gJCgweDU3KTtcbiAgcmVhZG9ubHkgVG93ZXJFbnRyYW5jZSAgICAgICAgICAgID0gJCgweDU4LCB7YXJlYTogQXJlYXMuVG93ZXJ9KTtcbiAgcmVhZG9ubHkgVG93ZXIxICAgICAgICAgICAgICAgICAgID0gJCgweDU5KTtcbiAgcmVhZG9ubHkgVG93ZXIyICAgICAgICAgICAgICAgICAgID0gJCgweDVhKTtcbiAgcmVhZG9ubHkgVG93ZXIzICAgICAgICAgICAgICAgICAgID0gJCgweDViKTtcbiAgcmVhZG9ubHkgVG93ZXJPdXRzaWRlTWVzaWEgICAgICAgID0gJCgweDVjKTtcbiAgcmVhZG9ubHkgVG93ZXJPdXRzaWRlRHluYSAgICAgICAgID0gJCgweDVkKTtcbiAgcmVhZG9ubHkgVG93ZXJNZXNpYSAgICAgICAgICAgICAgID0gJCgweDVlLCBNRVNJQSk7XG4gIHJlYWRvbmx5IFRvd2VyRHluYSAgICAgICAgICAgICAgICA9ICQoMHg1ZiwgRFlOQSk7XG4gIHJlYWRvbmx5IEFuZ3J5U2VhICAgICAgICAgICAgICAgICA9ICQoMHg2MCwge2FyZWE6IEFyZWFzLkFuZ3J5U2VhfSk7XG4gIHJlYWRvbmx5IEJvYXRIb3VzZSAgICAgICAgICAgICAgICA9ICQoMHg2MSk7XG4gIHJlYWRvbmx5IEpvZWxMaWdodGhvdXNlICAgICAgICAgICA9ICQoMHg2Miwge2FyZWE6IEFyZWFzLkxpZ2h0aG91c2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAwfSk7XG4gIC8vIElOVkFMSUQ6IDB4NjNcbiAgcmVhZG9ubHkgVW5kZXJncm91bmRDaGFubmVsICAgICAgID0gJCgweDY0LCB7YXJlYTogQXJlYXMuVW5kZXJncm91bmRDaGFubmVsfSk7XG4gIHJlYWRvbmx5IFpvbWJpZVRvd24gICAgICAgICAgICAgICA9ICQoMHg2NSwge2FyZWE6IEFyZWFzLlpvbWJpZVRvd259KTtcbiAgLy8gSU5WQUxJRDogMHg2NlxuICAvLyBJTlZBTElEOiAweDY3XG4gIHJlYWRvbmx5IEV2aWxTcGlyaXRJc2xhbmQxICAgICAgICA9ICQoMHg2OCwge2FyZWE6IEFyZWFzLkV2aWxTcGlyaXRJc2xhbmRFbnRyYW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgRXZpbFNwaXJpdElzbGFuZDIgICAgICAgID0gJCgweDY5LCB7YXJlYTogQXJlYXMuRXZpbFNwaXJpdElzbGFuZH0pO1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kMyAgICAgICAgPSAkKDB4NmEpO1xuICByZWFkb25seSBFdmlsU3Bpcml0SXNsYW5kNCAgICAgICAgPSAkKDB4NmIpO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UxICAgICAgICAgICAgPSAkKDB4NmMsIHthcmVhOiBBcmVhcy5TYWJlcmFGb3J0cmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHhmZH0pO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UyICAgICAgICAgICAgPSAkKDB4NmQpO1xuICByZWFkb25seSBTYWJlcmFQYWxhY2UzICAgICAgICAgICAgPSAkKDB4NmUsIHtib3NzU2NyZWVuOiAweGZkfSk7XG4gIC8vIElOVkFMSUQ6IDB4NmYgLS0gU2FiZXJhIFBhbGFjZSAzIHVudXNlZCBjb3B5XG4gIHJlYWRvbmx5IEpvZWxTZWNyZXRQYXNzYWdlICAgICAgICA9ICQoMHg3MCwge2FyZWE6IEFyZWFzLkpvZWxQYXNzYWdlfSk7XG4gIHJlYWRvbmx5IEpvZWwgICAgICAgICAgICAgICAgICAgICA9ICQoMHg3MSwge2FyZWE6IEFyZWFzLkpvZWx9KTtcbiAgcmVhZG9ubHkgU3dhbiAgICAgICAgICAgICAgICAgICAgID0gJCgweDcyLCB7YXJlYTogQXJlYXMuU3dhbiwgbXVzaWM6IDF9KTtcbiAgcmVhZG9ubHkgU3dhbkdhdGUgICAgICAgICAgICAgICAgID0gJCgweDczLCB7YXJlYTogQXJlYXMuU3dhbkdhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11c2ljOiAxfSk7XG4gIC8vIElOVkFMSUQ6IDB4NzRcbiAgLy8gSU5WQUxJRDogMHg3NVxuICAvLyBJTlZBTElEOiAweDc2XG4gIC8vIElOVkFMSUQ6IDB4NzdcbiAgcmVhZG9ubHkgR29hVmFsbGV5ICAgICAgICAgICAgICAgID0gJCgweDc4LCB7YXJlYTogQXJlYXMuR29hVmFsbGV5fSk7XG4gIC8vIElOVkFMSUQ6IDB4NzlcbiAgLy8gSU5WQUxJRDogMHg3YVxuICAvLyBJTlZBTElEOiAweDdiXG4gIHJlYWRvbmx5IE10SHlkcmEgICAgICAgICAgICAgICAgICA9ICQoMHg3Yywge2FyZWE6IEFyZWFzLk10SHlkcmF9KTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMSAgICAgICAgICAgID0gJCgweDdkLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9PdXRzaWRlU2h5cm9uICAgID0gJCgweDdlLCB7Zml4ZWQ6IFsweDBkLCAweDBlXX0pOyAvLyBndWFyZHNcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMiAgICAgICAgICAgID0gJCgweDdmLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMyAgICAgICAgICAgID0gJCgweDgwLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNCAgICAgICAgICAgID0gJCgweDgxLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNSAgICAgICAgICAgID0gJCgweDgyLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNiAgICAgICAgICAgID0gJCgweDgzLCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlNyAgICAgICAgICAgID0gJCgweDg0LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlOCAgICAgICAgICAgID0gJCgweDg1LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlOSAgICAgICAgICAgID0gJCgweDg2LCBDQVZFKTtcbiAgcmVhZG9ubHkgTXRIeWRyYV9DYXZlMTAgICAgICAgICAgID0gJCgweDg3LCBDQVZFKTtcbiAgcmVhZG9ubHkgU3R5eDEgICAgICAgICAgICAgICAgICAgID0gJCgweDg4LCB7YXJlYTogQXJlYXMuU3R5eH0pO1xuICByZWFkb25seSBTdHl4MiAgICAgICAgICAgICAgICAgICAgPSAkKDB4ODkpO1xuICByZWFkb25seSBTdHl4MyAgICAgICAgICAgICAgICAgICAgPSAkKDB4OGEpO1xuICAvLyBJTlZBTElEOiAweDhiXG4gIHJlYWRvbmx5IFNoeXJvbiAgICAgICAgICAgICAgICAgICA9ICQoMHg4Yywge2FyZWE6IEFyZWFzLlNoeXJvbn0pO1xuICAvLyBJTlZBTElEOiAweDhkXG4gIHJlYWRvbmx5IEdvYSAgICAgICAgICAgICAgICAgICAgICA9ICQoMHg4ZSwge2FyZWE6IEFyZWFzLkdvYX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc0Jhc2VtZW50ICAgICAgPSAkKDB4OGYsIHthcmVhOiBBcmVhcy5Gb3J0cmVzc0Jhc2VtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMH0pO1xuICByZWFkb25seSBEZXNlcnQxICAgICAgICAgICAgICAgICAgPSAkKDB4OTAsIHthcmVhOiBBcmVhcy5EZXNlcnQxfSk7XG4gIHJlYWRvbmx5IE9hc2lzQ2F2ZU1haW4gICAgICAgICAgICA9ICQoMHg5MSwge2FyZWE6IEFyZWFzLk9hc2lzQ2F2ZX0pO1xuICByZWFkb25seSBEZXNlcnRDYXZlMSAgICAgICAgICAgICAgPSAkKDB4OTIsIHthcmVhOiBBcmVhcy5EZXNlcnRDYXZlMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDB9KTtcbiAgcmVhZG9ubHkgU2FoYXJhICAgICAgICAgICAgICAgICAgID0gJCgweDkzLCB7YXJlYTogQXJlYXMuU2FoYXJhfSk7XG4gIHJlYWRvbmx5IFNhaGFyYU91dHNpZGVDYXZlICAgICAgICA9ICQoMHg5NCwge211c2ljOiAwfSk7IC8vIFRPRE8gLSBzYWhhcmE/PyBnZW5lcmljPz9cbiAgcmVhZG9ubHkgRGVzZXJ0Q2F2ZTIgICAgICAgICAgICAgID0gJCgweDk1LCB7YXJlYTogQXJlYXMuRGVzZXJ0Q2F2ZTIsIG11c2ljOiAxfSk7XG4gIHJlYWRvbmx5IFNhaGFyYU1lYWRvdyAgICAgICAgICAgICA9ICQoMHg5Niwge2FyZWE6IEFyZWFzLlNhaGFyYU1lYWRvdywgbXVzaWM6IDB9KTtcbiAgLy8gSU5WQUxJRDogMHg5N1xuICByZWFkb25seSBEZXNlcnQyICAgICAgICAgICAgICAgICAgPSAkKDB4OTgsIHthcmVhOiBBcmVhcy5EZXNlcnQyfSk7XG4gIC8vIElOVkFMSUQ6IDB4OTlcbiAgLy8gSU5WQUxJRDogMHg5YVxuICAvLyBJTlZBTElEOiAweDliXG4gIHJlYWRvbmx5IFB5cmFtaWRfRW50cmFuY2UgICAgICAgICA9ICQoMHg5Yywge2FyZWE6IEFyZWFzLlB5cmFtaWR9KTtcbiAgcmVhZG9ubHkgUHlyYW1pZF9CcmFuY2ggICAgICAgICAgID0gJCgweDlkKTtcbiAgcmVhZG9ubHkgUHlyYW1pZF9NYWluICAgICAgICAgICAgID0gJCgweDllKTtcbiAgcmVhZG9ubHkgUHlyYW1pZF9EcmF5Z29uICAgICAgICAgID0gJCgweDlmKTtcbiAgcmVhZG9ubHkgQ3J5cHRfRW50cmFuY2UgICAgICAgICAgID0gJCgweGEwLCB7YXJlYTogQXJlYXMuQ3J5cHR9KTtcbiAgcmVhZG9ubHkgQ3J5cHRfSGFsbDEgICAgICAgICAgICAgID0gJCgweGExKTtcbiAgcmVhZG9ubHkgQ3J5cHRfQnJhbmNoICAgICAgICAgICAgID0gJCgweGEyKTtcbiAgcmVhZG9ubHkgQ3J5cHRfRGVhZEVuZExlZnQgICAgICAgID0gJCgweGEzKTtcbiAgcmVhZG9ubHkgQ3J5cHRfRGVhZEVuZFJpZ2h0ICAgICAgID0gJCgweGE0KTtcbiAgcmVhZG9ubHkgQ3J5cHRfSGFsbDIgICAgICAgICAgICAgID0gJCgweGE1KTtcbiAgcmVhZG9ubHkgQ3J5cHRfRHJheWdvbjIgICAgICAgICAgID0gJCgweGE2KTtcbiAgcmVhZG9ubHkgQ3J5cHRfVGVsZXBvcnRlciAgICAgICAgID0gJCgweGE3LCB7bXVzaWM6ICdDcnlwdC1UZWxlcG9ydGVyJ30pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19FbnRyYW5jZSAgICAgPSAkKDB4YTgsIHthcmVhOiBBcmVhcy5Hb2FGb3J0cmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVzaWM6IDF9KTsgLy8gc2FtZSBhcyBuZXh0IGFyZWFcbiAgcmVhZG9ubHkgR29hRm9ydHJlc3NfS2VsYmVzcXVlICAgID0gJCgweGE5LCB7Ym9zc1NjcmVlbjogMHg3MyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uS0VMQkVTUVVFfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX1plYnUgICAgICAgICA9ICQoMHhhYSwgey4uLktFTEJFU1FVRSwgcGFsZXR0ZTogMX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19TYWJlcmEgICAgICAgPSAkKDB4YWIsIFNBQkVSQSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX1Rvcm5lbCAgICAgICA9ICQoMHhhYywge2Jvc3NTY3JlZW46IDB4OTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLlNBQkVSQSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFsZXR0ZTogMX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMSAgICAgICAgPSAkKDB4YWQsIE1BRE9fTE9XRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMiAgICAgICAgPSAkKDB4YWUsIE1BRE9fVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19NYWRvMyAgICAgICAgPSAkKDB4YWYsIE1BRE9fVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMSAgICAgPSAkKDB4YjAsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMiAgICAgPSAkKDB4YjEsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lMyAgICAgPSAkKDB4YjIsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNCAgICAgPSAkKDB4YjMsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNSAgICAgPSAkKDB4YjQsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNiAgICAgPSAkKDB4YjUsIEtBUk1JTkVfTE9XRVIpO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LYXJtaW5lNyAgICAgPSAkKDB4YjYsIHtib3NzU2NyZWVuOiAweGZkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5LQVJNSU5FX0xPV0VSfSk7XG4gIHJlYWRvbmx5IEdvYUZvcnRyZXNzX0V4aXQgICAgICAgICA9ICQoMHhiNywge211c2ljOiAwfSk7IC8vIHNhbWUgYXMgdG9wIGdvYVxuICByZWFkb25seSBPYXNpc0NhdmVfRW50cmFuY2UgICAgICAgPSAkKDB4YjgsIHthcmVhOiBBcmVhcy5PYXNpc0VudHJhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdXNpYzogMn0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19Bc2luYSAgICAgICAgPSAkKDB4YjksIHthcmVhOiBBcmVhcy5Hb2FGb3J0cmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uTUFET19VUFBFUixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9zc1NjcmVlbjogMHg5MX0pO1xuICByZWFkb25seSBHb2FGb3J0cmVzc19LZW5zdSAgICAgICAgPSAkKDB4YmEsIEtBUk1JTkVfVVBQRVIpO1xuICByZWFkb25seSBHb2FfSG91c2UgICAgICAgICAgICAgICAgPSAkKDB4YmIsIHthcmVhOiBBcmVhcy5Hb2EsIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IEdvYV9Jbm4gICAgICAgICAgICAgICAgICA9ICQoMHhiYywgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGJkXG4gIHJlYWRvbmx5IEdvYV9Ub29sU2hvcCAgICAgICAgICAgICA9ICQoMHhiZSwgSE9VU0UpO1xuICByZWFkb25seSBHb2FfVGF2ZXJuICAgICAgICAgICAgICAgPSAkKDB4YmYsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9FbGRlckhvdXNlICAgICAgICAgID0gJCgweGMwLCB7YXJlYTogQXJlYXMuTGVhZiwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgTGVhZl9SYWJiaXRIdXQgICAgICAgICAgID0gJCgweGMxLCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfSW5uICAgICAgICAgICAgICAgICA9ICQoMHhjMiwgSE9VU0UpO1xuICByZWFkb25seSBMZWFmX1Rvb2xTaG9wICAgICAgICAgICAgPSAkKDB4YzMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgTGVhZl9Bcm1vclNob3AgICAgICAgICAgID0gJCgweGM0LCBIT1VTRSk7XG4gIHJlYWRvbmx5IExlYWZfU3R1ZGVudEhvdXNlICAgICAgICA9ICQoMHhjNSwgSE9VU0UpO1xuICByZWFkb25seSBCcnlubWFlcl9UYXZlcm4gICAgICAgICAgPSAkKDB4YzYsIHthcmVhOiBBcmVhcy5CcnlubWFlciwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgQnJ5bm1hZXJfUGF3blNob3AgICAgICAgID0gJCgweGM3LCBIT1VTRSk7XG4gIHJlYWRvbmx5IEJyeW5tYWVyX0lubiAgICAgICAgICAgICA9ICQoMHhjOCwgSE9VU0UpO1xuICByZWFkb25seSBCcnlubWFlcl9Bcm1vclNob3AgICAgICAgPSAkKDB4YzksIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhjYVxuICByZWFkb25seSBCcnlubWFlcl9JdGVtU2hvcCAgICAgICAgPSAkKDB4Y2IsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhjY1xuICByZWFkb25seSBPYWtfRWxkZXJIb3VzZSAgICAgICAgICAgPSAkKDB4Y2QsIHthcmVhOiBBcmVhcy5PYWssIC4uLkhPVVNFfSk7XG4gIHJlYWRvbmx5IE9ha19Nb3RoZXJIb3VzZSAgICAgICAgICA9ICQoMHhjZSwgSE9VU0UpO1xuICByZWFkb25seSBPYWtfVG9vbFNob3AgICAgICAgICAgICAgPSAkKDB4Y2YsIEhPVVNFKTtcbiAgcmVhZG9ubHkgT2FrX0lubiAgICAgICAgICAgICAgICAgID0gJCgweGQwLCBIT1VTRSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0lubiAgICAgICAgICAgICA9ICQoMHhkMSwge2FyZWE6IEFyZWFzLkFtYXpvbmVzLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBBbWF6b25lc19JdGVtU2hvcCAgICAgICAgPSAkKDB4ZDIsIEhPVVNFKTtcbiAgcmVhZG9ubHkgQW1hem9uZXNfQXJtb3JTaG9wICAgICAgID0gJCgweGQzLCBIT1VTRSk7XG4gIHJlYWRvbmx5IEFtYXpvbmVzX0VsZGVyICAgICAgICAgICA9ICQoMHhkNCwgSE9VU0UpO1xuICByZWFkb25seSBOYWRhcmUgICAgICAgICAgICAgICAgICAgPSAkKDB4ZDUsIHthcmVhOiBBcmVhcy5OYWRhcmV9KTsgLy8gZWRnZS1kb29yP1xuICByZWFkb25seSBQb3J0b2FfRmlzaGVybWFuSG91c2UgICAgPSAkKDB4ZDYsIHthcmVhOiBBcmVhcy5GaXNoZXJtYW5Ib3VzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0UsIG11c2ljOiAwfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9QYWxhY2VFbnRyYW5jZSAgICA9ICQoMHhkNywge2FyZWE6IEFyZWFzLlBvcnRvYVBhbGFjZX0pO1xuICByZWFkb25seSBQb3J0b2FfRm9ydHVuZVRlbGxlciAgICAgPSAkKDB4ZDgsIHthcmVhOiBBcmVhcy5Qb3J0b2EsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpeGVkOiBbMHgwZCwgMHgwZV0sIC8vIGd1YXJkL2VtcHR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkZPUlRVTkVfVEVMTEVSfSk7XG4gIHJlYWRvbmx5IFBvcnRvYV9QYXduU2hvcCAgICAgICAgICA9ICQoMHhkOSwgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FfQXJtb3JTaG9wICAgICAgICAgPSAkKDB4ZGEsIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhkYlxuICByZWFkb25seSBQb3J0b2FfSW5uICAgICAgICAgICAgICAgPSAkKDB4ZGMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgUG9ydG9hX1Rvb2xTaG9wICAgICAgICAgID0gJCgweGRkLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYVBhbGFjZV9MZWZ0ICAgICAgICA9ICQoMHhkZSwge2FyZWE6IEFyZWFzLlBvcnRvYVBhbGFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgUG9ydG9hUGFsYWNlX1Rocm9uZVJvb20gID0gJCgweGRmLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFBvcnRvYVBhbGFjZV9SaWdodCAgICAgICA9ICQoMHhlMCwgSE9VU0UpO1xuICByZWFkb25seSBQb3J0b2FfQXNpbmFSb29tICAgICAgICAgPSAkKDB4ZTEsIHthcmVhOiBBcmVhcy5VbmRlcmdyb3VuZENoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLkhPVVNFLCBtdXNpYzogJ2FzaW5hJ30pO1xuICByZWFkb25seSBBbWF6b25lc19FbGRlckRvd25zdGFpcnMgPSAkKDB4ZTIsIHthcmVhOiBBcmVhcy5BbWF6b25lcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgSm9lbF9FbGRlckhvdXNlICAgICAgICAgID0gJCgweGUzLCB7YXJlYTogQXJlYXMuSm9lbCwgLi4uSE9VU0V9KTtcbiAgcmVhZG9ubHkgSm9lbF9TaGVkICAgICAgICAgICAgICAgID0gJCgweGU0LCBIT1VTRSk7XG4gIHJlYWRvbmx5IEpvZWxfVG9vbFNob3AgICAgICAgICAgICA9ICQoMHhlNSwgSE9VU0UpO1xuICAvLyBJTlZBTElEOiAweGU2XG4gIHJlYWRvbmx5IEpvZWxfSW5uICAgICAgICAgICAgICAgICA9ICQoMHhlNywgSE9VU0UpO1xuICByZWFkb25seSBab21iaWVUb3duX0hvdXNlICAgICAgICAgPSAkKDB4ZTgsIHthcmVhOiBBcmVhcy5ab21iaWVUb3duLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5IT1VTRX0pO1xuICByZWFkb25seSBab21iaWVUb3duX0hvdXNlQmFzZW1lbnQgPSAkKDB4ZTksIEhPVVNFKTtcbiAgLy8gSU5WQUxJRDogMHhlYVxuICByZWFkb25seSBTd2FuX1Rvb2xTaG9wICAgICAgICAgICAgPSAkKDB4ZWIsIHthcmVhOiBBcmVhcy5Td2FuLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBTd2FuX1N0b21IdXQgICAgICAgICAgICAgPSAkKDB4ZWMsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9Jbm4gICAgICAgICAgICAgICAgID0gJCgweGVkLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fQXJtb3JTaG9wICAgICAgICAgICA9ICQoMHhlZSwgSE9VU0UpO1xuICByZWFkb25seSBTd2FuX1RhdmVybiAgICAgICAgICAgICAgPSAkKDB4ZWYsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU3dhbl9QYXduU2hvcCAgICAgICAgICAgID0gJCgweGYwLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFN3YW5fRGFuY2VIYWxsICAgICAgICAgICA9ICQoMHhmMSwgSE9VU0UpO1xuICByZWFkb25seSBTaHlyb25fVGVtcGxlICAgICAgICAgICAgPSAkKDB4ZjIsIHthcmVhOiBBcmVhcy5TaHlyb25UZW1wbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvc3NTY3JlZW46IDB4NzB9KTtcbiAgcmVhZG9ubHkgU2h5cm9uX1RyYWluaW5nSGFsbCAgICAgID0gJCgweGYzLCB7YXJlYTogQXJlYXMuU2h5cm9uLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBTaHlyb25fSG9zcGl0YWwgICAgICAgICAgPSAkKDB4ZjQsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2h5cm9uX0FybW9yU2hvcCAgICAgICAgID0gJCgweGY1LCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNoeXJvbl9Ub29sU2hvcCAgICAgICAgICA9ICQoMHhmNiwgSE9VU0UpO1xuICByZWFkb25seSBTaHlyb25fSW5uICAgICAgICAgICAgICAgPSAkKDB4ZjcsIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2FoYXJhX0lubiAgICAgICAgICAgICAgID0gJCgweGY4LCB7YXJlYTogQXJlYXMuU2FoYXJhLCAuLi5IT1VTRX0pO1xuICByZWFkb25seSBTYWhhcmFfVG9vbFNob3AgICAgICAgICAgPSAkKDB4ZjksIEhPVVNFKTtcbiAgcmVhZG9ubHkgU2FoYXJhX0VsZGVySG91c2UgICAgICAgID0gJCgweGZhLCBIT1VTRSk7XG4gIHJlYWRvbmx5IFNhaGFyYV9QYXduU2hvcCAgICAgICAgICA9ICQoMHhmYiwgSE9VU0UpO1xuXG4gIC8vIE5ldyBsb2NhdGlvbnMsIG5vIElEIHByb2N1cmVkIHlldC5cbiAgcmVhZG9ubHkgRWFzdENhdmUxICAgICAgPSAkKC0xLCB7YXJlYTogQXJlYXMuRWFzdENhdmV9KTtcbiAgcmVhZG9ubHkgRWFzdENhdmUyICAgICAgPSAkKC0xKTtcbiAgcmVhZG9ubHkgRWFzdENhdmUzICAgICAgPSAkKC0xKTtcbiAgcmVhZG9ubHkgRmlzaGVybWFuQmVhY2ggPSAkKC0xLCB7YXJlYTogQXJlYXMuRmlzaGVybWFuSG91c2UsIC4uLkhPVVNFfSk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBsb2NzQnlTY3JlZW4gPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIExvY2F0aW9uW10+KCgpID0+IFtdKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHN1cGVyKDB4MTAwKTtcbiAgICAkLmNvbW1pdCh0aGlzKTtcbiAgICAvLyBGaWxsIGluIGFueSBtaXNzaW5nIG9uZXNcbiAgICBmb3IgKGxldCBpZCA9IDA7IGlkIDwgMHgxMDA7IGlkKyspIHtcbiAgICAgIGlmICh0aGlzW2lkXSkge1xuICAgICAgICB0aGlzLmluZGV4U2NyZWVucyh0aGlzW2lkXSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpc1tpZF0gPSBuZXcgTG9jYXRpb24ocm9tLCBpZCwge1xuICAgICAgICBhcmVhOiBBcmVhcy5VbnVzZWQsXG4gICAgICAgIG5hbWU6ICcnLFxuICAgICAgICBtdXNpYzogJycsXG4gICAgICAgIHBhbGV0dGU6ICcnLFxuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIFRPRE8gLSBtZXRob2QgdG8gYWRkIGFuIHVucmVnaXN0ZXJlZCBsb2NhdGlvbiB0byBhbiBlbXB0eSBpbmRleC5cbiAgfVxuXG4gIGluZGV4U2NyZWVucyhsb2M6IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3QgcyBvZiByb3cpIHtcbiAgICAgICAgdGhpcy5sb2NzQnlTY3JlZW4uZ2V0KHMpLnB1c2gobG9jKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZW51bWJlclNjcmVlbihvbGRJZDogbnVtYmVyLCBuZXdJZDogbnVtYmVyKSB7XG4gICAgY29uc3QgbG9jcyA9IHRoaXMubG9jc0J5U2NyZWVuLmdldChvbGRJZCk7XG4gICAgdGhpcy5sb2NzQnlTY3JlZW4uc2V0KG5ld0lkLCBsb2NzKTtcbiAgICB0aGlzLmxvY3NCeVNjcmVlbi5kZWxldGUob2xkSWQpO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIGxvY3MpIHtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIGxvYy5zY3JlZW5zKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm93Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHJvd1tpXSA9PT0gb2xkSWQpIHJvd1tpXSA9IG5ld0lkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWxsb2NhdGUobG9jYXRpb246IExvY2F0aW9uKTogTG9jYXRpb24ge1xuICAgIC8vIHBpY2sgYW4gdW51c2VkIGxvY2F0aW9uXG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMpIHtcbiAgICAgIGlmIChsLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgKGxvY2F0aW9uIGFzIGFueSkuaWQgPSBsLmlkO1xuICAgICAgbG9jYXRpb24udXNlZCA9IHRydWU7XG4gICAgICB0aGlzLmluZGV4U2NyZWVucyhsb2NhdGlvbik7XG4gICAgICByZXR1cm4gdGhpc1tsLmlkXSA9IGxvY2F0aW9uO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHVudXNlZCBsb2NhdGlvbicpO1xuICB9XG5cbiAgd3JpdGUoKTogTW9kdWxlW10ge1xuICAgIGNvbnN0IGEgPSB0aGlzLnJvbS5hc3NlbWJsZXIoKTtcbiAgICBmcmVlKGEsICQwYSwgMHg4NGY4LCAweGEwMDApO1xuICAgIGZyZWUoYSwgJDBiLCAweGEwMDAsIDB4YmUwMCk7XG4gICAgZnJlZShhLCAkMGMsIDB4OTNmOSwgMHhhMDAwKTtcbiAgICBmcmVlKGEsICQwZCwgMHhhMDAwLCAweGFjMDApO1xuICAgIGZyZWUoYSwgJDBkLCAweGFlMDAsIDB4YzAwMCk7IC8vIGJmMDAgPz8/XG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzKSB7XG4gICAgICBsb2NhdGlvbi5hc3NlbWJsZShhKTtcbiAgICB9XG4gICAgcmV0dXJuIFthLm1vZHVsZSgpXTtcbiAgfVxuXG4gIGNvcHlGcm9tTWV0YSgpIHtcbiAgICAvLyBGaXJzdCBzeW5jIHVwIENvcmRlbCdzIGV4aXRzLlxuICAgIHRoaXMuQ29yZGVsUGxhaW5FYXN0Lm1ldGEucmVjb25jaWxlRXhpdHModGhpcy5Db3JkZWxQbGFpbldlc3QubWV0YSk7XG4gICAgLy8gTm93IGRvIHRoZSBhY3R1YWwgY29weS5cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzKSB7XG4gICAgICBpZiAoIWxvYy51c2VkKSBjb250aW51ZTtcbiAgICAgIGxvYy5leGl0cyA9IFtdO1xuICAgICAgbG9jLmVudHJhbmNlcyA9IFtdO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzKSB7XG4gICAgICBpZiAoIWxvYy51c2VkKSBjb250aW51ZTtcbiAgICAgIGxvYy5tZXRhLndyaXRlKCk7XG4gICAgfVxuICB9XG59XG5cbi8vIExvY2F0aW9uIGVudGl0aWVzXG5leHBvcnQgY2xhc3MgTG9jYXRpb24gZXh0ZW5kcyBFbnRpdHkge1xuXG4gIHVzZWQ6IGJvb2xlYW47XG5cbiAgYmdtOiBudW1iZXI7XG4gIG9yaWdpbmFsQmdtOiBudW1iZXI7XG4gIGxheW91dFdpZHRoOiBudW1iZXI7XG4gIGxheW91dEhlaWdodDogbnVtYmVyO1xuICBhbmltYXRpb246IG51bWJlcjtcbiAgLy8gU2NyZWVuIGluZGljZXMgYXJlIChleHRlbmRlZCA8PCA4IHwgc2NyZWVuKVxuICAvLyBleHRlbmRlZDogbnVtYmVyO1xuICBzY3JlZW5zOiBudW1iZXJbXVtdO1xuXG4gIHRpbGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgdGlsZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gIG9yaWdpbmFsVGlsZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gIHRpbGVzZXQ6IG51bWJlcjtcbiAgdGlsZUVmZmVjdHM6IG51bWJlcjtcblxuICBlbnRyYW5jZXM6IEVudHJhbmNlW107XG4gIGV4aXRzOiBFeGl0W107XG4gIGZsYWdzOiBGbGFnW107XG4gIHBpdHM6IFBpdFtdO1xuXG4gIHNwcml0ZVBhbGV0dGVzOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzcHJpdGVQYXR0ZXJuczogW251bWJlciwgbnVtYmVyXTtcbiAgc3Bhd25zOiBTcGF3bltdO1xuXG4gIHByaXZhdGUgX2lzU2hvcDogYm9vbGVhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX21ldGE/OiBNZXRhbG9jYXRpb24gPSB1bmRlZmluZWQ7XG4gIC8vIExhemlseS1wb3B1bGF0ZWQgbWFwIGtleXMgZm9yIGtlZXBpbmcgY29uc2lzdGVudCBtdXNpYyBhbmQgY29sb3JzLlxuICBwcml2YXRlIF9tdXNpY0dyb3VwPzogc3RyaW5nfHN5bWJvbDtcbiAgcHJpdmF0ZSBfY29sb3JHcm91cD86IHN0cmluZ3xzeW1ib2w7XG5cbiAgY29uc3RydWN0b3Iocm9tOiBSb20sIGlkOiBudW1iZXIsIHJlYWRvbmx5IGRhdGE6IExvY2F0aW9uRGF0YSkge1xuICAgIC8vIHdpbGwgaW5jbHVkZSBib3RoIE1hcERhdGEgKmFuZCogTnBjRGF0YSwgc2luY2UgdGhleSBzaGFyZSBhIGtleS5cbiAgICBzdXBlcihyb20sIGlkKTtcblxuICAgIGNvbnN0IG1hcERhdGFCYXNlID1cbiAgICAgICAgaWQgPj0gMCA/IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgdGhpcy5tYXBEYXRhUG9pbnRlcikgKyAweGMwMDAgOiAwO1xuICAgIC8vIFRPRE8gLSBwYXNzIHRoaXMgaW4gYW5kIG1vdmUgTE9DQVRJT05TIHRvIGxvY2F0aW9ucy50c1xuICAgIHRoaXMudXNlZCA9IG1hcERhdGFCYXNlID4gMHhjMDAwICYmICEhdGhpcy5uYW1lO1xuXG4gICAgaWYgKCF0aGlzLnVzZWQpIHtcbiAgICAgIHRoaXMuYmdtID0gdGhpcy5vcmlnaW5hbEJnbSA9IDA7XG4gICAgICB0aGlzLmxheW91dFdpZHRoID0gMDtcbiAgICAgIHRoaXMubGF5b3V0SGVpZ2h0ID0gMDtcbiAgICAgIHRoaXMuYW5pbWF0aW9uID0gMDtcbiAgICAgIC8vIHRoaXMuZXh0ZW5kZWQgPSAwO1xuICAgICAgdGhpcy5zY3JlZW5zID0gW1swXV07XG4gICAgICB0aGlzLnRpbGVQYWxldHRlcyA9IFsweDI0LCAweDAxLCAweDI2XTtcbiAgICAgIHRoaXMub3JpZ2luYWxUaWxlUGFsZXR0ZXMgPSBbMHgyNCwgMHgwMSwgMHgyNl07XG4gICAgICB0aGlzLnRpbGVzZXQgPSAweDgwO1xuICAgICAgdGhpcy50aWxlRWZmZWN0cyA9IDB4YjM7XG4gICAgICB0aGlzLnRpbGVQYXR0ZXJucyA9IFsyLCA0XTtcbiAgICAgIHRoaXMuZXhpdHMgPSBbXTtcbiAgICAgIHRoaXMuZW50cmFuY2VzID0gW107XG4gICAgICB0aGlzLmZsYWdzID0gW107XG4gICAgICB0aGlzLnBpdHMgPSBbXTtcbiAgICAgIHRoaXMuc3Bhd25zID0gW107XG4gICAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID0gWzAsIDBdO1xuICAgICAgdGhpcy5zcHJpdGVQYXR0ZXJucyA9IFswLCAwXTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBsYXlvdXRCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSkgKyAweGMwMDA7XG4gICAgY29uc3QgZ3JhcGhpY3NCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDIpICsgMHhjMDAwO1xuICAgIGNvbnN0IGVudHJhbmNlc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIG1hcERhdGFCYXNlICsgNCkgKyAweGMwMDA7XG4gICAgY29uc3QgZXhpdHNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBtYXBEYXRhQmFzZSArIDYpICsgMHhjMDAwO1xuICAgIGNvbnN0IGZsYWdzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyA4KSArIDB4YzAwMDtcblxuICAgIC8vIFJlYWQgdGhlIGV4aXRzIGZpcnN0IHNvIHRoYXQgd2UgY2FuIGRldGVybWluZSBpZiB0aGVyZSdzIGVudHJhbmNlL3BpdHNcbiAgICAvLyBtZXRhZGF0YSBlbmNvZGVkIGF0IHRoZSBlbmQuXG4gICAgbGV0IGhhc1BpdHMgPSB0aGlzLnVzZWQgJiYgbGF5b3V0QmFzZSAhPT0gbWFwRGF0YUJhc2UgKyAxMDtcbiAgICBsZXQgZW50cmFuY2VMZW4gPSBleGl0c0Jhc2UgLSBlbnRyYW5jZXNCYXNlO1xuICAgIHRoaXMuZXhpdHMgPSAoKCkgPT4ge1xuICAgICAgY29uc3QgZXhpdHMgPSBbXTtcbiAgICAgIGxldCBpID0gZXhpdHNCYXNlO1xuICAgICAgd2hpbGUgKCEocm9tLnByZ1tpXSAmIDB4ODApKSB7XG4gICAgICAgIC8vIE5PVEU6IHNldCBkZXN0IHRvIEZGIHRvIGRpc2FibGUgYW4gZXhpdCAoaXQncyBhbiBpbnZhbGlkIGxvY2F0aW9uIGFueXdheSlcbiAgICAgICAgaWYgKHJvbS5wcmdbaSArIDJdICE9IDB4ZmYpIHtcbiAgICAgICAgICBleGl0cy5wdXNoKEV4aXQuZnJvbShyb20ucHJnLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgaSArPSA0O1xuICAgICAgfVxuICAgICAgaWYgKHJvbS5wcmdbaV0gIT09IDB4ZmYpIHtcbiAgICAgICAgaGFzUGl0cyA9ICEhKHJvbS5wcmdbaV0gJiAweDQwKTtcbiAgICAgICAgZW50cmFuY2VMZW4gPSAocm9tLnByZ1tpXSAmIDB4MWYpIDw8IDI7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXhpdHM7XG4gICAgfSkoKTtcblxuICAgIC8vIFRPRE8gLSB0aGVzZSBoZXVyaXN0aWNzIHdpbGwgbm90IHdvcmsgdG8gcmUtcmVhZCB0aGUgbG9jYXRpb25zLlxuICAgIC8vICAgICAgLSB3ZSBjYW4gbG9vayBhdCB0aGUgb3JkZXI6IGlmIHRoZSBkYXRhIGlzIEJFRk9SRSB0aGUgcG9pbnRlcnNcbiAgICAvLyAgICAgICAgdGhlbiB3ZSdyZSBpbiBhIHJld3JpdHRlbiBzdGF0ZTsgaW4gdGhhdCBjYXNlLCB3ZSBuZWVkIHRvIHNpbXBseVxuICAgIC8vICAgICAgICBmaW5kIGFsbCByZWZzIGFuZCBtYXguLi4/XG4gICAgLy8gICAgICAtIGNhbiB3ZSByZWFkIHRoZXNlIHBhcnRzIGxhemlseT9cbiAgICBjb25zdCBwaXRzQmFzZSA9XG4gICAgICAgICFoYXNQaXRzID8gMCA6IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgbWFwRGF0YUJhc2UgKyAxMCkgKyAweGMwMDA7XG5cbiAgICB0aGlzLmJnbSA9IHRoaXMub3JpZ2luYWxCZ20gPSByb20ucHJnW2xheW91dEJhc2VdO1xuICAgIHRoaXMubGF5b3V0V2lkdGggPSByb20ucHJnW2xheW91dEJhc2UgKyAxXTtcbiAgICB0aGlzLmxheW91dEhlaWdodCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDJdO1xuICAgIHRoaXMuYW5pbWF0aW9uID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgM107XG4gICAgLy8gdGhpcy5leHRlbmRlZCA9IHJvbS5wcmdbbGF5b3V0QmFzZSArIDRdO1xuICAgIGNvbnN0IGV4dGVuZGVkID0gcm9tLnByZ1tsYXlvdXRCYXNlICsgNF0gPyAweDEwMCA6IDA7XG4gICAgdGhpcy5zY3JlZW5zID0gc2VxKFxuICAgICAgICB0aGlzLmhlaWdodCxcbiAgICAgICAgeSA9PiB0dXBsZShyb20ucHJnLCBsYXlvdXRCYXNlICsgNSArIHkgKiB0aGlzLndpZHRoLCB0aGlzLndpZHRoKVxuICAgICAgICAgICAgICAgICAubWFwKHMgPT4gZXh0ZW5kZWQgfCBzKSk7XG4gICAgdGhpcy50aWxlUGFsZXR0ZXMgPSB0dXBsZTxudW1iZXI+KHJvbS5wcmcsIGdyYXBoaWNzQmFzZSwgMyk7XG4gICAgdGhpcy5vcmlnaW5hbFRpbGVQYWxldHRlcyA9IHR1cGxlKHRoaXMudGlsZVBhbGV0dGVzLCAwLCAzKTtcbiAgICB0aGlzLnRpbGVzZXQgPSByb20ucHJnW2dyYXBoaWNzQmFzZSArIDNdO1xuICAgIHRoaXMudGlsZUVmZmVjdHMgPSByb20ucHJnW2dyYXBoaWNzQmFzZSArIDRdO1xuICAgIHRoaXMudGlsZVBhdHRlcm5zID0gdHVwbGUocm9tLnByZywgZ3JhcGhpY3NCYXNlICsgNSwgMik7XG5cbiAgICB0aGlzLmVudHJhbmNlcyA9XG4gICAgICBncm91cCg0LCByb20ucHJnLnNsaWNlKGVudHJhbmNlc0Jhc2UsIGVudHJhbmNlc0Jhc2UgKyBlbnRyYW5jZUxlbiksXG4gICAgICAgICAgICB4ID0+IEVudHJhbmNlLmZyb20oeCkpO1xuICAgIHRoaXMuZmxhZ3MgPSB2YXJTbGljZShyb20ucHJnLCBmbGFnc0Jhc2UsIDIsIDB4ZmYsIEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IEZsYWcuZnJvbSh4KSk7XG4gICAgdGhpcy5waXRzID0gcGl0c0Jhc2UgPyB2YXJTbGljZShyb20ucHJnLCBwaXRzQmFzZSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IFBpdC5mcm9tKHgpKSA6IFtdO1xuXG4gICAgY29uc3QgbnBjRGF0YUJhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIHRoaXMubnBjRGF0YVBvaW50ZXIpICsgMHgxMDAwMDtcbiAgICBjb25zdCBoYXNTcGF3bnMgPSBucGNEYXRhQmFzZSAhPT0gMHgxMDAwMDtcbiAgICB0aGlzLnNwcml0ZVBhbGV0dGVzID1cbiAgICAgICAgaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgbnBjRGF0YUJhc2UgKyAxLCAyKSA6IFswLCAwXTtcbiAgICB0aGlzLnNwcml0ZVBhdHRlcm5zID1cbiAgICAgICAgaGFzU3Bhd25zID8gdHVwbGUocm9tLnByZywgbnBjRGF0YUJhc2UgKyAzLCAyKSA6IFswLCAwXTtcbiAgICB0aGlzLnNwYXducyA9XG4gICAgICAgIGhhc1NwYXducyA/IHZhclNsaWNlKHJvbS5wcmcsIG5wY0RhdGFCYXNlICsgNSwgNCwgMHhmZiwgSW5maW5pdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gU3Bhd24uZnJvbSh4KSkgOiBbXTtcbiAgfVxuXG4gIHNldCBtZXRhKG1ldGE6IE1ldGFsb2NhdGlvbikge1xuICAgIHRoaXMuX21ldGEgPSBtZXRhO1xuICB9XG4gIGdldCBtZXRhKCk6IE1ldGFsb2NhdGlvbiB7XG4gICAgdGhpcy5lbnN1cmVNZXRhKCk7XG4gICAgcmV0dXJuIHRoaXMuX21ldGEhO1xuICB9XG4gIGVuc3VyZU1ldGEoKSB7XG4gICAgaWYgKCF0aGlzLl9tZXRhKSB0aGlzLl9tZXRhID0gTWV0YWxvY2F0aW9uLm9mKHRoaXMpO1xuICB9XG5cbiAgc2V0IG11c2ljR3JvdXAoZ3JvdXA6IHN0cmluZ3xzeW1ib2wpIHtcbiAgICB0aGlzLl9tdXNpY0dyb3VwID0gZ3JvdXA7XG4gIH1cbiAgZ2V0IG11c2ljR3JvdXAoKTogc3RyaW5nfHN5bWJvbCB7XG4gICAgdGhpcy5lbnN1cmVNdXNpY0dyb3VwKCk7XG4gICAgcmV0dXJuIHRoaXMuX211c2ljR3JvdXAhO1xuICB9XG4gIGVuc3VyZU11c2ljR3JvdXAoKSB7XG4gICAgaWYgKHRoaXMuX211c2ljR3JvdXAgPT0gbnVsbCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5kYXRhLm11c2ljO1xuICAgICAgdGhpcy5fbXVzaWNHcm91cCA9XG4gICAgICAgICAgdHlwZW9mIGtleSAhPT0gJ251bWJlcicgPyBrZXkgOlxuICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5leGl0c1trZXldLmRlc3RdLm11c2ljR3JvdXA7XG4gICAgfVxuICB9XG5cbiAgc2V0IGNvbG9yR3JvdXAoZ3JvdXA6IHN0cmluZ3xzeW1ib2wpIHtcbiAgICB0aGlzLl9jb2xvckdyb3VwID0gZ3JvdXA7XG4gIH1cbiAgZ2V0IGNvbG9yR3JvdXAoKTogc3RyaW5nfHN5bWJvbCB7XG4gICAgdGhpcy5lbnN1cmVDb2xvckdyb3VwKCk7XG4gICAgcmV0dXJuIHRoaXMuX2NvbG9yR3JvdXAhO1xuICB9XG4gIGVuc3VyZUNvbG9yR3JvdXAoKSB7XG4gICAgaWYgKHRoaXMuX2NvbG9yR3JvdXAgPT0gbnVsbCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5kYXRhLm11c2ljO1xuICAgICAgdGhpcy5fY29sb3JHcm91cCA9XG4gICAgICAgICAgdHlwZW9mIGtleSAhPT0gJ251bWJlcicgPyBrZXkgOlxuICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnNbdGhpcy5leGl0c1trZXldLmRlc3RdLmNvbG9yR3JvdXA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERvIGFsbCB0aGUgaW5pdGlhbGl6YXRpb24gdGhhdCBoYXMgdG8gaGFwcGVuIGFmdGVyIGFsbCBsb2NhdGlvbnNcbiAgICogaGF2ZSBiZWVuIGNvbnN0cnVjdGVkLlxuICAgKi9cbiAgbGF6eUluaXRpYWxpemF0aW9uKCkge1xuICAgIHRoaXMuZW5zdXJlTWV0YSgpO1xuICAgIHRoaXMuZW5zdXJlTXVzaWNHcm91cCgpO1xuICAgIHRoaXMuZW5zdXJlQ29sb3JHcm91cCgpO1xuICB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLm5hbWU7XG4gIH1cblxuICBnZXQgbWFwRGF0YVBvaW50ZXIoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5pZCA8IDApIHRocm93IG5ldyBFcnJvcihgbm8gbWFwZGF0YSBwb2ludGVyIGZvciAke3RoaXMubmFtZX1gKTtcbiAgICByZXR1cm4gMHgxNDMwMCArICh0aGlzLmlkIDw8IDEpO1xuICB9XG5cbiAgZ2V0IG5wY0RhdGFQb2ludGVyKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuaWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIG5wY2RhdGEgcG9pbnRlciBmb3IgJHt0aGlzLm5hbWV9YCk7XG4gICAgcmV0dXJuIDB4MTkyMDEgKyAodGhpcy5pZCA8PCAxKTtcbiAgfVxuXG4gIGdldCBoYXNTcGF3bnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3Bhd25zLmxlbmd0aCA+IDA7XG4gIH1cblxuICAvLyAvLyBPZmZzZXQgdG8gT1Igd2l0aCBzY3JlZW4gSURzLlxuICAvLyBnZXQgc2NyZWVuUGFnZSgpOiBudW1iZXIge1xuICAvLyAgIGlmICghdGhpcy5yb20uY29tcHJlc3NlZE1hcERhdGEpIHJldHVybiB0aGlzLmV4dGVuZGVkID8gMHgxMDAgOiAwO1xuICAvLyAgIHJldHVybiB0aGlzLmV4dGVuZGVkIDw8IDg7XG4gIC8vIH1cblxuICBtYXBQbGFuZSgpOiBudW1iZXIge1xuICAgIGNvbnN0IHNldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHRoaXMuc2NyZWVucykge1xuICAgICAgZm9yIChjb25zdCBzIG9mIHJvdykge1xuICAgICAgICBzZXQuYWRkKHMgPj4+IDgpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2V0LnNpemUgIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSBzY3JlZW4gcGFnZTogJHtbLi4uc2V0XS5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgICByZXR1cm4gc2V0W1N5bWJvbC5pdGVyYXRvcl0oKS5uZXh0KCkudmFsdWU7XG4gIH1cblxuICBpc1Nob3AoKTogYm9vbGVhbiB7XG4gICAgLy9yZXR1cm4gdGhpcy5yb20uc2hvcHMuZmluZEluZGV4KHMgPT4gcy5sb2NhdGlvbiA9PT0gdGhpcy5pZCkgPj0gMDtcbiAgICBpZiAodGhpcy5faXNTaG9wID09IG51bGwpIHtcbiAgICAgIHRoaXMuX2lzU2hvcCA9IHRoaXMucm9tLnNob3BzLmZpbmRJbmRleChzID0+IHMubG9jYXRpb24gPT09IHRoaXMuaWQpID49IDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pc1Nob3A7XG4gIH1cblxuICAvL3NldElzU2hvcChpc1Nob3A6IGJvb2xlYW4pIHsgdGhpcy5faXNTaG9wID0gaXNTaG9wOyB9XG5cbiAgc3Bhd24oaWQ6IG51bWJlcik6IFNwYXduIHtcbiAgICBjb25zdCBzcGF3biA9IHRoaXMuc3Bhd25zW2lkIC0gMHhkXTtcbiAgICBpZiAoIXNwYXduKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHNwYXduICQke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHNwYXduO1xuICB9XG5cbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmxheW91dFdpZHRoICsgMTsgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlcikgeyB0aGlzLmxheW91dFdpZHRoID0gd2lkdGggLSAxOyB9XG5cbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sYXlvdXRIZWlnaHQgKyAxOyB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHsgdGhpcy5sYXlvdXRIZWlnaHQgPSBoZWlnaHQgLSAxOyB9XG5cbiAgZmluZE9yQWRkRW50cmFuY2Uoc2NyZWVuOiBudW1iZXIsIGNvb3JkOiBudW1iZXIpOiBudW1iZXIge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5lbnRyYW5jZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZXNbaV07XG4gICAgICBpZiAoZW50cmFuY2Uuc2NyZWVuID09PSBzY3JlZW4gJiYgZW50cmFuY2UuY29vcmQgPT09IGNvb3JkKSByZXR1cm4gaTtcbiAgICB9XG4gICAgdGhpcy5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7c2NyZWVuLCBjb29yZH0pKTtcbiAgICByZXR1cm4gdGhpcy5lbnRyYW5jZXMubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIC8vIG1vbnN0ZXJzKCkge1xuICAvLyAgIGlmICghdGhpcy5zcGF3bnMpIHJldHVybiBbXTtcbiAgLy8gICByZXR1cm4gdGhpcy5zcGF3bnMuZmxhdE1hcChcbiAgLy8gICAgIChbLCwgdHlwZSwgaWRdLCBzbG90KSA9PlxuICAvLyAgICAgICB0eXBlICYgNyB8fCAhdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0gPyBbXSA6IFtcbiAgLy8gICAgICAgICBbdGhpcy5pZCxcbiAgLy8gICAgICAgICAgc2xvdCArIDB4MGQsXG4gIC8vICAgICAgICAgIHR5cGUgJiAweDgwID8gMSA6IDAsXG4gIC8vICAgICAgICAgIGlkICsgMHg1MCxcbiAgLy8gICAgICAgICAgdGhpcy5zcHJpdGVQYXR0ZXJuc1t0eXBlICYgMHg4MCA/IDEgOiAwXSxcbiAgLy8gICAgICAgICAgdGhpcy5yb20uc3Bhd25zW2lkICsgMHg1MF0ucGFsZXR0ZXMoKVswXSxcbiAgLy8gICAgICAgICAgdGhpcy5zcHJpdGVQYWxldHRlc1t0aGlzLnJvbS5zcGF3bnNbaWQgKyAweDUwXS5wYWxldHRlcygpWzBdIC0gMl0sXG4gIC8vICAgICAgICAgXV0pO1xuICAvLyB9XG5cbiAgYXNzZW1ibGUoYTogQXNzZW1ibGVyKSB7XG4gICAgaWYgKCF0aGlzLnVzZWQpIHJldHVybjtcbiAgICBjb25zdCBpZCA9IHRoaXMuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgLy8gY29uc3QgJGxheW91dCA9IGBMYXlvdXRfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRncmFwaGljcyA9IGBHcmFwaGljc18ke2lkfWA7XG4gICAgLy8gY29uc3QgJGVudHJhbmNlcyA9IGBFbnRyYW5jZXNfJHtpZH1gO1xuICAgIC8vIGNvbnN0ICRleGl0cyA9IGBFeGl0c18ke2lkfWA7XG4gICAgLy8gY29uc3QgJGZsYWdzID0gYEZsYWdzXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkcGl0cyA9IGBQaXRzXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkbWFwZGF0YSA9IGBNYXBEYXRhXyR7aWR9YDtcbiAgICAvLyBjb25zdCAkbnBjZGF0YSA9IGBOcGNEYXRhXyR7aWR9YDtcblxuICAgIGNvbnN0IHNwcml0ZVBhbCA9IHRoaXMuc3Bhd25zLmxlbmd0aCA/IHRoaXMuc3ByaXRlUGFsZXR0ZXMgOiBbMHhmZiwgMHhmZl07XG4gICAgY29uc3Qgc3ByaXRlUGF0ID0gdGhpcy5zcGF3bnMubGVuZ3RoID8gdGhpcy5zcHJpdGVQYXR0ZXJucyA6IFsweGZmLCAweGZmXTtcbiAgICBjb25zdCBtYXBEYXRhOiBFeHByW10gPSBbXTtcbiAgICAvLyB3cml0ZSBOUEMgZGF0YSBmaXJzdCwgaWYgcHJlc2VudC4uLlxuICAgIGNvbnN0IG5wY0RhdGEgPSBbMCwgLi4uc3ByaXRlUGFsLCAuLi5zcHJpdGVQYXQsXG4gICAgICAgICAgICAgICAgICAgICAuLi5jb25jYXRJdGVyYWJsZXModGhpcy5zcGF3bnMpLCAweGZmXTtcbiAgICBhLnNlZ21lbnQoJzBjJywgJzBkJyk7XG4gICAgYS5yZWxvYyhgTnBjRGF0YV8ke2lkfWApO1xuICAgIGNvbnN0ICRucGNEYXRhID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi5ucGNEYXRhKTtcbiAgICBhLm9yZygweDkyMDEgKyAodGhpcy5pZCA8PCAxKSwgYE5wY0RhdGFfJHtpZH1fUHRyYCk7XG4gICAgYS53b3JkKCRucGNEYXRhKTtcblxuICAgIC8vIHdpdGUgbWFwZGF0YVxuICAgIGEuc2VnbWVudCgnMGEnLCAnMGInKTtcbiAgICAvL2NvbnN0IGV4dCA9IG5ldyBTZXQodGhpcy5zY3JlZW5zLm1hcChzID0+IHMgPj4gOCkpO1xuICAgIGNvbnN0IHNjcmVlbnMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgY29uY2F0SXRlcmFibGVzKHRoaXMuc2NyZWVucykpIHtcbiAgICAgIHNjcmVlbnMucHVzaChzICYgMHhmZik7XG4gICAgfVxuICAgIGNvbnN0IGxheW91dCA9IHRoaXMucm9tLmNvbXByZXNzZWRNYXBEYXRhID8gW1xuICAgICAgdGhpcy5iZ20sXG4gICAgICAvLyBDb21wcmVzc2VkIHZlcnNpb246IHl4IGluIG9uZSBieXRlLCBleHQrYW5pbSBpbiBvbmUgYnl0ZVxuICAgICAgdGhpcy5sYXlvdXRIZWlnaHQgPDwgNCB8IHRoaXMubGF5b3V0V2lkdGgsXG4gICAgICB0aGlzLm1hcFBsYW5lKCkgPDwgMiB8IHRoaXMuYW5pbWF0aW9uLCAuLi5zY3JlZW5zLFxuICAgIF0gOiBbXG4gICAgICB0aGlzLmJnbSwgdGhpcy5sYXlvdXRXaWR0aCwgdGhpcy5sYXlvdXRIZWlnaHQsXG4gICAgICB0aGlzLmFuaW1hdGlvbiwgdGhpcy5tYXBQbGFuZSgpID8gMHg4MCA6IDAsIC4uLnNjcmVlbnMsXG4gICAgXTtcbiAgICBhLnJlbG9jKGBNYXBEYXRhXyR7aWR9X0xheW91dGApO1xuICAgIGNvbnN0ICRsYXlvdXQgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLmxheW91dCk7XG4gICAgbWFwRGF0YS5wdXNoKCRsYXlvdXQpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9HcmFwaGljc2ApO1xuICAgIGNvbnN0ICRncmFwaGljcyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4udGhpcy50aWxlUGFsZXR0ZXMsXG4gICAgICAgICAgIHRoaXMudGlsZXNldCwgdGhpcy50aWxlRWZmZWN0cyxcbiAgICAgICAgICAgLi4udGhpcy50aWxlUGF0dGVybnMpO1xuICAgIG1hcERhdGEucHVzaCgkZ3JhcGhpY3MpO1xuXG4gICAgLy8gUXVpY2sgc2FuaXR5IGNoZWNrOiBpZiBhbiBlbnRyYW5jZS9leGl0IGlzIGJlbG93IHRoZSBIVUQgb24gYVxuICAgIC8vIG5vbi12ZXJ0aWNhbGx5IHNjcm9sbGluZyBtYXAsIHRoZW4gd2UgbmVlZCB0byBtb3ZlIGl0IHVwXG4gICAgLy8gTk9URTogdGhpcyBpcyBpZGVtcG90ZW50Li5cbiAgICBpZiAodGhpcy5oZWlnaHQgPT09IDEpIHtcbiAgICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgICAgaWYgKCFlbnRyYW5jZS51c2VkKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGVudHJhbmNlLnkgPiAweGJmKSBlbnRyYW5jZS55ID0gMHhiZjtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICAgIGlmIChleGl0Lnl0ID4gMHgwYykgZXhpdC55dCA9IDB4MGM7XG4gICAgICB9XG4gICAgfVxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fRW50cmFuY2VzYCk7XG4gICAgY29uc3QgJGVudHJhbmNlcyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZW50cmFuY2VzKSk7XG4gICAgbWFwRGF0YS5wdXNoKCRlbnRyYW5jZXMpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9FeGl0c2ApO1xuICAgIGNvbnN0ICRleGl0cyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZXhpdHMpLFxuICAgICAgICAgICAweDgwIHwgKHRoaXMucGl0cy5sZW5ndGggPyAweDQwIDogMCkgfCB0aGlzLmVudHJhbmNlcy5sZW5ndGgpO1xuICAgIG1hcERhdGEucHVzaCgkZXhpdHMpO1xuXG4gICAgYS5yZWxvYyhgTWFwRGF0YV8ke2lkfV9GbGFnc2ApO1xuICAgIGNvbnN0ICRmbGFncyA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4uY29uY2F0SXRlcmFibGVzKHRoaXMuZmxhZ3MpLCAweGZmKTtcbiAgICBtYXBEYXRhLnB1c2goJGZsYWdzKTtcblxuICAgIGNvbnN0IHBpdHMgPSBjb25jYXRJdGVyYWJsZXModGhpcy5waXRzKTtcbiAgICBpZiAocGl0cy5sZW5ndGgpIHtcbiAgICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1fUGl0c2ApO1xuICAgICAgY29uc3QgJHBpdHMgPSBhLnBjKCk7XG4gICAgICBhLmJ5dGUoLi4ucGl0cyk7XG4gICAgICBtYXBEYXRhLnB1c2goJHBpdHMpO1xuICAgIH1cblxuICAgIGEucmVsb2MoYE1hcERhdGFfJHtpZH1gKTtcbiAgICBjb25zdCAkbWFwRGF0YSA9IGEucGMoKTtcbiAgICBhLndvcmQoLi4ubWFwRGF0YSk7XG5cbiAgICBhLm9yZygweDgzMDAgKyAodGhpcy5pZCA8PCAxKSwgYE1hcERhdGFfJHtpZH1fUHRyYCk7XG4gICAgYS53b3JkKCRtYXBEYXRhKTtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBib3NzIHJvb20sIHdyaXRlIHRoZSByZXN0b3JhdGlvbi5cbiAgICBjb25zdCBib3NzSWQgPSB0aGlzLmJvc3NJZCgpO1xuICAgIGlmIChib3NzSWQgIT0gbnVsbCAmJiB0aGlzLmlkICE9PSAweDVmKSB7IC8vIGRvbid0IHJlc3RvcmUgZHluYVxuICAgICAgLy8gVGhpcyB0YWJsZSBzaG91bGQgcmVzdG9yZSBwYXQwIGJ1dCBub3QgcGF0MVxuICAgICAgbGV0IHBhdHMgPSBbc3ByaXRlUGF0WzBdLCB1bmRlZmluZWRdO1xuICAgICAgaWYgKHRoaXMuaWQgPT09IDB4YTYpIHBhdHMgPSBbMHg1MywgMHg1MF07IC8vIGRyYXlnb24gMlxuICAgICAgY29uc3QgYm9zc0Jhc2UgPSB0aGlzLnJvbS5ib3NzS2lsbHNbYm9zc0lkXS5iYXNlO1xuICAgICAgLy8gU2V0IHRoZSBcInJlc3RvcmUgbXVzaWNcIiBieXRlIGZvciB0aGUgYm9zcywgYnV0IGlmIGl0J3MgRHJheWdvbiAyLCBzZXRcbiAgICAgIC8vIGl0IHRvIHplcm8gc2luY2Ugbm8gbXVzaWMgaXMgYWN0dWFsbHkgcGxheWluZywgYW5kIGlmIHRoZSBtdXNpYyBpbiB0aGVcbiAgICAgIC8vIHRlbGVwb3J0ZXIgcm9vbSBoYXBwZW5zIHRvIGJlIHRoZSBzYW1lIGFzIHRoZSBtdXNpYyBpbiB0aGUgY3J5cHQsIHRoZW5cbiAgICAgIC8vIHJlc2V0dGluZyB0byB0aGF0IG1lYW5zIGl0IHdpbGwganVzdCByZW1haW4gc2lsZW50LCBhbmQgbm90IHJlc3RhcnQuXG4gICAgICBjb25zdCByZXN0b3JlQmdtID0gdGhpcy5pZCA9PT0gMHhhNiA/IDAgOiB0aGlzLmJnbTtcbiAgICAgIGNvbnN0IGJvc3NSZXN0b3JlID0gW1xuICAgICAgICAsLCwgcmVzdG9yZUJnbSwsXG4gICAgICAgIC4uLnRoaXMudGlsZVBhbGV0dGVzLCwsLCB0aGlzLnNwcml0ZVBhbGV0dGVzWzBdLCxcbiAgICAgICAgLCwsLCAvKnBhdHNbMF0qLywgLypwYXRzWzFdKi8sXG4gICAgICAgIHRoaXMuYW5pbWF0aW9uLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IFtdID0gW3BhdHNdOyAvLyBhdm9pZCBlcnJvclxuXG4gICAgICAvLyBpZiAocmVhZExpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBib3NzQmFzZSkgPT09IDB4YmE5OCkge1xuICAgICAgLy8gICAvLyBlc2NhcGUgYW5pbWF0aW9uOiBkb24ndCBjbG9iYmVyIHBhdHRlcm5zIHlldD9cbiAgICAgIC8vIH1cbiAgICAgIGEuc2VnbWVudCgnMGYnKTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYm9zc1Jlc3RvcmUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgY29uc3QgcmVzdG9yZWQgPSBib3NzUmVzdG9yZVtqXTtcbiAgICAgICAgaWYgKHJlc3RvcmVkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBhLm9yZyhib3NzQmFzZSArIGosIGBCb3NzXyR7Ym9zc0lkfV8ke2p9YCk7XG4gICAgICAgIGEuYnl0ZShyZXN0b3JlZCk7XG4gICAgICB9XG4gICAgICAvLyBsYXRlciBzcG90IGZvciBwYWwzIGFuZCBwYXQxICphZnRlciogZXhwbG9zaW9uXG4gICAgICBjb25zdCBib3NzQmFzZTIgPSAweGI3YzEgKyA1ICogYm9zc0lkOyAvLyAxZjdjMVxuICAgICAgYS5vcmcoYm9zc0Jhc2UyLCBgQm9zc18ke2Jvc3NJZH1fUG9zdGApO1xuICAgICAgYS5ieXRlKHNwcml0ZVBhbFsxXSk7XG4gICAgICAvLyBOT1RFOiBUaGlzIHJ1aW5zIHRoZSB0cmVhc3VyZSBjaGVzdC5cbiAgICAgIC8vIFRPRE8gLSBhZGQgc29tZSBhc20gYWZ0ZXIgYSBjaGVzdCBpcyBjbGVhcmVkIHRvIHJlbG9hZCBwYXR0ZXJucz9cbiAgICAgIC8vIEFub3RoZXIgb3B0aW9uIHdvdWxkIGJlIHRvIGFkZCBhIGxvY2F0aW9uLXNwZWNpZmljIGNvbnRyYWludCB0byBiZVxuICAgICAgLy8gd2hhdGV2ZXIgdGhlIGJvc3MgXG4gICAgICAvL3dyaXRlci5yb21bYm9zc0Jhc2UyICsgMV0gPSB0aGlzLnNwcml0ZVBhdHRlcm5zWzFdO1xuICAgIH1cbiAgfVxuXG4gIGFsbFNjcmVlbnMoKTogU2V0PFNjcmVlbj4ge1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLnNjcmVlbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHJvdykge1xuICAgICAgICBzY3JlZW5zLmFkZCh0aGlzLnJvbS5zY3JlZW5zW3NjcmVlbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2NyZWVucztcbiAgfVxuXG4gIGJvc3NJZCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgwZTsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5yb20ucHJnWzB4MWY5NWQgKyBpXSA9PT0gdGhpcy5pZCkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBuZWlnaGJvcnMoam9pbk5leHVzZXM6IGJvb2xlYW4gPSBmYWxzZSk6IFNldDxMb2NhdGlvbj4ge1xuICAvLyAgIGNvbnN0IG91dCA9IG5ldyBTZXQ8TG9jYXRpb24+KCk7XG4gIC8vICAgY29uc3QgYWRkTmVpZ2hib3JzID0gKGw6IExvY2F0aW9uKSA9PiB7XG4gIC8vICAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbC5leGl0cykge1xuICAvLyAgICAgICBjb25zdCBpZCA9IGV4aXQuZGVzdDtcbiAgLy8gICAgICAgY29uc3QgbmVpZ2hib3IgPSB0aGlzLnJvbS5sb2NhdGlvbnNbaWRdO1xuICAvLyAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IudXNlZCAmJlxuICAvLyAgICAgICAgICAgbmVpZ2hib3IgIT09IHRoaXMgJiYgIW91dC5oYXMobmVpZ2hib3IpKSB7XG4gIC8vICAgICAgICAgb3V0LmFkZChuZWlnaGJvcik7XG4gIC8vICAgICAgICAgaWYgKGpvaW5OZXh1c2VzICYmIE5FWFVTRVNbbmVpZ2hib3Iua2V5XSkge1xuICAvLyAgICAgICAgICAgYWRkTmVpZ2hib3JzKG5laWdoYm9yKTtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgYWRkTmVpZ2hib3JzKHRoaXMpO1xuICAvLyAgIHJldHVybiBvdXQ7XG4gIC8vIH1cblxuICBoYXNEb2xwaGluKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlkID09PSAweDYwIHx8IHRoaXMuaWQgPT09IDB4NjQgfHwgdGhpcy5pZCA9PT0gMHg2ODtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIE1hcCBvZiB0aWxlcyAoJFlYeXgpIHJlYWNoYWJsZSBmcm9tIGFueSBlbnRyYW5jZSB0b1xuICAgKiB1bmZsYWdnZWQgdGlsZWVmZmVjdHMuXG4gICAqL1xuICByZWFjaGFibGVUaWxlcyhmbHkgPSBmYWxzZSk6IE1hcDxudW1iZXIsIG51bWJlcj4ge1xuICAgIC8vIFRPRE8gLSBhcmdzIGZvciAoMSkgdXNlIG5vbi0yZWYgZmxhZ3MsICgyKSBvbmx5IGZyb20gZ2l2ZW4gZW50cmFuY2UvdGlsZVxuICAgIC8vIERvbHBoaW4gbWFrZXMgTk9fV0FMSyBva2F5IGZvciBzb21lIGxldmVscy5cbiAgICBpZiAodGhpcy5oYXNEb2xwaGluKCkpIGZseSA9IHRydWU7XG4gICAgLy8gVGFrZSBpbnRvIGFjY291bnQgdGhlIHRpbGVzZXQgYW5kIGZsYWdzIGJ1dCBub3QgYW55IG92ZXJsYXkuXG4gICAgY29uc3QgZXhpdHMgPSBuZXcgU2V0KHRoaXMuZXhpdHMubWFwKGV4aXQgPT4gZXhpdC5zY3JlZW4gPDwgOCB8IGV4aXQudGlsZSkpO1xuICAgIGNvbnN0IHVmID0gbmV3IFVuaW9uRmluZDxudW1iZXI+KCk7XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXRzW3RoaXMudGlsZXNldF07XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1t0aGlzLnRpbGVFZmZlY3RzIC0gMHhiM107XG4gICAgY29uc3QgcGFzc2FibGUgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IHRoaXMuc2NyZWVuc1t5XTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbcm93W3hdXTtcbiAgICAgICAgY29uc3QgcG9zID0geSA8PCA0IHwgeDtcbiAgICAgICAgY29uc3QgZmxhZyA9IHRoaXMuZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBwb3MpO1xuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDB4ZjA7IHQrKykge1xuICAgICAgICAgIGNvbnN0IHRpbGVJZCA9IHBvcyA8PCA4IHwgdDtcbiAgICAgICAgICBpZiAoZXhpdHMuaGFzKHRpbGVJZCkpIGNvbnRpbnVlOyAvLyBkb24ndCBnbyBwYXN0IGV4aXRzXG4gICAgICAgICAgbGV0IHRpbGUgPSBzY3JlZW4udGlsZXNbdF07XG4gICAgICAgICAgLy8gZmxhZyAyZWYgaXMgXCJhbHdheXMgb25cIiwgZG9uJ3QgZXZlbiBib3RoZXIgbWFraW5nIGl0IGNvbmRpdGlvbmFsLlxuICAgICAgICAgIGxldCBlZmZlY3RzID0gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICBsZXQgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgaWYgKGZsYWcgJiYgYmxvY2tlZCAmJiB0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT0gdGlsZSkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICAgIGVmZmVjdHMgPSB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgICAgYmxvY2tlZCA9IGZseSA/IGVmZmVjdHMgJiAweDA0IDogZWZmZWN0cyAmIDB4MDY7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYmxvY2tlZCkgcGFzc2FibGUuYWRkKHRpbGVJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCB0IG9mIHBhc3NhYmxlKSB7XG4gICAgICBjb25zdCByaWdodCA9ICh0ICYgMHgwZikgPT09IDB4MGYgPyB0ICsgMHhmMSA6IHQgKyAxO1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhyaWdodCkpIHVmLnVuaW9uKFt0LCByaWdodF0pO1xuICAgICAgY29uc3QgYmVsb3cgPSAodCAmIDB4ZjApID09PSAweGUwID8gdCArIDB4ZjIwIDogdCArIDE2O1xuICAgICAgaWYgKHBhc3NhYmxlLmhhcyhiZWxvdykpIHVmLnVuaW9uKFt0LCBiZWxvd10pO1xuICAgIH1cblxuICAgIGNvbnN0IG1hcCA9IHVmLm1hcCgpO1xuICAgIGNvbnN0IHNldHMgPSBuZXcgU2V0PFNldDxudW1iZXI+PigpO1xuICAgIGZvciAoY29uc3QgZW50cmFuY2Ugb2YgdGhpcy5lbnRyYW5jZXMpIHtcbiAgICAgIGlmICghZW50cmFuY2UudXNlZCkgY29udGludWU7XG4gICAgICBjb25zdCBpZCA9IGVudHJhbmNlLnNjcmVlbiA8PCA4IHwgZW50cmFuY2UudGlsZTtcbiAgICAgIC8vIE5PVEU6IG1hcCBzaG91bGQgYWx3YXlzIGhhdmUgaWQsIGJ1dCBib2d1cyBlbnRyYW5jZXNcbiAgICAgIC8vIChlLmcuIEdvYSBWYWxsZXkgZW50cmFuY2UgMikgY2FuIGNhdXNlIHByb2JsZW1zLlxuICAgICAgc2V0cy5hZGQobWFwLmdldChpZCkgfHwgbmV3IFNldCgpKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXQgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHNldHMpIHtcbiAgICAgIGZvciAoY29uc3QgdCBvZiBzZXQpIHtcbiAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweDBmXTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tzY3JdO1xuICAgICAgICBvdXQuc2V0KHQsIHRpbGVFZmZlY3RzLmVmZmVjdHNbc2NyZWVuLnRpbGVzW3QgJiAweGZmXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgLyoqIFNhZmVyIHZlcnNpb24gb2YgdGhlIGJlbG93PyAqL1xuICBzY3JlZW5Nb3ZlcigpOiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHZvaWQge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgQXJyYXk8e3NjcmVlbjogbnVtYmVyfT4+KCgpID0+IFtdKTtcbiAgICBjb25zdCBvYmpzID1cbiAgICAgICAgaXRlcnMuY29uY2F0PHtzY3JlZW46IG51bWJlcn0+KHRoaXMuc3Bhd25zLCB0aGlzLmV4aXRzLCB0aGlzLmVudHJhbmNlcyk7XG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2Jqcykge1xuICAgICAgbWFwLmdldChvYmouc2NyZWVuKS5wdXNoKG9iaik7XG4gICAgfVxuICAgIHJldHVybiAob3JpZzogbnVtYmVyLCByZXBsOiBudW1iZXIpID0+IHtcbiAgICAgIGZvciAoY29uc3Qgb2JqIG9mIG1hcC5nZXQob3JpZykpIHtcbiAgICAgICAgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbGwgc3Bhd25zLCBlbnRyYW5jZXMsIGFuZCBleGl0cy5cbiAgICogQHBhcmFtIG9yaWcgWVggb2YgdGhlIG9yaWdpbmFsIHNjcmVlbi5cbiAgICogQHBhcmFtIHJlcGwgWVggb2YgdGhlIGVxdWl2YWxlbnQgcmVwbGFjZW1lbnQgc2NyZWVuLlxuICAgKi9cbiAgbW92ZVNjcmVlbihvcmlnOiBudW1iZXIsIHJlcGw6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IG9ianMgPVxuICAgICAgICBpdGVycy5jb25jYXQ8e3NjcmVlbjogbnVtYmVyfT4odGhpcy5zcGF3bnMsIHRoaXMuZXhpdHMsIHRoaXMuZW50cmFuY2VzKTtcbiAgICBmb3IgKGNvbnN0IG9iaiBvZiBvYmpzKSB7XG4gICAgICBpZiAob2JqLnNjcmVlbiA9PT0gb3JpZykgb2JqLnNjcmVlbiA9IHJlcGw7XG4gICAgfVxuICB9XG5cbiAgLy8gVE9ETyAtIGZhY3RvciB0aGlzIG91dCBpbnRvIGEgc2VwYXJhdGUgY2xhc3M/XG4gIC8vICAgLSBob2xkcyBtZXRhZGF0YSBhYm91dCBtYXAgdGlsZXMgaW4gZ2VuZXJhbD9cbiAgLy8gICAtIG5lZWQgdG8gZmlndXJlIG91dCB3aGF0IHRvIGRvIHdpdGggcGl0cy4uLlxuICBtb25zdGVyUGxhY2VyKHJhbmRvbTogUmFuZG9tKTogKG06IE1vbnN0ZXIpID0+IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgLy8gSWYgdGhlcmUncyBhIGJvc3Mgc2NyZWVuLCBleGNsdWRlIGl0IGZyb20gZ2V0dGluZyBlbmVtaWVzLlxuICAgIGNvbnN0IGJvc3MgPSB0aGlzLmRhdGEuYm9zc1NjcmVlbjtcbiAgICAvLyBTdGFydCB3aXRoIGxpc3Qgb2YgcmVhY2hhYmxlIHRpbGVzLlxuICAgIGNvbnN0IHJlYWNoYWJsZSA9IHRoaXMucmVhY2hhYmxlVGlsZXMoZmFsc2UpO1xuICAgIC8vIERvIGEgYnJlYWR0aC1maXJzdCBzZWFyY2ggb2YgYWxsIHRpbGVzIHRvIGZpbmQgXCJkaXN0YW5jZVwiICgxLW5vcm0pLlxuICAgIGNvbnN0IGZhciA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KFsuLi5yZWFjaGFibGUua2V5cygpXS5tYXAoeCA9PiBbeCwgMF0pKTtcbiAgICBjb25zdCBub3JtYWw6IG51bWJlcltdID0gW107IC8vIHJlYWNoYWJsZSwgbm90IHNsb3BlIG9yIHdhdGVyXG4gICAgY29uc3QgbW90aHM6IG51bWJlcltdID0gW107ICAvLyBkaXN0YW5jZSDiiIggMy4uN1xuICAgIGNvbnN0IGJpcmRzOiBudW1iZXJbXSA9IFtdOyAgLy8gZGlzdGFuY2UgPiAxMlxuICAgIGNvbnN0IHBsYW50czogbnVtYmVyW10gPSBbXTsgLy8gZGlzdGFuY2Ug4oiIIDIuLjRcbiAgICBjb25zdCBwbGFjZWQ6IEFycmF5PFtNb25zdGVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXT4gPSBbXTtcbiAgICBjb25zdCBub3JtYWxUZXJyYWluTWFzayA9IHRoaXMuaGFzRG9scGhpbigpID8gMHgyNSA6IDB4Mjc7XG4gICAgZm9yIChjb25zdCBbdCwgZGlzdGFuY2VdIG9mIGZhcikge1xuICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3QgPj4+IDEyXVsodCA+Pj4gOCkgJiAweGZdO1xuICAgICAgaWYgKHNjciA9PT0gYm9zcykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IG4gb2YgbmVpZ2hib3JzKHQsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSkge1xuICAgICAgICBpZiAoZmFyLmhhcyhuKSkgY29udGludWU7XG4gICAgICAgIGZhci5zZXQobiwgZGlzdGFuY2UgKyAxKTtcbiAgICAgIH1cbiAgICAgIGlmICghZGlzdGFuY2UgJiYgIShyZWFjaGFibGUuZ2V0KHQpISAmIG5vcm1hbFRlcnJhaW5NYXNrKSkgbm9ybWFsLnB1c2godCk7XG4gICAgICBpZiAodGhpcy5pZCA9PT0gMHgxYSkge1xuICAgICAgICAvLyBTcGVjaWFsLWNhc2UgdGhlIHN3YW1wIGZvciBwbGFudCBwbGFjZW1lbnRcbiAgICAgICAgaWYgKHRoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl0gPT09IDB4ZjApIHBsYW50cy5wdXNoKHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGRpc3RhbmNlID49IDIgJiYgZGlzdGFuY2UgPD0gNCkgcGxhbnRzLnB1c2godCk7XG4gICAgICB9XG4gICAgICBpZiAoZGlzdGFuY2UgPj0gMyAmJiBkaXN0YW5jZSA8PSA3KSBtb3Rocy5wdXNoKHQpO1xuICAgICAgaWYgKGRpc3RhbmNlID49IDEyKSBiaXJkcy5wdXNoKHQpO1xuICAgICAgLy8gVE9ETyAtIHNwZWNpYWwtY2FzZSBzd2FtcCBmb3IgcGxhbnQgbG9jYXRpb25zP1xuICAgIH1cbiAgICAvLyBXZSBub3cga25vdyBhbGwgdGhlIHBvc3NpYmxlIHBsYWNlcyB0byBwbGFjZSB0aGluZ3MuXG4gICAgLy8gIC0gTk9URTogc3RpbGwgbmVlZCB0byBtb3ZlIGNoZXN0cyB0byBkZWFkIGVuZHMsIGV0Yz9cbiAgICByZXR1cm4gKG06IE1vbnN0ZXIpID0+IHtcbiAgICAgIC8vIGNoZWNrIGZvciBwbGFjZW1lbnQuXG4gICAgICBjb25zdCBwbGFjZW1lbnQgPSBtLnBsYWNlbWVudCgpO1xuICAgICAgY29uc3QgcG9vbCA9IFsuLi4ocGxhY2VtZW50ID09PSAnbm9ybWFsJyA/IG5vcm1hbCA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQgPT09ICdtb3RoJyA/IG1vdGhzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudCA9PT0gJ2JpcmQnID8gYmlyZHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09PSAncGxhbnQnID8gcGxhbnRzIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydE5ldmVyKHBsYWNlbWVudCkpXVxuICAgICAgUE9PTDpcbiAgICAgIHdoaWxlIChwb29sLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBpID0gcmFuZG9tLm5leHRJbnQocG9vbC5sZW5ndGgpO1xuICAgICAgICBjb25zdCBbcG9zXSA9IHBvb2wuc3BsaWNlKGksIDEpO1xuXG4gICAgICAgIGNvbnN0IHggPSAocG9zICYgMHhmMDApID4+PiA0IHwgKHBvcyAmIDB4Zik7XG4gICAgICAgIGNvbnN0IHkgPSAocG9zICYgMHhmMDAwKSA+Pj4gOCB8IChwb3MgJiAweGYwKSA+Pj4gNDtcbiAgICAgICAgY29uc3QgciA9IG0uY2xlYXJhbmNlKCk7XG5cbiAgICAgICAgLy8gdGVzdCBkaXN0YW5jZSBmcm9tIG90aGVyIGVuZW1pZXMuXG4gICAgICAgIGZvciAoY29uc3QgWywgeDEsIHkxLCByMV0gb2YgcGxhY2VkKSB7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSB5MSkgKiogMiArICh4IC0geDEpICoqIDIpO1xuICAgICAgICAgIGlmICh6MiA8IChyICsgcjEpICoqIDIpIGNvbnRpbnVlIFBPT0w7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGVzdCBkaXN0YW5jZSBmcm9tIGVudHJhbmNlcy5cbiAgICAgICAgZm9yIChjb25zdCB7eDogeDEsIHk6IHkxLCB1c2VkfSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgICAgIGlmICghdXNlZCkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgejIgPSAoKHkgLSAoeTEgPj4gNCkpICoqIDIgKyAoeCAtICh4MSA+PiA0KSkgKiogMik7XG4gICAgICAgICAgaWYgKHoyIDwgKHIgKyAxKSAqKiAyKSBjb250aW51ZSBQT09MO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVmFsaWQgc3BvdCAoc3RpbGwsIGhvdyB0b2EgYXBwcm94aW1hdGVseSAqbWF4aW1pemUqIGRpc3RhbmNlcz8pXG4gICAgICAgIHBsYWNlZC5wdXNoKFttLCB4LCB5LCByXSk7XG4gICAgICAgIGNvbnN0IHNjciA9ICh5ICYgMHhmMCkgfCAoeCAmIDB4ZjApID4+PiA0O1xuICAgICAgICBjb25zdCB0aWxlID0gKHkgJiAweDBmKSA8PCA0IHwgKHggJiAweDBmKTtcbiAgICAgICAgcmV0dXJuIHNjciA8PCA4IHwgdGlsZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG4gIC8vIFRPRE8gLSBhbGxvdyBsZXNzIHJhbmRvbW5lc3MgZm9yIGNlcnRhaW4gY2FzZXMsIGUuZy4gdG9wIG9mIG5vcnRoIHNhYnJlIG9yXG4gIC8vIGFwcHJvcHJpYXRlIHNpZGUgb2YgY29yZGVsLlxuXG4gIC8qKiBAcmV0dXJuIHshU2V0PG51bWJlcj59ICovXG4gIC8vIGFsbFRpbGVzKCkge1xuICAvLyAgIGNvbnN0IHRpbGVzID0gbmV3IFNldCgpO1xuICAvLyAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuc2NyZWVucykge1xuICAvLyAgICAgZm9yIChjb25zdCB0aWxlIG9mIHNjcmVlbi5hbGxUaWxlcygpKSB7XG4gIC8vICAgICAgIHRpbGVzLmFkZCh0aWxlKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIHRpbGVzO1xuICAvLyB9XG5cblxuICAvLyBUT0RPIC0gdXNlIG1ldGFzY3JlZW4gZm9yIHRoaXMgbGF0ZXJcbiAgcmVzaXplU2NyZWVucyh0b3A6IG51bWJlciwgbGVmdDogbnVtYmVyLCBib3R0b206IG51bWJlciwgcmlnaHQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICBmaWxsID0gMCkge1xuICAgIGNvbnN0IG5ld1dpZHRoID0gdGhpcy53aWR0aCArIGxlZnQgKyByaWdodDtcbiAgICBjb25zdCBuZXdIZWlnaHQgPSB0aGlzLmhlaWdodCArIHRvcCArIGJvdHRvbTtcbiAgICBjb25zdCBuZXdTY3JlZW5zID0gQXJyYXkuZnJvbSh7bGVuZ3RoOiBuZXdIZWlnaHR9LCAoXywgeSkgPT4ge1xuICAgICAgeSAtPSB0b3A7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbSh7bGVuZ3RoOiBuZXdXaWR0aH0sIChfLCB4KSA9PiB7XG4gICAgICAgIHggLT0gbGVmdDtcbiAgICAgICAgaWYgKHkgPCAwIHx8IHggPCAwIHx8IHkgPj0gdGhpcy5oZWlnaHQgfHwgeCA+PSB0aGlzLndpZHRoKSByZXR1cm4gZmlsbDtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NyZWVuc1t5XVt4XTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMud2lkdGggPSBuZXdXaWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IG5ld0hlaWdodDtcbiAgICB0aGlzLnNjcmVlbnMgPSBuZXdTY3JlZW5zO1xuICAgIC8vIFRPRE8gLSBpZiBhbnkgb2YgdGhlc2UgZ28gbmVnYXRpdmUsIHdlJ3JlIGluIHRyb3VibGUuLi5cbiAgICAvLyBQcm9iYWJseSB0aGUgYmVzdCBiZXQgd291bGQgYmUgdG8gcHV0IGEgY2hlY2sgaW4gdGhlIHNldHRlcj9cbiAgICBmb3IgKGNvbnN0IGYgb2YgdGhpcy5mbGFncykge1xuICAgICAgZi54cyArPSBsZWZ0O1xuICAgICAgZi55cyArPSB0b3A7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcCBvZiB0aGlzLnBpdHMpIHtcbiAgICAgIHAuZnJvbVhzICs9IGxlZnQ7XG4gICAgICBwLmZyb21ZcyArPSB0b3A7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcyBvZiBbLi4udGhpcy5zcGF3bnMsIC4uLnRoaXMuZXhpdHNdKSB7XG4gICAgICBzLnh0ICs9IDE2ICogbGVmdDtcbiAgICAgIHMueXQgKz0gMTYgKiB0b3A7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZSBvZiB0aGlzLmVudHJhbmNlcykge1xuICAgICAgaWYgKCFlLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgZS54ICs9IDI1NiAqIGxlZnQ7XG4gICAgICBlLnkgKz0gMjU2ICogdG9wO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBOT1RFOiBpZiBhIHNjcmVlbiBpcyBuZWdhdGl2ZSwgc2V0cyB0aGUgQWx3YXlzVHJ1ZSBmbGFnLiAqL1xuICB3cml0ZVNjcmVlbnMyZChzdGFydDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICBkYXRhOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8bnVtYmVyIHwgbnVsbD4+KSB7XG4gICAgY29uc3QgeDAgPSBzdGFydCAmIDB4ZjtcbiAgICBjb25zdCB5MCA9IHN0YXJ0ID4+PiA0O1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgZGF0YS5sZW5ndGg7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gZGF0YVt5XTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgcm93Lmxlbmd0aDsgeCsrKSB7XG4gICAgICAgIGxldCB0aWxlID0gcm93W3hdO1xuICAgICAgICBpZiAodGlsZSA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHRpbGUgPCAwKSB7XG4gICAgICAgICAgdGlsZSA9IH50aWxlO1xuICAgICAgICAgIHRoaXMuZmxhZ3MucHVzaChGbGFnLm9mKHtzY3JlZW46ICh5MCArIHkpIDw8IDQgfCAoeDAgKyB4KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZzogdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZH0pKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNjcmVlbnNbeTAgKyB5XVt4MCArIHhdID0gdGlsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb25uZWN0IHR3byBzY3JlZW5zIHZpYSBlbnRyYW5jZXMuXG4gIC8vIEFzc3VtZXMgZXhpdHMgYW5kIGVudHJhbmNlcyBhcmUgY29tcGxldGVseSBhYnNlbnQuXG4gIC8vIFNjcmVlbiBJRHMgbXVzdCBiZSBpbiBzY3JlZW5FeGl0cy5cbiAgLy8gU1VQRVIgSEFDS1kgLSBpZiBwb3MgaXMgbmVnYXRpdmUsIHVzZSBjb21wbGVtZW50IGFuZCBhbHRlcm5hdGUgc3RhaXJzLlxuICBjb25uZWN0KHBvczogbnVtYmVyLCB0aGF0OiBMb2NhdGlvbiwgdGhhdFBvczogbnVtYmVyKSB7XG4gICAgY29uc3QgdGhpc0FsdCA9IHBvcyA8IDAgPyAweDEwMCA6IDA7XG4gICAgY29uc3QgdGhhdEFsdCA9IHRoYXRQb3MgPCAwID8gMHgxMDAgOiAwO1xuICAgIHBvcyA9IHBvcyA8IDAgPyB+cG9zIDogcG9zO1xuICAgIHRoYXRQb3MgPSB0aGF0UG9zIDwgMCA/IH50aGF0UG9zIDogdGhhdFBvcztcbiAgICBjb25zdCB0aGlzWSA9IHBvcyA+Pj4gNDtcbiAgICBjb25zdCB0aGlzWCA9IHBvcyAmIDB4ZjtcbiAgICBjb25zdCB0aGF0WSA9IHRoYXRQb3MgPj4+IDQ7XG4gICAgY29uc3QgdGhhdFggPSB0aGF0UG9zICYgMHhmO1xuICAgIGNvbnN0IHRoaXNUaWxlID0gdGhpcy5zY3JlZW5zW3RoaXNZXVt0aGlzWF07XG4gICAgY29uc3QgdGhhdFRpbGUgPSB0aGF0LnNjcmVlbnNbdGhhdFldW3RoYXRYXTtcbiAgICBjb25zdCBbdGhpc0VudHJhbmNlLCB0aGlzRXhpdHNdID0gc2NyZWVuRXhpdHNbdGhpc0FsdCB8IHRoaXNUaWxlXTtcbiAgICBjb25zdCBbdGhhdEVudHJhbmNlLCB0aGF0RXhpdHNdID0gc2NyZWVuRXhpdHNbdGhhdEFsdCB8IHRoYXRUaWxlXTtcbiAgICBjb25zdCB0aGlzRW50cmFuY2VJbmRleCA9IHRoaXMuZW50cmFuY2VzLmxlbmd0aDtcbiAgICBjb25zdCB0aGF0RW50cmFuY2VJbmRleCA9IHRoYXQuZW50cmFuY2VzLmxlbmd0aDtcbiAgICB0aGlzLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt5OiB0aGlzWSA8PCA4IHwgdGhpc0VudHJhbmNlID4+PiA4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHRoaXNYIDw8IDggfCB0aGlzRW50cmFuY2UgJiAweGZmfSkpO1xuICAgIHRoYXQuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3k6IHRoYXRZIDw8IDggfCB0aGF0RW50cmFuY2UgPj4+IDgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogdGhhdFggPDwgOCB8IHRoYXRFbnRyYW5jZSAmIDB4ZmZ9KSk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXNFeGl0cykge1xuICAgICAgdGhpcy5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbjogcG9zLCB0aWxlOiBleGl0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3Q6IHRoYXQuaWQsIGVudHJhbmNlOiB0aGF0RW50cmFuY2VJbmRleH0pKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoYXRFeGl0cykge1xuICAgICAgdGhhdC5leGl0cy5wdXNoKEV4aXQub2Yoe3NjcmVlbjogdGhhdFBvcywgdGlsZTogZXhpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXN0OiB0aGlzLmlkLCBlbnRyYW5jZTogdGhpc0VudHJhbmNlSW5kZXh9KSk7XG4gICAgfVxuICB9XG5cbiAgbmVpZ2hib3JGb3JFbnRyYW5jZShlbnRyYW5jZUlkOiBudW1iZXIpOiBMb2NhdGlvbiB7XG4gICAgY29uc3QgZW50cmFuY2UgPSB0aGlzLmVudHJhbmNlc1tlbnRyYW5jZUlkXTtcbiAgICBpZiAoIWVudHJhbmNlKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGVudHJhbmNlICR7aGV4KHRoaXMuaWQpfToke2VudHJhbmNlSWR9YCk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIGlmIChleGl0LnNjcmVlbiAhPT0gZW50cmFuY2Uuc2NyZWVuKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGR4ID0gTWF0aC5hYnMoZXhpdC54IC0gZW50cmFuY2UueCk7XG4gICAgICBjb25zdCBkeSA9IE1hdGguYWJzKGV4aXQueSAtIGVudHJhbmNlLnkpO1xuICAgICAgaWYgKGR4IDwgMjQgJiYgZHkgPCAyNCkgcmV0dXJuIHRoaXMucm9tLmxvY2F0aW9uc1tleGl0LmRlc3RdO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGV4aXQgZm91bmQgbmVhciAke2hleCh0aGlzLmlkKX06JHtlbnRyYW5jZUlkfWApO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIGAke3N1cGVyLnRvU3RyaW5nKCl9ICR7dGhpcy5uYW1lfWA7XG4gIH1cbn1cblxuLy8gVE9ETyAtIG1vdmUgdG8gYSBiZXR0ZXItb3JnYW5pemVkIGRlZGljYXRlZCBcImdlb21ldHJ5XCIgbW9kdWxlP1xuZnVuY3Rpb24gbmVpZ2hib3JzKHRpbGU6IG51bWJlciwgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIpOiBudW1iZXJbXSB7XG4gIGNvbnN0IG91dCA9IFtdO1xuICBjb25zdCB5ID0gdGlsZSAmIDB4ZjBmMDtcbiAgY29uc3QgeCA9IHRpbGUgJiAweDBmMGY7XG4gIGlmICh5IDwgKChoZWlnaHQgLSAxKSA8PCAxMiB8IDB4ZTApKSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweGYwKSA9PT0gMHhlMCA/IHRpbGUgKyAweDBmMjAgOiB0aWxlICsgMTYpO1xuICB9XG4gIGlmICh5KSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweGYwKSA9PT0gMHgwMCA/IHRpbGUgLSAweDBmMjAgOiB0aWxlIC0gMTYpO1xuICB9XG4gIGlmICh4IDwgKCh3aWR0aCAtIDEpIDw8IDggfCAweDBmKSkge1xuICAgIG91dC5wdXNoKCh0aWxlICYgMHgwZikgPT09IDB4MGYgPyB0aWxlICsgMHgwMGYxIDogdGlsZSArIDEpO1xuICB9XG4gIGlmICh4KSB7XG4gICAgb3V0LnB1c2goKHRpbGUgJiAweDBmKSA9PT0gMHgwMCA/IHRpbGUgLSAweDAwZjEgOiB0aWxlIC0gMSk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuLy8gdmVyeSBzaW1wbGUgdmVyc2lvbiBvZiB3aGF0IHdlJ3JlIGRvaW5nIHdpdGggbWV0YXNjcmVlbnNcbmNvbnN0IHNjcmVlbkV4aXRzOiB7W2lkOiBudW1iZXJdOiByZWFkb25seSBbbnVtYmVyLCByZWFkb25seSBbbnVtYmVyLCBudW1iZXJdXX0gPSB7XG4gIDB4MTU6IFsweDkwX2EwLCBbMHg4OSwgMHg4YV1dLCAvLyBjYXZlIG9uIGxlZnQgYm91bmRhcnlcbiAgMHgxOTogWzB4NjBfOTAsIFsweDU4LCAweDU5XV0sIC8vIGNhdmUgb24gcmlnaHQgYm91bmRhcnkgKG5vdCBvbiBncmFzcylcbiAgMHg5NjogWzB4NDBfMzAsIFsweDMyLCAweDMzXV0sIC8vIHVwIHN0YWlyIGZyb20gbGVmdFxuICAweDk3OiBbMHhhZl8zMCwgWzB4YjIsIDB4YjNdXSwgLy8gZG93biBzdGFpciBmcm9tIGxlZnRcbiAgMHg5ODogWzB4NDBfZDAsIFsweDNjLCAweDNkXV0sIC8vIHVwIHN0YWlyIGZyb20gcmlnaHRcbiAgMHg5OTogWzB4YWZfZDAsIFsweGJjLCAweGJkXV0sIC8vIGRvd24gc3RhaXIgZnJvbSByaWdodFxuICAweDlhOiBbMHgxZl84MCwgWzB4MjcsIDB4MjhdXSwgLy8gZG93biBzdGFpciAoZG91YmxlIC0ganVzdCB1c2UgZG93biEpXG4gIDB4OWU6IFsweGRmXzgwLCBbMHhlNywgMHhlOF1dLCAvLyBib3R0b20gZWRnZVxuICAweGMxOiBbMHg1MF9hMCwgWzB4NDksIDB4NGFdXSwgLy8gY2F2ZSBvbiB0b3AgYm91bmRhcnlcbiAgMHhjMjogWzB4NjBfYjAsIFsweDVhLCAweDViXV0sIC8vIGNhdmUgb24gYm90dG9tLXJpZ2h0IGJvdW5kYXJ5XG4gIDB4MTlhOiBbMHhkMF84MCwgWzB4YzcsIDB4YzhdXSwgLy8gdXAgc3RhaXIgb24gZG91YmxlXG59O1xuIl19