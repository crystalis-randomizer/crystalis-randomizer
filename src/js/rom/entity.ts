// Base class for all the different entity types.

import {hex} from './util';

export class Entity {
  constructor(private readonly rom: any, readonly id: number) {}

  toString() {
    return `${this.constructor.name} $${hex(this.id)}`;
  }
}
