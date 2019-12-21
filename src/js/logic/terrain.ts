import {Dir} from './dir.js';
import {Requirement} from './requirement.js';
import {iters} from '../util.js';
import {memoize, strcmp} from '../util.js';
import {Mutable} from '../rom/util.js';
import { Rom } from '../rom.js';

export class Terrain {
  enter(): Requirement { return Requirement.OPEN; }
  exit(dir: Dir): Requirement { return Requirement.OPEN; }

  // Built-in terrain bits
  // 0x01 => pit
  static readonly FLY = 0x02;
  static readonly BLOCKED = 0x04;
  // 0x08 => flag alternate
  // 0x10 => behind
  static readonly SLOPE = 0x20;
  // 0x40 => slow
  // 0x80 => pain
  static readonly BITS = 0x26;

  // Custom terrain bits
  static readonly SWAMP = 0x100;
  static readonly BARRIER = 0x200; // shooting statues
  // slope 0..5 => no requirements
  static readonly SLOPE8 = 0x400; // slope 6..8
  static readonly SLOPE9 = 0x800; // slopt 9
  // slope 10+ => flight only
  static readonly DOLPHIN = 0x1000;
}

export class Terrains {

  // Aggressive memoization prevents instantiating the same terrain twice.
  // This allows reference equality to tell when two terrains are the same.
  private readonly tiles =
      new DefaultMap<number, Terrain>(effects => makeTile(this.rom, effects));
  private readonly bosses =
      new DefaultMap<number, Terrain>(flag => new BossTerrain(flag));
  private readonly statues = new Map<string, Terrain>();
  private readonly flags =
      new DefaultMap<Terrain, DefaultMap<number, DefaultMap<Terrain, Terrain>>>(
          (base) => new DefaultMap(
              (flag) => new DefaultMap(
                  (alt) => new FlagTerrain(base, flag, alt))));
  private readonly meets =
      new DefaultMap<Terrain, DefaultMap<Terrain, Terrain>>(
          (left) => new DefaultMap((right) => new MeetTerrain(left, right)));
  private readonly _seamless =
      new DefaultMap<Terrain, Terrain>((t) => new SeamlessTerrain(t));

  constructor(readonly rom: Rom) {}

  tile(effects: number): Terrain|undefined {
    return effects & 0x04 ? undefined : this.tiles.get(effects);
  }

  static boss(flag: number): Terrain {
    return this.bosses.get(flag);
  }

  // NOTE: also used for triggers
  static statue(req: Requirement): Terrain {
    const label = Requirement.label(req);
    let terrain = this.statues.get(label);
    if (!terrain) this.statues.set(label, terrain = new StatueTerrain(req));
    return terrain;
  }

  static flag(base: Terrain, flag: number, alt: Terrain): Terrain {
    return this.flags.get(base).get(flag).get(alt);
  }

  static meet(left: Terrain, right: Terrain): Terrain {
    // TODO - memoize properly?  only allow two?
    return this.meets.get(left).get(right);
  }
}

class SeamlessTerrain extends Terrain {
  constructor(private readonly _delegate: Terrain) {}
  enter() { return this._delegate.enter(); }
  exit(dir: Dir) { return this._delegate.exit(dir); }
}

// Basic terrain with an entrance and/or undirected exit condition
class SimpleTerrain extends Terrain {
  constructor(private readonly _enter: requirement.Requirement,
              private readonly _exit = requirement.OPEN) {}
  enter() { return this._enter; }
  exit() { return this._exit; }
}

// Basic terrain with an entrance and/or non-south exit condition
class SouthTerrain extends Terrain {
  constructor(private readonly _enter: requirement.Requirement,
              private readonly _exit = requirement.OPEN) {}
  enter() { return this._enter; }
  exit(dir: Dir) { return dir === Dir.South ? requirement.OPEN : this._exit; }
}

// Make a terrain from a tileeffects value, augmented with a few details.
function makeTile(rom: Rom, effects: number): Terrain {
  let enter = [[]];
  let exit = [[]];

  if ((effects & Terrain.DOLPHIN) && (effects & Terrain.FLY)) {
    if (effects & Terrain.SLOPE) exit = [[rom.flags.ClimbWaterfall]];
    enter = [[rom.flags.AbleToRideDolphin], [rom.flags.Flight]];
  } else {
    if (effects & Terrain.SLOPE9) {
      exit = [[rom.flags.ClimbSlope9]]; // Capability.CLIMB_SLOPE;
    } else if (effects & Terrain.SLOPE8) {
      exit = [[rom.flags.ClimbSlope8]]; // Capability.CLIMB_SLOPE;
    } else if (effects & Terrain.SLOPE) {
      exit = [[rom.flags.Flight]];
    }
    if (effects & Terrain.FLY) enter = [[rom.flags.Flight]];
  }
  if (effects & Terrain.SWAMP) { // swamp
    enter = enter.map(cs => [rom.flags.TravelSwamp].concat(cs));
  }
  if (effects & Terrain.BARRIER) { // shooting statues
    enter = enter.map(cs => [rom.flags.ShootingStatue].concat(cs));
  }
  return new SouthTerrain(enter, exit);
}

class BossTerrain extends Terrain {
  constructor(private readonly _flag: number) {}
  exit() { return [[this._flag]]; }
}

class StatueTerrain extends Terrain {
  constructor(private readonly _req: requirement.Requirement) {}
  exit(dir: Dir) { return dir !== Dir.South ? this._req : requirement.OPEN; }
}

class FlagTerrain extends SimpleTerrain {
  constructor(private readonly _base: Terrain,
              private readonly _flag: number,
              private readonly _alt: Terrain) {
    for (let i = 0; i < 4; i++) {
      if (!isOpen(_base.exit(i)) || !isOpen(_alt.exit(i))) {
        throw new Error('bad flag');
      }
    }
    super(
        requirement.or(
            _base.enter(), _alt.enter().map(cs => [_flag].concat(cs))));
  }
}

class MeetTerrain extends Terrain {
  private readonly _exits: readonly requirement.Requirement[];
  private readonly _enter: requirement.Requirement;

  constructor(left: Terrain, right: Terrain) {
    const leftExit = [0, 1, 2, 3].map(d => left.exit(d));
    const rightExit = [0, 1, 2, 3].map(d => right.exit(d));
    this._enter = requirement.meet(left.enter(), right.enter());
    const exits = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < i; j++) {
        if (leftExit[j] === leftExit[i] && rightExit[j] === rightExit[i]) {
          exits[i] = exits[j];
        }
      }
      exits[i] = exits[i] || requirement.meet(leftExit[i], rightExit[i]);
    }
    this._exits = exits;
  }

  enter() {
    return this._enter;
  }

  exit(dir: Dir) {
    return this._exits[dir];
  }
}

function isOpen(r: requirement.Requirement): boolean {
  return r.length === 1 && r[0].length === 0;
}
