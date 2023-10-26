// Defines a Val type for an expression

import { BoolFieldInfo, EnumFieldInfo, EnumInfo, FieldInfo, MapFieldInfo, MessageFieldInfo, NumberFieldInfo, PrimitiveFieldInfo, RepeatedFieldInfo, StringFieldInfo } from "./info.js";
import type { Mutation } from "./mutation.js";

// interface Reporter {
//   report(msg: string): void;
// }

// NOTE: These methods will only see value types like 

// Subtypes:
//   - primitives (Num, Str, Bool, Enum, Nul)
//   - objects (Obj, Arr), which may have proto info's attached
//   - Err, Rand, Mut  =>  these will never be passed to the methods,
//     but are handled directly by Evaluator.
export abstract class Val {
  at(index: BasicVal): Val { return Err.of(`cannot index non-object ${this}[${index}]`); }
  call(args: BasicVal[], _ctx: CallContext): Val {
    return Err.of(`cannot call non-function ${this}(${args.join(', ')})`);
  }

  isBasic(): this is BasicVal { return false; }
  isExotic(): this is ExoticVal { return false; }
  isErr(): this is Err { return false; }
  withInfo(i: FieldInfo): Val { return this; }

  toNum(): number|Err { return Err.of(`cannot number-coerce ${this}`); }
  toStr(): string|Err { return Err.of(`cannot string-coerce ${this}`); }
  toBool(): boolean|Err { return Err.of(`cannot boolean-coerce ${this}`); }
  toEnum(info: EnumInfo): number|Err {
    return Err.of(`cannot enum-coerce ${this} to ${info}`);
  }
  toKey(f?: FieldInfo): string|number|Err { return Err.of(`cannot coerce ${this} to keyof ${f}`); }

  pos(): Val { return Err.of(`cannot do unary plus on ${this}`); }
  not(): Val { return Err.of(`cannot do not on ${this}`); }
  cpl(): Val { return Err.of(`cannot do bitwise complement on ${this}`); }
  neg(): Val { return Err.of(`cannot do unary minus on ${this}`); }

  add(that: BasicVal): Val { return Err.of(`cannot add ${this} + ${that}`); }
  sub(that: BasicVal): Val { return Err.of(`cannot subtract ${this} - ${that}`); }
  mul(that: BasicVal): Val { return Err.of(`cannot multiply ${this} * ${that}`); }
  div(that: BasicVal): Val { return Err.of(`cannot divide ${this} / ${that}`); }
  mod(that: BasicVal): Val { return Err.of(`cannot mod ${this} % ${that}`); }
  pow(that: BasicVal): Val { return Err.of(`cannot exponentiate ${this} ** ${that}`); }
  asl(that: BasicVal): Val { return Err.of(`cannot shift ${this} << ${that}`); }
  asr(that: BasicVal): Val { return Err.of(`cannot shift ${this} >> ${that}`); }
  lsr(that: BasicVal): Val { return Err.of(`cannot shift ${this} >>> ${that}`); }
  and(that: BasicVal): Val { return Err.of(`cannot bitwise and ${this} & ${that}`); }
  or(that: BasicVal): Val { return Err.of(`cannot bitwise or ${this} | ${that}`); }
  xor(that: BasicVal): Val { return Err.of(`cannot bitwise xor ${this} ^ ${that}`); }

  eq(that: BasicVal): boolean { return this === that; }
  cmp(that: BasicVal): number|Err { return Err.of(`cannot compare ${this} to ${that}`); }
}

export abstract class BasicVal extends Val {
  isBasic() { return true; }
}
export abstract class ExoticVal extends Val {
  isExotic() { return true; }
}

export type Prim = Num|Str|Bool|Enum|typeof NUL;

export interface CallContext {
  lvalue?: LValue;
}

export class Err extends ExoticVal {
  constructor(readonly errors: string[]) { super(); }
  static of(err: string) { return new Err([err]); }
  toString() { return `ERROR{${this.errors.join(',')}}`; }
  isErr() { return true; }
  toKey() { return this; }
}

export class ErrBuilder {
  private errors: string[] = [];
  private random = false;
  ok(): boolean { return !this.errors.length && !this.random; }
  build(): Err|undefined {
    return this.errors.length ? new Err(this.errors) : this.random ? RANDOM : undefined;
  }
  push(err: string): ErrBuilder {
    this.errors.push(err);
    return this;
  }
  report(err: string) {
    this.errors.push(err);
  }
  fatal(err: string): Err {
    return this.push(err).build()!;
  }
  isError(v: unknown): v is Err|Mut|Rand {
    if (isErr(v)) {
      this.errors.push(...v.errors);
      return true;
    } else if (v instanceof Mut) {
      this.errors.push(`cannot compose assignment result`);
      return true;
    } else if (v instanceof Rand) {
      this.random = true;
      return true;
    }
    return false;
  }
  check(v: Val): Val {
    this.isError(v);
    return v;
  }
}

export function isErr(v: unknown): v is Err {
  return v instanceof Err;
}

export class Num extends BasicVal {
  constructor(readonly num: number) { super(); }
  toString() { return String(this.num); }

  toNum() { return this.num; }
  toStr() { return String(this.num); }
  toBool() { return Boolean(this.num); }
  toEnum(info: EnumInfo) {
    const err = new ErrBuilder();
    const name = info.coerce(this.num, err);
    return !err.ok() ? err.build()! : name ? info.enum.values[name] : super.toEnum(info);
  }
  toKey(f?: FieldInfo) {
    if (!f || f instanceof RepeatedFieldInfo) return this.num;
    if (f instanceof MessageFieldInfo) return Err.of(`cannot use number as message key`);
    if (f instanceof MapFieldInfo) {
      if (f.key instanceof NumberFieldInfo) return this.num;
      if (f.key instanceof EnumFieldInfo) return this.toEnum(f.key.enum);
    }
    return Err.of(`cannot use number as keyof ${f}`);
  }

  add(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot add ${this} + ${that} (non-number)`);
    return new Num(this.num + that.num);
  }
  sub(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot subtract ${this} - ${that} (non-number)`);
    return new Num(this.num - that.num);
  }
  mul(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot multiply ${this} * ${that} (non-number)`);
    return new Num(this.num * that.num);
  }
  div(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot divide ${this} / ${that} (non-number)`);
    return new Num(this.num / that.num);
  }
  mod(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot mod ${this} % ${that} (non-number)`);
    return new Num(this.num % that.num);
  }
  pow(that: BasicVal) {
    if (!(that instanceof Num)) {
      return Err.of(`cannot exponentiate ${this} ** ${that} (non-number)`);
    }
    return new Num(this.num ** that.num);
  }
  asl(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot shift ${this} << ${that} (non-number)`);
    return new Num(this.num << that.num);
  }
  asr(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot shift ${this} >> ${that} (non-number)`);
    return new Num(this.num >> that.num);
  }
  lsr(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot shift ${this} >>> ${that} (non-number)`);
    return new Num(this.num >>> that.num);
  }
  and(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot bitwise and ${this} & ${that} (non-number)`);
    return new Num(this.num & that.num);
  }
  or(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot bitwise or ${this} | ${that} (non-number)`);
    return new Num(this.num | that.num);
  }
  xor(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot bitwise xor ${this} & ${that} (non-number)`);
    return new Num(this.num ^ that.num);
  }
  eq(that: BasicVal): boolean { return that instanceof Num && this.num === that.num; }
  cmp(that: BasicVal) {
    if (!(that instanceof Num)) return Err.of(`cannot compare ${this} to ${that} (non-number)`);
    return this.num < that.num ? -1 : this.num > that.num ? 1 : 0;
  }   
}

export class Str extends BasicVal {
  constructor(readonly str: string) { super(); }
  toString() { return JSON.stringify(this.str); }

  toStr() { return this.str; }
  toBool() { return Boolean(this.str); }
  toEnum(info: EnumInfo) {
    const err = new ErrBuilder();
    const name = info.coerce(this.str, err);
    return !err.ok() ? err.build()! : name ? info.enum.values[name] : super.toEnum(info);
  }
  toKey(f?: FieldInfo) {
    if (!f) return this.str;
    if (f instanceof MessageFieldInfo) {
      return f.type.field(this.str)?.name || Err.of(`unknown message field ${this} for ${f}`);
    } else if (f instanceof MapFieldInfo) {
      if (f.key instanceof StringFieldInfo) return this.str;
      if (f.key instanceof EnumFieldInfo) return this.toEnum(f.key.enum);
    }
    return Err.of(`cannot use string as keyof ${f}`);
  }

  add(that: BasicVal) {
    if (!(that instanceof Str)) return Err.of(`cannot add ${this} + ${that} (non-string)`);
    return new Str(this.str + that.str);
  }
  eq(that: BasicVal): boolean { return that instanceof Str && this.str === that.str; }
  cmp(that: BasicVal) {
    if (!(that instanceof Str)) return Err.of(`cannot compare ${this} to ${that} (non-string)`);
    return this.str < that.str ? -1 : this.str > that.str ? 1 : 0;
  }
}

export class Bool extends BasicVal {
  constructor(readonly value: boolean) { super(); }

  static FALSE = new Bool(false);
  static TRUE = new Bool(true);
  static of(value: boolean): Bool { return value ? Bool.TRUE : Bool.FALSE; }

  toString() { return String(this.value); }

  // toKey(f?: FieldInfo) {
  //   if (f instanceof MapFieldInfo) {
  //     // TODO - what is this?
  //     if (f.key instanceof BoolFieldInfo) return String(this.value);
  //   }
  //   return Err.of(`cannot use boolean as keyof ${f}`);
  // }

  toBool() { return this.value; }
  toNum() { return this.value ? 1 : 0; }  
  eq(that: BasicVal): boolean { return that instanceof Bool && this.value === that.value; }
}

export const NUL = new class Nul extends BasicVal {
  constructor() { super(); }

  toString() { return 'null'; }

  toBool() { return false; }
  eq(that: BasicVal): boolean { return this === that; }
}();

export class Enum extends BasicVal {
  private constructor(
    readonly ord: number,
    readonly name: string,
    readonly info: EnumInfo) { super(); }

  static of(id: string|number|boolean, info: EnumInfo): Enum|Err {
    const err = new ErrBuilder();
    const name = info.coerce(id, err);
    if (name == undefined) return err.build() || Err.of(`bad ${info}: ${id}`);
    const ord = info.enum.values[name];
    return new Enum(ord, name, info);
  }

  toString() { return `${this.info}.${this.name}`; }

  withInfo(info: FieldInfo): Val {
    // ???
    if (info instanceof EnumFieldInfo) {
      if (info.enum === this.info) return this;
    }
    return Err.of(`cannot replace enum info ${this.info} with ${info}`);
  }

  toNum() { return this.ord; }
  toStr() { return this.name; }
  toEnum(target: EnumInfo) {
    if (target !== this.info) return Err.of(`incompatible enum: want ${target}, got ${this.info}`);
    return this.ord;
  }
  toBool() { return Boolean(this.ord); }

  toKey(f?: FieldInfo) {
    if (!f) return this.ord;
    if (f instanceof MapFieldInfo) {
      if (f.key instanceof EnumFieldInfo) return this.toEnum(f.key.enum);
    }
    return Err.of(`cannot use enum as keyof ${f}`);
  }

  cmp(that: BasicVal): number|Err {
    if (that instanceof Enum) {
      if (that.info !== this.info) {
        return Err.of(`incompatible enum for cmp: ${that.info} and ${this.info}`);
      }
      return this.ord < that.ord ? -1 : this.ord > that.ord ? 1 : 0;
    }
    return Err.of(`cannot compare enum ${this} to non-enum ${that}`);
  }
  eq(that: BasicVal): boolean {
    return that instanceof Enum && that.info === this.info && that.ord === this.ord;
  }
}

export class Arr extends BasicVal {
  constructor(readonly arr: unknown[], readonly field?: RepeatedFieldInfo) { super(); }

  toString() { return `(Array)`; }

  withInfo(info: FieldInfo): Val { return wrapValue(this.obj, info) }
  toBool() { return true; }
  checkField(that: Arr): Err|undefined {
    if (this.field && that.field) {
      if (this.field.element.type !== that.field.element.type) {
        return Err.of(`incompatible array types: ${
                       this.field.element.type}[] and ${that.field.element.type}[]`);
      }
    }
    return undefined;
  }
  add(that: BasicVal) {
    // adding arrays concatenates; fields must be compat if both present
    if (that instanceof Arr) {
      const err = this.checkField(that);
      return err || new Arr([...this.arr, ...that.arr], this.field || that.field);
    }
    return Err.of(`array concatenation (+) with non-array ${that}`);
  }

  sub(that: BasicVal) {
    // subtracting arrays does a (multi)set difference
    if (!(that instanceof Arr)) return Err.of(`array difference (-) with non-array ${that}`);
    const err = this.checkField(that);
    if (err) return err;
    if (!this.field) return Err.of(`array subtraction with unknown type not allowed`);
    if (!(this.field instanceof PrimitiveFieldInfo)) {
      return Err.of(`array substraction with non-primitive field ${this.field} not allowed`);
    }
    const remove = [...that.arr];
    return new Arr(this.arr.filter(x => {
      const i = remove.indexOf(x);
      if (i >= 0) remove.splice(i, 1);
      return i < 0;
    }));
  }

  at(index: BasicVal) {
    if (index instanceof Num) { // NOTE: must be exactly a number.
      return wrapValue(this.arr[index.num], this.field?.element);
    } else if (index instanceof Str) {
      switch (index.str) {
        case 'length': return new Num(this.arr.length);
        case 'has':
          if (!this.field || !(this.field instanceof PrimitiveFieldInfo)) {
            return Err.of(`Array.has requires known primitive fields`);
          }
          return new Func('Array.has', (x) => Bool.of(this.arr.includes(x)));
      }
      return Err.of(`not a known array member: ${index.str}`);
    }
    return Err.of(`bad index type for array: ${index}`);
  }
}

export class Obj extends BasicVal {
  constructor(readonly obj: object) { super(); }

  toString() { return `(Object)`; }
  withInfo(info: FieldInfo): Val { return wrapValue(this.obj, info) }

  toBool() { return true; }
  at(index: BasicVal) {
    const i = index instanceof Str ? index.str : index.toNum() ?? Err.of(`bad index: ${index}`);
    if (isErr(i)) return i;
    return wrapValue((this.obj as any)[i]);
  }
}

class ObjMsg extends Obj {
  constructor(obj: object, readonly info: MessageFieldInfo) { super(obj); }
  withInfo(info: FieldInfo): Val { return wrapValue(this.obj, info) }
  at(index: BasicVal) {
    if (index instanceof Str) {
      const f = this.info.type.field(index.str);
      if (f == undefined) return Err.of(`unknown field ${index} in ${this.info}`);
      return wrapValue((this.obj as any)[f.name], f);
    } else {
      return Err.of(`cannot index message ${this.info} with non-string ${index}`);
    }
  }
  // TODO - add to merge?
}

class ObjMap extends Obj {
  constructor(obj: object, readonly info: MapFieldInfo) { super(obj); }
  withInfo(info: FieldInfo): Val { return wrapValue(this.obj, info) }
  at(index: BasicVal) {
    // deal with info.key
    let k!: number|string;
    if (this.info.key instanceof NumberFieldInfo) {
      if (index instanceof Num) {
        k = index.num;
      } else {
        return Err.of(`cannot index number-keyed map with ${index}`);
      }
    } else if (this.info.key instanceof StringFieldInfo) {
      if (index instanceof Str) {
        k = index.str;
      } else {
        return Err.of(`cannot index string-keyed map with ${index}`);
      }
    } else if (this.info.key instanceof EnumFieldInfo) {
      // handle enums, nums, and strs
      const e = index.toEnum(this.info.key.enum);
      if (isErr(e)) return e;
      k = e;
    } else {
      return Err.of(`bad map key type: ${this.info.key}`);
    }
    return wrapValue((this.obj as any)[k], this.info.value);
  }
  // TODO - add to merge?
}

export class Func extends BasicVal {
  constructor(readonly name: string,
              readonly call: (args: Val[], ctx: CallContext) => Val) {
    super();
  }
  toString() { return this.name; }
}


export class Mut extends ExoticVal {
  constructor(readonly mutations: Mutation[]) { super(); }

  withRandom(): Mut {
    return new Muw(this.mutations.map(m => {...m, random: true}));
  }
  withPreset(preset: string): Mut {
    return new Mut(this.mutations.map(m => {...m, preset}));
  }
}

export class Rand extends ExoticVal {}
export class Pick extends Rand {
  constructor(readonly preset?: string) { super(); }
}
export const RANDOM = new Rand();
export const PICK = new Pick();

export function wrapValue(value: unknown, info?: FieldInfo): Val {
  if (value instanceof Val) {
    if (info) {
      if (value instanceof Arr && value.field !== info) {
        return Err.of(`cannot overwrite incompatible info`);
      } else if (value instanceof ObjMsg && value.info !== info) {
        return Err.of(`cannot overwrite incompatible info`);
      } else if (value instanceof ObjMap && value.key !== info) {
        return Err.of(`cannot overwrite incompatible info`);
      }
      // TODO - if it's an object or array, we need to add info?!?
    }
    // no info, just return as-is?
    return value;
  }

  if (info) {
    if (info instanceof NumberFieldInfo) {
      // TODO - handle null???
      if (typeof value !== 'number') {
        return Err.of(`expected number for field ${info}, got ${value}`);
      }
      return new Num(value);
    } else if (info instanceof StringFieldInfo) {
      if (typeof value !== 'string') {
        return Err.of(`expected string for field ${info}, got ${value}`);
      }
      return new Str(value);
    } else if (info instanceof EnumFieldInfo) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return Enum.of(value, info.enum);
      }
      return Err.of(`expected string or number for field ${info}, got ${value}`);
    } else if (info instanceof BoolFieldInfo) {
      if (typeof value === 'boolean') return Bool.of(value);
      if (typeof value === 'number') return Bool.of(Boolean(value));
      // allow numbers but not strings (how would "false" resolve?)
      return Err.of(`expected boolean of number for field ${info}, got ${value}`);
    } else if (info instanceof RepeatedFieldInfo) {
      if (!Array.isArray(value)) return Err.of(`expected array for field ${info}, got ${value}`);
      // TODO - check the element types?!?
      return new Arr(value, info);
    } else if (info instanceof MapFieldInfo) {
      if (!value || typeof value !== 'object') {
        return Err.of(`expected object for field ${info}, got ${value}`);
      }
      // NOTE: we may need to coerce enum keys, which must be numbers internally
      if (info.key instanceof EnumFieldInfo) {
        // TODO - how to handle bad fields? failfast or ignore?
        const mapped: any = {};
        for (const [k, v] of Object.entries(value)) {
          const key = info.key.enum.coerceOrd(/^[1-9][0-9]*$/.test(k) ? Number(k) : k);
          if (key != undefined) {
            mapped[key] = v;
          }
        }
        value = mapped;
      }
      return new ObjMap(value as object, info);
    } else if (info instanceof MessageFieldInfo) {
      if (!value || typeof value !== 'object') {
        return Err.of(`expected object for field ${info}, got ${value}`);
      }
      // we need to fix any bad keys
      const mapped: any = {};
      for (const [k, v] of Object.entries(value)) {
        const f = info.type.field(k);
        if (f != undefined) {
          mapped[f.name] = v;
        }
      }
      return new ObjMsg(mapped, info);
    }
    return Err.of(`unknown field type: ${info}`);
  }

  // no info - just use the runtime type
  if (typeof value === 'string') {
    return new Str(value);
  } else if (typeof value === 'number') {
    return new Num(value);
  } else if (typeof value === 'boolean') {
    return Bool.of(value);
  } else if (value == undefined) {
    return NUL; // any checks?
  } else if (Array.isArray(value)) {
    return new Arr(value);
  } else if (typeof value === 'object') {
    return new Obj(value);
  }
  return Err.of(`unknown type to wrap ${typeof value}`);
}

// function checkField(wrapped: Val, info: FieldInfo): Err|undefined {
//   // check the type
//   // TODO - allow NUL for any type?
//   if (info instanceof StringFieldInfo) {
//     if (!(wrapped instanceof Str)) {
//       return Err.of(`expected string for field ${info}, got ${wrapped}`);
//     }
//   } else if (info instanceof NumberFieldInfo) {
//     if (!(wrapped instanceof Num)) {
//       return Err.of(`expected number for field ${info}, got ${wrapped}`);
//     }
//   } else if (info instanceof BoolFieldInfo) {
//     if (!(wrapped instanceof Bool)) {
//       return Err.of(`expected bool for field ${info}, got ${wrapped}`);
//     }
//   } else if (info instanceof RepeatedFieldInfo) {
//     if (wrapped instanceof Arr) {
//       // TODO - check individual elements???
//     } else {
//       return Err.of(`expected array for repeated field ${info}, got ${wrapped}`);
//     }
//   } else if (info instanceof MapFieldInfo) {
//     if (wrapped instanceof Obj) {
//       // TODO - check individual elements???
//     } else {
//       return Err.of(`expected object for map field ${info}, got ${wrapped}`);
//     }
//   } else if (info instanceof MessageFieldInfo) {
//     if (wrapped instanceof Obj) {
//       // TODO - check individual elements???
//     } else {
//       return Err.of(`expected object for message field ${info}, got ${wrapped}`);
//     }
//   } else if (info instanceof EnumFieldInfo) {
//     // NOTE: should never happen??
//     const err = wrapped.toEnum(info.enum);
//     if (isErr(err)) return Err.of(`expected enum ${info.enum}, got ${wrapped}`);
//   } else {
//     return Err.of(`unknown field type: ${info}`);
//   }
//   return undefined;
// }
