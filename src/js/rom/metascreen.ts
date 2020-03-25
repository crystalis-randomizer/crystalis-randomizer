import { Feature, MetascreenData, ConnectionType, featureMask} from './metascreendata.js';
import {Metatileset, Metatilesets} from './metatileset.js';
import {Screen} from './screen.js';
import {Rom} from '../rom.js';

export type Uid = number & {__uid__: never};

export class Metascreen {
  private readonly _features: number; // = new Set<Feature>();
  private readonly _tilesets = new Set<Metatileset>();
  // key: bitset - 1 for flight, 2 for noFlag
  // value: segments, each containing an offset to add to pos<<8 to get
  //        connection points (e.g. 0001, 0101, 1020, etc).
  readonly connections: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;

  used = false;

  flag?: 'always' | 'calm' | 'cave';
  name?: string;

  //readonly featureCount: ReadonlyMap<Feature, number>;

  // TODO - make data private?
  constructor(readonly rom: Rom, readonly uid: Uid,
              readonly data: MetascreenData) {
    for (const tileset of Object.values(data.tilesets)) {
      if (!tileset!.requires) this.used = true;
    }
    // let fixed = false;
    // const featureCount = new DefaultMap<Feature, number>(() => 0);
    let features = 0;
    for (const feature of data.feature ?? []) {
      const mask = featureMask[feature];
      if (mask != null) features |= mask;
      // this._features.add(feature);
      // if (fixedFeatures.has(feature)) fixed = true;
      // if (fixedCountFeatures.has(feature)) {
      //   featureCount.set(feature, featureCount.get(feature) + 1);
      // }
    }
    for (const exit of data.exits ?? []) {
      if (exit.type === 'stair:down' || exit.type === 'stair:up') {
        features |= featureMask[exit.type];
      }
    }
    this._features = features;
    // this.fixed = fixed;
    // this.featureCount = featureCount;
    // TODO - build "connections" by iterating over 0..3.
    const cxn: number[][][] = [[[]], [[]], [[]], [[]]];
    this.connections = cxn;
    for (let i = 0; i < 3; i++) {
      for (const term of this.data.connect ?? '') {
        if (connectionBlocks.includes(term)) {
          cxn[i].push([]);
          continue;
        }
        const num = parseInt(term, 16);
        if (!num) continue;
        const channel = (num & 3) << (num & 4); // 01, 02, 03, 10, 20, or 30
        const offset = num & 8 ? (num & 4 ? 0x0100 : 0x1000) : 0;
        cxn[i][cxn[i].length - 1].push(channel | offset);
      }
    }
  }

  get manual(): boolean {
    return Boolean(this._features & manualFeatureMask);
  }

  get counted(): boolean {
    return Boolean(this._features & countedFeatureMask);
  }

  // features(): Iterable<Feature> {
  //   return this._features.values();
  // }

  hasFeature(feature: Feature): boolean {
    return Boolean(this._features & featureMask[feature]);
  }

  hasFeatures(features: number): boolean {
    return (this._features & features) === features;
  }

  /** Return a new metascreen with the same profile but an extra feature. */
  withFeature(feature: Feature): Metascreen[] {
    // TODO - index this?
    throw new Error();
  }

  /** Return a new metascreen with the same profile but more obstructed. */
  withObstruction(): Metascreen[] {
    throw new Error();
  }

  isCompatibleWithTileset(id: number) {
    for (const tileset of this._tilesets) {
      if (tileset.tilesetId === id) return true;
    }
    return false;
  }

  /**
   * Replace occurrences of a metatile within this screen.
   */
  replace(from: number, to: number): Metascreen {
    const {tiles} = this.screen;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === from) tiles[i] = to;
    }
    return this;
  }

  remove() {
    // Remove self from all metatilesets.  Used by labyrinthVariant to
    // ensure impossible variants aren't added (note: with a dedicated
    // page we could make more available).
    for (const key in this.data.tilesets) {
      const tileset =
          this.rom.metatilesets[key as keyof Metatilesets] as Metatileset;
      tileset.deleteScreen(this);
    }
  }

  get id(): number {
    return this.data.id;
  }

  set id(id: number) {
    if (this.id === id) return;
    this.rom.metascreens.renumber(this.id, id);
  }

  get screen(): Screen {
    const {id, rom: {screens}} = this;
    return id < 0 ? screens.unallocated[~id] : screens[id];
  }

  // Only Metascreens.renumber should call this.
  unsafeSetId(id: number) {
    (this.data as {id: number}).id = id;
    for (const tileset of this._tilesets) {
      tileset.invalidate();
    }
  }
  // Only Metatileset.addScreen should call this.
  unsafeAddTileset(tileset: Metatileset) {
    this._tilesets.add(tileset);
  }
  // Only Metatileset.removeScreen should call this.
  unsafeRemoveTileset(tileset: Metatileset) {
    this._tilesets.delete(tileset);
  }

  /** Returns a bit mask of edges that _could_ exit: 1=N, 2=W, 4=S, 8=E. */
  edgeExits(): number {
    let mask = 0;
    for (const e of this.data.exits ?? []) {
      const dir = edgeTypeMap[e.type];
      if (dir != null) mask |= (1 << dir);
    }
    return mask;
  }

  findExitType(tile: number, single: boolean): ConnectionType|undefined {
    for (const exit of this.data.exits ?? []) {
      // if (exit.type === 'seamless') continue;
      const t0 = single && exit.type === 'edge:bottom' && tile >= 0xc0 ?
          tile + 0x20 : tile;
      if (exit.exits.includes(t0)) return exit.type;
    }
    return undefined;
  }

  findEntranceType(coord: number, single: boolean): ConnectionType|undefined {
    for (const exit of this.data.exits ?? []) {
      if (exit.type.startsWith('seamless')) continue;
      const c0 = single && exit.type === 'edge:bottom' && coord >= 0xbf00 ?
          coord + 0x2000 : coord;
      if (exit.entrance === c0) return exit.type;
    }
    return undefined;
  }
}

const edgeTypeMap: {[C in ConnectionType]?: number} = {
  'edge:top': 0,
  'edge:left': 1,
  'edge:bottom': 2,
  'edge:right': 3,
};

const connectionBlocks = [
  '|:', // break wall, form bridge, but no flight
  '|:=-', // no walls/bridge/flight
  '|', // flight and break walls
  '|=', // flight only
];
  

const manualFeatures = new Set<Feature>([
  'arena', 'portoa1', 'portoa2', 'portoa3', 'lake', 'overBridge', 'underBridge',
  'lighthouse', 'cabin', 'windmill', 'altar', 'pyramid', 'crypt',
]);
const countedFeatures = new Set<Feature>([
  'pit', 'spikes', 'bridge', 'wall', 'stairs', 'whirlpool',
]);

const manualFeatureMask = [...manualFeatures].map(
    f => featureMask[f] as number).reduce((a, b) => a | b);
const countedFeatureMask = [...countedFeatures].map(
    f => featureMask[f] as number).reduce((a, b) => a | b);
