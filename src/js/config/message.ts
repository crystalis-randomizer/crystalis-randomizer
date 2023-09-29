import {Minifloat} from 'minifloat';

const SCHEMA = Symbol('schema');

interface FieldSpec<N extends number, T> {
  readonly index: N;

  readonly default?: T|undefined;
  isDefault?: (val: T) => boolean;
  clamp?: (val: T) => T;

  toJson(val: T): unknown;
  toBinary(val: T): boolean|Uint8Array;
  fromJson(json: unknown): T;
  fromBinary(bin: boolean|Uint8Array): T;
}

interface EnumSpec {
  // TODO - ???
  spec: FieldSpecFactory<number>;
  values: number[];
  canonicalize(arg: number): string|undefined;
  parse(name: string): number|undefined;
}

interface FieldSpecFactory<T> {
  at<const N extends number>(index: N): FieldSpec<N, T>;
}

function primitiveDefault<T>(dv: T|undefined) {
  if (dv == null) return {};
  return {default: dv, isDefault: (v: T) => v === dv};
}

interface NumericOptions extends PrimitiveOptions<number> {
  range?: [number, number];
  false?: number, // if a range is given, defaults to min; else 0
  true?: number, // if a range is given, defaults to max; else 1
}
interface PrimitiveOptions<T> {
  default?: T;
}
interface IntOptions extends NumericOptions {
  enum?: EnumSpec;
}
interface FloatOptions extends NumericOptions {
  minifloat?: Minifloat;
}

// TODO - factor out commonalities here?

function numeric<const N extends number>(
    index: N,
    clamp: (v: number) => number,
    defaultVal: number|undefined,
    falseVal: number,
    trueVal: number,
    fromString: (v: string) => number,
    pack: (v: number) => Uint8Array,
    unpack: (a: Uint8Array) => number): FieldSpec<N, number> {
  return {
    index, ...primitiveDefault(defaultVal), clamp,
    toJson: (val: number) => clamp(val),
    toBinary: (val: number) => {
      val = clamp(val);
      return val === falseVal ? false : val === trueVal ? true : pack(val);
    },
    fromJson: (json: unknown) => clamp(
        typeof json === 'string' ? fromString(json) : Number(json)),
    fromBinary: (bin: boolean|Uint8Array) =>
      clamp(bin === false ? falseVal : bin === true ? trueVal : unpack(bin)),
  };
} 

const f8 = {
  at<const N extends number>(index: N, opts: FloatOptions = {}) {
    const mf = opts.minifloat || new Minifloat(1, 4, 3);
    const [min, max] = opts.range || [-Infinity, Infinity];
    const clamp = (v: number) => mf.round(Math.max(min, Math.min(v, max)));
    const falseVal = opts.false ?? opts.range ? min : 0;
    const trueVal = opts.true ?? opts.range ? max : 1;
    return numeric(
        index, clamp, opts.default, falseVal, trueVal, Number,
        v => Uint8Array.of(mf.toBits(v)), a => mf.fromBits(a[0]));
  }
} satisfies FieldSpecFactory<number>;

const u8 = {
  at<const N extends number>(index: N, opts: IntOptions = {}) {
    const [min, max] = opts.range || [0, 255];
    const clamp = (v: number) => Math.max(min, Math.min(v, max)) & 255;
    const falseVal = opts.false ?? opts.range ? min : 0;
    const trueVal = opts.true ?? opts.range ? max : 1;
    return numeric(
        index, clamp, opts.default, falseVal, trueVal,
        s => opts.enum?.parse(s) ?? Number(s),
        v => Uint8Array.of(v), a => a[0]);
  }
} satisfies FieldSpecFactory<number>;

const i8 = {
  at<const N extends number>(index: N, opts: IntOptions = {}) {
    const [min, max] = opts.range || [-128, 127];
    const clamp = (v: number) => Math.max(min, Math.min(v, max)) | 0;
    const falseVal = opts.false ?? opts.range ? min : 0;
    const trueVal = opts.true ?? opts.range ? max : 1;
    return numeric(
        index, clamp, opts.default, falseVal, trueVal,
        s => opts.enum?.parse(s) ?? Number(s),
        v => new Uint8Array(Int8Array.of(v).buffer),
        a => a[0] > 127 ? a[0] - 256 : a[0]);
  }
} satisfies FieldSpecFactory<number>;

const bool = {
  at<const N extends number>(index: N, opts: PrimitiveOptions<boolean> = {}) {
    return {
      index, ...primitiveDefault(opts.default),
      toJson: (val: boolean) => val,
      toBinary: (val: boolean) => val,
      fromJson: (json: unknown) => Boolean(json),
      fromBinary: (bin: boolean|Uint8Array) =>
        typeof bin === 'boolean' ? bin : Boolean(bin[0]) || bin.length > 1,
    };
  }
} satisfies FieldSpecFactory<boolean>;

const str = {
  at<const N extends number>(index: N, opts: PrimitiveOptions<string> = {}) {
    return {
      index, ...primitiveDefault(opts.default),
      toJson: (val: string) => val,
      toBinary: (val: string) => {
        if (!val) return false;
        return val === '' ? false : new TextEncoder().encode(val);
      },
      fromJson: (json: unknown) => String(json),
      fromBinary: (bin: boolean|Uint8Array) =>
        typeof bin === 'boolean' ? '' :
        new TextDecoder().decode(Uint8Array.from(bin)),
    };
  }
} satisfies FieldSpecFactory<string>;


export abstract class Message {
  abstract readonly [SCHEMA]: MessageSchema;

  toJson(): object {
    const json = {} as Record<string, unknown>;
    for (const [key, spec] of this[SCHEMA].byName) {
      // TODO - what kind of normalization is needed?
      const value = (this as any)[key];
      json[key] = value instanceof Message ? value.toJson() : spec.toJson(value);
    }
    return json;
  }

  mergeJson(json: object) {
    // TODO - accept differently capitalized/spelled keys???
    for (const [key, spec] of this[SCHEMA].byName) {
      const value = (json as any)[key];
      if (value != null) (this as any)[key] = spec.fromJson(value);
    }
  }

  trim() {
    for (const [key, spec] of this[SCHEMA].byName) {
      assertType<keyof this>(key);
      if (spec.isDefault && spec.isDefault(this[key])) delete this[key];
    }
    return this;
  }

  fill() {
    for (const [key, spec] of this[SCHEMA].byName) {
      assertType<keyof this>(key);
      if (this[key] == undefined && spec.default != undefined) {
        this[key] = spec.default;
      }
    }
    return this;
  }

  toJson() {
    const json: Record<any, any> = {};
    const key = 0;
    for (const [key, spec] of this[SCHEMA].byName) {
      assertType<keyof this>(key);
      const val = this[key];
      if (val != undefined && !spec.isDefault(val)) {
        json[key] = spec.toJson(val);
      }
    }
    return json;
  }

  static fromJson<U extends {new(): Message}>(this: U, json: object): InstanceType<U> {
    const message = new this();
    message.mergeJson(json);
    return message as InstanceType<U>;
  }

  static fromBinary<U extends {new(): Message}>(this: U, bin: Uint8Array): InstanceType<U> {
    // TODO - binary serialization format here
    return null!;
  }
}

interface MessageCtor<T, M=Flatten<NonNever<Unfields<T>>&Message>> {
  new(): M;
  fromJson<U extends {new(): M}>(this: U, json: unknown): InstanceType<U>;
  fromBinary<U extends {new(): M}>(this: U, bin: Uint8Array): InstanceType<U>;
}
type Unfields<T> = {[K in keyof T]?: T[K] extends FieldSpec<any, infer U> ? U : never};
type Flatten<T> = T extends object ? {[K in keyof T]: T[K]} : T;
type NonNever<T> = Pick<T, {[K in keyof T]: T[K] extends never ? never : K}[keyof T]>;

// check uniqueness of field indices (unfortunately can't give good errors...)
type OmitField<T, N extends number, F> =
  {[K in keyof T]: K extends F ? never : T[K] extends FieldSpec<N, any> ? true : never}[keyof T];
type QueryUnique<T> =
  {[K in keyof T]: K extends 'prototype' ? never :
                   T[K] extends FieldSpec<infer N, any> ? OmitField<T, N, K> :
                   true};
type CheckUnique<T> = true extends QueryUnique<T>[keyof T] ? [never] : [];


export namespace Message {
  export function Base<T extends {new(): object}>(ctor: T, ..._: CheckUnique<T>): MessageCtor<T> {
    let schema: MessageSchema|undefined;
    return class extends Message {
      get [SCHEMA]() {
        return schema || (schema = makeSchema(new ctor()));
      }
    } as any;
  }
}

function makeSchema(prototype: object): MessageSchema {
  const byName = new Map<string, FieldSpec<any, any>>();
  const byIndex = new Map<number, FieldSpec<any, any>>();
  const seen = new Set<number>();
  for (const [name, spec] of Object.entries(prototype)) {
    const index = spec.index;
    if (seen.has(index)) throw new Error(`duplicate ordinal ${index}`);
    byName.set(name, spec);
    byIndex.set(index, spec);
  }
  return {byName, byIndex};
}

interface MessageSchema {
  byName: Map<string, FieldSpec<any, any>>;
  byIndex: Map<number, FieldSpec<any, any>>;
}


class Foo extends Message.Base(class {
  foo = u8.at(1, {range: [0, 10]});
  fooo = i8.at(2, {default: 4});
  bar = str.at(7, {default: 'hello'});
  baz = bool.at(3);
  corge = f8.at(5, {minifloat: new Minifloat(1, 4, 3)});
  // allows yaml parser to accept human-readable names
  // qux = u8.at(4, {enum: CheckName});
  //force = map(CheckName, ItemName).at(6);
}) {}


const foo = Foo.fromJson({});
console.dir(foo);
foo.fill();
console.dir(foo);
foo.trim();
console.dir(foo);

function assertType<T>(arg: unknown): asserts arg is T {}


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


