import {DataTuple, hex} from './util.js';

export const MessageId = DataTuple.make(2, {
  action:   DataTuple.prop([0, 0xf8, 3]),

  part:     DataTuple.prop([0, 0x07, -3], [1, 0xe0, 5]),

  index:    DataTuple.prop([1, 0x1f]),

  toString(this: any): string {
    const action = this.action ? ` (action ${hex(this.action)})` : '';
    return `MessageId ${this.hex()}: (${hex(this.part)}:${hex(this.index)}${
            action}`;
  },

  // Unique string ID for the message part only (no action).
  // Suitable for keying a map.
  mid(this: any): string {
    return `${hex(this.part)}:${hex(this.index)}`;
  },

  // Whether the mid is nonzero.
  nonzero(): boolean {
    return !!(this.part || this.index);
  },
});
export type MessageId = InstanceType<typeof MessageId>;
