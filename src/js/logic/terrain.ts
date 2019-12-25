import {Rom} from '../rom.js';
import {DefaultMap} from '../util.js';
import {Dir} from './dir.js';
import {Condition, Requirement} from './requirement.js';

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
      new DefaultMap<number, Terrain>(
          (effects: number) => makeTile(this.rom, effects));
  private readonly bosses =
      new DefaultMap<number, Terrain>((flag: number) => new BossTerrain(flag));
  private readonly statues = new Map<string, Terrain>();
  private readonly flags =
      new DefaultMap<Terrain, DefaultMap<number, DefaultMap<Terrain, Terrain>>>(
          (base: Terrain) => new DefaultMap(
              (flag: number) => new DefaultMap(
                  (alt: Terrain) => new FlagTerrain(base, flag, alt))));
  private readonly meets =
      new DefaultMap<Terrain, DefaultMap<Terrain, Terrain>>(
          (left: Terrain) => new DefaultMap(
              (right: Terrain) => new MeetTerrain(left, right)));
  private readonly _seamless =
      new DefaultMap<Terrain, Terrain>((t: Terrain) => new SeamlessTerrain(t));

  constructor(readonly rom: Rom) {}

  tile(effects: number): Terrain|undefined {
    return effects & 0x04 ? undefined : this.tiles.get(effects);
  }

  boss(flag: number): Terrain {
    return this.bosses.get(flag);
  }

  // NOTE: also used for triggers
  statue(req: Requirement): Terrain {
    const label = Requirement.label(req);
    let terrain = this.statues.get(label);
    if (!terrain) this.statues.set(label, terrain = new StatueTerrain(req));
    return terrain;
  }

  flag(base: Terrain, flag: number, alt: Terrain): Terrain {
    return this.flags.get(base).get(flag).get(alt);
  }

  meet(left: Terrain, right: Terrain): Terrain {
    // TODO - memoize properly?  only allow two?
    return this.meets.get(left).get(right);
  }

  seamless(delegate: Terrain) {
    return this._seamless.get(delegate);
  }
}

class SeamlessTerrain extends Terrain {
  constructor(private readonly _delegate: Terrain) { super(); }
  enter() { return this._delegate.enter(); }
  exit(dir: Dir) { return this._delegate.exit(dir); }
}

// Basic terrain with an entrance and/or undirected exit condition
class SimpleTerrain extends Terrain {
  constructor(private readonly _enter: Requirement,
              private readonly _exit: Requirement = Requirement.OPEN) {
    super();
  }
  enter() { return this._enter; }
  exit() { return this._exit; }
}

// Basic terrain with an entrance and/or non-south exit condition
class SouthTerrain extends Terrain {
  constructor(private readonly _enter: Requirement,
              private readonly _exit: Requirement = Requirement.OPEN) {
    super();
  }
  enter() { return this._enter; }
  exit(dir: Dir) { return dir === Dir.South ? Requirement.OPEN : this._exit; }
}

// Make a terrain from a tileeffects value, augmented with a few details.
function makeTile(rom: Rom, effects: number): Terrain {
  let enter = Requirement.OPEN;
  let exit = Requirement.OPEN;

  if ((effects & Terrain.DOLPHIN) && (effects & Terrain.FLY)) {
    if (effects & Terrain.SLOPE) {
      exit = rom.flags.ClimbWaterfall.r;
    }
    enter = [[rom.flags.AbleToRideDolphin.c], [rom.flags.Flight.c]];
  } else {
    if (effects & Terrain.SLOPE9) {
      exit = rom.flags.ClimbSlope9.r;
    } else if (effects & Terrain.SLOPE8) {
      exit = rom.flags.ClimbSlope8.r;
    } else if (effects & Terrain.SLOPE) {
      exit = rom.flags.Flight.r;
    }
    if (effects & Terrain.FLY) enter = rom.flags.Flight.r;
  }
  if (effects & Terrain.SWAMP) { // swamp
    enter = enter.map(
        (cs: readonly Condition[]) => [rom.flags.TravelSwamp.c, ...cs]);
  }
  if (effects & Terrain.BARRIER) { // shooting statues
    enter = enter.map(
        (cs: readonly Condition[]) => [rom.flags.ShootingStatue.c, ...cs]);
  }
  return new SouthTerrain(enter, exit);
}

class BossTerrain extends Terrain {
  constructor(private readonly _flag: number) { super(); }
  exit() { return [[this._flag as Condition]]; }
}

class StatueTerrain extends Terrain {
  constructor(private readonly _req: Requirement) { super(); }
  exit(dir: Dir) { return dir !== Dir.South ? this._req : Requirement.OPEN; }
}

class FlagTerrain extends SimpleTerrain {
  constructor(base: Terrain, flag: number, alt: Terrain) {
    for (const dir of Dir.all()) {
      if (!Requirement.isOpen(base.exit(dir)) ||
          !Requirement.isOpen(alt.exit(dir))) {
        throw new Error('bad flag');
      }
    }
    super(
        Requirement.or(
            base.enter(),
            [...alt.enter()].map(
                (cs: Iterable<Condition>) => [flag as Condition, ...cs])));
  }
}

class MeetTerrain extends Terrain {
  private readonly _exits: readonly Requirement[];
  private readonly _enter: Requirement;

  constructor(left: Terrain, right: Terrain) {
    super();
    const leftExit = Dir.all().map(d => left.exit(d));
    const rightExit = Dir.all().map(d => right.exit(d));
    this._enter = Requirement.meet(left.enter(), right.enter());
    const exits: Requirement[] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < i; j++) {
        if (leftExit[j] === leftExit[i] && rightExit[j] === rightExit[i]) {
          exits[i] = exits[j];
        }
      }
      exits[i] = exits[i] || Requirement.meet(leftExit[i], rightExit[i]);
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
