import {SourceInfo, Token} from './token';

export interface Expr {
  // operator (e.g. '+' or '.max') or 'sym', 'num', or 'im'
  //  - sym: an offset into the symbols array (or the name in 'sym')
  //  - num: a number literal, or an offset into the symbols array.
  //  - im: an import from another object file (uses 'sym').
  // TODO - what about different address types? bank hint/etc?
  //      - does bank hint need to get stored in the object file?
  //        - probably not...?
  op: string;
  args?: Expr[];
  num?: number;
  meta?: Expr.Meta;
  sym?: string;
  source?: SourceInfo;
}

export namespace Expr {

  /** Extra information for 'num' values. */
  export interface Meta {
    /** Whether this is relative to the start of the chunk. */
    rel?: boolean;
    /** Relative chunk the value is defined in. */
    chunk?: number;
    /** Org value of chunk, if known. */
    org?: number;
    /** Bank value of chunk, if known. */
    bank?: number;
    /** Offset value of chunk, if known. */
    offset?: number;
    /** Size hint for number. */
    size?: number;
  }

  type Rec = (expr: Expr) => Expr; // recurses into children
  type Traverser = (expr: Expr, rec: Rec) => Expr;

  /** Performs a post-order traversal. */
  export function traverse(expr: Expr, f: Traverser, rec?: Rec): Expr {
    const source = expr.source;
    if (!rec) {
      rec = (e: Expr) => {
        if (!e.args) return e;
        return {...e, args: e.args.map(c => traverse(c, f, rec))};
      };
    }
    expr = f(expr, rec);
    if (source && !expr.source) expr.source = source;
    return expr;
  }

  export function traversePost(expr: Expr, f: Rec): Expr {
    return traverse(expr, (expr, rec) => f(rec(expr)));
  }

  export function evaluate(expr: Expr): Expr {
    switch (expr.op) { // var-arg functions
      case '.move':
      case 'im':
      case 'sym':
        return expr;
      case 'num':
        if (expr.meta?.rel && expr.meta.org != null) {
          const {rel, ...meta} = expr.meta;
          // TODO - pull size from meta?
          return {op: 'num', num: expr.num! + meta.org!, meta};
        }
        return expr;
      case '.max': return sameChunk(expr, Math.max);
      case '.min': return sameChunk(expr, Math.min);
      default: // fall through to later checks
    }

    // Special case for unaries
    if (expr.args?.length === 1) {
      switch (expr.op) {
        case '+': return expr.args![0];
        case '-': return unary(expr, x => -x);
        case '~': return unary(expr, x => ~x);
        case '!': return unary(expr, x => +!x);
        case '<': return unary(expr, x => x & 0xff);
        case '>': return unary(expr, x => (x >> 8) & 0xff);
        case '^': return num(expr.args![0].meta?.bank) ?? expr;
        default: throw new Error(`Unknown unary operator: ${expr.op}`);
      }
    }

    switch (expr.op) {
      case '+': return plus(expr);
      case '-': return minus(expr);
      case '*': return binary(expr, (a, b) => a * b);
      case '/': return binary(expr, (a, b) => Math.floor(a / b));
      case '.mod': return binary(expr, (a, b) => a % b);
      case '&': return binary(expr, (a, b) => a & b);
      case '|': return binary(expr, (a, b) => a | b);
      case '^': return binary(expr, (a, b) => a ^ b);
      case '<<': return binary(expr, (a, b) => a << b);
      case '>>': return binary(expr, (a, b) => a >>> b);
      case '<': return binary(expr, (a, b) => +(a < b));
      case '<=': return binary(expr, (a, b) => +(a <= b));
      case '>': return binary(expr, (a, b) => +(a > b));
      case '>=': return binary(expr, (a, b) => +(a >= b));
      case '=': return binary(expr, (a, b) => +(a == b));
      case '<>': return binary(expr, (a, b) => +(a != b));
      case '&&': return binary(expr, (a, b) => a && b);
      case '||': return binary(expr, (a, b) => a || b);
      case '.xor': return binary(expr, (a, b) => !a && b || !b && a || 0);
      default: throw new Error(`Unknown operator: ${expr.op}`);
    }
  }

  export function identifier(expr: Expr): string {
    if (expr.op === 'ident') return expr.sym!;
    throw new Error(`Expected identifier but got op: ${expr.op}`);
  }

  // /** Returns the identifier. */
  // export function identifier(expr: Expr): string {
  //   const terms: string[] = [];
  //   append(expr);
  //   return terms.join('::');
  //   function append(e: Expr) {
  //     if (e.op === 'ident') {
  //       terms.push(e.sym!);
  //     } else if (e.op === '::') {
  //       if (e.args!.length === 1) terms.push('');
  //       e.args!.forEach(append);
  //     } else {
  //       throw new Error(`Expected identifier but got op: ${e.op}`);
  //     }
  //   }
  // }

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
//console.log('PARSE: tokens=', tokens, 'index=', index);
//try { throw new Error(); } catch (e) { console.log(e.stack); }
    const ops: [string, OperatorMeta][] = [];
    const exprs: Expr[] = [];

    function popOp() {
      const [op, [,, arity]] = ops.pop()!;
//console.log('pop', op, arity);
      const args = exprs.splice(exprs.length - arity, arity);
      if (args.length !== arity) throw new Error('shunting parse failed?');
      exprs.push(fixSize({op, args}));
    }

    let val = true;
    let i = index;
    for (; i < tokens.length; i++) {
      const front = tokens[i];
//console.log('exprs:',exprs,'ops:',ops,'tok:',front);
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
            for (const arg of Token.parseArgList(tokens, i + 2, close)) {
              args.push(parseOnly(arg));
            }
            i = close;
            exprs.push(fixSize({op, args}));
            val = false;
          } else if (Token.eq(front, Token.STAR)) {
            exprs.push({op: 'sym', sym: '*'});
            val = false;
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
          val = false;
        } else if (front.token === 'ident') {
          // add symbol
          exprs.push({op: 'sym', sym: front.str});
          // TODO - use scope information to determine size?
          val = false;
        } else if (front.token === 'num') {
          // add number
          const num = front.num;
          exprs.push({op: 'num', num, meta: size(num)});
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
          val = true;
        } else {
          //throw new Error(`Garbage after expression: ${Token.nameAt(front)}`);
//console.log('bad value', i, front);
          break;
        }
      }
    }
//console.log('exprs:',exprs,'ops:',ops);
    // Now pop all the ops
    while (ops.length) popOp();
//console.log('post-pop:', exprs);
    if (exprs.length !== 1) throw new Error(`shunting parse failed?`);
    if (tokens[index].source) exprs[0].source = tokens[index].source;
    return [exprs[0], i];
  }


  // works on absolute numbers, or relative numbers if all in same chunk.
  // may not mix relative + absolute.
  function sameChunk(expr: Expr, f: (...nums: number[]) => number): Expr {
    throw new Error();
  }

  function num(num: number|undefined): Expr|undefined {
    if (num == null) return undefined;
    return {op: 'num', num, meta: size(num)};
  }

  function unary(expr: Expr, f: (x: number) => number): Expr {
    // require absolute
    const arg = expr.args![0];
    if (!isAbs(arg)) return expr;
    const num = f(arg.num!);
    return {op: 'num', num, meta: size(num)};
  }

  function binary(expr: Expr, f: (x: number, y: number) => number): Expr {
    // require both to be absolute
    const [a, b] = expr.args!;
    if (!isAbs(a) || !isAbs(b)) return expr;
    const num = f(a.num!, b.num!);
    return {op: 'num', num, meta: size(num)};
  }

  function plus(expr: Expr): Expr {
    // allow some relative, but only if adding a non-address?
    const [a, b] = expr.args!;
    if (a.op !== 'num' || b.op !== 'num') return expr;
    const out: Expr = {op: 'num', num: a.num! + b.num!};
    if (a.meta || b.meta) {
      if (a.meta?.rel && b.meta?.rel) return expr; // basically nonsense
      if (a.meta?.rel) {
        out.meta = a.meta;
      } else if (b.meta?.rel) {
        out.meta = b.meta;
      }
    }
    if (!out.meta?.rel && out.meta?.size == null) {
      (out.meta || (out.meta = {})).size = size(out.num!).size;
    }
    return out;
  }

  function minus(expr: Expr): Expr {
    // allow rel - rel for delta
    const [a, b] = expr.args!;
    if (a.op !== 'num' || b.op !== 'num') return expr;
    const out: Expr = {op: 'num', num: a.num! - b.num!};
    if (b.meta?.rel) {
      return a.meta?.rel && a.meta.chunk === b.meta.chunk ? out : expr;
    }
    if (a.meta?.rel) out.meta = a.meta;
    if (!out.meta?.rel && out.meta?.size == null) {
      (out.meta || (out.meta = {})).size = size(out.num!).size;
    }
    return out;
  }

  function isAbs(expr: Expr): boolean {
    return expr.op === 'num' && !expr.meta?.rel;
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
  // ['::', [8, 1, BINARY]],
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
  // ['::', [9, -1, UNARY]], // global scope
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
// NOTE: dangerous reads are 2002, 2004, 2007 (plus mirrors), 4015
// Then the assembler needs to understand the flow of these two ops...
// or just disassemble it on the fly?
const FUNCTIONS = new Set<string>([
  '.byteat',
  '.wordat',
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
  const size = xform?.(...expr.args!.map(e => Number(e.meta?.size)));
  if (size) (expr.meta || (expr.meta = {})).size = size;
  return expr;
}

function size(num: number): Expr.Meta {
  return {size: 0 <= num && num < 256 ? 1 : 2};
}

// function fail(msg: string): never {
//   throw new Error(msg);
// }
