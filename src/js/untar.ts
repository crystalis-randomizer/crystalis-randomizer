export interface TarRecord<V = Uint8Array> {
  filename: string;
  contents: V;
}

interface TypedArray {
  buffer: ArrayBuffer;
  byteOffset: number;
  byteLength: number;
}

export function* untar(arr: ArrayBuffer|TypedArray): Generator<TarRecord> {
  const decoder = new TextDecoder('UTF-8');
  const buffer =
    arr instanceof ArrayBuffer ?
    new Uint8Array(arr) :
    new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  const length = buffer.byteLength;
  let pos = 0;
  while (pos + 4 < length) {
    // Read the header
    let filename = str(0, 100);
    if (!filename && !buffer[pos + 1] && !buffer[pos + 2] && !buffer[pos + 2]) {
      // '\0\0\0\0' in the filename field signals end of file (else just skip)
      break;
    }
    const size = parseInt(str(124, 12), 8);
    const type = str(156, 1);
    // Read the ustar header if it exists
    if (str(257, 6) === 'ustar') {
      const prefix = str(345, 155);
      if (prefix) filename = `${prefix}/${filename}`;
    }
    // Read the file contents only for standard files
    // (types 'g' and 'x' indicate PAX headers - ignore for now)
    if (type === '0' || type === '') {
      const contents = buffer.subarray(pos + 512, pos + 512 + size);
      yield {filename, contents};
    }
    // Advance the cursor to the next block
    pos += 512 + (Math.ceil(size / 512) * 512);
  }
  
  function str(offset: number, max: number): string {
    const start = pos + offset;
    const len = buffer.subarray(start, start + max).indexOf(0);
    const end = len < 0 ? start + max : start + len;
    return decoder.decode(buffer.subarray(start, end));
  }
}
