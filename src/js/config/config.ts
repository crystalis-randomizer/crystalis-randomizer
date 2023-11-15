import { Config, ConfigPath, IConfig, ItemName, CheckName, LocationName } from '../../../target/build/config_proto';
// import { TypeInfo, FieldInfo, MessageFieldInfo, qnameVisitor, resolve, RepeatedFieldInfo, MapFieldInfo } from './info.js';
import { EnumFieldInfo, FieldInfo, MessageFieldInfo, PrimitiveFieldInfo, resolve } from './info';
import { assert /*, assertType*/ } from './assert';
import { Type } from 'protobufjs';
//import { FieldMutation, Mutation } from './expr.js';

export { CheckName, ConfigPath, ItemName, LocationName };

// type DeepReadonly<T> =
//     T extends (infer U)[] ? readonly DeepReadonly<U>[] :
//     T extends object ? {+readonly [K in keyof T]: DeepReadonly<T[K]>} : T;
const ReadonlyConfig = Config;
type ReadonlyConfig = ReadonlyMessage<IConfig>;
type ReadonlyMessage<T> = {+readonly [K in keyof T]-?: ReadonlyField<T[K]>}
type ReadonlyField<T> = [T] extends [string|boolean|number] ? T :
  //[T] extends [string|boolean|number|null|undefined] ? T|undefined :
  [T] extends [Array<infer V>|null|undefined] ? ReadonlyField<V>[] :
  [T] extends [Record<string, infer V>|null|undefined] ? Record<string, ReadonlyField<V>> :
  [T] extends [(infer V extends object)|null|undefined] ? ReadonlyMessage<V> :
  {unknown: T};

// DeepReadonly<IConfig>;
export {ReadonlyConfig as Config};

export interface Reporter {
  report(msg: string|null): void;
}

export class BasicReporter {
  messages: string[] = [];
  report(msg: string|null) { if (msg) this.messages.push(msg); }
  result(): string|null {
    if (this.messages.length <= 1) return this.messages[0] || null;
    return `Errors during commit:\n  ${this.messages.join('\n  ')}`;
  }
}

// function setField(message: any, info: TypeInfo, field: string, value: unknown) {
//   const index = field.indexOf('.');
//   if (index === -1) {
//     const fi = info.field(field);
//     if (!fi) return; // error message??
//     const v = fi.coerce(value);
//     if (v != undefined) message[fi.name] = v;
//   } else {
//     const parent = field.substring(0, index);
//     const rest = field.substring(index + 1);
//     const fi = info.field(parent);
//     if (!fi || !(fi instanceof MessageFieldInfo)) return; // error??
//     setField(message[fi.name] || (message[fi.name] = fi.type.type.create()), fi.type, rest, value);
//   }
// }

// export class ConfigBuilder {
//   private internal: Config = Config.create();
//   private pending?: IConfig = undefined;
//   // keyed by field, value is _last_ mutation (including presets)
//   private mystery?: Map<string, FieldMutation> = undefined

//   constructor(config?: IConfig) {
//     if (config) {
//       const result = this.merge(config);
//       if (result) throw new Error(result);
//     }
//   }

//   private checkState() {
//     if (this.pending) throw new Error(`mutable reference out`);
//   }

//   // TODO: clone?
//   merge(_config: IConfig): string|null {
//     this.checkState();
//     throw new Error('not implemented');
//   }
//   mutate(): IConfig {
//     this.checkState();
//     this.mystery = undefined;
//     return this.pending = Config.fromObject(this.internal.toJSON());
//   }
//   commit(): string|null {
//     // check mutations and return any errors as a string
//     if (!this.pending) throw new Error(`commit with no mutable reference`);
//     const reporter = new BasicReporter();
//     this.internal = configInfo.coerce(this.pending, reporter) as Config;
//     this.pending = undefined;
//     reporter.report(Config.verify(this.internal));
//     return reporter.result();
//   }

//   build(): ReadonlyConfig {
//     this.checkState();
//     return configInfo.fill(this.internal) as ReadonlyConfig;
//   }

//   // query stuff about fields, presets, and expressions
//   snapshot(): Map<string, FieldMutation> {
//     this.checkState();
//     if (this.mystery) return this.mystery;
//     // build the mutations
//     const mysteryMutations = (this.internal.mystery || []).flatMap(e => mutation(jsep(e)));
//     const presets = new Map<string, boolean>(); // maps to randomness.
//     for (const m of mysteryMutations) {
//       if (m.type !== 'preset') continue;
//       const del = m.delete === 'all' ? [...presets.keys()] : m.delete;
//       for (const p of del) {
//         if (m.random) {
//           presets.set(p, true);
//         } else {
//           presets.delete(p);
//         }
//       }
//       for (const p of m.add) {
//         presets.delete(p);
//         presets.set(p, m.random);
//       }
//     }

//     let presetMap: Record<string, ConfigBuilder>|undefined = undefined;
//     let hidden = false;

//     const fieldMutations = new Map<string, FieldMutation>();
//     for (const [p, r] of presets) {
//       // look up the config
//       if (!presetMap) {
//         const newPresets = mapObject(this.internal.nested || {},
//                                      (c) => ({value: new ConfigBuilder(c)}));
//         presetMap = Object.create(getStandardPresets(), newPresets);
//       }
//       const c = presetMap![p];
//       if (!c) continue;
//       const s = c.snapshot();
//       if (s.get('hideConfig')?.value) hidden = true; // PICK or true.
//       for (let [f, m] of s) {
//         fieldMutations.set(f, r ? {...m, random: true} : {...m});
//       }
//     }

//     // After we visit all the presets, then visit the fields
//     const visitor = qnameVisitor((_f: FieldInfo, v: unknown, qname: string) => {
//       if (/^(preset|mystery|nested)/.test(qname)) return;
//       fieldMutations.set(qname, {type: 'field', field: qname, value: v, random: false});
//     });

//     configInfo.visit(this.internal, visitor, '');

//     // Finally re-visit the random fields
//     for (const m of mysteryMutations) {
//       if (m.type !== 'field') continue;
//       if (m.field === 'hideConfig') continue; // no effect - cannot override!
//       fieldMutations.set(m.field, m);
//     }

//     // Check the hidden status
//     const hm = fieldMutations.get('hideConfig');
//     if (hm?.value === true) {
//       fieldMutations.clear();
//       fieldMutations.set('hideConfig', hm); // only reveal that we're hidden.
//     } else if (hidden) {
//       fieldMutations.set('hideConfig', {type: 'field', field: 'hideConfig',
//                                         value: PICK, random: false});
//     }
//     return this.mystery = fieldMutations;
//   }
// }

// export type PresetMap = {readonly [key: string]: ConfigBuilder};
// const getStandardPresets = (() => {
//   // NOTE: This is lazy because it relies on TypeInfo having been resolved.
//   // We could possibly just put it after the `resolve(ConfigPb)` call.
//   let standardPresets: Record<string, ConfigBuilder>|undefined = undefined;
//   function buildStandardPresets() {
//     const presets: Record<string, Config> = {};
//     const visitor = qnameVisitor((f: FieldInfo, _v: unknown, name: string) => {
//       // Primitives can have presets directly
//       for (const [opt, val] of Object.entries(f.field.options || {})) {
//         const p = opt.replace(/^preset\./, '');
//         if (opt === p) continue;
//         const message = presets[p] || (presets[p] = Config.create());
//         setField(message, configInfo, name, val);
//       }
//     });
//     configInfo.visit(null, visitor, '');
//     standardPresets = mapObject(presets, c => new ConfigBuilder(c));
//   }
//   return () => {
//     if (!standardPresets) buildStandardPresets();
//     return standardPresets as PresetMap;
//   };
// })();

// function mapObject<K extends string|number|symbol, T, U>(
//     obj: Record<K, T>, fn: (arg: T, key: K) => U): Record<K, U> {
//   const out: any = {};
//   for (const [k, v] of Object.entries(obj)) {
//     out[k] = fn(v as T, k as K);
//   }
//   return out;
// }

// function isSimple(e: jsep.Expression): boolean {
//   if (e.type !== 'CallExpression') return false;
//   const callee = e.callee as jsep.Expression;
//   if (callee.type !== 'Identifier' || callee.name !== 'pick') return false;
//   return (e.arguments as unknown[])!.length === 0;
// }

assert(Config instanceof Type);
export const configInfo = resolve(Config);

export class ConfigField {
  readonly info: FieldInfo;
  constructor(readonly path: ConfigPath) {
    let info: FieldInfo|undefined = configInfo.asField();
    for (const term of path.split('.')) {
      if (info instanceof MessageFieldInfo) {
        info = info.type.field(term);
      } else {
        info = undefined;
      }
      if (!info) throw new Error(`bad path: ${path}`);
    }
    this.info = info;
  }

  default(): unknown {
    return this.info instanceof PrimitiveFieldInfo || this.info instanceof EnumFieldInfo ? this.info.default : undefined;
  }

  // applies defaults, etc
  get(config: ReadonlyConfig): unknown {
    let obj: any = config;
    let info = configInfo.asField();
    for (const term of this.path.split('.')) {
      if (!obj) return undefined;
      if (!(info instanceof MessageFieldInfo)) throw new Error('impossible');
      // NOTE: protobufjs doesn't implement proto3 optional presence correctly?
      if (!obj.hasOwnProperty(term)) return undefined;
      obj = obj[term];
    }
    return obj;
    // TODO - default? other stuff?
  }

  // applies defaults, etc
  set(config: ReadonlyConfig, value: unknown): ReadonlyConfig {
    const cur = this.get(config);
    if (cur === value) return config;

    // clone - is there a better way???
    //   - enums are numbers everywhere in actual representation...
    let obj: any = Config.fromObject((config as unknown as Config).toJSON());
    config = obj;
    let info = configInfo.asField();
    const terms = this.path.split('.');
    const last = terms.pop();
    if (!last) throw new Error('impossible');
    for (const term of terms) {
      if (!(info instanceof MessageFieldInfo)) throw new Error('impossible');
      const child = obj[term];
      const field = info.type.field(term);
      if (field instanceof MessageFieldInfo && !child) {
        obj = obj[term] = field.type.type.ctor.create();
      } else {
        obj = child;
      }
    }
    obj[last] = this.info.coerce(value, THROWING_REPORTER);
    // TODO - verify config???
    return config;
  }
}

const THROWING_REPORTER: Reporter = {
  report(msg: string) {
    throw new Error(msg);
  }
};

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
