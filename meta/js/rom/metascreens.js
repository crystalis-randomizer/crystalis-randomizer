import { DefaultMap } from '../util.js';
import { Metascreen } from './metascreen.js';
import { bottomEdge, bottomEdgeHouse, cave, door, downStair, icon, leftEdge, rightEdge, seamlessDown, seamlessUp, topEdge, upStair, waterfallCave, } from './metascreendata.js';
import { ScreenFix, withRequire } from './screenfix.js';
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
        this.length = 0;
        this.screensByFix = new DefaultMap(() => []);
        this.screensById = new DefaultMap(() => []);
        this.overworldEmpty = this.metascreen({
            id: 0x00,
            icon: icon `
      |███|
      |███|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            feature: ['empty'],
            edges: '    ',
        });
        this.boundaryW_trees = this.metascreen({
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
        this.boundaryW = this.metascreen({
            id: 0x02,
            icon: icon `
      |█▌ |
      |█▌ |
      |█▌ |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '> >o',
        });
        this.boundaryE_rocks = this.metascreen({
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
        this.boundaryE = this.metascreen({
            id: 0x04,
            icon: icon `
      | ▐█|
      | ▐█|
      | ▐█|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<o< ',
        });
        this.longGrassS = this.metascreen({
            id: 0x05,
            icon: icon `
      |vv |
      | vv|
      |   |`,
            tilesets: { river: {},
                grass: { requires: [ScreenFix.GrassLongGrass] } },
            edges: 'looo',
        });
        this.longGrassN = this.metascreen({
            id: 0x06,
            icon: icon `
      |   |
      | vv|
      |vv |`,
            tilesets: { river: {},
                grass: { requires: [ScreenFix.GrassLongGrass] } },
            edges: 'oolo',
        });
        this.boundaryS_rocks = this.metascreen({
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
        this.fortressTownEntrance = this.metascreen({
            id: 0x08,
            icon: icon `
      |███|
      |█∩█|
      |   |`,
            tilesets: { grass: {} },
            edges: ' vov',
            exits: [{ ...upStair(0xa6, 3), type: 'fortress' }],
        });
        this.bendSE_longGrass = this.metascreen({
            id: 0x09,
            icon: icon `▗
      | v |
      |vv▄|
      | ▐█|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'oo<^',
        });
        this.exitW_cave = this.metascreen({
            id: 0x0a,
            icon: icon `∩
      |█∩█|
      |  █|
      |███|`,
            tilesets: { grass: {}, river: {}, desert: {},
                sea: { requires: [ScreenFix.SeaCaveEntrance] } },
            edges: ' n  ',
            exits: [cave(0x48), leftEdge({ top: 6 })],
        });
        this.bendNE_grassRocks = this.metascreen({
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
        this.cornerNW = this.metascreen({
            id: 0x0c,
            icon: icon `▛
      |███|
      |█ ▀|
      |█▌ |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '  >v',
        });
        this.overworldEmpty_alt = this.metascreen({
            id: 0x0c,
            icon: icon `
      |███|
      |███|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            feature: ['empty'],
            edges: '    ',
            match: () => false,
        });
        this.cornerNE = this.metascreen({
            id: 0x0d,
            icon: icon `▜
      |███|
      |▀██|
      | ▐█|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: ' v< ',
        });
        this.cornerSW = this.metascreen({
            id: 0x0e,
            icon: icon `▙
      |█▌ |
      |██▄|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '>  ^',
        });
        this.cornerSE = this.metascreen({
            id: 0x0f,
            icon: icon `▟
      | ▐█|
      |▄██|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<^  ',
        });
        this.exitE = this.metascreen({
            id: 0x10,
            icon: icon `╶
      | ▐█|
      |   |
      | ▐█|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks] } },
            edges: '<o<n',
            exits: [rightEdge({ top: 6 })],
        });
        this.boundaryN_trees = this.metascreen({
            id: 0x11,
            icon: icon `
      |███|
      |▀▀▀|
      | ^ |`,
            tilesets: { grass: {}, river: {}, desert: {},
                sea: { requires: [ScreenFix.SeaTrees] } },
            edges: ' vov',
        });
        this.bridgeToPortoa = this.metascreen({
            id: 0x12,
            icon: icon `╴
      |═  |
      |╞══|
      |│  |`,
            tilesets: { river: {} },
            feature: ['portoa3'],
            edges: '2*>r',
            exits: [leftEdge({ top: 1 })],
        });
        this.slopeAbovePortoa = this.metascreen({
            id: 0x13,
            icon: icon `
      |█↓█|
      |█↓▀|
      |│  |`,
            tilesets: { river: {} },
            feature: ['portoa2'],
            edges: '1*2v',
        });
        this.riverBendSE = this.metascreen({
            id: 0x14,
            icon: icon `
      |w  |
      | ╔═|
      | ║ |`,
            tilesets: { river: {} },
            edges: 'oorr',
        });
        this.boundaryW_cave = this.metascreen({
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
        this.exitN = this.metascreen({
            id: 0x16,
            icon: icon `╵
      |█ █|
      |▀ ▀|
      | ^ |`,
            tilesets: { grass: {}, river: {}, desert: {} },
            edges: 'nvov',
            exits: [topEdge()],
        });
        this.riverWE_woodenBridge = this.metascreen({
            id: 0x17,
            icon: icon `═
      |   |
      |═║═|
      |   |`,
            tilesets: { river: {} },
            edges: 'oror',
            exits: [seamlessUp(0x77), seamlessDown(0x87)],
        });
        this.riverBoundaryE_waterfall = this.metascreen({
            id: 0x18,
            icon: icon `╡
      | ▐█|
      |══/|
      | ▐█|`,
            tilesets: { river: {} },
            edges: '<r< ',
        });
        this.boundaryE_cave = this.metascreen({
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
        this.exitW_southwest = this.metascreen({
            id: 0x1a,
            icon: icon `╴
      |█▌ |
      |▀ ▄|
      |▄██|`,
            tilesets: { grass: {}, river: {},
                desert: { requires: [ScreenFix.DesertRocks] },
                sea: { requires: [ScreenFix.SeaRocks] } },
            edges: '>* ^',
            exits: [leftEdge({ top: 0xb })],
        });
        this.nadare = this.metascreen({
            id: 0x1b,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), door(0x23),
                door(0x25, 'door2'), door(0x2a, 'door3')],
        });
        this.townExitW = this.metascreen({
            id: 0x1c,
            icon: icon `╴
      |█▌ |
      |▀ ^|
      |█▌ |`,
            tilesets: { grass: {}, river: {} },
            edges: '>n>o',
            exits: [leftEdge({ top: 8 })],
        });
        this.shortGrassS = this.metascreen({
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
        this.townExitS = this.metascreen({
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
        this.swanGate = this.metascreen({
            id: 0x1f,
            tilesets: { town: {} },
            exits: [leftEdge({ top: 3 }), rightEdge({ top: 9 })],
            flag: 'custom:false',
        });
        this.riverBranchNSE = this.metascreen({
            id: 0x20,
            icon: icon `
      | ║ |
      | ╠═|
      | ║ |`,
            tilesets: { river: {} },
            edges: 'rorr',
        });
        this.riverWE = this.metascreen({
            id: 0x21,
            icon: icon `
      |   |
      |═══|
      |   |`,
            tilesets: { river: {} },
            edges: 'oror',
        });
        this.riverBoundaryS_waterfall = this.metascreen({
            id: 0x22,
            icon: icon `╨
      | ║ |
      |▄║▄|
      |█/█|`,
            tilesets: { river: {} },
            edges: 'r^ ^',
        });
        this.shortGrassSE = this.metascreen({
            id: 0x23,
            icon: icon `
      |;;;|
      |;  |
      |; ^|`,
            tilesets: { grass: {} },
            edges: 'ssoo',
        });
        this.shortGrassNE = this.metascreen({
            id: 0x24,
            icon: icon ` |
      |;  |
      |;v |
      |;;;|`,
            tilesets: { grass: {} },
            edges: 'osso',
        });
        this.stomHouseOutside = this.metascreen({
            id: 0x25,
            icon: icon `∩
      |███|
      |▌∩▐|
      |█ █|`,
            tilesets: { grass: {} },
            exits: [door(0x68), bottomEdge({ shift: 0.5 })],
        });
        this.bendNW_trees = this.metascreen({
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
        this.shortGrassSW = this.metascreen({
            id: 0x27,
            icon: icon `
      |;;;|
      |  ;|
      |^ ;|`,
            tilesets: { grass: {},
                river: { requires: [ScreenFix.RiverShortGrass] } },
            edges: 'soos',
        });
        this.riverBranchNWS = this.metascreen({
            id: 0x28,
            icon: icon `
      | ║ |
      |═╣ |
      | ║ |`,
            tilesets: { river: {} },
            edges: 'rrro',
        });
        this.shortGrassNW = this.metascreen({
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
        this.valleyBridge = this.metascreen({
            id: 0x2a,
            icon: icon ` |
      |▛║▜|
      | ║ |
      |▙║▟|`,
            tilesets: { grass: {}, river: {} },
            edges: 'n n ',
            exits: [seamlessUp(0x77), seamlessDown(0x87), topEdge(), bottomEdge()],
        });
        this.exitS_cave = this.metascreen({
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
        this.outsideWindmill = this.metascreen({
            id: 0x2c,
            icon: icon `╳
      |██╳|
      |█∩█|
      |█ █|`,
            tilesets: { grass: {} },
            flag: 'custom:false',
            feature: ['windmill'],
            edges: '  n ',
            exits: [cave(0x63), bottomEdge(), door(0x89, 'windmill'), door(0x8c)],
        });
        this.townExitW_cave = this.metascreen({
            id: 0x2d,
            icon: icon `∩
      |█∩█|
      |▄▄█|
      |███|`,
            tilesets: { grass: {} },
            edges: ' n  ',
            exits: [cave(0x4a), leftEdge({ top: 5 })],
            flag: 'custom:true',
        });
        this.riverNS = this.metascreen({
            id: 0x2e,
            icon: icon `
      | ║ |
      | ║ |
      | ║ |`,
            tilesets: { river: {} },
            edges: 'roro',
        });
        this.riverNS_bridge = this.metascreen({
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
        this.riverBendWS = this.metascreen({
            id: 0x30,
            icon: icon `
      | w▜|
      |═╗w|
      | ║ |`,
            tilesets: { river: {} },
            edges: '<rrv',
        });
        this.boundaryN_waterfallCave = this.metascreen({
            id: 0x31,
            icon: icon `
      |▛/█|
      |▘║▀|
      | ║ |`,
            tilesets: { river: {} },
            edges: ' vrv',
            exits: [waterfallCave(0x75)],
        });
        this.open_trees = this.metascreen({
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
        this.exitS = this.metascreen({
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
        this.bendNW = this.metascreen({
            id: 0x34,
            icon: icon `▘
      |█▌ |
      |▀▀ |
      |   |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '>voo',
        });
        this.bendNE = this.metascreen({
            id: 0x35,
            icon: icon `▝
      | ▐█|
      |  ▀|
      |   |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<oov',
        });
        this.bendSE = this.metascreen({
            id: 0x36,
            icon: icon `▗
      |   |
      | ▄▄|
      | ▐█|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'oo<^',
        });
        this.bendWS = this.metascreen({
            id: 0x37,
            icon: icon `▖
      |   |
      |▄▄ |
      |█▌ |`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'o^>o',
        });
        this.towerPlain_upStair = this.metascreen({
            id: 0x38,
            icon: icon `┴
      | ┊ |
      |─┴─|
      |   |`,
            tilesets: { tower: {} },
            edges: 'st t',
            exits: [seamlessDown(0x08, 2), topEdge({ left: 8 })],
        });
        this.towerRobotDoor_downStair = this.metascreen({
            id: 0x39,
            icon: icon `┬
      | ∩ |
      |─┬─|
      | ┊ |`,
            tilesets: { tower: {} },
            edges: ' tst',
            exits: [seamlessUp(0xe8, 2)],
        });
        this.towerDynaDoor = this.metascreen({
            id: 0x3a,
            icon: icon `∩
      | ∩ |
      |└┬┘|
      | ┊ |`,
            tilesets: { tower: {} },
            edges: '  s ',
            exits: [cave(0x67, 'door')],
        });
        this.towerLongStairs = this.metascreen({
            id: 0x3b,
            icon: icon `
      | ┊ |
      | ┊ |
      | ┊ |`,
            tilesets: { tower: {} },
            edges: 's s ',
            exits: [bottomEdge()],
        });
        this.towerMesiaRoom = this.metascreen({
            id: 0x3c,
            tilesets: { tower: {} },
            exits: [bottomEdgeHouse()],
        });
        this.towerTeleporter = this.metascreen({
            id: 0x3d,
            tilesets: { tower: {} },
            exits: [bottomEdgeHouse(), cave(0x57, 'teleporter')],
        });
        this.caveAbovePortoa = this.metascreen({
            id: 0x3e,
            icon: icon `
      |███|
      |█∩█|
      |█↓█|`,
            tilesets: { river: {} },
            edges: '  1 ',
            exits: [cave(0x66)],
        });
        this.cornerNE_flowers = this.metascreen({
            id: 0x3f,
            icon: icon `▜
      |███|
      |▀*█|
      | ▐█|`,
            tilesets: { grass: {} },
            edges: ' v< ',
        });
        this.towerEdge = this.metascreen({
            id: 0x40,
            icon: icon ` |
      |   |
      |┤ ├|
      |   |`,
            tilesets: { tower: {} },
            edges: ' t t',
        });
        this.towerEdgeW = this.metascreen({
            id: 0x40,
            icon: icon ` |
      |   |
      |┤  |
      |   |`,
            tilesets: { tower: {} },
            edges: ' t  ',
        });
        this.towerEdgeE = this.metascreen({
            id: 0x40,
            icon: icon ` |
      |   |
      |  ├|
      |   |`,
            tilesets: { tower: {} },
            edges: '   t',
        });
        this.towerRobotDoor = this.metascreen({
            id: 0x41,
            icon: icon `─
      | O |
      |───|
      |   |`,
            tilesets: { tower: {} },
            edges: ' t t',
        });
        this.towerDoor = this.metascreen({
            id: 0x42,
            icon: icon `∩
      | ∩ |
      |─┴─|
      |   |`,
            tilesets: { tower: {} },
            edges: ' t t',
            exits: [cave(0x58)],
        });
        this.house_bedroom = this.metascreen({
            id: 0x43,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.shed = this.metascreen({
            id: 0x44,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), cave(0x49)],
            flag: 'custom:false',
        });
        this.tavern = this.metascreen({
            id: 0x45,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.house_twoBeds = this.metascreen({
            id: 0x46,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.throneRoom_amazones = this.metascreen({
            id: 0x47,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse({ width: 3 }), downStair(0x4c, 1)],
        });
        this.house_ruinedUpstairs = this.metascreen({
            id: 0x48,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), downStair(0x9c, 1)],
        });
        this.house_ruinedDownstairs = this.metascreen({
            id: 0x49,
            tilesets: { house: {} },
            exits: [upStair(0x56, 1)],
        });
        this.foyer = this.metascreen({
            id: 0x4a,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse({ shift: 0.5 }),
                door(0x28), door(0x53, 'door2'), door(0x5c, 'door3')],
        });
        this.throneRoom_portoa = this.metascreen({
            id: 0x4b,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), door(0x2b)],
        });
        this.fortuneTeller = this.metascreen({
            id: 0x4c,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse(), door(0x56), door(0x59, 'door2')],
        });
        this.backRoom = this.metascreen({
            id: 0x4d,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.dojo = this.metascreen({
            id: 0x4e,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse({ shift: -0.5 })],
        });
        this.windmillInside = this.metascreen({
            id: 0x4f,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse({ left: 9, width: 1 })],
        });
        this.horizontalTownMiddle = this.metascreen({
            id: 0x50,
            tilesets: { town: {} },
            exits: [door(0x4c), door(0x55, 'door2')],
        });
        this.brynmaerRight_exitE = this.metascreen({
            id: 0x51,
            tilesets: { town: { type: 'horizontal' } },
            exits: [rightEdge({ top: 8 }), door(0x41)],
        });
        this.brynmaerLeft_deadEnd = this.metascreen({
            id: 0x52,
            tilesets: { town: { type: 'horizontal' } },
            exits: [door(0x49), door(0x4c, 'door2')],
        });
        this.swanLeft_exitW = this.metascreen({
            id: 0x53,
            tilesets: { town: { type: 'horizontal' } },
            exits: [leftEdge({ top: 9 }), door(0x49), door(0x5e, 'door2')],
        });
        this.swanRight_exitS = this.metascreen({
            id: 0x54,
            tilesets: { town: { type: 'horizontal' } },
            exits: [bottomEdge({ left: 3 }), door(0x41),
                door(0x43, 'door2'), door(0x57, 'door3')],
        });
        this.horizontalTownLeft_exitN = this.metascreen({
            id: 0x55,
            tilesets: { town: { type: 'horizontal' } },
            exits: [topEdge({ left: 0xd }), door(0x46), door(0x4b, 'door2')],
        });
        this.amazonesRight_deadEnd = this.metascreen({
            id: 0x56,
            tilesets: { town: { type: 'horizontal' } },
            exits: [door(0x40), door(0x58, 'door2')],
        });
        this.saharaRight_exitE = this.metascreen({
            id: 0x57,
            tilesets: { town: { type: 'horizontal' } },
            exits: [rightEdge({ top: 7 }), door(0x40), door(0x66, 'door2')],
        });
        this.portoaNW = this.metascreen({
            id: 0x58,
            tilesets: { town: { type: 'square' } },
            exits: [cave(0x47, 'fortress'), bottomEdge()],
        });
        this.portoaNE = this.metascreen({
            id: 0x59,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x63), door(0x8a, 'door2'), bottomEdge({ left: 3, width: 4 })],
        });
        this.portoaSW_exitW = this.metascreen({
            id: 0x5a,
            tilesets: { town: { type: 'square' } },
            exits: [leftEdge({ top: 9 }), door(0x86), topEdge()],
        });
        this.portoaSE_exitE = this.metascreen({
            id: 0x5b,
            tilesets: { town: { type: 'square' } },
            exits: [rightEdge({ top: 9 }), door(0x7a), door(0x87, 'door2')],
        });
        this.dyna = this.metascreen({
            id: 0x5c,
            tilesets: { tower: {} },
            exits: [{ type: 'stair:down', manual: true, dir: 2,
                    entrance: 0xbf80, exits: [] }],
        });
        this.portoaFisherman = this.metascreen({
            id: 0x5d,
            tilesets: { town: { type: 'square' } },
            exits: [rightEdge({ top: 6 }),
                leftEdge({ top: 4, height: 6, shift: 0.5 }),
                door(0x68)],
        });
        this.verticalTownTop_fortress = this.metascreen({
            id: 0x5e,
            tilesets: { town: { type: 'vertical' } },
            exits: [cave(0x47), bottomEdge()],
        });
        this.shyronMiddle = this.metascreen({
            id: 0x5f,
            tilesets: { town: { type: 'vertical' } },
            exits: [door(0x54), door(0x5b, 'door2'), topEdge()],
        });
        this.shyronBottom_exitS = this.metascreen({
            id: 0x60,
            tilesets: { town: { type: 'vertical' } },
            exits: [bottomEdge({ left: 3 }), door(0x04),
                door(0x06, 'door2'), door(0x99, 'door3')],
        });
        this.zombieTownMiddle = this.metascreen({
            id: 0x61,
            tilesets: { town: { type: 'vertical' } },
            exits: [door(0x99), topEdge()],
        });
        this.zombieTownBottom_caveExit = this.metascreen({
            id: 0x62,
            tilesets: { town: { type: 'vertical' } },
            exits: [cave(0x92), door(0x23), door(0x4d, 'door2')],
        });
        this.leafNW_houseShed = this.metascreen({
            id: 0x63,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x8c), door(0x95, 'door2')],
        });
        this.squareTownNE_house = this.metascreen({
            id: 0x64,
            tilesets: { town: { type: 'square' } },
            exits: [topEdge({ left: 1 }), door(0xb7)],
        });
        this.leafSW_shops = this.metascreen({
            id: 0x65,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x77), door(0x8a, 'door2')],
        });
        this.leafSE_exitE = this.metascreen({
            id: 0x66,
            tilesets: { town: { type: 'square' } },
            exits: [rightEdge({ top: 3 }), door(0x84)],
        });
        this.goaNW_tavern = this.metascreen({
            id: 0x67,
            tilesets: { town: { type: 'square' } },
            exits: [door(0xba)],
        });
        this.squareTownSW_exitS = this.metascreen({
            id: 0x68,
            tilesets: { town: { type: 'square' } },
            exits: [bottomEdge({ left: 8 }), door(0x84)],
        });
        this.goaSE_shop = this.metascreen({
            id: 0x69,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x82)],
        });
        this.joelNE_shop = this.metascreen({
            id: 0x6a,
            tilesets: { town: { type: 'square' } },
            exits: [door(0xa7)],
        });
        this.joelSE_lake = this.metascreen({
            id: 0x6b,
            tilesets: { town: { type: 'square' } },
        });
        this.oakNW = this.metascreen({
            id: 0x6c,
            tilesets: { town: { type: 'square' } },
            exits: [door(0xe7)],
        });
        this.oakNE = this.metascreen({
            id: 0x6d,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x60)],
        });
        this.oakSW = this.metascreen({
            id: 0x6e,
            tilesets: { town: { type: 'square' } },
            exits: [door(0x7c)],
        });
        this.oakSE = this.metascreen({
            id: 0x6f,
            tilesets: { town: { type: 'square' } },
            exits: [bottomEdge({ left: 0, shift: 0.5 }), door(0x97)],
        });
        this.temple = this.metascreen({
            id: 0x70,
            tilesets: { house: {} },
            exits: [bottomEdgeHouse()],
        });
        this.wideDeadEndN = this.metascreen({
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
        this.goaWideDeadEndN = this.metascreen({
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
        this.wideHallNS = this.metascreen({
            id: 0x72,
            icon: icon `
      | ┃ |
      | ┃ |
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'w w ',
            connect: '2a',
        });
        this.goaWideHallNS = this.metascreen({
            id: 0x72,
            icon: icon `
      |│┃│|
      |│┃│|
      |│┃│|`,
            tilesets: { labyrinth: {} },
            edges: 'w w ',
            connect: '19|2a|3b',
        });
        this.goaWideHallNS_blockedRight = this.metascreen({
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
        this.goaWideHallNS_blockedLeft = this.metascreen({
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
        this.goaWideArena = this.metascreen({
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
            exits: [upStair(0x37)],
        });
        this.limeTreeLake = this.metascreen({
            id: 0x74,
            tilesets: { lime: {} },
            exits: [bottomEdgeHouse(), cave(0x47)],
        });
        this.swampNW = this.metascreen({
            id: 0x75,
            icon: icon `
      | │ |
      |─┘ |
      |   |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 'ss  ',
            connect: '26',
            exits: [topEdge({ left: 6, width: 4 }), leftEdge({ top: 7, height: 3 })],
        });
        this.swampE = this.metascreen({
            id: 0x76,
            icon: icon `
      |   |
      | ╶─|
      |   |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: '   s',
            connect: 'e',
            exits: [],
        });
        this.swampE_door = this.metascreen({
            id: 0x76,
            icon: icon `∩
      | ∩ |
      | ╶─|
      |   |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            flag: 'always',
            edges: '   s',
            connect: 'e',
            exits: [cave(0x5c, 'swamp')],
        });
        this.swampNWSE = this.metascreen({
            id: 0x77,
            icon: icon `
      | │ |
      |─┼─|
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 'ssss',
            connect: '26ae',
            exits: [topEdge({ left: 6, width: 4 }),
                leftEdge({ top: 7, height: 3 }),
                bottomEdge({ left: 6, width: 4 }),
                rightEdge({ top: 7, height: 3 })],
        });
        this.swampNWS = this.metascreen({
            id: 0x78,
            icon: icon `
      | │ |
      |─┤ |
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 'sss ',
            connect: '26a',
            exits: [topEdge({ left: 6, width: 4 }),
                leftEdge({ top: 7, height: 3 }),
                bottomEdge({ left: 6, width: 4 })],
        });
        this.swampNE = this.metascreen({
            id: 0x79,
            icon: icon `
      | │ |
      | └─|
      |   |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 's  s',
            connect: '2e',
            exits: [topEdge({ left: 6, width: 4 }), rightEdge({ top: 7, height: 3 })],
        });
        this.swampWSE = this.metascreen({
            id: 0x7a,
            icon: icon `
      |   |
      |─┬─|
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: ' sss',
            connect: '6ae',
            exits: [leftEdge({ top: 7, height: 3 }),
                bottomEdge({ left: 6, width: 4 }),
                rightEdge({ top: 7, height: 3 })],
        });
        this.swampWSE_door = this.metascreen({
            id: 0x7a,
            icon: icon `∩
      | ∩  |
      |─┬─|
      | │ |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            flag: 'always',
            edges: ' sss',
            connect: '6ae',
            exits: [cave(0x56, 'swamp')],
        });
        this.swampW = this.metascreen({
            id: 0x7b,
            icon: icon `
      |   |
      |─╴ |
      |   |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: ' s  ',
            connect: '6',
        });
        this.swampW_door = this.metascreen({
            id: 0x7b,
            icon: icon `∩
      | ∩ |
      |─╴ |
      |   |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            flag: 'always',
            edges: ' s  ',
            connect: '6',
            exits: [cave(0x54, 'swamp')],
        });
        this.swampArena = this.metascreen({
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
        this.swampNWE = this.metascreen({
            id: 0x7d,
            icon: icon `
      | │ |
      |─┴─|
      |   |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 'ss s',
            connect: '26e',
            exits: [topEdge({ left: 6, width: 4 }),
                leftEdge({ top: 7, height: 3 }),
                rightEdge({ top: 7, height: 3 })],
        });
        this.swampWS = this.metascreen({
            id: 0x7e,
            icon: icon `
      |   |
      |─┐ |
      | │ |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            update: [[ScreenFix.SwampDoors, (s, seed, rom) => {
                        rom.metascreens.swampWS_door.flag = 'always';
                        return true;
                    }]],
            edges: ' ss ',
            connect: '6a',
            exits: [leftEdge({ top: 7, height: 3 }), bottomEdge({ left: 6, width: 4 })],
        });
        this.swampWS_door = this.metascreen({
            id: 0x7e,
            icon: icon `∩
      | ∩ |
      |─┐ |
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: ' ss ',
            connect: '6a',
            exits: [cave(0x57, 'swamp')],
        });
        this.swampEmpty = this.metascreen({
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
        this.swampN = this.metascreen({
            id: ~0x70,
            icon: icon `
      | │ |
      | ╵ |
      |   |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 's   ',
            connect: '2',
        });
        this.swampS = this.metascreen({
            id: ~0x71,
            icon: icon `
      |   |
      | ╷ |
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: '  s ',
            connect: 'a',
        });
        this.swampNS = this.metascreen({
            id: ~0x72,
            icon: icon `
      | │ |
      | │ |
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 's s ',
            connect: '2a',
            exits: [topEdge({ left: 6, width: 4 }), bottomEdge({ left: 6, width: 4 })],
        });
        this.swampWE = this.metascreen({
            id: ~0x72,
            icon: icon `
      |   |
      |───|
      |   |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: ' s s',
            connect: '6e',
            exits: [leftEdge({ top: 7, height: 3 }), rightEdge({ top: 7, height: 3 })],
        });
        this.swampWE_door = this.metascreen({
            id: ~0x72,
            icon: icon `∩
      | ∩ |
      |───|
      |   |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            flag: 'always',
            edges: ' s s',
            connect: '6e',
            exits: [upStair(0x56)],
        });
        this.swampSE = this.metascreen({
            id: ~0x73,
            icon: icon `
      |   |
      | ┌─|
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: '  ss',
            connect: 'ae',
            exits: [leftEdge({ top: 7, height: 3 }), bottomEdge({ left: 6, width: 4 })],
        });
        this.swampSE_door = this.metascreen({
            id: ~0x73,
            icon: icon `∩
      | ∩ |
      | ┌─|
      | │ |`,
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            flag: 'always',
            edges: '  ss',
            connect: 'ae',
            exits: [cave(0x5a, 'swamp')],
        });
        this.swampNSE = this.metascreen({
            id: ~0x74,
            icon: icon `
      | │ |
      | ├─|
      | │ |`,
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 's ss',
            connect: '2ae',
            exits: [topEdge({ left: 6, width: 4 }),
                bottomEdge({ left: 6, width: 4 }),
                rightEdge({ top: 7, height: 3 })],
        });
        this.caveEmpty = this.metascreen({
            id: 0x80,
            icon: icon `
      |   |
      |   |
      |   |`,
            tilesets: { cave: {}, fortress: {}, labyrinth: {}, pyramid: {},
                iceCave: {}, dolphinCave: {} },
            feature: ['empty'],
            edges: '    ',
        });
        this.open = this.metascreen({
            id: 0x80,
            icon: icon `
      |   |
      |   |
      |   |`,
            tilesets: { desert: {}, sea: {} },
            edges: 'oooo',
        });
        this.hallNS = this.metascreen({
            id: 0x81,
            icon: icon `
      | │ |
      | │ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c c ',
            connect: '2a',
            poi: [[4]],
            exits: [bottomEdge({ left: 6, width: 4, manual: true })],
        });
        this.hallWE = this.metascreen({
            id: 0x82,
            icon: icon `
      |   |
      |───|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' c c',
            connect: '6e',
            poi: [[4]],
        });
        this.hallSE = this.metascreen({
            id: 0x83,
            icon: icon `
      |   |
      | ┌─|
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: '  cc',
            connect: 'ae',
            poi: [[2]],
        });
        this.hallWS = this.metascreen({
            id: 0x84,
            icon: icon `
      |   |
      |─┐ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' cc ',
            connect: '6a',
            poi: [[2]],
        });
        this.hallNE = this.metascreen({
            id: 0x85,
            icon: icon `
      | │ |
      | └─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c  c',
            connect: '2e',
            poi: [[2]],
        });
        this.hallNW = this.metascreen({
            id: 0x86,
            icon: icon `
      | │ |
      |─┘ |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'cc  ',
            connect: '26',
            poi: [[2]],
        });
        this.branchNSE = this.metascreen({
            id: 0x87,
            icon: icon `
      | │ |
      | ├─|
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c cc',
            connect: '2ae',
            poi: [[3]],
        });
        this.branchNWSE = this.metascreen({
            id: 0x88,
            icon: icon `
      | │ |
      |─┼─|
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'cccc',
            connect: '26ae',
            poi: [[3]],
        });
        this.branchNWS = this.metascreen({
            id: 0x89,
            icon: icon `
      | │ |
      |─┤ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'ccc ',
            connect: '26a',
            poi: [[3]],
        });
        this.branchWSE = this.metascreen({
            id: 0x8a,
            icon: icon `
      |   |
      |─┬─|
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' ccc',
            connect: '6ae',
            poi: [[3]],
        });
        this.branchNWE = this.metascreen({
            id: 0x8b,
            icon: icon `
      | │ |
      |─┴─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'cc c',
            connect: '26e',
            poi: [[3]],
            exits: [seamlessDown(0x06, 4)],
        });
        this.hallNS_stairs = this.metascreen({
            id: 0x8c,
            icon: icon `
      | ┋ |
      | ┋ |
      | ┋ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['stairs'],
            edges: 'c c ',
            connect: '2a',
        });
        this.hallNS_overBridge = this.metascreen({
            id: 0x8d,
            icon: icon `
      | ╽ |
      |─┃─|
      | ╿ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['overBridge'],
            edges: 'cbcb',
            connect: '2a',
        });
        this.hallWE_underBridge = this.metascreen({
            id: 0x8e,
            icon: icon `
      | ╽ |
      |───|
      | ╿ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['underBridge'],
            edges: 'bcbc',
            connect: '6e',
        });
        this.hallNS_wall = this.metascreen({
            id: 0x8f,
            icon: icon `
      | │ |
      | ┆ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c c ',
            feature: ['wall'],
            connect: '2=a',
            wall: 0x87,
        });
        this.hallWE_wall = this.metascreen({
            id: 0x90,
            icon: icon `
      |   |
      |─┄─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wall'],
            edges: ' c c',
            connect: '6=e',
            wall: 0x67,
        });
        this.hallNS_arena = this.metascreen({
            id: 0x91,
            icon: icon `
      |┌┸┐|
      |│&│|
      |└┬┘|`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['arena'],
            edges: 'n*c*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: '2a',
            poi: [[1, 0x60, 0x78]],
            exits: [topEdge(),
                bottomEdge({ left: 6, width: 4, manual: true }),
                seamlessUp(0xe6, 4)],
        });
        this.hallNS_arenaWall = this.metascreen({
            id: 0x92,
            icon: icon `
      |┌┄┐|
      |│&│|
      |└┬┘|`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['arena', 'wall'],
            edges: 'n*c*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: '2=a',
            wall: 0x27,
            poi: [[1, 0x60, 0x78]],
            exits: [bottomEdge({ left: 6, width: 4, manual: true }),
                topEdge({ top: 1 })],
        });
        this.branchNWE_wall = this.metascreen({
            id: 0x94,
            icon: icon `
      | ┆ |
      |─┴─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'cc c',
            connect: '2=6e',
            exits: [topEdge({ left: 6, width: 4 })],
        });
        this.branchNWE_upStair = this.metascreen({
            id: 0x95,
            icon: icon `<
      | < |
      |─┴─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' c c',
            connect: '6e',
            exits: [upStair(0x47)],
        });
        this.deadEndW_upStair = this.metascreen({
            id: 0x96,
            icon: icon `<
      | < |
      |─┘ |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' c  ',
            connect: '6',
            exits: [upStair(0x42)],
        });
        this.deadEndW_downStair = this.metascreen({
            id: 0x97,
            icon: icon `>
      |   |
      |─┐ |
      | > |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' c  ',
            connect: '6',
            exits: [downStair(0xa2)],
        });
        this.deadEndE_upStair = this.metascreen({
            id: 0x98,
            icon: icon `<
      | < |
      | └─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: '   c',
            connect: 'e',
            exits: [upStair(0x4c)],
        });
        this.deadEndE_downStair = this.metascreen({
            id: 0x99,
            icon: icon `>
      |   |
      | ┌─|
      | > |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: '   c',
            connect: 'e',
            exits: [downStair(0xac)],
        });
        this.deadEndNS_stairs = this.metascreen({
            id: 0x9a,
            icon: icon `
      | > |
      |   |
      | < |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: 'c c ',
            connect: '2|a',
            exits: [downStair(0x17), upStair(0xd7)],
        });
        this.deadEndN_stairs = this.metascreen({
            id: 0x9a,
            icon: icon `
      | > |
      |   |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: 'c   ',
            connect: '2',
            exits: [downStair(0x17)],
            match: (reachable) => !reachable(0x108, 0x78),
        });
        this.deadEndS_stairs = this.metascreen({
            id: 0x9a,
            icon: icon `
      |   |
      |   |
      | < |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: '  c ',
            connect: 'a',
            exits: [upStair(0xd7)],
            match: (reachable) => !reachable(-0x30, 0x78),
        });
        this.deadEndNS = this.metascreen({
            id: 0x9b,
            icon: icon `
      | ╵ |
      |   |
      | ╷ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: 'c c ',
            connect: '2|a',
            poi: [[0, 0x110, 0x78], [0, -0x30, 0x78]],
        });
        this.deadEndN = this.metascreen({
            id: 0x9b,
            icon: icon `
      | ╵ |
      |   |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: 'c   ',
            connect: '2',
            poi: [[0, -0x30, 0x78]],
            match: (reachable) => !reachable(0x110, 0x78),
        });
        this.deadEndS = this.metascreen({
            id: 0x9b,
            icon: icon `
      |   |
      |   |
      | ╷ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: '  c ',
            connect: 'a',
            poi: [[0, 0x110, 0x78]],
            match: (reachable) => !reachable(-0x30, 0x78),
        });
        this.deadEndWE = this.metascreen({
            id: 0x9c,
            icon: icon `
      |   |
      |╴ ╶|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: ' c c',
            connect: '6|e',
            poi: [[0, 0x70, 0x108], [0, 0x70, -0x28]],
        });
        this.deadEndW = this.metascreen({
            id: 0x9c,
            icon: icon `
      |   |
      |╴  |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: ' c  ',
            connect: '6',
            poi: [[0, 0x70, -0x28]],
            match: (reachable) => !reachable(0x70, 0x108),
        });
        this.deadEndE = this.metascreen({
            id: 0x9c,
            icon: icon `
      |   |
      |  ╶|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: '   c',
            connect: 'e',
            poi: [[0, 0x70, 0x108]],
            match: (reachable) => !reachable(0x70, -0x28),
        });
        this.hallNS_entrance = this.metascreen({
            id: 0x9e,
            icon: icon `╽
      | │ |
      | │ |
      | ╽ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c n ',
            connect: '2a',
            exits: [bottomEdge()],
        });
        this.channelExitSE = this.metascreen({
            id: 0x9f,
            icon: icon `
      |   |
      | ╔═|
      | ║ |`,
            tilesets: { dolphinCave: {} },
            exits: [bottomEdge({ left: 5 })],
        });
        this.channelBendWS = this.metascreen({
            id: 0xa0,
            icon: icon `
      |█  |
      |═╗ |
      |█║ |`,
            tilesets: { dolphinCave: {} },
        });
        this.channelHallNS = this.metascreen({
            id: 0xa1,
            icon: icon `
      | ║ |
      | ╠┈|
      | ║ |`,
            tilesets: { dolphinCave: {} },
        });
        this.channelEntranceSE = this.metascreen({
            id: 0xa2,
            icon: icon `
      |   |
      | ╔┈|
      |╷║ |`,
            tilesets: { dolphinCave: {} },
            exits: [bottomEdge({ left: 2 })],
        });
        this.channelCross = this.metascreen({
            id: 0xa3,
            icon: icon `
      | ║ |
      |═╬═|
      |╷║╷|`,
            tilesets: { dolphinCave: {} },
            exits: [bottomEdge({ left: 3 }), bottomEdge({ left: 0xb, type: 'door' })],
        });
        this.channelDoor = this.metascreen({
            id: 0xa4,
            icon: icon `∩
      | ∩█|
      |┈══|
      |  █|`,
            tilesets: { dolphinCave: {} },
            exits: [door(0x38)],
        });
        this.mountainFloatingIsland = this.metascreen({
            id: 0xa5,
            icon: icon `*
      |═╗█|
      |*║ |
      |═╣█|`,
            tilesets: { mountainRiver: {} },
            edges: '  wp',
            connect: 'e',
        });
        this.mountainPathNE_stair = this.metascreen({
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
        this.mountainBranchNWE = this.metascreen({
            id: 0xa7,
            icon: icon `┴
      |█ █|
      |   |
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: 'pp p',
            connect: '26e',
        });
        this.mountainPathWE_iceBridge = this.metascreen({
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
        this.mountainPathSE = this.metascreen({
            id: 0xa9,
            icon: icon `┌
      |███|
      |█  |
      |█ █|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: '  pp',
            connect: 'ae',
            exits: [rightEdge({ top: 6, height: 4 }), bottomEdge({ left: 6, width: 4 })],
        });
        this.mountainDeadEndW_caveEmpty = this.metascreen({
            id: 0xaa,
            icon: icon `∩
      |█∩█|
      |▐ ▐|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' p  ',
            connect: '6',
            exits: [cave(0x38)],
        });
        this.mountainPathNE = this.metascreen({
            id: 0xab,
            icon: icon `└
      |█ █|
      |█  |
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: 'p  p',
            connect: '2e',
            exits: [rightEdge({ top: 6, height: 4 }), topEdge({ left: 6, width: 4 })],
        });
        this.mountainBranchWSE = this.metascreen({
            id: 0xac,
            icon: icon `┬
      |███|
      |   |
      |█ █|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' ppp',
            connect: '6ae',
        });
        this.mountainPathW_cave = this.metascreen({
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
        this.mountainPathE_slopeS = this.metascreen({
            id: 0xae,
            icon: icon `╓
      |███|
      |█  |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: '  sp',
            connect: 'ae',
        });
        this.mountainPathNW = this.metascreen({
            id: 0xaf,
            icon: icon `┘
      |█ █|
      |  █|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: 'pp  ',
            connect: '26',
            exits: [leftEdge({ top: 6, height: 4 }), topEdge({ left: 6, width: 4 })],
        });
        this.mountainCave_empty = this.metascreen({
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
        this.mountainPathE_cave = this.metascreen({
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
        this.mountainPathWE_slopeN = this.metascreen({
            id: 0xb2,
            icon: icon `╨
      |█↓█|
      |   |
      |███|`,
            tilesets: { mountain: {} },
            edges: 'sp p',
            connect: '26e',
        });
        this.mountainDeadEndW = this.metascreen({
            id: 0xb3,
            icon: icon `╴
      |███|
      |  █|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' p  ',
            connect: '6',
        });
        this.mountainPathWE = this.metascreen({
            id: 0xb4,
            icon: icon `─
      |███|
      |   |
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' p p',
            connect: '6e',
            exits: [leftEdge({ top: 6, height: 4 }), rightEdge({ top: 6, height: 4 })],
        });
        this.mountainArena_gate = this.metascreen({
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
            exits: [{ ...upStair(0x47, 3), type: 'cave' }],
            flag: 'custom:false',
        });
        this.mountainPathN_slopeS_cave = this.metascreen({
            id: 0xb6,
            icon: icon `∩
      |█┋∩|
      |▌ ▐|
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 'l s ',
            connect: '2a',
            exits: [cave(0x5a), topEdge()],
        });
        this.mountainPathWE_slopeNS = this.metascreen({
            id: 0xb7,
            icon: icon `╫
      |█↓█|
      |   |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 'spsp',
            connect: '26ae',
        });
        this.mountainPathWE_slopeN_cave = this.metascreen({
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
        this.mountainPathWS = this.metascreen({
            id: 0xb9,
            icon: icon `┐
      |███|
      |  █|
      |█ █|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            edges: ' pp ',
            connect: '6a',
            exits: [leftEdge({ top: 6, height: 4 }), bottomEdge({ left: 6, width: 4 })],
        });
        this.mountainSlope = this.metascreen({
            id: 0xba,
            icon: icon `↓
      |█↓█|
      |█↓█|
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 's s ',
            connect: '2a',
        });
        this.mountainRiver = this.metascreen({
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
        this.mountainPathE_gate = this.metascreen({
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
        this.mountainPathWE_inn = this.metascreen({
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
        this.mountainPathWE_bridgeOverSlope = this.metascreen({
            id: 0xbd,
            icon: icon `═
      |█↓█|
      | ═ |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 'spsp',
            connect: '6e',
            exits: [seamlessUp(0xb6, 4)],
        });
        this.mountainPathWE_bridgeOverRiver = this.metascreen({
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
        this.mountainSlope_underBridge = this.metascreen({
            id: 0xbe,
            icon: icon `↓
      |█↓█|
      | ═ |
      |█↓█|`,
            tilesets: { mountain: {} },
            edges: 'spsp',
            connect: '2a',
            exits: [seamlessDown(0xc6, 4)],
        });
        this.mountainEmpty = this.metascreen({
            id: 0xbf,
            icon: icon `
      |███|
      |███|
      |███|`,
            tilesets: { mountain: {}, mountainRiver: {} },
            feature: ['empty'],
            edges: '    ',
        });
        this.boundaryS = this.metascreen({
            id: 0xc0,
            icon: icon `
      |   |
      |▄▄▄|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'o^ ^',
        });
        this.boundaryN_cave = this.metascreen({
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
        this.cornerSE_cave = this.metascreen({
            id: 0xc2,
            icon: icon `
      | ▐█|
      |▄∩█|
      |███|`,
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<^  ',
            exits: [cave(0x5a)],
        });
        this.waterfall = this.metascreen({
            id: 0xc3,
            icon: icon `
      |   |
      |↓↓↓|
      |   |`,
            tilesets: { sea: {} },
            edges: 'oooo',
        });
        this.whirlpoolBlocker = this.metascreen({
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
        this.beachExitN = this.metascreen({
            id: 0xc5,
            icon: icon `
      |█ █|
      |█╱▀|
      |█▌ |`,
            tilesets: { sea: {} },
            edges: 'n >v',
            exits: [topEdge({ left: 9 })],
        });
        this.whirlpoolOpen = this.metascreen({
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
        this.quicksandOpen = this.metascreen({
            id: 0xc6,
            icon: icon `
      |   |
      | ╳ |
      |   |`,
            tilesets: { desert: {} },
            feature: ['whirlpool'],
            edges: 'oooo',
        });
        this.lighthouseEntrance = this.metascreen({
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
        this.beachCave = this.metascreen({
            id: 0xc8,
            icon: icon `
      |█∩█|
      |▀╲█|
      |   |`,
            tilesets: { sea: {} },
            edges: ' vov',
            exits: [cave(0x28)],
        });
        this.beachCabinEntrance = this.metascreen({
            id: 0xc9,
            icon: icon `
      | ∩█|
      | ╲▀|
      |█▄▄|`,
            tilesets: { sea: {} },
            feature: ['cabin'],
            edges: '<^ b',
            exits: [door(0x55), rightEdge({ top: 8, height: 3 })],
        });
        this.oceanShrine = this.metascreen({
            id: 0xca,
            icon: icon `
      |▗▄▖|
      |▐*▌|
      |▝ ▘|`,
            tilesets: { sea: {} },
            feature: ['altar'],
            edges: 'oooo',
        });
        this.pyramidEntrance = this.metascreen({
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
        this.cryptEntrance = this.metascreen({
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
        this.oasisLake = this.metascreen({
            id: 0xcd,
            icon: icon `
      | ^ |
      |vOv|
      | vv|`,
            tilesets: { desert: {} },
            feature: ['lake'],
            edges: 'oo3o',
        });
        this.desertCaveEntrance = this.metascreen({
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
        this.oasisCave = this.metascreen({
            id: 0xcf,
            icon: icon `
      | vv|
      |▄∩v|
      |█▌ |`,
            tilesets: { desert: {} },
            edges: '3^>o',
            exits: [upStair(0x37)],
        });
        this.channelEndW_cave = this.metascreen({
            id: 0xd0,
            icon: icon `
      |██∩|
      |══ |
      |███|`,
            tilesets: { dolphinCave: {} },
            exits: [upStair(0x57)],
        });
        this.boatChannel = this.metascreen({
            id: 0xd1,
            icon: icon `
      |███|
      |▀▀▀|
      |▄▄▄|`,
            tilesets: { sea: {} },
            edges: ' b b',
            exits: [{ ...rightEdge({ top: 8, height: 3 }), entrance: 0x9ce8 },
                leftEdge({ top: 8, height: 3 })],
        });
        this.channelWE = this.metascreen({
            id: 0xd2,
            icon: icon `
      |███|
      |═══|
      |███|`,
            tilesets: { dolphinCave: {} },
        });
        this.riverCaveNWSE = this.metascreen({
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
        this.riverCaveNS = this.metascreen({
            id: 0xd4,
            icon: icon `
      |│║│|
      |│║│|
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r r ',
            connect: '19:3a',
        });
        this.riverCaveWE = this.metascreen({
            id: 0xd5,
            icon: icon `
      |───|
      |═══|
      |───|`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' r r',
            connect: '5d:7f',
        });
        this.riverCaveNS_bridge = this.metascreen({
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
        this.riverCaveWE_bridge = this.metascreen({
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
        this.riverCaveSE = this.metascreen({
            id: 0xd8,
            icon: icon `
      |┌──|
      |│╔═|
      |│║┌|`,
            tilesets: { cave: {}, fortress: {} },
            edges: '  rr',
            connect: '9d:af',
        });
        this.riverCaveWS = this.metascreen({
            id: 0xd9,
            icon: icon `
      |──┐|
      |═╗│|
      |┐║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' rr ',
            connect: '5a:79',
        });
        this.riverCaveNE = this.metascreen({
            id: 0xda,
            icon: icon `
      |│║└|
      |│╚═|
      |└──|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r  r',
            connect: '1f:3d',
        });
        this.riverCaveNW = this.metascreen({
            id: 0xdb,
            icon: icon `
      |┘║│|
      |═╝│|
      |──┘|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'rr  ',
            connect: '15:37',
        });
        this.riverCaveWE_passageN = this.metascreen({
            id: 0xdc,
            icon: icon `╧
      |─┴─|
      |═══|
      |───|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'cr r',
            connect: '25d:7f',
        });
        this.riverCaveWE_passageS = this.metascreen({
            id: 0xdd,
            icon: icon `╤
      |───|
      |═══|
      |─┬─|`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' rcr',
            connect: '5d:7af',
        });
        this.riverCaveNS_passageW = this.metascreen({
            id: 0xde,
            icon: icon `╢
      |│║│|
      |┤║│|
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'rcr ',
            connect: '169:3b',
        });
        this.riverCaveNS_passageE = this.metascreen({
            id: 0xdf,
            icon: icon `╟
      |│║│|
      |│║├|
      |│║│|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'r rc',
            connect: '19:3be',
        });
        this.wideHallNE = this.metascreen({
            id: 0xe0,
            icon: icon `
      | ┃ |
      | ┗━|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'w  w',
            connect: '2e',
        });
        this.goaWideHallNE = this.metascreen({
            id: 0xe0,
            icon: icon `
      |│┃└|
      |│┗━|
      |└──|`,
            tilesets: { labyrinth: {} },
            edges: 'w  w',
            connect: '1f|2e|3d',
        });
        this.goaWideHallNE_blockedLeft = this.metascreen({
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
        this.goaWideHallNE_blockedRight = this.metascreen({
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
        this.wideHallNW = this.metascreen({
            id: 0xe1,
            icon: icon `
      | ┃ |
      |━┛ |
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'ww  ',
            connect: '26',
        });
        this.goaWideHallNW = this.metascreen({
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
        this.goaWideHallNW_blockedRight = this.metascreen({
            id: 0xe1,
            icon: icon `
      |┘┃│|
      |━┛ |
      |──┘|`,
            tilesets: { labyrinth: {} },
            edges: 'ww  ',
            connect: '15|26|3|7',
        });
        this.goaWideHallNW_blockedLeft = this.metascreen({
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
        this.wideHallSE = this.metascreen({
            id: 0xe2,
            icon: icon `
      |   |
      | ┏━|
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: '  ww',
            connect: 'ae',
        });
        this.goaWideHallSE = this.metascreen({
            id: 0xe2,
            icon: icon `
      |┌──|
      |│┏━|
      |│┃┌|`,
            tilesets: { labyrinth: {} },
            edges: '  ww',
            connect: '9d|ae|bf',
        });
        this.goaWideHallSE_blockedLeft = this.metascreen({
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
        this.goaWideHallSE_blockedRight = this.metascreen({
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
        this.wideHallWS = this.metascreen({
            id: 0xe3,
            icon: icon `
      |   |
      |━┓ |
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' ww ',
            connect: '6a',
        });
        this.goaWideHallWS = this.metascreen({
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
        this.goaWideHallWS_blockedRight = this.metascreen({
            id: 0xe3,
            icon: icon `
      |──┐|
      |━┓ |
      |┐┃│|`,
            tilesets: { labyrinth: {} },
            edges: ' ww ',
            connect: '5|b|6a|79',
        });
        this.goaWideHallWS_blockedLeft = this.metascreen({
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
        this.goaWideHallNS_stairs = this.metascreen({
            id: 0xe4,
            icon: icon `
      |├┨│|
      |│┃│|
      |│┠┤|`,
            tilesets: { labyrinth: {} },
            edges: 'w w ',
            connect: '1239ab',
        });
        this.goaWideHallNS_stairsBlocked13 = this.metascreen({
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
        this.goaWideHallNS_stairsBlocked24 = this.metascreen({
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
        this.wideHallNS_deadEnds = this.metascreen({
            id: 0xe5,
            icon: icon `
      | ╹ |
      |   |
      | ╻ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'w w ',
            connect: '2|a',
        });
        this.goaWideHallNS_deadEnd = this.metascreen({
            id: 0xe5,
            icon: icon `
      |│╹│|
      |├─┤|
      |│╻│|`,
            tilesets: { labyrinth: {} },
            edges: 'w w ',
            connect: '139b|2|a',
        });
        this.goaWideHallNS_deadEndBlocked24 = this.metascreen({
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
        this.goaWideHallNS_deadEndBlocked13 = this.metascreen({
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
        this.wideHallNWSE = this.metascreen({
            id: 0xe6,
            icon: icon `
      | ┃ |
      |━╋━|
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'wwww',
            connect: '26ae',
        });
        this.goaWideHallNWSE = this.metascreen({
            id: 0xe6,
            icon: icon `
      |┘┃└|
      |━╋━|
      |┐┃┌|`,
            tilesets: { labyrinth: {} },
            edges: 'wwww',
            connect: '26ae|15|3d|79|bf',
        });
        this.goaWideHallNWSE_blocked13 = this.metascreen({
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
        this.goaWideHallNWSE_blocked24 = this.metascreen({
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
        this.wideHallNWE = this.metascreen({
            id: 0xe7,
            icon: icon `
      | ┃ |
      |━┻━|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'ww w',
            connect: '26e',
        });
        this.goaWideHallNWE = this.metascreen({
            id: 0xe7,
            icon: icon `
      |┘┃└|
      |━┻━|
      |───|`,
            tilesets: { labyrinth: {} },
            edges: 'ww w',
            connect: '26e|15|3d|7f',
        });
        this.goaWideHallNWE_blockedTop = this.metascreen({
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
        this.wideHallWSE = this.metascreen({
            id: 0xe8,
            icon: icon `
      |   |
      |━┳━|
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' www',
            connect: '6ae',
        });
        this.goaWideHallWSE = this.metascreen({
            id: 0xe8,
            icon: icon `
      |───|
      |━┳━|
      |┐┃┌|`,
            tilesets: { labyrinth: {} },
            edges: ' www',
            connect: '6ae|5d|79|bf',
        });
        this.goaWideHallWSE_blockedBottom = this.metascreen({
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
        this.wideHallNS_wallTop = this.metascreen({
            id: 0xe9,
            icon: icon `
      | ┆ |
      | ┃ |
      | ┃ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c w',
            connect: '2a',
            exits: [topEdge({ left: 6, width: 4 })],
        });
        this.goaWideHallNS_wallTop = this.metascreen({
            id: 0xe9,
            icon: icon `
      | ┆ |
      |╷┃╷|
      |│┃│|`,
            tilesets: { labyrinth: {} },
            edges: 'c w ',
            connect: '2a|9|b',
            exits: [topEdge({ left: 6, width: 4 })],
        });
        this.wideHallWE = this.metascreen({
            id: 0xea,
            icon: icon `
      |   |
      |━━━|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' w w',
            connect: '6e',
        });
        this.goaWideHallWE = this.metascreen({
            id: 0xea,
            icon: icon `
      |───|
      |━━━|
      |───|`,
            tilesets: { labyrinth: {} },
            edges: ' w w',
            connect: '5d|6e|7f',
        });
        this.pitWE = this.metascreen({
            id: 0xeb,
            icon: icon `
      |   |
      |─╳─|
      |   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['pit'],
            edges: ' c c',
            connect: '6e',
            platform: { type: 'horizontal', coord: 28728 },
        });
        this.pitNS = this.metascreen({
            id: 0xec,
            icon: icon `
      | │ |
      | ╳ |
      | │ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['pit'],
            edges: 'c c ',
            connect: '2a',
            platform: { type: 'vertical', coord: 16504 },
        });
        this.spikesNS_hallS = this.metascreen({
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
        this.spikesNS_hallN = this.metascreen({
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
        this.spikesNS_hallWE = this.metascreen({
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
        this.spikesNS_hallW = this.metascreen({
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
        this.spikesNS_hallE = this.metascreen({
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
        this.riverCave_deadEndsNS = this.metascreen({
            id: 0xf0,
            icon: icon `
      | ╨ |
      |   |
      | ╥ |`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['empty'],
            edges: 'r r ',
            connect: '1:3|9:b',
            poi: [[1, -0x30, 0x48], [1, -0x30, 0x98],
                [1, 0x110, 0x48], [1, 0x110, 0x98]],
        });
        this.riverCave_deadEndsN = this.metascreen({
            id: 0xf0,
            icon: icon `
      | ╨ |
      |   |
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['empty'],
            edges: 'r   ',
            connect: '1:3',
            poi: [[1, -0x30, 0x48], [1, -0x30, 0x98]],
            match: (reachable) => !reachable(-0x30, 0x48) && !reachable(-0x30, 0x98),
        });
        this.riverCave_deadEndsS = this.metascreen({
            id: 0xf0,
            icon: icon `
      |   |
      |   |
      | ╥ |`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['empty'],
            edges: '  r ',
            connect: '9:b',
            poi: [[1, 0x110, 0x48], [1, 0x110, 0x98]],
            match: (reachable) => !reachable(-0x30, 0x48) && !reachable(-0x30, 0x98),
        });
        this.riverCave_deadEndsWE = this.metascreen({
            id: 0xf1,
            icon: icon `
      |   |
      |╡ ╞|
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['empty'],
            edges: ' r r',
            connect: '5:7|d:f',
            poi: [[1, 0x60, 0x108], [1, 0xa0, 0x108],
                [1, 0x60, -0x28], [1, 0xa0, -0x28]],
        });
        this.riverCave_deadEndsW = this.metascreen({
            id: 0xf1,
            icon: icon `
      |   |
      |╡  |
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['empty'],
            edges: ' r  ',
            connect: '5:7',
            poi: [[1, 0x60, -0x28], [1, 0xa0, -0x28]],
            match: (reachable) => !reachable(0x60, 0x108) && !reachable(0xa0, 0x108),
        });
        this.riverCave_deadEndsE = this.metascreen({
            id: 0xf1,
            icon: icon `
      |   |
      |  ╞|
      |   |`,
            tilesets: { cave: {}, fortress: {} },
            feature: ['empty'],
            edges: '   r',
            connect: 'd:f',
            poi: [[1, 0x60, 0x108], [1, 0xa0, 0x108]],
            match: (reachable) => !reachable(0x60, -0x28) && !reachable(0xa0, -0x28),
        });
        this.riverCaveN_bridge = this.metascreen({
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
        this.riverCaveS_bridge = this.metascreen({
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
        this.riverCaveWSE = this.metascreen({
            id: 0xf3,
            icon: icon `
      |───|
      |═╦═|
      |┐║┌|`,
            tilesets: { cave: {}, fortress: {} },
            edges: ' rrr',
            connect: '5d:79:bf',
        });
        this.riverCaveNWE = this.metascreen({
            id: 0xf4,
            icon: icon `
      |┘║└|
      |═╩═|
      |───|`,
            tilesets: { cave: {}, fortress: {} },
            edges: 'rr r',
            connect: '15:3d:7f',
        });
        this.riverCaveNS_blockedRight = this.metascreen({
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
        this.riverCaveNS_blockedLeft = this.metascreen({
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
        this.spikesNS = this.metascreen({
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
        this.cryptArena_statues = this.metascreen({
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
            exits: [upStair(0x57)],
            flag: 'custom:false',
        });
        this.pyramidArena_draygon = this.metascreen({
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
        this.cryptArena_draygon2 = this.metascreen({
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
            exits: [topEdge({ left: 6, width: 4 })],
            flag: 'custom:false',
        });
        this.cryptArena_entrance = this.metascreen({
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
        this.cryptTeleporter = this.metascreen({
            id: 0xfc,
            tilesets: { pyramid: {}, tower: {} },
            exits: [bottomEdge({ left: 6, width: 4 }), cave(0x57, 'teleporter')],
        });
        this.fortressArena_through = this.metascreen({
            id: 0xfd,
            icon: icon `╽
      |┌┴┐|
      |│ │|
      |┕┳┙|`,
            tilesets: { fortress: {}, pyramid: {} },
            feature: ['arena'],
            edges: 'n*w*',
            allowed: s => s.hasFeature('empty') ? [1, 3] : [],
            connect: '2a',
            exits: [topEdge()],
        });
        this.fortressTrap = this.metascreen({
            id: 0xfe,
            icon: icon `
      |└─┘|
      | ╳ |
      |╶┬╴|`,
            tilesets: { fortress: {}, pyramid: {} },
            feature: ['pit'],
            edges: '  n ',
            connect: 'a',
            exits: [bottomEdge()],
        });
        this.shrine = this.metascreen({
            id: 0xff,
            tilesets: { shrine: {} },
            exits: [bottomEdge({ left: 6, width: 5 })],
        });
        this.inn = this.metascreen({
            id: 0x100,
            tilesets: { house: {} },
            exits: [{ ...door(0x86), entrance: 37992 }],
        });
        this.toolShop = this.metascreen({
            id: 0x101,
            tilesets: { house: {} },
            exits: [{ ...door(0x86), entrance: 37992 }],
        });
        this.armorShop = this.metascreen({
            id: 0x102,
            tilesets: { house: {} },
            exits: [{ ...door(0x86), entrance: 37992 }],
        });
        this.exit = this.metascreen({
            id: ~0x7fff,
            tilesets: {},
            allowed: (s) => (s.data.exits || [])
                .map(e => (edgeTypeMap[e.type] ^ 2))
                .filter(d => d != null),
        });
        for (const key in this) {
            const val = this[key];
            if (val instanceof Metascreen)
                val.name = key;
        }
    }
    metascreen(data) {
        const mut = this;
        const screen = new Metascreen(this.rom, mut.length, data);
        mut[mut.length++] = screen;
        this.screensById.get(screen.id).push(screen);
        for (const tilesetName in data.tilesets) {
            const key = tilesetName;
            const tilesetData = data.tilesets[key];
            if (tilesetData.requires) {
                for (const fix of tilesetData.requires) {
                    this.screensByFix.get(fix).push(screen);
                }
            }
            else {
                this.rom.metatilesets[key].addScreen(screen);
            }
        }
        return screen;
    }
    getById(id, tileset) {
        let out = this.screensById.has(id) ? [...this.screensById.get(id)] : [];
        if (tileset != null) {
            out = out.filter(s => s.isCompatibleWithTileset(tileset));
        }
        return out;
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
                    this.rom.metatilesets[key].addScreen(screen);
                }
            }
        }
    }
    renumber(oldId, newId) {
        const dest = this.screensById.get(newId);
        if (dest.length)
            throw new Error(`ID already used: ${newId}: ${dest}`);
        for (const screen of this.getById(oldId)) {
            screen.unsafeSetId(newId);
            dest.push(screen);
        }
        this.screensById.delete(oldId);
        const oldScreen = this.rom.screens.getScreen(oldId);
        const clone = oldScreen.clone(newId);
        this.rom.screens.setScreen(newId, clone);
        oldScreen.used = false;
        if (oldId < 0)
            this.rom.screens.deleteScreen(oldId);
        this.rom.locations.renumberScreen(oldId, newId);
    }
    checkExitTypes() {
        var _a;
        for (const s in this) {
            const ms = this[s];
            const seen = new Set();
            for (const e of ((_a = ms === null || ms === void 0 ? void 0 : ms.data) === null || _a === void 0 ? void 0 : _a.exits) || []) {
                if (seen.has(e.type))
                    console.log(`duplicate: ${s} ${e.type}`);
                seen.add(e.type);
            }
        }
    }
}
const edgeTypeMap = {
    'edge:top': 0,
    'edge:left': 1,
    'edge:bottom': 2,
    'edge:right': 3,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YXNjcmVlbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21ldGFzY3JlZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDdEMsT0FBTyxFQUFDLFVBQVUsRUFBTSxNQUFNLGlCQUFpQixDQUFDO0FBQ2hELE9BQU8sRUFDQyxVQUFVLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQ2xFLFNBQVMsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxHQUNwRSxNQUFNLHFCQUFxQixDQUFDO0FBRXBDLE9BQU8sRUFBQyxTQUFTLEVBQUUsV0FBVyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhdEQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUF3QyxFQUN4QyxHQUFXLEVBQUUsT0FBWSxFQUN6QixJQUFxQixFQUFFLE1BQXdCO0lBQ3ZFLE9BQU8sQ0FBQyxDQUFhLEVBQUUsSUFBWSxFQUFFLEdBQVEsRUFBVyxFQUFFO1FBRXhELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxPQUFPO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDbkQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6QyxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO1lBQzFELEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxD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LENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDMUMsQ0FBQyxDQUFDO1FBQ00sd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM3QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFDO1lBQ2xDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUNsQixLQUFLLEVBQUUsTUFBTTtZQUNiLE9BQU8sRUFBRSxLQUFLO1lBQ2QsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsS0FBSyxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7U0FDekUsQ0FBQyxDQUFDO1FBQ00sd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM3QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFDO1lBQ2xDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUNsQixLQUFLLEVBQUUsTUFBTTtZQUNiLE9BQU8sRUFBRSxLQUFLO1lBQ2QsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxLQUFLLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxD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QkFBRixFQUFFLENBQUUsSUFBSSwwQ0FBRSxLQUFLLEtBQUksRUFBRSxFQUFFO2dCQUNyQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNsQjtTQUNGO0lBQ0gsQ0FBQztDQUNGO0FBRUQsTUFBTSxXQUFXLEdBQXFDO0lBQ3BELFVBQVUsRUFBRSxDQUFDO0lBQ2IsV0FBVyxFQUFFLENBQUM7SUFDZCxhQUFhLEVBQUUsQ0FBQztJQUNoQixZQUFZLEVBQUUsQ0FBQztDQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG4vL2ltcG9ydCB7U2NyZWVufSBmcm9tICcuL3NjcmVlbi5qcyc7XG5pbXBvcnQge011dGFibGV9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge0RlZmF1bHRNYXB9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtNZXRhc2NyZWVuLCBVaWR9IGZyb20gJy4vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQge01ldGFzY3JlZW5EYXRhLCBDb25uZWN0aW9uVHlwZSxcbiAgICAgICAgYm90dG9tRWRnZSwgYm90dG9tRWRnZUhvdXNlLCBjYXZlLCBkb29yLCBkb3duU3RhaXIsIGljb24sIGxlZnRFZGdlLFxuICAgICAgICByaWdodEVkZ2UsIHNlYW1sZXNzRG93biwgc2VhbWxlc3NVcCwgdG9wRWRnZSwgdXBTdGFpciwgd2F0ZXJmYWxsQ2F2ZSxcbiAgICAgICB9IGZyb20gJy4vbWV0YXNjcmVlbmRhdGEuanMnO1xuaW1wb3J0IHtNZXRhdGlsZXNldCwgTWV0YXRpbGVzZXRzfSBmcm9tICcuL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7U2NyZWVuRml4LCB3aXRoUmVxdWlyZX0gZnJvbSAnLi9zY3JlZW5maXguanMnO1xuXG4vLyBCQVNJQyBQTEFOOiBTY3JlZW4gaXMgdGhlIHBoeXNpY2FsIGFycmF5LCBNZXRhc2NyZWVuIGhhcyB0aGUgZXh0cmEgaW5mby5cbi8vICAgICAgICAgICAgIE9ubHkgTWV0YXNjcmVlbiBpcyB0aWVkIHRvIHNwZWNpZmljIChNZXRhKXRpbGVzZXRzLlxuXG4vKipcbiAqIEFkZHMgYSBmbGFnLXRvZ2dsYWJsZSB3YWxsIGludG8gYSBsYWJ5cmludGggc2NyZWVuLlxuICogQHBhcmFtIGJpdCAgICAgVW5pcXVlIG51bWJlciBmb3IgZWFjaCBjaG9pY2UuIFVzZSAtMSBmb3IgdW5jb25kaXRpb25hbC5cbiAqIEBwYXJhbSB2YXJpYW50IDAgb3IgMSBmb3IgZWFjaCBvcHRpb24uIFVzZSAwIHdpdGggYml0PS0xIGZvciB1bmNvbmRpdGlvbmFsLlxuICogQHBhcmFtIGZsYWcgICAgUG9zaXRpb24ocykgb2YgZmxhZyB3YWxsLlxuICogQHBhcmFtIHVuZmxhZyAgUG9zaXRpb24ocykgb2YgYW4gZXhpc3Rpbmcgd2FsbCB0byByZW1vdmUgY29tcGxldGVseS5cbiAqIEByZXR1cm4gQSBmdW5jdGlvbiB0byBnZW5lcmF0ZSB0aGUgdmFyaWFudC5cbiAqL1xuZnVuY3Rpb24gbGFieXJpbnRoVmFyaWFudChwYXJlbnRGbjogKHM6IE1ldGFzY3JlZW5zKSA9PiBNZXRhc2NyZWVuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBiaXQ6IG51bWJlciwgdmFyaWFudDogMHwxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnOiBudW1iZXJ8bnVtYmVyW10sIHVuZmxhZz86IG51bWJlcnxudW1iZXJbXSkge1xuICByZXR1cm4gKHM6IE1ldGFzY3JlZW4sIHNlZWQ6IG51bWJlciwgcm9tOiBSb20pOiBib29sZWFuID0+IHtcbiAgICAvLyBjaGVjayB2YXJpYW50XG4gICAgaWYgKCgoc2VlZCA+Pj4gYml0KSAmIDEpICE9PSB2YXJpYW50KSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgcGFyZW50ID0gcGFyZW50Rm4ocm9tLm1ldGFzY3JlZW5zKTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0eXBlb2YgZmxhZyA9PT0gJ251bWJlcicgPyBbZmxhZ10gOiBmbGFnKSB7XG4gICAgICByb20uc2NyZWVuc1tzLmRhdGEuaWRdLnNldDJkKHBvcywgW1sweDE5LCAweDE5XSwgWzB4MWIsIDB4MWJdXSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9zIG9mIHR5cGVvZiB1bmZsYWcgPT09ICdudW1iZXInID8gW3VuZmxhZ10gOiB1bmZsYWcgfHwgW10pIHtcbiAgICAgIHJvbS5zY3JlZW5zW3MuZGF0YS5pZF0uc2V0MmQocG9zLCBbWzB4YzUsIDB4YzVdLCBbMHhkMCwgMHhjNV1dKTtcbiAgICB9XG4gICAgaWYgKHMuZmxhZyAhPT0gJ2Fsd2F5cycpIHtcbiAgICAgIC8vIHBhcmVudCBpcyBhIG5vcm1hbGx5LW9wZW4gc2NyZWVuIGFuZCB3ZSdyZSBjbG9zaW5nIGl0LlxuICAgICAgcGFyZW50LmZsYWcgPSAnYWx3YXlzJztcbiAgICB9IGVsc2UgaWYgKHVuZmxhZyAhPSBudWxsKSB7XG4gICAgICAvLyBwYXJlbnQgaXMgdGhlIG90aGVyIGFsdGVybmF0aXZlIC0gZGVsZXRlIGl0LlxuICAgICAgcGFyZW50LnJlbW92ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTsgICAgXG4gIH07XG59XG5cbi8vIGV4dGVuZHMgU2V0PE1ldGFzY3JlZW4+ID8/P1xuZXhwb3J0IGNsYXNzIE1ldGFzY3JlZW5zIHtcblxuICByZWFkb25seSBbaW5kZXg6IG51bWJlcl06IE1ldGFzY3JlZW47XG4gIHJlYWRvbmx5IGxlbmd0aCA9IDA7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzY3JlZW5zQnlGaXggPSBuZXcgRGVmYXVsdE1hcDxTY3JlZW5GaXgsIE1ldGFzY3JlZW5bXT4oKCkgPT4gW10pO1xuICBwcml2YXRlIHJlYWRvbmx5IHNjcmVlbnNCeUlkID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBNZXRhc2NyZWVuW10+KCgpID0+IFtdKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHsgLy8gYWRkIG5hbWVzXG4gICAgICBjb25zdCB2YWwgPSB0aGlzW2tleV07XG4gICAgICBpZiAodmFsIGluc3RhbmNlb2YgTWV0YXNjcmVlbikgdmFsLm5hbWUgPSBrZXk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBtZXRhc2NyZWVuKGRhdGE6IE1ldGFzY3JlZW5EYXRhKTogTWV0YXNjcmVlbiB7XG4gICAgY29uc3QgbXV0ID0gdGhpcyBhcyBNdXRhYmxlPHRoaXM+O1xuICAgIGNvbnN0IHNjcmVlbiA9IG5ldyBNZXRhc2NyZWVuKHRoaXMucm9tLCBtdXQubGVuZ3RoIGFzIFVpZCwgZGF0YSk7XG4gICAgbXV0W211dC5sZW5ndGgrK10gPSBzY3JlZW47XG4gICAgdGhpcy5zY3JlZW5zQnlJZC5nZXQoc2NyZWVuLmlkKS5wdXNoKHNjcmVlbik7XG4gICAgZm9yIChjb25zdCB0aWxlc2V0TmFtZSBpbiBkYXRhLnRpbGVzZXRzKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aWxlc2V0TmFtZSBhcyBrZXlvZiBNZXRhdGlsZXNldHM7XG4gICAgICBjb25zdCB0aWxlc2V0RGF0YSA9IGRhdGEudGlsZXNldHNba2V5XSE7XG4gICAgICBpZiAodGlsZXNldERhdGEucmVxdWlyZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBmaXggb2YgdGlsZXNldERhdGEucmVxdWlyZXMpIHtcbiAgICAgICAgICB0aGlzLnNjcmVlbnNCeUZpeC5nZXQoZml4KS5wdXNoKHNjcmVlbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICh0aGlzLnJvbS5tZXRhdGlsZXNldHNba2V5XSBhcyBNZXRhdGlsZXNldCkuYWRkU2NyZWVuKHNjcmVlbilcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNjcmVlbjtcbiAgfVxuXG4gIGdldEJ5SWQoaWQ6IG51bWJlciwgdGlsZXNldD86IG51bWJlcik6IE1ldGFzY3JlZW5bXSB7XG4gICAgbGV0IG91dCA9IHRoaXMuc2NyZWVuc0J5SWQuaGFzKGlkKSA/IFsuLi50aGlzLnNjcmVlbnNCeUlkLmdldChpZCldIDogW107XG4gICAgaWYgKHRpbGVzZXQgIT0gbnVsbCkge1xuICAgICAgb3V0ID0gb3V0LmZpbHRlcihzID0+IHMuaXNDb21wYXRpYmxlV2l0aFRpbGVzZXQodGlsZXNldCkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgcmVnaXN0ZXJGaXgoZml4OiBTY3JlZW5GaXgsIHNlZWQ/OiBudW1iZXIpIHtcbiAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLnNjcmVlbnNCeUZpeC5nZXQoZml4KSkge1xuICAgICAgLy8gTG9vayBmb3IgYW4gdXBkYXRlIHNjcmlwdCBhbmQgcnVuIGl0IGZpcnN0LiAgSWYgaXQgcmV0dXJucyBmYWxzZSB0aGVuXG4gICAgICAvLyBjYW5jZWwgdGhlIG9wZXJhdGlvbiBvbiB0aGlzIHNjcmVlbi5cbiAgICAgIGNvbnN0IHVwZGF0ZSA9XG4gICAgICAgICAgKHNjcmVlbi5kYXRhLnVwZGF0ZSB8fCBbXSkuZmluZCgodXBkYXRlKSA9PiB1cGRhdGVbMF0gPT09IGZpeCk7XG4gICAgICBpZiAodXBkYXRlKSB7XG4gICAgICAgIGlmIChzZWVkID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgU2VlZCByZXF1aXJlZCBmb3IgdXBkYXRlYCk7XG4gICAgICAgIGlmICghdXBkYXRlWzFdKHNjcmVlbiwgc2VlZCwgdGhpcy5yb20pKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIEZvciBlYWNoIHRpbGVzZXQsIHJlbW92ZSB0aGUgcmVxdWlyZW1lbnQsIGFuZCBpZiBpdCdzIGVtcHR5LCBhZGQgdGhlXG4gICAgICAvLyBzY3JlZW4gdG8gdGhlIHRpbGVzZXQuXG4gICAgICBmb3IgKGNvbnN0IHRpbGVzZXROYW1lIGluIHNjcmVlbi5kYXRhLnRpbGVzZXRzKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IHRpbGVzZXROYW1lIGFzIGtleW9mIE1ldGF0aWxlc2V0cztcbiAgICAgICAgY29uc3QgZGF0YSA9IHNjcmVlbi5kYXRhLnRpbGVzZXRzW2tleV0hO1xuICAgICAgICBpZiAoIWRhdGEucmVxdWlyZXMpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBpbmRleCA9IGRhdGEucmVxdWlyZXMuaW5kZXhPZihmaXgpO1xuICAgICAgICBpZiAoaW5kZXggPCAwKSBjb250aW51ZTtcbiAgICAgICAgZGF0YS5yZXF1aXJlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBpZiAoIWRhdGEucmVxdWlyZXMubGVuZ3RoKSB7XG4gICAgICAgICAgKHRoaXMucm9tLm1ldGF0aWxlc2V0c1trZXldIGFzIE1ldGF0aWxlc2V0KS5hZGRTY3JlZW4oc2NyZWVuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGFuZ2UgdGhlIHNjcmVlbiB3aG9zZSBjdXJyZW50IGlkIGlzIGBvbGRJZGAgdG8gaGF2ZSBgbmV3SWRgIGFzIGl0c1xuICAgKiBzY3JlZW4gSUQuICBVcGRhdGVzIGFsbCByZWxldmFudCBsaW5rcy5cbiAgICovXG4gIHJlbnVtYmVyKG9sZElkOiBudW1iZXIsIG5ld0lkOiBudW1iZXIpIHtcbiAgICBjb25zdCBkZXN0ID0gdGhpcy5zY3JlZW5zQnlJZC5nZXQobmV3SWQpO1xuICAgIGlmIChkZXN0Lmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKGBJRCBhbHJlYWR5IHVzZWQ6ICR7bmV3SWR9OiAke2Rlc3R9YCk7XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5nZXRCeUlkKG9sZElkKSkge1xuICAgICAgc2NyZWVuLnVuc2FmZVNldElkKG5ld0lkKTtcbiAgICAgIGRlc3QucHVzaChzY3JlZW4pO1xuICAgIH1cbiAgICB0aGlzLnNjcmVlbnNCeUlkLmRlbGV0ZShvbGRJZCk7XG4gICAgLy8gVE9ETyAtIHNob3VsZCB0aGlzIGJlIGVuY2Fwc3VsYXRlZCBpbiBTY3JlZW5zPyBwcm9iYWJseS4uLlxuICAgIGNvbnN0IG9sZFNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnMuZ2V0U2NyZWVuKG9sZElkKTtcbiAgICBjb25zdCBjbG9uZSA9IG9sZFNjcmVlbi5jbG9uZShuZXdJZCk7XG4gICAgdGhpcy5yb20uc2NyZWVucy5zZXRTY3JlZW4obmV3SWQsIGNsb25lKTtcbiAgICBvbGRTY3JlZW4udXNlZCA9IGZhbHNlO1xuICAgIGlmIChvbGRJZCA8IDApIHRoaXMucm9tLnNjcmVlbnMuZGVsZXRlU2NyZWVuKG9sZElkKTtcbiAgICB0aGlzLnJvbS5sb2NhdGlvbnMucmVudW1iZXJTY3JlZW4ob2xkSWQsIG5ld0lkKTtcbiAgfVxuXG4gIHJlYWRvbmx5IG92ZXJ3b3JsZEVtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gIH0pO1xuICAvLyBib3VuZGFyeVdfdHJlZXM6ID8/P1xuICByZWFkb25seSBib3VuZGFyeVdfdHJlZXMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDAxLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paMIHxcbiAgICAgIHzilojiloxefFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3NdfSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYVRyZWVzXX19LFxuICAgIGVkZ2VzOiAnPiA+bycsIC8vIG8gPSBvcGVuXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeVcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDAyLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paMIHxcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJz4gPm8nLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlFX3JvY2tzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfC7ilpDiloh8XG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwu4paQ4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX0sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFSb2Nrc119fSxcbiAgICBlZGdlczogJzxvPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpDiloh8XG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc8bzwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGxvbmdHcmFzc1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDA1LFxuICAgIGljb246IGljb25gXG4gICAgICB8dnYgfFxuICAgICAgfCB2dnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGdyYXNzOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NdfX0sXG4gICAgZWRnZXM6ICdsb29vJywgLy8gbCA9IGxvbmcgZ3Jhc3NcbiAgfSk7XG4gIHJlYWRvbmx5IGxvbmdHcmFzc04gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDA2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCB2dnxcbiAgICAgIHx2diB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGdyYXNzOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NdfX0sXG4gICAgZWRnZXM6ICdvb2xvJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5U19yb2NrcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgLiB8XG4gICAgICB84paE4paE4paEfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3NdfX0sXG4gICAgZWRnZXM6ICdvXiBeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGZvcnRyZXNzVG93bkVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHsgLy8gZ29hXG4gICAgaWQ6IDB4MDgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4oip4paIfFxuICAgICAgfCAgIHxgLFxuICAgIC8vIFRPRE8gLSBlbnRyYW5jZSFcbiAgICAvLyBUT0RPIC0gcmlnaHQgZWRnZSB3YW50cyB0b3AtaGFsZiBtb3VudGFpbjsgbGVmdCBlZGdlIHRvcCBjYW4gaGF2ZVxuICAgIC8vICAgICAgICBhbnkgdG9wIGhhbGYgKGJvdHRvbSBoYWxmIHBsYWluKSwgdG9wIGVkZ2UgY2FuIGhhdmUgYW55XG4gICAgLy8gICAgICAgIGxlZnQtaGFsZiAocmlnaHQtaGFsZiBtb3VudGFpbilcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgZWRnZXM6ICcgdm92JyxcbiAgICBleGl0czogW3suLi51cFN0YWlyKDB4YTYsIDMpLCB0eXBlOiAnZm9ydHJlc3MnfV0sXG4gIH0pO1xuICByZWFkb25seSBiZW5kU0VfbG9uZ0dyYXNzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwOSxcbiAgICBpY29uOiBpY29uYOKWl1xuICAgICAgfCB2IHxcbiAgICAgIHx2duKWhHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICdvbzxeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXRXX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oeyAvLyBuZWFyIHNhaGFyYSwgZm9nIGxhbXBcbiAgICBpZDogMHgwYSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHwgIOKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnIG4gICcsIC8vIG4gPSBuYXJyb3dcbiAgICBleGl0czogW2NhdmUoMHg0OCksIGxlZnRFZGdlKHt0b3A6IDZ9KV0sXG4gIH0pO1xuICByZWFkb25seSBiZW5kTkVfZ3Jhc3NSb2NrcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGIsXG4gICAgaWNvbjogaWNvbmDilp1cbiAgICAgIHwu4paQ4paIfFxuICAgICAgfCAg4paAfFxuICAgICAgfDs7O3xgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5SaXZlclNob3J0R3Jhc3NdfSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFNob3J0R3Jhc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRSb2Nrc119fSxcbiAgICBlZGdlczogJzxvc3YnLCAvLyBzID0gc2hvcnQgZ3Jhc3NcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lck5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwYyxcbiAgICBpY29uOiBpY29uYOKWm1xuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilogg4paAfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJyAgPnYnLFxuICB9KTtcbiAgLy8gTk9URTogdGhpcyB2ZXJzaW9uIGhhcyBzbGlnaHRseSBuaWNlciBtb3VudGFpbnMgaW4gc29tZSBjYXNlcy5cbiAgcmVhZG9ubHkgb3ZlcndvcmxkRW1wdHlfYWx0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwYyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgbWF0Y2g6ICgpID0+IGZhbHNlLFxuICB9KTtcbiAgcmVhZG9ubHkgY29ybmVyTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDBkLFxuICAgIGljb246IGljb25g4pacXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWgOKWiOKWiHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICcgdjwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lclNXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwZSxcbiAgICBpY29uOiBpY29uYOKWmVxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4paI4paEfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPiAgXicsXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGYsXG4gICAgaWNvbjogaWNvbmDilp9cbiAgICAgIHwg4paQ4paIfFxuICAgICAgfOKWhOKWiOKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzxeICAnLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDEwLFxuICAgIGljb246IGljb25g4pW2XG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119fSxcbiAgICBlZGdlczogJzxvPG4nLFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDZ9KV0sXG4gICAgLy8gVE9ETyAtIGVkZ2VcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5Tl90cmVlcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paA4paA4paAfFxuICAgICAgfCBeIHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge30sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFUcmVlc119fSxcbiAgICBlZGdlczogJyB2b3YnLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJpZGdlVG9Qb3J0b2EgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDEyLFxuICAgIGljb246IGljb25g4pW0XG4gICAgICB84pWQICB8XG4gICAgICB84pWe4pWQ4pWQfFxuICAgICAgfOKUgiAgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIC8vIFRPRE8gLSB0aGlzIGlzIHN1cGVyIGN1c3RvbSwgbm8gZWRnZXMgZm9yIGl0P1xuICAgIC8vIEl0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmcsIGF0IGxlYXN0LlxuICAgIGZlYXR1cmU6IFsncG9ydG9hMyddLFxuICAgIGVkZ2VzOiAnMio+cicsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiAxfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2xvcGVBYm92ZVBvcnRvYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojihpPiloh8XG4gICAgICB84paI4oaT4paAfFxuICAgICAgfOKUgiAgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsncG9ydG9hMiddLFxuICAgIGVkZ2VzOiAnMSoydicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckJlbmRTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHx3ICB8XG4gICAgICB8IOKVlOKVkHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ29vcnInLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlXX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDE1LFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paMIHxcbiAgICAgIHzilojiiKkgfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnPiA+bycsXG4gICAgZXhpdHM6IFtjYXZlKDB4ODkpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNixcbiAgICBpY29uOiBpY29uYOKVtVxuICAgICAgfOKWiCDiloh8XG4gICAgICB84paAIOKWgHxcbiAgICAgIHwgXiB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9fSwgLy8gc2VhIGhhcyBubyBuZWVkIGZvciBleGl0cz9cbiAgICBlZGdlczogJ252b3YnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSgpXSxcbiAgICAvLyBUT0RPIC0gZWRnZVxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJXRV93b29kZW5CcmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDE3LFxuICAgIGljb246IGljb25g4pWQXG4gICAgICB8ICAgfFxuICAgICAgfOKVkOKVkeKVkHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdvcm9yJyxcbiAgICBleGl0czogW3NlYW1sZXNzVXAoMHg3NyksIHNlYW1sZXNzRG93bigweDg3KV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckJvdW5kYXJ5RV93YXRlcmZhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDE4LFxuICAgIGljb246IGljb25g4pWhXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHzilZDilZAvfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICc8cjwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5RV9jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpDiloh8XG4gICAgICB8duKIqeKWiHxcbiAgICAgIHx24paQ4paIfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge30sXG4gICAgICAgICAgICAgICBncmFzczoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzXX0sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRMb25nR3Jhc3NdfX0sXG4gICAgZWRnZXM6ICc8bzwgJyxcbiAgICBleGl0czogW2NhdmUoMHg1OCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFdfc291dGh3ZXN0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxYSxcbiAgICBpY29uOiBpY29uYOKVtFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paAIOKWhHxcbiAgICAgIHziloTilojiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3NdfSxcbiAgICAgICAgICAgICAgIC8vIFNlYSBoYXMgbm8gbmVlZCBmb3IgdGhpcyBzY3JlZW4/ICBHbyB0byBzb21lIG90aGVyIGJlYWNoP1xuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3NdfX0sXG4gICAgLy8gTk9URTogdGhlIGVkZ2UgaXMgbm90ICduJyBiZWNhdXNlIGl0J3Mgb2ZmLWNlbnRlci5cbiAgICBlZGdlczogJz4qIF4nLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogMHhifSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbmFkYXJlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxYixcbiAgICAvL2ljb246ICc/JyxcbiAgICAvL21pZ3JhdGVkOiAweDIwMDAsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGRvb3IoMHgyMyksXG4gICAgICAgICAgICBkb29yKDB4MjUsICdkb29yMicpLCBkb29yKDB4MmEsICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd25FeGl0VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWMsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWgCBefFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9fSxcbiAgICBlZGdlczogJz5uPm8nLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogOH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxZCxcbiAgICBpY29uOiBpY29uYCB8XG4gICAgICB8Ozs7fFxuICAgICAgfCB2IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSxcbiAgICAgICAgICAgICAgIHJpdmVyOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguUml2ZXJTaG9ydEdyYXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5HcmFzc0xvbmdHcmFzc1JlbWFwcGluZ119fSxcbiAgICBlZGdlczogJ3Nvb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93bkV4aXRTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxZSxcbiAgICBpY29uOiBpY29uYOKVt1xuICAgICAgfCBeIHxcbiAgICAgIHziloQg4paEfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRUb3duRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICdvXm5eJyxcbiAgICBleGl0czogW2JvdHRvbUVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FuR2F0ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWYsXG4gICAgLy9pY29uOiAnPycsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7fX0sXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiAzfSksIHJpZ2h0RWRnZSh7dG9wOiA5fSldLFxuICAgIGZsYWc6ICdjdXN0b206ZmFsc2UnLFxuICB9KTsgXG5cbiAgcmVhZG9ubHkgcml2ZXJCcmFuY2hOU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDIwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB8IOKVoOKVkHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3JvcnInLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pWQ4pWQ4pWQfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ29yb3InLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCb3VuZGFyeVNfd2F0ZXJmYWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyMixcbiAgICBpY29uOiBpY29uYOKVqFxuICAgICAgfCDilZEgfFxuICAgICAgfOKWhOKVkeKWhHxcbiAgICAgIHzilogv4paIfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAncl4gXicsXG4gIH0pO1xuICByZWFkb25seSBzaG9ydEdyYXNzU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDIzLFxuICAgIGljb246IGljb25gXG4gICAgICB8Ozs7fFxuICAgICAgfDsgIHxcbiAgICAgIHw7IF58YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgZWRnZXM6ICdzc29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjQsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfDsgIHxcbiAgICAgIHw7diB8XG4gICAgICB8Ozs7fGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIGVkZ2VzOiAnb3NzbycsXG4gIH0pO1xuICByZWFkb25seSBzdG9tSG91c2VPdXRzaWRlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloziiKnilpB8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICAvLyBOT1RFOiBib3R0b20gZWRnZSBlbnRyYW5jZSBpcyBjbGV2ZXJseSBzaGlmdGVkIHRvIGFsaWduIHdpdGggdGhlIGRvb3IuXG4gICAgZXhpdHM6IFtkb29yKDB4NjgpLCBib3R0b21FZGdlKHtzaGlmdDogMC41fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZE5XX3RyZWVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNixcbiAgICBpY29uOiBpY29uYOKWmFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paAIF58XG4gICAgICB8IF5efGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguRGVzZXJ0VHJlZXNdfSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYVJvY2tzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguU2VhVHJlZXNdfX0sXG4gICAgZWRnZXM6ICc+dm9vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NTVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHw7Ozt8XG4gICAgICB8ICA7fFxuICAgICAgfF4gO3xgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5SaXZlclNob3J0R3Jhc3NdfX0sXG4gICAgZWRnZXM6ICdzb29zJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQnJhbmNoTldTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilZEgfFxuICAgICAgfOKVkOKVoyB8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdycnJvJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgIDt8XG4gICAgICB8IHY7fFxuICAgICAgfDs7O3xgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5SaXZlclNob3J0R3Jhc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzUmVtYXBwaW5nXX19LFxuICAgIGVkZ2VzOiAnb29zcycsXG4gIH0pO1xuICByZWFkb25seSB2YWxsZXlCcmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDJhLFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHzilpvilZHilpx8XG4gICAgICB8IOKVkSB8XG4gICAgICB84paZ4pWR4paffGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICduIG4gJyxcbiAgICBleGl0czogW3NlYW1sZXNzVXAoMHg3NyksIHNlYW1sZXNzRG93bigweDg3KSwgdG9wRWRnZSgpLCBib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFNfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmIsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paMIOKWkHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgZGVzZXJ0OiB7fSxcbiAgICAgICAgICAgICAgIC8vIE5vdCBwYXJ0aWN1bGFybHkgdXNlZnVsIHNpbmNlIG5vIGNvbm5lY3RvciBvbiBzb3V0aCBlbmQ/XG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFDYXZlRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICcgIG4gJyxcbiAgICBleGl0czogW2NhdmUoMHg2NyksIGJvdHRvbUVkZ2UoKV1cbiAgfSk7XG4gIHJlYWRvbmx5IG91dHNpZGVXaW5kbWlsbCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmMsXG4gICAgaWNvbjogaWNvbmDilbNcbiAgICAgIHzilojilojilbN8XG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgLy8gVE9ETyAtIGFubm90YXRlIDMgZXhpdHMsIHNwYXduIGZvciB3aW5kbWlsbCBibGFkZVxuICAgIGZsYWc6ICdjdXN0b206ZmFsc2UnLFxuICAgIGZlYXR1cmU6IFsnd2luZG1pbGwnXSxcbiAgICBlZGdlczogJyAgbiAnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDYzKSwgYm90dG9tRWRnZSgpLCBkb29yKDB4ODksICd3aW5kbWlsbCcpLCBkb29yKDB4OGMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd25FeGl0V19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHsgLy8gb3V0c2lkZSBsZWFmIChUT0RPIC0gY29uc2lkZXIganVzdCBkZWxldGluZz8pXG4gICAgaWQ6IDB4MmQsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paE4paE4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSwgLy8gY2F2ZSBlbnRyYW5jZSBicmVha3Mgcml2ZXIgYW5kIG90aGVycy4uLlxuICAgIGVkZ2VzOiAnIG4gICcsXG4gICAgLy8gTk9URTogc3BlY2lhbCBjYXNlIHRoZSBvZGQgZW50cmFuY2UvZXhpdCBoZXJlIChzaG91bGQgYmUgNGEpXG4gICAgZXhpdHM6IFtjYXZlKDB4NGEpLCBsZWZ0RWRnZSh7dG9wOiA1fSldLFxuICAgIGZsYWc6ICdjdXN0b206dHJ1ZScsXG4gIH0pO1xuICByZWFkb25seSByaXZlck5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilZEgfFxuICAgICAgfCDilZEgfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAncm9ybycsXG4gIH0pO1xuICByZWFkb25seSByaXZlck5TX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHx34pWPd3xcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAncm9ybycsXG4gICAgd2FsbDogMHg3NyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQmVuZFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCB34pacfFxuICAgICAgfOKVkOKVl3d8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICc8cnJ2JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5Tl93YXRlcmZhbGxDYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWmy/iloh8XG4gICAgICB84paY4pWR4paAfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIC8vIFRPRE8gLSBmbGFnIHZlcnNpb24gd2l0aG91dCBlbnRyYW5jZT9cbiAgICAvLyAgLSB3aWxsIG5lZWQgYSB0aWxlc2V0IGZpeFxuICAgIGVkZ2VzOiAnIHZydicsXG4gICAgZXhpdHM6IFt3YXRlcmZhbGxDYXZlKDB4NzUpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9wZW5fdHJlZXMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDMyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IF4gfFxuICAgICAgfF4gXnxcbiAgICAgIHwgXiB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0VHJlZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRSb2Nrc119fSxcbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDMzLFxuICAgIGljb246IGljb25g4pW3XG4gICAgICB8IHcgfFxuICAgICAgfOKWhCDiloR8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICAvLyBOT1RFOiBUaGVzZSBmaXhlcyBhcmUgbm90IGxpa2VseSB0byBldmVyIGxhbmQuXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRNYXJzaF19LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhTWFyc2hdfX0sXG4gICAgZWRnZXM6ICdvXm5eJyxcbiAgICBleGl0czogW2JvdHRvbUVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBiZW5kTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDM0LFxuICAgIGljb246IGljb25g4paYXG4gICAgICB84paI4paMIHxcbiAgICAgIHziloDiloAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPnZvbycsXG4gIH0pO1xuICByZWFkb25seSBiZW5kTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDM1LFxuICAgIGljb246IGljb25g4padXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwgIOKWgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzxvb3YnLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzNixcbiAgICBpY29uOiBpY29uYOKWl1xuICAgICAgfCAgIHxcbiAgICAgIHwg4paE4paEfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJ29vPF4nLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzNyxcbiAgICBpY29uOiBpY29uYOKWllxuICAgICAgfCAgIHxcbiAgICAgIHziloTiloQgfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJ29ePm8nLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJQbGFpbl91cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzOCxcbiAgICBpY29uOiBpY29uYOKUtFxuICAgICAgfCDilIogfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICdzdCB0JyxcbiAgICBleGl0czogW3NlYW1sZXNzRG93bigweDA4LCAyKSwgdG9wRWRnZSh7bGVmdDogOH0pXSxcbiAgICAvLyBUT0RPIC0gYW5ub3RhdGUgcG9zc2libGUgc3RhaXJ3YXkgdy8gZmxhZz9cbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyUm9ib3REb29yX2Rvd25TdGFpciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzksXG4gICAgaWNvbjogaWNvbmDilKxcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilIDilKzilIB8XG4gICAgICB8IOKUiiB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgdHN0JyxcbiAgICBleGl0czogW3NlYW1sZXNzVXAoMHhlOCwgMildLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJEeW5hRG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4M2EsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilJTilKzilJh8XG4gICAgICB8IOKUiiB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgIHMgJyxcbiAgICBleGl0czogW2NhdmUoMHg2NywgJ2Rvb3InKV0sXG4gIH0pO1xuICByZWFkb25seSB0b3dlckxvbmdTdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUiiB8XG4gICAgICB8IOKUiiB8XG4gICAgICB8IOKUiiB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICdzIHMgJyxcbiAgICBleGl0czogW2JvdHRvbUVkZ2UoKV0sXG4gICAgLy8gVE9ETyAtIGNvbm5lY3Rpb25zXG4gIH0pO1xuICByZWFkb25seSB0b3dlck1lc2lhUm9vbSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4M2MsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJUZWxlcG9ydGVyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzZCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgY2F2ZSgweDU3LCAndGVsZXBvcnRlcicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNhdmVBYm92ZVBvcnRvYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4M2UsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgMSAnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDY2KV0sXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJORV9mbG93ZXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzZixcbiAgICBpY29uOiBpY29uYOKWnFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloAq4paIfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgLy8gTk9URTogY291bGQgZXh0ZW5kIHRoaXMgdG8gZGVzZXJ0L2V0YyBieSBzd2FwcGluZyB0aGUgN2UvN2YgdGlsZXNcbiAgICAvLyB3aXRoIGUuZy4gYSB3aW5kbWlsbCBvciBjYXN0bGUgdGlsZSB0aGF0J3Mgbm90IHVzZWQgaW4gOWMsIGJ1dFxuICAgIC8vIHdlIHN0aWxsIGRvbid0IGhhdmUgYSBnb29kIHNwcml0ZSB0byB1c2UgZm9yIGl0Li4uXG4gICAgZWRnZXM6ICcgdjwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyRWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDAsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfCAgIHxcbiAgICAgIHzilKQg4pScfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0IHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJFZGdlVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDAsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfCAgIHxcbiAgICAgIHzilKQgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgdCAgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyRWRnZUUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQwLFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICDilJx8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnICAgdCcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlclJvYm90RG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDEsXG4gICAgaWNvbjogaWNvbmDilIBcbiAgICAgIHwgTyB8XG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0IHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJEb29yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0MixcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgdCB0JyxcbiAgICBleGl0czogW2NhdmUoMHg1OCldLFxuICAgIC8vIFRPRE8gLSBjb25uZWN0aW9uc1xuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfYmVkcm9vbSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDMsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hlZCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDQsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGNhdmUoMHg0OSldLFxuICAgIGZsYWc6ICdjdXN0b206ZmFsc2UnLFxuICB9KTtcbiAgLy8gVE9ETyAtIHNlcGFyYXRlIG1ldGFzY3JlZW4gZm9yIHNoZWRXaXRoSGlkZGVuRG9vclxuICByZWFkb25seSB0YXZlcm4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQ1LFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvdXNlX3R3b0JlZHMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQ2LFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRocm9uZVJvb21fYW1hem9uZXMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQ3LFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICAvLyBUT0RPIC0gbmVlZCB0byBmaXggdGhlIHNpbmdsZS13aWR0aCBzdGFpciFcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSh7d2lkdGg6IDN9KSwgZG93blN0YWlyKDB4NGMsIDEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvdXNlX3J1aW5lZFVwc3RhaXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0OCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgZG93blN0YWlyKDB4OWMsIDEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvdXNlX3J1aW5lZERvd25zdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQ5LFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW3VwU3RhaXIoMHg1NiwgMSldLFxuICB9KTtcbiAgcmVhZG9ubHkgZm95ZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDRhLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSh7c2hpZnQ6IDAuNX0pLFxuICAgICAgICAgICAgZG9vcigweDI4KSwgZG9vcigweDUzLCAnZG9vcjInKSwgZG9vcigweDVjLCAnZG9vcjMnKV0sXG4gIH0pO1xuICByZWFkb25seSB0aHJvbmVSb29tX3BvcnRvYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGIsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGRvb3IoMHgyYildLFxuICB9KTtcbiAgcmVhZG9ubHkgZm9ydHVuZVRlbGxlciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGMsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGRvb3IoMHg1NiksIGRvb3IoMHg1OSwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmFja1Jvb20gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDRkLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRvam8gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDRlLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICAvLyBFZGdlIGVudHJhbmNlIHNoaWZ0ZWQgdG8gcHJvcGVybHkgbGluZSB1cCBhdCBzdGFydCBvZiBzdG9tIGZpZ2h0LlxuICAgIC8vIChub3RlIHRoYXQgdGhpcyBjYXVzZXMgdXMgdG8gc2hpZnQgYWxsIG90aGVyIHVzZXMgYXMgd2VsbCkuXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2Uoe3NoaWZ0OiAtMC41fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgd2luZG1pbGxJbnNpZGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDRmLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSh7bGVmdDogOSwgd2lkdGg6IDF9KV0sXG4gIH0pO1xuICByZWFkb25seSBob3Jpem9udGFsVG93bk1pZGRsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gYnJ5bm1hZXIgKyBzd2FuIChUT0RPIC0gc3BsaXQgc28gd2UgY2FuIG1vdmUgZXhpdHMpXG4gICAgaWQ6IDB4NTAsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7fX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NGMpLCBkb29yKDB4NTUsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyeW5tYWVyUmlnaHRfZXhpdEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGJyeW5tYWVyXG4gICAgaWQ6IDB4NTEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogOH0pLCBkb29yKDB4NDEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyeW5tYWVyTGVmdF9kZWFkRW5kID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBicnlubWFlclxuICAgIGlkOiAweDUyLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDQ5KSwgZG9vcigweDRjLCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FuTGVmdF9leGl0VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc3dhblxuICAgIGlkOiAweDUzLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogOX0pLCBkb29yKDB4NDkpLCBkb29yKDB4NWUsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW5SaWdodF9leGl0UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc3dhblxuICAgIGlkOiAweDU0LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogM30pLCBkb29yKDB4NDEpLFxuICAgICAgICAgICAgZG9vcigweDQzLCAnZG9vcjInKSwgZG9vcigweDU3LCAnZG9vcjMnKV0sXG4gIH0pO1xuICByZWFkb25seSBob3Jpem9udGFsVG93bkxlZnRfZXhpdE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHNhaGFyYSwgYW1hem9uZXMgKFRPRE8gLSBzcGxpdCBzbyB3ZSBjYW4gbW92ZSBleGl0cylcbiAgICBpZDogMHg1NSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnaG9yaXpvbnRhbCd9fSxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDB4ZH0pLCBkb29yKDB4NDYpLCBkb29yKDB4NGIsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGFtYXpvbmVzUmlnaHRfZGVhZEVuZCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gYW1hem9uZXNcbiAgICBpZDogMHg1NixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnaG9yaXpvbnRhbCd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg0MCksIGRvb3IoMHg1OCwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2FoYXJhUmlnaHRfZXhpdEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHNhaGFyYVxuICAgIGlkOiAweDU3LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDd9KSwgZG9vcigweDQwKSwgZG9vcigweDY2LCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NTgsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2NhdmUoMHg0NywgJ2ZvcnRyZXNzJyksIGJvdHRvbUVkZ2UoKV0sIC8vIGJvdHRvbSBqdXN0IGluIGNhc2U/XG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NTksXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg2MyksIGRvb3IoMHg4YSwgJ2Rvb3IyJyksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDMsIHdpZHRoOiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgcG9ydG9hU1dfZXhpdFcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHBvcnRvYVxuICAgIGlkOiAweDVhLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA5fSksIGRvb3IoMHg4NiksIHRvcEVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FTRV9leGl0RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NWIsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA5fSksIGRvb3IoMHg3YSksIGRvb3IoMHg4NywgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZHluYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NWMsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIC8vIE5PVEU6IG5vdCByZWFsbHkgYSBnb29kIGV4aXQgdHlwZSBmb3IgdGhpcy4uLlxuICAgIGV4aXRzOiBbe3R5cGU6ICdzdGFpcjpkb3duJywgbWFudWFsOiB0cnVlLCBkaXI6IDIsXG4gICAgICAgICAgICAgZW50cmFuY2U6IDB4YmY4MCwgZXhpdHM6IFtdfV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FGaXNoZXJtYW4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHBvcnRvYVxuICAgIGlkOiAweDVkLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogNn0pLFxuICAgICAgICAgICAgbGVmdEVkZ2Uoe3RvcDogNCwgaGVpZ2h0OiA2LCBzaGlmdDogMC41fSksXG4gICAgICAgICAgICBkb29yKDB4NjgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHZlcnRpY2FsVG93blRvcF9mb3J0cmVzcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2h5cm9uLCB6b21iaWUgdG93biAocHJvYmFibHkgbm90IHdvcnRoIHNwbGl0dGluZyB0aGlzIG9uZSlcbiAgICBpZDogMHg1ZSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtjYXZlKDB4NDcpLCBib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2h5cm9uTWlkZGxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzaHlyb25cbiAgICBpZDogMHg1ZixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NTQpLCBkb29yKDB4NWIsICdkb29yMicpLCB0b3BFZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2h5cm9uQm90dG9tX2V4aXRTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzaHlyb25cbiAgICBpZDogMHg2MCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiAzfSksIGRvb3IoMHgwNCksXG4gICAgICAgICAgICBkb29yKDB4MDYsICdkb29yMicpLCBkb29yKDB4OTksICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHpvbWJpZVRvd25NaWRkbGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHpvbWJpZSB0b3duXG4gICAgaWQ6IDB4NjEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDk5KSwgdG9wRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHpvbWJpZVRvd25Cb3R0b21fY2F2ZUV4aXQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHpvbWJpZSB0b3duXG4gICAgaWQ6IDB4NjIsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbY2F2ZSgweDkyKSwgZG9vcigweDIzKSwgZG9vcigweDRkLCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBsZWFmTldfaG91c2VTaGVkID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBsZWFmXG4gICAgaWQ6IDB4NjMsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg4YyksIGRvb3IoMHg5NSwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3F1YXJlVG93bk5FX2hvdXNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBsZWFmLCBnb2EgKFRPRE8gLSBzcGxpdClcbiAgICBpZDogMHg2NCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogMX0pLCBkb29yKDB4YjcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGxlYWZTV19zaG9wcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gbGVhZlxuICAgIGlkOiAweDY1LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NzcpLCBkb29yKDB4OGEsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGxlYWZTRV9leGl0RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gbGVhZlxuICAgIGlkOiAweDY2LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogM30pLCBkb29yKDB4ODQpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYU5XX3RhdmVybiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gZ29hXG4gICAgaWQ6IDB4NjcsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHhiYSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3F1YXJlVG93blNXX2V4aXRTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBnb2EsIGpvZWwgKFRPRE8gLSBzcGxpdClcbiAgICBpZDogMHg2OCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogOH0pLCBkb29yKDB4ODQpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVNFX3Nob3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGdvYVxuICAgIGlkOiAweDY5LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4ODIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGpvZWxORV9zaG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBqb2VsXG4gICAgaWQ6IDB4NmEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHhhNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgam9lbFNFX2xha2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGpvZWxcbiAgICBpZDogMHg2YixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICB9KTtcbiAgcmVhZG9ubHkgb2FrTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIG9ha1xuICAgIGlkOiAweDZjLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4ZTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9ha05FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBvYWtcbiAgICBpZDogMHg2ZCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDYwKV0sXG4gIH0pO1xuICByZWFkb25seSBvYWtTVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gb2FrXG4gICAgaWQ6IDB4NmUsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg3YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2FrU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIG9ha1xuICAgIGlkOiAweDZmLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgLy8gRWRnZSBlbnRyYW5jZSBzaGlmdGVkIGZvciBjaGlsZCBhbmltYXRpb25cbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDAsIHNoaWZ0OiAwLjV9KSwgZG9vcigweDk3KV0sXG4gIH0pO1xuICByZWFkb25seSB0ZW1wbGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHNoeXJvblxuICAgIGlkOiAweDcwLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVEZWFkRW5kTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAndyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4YzcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVEZWFkRW5kTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilbXilIPilbV8XG4gICAgICB8ID4gfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3ICAgJyxcbiAgICBjb25uZWN0OiAnMXwyfDMnLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4YzcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilIPilIJ8XG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUg+KUgnxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTl8MmF8M2InLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUgyB8XG4gICAgICB84pSC4pSD4pSCfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c119fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbE5TLCAwLCAwLCAweDlkKV1dLFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzE5fDJhfDN8YicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX2Jsb2NrZWRMZWZ0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHwg4pSD4pSCfFxuICAgICAgfOKUguKUg+KUgnxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOUywgMCwgMSwgMHg1MSldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxfDl8MmF8M2InLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUFyZW5hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MyxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHzilbs84pW7fFxuICAgICAgfOKUoeKUgeKUqXxcbiAgICAgIHzilILilbvilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJ3cqdyonLFxuICAgIGFsbG93ZWQ6IHMgPT4gcy5oYXNGZWF0dXJlKCdlbXB0eScpID8gWzEsIDNdIDogW10sXG4gICAgY29ubmVjdDogJzlifGEnLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDM3KV0sXG4gIH0pO1xuICByZWFkb25seSBsaW1lVHJlZUxha2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc0LFxuICAgIHRpbGVzZXRzOiB7bGltZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGNhdmUoMHg0NyldLFxuICAgIC8vIFRPRE8gLSBicmlkZ2VcbiAgfSk7XG4gIC8vIFN3YW1wIHNjcmVlbnNcbiAgcmVhZG9ubHkgc3dhbXBOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilJggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICAvLyBUT0RPIC0gZG8gd2UgYWN0dWFsbHkgd2FudCB0byBwdXQgYWxsIHRoZXNlIGVkZ2VzIGluP1xuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3NzICAnLFxuICAgIGNvbm5lY3Q6ICcyNicsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLCBsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDN9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbbilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyAgIHMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW10sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEVfZG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzYsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHwg4pW24pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyAgIHMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2NhdmUoMHg1YywgJ3N3YW1wJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBOV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3NyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUvOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICdzc3NzJyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiAzfSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogM30pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTldTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3OCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUpCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnc3NzICcsXG4gICAgY29ubmVjdDogJzI2YScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiAzfSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc5LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUlOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAncyAgcycsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksIHJpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDN9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2EsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSs4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzc3MnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiAzfSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogM30pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wV1NFX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdhLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSAgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzc3MnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICAgIC8vIE5PVEU6IGRvb3Igc2NyZWVucyBzaG91bGQgbm90IGJlIG9uIGFuIGV4aXQgZWRnZSFcbiAgICBleGl0czogW2NhdmUoMHg1NiwgJ3N3YW1wJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3YixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilbQgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICcgcyAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgLy8gVE9ETyAtIGZsYWdnYWJsZVxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdiLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSA4pW0IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU3dhbXBEb29yc119fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZmxhZzogJ2Fsd2F5cycsXG4gICAgZWRnZXM6ICcgcyAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTQsICdzd2FtcCcpXSxcbiAgICAvLyBUT0RPIC0gZmxhZ2dhYmxlXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEFyZW5hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilJfilK/ilJt8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnICpzKicsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIC8vIEZvciBsZWZ0L3JpZ2h0IG5laWdoYm9ycywgb25seSBhbGxvdyBlZGdlIG9yIGVtcHR5LlxuICAgIC8vIFRPRE8gLSBjaGVjayB0aGF0IHRoaXMgaXMgc3RpbGwgdGhlIGNhc2UuXG4gICAgYWxsb3dlZDogcyA9PiBzLmhhc0ZlYXR1cmUoJ2VtcHR5JykgPyBbMSwgM10gOiBbXSxcbiAgICAvLyBOT1RFOiBubyBlZGdlIGV4aXQgc2luY2Ugd2UgZG9uJ3Qgd2FudCB0byBnbyBzdHJhaWdodCBoZXJlLi4uXG4gICAgLy8gVE9ETyAtIGNvbnN0cmFpbnQgdGhhdCB3ZSBwdXQgc29saWRzIG9uIGVpdGhlciBzaWRlP1xuICAgIC8vIFRPRE8gLSB1bmRvIHRoZSBhdHRlbXB0IHRvIGFsbG93IHRoaXMgbm90IG9uIHRoZSByaWdodCBlZGdlLFxuICAgIC8vICAgICAgICBtYXliZSBtYWtlIGEgZmV3IGN1c3RvbSBjb21iaW5hdGlvbnM/IChpcyBpdCBzdGlsbCBicm9rZW4/KVxuICAgIC8vICAgICAgICAtLT4gbG9va3MgbGlrZSB3ZSBkaWQgZml4IHRoYXQgZWFybGllciBzb21laG93PyAgbWF5YmUgYnkgbW92aW5nXG4gICAgLy8gICAgICAgICAgICB0aGUgd2hvbGUgc2NyZWVuIGEgY29sdW1uIG92ZXIsIG9yIGVsc2UgYnkgY2hhbmdpbmcgdGhlIHRpbGVzP1xuICAgIC8vIFRPRE8gLSBOT1RFIFNXQU1QIEdSQVBISUNTIFNUSUxMIEJST0tFTiEhXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5XRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2QsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3NzIHMnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIGxlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogM30pLFxuICAgICAgICAgICAgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogM30pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdlLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUkCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU3dhbXBEb29yc119fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5Td2FtcERvb3JzLCAocywgc2VlZCwgcm9tKSA9PiB7XG4gICAgICByb20ubWV0YXNjcmVlbnMuc3dhbXBXU19kb29yLmZsYWcgPSAnYWx3YXlzJztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1dXSxcbiAgICBlZGdlczogJyBzcyAnLFxuICAgIGNvbm5lY3Q6ICc2YScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDN9KSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdTX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdlLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSA4pSQIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICcgc3MgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU3LCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEVtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3ZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJyAgICAnLFxuICAgIGNvbm5lY3Q6ICcnLFxuICB9KTtcbiAgLy8gTWlzc2luZyBzd2FtcCBzY3JlZW5zXG4gIHJlYWRvbmx5IHN3YW1wTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDcwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKVtSB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3MgICAnLFxuICAgIGNvbm5lY3Q6ICcyJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDcxLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbcgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyAgcyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3MgcyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLCBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzIHMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDN9KSwgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogM30pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wV0VfZG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDcyLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzIHMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NTYpXSxcbiAgICAvLyBUT0RPIC0gaG93IHRvIGxpbmsgdG8gc3dhbXBXRSB0byBpbmRpY2F0ZSBmbGFnPWZhbHNlP1xuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDczLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilIzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnICBzcycsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogM30pLCBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wU0VfZG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDczLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB8IOKUjOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyAgc3MnLFxuICAgIGNvbm5lY3Q6ICdhZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWEsICdzd2FtcCcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTlNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4NzQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pSc4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3Mgc3MnLFxuICAgIGNvbm5lY3Q6ICcyYWUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICByaWdodEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiAzfSldLFxuICB9KTtcbiAgLy8gQ2F2ZSBzY3JlZW5zXG4gIHJlYWRvbmx5IGNhdmVFbXB0eSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgbGFieXJpbnRoOiB7fSwgcHlyYW1pZDoge30sXG4gICAgICAgICAgICAgICBpY2VDYXZlOiB7fSwgZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG9wZW4gPSB0aGlzLm1ldGFzY3JlZW4oeyAvLyBOT1RFOiBub3QgY2F2ZVxuICAgIGlkOiAweDgwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge30sIHNlYToge319LCAvLyBOT1RFOiBjb3VsZCBhZGQgZ3Jhc3Mvcml2ZXIgYnV0IHRyZWVzIG5pY2VyLlxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIHBvaTogW1s0XV0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBwb2k6IFtbNF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnICBjYycsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilJAgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGNjICcsXG4gICAgY29ubmVjdDogJzZhJyxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyAgYycsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUmCB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnY2MgICcsXG4gICAgY29ubmVjdDogJzI2JyxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTlNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIGNjJyxcbiAgICBjb25uZWN0OiAnMmFlJyxcbiAgICBwb2k6IFtbM11dLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjY2NjJyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilKQgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnY2NjICcsXG4gICAgY29ubmVjdDogJzI2YScsXG4gICAgcG9pOiBbWzNdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaFdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSs4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGNjYycsXG4gICAgY29ubmVjdDogJzZhZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnY2MgYycsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgICBleGl0czogW3NlYW1sZXNzRG93bigweDA2LCA0KV0sIC8vIGtlbnN1XG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfc3RhaXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIsgfFxuICAgICAgfCDilIsgfFxuICAgICAgfCDilIsgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnc3RhaXJzJ10sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX292ZXJCcmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhkLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVvSB8XG4gICAgICB84pSA4pSD4pSAfFxuICAgICAgfCDilb8gfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnb3ZlckJyaWRnZSddLFxuICAgIGVkZ2VzOiAnY2JjYicsIC8vIFRPRE8gLSAnYicgZm9yIG90aGVyIHNpZGUgb2YgYnJpZGdlPz9cbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFX3VuZGVyQnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4ZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilb0gfFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHwg4pW/IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3VuZGVyQnJpZGdlJ10sXG4gICAgZWRnZXM6ICdiY2JjJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX3dhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhmLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUhiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBmZWF0dXJlOiBbJ3dhbGwnXSxcbiAgICAvLyBUT0RPIC0gY2FuIHdlIGp1c3QgZGV0ZWN0IHRoZSBjb25uZWN0aW9ucz9cbiAgICAvLyAgICAgIC0gZm9yIGVhY2ggdGlsZXNldCwgbWFwIDEuLmYgdG8gdmFyaW91cyBlZGdlIHBvcz9cbiAgICAvLyAgICAgIC0gZS5nLiBjYXZlOiAweDAyID0gMSwgMHgwOCA9IDIsIDB4MGMgPSAzLFxuICAgIC8vICAgICAgICAgICAgICAgICAgIDB4MjAgPSA1LCAweDgwID0gNiwgMHhjMCA9IDcsIC4uLlxuICAgIC8vICAgICAgICBuZWVkIHRvIGJlIFdBTEtBQkxFXG4gICAgLy8gICAgICAgIG1heSBuZWVkIHRvIHJlZXZhbHVhdGUgZWFjaCBzY3JlZW4gZm9yIGVhY2ggdGlsZXNldC4uLlxuICAgIC8vICAgICAgICBhbmQgbmVlZCB0byB3YWl0IHVudGlsIHRoZSBzY3JlZW4gaXMgQlVJTFQhXG4gICAgY29ubmVjdDogJzI9YScsIC8vIHdhbGwgd2lsbCBhbHdheXMgY29ubmVjdCB0aGUgZmlyc3QgdHdvP1xuICAgIHdhbGw6IDB4ODcsIFxuICAgIC8vIFRPRE8gLSByZWNvcmQgdGhlIHdhbGxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXRV93YWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5MCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilITilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2FsbCddLFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzY9ZScsXG4gICAgd2FsbDogMHg2NyxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOU19hcmVuYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilLjilJB8XG4gICAgICB84pSCJuKUgnxcbiAgICAgIHzilJTilKzilJh8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnbipjKicsIC8vICduJyBmb3IgJ25hcnJvdydcbiAgICBhbGxvd2VkOiBzID0+IHMuaGFzRmVhdHVyZSgnZW1wdHknKSA/IFsxLCAzXSA6IFtdLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgcG9pOiBbWzEsIDB4NjAsIDB4NzhdXSxcbiAgICBleGl0czogW3RvcEVkZ2UoKSwgLy8gdmFtcGlyZSAxIHJvb21cbiAgICAgICAgICAgIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KSwgLy8gZ29hIHNhZ2VzXG4gICAgICAgICAgICBzZWFtbGVzc1VwKDB4ZTYsIDQpXSwgLy8ga2Vuc3VcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOU19hcmVuYVdhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDkyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSE4pSQfFxuICAgICAgfOKUgibilIJ8XG4gICAgICB84pSU4pSs4pSYfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnLCAnd2FsbCddLFxuICAgIGVkZ2VzOiAnbipjKicsXG4gICAgYWxsb3dlZDogcyA9PiBzLmhhc0ZlYXR1cmUoJ2VtcHR5JykgPyBbMSwgM10gOiBbXSxcbiAgICBjb25uZWN0OiAnMj1hJyxcbiAgICB3YWxsOiAweDI3LFxuICAgIHBvaTogW1sxLCAweDYwLCAweDc4XV0sXG4gICAgLy8gTk9URTogdG9wIGV4aXQgbmVlZHMgdG8gbW92ZSB1cCBhIHRpbGUuLi4/XG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSksXG4gICAgICAgICAgICB0b3BFZGdlKHt0b3A6IDF9KV0sIC8vIHByaXNvbnMgbmVlZCBleHRyYSBleGl0c1xuICB9KTtcbiAgLy8gTk9URTogc2NyZWVuIDkzIGlzIG1pc3NpbmchXG4gIHJlYWRvbmx5IGJyYW5jaE5XRV93YWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjYyBjJyxcbiAgICBjb25uZWN0OiAnMj02ZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XRV91cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NSxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHwgPCB8XG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyBjIGMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NDcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXX3VwU3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk2LFxuICAgIGljb246IGljb25gPFxuICAgICAgfCA8IHxcbiAgICAgIHzilIDilJggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyBjICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW3VwU3RhaXIoMHg0MildLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdfZG93blN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NyxcbiAgICBpY29uOiBpY29uYD5cbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSQIHxcbiAgICAgIHwgPiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgYyAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgZXhpdHM6IFtkb3duU3RhaXIoMHhhMildLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZEVfdXBTdGFpciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTgsXG4gICAgaWNvbjogaWNvbmA8XG4gICAgICB8IDwgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnICAgYycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDRjKV0sXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kRV9kb3duU3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk5LFxuICAgIGljb246IGljb25gPlxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCA+IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyAgIGMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweGFjKV0sXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlNfc3RhaXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCA+IHxcbiAgICAgIHwgICB8XG4gICAgICB8IDwgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyfGEnLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4MTcpLCB1cFN0YWlyKDB4ZDcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROX3N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICdjICAgJyxcbiAgICBjb25uZWN0OiAnMicsXG4gICAgZXhpdHM6IFtkb3duU3RhaXIoMHgxNyldLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4MTA4LCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRTX3N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCA8IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgIGMgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4ZDcpXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgtMHgzMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVtSB8XG4gICAgICB8ICAgfFxuICAgICAgfCDilbcgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyfGEnLFxuICAgIHBvaTogW1swLCAweDExMCwgMHg3OF0sIFswLCAtMHgzMCwgMHg3OF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVtSB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICdjICAgJyxcbiAgICBjb25uZWN0OiAnMicsXG4gICAgcG9pOiBbWzAsIC0weDMwLCAweDc4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHgxMTAsIDB4NzgpLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW3IHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgIGMgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgcG9pOiBbWzAsIDB4MTEwLCAweDc4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilbQg4pW2fFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgYyBjJyxcbiAgICBjb25uZWN0OiAnNnxlJyxcbiAgICBwb2k6IFtbMCwgMHg3MCwgMHgxMDhdLCBbMCwgMHg3MCwgLTB4MjhdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilbQgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnIGMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIHBvaTogW1swLCAweDcwLCAtMHgyOF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NzAsIDB4MTA4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgIOKVtnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgYycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIHBvaTogW1swLCAweDcwLCAweDEwOF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NzAsIC0weDI4KSxcbiAgfSk7XG4gIC8vIE5PVEU6IDlkIG1pc3NpbmdcbiAgcmVhZG9ubHkgaGFsbE5TX2VudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5ZSxcbiAgICBpY29uOiBpY29uYOKVvVxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilb0gfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyBuICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW2JvdHRvbUVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRXhpdFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5ZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWU4pWQfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIC8vZWRnZXM6ICcgIHJyJyxcbiAgICAvL2Nvbm5lY3Q6ICc5ZDpiZicsICAvLyA6IG1lYW5zIHdhdGVyIC0gZmxpZ2h0IG5lZWRlZFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxCZW5kV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGEwLFxuICAgIGljb246IGljb25gXG4gICAgICB84paIICB8XG4gICAgICB84pWQ4pWXIHxcbiAgICAgIHzilojilZEgfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIC8vZWRnZXM6ICcgcnIgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxIYWxsTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGExLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB8IOKVoOKUiHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxFbnRyYW5jZVNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWU4pSIfFxuICAgICAgfOKVt+KVkSB8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgLy8gTk9URTogVGhpcyB3b3VsZCBBTE1PU1Qgd29yayBhcyBhIGNvbm5lY3Rpb24gdG8gdGhlXG4gICAgLy8gbm9ybWFsIHJpdmVyIGNhdmUgdGlsZXMsIGJ1dCB0aGUgcml2ZXIgaXMgb25lIHRpbGVcbiAgICAvLyB0YWxsZXIgYXQgdGhlIHRvcCwgc28gdGhlcmUncyBubyBtYXRjaCFcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDJ9KV0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsQ3Jvc3MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGEzLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB84pWQ4pWs4pWQfFxuICAgICAgfOKVt+KVkeKVt3xgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICAvLyBOT1RFOiB0d28gYm90dG9tIGVkZ2VzIG9uIHRoZSBzYW1lIHNjcmVlbiAtIGNhbGwgb25lIGEgZG9vclxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogM30pLCBib3R0b21FZGdlKHtsZWZ0OiAweGIsIHR5cGU6ICdkb29yJ30pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxEb29yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhNCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKniloh8XG4gICAgICB84pSI4pWQ4pWQfFxuICAgICAgfCAg4paIfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGV4aXRzOiBbZG9vcigweDM4KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkZsb2F0aW5nSXNsYW5kID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhNSxcbiAgICBpY29uOiBpY29uYCpcbiAgICAgIHzilZDilZfiloh8XG4gICAgICB8KuKVkSB8XG4gICAgICB84pWQ4pWj4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgIHdwJywgIC8vIHcgPSB3YXRlcmZhbGwsIHAgPSBwYXRoXG4gICAgY29ubmVjdDogJ2UnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoTkVfc3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGE2LFxuICAgIGljb246IGljb25g4pSUXG4gICAgICB84paI4pSL4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdsICBwJywgIC8vIGwgPSBsYWRkZXIgKHN0YWlycylcbiAgICBjb25uZWN0OiAnMmUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSgpXSwgLy8gbmV2ZXIgdXNlZCBhcyBhbiBleGl0IGluIHZhbmlsbGFcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluQnJhbmNoTldFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhNyxcbiAgICBpY29uOiBpY29uYOKUtFxuICAgICAgfOKWiCDiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdwcCBwJyxcbiAgICBjb25uZWN0OiAnMjZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX2ljZUJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTgsXG4gICAgaWNvbjogaWNvbmDilatcbiAgICAgIHzilojilZHiloh8XG4gICAgICB8IOKUhiB8XG4gICAgICB84paI4pWR4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydicmlkZ2UnXSxcbiAgICBlZGdlczogJ3dwd3AnLFxuICAgIGFsbG93ZWQ6IHMgPT4gcy5oYXNGZWF0dXJlKCdlbXB0eScpID8gWzJdIDogW10sXG4gICAgY29ubmVjdDogJzYtZToyYScsXG4gICAgd2FsbDogMHg4NyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhOSxcbiAgICBpY29uOiBpY29uYOKUjFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgcHAnLFxuICAgIGNvbm5lY3Q6ICdhZScsXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogNiwgaGVpZ2h0OiA0fSksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5EZWFkRW5kV19jYXZlRW1wdHkgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFhLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWkCDilpB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW2NhdmUoMHgzOCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFiLFxuICAgIGljb246IGljb25g4pSUXG4gICAgICB84paIIOKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAncCAgcCcsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkJyYW5jaFdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YWMsXG4gICAgaWNvbjogaWNvbmDilKxcbiAgICAgIHzilojilojiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHBwcCcsXG4gICAgY29ubmVjdDogJzZhZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFkLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfCAg4paQfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgcCAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTUpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aEVfc2xvcGVTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhZSxcbiAgICBpY29uOiBpY29uYOKVk1xuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICcgIHNwJywgLy8gcyA9IHNsb3BlXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhZixcbiAgICBpY29uOiBpY29uYOKUmFxuICAgICAgfOKWiCDiloh8XG4gICAgICB8ICDiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3BwICAnLFxuICAgIGNvbm5lY3Q6ICcyNicsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkNhdmVfZW1wdHkgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGIwLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWjCDilpB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgICAnLFxuICAgIGNvbm5lY3Q6ICcnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU4KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhFX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGIxLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgICBwJyxcbiAgICBjb25uZWN0OiAnZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX3Nsb3BlTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjIsXG4gICAgaWNvbjogaWNvbmDilahcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3NwIHAnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5EZWFkRW5kVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjMsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilojilojiloh8XG4gICAgICB8ICDiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiNCxcbiAgICBpY29uOiBpY29uYOKUgFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHwgICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwIHAnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgcmlnaHRFZGdlKHt0b3A6IDYsIGhlaWdodDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluQXJlbmFfZ2F0ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjUsXG4gICAgaWNvbjogaWNvbmAjXG4gICAgICB84paII+KWiHxcbiAgICAgIHzilowg4paQfFxuICAgICAgfOKWiOKUi+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnICpsKicsXG4gICAgYWxsb3dlZDogcyA9PiBzLmhhc0ZlYXR1cmUoJ2VtcHR5JykgPyBbMSwgM10gOiBbXSxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgZXhpdHM6IFt7Li4udXBTdGFpcigweDQ3LCAzKSwgdHlwZTogJ2NhdmUnfV0sXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhOX3Nsb3BlU19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiNixcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKUi+KIqXxcbiAgICAgIHzilowg4paQfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ2wgcyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWEpLCB0b3BFZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0Vfc2xvcGVOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjcsXG4gICAgaWNvbjogaWNvbmDilatcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3Nwc3AnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX3Nsb3BlTl9jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiOCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKGk+KIqXxcbiAgICAgIHwgICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnc3AgcCcsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiOSxcbiAgICBpY29uOiBpY29uYOKUkFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHwgIOKWiHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwcCAnLFxuICAgIGNvbm5lY3Q6ICc2YScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblNsb3BlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiYSxcbiAgICBpY29uOiBpY29uYOKGk1xuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHzilojihpPiloh8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAncyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUml2ZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJhLFxuICAgIGljb246IGljb25g4pWRXG4gICAgICB84paI4pWR4paIfFxuICAgICAgfOKWiOKVkeKWiHxcbiAgICAgIHzilojilZHiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGFsbG93ZWQ6IHMgPT4gcy5oYXNGZWF0dXJlKCdlbXB0eScpID8gWzJdIDogW10sXG4gICAgY29ubmVjdDogJzI6ZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhFX2dhdGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJiLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJyAgIHAnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2NhdmUoMHg1NywgJ2dhdGUnKV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9pbm4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJjLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICcgcCBwJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIGV4aXRzOiBbZG9vcigweDc2KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9icmlkZ2VPdmVyU2xvcGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJkLFxuICAgIGljb246IGljb25g4pWQXG4gICAgICB84paI4oaT4paIfFxuICAgICAgfCDilZAgfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3Nwc3AnLFxuICAgIGNvbm5lY3Q6ICc2ZScsIC8vICcyYXw2ZScsXG4gICAgZXhpdHM6IFtzZWFtbGVzc1VwKDB4YjYsIDQpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX2JyaWRnZU92ZXJSaXZlciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmQsXG4gICAgaWNvbjogaWNvbmDilZBcbiAgICAgIHzilojilZHiloh8XG4gICAgICB8IOKVkCB8XG4gICAgICB84paI4pWR4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICd3cHdwJyxcbiAgICBhbGxvd2VkOiBzID0+IHMuaGFzRmVhdHVyZSgnZW1wdHknKSA/IFsyXSA6IFtdLFxuICAgIGNvbm5lY3Q6ICc2ZXwyfGEnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5TbG9wZV91bmRlckJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmUsXG4gICAgaWNvbjogaWNvbmDihpNcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8IOKVkCB8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIC8vIFRPRE8gLSBjb3VsZCBmbHkgdW5kZXIgYnJpZGdlIG9uIG1vdW50YWluUml2ZXJcbiAgICBlZGdlczogJ3Nwc3AnLFxuICAgIGNvbm5lY3Q6ICcyYScsIC8vICcyYXw2ZScsXG4gICAgZXhpdHM6IFtzZWFtbGVzc0Rvd24oMHhjNiwgNCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5FbXB0eSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeVMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGMwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKWhOKWhOKWhHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICAvLyBUT0RPIC0gZ3Jhc3Mvcml2ZXIgc2hvdWxkIG1heWJlIHVzZSByb2NrcyBpbnN0ZWFkP1xuICAgIGVkZ2VzOiAnb14gXicsIC8vIG8gPSBvcGVuLCBeID0gb3BlbiB1cFxuICAgIC8vY29ubmVjdDogJzI2ZScsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeU5fY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paA4oip4paAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFDYXZlRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICcgdm92JywgLy8gbyA9IG9wZW4sIHYgPSBvcGVuIGRvd25cbiAgICBleGl0czogW2NhdmUoMHg0OSldLFxuICB9KTtcbiAgcmVhZG9ubHkgY29ybmVyU0VfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paQ4paIfFxuICAgICAgfOKWhOKIqeKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzxeICAnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDVhKV0sXG4gIH0pO1xuICByZWFkb25seSB3YXRlcmZhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGMzLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKGk+KGk+KGk3xcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSB3aGlybHBvb2xCbG9ja2VyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilbPiloh8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICAvLyBUT0RPIC0gaW5kaWNhdGUgZmxhZ1xuICAgIGZlYXR1cmU6IFsnd2hpcmxwb29sJ10sXG4gICAgZmxhZzogJ2NhbG0nLCAvLyBjYWxtZWQgc2VhXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlYWNoRXhpdE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM1LFxuICAgIGljb246IGljb25gXG4gICAgICB84paIIOKWiHxcbiAgICAgIHzilojilbHiloB8XG4gICAgICB84paI4paMIHxgLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZWRnZXM6ICduID52JywgLy8gbiA9IFwibmFycm93XCJcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDl9KV0sXG4gIH0pO1xuICByZWFkb25seSB3aGlybHBvb2xPcGVuID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWzIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGZlYXR1cmU6IFsnd2hpcmxwb29sJ10sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgICBmbGFnOiAnY2FsbScsIC8vIGJ1dCBvbmx5IGlmIG9uIGFuZ3J5IHNlYSAtIG5vdCBkZXNlcnQuLi5cbiAgfSk7XG4gIHJlYWRvbmx5IHF1aWNrc2FuZE9wZW4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbMgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7ZGVzZXJ0OiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aGlybHBvb2wnXSxcbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgbGlnaHRob3VzZUVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWl+KWn+KWiHxcbiAgICAgIHzilpDiiKnilpt8XG4gICAgICB84pad4paA4paYfGAsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICAvLyBUT0RPIC0gaW5kaWNhdGUgdW5pcXVlbmVzcz9cbiAgICBmZWF0dXJlOiBbJ2xpZ2h0aG91c2UnXSxcbiAgICBlZGdlczogJzxvb3YnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDJhKSwgZG9vcigweDc1KV0sXG4gIH0pO1xuICByZWFkb25seSBiZWFjaENhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM4LFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWgOKVsuKWiHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnIHZvdicsXG4gICAgZXhpdHM6IFtjYXZlKDB4MjgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlYWNoQ2FiaW5FbnRyYW5jZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4oip4paIfFxuICAgICAgfCDilbLiloB8XG4gICAgICB84paI4paE4paEfGAsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NhYmluJ10sXG4gICAgZWRnZXM6ICc8XiBiJywgLy8gYiA9IFwiYm9hdFwiXG4gICAgZXhpdHM6IFtkb29yKDB4NTUpLCByaWdodEVkZ2Uoe3RvcDogOCwgaGVpZ2h0OiAzfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2NlYW5TaHJpbmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNhLFxuICAgIGljb246IGljb25gXG4gICAgICB84paX4paE4paWfFxuICAgICAgfOKWkCrilox8XG4gICAgICB84padIOKWmHxgLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgLy8gVE9ETyAtIGluZGljYXRlIHVuaXF1ZW5lc3M/XG4gICAgZmVhdHVyZTogWydhbHRhciddLFxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBweXJhbWlkRW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWhCB8XG4gICAgICB84paf4oip4paZfFxuICAgICAgfCDilbMgfGAsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICAvLyBUT0RPIC0gaW5kaWNhdGUgdW5pcXVlbmVzcz9cbiAgICBmZWF0dXJlOiBbJ3B5cmFtaWQnXSxcbiAgICBlZGdlczogJ29vb28nLFxuICAgIGV4aXRzOiBbY2F2ZSgweGE3KV0sXG4gIH0pO1xuICByZWFkb25seSBjcnlwdEVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjYyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbMgfFxuICAgICAgfOKWkD7ilox8XG4gICAgICB84pad4paA4paYfGAsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NyeXB0J10sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweDY3KV0sXG4gIH0pO1xuICByZWFkb25seSBvYXNpc0xha2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNkLFxuICAgIGljb246IGljb25gXG4gICAgICB8IF4gfFxuICAgICAgfHZPdnxcbiAgICAgIHwgdnZ8YCxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge319LFxuICAgIGZlYXR1cmU6IFsnbGFrZSddLFxuICAgIGVkZ2VzOiAnb28zbycsXG4gIH0pO1xuICByZWFkb25seSBkZXNlcnRDYXZlRW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNlLFxuICAgIGljb246IGljb25gXG4gICAgICB84paX4paE4paWfFxuICAgICAgfOKWnOKIqeKWm3xcbiAgICAgIHwg4pWzIHxgLFxuICAgIHRpbGVzZXRzOiB7ZGVzZXJ0OiB7fSxcbiAgICAgICAgICAgICAgIC8vIFRPRE8gLSBwcm9iYWJseSBuZWVkIHRvIHB1bGwgdGhpcyBvdXQgc2luY2UgZmxhZ3MgZGlmZmVyXG4gICAgICAgICAgICAgICAvLyBUT0RPIC0gd2UgY291bGQgYWxzbyBtYWtlIHRoaXMgd29ya2FibGUgaW4gcml2ZXIgaWYgd2Ugd2FudFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnb29vbycsXG4gICAgZXhpdHM6IFtjYXZlKDB4YTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9hc2lzQ2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4Y2YsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgdnZ8XG4gICAgICB84paE4oipdnxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzNePm8nLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDM3KV0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRW5kV19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKIqXxcbiAgICAgIHzilZDilZAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBleGl0czogW3VwU3RhaXIoMHg1NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgYm9hdENoYW5uZWwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQxLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWgOKWgOKWgHxcbiAgICAgIHziloTiloTiloR8YCxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnIGIgYicsXG4gICAgZXhpdHM6IFt7Li4ucmlnaHRFZGdlKHt0b3A6IDgsIGhlaWdodDogM30pLCBlbnRyYW5jZTogMHg5Y2U4fSxcbiAgICAgICAgICAgIGxlZnRFZGdlKHt0b3A6IDgsIGhlaWdodDogM30pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84pWQ4pWQ4pWQfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5XU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQzLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pWR4pSUfFxuICAgICAgfOKVkOKVrOKVkHxcbiAgICAgIHzilKzilIfilKx8YCxcbiAgICAgIC8vIHzilpjilZHilp18XG4gICAgICAvLyB84pWQ4pWs4pWQfFxuICAgICAgLy8gfOKWluKUhuKWl3xgLFxuICAgIC8vIFRPRE8gLSBjb25zaWRlciB1c2luZyBzb2xpZHMgZm9yIHRoZSBjb3JuZXJzIGluc3RlYWQ/XG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAncnJycicsXG4gICAgY29ubmVjdDogJzE1OjNkOjc5LWFmJyxcbiAgICB3YWxsOiAweGI2LFxuICAgIHBvaTogW1s0LCAweDAwLCAweDk4XV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgICAgLy8gfOKWjOKVkeKWkHxcbiAgICAgIC8vIHzilozilZHilpB8XG4gICAgICAvLyB84paM4pWR4paQfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxOTozYScsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pWQ4pWQ4pWQfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICcgciByJyxcbiAgICBjb25uZWN0OiAnNWQ6N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlNfYnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilJzilIfilKR8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnciByICcsXG4gICAgY29ubmVjdDogJzE5LTNhJyxcbiAgICB3YWxsOiAweDg3LFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV0VfYnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHzilZDilIXilZB8XG4gICAgICB84pSA4pS04pSAfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnIHIgcicsXG4gICAgY29ubmVjdDogJzVkLTdmJyxcbiAgICB3YWxsOiAweDg2LFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQ4LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSAfFxuICAgICAgfOKUguKVlOKVkHxcbiAgICAgIHzilILilZHilIx8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnICBycicsXG4gICAgY29ubmVjdDogJzlkOmFmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUkHxcbiAgICAgIHzilZDilZfilIJ8XG4gICAgICB84pSQ4pWR4pSCfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJyByciAnLFxuICAgIGNvbm5lY3Q6ICc1YTo3OScsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZGEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilJR8XG4gICAgICB84pSC4pWa4pWQfFxuICAgICAgfOKUlOKUgOKUgHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICdyICByJyxcbiAgICBjb25uZWN0OiAnMWY6M2QnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGRiLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pWR4pSCfFxuICAgICAgfOKVkOKVneKUgnxcbiAgICAgIHzilIDilIDilJh8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAncnIgICcsXG4gICAgY29ubmVjdDogJzE1OjM3JyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdFX3Bhc3NhZ2VOID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkYyxcbiAgICBpY29uOiBpY29uYOKVp1xuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHzilZDilZDilZB8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ2NyIHInLFxuICAgIGNvbm5lY3Q6ICcyNWQ6N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV0VfcGFzc2FnZVMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGRkLFxuICAgIGljb246IGljb25g4pWkXG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilIDilKzilIB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGVkZ2VzOiAnIHJjcicsXG4gICAgY29ubmVjdDogJzVkOjdhZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19wYXNzYWdlVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZGUsXG4gICAgaWNvbjogaWNvbmDilaJcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSk4pWR4pSCfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICdyY3IgJyxcbiAgICBjb25uZWN0OiAnMTY5OjNiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TX3Bhc3NhZ2VFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkZixcbiAgICBpY29uOiBpY29uYOKVn1xuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilILilZHilJx8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3IgcmMnLFxuICAgIGNvbm5lY3Q6ICcxOTozYmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwg4pSX4pSBfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ3cgIHcnLFxuICAgIGNvbm5lY3Q6ICcyZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUlHxcbiAgICAgIHzilILilJfilIF8XG4gICAgICB84pSU4pSA4pSAfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3cgIHcnLFxuICAgIGNvbm5lY3Q6ICcxZnwyZXwzZCcsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5FX2Jsb2NrZWRMZWZ0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUlHxcbiAgICAgIHwg4pSX4pSBfFxuICAgICAgfOKUlOKUgOKUgHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxORSwgMSwgMCwgMHg2MSldXSxcbiAgICBlZGdlczogJ3cgIHcnLFxuICAgIGNvbm5lY3Q6ICcxfGZ8MmV8M2QnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxORV9ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUwLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSDIHxcbiAgICAgIHzilILilJfilIF8XG4gICAgICB84pSU4pSA4pSAfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c119fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbE5FLCAxLCAxLCAweDBkKV1dLFxuICAgIGVkZ2VzOiAndyAgdycsXG4gICAgY29ubmVjdDogJzFmfDJlfDN8ZCcsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfOKUgeKUmyB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnd3cgICcsXG4gICAgY29ubmVjdDogJzI2JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUxLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSD4pSCfFxuICAgICAgfOKUgeKUm+KUgnxcbiAgICAgIHzilIDilIDilJh8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsTldfYmxvY2tlZFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0xLCAwLCAweDZkKV1dLFxuICAgIGZsYWc6ICdhbHdheXMnLFxuICAgIGVkZ2VzOiAnd3cgICcsXG4gICAgY29ubmVjdDogJzE1fDI2fDM3JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldfYmxvY2tlZFJpZ2h0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKUg+KUgnxcbiAgICAgIHzilIHilJsgfFxuICAgICAgfOKUgOKUgOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3dyAgJyxcbiAgICBjb25uZWN0OiAnMTV8MjZ8M3w3JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUg+KUgnxcbiAgICAgIHzilIHilJvilIJ8XG4gICAgICB84pSA4pSA4pSYfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c119fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbE5XX2Jsb2NrZWRSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyLCAxLCAweDAxLCAweDZkKV1dLFxuICAgIGVkZ2VzOiAnd3cgICcsXG4gICAgY29ubmVjdDogJzF8NXwyNnwzNycsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSP4pSBfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnICB3dycsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSAfFxuICAgICAgfOKUguKUj+KUgXxcbiAgICAgIHzilILilIPilIx8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnICB3dycsXG4gICAgY29ubmVjdDogJzlkfGFlfGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsU0VfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSAfFxuICAgICAgfCDilI/ilIF8XG4gICAgICB84pSC4pSD4pSMfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbFNFLCAzLCAwLCAweDYxKV1dLFxuICAgIGVkZ2VzOiAnICB3dycsXG4gICAgY29ubmVjdDogJzl8ZHxhZXxiZicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFNFX2Jsb2NrZWRSaWdodCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilIDilIB8XG4gICAgICB84pSC4pSP4pSBfFxuICAgICAgfOKUguKUgyB8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsU0UsIDMsIDEsIDB4ZGQpXV0sXG4gICAgZWRnZXM6ICcgIHd3JyxcbiAgICBjb25uZWN0OiAnOWR8YWV8YnxmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUzLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgeKUkyB8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilJB8XG4gICAgICB84pSB4pST4pSCfFxuICAgICAgfOKUkOKUg+KUgnxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxXU19ibG9ja2VkUmlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLTEsIDAsIDB4OWQpXV0sXG4gICAgZmxhZzogJ2Fsd2F5cycsXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNWJ8NmF8NzknLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXU19ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUzLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSQfFxuICAgICAgfOKUgeKUkyB8XG4gICAgICB84pSQ4pSD4pSCfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJyB3dyAnLFxuICAgIGNvbm5lY3Q6ICc1fGJ8NmF8NzknLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXU19ibG9ja2VkTGVmdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilJB8XG4gICAgICB84pSB4pST4pSCfFxuICAgICAgfCDilIPilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsV1NfYmxvY2tlZFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQsIDAsIDB4ZDEsIDB4OWQpXV0sXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNWJ8NmF8N3w5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfc3RhaXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUnOKUqOKUgnxcbiAgICAgIHzilILilIPilIJ8XG4gICAgICB84pSC4pSg4pSkfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxMjM5YWInLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19zdGFpcnNCbG9ja2VkMTMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU0LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSU4pSo4pSCfFxuICAgICAgfOKVt+KUg+KVtXxcbiAgICAgIHzilILilKDilJB8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsTlNfc3RhaXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDUsIDAsIFsweDQxLCAweDhkXSldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxMmFifDN8OScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX3N0YWlyc0Jsb2NrZWQyNCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilKjilIJ8XG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUoOKUmHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOU19zdGFpcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNSwgMSwgWzB4MDEsIDB4Y2RdKV1dLFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzF8MjM5YXxiJyxcbiAgfSk7XG4gIC8vIFRPRE8gLSBjdXN0b20gaW52ZXJ0ZWQgdmVyc2lvbiBvZiBlNCB3aXRoIHRoZSB0b3Agc3RhaXIgb24gdGhlIHJpZ2h0XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlNfZGVhZEVuZHMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVuSB8XG4gICAgICB8ICAgfFxuICAgICAgfCDilbsgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzJ8YScsXG4gIH0pO1xuICAvLyBUT0RPIC0gYWRkIG9uZS13YXkgdmlld3Mgb2YgdGhpcz8hP1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX2RlYWRFbmQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pW54pSCfFxuICAgICAgfOKUnOKUgOKUpHxcbiAgICAgIHzilILilbvilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzEzOWJ8MnxhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfZGVhZEVuZEJsb2NrZWQyNCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilbXilbnilIJ8XG4gICAgICB84pSM4pSA4pSYfFxuICAgICAgfOKUguKVu+KVt3xgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOU19kZWFkRW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDYsIDAsIFsweDYxLCAweGFkXSldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxfDJ8Mzl8YXxiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfZGVhZEVuZEJsb2NrZWQxMyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilbnilbV8XG4gICAgICB84pSU4pSA4pSQfFxuICAgICAgfOKVt+KVu+KUgnxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdfX0sXG4gICAgdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOU19kZWFkRW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDYsIDEsIFsweDZkLCAweGExXSldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxYnwyfDN8OXxhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTldTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHzilIHilYvilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICd3d3d3JyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSD4pSUfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHzilJDilIPilIx8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnd3d3dycsXG4gICAgY29ubmVjdDogJzI2YWV8MTV8M2R8Nzl8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV1NFX2Jsb2NrZWQxMyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilIMgfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHwg4pSD4pSMfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c119fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbE5XU0UsIDcsIDAsIFsweDBkLCAweGQxXSldXSxcbiAgICBlZGdlczogJ3d3d3cnLFxuICAgIGNvbm5lY3Q6ICcyNmFlfDE1fDN8ZHw3fDl8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV1NFX2Jsb2NrZWQyNCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSD4pSUfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHzilJDilIMgfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c119fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbE5XU0UsIDcsIDEsIFsweDAxLCAweGRkXSldXSxcbiAgICBlZGdlczogJ3d3d3cnLFxuICAgIGNvbm5lY3Q6ICcyNmFlfDF8NXwzZHw3OXxifGYnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB84pSB4pS74pSBfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ3d3IHcnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU3LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSD4pSUfFxuICAgICAgfOKUgeKUu+KUgXxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnd3cgdycsXG4gICAgY29ubmVjdDogJzI2ZXwxNXwzZHw3ZicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XRV9ibG9ja2VkVG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfOKUgeKUu+KUgXxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXX19LFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsTldFLCAtMSwgMCwgWzB4MDEsIDB4MGRdKV1dLFxuICAgIGVkZ2VzOiAnd3cgdycsXG4gICAgY29ubmVjdDogJzI2ZXwxfDV8M3xkfDdmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIHilLPilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgd3d3JyxcbiAgICBjb25uZWN0OiAnNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilIHilLPilIF8XG4gICAgICB84pSQ4pSD4pSMfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJyB3d3cnLFxuICAgIGNvbm5lY3Q6ICc2YWV8NWR8Nzl8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXU0VfYmxvY2tlZEJvdHRvbSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pSB4pSz4pSBfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c119fSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbFdTRSwgLTEsIDAsIFsweGQxLCAweGRkXSldXSxcbiAgICBlZGdlczogJyB3d3cnLFxuICAgIGNvbm5lY3Q6ICc2YWV8NWR8N3w5fGJ8ZicsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5TX3dhbGxUb3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU5LCAgICAvLyBOT1RFOiB0aGUgcGFzc2FnZSBuYXJyb3dzIGF0IHRoZSB0b3BcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfCDilIMgfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyB3JyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX3dhbGxUb3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU5LCAgICAvLyBOT1RFOiB0aGUgcGFzc2FnZSBuYXJyb3dzIGF0IHRoZSB0b3BcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfOKVt+KUg+KVt3xcbiAgICAgIHzilILilIPilIJ8YCxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnYyB3ICcsXG4gICAgY29ubmVjdDogJzJhfDl8YicsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgeKUgeKUgXxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgdyB3JyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pSB4pSB4pSBfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICcgdyB3JyxcbiAgICBjb25uZWN0OiAnNWR8NmV8N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgcGl0V0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGViLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKVs+KUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgLy8gVE9ETyAtIGFubm90YXRlIHRoZSBwaXRcbiAgICBmZWF0dXJlOiBbJ3BpdCddLFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBwbGF0Zm9ybToge3R5cGU6ICdob3Jpem9udGFsJywgY29vcmQ6IDB4NzBfMzh9LFxuICB9KTtcbiAgcmVhZG9ubHkgcGl0TlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVjLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKVsyB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgLy8gVE9ETyAtIGFubm90YXRlIHRoZSBwaXRcbiAgICBmZWF0dXJlOiBbJ3BpdCddLFxuICAgIGVkZ2VzOiAnYyBjICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBwbGF0Zm9ybToge3R5cGU6ICd2ZXJ0aWNhbCcsIGNvb3JkOiAweDQwXzc4fSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlZCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSB0aGUgc3Bpa2VzP1xuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzIGMgJywgLy8gcyA9IHNwaWtlc1xuICAgIGNvbm5lY3Q6ICcyYScsXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOU19oYWxsTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICAvLyBUT0RPIC0gYW5ub3RhdGUgdGhlIHNwaWtlcz9cbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAnYyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHzilIDilpHilIB8XG4gICAgICB8IOKWkSB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgLy8gVE9ETyAtIGFubm90YXRlIHRoZSBzcGlrZXM/XG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ3Njc2MnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHzilIDilpEgfFxuICAgICAgfCDilpEgfGAsXG4gICAgdGlsZXNldHM6IHdpdGhSZXF1aXJlKFNjcmVlbkZpeC5FeHRyYVNwaWtlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0pLFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSB0aGUgc3Bpa2VzP1xuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzY3MgJyxcbiAgICBjb25uZWN0OiAnMjZhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4ZTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paR4pSAfFxuICAgICAgfCDilpEgfGAsXG4gICAgdGlsZXNldHM6IHdpdGhSZXF1aXJlKFNjcmVlbkZpeC5FeHRyYVNwaWtlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0pLFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSB0aGUgc3Bpa2VzP1xuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzIHNjJyxcbiAgICBjb25uZWN0OiAnMmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc05TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilaggfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWlIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnciByICcsXG4gICAgY29ubmVjdDogJzE6M3w5OmInLFxuICAgIHBvaTogW1sxLCAtMHgzMCwgMHg0OF0sIFsxLCAtMHgzMCwgMHg5OF0sXG4gICAgICAgICAgWzEsIDB4MTEwLCAweDQ4XSwgWzEsIDB4MTEwLCAweDk4XV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNOID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilaggfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJ3IgICAnLFxuICAgIGNvbm5lY3Q6ICcxOjMnLFxuICAgIHBvaTogW1sxLCAtMHgzMCwgMHg0OF0sIFsxLCAtMHgzMCwgMHg5OF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKC0weDMwLCAweDQ4KSAmJiAhcmVhY2hhYmxlKC0weDMwLCAweDk4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWlIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICByICcsXG4gICAgY29ubmVjdDogJzk6YicsXG4gICAgcG9pOiBbWzEsIDB4MTEwLCAweDQ4XSwgWzEsIDB4MTEwLCAweDk4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoLTB4MzAsIDB4NDgpICYmICFyZWFjaGFibGUoLTB4MzAsIDB4OTgpLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYxLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKVoSDilZ58XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgciByJyxcbiAgICBjb25uZWN0OiAnNTo3fGQ6ZicsXG4gICAgcG9pOiBbWzEsIDB4NjAsIDB4MTA4XSwgWzEsIDB4YTAsIDB4MTA4XSxcbiAgICAgICAgICBbMSwgMHg2MCwgLTB4MjhdLCBbMSwgMHhhMCwgLTB4MjhdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc1cgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYxLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKVoSAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnIHIgICcsXG4gICAgY29ubmVjdDogJzU6NycsXG4gICAgcG9pOiBbWzEsIDB4NjAsIC0weDI4XSwgWzEsIDB4YTAsIC0weDI4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg2MCwgMHgxMDgpICYmICFyZWFjaGFibGUoMHhhMCwgMHgxMDgpLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICDilZ58XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICByJyxcbiAgICBjb25uZWN0OiAnZDpmJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgMHgxMDhdLCBbMSwgMHhhMCwgMHgxMDhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDYwLCAtMHgyOCkgJiYgIXJlYWNoYWJsZSgweGEwLCAtMHgyOCksXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSHIHxcbiAgICAgIHwg4pWoIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdyICAgJyxcbiAgICBjb25uZWN0OiAnMS0zJyxcbiAgICB3YWxsOiAweDE3LFxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBhIHBvaSgyKSBoZXJlP1xuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlU19icmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYyLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilaUgfFxuICAgICAgfCDilIcgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnICByICcsXG4gICAgY29ubmVjdDogJzktYicsXG4gICAgd2FsbDogMHhjNixcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgYSBwb2koMikgaGVyZT9cbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pWQ4pWm4pWQfFxuICAgICAgfOKUkOKVkeKUjHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICcgcnJyJyxcbiAgICBjb25uZWN0OiAnNWQ6Nzk6YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTldFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKVkeKUlHxcbiAgICAgIHzilZDilanilZB8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3JyIHInLFxuICAgIGNvbm5lY3Q6ICcxNTozZDo3ZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGY1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUguKVkSB8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxOTozOmInLFxuICAgIHBvaTogW1sxLCAweGMwLCAweDk4XSwgWzEsIDB4NDAsIDB4OThdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TX2Jsb2NrZWRMZWZ0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHwg4pWR4pSCfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZWRnZXM6ICdyIHIgJyxcbiAgICBjb25uZWN0OiAnMTozYjo5JyxcbiAgICBwb2k6IFtbMSwgMHhiMCwgMHg0OF0sIFsxLCAweDMwLCAweDQ4XV0sXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAncyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0QXJlbmFfc3RhdHVlcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjgsXG4gICAgaWNvbjogaWNvbmA8XG4gICAgICB8JjwmfFxuICAgICAgfOKUgiDilIJ8XG4gICAgICB84pSU4pSs4pSYfGAsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnICpjKicsXG4gICAgYWxsb3dlZDogcyA9PiBzLmhhc0ZlYXR1cmUoJ2VtcHR5JykgPyBbMSwgM10gOiBbXSxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NTcpXSxcbiAgICBmbGFnOiAnY3VzdG9tOmZhbHNlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHB5cmFtaWRBcmVuYV9kcmF5Z29uID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUkHxcbiAgICAgIHzilILilbPilIJ8XG4gICAgICB84pSU4pSs4pSYfGAsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYScsICdwaXQnXSxcbiAgICBlZGdlczogJyAqdyonLFxuICAgIGFsbG93ZWQ6IHMgPT4gcy5oYXNGZWF0dXJlKCdlbXB0eScpID8gWzEsIDNdIDogW10sXG4gICAgY29ubmVjdDogJ2EnLFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRBcmVuYV9kcmF5Z29uMiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilI/ilLfilJN8XG4gICAgICB84pSDJuKUg3xcbiAgICAgIHzilJfilLPilJt8YCxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICdjKncqJyxcbiAgICBhbGxvd2VkOiBzID0+IHMuaGFzRmVhdHVyZSgnZW1wdHknKSA/IFsxLCAzXSA6IFtdLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBmbGFnOiAnY3VzdG9tOmZhbHNlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0QXJlbmFfZW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGZiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKVvyB8YCxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgICBlZGdlczogJ3cgbiAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRUZWxlcG9ydGVyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmYyxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9LCB0b3dlcjoge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSwgY2F2ZSgweDU3LCAndGVsZXBvcnRlcicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGZvcnRyZXNzQXJlbmFfdGhyb3VnaCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmQsXG4gICAgaWNvbjogaWNvbmDilb1cbiAgICAgIHzilIzilLTilJB8XG4gICAgICB84pSCIOKUgnxcbiAgICAgIHzilJXilLPilJl8YCxcbiAgICB0aWxlc2V0czoge2ZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge319LFxuICAgIC8vIE5PVEU6IHdlIGNvdWxkIHVzZSB0aGlzIGZvciBhIHBpdCB0aGF0IHJlcXVpcmVzIGZsaWdodCB0byBjcm9zcz9cbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICduKncqJyxcbiAgICBhbGxvd2VkOiBzID0+IHMuaGFzRmVhdHVyZSgnZW1wdHknKSA/IFsxLCAzXSA6IFtdLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKCldLFxuICB9KTtcbiAgLy8gcmVhZG9ubHkgZm9ydHJlc3NBcmVuYV9waXQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAvLyAgIGlkOiAweGZkLFxuICAvLyAgIGljb246IGljb25g4pW9XG4gIC8vICAgICB84pSM4pS04pSQfFxuICAvLyAgICAgfOKUgiDilIJ8XG4gIC8vICAgICB84pSV4pSz4pSZfGAsXG4gIC8vICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gIC8vICAgZmVhdHVyZTogWydhcmVuYScsICdwaXQnXSxcbiAgLy8gICBlZGdlczogJ24gdyAnLFxuICAvLyAgIGNvbm5lY3Q6ICcyYScsIC8vIFRPRE8gLSBubyB3YXkgeWV0IHRvIG5vdGljZSBmbGFnZ2VkIGFuZCBoYXZlXG4gIC8vICAgZXhpdHM6IFt0b3BFZGdlKCldLCAgIC8vIGxvZ2ljIHJlcXVpcmUgZmxpZ2h0Li4uXG4gIC8vICAgZmxhZ2dlZDogdHJ1ZSxcbiAgLy8gfSk7XG4gIHJlYWRvbmx5IGZvcnRyZXNzVHJhcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJTilIDilJh8XG4gICAgICB8IOKVsyB8XG4gICAgICB84pW24pSs4pW0fGAsXG4gICAgdGlsZXNldHM6IHtmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3BpdCddLFxuICAgIGVkZ2VzOiAnICBuICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNocmluZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmYsXG4gICAgdGlsZXNldHM6IHtzaHJpbmU6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA1fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaW5uID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMDAsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbey4uLmRvb3IoMHg4NiksIGVudHJhbmNlOiAweDk0XzY4fV0sXG4gIH0pO1xuICByZWFkb25seSB0b29sU2hvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTAxLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW3suLi5kb29yKDB4ODYpLCBlbnRyYW5jZTogMHg5NF82OH1dLFxuICB9KTtcbiAgcmVhZG9ubHkgYXJtb3JTaG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMDIsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbey4uLmRvb3IoMHg4NiksIGVudHJhbmNlOiAweDk0XzY4fV0sXG4gIH0pO1xuICByZWFkb25seSBleGl0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4N2ZmZiwgLy8gd2lsbCBuZXZlciBiZSBpbnN0YW50aWF0ZWRcbiAgICB0aWxlc2V0czoge30sIC8vIG5vdCBkaXJlY3RseSBpbmNsdWRlZCBpbiBhbnlcbiAgICAvLyBDaGVjayBmb3IgZWRnZSBleGl0cyBpbiBwb3RlbnRpYWwgbmVpZ2hib3JzXG4gICAgYWxsb3dlZDogKHMpID0+IChzLmRhdGEuZXhpdHMgfHwgW10pXG4gICAgICAgIC5tYXAoZSA9PiAoZWRnZVR5cGVNYXBbZS50eXBlXSEgXiAyKSBhcyAoMCB8IDEgfCAyIHwgMykpXG4gICAgICAgIC5maWx0ZXIoZCA9PiBkICE9IG51bGwpLFxuICB9KTtcblxuICBjaGVja0V4aXRUeXBlcygpIHtcbiAgICAvLyBEb2VzIGEgcXVpY2sgY2hlY2sgdG8gbWFrZSBzdXJlIHRoZXJlJ3Mgbm8gY29uZmxpY3RpbmcgZXhpdCB0eXBlc1xuICAgIC8vIG9uIGFueSBtZXRhc2NyZWVucy5cbiAgICBmb3IgKGNvbnN0IHMgaW4gdGhpcykge1xuICAgICAgY29uc3QgbXMgPSB0aGlzW3NdIGFzIGFueTtcbiAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgZSBvZiBtcz8uZGF0YT8uZXhpdHMgfHwgW10pIHtcbiAgICAgICAgaWYgKHNlZW4uaGFzKGUudHlwZSkpIGNvbnNvbGUubG9nKGBkdXBsaWNhdGU6ICR7c30gJHtlLnR5cGV9YCk7XG4gICAgICAgIHNlZW4uYWRkKGUudHlwZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IGVkZ2VUeXBlTWFwOiB7W0MgaW4gQ29ubmVjdGlvblR5cGVdPzogbnVtYmVyfSA9IHtcbiAgJ2VkZ2U6dG9wJzogMCxcbiAgJ2VkZ2U6bGVmdCc6IDEsXG4gICdlZGdlOmJvdHRvbSc6IDIsXG4gICdlZGdlOnJpZ2h0JzogMyxcbn07XG5cblxuLy8gICDilZTilabilZcgICAgICAgICDilaIgIOKVpVxuLy8gICDilaDilazilaMg4pWe4pWQ4pWk4pWn4pWq4pWhICDilZEgIOKVq1xuLy8gICDilZrilanilZ0gICAgICAgICDilaggIOKVn1xuLy8gIOKUjOKUrOKUkCAg4pW3XG4vLyAg4pSc4pS84pSkICDilIIg4pW24pSA4pW0IFxuLy8gIOKUlOKUtOKUmCAg4pW1XG4vLyDilpfiloTilpYgICDilp/ilplcbi8vIOKWkOKWiOKWjCAgIOKWnOKWmyBcbi8vIOKWneKWgOKWmFxuLy8gVSsyNTB4IOKUgCDilIEg4pSCIOKUgyDilIQg4pSFIOKUhiDilIcg4pSIIOKUiSDilIog4pSLIOKUjCDilI0g4pSOIOKUj1xuLy8gVSsyNTF4IOKUkCDilJEg4pSSIOKUkyDilJQg4pSVIOKUliDilJcg4pSYIOKUmSDilJog4pSbIOKUnCDilJ0g4pSeIOKUn1xuLy8gVSsyNTJ4IOKUoCDilKEg4pSiIOKUoyDilKQg4pSlIOKUpiDilKcg4pSoIOKUqSDilKog4pSrIOKUrCDilK0g4pSuIOKUr1xuLy8gVSsyNTN4IOKUsCDilLEg4pSyIOKUsyDilLQg4pS1IOKUtiDilLcg4pS4IOKUuSDilLog4pS7IOKUvCDilL0g4pS+IOKUv1xuLy8gVSsyNTR4IOKVgCDilYEg4pWCIOKVgyDilYQg4pWFIOKVhiDilYcg4pWIIOKViSDilYog4pWLIOKVjCDilY0g4pWOIOKVj1xuLy8gVSsyNTV4IOKVkCDilZEg4pWSIOKVkyDilZQg4pWVIOKVliDilZcg4pWYIOKVmSDilZog4pWbIOKVnCDilZ0g4pWeXHTilZ9cbi8vIFUrMjU2eCDilaAg4pWhIOKVoiDilaMg4pWkIOKVpSDilaYg4pWnIOKVqCDilakg4pWqIOKVqyDilawg4pWtIOKVriDila9cbi8vIFUrMjU3eCDilbAg4pWxIOKVsiDilbMg4pW0IOKVtSDilbYg4pW3IOKVuCDilbkg4pW6IOKVuyDilbwg4pW9IOKVviDilb9cbi8vIFUrMjU4eCDiloAg4paBIOKWgiDiloMg4paEIOKWhSDiloYg4paHIOKWiCDilokg4paKIOKWiyDilowg4paNIOKWjiDilo9cbi8vIFUrMjU5eCDilpAg4paRIOKWkiDilpMg4paUIOKWlSDilpYg4paXIOKWmCDilpkg4paaIOKWmyDilpwg4padIOKWniDilp9cbi8vXG4vLyDiiKkgXFxjYXBcbiJdfQ==