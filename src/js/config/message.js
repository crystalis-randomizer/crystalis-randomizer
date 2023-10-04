import { Minifloat } from 'minifloat';
const SCHEMA = Symbol('schema');
function primitiveDefault(dv) {
    if (dv == null)
        return {};
    return { default: dv, isDefault: (v) => v === dv };
}
// TODO - factor out commonalities here?
function numeric(index, clamp, defaultVal, falseVal, trueVal, fromString, pack, unpack) {
    return {
        index, ...primitiveDefault(defaultVal), clamp,
        toJson: (val) => clamp(val),
        toBinary: (val) => {
            val = clamp(val);
            return val === falseVal ? false : val === trueVal ? true : pack(val);
        },
        fromJson: (json) => clamp(typeof json === 'string' ? fromString(json) : Number(json)),
        fromBinary: (bin) => clamp(bin === false ? falseVal : bin === true ? trueVal : unpack(bin)),
    };
}
const f8 = {
    at(index, opts = {}) {
        const mf = opts.minifloat || new Minifloat(1, 4, 3);
        const [min, max] = opts.range || [-Infinity, Infinity];
        const clamp = (v) => mf.round(Math.max(min, Math.min(v, max)));
        const falseVal = opts.false ?? opts.range ? min : 0;
        const trueVal = opts.true ?? opts.range ? max : 1;
        return numeric(index, clamp, opts.default, falseVal, trueVal, Number, v => Uint8Array.of(mf.toBits(v)), a => mf.fromBits(a[0]));
    }
};
const u8 = {
    at(index, opts = {}) {
        const [min, max] = opts.range || [0, 255];
        const clamp = (v) => Math.max(min, Math.min(v, max)) & 255;
        const falseVal = opts.false ?? opts.range ? min : 0;
        const trueVal = opts.true ?? opts.range ? max : 1;
        return numeric(index, clamp, opts.default, falseVal, trueVal, s => opts.enum?.parse(s) ?? Number(s), v => Uint8Array.of(v), a => a[0]);
    }
};
const i8 = {
    at(index, opts = {}) {
        const [min, max] = opts.range || [-128, 127];
        const clamp = (v) => Math.max(min, Math.min(v, max)) | 0;
        const falseVal = opts.false ?? opts.range ? min : 0;
        const trueVal = opts.true ?? opts.range ? max : 1;
        return numeric(index, clamp, opts.default, falseVal, trueVal, s => opts.enum?.parse(s) ?? Number(s), v => new Uint8Array(Int8Array.of(v).buffer), a => a[0] > 127 ? a[0] - 256 : a[0]);
    }
};
const bool = {
    at(index, opts = {}) {
        return {
            index, ...primitiveDefault(opts.default),
            toJson: (val) => val,
            toBinary: (val) => val,
            fromJson: (json) => Boolean(json),
            fromBinary: (bin) => typeof bin === 'boolean' ? bin : Boolean(bin[0]) || bin.length > 1,
        };
    }
};
const str = {
    at(index, opts = {}) {
        return {
            index, ...primitiveDefault(opts.default),
            toJson: (val) => val,
            toBinary: (val) => {
                if (!val)
                    return false;
                return val === '' ? false : new TextEncoder().encode(val);
            },
            fromJson: (json) => String(json),
            fromBinary: (bin) => typeof bin === 'boolean' ? '' :
                new TextDecoder().decode(Uint8Array.from(bin)),
        };
    }
};
export class Message {
    toJson() {
        const json = {};
        for (const [key, spec] of this[SCHEMA].byName) {
            // TODO - what kind of normalization is needed?
            const value = this[key];
            json[key] = value instanceof Message ? value.toJson() : spec.toJson(value);
        }
        return json;
    }
    mergeJson(json) {
        // TODO - accept differently capitalized/spelled keys???
        for (const [key, spec] of this[SCHEMA].byName) {
            const value = json[key];
            if (value != null)
                this[key] = spec.fromJson(value);
        }
    }
    trim() {
        for (const [key, spec] of this[SCHEMA].byName) {
            assertType(key);
            if (spec.isDefault && spec.isDefault(this[key]))
                delete this[key];
        }
        return this;
    }
    fill() {
        for (const [key, spec] of this[SCHEMA].byName) {
            assertType(key);
            if (this[key] == undefined && spec.default != undefined) {
                this[key] = spec.default;
            }
        }
        return this;
    }
    toJson() {
        const json = {};
        const key = 0;
        for (const [key, spec] of this[SCHEMA].byName) {
            assertType(key);
            const val = this[key];
            if (val != undefined && !spec.isDefault(val)) {
                json[key] = spec.toJson(val);
            }
        }
        return json;
    }
    static fromJson(json) {
        const message = new this();
        message.mergeJson(json);
        return message;
    }
    static fromBinary(bin) {
        // TODO - binary serialization format here
        return null;
    }
}
(function (Message) {
    function Base(ctor, ..._) {
        let schema;
        return class extends Message {
            get [SCHEMA]() {
                return schema || (schema = makeSchema(new ctor()));
            }
        };
    }
    Message.Base = Base;
})(Message || (Message = {}));
function makeSchema(prototype) {
    const byName = new Map();
    const byIndex = new Map();
    const seen = new Set();
    for (const [name, spec] of Object.entries(prototype)) {
        const index = spec.index;
        if (seen.has(index))
            throw new Error(`duplicate ordinal ${index}`);
        byName.set(name, spec);
        byIndex.set(index, spec);
    }
    return { byName, byIndex };
}
class Foo extends Message.Base(class {
    foo = u8.at(1, { range: [0, 10] });
    fooo = i8.at(2, { default: 4 });
    bar = str.at(7, { default: 'hello' });
    baz = bool.at(3);
    corge = f8.at(5, { minifloat: new Minifloat(1, 4, 3) });
}) {
}
const foo = Foo.fromJson({});
console.dir(foo);
foo.fill();
console.dir(foo);
foo.trim();
console.dir(foo);
function assertType(arg) { }
// class CheckName extends Message.Enum(class {
//   // automatic lowercase and underscore-to-space ....?
//   LEAF_ELDER = 1;
//   BAR = 2;
//   BAZ = 3;
// }) {}
// type Filled<T> = T extends Message<T> ?
//   Flatten<WithOptional<{[K in keyof T]-?: NonNullable<T[K]> extends {default: {}} ? NonNullable<T[K]> : T[K]}>>
// interface Spec {
//   fromJson(arg: unknown): unknown
// }
