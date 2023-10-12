import { Config as ConfigPb, IConfig, ItemName, CheckName, LocationName } from '../../../target/build/config_proto.js';
import { Type, Field, MapField, Message, Enum } from 'protobufjs';
import * as jsep from 'jsep';
import jsepAssignment from '@jsep-plugin/assignment';
import jsepObject from '@jsep-plugin/object';

jsep.plugins.register(jsepAssignment, jsepObject);

export { ItemName, CheckName, LocationName };

export class ConfigSnapshot {
  constructor(
      readonly mystery: readonly jsep.Expression[],
      readonly presets: readonly string[],
      readonly nested: ReadonlyMap<string, ConfigSnapshot>,
      readonly fields: ReadonlyMap<string, Result>) {}

  // given a field, is it affected by any mystery exprs?
  //   - which presets are affected by mystery exprs?
  //     - do any of those affect the given flag?
  // build up a map of field -> preset
  // and a set of mystery-affected field/preset

  // carry this through a full UI update

}

interface Result {
  // value, if determined
  value?: unknown;
  // Whether the value is actually random
  random?: boolean;
  // Whether the value is a "simple" random
  simple?: boolean;
  // Preset that determined the result, if any
  preset?: string;
}

export interface Config extends ConfigPb {
  /** Fills in the default value for unspecified fields. */
  filled(): Config;
  /** Evaluates all the 'mystery' expressions. */
  evaluate(): Config;

  /** Trim out any unnecessary fields. */
  trim(): Config;

  /** Compute an immutable snapshot of the. */
  snapshot(): ConfigSnapshot;
}

type ConfigPbStatic = typeof ConfigPb;

interface ConfigStatic extends ConfigPbStatic {
  create(arg?: IConfig): Config;
  fromObject(arg: object): Config;
}

export const Config: ConfigStatic = class Config extends ConfigPb.ctor {

  presetMap(): PresetMap {
    const newPresets =
        mapObject(this.nested || {}, (c) => ({value: c instanceof Config ? c : Config.create(c)}));
    return Object.create(getStandardPresets(), newPresets);
  }

  snapshot(): ConfigSnapshot {

    const fields = new Map<string, unknown>();
    function walkPreset(config: Config, random: boolean, simple: boolean, preset?: string) {
      const exprs: jsep.Expression[] = (this.mystery || []).map(jsep); 
      const presets = new Set(config.presets || []);
      const presetMap = config.presetMap();
      



    }
    walkPreset(this, false, true);



    scanMessage('', this, configInfo);
    function scanMessage(prefix: string, message: object, ti: TypeInfo,
                         random = defaultRandom, simple = defaultSimple) {
      for (const [f, v] of Object.entries(message)) {
        const fi = ti.fields.get(canonicalizeName(f));
        assert(fi); // if (!spec) continue; // silently skip unknown fields...?

        // TODO - what if it's a repeated message??

        if (fi instanceof MessageFieldInfo) {
          assert(typeof v === 'object');
          scanMessage(`${prefix}${f}.`, v, fi.type); 
        } else {
          // TODO - do we care to pull out map keys?
          fields.set(prefix + f, {random, simple, value: v});
        }
      }
    }

    // we now know all the determined fields before presets or mystery are applied
    // next we need to figure out which presets and fields are touched by mysteries
    const randomPresets = new Set<string>();
    for (let e of mystery) {
      evaluate(e);
    }

    // now look at presets transitively
    for (const p of presets) {
      if (!randomPresets.has(p)) scanPreset(p, false);
    }
    for (const p of randomPresets) {
      scanPreset(p, true);
    }

    return new ConfigSnapshot(mystery, fields);

    function scanPreset(p: string, randomPreset: boolean) {
      const c = presetMap[p];
      if (!c) return;
      const s = c.snapshot(random, false);
      for (let [f, {value, random, simple}] of s.fields) {
        if (randomPreset) {
          random = true;
          simple = false;
        } else {
          const prev = fields.get(f);
          if (prev) {
            random ||= prev.random;
            simple &&= prev.simple;
          }
        }
        fields.set(f, {value, random, simple});
      }
    }

    function evaluate(e: jsep.Expression) {
      if (e.type === 'AssignmentExpression') {
        assertType<jsep.Expression>(e.left);
        assertType<jsep.Expression>(e.right);
        const lhs = qname(e.left);
        if (lhs === 'presets') {
          if (e.operator === '=') {
            presets.forEach(p => randomPresets.add(p));
          } else if (e.right.type === 'Identifier') {
            // TODO - do we allow writing `presets += foo` or do we require quotes?
            randomPresets.add(e.right.name as string);
          } else if (e.right.type === 'Literal' && typeof e.right.value === 'string') {
            randomPresets.add(e.right.value);
          } else {
            // no idea what this would be...?
            presets.forEach(p => randomPresets.add(p));
          }
        } else {
          fields.set(lhs, {random: true, simple: defaultSimple && isSimple(e.right)});
        }
      } else if (e.type === 'ConditionalExpression') {
        evaluate(e.consequent as jsep.Expression);
        evaluate(e.alternate as jsep.Expression);
      } else if (e.type === 'BinaryExpression' &&
          (e.operator === '&&' || e.operator === '||')) {
        evaluate(e.right as jsep.Expression);
      }
    }
    function qname(e: jsep.Expression): string {
      if (e.type === 'Identifier') return e.name as string;
      if (e.type === 'MemberExpression') {
        assertType<jsep.Expression>(e.object);
        if (e.computed) return `${qname(e.object)}[]`;
        assertType<jsep.Expression>(e.property);
        if (e.property.type === 'Identifier') return '?';
        return `${qname(e.object)}.${e.property.name || '?'}`;
      }
      return '?';
    }
  }

  //$type: Type;
  static create: (arg?: IConfig) => Config;

  static fromObject(arg: object): Config {
    // TODO - fix arg
    return ConfigPb.fromObject(arg) as unknown as Config;
  }
} as any;
ConfigPb.ctor = Config;

export type PresetMap = {readonly [key: string]: Config};
const getStandardPresets = (() => {
  // NOTE: This is lazy because it relies on TypeInfo having been resolved.
  // We could possibly just put it after the `resolve(ConfigPb)` call.
  let presets: Record<string, Config>|undefined;
  function buildStandardPresets() {
    presets = {};
    walk(configInfo, (c) => c);
    function walk(t: TypeInfo, fn: (c: Config) => object) {
      for (const [f, fi] of t.fields) {
        // NOTE: repeated/map fields default to empty!
        if (fi instanceof MessageFieldInfo) {
          walk(fi.type, (c: Config) => {
            const child: any = fn(c);
            return child[f] || (child[f] = fi.type.type.create());
          });
          continue;
        }
        // Primitives can have presets directly
        for (const [opt, val] of Object.entries(fi.field.options || {})) {
          const p = opt.replace(/^preset\./, '');
          if (opt === p) continue;
          const message = fn(presets![p] || (presets![p] = Config.create())) as any;
          message[f] = fi.clamp(val);
        }
      }
    }
  }
  return () => {
    if (!presets) buildStandardPresets();
    return presets;
  };
}



// Resolve all nested types
// NOTE: The following code streamlines the introspection

function resolve(t: Type): TypeInfo;
function resolve(e: Enum): EnumInfo;
function resolve(f: Field): FieldInfo;
function resolve(o: unknown): unknown {
  const r = resolved.get(o);
  if (r != null) return r;
  if (o instanceof Type) return TypeInfo.resolve(o);
  if (o instanceof Enum) return EnumInfo.resolve(o);
  if (o instanceof Field) return FieldInfo.resolve(o);
  assert(false);
}
const resolved = new Map<unknown, unknown>();

class TypeInfo {
  fields = new Map<string, FieldInfo>();
  // TODO - any options?

  constructor(readonly type: Type) {}

  static resolve(t: Type) {
    t.resolve();
    const info = new TypeInfo(t);
    resolved.set(t, info);
    for (const [name, field] of t.fieldsArray) {
      assert(typeof name === 'string');
      assert(field instanceof Field);
      const c = canonicalizeName(name);
      if (info.fields.has(c)) {
        throw new Error(`Canonicalized enum name conflict in ${t.name}: ${name} vs ${
                         info.fields.get(c)!.name}`);
      }
      info.fields.set(c, resolve(field));
    }
    return info;
  }
}
class EnumInfo {
  canonical = new Map<string, number>();

  static resolve(e: Enum): EnumInfo {
    const info = new EnumInfo();
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
          throw new Error(`Canonicalized enum name conflict in ${e.name}: ${n} vs ${
                           e.valuesById[info.canonical.get(c)!]}`);
        }
        info.canonical.set(c, value);
      }
    }
    return info;
  }
}

abstract class FieldInfo {
  constructor(readonly field: Field) {}
  get name(): string { return this.field.name; }
  abstract resolve(): void;
  // TODO - implement?
  clamp(value: unknown): unknown { return value; }

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
abstract class SingularFieldInfo extends FieldInfo {}
class RepeatedFieldInfo extends FieldInfo {
  constructor(readonly element: SingularFieldInfo) { super(element.field); }
  resolve() { this.element.resolve(); }
}
class MapFieldInfo extends FieldInfo {
  constructor(
    readonly key: SingularFieldInfo,
    readonly value: SingularFieldInfo) { super(value.field); }
  resolve() { this.key.resolve(); this.value.resolve(); }
}
abstract class PrimitiveFieldInfo extends SingularFieldInfo {
  abstract readonly primitive: Primitive;
  abstract readonly default?: unknown;
  resolve() {}
}
class NumberFieldInfo extends PrimitiveFieldInfo {
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
  clamp(arg: unknown): number {
    if (typeof arg === 'string') {
      // NOTE: Number() does not understand negative with 0x prefix!
      arg = arg.trim();
      if ((arg as string).startsWith('-')) {
        arg = -Number((arg as string).substring(1));
      }
    }
    return Math.max(this.min, Math.min(this.round(Number(arg)), this.max));
  }
}
class StringFieldInfo extends PrimitiveFieldInfo {
  readonly default?: number;
  readonly primitive: 'string' = 'string';

  constructor(field: Field) {
    super(field);
    assert(field.type === 'string');
    const {'(default)': defaultOpt} = field.options || {};
    this.default = defaultOpt != null ? defaultOpt : undefined;
  }
  clamp(arg: unknown): string {
    return String(arg);
  }
}
class BoolFieldInfo extends PrimitiveFieldInfo {
  readonly default?: boolean;
  readonly primitive: 'bool' = 'bool';

  constructor(field: Field) {
    super(field);
    assert(field.type === 'string');
    const {'(default)': defaultOpt} = field.options || {};
    this.default = defaultOpt != null ? this.clamp(defaultOpt) : undefined;
  }
  clamp(arg: unknown): boolean {
    return typeof arg === 'string' && arg.toLowerCase() === 'false' ? false : Boolean(arg);
  }
}
class EnumFieldInfo extends SingularFieldInfo {
  readonly enum!: EnumInfo;
  constructor(field: Field, private readonly e: Enum) { super(field); }
  resolve() { (this as any).enum = resolve(this.e); }
}
class MessageFieldInfo extends SingularFieldInfo {
  readonly type!: TypeInfo;
  constructor(field: Field, private readonly t: Type) { super(field); }
  resolve() { (this as any).type = resolve(this.t); }
}

function singularFieldInfo(type: string, resolvedType: unknown, f: Field) {
  if (resolvedType instanceof Type) {
    return new MessageFieldInfo(f, resolvedType);
  } else if (resolvedType instanceof Enum) {
    return new EnumFieldInfo(f, resolvedType);
  } else if (type === 'string') {
    return new StringFieldInfo(f);
  } else if (type === 'bool') {
    return new BoolFieldInfo(f);
  } else if (isPrimitive(type)) {
    return new NumberFieldInfo(f);
  }
  throw new Error(`Could not resolve type ${type} (${resolvedType}) of ${f.parent?.name}.${f.name}`);
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

function assert(x: unknown): asserts x {
  if (!x) throw new Error('Assertion Failed');
}
function assertType<T>(_x: unknown): asserts _x is T {}

function mapObject<K extends string|number|symbol, T, U>(
    obj: Record<K, T>, fn: (arg: T, key: K) => U): Record<K, U> {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = fn(v as T, k as K);
  }
  return out;
}

function isSimple(e: jsep.Expression): boolean {
  if (e.type !== 'CallExpression') return false;
  const callee = e.callee as jsep.Expression;
  if (callee.type !== 'Identifier' || callee.name !== 'pick') return false;
  return (e.arguments as unknown[])!.length === 0;
}

assert(ConfigPb instanceof Type);
const configInfo = resolve(ConfigPb);

// When parsing stuff, build up the translation map?
// Preset operations need to be constrained:
//   - ??? && this.presets [-+]?= <LITERAL>
// Nothing else allowed
// Given a field, we know which presets affect it easily
//   - look for anything touching those presets...

// Options in UI are all SIMPLE options, but we put composite options as presets
//   - e.g. ChargeShotsOnly is a standard preset
// Then we have an options group with a (ordered) list of presets
//   - pick from drop-down to add
//   - can we save a set of configs as a custom preset and use it somehow?
//      - if preset has vars in it, it will be complex...
//      - we could have a `map<string, Config> presetDef` for custom ones?
//      - then applying it works recursively...?
//         - get a nested scope for randoms?
//         - when using a custom saved preset, we just need to include it in hash
//         - evaluate all randoms and apply that way.
//         - this would also allow for extra complexity for ...?
//      - how would we keep track of which flags are affected by the nested presets?
