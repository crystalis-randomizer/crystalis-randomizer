// handles expressions

import { Expression } from './jsep';
import { FieldInfo, MapFieldInfo, MessageFieldInfo, PrimitiveFieldInfo, RepeatedFieldInfo, TypeInfo } from './info';
import { checkExhaustive } from './assert';
// import { Arr, BasicVal, Bool, CallContext, Err, ErrBuilder, Func, Mut, Num, RANDOM, Rand, Str, Val, isErr, wrapValue } from './val.js';
// import { Random } from '../random.js';

interface CallContext {
  lvalue?: LValue;
}

interface Reporter {
  report(msg: string): void;
}

// interface IConfig {
//   presets: string[];
//   exprs: string[];
//   //other fields...
//   nested: Record<string, IConfig>;
// }

// export function evaluate(config: IConfig, info: TypeInfo, random: Random): IConfig {
//   // how simple can we make this?
//   // will need to be called recursively, obvi (for presets)

// }

// export function analyze(config: IConfig, info: TypeInfo): Map<string, Mutation> {
//   return new Analyzer(config, info).analyze();  
// }

function isRandCall(e: Expression): boolean {
  return e.type === 'CallExpression' &&
    e.callee.type === 'Identifier' &&
    e.callee.name === 'rand' &&
    e.arguments.length === 0;
}
function isNumberLiteral(e: Expression): e is NumberLiteral {
  return e.type === 'Literal' && typeof e.value === 'number';
}
interface NumberLiteral {
  type: 'Literal';
  value: number;
  raw: string;
}
function extractLiteral(e: Expression, lhs?: LValue): unknown {
  if (e.type === 'Literal') return e.value;
  if (e.type === 'ArrayExpression') {
    const out: unknown[] = [];
    for (const x of e.elements) {
      const xl = extractLiteral(x);
      if (Number.isNaN(xl)) return NaN;
      out.push(xl); // string, number, boolean, or other literal
    }
    return out;
  }
  if (e.type === 'ObjectExpression') {
    const out: Record<string, unknown> = {};
    for (const p of e.properties) {
      if (p.computed) return NaN;
      if (p.key.type === 'Identifier') {
        const xl = extractLiteral(p.value);
        if (Number.isNaN(xl)) return NaN;
        out[p.key.name] = xl;
      }
      return NaN; // should never happen?
    }
  }
  if (e.type === 'CallExpression') {
    // look for `pick()`, `pick('sword of wind', 'sword of fire', ...)`,
    // or maybe even `pick(default(), preset('vanilla'))`?
    // UI can expose different types of random:
    //  - definite value
    //  - probability of overriding value
    //  - definite assignment to probablity of values
    //      placement.mimics = pick()
    //      enemies.enemy_weaknesses = pick('random', 'shuffle')
    //      enemies.enemy_weaknesses = pick(['random', 0.4], ['shuffle': 0.5])
    //    what does any remainder map to?
    //     - would need to ban ordinary lists....?
    //        ... = rand() < 0.4 ? 'random' : rand() < 0.5 ? 'shuffle' : 'vanilla'
    //     - need to recognize chained independent randoms?
    //  - boolean <- rand()  - rounds to 0 or 1.
    //    boolean <- rand() < 0.3  - more definite than `rand() < 0.3 && (x = true)`
    //    do we actually want to recognize the other case?
    //     - advantage is we can choose _not_ to override...?
    //       actually seems more complicated, so maybe skip!
    //     - foo = rand() < 0.3 ? 1 : rand() < 0.5 ? preset('vanilla') : preset('default')
  }
  if (e.type === 'AssignmentExpression' && e.operator === '=') return extractLiteral(e.right);
  // everything else is NOT a literal so just return NaN
  return NaN;
}

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

export class LValue {
  private constructor(readonly terms: readonly (string|number)[],
                      readonly base?: LValue,
                      readonly info?: FieldInfo) {}
  static of(name: string, typeInfo?: TypeInfo): LValue {
    const f = typeInfo?.field(name);
    if (f) return new LValue([f.name], undefined, f);
    return new LValue([name]);
  }
  // NOTE: will never lose info: an lvalue w/ info will always map to another with info
  at(term: string|number): LValue|string {
    if (!this.info) return new LValue([...this.terms, term]);
    // cannot descend into primitive field
    if (this.info instanceof PrimitiveFieldInfo) return `cannot index primitive ${this.info}`;
    if (this.info instanceof RepeatedFieldInfo) {
      if (typeof term !== 'number') return `repeated field ${this.info} requires numeric index`;
      return new LValue([...this.terms, term], this.base || this, this.info.element);
    } else if (this.info instanceof MapFieldInfo) {
      // look at the key type
      const errs: string[] = [];
      const k = this.info.key.coerce(term, {report(msg: string) {errs.push(msg);}});
      if (k == undefined) return errs[0] || `failed to coerce ${term} to key of ${this.info}`;
      if (typeof k === 'string' || typeof k === 'number') {
        return new LValue([...this.terms, k], this.base || this, this.info.value);
      }
      return `unexpected coerced key type ${typeof k} for ${this.info}`;
    } else if (this.info instanceof MessageFieldInfo) {
      if (typeof term === 'number') return `message ${this.info} requires string fields`;
      const f = this.info.type.field(term);
      if (!f) return `unknown field ${term} in ${this.info}`;
      return new LValue([...this.terms, f.name], this.base, f);
    }
    return `unknown info type: ${this.info}`;
  }
  qname(): string {
    let out = '';
    for (const t of this.terms) {
      if (/^[a-z_$][a-z0-9_$]*$/i.test(String(t))) {
        out += (out ? '.' : '') + t;
      } else {
        out += `[${t}]`;
      }
    }
    return out;
  }
}

export interface Mutation {
  // lvalue being assigned to
  readonly lhs: LValue;
  // operator
  readonly op: string;
  // value as a primitive, array, or object
  readonly value: unknown;
  // independent chance of accepting mutation, or NaN if not independent
  readonly random: number;
}

// // return this after issuing an error...?
// const ANY = new Proxy({}, {
//   get() { return ANY; },
//   set() { return false; },
// });

export class Analyzer {

  mutations = new Map<string, Mutation>();
  warnings: string[] = [];

  constructor(readonly rootInfo: TypeInfo) {}

  report(message: string): void {
    this.warnings.push(message);
  }

  analyze(expr: Expression, random: number = 1) {
    switch (expr.type) {
      case 'AssignmentExpression': {
        // parse lhs, deal with rhs
        const lhs = this.parseLValue(expr.left);
        this.analyze(expr.right);
        if (lhs) {
          const value = extractLiteral(expr.right, lhs);
          this.mutations.set(lhs.qname(), {lhs, op: expr.operator, value, random});
        }
        break;
      }
      case 'BinaryExpression':
        this.analyze(expr.left, random);
        if (expr.operator === '&&' || expr.operator === '||') {
          const left = expr.left;
          let r = random;
          // match exact pattern `rand() < 0.2 && (foo = bar)`
          if (left.type === 'BinaryExpression' && left.operator === '<' &&
              isRandCall(left.left) && isNumberLiteral(left.right)) {
            const v = Math.max(0, Math.min(left.right.value, 1));
            r = random * (expr.operator === '&&' ? v : 1 - v);
          }
          this.analyze(expr.right, r);
        } else {
          this.analyze(expr.right, random);
        }
        break;
      case 'ConditionalExpression':
        this.analyze(expr.test, random);
        // TODO - consider recognizing `rand() < 0.1 ? foo = bar : null`
        this.analyze(expr.consequent, NaN);
        this.analyze(expr.alternate, NaN);
        break;
      case 'MemberExpression':
        this.analyze(expr.object, random);
        if (expr.computed) this.analyze(expr.property, random);
        break;
      case 'CallExpression':
        if (expr.callee.type !== 'Identifier') {
          this.warnings.push(`can only call simple named functions`);
        }
        for (const arg of expr.arguments) {
          this.analyze(arg, random);
        }
        break;
      case 'ArrayExpression':
        for (const arg of expr.elements) {
          this.analyze(arg, random);
        }
        break;
      case 'ObjectExpression':
        for (const prop of expr.properties) {
          this.analyze(prop.key, random);
          this.analyze(prop.value, random);
        }
        break;
      case 'UnaryExpression':
        this.analyze(expr.argument, random);
        break;
      case 'Identifier':
      case 'Literal':
        break;
      default:
        checkExhaustive(expr);
    }
  }

  parseLValue(expr: Expression): LValue|undefined {
    switch (expr.type) {
      case 'Identifier': {
        const lvalue = LValue.of(expr.name, this.rootInfo);
        return lvalue.info ? lvalue : undefined;
      }
      case 'MemberExpression': {
        const obj = this.parseLValue(expr.object);
        if (!obj) return undefined; // local variables all end up here.
        let key: string|number;
        if (expr.computed) {
          if (obj.info instanceof MapFieldInfo) {
            key = NaN;
          } else {
            this.warnings.push(`computed property not allowed for non-map config assignments`);
            return undefined;
          }
        } else if (expr.property.type === 'Identifier') {
          key = expr.property.name;
        } else if (expr.property.type === 'Literal') {
          key = typeof expr.property.value === 'number' ? expr.property.value : expr.property.raw;
        } else {
          this.warnings.push(`bad non-computed prop: ${expr.property.type}`);
          return undefined;
        }
        const lvalue = obj.at(key);
        if (typeof lvalue === 'string') { // error case.
          this.warnings.push(lvalue);
          return undefined;
        }
        return lvalue;
      }
    }
    this.warnings.push(`bad expression type on left of assignment: ${expr.type}`);
    return undefined;
  }
}


function fromEntries(entries: ReadonlyArray<readonly [string|number, unknown]>): object {
  const obj: Record<string|number, unknown> = {};
  for (const [k, v] of entries) {
    obj[k] = v;
  }
  return obj;
}

function defaultValue(info: FieldInfo): unknown {
  // PROBLEM - do we start with the preset? no
  //   - do we just go with the regular default?
  // presets: vanilla
  // items.medicalHerbHeal *= 2
  //
  // what does that do? if inherited from preset?
  // seems reasonable if already set, but if undefined...?
  //  - same problem as reading from fields...!
  //  - even deferring mutations doesn't help
  //
  // maybe the thing to do is just to say that reads are direct on _this_ proto,
  // and that there's just no way to observe a preset?  They're prepended AFTER
  // expressions (unless maybe a `flushPresets()` call?)  Does that make sense??
  //
  // in that case, we can simplify - no need for complex lvalue parsing in evaluator,
  // instead just evaluate the LHS mostly normally...?  just look at LHS of assignment
  // and see "if identifier then assign, else if getprop then setprop", where objet of
  // setprop is an ordinary object (with defaults as needed)
  //  - we can lookup field by checking $type on objects [need to always Type.create()
  //    them], and need special handling for repeated arrays and maps [maybe a weakmap?]
  //  - CallContext can maybe just be FieldInfo?

  if (info instanceof RepeatedFieldInfo) return [];
  if (info instanceof MapFieldInfo) return {};
  if (info instanceof MessageFieldInfo) return info.type.type.create();
  throw '';
}

type Fn = (args: unknown[], reporter: Reporter|undefined, ctx: CallContext) => unknown;

export class Evaluator {
  vars = new Map<string, unknown>();
  functions: Record<string, Fn> = {};

  constructor(readonly root: object, readonly rootInfo: TypeInfo) {}
  // warnings: string[] = [];
  // warn(msg: string): Val {
  //   this.warnings.push(msg);
  //   return UNDEF;
  // }

  private prop(computed: boolean, prop: Expression, reporter?: Reporter): string|number|undefined {
    if (computed) {
      const key = this.evaluate(prop, reporter);
      if (typeof key === 'string' || typeof key === 'number') return key;
      reporter?.report(`bad computed key: ${key} (type: ${typeof key})`);
      return undefined;
    }
    if (prop.type === 'Identifier') return prop.name;
    if (prop.type === 'Literal') return typeof prop.value === 'number' ? prop.value : prop.raw;
    reporter?.report(`bad non-computed key type: ${prop.type}`);
    return undefined;
  }

  evaluate(expr: Expression, reporter?: Reporter, ctx: CallContext = {}): unknown {
    switch (expr.type) {
      case 'Literal': return expr.value;
      case 'ArrayExpression': return expr.elements.map(e => this.evaluate(e, reporter));
      case 'ObjectExpression': return fromEntries(expr.properties.flatMap(p => {
        const key = this.prop(p.computed, p.key, reporter);
        return key != null ? [[key, this.evaluate(p.value, reporter)]] : [];
      }));
      case 'Identifier': return this.vars.get(expr.name);
      case 'MemberExpression': {
        const key = this.prop(expr.computed, expr.property, reporter);
        if (key == undefined) return undefined; // already reported.
        const obj = this.evaluate(expr.object, reporter);
        if (!obj || typeof obj !== 'object') {
          reporter?.report(`property access on non-object: ${obj}`);
          return undefined; // note: may lead to further errors...?
        }
        return (obj as any)[key];
      }
      case 'CallExpression': {
        // restrict this to only known functions!
        if (expr.callee.type !== 'Identifier') {
          reporter?.report(`can only call functions by name, but callee was ${expr.callee.type}`);
          return undefined;
        }
        const fn = this.functions[expr.callee.name];
        if (!fn) {
          reporter?.report(`unknown function: ${expr.callee.name}`);
          return undefined;
        }
        return fn(expr.arguments.map(arg => this.evaluate(arg, reporter)), reporter, ctx);
      }
      case 'UnaryExpression': {
        const arg = this.evaluate(expr.argument) as any;
        switch (expr.operator) {
          case '!': return !arg;
          case '+': return +arg;
          case '-': return -arg;
          case '~': return ~arg;
        }
        reporter?.report(`unknown unary operator: ${expr.operator}`);
        return undefined;
      }
      case 'BinaryExpression':
        return this.binary(expr.operator, this.evaluate(expr.left, reporter), expr.right, reporter);

      case 'ConditionalExpression':
        return this.evaluate(expr.test, reporter) ?
            this.evaluate(expr.consequent, reporter, ctx) : 
            this.evaluate(expr.alternate, reporter, ctx);

      case 'AssignmentExpression': {
        // parse the LHS as an lvalue
        const lhs = this.parseLValue(expr.left, reporter);
        if (lhs == undefined) return undefined; // already reported error.
        let op = expr.operator;
        // if (lhs instanceof Err) err.check(lhs);
        let value: unknown;
        if (op !== '=') {
          if (!op.endsWith('=')) {
            reporter?.report(`unknown assignment operator: ${op}`);
            return undefined;
          }
          const left = this.evaluateLValue(lhs, reporter);
          value = this.binary(op, left, expr.right, reporter);
          //   // We've got an operator like +=
          //   //  - see if we can compute it right here?
          //   const v = this.lookupLValue(lhs);
          //   if (v instanceof Rand) {
              
          //   } else if (v instanceof Err) {

          //   } else if (v instanceof Prim) {
              
          //   }
          // } else if (!lhs.isRandom()) {
          //   const value = err.check(this.lookupLValue(lhs));
            
          // }
        } else {
          value = this.evaluate(expr.right, reporter, {lvalue: lhs});
        }
        // TODO ... handle setprop!

        this.vars.set(lhs.qname(), value);

        return value;

        //return new Mut([{lhs, op: expr.operator, rhs}]);
      }
    }
    reporter?.report(`can't handle expression type ${(expr as any).type}`);
    return undefined;
  }

  parseLValue(expr: Expression, reporter?: Reporter): LValue|undefined {
    if (expr.type === 'Identifier') return LValue.of(expr.name, this.rootInfo);
    if (expr.type !== 'MemberExpression') {
      reporter?.report(`bad expression type in lvalue: ${expr.type}`);
      return undefined;
    }
    const key = this.prop(expr.computed, expr.property, reporter);
    if (key == undefined) return undefined;
    const obj = this.parseLValue(expr.object, reporter);
    if (!obj) return undefined; // already reported.
    const lvalue = obj.at(key);
    if (typeof lvalue === 'string') { // error case.
      reporter?.report(lvalue);
      return undefined;
    }
    return lvalue;
  }

  evaluateLValue(lhs: LValue, reporter?: Reporter): unknown {
    if (lhs.info) {
      // config field
      let val: Record<string|number, unknown> = this.root as any;
      let info: FieldInfo|undefined = undefined;
      for (const k of lhs.terms) {
        const nextInfo: FieldInfo|undefined =
            !info ? this.rootInfo.field(k as string) :
            info instanceof MessageFieldInfo ? info.type.field(k as string) :
            info instanceof RepeatedFieldInfo ? info.element :
            info instanceof MapFieldInfo ? info.value :
            undefined;
        if (!nextInfo) {
          reporter?.report(`bad field ${k} of ${info || this.rootInfo}`);
          return undefined;
        }
        let next = val[k] ?? (val[k] = info && defaultValue(info));
        val = next as any;
        info = nextInfo;
      }
    } else {
      // local
      return null!;
    }
    return undefined;
  }

  binary(op: string, left: unknown, right: Expression, reporter?: Reporter): unknown {
    return null!;
  }

  // isAnalysis(): boolean {
  //   return this.root == null;
  // }

  // unary(op: string, arg: Val): Val {
  //   if (arg instanceof Err) return arg;
  //   const err = new ErrBuilder();
  //   if (arg instanceof Func) return err.fatal(`cannot operate on ${arg}`);
  //   if (arg instanceof Rand) return RANDOM;
  //   if (op === '!') {
  //     // return true/false
  //     if (arg instanceof Prim) {
  //       return (arg.type === 'str' ? arg.str() : arg.num()) ? Bool.FALSE : Bool.TRUE;
  //     } else if (arg instanceof Obj) {
  //       return Bool.FALSE;
  //     } else {
  //       return err.fatal(`unknown type for unary !: ${arg}`);
  //     }
  //   } else if (!(arg instanceof Prim) || arg.type === 'null') {
  //     return err.fatal(`unknown type for unary ${op}: ${arg}`);          
  //   }
  //   let num = arg.num();
  //   if (num == undefined) num = Number(arg.str());
  //   switch (op) {
  //     case '-': return new Num(-num);
  //     case '~': return new Num(~num);
  //     case '+': return new Num(+num);
  //   }
  //   return err.fatal(`unknown unary operator: ${op}`);
  // }

  // binary(op: string, left: Val, rightExpr: Expression, ctx: CallContext): Val {
  //   if (op === '&&' || op === '||') {
  //     // short-circuit
  //     if (isErr(left)) return left;
  //     if (left instanceof Mut) return Err.of(`cannot assign on left side of ${expr.operator}`);
  //     // propagate random condition into mutations
  //     if (left instanceof Rand) {
  //       const result = this.evaluate(rightExpr, ctx);
  //       if (isErr(result)) return result;
  //       return result instanceof Mut ? result.withRandom() : RANDOM;
  //     }
  //     // evaluate RHS only if necessary, return directly
  //     const v = left.toBool();
  //     if (isErr(v)) return v; // Mut/Rand OK.
  //     return ((op === '&&') === v) ? this.evaluate(rightExpr, ctx) : left;
  //   }
  //   const err = new ErrBuilder();
  //   err.check(left);
  //   const right = err.check(this.evaluate(rightExpr));
  //   if (!err.ok()) return err.build()!;
  //   switch (op) {
  //     case '+': return left.add(right);
  //     case '-': return left.sub(right);
  //     case '*': return left.mul(right);
  //     case '/': return left.div(right);
  //     case '%': return left.mod(right);
  //     case '**': return left.pow(right);
  //     case '<<': return left.asl(right);
  //     case '>>': return left.asr(right);
  //     case '>>>': return left.lsr(right);
  //     case '&': return left.and(right);
  //     case '|': return left.or(right);
  //     case '^': return left.xor(right);
  //     case '==': case '===': return Bool.of(left.eq(right));
  //     case '!=': case '!==': return Bool.of(!left.eq(right));
  //     case '<': return cmp(left.cmp(right), x => x < 0);
  //     case '<=': return cmp(left.cmp(right), x => x <= 0);
  //     case '>': return cmp(left.cmp(right), x => x > 0);
  //     case '>=': return cmp(left.cmp(right), x => x >= 0);
  //   }
  //   return err.fatal(`unknown binary operator: ${op}`);
  // }

  // /** Given an `LValue` qname, looks up the root var then calls `at` to get the actual value. */
  // lookupLValue(lvalue: LValue): Val|undefined {
  //   let v = this.lookupVar(lvalue.root);
  //   for (const p of lvalue.props) {
  //     if (v instanceof Obj) {
  //       v = v.at(p);
  //     } else {
  //       return undefined;
  //     }
  //   }
  //   return v;
  // }

  // /** Looks up a single variable from `this.vars` or `this.root` and `this.rootInfo`. */
  // lookupVar(name: string): Val {
  //   return this.vars.get(name) || (() => {
  //     const field = this.rootInfo.field(name);
  //     const result = field == undefined ? NUL :
  //       this.root ? Proto.wrap((this.root as any)[field.name], field) : RANDOM;
  //     this.vars.set(name, result);
  //     return result;
  //   })();
  // }

  // parseLValue(expr: Expression): LValueBuilder {
  //   if (expr.type === 'Identifier') {
  //     const f = this.rootInfo.field(expr.name);
  //     if (f) return new LValueBuilder(f.name, f);
  //     return new LValueBuilder(expr.name);
  //   } else if (expr.type === 'MemberExpression') {
  //     const builder = this.parseLValue(expr.object);
  //     if (expr.computed) {
  //       builder.getprop(this.evaluate(expr.property));
  //     } else if (expr.property.type === 'Identifier') {
  //       builder.getprop(Prim.wrap(expr.property.name));
  //     } else {
  //       builder.err(`non-computed prop must be Identifier, got ${expr.property.type}`);
  //     }
  //     return builder;
  //   }
  //   const builder = new LValueBuilder('');
  //   builder.err(`bad expression type in lvalue: ${expr.type}`);
  //   return builder;
  // }
}

// function cmp(result: number|Err, f: (arg: number) => boolean): Val {
//   if (isErr(result)) return result;
//   return Bool.of(f(result));
// }

// /** Transform `Mut`s to mark the `random` prop. */
// function makeRandom(val: Val): Val {
//   if (!(val instanceof Mut)) return val;
//   return new Mut(val.mutations.map(m => ({...m, random: true})));
// }


// function isMemberExpression(e: Expression): e is MemberExpression {
//   return e.type === 'MemberExpression';
// }
// function isIdentifier(e: jsep.Expression): e is Identifier;
// function isIdentifier(e: jsep.Expression, name: string): boolean;
// function isIdentifier(e: jsep.Expression, name?: string): boolean {
//   return e.type === 'Identifier' && (name == null || e.name === name);
// }
// function isCallExpression(e: jsep.Expression): e is CallExpression {
//   return e.type === 'CallExpression';
// }

// function matchCall(e: E): true|undefined;
// function matchCall<T>(e: E, cb: (callee: E, args: E[]) => T): T|undefined;
// function matchCall(e: E, cb = (..._args: any[]) => true): any {
//   if (e.type === 'CallExpression') return cb(e.callee, e.args);
//   return undefined;
// }
// function matchIdentifier(e: E): true|undefined;
// function matchIdentifier(e: E, ident: string): true|undefined;
// function matchIdentifier<T>(e: E, cb: (name: string) => T): T|undefined;
// function matchIdentifier(e: E, cb: any = () => true): any {
//   if (e.type !== 'Identifier') return undefined;
//   if (typeof cb === 'string') return cb === e.name || undefined;
//   return cb(e.name);
// }
// function matchMemberExpression(e: E): true|undefined;
// function matchMemberExpression<T>(e: E, cb: (obj: E, prop: E, computed: boolean) => T): T|undefined;
// function matchMemberExpression(e: E, cb = (..._args: any[]) => true): any {
//   if (e.type === 'MemberExpression') return cb(e.object, e.property, e.computed);
//   return undefined;
// }

// // TODO - this needs to be injected into the evaluator, since
// //        we'll want a version that takes a Random instance.
// const funcs: Record<string, Func> = {
//   'round': numberFunc('round', (x) => Math.round(x)),
// };

// function numberFunc(name: string, f: (arg: number) => number): Func {
//   return new Func(name, (args: Val[]) => {
//     if (args.length !== 1) return Err.of(`incorrect number of arguments to ${name}`);
//     const arg = args[0];
//     if (arg instanceof Err) return arg; // TODO - handle this outside??
//     if (arg instanceof Rand) return RANDOM;
//     if (arg instanceof Prim && arg.type === 'num') return new Num(f(arg.num()!));
//     return Err.of(`cannot call ${name} on type ${arg.type}`);
//   });
// }

// abstract class LVal extends Val {
//   constructor(readonly lvalue?: string) { super(); }
//   abstract toStringInternal(): string;
//   override toString() { return this.lvalue || this.toStringInternal(); }
//   override assign(op: string, value: Val): Val {
//     if (!this.lvalue) return super.assign(op, value);
//     if (op !== '=') return assignOp(this, op, value);
//     return Mut.field(this.lvalue, value);
//   }
// }

// abstract class Prim extends LVal {
//   override isValue() { return true; }
// }

// class Str extends Prim {
//   constructor(readonly str: string, lvalue?: string) { super(lvalue); }
//   override toStringInternal() { return JSON.stringify(this.str); }
//   override binary(op: string, other: Val): Val {
//     if (op !== '+') return super.binary(op, other); // error
//     if (other instanceof Rand) return RANDOM;
//     if (other instanceof Arr) return Arr.from([this]).binary('+', other);
//     if (other instanceof Str) return new Str(this.str + other.str);
//     return super.binary(op, other); // error
//   }  
// }

// class Num extends Prim {
//   constructor(readonly num: number, lvalue?: string) { super(lvalue); }
//   override toStringInternal() { return String(this.num); }
//   override binary(op: string, other: Val): Val {
//     if (other instanceof Rand) return RANDOM;
//     if (op === '+' && other instanceof Arr) return Arr.from([this]).binary('+', other);
//     if (!(other instanceof Num)) return super.binary(op, other); // error
//     return binary[op]?.(this.num, other.num) || super.binary(op, other);
//   }
//   override unary(op: string): Val {
//     if (op === '+') return new Num(this.num); // in case of boolean??
//     if (op === '-') return new Num(-this.num);
//     if (op === '~') return new Num(~this.num);
//     if (op === '!') return new Bool(!this.num);
//     return super.unary(op);
//   }
// }

// function assignOp(lvalue: LVal, op: string, rvalue: Val): Val {
//   if (!op.endsWith('=')) throw new Error(`unexpected assign op: ${op}`);
//   const binOp = op.substring(0, op.length - 1);
//   return lvalue.assign('=', lvalue.binary(binOp, rvalue));
// }

// const binary: Record<string, (left: number, right: number) => Val> = {
//   '+': (a, b) => a + b,
//   '-': (a, b) => a - b,
//   '*': (a, b) => a * b,
//   '/': (a, b) => a / b,
//   '%': (a, b) => a % b,
//   '**': (a, b) => a ** b,
//   '<<': (a, b) => a << b,
//   '>>': (a, b) => a >> b,
//   '>>>': (a, b) => a >>> b,
//   '|': (a, b) => a | b,
//   '&': (a, b) => a & b,
//   '^': (a, b) => a ^ b,
//   // never coerce anyway
//   '==': (a, b) => a === b,
//   '===': (a, b) => a === b,
//   '!=': (a, b) => a !== b,
//   '!==': (a, b) => a !== b,
//   '<': (a, b) => a < b,
//   '<=': (a, b) => a <= b,
//   '>': (a, b) => a > b,
//   '>=': (a, b) => a >= b,
// }


// class LValueBuilder {
//   private props: Prop[] = [];
//   private errs = new ErrBuilder();
//   rand = false;
//   constructor(private root: string, private field?: FieldInfo) {}

//   private fieldError(str: string) {
//     this.errs.push(str);
//     this.field = undefined;
//   }

//   private err(err: string) {
//     this.errs.push(err);
//   }

//   getprop(val: Val) {
//     if (val instanceof Rand) {
//       // Dereference with random prop -> will return a random
//       // (though depending on the field, we may know something
//       // about it).
//       this.rand = true;
//       if (this.field instanceof RepeatedFieldInfo) {
//         this.field = this.field.element;
//       } else if (this.field instanceof MapFieldInfo) {
//         this.field = this.field.value;
//       } else {
//         this.field = undefined; // signal unknown somehow??
//       }
//     } else if (val instanceof Prim) {
//       // Known key
//       if (this.field instanceof MessageFieldInfo) {
//         // expect a literal string, no enum
//         if (val.type === 'str') {
//           const child = this.field.type.field(val.str()!);
//           if (child) {
//             this.field = child;
//           } else {
//             this.fieldError(`bad field ${val.str()} on ${this.field.type.fullName}`);
//           }
//         } else {
//           this.fieldError(`message lhs must have string-typed properties, got ${val.type}`);
//         }
//       } else if (this.field instanceof SingularFieldInfo) {
//         this.fieldError(`cannot write properties of primitive field: ${this.field.fullName}`);
//       } else if (this.field instanceof RepeatedFieldInfo) {
//         if (val.type === 'num') {
//           this.field = this.field.element;
//         } else {
//           this.fieldError(`can only write to numeric property of repeated ${this.field.fullName}`);
//         }
//       } else if (this.field instanceof MapFieldInfo) {
//         val = this.errs.check(checkMapKey(this.field, val));
//         this.field = this.field.value;
//       }
//       this.props.push(val as Prim);
//     } else if (val instanceof Err) {
//       this.errs.check(val);
//     } else {
//       this.errs.push(`bad computed property type in lvalue: ${val.type}`);
//     }
//   }

//   build(): LValue|Err {
//     return this.errs.build() || new LValue(this.root, this.props, this.field);
//   }
// }

// // Checks a map key against a given value, checking enums, etc.
// // Returns a 'str', 'num', 'enum', or 'err'.  If it's not an error then
// // it can be dereferenced with `k.num() ?? k.str()`.
// function checkMapKey(f: MapFieldInfo, v: Val): Prim|Err {
//   if (f.key instanceof EnumFieldInfo) {
//     const e = Proto.wrap(v, f.key);
//     if (e instanceof Err) return e;
//     if (!(e instanceof Enum)) {
//       return Err.of(`could not resolve enum key ${f.key.enum.name} from ${v}`);
//     }
//     return e;
//   } else if (f.key instanceof NumberFieldInfo) {
//     if (v.type !== 'num') return Err.of(`expected number map key: ${v}`);
//     return v as Prim;
//   } else if (f.key instanceof StringFieldInfo) {
//     if (v.type !== 'str') return Err.of(`expected string map key: ${v}`);
//     return v as Prim;
//   }
//   return Err.of(`don't know how to handle map key type for ${f.fullName}`);
// }

// // What can be done to a Val?
// //  - at
// //  - call
// //  - operator
// //  - coerce(num, str, bool, enum) - for index or other.
