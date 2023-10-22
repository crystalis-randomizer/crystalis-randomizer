// handles expressions

import { parse, Expression } from './jsep.js';
import { BoolFieldInfo, EnumFieldInfo, EnumInfo, FieldInfo, MapFieldInfo, MessageFieldInfo, NumberFieldInfo, PrimitiveFieldInfo, RepeatedFieldInfo, SingularFieldInfo, StringFieldInfo, TypeInfo } from './info.js';
import { assertType } from './assert.js';

// path to variable - may be a local, a config field, presets, etc
export type Path = [string, ...(Prim|Rand)[]];

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

type Prop = Prim|Rand;
export class LValue {
  constructor(readonly root: string, readonly props: readonly Prop[], readonly field?: FieldInfo) {}
  isPreset(): boolean {
    return this.root === 'presets';
  }
  isProto(): boolean {
    return this.field != undefined;
  }
  isSimple(): boolean {
    return this.props.length === 1 && this.field == undefined;
  }
}

export abstract class Val {
  //                      [            Prim              ] [   Obj   ] [Func] [Rand] [Mut] [Err]
  abstract readonly type: 'num'|'str'|'bool'|'enum'|'null'|'obj'|'arr'|'func'|'rand'|'mut'|'err';
  static wrap(arg: unknown): Val {
    if (typeof arg === 'number') return new Num(arg);
    if (typeof arg === 'string') return new Str(arg);
    if (typeof arg === 'boolean') return arg ? Bool.TRUE : Bool.FALSE;
    if (arg == undefined) return NUL;
    if (Array.isArray(arg)) return new ArrWrap(arg);
    if (typeof arg == 'object') return new ObjWrap(arg);
    return Err.of(`cannot wrap ${arg} (${typeof arg})`);
  }
}

//type Val = Prim|Obj|Rand|Func|Mutation|Err;

export abstract class Prim extends Val {
  abstract readonly type: 'num'|'str'|'bool'|'enum'|'null';
  static wrap(val: unknown): Val {
    if (val == undefined) return NUL;
    if (typeof val === 'number') return new Num(val);
    if (typeof val === 'string') return new Str(val);
    if (typeof val === 'boolean') return val ? Bool.TRUE : Bool.FALSE;
    return Err.of(`bad type for Prim.wrap: ${typeof val}`);
  }
  enum(): EnumInfo|undefined { return undefined; }
  str(): string|undefined { return undefined; }
  num(): number|undefined { return undefined; }
}

abstract class Obj extends Val {
  abstract readonly type: 'obj'|'arr';
  abstract readonly key: 'num'|'str'|EnumInfo;
  abstract at(arg: Val): Val;
  static wrap(arg: unknown): Val {
    if (Array.isArray(arg)) {
      return new ArrWrap(arg);
    } else if (arg && typeof arg === 'object') {
      return new ObjWrap(arg);
    }
    return Err.of(`cannot wrap object ${arg}`);
  }
}

class Func extends Val {
  readonly type = 'func';
  // TODO - how to implement pick?
  //   - placement.thunder_sword_warps = pick()
  constructor(readonly name: string, readonly apply: (args: Val[]) => Val) { super(); }
  toString() { return this.name; }
}

export class Rand extends Val {
  readonly type = 'rand';
}

export class Mut extends Val {
  readonly type = 'mut';
  constructor(readonly mutations: Mutation[]) { super(); }
}

export interface Mutation {
  readonly lhs: LValue;
  readonly op: string;
  readonly rhs: Val;
  // whether mutation may not actually happen
  readonly random?: boolean;
  // which preset this mutation came from
  readonly preset?: string;
}

export class Err extends Val {
  readonly type = 'err';
  constructor(readonly errors: string[]) { super(); }
  static of(err: string) { return new Err([err]); }
}

const NUL = new class Nul extends Prim {
  readonly type = 'null';
  override toString() { return 'null'; }
}();
class Num extends Prim {
  readonly type = 'num';
  constructor(readonly val: number) { super(); }
  override num() { return this.val; }
  override toString() { return String(this.val); }
}
class Bool extends Prim {
  readonly type = 'bool';
  constructor(readonly val: boolean) { super(); }
  override num() { return +this.val; }
  override toString() { return String(this.val); }
  readonly static FALSE = new Bool(false);
  readonly static TRUE = new Bool(true);
}
class Str extends Prim {
  readonly type = 'str';
  constructor(readonly val: string) { super(); }
  override str() { return this.val; }
  override toString() { return JSON.stringify(this.val); }
}
class Enum extends Prim {
  readonly type = 'enum';
  constructor(readonly value: number, readonly info: EnumInfo) { super(); }
  override enum() { return this.info; }
  override num() { return this.value; }
  override str() { return this.info.enum.valuesById[this.value]; }
  override toString() { return this.str(); }
}

class ArrWrap extends Obj {
  readonly type = 'arr';
  readonly key = 'num';
  constructor(readonly arr: unknown[]) { super(); }
  override at(arg: Val): Val {
    if (arg instanceof Err) return arg;
    if (arg instanceof Rand) return RANDOM;
    if (arg instanceof Prim && arg.type === 'num') return Val.wrap(this.arr[arg.num()!]);
    return Err.of(`cannot index array with ${arg}`);
  }
  override toString() { return `[${this.arr.join(', ')}]`; }
}
class ObjWrap extends Obj {
  readonly type = 'obj';
  readonly key = 'str';
  constructor(readonly obj: object) { super(); }
  override at(arg: Val): Val {
    if (arg instanceof Err) return arg;
    if (arg instanceof Rand) return RANDOM;
    if (arg instanceof Prim && arg.type === 'str') return Val.wrap((this.obj as any)[arg.str()!]);
    return Err.of(``);
  }
  override toString() { return `{${Object.entries(this.obj).map(([k, v]) => `${k}: ${v}`).join(', ')}}`; }
}

// class Enum {
//   constructor(readonly value: number, readonly info: EnumInfo) {}
// }
export class Pick extends Rand {
  constructor(readonly preset?: string) { super(); }
}
const RANDOM = new Rand();
const PICK = new Pick();

// function isNumber(val: Val, allowRandom = false): boolean {
//   return typeof val === 'number' || typeof val === 'boolean' ||
//       val instanceof Enum || (allowRandom && val instanceof Rand);
// }
// function toNumber(val: Val): number {
//   if (typeof val === 'boolean') return +val;
//   if (typeof val === 'number') return val;
//   if (val instanceof Enum) return val.value;
//   throw new Error(`toNumber on non-number: ${val}`);
// }
// function isString(val: Val, allowRandom = false): boolean {
//   return typeof val === 'string' || val instanceof Enum || (allowRandom && val instanceof Rand);
// }
// function toString(val: Val): string {
//   if (typeof val === 'string') return val;
//   if (val instanceof Enum) return val.info.enum.valuesById[val.value];
//   throw new Error(`toString on non-string: ${val}`);
// }

// a message, repeated field, or map field - abstracts over name canonicalization

// NOTE: work around https://github.com/microsoft/TypeScript/issues/4628
const Obj_nowrap: {new(): Obj}&Omit<typeof Obj, 'wrap'> = Obj as any;

abstract class Proto extends Obj_nowrap {
  abstract data: unknown;
  static wrap(data: unknown, info: FieldInfo): Val {
    if (info instanceof EnumFieldInfo) {
      if (typeof data === 'number') {
        if (data in info.enum.enum.valuesById) return new Enum(data as number, info.enum);
      } else if (typeof data === 'string') {
        const num = info.enum.enum.values[data];
        if (num != undefined) return new Enum(num, info.enum);
      } else if (data instanceof Enum) {
        if (data.info === info.enum) return data;
        return Err.of(`incompatible enum ${data.info.name} for field ${info.name}`);
      }
      return Err.of(`invalid element ${data} in enum ${info.enum.name}`);
    } else if (info instanceof PrimitiveFieldInfo) {
      const t = typeof data;
      if (t === 'number' || t === 'string' || t === 'boolean' || data == undefined) {
        return Prim.wrap(data);
      }
      return Err.of(`bad primitive field value: ${data}`);
    } else if (info instanceof MessageFieldInfo) {
      return new ProtoMessage(data || info.type.type.create(), info);
    } else if (info instanceof RepeatedFieldInfo) {
      if (data != undefined && !Array.isArray(data)) {
        return Err.of(`unexpected non-array for repeated field ${info}: ${data}`);
      }
      return new ProtoRepeated(data || [], info);
    } else if (info instanceof MapFieldInfo) {
      if (data != undefined && typeof data !== 'object') {
        return Err.of(`unexpected non-object for map field ${info}: ${data}`);
      }
      return new ProtoMap(data || {}, info);
    }
    return Err.of(`unknown field info type: ${info}`);
  }
  abstract at(key: Val): Val;
}

class ProtoMessage extends Proto {
  readonly type = 'obj';
  readonly key = 'str';
  constructor(readonly data: object, private readonly info: MessageFieldInfo) { super(); }
  override at(key: Val): Val {
    if (key instanceof Rand) return RANDOM;
    if (typeof key === 'string') {
      const field = this.info.type.field(key);
      if (field == undefined) return Err.of(`unknown field ${key} for type ${this.info.fullName}`);
      const result = (this.data as any)[field.name];
      return Proto.wrap(result, field);
    }
    return Err.of(`bad type for message field: ${key} (${typeof key})`);
  }
}

class ProtoRepeated extends Proto {
  readonly type = 'arr';
  readonly key = 'num';
  constructor(readonly data: unknown[], private readonly info: RepeatedFieldInfo) { super(); }
  override at(key: Val): Val {
    // NOTE: errors should already be checked
    if (key instanceof Rand) return RANDOM;
    if (key instanceof Prim && key.str() === 'length') return new Num(this.data.length);
    if (typeof key === 'number') {
      const result = this.data[key];
      if (result == undefined) return NUL; // NOTE: don't wrap undefined.
      return Proto.wrap(result, this.info.element);
    }
    return Err.of(`bad type for repeated field index: ${key} (${typeof key})`);
  }
}

class ProtoMap extends Proto {
  readonly type = 'obj';
  constructor(readonly data: object, private readonly info: MapFieldInfo) {
    super();
  }
  get key(): 'num'|'str'|EnumInfo {
    return this.info.key instanceof NumberFieldInfo ? 'num' :
        this.info.key instanceof EnumFieldInfo ? this.info.key.enum : 'str';
  }
  override at(key: Val): Val {
    if (key instanceof Rand) return RANDOM;
    const k = checkMapKey(this.info, key);
    if (k instanceof Err) return k;
    const result = (this.data as any)[k.num() ?? k.str()!];
    if (result == undefined) return NUL; // NOTE: don't wrap undefined.
    return Proto.wrap(result, this.info.value);
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


class ErrBuilder {
  private errors: string[] = [];
  ok(): boolean { return !this.errors.length; }
  build(): Err|undefined {
    return this.errors.length ? new Err(this.errors) : undefined;
  }
  push(err: string): ErrBuilder {
    this.errors.push(err);
    return this;
  }
  fatal(err: string): Err {
    return this.push(err).build()!;
  }
  isError(v: Val): boolean {
    if (v instanceof Err) {
      this.errors.push(...v.errors);
      return true;
    } else if (v instanceof Mut) {
      this.errors.push(`cannot compose assignment result`);
      return true;
    }
    return false;
  }
  check(v: Val): Val {
    this.isError(v);
    return v;
  }
}

class Evaluator {
  constructor(readonly root: object, readonly rootInfo: TypeInfo) {}
  vars = new Map<string, Val>();
  // warnings: string[] = [];
  // warn(msg: string): Val {
  //   this.warnings.push(msg);
  //   return UNDEF;
  // }


  evaluate(expr: Expression): Val {
    switch (expr.type) {
      case 'Literal': {
        switch (typeof expr.value) {
          case 'number':
          case 'boolean':
          case 'string':
            return Prim.wrap(expr.value);
        }
        return Err.of(`unknown literal type ${expr.value} (${typeof expr.value})`);
      }
      case 'ArrayExpression': {
        const err = new ErrBuilder();
        const els: Val[] = [];
        for (const e of expr.elements) {
          els.push(err.check(this.evaluate(e)));
        }
        return err.build() || new ArrWrap(els);
      }
      case 'ObjectExpression': {
        const props: Record<string, Val> = {};
        const err = new ErrBuilder();
        let random = false;
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
            const result = this.evaluate(keyExpr);
            if (err.isError(result)) {
              continue;
            } else if (result instanceof Rand) {
              random = true;
              continue;
            } else if (result instanceof Prim) {
              if (result.type === 'bool') {
                key = +result.num()!;
              } else if (result.type === 'num' || result.type === 'enum') {
                key = result.num()!;
              } else if (result.type === 'str') {
                key = result.str()!;
              } else {
                err.push(`bad computed property: ${result}`);
                continue;
              }
            } else {
              err.push(`bad computed property: ${result}`);
              continue;
            }
          } else if (prop.key.type !== 'Identifier') {
            err.push(`bad non-computed key type: ${prop.key.type}`);
            continue;
          } else {
            key = prop.key.name as string;
          }
          props[key] = err.check(this.evaluate(prop.value));
        }
        if (!err.ok()) return err.build()!
        if (random) return RANDOM;
        return new ObjWrap(props);
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
          key = Prim.wrap(prop.name);
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
          return err.push(`may only call a definite function, but got ${callee}`).build()!;
        }
        return err.build() || callee.apply(args);
      }
      case 'UnaryExpression': 
        return this.unary(expr.operator, this.evaluate(expr.argument));

      case 'BinaryExpression': {
        const left = this.evaluate(expr.left);

        if (expr.operator === '&&' || expr.operator === '||') {
          if (left instanceof Err) return left;
          // Look at lvalue in case we need to short-circuit
          let cond = true;
          let rand = false;
          if (left instanceof Rand) {
            rand = true;
          } else if (left instanceof Prim) {
            cond = Boolean(left.num() || left.str());
          }

          // Special handling for short-circuiting: only evaluate RHS if appropriate, and
          // also pay attention to forwarding Mut objects (i.e. don't use `err.check` here).
          if (expr.operator === '&&') {
            // forward mut appropriately (no err.check)
            if (rand) return makeRandom(this.evaluate(expr.right));
            return cond ? this.evaluate(expr.right) : left;
          } else if (expr.operator === '||') {
            if (rand) return makeRandom(this.evaluate(expr.right));
            return !cond ? this.evaluate(expr.right) : left;
          }
        }
        const right = this.evaluate(expr.right);
        return this.binary(left, expr.operator, right);
      }

      case 'ConditionalExpression': {
        let test = this.evaluate(expr.test);
        if (test instanceof Err) return test;
        let cond = true;
        let rand = false;
        if (test instanceof Rand) {
          rand = true;
        } else if (test instanceof Prim) {
          cond = Boolean(test.num() || test.str());
        }
        const results: Val[] = [];
        if (rand || cond) results.push(this.evaluate(expr.consequent));
        if (rand || !cond) results.push(this.evaluate(expr.alternate));
        // check for errors and results
        

        break;
      }
      case 'AssignmentExpression': {
        // parse the LHS as an lvalue
        const err = new ErrBuilder();
        const lhs = this.parseLValue(expr.left).build();
        if (lhs instanceof Err) err.check(lhs);
        let rhs = err.check(this.evaluate(expr.right));
        if (!err.ok || lhs instanceof Err) return err.build()!;
        // TODO - if operator is arithmetic assignment, then try evaluating it
        let op = expr.operator;
        if (op !== '=') {
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

  binary(left: Val, op: string, right: Val): Val {
    const err = new ErrBuilder();
    err.check(left);
    err.check(right);
    if (!err.ok) return err.build()!;

    //if (
    
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
        Proto.wrap((this.root as any)[field.name], field);
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
