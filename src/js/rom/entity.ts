// Base class for all the different entity types.

import {hex} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

export class Entity {
  constructor(readonly rom: Rom, readonly id: number) {}

  write(writer: Writer) {}

  toString() {
    return `${this.constructor.name} $${hex(this.id)}`;
  }
}

// Array subclass that specifically doesn't have map() return itself.
export class EntityArray<T extends Entity> extends Array<T> {
  static get [Symbol.species]() { return Array; }
}
