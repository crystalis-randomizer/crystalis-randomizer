// Some simple newtype definitions for distinguishing full vs partial roms.

declare const FULL_ROM_IMAGE: unique symbol;
declare const PRG_IMAGE: unique symbol;
declare const CHR_IMAGE: unique symbol;

export type FullRomImage = Uint8Array & {[FULL_ROM_IMAGE]: never};
export type PrgImage = Uint8Array & {[PRG_IMAGE]: never};
export type ChrImage = Uint8Array & {[CHR_IMAGE]: never};

export const FullRomImage: {
  of: (img: Uint8Array) => FullRomImage,
} = {
  of: (img) => img as FullRomImage,
};

export const PrgImage: {
  of: (img: FullRomImage) => PrgImage,
} = {
  of: (img) => img.subarray(0x10, 0x40010) as PrgImage,
};

export const ChrImage: {
  of: (img: FullRomImage) => ChrImage,
} = {
  of: (img) => img.subarray(0x40010) as ChrImage,
};
