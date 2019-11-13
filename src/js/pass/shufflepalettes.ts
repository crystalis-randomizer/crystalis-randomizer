import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';
import {paletteTypes} from '../rom/tileset.js';
import {seq} from '../rom/util.js';
import { DefaultMap } from '../util.js';

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

    // function eq(a: Location, b: Location): boolean {
    //   return a.tilePalettes[0] === b.tilePalettes[0] &&
    //       a.tilePalettes[1] === b.tilePalettes[1] &&
    //       a.tilePalettes[2] === b.tilePalettes[2] &&
    //       // a.tilePatterns[0] === b.tilePatterns[0] &&
    //       // a.tilePatterns[1] === b.tilePatterns[1] &&
    //       // a.tileset === b.tileset &&
    //       a.tileEffects === b.tileEffects;
    // }

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

    const partitions = new DefaultMap<unknown, Location[]>(() => []);
    for (const l of this.rom.locations) {
      partitions.get(l.data.palette).push(l);
    }

    const pal = [new Map<number, Set<number>>(), new Map<number, Set<number>>()];

    // fill `pal` with all palettes, grouped by pattern.
    for (const part of partitions.values()) {
      for (const l of part) {
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            // TODO - check that patterns and palettes actually USED?
            let set = pal[i].get(l.tilePatterns[j]);
            if (!set) pal[i].set(l.tilePatterns[j], set = new Set());
            set.add(l.tilePalettes[i]);
          }
        }
      }
    }

    // reset palettes
    for (const part of partitions.values()) {
      const l = part[0];
      const s = [new Set<number>(), new Set<number>()];
      for (let i = 0; i < 2; i++) {
        s[i] = new Set<number>([...pal[i].get(l.tilePatterns[0])!,
                                ...pal[i].get(l.tilePatterns[1])!,]);
      }

      const p0 = this.random.pick([...s[0]]);
      const p1 = this.random.pick([...s[1]]);
      for (const loc of part) {
        loc.tilePalettes[0] = p0;
        loc.tilePalettes[1] = p1;
      }
    }
  }

  // TODO - this algorithm is much less satisfying.
  shuffleBackgrounds2() {
    if (!this.flags.shuffleSpritePalettes()) return;

    function eq(a: Location, b: Location): boolean {
      return a.tilePalettes[0] === b.tilePalettes[0] &&
          a.tilePalettes[1] === b.tilePalettes[1] &&
          a.tilePalettes[2] === b.tilePalettes[2];
          // a.tilePatterns[0] === b.tilePatterns[0] &&
          // a.tilePatterns[1] === b.tilePatterns[1] &&
          // a.tileset === b.tileset &&
          // a.tileEffects === b.tileEffects;
    }
    const [] = [eq];

    // const palettes = [
    //   0x01, 0x07, 

    // // Key: (tileId/screenId) << 8 | tileset
    // // Value: Set<~pattern | palette>
    // const tileCache = new Map<number, Set<number>>();
    // const screenCache = new Map<number, Set<number>>();

    // function screenData(screen: number, tileset: number) {

    // }

    const paletteSets = [new Set<number>(), new Set<number>()];

    for (const loc of this.rom.locations) {
      if (!loc.used) continue;
      const tileset = this.rom.tilesets[(loc.tileset & 0x7f) >> 2];
      const types = paletteTypes(tileset.id, loc.id);
      for (let i = 0; i < 3; i++) {
        for (let i = 0; i < (types[i] as number); i++) {
          paletteSets[i].add(loc.tilePalettes[i]);
        }
      }
    }

    const partitions: any[] = []; // this.rom.locations.partition(x => x, eq, true);

    const palettes = paletteSets.map(s => [...s]);
    for (const part of partitions) {
      const rep = part[1]; // representative location
      const repTypes: number[] = paletteTypes(rep.tileset, rep.id) as any;
      for (let attempt = 0; attempt < 1000; attempt++) {
        const pals = seq(3, i => !repTypes[i] ? rep.tilePalettes[i] :
                         this.random.pick(palettes[repTypes[i] - 1]));
        const ps = pals.map(p => this.rom.palettes[p].colors);
        let found = true;
        for (const loc of part[0]) {
          const [,,, validator] = paletteTypes(loc.tileset, loc.id);
          if (validator && !validator(ps[0], ps[1], ps[2])) {
            found = false;
            break;
          }
        }
        if (found) {
          for (const loc of part[0]) {
            loc.tilePalettes = [pals[0], pals[1], pals[2]];
          }
        }
      }
    }
  }
}
