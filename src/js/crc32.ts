let table: Uint32Array;

const buildTable = () => {
  let c;
  table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
};

export const crc32 = (arr: number[] | Uint8Array | string): number => {
  if (!table) buildTable();
  if (typeof arr === 'string') arr =
      typeof TextEncoder === 'function' ?
          new TextEncoder().encode(arr) :
          arr.split('').map(x => x.charCodeAt(0));
  let sum = -1;
  for (let i = 0, len = arr.length; i < len; i++) {
    sum = (sum >>> 8) ^ table[(sum ^ arr[i]) & 0xff];
  }
  return (sum ^ (-1)) >>> 0;
};
