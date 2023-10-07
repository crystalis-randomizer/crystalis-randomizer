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
  if (warnings.length) {
    console.warn(warnings.join('\n'));
  }
  return config;
}

function fixMessageJson(message: Message<any>, t: Type, warnings: string[]) {
  for (const [f, spec] of Object.entries(t.fields)) {
    // TODO - field transformer for all entries of message????
    const value = message[f];
    if (value == undefined) continue;
    assertType<string>(f);
    assertType<Field>(spec);
    resolve(spec);
    console.log(`spec: ${spec.name} ${spec.map} ${spec.options}`);
    if (spec.map) {
      const resolvedKeyType = spec.resolvedKeyType || keyMap.get(spec)
      if (!spec.resolvedType && !resolvedKeyType) continue;
      console.log(`map: ${spec.resolvedType?.name} ${resolvedKeyType?.name}`);
      const out: Record<string, unknown> = {};
      const keyTransform = enumTransformer(resolvedKeyType);
      const valueTransform = enumTransformer(spec.resolvedType);
      for (const [k, v] of Object.entries(value)) {
        const kt = keyTransform(k, warnings);
        const vt = valueTransform(v, warnings);
        console.log(`map (${k}, ${v}) => (${kt}, ${vt})`);
        if (kt == undefined || vt == undefined) continue;
        out[kt as string] = vt;
      }
      message[f] = out;
      continue;
    } else if (spec.resolvedType instanceof Enum) {
      const transform = enumTransformer(spec.resolvedType);
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
class EnumParser {
  constructor(private readonly map: Map<string, number>,
              readonly spec: Enum) {}
  static for(enumSpec: Enum): EnumParser {
    let parser = enumParsers.get(enumSpec)
    if (!parser) {
      const map = new Map<string, number>();
      for (const [k, v] of Object.entries(enumSpec.values)) {
        assertType<string>(k);
        assertType<number>(v);
        const opts = enumSpec.valuesOptions?.[k] || {};
        
        for (const name of [k, ...enumAliases(opts)]) {
          const canonical = canonicalizeEnum(name);
          if (map.has(canonical)) {
            const prev = enumSpec.valuesById[v];
            throw new Error(`Conflict in enum ${enumSpec.name}: ${name} vs ${prev}`);
          }
          map.set(canonical, v);
        }
      }
      enumParsers.set(enumSpec, parser = new EnumParser(map, enumSpec));
    }
    return parser;
  }
  parse(name: string): number|undefined {
    return this.map.get(canonicalizeEnum(name));
  }
}
const enumParsers = new Map<unknown, EnumParser>();
function enumAliases(opts: any): string[] {
  return (opts['(alias)'] || '').split(/,/g).filter((x: string) => x);
}
function canonicalizeEnum(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/gi, '');
}
type EnumTransformer = (arg: unknown, warnings: string[]) => unknown;
function enumTransformer(spec: unknown): EnumTransformer {
  if (!(spec instanceof Enum)) return x => x;
  const parser = EnumParser.for(spec);
  return (x, warnings) => {
    if (typeof x === 'number') return x;
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
