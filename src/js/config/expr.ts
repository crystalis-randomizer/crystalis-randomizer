// handles expressions

import { parse, Expression } from './jsep.js';
import { BoolFieldInfo, EnumFieldInfo, EnumInfo, FieldInfo, MapFieldInfo, MessageFieldInfo, NumberFieldInfo, PrimitiveFieldInfo, RepeatedFieldInfo, SingularFieldInfo, StringFieldInfo, TypeInfo } from './info.js';
import { assertType } from './assert.js';
import { Arr, BasicVal, Bool, CallContext, Err, ErrBuilder, Func, Mut, Num, Obj, RANDOM, Rand, Str, Val, isErr, wrapValue } from './val.js';
import { Random } from '../random.js';


interface IConfig {
  presets: string[];
  exprs: string[];
  //other fields...
  nested: Record<string, IConfig>;
}

export function evaluate(config: IConfig, info: TypeInfo, random: Random): IConfig {
  // how simple can we make this?
  // will need to be called recursively, obvi (for presets)

}

export function analyze(config: IConfig, info: TypeInfo): Map<string, Mutation> {
  
}


class Evaluator {
  constructor(readonly root: object|null, readonly rootInfo: TypeInfo) {}
  vars = new Map<string, Val>();
  // warnings: string[] = [];
  // warn(msg: string): Val {
  //   this.warnings.push(msg);
  //   return UNDEF;
  // }

  evaluate(expr: Expression, ctx: CallContext = {}): Val {
    switch (expr.type) {
      case 'Literal': {
        switch (typeof expr.value) {
          case 'number': return new Num(expr.value);
          case 'boolean': return Bool.of(expr.value);
          case 'string': return new Str(expr.value);
        }
        return Err.of(`unknown literal type ${expr.value} (${typeof expr.value})`);
      }

      case 'ArrayExpression': {
        const err = new ErrBuilder();
        const els: Val[] = [];
        for (const e of expr.elements) {
          els.push(err.check(this.evaluate(e)));
        }
        return err.build() || new Arr(els);
      }

      case 'ObjectExpression': {
        const props: Record<string, Val> = {};
        const err = new ErrBuilder();
        for (const prop of expr.properties) {
          //if (prop.shorthand) return Err.of(`shorthand properties not allowed`);
          // TODO - we could maybe support this at some point, but in case it
          // computes to Rand, we'd need to return RandObj here, which is awkward
          const keyExpr = prop.key;
          let key: string|number;
          // if (prop.computed) return 
          //   && keyExpr.type !== 'Identifier') {
          // return new Err(`unexpected ${keyExpr.type}`);
          // }
          if (prop.computed) {
            const result = this.evaluate(keyExpr).toKey();
            if (err.isError(result)) continue;
            key = result;
          } else if (prop.key.type !== 'Identifier') {
            err.push(`bad non-computed key type: ${prop.key.type}`);
            continue;
          } else {
            key = prop.key.name as string;
          }
          props[key] = err.check(this.evaluate(prop.value));
        }
        if (!err.ok()) return err.build()!
        return new Obj(props);
      }

      case 'Identifier': {
        // TODO - smart nulls? return new Nul(`no such variable ${name}`)?
        const name = expr.name as string;
        if (name in funcs) return funcs[name]; // TODO - check mutations to prevent shadowing??
        return this.lookupVar(name);
      }

      case 'MemberExpression': {
        let key: Val;
        const err = new ErrBuilder();
        const prop = expr.property;
        const obj = err.check(this.evaluate(expr.object));
        if (expr.computed) {
          key = err.check(this.evaluate(prop));
        } else if (prop.type !== 'Identifier') {
          return Err.of(`unexpected property node type: ${prop.type}`);
        } else {
          key = wrapValue(prop.name);
        }
        if (!(obj instanceof Obj)) {
          return err.push(`cannot lookup property ${key} on ${obj}`).build()!;
        }
        return err.build() || obj.at(key);
      }

      case 'CallExpression': {
        const err = new ErrBuilder();
        const callee = err.check(this.evaluate(expr.callee));
        const args = expr.arguments.map(e => err.check(this.evaluate(e)));
        if (!(callee instanceof Func)) {
          return err.fatal(`may only call a definite function, but got ${callee}`);
        }
        return err.build() || callee.call(args as BasicVal[], ctx);
      }

      case 'UnaryExpression': {
        const err = new ErrBuilder();
        const arg = err.check(this.evaluate(expr.argument));
        if (!err.ok()) return err.build()!;
        switch (expr.operator) {
          case '!': return arg.not();
          case '+': return arg.pos();
          case '-': return arg.neg();
          case '~': return arg.cpl();
        }
        return err.fatal(`unknown unary operator: ${expr.operator}`);
      }
      case 'BinaryExpression':
        return this.binary(expr.operator, this.evaluate(expr.left), expr.right, ctx);

      case 'ConditionalExpression': {
        let test = this.evaluate(expr.test);
        if (isErr(test)) return test;
        if (test instanceof Mut) return Err.of(`cannot use assignment as ternary test`);
        if (test instanceof Rand) {
          // Random: evaluate both and concatenate results.  The only thing that matters
          const err = new ErrBuilder();
          const r1 = this.evaluate(expr.consequent, ctx);
          const r2 = this.evaluate(expr.alternate, ctx);
          if (isErr(r1)) err.check(r1);
          if (isErr(r2)) err.check(r2);
          if (!err.ok()) return err.build()!;
          const mut: Mutation[] = [];
          if (r1 instanceof Mut) mut.push(...r1.withRandom().mutations);
          if (r2 instanceof Mut) mut.push(...r2.withRandom().mutations);
          return mut.length ? new Mut(mut) : RANDOM;
        }
        const result = test.toBool();
        if (isErr(result)) return result;
        return result ? this.evaluate(expr.consequent, ctx) : this.evaluate(expr.alternate, ctx);
      }

      case 'AssignmentExpression': {
        // parse the LHS as an lvalue
        const err = new ErrBuilder();
        const lhs = this.parseLValue(expr.left).build();
        let op = expr.operator;
        if (lhs instanceof Err) err.check(lhs);
        let rhs = err.check(this.evaluate(expr.right, op === '=' ? {lvalue: lhs} : {}));
        if (!err.ok || lhs instanceof Err) return err.build()!;
        // TODO - if operator is arithmetic assignment, then try evaluating it
        //   - how to know when???  - if it's a field and we have no concrete root

        if (op !== '=') {
          // Depending on the situation, we either want to compute the result right here,
          // or else we want to store the actual assignment operator.
          // 1. we're analyzing the expression for UI purposes (this.root == null)
          //    - only compute if it's not assigned to a field, 
          
          && (!lhs.field || this.root)) {
          if (!op.endsWith('=')) {
            err.push(`unknown assignment operator: ${op}`);
          } else {
            // We've got an operator like +=
            //  - see if we can compute it right here?
            const v = this.lookupLValue(lhs);
            if (v instanceof Rand) {
              
            } else if (v instanceof Err) {

            } else if (v instanceof Prim) {
              
            }
          } else if (!lhs.isRandom()) {
            const value = err.check(this.lookupLValue(lhs));
            
          }
        }      

        return new Mut([{lhs, op: expr.operator, rhs}]);
      }
    }
    return Err.of(`can't handle expression type ${expr.type}`);
  }

  isAnalysis(): boolean {
    return this.root == null;
  }

  unary(op: string, arg: Val): Val {
    if (arg instanceof Err) return arg;
    const err = new ErrBuilder();
    if (arg instanceof Func) return err.fatal(`cannot operate on ${arg}`);
    if (arg instanceof Rand) return RANDOM;
    if (op === '!') {
      // return true/false
      if (arg instanceof Prim) {
        return (arg.type === 'str' ? arg.str() : arg.num()) ? Bool.FALSE : Bool.TRUE;
      } else if (arg instanceof Obj) {
        return Bool.FALSE;
      } else {
        return err.fatal(`unknown type for unary !: ${arg}`);
      }
    } else if (!(arg instanceof Prim) || arg.type === 'null') {
      return err.fatal(`unknown type for unary ${op}: ${arg}`);          
    }
    let num = arg.num();
    if (num == undefined) num = Number(arg.str());
    switch (op) {
      case '-': return new Num(-num);
      case '~': return new Num(~num);
      case '+': return new Num(+num);
    }
    return err.fatal(`unknown unary operator: ${op}`);
  }

  binary(op: string, left: Val, rightExpr: Expression, ctx: CallContext): Val {
    if (op === '&&' || op === '||') {
      // short-circuit
      if (isErr(left)) return left;
      if (left instanceof Mut) return Err.of(`cannot assign on left side of ${expr.operator}`);
      // propagate random condition into mutations
      if (left instanceof Rand) {
        const result = this.evaluate(rightExpr, ctx);
        if (isErr(result)) return result;
        return result instanceof Mut ? result.withRandom() : RANDOM;
      }
      // evaluate RHS only if necessary, return directly
      const v = left.toBool();
      if (isErr(v)) return v; // Mut/Rand OK.
      return ((op === '&&') === v) ? this.evaluate(rightExpr, ctx) : left;
    }
    const err = new ErrBuilder();
    err.check(left);
    const right = err.check(this.evaluate(rightExpr));
    if (!err.ok()) return err.build()!;
    switch (op) {
      case '+': return left.add(right);
      case '-': return left.sub(right);
      case '*': return left.mul(right);
      case '/': return left.div(right);
      case '%': return left.mod(right);
      case '**': return left.pow(right);
      case '<<': return left.asl(right);
      case '>>': return left.asr(right);
      case '>>>': return left.lsr(right);
      case '&': return left.and(right);
      case '|': return left.or(right);
      case '^': return left.xor(right);
      case '==': case '===': return Bool.of(left.eq(right));
      case '!=': case '!==': return Bool.of(!left.eq(right));
      case '<': return cmp(left.cmp(right), x => x < 0);
      case '<=': return cmp(left.cmp(right), x => x <= 0);
      case '>': return cmp(left.cmp(right), x => x > 0);
      case '>=': return cmp(left.cmp(right), x => x >= 0);
    }
    return err.fatal(`unknown binary operator: ${op}`);
  }

  /** Given an `LValue` qname, looks up the root var then calls `at` to get the actual value. */
  lookupLValue(lvalue: LValue): Val|undefined {
    let v = this.lookupVar(lvalue.root);
    for (const p of lvalue.props) {
      if (v instanceof Obj) {
        v = v.at(p);
      } else {
        return undefined;
      }
    }
    return v;
  }

  /** Looks up a single variable from `this.vars` or `this.root` and `this.rootInfo`. */
  lookupVar(name: string): Val {
    return this.vars.get(name) || (() => {
      const field = this.rootInfo.field(name);
      const result = field == undefined ? NUL :
        this.root ? Proto.wrap((this.root as any)[field.name], field) : RANDOM;
      this.vars.set(name, result);
      return result;
    })();
  }

  parseLValue(expr: Expression): LValueBuilder {
    if (expr.type === 'Identifier') {
      const f = this.rootInfo.field(expr.name);
      if (f) return new LValueBuilder(f.name, f);
      return new LValueBuilder(expr.name);
    } else if (expr.type === 'MemberExpression') {
      const builder = this.parseLValue(expr.object);
      if (expr.computed) {
        builder.getprop(this.evaluate(expr.property));
      } else if (expr.property.type === 'Identifier') {
        builder.getprop(Prim.wrap(expr.property.name));
      } else {
        builder.err(`non-computed prop must be Identifier, got ${expr.property.type}`);
      }
      return builder;
    }
    const builder = new LValueBuilder('');
    builder.err(`bad expression type in lvalue: ${expr.type}`);
    return builder;
  }
}

function cmp(result: number|Err, f: (arg: number) => boolean): Val {
  if (isErr(result)) return result;
  return Bool.of(f(result));
}

/** Transform `Mut`s to mark the `random` prop. */
function makeRandom(val: Val): Val {
  if (!(val instanceof Mut)) return val;
  return new Mut(val.mutations.map(m => ({...m, random: true})));
}


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

// TODO - this needs to be injected into the evaluator, since
//        we'll want a version that takes a Random instance.
const funcs: Record<string, Func> = {
  'round': numberFunc('round', (x) => Math.round(x)),
};

function numberFunc(name: string, f: (arg: number) => number): Func {
  return new Func(name, (args: Val[]) => {
    if (args.length !== 1) return Err.of(`incorrect number of arguments to ${name}`);
    const arg = args[0];
    if (arg instanceof Err) return arg; // TODO - handle this outside??
    if (arg instanceof Rand) return RANDOM;
    if (arg instanceof Prim && arg.type === 'num') return new Num(f(arg.num()!));
    return Err.of(`cannot call ${name} on type ${arg.type}`);
  });
}

abstract class LVal extends Val {
  constructor(readonly lvalue?: string) { super(); }
  abstract toStringInternal(): string;
  override toString() { return this.lvalue || this.toStringInternal(); }
  override assign(op: string, value: Val): Val {
    if (!this.lvalue) return super.assign(op, value);
    if (op !== '=') return assignOp(this, op, value);
    return Mut.field(this.lvalue, value);
  }
}

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

function assignOp(lvalue: LVal, op: string, rvalue: Val): Val {
  if (!op.endsWith('=')) throw new Error(`unexpected assign op: ${op}`);
  const binOp = op.substring(0, op.length - 1);
  return lvalue.assign('=', lvalue.binary(binOp, rvalue));
}

const binary: Record<string, (left: number, right: number) => Val> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '%': (a, b) => a % b,
  '**': (a, b) => a ** b,
  '<<': (a, b) => a << b,
  '>>': (a, b) => a >> b,
  '>>>': (a, b) => a >>> b,
  '|': (a, b) => a | b,
  '&': (a, b) => a & b,
  '^': (a, b) => a ^ b,
  // never coerce anyway
  '==': (a, b) => a === b,
  '===': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '!==': (a, b) => a !== b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
}


class LValueBuilder {
  private props: Prop[] = [];
  private errs = new ErrBuilder();
  rand = false;
  constructor(private root: string, private field?: FieldInfo) {}

  private fieldError(str: string) {
    this.errs.push(str);
    this.field = undefined;
  }

  private err(err: string) {
    this.errs.push(err);
  }

  getprop(val: Val) {
    if (val instanceof Rand) {
      // Dereference with random prop -> will return a random
      // (though depending on the field, we may know something
      // about it).
      this.rand = true;
      if (this.field instanceof RepeatedFieldInfo) {
        this.field = this.field.element;
      } else if (this.field instanceof MapFieldInfo) {
        this.field = this.field.value;
      } else {
        this.field = undefined; // signal unknown somehow??
      }
    } else if (val instanceof Prim) {
      // Known key
      if (this.field instanceof MessageFieldInfo) {
        // expect a literal string, no enum
        if (val.type === 'str') {
          const child = this.field.type.field(val.str()!);
          if (child) {
            this.field = child;
          } else {
            this.fieldError(`bad field ${val.str()} on ${this.field.type.fullName}`);
          }
        } else {
          this.fieldError(`message lhs must have string-typed properties, got ${val.type}`);
        }
      } else if (this.field instanceof SingularFieldInfo) {
        this.fieldError(`cannot write properties of primitive field: ${this.field.fullName}`);
      } else if (this.field instanceof RepeatedFieldInfo) {
        if (val.type === 'num') {
          this.field = this.field.element;
        } else {
          this.fieldError(`can only write to numeric property of repeated ${this.field.fullName}`);
        }
      } else if (this.field instanceof MapFieldInfo) {
        val = this.errs.check(checkMapKey(this.field, val));
        this.field = this.field.value;
      }
      this.props.push(val as Prim);
    } else if (val instanceof Err) {
      this.errs.check(val);
    } else {
      this.errs.push(`bad computed property type in lvalue: ${val.type}`);
    }
  }

  build(): LValue|Err {
    return this.errs.build() || new LValue(this.root, this.props, this.field);
  }
}

// Checks a map key against a given value, checking enums, etc.
// Returns a 'str', 'num', 'enum', or 'err'.  If it's not an error then
// it can be dereferenced with `k.num() ?? k.str()`.
function checkMapKey(f: MapFieldInfo, v: Val): Prim|Err {
  if (f.key instanceof EnumFieldInfo) {
    const e = Proto.wrap(v, f.key);
    if (e instanceof Err) return e;
    if (!(e instanceof Enum)) {
      return Err.of(`could not resolve enum key ${f.key.enum.name} from ${v}`);
    }
    return e;
  } else if (f.key instanceof NumberFieldInfo) {
    if (v.type !== 'num') return Err.of(`expected number map key: ${v}`);
    return v as Prim;
  } else if (f.key instanceof StringFieldInfo) {
    if (v.type !== 'str') return Err.of(`expected string map key: ${v}`);
    return v as Prim;
  }
  return Err.of(`don't know how to handle map key type for ${f.fullName}`);
}

// What can be done to a Val?
//  - at
//  - call
//  - operator
//  - coerce(num, str, bool, enum) - for index or other.
