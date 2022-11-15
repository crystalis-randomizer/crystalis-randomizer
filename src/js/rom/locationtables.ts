import {DataTuple, hex} from './util';

/** A single screen entrance coordinate. */
export class Entrance extends DataTuple {
  // Basic pattern: xlo xhi ylo yhi = (xp)(xt) (xs)(0) (yp)(yt) (ys)(0)
  // where xp is pixel position within tile, xt is tile, and xs is screen
  static size = 4;

  // x = this.bits([0, 16])
  // y = this.bits([16, 32])

  /** Full 11-bit x-coordinate of the entrance. */
  x = this.prop([0], [1, 0xff, -8]);
  /** Full 12-bit y-coordinate of the entrance. */
  y = this.prop([2], [3, 0xff, -8]);

  // screen = this.bits([8, 12], [24, 28]);
  // tile   = this.bits([4, 8], [20, 24]);
  // coord  = this.bits([0, 8], [16, 24]);

  /** 8-bit screen (yx). */
  screen = this.prop([3, 0x0f, -4], [1, 0x0f]);
  /** 8-bit tile within the screen (yx). */
  tile   = this.prop([2, 0xf0], [0, 0xf0, 4]);
  /** 16-bit coordinate within the screen (yyxx). */
  coord  = this.prop([2, 0xff, -8], [0, 0xff]);

  /** Whether the entrance has not been disabled by setting its x to ff__. */
  get used(): boolean {
    return this.data[1] < 0x08;
  };

  toString(): string {
    return `Entrance ${this.hex()}: (${hex(this.y)}, ${hex(this.x)})`;
  }
}

/** A single screen exit tile. */
export class Exit extends DataTuple {
  static size = 4;

  /** 11-bit x-coordinate of exit pixel (low 4 bits always zero). */
  x        = this.prop([0, 0xff, -4]);
  /** 7-bit x-coordinate of exit tile (screen-tile). */
  xt       = this.prop([0]);

  /** 12-bit y-coordinate of exit pixel (low 4 bits always zero). */
  y        = this.prop([1, 0xff, -4]);
  /** 8-bit y-coordinate of exit tile (screen-tile). */
  yt       = this.prop([1]);

  /** 8-bit screen (yx). */
  screen   = this.prop([1, 0xf0], [0, 0xf0, 4]);
  /** 8-bit tile within the screen (yx). */
  tile     = this.prop([1, 0x0f, -4], [0, 0x0f]);
  /** 16-bit coordinate within the screen (y0x0). */
  coord    = this.prop([1, 0x0f, -12], [0, 0x0f, -4]);

  /** Destination location ID. */
  dest     = this.prop([2]);

  /** Destination entrance index. */
  entrance = this.prop([3]);

  isSeamless(this: any): boolean {
    return Boolean(this.entrance & 0x20);
  }

  toString(): string {
    return `Exit ${this.hex()}: (${hex(this.y)}, ${hex(this.x)}) => ${
            this.dest}:${this.entrance}`;
  }
}

/** Mapping from screen position to flag ID. */
export class Flag extends DataTuple {
  static size = 2;

  /** Mapped flag, always between $200 and $2ff. */
  get flag(): number {
    return this.data[0] | 0x200;
  }
  set flag(f: number) {
    if ((f & ~0xff) !== 0x200) throw new Error(`bad flag: ${hex(f)}`);
    this.data[0] = f & 0xff;
  }

  /** 11-bit x-coordinate of top-left pixel of the flagged screen. */
  x      = this.prop([1, 0x07, -8]);
  /** 3-bit x-coordinate of flagged screen. */
  xs     = this.prop([1, 0x07]);

  /** 12-bit y-coordinate of top-left pixel of the flagged screen. */
  y      = this.prop([1, 0xf0, -4]);
  /** 4-bit y-coordinate of flagged screen. */
  ys     = this.prop([1, 0xf0, 4]);

  /** 8-bit screen (yx). */
  screen = this.prop([1]);

  toString(): string {
    return `Flag ${this.hex()}: ${hex(this.screen)} @ ${hex(this.flag)}`;
  }
}

export class Pit extends DataTuple {
  static size = 4;

  /** 3-bit x-coordinate of pit's screen on this map. */
  fromXs = this.prop([1, 0x70, 4]);
  /** 3-bit x-coordinate of destination screen on destination map. */
  toXs   = this.prop([1, 0x07]);

  /** 4-bit y-coordinate of pit's screen on this map. */
  fromYs = this.prop([3, 0xf0, 4]);
  /** 4-bit y-coordinate of destination screen on destination map. */
  toYs   = this.prop([3, 0x0f]);

  /** 8-bit yx of "from" screen. */
  fromScreen = this.prop([3, 0xf0], [1, 0x70, 4]);
  /** 8-bit yx of "to" screen. */
  toScreen = this.prop([3, 0x0f, -4], [1, 0x07]);

  /** Location ID of destination. */
  dest   = this.prop([0]);

  toString(): string {
    return `Pit ${this.hex()}: (${hex(this.fromXs)}, ${hex(this.fromYs)}) => ${
            hex(this.dest)}:(${hex(this.toXs)}, ${hex(this.toYs)})`;
  }
}

export class Spawn extends DataTuple {
  static size = 4;

  // get y(): number  { return SPAWN_Y.get(this); }
  // set y(y: number) { SPAWN_Y.set(this, y); }

  /** 12-bit y-coordinate of spawn pixel. */
  y      = this.prop([0, 0xff, -4]);
  /** 8-bit y-coordinate of spawn tile. */
  yt     = this.prop([0]);

  /** 11-bit x-coordinate of spawn pixel. */
  x      = this.prop([1, 0x7f, -4], [2, 0x40, 3]);
  /** 7-bit x-coordinate of spawn tile. */
  xt     = this.prop([1, 0x7f]);

  /** True for timed respawn, false for initial spawn. */
  timed  = this.booleanProp(1, 7);

  /** 8-bit screen coordinate (yx). */
  screen = this.prop([0, 0xf0], [1, 0x70, 4]);
  /** 8-bit tile coordinate within the screen (yx). */
  tile   = this.prop([0, 0x0f, -4], [1, 0x0f]);
  /** 16-bit pixel coordinate within the screen (y0xx). */
  coord  = this.prop([0, 0x0f, -12], [1, 0x0f, -4], [2, 0x40, 3]);

  /** Spawn type (0..4). */
  type   = this.prop([2, 0x07]);
  /** Spawned object ID (exact interpretation depends on type). */
  id     = this.prop([3]);

  /** Pattern bank shift (0 or 1) to store in 380,x:20. */
  patternBank = this.prop([2, 0x80, 7]);

// patternBank: {get(this: any): number { return this.data[2] >>> 7; },
//               set(this: any, v: number) { if (this.data[3] === 120) debugger;
//                                           if (v) this.data[2] |= 0x80; else this.data[2] &= 0x7f; }},

  /** Whether this spawn is active (inactive indicated by $fe in [0]). */
  get used(): boolean {
    return this.data[0] !== 0xfe;
  }
  set used(used: boolean) {
    this.data[0] = used ? 0 : 0xfe;
  }

  [Symbol.iterator]() {
    // Override iterator to ensure unused spawns have no data.
    if (this.used) return super[Symbol.iterator]();
    return [0xfe, 0, 0, 0][Symbol.iterator]();
  }

  /** Object ID of monster spawn (shifted by $50 from ID). */
  get monsterId(): number {
    return (this.id + 0x50) & 0xff;
  }
  set monsterId(id: number) {
    this.id = (id - 0x50) & 0xff;
  }

  /** Whether this spawn is a treasure chest (note: includes mimics). */
  isChest(): boolean { return this.type === 2 && this.id < 0x80; }
  /** Whether this spawn is an invisible treasure chest. */
  isInvisible(): boolean {
    return this.isChest() && Boolean(this.data[2] & 0x20);
  }
  /** Whether this spawn is a trigger (type 2, upper IDs). */
  isTrigger(): boolean { return this.type === 2 && this.id >= 0x80; }
  /** Whether this spawn is an NPC (type 1, lower IDs). */
  isNpc(): boolean { return this.type === 1 && this.id < 0xc0; }
  /** Whether this spawn is a boss (type 1, upper IDs). */
  isBoss(): boolean { return this.type === 1 && this.id >= 0xc0; }
  /** Whether this spawn is a monster (type 0). */
  isMonster(): boolean { return this.type === 0; }
  /** Spawn type 4 is just a generic spawn. */
  isGeneric(): boolean { return this.type === 4; }
  /** Whether this spawn is a wall hitbox (type 3, mostly). */
  isWall(): boolean {
    return Boolean(this.type === 3 && (this.id < 4 || (this.data[2] & 0x20)));
  }
  /** Whether this spawn is a shooting wall (uses custom logic). */
  isShootingWall(location: Location): boolean {
    return this.isWall() &&
        !!(this.data[2] & 0x20 ? this.data[2] & 0x10 :
           location.id === 0x8f || location.id === 0xa8);
  }
  /** Type of wall (i.e. wall/bridge) or empty if neither. */
  wallType(): '' | 'wall' | 'bridge' {
    if (this.type !== 3) return '';
    const obj = this.data[2] & 0x20 ? this.id >>> 4 : this.id;
    if (obj >= 4) return '';
    return obj === 2 ? 'bridge' : 'wall';
  }
  /** Element of wall (0..3) or -1 if not a wall. */
  wallElement(): number {
    if (!this.isWall()) return -1;
    return this.id & 3;
  }

  toString(): string {
    return `Spawn ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) ${
            this.timed ? 'timed' : 'fixed'} ${this.type}:${hex(this.id)}`;
  }
}

interface Location {
  readonly id: number;
}

/** 240px-aware subtraction */
export function ytDiff(yt1: number, yt0: number): number {
  let dy = yt1 - yt0;
  dy -= (yt1 >>> 4) - (yt0 >>> 4);
  return dy;
}

/** 240px-aware addition */
export function ytAdd(yt: number, ...dys: number[]): number {
  for (const dy of dys) {
    const subscreen = dy % 15;
    const screens = (dy - subscreen) / 15;
    let ys1 = (yt >> 4) + screens;
    let yt1 = (yt & 0xf) + subscreen;
    if (yt1 < 0) {
      ys1--;
      yt1 = 0xf + yt1;
    } else if (yt1 >= 0xf) {
      ys1++;
      yt1 = yt1 - 0xf;
    }
    yt = ys1 << 4 | yt1;
  }
  return yt;
}
