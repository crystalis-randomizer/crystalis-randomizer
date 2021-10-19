import { DefaultMap } from '../util.js';
import { Metascreen } from './metascreen.js';
import { bottomEdge, bottomEdgeHouse, cave, door, downStair, icon, leftEdge, readScreen, rightEdge, seamlessDown, seamlessUp, topEdge, upStair, waterfallCave, } from './metascreendata.js';
import { ScreenFix, withRequire } from './screenfix.js';
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
            definition: readScreen(`.  .  .  .  cf f6 c7 ad c4 b7 f6 cc .  .  .  .
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
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .`, ['.', 0xc8]),
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
            definition: readScreen(`.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
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
         .  .  .  .  cf f6 b7 b7 b8 b6 d2 cc .  .  .  .`, ['.', 0xc8]),
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
            definition: readScreen(`.  .  .  .  cf d3 b6 b6 c6 b6 f6 cc .  .  .  .
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
         .  .  .  .  cf f6 b7 b7 c7 b6 d2 cc .  .  .  .`, ['.', 0xc8]),
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
            definition: readScreen(`.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
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
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .`, ['.', 0xc8]),
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
            definition: readScreen(`.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
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
         .  .  .  .  cf d3 b6 b9 c3 b8 d2 cc .  .  .  .`, ['.', 0xc8]),
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
            definition: readScreen(`.  .  .  .  cf d3 c4 c3 c3 c3 f7 f8 ca .  .  .
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
         .  .  .  .  cf d3 b6 b9 b7 b7 f6 cc .  .  .  .`, ['.', 0xc8]),
        });
        this.caveEmpty = this.metascreen({
            id: 0x80,
            icon: icon `
      |   |
      |   |
      |   |`,
            tile: '   |   |   ',
            tilesets: { cave: {}, fortress: {}, labyrinth: {}, pyramid: {},
                iceCave: {}, dolphinCave: {} },
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
            tilesets: withRequire(ScreenFix.ExtraSpikes, { cave: {}, fortress: {}, pyramid: {}, iceCave: {} }),
            tile: ' s |cs | s ',
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
            tile: ' s | sc| s ',
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
    }
    renumber(oldId, newId) {
        console.log(`renumber ${oldId} -> ${newId}`);
        const dest = this.screensById.get(newId);
        if (dest.length)
            throw new Error(`ID already used: ${newId}: ${dest}`);
        let sourceDefinition;
        for (const screen of this.getById(oldId)) {
            if (screen.data.definition) {
                sourceDefinition = screen.data.definition;
                screen.data.definition = undefined;
            }
            screen.unsafeSetId(newId);
            dest.push(screen);
        }
        this.screensById.delete(oldId);
        const oldScreen = this.rom.screens.getScreen(oldId);
        if (oldId >= 0 && newId < 0) {
            dest[0].data.definition = Uint8Array.from(oldScreen.tiles);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YXNjcmVlbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21ldGFzY3JlZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDdEMsT0FBTyxFQUFDLFVBQVUsRUFBTSxNQUFNLGlCQUFpQixDQUFDO0FBQ2hELE9BQU8sRUFBaUIsVUFBVSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFDbEUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQzFCLFNBQVMsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxHQUNwRSxNQUFNLHFCQUFxQixDQUFDO0FBRXBDLE9BQU8sRUFBQyxTQUFTLEVBQUUsV0FBVyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFzQ3RELE1BQU0sT0FBTyxXQUFXO0lBUXRCLFlBQXFCLEdBQVE7UUFBUixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBTHBCLFdBQU0sR0FBRyxDQUFDLENBQUM7UUFFSCxpQkFBWSxHQUFHLElBQUksVUFBVSxDQUEwQixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqRSxnQkFBVyxHQUFHLElBQUksVUFBVSxDQUF1QixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQWtHckUsbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1lBQ3JELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUNs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VSxDQUFDO1lBRWxELEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBQyxFQUFDO1lBQ3BDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUM7U0FDOUMsQ0FBQyxDQUFDO1FBQ00saUJBQVksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRXRDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBQyxFQUFDO1lBQ3BDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDO1NBQ3BELENBQUMsQ0FBQztRQUNNLHVCQUFrQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFNUMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFDLEVBQUM7WUFDcEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDakMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2xELENBQUMsQ0FBQztRQUNNLHFCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFMUMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFDLEVBQUM7WUFDcEMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDO1NBQy9CLENBQUMsQ0FBQztRQUNN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QUFjLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUF1OEhELGNBQWM7O1FBR1osS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDcEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBUSxDQUFDO1lBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFDL0IsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFBLEVBQUUsYUFBRixFQUFFLHVCQUFGLEVBQUUsQ0FBRSxJQUFJLDBDQUFFLEtBQUssS0FBSSxFQUFFLEVBQUU7Z0JBQ3JDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQy9ELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2xCO1NBQ0Y7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbi8vaW1wb3J0IHtTY3JlZW59IGZyb20gJy4vc2NyZWVuLmpzJztcbmltcG9ydCB7TXV0YWJsZX0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge01ldGFzY3JlZW4sIFVpZH0gZnJvbSAnLi9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbkRhdGEsIGJvdHRvbUVkZ2UsIGJvdHRvbUVkZ2VIb3VzZSwgY2F2ZSwgZG9vciwgZG93blN0YWlyLFxuICAgICAgICBpY29uLCBsZWZ0RWRnZSwgcmVhZFNjcmVlbixcbiAgICAgICAgcmlnaHRFZGdlLCBzZWFtbGVzc0Rvd24sIHNlYW1sZXNzVXAsIHRvcEVkZ2UsIHVwU3RhaXIsIHdhdGVyZmFsbENhdmUsXG4gICAgICAgfSBmcm9tICcuL21ldGFzY3JlZW5kYXRhLmpzJztcbmltcG9ydCB7TWV0YXRpbGVzZXQsIE1ldGF0aWxlc2V0c30gZnJvbSAnLi9tZXRhdGlsZXNldC5qcyc7XG5pbXBvcnQge1NjcmVlbkZpeCwgd2l0aFJlcXVpcmV9IGZyb20gJy4vc2NyZWVuZml4LmpzJztcblxuLy8gLy8gQkFTSUMgUExBTjogU2NyZWVuIGlzIHRoZSBwaHlzaWNhbCBhcnJheSwgTWV0YXNjcmVlbiBoYXMgdGhlIGV4dHJhIGluZm8uXG4vLyAvLyAgICAgICAgICAgICBPbmx5IE1ldGFzY3JlZW4gaXMgdGllZCB0byBzcGVjaWZpYyAoTWV0YSl0aWxlc2V0cy5cblxuLy8gLyoqXG4vLyAgKiBBZGRzIGEgZmxhZy10b2dnbGFibGUgd2FsbCBpbnRvIGEgbGFieXJpbnRoIHNjcmVlbi5cbi8vICAqIEBwYXJhbSBiaXQgICAgIFVuaXF1ZSBudW1iZXIgZm9yIGVhY2ggY2hvaWNlLiBVc2UgLTEgZm9yIHVuY29uZGl0aW9uYWwuXG4vLyAgKiBAcGFyYW0gdmFyaWFudCAwIG9yIDEgZm9yIGVhY2ggb3B0aW9uLiBVc2UgMCB3aXRoIGJpdD0tMSBmb3IgdW5jb25kaXRpb25hbC5cbi8vICAqIEBwYXJhbSBmbGFnICAgIFBvc2l0aW9uKHMpIG9mIGZsYWcgd2FsbC5cbi8vICAqIEBwYXJhbSB1bmZsYWcgIFBvc2l0aW9uKHMpIG9mIGFuIGV4aXN0aW5nIHdhbGwgdG8gcmVtb3ZlIGNvbXBsZXRlbHkuXG4vLyAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgdGhlIHZhcmlhbnQuXG4vLyAgKi9cbi8vIGZ1bmN0aW9uIGxhYnlyaW50aFZhcmlhbnQocGFyZW50Rm46IChzOiBNZXRhc2NyZWVucykgPT4gTWV0YXNjcmVlbixcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgYml0OiBudW1iZXIsIHZhcmlhbnQ6IDB8MSxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZzogbnVtYmVyfG51bWJlcltdLCB1bmZsYWc/OiBudW1iZXJ8bnVtYmVyW10pIHtcbi8vICAgcmV0dXJuIChzOiBNZXRhc2NyZWVuLCBzZWVkOiBudW1iZXIsIHJvbTogUm9tKTogYm9vbGVhbiA9PiB7XG4vLyAgICAgLy8gY2hlY2sgdmFyaWFudFxuLy8gICAgIGlmICgoKHNlZWQgPj4+IGJpdCkgJiAxKSAhPT0gdmFyaWFudCkgcmV0dXJuIGZhbHNlO1xuLy8gICAgIGNvbnN0IHBhcmVudCA9IHBhcmVudEZuKHJvbS5tZXRhc2NyZWVucyk7XG4vLyAgICAgZm9yIChjb25zdCBwb3Mgb2YgdHlwZW9mIGZsYWcgPT09ICdudW1iZXInID8gW2ZsYWddIDogZmxhZykge1xuLy8gICAgICAgcm9tLnNjcmVlbnNbcy5kYXRhLmlkXS5zZXQyZChwb3MsIFtbMHgxOSwgMHgxOV0sIFsweDFiLCAweDFiXV0pO1xuLy8gICAgIH1cbi8vICAgICBmb3IgKGNvbnN0IHBvcyBvZiB0eXBlb2YgdW5mbGFnID09PSAnbnVtYmVyJyA/IFt1bmZsYWddIDogdW5mbGFnIHx8IFtdKSB7XG4vLyAgICAgICByb20uc2NyZWVuc1tzLmRhdGEuaWRdLnNldDJkKHBvcywgW1sweGM1LCAweGM1XSwgWzB4ZDAsIDB4YzVdXSk7XG4vLyAgICAgfVxuLy8gICAgIGlmIChzLmZsYWcgIT09ICdhbHdheXMnKSB7XG4vLyAgICAgICAvLyBwYXJlbnQgaXMgYSBub3JtYWxseS1vcGVuIHNjcmVlbiBhbmQgd2UncmUgY2xvc2luZyBpdC5cbi8vICAgICAgIHBhcmVudC5mbGFnID0gJ2Fsd2F5cyc7XG4vLyAgICAgfSBlbHNlIGlmICh1bmZsYWcgIT0gbnVsbCkge1xuLy8gICAgICAgLy8gcGFyZW50IGlzIHRoZSBvdGhlciBhbHRlcm5hdGl2ZSAtIGRlbGV0ZSBpdC5cbi8vICAgICAgIHBhcmVudC5yZW1vdmUoKTtcbi8vICAgICB9XG4vLyAgICAgcmV0dXJuIHRydWU7ICAgIFxuLy8gICB9O1xuLy8gfVxuXG4vLyBleHRlbmRzIFNldDxNZXRhc2NyZWVuPiA/Pz9cbmV4cG9ydCBjbGFzcyBNZXRhc2NyZWVucyB7XG5cbiAgcmVhZG9ubHkgW2luZGV4OiBudW1iZXJdOiBNZXRhc2NyZWVuO1xuICByZWFkb25seSBsZW5ndGggPSAwO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc2NyZWVuc0J5Rml4ID0gbmV3IERlZmF1bHRNYXA8U2NyZWVuRml4LCBNZXRhc2NyZWVuW10+KCgpID0+IFtdKTtcbiAgcHJpdmF0ZSByZWFkb25seSBzY3JlZW5zQnlJZCA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgTWV0YXNjcmVlbltdPigoKSA9PiBbXSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzKSB7IC8vIGFkZCBuYW1lc1xuICAgICAgY29uc3QgdmFsID0gdGhpc1trZXldO1xuICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIE1ldGFzY3JlZW4pIHZhbC5uYW1lID0ga2V5O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbWV0YXNjcmVlbihkYXRhOiBNZXRhc2NyZWVuRGF0YSk6IE1ldGFzY3JlZW4ge1xuICAgIGNvbnN0IG11dCA9IHRoaXMgYXMgTXV0YWJsZTx0aGlzPjtcbiAgICBjb25zdCBzY3JlZW4gPSBuZXcgTWV0YXNjcmVlbih0aGlzLnJvbSwgbXV0Lmxlbmd0aCBhcyBVaWQsIGRhdGEpO1xuICAgIG11dFttdXQubGVuZ3RoKytdID0gc2NyZWVuO1xuICAgIHRoaXMuc2NyZWVuc0J5SWQuZ2V0KHNjcmVlbi5zaWQpLnB1c2goc2NyZWVuKTtcbiAgICBmb3IgKGNvbnN0IHRpbGVzZXROYW1lIGluIGRhdGEudGlsZXNldHMpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRpbGVzZXROYW1lIGFzIGtleW9mIE1ldGF0aWxlc2V0cztcbiAgICAgIGNvbnN0IHRpbGVzZXREYXRhID0gZGF0YS50aWxlc2V0c1trZXldITtcbiAgICAgIGlmICh0aWxlc2V0RGF0YS5yZXF1aXJlcykge1xuICAgICAgICBmb3IgKGNvbnN0IGZpeCBvZiB0aWxlc2V0RGF0YS5yZXF1aXJlcykge1xuICAgICAgICAgIHRoaXMuc2NyZWVuc0J5Rml4LmdldChmaXgpLnB1c2goc2NyZWVuKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgKHRoaXMucm9tLm1ldGF0aWxlc2V0c1trZXldIGFzIE1ldGF0aWxlc2V0KS5hZGRTY3JlZW4oc2NyZWVuKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2NyZWVuO1xuICB9XG5cbiAgZ2V0QnlJZChpZDogbnVtYmVyLCB0aWxlc2V0PzogbnVtYmVyKTogTWV0YXNjcmVlbltdIHtcbiAgICBsZXQgb3V0ID0gdGhpcy5zY3JlZW5zQnlJZC5oYXMoaWQpID8gWy4uLnRoaXMuc2NyZWVuc0J5SWQuZ2V0KGlkKV0gOiBbXTtcbiAgICBpZiAodGlsZXNldCAhPSBudWxsKSB7XG4gICAgICBvdXQgPSBvdXQuZmlsdGVyKHMgPT4gcy5pc0NvbXBhdGlibGVXaXRoVGlsZXNldCh0aWxlc2V0KSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICByZWdpc3RlckZpeChmaXg6IFNjcmVlbkZpeCwgc2VlZD86IG51bWJlcikge1xuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuc2NyZWVuc0J5Rml4LmdldChmaXgpKSB7XG4gICAgICAvLyBMb29rIGZvciBhbiB1cGRhdGUgc2NyaXB0IGFuZCBydW4gaXQgZmlyc3QuICBJZiBpdCByZXR1cm5zIGZhbHNlIHRoZW5cbiAgICAgIC8vIGNhbmNlbCB0aGUgb3BlcmF0aW9uIG9uIHRoaXMgc2NyZWVuLlxuICAgICAgY29uc3QgdXBkYXRlID1cbiAgICAgICAgICAoc2NyZWVuLmRhdGEudXBkYXRlIHx8IFtdKS5maW5kKCh1cGRhdGUpID0+IHVwZGF0ZVswXSA9PT0gZml4KTtcbiAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgaWYgKHNlZWQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBTZWVkIHJlcXVpcmVkIGZvciB1cGRhdGVgKTtcbiAgICAgICAgaWYgKCF1cGRhdGVbMV0oc2NyZWVuLCBzZWVkLCB0aGlzLnJvbSkpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gRm9yIGVhY2ggdGlsZXNldCwgcmVtb3ZlIHRoZSByZXF1aXJlbWVudCwgYW5kIGlmIGl0J3MgZW1wdHksIGFkZCB0aGVcbiAgICAgIC8vIHNjcmVlbiB0byB0aGUgdGlsZXNldC5cbiAgICAgIGZvciAoY29uc3QgdGlsZXNldE5hbWUgaW4gc2NyZWVuLmRhdGEudGlsZXNldHMpIHtcbiAgICAgICAgY29uc3Qga2V5ID0gdGlsZXNldE5hbWUgYXMga2V5b2YgTWV0YXRpbGVzZXRzO1xuICAgICAgICBjb25zdCBkYXRhID0gc2NyZWVuLmRhdGEudGlsZXNldHNba2V5XSE7XG4gICAgICAgIGlmICghZGF0YS5yZXF1aXJlcykgY29udGludWU7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gZGF0YS5yZXF1aXJlcy5pbmRleE9mKGZpeCk7XG4gICAgICAgIGlmIChpbmRleCA8IDApIGNvbnRpbnVlO1xuICAgICAgICBkYXRhLnJlcXVpcmVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIGlmICghZGF0YS5yZXF1aXJlcy5sZW5ndGgpIHtcbiAgICAgICAgICAodGhpcy5yb20ubWV0YXRpbGVzZXRzW2tleV0gYXMgTWV0YXRpbGVzZXQpLmFkZFNjcmVlbihzY3JlZW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZSB0aGUgc2NyZWVuIHdob3NlIGN1cnJlbnQgaWQgaXMgYG9sZElkYCB0byBoYXZlIGBuZXdJZGAgYXMgaXRzXG4gICAqIHNjcmVlbiBJRC4gIFVwZGF0ZXMgYWxsIHJlbGV2YW50IGxpbmtzLiAgYG5ld0lkYCBtdXN0IG5vdCBiZSB1c2VkIGJ5XG4gICAqIGFueSBleGlzdGluZyBtZXRhc2NyZWVucy5cbiAgICovXG4gIHJlbnVtYmVyKG9sZElkOiBudW1iZXIsIG5ld0lkOiBudW1iZXIpIHtcbiAgICBjb25zb2xlLmxvZyhgcmVudW1iZXIgJHtvbGRJZH0gLT4gJHtuZXdJZH1gKTtcbiAgICBjb25zdCBkZXN0ID0gdGhpcy5zY3JlZW5zQnlJZC5nZXQobmV3SWQpO1xuICAgIGlmIChkZXN0Lmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKGBJRCBhbHJlYWR5IHVzZWQ6ICR7bmV3SWR9OiAke2Rlc3R9YCk7XG4gICAgbGV0IHNvdXJjZURlZmluaXRpb246IFVpbnQ4QXJyYXl8dW5kZWZpbmVkO1xuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRoaXMuZ2V0QnlJZChvbGRJZCkpIHtcbiAgICAgIGlmIChzY3JlZW4uZGF0YS5kZWZpbml0aW9uKSB7XG4gICAgICAgIHNvdXJjZURlZmluaXRpb24gPSBzY3JlZW4uZGF0YS5kZWZpbml0aW9uO1xuICAgICAgICBzY3JlZW4uZGF0YS5kZWZpbml0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgc2NyZWVuLnVuc2FmZVNldElkKG5ld0lkKTtcbiAgICAgIGRlc3QucHVzaChzY3JlZW4pO1xuICAgIH1cbiAgICB0aGlzLnNjcmVlbnNCeUlkLmRlbGV0ZShvbGRJZCk7XG4gICAgLy8gVE9ETyAtIHNob3VsZCB0aGlzIGJlIGVuY2Fwc3VsYXRlZCBpbiBTY3JlZW5zPyBwcm9iYWJseS4uLlxuICAgIGNvbnN0IG9sZFNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnMuZ2V0U2NyZWVuKG9sZElkKTtcbiAgICBpZiAob2xkSWQgPj0gMCAmJiBuZXdJZCA8IDApIHsgLy8gYmFjayB1cCB0aGUgb2xkIHNjcmVlblxuICAgICAgZGVzdFswXS5kYXRhLmRlZmluaXRpb24gPSBVaW50OEFycmF5LmZyb20ob2xkU2NyZWVuLnRpbGVzKTtcbiAgICB9XG4gICAgY29uc3QgY2xvbmUgPSBvbGRTY3JlZW4uY2xvbmUobmV3SWQpO1xuICAgIHRoaXMucm9tLnNjcmVlbnMuc2V0U2NyZWVuKG5ld0lkLCBjbG9uZSk7XG4gICAgb2xkU2NyZWVuLnVzZWQgPSBmYWxzZTtcbiAgICBpZiAob2xkSWQgPCAwKSB7XG4gICAgICB0aGlzLnJvbS5zY3JlZW5zLmRlbGV0ZVNjcmVlbihvbGRJZCk7XG4gICAgICBpZiAoc291cmNlRGVmaW5pdGlvbiAmJiBuZXdJZCA+PSAwKSB7XG4gICAgICAgIGNsb25lLnRpbGVzID0gQXJyYXkuZnJvbShzb3VyY2VEZWZpbml0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5yb20ubG9jYXRpb25zLnJlbnVtYmVyU2NyZWVuKG9sZElkLCBuZXdJZCk7XG4gIH1cblxuICByZWFkb25seSBvdmVyd29ybGRFbXB0eSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8ICAgfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgLy8gYm91bmRhcnlXX3RyZWVzOiA/Pz9cbiAgcmVhZG9ubHkgYm91bmRhcnlXX3RyZWVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4paMXnxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZTogJyBvb3wgb298IG9vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3NdfSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYVRyZWVzXX19LFxuICAgIGVkZ2VzOiAnPiA+bycsIC8vIG8gPSBvcGVuXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeVcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDAyLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paMIHxcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlOiAnIG9vfCBvb3wgb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPiA+bycsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeUVfcm9ja3MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDAzLFxuICAgIGljb246IGljb25gXG4gICAgICB8LuKWkOKWiHxcbiAgICAgIHwg4paQ4paIfFxuICAgICAgfC7ilpDiloh8YCxcbiAgICB0aWxlOiAnb28gfG9vIHxvbyAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3NdfX0sXG4gICAgZWRnZXM6ICc8bzwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paQ4paIfFxuICAgICAgfCDilpDiloh8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGU6ICdvbyB8b28gfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc8bzwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGxvbmdHcmFzc1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDA1LFxuICAgIGljb246IGljb25gXG4gICAgICB8dnYgfFxuICAgICAgfCB2dnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb2xvfG9vb3wgICAnLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZ3Jhc3M6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5HcmFzc0xvbmdHcmFzc119fSxcbiAgICBlZGdlczogJ2xvb28nLCAvLyBsID0gbG9uZyBncmFzc1xuICB9KTtcbiAgcmVhZG9ubHkgbG9uZ0dyYXNzTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IHZ2fFxuICAgICAgfHZ2IHxgLFxuICAgIHRpbGU6ICcgICB8b29vfG9sbycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge30sXG4gICAgICAgICAgICAgICBncmFzczoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzXX19LFxuICAgIGVkZ2VzOiAnb29sbycsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeVNfcm9ja3MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDA3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IC4gfFxuICAgICAgfOKWhOKWhOKWhHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnb29vfG9vb3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3NdfX0sXG4gICAgZWRnZXM6ICdvXiBeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGZvcnRyZXNzVG93bkVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHsgLy8gZ29hXG4gICAgaWQ6IDB4MDgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4oip4paIfFxuICAgICAgfCAgIHxgLFxuICAgIC8vIFRPRE8gLSBlbnRyYW5jZSFcbiAgICAvLyBUT0RPIC0gcmlnaHQgZWRnZSB3YW50cyB0b3AtaGFsZiBtb3VudGFpbjsgbGVmdCBlZGdlIHRvcCBjYW4gaGF2ZVxuICAgIC8vICAgICAgICBhbnkgdG9wIGhhbGYgKGJvdHRvbSBoYWxmIHBsYWluKSwgdG9wIGVkZ2UgY2FuIGhhdmUgYW55XG4gICAgLy8gICAgICAgIGxlZnQtaGFsZiAocmlnaHQtaGFsZiBtb3VudGFpbilcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6IFsnICAgfG9Gb3xvb28nLCAnb28gfG9Gb3xvb28nXSxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgZWRnZXM6ICcgdm92JyxcbiAgICBleGl0czogW3suLi51cFN0YWlyKDB4YTYsIDMpLCB0eXBlOiAnZm9ydHJlc3MnfV0sXG4gIH0pO1xuICByZWFkb25seSBiZW5kU0VfbG9uZ0dyYXNzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwOSxcbiAgICBpY29uOiBpY29uYOKWl1xuICAgICAgfCB2IHxcbiAgICAgIHx2duKWhHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZTogJ29vb3xvb298b28gJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJ29vPF4nLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFdfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7IC8vIG5lYXIgc2FoYXJhLCBmb2cgbGFtcFxuICAgIGlkOiAweDBhLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfCAg4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6IFsnICAgfG88IHwgICAnLCAnICAgfHg8IHwgICAnXSxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnIG4gICcsIC8vIG4gPSBuYXJyb3dcbiAgICBleGl0czogW2NhdmUoMHg0OCksIGxlZnRFZGdlKHt0b3A6IDZ9KV0sXG4gIH0pO1xuICByZWFkb25seSBiZW5kTkVfZ3Jhc3NSb2NrcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGIsXG4gICAgaWNvbjogaWNvbmDilp1cbiAgICAgIHwu4paQ4paIfFxuICAgICAgfCAg4paAfFxuICAgICAgfDs7O3xgLFxuICAgIHRpbGU6ICdvbyB8b29vfG9nbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlJpdmVyU2hvcnRHcmFzc119LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0U2hvcnRHcmFzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkRlc2VydFJvY2tzXX19LFxuICAgIGVkZ2VzOiAnPG9zdicsIC8vIHMgPSBzaG9ydCBncmFzc1xuICB9KTtcbiAgcmVhZG9ubHkgY29ybmVyTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDBjLFxuICAgIGljb246IGljb25g4pabXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiCDiloB8XG4gICAgICB84paI4paMIHxgLFxuICAgIHRpbGU6ICcgICB8IG9vfCBvbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICcgID52JyxcbiAgfSk7XG4gIC8vIE5PVEU6IHRoaXMgdmVyc2lvbiBoYXMgc2xpZ2h0bHkgbmljZXIgbW91bnRhaW5zIGluIHNvbWUgY2FzZXMuXG4gIHJlYWRvbmx5IG92ZXJ3b3JsZEVtcHR5X2FsdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eScsICdtYW51YWwnXSxcbiAgICBlZGdlczogJyAgICAnLFxuICAgIG1hdGNoOiAoKSA9PiBmYWxzZSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGQsXG4gICAgaWNvbjogaWNvbmDilpxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paA4paI4paIfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlOiAnICAgfG9vIHxvbyAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnIHY8ICcsXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJTVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGUsXG4gICAgaWNvbjogaWNvbmDilplcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKWiOKWhHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnIG9vfCBvb3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPiAgXicsXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGYsXG4gICAgaWNvbjogaWNvbmDilp9cbiAgICAgIHwg4paQ4paIfFxuICAgICAgfOKWhOKWiOKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnb28gfG9vIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPF4gICcsXG4gIH0pO1xuICByZWFkb25seSBleGl0RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTAsXG4gICAgaWNvbjogaWNvbmDilbZcbiAgICAgIHwg4paQ4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZTogWydvbyB8b29vfG9vICcsICdvbyB8b294fG9vICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119fSxcbiAgICBlZGdlczogJzxvPG4nLFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDZ9KV0sXG4gICAgLy8gVE9ETyAtIGVkZ2VcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5Tl90cmVlcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paA4paA4paAfFxuICAgICAgfCBeIHxgLFxuICAgIHRpbGU6ICcgICB8b29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgZGVzZXJ0OiB7fSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYVRyZWVzXX19LFxuICAgIGVkZ2VzOiAnIHZvdicsXG4gIH0pO1xuICByZWFkb25seSBicmlkZ2VUb1BvcnRvYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTIsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilZAgIHxcbiAgICAgIHzilZ7ilZDilZB8XG4gICAgICB84pSCICB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICdyb298MXJyfCBvbycsIC8vIFRPRE86IGNoZWNrIHRoaXMhXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIC8vIFRPRE8gLSB0aGlzIGlzIHN1cGVyIGN1c3RvbSwgbm8gZWRnZXMgZm9yIGl0P1xuICAgIC8vIEl0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmcsIGF0IGxlYXN0LlxuICAgIGZlYXR1cmU6IFsncG9ydG9hMyddLFxuICAgIGVkZ2VzOiAnMio+cicsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiAxfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2xvcGVBYm92ZVBvcnRvYSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojihpPiloh8XG4gICAgICB84paI4oaT4paAfFxuICAgICAgfOKUgiAgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnIOKGkyB8IG9vfHJvbycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsncG9ydG9hMiddLFxuICAgIGVkZ2VzOiAnMSoydicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckJlbmRTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHx3ICB8XG4gICAgICB8IOKVlOKVkHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGU6ICdvb298b3JyfG9ybycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAnb29ycicsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeVdfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKIqSB8XG4gICAgICB84paI4paMIHxgLFxuICAgIHRpbGU6ICcgb298IDxvfCBvbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgZGVzZXJ0OiB7fSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYUNhdmVFbnRyYW5jZV19fSxcbiAgICBlZGdlczogJz4gPm8nLFxuICAgIGV4aXRzOiBbY2F2ZSgweDg5KV0sXG4gIH0pO1xuICByZWFkb25seSBleGl0TiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTYsXG4gICAgaWNvbjogaWNvbmDilbVcbiAgICAgIHzilogg4paIfFxuICAgICAgfOKWgCDiloB8XG4gICAgICB8IF4gfGAsXG4gICAgdGlsZTogWycgbyB8b29vfG9vbycsICcgeCB8b29vfG9vbyddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge319LCAvLyBzZWEgaGFzIG5vIG5lZWQgZm9yIGV4aXRzP1xuICAgIGVkZ2VzOiAnbnZvdicsXG4gICAgZXhpdHM6IFt0b3BFZGdlKCldLFxuICAgIC8vIFRPRE8gLSBlZGdlXG4gIH0pO1xuICByZWFkb25seSByaXZlcldFX3dvb2RlbkJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTcsXG4gICAgaWNvbjogaWNvbmDilZBcbiAgICAgIHwgICB8XG4gICAgICB84pWQ4pWR4pWQfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvb298cm9yfG9vbycsIC8vIFRPRE8gLSBzaG91bGQgdGhlIG1pZGRsZSBiZSAnYic/XG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAnb3JvcicsXG4gICAgZXhpdHM6IFtzZWFtbGVzc1VwKDB4NzcpLCBzZWFtbGVzc0Rvd24oMHg4NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCb3VuZGFyeUVfd2F0ZXJmYWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxOCxcbiAgICBpY29uOiBpY29uYOKVoVxuICAgICAgfCDilpDiloh8XG4gICAgICB84pWQ4pWQL3xcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZTogJ29vIHxyciB8b28gJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICc8cjwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5RV9jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpDiloh8XG4gICAgICB8duKIqeKWiHxcbiAgICAgIHx24paQ4paIfGAsXG4gICAgdGlsZTogJ29vIHxvPCB8b28gJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGdyYXNzOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NdfSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydExvbmdHcmFzc119fSxcbiAgICBlZGdlczogJzxvPCAnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU4KV0sXG4gIH0pO1xuICByZWFkb25seSBleGl0V19zb3V0aHdlc3QgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDFhLFxuICAgIGljb246IGljb25g4pW0XG4gICAgICB84paI4paMIHxcbiAgICAgIHziloAg4paEfFxuICAgICAgfOKWhOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgb298Qm9vfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX0sXG4gICAgICAgICAgICAgICAvLyBTZWEgaGFzIG5vIG5lZWQgZm9yIHRoaXMgc2NyZWVuPyAgR28gdG8gc29tZSBvdGhlciBiZWFjaD9cbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYVJvY2tzXX19LFxuICAgIC8vIE5PVEU6IHRoZSBlZGdlIGlzIG5vdCAnbicgYmVjYXVzZSBpdCdzIG9mZi1jZW50ZXIuXG4gICAgZWRnZXM6ICc+KiBeJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDB4Yn0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG5hZGFyZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWIsXG4gICAgLy9pY29uOiAnPycsXG4gICAgLy9taWdyYXRlZDogMHgyMDAwLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBkb29yKDB4MjMpLFxuICAgICAgICAgICAgZG9vcigweDI1LCAnZG9vcjInKSwgZG9vcigweDJhLCAnZG9vcjMnKV0sXG4gIH0pO1xuICByZWFkb25seSB0b3duRXhpdFcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDFjLFxuICAgIGljb246IGljb25g4pW0XG4gICAgICB84paI4paMIHxcbiAgICAgIHziloAgXnxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZTogJyBvb3w4b298IG9vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9fSxcbiAgICBlZGdlczogJz5uPm8nLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogOCwgaGVpZ2h0OiAzLCBzaGlmdDogLTAuNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxZCxcbiAgICBpY29uOiBpY29uYCB8XG4gICAgICB8Ozs7fFxuICAgICAgfCB2IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb2dvfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5SaXZlclNob3J0R3Jhc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzUmVtYXBwaW5nXX19LFxuICAgIGVkZ2VzOiAnc29vbycsXG4gIH0pO1xuICByZWFkb25seSB0b3duRXhpdFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDFlLFxuICAgIGljb246IGljb25g4pW3XG4gICAgICB8IF4gfFxuICAgICAgfOKWhCDiloR8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGU6IFsnb29vfG9vb3wgbyAnLCAnb29vfG9vb3wgeCAnXSxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRUb3duRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICdvXm5eJyxcbiAgICBleGl0czogW2JvdHRvbUVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FuR2F0ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWYsXG4gICAgLy9pY29uOiAnPycsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7fX0sXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiAzfSksIHJpZ2h0RWRnZSh7dG9wOiA5fSldLFxuICAgIGZsYWc6ICdjdXN0b206ZmFsc2UnLFxuICB9KTsgXG5cbiAgcmVhZG9ubHkgcml2ZXJCcmFuY2hOU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDIwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB8IOKVoOKVkHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGU6ICdvcm98b3JyfG9ybycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAncm9ycicsXG4gIH0pO1xuICByZWFkb25seSByaXZlcldFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilZDilZDilZB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3xycnJ8b29vJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdvcm9yJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQm91bmRhcnlTX3dhdGVyZmFsbCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjIsXG4gICAgaWNvbjogaWNvbmDilahcbiAgICAgIHwg4pWRIHxcbiAgICAgIHziloTilZHiloR8XG4gICAgICB84paIL+KWiHxgLFxuICAgIHRpbGU6ICdvcm98b3JvfCAgICcsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAncl4gXicsXG4gIH0pO1xuICByZWFkb25seSBzaG9ydEdyYXNzU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDIzLFxuICAgIGljb246IGljb25gXG4gICAgICB8Ozs7fFxuICAgICAgfDsgIHxcbiAgICAgIHw7IF58YCxcbiAgICB0aWxlOiAnb2dvfGdvb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICBlZGdlczogJ3Nzb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hvcnRHcmFzc05FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNCxcbiAgICBpY29uOiBpY29uYCB8XG4gICAgICB8OyAgfFxuICAgICAgfDt2IHxcbiAgICAgIHw7Ozt8YCxcbiAgICB0aWxlOiAnb29vfGdvb3xvZ28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICBlZGdlczogJ29zc28nLFxuICB9KTtcbiAgcmVhZG9ubHkgc3RvbUhvdXNlT3V0c2lkZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjUsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paM4oip4paQfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6IFsnICAgfCBIIHwgbyAnLCAnICAgfCBIIHwgeCAnXSxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fX0sXG4gICAgLy8gTk9URTogYm90dG9tIGVkZ2UgZW50cmFuY2UgaXMgY2xldmVybHkgc2hpZnRlZCB0byBhbGlnbiB3aXRoIHRoZSBkb29yLlxuICAgIGV4aXRzOiBbZG9vcigweDY4KSwgYm90dG9tRWRnZSh7c2hpZnQ6IDAuNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmROV190cmVlcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjYsXG4gICAgaWNvbjogaWNvbmDilphcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWgCBefFxuICAgICAgfCBeXnxgLFxuICAgIHRpbGU6ICcgb298b29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguRGVzZXJ0VHJlZXNdfSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYVJvY2tzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguU2VhVHJlZXNdfX0sXG4gICAgZWRnZXM6ICc+dm9vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NTVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHw7Ozt8XG4gICAgICB8ICA7fFxuICAgICAgfF4gO3xgLFxuICAgIHRpbGU6ICdvZ298b29nfG9vbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlJpdmVyU2hvcnRHcmFzc119fSxcbiAgICBlZGdlczogJ3Nvb3MnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCcmFuY2hOV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDI4LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB84pWQ4pWjIHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGU6ICdvcm98cnJvfG9ybycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAncnJybycsXG4gIH0pO1xuICByZWFkb25seSBzaG9ydEdyYXNzTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDI5LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICA7fFxuICAgICAgfCB2O3xcbiAgICAgIHw7Ozt8YCxcbiAgICB0aWxlOiAnb29vfG9vZ3xvZ28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LFxuICAgICAgICAgICAgICAgcml2ZXI6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5SaXZlclNob3J0R3Jhc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzUmVtYXBwaW5nXX19LFxuICAgIGVkZ2VzOiAnb29zcycsXG4gIH0pO1xuICByZWFkb25seSB2YWxsZXlCcmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDJhLFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHzilpvilZHilpx8XG4gICAgICB8IOKVkSB8XG4gICAgICB84paZ4pWR4paffGAsXG4gICAgdGlsZTogWycgbyB8IG8gfCBvICcsICcgeCB8IG8gfCBvICcsICcgbyB8IG8gfCB4ICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge319LFxuICAgIGVkZ2VzOiAnbiBuICcsXG4gICAgZXhpdHM6IFtzZWFtbGVzc1VwKDB4NzcpLCBzZWFtbGVzc0Rvd24oMHg4NyksIHRvcEVkZ2UoKSwgYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXRTX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDJiLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWjCDilpB8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGU6IFsnICAgfCA8IHwgbyAnLCAnICAgfCA8IHwgeCAnXSxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgLy8gTm90IHBhcnRpY3VsYXJseSB1c2VmdWwgc2luY2Ugbm8gY29ubmVjdG9yIG9uIHNvdXRoIGVuZD9cbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYUNhdmVFbnRyYW5jZV19fSxcbiAgICBlZGdlczogJyAgbiAnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDY3KSwgYm90dG9tRWRnZSgpXVxuICB9KTtcbiAgcmVhZG9ubHkgb3V0c2lkZVdpbmRtaWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyYyxcbiAgICBpY29uOiBpY29uYOKVs1xuICAgICAgfOKWiOKWiOKVs3xcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogWycgICB8IFcgfCBvICcsICcgICB8IFcgfCB4ICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICAvLyBUT0RPIC0gYW5ub3RhdGUgMyBleGl0cywgc3Bhd24gZm9yIHdpbmRtaWxsIGJsYWRlXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gICAgZmVhdHVyZTogWyd3aW5kbWlsbCddLFxuICAgIGVkZ2VzOiAnICBuICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NjMpLCBib3R0b21FZGdlKCksIGRvb3IoMHg4OSwgJ3dpbmRtaWxsJyksIGRvb3IoMHg4YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93bkV4aXRXX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oeyAvLyBvdXRzaWRlIGxlYWZcbiAgICAvLyAoVE9ETyAtIGNvbnNpZGVyIGp1c3QgZGVsZXRpbmcsIHJlcGxhY2Ugd2l0aCAkMGEpLlxuICAgIGlkOiAweDJkLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWhOKWhOKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfHg8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSwgLy8gY2F2ZSBlbnRyYW5jZSBicmVha3Mgcml2ZXIgYW5kIG90aGVycy4uLlxuICAgIGVkZ2VzOiAnIG4gICcsXG4gICAgLy8gTk9URTogc3BlY2lhbCBjYXNlIHRoZSBvZGQgZW50cmFuY2UvZXhpdCBoZXJlIChzaG91bGQgYmUgNGEpXG4gICAgZXhpdHM6IFtjYXZlKDB4NGEpLCBsZWZ0RWRnZSh7dG9wOiA1LCBoZWlnaHQ6IDMsIHNoaWZ0OiAtMC41fSldLFxuICAgIGZsYWc6ICdjdXN0b206dHJ1ZScsXG4gIH0pO1xuICByZWFkb25seSByaXZlck5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilZEgfFxuICAgICAgfCDilZEgfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZTogJ29yb3xvb298b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdyb3JvJyxcbiAgICBtb2Q6ICdicmlkZ2UnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJOU19icmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDJmLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB8d+KVj3d8XG4gICAgICB8IOKVkSB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtb2QnLFxuICAgIHRpbGU6ICdvcm98b3JvfG9ybycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdyb3JvJyxcbiAgICB3YWxsOiAweDc3LFxuICAgIC8vbW9kOiAnYnJpZGdlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQmVuZFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCB34pacfFxuICAgICAgfOKVkOKVl3d8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlOiAnb28gfHJyb3xvcm8nLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJzxycnYnLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlOX3dhdGVyZmFsbENhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDMxLFxuICAgIGljb246IGljb25gXG4gICAgICB84pabL+KWiHxcbiAgICAgIHzilpjilZHiloB8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlOiAnICAgfG9yb3xvcm8nLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICAvLyBUT0RPIC0gZmxhZyB2ZXJzaW9uIHdpdGhvdXQgZW50cmFuY2U/XG4gICAgLy8gIC0gd2lsbCBuZWVkIGEgdGlsZXNldCBmaXhcbiAgICBlZGdlczogJyB2cnYnLFxuICAgIGV4aXRzOiBbd2F0ZXJmYWxsQ2F2ZSgweDc1KV0sXG4gIH0pO1xuICByZWFkb25seSBvcGVuX3RyZWVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCBeIHxcbiAgICAgIHxeIF58XG4gICAgICB8IF4gfGAsXG4gICAgdGlsZTogJ29vb3xvb298b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0VHJlZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRSb2Nrc119fSxcbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDMzLFxuICAgIGljb246IGljb25g4pW3XG4gICAgICB8IHcgfFxuICAgICAgfOKWhCDiloR8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGU6IFsnb29vfG9vb3wgbyAnLCAnb29vfG9vb3wgeCB8J10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIC8vIE5PVEU6IFRoZXNlIGZpeGVzIGFyZSBub3QgbGlrZWx5IHRvIGV2ZXIgbGFuZC5cbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydE1hcnNoXX0sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFNYXJzaF19fSxcbiAgICBlZGdlczogJ29ebl4nLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmROVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzQsXG4gICAgaWNvbjogaWNvbmDilphcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWgOKWgCB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBvb3xvb298b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJz52b28nLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzNSxcbiAgICBpY29uOiBpY29uYOKWnVxuICAgICAgfCDilpDiloh8XG4gICAgICB8ICDiloB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vIHxvb298b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzxvb3YnLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzNixcbiAgICBpY29uOiBpY29uYOKWl1xuICAgICAgfCAgIHxcbiAgICAgIHwg4paE4paEfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlOiAnb29vfG9vb3xvbyAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnb288XicsXG4gIH0pO1xuICByZWFkb25seSBiZW5kV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDM3LFxuICAgIGljb246IGljb25g4paWXG4gICAgICB8ICAgfFxuICAgICAgfOKWhOKWhCB8XG4gICAgICB84paI4paMIHxgLFxuICAgIHRpbGU6ICdvb298b29vfCBvbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICdvXj5vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyUGxhaW5fdXBTdGFpciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzgsXG4gICAgaWNvbjogaWNvbmDilLRcbiAgICAgIHwg4pSKIHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyB0IHx0dHR8ICAgJyxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICdzdCB0JyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDh9KSwgc2VhbWxlc3NEb3duKDB4MDgsIDIpXSxcbiAgICAvLyBUT0RPIC0gYW5ub3RhdGUgcG9zc2libGUgc3RhaXJ3YXkgdy8gZmxhZz9cbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyUm9ib3REb29yX2Rvd25TdGFpciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzksXG4gICAgaWNvbjogaWNvbmDilKxcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilIDilKzilIB8XG4gICAgICB8IOKUiiB8YCxcbiAgICB0aWxlOiAnICAgfHR0dHwgdCAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0c3QnLFxuICAgIGV4aXRzOiBbc2VhbWxlc3NVcCgweGU4LCAyKSwgc2VhbWxlc3NEb3duKDB4ZjgsIDIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyRHluYURvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNhLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSU4pSs4pSYfFxuICAgICAgfCDilIogfGAsXG4gICAgdGlsZTogJyAgIHwgPCB8IHQgJyxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgIHMgJyxcbiAgICBleGl0czogW2NhdmUoMHg2NywgJ2Rvb3InKV0sXG4gIH0pO1xuICByZWFkb25seSB0b3dlckxvbmdTdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUiiB8XG4gICAgICB8IOKUiiB8XG4gICAgICB8IOKUiiB8YCxcbiAgICB0aWxlOiAnIHQgfCB0IHwgdCAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJ3MgcyAnLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgICAvLyBUT0RPIC0gY29ubmVjdGlvbnNcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyTWVzaWFSb29tID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzYyxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSB0b3dlclRlbGVwb3J0ZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNkLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBjYXZlKDB4NTcsICd0ZWxlcG9ydGVyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgY2F2ZUFib3ZlUG9ydG9hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnICAgfCA8IHwg4oaTICcsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAnICAxICcsXG4gICAgZmVhdHVyZTogWydwb3J0b2ExJ10sXG4gICAgZXhpdHM6IFtjYXZlKDB4NjYpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lck5FX2Zsb3dlcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNmLFxuICAgIGljb246IGljb25g4pacXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWgCriloh8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGU6ICcgICB8b28gfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIC8vIE5PVEU6IGNvdWxkIGV4dGVuZCB0aGlzIHRvIGRlc2VydC9ldGMgYnkgc3dhcHBpbmcgdGhlIDdlLzdmIHRpbGVzXG4gICAgLy8gd2l0aCBlLmcuIGEgd2luZG1pbGwgb3IgY2FzdGxlIHRpbGUgdGhhdCdzIG5vdCB1c2VkIGluIDljLCBidXRcbiAgICAvLyB3ZSBzdGlsbCBkb24ndCBoYXZlIGEgZ29vZCBzcHJpdGUgdG8gdXNlIGZvciBpdC4uLlxuICAgIGVkZ2VzOiAnIHY8ICcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlckVkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQwLFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHwgICB8XG4gICAgICB84pSkIOKUnHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHQgdHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0IHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJFZGdlVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDAsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfCAgIHxcbiAgICAgIHzilKQgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHQgIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0ICAnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJFZGdlRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDAsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgIOKUnHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCAgdHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgIHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJSb2JvdERvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQxLFxuICAgIGljb246IGljb25g4pSAXG4gICAgICB8IE8gfFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHR0dHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0IHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJEb29yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0MixcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHQ8dHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0IHQnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU4KV0sXG4gICAgLy8gVE9ETyAtIGNvbm5lY3Rpb25zXG4gIH0pO1xuICByZWFkb25seSBob3VzZV9iZWRyb29tID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0MyxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzaGVkID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0NCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgY2F2ZSgweDQ5KV0sXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gIH0pO1xuICAvLyBUT0RPIC0gc2VwYXJhdGUgbWV0YXNjcmVlbiBmb3Igc2hlZFdpdGhIaWRkZW5Eb29yXG4gIHJlYWRvbmx5IHRhdmVybiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDUsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfdHdvQmVkcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDYsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgdGhyb25lUm9vbV9hbWF6b25lcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDcsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIC8vIFRPRE8gLSBuZWVkIHRvIGZpeCB0aGUgc2luZ2xlLXdpZHRoIHN0YWlyIVxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHt3aWR0aDogM30pLCBkb3duU3RhaXIoMHg0YywgMSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfcnVpbmVkVXBzdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQ4LFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBkb3duU3RhaXIoMHg5YywgMSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfcnVpbmVkRG93bnN0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDksXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDU2LCAxKV0sXG4gIH0pO1xuICByZWFkb25seSBmb3llciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGEsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHtzaGlmdDogMC41fSksXG4gICAgICAgICAgICBkb29yKDB4MjgpLCBkb29yKDB4NTMsICdkb29yMicpLCBkb29yKDB4NWMsICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRocm9uZVJvb21fcG9ydG9hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0YixcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgZG9vcigweDJiKV0sXG4gIH0pO1xuICByZWFkb25seSBmb3J0dW5lVGVsbGVyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0YyxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgZG9vcigweDU2KSwgZG9vcigweDU5LCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBiYWNrUm9vbSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGQsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZG9qbyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGUsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIC8vIEVkZ2UgZW50cmFuY2Ugc2hpZnRlZCB0byBwcm9wZXJseSBsaW5lIHVwIGF0IHN0YXJ0IG9mIHN0b20gZmlnaHQuXG4gICAgLy8gKG5vdGUgdGhhdCB0aGlzIGNhdXNlcyB1cyB0byBzaGlmdCBhbGwgb3RoZXIgdXNlcyBhcyB3ZWxsKS5cbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSh7c2hpZnQ6IC0wLjV9KV0sXG4gIH0pO1xuICByZWFkb25seSB3aW5kbWlsbEluc2lkZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGYsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHtsZWZ0OiA5LCB3aWR0aDogMX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvcml6b250YWxUb3duTWlkZGxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBicnlubWFlciArIHN3YW4gKFRPRE8gLSBzcGxpdCBzbyB3ZSBjYW4gbW92ZSBleGl0cylcbiAgICBpZDogMHg1MCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt9fSxcbiAgICBleGl0czogW2Rvb3IoMHg0YyksIGRvb3IoMHg1NSwgJ2Rvb3IyJyldLFxuICAgIHRhbGxIb3VzZXM6IFsweDM1XSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyeW5tYWVyUmlnaHRfZXhpdEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGJyeW5tYWVyXG4gICAgaWQ6IDB4NTEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogOH0pLCBkb29yKDB4NDEpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyeW5tYWVyTGVmdF9kZWFkRW5kID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBicnlubWFlclxuICAgIGlkOiAweDUyLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDQ5KSwgZG9vcigweDRjLCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FuTGVmdF9leGl0VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc3dhblxuICAgIGlkOiAweDUzLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogOX0pLCBkb29yKDB4NDkpLCBkb29yKDB4NWUsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW5SaWdodF9leGl0UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc3dhblxuICAgIGlkOiAweDU0LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogM30pLCBkb29yKDB4NDEpLFxuICAgICAgICAgICAgZG9vcigweDQzLCAnZG9vcjInKSwgZG9vcigweDU3LCAnZG9vcjMnKV0sXG4gIH0pO1xuICByZWFkb25seSBob3Jpem9udGFsVG93bkxlZnRfZXhpdE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHNhaGFyYSwgYW1hem9uZXMgKFRPRE8gLSBzcGxpdCBzbyB3ZSBjYW4gbW92ZSBleGl0cylcbiAgICBpZDogMHg1NSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnaG9yaXpvbnRhbCd9fSxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDB4ZH0pLCBkb29yKDB4NDYpLCBkb29yKDB4NGIsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGFtYXpvbmVzUmlnaHRfZGVhZEVuZCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gYW1hem9uZXNcbiAgICBpZDogMHg1NixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnaG9yaXpvbnRhbCd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg0MCksIGRvb3IoMHg1OCwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2FoYXJhUmlnaHRfZXhpdEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHNhaGFyYVxuICAgIGlkOiAweDU3LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDd9KSwgZG9vcigweDQwKSwgZG9vcigweDY2LCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NTgsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2NhdmUoMHg0NywgJ2ZvcnRyZXNzJyksIGJvdHRvbUVkZ2UoKV0sIC8vIGJvdHRvbSBqdXN0IGluIGNhc2U/XG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NTksXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg2MyksIGRvb3IoMHg4YSwgJ2Rvb3IyJyksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDMsIHdpZHRoOiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgcG9ydG9hU1dfZXhpdFcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHBvcnRvYVxuICAgIGlkOiAweDVhLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA5fSksIGRvb3IoMHg4NiksIHRvcEVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FTRV9leGl0RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NWIsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA5fSksIGRvb3IoMHg3YSksIGRvb3IoMHg4NywgJ2Rvb3IyJyldLFxuICAgIHRhbGxIb3VzZXM6IFsweDVhXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGR5bmEgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDVjLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICAvLyBOT1RFOiBub3QgcmVhbGx5IGEgZ29vZCBleGl0IHR5cGUgZm9yIHRoaXMuLi5cbiAgICBleGl0czogW3t0eXBlOiAnc3RhaXI6ZG93bicsIG1hbnVhbDogdHJ1ZSwgZGlyOiAyLFxuICAgICAgICAgICAgIGVudHJhbmNlOiAweGJmODAsIGV4aXRzOiBbXX1dLFxuICB9KTtcbiAgcmVhZG9ubHkgcG9ydG9hRmlzaGVybWFuID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1ZCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDZ9KSxcbiAgICAgICAgICAgIGxlZnRFZGdlKHt0b3A6IDQsIGhlaWdodDogNiwgc2hpZnQ6IDAuNX0pLFxuICAgICAgICAgICAgZG9vcigweDY4KV0sXG4gIH0pO1xuICByZWFkb25seSB2ZXJ0aWNhbFRvd25Ub3BfZm9ydHJlc3MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHNoeXJvbiwgem9tYmllIHRvd24gKHByb2JhYmx5IG5vdCB3b3J0aCBzcGxpdHRpbmcgdGhpcyBvbmUpXG4gICAgaWQ6IDB4NWUsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbY2F2ZSgweDQ3LCAnZm9ydHJlc3MnKSwgYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNoeXJvbk1pZGRsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2h5cm9uXG4gICAgaWQ6IDB4NWYsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDU0KSwgZG9vcigweDViLCAnZG9vcjInKSwgdG9wRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNoeXJvbkJvdHRvbV9leGl0UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2h5cm9uXG4gICAgaWQ6IDB4NjAsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3ZlcnRpY2FsJ319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogM30pLCBkb29yKDB4MDQpLFxuICAgICAgICAgICAgZG9vcigweDA2LCAnZG9vcjInKSwgZG9vcigweDk5LCAnZG9vcjMnKV0sXG4gIH0pO1xuICByZWFkb25seSB6b21iaWVUb3duTWlkZGxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyB6b21iaWUgdG93blxuICAgIGlkOiAweDYxLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICd2ZXJ0aWNhbCd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg5OSksIHRvcEVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSB6b21iaWVUb3duQm90dG9tX2NhdmVFeGl0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyB6b21iaWUgdG93blxuICAgIGlkOiAweDYyLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICd2ZXJ0aWNhbCd9fSxcbiAgICBleGl0czogW2NhdmUoMHg5MiksIGRvb3IoMHgyMyksIGRvb3IoMHg0ZCwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbGVhZk5XX2hvdXNlU2hlZCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gbGVhZlxuICAgIGlkOiAweDYzLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4OGMpLCBkb29yKDB4OTUsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNxdWFyZVRvd25ORV9ob3VzZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gbGVhZiwgZ29hIChUT0RPIC0gc3BsaXQpXG4gICAgaWQ6IDB4NjQsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDF9KSwgZG9vcigweGI3KV0sXG4gIH0pO1xuICByZWFkb25seSBsZWFmU1dfc2hvcHMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGxlYWZcbiAgICBpZDogMHg2NSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDc3KSwgZG9vcigweDhhLCAnZG9vcjInKV0sXG4gICAgdGFsbEhvdXNlczogWzB4NmFdLFxuICB9KTtcbiAgcmVhZG9ubHkgbGVhZlNFX2V4aXRFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBsZWFmXG4gICAgaWQ6IDB4NjYsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiAzLCBoZWlnaHQ6IDMsIHNoaWZ0OiAtMC41fSksIGRvb3IoMHg4NCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hTldfdGF2ZXJuID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBnb2FcbiAgICBpZDogMHg2NyxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweGJhKV0sXG4gIH0pO1xuICByZWFkb25seSBzcXVhcmVUb3duU1dfZXhpdFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGdvYSwgam9lbCAoVE9ETyAtIHNwbGl0KVxuICAgIGlkOiAweDY4LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiA4fSksIGRvb3IoMHg4NCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hU0Vfc2hvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gZ29hXG4gICAgaWQ6IDB4NjksXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg4MildLFxuICB9KTtcbiAgcmVhZG9ubHkgam9lbE5FX3Nob3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGpvZWxcbiAgICBpZDogMHg2YSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweGE3KV0sXG4gIH0pO1xuICByZWFkb25seSBqb2VsU0VfbGFrZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gam9lbFxuICAgIGlkOiAweDZiLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gIH0pO1xuICByZWFkb25seSBvYWtOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gb2FrXG4gICAgaWQ6IDB4NmMsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHhlNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2FrTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIG9ha1xuICAgIGlkOiAweDZkLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NjApXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9ha1NXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBvYWtcbiAgICBpZDogMHg2ZSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDdjKV0sXG4gIH0pO1xuICByZWFkb25seSBvYWtTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gb2FrXG4gICAgaWQ6IDB4NmYsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICAvLyBFZGdlIGVudHJhbmNlIHNoaWZ0ZWQgZm9yIGNoaWxkIGFuaW1hdGlvblxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogMCwgc2hpZnQ6IDAuNX0pLCBkb29yKDB4OTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRlbXBsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2h5cm9uXG4gICAgaWQ6IDB4NzAsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZURlYWRFbmROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfCA+IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIHcgfCA+IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3cgICAnLFxuICAgIGNvbm5lY3Q6ICcyJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweGM3KV0sXG4gICAgc3RhdHVlczogWzRdLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZURlYWRFbmROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKVteKUg+KVtXxcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyB3IHwgPiB8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyAgICcsXG4gICAgY29ubmVjdDogJzF8Mnh8MycsXG4gICAgZXhpdHM6IFtkb3duU3RhaXIoMHhjNyldLFxuICAgIHN0YXR1ZXM6IFs0XSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlOiAnIHcgfCB3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgc3RhdHVlczogWzEsIDcsIDB4ZF0sXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHzilILilIPilIJ8XG4gICAgICB84pSC4pSD4pSCfGAsXG4gICAgdGlsZTogJyB3IHwgdyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzE5fDJhfDNiJyxcbiAgICBzdGF0dWVzOiBbMSwgNywgMHhkXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfYmxvY2tlZFJpZ2h0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHzilILilIMgfFxuICAgICAgfOKUguKUg+KUgnxgLFxuICAgIHBsYWNlbWVudDogJ21vZCcsXG4gICAgdGlsZTogJyB3IHwgdyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDlkXX19LFxuICAgIC8vIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgLy8gICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsTlMsIDAsIDAsIDB4OWQpXV0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTl8MmF8M3xiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfCDilIPilIJ8XG4gICAgICB84pSC4pSD4pSCfGAsXG4gICAgcGxhY2VtZW50OiAnbW9kJyxcbiAgICB0aWxlOiAnIHcgfCB3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4NTFdfX0sXG4gICAgLy8gdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAvLyAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOUywgMCwgMSwgMHg1MSldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxfDl8MmF8M2InLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUFyZW5hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MyxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHzilbs84pW7fFxuICAgICAgfOKUoeKUgeKUqXxcbiAgICAgIHzilILilbvilIJ8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgICB8IDwgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnOWJ8YScsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4MzcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGxpbWVUcmVlTGFrZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzQsXG4gICAgdGlsZXNldHM6IHtsaW1lOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgY2F2ZSgweDQ3KV0sXG4gICAgZmVhdHVyZTogWydicmlkZ2UnXSwgLy8gVE9ETyAtIGxha2U/XG4gICAgd2FsbDogMHg2NyxcbiAgfSk7XG4gIC8vIFN3YW1wIHNjcmVlbnNcbiAgcmVhZG9ubHkgc3dhbXBOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilJggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2MgfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIC8vIFRPRE8gLSBkbyB3ZSBhY3R1YWxseSB3YW50IHRvIHB1dCBhbGwgdGhlc2UgZWRnZXMgaW4/XG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnc3MgICcsXG4gICAgY29ubmVjdDogJzI2JyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICBsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSldLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbbilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHwgY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnICAgcycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbXSxcbiAgICBwb2k6IFtbMF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBFX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc2LFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB8IOKVtuKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCA8Y3wgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyAgIHMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2NhdmUoMHg1YywgJ3N3YW1wJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBOV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3NyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUvOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2NjfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3Nzc3MnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICBsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogNCwgc2hpZnQ6IC0wLjV9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5XUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilKQgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHxjYyB8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnc3NzICcsXG4gICAgY29ubmVjdDogJzI2YScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pLFxuICAgICAgICAgICAgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3OSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHwgY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAncyAgcycsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICByaWdodEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pXSxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8Y2NjfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzc3MnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pLFxuICAgICAgICAgICAgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIHJpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXU0VfZG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2EsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilIDilKzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnICAgfGM8Y3wgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzc3MnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICAgIC8vIE5PVEU6IGRvb3Igc2NyZWVucyBzaG91bGQgbm90IGJlIG9uIGFuIGV4aXQgZWRnZSFcbiAgICBleGl0czogW2NhdmUoMHg1NiwgJ3N3YW1wJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3YixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilbQgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8Y2MgfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBwb2k6IFtbMF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdiLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSA4pW0IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfGM8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW2NhdmUoMHg1NCwgJ3N3YW1wJyldLFxuICAgIC8vIFRPRE8gLSBmbGFnZ2FibGVcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wQXJlbmEgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdjLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUl+KUr+KUm3xcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8IGEgfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJyAgcyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICAvLyBGb3IgbGVmdC9yaWdodCBuZWlnaGJvcnMsIG9ubHkgYWxsb3cgZWRnZSBvciBlbXB0eS5cbiAgICAvLyBUT0RPIC0gY2hlY2sgdGhhdCB0aGlzIGlzIHN0aWxsIHRoZSBjYXNlLlxuXG4gICAgLy8gTk9URTogbm8gZWRnZSBleGl0IHNpbmNlIHdlIGRvbid0IHdhbnQgdG8gZ28gc3RyYWlnaHQgaGVyZS4uLlxuICAgIC8vIFRPRE8gLSBjb25zdHJhaW50IHRoYXQgd2UgcHV0IHNvbGlkcyBvbiBlaXRoZXIgc2lkZT9cbiAgICAvLyBUT0RPIC0gdW5kbyB0aGUgYXR0ZW1wdCB0byBhbGxvdyB0aGlzIG5vdCBvbiB0aGUgcmlnaHQgZWRnZSxcbiAgICAvLyAgICAgICAgbWF5YmUgbWFrZSBhIGZldyBjdXN0b20gY29tYmluYXRpb25zPyAoaXMgaXQgc3RpbGwgYnJva2VuPylcbiAgICAvLyAgICAgICAgLS0+IGxvb2tzIGxpa2Ugd2UgZGlkIGZpeCB0aGF0IGVhcmxpZXIgc29tZWhvdz8gIG1heWJlIGJ5IG1vdmluZ1xuICAgIC8vICAgICAgICAgICAgdGhlIHdob2xlIHNjcmVlbiBhIGNvbHVtbiBvdmVyLCBvciBlbHNlIGJ5IGNoYW5naW5nIHRoZSB0aWxlcz9cbiAgICAvLyBUT0RPIC0gTk9URSBTV0FNUCBHUkFQSElDUyBTVElMTCBCUk9LRU4hIVxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdkLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2NjfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3NzIHMnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIGxlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogNH0pLFxuICAgICAgICAgICAgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdlLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUkCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnICAgfGNjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LlN3YW1wRG9vcnMsIChzLCBzZWVkLCByb20pID0+IHtcbiAgICAgIHJvbS5tZXRhc2NyZWVucy5zd2FtcFdTX2Rvb3IuZmxhZyA9ICdhbHdheXMnO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfV1dLFxuICAgIGVkZ2VzOiAnIHNzICcsXG4gICAgY29ubmVjdDogJzZhJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogNH0pLCBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXU19kb29yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3ZSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUkCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnICAgfGM8IHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICcgc3MgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU3LCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEVtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3ZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHwgICB8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgY29ubmVjdDogJycsXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgLy8gTWlzc2luZyBzd2FtcCBzY3JlZW5zXG4gIHJlYWRvbmx5IHN3YW1wTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDcwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKVtSB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHwgYyB8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAncyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIHBvaTogW1swXV0sXG4gICAgZGVmaW5pdGlvbjogcmVhZFNjcmVlbihcbiAgICAgICAgYC4gIC4gIC4gIC4gIGNmIGY2IGM3IGFkIGM0IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGI4IGI5IGMzIGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGI3IGI4IGFkIGFkIGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGMyIGMzIGI3IGI4IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGMyIGI3IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGI5IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGFkIGFkIGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI5IGI4IGFkIGFkIGQyIGUyIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGUzIGY2IGMzIGMzIGI4IGI2IGQyIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIGUzIGZkIGFkIGFkIGZjIGUyIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIGZmIGZiIGZiIGZhIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW3IHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8IGMgfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyAgcyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBwb2k6IFtbMF1dLFxuICAgIGRlZmluaXRpb246IHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICAuICBjZCBjOSBjOSBjYSAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICBjZCBlYiBhMCBhMCBjYiBjYSAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBhMCBmOSBmNSBmNyBmOCBjYiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBhMCBlZCAwOCAwOSBhMCBhMCBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkYiBlZSAwYyAwYiBlZiBhMCBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMCBkMSAwMyAwMyBkOCBkYiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNyBhZCBhZCBhZSBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBhZCBiOSBiNyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBjMiBjMyBjMyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNSBjMyBjMyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBiNiBjMiBjMyBjMyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiOCBiNiBiNiBiNiBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiNyBiNyBiNyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiNyBiNyBiOCBiNiBkMiBjYyAuICAuICAuICAuYCxcbiAgICAgICAgWycuJywgMHhjOF0pLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfCBjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICdzIHMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gICAgZGVmaW5pdGlvbjogcmVhZFNjcmVlbihcbiAgICAgICAgYC4gIC4gIC4gIC4gIGNmIGQzIGI2IGI2IGM2IGI2IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGMzIGM3IGI2IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY1IGMzIGM3IGI2IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGI2IGM2IGM1IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGI2IGM2IGMzIGM3IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY1IGMzIGMzIGMzIGMzIGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGFkIGMyIGMzIGMzIGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGM0IGM1IGMzIGMzIGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY1IGI3IGI3IGI4IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGMyIGI4IGI2IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGI2IGMyIGI3IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGI2IGI2IGI2IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGI3IGI3IGI4IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI5IGI3IGI3IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGI3IGI3IGM3IGI2IGQyIGNjIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4NzMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8Y2NjfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzIHMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICByaWdodEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pXSxcbiAgICBkZWZpbml0aW9uOiByZWFkU2NyZWVuKFxuICAgICAgICBgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzlcbiAgICAgICAgIGEwIGU0IGU4IGViIGU0IGEwIGEwIGEwIGViIGViIGU4IGYwIGYxIGEwIGU0IGEwXG4gICAgICAgICBhMCBlNSBlOSBmOSBmNSBmNiBmNiBmNyBlYyBmOSBmNyBmOCBmMiBhMCBlNSBhMFxuICAgICAgICAgYTAgZTYgZjAgZjEgZTYgZTAgMDggMDkgZWQgZGUgZWEgZGUgZjIgYTAgZTYgYTBcbiAgICAgICAgIGRiIGU3IGRiIGYzIGU3IGUxIDBjIDBiIGRkIGRmIGUwIGRmIGYzIGRiIGU3IGUwXG4gICAgICAgICBkMCBkMSBkYSBkYSBkMCBkMSAwMyAwMyBkMCBkMSBkMCBkMSBkYSBkYSBkYSBkYVxuICAgICAgICAgYWQgYzQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWRcbiAgICAgICAgIGMyIGM1IGI4IGM2IGM0IGM0IGI5IGM3IGM0IGM1IGM1IGM3IGFkIGFkIGFkIGFkXG4gICAgICAgICBhZCBhZCBhZCBhZCBjMiBjMyBjMyBjMyBjMyBjMyBjNyBhZCBhZCBhZCBhZCBhZFxuICAgICAgICAgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmJcbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdFX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MyxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfGM8Y3wgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzIHMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTYsICdzd2FtcCcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHwgY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnICBzcycsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBwb2k6IFtbMl1dLFxuICAgIGRlZmluaXRpb246IHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICAuICBjZCBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOVxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgY2QgYTAgYTAgYTAgZTggMDQgYTAgZTggYTAgYTAgZTRcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY4IGEwIGYwIGYxIGY1IGY1IGY3IGU5IGY0IGY3IGU1XG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBmNyBmOCBmMiBlYSAwNiBhYSBlOSBmMCBmMSBlNlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgYTAgZGQgZTAgZjMgZTAgMDcgMGMgZWEgZGIgZjMgZTdcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGRiIGQ1IGQwIGQxIGQxIDAzIDAzIGQwIGQxIGRhIGRhXG4gICAgICAgICAuICAuICAuICAuICBjZiBkNSBhZiBjNCBjNCBhZCBhZCBhZCBhZCBhZCBjNCBhZFxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjkgYzMgYzMgYjggYWQgYWQgYWQgYzIgYjcgYjhcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGMzIGMzIGMzIGMzIGI4IGFkIGFkIGFkIGFkIGFkXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNyBhZCBjMiBjMyBjNyBmYyBmYiBmYiBmYiBmYlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYWQgYWQgZDYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjkgYjggYWQgYjkgZjYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZjYgYzcgYWQgYjkgYzcgZDIgY2MgLiAgLiAgLiAgLiBcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGI5IGMzIGI4IGQyIGNjIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFNFX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3NCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfCDilIzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnICAgfCA8Y3wgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyAgc3MnLFxuICAgIGNvbm5lY3Q6ICdhZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWEsICdzd2FtcCcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTlNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4NzUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pSc4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHwgY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAncyBzcycsXG4gICAgY29ubmVjdDogJzJhZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIHJpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSldLFxuICAgIGRlZmluaXRpb246IHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICBjZiBkMyBjNCBjMyBjMyBjMyBmNyBmOCBjYSAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNSBjMyBjMyBjMyBjMyBmNyBmNyBhMCBjYSBjOSBjOVxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZjYgYzMgYzMgYjggYjYgZDIgZjcgZjggZTggZTQgYTBcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY1IGI3IGMzIGI3IGI4IGQyIGYwIGYxIGU5IGU1IGRlXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBjMiBiOCBjMiBiOCBkOCBkYiBmMiBlYSBlNiBkZlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYWQgYWQgYWUgZDQgZjMgZGQgZTcgZGZcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGFkIGFkIGFkIGFlIGQwIGQxIGQwIGQxXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBjMiBjMyBjMyBiNyBiOCBhZCBhZCBhZCBhZCBhZFxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYzIgYjcgYjcgYjcgYjggYzQgYWQgYWRcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGI2IGI5IGI3IGI3IGI3IGI3IGI4IGFkXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBhZCBjNCBjMyBiNyBiOCBmYyBmYiBmYiBmYiBmYlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjYgYWQgYWQgYWQgZDYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYWQgYWQgZDIgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYzQgYzMgYjcgYjggZDIgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjYgYjkgYjcgYjcgZjYgY2MgLiAgLiAgLiAgLmAsXG4gICAgICAgIFsnLicsIDB4YzhdKSxcbiAgfSk7XG4gIC8vIENhdmUgc2NyZWVuc1xuICByZWFkb25seSBjYXZlRW1wdHkgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCAgIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgbGFieXJpbnRoOiB7fSwgcHlyYW1pZDoge30sXG4gICAgICAgICAgICAgICBpY2VDYXZlOiB7fSwgZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBvcGVuID0gdGhpcy5tZXRhc2NyZWVuKHsgLy8gTk9URTogbm90IGNhdmVcbiAgICBpZDogMHg4MCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3xvb298b29vJyxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge30sIHNlYToge319LCAvLyBOT1RFOiBjb3VsZCBhZGQgZ3Jhc3Mvcml2ZXIgYnV0IHRyZWVzIG5pY2VyLlxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfCBjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgcG9pOiBbWzRdXSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KSxcbiAgICAgICAgICAgIHRvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgxLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgYyBjJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIHBvaTogW1s0XV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsV0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgyLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHwgY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgIGNjJyxcbiAgICBjb25uZWN0OiAnYWUnLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsU0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgzLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilJAgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHxjYyB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgY2MgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsV1NfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg0LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHwgY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjICBjJyxcbiAgICBjb25uZWN0OiAnMmUnLFxuICAgIHBvaTogW1syXV0sXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5FX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NSxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilJggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2MgfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnY2MgICcsXG4gICAgY29ubmVjdDogJzI2JyxcbiAgICBwb2k6IFtbMl1dLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOV191bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODYsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUnOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgYyB8IGNjfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyBjYycsXG4gICAgY29ubmVjdDogJzJhZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KV0sXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOU0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg3LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfGNjY3wgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2NjY2MnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgICBwb2k6IFtbM11dLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XU0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg4LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4OSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUpCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfGNjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2NjYyAnLFxuICAgIGNvbm5lY3Q6ICcyNmEnLFxuICAgIHBvaTogW1szXV0sXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldTX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4OSxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaFdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSs4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHxjY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgY2NjJyxcbiAgICBjb25uZWN0OiAnNmFlJyxcbiAgICBwb2k6IFtbM11dLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoV1NFX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4YSxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHxjY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjYyBjJyxcbiAgICBjb25uZWN0OiAnMjZlJyxcbiAgICBwb2k6IFtbM11dLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XRV91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGIsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfcmFtcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSLIHxcbiAgICAgIHwg4pSLIHxcbiAgICAgIHwg4pSLIHxgLFxuICAgIHRpbGU6ICcgYyB8IC8gfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncmFtcCddLFxuICAgIGVkZ2VzOiAnYyBjICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfcmFtcF91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGMsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfb3ZlckJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pW9IHxcbiAgICAgIHzilIDilIPilIB8XG4gICAgICB8IOKVvyB8YCxcbiAgICB0aWxlOiAnIGMgfCBiIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ292ZXJwYXNzJ10sXG4gICAgZWRnZXM6ICdjYmNiJywgLy8gVE9ETyAtICdiJyBmb3Igb3RoZXIgc2lkZSBvZiBicmlkZ2U/P1xuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFX3VuZGVyQnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4ZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilb0gfFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHwg4pW/IHxgLFxuICAgIHRpbGU6ICcgICB8Y2JjfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsndW5kZXJwYXNzJ10sXG4gICAgZWRnZXM6ICdiY2JjJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX3dhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhmLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUhiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfCBjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGZlYXR1cmU6IFsnd2FsbCddLFxuICAgIC8vIFRPRE8gLSBjYW4gd2UganVzdCBkZXRlY3QgdGhlIGNvbm5lY3Rpb25zP1xuICAgIC8vICAgICAgLSBmb3IgZWFjaCB0aWxlc2V0LCBtYXAgMS4uZiB0byB2YXJpb3VzIGVkZ2UgcG9zP1xuICAgIC8vICAgICAgLSBlLmcuIGNhdmU6IDB4MDIgPSAxLCAweDA4ID0gMiwgMHgwYyA9IDMsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgMHgyMCA9IDUsIDB4ODAgPSA2LCAweGMwID0gNywgLi4uXG4gICAgLy8gICAgICAgIG5lZWQgdG8gYmUgV0FMS0FCTEVcbiAgICAvLyAgICAgICAgbWF5IG5lZWQgdG8gcmVldmFsdWF0ZSBlYWNoIHNjcmVlbiBmb3IgZWFjaCB0aWxlc2V0Li4uXG4gICAgLy8gICAgICAgIGFuZCBuZWVkIHRvIHdhaXQgdW50aWwgdGhlIHNjcmVlbiBpcyBCVUlMVCFcbiAgICBjb25uZWN0OiAnMj1hJywgLy8gd2FsbCB3aWxsIGFsd2F5cyBjb25uZWN0IHRoZSBmaXJzdCB0d28/XG4gICAgd2FsbDogMHg4NywgXG4gICAgbW9kOiAnd2FsbCcsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX3dhbGxfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhmLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFX3dhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDkwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUhOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfGNjY3wgICAnLFxuICAgIC8vIE5PVEU6IG5vIGZvcnRyZXNzIHZlcnNpb24gb2YgdGhpcyB3YWxsIVxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dhbGwnXSxcbiAgICBlZGdlczogJyBjIGMnLFxuICAgIGNvbm5lY3Q6ICc2PWUnLFxuICAgIHdhbGw6IDB4NjcsXG4gICAgbW9kOiAnd2FsbCcsXG4gIH0pO1xuICByZWFkb25seSBoYWxsV0Vfd2FsbF91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTAsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfYXJlbmEgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDkxLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pS44pSQfFxuICAgICAgfOKUgibilIJ8XG4gICAgICB84pSU4pSs4pSYfGAsXG4gICAgLy9wbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6IFsnIG4gfCBhIHwgYyAnXSwgLy8gLCAnIG4gfCBhIHwgdyAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnYyBjICcsIC8vICduJyBmb3IgJ25hcnJvdycgb24gdG9wPz8/XG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgMHg3OF1dLFxuICAgIGV4aXRzOiBbdG9wRWRnZSgpLCAvLyB2YW1waXJlIDEgcm9vbVxuICAgICAgICAgICAgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDQsIG1hbnVhbDogdHJ1ZX0pLCAvLyBnb2Egc2FnZXNcbiAgICAgICAgICAgIHNlYW1sZXNzVXAoMHhlNiwgNCksIHNlYW1sZXNzRG93bigweGY2LCA0KV0sIC8vIGtlbnN1XG4gICAgYXJlbmE6IDEsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfYXJlbmFfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDkxLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX2FyZW5hV2FsbCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilITilJB8XG4gICAgICB84pSCJuKUgnxcbiAgICAgIHzilJTilKzilJh8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6IFsnIG4gfCBhIHwgYyAnXSwgLy8gLCAnIGMgfCBhIHwgYyAnXSxcbiAgICAvLyBOT1RFOiBpcm9uIHdhbGwgZG9lc24ndCB3b3JrIGhlcmVcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYScsICd3YWxsJ10sXG4gICAgZWRnZXM6ICduIGMgJyxcbiAgICBjb25uZWN0OiAnMng9YXB4JyxcbiAgICB3YWxsOiAweDI3LFxuICAgIG1vZDogJ3dhbGwnLFxuICAgIHBvaTogW1sxLCAweDYwLCAweDc4XV0sXG4gICAgLy8gTk9URTogdG9wIGV4aXQgbmVlZHMgdG8gbW92ZSB1cCBhIHRpbGUuLi4/XG4gICAgZXhpdHM6IFt0b3BFZGdlKHt0b3A6IDF9KSwgLy8gcHJpc29ucyBuZWVkIGV4dHJhIGV4aXRzXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICAgIGFyZW5hOiAxLFxuICB9KTtcbiAgLy8gTk9URTogc2NyZWVuIDkzIGlzIG1pc3NpbmchXG4gIHJlYWRvbmx5IGJyYW5jaE5XRV93YWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIGMgfGNjY3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dhbGwnXSxcbiAgICBlZGdlczogJ2NjIGMnLFxuICAgIGNvbm5lY3Q6ICcyeD02ZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBtb2Q6ICd3YWxsJyxcbiAgICB3YWxsOiAweDM3LFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldFX3dhbGxfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk0LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldFX3VwU3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk1LFxuICAgIGljb246IGljb25gPFxuICAgICAgfCA8IHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjPGN8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgYyBjJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDQ3KV0sXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV0VfdXBTdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTUsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kV191cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NixcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHwgPCB8XG4gICAgICB84pSA4pSYIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfGM8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyBjICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW3VwU3RhaXIoMHg0MildLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdfdXBTdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTYsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDIwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kV19kb3duU3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk3LFxuICAgIGljb246IGljb25gPlxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilJAgfFxuICAgICAgfCA+IHxgLFxuICAgIHRpbGU6ICcgICB8Yz4gfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4YTIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXX2Rvd25TdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTcsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDIwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kRV91cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5OCxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHwgPCB8XG4gICAgICB8IOKUlOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCA8Y3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyAgIGMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHg0YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZEVfdXBTdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTgsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweGQwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kRV9kb3duU3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk5LFxuICAgIGljb246IGljb25gPlxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCA+IHxgLFxuICAgIHRpbGU6ICcgICB8ID5jfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnICAgYycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4YWMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRFX2Rvd25TdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTksXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweGQwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlNfc3RhaXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCA+IHxcbiAgICAgIHwgICB8XG4gICAgICB8IDwgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnID4gfCAgIHwgPCAnLCAvLyBOT1RFOiB0aGlzIHdpbGwgbmVlZCB0byBiZSBtYW51YWwuLi5cbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnYyBjICcsXG4gICAgY29ubmVjdDogJzJ4fGF4JyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweDE3KSwgdXBTdGFpcigweGQ3KV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+IHJlYWNoYWJsZSgweDEwOCwgMHg3OCkgJiYgcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROU19zdGFpcnNfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDlhLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHgxMDgsIDB4NzgpICYmICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROX3N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnIGMgfCA+IHwgICAnLCAnID4gfCAgIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnYyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4MTcpXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDEwOCwgMHg3OCkgJiYgcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRTX3N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCA8IHxgLFxuICAgIHRpbGU6IFsnICAgfCA8IHwgYyAnLCAnICAgfCAgIHwgPCAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICBjICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweGQ3KV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpICYmIHJlYWNoYWJsZSgweDEwOCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVtSB8XG4gICAgICB8ICAgfFxuICAgICAgfCDilbcgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnIGMgfCAgIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2RlYWRlbmQnLCAnZW1wdHknXSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcycHxhcCcsXG4gICAgcG9pOiBbWzAsIC0weDMwLCAweDc4XSwgWzAsIDB4MTEwLCAweDc4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+IHJlYWNoYWJsZSgtMHgzMCwgMHg3OCkgJiYgcmVhY2hhYmxlKDB4MTEwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROU191bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWIsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgtMHgzMCwgMHg3OCkgJiYgIXJlYWNoYWJsZSgweDExMCwgMHg3OCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVtSB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnIGMgfCBjIHwgICAnLCAnIGMgfCAgIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydkZWFkZW5kJywgJ2VtcHR5J10sXG4gICAgZWRnZXM6ICdjICAgJyxcbiAgICBjb25uZWN0OiAnMicsXG4gICAgcG9pOiBbWzAsIC0weDMwLCAweDc4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHgxMTAsIDB4NzgpICYmIHJlYWNoYWJsZSgtMHgzMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCDilbcgfGAsXG4gICAgdGlsZTogWycgICB8IGMgfCBjICcsICcgICB8ICAgfCBjICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2RlYWRlbmQnLCAnZW1wdHknXSxcbiAgICBlZGdlczogJyAgYyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBwb2k6IFtbMCwgMHgxMTAsIDB4NzhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgtMHgzMCwgMHg3OCkgJiYgcmVhY2hhYmxlKDB4MTEwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pW0IOKVtnxcbiAgICAgIHwgICB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgICB8YyBjfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZGVhZGVuZCcsICdlbXB0eSddLFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzZwfGVwJyxcbiAgICBwb2k6IFtbMCwgMHg3MCwgLTB4MjhdLCBbMCwgMHg3MCwgMHgxMDhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gcmVhY2hhYmxlKDB4NzAsIC0weDI4KSAmJiByZWFjaGFibGUoMHg3MCwgMHgxMDgpLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdFX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YyxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NzAsIC0weDI4KSAmJiAhcmVhY2hhYmxlKDB4NzAsIDB4MTA4KSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pW0ICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogWycgICB8Y2MgfCAgICcsICcgICB8YyAgfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2RlYWRlbmQnLCAnZW1wdHknXSxcbiAgICBlZGdlczogJyBjICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBwb2k6IFtbMCwgMHg3MCwgLTB4MjhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDcwLCAweDEwOCkgJiYgcmVhY2hhYmxlKDB4NzAsIC0weDI4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgIOKVtnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiBbJyAgIHwgY2N8ICAgJywgJyAgIHwgIGN8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZGVhZGVuZCcsICdlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgYycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIHBvaTogW1swLCAweDcwLCAweDEwOF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NzAsIC0weDI4KSAmJiByZWFjaGFibGUoMHg3MCwgMHgxMDgpLFxuICB9KTtcbiAgLy8gTk9URTogOWQgbWlzc2luZ1xuICByZWFkb25seSBoYWxsTlNfZW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDllLFxuICAgIGljb246IGljb25g4pW9XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKVvSB8YCxcbiAgICB0aWxlOiAnIGMgfCBjIHwgbiAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgbiAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX2VudHJhbmNlX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5ZSxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxFeGl0U0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDlmLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilZTilZB8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnICBycicsIC8vIFRPRE8gLSB0aGlzIGlzIG5vdCBzcGVjaWZpYyBlbm91Z2ggdG8gcmFuZG9taXplIHdpdGhcbiAgICAvL2Nvbm5lY3Q6ICc5ZDpiZicsICAvLyA6IG1lYW5zIHdhdGVyIC0gZmxpZ2h0IG5lZWRlZFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxCZW5kV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGEwLFxuICAgIGljb246IGljb25gXG4gICAgICB84paIICB8XG4gICAgICB84pWQ4pWXIHxcbiAgICAgIHzilojilZEgfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJyByciAnLCAvLyBUT0RPIC0gdGhpcyBpcyBub3Qgc3BlY2lmaWMgZW5vdWdoIHRvIHJhbmRvbWl6ZSB3aXRoXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsSGFsbE5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilZEgfFxuICAgICAgfCDilaDilIh8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlcicsICdicmlkZ2UnXSxcbiAgICB3YWxsOiAweDhiLFxuICAgIGVkZ2VzOiAnciByICcsIC8vIFRPRE8gLSB0aGlzIGlzIG5vdCBzcGVjaWZpYyBlbm91Z2ggdG8gcmFuZG9taXplIHdpdGhcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxFbnRyYW5jZVNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWU4pSIfFxuICAgICAgfOKVt+KVkSB8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlcicsICdicmlkZ2UnXSxcbiAgICAvLyBOT1RFOiBUaGlzIHdvdWxkIEFMTU9TVCB3b3JrIGFzIGEgY29ubmVjdGlvbiB0byB0aGVcbiAgICAvLyBub3JtYWwgcml2ZXIgY2F2ZSB0aWxlcywgYnV0IHRoZSByaXZlciBpcyBvbmUgdGlsZVxuICAgIC8vIHRhbGxlciBhdCB0aGUgdG9wLCBzbyB0aGVyZSdzIG5vIG1hdGNoIVxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogMn0pXSxcbiAgICB3YWxsOiAweDdjLFxuICAgIGVkZ2VzOiAnICBycicsIC8vIFRPRE8gLSB0aGlzIGlzIG5vdCBzcGVjaWZpYyBlbm91Z2ggdG8gcmFuZG9taXplIHdpdGhcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxDcm9zcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHzilZDilazilZB8XG4gICAgICB84pW34pWR4pW3fGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICAvLyBOT1RFOiB0d28gYm90dG9tIGVkZ2VzIG9uIHRoZSBzYW1lIHNjcmVlbiAtIGNhbGwgb25lIGEgZG9vclxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogM30pLCBib3R0b21FZGdlKHtsZWZ0OiAweGIsIHR5cGU6ICdkb29yJ30pXSxcbiAgICBlZGdlczogJyAgcnInLCAvLyBUT0RPIC0gdGhpcyBpcyBub3Qgc3BlY2lmaWMgZW5vdWdoIHRvIHJhbmRvbWl6ZSB3aXRoXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTQsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oip4paIfFxuICAgICAgfOKUiOKVkOKVkHxcbiAgICAgIHwgIOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIGV4aXRzOiBbZG9vcigweDM4KV0sXG4gICAgd2FsbDogMHg3MyxcbiAgICBlZGdlczogJyByICAnLCAvLyBUT0RPIC0gdGhpcyBpcyBub3Qgc3BlY2lmaWMgZW5vdWdoIHRvIHJhbmRvbWl6ZSB3aXRoXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkZsb2F0aW5nSXNsYW5kID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhNSxcbiAgICBpY29uOiBpY29uYCpcbiAgICAgIHzilZDilZfiloh8XG4gICAgICB8KuKVkSB8XG4gICAgICB84pWQ4pWj4paIfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnICAgfCBhcHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnICB3cCcsICAvLyB3ID0gd2F0ZXJmYWxsLCBwID0gcGF0aFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aE5FX3N0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhNixcbiAgICBpY29uOiBpY29uYOKUlFxuICAgICAgfOKWiOKUi+KWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnIC8gfCBwcHwgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ2wgIHAnLCAgLy8gbCA9IGxhZGRlciAoc3RhaXJzKVxuICAgIGNvbm5lY3Q6ICcyZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKCldLCAvLyBuZXZlciB1c2VkIGFzIGFuIGV4aXQgaW4gdmFuaWxsYVxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5CcmFuY2hOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGE3LFxuICAgIGljb246IGljb25g4pS0XG4gICAgICB84paIIOKWiHxcbiAgICAgIHwgICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyBwIHxwcHB8ICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdwcCBwJyxcbiAgICBjb25uZWN0OiAnMjZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX2ljZUJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTgsXG4gICAgaWNvbjogaWNvbmDilatcbiAgICAgIHzilojilZHiloh8XG4gICAgICB8IOKUhiB8XG4gICAgICB84paI4pWR4paIfGAsXG4gICAgdGlsZTogWycgciB8cHBwfCByICcsICcgciB8cHBwfCAgICddLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW5SaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICd3cHdwJyxcbiAgICBjb25uZWN0OiAnNi1lOjJhJyxcbiAgICB3YWxsOiAweDg3LFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGE5LFxuICAgIGljb246IGljb25g4pSMXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlOiAnICAgfCBwcHwgcCAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgIHBwJyxcbiAgICBjb25uZWN0OiAnYWUnLFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDYsIGhlaWdodDogNH0pLCBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluRGVhZEVuZFdfY2F2ZUVtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhYSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHzilpAg4paQfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIC8vIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJyAgIHxwPCB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHAgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDM4KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YWIsXG4gICAgaWNvbjogaWNvbmDilJRcbiAgICAgIHzilogg4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgcCB8IHBwfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3AgIHAnLFxuICAgIGNvbm5lY3Q6ICcyZScsXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogNiwgaGVpZ2h0OiA0fSksIHRvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5CcmFuY2hXU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFjLFxuICAgIGljb246IGljb25g4pSsXG4gICAgICB84paI4paI4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogJyAgIHxwcHB8IHAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHBwcCcsXG4gICAgY29ubmVjdDogJzZhZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFkLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfCAg4paQfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8cDwgfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW2NhdmUoMHg1NSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoRV9zbG9wZVMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFlLFxuICAgIGljb246IGljb25g4pWTXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGU6ICcgICB8IHBwfCDihpMgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICcgIHNwJywgLy8gcyA9IHNsb3BlXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhZixcbiAgICBpY29uOiBpY29uYOKUmFxuICAgICAgfOKWiCDiloh8XG4gICAgICB8ICDiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyBwIHxwcCB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAncHAgICcsXG4gICAgY29ubmVjdDogJzI2JyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDYsIGhlaWdodDogNH0pLCB0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluQ2F2ZV9lbXB0eSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjAsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paMIOKWkHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfCA8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBjb25uZWN0OiAnJyxcbiAgICBleGl0czogW2NhdmUoMHg1OCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoRV9jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiMSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfCA8cHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgICBwJyxcbiAgICBjb25uZWN0OiAnZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX3Nsb3BlTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjIsXG4gICAgaWNvbjogaWNvbmDilahcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcg4oaTIHxwcHB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICdzcCBwJyxcbiAgICBjb25uZWN0OiAnMjZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluRGVhZEVuZFcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGIzLFxuICAgIGljb246IGljb25g4pW0XG4gICAgICB84paI4paI4paIfFxuICAgICAgfCAg4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8cHAgfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiNCxcbiAgICBpY29uOiBpY29uYOKUgFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHwgICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHxwcHB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHAgcCcsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDYsIGhlaWdodDogNH0pLCByaWdodEVkZ2Uoe3RvcDogNiwgaGVpZ2h0OiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5BcmVuYV9nYXRlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiNSxcbiAgICBpY29uOiBpY29uYCNcbiAgICAgIHzilogj4paIfFxuICAgICAgfOKWjCDilpB8XG4gICAgICB84paI4pSL4paIfGAsXG4gICAgdGlsZTogJyAgIHwgPCB8IC8gJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJyAgbCAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBleGl0czogW3suLi51cFN0YWlyKDB4NDcsIDMpLCB0eXBlOiAnZ2F0ZSd9XSxcbiAgICBmbGFnOiAnY3VzdG9tOmZhbHNlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aE5fc2xvcGVTX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGI2LFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4pSL4oipfFxuICAgICAgfOKWjCDilpB8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZTogJyAvIHwgPCB8IOKGkyAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ2wgcyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWEpLCB0b3BFZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0Vfc2xvcGVOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjcsXG4gICAgaWNvbjogaWNvbmDilatcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGU6ICcg4oaTIHxwcHB8IOKGkyAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3Nwc3AnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX3Nsb3BlTl9jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiOCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKGk+KIqXxcbiAgICAgIHwgICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyDihpMgfHA8cHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3NwIHAnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDVjKV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjksXG4gICAgaWNvbjogaWNvbmDilJBcbiAgICAgIHzilojilojiloh8XG4gICAgICB8ICDiloh8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGU6ICcgICB8cHAgfCBwICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyBwcCAnLFxuICAgIGNvbm5lY3Q6ICc2YScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblNsb3BlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiYSxcbiAgICBpY29uOiBpY29uYOKGk1xuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHzilojihpPiloh8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZTogJyDihpMgfCDihpMgfCDihpMgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICdzIHMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5SaXZlciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmEsXG4gICAgaWNvbjogaWNvbmDilZFcbiAgICAgIHzilojilZHiloh8XG4gICAgICB84paI4pWR4paIfFxuICAgICAgfOKWiOKVkeKWiHxgLFxuICAgIHRpbGU6IFsnIHIgfCByIHwgciAnLCAnIHIgfCByIHwgICAnXSxcbiAgICB0aWxlc2V0czoge21vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcyOmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoRV9nYXRlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiYixcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHziloggIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfCA8cHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJyAgIHAnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2NhdmUoMHg1NywgJ2dhdGUnKV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9pbm4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJjLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfHA8cHwgICAnLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnIHAgcCcsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBleGl0czogW2Rvb3IoMHg3NildLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0VfYnJpZGdlT3ZlclNsb3BlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiZCxcbiAgICBpY29uOiBpY29uYOKVkFxuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHwg4pWQIHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlOiAnIOKGkyB8cHBwfCDihpMgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICdzcHNwJyxcbiAgICBjb25uZWN0OiAnNmUnLCAvLyAnMmF8NmUnLFxuICAgIGV4aXRzOiBbc2VhbWxlc3NVcCgweGI2LCA0KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9icmlkZ2VPdmVyUml2ZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJkLFxuICAgIGljb246IGljb25g4pWQXG4gICAgICB84paI4pWR4paIfFxuICAgICAgfCDilZAgfFxuICAgICAgfOKWiOKVkeKWiHxgLFxuICAgIHRpbGU6IFsnIHIgfHBwcHwgciAnLCAnIHIgfHBwcHwgICAnXSxcbiAgICB0aWxlc2V0czoge21vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3dwd3AnLFxuICAgIGNvbm5lY3Q6ICc2ZXwyfGEnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5TbG9wZV91bmRlckJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmUsXG4gICAgaWNvbjogaWNvbmDihpNcbiAgICAgIHzilojihpPiloh8XG4gICAgICB8IOKVkCB8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZTogJyDihpMgfHDihpNwfCDihpMgJyxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICAvLyBUT0RPIC0gY291bGQgZmx5IHVuZGVyIGJyaWRnZSBvbiBtb3VudGFpblJpdmVyXG4gICAgZWRnZXM6ICdzcHNwJyxcbiAgICBjb25uZWN0OiAnMmEnLCAvLyAnMmF8NmUnLFxuICAgIGV4aXRzOiBbc2VhbWxlc3NEb3duKDB4YzYsIDQpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluRW1wdHkgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJmLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfCAgIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHziloTiloTiloR8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJ29vb3xvb298ICAgJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICAvLyBUT0RPIC0gZ3Jhc3Mvcml2ZXIgc2hvdWxkIG1heWJlIHVzZSByb2NrcyBpbnN0ZWFkP1xuICAgIGVkZ2VzOiAnb14gXicsIC8vIG8gPSBvcGVuLCBeID0gb3BlbiB1cFxuICAgIC8vY29ubmVjdDogJzI2ZScsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeU5fY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paA4oip4paAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8bzxvfG9vbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHNlYToge30sIGRlc2VydDoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYUNhdmVFbnRyYW5jZV19fSxcbiAgICBlZGdlczogJyB2b3YnLCAvLyBvID0gb3BlbiwgdiA9IG9wZW4gZG93blxuICAgIGV4aXRzOiBbY2F2ZSgweDQ5KV0sXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJTRV9jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpDiloh8XG4gICAgICB84paE4oip4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICdvbyB8bzwgfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc8XiAgJyxcbiAgICBleGl0czogW2NhdmUoMHg1YSldLFxuICB9KTtcbiAgcmVhZG9ubHkgd2F0ZXJmYWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzihpPihpPihpN8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3zihpPihpPihpN8b29vJyxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSB3aGlybHBvb2xCbG9ja2VyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilbPiloh8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3zihpMj4oaTfG9vbycsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICAvLyBUT0RPIC0gaW5kaWNhdGUgZmxhZ1xuICAgIGZlYXR1cmU6IFsnd2hpcmxwb29sJ10sXG4gICAgZmxhZzogJ2NhbG0nLCAvLyBjYWxtZWQgc2VhXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlYWNoRXhpdE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM1LFxuICAgIGljb246IGljb25gXG4gICAgICB84paIIOKWiHxcbiAgICAgIHzilojilbHiloB8XG4gICAgICB84paI4paMIHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJyB4IHwgYm98IG9vJyxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnbiA+dicsIC8vIG4gPSBcIm5hcnJvd1wiXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA5fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgd2hpcmxwb29sT3BlbiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKVsyB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3xvb298b29vJyxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGZlYXR1cmU6IFsnd2hpcmxwb29sJ10sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgICBmbGFnOiAnY2FsbScsIC8vIGJ1dCBvbmx5IGlmIG9uIGFuZ3J5IHNlYSAtIG5vdCBkZXNlcnQuLi5cbiAgfSk7XG4gIHJlYWRvbmx5IHF1aWNrc2FuZE9wZW4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbMgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvb298b29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3doaXJscG9vbCddLFxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBsaWdodGhvdXNlRW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM3LFxuICAgIGljb246IGljb25gXG4gICAgICB84paX4paf4paIfFxuICAgICAgfOKWkOKIqeKWm3xcbiAgICAgIHzilp3iloDilph8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICdvbyB8b0xvfG9vbycsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICAvLyBUT0RPIC0gaW5kaWNhdGUgdW5pcXVlbmVzcz9cbiAgICBmZWF0dXJlOiBbJ2xpZ2h0aG91c2UnXSxcbiAgICBlZGdlczogJzxvb3YnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDJhKSwgZG9vcigweDc1KV0sXG4gIH0pO1xuICByZWFkb25seSBiZWFjaENhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM4LFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWgOKVsuKWiHxcbiAgICAgIHwgICB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgICB8bzxvfG9vbycsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICBlZGdlczogJyB2b3YnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDI4KV0sXG4gIH0pO1xuICByZWFkb25seSBiZWFjaENhYmluRW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM5LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKIqeKWiHxcbiAgICAgIHwg4pWy4paAfFxuICAgICAgfOKWiOKWhOKWhHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJ29vIHxvQzh8ICAgJyxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGZlYXR1cmU6IFsnY2FiaW4nXSxcbiAgICBlZGdlczogJzxeIGInLCAvLyBiID0gXCJib2F0XCJcbiAgICBleGl0czogW2Rvb3IoMHg1NSksIHJpZ2h0RWRnZSh7dG9wOiA4LCBoZWlnaHQ6IDN9KV0sXG4gIH0pO1xuICByZWFkb25seSBvY2VhblNocmluZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4Y2EsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilpfiloTilpZ8XG4gICAgICB84paQKuKWjHxcbiAgICAgIHzilp0g4paYfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnb29vfG9Bb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgLy8gVE9ETyAtIGluZGljYXRlIHVuaXF1ZW5lc3M/XG4gICAgZmVhdHVyZTogWydhbHRhciddLFxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBweXJhbWlkRW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWhCB8XG4gICAgICB84paf4oip4paZfFxuICAgICAgfCDilbMgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnb29vfG9Qb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7ZGVzZXJ0OiB7fX0sXG4gICAgLy8gVE9ETyAtIGluZGljYXRlIHVuaXF1ZW5lc3M/XG4gICAgZmVhdHVyZTogWydweXJhbWlkJ10sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgICBleGl0czogW2NhdmUoMHhhNywgJ2ZvcnRyZXNzJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRFbnRyYW5jZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4Y2MsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWzIHxcbiAgICAgIHzilpA+4paMfFxuICAgICAgfOKWneKWgOKWmHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJ29vb3xvWW98b29vJyxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge319LFxuICAgIGZlYXR1cmU6IFsnY3J5cHQnXSxcbiAgICBlZGdlczogJ29vb28nLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4NjcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9hc2lzTGFrZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4Y2QsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgXiB8XG4gICAgICB8dk92fFxuICAgICAgfCB2dnxgLFxuICAgIHRpbGU6ICdvb298b29vfG9ybycsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge319LFxuICAgIGZlYXR1cmU6IFsnbGFrZSddLFxuICAgIGVkZ2VzOiAnb28zbycsXG4gIH0pO1xuICByZWFkb25seSBkZXNlcnRDYXZlRW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNlLFxuICAgIGljb246IGljb25gXG4gICAgICB84paX4paE4paWfFxuICAgICAgfOKWnOKIqeKWm3xcbiAgICAgIHwg4pWzIHxgLFxuICAgIHRpbGU6ICdvb298bzxvfG9vbycsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgLy8gVE9ETyAtIHByb2JhYmx5IG5lZWQgdG8gcHVsbCB0aGlzIG91dCBzaW5jZSBmbGFncyBkaWZmZXJcbiAgICAgICAgICAgICAgIC8vIFRPRE8gLSB3ZSBjb3VsZCBhbHNvIG1ha2UgdGhpcyB3b3JrYWJsZSBpbiByaXZlciBpZiB3ZSB3YW50XG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFDYXZlRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgICBleGl0czogW2NhdmUoMHhhNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2FzaXNDYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCB2dnxcbiAgICAgIHziloTiiKl2fFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICdvcm98bzxvfCBvbycsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzNePm8nLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDM3KV0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRW5kV19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKIqXxcbiAgICAgIHzilZDilZAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8cjwgfCAgICcsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBleGl0czogW3VwU3RhaXIoMHg1NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgYm9hdENoYW5uZWwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQxLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWgOKWgOKWgHxcbiAgICAgIHziloTiloTiloR8YCxcbiAgICB0aWxlOiBbJyAgIHw4ODh8ICAgJywgJyAgIHw4OHh8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICBlZGdlczogJyBiIGInLFxuICAgIGV4aXRzOiBbey4uLnJpZ2h0RWRnZSh7dG9wOiA4LCBoZWlnaHQ6IDN9KSwgZW50cmFuY2U6IDB4OWNlOH0sXG4gICAgICAgICAgICBsZWZ0RWRnZSh7dG9wOiA4LCBoZWlnaHQ6IDN9KV0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQyLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfHJycnwgICAnLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKVkeKUlHxcbiAgICAgIHzilZDilazilZB8XG4gICAgICB84pSs4pSH4pSsfGAsXG4gICAgICAvLyB84paY4pWR4padfFxuICAgICAgLy8gfOKVkOKVrOKVkHxcbiAgICAgIC8vIHzilpbilIbilpd8YCxcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgdXNpbmcgc29saWRzIGZvciB0aGUgY29ybmVycyBpbnN0ZWFkP1xuICAgIHRpbGU6ICcgciB8cnJyfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAncnJycicsXG4gICAgY29ubmVjdDogJzE1cDozZHA6NzktYmYnLFxuICAgIHdhbGw6IDB4YjYsXG4gICAgcG9pOiBbWzQsIDB4MDAsIDB4NDhdLCBbNCwgMHgwMCwgMHg5OF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQ0LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICAgIC8vIHzilozilZHilpB8XG4gICAgICAvLyB84paM4pWR4paQfFxuICAgICAgLy8gfOKWjOKVkeKWkHxgLFxuICAgIHRpbGU6ICcgciB8IHIgfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdyIHIgJyxcbiAgICBjb25uZWN0OiAnMTk6M2InLFxuICAgIG1vZDogJ2JyaWRnZScsIC8vIGQ2IGlzIHRoZSBicmlkZ2VkIHZlcnNpb25cbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilZDilZDilZB8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZTogJyAgIHxycnJ8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJyByIHInLFxuICAgIGNvbm5lY3Q6ICc1ZDo3ZicsXG4gICAgbW9kOiAnYnJpZGdlJywgLy8gZDcgaXMgdGhlIGJyaWRnZWQgdmVyc2lvblxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlNfYnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilJzilIfilKR8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZTogJyByIHwgciB8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInLCAnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdyIHIgJyxcbiAgICBjb25uZWN0OiAnMTktM2InLFxuICAgIHdhbGw6IDB4ODcsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRV9icmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQ3LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSs4pSAfFxuICAgICAgfOKVkOKUheKVkHxcbiAgICAgIHzilIDilLTilIB8YCxcbiAgICB0aWxlOiAnICAgfHJycnwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlcicsICdicmlkZ2UnXSxcbiAgICBlZGdlczogJyByIHInLFxuICAgIGNvbm5lY3Q6ICc1ZC03ZicsXG4gICAgd2FsbDogMHg4NixcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUgHxcbiAgICAgIHzilILilZTilZB8XG4gICAgICB84pSC4pWR4pSMfGAsXG4gICAgdGlsZTogJyAgIHwgcnJ8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJyAgcnInLFxuICAgIGNvbm5lY3Q6ICc5ZDpiZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilJB8XG4gICAgICB84pWQ4pWX4pSCfFxuICAgICAgfOKUkOKVkeKUgnxgLFxuICAgIHRpbGU6ICcgICB8cnIgfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgcnIgJyxcbiAgICBjb25uZWN0OiAnNWI6NzknLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGRhLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSUfFxuICAgICAgfOKUguKVmuKVkHxcbiAgICAgIHzilJTilIDilIB8YCxcbiAgICB0aWxlOiAnIHIgfCBycnwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnciAgcicsXG4gICAgY29ubmVjdDogJzFmOjNkJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkYixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKVkeKUgnxcbiAgICAgIHzilZDilZ3ilIJ8XG4gICAgICB84pSA4pSA4pSYfGAsXG4gICAgdGlsZTogJyByIHxyciB8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ3JyICAnLFxuICAgIGNvbm5lY3Q6ICcxNTozNycsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVXRV9wYXNzYWdlTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZGMsXG4gICAgaWNvbjogaWNvbmDiladcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB84pWQ4pWQ4pWQfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgYyB8cnJyfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdjciByJyxcbiAgICBjb25uZWN0OiAnMjVkOjdmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdFX3Bhc3NhZ2VTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkZCxcbiAgICBpY29uOiBpY29uYOKVpFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilZDilZDilZB8XG4gICAgICB84pSA4pSs4pSAfGAsXG4gICAgdGlsZTogJyAgIHxycnJ8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJyByY3InLFxuICAgIGNvbm5lY3Q6ICc1ZDo3YWYnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlNfcGFzc2FnZVcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGRlLFxuICAgIGljb246IGljb25g4pWiXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUpOKVkeKUgnxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICB0aWxlOiAnIHIgfGNyIHwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAncmNyICcsXG4gICAgY29ubmVjdDogJzE2OTozYicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19wYXNzYWdlRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZGYsXG4gICAgaWNvbjogaWNvbmDilZ9cbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSC4pWR4pScfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgIHRpbGU6ICcgciB8IHJjfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdyIHJjJyxcbiAgICBjb25uZWN0OiAnMTk6M2JlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUl+KUgXxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIHcgfCB3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3cgIHcnLFxuICAgIGNvbm5lY3Q6ICcyZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUlHxcbiAgICAgIHzilILilJfilIF8XG4gICAgICB84pSU4pSA4pSAfGAsXG4gICAgdGlsZTogJyB3IHwgd3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyAgdycsXG4gICAgY29ubmVjdDogJzFmfDJlfDNkJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTkVfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUwLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSUfFxuICAgICAgfCDilJfilIF8XG4gICAgICB84pSU4pSA4pSAfGAsXG4gICAgdGlsZTogJyB3IHwgd3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDYxXX19LFxuICAgIGVkZ2VzOiAndyAgdycsXG4gICAgY29ubmVjdDogJzF8ZnwyZXwzZCcsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5FX2Jsb2NrZWRSaWdodCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilIMgfFxuICAgICAgfOKUguKUl+KUgXxcbiAgICAgIHzilJTilIDilIB8YCxcbiAgICB0aWxlOiAnIHcgfCB3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4MGRdfX0sXG4gICAgZWRnZXM6ICd3ICB3JyxcbiAgICBjb25uZWN0OiAnMWZ8MmV8M3xkJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB84pSB4pSbIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIHcgfHd3IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3d3ICAnLFxuICAgIGNvbm5lY3Q6ICcyNicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKUg+KUgnxcbiAgICAgIHzilIHilJvilIJ8XG4gICAgICB84pSA4pSA4pSYfGAsXG4gICAgdGlsZTogJyB3IHx3dyB8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZVdhbGw6IDB4NmR9fSxcbiAgICBlZGdlczogJ3d3ICAnLFxuICAgIGNvbm5lY3Q6ICcxNXwyNnwzNycsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XX2Jsb2NrZWRSaWdodCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilIPilIJ8XG4gICAgICB84pSB4pSbIHxcbiAgICAgIHzilIDilIDilJh8YCxcbiAgICB0aWxlOiAnIHcgfHd3IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3dyAgJyxcbiAgICBjb25uZWN0OiAnMTV8MjZ8M3w3JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUg+KUgnxcbiAgICAgIHzilIHilJvilIJ8XG4gICAgICB84pSA4pSA4pSYfGAsXG4gICAgdGlsZTogJyB3IHx3dyB8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDAxXSwgcmVtb3ZlV2FsbDogMHg2ZH19LFxuICAgIGVkZ2VzOiAnd3cgICcsXG4gICAgY29ubmVjdDogJzF8NXwyNnwzNycsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSP4pSBfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZTogJyAgIHwgd3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICcgIHd3JyxcbiAgICBjb25uZWN0OiAnYWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilIDilIB8XG4gICAgICB84pSC4pSP4pSBfFxuICAgICAgfOKUguKUg+KUjHxgLFxuICAgIHRpbGU6ICcgICB8IHd3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJyAgd3cnLFxuICAgIGNvbm5lY3Q6ICc5ZHxhZXxiZicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFNFX2Jsb2NrZWRMZWZ0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUgHxcbiAgICAgIHwg4pSP4pSBfFxuICAgICAgfOKUguKUg+KUjHxgLFxuICAgIHRpbGU6ICcgICB8IHd3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHg2MV19fSxcbiAgICBlZGdlczogJyAgd3cnLFxuICAgIGNvbm5lY3Q6ICc5fGR8YWV8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxTRV9ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSAfFxuICAgICAgfOKUguKUj+KUgXxcbiAgICAgIHzilILilIMgfGAsXG4gICAgdGlsZTogJyAgIHwgd3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweGRkXX19LFxuICAgIGVkZ2VzOiAnICB3dycsXG4gICAgY29ubmVjdDogJzlkfGFlfGJ8ZicsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIHilJMgfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZTogJyAgIHx3dyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilJB8XG4gICAgICB84pSB4pST4pSCfFxuICAgICAgfOKUkOKUg+KUgnxgLFxuICAgIHRpbGU6ICcgICB8d3cgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVXYWxsOiAweDlkfX0sXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNWJ8NmF8NzknLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXU19ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUzLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSQfFxuICAgICAgfOKUgeKUkyB8XG4gICAgICB84pSQ4pSD4pSCfGAsXG4gICAgdGlsZTogJyAgIHx3dyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnIHd3ICcsXG4gICAgY29ubmVjdDogJzV8Ynw2YXw3OScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFdTX2Jsb2NrZWRMZWZ0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUkHxcbiAgICAgIHzilIHilJPilIJ8XG4gICAgICB8IOKUg+KUgnxgLFxuICAgIHRpbGU6ICcgICB8d3cgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHhkMV0sIHJlbW92ZVdhbGw6IDB4OWR9fSxcbiAgICBlZGdlczogJyB3dyAnLFxuICAgIGNvbm5lY3Q6ICc1Ynw2YXw3fDknLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19zdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU0LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSc4pSo4pSCfFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHzilILilKDilKR8YCxcbiAgICB0aWxlOiAnIHcgfCBIIHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTIzOWFiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfc3RhaXJzQmxvY2tlZDEzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUlOKUqOKUgnxcbiAgICAgIHzilbfilIPilbV8XG4gICAgICB84pSC4pSg4pSQfGAsXG4gICAgdGlsZTogJyB3IHwgSCB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDQxLCAweDhkXX19LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzEyYWJ8M3w5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfc3RhaXJzQmxvY2tlZDI0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUqOKUgnxcbiAgICAgIHzilILilIPilIJ8XG4gICAgICB84pSC4pSg4pSYfGAsXG4gICAgdGlsZTogJyB3IHwgSCB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDAxLCAweGNkXX19LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzF8MjM5YXxiJyxcbiAgfSk7XG4gIC8vIFRPRE8gLSBjdXN0b20gaW52ZXJ0ZWQgdmVyc2lvbiBvZiBlNCB3aXRoIHRoZSB0b3Agc3RhaXIgb24gdGhlIHJpZ2h0XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlNfZGVhZEVuZHMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVuSB8XG4gICAgICB8ICAgfFxuICAgICAgfCDilbsgfGAsXG4gICAgdGlsZTogJyB3IHwgICB8IHcgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMnxhJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gcmVhY2hhYmxlKDB4MTEwLCAweDc4KSAmJiByZWFjaGFibGUoLTB4MzAsIDB4NzgpLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxfZGVhZEVuZE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVuSB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnIHcgfCAgIHwgICAnLCAnIHcgfCB3IHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICd3ICAgJyxcbiAgICBjb25uZWN0OiAnMicsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHgxMTAsIDB4NzgpICYmIHJlYWNoYWJsZSgtMHgzMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbF9kZWFkRW5kUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCDilbsgfGAsXG4gICAgdGlsZTogWycgICB8ICAgfCB3ICcsICcgICB8IHcgfCB3ICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJyAgdyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gcmVhY2hhYmxlKDB4MTEwLCAweDc4KSAmJiAhcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgfSk7XG4gIC8vIFRPRE8gLSBhZGQgb25lLXdheSB2aWV3cyBvZiB0aGlzPyE/XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfZGVhZEVuZCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilbnilIJ8XG4gICAgICB84pSc4pSA4pSkfFxuICAgICAgfOKUguKVu+KUgnxgLFxuICAgIHRpbGU6ICcgdyB8ID0gfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxMzlifDJ8YScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX2RlYWRFbmRCbG9ja2VkMjQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pW14pW54pSCfFxuICAgICAgfOKUjOKUgOKUmHxcbiAgICAgIHzilILilbvilbd8YCxcbiAgICB0aWxlOiAnIHcgfCA9IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4NjEsIDB4YWRdfX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMXwyfDM5fGF8YicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX2RlYWRFbmRCbG9ja2VkMTMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pW54pW1fFxuICAgICAgfOKUlOKUgOKUkHxcbiAgICAgIHzilbfilbvilIJ8YCxcbiAgICB0aWxlOiAnIHcgfCA9IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4NmQsIDB4YTFdfX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMWJ8MnwzfDl8YScsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5XU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU2LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB84pSB4pWL4pSBfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZTogJyB3IHx3d3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICd3d3d3JyxcbiAgICBjb25uZWN0OiAnMjZhZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSD4pSUfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHzilJDilIPilIx8YCxcbiAgICB0aWxlOiAnIHcgfHd3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3d3d3JyxcbiAgICBjb25uZWN0OiAnMjZhZXwxNXwzZHw3OXxiZicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XU0VfYmxvY2tlZDEzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKUgyB8XG4gICAgICB84pSB4pWL4pSBfFxuICAgICAgfCDilIPilIx8YCxcbiAgICB0aWxlOiAnIHcgfHd3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4MGQsIDB4ZDFdfX0sXG4gICAgZWRnZXM6ICd3d3d3JyxcbiAgICBjb25uZWN0OiAnMjZhZXwxNXwzfGR8N3w5fGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldTRV9ibG9ja2VkMjQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU2LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUg+KUlHxcbiAgICAgIHzilIHilYvilIF8XG4gICAgICB84pSQ4pSDIHxgLFxuICAgIHRpbGU6ICcgdyB8d3d3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHgwMSwgMHhkZF19fSxcbiAgICBlZGdlczogJ3d3d3cnLFxuICAgIGNvbm5lY3Q6ICcyNmFlfDF8NXwzZHw3OXxifGYnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU3LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB84pSB4pS74pSBfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgdyB8d3d3fCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAnd3cgdycsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilIPilJR8XG4gICAgICB84pSB4pS74pSBfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgdyB8d3d3fCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3d3IHcnLFxuICAgIGNvbm5lY3Q6ICcyNmV8MTV8M2R8N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV0VfYmxvY2tlZFRvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHzilIHilLvilIF8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZTogJyB3IHx3d3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDAxLCAweDBkXX19LFxuICAgIGVkZ2VzOiAnd3cgdycsXG4gICAgY29ubmVjdDogJzI2ZXwxfDV8M3xkfDdmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIHilLPilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlOiAnICAgfHd3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJyB3d3cnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU4LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfOKUgeKUs+KUgXxcbiAgICAgIHzilJDilIPilIx8YCxcbiAgICB0aWxlOiAnICAgfHd3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICcgd3d3JyxcbiAgICBjb25uZWN0OiAnNmFlfDVkfDc5fGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1NFX2Jsb2NrZWRCb3R0b20gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU4LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfOKUgeKUs+KUgXxcbiAgICAgIHwg4pSDIHxgLFxuICAgIHRpbGU6ICcgICB8d3d3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHhkMSwgMHhkZF19fSxcbiAgICBlZGdlczogJyB3d3cnLFxuICAgIGNvbm5lY3Q6ICc2YWV8NWR8N3w5fGJ8ZicsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5TX3dhbGxUb3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU5LCAgICAvLyBOT1RFOiB0aGUgcGFzc2FnZSBuYXJyb3dzIGF0IHRoZSB0b3BcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfCDilIMgfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZTogJyBuIHwgdyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJywgJ3dhbGwnXSxcbiAgICBlZGdlczogJ2MgdycsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICAgIHdhbGw6IDB4MzcsXG4gICAgc3RhdHVlczogWzB4YV0sXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX3dhbGxUb3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU5LCAgICAvLyBOT1RFOiB0aGUgcGFzc2FnZSBuYXJyb3dzIGF0IHRoZSB0b3BcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfOKVt+KUg+KVt3xcbiAgICAgIHzilILilIPilIJ8YCxcbiAgICB0aWxlOiAnIG4gfCB3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3YWxsJ10sXG4gICAgZWRnZXM6ICdjIHcgJyxcbiAgICBjb25uZWN0OiAnMmF4fDl8YicsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICB3YWxsOiAweDM3LFxuICAgIHN0YXR1ZXM6IFsweGFdLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSB4pSB4pSBfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8d3d3fCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAnIHcgdycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVhLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfOKUgeKUgeKUgXxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlOiAnICAgfHd3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICcgdyB3JyxcbiAgICBjb25uZWN0OiAnNWR8NmV8N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgcGl0V0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGViLFxuICAgIHRpbGU6ICcgICB8Y3BjfCAgICcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pWz4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3BpdCddLFxuICAgIGVkZ2VzOiAnIGMgYycsXG4gICAgY29ubmVjdDogJzZlJyxcbiAgICBwbGF0Zm9ybToge3R5cGU6ICdob3Jpem9udGFsJywgY29vcmQ6IDB4NzBfMzh9LFxuICB9KTtcbiAgcmVhZG9ubHkgcGl0TlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVjLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKVsyB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfCBwIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3BpdCddLFxuICAgIGVkZ2VzOiAnYyBjICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBwbGF0Zm9ybToge3R5cGU6ICd2ZXJ0aWNhbCcsIGNvb3JkOiAweDQwXzc4fSxcbiAgfSk7XG4gIHJlYWRvbmx5IHBpdE5TX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlYyxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlZCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBzIHwgcyB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ3MgYyAnLCAvLyBzID0gc3Bpa2VzXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxOID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilpEgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIHRpbGU6ICcgYyB8IHMgfCBzICcsXG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ2MgcyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOU19oYWxsV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVmLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkSB8XG4gICAgICB84pSA4paR4pSAfFxuICAgICAgfCDilpEgfGAsXG4gICAgdGlsZTogJyBzIHxjc2N8IHMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ3Njc2MnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHzilIDilpEgfFxuICAgICAgfCDilpEgfGAsXG4gICAgdGlsZXNldHM6IHdpdGhSZXF1aXJlKFNjcmVlbkZpeC5FeHRyYVNwaWtlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0pLFxuICAgIHRpbGU6ICcgcyB8Y3MgfCBzICcsXG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ3NjcyAnLFxuICAgIGNvbm5lY3Q6ICcyNmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgc3Bpa2VzTlNfaGFsbEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilpHilIB8XG4gICAgICB8IOKWkSB8YCxcbiAgICB0aWxlc2V0czogd2l0aFJlcXVpcmUoU2NyZWVuRml4LkV4dHJhU3Bpa2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSksXG4gICAgdGlsZTogJyBzIHwgc2N8IHMgJyxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAncyBzYycsXG4gICAgY29ubmVjdDogJzJhZScsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWoIHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKVpSB8YCxcbiAgICB0aWxlOiAnIHIgfCAgIHwgciAnLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2RlYWRlbmQnLCAnZW1wdHknLCAncml2ZXInXSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxcDozcHw5cDpicCcsXG4gICAgcG9pOiBbWzEsIC0weDMwLCAweDQ4XSwgWzEsIC0weDMwLCAweDk4XSxcbiAgICAgICAgICBbMSwgMHgxMTAsIDB4NDhdLCBbMSwgMHgxMTAsIDB4OThdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc04gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVqCB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnIHIgfCAgIHwgICAnLCAnIHIgfCByIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnZGVhZGVuZCcsICdlbXB0eScsICdyaXZlciddLFxuICAgIGVkZ2VzOiAnciAgICcsXG4gICAgY29ubmVjdDogJzFwOjNwJyxcbiAgICBwb2k6IFtbMSwgLTB4MzAsIDB4NDhdLCBbMSwgLTB4MzAsIDB4OThdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDEwOCwgMHg0OCkgJiYgIXJlYWNoYWJsZSgweDEwOCwgMHg5OCksXG4gICAgbW9kOiAnYnJpZGdlJywgLy8gZjIgaXMgYnJpZGdlZCB2ZXJzaW9uXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKVpSB8YCxcbiAgICB0aWxlOiBbJyAgIHwgICB8IHIgJywgJyAgIHwgciB8IHIgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2RlYWRlbmQnLCAnZW1wdHknLCAncml2ZXInXSxcbiAgICBlZGdlczogJyAgciAnLFxuICAgIGNvbm5lY3Q6ICc5cDpicCcsXG4gICAgcG9pOiBbWzEsIDB4MTEwLCAweDQ4XSwgWzEsIDB4MTEwLCAweDk4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoLTB4MzAsIDB4NDgpICYmICFyZWFjaGFibGUoLTB4MzAsIDB4OTgpLFxuICAgIG1vZDogJ2JyaWRnZScsIC8vIGYyIGlzIGJyaWRnZWQgdmVyc2lvblxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYxLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKVoSDilZ58XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxyIHJ8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnZGVhZGVuZCcsICdlbXB0eScsICdyaXZlciddLFxuICAgIGVkZ2VzOiAnIHIgcicsXG4gICAgY29ubmVjdDogJzVwOjdwfGRwOmZwJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgLTB4MjhdLCBbMSwgMHhhMCwgLTB4MjhdLFxuICAgICAgICAgIFsxLCAweDYwLCAweDEwOF0sIFsxLCAweGEwLCAweDEwOF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pWhICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogWycgICB8ciAgfCAgICcsICcgICB8cnIgfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydkZWFkZW5kJywgJ2VtcHR5JywgJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgciAgJyxcbiAgICBjb25uZWN0OiAnNXA6N3AnLFxuICAgIHBvaTogW1sxLCAweDYwLCAtMHgyOF0sIFsxLCAweGEwLCAtMHgyOF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NjAsIDB4MTA4KSAmJiAhcmVhY2hhYmxlKDB4YTAsIDB4MTA4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYxLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAg4pWefFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnICAgfCAgcnwgICAnLCAnICAgfCBycnwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnZGVhZGVuZCcsICdlbXB0eScsICdyaXZlciddLFxuICAgIGVkZ2VzOiAnICAgcicsXG4gICAgY29ubmVjdDogJ2RwOmZwJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgMHgxMDhdLCBbMSwgMHhhMCwgMHgxMDhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDYwLCAtMHgyOCkgJiYgIXJlYWNoYWJsZSgweGEwLCAtMHgyOCksXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSHIHxcbiAgICAgIHwg4pWoIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiBbJyByIHwgciB8ICAgJywgJyByIHwgICB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnciAgICcsXG4gICAgY29ubmVjdDogJzEtMycsXG4gICAgd2FsbDogMHgxNyxcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgYSBwb2koMikgaGVyZT9cbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweGQwLCAweDQ4KSAmJiAhcmVhY2hhYmxlKDB4ZDAsIDB4OTgpLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlU19icmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYyLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilaUgfFxuICAgICAgfCDilIcgfGAsXG4gICAgdGlsZTogWycgICB8IHIgfCByICcsICcgICB8ICAgfCByICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlcicsICdicmlkZ2UnXSxcbiAgICBlZGdlczogJyAgciAnLFxuICAgIGNvbm5lY3Q6ICc5LWInLFxuICAgIHdhbGw6IDB4YzYsXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGEgcG9pKDIpIGhlcmU/XG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHgxMCwgMHg0OCkgJiYgIXJlYWNoYWJsZSgweDEwLCAweDk4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pWQ4pWm4pWQfFxuICAgICAgfOKUkOKVkeKUjHxgLFxuICAgIHRpbGU6ICcgICB8cnJyfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgcnJyJyxcbiAgICBjb25uZWN0OiAnNWQ6Nzk6YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTldFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKVkeKUlHxcbiAgICAgIHzilZDilanilZB8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZTogJyByIHxycnJ8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ3JyIHInLFxuICAgIGNvbm5lY3Q6ICcxNXA6M2RwOjdmJyxcbiAgICBwb2k6IFtbNCwgMHgwMCwgMHg0OF0sIFs0LCAweDAwLCAweDk4XV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19ibG9ja2VkUmlnaHQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGY1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUguKVkSB8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZTogJyByIHwgciB8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxOTozcDpicCcsXG4gICAgcG9pOiBbWzAsIDB4NDAsIDB4OThdLCBbMCwgMHhjMCwgMHg5OF1dLFxuICAgIG1vZDogJ2Jsb2NrJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TX2Jsb2NrZWRMZWZ0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHwg4pWR4pSCfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgIHRpbGU6ICcgciB8IHIgfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdyIHIgJyxcbiAgICBjb25uZWN0OiAnMXA6M2I6OXAnLFxuICAgIHBvaTogW1swLCAweDMwLCAweDQ4XSwgWzAsIDB4YjAsIDB4NDhdXSxcbiAgICBtb2Q6ICdibG9jaycsXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGU6ICcgcyB8IHMgfCBzICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzIHMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRBcmVuYV9zdGF0dWVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmOCxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHwmPCZ8XG4gICAgICB84pSCIOKUgnxcbiAgICAgIHzilJTilKzilJh8YCxcbiAgICB0aWxlOiAnICAgfCBhIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJyAgYyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBleGl0czogW3suLi51cFN0YWlyKDB4NTcpLCB0eXBlOiAnY3J5cHQnfV0sXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gICAgYXJlbmE6IDIsXG4gIH0pO1xuICByZWFkb25seSBweXJhbWlkQXJlbmFfZHJheWdvbiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilIDilJB8XG4gICAgICB84pSC4pWz4pSCfFxuICAgICAgfOKUlOKUrOKUmHxgLFxuICAgIHRpbGU6ICcgICB8IGEgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYScsICdwaXQnXSxcbiAgICBlZGdlczogJyAgdyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBhcmVuYTogMyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0QXJlbmFfZHJheWdvbjIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGZhLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSP4pS34pSTfFxuICAgICAgfOKUgybilIN8XG4gICAgICB84pSX4pSz4pSbfGAsXG4gICAgdGlsZTogJyB4IHwgYSB8IHcgJyxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICdjIHcgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gICAgYXJlbmE6IDQsXG4gIH0pO1xuICByZWFkb25seSBjcnlwdEFyZW5hX2VudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmYixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfCDilIMgfFxuICAgICAgfCDilb8gfGAsXG4gICAgdGlsZTogJyB3IHwgdyB8IHggJyxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgICBlZGdlczogJ3cgbiAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRUZWxlcG9ydGVyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmYyxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9LCB0b3dlcjoge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSwgY2F2ZSgweDU3LCAndGVsZXBvcnRlcicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGZvcnRyZXNzQXJlbmFfdGhyb3VnaCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmQsXG4gICAgaWNvbjogaWNvbmDilb1cbiAgICAgIHzilIzilLTilJB8XG4gICAgICB84pSCIOKUgnxcbiAgICAgIHzilJXilLPilJl8YCxcbiAgICB0aWxlOiBbJyBjIHwgYSB8IHcgJywgJyBuIHwgYSB8IHcgJ10sIC8vIHggfCBhIHwgdyA/P1xuICAgIHRpbGVzZXRzOiB7Zm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fX0sXG4gICAgLy8gTk9URTogd2UgY291bGQgdXNlIHRoaXMgZm9yIGEgcGl0IHRoYXQgcmVxdWlyZXMgZmxpZ2h0IHRvIGNyb3NzP1xuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJ24gdyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKCldLFxuICAgIGFyZW5hOiA1LFxuICB9KTtcbiAgLy8gcmVhZG9ubHkgZm9ydHJlc3NBcmVuYV9waXQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAvLyAgIGlkOiAweGZkLFxuICAvLyAgIGljb246IGljb25g4pW9XG4gIC8vICAgICB84pSM4pS04pSQfFxuICAvLyAgICAgfOKUgiDilIJ8XG4gIC8vICAgICB84pSV4pSz4pSZfGAsXG4gIC8vICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gIC8vICAgZmVhdHVyZTogWydhcmVuYScsICdwaXQnXSxcbiAgLy8gICBlZGdlczogJ24gdyAnLFxuICAvLyAgIGNvbm5lY3Q6ICcyYScsIC8vIFRPRE8gLSBubyB3YXkgeWV0IHRvIG5vdGljZSBmbGFnZ2VkIGFuZCBoYXZlXG4gIC8vICAgZXhpdHM6IFt0b3BFZGdlKCldLCAgIC8vIGxvZ2ljIHJlcXVpcmUgZmxpZ2h0Li4uXG4gIC8vICAgZmxhZ2dlZDogdHJ1ZSxcbiAgLy8gfSk7XG4gIHJlYWRvbmx5IGZvcnRyZXNzVHJhcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJTilIDilJh8XG4gICAgICB8IOKVsyB8XG4gICAgICB84pW24pSs4pW0fGAsXG4gICAgdGlsZTogJyAgIHwgeCB8IG4gJywgLy8gVE9ETyAtIHNhbWUgYXMgc3RhdHVlcy4uLj9cbiAgICB0aWxlc2V0czoge2ZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge319LFxuICAgIGZlYXR1cmU6IFsncGl0J10sXG4gICAgZWRnZXM6ICcgIG4gJyxcbiAgICBjb25uZWN0OiAnYScsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hyaW5lID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmZixcbiAgICB0aWxlc2V0czoge3NocmluZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDV9KSwgZG9vcigweDY4KV0sXG4gIH0pO1xuICByZWFkb25seSBpbm4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDEwMCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFt7Li4uZG9vcigweDg2KSwgZW50cmFuY2U6IDB4OTRfNjh9XSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvb2xTaG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMDEsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbey4uLmRvb3IoMHg4NiksIGVudHJhbmNlOiAweDk0XzY4fV0sXG4gIH0pO1xuICByZWFkb25seSBhcm1vclNob3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDEwMixcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFt7Li4uZG9vcigweDg2KSwgZW50cmFuY2U6IDB4OTRfNjh9XSxcbiAgfSk7XG5cbiAgY2hlY2tFeGl0VHlwZXMoKSB7XG4gICAgLy8gRG9lcyBhIHF1aWNrIGNoZWNrIHRvIG1ha2Ugc3VyZSB0aGVyZSdzIG5vIGNvbmZsaWN0aW5nIGV4aXQgdHlwZXNcbiAgICAvLyBvbiBhbnkgbWV0YXNjcmVlbnMuXG4gICAgZm9yIChjb25zdCBzIGluIHRoaXMpIHtcbiAgICAgIGNvbnN0IG1zID0gdGhpc1tzXSBhcyBhbnk7XG4gICAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBmb3IgKGNvbnN0IGUgb2YgbXM/LmRhdGE/LmV4aXRzIHx8IFtdKSB7XG4gICAgICAgIGlmIChzZWVuLmhhcyhlLnR5cGUpKSBjb25zb2xlLmxvZyhgZHVwbGljYXRlOiAke3N9ICR7ZS50eXBlfWApO1xuICAgICAgICBzZWVuLmFkZChlLnR5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5cbi8vICAg4pWU4pWm4pWXICAgICAgICAg4pWiICDilaVcbi8vICAg4pWg4pWs4pWjIOKVnuKVkOKVpOKVp+KVquKVoSAg4pWRICDilatcbi8vICAg4pWa4pWp4pWdICAgICAgICAg4pWoICDilZ9cbi8vICDilIzilKzilJAgIOKVt1xuLy8gIOKUnOKUvOKUpCAg4pSCIOKVtuKUgOKVtCBcbi8vICDilJTilLTilJggIOKVtVxuLy8g4paX4paE4paWICAg4paf4paZXG4vLyDilpDilojilowgICDilpzilpsgXG4vLyDilp3iloDilphcbi8vIFUrMjUweCDilIAg4pSBIOKUgiDilIMg4pSEIOKUhSDilIYg4pSHIOKUiCDilIkg4pSKIOKUiyDilIwg4pSNIOKUjiDilI9cbi8vIFUrMjUxeCDilJAg4pSRIOKUkiDilJMg4pSUIOKUlSDilJYg4pSXIOKUmCDilJkg4pSaIOKUmyDilJwg4pSdIOKUniDilJ9cbi8vIFUrMjUyeCDilKAg4pShIOKUoiDilKMg4pSkIOKUpSDilKYg4pSnIOKUqCDilKkg4pSqIOKUqyDilKwg4pStIOKUriDilK9cbi8vIFUrMjUzeCDilLAg4pSxIOKUsiDilLMg4pS0IOKUtSDilLYg4pS3IOKUuCDilLkg4pS6IOKUuyDilLwg4pS9IOKUviDilL9cbi8vIFUrMjU0eCDilYAg4pWBIOKVgiDilYMg4pWEIOKVhSDilYYg4pWHIOKViCDilYkg4pWKIOKViyDilYwg4pWNIOKVjiDilY9cbi8vIFUrMjU1eCDilZAg4pWRIOKVkiDilZMg4pWUIOKVlSDilZYg4pWXIOKVmCDilZkg4pWaIOKVmyDilZwg4pWdIOKVnlx04pWfXG4vLyBVKzI1Nngg4pWgIOKVoSDilaIg4pWjIOKVpCDilaUg4pWmIOKVpyDilagg4pWpIOKVqiDilasg4pWsIOKVrSDila4g4pWvXG4vLyBVKzI1N3gg4pWwIOKVsSDilbIg4pWzIOKVtCDilbUg4pW2IOKVtyDilbgg4pW5IOKVuiDilbsg4pW8IOKVvSDilb4g4pW/XG4vLyBVKzI1OHgg4paAIOKWgSDiloIg4paDIOKWhCDiloUg4paGIOKWhyDilogg4paJIOKWiiDilosg4paMIOKWjSDilo4g4paPXG4vLyBVKzI1OXgg4paQIOKWkSDilpIg4paTIOKWlCDilpUg4paWIOKWlyDilpgg4paZIOKWmiDilpsg4pacIOKWnSDilp4g4pafXG4vL1xuLy8g4oipIFxcY2FwXG4iXX0=