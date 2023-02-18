import {Rom} from '../rom';
//import {Screen} from './screen.js';
import {Mutable} from './util';
import {DefaultMap, hex1} from '../util';
import {Metascreen, Uid} from './metascreen';
import {MetascreenData, bottomEdge, bottomEdgeHouse, cave, door, downStair,
        icon, leftEdge, readScreen,
        rightEdge, seamlessDown, seamlessUp, topEdge, upStair, waterfallCave,
       } from './metascreendata.js';
import {Metatileset, Metatilesets} from './metatileset';
import {ScreenFix /*, withRequire*/} from './screenfix';

const DEBUG = false;

// // BASIC PLAN: Screen is the physical array, Metascreen has the extra info.
// //             Only Metascreen is tied to specific (Meta)tilesets.

// /**
//  * Adds a flag-togglable wall into a labyrinth screen.
//  * @param bit     Unique number for each choice. Use -1 for unconditional.
//  * @param variant 0 or 1 for each option. Use 0 with bit=-1 for unconditional.
//  * @param flag    Position(s) of flag wall.
//  * @param unflag  Position(s) of an existing wall to remove completely.
//  * @return A function to generate the variant.
//  */
// function labyrinthVariant(parentFn: (s: Metascreens) => Metascreen,
//                           bit: number, variant: 0|1,
//                           flag: number|number[], unflag?: number|number[]) {
//   return (s: Metascreen, seed: number, rom: Rom): boolean => {
//     // check variant
//     if (((seed >>> bit) & 1) !== variant) return false;
//     const parent = parentFn(rom.metascreens);
//     for (const pos of typeof flag === 'number' ? [flag] : flag) {
//       rom.screens[s.data.id].set2d(pos, [[0x19, 0x19], [0x1b, 0x1b]]);
//     }
//     for (const pos of typeof unflag === 'number' ? [unflag] : unflag || []) {
//       rom.screens[s.data.id].set2d(pos, [[0xc5, 0xc5], [0xd0, 0xc5]]);
//     }
//     if (s.flag !== 'always') {
//       // parent is a normally-open screen and we're closing it.
//       parent.flag = 'always';
//     } else if (unflag != null) {
//       // parent is the other alternative - delete it.
//       parent.remove();
//     }
//     return true;    
//   };
// }

// extends Set<Metascreen> ???
export class Metascreens {

  readonly [index: number]: Metascreen;
  readonly length = 0;

  private readonly screensByFix = new DefaultMap<ScreenFix, Metascreen[]>(() => []);
  private readonly screensById = new DefaultMap<number, Metascreen[]>(() => []);
  private readonly registeredFixes = new Set<ScreenFix>();

  constructor(readonly rom: Rom) {
    for (const key in this) { // add names
      const val = this[key];
      if (val instanceof Metascreen) val.name = key;
    }
  }

  private metascreen(data: MetascreenData): Metascreen {
    const mut = this as Mutable<this>;
    const screen = new Metascreen(this.rom, mut.length as Uid, data);
    mut[mut.length++] = screen;
    this.screensById.get(screen.sid).push(screen);
    for (const tilesetName in data.tilesets) {
      const key = tilesetName as keyof Metatilesets;
      const tilesetData = data.tilesets[key]!;
      if (tilesetData.requires) {
        for (const fix of tilesetData.requires) {
          this.screensByFix.get(fix).push(screen);
        }
      } else {
        (this.rom.metatilesets[key] as Metatileset).addScreen(screen)
      }
    }
    return screen;
  }

  getById(id: number, tileset?: number): Metascreen[] {
    let out = this.screensById.has(id) ? [...this.screensById.get(id)] : [];
    if (tileset != null) {
      out = out.filter(s => s.isCompatibleWithTileset(tileset));
    }
    return out;
  }

  registerFix(fix: ScreenFix, seed?: number) {
    for (const screen of this.screensByFix.get(fix)) {
      // Look for an update script and run it first.  If it returns false then
      // cancel the operation on this screen.
      const update =
          (screen.data.update || []).find((update) => update[0] === fix);
      if (update) {
        if (seed == null) throw new Error(`Seed required for update`);
        if (!update[1](screen, seed, this.rom)) continue;
      }
      // For each tileset, remove the requirement, and if it's empty, add the
      // screen to the tileset.
      for (const tilesetName in screen.data.tilesets) {
        const key = tilesetName as keyof Metatilesets;
        const data = screen.data.tilesets[key]!;
        if (!data.requires) continue;
        const index = data.requires.indexOf(fix);
        if (index < 0) continue;
        data.requires.splice(index, 1);
        if (!data.requires.length) {
          (this.rom.metatilesets[key] as Metatileset).addScreen(screen);
        }
      }
    }
    this.registeredFixes.add(fix);
  }

  isFixed(fix: ScreenFix): boolean {
    return this.registeredFixes.has(fix);
  }

  /**
   * Change the screen whose current id is `oldId` to have `newId` as its
   * screen ID.  Updates all relevant links.  `newId` must not be used by
   * any existing metascreens.
   */
  renumber(oldId: number, newId: number, tilesets?: Set<Metatileset>) {
    if (oldId === newId) return;
    if (DEBUG) console.log(`renumber ${hex1(oldId)} -> ${hex1(newId)}`);
    const dest = this.screensById.get(newId);
    if (dest.length) throw new Error(`ID already used: ${hex1(newId)}: ${dest.join(', ')}`);
    let sourceDefinition: Uint8Array|undefined;
    for (const screen of this.getById(oldId)) {
      if (tilesets && !screen.tilesets().some(t => tilesets.has(t))) continue;
      if (screen.data.definition) {
        sourceDefinition = screen.data.definition(this.rom);
        screen.data.definition = undefined;
      }
      screen.unsafeSetId(newId);
      dest.push(screen);
    }
    this.screensById.delete(oldId);
    // TODO - should this be encapsulated in Screens? probably...
    const oldScreen = this.rom.screens.getScreen(oldId);
    if (oldId >= 0 && newId < 0) { // back up the old screen
      dest[0].data.definition = constant(Uint8Array.from(oldScreen.tiles));
    }
    const clone = oldScreen.clone(newId);
    this.rom.screens.setScreen(newId, clone);
    if (oldId < 0) {
      this.rom.screens.deleteScreen(oldId);
      if (sourceDefinition && newId >= 0) {
        clone.tiles = Array.from(sourceDefinition);
      }
    }
    this.rom.locations.renumberScreen(oldId, newId);
    // update the `used` bit on the old screen if we've taken out all the uses.
    for (const t of this.rom.metatilesets) {
      for (const s of t) {
        if (s.sid === oldId) return;
      }
    }
    oldScreen.used = false;
  }

  readonly overworldEmpty = this.metascreen({
    id: 0x00,
    icon: icon`
      |███|
      |███|
      |███|`,
    tile: '   |   |   ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    feature: ['empty'],
    edges: '    ',
    delete: true,
  });
  // boundaryW_trees: ???
  readonly boundaryW_trees = this.metascreen({
    id: 0x01,
    icon: icon`
      |█▌ |
      |█▌^|
      |█▌ |`,
    tile: ' oo| oo| oo',
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaTrees]}},
    edges: '> >o', // o = open
  });
  readonly boundaryW = this.metascreen({
    id: 0x02,
    icon: icon`
      |█▌ |
      |█▌ |
      |█▌ |`,
    tile: ' oo| oo| oo',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '> >o',
  });
  readonly boundaryE_rocks = this.metascreen({
    id: 0x03,
    icon: icon`
      |.▐█|
      | ▐█|
      |.▐█|`,
    tile: 'oo |oo |oo ',
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaRocks]}},
    edges: '<o< ',
  });
  readonly boundaryE = this.metascreen({
    id: 0x04,
    icon: icon`
      | ▐█|
      | ▐█|
      | ▐█|`,
    tile: 'oo |oo |oo ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '<o< ',
  });
  readonly longGrassS = this.metascreen({
    id: 0x05,
    icon: icon`
      |vv |
      | vv|
      |   |`,
    tile: 'olo|ooo|   ',
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]}},
    edges: 'looo', // l = long grass
  });
  readonly longGrassN = this.metascreen({
    id: 0x06,
    icon: icon`
      |   |
      | vv|
      |vv |`,
    tile: '   |ooo|olo',
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]}},
    edges: 'oolo',
  });
  readonly boundaryS_rocks = this.metascreen({
    id: 0x07,
    icon: icon`
      | . |
      |▄▄▄|
      |███|`,
    tile: 'ooo|ooo|   ',
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaRocks]}},
    edges: 'o^ ^',
  });
  readonly fortressTownEntrance = this.metascreen({ // goa
    id: 0x08,
    icon: icon`
      |███|
      |█∩█|
      |   |`,
    // TODO - entrance!
    // TODO - right edge wants top-half mountain; left edge top can have
    //        any top half (bottom half plain), top edge can have any
    //        left-half (right-half mountain)
    placement: 'manual',
    tile: ['   |oFo|ooo', 'oo |oFo|ooo'],
    tilesets: {grass: {}},
    edges: ' vov',
    exits: [{...upStair(0xa6, 3), type: 'fortress'}],
  });
  readonly bendSE_longGrass = this.metascreen({
    id: 0x09,
    icon: icon`▗
      | v |
      |vv▄|
      | ▐█|`,
    tile: 'ooo|ooo|oo ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: 'oo<^',
  });
  readonly exitW_cave = this.metascreen({ // near sahara, fog lamp
    id: 0x0a,
    icon: icon`∩
      |█∩█|
      |  █|
      |███|`,
    tile: ['   |o< |   ', '   |x< |   '],
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: ' n  ', // n = narrow
    exits: [cave(0x48), leftEdge({top: 6})],
  });
  readonly bendNE_grassRocks = this.metascreen({
    id: 0x0b,
    icon: icon`▝
      |.▐█|
      |  ▀|
      |;;;|`,
    tile: 'oo |ooo|ogo',
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass]},
               desert: {requires: [ScreenFix.DesertShortGrass,
                                   ScreenFix.DesertRocks]}},
    edges: '<osv', // s = short grass
  });
  readonly cornerNW = this.metascreen({
    id: 0x0c,
    icon: icon`▛
      |███|
      |█ ▀|
      |█▌ |`,
    tile: '   | oo| oo',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '  >v',
  });
  // NOTE: this version has slightly nicer mountains in some cases.
  readonly overworldEmpty_alt = this.metascreen({
    id: 0x0c,
    icon: icon`
      |███|
      |███|
      |███|`,
    placement: 'manual',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    feature: ['empty', 'manual'],
    edges: '    ',
    match: () => false,
    delete: true,
  });
  readonly cornerNE = this.metascreen({
    id: 0x0d,
    icon: icon`▜
      |███|
      |▀██|
      | ▐█|`,
    tile: '   |oo |oo ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: ' v< ',
  });
  readonly cornerSW = this.metascreen({
    id: 0x0e,
    icon: icon`▙
      |█▌ |
      |██▄|
      |███|`,
    tile: ' oo| oo|   ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '>  ^',
  });
  readonly cornerSE = this.metascreen({
    id: 0x0f,
    icon: icon`▟
      | ▐█|
      |▄██|
      |███|`,
    tile: 'oo |oo |   ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '<^  ',
  });
  readonly exitE = this.metascreen({
    id: 0x10,
    icon: icon`╶
      | ▐█|
      |   |
      | ▐█|`,
    tile: ['oo |ooo|oo ', 'oo |oox|oo '],
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]}},
    edges: '<o<n',
    exits: [rightEdge({top: 6})],
    // TODO - edge
  });
  readonly boundaryN_trees = this.metascreen({
    id: 0x11,
    icon: icon`
      |███|
      |▀▀▀|
      | ^ |`,
    tile: '   |ooo|ooo',
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaTrees]}},
    edges: ' vov',
  });
  readonly bridgeToPortoa = this.metascreen({
    id: 0x12,
    icon: icon`╴
      |═  |
      |╞══|
      |│  |`,
    placement: 'manual',
    tile: 'roo|1rr| oo', // TODO: check this!
    tilesets: {river: {}},
    // TODO - this is super custom, no edges for it?
    // It needs special handling, at least.
    feature: ['portoa3'],
    edges: '2*>r',
    exits: [leftEdge({top: 1})],
  });
  readonly slopeAbovePortoa = this.metascreen({
    id: 0x13,
    icon: icon`
      |█↓█|
      |█↓▀|
      |│  |`,
    placement: 'manual',
    tile: ' ↓ | oo|roo',
    tilesets: {river: {}},
    feature: ['portoa2'],
    edges: '1*2v',
  });
  readonly riverBendSE = this.metascreen({
    id: 0x14,
    icon: icon`
      |w  |
      | ╔═|
      | ║ |`,
    tile: 'ooo|orr|oro',
    tilesets: {river: {}},
    edges: 'oorr',
  });
  readonly boundaryW_cave = this.metascreen({
    id: 0x15,
    icon: icon`
      |█▌ |
      |█∩ |
      |█▌ |`,
    tile: ' oo| <o| oo',
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: '> >o',
    exits: [cave(0x89)],
  });
  readonly exitN = this.metascreen({
    id: 0x16,
    icon: icon`╵
      |█ █|
      |▀ ▀|
      | ^ |`,
    tile: [' o |ooo|ooo', ' x |ooo|ooo'],
    tilesets: {grass: {}, river: {}, desert: {}}, // sea has no need for exits?
    edges: 'nvov',
    exits: [topEdge()],
    // TODO - edge
  });
  readonly riverWE_woodenBridge = this.metascreen({
    id: 0x17,
    icon: icon`═
      |   |
      |═║═|
      |   |`,
    tile: 'ooo|ror|ooo', // TODO - should the middle be 'b'?
    tilesets: {river: {}},
    edges: 'oror',
    exits: [seamlessUp(0x77), seamlessDown(0x87)],
  });
  readonly riverBoundaryE_waterfall = this.metascreen({
    id: 0x18,
    icon: icon`╡
      | ▐█|
      |══/|
      | ▐█|`,
    tile: 'oo |rr |oo ',
    tilesets: {river: {}},
    edges: '<r< ',
  });
  readonly boundaryE_cave = this.metascreen({
    id: 0x19,
    icon: icon`
      | ▐█|
      |v∩█|
      |v▐█|`,
    tile: 'oo |o< |oo ',
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]},
               desert: {requires: [ScreenFix.DesertLongGrass]}},
    edges: '<o< ',
    exits: [cave(0x58)],
  });
  readonly exitW_southwest = this.metascreen({
    id: 0x1a,
    icon: icon`╴
      |█▌ |
      |▀ ▄|
      |▄██|`,
    tile: ' oo|Boo|   ',
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               // Sea has no need for this screen?  Go to some other beach?
               sea: {requires: [ScreenFix.SeaRocks]}},
    // NOTE: the edge is not 'n' because it's off-center.
    edges: '>* ^',
    exits: [leftEdge({top: 0xb})],
  });
  readonly nadare = this.metascreen({
    id: 0x1b,
    //icon: '?',
    //migrated: 0x2000,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), door(0x23),
            door(0x25, 'door2'), door(0x2a, 'door3')],
  });
  readonly townExitW = this.metascreen({
    id: 0x1c,
    icon: icon`╴
      |█▌ |
      |▀ ^|
      |█▌ |`,
    tile: ' oo|8oo| oo',
    tilesets: {grass: {}, river: {}},
    edges: '>n>o',
    exits: [leftEdge({top: 8, height: 3, shift: -0.5})],
  });
  readonly shortGrassS = this.metascreen({
    id: 0x1d,
    icon: icon` |
      |;;;|
      | v |
      |   |`,
    tile: 'ogo|ooo|ooo',
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass,
                                  ScreenFix.GrassLongGrassRemapping]}},
    edges: 'sooo',
  });
  readonly townExitS = this.metascreen({
    id: 0x1e,
    icon: icon`╷
      | ^ |
      |▄ ▄|
      |█ █|`,
    tile: ['ooo|ooo| o ', 'ooo|ooo| x '],
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks,
                                   ScreenFix.DesertTownEntrance]}},
    edges: 'o^n^',
    exits: [bottomEdge()],
  });
  readonly swanGate = this.metascreen({
    id: 0x1f,
    //icon: '?',
    tilesets: {town: {}},
    exits: [leftEdge({top: 3}), rightEdge({top: 9})],
    flag: 'custom:false',
  }); 

  readonly riverBranchNSE = this.metascreen({
    id: 0x20,
    icon: icon`
      | ║ |
      | ╠═|
      | ║ |`,
    tile: 'oro|orr|oro',
    tilesets: {river: {}},
    edges: 'rorr',
  });
  readonly riverWE = this.metascreen({
    id: 0x21,
    icon: icon`
      |   |
      |═══|
      |   |`,
    tile: 'ooo|rrr|ooo',
    tilesets: {river: {}},
    edges: 'oror',
  });
  readonly riverBoundaryS_waterfall = this.metascreen({
    id: 0x22,
    icon: icon`╨
      | ║ |
      |▄║▄|
      |█/█|`,
    tile: 'oro|oro|   ',
    tilesets: {river: {}},
    edges: 'r^ ^',
  });
  readonly shortGrassSE = this.metascreen({
    id: 0x23,
    icon: icon`
      |;;;|
      |;  |
      |; ^|`,
    tile: 'ogo|goo|ooo',
    tilesets: {grass: {}},
    edges: 'ssoo',
  });
  readonly shortGrassNE = this.metascreen({
    id: 0x24,
    icon: icon` |
      |;  |
      |;v |
      |;;;|`,
    tile: 'ooo|goo|ogo',
    tilesets: {grass: {}},
    edges: 'osso',
  });
  readonly stomHouseOutside = this.metascreen({
    id: 0x25,
    icon: icon`∩
      |███|
      |▌∩▐|
      |█ █|`,
    placement: 'manual',
    tile: ['   | H | o ', '   | H | x '],
    tilesets: {grass: {}},
    // NOTE: bottom edge entrance is cleverly shifted to align with the door.
    exits: [door(0x68), bottomEdge({shift: 0.5})],
  });
  readonly bendNW_trees = this.metascreen({
    id: 0x26,
    icon: icon`▘
      |█▌ |
      |▀ ^|
      | ^^|`,
    tile: ' oo|ooo|ooo',
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks,
                                   ScreenFix.DesertTrees]},
               sea: {requires: [ScreenFix.SeaRocks,
                                ScreenFix.SeaTrees]}},
    edges: '>voo',
  });
  readonly shortGrassSW = this.metascreen({
    id: 0x27,
    icon: icon`
      |;;;|
      |  ;|
      |^ ;|`,
    tile: 'ogo|oog|ooo',
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass]}},
    edges: 'soos',
  });
  readonly riverBranchNWS = this.metascreen({
    id: 0x28,
    icon: icon`
      | ║ |
      |═╣ |
      | ║ |`,
    tile: 'oro|rro|oro',
    tilesets: {river: {}},
    edges: 'rrro',
  });
  readonly shortGrassNW = this.metascreen({
    id: 0x29,
    icon: icon`
      |  ;|
      | v;|
      |;;;|`,
    tile: 'ooo|oog|ogo',
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass,
                                  ScreenFix.GrassLongGrassRemapping]}},
    edges: 'ooss',
  });
  readonly valleyBridge = this.metascreen({
    id: 0x2a,
    icon: icon` |
      |▛║▜|
      | ║ |
      |▙║▟|`,
    tile: [' o | o | o ', ' x | o | o ', ' o | o | x '],
    tilesets: {grass: {}, river: {}},
    edges: 'n n ',
    exits: [seamlessUp(0x77), seamlessDown(0x87), topEdge(), bottomEdge()],
  });
  readonly exitS_cave = this.metascreen({
    id: 0x2b,
    icon: icon`∩
      |█∩█|
      |▌ ▐|
      |█ █|`,
    tile: ['   | < | o ', '   | < | x '],
    tilesets: {grass: {}, river: {}, desert: {},
               // Not particularly useful since no connector on south end?
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: '  n ',
    exits: [cave(0x67), bottomEdge()]
  });
  readonly outsideWindmill = this.metascreen({
    id: 0x2c,
    icon: icon`╳
      |██╳|
      |█∩█|
      |█ █|`,
    placement: 'manual',
    tile: ['   | W | o ', '   | W | x '],
    tilesets: {grass: {}},
    // TODO - annotate 3 exits, spawn for windmill blade
    flag: 'custom:false',
    feature: ['windmill'],
    edges: '  n ',
    exits: [cave(0x63), bottomEdge(), door(0x89, 'windmill'), door(0x8c)],
  });
  readonly townExitW_cave = this.metascreen({ // outside leaf
    // (TODO - consider just deleting, replace with $0a).
    id: 0x2d,
    icon: icon`∩
      |█∩█|
      |▄▄█|
      |███|`,
    tile: '   |x< |   ',
    tilesets: {grass: {}}, // cave entrance breaks river and others...
    edges: ' n  ',
    // NOTE: special case the odd entrance/exit here (should be 4a)
    exits: [cave(0x4a), leftEdge({top: 5, height: 3, shift: -0.5})],
    flag: 'custom:true',
  });
  readonly riverNS = this.metascreen({
    id: 0x2e,
    icon: icon`
      | ║ |
      | ║ |
      | ║ |`,
    tile: 'oro|ooo|oro',
    tilesets: {river: {}},
    edges: 'roro',
    mod: 'bridge',
  });
  readonly riverNS_bridge = this.metascreen({
    id: 0x2f,
    icon: icon`
      | ║ |
      |w╏w|
      | ║ |`,
    placement: 'mod',
    tile: 'oro|oro|oro',
    tilesets: {river: {}},
    feature: ['bridge'],
    edges: 'roro',
    wall: 0x77,
    //mod: 'bridge',
  });
  readonly riverBendWS = this.metascreen({
    id: 0x30,
    icon: icon`
      | w▜|
      |═╗w|
      | ║ |`,
    tile: 'oo |rro|oro',
    tilesets: {river: {}},
    edges: '<rrv',
  });
  readonly boundaryN_waterfallCave = this.metascreen({
    id: 0x31,
    icon: icon`
      |▛/█|
      |▘║▀|
      | ║ |`,
    tile: '   |oro|oro',
    tilesets: {river: {}},
    // TODO - flag version without entrance?
    //  - will need a tileset fix
    edges: ' vrv',
    exits: [waterfallCave(0x75)],
  });
  readonly open_trees = this.metascreen({
    id: 0x32,
    icon: icon`
      | ^ |
      |^ ^|
      | ^ |`,
    tile: 'ooo|ooo|ooo',
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertTrees,
                                   ScreenFix.DesertRocks]}},
    edges: 'oooo',
  });
  readonly exitS = this.metascreen({
    id: 0x33,
    icon: icon`╷
      | w |
      |▄ ▄|
      |█ █|`,
    tile: ['ooo|ooo| o ', 'ooo|ooo| x |'],
    tilesets: {grass: {}, river: {},
               // NOTE: These fixes are not likely to ever land.
               desert: {requires: [ScreenFix.DesertMarsh]},
               sea: {requires: [ScreenFix.SeaMarsh]}},
    edges: 'o^n^',
    exits: [bottomEdge()],
  });
  readonly bendNW = this.metascreen({
    id: 0x34,
    icon: icon`▘
      |█▌ |
      |▀▀ |
      |   |`,
    tile: ' oo|ooo|ooo',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '>voo',
  });
  readonly bendNE = this.metascreen({
    id: 0x35,
    icon: icon`▝
      | ▐█|
      |  ▀|
      |   |`,
    tile: 'oo |ooo|ooo',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '<oov',
  });
  readonly bendSE = this.metascreen({
    id: 0x36,
    icon: icon`▗
      |   |
      | ▄▄|
      | ▐█|`,
    tile: 'ooo|ooo|oo ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: 'oo<^',
  });
  readonly bendWS = this.metascreen({
    id: 0x37,
    icon: icon`▖
      |   |
      |▄▄ |
      |█▌ |`,
    tile: 'ooo|ooo| oo',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: 'o^>o',
  });
  readonly towerPlain_upStair = this.metascreen({
    id: 0x38,
    icon: icon`┴
      | ┊ |
      |─┴─|
      |   |`,
    tile: ' t |ttt|   ',
    tilesets: {tower: {}},
    edges: 'st t',
    exits: [topEdge({left: 8}), seamlessDown(0x08, 2)],
    // TODO - annotate possible stairway w/ flag?
  });
  readonly towerRobotDoor_downStair = this.metascreen({
    id: 0x39,
    icon: icon`┬
      | ∩ |
      |─┬─|
      | ┊ |`,
    tile: '   |ttt| t ',
    tilesets: {tower: {}},
    edges: ' tst',
    exits: [seamlessUp(0xe8, 2), seamlessDown(0xf8, 2)],
  });
  readonly towerDynaDoor = this.metascreen({
    id: 0x3a,
    icon: icon`∩
      | ∩ |
      |└┬┘|
      | ┊ |`,
    tile: '   | < | t ',
    tilesets: {tower: {}},
    edges: '  s ',
    exits: [cave(0x67, 'door')],
  });
  readonly towerLongStairs = this.metascreen({
    id: 0x3b,
    icon: icon`
      | ┊ |
      | ┊ |
      | ┊ |`,
    tile: ' t | t | t ',
    tilesets: {tower: {}},
    edges: 's s ',
    exits: [bottomEdge()],
    // TODO - connections
  });
  readonly towerMesiaRoom = this.metascreen({
    id: 0x3c,
    tilesets: {tower: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly towerTeleporter = this.metascreen({
    id: 0x3d,
    tilesets: {tower: {}},
    exits: [bottomEdgeHouse(), cave(0x57, 'teleporter')],
  });
  readonly caveAbovePortoa = this.metascreen({
    id: 0x3e,
    icon: icon`
      |███|
      |█∩█|
      |█↓█|`,
    placement: 'manual',
    tile: '   | < | ↓ ',
    tilesets: {river: {}},
    edges: '  1 ',
    feature: ['portoa1'],
    exits: [cave(0x66)],
  });
  readonly cornerNE_flowers = this.metascreen({
    id: 0x3f,
    icon: icon`▜
      |███|
      |▀*█|
      | ▐█|`,
    tile: '   |oo |oo ',
    tilesets: {grass: {}},
    // NOTE: could extend this to desert/etc by swapping the 7e/7f tiles
    // with e.g. a windmill or castle tile that's not used in 9c, but
    // we still don't have a good sprite to use for it...
    edges: ' v< ',
  });
  readonly towerEdge = this.metascreen({
    id: 0x40,
    icon: icon` |
      |   |
      |┤ ├|
      |   |`,
    tile: '   |t t|   ',
    tilesets: {tower: {}},
    edges: ' t t',
  });
  readonly towerEdgeW = this.metascreen({
    id: 0x40,
    icon: icon` |
      |   |
      |┤  |
      |   |`,
    tile: '   |t  |   ',
    tilesets: {tower: {}},
    edges: ' t  ',
  });
  readonly towerEdgeE = this.metascreen({
    id: 0x40,
    icon: icon` |
      |   |
      |  ├|
      |   |`,
    tile: '   |  t|   ',
    tilesets: {tower: {}},
    edges: '   t',
  });
  readonly towerRobotDoor = this.metascreen({
    id: 0x41,
    icon: icon`─
      | O |
      |───|
      |   |`,
    tile: '   |ttt|   ',
    tilesets: {tower: {}},
    edges: ' t t',
  });
  readonly towerDoor = this.metascreen({
    id: 0x42,
    icon: icon`∩
      | ∩ |
      |─┴─|
      |   |`,
    tile: '   |t<t|   ',
    tilesets: {tower: {}},
    edges: ' t t',
    exits: [cave(0x58)],
    // TODO - connections
  });
  readonly house_bedroom = this.metascreen({
    id: 0x43,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly shed = this.metascreen({
    id: 0x44,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), cave(0x49)],
    flag: 'custom:false',
  });
  // TODO - separate metascreen for shedWithHiddenDoor
  readonly tavern = this.metascreen({
    id: 0x45,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly house_twoBeds = this.metascreen({
    id: 0x46,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly throneRoom_amazones = this.metascreen({
    id: 0x47,
    tilesets: {house: {}},
    // TODO - need to fix the single-width stair!
    exits: [bottomEdgeHouse({width: 3}), downStair(0x4c, 1)],
  });
  readonly house_ruinedUpstairs = this.metascreen({
    id: 0x48,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), downStair(0x9c, 1)],
  });
  readonly house_ruinedDownstairs = this.metascreen({
    id: 0x49,
    tilesets: {house: {}},
    exits: [upStair(0x56, 1)],
  });
  readonly foyer = this.metascreen({
    id: 0x4a,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse({shift: 0.5}),
            door(0x28), door(0x53, 'door2'), door(0x5c, 'door3')],
  });
  readonly throneRoom_portoa = this.metascreen({
    id: 0x4b,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), door(0x2b)],
  });
  readonly fortuneTeller = this.metascreen({
    id: 0x4c,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), door(0x56), door(0x59, 'door2')],
  });
  readonly backRoom = this.metascreen({
    id: 0x4d,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly dojo = this.metascreen({
    id: 0x4e,
    tilesets: {house: {}},
    // Edge entrance shifted to properly line up at start of stom fight.
    // (note that this causes us to shift all other uses as well).
    exits: [bottomEdgeHouse({shift: -0.5})],
  });
  readonly windmillInside = this.metascreen({
    id: 0x4f,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse({left: 9, width: 1})],
  });
  readonly horizontalTownMiddle = this.metascreen({
    // brynmaer + swan (TODO - split so we can move exits)
    id: 0x50,
    tilesets: {town: {}},
    exits: [door(0x4c), door(0x55, 'door2')],
    tallHouses: [0x35],
  });
  readonly brynmaerRight_exitE = this.metascreen({
    // brynmaer
    id: 0x51,
    tilesets: {town: {type: 'horizontal'}},
    exits: [rightEdge({top: 8}), door(0x41)],
  });
  readonly brynmaerLeft_deadEnd = this.metascreen({
    // brynmaer
    id: 0x52,
    tilesets: {town: {type: 'horizontal'}},
    exits: [door(0x49), door(0x4c, 'door2')],
  });
  readonly swanLeft_exitW = this.metascreen({
    // swan
    id: 0x53,
    tilesets: {town: {type: 'horizontal'}},
    exits: [leftEdge({top: 9}), door(0x49), door(0x5e, 'door2')],
  });
  readonly swanRight_exitS = this.metascreen({
    // swan
    id: 0x54,
    tilesets: {town: {type: 'horizontal'}},
    exits: [bottomEdge({left: 3}), door(0x41),
            door(0x43, 'door2'), door(0x57, 'door3')],
  });
  readonly horizontalTownLeft_exitN = this.metascreen({
    // sahara, amazones (TODO - split so we can move exits)
    id: 0x55,
    tilesets: {town: {type: 'horizontal'}},
    exits: [topEdge({left: 0xd}), door(0x46), door(0x4b, 'door2')],
  });
  readonly amazonesRight_deadEnd = this.metascreen({
    // amazones
    id: 0x56,
    tilesets: {town: {type: 'horizontal'}},
    exits: [door(0x40), door(0x58, 'door2')],
  });
  readonly saharaRight_exitE = this.metascreen({
    // sahara
    id: 0x57,
    tilesets: {town: {type: 'horizontal'}},
    exits: [rightEdge({top: 7}), door(0x40), door(0x66, 'door2')],
  });
  readonly portoaNW = this.metascreen({
    // portoa
    id: 0x58,
    tilesets: {town: {type: 'square'}},
    exits: [cave(0x47, 'fortress'), bottomEdge()], // bottom just in case?
  });
  readonly portoaNE = this.metascreen({
    // portoa
    id: 0x59,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x63), door(0x8a, 'door2'), bottomEdge({left: 3, width: 4})],
  });
  readonly portoaSW_exitW = this.metascreen({
    // portoa
    id: 0x5a,
    tilesets: {town: {type: 'square'}},
    exits: [leftEdge({top: 9}), door(0x86), topEdge()],
  });
  readonly portoaSE_exitE = this.metascreen({
    // portoa
    id: 0x5b,
    tilesets: {town: {type: 'square'}},
    exits: [rightEdge({top: 9}), door(0x7a), door(0x87, 'door2')],
    tallHouses: [0x5a],
  });
  readonly dyna = this.metascreen({
    id: 0x5c,
    tilesets: {tower: {}},
    // NOTE: not really a good exit type for this...
    exits: [{type: 'stair:down', manual: true, dir: 2,
             entrance: 0xbf80, exits: []}],
  });
  readonly portoaFisherman = this.metascreen({
    // portoa
    id: 0x5d,
    tilesets: {town: {type: 'square'}},
    exits: [rightEdge({top: 6}),
            leftEdge({top: 4, height: 6, shift: 0.5}),
            door(0x68)],
  });
  readonly verticalTownTop_fortress = this.metascreen({
    // shyron, zombie town (probably not worth splitting this one)
    id: 0x5e,
    tilesets: {town: {type: 'vertical'}},
    exits: [cave(0x47, 'fortress'), bottomEdge()],
  });
  readonly shyronMiddle = this.metascreen({
    // shyron
    id: 0x5f,
    tilesets: {town: {type: 'vertical'}},
    exits: [door(0x54), door(0x5b, 'door2'), topEdge()],
  });
  readonly shyronBottom_exitS = this.metascreen({
    // shyron
    id: 0x60,
    tilesets: {town: {type: 'vertical'}},
    exits: [bottomEdge({left: 3}), door(0x04),
            door(0x06, 'door2'), door(0x99, 'door3')],
  });
  readonly zombieTownMiddle = this.metascreen({
    // zombie town
    id: 0x61,
    tilesets: {town: {type: 'vertical'}},
    exits: [door(0x99), topEdge()],
  });
  readonly zombieTownBottom_caveExit = this.metascreen({
    // zombie town
    id: 0x62,
    tilesets: {town: {type: 'vertical'}},
    exits: [cave(0x92), door(0x23), door(0x4d, 'door2')],
  });
  readonly leafNW_houseShed = this.metascreen({
    // leaf
    id: 0x63,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x8c), door(0x95, 'door2')],
  });
  readonly squareTownNE_house = this.metascreen({
    // leaf, goa (TODO - split)
    id: 0x64,
    tilesets: {town: {type: 'square'}},
    exits: [topEdge({left: 1}), door(0xb7)],
  });
  readonly leafSW_shops = this.metascreen({
    // leaf
    id: 0x65,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x77), door(0x8a, 'door2')],
    tallHouses: [0x6a],
  });
  readonly leafSE_exitE = this.metascreen({
    // leaf
    id: 0x66,
    tilesets: {town: {type: 'square'}},
    exits: [rightEdge({top: 3, height: 3, shift: -0.5}), door(0x84)],
  });
  readonly goaNW_tavern = this.metascreen({
    // goa
    id: 0x67,
    tilesets: {town: {type: 'square'}},
    exits: [door(0xba)],
  });
  readonly squareTownSW_exitS = this.metascreen({
    // goa, joel (TODO - split)
    id: 0x68,
    tilesets: {town: {type: 'square'}},
    exits: [bottomEdge({left: 8}), door(0x84)],
  });
  readonly goaSE_shop = this.metascreen({
    // goa
    id: 0x69,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x82)],
  });
  readonly joelNE_shop = this.metascreen({
    // joel
    id: 0x6a,
    tilesets: {town: {type: 'square'}},
    exits: [door(0xa7)],
  });
  readonly joelSE_lake = this.metascreen({
    // joel
    id: 0x6b,
    tilesets: {town: {type: 'square'}},
  });
  readonly oakNW = this.metascreen({
    // oak
    id: 0x6c,
    tilesets: {town: {type: 'square'}},
    exits: [door(0xe7)],
  });
  readonly oakNE = this.metascreen({
    // oak
    id: 0x6d,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x60)],
  });
  readonly oakSW = this.metascreen({
    // oak
    id: 0x6e,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x7c)],
  });
  readonly oakSE = this.metascreen({
    // oak
    id: 0x6f,
    tilesets: {town: {type: 'square'}},
    // Edge entrance shifted for child animation
    exits: [bottomEdge({left: 0, shift: 0.5}), door(0x97)],
  });
  readonly temple = this.metascreen({
    // shyron
    id: 0x70,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly wideDeadEndN = this.metascreen({
    id: 0x71,
    icon: icon`
      | ┃ |
      | > |
      |   |`,
    tile: ' w | > |   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: 'w   ',
    connect: '2',
    exits: [downStair(0xc7)],
    statues: [4],
  });
  readonly goaWideDeadEndN = this.metascreen({
    id: 0x71,
    icon: icon`
      |╵┃╵|
      | > |
      |   |`,
    tile: ' w | > |   ',
    tilesets: {labyrinth: {}},
    edges: 'w   ',
    connect: '1|2x|3',
    exits: [downStair(0xc7)],
    statues: [4],
  });
  readonly wideHallNS = this.metascreen({
    id: 0x72,
    icon: icon`
      | ┃ |
      | ┃ |
      | ┃ |`,
    tile: ' w | w | w ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: 'w w ',
    connect: '2a',
    statues: [1, 7, 0xd],
  });
  readonly goaWideHallNS = this.metascreen({
    id: 0x72,
    icon: icon`
      |│┃│|
      |│┃│|
      |│┃│|`,
    tile: ' w | w | w ',
    tilesets: {labyrinth: {}},
    edges: 'w w ',
    connect: '19|2a|3b',
    statues: [1, 7, 0xd],
  });
  readonly goaWideHallNS_blockedRight = this.metascreen({
    id: 0x72,
    icon: icon`
      |│┃│|
      |│┃ |
      |│┃│|`,
    placement: 'mod',
    tile: ' w | w | w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x9d]}},
    // update: [[ScreenFix.LabyrinthParapets,
    //           labyrinthVariant(s => s.goaWideHallNS, 0, 0, 0x9d)]],
    edges: 'w w ',
    connect: '19|2a|3|b',
  });
  readonly goaWideHallNS_blockedLeft = this.metascreen({
    id: 0x72,
    icon: icon`
      |│┃│|
      | ┃│|
      |│┃│|`,
    placement: 'mod',
    tile: ' w | w | w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x51]}},
    // update: [[ScreenFix.LabyrinthParapets,
    //           labyrinthVariant(s => s.goaWideHallNS, 0, 1, 0x51)]],
    edges: 'w w ',
    connect: '1|9|2a|3b',
  });
  readonly goaWideArena = this.metascreen({
    id: 0x73,
    icon: icon`<
      |╻<╻|
      |┡━┩|
      |│╻│|`,
    placement: 'manual',
    tile: '   | < | w ',
    tilesets: {labyrinth: {}},
    feature: ['arena'],
    edges: 'w w ',
    connect: '9b|a',
    exits: [upStair(0x37)],
  });
  readonly limeTreeLake = this.metascreen({
    id: 0x74,
    tilesets: {lime: {}},
    exits: [bottomEdgeHouse(), cave(0x47)],
    feature: ['bridge'], // TODO - lake?
    wall: 0x67,
  });
  // Swamp screens
  readonly swampNW = this.metascreen({
    id: 0x75,
    icon: icon`
      | │ |
      |─┘ |
      |   |`,
    tile: ' c |cc |   ',
    tilesets: {swamp: {}},
    // TODO - do we actually want to put all these edges in?
    feature: ['consolidate'],
    edges: 'ss  ',
    connect: '26',
    exits: [topEdge({left: 6, width: 4}),
            leftEdge({top: 7, height: 4, shift: -0.5})],
    poi: [[2]],
  });
  readonly swampE = this.metascreen({
    id: 0x76,
    icon: icon`
      |   |
      | ╶─|
      |   |`,
    tile: '   | cc|   ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: '   s',
    connect: 'e',
    exits: [],
    poi: [[0]],
  });
  readonly swampE_door = this.metascreen({
    id: 0x76,
    icon: icon`∩
      | ∩ |
      | ╶─|
      |   |`,
    tile: '   | <c|   ',
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    feature: ['consolidate'],
    flag: 'always',
    edges: '   s',
    connect: 'e',
    exits: [cave(0x5c, 'swamp')],
  });
  readonly swampNWSE = this.metascreen({
    id: 0x77,
    icon: icon`
      | │ |
      |─┼─|
      | │ |`,
    tile: ' c |ccc| c ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: 'ssss',
    connect: '26ae',
    exits: [topEdge({left: 6, width: 4}),
            leftEdge({top: 7, height: 4, shift: -0.5}),
            bottomEdge({left: 6, width: 4}),
            rightEdge({top: 7, height: 4, shift: -0.5})],
  });
  readonly swampNWS = this.metascreen({
    id: 0x78,
    icon: icon`
      | │ |
      |─┤ |
      | │ |`,
    tile: ' c |cc | c ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: 'sss ',
    connect: '26a',
    exits: [topEdge({left: 6, width: 4}),
            leftEdge({top: 7, height: 4, shift: -0.5}),
            bottomEdge({left: 6, width: 4})],
  });
  readonly swampNE = this.metascreen({
    id: 0x79,
    icon: icon`
      | │ |
      | └─|
      |   |`,
    tile: ' c | cc|   ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: 's  s',
    connect: '2e',
    exits: [topEdge({left: 6, width: 4}),
            rightEdge({top: 7, height: 4, shift: -0.5})],
    poi: [[2]],
  });
  readonly swampWSE = this.metascreen({
    id: 0x7a,
    icon: icon`
      |   |
      |─┬─|
      | │ |`,
    tile: '   |ccc| c ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: ' sss',
    connect: '6ae',
    exits: [leftEdge({top: 7, height: 4, shift: -0.5}),
            bottomEdge({left: 6, width: 4}),
            rightEdge({top: 7, height: 4, shift: -0.5})],
  });
  readonly swampWSE_door = this.metascreen({
    id: 0x7a,
    icon: icon`∩
      | ∩ |
      |─┬─|
      | │ |`,
    tile: '   |c<c| c ',
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    feature: ['consolidate'],
    flag: 'always',
    edges: ' sss',
    connect: '6ae',
    // NOTE: door screens should not be on an exit edge!
    exits: [cave(0x56, 'swamp')],
  });
  readonly swampW = this.metascreen({
    id: 0x7b,
    icon: icon`
      |   |
      |─╴ |
      |   |`,
    tile: '   |cc |   ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: ' s  ',
    connect: '6',
    poi: [[0]],
  });
  readonly swampW_door = this.metascreen({
    id: 0x7b,
    icon: icon`∩
      | ∩ |
      |─╴ |
      |   |`,
    tile: '   |c< |   ',
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    feature: ['consolidate'],
    flag: 'always',
    edges: ' s  ',
    connect: '6',
    exits: [cave(0x54, 'swamp')],
    // TODO - flaggable
  });
  readonly swampArena = this.metascreen({
    id: 0x7c,
    icon: icon`
      |   |
      |┗┯┛|
      | │ |`,
    tile: '   | a | c ',
    tilesets: {swamp: {}},
    feature: ['arena'],
    edges: '  s ',
    connect: 'a',
    // For left/right neighbors, only allow edge or empty.
    // TODO - check that this is still the case.

    // NOTE: no edge exit since we don't want to go straight here...
    // TODO - constraint that we put solids on either side?
    // TODO - undo the attempt to allow this not on the right edge,
    //        maybe make a few custom combinations? (is it still broken?)
    //        --> looks like we did fix that earlier somehow?  maybe by moving
    //            the whole screen a column over, or else by changing the tiles?
    // TODO - NOTE SWAMP GRAPHICS STILL BROKEN!!
  });
  readonly swampNWE = this.metascreen({
    id: 0x7d,
    icon: icon`
      | │ |
      |─┴─|
      |   |`,
    tile: ' c |ccc|   ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: 'ss s',
    connect: '26e',
    exits: [topEdge({left: 6, width: 4}),
            leftEdge({top: 7, height: 4}),
            rightEdge({top: 7, height: 4})],
  });
  readonly swampWS = this.metascreen({
    id: 0x7e,
    icon: icon`
      |   |
      |─┐ |
      | │ |`,
    tile: '   |cc | c ',
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    feature: ['consolidate'],
    update: [[ScreenFix.SwampDoors, (s, seed, rom) => {
      rom.metascreens.swampWS_door.flag = 'always';
      return true;
    }]],
    edges: ' ss ',
    connect: '6a',
    exits: [leftEdge({top: 7, height: 4}), bottomEdge({left: 6, width: 4})],
    poi: [[2]],
  });
  readonly swampWS_door = this.metascreen({
    id: 0x7e,
    icon: icon`∩
      | ∩ |
      |─┐ |
      | │ |`,
    tile: '   |c< | c ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: ' ss ',
    connect: '6a',
    exits: [cave(0x57, 'swamp')],
  });
  readonly swampEmpty = this.metascreen({
    id: 0x7f,
    icon: icon`
      |   |
      |   |
      |   |`,
    tile: '   |   |   ',
    tilesets: {swamp: {}},
    feature: ['empty'],
    edges: '    ',
    connect: '',
    delete: true,
  });
  // Missing swamp screens
  readonly swampN = this.metascreen({
    id: ~0x70,
    icon: icon`
      | │ |
      | ╵ |
      |   |`,
    tile: ' c | c |   ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: 's   ',
    connect: '2',
    poi: [[0]],
    definition: constant(readScreen(
        `.  .  .  .  cf f6 c7 ad c4 b7 f6 cc .  .  .  .
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
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .`,
        ['.', 0xc8])),
  });
  readonly swampS = this.metascreen({
    id: ~0x71,
    icon: icon`
      |   |
      | ╷ |
      | │ |`,
    tile: '   | c | c ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: '  s ',
    connect: 'a',
    poi: [[0]],
    definition: constant(readScreen(
        `.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
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
         .  .  .  .  cf f6 b7 b7 b8 b6 d2 cc .  .  .  .`,
        ['.', 0xc8])),
  });
  readonly swampNS = this.metascreen({
    id: ~0x72,
    icon: icon`
      | │ |
      | │ |
      | │ |`,
    tile: ' c | c | c ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: 's s ',
    connect: '2a',
    exits: [topEdge({left: 6, width: 4}), bottomEdge({left: 6, width: 4})],
    definition: constant(readScreen(
        `.  .  .  .  cf d3 b6 b6 c6 b6 f6 cc .  .  .  .
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
         .  .  .  .  cf f6 b7 b7 c7 b6 d2 cc .  .  .  .`,
        ['.', 0xc8])),
  });
  readonly swampWE = this.metascreen({
    id: ~0x73,
    icon: icon`
      |   |
      |───|
      |   |`,
    tile: '   |ccc|   ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: ' s s',
    connect: '6e',
    exits: [leftEdge({top: 7, height: 4, shift: -0.5}),
            rightEdge({top: 7, height: 4, shift: -0.5})],
    definition: constant(readScreen(
        `.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
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
         .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .`,
        ['.', 0xc8])),
  });
  readonly swampWE_door = this.metascreen({
    id: ~0x73,
    icon: icon`∩
      | ∩ |
      |───|
      |   |`,
    tile: '   |c<c|   ',
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    feature: ['consolidate'],
    flag: 'always',
    edges: ' s s',
    connect: '6e',
    exits: [cave(0x56, 'swamp')],
  });
  readonly swampSE = this.metascreen({
    id: ~0x74,
    icon: icon`
      |   |
      | ┌─|
      | │ |`,
    tile: '   | cc| c ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: '  ss',
    connect: 'ae',
    exits: [rightEdge({top: 7, height: 4, shift: -0.5}),
            bottomEdge({left: 6, width: 4})],
    poi: [[2]],
    definition: constant(readScreen(
        `.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
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
         .  .  .  .  cf d3 b6 b9 c3 b8 d2 cc .  .  .  .`,
        ['.', 0xc8])),
  });
  readonly swampSE_door = this.metascreen({
    id: ~0x74,
    icon: icon`∩
      | ∩ |
      | ┌─|
      | │ |`,
    tile: '   | <c| c ',
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    feature: ['consolidate'],
    flag: 'always',
    edges: '  ss',
    connect: 'ae',
    exits: [cave(0x5a, 'swamp')],
  });
  readonly swampNSE = this.metascreen({
    id: ~0x75,
    icon: icon`
      | │ |
      | ├─|
      | │ |`,
    tile: ' c | cc| c ',
    tilesets: {swamp: {}},
    feature: ['consolidate'],
    edges: 's ss',
    connect: '2ae',
    exits: [topEdge({left: 6, width: 4}),
            bottomEdge({left: 6, width: 4}),
            rightEdge({top: 7, height: 4, shift: -0.5})],
    definition: constant(readScreen(
        `.  .  .  .  cf d3 c4 c3 c3 c3 f7 f8 ca .  .  .
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
         .  .  .  .  cf d3 b6 b9 b7 b7 f6 cc .  .  .  .`,
        ['.', 0xc8])),
  });
  // Cave screens
  readonly caveEmpty = this.metascreen({
    id: 0x80,
    icon: icon`
      |   |
      |   |
      |   |`,
    tile: '   |   |   ',
    tilesets: {cave: {}, fortress: {}, labyrinth: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    edges: '    ',
    delete: true,
  });
  readonly dolphinCave_empty = this.metascreen({
    id: 0x80,
    icon: icon`
      |   |
      |   |
      |   |`,
    tile: '   |   |   ',
    tilesets: {dolphinCave: {}},
    feature: ['empty'],
    edges: '    ',
    delete: true,
  });
  readonly open = this.metascreen({ // NOTE: not cave
    id: 0x80,
    icon: icon`
      |   |
      |   |
      |   |`,
    tile: 'ooo|ooo|ooo',
    tilesets: {desert: {}, sea: {}}, // NOTE: could add grass/river but trees nicer.
    edges: 'oooo',
  });
  readonly hallNS = this.metascreen({
    id: 0x81,
    icon: icon`
      | │ |
      | │ |
      | │ |`,
    tile: ' c | c | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'c c ',
    connect: '2a',
    poi: [[4]],
    exits: [bottomEdge({left: 6, width: 4, manual: true}),
            topEdge({left: 6, width: 4, manual: true})],
  });
  readonly hallNS_unreachable = this.metascreen({
    id: 0x81,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallWE = this.metascreen({
    id: 0x82,
    icon: icon`
      |   |
      |───|
      |   |`,
    tile: '   |ccc|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' c c',
    connect: '6e',
    poi: [[4]],
  });
  readonly hallWE_unreachable = this.metascreen({
    id: 0x82,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallSE = this.metascreen({
    id: 0x83,
    icon: icon`
      |   |
      | ┌─|
      | │ |`,
    tile: '   | cc| c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: '  cc',
    connect: 'ae',
    poi: [[2]],
  });
  readonly hallSE_unreachable = this.metascreen({
    id: 0x83,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallWS = this.metascreen({
    id: 0x84,
    icon: icon`
      |   |
      |─┐ |
      | │ |`,
    tile: '   |cc | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' cc ',
    connect: '6a',
    poi: [[2]],
  });
  readonly hallWS_unreachable = this.metascreen({
    id: 0x84,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallNE = this.metascreen({
    id: 0x85,
    icon: icon`
      | │ |
      | └─|
      |   |`,
    tile: ' c | cc|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'c  c',
    connect: '2e',
    poi: [[2]],
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly hallNE_unreachable = this.metascreen({
    id: 0x85,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallNW = this.metascreen({
    id: 0x86,
    icon: icon`
      | │ |
      |─┘ |
      |   |`,
    tile: ' c |cc |   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'cc  ',
    connect: '26',
    poi: [[2]],
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly hallNW_unreachable = this.metascreen({
    id: 0x86,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly branchNSE = this.metascreen({
    id: 0x87,
    icon: icon`
      | │ |
      | ├─|
      | │ |`,
    tile: ' c | cc| c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'c cc',
    connect: '2ae',
    poi: [[3]],
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly branchNSE_unreachable = this.metascreen({
    id: 0x87,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly branchNWSE = this.metascreen({
    id: 0x88,
    icon: icon`
      | │ |
      |─┼─|
      | │ |`,
    tile: ' c |ccc| c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'cccc',
    connect: '26ae',
    poi: [[3]],
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly branchNWSE_unreachable = this.metascreen({
    id: 0x88,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly branchNWS = this.metascreen({
    id: 0x89,
    icon: icon`
      | │ |
      |─┤ |
      | │ |`,
    tile: ' c |cc | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'ccc ',
    connect: '26a',
    poi: [[3]],
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly branchNWS_unreachable = this.metascreen({
    id: 0x89,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly branchWSE = this.metascreen({
    id: 0x8a,
    icon: icon`
      |   |
      |─┬─|
      | │ |`,
    tile: '   |ccc| c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' ccc',
    connect: '6ae',
    poi: [[3]],
  });
  readonly branchWSE_unreachable = this.metascreen({
    id: 0x8a,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly branchNWE = this.metascreen({
    id: 0x8b,
    icon: icon`
      | │ |
      |─┴─|
      |   |`,
    tile: ' c |ccc|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'cc c',
    connect: '26e',
    poi: [[3]],
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly branchNWE_unreachable = this.metascreen({
    id: 0x8b,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallNS_ramp = this.metascreen({
    id: 0x8c,
    icon: icon`
      | ┋ |
      | ┋ |
      | ┋ |`,
    tile: ' c | / | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['ramp'],
    edges: 'c c ',
    connect: '2a',
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly hallNS_ramp_unreachable = this.metascreen({
    id: 0x8c,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallNS_overBridge = this.metascreen({
    id: 0x8d,
    icon: icon`
      | ╽ |
      |─┃─|
      | ╿ |`,
    tile: ' c | b | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['overpass'],
    edges: 'cbcb', // TODO - 'b' for other side of bridge??
    connect: '2a',
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly hallWE_underBridge = this.metascreen({
    id: 0x8e,
    icon: icon`
      | ╽ |
      |───|
      | ╿ |`,
    tile: '   |cbc|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['underpass'],
    edges: 'bcbc',
    connect: '6e',
  });
  readonly hallNS_wall = this.metascreen({
    id: 0x8f,
    icon: icon`
      | │ |
      | ┆ |
      | │ |`,
    tile: ' c | c | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'c c ',
    feature: ['wall'],
    // TODO - can we just detect the connections?
    //      - for each tileset, map 1..f to various edge pos?
    //      - e.g. cave: 0x02 = 1, 0x08 = 2, 0x0c = 3,
    //                   0x20 = 5, 0x80 = 6, 0xc0 = 7, ...
    //        need to be WALKABLE
    //        may need to reevaluate each screen for each tileset...
    //        and need to wait until the screen is BUILT!
    connect: '2=a', // wall will always connect the first two?
    wall: 0x87, 
    mod: 'wall',
    exits: [topEdge({left: 6, width: 4, manual: true})],
  });
  readonly hallNS_wall_unreachable = this.metascreen({
    id: 0x8f,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallWE_wall = this.metascreen({
    id: 0x90,
    icon: icon`
      |   |
      |─┄─|
      |   |`,
    tile: '   |ccc|   ',
    // NOTE: no fortress version of this wall!
    tilesets: {cave: {}, iceCave: {}},
    feature: ['wall'],
    edges: ' c c',
    connect: '6=e',
    wall: 0x67,
    mod: 'wall',
  });
  readonly hallWE_wall_unreachable = this.metascreen({
    id: 0x90,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallNS_arena = this.metascreen({
    id: 0x91,
    icon: icon`
      |┌┸┐|
      |│&│|
      |└┬┘|`,
    //placement: 'manual',
    tile: [' n | a | c '], // , ' n | a | w '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['arena'],
    edges: 'c c ', // 'n' for 'narrow' on top???
    connect: '2a',
    poi: [[1, 0x60, 0x78]],
    exits: [topEdge(), // vampire 1 room
            bottomEdge({left: 6, width: 4, manual: true}), // goa sages
            seamlessUp(0xe6, 4), seamlessDown(0xf6, 4)], // kensu
    arena: 1,
  });
  readonly hallNS_arena_unreachable = this.metascreen({
    id: 0x91,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly hallNS_arenaWall = this.metascreen({
    id: 0x92,
    icon: icon`
      |┌┄┐|
      |│&│|
      |└┬┘|`,
    placement: 'manual',
    tile: [' n | a | c '], // , ' c | a | c '],
    // NOTE: iron wall doesn't work here
    tilesets: {cave: {}, iceCave: {}},
    feature: ['arena', 'wall'],
    edges: 'n c ',
    connect: '2x=apx',
    wall: 0x27,
    mod: 'wall',
    poi: [[1, 0x60, 0x78]],
    // NOTE: top exit needs to move up a tile...?
    exits: [topEdge({top: 1}), // prisons need extra exits
            bottomEdge({left: 6, width: 4, manual: true})],
    arena: 1,
  });
  // NOTE: screen 93 is missing!
  readonly branchNWE_wall = this.metascreen({
    id: 0x94,
    icon: icon`
      | ┆ |
      |─┴─|
      |   |`,
    tile: ' c |ccc|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wall'],
    edges: 'cc c',
    connect: '2x=6e',
    exits: [topEdge({left: 6, width: 4})],
    mod: 'wall',
    wall: 0x37,
  });
  readonly branchNWE_wall_unreachable = this.metascreen({
    id: 0x94,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly branchNWE_upStair = this.metascreen({
    id: 0x95,
    icon: icon`<
      | < |
      |─┴─|
      |   |`,
    tile: '   |c<c|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' c c',
    connect: '6e',
    exits: [upStair(0x47)],
  });
  readonly branchNWE_upStair_unreachable = this.metascreen({
    id: 0x95,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly deadEndW_upStair = this.metascreen({
    id: 0x96,
    icon: icon`<
      | < |
      |─┘ |
      |   |`,
    tile: '   |c< |   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' c  ',
    connect: '6',
    exits: [upStair(0x42)],
  });
  readonly deadEndW_upStair_unreachable = this.metascreen({
    id: 0x96,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x20),
    delete: true,
  });
  readonly deadEndW_downStair = this.metascreen({
    id: 0x97,
    icon: icon`>
      |   |
      |─┐ |
      | > |`,
    tile: '   |c> |   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' c  ',
    connect: '6',
    exits: [downStair(0xa2)],
  });
  readonly deadEndW_downStair_unreachable = this.metascreen({
    id: 0x97,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x20),
    delete: true,
  });
  readonly deadEndE_upStair = this.metascreen({
    id: 0x98,
    icon: icon`<
      | < |
      | └─|
      |   |`,
    tile: '   | <c|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: '   c',
    connect: 'e',
    exits: [upStair(0x4c)],
  });
  readonly deadEndE_upStair_unreachable = this.metascreen({
    id: 0x98,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0xd0),
    delete: true,
  });
  readonly deadEndE_downStair = this.metascreen({
    id: 0x99,
    icon: icon`>
      |   |
      | ┌─|
      | > |`,
    tile: '   | >c|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: '   c',
    connect: 'e',
    exits: [downStair(0xac)],
  });
  readonly deadEndE_downStair_unreachable = this.metascreen({
    id: 0x99,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0xd0),
    delete: true,
  });
  readonly deadEndNS_stairs = this.metascreen({
    id: 0x9a,
    icon: icon`
      | > |
      |   |
      | < |`,
    placement: 'manual',
    tile: ' > |   | < ', // NOTE: this will need to be manual...
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    edges: 'c c ',
    connect: '2x|ax',
    exits: [downStair(0x17), upStair(0xd7)],
    match: (reachable) => reachable(0x108, 0x78) && reachable(-0x30, 0x78),
  });
  readonly deadEndNS_stairs_unreachable = this.metascreen({
    id: 0x9a,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x108, 0x78) && !reachable(-0x30, 0x78),
    delete: true,
  });
  readonly deadEndN_stairs = this.metascreen({
    id: 0x9a,
    icon: icon`
      | > |
      |   |
      |   |`,
    tile: [' c | > |   ', ' > |   |   '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    edges: 'c   ',
    connect: '2',
    exits: [downStair(0x17)],
    match: (reachable) => !reachable(0x108, 0x78) && reachable(-0x30, 0x78),
  });
  readonly deadEndS_stairs = this.metascreen({
    id: 0x9a,
    icon: icon`
      |   |
      |   |
      | < |`,
    tile: ['   | < | c ', '   |   | < '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    edges: '  c ',
    connect: 'a',
    exits: [upStair(0xd7)],
    match: (reachable) => !reachable(-0x30, 0x78) && reachable(0x108, 0x78),
  });
  readonly deadEndNS = this.metascreen({
    id: 0x9b,
    icon: icon`
      | ╵ |
      |   |
      | ╷ |`,
    placement: 'manual',
    tile: ' c |   | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['deadend', 'empty'],
    edges: 'c c ',
    connect: '2p|ap',
    poi: [[0, -0x30, 0x78], [0, 0x110, 0x78]],
    match: (reachable) => reachable(-0x30, 0x78) && reachable(0x110, 0x78),
  });
  readonly deadEndNS_unreachable = this.metascreen({
    id: 0x9b,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(-0x30, 0x78) && !reachable(0x110, 0x78),
    delete: true,
  });
  readonly deadEndN = this.metascreen({
    id: 0x9b,
    icon: icon`
      | ╵ |
      |   |
      |   |`,
    tile: [' c | c |   ', ' c |   |   '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['deadend', 'empty'],
    edges: 'c   ',
    connect: '2',
    poi: [[0, -0x30, 0x78]],
    match: (reachable) => !reachable(0x110, 0x78) && reachable(-0x30, 0x78),
  });
  readonly deadEndS = this.metascreen({
    id: 0x9b,
    icon: icon`
      |   |
      |   |
      | ╷ |`,
    tile: ['   | c | c ', '   |   | c '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['deadend', 'empty'],
    edges: '  c ',
    connect: 'a',
    poi: [[0, 0x110, 0x78]],
    match: (reachable) => !reachable(-0x30, 0x78) && reachable(0x110, 0x78),
  });
  readonly deadEndWE = this.metascreen({
    id: 0x9c,
    icon: icon`
      |   |
      |╴ ╶|
      |   |`,
    placement: 'manual',
    tile: '   |c c|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['deadend', 'empty'],
    edges: ' c c',
    connect: '6p|ep',
    poi: [[0, 0x70, -0x28], [0, 0x70, 0x108]],
    match: (reachable) => reachable(0x70, -0x28) && reachable(0x70, 0x108),
  });
  readonly deadEndWE_unreachable = this.metascreen({
    id: 0x9c,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x70, -0x28) && !reachable(0x70, 0x108),
    delete: true,
  });
  readonly deadEndW = this.metascreen({
    id: 0x9c,
    icon: icon`
      |   |
      |╴  |
      |   |`,
    tile: ['   |cc |   ', '   |c  |   '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['deadend', 'empty'],
    edges: ' c  ',
    connect: '6',
    poi: [[0, 0x70, -0x28]],
    match: (reachable) => !reachable(0x70, 0x108) && reachable(0x70, -0x28),
  });
  readonly deadEndE = this.metascreen({
    id: 0x9c,
    icon: icon`
      |   |
      |  ╶|
      |   |`,
    tile: ['   | cc|   ', '   |  c|   '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['deadend', 'empty'],
    edges: '   c',
    connect: 'e',
    poi: [[0, 0x70, 0x108]],
    match: (reachable) => !reachable(0x70, -0x28) && reachable(0x70, 0x108),
  });
  // NOTE: 9d missing
  readonly hallNS_entrance = this.metascreen({
    id: 0x9e,
    icon: icon`╽
      | │ |
      | │ |
      | ╽ |`,
    tile: ' c | c | n ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'c n ',
    connect: '2a',
    exits: [bottomEdge()],
  });
  readonly hallNS_entrance_unreachable = this.metascreen({
    id: 0x9e,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly channelExitSE = this.metascreen({
    id: 0x9f,
    icon: icon`
      |   |
      | ╔═|
      | ║ |`,
    tilesets: {dolphinCave: {}},
    feature: ['river'],
    edges: '  rr', // TODO - this is not specific enough to randomize with
    //connect: '9d:bf',  // : means water - flight needed
    exits: [bottomEdge({left: 5})],
  });
  readonly channelBendWS = this.metascreen({
    id: 0xa0,
    icon: icon`
      |█  |
      |═╗ |
      |█║ |`,
    tilesets: {dolphinCave: {}},
    feature: ['river'],
    edges: ' rr ', // TODO - this is not specific enough to randomize with
  });
  readonly channelHallNS = this.metascreen({
    id: 0xa1,
    icon: icon`
      | ║ |
      | ╠┈|
      | ║ |`,
    tilesets: {dolphinCave: {}},
    feature: ['river', 'bridge'],
    wall: 0x8b,
    edges: 'r r ', // TODO - this is not specific enough to randomize with
  });
  readonly channelEntranceSE = this.metascreen({
    id: 0xa2,
    icon: icon`
      |   |
      | ╔┈|
      |╷║ |`,
    tilesets: {dolphinCave: {}},
    feature: ['river', 'bridge'],
    // NOTE: This would ALMOST work as a connection to the
    // normal river cave tiles, but the river is one tile
    // taller at the top, so there's no match!
    exits: [bottomEdge({left: 2})],
    wall: 0x7c,
    edges: '  rr', // TODO - this is not specific enough to randomize with
  });
  readonly channelCross = this.metascreen({
    id: 0xa3,
    icon: icon`
      | ║ |
      |═╬═|
      |╷║╷|`,
    tilesets: {dolphinCave: {}},
    feature: ['river'],
    // NOTE: two bottom edges on the same screen - call one a door
    exits: [bottomEdge({left: 3}), bottomEdge({left: 0xb, type: 'door'})],
    edges: '  rr', // TODO - this is not specific enough to randomize with
  });
  readonly channelDoor = this.metascreen({
    id: 0xa4,
    icon: icon`∩
      | ∩█|
      |┈══|
      |  █|`,
    tilesets: {dolphinCave: {}},
    feature: ['river', 'bridge'],
    exits: [door(0x38)],
    wall: 0x73,
    edges: ' r  ', // TODO - this is not specific enough to randomize with
  });
  readonly mountainFloatingIsland = this.metascreen({
    id: 0xa5,
    icon: icon`*
      |═╗█|
      |*║ |
      |═╣█|`,
    placement: 'manual',
    tile: '   | ap|   ',
    tilesets: {mountainRiver: {}},
    edges: '  wp',  // w = waterfall, p = path
    connect: 'e',
  });
  readonly mountainPathNE_stair = this.metascreen({
    id: 0xa6,
    icon: icon`└
      |█┋█|
      |█  |
      |███|`,
    tile: ' / | pp|  ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: 'l  p',  // l = ladder (stairs)
    connect: '2e',
    exits: [topEdge()], // never used as an exit in vanilla
  });
  readonly mountainBranchNWE = this.metascreen({
    id: 0xa7,
    icon: icon`┴
      |█ █|
      |   |
      |███|`,
    tile: ' p |ppp|  ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: 'pp p',
    connect: '26e',
  });
  readonly mountainPathWE_iceBridge = this.metascreen({
    id: 0xa8,
    icon: icon`╫
      |█║█|
      | ┆ |
      |█║█|`,
    tile: [' r |ppp| r ', ' r |ppp|   '],
    tilesets: {mountainRiver: {}},
    feature: ['bridge'],
    edges: 'wpwp',
    connect: '6-e:2a',
    wall: 0x87,
  });
  readonly mountainPathSE = this.metascreen({
    id: 0xa9,
    icon: icon`┌
      |███|
      |█  |
      |█ █|`,
    tile: '   | pp| p ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: '  pp',
    connect: 'ae',
    exits: [rightEdge({top: 6, height: 4}), bottomEdge({left: 6, width: 4})],
  });
  readonly mountainDeadEndW_caveEmpty = this.metascreen({
    id: 0xaa,
    icon: icon`∩
      |█∩█|
      |▐ ▐|
      |███|`,
    // placement: 'manual',
    tile: '   |p< |   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' p  ',
    connect: '6',
    exits: [cave(0x38)],
  });
  readonly mountainPathNE = this.metascreen({
    id: 0xab,
    icon: icon`└
      |█ █|
      |█  |
      |███|`,
    tile: ' p | pp|   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: 'p  p',
    connect: '2e',
    exits: [rightEdge({top: 6, height: 4}), topEdge({left: 6, width: 4})],
  });
  readonly mountainBranchWSE = this.metascreen({
    id: 0xac,
    icon: icon`┬
      |███|
      |   |
      |█ █|`,
    tile: '   |ppp| p ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' ppp',
    connect: '6ae',
  });
  readonly mountainPathW_cave = this.metascreen({
    id: 0xad,
    icon: icon`∩
      |█∩█|
      |  ▐|
      |███|`,
    tile: '   |p< |   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' p  ',
    connect: '6',
    exits: [cave(0x55)],
  });
  readonly mountainPathE_slopeS = this.metascreen({
    id: 0xae,
    icon: icon`╓
      |███|
      |█  |
      |█↓█|`,
    tile: '   | pp| ↓ ',
    tilesets: {mountain: {}},
    edges: '  sp', // s = slope
    connect: 'ae',
  });
  readonly mountainPathNW = this.metascreen({
    id: 0xaf,
    icon: icon`┘
      |█ █|
      |  █|
      |███|`,
    tile: ' p |pp |   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: 'pp  ',
    connect: '26',
    exits: [leftEdge({top: 6, height: 4}), topEdge({left: 6, width: 4})],
  });
  readonly mountainCave_empty = this.metascreen({
    id: 0xb0,
    icon: icon`∩
      |█∩█|
      |▌ ▐|
      |███|`,
    tile: '   | < |   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: '    ',
    connect: '',
    exits: [cave(0x58)],
  });
  readonly mountainPathE_cave = this.metascreen({
    id: 0xb1,
    icon: icon`∩
      |█∩█|
      |█  |
      |███|`,
    tile: '   | <p|   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: '   p',
    connect: 'e',
    exits: [cave(0x57)],
  });
  readonly mountainPathWE_slopeN = this.metascreen({
    id: 0xb2,
    icon: icon`╨
      |█↓█|
      |   |
      |███|`,
    tile: ' ↓ |ppp|   ',
    tilesets: {mountain: {}},
    edges: 'sp p',
    connect: '26e',
  });
  readonly mountainDeadEndW = this.metascreen({
    id: 0xb3,
    icon: icon`╴
      |███|
      |  █|
      |███|`,
    tile: '   |pp |   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' p  ',
    connect: '6',
  });
  readonly mountainPathWE = this.metascreen({
    id: 0xb4,
    icon: icon`─
      |███|
      |   |
      |███|`,
    tile: '   |ppp|   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' p p',
    connect: '6e',
    exits: [leftEdge({top: 6, height: 4}), rightEdge({top: 6, height: 4})],
  });
  readonly mountainArena_gate = this.metascreen({
    id: 0xb5,
    icon: icon`#
      |█#█|
      |▌ ▐|
      |█┋█|`,
    tile: '   | < | / ',
    tilesets: {mountain: {}, mountainRiver: {}},
    feature: ['arena'],
    edges: '  l ',
    connect: 'a',
    exits: [{...upStair(0x47, 3), type: 'gate'}],
    flag: 'custom:false',
  });
  readonly mountainPathN_slopeS_cave = this.metascreen({
    id: 0xb6,
    icon: icon`∩
      |█┋∩|
      |▌ ▐|
      |█↓█|`,
    tile: ' / | < | ↓ ',
    tilesets: {mountain: {}},
    edges: 'l s ',
    connect: '2a',
    exits: [cave(0x5a), topEdge()],
  });
  readonly mountainPathWE_slopeNS = this.metascreen({
    id: 0xb7,
    icon: icon`╫
      |█↓█|
      |   |
      |█↓█|`,
    tile: ' ↓ |ppp| ↓ ',
    tilesets: {mountain: {}},
    edges: 'spsp',
    connect: '26ae',
  });
  readonly mountainPathWE_slopeN_cave = this.metascreen({
    id: 0xb8,
    icon: icon`∩
      |█↓∩|
      |   |
      |███|`,
    tile: ' ↓ |p<p|   ',
    tilesets: {mountain: {}},
    edges: 'sp p',
    connect: '26e',
    exits: [cave(0x5c)],
  });
  readonly mountainPathWS = this.metascreen({
    id: 0xb9,
    icon: icon`┐
      |███|
      |  █|
      |█ █|`,
    tile: '   |pp | p ',
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' pp ',
    connect: '6a',
    exits: [leftEdge({top: 6, height: 4}), bottomEdge({left: 6, width: 4})],
  });
  readonly mountainSlope = this.metascreen({
    id: 0xba,
    icon: icon`↓
      |█↓█|
      |█↓█|
      |█↓█|`,
    tile: ' ↓ | ↓ | ↓ ',
    tilesets: {mountain: {}},
    edges: 's s ',
    connect: '2a',
  });
  readonly mountainRiver = this.metascreen({
    id: 0xba,
    icon: icon`║
      |█║█|
      |█║█|
      |█║█|`,
    tile: [' r | r | r ', ' r | r |   '],
    tilesets: {mountainRiver: {}},
    edges: 'w w ',
    connect: '2:e',
  });
  readonly mountainPathE_gate = this.metascreen({
    id: 0xbb,
    icon: icon`∩
      |█∩█|
      |█  |
      |███|`,
    tile: '   | <p|   ',
    tilesets: {mountain: {}},
    edges: '   p',
    connect: 'e',
    exits: [cave(0x57, 'gate')],
  });
  readonly mountainPathWE_inn = this.metascreen({
    id: 0xbc,
    icon: icon`∩
      |█∩█|
      |   |
      |███|`,
    tile: '   |p<p|   ',
    placement: 'manual',
    tilesets: {mountain: {}},
    edges: ' p p',
    connect: '6e',
    exits: [door(0x76)],
  });
  readonly mountainPathWE_bridgeOverSlope = this.metascreen({
    id: 0xbd,
    icon: icon`═
      |█↓█|
      | ═ |
      |█↓█|`,
    tile: ' ↓ |ppp| ↓ ',
    tilesets: {mountain: {}},
    edges: 'spsp',
    connect: '6e', // '2a|6e',
    exits: [seamlessUp(0xb6, 4)],
  });
  readonly mountainPathWE_bridgeOverRiver = this.metascreen({
    id: 0xbd,
    icon: icon`═
      |█║█|
      | ═ |
      |█║█|`,
    tile: [' r |ppp| r ', ' r |ppp|   '],
    tilesets: {mountainRiver: {}},
    edges: 'wpwp',
    connect: '6e|2|a',
  });
  readonly mountainSlope_underBridge = this.metascreen({
    id: 0xbe,
    icon: icon`↓
      |█↓█|
      | ═ |
      |█↓█|`,
    tile: ' ↓ |p↓p| ↓ ',
    placement: 'manual',
    tilesets: {mountain: {}},
    // TODO - could fly under bridge on mountainRiver
    edges: 'spsp',
    connect: '2a', // '2a|6e',
    exits: [seamlessDown(0xc6, 4)],
  });
  readonly mountainEmpty = this.metascreen({
    id: 0xbf,
    icon: icon`
      |███|
      |███|
      |███|`,
    tile: '   |   |   ',
    tilesets: {mountain: {}, mountainRiver: {}},
    feature: ['empty'],
    edges: '    ',
    delete: true,
  });
  readonly boundaryS = this.metascreen({
    id: 0xc0,
    icon: icon`
      |   |
      |▄▄▄|
      |███|`,
    tile: 'ooo|ooo|   ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    // TODO - grass/river should maybe use rocks instead?
    edges: 'o^ ^', // o = open, ^ = open up
    //connect: '26e',
  });
  readonly boundaryN_cave = this.metascreen({
    id: 0xc1,
    icon: icon`
      |███|
      |▀∩▀|
      |   |`,
    tile: '   |o<o|ooo',
    tilesets: {grass: {}, sea: {}, desert: {},
               river: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: ' vov', // o = open, v = open down
    exits: [cave(0x49)],
  });
  readonly cornerSE_cave = this.metascreen({
    id: 0xc2,
    icon: icon`
      | ▐█|
      |▄∩█|
      |███|`,
    tile: 'oo |o< |   ',
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '<^  ',
    exits: [cave(0x5a)],
  });
  readonly waterfall = this.metascreen({
    id: 0xc3,
    icon: icon`
      |   |
      |↓↓↓|
      |   |`,
    tile: 'ooo|↓↓↓|ooo',
    tilesets: {sea: {}},
    edges: 'oooo',
  });
  readonly whirlpoolBlocker = this.metascreen({
    id: 0xc4,
    icon: icon`
      |   |
      |█╳█|
      |   |`,
    tile: 'ooo|↓#↓|ooo',
    tilesets: {sea: {}},
    // TODO - indicate flag
    feature: ['whirlpool'],
    flag: 'calm', // calmed sea
    edges: 'oooo',
  });
  readonly beachExitN = this.metascreen({
    id: 0xc5,
    icon: icon`
      |█ █|
      |█╱▀|
      |█▌ |`,
    placement: 'manual',
    tile: ' x | bo| oo',
    tilesets: {sea: {}},
    edges: 'n >v', // n = "narrow"
    exits: [topEdge({left: 9})],
  });
  readonly whirlpoolOpen = this.metascreen({
    id: 0xc6,
    icon: icon`
      |   |
      | ╳ |
      |   |`,
    tile: 'ooo|ooo|ooo',
    tilesets: {sea: {}},
    feature: ['whirlpool'],
    edges: 'oooo',
    flag: 'calm', // but only if on angry sea - not desert...
  });
  readonly quicksandOpen = this.metascreen({
    id: 0xc6,
    icon: icon`
      |   |
      | ╳ |
      |   |`,
    tile: 'ooo|ooo|ooo',
    tilesets: {desert: {}},
    feature: ['whirlpool'],
    edges: 'oooo',
  });
  readonly lighthouseEntrance = this.metascreen({
    id: 0xc7,
    icon: icon`
      |▗▟█|
      |▐∩▛|
      |▝▀▘|`,
    placement: 'manual',
    tile: 'oo |oLo|ooo',
    tilesets: {sea: {}},
    // TODO - indicate uniqueness?
    feature: ['lighthouse'],
    edges: '<oov',
    exits: [cave(0x2a), door(0x75)],
  });
  readonly beachCave = this.metascreen({
    id: 0xc8,
    icon: icon`
      |█∩█|
      |▀╲█|
      |   |`,
    placement: 'manual',
    tile: '   |o<o|ooo',
    tilesets: {sea: {}},
    edges: ' vov',
    exits: [cave(0x28)],
  });
  readonly beachCabinEntrance = this.metascreen({
    id: 0xc9,
    icon: icon`
      | ∩█|
      | ╲▀|
      |█▄▄|`,
    placement: 'manual',
    tile: 'oo |oC8|   ',
    tilesets: {sea: {}},
    feature: ['cabin'],
    edges: '<^ b', // b = "boat"
    exits: [door(0x55), rightEdge({top: 8, height: 3})],
  });
  readonly oceanShrine = this.metascreen({
    id: 0xca,
    icon: icon`
      |▗▄▖|
      |▐*▌|
      |▝ ▘|`,
    placement: 'manual',
    tile: 'ooo|oAo|ooo',
    tilesets: {sea: {}},
    // TODO - indicate uniqueness?
    feature: ['altar'],
    edges: 'oooo',
  });
  readonly pyramidEntrance = this.metascreen({
    id: 0xcb,
    icon: icon`
      | ▄ |
      |▟∩▙|
      | ╳ |`,
    placement: 'manual',
    tile: 'ooo|oPo|ooo',
    tilesets: {desert: {}},
    // TODO - indicate uniqueness?
    feature: ['pyramid'],
    edges: 'oooo',
    exits: [cave(0xa7, 'fortress')],
  });
  readonly cryptEntrance = this.metascreen({
    id: 0xcc,
    icon: icon`
      | ╳ |
      |▐>▌|
      |▝▀▘|`,
    placement: 'manual',
    tile: 'ooo|oYo|ooo',
    tilesets: {desert: {}},
    feature: ['crypt'],
    edges: 'oooo',
    exits: [downStair(0x67)],
  });
  readonly oasisLake = this.metascreen({
    id: 0xcd,
    icon: icon`
      | ^ |
      |vOv|
      | vv|`,
    tile: 'ooo|ooo|oro',
    placement: 'manual',
    tilesets: {desert: {}},
    feature: ['lake'],
    edges: 'oo3o',
  });
  readonly desertCaveEntrance = this.metascreen({
    id: 0xce,
    icon: icon`
      |▗▄▖|
      |▜∩▛|
      | ╳ |`,
    tile: 'ooo|o<o|ooo',
    tilesets: {desert: {},
               // TODO - probably need to pull this out since flags differ
               // TODO - we could also make this workable in river if we want
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: 'oooo',
    exits: [cave(0xa7)],
  });
  readonly oasisCave = this.metascreen({
    id: 0xcf,
    icon: icon`
      | vv|
      |▄∩v|
      |█▌ |`,
    placement: 'manual',
    tile: 'oro|o<o| oo',
    tilesets: {desert: {}},
    edges: '3^>o',
    exits: [upStair(0x37)],
  });
  readonly channelEndW_cave = this.metascreen({
    id: 0xd0,
    icon: icon`
      |██∩|
      |══ |
      |███|`,
    tile: '   |r< |   ',
    tilesets: {dolphinCave: {}},
    feature: ['river'],
    exits: [upStair(0x57)],
  });
  readonly boatChannel = this.metascreen({
    id: 0xd1,
    icon: icon`
      |███|
      |▀▀▀|
      |▄▄▄|`,
    tile: ['   |888|   ', '   |88x|   '],
    tilesets: {sea: {}},
    edges: ' b b',
    exits: [{...rightEdge({top: 8, height: 3}), entrance: 0x9ce8},
            leftEdge({top: 8, height: 3})],
  });
  readonly channelWE = this.metascreen({
    id: 0xd2,
    icon: icon`
      |███|
      |═══|
      |███|`,
    tile: '   |rrr|   ',
    tilesets: {dolphinCave: {}},
    feature: ['river'],
  });
  readonly riverCaveNWSE = this.metascreen({
    id: 0xd3,
    icon: icon`
      |┘║└|
      |═╬═|
      |┬┇┬|`,
      // |▘║▝|
      // |═╬═|
      // |▖┆▗|`,
    // TODO - consider using solids for the corners instead?
    tile: ' r |rrr| r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river', 'bridge'],
    edges: 'rrrr',
    connect: '15p:3dp:79-bf',
    wall: 0xb6,
    poi: [[4, 0x00, 0x48], [4, 0x00, 0x98]],
  });
  readonly riverCaveNS = this.metascreen({
    id: 0xd4,
    icon: icon`
      |│║│|
      |│║│|
      |│║│|`,
      // |▌║▐|
      // |▌║▐|
      // |▌║▐|`,
    tile: ' r | r | r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'r r ',
    connect: '19:3b',
    mod: 'bridge', // d6 is the bridged version
  });
  readonly riverCaveWE = this.metascreen({
    id: 0xd5,
    icon: icon`
      |───|
      |═══|
      |───|`,
    tile: '   |rrr|   ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: ' r r',
    connect: '5d:7f',
    mod: 'bridge', // d7 is the bridged version
  });
  readonly riverCaveNS_bridge = this.metascreen({
    id: 0xd6,
    icon: icon`
      |│║│|
      |├┇┤|
      |│║│|`,
    tile: ' r | r | r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river', 'bridge'],
    edges: 'r r ',
    connect: '19-3b',
    wall: 0x87,
  });
  readonly riverCaveWE_bridge = this.metascreen({
    id: 0xd7,
    icon: icon`
      |─┬─|
      |═┅═|
      |─┴─|`,
    tile: '   |rrr|   ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river', 'bridge'],
    edges: ' r r',
    connect: '5d-7f',
    wall: 0x86,
  });
  readonly riverCaveSE = this.metascreen({
    id: 0xd8,
    icon: icon`
      |┌──|
      |│╔═|
      |│║┌|`,
    tile: '   | rr| r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: '  rr',
    connect: '9d:bf',
  });
  readonly riverCaveWS = this.metascreen({
    id: 0xd9,
    icon: icon`
      |──┐|
      |═╗│|
      |┐║│|`,
    tile: '   |rr | r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: ' rr ',
    connect: '5b:79',
  });
  readonly riverCaveNE = this.metascreen({
    id: 0xda,
    icon: icon`
      |│║└|
      |│╚═|
      |└──|`,
    tile: ' r | rr|   ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'r  r',
    connect: '1f:3d',
  });
  readonly riverCaveNW = this.metascreen({
    id: 0xdb,
    icon: icon`
      |┘║│|
      |═╝│|
      |──┘|`,
    tile: ' r |rr |   ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'rr  ',
    connect: '15:37',
  });
  readonly riverCaveWE_passageN = this.metascreen({
    id: 0xdc,
    icon: icon`╧
      |─┴─|
      |═══|
      |───|`,
    tile: ' c |rrr|   ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'cr r',
    connect: '25d:7f',
  });
  readonly riverCaveWE_passageS = this.metascreen({
    id: 0xdd,
    icon: icon`╤
      |───|
      |═══|
      |─┬─|`,
    tile: '   |rrr| c ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: ' rcr',
    connect: '5d:7af',
  });
  readonly riverCaveNS_passageW = this.metascreen({
    id: 0xde,
    icon: icon`╢
      |│║│|
      |┤║│|
      |│║│|`,
    tile: ' r |cr | r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'rcr ',
    connect: '169:3b',
  });
  readonly riverCaveNS_passageE = this.metascreen({
    id: 0xdf,
    icon: icon`╟
      |│║│|
      |│║├|
      |│║│|`,
    tile: ' r | rc| r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'r rc',
    connect: '19:3be',
  });
  readonly wideHallNE = this.metascreen({
    id: 0xe0,
    icon: icon`
      | ┃ |
      | ┗━|
      |   |`,
    tile: ' w | ww|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: 'w  w',
    connect: '2e',
  });
  readonly goaWideHallNE = this.metascreen({
    id: 0xe0,
    icon: icon`
      |│┃└|
      |│┗━|
      |└──|`,
    tile: ' w | ww|   ',
    tilesets: {labyrinth: {}},
    edges: 'w  w',
    connect: '1f|2e|3d',
  });
  readonly goaWideHallNE_blockedLeft = this.metascreen({
    id: 0xe0,
    icon: icon`
      |│┃└|
      | ┗━|
      |└──|`,
    tile: ' w | ww|   ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x61]}},
    edges: 'w  w',
    connect: '1|f|2e|3d',
  });
  readonly goaWideHallNE_blockedRight = this.metascreen({
    id: 0xe0,
    icon: icon`
      |│┃ |
      |│┗━|
      |└──|`,
    tile: ' w | ww|   ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x0d]}},
    edges: 'w  w',
    connect: '1f|2e|3|d',
  });
  readonly wideHallNW = this.metascreen({
    id: 0xe1,
    icon: icon`
      | ┃ |
      |━┛ |
      |   |`,
    tile: ' w |ww |   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: 'ww  ',
    connect: '26',
  });
  readonly goaWideHallNW = this.metascreen({
    id: 0xe1,
    icon: icon`
      |┘┃│|
      |━┛│|
      |──┘|`,
    tile: ' w |ww |   ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           removeWall: 0x6d}},
    edges: 'ww  ',
    connect: '15|26|37',
  });
  readonly goaWideHallNW_blockedRight = this.metascreen({
    id: 0xe1,
    icon: icon`
      |┘┃│|
      |━┛ |
      |──┘|`,
    tile: ' w |ww |   ',
    tilesets: {labyrinth: {}},
    edges: 'ww  ',
    connect: '15|26|3|7',
  });
  readonly goaWideHallNW_blockedLeft = this.metascreen({
    id: 0xe1,
    icon: icon`
      | ┃│|
      |━┛│|
      |──┘|`,
    tile: ' w |ww |   ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x01], removeWall: 0x6d}},
    edges: 'ww  ',
    connect: '1|5|26|37',
  });
  readonly wideHallSE = this.metascreen({
    id: 0xe2,
    icon: icon`
      |   |
      | ┏━|
      | ┃ |`,
    tile: '   | ww| w ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: '  ww',
    connect: 'ae',
  });
  readonly goaWideHallSE = this.metascreen({
    id: 0xe2,
    icon: icon`
      |┌──|
      |│┏━|
      |│┃┌|`,
    tile: '   | ww| w ',
    tilesets: {labyrinth: {}},
    edges: '  ww',
    connect: '9d|ae|bf',
  });
  readonly goaWideHallSE_blockedLeft = this.metascreen({
    id: 0xe2,
    icon: icon`
      |┌──|
      | ┏━|
      |│┃┌|`,
    tile: '   | ww| w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x61]}},
    edges: '  ww',
    connect: '9|d|ae|bf',
  });
  readonly goaWideHallSE_blockedRight = this.metascreen({
    id: 0xe2,
    icon: icon`
      |┌──|
      |│┏━|
      |│┃ |`,
    tile: '   | ww| w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0xdd]}},
    edges: '  ww',
    connect: '9d|ae|b|f',
  });
  readonly wideHallWS = this.metascreen({
    id: 0xe3,
    icon: icon`
      |   |
      |━┓ |
      | ┃ |`,
    tile: '   |ww | w ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: ' ww ',
    connect: '6a',
  });
  readonly goaWideHallWS = this.metascreen({
    id: 0xe3,
    icon: icon`
      |──┐|
      |━┓│|
      |┐┃│|`,
    tile: '   |ww | w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           removeWall: 0x9d}},
    edges: ' ww ',
    connect: '5b|6a|79',
  });
  readonly goaWideHallWS_blockedRight = this.metascreen({
    id: 0xe3,
    icon: icon`
      |──┐|
      |━┓ |
      |┐┃│|`,
    tile: '   |ww | w ',
    tilesets: {labyrinth: {}},
    edges: ' ww ',
    connect: '5|b|6a|79',
  });
  readonly goaWideHallWS_blockedLeft = this.metascreen({
    id: 0xe3,
    icon: icon`
      |──┐|
      |━┓│|
      | ┃│|`,
    tile: '   |ww | w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0xd1], removeWall: 0x9d}},
    edges: ' ww ',
    connect: '5b|6a|7|9',
  });
  readonly goaWideHallNS_stairs = this.metascreen({
    id: 0xe4,
    icon: icon`
      |├┨│|
      |│┃│|
      |│┠┤|`,
    tile: ' w | H | w ',
    tilesets: {labyrinth: {}},
    edges: 'w w ',
    connect: '1239ab',
  });
  readonly goaWideHallNS_stairsBlocked13 = this.metascreen({
    id: 0xe4,
    icon: icon`
      |└┨│|
      |╷┃╵|
      |│┠┐|`,
    tile: ' w | H | w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x41, 0x8d]}},
    edges: 'w w ',
    connect: '12ab|3|9',
  });
  readonly goaWideHallNS_stairsBlocked24 = this.metascreen({
    id: 0xe4,
    icon: icon`
      |┌┨│|
      |│┃│|
      |│┠┘|`,
    tile: ' w | H | w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x01, 0xcd]}},
    edges: 'w w ',
    connect: '1|239a|b',
  });
  // TODO - custom inverted version of e4 with the top stair on the right
  readonly wideHallNS_deadEnds = this.metascreen({
    id: 0xe5,
    icon: icon`
      | ╹ |
      |   |
      | ╻ |`,
    tile: ' w |   | w ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: 'w w ',
    connect: '2|a',
    match: (reachable) => reachable(0x110, 0x78) && reachable(-0x30, 0x78),
  });
  readonly wideHall_deadEndN = this.metascreen({
    id: 0xe5,
    icon: icon`
      | ╹ |
      |   |
      |   |`,
    tile: [' w |   |   ', ' w | w |   '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: 'w   ',
    connect: '2',
    match: (reachable) => !reachable(0x110, 0x78) && reachable(-0x30, 0x78),
  });
  readonly wideHall_deadEndS = this.metascreen({
    id: 0xe5,
    icon: icon`
      |   |
      |   |
      | ╻ |`,
    tile: ['   |   | w ', '   | w | w '],
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: '  w ',
    connect: 'a',
    match: (reachable) => reachable(0x110, 0x78) && !reachable(-0x30, 0x78),
  });
  // TODO - add one-way views of this?!?
  readonly goaWideHallNS_deadEnd = this.metascreen({
    id: 0xe5,
    icon: icon`
      |│╹│|
      |├─┤|
      |│╻│|`,
    tile: ' w | = | w ',
    tilesets: {labyrinth: {}},
    edges: 'w w ',
    connect: '139b|2|a',
  });
  readonly goaWideHallNS_deadEndBlocked24 = this.metascreen({
    id: 0xe5,
    icon: icon`
      |╵╹│|
      |┌─┘|
      |│╻╷|`,
    tile: ' w | = | w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x61, 0xad]}},
    edges: 'w w ',
    connect: '1|2|39|a|b',
  });
  readonly goaWideHallNS_deadEndBlocked13 = this.metascreen({
    id: 0xe5,
    icon: icon`
      |│╹╵|
      |└─┐|
      |╷╻│|`,
    tile: ' w | = | w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x6d, 0xa1]}},
    edges: 'w w ',
    connect: '1b|2|3|9|a',
  });
  readonly wideHallNWSE = this.metascreen({
    id: 0xe6,
    icon: icon`
      | ┃ |
      |━╋━|
      | ┃ |`,
    tile: ' w |www| w ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: 'wwww',
    connect: '26ae',
  });
  readonly goaWideHallNWSE = this.metascreen({
    id: 0xe6,
    icon: icon`
      |┘┃└|
      |━╋━|
      |┐┃┌|`,
    tile: ' w |www| w ',
    tilesets: {labyrinth: {}},
    edges: 'wwww',
    connect: '26ae|15|3d|79|bf',
  });
  readonly goaWideHallNWSE_blocked13 = this.metascreen({
    id: 0xe6,
    icon: icon`
      |┘┃ |
      |━╋━|
      | ┃┌|`,
    tile: ' w |www| w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x0d, 0xd1]}},
    edges: 'wwww',
    connect: '26ae|15|3|d|7|9|bf',
  });
  readonly goaWideHallNWSE_blocked24 = this.metascreen({
    id: 0xe6,
    icon: icon`
      | ┃└|
      |━╋━|
      |┐┃ |`,
    tile: ' w |www| w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x01, 0xdd]}},
    edges: 'wwww',
    connect: '26ae|1|5|3d|79|b|f',
  });
  readonly wideHallNWE = this.metascreen({
    id: 0xe7,
    icon: icon`
      | ┃ |
      |━┻━|
      |   |`,
    tile: ' w |www|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: 'ww w',
    connect: '26e',
  });
  readonly goaWideHallNWE = this.metascreen({
    id: 0xe7,
    icon: icon`
      |┘┃└|
      |━┻━|
      |───|`,
    tile: ' w |www|   ',
    tilesets: {labyrinth: {}},
    edges: 'ww w',
    connect: '26e|15|3d|7f',
  });
  readonly goaWideHallNWE_blockedTop = this.metascreen({
    id: 0xe7,
    icon: icon`
      | ┃ |
      |━┻━|
      |───|`,
    tile: ' w |www|   ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0x01, 0x0d]}},
    edges: 'ww w',
    connect: '26e|1|5|3|d|7f',
  });
  readonly wideHallWSE = this.metascreen({
    id: 0xe8,
    icon: icon`
      |   |
      |━┳━|
      | ┃ |`,
    tile: '   |www| w ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: ' www',
    connect: '6ae',
  });
  readonly goaWideHallWSE = this.metascreen({
    id: 0xe8,
    icon: icon`
      |───|
      |━┳━|
      |┐┃┌|`,
    tile: '   |www| w ',
    tilesets: {labyrinth: {}},
    edges: ' www',
    connect: '6ae|5d|79|bf',
  });
  readonly goaWideHallWSE_blockedBottom = this.metascreen({
    id: 0xe8,
    icon: icon`
      |───|
      |━┳━|
      | ┃ |`,
    tile: '   |www| w ',
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets],
                           addWall: [0xd1, 0xdd]}},
    edges: ' www',
    connect: '6ae|5d|7|9|b|f',
  });
  readonly wideHallNS_wallTop = this.metascreen({
    id: 0xe9,    // NOTE: the passage narrows at the top
    icon: icon`
      | ┆ |
      | ┃ |
      | ┃ |`,
    tile: ' n | w | w ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide', 'wall'],
    edges: 'c w',
    connect: '2a',
    exits: [topEdge({left: 6, width: 4})],
    wall: 0x37,
    statues: [0xa],
  });
  readonly goaWideHallNS_wallTop = this.metascreen({
    id: 0xe9,    // NOTE: the passage narrows at the top
    icon: icon`
      | ┆ |
      |╷┃╷|
      |│┃│|`,
    tile: ' n | w | w ',
    tilesets: {labyrinth: {}},
    feature: ['wall'],
    edges: 'c w ',
    connect: '2ax|9|b',
    exits: [topEdge({left: 6, width: 4})],
    wall: 0x37,
    statues: [0xa],
  });
  readonly wideHallWE = this.metascreen({
    id: 0xea,
    icon: icon`
      |   |
      |━━━|
      |   |`,
    tile: '   |www|   ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['wide'],
    edges: ' w w',
    connect: '6e',
  });
  readonly goaWideHallWE = this.metascreen({
    id: 0xea,
    icon: icon`
      |───|
      |━━━|
      |───|`,
    tile: '   |www|   ',
    tilesets: {labyrinth: {}},
    edges: ' w w',
    connect: '5d|6e|7f',
  });
  readonly pitWE = this.metascreen({
    id: 0xeb,
    tile: '   |cpc|   ',
    icon: icon`
      |   |
      |─╳─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['pit'],
    edges: ' c c',
    connect: '6e',
    platform: {type: 'horizontal', coord: 0x70_38},
  });
  readonly pitNS = this.metascreen({
    id: 0xec,
    icon: icon`
      | │ |
      | ╳ |
      | │ |`,
    tile: ' c | p | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['pit'],
    edges: 'c c ',
    connect: '2a',
    platform: {type: 'vertical', coord: 0x40_78},
  });
  readonly pitNS_unreachable = this.metascreen({
    id: 0xec,
    icon: icon`\n|   |\n|   |\n|   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['empty'],
    placement: 'manual',
    match: (reachable) => !reachable(0x80, 0x80),
    delete: true,
  });
  readonly spikesNS_hallS = this.metascreen({
    id: 0xed,
    icon: icon`
      | ░ |
      | ░ |
      | │ |`,
    tile: ' s | s | c ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['spikes'],
    edges: 's c ', // s = spikes
    connect: '2a',
  });
  readonly spikesNS_hallN = this.metascreen({
    id: 0xee,
    icon: icon`
      | │ |
      | ░ |
      | ░ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    tile: ' c | s | s ',
    feature: ['spikes'],
    edges: 'c s ',
    connect: '2a',
  });
  readonly spikesNS_hallWE = this.metascreen({
    id: 0xef,
    icon: icon`
      | ░ |
      |─░─|
      | ░ |`,
    tile: ' s |csc| s ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['spikes'],
    edges: 'scsc',
    connect: '26ae',
  });
  readonly spikesNS_hallW = this.metascreen({
    id: ~0xe0,
    icon: icon`
      | ░ |
      |─░ |
      | ░ |`,
    tilesets: //withRequire(ScreenFix.ExtraSpikes,
              {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    tile: ' s |cs | s ',
    feature: ['spikes'],
    edges: 'scs ',
    connect: '26a',
    definition: (rom: Rom) => readScreen(
        `L L L L L L L L R R R R R R R R
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
         L L L L L L L L R R R R R R R R`,
      ['L', rom.metascreens.spikesNS_hallWE],
      ['R', rom.metascreens.spikesNS]),
  });
  readonly spikesNS_hallE = this.metascreen({
    id: ~0xe1,
    icon: icon`
      | ░ |
      | ░─|
      | ░ |`,
    tilesets: //withRequire(ScreenFix.ExtraSpikes,
              {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    tile: ' s | sc| s ',
    feature: ['spikes'],
    edges: 's sc',
    connect: '2ae',
    definition: (rom: Rom) => readScreen(
        `L L L L L L L L R R R R R R R R
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
         L L L L L L L L R R R R R R R R`,
      ['L', rom.metascreens.spikesNS],
      ['R', rom.metascreens.spikesNS_hallWE]),
  });
  readonly riverCave_deadEndsNS = this.metascreen({
    id: 0xf0,
    icon: icon`
      | ╨ |
      |   |
      | ╥ |`,
    tile: ' r |   | r ',
    placement: 'manual',
    tilesets: {cave: {}, fortress: {}},
    feature: ['deadend', 'empty', 'river'],
    edges: 'r r ',
    connect: '1p:3p|9p:bp',
    poi: [[1, -0x30, 0x48], [1, -0x30, 0x98],
          [1, 0x110, 0x48], [1, 0x110, 0x98]],
  });
  readonly riverCave_deadEndsN = this.metascreen({
    id: 0xf0,
    icon: icon`
      | ╨ |
      |   |
      |   |`,
    tile: [' r |   |   ', ' r | r |   '],
    tilesets: {cave: {}, fortress: {}},
    feature: ['deadend', 'empty', 'river'],
    edges: 'r   ',
    connect: '1p:3p',
    poi: [[1, -0x30, 0x48], [1, -0x30, 0x98]],
    match: (reachable) => !reachable(0x108, 0x48) && !reachable(0x108, 0x98),
    mod: 'bridge', // f2 is bridged version
  });
  readonly riverCave_deadEndsS = this.metascreen({
    id: 0xf0,
    icon: icon`
      |   |
      |   |
      | ╥ |`,
    tile: ['   |   | r ', '   | r | r '],
    tilesets: {cave: {}, fortress: {}},
    feature: ['deadend', 'empty', 'river'],
    edges: '  r ',
    connect: '9p:bp',
    poi: [[1, 0x110, 0x48], [1, 0x110, 0x98]],
    match: (reachable) => !reachable(-0x30, 0x48) && !reachable(-0x30, 0x98),
    mod: 'bridge', // f2 is bridged version
  });
  readonly riverCave_deadEndsWE = this.metascreen({
    id: 0xf1,
    icon: icon`
      |   |
      |╡ ╞|
      |   |`,
    tile: '   |r r|   ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['deadend', 'empty', 'river'],
    edges: ' r r',
    connect: '5p:7p|dp:fp',
    poi: [[1, 0x60, -0x28], [1, 0xa0, -0x28],
          [1, 0x60, 0x108], [1, 0xa0, 0x108]],
  });
  readonly riverCave_deadEndsW = this.metascreen({
    id: 0xf1,
    icon: icon`
      |   |
      |╡  |
      |   |`,
    tile: ['   |r  |   ', '   |rr |   '],
    tilesets: {cave: {}, fortress: {}},
    feature: ['deadend', 'empty', 'river'],
    edges: ' r  ',
    connect: '5p:7p',
    poi: [[1, 0x60, -0x28], [1, 0xa0, -0x28]],
    match: (reachable) => !reachable(0x60, 0x108) && !reachable(0xa0, 0x108),
  });
  readonly riverCave_deadEndsE = this.metascreen({
    id: 0xf1,
    icon: icon`
      |   |
      |  ╞|
      |   |`,
    tile: ['   |  r|   ', '   | rr|   '],
    tilesets: {cave: {}, fortress: {}},
    feature: ['deadend', 'empty', 'river'],
    edges: '   r',
    connect: 'dp:fp',
    poi: [[1, 0x60, 0x108], [1, 0xa0, 0x108]],
    match: (reachable) => !reachable(0x60, -0x28) && !reachable(0xa0, -0x28),
  });
  readonly riverCaveN_bridge = this.metascreen({
    id: 0xf2,
    icon: icon`
      | ┇ |
      | ╨ |
      |   |`,
    tile: [' r | r |   ', ' r |   |   '],
    tilesets: {cave: {}, fortress: {}},
    feature: ['river', 'bridge'],
    edges: 'r   ',
    connect: '1-3',
    wall: 0x17,
    // TODO - consider a poi(2) here?
    match: (reachable) => !reachable(0xd0, 0x48) && !reachable(0xd0, 0x98),
  });
  readonly riverCaveS_bridge = this.metascreen({
    id: 0xf2,
    icon: icon`
      |   |
      | ╥ |
      | ┇ |`,
    tile: ['   | r | r ', '   |   | r '],
    tilesets: {cave: {}, fortress: {}},
    feature: ['river', 'bridge'],
    edges: '  r ',
    connect: '9-b',
    wall: 0xc6,
    // TODO - consider a poi(2) here?
    match: (reachable) => !reachable(0x10, 0x48) && !reachable(0x10, 0x98),
  });
  readonly riverCaveWSE = this.metascreen({
    id: 0xf3,
    icon: icon`
      |───|
      |═╦═|
      |┐║┌|`,
    tile: '   |rrr| r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: ' rrr',
    connect: '5d:79:bf',
  });
  readonly riverCaveNWE = this.metascreen({
    id: 0xf4,
    icon: icon`
      |┘║└|
      |═╩═|
      |───|`,
    tile: ' r |rrr|   ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'rr r',
    connect: '15p:3dp:7f',
    poi: [[4, 0x00, 0x48], [4, 0x00, 0x98]],
  });
  readonly riverCaveNWS = this.metascreen({
    id: ~0xf0,
    icon: icon`
      |┘║│|
      |═╣│|
      |┐║│|`,
    tile: ' r |rr | r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'rrr ',
    connect: '15p:3b:79',
    poi: [[4, 0x00, 0x48]],
    definition: (rom: Rom) => readScreen(
        `A A A A A A A A R R R R R R R R
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
         B B B B B B B B R R R R R R R R`,
      ['A', rom.metascreens.riverCaveNWE],
      ['B', rom.metascreens.riverCaveWSE],
      ['R', rom.metascreens.riverCaveNS]),
  });
  readonly riverCaveNSE = this.metascreen({
    id: ~0xf1,
    icon: icon`
      |│║└|
      |│╠═|
      |│║┌|`,
    tile: ' r | rr| r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'r rr',
    connect: '19:3dp:bf',
    poi: [[4, 0x00, 0x98]],
    definition: (rom: Rom) => readScreen(
        `L L L L L L L L A A A A A A A A
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
         L L L L L L L L B B B B B B B B`,
      ['A', rom.metascreens.riverCaveNWE],
      ['B', rom.metascreens.riverCaveWSE],
      ['L', rom.metascreens.riverCaveNS]),
  });

  readonly riverCaveNS_blockedRight = this.metascreen({
    id: 0xf5,
    icon: icon`
      |│║│|
      |│║ |
      |│║│|`,
    tile: ' r | r | r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'r r ',
    connect: '19:3p:bp',
    poi: [[0, 0x40, 0x98], [0, 0xc0, 0x98]],
    mod: 'block',
  });
  readonly riverCaveNS_blockedLeft = this.metascreen({
    id: 0xf6,
    icon: icon`
      |│║│|
      | ║│|
      |│║│|`,
    tile: ' r | r | r ',
    tilesets: {cave: {}, fortress: {}},
    feature: ['river'],
    edges: 'r r ',
    connect: '1p:3b:9p',
    poi: [[0, 0x30, 0x48], [0, 0xb0, 0x48]],
    mod: 'block',
  });
  readonly spikesNS = this.metascreen({
    id: 0xf7,
    icon: icon`
      | ░ |
      | ░ |
      | ░ |`,
    tile: ' s | s | s ',
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['spikes'],
    edges: 's s ',
    connect: '2a',
  });
  readonly cryptArena_statues = this.metascreen({
    id: 0xf8,
    icon: icon`<
      |&<&|
      |│ │|
      |└┬┘|`,
    tile: '   | a | c ',
    tilesets: {pyramid: {}},
    feature: ['arena'],
    edges: '  c ',
    connect: 'a',
    exits: [{...upStair(0x57), type: 'crypt'}],
    flag: 'custom:false',
    arena: 2,
  });
  readonly pyramidArena_draygon = this.metascreen({
    id: 0xf9,
    icon: icon`
      |┌─┐|
      |│╳│|
      |└┬┘|`,
    tile: '   | a | w ',
    tilesets: {pyramid: {}},
    feature: ['arena', 'pit'],
    edges: '  w ',
    connect: 'a',
    arena: 3,
  });
  readonly cryptArena_draygon2 = this.metascreen({
    id: 0xfa,
    icon: icon`
      |┏┷┓|
      |┃&┃|
      |┗┳┛|`,
    tile: ' x | a | w ',
    tilesets: {pyramid: {}},
    feature: ['arena'],
    edges: 'c w ',
    connect: '2a',
    exits: [topEdge({left: 6, width: 4})],
    flag: 'custom:false',
    arena: 4,
  });
  readonly cryptArena_entrance = this.metascreen({
    id: 0xfb,
    icon: icon`
      | ┃ |
      | ┃ |
      | ╿ |`,
    tile: ' w | w | x ',
    tilesets: {pyramid: {}},
    edges: 'w n ',
    connect: '2a',
    exits: [bottomEdge()],
  });
  readonly cryptTeleporter = this.metascreen({
    id: 0xfc,
    tilesets: {pyramid: {}, tower: {}},
    exits: [bottomEdge({left: 6, width: 4}), cave(0x57, 'teleporter')],
  });
  readonly fortressArena_through = this.metascreen({
    id: 0xfd,
    icon: icon`╽
      |┌┴┐|
      |│ │|
      |┕┳┙|`,
    tile: [' c | a | w ', ' n | a | w '], // x | a | w ??
    tilesets: {fortress: {}, pyramid: {}},
    // NOTE: we could use this for a pit that requires flight to cross?
    feature: ['arena'],
    edges: 'n w ',
    connect: '2a',
    exits: [topEdge()],
    arena: 5,
  });
  // readonly fortressArena_pit = this.metascreen({
  //   id: 0xfd,
  //   icon: icon`╽
  //     |┌┴┐|
  //     |│ │|
  //     |┕┳┙|`,
  //   tilesets: {pyramid: {}},
  //   feature: ['arena', 'pit'],
  //   edges: 'n w ',
  //   connect: '2a', // TODO - no way yet to notice flagged and have
  //   exits: [topEdge()],   // logic require flight...
  //   flagged: true,
  // });
  readonly fortressTrap = this.metascreen({
    id: 0xfe,
    icon: icon`
      |└─┘|
      | ╳ |
      |╶┬╴|`,
    tile: '   | x | n ', // TODO - same as statues...?
    tilesets: {fortress: {}, pyramid: {}},
    feature: ['pit'],
    edges: '  n ',
    connect: 'a',
    exits: [bottomEdge()],
  });
  readonly shrine = this.metascreen({
    id: 0xff,
    tilesets: {shrine: {}},
    exits: [bottomEdge({left: 6, width: 5}), door(0x68)],
  });
  readonly inn = this.metascreen({
    id: 0x100,
    tilesets: {house: {}},
    exits: [{...door(0x86), entrance: 0x94_68}],
  });
  readonly toolShop = this.metascreen({
    id: 0x101,
    tilesets: {house: {}},
    exits: [{...door(0x86), entrance: 0x94_68}],
  });
  readonly armorShop = this.metascreen({
    id: 0x102,
    tilesets: {house: {}},
    exits: [{...door(0x86), entrance: 0x94_68}],
  });

  checkExitTypes() {
    // Does a quick check to make sure there's no conflicting exit types
    // on any metascreens.
    for (const s in this) {
      const ms = this[s] as any;
      const seen = new Set<string>();
      for (const e of ms?.data?.exits || []) {
        if (seen.has(e.type)) console.log(`duplicate: ${s} ${e.type}`);
        seen.add(e.type);
      }
    }
  }
}


//   ╔╦╗         ╢  ╥
//   ╠╬╣ ╞═╤╧╪╡  ║  ╫
//   ╚╩╝         ╨  ╟
//  ┌┬┐  ╷
//  ├┼┤  │ ╶─╴ 
//  └┴┘  ╵
// ▗▄▖   ▟▙
// ▐█▌   ▜▛ 
// ▝▀▘
// U+250x ─ ━ │ ┃ ┄ ┅ ┆ ┇ ┈ ┉ ┊ ┋ ┌ ┍ ┎ ┏
// U+251x ┐ ┑ ┒ ┓ └ ┕ ┖ ┗ ┘ ┙ ┚ ┛ ├ ┝ ┞ ┟
// U+252x ┠ ┡ ┢ ┣ ┤ ┥ ┦ ┧ ┨ ┩ ┪ ┫ ┬ ┭ ┮ ┯
// U+253x ┰ ┱ ┲ ┳ ┴ ┵ ┶ ┷ ┸ ┹ ┺ ┻ ┼ ┽ ┾ ┿
// U+254x ╀ ╁ ╂ ╃ ╄ ╅ ╆ ╇ ╈ ╉ ╊ ╋ ╌ ╍ ╎ ╏
// U+255x ═ ║ ╒ ╓ ╔ ╕ ╖ ╗ ╘ ╙ ╚ ╛ ╜ ╝ ╞	╟
// U+256x ╠ ╡ ╢ ╣ ╤ ╥ ╦ ╧ ╨ ╩ ╪ ╫ ╬ ╭ ╮ ╯
// U+257x ╰ ╱ ╲ ╳ ╴ ╵ ╶ ╷ ╸ ╹ ╺ ╻ ╼ ╽ ╾ ╿
// U+258x ▀ ▁ ▂ ▃ ▄ ▅ ▆ ▇ █ ▉ ▊ ▋ ▌ ▍ ▎ ▏
// U+259x ▐ ░ ▒ ▓ ▔ ▕ ▖ ▗ ▘ ▙ ▚ ▛ ▜ ▝ ▞ ▟
//
// ∩ \cap

function constant<T>(x: T): () => T { return () => x; }
