// Base class for all the different entity types.

import {Module} from '../asm/module';
import {Rom} from '../rom';
import {hex} from './util';

export class EntityBase {
  constructor(readonly rom: Rom) {}
}

export class Entity extends EntityBase {
  constructor(rom: Rom, readonly id: number) {
    super(rom);
  }

  write(): Module[] {
    return [];
  }

  toString() {
    return `${this.constructor.name} $${hex(this.id)}`;
  }
}

// Array subclass that specifically doesn't have map() return itself.
export class EntityArray<T extends Entity> extends Array<T> {
  static get [Symbol.species]() { return Array; }
}
