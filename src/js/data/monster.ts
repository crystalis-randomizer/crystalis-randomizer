import {FlagSet} from '../flagset.js';

// Data about monsters.

// TODO - action script types
//      -> compatibility with other monsters
//         constraints on extra attributes
//         difficulty ratings

export type MonsterType = 'monster' | 'boss' | 'projectile';
export type Terrain = 'walk' | 'swim' | 'soar' | 'flutter' | 'stand';

export type Constraint = number[][];

export interface Monster {
  id: number;
  name: string;
  action: number;
  count: number;
  type?: MonsterType; // default is monster
  move?: Terrain; // default is walk
  sdef?: number;
  swrd?: number;
  hits?: number;
  satk?: number;
  dgld?: number;
  sexp?: number;
  elem?: number;
  spd?: number;
  status: number;
  persist?: boolean;
  must?: Constraint;
}

export function generate({}: FlagSet): Monster[] {
  const out: Monster[] = [];

  type Without<T, K> = {
    [L in Exclude<keyof T, K>]?: T[L]
  };
  type MonsterRest = Without<Monster, 'id'|'name'|'action'|'count'|'type'>;
  function monster(id: number, name: string, action: number, count: number,
                   attrs: MonsterRest) {
    const m: Monster = {...attrs} as Monster;
    m.id = id;
    m.name = name;
    m.type = 'monster';
    m.action = action;
    m.count = count;
    out.push(m);
  }

  // TODO - additional constraints about e.g. placement, etc?
  //      - no X on Y level...?
  monster(0x50, 'Blue Slime', 0x20, 6, {
    hits: 1, satk: 16, dgld: 2, sexp: 32,
    must: and(pat(0x64), pal(2, 0x21)),
  });
  monster(0x51, 'Weretiger', 0x24, 7, {
    hits: 1.5, satk: 21, dgld: 4, sexp: 40,
    must: and(pat(0x60), pal(3, 0x20)),
  });
  monster(0x52, 'Green Jelly', 0x20, 10, {
    sdef: 4, hits: 3, satk: 16, dgld: 4, sexp: 36,
    must: and(pat(0x65), pal(2, 0x22)),
  });
  monster(0x53, 'Red Slime', 0x20, 16, {
    sdef: 6, hits: 4, satk: 16, dgld: 4, sexp: 48,
    must: and(pat(0x64), pal(2, 0x23)),
  });
          
  return out;
}

function and(x: Constraint, y: Constraint): Constraint {
  return [];
}
function pat(id: number): Constraint {
  return [];
}
function pal(which: number, id: number): Constraint {
  return [];
}
