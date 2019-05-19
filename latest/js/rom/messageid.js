import { DataTuple, hex } from './util.js';
export const MessageId = DataTuple.make(2, {
    action: DataTuple.prop([0, 0xf8, 3]),
    part: DataTuple.prop([0, 0x07, -3], [1, 0xe0, 5]),
    index: DataTuple.prop([1, 0x1f]),
    toString() {
        const action = this.action ? ` (action ${hex(this.action)})` : '';
        return `MessageId ${this.hex()}: (${hex(this.part)}:${hex(this.index)}${action}`;
    },
    mid() {
        return `${hex(this.part)}:${hex(this.index)}`;
    },
    nonzero() {
        return !!(this.part || this.index);
    },
});
//# sourceMappingURL=messageid.js.map