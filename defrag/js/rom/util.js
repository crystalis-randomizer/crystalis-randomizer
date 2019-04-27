export function seq(x, f = (i) => i) {
    return new Array(x).fill(0).map((_, i) => f(i));
}
export function slice(arr, start, len) {
    return arr.slice(start, start + len);
}
export function tuple(arr, start, len) {
    return Array.from(arr.slice(start, start + len));
}
export function signed(x) {
    return x < 0x80 ? x : x - 0x100;
}
export function unsigned(x) {
    return x < 0 ? x + 0x100 : x;
}
export function varSlice(arr, start, width, sentinel, end = Infinity, func) {
    if (!func)
        func = (x) => x;
    const out = [];
    while (start + width <= end && arr[start] !== sentinel) {
        out.push(func(arr.slice(start, start + width)));
        start += width;
    }
    return out;
}
export function addr(arr, i, offset = 0) {
    return (arr[i] | arr[i + 1] << 8) + offset;
}
export function group(width, arr, func) {
    if (!func)
        func = (x) => x;
    return seq(Math.max(0, Math.floor(arr.length / width)), i => func(slice(arr, i * width, width)));
}
export function reverseBits(x) {
    return ((x * 0x0802 & 0x22110) | (x * 0x8020 & 0x88440)) * 0x10101 >>> 16 & 0xff;
}
export function countBits(x) {
    x -= x >> 1 & 0x55;
    x = (x & 0x33) + (x >> 2 & 0x33);
    return (x + (x >> 4)) & 0xf;
}
export function hex(id) {
    return id.toString(16).padStart(2, '0');
}
export function hex4(id) {
    return id.toString(16).padStart(4, '0');
}
export function concatIterables(iters) {
    const out = [];
    for (const iter of iters) {
        for (const elem of iter) {
            out.push(elem);
        }
    }
    return out;
}
export function readBigEndian(data, offset) {
    return data[offset] << 8 | data[offset + 1];
}
export function readLittleEndian(data, offset) {
    return data[offset + 1] << 8 | data[offset];
}
export function readString(arr, address) {
    const bytes = [];
    while (arr[address]) {
        bytes.push(arr[address++]);
    }
    return String.fromCharCode(...bytes);
}
export function writeLittleEndian(data, offset, value) {
    data[offset] = value & 0xff;
    data[offset + 1] = value >>> 8;
}
export class FlagListType {
    constructor(last, clear) {
        this.last = last;
        this.clear = clear;
    }
    read(data, offset = 0) {
        const flags = [];
        while (true) {
            const hi = data[offset++];
            const lo = data[offset++];
            offset += 2;
            const flag = (hi & 3) << 8 | lo;
            flags.push(hi & this.clear ? ~flag : flag);
            if (hi & this.last)
                return flags;
        }
    }
    bytes(flags) {
        const bytes = [];
        for (let i = 0; i < flags.length; i++) {
            let flag = flags[i];
            if (flag < 0)
                flag = (this.clear << 8) | ~flag;
            if (i === flags.length - 1)
                flag |= (this.last << 8);
            bytes.push(flag >>> 8);
            bytes.push(flag & 0xff);
        }
        return bytes;
    }
    write(data, flags, offset = 0) {
        const bytes = this.bytes(flags);
        for (let i = 0; i < bytes.length; i++) {
            data[i + offset] = bytes[i];
        }
    }
}
export const ITEM_GET_FLAGS = new FlagListType(0x40, 0x80);
export class DataTuple {
    constructor(data) {
        this.data = data;
    }
    [Symbol.iterator]() {
        return this.data[Symbol.iterator]();
    }
    hex() {
        return Array.from(this.data, hex).join(' ');
    }
    clone() {
        return new this.constructor(this.data);
    }
    static make(length, props) {
        const cls = class extends DataTuple {
            constructor(data = new Array(length).fill(0)) { super(data); }
            static of(inits) {
                const out = new cls();
                for (const [key, value] of Object.entries(inits)) {
                    out[key] = value;
                }
                return out;
            }
            static from(data, offset = 0) {
                return new cls(tuple(data, offset, length));
            }
        };
        const descriptors = {};
        for (const key in props) {
            if (typeof props[key] === 'function') {
                descriptors[key] = { value: props[key] };
            }
            else {
                descriptors[key] = props[key];
            }
        }
        Object.defineProperties(cls.prototype, descriptors);
        return cls;
    }
    static prop(...bits) {
        return {
            get() {
                let value = 0;
                for (const [index, mask = 0xff, shift = 0] of bits) {
                    const lsh = shift < 0 ? -shift : 0;
                    const rsh = shift < 0 ? 0 : shift;
                    value |= ((this.data[index] & mask) >>> rsh) << lsh;
                }
                return value;
            },
            set(value) {
                for (const [index, mask = 0xff, shift = 0] of bits) {
                    const lsh = shift < 0 ? -shift : 0;
                    const rsh = shift < 0 ? 0 : shift;
                    const v = (value >>> lsh) << rsh & mask;
                    this.data[index] = this.data[index] & ~mask | v;
                }
            },
        };
    }
    static booleanProp(bit) {
        const prop = DataTuple.prop(bit);
        return { get() { return !!prop.get.call(this); },
            set(value) { prop.set.call(this, +value); } };
    }
}
//# sourceMappingURL=util.js.map