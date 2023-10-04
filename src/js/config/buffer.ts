export type NumArray = number[]|Uint8Array;

export class WriteBuffer {
  private readonly data: number[] = [];
  private partial = 0;
  private partialBits = 0;
  pushArray(data: NumArray) {
    this.flushBits();
    this.data.push(...data);
  }
  pushVarint(num: number) {
    while (num > 127) {
      this.data.push((num & 0x7f) | 0x80);
      num >>= 7;
    }
    this.data.push(num);
  }
  pushBits(num: number, count: number) {
    while (count > 0) {
      const next = Math.min(count, 8 - this.partialBits);
      this.partial |= ((num & ((1 << next) - 1)) << this.partialBits);
      this.partialBits += next;
      if (this.partialBits === 8) this.flushBits();
      count -= next;
      num >>>= next;
    }
  }
  flushBits() {
    if (this.partialBits) {
      this.data.push(this.partial);
      this.partial = this.partialBits = 0;
    }
  }
  pushByte(num: number) {
    this.data.push(num & 0xff);
  }
  toUint8Array(): Uint8Array {
    this.flushBits();
    return Uint8Array.from(this.data);
  }
  toArray(): number[] {
    this.flushBits();
    return [...this.data];
  }
}

export class ReadBuffer {
  private bit = 0;
  constructor(private readonly data: NumArray,
              private readonly length = data.length,
              private index = 0) {}

  readLengthDelimited(): ReadBuffer {
    const length = this.readVarint();
    const out = new ReadBuffer(this.data, this.index + length, this.index);
    this.index += length;
    return out;
  }
  readLengthDelimitedUint8Array(): Uint8Array {
    const length = this.readVarint();
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      out[i] = this.data[this.index++];
    }
    return out;
  }
  readVarint(): number {
    if (this.bit > 0) {
      this.bit = 0;
      this.index++;
    }
    let out = 0;
    let base = 0;
    do {
      out |= ((this.data[this.index] & 127) << base);
      base += 7;
    } while (this.data[this.index++] > 127);
    return out;
  }
  readBits(count: number): number {
    let out = 0;
    let base = 0;
    while (count > 0) {
      const next = Math.min(count, 8 - this.bit);
      out |= ((this.data[this.index] >>> this.bit) & ((1 << next) - 1)) << base;
      base += next;
      this.bit += next;
      count -= next;
      if (this.bit === 8) {
        this.index++;
        this.bit = 0;
      }
    }
    return out;
  }
  eof(): boolean {
    return this.index >= this.length;
  }
}
