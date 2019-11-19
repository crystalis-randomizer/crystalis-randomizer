import { initializer } from './util.js';
import { DefaultMap } from '../util.js';
import { Metascreen } from './metascreen.js';
import { bottomEdge, bottomEdgeHouse, cave, door, downStair, icon, leftEdge, rightEdge, seamlessVertical, topEdge, upStair, waterfallCave, } from './metascreendata.js';
import { ScreenFix, withRequire } from './screenfix.js';
const $ = initializer();
function labyrinthVariant(parentFn, bit, variant, flag, unflag) {
    return (s, seed, rom) => {
        if (((seed >>> bit) & 1) !== variant)
            return false;
        const parent = parentFn(rom.metascreens);
        for (const pos of typeof flag === 'number' ? [flag] : flag) {
            rom.screens[s.data.id].set2d(pos, [[0x19, 0x19], [0x1b, 0x1b]]);
        }
        for (const pos of typeof unflag === 'number' ? [unflag] : unflag || []) {
            rom.screens[s.data.id].set2d(pos, [[0xc5, 0xc5], [0xd0, 0xc5]]);
        }
        if (s.flag !== 'always') {
            parent.flag = 'always';
        }
        else if (unflag != null) {
            parent.remove();
        }
        return true;
    };
}
export class Metascreens {
    constructor(rom) {
        this.rom = rom;
        this.screens = new Set();
        this.screensByFix = new DefaultMap(() => []);
        this.screensById = new DefaultMap(() => []);
        this.overworldEmpty = $({
            id: 0x00,
            icon: icon `
      |███|
      |███|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            feature: ['empty'],
            edges: '    ',
        });
        this.boundaryW_trees = $({
            id: 0x01,
            icon: icon `
      |█▌ |
      |█▌^|
      |█▌ |`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks] },
                sea: { requires: [ScreenFix.SeaTrees] } },
            edges: '> >o',
        });
        this.boundaryW = $({
            id: 0x02,
            icon: icon `
      |█▌ |
      |█▌ |
      |█▌ |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '> >o',
        });
        this.boundaryE_rocks = $({
            id: 0x03,
            icon: icon `
      |.▐█|
      | ▐█|
      |.▐█|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks] },
                sea: { requires: [ScreenFix.SeaRocks] } },
            edges: '<o< ',
        });
        this.boundaryE = $({
            id: 0x04,
            icon: icon `
      | ▐█|
      | ▐█|
      | ▐█|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<o< ',
        });
        this.longGrassS = $({
            id: 0x05,
            icon: icon `
      |vv |
      | vv|
      |   |`,
            tilesets: { river: {},
                grass: { requires: [ScreenFix.GrassLongGrass] } },
            edges: 'looo',
        });
        this.longGrassN = $({
            id: 0x06,
            icon: icon `
      |   |
      | vv|
      |vv |`,
            tilesets: { river: {},
                grass: { requires: [ScreenFix.GrassLongGrass] } },
            edges: 'oolo',
        });
        this.boundaryS_rocks = $({
            id: 0x07,
            icon: icon `
      | . |
      |▄▄▄|
      |███|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks] },
                sea: { requires: [ScreenFix.SeaRocks] } },
            edges: 'o^ ^',
        });
        this.fortressTownEntrance = $({
            id: 0x08,
            icon: icon `
      |███|
      |█∩█|
      |   |`,
            tilesets: { grass: {} },
            edges: ' vov',
            exits: [cave(0xa7, 'fortress')],
        });
        this.bendSE_longGrass = $({
            id: 0x09,
            icon: icon `▗
      | v |
      |vv▄|
      | ▐█|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'oo<^',
        });
        this.exitW_cave = $({
            id: 0x0a,
            icon: icon `∩
      |█∩█|
      |  █|
      |███|`,
            tilesets: { grass: {}, river: {}, desert: {},
                sea: { requires: [ScreenFix.SeaCaveEntrance] } },
            edges: ' n  ',
            exits: [cave(0x48), leftEdge(6)],
        });
        this.bendNE_grassRocks = $({
            id: 0x0b,
            icon: icon `▝
      |.▐█|
      |  ▀|
      |;;;|`,
            tilesets: { grass: {},
                river: { requires: [ScreenFix.RiverShortGrass] },
                desert: { requires: [ScreenFix.DesertShortGrass,
                        ScreenFix.DesertRocks] } },
            edges: '<osv',
        });
        this.cornerNW = $({
            id: 0x0c,
            icon: icon `▛
      |███|
      |█ ▀|
      |█▌ |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '  >v',
        });
        this.cornerNE = $({
            id: 0x0d,
            icon: icon `▜
      |███|
      |▀██|
      | ▐█|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: ' v< ',
        });
        this.cornerSW = $({
            id: 0x0e,
            icon: icon `▙
      |█▌ |
      |██▄|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '>  ^',
        });
        this.cornerSE = $({
            id: 0x0f,
            icon: icon `▟
      | ▐█|
      |▄██|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<^  ',
        });
        this.exitE = $({
            id: 0x10,
            icon: icon `╶
      | ▐█|
      |   |
      | ▐█|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks] } },
            edges: '<o<n',
            exits: [rightEdge(6)],
        });
        this.boundaryN_trees = $({
            id: 0x11,
            icon: icon `
      |███|
      |▀▀▀|
      | ^ |`,
            tilesets: { grass: {}, river: {}, desert: {},
                sea: { requires: [ScreenFix.SeaTrees] } },
            edges: ' vov',
        });
        this.bridgeToPortoa = $({
            id: 0x12,
            icon: icon `╴
      |═  |
      |╞══|
      |│  |`,
            tilesets: { river: {} },
            feature: ['portoa3'],
            edges: '2*>r',
            exits: [leftEdge(1)],
        });
        this.slopeAbovePortoa = $({
            id: 0x13,
            icon: icon `
      |█↓█|
      |█↓▀|
      |│  |`,
            tilesets: { river: {} },
            feature: ['portoa2'],
            edges: '1*2v',
        });
        this.riverBendSE = $({
            id: 0x14,
            icon: icon `
      |w  |
      | ╔═|
      | ║ |`,
            tilesets: { river: {} },
            edges: 'oorr',
        });
        this.boundaryW_cave = $({
            id: 0x15,
            icon: icon `
      |█▌ |
      |█∩ |
      |█▌ |`,
            tilesets: { grass: {}, river: {}, desert: {},
                sea: { requires: [ScreenFix.SeaCaveEntrance] } },
            edges: '> >o',
            exits: [cave(0x89)],
        });
        this.exitN = $({
            id: 0x16,
            icon: icon `╵
      |█ █|
      |▀ ▀|
      | ^ |`,
            tilesets: { grass: {}, river: {}, desert: {} },
            edges: 'nvov',
            exits: [topEdge()],
        });
        this.riverWE_woodenBridge = $({
            id: 0x17,
            icon: icon `═
      |   |
      |═║═|
      |   |`,
            tilesets: { river: {} },
            edges: 'oror',
            exits: [seamlessVertical(0x77)],
        });
        this.riverBoundaryE_waterfall = $({
            id: 0x18,
            icon: icon `╡
      | ▐█|
      |══/|
      | ▐█|`,
            tilesets: { river: {} },
            edges: '<r< ',
        });
        this.boundaryE_cave = $({
            id: 0x19,
            icon: icon `
      | ▐█|
      |v∩█|
      |v▐█|`,
            tilesets: { river: {},
                grass: { requires: [ScreenFix.GrassLongGrass] },
                desert: { requires: [ScreenFix.DesertLongGrass] } },
            edges: '<o< ',
            exits: [cave(0x58)],
        });
        this.exitW_southwest = $({
            id: 0x1a,
            icon: icon `╴
      |█▌ |
      |▀ ▄|
      |▄██|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks] },
                sea: { requires: [ScreenFix.SeaRocks] } },
            edges: '>* ^',
            exits: [leftEdge(0xb)],
        });
        this.nadare = $({
            id: 0x1b,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), door(0x23), door(0x25), door(0x2a)],
        });
        this.townExitW = $({
            id: 0x1c,
            icon: icon `╴
      |█▌ |
      |▀ ^|
      |█▌ |`,
            tilesets: { grass: {}, river: {} },
            edges: '>n>o',
            exits: [leftEdge(8)],
        });
        this.shortGrassS = $({
            id: 0x1d,
            icon: icon ` |
      |;;;|
      | v |
      |   |`,
            tilesets: { grass: {},
                river: { requires: [ScreenFix.RiverShortGrass,
                        ScreenFix.GrassLongGrassRemapping] } },
            edges: 'sooo',
        });
        this.townExitS = $({
            id: 0x1e,
            icon: icon `╷
      | ^ |
      |▄ ▄|
      |█ █|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks,
                        ScreenFix.DesertTownEntrance] } },
            edges: 'o^n^',
            exits: [bottomEdge()],
        });
        this.swanGate = $({
            id: 0x1f,
            tilesets: { town: {} },
            exits: [leftEdge(3), rightEdge(9)],
        });
        this.riverBranchNSE = $({
            id: 0x20,
            icon: icon `
      | ║ |
      | ╠═|
      | ║ |`,
            tilesets: { river: {} },
            edges: 'rorr',
        });
        this.riverWE = $({
            id: 0x21,
            icon: icon `
      |   |
      |═══|
      |   |`,
            tilesets: { river: {} },
            edges: 'oror',
        });
        this.riverBoundaryS_waterfall = $({
            id: 0x22,
            icon: icon `╨
      | ║ |
      |▄║▄|
      |█/█|`,
            tilesets: { river: {} },
            edges: 'r^ ^',
        });
        this.shortGrassSE = $({
            id: 0x23,
            icon: icon `
      |;;;|
      |;  |
      |; ^|`,
            tilesets: { grass: {} },
            edges: 'ssoo',
        });
        this.shortGrassNE = $({
            id: 0x24,
            icon: icon ` |
      |;  |
      |;v |
      |;;;|`,
            tilesets: { grass: {} },
            edges: 'osso',
        });
        this.stomHouseOutside = $({
            id: 0x25,
            icon: icon `∩
      |███|
      |▌∩▐|
      |█ █|`,
            tilesets: { grass: {} },
            exits: [door(0x68), bottomEdge({ shift: 0.5 })],
        });
        this.bendNW_trees = $({
            id: 0x26,
            icon: icon `▘
      |█▌ |
      |▀ ^|
      | ^^|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks,
                        ScreenFix.DesertTrees] },
                sea: { requires: [ScreenFix.SeaRocks,
                        ScreenFix.SeaTrees] } },
            edges: '>voo',
        });
        this.shortGrassSW = $({
            id: 0x27,
            icon: icon `
      |;;;|
      |  ;|
      |^ ;|`,
            tilesets: { grass: {},
                river: { requires: [ScreenFix.RiverShortGrass] } },
            edges: 'soos',
        });
        this.riverBranchNWS = $({
            id: 0x28,
            icon: icon `
      | ║ |
      |═╣ |
      | ║ |`,
            tilesets: { river: {} },
            edges: 'rrro',
        });
        this.shortGrassNW = $({
            id: 0x29,
            icon: icon `
      |  ;|
      | v;|
      |;;;|`,
            tilesets: { grass: {},
                river: { requires: [ScreenFix.RiverShortGrass,
                        ScreenFix.GrassLongGrassRemapping] } },
            edges: 'ooss',
        });
        this.valleyBridge = $({
            id: 0x2a,
            icon: icon ` |
      |▛║▜|
      | ║ |
      |▙║▟|`,
            tilesets: { grass: {}, river: {} },
            edges: 'n n ',
            exits: [seamlessVertical(0x77)],
        });
        this.exitS_cave = $({
            id: 0x2b,
            icon: icon `∩
      |█∩█|
      |▌ ▐|
      |█ █|`,
            tilesets: { grass: {}, river: {}, desert: {},
                sea: { requires: [ScreenFix.SeaCaveEntrance] } },
            edges: '  n ',
            exits: [cave(0x67), bottomEdge()]
        });
        this.outsideWindmill = $({
            id: 0x2c,
            icon: icon `╳
      |██╳|
      |█∩█|
      |█ █|`,
            tilesets: { grass: {} },
            feature: ['windmill'],
            edges: '  n ',
            exits: [cave(0x63), bottomEdge(), door(0x89), door(0x8c)],
        });
        this.townExitW_cave = $({
            id: 0x2d,
            icon: icon `∩
      |█∩█|
      |▄▄█|
      |███|`,
            tilesets: { grass: {} },
            edges: ' n  ',
            exits: [cave(0x4a), leftEdge(5)],
        });
        this.riverNS = $({
            id: 0x2e,
            icon: icon `
      | ║ |
      | ║ |
      | ║ |`,
            tilesets: { river: {} },
            edges: 'roro',
        });
        this.riverNS_bridge = $({
            id: 0x2f,
            icon: icon `
      | ║ |
      |w╏w|
      | ║ |`,
            tilesets: { river: {} },
            feature: ['bridge'],
            edges: 'roro',
            wall: 0x77,
        });
        this.riverBendWS = $({
            id: 0x30,
            icon: icon `
      | w▜|
      |═╗w|
      | ║ |`,
            tilesets: { river: {} },
            edges: '<rrv',
        });
        this.boundaryN_waterfallCave = $({
            id: 0x31,
            icon: icon `
      |▛║█|
      |▘║▀|
      | ║ |`,
            tilesets: { river: {} },
            edges: ' vrv',
            exits: [waterfallCave(0x75)],
        });
        this.open_trees = $({
            id: 0x32,
            icon: icon `
      | ^ |
      |^ ^|
      | ^ |`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertTrees,
                        ScreenFix.DesertRocks] } },
            edges: 'oooo',
        });
        this.exitS = $({
            id: 0x33,
            icon: icon `╷
      | w |
      |▄ ▄|
      |█ █|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertMarsh] },
                sea: { requires: [ScreenFix.SeaMarsh] } },
            edges: 'o^n^',
            exits: [bottomEdge()],
        });
        this.bendNW = $({
            id: 0x34,
            icon: icon `▘
      |█▌ |
      |▀▀ |
      |   |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '>voo',
        });
        this.bendNE = $({
            id: 0x35,
            icon: icon `▝
      | ▐█|
      |  ▀|
      |   |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<oov',
        });
        this.bendSE = $({
            id: 0x36,
            icon: icon `▗
      |   |
      | ▄▄|
      | ▐█|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'oo<^',
        });
        this.bendWS = $({
            id: 0x37,
            icon: icon `▖
      |   |
      |▄▄ |
      |█▌ |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'o^>o',
        });
        this.towerPlain = $({
            id: 0x38,
            icon: icon `┴
      | ┊ |
      |─┴─|
      |   |`,
            tilesets: { tower: {} },
            edges: 'st t',
        });
        this.towerRobotDoor_downStair = $({
            id: 0x39,
            icon: icon `┬
      | ∩ |
      |─┬─|
      | ┊ |`,
            tilesets: { tower: {} },
            edges: ' tst',
        });
        this.towerDynaDoor = $({
            id: 0x3a,
            icon: icon `∩
      | ∩ |
      |└┬┘|
      | ┊ |`,
            tilesets: { tower: {} },
            edges: '  s ',
        });
        this.towerLongStairs = $({
            id: 0x3b,
            icon: icon `
      | ┊ |
      | ┊ |
      | ┊ |`,
            tilesets: { tower: {} },
            edges: 's s ',
        });
        this.towerMesiaRoom = $({
            id: 0x3c,
            tilesets: { tower: {} },
        });
        this.towerTeleporter = $({
            id: 0x3d,
            tilesets: { tower: {} },
        });
        this.caveAbovePortoa = $({
            id: 0x3e,
            icon: icon `
      |███|
      |█∩█|
      |█↓█|`,
            tilesets: { river: {} },
            edges: '  1 ',
            exits: [cave(0x66)],
        });
        this.cornerNE_flowers = $({
            id: 0x3f,
            icon: icon `▜
      |███|
      |▀*█|
      | ▐█|`,
            tilesets: { grass: {} },
            edges: ' v< ',
        });
        this.towerEdge = $({
            id: 0x40,
            icon: icon ` |
      |   |
      |┤ ├|
      |   |`,
            tilesets: { tower: {} },
            edges: ' t t',
        });
        this.towerEdgeW = $({
            id: 0x40,
            icon: icon ` |
      |   |
      |┤  |
      |   |`,
            tilesets: { tower: {} },
            edges: ' t  ',
        });
        this.towerEdgeE = $({
            id: 0x40,
            icon: icon ` |
      |   |
      |  ├|
      |   |`,
            tilesets: { tower: {} },
            edges: '   t',
        });
        this.towerRobotDoor = $({
            id: 0x41,
            icon: icon `─
      | O |
      |───|
      |   |`,
            tilesets: { tower: {} },
            edges: ' t t',
        });
        this.towerDoor = $({
            id: 0x42,
            icon: icon `∩
      | ∩ |
      |─┴─|
      |   |`,
            tilesets: { tower: {} },
            edges: ' t t',
            exits: [cave(0x68)],
        });
        this.house_bedroom = $({
            id: 0x43,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.shed = $({
            id: 0x44,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.tavern = $({
            id: 0x45,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.house_twoBeds = $({
            id: 0x46,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.throneRoom_amazones = $({
            id: 0x47,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse({ width: 3 }), downStair(0x4c, 1)],
        });
        this.house_ruinedUpstairs = $({
            id: 0x48,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), downStair(0x9c, 1)],
        });
        this.house_ruinedDownstairs = $({
            id: 0x49,
            tilesets: { house: {} },
            exits: [upStair(0x56, 1)],
        });
        this.foyer = $({
            id: 0x4a,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), door(0x28), door(0x53), door(0x5c)],
        });
        this.throneRoom_portoa = $({
            id: 0x4b,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), door(0x2b)],
        });
        this.fortuneTeller = $({
            id: 0x4c,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), door(0x56), door(0x59)],
        });
        this.backRoom = $({
            id: 0x4d,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.stomHouseDojo = $({
            id: 0x4e,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse({ shift: -0.5 })],
        });
        this.windmillInside = $({
            id: 0x4f,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse({ left: 9, width: 1 })],
        });
        this.horizontalTownMiddle = $({
            id: 0x50,
            tilesets: { town: {} },
            exits: [door(0x4c), door(0x55)],
        });
        this.brynmaerRight_exitE = $({
            id: 0x51,
            tilesets: { town: { type: 'horizontal' } },
            exits: [rightEdge(8), door(0x41)],
        });
        this.brynmaerLeft_deadEnd = $({
            id: 0x52,
            tilesets: { town: { type: 'horizontal' } },
            exits: [door(0x49), door(0x4c)],
        });
        this.swanLeft_exitW = $({
            id: 0x53,
            tilesets: { town: { type: 'horizontal' } },
            exits: [leftEdge(9), door(0x49), door(0x5e)],
        });
        this.swanRight_exitS = $({
            id: 0x54,
            tilesets: { town: { type: 'horizontal' } },
            exits: [bottomEdge({ left: 3 }), door(0x41), door(0x43), door(0x57)],
        });
        this.horizontalTownLeft_exitN = $({
            id: 0x55,
            tilesets: { town: { type: 'horizontal' } },
            exits: [topEdge(0xd), door(0x46), door(0x4b)],
        });
        this.amazonesRight_deadEnd = $({
            id: 0x56,
            tilesets: { town: { type: 'horizontal' } },
            exits: [door(0x40), door(0x58)],
        });
        this.saharaRight_exitE = $({
            id: 0x57,
            tilesets: { town: { type: 'horizontal' } },
            exits: [rightEdge(7), door(0x40), door(0x66)],
        });
        this.portoaNW = $({
            id: 0x58,
            tilesets: { town: { type: 'square' } },
            exits: [cave(0x47, 'fortress'), bottomEdge()],
        });
        this.portoaNE = $({
            id: 0x59,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x63), door(0x8a), bottomEdge({ left: 3, width: 4 })],
        });
        this.portoaSW_exitW = $({
            id: 0x5a,
            tilesets: { town: { type: 'square' } },
            exits: [leftEdge(9), door(0x86), topEdge()],
        });
        this.portoaSE_exitE = $({
            id: 0x5b,
            tilesets: { town: { type: 'square' } },
            exits: [rightEdge(9), door(0x7a), door(0x87)],
        });
        this.dyna = $({
            id: 0x5c,
            tilesets: { tower: {} },
        });
        this.portoaFisherman = $({
            id: 0x5d,
            tilesets: { town: { type: 'square' } },
            exits: [rightEdge(6), leftEdge(4, 6), door(0x68)],
        });
        this.verticalTownTop_fortress = $({
            id: 0x5e,
            tilesets: { town: { type: 'vertical' } },
            exits: [cave(0x47), bottomEdge()],
        });
        this.shyronMiddle = $({
            id: 0x5f,
            tilesets: { town: { type: 'vertical' } },
            exits: [door(0x54), door(0x5b), topEdge()],
        });
        this.shyronBottom_exitS = $({
            id: 0x60,
            tilesets: { town: { type: 'vertical' } },
            exits: [bottomEdge({ left: 3 }), door(0x04), door(0x06), door(0x99)],
        });
        this.zombieTownMiddle = $({
            id: 0x61,
            tilesets: { town: { type: 'vertical' } },
            exits: [door(0x99), topEdge()],
        });
        this.zombieTownBottom_caveExit = $({
            id: 0x62,
            tilesets: { town: { type: 'vertical' } },
            exits: [cave(0x92), door(0x23), door(0x4d)],
        });
        this.leafNW_houseShed = $({
            id: 0x63,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x8c), door(0x95)],
        });
        this.squareTownNE_house = $({
            id: 0x64,
            tilesets: { town: { type: 'square' } },
            exits: [topEdge(1), door(0xb7)],
        });
        this.leafSW_shops = $({
            id: 0x65,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x77), door(0x8a)],
        });
        this.leafSE_exitE = $({
            id: 0x66,
            tilesets: { town: { type: 'square' } },
            exits: [rightEdge(3), door(0x84)],
        });
        this.goaNW_tavern = $({
            id: 0x67,
            tilesets: { town: { type: 'square' } },
            exits: [door(0xba)],
        });
        this.squareTownSW_exitS = $({
            id: 0x68,
            tilesets: { town: { type: 'square' } },
            exits: [bottomEdge({ left: 8 }), door(0x84)],
        });
        this.goaSE_shop = $({
            id: 0x69,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x82)],
        });
        this.joelNE_shop = $({
            id: 0x6a,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x47)],
        });
        this.joelSE_lake = $({
            id: 0x6b,
            tilesets: { town: { type: 'square' } },
        });
        this.oakNW = $({
            id: 0x6c,
            tilesets: { town: { type: 'square' } },
            exits: [door(0xe7)],
        });
        this.oakNE = $({
            id: 0x6d,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x60)],
        });
        this.oakSW = $({
            id: 0x6e,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x7c)],
        });
        this.oakSE = $({
            id: 0x6f,
            tilesets: { town: { type: 'square' } },
            exits: [bottomEdge({ left: 0, shift: 0.5 }), door(0x97)],
        });
        this.temple = $({
            id: 0x70,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.wideDeadEndN = $({
            id: 0x71,
            icon: icon `
      | ┃ |
      | > |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'w   ',
            connect: '2',
            exits: [downStair(0xc7)],
        });
        this.goaWideDeadEndN = $({
            id: 0x71,
            icon: icon `
      |╵┃╵|
      | > |
      |   |`,
            tilesets: { labyrinth: {} },
            edges: 'w   ',
            connect: '1|2|3',
            exits: [downStair(0xc7)],
        });
        this.wideHallNS = $({
            id: 0x72,
            icon: icon `
      | ┃ |
      | ┃ |
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'w w ',
            connect: '2a',
        });
        this.goaWideHallNS = $({
            id: 0x72,
            icon: icon `
      |│┃│|
      |│┃│|
      |│┃│|`,
            tilesets: { labyrinth: {} },
            edges: 'w w ',
            connect: '19|2a|3b',
        });
        this.goaWideHallNS_blockedRight = $({
            id: 0x72,
            icon: icon `
      |│┃│|
      |│┃ |
      |│┃│|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNS, 0, 0, 0x9d)]],
            edges: 'w w ',
            connect: '19|2a|3|b',
        });
        this.goaWideHallNS_blockedLeft = $({
            id: 0x72,
            icon: icon `
      |│┃│|
      | ┃│|
      |│┃│|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNS, 0, 1, 0x51)]],
            edges: 'w w ',
            connect: '1|9|2a|3b',
        });
        this.goaWideArena = $({
            id: 0x73,
            icon: icon `<
      |╻<╻|
      |┡━┩|
      |│╻│|`,
            tilesets: { labyrinth: {} },
            feature: ['arena'],
            edges: 'w*w*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: '9b|a',
            exits: [upStair(0x27)],
        });
        this.limeTreeLake = $({
            id: 0x74,
            tilesets: {},
            exits: [bottomEdgeHouse(), cave(0x47)],
        });
        this.swampNW = $({
            id: 0x75,
            icon: icon `
      | │ |
      |─┘ |
      |   |`,
            tilesets: { swamp: {} },
            edges: 'ss  ',
            connect: '26',
            exits: [topEdge(6, 4), leftEdge(7, 3)],
        });
        this.swampE = $({
            id: 0x76,
            icon: icon `
      |   |
      | ╶─|
      |   |`,
            tilesets: { swamp: {} },
            edges: '   s',
            connect: 'e',
            exits: [],
        });
        this.swampE_door = $({
            id: 0x76,
            icon: icon `∩
      | ∩ |
      | ╶─|
      |   |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            flag: 'always',
            edges: '   s',
            connect: 'e',
            exits: [cave(0x6c, 'swamp')],
        });
        this.swampNWSE = $({
            id: 0x77,
            icon: icon `
      | │ |
      |─┼─|
      | │ |`,
            tilesets: { swamp: {} },
            edges: 'ssss',
            connect: '26ae',
            exits: [topEdge(6, 4),
                leftEdge(7, 3),
                bottomEdge({ left: 6, width: 4 }),
                rightEdge(7, 3)],
        });
        this.swampNWS = $({
            id: 0x78,
            icon: icon `
      | │ |
      |─┤ |
      | │ |`,
            tilesets: { swamp: {} },
            edges: 'sss ',
            connect: '26a',
            exits: [topEdge(6, 4), leftEdge(7, 3), bottomEdge({ left: 6, width: 4 })],
        });
        this.swampNE = $({
            id: 0x79,
            icon: icon `
      | │ |
      | └─|
      |   |`,
            tilesets: { swamp: {} },
            edges: 's  s',
            connect: '2e',
            exits: [topEdge(6, 4), rightEdge(7, 3)],
        });
        this.swampWSE = $({
            id: 0x7a,
            icon: icon `
      |   |
      |─┬─|
      | │ |`,
            tilesets: { swamp: {} },
            edges: ' sss',
            connect: '6ae',
            exits: [leftEdge(7, 3), bottomEdge({ left: 6, width: 4 }), rightEdge(7, 3)],
        });
        this.swampWSE_door = $({
            id: 0x7a,
            icon: icon `∩
      | ∩  |
      |─┬─|
      | │ |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            flag: 'always',
            edges: ' sss',
            connect: '6ae',
            exits: [cave(0x66, 'swamp')],
        });
        this.swampW = $({
            id: 0x7b,
            icon: icon `
      |   |
      |─╴ |
      |   |`,
            tilesets: { swamp: {} },
            edges: ' s  ',
            connect: '6',
        });
        this.swampW_door = $({
            id: 0x7b,
            icon: icon `∩
      | ∩ |
      |─╴ |
      |   |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            flag: 'always',
            edges: ' s  ',
            connect: '6',
            exits: [cave(0x64, 'swamp')],
        });
        this.swampArena = $({
            id: 0x7c,
            icon: icon `
      |   |
      |┗┯┛|
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['arena'],
            edges: ' *s*',
            connect: 'a',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
        });
        this.swampNWE = $({
            id: 0x7d,
            icon: icon `
      | │ |
      |─┴─|
      |   |`,
            tilesets: { swamp: {} },
            edges: 'ss s',
            connect: '26e',
            exits: [topEdge(6, 4), leftEdge(7, 3), rightEdge(7, 3)],
        });
        this.swampSW = $({
            id: 0x7e,
            icon: icon `
      |   |
      |─┐ |
      | │ |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            update: [[ScreenFix.SwampDoors, (s, seed, rom) => {
                        rom.metascreens.swampSW_door.flag = 'always';
                        return true;
                    }]],
            edges: ' ss ',
            connect: '6a',
            exits: [leftEdge(7, 3), bottomEdge({ left: 6, width: 4 })],
        });
        this.swampSW_door = $({
            id: 0x7e,
            icon: icon `∩
      | ∩ |
      |─┐ |
      | │ |`,
            tilesets: { swamp: {} },
            edges: ' ss ',
            connect: '6a',
            exits: [cave(0x67, 'swamp')],
        });
        this.swampEmpty = $({
            id: 0x7f,
            icon: icon `
      |   |
      |   |
      |   |`,
            tilesets: { swamp: {} },
            feature: ['empty'],
            edges: '    ',
            connect: '',
        });
        this.swampN = $({
            id: ~0x70,
            icon: icon `
      | │ |
      | ╵ |
      |   |`,
            tilesets: { swamp: {} },
            edges: 's   ',
            connect: '2',
        });
        this.swampS = $({
            id: ~0x71,
            icon: icon `
      |   |
      | ╷ |
      | │ |`,
            tilesets: { swamp: {} },
            edges: '  s ',
            connect: 'a',
        });
        this.swampNS = $({
            id: ~0x72,
            icon: icon `
      | │ |
      | │ |
      | │ |`,
            tilesets: { swamp: {} },
            edges: 's s ',
            connect: '2a',
            exits: [topEdge(6, 4), bottomEdge({ left: 6, width: 4 })],
        });
        this.swampWE = $({
            id: ~0x72,
            icon: icon `
      |   |
      |───|
      |   |`,
            tilesets: { swamp: {} },
            edges: ' s s',
            connect: '6e',
            exits: [leftEdge(7, 3), rightEdge(7, 3)],
        });
        this.swampWE_door = $({
            id: ~0x72,
            icon: icon `∩
      | ∩ |
      |───|
      |   |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            flag: 'always',
            edges: ' s s',
            connect: '6e',
            exits: [upStair(0x66)],
        });
        this.swampSE = $({
            id: ~0x73,
            icon: icon `
      |   |
      | ┌─|
      | │ |`,
            tilesets: { swamp: {} },
            edges: '  ss',
            connect: 'ae',
            exits: [leftEdge(7, 3), bottomEdge({ left: 6, width: 4 })],
        });
        this.swampSE_door = $({
            id: ~0x73,
            icon: icon `∩
      | ∩ |
      | ┌─|
      | │ |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            flag: 'always',
            edges: '  ss',
            connect: 'ae',
            exits: [cave(0x6a, 'swamp')],
        });
        this.swampNSE = $({
            id: ~0x74,
            icon: icon `
      | │ |
      | ├─|
      | │ |`,
            tilesets: { swamp: {} },
            edges: 's ss',
            connect: '2ae',
            exits: [topEdge(6, 4), bottomEdge({ left: 6, width: 4 }), rightEdge(7, 3)],
        });
        this.caveEmpty = $({
            id: 0x80,
            icon: icon `
      |   |
      |   |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            feature: ['empty'],
            edges: '    ',
        });
        this.hallNS = $({
            id: 0x81,
            icon: icon `
      | │ |
      | │ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c c ',
            connect: '2a',
            poi: [[4]],
        });
        this.hallWE = $({
            id: 0x82,
            icon: icon `
      |   |
      |───|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: ' c c',
            connect: '6e',
            poi: [[4]],
        });
        this.hallSE = $({
            id: 0x83,
            icon: icon `
      |   |
      | ┌─|
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: '  cc',
            connect: 'ae',
            poi: [[2]],
        });
        this.hallWS = $({
            id: 0x84,
            icon: icon `
      |   |
      |─┐ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: ' cc ',
            connect: '6a',
            poi: [[2]],
        });
        this.hallNE = $({
            id: 0x85,
            icon: icon `
      | │ |
      | └─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c  c',
            connect: '2e',
            poi: [[2]],
        });
        this.hallNW = $({
            id: 0x86,
            icon: icon `
      | │ |
      |─┘ |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'cc  ',
            connect: '26',
            poi: [[2]],
        });
        this.branchNSE = $({
            id: 0x87,
            icon: icon `
      | │ |
      | ├─|
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c cc',
            connect: '2ae',
            poi: [[3]],
        });
        this.branchNWSE = $({
            id: 0x88,
            icon: icon `
      | │ |
      |─┼─|
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'cccc',
            connect: '26ae',
            poi: [[3]],
        });
        this.branchNWS = $({
            id: 0x89,
            icon: icon `
      | │ |
      |─┤ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'ccc ',
            connect: '26a',
            poi: [[3]],
        });
        this.branchWSE = $({
            id: 0x8a,
            icon: icon `
      |   |
      |─┬─|
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: ' ccc',
            connect: '6ae',
            poi: [[3]],
        });
        this.branchNWE = $({
            id: 0x8b,
            icon: icon `
      | │ |
      |─┴─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'cc c',
            connect: '26e',
            poi: [[3]],
        });
        this.hallNS_stairs = $({
            id: 0x8c,
            icon: icon `
      | ┋ |
      | ┋ |
      | ┋ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            feature: ['stairs'],
            edges: 'c c ',
            connect: '2a',
        });
        this.hallSN_overBridge = $({
            id: 0x8d,
            icon: icon `
      | ╽ |
      |─┃─|
      | ╿ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            feature: ['overBridge'],
            edges: 'cbcb',
            connect: '2a',
        });
        this.hallWE_underBridge = $({
            id: 0x8e,
            icon: icon `
      | ╽ |
      |───|
      | ╿ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            feature: ['underBridge'],
            edges: 'bcbc',
            connect: '6e',
        });
        this.hallNS_wall = $({
            id: 0x8f,
            icon: icon `
      | │ |
      | ┆ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c c ',
            feature: ['wall'],
            connect: '2=a',
            wall: 0x87,
        });
        this.hallWE_wall = $({
            id: 0x90,
            icon: icon `
      |   |
      |─┄─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            feature: ['wall'],
            edges: ' c c',
            connect: '6=e',
            wall: 0x67,
        });
        this.hallNS_arena = $({
            id: 0x91,
            icon: icon `
      |┌┸┐|
      |│&│|
      |└┬┘|`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            feature: ['arena'],
            edges: 'n*c*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: '2a',
            poi: [[1, 0x60, 0x78]],
        });
        this.hallNS_arenaWall = $({
            id: 0x92,
            icon: icon `
      |┌┄┐|
      |│&│|
      |└┬┘|`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            feature: ['arena', 'wall'],
            edges: 'n*c*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: '2=a',
            wall: 0x27,
            poi: [[1, 0x60, 0x78]],
        });
        this.branchNWE_wall = $({
            id: 0x94,
            icon: icon `
      | ┆ |
      |─┴─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'cc c',
            connect: '2=6e',
        });
        this.branchNWE_upStair = $({
            id: 0x95,
            icon: icon `<
      | < |
      |─┴─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: ' c c',
            connect: '6e',
            exits: [upStair(0x47)],
        });
        this.deadEndW_upStair = $({
            id: 0x96,
            icon: icon `<
      | < |
      |─┘ |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: ' c  ',
            connect: '6',
            exits: [upStair(0x42)],
        });
        this.deadEndW_downStair = $({
            id: 0x97,
            icon: icon `>
      |   |
      |─┐ |
      | > |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: ' c  ',
            connect: '6',
            exits: [downStair(0xa2)],
        });
        this.deadEndE_upStair = $({
            id: 0x98,
            icon: icon `<
      | < |
      | └─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: '   c',
            connect: 'e',
            exits: [upStair(0x4c)],
        });
        this.deadEndE_downStair = $({
            id: 0x99,
            icon: icon `>
      |   |
      | ┌─|
      | > |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: '   c',
            connect: 'e',
            exits: [downStair(0xac)],
        });
        this.deadEndNS_stairs = $({
            id: 0x9a,
            icon: icon `
      | > |
      |   |
      | < |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c c ',
            connect: '2|a',
            exits: [downStair(0x17), upStair(0xd7)],
        });
        this.deadEndN_stairs = $({
            id: 0x9a,
            icon: icon `
      | > |
      |   |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c   ',
            connect: '2',
            exits: [downStair(0x17)],
        });
        this.deadEndS_stairs = $({
            id: 0x9a,
            icon: icon `
      |   |
      |   |
      | < |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: '  c ',
            connect: 'a',
            exits: [upStair(0xd7)],
        });
        this.deadEndNS = $({
            id: 0x9b,
            icon: icon `
      | ╵ |
      |   |
      | ╷ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c c ',
            connect: '2|a',
            poi: [[0, 0x110, 0x78], [0, -0x30, 0x78]],
        });
        this.deadEndN = $({
            id: 0x9b,
            icon: icon `
      | ╵ |
      |   |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c   ',
            connect: '2',
            poi: [[0, -0x30, 0x78]],
        });
        this.deadEndS = $({
            id: 0x9b,
            icon: icon `
      |   |
      |   |
      | ╷ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: '  c ',
            connect: 'a',
            poi: [[0, 0x110, 0x78]],
        });
        this.deadEndWE = $({
            id: 0x9c,
            icon: icon `
      |   |
      |╴ ╶|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: ' c c',
            connect: '6|e',
            poi: [[0, 0x70, 0x108], [0, 0x70, -0x28]],
        });
        this.deadEndW = $({
            id: 0x9c,
            icon: icon `
      |   |
      |╴  |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: ' c  ',
            connect: '6',
            poi: [[0, 0x70, -0x28]],
        });
        this.deadEndE = $({
            id: 0x9c,
            icon: icon `
      |   |
      |  ╶|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: '   c',
            connect: 'e',
            poi: [[0, 0x70, 0x108]],
        });
        this.hallNS_entrance = $({
            id: 0x9e,
            icon: icon `╽
      | │ |
      | │ |
      | ╽ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {} },
            edges: 'c n ',
            connect: '2a',
            exits: [bottomEdge()],
        });
        this.channelExitSE = $({
            id: 0x9f,
            icon: icon `
      |   |
      | ╔═|
      | ║ |`,
            tilesets: { dolphinCave: {} },
        });
        this.channelBendWS = $({
            id: 0xa0,
            icon: icon `
      |█  |
      |═╗ |
      |█║ |`,
            tilesets: { dolphinCave: {} },
        });
        this.channelHallNS = $({
            id: 0xa1,
            icon: icon `
      | ║ |
      | ╠┈|
      | ║ |`,
            tilesets: { dolphinCave: {} },
        });
        this.channelEntranceSE = $({
            id: 0xa2,
            icon: icon `
      |   |
      | ╔┈|
      |╷║ |`,
            tilesets: { dolphinCave: {} },
        });
        this.channelCross = $({
            id: 0xa3,
            icon: icon `
      | ║ |
      |═╬═|
      |╷║╷|`,
            tilesets: { dolphinCave: {} },
        });
        this.channelDoor = $({
            id: 0xa4,
            icon: icon `∩
      | ∩█|
      |┈══|
      |  █|`,
            tilesets: { dolphinCave: {} },
        });
        this.mountainFloatingIsland = $({
            id: 0xa5,
            icon: icon `*
      |═╗█|
      |*║ |
      |═╣█|`,
            tilesets: { mountainRiver: {} },
            edges: '  wp',
            connect: 'e',
        });
        this.mountainPathNE_stair = $({
            id: 0xa6,
            icon: icon `└
      |█┋█|
      |█  |
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: 'l  p',
            connect: '2e',
            exits: [topEdge()],
        });
        this.mountainBranchNWE = $({
            id: 0xa7,
            icon: icon `┴
      |█ █|
      |   |
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: 'pp p',
            connect: '26e',
        });
        this.mountainPathWE_iceBridge = $({
            id: 0xa8,
            icon: icon `╫
      |█║█|
      | ┆ |
      |█║█|`,
            tilesets: { mountainRiver: {} },
            feature: ['bridge'],
            edges: 'wpwp',
            allowed: s => s.hasFeature('empty') ? [2] : [],
            connect: '6-e:2a',
            wall: 0x87,
        });
        this.mountainPathSE = $({
            id: 0xa9,
            icon: icon `┌
      |███|
      |█  |
      |█ █|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: '  pp',
            connect: 'ae',
        });
        this.mountainDeadEndW_caveEmpty = $({
            id: 0xaa,
            icon: icon `∩
      |█∩█|
      |▐ ▐|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' p  ',
            connect: '6',
            exits: [cave(0x5a)],
        });
        this.mountainPathNE = $({
            id: 0xab,
            icon: icon `└
      |█ █|
      |█  |
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: 'p  p',
            connect: '2e',
        });
        this.mountainBranchWSE = $({
            id: 0xac,
            icon: icon `┬
      |███|
      |   |
      |█ █|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' ppp',
            connect: '6ae',
        });
        this.mountainPathW_cave = $({
            id: 0xad,
            icon: icon `∩
      |█∩█|
      |  ▐|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' p  ',
            connect: '6',
            exits: [cave(0x55)],
        });
        this.mountainPathE_slopeS = $({
            id: 0xae,
            icon: icon `╓
      |███|
      |█  |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: '  sp',
            connect: 'ae',
        });
        this.mountainPathNW = $({
            id: 0xaf,
            icon: icon `┘
      |█ █|
      |  █|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: 'pp  ',
            connect: '26',
        });
        this.mountainCave_empty = $({
            id: 0xb0,
            icon: icon `∩
      |█∩█|
      |▌ ▐|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: '    ',
            connect: '',
            exits: [cave(0x58)],
        });
        this.mountainPathE_cave = $({
            id: 0xb1,
            icon: icon `∩
      |█∩█|
      |█  |
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: '   p',
            connect: 'e',
            exits: [cave(0x57)],
        });
        this.mountainPathWE_slopeN = $({
            id: 0xb2,
            icon: icon `╨
      |█↓█|
      |   |
      |███|`,
            tilesets: { mountain: {} },
            edges: 'sp p',
            connect: '26e',
        });
        this.mountainDeadEndW = $({
            id: 0xb3,
            icon: icon `╴
      |███|
      |  █|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' p  ',
            connect: '6',
        });
        this.mountainPathWE = $({
            id: 0xb4,
            icon: icon `─
      |███|
      |   |
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' p p',
            connect: '6e',
        });
        this.mountainArena_gate = $({
            id: 0xb5,
            icon: icon `#
      |█#█|
      |▌ ▐|
      |█┋█|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            feature: ['arena'],
            edges: ' *l*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: 'a',
            exits: [{ ...upStair(0x37, 3), type: 'cave' }],
        });
        this.mountainPathN_slopeS_cave = $({
            id: 0xb6,
            icon: icon `∩
      |█┋∩|
      |▌  |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 'l s ',
            connect: '2a',
            exits: [cave(0x5a), topEdge()],
        });
        this.mountainPathWE_slopeNS = $({
            id: 0xb7,
            icon: icon `╫
      |█↓█|
      |   |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 'spsp',
            connect: '26ae',
        });
        this.mountainPathWE_slopeN_cave = $({
            id: 0xb8,
            icon: icon `∩
      |█↓∩|
      |   |
      |███|`,
            tilesets: { mountain: {} },
            edges: 'sp p',
            connect: '26e',
            exits: [cave(0x5c)],
        });
        this.mountainPathWS = $({
            id: 0xb9,
            icon: icon `┐
      |███|
      |  █|
      |█ █|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' pp ',
            connect: '6a',
        });
        this.mountainSlope = $({
            id: 0xba,
            icon: icon `↓
      |█↓█|
      |█↓█|
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 's s ',
            connect: '2a',
        });
        this.mountainRiver = $({
            id: 0xba,
            icon: icon `║
      |█║█|
      |█║█|
      |█║█|`,
            tilesets: { mountainRiver: {} },
            edges: 'w w ',
            allowed: s => s.hasFeature('empty') ? [2] : [],
            connect: '2:e',
        });
        this.mountainPathE_gate = $({
            id: 0xbb,
            icon: icon `∩
      |█∩█|
      |█  |
      |███|`,
            tilesets: { mountain: {} },
            edges: '   p',
            connect: 'e',
            exits: [cave(0x57, 'gate')],
        });
        this.mountainPathWE_inn = $({
            id: 0xbc,
            icon: icon `∩
      |█∩█|
      |   |
      |███|`,
            tilesets: { mountain: {} },
            edges: ' p p',
            connect: '6e',
            exits: [door(0x76)],
        });
        this.mountainPathWE_bridgeOverSlope = $({
            id: 0xbd,
            icon: icon `═
      |█↓█|
      | ═ |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 'spsp',
            connect: '6e',
        });
        this.mountainPathWE_bridgeOverRiver = $({
            id: 0xbd,
            icon: icon `═
      |█║█|
      | ═ |
      |█║█|`,
            tilesets: { mountainRiver: {} },
            edges: 'wpwp',
            allowed: s => s.hasFeature('empty') ? [2] : [],
            connect: '6e|2|a',
        });
        this.mountainSlope_underBridge = $({
            id: 0xbe,
            icon: icon `↓
      |█↓█|
      | ═ |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 'spsp',
            connect: '2a',
        });
        this.mountainEmpty = $({
            id: 0xbf,
            icon: icon `
      |███|
      |███|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            feature: ['empty'],
            edges: '    ',
        });
        this.boundaryS = $({
            id: 0xc0,
            icon: icon `
      |   |
      |▄▄▄|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'o^ ^',
        });
        this.boundaryN_cave = $({
            id: 0xc1,
            icon: icon `
      |███|
      |▀∩▀|
      |   |`,
            tilesets: { grass: {}, sea: {}, desert: {},
                river: { requires: [ScreenFix.SeaCaveEntrance] } },
            edges: ' vov',
            exits: [cave(0x49)],
        });
        this.boundarySE_cave = $({
            id: 0xc2,
            icon: icon `
      | ▐█|
      |▄∩█|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<^  ',
            exits: [cave(0x5a)],
        });
        this.waterfall = $({
            id: 0xc3,
            icon: icon `
      |   |
      |↓↓↓|
      |   |`,
            tilesets: { sea: {} },
            edges: 'oooo',
        });
        this.whirlpoolBlocker = $({
            id: 0xc4,
            icon: icon `
      |   |
      |█╳█|
      |   |`,
            tilesets: { sea: {} },
            feature: ['whirlpool'],
            flag: 'calm',
            edges: 'oooo',
        });
        this.beachExitN = $({
            id: 0xc5,
            icon: icon `
      |█ █|
      |█╱▀|
      |█▌ |`,
            tilesets: { sea: {} },
            edges: 'n >v',
            exits: [topEdge(0xa, 1)],
        });
        this.whirlpoolOpen = $({
            id: 0xc6,
            icon: icon `
      |   |
      | ╳ |
      |   |`,
            tilesets: { sea: {} },
            feature: ['whirlpool'],
            edges: 'oooo',
            flag: 'calm',
        });
        this.lighthouseEntrance = $({
            id: 0xc7,
            icon: icon `
      |▗▟█|
      |▐∩▛|
      |▝▀▘|`,
            tilesets: { sea: {} },
            feature: ['lighthouse'],
            edges: '<oov',
            exits: [cave(0x2a), door(0x75)],
        });
        this.beachCave = $({
            id: 0xc8,
            icon: icon `
      |█∩█|
      |▀╲█|
      |   |`,
            tilesets: { sea: {} },
            edges: ' vov',
            exits: [cave(0x28)],
        });
        this.beachCabinEntrance = $({
            id: 0xc9,
            icon: icon `
      | ∩█|
      | ╲▀|
      |█▄▄|`,
            tilesets: { sea: {} },
            feature: ['cabin'],
            edges: '<^ b',
            exits: [door(0x55), rightEdge(8, 3)],
        });
        this.oceanShrine = $({
            id: 0xca,
            icon: icon `
      |▗▄▖|
      |▐*▌|
      |▝ ▘|`,
            tilesets: { sea: {} },
            feature: ['altar'],
            edges: 'oooo',
        });
        this.pyramidEntrance = $({
            id: 0xcb,
            icon: icon `
      | ▄ |
      |▟∩▙|
      | ╳ |`,
            tilesets: { desert: {} },
            feature: ['pyramid'],
            edges: 'oooo',
            exits: [cave(0xa7)],
        });
        this.cryptEntrance = $({
            id: 0xcc,
            icon: icon `
      | ╳ |
      |▐>▌|
      |▝▀▘|`,
            tilesets: { desert: {} },
            feature: ['crypt'],
            edges: 'oooo',
            exits: [downStair(0x67)],
        });
        this.oasisLake = $({
            id: 0xcd,
            icon: icon `
      | ^ |
      |vOv|
      | vv|`,
            tilesets: { desert: {} },
            feature: ['lake'],
            edges: 'oo3o',
        });
        this.desertCaveEntrance = $({
            id: 0xce,
            icon: icon `
      |▗▄▖|
      |▜∩▛|
      | ╳ |`,
            tilesets: { desert: {},
                sea: { requires: [ScreenFix.SeaCaveEntrance] } },
            edges: 'oooo',
            exits: [cave(0xa7)],
        });
        this.oasisCave = $({
            id: 0xcf,
            icon: icon `
      | vv|
      |▄∩v|
      |█▌ |`,
            tilesets: { desert: {} },
            edges: '3^>o',
            exits: [upStair(0x47)],
        });
        this.channelEndW_cave = $({
            id: 0xd0,
            icon: icon `
      |██∩|
      |══ |
      |███|`,
            tilesets: { dolphinCave: {} },
        });
        this.boatChannel = $({
            id: 0xd1,
            icon: icon `
      |███|
      |▀▀▀|
      |▄▄▄|`,
            tilesets: { sea: {} },
            edges: ' b b',
            exits: [rightEdge(8, 3), leftEdge(8, 3)],
        });
        this.channelWE = $({
            id: 0xd2,
            icon: icon `
      |███|
      |═══|
      |███|`,
            tilesets: { dolphinCave: {} },
        });
        this.riverCaveNWSE = $({
            id: 0xd3,
            icon: icon `
      |┘║└|
      |═╬═|
      |┬┇┬|`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['bridge'],
            edges: 'rrrr',
            connect: '15:3d:79-af',
            wall: 0xb6,
            poi: [[4, 0x00, 0x98]],
        });
        this.riverCaveNS = $({
            id: 0xd4,
            icon: icon `
      |│║│|
      |│║│|
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r r ',
            connect: '19:3a',
        });
        this.riverCaveWE = $({
            id: 0xd5,
            icon: icon `
      |───|
      |═══|
      |───|`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' r r',
            connect: '5d:7f',
        });
        this.riverCaveNS_bridge = $({
            id: 0xd6,
            icon: icon `
      |│║│|
      |├┇┤|
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['bridge'],
            edges: 'r r ',
            connect: '19-3a',
            wall: 0x87,
        });
        this.riverCaveWE_bridge = $({
            id: 0xd7,
            icon: icon `
      |─┬─|
      |═┅═|
      |─┴─|`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['bridge'],
            edges: ' r r',
            connect: '5d-7f',
            wall: 0x86,
        });
        this.riverCaveSE = $({
            id: 0xd8,
            icon: icon `
      |┌──|
      |│╔═|
      |│║┌|`,
            tilesets: { cave: {}, fortress: {} },
            edges: '  rr',
            connect: '9d:af',
        });
        this.riverCaveWS = $({
            id: 0xd9,
            icon: icon `
      |──┐|
      |═╗│|
      |┐║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' rr ',
            connect: '5a:79',
        });
        this.riverCaveNE = $({
            id: 0xda,
            icon: icon `
      |│║└|
      |│╚═|
      |└──|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r  r',
            connect: '1f:3d',
        });
        this.riverCaveNW = $({
            id: 0xdb,
            icon: icon `
      |┘║│|
      |═╝│|
      |──┘|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'rr  ',
            connect: '15:37',
        });
        this.riverCaveWE_passageN = $({
            id: 0xdc,
            icon: icon `╧
      |─┴─|
      |═══|
      |───|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'cr r',
            connect: '25d:7f',
        });
        this.riverCaveWE_passageS = $({
            id: 0xdd,
            icon: icon `╤
      |───|
      |═══|
      |─┬─|`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' rcr',
            connect: '5d:7af',
        });
        this.riverCaveNS_passageW = $({
            id: 0xde,
            icon: icon `╢
      |│║│|
      |┤║│|
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'rcr ',
            connect: '169:3b',
        });
        this.riverCaveNS_passageE = $({
            id: 0xdf,
            icon: icon `╟
      |│║│|
      |│║├|
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r rc',
            connect: '19:3be',
        });
        this.wideHallNE = $({
            id: 0xe0,
            icon: icon `
      | ┃ |
      | ┗━|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'w  w',
            connect: '2e',
        });
        this.goaWideHallNE = $({
            id: 0xe0,
            icon: icon `
      |│┃└|
      |│┗━|
      |└──|`,
            tilesets: { labyrinth: {} },
            edges: 'w  w',
            connect: '1f|2e|3d',
        });
        this.goaWideHallNE_blockedLeft = $({
            id: 0xe0,
            icon: icon `
      |│┃└|
      | ┗━|
      |└──|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNE, 1, 0, 0x61)]],
            edges: 'w  w',
            connect: '1|f|2e|3d',
        });
        this.goaWideHallNE_blockedRight = $({
            id: 0xe0,
            icon: icon `
      |│┃ |
      |│┗━|
      |└──|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNE, 1, 1, 0x0d)]],
            edges: 'w  w',
            connect: '1f|2e|3|d',
        });
        this.wideHallNW = $({
            id: 0xe1,
            icon: icon `
      | ┃ |
      |━┛ |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'ww  ',
            connect: '26',
        });
        this.goaWideHallNW = $({
            id: 0xe1,
            icon: icon `
      |┘┃│|
      |━┛│|
      |──┘|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNW_blockedRight, -1, 0, 0x6d)]],
            flag: 'always',
            edges: 'ww  ',
            connect: '15|26|37',
        });
        this.goaWideHallNW_blockedRight = $({
            id: 0xe1,
            icon: icon `
      |┘┃│|
      |━┛ |
      |──┘|`,
            tilesets: { labyrinth: {} },
            edges: 'ww  ',
            connect: '15|26|3|7',
        });
        this.goaWideHallNW_blockedLeft = $({
            id: 0xe1,
            icon: icon `
      | ┃│|
      |━┛│|
      |──┘|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNW_blockedRight, 2, 1, 0x01, 0x6d)]],
            edges: 'ww  ',
            connect: '1|5|26|37',
        });
        this.wideHallSE = $({
            id: 0xe2,
            icon: icon `
      |   |
      | ┏━|
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: '  ww',
            connect: 'ae',
        });
        this.goaWideHallSE = $({
            id: 0xe2,
            icon: icon `
      |┌──|
      |│┏━|
      |│┃┌|`,
            tilesets: { labyrinth: {} },
            edges: '  ww',
            connect: '9d|ae|bf',
        });
        this.goaWideHallSE_blockedLeft = $({
            id: 0xe2,
            icon: icon `
      |┌──|
      | ┏━|
      |│┃┌|`,
            tilesets: { labyrinth: {} },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallSE, 3, 0, 0x61)]],
            edges: '  ww',
            connect: '9|d|ae|bf',
        });
        this.goaWideHallSE_blockedRight = $({
            id: 0xe2,
            icon: icon `
      |┌──|
      |│┏━|
      |│┃ |`,
            tilesets: { labyrinth: {} },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallSE, 3, 1, 0xdd)]],
            edges: '  ww',
            connect: '9d|ae|b|f',
        });
        this.wideHallWS = $({
            id: 0xe3,
            icon: icon `
      |   |
      |━┓ |
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' ww ',
            connect: '6a',
        });
        this.goaWideHallWS = $({
            id: 0xe3,
            icon: icon `
      |──┐|
      |━┓│|
      |┐┃│|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallWS_blockedRight, -1, 0, 0x9d)]],
            flag: 'always',
            edges: ' ww ',
            connect: '5b|6a|79',
        });
        this.goaWideHallWS_blockedRight = $({
            id: 0xe3,
            icon: icon `
      |──┐|
      |━┓ |
      |┐┃│|`,
            tilesets: { labyrinth: {} },
            edges: ' ww ',
            connect: '5|b|6a|79',
        });
        this.goaWideHallWS_blockedLeft = $({
            id: 0xe3,
            icon: icon `
      |──┐|
      |━┓│|
      | ┃│|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallWS_blockedRight, 4, 0, 0xd1, 0x9d)]],
            edges: ' ww ',
            connect: '5b|6a|7|9',
        });
        this.goaWideHallNS_stairs = $({
            id: 0xe4,
            icon: icon `
      |├┨│|
      |│┃│|
      |│┠┤|`,
            tilesets: { labyrinth: {} },
            edges: 'w w ',
            connect: '1239ab',
        });
        this.goaWideHallNS_stairsBlocked13 = $({
            id: 0xe4,
            icon: icon `
      |└┨│|
      |╷┃╵|
      |│┠┐|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNS_stairs, 5, 0, [0x41, 0x8d])]],
            edges: 'w w ',
            connect: '12ab|3|9',
        });
        this.goaWideHallNS_stairsBlocked24 = $({
            id: 0xe4,
            icon: icon `
      |┌┨│|
      |│┃│|
      |│┠┘|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNS_stairs, 5, 1, [0x01, 0xcd])]],
            edges: 'w w ',
            connect: '1|239a|b',
        });
        this.wideHallNS_deadEnds = $({
            id: 0xe5,
            icon: icon `
      | ╹ |
      |   |
      | ╻ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'w w ',
            connect: '2|a',
        });
        this.goaWideHallNS_deadEnd = $({
            id: 0xe5,
            icon: icon `
      |│╹│|
      |├─┤|
      |│╻│|`,
            tilesets: { labyrinth: {} },
            edges: 'w w ',
            connect: '139b|2|a',
        });
        this.goaWideHallNS_deadEndBlocked24 = $({
            id: 0xe5,
            icon: icon `
      |╵╹│|
      |┌─┘|
      |│╻╷|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNS_deadEnd, 6, 0, [0x61, 0xad])]],
            edges: 'w w ',
            connect: '1|2|39|a|b',
        });
        this.goaWideHallNS_deadEndBlocked13 = $({
            id: 0xe5,
            icon: icon `
      |│╹╵|
      |└─┐|
      |╷╻│|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNS_deadEnd, 6, 1, [0x6d, 0xa1])]],
            edges: 'w w ',
            connect: '1b|2|3|9|a',
        });
        this.wideHallNWSE = $({
            id: 0xe6,
            icon: icon `
      | ┃ |
      |━╋━|
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'wwww',
            connect: '26ae',
        });
        this.goaWideHallNWSE = $({
            id: 0xe6,
            icon: icon `
      |┘┃└|
      |━╋━|
      |┐┃┌|`,
            tilesets: { labyrinth: {} },
            edges: 'wwww',
            connect: '26ae|15|3d|79|bf',
        });
        this.goaWideHallNWSE_blocked13 = $({
            id: 0xe6,
            icon: icon `
      |┘┃ |
      |━╋━|
      | ┃┌|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNWSE, 7, 0, [0x0d, 0xd1])]],
            edges: 'wwww',
            connect: '26ae|15|3|d|7|9|bf',
        });
        this.goaWideHallNWSE_blocked24 = $({
            id: 0xe6,
            icon: icon `
      | ┃└|
      |━╋━|
      |┐┃ |`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNWSE, 7, 1, [0x01, 0xdd])]],
            edges: 'wwww',
            connect: '26ae|1|5|3d|79|b|f',
        });
        this.wideHallNWE = $({
            id: 0xe7,
            icon: icon `
      | ┃ |
      |━┻━|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'ww w',
            connect: '26e',
        });
        this.goaWideHallNWE = $({
            id: 0xe7,
            icon: icon `
      |┘┃└|
      |━┻━|
      |───|`,
            tilesets: { labyrinth: {} },
            edges: 'ww w',
            connect: '26e|15|3d|7f',
        });
        this.goaWideHallNWE_blockedTop = $({
            id: 0xe7,
            icon: icon `
      | ┃ |
      |━┻━|
      |───|`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallNWE, -1, 0, [0x01, 0x0d])]],
            edges: 'ww w',
            connect: '26e|1|5|3|d|7f',
        });
        this.wideHallWSE = $({
            id: 0xe8,
            icon: icon `
      |   |
      |━┳━|
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' www',
            connect: '6ae',
        });
        this.goaWideHallWSE = $({
            id: 0xe8,
            icon: icon `
      |───|
      |━┳━|
      |┐┃┌|`,
            tilesets: { labyrinth: {} },
            edges: ' www',
            connect: '6ae|5d|79|bf',
        });
        this.goaWideHallWSE_blockedBottom = $({
            id: 0xe8,
            icon: icon `
      |───|
      |━┳━|
      | ┃ |`,
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets] } },
            update: [[ScreenFix.LabyrinthParapets,
                    labyrinthVariant(s => s.goaWideHallWSE, -1, 0, [0xd1, 0xdd])]],
            edges: ' www',
            connect: '6ae|5d|7|9|b|f',
        });
        this.wideHallNS_wallTop = $({
            id: 0xe9,
            icon: icon `
      | ┆ |
      | ┃ |
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c w',
            connect: '2a',
            exits: [topEdge(6, 4)],
        });
        this.goaWideHallNS_wallTop = $({
            id: 0xe9,
            icon: icon `
      | ┆ |
      |╷┃╷|
      |│┃│|`,
            tilesets: { labyrinth: {} },
            edges: 'c w ',
            connect: '2a|9|b',
            exits: [topEdge(6, 4)],
        });
        this.wideHallWE = $({
            id: 0xea,
            icon: icon `
      |   |
      |━━━|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' w w',
            connect: '6e',
        });
        this.goaWideHallWE = $({
            id: 0xea,
            icon: icon `
      |───|
      |━━━|
      |───|`,
            tilesets: { labyrinth: {} },
            edges: ' w w',
            connect: '5d|6e|7f',
        });
        this.pitWE = $({
            id: 0xeb,
            icon: icon `
      |   |
      |─╳─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['pit'],
            edges: 'c c',
            connect: '6e',
            platform: { type: 'horizontal', coord: 28728 },
        });
        this.pitNS = $({
            id: 0xec,
            icon: icon `
      | │ |
      | ╳ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['pit'],
            edges: ' c c',
            connect: '2a',
            platform: { type: 'vertical', coord: 16504 },
        });
        this.spikesNS_hallS = $({
            id: 0xed,
            icon: icon `
      | ░ |
      | ░ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['spikes'],
            edges: 's c ',
            connect: '2a',
        });
        this.spikesNS_hallN = $({
            id: 0xee,
            icon: icon `
      | │ |
      | ░ |
      | ░ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['spikes'],
            edges: 'c s ',
            connect: '2a',
        });
        this.spikesNS_hallWE = $({
            id: 0xef,
            icon: icon `
      | ░ |
      |─░─|
      | ░ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['spikes'],
            edges: 'scsc',
            connect: '26ae',
        });
        this.spikesNS_hallW = $({
            id: ~0xe0,
            icon: icon `
      | ░ |
      |─░ |
      | ░ |`,
            tilesets: withRequire(ScreenFix.ExtraSpikes, { cave: {}, fortress: {}, pyramid: {}, iceCave: {} }),
            feature: ['spikes'],
            edges: 'scs ',
            connect: '26a',
        });
        this.spikesNS_hallE = $({
            id: ~0xe1,
            icon: icon `
      | ░ |
      | ░─|
      | ░ |`,
            tilesets: withRequire(ScreenFix.ExtraSpikes, { cave: {}, fortress: {}, pyramid: {}, iceCave: {} }),
            feature: ['spikes'],
            edges: 's sc',
            connect: '2ae',
        });
        this.riverCave_deadEndsNS = $({
            id: 0xf0,
            icon: icon `
      | ╨ |
      |   |
      | ╥ |`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r r ',
            connect: '1:3|9:b',
            poi: [[1, -0x30, 0x48], [1, -0x30, 0x98],
                [1, 0x110, 0x48], [1, 0x110, 0x98]],
        });
        this.riverCave_deadEndsN = $({
            id: 0xf0,
            icon: icon `
      | ╨ |
      |   |
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r   ',
            connect: '1:3',
            poi: [[1, -0x30, 0x48], [1, -0x30, 0x98]],
        });
        this.riverCave_deadEndsS = $({
            id: 0xf0,
            icon: icon `
      |   |
      |   |
      | ╥ |`,
            tilesets: { cave: {}, fortress: {} },
            edges: '  r ',
            connect: '9:b',
            poi: [[1, 0x110, 0x48], [1, 0x110, 0x98]],
        });
        this.riverCave_deadEndsWE = $({
            id: 0xf1,
            icon: icon `
      |   |
      |╡ ╞|
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' r r',
            connect: '5:7|d:f',
            poi: [[1, 0x60, 0x108], [1, 0xa0, 0x108],
                [1, 0x60, -0x28], [1, 0xa0, -0x28]],
        });
        this.riverCave_deadEndsW = $({
            id: 0xf1,
            icon: icon `
      |   |
      |╡  |
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' r  ',
            connect: '5:7',
            poi: [[1, 0x60, -0x28], [1, 0xa0, -0x28]],
        });
        this.riverCave_deadEndsE = $({
            id: 0xf1,
            icon: icon `
      |   |
      |  ╞|
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            edges: '   r',
            connect: 'd:f',
            poi: [[1, 0x60, 0x108], [1, 0xa0, 0x108]],
        });
        this.riverCaveN_bridge = $({
            id: 0xf2,
            icon: icon `
      | ┇ |
      | ╨ |
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['bridge'],
            edges: 'r   ',
            connect: '1-3',
            wall: 0x17,
        });
        this.riverCaveS_bridge = $({
            id: 0xf2,
            icon: icon `
      |   |
      | ╥ |
      | ┇ |`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['bridge'],
            edges: '  r ',
            connect: '9-b',
            wall: 0xc6,
        });
        this.riverCaveWSE = $({
            id: 0xf3,
            icon: icon `
      |───|
      |═╦═|
      |┐║┌|`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' rrr',
            connect: '5d:79:bf',
        });
        this.riverCaveNWE = $({
            id: 0xf4,
            icon: icon `
      |┘║└|
      |═╩═|
      |───|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'rr r',
            connect: '15:3d:7f',
        });
        this.riverCaveNS_blockedRight = $({
            id: 0xf5,
            icon: icon `
      |│║│|
      |│║ |
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r r ',
            connect: '19:3:b',
            poi: [[1, 0xc0, 0x98], [1, 0x40, 0x98]],
        });
        this.riverCaveNS_blockedLeft = $({
            id: 0xf6,
            icon: icon `
      |│║│|
      | ║│|
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r r ',
            connect: '1:3b:9',
            poi: [[1, 0xb0, 0x48], [1, 0x30, 0x48]],
        });
        this.spikesNS = $({
            id: 0xf7,
            icon: icon `
      | ░ |
      | ░ |
      | ░ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['spikes'],
            edges: 's s ',
            connect: '2a',
        });
        this.cryptArena_statues = $({
            id: 0xf8,
            icon: icon `<
      |&<&|
      |│ │|
      |└┬┘|`,
            tilesets: { pyramid: {} },
            feature: ['arena'],
            edges: ' *c*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: 'a',
            exits: [upStair(0x47)]
        });
        this.pyramidArena_draygon = $({
            id: 0xf9,
            icon: icon `
      |┌─┐|
      |│╳│|
      |└┬┘|`,
            tilesets: { pyramid: {} },
            feature: ['arena', 'pit'],
            edges: ' *w*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: 'a',
        });
        this.cryptArena_draygon2 = $({
            id: 0xfa,
            icon: icon `
      |┏┷┓|
      |┃&┃|
      |┗┳┛|`,
            tilesets: { pyramid: {} },
            feature: ['arena'],
            edges: 'c*w*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: '2a',
            exits: [topEdge(6, 4)],
        });
        this.cryptArena_entrance = $({
            id: 0xfb,
            icon: icon `
      | ┃ |
      | ┃ |
      | ╿ |`,
            tilesets: { pyramid: {} },
            edges: 'w n ',
            connect: '2a',
            exits: [bottomEdge()],
        });
        this.cryptTeleporter = $({
            id: 0xfc,
            tilesets: { pyramid: {} },
        });
        this.fortressArena_through = $({
            id: 0xfd,
            icon: icon `╽
      |┌┴┐|
      |│ │|
      |┕┳┙|`,
            tilesets: { pyramid: {} },
            feature: ['arena'],
            edges: 'n*w*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: '2a',
            exits: [topEdge()],
        });
        this.fortressTrap = $({
            id: 0xfe,
            icon: icon `
      |└─┘|
      | ╳ |
      |╶┬╴|`,
            tilesets: { pyramid: {} },
            feature: ['pit'],
            edges: '  n ',
            connect: 'a',
            exits: [bottomEdge()],
        });
        this.shrine = $({
            id: 0xff,
            tilesets: { shrine: {} },
            exits: [bottomEdge({ left: 6, width: 5 })],
        });
        this.inn = $({
            id: 0x100,
            tilesets: { house: {} },
            exits: [door(0x86)],
        });
        this.toolShop = $({
            id: 0x101,
            tilesets: { house: {} },
            exits: [door(0x86)],
        });
        this.armorShop = $({
            id: 0x102,
            tilesets: { house: {} },
            exits: [door(0x86)],
        });
        $.commit(this, (key, data) => {
            const screen = new Metascreen(rom, data);
            this.screens.add(screen);
            this.screensById.get(screen.id);
            for (const tilesetName in data.tilesets) {
                const key = tilesetName;
                const tilesetData = data.tilesets[key];
                if (tilesetData.requires) {
                    for (const fix of tilesetData.requires) {
                        this.screensByFix.get(fix).push(screen);
                    }
                }
                else {
                    rom.metatilesets[key].screens.add(screen);
                }
            }
            return screen;
        });
    }
    getById(id) {
        return this.screensById.has(id) ? [...this.screensById.get(id)] : [];
    }
    registerFix(fix, seed) {
        for (const screen of this.screensByFix.get(fix)) {
            const update = (screen.data.update || []).find((update) => update[0] === fix);
            if (update) {
                if (seed == null)
                    throw new Error(`Seed required for update`);
                if (!update[1](screen, seed, this.rom))
                    continue;
            }
            for (const tilesetName in screen.data.tilesets) {
                const key = tilesetName;
                const data = screen.data.tilesets[key];
                if (!data.requires)
                    continue;
                const index = data.requires.indexOf(fix);
                if (index < 0)
                    continue;
                data.requires.splice(index, 1);
                if (!data.requires.length) {
                    this.rom.metatilesets[key].screens.add(screen);
                }
            }
        }
    }
    renumber(oldId, newId) {
        const dest = this.screensById.get(newId);
        if (dest.length)
            throw new Error(`ID already used: ${newId}: ${dest}`);
        for (const screen of this.getById(oldId)) {
            screen.data.id = newId;
            dest.push(screen);
        }
        this.screensById.delete(oldId);
        const oldScreen = this.rom.screens.getScreen(oldId);
        const clone = oldScreen.clone(newId);
        this.rom.screens.setScreen(newId, clone);
        oldScreen.used = false;
        if (oldId < 0)
            this.rom.screens.deleteScreen(oldId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YXNjcmVlbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21ldGFzY3JlZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDdEMsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUN0QyxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUNDLFVBQVUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFDbEUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxHQUM1RCxNQUFNLHFCQUFxQixDQUFDO0FBRXBDLE9BQU8sRUFBQyxTQUFTLEVBQUUsV0FBVyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFLdEQsTUFBTSxDQUFDLEdBQUcsV0FBVyxFQUFnQyxDQUFDO0FBVXRELFNBQVMsZ0JBQWdCLENBQUMsUUFBd0MsRUFDeEMsR0FBVyxFQUFFLE9BQVksRUFDekIsSUFBcUIsRUFBRSxNQUF3QjtJQUN2RSxPQUFPLENBQUMsQ0FBYSxFQUFFLElBQVksRUFBRSxHQUFRLEVBQVcsRUFBRTtRQUV4RCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssT0FBTztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekMsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtZQUMxRCxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJ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QUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFDTSx3QkFBbUIsR0FBRyxDQUFDLENBQUM7WUFFL0IsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFDLEVBQUM7WUFDdEMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNsQyxDQUFDLENBQUM7UUFDTSx5QkFBb0IsR0FBRyxDQUFDLENBQUM7WUFFaEMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFDLEVBQUM7WUFDdEMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFDTSxtQkFBYyxHQUFHLENBQUMsQ0FBQztZQUUxQixFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxZQUFZLEVBQUMsRUFBQztZQUN0QyxLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM3QyxDQUFDLENBQUM7UUFDTSxvQkFBZSxHQUFHLENBQUMsQ0FBQztZQUUzQixFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxZQUFZLEVBQUMsRUFBQztZQUN0QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFF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UixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUM7U0FDbkMsQ0FBQyxDQUFDO1FBQ00sVUFBSyxHQUFHLENBQUMsQ0FBQztZQUVqQixFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEIsQ0FBQyxDQUFDO1FBQ00sVUFBSyxHQUFHLENBQUMsQ0FBQztZQUVqQixFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEIsQ0FBQyxDQUFDO1FBQ00sVUFBSyxHQUFHLENBQUMsQ0FBQztZQUVqQixFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEIsQ0FBQyxDQUFDO1FBQ00sVUFBSyxHQUFHLENBQUMsQ0FBQztZQUVqQixFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUVsQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN2RCxDQUFDLENBQUM7UUFDTSxXQUFNLEdBQUcsQ0FBQyxDQUFDO1lBRWxCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNy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O1FBQ00sV0FBTSxHQUFHLENBQUMsQ0FBQztZQUNsQixFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQ3JFLEtBQUssRUFBRSxNQUFNO1lBQ2IsT0FBTyxFQUFFLElBQUk7WUFDYixHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1gsQ0FBQyxDQUFDO1FBQ00sV0FBTSxHQUFHLENBQUMsQ0FBQztZQUNsQixFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQ3JFLEtBQUssRUFBRSxNQUFNO1lBQ2IsT0FBTyxFQUFFLElBQUk7WUFDYixHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1gsQ0FBQyxDQUFDO1FBQ00sV0FBTSxHQUFHLENBQUMsQ0FBQztZQUNsQixFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQ3JFLEtBQUssRUFBRSxNQUFNO1lBQ2IsT0FBTyxFQUFFLElBQUk7WUFDYixHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1gsQ0FBQyxDQUFDO1FBQ00sV0FBTSxHQUFHLENBQUMsQ0FBQztZQUNsQixFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQ3JFLEtBQUssRUFBRSxNQUFNO1lBQ2IsT0FBTyxFQUFFLElBQUk7WUFDYixHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1gsQ0FBQyxDQUFDO1FBQ00sV0FBTSxHQUFHLENBQUMsQ0FBQztZQUNsQixFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQ3JFLEtBQUssRUFBRSxNQUFNO1lBQ2IsT0FBTyxFQUFFLElBQUk7WUFDYixHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1gsQ0FBQyxDQUFDO1FBQ00sV0FBTSxHQUFHLENBQUMsQ0FBQztZQUNsQixFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFDO1lBQ3JFLEtBQUssRUFBRSxNQUFNO1lBQ2IsT0FBTyxFQUFFLElBQUk7WUFDYixHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1gsQ0FBQyxDQUFDO1FBQ00sY0FBUyxHQUFHLENBQUMsQ0FBQztZQUNyQixFQUFF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QUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6QyxTQUFTLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLEtBQUssR0FBRyxDQUFDO1lBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RELENBQUM7Q0E0bkdGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG4vL2ltcG9ydCB7U2NyZWVufSBmcm9tICcuL3NjcmVlbi5qcyc7XG5pbXBvcnQge2luaXRpYWxpemVyfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbn0gZnJvbSAnLi9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbkRhdGEsXG4gICAgICAgIGJvdHRvbUVkZ2UsIGJvdHRvbUVkZ2VIb3VzZSwgY2F2ZSwgZG9vciwgZG93blN0YWlyLCBpY29uLCBsZWZ0RWRnZSxcbiAgICAgICAgcmlnaHRFZGdlLCBzZWFtbGVzc1ZlcnRpY2FsLCB0b3BFZGdlLCB1cFN0YWlyLCB3YXRlcmZhbGxDYXZlLFxuICAgICAgIH0gZnJvbSAnLi9tZXRhc2NyZWVuZGF0YS5qcyc7XG5pbXBvcnQge01ldGF0aWxlc2V0LCBNZXRhdGlsZXNldHN9IGZyb20gJy4vbWV0YXRpbGVzZXQuanMnO1xuaW1wb3J0IHtTY3JlZW5GaXgsIHdpdGhSZXF1aXJlfSBmcm9tICcuL3NjcmVlbmZpeC5qcyc7XG5cbi8vIEJBU0lDIFBMQU46IFNjcmVlbiBpcyB0aGUgcGh5c2ljYWwgYXJyYXksIE1ldGFzY3JlZW4gaGFzIHRoZSBleHRyYSBpbmZvLlxuLy8gICAgICAgICAgICAgT25seSBNZXRhc2NyZWVuIGlzIHRpZWQgdG8gc3BlY2lmaWMgKE1ldGEpdGlsZXNldHMuXG5cbmNvbnN0ICQgPSBpbml0aWFsaXplcjxbTWV0YXNjcmVlbkRhdGFdLCBNZXRhc2NyZWVuPigpO1xuXG4vKipcbiAqIEFkZHMgYSBmbGFnLXRvZ2dsYWJsZSB3YWxsIGludG8gYSBsYWJ5cmludGggc2NyZWVuLlxuICogQHBhcmFtIGJpdCAgICAgVW5pcXVlIG51bWJlciBmb3IgZWFjaCBjaG9pY2UuIFVzZSAtMSBmb3IgdW5jb25kaXRpb25hbC5cbiAqIEBwYXJhbSB2YXJpYW50IDAgb3IgMSBmb3IgZWFjaCBvcHRpb24uIFVzZSAwIHdpdGggYml0PS0xIGZvciB1bmNvbmRpdGlvbmFsLlxuICogQHBhcmFtIGZsYWcgICAgUG9zaXRpb24ocykgb2YgZmxhZyB3YWxsLlxuICogQHBhcmFtIHVuZmxhZyAgUG9zaXRpb24ocykgb2YgYW4gZXhpc3Rpbmcgd2FsbCB0byByZW1vdmUgY29tcGxldGVseS5cbiAqIEByZXR1cm4gQSBmdW5jdGlvbiB0byBnZW5lcmF0ZSB0aGUgdmFyaWFudC5cbiAqL1xuZnVuY3Rpb24gbGFieXJpbnRoVmFyaWFudChwYXJlbnRGbjogKHM6IE1ldGFzY3JlZW5zKSA9PiBNZXRhc2NyZWVuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBiaXQ6IG51bWJlciwgdmFyaWFudDogMHwxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnOiBudW1iZXJ8bnVtYmVyW10sIHVuZmxhZz86IG51bWJlcnxudW1iZXJbXSkge1xuICByZXR1cm4gKHM6IE1ldGFzY3JlZW4sIHNlZWQ6IG51bWJlciwgcm9tOiBSb20pOiBib29sZWFuID0+IHtcbiAgICAvLyBjaGVjayB2YXJpYW50XG4gICAgaWYgKCgoc2VlZCA+Pj4gYml0KSAmIDEpICE9PSB2YXJpYW50KSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgcGFyZW50ID0gcGFyZW50Rm4ocm9tLm1ldGFzY3JlZW5zKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0eXBlb2YgZmxhZyA9PT0gJ251bWJlcicgPyBbZmxhZ10gOiBmbGFnKSB7XG4gICAgICByb20uc2NyZWVuc1tzLmRhdGEuaWRdLnNldDJkKHBvcywgW1sweDE5LCAweDE5XSwgWzB4MWIsIDB4MWJdXSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9zIG9mIHR5cGVvZiB1bmZsYWcgPT09ICdudW1iZXInID8gW3VuZmxhZ10gOiB1bmZsYWcgfHwgW10pIHtcbiAgICAgIHJvbS5zY3JlZW5zW3MuZGF0YS5pZF0uc2V0MmQocG9zLCBbWzB4YzUsIDB4YzVdLCBbMHhkMCwgMHhjNV1dKTtcbiAgICB9XG4gICAgaWYgKHMuZmxhZyAhPT0gJ2Fsd2F5cycpIHtcbiAgICAgIC8vIHBhcmVudCBpcyBhIG5vcm1hbGx5LW9wZW4gc2NyZWVuIGFuZCB3ZSdyZSBjbG9zaW5nIGl0LlxuICAgICAgcGFyZW50LmZsYWcgPSAnYWx3YXlzJztcbiAgICB9IGVsc2UgaWYgKHVuZmxhZyAhPSBudWxsKSB7XG4gICAgICAvLyBwYXJlbnQgaXMgdGhlIG90aGVyIGFsdGVybmF0aXZlIC0gZGVsZXRlIGl0LlxuICAgICAgcGFyZW50LnJlbW92ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTsgICAgXG4gIH07XG59XG4gICAgICBcbmV4cG9ydCBjbGFzcyBNZXRhc2NyZWVucyB7IC8vIGV4dGVuZHMgU2V0PE1ldGFzY3JlZW4+IHtcblxuICBwcml2YXRlIHJlYWRvbmx5IHNjcmVlbnMgPSBuZXcgU2V0PE1ldGFzY3JlZW4+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgc2NyZWVuc0J5Rml4ID0gbmV3IERlZmF1bHRNYXA8U2NyZWVuRml4LCBNZXRhc2NyZWVuW10+KCgpID0+IFtdKTtcbiAgcHJpdmF0ZSByZWFkb25seSBzY3JlZW5zQnlJZCA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgTWV0YXNjcmVlbltdPigoKSA9PiBbXSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICAvL3N1cGVyKCk7XG4gICAgJC5jb21taXQodGhpcywgKGtleTogc3RyaW5nLCBkYXRhOiBNZXRhc2NyZWVuRGF0YSkgPT4ge1xuICAgICAgY29uc3Qgc2NyZWVuID0gbmV3IE1ldGFzY3JlZW4ocm9tLCBkYXRhKTtcbiAgICAgIHRoaXMuc2NyZWVucy5hZGQoc2NyZWVuKTtcbiAgICAgIHRoaXMuc2NyZWVuc0J5SWQuZ2V0KHNjcmVlbi5pZClcbiAgICAgIGZvciAoY29uc3QgdGlsZXNldE5hbWUgaW4gZGF0YS50aWxlc2V0cykge1xuICAgICAgICBjb25zdCBrZXkgPSB0aWxlc2V0TmFtZSBhcyBrZXlvZiBNZXRhdGlsZXNldHM7XG4gICAgICAgIGNvbnN0IHRpbGVzZXREYXRhID0gZGF0YS50aWxlc2V0c1trZXldITtcbiAgICAgICAgaWYgKHRpbGVzZXREYXRhLnJlcXVpcmVzKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBmaXggb2YgdGlsZXNldERhdGEucmVxdWlyZXMpIHtcbiAgICAgICAgICAgIHRoaXMuc2NyZWVuc0J5Rml4LmdldChmaXgpLnB1c2goc2NyZWVuKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKHJvbS5tZXRhdGlsZXNldHNba2V5XSBhcyBNZXRhdGlsZXNldCkuc2NyZWVucy5hZGQoc2NyZWVuKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvL3RoaXMuYWRkKHNjcmVlbik7XG4gICAgICByZXR1cm4gc2NyZWVuO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0QnlJZChpZDogbnVtYmVyKTogTWV0YXNjcmVlbltdIHtcbiAgICByZXR1cm4gdGhpcy5zY3JlZW5zQnlJZC5oYXMoaWQpID8gWy4uLnRoaXMuc2NyZWVuc0J5SWQuZ2V0KGlkKV0gOiBbXTtcbiAgfVxuXG4gIHJlZ2lzdGVyRml4KGZpeDogU2NyZWVuRml4LCBzZWVkPzogbnVtYmVyKSB7XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5zY3JlZW5zQnlGaXguZ2V0KGZpeCkpIHtcbiAgICAgIC8vIExvb2sgZm9yIGFuIHVwZGF0ZSBzY3JpcHQgYW5kIHJ1biBpdCBmaXJzdC4gIElmIGl0IHJldHVybnMgZmFsc2UgdGhlblxuICAgICAgLy8gY2FuY2VsIHRoZSBvcGVyYXRpb24gb24gdGhpcyBzY3JlZW4uXG4gICAgICBjb25zdCB1cGRhdGUgPVxuICAgICAgICAgIChzY3JlZW4uZGF0YS51cGRhdGUgfHwgW10pLmZpbmQoKHVwZGF0ZSkgPT4gdXBkYXRlWzBdID09PSBmaXgpO1xuICAgICAgaWYgKHVwZGF0ZSkge1xuICAgICAgICBpZiAoc2VlZCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFNlZWQgcmVxdWlyZWQgZm9yIHVwZGF0ZWApO1xuICAgICAgICBpZiAoIXVwZGF0ZVsxXShzY3JlZW4sIHNlZWQsIHRoaXMucm9tKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBGb3IgZWFjaCB0aWxlc2V0LCByZW1vdmUgdGhlIHJlcXVpcmVtZW50LCBhbmQgaWYgaXQncyBlbXB0eSwgYWRkIHRoZVxuICAgICAgLy8gc2NyZWVuIHRvIHRoZSB0aWxlc2V0LlxuICAgICAgZm9yIChjb25zdCB0aWxlc2V0TmFtZSBpbiBzY3JlZW4uZGF0YS50aWxlc2V0cykge1xuICAgICAgICBjb25zdCBrZXkgPSB0aWxlc2V0TmFtZSBhcyBrZXlvZiBNZXRhdGlsZXNldHM7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBzY3JlZW4uZGF0YS50aWxlc2V0c1trZXldITtcbiAgICAgICAgaWYgKCFkYXRhLnJlcXVpcmVzKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaW5kZXggPSBkYXRhLnJlcXVpcmVzLmluZGV4T2YoZml4KTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCkgY29udGludWU7XG4gICAgICAgIGRhdGEucmVxdWlyZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgaWYgKCFkYXRhLnJlcXVpcmVzLmxlbmd0aCkge1xuICAgICAgICAgICh0aGlzLnJvbS5tZXRhdGlsZXNldHNba2V5XSBhcyBNZXRhdGlsZXNldCkuc2NyZWVucy5hZGQoc2NyZWVuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlbnVtYmVyKG9sZElkOiBudW1iZXIsIG5ld0lkOiBudW1iZXIpIHtcbiAgICBjb25zdCBkZXN0ID0gdGhpcy5zY3JlZW5zQnlJZC5nZXQobmV3SWQpO1xuICAgIGlmIChkZXN0Lmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKGBJRCBhbHJlYWR5IHVzZWQ6ICR7bmV3SWR9OiAke2Rlc3R9YCk7XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5nZXRCeUlkKG9sZElkKSkge1xuICAgICAgc2NyZWVuLmRhdGEuaWQgPSBuZXdJZDtcbiAgICAgIGRlc3QucHVzaChzY3JlZW4pO1xuICAgIH1cbiAgICB0aGlzLnNjcmVlbnNCeUlkLmRlbGV0ZShvbGRJZCk7XG4gICAgLy8gVE9ETyAtIHNob3VsZCB0aGlzIGJlIGVuY2Fwc3VsYXRlZCBpbiBTY3JlZW5zPyBwcm9iYWJseS4uLlxuICAgIGNvbnN0IG9sZFNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnMuZ2V0U2NyZWVuKG9sZElkKTtcbiAgICBjb25zdCBjbG9uZSA9IG9sZFNjcmVlbi5jbG9uZShuZXdJZCk7XG4gICAgdGhpcy5yb20uc2NyZWVucy5zZXRTY3JlZW4obmV3SWQsIGNsb25lKTtcbiAgICBvbGRTY3JlZW4udXNlZCA9IGZhbHNlO1xuICAgIGlmIChvbGRJZCA8IDApIHRoaXMucm9tLnNjcmVlbnMuZGVsZXRlU2NyZWVuKG9sZElkKTtcbiAgfVxuXG4gIHJlYWRvbmx5IG92ZXJ3b3JsZEVtcHR5ID0gJCh7XG4gICAgaWQ6IDB4MDAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJyAgICAnLFxuICB9KTtcbiAgLy8gYm91bmRhcnlXX3RyZWVzOiA/Pz9cbiAgcmVhZG9ubHkgYm91bmRhcnlXX3RyZWVzID0gJCh7XG4gICAgaWQ6IDB4MDEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKWjF58XG4gICAgICB84paI4paMIHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhVHJlZXNdfX0sXG4gICAgZWRnZXM6ICc+ID5vJywgLy8gbyA9IG9wZW5cbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5VyA9ICQoe1xuICAgIGlkOiAweDAyLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paMIHxcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJz4gPm8nLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlFX3JvY2tzID0gJCh7XG4gICAgaWQ6IDB4MDMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwu4paQ4paIfFxuICAgICAgfCDilpDiloh8XG4gICAgICB8LuKWkOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3NdfX0sXG4gICAgZWRnZXM6ICc8bzwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5RSA9ICQoe1xuICAgIGlkOiAweDA0LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwg4paQ4paIfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzxvPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgbG9uZ0dyYXNzUyA9ICQoe1xuICAgIGlkOiAweDA1LFxuICAgIGljb246IGljb25gXG4gICAgICB8dnYgfFxuICAgICAgfCB2dnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGdyYXNzOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NdfX0sXG4gICAgZWRnZXM6ICdsb29vJywgLy8gbCA9IGxvbmcgZ3Jhc3NcbiAgfSk7XG4gIHJlYWRvbmx5IGxvbmdHcmFzc04gPSAkKHtcbiAgICBpZDogMHgwNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgdnZ8XG4gICAgICB8dnYgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge30sXG4gICAgICAgICAgICAgICBncmFzczoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzXX19LFxuICAgIGVkZ2VzOiAnb29sbycsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeVNfcm9ja3MgPSAkKHtcbiAgICBpZDogMHgwNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAuIHxcbiAgICAgIHziloTiloTiloR8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX0sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFSb2Nrc119fSxcbiAgICBlZGdlczogJ29eIF4nLFxuICB9KTtcbiAgcmVhZG9ubHkgZm9ydHJlc3NUb3duRW50cmFuY2UgPSAkKHsgLy8gZ29hXG4gICAgaWQ6IDB4MDgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4oip4paIfFxuICAgICAgfCAgIHxgLFxuICAgIC8vIFRPRE8gLSBlbnRyYW5jZSFcbiAgICAvLyBUT0RPIC0gcmlnaHQgZWRnZSB3YW50cyB0b3AtaGFsZiBtb3VudGFpbjsgbGVmdCBlZGdlIHRvcCBjYW4gaGF2ZVxuICAgIC8vICAgICAgICBhbnkgdG9wIGhhbGYgKGJvdHRvbSBoYWxmIHBsYWluKSwgdG9wIGVkZ2UgY2FuIGhhdmUgYW55XG4gICAgLy8gICAgICAgIGxlZnQtaGFsZiAocmlnaHQtaGFsZiBtb3VudGFpbilcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgZWRnZXM6ICcgdm92JyxcbiAgICBleGl0czogW2NhdmUoMHhhNywgJ2ZvcnRyZXNzJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZFNFX2xvbmdHcmFzcyA9ICQoe1xuICAgIGlkOiAweDA5LFxuICAgIGljb246IGljb25g4paXXG4gICAgICB8IHYgfFxuICAgICAgfHZ24paEfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJ29vPF4nLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFdfY2F2ZSA9ICQoeyAvLyBuZWFyIHNhaGFyYSwgZm9nIGxhbXBcbiAgICBpZDogMHgwYSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHwgIOKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnIG4gICcsIC8vIG4gPSBuYXJyb3dcbiAgICBleGl0czogW2NhdmUoMHg0OCksIGxlZnRFZGdlKDYpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmRORV9ncmFzc1JvY2tzID0gJCh7XG4gICAgaWQ6IDB4MGIsXG4gICAgaWNvbjogaWNvbmDilp1cbiAgICAgIHwu4paQ4paIfFxuICAgICAgfCAg4paAfFxuICAgICAgfDs7O3xgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5SaXZlclNob3J0R3Jhc3NdfSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFNob3J0R3Jhc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRSb2Nrc119fSxcbiAgICBlZGdlczogJzxvc3YnLCAvLyBzID0gc2hvcnQgZ3Jhc3NcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lck5XID0gJCh7XG4gICAgaWQ6IDB4MGMsXG4gICAgaWNvbjogaWNvbmDilptcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paIIOKWgHxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICcgID52JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lck5FID0gJCh7XG4gICAgaWQ6IDB4MGQsXG4gICAgaWNvbjogaWNvbmDilpxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paA4paI4paIfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJyB2PCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgY29ybmVyU1cgPSAkKHtcbiAgICBpZDogMHgwZSxcbiAgICBpY29uOiBpY29uYOKWmVxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4paI4paEfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPiAgXicsXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJTRSA9ICQoe1xuICAgIGlkOiAweDBmLFxuICAgIGljb246IGljb25g4pafXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHziloTilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc8XiAgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXRFID0gJCh7XG4gICAgaWQ6IDB4MTAsXG4gICAgaWNvbjogaWNvbmDilbZcbiAgICAgIHwg4paQ4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX19LFxuICAgIGVkZ2VzOiAnPG88bicsXG4gICAgZXhpdHM6IFtyaWdodEVkZ2UoNildLFxuICAgIC8vIFRPRE8gLSBlZGdlXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeU5fdHJlZXMgPSAkKHtcbiAgICBpZDogMHgxMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloDiloDiloB8XG4gICAgICB8IF4gfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgZGVzZXJ0OiB7fSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYVRyZWVzXX19LFxuICAgIGVkZ2VzOiAnIHZvdicsXG4gIH0pO1xuICByZWFkb25seSBicmlkZ2VUb1BvcnRvYSA9ICQoe1xuICAgIGlkOiAweDEyLFxuICAgIGljb246IGljb25g4pW0XG4gICAgICB84pWQICB8XG4gICAgICB84pWe4pWQ4pWQfFxuICAgICAgfOKUgiAgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIC8vIFRPRE8gLSB0aGlzIGlzIHN1cGVyIGN1c3RvbSwgbm8gZWRnZXMgZm9yIGl0P1xuICAgIC8vIEl0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmcsIGF0IGxlYXN0LlxuICAgIGZlYXR1cmU6IFsncG9ydG9hMyddLFxuICAgIGVkZ2VzOiAnMio+cicsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSgxKV0sXG4gIH0pO1xuICByZWFkb25seSBzbG9wZUFib3ZlUG9ydG9hID0gJCh7XG4gICAgaWQ6IDB4MTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojihpPiloh8XG4gICAgICB84paI4oaT4paAfFxuICAgICAgfOKUgiAgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsncG9ydG9hMiddLFxuICAgIGVkZ2VzOiAnMSoydicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckJlbmRTRSA9ICQoe1xuICAgIGlkOiAweDE0LFxuICAgIGljb246IGljb25gXG4gICAgICB8dyAgfFxuICAgICAgfCDilZTilZB8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdvb3JyJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5V19jYXZlID0gJCh7XG4gICAgaWQ6IDB4MTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKIqSB8XG4gICAgICB84paI4paMIHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge30sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFDYXZlRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICc+ID5vJyxcbiAgICBleGl0czogW2NhdmUoMHg4OSldLFxuICAgIC8vIFRPRE8gLSBmbGFnZ2FibGU/XG4gIH0pO1xuICByZWFkb25seSBleGl0TiA9ICQoe1xuICAgIGlkOiAweDE2LFxuICAgIGljb246IGljb25g4pW1XG4gICAgICB84paIIOKWiHxcbiAgICAgIHziloAg4paAfFxuICAgICAgfCBeIHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge319LCAvLyBzZWEgaGFzIG5vIG5lZWQgZm9yIGV4aXRzP1xuICAgIGVkZ2VzOiAnbnZvdicsXG4gICAgZXhpdHM6IFt0b3BFZGdlKCldLFxuICAgIC8vIFRPRE8gLSBlZGdlXG4gIH0pO1xuICByZWFkb25seSByaXZlcldFX3dvb2RlbkJyaWRnZSA9ICQoe1xuICAgIGlkOiAweDE3LFxuICAgIGljb246IGljb25g4pWQXG4gICAgICB8ICAgfFxuICAgICAgfOKVkOKVkeKVkHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdvcm9yJyxcbiAgICBleGl0czogW3NlYW1sZXNzVmVydGljYWwoMHg3NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCb3VuZGFyeUVfd2F0ZXJmYWxsID0gJCh7XG4gICAgaWQ6IDB4MTgsXG4gICAgaWNvbjogaWNvbmDilaFcbiAgICAgIHwg4paQ4paIfFxuICAgICAgfOKVkOKVkC98XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJzxyPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlFX2NhdmUgPSAkKHtcbiAgICBpZDogMHgxOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpDiloh8XG4gICAgICB8duKIqeKWiHxcbiAgICAgIHx24paQ4paIfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge30sXG4gICAgICAgICAgICAgICBncmFzczoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzXX0sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRMb25nR3Jhc3NdfX0sXG4gICAgZWRnZXM6ICc8bzwgJyxcbiAgICBleGl0czogW2NhdmUoMHg1OCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFdfc291dGh3ZXN0ID0gJCh7XG4gICAgaWQ6IDB4MWEsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWgCDiloR8XG4gICAgICB84paE4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX0sXG4gICAgICAgICAgICAgICAvLyBTZWEgaGFzIG5vIG5lZWQgZm9yIHRoaXMgc2NyZWVuPyAgR28gdG8gc29tZSBvdGhlciBiZWFjaD9cbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYVJvY2tzXX19LFxuICAgIC8vIE5PVEU6IHRoZSBlZGdlIGlzIG5vdCAnbicgYmVjYXVzZSBpdCdzIG9mZi1jZW50ZXIuXG4gICAgZWRnZXM6ICc+KiBeJyxcbiAgICBleGl0czogW2xlZnRFZGdlKDB4YildLFxuICB9KTtcbiAgcmVhZG9ubHkgbmFkYXJlID0gJCh7XG4gICAgaWQ6IDB4MWIsXG4gICAgLy9pY29uOiAnPycsXG4gICAgLy9taWdyYXRlZDogMHgyMDAwLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBkb29yKDB4MjMpLCBkb29yKDB4MjUpLCBkb29yKDB4MmEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd25FeGl0VyA9ICQoe1xuICAgIGlkOiAweDFjLFxuICAgIGljb246IGljb25g4pW0XG4gICAgICB84paI4paMIHxcbiAgICAgIHziloAgXnxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICc+bj5vJyxcbiAgICBleGl0czogW2xlZnRFZGdlKDgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NTID0gJCh7XG4gICAgaWQ6IDB4MWQsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfDs7O3xcbiAgICAgIHwgdiB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlJpdmVyU2hvcnRHcmFzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NSZW1hcHBpbmddfX0sXG4gICAgZWRnZXM6ICdzb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd25FeGl0UyA9ICQoe1xuICAgIGlkOiAweDFlLFxuICAgIGljb246IGljb25g4pW3XG4gICAgICB8IF4gfFxuICAgICAgfOKWhCDiloR8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2NrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkRlc2VydFRvd25FbnRyYW5jZV19fSxcbiAgICBlZGdlczogJ29ebl4nLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW5HYXRlID0gJCh7XG4gICAgaWQ6IDB4MWYsXG4gICAgLy9pY29uOiAnPycsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7fX0sXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSgzKSwgcmlnaHRFZGdlKDkpXSxcbiAgfSk7IFxuXG4gIHJlYWRvbmx5IHJpdmVyQnJhbmNoTlNFID0gJCh7XG4gICAgaWQ6IDB4MjAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHwg4pWg4pWQfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAncm9ycicsXG4gIH0pO1xuICByZWFkb25seSByaXZlcldFID0gJCh7XG4gICAgaWQ6IDB4MjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pWQ4pWQ4pWQfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ29yb3InLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCb3VuZGFyeVNfd2F0ZXJmYWxsID0gJCh7XG4gICAgaWQ6IDB4MjIsXG4gICAgaWNvbjogaWNvbmDilahcbiAgICAgIHwg4pWRIHxcbiAgICAgIHziloTilZHiloR8XG4gICAgICB84paIL+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3JeIF4nLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hvcnRHcmFzc1NFID0gJCh7XG4gICAgaWQ6IDB4MjMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHw7Ozt8XG4gICAgICB8OyAgfFxuICAgICAgfDsgXnxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICBlZGdlczogJ3Nzb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hvcnRHcmFzc05FID0gJCh7XG4gICAgaWQ6IDB4MjQsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfDsgIHxcbiAgICAgIHw7diB8XG4gICAgICB8Ozs7fGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIGVkZ2VzOiAnb3NzbycsXG4gIH0pO1xuICByZWFkb25seSBzdG9tSG91c2VPdXRzaWRlID0gJCh7XG4gICAgaWQ6IDB4MjUsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paM4oip4paQfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgLy8gTk9URTogYm90dG9tIGVkZ2UgZW50cmFuY2UgaXMgY2xldmVybHkgc2hpZnRlZCB0byBhbGlnbiB3aXRoIHRoZSBkb29yLlxuICAgIGV4aXRzOiBbZG9vcigweDY4KSwgYm90dG9tRWRnZSh7c2hpZnQ6IDAuNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmROV190cmVlcyA9ICQoe1xuICAgIGlkOiAweDI2LFxuICAgIGljb246IGljb25g4paYXG4gICAgICB84paI4paMIHxcbiAgICAgIHziloAgXnxcbiAgICAgIHwgXl58YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRUcmVlc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5TZWFUcmVlc119fSxcbiAgICBlZGdlczogJz52b28nLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hvcnRHcmFzc1NXID0gJCh7XG4gICAgaWQ6IDB4MjcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHw7Ozt8XG4gICAgICB8ICA7fFxuICAgICAgfF4gO3xgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5SaXZlclNob3J0R3Jhc3NdfX0sXG4gICAgZWRnZXM6ICdzb29zJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQnJhbmNoTldTID0gJCh7XG4gICAgaWQ6IDB4MjgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHzilZDilaMgfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAncnJybycsXG4gIH0pO1xuICByZWFkb25seSBzaG9ydEdyYXNzTlcgPSAkKHtcbiAgICBpZDogMHgyOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgO3xcbiAgICAgIHwgdjt8XG4gICAgICB8Ozs7fGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlJpdmVyU2hvcnRHcmFzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NSZW1hcHBpbmddfX0sXG4gICAgZWRnZXM6ICdvb3NzJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHZhbGxleUJyaWRnZSA9ICQoe1xuICAgIGlkOiAweDJhLFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHzilpvilZHilpx8XG4gICAgICB8IOKVkSB8XG4gICAgICB84paZ4pWR4paffGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICduIG4gJyxcbiAgICBleGl0czogW3NlYW1sZXNzVmVydGljYWwoMHg3NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFNfY2F2ZSA9ICQoe1xuICAgIGlkOiAweDJiLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWjCDilpB8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge30sXG4gICAgICAgICAgICAgICAvLyBOb3QgcGFydGljdWxhcmx5IHVzZWZ1bCBzaW5jZSBubyBjb25uZWN0b3Igb24gc291dGggZW5kP1xuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnICBuICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NjcpLCBib3R0b21FZGdlKCldXG4gIH0pO1xuICByZWFkb25seSBvdXRzaWRlV2luZG1pbGwgPSAkKHtcbiAgICBpZDogMHgyYyxcbiAgICBpY29uOiBpY29uYOKVs1xuICAgICAgfOKWiOKWiOKVs3xcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICAvLyBUT0RPIC0gYW5ub3RhdGUgMyBleGl0cywgc3Bhd24gZm9yIHdpbmRtaWxsIGJsYWRlXG4gICAgZmVhdHVyZTogWyd3aW5kbWlsbCddLFxuICAgIGVkZ2VzOiAnICBuICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NjMpLCBib3R0b21FZGdlKCksIGRvb3IoMHg4OSksIGRvb3IoMHg4YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93bkV4aXRXX2NhdmUgPSAkKHsgLy8gb3V0c2lkZSBsZWFmIChUT0RPIC0gY29uc2lkZXIganVzdCBkZWxldGluZz8pXG4gICAgaWQ6IDB4MmQsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paE4paE4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSwgLy8gY2F2ZSBlbnRyYW5jZSBicmVha3Mgcml2ZXIgYW5kIG90aGVycy4uLlxuICAgIGVkZ2VzOiAnIG4gICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NGEpLCBsZWZ0RWRnZSg1KV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlck5TID0gJCh7XG4gICAgaWQ6IDB4MmUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHwg4pWRIHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3Jvcm8nLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJOU19icmlkZ2UgPSAkKHtcbiAgICBpZDogMHgyZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilZEgfFxuICAgICAgfHfilY93fFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdyb3JvJyxcbiAgICB3YWxsOiAweDc3LFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCZW5kV1MgPSAkKHtcbiAgICBpZDogMHgzMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCB34pacfFxuICAgICAgfOKVkOKVl3d8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICc8cnJ2JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5Tl93YXRlcmZhbGxDYXZlID0gJCh7XG4gICAgaWQ6IDB4MzEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilpvilZHiloh8XG4gICAgICB84paY4pWR4paAfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIC8vIFRPRE8gLSBmbGFnIHZlcnNpb24gd2l0aG91dCBlbnRyYW5jZT9cbiAgICAvLyAgLSB3aWxsIG5lZWQgYSB0aWxlc2V0IGZpeFxuICAgIGVkZ2VzOiAnIHZydicsXG4gICAgZXhpdHM6IFt3YXRlcmZhbGxDYXZlKDB4NzUpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9wZW5fdHJlZXMgPSAkKHtcbiAgICBpZDogMHgzMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCBeIHxcbiAgICAgIHxeIF58XG4gICAgICB8IF4gfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFRyZWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguRGVzZXJ0Um9ja3NdfX0sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXRTID0gJCh7XG4gICAgaWQ6IDB4MzMsXG4gICAgaWNvbjogaWNvbmDilbdcbiAgICAgIHwgdyB8XG4gICAgICB84paEIOKWhHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIC8vIE5PVEU6IFRoZXNlIGZpeGVzIGFyZSBub3QgbGlrZWx5IHRvIGV2ZXIgbGFuZC5cbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydE1hcnNoXX0sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFNYXJzaF19fSxcbiAgICBlZGdlczogJ29ebl4nLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmROVyA9ICQoe1xuICAgIGlkOiAweDM0LFxuICAgIGljb246IGljb25g4paYXG4gICAgICB84paI4paMIHxcbiAgICAgIHziloDiloAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPnZvbycsXG4gIH0pO1xuICByZWFkb25seSBiZW5kTkUgPSAkKHtcbiAgICBpZDogMHgzNSxcbiAgICBpY29uOiBpY29uYOKWnVxuICAgICAgfCDilpDiloh8XG4gICAgICB8ICDiloB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc8b292JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmRTRSA9ICQoe1xuICAgIGlkOiAweDM2LFxuICAgIGljb246IGljb25g4paXXG4gICAgICB8ICAgfFxuICAgICAgfCDiloTiloR8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnb288XicsXG4gIH0pO1xuICByZWFkb25seSBiZW5kV1MgPSAkKHtcbiAgICBpZDogMHgzNyxcbiAgICBpY29uOiBpY29uYOKWllxuICAgICAgfCAgIHxcbiAgICAgIHziloTiloQgfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJ29ePm8nLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJQbGFpbiA9ICQoe1xuICAgIGlkOiAweDM4LFxuICAgIGljb246IGljb25g4pS0XG4gICAgICB8IOKUiiB8XG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJ3N0IHQnLFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSBwb3NzaWJsZSBzdGFpcndheSB3LyBmbGFnP1xuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJSb2JvdERvb3JfZG93blN0YWlyID0gJCh7XG4gICAgaWQ6IDB4MzksXG4gICAgaWNvbjogaWNvbmDilKxcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilIDilKzilIB8XG4gICAgICB8IOKUiiB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgdHN0JyxcbiAgICAvLyBUT0RPIC0gY29ubmVjdGlvbnNcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyRHluYURvb3IgPSAkKHtcbiAgICBpZDogMHgzYSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUlOKUrOKUmHxcbiAgICAgIHwg4pSKIHxgLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgcyAnLFxuICAgIC8vIFRPRE8gLSBjb25uZWN0aW9uc1xuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJMb25nU3RhaXJzID0gJCh7XG4gICAgaWQ6IDB4M2IsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSKIHxcbiAgICAgIHwg4pSKIHxcbiAgICAgIHwg4pSKIHxgLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJ3MgcyAnLFxuICAgIC8vIFRPRE8gLSBjb25uZWN0aW9uc1xuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJNZXNpYVJvb20gPSAkKHtcbiAgICBpZDogMHgzYyxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgLy8gVE9ETyAtIGNvbm5lY3Rpb25zIChOT1RFOiB1c2VzIGJvdHRvbUVkZ2VIb3VzZSlcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyVGVsZXBvcnRlciA9ICQoe1xuICAgIGlkOiAweDNkLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICAvLyBUT0RPIC0gY29ubmVjdGlvbnMgKE5PVEU6IHVzZXMgYm90dG9tRWRnZUhvdXNlKVxuICB9KTtcbiAgcmVhZG9ubHkgY2F2ZUFib3ZlUG9ydG9hID0gJCh7XG4gICAgaWQ6IDB4M2UsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgMSAnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDY2KV0sXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJORV9mbG93ZXJzID0gJCh7XG4gICAgaWQ6IDB4M2YsXG4gICAgaWNvbjogaWNvbmDilpxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paAKuKWiHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIC8vIE5PVEU6IGNvdWxkIGV4dGVuZCB0aGlzIHRvIGRlc2VydC9ldGMgYnkgc3dhcHBpbmcgdGhlIDdlLzdmIHRpbGVzXG4gICAgLy8gd2l0aCBlLmcuIGEgd2luZG1pbGwgb3IgY2FzdGxlIHRpbGUgdGhhdCdzIG5vdCB1c2VkIGluIDljLCBidXRcbiAgICAvLyB3ZSBzdGlsbCBkb24ndCBoYXZlIGEgZ29vZCBzcHJpdGUgdG8gdXNlIGZvciBpdC4uLlxuICAgIGVkZ2VzOiAnIHY8ICcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlckVkZ2UgPSAkKHtcbiAgICBpZDogMHg0MCxcbiAgICBpY29uOiBpY29uYCB8XG4gICAgICB8ICAgfFxuICAgICAgfOKUpCDilJx8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnIHQgdCcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlckVkZ2VXID0gJCh7XG4gICAgaWQ6IDB4NDAsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfCAgIHxcbiAgICAgIHzilKQgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgdCAgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyRWRnZUUgPSAkKHtcbiAgICBpZDogMHg0MCxcbiAgICBpY29uOiBpY29uYCB8XG4gICAgICB8ICAgfFxuICAgICAgfCAg4pScfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgIHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJSb2JvdERvb3IgPSAkKHtcbiAgICBpZDogMHg0MSxcbiAgICBpY29uOiBpY29uYOKUgFxuICAgICAgfCBPIHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnIHQgdCcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlckRvb3IgPSAkKHtcbiAgICBpZDogMHg0MixcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgdCB0JyxcbiAgICBleGl0czogW2NhdmUoMHg2OCldLFxuICAgIC8vIFRPRE8gLSBjb25uZWN0aW9uc1xuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfYmVkcm9vbSA9ICQoe1xuICAgIGlkOiAweDQzLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNoZWQgPSAkKHtcbiAgICBpZDogMHg0NCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICAvLyBUT0RPIC0gc2VwYXJhdGUgbWV0YXNjcmVlbiBmb3Igc2hlZFdpdGhIaWRkZW5Eb29yXG4gIHJlYWRvbmx5IHRhdmVybiA9ICQoe1xuICAgIGlkOiAweDQ1LFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvdXNlX3R3b0JlZHMgPSAkKHtcbiAgICBpZDogMHg0NixcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSB0aHJvbmVSb29tX2FtYXpvbmVzID0gJCh7XG4gICAgaWQ6IDB4NDcsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIC8vIFRPRE8gLSBuZWVkIHRvIGZpeCB0aGUgc2luZ2xlLXdpZHRoIHN0YWlyIVxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHt3aWR0aDogM30pLCBkb3duU3RhaXIoMHg0YywgMSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfcnVpbmVkVXBzdGFpcnMgPSAkKHtcbiAgICBpZDogMHg0OCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgZG93blN0YWlyKDB4OWMsIDEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvdXNlX3J1aW5lZERvd25zdGFpcnMgPSAkKHtcbiAgICBpZDogMHg0OSxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NTYsIDEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGZveWVyID0gJCh7XG4gICAgaWQ6IDB4NGEsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGRvb3IoMHgyOCksIGRvb3IoMHg1MyksIGRvb3IoMHg1YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgdGhyb25lUm9vbV9wb3J0b2EgPSAkKHtcbiAgICBpZDogMHg0YixcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgZG9vcigweDJiKV0sXG4gIH0pO1xuICByZWFkb25seSBmb3J0dW5lVGVsbGVyID0gJCh7XG4gICAgaWQ6IDB4NGMsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGRvb3IoMHg1NiksIGRvb3IoMHg1OSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmFja1Jvb20gPSAkKHtcbiAgICBpZDogMHg0ZCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzdG9tSG91c2VEb2pvID0gJCh7XG4gICAgaWQ6IDB4NGUsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIC8vIEVkZ2UgZW50cmFuY2Ugc2hpZnRlZCB0byBwcm9wZXJseSBsaW5lIHVwIGF0IHN0YXJ0IG9mIGZpZ2h0LlxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHtzaGlmdDogLTAuNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpbmRtaWxsSW5zaWRlID0gJCh7XG4gICAgaWQ6IDB4NGYsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHtsZWZ0OiA5LCB3aWR0aDogMX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvcml6b250YWxUb3duTWlkZGxlID0gJCh7XG4gICAgLy8gYnJ5bm1hZXIgKyBzd2FuIChUT0RPIC0gc3BsaXQgc28gd2UgY2FuIG1vdmUgZXhpdHMpXG4gICAgaWQ6IDB4NTAsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7fX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NGMpLCBkb29yKDB4NTUpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyeW5tYWVyUmlnaHRfZXhpdEUgPSAkKHtcbiAgICAvLyBicnlubWFlclxuICAgIGlkOiAweDUxLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKDgpLCBkb29yKDB4NDEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyeW5tYWVyTGVmdF9kZWFkRW5kID0gJCh7XG4gICAgLy8gYnJ5bm1hZXJcbiAgICBpZDogMHg1MixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnaG9yaXpvbnRhbCd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg0OSksIGRvb3IoMHg0YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbkxlZnRfZXhpdFcgPSAkKHtcbiAgICAvLyBzd2FuXG4gICAgaWQ6IDB4NTMsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSg5KSwgZG9vcigweDQ5KSwgZG9vcigweDVlKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FuUmlnaHRfZXhpdFMgPSAkKHtcbiAgICAvLyBzd2FuXG4gICAgaWQ6IDB4NTQsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiAzfSksIGRvb3IoMHg0MSksIGRvb3IoMHg0MyksIGRvb3IoMHg1NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG9yaXpvbnRhbFRvd25MZWZ0X2V4aXROID0gJCh7XG4gICAgLy8gc2FoYXJhLCBhbWF6b25lcyAoVE9ETyAtIHNwbGl0IHNvIHdlIGNhbiBtb3ZlIGV4aXRzKVxuICAgIGlkOiAweDU1LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbdG9wRWRnZSgweGQpLCBkb29yKDB4NDYpLCBkb29yKDB4NGIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGFtYXpvbmVzUmlnaHRfZGVhZEVuZCA9ICQoe1xuICAgIC8vIGFtYXpvbmVzXG4gICAgaWQ6IDB4NTYsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NDApLCBkb29yKDB4NTgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNhaGFyYVJpZ2h0X2V4aXRFID0gJCh7XG4gICAgLy8gc2FoYXJhXG4gICAgaWQ6IDB4NTcsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2UoNyksIGRvb3IoMHg0MCksIGRvb3IoMHg2NildLFxuICB9KTtcbiAgcmVhZG9ubHkgcG9ydG9hTlcgPSAkKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1OCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbY2F2ZSgweDQ3LCAnZm9ydHJlc3MnKSwgYm90dG9tRWRnZSgpXSwgLy8gYm90dG9tIGp1c3QgaW4gY2FzZT9cbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYU5FID0gJCh7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NTksXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg2MyksIGRvb3IoMHg4YSksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDMsIHdpZHRoOiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgcG9ydG9hU1dfZXhpdFcgPSAkKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1YSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbbGVmdEVkZ2UoOSksIGRvb3IoMHg4NiksIHRvcEVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FTRV9leGl0RSA9ICQoe1xuICAgIC8vIHBvcnRvYVxuICAgIGlkOiAweDViLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2UoOSksIGRvb3IoMHg3YSksIGRvb3IoMHg4NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZHluYSA9ICQoe1xuICAgIGlkOiAweDVjLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYUZpc2hlcm1hbiA9ICQoe1xuICAgIC8vIHBvcnRvYVxuICAgIGlkOiAweDVkLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2UoNiksIGxlZnRFZGdlKDQsIDYpLCBkb29yKDB4NjgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHZlcnRpY2FsVG93blRvcF9mb3J0cmVzcyA9ICQoe1xuICAgIC8vIHNoeXJvbiwgem9tYmllIHRvd24gKHByb2JhYmx5IG5vdCB3b3J0aCBzcGxpdHRpbmcgdGhpcyBvbmUpXG4gICAgaWQ6IDB4NWUsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbY2F2ZSgweDQ3KSwgYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNoeXJvbk1pZGRsZSA9ICQoe1xuICAgIC8vIHNoeXJvblxuICAgIGlkOiAweDVmLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICd2ZXJ0aWNhbCd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg1NCksIGRvb3IoMHg1YiksIHRvcEVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzaHlyb25Cb3R0b21fZXhpdFMgPSAkKHtcbiAgICAvLyBzaHlyb25cbiAgICBpZDogMHg2MCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiAzfSksIGRvb3IoMHgwNCksIGRvb3IoMHgwNiksIGRvb3IoMHg5OSldLFxuICB9KTtcbiAgcmVhZG9ubHkgem9tYmllVG93bk1pZGRsZSA9ICQoe1xuICAgIC8vIHpvbWJpZSB0b3duXG4gICAgaWQ6IDB4NjEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDk5KSwgdG9wRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHpvbWJpZVRvd25Cb3R0b21fY2F2ZUV4aXQgPSAkKHtcbiAgICAvLyB6b21iaWUgdG93blxuICAgIGlkOiAweDYyLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICd2ZXJ0aWNhbCd9fSxcbiAgICBleGl0czogW2NhdmUoMHg5MiksIGRvb3IoMHgyMyksIGRvb3IoMHg0ZCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbGVhZk5XX2hvdXNlU2hlZCA9ICQoe1xuICAgIC8vIGxlYWZcbiAgICBpZDogMHg2MyxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDhjKSwgZG9vcigweDk1KV0sXG4gIH0pO1xuICByZWFkb25seSBzcXVhcmVUb3duTkVfaG91c2UgPSAkKHtcbiAgICAvLyBsZWFmLCBnb2EgKFRPRE8gLSBzcGxpdClcbiAgICBpZDogMHg2NCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbdG9wRWRnZSgxKSwgZG9vcigweGI3KV0sXG4gIH0pO1xuICByZWFkb25seSBsZWFmU1dfc2hvcHMgPSAkKHtcbiAgICAvLyBsZWFmXG4gICAgaWQ6IDB4NjUsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg3NyksIGRvb3IoMHg4YSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbGVhZlNFX2V4aXRFID0gJCh7XG4gICAgLy8gbGVhZlxuICAgIGlkOiAweDY2LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2UoMyksIGRvb3IoMHg4NCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hTldfdGF2ZXJuID0gJCh7XG4gICAgLy8gZ29hXG4gICAgaWQ6IDB4NjcsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHhiYSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3F1YXJlVG93blNXX2V4aXRTID0gJCh7XG4gICAgLy8gZ29hLCBqb2VsIChUT0RPIC0gc3BsaXQpXG4gICAgaWQ6IDB4NjgsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDh9KSwgZG9vcigweDg0KV0sXG4gIH0pO1xuICByZWFkb25seSBnb2FTRV9zaG9wID0gJCh7XG4gICAgLy8gZ29hXG4gICAgaWQ6IDB4NjksXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg4MildLFxuICB9KTtcbiAgcmVhZG9ubHkgam9lbE5FX3Nob3AgPSAkKHtcbiAgICAvLyBqb2VsXG4gICAgaWQ6IDB4NmEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg0NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgam9lbFNFX2xha2UgPSAkKHtcbiAgICAvLyBqb2VsXG4gICAgaWQ6IDB4NmIsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9ha05XID0gJCh7XG4gICAgLy8gb2FrXG4gICAgaWQ6IDB4NmMsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHhlNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2FrTkUgPSAkKHtcbiAgICAvLyBvYWtcbiAgICBpZDogMHg2ZCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDYwKV0sXG4gIH0pO1xuICByZWFkb25seSBvYWtTVyA9ICQoe1xuICAgIC8vIG9ha1xuICAgIGlkOiAweDZlLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4N2MpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9ha1NFID0gJCh7XG4gICAgLy8gb2FrXG4gICAgaWQ6IDB4NmYsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICAvLyBFZGdlIGVudHJhbmNlIHNoaWZ0ZWQgZm9yIGNoaWxkIGFuaW1hdGlvblxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogMCwgc2hpZnQ6IDAuNX0pLCBkb29yKDB4OTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRlbXBsZSA9ICQoe1xuICAgIC8vIHNoeXJvblxuICAgIGlkOiAweDcwLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVEZWFkRW5kTiA9ICQoe1xuICAgIGlkOiAweDcxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8ID4gfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ3cgICAnLFxuICAgIGNvbm5lY3Q6ICcyJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweGM3KV0sXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlRGVhZEVuZE4gPSAkKHtcbiAgICBpZDogMHg3MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKVteKUg+KVtXxcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3cgICAnLFxuICAgIGNvbm5lY3Q6ICcxfDJ8MycsXG4gICAgZXhpdHM6IFtkb3duU3RhaXIoMHhjNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxOUyA9ICQoe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOUyA9ICQoe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHzilILilIPilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzE5fDJhfDNiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfYmxvY2tlZFJpZ2h0ID0gJCh7XG4gICAgaWQ6IDB4NzIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilIPilIJ8XG4gICAgICB84pSC4pSDIHxcbiAgICAgIHzilILilIPilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsTlMsIDAsIDAsIDB4OWQpXV0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTl8MmF8M3xiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfYmxvY2tlZExlZnQgPSAkKHtcbiAgICBpZDogMHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHwg4pSD4pSCfFxuICAgICAgfOKUguKUg+KUgnxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOUywgMCwgMSwgMHg1MSldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxfDl8MmF8M2InLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUFyZW5hID0gJCh7XG4gICAgaWQ6IDB4NzMsXG4gICAgaWNvbjogaWNvbmA8XG4gICAgICB84pW7POKVu3xcbiAgICAgIHzilKHilIHilKl8XG4gICAgICB84pSC4pW74pSCfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICd3KncqJyxcbiAgICBhbGxvd2VkOiBzID0+IHMuaGFzRmVhdHVyZSgnZW1wdHknKSA/IFsxLCAzXSA6IFtdLFxuICAgIGNvbm5lY3Q6ICc5YnxhJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHgyNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbGltZVRyZWVMYWtlID0gJCh7XG4gICAgaWQ6IDB4NzQsXG4gICAgdGlsZXNldHM6IHt9LCAvLyBzZWEgb3IgbW91bnRhaW4gKDk0KSAtIGJ1dCBub3QgcmVhbGx5XG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgY2F2ZSgweDQ3KV0sXG4gICAgLy8gVE9ETyAtIGJyaWRnZVxuICB9KTtcbiAgLy8gU3dhbXAgc2NyZWVuc1xuICByZWFkb25seSBzd2FtcE5XID0gJCh7XG4gICAgaWQ6IDB4NzUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilJggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICAvLyBUT0RPIC0gZG8gd2UgYWN0dWFsbHkgd2FudCB0byBwdXQgYWxsIHRoZXNlIGVkZ2VzIGluP1xuICAgIGVkZ2VzOiAnc3MgICcsXG4gICAgY29ubmVjdDogJzI2JyxcbiAgICBleGl0czogW3RvcEVkZ2UoNiwgNCksIGxlZnRFZGdlKDcsIDMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wRSA9ICQoe1xuICAgIGlkOiAweDc2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbbilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGVkZ2VzOiAnICAgcycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wRV9kb29yID0gJCh7XG4gICAgaWQ6IDB4NzYsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHwg4pW24pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZsYWc6ICdhbHdheXMnLFxuICAgIGVkZ2VzOiAnICAgcycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDZjLCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5XU0UgPSAkKHtcbiAgICBpZDogMHg3NyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUvOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBlZGdlczogJ3Nzc3MnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgICBleGl0czogW3RvcEVkZ2UoNiwgNCksXG4gICAgICAgICAgICBsZWZ0RWRnZSg3LCAzKSxcbiAgICAgICAgICAgIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICByaWdodEVkZ2UoNywgMyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBOV1MgPSAkKHtcbiAgICBpZDogMHg3OCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUpCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZWRnZXM6ICdzc3MgJyxcbiAgICBjb25uZWN0OiAnMjZhJyxcbiAgICBleGl0czogW3RvcEVkZ2UoNiwgNCksIGxlZnRFZGdlKDcsIDMpLCBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTkUgPSAkKHtcbiAgICBpZDogMHg3OSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGVkZ2VzOiAncyAgcycsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBleGl0czogW3RvcEVkZ2UoNiwgNCksIHJpZ2h0RWRnZSg3LCAzKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdTRSA9ICQoe1xuICAgIGlkOiAweDdhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBlZGdlczogJyBzc3MnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2UoNywgMyksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksIHJpZ2h0RWRnZSg3LCAzKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdTRV9kb29yID0gJCh7XG4gICAgaWQ6IDB4N2EsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipICB8XG4gICAgICB84pSA4pSs4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlN3YW1wRG9vcnNdfX0sXG4gICAgZmxhZzogJ2Fsd2F5cycsXG4gICAgZWRnZXM6ICcgc3NzJyxcbiAgICBjb25uZWN0OiAnNmFlJyxcbiAgICAvLyBOT1RFOiBkb29yIHNjcmVlbnMgc2hvdWxkIG5vdCBiZSBvbiBhbiBleGl0IGVkZ2UhXG4gICAgZXhpdHM6IFtjYXZlKDB4NjYsICdzd2FtcCcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wVyA9ICQoe1xuICAgIGlkOiAweDdiLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKVtCB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGVkZ2VzOiAnIHMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIC8vIFRPRE8gLSBmbGFnZ2FibGVcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wV19kb29yID0gJCh7XG4gICAgaWQ6IDB4N2IsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilIDilbQgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZsYWc6ICdhbHdheXMnLFxuICAgIGVkZ2VzOiAnIHMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDY0LCAnc3dhbXAnKV0sXG4gICAgLy8gVE9ETyAtIGZsYWdnYWJsZVxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBBcmVuYSA9ICQoe1xuICAgIGlkOiAweDdjLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUl+KUr+KUm3xcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICcgKnMqJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgLy8gRm9yIGxlZnQvcmlnaHQgbmVpZ2hib3JzLCBvbmx5IGFsbG93IGVkZ2Ugb3IgZW1wdHkuXG4gICAgLy8gVE9ETyAtIGNoZWNrIHRoYXQgdGhpcyBpcyBzdGlsbCB0aGUgY2FzZS5cbiAgICBhbGxvd2VkOiBzID0+IHMuaGFzRmVhdHVyZSgnZW1wdHknKSA/IFsxLCAzXSA6IFtdLFxuICAgIC8vIE5PVEU6IG5vIGVkZ2UgZXhpdCBzaW5jZSB3ZSBkb24ndCB3YW50IHRvIGdvIHN0cmFpZ2h0IGhlcmUuLi5cbiAgICAvLyBUT0RPIC0gY29uc3RyYWludCB0aGF0IHdlIHB1dCBzb2xpZHMgb24gZWl0aGVyIHNpZGU/XG4gICAgLy8gVE9ETyAtIHVuZG8gdGhlIGF0dGVtcHQgdG8gYWxsb3cgdGhpcyBub3Qgb24gdGhlIHJpZ2h0IGVkZ2UsXG4gICAgLy8gICAgICAgIG1heWJlIG1ha2UgYSBmZXcgY3VzdG9tIGNvbWJpbmF0aW9ucz8gKGlzIGl0IHN0aWxsIGJyb2tlbj8pXG4gICAgLy8gICAgICAgIC0tPiBsb29rcyBsaWtlIHdlIGRpZCBmaXggdGhhdCBlYXJsaWVyIHNvbWVob3c/ICBtYXliZSBieSBtb3ZpbmdcbiAgICAvLyAgICAgICAgICAgIHRoZSB3aG9sZSBzY3JlZW4gYSBjb2x1bW4gb3Zlciwgb3IgZWxzZSBieSBjaGFuZ2luZyB0aGUgdGlsZXM/XG4gICAgLy8gVE9ETyAtIE5PVEUgU1dBTVAgR1JBUEhJQ1MgU1RJTEwgQlJPS0VOISFcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTldFID0gJCh7XG4gICAgaWQ6IDB4N2QsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGVkZ2VzOiAnc3MgcycsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKDYsIDQpLCBsZWZ0RWRnZSg3LCAzKSwgcmlnaHRFZGdlKDcsIDMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wU1cgPSAkKHtcbiAgICBpZDogMHg3ZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilJAgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlN3YW1wRG9vcnNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5Td2FtcERvb3JzLCAocywgc2VlZCwgcm9tKSA9PiB7XG4gICAgICByb20ubWV0YXNjcmVlbnMuc3dhbXBTV19kb29yLmZsYWcgPSAnYWx3YXlzJztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1dXSxcbiAgICBlZGdlczogJyBzcyAnLFxuICAgIGNvbm5lY3Q6ICc2YScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSg3LCAzKSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFNXX2Rvb3IgPSAkKHtcbiAgICBpZDogMHg3ZSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUkCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZWRnZXM6ICcgc3MgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDY3LCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEVtcHR5ID0gJCh7XG4gICAgaWQ6IDB4N2YsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBjb25uZWN0OiAnJyxcbiAgfSk7XG4gIC8vIE1pc3Npbmcgc3dhbXAgc2NyZWVuc1xuICByZWFkb25seSBzd2FtcE4gPSAkKHtcbiAgICBpZDogfjB4NzAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pW1IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZWRnZXM6ICdzICAgJyxcbiAgICBjb25uZWN0OiAnMicsXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFMgPSAkKHtcbiAgICBpZDogfjB4NzEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKVtyB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZWRnZXM6ICcgIHMgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5TID0gJCh7XG4gICAgaWQ6IH4weDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZWRnZXM6ICdzIHMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSg2LCA0KSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdFID0gJCh7XG4gICAgaWQ6IH4weDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZWRnZXM6ICcgcyBzJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2UoNywgMyksIHJpZ2h0RWRnZSg3LCAzKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdFX2Rvb3IgPSAkKHtcbiAgICBpZDogfjB4NzIsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlN3YW1wRG9vcnNdfX0sXG4gICAgZmxhZzogJ2Fsd2F5cycsXG4gICAgZWRnZXM6ICcgcyBzJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDY2KV0sXG4gICAgLy8gVE9ETyAtIGhvdyB0byBsaW5rIHRvIHN3YW1wV0UgdG8gaW5kaWNhdGUgZmxhZz1mYWxzZT9cbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wU0UgPSAkKHtcbiAgICBpZDogfjB4NzMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKUjOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBlZGdlczogJyAgc3MnLFxuICAgIGNvbm5lY3Q6ICdhZScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSg3LCAzKSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFNFX2Rvb3IgPSAkKHtcbiAgICBpZDogfjB4NzMsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlN3YW1wRG9vcnNdfX0sXG4gICAgZmxhZzogJ2Fsd2F5cycsXG4gICAgZWRnZXM6ICcgIHNzJyxcbiAgICBjb25uZWN0OiAnYWUnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDZhLCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5TRSA9ICQoe1xuICAgIGlkOiB+MHg3NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZWRnZXM6ICdzIHNzJyxcbiAgICBjb25uZWN0OiAnMmFlJyxcbiAgICBleGl0czogW3RvcEVkZ2UoNiwgNCksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksIHJpZ2h0RWRnZSg3LCAzKV0sXG4gIH0pO1xuICAvLyBDYXZlIHNjcmVlbnNcbiAgcmVhZG9ubHkgY2F2ZUVtcHR5ID0gJCh7XG4gICAgaWQ6IDB4ODAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOUyA9ICQoe1xuICAgIGlkOiAweDgxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIHBvaTogW1s0XV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsV0UgPSAkKHtcbiAgICBpZDogMHg4MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBwb2k6IFtbNF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFNFID0gJCh7XG4gICAgaWQ6IDB4ODMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKUjOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyAgY2MnLFxuICAgIGNvbm5lY3Q6ICdhZScsXG4gICAgcG9pOiBbWzJdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXUyA9ICQoe1xuICAgIGlkOiAweDg0LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUkCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgY2MgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsTkUgPSAkKHtcbiAgICBpZDogMHg4NSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyAgYycsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5XID0gJCh7XG4gICAgaWQ6IDB4ODYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilJggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2NjICAnLFxuICAgIGNvbm5lY3Q6ICcyNicsXG4gICAgcG9pOiBbWzJdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5TRSA9ICQoe1xuICAgIGlkOiAweDg3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUnOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgY2MnLFxuICAgIGNvbm5lY3Q6ICcyYWUnLFxuICAgIHBvaTogW1szXV0sXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV1NFID0gJCh7XG4gICAgaWQ6IDB4ODgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjY2NjJyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XUyA9ICQoe1xuICAgIGlkOiAweDg5LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pSkIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2NjYyAnLFxuICAgIGNvbm5lY3Q6ICcyNmEnLFxuICAgIHBvaTogW1szXV0sXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hXU0UgPSAkKHtcbiAgICBpZDogMHg4YSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilKzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgY2NjJyxcbiAgICBjb25uZWN0OiAnNmFlJyxcbiAgICBwb2k6IFtbM11dLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldFID0gJCh7XG4gICAgaWQ6IDB4OGIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnY2MgYycsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOU19zdGFpcnMgPSAkKHtcbiAgICBpZDogMHg4YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIsgfFxuICAgICAgfCDilIsgfFxuICAgICAgfCDilIsgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnc3RhaXJzJ10sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFNOX292ZXJCcmlkZ2UgPSAkKHtcbiAgICBpZDogMHg4ZCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilb0gfFxuICAgICAgfOKUgOKUg+KUgHxcbiAgICAgIHwg4pW/IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ292ZXJCcmlkZ2UnXSxcbiAgICBlZGdlczogJ2NiY2InLCAvLyBUT0RPIC0gJ2InIGZvciBvdGhlciBzaWRlIG9mIGJyaWRnZT8/XG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXRV91bmRlckJyaWRnZSA9ICQoe1xuICAgIGlkOiAweDhlLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVvSB8XG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfCDilb8gfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsndW5kZXJCcmlkZ2UnXSxcbiAgICBlZGdlczogJ2JjYmMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfd2FsbCA9ICQoe1xuICAgIGlkOiAweDhmLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUhiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBmZWF0dXJlOiBbJ3dhbGwnXSxcbiAgICAvLyBUT0RPIC0gY2FuIHdlIGp1c3QgZGV0ZWN0IHRoZSBjb25uZWN0aW9ucz9cbiAgICAvLyAgICAgIC0gZm9yIGVhY2ggdGlsZXNldCwgbWFwIDEuLmYgdG8gdmFyaW91cyBlZGdlIHBvcz9cbiAgICAvLyAgICAgIC0gZS5nLiBjYXZlOiAweDAyID0gMSwgMHgwOCA9IDIsIDB4MGMgPSAzLFxuICAgIC8vICAgICAgICAgICAgICAgICAgIDB4MjAgPSA1LCAweDgwID0gNiwgMHhjMCA9IDcsIC4uLlxuICAgIC8vICAgICAgICBuZWVkIHRvIGJlIFdBTEtBQkxFXG4gICAgLy8gICAgICAgIG1heSBuZWVkIHRvIHJlZXZhbHVhdGUgZWFjaCBzY3JlZW4gZm9yIGVhY2ggdGlsZXNldC4uLlxuICAgIC8vICAgICAgICBhbmQgbmVlZCB0byB3YWl0IHVudGlsIHRoZSBzY3JlZW4gaXMgQlVJTFQhXG4gICAgY29ubmVjdDogJzI9YScsIC8vIHdhbGwgd2lsbCBhbHdheXMgY29ubmVjdCB0aGUgZmlyc3QgdHdvP1xuICAgIHdhbGw6IDB4ODcsIFxuICAgIC8vIFRPRE8gLSByZWNvcmQgdGhlIHdhbGxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXRV93YWxsID0gJCh7XG4gICAgaWQ6IDB4OTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSE4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dhbGwnXSxcbiAgICBlZGdlczogJyBjIGMnLFxuICAgIGNvbm5lY3Q6ICc2PWUnLFxuICAgIHdhbGw6IDB4NjcsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfYXJlbmEgPSAkKHtcbiAgICBpZDogMHg5MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUuOKUkHxcbiAgICAgIHzilIIm4pSCfFxuICAgICAgfOKUlOKUrOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICduKmMqJywgLy8gJ24nIGZvciAnbmFycm93J1xuICAgIGFsbG93ZWQ6IHMgPT4gcy5oYXNGZWF0dXJlKCdlbXB0eScpID8gWzEsIDNdIDogW10sXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgMHg3OF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX2FyZW5hV2FsbCA9ICQoe1xuICAgIGlkOiAweDkyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSE4pSQfFxuICAgICAgfOKUgibilIJ8XG4gICAgICB84pSU4pSs4pSYfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnLCAnd2FsbCddLFxuICAgIGVkZ2VzOiAnbipjKicsXG4gICAgYWxsb3dlZDogcyA9PiBzLmhhc0ZlYXR1cmUoJ2VtcHR5JykgPyBbMSwgM10gOiBbXSxcbiAgICBjb25uZWN0OiAnMj1hJyxcbiAgICB3YWxsOiAweDI3LFxuICAgIHBvaTogW1sxLCAweDYwLCAweDc4XV0sXG4gIH0pO1xuICAvLyBOT1RFOiBzY3JlZW4gOTMgaXMgbWlzc2luZyFcbiAgcmVhZG9ubHkgYnJhbmNoTldFX3dhbGwgPSAkKHtcbiAgICBpZDogMHg5NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjYyBjJyxcbiAgICBjb25uZWN0OiAnMj02ZScsXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV0VfdXBTdGFpciA9ICQoe1xuICAgIGlkOiAweDk1LFxuICAgIGljb246IGljb25gPFxuICAgICAgfCA8IHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHg0NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdfdXBTdGFpciA9ICQoe1xuICAgIGlkOiAweDk2LFxuICAgIGljb246IGljb25gPFxuICAgICAgfCA8IHxcbiAgICAgIHzilIDilJggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyBjICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW3VwU3RhaXIoMHg0MildLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdfZG93blN0YWlyID0gJCh7XG4gICAgaWQ6IDB4OTcsXG4gICAgaWNvbjogaWNvbmA+XG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUkCB8XG4gICAgICB8ID4gfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4YTIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRFX3VwU3RhaXIgPSAkKHtcbiAgICBpZDogMHg5OCxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHwgPCB8XG4gICAgICB8IOKUlOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgICBjJyxcbiAgICBjb25uZWN0OiAnZScsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NGMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRFX2Rvd25TdGFpciA9ICQoe1xuICAgIGlkOiAweDk5LFxuICAgIGljb246IGljb25gPlxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCA+IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyAgIGMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweGFjKV0sXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlNfc3RhaXJzID0gJCh7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfFxuICAgICAgfCA8IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyfGEnLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4MTcpLCB1cFN0YWlyKDB4ZDcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROX3N0YWlycyA9ICQoe1xuICAgIGlkOiAweDlhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ID4gfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjICAgJyxcbiAgICBjb25uZWN0OiAnMicsXG4gICAgZXhpdHM6IFtkb3duU3RhaXIoMHgxNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFNfc3RhaXJzID0gJCh7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCA8IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyAgYyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHhkNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZE5TID0gJCh7XG4gICAgaWQ6IDB4OWIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pW1IHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKVtyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMnxhJyxcbiAgICBwb2k6IFtbMCwgMHgxMTAsIDB4NzhdLCBbMCwgLTB4MzAsIDB4NzhdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROID0gJCh7XG4gICAgaWQ6IDB4OWIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pW1IHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgc2VhOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIHBvaTogW1swLCAtMHgzMCwgMHg3OF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFMgPSAkKHtcbiAgICBpZDogMHg5YixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKVtyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgIGMgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgcG9pOiBbWzAsIDB4MTEwLCAweDc4XV0sXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kV0UgPSAkKHtcbiAgICBpZDogMHg5YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilbQg4pW2fFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyBjIGMnLFxuICAgIGNvbm5lY3Q6ICc2fGUnLFxuICAgIHBvaTogW1swLCAweDcwLCAweDEwOF0sIFswLCAweDcwLCAtMHgyOF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFcgPSAkKHtcbiAgICBpZDogMHg5YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilbQgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBzZWE6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgYyAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgcG9pOiBbWzAsIDB4NzAsIC0weDI4XV0sXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kRSA9ICQoe1xuICAgIGlkOiAweDljLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAg4pW2fFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyAgIGMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBwb2k6IFtbMCwgMHg3MCwgMHgxMDhdXSxcbiAgfSk7XG4gIC8vIE5PVEU6IDlkIG1pc3NpbmdcbiAgcmVhZG9ubHkgaGFsbE5TX2VudHJhbmNlID0gJCh7XG4gICAgaWQ6IDB4OWUsXG4gICAgaWNvbjogaWNvbmDilb1cbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pW9IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIHNlYToge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgbiAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgY2hhbm5lbEV4aXRTRSA9ICQoe1xuICAgIGlkOiAweDlmLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilZTilZB8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgLy9lZGdlczogJyAgcnInLFxuICAgIC8vY29ubmVjdDogJzlkOmJmJywgIC8vIDogbWVhbnMgd2F0ZXIgLSBmbGlnaHQgbmVlZGVkXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsQmVuZFdTID0gJCh7XG4gICAgaWQ6IDB4YTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHziloggIHxcbiAgICAgIHzilZDilZcgfFxuICAgICAgfOKWiOKVkSB8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgLy9lZGdlczogJyByciAnLFxuICB9KTtcbiAgcmVhZG9ubHkgY2hhbm5lbEhhbGxOUyA9ICQoe1xuICAgIGlkOiAweGExLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB8IOKVoOKUiHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxFbnRyYW5jZVNFID0gJCh7XG4gICAgaWQ6IDB4YTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKVlOKUiHxcbiAgICAgIHzilbfilZEgfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIC8vIE5PVEU6IFRoaXMgd291bGQgQUxNT1NUIHdvcmsgYXMgYSBjb25uZWN0aW9uIHRvIHRoZVxuICAgIC8vIG5vcm1hbCByaXZlciBjYXZlIHRpbGVzLCBidXQgdGhlIHJpdmVyIGlzIG9uZSB0aWxlXG4gICAgLy8gdGFsbGVyIGF0IHRoZSB0b3AsIHNvIHRoZXJlJ3Mgbm8gbWF0Y2ghXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsQ3Jvc3MgPSAkKHtcbiAgICBpZDogMHhhMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilZEgfFxuICAgICAgfOKVkOKVrOKVkHxcbiAgICAgIHzilbfilZHilbd8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRG9vciA9ICQoe1xuICAgIGlkOiAweGE0LFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqeKWiHxcbiAgICAgIHzilIjilZDilZB8XG4gICAgICB8ICDiloh8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkZsb2F0aW5nSXNsYW5kID0gJCh7XG4gICAgaWQ6IDB4YTUsXG4gICAgaWNvbjogaWNvbmAqXG4gICAgICB84pWQ4pWX4paIfFxuICAgICAgfCrilZEgfFxuICAgICAgfOKVkOKVo+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnICB3cCcsICAvLyB3ID0gd2F0ZXJmYWxsLCBwID0gcGF0aFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aE5FX3N0YWlyID0gJCh7XG4gICAgaWQ6IDB4YTYsXG4gICAgaWNvbjogaWNvbmDilJRcbiAgICAgIHzilojilIviloh8XG4gICAgICB84paIICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ2wgIHAnLCAgLy8gbCA9IGxhZGRlciAoc3RhaXJzKVxuICAgIGNvbm5lY3Q6ICcyZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKCldLCAvLyBuZXZlciB1c2VkIGFzIGFuIGV4aXQgaW4gdmFuaWxsYVxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5CcmFuY2hOV0UgPSAkKHtcbiAgICBpZDogMHhhNyxcbiAgICBpY29uOiBpY29uYOKUtFxuICAgICAgfOKWiCDiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdwcCBwJyxcbiAgICBjb25uZWN0OiAnMjZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX2ljZUJyaWRnZSA9ICQoe1xuICAgIGlkOiAweGE4LFxuICAgIGljb246IGljb25g4pWrXG4gICAgICB84paI4pWR4paIfFxuICAgICAgfCDilIYgfFxuICAgICAgfOKWiOKVkeKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW5SaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICd3cHdwJyxcbiAgICBhbGxvd2VkOiBzID0+IHMuaGFzRmVhdHVyZSgnZW1wdHknKSA/IFsyXSA6IFtdLFxuICAgIGNvbm5lY3Q6ICc2LWU6MmEnLFxuICAgIHdhbGw6IDB4ODcsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhTRSA9ICQoe1xuICAgIGlkOiAweGE5LFxuICAgIGljb246IGljb25g4pSMXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnICBwcCcsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluRGVhZEVuZFdfY2F2ZUVtcHR5ID0gJCh7XG4gICAgaWQ6IDB4YWEsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paQIOKWkHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHAgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDVhKV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhORSA9ICQoe1xuICAgIGlkOiAweGFiLFxuICAgIGljb246IGljb25g4pSUXG4gICAgICB84paIIOKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAncCAgcCcsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluQnJhbmNoV1NFID0gJCh7XG4gICAgaWQ6IDB4YWMsXG4gICAgaWNvbjogaWNvbmDilKxcbiAgICAgIHzilojilojiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHBwcCcsXG4gICAgY29ubmVjdDogJzZhZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXX2NhdmUgPSAkKHtcbiAgICBpZDogMHhhZCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHwgIOKWkHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHAgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU1KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhFX3Nsb3BlUyA9ICQoe1xuICAgIGlkOiAweGFlLFxuICAgIGljb246IGljb25g4pWTXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJyAgc3AnLCAvLyBzID0gc2xvcGVcbiAgICBjb25uZWN0OiAnYWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoTlcgPSAkKHtcbiAgICBpZDogMHhhZixcbiAgICBpY29uOiBpY29uYOKUmFxuICAgICAgfOKWiCDiloh8XG4gICAgICB8ICDiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3BwICAnLFxuICAgIGNvbm5lY3Q6ICcyNicsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkNhdmVfZW1wdHkgPSAkKHtcbiAgICBpZDogMHhiMCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHzilowg4paQfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBjb25uZWN0OiAnJyxcbiAgICBleGl0czogW2NhdmUoMHg1OCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoRV9jYXZlID0gJCh7XG4gICAgaWQ6IDB4YjEsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paIICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgIHAnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2NhdmUoMHg1NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0Vfc2xvcGVOID0gJCh7XG4gICAgaWQ6IDB4YjIsXG4gICAgaWNvbjogaWNvbmDilahcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3NwIHAnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5EZWFkRW5kVyA9ICQoe1xuICAgIGlkOiAweGIzLFxuICAgIGljb246IGljb25g4pW0XG4gICAgICB84paI4paI4paIfFxuICAgICAgfCAg4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgcCAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRSA9ICQoe1xuICAgIGlkOiAweGI0LFxuICAgIGljb246IGljb25g4pSAXG4gICAgICB84paI4paI4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHAgcCcsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluQXJlbmFfZ2F0ZSA9ICQoe1xuICAgIGlkOiAweGI1LFxuICAgIGljb246IGljb25gI1xuICAgICAgfOKWiCPiloh8XG4gICAgICB84paMIOKWkHxcbiAgICAgIHzilojilIviloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJyAqbConLFxuICAgIGFsbG93ZWQ6IHMgPT4gcy5oYXNGZWF0dXJlKCdlbXB0eScpID8gWzEsIDNdIDogW10sXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGV4aXRzOiBbey4uLnVwU3RhaXIoMHgzNywgMyksIHR5cGU6ICdjYXZlJ31dLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoTl9zbG9wZVNfY2F2ZSA9ICQoe1xuICAgIGlkOiAweGI2LFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4pSL4oipfFxuICAgICAgfOKWjCAgfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ2wgcyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWEpLCB0b3BFZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0Vfc2xvcGVOUyA9ICQoe1xuICAgIGlkOiAweGI3LFxuICAgIGljb246IGljb25g4pWrXG4gICAgICB84paI4oaT4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICdzcHNwJyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9zbG9wZU5fY2F2ZSA9ICQoe1xuICAgIGlkOiAweGI4LFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oaT4oipfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICdzcCBwJyxcbiAgICBjb25uZWN0OiAnMjZlJyxcbiAgICBleGl0czogW2NhdmUoMHg1YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV1MgPSAkKHtcbiAgICBpZDogMHhiOSxcbiAgICBpY29uOiBpY29uYOKUkFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHwgIOKWiHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwcCAnLFxuICAgIGNvbm5lY3Q6ICc2YScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblNsb3BlID0gJCh7XG4gICAgaWQ6IDB4YmEsXG4gICAgaWNvbjogaWNvbmDihpNcbiAgICAgIHzilojihpPiloh8XG4gICAgICB84paI4oaT4paIfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3MgcyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblJpdmVyID0gJCh7XG4gICAgaWQ6IDB4YmEsXG4gICAgaWNvbjogaWNvbmDilZFcbiAgICAgIHzilojilZHiloh8XG4gICAgICB84paI4pWR4paIfFxuICAgICAgfOKWiOKVkeKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgYWxsb3dlZDogcyA9PiBzLmhhc0ZlYXR1cmUoJ2VtcHR5JykgPyBbMl0gOiBbXSxcbiAgICBjb25uZWN0OiAnMjplJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aEVfZ2F0ZSA9ICQoe1xuICAgIGlkOiAweGJiLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJyAgIHAnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2NhdmUoMHg1NywgJ2dhdGUnKV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9pbm4gPSAkKHtcbiAgICBpZDogMHhiYyxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHwgICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnIHAgcCcsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBleGl0czogW2Rvb3IoMHg3NildLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0VfYnJpZGdlT3ZlclNsb3BlID0gJCh7XG4gICAgaWQ6IDB4YmQsXG4gICAgaWNvbjogaWNvbmDilZBcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8IOKVkCB8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnc3BzcCcsXG4gICAgY29ubmVjdDogJzZlJywgLy8gJzJhfDZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX2JyaWRnZU92ZXJSaXZlciA9ICQoe1xuICAgIGlkOiAweGJkLFxuICAgIGljb246IGljb25g4pWQXG4gICAgICB84paI4pWR4paIfFxuICAgICAgfCDilZAgfFxuICAgICAgfOKWiOKVkeKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnd3B3cCcsXG4gICAgYWxsb3dlZDogcyA9PiBzLmhhc0ZlYXR1cmUoJ2VtcHR5JykgPyBbMl0gOiBbXSxcbiAgICBjb25uZWN0OiAnNmV8MnxhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluU2xvcGVfdW5kZXJCcmlkZ2UgPSAkKHtcbiAgICBpZDogMHhiZSxcbiAgICBpY29uOiBpY29uYOKGk1xuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHwg4pWQIHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgLy8gVE9ETyAtIGNvdWxkIGZseSB1bmRlciBicmlkZ2Ugb24gbW91bnRhaW5SaXZlclxuICAgIGVkZ2VzOiAnc3BzcCcsXG4gICAgY29ubmVjdDogJzJhJywgLy8gJzJhfDZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluRW1wdHkgPSAkKHtcbiAgICBpZDogMHhiZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5UyA9ICQoe1xuICAgIGlkOiAweGMwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKWhOKWhOKWhHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICAvLyBUT0RPIC0gZ3Jhc3Mvcml2ZXIgc2hvdWxkIG1heWJlIHVzZSByb2NrcyBpbnN0ZWFkP1xuICAgIGVkZ2VzOiAnb14gXicsIC8vIG8gPSBvcGVuLCBeID0gb3BlbiB1cFxuICAgIC8vY29ubmVjdDogJzI2ZScsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeU5fY2F2ZSA9ICQoe1xuICAgIGlkOiAweGMxLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWgOKIqeKWgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fSxcbiAgICAgICAgICAgICAgIHJpdmVyOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnIHZvdicsIC8vIG8gPSBvcGVuLCB2ID0gb3BlbiBkb3duXG4gICAgZXhpdHM6IFtjYXZlKDB4NDkpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5U0VfY2F2ZSA9ICQoe1xuICAgIGlkOiAweGMyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHziloTiiKniloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc8XiAgJyxcbiAgICBleGl0czogW2NhdmUoMHg1YSldLFxuICB9KTtcbiAgcmVhZG9ubHkgd2F0ZXJmYWxsID0gJCh7XG4gICAgaWQ6IDB4YzMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84oaT4oaT4oaTfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdoaXJscG9vbEJsb2NrZXIgPSAkKHtcbiAgICBpZDogMHhjNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilbPiloh8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICAvLyBUT0RPIC0gaW5kaWNhdGUgZmxhZ1xuICAgIGZlYXR1cmU6IFsnd2hpcmxwb29sJ10sXG4gICAgZmxhZzogJ2NhbG0nLCAvLyBjYWxtZWQgc2VhXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlYWNoRXhpdE4gPSAkKHtcbiAgICBpZDogMHhjNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiCDiloh8XG4gICAgICB84paI4pWx4paAfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnbiA+dicsIC8vIG4gPSBcIm5hcnJvd1wiXG4gICAgZXhpdHM6IFt0b3BFZGdlKDB4YSwgMSldLFxuICB9KTtcbiAgcmVhZG9ubHkgd2hpcmxwb29sT3BlbiA9ICQoe1xuICAgIGlkOiAweGM2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbMgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aGlybHBvb2wnXSxcbiAgICBlZGdlczogJ29vb28nLFxuICAgIGZsYWc6ICdjYWxtJywgLy8gYnV0IG9ubHkgaWYgb24gYW5ncnkgc2VhIC0gbm90IGRlc2VydC4uLlxuICB9KTtcbiAgcmVhZG9ubHkgbGlnaHRob3VzZUVudHJhbmNlID0gJCh7XG4gICAgaWQ6IDB4YzcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilpfilp/iloh8XG4gICAgICB84paQ4oip4pabfFxuICAgICAgfOKWneKWgOKWmHxgLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgLy8gVE9ETyAtIGluZGljYXRlIHVuaXF1ZW5lc3M/XG4gICAgZmVhdHVyZTogWydsaWdodGhvdXNlJ10sXG4gICAgZWRnZXM6ICc8b292JyxcbiAgICBleGl0czogW2NhdmUoMHgyYSksIGRvb3IoMHg3NSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVhY2hDYXZlID0gJCh7XG4gICAgaWQ6IDB4YzgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paA4pWy4paIfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZWRnZXM6ICcgdm92JyxcbiAgICBleGl0czogW2NhdmUoMHgyOCldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVhY2hDYWJpbkVudHJhbmNlID0gJCh7XG4gICAgaWQ6IDB4YzksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4oip4paIfFxuICAgICAgfCDilbLiloB8XG4gICAgICB84paI4paE4paEfGAsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NhYmluJ10sXG4gICAgZWRnZXM6ICc8XiBiJywgLy8gYiA9IFwiYm9hdFwiXG4gICAgZXhpdHM6IFtkb29yKDB4NTUpLCByaWdodEVkZ2UoOCwgMyldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2NlYW5TaHJpbmUgPSAkKHtcbiAgICBpZDogMHhjYSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWl+KWhOKWlnxcbiAgICAgIHzilpAq4paMfFxuICAgICAgfOKWnSDilph8YCxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIC8vIFRPRE8gLSBpbmRpY2F0ZSB1bmlxdWVuZXNzP1xuICAgIGZlYXR1cmU6IFsnYWx0YXInXSxcbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgcHlyYW1pZEVudHJhbmNlID0gJCh7XG4gICAgaWQ6IDB4Y2IsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paEIHxcbiAgICAgIHzilp/iiKnilpl8XG4gICAgICB8IOKVsyB8YCxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge319LFxuICAgIC8vIFRPRE8gLSBpbmRpY2F0ZSB1bmlxdWVuZXNzP1xuICAgIGZlYXR1cmU6IFsncHlyYW1pZCddLFxuICAgIGVkZ2VzOiAnb29vbycsXG4gICAgZXhpdHM6IFtjYXZlKDB4YTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0RW50cmFuY2UgPSAkKHtcbiAgICBpZDogMHhjYyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbMgfFxuICAgICAgfOKWkD7ilox8XG4gICAgICB84pad4paA4paYfGAsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NyeXB0J10sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweDY3KV0sXG4gIH0pO1xuICByZWFkb25seSBvYXNpc0xha2UgPSAkKHtcbiAgICBpZDogMHhjZCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCBeIHxcbiAgICAgIHx2T3Z8XG4gICAgICB8IHZ2fGAsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2xha2UnXSxcbiAgICBlZGdlczogJ29vM28nLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVzZXJ0Q2F2ZUVudHJhbmNlID0gJCh7XG4gICAgaWQ6IDB4Y2UsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilpfiloTilpZ8XG4gICAgICB84pac4oip4pabfFxuICAgICAgfCDilbMgfGAsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgLy8gVE9ETyAtIHByb2JhYmx5IG5lZWQgdG8gcHVsbCB0aGlzIG91dCBzaW5jZSBmbGFncyBkaWZmZXJcbiAgICAgICAgICAgICAgIC8vIFRPRE8gLSB3ZSBjb3VsZCBhbHNvIG1ha2UgdGhpcyB3b3JrYWJsZSBpbiByaXZlciBpZiB3ZSB3YW50XG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFDYXZlRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgICBleGl0czogW2NhdmUoMHhhNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2FzaXNDYXZlID0gJCh7XG4gICAgaWQ6IDB4Y2YsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgdnZ8XG4gICAgICB84paE4oipdnxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzNePm8nLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDQ3KV0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRW5kV19jYXZlID0gJCh7XG4gICAgaWQ6IDB4ZDAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiiKl8XG4gICAgICB84pWQ4pWQIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gIH0pO1xuICByZWFkb25seSBib2F0Q2hhbm5lbCA9ICQoe1xuICAgIGlkOiAweGQxLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWgOKWgOKWgHxcbiAgICAgIHziloTiloTiloR8YCxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnIGIgYicsXG4gICAgZXhpdHM6IFtyaWdodEVkZ2UoOCwgMyksIGxlZnRFZGdlKDgsIDMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxXRSA9ICQoe1xuICAgIGlkOiAweGQyLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOV1NFID0gJCh7XG4gICAgaWQ6IDB4ZDMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilZHilJR8XG4gICAgICB84pWQ4pWs4pWQfFxuICAgICAgfOKUrOKUh+KUrHxgLFxuICAgICAgLy8gfOKWmOKVkeKWnXxcbiAgICAgIC8vIHzilZDilazilZB8XG4gICAgICAvLyB84paW4pSG4paXfGAsXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIHVzaW5nIHNvbGlkcyBmb3IgdGhlIGNvcm5lcnMgaW5zdGVhZD9cbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdycnJyJyxcbiAgICBjb25uZWN0OiAnMTU6M2Q6NzktYWYnLFxuICAgIHdhbGw6IDB4YjYsXG4gICAgcG9pOiBbWzQsIDB4MDAsIDB4OThdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TID0gJCh7XG4gICAgaWQ6IDB4ZDQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgICAgLy8gfOKWjOKVkeKWkHxcbiAgICAgIC8vIHzilozilZHilpB8XG4gICAgICAvLyB84paM4pWR4paQfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxOTozYScsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRSA9ICQoe1xuICAgIGlkOiAweGQ1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnIHIgcicsXG4gICAgY29ubmVjdDogJzVkOjdmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TX2JyaWRnZSA9ICQoe1xuICAgIGlkOiAweGQ2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUnOKUh+KUpHxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdyIHIgJyxcbiAgICBjb25uZWN0OiAnMTktM2EnLFxuICAgIHdhbGw6IDB4ODcsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRV9icmlkZ2UgPSAkKHtcbiAgICBpZDogMHhkNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHzilZDilIXilZB8XG4gICAgICB84pSA4pS04pSAfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnIHIgcicsXG4gICAgY29ubmVjdDogJzVkLTdmJyxcbiAgICB3YWxsOiAweDg2LFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlU0UgPSAkKHtcbiAgICBpZDogMHhkOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUgHxcbiAgICAgIHzilILilZTilZB8XG4gICAgICB84pSC4pWR4pSMfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJyAgcnInLFxuICAgIGNvbm5lY3Q6ICc5ZDphZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXUyA9ICQoe1xuICAgIGlkOiAweGQ5LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSQfFxuICAgICAgfOKVkOKVl+KUgnxcbiAgICAgIHzilJDilZHilIJ8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnIHJyICcsXG4gICAgY29ubmVjdDogJzVhOjc5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5FID0gJCh7XG4gICAgaWQ6IDB4ZGEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilJR8XG4gICAgICB84pSC4pWa4pWQfFxuICAgICAgfOKUlOKUgOKUgHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICdyICByJyxcbiAgICBjb25uZWN0OiAnMWY6M2QnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlcgPSAkKHtcbiAgICBpZDogMHhkYixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKVkeKUgnxcbiAgICAgIHzilZDilZ3ilIJ8XG4gICAgICB84pSA4pSA4pSYfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3JyICAnLFxuICAgIGNvbm5lY3Q6ICcxNTozNycsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRV9wYXNzYWdlTiA9ICQoe1xuICAgIGlkOiAweGRjLFxuICAgIGljb246IGljb25g4pWnXG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnY3IgcicsXG4gICAgY29ubmVjdDogJzI1ZDo3ZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRV9wYXNzYWdlUyA9ICQoe1xuICAgIGlkOiAweGRkLFxuICAgIGljb246IGljb25g4pWkXG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilIDilKzilIB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnIHJjcicsXG4gICAgY29ubmVjdDogJzVkOjdhZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19wYXNzYWdlVyA9ICQoe1xuICAgIGlkOiAweGRlLFxuICAgIGljb246IGljb25g4pWiXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUpOKVkeKUgnxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAncmNyICcsXG4gICAgY29ubmVjdDogJzE2OTozYicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19wYXNzYWdlRSA9ICQoe1xuICAgIGlkOiAweGRmLFxuICAgIGljb246IGljb25g4pWfXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUguKVkeKUnHxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnciByYycsXG4gICAgY29ubmVjdDogJzE5OjNiZScsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5FID0gJCh7XG4gICAgaWQ6IDB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwg4pSX4pSBfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ3cgIHcnLFxuICAgIGNvbm5lY3Q6ICcyZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5FID0gJCh7XG4gICAgaWQ6IDB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilIPilJR8XG4gICAgICB84pSC4pSX4pSBfFxuICAgICAgfOKUlOKUgOKUgHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3ICB3JyxcbiAgICBjb25uZWN0OiAnMWZ8MmV8M2QnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxORV9ibG9ja2VkTGVmdCA9ICQoe1xuICAgIGlkOiAweGUwLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSUfFxuICAgICAgfCDilJfilIF8XG4gICAgICB84pSU4pSA4pSAfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c119fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbE5FLCAxLCAwLCAweDYxKV1dLFxuICAgIGVkZ2VzOiAndyAgdycsXG4gICAgY29ubmVjdDogJzF8ZnwyZXwzZCcsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5FX2Jsb2NrZWRSaWdodCA9ICQoe1xuICAgIGlkOiAweGUwLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSDIHxcbiAgICAgIHzilILilJfilIF8XG4gICAgICB84pSU4pSA4pSAfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c119fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbE5FLCAxLCAxLCAweDBkKV1dLFxuICAgIGVkZ2VzOiAndyAgdycsXG4gICAgY29ubmVjdDogJzFmfDJlfDN8ZCcsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5XID0gJCh7XG4gICAgaWQ6IDB4ZTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHzilIHilJsgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ3d3ICAnLFxuICAgIGNvbm5lY3Q6ICcyNicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XID0gJCh7XG4gICAgaWQ6IDB4ZTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilIPilIJ8XG4gICAgICB84pSB4pSb4pSCfFxuICAgICAgfOKUgOKUgOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOV19ibG9ja2VkUmlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLTEsIDAsIDB4NmQpXV0sXG4gICAgZmxhZzogJ2Fsd2F5cycsXG4gICAgZWRnZXM6ICd3dyAgJyxcbiAgICBjb25uZWN0OiAnMTV8MjZ8MzcnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV19ibG9ja2VkUmlnaHQgPSAkKHtcbiAgICBpZDogMHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKUg+KUgnxcbiAgICAgIHzilIHilJsgfFxuICAgICAgfOKUgOKUgOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3dyAgJyxcbiAgICBjb25uZWN0OiAnMTV8MjZ8M3w3JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldfYmxvY2tlZExlZnQgPSAkKHtcbiAgICBpZDogMHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIPilIJ8XG4gICAgICB84pSB4pSb4pSCfFxuICAgICAgfOKUgOKUgOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOV19ibG9ja2VkUmlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiwgMSwgMHgwMSwgMHg2ZCldXSxcbiAgICBlZGdlczogJ3d3ICAnLFxuICAgIGNvbm5lY3Q6ICcxfDV8MjZ8MzcnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxTRSA9ICQoe1xuICAgIGlkOiAweGUyLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilI/ilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgIHd3JyxcbiAgICBjb25uZWN0OiAnYWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxTRSA9ICQoe1xuICAgIGlkOiAweGUyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSAfFxuICAgICAgfOKUguKUj+KUgXxcbiAgICAgIHzilILilIPilIx8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnICB3dycsXG4gICAgY29ubmVjdDogJzlkfGFlfGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsU0VfYmxvY2tlZExlZnQgPSAkKHtcbiAgICBpZDogMHhlMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUgHxcbiAgICAgIHwg4pSP4pSBfFxuICAgICAgfOKUguKUg+KUjHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxTRSwgMywgMCwgMHg2MSldXSxcbiAgICBlZGdlczogJyAgd3cnLFxuICAgIGNvbm5lY3Q6ICc5fGR8YWV8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxTRV9ibG9ja2VkUmlnaHQgPSAkKHtcbiAgICBpZDogMHhlMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUgHxcbiAgICAgIHzilILilI/ilIF8XG4gICAgICB84pSC4pSDIHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxTRSwgMywgMSwgMHhkZCldXSxcbiAgICBlZGdlczogJyAgd3cnLFxuICAgIGNvbm5lY3Q6ICc5ZHxhZXxifGYnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxXUyA9ICQoe1xuICAgIGlkOiAweGUzLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgeKUkyB8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXUyA9ICQoe1xuICAgIGlkOiAweGUzLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSQfFxuICAgICAgfOKUgeKUk+KUgnxcbiAgICAgIHzilJDilIPilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsV1NfYmxvY2tlZFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0xLCAwLCAweDlkKV1dLFxuICAgIGZsYWc6ICdhbHdheXMnLFxuICAgIGVkZ2VzOiAnIHd3ICcsXG4gICAgY29ubmVjdDogJzVifDZhfDc5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1NfYmxvY2tlZFJpZ2h0ID0gJCh7XG4gICAgaWQ6IDB4ZTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilJB8XG4gICAgICB84pSB4pSTIHxcbiAgICAgIHzilJDilIPilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnIHd3ICcsXG4gICAgY29ubmVjdDogJzV8Ynw2YXw3OScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFdTX2Jsb2NrZWRMZWZ0ID0gJCh7XG4gICAgaWQ6IDB4ZTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilJB8XG4gICAgICB84pSB4pST4pSCfFxuICAgICAgfCDilIPilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsV1NfYmxvY2tlZFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQsIDAsIDB4ZDEsIDB4OWQpXV0sXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNWJ8NmF8N3w5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfc3RhaXJzID0gJCh7XG4gICAgaWQ6IDB4ZTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJzilKjilIJ8XG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUoOKUpHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTIzOWFiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfc3RhaXJzQmxvY2tlZDEzID0gJCh7XG4gICAgaWQ6IDB4ZTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJTilKjilIJ8XG4gICAgICB84pW34pSD4pW1fFxuICAgICAgfOKUguKUoOKUkHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOU19zdGFpcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNSwgMCwgWzB4NDEsIDB4OGRdKV1dLFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzEyYWJ8M3w5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfc3RhaXJzQmxvY2tlZDI0ID0gJCh7XG4gICAgaWQ6IDB4ZTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilKjilIJ8XG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUoOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOU19zdGFpcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNSwgMSwgWzB4MDEsIDB4Y2RdKV1dLFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzF8MjM5YXxiJyxcbiAgfSk7XG4gIC8vIFRPRE8gLSBjdXN0b20gaW52ZXJ0ZWQgdmVyc2lvbiBvZiBlNCB3aXRoIHRoZSB0b3Agc3RhaXIgb24gdGhlIHJpZ2h0XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlNfZGVhZEVuZHMgPSAkKHtcbiAgICBpZDogMHhlNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbkgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW7IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcyfGEnLFxuICB9KTtcbiAgLy8gVE9ETyAtIGFkZCBvbmUtd2F5IHZpZXdzIG9mIHRoaXM/IT9cbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19kZWFkRW5kID0gJCh7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilbnilIJ8XG4gICAgICB84pSc4pSA4pSkfFxuICAgICAgfOKUguKVu+KUgnxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTM5YnwyfGEnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19kZWFkRW5kQmxvY2tlZDI0ID0gJCh7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilbXilbnilIJ8XG4gICAgICB84pSM4pSA4pSYfFxuICAgICAgfOKUguKVu+KVt3xgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOU19kZWFkRW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDYsIDAsIFsweDYxLCAweGFkXSldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxfDJ8Mzl8YXxiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfZGVhZEVuZEJsb2NrZWQxMyA9ICQoe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pW54pW1fFxuICAgICAgfOKUlOKUgOKUkHxcbiAgICAgIHzilbfilbvilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsTlNfZGVhZEVuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA2LCAxLCBbMHg2ZCwgMHhhMV0pXV0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMWJ8MnwzfDl8YScsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5XU0UgPSAkKHtcbiAgICBpZDogMHhlNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHwg4pSDIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ3d3d3cnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldTRSA9ICQoe1xuICAgIGlkOiAweGU2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSD4pSUfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHzilJDilIPilIx8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnd3d3dycsXG4gICAgY29ubmVjdDogJzI2YWV8MTV8M2R8Nzl8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV1NFX2Jsb2NrZWQxMyA9ICQoe1xuICAgIGlkOiAweGU2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSDIHxcbiAgICAgIHzilIHilYvilIF8XG4gICAgICB8IOKUg+KUjHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOV1NFLCA3LCAwLCBbMHgwZCwgMHhkMV0pXV0sXG4gICAgZWRnZXM6ICd3d3d3JyxcbiAgICBjb25uZWN0OiAnMjZhZXwxNXwzfGR8N3w5fGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldTRV9ibG9ja2VkMjQgPSAkKHtcbiAgICBpZDogMHhlNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIPilJR8XG4gICAgICB84pSB4pWL4pSBfFxuICAgICAgfOKUkOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsTldTRSwgNywgMSwgWzB4MDEsIDB4ZGRdKV1dLFxuICAgIGVkZ2VzOiAnd3d3dycsXG4gICAgY29ubmVjdDogJzI2YWV8MXw1fDNkfDc5fGJ8ZicsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5XRSA9ICQoe1xuICAgIGlkOiAweGU3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB84pSB4pS74pSBfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ3d3IHcnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV0UgPSAkKHtcbiAgICBpZDogMHhlNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKUg+KUlHxcbiAgICAgIHzilIHilLvilIF8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3d3IHcnLFxuICAgIGNvbm5lY3Q6ICcyNmV8MTV8M2R8N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV0VfYmxvY2tlZFRvcCA9ICQoe1xuICAgIGlkOiAweGU3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB84pSB4pS74pSBfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOV0UsIC0xLCAwLCBbMHgwMSwgMHgwZF0pXV0sXG4gICAgZWRnZXM6ICd3dyB3JyxcbiAgICBjb25uZWN0OiAnMjZlfDF8NXwzfGR8N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxXU0UgPSAkKHtcbiAgICBpZDogMHhlOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIHilLPilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgd3d3JyxcbiAgICBjb25uZWN0OiAnNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1NFID0gJCh7XG4gICAgaWQ6IDB4ZTgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pSB4pSz4pSBfFxuICAgICAgfOKUkOKUg+KUjHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICcgd3d3JyxcbiAgICBjb25uZWN0OiAnNmFlfDVkfDc5fGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1NFX2Jsb2NrZWRCb3R0b20gPSAkKHtcbiAgICBpZDogMHhlOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilIHilLPilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsV1NFLCAtMSwgMCwgWzB4ZDEsIDB4ZGRdKV1dLFxuICAgIGVkZ2VzOiAnIHd3dycsXG4gICAgY29ubmVjdDogJzZhZXw1ZHw3fDl8YnxmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlNfd2FsbFRvcCA9ICQoe1xuICAgIGlkOiAweGU5LCAgICAvLyBOT1RFOiB0aGUgcGFzc2FnZSBuYXJyb3dzIGF0IHRoZSB0b3BcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfCDilIMgfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyB3JyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSg2LCA0KV0sXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX3dhbGxUb3AgPSAkKHtcbiAgICBpZDogMHhlOSwgICAgLy8gTk9URTogdGhlIHBhc3NhZ2UgbmFycm93cyBhdCB0aGUgdG9wXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSGIHxcbiAgICAgIHzilbfilIPilbd8XG4gICAgICB84pSC4pSD4pSCfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ2MgdyAnLFxuICAgIGNvbm5lY3Q6ICcyYXw5fGInLFxuICAgIGV4aXRzOiBbdG9wRWRnZSg2LCA0KV0sXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbFdFID0gJCh7XG4gICAgaWQ6IDB4ZWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSB4pSB4pSBfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyB3IHcnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFdFID0gJCh7XG4gICAgaWQ6IDB4ZWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pSB4pSB4pSBfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICcgdyB3JyxcbiAgICBjb25uZWN0OiAnNWR8NmV8N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgcGl0V0UgPSAkKHtcbiAgICBpZDogMHhlYixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilbPilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSB0aGUgcGl0XG4gICAgZmVhdHVyZTogWydwaXQnXSxcbiAgICBlZGdlczogJ2MgYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBwbGF0Zm9ybToge3R5cGU6ICdob3Jpem9udGFsJywgY29vcmQ6IDB4NzBfMzh9LFxuICB9KTtcbiAgcmVhZG9ubHkgcGl0TlMgPSAkKHtcbiAgICBpZDogMHhlYyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilbMgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSB0aGUgcGl0XG4gICAgZmVhdHVyZTogWydwaXQnXSxcbiAgICBlZGdlczogJyBjIGMnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgcGxhdGZvcm06IHt0eXBlOiAndmVydGljYWwnLCBjb29yZDogMHg0MF83OH0sXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOU19oYWxsUyA9ICQoe1xuICAgIGlkOiAweGVkLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkSB8XG4gICAgICB8IOKWkSB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgLy8gVE9ETyAtIGFubm90YXRlIHRoZSBzcGlrZXM/XG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ3MgYyAnLCAvLyBzID0gc3Bpa2VzXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxOID0gJCh7XG4gICAgaWQ6IDB4ZWUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICAvLyBUT0RPIC0gYW5ub3RhdGUgdGhlIHNwaWtlcz9cbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAnYyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxXRSA9ICQoe1xuICAgIGlkOiAweGVmLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkSB8XG4gICAgICB84pSA4paR4pSAfFxuICAgICAgfCDilpEgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSB0aGUgc3Bpa2VzP1xuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzY3NjJyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOU19oYWxsVyA9ICQoe1xuICAgIGlkOiB+MHhlMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpEgfFxuICAgICAgfOKUgOKWkSB8XG4gICAgICB8IOKWkSB8YCxcbiAgICB0aWxlc2V0czogd2l0aFJlcXVpcmUoU2NyZWVuRml4LkV4dHJhU3Bpa2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSksXG4gICAgLy8gVE9ETyAtIGFubm90YXRlIHRoZSBzcGlrZXM/XG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ3NjcyAnLFxuICAgIGNvbm5lY3Q6ICcyNmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgc3Bpa2VzTlNfaGFsbEUgPSAkKHtcbiAgICBpZDogfjB4ZTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paR4pSAfFxuICAgICAgfCDilpEgfGAsXG4gICAgdGlsZXNldHM6IHdpdGhSZXF1aXJlKFNjcmVlbkZpeC5FeHRyYVNwaWtlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0pLFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSB0aGUgc3Bpa2VzP1xuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzIHNjJyxcbiAgICBjb25uZWN0OiAnMmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc05TID0gJCh7XG4gICAgaWQ6IDB4ZjAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWoIHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKVpSB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnciByICcsXG4gICAgY29ubmVjdDogJzE6M3w5OmInLFxuICAgIHBvaTogW1sxLCAtMHgzMCwgMHg0OF0sIFsxLCAtMHgzMCwgMHg5OF0sXG4gICAgICAgICAgWzEsIDB4MTEwLCAweDQ4XSwgWzEsIDB4MTEwLCAweDk4XV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNOID0gJCh7XG4gICAgaWQ6IDB4ZjAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWoIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3IgICAnLFxuICAgIGNvbm5lY3Q6ICcxOjMnLFxuICAgIHBvaTogW1sxLCAtMHgzMCwgMHg0OF0sIFsxLCAtMHgzMCwgMHg5OF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzUyA9ICQoe1xuICAgIGlkOiAweGYwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWlIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICcgIHIgJyxcbiAgICBjb25uZWN0OiAnOTpiJyxcbiAgICBwb2k6IFtbMSwgMHgxMTAsIDB4NDhdLCBbMSwgMHgxMTAsIDB4OThdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc1dFID0gJCh7XG4gICAgaWQ6IDB4ZjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pWhIOKVnnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnIHIgcicsXG4gICAgY29ubmVjdDogJzU6N3xkOmYnLFxuICAgIHBvaTogW1sxLCAweDYwLCAweDEwOF0sIFsxLCAweGEwLCAweDEwOF0sXG4gICAgICAgICAgWzEsIDB4NjAsIC0weDI4XSwgWzEsIDB4YTAsIC0weDI4XV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNXID0gJCh7XG4gICAgaWQ6IDB4ZjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pWhICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJyByICAnLFxuICAgIGNvbm5lY3Q6ICc1OjcnLFxuICAgIHBvaTogW1sxLCAweDYwLCAtMHgyOF0sIFsxLCAweGEwLCAtMHgyOF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzRSA9ICQoe1xuICAgIGlkOiAweGYxLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAg4pWefFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICcgICByJyxcbiAgICBjb25uZWN0OiAnZDpmJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgMHgxMDhdLCBbMSwgMHhhMCwgMHgxMDhdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5fYnJpZGdlID0gJCh7XG4gICAgaWQ6IDB4ZjIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSHIHxcbiAgICAgIHwg4pWoIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdyICAgJyxcbiAgICBjb25uZWN0OiAnMS0zJyxcbiAgICB3YWxsOiAweDE3LFxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBhIHBvaSgyKSBoZXJlP1xuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlU19icmlkZ2UgPSAkKHtcbiAgICBpZDogMHhmMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWlIHxcbiAgICAgIHwg4pSHIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydicmlkZ2UnXSxcbiAgICBlZGdlczogJyAgciAnLFxuICAgIGNvbm5lY3Q6ICc5LWInLFxuICAgIHdhbGw6IDB4YzYsXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGEgcG9pKDIpIGhlcmU/XG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXU0UgPSAkKHtcbiAgICBpZDogMHhmMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilZDilabilZB8XG4gICAgICB84pSQ4pWR4pSMfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJyBycnInLFxuICAgIGNvbm5lY3Q6ICc1ZDo3OTpiZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOV0UgPSAkKHtcbiAgICBpZDogMHhmNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKVkeKUlHxcbiAgICAgIHzilZDilanilZB8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3JyIHInLFxuICAgIGNvbm5lY3Q6ICcxNTozZDo3ZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19ibG9ja2VkUmlnaHQgPSAkKHtcbiAgICBpZDogMHhmNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilILilZEgfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICdyIHIgJyxcbiAgICBjb25uZWN0OiAnMTk6MzpiJyxcbiAgICBwb2k6IFtbMSwgMHhjMCwgMHg5OF0sIFsxLCAweDQwLCAweDk4XV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19ibG9ja2VkTGVmdCA9ICQoe1xuICAgIGlkOiAweGY2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfCDilZHilIJ8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxOjNiOjknLFxuICAgIHBvaTogW1sxLCAweGIwLCAweDQ4XSwgWzEsIDB4MzAsIDB4NDhdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TID0gJCh7XG4gICAgaWQ6IDB4ZjcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAncyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0QXJlbmFfc3RhdHVlcyA9ICQoe1xuICAgIGlkOiAweGY4LFxuICAgIGljb246IGljb25gPFxuICAgICAgfCY8JnxcbiAgICAgIHzilIIg4pSCfFxuICAgICAgfOKUlOKUrOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJyAqYyonLFxuICAgIGFsbG93ZWQ6IHMgPT4gcy5oYXNGZWF0dXJlKCdlbXB0eScpID8gWzEsIDNdIDogW10sXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDQ3KV1cbiAgfSk7XG4gIHJlYWRvbmx5IHB5cmFtaWRBcmVuYV9kcmF5Z29uID0gJCh7XG4gICAgaWQ6IDB4ZjksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilIDilJB8XG4gICAgICB84pSC4pWz4pSCfFxuICAgICAgfOKUlOKUrOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnLCAncGl0J10sXG4gICAgZWRnZXM6ICcgKncqJyxcbiAgICBhbGxvd2VkOiBzID0+IHMuaGFzRmVhdHVyZSgnZW1wdHknKSA/IFsxLCAzXSA6IFtdLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0QXJlbmFfZHJheWdvbjIgPSAkKHtcbiAgICBpZDogMHhmYSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUj+KUt+KUk3xcbiAgICAgIHzilIMm4pSDfFxuICAgICAgfOKUl+KUs+KUm3xgLFxuICAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJ2MqdyonLFxuICAgIGFsbG93ZWQ6IHMgPT4gcy5oYXNGZWF0dXJlKCdlbXB0eScpID8gWzEsIDNdIDogW10sXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW3RvcEVkZ2UoNiwgNCldLFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRBcmVuYV9lbnRyYW5jZSA9ICQoe1xuICAgIGlkOiAweGZiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKVvyB8YCxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgICBlZGdlczogJ3cgbiAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRUZWxlcG9ydGVyID0gJCh7XG4gICAgaWQ6IDB4ZmMsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gICAgLy8gTk9URSAtIHVzZXMgYm90dG9tRWRnZSAoTk9UIHRoZSBob3VzZSB2ZXJzaW9uKVxuICB9KTtcbiAgcmVhZG9ubHkgZm9ydHJlc3NBcmVuYV90aHJvdWdoID0gJCh7XG4gICAgaWQ6IDB4ZmQsXG4gICAgaWNvbjogaWNvbmDilb1cbiAgICAgIHzilIzilLTilJB8XG4gICAgICB84pSCIOKUgnxcbiAgICAgIHzilJXilLPilJl8YCxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgICAvLyBOT1RFOiB3ZSBjb3VsZCB1c2UgdGhpcyBmb3IgYSBwaXQgdGhhdCByZXF1aXJlcyBmbGlnaHQgdG8gY3Jvc3M/XG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnbip3KicsXG4gICAgYWxsb3dlZDogcyA9PiBzLmhhc0ZlYXR1cmUoJ2VtcHR5JykgPyBbMSwgM10gOiBbXSxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSgpXSxcbiAgfSk7XG4gIC8vIHJlYWRvbmx5IGZvcnRyZXNzQXJlbmFfcGl0ID0gJCh7XG4gIC8vICAgaWQ6IDB4ZmQsXG4gIC8vICAgaWNvbjogaWNvbmDilb1cbiAgLy8gICAgIHzilIzilLTilJB8XG4gIC8vICAgICB84pSCIOKUgnxcbiAgLy8gICAgIHzilJXilLPilJl8YCxcbiAgLy8gICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgLy8gICBmZWF0dXJlOiBbJ2FyZW5hJywgJ3BpdCddLFxuICAvLyAgIGVkZ2VzOiAnbiB3ICcsXG4gIC8vICAgY29ubmVjdDogJzJhJywgLy8gVE9ETyAtIG5vIHdheSB5ZXQgdG8gbm90aWNlIGZsYWdnZWQgYW5kIGhhdmVcbiAgLy8gICBleGl0czogW3RvcEVkZ2UoKV0sICAgLy8gbG9naWMgcmVxdWlyZSBmbGlnaHQuLi5cbiAgLy8gICBmbGFnZ2VkOiB0cnVlLFxuICAvLyB9KTtcbiAgcmVhZG9ubHkgZm9ydHJlc3NUcmFwID0gJCh7XG4gICAgaWQ6IDB4ZmUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJTilIDilJh8XG4gICAgICB8IOKVsyB8XG4gICAgICB84pW24pSs4pW0fGAsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gICAgZmVhdHVyZTogWydwaXQnXSxcbiAgICBlZGdlczogJyAgbiAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBleGl0czogW2JvdHRvbUVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzaHJpbmUgPSAkKHtcbiAgICBpZDogMHhmZixcbiAgICB0aWxlc2V0czoge3NocmluZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDV9KV0sXG4gIH0pO1xuICByZWFkb25seSBpbm4gPSAkKHtcbiAgICBpZDogMHgxMDAsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbZG9vcigweDg2KV0sXG4gIH0pO1xuICByZWFkb25seSB0b29sU2hvcCA9ICQoe1xuICAgIGlkOiAweDEwMSxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtkb29yKDB4ODYpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGFybW9yU2hvcCA9ICQoe1xuICAgIGlkOiAweDEwMixcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtkb29yKDB4ODYpXSxcbiAgfSk7XG59XG5cbi8vICAg4pWU4pWm4pWXICAgICAgICAg4pWiICDilaVcbi8vICAg4pWg4pWs4pWjIOKVnuKVkOKVpOKVp+KVquKVoSAg4pWRICDilatcbi8vICAg4pWa4pWp4pWdICAgICAgICAg4pWoICDilZ9cbi8vICDilIzilKzilJAgIOKVt1xuLy8gIOKUnOKUvOKUpCAg4pSCIOKVtuKUgOKVtCBcbi8vICDilJTilLTilJggIOKVtVxuLy8g4paX4paE4paWICAg4paf4paZXG4vLyDilpDilojilowgICDilpzilpsgXG4vLyDilp3iloDilphcbi8vIFUrMjUweCDilIAg4pSBIOKUgiDilIMg4pSEIOKUhSDilIYg4pSHIOKUiCDilIkg4pSKIOKUiyDilIwg4pSNIOKUjiDilI9cbi8vIFUrMjUxeCDilJAg4pSRIOKUkiDilJMg4pSUIOKUlSDilJYg4pSXIOKUmCDilJkg4pSaIOKUmyDilJwg4pSdIOKUniDilJ9cbi8vIFUrMjUyeCDilKAg4pShIOKUoiDilKMg4pSkIOKUpSDilKYg4pSnIOKUqCDilKkg4pSqIOKUqyDilKwg4pStIOKUriDilK9cbi8vIFUrMjUzeCDilLAg4pSxIOKUsiDilLMg4pS0IOKUtSDilLYg4pS3IOKUuCDilLkg4pS6IOKUuyDilLwg4pS9IOKUviDilL9cbi8vIFUrMjU0eCDilYAg4pWBIOKVgiDilYMg4pWEIOKVhSDilYYg4pWHIOKViCDilYkg4pWKIOKViyDilYwg4pWNIOKVjiDilY9cbi8vIFUrMjU1eCDilZAg4pWRIOKVkiDilZMg4pWUIOKVlSDilZYg4pWXIOKVmCDilZkg4pWaIOKVmyDilZwg4pWdIOKVnlx04pWfXG4vLyBVKzI1Nngg4pWgIOKVoSDilaIg4pWjIOKVpCDilaUg4pWmIOKVpyDilagg4pWpIOKVqiDilasg4pWsIOKVrSDila4g4pWvXG4vLyBVKzI1N3gg4pWwIOKVsSDilbIg4pWzIOKVtCDilbUg4pW2IOKVtyDilbgg4pW5IOKVuiDilbsg4pW8IOKVvSDilb4g4pW/XG4vLyBVKzI1OHgg4paAIOKWgSDiloIg4paDIOKWhCDiloUg4paGIOKWhyDilogg4paJIOKWiiDilosg4paMIOKWjSDilo4g4paPXG4vLyBVKzI1OXgg4paQIOKWkSDilpIg4paTIOKWlCDilpUg4paWIOKWlyDilpgg4paZIOKWmiDilpsg4pacIOKWnSDilp4g4pafXG4vL1xuLy8g4oipIFxcY2FwXG4iXX0=