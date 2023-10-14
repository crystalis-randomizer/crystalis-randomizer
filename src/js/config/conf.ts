// Conf is the main configuration class, with extra methods, etc.
// It contains one or more Config protobufs, and can serialize
// itself to/from JSON, binary, and string, as well as fill in
// or elide defaults, simplify/rearrange strings, etc.
//
// For now, we'll just use the standard binary serialization,
// with brotli compression to try to shrink things a bit, but
// it's likely we can improve on it quite a bit.

import { Config as ConfigPb } from '../../../target/build/config_proto';
import { Enum, Field, Message, Type } from 'protobufjs/light.js';
//import { compress, decompress } from 'brotli';
import { assertType } from '../util';
//import { Random } from '../random';

export { Config }

interface Config extends ConfigPb {
  has(field: string): boolean;
}

type Qname<T extends object> = `${keyof T}`

const Config = class Config extends ConfigPb.ctor {
  has(field: ) {
    return this[field] != undefined;
  }

}

root.Config.ctor = Config;



}



export class Conf {
  constructor(readonly config: Config) {}

  /** Given a list of Config proto jsons, process them into the protobuf. */
  static fromJson(json: unknown): Conf {
    return new Conf(parseConfigJson(json));
  }

  /** Returns an array of parseable config jsons. */
  toJson(): unknown[] {
    return this.configs.map(c => cleanJsonEnums(c.toJSON(), Config));
  }

  /** Merge all the configs into a single one. */
  merge(/*random: Random, */fill = false): Conf {
    const out = fill ? makeDefault(Config) : new Config();
    for (const c of this.configs) {
      mergeProto(out, c, Config);
    }
    return new Conf([out]);
  }  

  /** Simplify a config by consolidating presets and removing defaults. */
  simplify(): Conf {
    throw '';
  }

  static fromFlagString(str: string): Conf {
    throw '';
  }

  toFlagString(): string {
    throw '';
  }  
}

function makeDefault(t: Type): Message<any> {
  const out = t.create();
  for (const [f, spec] of Object.entries(t.fields)) {
    assertType<Field>(spec);
    resolve(spec);
    if (spec.map || spec.repeated) continue;
    if (spec.resolvedType instanceof Type) {
      out[f] = makeDefault(spec.resolvedType);
      continue;
    }
    const def = spec.options?.['(default)'];
    if (def == undefined) continue;
    out[f] = interpretValue(def, spec);
  }
  return out;
}

function interpretValue(value: unknown, spec: Field): unknown {
  if (isNumeric(spec.type)) return Number(value);
  if (spec.type === 'string') return String(value);
  if (spec.type === 'bool') {
    const v = String(value).toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    throw new Error(`Could not interpret ${value} as bool`);
  }
  resolve(spec);
  if (spec.resolvedType instanceof Enum) {
    const v = typeof value === 'string' ? spec.resolvedType.values[value] : undefined;
    if (v == undefined) throw new Error(`Bad enum value ${value} for ${spec.resolvedType.name} at ${qname(spec)}`);
    return v;
  }
  // enum ?!?
  throw new Error(`Don't know how to interpret ${value} as ${spec.type}`);
}
function isNumeric(t: unknown): boolean {
  return typeof t === 'string' && /([us]?int|s?fixed)(16|32)|double|float/.test(t);
}

// TODO: with randomization
function mergeProto(out: Message<any>, c: Message<any>, t: Type) {
  for (const [f, v] of Object.entries(c)) {
    const spec = t.fields[f];
    if (!spec) continue;
    if (spec.repeated) {
      out[f] = (out[f] || []).concat(v);
    } else if (spec.map) {
      const map = out[f] || (out[f] = {});
      for (const [mk, mv] of Object.entries(v as object)) {
        map[mk] = mv;
      }
    } else if (spec instanceof Type) {
      const msg = out[f] || (out[f] = spec.create());
      mergeProto(msg, v, spec);
    } else {
      out[f] = v;
    }
  }
}

function cleanJsonEnums(json: unknown, t: unknown): unknown {
  if (t instanceof Enum) {
    assertType<Enum>(t);
    //const id = typeof json === 'string' && t.values[json] != undefined ? t.values[json] : json;
    //console.log(`clean ${t}   json=${json} id=${id}`);
    let byId = t.valuesById[json];
    if (byId) return byId.toLowerCase();
    byId = t.valuesById[t.values[json]];
    if (byId) return byId.toLowerCase();
    return json;
  } else if (!(t instanceof Type) || !json || typeof json !== 'object') {
    return json;
  }
  // message type
  assertType<Type>(t);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json)) {
    const key = k.replace(/[A-Z]/g, (x) => ` ${x.toLowerCase()}`);
    //console.log(`${k} => ${key}`);
    const spec = t.fields[k];
    resolve(spec);
    if (spec.repeated) {
      out[key] = Array.isArray(v) ? v.map(e => cleanJsonEnums(e, spec.resolvedType)) : v;
    } else if (spec.map) {
      assertType<object>(v);
      const kt = keyMap.get(spec);
      //console.log(`field ${spec.name}   key ${kt}`);
      //console.dir(kt.values);
      const map: Record<string, unknown> = {};
      for (let [mk, mv] of Object.entries(v)) {
        map[cleanJsonEnums(mk, kt) as string] = cleanJsonEnums(mv, spec.resolvedType);
      }
      out[key] = map;
    } else if (spec.resolvedType instanceof Type) {
      out[key] = cleanJsonEnums(v, spec.resolvedType);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function parseConfigJson(json: unknown): Config {
  if (!json || typeof json !== 'object') {
    throw new Error(`Bad json for Config: ${typeof json} {$json}`);
  }
  const config = Config.create(json as any);
  // we need to clean some stuff up and then run verify
  // in particular, enforce min/max and look for enum-keyed maps,
  // enum values, etc.
  const warnings: string[] = [];
  fixMessageJson(config, Config, warnings);
  const verify = Config.verify(config);
  if (verify) warnings.push(verify);
  if (warnings.length) console.warn(warnings.join('\n'));
  return config;
}

function fixMessageJson(message: Message<any>, t: Type, warnings: string[]) {
  const xform = nameTransformer(t);
  for (let [key, value] of Object.entries(message)) {
    const originalKey = key;
    const f = xform(key, warnings);
    if (!f) continue;
    assertType<string>(f);
    const spec = t.fields[f];
    if (!spec) throw new Error(`missing spec for ${t.name}: ${key} => ${f}\n${warnings.join('\n')}`);
    assertType<Field>(spec);
    resolve(spec);
    if (f !== originalKey) {
      message[f] = value;
      delete message[originalKey];
    }
    if (spec.map) {
      assertType<object>(value);
      const resolvedKeyType = spec.resolvedKeyType || keyMap.get(spec)
      if (!spec.resolvedType && !resolvedKeyType) continue;
      const out: Record<string, unknown> = {};
      const keyTransform = nameTransformer(resolvedKeyType);
      const valueTransform = nameTransformer(spec.resolvedType);
      for (const [k, v] of Object.entries(value)) {
        const kt = keyTransform(k, warnings);
        const vt = valueTransform(v, warnings);
        if (kt == undefined || vt == undefined) continue;
        out[kt as string] = vt;
      }
      message[f] = out;
      continue;
    } else if (spec.resolvedType instanceof Enum) {
      const transform = nameTransformer(spec.resolvedType);
      if (spec.repeated) {
        message[f] = (Array.isArray(value) ? value : [value]).map(x => transform(x, warnings));
      } else {
        message[f] = transform(value, warnings);
      }      
    } else if (spec.resolvedType instanceof Type) {
      if (spec.repeated) {
        if (!Array.isArray(value)) message[f] = [value];
        for (const e of message[f]) {
          fixMessageJson(e, spec.resolvedType, warnings);
        }
      } else {
        fixMessageJson(value, spec.resolvedType, warnings);
      }
    }
  }
}

// NOTE: we do a case-insensitive match of letters and numbers only.
// TODO - allow a top-level enum option specifying maximum hamming distance?
class NameParser<T extends string|number> {
  constructor(private readonly map: Map<string, T>,
              readonly spec: Enum|Type) {}
  static for(spec: Enum): NameParser<number>;
  static for(spec: Type): NameParser<string>;
  static for(spec: Enum|Type): NameParser<number|string> {
    let parser = nameParsers.get(spec)
    if (!parser) {
      nameParsers.set(spec, parser = spec instanceof Type ? fieldParser(spec) : enumParser(spec));
    }
    return parser;
  }
  parse(name: string): T|undefined {
    return this.map.get(canonicalizeName(name));
  }
}
function fieldParser(spec: Type): NameParser<string> {
  const map = new Map<string, string>();
  for (const [f, s] of Object.entries(spec.fields)) {
    assertType<string>(f);
    assertType<Field>(s);
    const opts = s.opts || {};
    for (const name of [f, ...aliases(opts)]) {
      const canonical = canonicalizeName(name);
      if (map.has(canonical)) {
        const prev = map.get(canonical);
        throw new Error(`Field name conflict in ${spec.name}: ${name} vs ${prev}`);
      }
      map.set(canonical, f);
    }
  }
  return new NameParser(map, spec);
}
function enumParser(spec: Enum): NameParser<number> {
  const map = new Map<string, number>();
  for (const [k, v] of Object.entries(spec.values)) {
    assertType<string>(k);
    assertType<number>(v);
    const opts = spec.valuesOptions?.[k] || {};
    for (const name of [k, ...aliases(opts)]) {
      const canonical = canonicalizeName(name);
      if (map.has(canonical)) {
        const prev = spec.valuesById[map.get(canonical)];
        throw new Error(`Conflict in enum ${spec.name}: ${name} vs ${prev}`);
      }
      map.set(canonical, v);
    }
  }
  return new NameParser(map, spec);
}

const nameParsers = new Map<unknown, NameParser<any>>();
function aliases(opts: any): string[] {
  // TODO: consider searching for `(alias).x` for any `x`, which would allow
  // writing `[(alias) = {
  //             x: 'a b c'
  //             y: 'd e f'
  //          }`
  return (opts['(alias)'] || '').split(/,\s*/g).filter((x: string) => x);
}
function canonicalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/gi, '');
}
type NameTransformer = (arg: unknown, warnings: string[]) => unknown;
function nameTransformer(spec: Enum|Type): NameTransformer {
  if (!(spec instanceof Enum || spec instanceof Type)) return x => x;
  const parser = NameParser.for(spec);
  return (x, warnings) => {
    if (spec instanceof Enum && typeof x === 'number') return x;
    const parsed = parser.parse(x as string);
    if (parsed == undefined) {
      warnings.push(`Unknown ${parser.spec.name} ${
                     spec instanceof Enum ? 'value' : 'field'}: "${x}"`);
    }
    return parsed;
  }
}

const keyMap = new Map<Field, Enum|undefined>();
function resolve(spec: Field) {
  if (!spec.resolved) spec.resolve();
  const key = spec.options?.['(key)'];
  if (key && !keyMap.has(spec)) {
    const resolved = spec.parent.lookup(key);
    if (resolved == null) throw new Error(`Unknown key type: ${key}`);
    keyMap.set(spec, resolved);
  }
}

function qname(spec: Field|Type): string {
  return spec === Config ? 'Config' : !spec ? '(Root)' : `${qname(spec.parent)}.${spec.name}`;
}

// Given a property, we can look for it either in the normal place or else
// in the `with` map (which will be much less efficient...)
//  x: rand()
//  y: x < 0.5 ? true : false
//  this.placement.bury

class UiSetting {
  


}
const chargeShotsOnly = Config.fromObject({
  items: {
    chargeShotsOnly: true,
    chargeWhileWalkingSpeed: 7,
    chargeWithItemSpeed: 8,
    chargeWhileWalkingWithItemSpeed: 8,
  },
  
});
// Returns true if it's always a proper subset, false if never, and
// undefined if it's indeterminate: it may or may not be, randomly.
function isSubset(parent: Config, needle: Config): boolean|undefined {


}
