import { DefaultMap, hex1 } from '../util.js';
import { Metascreen } from './metascreen.js';
import { bottomEdge, bottomEdgeHouse, cave, door, downStair, icon, leftEdge, readScreen, rightEdge, seamlessDown, seamlessUp, topEdge, upStair, waterfallCave, } from './metascreendata.js';
import { ScreenFix } from './screenfix.js';
const DEBUG = false;
export class Metascreens {
    constructor(rom) {
        this.rom = rom;
        this.length = 0;
        this.screensByFix = new DefaultMap(() => []);
        this.screensById = new DefaultMap(() => []);
        this.registeredFixes = new Set();
        this.overworldEmpty = this.metascreen({
            id: 0x00,
            icon: icon `
      |███|
      |███|
      |███|`,
            tile: '   |   |   ',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            feature: ['empty'],
            edges: '    ',
            delete: true,
        });
        this.boundaryW_trees = this.metascreen({
            id: 0x01,
            icon: icon `
      |█▌ |
      |█▌^|
      |█▌ |`,
            tile: ' oo| oo| oo',
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
            tile: ' oo| oo| oo',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '> >o',
        });
        this.boundaryE_rocks = this.metascreen({
            id: 0x03,
            icon: icon `
      |.▐█|
      | ▐█|
      |.▐█|`,
            tile: 'oo |oo |oo ',
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
            tile: 'oo |oo |oo ',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<o< ',
        });
        this.longGrassS = this.metascreen({
            id: 0x05,
            icon: icon `
      |vv |
      | vv|
      |   |`,
            tile: 'olo|ooo|   ',
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
            tile: '   |ooo|olo',
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
            tile: 'ooo|ooo|   ',
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
            placement: 'manual',
            tile: ['   |oFo|ooo', 'oo |oFo|ooo'],
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
            tile: 'ooo|ooo|oo ',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'oo<^',
        });
        this.exitW_cave = this.metascreen({
            id: 0x0a,
            icon: icon `∩
      |█∩█|
      |  █|
      |███|`,
            tile: ['   |o< |   ', '   |x< |   '],
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
            tile: 'oo |ooo|ogo',
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
            tile: '   | oo| oo',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '  >v',
        });
        this.overworldEmpty_alt = this.metascreen({
            id: 0x0c,
            icon: icon `
      |███|
      |███|
      |███|`,
            placement: 'manual',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            feature: ['empty', 'manual'],
            edges: '    ',
            match: () => false,
            delete: true,
        });
        this.cornerNE = this.metascreen({
            id: 0x0d,
            icon: icon `▜
      |███|
      |▀██|
      | ▐█|`,
            tile: '   |oo |oo ',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: ' v< ',
        });
        this.cornerSW = this.metascreen({
            id: 0x0e,
            icon: icon `▙
      |█▌ |
      |██▄|
      |███|`,
            tile: ' oo| oo|   ',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '>  ^',
        });
        this.cornerSE = this.metascreen({
            id: 0x0f,
            icon: icon `▟
      | ▐█|
      |▄██|
      |███|`,
            tile: 'oo |oo |   ',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<^  ',
        });
        this.exitE = this.metascreen({
            id: 0x10,
            icon: icon `╶
      | ▐█|
      |   |
      | ▐█|`,
            tile: ['oo |ooo|oo ', 'oo |oox|oo '],
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
            tile: '   |ooo|ooo',
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
            placement: 'manual',
            tile: 'roo|1rr| oo',
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
            placement: 'manual',
            tile: ' ↓ | oo|roo',
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
            tile: 'ooo|orr|oro',
            tilesets: { river: {} },
            edges: 'oorr',
        });
        this.boundaryW_cave = this.metascreen({
            id: 0x15,
            icon: icon `
      |█▌ |
      |█∩ |
      |█▌ |`,
            tile: ' oo| <o| oo',
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
            tile: [' o |ooo|ooo', ' x |ooo|ooo'],
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
            tile: 'ooo|ror|ooo',
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
            tile: 'oo |rr |oo ',
            tilesets: { river: {} },
            edges: '<r< ',
        });
        this.boundaryE_cave = this.metascreen({
            id: 0x19,
            icon: icon `
      | ▐█|
      |v∩█|
      |v▐█|`,
            tile: 'oo |o< |oo ',
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
            tile: ' oo|Boo|   ',
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
            tile: ' oo|8oo| oo',
            tilesets: { grass: {}, river: {} },
            edges: '>n>o',
            exits: [leftEdge({ top: 8, height: 3, shift: -0.5 })],
        });
        this.shortGrassS = this.metascreen({
            id: 0x1d,
            icon: icon ` |
      |;;;|
      | v |
      |   |`,
            tile: 'ogo|ooo|ooo',
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
            tile: ['ooo|ooo| o ', 'ooo|ooo| x '],
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
            tile: 'oro|orr|oro',
            tilesets: { river: {} },
            edges: 'rorr',
        });
        this.riverWE = this.metascreen({
            id: 0x21,
            icon: icon `
      |   |
      |═══|
      |   |`,
            tile: 'ooo|rrr|ooo',
            tilesets: { river: {} },
            edges: 'oror',
        });
        this.riverBoundaryS_waterfall = this.metascreen({
            id: 0x22,
            icon: icon `╨
      | ║ |
      |▄║▄|
      |█/█|`,
            tile: 'oro|oro|   ',
            tilesets: { river: {} },
            edges: 'r^ ^',
        });
        this.shortGrassSE = this.metascreen({
            id: 0x23,
            icon: icon `
      |;;;|
      |;  |
      |; ^|`,
            tile: 'ogo|goo|ooo',
            tilesets: { grass: {} },
            edges: 'ssoo',
        });
        this.shortGrassNE = this.metascreen({
            id: 0x24,
            icon: icon ` |
      |;  |
      |;v |
      |;;;|`,
            tile: 'ooo|goo|ogo',
            tilesets: { grass: {} },
            edges: 'osso',
        });
        this.stomHouseOutside = this.metascreen({
            id: 0x25,
            icon: icon `∩
      |███|
      |▌∩▐|
      |█ █|`,
            placement: 'manual',
            tile: ['   | H | o ', '   | H | x '],
            tilesets: { grass: {} },
            exits: [door(0x68), bottomEdge({ shift: 0.5 })],
        });
        this.bendNW_trees = this.metascreen({
            id: 0x26,
            icon: icon `▘
      |█▌ |
      |▀ ^|
      | ^^|`,
            tile: ' oo|ooo|ooo',
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
            tile: 'ogo|oog|ooo',
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
            tile: 'oro|rro|oro',
            tilesets: { river: {} },
            edges: 'rrro',
        });
        this.shortGrassNW = this.metascreen({
            id: 0x29,
            icon: icon `
      |  ;|
      | v;|
      |;;;|`,
            tile: 'ooo|oog|ogo',
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
            tile: [' o | o | o ', ' x | o | o ', ' o | o | x '],
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
            tile: ['   | < | o ', '   | < | x '],
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
            placement: 'manual',
            tile: ['   | W | o ', '   | W | x '],
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
            tile: '   |x< |   ',
            tilesets: { grass: {} },
            edges: ' n  ',
            exits: [cave(0x4a), leftEdge({ top: 5, height: 3, shift: -0.5 })],
            flag: 'custom:true',
        });
        this.riverNS = this.metascreen({
            id: 0x2e,
            icon: icon `
      | ║ |
      | ║ |
      | ║ |`,
            tile: 'oro|ooo|oro',
            tilesets: { river: {} },
            edges: 'roro',
            mod: 'bridge',
        });
        this.riverNS_bridge = this.metascreen({
            id: 0x2f,
            icon: icon `
      | ║ |
      |w╏w|
      | ║ |`,
            placement: 'mod',
            tile: 'oro|oro|oro',
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
            tile: 'oo |rro|oro',
            tilesets: { river: {} },
            edges: '<rrv',
        });
        this.boundaryN_waterfallCave = this.metascreen({
            id: 0x31,
            icon: icon `
      |▛/█|
      |▘║▀|
      | ║ |`,
            tile: '   |oro|oro',
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
            tile: 'ooo|ooo|ooo',
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
            tile: ['ooo|ooo| o ', 'ooo|ooo| x |'],
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
            tile: ' oo|ooo|ooo',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '>voo',
        });
        this.bendNE = this.metascreen({
            id: 0x35,
            icon: icon `▝
      | ▐█|
      |  ▀|
      |   |`,
            tile: 'oo |ooo|ooo',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: '<oov',
        });
        this.bendSE = this.metascreen({
            id: 0x36,
            icon: icon `▗
      |   |
      | ▄▄|
      | ▐█|`,
            tile: 'ooo|ooo|oo ',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'oo<^',
        });
        this.bendWS = this.metascreen({
            id: 0x37,
            icon: icon `▖
      |   |
      |▄▄ |
      |█▌ |`,
            tile: 'ooo|ooo| oo',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'o^>o',
        });
        this.towerPlain_upStair = this.metascreen({
            id: 0x38,
            icon: icon `┴
      | ┊ |
      |─┴─|
      |   |`,
            tile: ' t |ttt|   ',
            tilesets: { tower: {} },
            edges: 'st t',
            exits: [topEdge({ left: 8 }), seamlessDown(0x08, 2)],
        });
        this.towerRobotDoor_downStair = this.metascreen({
            id: 0x39,
            icon: icon `┬
      | ∩ |
      |─┬─|
      | ┊ |`,
            tile: '   |ttt| t ',
            tilesets: { tower: {} },
            edges: ' tst',
            exits: [seamlessUp(0xe8, 2), seamlessDown(0xf8, 2)],
        });
        this.towerDynaDoor = this.metascreen({
            id: 0x3a,
            icon: icon `∩
      | ∩ |
      |└┬┘|
      | ┊ |`,
            tile: '   | < | t ',
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
            tile: ' t | t | t ',
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
            placement: 'manual',
            tile: '   | < | ↓ ',
            tilesets: { river: {} },
            edges: '  1 ',
            feature: ['portoa1'],
            exits: [cave(0x66)],
        });
        this.cornerNE_flowers = this.metascreen({
            id: 0x3f,
            icon: icon `▜
      |███|
      |▀*█|
      | ▐█|`,
            tile: '   |oo |oo ',
            tilesets: { grass: {} },
            edges: ' v< ',
        });
        this.towerEdge = this.metascreen({
            id: 0x40,
            icon: icon ` |
      |   |
      |┤ ├|
      |   |`,
            tile: '   |t t|   ',
            tilesets: { tower: {} },
            edges: ' t t',
        });
        this.towerEdgeW = this.metascreen({
            id: 0x40,
            icon: icon ` |
      |   |
      |┤  |
      |   |`,
            tile: '   |t  |   ',
            tilesets: { tower: {} },
            edges: ' t  ',
        });
        this.towerEdgeE = this.metascreen({
            id: 0x40,
            icon: icon ` |
      |   |
      |  ├|
      |   |`,
            tile: '   |  t|   ',
            tilesets: { tower: {} },
            edges: '   t',
        });
        this.towerRobotDoor = this.metascreen({
            id: 0x41,
            icon: icon `─
      | O |
      |───|
      |   |`,
            tile: '   |ttt|   ',
            tilesets: { tower: {} },
            edges: ' t t',
        });
        this.towerDoor = this.metascreen({
            id: 0x42,
            icon: icon `∩
      | ∩ |
      |─┴─|
      |   |`,
            tile: '   |t<t|   ',
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
            tallHouses: [0x35],
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
            tallHouses: [0x5a],
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
            exits: [cave(0x47, 'fortress'), bottomEdge()],
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
            tallHouses: [0x6a],
        });
        this.leafSE_exitE = this.metascreen({
            id: 0x66,
            tilesets: { town: { type: 'square' } },
            exits: [rightEdge({ top: 3, height: 3, shift: -0.5 }), door(0x84)],
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
            tile: ' w | > |   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: 'w   ',
            connect: '2',
            exits: [downStair(0xc7)],
            statues: [4],
        });
        this.goaWideDeadEndN = this.metascreen({
            id: 0x71,
            icon: icon `
      |╵┃╵|
      | > |
      |   |`,
            tile: ' w | > |   ',
            tilesets: { labyrinth: {} },
            edges: 'w   ',
            connect: '1|2x|3',
            exits: [downStair(0xc7)],
            statues: [4],
        });
        this.wideHallNS = this.metascreen({
            id: 0x72,
            icon: icon `
      | ┃ |
      | ┃ |
      | ┃ |`,
            tile: ' w | w | w ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: 'w w ',
            connect: '2a',
            statues: [1, 7, 0xd],
        });
        this.goaWideHallNS = this.metascreen({
            id: 0x72,
            icon: icon `
      |│┃│|
      |│┃│|
      |│┃│|`,
            tile: ' w | w | w ',
            tilesets: { labyrinth: {} },
            edges: 'w w ',
            connect: '19|2a|3b',
            statues: [1, 7, 0xd],
        });
        this.goaWideHallNS_blockedRight = this.metascreen({
            id: 0x72,
            icon: icon `
      |│┃│|
      |│┃ |
      |│┃│|`,
            placement: 'mod',
            tile: ' w | w | w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x9d] } },
            edges: 'w w ',
            connect: '19|2a|3|b',
        });
        this.goaWideHallNS_blockedLeft = this.metascreen({
            id: 0x72,
            icon: icon `
      |│┃│|
      | ┃│|
      |│┃│|`,
            placement: 'mod',
            tile: ' w | w | w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x51] } },
            edges: 'w w ',
            connect: '1|9|2a|3b',
        });
        this.goaWideArena = this.metascreen({
            id: 0x73,
            icon: icon `<
      |╻<╻|
      |┡━┩|
      |│╻│|`,
            placement: 'manual',
            tile: '   | < | w ',
            tilesets: { labyrinth: {} },
            feature: ['arena'],
            edges: 'w w ',
            connect: '9b|a',
            exits: [upStair(0x37)],
        });
        this.limeTreeLake = this.metascreen({
            id: 0x74,
            tilesets: { lime: {} },
            exits: [bottomEdgeHouse(), cave(0x47)],
            feature: ['bridge'],
            wall: 0x67,
        });
        this.swampNW = this.metascreen({
            id: 0x75,
            icon: icon `
      | │ |
      |─┘ |
      |   |`,
            tile: ' c |cc |   ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 'ss  ',
            connect: '26',
            exits: [topEdge({ left: 6, width: 4 }),
                leftEdge({ top: 7, height: 4, shift: -0.5 })],
            poi: [[2]],
        });
        this.swampE = this.metascreen({
            id: 0x76,
            icon: icon `
      |   |
      | ╶─|
      |   |`,
            tile: '   | cc|   ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: '   s',
            connect: 'e',
            exits: [],
            poi: [[0]],
        });
        this.swampE_door = this.metascreen({
            id: 0x76,
            icon: icon `∩
      | ∩ |
      | ╶─|
      |   |`,
            tile: '   | <c|   ',
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
            tile: ' c |ccc| c ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 'ssss',
            connect: '26ae',
            exits: [topEdge({ left: 6, width: 4 }),
                leftEdge({ top: 7, height: 4, shift: -0.5 }),
                bottomEdge({ left: 6, width: 4 }),
                rightEdge({ top: 7, height: 4, shift: -0.5 })],
        });
        this.swampNWS = this.metascreen({
            id: 0x78,
            icon: icon `
      | │ |
      |─┤ |
      | │ |`,
            tile: ' c |cc | c ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 'sss ',
            connect: '26a',
            exits: [topEdge({ left: 6, width: 4 }),
                leftEdge({ top: 7, height: 4, shift: -0.5 }),
                bottomEdge({ left: 6, width: 4 })],
        });
        this.swampNE = this.metascreen({
            id: 0x79,
            icon: icon `
      | │ |
      | └─|
      |   |`,
            tile: ' c | cc|   ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 's  s',
            connect: '2e',
            exits: [topEdge({ left: 6, width: 4 }),
                rightEdge({ top: 7, height: 4, shift: -0.5 })],
            poi: [[2]],
        });
        this.swampWSE = this.metascreen({
            id: 0x7a,
            icon: icon `
      |   |
      |─┬─|
      | │ |`,
            tile: '   |ccc| c ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: ' sss',
            connect: '6ae',
            exits: [leftEdge({ top: 7, height: 4, shift: -0.5 }),
                bottomEdge({ left: 6, width: 4 }),
                rightEdge({ top: 7, height: 4, shift: -0.5 })],
        });
        this.swampWSE_door = this.metascreen({
            id: 0x7a,
            icon: icon `∩
      | ∩ |
      |─┬─|
      | │ |`,
            tile: '   |c<c| c ',
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
            tile: '   |cc |   ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: ' s  ',
            connect: '6',
            poi: [[0]],
        });
        this.swampW_door = this.metascreen({
            id: 0x7b,
            icon: icon `∩
      | ∩ |
      |─╴ |
      |   |`,
            tile: '   |c< |   ',
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
            tile: '   | a | c ',
            tilesets: { swamp: {} },
            feature: ['arena'],
            edges: '  s ',
            connect: 'a',
        });
        this.swampNWE = this.metascreen({
            id: 0x7d,
            icon: icon `
      | │ |
      |─┴─|
      |   |`,
            tile: ' c |ccc|   ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 'ss s',
            connect: '26e',
            exits: [topEdge({ left: 6, width: 4 }),
                leftEdge({ top: 7, height: 4 }),
                rightEdge({ top: 7, height: 4 })],
        });
        this.swampWS = this.metascreen({
            id: 0x7e,
            icon: icon `
      |   |
      |─┐ |
      | │ |`,
            tile: '   |cc | c ',
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            update: [[ScreenFix.SwampDoors, (s, seed, rom) => {
                        rom.metascreens.swampWS_door.flag = 'always';
                        return true;
                    }]],
            edges: ' ss ',
            connect: '6a',
            exits: [leftEdge({ top: 7, height: 4 }), bottomEdge({ left: 6, width: 4 })],
            poi: [[2]],
        });
        this.swampWS_door = this.metascreen({
            id: 0x7e,
            icon: icon `∩
      | ∩ |
      |─┐ |
      | │ |`,
            tile: '   |c< | c ',
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
            tile: '   |   |   ',
            tilesets: { swamp: {} },
            feature: ['empty'],
            edges: '    ',
            connect: '',
            delete: true,
        });
        this.swampN = this.metascreen({
            id: ~0x70,
            icon: icon `
      | │ |
      | ╵ |
      |   |`,
            tile: ' c | c |   ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 's   ',
            connect: '2',
            poi: [[0]],
            definition: constant(readScreen(`.  .  .  .  cf f6 c7 ad c4 b7 f6 cc .  .  .  .
         .  .  .  .  cf f6 b8 b9 c3 b7 f6 cc .  .  .  .
         .  .  .  .  cf f6 b7 b8 ad ad d2 cc .  .  .  .
         .  .  .  .  cf d3 c2 c3 b7 b8 d2 cc .  .  .  .
         .  .  .  .  cf d3 b6 c2 b7 b7 f6 cc .  .  .  .
         .  .  .  .  cf d3 ad ad b9 b7 f6 cc .  .  .  .
         .  .  .  .  cf d3 ad ad ad ad d2 cc .  .  .  .
         .  .  .  .  cf d3 b9 b8 ad ad d2 e2 .  .  .  .
         .  .  .  .  e3 f6 c3 c3 b8 b6 d2 .  .  .  .  .
         .  .  .  .  .  e3 fd ad ad fc e2 .  .  .  .  .
         .  .  .  .  .  .  ff fb fb fa .  .  .  .  .  .
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .`, ['.', 0xc8])),
        });
        this.swampS = this.metascreen({
            id: ~0x71,
            icon: icon `
      |   |
      | ╷ |
      | │ |`,
            tile: '   | c | c ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: '  s ',
            connect: 'a',
            poi: [[0]],
            definition: constant(readScreen(`.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         .  .  .  .  .  .  cd c9 c9 ca .  .  .  .  .  .
         .  .  .  .  .  cd eb a0 a0 cb ca .  .  .  .  .
         .  .  .  .  cf a0 f9 f5 f7 f8 cb cc .  .  .  .
         .  .  .  .  cf a0 ed 08 09 a0 a0 cc .  .  .  .
         .  .  .  .  cf db ee 0c 0b ef a0 cc .  .  .  .
         .  .  .  .  cf d0 d1 03 03 d8 db cc .  .  .  .
         .  .  .  .  cf f6 c7 ad ad ae d2 cc .  .  .  .
         .  .  .  .  cf d3 ad b9 b7 b7 f6 cc .  .  .  .
         .  .  .  .  cf d3 c2 c3 c3 b7 f6 cc .  .  .  .
         .  .  .  .  cf f6 c5 c3 c3 b7 f6 cc .  .  .  .
         .  .  .  .  cf d3 b6 c2 c3 c3 f6 cc .  .  .  .
         .  .  .  .  cf f6 b8 b6 b6 b6 d2 cc .  .  .  .
         .  .  .  .  cf f6 b7 b7 b7 b7 f6 cc .  .  .  .
         .  .  .  .  cf f6 b7 b7 b8 b6 d2 cc .  .  .  .`, ['.', 0xc8])),
        });
        this.swampNS = this.metascreen({
            id: ~0x72,
            icon: icon `
      | │ |
      | │ |
      | │ |`,
            tile: ' c | c | c ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 's s ',
            connect: '2a',
            exits: [topEdge({ left: 6, width: 4 }), bottomEdge({ left: 6, width: 4 })],
            definition: constant(readScreen(`.  .  .  .  cf d3 b6 b6 c6 b6 f6 cc .  .  .  .
         .  .  .  .  cf d3 b6 c3 c7 b6 f6 cc .  .  .  .
         .  .  .  .  cf f5 c3 c7 b6 b6 d2 cc .  .  .  .
         .  .  .  .  cf d3 b6 b6 c6 c5 f6 cc .  .  .  .
         .  .  .  .  cf d9 b6 c6 c3 c7 d2 cc .  .  .  .
         .  .  .  .  cf f5 c3 c3 c3 c3 f6 cc .  .  .  .
         .  .  .  .  cf d9 ad c2 c3 c3 f6 cc .  .  .  .
         .  .  .  .  cf d9 c4 c5 c3 c3 f6 cc .  .  .  .
         .  .  .  .  cf f5 b7 b7 b8 b6 d2 cc .  .  .  .
         .  .  .  .  cf d9 c2 b8 b6 b6 d2 cc .  .  .  .
         .  .  .  .  cf d9 b6 c2 b7 b7 f6 cc .  .  .  .
         .  .  .  .  cf d9 b6 b6 b6 b6 d2 cc .  .  .  .
         .  .  .  .  cf f6 b7 b7 b8 b6 d2 cc .  .  .  .
         .  .  .  .  cf d3 b9 b7 b7 b7 f6 cc .  .  .  .
         .  .  .  .  cf f6 b7 b7 c7 b6 d2 cc .  .  .  .`, ['.', 0xc8])),
        });
        this.swampWE = this.metascreen({
            id: ~0x73,
            icon: icon `
      |   |
      |───|
      |   |`,
            tile: '   |ccc|   ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: ' s s',
            connect: '6e',
            exits: [leftEdge({ top: 7, height: 4, shift: -0.5 }),
                rightEdge({ top: 7, height: 4, shift: -0.5 })],
            definition: constant(readScreen(`.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9
         a0 e4 e8 eb e4 a0 a0 a0 eb eb e8 f0 f1 a0 e4 a0
         a0 e5 e9 f9 f5 f6 f6 f7 ec f9 f7 f8 f2 a0 e5 a0
         a0 e6 f0 f1 e6 e0 08 09 ed de ea de f2 a0 e6 a0
         db e7 db f3 e7 e1 0c 0b dd df e0 df f3 db e7 e0
         d0 d1 da da d0 d1 03 03 d0 d1 d0 d1 da da da da
         ad c4 ad ad ad ad ad ad ad ad ad ad ad ad ad ad
         c2 c5 b8 c6 c4 c4 b9 c7 c4 c5 c5 c7 ad ad ad ad
         ad ad ad ad c2 c3 c3 c3 c3 c3 c7 ad ad ad ad ad
         fb fb fb fb fb fb fb fb fb fb fb fb fb fb fb fb
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .`, ['.', 0xc8])),
        });
        this.swampWE_door = this.metascreen({
            id: ~0x73,
            icon: icon `∩
      | ∩ |
      |───|
      |   |`,
            tile: '   |c<c|   ',
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            flag: 'always',
            edges: ' s s',
            connect: '6e',
            exits: [cave(0x56, 'swamp')],
        });
        this.swampSE = this.metascreen({
            id: ~0x74,
            icon: icon `
      |   |
      | ┌─|
      | │ |`,
            tile: '   | cc| c ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: '  ss',
            connect: 'ae',
            exits: [rightEdge({ top: 7, height: 4, shift: -0.5 }),
                bottomEdge({ left: 6, width: 4 })],
            poi: [[2]],
            definition: constant(readScreen(`.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
         .  .  .  .  .  .  cd c9 c9 c9 c9 c9 c9 c9 c9 c9
         .  .  .  .  .  cd a0 a0 a0 e8 04 a0 e8 a0 a0 e4
         .  .  .  .  cf f8 a0 f0 f1 f5 f5 f7 e9 f4 f7 e5
         .  .  .  .  cf f6 f7 f8 f2 ea 06 aa e9 f0 f1 e6
         .  .  .  .  cf a0 dd e0 f3 e0 07 0c ea db f3 e7
         .  .  .  .  cf db d5 d0 d1 d1 03 03 d0 d1 da da
         .  .  .  .  cf d5 af c4 c4 ad ad ad ad ad c4 ad
         .  .  .  .  cf d3 b9 c3 c3 b8 ad ad ad c2 b7 b8
         .  .  .  .  cf f6 c3 c3 c3 c3 b8 ad ad ad ad ad
         .  .  .  .  cf f6 c7 ad c2 c3 c7 fc fb fb fb fb
         .  .  .  .  cf d3 ad ad ad ad d6 cc .  .  .  .
         .  .  .  .  cf d3 b9 b8 ad b9 f6 cc .  .  .  .
         .  .  .  .  cf f6 c7 ad b9 c7 d2 cc .  .  .  . 
         .  .  .  .  cf d3 b6 b9 c3 b8 d2 cc .  .  .  .`, ['.', 0xc8])),
        });
        this.swampSE_door = this.metascreen({
            id: ~0x74,
            icon: icon `∩
      | ∩ |
      | ┌─|
      | │ |`,
            tile: '   | <c| c ',
            tilesets: { swamp: { requires: [ScreenFix.SwampDoors] } },
            feature: ['consolidate'],
            flag: 'always',
            edges: '  ss',
            connect: 'ae',
            exits: [cave(0x5a, 'swamp')],
        });
        this.swampNSE = this.metascreen({
            id: ~0x75,
            icon: icon `
      | │ |
      | ├─|
      | │ |`,
            tile: ' c | cc| c ',
            tilesets: { swamp: {} },
            feature: ['consolidate'],
            edges: 's ss',
            connect: '2ae',
            exits: [topEdge({ left: 6, width: 4 }),
                bottomEdge({ left: 6, width: 4 }),
                rightEdge({ top: 7, height: 4, shift: -0.5 })],
            definition: constant(readScreen(`.  .  .  .  cf d3 c4 c3 c3 c3 f7 f8 ca .  .  .
         .  .  .  .  cf f5 c3 c3 c3 c3 f7 f7 a0 ca c9 c9
         .  .  .  .  cf f6 c3 c3 b8 b6 d2 f7 f8 e8 e4 a0
         .  .  .  .  cf f5 b7 c3 b7 b8 d2 f0 f1 e9 e5 de
         .  .  .  .  cf d3 c2 b8 c2 b8 d8 db f2 ea e6 df
         .  .  .  .  cf d3 ad ad ad ad ae d4 f3 dd e7 df
         .  .  .  .  cf d3 ad ad ad ad ad ae d0 d1 d0 d1
         .  .  .  .  cf d3 c2 c3 c3 b7 b8 ad ad ad ad ad
         .  .  .  .  cf d3 ad ad c2 b7 b7 b7 b8 c4 ad ad
         .  .  .  .  cf d3 ad ad b6 b9 b7 b7 b7 b7 b8 ad
         .  .  .  .  cf d3 ad c4 c3 b7 b8 fc fb fb fb fb
         .  .  .  .  cf d3 b6 ad ad ad d6 cc .  .  .  .
         .  .  .  .  cf d3 ad ad ad ad d2 cc .  .  .  .
         .  .  .  .  cf d3 c4 c3 b7 b8 d2 cc .  .  .  .
         .  .  .  .  cf d3 b6 b9 b7 b7 f6 cc .  .  .  .`, ['.', 0xc8])),
        });
        this.caveEmpty = this.metascreen({
            id: 0x80,
            icon: icon `
      |   |
      |   |
      |   |`,
            tile: '   |   |   ',
            tilesets: { cave: {}, fortress: {}, labyrinth: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: '    ',
            delete: true,
        });
        this.dolphinCave_empty = this.metascreen({
            id: 0x80,
            icon: icon `
      |   |
      |   |
      |   |`,
            tile: '   |   |   ',
            tilesets: { dolphinCave: {} },
            feature: ['empty'],
            edges: '    ',
            delete: true,
        });
        this.open = this.metascreen({
            id: 0x80,
            icon: icon `
      |   |
      |   |
      |   |`,
            tile: 'ooo|ooo|ooo',
            tilesets: { desert: {}, sea: {} },
            edges: 'oooo',
        });
        this.hallNS = this.metascreen({
            id: 0x81,
            icon: icon `
      | │ |
      | │ |
      | │ |`,
            tile: ' c | c | c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c c ',
            connect: '2a',
            poi: [[4]],
            exits: [bottomEdge({ left: 6, width: 4, manual: true }),
                topEdge({ left: 6, width: 4, manual: true })],
        });
        this.hallNS_unreachable = this.metascreen({
            id: 0x81,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallWE = this.metascreen({
            id: 0x82,
            icon: icon `
      |   |
      |───|
      |   |`,
            tile: '   |ccc|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' c c',
            connect: '6e',
            poi: [[4]],
        });
        this.hallWE_unreachable = this.metascreen({
            id: 0x82,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallSE = this.metascreen({
            id: 0x83,
            icon: icon `
      |   |
      | ┌─|
      | │ |`,
            tile: '   | cc| c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: '  cc',
            connect: 'ae',
            poi: [[2]],
        });
        this.hallSE_unreachable = this.metascreen({
            id: 0x83,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallWS = this.metascreen({
            id: 0x84,
            icon: icon `
      |   |
      |─┐ |
      | │ |`,
            tile: '   |cc | c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' cc ',
            connect: '6a',
            poi: [[2]],
        });
        this.hallWS_unreachable = this.metascreen({
            id: 0x84,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallNE = this.metascreen({
            id: 0x85,
            icon: icon `
      | │ |
      | └─|
      |   |`,
            tile: ' c | cc|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c  c',
            connect: '2e',
            poi: [[2]],
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.hallNE_unreachable = this.metascreen({
            id: 0x85,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallNW = this.metascreen({
            id: 0x86,
            icon: icon `
      | │ |
      |─┘ |
      |   |`,
            tile: ' c |cc |   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'cc  ',
            connect: '26',
            poi: [[2]],
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.hallNW_unreachable = this.metascreen({
            id: 0x86,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.branchNSE = this.metascreen({
            id: 0x87,
            icon: icon `
      | │ |
      | ├─|
      | │ |`,
            tile: ' c | cc| c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c cc',
            connect: '2ae',
            poi: [[3]],
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.branchNSE_unreachable = this.metascreen({
            id: 0x87,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.branchNWSE = this.metascreen({
            id: 0x88,
            icon: icon `
      | │ |
      |─┼─|
      | │ |`,
            tile: ' c |ccc| c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'cccc',
            connect: '26ae',
            poi: [[3]],
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.branchNWSE_unreachable = this.metascreen({
            id: 0x88,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.branchNWS = this.metascreen({
            id: 0x89,
            icon: icon `
      | │ |
      |─┤ |
      | │ |`,
            tile: ' c |cc | c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'ccc ',
            connect: '26a',
            poi: [[3]],
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.branchNWS_unreachable = this.metascreen({
            id: 0x89,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.branchWSE = this.metascreen({
            id: 0x8a,
            icon: icon `
      |   |
      |─┬─|
      | │ |`,
            tile: '   |ccc| c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' ccc',
            connect: '6ae',
            poi: [[3]],
        });
        this.branchWSE_unreachable = this.metascreen({
            id: 0x8a,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.branchNWE = this.metascreen({
            id: 0x8b,
            icon: icon `
      | │ |
      |─┴─|
      |   |`,
            tile: ' c |ccc|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'cc c',
            connect: '26e',
            poi: [[3]],
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.branchNWE_unreachable = this.metascreen({
            id: 0x8b,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallNS_ramp = this.metascreen({
            id: 0x8c,
            icon: icon `
      | ┋ |
      | ┋ |
      | ┋ |`,
            tile: ' c | / | c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['ramp'],
            edges: 'c c ',
            connect: '2a',
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.hallNS_ramp_unreachable = this.metascreen({
            id: 0x8c,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallNS_overBridge = this.metascreen({
            id: 0x8d,
            icon: icon `
      | ╽ |
      |─┃─|
      | ╿ |`,
            tile: ' c | b | c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['overpass'],
            edges: 'cbcb',
            connect: '2a',
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.hallWE_underBridge = this.metascreen({
            id: 0x8e,
            icon: icon `
      | ╽ |
      |───|
      | ╿ |`,
            tile: '   |cbc|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['underpass'],
            edges: 'bcbc',
            connect: '6e',
        });
        this.hallNS_wall = this.metascreen({
            id: 0x8f,
            icon: icon `
      | │ |
      | ┆ |
      | │ |`,
            tile: ' c | c | c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c c ',
            feature: ['wall'],
            connect: '2=a',
            wall: 0x87,
            mod: 'wall',
            exits: [topEdge({ left: 6, width: 4, manual: true })],
        });
        this.hallNS_wall_unreachable = this.metascreen({
            id: 0x8f,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallWE_wall = this.metascreen({
            id: 0x90,
            icon: icon `
      |   |
      |─┄─|
      |   |`,
            tile: '   |ccc|   ',
            tilesets: { cave: {}, iceCave: {} },
            feature: ['wall'],
            edges: ' c c',
            connect: '6=e',
            wall: 0x67,
            mod: 'wall',
        });
        this.hallWE_wall_unreachable = this.metascreen({
            id: 0x90,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallNS_arena = this.metascreen({
            id: 0x91,
            icon: icon `
      |┌┸┐|
      |│&│|
      |└┬┘|`,
            tile: [' n | a | c '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['arena'],
            edges: 'c c ',
            connect: '2a',
            poi: [[1, 0x60, 0x78]],
            exits: [topEdge(),
                bottomEdge({ left: 6, width: 4, manual: true }),
                seamlessUp(0xe6, 4), seamlessDown(0xf6, 4)],
            arena: 1,
        });
        this.hallNS_arena_unreachable = this.metascreen({
            id: 0x91,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.hallNS_arenaWall = this.metascreen({
            id: 0x92,
            icon: icon `
      |┌┄┐|
      |│&│|
      |└┬┘|`,
            placement: 'manual',
            tile: [' n | a | c '],
            tilesets: { cave: {}, iceCave: {} },
            feature: ['arena', 'wall'],
            edges: 'n c ',
            connect: '2x=apx',
            wall: 0x27,
            mod: 'wall',
            poi: [[1, 0x60, 0x78]],
            exits: [topEdge({ top: 1 }),
                bottomEdge({ left: 6, width: 4, manual: true })],
            arena: 1,
        });
        this.branchNWE_wall = this.metascreen({
            id: 0x94,
            icon: icon `
      | ┆ |
      |─┴─|
      |   |`,
            tile: ' c |ccc|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wall'],
            edges: 'cc c',
            connect: '2x=6e',
            exits: [topEdge({ left: 6, width: 4 })],
            mod: 'wall',
            wall: 0x37,
        });
        this.branchNWE_wall_unreachable = this.metascreen({
            id: 0x94,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.branchNWE_upStair = this.metascreen({
            id: 0x95,
            icon: icon `<
      | < |
      |─┴─|
      |   |`,
            tile: '   |c<c|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' c c',
            connect: '6e',
            exits: [upStair(0x47)],
        });
        this.branchNWE_upStair_unreachable = this.metascreen({
            id: 0x95,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.deadEndW_upStair = this.metascreen({
            id: 0x96,
            icon: icon `<
      | < |
      |─┘ |
      |   |`,
            tile: '   |c< |   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' c  ',
            connect: '6',
            exits: [upStair(0x42)],
        });
        this.deadEndW_upStair_unreachable = this.metascreen({
            id: 0x96,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x20),
            delete: true,
        });
        this.deadEndW_downStair = this.metascreen({
            id: 0x97,
            icon: icon `>
      |   |
      |─┐ |
      | > |`,
            tile: '   |c> |   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: ' c  ',
            connect: '6',
            exits: [downStair(0xa2)],
        });
        this.deadEndW_downStair_unreachable = this.metascreen({
            id: 0x97,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x20),
            delete: true,
        });
        this.deadEndE_upStair = this.metascreen({
            id: 0x98,
            icon: icon `<
      | < |
      | └─|
      |   |`,
            tile: '   | <c|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: '   c',
            connect: 'e',
            exits: [upStair(0x4c)],
        });
        this.deadEndE_upStair_unreachable = this.metascreen({
            id: 0x98,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0xd0),
            delete: true,
        });
        this.deadEndE_downStair = this.metascreen({
            id: 0x99,
            icon: icon `>
      |   |
      | ┌─|
      | > |`,
            tile: '   | >c|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: '   c',
            connect: 'e',
            exits: [downStair(0xac)],
        });
        this.deadEndE_downStair_unreachable = this.metascreen({
            id: 0x99,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0xd0),
            delete: true,
        });
        this.deadEndNS_stairs = this.metascreen({
            id: 0x9a,
            icon: icon `
      | > |
      |   |
      | < |`,
            placement: 'manual',
            tile: ' > |   | < ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: 'c c ',
            connect: '2x|ax',
            exits: [downStair(0x17), upStair(0xd7)],
            match: (reachable) => reachable(0x108, 0x78) && reachable(-0x30, 0x78),
        });
        this.deadEndNS_stairs_unreachable = this.metascreen({
            id: 0x9a,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x108, 0x78) && !reachable(-0x30, 0x78),
            delete: true,
        });
        this.deadEndN_stairs = this.metascreen({
            id: 0x9a,
            icon: icon `
      | > |
      |   |
      |   |`,
            tile: [' c | > |   ', ' > |   |   '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: 'c   ',
            connect: '2',
            exits: [downStair(0x17)],
            match: (reachable) => !reachable(0x108, 0x78) && reachable(-0x30, 0x78),
        });
        this.deadEndS_stairs = this.metascreen({
            id: 0x9a,
            icon: icon `
      |   |
      |   |
      | < |`,
            tile: ['   | < | c ', '   |   | < '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            edges: '  c ',
            connect: 'a',
            exits: [upStair(0xd7)],
            match: (reachable) => !reachable(-0x30, 0x78) && reachable(0x108, 0x78),
        });
        this.deadEndNS = this.metascreen({
            id: 0x9b,
            icon: icon `
      | ╵ |
      |   |
      | ╷ |`,
            placement: 'manual',
            tile: ' c |   | c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['deadend', 'empty'],
            edges: 'c c ',
            connect: '2p|ap',
            poi: [[0, -0x30, 0x78], [0, 0x110, 0x78]],
            match: (reachable) => reachable(-0x30, 0x78) && reachable(0x110, 0x78),
        });
        this.deadEndNS_unreachable = this.metascreen({
            id: 0x9b,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(-0x30, 0x78) && !reachable(0x110, 0x78),
            delete: true,
        });
        this.deadEndN = this.metascreen({
            id: 0x9b,
            icon: icon `
      | ╵ |
      |   |
      |   |`,
            tile: [' c | c |   ', ' c |   |   '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['deadend', 'empty'],
            edges: 'c   ',
            connect: '2',
            poi: [[0, -0x30, 0x78]],
            match: (reachable) => !reachable(0x110, 0x78) && reachable(-0x30, 0x78),
        });
        this.deadEndS = this.metascreen({
            id: 0x9b,
            icon: icon `
      |   |
      |   |
      | ╷ |`,
            tile: ['   | c | c ', '   |   | c '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['deadend', 'empty'],
            edges: '  c ',
            connect: 'a',
            poi: [[0, 0x110, 0x78]],
            match: (reachable) => !reachable(-0x30, 0x78) && reachable(0x110, 0x78),
        });
        this.deadEndWE = this.metascreen({
            id: 0x9c,
            icon: icon `
      |   |
      |╴ ╶|
      |   |`,
            placement: 'manual',
            tile: '   |c c|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['deadend', 'empty'],
            edges: ' c c',
            connect: '6p|ep',
            poi: [[0, 0x70, -0x28], [0, 0x70, 0x108]],
            match: (reachable) => reachable(0x70, -0x28) && reachable(0x70, 0x108),
        });
        this.deadEndWE_unreachable = this.metascreen({
            id: 0x9c,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x70, -0x28) && !reachable(0x70, 0x108),
            delete: true,
        });
        this.deadEndW = this.metascreen({
            id: 0x9c,
            icon: icon `
      |   |
      |╴  |
      |   |`,
            tile: ['   |cc |   ', '   |c  |   '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['deadend', 'empty'],
            edges: ' c  ',
            connect: '6',
            poi: [[0, 0x70, -0x28]],
            match: (reachable) => !reachable(0x70, 0x108) && reachable(0x70, -0x28),
        });
        this.deadEndE = this.metascreen({
            id: 0x9c,
            icon: icon `
      |   |
      |  ╶|
      |   |`,
            tile: ['   | cc|   ', '   |  c|   '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['deadend', 'empty'],
            edges: '   c',
            connect: 'e',
            poi: [[0, 0x70, 0x108]],
            match: (reachable) => !reachable(0x70, -0x28) && reachable(0x70, 0x108),
        });
        this.hallNS_entrance = this.metascreen({
            id: 0x9e,
            icon: icon `╽
      | │ |
      | │ |
      | ╽ |`,
            tile: ' c | c | n ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            edges: 'c n ',
            connect: '2a',
            exits: [bottomEdge()],
        });
        this.hallNS_entrance_unreachable = this.metascreen({
            id: 0x9e,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.channelExitSE = this.metascreen({
            id: 0x9f,
            icon: icon `
      |   |
      | ╔═|
      | ║ |`,
            tilesets: { dolphinCave: {} },
            feature: ['river'],
            edges: '  rr',
            exits: [bottomEdge({ left: 5 })],
        });
        this.channelBendWS = this.metascreen({
            id: 0xa0,
            icon: icon `
      |█  |
      |═╗ |
      |█║ |`,
            tilesets: { dolphinCave: {} },
            feature: ['river'],
            edges: ' rr ',
        });
        this.channelHallNS = this.metascreen({
            id: 0xa1,
            icon: icon `
      | ║ |
      | ╠┈|
      | ║ |`,
            tilesets: { dolphinCave: {} },
            feature: ['river', 'bridge'],
            wall: 0x8b,
            edges: 'r r ',
        });
        this.channelEntranceSE = this.metascreen({
            id: 0xa2,
            icon: icon `
      |   |
      | ╔┈|
      |╷║ |`,
            tilesets: { dolphinCave: {} },
            feature: ['river', 'bridge'],
            exits: [bottomEdge({ left: 2 })],
            wall: 0x7c,
            edges: '  rr',
        });
        this.channelCross = this.metascreen({
            id: 0xa3,
            icon: icon `
      | ║ |
      |═╬═|
      |╷║╷|`,
            tilesets: { dolphinCave: {} },
            feature: ['river'],
            exits: [bottomEdge({ left: 3 }), bottomEdge({ left: 0xb, type: 'door' })],
            edges: '  rr',
        });
        this.channelDoor = this.metascreen({
            id: 0xa4,
            icon: icon `∩
      | ∩█|
      |┈══|
      |  █|`,
            tilesets: { dolphinCave: {} },
            feature: ['river', 'bridge'],
            exits: [door(0x38)],
            wall: 0x73,
            edges: ' r  ',
        });
        this.mountainFloatingIsland = this.metascreen({
            id: 0xa5,
            icon: icon `*
      |═╗█|
      |*║ |
      |═╣█|`,
            placement: 'manual',
            tile: '   | ap|   ',
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
            tile: ' / | pp|  ',
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
            tile: ' p |ppp|  ',
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
            tile: [' r |ppp| r ', ' r |ppp|   '],
            tilesets: { mountainRiver: {} },
            feature: ['bridge'],
            edges: 'wpwp',
            connect: '6-e:2a',
            wall: 0x87,
        });
        this.mountainPathSE = this.metascreen({
            id: 0xa9,
            icon: icon `┌
      |███|
      |█  |
      |█ █|`,
            tile: '   | pp| p ',
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
            tile: '   |p< |   ',
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
            tile: ' p | pp|   ',
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
            tile: '   |ppp| p ',
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
            tile: '   |p< |   ',
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
            tile: '   | pp| ↓ ',
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
            tile: ' p |pp |   ',
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
            tile: '   | < |   ',
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
            tile: '   | <p|   ',
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
            tile: ' ↓ |ppp|   ',
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
            tile: '   |pp |   ',
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
            tile: '   |ppp|   ',
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
            tile: '   | < | / ',
            tilesets: { mountain: {}, mountainRiver: {} },
            feature: ['arena'],
            edges: '  l ',
            connect: 'a',
            exits: [{ ...upStair(0x47, 3), type: 'gate' }],
            flag: 'custom:false',
        });
        this.mountainPathN_slopeS_cave = this.metascreen({
            id: 0xb6,
            icon: icon `∩
      |█┋∩|
      |▌ ▐|
      |█↓█|`,
            tile: ' / | < | ↓ ',
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
            tile: ' ↓ |ppp| ↓ ',
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
            tile: ' ↓ |p<p|   ',
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
            tile: '   |pp | p ',
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
            tile: ' ↓ | ↓ | ↓ ',
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
            tile: [' r | r | r ', ' r | r |   '],
            tilesets: { mountainRiver: {} },
            edges: 'w w ',
            connect: '2:e',
        });
        this.mountainPathE_gate = this.metascreen({
            id: 0xbb,
            icon: icon `∩
      |█∩█|
      |█  |
      |███|`,
            tile: '   | <p|   ',
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
            tile: '   |p<p|   ',
            placement: 'manual',
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
            tile: ' ↓ |ppp| ↓ ',
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
            tile: [' r |ppp| r ', ' r |ppp|   '],
            tilesets: { mountainRiver: {} },
            edges: 'wpwp',
            connect: '6e|2|a',
        });
        this.mountainSlope_underBridge = this.metascreen({
            id: 0xbe,
            icon: icon `↓
      |█↓█|
      | ═ |
      |█↓█|`,
            tile: ' ↓ |p↓p| ↓ ',
            placement: 'manual',
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
            tile: '   |   |   ',
            tilesets: { mountain: {}, mountainRiver: {} },
            feature: ['empty'],
            edges: '    ',
            delete: true,
        });
        this.boundaryS = this.metascreen({
            id: 0xc0,
            icon: icon `
      |   |
      |▄▄▄|
      |███|`,
            tile: 'ooo|ooo|   ',
            tilesets: { grass: {}, river: {}, sea: {}, desert: {} },
            edges: 'o^ ^',
        });
        this.boundaryN_cave = this.metascreen({
            id: 0xc1,
            icon: icon `
      |███|
      |▀∩▀|
      |   |`,
            tile: '   |o<o|ooo',
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
            tile: 'oo |o< |   ',
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
            tile: 'ooo|↓↓↓|ooo',
            tilesets: { sea: {} },
            edges: 'oooo',
        });
        this.whirlpoolBlocker = this.metascreen({
            id: 0xc4,
            icon: icon `
      |   |
      |█╳█|
      |   |`,
            tile: 'ooo|↓#↓|ooo',
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
            placement: 'manual',
            tile: ' x | bo| oo',
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
            tile: 'ooo|ooo|ooo',
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
            tile: 'ooo|ooo|ooo',
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
            placement: 'manual',
            tile: 'oo |oLo|ooo',
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
            placement: 'manual',
            tile: '   |o<o|ooo',
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
            placement: 'manual',
            tile: 'oo |oC8|   ',
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
            placement: 'manual',
            tile: 'ooo|oAo|ooo',
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
            placement: 'manual',
            tile: 'ooo|oPo|ooo',
            tilesets: { desert: {} },
            feature: ['pyramid'],
            edges: 'oooo',
            exits: [cave(0xa7, 'fortress')],
        });
        this.cryptEntrance = this.metascreen({
            id: 0xcc,
            icon: icon `
      | ╳ |
      |▐>▌|
      |▝▀▘|`,
            placement: 'manual',
            tile: 'ooo|oYo|ooo',
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
            tile: 'ooo|ooo|oro',
            placement: 'manual',
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
            tile: 'ooo|o<o|ooo',
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
            placement: 'manual',
            tile: 'oro|o<o| oo',
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
            tile: '   |r< |   ',
            tilesets: { dolphinCave: {} },
            feature: ['river'],
            exits: [upStair(0x57)],
        });
        this.boatChannel = this.metascreen({
            id: 0xd1,
            icon: icon `
      |███|
      |▀▀▀|
      |▄▄▄|`,
            tile: ['   |888|   ', '   |88x|   '],
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
            tile: '   |rrr|   ',
            tilesets: { dolphinCave: {} },
            feature: ['river'],
        });
        this.riverCaveNWSE = this.metascreen({
            id: 0xd3,
            icon: icon `
      |┘║└|
      |═╬═|
      |┬┇┬|`,
            tile: ' r |rrr| r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river', 'bridge'],
            edges: 'rrrr',
            connect: '15p:3dp:79-bf',
            wall: 0xb6,
            poi: [[4, 0x00, 0x48], [4, 0x00, 0x98]],
        });
        this.riverCaveNS = this.metascreen({
            id: 0xd4,
            icon: icon `
      |│║│|
      |│║│|
      |│║│|`,
            tile: ' r | r | r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'r r ',
            connect: '19:3b',
            mod: 'bridge',
        });
        this.riverCaveWE = this.metascreen({
            id: 0xd5,
            icon: icon `
      |───|
      |═══|
      |───|`,
            tile: '   |rrr|   ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: ' r r',
            connect: '5d:7f',
            mod: 'bridge',
        });
        this.riverCaveNS_bridge = this.metascreen({
            id: 0xd6,
            icon: icon `
      |│║│|
      |├┇┤|
      |│║│|`,
            tile: ' r | r | r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river', 'bridge'],
            edges: 'r r ',
            connect: '19-3b',
            wall: 0x87,
        });
        this.riverCaveWE_bridge = this.metascreen({
            id: 0xd7,
            icon: icon `
      |─┬─|
      |═┅═|
      |─┴─|`,
            tile: '   |rrr|   ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river', 'bridge'],
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
            tile: '   | rr| r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: '  rr',
            connect: '9d:bf',
        });
        this.riverCaveWS = this.metascreen({
            id: 0xd9,
            icon: icon `
      |──┐|
      |═╗│|
      |┐║│|`,
            tile: '   |rr | r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: ' rr ',
            connect: '5b:79',
        });
        this.riverCaveNE = this.metascreen({
            id: 0xda,
            icon: icon `
      |│║└|
      |│╚═|
      |└──|`,
            tile: ' r | rr|   ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'r  r',
            connect: '1f:3d',
        });
        this.riverCaveNW = this.metascreen({
            id: 0xdb,
            icon: icon `
      |┘║│|
      |═╝│|
      |──┘|`,
            tile: ' r |rr |   ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'rr  ',
            connect: '15:37',
        });
        this.riverCaveWE_passageN = this.metascreen({
            id: 0xdc,
            icon: icon `╧
      |─┴─|
      |═══|
      |───|`,
            tile: ' c |rrr|   ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'cr r',
            connect: '25d:7f',
        });
        this.riverCaveWE_passageS = this.metascreen({
            id: 0xdd,
            icon: icon `╤
      |───|
      |═══|
      |─┬─|`,
            tile: '   |rrr| c ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: ' rcr',
            connect: '5d:7af',
        });
        this.riverCaveNS_passageW = this.metascreen({
            id: 0xde,
            icon: icon `╢
      |│║│|
      |┤║│|
      |│║│|`,
            tile: ' r |cr | r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'rcr ',
            connect: '169:3b',
        });
        this.riverCaveNS_passageE = this.metascreen({
            id: 0xdf,
            icon: icon `╟
      |│║│|
      |│║├|
      |│║│|`,
            tile: ' r | rc| r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'r rc',
            connect: '19:3be',
        });
        this.wideHallNE = this.metascreen({
            id: 0xe0,
            icon: icon `
      | ┃ |
      | ┗━|
      |   |`,
            tile: ' w | ww|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: 'w  w',
            connect: '2e',
        });
        this.goaWideHallNE = this.metascreen({
            id: 0xe0,
            icon: icon `
      |│┃└|
      |│┗━|
      |└──|`,
            tile: ' w | ww|   ',
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
            tile: ' w | ww|   ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x61] } },
            edges: 'w  w',
            connect: '1|f|2e|3d',
        });
        this.goaWideHallNE_blockedRight = this.metascreen({
            id: 0xe0,
            icon: icon `
      |│┃ |
      |│┗━|
      |└──|`,
            tile: ' w | ww|   ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x0d] } },
            edges: 'w  w',
            connect: '1f|2e|3|d',
        });
        this.wideHallNW = this.metascreen({
            id: 0xe1,
            icon: icon `
      | ┃ |
      |━┛ |
      |   |`,
            tile: ' w |ww |   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: 'ww  ',
            connect: '26',
        });
        this.goaWideHallNW = this.metascreen({
            id: 0xe1,
            icon: icon `
      |┘┃│|
      |━┛│|
      |──┘|`,
            tile: ' w |ww |   ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    removeWall: 0x6d } },
            edges: 'ww  ',
            connect: '15|26|37',
        });
        this.goaWideHallNW_blockedRight = this.metascreen({
            id: 0xe1,
            icon: icon `
      |┘┃│|
      |━┛ |
      |──┘|`,
            tile: ' w |ww |   ',
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
            tile: ' w |ww |   ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x01], removeWall: 0x6d } },
            edges: 'ww  ',
            connect: '1|5|26|37',
        });
        this.wideHallSE = this.metascreen({
            id: 0xe2,
            icon: icon `
      |   |
      | ┏━|
      | ┃ |`,
            tile: '   | ww| w ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: '  ww',
            connect: 'ae',
        });
        this.goaWideHallSE = this.metascreen({
            id: 0xe2,
            icon: icon `
      |┌──|
      |│┏━|
      |│┃┌|`,
            tile: '   | ww| w ',
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
            tile: '   | ww| w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x61] } },
            edges: '  ww',
            connect: '9|d|ae|bf',
        });
        this.goaWideHallSE_blockedRight = this.metascreen({
            id: 0xe2,
            icon: icon `
      |┌──|
      |│┏━|
      |│┃ |`,
            tile: '   | ww| w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0xdd] } },
            edges: '  ww',
            connect: '9d|ae|b|f',
        });
        this.wideHallWS = this.metascreen({
            id: 0xe3,
            icon: icon `
      |   |
      |━┓ |
      | ┃ |`,
            tile: '   |ww | w ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: ' ww ',
            connect: '6a',
        });
        this.goaWideHallWS = this.metascreen({
            id: 0xe3,
            icon: icon `
      |──┐|
      |━┓│|
      |┐┃│|`,
            tile: '   |ww | w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    removeWall: 0x9d } },
            edges: ' ww ',
            connect: '5b|6a|79',
        });
        this.goaWideHallWS_blockedRight = this.metascreen({
            id: 0xe3,
            icon: icon `
      |──┐|
      |━┓ |
      |┐┃│|`,
            tile: '   |ww | w ',
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
            tile: '   |ww | w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0xd1], removeWall: 0x9d } },
            edges: ' ww ',
            connect: '5b|6a|7|9',
        });
        this.goaWideHallNS_stairs = this.metascreen({
            id: 0xe4,
            icon: icon `
      |├┨│|
      |│┃│|
      |│┠┤|`,
            tile: ' w | H | w ',
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
            tile: ' w | H | w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x41, 0x8d] } },
            edges: 'w w ',
            connect: '12ab|3|9',
        });
        this.goaWideHallNS_stairsBlocked24 = this.metascreen({
            id: 0xe4,
            icon: icon `
      |┌┨│|
      |│┃│|
      |│┠┘|`,
            tile: ' w | H | w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x01, 0xcd] } },
            edges: 'w w ',
            connect: '1|239a|b',
        });
        this.wideHallNS_deadEnds = this.metascreen({
            id: 0xe5,
            icon: icon `
      | ╹ |
      |   |
      | ╻ |`,
            tile: ' w |   | w ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: 'w w ',
            connect: '2|a',
            match: (reachable) => reachable(0x110, 0x78) && reachable(-0x30, 0x78),
        });
        this.wideHall_deadEndN = this.metascreen({
            id: 0xe5,
            icon: icon `
      | ╹ |
      |   |
      |   |`,
            tile: [' w |   |   ', ' w | w |   '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: 'w   ',
            connect: '2',
            match: (reachable) => !reachable(0x110, 0x78) && reachable(-0x30, 0x78),
        });
        this.wideHall_deadEndS = this.metascreen({
            id: 0xe5,
            icon: icon `
      |   |
      |   |
      | ╻ |`,
            tile: ['   |   | w ', '   | w | w '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: '  w ',
            connect: 'a',
            match: (reachable) => reachable(0x110, 0x78) && !reachable(-0x30, 0x78),
        });
        this.goaWideHallNS_deadEnd = this.metascreen({
            id: 0xe5,
            icon: icon `
      |│╹│|
      |├─┤|
      |│╻│|`,
            tile: ' w | = | w ',
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
            tile: ' w | = | w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x61, 0xad] } },
            edges: 'w w ',
            connect: '1|2|39|a|b',
        });
        this.goaWideHallNS_deadEndBlocked13 = this.metascreen({
            id: 0xe5,
            icon: icon `
      |│╹╵|
      |└─┐|
      |╷╻│|`,
            tile: ' w | = | w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x6d, 0xa1] } },
            edges: 'w w ',
            connect: '1b|2|3|9|a',
        });
        this.wideHallNWSE = this.metascreen({
            id: 0xe6,
            icon: icon `
      | ┃ |
      |━╋━|
      | ┃ |`,
            tile: ' w |www| w ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: 'wwww',
            connect: '26ae',
        });
        this.goaWideHallNWSE = this.metascreen({
            id: 0xe6,
            icon: icon `
      |┘┃└|
      |━╋━|
      |┐┃┌|`,
            tile: ' w |www| w ',
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
            tile: ' w |www| w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x0d, 0xd1] } },
            edges: 'wwww',
            connect: '26ae|15|3|d|7|9|bf',
        });
        this.goaWideHallNWSE_blocked24 = this.metascreen({
            id: 0xe6,
            icon: icon `
      | ┃└|
      |━╋━|
      |┐┃ |`,
            tile: ' w |www| w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x01, 0xdd] } },
            edges: 'wwww',
            connect: '26ae|1|5|3d|79|b|f',
        });
        this.wideHallNWE = this.metascreen({
            id: 0xe7,
            icon: icon `
      | ┃ |
      |━┻━|
      |   |`,
            tile: ' w |www|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: 'ww w',
            connect: '26e',
        });
        this.goaWideHallNWE = this.metascreen({
            id: 0xe7,
            icon: icon `
      |┘┃└|
      |━┻━|
      |───|`,
            tile: ' w |www|   ',
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
            tile: ' w |www|   ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0x01, 0x0d] } },
            edges: 'ww w',
            connect: '26e|1|5|3|d|7f',
        });
        this.wideHallWSE = this.metascreen({
            id: 0xe8,
            icon: icon `
      |   |
      |━┳━|
      | ┃ |`,
            tile: '   |www| w ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: ' www',
            connect: '6ae',
        });
        this.goaWideHallWSE = this.metascreen({
            id: 0xe8,
            icon: icon `
      |───|
      |━┳━|
      |┐┃┌|`,
            tile: '   |www| w ',
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
            tile: '   |www| w ',
            tilesets: { labyrinth: { requires: [ScreenFix.LabyrinthParapets],
                    addWall: [0xd1, 0xdd] } },
            edges: ' www',
            connect: '6ae|5d|7|9|b|f',
        });
        this.wideHallNS_wallTop = this.metascreen({
            id: 0xe9,
            icon: icon `
      | ┆ |
      | ┃ |
      | ┃ |`,
            tile: ' n | w | w ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide', 'wall'],
            edges: 'c w',
            connect: '2a',
            exits: [topEdge({ left: 6, width: 4 })],
            wall: 0x37,
            statues: [0xa],
        });
        this.goaWideHallNS_wallTop = this.metascreen({
            id: 0xe9,
            icon: icon `
      | ┆ |
      |╷┃╷|
      |│┃│|`,
            tile: ' n | w | w ',
            tilesets: { labyrinth: {} },
            feature: ['wall'],
            edges: 'c w ',
            connect: '2ax|9|b',
            exits: [topEdge({ left: 6, width: 4 })],
            wall: 0x37,
            statues: [0xa],
        });
        this.wideHallWE = this.metascreen({
            id: 0xea,
            icon: icon `
      |   |
      |━━━|
      |   |`,
            tile: '   |www|   ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['wide'],
            edges: ' w w',
            connect: '6e',
        });
        this.goaWideHallWE = this.metascreen({
            id: 0xea,
            icon: icon `
      |───|
      |━━━|
      |───|`,
            tile: '   |www|   ',
            tilesets: { labyrinth: {} },
            edges: ' w w',
            connect: '5d|6e|7f',
        });
        this.pitWE = this.metascreen({
            id: 0xeb,
            tile: '   |cpc|   ',
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
            tile: ' c | p | c ',
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['pit'],
            edges: 'c c ',
            connect: '2a',
            platform: { type: 'vertical', coord: 16504 },
        });
        this.pitNS_unreachable = this.metascreen({
            id: 0xec,
            icon: icon `\n|   |\n|   |\n|   |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['empty'],
            placement: 'manual',
            match: (reachable) => !reachable(0x80, 0x80),
            delete: true,
        });
        this.spikesNS_hallS = this.metascreen({
            id: 0xed,
            icon: icon `
      | ░ |
      | ░ |
      | │ |`,
            tile: ' s | s | c ',
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
            tile: ' c | s | s ',
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
            tile: ' s |csc| s ',
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
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            tile: ' s |cs | s ',
            feature: ['spikes'],
            edges: 'scs ',
            connect: '26a',
            definition: (rom) => readScreen(`L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R`, ['L', rom.metascreens.spikesNS_hallWE], ['R', rom.metascreens.spikesNS]),
        });
        this.spikesNS_hallE = this.metascreen({
            id: ~0xe1,
            icon: icon `
      | ░ |
      | ░─|
      | ░ |`,
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            tile: ' s | sc| s ',
            feature: ['spikes'],
            edges: 's sc',
            connect: '2ae',
            definition: (rom) => readScreen(`L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R
         L L L L L L L L R R R R R R R R`, ['L', rom.metascreens.spikesNS], ['R', rom.metascreens.spikesNS_hallWE]),
        });
        this.riverCave_deadEndsNS = this.metascreen({
            id: 0xf0,
            icon: icon `
      | ╨ |
      |   |
      | ╥ |`,
            tile: ' r |   | r ',
            placement: 'manual',
            tilesets: { cave: {}, fortress: {} },
            feature: ['deadend', 'empty', 'river'],
            edges: 'r r ',
            connect: '1p:3p|9p:bp',
            poi: [[1, -0x30, 0x48], [1, -0x30, 0x98],
                [1, 0x110, 0x48], [1, 0x110, 0x98]],
        });
        this.riverCave_deadEndsN = this.metascreen({
            id: 0xf0,
            icon: icon `
      | ╨ |
      |   |
      |   |`,
            tile: [' r |   |   ', ' r | r |   '],
            tilesets: { cave: {}, fortress: {} },
            feature: ['deadend', 'empty', 'river'],
            edges: 'r   ',
            connect: '1p:3p',
            poi: [[1, -0x30, 0x48], [1, -0x30, 0x98]],
            match: (reachable) => !reachable(0x108, 0x48) && !reachable(0x108, 0x98),
            mod: 'bridge',
        });
        this.riverCave_deadEndsS = this.metascreen({
            id: 0xf0,
            icon: icon `
      |   |
      |   |
      | ╥ |`,
            tile: ['   |   | r ', '   | r | r '],
            tilesets: { cave: {}, fortress: {} },
            feature: ['deadend', 'empty', 'river'],
            edges: '  r ',
            connect: '9p:bp',
            poi: [[1, 0x110, 0x48], [1, 0x110, 0x98]],
            match: (reachable) => !reachable(-0x30, 0x48) && !reachable(-0x30, 0x98),
            mod: 'bridge',
        });
        this.riverCave_deadEndsWE = this.metascreen({
            id: 0xf1,
            icon: icon `
      |   |
      |╡ ╞|
      |   |`,
            tile: '   |r r|   ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['deadend', 'empty', 'river'],
            edges: ' r r',
            connect: '5p:7p|dp:fp',
            poi: [[1, 0x60, -0x28], [1, 0xa0, -0x28],
                [1, 0x60, 0x108], [1, 0xa0, 0x108]],
        });
        this.riverCave_deadEndsW = this.metascreen({
            id: 0xf1,
            icon: icon `
      |   |
      |╡  |
      |   |`,
            tile: ['   |r  |   ', '   |rr |   '],
            tilesets: { cave: {}, fortress: {} },
            feature: ['deadend', 'empty', 'river'],
            edges: ' r  ',
            connect: '5p:7p',
            poi: [[1, 0x60, -0x28], [1, 0xa0, -0x28]],
            match: (reachable) => !reachable(0x60, 0x108) && !reachable(0xa0, 0x108),
        });
        this.riverCave_deadEndsE = this.metascreen({
            id: 0xf1,
            icon: icon `
      |   |
      |  ╞|
      |   |`,
            tile: ['   |  r|   ', '   | rr|   '],
            tilesets: { cave: {}, fortress: {} },
            feature: ['deadend', 'empty', 'river'],
            edges: '   r',
            connect: 'dp:fp',
            poi: [[1, 0x60, 0x108], [1, 0xa0, 0x108]],
            match: (reachable) => !reachable(0x60, -0x28) && !reachable(0xa0, -0x28),
        });
        this.riverCaveN_bridge = this.metascreen({
            id: 0xf2,
            icon: icon `
      | ┇ |
      | ╨ |
      |   |`,
            tile: [' r | r |   ', ' r |   |   '],
            tilesets: { cave: {}, fortress: {} },
            feature: ['river', 'bridge'],
            edges: 'r   ',
            connect: '1-3',
            wall: 0x17,
            match: (reachable) => !reachable(0xd0, 0x48) && !reachable(0xd0, 0x98),
        });
        this.riverCaveS_bridge = this.metascreen({
            id: 0xf2,
            icon: icon `
      |   |
      | ╥ |
      | ┇ |`,
            tile: ['   | r | r ', '   |   | r '],
            tilesets: { cave: {}, fortress: {} },
            feature: ['river', 'bridge'],
            edges: '  r ',
            connect: '9-b',
            wall: 0xc6,
            match: (reachable) => !reachable(0x10, 0x48) && !reachable(0x10, 0x98),
        });
        this.riverCaveWSE = this.metascreen({
            id: 0xf3,
            icon: icon `
      |───|
      |═╦═|
      |┐║┌|`,
            tile: '   |rrr| r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: ' rrr',
            connect: '5d:79:bf',
        });
        this.riverCaveNWE = this.metascreen({
            id: 0xf4,
            icon: icon `
      |┘║└|
      |═╩═|
      |───|`,
            tile: ' r |rrr|   ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'rr r',
            connect: '15p:3dp:7f',
            poi: [[4, 0x00, 0x48], [4, 0x00, 0x98]],
        });
        this.riverCaveNWS = this.metascreen({
            id: ~0xf0,
            icon: icon `
      |┘║│|
      |═╣│|
      |┐║│|`,
            tile: ' r |rr | r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'rrr ',
            connect: '15p:3b:79',
            poi: [[4, 0x00, 0x48]],
            definition: (rom) => readScreen(`A A A A A A A A R R R R R R R R
         A A A A A A A A R R R R R R R R
         A A A A A A A A R R R R R R R R
         A A A A A A A A R R R R R R R R
         A A A A A A A A R R R R R R R R
         A A A A A A A A R R R R R R R R
         A A A A A A A A R R R R R R R R
         A A A A A A A A R R R R R R R R
         B B B B B B B B R R R R R R R R
         B B B B B B B B R R R R R R R R
         B B B B B B B B R R R R R R R R
         B B B B B B B B R R R R R R R R
         B B B B B B B B R R R R R R R R
         B B B B B B B B R R R R R R R R
         B B B B B B B B R R R R R R R R`, ['A', rom.metascreens.riverCaveNWE], ['B', rom.metascreens.riverCaveWSE], ['R', rom.metascreens.riverCaveNS]),
        });
        this.riverCaveNSE = this.metascreen({
            id: ~0xf1,
            icon: icon `
      |│║└|
      |│╠═|
      |│║┌|`,
            tile: ' r | rr| r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'r rr',
            connect: '19:3dp:bf',
            poi: [[4, 0x00, 0x98]],
            definition: (rom) => readScreen(`L L L L L L L L A A A A A A A A
         L L L L L L L L A A A A A A A A
         L L L L L L L L A A A A A A A A
         L L L L L L L L A A A A A A A A
         L L L L L L L L A A A A A A A A
         L L L L L L L L A A A A A A A A
         L L L L L L L L A A A A A A A A
         L L L L L L L L A A A A A A A A
         L L L L L L L L B B B B B B B B
         L L L L L L L L B B B B B B B B
         L L L L L L L L B B B B B B B B
         L L L L L L L L B B B B B B B B
         L L L L L L L L B B B B B B B B
         L L L L L L L L B B B B B B B B
         L L L L L L L L B B B B B B B B`, ['A', rom.metascreens.riverCaveNWE], ['B', rom.metascreens.riverCaveWSE], ['L', rom.metascreens.riverCaveNS]),
        });
        this.riverCaveNS_blockedRight = this.metascreen({
            id: 0xf5,
            icon: icon `
      |│║│|
      |│║ |
      |│║│|`,
            tile: ' r | r | r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'r r ',
            connect: '19:3p:bp',
            poi: [[0, 0x40, 0x98], [0, 0xc0, 0x98]],
            mod: 'block',
        });
        this.riverCaveNS_blockedLeft = this.metascreen({
            id: 0xf6,
            icon: icon `
      |│║│|
      | ║│|
      |│║│|`,
            tile: ' r | r | r ',
            tilesets: { cave: {}, fortress: {} },
            feature: ['river'],
            edges: 'r r ',
            connect: '1p:3b:9p',
            poi: [[0, 0x30, 0x48], [0, 0xb0, 0x48]],
            mod: 'block',
        });
        this.spikesNS = this.metascreen({
            id: 0xf7,
            icon: icon `
      | ░ |
      | ░ |
      | ░ |`,
            tile: ' s | s | s ',
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
            tile: '   | a | c ',
            tilesets: { pyramid: {} },
            feature: ['arena'],
            edges: '  c ',
            connect: 'a',
            exits: [{ ...upStair(0x57), type: 'crypt' }],
            flag: 'custom:false',
            arena: 2,
        });
        this.pyramidArena_draygon = this.metascreen({
            id: 0xf9,
            icon: icon `
      |┌─┐|
      |│╳│|
      |└┬┘|`,
            tile: '   | a | w ',
            tilesets: { pyramid: {} },
            feature: ['arena', 'pit'],
            edges: '  w ',
            connect: 'a',
            arena: 3,
        });
        this.cryptArena_draygon2 = this.metascreen({
            id: 0xfa,
            icon: icon `
      |┏┷┓|
      |┃&┃|
      |┗┳┛|`,
            tile: ' x | a | w ',
            tilesets: { pyramid: {} },
            feature: ['arena'],
            edges: 'c w ',
            connect: '2a',
            exits: [topEdge({ left: 6, width: 4 })],
            flag: 'custom:false',
            arena: 4,
        });
        this.cryptArena_entrance = this.metascreen({
            id: 0xfb,
            icon: icon `
      | ┃ |
      | ┃ |
      | ╿ |`,
            tile: ' w | w | x ',
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
            tile: [' c | a | w ', ' n | a | w '],
            tilesets: { fortress: {}, pyramid: {} },
            feature: ['arena'],
            edges: 'n w ',
            connect: '2a',
            exits: [topEdge()],
            arena: 5,
        });
        this.fortressTrap = this.metascreen({
            id: 0xfe,
            icon: icon `
      |└─┘|
      | ╳ |
      |╶┬╴|`,
            tile: '   | x | n ',
            tilesets: { fortress: {}, pyramid: {} },
            feature: ['pit'],
            edges: '  n ',
            connect: 'a',
            exits: [bottomEdge()],
        });
        this.shrine = this.metascreen({
            id: 0xff,
            tilesets: { shrine: {} },
            exits: [bottomEdge({ left: 6, width: 5 }), door(0x68)],
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
        this.screensById.get(screen.sid).push(screen);
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
        this.registeredFixes.add(fix);
    }
    isFixed(fix) {
        return this.registeredFixes.has(fix);
    }
    renumber(oldId, newId, tilesets) {
        if (oldId === newId)
            return;
        if (DEBUG)
            console.log(`renumber ${hex1(oldId)} -> ${hex1(newId)}`);
        const dest = this.screensById.get(newId);
        if (dest.length)
            throw new Error(`ID already used: ${hex1(newId)}: ${dest.join(', ')}`);
        let sourceDefinition;
        for (const screen of this.getById(oldId)) {
            if (tilesets && !screen.tilesets().some(t => tilesets.has(t)))
                continue;
            if (screen.data.definition) {
                sourceDefinition = screen.data.definition(this.rom);
                screen.data.definition = undefined;
            }
            screen.unsafeSetId(newId);
            dest.push(screen);
        }
        this.screensById.delete(oldId);
        const oldScreen = this.rom.screens.getScreen(oldId);
        if (oldId >= 0 && newId < 0) {
            dest[0].data.definition = constant(Uint8Array.from(oldScreen.tiles));
        }
        const clone = oldScreen.clone(newId);
        this.rom.screens.setScreen(newId, clone);
        oldScreen.used = false;
        if (oldId < 0) {
            this.rom.screens.deleteScreen(oldId);
            if (sourceDefinition && newId >= 0) {
                clone.tiles = Array.from(sourceDefinition);
            }
        }
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
function constant(x) { return () => x; }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YXNjcmVlbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21ldGFzY3JlZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQzVDLE9BQU8sRUFBQyxVQUFVLEVBQU0sTUFBTSxpQkFBaUIsQ0FBQztBQUNoRCxPQUFPLEVBQWlCLFVBQVUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQ2xFLElBQUksRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUMxQixTQUFTLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsR0FDcEUsTUFBTSxxQkFBcUIsQ0FBQztBQUVwQyxPQUFPLEVBQUMsU0FBUyxFQUFtQixNQUFNLGdCQUFnQixDQUFDO0FBRTNELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQztBQXNDcEIsTUFBTSxPQUFPLFdBQVc7SUFTdEIsWUFBcUIsR0FBUTtRQUFSLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFOcEIsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUVILGlCQUFZLEdBQUcsSUFBSSxVQUFVLENBQTBCLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLGdCQUFXLEdBQUcsSUFBSSxVQUFVLENBQXVCLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdELG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQXlHL0MsbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxF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LENBQUksSUFBYSxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbi8vaW1wb3J0IHtTY3JlZW59IGZyb20gJy4vc2NyZWVuLmpzJztcbmltcG9ydCB7TXV0YWJsZX0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcCwgaGV4MX0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge01ldGFzY3JlZW4sIFVpZH0gZnJvbSAnLi9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbkRhdGEsIGJvdHRvbUVkZ2UsIGJvdHRvbUVkZ2VIb3VzZSwgY2F2ZSwgZG9vciwgZG93blN0YWlyLFxuICAgICAgICBpY29uLCBsZWZ0RWRnZSwgcmVhZFNjcmVlbixcbiAgICAgICAgcmlnaHRFZGdlLCBzZWFtbGVzc0Rvd24sIHNlYW1sZXNzVXAsIHRvcEVkZ2UsIHVwU3RhaXIsIHdhdGVyZmFsbENhdmUsXG4gICAgICAgfSBmcm9tICcuL21ldGFzY3JlZW5kYXRhLmpzJztcbmltcG9ydCB7TWV0YXRpbGVzZXQsIE1ldGF0aWxlc2V0c30gZnJvbSAnLi9tZXRhdGlsZXNldC5qcyc7XG5pbXBvcnQge1NjcmVlbkZpeCAvKiwgd2l0aFJlcXVpcmUqL30gZnJvbSAnLi9zY3JlZW5maXguanMnO1xuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuXG4vLyAvLyBCQVNJQyBQTEFOOiBTY3JlZW4gaXMgdGhlIHBoeXNpY2FsIGFycmF5LCBNZXRhc2NyZWVuIGhhcyB0aGUgZXh0cmEgaW5mby5cbi8vIC8vICAgICAgICAgICAgIE9ubHkgTWV0YXNjcmVlbiBpcyB0aWVkIHRvIHNwZWNpZmljIChNZXRhKXRpbGVzZXRzLlxuXG4vLyAvKipcbi8vICAqIEFkZHMgYSBmbGFnLXRvZ2dsYWJsZSB3YWxsIGludG8gYSBsYWJ5cmludGggc2NyZWVuLlxuLy8gICogQHBhcmFtIGJpdCAgICAgVW5pcXVlIG51bWJlciBmb3IgZWFjaCBjaG9pY2UuIFVzZSAtMSBmb3IgdW5jb25kaXRpb25hbC5cbi8vICAqIEBwYXJhbSB2YXJpYW50IDAgb3IgMSBmb3IgZWFjaCBvcHRpb24uIFVzZSAwIHdpdGggYml0PS0xIGZvciB1bmNvbmRpdGlvbmFsLlxuLy8gICogQHBhcmFtIGZsYWcgICAgUG9zaXRpb24ocykgb2YgZmxhZyB3YWxsLlxuLy8gICogQHBhcmFtIHVuZmxhZyAgUG9zaXRpb24ocykgb2YgYW4gZXhpc3Rpbmcgd2FsbCB0byByZW1vdmUgY29tcGxldGVseS5cbi8vICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0byBnZW5lcmF0ZSB0aGUgdmFyaWFudC5cbi8vICAqL1xuLy8gZnVuY3Rpb24gbGFieXJpbnRoVmFyaWFudChwYXJlbnRGbjogKHM6IE1ldGFzY3JlZW5zKSA9PiBNZXRhc2NyZWVuLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBiaXQ6IG51bWJlciwgdmFyaWFudDogMHwxLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnOiBudW1iZXJ8bnVtYmVyW10sIHVuZmxhZz86IG51bWJlcnxudW1iZXJbXSkge1xuLy8gICByZXR1cm4gKHM6IE1ldGFzY3JlZW4sIHNlZWQ6IG51bWJlciwgcm9tOiBSb20pOiBib29sZWFuID0+IHtcbi8vICAgICAvLyBjaGVjayB2YXJpYW50XG4vLyAgICAgaWYgKCgoc2VlZCA+Pj4gYml0KSAmIDEpICE9PSB2YXJpYW50KSByZXR1cm4gZmFsc2U7XG4vLyAgICAgY29uc3QgcGFyZW50ID0gcGFyZW50Rm4ocm9tLm1ldGFzY3JlZW5zKTtcbi8vICAgICBmb3IgKGNvbnN0IHBvcyBvZiB0eXBlb2YgZmxhZyA9PT0gJ251bWJlcicgPyBbZmxhZ10gOiBmbGFnKSB7XG4vLyAgICAgICByb20uc2NyZWVuc1tzLmRhdGEuaWRdLnNldDJkKHBvcywgW1sweDE5LCAweDE5XSwgWzB4MWIsIDB4MWJdXSk7XG4vLyAgICAgfVxuLy8gICAgIGZvciAoY29uc3QgcG9zIG9mIHR5cGVvZiB1bmZsYWcgPT09ICdudW1iZXInID8gW3VuZmxhZ10gOiB1bmZsYWcgfHwgW10pIHtcbi8vICAgICAgIHJvbS5zY3JlZW5zW3MuZGF0YS5pZF0uc2V0MmQocG9zLCBbWzB4YzUsIDB4YzVdLCBbMHhkMCwgMHhjNV1dKTtcbi8vICAgICB9XG4vLyAgICAgaWYgKHMuZmxhZyAhPT0gJ2Fsd2F5cycpIHtcbi8vICAgICAgIC8vIHBhcmVudCBpcyBhIG5vcm1hbGx5LW9wZW4gc2NyZWVuIGFuZCB3ZSdyZSBjbG9zaW5nIGl0LlxuLy8gICAgICAgcGFyZW50LmZsYWcgPSAnYWx3YXlzJztcbi8vICAgICB9IGVsc2UgaWYgKHVuZmxhZyAhPSBudWxsKSB7XG4vLyAgICAgICAvLyBwYXJlbnQgaXMgdGhlIG90aGVyIGFsdGVybmF0aXZlIC0gZGVsZXRlIGl0LlxuLy8gICAgICAgcGFyZW50LnJlbW92ZSgpO1xuLy8gICAgIH1cbi8vICAgICByZXR1cm4gdHJ1ZTsgICAgXG4vLyAgIH07XG4vLyB9XG5cbi8vIGV4dGVuZHMgU2V0PE1ldGFzY3JlZW4+ID8/P1xuZXhwb3J0IGNsYXNzIE1ldGFzY3JlZW5zIHtcblxuICByZWFkb25seSBbaW5kZXg6IG51bWJlcl06IE1ldGFzY3JlZW47XG4gIHJlYWRvbmx5IGxlbmd0aCA9IDA7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzY3JlZW5zQnlGaXggPSBuZXcgRGVmYXVsdE1hcDxTY3JlZW5GaXgsIE1ldGFzY3JlZW5bXT4oKCkgPT4gW10pO1xuICBwcml2YXRlIHJlYWRvbmx5IHNjcmVlbnNCeUlkID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBNZXRhc2NyZWVuW10+KCgpID0+IFtdKTtcbiAgcHJpdmF0ZSByZWFkb25seSByZWdpc3RlcmVkRml4ZXMgPSBuZXcgU2V0PFNjcmVlbkZpeD4oKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHsgLy8gYWRkIG5hbWVzXG4gICAgICBjb25zdCB2YWwgPSB0aGlzW2tleV07XG4gICAgICBpZiAodmFsIGluc3RhbmNlb2YgTWV0YXNjcmVlbikgdmFsLm5hbWUgPSBrZXk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBtZXRhc2NyZWVuKGRhdGE6IE1ldGFzY3JlZW5EYXRhKTogTWV0YXNjcmVlbiB7XG4gICAgY29uc3QgbXV0ID0gdGhpcyBhcyBNdXRhYmxlPHRoaXM+O1xuICAgIGNvbnN0IHNjcmVlbiA9IG5ldyBNZXRhc2NyZWVuKHRoaXMucm9tLCBtdXQubGVuZ3RoIGFzIFVpZCwgZGF0YSk7XG4gICAgbXV0W211dC5sZW5ndGgrK10gPSBzY3JlZW47XG4gICAgdGhpcy5zY3JlZW5zQnlJZC5nZXQoc2NyZWVuLnNpZCkucHVzaChzY3JlZW4pO1xuICAgIGZvciAoY29uc3QgdGlsZXNldE5hbWUgaW4gZGF0YS50aWxlc2V0cykge1xuICAgICAgY29uc3Qga2V5ID0gdGlsZXNldE5hbWUgYXMga2V5b2YgTWV0YXRpbGVzZXRzO1xuICAgICAgY29uc3QgdGlsZXNldERhdGEgPSBkYXRhLnRpbGVzZXRzW2tleV0hO1xuICAgICAgaWYgKHRpbGVzZXREYXRhLnJlcXVpcmVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZml4IG9mIHRpbGVzZXREYXRhLnJlcXVpcmVzKSB7XG4gICAgICAgICAgdGhpcy5zY3JlZW5zQnlGaXguZ2V0KGZpeCkucHVzaChzY3JlZW4pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAodGhpcy5yb20ubWV0YXRpbGVzZXRzW2tleV0gYXMgTWV0YXRpbGVzZXQpLmFkZFNjcmVlbihzY3JlZW4pXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzY3JlZW47XG4gIH1cblxuICBnZXRCeUlkKGlkOiBudW1iZXIsIHRpbGVzZXQ/OiBudW1iZXIpOiBNZXRhc2NyZWVuW10ge1xuICAgIGxldCBvdXQgPSB0aGlzLnNjcmVlbnNCeUlkLmhhcyhpZCkgPyBbLi4udGhpcy5zY3JlZW5zQnlJZC5nZXQoaWQpXSA6IFtdO1xuICAgIGlmICh0aWxlc2V0ICE9IG51bGwpIHtcbiAgICAgIG91dCA9IG91dC5maWx0ZXIocyA9PiBzLmlzQ29tcGF0aWJsZVdpdGhUaWxlc2V0KHRpbGVzZXQpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHJlZ2lzdGVyRml4KGZpeDogU2NyZWVuRml4LCBzZWVkPzogbnVtYmVyKSB7XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5zY3JlZW5zQnlGaXguZ2V0KGZpeCkpIHtcbiAgICAgIC8vIExvb2sgZm9yIGFuIHVwZGF0ZSBzY3JpcHQgYW5kIHJ1biBpdCBmaXJzdC4gIElmIGl0IHJldHVybnMgZmFsc2UgdGhlblxuICAgICAgLy8gY2FuY2VsIHRoZSBvcGVyYXRpb24gb24gdGhpcyBzY3JlZW4uXG4gICAgICBjb25zdCB1cGRhdGUgPVxuICAgICAgICAgIChzY3JlZW4uZGF0YS51cGRhdGUgfHwgW10pLmZpbmQoKHVwZGF0ZSkgPT4gdXBkYXRlWzBdID09PSBmaXgpO1xuICAgICAgaWYgKHVwZGF0ZSkge1xuICAgICAgICBpZiAoc2VlZCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFNlZWQgcmVxdWlyZWQgZm9yIHVwZGF0ZWApO1xuICAgICAgICBpZiAoIXVwZGF0ZVsxXShzY3JlZW4sIHNlZWQsIHRoaXMucm9tKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBGb3IgZWFjaCB0aWxlc2V0LCByZW1vdmUgdGhlIHJlcXVpcmVtZW50LCBhbmQgaWYgaXQncyBlbXB0eSwgYWRkIHRoZVxuICAgICAgLy8gc2NyZWVuIHRvIHRoZSB0aWxlc2V0LlxuICAgICAgZm9yIChjb25zdCB0aWxlc2V0TmFtZSBpbiBzY3JlZW4uZGF0YS50aWxlc2V0cykge1xuICAgICAgICBjb25zdCBrZXkgPSB0aWxlc2V0TmFtZSBhcyBrZXlvZiBNZXRhdGlsZXNldHM7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBzY3JlZW4uZGF0YS50aWxlc2V0c1trZXldITtcbiAgICAgICAgaWYgKCFkYXRhLnJlcXVpcmVzKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaW5kZXggPSBkYXRhLnJlcXVpcmVzLmluZGV4T2YoZml4KTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCkgY29udGludWU7XG4gICAgICAgIGRhdGEucmVxdWlyZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgaWYgKCFkYXRhLnJlcXVpcmVzLmxlbmd0aCkge1xuICAgICAgICAgICh0aGlzLnJvbS5tZXRhdGlsZXNldHNba2V5XSBhcyBNZXRhdGlsZXNldCkuYWRkU2NyZWVuKHNjcmVlbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5yZWdpc3RlcmVkRml4ZXMuYWRkKGZpeCk7XG4gIH1cblxuICBpc0ZpeGVkKGZpeDogU2NyZWVuRml4KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0ZXJlZEZpeGVzLmhhcyhmaXgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZSB0aGUgc2NyZWVuIHdob3NlIGN1cnJlbnQgaWQgaXMgYG9sZElkYCB0byBoYXZlIGBuZXdJZGAgYXMgaXRzXG4gICAqIHNjcmVlbiBJRC4gIFVwZGF0ZXMgYWxsIHJlbGV2YW50IGxpbmtzLiAgYG5ld0lkYCBtdXN0IG5vdCBiZSB1c2VkIGJ5XG4gICAqIGFueSBleGlzdGluZyBtZXRhc2NyZWVucy5cbiAgICovXG4gIHJlbnVtYmVyKG9sZElkOiBudW1iZXIsIG5ld0lkOiBudW1iZXIsIHRpbGVzZXRzPzogU2V0PE1ldGF0aWxlc2V0Pikge1xuICAgIGlmIChvbGRJZCA9PT0gbmV3SWQpIHJldHVybjtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGByZW51bWJlciAke2hleDEob2xkSWQpfSAtPiAke2hleDEobmV3SWQpfWApO1xuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnNjcmVlbnNCeUlkLmdldChuZXdJZCk7XG4gICAgaWYgKGRlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYElEIGFscmVhZHkgdXNlZDogJHtoZXgxKG5ld0lkKX06ICR7ZGVzdC5qb2luKCcsICcpfWApO1xuICAgIGxldCBzb3VyY2VEZWZpbml0aW9uOiBVaW50OEFycmF5fHVuZGVmaW5lZDtcbiAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aGlzLmdldEJ5SWQob2xkSWQpKSB7XG4gICAgICBpZiAodGlsZXNldHMgJiYgIXNjcmVlbi50aWxlc2V0cygpLnNvbWUodCA9PiB0aWxlc2V0cy5oYXModCkpKSBjb250aW51ZTtcbiAgICAgIGlmIChzY3JlZW4uZGF0YS5kZWZpbml0aW9uKSB7XG4gICAgICAgIHNvdXJjZURlZmluaXRpb24gPSBzY3JlZW4uZGF0YS5kZWZpbml0aW9uKHRoaXMucm9tKTtcbiAgICAgICAgc2NyZWVuLmRhdGEuZGVmaW5pdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHNjcmVlbi51bnNhZmVTZXRJZChuZXdJZCk7XG4gICAgICBkZXN0LnB1c2goc2NyZWVuKTtcbiAgICB9XG4gICAgdGhpcy5zY3JlZW5zQnlJZC5kZWxldGUob2xkSWQpO1xuICAgIC8vIFRPRE8gLSBzaG91bGQgdGhpcyBiZSBlbmNhcHN1bGF0ZWQgaW4gU2NyZWVucz8gcHJvYmFibHkuLi5cbiAgICBjb25zdCBvbGRTY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zLmdldFNjcmVlbihvbGRJZCk7XG4gICAgaWYgKG9sZElkID49IDAgJiYgbmV3SWQgPCAwKSB7IC8vIGJhY2sgdXAgdGhlIG9sZCBzY3JlZW5cbiAgICAgIGRlc3RbMF0uZGF0YS5kZWZpbml0aW9uID0gY29uc3RhbnQoVWludDhBcnJheS5mcm9tKG9sZFNjcmVlbi50aWxlcykpO1xuICAgIH1cbiAgICBjb25zdCBjbG9uZSA9IG9sZFNjcmVlbi5jbG9uZShuZXdJZCk7XG4gICAgdGhpcy5yb20uc2NyZWVucy5zZXRTY3JlZW4obmV3SWQsIGNsb25lKTtcbiAgICBvbGRTY3JlZW4udXNlZCA9IGZhbHNlO1xuICAgIGlmIChvbGRJZCA8IDApIHtcbiAgICAgIHRoaXMucm9tLnNjcmVlbnMuZGVsZXRlU2NyZWVuKG9sZElkKTtcbiAgICAgIGlmIChzb3VyY2VEZWZpbml0aW9uICYmIG5ld0lkID49IDApIHtcbiAgICAgICAgY2xvbmUudGlsZXMgPSBBcnJheS5mcm9tKHNvdXJjZURlZmluaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJvbS5sb2NhdGlvbnMucmVudW1iZXJTY3JlZW4ob2xkSWQsIG5ld0lkKTtcbiAgfVxuXG4gIHJlYWRvbmx5IG92ZXJ3b3JsZEVtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHwgICB8ICAgJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICAvLyBib3VuZGFyeVdfdHJlZXM6ID8/P1xuICByZWFkb25seSBib3VuZGFyeVdfdHJlZXMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDAxLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paMIHxcbiAgICAgIHzilojiloxefFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlOiAnIG9vfCBvb3wgb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhVHJlZXNdfX0sXG4gICAgZWRnZXM6ICc+ID5vJywgLy8gbyA9IG9wZW5cbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4paMIHxgLFxuICAgIHRpbGU6ICcgb298IG9vfCBvbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc+ID5vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5RV9yb2NrcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwu4paQ4paIfFxuICAgICAgfCDilpDiloh8XG4gICAgICB8LuKWkOKWiHxgLFxuICAgIHRpbGU6ICdvbyB8b28gfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX0sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFSb2Nrc119fSxcbiAgICBlZGdlczogJzxvPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpDiloh8XG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZTogJ29vIHxvbyB8b28gJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzxvPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgbG9uZ0dyYXNzUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHx2diB8XG4gICAgICB8IHZ2fFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvbG98b29vfCAgICcsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge30sXG4gICAgICAgICAgICAgICBncmFzczoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzXX19LFxuICAgIGVkZ2VzOiAnbG9vbycsIC8vIGwgPSBsb25nIGdyYXNzXG4gIH0pO1xuICByZWFkb25seSBsb25nR3Jhc3NOID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgdnZ8XG4gICAgICB8dnYgfGAsXG4gICAgdGlsZTogJyAgIHxvb298b2xvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGdyYXNzOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NdfX0sXG4gICAgZWRnZXM6ICdvb2xvJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5U19yb2NrcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgLiB8XG4gICAgICB84paE4paE4paEfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICdvb298b29vfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX0sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFSb2Nrc119fSxcbiAgICBlZGdlczogJ29eIF4nLFxuICB9KTtcbiAgcmVhZG9ubHkgZm9ydHJlc3NUb3duRW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oeyAvLyBnb2FcbiAgICBpZDogMHgwOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojiiKniloh8XG4gICAgICB8ICAgfGAsXG4gICAgLy8gVE9ETyAtIGVudHJhbmNlIVxuICAgIC8vIFRPRE8gLSByaWdodCBlZGdlIHdhbnRzIHRvcC1oYWxmIG1vdW50YWluOyBsZWZ0IGVkZ2UgdG9wIGNhbiBoYXZlXG4gICAgLy8gICAgICAgIGFueSB0b3AgaGFsZiAoYm90dG9tIGhhbGYgcGxhaW4pLCB0b3AgZWRnZSBjYW4gaGF2ZSBhbnlcbiAgICAvLyAgICAgICAgbGVmdC1oYWxmIChyaWdodC1oYWxmIG1vdW50YWluKVxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogWycgICB8b0ZvfG9vbycsICdvbyB8b0ZvfG9vbyddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICBlZGdlczogJyB2b3YnLFxuICAgIGV4aXRzOiBbey4uLnVwU3RhaXIoMHhhNiwgMyksIHR5cGU6ICdmb3J0cmVzcyd9XSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmRTRV9sb25nR3Jhc3MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDA5LFxuICAgIGljb246IGljb25g4paXXG4gICAgICB8IHYgfFxuICAgICAgfHZ24paEfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlOiAnb29vfG9vb3xvbyAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnb288XicsXG4gIH0pO1xuICByZWFkb25seSBleGl0V19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHsgLy8gbmVhciBzYWhhcmEsIGZvZyBsYW1wXG4gICAgaWQ6IDB4MGEsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB8ICDiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogWycgICB8bzwgfCAgICcsICcgICB8eDwgfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge30sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFDYXZlRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICcgbiAgJywgLy8gbiA9IG5hcnJvd1xuICAgIGV4aXRzOiBbY2F2ZSgweDQ4KSwgbGVmdEVkZ2Uoe3RvcDogNn0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmRORV9ncmFzc1JvY2tzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwYixcbiAgICBpY29uOiBpY29uYOKWnVxuICAgICAgfC7ilpDiloh8XG4gICAgICB8ICDiloB8XG4gICAgICB8Ozs7fGAsXG4gICAgdGlsZTogJ29vIHxvb298b2dvJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSxcbiAgICAgICAgICAgICAgIHJpdmVyOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguUml2ZXJTaG9ydEdyYXNzXX0sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRTaG9ydEdyYXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguRGVzZXJ0Um9ja3NdfX0sXG4gICAgZWRnZXM6ICc8b3N2JywgLy8gcyA9IHNob3J0IGdyYXNzXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGMsXG4gICAgaWNvbjogaWNvbmDilptcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paIIOKWgHxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZTogJyAgIHwgb298IG9vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJyAgPnYnLFxuICB9KTtcbiAgLy8gTk9URTogdGhpcyB2ZXJzaW9uIGhhcyBzbGlnaHRseSBuaWNlciBtb3VudGFpbnMgaW4gc29tZSBjYXNlcy5cbiAgcmVhZG9ubHkgb3ZlcndvcmxkRW1wdHlfYWx0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwYyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5JywgJ21hbnVhbCddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgbWF0Y2g6ICgpID0+IGZhbHNlLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lck5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwZCxcbiAgICBpY29uOiBpY29uYOKWnFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloDilojiloh8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGU6ICcgICB8b28gfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICcgdjwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lclNXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwZSxcbiAgICBpY29uOiBpY29uYOKWmVxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4paI4paEfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgb298IG9vfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc+ICBeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lclNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwZixcbiAgICBpY29uOiBpY29uYOKWn1xuICAgICAgfCDilpDiloh8XG4gICAgICB84paE4paI4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICdvbyB8b28gfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc8XiAgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXRFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMCxcbiAgICBpY29uOiBpY29uYOKVtlxuICAgICAgfCDilpDiloh8XG4gICAgICB8ICAgfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlOiBbJ29vIHxvb298b28gJywgJ29vIHxvb3h8b28gJ10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX19LFxuICAgIGVkZ2VzOiAnPG88bicsXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogNn0pXSxcbiAgICAvLyBUT0RPIC0gZWRnZVxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlOX3RyZWVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloDiloDiloB8XG4gICAgICB8IF4gfGAsXG4gICAgdGlsZTogJyAgIHxvb298b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhVHJlZXNdfX0sXG4gICAgZWRnZXM6ICcgdm92JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyaWRnZVRvUG9ydG9hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMixcbiAgICBpY29uOiBpY29uYOKVtFxuICAgICAgfOKVkCAgfFxuICAgICAgfOKVnuKVkOKVkHxcbiAgICAgIHzilIIgIHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJ3Jvb3wxcnJ8IG9vJywgLy8gVE9ETzogY2hlY2sgdGhpcyFcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgLy8gVE9ETyAtIHRoaXMgaXMgc3VwZXIgY3VzdG9tLCBubyBlZGdlcyBmb3IgaXQ/XG4gICAgLy8gSXQgbmVlZHMgc3BlY2lhbCBoYW5kbGluZywgYXQgbGVhc3QuXG4gICAgZmVhdHVyZTogWydwb3J0b2EzJ10sXG4gICAgZWRnZXM6ICcyKj5yJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDF9KV0sXG4gIH0pO1xuICByZWFkb25seSBzbG9wZUFib3ZlUG9ydG9hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHzilojihpPiloB8XG4gICAgICB84pSCICB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcg4oaTIHwgb298cm9vJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydwb3J0b2EyJ10sXG4gICAgZWRnZXM6ICcxKjJ2JyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQmVuZFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfHcgIHxcbiAgICAgIHwg4pWU4pWQfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZTogJ29vb3xvcnJ8b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdvb3JyJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5V19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4oipIHxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZTogJyBvb3wgPG98IG9vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnPiA+bycsXG4gICAgZXhpdHM6IFtjYXZlKDB4ODkpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNixcbiAgICBpY29uOiBpY29uYOKVtVxuICAgICAgfOKWiCDiloh8XG4gICAgICB84paAIOKWgHxcbiAgICAgIHwgXiB8YCxcbiAgICB0aWxlOiBbJyBvIHxvb298b29vJywgJyB4IHxvb298b29vJ10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgZGVzZXJ0OiB7fX0sIC8vIHNlYSBoYXMgbm8gbmVlZCBmb3IgZXhpdHM/XG4gICAgZWRnZXM6ICdudm92JyxcbiAgICBleGl0czogW3RvcEVkZ2UoKV0sXG4gICAgLy8gVE9ETyAtIGVkZ2VcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyV0Vfd29vZGVuQnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNyxcbiAgICBpY29uOiBpY29uYOKVkFxuICAgICAgfCAgIHxcbiAgICAgIHzilZDilZHilZB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3xyb3J8b29vJywgLy8gVE9ETyAtIHNob3VsZCB0aGUgbWlkZGxlIGJlICdiJz9cbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdvcm9yJyxcbiAgICBleGl0czogW3NlYW1sZXNzVXAoMHg3NyksIHNlYW1sZXNzRG93bigweDg3KV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckJvdW5kYXJ5RV93YXRlcmZhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDE4LFxuICAgIGljb246IGljb25g4pWhXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHzilZDilZAvfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlOiAnb28gfHJyIHxvbyAnLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJzxyPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlFX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDE5LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHx24oip4paIfFxuICAgICAgfHbilpDiloh8YCxcbiAgICB0aWxlOiAnb28gfG88IHxvbyAnLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZ3Jhc3M6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5HcmFzc0xvbmdHcmFzc119LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0TG9uZ0dyYXNzXX19LFxuICAgIGVkZ2VzOiAnPG88ICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXRXX3NvdXRod2VzdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWEsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWgCDiloR8XG4gICAgICB84paE4paI4paIfGAsXG4gICAgdGlsZTogJyBvb3xCb298ICAgJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3NdfSxcbiAgICAgICAgICAgICAgIC8vIFNlYSBoYXMgbm8gbmVlZCBmb3IgdGhpcyBzY3JlZW4/ICBHbyB0byBzb21lIG90aGVyIGJlYWNoP1xuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3NdfX0sXG4gICAgLy8gTk9URTogdGhlIGVkZ2UgaXMgbm90ICduJyBiZWNhdXNlIGl0J3Mgb2ZmLWNlbnRlci5cbiAgICBlZGdlczogJz4qIF4nLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogMHhifSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbmFkYXJlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxYixcbiAgICAvL2ljb246ICc/JyxcbiAgICAvL21pZ3JhdGVkOiAweDIwMDAsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGRvb3IoMHgyMyksXG4gICAgICAgICAgICBkb29yKDB4MjUsICdkb29yMicpLCBkb29yKDB4MmEsICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd25FeGl0VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWMsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWgCBefFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlOiAnIG9vfDhvb3wgb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge319LFxuICAgIGVkZ2VzOiAnPm4+bycsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA4LCBoZWlnaHQ6IDMsIHNoaWZ0OiAtMC41fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hvcnRHcmFzc1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDFkLFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHw7Ozt8XG4gICAgICB8IHYgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvZ298b29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlJpdmVyU2hvcnRHcmFzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NSZW1hcHBpbmddfX0sXG4gICAgZWRnZXM6ICdzb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd25FeGl0UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWUsXG4gICAgaWNvbjogaWNvbmDilbdcbiAgICAgIHwgXiB8XG4gICAgICB84paEIOKWhHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogWydvb298b29vfCBvICcsICdvb298b29vfCB4ICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2NrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkRlc2VydFRvd25FbnRyYW5jZV19fSxcbiAgICBlZGdlczogJ29ebl4nLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW5HYXRlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxZixcbiAgICAvL2ljb246ICc/JyxcbiAgICB0aWxlc2V0czoge3Rvd246IHt9fSxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDN9KSwgcmlnaHRFZGdlKHt0b3A6IDl9KV0sXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gIH0pOyBcblxuICByZWFkb25seSByaXZlckJyYW5jaE5TRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHwg4pWg4pWQfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZTogJ29yb3xvcnJ8b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdyb3JyJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDIxLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb29vfHJycnxvb28nLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ29yb3InLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCb3VuZGFyeVNfd2F0ZXJmYWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyMixcbiAgICBpY29uOiBpY29uYOKVqFxuICAgICAgfCDilZEgfFxuICAgICAgfOKWhOKVkeKWhHxcbiAgICAgIHzilogv4paIfGAsXG4gICAgdGlsZTogJ29yb3xvcm98ICAgJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdyXiBeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHw7Ozt8XG4gICAgICB8OyAgfFxuICAgICAgfDsgXnxgLFxuICAgIHRpbGU6ICdvZ298Z29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIGVkZ2VzOiAnc3NvbycsXG4gIH0pO1xuICByZWFkb25seSBzaG9ydEdyYXNzTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDI0LFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHw7ICB8XG4gICAgICB8O3YgfFxuICAgICAgfDs7O3xgLFxuICAgIHRpbGU6ICdvb298Z29vfG9nbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIGVkZ2VzOiAnb3NzbycsXG4gIH0pO1xuICByZWFkb25seSBzdG9tSG91c2VPdXRzaWRlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloziiKnilpB8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogWycgICB8IEggfCBvICcsICcgICB8IEggfCB4ICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICAvLyBOT1RFOiBib3R0b20gZWRnZSBlbnRyYW5jZSBpcyBjbGV2ZXJseSBzaGlmdGVkIHRvIGFsaWduIHdpdGggdGhlIGRvb3IuXG4gICAgZXhpdHM6IFtkb29yKDB4NjgpLCBib3R0b21FZGdlKHtzaGlmdDogMC41fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZE5XX3RyZWVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNixcbiAgICBpY29uOiBpY29uYOKWmFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paAIF58XG4gICAgICB8IF5efGAsXG4gICAgdGlsZTogJyBvb3xvb298b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRUcmVlc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5TZWFUcmVlc119fSxcbiAgICBlZGdlczogJz52b28nLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hvcnRHcmFzc1NXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfDs7O3xcbiAgICAgIHwgIDt8XG4gICAgICB8XiA7fGAsXG4gICAgdGlsZTogJ29nb3xvb2d8b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSxcbiAgICAgICAgICAgICAgIHJpdmVyOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguUml2ZXJTaG9ydEdyYXNzXX19LFxuICAgIGVkZ2VzOiAnc29vcycsXG4gIH0pO1xuICByZWFkb25seSByaXZlckJyYW5jaE5XUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHzilZDilaMgfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZTogJ29yb3xycm98b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdycnJvJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgIDt8XG4gICAgICB8IHY7fFxuICAgICAgfDs7O3xgLFxuICAgIHRpbGU6ICdvb298b29nfG9nbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlJpdmVyU2hvcnRHcmFzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NSZW1hcHBpbmddfX0sXG4gICAgZWRnZXM6ICdvb3NzJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHZhbGxleUJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmEsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfOKWm+KVkeKWnHxcbiAgICAgIHwg4pWRIHxcbiAgICAgIHzilpnilZHilp98YCxcbiAgICB0aWxlOiBbJyBvIHwgbyB8IG8gJywgJyB4IHwgbyB8IG8gJywgJyBvIHwgbyB8IHggJ10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICduIG4gJyxcbiAgICBleGl0czogW3NlYW1sZXNzVXAoMHg3NyksIHNlYW1sZXNzRG93bigweDg3KSwgdG9wRWRnZSgpLCBib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFNfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmIsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paMIOKWkHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogWycgICB8IDwgfCBvICcsICcgICB8IDwgfCB4ICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge30sXG4gICAgICAgICAgICAgICAvLyBOb3QgcGFydGljdWxhcmx5IHVzZWZ1bCBzaW5jZSBubyBjb25uZWN0b3Igb24gc291dGggZW5kP1xuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnICBuICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NjcpLCBib3R0b21FZGdlKCldXG4gIH0pO1xuICByZWFkb25seSBvdXRzaWRlV2luZG1pbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDJjLFxuICAgIGljb246IGljb25g4pWzXG4gICAgICB84paI4paI4pWzfFxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiBbJyAgIHwgVyB8IG8gJywgJyAgIHwgVyB8IHggJ10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSAzIGV4aXRzLCBzcGF3biBmb3Igd2luZG1pbGwgYmxhZGVcbiAgICBmbGFnOiAnY3VzdG9tOmZhbHNlJyxcbiAgICBmZWF0dXJlOiBbJ3dpbmRtaWxsJ10sXG4gICAgZWRnZXM6ICcgIG4gJyxcbiAgICBleGl0czogW2NhdmUoMHg2MyksIGJvdHRvbUVkZ2UoKSwgZG9vcigweDg5LCAnd2luZG1pbGwnKSwgZG9vcigweDhjKV0sXG4gIH0pO1xuICByZWFkb25seSB0b3duRXhpdFdfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7IC8vIG91dHNpZGUgbGVhZlxuICAgIC8vIChUT0RPIC0gY29uc2lkZXIganVzdCBkZWxldGluZywgcmVwbGFjZSB3aXRoICQwYSkuXG4gICAgaWQ6IDB4MmQsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paE4paE4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8eDwgfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LCAvLyBjYXZlIGVudHJhbmNlIGJyZWFrcyByaXZlciBhbmQgb3RoZXJzLi4uXG4gICAgZWRnZXM6ICcgbiAgJyxcbiAgICAvLyBOT1RFOiBzcGVjaWFsIGNhc2UgdGhlIG9kZCBlbnRyYW5jZS9leGl0IGhlcmUgKHNob3VsZCBiZSA0YSlcbiAgICBleGl0czogW2NhdmUoMHg0YSksIGxlZnRFZGdlKHt0b3A6IDUsIGhlaWdodDogMywgc2hpZnQ6IC0wLjV9KV0sXG4gICAgZmxhZzogJ2N1c3RvbTp0cnVlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDJlLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB8IOKVkSB8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlOiAnb3JvfG9vb3xvcm8nLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3Jvcm8nLFxuICAgIG1vZDogJ2JyaWRnZScsXG4gIH0pO1xuICByZWFkb25seSByaXZlck5TX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHx34pWPd3xcbiAgICAgIHwg4pWRIHxgLFxuICAgIHBsYWNlbWVudDogJ21vZCcsXG4gICAgdGlsZTogJ29yb3xvcm98b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydicmlkZ2UnXSxcbiAgICBlZGdlczogJ3Jvcm8nLFxuICAgIHdhbGw6IDB4NzcsXG4gICAgLy9tb2Q6ICdicmlkZ2UnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCZW5kV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDMwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IHfilpx8XG4gICAgICB84pWQ4pWXd3xcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGU6ICdvbyB8cnJvfG9ybycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAnPHJydicsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeU5fd2F0ZXJmYWxsQ2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilpsv4paIfFxuICAgICAgfOKWmOKVkeKWgHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGU6ICcgICB8b3JvfG9ybycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIC8vIFRPRE8gLSBmbGFnIHZlcnNpb24gd2l0aG91dCBlbnRyYW5jZT9cbiAgICAvLyAgLSB3aWxsIG5lZWQgYSB0aWxlc2V0IGZpeFxuICAgIGVkZ2VzOiAnIHZydicsXG4gICAgZXhpdHM6IFt3YXRlcmZhbGxDYXZlKDB4NzUpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9wZW5fdHJlZXMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDMyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IF4gfFxuICAgICAgfF4gXnxcbiAgICAgIHwgXiB8YCxcbiAgICB0aWxlOiAnb29vfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRUcmVlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkRlc2VydFJvY2tzXX19LFxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBleGl0UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzMsXG4gICAgaWNvbjogaWNvbmDilbdcbiAgICAgIHwgdyB8XG4gICAgICB84paEIOKWhHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogWydvb298b29vfCBvICcsICdvb298b29vfCB4IHwnXSxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgLy8gTk9URTogVGhlc2UgZml4ZXMgYXJlIG5vdCBsaWtlbHkgdG8gZXZlciBsYW5kLlxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0TWFyc2hdfSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYU1hcnNoXX19LFxuICAgIGVkZ2VzOiAnb15uXicsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzNCxcbiAgICBpY29uOiBpY29uYOKWmFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paA4paAIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIG9vfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPnZvbycsXG4gIH0pO1xuICByZWFkb25seSBiZW5kTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDM1LFxuICAgIGljb246IGljb25g4padXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwgIOKWgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb28gfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPG9vdicsXG4gIH0pO1xuICByZWFkb25seSBiZW5kU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDM2LFxuICAgIGljb246IGljb25g4paXXG4gICAgICB8ICAgfFxuICAgICAgfCDiloTiloR8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGU6ICdvb298b29vfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICdvbzxeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmRXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzcsXG4gICAgaWNvbjogaWNvbmDilpZcbiAgICAgIHwgICB8XG4gICAgICB84paE4paEIHxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZTogJ29vb3xvb298IG9vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJ29ePm8nLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJQbGFpbl91cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzOCxcbiAgICBpY29uOiBpY29uYOKUtFxuICAgICAgfCDilIogfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIHQgfHR0dHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJ3N0IHQnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogOH0pLCBzZWFtbGVzc0Rvd24oMHgwOCwgMildLFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSBwb3NzaWJsZSBzdGFpcndheSB3LyBmbGFnP1xuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJSb2JvdERvb3JfZG93blN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzOSxcbiAgICBpY29uOiBpY29uYOKUrFxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSKIHxgLFxuICAgIHRpbGU6ICcgICB8dHR0fCB0ICcsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnIHRzdCcsXG4gICAgZXhpdHM6IFtzZWFtbGVzc1VwKDB4ZTgsIDIpLCBzZWFtbGVzc0Rvd24oMHhmOCwgMildLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJEeW5hRG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4M2EsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilJTilKzilJh8XG4gICAgICB8IOKUiiB8YCxcbiAgICB0aWxlOiAnICAgfCA8IHwgdCAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgcyAnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDY3LCAnZG9vcicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyTG9uZ1N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4M2IsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSKIHxcbiAgICAgIHwg4pSKIHxcbiAgICAgIHwg4pSKIHxgLFxuICAgIHRpbGU6ICcgdCB8IHQgfCB0ICcsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAncyBzICcsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICAgIC8vIFRPRE8gLSBjb25uZWN0aW9uc1xuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJNZXNpYVJvb20gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNjLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyVGVsZXBvcnRlciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4M2QsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGNhdmUoMHg1NywgJ3RlbGVwb3J0ZXInKV0sXG4gIH0pO1xuICByZWFkb25seSBjYXZlQWJvdmVQb3J0b2EgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNlLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgICB8IDwgfCDihpMgJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgIDEgJyxcbiAgICBmZWF0dXJlOiBbJ3BvcnRvYTEnXSxcbiAgICBleGl0czogW2NhdmUoMHg2NildLFxuICB9KTtcbiAgcmVhZG9ubHkgY29ybmVyTkVfZmxvd2VycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4M2YsXG4gICAgaWNvbjogaWNvbmDilpxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paAKuKWiHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZTogJyAgIHxvbyB8b28gJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgLy8gTk9URTogY291bGQgZXh0ZW5kIHRoaXMgdG8gZGVzZXJ0L2V0YyBieSBzd2FwcGluZyB0aGUgN2UvN2YgdGlsZXNcbiAgICAvLyB3aXRoIGUuZy4gYSB3aW5kbWlsbCBvciBjYXN0bGUgdGlsZSB0aGF0J3Mgbm90IHVzZWQgaW4gOWMsIGJ1dFxuICAgIC8vIHdlIHN0aWxsIGRvbid0IGhhdmUgYSBnb29kIHNwcml0ZSB0byB1c2UgZm9yIGl0Li4uXG4gICAgZWRnZXM6ICcgdjwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyRWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDAsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfCAgIHxcbiAgICAgIHzilKQg4pScfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8dCB0fCAgICcsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnIHQgdCcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlckVkZ2VXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0MCxcbiAgICBpY29uOiBpY29uYCB8XG4gICAgICB8ICAgfFxuICAgICAgfOKUpCAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8dCAgfCAgICcsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnIHQgICcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlckVkZ2VFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0MCxcbiAgICBpY29uOiBpY29uYCB8XG4gICAgICB8ICAgfFxuICAgICAgfCAg4pScfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8ICB0fCAgICcsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnICAgdCcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlclJvYm90RG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDEsXG4gICAgaWNvbjogaWNvbmDilIBcbiAgICAgIHwgTyB8XG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8dHR0fCAgICcsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnIHQgdCcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlckRvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQyLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8dDx0fCAgICcsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnIHQgdCcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTgpXSxcbiAgICAvLyBUT0RPIC0gY29ubmVjdGlvbnNcbiAgfSk7XG4gIHJlYWRvbmx5IGhvdXNlX2JlZHJvb20gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQzLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNoZWQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQ0LFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBjYXZlKDB4NDkpXSxcbiAgICBmbGFnOiAnY3VzdG9tOmZhbHNlJyxcbiAgfSk7XG4gIC8vIFRPRE8gLSBzZXBhcmF0ZSBtZXRhc2NyZWVuIGZvciBzaGVkV2l0aEhpZGRlbkRvb3JcbiAgcmVhZG9ubHkgdGF2ZXJuID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0NSxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBob3VzZV90d29CZWRzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0NixcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSB0aHJvbmVSb29tX2FtYXpvbmVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0NyxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgLy8gVE9ETyAtIG5lZWQgdG8gZml4IHRoZSBzaW5nbGUtd2lkdGggc3RhaXIhXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2Uoe3dpZHRoOiAzfSksIGRvd25TdGFpcigweDRjLCAxKV0sXG4gIH0pO1xuICByZWFkb25seSBob3VzZV9ydWluZWRVcHN0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDgsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGRvd25TdGFpcigweDljLCAxKV0sXG4gIH0pO1xuICByZWFkb25seSBob3VzZV9ydWluZWREb3duc3RhaXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0OSxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NTYsIDEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGZveWVyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0YSxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2Uoe3NoaWZ0OiAwLjV9KSxcbiAgICAgICAgICAgIGRvb3IoMHgyOCksIGRvb3IoMHg1MywgJ2Rvb3IyJyksIGRvb3IoMHg1YywgJ2Rvb3IzJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgdGhyb25lUm9vbV9wb3J0b2EgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDRiLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBkb29yKDB4MmIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGZvcnR1bmVUZWxsZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDRjLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBkb29yKDB4NTYpLCBkb29yKDB4NTksICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJhY2tSb29tID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0ZCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBkb2pvID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0ZSxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgLy8gRWRnZSBlbnRyYW5jZSBzaGlmdGVkIHRvIHByb3Blcmx5IGxpbmUgdXAgYXQgc3RhcnQgb2Ygc3RvbSBmaWdodC5cbiAgICAvLyAobm90ZSB0aGF0IHRoaXMgY2F1c2VzIHVzIHRvIHNoaWZ0IGFsbCBvdGhlciB1c2VzIGFzIHdlbGwpLlxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHtzaGlmdDogLTAuNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpbmRtaWxsSW5zaWRlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0ZixcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2Uoe2xlZnQ6IDksIHdpZHRoOiAxfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG9yaXpvbnRhbFRvd25NaWRkbGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGJyeW5tYWVyICsgc3dhbiAoVE9ETyAtIHNwbGl0IHNvIHdlIGNhbiBtb3ZlIGV4aXRzKVxuICAgIGlkOiAweDUwLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge319LFxuICAgIGV4aXRzOiBbZG9vcigweDRjKSwgZG9vcigweDU1LCAnZG9vcjInKV0sXG4gICAgdGFsbEhvdXNlczogWzB4MzVdLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJ5bm1hZXJSaWdodF9leGl0RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gYnJ5bm1hZXJcbiAgICBpZDogMHg1MSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnaG9yaXpvbnRhbCd9fSxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA4fSksIGRvb3IoMHg0MSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJ5bm1hZXJMZWZ0X2RlYWRFbmQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGJyeW5tYWVyXG4gICAgaWQ6IDB4NTIsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NDkpLCBkb29yKDB4NGMsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW5MZWZ0X2V4aXRXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzd2FuXG4gICAgaWQ6IDB4NTMsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA5fSksIGRvb3IoMHg0OSksIGRvb3IoMHg1ZSwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhblJpZ2h0X2V4aXRTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzd2FuXG4gICAgaWQ6IDB4NTQsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiAzfSksIGRvb3IoMHg0MSksXG4gICAgICAgICAgICBkb29yKDB4NDMsICdkb29yMicpLCBkb29yKDB4NTcsICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvcml6b250YWxUb3duTGVmdF9leGl0TiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2FoYXJhLCBhbWF6b25lcyAoVE9ETyAtIHNwbGl0IHNvIHdlIGNhbiBtb3ZlIGV4aXRzKVxuICAgIGlkOiAweDU1LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogMHhkfSksIGRvb3IoMHg0NiksIGRvb3IoMHg0YiwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgYW1hem9uZXNSaWdodF9kZWFkRW5kID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBhbWF6b25lc1xuICAgIGlkOiAweDU2LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDQwKSwgZG9vcigweDU4LCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBzYWhhcmFSaWdodF9leGl0RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2FoYXJhXG4gICAgaWQ6IDB4NTcsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogN30pLCBkb29yKDB4NDApLCBkb29yKDB4NjYsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYU5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1OCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbY2F2ZSgweDQ3LCAnZm9ydHJlc3MnKSwgYm90dG9tRWRnZSgpXSwgLy8gYm90dG9tIGp1c3QgaW4gY2FzZT9cbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYU5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1OSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDYzKSwgZG9vcigweDhhLCAnZG9vcjInKSwgYm90dG9tRWRnZSh7bGVmdDogMywgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FTV19leGl0VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NWEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDl9KSwgZG9vcigweDg2KSwgdG9wRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYVNFX2V4aXRFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1YixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDl9KSwgZG9vcigweDdhKSwgZG9vcigweDg3LCAnZG9vcjInKV0sXG4gICAgdGFsbEhvdXNlczogWzB4NWFdLFxuICB9KTtcbiAgcmVhZG9ubHkgZHluYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NWMsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIC8vIE5PVEU6IG5vdCByZWFsbHkgYSBnb29kIGV4aXQgdHlwZSBmb3IgdGhpcy4uLlxuICAgIGV4aXRzOiBbe3R5cGU6ICdzdGFpcjpkb3duJywgbWFudWFsOiB0cnVlLCBkaXI6IDIsXG4gICAgICAgICAgICAgZW50cmFuY2U6IDB4YmY4MCwgZXhpdHM6IFtdfV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FGaXNoZXJtYW4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHBvcnRvYVxuICAgIGlkOiAweDVkLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogNn0pLFxuICAgICAgICAgICAgbGVmdEVkZ2Uoe3RvcDogNCwgaGVpZ2h0OiA2LCBzaGlmdDogMC41fSksXG4gICAgICAgICAgICBkb29yKDB4NjgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHZlcnRpY2FsVG93blRvcF9mb3J0cmVzcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2h5cm9uLCB6b21iaWUgdG93biAocHJvYmFibHkgbm90IHdvcnRoIHNwbGl0dGluZyB0aGlzIG9uZSlcbiAgICBpZDogMHg1ZSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtjYXZlKDB4NDcsICdmb3J0cmVzcycpLCBib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2h5cm9uTWlkZGxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzaHlyb25cbiAgICBpZDogMHg1ZixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NTQpLCBkb29yKDB4NWIsICdkb29yMicpLCB0b3BFZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2h5cm9uQm90dG9tX2V4aXRTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzaHlyb25cbiAgICBpZDogMHg2MCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiAzfSksIGRvb3IoMHgwNCksXG4gICAgICAgICAgICBkb29yKDB4MDYsICdkb29yMicpLCBkb29yKDB4OTksICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHpvbWJpZVRvd25NaWRkbGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHpvbWJpZSB0b3duXG4gICAgaWQ6IDB4NjEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDk5KSwgdG9wRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHpvbWJpZVRvd25Cb3R0b21fY2F2ZUV4aXQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHpvbWJpZSB0b3duXG4gICAgaWQ6IDB4NjIsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbY2F2ZSgweDkyKSwgZG9vcigweDIzKSwgZG9vcigweDRkLCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBsZWFmTldfaG91c2VTaGVkID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBsZWFmXG4gICAgaWQ6IDB4NjMsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg4YyksIGRvb3IoMHg5NSwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3F1YXJlVG93bk5FX2hvdXNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBsZWFmLCBnb2EgKFRPRE8gLSBzcGxpdClcbiAgICBpZDogMHg2NCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogMX0pLCBkb29yKDB4YjcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGxlYWZTV19zaG9wcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gbGVhZlxuICAgIGlkOiAweDY1LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NzcpLCBkb29yKDB4OGEsICdkb29yMicpXSxcbiAgICB0YWxsSG91c2VzOiBbMHg2YV0sXG4gIH0pO1xuICByZWFkb25seSBsZWFmU0VfZXhpdEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGxlYWZcbiAgICBpZDogMHg2NixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDMsIGhlaWdodDogMywgc2hpZnQ6IC0wLjV9KSwgZG9vcigweDg0KV0sXG4gIH0pO1xuICByZWFkb25seSBnb2FOV190YXZlcm4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGdvYVxuICAgIGlkOiAweDY3LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4YmEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNxdWFyZVRvd25TV19leGl0UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gZ29hLCBqb2VsIChUT0RPIC0gc3BsaXQpXG4gICAgaWQ6IDB4NjgsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDh9KSwgZG9vcigweDg0KV0sXG4gIH0pO1xuICByZWFkb25seSBnb2FTRV9zaG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBnb2FcbiAgICBpZDogMHg2OSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDgyKV0sXG4gIH0pO1xuICByZWFkb25seSBqb2VsTkVfc2hvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gam9lbFxuICAgIGlkOiAweDZhLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4YTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGpvZWxTRV9sYWtlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBqb2VsXG4gICAgaWQ6IDB4NmIsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9ha05XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBvYWtcbiAgICBpZDogMHg2YyxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweGU3KV0sXG4gIH0pO1xuICByZWFkb25seSBvYWtORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gb2FrXG4gICAgaWQ6IDB4NmQsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg2MCldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2FrU1cgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIG9ha1xuICAgIGlkOiAweDZlLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4N2MpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9ha1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBvYWtcbiAgICBpZDogMHg2ZixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIC8vIEVkZ2UgZW50cmFuY2Ugc2hpZnRlZCBmb3IgY2hpbGQgYW5pbWF0aW9uXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiAwLCBzaGlmdDogMC41fSksIGRvb3IoMHg5NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgdGVtcGxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzaHlyb25cbiAgICBpZDogMHg3MCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSB3aWRlRGVhZEVuZE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8ID4gfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgdyB8ID4gfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAndyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4YzcpXSxcbiAgICBzdGF0dWVzOiBbNF0sXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlRGVhZEVuZE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcxLFxuICAgIGljb246IGljb25gXG4gICAgICB84pW14pSD4pW1fFxuICAgICAgfCA+IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIHcgfCA+IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3ICAgJyxcbiAgICBjb25uZWN0OiAnMXwyeHwzJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweGM3KV0sXG4gICAgc3RhdHVlczogWzRdLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwg4pSDIHxgLFxuICAgIHRpbGU6ICcgdyB8IHcgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBzdGF0dWVzOiBbMSwgNywgMHhkXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHzilILilIPilIJ8YCxcbiAgICB0aWxlOiAnIHcgfCB3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTl8MmF8M2InLFxuICAgIHN0YXR1ZXM6IFsxLCA3LCAweGRdLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUgyB8XG4gICAgICB84pSC4pSD4pSCfGAsXG4gICAgcGxhY2VtZW50OiAnbW9kJyxcbiAgICB0aWxlOiAnIHcgfCB3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4OWRdfX0sXG4gICAgLy8gdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAvLyAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOUywgMCwgMCwgMHg5ZCldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxOXwyYXwzfGInLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19ibG9ja2VkTGVmdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilIPilIJ8XG4gICAgICB8IOKUg+KUgnxcbiAgICAgIHzilILilIPilIJ8YCxcbiAgICBwbGFjZW1lbnQ6ICdtb2QnLFxuICAgIHRpbGU6ICcgdyB8IHcgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHg1MV19fSxcbiAgICAvLyB1cGRhdGU6IFtbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzLFxuICAgIC8vICAgICAgICAgICBsYWJ5cmludGhWYXJpYW50KHMgPT4gcy5nb2FXaWRlSGFsbE5TLCAwLCAxLCAweDUxKV1dLFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzF8OXwyYXwzYicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlQXJlbmEgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDczLFxuICAgIGljb246IGljb25gPFxuICAgICAgfOKVuzzilbt8XG4gICAgICB84pSh4pSB4pSpfFxuICAgICAgfOKUguKVu+KUgnxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJyAgIHwgPCB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICc5YnxhJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHgzNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbGltZVRyZWVMYWtlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3NCxcbiAgICB0aWxlc2V0czoge2xpbWU6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBjYXZlKDB4NDcpXSxcbiAgICBmZWF0dXJlOiBbJ2JyaWRnZSddLCAvLyBUT0RPIC0gbGFrZT9cbiAgICB3YWxsOiAweDY3LFxuICB9KTtcbiAgLy8gU3dhbXAgc2NyZWVuc1xuICByZWFkb25seSBzd2FtcE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3NSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUmCB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHxjYyB8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgLy8gVE9ETyAtIGRvIHdlIGFjdHVhbGx5IHdhbnQgdG8gcHV0IGFsbCB0aGVzZSBlZGdlcyBpbj9cbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICdzcyAgJyxcbiAgICBjb25uZWN0OiAnMjYnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIGxlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogNCwgc2hpZnQ6IC0wLjV9KV0sXG4gICAgcG9pOiBbWzJdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKVtuKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCBjY3wgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICcgICBzJyxcbiAgICBjb25uZWN0OiAnZScsXG4gICAgZXhpdHM6IFtdLFxuICAgIHBvaTogW1swXV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEVfZG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzYsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHwg4pW24pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8IDxjfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlN3YW1wRG9vcnNdfX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGZsYWc6ICdhbHdheXMnLFxuICAgIGVkZ2VzOiAnICAgcycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDVjLCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5XU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pS84pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHxjY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnc3NzcycsXG4gICAgY29ubmVjdDogJzI2YWUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIGxlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogNCwgc2hpZnQ6IC0wLjV9KSxcbiAgICAgICAgICAgIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICByaWdodEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTldTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3OCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUpCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfGNjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICdzc3MgJyxcbiAgICBjb25uZWN0OiAnMjZhJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICBsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc5LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUlOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIGMgfCBjY3wgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICdzICBzJyxcbiAgICBjb25uZWN0OiAnMmUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIHJpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSldLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2EsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSs4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHxjY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnIHNzcycsXG4gICAgY29ubmVjdDogJzZhZScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogNCwgc2hpZnQ6IC0wLjV9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdTRV9kb29yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3YSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8YzxjfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlN3YW1wRG9vcnNdfX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGZsYWc6ICdhbHdheXMnLFxuICAgIGVkZ2VzOiAnIHNzcycsXG4gICAgY29ubmVjdDogJzZhZScsXG4gICAgLy8gTk9URTogZG9vciBzY3JlZW5zIHNob3VsZCBub3QgYmUgb24gYW4gZXhpdCBlZGdlIVxuICAgIGV4aXRzOiBbY2F2ZSgweDU2LCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdiLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKVtCB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjYyB8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnIHMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIHBvaTogW1swXV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdfZG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2IsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilIDilbQgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8YzwgfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlN3YW1wRG9vcnNdfX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGZsYWc6ICdhbHdheXMnLFxuICAgIGVkZ2VzOiAnIHMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU0LCAnc3dhbXAnKV0sXG4gICAgLy8gVE9ETyAtIGZsYWdnYWJsZVxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBBcmVuYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2MsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSX4pSv4pSbfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHwgYSB8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnICBzICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIC8vIEZvciBsZWZ0L3JpZ2h0IG5laWdoYm9ycywgb25seSBhbGxvdyBlZGdlIG9yIGVtcHR5LlxuICAgIC8vIFRPRE8gLSBjaGVjayB0aGF0IHRoaXMgaXMgc3RpbGwgdGhlIGNhc2UuXG5cbiAgICAvLyBOT1RFOiBubyBlZGdlIGV4aXQgc2luY2Ugd2UgZG9uJ3Qgd2FudCB0byBnbyBzdHJhaWdodCBoZXJlLi4uXG4gICAgLy8gVE9ETyAtIGNvbnN0cmFpbnQgdGhhdCB3ZSBwdXQgc29saWRzIG9uIGVpdGhlciBzaWRlP1xuICAgIC8vIFRPRE8gLSB1bmRvIHRoZSBhdHRlbXB0IHRvIGFsbG93IHRoaXMgbm90IG9uIHRoZSByaWdodCBlZGdlLFxuICAgIC8vICAgICAgICBtYXliZSBtYWtlIGEgZmV3IGN1c3RvbSBjb21iaW5hdGlvbnM/IChpcyBpdCBzdGlsbCBicm9rZW4/KVxuICAgIC8vICAgICAgICAtLT4gbG9va3MgbGlrZSB3ZSBkaWQgZml4IHRoYXQgZWFybGllciBzb21laG93PyAgbWF5YmUgYnkgbW92aW5nXG4gICAgLy8gICAgICAgICAgICB0aGUgd2hvbGUgc2NyZWVuIGEgY29sdW1uIG92ZXIsIG9yIGVsc2UgYnkgY2hhbmdpbmcgdGhlIHRpbGVzP1xuICAgIC8vIFRPRE8gLSBOT1RFIFNXQU1QIEdSQVBISUNTIFNUSUxMIEJST0tFTiEhXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5XRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2QsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHxjY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnc3MgcycsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0fSksXG4gICAgICAgICAgICByaWdodEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2UsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSQIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8Y2MgfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlN3YW1wRG9vcnNdfX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIHVwZGF0ZTogW1tTY3JlZW5GaXguU3dhbXBEb29ycywgKHMsIHNlZWQsIHJvbSkgPT4ge1xuICAgICAgcm9tLm1ldGFzY3JlZW5zLnN3YW1wV1NfZG9vci5mbGFnID0gJ2Fsd2F5cyc7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XV0sXG4gICAgZWRnZXM6ICcgc3MgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0fSksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdTX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdlLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSA4pSQIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8YzwgfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzcyAnLFxuICAgIGNvbm5lY3Q6ICc2YScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTcsICdzd2FtcCcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wRW1wdHkgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdmLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCAgIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBjb25uZWN0OiAnJyxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICAvLyBNaXNzaW5nIHN3YW1wIHNjcmVlbnNcbiAgcmVhZG9ubHkgc3dhbXBOID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4NzAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pW1IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIGMgfCBjIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICdzICAgJyxcbiAgICBjb25uZWN0OiAnMicsXG4gICAgcG9pOiBbWzBdXSxcbiAgICBkZWZpbml0aW9uOiBjb25zdGFudChyZWFkU2NyZWVuKFxuICAgICAgICBgLiAgLiAgLiAgLiAgY2YgZjYgYzcgYWQgYzQgYjcgZjYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZjYgYjggYjkgYzMgYjcgZjYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZjYgYjcgYjggYWQgYWQgZDIgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYzIgYzMgYjcgYjggZDIgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjYgYzIgYjcgYjcgZjYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYjkgYjcgZjYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYWQgYWQgZDIgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjkgYjggYWQgYWQgZDIgZTIgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgZTMgZjYgYzMgYzMgYjggYjYgZDIgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgZTMgZmQgYWQgYWQgZmMgZTIgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgZmYgZmIgZmIgZmEgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLmAsXG4gICAgICAgIFsnLicsIDB4YzhdKSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW3IHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8IGMgfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyAgcyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBwb2k6IFtbMF1dLFxuICAgIGRlZmluaXRpb246IGNvbnN0YW50KHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICAuICBjZCBjOSBjOSBjYSAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICBjZCBlYiBhMCBhMCBjYiBjYSAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBhMCBmOSBmNSBmNyBmOCBjYiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBhMCBlZCAwOCAwOSBhMCBhMCBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkYiBlZSAwYyAwYiBlZiBhMCBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMCBkMSAwMyAwMyBkOCBkYiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNyBhZCBhZCBhZSBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBhZCBiOSBiNyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBjMiBjMyBjMyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNSBjMyBjMyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBiNiBjMiBjMyBjMyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiOCBiNiBiNiBiNiBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiNyBiNyBiNyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiNyBiNyBiOCBiNiBkMiBjYyAuICAuICAuICAuYCxcbiAgICAgICAgWycuJywgMHhjOF0pKSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHwgYyB8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAncyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICAgIGRlZmluaXRpb246IGNvbnN0YW50KHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICBjZiBkMyBiNiBiNiBjNiBiNiBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBiNiBjMyBjNyBiNiBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNSBjMyBjNyBiNiBiNiBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBiNiBiNiBjNiBjNSBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkOSBiNiBjNiBjMyBjNyBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNSBjMyBjMyBjMyBjMyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkOSBhZCBjMiBjMyBjMyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkOSBjNCBjNSBjMyBjMyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNSBiNyBiNyBiOCBiNiBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkOSBjMiBiOCBiNiBiNiBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkOSBiNiBjMiBiNyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkOSBiNiBiNiBiNiBiNiBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiNyBiNyBiOCBiNiBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBiOSBiNyBiNyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiNyBiNyBjNyBiNiBkMiBjYyAuICAuICAuICAuYCxcbiAgICAgICAgWycuJywgMHhjOF0pKSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnIHMgcycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogNCwgc2hpZnQ6IC0wLjV9KSxcbiAgICAgICAgICAgIHJpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSldLFxuICAgIGRlZmluaXRpb246IGNvbnN0YW50KHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuXG4gICAgICAgICBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOVxuICAgICAgICAgYTAgZTQgZTggZWIgZTQgYTAgYTAgYTAgZWIgZWIgZTggZjAgZjEgYTAgZTQgYTBcbiAgICAgICAgIGEwIGU1IGU5IGY5IGY1IGY2IGY2IGY3IGVjIGY5IGY3IGY4IGYyIGEwIGU1IGEwXG4gICAgICAgICBhMCBlNiBmMCBmMSBlNiBlMCAwOCAwOSBlZCBkZSBlYSBkZSBmMiBhMCBlNiBhMFxuICAgICAgICAgZGIgZTcgZGIgZjMgZTcgZTEgMGMgMGIgZGQgZGYgZTAgZGYgZjMgZGIgZTcgZTBcbiAgICAgICAgIGQwIGQxIGRhIGRhIGQwIGQxIDAzIDAzIGQwIGQxIGQwIGQxIGRhIGRhIGRhIGRhXG4gICAgICAgICBhZCBjNCBhZCBhZCBhZCBhZCBhZCBhZCBhZCBhZCBhZCBhZCBhZCBhZCBhZCBhZFxuICAgICAgICAgYzIgYzUgYjggYzYgYzQgYzQgYjkgYzcgYzQgYzUgYzUgYzcgYWQgYWQgYWQgYWRcbiAgICAgICAgIGFkIGFkIGFkIGFkIGMyIGMzIGMzIGMzIGMzIGMzIGM3IGFkIGFkIGFkIGFkIGFkXG4gICAgICAgICBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYiBmYlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLmAsXG4gICAgICAgIFsnLicsIDB4YzhdKSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdFX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MyxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfGM8Y3wgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzIHMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTYsICdzd2FtcCcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHwgY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnICBzcycsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBwb2k6IFtbMl1dLFxuICAgIGRlZmluaXRpb246IGNvbnN0YW50KHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICAuICBjZCBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOVxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgY2QgYTAgYTAgYTAgZTggMDQgYTAgZTggYTAgYTAgZTRcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY4IGEwIGYwIGYxIGY1IGY1IGY3IGU5IGY0IGY3IGU1XG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBmNyBmOCBmMiBlYSAwNiBhYSBlOSBmMCBmMSBlNlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgYTAgZGQgZTAgZjMgZTAgMDcgMGMgZWEgZGIgZjMgZTdcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGRiIGQ1IGQwIGQxIGQxIDAzIDAzIGQwIGQxIGRhIGRhXG4gICAgICAgICAuICAuICAuICAuICBjZiBkNSBhZiBjNCBjNCBhZCBhZCBhZCBhZCBhZCBjNCBhZFxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjkgYzMgYzMgYjggYWQgYWQgYWQgYzIgYjcgYjhcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGMzIGMzIGMzIGMzIGI4IGFkIGFkIGFkIGFkIGFkXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNyBhZCBjMiBjMyBjNyBmYyBmYiBmYiBmYiBmYlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYWQgYWQgZDYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjkgYjggYWQgYjkgZjYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZjYgYzcgYWQgYjkgYzcgZDIgY2MgLiAgLiAgLiAgLiBcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGI5IGMzIGI4IGQyIGNjIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSkpLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBTRV9kb29yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4NzQsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHwgPGN8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU3dhbXBEb29yc119fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZmxhZzogJ2Fsd2F5cycsXG4gICAgZWRnZXM6ICcgIHNzJyxcbiAgICBjb25uZWN0OiAnYWUnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDVhLCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5TRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDc1LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUnOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgYyB8IGNjfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3Mgc3MnLFxuICAgIGNvbm5lY3Q6ICcyYWUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICByaWdodEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pXSxcbiAgICBkZWZpbml0aW9uOiBjb25zdGFudChyZWFkU2NyZWVuKFxuICAgICAgICBgLiAgLiAgLiAgLiAgY2YgZDMgYzQgYzMgYzMgYzMgZjcgZjggY2EgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZjUgYzMgYzMgYzMgYzMgZjcgZjcgYTAgY2EgYzkgYzlcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGMzIGMzIGI4IGI2IGQyIGY3IGY4IGU4IGU0IGEwXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNSBiNyBjMyBiNyBiOCBkMiBmMCBmMSBlOSBlNSBkZVxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYzIgYjggYzIgYjggZDggZGIgZjIgZWEgZTYgZGZcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGFkIGFkIGFlIGQ0IGYzIGRkIGU3IGRmXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBhZCBhZCBhZCBhZCBhZCBhZSBkMCBkMSBkMCBkMVxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYzIgYzMgYzMgYjcgYjggYWQgYWQgYWQgYWQgYWRcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGMyIGI3IGI3IGI3IGI4IGM0IGFkIGFkXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBhZCBhZCBiNiBiOSBiNyBiNyBiNyBiNyBiOCBhZFxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYzQgYzMgYjcgYjggZmMgZmIgZmIgZmIgZmJcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGFkIGFkIGFkIGQ2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGFkIGFkIGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGM0IGMzIGI3IGI4IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGI5IGI3IGI3IGY2IGNjIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSkpLFxuICB9KTtcbiAgLy8gQ2F2ZSBzY3JlZW5zXG4gIHJlYWRvbmx5IGNhdmVFbXB0eSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8ICAgfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBsYWJ5cmludGg6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJyAgICAnLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRvbHBoaW5DYXZlX2VtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHwgICB8ICAgJyxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgb3BlbiA9IHRoaXMubWV0YXNjcmVlbih7IC8vIE5PVEU6IG5vdCBjYXZlXG4gICAgaWQ6IDB4ODAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvb298b29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9LCBzZWE6IHt9fSwgLy8gTk9URTogY291bGQgYWRkIGdyYXNzL3JpdmVyIGJ1dCB0cmVlcyBuaWNlci5cbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHwgYyB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIHBvaTogW1s0XV0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSksXG4gICAgICAgICAgICB0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MSxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8Y2NjfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBwb2k6IFtbNF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MixcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKUjOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8IGNjfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnICBjYycsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFNFX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MyxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSQIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8Y2MgfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGNjICcsXG4gICAgY29ubmVjdDogJzZhJyxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdTX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NCxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pSU4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgYyB8IGNjfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyAgYycsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBwb2k6IFtbMl1dLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxORV91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODUsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg2LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pSYIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIGMgfGNjIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2NjICAnLFxuICAgIGNvbm5lY3Q6ICcyNicsXG4gICAgcG9pOiBbWzJdXSxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsTldfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg2LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTlNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfCBjY3wgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgY2MnLFxuICAgIGNvbm5lY3Q6ICcyYWUnLFxuICAgIHBvaTogW1szXV0sXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTlNFX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NyxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg4LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pS84pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHxjY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjY2NjJyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KV0sXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV1NFX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4OCxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilKQgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHxjYyB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjY2MgJyxcbiAgICBjb25uZWN0OiAnMjZhJyxcbiAgICBwb2k6IFtbM11dLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XU191bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODksXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hXU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8Y2NjfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGNjYycsXG4gICAgY29ubmVjdDogJzZhZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaFdTRV91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGEsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2NjfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnY2MgYycsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KV0sXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhiLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX3JhbXAgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhjLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUiyB8XG4gICAgICB8IOKUiyB8XG4gICAgICB8IOKUiyB8YCxcbiAgICB0aWxlOiAnIGMgfCAvIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JhbXAnXSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX3JhbXBfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhjLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX292ZXJCcmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhkLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVvSB8XG4gICAgICB84pSA4pSD4pSAfFxuICAgICAgfCDilb8gfGAsXG4gICAgdGlsZTogJyBjIHwgYiB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydvdmVycGFzcyddLFxuICAgIGVkZ2VzOiAnY2JjYicsIC8vIFRPRE8gLSAnYicgZm9yIG90aGVyIHNpZGUgb2YgYnJpZGdlPz9cbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXRV91bmRlckJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pW9IHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8IOKVvyB8YCxcbiAgICB0aWxlOiAnICAgfGNiY3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3VuZGVycGFzcyddLFxuICAgIGVkZ2VzOiAnYmNiYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOU193YWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4ZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIYgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHwgYyB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBmZWF0dXJlOiBbJ3dhbGwnXSxcbiAgICAvLyBUT0RPIC0gY2FuIHdlIGp1c3QgZGV0ZWN0IHRoZSBjb25uZWN0aW9ucz9cbiAgICAvLyAgICAgIC0gZm9yIGVhY2ggdGlsZXNldCwgbWFwIDEuLmYgdG8gdmFyaW91cyBlZGdlIHBvcz9cbiAgICAvLyAgICAgIC0gZS5nLiBjYXZlOiAweDAyID0gMSwgMHgwOCA9IDIsIDB4MGMgPSAzLFxuICAgIC8vICAgICAgICAgICAgICAgICAgIDB4MjAgPSA1LCAweDgwID0gNiwgMHhjMCA9IDcsIC4uLlxuICAgIC8vICAgICAgICBuZWVkIHRvIGJlIFdBTEtBQkxFXG4gICAgLy8gICAgICAgIG1heSBuZWVkIHRvIHJlZXZhbHVhdGUgZWFjaCBzY3JlZW4gZm9yIGVhY2ggdGlsZXNldC4uLlxuICAgIC8vICAgICAgICBhbmQgbmVlZCB0byB3YWl0IHVudGlsIHRoZSBzY3JlZW4gaXMgQlVJTFQhXG4gICAgY29ubmVjdDogJzI9YScsIC8vIHdhbGwgd2lsbCBhbHdheXMgY29ubmVjdCB0aGUgZmlyc3QgdHdvP1xuICAgIHdhbGw6IDB4ODcsIFxuICAgIG1vZDogJ3dhbGwnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOU193YWxsX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4ZixcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXRV93YWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5MCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilITilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjY2N8ICAgJyxcbiAgICAvLyBOT1RFOiBubyBmb3J0cmVzcyB2ZXJzaW9uIG9mIHRoaXMgd2FsbCFcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3YWxsJ10sXG4gICAgZWRnZXM6ICcgYyBjJyxcbiAgICBjb25uZWN0OiAnNj1lJyxcbiAgICB3YWxsOiAweDY3LFxuICAgIG1vZDogJ3dhbGwnLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFX3dhbGxfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDkwLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX2FyZW5hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUuOKUkHxcbiAgICAgIHzilIIm4pSCfFxuICAgICAgfOKUlOKUrOKUmHxgLFxuICAgIC8vcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiBbJyBuIHwgYSB8IGMgJ10sIC8vICwgJyBuIHwgYSB8IHcgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJ2MgYyAnLCAvLyAnbicgZm9yICduYXJyb3cnIG9uIHRvcD8/P1xuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgcG9pOiBbWzEsIDB4NjAsIDB4NzhdXSxcbiAgICBleGl0czogW3RvcEVkZ2UoKSwgLy8gdmFtcGlyZSAxIHJvb21cbiAgICAgICAgICAgIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KSwgLy8gZ29hIHNhZ2VzXG4gICAgICAgICAgICBzZWFtbGVzc1VwKDB4ZTYsIDQpLCBzZWFtbGVzc0Rvd24oMHhmNiwgNCldLCAvLyBrZW5zdVxuICAgIGFyZW5hOiAxLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX2FyZW5hX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5MSxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOU19hcmVuYVdhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDkyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSE4pSQfFxuICAgICAgfOKUgibilIJ8XG4gICAgICB84pSU4pSs4pSYfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiBbJyBuIHwgYSB8IGMgJ10sIC8vICwgJyBjIHwgYSB8IGMgJ10sXG4gICAgLy8gTk9URTogaXJvbiB3YWxsIGRvZXNuJ3Qgd29yayBoZXJlXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnLCAnd2FsbCddLFxuICAgIGVkZ2VzOiAnbiBjICcsXG4gICAgY29ubmVjdDogJzJ4PWFweCcsXG4gICAgd2FsbDogMHgyNyxcbiAgICBtb2Q6ICd3YWxsJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgMHg3OF1dLFxuICAgIC8vIE5PVEU6IHRvcCBleGl0IG5lZWRzIHRvIG1vdmUgdXAgYSB0aWxlLi4uP1xuICAgIGV4aXRzOiBbdG9wRWRnZSh7dG9wOiAxfSksIC8vIHByaXNvbnMgbmVlZCBleHRyYSBleGl0c1xuICAgICAgICAgICAgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pXSxcbiAgICBhcmVuYTogMSxcbiAgfSk7XG4gIC8vIE5PVEU6IHNjcmVlbiA5MyBpcyBtaXNzaW5nIVxuICByZWFkb25seSBicmFuY2hOV0Vfd2FsbCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSGIHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHxjY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3YWxsJ10sXG4gICAgZWRnZXM6ICdjYyBjJyxcbiAgICBjb25uZWN0OiAnMng9NmUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gICAgbW9kOiAnd2FsbCcsXG4gICAgd2FsbDogMHgzNyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XRV93YWxsX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NCxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XRV91cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NSxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHwgPCB8XG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8YzxjfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHg0NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldFX3VwU3RhaXJfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk1LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdfdXBTdGFpciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTYsXG4gICAgaWNvbjogaWNvbmA8XG4gICAgICB8IDwgfFxuICAgICAgfOKUgOKUmCB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjPCB8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgYyAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NDIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXX3VwU3RhaXJfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk2LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHgyMCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdfZG93blN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NyxcbiAgICBpY29uOiBpY29uYD5cbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSQIHxcbiAgICAgIHwgPiB8YCxcbiAgICB0aWxlOiAnICAgfGM+IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyBjICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweGEyKV0sXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kV19kb3duU3RhaXJfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk3LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHgyMCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZEVfdXBTdGFpciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTgsXG4gICAgaWNvbjogaWNvbmA8XG4gICAgICB8IDwgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHwgPGN8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgICBjJyxcbiAgICBjb25uZWN0OiAnZScsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NGMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRFX3VwU3RhaXJfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk4LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHhkMCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZEVfZG93blN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5OSxcbiAgICBpY29uOiBpY29uYD5cbiAgICAgIHwgICB8XG4gICAgICB8IOKUjOKUgHxcbiAgICAgIHwgPiB8YCxcbiAgICB0aWxlOiAnICAgfCA+Y3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyAgIGMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweGFjKV0sXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kRV9kb3duU3RhaXJfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk5LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHhkMCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZE5TX3N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfFxuICAgICAgfCA8IHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJyA+IHwgICB8IDwgJywgLy8gTk9URTogdGhpcyB3aWxsIG5lZWQgdG8gYmUgbWFudWFsLi4uXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyeHxheCcsXG4gICAgZXhpdHM6IFtkb3duU3RhaXIoMHgxNyksIHVwU3RhaXIoMHhkNyldLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiByZWFjaGFibGUoMHgxMDgsIDB4NzgpICYmIHJlYWNoYWJsZSgtMHgzMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlNfc3RhaXJzX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YSxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4MTA4LCAweDc4KSAmJiAhcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTl9zdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDlhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ID4gfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiBbJyBjIHwgPiB8ICAgJywgJyA+IHwgICB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJ2MgICAnLFxuICAgIGNvbm5lY3Q6ICcyJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweDE3KV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHgxMDgsIDB4NzgpICYmIHJlYWNoYWJsZSgtMHgzMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kU19zdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDlhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgPCB8YCxcbiAgICB0aWxlOiBbJyAgIHwgPCB8IGMgJywgJyAgIHwgICB8IDwgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJyAgYyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHhkNyldLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKC0weDMwLCAweDc4KSAmJiByZWFjaGFibGUoMHgxMDgsIDB4NzgpLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZE5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbUgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW3IHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJyBjIHwgICB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydkZWFkZW5kJywgJ2VtcHR5J10sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMnB8YXAnLFxuICAgIHBvaTogW1swLCAtMHgzMCwgMHg3OF0sIFswLCAweDExMCwgMHg3OF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiByZWFjaGFibGUoLTB4MzAsIDB4NzgpICYmIHJlYWNoYWJsZSgweDExMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlNfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpICYmICFyZWFjaGFibGUoMHgxMTAsIDB4NzgpLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbUgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiBbJyBjIHwgYyB8ICAgJywgJyBjIHwgICB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZGVhZGVuZCcsICdlbXB0eSddLFxuICAgIGVkZ2VzOiAnYyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIHBvaTogW1swLCAtMHgzMCwgMHg3OF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4MTEwLCAweDc4KSAmJiByZWFjaGFibGUoLTB4MzAsIDB4NzgpLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW3IHxgLFxuICAgIHRpbGU6IFsnICAgfCBjIHwgYyAnLCAnICAgfCAgIHwgYyAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydkZWFkZW5kJywgJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgIGMgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgcG9pOiBbWzAsIDB4MTEwLCAweDc4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpICYmIHJlYWNoYWJsZSgweDExMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDljLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKVtCDilbZ8XG4gICAgICB8ICAgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnICAgfGMgY3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2RlYWRlbmQnLCAnZW1wdHknXSxcbiAgICBlZGdlczogJyBjIGMnLFxuICAgIGNvbm5lY3Q6ICc2cHxlcCcsXG4gICAgcG9pOiBbWzAsIDB4NzAsIC0weDI4XSwgWzAsIDB4NzAsIDB4MTA4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+IHJlYWNoYWJsZSgweDcwLCAtMHgyOCkgJiYgcmVhY2hhYmxlKDB4NzAsIDB4MTA4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXRV91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWMsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDcwLCAtMHgyOCkgJiYgIXJlYWNoYWJsZSgweDcwLCAweDEwOCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDljLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKVtCAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnICAgfGNjIHwgICAnLCAnICAgfGMgIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydkZWFkZW5kJywgJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgYyAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgcG9pOiBbWzAsIDB4NzAsIC0weDI4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg3MCwgMHgxMDgpICYmIHJlYWNoYWJsZSgweDcwLCAtMHgyOCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICDilbZ8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogWycgICB8IGNjfCAgICcsICcgICB8ICBjfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2RlYWRlbmQnLCAnZW1wdHknXSxcbiAgICBlZGdlczogJyAgIGMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBwb2k6IFtbMCwgMHg3MCwgMHgxMDhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDcwLCAtMHgyOCkgJiYgcmVhY2hhYmxlKDB4NzAsIDB4MTA4KSxcbiAgfSk7XG4gIC8vIE5PVEU6IDlkIG1pc3NpbmdcbiAgcmVhZG9ubHkgaGFsbE5TX2VudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5ZSxcbiAgICBpY29uOiBpY29uYOKVvVxuICAgICAgfCDilIIgfFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilb0gfGAsXG4gICAgdGlsZTogJyBjIHwgYyB8IG4gJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjIG4gJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOU19lbnRyYW5jZV91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWUsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRXhpdFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5ZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWU4pWQfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJyAgcnInLCAvLyBUT0RPIC0gdGhpcyBpcyBub3Qgc3BlY2lmaWMgZW5vdWdoIHRvIHJhbmRvbWl6ZSB3aXRoXG4gICAgLy9jb25uZWN0OiAnOWQ6YmYnLCAgLy8gOiBtZWFucyB3YXRlciAtIGZsaWdodCBuZWVkZWRcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDV9KV0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsQmVuZFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKVkOKVlyB8XG4gICAgICB84paI4pWRIHxgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgcnIgJywgLy8gVE9ETyAtIHRoaXMgaXMgbm90IHNwZWNpZmljIGVub3VnaCB0byByYW5kb21pemUgd2l0aFxuICB9KTtcbiAgcmVhZG9ubHkgY2hhbm5lbEhhbGxOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHwg4pWg4pSIfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInLCAnYnJpZGdlJ10sXG4gICAgd2FsbDogMHg4YixcbiAgICBlZGdlczogJ3IgciAnLCAvLyBUT0RPIC0gdGhpcyBpcyBub3Qgc3BlY2lmaWMgZW5vdWdoIHRvIHJhbmRvbWl6ZSB3aXRoXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRW50cmFuY2VTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKVlOKUiHxcbiAgICAgIHzilbfilZEgfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInLCAnYnJpZGdlJ10sXG4gICAgLy8gTk9URTogVGhpcyB3b3VsZCBBTE1PU1Qgd29yayBhcyBhIGNvbm5lY3Rpb24gdG8gdGhlXG4gICAgLy8gbm9ybWFsIHJpdmVyIGNhdmUgdGlsZXMsIGJ1dCB0aGUgcml2ZXIgaXMgb25lIHRpbGVcbiAgICAvLyB0YWxsZXIgYXQgdGhlIHRvcCwgc28gdGhlcmUncyBubyBtYXRjaCFcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDJ9KV0sXG4gICAgd2FsbDogMHg3YyxcbiAgICBlZGdlczogJyAgcnInLCAvLyBUT0RPIC0gdGhpcyBpcyBub3Qgc3BlY2lmaWMgZW5vdWdoIHRvIHJhbmRvbWl6ZSB3aXRoXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsQ3Jvc3MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGEzLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB84pWQ4pWs4pWQfFxuICAgICAgfOKVt+KVkeKVt3xgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgLy8gTk9URTogdHdvIGJvdHRvbSBlZGdlcyBvbiB0aGUgc2FtZSBzY3JlZW4gLSBjYWxsIG9uZSBhIGRvb3JcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDN9KSwgYm90dG9tRWRnZSh7bGVmdDogMHhiLCB0eXBlOiAnZG9vcid9KV0sXG4gICAgZWRnZXM6ICcgIHJyJywgLy8gVE9ETyAtIHRoaXMgaXMgbm90IHNwZWNpZmljIGVub3VnaCB0byByYW5kb21pemUgd2l0aFxuICB9KTtcbiAgcmVhZG9ubHkgY2hhbm5lbERvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGE0LFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqeKWiHxcbiAgICAgIHzilIjilZDilZB8XG4gICAgICB8ICDiloh8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlcicsICdicmlkZ2UnXSxcbiAgICBleGl0czogW2Rvb3IoMHgzOCldLFxuICAgIHdhbGw6IDB4NzMsXG4gICAgZWRnZXM6ICcgciAgJywgLy8gVE9ETyAtIHRoaXMgaXMgbm90IHNwZWNpZmljIGVub3VnaCB0byByYW5kb21pemUgd2l0aFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5GbG9hdGluZ0lzbGFuZCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTUsXG4gICAgaWNvbjogaWNvbmAqXG4gICAgICB84pWQ4pWX4paIfFxuICAgICAgfCrilZEgfFxuICAgICAgfOKVkOKVo+KWiHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJyAgIHwgYXB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgd3AnLCAgLy8gdyA9IHdhdGVyZmFsbCwgcCA9IHBhdGhcbiAgICBjb25uZWN0OiAnZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhORV9zdGFpciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTYsXG4gICAgaWNvbjogaWNvbmDilJRcbiAgICAgIHzilojilIviloh8XG4gICAgICB84paIICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAvIHwgcHB8ICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdsICBwJywgIC8vIGwgPSBsYWRkZXIgKHN0YWlycylcbiAgICBjb25uZWN0OiAnMmUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSgpXSwgLy8gbmV2ZXIgdXNlZCBhcyBhbiBleGl0IGluIHZhbmlsbGFcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluQnJhbmNoTldFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhNyxcbiAgICBpY29uOiBpY29uYOKUtFxuICAgICAgfOKWiCDiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgcCB8cHBwfCAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAncHAgcCcsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9pY2VCcmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGE4LFxuICAgIGljb246IGljb25g4pWrXG4gICAgICB84paI4pWR4paIfFxuICAgICAgfCDilIYgfFxuICAgICAgfOKWiOKVkeKWiHxgLFxuICAgIHRpbGU6IFsnIHIgfHBwcHwgciAnLCAnIHIgfHBwcHwgICAnXSxcbiAgICB0aWxlc2V0czoge21vdW50YWluUml2ZXI6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnd3B3cCcsXG4gICAgY29ubmVjdDogJzYtZToyYScsXG4gICAgd2FsbDogMHg4NyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhOSxcbiAgICBpY29uOiBpY29uYOKUjFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogJyAgIHwgcHB8IHAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnICBwcCcsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkRlYWRFbmRXX2NhdmVFbXB0eSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YWEsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paQIOKWkHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICAvLyBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgICB8cDwgfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW2NhdmUoMHgzOCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFiLFxuICAgIGljb246IGljb25g4pSUXG4gICAgICB84paIIOKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnIHAgfCBwcHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdwICBwJyxcbiAgICBjb25uZWN0OiAnMmUnLFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDYsIGhlaWdodDogNH0pLCB0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluQnJhbmNoV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhYyxcbiAgICBpY29uOiBpY29uYOKUrFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHwgICB8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGU6ICcgICB8cHBwfCBwICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwcHAnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhZCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHwgIOKWkHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfHA8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgcCAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTUpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aEVfc2xvcGVTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhZSxcbiAgICBpY29uOiBpY29uYOKVk1xuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlOiAnICAgfCBwcHwg4oaTICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnICBzcCcsIC8vIHMgPSBzbG9wZVxuICAgIGNvbm5lY3Q6ICdhZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YWYsXG4gICAgaWNvbjogaWNvbmDilJhcbiAgICAgIHzilogg4paIfFxuICAgICAgfCAg4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgcCB8cHAgfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3BwICAnLFxuICAgIGNvbm5lY3Q6ICcyNicsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkNhdmVfZW1wdHkgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGIwLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWjCDilpB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHwgPCB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgY29ubmVjdDogJycsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aEVfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjEsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paIICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHwgPHB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnICAgcCcsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU3KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9zbG9wZU4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGIyLFxuICAgIGljb246IGljb25g4pWoXG4gICAgICB84paI4oaT4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnIOKGkyB8cHBwfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnc3AgcCcsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkRlYWRFbmRXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiMyxcbiAgICBpY29uOiBpY29uYOKVtFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHwgIOKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfHBwIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgcCAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjQsXG4gICAgaWNvbjogaWNvbmDilIBcbiAgICAgIHzilojilojiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8cHBwfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwIHAnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgcmlnaHRFZGdlKHt0b3A6IDYsIGhlaWdodDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluQXJlbmFfZ2F0ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjUsXG4gICAgaWNvbjogaWNvbmAjXG4gICAgICB84paII+KWiHxcbiAgICAgIHzilowg4paQfFxuICAgICAgfOKWiOKUi+KWiHxgLFxuICAgIHRpbGU6ICcgICB8IDwgfCAvICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICcgIGwgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgZXhpdHM6IFt7Li4udXBTdGFpcigweDQ3LCAzKSwgdHlwZTogJ2dhdGUnfV0sXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhOX3Nsb3BlU19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiNixcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKUi+KIqXxcbiAgICAgIHzilowg4paQfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGU6ICcgLyB8IDwgfCDihpMgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICdsIHMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDVhKSwgdG9wRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX3Nsb3BlTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGI3LFxuICAgIGljb246IGljb25g4pWrXG4gICAgICB84paI4oaT4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlOiAnIOKGkyB8cHBwfCDihpMgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICdzcHNwJyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9zbG9wZU5fY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjgsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojihpPiiKl8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcg4oaTIHxwPHB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICdzcCBwJyxcbiAgICBjb25uZWN0OiAnMjZlJyxcbiAgICBleGl0czogW2NhdmUoMHg1YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGI5LFxuICAgIGljb246IGljb25g4pSQXG4gICAgICB84paI4paI4paIfFxuICAgICAgfCAg4paIfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlOiAnICAgfHBwIHwgcCAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgcHAgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogNiwgaGVpZ2h0OiA0fSksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5TbG9wZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmEsXG4gICAgaWNvbjogaWNvbmDihpNcbiAgICAgIHzilojihpPiloh8XG4gICAgICB84paI4oaT4paIfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGU6ICcg4oaTIHwg4oaTIHwg4oaTICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAncyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUml2ZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJhLFxuICAgIGljb246IGljb25g4pWRXG4gICAgICB84paI4pWR4paIfFxuICAgICAgfOKWiOKVkeKWiHxcbiAgICAgIHzilojilZHiloh8YCxcbiAgICB0aWxlOiBbJyByIHwgciB8IHIgJywgJyByIHwgciB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHttb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMjplJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aEVfZ2F0ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmIsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paIICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHwgPHB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICcgICBwJyxcbiAgICBjb25uZWN0OiAnZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTcsICdnYXRlJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0VfaW5uID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiYyxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHwgICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHxwPHB8ICAgJyxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJyBwIHAnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtkb29yKDB4NzYpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX2JyaWRnZU92ZXJTbG9wZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmQsXG4gICAgaWNvbjogaWNvbmDilZBcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8IOKVkCB8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZTogJyDihpMgfHBwcHwg4oaTICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnc3BzcCcsXG4gICAgY29ubmVjdDogJzZlJywgLy8gJzJhfDZlJyxcbiAgICBleGl0czogW3NlYW1sZXNzVXAoMHhiNiwgNCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0VfYnJpZGdlT3ZlclJpdmVyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiZCxcbiAgICBpY29uOiBpY29uYOKVkFxuICAgICAgfOKWiOKVkeKWiHxcbiAgICAgIHwg4pWQIHxcbiAgICAgIHzilojilZHiloh8YCxcbiAgICB0aWxlOiBbJyByIHxwcHB8IHIgJywgJyByIHxwcHB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHttb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICd3cHdwJyxcbiAgICBjb25uZWN0OiAnNmV8MnxhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluU2xvcGVfdW5kZXJCcmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJlLFxuICAgIGljb246IGljb25g4oaTXG4gICAgICB84paI4oaT4paIfFxuICAgICAgfCDilZAgfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGU6ICcg4oaTIHxw4oaTcHwg4oaTICcsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgLy8gVE9ETyAtIGNvdWxkIGZseSB1bmRlciBicmlkZ2Ugb24gbW91bnRhaW5SaXZlclxuICAgIGVkZ2VzOiAnc3BzcCcsXG4gICAgY29ubmVjdDogJzJhJywgLy8gJzJhfDZlJyxcbiAgICBleGl0czogW3NlYW1sZXNzRG93bigweGM2LCA0KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkVtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHwgICB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJyAgICAnLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84paE4paE4paEfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICdvb298b29vfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgLy8gVE9ETyAtIGdyYXNzL3JpdmVyIHNob3VsZCBtYXliZSB1c2Ugcm9ja3MgaW5zdGVhZD9cbiAgICBlZGdlczogJ29eIF4nLCAvLyBvID0gb3BlbiwgXiA9IG9wZW4gdXBcbiAgICAvL2Nvbm5lY3Q6ICcyNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlOX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGMxLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWgOKIqeKWgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfG88b3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFDYXZlRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICcgdm92JywgLy8gbyA9IG9wZW4sIHYgPSBvcGVuIGRvd25cbiAgICBleGl0czogW2NhdmUoMHg0OSldLFxuICB9KTtcbiAgcmVhZG9ubHkgY29ybmVyU0VfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paQ4paIfFxuICAgICAgfOKWhOKIqeKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnb28gfG88IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPF4gICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdhdGVyZmFsbCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84oaT4oaT4oaTfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvb2984oaT4oaT4oaTfG9vbycsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgd2hpcmxwb29sQmxvY2tlciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84paI4pWz4paIfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvb2984oaTI+KGk3xvb28nLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgLy8gVE9ETyAtIGluZGljYXRlIGZsYWdcbiAgICBmZWF0dXJlOiBbJ3doaXJscG9vbCddLFxuICAgIGZsYWc6ICdjYWxtJywgLy8gY2FsbWVkIHNlYVxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBiZWFjaEV4aXROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiCDiloh8XG4gICAgICB84paI4pWx4paAfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgeCB8IGJvfCBvbycsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICBlZGdlczogJ24gPnYnLCAvLyBuID0gXCJuYXJyb3dcIlxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogOX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdoaXJscG9vbE9wZW4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbMgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvb298b29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3doaXJscG9vbCddLFxuICAgIGVkZ2VzOiAnb29vbycsXG4gICAgZmxhZzogJ2NhbG0nLCAvLyBidXQgb25seSBpZiBvbiBhbmdyeSBzZWEgLSBub3QgZGVzZXJ0Li4uXG4gIH0pO1xuICByZWFkb25seSBxdWlja3NhbmRPcGVuID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWzIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb29vfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7ZGVzZXJ0OiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aGlybHBvb2wnXSxcbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgbGlnaHRob3VzZUVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWl+KWn+KWiHxcbiAgICAgIHzilpDiiKnilpt8XG4gICAgICB84pad4paA4paYfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnb28gfG9Mb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgLy8gVE9ETyAtIGluZGljYXRlIHVuaXF1ZW5lc3M/XG4gICAgZmVhdHVyZTogWydsaWdodGhvdXNlJ10sXG4gICAgZWRnZXM6ICc8b292JyxcbiAgICBleGl0czogW2NhdmUoMHgyYSksIGRvb3IoMHg3NSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVhY2hDYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHziloDilbLiloh8XG4gICAgICB8ICAgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnICAgfG88b3xvb28nLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZWRnZXM6ICcgdm92JyxcbiAgICBleGl0czogW2NhdmUoMHgyOCldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVhY2hDYWJpbkVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDiiKniloh8XG4gICAgICB8IOKVsuKWgHxcbiAgICAgIHzilojiloTiloR8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICdvbyB8b0M4fCAgICcsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NhYmluJ10sXG4gICAgZWRnZXM6ICc8XiBiJywgLy8gYiA9IFwiYm9hdFwiXG4gICAgZXhpdHM6IFtkb29yKDB4NTUpLCByaWdodEVkZ2Uoe3RvcDogOCwgaGVpZ2h0OiAzfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2NlYW5TaHJpbmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNhLFxuICAgIGljb246IGljb25gXG4gICAgICB84paX4paE4paWfFxuICAgICAgfOKWkCrilox8XG4gICAgICB84padIOKWmHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJ29vb3xvQW98b29vJyxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIC8vIFRPRE8gLSBpbmRpY2F0ZSB1bmlxdWVuZXNzP1xuICAgIGZlYXR1cmU6IFsnYWx0YXInXSxcbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgcHlyYW1pZEVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjYixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDiloQgfFxuICAgICAgfOKWn+KIqeKWmXxcbiAgICAgIHwg4pWzIHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJ29vb3xvUG98b29vJyxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge319LFxuICAgIC8vIFRPRE8gLSBpbmRpY2F0ZSB1bmlxdWVuZXNzP1xuICAgIGZlYXR1cmU6IFsncHlyYW1pZCddLFxuICAgIGVkZ2VzOiAnb29vbycsXG4gICAgZXhpdHM6IFtjYXZlKDB4YTcsICdmb3J0cmVzcycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0RW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNjLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVsyB8XG4gICAgICB84paQPuKWjHxcbiAgICAgIHzilp3iloDilph8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICdvb298b1lvfG9vbycsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NyeXB0J10sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweDY3KV0sXG4gIH0pO1xuICByZWFkb25seSBvYXNpc0xha2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNkLFxuICAgIGljb246IGljb25gXG4gICAgICB8IF4gfFxuICAgICAgfHZPdnxcbiAgICAgIHwgdnZ8YCxcbiAgICB0aWxlOiAnb29vfG9vb3xvcm8nLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2xha2UnXSxcbiAgICBlZGdlczogJ29vM28nLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVzZXJ0Q2F2ZUVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWl+KWhOKWlnxcbiAgICAgIHzilpziiKnilpt8XG4gICAgICB8IOKVsyB8YCxcbiAgICB0aWxlOiAnb29vfG88b3xvb28nLFxuICAgIHRpbGVzZXRzOiB7ZGVzZXJ0OiB7fSxcbiAgICAgICAgICAgICAgIC8vIFRPRE8gLSBwcm9iYWJseSBuZWVkIHRvIHB1bGwgdGhpcyBvdXQgc2luY2UgZmxhZ3MgZGlmZmVyXG4gICAgICAgICAgICAgICAvLyBUT0RPIC0gd2UgY291bGQgYWxzbyBtYWtlIHRoaXMgd29ya2FibGUgaW4gcml2ZXIgaWYgd2Ugd2FudFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnb29vbycsXG4gICAgZXhpdHM6IFtjYXZlKDB4YTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9hc2lzQ2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4Y2YsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgdnZ8XG4gICAgICB84paE4oipdnxcbiAgICAgIHzilojilowgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnb3JvfG88b3wgb28nLFxuICAgIHRpbGVzZXRzOiB7ZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICczXj5vJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHgzNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgY2hhbm5lbEVuZFdfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiiKl8XG4gICAgICB84pWQ4pWQIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfHI8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4NTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvYXRDaGFubmVsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloDiloDiloB8XG4gICAgICB84paE4paE4paEfGAsXG4gICAgdGlsZTogWycgICB8ODg4fCAgICcsICcgICB8ODh4fCAgICddLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZWRnZXM6ICcgYiBiJyxcbiAgICBleGl0czogW3suLi5yaWdodEVkZ2Uoe3RvcDogOCwgaGVpZ2h0OiAzfSksIGVudHJhbmNlOiAweDljZTh9LFxuICAgICAgICAgICAgbGVmdEVkZ2Uoe3RvcDogOCwgaGVpZ2h0OiAzfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgY2hhbm5lbFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilZDilZDilZB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHxycnJ8ICAgJyxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTldTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilZHilJR8XG4gICAgICB84pWQ4pWs4pWQfFxuICAgICAgfOKUrOKUh+KUrHxgLFxuICAgICAgLy8gfOKWmOKVkeKWnXxcbiAgICAgIC8vIHzilZDilazilZB8XG4gICAgICAvLyB84paW4pSG4paXfGAsXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIHVzaW5nIHNvbGlkcyBmb3IgdGhlIGNvcm5lcnMgaW5zdGVhZD9cbiAgICB0aWxlOiAnIHIgfHJycnwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlcicsICdicmlkZ2UnXSxcbiAgICBlZGdlczogJ3JycnInLFxuICAgIGNvbm5lY3Q6ICcxNXA6M2RwOjc5LWJmJyxcbiAgICB3YWxsOiAweGI2LFxuICAgIHBvaTogW1s0LCAweDAwLCAweDQ4XSwgWzQsIDB4MDAsIDB4OThdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgICAvLyB84paM4pWR4paQfFxuICAgICAgLy8gfOKWjOKVkeKWkHxcbiAgICAgIC8vIHzilozilZHilpB8YCxcbiAgICB0aWxlOiAnIHIgfCByIHwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnciByICcsXG4gICAgY29ubmVjdDogJzE5OjNiJyxcbiAgICBtb2Q6ICdicmlkZ2UnLCAvLyBkNiBpcyB0aGUgYnJpZGdlZCB2ZXJzaW9uXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pWQ4pWQ4pWQfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgICB8cnJyfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgciByJyxcbiAgICBjb25uZWN0OiAnNWQ6N2YnLFxuICAgIG1vZDogJ2JyaWRnZScsIC8vIGQ3IGlzIHRoZSBicmlkZ2VkIHZlcnNpb25cbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSc4pSH4pSkfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgIHRpbGU6ICcgciB8IHIgfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnciByICcsXG4gICAgY29ubmVjdDogJzE5LTNiJyxcbiAgICB3YWxsOiAweDg3LFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV0VfYnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHzilZDilIXilZB8XG4gICAgICB84pSA4pS04pSAfGAsXG4gICAgdGlsZTogJyAgIHxycnJ8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInLCAnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICcgciByJyxcbiAgICBjb25uZWN0OiAnNWQtN2YnLFxuICAgIHdhbGw6IDB4ODYsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilIDilIB8XG4gICAgICB84pSC4pWU4pWQfFxuICAgICAgfOKUguKVkeKUjHxgLFxuICAgIHRpbGU6ICcgICB8IHJyfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgIHJyJyxcbiAgICBjb25uZWN0OiAnOWQ6YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQ5LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSQfFxuICAgICAgfOKVkOKVl+KUgnxcbiAgICAgIHzilJDilZHilIJ8YCxcbiAgICB0aWxlOiAnICAgfHJyIHwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnIHJyICcsXG4gICAgY29ubmVjdDogJzViOjc5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkYSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVkeKUlHxcbiAgICAgIHzilILilZrilZB8XG4gICAgICB84pSU4pSA4pSAfGAsXG4gICAgdGlsZTogJyByIHwgcnJ8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ3IgIHInLFxuICAgIGNvbm5lY3Q6ICcxZjozZCcsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZGIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilZHilIJ8XG4gICAgICB84pWQ4pWd4pSCfFxuICAgICAgfOKUgOKUgOKUmHxgLFxuICAgIHRpbGU6ICcgciB8cnIgfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdyciAgJyxcbiAgICBjb25uZWN0OiAnMTU6MzcnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV0VfcGFzc2FnZU4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGRjLFxuICAgIGljb246IGljb25g4pWnXG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlOiAnIGMgfHJycnwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnY3IgcicsXG4gICAgY29ubmVjdDogJzI1ZDo3ZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRV9wYXNzYWdlUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZGQsXG4gICAgaWNvbjogaWNvbmDilaRcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pWQ4pWQ4pWQfFxuICAgICAgfOKUgOKUrOKUgHxgLFxuICAgIHRpbGU6ICcgICB8cnJyfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgcmNyJyxcbiAgICBjb25uZWN0OiAnNWQ6N2FmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TX3Bhc3NhZ2VXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkZSxcbiAgICBpY29uOiBpY29uYOKVolxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilKTilZHilIJ8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZTogJyByIHxjciB8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ3JjciAnLFxuICAgIGNvbm5lY3Q6ICcxNjk6M2InLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlNfcGFzc2FnZUUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGRmLFxuICAgIGljb246IGljb25g4pWfXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUguKVkeKUnHxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICB0aWxlOiAnIHIgfCByY3wgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnciByYycsXG4gICAgY29ubmVjdDogJzE5OjNiZScsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfCDilJfilIF8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyB3IHwgd3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICd3ICB3JyxcbiAgICBjb25uZWN0OiAnMmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilIPilJR8XG4gICAgICB84pSC4pSX4pSBfFxuICAgICAgfOKUlOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgdyB8IHd3fCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3cgIHcnLFxuICAgIGNvbm5lY3Q6ICcxZnwyZXwzZCcsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5FX2Jsb2NrZWRMZWZ0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUlHxcbiAgICAgIHwg4pSX4pSBfFxuICAgICAgfOKUlOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgdyB8IHd3fCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHg2MV19fSxcbiAgICBlZGdlczogJ3cgIHcnLFxuICAgIGNvbm5lY3Q6ICcxfGZ8MmV8M2QnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxORV9ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUwLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSDIHxcbiAgICAgIHzilILilJfilIF8XG4gICAgICB84pSU4pSA4pSAfGAsXG4gICAgdGlsZTogJyB3IHwgd3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDBkXX19LFxuICAgIGVkZ2VzOiAndyAgdycsXG4gICAgY29ubmVjdDogJzFmfDJlfDN8ZCcsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfOKUgeKUmyB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyB3IHx3dyB8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICd3dyAgJyxcbiAgICBjb25uZWN0OiAnMjYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilIPilIJ8XG4gICAgICB84pSB4pSb4pSCfFxuICAgICAgfOKUgOKUgOKUmHxgLFxuICAgIHRpbGU6ICcgdyB8d3cgfCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVXYWxsOiAweDZkfX0sXG4gICAgZWRnZXM6ICd3dyAgJyxcbiAgICBjb25uZWN0OiAnMTV8MjZ8MzcnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV19ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUxLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSD4pSCfFxuICAgICAgfOKUgeKUmyB8XG4gICAgICB84pSA4pSA4pSYfGAsXG4gICAgdGlsZTogJyB3IHx3dyB8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnd3cgICcsXG4gICAgY29ubmVjdDogJzE1fDI2fDN8NycsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XX2Jsb2NrZWRMZWZ0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIPilIJ8XG4gICAgICB84pSB4pSb4pSCfFxuICAgICAgfOKUgOKUgOKUmHxgLFxuICAgIHRpbGU6ICcgdyB8d3cgfCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHgwMV0sIHJlbW92ZVdhbGw6IDB4NmR9fSxcbiAgICBlZGdlczogJ3d3ICAnLFxuICAgIGNvbm5lY3Q6ICcxfDV8MjZ8MzcnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKUj+KUgXxcbiAgICAgIHwg4pSDIHxgLFxuICAgIHRpbGU6ICcgICB8IHd3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAnICB3dycsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSAfFxuICAgICAgfOKUguKUj+KUgXxcbiAgICAgIHzilILilIPilIx8YCxcbiAgICB0aWxlOiAnICAgfCB3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICcgIHd3JyxcbiAgICBjb25uZWN0OiAnOWR8YWV8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxTRV9ibG9ja2VkTGVmdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilIDilIB8XG4gICAgICB8IOKUj+KUgXxcbiAgICAgIHzilILilIPilIx8YCxcbiAgICB0aWxlOiAnICAgfCB3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4NjFdfX0sXG4gICAgZWRnZXM6ICcgIHd3JyxcbiAgICBjb25uZWN0OiAnOXxkfGFlfGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsU0VfYmxvY2tlZFJpZ2h0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUgHxcbiAgICAgIHzilILilI/ilIF8XG4gICAgICB84pSC4pSDIHxgLFxuICAgIHRpbGU6ICcgICB8IHd3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHhkZF19fSxcbiAgICBlZGdlczogJyAgd3cnLFxuICAgIGNvbm5lY3Q6ICc5ZHxhZXxifGYnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSB4pSTIHxcbiAgICAgIHwg4pSDIHxgLFxuICAgIHRpbGU6ICcgICB8d3cgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAnIHd3ICcsXG4gICAgY29ubmVjdDogJzZhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUzLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSQfFxuICAgICAgfOKUgeKUk+KUgnxcbiAgICAgIHzilJDilIPilIJ8YCxcbiAgICB0aWxlOiAnICAgfHd3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlV2FsbDogMHg5ZH19LFxuICAgIGVkZ2VzOiAnIHd3ICcsXG4gICAgY29ubmVjdDogJzVifDZhfDc5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1NfYmxvY2tlZFJpZ2h0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUkHxcbiAgICAgIHzilIHilJMgfFxuICAgICAgfOKUkOKUg+KUgnxgLFxuICAgIHRpbGU6ICcgICB8d3cgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJyB3dyAnLFxuICAgIGNvbm5lY3Q6ICc1fGJ8NmF8NzknLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXU19ibG9ja2VkTGVmdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilJB8XG4gICAgICB84pSB4pST4pSCfFxuICAgICAgfCDilIPilIJ8YCxcbiAgICB0aWxlOiAnICAgfHd3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4ZDFdLCByZW1vdmVXYWxsOiAweDlkfX0sXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNWJ8NmF8N3w5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfc3RhaXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUnOKUqOKUgnxcbiAgICAgIHzilILilIPilIJ8XG4gICAgICB84pSC4pSg4pSkfGAsXG4gICAgdGlsZTogJyB3IHwgSCB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzEyMzlhYicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX3N0YWlyc0Jsb2NrZWQxMyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJTilKjilIJ8XG4gICAgICB84pW34pSD4pW1fFxuICAgICAgfOKUguKUoOKUkHxgLFxuICAgIHRpbGU6ICcgdyB8IEggfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHg0MSwgMHg4ZF19fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxMmFifDN8OScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX3N0YWlyc0Jsb2NrZWQyNCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilKjilIJ8XG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUoOKUmHxgLFxuICAgIHRpbGU6ICcgdyB8IEggfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHgwMSwgMHhjZF19fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxfDIzOWF8YicsXG4gIH0pO1xuICAvLyBUT0RPIC0gY3VzdG9tIGludmVydGVkIHZlcnNpb24gb2YgZTQgd2l0aCB0aGUgdG9wIHN0YWlyIG9uIHRoZSByaWdodFxuICByZWFkb25seSB3aWRlSGFsbE5TX2RlYWRFbmRzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbkgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW7IHxgLFxuICAgIHRpbGU6ICcgdyB8ICAgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzJ8YScsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+IHJlYWNoYWJsZSgweDExMCwgMHg3OCkgJiYgcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsX2RlYWRFbmROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbkgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiBbJyB3IHwgICB8ICAgJywgJyB3IHwgdyB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAndyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4MTEwLCAweDc4KSAmJiByZWFjaGFibGUoLTB4MzAsIDB4NzgpLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxfZGVhZEVuZFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW7IHxgLFxuICAgIHRpbGU6IFsnICAgfCAgIHwgdyAnLCAnICAgfCB3IHwgdyAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICcgIHcgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+IHJlYWNoYWJsZSgweDExMCwgMHg3OCkgJiYgIXJlYWNoYWJsZSgtMHgzMCwgMHg3OCksXG4gIH0pO1xuICAvLyBUT0RPIC0gYWRkIG9uZS13YXkgdmlld3Mgb2YgdGhpcz8hP1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX2RlYWRFbmQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pW54pSCfFxuICAgICAgfOKUnOKUgOKUpHxcbiAgICAgIHzilILilbvilIJ8YCxcbiAgICB0aWxlOiAnIHcgfCA9IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTM5YnwyfGEnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19kZWFkRW5kQmxvY2tlZDI0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKVteKVueKUgnxcbiAgICAgIHzilIzilIDilJh8XG4gICAgICB84pSC4pW74pW3fGAsXG4gICAgdGlsZTogJyB3IHwgPSB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDYxLCAweGFkXX19LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzF8MnwzOXxhfGInLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19kZWFkRW5kQmxvY2tlZDEzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVueKVtXxcbiAgICAgIHzilJTilIDilJB8XG4gICAgICB84pW34pW74pSCfGAsXG4gICAgdGlsZTogJyB3IHwgPSB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDZkLCAweGExXX19LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzFifDJ8M3w5fGEnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxOV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHwg4pSDIHxgLFxuICAgIHRpbGU6ICcgdyB8d3d3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAnd3d3dycsXG4gICAgY29ubmVjdDogJzI2YWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKUg+KUlHxcbiAgICAgIHzilIHilYvilIF8XG4gICAgICB84pSQ4pSD4pSMfGAsXG4gICAgdGlsZTogJyB3IHx3d3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnd3d3dycsXG4gICAgY29ubmVjdDogJzI2YWV8MTV8M2R8Nzl8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV1NFX2Jsb2NrZWQxMyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilIMgfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHwg4pSD4pSMfGAsXG4gICAgdGlsZTogJyB3IHx3d3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDBkLCAweGQxXX19LFxuICAgIGVkZ2VzOiAnd3d3dycsXG4gICAgY29ubmVjdDogJzI2YWV8MTV8M3xkfDd8OXxiZicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XU0VfYmxvY2tlZDI0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIPilJR8XG4gICAgICB84pSB4pWL4pSBfFxuICAgICAgfOKUkOKUgyB8YCxcbiAgICB0aWxlOiAnIHcgfHd3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4MDEsIDB4ZGRdfX0sXG4gICAgZWRnZXM6ICd3d3d3JyxcbiAgICBjb25uZWN0OiAnMjZhZXwxfDV8M2R8Nzl8YnxmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTldFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfOKUgeKUu+KUgXxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIHcgfHd3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3d3IHcnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU3LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSD4pSUfFxuICAgICAgfOKUgeKUu+KUgXxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlOiAnIHcgfHd3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3dyB3JyxcbiAgICBjb25uZWN0OiAnMjZlfDE1fDNkfDdmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldFX2Jsb2NrZWRUb3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB84pSB4pS74pSBfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgdyB8d3d3fCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHgwMSwgMHgwZF19fSxcbiAgICBlZGdlczogJ3d3IHcnLFxuICAgIGNvbm5lY3Q6ICcyNmV8MXw1fDN8ZHw3ZicsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbFdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSB4pSz4pSBfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZTogJyAgIHx3d3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICcgd3d3JyxcbiAgICBjb25uZWN0OiAnNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilIHilLPilIF8XG4gICAgICB84pSQ4pSD4pSMfGAsXG4gICAgdGlsZTogJyAgIHx3d3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnIHd3dycsXG4gICAgY29ubmVjdDogJzZhZXw1ZHw3OXxiZicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFdTRV9ibG9ja2VkQm90dG9tID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilIHilLPilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlOiAnICAgfHd3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4ZDEsIDB4ZGRdfX0sXG4gICAgZWRnZXM6ICcgd3d3JyxcbiAgICBjb25uZWN0OiAnNmFlfDVkfDd8OXxifGYnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxOU193YWxsVG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlOSwgICAgLy8gTk9URTogdGhlIHBhc3NhZ2UgbmFycm93cyBhdCB0aGUgdG9wXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSGIHxcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwg4pSDIHxgLFxuICAgIHRpbGU6ICcgbiB8IHcgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZScsICd3YWxsJ10sXG4gICAgZWRnZXM6ICdjIHcnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICB3YWxsOiAweDM3LFxuICAgIHN0YXR1ZXM6IFsweGFdLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU193YWxsVG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlOSwgICAgLy8gTk9URTogdGhlIHBhc3NhZ2UgbmFycm93cyBhdCB0aGUgdG9wXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSGIHxcbiAgICAgIHzilbfilIPilbd8XG4gICAgICB84pSC4pSD4pSCfGAsXG4gICAgdGlsZTogJyBuIHwgdyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGZlYXR1cmU6IFsnd2FsbCddLFxuICAgIGVkZ2VzOiAnYyB3ICcsXG4gICAgY29ubmVjdDogJzJheHw5fGInLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gICAgd2FsbDogMHgzNyxcbiAgICBzdGF0dWVzOiBbMHhhXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgeKUgeKUgXxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHd3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJyB3IHcnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlYSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilIHilIHilIF8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZTogJyAgIHx3d3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnIHcgdycsXG4gICAgY29ubmVjdDogJzVkfDZlfDdmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHBpdFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlYixcbiAgICB0aWxlOiAnICAgfGNwY3wgICAnLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKVs+KUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydwaXQnXSxcbiAgICBlZGdlczogJyBjIGMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgcGxhdGZvcm06IHt0eXBlOiAnaG9yaXpvbnRhbCcsIGNvb3JkOiAweDcwXzM4fSxcbiAgfSk7XG4gIHJlYWRvbmx5IHBpdE5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlYyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilbMgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHwgcCB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydwaXQnXSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgcGxhdGZvcm06IHt0eXBlOiAndmVydGljYWwnLCBjb29yZDogMHg0MF83OH0sXG4gIH0pO1xuICByZWFkb25seSBwaXROU191bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWMsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOU19oYWxsUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgcyB8IHMgfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzIGMgJywgLy8gcyA9IHNwaWtlc1xuICAgIGNvbm5lY3Q6ICcyYScsXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOU19oYWxsTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICB0aWxlOiAnIGMgfCBzIHwgcyAnLFxuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdjIHMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgc3Bpa2VzTlNfaGFsbFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpEgfFxuICAgICAgfOKUgOKWkeKUgHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGU6ICcgcyB8Y3NjfCBzICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzY3NjJyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOU19oYWxsVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weGUwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkSB8XG4gICAgICB84pSA4paRIHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGVzZXRzOiAvL3dpdGhSZXF1aXJlKFNjcmVlbkZpeC5FeHRyYVNwaWtlcyxcbiAgICAgICAgICAgICAge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgdGlsZTogJyBzIHxjcyB8IHMgJyxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAnc2NzICcsXG4gICAgY29ubmVjdDogJzI2YScsXG4gICAgZGVmaW5pdGlvbjogKHJvbTogUm9tKSA9PiByZWFkU2NyZWVuKFxuICAgICAgICBgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUlxuICAgICAgICAgTCBMIEwgTCBMIEwgTCBMIFIgUiBSIFIgUiBSIFIgUmAsXG4gICAgICBbJ0wnLCByb20ubWV0YXNjcmVlbnMuc3Bpa2VzTlNfaGFsbFdFXSxcbiAgICAgIFsnUicsIHJvbS5tZXRhc2NyZWVucy5zcGlrZXNOU10pLFxuICB9KTtcbiAgcmVhZG9ubHkgc3Bpa2VzTlNfaGFsbEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilpHilIB8XG4gICAgICB8IOKWkSB8YCxcbiAgICB0aWxlc2V0czogLy93aXRoUmVxdWlyZShTY3JlZW5GaXguRXh0cmFTcGlrZXMsXG4gICAgICAgICAgICAgIHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIHRpbGU6ICcgcyB8IHNjfCBzICcsXG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ3Mgc2MnLFxuICAgIGNvbm5lY3Q6ICcyYWUnLFxuICAgIGRlZmluaXRpb246IChyb206IFJvbSkgPT4gcmVhZFNjcmVlbihcbiAgICAgICAgYEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJcbiAgICAgICAgIEwgTCBMIEwgTCBMIEwgTCBSIFIgUiBSIFIgUiBSIFJgLFxuICAgICAgWydMJywgcm9tLm1ldGFzY3JlZW5zLnNwaWtlc05TXSxcbiAgICAgIFsnUicsIHJvbS5tZXRhc2NyZWVucy5zcGlrZXNOU19oYWxsV0VdKSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc05TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilaggfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWlIHxgLFxuICAgIHRpbGU6ICcgciB8ICAgfCByICcsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnZGVhZGVuZCcsICdlbXB0eScsICdyaXZlciddLFxuICAgIGVkZ2VzOiAnciByICcsXG4gICAgY29ubmVjdDogJzFwOjNwfDlwOmJwJyxcbiAgICBwb2k6IFtbMSwgLTB4MzAsIDB4NDhdLCBbMSwgLTB4MzAsIDB4OThdLFxuICAgICAgICAgIFsxLCAweDExMCwgMHg0OF0sIFsxLCAweDExMCwgMHg5OF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWoIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogWycgciB8ICAgfCAgICcsICcgciB8IHIgfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydkZWFkZW5kJywgJ2VtcHR5JywgJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdyICAgJyxcbiAgICBjb25uZWN0OiAnMXA6M3AnLFxuICAgIHBvaTogW1sxLCAtMHgzMCwgMHg0OF0sIFsxLCAtMHgzMCwgMHg5OF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4MTA4LCAweDQ4KSAmJiAhcmVhY2hhYmxlKDB4MTA4LCAweDk4KSxcbiAgICBtb2Q6ICdicmlkZ2UnLCAvLyBmMiBpcyBicmlkZ2VkIHZlcnNpb25cbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWlIHxgLFxuICAgIHRpbGU6IFsnICAgfCAgIHwgciAnLCAnICAgfCByIHwgciAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnZGVhZGVuZCcsICdlbXB0eScsICdyaXZlciddLFxuICAgIGVkZ2VzOiAnICByICcsXG4gICAgY29ubmVjdDogJzlwOmJwJyxcbiAgICBwb2k6IFtbMSwgMHgxMTAsIDB4NDhdLCBbMSwgMHgxMTAsIDB4OThdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgtMHgzMCwgMHg0OCkgJiYgIXJlYWNoYWJsZSgtMHgzMCwgMHg5OCksXG4gICAgbW9kOiAnYnJpZGdlJywgLy8gZjIgaXMgYnJpZGdlZCB2ZXJzaW9uXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pWhIOKVnnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHIgcnwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydkZWFkZW5kJywgJ2VtcHR5JywgJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgciByJyxcbiAgICBjb25uZWN0OiAnNXA6N3B8ZHA6ZnAnLFxuICAgIHBvaTogW1sxLCAweDYwLCAtMHgyOF0sIFsxLCAweGEwLCAtMHgyOF0sXG4gICAgICAgICAgWzEsIDB4NjAsIDB4MTA4XSwgWzEsIDB4YTAsIDB4MTA4XV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilaEgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiBbJyAgIHxyICB8ICAgJywgJyAgIHxyciB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2RlYWRlbmQnLCAnZW1wdHknLCAncml2ZXInXSxcbiAgICBlZGdlczogJyByICAnLFxuICAgIGNvbm5lY3Q6ICc1cDo3cCcsXG4gICAgcG9pOiBbWzEsIDB4NjAsIC0weDI4XSwgWzEsIDB4YTAsIC0weDI4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg2MCwgMHgxMDgpICYmICFyZWFjaGFibGUoMHhhMCwgMHgxMDgpLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICDilZ58XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogWycgICB8ICByfCAgICcsICcgICB8IHJyfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydkZWFkZW5kJywgJ2VtcHR5JywgJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgICByJyxcbiAgICBjb25uZWN0OiAnZHA6ZnAnLFxuICAgIHBvaTogW1sxLCAweDYwLCAweDEwOF0sIFsxLCAweGEwLCAweDEwOF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NjAsIC0weDI4KSAmJiAhcmVhY2hhYmxlKDB4YTAsIC0weDI4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5fYnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIcgfFxuICAgICAgfCDilaggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnIHIgfCByIHwgICAnLCAnIHIgfCAgIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInLCAnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdyICAgJyxcbiAgICBjb25uZWN0OiAnMS0zJyxcbiAgICB3YWxsOiAweDE3LFxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBhIHBvaSgyKSBoZXJlP1xuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ZDAsIDB4NDgpICYmICFyZWFjaGFibGUoMHhkMCwgMHg5OCksXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVTX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKVpSB8XG4gICAgICB8IOKUhyB8YCxcbiAgICB0aWxlOiBbJyAgIHwgciB8IHIgJywgJyAgIHwgICB8IHIgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnICByICcsXG4gICAgY29ubmVjdDogJzktYicsXG4gICAgd2FsbDogMHhjNixcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgYSBwb2koMikgaGVyZT9cbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDEwLCAweDQ4KSAmJiAhcmVhY2hhYmxlKDB4MTAsIDB4OTgpLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilZDilabilZB8XG4gICAgICB84pSQ4pWR4pSMfGAsXG4gICAgdGlsZTogJyAgIHxycnJ8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJyBycnInLFxuICAgIGNvbm5lY3Q6ICc1ZDo3OTpiZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGY0LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pWR4pSUfFxuICAgICAgfOKVkOKVqeKVkHxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlOiAnIHIgfHJycnwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAncnIgcicsXG4gICAgY29ubmVjdDogJzE1cDozZHA6N2YnLFxuICAgIHBvaTogW1s0LCAweDAwLCAweDQ4XSwgWzQsIDB4MDAsIDB4OThdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5XUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weGYwLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pWR4pSCfFxuICAgICAgfOKVkOKVo+KUgnxcbiAgICAgIHzilJDilZHilIJ8YCxcbiAgICB0aWxlOiAnIHIgfHJyIHwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAncnJyICcsXG4gICAgY29ubmVjdDogJzE1cDozYjo3OScsXG4gICAgcG9pOiBbWzQsIDB4MDAsIDB4NDhdXSxcbiAgICBkZWZpbml0aW9uOiAocm9tOiBSb20pID0+IHJlYWRTY3JlZW4oXG4gICAgICAgIGBBIEEgQSBBIEEgQSBBIEEgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBBIEEgQSBBIEEgQSBBIEEgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBBIEEgQSBBIEEgQSBBIEEgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBBIEEgQSBBIEEgQSBBIEEgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBBIEEgQSBBIEEgQSBBIEEgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBBIEEgQSBBIEEgQSBBIEEgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBBIEEgQSBBIEEgQSBBIEEgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBBIEEgQSBBIEEgQSBBIEEgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBCIEIgQiBCIEIgQiBCIEIgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBCIEIgQiBCIEIgQiBCIEIgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBCIEIgQiBCIEIgQiBCIEIgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBCIEIgQiBCIEIgQiBCIEIgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBCIEIgQiBCIEIgQiBCIEIgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBCIEIgQiBCIEIgQiBCIEIgUiBSIFIgUiBSIFIgUiBSXG4gICAgICAgICBCIEIgQiBCIEIgQiBCIEIgUiBSIFIgUiBSIFIgUiBSYCxcbiAgICAgIFsnQScsIHJvbS5tZXRhc2NyZWVucy5yaXZlckNhdmVOV0VdLFxuICAgICAgWydCJywgcm9tLm1ldGFzY3JlZW5zLnJpdmVyQ2F2ZVdTRV0sXG4gICAgICBbJ1InLCByb20ubWV0YXNjcmVlbnMucml2ZXJDYXZlTlNdKSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weGYxLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSUfFxuICAgICAgfOKUguKVoOKVkHxcbiAgICAgIHzilILilZHilIx8YCxcbiAgICB0aWxlOiAnIHIgfCBycnwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnciBycicsXG4gICAgY29ubmVjdDogJzE5OjNkcDpiZicsXG4gICAgcG9pOiBbWzQsIDB4MDAsIDB4OThdXSxcbiAgICBkZWZpbml0aW9uOiAocm9tOiBSb20pID0+IHJlYWRTY3JlZW4oXG4gICAgICAgIGBMIEwgTCBMIEwgTCBMIEwgQSBBIEEgQSBBIEEgQSBBXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQSBBIEEgQSBBIEEgQSBBXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQSBBIEEgQSBBIEEgQSBBXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQSBBIEEgQSBBIEEgQSBBXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQSBBIEEgQSBBIEEgQSBBXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQSBBIEEgQSBBIEEgQSBBXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQSBBIEEgQSBBIEEgQSBBXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQSBBIEEgQSBBIEEgQSBBXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQiBCIEIgQiBCIEIgQiBCXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQiBCIEIgQiBCIEIgQiBCXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQiBCIEIgQiBCIEIgQiBCXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQiBCIEIgQiBCIEIgQiBCXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQiBCIEIgQiBCIEIgQiBCXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQiBCIEIgQiBCIEIgQiBCXG4gICAgICAgICBMIEwgTCBMIEwgTCBMIEwgQiBCIEIgQiBCIEIgQiBCYCxcbiAgICAgIFsnQScsIHJvbS5tZXRhc2NyZWVucy5yaXZlckNhdmVOV0VdLFxuICAgICAgWydCJywgcm9tLm1ldGFzY3JlZW5zLnJpdmVyQ2F2ZVdTRV0sXG4gICAgICBbJ0wnLCByb20ubWV0YXNjcmVlbnMucml2ZXJDYXZlTlNdKSxcbiAgfSk7XG5cbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlNfYmxvY2tlZFJpZ2h0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilILilZEgfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgIHRpbGU6ICcgciB8IHIgfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdyIHIgJyxcbiAgICBjb25uZWN0OiAnMTk6M3A6YnAnLFxuICAgIHBvaTogW1swLCAweDQwLCAweDk4XSwgWzAsIDB4YzAsIDB4OThdXSxcbiAgICBtb2Q6ICdibG9jaycsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19ibG9ja2VkTGVmdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB8IOKVkeKUgnxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICB0aWxlOiAnIHIgfCByIHwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnciByICcsXG4gICAgY29ubmVjdDogJzFwOjNiOjlwJyxcbiAgICBwb2k6IFtbMCwgMHgzMCwgMHg0OF0sIFswLCAweGIwLCAweDQ4XV0sXG4gICAgbW9kOiAnYmxvY2snLFxuICB9KTtcbiAgcmVhZG9ubHkgc3Bpa2VzTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGY3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkSB8XG4gICAgICB8IOKWkSB8XG4gICAgICB8IOKWkSB8YCxcbiAgICB0aWxlOiAnIHMgfCBzIHwgcyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAncyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0QXJlbmFfc3RhdHVlcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjgsXG4gICAgaWNvbjogaWNvbmA8XG4gICAgICB8JjwmfFxuICAgICAgfOKUgiDilIJ8XG4gICAgICB84pSU4pSs4pSYfGAsXG4gICAgdGlsZTogJyAgIHwgYSB8IGMgJyxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICcgIGMgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgZXhpdHM6IFt7Li4udXBTdGFpcigweDU3KSwgdHlwZTogJ2NyeXB0J31dLFxuICAgIGZsYWc6ICdjdXN0b206ZmFsc2UnLFxuICAgIGFyZW5hOiAyLFxuICB9KTtcbiAgcmVhZG9ubHkgcHlyYW1pZEFyZW5hX2RyYXlnb24gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGY5LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSQfFxuICAgICAgfOKUguKVs+KUgnxcbiAgICAgIHzilJTilKzilJh8YCxcbiAgICB0aWxlOiAnICAgfCBhIHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnLCAncGl0J10sXG4gICAgZWRnZXM6ICcgIHcgJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgYXJlbmE6IDMsXG4gIH0pO1xuICByZWFkb25seSBjcnlwdEFyZW5hX2RyYXlnb24yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmYSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUj+KUt+KUk3xcbiAgICAgIHzilIMm4pSDfFxuICAgICAgfOKUl+KUs+KUm3xgLFxuICAgIHRpbGU6ICcgeCB8IGEgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnYyB3ICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICAgIGZsYWc6ICdjdXN0b206ZmFsc2UnLFxuICAgIGFyZW5hOiA0LFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRBcmVuYV9lbnRyYW5jZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwg4pW/IHxgLFxuICAgIHRpbGU6ICcgdyB8IHcgfCB4ICcsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gICAgZWRnZXM6ICd3IG4gJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0VGVsZXBvcnRlciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmMsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fSwgdG93ZXI6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksIGNhdmUoMHg1NywgJ3RlbGVwb3J0ZXInKV0sXG4gIH0pO1xuICByZWFkb25seSBmb3J0cmVzc0FyZW5hX3Rocm91Z2ggPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGZkLFxuICAgIGljb246IGljb25g4pW9XG4gICAgICB84pSM4pS04pSQfFxuICAgICAgfOKUgiDilIJ8XG4gICAgICB84pSV4pSz4pSZfGAsXG4gICAgdGlsZTogWycgYyB8IGEgfCB3ICcsICcgbiB8IGEgfCB3ICddLCAvLyB4IHwgYSB8IHcgPz9cbiAgICB0aWxlc2V0czoge2ZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge319LFxuICAgIC8vIE5PVEU6IHdlIGNvdWxkIHVzZSB0aGlzIGZvciBhIHBpdCB0aGF0IHJlcXVpcmVzIGZsaWdodCB0byBjcm9zcz9cbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICduIHcgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSgpXSxcbiAgICBhcmVuYTogNSxcbiAgfSk7XG4gIC8vIHJlYWRvbmx5IGZvcnRyZXNzQXJlbmFfcGl0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgLy8gICBpZDogMHhmZCxcbiAgLy8gICBpY29uOiBpY29uYOKVvVxuICAvLyAgICAgfOKUjOKUtOKUkHxcbiAgLy8gICAgIHzilIIg4pSCfFxuICAvLyAgICAgfOKUleKUs+KUmXxgLFxuICAvLyAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge319LFxuICAvLyAgIGZlYXR1cmU6IFsnYXJlbmEnLCAncGl0J10sXG4gIC8vICAgZWRnZXM6ICduIHcgJyxcbiAgLy8gICBjb25uZWN0OiAnMmEnLCAvLyBUT0RPIC0gbm8gd2F5IHlldCB0byBub3RpY2UgZmxhZ2dlZCBhbmQgaGF2ZVxuICAvLyAgIGV4aXRzOiBbdG9wRWRnZSgpXSwgICAvLyBsb2dpYyByZXF1aXJlIGZsaWdodC4uLlxuICAvLyAgIGZsYWdnZWQ6IHRydWUsXG4gIC8vIH0pO1xuICByZWFkb25seSBmb3J0cmVzc1RyYXAgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGZlLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSU4pSA4pSYfFxuICAgICAgfCDilbMgfFxuICAgICAgfOKVtuKUrOKVtHxgLFxuICAgIHRpbGU6ICcgICB8IHggfCBuICcsIC8vIFRPRE8gLSBzYW1lIGFzIHN0YXR1ZXMuLi4/XG4gICAgdGlsZXNldHM6IHtmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3BpdCddLFxuICAgIGVkZ2VzOiAnICBuICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNocmluZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmYsXG4gICAgdGlsZXNldHM6IHtzaHJpbmU6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA1fSksIGRvb3IoMHg2OCldLFxuICB9KTtcbiAgcmVhZG9ubHkgaW5uID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMDAsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbey4uLmRvb3IoMHg4NiksIGVudHJhbmNlOiAweDk0XzY4fV0sXG4gIH0pO1xuICByZWFkb25seSB0b29sU2hvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTAxLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW3suLi5kb29yKDB4ODYpLCBlbnRyYW5jZTogMHg5NF82OH1dLFxuICB9KTtcbiAgcmVhZG9ubHkgYXJtb3JTaG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMDIsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbey4uLmRvb3IoMHg4NiksIGVudHJhbmNlOiAweDk0XzY4fV0sXG4gIH0pO1xuXG4gIGNoZWNrRXhpdFR5cGVzKCkge1xuICAgIC8vIERvZXMgYSBxdWljayBjaGVjayB0byBtYWtlIHN1cmUgdGhlcmUncyBubyBjb25mbGljdGluZyBleGl0IHR5cGVzXG4gICAgLy8gb24gYW55IG1ldGFzY3JlZW5zLlxuICAgIGZvciAoY29uc3QgcyBpbiB0aGlzKSB7XG4gICAgICBjb25zdCBtcyA9IHRoaXNbc10gYXMgYW55O1xuICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgZm9yIChjb25zdCBlIG9mIG1zPy5kYXRhPy5leGl0cyB8fCBbXSkge1xuICAgICAgICBpZiAoc2Vlbi5oYXMoZS50eXBlKSkgY29uc29sZS5sb2coYGR1cGxpY2F0ZTogJHtzfSAke2UudHlwZX1gKTtcbiAgICAgICAgc2Vlbi5hZGQoZS50eXBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuXG4vLyAgIOKVlOKVpuKVlyAgICAgICAgIOKVoiAg4pWlXG4vLyAgIOKVoOKVrOKVoyDilZ7ilZDilaTilafilarilaEgIOKVkSAg4pWrXG4vLyAgIOKVmuKVqeKVnSAgICAgICAgIOKVqCAg4pWfXG4vLyAg4pSM4pSs4pSQICDilbdcbi8vICDilJzilLzilKQgIOKUgiDilbbilIDilbQgXG4vLyAg4pSU4pS04pSYICDilbVcbi8vIOKWl+KWhOKWliAgIOKWn+KWmVxuLy8g4paQ4paI4paMICAg4pac4pabIFxuLy8g4pad4paA4paYXG4vLyBVKzI1MHgg4pSAIOKUgSDilIIg4pSDIOKUhCDilIUg4pSGIOKUhyDilIgg4pSJIOKUiiDilIsg4pSMIOKUjSDilI4g4pSPXG4vLyBVKzI1MXgg4pSQIOKUkSDilJIg4pSTIOKUlCDilJUg4pSWIOKUlyDilJgg4pSZIOKUmiDilJsg4pScIOKUnSDilJ4g4pSfXG4vLyBVKzI1Mngg4pSgIOKUoSDilKIg4pSjIOKUpCDilKUg4pSmIOKUpyDilKgg4pSpIOKUqiDilKsg4pSsIOKUrSDilK4g4pSvXG4vLyBVKzI1M3gg4pSwIOKUsSDilLIg4pSzIOKUtCDilLUg4pS2IOKUtyDilLgg4pS5IOKUuiDilLsg4pS8IOKUvSDilL4g4pS/XG4vLyBVKzI1NHgg4pWAIOKVgSDilYIg4pWDIOKVhCDilYUg4pWGIOKVhyDilYgg4pWJIOKViiDilYsg4pWMIOKVjSDilY4g4pWPXG4vLyBVKzI1NXgg4pWQIOKVkSDilZIg4pWTIOKVlCDilZUg4pWWIOKVlyDilZgg4pWZIOKVmiDilZsg4pWcIOKVnSDilZ5cdOKVn1xuLy8gVSsyNTZ4IOKVoCDilaEg4pWiIOKVoyDilaQg4pWlIOKVpiDilacg4pWoIOKVqSDilaog4pWrIOKVrCDila0g4pWuIOKVr1xuLy8gVSsyNTd4IOKVsCDilbEg4pWyIOKVsyDilbQg4pW1IOKVtiDilbcg4pW4IOKVuSDilbog4pW7IOKVvCDilb0g4pW+IOKVv1xuLy8gVSsyNTh4IOKWgCDiloEg4paCIOKWgyDiloQg4paFIOKWhiDilocg4paIIOKWiSDiloog4paLIOKWjCDilo0g4paOIOKWj1xuLy8gVSsyNTl4IOKWkCDilpEg4paSIOKWkyDilpQg4paVIOKWliDilpcg4paYIOKWmSDilpog4pabIOKWnCDilp0g4paeIOKWn1xuLy9cbi8vIOKIqSBcXGNhcFxuXG5mdW5jdGlvbiBjb25zdGFudDxUPih4OiBUKTogKCkgPT4gVCB7IHJldHVybiAoKSA9PiB4OyB9XG4iXX0=