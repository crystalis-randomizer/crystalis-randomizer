// Base class for all the different entity types.

import {hex} from './util.js';
import {Writer} from './writer.js';

export class Entity {
  constructor(readonly rom: Rom, readonly id: number) {}

  write(writer: Writer) {}

  toString() {
    return `${this.constructor.name} $${hex(this.id)}`;
  }
}

export type Rom = any;
