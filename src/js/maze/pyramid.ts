import { Location } from '../rom/location';
import { Random } from '../random';
import { Rom } from '../rom';
import { Metalocation } from '../rom/metalocation';
import { MazeShuffle } from './maze';

// TODO - we could do a bit more map gen: randomize which hall has the inner
// stair (or make more of them), add some dead ends instead of stairs, add
// extra branches on the edge/corner, etc.

export class PyramidShuffle implements MazeShuffle {

  meta: Metalocation|undefined;

  constructor(readonly location: Location) {}

  // This is a different style of shuffle.  
  shuffle(random: Random) {
    if (this.meta) throw new Error(`impossible`);
    const meta = this.location.meta;
    moveInternalStair(meta, random);
    // 50% chance of swapping the exit to a downstair.
    if (random.nextInt(2)) invertPyramidExit(this.location.rom);
    // Collect all the exits, grouped by direction.
    const up = [...meta.exits()].filter(e => e[1] === 'stair:up');
    const dn = [...meta.exits()].filter(e => e[1] === 'stair:down');
    random.shuffle(up);
    random.shuffle(dn);
    // Find exits that go anywhere and swap them.
    for (const e of [...meta.exits()]) {
      if ((e[2][0] >>> 8) !== this.location.id) {
        // This is a real exit, so pop it out of the relevant list
        const next = (e[1] === 'stair:up' ? up : dn).pop()!;
        meta.setExit(next[0], next[1], e[2]);
      }
    }
    if (up.length !== dn.length) throw new Error(`length mismatch`);
    const dn2 = random.shuffle([...dn]);
    // make sure dn2 is actually a derangement of dn (prevent closing out the
    // chest room as inaccessible).
    for (let i = 0; i < dn.length; i++) {
      if (dn[i] === dn2[i]) {
        random.shuffle(dn2);
        i = -1;
      }
    }
    // zip the exits together
    const self = this.location.id << 8;
    for (let i = 0; i < up.length; i++) {
      meta.setExitOneWay(up[i][0], up[i][1], [self | dn[i][0], dn[i][1]]);
      meta.setExitOneWay(dn2[i][0], dn2[i][1], [self | up[i][0], up[i][1]]);
    }
    this.meta = meta;
  }

  finish() {}
}

function moveInternalStair(meta: Metalocation, random: Random) {
  // y will be either 6 or 7, x will be [1..5] (or 2..4)
  const y = random.nextInt(2) + 6;
  const x = random.nextInt(3) + 2; // (5) + 1
  if (y === 7 && x === 3) return;
  const {branchNWSE, branchNWE, branchWSE, branchNWE_upStair,
         deadEndW, deadEndE} = meta.rom.metascreens;
  const pos = y << 4 | x;
  let bottom = branchWSE;
  if (y === 7 && x === 1) bottom = deadEndE;
  if (y === 7 && x === 5) bottom = deadEndW;
  meta.set2d(0x63, [[branchNWSE], [branchNWSE], [branchNWSE]]);
  meta.set2d(pos - 16, [[branchNWE], [branchNWE_upStair], [bottom]]);
  meta.moveExit(0x73, pos);
}

function invertPyramidExit(rom: Rom) {
  // Need to do a few minor tweaks to two maps.
  const draygon = rom.locations.Pyramid_Draygon.meta;
  const main = rom.locations.Pyramid_Main.meta;

  // Change a few screens.
  const {metascreens: {hallSE, deadEndW_downStair, wideHallNE, wideHallNW,
                       fortressArena_through, deadEndS_stairs}} = rom;
  draygon.width = 2;
  // TODO - if we have screens available to make this smoother, use them.
  draygon.set2d(0x00, [[null, deadEndS_stairs],
                       [null, fortressArena_through],
                       [wideHallNE, wideHallNW]]);
  draygon.moveExit(0x20, 0x01);

  main.set2d(0x03, [[hallSE, deadEndW_downStair]]);
  main.moveExit(0x03, 0x04);

  main.attach(0x04, draygon, 0x01); // will automatically swap out the rest
}
