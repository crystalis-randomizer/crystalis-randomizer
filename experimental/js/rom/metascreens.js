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
            exits: [seamlessDown(0x08, 2), topEdge({ left: 8 })],
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
            exits: [seamlessUp(0xe8, 2)],
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
            exits: [bottomEdge({ left: 6, width: 4, manual: true })],
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
            exits: [seamlessDown(0x06, 4)],
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
            tile: [' n | a | c ', ' c | a | c ', ' c | a | w '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
            feature: ['arena'],
            edges: 'c c ',
            connect: '2a',
            poi: [[1, 0x60, 0x78]],
            exits: [topEdge(),
                bottomEdge({ left: 6, width: 4, manual: true }),
                seamlessUp(0xe6, 4)],
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
            tile: [' n | a | c ', ' c | a | c '],
            tilesets: { cave: {}, fortress: {}, pyramid: {}, iceCave: {} },
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
            feature: ['empty'],
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
            feature: ['empty'],
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
            feature: ['empty'],
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
            feature: ['empty'],
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
            feature: ['empty'],
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
            feature: ['empty'],
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
            exits: [{ ...upStair(0x47, 3), type: 'cave' }],
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
            exits: [cave(0xa7)],
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
            feature: ['empty', 'river'],
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
            feature: ['empty', 'river'],
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
            feature: ['empty', 'river'],
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
            feature: ['empty', 'river'],
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
            feature: ['empty', 'river'],
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
            feature: ['empty', 'river'],
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
            tile: '   | x | c ',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YXNjcmVlbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21ldGFzY3JlZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDdEMsT0FBTyxFQUFDLFVBQVUsRUFBTSxNQUFNLGlCQUFpQixDQUFDO0FBQ2hELE9BQU8sRUFBaUIsVUFBVSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFDbEUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQzFCLFNBQVMsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxHQUNwRSxNQUFNLHFCQUFxQixDQUFDO0FBRXBDLE9BQU8sRUFBQyxTQUFTLEVBQUUsV0FBVyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFzQ3RELE1BQU0sT0FBTyxXQUFXO0lBUXRCLFlBQXFCLEdBQVE7UUFBUixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBTHBCLFdBQU0sR0FBRyxDQUFDLENBQUM7UUFFSCxpQkFBWSxHQUFHLElBQUksVUFBVSxDQUEwQixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqRSxnQkFBVyxHQUFHLElBQUksVUFBVSxDQUF1QixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQWtHckUsbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1lBQ3JELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUNsQixLQUFLLEVBQUUsTUFBTTtZQUNiLE1BQU0sRUFBRSxJQUFJO1NBQ2IsQ0FBQyxDQUFDO1FBRU0sb0JBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3pDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUNwQixNQUFNLEVBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUM7Z0JBQzNDLEdBQUcsRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBQyxFQUFDO1lBQ2pELEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sY0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDbkMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUM7WUFDckQsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxvQkFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDekMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BCLE1BQU0sRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBQztnQkFDM0MsR0FBRyxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFDLEVBQUM7WUFDakQsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxjQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNuQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQztZQUNyRCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLGVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3BDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUMsRUFBQztZQUN6RCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLGVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3BDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUMsRUFBQztZQUN6RCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN6QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDcEIsTUFBTSxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFDO2dCQUMzQyxHQUFHLEVBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUMsRUFBQztZQUNqRCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLHlCQUFvQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDOUMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUtSLFNBQVMsRUFBRSxRQUFRO1lBQ25CLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUM7WUFDcEMsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLEVBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUMsQ0FBQztTQUNqRCxDQUFDLENBQUM7UUFDTSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzFDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1lBQ3JELEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sZUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDcEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUM7WUFDcEMsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUNoQyxHQUFHLEVBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUMsRUFBQztZQUN4RCxLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztTQUN4QyxDQUFDLENBQUM7UUFDTSxzQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzNDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUM7Z0JBQzlDLE1BQU0sRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0I7d0JBQzFCLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBQyxFQUFDO1lBQ3ZELEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sYUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDbEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUM7WUFDckQsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFFTSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzVDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixTQUFTLEVBQUUsUUFBUTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1lBQ3JELE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7WUFDNUIsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztZQUNsQixNQUFNLEVBQUUsSUFBSTtTQUNiLENBQUMsQ0FBQztRQUNNLGFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2xDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1lBQ3JELEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sYUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDbEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUM7WUFDckQsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxhQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNsQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQztZQUNyRCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLFVBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQy9CLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDO1lBQ3BDLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BCLE1BQU0sRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBQyxFQUFDO1lBQ3ZELEtBQUssRUFBRSxNQUFNO1lBQ2IsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7U0FFN0IsQ0FBQyxDQUFDO1FBQ00sb0JBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3pDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2hDLEdBQUcsRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBQyxFQUFDO1lBQ2pELEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixTQUFTLEVBQUUsUUFBUTtZQUNuQixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBR3JCLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQztZQUNwQixLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO1NBQzVCLENBQUMsQ0FBQztRQUNNLHFCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDMUMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLFNBQVMsRUFBRSxRQUFRO1lBQ25CLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDO1lBQ3BCLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sZ0JBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3JDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2hDLEdBQUcsRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsRUFBQyxFQUFDO1lBQ3hELEtBQUssRUFBRSxNQUFNO1lBQ2IsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCLENBQUMsQ0FBQztRQUNNLFVBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQy9CLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDO1lBQ3BDLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1lBQzVDLEtBQUssRUFBRSxNQUFNO1lBQ2IsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7U0FFbkIsQ0FBQyxDQUFDO1FBQ00seUJBQW9CLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM5QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDOUMsQ0FBQyxDQUFDO1FBQ00sNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNsRCxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN4QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFDO2dCQUM3QyxNQUFNLEVBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUMsRUFBQztZQUMzRCxLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwQixDQUFDLENBQUM7UUFDTSxvQkFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDekMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BCLE1BQU0sRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBQztnQkFFM0MsR0FBRyxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFDLEVBQUM7WUFFakQsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztTQUM5QixDQUFDLENBQUM7UUFDTSxXQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNoQyxFQUFFLEVBQUUsSUFBSTtZQUdSLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLENBQUMsZUFBZSxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDN0IsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2xELENBQUMsQ0FBQztRQUNNLGNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ25DLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDaEMsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQztTQUNwRCxDQUFDLENBQUM7UUFDTSxnQkFBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDckMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNULEtBQUssRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxlQUFlO3dCQUN6QixTQUFTLENBQUMsdUJBQXVCLENBQUMsRUFBQyxFQUFDO1lBQ2xFLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sY0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDbkMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUM7WUFDcEMsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDcEIsTUFBTSxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVc7d0JBQ3JCLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFDLEVBQUM7WUFDOUQsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUN0QixDQUFDLENBQUM7UUFDTSxhQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNsQyxFQUFFLEVBQUUsSUFBSTtZQUVSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFFLEVBQUM7WUFDcEIsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7WUFDaEQsSUFBSSxFQUFFLGNBQWM7U0FDckIsQ0FBQyxDQUFDO1FBRU0sbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sWUFBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDakMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSw2QkFBd0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2xELEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00saUJBQVksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3RDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00saUJBQVksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3RDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00scUJBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUMxQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsU0FBUyxFQUFFLFFBQVE7WUFDbkIsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztZQUNwQyxRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBRXJCLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBQyxLQUFLLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztTQUM5QyxDQUFDLENBQUM7UUFDTSxpQkFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDdEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BCLE1BQU0sRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXO3dCQUNyQixTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUM7Z0JBQzNDLEdBQUcsRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRO3dCQUNsQixTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUMsRUFBQztZQUNqRCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN0QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxFQUFDLEVBQUM7WUFDMUQsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxtQkFBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDeEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxpQkFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDdEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNULEtBQUssRUFBRSxFQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxlQUFlO3dCQUN6QixTQUFTLENBQUMsdUJBQXVCLENBQUMsRUFBQyxFQUFDO1lBQ2xFLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00saUJBQVksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3RDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLGFBQWEsQ0FBQztZQUNuRCxRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDaEMsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDO1NBQ3ZFLENBQUMsQ0FBQztRQUNNLGVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3BDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDO1lBQ3BDLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFFaEMsR0FBRyxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxFQUFDLEVBQUM7WUFDeEQsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBQ00sb0JBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3pDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixTQUFTLEVBQUUsUUFBUTtZQUNuQixJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDO1lBQ3BDLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFFckIsSUFBSSxFQUFFLGNBQWM7WUFDcEIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1lBQ2IsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3RFLENBQUMsQ0FBQztRQUNNLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUV4QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtZQUViLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQztZQUMvRCxJQUFJLEVBQUUsYUFBYTtTQUNwQixDQUFDLENBQUM7UUFDTSxZQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNqQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtZQUNiLEdBQUcsRUFBRSxRQUFRO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixTQUFTLEVBQUUsS0FBSztZQUNoQixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUNuQixLQUFLLEVBQUUsTUFBTTtZQUNiLElBQUksRUFBRSxJQUFJO1NBRVgsQ0FBQyxDQUFDO1FBQ00sZ0JBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3JDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sNEJBQXVCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNqRCxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUdyQixLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM3QixDQUFDLENBQUM7UUFDTSxlQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNwQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDcEIsTUFBTSxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVc7d0JBQ3JCLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBQyxFQUFDO1lBQ3ZELEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sVUFBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUM7WUFDckMsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFFcEIsTUFBTSxFQUFFLEVBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFDO2dCQUMzQyxHQUFHLEVBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUMsRUFBQztZQUNqRCxLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDO1NBQ3RCLENBQUMsQ0FBQztRQUNNLFdBQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1lBQ3JELEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sV0FBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDaEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUM7WUFDckQsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxXQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNoQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQztZQUNyRCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLFdBQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1lBQ3JELEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM1QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7U0FFbkQsQ0FBQyxDQUFDO1FBQ00sNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNsRCxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDN0IsQ0FBQyxDQUFDO1FBQ00sa0JBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3ZDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1lBQ2IsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM1QixDQUFDLENBQUM7UUFDTSxvQkFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDekMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUV0QixDQUFDLENBQUM7UUFDTSxtQkFBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDeEMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDO1NBQzNCLENBQUMsQ0FBQztRQUNNLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN6QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLENBQUMsZUFBZSxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztTQUNyRCxDQUFDLENBQUM7UUFDTSxvQkFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDekMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLFNBQVMsRUFBRSxRQUFRO1lBQ25CLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLE1BQU07WUFDYixPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUM7WUFDcEIsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCLENBQUMsQ0FBQztRQUNNLHFCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDMUMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFJckIsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxjQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNuQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNNLGVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3BDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQTs7O1lBR0Y7WUFDUixJQUFJLEVBQUUsYUFBYTtZQUNuQixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxNQUFNO1NBQ2QsQ0FBQyxDQUFDO1FBQ00sZUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDcEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxtQkFBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDeEMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsSUFBSSxDQUFBOzs7WUFHRjtZQUNSLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFDTSxjQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNuQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxJQUFJLENBQUE7OztZQUdGO1lBQ1IsSUFBSSxFQUFFLGFBQWE7WUFDbkIsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsTUFBTTtZQUNiLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUVwQixDQUFDLENBQUM7UUFDTSxrQkFBYSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDdkMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDO1NBQzNCLENBQUMsQ0FBQztRQUNNLFNBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsQ0FBQyxlQUFlLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEMsSUFBSSxFQUFFLGNBQWM7U0FDckIsQ0FBQyxDQUFDO1FBRU0sV0FBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDaEMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDO1NBQzNCLENBQUMsQ0FBQztRQUNNLGtCQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN2QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUM7U0FDM0IsQ0FBQyxDQUFDO1FBQ00sd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM3QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFFckIsS0FBSyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN6RCxDQUFDLENBQUM7UUFDTSx5QkFBb0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzlDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsQ0FBQyxlQUFlLEVBQUUsRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQy9DLENBQUMsQ0FBQztRQUNNLDJCQUFzQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDaEQsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDMUIsQ0FBQyxDQUFDO1FBQ00sVUFBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBQ3JCLEtBQUssRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM5RCxDQUFDLENBQUM7UUFDTSxzQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzNDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsQ0FBQyxlQUFlLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdkMsQ0FBQyxDQUFDO1FBQ00sa0JBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3ZDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsQ0FBQyxlQUFlLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM1RCxDQUFDLENBQUM7UUFDTSxhQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNsQyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7WUFDckIsS0FBSyxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUM7U0FDM0IsQ0FBQyxDQUFDO1FBQ00sU0FBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDO1lBR3JCLEtBQUssRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7U0FDeEMsQ0FBQyxDQUFDO1FBQ00sbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUNyQixLQUFLLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO1NBQzlDLENBQUMsQ0FBQztRQUNNLHlCQUFvQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFOUMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBRSxFQUFDO1lBQ3BCLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3pDLENBQUMsQ0FBQztRQUNNLHdCQUFtQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFN0MsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFDLEVBQUM7WUFDdEMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3pDLENBQUMsQ0FBQztRQUNNLHlCQUFvQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFOUMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFDLEVBQUM7WUFDdEMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDekMsQ0FBQyxDQUFDO1FBQ00sbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRXhDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFlBQVksRUFBQyxFQUFDO1lBQ3RDLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQzdELENBQUMsQ0FBQztRQUNNLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUV6QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxZQUFZLEVBQUMsRUFBQztZQUN0QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDbEQsQ0FBQyxDQUFDO1FBQ00sNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUVsRCxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxZQUFZLEVBQUMsRUFBQztZQUN0QyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUMvRCxDQUFDLENBQUM7UUFDTSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRS9DLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFlBQVksRUFBQyxFQUFDO1lBQ3RDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3pDLENBQUMsQ0FBQztRQUNNLHNCQUFpQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFM0MsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFDLEVBQUM7WUFDdEMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDOUQsQ0FBQyxDQUFDO1FBQ00sYUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFbEMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQztTQUM5QyxDQUFDLENBQUM7UUFDTSxhQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUVsQyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO1NBQzFFLENBQUMsQ0FBQztRQUNNLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUV4QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUM7U0FDbkQsQ0FBQyxDQUFDO1FBQ00sbUJBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRXhDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxFQUFDO1lBQ2xDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQzlELENBQUMsQ0FBQztRQUNNLFNBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBQztZQUVyQixLQUFLLEVBQUUsQ0FBQyxFQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQztvQkFDeEMsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7U0FDdkMsQ0FBQyxDQUFDO1FBQ00sb0JBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRXpDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxFQUFDO1lBQ2xDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQztnQkFDbkIsUUFBUSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCLENBQUMsQ0FBQztRQUNNLDZCQUF3QixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFbEQsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFDLEVBQUM7WUFDcEMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUNNLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUV0QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxVQUFVLEVBQUMsRUFBQztZQUNwQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztTQUNwRCxDQUFDLENBQUM7UUFDTSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRTVDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBQyxFQUFDO1lBQ3BDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNsRCxDQUFDLENBQUM7UUFDTSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRTFDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBQyxFQUFDO1lBQ3BDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztTQUMvQixDQUFDLENBQUM7UUFDTSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRW5ELEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBQyxFQUFDO1lBQ3BDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNyRCxDQUFDLENBQUM7UUFDTSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRTFDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxFQUFDO1lBQ2xDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3pDLENBQUMsQ0FBQztRQUNNLHVCQUFrQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFNUMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3hDLENBQUMsQ0FBQztRQUNNLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUV0QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUN6QyxDQUFDLENBQUM7UUFDTSxpQkFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFdEMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2pFLENBQUMsQ0FBQztRQUNNLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUV0QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEIsQ0FBQyxDQUFDO1FBQ00sdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUU1QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0MsQ0FBQyxDQUFDO1FBQ00sZUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFFcEMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCLENBQUMsQ0FBQztRQUNNLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUVyQyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBQztZQUNsQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FD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LENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuLy9pbXBvcnQge1NjcmVlbn0gZnJvbSAnLi9zY3JlZW4uanMnO1xuaW1wb3J0IHtNdXRhYmxlfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbiwgVWlkfSBmcm9tICcuL21ldGFzY3JlZW4uanMnO1xuaW1wb3J0IHtNZXRhc2NyZWVuRGF0YSwgYm90dG9tRWRnZSwgYm90dG9tRWRnZUhvdXNlLCBjYXZlLCBkb29yLCBkb3duU3RhaXIsXG4gICAgICAgIGljb24sIGxlZnRFZGdlLCByZWFkU2NyZWVuLFxuICAgICAgICByaWdodEVkZ2UsIHNlYW1sZXNzRG93biwgc2VhbWxlc3NVcCwgdG9wRWRnZSwgdXBTdGFpciwgd2F0ZXJmYWxsQ2F2ZSxcbiAgICAgICB9IGZyb20gJy4vbWV0YXNjcmVlbmRhdGEuanMnO1xuaW1wb3J0IHtNZXRhdGlsZXNldCwgTWV0YXRpbGVzZXRzfSBmcm9tICcuL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7U2NyZWVuRml4LCB3aXRoUmVxdWlyZX0gZnJvbSAnLi9zY3JlZW5maXguanMnO1xuXG4vLyAvLyBCQVNJQyBQTEFOOiBTY3JlZW4gaXMgdGhlIHBoeXNpY2FsIGFycmF5LCBNZXRhc2NyZWVuIGhhcyB0aGUgZXh0cmEgaW5mby5cbi8vIC8vICAgICAgICAgICAgIE9ubHkgTWV0YXNjcmVlbiBpcyB0aWVkIHRvIHNwZWNpZmljIChNZXRhKXRpbGVzZXRzLlxuXG4vLyAvKipcbi8vICAqIEFkZHMgYSBmbGFnLXRvZ2dsYWJsZSB3YWxsIGludG8gYSBsYWJ5cmludGggc2NyZWVuLlxuLy8gICogQHBhcmFtIGJpdCAgICAgVW5pcXVlIG51bWJlciBmb3IgZWFjaCBjaG9pY2UuIFVzZSAtMSBmb3IgdW5jb25kaXRpb25hbC5cbi8vICAqIEBwYXJhbSB2YXJpYW50IDAgb3IgMSBmb3IgZWFjaCBvcHRpb24uIFVzZSAwIHdpdGggYml0PS0xIGZvciB1bmNvbmRpdGlvbmFsLlxuLy8gICogQHBhcmFtIGZsYWcgICAgUG9zaXRpb24ocykgb2YgZmxhZyB3YWxsLlxuLy8gICogQHBhcmFtIHVuZmxhZyAgUG9zaXRpb24ocykgb2YgYW4gZXhpc3Rpbmcgd2FsbCB0byByZW1vdmUgY29tcGxldGVseS5cbi8vICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0byBnZW5lcmF0ZSB0aGUgdmFyaWFudC5cbi8vICAqL1xuLy8gZnVuY3Rpb24gbGFieXJpbnRoVmFyaWFudChwYXJlbnRGbjogKHM6IE1ldGFzY3JlZW5zKSA9PiBNZXRhc2NyZWVuLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBiaXQ6IG51bWJlciwgdmFyaWFudDogMHwxLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnOiBudW1iZXJ8bnVtYmVyW10sIHVuZmxhZz86IG51bWJlcnxudW1iZXJbXSkge1xuLy8gICByZXR1cm4gKHM6IE1ldGFzY3JlZW4sIHNlZWQ6IG51bWJlciwgcm9tOiBSb20pOiBib29sZWFuID0+IHtcbi8vICAgICAvLyBjaGVjayB2YXJpYW50XG4vLyAgICAgaWYgKCgoc2VlZCA+Pj4gYml0KSAmIDEpICE9PSB2YXJpYW50KSByZXR1cm4gZmFsc2U7XG4vLyAgICAgY29uc3QgcGFyZW50ID0gcGFyZW50Rm4ocm9tLm1ldGFzY3JlZW5zKTtcbi8vICAgICBmb3IgKGNvbnN0IHBvcyBvZiB0eXBlb2YgZmxhZyA9PT0gJ251bWJlcicgPyBbZmxhZ10gOiBmbGFnKSB7XG4vLyAgICAgICByb20uc2NyZWVuc1tzLmRhdGEuaWRdLnNldDJkKHBvcywgW1sweDE5LCAweDE5XSwgWzB4MWIsIDB4MWJdXSk7XG4vLyAgICAgfVxuLy8gICAgIGZvciAoY29uc3QgcG9zIG9mIHR5cGVvZiB1bmZsYWcgPT09ICdudW1iZXInID8gW3VuZmxhZ10gOiB1bmZsYWcgfHwgW10pIHtcbi8vICAgICAgIHJvbS5zY3JlZW5zW3MuZGF0YS5pZF0uc2V0MmQocG9zLCBbWzB4YzUsIDB4YzVdLCBbMHhkMCwgMHhjNV1dKTtcbi8vICAgICB9XG4vLyAgICAgaWYgKHMuZmxhZyAhPT0gJ2Fsd2F5cycpIHtcbi8vICAgICAgIC8vIHBhcmVudCBpcyBhIG5vcm1hbGx5LW9wZW4gc2NyZWVuIGFuZCB3ZSdyZSBjbG9zaW5nIGl0LlxuLy8gICAgICAgcGFyZW50LmZsYWcgPSAnYWx3YXlzJztcbi8vICAgICB9IGVsc2UgaWYgKHVuZmxhZyAhPSBudWxsKSB7XG4vLyAgICAgICAvLyBwYXJlbnQgaXMgdGhlIG90aGVyIGFsdGVybmF0aXZlIC0gZGVsZXRlIGl0LlxuLy8gICAgICAgcGFyZW50LnJlbW92ZSgpO1xuLy8gICAgIH1cbi8vICAgICByZXR1cm4gdHJ1ZTsgICAgXG4vLyAgIH07XG4vLyB9XG5cbi8vIGV4dGVuZHMgU2V0PE1ldGFzY3JlZW4+ID8/P1xuZXhwb3J0IGNsYXNzIE1ldGFzY3JlZW5zIHtcblxuICByZWFkb25seSBbaW5kZXg6IG51bWJlcl06IE1ldGFzY3JlZW47XG4gIHJlYWRvbmx5IGxlbmd0aCA9IDA7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzY3JlZW5zQnlGaXggPSBuZXcgRGVmYXVsdE1hcDxTY3JlZW5GaXgsIE1ldGFzY3JlZW5bXT4oKCkgPT4gW10pO1xuICBwcml2YXRlIHJlYWRvbmx5IHNjcmVlbnNCeUlkID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBNZXRhc2NyZWVuW10+KCgpID0+IFtdKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHsgLy8gYWRkIG5hbWVzXG4gICAgICBjb25zdCB2YWwgPSB0aGlzW2tleV07XG4gICAgICBpZiAodmFsIGluc3RhbmNlb2YgTWV0YXNjcmVlbikgdmFsLm5hbWUgPSBrZXk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBtZXRhc2NyZWVuKGRhdGE6IE1ldGFzY3JlZW5EYXRhKTogTWV0YXNjcmVlbiB7XG4gICAgY29uc3QgbXV0ID0gdGhpcyBhcyBNdXRhYmxlPHRoaXM+O1xuICAgIGNvbnN0IHNjcmVlbiA9IG5ldyBNZXRhc2NyZWVuKHRoaXMucm9tLCBtdXQubGVuZ3RoIGFzIFVpZCwgZGF0YSk7XG4gICAgbXV0W211dC5sZW5ndGgrK10gPSBzY3JlZW47XG4gICAgdGhpcy5zY3JlZW5zQnlJZC5nZXQoc2NyZWVuLnNpZCkucHVzaChzY3JlZW4pO1xuICAgIGZvciAoY29uc3QgdGlsZXNldE5hbWUgaW4gZGF0YS50aWxlc2V0cykge1xuICAgICAgY29uc3Qga2V5ID0gdGlsZXNldE5hbWUgYXMga2V5b2YgTWV0YXRpbGVzZXRzO1xuICAgICAgY29uc3QgdGlsZXNldERhdGEgPSBkYXRhLnRpbGVzZXRzW2tleV0hO1xuICAgICAgaWYgKHRpbGVzZXREYXRhLnJlcXVpcmVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZml4IG9mIHRpbGVzZXREYXRhLnJlcXVpcmVzKSB7XG4gICAgICAgICAgdGhpcy5zY3JlZW5zQnlGaXguZ2V0KGZpeCkucHVzaChzY3JlZW4pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAodGhpcy5yb20ubWV0YXRpbGVzZXRzW2tleV0gYXMgTWV0YXRpbGVzZXQpLmFkZFNjcmVlbihzY3JlZW4pXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzY3JlZW47XG4gIH1cblxuICBnZXRCeUlkKGlkOiBudW1iZXIsIHRpbGVzZXQ/OiBudW1iZXIpOiBNZXRhc2NyZWVuW10ge1xuICAgIGxldCBvdXQgPSB0aGlzLnNjcmVlbnNCeUlkLmhhcyhpZCkgPyBbLi4udGhpcy5zY3JlZW5zQnlJZC5nZXQoaWQpXSA6IFtdO1xuICAgIGlmICh0aWxlc2V0ICE9IG51bGwpIHtcbiAgICAgIG91dCA9IG91dC5maWx0ZXIocyA9PiBzLmlzQ29tcGF0aWJsZVdpdGhUaWxlc2V0KHRpbGVzZXQpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHJlZ2lzdGVyRml4KGZpeDogU2NyZWVuRml4LCBzZWVkPzogbnVtYmVyKSB7XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5zY3JlZW5zQnlGaXguZ2V0KGZpeCkpIHtcbiAgICAgIC8vIExvb2sgZm9yIGFuIHVwZGF0ZSBzY3JpcHQgYW5kIHJ1biBpdCBmaXJzdC4gIElmIGl0IHJldHVybnMgZmFsc2UgdGhlblxuICAgICAgLy8gY2FuY2VsIHRoZSBvcGVyYXRpb24gb24gdGhpcyBzY3JlZW4uXG4gICAgICBjb25zdCB1cGRhdGUgPVxuICAgICAgICAgIChzY3JlZW4uZGF0YS51cGRhdGUgfHwgW10pLmZpbmQoKHVwZGF0ZSkgPT4gdXBkYXRlWzBdID09PSBmaXgpO1xuICAgICAgaWYgKHVwZGF0ZSkge1xuICAgICAgICBpZiAoc2VlZCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFNlZWQgcmVxdWlyZWQgZm9yIHVwZGF0ZWApO1xuICAgICAgICBpZiAoIXVwZGF0ZVsxXShzY3JlZW4sIHNlZWQsIHRoaXMucm9tKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBGb3IgZWFjaCB0aWxlc2V0LCByZW1vdmUgdGhlIHJlcXVpcmVtZW50LCBhbmQgaWYgaXQncyBlbXB0eSwgYWRkIHRoZVxuICAgICAgLy8gc2NyZWVuIHRvIHRoZSB0aWxlc2V0LlxuICAgICAgZm9yIChjb25zdCB0aWxlc2V0TmFtZSBpbiBzY3JlZW4uZGF0YS50aWxlc2V0cykge1xuICAgICAgICBjb25zdCBrZXkgPSB0aWxlc2V0TmFtZSBhcyBrZXlvZiBNZXRhdGlsZXNldHM7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBzY3JlZW4uZGF0YS50aWxlc2V0c1trZXldITtcbiAgICAgICAgaWYgKCFkYXRhLnJlcXVpcmVzKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaW5kZXggPSBkYXRhLnJlcXVpcmVzLmluZGV4T2YoZml4KTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCkgY29udGludWU7XG4gICAgICAgIGRhdGEucmVxdWlyZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgaWYgKCFkYXRhLnJlcXVpcmVzLmxlbmd0aCkge1xuICAgICAgICAgICh0aGlzLnJvbS5tZXRhdGlsZXNldHNba2V5XSBhcyBNZXRhdGlsZXNldCkuYWRkU2NyZWVuKHNjcmVlbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlIHRoZSBzY3JlZW4gd2hvc2UgY3VycmVudCBpZCBpcyBgb2xkSWRgIHRvIGhhdmUgYG5ld0lkYCBhcyBpdHNcbiAgICogc2NyZWVuIElELiAgVXBkYXRlcyBhbGwgcmVsZXZhbnQgbGlua3MuICBgbmV3SWRgIG11c3Qgbm90IGJlIHVzZWQgYnlcbiAgICogYW55IGV4aXN0aW5nIG1ldGFzY3JlZW5zLlxuICAgKi9cbiAgcmVudW1iZXIob2xkSWQ6IG51bWJlciwgbmV3SWQ6IG51bWJlcikge1xuICAgIGNvbnNvbGUubG9nKGByZW51bWJlciAke29sZElkfSAtPiAke25ld0lkfWApO1xuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnNjcmVlbnNCeUlkLmdldChuZXdJZCk7XG4gICAgaWYgKGRlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYElEIGFscmVhZHkgdXNlZDogJHtuZXdJZH06ICR7ZGVzdH1gKTtcbiAgICBsZXQgc291cmNlRGVmaW5pdGlvbjogVWludDhBcnJheXx1bmRlZmluZWQ7XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGhpcy5nZXRCeUlkKG9sZElkKSkge1xuICAgICAgaWYgKHNjcmVlbi5kYXRhLmRlZmluaXRpb24pIHtcbiAgICAgICAgc291cmNlRGVmaW5pdGlvbiA9IHNjcmVlbi5kYXRhLmRlZmluaXRpb247XG4gICAgICAgIHNjcmVlbi5kYXRhLmRlZmluaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBzY3JlZW4udW5zYWZlU2V0SWQobmV3SWQpO1xuICAgICAgZGVzdC5wdXNoKHNjcmVlbik7XG4gICAgfVxuICAgIHRoaXMuc2NyZWVuc0J5SWQuZGVsZXRlKG9sZElkKTtcbiAgICAvLyBUT0RPIC0gc2hvdWxkIHRoaXMgYmUgZW5jYXBzdWxhdGVkIGluIFNjcmVlbnM/IHByb2JhYmx5Li4uXG4gICAgY29uc3Qgb2xkU2NyZWVuID0gdGhpcy5yb20uc2NyZWVucy5nZXRTY3JlZW4ob2xkSWQpO1xuICAgIGlmIChvbGRJZCA+PSAwICYmIG5ld0lkIDwgMCkgeyAvLyBiYWNrIHVwIHRoZSBvbGQgc2NyZWVuXG4gICAgICBkZXN0WzBdLmRhdGEuZGVmaW5pdGlvbiA9IFVpbnQ4QXJyYXkuZnJvbShvbGRTY3JlZW4udGlsZXMpO1xuICAgIH1cbiAgICBjb25zdCBjbG9uZSA9IG9sZFNjcmVlbi5jbG9uZShuZXdJZCk7XG4gICAgdGhpcy5yb20uc2NyZWVucy5zZXRTY3JlZW4obmV3SWQsIGNsb25lKTtcbiAgICBvbGRTY3JlZW4udXNlZCA9IGZhbHNlO1xuICAgIGlmIChvbGRJZCA8IDApIHtcbiAgICAgIHRoaXMucm9tLnNjcmVlbnMuZGVsZXRlU2NyZWVuKG9sZElkKTtcbiAgICAgIGlmIChzb3VyY2VEZWZpbml0aW9uICYmIG5ld0lkID49IDApIHtcbiAgICAgICAgY2xvbmUudGlsZXMgPSBBcnJheS5mcm9tKHNvdXJjZURlZmluaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJvbS5sb2NhdGlvbnMucmVudW1iZXJTY3JlZW4ob2xkSWQsIG5ld0lkKTtcbiAgfVxuXG4gIHJlYWRvbmx5IG92ZXJ3b3JsZEVtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHwgICB8ICAgJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICAvLyBib3VuZGFyeVdfdHJlZXM6ID8/P1xuICByZWFkb25seSBib3VuZGFyeVdfdHJlZXMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDAxLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paMIHxcbiAgICAgIHzilojiloxefFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlOiAnIG9vfCBvb3wgb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2Nrc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhVHJlZXNdfX0sXG4gICAgZWRnZXM6ICc+ID5vJywgLy8gbyA9IG9wZW5cbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4paMIHxgLFxuICAgIHRpbGU6ICcgb298IG9vfCBvbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc+ID5vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5RV9yb2NrcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwu4paQ4paIfFxuICAgICAgfCDilpDiloh8XG4gICAgICB8LuKWkOKWiHxgLFxuICAgIHRpbGU6ICdvbyB8b28gfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX0sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFSb2Nrc119fSxcbiAgICBlZGdlczogJzxvPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpDiloh8XG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwg4paQ4paIfGAsXG4gICAgdGlsZTogJ29vIHxvbyB8b28gJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzxvPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgbG9uZ0dyYXNzUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHx2diB8XG4gICAgICB8IHZ2fFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvbG98b29vfCAgICcsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge30sXG4gICAgICAgICAgICAgICBncmFzczoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkdyYXNzTG9uZ0dyYXNzXX19LFxuICAgIGVkZ2VzOiAnbG9vbycsIC8vIGwgPSBsb25nIGdyYXNzXG4gIH0pO1xuICByZWFkb25seSBsb25nR3Jhc3NOID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgdnZ8XG4gICAgICB8dnYgfGAsXG4gICAgdGlsZTogJyAgIHxvb298b2xvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGdyYXNzOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NdfX0sXG4gICAgZWRnZXM6ICdvb2xvJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5U19yb2NrcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MDcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgLiB8XG4gICAgICB84paE4paE4paEfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICdvb298b29vfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX0sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFSb2Nrc119fSxcbiAgICBlZGdlczogJ29eIF4nLFxuICB9KTtcbiAgcmVhZG9ubHkgZm9ydHJlc3NUb3duRW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oeyAvLyBnb2FcbiAgICBpZDogMHgwOCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojiiKniloh8XG4gICAgICB8ICAgfGAsXG4gICAgLy8gVE9ETyAtIGVudHJhbmNlIVxuICAgIC8vIFRPRE8gLSByaWdodCBlZGdlIHdhbnRzIHRvcC1oYWxmIG1vdW50YWluOyBsZWZ0IGVkZ2UgdG9wIGNhbiBoYXZlXG4gICAgLy8gICAgICAgIGFueSB0b3AgaGFsZiAoYm90dG9tIGhhbGYgcGxhaW4pLCB0b3AgZWRnZSBjYW4gaGF2ZSBhbnlcbiAgICAvLyAgICAgICAgbGVmdC1oYWxmIChyaWdodC1oYWxmIG1vdW50YWluKVxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogWycgICB8b0ZvfG9vbycsICdvbyB8b0ZvfG9vbyddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICBlZGdlczogJyB2b3YnLFxuICAgIGV4aXRzOiBbey4uLnVwU3RhaXIoMHhhNiwgMyksIHR5cGU6ICdmb3J0cmVzcyd9XSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmRTRV9sb25nR3Jhc3MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDA5LFxuICAgIGljb246IGljb25g4paXXG4gICAgICB8IHYgfFxuICAgICAgfHZ24paEfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlOiAnb29vfG9vb3xvbyAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnb288XicsXG4gIH0pO1xuICByZWFkb25seSBleGl0V19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHsgLy8gbmVhciBzYWhhcmEsIGZvZyBsYW1wXG4gICAgaWQ6IDB4MGEsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB8ICDiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogWycgICB8bzwgfCAgICcsICcgICB8eDwgfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge30sXG4gICAgICAgICAgICAgICBzZWE6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5TZWFDYXZlRW50cmFuY2VdfX0sXG4gICAgZWRnZXM6ICcgbiAgJywgLy8gbiA9IG5hcnJvd1xuICAgIGV4aXRzOiBbY2F2ZSgweDQ4KSwgbGVmdEVkZ2Uoe3RvcDogNn0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmRORV9ncmFzc1JvY2tzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwYixcbiAgICBpY29uOiBpY29uYOKWnVxuICAgICAgfC7ilpDiloh8XG4gICAgICB8ICDiloB8XG4gICAgICB8Ozs7fGAsXG4gICAgdGlsZTogJ29vIHxvb298b2dvJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSxcbiAgICAgICAgICAgICAgIHJpdmVyOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguUml2ZXJTaG9ydEdyYXNzXX0sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRTaG9ydEdyYXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguRGVzZXJ0Um9ja3NdfX0sXG4gICAgZWRnZXM6ICc8b3N2JywgLy8gcyA9IHNob3J0IGdyYXNzXG4gIH0pO1xuICByZWFkb25seSBjb3JuZXJOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MGMsXG4gICAgaWNvbjogaWNvbmDilptcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paIIOKWgHxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZTogJyAgIHwgb298IG9vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJyAgPnYnLFxuICB9KTtcbiAgLy8gTk9URTogdGhpcyB2ZXJzaW9uIGhhcyBzbGlnaHRseSBuaWNlciBtb3VudGFpbnMgaW4gc29tZSBjYXNlcy5cbiAgcmVhZG9ubHkgb3ZlcndvcmxkRW1wdHlfYWx0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwYyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5JywgJ21hbnVhbCddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgbWF0Y2g6ICgpID0+IGZhbHNlLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lck5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwZCxcbiAgICBpY29uOiBpY29uYOKWnFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloDilojiloh8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGU6ICcgICB8b28gfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICcgdjwgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lclNXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwZSxcbiAgICBpY29uOiBpY29uYOKWmVxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4paI4paEfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgb298IG9vfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc+ICBeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lclNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgwZixcbiAgICBpY29uOiBpY29uYOKWn1xuICAgICAgfCDilpDiloh8XG4gICAgICB84paE4paI4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICdvbyB8b28gfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICc8XiAgJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXRFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMCxcbiAgICBpY29uOiBpY29uYOKVtlxuICAgICAgfCDilpDiloh8XG4gICAgICB8ICAgfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlOiBbJ29vIHxvb298b28gJywgJ29vIHxvb3h8b28gJ10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSxcbiAgICAgICAgICAgICAgIGRlc2VydDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkRlc2VydFJvY2tzXX19LFxuICAgIGVkZ2VzOiAnPG88bicsXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogNn0pXSxcbiAgICAvLyBUT0RPIC0gZWRnZVxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlOX3RyZWVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloDiloDiloB8XG4gICAgICB8IF4gfGAsXG4gICAgdGlsZTogJyAgIHxvb298b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhVHJlZXNdfX0sXG4gICAgZWRnZXM6ICcgdm92JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyaWRnZVRvUG9ydG9hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMixcbiAgICBpY29uOiBpY29uYOKVtFxuICAgICAgfOKVkCAgfFxuICAgICAgfOKVnuKVkOKVkHxcbiAgICAgIHzilIIgIHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJ3Jvb3wxcnJ8IG9vJywgLy8gVE9ETzogY2hlY2sgdGhpcyFcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgLy8gVE9ETyAtIHRoaXMgaXMgc3VwZXIgY3VzdG9tLCBubyBlZGdlcyBmb3IgaXQ/XG4gICAgLy8gSXQgbmVlZHMgc3BlY2lhbCBoYW5kbGluZywgYXQgbGVhc3QuXG4gICAgZmVhdHVyZTogWydwb3J0b2EzJ10sXG4gICAgZWRnZXM6ICcyKj5yJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDF9KV0sXG4gIH0pO1xuICByZWFkb25seSBzbG9wZUFib3ZlUG9ydG9hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHzilojihpPiloB8XG4gICAgICB84pSCICB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcg4oaTIHwgb298cm9vJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydwb3J0b2EyJ10sXG4gICAgZWRnZXM6ICcxKjJ2JyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQmVuZFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfHcgIHxcbiAgICAgIHwg4pWU4pWQfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZTogJ29vb3xvcnJ8b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdvb3JyJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5V19jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paI4oipIHxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZTogJyBvb3wgPG98IG9vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBkZXNlcnQ6IHt9LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnPiA+bycsXG4gICAgZXhpdHM6IFtjYXZlKDB4ODkpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNixcbiAgICBpY29uOiBpY29uYOKVtVxuICAgICAgfOKWiCDiloh8XG4gICAgICB84paAIOKWgHxcbiAgICAgIHwgXiB8YCxcbiAgICB0aWxlOiBbJyBvIHxvb298b29vJywgJyB4IHxvb298b29vJ10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgZGVzZXJ0OiB7fX0sIC8vIHNlYSBoYXMgbm8gbmVlZCBmb3IgZXhpdHM/XG4gICAgZWRnZXM6ICdudm92JyxcbiAgICBleGl0czogW3RvcEVkZ2UoKV0sXG4gICAgLy8gVE9ETyAtIGVkZ2VcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyV0Vfd29vZGVuQnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxNyxcbiAgICBpY29uOiBpY29uYOKVkFxuICAgICAgfCAgIHxcbiAgICAgIHzilZDilZHilZB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3xyb3J8b29vJywgLy8gVE9ETyAtIHNob3VsZCB0aGUgbWlkZGxlIGJlICdiJz9cbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdvcm9yJyxcbiAgICBleGl0czogW3NlYW1sZXNzVXAoMHg3NyksIHNlYW1sZXNzRG93bigweDg3KV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckJvdW5kYXJ5RV93YXRlcmZhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDE4LFxuICAgIGljb246IGljb25g4pWhXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHzilZDilZAvfFxuICAgICAgfCDilpDiloh8YCxcbiAgICB0aWxlOiAnb28gfHJyIHxvbyAnLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJzxyPCAnLFxuICB9KTtcbiAgcmVhZG9ubHkgYm91bmRhcnlFX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDE5LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHx24oip4paIfFxuICAgICAgfHbilpDiloh8YCxcbiAgICB0aWxlOiAnb28gfG88IHxvbyAnLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZ3Jhc3M6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5HcmFzc0xvbmdHcmFzc119LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0TG9uZ0dyYXNzXX19LFxuICAgIGVkZ2VzOiAnPG88ICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGV4aXRXX3NvdXRod2VzdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWEsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWgCDiloR8XG4gICAgICB84paE4paI4paIfGAsXG4gICAgdGlsZTogJyBvb3xCb298ICAgJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3NdfSxcbiAgICAgICAgICAgICAgIC8vIFNlYSBoYXMgbm8gbmVlZCBmb3IgdGhpcyBzY3JlZW4/ICBHbyB0byBzb21lIG90aGVyIGJlYWNoP1xuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3NdfX0sXG4gICAgLy8gTk9URTogdGhlIGVkZ2UgaXMgbm90ICduJyBiZWNhdXNlIGl0J3Mgb2ZmLWNlbnRlci5cbiAgICBlZGdlczogJz4qIF4nLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogMHhifSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbmFkYXJlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxYixcbiAgICAvL2ljb246ICc/JyxcbiAgICAvL21pZ3JhdGVkOiAweDIwMDAsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCksIGRvb3IoMHgyMyksXG4gICAgICAgICAgICBkb29yKDB4MjUsICdkb29yMicpLCBkb29yKDB4MmEsICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd25FeGl0VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWMsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilojilowgfFxuICAgICAgfOKWgCBefFxuICAgICAgfOKWiOKWjCB8YCxcbiAgICB0aWxlOiAnIG9vfDhvb3wgb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge319LFxuICAgIGVkZ2VzOiAnPm4+bycsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA4LCBoZWlnaHQ6IDMsIHNoaWZ0OiAtMC41fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hvcnRHcmFzc1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDFkLFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHw7Ozt8XG4gICAgICB8IHYgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICdvZ298b29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlJpdmVyU2hvcnRHcmFzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NSZW1hcHBpbmddfX0sXG4gICAgZWRnZXM6ICdzb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd25FeGl0UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MWUsXG4gICAgaWNvbjogaWNvbmDilbdcbiAgICAgIHwgXiB8XG4gICAgICB84paEIOKWhHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogWydvb298b29vfCBvICcsICdvb298b29vfCB4ICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRSb2NrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkRlc2VydFRvd25FbnRyYW5jZV19fSxcbiAgICBlZGdlczogJ29ebl4nLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW5HYXRlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgxZixcbiAgICAvL2ljb246ICc/JyxcbiAgICB0aWxlc2V0czoge3Rvd246IHt9fSxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDN9KSwgcmlnaHRFZGdlKHt0b3A6IDl9KV0sXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gIH0pOyBcblxuICByZWFkb25seSByaXZlckJyYW5jaE5TRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHwg4pWg4pWQfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZTogJ29yb3xvcnJ8b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdyb3JyJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDIxLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb29vfHJycnxvb28nLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ29yb3InLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCb3VuZGFyeVNfd2F0ZXJmYWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyMixcbiAgICBpY29uOiBpY29uYOKVqFxuICAgICAgfCDilZEgfFxuICAgICAgfOKWhOKVkeKWhHxcbiAgICAgIHzilogv4paIfGAsXG4gICAgdGlsZTogJ29yb3xvcm98ICAgJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdyXiBeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHw7Ozt8XG4gICAgICB8OyAgfFxuICAgICAgfDsgXnxgLFxuICAgIHRpbGU6ICdvZ298Z29vfG9vbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIGVkZ2VzOiAnc3NvbycsXG4gIH0pO1xuICByZWFkb25seSBzaG9ydEdyYXNzTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDI0LFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHw7ICB8XG4gICAgICB8O3YgfFxuICAgICAgfDs7O3xgLFxuICAgIHRpbGU6ICdvb298Z29vfG9nbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIGVkZ2VzOiAnb3NzbycsXG4gIH0pO1xuICByZWFkb25seSBzdG9tSG91c2VPdXRzaWRlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloziiKnilpB8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogWycgICB8IEggfCBvICcsICcgICB8IEggfCB4ICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9fSxcbiAgICAvLyBOT1RFOiBib3R0b20gZWRnZSBlbnRyYW5jZSBpcyBjbGV2ZXJseSBzaGlmdGVkIHRvIGFsaWduIHdpdGggdGhlIGRvb3IuXG4gICAgZXhpdHM6IFtkb29yKDB4NjgpLCBib3R0b21FZGdlKHtzaGlmdDogMC41fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZE5XX3RyZWVzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNixcbiAgICBpY29uOiBpY29uYOKWmFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paAIF58XG4gICAgICB8IF5efGAsXG4gICAgdGlsZTogJyBvb3xvb298b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0Um9ja3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5EZXNlcnRUcmVlc119LFxuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhUm9ja3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNjcmVlbkZpeC5TZWFUcmVlc119fSxcbiAgICBlZGdlczogJz52b28nLFxuICB9KTtcbiAgcmVhZG9ubHkgc2hvcnRHcmFzc1NXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgyNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfDs7O3xcbiAgICAgIHwgIDt8XG4gICAgICB8XiA7fGAsXG4gICAgdGlsZTogJ29nb3xvb2d8b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSxcbiAgICAgICAgICAgICAgIHJpdmVyOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguUml2ZXJTaG9ydEdyYXNzXX19LFxuICAgIGVkZ2VzOiAnc29vcycsXG4gIH0pO1xuICByZWFkb25seSByaXZlckJyYW5jaE5XUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHzilZDilaMgfFxuICAgICAgfCDilZEgfGAsXG4gICAgdGlsZTogJ29yb3xycm98b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdycnJvJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNob3J0R3Jhc3NOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MjksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgIDt8XG4gICAgICB8IHY7fFxuICAgICAgfDs7O3xgLFxuICAgIHRpbGU6ICdvb298b29nfG9nbycsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sXG4gICAgICAgICAgICAgICByaXZlcjoge3JlcXVpcmVzOiBbU2NyZWVuRml4LlJpdmVyU2hvcnRHcmFzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTY3JlZW5GaXguR3Jhc3NMb25nR3Jhc3NSZW1hcHBpbmddfX0sXG4gICAgZWRnZXM6ICdvb3NzJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHZhbGxleUJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmEsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfOKWm+KVkeKWnHxcbiAgICAgIHwg4pWRIHxcbiAgICAgIHzilpnilZHilp98YCxcbiAgICB0aWxlOiBbJyBvIHwgbyB8IG8gJywgJyB4IHwgbyB8IG8gJywgJyBvIHwgbyB8IHggJ10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICduIG4gJyxcbiAgICBleGl0czogW3NlYW1sZXNzVXAoMHg3NyksIHNlYW1sZXNzRG93bigweDg3KSwgdG9wRWRnZSgpLCBib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZXhpdFNfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmIsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paMIOKWkHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogWycgICB8IDwgfCBvICcsICcgICB8IDwgfCB4ICddLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIGRlc2VydDoge30sXG4gICAgICAgICAgICAgICAvLyBOb3QgcGFydGljdWxhcmx5IHVzZWZ1bCBzaW5jZSBubyBjb25uZWN0b3Igb24gc291dGggZW5kP1xuICAgICAgICAgICAgICAgc2VhOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnICBuICcsXG4gICAgZXhpdHM6IFtjYXZlKDB4NjcpLCBib3R0b21FZGdlKCldXG4gIH0pO1xuICByZWFkb25seSBvdXRzaWRlV2luZG1pbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDJjLFxuICAgIGljb246IGljb25g4pWzXG4gICAgICB84paI4paI4pWzfFxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiBbJyAgIHwgVyB8IG8gJywgJyAgIHwgVyB8IHggJ10sXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSAzIGV4aXRzLCBzcGF3biBmb3Igd2luZG1pbGwgYmxhZGVcbiAgICBmbGFnOiAnY3VzdG9tOmZhbHNlJyxcbiAgICBmZWF0dXJlOiBbJ3dpbmRtaWxsJ10sXG4gICAgZWRnZXM6ICcgIG4gJyxcbiAgICBleGl0czogW2NhdmUoMHg2MyksIGJvdHRvbUVkZ2UoKSwgZG9vcigweDg5LCAnd2luZG1pbGwnKSwgZG9vcigweDhjKV0sXG4gIH0pO1xuICByZWFkb25seSB0b3duRXhpdFdfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7IC8vIG91dHNpZGUgbGVhZlxuICAgIC8vIChUT0RPIC0gY29uc2lkZXIganVzdCBkZWxldGluZywgcmVwbGFjZSB3aXRoICQwYSkuXG4gICAgaWQ6IDB4MmQsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paE4paE4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8eDwgfCAgICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LCAvLyBjYXZlIGVudHJhbmNlIGJyZWFrcyByaXZlciBhbmQgb3RoZXJzLi4uXG4gICAgZWRnZXM6ICcgbiAgJyxcbiAgICAvLyBOT1RFOiBzcGVjaWFsIGNhc2UgdGhlIG9kZCBlbnRyYW5jZS9leGl0IGhlcmUgKHNob3VsZCBiZSA0YSlcbiAgICBleGl0czogW2NhdmUoMHg0YSksIGxlZnRFZGdlKHt0b3A6IDUsIGhlaWdodDogMywgc2hpZnQ6IC0wLjV9KV0sXG4gICAgZmxhZzogJ2N1c3RvbTp0cnVlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDJlLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB8IOKVkSB8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlOiAnb3JvfG9vb3xvcm8nLFxuICAgIHRpbGVzZXRzOiB7cml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3Jvcm8nLFxuICAgIG1vZDogJ2JyaWRnZScsXG4gIH0pO1xuICByZWFkb25seSByaXZlck5TX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MmYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pWRIHxcbiAgICAgIHx34pWPd3xcbiAgICAgIHwg4pWRIHxgLFxuICAgIHBsYWNlbWVudDogJ21vZCcsXG4gICAgdGlsZTogJ29yb3xvcm98b3JvJyxcbiAgICB0aWxlc2V0czoge3JpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydicmlkZ2UnXSxcbiAgICBlZGdlczogJ3Jvcm8nLFxuICAgIHdhbGw6IDB4NzcsXG4gICAgLy9tb2Q6ICdicmlkZ2UnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJCZW5kV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDMwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IHfilpx8XG4gICAgICB84pWQ4pWXd3xcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGU6ICdvbyB8cnJvfG9ybycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAnPHJydicsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeU5fd2F0ZXJmYWxsQ2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilpsv4paIfFxuICAgICAgfOKWmOKVkeKWgHxcbiAgICAgIHwg4pWRIHxgLFxuICAgIHRpbGU6ICcgICB8b3JvfG9ybycsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIC8vIFRPRE8gLSBmbGFnIHZlcnNpb24gd2l0aG91dCBlbnRyYW5jZT9cbiAgICAvLyAgLSB3aWxsIG5lZWQgYSB0aWxlc2V0IGZpeFxuICAgIGVkZ2VzOiAnIHZydicsXG4gICAgZXhpdHM6IFt3YXRlcmZhbGxDYXZlKDB4NzUpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9wZW5fdHJlZXMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDMyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IF4gfFxuICAgICAgfF4gXnxcbiAgICAgIHwgXiB8YCxcbiAgICB0aWxlOiAnb29vfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sXG4gICAgICAgICAgICAgICBkZXNlcnQ6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5EZXNlcnRUcmVlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2NyZWVuRml4LkRlc2VydFJvY2tzXX19LFxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBleGl0UyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzMsXG4gICAgaWNvbjogaWNvbmDilbdcbiAgICAgIHwgdyB8XG4gICAgICB84paEIOKWhHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogWydvb298b29vfCBvICcsICdvb298b29vfCB4IHwnXSxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LFxuICAgICAgICAgICAgICAgLy8gTk9URTogVGhlc2UgZml4ZXMgYXJlIG5vdCBsaWtlbHkgdG8gZXZlciBsYW5kLlxuICAgICAgICAgICAgICAgZGVzZXJ0OiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguRGVzZXJ0TWFyc2hdfSxcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYU1hcnNoXX19LFxuICAgIGVkZ2VzOiAnb15uXicsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVuZE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzNCxcbiAgICBpY29uOiBpY29uYOKWmFxuICAgICAgfOKWiOKWjCB8XG4gICAgICB84paA4paAIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIG9vfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPnZvbycsXG4gIH0pO1xuICByZWFkb25seSBiZW5kTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDM1LFxuICAgIGljb246IGljb25g4padXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHwgIOKWgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb28gfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIGVkZ2VzOiAnPG9vdicsXG4gIH0pO1xuICByZWFkb25seSBiZW5kU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDM2LFxuICAgIGljb246IGljb25g4paXXG4gICAgICB8ICAgfFxuICAgICAgfCDiloTiloR8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGU6ICdvb298b29vfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge30sIHJpdmVyOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fX0sXG4gICAgZWRnZXM6ICdvbzxeJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlbmRXUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MzcsXG4gICAgaWNvbjogaWNvbmDilpZcbiAgICAgIHwgICB8XG4gICAgICB84paE4paEIHxcbiAgICAgIHzilojilowgfGAsXG4gICAgdGlsZTogJ29vb3xvb298IG9vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJ29ePm8nLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJQbGFpbl91cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzOCxcbiAgICBpY29uOiBpY29uYOKUtFxuICAgICAgfCDilIogfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIHQgfHR0dHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJ3N0IHQnLFxuICAgIGV4aXRzOiBbc2VhbWxlc3NEb3duKDB4MDgsIDIpLCB0b3BFZGdlKHtsZWZ0OiA4fSldLFxuICAgIC8vIFRPRE8gLSBhbm5vdGF0ZSBwb3NzaWJsZSBzdGFpcndheSB3LyBmbGFnP1xuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJSb2JvdERvb3JfZG93blN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzOSxcbiAgICBpY29uOiBpY29uYOKUrFxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSKIHxgLFxuICAgIHRpbGU6ICcgICB8dHR0fCB0ICcsXG4gICAgdGlsZXNldHM6IHt0b3dlcjoge319LFxuICAgIGVkZ2VzOiAnIHRzdCcsXG4gICAgZXhpdHM6IFtzZWFtbGVzc1VwKDB4ZTgsIDIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyRHluYURvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNhLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSU4pSs4pSYfFxuICAgICAgfCDilIogfGAsXG4gICAgdGlsZTogJyAgIHwgPCB8IHQgJyxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZWRnZXM6ICcgIHMgJyxcbiAgICBleGl0czogW2NhdmUoMHg2NywgJ2Rvb3InKV0sXG4gIH0pO1xuICByZWFkb25seSB0b3dlckxvbmdTdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUiiB8XG4gICAgICB8IOKUiiB8XG4gICAgICB8IOKUiiB8YCxcbiAgICB0aWxlOiAnIHQgfCB0IHwgdCAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJ3MgcyAnLFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSgpXSxcbiAgICAvLyBUT0RPIC0gY29ubmVjdGlvbnNcbiAgfSk7XG4gIHJlYWRvbmx5IHRvd2VyTWVzaWFSb29tID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzYyxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSB0b3dlclRlbGVwb3J0ZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNkLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBjYXZlKDB4NTcsICd0ZWxlcG9ydGVyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgY2F2ZUFib3ZlUG9ydG9hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHgzZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnICAgfCA8IHwg4oaTICcsXG4gICAgdGlsZXNldHM6IHtyaXZlcjoge319LFxuICAgIGVkZ2VzOiAnICAxICcsXG4gICAgZmVhdHVyZTogWydwb3J0b2ExJ10sXG4gICAgZXhpdHM6IFtjYXZlKDB4NjYpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lck5FX2Zsb3dlcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDNmLFxuICAgIGljb246IGljb25g4pacXG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWgCriloh8XG4gICAgICB8IOKWkOKWiHxgLFxuICAgIHRpbGU6ICcgICB8b28gfG9vICcsXG4gICAgdGlsZXNldHM6IHtncmFzczoge319LFxuICAgIC8vIE5PVEU6IGNvdWxkIGV4dGVuZCB0aGlzIHRvIGRlc2VydC9ldGMgYnkgc3dhcHBpbmcgdGhlIDdlLzdmIHRpbGVzXG4gICAgLy8gd2l0aCBlLmcuIGEgd2luZG1pbGwgb3IgY2FzdGxlIHRpbGUgdGhhdCdzIG5vdCB1c2VkIGluIDljLCBidXRcbiAgICAvLyB3ZSBzdGlsbCBkb24ndCBoYXZlIGEgZ29vZCBzcHJpdGUgdG8gdXNlIGZvciBpdC4uLlxuICAgIGVkZ2VzOiAnIHY8ICcsXG4gIH0pO1xuICByZWFkb25seSB0b3dlckVkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQwLFxuICAgIGljb246IGljb25gIHxcbiAgICAgIHwgICB8XG4gICAgICB84pSkIOKUnHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHQgdHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0IHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJFZGdlVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDAsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfCAgIHxcbiAgICAgIHzilKQgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHQgIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0ICAnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJFZGdlRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDAsXG4gICAgaWNvbjogaWNvbmAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgIOKUnHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCAgdHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgIHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJSb2JvdERvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQxLFxuICAgIGljb246IGljb25g4pSAXG4gICAgICB8IE8gfFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHR0dHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0IHQnLFxuICB9KTtcbiAgcmVhZG9ubHkgdG93ZXJEb29yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0MixcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHQ8dHwgICAnLFxuICAgIHRpbGVzZXRzOiB7dG93ZXI6IHt9fSxcbiAgICBlZGdlczogJyB0IHQnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU4KV0sXG4gICAgLy8gVE9ETyAtIGNvbm5lY3Rpb25zXG4gIH0pO1xuICByZWFkb25seSBob3VzZV9iZWRyb29tID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0MyxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzaGVkID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0NCxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgY2F2ZSgweDQ5KV0sXG4gICAgZmxhZzogJ2N1c3RvbTpmYWxzZScsXG4gIH0pO1xuICAvLyBUT0RPIC0gc2VwYXJhdGUgbWV0YXNjcmVlbiBmb3Igc2hlZFdpdGhIaWRkZW5Eb29yXG4gIHJlYWRvbmx5IHRhdmVybiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDUsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfdHdvQmVkcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDYsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgdGhyb25lUm9vbV9hbWF6b25lcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDcsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIC8vIFRPRE8gLSBuZWVkIHRvIGZpeCB0aGUgc2luZ2xlLXdpZHRoIHN0YWlyIVxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHt3aWR0aDogM30pLCBkb3duU3RhaXIoMHg0YywgMSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfcnVpbmVkVXBzdGFpcnMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDQ4LFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSgpLCBkb3duU3RhaXIoMHg5YywgMSldLFxuICB9KTtcbiAgcmVhZG9ubHkgaG91c2VfcnVpbmVkRG93bnN0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NDksXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDU2LCAxKV0sXG4gIH0pO1xuICByZWFkb25seSBmb3llciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGEsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHtzaGlmdDogMC41fSksXG4gICAgICAgICAgICBkb29yKDB4MjgpLCBkb29yKDB4NTMsICdkb29yMicpLCBkb29yKDB4NWMsICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRocm9uZVJvb21fcG9ydG9hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0YixcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgZG9vcigweDJiKV0sXG4gIH0pO1xuICByZWFkb25seSBmb3J0dW5lVGVsbGVyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg0YyxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgZG9vcigweDU2KSwgZG9vcigweDU5LCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBiYWNrUm9vbSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGQsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZG9qbyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGUsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIC8vIEVkZ2UgZW50cmFuY2Ugc2hpZnRlZCB0byBwcm9wZXJseSBsaW5lIHVwIGF0IHN0YXJ0IG9mIHN0b20gZmlnaHQuXG4gICAgLy8gKG5vdGUgdGhhdCB0aGlzIGNhdXNlcyB1cyB0byBzaGlmdCBhbGwgb3RoZXIgdXNlcyBhcyB3ZWxsKS5cbiAgICBleGl0czogW2JvdHRvbUVkZ2VIb3VzZSh7c2hpZnQ6IC0wLjV9KV0sXG4gIH0pO1xuICByZWFkb25seSB3aW5kbWlsbEluc2lkZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NGYsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKHtsZWZ0OiA5LCB3aWR0aDogMX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvcml6b250YWxUb3duTWlkZGxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBicnlubWFlciArIHN3YW4gKFRPRE8gLSBzcGxpdCBzbyB3ZSBjYW4gbW92ZSBleGl0cylcbiAgICBpZDogMHg1MCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt9fSxcbiAgICBleGl0czogW2Rvb3IoMHg0YyksIGRvb3IoMHg1NSwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJ5bm1hZXJSaWdodF9leGl0RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gYnJ5bm1hZXJcbiAgICBpZDogMHg1MSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnaG9yaXpvbnRhbCd9fSxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA4fSksIGRvb3IoMHg0MSldLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJ5bm1hZXJMZWZ0X2RlYWRFbmQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGJyeW5tYWVyXG4gICAgaWQ6IDB4NTIsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NDkpLCBkb29yKDB4NGMsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW5MZWZ0X2V4aXRXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzd2FuXG4gICAgaWQ6IDB4NTMsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA5fSksIGRvb3IoMHg0OSksIGRvb3IoMHg1ZSwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhblJpZ2h0X2V4aXRTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzd2FuXG4gICAgaWQ6IDB4NTQsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiAzfSksIGRvb3IoMHg0MSksXG4gICAgICAgICAgICBkb29yKDB4NDMsICdkb29yMicpLCBkb29yKDB4NTcsICdkb29yMycpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhvcml6b250YWxUb3duTGVmdF9leGl0TiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2FoYXJhLCBhbWF6b25lcyAoVE9ETyAtIHNwbGl0IHNvIHdlIGNhbiBtb3ZlIGV4aXRzKVxuICAgIGlkOiAweDU1LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogMHhkfSksIGRvb3IoMHg0NiksIGRvb3IoMHg0YiwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgYW1hem9uZXNSaWdodF9kZWFkRW5kID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBhbWF6b25lc1xuICAgIGlkOiAweDU2LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdob3Jpem9udGFsJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDQwKSwgZG9vcigweDU4LCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBzYWhhcmFSaWdodF9leGl0RSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2FoYXJhXG4gICAgaWQ6IDB4NTcsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ2hvcml6b250YWwnfX0sXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogN30pLCBkb29yKDB4NDApLCBkb29yKDB4NjYsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYU5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1OCxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbY2F2ZSgweDQ3LCAnZm9ydHJlc3MnKSwgYm90dG9tRWRnZSgpXSwgLy8gYm90dG9tIGp1c3QgaW4gY2FzZT9cbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYU5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1OSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDYzKSwgZG9vcigweDhhLCAnZG9vcjInKSwgYm90dG9tRWRnZSh7bGVmdDogMywgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBwb3J0b2FTV19leGl0VyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NWEsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDl9KSwgZG9vcigweDg2KSwgdG9wRWRnZSgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYVNFX2V4aXRFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBwb3J0b2FcbiAgICBpZDogMHg1YixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbcmlnaHRFZGdlKHt0b3A6IDl9KSwgZG9vcigweDdhKSwgZG9vcigweDg3LCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBkeW5hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg1YyxcbiAgICB0aWxlc2V0czoge3Rvd2VyOiB7fX0sXG4gICAgLy8gTk9URTogbm90IHJlYWxseSBhIGdvb2QgZXhpdCB0eXBlIGZvciB0aGlzLi4uXG4gICAgZXhpdHM6IFt7dHlwZTogJ3N0YWlyOmRvd24nLCBtYW51YWw6IHRydWUsIGRpcjogMixcbiAgICAgICAgICAgICBlbnRyYW5jZTogMHhiZjgwLCBleGl0czogW119XSxcbiAgfSk7XG4gIHJlYWRvbmx5IHBvcnRvYUZpc2hlcm1hbiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gcG9ydG9hXG4gICAgaWQ6IDB4NWQsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA2fSksXG4gICAgICAgICAgICBsZWZ0RWRnZSh7dG9wOiA0LCBoZWlnaHQ6IDYsIHNoaWZ0OiAwLjV9KSxcbiAgICAgICAgICAgIGRvb3IoMHg2OCldLFxuICB9KTtcbiAgcmVhZG9ubHkgdmVydGljYWxUb3duVG9wX2ZvcnRyZXNzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBzaHlyb24sIHpvbWJpZSB0b3duIChwcm9iYWJseSBub3Qgd29ydGggc3BsaXR0aW5nIHRoaXMgb25lKVxuICAgIGlkOiAweDVlLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICd2ZXJ0aWNhbCd9fSxcbiAgICBleGl0czogW2NhdmUoMHg0NyksIGJvdHRvbUVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzaHlyb25NaWRkbGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHNoeXJvblxuICAgIGlkOiAweDVmLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICd2ZXJ0aWNhbCd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg1NCksIGRvb3IoMHg1YiwgJ2Rvb3IyJyksIHRvcEVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzaHlyb25Cb3R0b21fZXhpdFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIHNoeXJvblxuICAgIGlkOiAweDYwLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICd2ZXJ0aWNhbCd9fSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDN9KSwgZG9vcigweDA0KSxcbiAgICAgICAgICAgIGRvb3IoMHgwNiwgJ2Rvb3IyJyksIGRvb3IoMHg5OSwgJ2Rvb3IzJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgem9tYmllVG93bk1pZGRsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gem9tYmllIHRvd25cbiAgICBpZDogMHg2MSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4OTkpLCB0b3BFZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgem9tYmllVG93bkJvdHRvbV9jYXZlRXhpdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gem9tYmllIHRvd25cbiAgICBpZDogMHg2MixcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAndmVydGljYWwnfX0sXG4gICAgZXhpdHM6IFtjYXZlKDB4OTIpLCBkb29yKDB4MjMpLCBkb29yKDB4NGQsICdkb29yMicpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGxlYWZOV19ob3VzZVNoZWQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGxlYWZcbiAgICBpZDogMHg2MyxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDhjKSwgZG9vcigweDk1LCAnZG9vcjInKV0sXG4gIH0pO1xuICByZWFkb25seSBzcXVhcmVUb3duTkVfaG91c2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGxlYWYsIGdvYSAoVE9ETyAtIHNwbGl0KVxuICAgIGlkOiAweDY0LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiAxfSksIGRvb3IoMHhiNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbGVhZlNXX3Nob3BzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBsZWFmXG4gICAgaWQ6IDB4NjUsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg3NyksIGRvb3IoMHg4YSwgJ2Rvb3IyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbGVhZlNFX2V4aXRFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBsZWFmXG4gICAgaWQ6IDB4NjYsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiAzLCBoZWlnaHQ6IDMsIHNoaWZ0OiAtMC41fSksIGRvb3IoMHg4NCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hTldfdGF2ZXJuID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBnb2FcbiAgICBpZDogMHg2NyxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweGJhKV0sXG4gIH0pO1xuICByZWFkb25seSBzcXVhcmVUb3duU1dfZXhpdFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGdvYSwgam9lbCAoVE9ETyAtIHNwbGl0KVxuICAgIGlkOiAweDY4LFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiA4fSksIGRvb3IoMHg4NCldLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hU0Vfc2hvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gZ29hXG4gICAgaWQ6IDB4NjksXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHg4MildLFxuICB9KTtcbiAgcmVhZG9ubHkgam9lbE5FX3Nob3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIGpvZWxcbiAgICBpZDogMHg2YSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweGE3KV0sXG4gIH0pO1xuICByZWFkb25seSBqb2VsU0VfbGFrZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gam9lbFxuICAgIGlkOiAweDZiLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gIH0pO1xuICByZWFkb25seSBvYWtOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gb2FrXG4gICAgaWQ6IDB4NmMsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICBleGl0czogW2Rvb3IoMHhlNyldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2FrTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIC8vIG9ha1xuICAgIGlkOiAweDZkLFxuICAgIHRpbGVzZXRzOiB7dG93bjoge3R5cGU6ICdzcXVhcmUnfX0sXG4gICAgZXhpdHM6IFtkb29yKDB4NjApXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9ha1NXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICAvLyBvYWtcbiAgICBpZDogMHg2ZSxcbiAgICB0aWxlc2V0czoge3Rvd246IHt0eXBlOiAnc3F1YXJlJ319LFxuICAgIGV4aXRzOiBbZG9vcigweDdjKV0sXG4gIH0pO1xuICByZWFkb25seSBvYWtTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gb2FrXG4gICAgaWQ6IDB4NmYsXG4gICAgdGlsZXNldHM6IHt0b3duOiB7dHlwZTogJ3NxdWFyZSd9fSxcbiAgICAvLyBFZGdlIGVudHJhbmNlIHNoaWZ0ZWQgZm9yIGNoaWxkIGFuaW1hdGlvblxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogMCwgc2hpZnQ6IDAuNX0pLCBkb29yKDB4OTcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHRlbXBsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgLy8gc2h5cm9uXG4gICAgaWQ6IDB4NzAsXG4gICAgdGlsZXNldHM6IHtob3VzZToge319LFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZUhvdXNlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZURlYWRFbmROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfCA+IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIHcgfCA+IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3cgICAnLFxuICAgIGNvbm5lY3Q6ICcyJyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweGM3KV0sXG4gICAgc3RhdHVlczogWzRdLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZURlYWRFbmROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKVteKUg+KVtXxcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyB3IHwgPiB8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyAgICcsXG4gICAgY29ubmVjdDogJzF8Mnh8MycsXG4gICAgZXhpdHM6IFtkb3duU3RhaXIoMHhjNyldLFxuICAgIHN0YXR1ZXM6IFs0XSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlOiAnIHcgfCB3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgc3RhdHVlczogWzEsIDcsIDB4ZF0sXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHzilILilIPilIJ8XG4gICAgICB84pSC4pSD4pSCfGAsXG4gICAgdGlsZTogJyB3IHwgdyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzE5fDJhfDNiJyxcbiAgICBzdGF0dWVzOiBbMSwgNywgMHhkXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfYmxvY2tlZFJpZ2h0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHzilILilIMgfFxuICAgICAgfOKUguKUg+KUgnxgLFxuICAgIHBsYWNlbWVudDogJ21vZCcsXG4gICAgdGlsZTogJyB3IHwgdyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDlkXX19LFxuICAgIC8vIHVwZGF0ZTogW1tTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHMsXG4gICAgLy8gICAgICAgICAgIGxhYnlyaW50aFZhcmlhbnQocyA9PiBzLmdvYVdpZGVIYWxsTlMsIDAsIDAsIDB4OWQpXV0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTl8MmF8M3xiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfCDilIPilIJ8XG4gICAgICB84pSC4pSD4pSCfGAsXG4gICAgcGxhY2VtZW50OiAnbW9kJyxcbiAgICB0aWxlOiAnIHcgfCB3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4NTFdfX0sXG4gICAgLy8gdXBkYXRlOiBbW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0cyxcbiAgICAvLyAgICAgICAgICAgbGFieXJpbnRoVmFyaWFudChzID0+IHMuZ29hV2lkZUhhbGxOUywgMCwgMSwgMHg1MSldXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxfDl8MmF8M2InLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUFyZW5hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3MyxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHzilbs84pW7fFxuICAgICAgfOKUoeKUgeKUqXxcbiAgICAgIHzilILilbvilIJ8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgICB8IDwgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnOWJ8YScsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4MzcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGxpbWVUcmVlTGFrZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzQsXG4gICAgdGlsZXNldHM6IHtsaW1lOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlSG91c2UoKSwgY2F2ZSgweDQ3KV0sXG4gICAgZmVhdHVyZTogWydicmlkZ2UnXSwgLy8gVE9ETyAtIGxha2U/XG4gICAgd2FsbDogMHg2NyxcbiAgfSk7XG4gIC8vIFN3YW1wIHNjcmVlbnNcbiAgcmVhZG9ubHkgc3dhbXBOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilJggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2MgfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIC8vIFRPRE8gLSBkbyB3ZSBhY3R1YWxseSB3YW50IHRvIHB1dCBhbGwgdGhlc2UgZWRnZXMgaW4/XG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnc3MgICcsXG4gICAgY29ubmVjdDogJzI2JyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICBsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSldLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc2LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilbbilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHwgY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnICAgcycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbXSxcbiAgICBwb2k6IFtbMF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBFX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDc2LFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB8IOKVtuKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCA8Y3wgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyAgIHMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2NhdmUoMHg1YywgJ3N3YW1wJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBOV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3NyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUvOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2NjfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3Nzc3MnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICBsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogNCwgc2hpZnQ6IC0wLjV9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5XUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4NzgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilKQgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHxjYyB8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnc3NzICcsXG4gICAgY29ubmVjdDogJzI2YScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pLFxuICAgICAgICAgICAgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3OSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHwgY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAncyAgcycsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSksXG4gICAgICAgICAgICByaWdodEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pXSxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8Y2NjfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzc3MnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pLFxuICAgICAgICAgICAgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIHJpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXU0VfZG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4N2EsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oipIHxcbiAgICAgIHzilIDilKzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnICAgfGM8Y3wgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzc3MnLFxuICAgIGNvbm5lY3Q6ICc2YWUnLFxuICAgIC8vIE5PVEU6IGRvb3Igc2NyZWVucyBzaG91bGQgbm90IGJlIG9uIGFuIGV4aXQgZWRnZSFcbiAgICBleGl0czogW2NhdmUoMHg1NiwgJ3N3YW1wJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3YixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilbQgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8Y2MgfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBwb2k6IFtbMF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdiLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB8IOKIqSB8XG4gICAgICB84pSA4pW0IHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfGM8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW2NhdmUoMHg1NCwgJ3N3YW1wJyldLFxuICAgIC8vIFRPRE8gLSBmbGFnZ2FibGVcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wQXJlbmEgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdjLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUl+KUr+KUm3xcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8IGEgfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJyAgcyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICAvLyBGb3IgbGVmdC9yaWdodCBuZWlnaGJvcnMsIG9ubHkgYWxsb3cgZWRnZSBvciBlbXB0eS5cbiAgICAvLyBUT0RPIC0gY2hlY2sgdGhhdCB0aGlzIGlzIHN0aWxsIHRoZSBjYXNlLlxuXG4gICAgLy8gTk9URTogbm8gZWRnZSBleGl0IHNpbmNlIHdlIGRvbid0IHdhbnQgdG8gZ28gc3RyYWlnaHQgaGVyZS4uLlxuICAgIC8vIFRPRE8gLSBjb25zdHJhaW50IHRoYXQgd2UgcHV0IHNvbGlkcyBvbiBlaXRoZXIgc2lkZT9cbiAgICAvLyBUT0RPIC0gdW5kbyB0aGUgYXR0ZW1wdCB0byBhbGxvdyB0aGlzIG5vdCBvbiB0aGUgcmlnaHQgZWRnZSxcbiAgICAvLyAgICAgICAgbWF5YmUgbWFrZSBhIGZldyBjdXN0b20gY29tYmluYXRpb25zPyAoaXMgaXQgc3RpbGwgYnJva2VuPylcbiAgICAvLyAgICAgICAgLS0+IGxvb2tzIGxpa2Ugd2UgZGlkIGZpeCB0aGF0IGVhcmxpZXIgc29tZWhvdz8gIG1heWJlIGJ5IG1vdmluZ1xuICAgIC8vICAgICAgICAgICAgdGhlIHdob2xlIHNjcmVlbiBhIGNvbHVtbiBvdmVyLCBvciBlbHNlIGJ5IGNoYW5naW5nIHRoZSB0aWxlcz9cbiAgICAvLyBUT0RPIC0gTk9URSBTV0FNUCBHUkFQSElDUyBTVElMTCBCUk9LRU4hIVxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdkLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2NjfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJ3NzIHMnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIGxlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogNH0pLFxuICAgICAgICAgICAgcmlnaHRFZGdlKHt0b3A6IDcsIGhlaWdodDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDdlLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUkCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnICAgfGNjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICB1cGRhdGU6IFtbU2NyZWVuRml4LlN3YW1wRG9vcnMsIChzLCBzZWVkLCByb20pID0+IHtcbiAgICAgIHJvbS5tZXRhc2NyZWVucy5zd2FtcFdTX2Rvb3IuZmxhZyA9ICdhbHdheXMnO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfV1dLFxuICAgIGVkZ2VzOiAnIHNzICcsXG4gICAgY29ubmVjdDogJzZhJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDcsIGhlaWdodDogNH0pLCBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBwb2k6IFtbMl1dLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBXU19kb29yID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3ZSxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUkCB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnICAgfGM8IHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICcgc3MgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU3LCAnc3dhbXAnKV0sXG4gIH0pO1xuICByZWFkb25seSBzd2FtcEVtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg3ZixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHwgICB8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgICcsXG4gICAgY29ubmVjdDogJycsXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgLy8gTWlzc2luZyBzd2FtcCBzY3JlZW5zXG4gIHJlYWRvbmx5IHN3YW1wTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDcwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKVtSB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHwgYyB8ICAgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAncyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIHBvaTogW1swXV0sXG4gICAgZGVmaW5pdGlvbjogcmVhZFNjcmVlbihcbiAgICAgICAgYC4gIC4gIC4gIC4gIGNmIGY2IGM3IGFkIGM0IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGI4IGI5IGMzIGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGI3IGI4IGFkIGFkIGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGMyIGMzIGI3IGI4IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGMyIGI3IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGI5IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGFkIGFkIGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI5IGI4IGFkIGFkIGQyIGUyIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGUzIGY2IGMzIGMzIGI4IGI2IGQyIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIGUzIGZkIGFkIGFkIGZjIGUyIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIGZmIGZiIGZiIGZhIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pW3IHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8IGMgfCBjICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyAgcyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBwb2k6IFtbMF1dLFxuICAgIGRlZmluaXRpb246IHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICAuICBjZCBjOSBjOSBjYSAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICBjZCBlYiBhMCBhMCBjYiBjYSAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBhMCBmOSBmNSBmNyBmOCBjYiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBhMCBlZCAwOCAwOSBhMCBhMCBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkYiBlZSAwYyAwYiBlZiBhMCBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMCBkMSAwMyAwMyBkOCBkYiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNyBhZCBhZCBhZSBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBhZCBiOSBiNyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBjMiBjMyBjMyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNSBjMyBjMyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBiNiBjMiBjMyBjMyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiOCBiNiBiNiBiNiBkMiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiNyBiNyBiNyBiNyBmNiBjYyAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBiNyBiNyBiOCBiNiBkMiBjYyAuICAuICAuICAuYCxcbiAgICAgICAgWycuJywgMHhjOF0pLFxuICB9KTtcbiAgcmVhZG9ubHkgc3dhbXBOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weDcyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfCBjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2NvbnNvbGlkYXRlJ10sXG4gICAgZWRnZXM6ICdzIHMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSwgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gICAgZGVmaW5pdGlvbjogcmVhZFNjcmVlbihcbiAgICAgICAgYC4gIC4gIC4gIC4gIGNmIGQzIGI2IGI2IGM2IGI2IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGMzIGM3IGI2IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY1IGMzIGM3IGI2IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGI2IGM2IGM1IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGI2IGM2IGMzIGM3IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY1IGMzIGMzIGMzIGMzIGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGFkIGMyIGMzIGMzIGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGM0IGM1IGMzIGMzIGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY1IGI3IGI3IGI4IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGMyIGI4IGI2IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGI2IGMyIGI3IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQ5IGI2IGI2IGI2IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGI3IGI3IGI4IGI2IGQyIGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI5IGI3IGI3IGI3IGY2IGNjIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGI3IGI3IGM3IGI2IGQyIGNjIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4NzMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgICB8Y2NjfCAgICcsXG4gICAgdGlsZXNldHM6IHtzd2FtcDoge319LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBlZGdlczogJyBzIHMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtsZWZ0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICByaWdodEVkZ2Uoe3RvcDogNywgaGVpZ2h0OiA0LCBzaGlmdDogLTAuNX0pXSxcbiAgICBkZWZpbml0aW9uOiByZWFkU2NyZWVuKFxuICAgICAgICBgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLiAgLlxuICAgICAgICAgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzkgYzlcbiAgICAgICAgIGEwIGU0IGU4IGViIGU0IGEwIGEwIGEwIGViIGViIGU4IGYwIGYxIGEwIGU0IGEwXG4gICAgICAgICBhMCBlNSBlOSBmOSBmNSBmNiBmNiBmNyBlYyBmOSBmNyBmOCBmMiBhMCBlNSBhMFxuICAgICAgICAgYTAgZTYgZjAgZjEgZTYgZTAgMDggMDkgZWQgZGUgZWEgZGUgZjIgYTAgZTYgYTBcbiAgICAgICAgIGRiIGU3IGRiIGYzIGU3IGUxIDBjIDBiIGRkIGRmIGUwIGRmIGYzIGRiIGU3IGUwXG4gICAgICAgICBkMCBkMSBkYSBkYSBkMCBkMSAwMyAwMyBkMCBkMSBkMCBkMSBkYSBkYSBkYSBkYVxuICAgICAgICAgYWQgYzQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWQgYWRcbiAgICAgICAgIGMyIGM1IGI4IGM2IGM0IGM0IGI5IGM3IGM0IGM1IGM1IGM3IGFkIGFkIGFkIGFkXG4gICAgICAgICBhZCBhZCBhZCBhZCBjMiBjMyBjMyBjMyBjMyBjMyBjNyBhZCBhZCBhZCBhZCBhZFxuICAgICAgICAgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmIgZmJcbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5cbiAgICAgICAgIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFdFX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3MyxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfGM8Y3wgICAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyBzIHMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NTYsICdzd2FtcCcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHwgY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAnICBzcycsXG4gICAgY29ubmVjdDogJ2FlJyxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSksXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBwb2k6IFtbMl1dLFxuICAgIGRlZmluaXRpb246IHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICAuICAuICBjZCBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOSBjOVxuICAgICAgICAgLiAgLiAgLiAgLiAgLiAgY2QgYTAgYTAgYTAgZTggMDQgYTAgZTggYTAgYTAgZTRcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY4IGEwIGYwIGYxIGY1IGY1IGY3IGU5IGY0IGY3IGU1XG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBmNyBmOCBmMiBlYSAwNiBhYSBlOSBmMCBmMSBlNlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgYTAgZGQgZTAgZjMgZTAgMDcgMGMgZWEgZGIgZjMgZTdcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGRiIGQ1IGQwIGQxIGQxIDAzIDAzIGQwIGQxIGRhIGRhXG4gICAgICAgICAuICAuICAuICAuICBjZiBkNSBhZiBjNCBjNCBhZCBhZCBhZCBhZCBhZCBjNCBhZFxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjkgYzMgYzMgYjggYWQgYWQgYWQgYzIgYjcgYjhcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY2IGMzIGMzIGMzIGMzIGI4IGFkIGFkIGFkIGFkIGFkXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNiBjNyBhZCBjMiBjMyBjNyBmYyBmYiBmYiBmYiBmYlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYWQgYWQgZDYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjkgYjggYWQgYjkgZjYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZjYgYzcgYWQgYjkgYzcgZDIgY2MgLiAgLiAgLiAgLiBcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGI2IGI5IGMzIGI4IGQyIGNjIC4gIC4gIC4gIC5gLFxuICAgICAgICBbJy4nLCAweGM4XSksXG4gIH0pO1xuICByZWFkb25seSBzd2FtcFNFX2Rvb3IgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHg3NCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfCDiiKkgfFxuICAgICAgfCDilIzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnICAgfCA8Y3wgYyAnLFxuICAgIHRpbGVzZXRzOiB7c3dhbXA6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5Td2FtcERvb3JzXX19LFxuICAgIGZlYXR1cmU6IFsnY29uc29saWRhdGUnXSxcbiAgICBmbGFnOiAnYWx3YXlzJyxcbiAgICBlZGdlczogJyAgc3MnLFxuICAgIGNvbm5lY3Q6ICdhZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWEsICdzd2FtcCcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHN3YW1wTlNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogfjB4NzUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pSc4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyBjIHwgY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge3N3YW1wOiB7fX0sXG4gICAgZmVhdHVyZTogWydjb25zb2xpZGF0ZSddLFxuICAgIGVkZ2VzOiAncyBzcycsXG4gICAgY29ubmVjdDogJzJhZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLFxuICAgICAgICAgICAgYm90dG9tRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KSxcbiAgICAgICAgICAgIHJpZ2h0RWRnZSh7dG9wOiA3LCBoZWlnaHQ6IDQsIHNoaWZ0OiAtMC41fSldLFxuICAgIGRlZmluaXRpb246IHJlYWRTY3JlZW4oXG4gICAgICAgIGAuICAuICAuICAuICBjZiBkMyBjNCBjMyBjMyBjMyBmNyBmOCBjYSAuICAuICAuXG4gICAgICAgICAuICAuICAuICAuICBjZiBmNSBjMyBjMyBjMyBjMyBmNyBmNyBhMCBjYSBjOSBjOVxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZjYgYzMgYzMgYjggYjYgZDIgZjcgZjggZTggZTQgYTBcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGY1IGI3IGMzIGI3IGI4IGQyIGYwIGYxIGU5IGU1IGRlXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBjMiBiOCBjMiBiOCBkOCBkYiBmMiBlYSBlNiBkZlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYWQgYWQgYWUgZDQgZjMgZGQgZTcgZGZcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGFkIGFkIGFkIGFlIGQwIGQxIGQwIGQxXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBjMiBjMyBjMyBiNyBiOCBhZCBhZCBhZCBhZCBhZFxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYzIgYjcgYjcgYjcgYjggYzQgYWQgYWRcbiAgICAgICAgIC4gIC4gIC4gIC4gIGNmIGQzIGFkIGFkIGI2IGI5IGI3IGI3IGI3IGI3IGI4IGFkXG4gICAgICAgICAuICAuICAuICAuICBjZiBkMyBhZCBjNCBjMyBiNyBiOCBmYyBmYiBmYiBmYiBmYlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjYgYWQgYWQgYWQgZDYgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYWQgYWQgYWQgYWQgZDIgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYzQgYzMgYjcgYjggZDIgY2MgLiAgLiAgLiAgLlxuICAgICAgICAgLiAgLiAgLiAgLiAgY2YgZDMgYjYgYjkgYjcgYjcgZjYgY2MgLiAgLiAgLiAgLmAsXG4gICAgICAgIFsnLicsIDB4YzhdKSxcbiAgfSk7XG4gIC8vIENhdmUgc2NyZWVuc1xuICByZWFkb25seSBjYXZlRW1wdHkgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCAgIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgbGFieXJpbnRoOiB7fSwgcHlyYW1pZDoge30sXG4gICAgICAgICAgICAgICBpY2VDYXZlOiB7fSwgZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBvcGVuID0gdGhpcy5tZXRhc2NyZWVuKHsgLy8gTk9URTogbm90IGNhdmVcbiAgICBpZDogMHg4MCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3xvb298b29vJyxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge30sIHNlYToge319LCAvLyBOT1RFOiBjb3VsZCBhZGQgZ3Jhc3Mvcml2ZXIgYnV0IHRyZWVzIG5pY2VyLlxuICAgIGVkZ2VzOiAnb29vbycsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfCBjIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgcG9pOiBbWzRdXSxcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0LCBtYW51YWw6IHRydWV9KV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgxLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgYyBjJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIHBvaTogW1s0XV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsV0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgyLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4MyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHwgY2N8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgIGNjJyxcbiAgICBjb25uZWN0OiAnYWUnLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsU0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDgzLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilJAgfFxuICAgICAgfCDilIIgfGAsXG4gICAgdGlsZTogJyAgIHxjYyB8IGMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgY2MgJyxcbiAgICBjb25uZWN0OiAnNmEnLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsV1NfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg0LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHwgY2N8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjICBjJyxcbiAgICBjb25uZWN0OiAnMmUnLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsTkVfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg1LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5XID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfOKUgOKUmCB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyBjIHxjYyB8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICdjYyAgJyxcbiAgICBjb25uZWN0OiAnMjYnLFxuICAgIHBvaTogW1syXV0sXG4gIH0pO1xuICByZWFkb25seSBoYWxsTldfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg2LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTlNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4NyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIIgfFxuICAgICAgfCDilJzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfCBjY3wgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgY2MnLFxuICAgIGNvbm5lY3Q6ICcyYWUnLFxuICAgIHBvaTogW1szXV0sXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOU0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg3LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHzilIDilLzilIB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIGMgfGNjY3wgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2NjY2MnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgICBwb2k6IFtbM11dLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldTRV91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODgsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDg5LFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pSkIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2MgfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnY2NjICcsXG4gICAgY29ubmVjdDogJzI2YScsXG4gICAgcG9pOiBbWzNdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaE5XU191bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ODksXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hXU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhhLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgOKUrOKUgHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgICB8Y2NjfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGNjYycsXG4gICAgY29ubmVjdDogJzZhZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJyYW5jaFdTRV91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGEsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB84pSA4pS04pSAfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgYyB8Y2NjfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnY2MgYycsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gICAgcG9pOiBbWzNdXSxcbiAgICBleGl0czogW3NlYW1sZXNzRG93bigweDA2LCA0KV0sIC8vIGtlbnN1XG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV0VfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhiLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX3JhbXAgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhjLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUiyB8XG4gICAgICB8IOKUiyB8XG4gICAgICB8IOKUiyB8YCxcbiAgICB0aWxlOiAnIGMgfCAvIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JhbXAnXSxcbiAgICBlZGdlczogJ2MgYyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfcmFtcF91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGMsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfb3ZlckJyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pW9IHxcbiAgICAgIHzilIDilIPilIB8XG4gICAgICB8IOKVvyB8YCxcbiAgICB0aWxlOiAnIGMgfCBiIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ292ZXJwYXNzJ10sXG4gICAgZWRnZXM6ICdjYmNiJywgLy8gVE9ETyAtICdiJyBmb3Igb3RoZXIgc2lkZSBvZiBicmlkZ2U/P1xuICAgIGNvbm5lY3Q6ICcyYScsXG4gIH0pO1xuICByZWFkb25seSBoYWxsV0VfdW5kZXJCcmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDhlLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVvSB8XG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfCDilb8gfGAsXG4gICAgdGlsZTogJyAgIHxjYmN8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd1bmRlcnBhc3MnXSxcbiAgICBlZGdlczogJ2JjYmMnLFxuICAgIGNvbm5lY3Q6ICc2ZScsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfd2FsbCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OGYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pSGIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgYyB8IGMgfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnYyBjICcsXG4gICAgZmVhdHVyZTogWyd3YWxsJ10sXG4gICAgLy8gVE9ETyAtIGNhbiB3ZSBqdXN0IGRldGVjdCB0aGUgY29ubmVjdGlvbnM/XG4gICAgLy8gICAgICAtIGZvciBlYWNoIHRpbGVzZXQsIG1hcCAxLi5mIHRvIHZhcmlvdXMgZWRnZSBwb3M/XG4gICAgLy8gICAgICAtIGUuZy4gY2F2ZTogMHgwMiA9IDEsIDB4MDggPSAyLCAweDBjID0gMyxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAweDIwID0gNSwgMHg4MCA9IDYsIDB4YzAgPSA3LCAuLi5cbiAgICAvLyAgICAgICAgbmVlZCB0byBiZSBXQUxLQUJMRVxuICAgIC8vICAgICAgICBtYXkgbmVlZCB0byByZWV2YWx1YXRlIGVhY2ggc2NyZWVuIGZvciBlYWNoIHRpbGVzZXQuLi5cbiAgICAvLyAgICAgICAgYW5kIG5lZWQgdG8gd2FpdCB1bnRpbCB0aGUgc2NyZWVuIGlzIEJVSUxUIVxuICAgIGNvbm5lY3Q6ICcyPWEnLCAvLyB3YWxsIHdpbGwgYWx3YXlzIGNvbm5lY3QgdGhlIGZpcnN0IHR3bz9cbiAgICB3YWxsOiAweDg3LCBcbiAgICBtb2Q6ICd3YWxsJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxOU193YWxsX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg4ZixcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGhhbGxXRV93YWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5MCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilITilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjY2N8ICAgJyxcbiAgICAvLyBOT1RFOiBubyBmb3J0cmVzcyB2ZXJzaW9uIG9mIHRoaXMgd2FsbCFcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3YWxsJ10sXG4gICAgZWRnZXM6ICcgYyBjJyxcbiAgICBjb25uZWN0OiAnNj1lJyxcbiAgICB3YWxsOiAweDY3LFxuICAgIG1vZDogJ3dhbGwnLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbFdFX3dhbGxfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDkwLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX2FyZW5hID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5MSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUuOKUkHxcbiAgICAgIHzilIIm4pSCfFxuICAgICAgfOKUlOKUrOKUmHxgLFxuICAgIC8vYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogWycgbiB8IGEgfCBjICcsICcgYyB8IGEgfCBjICcsICcgYyB8IGEgfCB3ICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJ10sXG4gICAgZWRnZXM6ICdjIGMgJywgLy8gJ24nIGZvciAnbmFycm93JyBvbiB0b3A/Pz9cbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIHBvaTogW1sxLCAweDYwLCAweDc4XV0sXG4gICAgZXhpdHM6IFt0b3BFZGdlKCksIC8vIHZhbXBpcmUgMSByb29tXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSksIC8vIGdvYSBzYWdlc1xuICAgICAgICAgICAgc2VhbWxlc3NVcCgweGU2LCA0KV0sIC8vIGtlbnN1XG4gICAgYXJlbmE6IDEsXG4gIH0pO1xuICByZWFkb25seSBoYWxsTlNfYXJlbmFfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDkxLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX2FyZW5hV2FsbCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilITilJB8XG4gICAgICB84pSCJuKUgnxcbiAgICAgIHzilJTilKzilJh8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6IFsnIG4gfCBhIHwgYyAnLCAnIGMgfCBhIHwgYyAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYScsICd3YWxsJ10sXG4gICAgZWRnZXM6ICduIGMgJyxcbiAgICBjb25uZWN0OiAnMng9YXB4JyxcbiAgICB3YWxsOiAweDI3LFxuICAgIG1vZDogJ3dhbGwnLFxuICAgIHBvaTogW1sxLCAweDYwLCAweDc4XV0sXG4gICAgLy8gTk9URTogdG9wIGV4aXQgbmVlZHMgdG8gbW92ZSB1cCBhIHRpbGUuLi4/XG4gICAgZXhpdHM6IFt0b3BFZGdlKHt0b3A6IDF9KSwgLy8gcHJpc29ucyBuZWVkIGV4dHJhIGV4aXRzXG4gICAgICAgICAgICBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNCwgbWFudWFsOiB0cnVlfSldLFxuICAgIGFyZW5hOiAxLFxuICB9KTtcbiAgLy8gTk9URTogc2NyZWVuIDkzIGlzIG1pc3NpbmchXG4gIHJlYWRvbmx5IGJyYW5jaE5XRV93YWxsID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIYgfFxuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnIGMgfGNjY3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dhbGwnXSxcbiAgICBlZGdlczogJ2NjIGMnLFxuICAgIGNvbm5lY3Q6ICcyeD02ZScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBtb2Q6ICd3YWxsJyxcbiAgICB3YWxsOiAweDM3LFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldFX3dhbGxfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk0LFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgYnJhbmNoTldFX3VwU3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk1LFxuICAgIGljb246IGljb25gPFxuICAgICAgfCA8IHxcbiAgICAgIHzilIDilLTilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxjPGN8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZWRnZXM6ICcgYyBjJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDQ3KV0sXG4gIH0pO1xuICByZWFkb25seSBicmFuY2hOV0VfdXBTdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTUsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDgwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kV191cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5NixcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHwgPCB8XG4gICAgICB84pSA4pSYIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfGM8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyBjICAnLFxuICAgIGNvbm5lY3Q6ICc2JyxcbiAgICBleGl0czogW3VwU3RhaXIoMHg0MildLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFdfdXBTdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTYsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDIwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kV19kb3duU3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk3LFxuICAgIGljb246IGljb25gPlxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilJAgfFxuICAgICAgfCA+IHxgLFxuICAgIHRpbGU6ICcgICB8Yz4gfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnIGMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4YTIpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXX2Rvd25TdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTcsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweDIwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kRV91cFN0YWlyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5OCxcbiAgICBpY29uOiBpY29uYDxcbiAgICAgIHwgPCB8XG4gICAgICB8IOKUlOKUgHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfCA8Y3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJyAgIGMnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW3VwU3RhaXIoMHg0YyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZEVfdXBTdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTgsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweGQwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kRV9kb3duU3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDk5LFxuICAgIGljb246IGljb25gPlxuICAgICAgfCAgIHxcbiAgICAgIHwg4pSM4pSAfFxuICAgICAgfCA+IHxgLFxuICAgIHRpbGU6ICcgICB8ID5jfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGVkZ2VzOiAnICAgYycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4YWMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRFX2Rvd25TdGFpcl91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OTksXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDgwLCAweGQwKSxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlNfc3RhaXJzID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCA+IHxcbiAgICAgIHwgICB8XG4gICAgICB8IDwgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnID4gfCAgIHwgPCAnLCAvLyBOT1RFOiB0aGlzIHdpbGwgbmVlZCB0byBiZSBtYW51YWwuLi5cbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnYyBjICcsXG4gICAgY29ubmVjdDogJzJ4fGF4JyxcbiAgICBleGl0czogW2Rvd25TdGFpcigweDE3KSwgdXBTdGFpcigweGQ3KV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+IHJlYWNoYWJsZSgweDEwOCwgMHg3OCkgJiYgcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROU19zdGFpcnNfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDlhLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHgxMDgsIDB4NzgpICYmICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROX3N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgPiB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnIGMgfCA+IHwgICAnLCAnID4gfCAgIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnYyAgICcsXG4gICAgY29ubmVjdDogJzInLFxuICAgIGV4aXRzOiBbZG93blN0YWlyKDB4MTcpXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDEwOCwgMHg3OCkgJiYgcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRTX3N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCA8IHxgLFxuICAgIHRpbGU6IFsnICAgfCA8IHwgYyAnLCAnICAgfCAgIHwgPCAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICBjICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweGQ3KV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpICYmIHJlYWNoYWJsZSgweDEwOCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVtSB8XG4gICAgICB8ICAgfFxuICAgICAgfCDilbcgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnIGMgfCAgIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMnB8YXAnLFxuICAgIHBvaTogW1swLCAtMHgzMCwgMHg3OF0sIFswLCAweDExMCwgMHg3OF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiByZWFjaGFibGUoLTB4MzAsIDB4NzgpICYmIHJlYWNoYWJsZSgweDExMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSBkZWFkRW5kTlNfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDliLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpICYmICFyZWFjaGFibGUoMHgxMTAsIDB4NzgpLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmROID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbUgfFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiBbJyBjIHwgYyB8ICAgJywgJyBjIHwgICB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJ2MgICAnLFxuICAgIGNvbm5lY3Q6ICcyJyxcbiAgICBwb2k6IFtbMCwgLTB4MzAsIDB4NzhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDExMCwgMHg3OCkgJiYgcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5YixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKVtyB8YCxcbiAgICB0aWxlOiBbJyAgIHwgYyB8IGMgJywgJyAgIHwgICB8IGMgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJyAgYyAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBwb2k6IFtbMCwgMHgxMTAsIDB4NzhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgtMHgzMCwgMHg3OCkgJiYgcmVhY2hhYmxlKDB4MTEwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pW0IOKVtnxcbiAgICAgIHwgICB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgICB8YyBjfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBlZGdlczogJyBjIGMnLFxuICAgIGNvbm5lY3Q6ICc2cHxlcCcsXG4gICAgcG9pOiBbWzAsIDB4NzAsIC0weDI4XSwgWzAsIDB4NzAsIDB4MTA4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+IHJlYWNoYWJsZSgweDcwLCAtMHgyOCkgJiYgcmVhY2hhYmxlKDB4NzAsIDB4MTA4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlYWRFbmRXRV91bnJlYWNoYWJsZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4OWMsXG4gICAgaWNvbjogaWNvbmBcXG58ICAgfFxcbnwgICB8XFxufCAgIHxgLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDcwLCAtMHgyOCkgJiYgIXJlYWNoYWJsZSgweDcwLCAweDEwOCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZFcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDljLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKVtCAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnICAgfGNjIHwgICAnLCAnICAgfGMgIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnIGMgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIHBvaTogW1swLCAweDcwLCAtMHgyOF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NzAsIDB4MTA4KSAmJiByZWFjaGFibGUoMHg3MCwgLTB4MjgpLFxuICB9KTtcbiAgcmVhZG9ubHkgZGVhZEVuZEUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDljLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCAg4pW2fFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnICAgfCBjY3wgICAnLCAnICAgfCAgY3wgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIGVkZ2VzOiAnICAgYycsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIHBvaTogW1swLCAweDcwLCAweDEwOF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NzAsIC0weDI4KSAmJiByZWFjaGFibGUoMHg3MCwgMHgxMDgpLFxuICB9KTtcbiAgLy8gTk9URTogOWQgbWlzc2luZ1xuICByZWFkb25seSBoYWxsTlNfZW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDllLFxuICAgIGljb246IGljb25g4pW9XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKVvSB8YCxcbiAgICB0aWxlOiAnIGMgfCBjIHwgbiAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBlZGdlczogJ2MgbiAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKCldLFxuICB9KTtcbiAgcmVhZG9ubHkgaGFsbE5TX2VudHJhbmNlX3VucmVhY2hhYmxlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHg5ZSxcbiAgICBpY29uOiBpY29uYFxcbnwgICB8XFxufCAgIHxcXG58ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknXSxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ODAsIDB4ODApLFxuICAgIGRlbGV0ZTogdHJ1ZSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxFeGl0U0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDlmLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilZTilZB8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIC8vZWRnZXM6ICcgIHJyJyxcbiAgICAvL2Nvbm5lY3Q6ICc5ZDpiZicsICAvLyA6IG1lYW5zIHdhdGVyIC0gZmxpZ2h0IG5lZWRlZFxuICAgIGV4aXRzOiBbYm90dG9tRWRnZSh7bGVmdDogNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxCZW5kV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGEwLFxuICAgIGljb246IGljb25gXG4gICAgICB84paIICB8XG4gICAgICB84pWQ4pWXIHxcbiAgICAgIHzilojilZEgfGAsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICAvL2VkZ2VzOiAnIHJyICcsXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsSGFsbE5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilZEgfFxuICAgICAgfCDilaDilIh8XG4gICAgICB8IOKVkSB8YCxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlcicsICdicmlkZ2UnXSxcbiAgICB3YWxsOiAweDhiLFxuICB9KTtcbiAgcmVhZG9ubHkgY2hhbm5lbEVudHJhbmNlU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGEyLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilZTilIh8XG4gICAgICB84pW34pWRIHxgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIC8vIE5PVEU6IFRoaXMgd291bGQgQUxNT1NUIHdvcmsgYXMgYSBjb25uZWN0aW9uIHRvIHRoZVxuICAgIC8vIG5vcm1hbCByaXZlciBjYXZlIHRpbGVzLCBidXQgdGhlIHJpdmVyIGlzIG9uZSB0aWxlXG4gICAgLy8gdGFsbGVyIGF0IHRoZSB0b3AsIHNvIHRoZXJlJ3Mgbm8gbWF0Y2ghXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiAyfSldLFxuICAgIHdhbGw6IDB4N2MsXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsQ3Jvc3MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGEzLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVkSB8XG4gICAgICB84pWQ4pWs4pWQfFxuICAgICAgfOKVt+KVkeKVt3xgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgLy8gTk9URTogdHdvIGJvdHRvbSBlZGdlcyBvbiB0aGUgc2FtZSBzY3JlZW4gLSBjYWxsIG9uZSBhIGRvb3JcbiAgICBleGl0czogW2JvdHRvbUVkZ2Uoe2xlZnQ6IDN9KSwgYm90dG9tRWRnZSh7bGVmdDogMHhiLCB0eXBlOiAnZG9vcid9KV0sXG4gIH0pO1xuICByZWFkb25seSBjaGFubmVsRG9vciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTQsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHwg4oip4paIfFxuICAgICAgfOKUiOKVkOKVkHxcbiAgICAgIHwgIOKWiHxgLFxuICAgIHRpbGVzZXRzOiB7ZG9scGhpbkNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIGV4aXRzOiBbZG9vcigweDM4KV0sXG4gICAgd2FsbDogMHg3MyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluRmxvYXRpbmdJc2xhbmQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGE1LFxuICAgIGljb246IGljb25gKlxuICAgICAgfOKVkOKVl+KWiHxcbiAgICAgIHwq4pWRIHxcbiAgICAgIHzilZDilaPiloh8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICcgICB8IGFwfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgIHdwJywgIC8vIHcgPSB3YXRlcmZhbGwsIHAgPSBwYXRoXG4gICAgY29ubmVjdDogJ2UnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoTkVfc3RhaXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGE2LFxuICAgIGljb246IGljb25g4pSUXG4gICAgICB84paI4pSL4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgLyB8IHBwfCAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnbCAgcCcsICAvLyBsID0gbGFkZGVyIChzdGFpcnMpXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBleGl0czogW3RvcEVkZ2UoKV0sIC8vIG5ldmVyIHVzZWQgYXMgYW4gZXhpdCBpbiB2YW5pbGxhXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkJyYW5jaE5XRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTcsXG4gICAgaWNvbjogaWNvbmDilLRcbiAgICAgIHzilogg4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnIHAgfHBwcHwgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJ3BwIHAnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0VfaWNlQnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhOCxcbiAgICBpY29uOiBpY29uYOKVq1xuICAgICAgfOKWiOKVkeKWiHxcbiAgICAgIHwg4pSGIHxcbiAgICAgIHzilojilZHiloh8YCxcbiAgICB0aWxlOiBbJyByIHxwcHB8IHIgJywgJyByIHxwcHB8ICAgJ10sXG4gICAgdGlsZXNldHM6IHttb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydicmlkZ2UnXSxcbiAgICBlZGdlczogJ3dwd3AnLFxuICAgIGNvbm5lY3Q6ICc2LWU6MmEnLFxuICAgIHdhbGw6IDB4ODcsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YTksXG4gICAgaWNvbjogaWNvbmDilIxcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paIICB8XG4gICAgICB84paIIOKWiHxgLFxuICAgIHRpbGU6ICcgICB8IHBwfCBwICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgcHAnLFxuICAgIGNvbm5lY3Q6ICdhZScsXG4gICAgZXhpdHM6IFtyaWdodEVkZ2Uoe3RvcDogNiwgaGVpZ2h0OiA0fSksIGJvdHRvbUVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5EZWFkRW5kV19jYXZlRW1wdHkgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFhLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWkCDilpB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgLy8gcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnICAgfHA8IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgcCAgJyxcbiAgICBjb25uZWN0OiAnNicsXG4gICAgZXhpdHM6IFtjYXZlKDB4MzgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aE5FID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhhYixcbiAgICBpY29uOiBpY29uYOKUlFxuICAgICAgfOKWiCDiloh8XG4gICAgICB84paIICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyBwIHwgcHB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAncCAgcCcsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgICBleGl0czogW3JpZ2h0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KSwgdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkJyYW5jaFdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YWMsXG4gICAgaWNvbjogaWNvbmDilKxcbiAgICAgIHzilojilojiloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiCDiloh8YCxcbiAgICB0aWxlOiAnICAgfHBwcHwgcCAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgcHBwJyxcbiAgICBjb25uZWN0OiAnNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YWQsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB8ICDilpB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHxwPCB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHAgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU1KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhFX3Nsb3BlUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YWUsXG4gICAgaWNvbjogaWNvbmDilZNcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paIICB8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZTogJyAgIHwgcHB8IOKGkyAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJyAgc3AnLCAvLyBzID0gc2xvcGVcbiAgICBjb25uZWN0OiAnYWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGFmLFxuICAgIGljb246IGljb25g4pSYXG4gICAgICB84paIIOKWiHxcbiAgICAgIHwgIOKWiHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnIHAgfHBwIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICdwcCAgJyxcbiAgICBjb25uZWN0OiAnMjYnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogNiwgaGVpZ2h0OiA0fSksIHRvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5DYXZlX2VtcHR5ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiMCxcbiAgICBpY29uOiBpY29uYOKIqVxuICAgICAgfOKWiOKIqeKWiHxcbiAgICAgIHzilowg4paQfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8IDwgfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgICAnLFxuICAgIGNvbm5lY3Q6ICcnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU4KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhFX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGIxLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8IDxwfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBlZGdlczogJyAgIHAnLFxuICAgIGNvbm5lY3Q6ICdlJyxcbiAgICBleGl0czogW2NhdmUoMHg1NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0Vfc2xvcGVOID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiMixcbiAgICBpY29uOiBpY29uYOKVqFxuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHwgICB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyDihpMgfHBwcHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3NwIHAnLFxuICAgIGNvbm5lY3Q6ICcyNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5EZWFkRW5kVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjMsXG4gICAgaWNvbjogaWNvbmDilbRcbiAgICAgIHzilojilojiloh8XG4gICAgICB8ICDiloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHxwcCB8ICAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHAgICcsXG4gICAgY29ubmVjdDogJzYnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGI0LFxuICAgIGljb246IGljb25g4pSAXG4gICAgICB84paI4paI4paIfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnICAgfHBwcHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZWRnZXM6ICcgcCBwJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIGV4aXRzOiBbbGVmdEVkZ2Uoe3RvcDogNiwgaGVpZ2h0OiA0fSksIHJpZ2h0RWRnZSh7dG9wOiA2LCBoZWlnaHQ6IDR9KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpbkFyZW5hX2dhdGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGI1LFxuICAgIGljb246IGljb25gI1xuICAgICAgfOKWiCPiloh8XG4gICAgICB84paMIOKWkHxcbiAgICAgIHzilojilIviloh8YCxcbiAgICB0aWxlOiAnICAgfCA8IHwgLyAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9LCBtb3VudGFpblJpdmVyOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnICBsICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGV4aXRzOiBbey4uLnVwU3RhaXIoMHg0NywgMyksIHR5cGU6ICdjYXZlJ31dLFxuICAgIGZsYWc6ICdjdXN0b206ZmFsc2UnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoTl9zbG9wZVNfY2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YjYsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojilIviiKl8XG4gICAgICB84paMIOKWkHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlOiAnIC8gfCA8IHwg4oaTICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnbCBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW2NhdmUoMHg1YSksIHRvcEVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9zbG9wZU5TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiNyxcbiAgICBpY29uOiBpY29uYOKVq1xuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHwgICB8XG4gICAgICB84paI4oaT4paIfGAsXG4gICAgdGlsZTogJyDihpMgfHBwcHwg4oaTICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnc3BzcCcsXG4gICAgY29ubmVjdDogJzI2YWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5QYXRoV0Vfc2xvcGVOX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGI4LFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oaT4oipfFxuICAgICAgfCAgIHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnIOKGkyB8cDxwfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnc3AgcCcsXG4gICAgY29ubmVjdDogJzI2ZScsXG4gICAgZXhpdHM6IFtjYXZlKDB4NWMpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiOSxcbiAgICBpY29uOiBpY29uYOKUkFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHwgIOKWiHxcbiAgICAgIHzilogg4paIfGAsXG4gICAgdGlsZTogJyAgIHxwcCB8IHAgJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fSwgbW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnIHBwICcsXG4gICAgY29ubmVjdDogJzZhJyxcbiAgICBleGl0czogW2xlZnRFZGdlKHt0b3A6IDYsIGhlaWdodDogNH0pLCBib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluU2xvcGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJhLFxuICAgIGljb246IGljb25g4oaTXG4gICAgICB84paI4oaT4paIfFxuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlOiAnIOKGkyB8IOKGkyB8IOKGkyAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3MgcyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblJpdmVyID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiYSxcbiAgICBpY29uOiBpY29uYOKVkVxuICAgICAgfOKWiOKVkeKWiHxcbiAgICAgIHzilojilZHiloh8XG4gICAgICB84paI4pWR4paIfGAsXG4gICAgdGlsZTogWycgciB8IHIgfCByICcsICcgciB8IHIgfCAgICddLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzI6ZScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhFX2dhdGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJiLFxuICAgIGljb246IGljb25g4oipXG4gICAgICB84paI4oip4paIfFxuICAgICAgfOKWiCAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8IDxwfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIGVkZ2VzOiAnICAgcCcsXG4gICAgY29ubmVjdDogJ2UnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDU3LCAnZ2F0ZScpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX2lubiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmMsXG4gICAgaWNvbjogaWNvbmDiiKlcbiAgICAgIHzilojiiKniloh8XG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8cDxwfCAgICcsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlc2V0czoge21vdW50YWluOiB7fX0sXG4gICAgZWRnZXM6ICcgcCBwJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIGV4aXRzOiBbZG9vcigweDc2KV0sXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblBhdGhXRV9icmlkZ2VPdmVyU2xvcGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGJkLFxuICAgIGljb246IGljb25g4pWQXG4gICAgICB84paI4oaT4paIfFxuICAgICAgfCDilZAgfFxuICAgICAgfOKWiOKGk+KWiHxgLFxuICAgIHRpbGU6ICcg4oaTIHxwcHB8IOKGkyAnLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW46IHt9fSxcbiAgICBlZGdlczogJ3Nwc3AnLFxuICAgIGNvbm5lY3Q6ICc2ZScsIC8vICcyYXw2ZScsXG4gICAgZXhpdHM6IFtzZWFtbGVzc1VwKDB4YjYsIDQpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG1vdW50YWluUGF0aFdFX2JyaWRnZU92ZXJSaXZlciA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmQsXG4gICAgaWNvbjogaWNvbmDilZBcbiAgICAgIHzilojilZHiloh8XG4gICAgICB8IOKVkCB8XG4gICAgICB84paI4pWR4paIfGAsXG4gICAgdGlsZTogWycgciB8cHBwfCByICcsICcgciB8cHBwfCAgICddLFxuICAgIHRpbGVzZXRzOiB7bW91bnRhaW5SaXZlcjoge319LFxuICAgIGVkZ2VzOiAnd3B3cCcsXG4gICAgY29ubmVjdDogJzZlfDJ8YScsXG4gIH0pO1xuICByZWFkb25seSBtb3VudGFpblNsb3BlX3VuZGVyQnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhiZSxcbiAgICBpY29uOiBpY29uYOKGk1xuICAgICAgfOKWiOKGk+KWiHxcbiAgICAgIHwg4pWQIHxcbiAgICAgIHzilojihpPiloh8YCxcbiAgICB0aWxlOiAnIOKGkyB8cOKGk3B8IOKGkyAnLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge319LFxuICAgIC8vIFRPRE8gLSBjb3VsZCBmbHkgdW5kZXIgYnJpZGdlIG9uIG1vdW50YWluUml2ZXJcbiAgICBlZGdlczogJ3Nwc3AnLFxuICAgIGNvbm5lY3Q6ICcyYScsIC8vICcyYXw2ZScsXG4gICAgZXhpdHM6IFtzZWFtbGVzc0Rvd24oMHhjNiwgNCldLFxuICB9KTtcbiAgcmVhZG9ubHkgbW91bnRhaW5FbXB0eSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YmYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paI4paI4paIfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8ICAgfCAgICcsXG4gICAgdGlsZXNldHM6IHttb3VudGFpbjoge30sIG1vdW50YWluUml2ZXI6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5J10sXG4gICAgZWRnZXM6ICcgICAgJyxcbiAgICBkZWxldGU6IHRydWUsXG4gIH0pO1xuICByZWFkb25seSBib3VuZGFyeVMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGMwLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKWhOKWhOKWhHxcbiAgICAgIHzilojilojiloh8YCxcbiAgICB0aWxlOiAnb29vfG9vb3wgICAnLFxuICAgIHRpbGVzZXRzOiB7Z3Jhc3M6IHt9LCByaXZlcjoge30sIHNlYToge30sIGRlc2VydDoge319LFxuICAgIC8vIFRPRE8gLSBncmFzcy9yaXZlciBzaG91bGQgbWF5YmUgdXNlIHJvY2tzIGluc3RlYWQ/XG4gICAgZWRnZXM6ICdvXiBeJywgLy8gbyA9IG9wZW4sIF4gPSBvcGVuIHVwXG4gICAgLy9jb25uZWN0OiAnMjZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGJvdW5kYXJ5Tl9jYXZlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWiOKWiOKWiHxcbiAgICAgIHziloDiiKniloB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHxvPG98b29vJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgc2VhOiB7fSwgZGVzZXJ0OiB7fSxcbiAgICAgICAgICAgICAgIHJpdmVyOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguU2VhQ2F2ZUVudHJhbmNlXX19LFxuICAgIGVkZ2VzOiAnIHZvdicsIC8vIG8gPSBvcGVuLCB2ID0gb3BlbiBkb3duXG4gICAgZXhpdHM6IFtjYXZlKDB4NDkpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNvcm5lclNFX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGMyLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkOKWiHxcbiAgICAgIHziloTiiKniloh8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJ29vIHxvPCB8ICAgJyxcbiAgICB0aWxlc2V0czoge2dyYXNzOiB7fSwgcml2ZXI6IHt9LCBzZWE6IHt9LCBkZXNlcnQ6IHt9fSxcbiAgICBlZGdlczogJzxeICAnLFxuICAgIGV4aXRzOiBbY2F2ZSgweDVhKV0sXG4gIH0pO1xuICByZWFkb25seSB3YXRlcmZhbGwgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGMzLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKGk+KGk+KGk3xcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb29vfOKGk+KGk+KGk3xvb28nLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdoaXJscG9vbEJsb2NrZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGM0LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKWiOKVs+KWiHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb29vfOKGkyPihpN8b29vJyxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIC8vIFRPRE8gLSBpbmRpY2F0ZSBmbGFnXG4gICAgZmVhdHVyZTogWyd3aGlybHBvb2wnXSxcbiAgICBmbGFnOiAnY2FsbScsIC8vIGNhbG1lZCBzZWFcbiAgICBlZGdlczogJ29vb28nLFxuICB9KTtcbiAgcmVhZG9ubHkgYmVhY2hFeGl0TiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilogg4paIfFxuICAgICAgfOKWiOKVseKWgHxcbiAgICAgIHzilojilowgfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnIHggfCBib3wgb28nLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZWRnZXM6ICduID52JywgLy8gbiA9IFwibmFycm93XCJcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDl9KV0sXG4gIH0pO1xuICByZWFkb25seSB3aGlybHBvb2xPcGVuID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjNixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWzIHxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnb29vfG9vb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aGlybHBvb2wnXSxcbiAgICBlZGdlczogJ29vb28nLFxuICAgIGZsYWc6ICdjYWxtJywgLy8gYnV0IG9ubHkgaWYgb24gYW5ncnkgc2VhIC0gbm90IGRlc2VydC4uLlxuICB9KTtcbiAgcmVhZG9ubHkgcXVpY2tzYW5kT3BlbiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKVsyB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJ29vb3xvb298b29vJyxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge319LFxuICAgIGZlYXR1cmU6IFsnd2hpcmxwb29sJ10sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGxpZ2h0aG91c2VFbnRyYW5jZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilpfilp/iloh8XG4gICAgICB84paQ4oip4pabfFxuICAgICAgfOKWneKWgOKWmHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJ29vIHxvTG98b29vJyxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIC8vIFRPRE8gLSBpbmRpY2F0ZSB1bmlxdWVuZXNzP1xuICAgIGZlYXR1cmU6IFsnbGlnaHRob3VzZSddLFxuICAgIGVkZ2VzOiAnPG9vdicsXG4gICAgZXhpdHM6IFtjYXZlKDB4MmEpLCBkb29yKDB4NzUpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlYWNoQ2F2ZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojiiKniloh8XG4gICAgICB84paA4pWy4paIfFxuICAgICAgfCAgIHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJyAgIHxvPG98b29vJyxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnIHZvdicsXG4gICAgZXhpdHM6IFtjYXZlKDB4MjgpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGJlYWNoQ2FiaW5FbnRyYW5jZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4YzksXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4oip4paIfFxuICAgICAgfCDilbLiloB8XG4gICAgICB84paI4paE4paEfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnb28gfG9DOHwgICAnLFxuICAgIHRpbGVzZXRzOiB7c2VhOiB7fX0sXG4gICAgZmVhdHVyZTogWydjYWJpbiddLFxuICAgIGVkZ2VzOiAnPF4gYicsIC8vIGIgPSBcImJvYXRcIlxuICAgIGV4aXRzOiBbZG9vcigweDU1KSwgcmlnaHRFZGdlKHt0b3A6IDgsIGhlaWdodDogM30pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IG9jZWFuU2hyaW5lID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjYSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKWl+KWhOKWlnxcbiAgICAgIHzilpAq4paMfFxuICAgICAgfOKWnSDilph8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICdvb298b0FvfG9vbycsXG4gICAgdGlsZXNldHM6IHtzZWE6IHt9fSxcbiAgICAvLyBUT0RPIC0gaW5kaWNhdGUgdW5pcXVlbmVzcz9cbiAgICBmZWF0dXJlOiBbJ2FsdGFyJ10sXG4gICAgZWRnZXM6ICdvb29vJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHB5cmFtaWRFbnRyYW5jZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4Y2IsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paEIHxcbiAgICAgIHzilp/iiKnilpl8XG4gICAgICB8IOKVsyB8YCxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGU6ICdvb298b1BvfG9vbycsXG4gICAgdGlsZXNldHM6IHtkZXNlcnQ6IHt9fSxcbiAgICAvLyBUT0RPIC0gaW5kaWNhdGUgdW5pcXVlbmVzcz9cbiAgICBmZWF0dXJlOiBbJ3B5cmFtaWQnXSxcbiAgICBlZGdlczogJ29vb28nLFxuICAgIGV4aXRzOiBbY2F2ZSgweGE3KV0sXG4gIH0pO1xuICByZWFkb25seSBjcnlwdEVudHJhbmNlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjYyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilbMgfFxuICAgICAgfOKWkD7ilox8XG4gICAgICB84pad4paA4paYfGAsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlOiAnb29vfG9Zb3xvb28nLFxuICAgIHRpbGVzZXRzOiB7ZGVzZXJ0OiB7fX0sXG4gICAgZmVhdHVyZTogWydjcnlwdCddLFxuICAgIGVkZ2VzOiAnb29vbycsXG4gICAgZXhpdHM6IFtkb3duU3RhaXIoMHg2NyldLFxuICB9KTtcbiAgcmVhZG9ubHkgb2FzaXNMYWtlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhjZCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCBeIHxcbiAgICAgIHx2T3Z8XG4gICAgICB8IHZ2fGAsXG4gICAgdGlsZTogJ29vb3xvb298b3JvJyxcbiAgICBwbGFjZW1lbnQ6ICdtYW51YWwnLFxuICAgIHRpbGVzZXRzOiB7ZGVzZXJ0OiB7fX0sXG4gICAgZmVhdHVyZTogWydsYWtlJ10sXG4gICAgZWRnZXM6ICdvbzNvJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGRlc2VydENhdmVFbnRyYW5jZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4Y2UsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilpfiloTilpZ8XG4gICAgICB84pac4oip4pabfFxuICAgICAgfCDilbMgfGAsXG4gICAgdGlsZTogJ29vb3xvPG98b29vJyxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge30sXG4gICAgICAgICAgICAgICAvLyBUT0RPIC0gcHJvYmFibHkgbmVlZCB0byBwdWxsIHRoaXMgb3V0IHNpbmNlIGZsYWdzIGRpZmZlclxuICAgICAgICAgICAgICAgLy8gVE9ETyAtIHdlIGNvdWxkIGFsc28gbWFrZSB0aGlzIHdvcmthYmxlIGluIHJpdmVyIGlmIHdlIHdhbnRcbiAgICAgICAgICAgICAgIHNlYToge3JlcXVpcmVzOiBbU2NyZWVuRml4LlNlYUNhdmVFbnRyYW5jZV19fSxcbiAgICBlZGdlczogJ29vb28nLFxuICAgIGV4aXRzOiBbY2F2ZSgweGE3KV0sXG4gIH0pO1xuICByZWFkb25seSBvYXNpc0NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGNmLFxuICAgIGljb246IGljb25gXG4gICAgICB8IHZ2fFxuICAgICAgfOKWhOKIqXZ8XG4gICAgICB84paI4paMIHxgLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgdGlsZTogJ29yb3xvPG98IG9vJyxcbiAgICB0aWxlc2V0czoge2Rlc2VydDoge319LFxuICAgIGVkZ2VzOiAnM14+bycsXG4gICAgZXhpdHM6IFt1cFN0YWlyKDB4MzcpXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxFbmRXX2NhdmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQwLFxuICAgIGljb246IGljb25gXG4gICAgICB84paI4paI4oipfFxuICAgICAgfOKVkOKVkCB8XG4gICAgICB84paI4paI4paIfGAsXG4gICAgdGlsZTogJyAgIHxyPCB8ICAgJyxcbiAgICB0aWxlc2V0czoge2RvbHBoaW5DYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGV4aXRzOiBbdXBTdGFpcigweDU3KV0sXG4gIH0pO1xuICByZWFkb25seSBib2F0Q2hhbm5lbCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84paA4paA4paAfFxuICAgICAgfOKWhOKWhOKWhHxgLFxuICAgIHRpbGU6IFsnICAgfDg4OHwgICAnLCAnICAgfDg4eHwgICAnXSxcbiAgICB0aWxlc2V0czoge3NlYToge319LFxuICAgIGVkZ2VzOiAnIGIgYicsXG4gICAgZXhpdHM6IFt7Li4ucmlnaHRFZGdlKHt0b3A6IDgsIGhlaWdodDogM30pLCBlbnRyYW5jZTogMHg5Y2U4fSxcbiAgICAgICAgICAgIGxlZnRFZGdlKHt0b3A6IDgsIGhlaWdodDogM30pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGNoYW5uZWxXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilojilojiloh8XG4gICAgICB84pWQ4pWQ4pWQfFxuICAgICAgfOKWiOKWiOKWiHxgLFxuICAgIHRpbGU6ICcgICB8cnJyfCAgICcsXG4gICAgdGlsZXNldHM6IHtkb2xwaGluQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5XU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQzLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pWR4pSUfFxuICAgICAgfOKVkOKVrOKVkHxcbiAgICAgIHzilKzilIfilKx8YCxcbiAgICAgIC8vIHzilpjilZHilp18XG4gICAgICAvLyB84pWQ4pWs4pWQfFxuICAgICAgLy8gfOKWluKUhuKWl3xgLFxuICAgIC8vIFRPRE8gLSBjb25zaWRlciB1c2luZyBzb2xpZHMgZm9yIHRoZSBjb3JuZXJzIGluc3RlYWQ/XG4gICAgdGlsZTogJyByIHxycnJ8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInLCAnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdycnJyJyxcbiAgICBjb25uZWN0OiAnMTVwOjNkcDo3OS1iZicsXG4gICAgd2FsbDogMHhiNixcbiAgICBwb2k6IFtbNCwgMHgwMCwgMHg0OF0sIFs0LCAweDAwLCAweDk4XV0sXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgICAgLy8gfOKWjOKVkeKWkHxcbiAgICAgIC8vIHzilozilZHilpB8XG4gICAgICAvLyB84paM4pWR4paQfGAsXG4gICAgdGlsZTogJyByIHwgciB8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxOTozYicsXG4gICAgbW9kOiAnYnJpZGdlJywgLy8gZDYgaXMgdGhlIGJyaWRnZWQgdmVyc2lvblxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQ1LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlOiAnICAgfHJycnwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnIHIgcicsXG4gICAgY29ubmVjdDogJzVkOjdmJyxcbiAgICBtb2Q6ICdicmlkZ2UnLCAvLyBkNyBpcyB0aGUgYnJpZGdlZCB2ZXJzaW9uXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19icmlkZ2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQ2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfOKUnOKUh+KUpHxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICB0aWxlOiAnIHIgfCByIHwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlcicsICdicmlkZ2UnXSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxOS0zYicsXG4gICAgd2FsbDogMHg4NyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdFX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZDcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilKzilIB8XG4gICAgICB84pWQ4pSF4pWQfFxuICAgICAgfOKUgOKUtOKUgHxgLFxuICAgIHRpbGU6ICcgICB8cnJyfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnIHIgcicsXG4gICAgY29ubmVjdDogJzVkLTdmJyxcbiAgICB3YWxsOiAweDg2LFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGQ4LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSAfFxuICAgICAgfOKUguKVlOKVkHxcbiAgICAgIHzilILilZHilIx8YCxcbiAgICB0aWxlOiAnICAgfCBycnwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnICBycicsXG4gICAgY29ubmVjdDogJzlkOmJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUkHxcbiAgICAgIHzilZDilZfilIJ8XG4gICAgICB84pSQ4pWR4pSCfGAsXG4gICAgdGlsZTogJyAgIHxyciB8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJyByciAnLFxuICAgIGNvbm5lY3Q6ICc1Yjo3OScsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZGEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilJR8XG4gICAgICB84pSC4pWa4pWQfFxuICAgICAgfOKUlOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgciB8IHJyfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdyICByJyxcbiAgICBjb25uZWN0OiAnMWY6M2QnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGRiLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pWR4pSCfFxuICAgICAgfOKVkOKVneKUgnxcbiAgICAgIHzilIDilIDilJh8YCxcbiAgICB0aWxlOiAnIHIgfHJyIHwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAncnIgICcsXG4gICAgY29ubmVjdDogJzE1OjM3JyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZVdFX3Bhc3NhZ2VOID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkYyxcbiAgICBpY29uOiBpY29uYOKVp1xuICAgICAgfOKUgOKUtOKUgHxcbiAgICAgIHzilZDilZDilZB8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZTogJyBjIHxycnJ8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ2NyIHInLFxuICAgIGNvbm5lY3Q6ICcyNWQ6N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV0VfcGFzc2FnZVMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGRkLFxuICAgIGljb246IGljb25g4pWkXG4gICAgICB84pSA4pSA4pSAfFxuICAgICAgfOKVkOKVkOKVkHxcbiAgICAgIHzilIDilKzilIB8YCxcbiAgICB0aWxlOiAnICAgfHJycnwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnIHJjcicsXG4gICAgY29ubmVjdDogJzVkOjdhZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOU19wYXNzYWdlVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZGUsXG4gICAgaWNvbjogaWNvbmDilaJcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSk4pWR4pSCfFxuICAgICAgfOKUguKVkeKUgnxgLFxuICAgIHRpbGU6ICcgciB8Y3IgfCByICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICdyY3IgJyxcbiAgICBjb25uZWN0OiAnMTY5OjNiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TX3Bhc3NhZ2VFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhkZixcbiAgICBpY29uOiBpY29uYOKVn1xuICAgICAgfOKUguKVkeKUgnxcbiAgICAgIHzilILilZHilJx8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZTogJyByIHwgcmN8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ3IgcmMnLFxuICAgIGNvbm5lY3Q6ICcxOTozYmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxORSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHwg4pSX4pSBfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgdyB8IHd3fCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAndyAgdycsXG4gICAgY29ubmVjdDogJzJlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTkUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUwLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pSD4pSUfFxuICAgICAgfOKUguKUl+KUgXxcbiAgICAgIHzilJTilIDilIB8YCxcbiAgICB0aWxlOiAnIHcgfCB3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICd3ICB3JyxcbiAgICBjb25uZWN0OiAnMWZ8MmV8M2QnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxORV9ibG9ja2VkTGVmdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilIPilJR8XG4gICAgICB8IOKUl+KUgXxcbiAgICAgIHzilJTilIDilIB8YCxcbiAgICB0aWxlOiAnIHcgfCB3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4NjFdfX0sXG4gICAgZWRnZXM6ICd3ICB3JyxcbiAgICBjb25uZWN0OiAnMXxmfDJlfDNkJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTkVfYmxvY2tlZFJpZ2h0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKUgyB8XG4gICAgICB84pSC4pSX4pSBfFxuICAgICAgfOKUlOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgdyB8IHd3fCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHgwZF19fSxcbiAgICBlZGdlczogJ3cgIHcnLFxuICAgIGNvbm5lY3Q6ICcxZnwyZXwzfGQnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxOVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHzilIHilJsgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6ICcgdyB8d3cgfCAgICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAnd3cgICcsXG4gICAgY29ubmVjdDogJzI2JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUxLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSD4pSCfFxuICAgICAgfOKUgeKUm+KUgnxcbiAgICAgIHzilIDilIDilJh8YCxcbiAgICB0aWxlOiAnIHcgfHd3IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlV2FsbDogMHg2ZH19LFxuICAgIGVkZ2VzOiAnd3cgICcsXG4gICAgY29ubmVjdDogJzE1fDI2fDM3JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldfYmxvY2tlZFJpZ2h0ID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKUg+KUgnxcbiAgICAgIHzilIHilJsgfFxuICAgICAgfOKUgOKUgOKUmHxgLFxuICAgIHRpbGU6ICcgdyB8d3cgfCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3d3ICAnLFxuICAgIGNvbm5lY3Q6ICcxNXwyNnwzfDcnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV19ibG9ja2VkTGVmdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSD4pSCfFxuICAgICAgfOKUgeKUm+KUgnxcbiAgICAgIHzilIDilIDilJh8YCxcbiAgICB0aWxlOiAnIHcgfHd3IHwgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4MDFdLCByZW1vdmVXYWxsOiAweDZkfX0sXG4gICAgZWRnZXM6ICd3dyAgJyxcbiAgICBjb25uZWN0OiAnMXw1fDI2fDM3JyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUyLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfCDilI/ilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlOiAnICAgfCB3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJyAgd3cnLFxuICAgIGNvbm5lY3Q6ICdhZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUgHxcbiAgICAgIHzilILilI/ilIF8XG4gICAgICB84pSC4pSD4pSMfGAsXG4gICAgdGlsZTogJyAgIHwgd3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnICB3dycsXG4gICAgY29ubmVjdDogJzlkfGFlfGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsU0VfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUyLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSA4pSAfFxuICAgICAgfCDilI/ilIF8XG4gICAgICB84pSC4pSD4pSMfGAsXG4gICAgdGlsZTogJyAgIHwgd3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDYxXX19LFxuICAgIGVkZ2VzOiAnICB3dycsXG4gICAgY29ubmVjdDogJzl8ZHxhZXxiZicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFNFX2Jsb2NrZWRSaWdodCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIzilIDilIB8XG4gICAgICB84pSC4pSP4pSBfFxuICAgICAgfOKUguKUgyB8YCxcbiAgICB0aWxlOiAnICAgfCB3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4ZGRdfX0sXG4gICAgZWRnZXM6ICcgIHd3JyxcbiAgICBjb25uZWN0OiAnOWR8YWV8YnxmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsV1MgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUzLFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgeKUkyB8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlOiAnICAgfHd3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJyB3dyAnLFxuICAgIGNvbm5lY3Q6ICc2YScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFdTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUkHxcbiAgICAgIHzilIHilJPilIJ8XG4gICAgICB84pSQ4pSD4pSCfGAsXG4gICAgdGlsZTogJyAgIHx3dyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZVdhbGw6IDB4OWR9fSxcbiAgICBlZGdlczogJyB3dyAnLFxuICAgIGNvbm5lY3Q6ICc1Ynw2YXw3OScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFdTX2Jsb2NrZWRSaWdodCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilJB8XG4gICAgICB84pSB4pSTIHxcbiAgICAgIHzilJDilIPilIJ8YCxcbiAgICB0aWxlOiAnICAgfHd3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7fX0sXG4gICAgZWRnZXM6ICcgd3cgJyxcbiAgICBjb25uZWN0OiAnNXxifDZhfDc5JyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsV1NfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGUzLFxuICAgIGljb246IGljb25gXG4gICAgICB84pSA4pSA4pSQfFxuICAgICAgfOKUgeKUk+KUgnxcbiAgICAgIHwg4pSD4pSCfGAsXG4gICAgdGlsZTogJyAgIHx3dyB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweGQxXSwgcmVtb3ZlV2FsbDogMHg5ZH19LFxuICAgIGVkZ2VzOiAnIHd3ICcsXG4gICAgY29ubmVjdDogJzVifDZhfDd8OScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5TX3N0YWlycyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTQsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJzilKjilIJ8XG4gICAgICB84pSC4pSD4pSCfFxuICAgICAgfOKUguKUoOKUpHxgLFxuICAgIHRpbGU6ICcgdyB8IEggfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxMjM5YWInLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19zdGFpcnNCbG9ja2VkMTMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU0LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSU4pSo4pSCfFxuICAgICAgfOKVt+KUg+KVtXxcbiAgICAgIHzilILilKDilJB8YCxcbiAgICB0aWxlOiAnIHcgfCBIIHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4NDEsIDB4OGRdfX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMTJhYnwzfDknLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19zdGFpcnNCbG9ja2VkMjQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU0LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSM4pSo4pSCfFxuICAgICAgfOKUguKUg+KUgnxcbiAgICAgIHzilILilKDilJh8YCxcbiAgICB0aWxlOiAnIHcgfCBIIHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4MDEsIDB4Y2RdfX0sXG4gICAgZWRnZXM6ICd3IHcgJyxcbiAgICBjb25uZWN0OiAnMXwyMzlhfGInLFxuICB9KTtcbiAgLy8gVE9ETyAtIGN1c3RvbSBpbnZlcnRlZCB2ZXJzaW9uIG9mIGU0IHdpdGggdGhlIHRvcCBzdGFpciBvbiB0aGUgcmlnaHRcbiAgcmVhZG9ubHkgd2lkZUhhbGxOU19kZWFkRW5kcyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pW5IHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKVuyB8YCxcbiAgICB0aWxlOiAnIHcgfCAgIHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcyfGEnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiByZWFjaGFibGUoMHgxMTAsIDB4NzgpICYmIHJlYWNoYWJsZSgtMHgzMCwgMHg3OCksXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbF9kZWFkRW5kTiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pW5IHxcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogWycgdyB8ICAgfCAgICcsICcgdyB8IHcgfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3cgICAnLFxuICAgIGNvbm5lY3Q6ICcyJyxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDExMCwgMHg3OCkgJiYgcmVhY2hhYmxlKC0weDMwLCAweDc4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsX2RlYWRFbmRTID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgICB8XG4gICAgICB8IOKVuyB8YCxcbiAgICB0aWxlOiBbJyAgIHwgICB8IHcgJywgJyAgIHwgdyB8IHcgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAnICB3ICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiByZWFjaGFibGUoMHgxMTAsIDB4NzgpICYmICFyZWFjaGFibGUoLTB4MzAsIDB4NzgpLFxuICB9KTtcbiAgLy8gVE9ETyAtIGFkZCBvbmUtd2F5IHZpZXdzIG9mIHRoaXM/IT9cbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOU19kZWFkRW5kID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUguKVueKUgnxcbiAgICAgIHzilJzilIDilKR8XG4gICAgICB84pSC4pW74pSCfGAsXG4gICAgdGlsZTogJyB3IHwgPSB8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAndyB3ICcsXG4gICAgY29ubmVjdDogJzEzOWJ8MnxhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfZGVhZEVuZEJsb2NrZWQyNCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilbXilbnilIJ8XG4gICAgICB84pSM4pSA4pSYfFxuICAgICAgfOKUguKVu+KVt3xgLFxuICAgIHRpbGU6ICcgdyB8ID0gfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHg2MSwgMHhhZF19fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxfDJ8Mzl8YXxiJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfZGVhZEVuZEJsb2NrZWQxMyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilbnilbV8XG4gICAgICB84pSU4pSA4pSQfFxuICAgICAgfOKVt+KVu+KUgnxgLFxuICAgIHRpbGU6ICcgdyB8ID0gfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHg2ZCwgMHhhMV19fSxcbiAgICBlZGdlczogJ3cgdyAnLFxuICAgIGNvbm5lY3Q6ICcxYnwyfDN8OXxhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTldTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHzilIHilYvilIF8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlOiAnIHcgfHd3d3wgdyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnXSxcbiAgICBlZGdlczogJ3d3d3cnLFxuICAgIGNvbm5lY3Q6ICcyNmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilJjilIPilJR8XG4gICAgICB84pSB4pWL4pSBfFxuICAgICAgfOKUkOKUg+KUjHxgLFxuICAgIHRpbGU6ICcgdyB8d3d3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJ3d3d3cnLFxuICAgIGNvbm5lY3Q6ICcyNmFlfDE1fDNkfDc5fGJmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldTRV9ibG9ja2VkMTMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pSDIHxcbiAgICAgIHzilIHilYvilIF8XG4gICAgICB8IOKUg+KUjHxgLFxuICAgIHRpbGU6ICcgdyB8d3d3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHtyZXF1aXJlczogW1NjcmVlbkZpeC5MYWJ5cmludGhQYXJhcGV0c10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRXYWxsOiBbMHgwZCwgMHhkMV19fSxcbiAgICBlZGdlczogJ3d3d3cnLFxuICAgIGNvbm5lY3Q6ICcyNmFlfDE1fDN8ZHw3fDl8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxOV1NFX2Jsb2NrZWQyNCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSD4pSUfFxuICAgICAgfOKUgeKVi+KUgXxcbiAgICAgIHzilJDilIMgfGAsXG4gICAgdGlsZTogJyB3IHx3d3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweDAxLCAweGRkXX19LFxuICAgIGVkZ2VzOiAnd3d3dycsXG4gICAgY29ubmVjdDogJzI2YWV8MXw1fDNkfDc5fGJ8ZicsXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbE5XRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTcsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSDIHxcbiAgICAgIHzilIHilLvilIF8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyB3IHx3d3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICd3dyB3JyxcbiAgICBjb25uZWN0OiAnMjZlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTldFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUmOKUg+KUlHxcbiAgICAgIHzilIHilLvilIF8XG4gICAgICB84pSA4pSA4pSAfGAsXG4gICAgdGlsZTogJyB3IHx3d3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge319LFxuICAgIGVkZ2VzOiAnd3cgdycsXG4gICAgY29ubmVjdDogJzI2ZXwxNXwzZHw3ZicsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbE5XRV9ibG9ja2VkVG9wID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIMgfFxuICAgICAgfOKUgeKUu+KUgXxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlOiAnIHcgfHd3d3wgICAnLFxuICAgIHRpbGVzZXRzOiB7bGFieXJpbnRoOiB7cmVxdWlyZXM6IFtTY3JlZW5GaXguTGFieXJpbnRoUGFyYXBldHNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkV2FsbDogWzB4MDEsIDB4MGRdfX0sXG4gICAgZWRnZXM6ICd3dyB3JyxcbiAgICBjb25uZWN0OiAnMjZlfDF8NXwzfGR8N2YnLFxuICB9KTtcbiAgcmVhZG9ubHkgd2lkZUhhbGxXU0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGU4LFxuICAgIGljb246IGljb25gXG4gICAgICB8ICAgfFxuICAgICAgfOKUgeKUs+KUgXxcbiAgICAgIHwg4pSDIHxgLFxuICAgIHRpbGU6ICcgICB8d3d3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsnd2lkZSddLFxuICAgIGVkZ2VzOiAnIHd3dycsXG4gICAgY29ubmVjdDogJzZhZScsXG4gIH0pO1xuICByZWFkb25seSBnb2FXaWRlSGFsbFdTRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pSB4pSz4pSBfFxuICAgICAgfOKUkOKUg+KUjHxgLFxuICAgIHRpbGU6ICcgICB8d3d3fCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJyB3d3cnLFxuICAgIGNvbm5lY3Q6ICc2YWV8NWR8Nzl8YmYnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXU0VfYmxvY2tlZEJvdHRvbSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTgsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pSB4pSz4pSBfFxuICAgICAgfCDilIMgfGAsXG4gICAgdGlsZTogJyAgIHx3d3d8IHcgJyxcbiAgICB0aWxlc2V0czoge2xhYnlyaW50aDoge3JlcXVpcmVzOiBbU2NyZWVuRml4LkxhYnlyaW50aFBhcmFwZXRzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZFdhbGw6IFsweGQxLCAweGRkXX19LFxuICAgIGVkZ2VzOiAnIHd3dycsXG4gICAgY29ubmVjdDogJzZhZXw1ZHw3fDl8YnxmJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHdpZGVIYWxsTlNfd2FsbFRvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTksICAgIC8vIE5PVEU6IHRoZSBwYXNzYWdlIG5hcnJvd3MgYXQgdGhlIHRvcFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUhiB8XG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8YCxcbiAgICB0aWxlOiAnIG4gfCB3IHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dpZGUnLCAnd2FsbCddLFxuICAgIGVkZ2VzOiAnYyB3JyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIGV4aXRzOiBbdG9wRWRnZSh7bGVmdDogNiwgd2lkdGg6IDR9KV0sXG4gICAgd2FsbDogMHgzNyxcbiAgICBzdGF0dWVzOiBbMHhhXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGdvYVdpZGVIYWxsTlNfd2FsbFRvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZTksICAgIC8vIE5PVEU6IHRoZSBwYXNzYWdlIG5hcnJvd3MgYXQgdGhlIHRvcFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUhiB8XG4gICAgICB84pW34pSD4pW3fFxuICAgICAgfOKUguKUg+KUgnxgLFxuICAgIHRpbGU6ICcgbiB8IHcgfCB3ICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3dhbGwnXSxcbiAgICBlZGdlczogJ2MgdyAnLFxuICAgIGNvbm5lY3Q6ICcyYXh8OXxiJyxcbiAgICBleGl0czogW3RvcEVkZ2Uoe2xlZnQ6IDYsIHdpZHRoOiA0fSldLFxuICAgIHdhbGw6IDB4MzcsXG4gICAgc3RhdHVlczogWzB4YV0sXG4gIH0pO1xuICByZWFkb25seSB3aWRlSGFsbFdFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhlYSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIHilIHilIF8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogJyAgIHx3d3d8ICAgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWyd3aWRlJ10sXG4gICAgZWRnZXM6ICcgdyB3JyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICB9KTtcbiAgcmVhZG9ubHkgZ29hV2lkZUhhbGxXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilIDilIDilIB8XG4gICAgICB84pSB4pSB4pSBfFxuICAgICAgfOKUgOKUgOKUgHxgLFxuICAgIHRpbGU6ICcgICB8d3d3fCAgICcsXG4gICAgdGlsZXNldHM6IHtsYWJ5cmludGg6IHt9fSxcbiAgICBlZGdlczogJyB3IHcnLFxuICAgIGNvbm5lY3Q6ICc1ZHw2ZXw3ZicsXG4gIH0pO1xuICByZWFkb25seSBwaXRXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWIsXG4gICAgdGlsZTogJyAgIHxjcGN8ICAgJyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHzilIDilbPilIB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncGl0J10sXG4gICAgZWRnZXM6ICcgYyBjJyxcbiAgICBjb25uZWN0OiAnNmUnLFxuICAgIHBsYXRmb3JtOiB7dHlwZTogJ2hvcml6b250YWwnLCBjb29yZDogMHg3MF8zOH0sXG4gIH0pO1xuICByZWFkb25seSBwaXROUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWMsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4pSCIHxcbiAgICAgIHwg4pWzIHxcbiAgICAgIHwg4pSCIHxgLFxuICAgIHRpbGU6ICcgYyB8IHAgfCBjICcsXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319LFxuICAgIGZlYXR1cmU6IFsncGl0J10sXG4gICAgZWRnZXM6ICdjIGMgJyxcbiAgICBjb25uZWN0OiAnMmEnLFxuICAgIHBsYXRmb3JtOiB7dHlwZTogJ3ZlcnRpY2FsJywgY29vcmQ6IDB4NDBfNzh9LFxuICB9KTtcbiAgcmVhZG9ubHkgcGl0TlNfdW5yZWFjaGFibGUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVjLFxuICAgIGljb246IGljb25gXFxufCAgIHxcXG58ICAgfFxcbnwgICB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eSddLFxuICAgIHBsYWNlbWVudDogJ21hbnVhbCcsXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHg4MCwgMHg4MCksXG4gICAgZGVsZXRlOiB0cnVlLFxuICB9KTtcbiAgcmVhZG9ubHkgc3Bpa2VzTlNfaGFsbFMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVkLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkSB8XG4gICAgICB8IOKWkSB8XG4gICAgICB8IOKUgiB8YCxcbiAgICB0aWxlOiAnIHMgfCBzIHwgYyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAncyBjICcsIC8vIHMgPSBzcGlrZXNcbiAgICBjb25uZWN0OiAnMmEnLFxuICB9KTtcbiAgcmVhZG9ubHkgc3Bpa2VzTlNfaGFsbE4gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGVlLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgiB8XG4gICAgICB8IOKWkSB8XG4gICAgICB8IOKWkSB8YCxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgdGlsZTogJyBjIHwgcyB8IHMgJyxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAnYyBzICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TX2hhbGxXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZWYsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwg4paRIHxcbiAgICAgIHzilIDilpHilIB8XG4gICAgICB8IOKWkSB8YCxcbiAgICB0aWxlOiAnIHMgfGNzY3wgcyAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAnc2NzYycsXG4gICAgY29ubmVjdDogJzI2YWUnLFxuICB9KTtcbiAgcmVhZG9ubHkgc3Bpa2VzTlNfaGFsbFcgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiB+MHhlMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpEgfFxuICAgICAgfOKUgOKWkSB8XG4gICAgICB8IOKWkSB8YCxcbiAgICB0aWxlc2V0czogd2l0aFJlcXVpcmUoU2NyZWVuRml4LkV4dHJhU3Bpa2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fSwgcHlyYW1pZDoge30sIGljZUNhdmU6IHt9fSksXG4gICAgdGlsZTogJyBzIHxjcyB8IHMgJyxcbiAgICBmZWF0dXJlOiBbJ3NwaWtlcyddLFxuICAgIGVkZ2VzOiAnc2NzICcsXG4gICAgY29ubmVjdDogJzI2YScsXG4gIH0pO1xuICByZWFkb25seSBzcGlrZXNOU19oYWxsRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IH4weGUxLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKWkSB8XG4gICAgICB8IOKWkeKUgHxcbiAgICAgIHwg4paRIHxgLFxuICAgIHRpbGVzZXRzOiB3aXRoUmVxdWlyZShTY3JlZW5GaXguRXh0cmFTcGlrZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fSwgaWNlQ2F2ZToge319KSxcbiAgICB0aWxlOiAnIHMgfCBzY3wgcyAnLFxuICAgIGZlYXR1cmU6IFsnc3Bpa2VzJ10sXG4gICAgZWRnZXM6ICdzIHNjJyxcbiAgICBjb25uZWN0OiAnMmFlJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc05TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMCxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilaggfFxuICAgICAgfCAgIHxcbiAgICAgIHwg4pWlIHxgLFxuICAgIHRpbGU6ICcgciB8ICAgfCByICcsXG4gICAgcGxhY2VtZW50OiAnbWFudWFsJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknLCAncml2ZXInXSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxcDozcHw5cDpicCcsXG4gICAgcG9pOiBbWzEsIC0weDMwLCAweDQ4XSwgWzEsIC0weDMwLCAweDk4XSxcbiAgICAgICAgICBbMSwgMHgxMTAsIDB4NDhdLCBbMSwgMHgxMTAsIDB4OThdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZV9kZWFkRW5kc04gPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGYwLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKVqCB8XG4gICAgICB8ICAgfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnIHIgfCAgIHwgICAnLCAnIHIgfCByIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsnZW1wdHknLCAncml2ZXInXSxcbiAgICBlZGdlczogJ3IgICAnLFxuICAgIGNvbm5lY3Q6ICcxcDozcCcsXG4gICAgcG9pOiBbWzEsIC0weDMwLCAweDQ4XSwgWzEsIC0weDMwLCAweDk4XV0sXG4gICAgbWF0Y2g6IChyZWFjaGFibGUpID0+ICFyZWFjaGFibGUoMHgxMDgsIDB4NDgpICYmICFyZWFjaGFibGUoMHgxMDgsIDB4OTgpLFxuICAgIG1vZDogJ2JyaWRnZScsIC8vIGYyIGlzIGJyaWRnZWQgdmVyc2lvblxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzUyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjAsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8ICAgfFxuICAgICAgfCDilaUgfGAsXG4gICAgdGlsZTogWycgICB8ICAgfCByICcsICcgICB8IHIgfCByICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eScsICdyaXZlciddLFxuICAgIGVkZ2VzOiAnICByICcsXG4gICAgY29ubmVjdDogJzlwOmJwJyxcbiAgICBwb2k6IFtbMSwgMHgxMTAsIDB4NDhdLCBbMSwgMHgxMTAsIDB4OThdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgtMHgzMCwgMHg0OCkgJiYgIXJlYWNoYWJsZSgtMHgzMCwgMHg5OCksXG4gICAgbW9kOiAnYnJpZGdlJywgLy8gZjIgaXMgYnJpZGdlZCB2ZXJzaW9uXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNXRSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pWhIOKVnnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiAnICAgfHIgcnwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eScsICdyaXZlciddLFxuICAgIGVkZ2VzOiAnIHIgcicsXG4gICAgY29ubmVjdDogJzVwOjdwfGRwOmZwJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgLTB4MjhdLCBbMSwgMHhhMCwgLTB4MjhdLFxuICAgICAgICAgIFsxLCAweDYwLCAweDEwOF0sIFsxLCAweGEwLCAweDEwOF1dLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlX2RlYWRFbmRzVyA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB84pWhICB8XG4gICAgICB8ICAgfGAsXG4gICAgdGlsZTogWycgICB8ciAgfCAgICcsICcgICB8cnIgfCAgICddLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydlbXB0eScsICdyaXZlciddLFxuICAgIGVkZ2VzOiAnIHIgICcsXG4gICAgY29ubmVjdDogJzVwOjdwJyxcbiAgICBwb2k6IFtbMSwgMHg2MCwgLTB4MjhdLCBbMSwgMHhhMCwgLTB4MjhdXSxcbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDYwLCAweDEwOCkgJiYgIXJlYWNoYWJsZSgweGEwLCAweDEwOCksXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVfZGVhZEVuZHNFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCAgIHxcbiAgICAgIHwgIOKVnnxcbiAgICAgIHwgICB8YCxcbiAgICB0aWxlOiBbJyAgIHwgIHJ8ICAgJywgJyAgIHwgcnJ8ICAgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2VtcHR5JywgJ3JpdmVyJ10sXG4gICAgZWRnZXM6ICcgICByJyxcbiAgICBjb25uZWN0OiAnZHA6ZnAnLFxuICAgIHBvaTogW1sxLCAweDYwLCAweDEwOF0sIFsxLCAweGEwLCAweDEwOF1dLFxuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4NjAsIC0weDI4KSAmJiAhcmVhY2hhYmxlKDB4YTAsIC0weDI4KSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5fYnJpZGdlID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMixcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilIcgfFxuICAgICAgfCDilaggfFxuICAgICAgfCAgIHxgLFxuICAgIHRpbGU6IFsnIHIgfCByIHwgICAnLCAnIHIgfCAgIHwgICAnXSxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInLCAnYnJpZGdlJ10sXG4gICAgZWRnZXM6ICdyICAgJyxcbiAgICBjb25uZWN0OiAnMS0zJyxcbiAgICB3YWxsOiAweDE3LFxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBhIHBvaSgyKSBoZXJlP1xuICAgIG1hdGNoOiAocmVhY2hhYmxlKSA9PiAhcmVhY2hhYmxlKDB4ZDAsIDB4NDgpICYmICFyZWFjaGFibGUoMHhkMCwgMHg5OCksXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVTX2JyaWRnZSA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjIsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHwgICB8XG4gICAgICB8IOKVpSB8XG4gICAgICB8IOKUhyB8YCxcbiAgICB0aWxlOiBbJyAgIHwgciB8IHIgJywgJyAgIHwgICB8IHIgJ10sXG4gICAgdGlsZXNldHM6IHtjYXZlOiB7fSwgZm9ydHJlc3M6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ3JpdmVyJywgJ2JyaWRnZSddLFxuICAgIGVkZ2VzOiAnICByICcsXG4gICAgY29ubmVjdDogJzktYicsXG4gICAgd2FsbDogMHhjNixcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgYSBwb2koMikgaGVyZT9cbiAgICBtYXRjaDogKHJlYWNoYWJsZSkgPT4gIXJlYWNoYWJsZSgweDEwLCAweDQ4KSAmJiAhcmVhY2hhYmxlKDB4MTAsIDB4OTgpLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlV1NFID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmMyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUgOKUgOKUgHxcbiAgICAgIHzilZDilabilZB8XG4gICAgICB84pSQ4pWR4pSMfGAsXG4gICAgdGlsZTogJyAgIHxycnJ8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJyBycnInLFxuICAgIGNvbm5lY3Q6ICc1ZDo3OTpiZicsXG4gIH0pO1xuICByZWFkb25seSByaXZlckNhdmVOV0UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGY0LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSY4pWR4pSUfFxuICAgICAgfOKVkOKVqeKVkHxcbiAgICAgIHzilIDilIDilIB8YCxcbiAgICB0aWxlOiAnIHIgfHJycnwgICAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAncnIgcicsXG4gICAgY29ubmVjdDogJzE1cDozZHA6N2YnLFxuICAgIHBvaTogW1s0LCAweDAwLCAweDQ4XSwgWzQsIDB4MDAsIDB4OThdXSxcbiAgfSk7XG4gIHJlYWRvbmx5IHJpdmVyQ2F2ZU5TX2Jsb2NrZWRSaWdodCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZjUsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilILilZHilIJ8XG4gICAgICB84pSC4pWRIHxcbiAgICAgIHzilILilZHilIJ8YCxcbiAgICB0aWxlOiAnIHIgfCByIHwgciAnLFxuICAgIHRpbGVzZXRzOiB7Y2F2ZToge30sIGZvcnRyZXNzOiB7fX0sXG4gICAgZmVhdHVyZTogWydyaXZlciddLFxuICAgIGVkZ2VzOiAnciByICcsXG4gICAgY29ubmVjdDogJzE5OjNwOmJwJyxcbiAgICBwb2k6IFtbMCwgMHg0MCwgMHg5OF0sIFswLCAweGMwLCAweDk4XV0sXG4gICAgbW9kOiAnYmxvY2snLFxuICB9KTtcbiAgcmVhZG9ubHkgcml2ZXJDYXZlTlNfYmxvY2tlZExlZnQgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGY2LFxuICAgIGljb246IGljb25gXG4gICAgICB84pSC4pWR4pSCfFxuICAgICAgfCDilZHilIJ8XG4gICAgICB84pSC4pWR4pSCfGAsXG4gICAgdGlsZTogJyByIHwgciB8IHIgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge319LFxuICAgIGZlYXR1cmU6IFsncml2ZXInXSxcbiAgICBlZGdlczogJ3IgciAnLFxuICAgIGNvbm5lY3Q6ICcxcDozYjo5cCcsXG4gICAgcG9pOiBbWzAsIDB4MzAsIDB4NDhdLCBbMCwgMHhiMCwgMHg0OF1dLFxuICAgIG1vZDogJ2Jsb2NrJyxcbiAgfSk7XG4gIHJlYWRvbmx5IHNwaWtlc05TID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmNyxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilpEgfFxuICAgICAgfCDilpEgfGAsXG4gICAgdGlsZTogJyBzIHwgcyB8IHMgJyxcbiAgICB0aWxlc2V0czoge2NhdmU6IHt9LCBmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9LCBpY2VDYXZlOiB7fX0sXG4gICAgZmVhdHVyZTogWydzcGlrZXMnXSxcbiAgICBlZGdlczogJ3MgcyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gIH0pO1xuICByZWFkb25seSBjcnlwdEFyZW5hX3N0YXR1ZXMgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGY4LFxuICAgIGljb246IGljb25gPFxuICAgICAgfCY8JnxcbiAgICAgIHzilIIg4pSCfFxuICAgICAgfOKUlOKUrOKUmHxgLFxuICAgIHRpbGU6ICcgICB8IGEgfCBjICcsXG4gICAgdGlsZXNldHM6IHtweXJhbWlkOiB7fX0sXG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnICBjICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGV4aXRzOiBbey4uLnVwU3RhaXIoMHg1NyksIHR5cGU6ICdjcnlwdCd9XSxcbiAgICBmbGFnOiAnY3VzdG9tOmZhbHNlJyxcbiAgICBhcmVuYTogMixcbiAgfSk7XG4gIHJlYWRvbmx5IHB5cmFtaWRBcmVuYV9kcmF5Z29uID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmOSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUjOKUgOKUkHxcbiAgICAgIHzilILilbPilIJ8XG4gICAgICB84pSU4pSs4pSYfGAsXG4gICAgdGlsZTogJyAgIHwgYSB8IHcgJyxcbiAgICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgICBmZWF0dXJlOiBbJ2FyZW5hJywgJ3BpdCddLFxuICAgIGVkZ2VzOiAnICB3ICcsXG4gICAgY29ubmVjdDogJ2EnLFxuICAgIGFyZW5hOiAzLFxuICB9KTtcbiAgcmVhZG9ubHkgY3J5cHRBcmVuYV9kcmF5Z29uMiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4ZmEsXG4gICAgaWNvbjogaWNvbmBcbiAgICAgIHzilI/ilLfilJN8XG4gICAgICB84pSDJuKUg3xcbiAgICAgIHzilJfilLPilJt8YCxcbiAgICB0aWxlOiAnIHggfCBhIHwgdyAnLFxuICAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge319LFxuICAgIGZlYXR1cmU6IFsnYXJlbmEnXSxcbiAgICBlZGdlczogJ2MgdyAnLFxuICAgIGNvbm5lY3Q6ICcyYScsXG4gICAgZXhpdHM6IFt0b3BFZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pXSxcbiAgICBmbGFnOiAnY3VzdG9tOmZhbHNlJyxcbiAgICBhcmVuYTogNCxcbiAgfSk7XG4gIHJlYWRvbmx5IGNyeXB0QXJlbmFfZW50cmFuY2UgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGZiLFxuICAgIGljb246IGljb25gXG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKUgyB8XG4gICAgICB8IOKVvyB8YCxcbiAgICB0aWxlOiAnIHcgfCB3IHwgeCAnLFxuICAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge319LFxuICAgIGVkZ2VzOiAndyBuICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW2JvdHRvbUVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBjcnlwdFRlbGVwb3J0ZXIgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGZjLFxuICAgIHRpbGVzZXRzOiB7cHlyYW1pZDoge30sIHRvd2VyOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNH0pLCBjYXZlKDB4NTcsICd0ZWxlcG9ydGVyJyldLFxuICB9KTtcbiAgcmVhZG9ubHkgZm9ydHJlc3NBcmVuYV90aHJvdWdoID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmZCxcbiAgICBpY29uOiBpY29uYOKVvVxuICAgICAgfOKUjOKUtOKUkHxcbiAgICAgIHzilIIg4pSCfFxuICAgICAgfOKUleKUs+KUmXxgLFxuICAgIHRpbGU6IFsnIGMgfCBhIHwgdyAnLCAnIG4gfCBhIHwgdyAnXSwgLy8geCB8IGEgfCB3ID8/XG4gICAgdGlsZXNldHM6IHtmb3J0cmVzczoge30sIHB5cmFtaWQ6IHt9fSxcbiAgICAvLyBOT1RFOiB3ZSBjb3VsZCB1c2UgdGhpcyBmb3IgYSBwaXQgdGhhdCByZXF1aXJlcyBmbGlnaHQgdG8gY3Jvc3M/XG4gICAgZmVhdHVyZTogWydhcmVuYSddLFxuICAgIGVkZ2VzOiAnbiB3ICcsXG4gICAgY29ubmVjdDogJzJhJyxcbiAgICBleGl0czogW3RvcEVkZ2UoKV0sXG4gICAgYXJlbmE6IDUsXG4gIH0pO1xuICAvLyByZWFkb25seSBmb3J0cmVzc0FyZW5hX3BpdCA9IHRoaXMubWV0YXNjcmVlbih7XG4gIC8vICAgaWQ6IDB4ZmQsXG4gIC8vICAgaWNvbjogaWNvbmDilb1cbiAgLy8gICAgIHzilIzilLTilJB8XG4gIC8vICAgICB84pSCIOKUgnxcbiAgLy8gICAgIHzilJXilLPilJl8YCxcbiAgLy8gICB0aWxlc2V0czoge3B5cmFtaWQ6IHt9fSxcbiAgLy8gICBmZWF0dXJlOiBbJ2FyZW5hJywgJ3BpdCddLFxuICAvLyAgIGVkZ2VzOiAnbiB3ICcsXG4gIC8vICAgY29ubmVjdDogJzJhJywgLy8gVE9ETyAtIG5vIHdheSB5ZXQgdG8gbm90aWNlIGZsYWdnZWQgYW5kIGhhdmVcbiAgLy8gICBleGl0czogW3RvcEVkZ2UoKV0sICAgLy8gbG9naWMgcmVxdWlyZSBmbGlnaHQuLi5cbiAgLy8gICBmbGFnZ2VkOiB0cnVlLFxuICAvLyB9KTtcbiAgcmVhZG9ubHkgZm9ydHJlc3NUcmFwID0gdGhpcy5tZXRhc2NyZWVuKHtcbiAgICBpZDogMHhmZSxcbiAgICBpY29uOiBpY29uYFxuICAgICAgfOKUlOKUgOKUmHxcbiAgICAgIHwg4pWzIHxcbiAgICAgIHzilbbilKzilbR8YCxcbiAgICB0aWxlOiAnICAgfCB4IHwgYyAnLCAvLyBUT0RPIC0gc2FtZSBhcyBzdGF0dWVzLi4uP1xuICAgIHRpbGVzZXRzOiB7Zm9ydHJlc3M6IHt9LCBweXJhbWlkOiB7fX0sXG4gICAgZmVhdHVyZTogWydwaXQnXSxcbiAgICBlZGdlczogJyAgbiAnLFxuICAgIGNvbm5lY3Q6ICdhJyxcbiAgICBleGl0czogW2JvdHRvbUVkZ2UoKV0sXG4gIH0pO1xuICByZWFkb25seSBzaHJpbmUgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweGZmLFxuICAgIHRpbGVzZXRzOiB7c2hyaW5lOiB7fX0sXG4gICAgZXhpdHM6IFtib3R0b21FZGdlKHtsZWZ0OiA2LCB3aWR0aDogNX0pXSxcbiAgfSk7XG4gIHJlYWRvbmx5IGlubiA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTAwLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW3suLi5kb29yKDB4ODYpLCBlbnRyYW5jZTogMHg5NF82OH1dLFxuICB9KTtcbiAgcmVhZG9ubHkgdG9vbFNob3AgPSB0aGlzLm1ldGFzY3JlZW4oe1xuICAgIGlkOiAweDEwMSxcbiAgICB0aWxlc2V0czoge2hvdXNlOiB7fX0sXG4gICAgZXhpdHM6IFt7Li4uZG9vcigweDg2KSwgZW50cmFuY2U6IDB4OTRfNjh9XSxcbiAgfSk7XG4gIHJlYWRvbmx5IGFybW9yU2hvcCA9IHRoaXMubWV0YXNjcmVlbih7XG4gICAgaWQ6IDB4MTAyLFxuICAgIHRpbGVzZXRzOiB7aG91c2U6IHt9fSxcbiAgICBleGl0czogW3suLi5kb29yKDB4ODYpLCBlbnRyYW5jZTogMHg5NF82OH1dLFxuICB9KTtcblxuICBjaGVja0V4aXRUeXBlcygpIHtcbiAgICAvLyBEb2VzIGEgcXVpY2sgY2hlY2sgdG8gbWFrZSBzdXJlIHRoZXJlJ3Mgbm8gY29uZmxpY3RpbmcgZXhpdCB0eXBlc1xuICAgIC8vIG9uIGFueSBtZXRhc2NyZWVucy5cbiAgICBmb3IgKGNvbnN0IHMgaW4gdGhpcykge1xuICAgICAgY29uc3QgbXMgPSB0aGlzW3NdIGFzIGFueTtcbiAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgZSBvZiBtcz8uZGF0YT8uZXhpdHMgfHwgW10pIHtcbiAgICAgICAgaWYgKHNlZW4uaGFzKGUudHlwZSkpIGNvbnNvbGUubG9nKGBkdXBsaWNhdGU6ICR7c30gJHtlLnR5cGV9YCk7XG4gICAgICAgIHNlZW4uYWRkKGUudHlwZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cblxuLy8gICDilZTilabilZcgICAgICAgICDilaIgIOKVpVxuLy8gICDilaDilazilaMg4pWe4pWQ4pWk4pWn4pWq4pWhICDilZEgIOKVq1xuLy8gICDilZrilanilZ0gICAgICAgICDilaggIOKVn1xuLy8gIOKUjOKUrOKUkCAg4pW3XG4vLyAg4pSc4pS84pSkICDilIIg4pW24pSA4pW0IFxuLy8gIOKUlOKUtOKUmCAg4pW1XG4vLyDilpfiloTilpYgICDilp/ilplcbi8vIOKWkOKWiOKWjCAgIOKWnOKWmyBcbi8vIOKWneKWgOKWmFxuLy8gVSsyNTB4IOKUgCDilIEg4pSCIOKUgyDilIQg4pSFIOKUhiDilIcg4pSIIOKUiSDilIog4pSLIOKUjCDilI0g4pSOIOKUj1xuLy8gVSsyNTF4IOKUkCDilJEg4pSSIOKUkyDilJQg4pSVIOKUliDilJcg4pSYIOKUmSDilJog4pSbIOKUnCDilJ0g4pSeIOKUn1xuLy8gVSsyNTJ4IOKUoCDilKEg4pSiIOKUoyDilKQg4pSlIOKUpiDilKcg4pSoIOKUqSDilKog4pSrIOKUrCDilK0g4pSuIOKUr1xuLy8gVSsyNTN4IOKUsCDilLEg4pSyIOKUsyDilLQg4pS1IOKUtiDilLcg4pS4IOKUuSDilLog4pS7IOKUvCDilL0g4pS+IOKUv1xuLy8gVSsyNTR4IOKVgCDilYEg4pWCIOKVgyDilYQg4pWFIOKVhiDilYcg4pWIIOKViSDilYog4pWLIOKVjCDilY0g4pWOIOKVj1xuLy8gVSsyNTV4IOKVkCDilZEg4pWSIOKVkyDilZQg4pWVIOKVliDilZcg4pWYIOKVmSDilZog4pWbIOKVnCDilZ0g4pWeXHTilZ9cbi8vIFUrMjU2eCDilaAg4pWhIOKVoiDilaMg4pWkIOKVpSDilaYg4pWnIOKVqCDilakg4pWqIOKVqyDilawg4pWtIOKVriDila9cbi8vIFUrMjU3eCDilbAg4pWxIOKVsiDilbMg4pW0IOKVtSDilbYg4pW3IOKVuCDilbkg4pW6IOKVuyDilbwg4pW9IOKVviDilb9cbi8vIFUrMjU4eCDiloAg4paBIOKWgiDiloMg4paEIOKWhSDiloYg4paHIOKWiCDilokg4paKIOKWiyDilowg4paNIOKWjiDilo9cbi8vIFUrMjU5eCDilpAg4paRIOKWkiDilpMg4paUIOKWlSDilpYg4paXIOKWmCDilpkg4paaIOKWmyDilpwg4padIOKWniDilp9cbi8vXG4vLyDiiKkgXFxjYXBcbiJdfQ==