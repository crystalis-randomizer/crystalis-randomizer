import { CaveShuffle } from './cave';
import { Result, OK } from './maze';
import { Rom } from '../rom';
import { Random } from '../random';
import { GridCoord, E, N, S, W } from './grid';
import { ScreenFix } from '../rom/screenfix';
import { DefaultMap } from '../util';
import { Metascreen } from '../rom/metascreen';
import { Metalocation, Pos } from '../rom/metalocation';

// TODO - needs more loops...

export class LabyrinthShuffle extends CaveShuffle {

  // meta.traverse positions for important features.
  stair!: number;
  arena!: number;
  reachable?: number;

  initialFill(): Result<void> {
    const target = this.size + 3; // + this.random.nextInt(4);
    const stair =
        (this.random.nextInt(this.w) << 4 |
         (this.h - 1) << 12 | 0x808) as GridCoord;
    if (!this.grid.isBorder(W(stair))) this.fixed.add(W(stair, 2));
    if (!this.grid.isBorder(E(stair))) this.fixed.add(E(stair, 2));
    this.grid.set(stair, '>');
    this.fixed.add(stair);
    this.grid.set(N(stair), 'w');
    this.fixed.add(N(stair));
    this.fixed.add(W(stair));
    this.fixed.add(E(stair));

    const arena = (this.random.nextInt(this.w) << 4 | 0x808) as GridCoord;
    const down = S(arena, 2);
    this.grid.set(arena, '<');
    this.fixed.add(arena);
    this.grid.set(S(arena), 'w');
    this.fixed.add(S(arena));
    this.grid.set(down, 'w');
    this.fixed.add(down);
    this.grid.set(S(down), 'w');
    this.fixed.add(S(down));
    this.fixed.add(W(down));
    this.fixed.add(E(down));

    // TODO - can stair be not on bottom?  arena not on top?

    if (!this.tryConnect(N(stair, 2), S(down, 2), 'w', 10)) {
      return {ok: false, fail: `initial connect`};
    }
    while (this.count < target) {
      if (!this.tryAddLoop('w', 10)) return {ok: false, fail: `add loops`};
    }
    return OK;
  }

  refine() { return OK; }
  refineEdges() { return true; }
  addArenas() { return true; }
  addStairs() { return OK; }

  refineMetascreens(meta: Metalocation): Result<void> {
console.log(meta.show());
    // 1. replace all the (non-fixed) wideHallNS with either stairs or pairs
    //    of dead ends - no same vertical neighbors
    // 2. start adding blocks
    for (let y = 0; y < meta.height; y++) {
      for (let x = 0; x < meta.width; x++) {
        const pos = y << 4 | x;
        const scr = meta.get(pos);
        const edge = scr.edgeIndex('w');
        if (scr.hasFeature('arena')) {
          this.arena = pos + 0x10 << 8 | 1;
        } else if (edge === 5) {
          if (pos < 16 || !meta.get(pos - 16).hasFeature('arena')) {
            meta.set(pos, meta.rom.metascreens.goaWideHallNS_stairs);
            const c = ((pos << 8 | pos << 4) & 0xf0f0 | 0x808) as GridCoord;
            this.grid.set(c, 'H');
          }
        } else if (edge === 1) {
          this.stair = pos << 8 | 2;
        // } else if (scr.hasFeature('arena')) {
        //   meta.set(pos, meta.rom.metascreens.goaWideHallNS_stairs);
        }
      }
    }
    // Make sure everything is accessible
    this.reachable = undefined;
    if (!this.checkMeta(meta)) return {ok: false, fail: `initial meta check`};
console.log(meta.show());
    // Now that a baseline has been established, try adding various blocks,
    // including dead-ends out of stair hallways - ...

    const deadEnd = this.orig.rom.metascreens.goaWideHallNS_deadEnd;
    for (let x = 0; x < meta.width; x++) {
      for (let y = 0; y < meta.height; y++) {
        // const c = ((pos << 8 | pos << 4) & 0xf0f0) as GridCoord;
        //` let tile = this.extract(this.grid, c);
        const c = (y << 12 | x << 4 | 0x808) as GridCoord;
        let len = 0;
        while (y + len < meta.height &&
               this.grid.get(c + len * 0x1000 as GridCoord) === 'H') {
          len++;
        }
        // alternate dead ends and stairs
        if (!len) continue;
        const opts: Array<Map<Pos, Metascreen>> = [new Map(), new Map()];
        for (let i = 0; i < len; i++) {
          opts[i & 1].set((y + i) << 4 | x, deadEnd);
        }
        let found = false;
        for (const opt of this.random.ishuffle(opts)) {
          if (!opt.size) {
            found = true;
            continue;
          }
          if (!this.checkMeta(meta, opt)) continue;
          for (const [pos, s] of opt) {
            meta.set(pos, s);
            this.grid.set(c + 0x1000 * ((pos >> 4) - y) as GridCoord, '=');
          }
          found = true;
          break;
        }
        if (!found) return {ok: false, fail: `could not rectify hallway`};
        y += len;

//         if (this.grid.get(c) === 'H') {
//           // try to set to a dead end.
//         if (this.tryMeta(meta, pos, [deadEnd])) {
//           this.grid.set(c, '=');
//         } else if (this.grid.get(c - 0x1000 as GridCoord) === 'H') {
// //debugger;
//           return {ok: false, fail: `could not break up stair halls`};
//         }
      }
      // const blocked = this.orig.tileset.withMod(tile, 'block');
      // if (blocked.length &&
      //     this.tryMeta(meta, pos, this.random.shuffle(blocked))) {
      //   continue;
      // }
    }

    // TODO - convert adjacent stairs to dead ends
    return super.refineMetascreens(meta);
  }

  checkMeta(meta: Metalocation, repl?: Map<Pos, Metascreen>): boolean {
    const opts = repl ? {with: repl} : {};
    const parts = meta.traverse(opts);
    const part = parts.get(this.stair);
    if (part !== parts.get(this.arena)) {
      console.log(`stair not connected to arena\n${meta.show()}`);
      //debugger;
      return false; //{ok: false, fail: 'stair not connected to arena'};
    }
    if (this.reachable == null) {
      if (part && part.size < parts.size * 0.95) {
        console.log(`too small`);
        return false;
      }
      this.reachable = part?.size;
      return true;
    } else {
      if (part?.size! > this.reachable * 0.95) {
        return true;
      }
      return false;// {ok: false, fail: `refineMeta: cut off too much`};
    }    
  }

}

export function fixLabyrinthScreens(rom: Rom, random: Random) {
  // There are four tilesets that all share lots of screens, so it's tough
  // to find an eligible alternatable tile.  It turns out that 19 and 1b are
  // not used in any of the relevant screens (all but normal cave) for
  // alternating, so we free up those tiles by moving them into various
  // free tiles (2b and ba in pyramid and fortress, 17 and 18 in ice cave
  // since this one is used for switching w/ 54 and 58).

  // PLAN:
  // tileset a4,8c: move 19,1b -> 2b,ba
  // tileset a8:    move 19,1b -> 17,18
  // tileset 88:    move c5 -> 19,1b
  //     17,18 used in 88, which shares a lot with a8, but
  //     no 88 maps have any 19,1b so they'll never see conflicting 17,18
  // change the 88 users of e1,e2 (hydra) to tileset a8 with pat1=2a to avoid
  // conflict?  the cost is one wall that doesn't fit in quite as well.
  // This frees up 19,1b to absorb c6/c4 with alts of c5
  // PROBLEM:
  // Ice cave moves its flaggable 19/1b to 17/18 to free up space for the
  // removable wall, but 17/18 is used in river cave for vertical bridge.
  // This is the only situation where 17/18 and 19/1b conflict.  So we
  // indirect an extra time, copy 17/18 into 19/1b on tilesets 88,8c,a4
  // and then we can put the new wall tiles in 17/18 everywhere.
  const {metatilesets: {cave, fortress, iceCave, labyrinth, pyramid}} = rom;
  rom.metascreens.registerFix(ScreenFix.LabyrinthParapets, 1);
  // Fix the tiles
  {
    // First patch a few nonesense alternates to get around our safety check
    // for (const ts of [pyramid, labyrinth, iceCave]) {
    //   ts.tileset.alternates[0x19] = 0x19;
    //   ts.tileset.alternates[0x1b] = 0x1b;
    // }
    // Free up 19 and 1b in the tilesets that need it.
    for (const ts of [labyrinth, pyramid]) {
      ts.getTile(0x2b).copyFrom(0x19).replaceIn(...ts);
      ts.getTile(0xba).copyFrom(0x1b).replaceIn(...ts);
    }

    // Free up 17/18 by copying to 19/1b that we just freed.
    for (const ts of [fortress, labyrinth, pyramid, cave]) {
      ts.getTile(0x19).copyFrom(0x17).replaceIn(...ts);
      ts.getTile(0x1b).copyFrom(0x18).replaceIn(...ts);
    }

    // Fill in c5's graphics for ordinary caves to clean up graphical glitches
    for (const ts of [iceCave, cave, pyramid]) {
      ts.getTile(0x17).copyFrom(0xc5);
      ts.getTile(0x18).copyFrom(0xc5);
    }

    // Now that space has been allocated, fill it.
    labyrinth.getTile(0x17).copyFrom(0xc6).setAlternative(0xc5);
    labyrinth.getTile(0x18).copyFrom(0xc4).setAlternative(0xc5);
  }
  // Fix the screens
  const bySid = new DefaultMap<number, Metascreen[]>(() => []);
  for (const s of rom.metatilesets.labyrinth) {
    bySid.get(s.sid).push(s);
  }
  for (const [sid, screens] of bySid) {
    // First see if the default screen has a wall that may be removed
    const screen = rom.screens[sid];
    const remove = screens.map(s => s.data.tilesets.labyrinth?.removeWall);
    const [removed, ...rest] = new Set(remove.filter(w => w != null));
    if (removed != null) {
      screen.set2d(removed, [[0xc5, 0xc5], [0xd0, 0xc5]]);
      if (rest.length) throw new Error(`bad remove`);
      for (let i = 0; i < remove.length; i++) {
        if (remove[i] == null) {
          screens[i].data.tilesets.labyrinth!.addWall = [removed];
        }
      }
    }
    if (screens.length < 2) continue;
    // Now if there's two with adds, pick one to delete.
    if (screens.length > 2) {
      const deleted =
          random.pick(screens.filter(s => s.data.tilesets.labyrinth?.addWall));
      screens.splice(screens.indexOf(deleted), 1);
      deleted.remove();
    }
    // Figure out which screen needs to get a wall added.
    for (const s of screens) {
      const add = s.data.tilesets.labyrinth?.addWall;
      if (add != null) {
        s.data.mod = 'block';
        for (const w of add) screen.set2d(w, [[0x17, 0x17], [0x18, 0x18]]);
      } else {
        s.flag = 'always';
      }
    }
  }
}
