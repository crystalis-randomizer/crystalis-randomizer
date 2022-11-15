import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Rom} from '../rom';
import {Location} from '../rom/location';
import {DefaultMap} from '../util';

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
    const partitions = new DefaultMap<unknown, Location[]>(() => []);
    for (const l of this.rom.locations) {
      // Skip blacked-out locations.
      if (!l.tilePalettes.some(x => x !== 0x9a)) continue;
      partitions.get(l.colorGroup).push(l);
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
}
