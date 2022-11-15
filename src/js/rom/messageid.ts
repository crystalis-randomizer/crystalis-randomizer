import {DataTuple, hex} from './util';

export class MessageId extends DataTuple {
  static size = 2;

  // TODO - consider just listing bits?  (harder to map to code)
  //        probably the way to map is to bucket by byte:shift, then
  //        OR together everything with the same shift...
  // action = this.bits(11, 12, 13, 14, 15) = this.bits([11, 16]);
  // part   = this.bits(5, 6, 7, 8, 9, 10)  = this.bits([5, 11]);
  // index  = this.bits(0, 1, 2, 3, 4)      = this.bits([0, 5]);

  action = this.prop([0, 0xf8, 3]);
  part   = this.prop([0, 0x07, -3], [1, 0xe0, 5]);
  index  = this.prop([1, 0x1f]);

  toString(): string {
    const action = this.action ? ` (action ${hex(this.action)})` : '';
    return `MessageId ${this.hex()}: (${hex(this.part)}:${hex(this.index)}${
            action}`;
  }

  // Unique string ID for the message part only (no action).
  // Suitable for keying a map.
  get mid(): string {
    return `${hex(this.part)}:${hex(this.index)}`;
  }

  set mid(mid: string) {
    const split = mid.split(':');
    if (split.length !== 2) throw new Error(`oops: ${mid}`);
    this.part = Number.parseInt(split[0], 16);
    this.index = Number.parseInt(split[1], 16);
    if (isNaN(this.part) || isNaN(this.index)) throw new Error(`oops: ${mid}`);
  }

  // Whether the mid is nonzero.
  nonzero(): boolean {
    return !!(this.part || this.index);
  }
}
