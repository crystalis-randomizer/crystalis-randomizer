import { Type, Field, MapField, Enum } from 'protobufjs';
import { assert } from './assert.js';

export interface Reporter {
  report(error: string): void;
}

export function resolve(t: Type): TypeInfo;
export function resolve(e: Enum): EnumInfo;
export function resolve(f: Field): FieldInfo;
export function resolve(o: unknown): unknown {
  const r = resolved.get(o);
  if (r != null) return r;
  if (o instanceof Type) return TypeInfo.resolve(o);
  if (o instanceof Enum) return EnumInfo.resolve(o);
  if (o instanceof Field) return FieldInfo.resolve(o);
  assert(false);
}
const resolved = new Map<unknown, unknown>();

export type Visitor<T> = (field: FieldInfo, value: unknown, data: T) => void;

export function qnameVisitor(elementVisitor: (f: FieldInfo, v: unknown, qname: string) => void
                            ): Visitor<string> {
  const visitElement = (f: FieldInfo, v: unknown, name: string) => {
    if (f instanceof MessageFieldInfo) {
      f.type.visit(v as object, visitor, name + '.');
    } else {
      elementVisitor(f, v, name);
    }
  };
  const visitor = (f: FieldInfo, v: unknown, data: string) => {
    const name = data + f.name;
    if (f instanceof RepeatedFieldInfo) {
      if (!Array.isArray(v)) return;
      v.forEach((e, i) => visitElement(f.element, e, `${name}[${i}]`));
    } else if (f instanceof MapFieldInfo) {
      if (!v || typeof v !== 'object') return;
      for (const [mk, mv] of Object.entries(v)) {
        visitElement(f.value, mv, `${name}[${mk}]`);
      }
    } else {
      visitElement(f, v, name);
    }
  };
  return visitor;
}

export class TypeInfo {
  readonly fields = new Map<string, FieldInfo>();
  // TODO - any options?

  constructor(readonly type: Type) {}

  get name(): string { return this.type.name; }
  get fullName(): string { return qname(this.type); }

  field(name: string): FieldInfo|undefined {
    return this.fields.get(canonicalizeName(name));
  }

  coerce(value: unknown, reporter?: Reporter): unknown {
    if (value instanceof this.type.ctor) return value;
    if (value == undefined) return undefined;
    if (typeof value !== 'object') {
      reporter?.report(`Cannot coerce non-object to ${this.fullName}: ${value} (${typeof value})`);
      return undefined;
    }
    const o: any = this.type.create();
    for (const [k, v] of Object.entries(value)) {
      const f = this.field(k);
      if (f == undefined) {
        reporter?.report(`Unknown field "${k}" of ${this.fullName}`);
        continue;
      }
      o[f.name] = f.coerce(v, reporter);
    }
    return o;
  }

  // Return a new copy with defaults filled in
  fill(src: any): object {
    const dst: any = {};
    for (const f of this.fields.values()) {
      if (f instanceof RepeatedFieldInfo) {
        const e = f.element;
        if (e instanceof MessageFieldInfo && Array.isArray(src[f.name])) {
          dst[f.name] = src[f.name].map((v: object) => e.type.fill(v));
        } else if (Array.isArray(src[f.name])) {
          dst[f.name] = src[f.name];
        }
      } else if (f instanceof MapFieldInfo) {
        const e = f.value;
        const orig = src[f.name];
        if (e instanceof MessageFieldInfo && orig && typeof orig === 'object') {
          dst[f.name] = {};
          for (const [k, v] of Object.entries(orig)) {
            dst[f.name][k] = e.type.fill(v);
          }
        } else if (orig) {
          dst[f.name] = orig;
        }
      } else if (f instanceof MessageFieldInfo) {
        dst[f.name] = f.type.fill(src[f.name] || {});
      } else if (f instanceof PrimitiveFieldInfo && src[f.name] == undefined) {
        if (f.default != undefined) {
          dst[f.name] = f.default;
        }
      } else if (src[f.name] != undefined) {
        dst[f.name] = src[f.name];
      }
    }
    // note: will throw if anything is amiss
    return this.type.fromObject(dst);
  }

  visit(obj: object|null, visitor: Visitor<undefined>): void;
  visit<T>(obj: object|null, visitor: Visitor<T>, data: T): void;
  visit<T>(obj: object|null, visitor: Visitor<T>, data?: T): void {
    const names = obj ? Object.keys(obj) : this.type.fieldsArray.map(f => f.name);
    for (const name of names) {
      const value = obj ? (obj as any)[name] : undefined;
      const f = this.field(name);
      if (!f) continue;
      visitor(f, value, data as T);
    }
  }

  static resolve(t: Type) {
    t.resolve();
    const info = new TypeInfo(t);
    resolved.set(t, info);
    for (const field of t.fieldsArray) {
      const c = canonicalizeName(field.name);
      if (info.fields.has(c)) {
        throw new Error(`Canonicalized enum name conflict in ${t.fullName}: ${field.name} vs ${
                         info.fields.get(c)!.name}`);
      }
      info.fields.set(c, resolve(field));
    }
    return info;
  }
}
export class EnumInfo {
  enum: Enum;
  canonical = new Map<string, number>();

  constructor(e: Enum) {
    this.enum = e;
  }

  get name(): string { return this.enum.name; }
  get fullName(): string { return qname(this.enum); }

  coerce(value: unknown, reporter?: Reporter): string|undefined {
    if (value == undefined) return undefined;
    if (typeof value === 'boolean') value = String(value); // use true/false alias.
    if (typeof value === 'number') {
      const result = this.enum.valuesById[value];
      if (result == undefined) {
        reporter?.report(`Invalid ordinal ${value} for enum ${this.fullName}`);
      }
      return result;
    } else if (typeof value === 'string') {
      const result = this.canonical.get(canonicalizeName(value));
      if (result == undefined) {
        reporter?.report(`Invalid key ${value} for enum ${this.fullName}`);
      }
      return this.enum.valuesById[result!];
    }
    reporter?.report(`Cannot coerce to ${this.fullName}: ${value}`);
    return undefined;
  }

  static resolve(e: Enum): EnumInfo {
    const info = new EnumInfo(e);
    resolved.set(e, info);
    for (const [name, value] of Object.entries(e.values)) {
      assert(typeof name === 'string');
      assert(typeof value === 'number');
      const names = [name];
      const alias = e.valuesOptions?.[name];
      for (const a of alias ? String(alias).split(/,\s*/g) : []) {
        names.push(a);
      }
      // TODO - add aliases for (alias).x or something...?
      for (const n of names) {
        const c = canonicalizeName(n);
        if (info.canonical.has(c)) {
          throw new Error(`Canonicalized enum name conflict in ${e.fullName}: ${n} vs ${
                           e.valuesById[info.canonical.get(c)!]}`);
        }
        info.canonical.set(c, value);
      }
    }
    return info;
  }
}

export abstract class FieldInfo {
  constructor(readonly field: Field) {}
  get name(): string { return this.field.name; }
  get fullName(): string { return qname(this.field); }
  abstract resolve(): void;
  // TODO - implement?
  abstract coerce(value: unknown, reporter?: Reporter): unknown;

  static resolve(f: Field): FieldInfo {
    f.resolve();
    const sfi = singularFieldInfo(f.type, f.resolvedType, f);
    let fi: FieldInfo;
    if (f.repeated) {
      fi = new RepeatedFieldInfo(sfi);
    } else if (f.map) {
      assert(f instanceof MapField);
      assert(f.parent instanceof Type);
      const keyType = f.options?.['(key)'] || f.keyType;
      const resolvedKeyType = f.parent.lookup(keyType);
      fi = new MapFieldInfo(singularFieldInfo(keyType, resolvedKeyType, f), sfi);
    } else {
      fi = sfi;
    }
    resolved.set(f, fi);
    fi.resolve();
    return fi;
  }
}
export abstract class SingularFieldInfo extends FieldInfo {}
export class RepeatedFieldInfo extends FieldInfo {
  constructor(readonly element: SingularFieldInfo) { super(element.field); }
  resolve() { this.element.resolve(); }
  coerce(value: unknown, reporter?: Reporter): unknown {
    if (!Array.isArray(value)) {
      const result = this.element.coerce(value, reporter);
      return result != undefined ? [result] : [];
    }
    return value.map(v => this.element.coerce(v, reporter));
  }
}
export class MapFieldInfo extends FieldInfo {
  constructor(
    readonly key: SingularFieldInfo,
    readonly value: SingularFieldInfo) { super(value.field); }
  resolve() { this.key.resolve(); this.value.resolve(); }
  coerce(value: unknown, reporter?: Reporter): unknown {
    if (value == undefined) return undefined;
    if (typeof value !== 'object') {
      reporter?.report(`Cannot coerce non-object to map ${this.fullName}: ${
                        value} (${typeof value})`);
      return undefined;
    }
    const o: any = {};
    for (const [k, v] of Object.entries(value)) {
      const kc = this.key.coerce(k, reporter) as string|number|undefined;
      const vc = this.value.coerce(v, reporter);
      if (kc != undefined && vc != undefined) o[kc] = vc;
    }
    return o;
  }
}
export abstract class PrimitiveFieldInfo extends SingularFieldInfo {
  abstract readonly primitive: Primitive;
  abstract readonly default?: unknown;
  resolve() {}
}
export class NumberFieldInfo extends PrimitiveFieldInfo {
  readonly min: number;
  readonly max: number;
  readonly default?: number;
  readonly primitive: NumberPrimitive;
  readonly round: (arg: number) => number;
  
  constructor(field: Field) {
    super(field);
    let min, max: number;
    if (field.type === 'int32') {
      min = ~(max = 0x7fffffff);
      this.primitive = 'int32';
      this.round = Math.round;
    } else if (field.type === 'uint32') {
      min = 0; max = 0xffffffff;
      this.primitive = 'uint32';
      this.round = Math.round;
    } else if (field.type === 'float') {
      min = -(max = 3.402823e38);
      this.primitive = 'float';
      this.round = (x) => x;
    } else {
      throw Error(`Bad number type ${field.type}`);
    }
    const {'(min)': minOpt, '(max)': maxOpt, '(default)': defaultOpt} = field.options || {};
    this.min = minOpt != null ? this.round(Number(minOpt)) : min;
    this.max = maxOpt != null ? this.round(Number(maxOpt)) : max;
    this.default = defaultOpt != null ? this.round(Number(defaultOpt)) : undefined;
  }
  coerce(arg: unknown, reporter?: Reporter): number|undefined {
    if (arg == undefined) return undefined;
    if (typeof arg === 'string') {
      // NOTE: Number() does not understand negative with 0x prefix!
      arg = arg.trim();
      if ((arg as string).startsWith('-')) {
        arg = -Number((arg as string).substring(1));
      }
    }
    if (typeof arg !== 'number') {
      reporter?.report(`Cannot coerce non-number: ${arg} (${typeof arg})`);
      return undefined;
    }
    return Math.max(this.min, Math.min(this.round(Number(arg)), this.max));
  }
}
export class StringFieldInfo extends PrimitiveFieldInfo {
  readonly default?: number;
  readonly primitive: 'string' = 'string';

  constructor(field: Field) {
    super(field);
    assert(field.type === 'string');
    const {'(default)': defaultOpt} = field.options || {};
    this.default = defaultOpt != null ? defaultOpt : undefined;
  }
  coerce(arg: unknown): string {
    return String(arg);
  }
}
export class BoolFieldInfo extends PrimitiveFieldInfo {
  readonly default?: boolean;
  readonly primitive: 'bool' = 'bool';

  constructor(field: Field) {
    super(field);
    assert(field.type === 'string');
    const {'(default)': defaultOpt} = field.options || {};
    this.default = defaultOpt != null ? this.coerce(defaultOpt) : undefined;
  }
  coerce(arg: unknown): boolean {
    return typeof arg === 'string' && arg.toLowerCase() === 'false' ? false : Boolean(arg);
  }
}
export class EnumFieldInfo extends SingularFieldInfo {
  readonly enum!: EnumInfo;
  constructor(field: Field, private readonly e: Enum, private readonly isKey: boolean) { super(field); }
  resolve() { (this as any).enum = resolve(this.e); }
  coerce(value: unknown, reporter?: Reporter): unknown {
    const result = this.enum.coerce(value, reporter);
    if (result == undefined) return result;
    return this.isKey ? this.enum.enum.values[result] : result;
  }
}
export class MessageFieldInfo extends SingularFieldInfo {
  readonly type!: TypeInfo;
  constructor(field: Field, private readonly t: Type) { super(field); }
  resolve() { (this as any).type = resolve(this.t); }
  coerce(value: unknown, reporter?: Reporter): unknown {
    return this.type.coerce(value, reporter);
  }
}

function singularFieldInfo(type: string, resolvedType: unknown, f: Field, isKey = false) {
  if (resolvedType instanceof Type) {
    return new MessageFieldInfo(f, resolvedType);
  } else if (resolvedType instanceof Enum) {
    return new EnumFieldInfo(f, resolvedType, isKey);
  } else if (type === 'string') {
    return new StringFieldInfo(f);
  } else if (type === 'bool') {
    return new BoolFieldInfo(f);
  } else if (isPrimitive(type)) {
    return new NumberFieldInfo(f);
  }
  throw new Error(`Could not resolve type ${type} (${resolvedType}) of ${f.fullName}`);
}

// NOTE: We don't support any other primitive types!
type NumberPrimitive = 'float'|'int32'|'uint32';
type Primitive = 'bool'|'string'|NumberPrimitive;
// const primitives = new Map<Primitive, (arg: unknown) => unknown>([
//   // special handling for the string 'false'
//   ['bool', (x: unknown) => typeof x === 'string' && x.toLowerCase() === 'false' ? false : Boolean(x)], 
//   ['float', (x: unknown) => Math.fround(Number(x))],
//   ['int32', (x: unknown) => Math.max(-0x80000000, Math.min(Math.round(Number(x)), 0x7fffffff))],
//   ['string', String],
//   ['uint32', (x: unknown) => Math.max(0, Math.min(Math.round(Number(x)), 0xffffffff))],
// ]);
function isPrimitive(s: unknown): s is Primitive {
  return typeof s === 'string' && /^(bool|u?int32|float|string)$/.test(s);
}

function canonicalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/ig, '');
}

function qname(o: any): string {
  let name = o.name;
  while (o.parent != null) {
    o = o.parent;
    if (o.name) name = `${o.name}.${name}`;
  }
  return name;
}
