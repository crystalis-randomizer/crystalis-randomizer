import {Assembler} from './6502.js';
import {FetchReader} from './fetchreader.js';

export default ({
  async apply(rom: Uint8Array, hash: {[key: string]: unknown}, path: string): Promise<Uint8Array> {
    return await patch(rom, new FetchReader(path));
    return result;
  },
});

/**
 * Abstract out File I/O.  Node and browser will have completely
 * different implementations.
 */
export interface Reader {
  read(filename: string): Promise<string>;
}

export async function patch(rom: Uint8Array, reader: Reader): Promise<Uint8Array> {
  const asm = new Assembler();
  async function assemble(path: string) {
    asm.assemble(await reader.read(path), path);
    console.log(asm.patch(0x10).toIpsHex());
    asm.patchRom(rom);
  }
  await assemble('snes.s');
  return rom;
}
