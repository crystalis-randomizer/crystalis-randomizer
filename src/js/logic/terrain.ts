import {Rom} from '../rom';
import {DefaultMap, iters} from '../util';
import {Condition, Requirement} from './requirement';

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
  private rage: RageTerrain|undefined;

  constructor(readonly rom: Rom) {}

  tile(effects: number): Terrain|undefined {
    return effects & 0x04 ? undefined : this.tiles.get(effects);
  }

  boss(flag: number, isRage: boolean): Terrain {
    if (isRage) {
      return this.rage || (this.rage = new RageTerrain(flag, this.rom.flags.RageSkip.id));
    }
    return this.bosses.get(flag);
  }

  // NOTE: also used for triggers
  statue(req: Requirement.Frozen): Terrain {
    const label = Requirement.label(req);
    let terrain = this.statues.get(label);
    if (!terrain) this.statues.set(label, terrain = new StatueTerrain(req));
    return terrain!;
  }

  flag(base: Terrain|undefined, flag: number, alt: Terrain): Terrain {
    if (!base) base = CLOSED;
    return this.flags.get(base).get(flag).get(alt);
  }

  meet(left: Terrain, right: Terrain): Terrain {
    // TODO - memoize properly?  only allow two?
    return this.meets.get(left).get(right);
  }

  seamless(delegate: Terrain) {
    return this._seamless.get(delegate);
  }

  label(terrain: Terrain, rom: Rom) {
    if (terrain.label) return terrain.label(rom);
    return 'Terrain';
  }
}

type DirMask = number;
// NOTE: missing directions are forbidden.
type ExitRequirements = ReadonlyArray<readonly [DirMask, Requirement.Frozen]>;
export interface Terrain {
  enter: Requirement.Frozen;
  exit: ExitRequirements;
  label?: (rom: Rom) => string;
}

export namespace Terrain {
  // Built-in terrain bits
  // 0x01 => pit
  export const FLY = 0x02;
  export const BLOCKED = 0x04;
  // 0x08 => flag alternate
  // 0x10 => behind
  export const SLOPE = 0x20;
  // 0x40 => slow
  export const PAIN = 0x80;
  export const BITS = 0xa6;

  // Custom terrain bits
  export const SWAMP = 0x100;
  export const BARRIER = 0x200; // shooting statues
  // slope 0..5 => no requirements
  export const SLOPE8 = 0x400; // slope 6..8
  export const SLOPE9 = 0x800; // slopt 9
  // slope 10+ => flight only
  export const DOLPHIN = 0x1000;

  export function label(t: Terrain, rom: Rom) {
    return t.label?.(rom) ?? 'Terrain';
  }
}

class SeamlessTerrain implements Terrain {
  readonly enter: Requirement.Frozen;
  readonly exit: ExitRequirements;
  constructor(readonly _delegate: Terrain) {
    this.enter = _delegate.enter;
    this.exit = _delegate.exit;
  }

  label(rom: Rom) {
    return `Seamless(${Terrain.label(this._delegate, rom)})`;
  }
}

// Basic terrain with an entrance and/or undirected exit condition
class SimpleTerrain implements Terrain {
  readonly exit: ExitRequirements;
  constructor(readonly enter: Requirement.Frozen,
              exit: Requirement.Frozen = Requirement.OPEN) {
    this.exit = [[0xf, exit]];
  }

  get kind() { return 'Simple'; }

  label(rom: Rom) {
    const terr = [];
    if (!Requirement.isOpen(this.enter)) {
      terr.push(`enter = ${debugLabel(this.enter, rom)}`);
    }
    if (!Requirement.isOpen(this.exit[0][1])) {
      terr.push(`exit = ${debugLabel(this.exit[0][1], rom)}`);
    }
    return `${this.kind}(${terr.join(', ')})`;
  }
}

// Basic terrain with an entrance and/or non-south exit condition
class SouthTerrain implements Terrain {
  readonly exit: ExitRequirements;
  constructor(readonly enter: Requirement.Frozen,
              // openDir is which directions are open
              exit?: Requirement.Frozen, openDir: number = 4) {
    this.exit =
        exit ?
            [[0xf & ~openDir, exit], [openDir, Requirement.OPEN]] :
            [[0xf, Requirement.OPEN]];
  }

  get kind() { return 'South'; }

  label(rom: Rom) {
    if (this.exit.length === 1) {
      return SimpleTerrain.prototype.label.call(this as any, rom);
    }
    const terr = [];
    if (!Requirement.isOpen(this.enter)) {
      terr.push(`enter = ${debugLabel(this.enter, rom)}`);
    }
    if (!Requirement.isOpen(this.exit[0][1])) {
      terr.push(`other = ${debugLabel(this.exit[0][1], rom)}`);
    }
    if (!Requirement.isOpen(this.exit[1][1])) {
      terr.push(`south = ${debugLabel(this.exit[1][1], rom)}`);
    }
    return `${this.kind}(${terr.join(', ')})`;
  }
}

// Make a terrain from a tileeffects value, augmented with a few details.
function makeTile(rom: Rom, effects: number): Terrain {
  let enter = Requirement.OPEN;
  let exit = undefined;
  let openDir = 4;

  if ((effects & Terrain.DOLPHIN) && (effects & Terrain.FLY)) {
    if (effects & Terrain.SLOPE) {
      exit = rom.flags.ClimbWaterfall.r;
    }
    enter = [[rom.flags.CurrentlyRidingDolphin.c], [rom.flags.Flight.c]];
  } else {
    if (effects & Terrain.SLOPE9) {
      exit = rom.flags.ClimbSlope9.r;
    } else if (effects & Terrain.SLOPE8) {
      exit = rom.flags.ClimbSlope8.r;
    } else if (effects & Terrain.SLOPE) {
      exit = rom.flags.ClimbSlope10.r;
    }
    if (effects & Terrain.FLY) enter = rom.flags.Flight.r;
  }
  if (effects & Terrain.SWAMP) { // swamp
    enter = enter.map(
        (cs: readonly Condition[]) => [rom.flags.TravelSwamp.c, ...cs]);
  }
  if (effects & Terrain.PAIN) { // pain tiles
    enter = enter.map(
        (cs: readonly Condition[]) => [rom.flags.CrossPain.c, ...cs]);
  }
  if (effects & Terrain.BARRIER) { // shooting statues
    enter = enter.map(
        (cs: readonly Condition[]) => [rom.flags.ShootingStatue.c, ...cs]);
    exit = rom.flags.ShootingStatueSouth.r;
    openDir = 1; // north
  }
  return new SouthTerrain(enter, exit, openDir);
}

// Bosses can be entered for free but only exited by killing the boss.
class BossTerrain extends SimpleTerrain {
  constructor(readonly _flag: number) {
    super(Requirement.OPEN, [[_flag as Condition]]);
  }

  get kind() { return 'Boss'; }
}

class StatueTerrain extends SouthTerrain {
  constructor(readonly _req: Requirement.Frozen) {
    super(Requirement.OPEN, _req);
  }

  get kind() { return 'Statue'; }
}

// Rage can be always be exited south, but can also be exited north
// if Rage skip is active.
class RageTerrain implements Terrain {
  readonly enter = Requirement.OPEN;
  readonly exit: ExitRequirements;
  constructor(readonly _rageFlag: number, readonly _rageSkipFlag: number) {
    this.exit =
      [[0xb, [[_rageFlag as Condition], [_rageSkipFlag as Condition]]],
       [0x4, Requirement.OPEN]];
  }

  label() { return `Rage`; }
}

class FlagTerrain extends SimpleTerrain {
  constructor(base: Terrain, flag: number, alt: Terrain) {
    // NOTE: base and alt must both be simple terrains!
    // If flag is -1 then don't consider it (it's untracked).
    if (base.exit.length !== 1 || alt.exit.length !== 1) {
      console.error(base, alt);
      throw new Error('bad flag');
    }
    const f = [[flag as Condition]];
    const enter = flag >= 0 ? Requirement.meet(alt.enter, f) : alt.enter;
    const exit =
        flag >= 0 ? Requirement.meet(alt.exit[0][1], f) : alt.exit[0][1];
    super(Requirement.or(base.enter, enter),
          Requirement.or(base.exit[0][1], exit));
  }

  get kind() { return 'Flag'; }
}
const CLOSED = new SimpleTerrain(Requirement.CLOSED, Requirement.CLOSED);

/** Returns a map from Dir to index in the exit map. */
function directionIndex(t: Terrain): number[] {
  const ind: number[] = [];
  for (let i = 0; i < t.exit.length; i++) {
    for (let b = 0; b < 4; b++) {
      if (t.exit[i][0] & (1 << b)) ind[b] = i;
    }
  }
  for (let b = 0; b < 4; b++) { // sanity check
    if (ind[b] == null) {
      throw new Error(`Bad terrain: ${t.exit.map(e => e[0]).join(',')}`);
    }
  }
  return ind;
}

class MeetTerrain implements Terrain {
  readonly enter: Requirement.Frozen;
  readonly exit: ExitRequirements;
  constructor(readonly left: Terrain, readonly right: Terrain) {
    // This is tricky: we need to figure out which exits are in common and
    // not repeat work.  So build up a reverse map of direction-to-index,
    // then keep track of all the unique combinations.
    const leftInd = directionIndex(left);
    const rightInd = directionIndex(right);
    const sources = new Set<number>();
    const exit: Array<readonly [number, Requirement.Frozen]> = [];
    for (let i = 0; i < 4; i++) {
      sources.add(leftInd[i] << 2 | rightInd[i]);
    }
    for (const source of sources) {
      const [d0, r0] = left.exit[source >> 2];
      const [d1, r1] = right.exit[source & 3];
      exit.push([d0 & d1, Requirement.meet(r0, r1)]);
    }
    this.enter = Requirement.meet(left.enter, right.enter);
    this.exit = exit;
  }

  get kind() { return 'Terrain'; }

  label(rom: Rom): string {
    if (this.exit.length === 1) {
      return SimpleTerrain.prototype.label.call(this as any, rom);
    }
    const terr = [];
    if (!Requirement.isOpen(this.enter)) {
      terr.push(`enter = ${debugLabel(this.enter, rom)}`);
    }
    for (const [dirs, req] of this.exit) {
      const dirstring = [dirs & 1 ? 'N' : '', dirs & 2 ? 'W' : '',
                         dirs & 4 ? 'S' : '', dirs & 8 ? 'E' : ''].join('');
      terr.push(`exit${dirstring} = ${debugLabel(req, rom)}`);
    }
    return `${this.kind}(${terr.join(', ')})`;
  }
}

// NOTE: this kind of wants to be in Requirement, but it's rom-specific...
export function debugLabel(r: Requirement, rom: Rom): string {
  const css = [...r];
  const s = css.map(cs => iters.isEmpty(cs) ? 'open' :
                    [...cs].map(
                        (c: Condition) => rom.flags[c]?.debug).join(' & '))
      .join(') | (');
  return css.length > 1 ? `(${s})` : css.length ? s : 'never';
}

(Terrain as any).debugLabel = debugLabel;
if (typeof window === 'object') (window as any).debugLabel = debugLabel;
