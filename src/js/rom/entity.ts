// Base class for all the different entity types.

import {Module} from '../asm/module';
import {Rom} from '../rom';
import {hex} from './util';

export class Entity {
  constructor(readonly rom: Rom, readonly id: number) {}

  write(): Module[] {
    return [];
  }

  toString() {
    return `${this.constructor.name} $${hex(this.id)}`;
  }
}

// Workaround for classes that use the rom in field inits 
export abstract class RomOwned {
  constructor(readonly rom: Rom) {}
}

// Array subclass that specifically doesn't have map() return itself.
// Like RomOwned, takes `rom` so that subclass field initializers can use it.
export class EntityArray<T extends Entity> extends Array<T> {
  static get [Symbol.species]() { return Array; }

  constructor(readonly rom: Rom, length = 0) {
    super(length);
  }
}
