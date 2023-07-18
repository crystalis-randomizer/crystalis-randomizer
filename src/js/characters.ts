import { spritesheets } from './data';
import { readLittleEndian } from './rom/util';

type OAMSprite = [number, number, number, number];
type Frame = Map<number, OAMSprite[]>;

class CHROffset {
  constructor(readonly page: number,
    readonly bank: number,
    readonly tile: number,
    readonly pputile: number) {}
}

class NssFile {
  readonly filename: string;
  readonly chrdata: number[];
  readonly metasprites: Map<number, Frame>;
  readonly palette: number[];
  readonly rendered: number[];
  constructor(filename: string = "",
              chrdata: number[] = [],
              palette: number[] = [],
              metasprites: Map<number, Frame> = new Map(),
              rendered: number[] = []) {
    this.filename = filename;
    this.chrdata = chrdata;
    this.palette = palette;
    this.metasprites = metasprites;
    this.rendered = rendered;
  }
}

export async function generateThumbnailImage(nss: NssFile): Promise<string> {
  // global offscreen canvas is probably not needed, but every image 
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 112;
  offscreenCanvas.height = 100;
  const ctx = offscreenCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // clear the background
  ctx.fillStyle = "#155fd9";
  ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

  // blit the main character from the top left corner of the pre-rendered CHR
  const imgData = new ImageData(new Uint8ClampedArray(nss.rendered), 128, 128)
  const imgBitmap = await createImageBitmap(imgData, {resizeQuality: "pixelated"});
  ctx.drawImage(imgBitmap, 0,0,16,24, 24,2,16*4,24*4);
  return offscreenCanvas.toDataURL('image/png');
}

export async function generatePreviewImage(nss: NssFile): Promise<string> {
  // global offscreen canvas is probably not needed, but every image 
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 1024;
  offscreenCanvas.height = 1024;
  const ctx = offscreenCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // clear the background
  ctx.fillStyle = "#155fd9";
  ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

  // blit the main character from the top left corner of the pre-rendered CHR
  const imgData = new ImageData(new Uint8ClampedArray(nss.rendered), 128, 128)
  const imgBitmap = await createImageBitmap(imgData, {resizeQuality: "pixelated"});
  ctx.drawImage(imgBitmap, 0,0,128,128, 0,0,1024,1024);
  return offscreenCanvas.toDataURL('image/png');
}

async function createImageFromCHR(buffer: ArrayBuffer, palette:number[]): Promise<ImageData> {
  const tileCount = buffer.byteLength / 16; // 16 bytes per tile
  const pixelsPerTile = 8;
  // TODO: if we start supporting two color mesia, then we need to handle multiple palettes
  const paletteIdx = 0;

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 128;
  offscreenCanvas.height = 128;
  const ctx = offscreenCanvas.getContext('2d')!;
  const imageData = ctx.createImageData(128, 128);

  const view = new Uint8ClampedArray(buffer);
  for (let n=0; n < tileCount; ++n) {
    const offset = n * 16;
    const x = (n % 16) * 8;
    const y = Math.floor(n / 16) * 8;
    for (let j=0; j < pixelsPerTile; ++j) {
      const plane0 = view[offset + j];
      const plane1 = view[offset + j + 8];
      for (let i=0; i < pixelsPerTile; ++i) {
        const pixelbit = 7-i;
        const bit0 = (plane0>>pixelbit) & 1;
        const bit1 = ((plane1>>pixelbit) & 1) << 1;
        const color = (bit0 | bit1) + (paletteIdx * 4);
        const appliedColor = basePaletteColors[palette[color]];
        // 3d -> 1d array conversion. the dest is a 3d data[128][128][4] that we
        // access through a 1d view, so we do z + x * width + y * width * height
        const k = (x + i) * 4 + (y + j) * 4 * 128;
        imageData.data[0 + k] = appliedColor[0]; // R
        imageData.data[1 + k] = appliedColor[1]; // G
        imageData.data[2 + k] = appliedColor[2]; // B
        imageData.data[3 + k] = (color == 0) ? 0 : 255; // A
      }
    }
  }
  return imageData;
}

export class Sprite {
  readonly name: string;
  readonly converter: string;
  readonly nssdata: NssFile;
  readonly description?: string;
  constructor(name: string,
              converter: string,
              nssdata: NssFile,
              description?: string) {
    this.name = name;
    this.converter = converter;
    this.nssdata = nssdata;
    this.description = description;
  }

  static async init(name: string, converter: string, nssdata: Promise<NssFile>, description?: string): Promise<Sprite> {
    const nss = await nssdata;
    return new Sprite(name, converter, nss, description);
  }

  public static isCustom = (s: Sprite) => { return s.name != "Simea"; }

  public static applyPatch(s: Sprite, rom: Uint8Array, expandedPRG: boolean): boolean {
    const expandedOffset = expandedPRG ? 0x40000 : 0;
    let hasErrors = false;
    const chrMapping = CustomTilesetMapping.getChr(s.converter);
    for (let [src, dsts] of chrMapping) {
      for (let dst of dsts) {
        for (let i=0; i<0x10; ++i) {
          rom[toChrAddr(dst.page, dst.bank, dst.tile) + i + expandedOffset] = s.nssdata.chrdata[src * 0x10 + i];
        }
      }
    }
    // apply the palette from the sprite for this converter
    for (let [src, dsts] of CustomTilesetMapping.getPalette(s.converter)) {
      for (let dst of dsts) {
        switch (src) {
          case "color0":
            rom[dst] = s.nssdata.palette[0];
            break;
          case "color1":
            rom[dst] = s.nssdata.palette[1];
            break;
          case "color2":
            rom[dst] = s.nssdata.palette[2];
            break;
          case "color3":
            rom[dst] = s.nssdata.palette[3];
            break;
          case "sprite_palette":
            // TODO figure out how to choose what palette to load for the sprite?
            rom[dst + expandedOffset] = 0x00;
            break;
        }
      }
    }

    const METASPRITE_TABLE = 0x3845c;
    // and then apply any patches for the metasprite as well
    for (let [name, [metaid, framenum]] of CustomTilesetMapping.getMetasprite(s.converter)) {
      const base = readLittleEndian(rom, METASPRITE_TABLE + (metaid << 1)) + 0x30000;
      const size = rom[base];
      const frameMask = rom[base + 1];
      const frames = frameMask + 1;

      if (framenum > frames) {
        console.warn(`Custom metasprite ${name} with the id ${metaid}
          and frame number ${framenum} greater than the vanilla frame count: ${frames}`);
        hasErrors = true;
        continue;
      }
      const ms = rom.subarray(base + 2 + framenum * size * 4);
      const sprites = s.nssdata.metasprites.get(metaid)!.get(framenum)!;
      // count the number of sprites in the vanilla game as a check for good data
      let index = 0;
      while ((index/4) < size && !arraysEqual(Array.from(ms.subarray(index, index+4)), [0x80, 0x80, 0x80, 0x80])) {
        index += 4;
      }
      if (sprites.length != (index / 4)) {
        console.warn(`Custom metasprite ${name} with the id ${metaid}
          and frame number ${framenum} does not equal the vanilla sprite size: ${sprites.length} != ${(index / 4)}`);
        hasErrors = true;
        continue;
      }

      // copy the sprites from the nss metasprite into the game data
      for (let spriteNum = 0; spriteNum < sprites.length; ++spriteNum) {
        ms[(spriteNum * 4) + 0] = sprites[spriteNum][0];
        ms[(spriteNum * 4) + 1] = sprites[spriteNum][1];
        ms[(spriteNum * 4) + 2] = sprites[spriteNum][2] | (ms[(spriteNum * 4) + 2] & 0x4);
        ms[(spriteNum * 4) + 3] = chrMapping.get(sprites[spriteNum][3])![0].pputile;
      }
    }
    return hasErrors;
  }
}

export class CharacterSet {
  private static instance: CharacterSet;
  private readonly mapping: Map<string, Map<string, Promise<Sprite>>> = new Map();

  public static get(which: string): Map<string, Promise<Sprite>> {
    if (!this.instance) this.instance = new CharacterSet();
    return this.instance.mapping.get(which)!;
  }

  constructor() {
    // TODO(sdh): figue out how to have this just automatically pick up the
    // files from the Makefile glob (we need a way to convey the mapping and
    // the description in the NSS file contents - probably doable?)
    this.mapping.set("simea", new Map([
      ["Simea", Sprite.init("Simea", "simea", loadNssFile("Simea.nss"), "The original main character of Crystalis")],
      ["Mesia", Sprite.init("Mesia", "simea", loadNssFile("Mesia.nss"), "Secondary protagonist Mesia takes the spotlight!")],
    ]));
  }
}

// Provides a lookup from the sample tileset to the CHRROM locations
export class CustomTilesetMapping {
  private static instance: CustomTilesetMapping;
  private readonly chrMapping: Map<string, Map<number, CHROffset[]>> = new Map();
  private readonly paletteMapping: Map<string, Map<string, number[]>> = new Map();
  private readonly metaspriteMapping: Map<string, Map<string, number[]>> = new Map();

  public static getChr(which: string): Map<number, CHROffset[]> {
    if (!this.instance) this.instance = new CustomTilesetMapping();
    return this.instance.chrMapping.get(which)!;
  }

  public static getPalette(which: string): Map<string, number[]> {
    if (!this.instance) this.instance = new CustomTilesetMapping();
    return this.instance.paletteMapping.get(which)!;
  }

  public static getMetasprite(which: string): Map<string, number[]> {
    if (!this.instance) this.instance = new CustomTilesetMapping();
    return this.instance.metaspriteMapping.get(which)!;
  }

  private constructor() {
    this.chrMapping.set("simea", this.generateSimeaMapping());
    this.paletteMapping.set("simea", this.generateSimeaPalette());
    this.metaspriteMapping.set("simea", simeaMetaspriteMapping);
  }

  private generateSimeaPalette() : Map<string, number[]> {
    const mapping = new Map<string, number[]>();
    // edit the main character palette
    const customCharPaletteAddrs = [0x6cf0, 0x3e0a8];
    mapping.set("color0", customCharPaletteAddrs.map(addr => addr + 0));
    mapping.set("color1", customCharPaletteAddrs.map(addr => addr + 1));
    mapping.set("color2", customCharPaletteAddrs.map(addr => addr + 2));
    mapping.set("color3", customCharPaletteAddrs.map(addr => addr + 3));
    mapping.set("sprite_palette", [0x3c054]);
    return mapping;
  }

  private generateSimeaMapping() : Map<number, CHROffset[]> {
    // For most of the mappings, there is only one location to write it to, but for some, its split across several CHRROM banks.
    // so thats why its a map of tileset number to a list of addresses

    const mapping = new Map<number, CHROffset[]>();
    //////////
    // Walking Down
    // top left
    mapping.set(0x00, [new CHROffset(8,0,0x1a,0x1a)]);
    // top right
    mapping.set(0x01, [new CHROffset(8,0,0x1b,0x1b)]);
    // mid left
    mapping.set(0x10, [new CHROffset(8,0,0x00,0x00)]);
    // mid right
    mapping.set(0x11, [new CHROffset(8,0,0x01,0x01)]);
    // bot left
    mapping.set(0x20, [new CHROffset(8,0,0x20,0x20)]);
    // bot right
    mapping.set(0x21, [new CHROffset(8,0,0x21,0x21)]);

    //////////
    // Walking Left
    // top left
    mapping.set(0x02, [new CHROffset(8,0,0x1c,0x1c)]);
    // top right
    mapping.set(0x03, [new CHROffset(8,0,0x1d,0x1d)]);
    // mid left
    mapping.set(0x12, [new CHROffset(8,0,0x02,0x02)]);
    // mid right
    mapping.set(0x13, [new CHROffset(8,0,0x03,0x03)]);
    // mid arm left
    mapping.set(0x14, [new CHROffset(8,0,0x04,0x04)]);
    // mid arm right
    mapping.set(0x15, [new CHROffset(8,0,0x05,0x05)]);
    // bot left
    mapping.set(0x22, [new CHROffset(8,0,0x22,0x22)]);
    // bot right
    mapping.set(0x23, [new CHROffset(8,0,0x23,0x23)]);
    // bot leg left
    mapping.set(0x24, [new CHROffset(8,0,0x24,0x24)]);
    // bot leg right
    mapping.set(0x25, [new CHROffset(8,0,0x25,0x25)]);

    //////////
    // Walking Up
    // Up top left
    mapping.set(0x06, [new CHROffset(8,0,0x1e,0x1e)]);
    // Up top right
    mapping.set(0x07, [new CHROffset(8,0,0x1f,0x1f)]);
    // Up mid left
    mapping.set(0x16, [new CHROffset(8,0,0x06,0x06)]);
    // Up mid right
    mapping.set(0x17, [new CHROffset(8,0,0x07,0x07)]);
    // Up bot left
    mapping.set(0x26, [new CHROffset(8,0,0x26,0x26)]);
    // Up bot right
    mapping.set(0x27, [new CHROffset(8,0,0x27,0x27)]);

    //////////
    // Up attack
    // Frame 1
    // mid left
    mapping.set(0x40, [new CHROffset(8,0,0x14,0x14)]);
    // mid right
    mapping.set(0x41, [new CHROffset(8,0,0x15,0x15)]);
    // bot left
    mapping.set(0x50, [new CHROffset(8,0,0x34,0x34)]);
    // bot right
    mapping.set(0x51, [new CHROffset(8,0,0x35,0x35)]);

    // Frame 2
    // top left
    mapping.set(0x32, [new CHROffset(8,0,0x3c,0x3c)]);
    // top right
    mapping.set(0x33, [new CHROffset(8,0,0x3d,0x3d)]);
    // mid left
    mapping.set(0x42, [new CHROffset(8,0,0x18,0x18)]);
    // mid right
    mapping.set(0x43, [new CHROffset(8,0,0x19,0x19)]);
    // bot left
    mapping.set(0x52, [new CHROffset(8,0,0x38,0x38)]);

    // Frame 3
    // mid left
    mapping.set(0x44, [new CHROffset(8,0,0x16,0x16)]);
    // mid right
    mapping.set(0x45, [new CHROffset(8,0,0x17,0x17)]);
    // bot left
    mapping.set(0x54, [new CHROffset(8,0,0x36,0x36)]);

    ////////
    // Left attack
    // Frame 1
    // mid left
    mapping.set(0x70, [new CHROffset(8,0,0x0e,0x0e)]);
    // mid right
    mapping.set(0x71, [new CHROffset(8,0,0x0f,0x0f)]);
    // bot left
    mapping.set(0x80, [new CHROffset(8,0,0x2e,0x2e)]);
    // bot right
    mapping.set(0x81, [new CHROffset(8,0,0x2f,0x2f)]);

    // Frame 2
    // mid left
    mapping.set(0x72, [new CHROffset(8,0,0x12,0x12)]);
    // mid right
    mapping.set(0x73, [new CHROffset(8,0,0x13,0x13)]);
    // bot left
    mapping.set(0x82, [new CHROffset(8,0,0x30,0x30)]);
    // bot right
    mapping.set(0x83, [new CHROffset(8,0,0x33,0x33)]);

    // Frame 3
    // mid left
    mapping.set(0x74, [new CHROffset(8,0,0x10,0x10)]);
    // mid right
    mapping.set(0x75, [new CHROffset(8,0,0x11,0x11)]);
    // bot right
    mapping.set(0x85, [new CHROffset(8,0,0x31,0x31)]);

    //////////
    // Down attack
    // Frame 1
    // mid left
    mapping.set(0xa0, [new CHROffset(8,0,0x08,0x08)]);
    // mid right
    mapping.set(0xa1, [new CHROffset(8,0,0x09,0x09)]);
    // bot left
    mapping.set(0xb0, [new CHROffset(8,0,0x28,0x28)]);

    // Frame 2
    // top left
    mapping.set(0x92, [new CHROffset(8,0,0x3a,0x3a)]);
    // top right
    mapping.set(0x93, [new CHROffset(8,0,0x3b,0x3b)]);
    // mid left
    mapping.set(0xa2, [new CHROffset(8,0,0x0c,0x0c)]);
    // mid right
    mapping.set(0xa3, [new CHROffset(8,0,0x0d,0x0d)]);
    // bot left
    mapping.set(0xb2, [new CHROffset(8,0,0x2c,0x2c)]);
    // bot right
    mapping.set(0xb3, [new CHROffset(8,0,0x2d,0x2d)]);

    // Frame 3
    // mid left
    mapping.set(0xa4, [new CHROffset(8,0,0x0a,0x0a)]);
    // mid right
    mapping.set(0xa5, [new CHROffset(8,0,0x0b,0x0b)]);
    // bot right
    mapping.set(0xb5, [new CHROffset(8,0,0x2b,0x2b)]);

    // Armor mappings
    // Create the armor mappings by using the hardcoded sprite mappings but with the armor offsets
    const noarmor_mappings = new Map(mapping);
    const NSS_ARMOR_OFFSET = 0x100;
    for (let [key, value] of noarmor_mappings) {
      const armor_key = key + NSS_ARMOR_OFFSET;
      const armor_val = value.map((k) => new CHROffset(k.page, k.bank + 1, k.tile, k.pputile));
      mapping.set(armor_key, armor_val);
    }

    /////////
    // The following no armor animations have an armor counterpart, but its unused in the original game.
    // The sprite sheet is arranged so that if we fix it so armor shows in these scenes (death, holding sword, telepathy)
    // Then we can reuse the armor mapping code above.

    // Death
    // Frame 1
    // top left
    mapping.set(0xc0, [new CHROffset(11,4,0x00, 0x00)]);
    // top right
    mapping.set(0xc1, [new CHROffset(11,4,0x01, 0x01)]);
    // mid left
    mapping.set(0xd0, [new CHROffset(11,4,0x02, 0x02)]);
    // mid right
    mapping.set(0xd1, [new CHROffset(11,4,0x03, 0x03)]);
    // bot left
    mapping.set(0xe0, [new CHROffset(11,4,0x04, 0x04)]);
    // bot right
    mapping.set(0xe1, [new CHROffset(11,4,0x05, 0x05)]);

    // Frame 2
    // top left
    mapping.set(0xc2, [new CHROffset(11,4,0x24, 0x24)]);
    // top right
    mapping.set(0xc3, [new CHROffset(11,4,0x25, 0x25)]);
    // mid left
    mapping.set(0xd2, [new CHROffset(11,4,0x06, 0x06)]);
    // mid right
    mapping.set(0xd3, [new CHROffset(11,4,0x07, 0x07)]);
    // bot left
    mapping.set(0xe2, [new CHROffset(11,4,0x26, 0x26)]);
    // bot right
    mapping.set(0xe3, [new CHROffset(11,4,0x27, 0x27)]);

    // Frame 3
    // top left
    mapping.set(0xc4, [new CHROffset(11,4,0x20, 0x20)]);
    // top right
    mapping.set(0xc5, [new CHROffset(11,4,0x21, 0x21)]);
    // mid left
    mapping.set(0xd4, [new CHROffset(11,4,0x22, 0x22)]);
    // mid right
    mapping.set(0xd5, [new CHROffset(11,4,0x23, 0x23)]);

    // Frame 4
    // mid left
    mapping.set(0xd6, [new CHROffset(11,4,0x14, 0x14)]);
    // mid right
    mapping.set(0xd7, [new CHROffset(11,4,0x15, 0x15)]);
    // bot left
    mapping.set(0xe6, [new CHROffset(11,4,0x16, 0x16)]);
    // bot right
    mapping.set(0xe7, [new CHROffset(11,4,0x17, 0x17)]);

    // Holding sword
    // top left
    mapping.set(0x36, [new CHROffset(11,4,0x0c, 0x0c)]);
    // top right
    mapping.set(0x37, [new CHROffset(11,4,0x0d, 0x0d)]);
    // mid left
    mapping.set(0x46, [new CHROffset(11,4,0x32, 0x32)]);
    // mid right
    mapping.set(0x47, [new CHROffset(11,4,0x33, 0x33)]);
    // bot left
    mapping.set(0x56, [new CHROffset(11,4,0x2e, 0x2e)]);
    // bot right
    mapping.set(0x57, [new CHROffset(11,4,0x2f, 0x2f)]);

    // Telepathy Psychic Energy
    // frame 1
    mapping.set(0xb4, [new CHROffset(11,4,0x36, 0x36)]);
    mapping.set(0xb5, [new CHROffset(11,4,0x37, 0x37)]);
    // frame 2
    mapping.set(0xe4, [new CHROffset(11,4,0x38, 0x38)]);
    mapping.set(0xe5, [new CHROffset(11,4,0x39, 0x39)]);

    // Sword Get Sparkles
    mapping.set(0xc6, [new CHROffset(11,4,0x3a, 0x3a)]);
    mapping.set(0xc7, [new CHROffset(11,4,0x3b, 0x3b)]);

    // Telepathy
    // Frame 1
    // top left
    mapping.set(0x66, [new CHROffset(11,4,0x12, 0x12)]);
    // top right
    mapping.set(0x67, [new CHROffset(11,4,0x13, 0x13)]);
    // mid left
    mapping.set(0x76, [new CHROffset(11,4,0x08, 0x08)]);
    // mid right
    mapping.set(0x77, [new CHROffset(11,4,0x09, 0x09)]);
    // bot left
    mapping.set(0x86, [new CHROffset(11,4,0x28, 0x28)]);
    // bot right
    mapping.set(0x87, [new CHROffset(11,4,0x29, 0x29)]);

    // Frame 2
    // top left
    mapping.set(0x96, [new CHROffset(11,4,0x2c, 0x2c)]);
    // top right
    mapping.set(0x97, [new CHROffset(11,4,0x2d, 0x2d)]);
    // mid left
    mapping.set(0xa6, [new CHROffset(11,4,0x0a, 0x0a)]);
    // mid right
    mapping.set(0xa7, [new CHROffset(11,4,0x0b, 0x0b)]);
    // bot left
    mapping.set(0xb6, [new CHROffset(11,4,0x2a, 0x2a)]);
    // bot right
    mapping.set(0xb7, [new CHROffset(11,4,0x2b, 0x2b)]);


    //////////
    // Misc
    // Each sword has their own page of sprites, so apply the change to all pages.
    // Swords
    // diagonal left top
    mapping.set(0xf0, copyToAllWeaponPages(0x10));
    // diagonal left bot
    mapping.set(0xf1, copyToAllWeaponPages(0x11));
    // down top
    mapping.set(0xf2, copyToAllWeaponPages(0x12));
    // down bot
    mapping.set(0xf3, copyToAllWeaponPages(0x13));
    // left left
    mapping.set(0xf4, copyToAllWeaponPages(0x14));
    // left right
    mapping.set(0xf5, copyToAllWeaponPages(0x15));
    // TODO: ???
    mapping.set(0xf6, copyToAllWeaponPages(0x16));
    // ???
    mapping.set(0xf7, copyToAllWeaponPages(0x17));
    // Hilt - is only in the page with mesia since its only used in the tower
    mapping.set(0xf8, [new CHROffset(8, 4, 0xed, 0xed)]);
    // full length blade
    mapping.set(0xf9, copyToAllWeaponPages(0x19));
    // diagonal right
    mapping.set(0xfa, copyToAllWeaponPages(0x1a));

    // Shields
    // Down
    mapping.set(0xfc, copyToAllWeaponPages(0x30));
    // Left
    mapping.set(0xfd, copyToAllWeaponPages(0x31));
    // Up top
    mapping.set(0xfe, copyToAllWeaponPages(0x32));
    // Up bot
    mapping.set(0xff, copyToAllWeaponPages(0x33));

    return mapping;
  }
}

async function loadNssFile(path: string): Promise<NssFile> {
  const data = spritesheets()[path];
  // remove the rest of the path that is before the filename.nss
  const filename = path.replace(/^.*[\\\/]/, '');
  return parseNssFile(filename, data);
}

/**
 * Text based RLE decoder. There are two types of tokens in this format.
 * - xx ASCII hex value
 * - [xx] the number of times to repeat the previous value. Note that this number includes the byte in the stream
 *        so if you have 02[3] then it expands to 020202 (as opposed to 02020202)
 * @param d - RLE encoded value
 */
 function unRLE(d: string): string {
  let buffer = "";
  let current = "";
  let i=0;
  while (i < d.length) {
    if (d[i] === "[") {
      ++i;
      const nextI = d.indexOf("]",i);
      // Subtract one because we already added the current byte to the buffer once
      const rle = parseInt(d.slice(i, nextI), 16) - 1;
      buffer += current.repeat(rle);
      i = nextI+1; // +1 to skip the "]"
    } else {
      current = d.slice(i, i+2);
      buffer += current;
      i += 2;
    }
  }
  return buffer;
}

function chunk(str: string, size: number): string[] {
  return str.match(new RegExp('.{1,' + size + '}', 'g')) || [];
}

function hexstrToBytes(str: string): ArrayBuffer {
  const bytes = chunk(str, 2).map(s => parseInt(s, 16));
  return new Uint8Array(bytes);
}

function hex2Num(strs: string[]): number[] {
    return strs.map(s => parseInt(s, 16));
}

  // Maps from the named metasprites in the NSS file to the game's metasprite [id, frame]
const simeaMetaspriteMapping : Map<string, number[]> = new Map<string, number[]>([
  // animation frames in crystalis count down from the last frame, so we need to reverse them
  // from the order they appear in the NSS file
  ["Up 1",                [0x00, 1]],
  ["Up 2",                [0x00, 0]],
  ["Right 1",             [0x01, 1]],
  ["Right 2",             [0x01, 0]],
  ["Down 1",              [0x02, 1]],
  ["Down 2",              [0x02, 0]],
  // 0x03 Left is mirrored from Right
  ["Stab Up 1",           [0x04, 2]],
  ["Stab Up 2",           [0x04, 1]],
  ["Stab Up 3",           [0x04, 0]],
  ["Stab Right 1",        [0x05, 2]],
  ["Stab Right 2",        [0x05, 1]],
  ["Stab Right 3",        [0x05, 0]],
  ["Stab Down 1",         [0x06, 2]],
  ["Stab Down 2",         [0x06, 1]],
  ["Stab Down 3",         [0x06, 0]],
  // 0x07 stab left is mirrored from stab right
  // 0x08 is Arm Up (and is intentionally empty in game)
  ["Arm Right 1",         [0x09, 1]],
  ["Arm Right 2",         [0x09, 0]],
  // 0x0a is Arm Down (and is intentionally empty in game)
  // 0x0b is Arm Left and is mirrored from Arm Right
  ["Shield Up 1",         [0x0c, 1]],
  ["Shield Up 2",         [0x0c, 0]],
  ["Shield Right 1",      [0x0d, 1]],
  ["Shield Right 2",      [0x0d, 0]],
  ["Shield Down 1",       [0x0e, 1]],
  ["Shield Down 2",       [0x0e, 0]],
  // 0x0f Left is mirrored from Right
  ["Shield Stab Up 1",    [0x10, 2]],
  ["Shield Stab Up 2",    [0x10, 1]],
  ["Shield Stab Up 3",    [0x10, 0]],
  ["Shield Stab Right 1", [0x11, 2]],
  ["Shield Stab Right 2", [0x11, 1]],
  ["Shield Stab Right 3", [0x11, 0]],
  ["Shield Stab Down 1",  [0x12, 2]],
  ["Shield Stab Down 2",  [0x12, 1]],
  ["Shield Stab Down 3",  [0x12, 0]],
  // 0x13 Shield Stab Left is mirrored from Right
  // Now onto a few random metasprites that are nice to have
  ["Sword Get 1",         [0xb8, 1]],
  ["Sword Get 2",         [0xb8, 0]],
  ["Death 1",             [0xbc, 3]],
  ["Death 2",             [0xbc, 2]],
  ["Death 3",             [0xbc, 1]],
  ["Death 4",             [0xbc, 0]],
  ["Death Last",          [0xbd, 0]],
  ["Telepathy Intro 1",   [0xcc, 1]],
  ["Telepathy Intro 2",   [0xcc, 0]],
  ["Telepathy 1",         [0xcd, 1]],
  ["Telepathy 2",         [0xcd, 0]],
]);


export function toChrAddr(chr_page: number, bank: number, tile_number: number): number {
  const baseAddr = 0x40000;
  return baseAddr + chr_page * 0x2000 + bank * 0x400 + tile_number * 0x10;
}

export function copyToAllWeaponPages (tile: number) : CHROffset[] {
  return [
    new CHROffset(8, 2, tile, tile + 0x40),
    new CHROffset(8, 3, tile, tile + 0x40),
    new CHROffset(8, 4, tile, tile + 0x40),
    new CHROffset(8, 5, tile, tile + 0x40),
    new CHROffset(8, 6, tile, tile + 0x40),
  ]
}

function arraysEqual(a:number[], b:number[]) {
  return a.length === b.length && a.every((el, ix) => el === b[ix]);
}

function loadMetasprites(nss: Map<string, string>): Map<number, Frame> {
  const out = new Map<number, Frame>();
  // the raw metasprites is a 
  const raw = Array.from(new Uint8Array(hexstrToBytes(unRLE(nss.get("MetaSprites") || ""))));
  const gridXOffset = parseInt(nss.get("VarSpriteGridX") || "64");
  const gridYOffset = parseInt(nss.get("VarSpriteGridY") || "64");
  let msName;
  for (let currentMetasprite = 0; msName = nss.get(`MetaSprite${currentMetasprite}`)?.trim(); currentMetasprite++) {
    const mapping = simeaMetaspriteMapping.get(msName);
    if (!mapping) {
      console.warn(`Missing mapping for ${msName}`);
      continue; 
    }
    const sprites = [];
    let index = currentMetasprite * 64 * 4;
    // nss files use 0xff as a terminator
    while (!arraysEqual(raw.slice(index, index+4), [0xff, 0xff, 0xff, 0xff])) {
      const sprite = raw.slice(index, index+4) as OAMSprite;
      sprite[3] -= gridXOffset;
      sprite[0] -= gridYOffset;
      const spr = [sprite[3], sprite[0], sprite[2], sprite[1]] as OAMSprite;
      sprites.push(spr);
      index += 4;
    }
    const [msid, framenum] = mapping;
    const frames = out.get(msid) || new Map<number, OAMSprite[]>();
    frames.set(framenum, sprites);
    out.set(msid, frames);
  }
  return out;
}

export async function parseNssFile(filename: string, data: string): Promise<NssFile> {
  const nss = new Map(data.replace(/\r\n/g, '\n').split("\n").filter(s => s.includes("=")).map(s => s.split("=")).map(s => [s[0], s[1]]));
  const paletteData = nss.get("Palette") || "";
  const palette = hex2Num(chunk(unRLE(paletteData).slice(0, 32), 2));
  const chrdata = Array.from(new Uint8Array(hexstrToBytes(unRLE((nss.get("CHRMain") || "")))));
  const metasprites = loadMetasprites(nss);
  const rendered = await createImageFromCHR(new Uint8ClampedArray(chrdata), palette);
  return new NssFile(filename, chrdata, palette, metasprites, Array.from(new Uint8Array(rendered.data)));
}

const basePaletteColors: number[][] = [
  [ 84,  84,  84], [  0,  30, 116], [  8,  16, 144], [ 48,   0, 136], [ 68,   0, 100], [ 92,   0,  48], [ 84,   4,   0], [ 60,  24,   0], [ 32,  42,   0], [  8,  58,   0], [  0,  64,   0], [  0,  60,   0], [  0,  50,  60], [  0,   0,   0], [  0,   0,   0], [  0,   0,   0],
  [152, 150, 152], [  8,  76, 196], [ 48,  50, 236], [ 92,  30, 228], [136,  20, 176], [160,  20, 100], [152,  34,  32], [120,  60,   0], [ 84,  90,   0], [ 40, 114,   0], [  8, 124,   0], [  0, 118,  40], [  0, 102, 120], [  0,   0,   0], [  0,   0,   0], [  0,   0,   0],
  [236, 238, 236], [ 76, 154, 236], [120, 124, 236], [176,  98, 236], [228,  84, 236], [236,  88, 180], [236, 106, 100], [212, 136,  32], [160, 170,   0], [116, 196,   0], [ 76, 208,  32], [ 56, 204, 108], [ 56, 180, 204], [ 60,  60,  60], [  0,   0,   0], [  0,   0,   0],
  [236, 238, 236], [168, 204, 236], [188, 188, 236], [212, 178, 236], [236, 174, 236], [236, 174, 212], [236, 180, 176], [228, 196, 144], [204, 210, 120], [180, 222, 120], [168, 226, 144], [152, 226, 180], [160, 214, 228], [160, 162, 160], [  0,   0,   0], [  0,   0,   0],
];
