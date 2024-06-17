
export class ShuffleData {
    readonly wallMap: Map<string, number>;
    readonly keyItemNames: Map<string, string>;
    readonly tradeInMap: Map<string, string>;
    readonly bossWeaknesses: Map<number, number>;
    readonly gbcCaveExits: Array<number>;
    readonly shopInventories: Map<number, Array<number>>;
    thunderWarp?: number;
    
    constructor(wallMap: Map<string, number>, 
                keyItemNames: Map<string, string>, 
                tradeInMap: Map<string, string>,
                bossWeaknesses: Map<number, number>,
                gbcCaveExits: Array<number>,
                shopInventories: Map<number, Array<number>>,
                thunderWarp?: number) {
        this.wallMap = wallMap;
        this.keyItemNames = keyItemNames;
        this.tradeInMap = tradeInMap;
        this.bossWeaknesses = bossWeaknesses;
        this.gbcCaveExits = gbcCaveExits;
        this.shopInventories = shopInventories;
        this.thunderWarp = thunderWarp;
    }
}

// Everything below this point is hard-coding an example for testing
const wallMap = new Map<string, number>([
  ["Zebu Cave", 1],
  ["East Cave", 2],
  ["Sealed Cave", 3],
  ["Mt Sabre West", 0],
  ["Mt Sabre North", 1],
  ["Waterfall Cave", 2],
  ["Fog Lamp Cave", 3],
  ["Kirisa Plant Cave", 0],
  ["Evil Spirit Island", 1],
  ["Mt Hydra", 2],
  ["Goa Fortress - Entrance", 3],
  ["Goa Fortress Basement", 0],
  ["Goa Fortress - Sabera Item", 1],
  ["Goa Fortress - Sabera Boss", 2],
  ["Goa Fortress - Mado 2", 3],
  ["Goa Fortress - Karmine 5", 0]
]);
const keyItemNames = new Map<string, string>([
  ["Statue of Onyx", "statue A"],
  ["Broken Statue", "statue B"],
  ["Statue of Gold", "statue C"],
  ["Ivory Statue", "statue D"],
  ["Alarm Flute", "flute A"],
  ["Insect Flute", "flute B"],
  ["Flute of Lime", "flute C"],
  ["Shell Flute", "flute D"],
  ["Windmill Key", "key A"],
  ["Key to Stxy", "key B"],
  ["Key to Prison", "key C"],
  ["Fog Lamp", "lamp A"],
  ["Glowing Lamp", "lamp B"],
  ["Bow of Sun", "bow A"],
  ["Bow of Truth", "bow B"],
  ["Bow of Moon", "bow C"]
]);
const tradeInMap = new Map<string, string>([
    ["statue A", "Aryllis"],
    ["lamp A", "Slimed Kensu"],
    ["statue D", "Fisherman"],
    ["Love Pendant", "Akahana"],
    ["Kirisa Plant", "Kensu"]
]);
const bossWeaknesses = new Map<number, number>([
    [0x5e, 4],
    [0xa5, 8],
    [0x68, ~2 & 15],
    [0x7d, ~1 & 15],
    [0x88, ~8 & 15],
    [0x8b, ~4 & 15],
    [0x90, ~2 & 15],
    [0x93, ~1 & 15],
    [0x97, ~8 & 15]
]);
const gbcCaveExits = [2, 0];
const shopInventories = new Map<number, Array<number>>([
    [195, [0x21, 0x1d, 0x24, 0xff]],
    [203, [0x21, 0x1d, 0x24, 0xff]],
    [207, [0x21, 0x1d, 0x24, 0xff]],
    [210, [0x21, 0x1d, 0x24, 0xff]],
    [61, [0x21, 0x1d, 0x24, 0xff]],
    [221, [0x21, 0x1d, 0x24, 0xff]],
    [229, [0x21, 0x1d, 0x24, 0xff]],
    [235, [0x21, 0x1d, 0x24, 0xff]],
    [190, [0x21, 0x1d, 0x24, 0xff]],
    [246, [0x21, 0x1d, 0x24, 0xff]],
    [249, [0x21, 0x1d, 0x24, 0xff]]
]);
const thunderWarp = 28;
export const predetermined: ShuffleData = new ShuffleData(wallMap, keyItemNames, tradeInMap, bossWeaknesses, gbcCaveExits, shopInventories, thunderWarp);