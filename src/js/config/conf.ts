// Conf is the main configuration class, with extra methods, etc.
// It contains one or more Config protobufs, and can serialize
// itself to/from JSON, binary, and string, as well as fill in
// or elide defaults, simplify/rearrange strings, etc.
//
// For now, we'll just use the standard binary serialization,
// with brotli compression to try to shrink things a bit, but
// it's likely we can improve on it quite a bit.

import { Config /*, Configs*/ } from '../../../target/build/config_proto';
import { Enum, Field, Message, Type } from 'protobufjs/light.js';
//import { compress, decompress } from 'brotli';
import { assertType } from '../util';

export class Conf {
  constructor(readonly configs: Config[]) {}

  /**
   * Given a list of Config proto jsons, process them into the protobuf.
   */
  static fromJson(json: unknown): Conf {
    if (!Array.isArray(json)) json = [json];
    assertType<unknown[]>(json);
    return new Conf(json.map(parseConfigJson));
  }

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
  return (opts['(alias)'] || '').split(/,/g).filter((x: string) => x);
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
      warnings.push(`Unknown ${parser.spec.name} value: ${x}`);
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
