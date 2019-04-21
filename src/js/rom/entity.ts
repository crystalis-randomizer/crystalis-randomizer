// Base class for all the different entity types.

import {hex} from './util.js';

export class Entity {
  constructor(readonly rom: any, readonly id: number) {}

  toString() {
    return `${this.constructor.name} $${hex(this.id)}`;
  }
}
