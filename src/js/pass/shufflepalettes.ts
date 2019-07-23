import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';

// Shuffle the palettes.
export function shufflePalettes(rom: Rom, flags: FlagSet, random: Random) {
  new Shuffle(rom, flags, random).shuffle();
}

class Shuffle {
  constructor(readonly rom: Rom,
              readonly flags: FlagSet,
              readonly random: Random) {}

  shuffle() {
    this.shuffleBackgrounds();
  }

  shuffleBackgrounds() {
    if (!this.flags.shuffleSpritePalettes()) return;

    function eq(a: Location, b: Location): boolean {
      return a.tilePalettes[0] === b.tilePalettes[0] &&
          a.tilePalettes[1] === b.tilePalettes[1] &&
          a.tilePalettes[2] === b.tilePalettes[2] &&
          // a.tilePatterns[0] === b.tilePatterns[0] &&
          // a.tilePatterns[1] === b.tilePatterns[1] &&
          // a.tileset === b.tileset &&
          a.tileEffects === b.tileEffects;
    }

    // const palettes = [
    //   0x01, 0x07, 

    // // Key: (tileId/screenId) << 8 | tileset
    // // Value: Set<~pattern | palette>
    // const tileCache = new Map<number, Set<number>>();
    // const screenCache = new Map<number, Set<number>>();

    // function screenData(screen: number, tileset: number) {

    // }

    // for (const loc of rom.locations) {
    //   if (!loc.used) continue;
    //   const tileset = rom.tilesets[(loc.tileset & 0x7f) >> 2];
    //   for (const screen of loc.allScreens()) {
    //     const graphics = new Set();
    //     for (const tile of screen.tiles) {
    //       const tileId = tile << 8 | tileset.id;
    //       const prev = tileCache.get(tileId);
    //       if (prev) {
    //         for (const g of prev) graphics.add(g);
    //         continue;
    //       }
    //       const set = new Set<number>();
    //       for (const quad of tileset.tiles) {
    //         set.add(~quad[tile]);
    //         graphics.add(~quad[tile]);
    //       }
    //       set.add(tileset.attrs[tile]);
    //       graphics.add(tileset.attrs[tile]);
    //       tileCache.set(tileId, set);
    //     }
    //   }
    // }

    const partitions = this.rom.locations.partition(x => x, eq, true);

    const pal = [new Map<number, Set<number>>(), new Map<number, Set<number>>()];

    for (const part of partitions) {
      const l = part[1];
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {

          // TODO - check that patterns and palettes actually USED?



          let set = pal[i].get(l.tilePatterns[j]);
          if (!set) pal[i].set(l.tilePatterns[j], set = new Set());
          set.add(l.tilePalettes[i]);
        }
      }
    }

    for (const part of partitions) {
      const l = part[1];
      const s = [new Set<number>(), new Set<number>()];
      for (let i = 0; i < 2; i++) {
        s[i] = new Set<number>([...pal[i].get(l.tilePatterns[0])!,
                                ...pal[i].get(l.tilePatterns[1])!,]);
      }

      const p0 = this.random.pick([...s[0]]);
      const p1 = this.random.pick([...s[1]]);
      for (const loc of part[0]) {
        loc.tilePalettes[0] = p0;
        loc.tilePalettes[1] = p1;
      }
    }



  }
}
