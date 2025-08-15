import {Entity} from './entity';
import {hex, readLittleEndian, seq, tuple} from './util';
import {Rom} from '../rom';
import { Module } from '../asm/module';
import { Assembler } from '../asm/assembler';
import {Expr} from '../asm/expr';

const METASPRITE_TABLE = 0x3845c;
const NEW_METASPRITE_TABLE = 0xbd00;

// [dx, dy, attributes, pattern id]
type Sprite = [number, number, number, number];

// We create a new metasprite table since we are running out of room in the main
// metasprite segment. This allows us a lot more freedom when adding new metasprites.
// If your metasprite is small enough to fit in the free space in the first table, just
// use that instead though.

// The Metasprite ptr table for the extended sprites is located at 0xbd00 in the bank 3d
export class ExtendedMetasprites extends Array<Metasprite> {
  constructor(readonly rom: Rom) {
    super(0x100);
  }

  addCrystalisSwordMetasprites(a: Assembler) {
    const up = new Metasprite(this.rom, 0);
    const right = new Metasprite(this.rom, 1);
    const down = new Metasprite(this.rom, 2);
    const left = new Metasprite(this.rom, 3);

    const vanillaUp = new Metasprite(this.rom, 0xff);
    // copy the sprite
    // Update the metasprite to remove the tiny single pixel tiles to reduce overhead and per scanline sprite limit
    vanillaUp.sprites = vanillaUp.sprites.map((frames) => frames.filter((spr) => spr[3] != 0xa8));
    // Now make sure all of them are the right size. For the in game math, it has to be exactly
    // size+1 number of sprites per frame.
    vanillaUp.sprites = vanillaUp.sprites.map((frames) => frames.slice(0, up.size+1));

    // start by converting all dx/dy into signed numbers.
    const intoSigned = (metasprite: Sprite[][]) => metasprite.map((frames) => frames.map(spr => [
      spr[0] > 127 && spr[0] != 0x80 ? spr[0] - 256 : spr[0],
      spr[1] > 127 && spr[1] != 0x80 ? spr[1] - 256 : spr[1],
      spr[2], spr[3]
    ]));

    // copy the sprites over to the new directions as deep clones
    const asSigned = intoSigned(vanillaUp.sprites);

    // now figure out the bounding box by finding the smallest X and smallest Y for the top left
    // and the largest x and largest y for the bottom right
    // const topLeftX = Math.min.apply(0, asSigned.flatMap(frames => frames.map(spr => spr[0])));
    // const topLeftY = Math.min.apply(0, asSigned.flatMap(frames => frames.map(spr => spr[1])));
    // const botrightX = Math.max.apply(0, asSigned.flatMap(frames => frames.map(spr => spr[0])));
    // const botrightY = Math.max.apply(0, asSigned.flatMap(frames => frames.map(spr => spr[1])));
    //
    // // Now with the bounding box, we can get the center point
    // const centerX = botrightX - topLeftX;
    // const centerY = botrightY - topLeftY;

    const GenerateMetasprite = function(m: Metasprite, dir: 'up'|'right'|'down'|'left') {
      m.used = true;
      m.size = 7;
      m.frameMask = 7;
      m.frames = 8;
      m.mirrored = null;
      // reflect each sprite about the center point.
      // For 90deg CW: -y, x
      // For 90deg CC:  y,-x
      // For 180deg  : -y,-x
      m.sprites = asSigned.map(frames => frames.map(spr => {
        if (spr[0] == 0x80) {
          return [0x80, 0x80, 0x80, 0x80];
        }
        let newX, newY = 0;
        const sprOffset = new Map<'up'|'right'|'down'|'left', number[]>([
          ['up', [0, 24]],
          ['right', [-40, -8]],
          ['down', [-8, -48]],
          ['left', [32, -16]],
        ]);
        switch (dir) {
          case 'up': // no flip
            newX = spr[0];
            newY = spr[1];
            break;
          case 'right':
            newX = spr[1] * -1;
            newY = spr[0];
            break;
          case 'down':
            newX = spr[0] * -1;
            newY = spr[1] * -1;
            break;
          case 'left':
            newX = spr[1];
            newY = spr[0] * -1;
            break;
        }
        return [
          newX + sprOffset.get(dir)![0],
          newY + sprOffset.get(dir)![1],
          spr[2],
          spr[3]
        ]
      }));
    };

    GenerateMetasprite(up, 'up');
    GenerateMetasprite(right, 'right');
    GenerateMetasprite(down, 'down');
    GenerateMetasprite(left, 'left');

    // And now export it so we can update the tail metasprite based on direction
    a.assign("CRYSTALIS_BEAM_METASPRITE_UP", up.id);
    a.assign("CRYSTALIS_BEAM_METASPRITE_RIGHT", right.id);
    a.assign("CRYSTALIS_BEAM_METASPRITE_DOWN", down.id);
    a.assign("CRYSTALIS_BEAM_METASPRITE_LEFT", left.id);
    a.export("CRYSTALIS_BEAM_METASPRITE_UP", "CRYSTALIS_BEAM_METASPRITE_RIGHT",
        "CRYSTALIS_BEAM_METASPRITE_DOWN", "CRYSTALIS_BEAM_METASPRITE_LEFT");
    this[up.id] = up;
    this[right.id] = right;
    this[down.id] = down;
    this[left.id] = left;
  }

  write(): Module[] {
    const a = this.rom.assembler();
    a.opts.overwriteMode = 'forbid';
    a.segment('3d');
    a.assign("ExtendedMetaspriteTable", NEW_METASPRITE_TABLE);
    a.export("ExtendedMetaspriteTable");

    this.addCrystalisSwordMetasprites(a);

    const map = new Map<number, Expr>();
    for (const metasprite of this) {
      if (!metasprite)
        continue;
      if (!metasprite.mirrored && metasprite.used) {
        const ptr = metasprite.assembleNotMirrored(a);
        map.set(metasprite.id, ptr);
        metasprite.writePointerToTable(a, NEW_METASPRITE_TABLE, ptr);
      }
    }
    for (const metasprite of this) {
      if (!metasprite)
        continue;
      if (metasprite.mirrored && metasprite.used) {
        const ptr = metasprite.assembleMirrored(a, map);
        metasprite.writePointerToTable(a, NEW_METASPRITE_TABLE, ptr);
      }
    }
    return [a.module()];
  }
}

// Updated the metasprites table to use a slightly more efficient split table approach
// where the lobytes are in one table and the hibytes are in another.
export class Metasprites extends Array<Metasprite> {
  
  constructor(readonly rom: Rom) {
    super(0x100);
    for (let id = 0; id < 0x100; id++) {
      this[id] = new Metasprite(rom, id);
    }
    // TODO find metasprites that are unused and set them up here
    // this[0x98].used = false; // old coin metasprite thats replaced
    // this[0xfc].used = false; // unused in vanilla?
    // this[0xfe].used = false; // unused in vanilla?

    // Remove the data for the vanilla crys beam but keep it "used"
    // as a sentinel value for the extended metasprite table.
    const vanillaCrysBeam = this[0xff];
    vanillaCrysBeam.sprites = [[[0x80,0x80,0x80,0x80]]];
    vanillaCrysBeam.size = 1;
    vanillaCrysBeam.frameMask = 0;
    vanillaCrysBeam.frames = 0;
  }

  write(): Module[] {
    const a = this.rom.assembler();
    a.opts.overwriteMode = 'allow';

    // write out the new metasprite data
    a.segment('1c', '1d');
    a.assign("NewMetaspriteTable", NEW_METASPRITE_TABLE);
    a.export("NewMetaspriteTable");
    const map = new Map<number, Expr>();
    for (const metasprite of this) {
      if (!metasprite.mirrored && metasprite.used) {
        const ptr = metasprite.assembleNotMirrored(a);
        map.set(metasprite.id, ptr);
        metasprite.writePointerToTable(a, NEW_METASPRITE_TABLE, ptr);
      }
    }
    for (const metasprite of this) {
      if (metasprite.mirrored && metasprite.used) {
        const ptr = metasprite.assembleMirrored(a, map);
        metasprite.writePointerToTable(a, NEW_METASPRITE_TABLE, ptr);
      }
    }
    return [a.module()];
  }
}

export class Metasprite extends Entity {

  pointer: number;
  base: number;
  used: boolean;
  mirrored: number | null = null;
  size: number;
  frameMask: number;
  frames: number;
  // `size` sprites for each frame
  sprites: Sprite[][];

  constructor(rom: Rom, id: number) {
    super(rom, id);

    this.pointer = METASPRITE_TABLE + (this.id << 1);
    this.base = readLittleEndian(rom.prg, this.pointer) + 0x30000;
    this.used = this.base >= 0x38000;

    if (rom.prg[this.base] === 0xff) {
      // find the ID of the sprite that's mirrored.
      const target = readLittleEndian(rom.prg, this.base + 1);
      for (let i = 0; i < 256; i++) {
        if (readLittleEndian(rom.prg, METASPRITE_TABLE + (i << 1)) === target) {
          this.mirrored = i;
          break;
        }
      }
      if (this.mirrored == null) {
        throw new Error(`could not find mirrored sprite for ${hex(id)}: ${hex(target)}`);
      }
      this.size = 0;
      this.frameMask = 0;
      this.frames = 0;
      this.sprites = [];
    } else {
      this.mirrored = null;
      this.size = rom.prg[this.base];
      this.frameMask = rom.prg[this.base + 1];
      this.frames = this.frameMask + 1;

      this.sprites = seq(this.frames, f => {
        const a = this.base + 2 + f * 4 * this.size;
        const sprites: [number, number, number, number][] = [];
        for (let i = 0; i < this.size; i++) {
          if (rom.prg[a + 4 * i] === 0x80 && f == (this.frames - 1)) {
            // if this is the last frame of animation, then we can end it with just
            // one row of 0x80
            sprites.push([0x80, 0x80, 0x80, 0x80]);
            break;
          }
          sprites.push(tuple(rom.prg, a + 4 * i, 4));
        }
        return sprites;
      });
      // FUTURE NOTE: Its not that simple since it needs to be padded
      // to match the correct offset for the frame.
      // NOTE: when re-encoding this, fill in $80 for all
      // missing rows from non-final frames.  For the final
      // frame, just write a single row of $80 (or maybe
      // even just a single one, if only the first is used).
    }
  }

  patternBanks(offset = 0): number[] {
    if (!this.used) return [];
    let ms: Metasprite = this;
    if (ms.mirrored) {
      ms = this.rom.metasprites[ms.mirrored];
    }
    const pats = new Set<number>();
    for (const version of ms.sprites) {
      for (const [dx, , , pat] of version) {
        if (dx === 0x80) break;
        pats.add(((pat + offset) >>> 6) & 0xff);
      }
    }
    return [...pats];
  }

  // returns an array of [0..3]
  palettes(): number[] {
    if (!this.used) return [];
    let ms: Metasprite = this;
    if (ms.mirrored) {
      ms = this.rom.metasprites[ms.mirrored];
    }
    const pals = new Set<number>();
    for (const version of ms.sprites) {
      for (const [dx, , attr] of version) {
        if (dx === 0x80) break;
        pals.add(attr & 3);
      }
    }
    return [...pals];
  }
  
  get org(): number {
    return this.base - 0x30000;
  }

  assembleNotMirrored(a: Assembler) : Expr {
    a.reloc(`Metasprite_${this.id.toString(16)}_Data`);
    
    const ptr = a.pc();
    a.byte(this.size);
    a.byte(this.frameMask);
    for (let frameNum = 0; frameNum < this.frames; ++frameNum) {
      for (let spriteNum = 0; spriteNum < this.sprites[frameNum].length; ++spriteNum) {
        a.byte(...this.sprites[frameNum][spriteNum]);
      }
    }
    return ptr;
  }

  assembleMirrored(a: Assembler, map: Map<number, Expr>) : Expr {
    a.reloc(`Metasprite_${this.id.toString(16)}_Data`);
    const ptr = a.pc();
    a.byte(0xff);
    a.word(map.get(this.mirrored!)!);
    return ptr;
  }

  writePointerToTable(a: Assembler, base: number, ptr: Expr) {
    a.org(base + this.id, `Metasprite_${this.id.toString(16)}_Ptr_Lo`);
    a.byte(Expr.loByte(ptr));
    a.org(base + this.id + 0x100, `Metasprite_${this.id.toString(16)}_Ptr_Hi`);
    a.byte(Expr.hiByte(ptr));
  }
}
