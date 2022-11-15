import {Connection, ConnectionType, Feature, MetascreenData,
        featureMask} from './metascreendata.js';
import {Metatileset, Metatilesets} from './metatileset';
import {Screen} from './screen';
import {Rom} from '../rom';
import {DefaultMap, hex1} from '../util';

export type Uid = number & {__uid__: never};

export class Metascreen {
  private readonly _features: number; // = new Set<Feature>();
  private readonly _tilesets = new Set<Metatileset>();
  private readonly _isEmpty: boolean;
  // key: bitset - 1 for flight, 2 for noFlag
  // value: segments, each containing an offset to add to pos<<8 to get
  //        connection points (e.g. 0001, 0101, 1020, etc).
  readonly connections: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
  // TODO - it might make sense to build in '<>p' into the connections string,
  // indicating which partitions have exits or POI (in order).  But the API
  // for exposing this is ugly.  Another alternative would be to dedicate
  // a portion of "spectrum" to poi and exits, e.g. [f0..f3] for POI, [e0..e3]
  // for exits, and then we can build it directly into connections, and they
  // will show up in the results.
  //poi: Array<{x: number, y: number, priority: number, segment: number}>;

  used = false;

  // 'always' indicates that the flag toggles between two different metascreens
  // 'calm' is a special case for whirlpools
  // 'custom:false' indicates that the flag will default to false, but can be
  //     overridden by setting a customFlag on the MetaLocation
  // 'custom:true' is the same but defaults to true (i.e. closeable caves)
  // absent is used for normal walls and default to allocating a new wall flag
  flag?: 'always' | 'calm' | 'custom:false' | 'custom:true';
  name?: string;

  readonly neighbors = [
    new DefaultMap<Metascreen, boolean>((s) => this._checkNeighbor(s, 0)),
    new DefaultMap<Metascreen, boolean>((s) => this._checkNeighbor(s, 1)),
  ] as const;

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
    this._isEmpty = Boolean(features & featureMask['empty']);
    this.flag = data.flag;
    // this.fixed = fixed;
    // this.featureCount = featureCount;
    // TODO - build "connections" by iterating over 0..3.
    const cxn: number[][][] = [[[]], [[]], [[]], [[]]];

    this.connections = cxn;
    for (let i = 0; i < 4; i++) {
      let poiIndex = 0;
      let exitIndex = 0;
      let cur = cxn[i][0];
      for (const term of this.data.connect ?? '') {
        if (connectionBlocks[i].includes(term)) {
          cxn[i].push(cur = []);
          continue;
        }
        let delta;
        if (connectionBlockSet.has(term)) continue;
        if (term === 'p') {
          delta = 0xf0 | poiIndex++;
        } else if (term === 'x') {
          delta = 0xe0 | exitIndex++;
        } else {
          const num = parseInt(term, 16);
          if (!num) throw new Error(`bad term: '${term}'`); // continue???
          const channel = (num & 3) << (num & 4); // 01, 02, 03, 10, 20, or 30
          const offset = num & 8 ? (num & 4 ? 0x0100 : 0x1000) : 0;
          delta = channel | offset;
        }
        cur.push(delta);
      }
      while (poiIndex < this.data.poi?.length!) {
        cur.push(0xf0 | poiIndex++);
      }
      while (exitIndex < this.data.exits?.length!) {
        cur.push(0xe0 | exitIndex++);
      }
    }
  }

  get features(): number {
    return this._features;
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

  isEmpty(): boolean {
    return this._isEmpty;
  }

  hasStair(): boolean {
    return Boolean(this._features & (featureMask['stair:up'] |
                                     featureMask['stair:down']));
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
    for (const tileset of this.tilesets()) {
      tileset.deleteScreen(this);
    }
  }

  tilesets(): Metatileset[] {
    const tilesets: Metatileset[] = [];
    for (const key in this.data.tilesets) {
      tilesets.push(
          this.rom.metatilesets[key as keyof Metatilesets] as Metatileset);
    }
    return tilesets;
  }

  setGridTile(...tile: string[]) {
    this.data.tile = tile;
    for (const tileset of this.tilesets()) {
      tileset.invalidate();
    }
  }

  gridTiles(): string[] {
    let t = this.data.tile ?? [];
    if (!Array.isArray(t)) t = [t];
    return t.map(s => s.replace(/\|/g, ''));
  }

  get sid(): number {
    return this.data.id;
  }

  set sid(sid: number) {
    if (this.sid === sid) return;
    this.rom.metascreens.renumber(this.sid, sid, new Set(this.tilesets()));
  }

  get screen(): Screen {
    const {sid, rom: {screens}} = this;
    return sid < 0 ? screens.unallocated[~sid] : screens[sid];
  }

  // Only Metascreens.renumber should call this.
  unsafeSetId(sid: number) {
    (this.data as {id: number}).id = sid;
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

  edgeIndex(edgeType: string): number|undefined {
    let index = 0;
    const edge = this.data.edges ?? '';
    for (let i = 0; i < 4; i++) {
      if (edge[i] === ' ') continue;
      if (edge[i] !== edgeType) return undefined;
      index |= (1 << i);
    }
    return index;
  }

  findExitType(tile: number, single: boolean,
               seamless: boolean): Connection|undefined {
    for (const exit of this.data.exits ?? []) {
      if (exit.type.startsWith('seamless') !== seamless) continue;
      const t0 = single && exit.type === 'edge:bottom' && tile >= 0xc0 ?
          tile + 0x20 : tile;
      if (exit.exits.includes(t0) || (exit.allowedExits ?? []).includes(t0)) {
        return exit;
      }
    }
    return undefined;
  }

  findExitByType(type: ConnectionType): Connection {
    const exit = this.data.exits!.find(e => e.type === type);
    if (!exit) throw new Error(`no exit ${type}`);
    return exit;
  }

  findEntranceType(coord: number, single: boolean): ConnectionType|undefined {
    for (const exit of this.data.exits ?? []) {
      if (exit.type.startsWith('seamless')) continue;
      const c0 = single && exit.type === 'edge:bottom' && coord >= 0xbf00 ?
          coord + 0x2000 : coord;
      const t0 = (c0 & 0xf0) >> 4 | (c0 & 0xf000) >> 8;
      if (exit.entrance === c0 ||
          exit.exits.includes(t0) || (exit.allowedExits ?? []).includes(t0)) {
        return exit.type;
      }
    }
    return undefined;
  }

  addCustomFlag(defaultValue: boolean) {
    this.flag = defaultValue ? 'custom:true' : 'custom:false';

    // TODO - for now, custom flags are set by default.

    // if (!flagAll) return;
    // for (const loc of this.rom.locations) {
    //   if (!loc.used) continue;
    //   for (const pos of loc.meta.allPos()) {
    //     if (loc.meta.getUid(pos) !== this.uid) continue;
    //     loc.meta.customFlags.set(pos, this.rom.flags.AlwaysTrue);
    //   }
    // }
  }

  /**
   * Checks if this can neighbor that in 'dir' direction.
   * If dir is 0, checks that 'that' is above 'this'.
   * If dir is 1, checks that 'that' is left of 'this'.
   * If dir is 2, checks that 'that' is below 'this'.
   * If dir is 3, checks that 'that' is right of 'this'.
   */
  checkNeighbor(that: Metascreen, dir: number) {
    // check: 0 -> that[vert].get(this) -> this is under that
    const a = dir & 2 ? this : that;
    const b = dir & 2 ? that : this;
    return a.neighbors[dir & 1].get(b);
  }

  /** @param dir 0 to check if that is under this, 1 if that is right of this */
  private _checkNeighbor(that: Metascreen, dir: 0|1): boolean {
    const e1 = this.data.edges;
    const e2 = that.data.edges;
    if (e1 && e2) {
      const opp = dir ^ 2;
      if (e1[opp] !== '*' && e1[opp] === e2[dir]) return true;
    }
    return false;
  }

  toString() {
    return `${hex1(this.sid)} ${this.name}`;
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
const connectionBlockSet = new Set(['|', ':', '-', '=']);

const manualFeatures = new Set<Feature>([
  'arena', 'portoa1', 'portoa2', 'portoa3', 'lake', 'overpass', 'underpass',
  'lighthouse', 'cabin', 'windmill', 'altar', 'pyramid', 'crypt',
]);
const countedFeatures = new Set<Feature>([
  'pit', 'spikes', 'bridge', 'wall', 'ramp', 'whirlpool',
]);

const manualFeatureMask = [...manualFeatures].map(
    f => featureMask[f] as number).reduce((a, b) => a | b);
const countedFeatureMask = [...countedFeatures].map(
    f => featureMask[f] as number).reduce((a, b) => a | b);
