// Base class for all the different entity types.

import {Writer} from './writer.js';
import {hex} from './util.js';

export class Entity {
  constructor(readonly rom: Rom, readonly id: number) {}

  write(writer: Writer) {}

  toString() {
    return `${this.constructor.name} $${hex(this.id)}`;
  }
}

export type Rom = any;
