import { Monogrid } from './monogrid';
import { Metalocation, Pos } from '../rom/metalocation';
import { CaveShuffle } from './cave';
import { OK, Result } from './maze';
import { seq } from '../rom/util';
import { Metascreen } from '../rom/metascreen';
import { Rom } from '../rom';
import { ScreenFix } from '../rom/screenfix';

export class SwampShuffle extends CaveShuffle {

  build(): Result<void> {
    const {h, w} = this;
    const rom = this.orig.rom;
    const g = new Monogrid(h, w);
    g.fill();
    // Add arena (TODO - consider condition (this.random.nextInt(4))
    const arenaY = h * w < 28 ? 0 : this.random.nextInt(h - 1);
    const arenaX = this.random.nextInt(w);
    const fixed = new Set<number>();
    function del(y: number, x: number) {
      g.delete2(y, x);
      fixed.add(y * g.w + x);
    }
    function isDoor(type: string) {
      return !type.startsWith('edge');
    }
    fixed.add(arenaY * g.w + arenaX);
    if (arenaX) del(arenaY, arenaX - 1);
    if (arenaX < g.w - 1) del(arenaY, arenaX + 1);
    if (arenaY) {
      del(arenaY - 1, arenaX);
      if (arenaX) del(arenaY - 1, arenaX - 1);
      if (arenaX < g.w - 1) del(arenaY - 1, arenaX + 1);
    }
    for (const i of fixed) {
      g.fixed.add(i);
    }

    // Add edge exits.
    const edgePos = new Set<Pos>();
    for (let dir = 0; dir < 4; dir++) {
      const max = dir & 1 ? h : w;
      const nums = this.random.shuffle(seq(max));
      const opp = dir & 2 ? max : 0;
      let count = this.params.edges?.[dir] ?? 0;
      while (count && nums.length) {
        const y = dir & 1 ? nums.pop()! : opp;
        const x = dir & 1 ? opp : nums.pop()!;
        const i = y * g.w + x;
        if (!g.data[i] || g.fixed.has(i)) continue;
        g.addEdge(y, x, dir);
        edgePos.add(y << 4 | x);
        count--;
      }
      if (count) return {ok: false, fail: `could not add all edges: ${dir} ${count}\n${g.toGrid('c').show()}\n${g.data}`};
    }
    //console.log(g.toGrid('c').show()); // TODO - why is edge exit disappearing?!?

    // Delete edges
    // NOTE: may want multiple passes because earlier deletes
    // could enable later deletes?
    // Shoot for deleting anywhere from 0.4*h*w to 0.55*h*w of the edges.
    let deleted = 0;
    const target = g.h * g.w * (this.random.next() * 0.15 + 0.4);
    for (const posDir of this.random.ishuffle(seq(g.data.length << 2))) {
      const i = posDir >>> 2;
      const dir = posDir & 3;
      if (!g.isBorder(i, dir) && g.deleteEdge(i, dir)) {
        if (++deleted >= target) break;
      }
    }

    // Consolidate.  TODO - recognize correct count!
    // NOTE: rom.moveScreens() could have been used to move the swamp to
    // a more free plane.  If so, we don't need to consolidate at all
    // and all the screens' sids will be positive.  Find out how many
    // non-empty, non-arena screens in the tileset have different positive
    // or negative IDs, and group the non-door ones by edge profile.
    const allocd = new Set<number>();
    const unallocd = new Set<number>();
    const plain: Metascreen[] = [];
    const doors: Metascreen[] = [];
    let arena: Metascreen|undefined;
    for (const s of this.orig.tileset) {
      if (s.hasFeature('arena')) {
        arena = s;
        continue;
      } else if (s.hasFeature('empty')) {
        plain[0] = s;
        continue;
      }
      const edgeIndex = s.edgeIndex('s');
      if (edgeIndex == null) throw new Error(`bad edges`);
      const hasDoor = s.data.exits?.some(e => isDoor(e.type));
      (hasDoor ? doors : plain)[edgeIndex] = s;
      (s.sid < 0 ? unallocd : allocd).add(s.sid);
    }
    if (!arena) throw new Error(`never found arena`);

    const consolidate = g.consolidate(this.random, allocd.size);
    const used = new Set(consolidate.map(e => plain[e].sid));
    if (!used.size) return {ok: false, fail: `consolidate failed`};
    const newlyUsed = [...unallocd].filter(e => used.has(e));
    const newlyUnused = [...allocd].filter(e => !used.has(e));
    if (newlyUsed.length > newlyUnused.length) throw new Error(`out of space`);

    if (newlyUsed.length) {
      // Find an available sid to swap out with.  Cycle everything through.
      let unusedId = -1;
      while (rom.metascreens.getById(unusedId).length) unusedId--;
      const origUnusedId = unusedId;
      for (let i = 0; i < newlyUsed.length; i++) {
        rom.metascreens.renumber(newlyUnused[i], unusedId);
        rom.metascreens.renumber(newlyUsed[i], newlyUnused[i]);
        unusedId = newlyUsed[i];
      }
      rom.metascreens.renumber(origUnusedId, newlyUsed[newlyUsed.length - 1]);
    }

    const meta = new Metalocation(this.orig.id, this.orig.tileset, h, w);
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const isArena = y === arenaY && x === arenaX;
        meta.set(y << 4 | x, isArena ? arena : plain[g.data[y * g.w + x]]);
      }
    }

    // Pick a location for the door(s).
    let doorCount = [...this.orig.exits()].filter(e => isDoor(e[1])).length;
    for (const pos of this.random.ishuffle(meta.allPos())) {
      if (!doorCount) break;
      if (edgePos.has(pos)) continue;
      const x = pos & 0xf;
      const y = pos >>> 4;
      const door = doors[g.data[y * g.w + x]];
      if (!door) continue;
      meta.set(pos, door);
      doorCount--;
    }
    if (doorCount) return {ok: false, fail: `could not place all doors`};
    return OK;
  }
}

/** Apply the ScreenFix.SwampDoors. */
export function addSwampDoors(rom: Rom) {
  const {swamp} = rom.metatilesets;
  const $ = rom.metascreens;

  // Make a handful of removable tiles - defaults to CLOSED!
  const tiles = [
    [0x03, 0xda, 0xac],
    [0x04, 0xe4, 0xaa],
    [0x05, 0xe5, 0xaa],
    [0x06, 0xe6, 0xaa],
    [0x07, 0xe7, 0xaa],
    [0x08, 0xf0, 0xaa],
    [0x09, 0xf1, 0xaa],
    [0x0a, 0xf2, 0xaa],
    [0x0b, 0xf3, 0xaa],
    [0x0c, 0xdc, 0xaa],
    [0x0d, 0xdd, 0xaa],
  ];
  //const screens = [...swamp].filter(s => s.sid >= 0);
  for (const [tile, src, alt] of tiles) {
    swamp.getTile(tile).copyFrom(src).setAlternative(alt);
      //.replaceIn(...screens);
  }

  // Fix a few screens.
  $.swampEmpty.screen.set2d(0x00, [ // add left column
    [0xa8, 0xcc], // 0
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xd2, 0xcc], // 9
    [0xd2, 0xcc],
    [0xd2, 0xcc],
    [0xd2, 0xe2], // c
    [0xe2, 0xc8], // d
  ]);

  $.swampE.screen.set2d(0x4c, [ // add optional door
    [0x08, 0x09], // f0 f1
    [0x0c, 0x0b], // dc f3
    [0x03, 0x03], // da da
  ]);

  $.swampWSE.screen.set2d(0x25, [ // add an optional door
    [    ,     , 0x04], //       e4
    [0x08, 0x09, 0x05], // f0 f1 e5
    [    , 0x0a, 0x06], //    f2 e6
    [    , 0x0b, 0x07], //    f3 e7
    [    , 0x03, 0x03], //    da da
  ]);

  $.swampW.screen.set2d(0x24, [ // add optional door
    [0x04      ], // e4
    [          ], //
    [0x06      ], // e6
    [0x07, 0x0d], // e7 dd
    [0x03, 0x03], // da da
  ]);

  $.swampWS.screen.set2d(0x47, [ // existing door optional
    [0x08, 0x09], // f0 f1
    [0x0c, 0x0b], // dc f3
    [0x03, 0x03], // da da
  ]);

  $.registerFix(ScreenFix.SwampDoors, 0 /* unused seed */);
}
