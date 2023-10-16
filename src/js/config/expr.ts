// handles expressions

import * as jsep from 'jsep';
import jsepAssignment from '@jsep-plugin/assignment';
import jsepObject from '@jsep-plugin/object';
import { EnumFieldInfo, FieldInfo, MapFieldInfo, MessageFieldInfo, PrimitiveFieldInfo, RepeatedFieldInfo, SingularFieldInfo } from './info.js';

jsep.plugins.register(jsepAssignment, jsepObject);

interface Mutation2 {
  lhs: string; // may be a local variable, config field, etc - qname may be parsed
  op: string; // '=', '+=', '-=', etc (though may be pre-simplified)
  rhs: Val; // value on right
  random: boolean; // whether mutation may not actually happen
}

// assignment operator - special function to parse an lvalue...?
//  - x = [1, 2, 3]
//  - x += 4
//  - y = [x]
//  - y[0] += 5

// parseLvalue('y[0]')
//  => y is local, so look it up: [x] - reference or value???
//     - if it's NEVER a reference then this is easier => just a string!
//     - if it COULD be a reference then we need to look deeper to see if it is??
//        - maybe not?  
//  - x = [[1], 2]
//  - x[0] += 3

// parseLvalue('x[0]')
//  => x is local, look it up

// Could obscure snapshot calculations if we store a reference to a
// Proto array in a local var?
//  - x = placement.force
//  - x["stxy_right_upper_mimic"] = "sword_of_wind"
// seems surprising if we think that would actually change the config
// maybe just say no references...


export interface FieldMutation {
  type: 'field';
  field: string;
  value: Val; //unknown|Pick;
  //random: boolean;
}
interface PresetMutation {
  type: 'preset';
  add: Val[];
  delete: Val[]|'all';
  //random: boolean;
  // TODO - can we model simple-random presets?
  //  i.e. `round(rand()) && presets += 'charge-shots-only'
}
export type Mutation = FieldMutation|PresetMutation;

type E = jsep.Expression;
class Evaluator {
  vars = new Map<string, Val>();
  // warnings: string[] = [];
  // warn(msg: string): Val {
  //   this.warnings.push(msg);
  //   return UNDEF;
  // }

  handlers: Record<string, (expr: E) => Val> = {
    'Literal': expr => {
      if (typeof expr.value === 'number') return new Num(expr.value);
      if (typeof expr.value === 'boolean') return new Bool(expr.value);
      if (typeof expr.value === 'string') return new Str(expr.value);
      return Err.of(`unknown literal type ${expr.value} (${typeof expr.value})`);
    },
    'ArrayExpression': expr => {
      return Arr.from((expr.elements as E[]).map(e => this.evaluate(e)));
    },
    'ObjectExpression'; expr => {
      const props: Record<string, Val> = {};
      for (const prop of (expr.properties as E[])) {
        //if (prop.shorthand) return Err.of(`shorthand properties not allowed`);
        // TODO - we could maybe support this at some point, but in case it
        // computes to Rand, we'd need to return RandObj here, which is awkward
        if (prop.computed) return Err.of(`computed object literal props not allowed`);
        const keyExpr = prop.key as E;
        if (keyExpr.type !== 'Identifier') return Err.of(`Unexpected ${keyExpr.type}`);
        props[keyExpr.name as string] = this.evaluate(prop.value as E);
      }
      return Obj.from(props);
    },
    'Identifier': expr => {
      // need to look up in the store
      // todo - handle "presets"
      
    },
    'MemberExpression': expr => {
      // todo - handle property assignments, config props, etc

    },
    'CallExpression': expr => {
    },
    'UnaryExpression': expr => {

    },
    'BinaryExpression': expr => {
      // todo - handle && and || specially (w.r.t setprops)
    },
    'ConditionalExpression': expr => {
      // todo - handle setprops

    },
    'AssignmentExpression': expr => {

    },
  };

  evaluate(expr: E): Val {
    const handler = this.handlers[expr.type];
    if (!handler) return Err.of(`can't handle expression type ${expr.type}`);
    return handler(expr);
      default:
    }
  }
}

export abstract class Val {
  // todo - maybe return capabilities?  can('op') can('add') can('getprop') ?
  // values are required for binary/unary operator
  // not required for getprop or assign
  isValue(): boolean { return false; }
  apply(args: Val[]): Val {
    return Err.of(`cannot call ${this}`);
  }
  getProp(prop: Val): Val {
    return Err.of(`cannot lookup property ${this}[${prop}]`);
  }
  // setProp(prop: Val, val: Val): Val {
  //   return this.propagate([prop, val]) || Err.of(`cannot set property ${this}[${prop}] = ${val}`);
  // }
  binary(op: string, other: Val): Val {
    return Err.of(`cannot operate ${this} ${op} ${other}`);
  }
  unary(op: string): Val {
    return Err.of(`cannot operate ${op} ${this}`);
  }
  assign(op: string, other: Val): Val {
    return Err.of(`cannot assign ${this} ${op} ${other}`);
  }

  // protected propagate(vals: Val[]): Err|undefined {
  //   let errs = this instanceof Err ? [...this.errors] : [];
  //   for (const val of vals) {
  //     if (val instanceof Err) errs.push(...val.errors);
  //   }
  //   return errs.length ? new Err(errs) : undefined;
  // }
}

export class Err extends Val {
  constructor(readonly errors: string[]) { super(); }
  static of(err: string) { return new Err([err]); }
}

export class Rand extends Val { 
  override toString() { return `RANDOM`; }
  override isValue() { return true; }
  override apply(args: Val[]) { return this.propagate(args) || Err.of(`cannot call primitive`); }
  // override getProp(prop: Val) {
  //   return Err.of(`cannot lookup propery on primitive`);
  // }
  // override setProp(prop: Val, val: Val) {
  //   return this.propagate([prop, val]) || Err.of(`cannot set property on primitive`);
  // }
  override binary() { return RANDOM; }
  override unary() { return RANDOM; }
}
const RANDOM = new Rand();

// TODO - what about random objects?  may need to keep track of path, etc

export class Pick extends Rand {
  constructor(readonly preset?: string) { super(); }
  override toString() { return `pick(${this.preset || ''})`; }
  // NOTE: all methods inherited: operations lose pick-ness
}


export class Mut extends Val {
  constructor(readonly mutations: Mutation[]) { super(); }
  override toString() { return `(assignment)`; }

  static field(name: string, val: Val): Mut {
    return null!;
  }
  static preset(name: string, op: string, val: Val): Mut {
    return null!;
  }
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

abstract class Prim extends LVal {
  override isValue() { return true; }
}

class Str extends Prim {
  constructor(readonly str: string, lvalue?: string) { super(lvalue); }
  override toStringInternal() { return JSON.stringify(this.str); }
  override binary(op: string, other: Val): Val {
    if (op !== '+') return super.binary(op, other); // error
    if (other instanceof Rand) return RANDOM;
    if (other instanceof Arr) return Arr.from([this]).binary('+', other);
    if (other instanceof Str) return new Str(this.str + other.str);
    return super.binary(op, other); // error
  }  
}

class Num extends Prim {
  constructor(readonly num: number, lvalue?: string) { super(lvalue); }
  override toStringInternal() { return String(this.num); }
  override binary(op: string, other: Val): Val {
    if (other instanceof Rand) return RANDOM;
    if (op === '+' && other instanceof Arr) return Arr.from([this]).binary('+', other);
    if (!(other instanceof Num)) return super.binary(op, other); // error
    return binary[op]?.(this.num, other.num) || super.binary(op, other);
  }
  override unary(op: string): Val {
    if (op === '+') return new Num(this.num); // in case of boolean??
    if (op === '-') return new Num(-this.num);
    if (op === '~') return new Num(~this.num);
    if (op === '!') return new Bool(!this.num);
    return super.unary(op);
  }
}

function assignOp(lvalue: Val, op: string, rvalue: Val): Val {
  if (!op.endsWith('=')) throw new Error(`unexpected assign op: ${op}`);
  const binOp = op.substring(0, op.length - 1);
  return lvalue.assign('=', lvalue.binary(binOp, rvalue));
}

const binary: Record<string, (left: number, right: number) => Val> = {
  '+': (a, b) => new Num(a + b),
  '-': (a, b) => new Num(a - b),
  '*': (a, b) => new Num(a * b),
  '/': (a, b) => new Num(a / b),
  '%': (a, b) => new Num(a % b),
  '**': (a, b) => new Num(a ** b),
  '<<': (a, b) => new Num(a << b),
  '>>': (a, b) => new Num(a >> b),
  '>>>': (a, b) => new Num(a >>> b),
  '|': (a, b) => new Num(a | b),
  '&': (a, b) => new Num(a & b),
  '^': (a, b) => new Num(a ^ b),
  // never coerce anyway
  '==': (a, b) => new Bool(a === b),
  '===': (a, b) => new Bool(a === b),
  '!=': (a, b) => new Bool(a !== b),
  '!==': (a, b) => new Bool(a !== b),
  '<': (a, b) => new Bool(a < b),
  '<=': (a, b) => new Bool(a <= b),
  '>': (a, b) => new Bool(a > b),
  '>=': (a, b) => new Bool(a >= b),
}

class Bool extends Num {
  constructor(readonly val: boolean, lvalue?: string) { super(val ? 1 : 0, lvalue); }
  override toStringInternal() { return String(this.val); }
  // no special handling, just treat it like a number...
  static readonly FALSE = new Bool(false);
  static readonly TRUE = new Bool(true);
}

class Nul extends Prim {
  constructor(lvalue?: string) { super(lvalue); }
  override toStringInternal() { return 'null'; }
  override isValue() { return false; }
}

abstract class Arr extends LVal {
  // TODO - abstract this out to share literal array vs computed/settable array???
  static from(args: Val[]) { return new ArrLit(args); }
  override isValue() { return true; }
  override getProp(prop: Val): Val {
    if (prop instanceof Rand) return RANDOM;
    if (!(prop instanceof Num)) {
      return Err.of(`cannot lookup non-numeric property ${this}[${prop}]`);
    }
    const index = Math.round(prop.num);
    if (index < 0 || index >= this.length()) {
      return new Nul(`out of bounds access ${this}[${prop}]`);
    }
    // TODO - not sure how to handle lvalues here?
    return this.index(index);
  }
  abstract length(): number;
  abstract index(i: number): Val;
  // setProp(prop: Val, val: Val): Val {
  //   return Err.of(`cannot set property of array expression ${this}[${prop}]`);
  // }
  // setProp(prop: Val, val: Val): Val {
  //   const p = this.propagate([prop, val]); if (p) return p;
  //   if (prop instanceof Rand) return super.setProp(prop, val); // no random props
  //   if (!(prop instanceof Num)) {
  //     return Err.of(`cannot set non-numeric property ${this}[${prop}]`);
  //   }
  //   const index = Math.round(prop.num);
  //   if (index < 0) return Err.of(`cannot set negative index`);
  //   while (index > this.arr.length) this.arr.push(new Nul(`array hole`));
  //   this.arr[index] = val;
  //   return new Nul(`set property returns null`);
  // }
}

class ArrLit extends Arr {
  constructor(readonly arr: Val[]) { super(); }
  override toStringInternal() { return `[${this.arr.join(', ')}]`; }
  override length() { return this.arr.length; }
  override index(i: number) { return this.arr[i]; }
  override assign(op: string, val: Val): Val {
    if (op === '+=') {
      // do a push
    }

  }
}

class ProtoArray extends Arr {
  constructor(readonly arr: unknown[], readonly field: RepeatedFieldInfo, qname: string) {
    super(qname);
  }
  override toStringInternal() { return this.lvalue!; }
  override length() { return this.arr.length; }
  override index(i: number) { return Proto.from(this.arr[i], this.field.element); }
}
// could write sth like presets += (a ? 'foo' : 'bar')
// would be nice to know that added val is either foo or bar...?
//   a ? presets += 'foo' : presets += 'bar'  -> two "maybe" setprops
//   

/** A (possibly nested) field in the config proto */
class Proto extends Val {
  // TODO - this is only for messages, we need to use lvalue prims for others...?
  constructor(readonly qname: string, readonly field: FieldInfo) { super(); }
  static from(val: unknown, field: FieldInfo): Val {
    if (field instanceof RepeatedFieldInfo) {
      if (val

  }
  override toString() { return this.qname; }
  override isValue() { return !(this.field instanceof MessageFieldInfo); }
  override getProp(prop: Val): Val {
    if (this.field instanceof PrimitiveFieldInfo || this.field instanceof EnumFieldInfo) {
      return Err.of(`cannot lookup prop of primitive ${this.qname}`);
    } else if (prop instanceof Rand) {
      // random element of a map or list is okay, but assignments randomize the whole thing.
      if (this.field instanceof MapFieldInfo) {
        return new ProtoRand(this.qname, this.field.value);
      } else if (this.field instanceof RepeatedFieldInfo) {
        return new ProtoRand(this.qname, this.field.element);
      }
      return Err.of(`cannot lookup random prop of message type`);
    } else if (prop instanceof Num) {
      if (this.field instanceof RepeatedFieldInfo) {

      } else if (this.field instanceof MapFieldInfo) {
        // look for enums?
      }
      return Err.of(`cannot lookup numeric property on ${this}`);
    } else if (prop instanceof Str) {
      if (this.field instanceof MapFieldInfo) {
        // again look for enums?
      } else if (this.field instanceof MessageFieldInfo) {

      }
      return Err.of(`cannot lookup string property on ${this}`);
    }
    return super.getProp(prop);
  }
  // setProp(prop: Val, val: Val): Val {
  //   return Err.of(`cannot set property of array expression ${this}[${prop}]`);
  // }
  override assign(op: string, val: Val): Val {
    if (this.field instanceof MessageFieldInfo) {
      // todo - we could allow += or -= on another message object here?
      return Err.of(`cannot assign to message`);
    }
    if (val instanceof Rand) {
      return new Mut([{type: 'field', field: this.qname, value: op === '=' ? val : RANDOM}])
    }
    if (op !== '=') return assignOp(this, op, val);
    // now op is simple assignment
    return new Mut([{type: 'field', field: this.qname, value: val}]);
  }
}

// Represents an unknown element of a repeated or map proto field
//  - setting this will trigger the field itself to be marked as "random"
class ProtoRand extends Rand {
  // TODO - do we need the field type?
  constructor(readonly qname: string, readonly field: SingularFieldInfo) { super(); }
  override toString() { return `${this.qname}[?]`; }
  override getProp(prop: Val): Val {
    return this; // we could try to track further mutations, but what's the point?
  }
  override assign(op: string, val: Val): Val {
    // value is random no matter what because we don't know which element we're touching
    return new Mut([{type: 'field', field: this.qname, value: RANDOM}]);
  }
}
