import {Condition} from './condition.js';

// Slot for an item or flag to get.  Almost the same thing as a single
// condition, but used in different contexts.
export type Slot = number & {__slot__: never};

export function Slot(x: number | readonly [readonly [Condition]]): Slot {
  if (typeof x === 'number') return x as Slot;
  return x[0][0] as any;
}
export namespace Slot {
  export function item(x: number): Slot {
    return (x | 0x200) as Slot;
  }
  // export function boss(x: number): Slot {
  //   return (~(x | 0x100)) as Slot;
  // }
}
