import type { Prim, Rand, Val } from './val.js';
import { FieldInfo } from './info.js';

export type Prop = Prim|Rand;

export class LValue {
  constructor(readonly root: string, readonly props: readonly Prop[], readonly field?: FieldInfo) {}
  isPreset(): boolean {
    return this.root === 'presets';
  }
  isProto(): boolean {
    return this.field != undefined;
  }
  isSimple(): boolean {
    return this.props.length === 1 && this.field == undefined;
  }
}

export interface Mutation {
  readonly lhs: LValue;
  readonly op: string;
  readonly rhs: Val;
  // whether mutation may not actually happen
  readonly random?: boolean;
  // which preset this mutation came from
  readonly preset?: string;
}


/////////
// Problem:
//  - what does it mean to read a config field in an expression???
//  - one might expect it to take presets into account?

//      presets: vanilla
//      expr:
//        - items.medicalHerbHeal *= 2

//  - but... this seems VERY infeasible because the presets are not yet known

//      expr:
//        - items.medicalHerbHeal < 64 ? presets += [vanilla] : 0

// Do we need to make config fields WRITE-ONLY?
// Order is funky...
// Alternative:
//  - apply preset immediately on mutation...?
//  - does it sit on top of or beneath the active mutations?
//  - we'd need to have a separate "preset" config accumulating these or
//    else a weird proxy-like object that fell back to presets as needed?
//  - BUT... presets consume random numbers - we want to have a definite
//    time when they're computed, and not repeat it over and over again?
//      - could be immediately when it's added?

// What if we stopped calling them "presets"?
//  - instead treat it as a group of mutations to apply immediately?

// expr:
//   - preset(vanilla)

// evaluates the preset immediately and overwrites it on the current config


// What if we dropped the proto serialization requirement?
//  - serialize as custom json, similar to jspb...?
//  - could still use the proto file for a descriptor tho?
//  - [[],,,[,,1,0],[,,,0.5,{r:0.2},{e:'x'}]]
// Map more closely to UI?

// interface Config {
//   items?: Items;
// }
// interface Items {
//   medicalHerbHeal?: Val<number>;
//   chargeWhileWalking?: Val<boolean>;
// }
// type Val<T> = T | 

////////////////////

// message Config {
//   message Random {
//     repeated uint32 field = 1;
//     optional uint32 chance = 2; // 0..100
//     optional bool pick = 3;
//     repeated string preset = 4; // ???
//   }
// }

//////////////////

// UI:
//   Presets:
//     [ ] vanilla
//     [ ] charge shots only
// Box gets a yes or no, or else can drop down a slider for a %?
//   - maybe define a named variable for a condition?
//   - translates to `rand() < pct && preset` or `var && preset`
// We can have a handful of structures that we recognize
// If we don't recognize something... what do we do?
// Also, we can simply _ban_ various structures
//  - deleting presets
//  - reading config values

