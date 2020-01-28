import { assertNever } from "../util";

export interface NumberValue {
  type: 'number';
  value: number;
  bytes?: number;
}
export interface StringValue {
  type: 'string';
  value: string;
}
export interface BankAddressValue {
  type: 'bankaddress';
  value: number;
}
export interface ListValue {
  type: 'list';
  value: Value[];
}
// interface MacroValue {
//   type: 'macro';
//   value: Macro;
// }

// Wrong formulation?
// ->  ByteValue | WordValue | StringValue | ListValue | BankAddressValue
//     ByteValue AND WordValue can both be addresses...

export type Value = NumberValue | StringValue | ListValue | BankAddressValue;
// TODO - any other type of value?


export interface Operator {
  name: string;
  precedence: number;
  associativity: number;
  operate: (left: Value, right: Value) => Value;  
}

function operator(name: string, precedence: number, associativity: number,
                  operate: (left: Value, right: Value) => Value) {
  return {name, precedence, associativity, operate};
}

function numeric(name: string, precedence: number, associativity: number,
                 operate: (left: number, right: number) => number): Operator {
  return operator(name, precedence, associativity, op);
  function op(left: Value, right: Value): Value {
    left = toNumber(left);
    right = toNumber(right);

    let lv = left.value as number;
    let rv = right.value as number;
    let value = operate(lv, rv);

    const lt = left.type[0];
    const rt = right.type[0];
    const tt = lt + rt;
    const lb = lt === 'b' ? lv >>> 16 : 0;
    const rb = rt === 'b' ? rv >>> 16 : 0;
    if (lt === 'b') lv &= 0xffff;
    if (rt === 'b') rv &= 0xffff;

    let resultType: 'number'|'bankaddress'|undefined = 'number';
    if (tt !== 'nn') {
      resultType = resultTypeMap.get(lt + name + rt);
      if (resultType == null) {
        throw new Error(`Cannot operate ${left.type} ${name} ${right.type}`);
      }
    }
    if (tt === 'bb' && lb !== rb) {
      throw new Error(`Cannot operate on different-bank addresses`);
    }

    if (resultType === 'bankaddress') value |= ((lb | rb) << 16);
    const result = {type: resultType, value};
    if (resultType === 'number' &&
        left.type === 'number' && right.type === 'number' &&
        left.bytes && left.bytes === right.bytes &&
        result.value < (1 << (left.bytes << 3))) {
      (result as NumberValue).bytes = left.bytes;
    }
    return result;
  }
}

function toNumber(v: Value): Value {
  if (v.type === 'number' || v.type === 'bankaddress') return v;
  if (v.type === 'string') {
    if (v.value.length !== 1) throw new Error(`Expected single number`);
    return {type: 'number', value: v.value.charCodeAt(0)};
  } else if (v.type === 'list') {
    if (v.value.length !== 1) throw new Error(`Expected single number`);
    return toNumber(v.value[0]);
  }
  assertNever(v);
}

// Returns a FLATTENED list.
function toList(v: Value): Value[] {
  if (v.type === 'number' || v.type === 'bankaddress') return [v];
  if (v.type === 'string') {
    return Array.from(v.value, c => ({type: 'number', value: c.charCodeAt(0)}));
  }
  if (v.type === 'list') {
    const out: Value[] = [];
    for (let x of v.value) {
      out.push(...toList(x));
    }
    return out;
  }
  assertNever(v);
}

const resultTypeMap = new Map<string, 'number'|'bankaddress'>([
  ['b-b', 'number'],
  ['b-n', 'bankaddress'],
  ['b-n', 'bankaddress'],
  ['b+n', 'bankaddress'],
  ['n+b', 'bankaddress'],
  ['b<b', 'number'],
  ['b<=b', 'number'],
  ['b>b', 'number'],
  ['b>=b', 'number'],
  ['b=b', 'number'],
  ['b<>b', 'number'],
]);

function comma(left: Value, right: Value): Value {
  return {
    type: 'list',
    value: [...toList(left), ...toList(right)],
  };
}

// Mostly consistent with https://www.cc65.org/doc/ca65-5.html
// Slightly stricter by requiring parens for some associativity.
// 5  (*  /)  (&)  (^)  (<<)  (>>)
// 4  (+  -)  (|)
// 3  <  >  <=  >=  =  <>
// 2  (||)  (&&)
// 1  ,

export const operators = new Map<string, Operator>([
  // Multiplicative operators: note that bitwise and arithmetic cannot associate
  ['*', numeric('*', 5, 3, (a, b) => a * b)],
  ['/', numeric('/', 5, 3, (a, b) => Math.floor(a / b))],
  ['&', numeric('&', 5, 2, (a, b) => a & b)],
  ['|', numeric('&', 5, 1, (a, b) => a | b)],
  ['<<', numeric('<<', 5, 0, (a, b) => a << b)],
  ['>>', numeric('>>', 5, 0, (a, b) => a >> b)],
  // Arithmetic operators: note that bitwise and arithmetic cannot associate
  ['+', numeric('+', 4, 2, (a, b) => a + b)],
  ['-', numeric('-', 4, 2, (a, b) => a - b)],
  ['|', numeric('|', 4, 1, (a, b) => a | b)],
  // Comparison operators
  ['<', numeric('<', 3, 0, (a, b) => Number(a < b))],
  ['<=', numeric('<=', 3, 0, (a, b) => Number(a <= b))],
  ['>', numeric('>', 3, 0, (a, b) => Number(a > b))],
  ['>=', numeric('>=', 3, 0, (a, b) => Number(a >= b))],
  ['=', numeric('=', 3, 0, (a, b) => Number(a == b))],
  ['<>', numeric('<>', 3, 0, (a, b) => Number(a != b))],
  // Logical operators: different kinds cannot associate
  ['&&', numeric('&&', 2, 2, (a, b) => a && b)],
  ['||', numeric('||', 2, 1, (a, b) => a || b)],
  // Comma
  [',', operator(',', 1, 1, comma)],
]);
