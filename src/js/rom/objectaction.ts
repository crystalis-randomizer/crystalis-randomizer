import { Entity, EntityArray } from './entity';
import type { ObjectData } from './objectdata';
import { Rom } from '../rom';

interface ActionScriptData {
  hasChild?: boolean;
  large?: boolean;
  bird?: boolean;
  moth?: boolean;
  stationary?: boolean;
  projectile?: number;
  movement?: number;
  metasprites?: (o: ObjectData) => readonly number[];
  placement?: Placement;
  // This is on top of any effect from satk, status, etc.
  // difficulty?: (o: Monster, c?: Monster) => DifficultyFactor;
  // flyer? stationary? large? required space?
}

export type ActionType = 'monster' | 'projectile' | 'boss' | 'source' | 'other';
export type Placement = 'normal' | 'moth' | 'bird' | 'plant';

export class ObjectAction extends Entity {
  constructor(parent: ObjectActions,
              id: number,
              readonly type: ActionType,
              readonly data: ActionScriptData = {}) {
    super(parent.rom, id);
    parent[id] = this;
  }
}

// Set of action script IDs.
// We could possibly do better with a quick coverage analysis of the actual code
// See what addresses are hit (and routines called) before the rts.
export class ObjectActions extends EntityArray<ObjectAction> {
  // includes most projectiles: boss shots, axes, lightning, etc. (also stab)
  straightShotOptionalBounce = new ObjectAction(this, 0x10, 'projectile');
  // includes some sword projectiles, webs, archer shots, etc
  straightShotNoBounce = new ObjectAction(this, 0x11, 'projectile');
  madoShuriken = new ObjectAction(this, 0x16, 'projectile');
  demonWallFire = new ObjectAction(this, 0x17, 'projectile');
  // karmine and draygon 2 only?
  popcorn = new ObjectAction(this, 0x1b, 'projectile');
  // extra indirection for brown robot (object $be)
  harpoonSource = new ObjectAction(this, 0x1d, 'source');
  lasers = new ObjectAction(this, 0x1e, 'projectile');
  paralysisPowder = new ObjectAction(this, 0x1f, 'projectile');
  // blue slime, etc
  randomMovement = new ObjectAction(this, 0x20, 'monster', {
    movement: 1, // slow random
  });
  // medusa, etc (random large stoners)
  randomLargeStoner = new ObjectAction(this, 0x21, 'monster', {
    hasChild: true,
    large: true,
    movement: 2, // fast random
  });
  // wraith, zombie (optional)
  slowHoming = new ObjectAction(this, 0x22, 'monster', {
    hasChild: true,
    movement: 3,
  });
  // weretiger, non-shooting wyverns (small homing)
  smallHoming1 = new ObjectAction(this, 0x24, 'monster', {
    movement: 3,
  });
  // mushroom, anemones
  smallHoming2 = new ObjectAction(this, 0x25, 'monster', {
    movement: 3,
  });
  // orc/wyvern/shadow  -> e9/10 =2  |  e3/11 =0 (status)
  homingShooter1 = new ObjectAction(this, 0x26, 'monster', {
    hasChild: true,
    projectile: 1, // only for non-status orc
    movement: 3, // slow homing
  });
  // troll/spider/fishman/salamander/tarantula/mummy  ->
  homingShooter2 = new ObjectAction(this, 0x27, 'monster', {
    hasChild: true,
    projectile: 1,
    movement: 3, // slow homing
  });
  // golem   -> e5/10 =3
  headShooter = new ObjectAction(this, 0x28, 'monster', {
    hasChild: true,
    projectile: 2, // diagonal
    movement: 3, // slow homing
    metasprites: () => [0x65, 0x91],
  });
  // lavaman
  puddle = new ObjectAction(this, 0x29, 'monster', {
    hasChild: true,
    // projectile does no damage
    movement: 5, // puddle
    metasprites: () => [0x6b, 0x68],
  });
  // soldier/archer/knight/brown robot
  soldier = new ObjectAction(this, 0x2a, 'monster', {
    hasChild: true,
    projectile: 1,
    movement: 4, // fast homing
    metasprites: (o) => [0, 1, 2, 3].map(x => x + o.data[31]), // dir walker
  });
  mimic = new ObjectAction(this, 0x2b, 'monster', {
    movement: 4, // fast homing
  });
  mothResidueSource = new ObjectAction(this, 0x2c, 'source', {
    hasChild: true, // (from 4d object replacement)
  });
  flailGuy = new ObjectAction(this, 0x2e, 'monster', {
    hasChild: true,
    large: true,
    projectile: 2,
    movement: 3, // slow homing
  });
  dynaLaser = new ObjectAction(this, 0x2f, 'projectile');
  guardianStatue = new ObjectAction(this, 0x34, 'source', {
    hasChild: true,
  });
  movingPlatform = new ObjectAction(this, 0x38, 'other');
  // TODO - will need to copy the horizotal version's graphics?
  crumblingMovingPlatform = new ObjectAction(this, 0x3c, 'other');
  // bat, moth
  erraticFlyer = new ObjectAction(this, 0x40, 'monster', {
    hasChild: true,
    moth: true,
    // projectile: 2,
    movement: 4, // slow flyer
    placement: 'moth',
  });
  skeleton = new ObjectAction(this, 0x41, 'monster', {
    hasChild: true, // (mp drain web)
    movement: 3, // slow homing
  });
  swampTomato = new ObjectAction(this, 0x44, 'monster', {
    movement: 3, // slow homing
  });
  // insects (paralysis or shooting), bomber bird (optional shot)
  shootingFlyer = new ObjectAction(this, 0x45, 'monster', {
    hasChild: true,
    bird: true,
    projectile: 2,
    movement: 5, // fast flyer
    placement: 'bird',
  });
  // swamp plant -> ea/10 =5
  swampPlant = new ObjectAction(this, 0x4c, 'monster', {
    hasChild: true,
    stationary: true,
    projectile: 3,
    placement: 'plant',
  });
  kraken = new ObjectAction(this, 0x4d, 'monster', {
    hasChild: true,
    stationary: true,
    projectile: 3,
  });
  burt = new ObjectAction(this, 0x4e, 'monster', {
    hasChild: true,
    stationary: true,
  });
  dynaShot = new ObjectAction(this, 0x57, 'projectile', {
  });
  // sabera2 fire
  popcorn2 = new ObjectAction(this, 0x58, 'projectile');
  towerSentinel = new ObjectAction(this, 0x5c, 'monster', {
    hasChild: true,
    projectile: 3,
    movement: 1,
  });
  helicopter = new ObjectAction(this, 0x5d, 'monster', {
    bird: true,
    movement: 6,
    placement: 'bird',
  });
  whiteRobot = new ObjectAction(this, 0x5e, 'monster', {
    hasChild: true,
    projectile: 1,
    movement: 4, // fast homing
    metasprites: (o) => [0, 1, 2, 3].map(x => x + o.data[31]), // directional walker
  });
  vampire = new ObjectAction(this, 0x60, 'boss');
  vampireBat = new ObjectAction(this, 0x61, 'monster');
  kelbesque = new ObjectAction(this, 0x63, 'boss');
  kelbesqueRock = new ObjectAction(this, 0x64, 'projectile');
  sabera = new ObjectAction(this, 0x66, 'boss');
  mado = new ObjectAction(this, 0x67, 'boss');
  karmine = new ObjectAction(this, 0x68, 'boss');
  draygon1 = new ObjectAction(this, 0x6a, 'boss');
  draygon2 = new ObjectAction(this, 0x6b, 'boss');
  // also for flails...?
  dyna = new ObjectAction(this, 0x70, 'boss');
  giantBug = new ObjectAction(this, 0x7f, 'boss');

  constructor(readonly rom: Rom) { super(); }
}
