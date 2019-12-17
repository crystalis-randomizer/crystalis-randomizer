import {Requirement} from './requirement.js';

// Flag, item, or condition.
export type Condition = number & {__condition__: never};
export namespace Condition {
  export const OPEN: Requirement = [[]];
}
