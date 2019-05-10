export interface RomOption<T> {
  get(rom: Uint8Array): T;
  set(rom: Uint8Array, value: T): void;
}

export namespace RomOption {
  export const bit =
      (address: number, bit: number): RomOption<boolean> => new RomOptionBit(address, bit);
  export const byte =
      (address: number): RomOption<number> => new RomOptionByte(address);
  export const address =
      (address: number): RomOption<number> => new RomOptionAddress(address);
}

class RomOptionBit implements RomOption<boolean> {
  constructor(private readonly address: number, private readonly bit: number) {}

  get(rom: Uint8Array): boolean {
    return !!(rom[this.address] & (1 << this.bit));
  }
  set(rom: Uint8Array, value: boolean): void {
    const bit = 1 << this.bit;
    if (value) {
      rom[this.address] |= bit;
    } else {
      rom[this.address] &= ~bit;
    }
  }
}

class RomOptionByte implements RomOption<number> {
  constructor(private readonly address: number) {}

  get(rom: Uint8Array): number {
    return rom[this.address];
  }
  set(rom: Uint8Array, value: number): void {
    rom[this.address] = value & 0xff;
  }
}

class RomOptionAddress implements RomOption<number> {
  constructor(private readonly address: number) {}

  get(rom: Uint8Array): number {
    return rom[this.address] << 16 |
        rom[this.address + 1] << 8 |
        rom[this.address + 2];
  }
  set(rom: Uint8Array, value: number): void {
    // NOTE: the high byte is compressible down to 2-3 bits
    // if we find ourselves running short on space.
    rom[this.address] = (value >>> 16) & 0xff;
    rom[this.address + 1] = (value >>> 8) & 0xff;
    rom[this.address + 2] = value & 0xff;
  }
}
