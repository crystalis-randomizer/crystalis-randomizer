import { Config, IConfig, ItemName, CheckName, LocationName } from '../../../target/build/config_proto.js';
import { TypeInfo, FieldInfo, MessageFieldInfo, qnameVisitor, resolve, RepeatedFieldInfo, MapFieldInfo } from './info.js';
import { assert, assertType } from './assert.js';
import * as jsep from 'jsep';
import jsepAssignment from '@jsep-plugin/assignment';
import jsepObject from '@jsep-plugin/object';
import { Type } from 'protobufjs';
import { FieldMutation, Mutation } from './expr.js';

jsep.plugins.register(jsepAssignment, jsepObject);

export { ItemName, CheckName, LocationName };

// type DeepReadonly<T> =
//     T extends (infer U)[] ? readonly DeepReadonly<U>[] :
//     T extends object ? {+readonly [K in keyof T]: DeepReadonly<T[K]>} : T;
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

export const PICK: unique symbol = Symbol();
type Pick = typeof PICK;


function mutation(expr: jsep.Expression, reporter?: Reporter): Mutation[] {
  // Take apart the expression.

  function getPreset(e: jsep.Expression): string[] {
    if (e.type === 'Literal') {
      if (typeof e.value === 'string') return [e.value];
      reporter?.report(`cannot use non-string-literal value ${e.value} as a preset`);
    }
    reporter?.report(`presets must be string literal values: got ${e.type}`);
    return [];
  }

  if (expr.type === 'AssignmentExpression') {
    assertType<jsep.Expression>(expr.left);
    assertType<jsep.Expression>(expr.right);
    if (expr.left.type === 'Identifier' && expr.left.name === 'presets') {
      let del: string[]|'all' = [];
      let add: string[] = [];
      let elems: string[];
      if (expr.right.type === 'ArrayExpression') {
        assertType<jsep.Expression[]>(expr.right.elements);
        elems = expr.right.elements.flatMap(getPreset);
      } else if (expr.operator !== '=') {
        elems = getPreset(expr.right);
      } else {
        reporter?.report('direct assignment to presets must be an array');
        elems = [];
      }
      if (expr.operator === '=') {
        del = 'all';
        add = elems;
      } else if (expr.operator === '+=') {
        add = elems;
      } else if (expr.operator === '-=') {
        del = elems;
      } else {
        reporter?.report(`unknown operation on presets: ${expr.operator}`);
        return [];
      }
      return [{type: 'preset', add, delete: del, random: false}];
    } else if (expr.left.type === 'Identifier') {
      return []; // local variable
    } else if (expr.left.type === 'MemberExpression') {
      // build the qualified name
      let terms: string[] = [];
      let e: jsep.Expression = expr.left;
      while (e.type === 'MemberExpression') {
        assertType<jsep.Expression>(e.property);
        if (e.computed) {
          terms = ['?'];
        } else if (e.property.type !== 'Identifier') {
          terms = ['!' + e.property.type];
        } else {
          terms.push(e.property.name as string);
        }
        e = e.object as jsep.Expression;
      }
      if (e.type !== 'Identifier') {
        reporter?.report(`cannot assign to property of non-identifier: ${e.type}`);
        return [];
      }
      terms.push(e.name as string);
      // now look up the field info
      let field: string[] = [];
      let info = configInfo;
      let fi: FieldInfo|undefined;
      while (terms.length) {
        const term = terms.pop()!;
        if (term === '?') {
          reporter?.report(`cannot assign to computed message fields`);
          return [];
        } else if (term.startsWith('!')) {
          reporter?.report(`unknown non-identifier property: ${term.substring(1)}`);
          return [];
        }
        fi = info.field(term);
        if (!fi) {
          reporter?.report(`unknown field ${field.map(f => f + '.')}${term}`);
          return [];
        }
        field.push(fi.name);
        if (fi instanceof RepeatedFieldInfo || fi instanceof MapFieldInfo) break;
        if (fi instanceof MessageFieldInfo) {
          info = fi.type;
        } else if (terms.length) {
          reporter?.report(`cannot assign to property of primitive field ${field.join('.')}`);
          return [];
        }
      }
      if (!fi) throw new Error(`missing field info?`);
      // analyze RHS
      let random = false;
      if (expr.operator !== '=') {
        random = true; // not strictly true, but best guess since it depends on earlier edits
        if (expr.operator === '+=' || expr.operator === '-=') {
          if (!(fi instanceof RepeatedFieldInfo)) {
            reporter?.report(`can only append/remove from repeated field`);
          }
        } else {
          reporter?.report(`invalid assignment operator: ${expr.operator}`);
        }
        // TODO - can we warn about incorrect map usage?!?
        // maybe we can continue iterating through the terms...?
      } else if (terms.length) {
        random = true; // same here - depends on earlier edits, so treat as random/complex
      }
      if (expr.right.type === 'Literal') {
        const value = fi.coerce(expr.right.value, reporter);
        return [{type: 'field', field: field.join('.'), value, random}];
      } else if (expr.right.type === 'CallExpression') {
        assertType<jsep.Expression>(expr.right.callee);
        assertType<jsep.Expression[]>(expr.right.arguments);
        if (expr.right.callee.type === 'Identifier' &&
            expr.right.callee.name === 'pick' &&
            expr.right.arguments.length === 0) {
          return [{type: 'field', field: field.join('.'), value: PICK, random}];
        }        
      }
      return [{type: 'field', field: field.join('.'), random: true}];
    } else {
      reporter?.report(`unknown assignment target: ${expr.left.type}`);
      return [];
    }
  } else if (expr.type === 'ConditionalExpression') {
    // ignore LHS for now... (validate it by trying to evaluate later?)
    return [...mutation(expr.consequent as jsep.Expression, reporter),
            ...mutation(expr.alternate as jsep.Expression, reporter)]
        .map(makeRandom);
  } else if (expr.type === 'BinaryExpression') {
    if (expr.operator !== '&&' && expr.operator !== '||') {
      reporter?.report(`top-level operators may only be "&&" or "||", but got ${expr.operator}`);
      return [];
    }
    return mutation(expr.right as jsep.Expression, reporter).map(makeRandom);
  } else {
    reporter?.report(`invalid top-level expression type: ${expr.type}`);
    return [];
  }
  function makeRandom(m: Mutation): Mutation {
    return {...m, random: true};
  }
}

function setField(message: any, info: TypeInfo, field: string, value: unknown) {
  const index = field.indexOf('.');
  if (index === -1) {
    const fi = info.field(field);
    if (!fi) return; // error message??
    const v = fi.coerce(value);
    if (v != undefined) message[fi.name] = v;
  } else {
    const parent = field.substring(0, index);
    const rest = field.substring(index + 1);
    const fi = info.field(parent);
    if (!fi || !(fi instanceof MessageFieldInfo)) return; // error??
    setField(message[fi.name] || (message[fi.name] = fi.type.type.create()), fi.type, rest, value);
  }
}

export class ConfigBuilder {
  private internal: Config = Config.create();
  private pending?: IConfig = undefined;
  // keyed by field, value is _last_ mutation (including presets)
  private mystery?: Map<string, FieldMutation> = undefined

  constructor(config?: IConfig) {
    if (config) {
      const result = this.merge(config);
      if (result) throw new Error(result);
    }
  }

  private checkState() {
    if (this.pending) throw new Error(`mutable reference out`);
  }

  // TODO: clone?
  merge(_config: IConfig): string|null {
    this.checkState();
    throw new Error('not implemented');
  }
  mutate(): IConfig {
    this.checkState();
    this.mystery = undefined;
    return this.pending = Config.fromObject(this.internal.toJSON());
  }
  commit(): string|null {
    // check mutations and return any errors as a string
    if (!this.pending) throw new Error(`commit with no mutable reference`);
    const reporter = new BasicReporter();
    this.internal = configInfo.coerce(this.pending, reporter) as Config;
    this.pending = undefined;
    reporter.report(Config.verify(this.internal));
    return reporter.result();
  }

  build(): ReadonlyConfig {
    this.checkState();
    return configInfo.fill(this.internal) as ReadonlyConfig;
  }

  // query stuff about fields, presets, and expressions
  snapshot(): Map<string, FieldMutation> {
    this.checkState();
    if (this.mystery) return this.mystery;
    // build the mutations
    const mysteryMutations = (this.internal.mystery || []).flatMap(e => mutation(jsep(e)));
    const presets = new Map<string, boolean>(); // maps to randomness.
    for (const m of mysteryMutations) {
      if (m.type !== 'preset') continue;
      const del = m.delete === 'all' ? [...presets.keys()] : m.delete;
      for (const p of del) {
        if (m.random) {
          presets.set(p, true);
        } else {
          presets.delete(p);
        }
      }
      for (const p of m.add) {
        presets.delete(p);
        presets.set(p, m.random);
      }
    }

    let presetMap: Record<string, ConfigBuilder>|undefined = undefined;
    let hidden = false;

    const fieldMutations = new Map<string, FieldMutation>();
    for (const [p, r] of presets) {
      // look up the config
      if (!presetMap) {
        const newPresets = mapObject(this.internal.nested || {},
                                     (c) => ({value: new ConfigBuilder(c)}));
        presetMap = Object.create(getStandardPresets(), newPresets);
      }
      const c = presetMap![p];
      if (!c) continue;
      const s = c.snapshot();
      if (s.get('hideConfig')?.value) hidden = true; // PICK or true.
      for (let [f, m] of s) {
        fieldMutations.set(f, r ? {...m, random: true} : {...m});
      }
    }

    // After we visit all the presets, then visit the fields
    const visitor = qnameVisitor((_f: FieldInfo, v: unknown, qname: string) => {
      if (/^(preset|mystery|nested)/.test(qname)) return;
      fieldMutations.set(qname, {type: 'field', field: qname, value: v, random: false});
    });

    configInfo.visit(this.internal, visitor, '');

    // Finally re-visit the random fields
    for (const m of mysteryMutations) {
      if (m.type !== 'field') continue;
      if (m.field === 'hideConfig') continue; // no effect - cannot override!
      fieldMutations.set(m.field, m);
    }

    // Check the hidden status
    const hm = fieldMutations.get('hideConfig');
    if (hm?.value === true) {
      fieldMutations.clear();
      fieldMutations.set('hideConfig', hm); // only reveal that we're hidden.
    } else if (hidden) {
      fieldMutations.set('hideConfig', {type: 'field', field: 'hideConfig',
                                        value: PICK, random: false});
    }
    return this.mystery = fieldMutations;
  }
}

export type PresetMap = {readonly [key: string]: ConfigBuilder};
const getStandardPresets = (() => {
  // NOTE: This is lazy because it relies on TypeInfo having been resolved.
  // We could possibly just put it after the `resolve(ConfigPb)` call.
  let standardPresets: Record<string, ConfigBuilder>|undefined = undefined;
  function buildStandardPresets() {
    const presets: Record<string, Config> = {};
    const visitor = qnameVisitor((f: FieldInfo, _v: unknown, name: string) => {
      // Primitives can have presets directly
      for (const [opt, val] of Object.entries(f.field.options || {})) {
        const p = opt.replace(/^preset\./, '');
        if (opt === p) continue;
        const message = presets[p] || (presets[p] = Config.create());
        setField(message, configInfo, name, val);
      }
    });
    configInfo.visit(null, visitor, '');
    standardPresets = mapObject(presets, c => new ConfigBuilder(c));
  }
  return () => {
    if (!standardPresets) buildStandardPresets();
    return standardPresets as PresetMap;
  };
})();

function mapObject<K extends string|number|symbol, T, U>(
    obj: Record<K, T>, fn: (arg: T, key: K) => U): Record<K, U> {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = fn(v as T, k as K);
  }
  return out;
}

// function isSimple(e: jsep.Expression): boolean {
//   if (e.type !== 'CallExpression') return false;
//   const callee = e.callee as jsep.Expression;
//   if (callee.type !== 'Identifier' || callee.name !== 'pick') return false;
//   return (e.arguments as unknown[])!.length === 0;
// }

assert(Config instanceof Type);
const configInfo = resolve(Config);

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
