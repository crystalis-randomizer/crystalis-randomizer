import { Expression, parse } from './jsep';
import { FieldInfo, MapFieldInfo, MessageFieldInfo, RepeatedFieldInfo, qnameVisitor } from './info';
import { checkExhaustive } from './assert';
import { ConfigLike, ConfigPath, configInfo, getAllConfigPaths, getStandardPresets } from './config';
import { Table, ReadonlyTable } from './table';
import { ReadonlySetMultimap, SetMultimap } from '../util';

// Determines whether the expression is a set of known values with known probabilities.
// Returns undefined if it's not.

// States of an lvalue:
//  1. message or primitive field: base missing, info present
//  2. local variable: base and info both missing
//  3. within a repeated or map: base present
// interface LValue {
//   // terms in the qualified name
//   readonly terms: readonly (string|number)[];
//   // base lvalue of the last non-message field
//   readonly base?: LValue;
//   // field info
//   readonly info?: FieldInfo;
// }

class Source {
  constructor(readonly index: number, readonly expr: string, readonly preset?: string) {}

  toString() {
    return [
      this.expr || '',
      this.preset ? '&' + this.preset : '',
      this.index >= 0 ? '@' + this.index : '',
    ].filter(x => x).join(' ');
  }
}

const ignoredRe = /^(mystery|nested|hideConfig)$/;


export class Analysis {
  constructor(
      // actual config
      readonly config: ConfigLike,
      // bi-multimap between expressions and mutated config paths, so that
      // we can figure out which expression to modify in UI.  Note that a
      // single expression that modifies multiple paths should be treated
      // as complex no matter what.  The last mutation can be determined
      // by iterating over the row.
      readonly mutations: ReadonlyTable<string, Source, Mutation>,
      // map from expression to warnings
      readonly warnings: ReadonlySetMultimap<Source, string>,
      // name of preset, if nested
      readonly presetName?: string) {}

  mutation(path: ConfigPath): Mutation|undefined {
    const row = [...this.mutations.row(path).values()];
    if (!row.length) return undefined; // default.
    const last = row[row.length - 1];
    if (last.value.type === 'hidden' || last.value.type === 'complex') {
      return {op: '=', value: last.value};
    } else if (last.op !== '=' || row.length > 1) {
      return {op: '=', value: complex};
    }
    return last;
  }

  static from(config: ConfigLike, presetName?: string): Analysis {
    if (config.hideConfig) {
      const mutations = new Table<string, Source, Mutation>();
      const source = new Source(-1, '', presetName);
      for (const [path] of getAllConfigPaths()) {
        if (ignoredRe.test(path)) continue;
        mutations.set(path, source, {op: '=', value: hidden});
      }
      // TODO - indicate hiddenness somehow?
      return new Analysis(config, mutations, new SetMultimap(), presetName);
    }

    const analyzer = new Analyzer(presetName);
    // TODO - need to get a full LValue, so qnamevisitor probably insufficient.
    const visitor = qnameVisitor((f: FieldInfo, v: unknown, path: string) => {
      if (v == undefined) return;
      let op = '=';
      if (f instanceof MapFieldInfo) {
        // NOTE: empty maps should not be treated as overwrites!
        if (!Object.keys(v as object).length) return;
        // TODO - how to decide between overwrite vs append? correct default?
        // Append seems more consistent with how we treat protos.  We can
        // overwrite with empty via an expression, but not via a config field,
        // since repeated has no presence.  So overwrite seems inconsistent.
        // Worst case, we could have a "overwrite" field?
        op = '+=';
      } else if (f instanceof RepeatedFieldInfo) {
        // NOTE: empty arrays should not be treated as overwrites!
        if (!(v as unknown[]).length) return;
        op = '+=';
      }

      // TODO - consider a `repeated string hidden` to hide individual fields?
      // TODO - report default-hidden fields with non-empty values

      // add preset names but not expressions or nested preset values.
      if (ignoredRe.test(f.name)) return;
      // report a real value
      analyzer.addMutation(path, analyzer.rootSource,
                           {op, value: fixed(f.coerce(v))});
    }, true);
    configInfo.visit(config, visitor, '');

    // iterate through expressions
    let i = 0;
    for (const e of (config.mystery || [])) {
      analyzer.analyzeExpression(i++, e);
    }
    return new Analysis(config, analyzer.mutations,
                        analyzer.warnings, presetName);
  }

  /**
   * Recursively expands presets, returning a new Analysis with mutations from
   * each preset folded in.
   */
  expand(): Analysis {
    const presets = new Map<string, [boolean, Source]>(); // true = nondeterministic.
    const warnings = new SetMultimap<Source, string>(this.warnings.entries());
    const standardPresets = getStandardPresets();
    for (const [s, m] of this.mutations.row('presets')) {
      if (!isDiscrete(m.value)) {
        for (const p of Object.keys({...standardPresets,
                                     ...this.config.nested})) {
          presets.set(p, [true, s]);
        }
        break;
      } else if (!/^[-+]?=$/.test(m.op)) {
        warnings.add(s, `bad preset assignment operator`);
        break;
      }
      const ps = [];
      for (const [, v] of picks(m.value)) {
        if (Array.isArray(v)) {
          ps.push(...v);
        } else if (typeof v === 'string') {
          ps.push(v);
        } else {
          warnings.add(s, `bad preset assignment`);
        }
      }
      const nondeterministic = m.value.type !== 'fixed';
      if (m.op === '=') presets.clear();
      for (const p of ps) {
        presets.delete(p);
        if (m.op !== '-=') presets.set(p, [nondeterministic, s]);
      }
    }

    const children: [Analysis, boolean][] = [];
    for (const [p, [nd, s]] of presets) {
      const preset = this.config.nested?.[p] ?? standardPresets[p];
      if (!preset) {
        warnings.add(s, `unknown preset: ${p}`);
      } else {
        const childName = this.presetName ? `${this.presetName}.${p}` : p;
        children.push([Analysis.from(preset, childName).expand(), nd]);
      }
    }
    children.push([new Analysis(this.config, this.mutations, warnings), false]);
    const analyzer = new Analyzer();
    for (const [analysis, nd] of children) {
      for (const [s, w] of analysis.warnings.entries()) {
        warnings.add(s, w);
      }
      for (const [r, c, m] of analysis.mutations) {
        const value = nd && m.value.type !== 'hidden' ? complex : m.value;
        analyzer.addMutation(r, c, {...m, value});
      }
    }
    // delete preset mutations entirely...?
    //   - todo - instead, build up a tree of presets that were applied???
    analyzer.mutations.row('presets').clear();

    return new Analysis(this.config, analyzer.mutations,
                        warnings, this.presetName);
  }
}

export class Analyzer {

  // TODO - account for the fact that duplicate exprs are possible,
  // maybe by changing string to number (index)?
  //  - also may want to keep an extra map of the last-index mutation
  //    unless we always need to iterate anyway to determine complexity?
  mutations = new Table<string, Source, Mutation>();
  warnings = new SetMultimap<Source, string>();

  // NOTE: these are treated as values
  rootSource: Source;
  source: Source;

  constructor(preset?: string) {
    this.source = this.rootSource = new Source(-1, '', preset);
  }

  report(message: string): void {
    this.warnings.add(this.source, message);
  }

  addMutation(path: string, source: Source, mut: Mutation) {
    if (mut.op === '=') this.mutations.row(path).clear();
    this.mutations.set(path, source, mut);
  }

  analyzeExpression(index: number, expr: string): void {
    const e = parse(expr);
    this.source = new Source(index, expr, this.rootSource.preset);
    this.analyze(e, false, undefined);
  }

  private analyze(expr: Expression, random: boolean, context?: FieldInfo): Value {
    // NOTE: it's tempting to try to track the specific probability for each
    // branch with `random`, rather than a simple boolean, but in practice
    // there's nothing useful to do with it.  This opens the door to a ton of
    // dependent probabilities, which are useless to the UI (i.e.
    // `rand() < 0.5 ? bar = 1 : baz = 2` could mutate `bar` with a non-unit
    // pick, but the `baz` mutation is exactly complementary.
    switch (expr.type) {
      case 'AssignmentExpression': {
        // parse lhs, deal with rhs
        const op = expr.operator;
        const lhs = this.parseLValue(expr.left, random);
        let value =
            this.analyze(expr.right, random,
                         op === '=' ? lhs?.info : undefined);
        if (!lhs) return value;
        // check for a few more pathological cases
        if (lhs.info instanceof MessageFieldInfo) {
          // this isn't great... - is value an objlit?
          // even if it is, it can create dependent fields for random != 1
          this.report(`cannot assign to message field ${lhs.path}`);
          return value;
        } else if (!lhs.sub && op === '=' && isDiscrete(value)) {
          // do some validation when reasonable
          const validated: MutablePicks<unknown> = [];
          for (const [p, v] of picks(value)) {
            const ok = lhs.info.coerce(v, {report: (msg: string) => {
              this.report(`invalid value ${v} for ${lhs.path}: ${msg}`);
            }});
            validated.push([p, ok]);
          }
          value = pick(validated);
        }
        const mut = random || lhs.sub ? {op: '=', value: complex} : {op, value};
        this.addMutation(lhs.path, this.source, mut);
        return value;
      }
      case 'BinaryExpression': {
        const left = this.analyze(expr.left, random);
        const op = expr.operator;
        const right = this.analyze(expr.right,
                                   random || op === '&&' || op === '||');
        return binary(left, op, right);
      }
      case 'ConditionalExpression': {
        const test = this.analyze(expr.test, random);
        const left = this.analyze(expr.consequent, true);
        const right = this.analyze(expr.alternate, true);
        if (isDiscrete(test) && isDiscrete(left) && isDiscrete(right)) {
          const p = picks(test).reduce((s, [p, v]) => s += v ? p : 0, 0);
          return pick([...scalePick(picks(left), p),
                       ...scalePick(picks(right), 1 - p)]);
        }
        return complex;
      }
      case 'MemberExpression':
        this.analyze(expr.object, random);
        if (expr.computed) this.analyze(expr.property, random);
        return complex;
      case 'CallExpression':
        const isHybrid = (expr.callee as {name: string})?.name === 'hybrid';
        const args = expr.arguments.map((arg, index) => {
          const ctx = isHybrid && (index & 1) ? context : undefined;
          return this.analyze(arg, random, ctx);
        });
        if (expr.callee.type !== 'Identifier') {
          this.report(`can only call simple named functions`);
          return complex;
        }
        const name = expr.callee.name;
        if (name === 'rand') {
          if (args.length) this.report('rand() takes no arguments');
          return {type: 'uniform', min: 0, max: 1};
        } else if (name === 'randn') {
          if (args.length) this.report('randn() takes no arguments');
          return {type: 'normal', mean: 0, std: 1};
        } else if (name === 'pick') {
          if (args.length) this.report('pick() takes no arguments');
          if (!context) {
            this.report('pick() must be assigned directly to config property');
          }
          return all;
        } else if (name === 'hybrid') {
          // this is maybe the hardest...
          if (args[0]?.type !== 'uniform') return complex;
          if (args.length & 1) this.report('hybrid() requires even arg count');
          const vals: Array<readonly [number, unknown]> = [];
          let min = args[0].min;
          const max = args[0].max;
          const scale = 1 / (max - min);
          for (let i = 1; i < args.length; i += 2) {
            const val = args[i];
            if (!isDiscrete(val)) return complex;
            if (i + 1 < args.length) {
              const threshold = args[i + 1];
              if (!isFixedNumber(threshold)) return complex;
              const n = Math.max(min, Math.min(max, threshold.val));
              vals.push(...scalePick(picks(val), scale * (n - min)));
              min = n;
            } else if (min < max) {
              vals.push(...scalePick(picks(val), scale * (max -  min)));
            }
          }
          return pick(vals);
        }
        return complex;
      case 'ArrayExpression': {
        let array: unknown[]|undefined = [];
        for (const arg of expr.elements) {
          const value = this.analyze(arg, random);
          if (value.type === 'fixed') {
            array?.push(value.val);
          } else {
            array = undefined;
          }
        }
        return array ? fixed(array) : complex;
      }
      case 'ObjectExpression':
        for (const prop of expr.properties) {
          this.analyze(prop.key, random);
          this.analyze(prop.value, random);
        }
        // NOTE: we could try to track simple objlits, like `{}` or `{x: 1}`,
        // but we're not going to expose it in the UI anyway, so why bother?
        return complex;
      case 'UnaryExpression':
        return unary(expr.operator, this.analyze(expr.argument, random));
      case 'Identifier':
        return complex;
      case 'Literal':
        return fixed(expr.value);
      default:
        checkExhaustive(expr);
    }
  }

  parseLValue(expr: Expression, random: boolean): LValue|undefined {
    switch (expr.type) {
      case 'Identifier': {
        const info = configInfo.field(expr.name);
        return info && {path: info.name as ConfigPath, info};
      }
      case 'MemberExpression': {
        const obj = this.parseLValue(expr.object, random);
        if (!obj) return undefined; // local variables all end up here.
        if (obj.sub) return obj;
        let key: string|undefined = undefined;
        if (expr.computed) {
          this.analyze(expr.property, random);
        } else if (expr.property.type === 'Identifier') {
          key = expr.property.name;
        } else if (expr.property.type === 'Literal') {
          // we don't track any numeric sub-property accesses, just set sub=true
        } else {
          this.report(`bad non-computed prop: ${expr.property.type}`);
          return undefined;
        }
        if (key && obj.info instanceof MessageFieldInfo) {
          const info = obj.info.type.field(key);
          if (info) {
            return {path: `${obj.path}.${info.name}` as ConfigPath, info};
          }
          this.report(`unknown field ${key} on ${obj.path}`);
          return undefined; // error once, ignore downstream issues
        }
        if (obj.info instanceof MessageFieldInfo) {
          this.report(`cannot computed-assign on message ${obj.path}`);
        }
        return {...obj, sub: true};
      }
    }
    this.report(`bad expression type on left of assignment: ${expr.type}`);
    return undefined;
  }
}


      //     this.report(`computed prop not allowed for non-map config assignments`);
      //     return undefined;
      //   }
      //   const lvalue = obj.at(key);
      //   if (typeof lvalue === 'string') { // error case.
      //     this.report(lvalue);
      //     return undefined;
      //   }
      //   return lvalue;
      // }

export interface Mutation {
  // operator
  readonly op: string;
  // assigned value, or something about the randomness
  readonly value: Value;
}

// Most basic representation of an assignment we can possibly track
interface LValue {
  // Path to the lhs, will not descend into repeated or map fields
  readonly path: ConfigPath;
  // Info for the primitive/map/repeated field
  readonly info: FieldInfo;
  // Whether there's additional property accesses beyond path.  We could try
  // to track exactly what, but realistically there's nothing useful we'd want
  // to do with this information, since we're not going to try to expose
  // specific map entries in the UI.  Picks in the property are also no good
  // because it would make probabilities interdependent, so the actual
  // probability values are useless to the UI (which only wants to expose
  // fully-independent probabilities as sliders).
  readonly sub?: boolean;
}

////////

export type Value = DiscreteValue|DistValue|OpaqueValue;
export type DiscreteValue = FixedValue|PickValue;
export type DistValue = UniformValue|NormalValue;
export type OpaqueValue = AllValue|ComplexValue|HiddenValue;

export interface FixedValue {
  readonly type: 'fixed';
  readonly val: unknown;
}
export interface PickValue {
  readonly type: 'pick';
  readonly vals: Picks<unknown>;
}
// NOTE: Probabilities MUST sum to 1, since any other approach opens the door
// to dependent-probability mutations, which are useless to the UI.
type Picks<T = unknown> = ReadonlyArray<readonly [number, T]>;
type MutablePicks<T = unknown> = Array<readonly [number, T]>;

export interface UniformValue {
  readonly type: 'uniform';
  readonly min: number;
  readonly max: number;
}
export interface NormalValue {
  readonly type: 'normal';
  readonly mean: number;
  readonly std: number;
}

export type AllValue = {readonly type: 'all'};
export type ComplexValue = {readonly type: 'complex'};
export type HiddenValue = {readonly type: 'hidden'};

////////

function fixed(val: unknown): Value {
  return {type: 'fixed', val};
}
function picks(v: DiscreteValue): Picks<unknown> {
  if (v.type === 'fixed') return [[1, v.val]];
  if (v.type === 'pick') return v.vals;
  throw new Error(`bad type: ${(v as any).type}`);
}
function picks2(a: DiscreteValue, b: DiscreteValue): Picks<[unknown, unknown]> {
  const out: MutablePicks<[unknown, unknown]> = [];
  for (const [pa, va] of picks(a)) {
    for (const [pb, vb] of picks(b)) {
      out.push([pa * pb, [va, vb]]);
    }
  }
  return out;
}
// function zip(a: DiscreteValue, b: DiscreteValue, f: (a: unknown, b: unknown) => unknown): Picks<unknown> {
//   const out: MutablePicks<unknown> = [];
//   for (const [pa, va] of picks(a)) {
//     for (const [pb, vb] of picks(b)) {
//       out.push([pa * pb, f(va, vb)]);
//     }
//   }
//   return out;
// }
// function zipNum(a: DiscreteValue, b: DiscreteValue, f: (a: number, b: number) => unknown): Picks<unknown> {
//   return zip(a, b, (a, b) => {
//     if (typeof a !== 'number')
//   });
// }

function pick(vals: ReadonlyArray<readonly [number, unknown]>): Value {
  if (vals.length === 1 && vals[0][0] === 1) return fixed(vals[0][1]);
  return {type: 'pick', vals};
}
function isFixedNumber(v: Value): v is {type: 'fixed', val: number} {
  return v.type === 'fixed' && typeof v.val === 'number';
}
function isDiscrete(v: Value): v is DiscreteValue {
  return v.type === 'pick' || v.type === 'fixed';
}
function isDist(v: Value): v is DistValue {
  return v.type === 'uniform' || v.type === 'normal';
}
const complex = {type: 'complex'} as const;
const hidden = {type: 'hidden'} as const;
const all = {type: 'all'} as const;

////////

function distShift(v: Value, s: number): Value {
  if (v.type === 'uniform') {
    return {...v, min: v.min + s, max: v.max + s};
  } else if (v.type === 'normal') {
    return {...v, mean: v.mean + s};
  }
  return complex;
}
function distScale(v: Value, s: number): Value {
  if (v.type === 'uniform') {
    const a = v.min * s;
    const b = v.max * s;
    return {...v, min: Math.min(a, b), max: Math.max(a, b)};
  } else if (v.type === 'normal') {
    return {...v, mean: v.mean * s, std: v.std * Math.abs(s)};
  }
  return complex;
}

function distCmp(v: Value, s: number, n: number): Value {
  if (v.type !== 'uniform' || v.max <= v.min) return complex;
  if (n <= v.min) return fixed(s < 0);
  if (v.max <= n) return fixed(s > 0);
  return pick([[(n - v.min) / (v.max - v.min), s < 0],
               [(v.max - n) / (v.max - v.min), s > 0]]);
}

function binary(left: Value, op: string, right: Value): Value {
  // Recognize several patterns.  Arbitrary math is _not supported_, though we
  // allow some simple arithmetic on constants for convenience.
  //  1. rand() +- c
  //  2. rand() */ c
  //  3. rand() <=> c
  if (isDiscrete(left) && isDiscrete(right)) {
    const out: MutablePicks<unknown> = [];
    for (const [p, [l, r]] of picks2(left, right)) {
      if (op === '&&') out.push([p, l && r])
      if (op === '||') out.push([p, l || r])
      if (typeof l !== 'number' || typeof r !== 'number') return complex;
      if (op === '+') out.push([p, l + r]);
      if (op === '-') out.push([p, l - r]);
      if (op === '*') out.push([p, l * r]);
      if (op === '/') out.push([p, l / r]);
    }
    return pick(out);
  } else if (isDist(left) && isFixedNumber(right)) {
    if (op === '+') return distShift(left, right.val);
    if (op === '-') return distShift(left, -right.val);
    if (op === '*') return distScale(left, right.val);
    if (op === '/') return distScale(left, 1 / right.val);
    if (op[0] === '<') return distCmp(left, -1, right.val);
    if (op[0] === '>') return distCmp(left, 1, right.val);
  } else if (isDist(right) && isFixedNumber(left)) {
    if (op === '+') return distShift(right, left.val);
    if (op === '-') return distShift(distScale(right, -1), left.val);
    if (op === '*') return distScale(right, left.val);
    if (op[0] === '<') return distCmp(right, 1, left.val);
    if (op[0] === '>') return distCmp(right, -1, left.val);
  }
  return complex;
}

function unary(op: string, arg: Value): Value {
  if (isDiscrete(arg)) {
    const out: MutablePicks<unknown> = [];
    // if wrong type - return complex
    for (const [p, v] of picks(arg)) {
      if (op === '!') out.push([p, !v]);
      if (typeof v !== 'number') return complex;
      if (op === '+') out.push([p, +v]);
      if (op === '-') out.push([p, -v]);
      if (op === '~') out.push([p, ~v]);
    }
  } else if (isDist(arg)) {
    if (op === '+') return arg;
    if (op === '-') return distScale(arg, -1);
  }
  return complex;
}

function scalePick(picks: Picks<unknown>, scale: number): Picks<unknown> {
  return picks.map(([p, v]) => [p * scale, v]);
}
