import {Token} from './token.js';

export interface Expr {
  // operator (e.g. '+' or '.max') or 'sym', 'num', or 'off' (?)
  //  - sym: an offset into the symbols array (or the name in 'sym'
  //  - num: a number literal
  //  - off: address of an offset in this chunk
  // TODO - what about different address types? bank hint/etc?
  //      - does bank hint need to get stored in the object file?
  //        - probably not...?
  op: string;
  args?: Expr[];
  num?: number;
  sym?: string;
  size?: number; // (assumed) byte size of result
}

export namespace Expr {

  /** Returns the identifier. */
  export function identifier(expr: Expr) : string {
    const terms: string[] = [];
    append(expr);
    return terms.join('::');
    function append(e: Expr) {
      if (e.op === 'ident') {
        terms.push(e.sym!);
      } else if (e.op === '::') {
        if (e.args!.length === 1) terms.push('');
        e.args!.forEach(append);
      } else {
        throw new Error(`Expected identifier but got op: ${e.op}`);
      }
    }
  }

  /** Parse a single expression, must occupy the rest of the line. */
  export function parseOnly(tokens: Token[], index = 0): Expr {
    const [expr, i] = parse(tokens, index);
    if (i < tokens.length) {
      throw new Error(`Garbage after expression: ${Token.nameAt(tokens[i])}`);
    } else if (!expr) {
      throw new Error(`No expression?`);
    }
    return expr;
  }

  // Returns [undefined, -1] if a bad parse.
  // Give up on normal parsing, just use a shunting yard again...
  //  - but handle parens recursively.
  export function parse(tokens: Token[], index = 0): [Expr|undefined, number] {
    const ops: [string, OperatorMeta][] = [];
    const exprs: Expr[] = [];

    function popOp() {
      const [op, [,, arity]] = ops.pop()!;
      const args = exprs.splice(exprs.length - arity, arity);
      if (args.length !== arity) throw new Error('shunting parse failed?');
      exprs.push(fixSize({op, args}));
    }

    let end = tokens.length;
    let val = true;
    for (let i = index; i < tokens.length; i++) {
      const front = tokens[i];
      if (val) {
        // looking for a value: literal, balanced parens, or prefix op.
        if (front.token === 'cs' || front.token === 'op') {
          const mapped = NAME_MAP.get(front.str);
          const prefix = PREFIXOPS.get(mapped ?? front.str);
          if (prefix) {
            ops.push([front.str, prefix]);
          } else if (front.token === 'cs') {
            const op = front.str;
            if (!FUNCTIONS.has(op)) {
              throw new Error(`No such function: ${Token.nameAt(front)}`);
            }
            const next = tokens[i + 1];
            if (next?.token !== 'lp') {
              throw new Error(`Bad funcall: ${Token.nameAt(next ?? front)}`);
            }
            const close = Token.findBalanced(tokens, i + 1);
            if (close < 0) {
              throw new Error(`Never closed: ${Token.nameAt(next)}`);
            }
            const args: Expr[] = [];
            for (const arg of Token.parseArgList(tokens.slice(i + 2, close))) {
              args.push(parseOnly(arg));
            }
            i = close;
            exprs.push(fixSize({op, args}));
          } else {
            throw new Error(`Unknown prefix operator: ${Token.nameAt(front)}`);
          }
        } else if (front.token === 'lp') {
          // find balanced parens
          const close = Token.findBalanced(tokens, i);
          if (close < 0) {
            throw new Error(`No close paren: ${Token.nameAt(front)}`);
          } // return [undefined, -1];
          const e = parseOnly(tokens.slice(i + 1, close));
          exprs.push(e);
          i = close;
        } else if (front.token === 'ident') {
          // add symbol
          exprs.push({op: 'sym', sym: front.str});
          // TODO - use scope information to determine size?
          val = false;
        } else if (front.token === 'num') {
          // add number
          const num = front.num;
          exprs.push({op: 'num', num, size: 0 <= num && num < 256 ? 1 : 2});
          val = false;
        } else {
          // bad token??
          throw new Error(`Bad expression token: ${Token.nameAt(front)}`);
          // return [undefined, -1];
        }
      } else {
        // looking for an infix operator or EOL.
        if (Token.eq(front, Token.COMMA) /* || Token.eq(front, Token.RP) */) {
          // TODO - is rparen okay? usually should have extracted the balanced
          // paren out first?
          end = i;
          break;
        }
        if (front.token === 'cs' || front.token === 'op') {
          const mapped = NAME_MAP.get(front.str);
          const op = BINOPS.get(mapped ?? front.str);
          if (!op) break; // we're at the end...?  or if no op.
          // see if anything to the left is faster.
          while (ops.length) {
            const top = ops[ops.length - 1];
            const cmp = compareOp(top[1], op);
            if (cmp < 0) break;
            if (cmp === 0) {
              throw new Error(
                  `Mixing ${top[0]} and ${front.str} needs explicit parens.${
                   Token.at(front)}`);
            }
            popOp();
          }
          ops.push([front.str, op]);
        } else {
          throw new Error(`Garbage after expression: ${Token.nameAt(front)}`);
        }
      }
    }
    // Now pop all the ops
    while (ops.length) popOp();
    if (exprs.length !== 1) throw new Error(`shunting parse failed?`);
    return [exprs[0], end];
  }
}



// Returns >0 if top is faster, <0 if top is slower, and 0 if can't mix
function compareOp(top: OperatorMeta, next: OperatorMeta): number {
  if (top[0] > next[0]) return 1;
  if (top[0] < next[0]) return -1;
  if (top[1] !== next[1]) return 0;
  return top[1];
}


// precedence, associativity, arity
type OperatorMeta = readonly [number, number, number];
const BINARY = 2;
const UNARY = 1;
export const BINOPS = new Map<string, OperatorMeta>([
  // Scoping operator
  ['::', [8, 1, BINARY]],
  // Memory hints
  //[':', [6, 0]],
  // Multiplicative operators: note that bitwise and arithmetic cannot associate
  ['*', [5, 4, BINARY]],
  ['/', [5, 4, BINARY]],
  ['.mod', [5, 3, BINARY]],
  ['&', [5, 2, BINARY]],
  ['^', [5, 1, BINARY]],
  ['<<', [5, 0, BINARY]],
  ['>>', [5, 0, BINARY]],
  // Arithmetic operators: note that bitwise and arithmetic cannot associate
  ['+', [4, 2, BINARY]],
  ['-', [4, 2, BINARY]],
  ['|', [4, 1, BINARY]],
  // Comparison operators
  ['<', [3, 0, BINARY]],
  ['<=', [3, 0, BINARY]],
  ['>', [3, 0, BINARY]],
  ['>=', [3, 0, BINARY]],
  ['=', [3, 0, BINARY]],
  ['<>', [3, 0, BINARY]],
  // Logical operators: different kinds cannot associate
  ['&&', [2, 3, BINARY]],
  ['.xor', [2, 2, BINARY]],
  ['||', [2, 1, BINARY]],
  // Comma
  //[',', [1, 1]],
]);

const PREFIXOPS = new Map<string, OperatorMeta>([
  ['::', [9, -1, UNARY]], // global scope
  ['+', [9, -1, UNARY]],
  ['-', [9, -1, UNARY]],
  ['~', [9, -1, UNARY]],
  ['<', [9, -1, UNARY]],
  ['>', [9, -1, UNARY]],
  ['^', [9, -1, UNARY]],
  ['!', [2, -1, UNARY]],
]);

// TODO - skip1 and skip2 macros
// .macro skip1
//   .byte $2c
// .endmacro
// .macro skip2
//   .byte $4c
//   .assert .byteat(* + 2) < $20 .or \
//           .byteat(* + 2) >= $60 .or \
//           .byteat(* + 1) & $07 .in [2,3,4]
// .endmacro
// Then the assembler needs to understand the flow of these two ops...
// or just disassemble it on the fly?
const FUNCTIONS = new Set<string>([
  '.byteat',
  '.max', '.min',
]);

const NAME_MAP = new Map<string, string>([
  ['.bitand', '&'],
  ['.bitxor', '^'],
  ['.bitor', '|'],
  ['.shl', '<<'],
  ['.shr', '>>'],
  ['.and', '&&'],
  ['.or', '||'],
  ['.bitnot', '~'],
  ['.lobyte', '<'],
  ['.hibyte', '>'],
  ['.bankbyte', '^'], // ??? how to implement on number?
  ['.not', '!'],
]);

const SIZE_TRANSFORMS = new Map<string, (...args: number[]) => number>([
  // unary: bank byte; binary: bitxor
  ['^', (...args) => args.length === 1 ? 1 : Math.max(...args)],
  ['<', () => 1], // unary (lobyte) and binary (cmp) both single-byte
  ['>', () => 1], // unary (hibyte) and binary (cmp) both single-byte
  ['!', () => 1], // not always 0 or 1
  ['<=', () => 1], // cmp
  ['>=', () => 1], // cmp
  ['<>', () => 1], // cmp
  ['=', () => 1], // cmp
  // bitwise and logical operator return max
  ['&', Math.max],
  ['&&', Math.max],
  ['|', Math.max],
  ['||', Math.max],
  ['.xor', Math.max],
  ['.max', Math.max],
  ['.min', Math.max], // could use min, but may not be safe w/ negatives
]);
  
function fixSize(expr: Expr): Expr {
  const xform = SIZE_TRANSFORMS.get(expr.op);
  const size = xform?.(...expr.args!.map(e => Number(e.size)));
  if (size) expr.size = size;
  return expr;
}
