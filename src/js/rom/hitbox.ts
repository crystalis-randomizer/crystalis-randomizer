import { Assembler } from '../asm/assembler';
import { Module } from '../asm/module';
import { Rom } from '../rom';
import { Entity, EntityArray } from './entity';
import { Segment, readValue, relocExportLabel, signed, tuple, unsigned } from './util';

// Describes a single unit's hitbox.
export class Hitbox extends Entity {

  coordinates: [number, number, number, number];

  constructor(rom: Rom, id: number, address: number) {
    super(rom, id);
    this.coordinates = tuple(rom.prg, address, 4);
  }

  get w(): number { return this.coordinates[1]; }
  set w(value: number) { this.coordinates[1] = value; }

  get x0(): number { return signed(this.coordinates[0]); }
  set x0(value: number) { this.coordinates[0] = unsigned(value); }

  get x1(): number { return this.x0 + this.w; }

  get h(): number { return this.coordinates[3]; }
  set h(value: number) { this.coordinates[3] = value; }

  get y0(): number { return signed(this.coordinates[2]); }
  set y0(value: number) { this.coordinates[2] = unsigned(value); }

  get y1(): number { return this.y0 + this.h; }

  assemble(a: Assembler): void {
    a.byte(...this.coordinates);
  }
}

export class Hitboxes extends EntityArray<Hitbox> {
  constructor(readonly rom: Rom) {
    super();
    const address = readValue('Hitboxes', rom.prg, Segment.$1a);
    for (let i = 0; i < 24; i++) {
      this[i] = new Hitbox(rom, i, address + 4 * i);
    }
  }

  write(): Module[] {
    const a = this.rom.assembler();
    relocExportLabel(a, 'Hitboxes', ['3c']);
    for (const hitbox of this) {
      hitbox.assemble(a);
    }
    return [a.module()];
  }
}
