import {FlagSet} from './flagset';

export class ShuffleData {
  readonly wallMap: Map<string, number>;
  readonly keyItemNames: Map<string, string>;
  readonly tradeInMap: Map<string, string>;
  readonly rageId: number;
  readonly tornelId: number;
  readonly bossWeaknesses: Map<number, number>;
  readonly gbcCaveExits: Array<number>;
  readonly shopInventories: Map<number, Array<number>>;
  readonly thunderWarp: number;
  readonly wildwarps: Array<number>;
  readonly goaFloors: Array<[number, boolean]>;
  readonly lime_hint: string;
  readonly areaConnections: Map<string, string>;
  readonly houseConnections: Map<string, string>;
  readonly fromArchipelago: boolean;
    
  constructor(wallMap: Map<string, number>, 
              keyItemNames: Map<string, string>, 
              tradeInMap: Map<string, string>,
              rageId: number,
              tornelId: number,
              bossWeaknesses: Map<number, number>,
              gbcCaveExits: Array<number>,
              shopInventories: Map<number, Array<number>>,
              thunderWarp: number,
              wildwarps: Array<number>,
              goaFloors: Array<[number, boolean]>,
              lime_hint: string,
              areaConnections: Map<string, string>,
              houseConnections: Map<string, string>,
              fromArchipelago: boolean) {
    this.wallMap = wallMap;
    this.keyItemNames = keyItemNames;
    this.tradeInMap = tradeInMap;
    this.rageId = rageId;
    this.tornelId = tornelId;
    this.bossWeaknesses = bossWeaknesses;
    this.gbcCaveExits = gbcCaveExits;
    this.shopInventories = shopInventories;
    this.thunderWarp = thunderWarp;
    this.wildwarps = wildwarps;
    this.goaFloors = goaFloors;
    this.lime_hint = lime_hint;
    this.areaConnections = areaConnections;
    this.houseConnections = houseConnections;
    this.fromArchipelago = fromArchipelago;
  }
}

export function parseAPCrysJSON(patchDataJson: string, apJson?: string): [string, FlagSet, ShuffleData]  {
  const patchData = JSON.parse(patchDataJson);
  const shuffleData = patchData["shuffle_data"];
  // Need to clean up objects to turn them into maps
  let wallMap = new Map<string, number>(Object.entries(shuffleData['wall_map']));
  let keyItemNames = new Map<string, string>(Object.entries(shuffleData['key_item_names']));
  let tradeInMap = new Map<string, string>(Object.entries(shuffleData['trade_in_map']));
  let bossWeaknesses = new Map<number, number>();
  for (const [boss, weakness] of Object.entries(shuffleData['boss_weaknesses'])) {
    bossWeaknesses.set(Number(boss), Number(weakness));
  }
  let shopInventories = new Map<number, Array<number>>();
  for (const [shop, inventory] of Object.entries(shuffleData['shop_inventories'])) {
    shopInventories.set(Number(shop), Object.values(inventory!));
  }
  let areaConnections = new Map<string, string>(Object.entries(shuffleData['area_connections']));
  let houseConnections = new Map<string, string>(Object.entries(shuffleData['house_connections']));
  let flags = new FlagSet(patchData['flag_string']);
  let seed = String(patchData['seed']);
  let predetermined = new ShuffleData(wallMap, keyItemNames, tradeInMap, 
                                      shuffleData['rage_trade'], shuffleData['tornel_trade'], bossWeaknesses, 
                                      shuffleData['gbc_cave_exits'], shopInventories, shuffleData['thunder_warp'], 
                                      shuffleData['wildwarps'], shuffleData['goa_floors'], patchData['lime_hint'],
                                      areaConnections, houseConnections, apJson != undefined);
  return [seed, flags, predetermined];
}