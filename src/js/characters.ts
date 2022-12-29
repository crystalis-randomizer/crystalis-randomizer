import { spritesheets } from './data';

class NssFile {
  readonly filename: string;
  readonly chrdata: number[];
  readonly palette: number[];
  readonly rendered: number[];
  constructor(filename: string,
              chrdata: ArrayBuffer,
              palette: number[],
              rendered: ImageData) {
    this.filename = filename;
    this.chrdata = Array.from(new Uint8Array(chrdata));
    this.palette = palette;
    this.rendered = Array.from(new Uint8Array(rendered.data));
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

  public static applyPatch(s: Sprite, rom: Uint8Array, expandedPRG: Boolean) {
    if (!Sprite.isCustom(s)) {
      return;
    }
    const expandedOffset = expandedPRG ? 0x40000 : 0;
    for (let [src, dsts] of CustomTilesetMapping.getChr(s.converter)) {
      for (let dst of dsts) {
        for (let i=0; i<0x10; ++i) {
          rom[dst + i + expandedOffset] = s.nssdata.chrdata[src * 0x10 + i];
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
          case "metasprite":
            rom[dst + expandedOffset] = 0x00;
            break;
        }
      }
    }
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
      ["Mesia", Sprite.init("Mesia", "simea", loadNssFile("Mesia.nss"), "Secondary protagonist Mesia takes the spotlight! Artwork by jroweboy")],
    ]));
  }
}

function toChrAddr(chr_page: number, nametable: number, tile_number: number): number {
  const baseAddr = 0x40000 + 0x10; // added 0x10 to account for rom header
  return baseAddr + chr_page * 0x2000 + nametable * 0x1000 + tile_number * 0x10;
}

// Provides a lookup from the sample tileset to the CHRROM locations
export class CustomTilesetMapping {
  private static instance: CustomTilesetMapping;
  private readonly simeaChrMapping: Map<number, number[]>;
  private readonly simeaPaletteMapping: Map<string, number[]>;
  private readonly chrMapping: Map<string, Map<number, number[]>> = new Map();
  private readonly paletteMapping: Map<string, Map<string, number[]>> = new Map();

  public static getChr(which: string): Map<number, number[]> {
    if (!this.instance) this.instance = new CustomTilesetMapping();
    return this.instance.chrMapping.get(which)!;
  }

  public static getPalette(which: string): Map<string, number[]> {
    if (!this.instance) this.instance = new CustomTilesetMapping();
    return this.instance.paletteMapping.get(which)!;
  }

  private constructor() {
    this.simeaChrMapping = this.generateSimeaMapping();
    this.simeaPaletteMapping = this.generateSimeaPalette();
    this.chrMapping.set("simea", this.simeaChrMapping);
    this.paletteMapping.set("simea", this.simeaPaletteMapping);
  }

  private generateSimeaPalette() : Map<string, number[]> {
    const mapping = new Map<string, number[]>();
    // move the character main palette to palette_b0
    const customCharPaletteAddr = 0x6cf0 + 0x10;
    mapping.set("color0", [customCharPaletteAddr + 0]);
    mapping.set("color1", [customCharPaletteAddr + 1]);
    mapping.set("color2", [customCharPaletteAddr + 2]);
    mapping.set("color3", [customCharPaletteAddr + 3]);
    mapping.set("metasprite", [0x3c054 + 0x10]);
    return mapping;
  }

  private generateSimeaMapping() : Map<number, number[]> {
    // For most of the mappings, there is only one location to write it to, but for some, its split across several CHRROM banks.
    // so thats why its a map of tileset number to a list of addresses

    // A CHR tileset is 16 tiles wide, the left 8 tiles are the no armor sprites, the right 8 are the armor sprites
    const ARMOR_TILESET_OFFSET = 0x08;
    // In the original game, the game swaps the two 0x20 size CHR banks for sprites to switch armor/no armor sprites
    const CHR_PAGE_OFFSET = 0x400;

    const mapping = new Map<number, number[]>();
    //////////
    // Walking Down
    // top left
    mapping.set(0x00, [toChrAddr(8,0,0x1a)]);
    // top right
    mapping.set(0x01, [toChrAddr(8,0,0x1b)]);
    // mid left
    mapping.set(0x10, [toChrAddr(8,0,0x00)]);
    // mid right
    mapping.set(0x11, [toChrAddr(8,0,0x01)]);
    // bot left
    mapping.set(0x20, [toChrAddr(8,0,0x20)]);
    // bot right
    mapping.set(0x21, [toChrAddr(8,0,0x21)]);

    //////////
    // Walking Left
    // top left
    mapping.set(0x02, [toChrAddr(8,0,0x1c)]);
    // top right
    mapping.set(0x03, [toChrAddr(8,0,0x1d)]);
    // mid left
    mapping.set(0x12, [toChrAddr(8,0,0x02)]);
    // mid right
    mapping.set(0x13, [toChrAddr(8,0,0x03)]);
    // mid arm left
    mapping.set(0x14, [toChrAddr(8,0,0x04)]);
    // mid arm right
    mapping.set(0x15, [toChrAddr(8,0,0x05)]);
    // bot left
    mapping.set(0x22, [toChrAddr(8,0,0x22)]);
    // bot right
    mapping.set(0x23, [toChrAddr(8,0,0x23)]);
    // bot leg left
    mapping.set(0x24, [toChrAddr(8,0,0x24)]);
    // bot leg right
    mapping.set(0x25, [toChrAddr(8,0,0x25)]);

    //////////
    // Walking Up
    // Up top left
    mapping.set(0x06, [toChrAddr(8,0,0x1e)]);
    // Up top right
    mapping.set(0x07, [toChrAddr(8,0,0x1f)]);
    // Up mid left
    mapping.set(0x16, [toChrAddr(8,0,0x06)]);
    // Up mid right
    mapping.set(0x17, [toChrAddr(8,0,0x07)]);
    // Up bot left
    mapping.set(0x26, [toChrAddr(8,0,0x26)]);
    // Up bot right
    mapping.set(0x27, [toChrAddr(8,0,0x27)]);

    //////////
    // Up attack
    // Frame 1
    // mid left
    mapping.set(0x40, [toChrAddr(8,0,0x14)]);
    // mid right
    mapping.set(0x41, [toChrAddr(8,0,0x15)]);
    // bot left
    mapping.set(0x50, [toChrAddr(8,0,0x34)]);
    // bot right
    mapping.set(0x51, [toChrAddr(8,0,0x35)]);

    // Frame 2
    // top left
    mapping.set(0x32, [toChrAddr(8,0,0x3c)]);
    // top right
    mapping.set(0x33, [toChrAddr(8,0,0x3d)]);
    // mid left
    mapping.set(0x42, [toChrAddr(8,0,0x18)]);
    // mid right
    mapping.set(0x43, [toChrAddr(8,0,0x19)]);
    // bot left
    mapping.set(0x52, [toChrAddr(8,0,0x38)]);

    // Frame 3
    // mid left
    mapping.set(0x44, [toChrAddr(8,0,0x16)]);
    // mid right
    mapping.set(0x45, [toChrAddr(8,0,0x17)]);
    // bot left
    mapping.set(0x54, [toChrAddr(8,0,0x36)]);

    ////////
    // Left attack
    // Frame 1
    // mid left
    mapping.set(0x70, [toChrAddr(8,0,0x0e)]);
    // mid right
    mapping.set(0x71, [toChrAddr(8,0,0x0f)]);
    // bot left
    mapping.set(0x80, [toChrAddr(8,0,0x2e)]);
    // bot right
    mapping.set(0x81, [toChrAddr(8,0,0x2f)]);

    // Frame 2
    // mid left
    mapping.set(0x72, [toChrAddr(8,0,0x12)]);
    // mid right
    mapping.set(0x73, [toChrAddr(8,0,0x13)]);
    // bot left
    mapping.set(0x82, [toChrAddr(8,0,0x30)]);
    // bot right
    mapping.set(0x83, [toChrAddr(8,0,0x33)]);

    // Frame 3
    // mid left
    mapping.set(0x74, [toChrAddr(8,0,0x10)]);
    // mid right
    mapping.set(0x75, [toChrAddr(8,0,0x11)]);
    // bot right
    mapping.set(0x85, [toChrAddr(8,0,0x31)]);

    //////////
    // Down attack
    // Frame 1
    // mid left
    mapping.set(0xa0, [toChrAddr(8,0,0x08)]);
    // mid right
    mapping.set(0xa1, [toChrAddr(8,0,0x09)]);
    // bot left
    mapping.set(0xb0, [toChrAddr(8,0,0x28)]);

    // Frame 2
    // top left
    mapping.set(0x92, [toChrAddr(8,0,0x3a)]);
    // top right
    mapping.set(0x93, [toChrAddr(8,0,0x3b)]);
    // mid left
    mapping.set(0xa2, [toChrAddr(8,0,0x0c)]);
    // mid right
    mapping.set(0xa3, [toChrAddr(8,0,0x0d)]);
    // bot left
    mapping.set(0xb2, [toChrAddr(8,0,0x2c)]);
    // bot right
    mapping.set(0xb3, [toChrAddr(8,0,0x2d)]);

    // Frame 3
    // mid left
    mapping.set(0xa4, [toChrAddr(8,0,0x0a)]);
    // mid right
    mapping.set(0xa5, [toChrAddr(8,0,0x0b)]);
    // bot right
    mapping.set(0xb5, [toChrAddr(8,0,0x2b)]);

    // Armor mappings
    // Create the armor mappings by using the hardcoded sprite mappings but with the armor offsets
    const noarmor_mappings = new Map(mapping);
    for (let [key, value] of noarmor_mappings) {
      const armor_key = key + ARMOR_TILESET_OFFSET;
      const armor_val = value.map((k) => k + CHR_PAGE_OFFSET);
      mapping.set(armor_key, armor_val);
    }

    /////////
    // The following no armor animations have an armor counterpart, but its unused in the original game.
    // The sprite sheet is arranged so that if we fix it so armor shows in these scenes (death, holding sword, telepathy)
    // Then we can reuse the armor mapping code above.

    // Death
    // Frame 1
    // top left
    mapping.set(0xc0, [toChrAddr(11,1,0x00)]);
    // top right
    mapping.set(0xc1, [toChrAddr(11,1,0x01)]);
    // mid left
    mapping.set(0xd0, [toChrAddr(11,1,0x02)]);
    // mid right
    mapping.set(0xd1, [toChrAddr(11,1,0x03)]);
    // bot left
    mapping.set(0xe0, [toChrAddr(11,1,0x04)]);
    // bot right
    mapping.set(0xe1, [toChrAddr(11,1,0x05)]);

    // Frame 2
    // top left
    mapping.set(0xc2, [toChrAddr(11,1,0x24)]);
    // top right
    mapping.set(0xc3, [toChrAddr(11,1,0x25)]);
    // mid left
    mapping.set(0xd2, [toChrAddr(11,1,0x06)]);
    // mid right
    mapping.set(0xd3, [toChrAddr(11,1,0x07)]);
    // bot left
    mapping.set(0xe2, [toChrAddr(11,1,0x26)]);
    // bot right
    mapping.set(0xe3, [toChrAddr(11,1,0x27)]);

    // Frame 3
    // top left
    mapping.set(0xc4, [toChrAddr(11,1,0x20)]);
    // top right
    mapping.set(0xc5, [toChrAddr(11,1,0x21)]);
    // mid left
    mapping.set(0xd4, [toChrAddr(11,1,0x22)]);
    // mid right
    mapping.set(0xd5, [toChrAddr(11,1,0x23)]);

    // Frame 4
    // mid left
    mapping.set(0xd6, [toChrAddr(11,1,0x14)]);
    // mid right
    mapping.set(0xd7, [toChrAddr(11,1,0x15)]);
    // bot left
    mapping.set(0xe6, [toChrAddr(11,1,0x16)]);
    // bot right
    mapping.set(0xe7, [toChrAddr(11,1,0x17)]);

    // Holding sword
    // top left
    mapping.set(0x36, [toChrAddr(11,1,0x0c)]);
    // top right
    mapping.set(0x37, [toChrAddr(11,1,0x0d)]);
    // mid left
    mapping.set(0x46, [toChrAddr(11,1,0x32)]);
    // mid right
    mapping.set(0x47, [toChrAddr(11,1,0x33)]);
    // bot left
    mapping.set(0x56, [toChrAddr(11,1,0x2e)]);
    // bot right
    mapping.set(0x57, [toChrAddr(11,1,0x2f)]);

    // Telepathy
    // Frame 1
    // top left
    mapping.set(0x66, [toChrAddr(11,1,0x12)]);
    // top right
    mapping.set(0x67, [toChrAddr(11,1,0x13)]);
    // mid left
    mapping.set(0x76, [toChrAddr(11,1,0x08)]);
    // mid right
    mapping.set(0x77, [toChrAddr(11,1,0x09)]);
    // bot left
    mapping.set(0x86, [toChrAddr(11,1,0x28)]);
    // bot right
    mapping.set(0x87, [toChrAddr(11,1,0x29)]);

    // Frame 2
    // top left
    mapping.set(0x96, [toChrAddr(11,1,0x2c)]);
    // top right
    mapping.set(0x97, [toChrAddr(11,1,0x2d)]);
    // mid left
    mapping.set(0xa6, [toChrAddr(11,1,0x0a)]);
    // mid right
    mapping.set(0xa7, [toChrAddr(11,1,0x0b)]);
    // bot left
    mapping.set(0xb6, [toChrAddr(11,1,0x2a)]);
    // bot right
    mapping.set(0xb7, [toChrAddr(11,1,0x2b)]);


    //////////
    // Misc
    // Each sword has their own page of sprites, so apply the change to all pages.
    let copyToAllWeaponPages = (tile: number) => {
      return [
        toChrAddr(8, 0, tile) + CHR_PAGE_OFFSET * 2,
        toChrAddr(8, 0, tile) + CHR_PAGE_OFFSET * 3,
        toChrAddr(8, 1, tile),
        toChrAddr(8, 1, tile) + CHR_PAGE_OFFSET,
        toChrAddr(8, 1, tile) + CHR_PAGE_OFFSET * 2,
      ]
    }
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
    mapping.set(0xf8, [toChrAddr(8, 1, 0xed)]);
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

export async function parseNssFile(filename: string, data: string): Promise<NssFile> {
  const nss = new Map(data.split("\n").filter(s => s.includes("=")).map(s => s.split("=")).map(s => [s[0], s[1]]));
  const paletteData = nss.get("Palette") || "";
  const palette = hex2Num(chunk(unRLE(paletteData).slice(0, 32), 2));
  const chrdata = hexstrToBytes(unRLE(nss.get("CHRMain") || ""));
  const rendered = await createImageFromCHR(new Uint8ClampedArray(chrdata), palette);
  return new NssFile(filename, chrdata, palette, rendered);
}

const basePaletteColors: number[][] = [
  [ 84,  84,  84], [  0,  30, 116], [  8,  16, 144], [ 48,   0, 136], [ 68,   0, 100], [ 92,   0,  48], [ 84,   4,   0], [ 60,  24,   0], [ 32,  42,   0], [  8,  58,   0], [  0,  64,   0], [  0,  60,   0], [  0,  50,  60], [  0,   0,   0], [  0,   0,   0], [  0,   0,   0],
  [152, 150, 152], [  8,  76, 196], [ 48,  50, 236], [ 92,  30, 228], [136,  20, 176], [160,  20, 100], [152,  34,  32], [120,  60,   0], [ 84,  90,   0], [ 40, 114,   0], [  8, 124,   0], [  0, 118,  40], [  0, 102, 120], [  0,   0,   0], [  0,   0,   0], [  0,   0,   0],
  [236, 238, 236], [ 76, 154, 236], [120, 124, 236], [176,  98, 236], [228,  84, 236], [236,  88, 180], [236, 106, 100], [212, 136,  32], [160, 170,   0], [116, 196,   0], [ 76, 208,  32], [ 56, 204, 108], [ 56, 180, 204], [ 60,  60,  60], [  0,   0,   0], [  0,   0,   0],
  [236, 238, 236], [168, 204, 236], [188, 188, 236], [212, 178, 236], [236, 174, 236], [236, 174, 212], [236, 180, 176], [228, 196, 144], [204, 210, 120], [180, 222, 120], [168, 226, 144], [152, 226, 180], [160, 214, 228], [160, 162, 160], [  0,   0,   0], [  0,   0,   0],
];
