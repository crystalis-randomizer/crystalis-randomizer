import {assertNever} from "../util";

// type Origin = 'zp', 'abs', 'str';

// export class Value {
//   constructor(readonly value: number[],
//               readonly origin?: Origin,
//               readonly bank?: number) {}

//   static string(s: string): Value {
//     return new Value(Array.from(s, c => c.charCodeAt(0)), 'str');
//   }

//   static 
// }

// Hint is either an origin or a bank number.
type Hint = 'byte' | 'word' | 'str' | number | undefined;

type F2<T> = (a: T, b: T) => T;

interface OpMeta {
  origin?: Origin;
 
}

export class Value {
  constructor(readonly value: number[], readonly hint?: Hint)) {}

  static str(s: string): Value {
    return new Value(Array.from(s, c => c.charCodeAt(0)), 'str');
  }

  static zp(n: number): Value {
    return new Value([n], 'byte');
  }

  static abs(n: number, b?: number): Value {
    return new Value([n], b != null ? b : 'word');
  }

  static lift1(f: F1<number>, hint: F1<Hint>, name = ''): F1<Value> {
    name = name ? ' ' + name : '';
    return (v: Value): Value => {
      if (v.value.length !== 1) {
        throw new Error(`Unary operator${name} applied to non-scalar ${v}`);
      }
      return new Value([f(v.value[0])], hint(v.hint));
    };
  }

  static lift2(f: F2<number>, hint: F2<Hint>, name = ''): F2<Value> {
    name = name ? ' ' + name : '';
    return (a: Value, b: Value): Value => {
      if (a.value.length !== 1 && b.value.length !== 1) {
        const bad = a.value.length !== 1 ? a : b;
        throw new Error(`Binary operator${name} applied to non-scalar ${bad}`);
      }
      return new Value([f(a.value[0], b.value[0])], hint(a.hint, b.hint));
    };
  }

  toString(): string {
    if (this.origin === 'str') {
      // TODO - add escapes if necessary?
      return `"${String.fromCharCode(this.value)}"`;
    } else if (!this.value.length) {
      return `{}`;
    } else if (this.value.length > 1) {
      return `[${this.value.join(', ')}]`;
    }
    return String(this.value[0]);
  }

}

// interface MacroValue {
//   type: 'macro';
//   value: Macro;
// }

// Wrong formulation?
// ->  ByteValue | WordValue | StringValue | ListValue | BankAddressValue
//     ByteValue AND WordValue can both be addresses...

// Values can be numbers or lists of numbers, or no numbers at all.
// Values can also contain hints about their origin (string, byte/word, etc).

export type Value =
  NumberValue |
  StringValue |
  ListValue |
  BankAddressValue |
  BlankValue |
  IndeterminateValue;

// TODO - any other type of value?

export interface UnaryOperator {
  name: string;
  operate: F1<Value>;
}

export interface BinaryOperator {
  name: string;
  precedence: number;
  associativity: number;
  operate: F2<Value>;
}

namespace Hint {
  export function none(): Hint { return undefined; }
  export function keep(h: Hint, _x?: never): Hint { return h; }
  export function keepIfSame(a: Hint, b: Hint): Hint {
    if (a === b) return a;
    return undefined;
  }
  export function sum(a: Hint, b: Hint): Hint {
    const na = typeof a === 'number';
    const nb = typeof b === 'number';
    if (na && nb) throw new Error(`Cannot operate on two banked numbers`);
    return na ? a : nb ? b : undefined;
  }
  export function diff(a: Hint, b: Hint): Hint {
    const na = typeof a === 'number';
    const nb = typeof b === 'number';
    if (nb) {
      if (a === b) return undefined;
      throw new Error(`Cannot operate on numbers from different banks`);
    }
    return na ? a : undefined;
  }
  export function cmp(a: Hint, b: Hint): Hint {
    const na = typeof a === 'number';
    const nb = typeof b === 'number';
    if (na && nb && na !== nb) {
      throw new Error(`Cannot compare numbers from different banks`);
    }
    return undefined;
  }
}

function operator(name: string, precedence: number, associativity: number,
                  operate: (left: Value, right: Value) => Value) {
  return {name, precedence, associativity, operate};
}

function numeric1(name: string, precedence: number, associativity: number,
                  operate: F1<number>, hint: F1<Hint> = Hint.none): Operator {
  return {name, operate: Value.lift1(op, hint)};
}

function numeric2(name: string, precedence: number, associativity: number,
                  operate: F2<number>, hint: F2<Hint> = Hint.none): Operator {
  return {name, precedence, associativity, operate: Value.lift1(op, hint)};
}

export function comma(left: Value, right: Value): Value {
  const hint = left.hint === 'str' && right.hint === 'str' ? 'str' : undefined;
  return new Value([...left.value, ...right.value], hint);
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

export const binops = new Map<string, BinaryOperator>([
  // Multiplicative operators: note that bitwise and arithmetic cannot associate
  ['*', numeric('*', 5, 3, (a, b) => a * b)],
  ['/', numeric('/', 5, 3, (a, b) => Math.floor(a / b))],
  ['&', numeric('&', 5, 2, (a, b) => a & b)],
  ['|', numeric('&', 5, 1, (a, b) => a | b)],
  ['<<', numeric('<<', 5, 0, (a, b) => a << b)],
  ['>>', numeric('>>', 5, 0, (a, b) => a >> b)],
  // Arithmetic operators: note that bitwise and arithmetic cannot associate
  ['+', numeric('+', 4, 2, (a, b) => a + b, Hint.sum)],
  ['-', numeric('-', 4, 2, (a, b) => a - b, Hint.diff)],
  ['|', numeric('|', 4, 1, (a, b) => a | b)],
  // Comparison operators
  ['<', numeric('<', 3, 0, (a, b) => Number(a < b), Hint.cmp)],
  ['<=', numeric('<=', 3, 0, (a, b) => Number(a <= b), Hint.cmp)],
  ['>', numeric('>', 3, 0, (a, b) => Number(a > b), Hint.cmp)],
  ['>=', numeric('>=', 3, 0, (a, b) => Number(a >= b), Hint.cmp)],
  ['=', numeric('=', 3, 0, (a, b) => Number(a == b), Hint.cmp)],
  ['<>', numeric('<>', 3, 0, (a, b) => Number(a != b), Hint.cmp)],
  // Logical operators: different kinds cannot associate
  ['&&', numeric('&&', 2, 2, (a, b) => a && b)],
  ['||', numeric('||', 2, 1, (a, b) => a || b)],
  // Comma
  [',', operator(',', 1, 1, comma)],
]);
