import {binarySearch} from './util';

interface Hunk {
  start: number;
  end: number;
  data: Uint8Array;
}

export class Patch {
  // sorted list of hunks.
  constructor(readonly hunks: Hunk[] = []) {}

  shift(offset: number) {
    return new Patch(this.hunks.map(({start, end, data}) => ({
      start: start + offset,
      end: end + offset,
      data,
    })));
  }

  apply(image: Uint8Array, offset = 0) {
    for (const {start, end, data} of this.hunks) {
      image.subarray(start + offset, end + offset).set(data);
    }
  }

  // TODO - output to IPS, IPS hex string, etc.

  read(offset: number): number|undefined {
    const i = this.findHunk(offset);
    if (i < 0) return undefined;
    const h = this.hunks[i];
    return h.data[offset - h.start];
  }

  add(start: number, data: Uint8Array|readonly number[]) {
    // figure out where to insert - add/sub one to coalesce abutting neighbors.
    const end = start + data.length;
    const i0 = this.findHunk(start - 1);
    const i1 = this.findHunk(end + 1);
    if (i0 < 0 && i0 === i1) {
      this.hunks.splice(~i0, 0, {start, end, data: Uint8Array.from(data)});
      return;
    }
    const h0 = i0 >= 0 ? this.hunks[i0] : undefined;
    const h1 = i1 >= 0 ? this.hunks[i1] : undefined;
    const a = h0 ? h0.start : start;
    const b = h1 ? h1.end : end;
    const len = b - a;
    const newData = new Uint8Array(b - a);
    if (h0) {
      newData.subarray(0, h0.data.length).set(h0.data);
    }
    if (h1 && h0 !== h1) {
      newData.subarray(len - h1.data.length, len).set(h1.data);
    }
    newData.subarray(start - a, start - a + data.length).set(data);
    const s0 = i0 < 0 ? ~i0 : i0;
    const s1 = (i1 < 0 ? ~i1 : i1 + 1) - s0;
    this.hunks.splice(s0, s1, {start: a, end: b, data: newData});
  }

  private findHunk(a: number) {
    return binarySearch(this.hunks.length, (i: number) => {
      const hunk = this.hunks[i];
      if (a < hunk.start) return -1;
      if (a >= hunk.end) return 1;
      return 0;
    });
  }
}

