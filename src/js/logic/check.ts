import {Requirement} from './requirement.js';
import {Slot} from './slot.js';


// Metadata about getting slots.
export interface Check {
  condition?: Requirement;
  slot: Slot;
}
export namespace Check {
  export function chest(id: number): Check {
    return {slot: Slot(0x200 | id)};
  }
}
