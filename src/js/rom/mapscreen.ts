import {Screen} from './screen.js';
import {TileEffects} from './tileeffects.js';
import { UnionFind } from '../unionfind.js';
import { Tileset } from './tileset.js';

export class MapScreen {

  readonly partition = new Map<number, number>();
  readonly partitions: ReadonlyArray<Set<number>> = [];

  constructor(readonly screen: Screen, readonly tileset: Tileset) {
    const graph = new UnionFind<number>(); // all tiles
    const effects = tileset.effects().effects;
    const scr = screen.id << 8;
    function walkable(tile: number): boolean {
      const override = OVERRIDE.get(tile | scr);
      if (override != null) return override;
      let mt = screen.tiles[tile];
      let effect = effects[mt];
      if (mt < 0x20 && effect & TileEffects.ALTERNATIVE) {
        effect = effects[mt = tileset.alternates[mt]];
      }
      // NOTE: this includes pits
      return !(effect & (TileEffects.NO_WALK | TileEffects.IMPASSIBLE));
    }
    for (let y = 0; y < 0xf; y++) {
      for (let x = 0; x < 0x10; x++) {
        const t = y << 4 | x;
        if (!walkable(t)) continue;
        if (y && walkable(t - 16)) graph.union([t, t - 16]);
        if (x && walkable(t - 1)) graph.union([t, t - 1]);
      }
    }
    // TODO - look at perimeter!
  }

}

// override the walkable tile mask for the bottom of some screens
const BOTTOM = new Map<number, number>([
  [0x72, 0b0000111111110000], // ignore gargoyles
  [0x9b, 0b0000001111000000], // dead end
  [0xfd, 0b0000111111110000], // ignore stairs
]);

const TOP = new Map<number, number>([
  [0x72, 0b0000111111110000], // ignore gargoyles
  [0x9b, 0b0000001111000000], // dead end
]);

// pretend "walkable" tiles on dead end screens
const OVERRIDE = new Map<number, boolean>([
  // help match narrow door ?
  [0x9ae6, true],
  [0x9ae9, true],
  // vertical dead end
  [0x9be6, true],
  [0x9be7, true],
  [0x9be8, true],
  [0x9be9, true],
]);
