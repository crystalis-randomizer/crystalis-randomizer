import {SourceInfo, Token} from './token';

export interface Expr {
  // operator (e.g. '+' or '.max') or 'sym', 'num', or 'off' or 'import'
  //  - sym: an offset into the symbols array (or the name in 'sym')
  //  - num: a number literal, or an offset into the symbols array.
  //  - off: address of an offset in this chunk
  //  - import: an import from another object file (uses 'sym').
  // TODO - what about different address types? bank hint/etc?
  //      - does bank hint need to get stored in the object file?
  //        - probably not...?
  op: string;
  args?: Expr[];
  num?: number;
  chunk?: number; // for labels, the index of the chunk (for bank bytes).
  sym?: string;
  size?: number; // (assumed) byte size of result
  source?: SourceInfo;
}

export namespace Expr {

  export interface Resolver {
    resolve(name: string): Expr;
    chunkData(chunk: number): {bank?: number, org?: number, zp?: boolean};
  }

  /** Performs a post-order traversal. */
  export function traverse(expr: Expr,
                           post: (e: Expr, parent: Expr|undefined) => Expr,
                           pre?: (e: Expr, parent: Expr|undefined) => Expr,
                           parent?: Expr): Expr {
    const source = expr.source;
    if (pre) expr = pre(expr, parent);

    // First traverse children.
    if (expr.args?.length) {
      const args = [];
      let edit = false;
      for (const arg of expr.args) {
        const mapped = traverse(arg, post, pre, expr);
        if (mapped !== arg) edit = true;
        args.push(mapped);
      }
      if (edit) expr = expr = {...expr, args};
    }

    // Then call function.
    expr = post(expr, parent);

    // Now simplify the expression if possible.  Pre-evalulate offset
    const [a, b] = expr.args || [];
    if (expr.op === '+' && a?.op === 'off' && b?.op === 'num') {
      expr = {op: 'off', num: a.num! + b.num!, chunk: a.chunk!};
    } else if (expr.op === '+' && b?.op === 'off' && a?.op === 'num') {
      expr = {op: 'off', num: a.num! + b.num!, chunk: b.chunk!};
    } else if (expr.op === '-' && a?.op === 'off' && b?.op === 'off'
               && a.chunk === b.chunk) {
      expr = {op: 'num', num: a.num! - b.num!};
    } else if (expr.op !== 'num') {
      const num = evaluate(expr, true); // shallow
      if (num != null) expr = {op: 'num', num, size: size(num)};
    }
    if (source && !expr.source) expr.source = source;
    return expr;
  }

  // export function resolveImports(expr: Expr,
  //                                map: ReadonlyMap<string, number>,
  //                                symbols: Array<{expr: Expr}>): Expr {
  //   const source = expr.source;
  //   if (expr.op === 'import' && expr.sym != null) {
  //     const sym = map.get(expr.sym);
  //     if (sym == null) {
  //       const at = Token.at(expr);
  //       throw new Error(`Nothing exported ${expr.sym}${at}`);
  //     }
  //     expr = resolve(resolved, resolver); // recurse
  //   } else if (expr.args?.length) {
  //     expr = {...expr,
  //             args: expr.args.map(a => resolveImports(a, map, symbols))};

  //     // NOTE - this is still nonsense... vvvv

  //   } else if (expr.op === '^' && expr.args?.length === 1) {
  //     // evaluate the bank byte here because it requires funny business
  //     const arg = expr.args[0];
  //     if (arg.op === 'off' && arg.chunk != null) {
  //       const chunk = resolver.chunkData(arg.chunk);
  //       if (chunk.bank != null) expr = {op: 'num', num: chunk.bank, size: 1};
  //     }
  //   } else if (expr.op === 'off') {
  //     if (expr.chunk == null || expr.num == null) throw new Error(`Bad offset`);
  //     const chunk = resolver.chunkData(expr.chunk);
  //     if (chunk.org != null) {
  //       expr = {op: 'num', num: expr.num + chunk.org, size: chunk.zp ? 1 : 2};
  //     } else if (chunk.zp) {
  //       expr = {...expr, size: 1};
  //     }
  //   }
  //   if (expr.op === '-' && expr.args?.length === 2 &&
  //              expr.args[0].op === 'off' && expr.args[1].op === 'off' &&
  //              expr.args[0].chunk === expr.args[1].chunk) {
  //     const num = expr.args[0].num! - expr.args[1].num!;
  //     const size = num > 127 || num < -128 ? 2 : 1;
  //     expr = {op: 'num', num, size};
  //   }
  //   if (expr.op !== 'num') {
  //     const num = evaluate(expr);
  //     if (num != null) expr = {op: 'num', num, size: size(num)};
  //   }
  //   if (source && !expr.source) expr.source = source;
  //   return expr;
  // }

  /** Substitutes offsets or symbol table refs for all string symbols. */
  export function resolve(expr: Expr, resolver: Resolver): Expr {
    const source = expr.source;
    if (expr.op === 'sym' && expr.sym != null) {
      const resolved = resolver.resolve(expr.sym);
      if (resolved.op === 'sym' && resolved.sym) {
        throw new Error(`Resolution must not return another named symbol`);
      }
      expr = resolve(resolved, resolver); // recurse
    } else if (expr.args?.length) {
      expr = {...expr, args: expr.args.map(a => resolve(a, resolver))};
    } else if (expr.op === '^' && expr.args?.length === 1) {
      // evaluate the bank byte here because it requires funny business
      const arg = expr.args[0];
      if (arg.op === 'off' && arg.chunk != null) {
        const chunk = resolver.chunkData(arg.chunk);
        if (chunk.bank != null) expr = {op: 'num', num: chunk.bank, size: 1};
      }
    } else if (expr.op === 'off') {
      if (expr.chunk == null || expr.num == null) throw new Error(`Bad offset`);
      const chunk = resolver.chunkData(expr.chunk);
      if (chunk.org != null) {
        expr = {op: 'num', num: expr.num + chunk.org, size: chunk.zp ? 1 : 2};
      } else if (chunk.zp) {
        expr = {...expr, size: 1};
      }
    }
    if (expr.op === '-' && expr.args?.length === 2 &&
               expr.args[0].op === 'off' && expr.args[1].op === 'off' &&
               expr.args[0].chunk === expr.args[1].chunk) {
      const num = expr.args[0].num! - expr.args[1].num!;
      const size = num > 127 || num < -128 ? 2 : 1;
      expr = {op: 'num', num, size};
    }
    if (expr.op !== 'num') {
      const num = evaluate(expr);
      if (num != null) expr = {op: 'num', num, size: size(num)};
    }
    if (source && !expr.source) expr.source = source;
    return expr;
  }

  export function evaluate(expr: Expr, shallow = false): number|undefined {
    const args: number[] = [];
    for (const arg of expr.args || []) {
      if (shallow) {
        if (arg.op !== 'num') return undefined;
        args.push(arg.num!);
      } else {
        const val = evaluate(arg);
        if (val == null) return undefined;
        args.push(val);
      }
    }
    switch (expr.op) { // var-arg functions
      case '.max': return Math.max(...args);
      case '.min': return Math.min(...args);
      case '.move': return undefined;
      default: // fall through to later checks
    }
    if (args.length === 1) {
      switch (expr.op) {
        case '+': return args[0];
        case '-': return -args[0];
        case '~': return ~args[0];
        case '!': return +!args[0];
        case '<': return args[0] & 0xff;
        case '>': return (args[0] >> 8) & 0xff;
        case '^': return undefined;
        default: throw new Error(`Unknown unary operator: ${expr.op}`);
      }
    }
    const [a, b] = args;
    switch (expr.op) {
      case 'num': return expr.num;
      case 'sym': return undefined;
      // TODO - we could actually operate (off + num) => off - just an opt?
      case 'off': return undefined;
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return Math.floor(a / b);
      case '.mod': return a % b;
      case '&': return a & b;
      case '|': return a | b;
      case '^': return a ^ b;
      case '<<': return a << b;
      case '>>': return a >>> b;
      case '<': return +(a < b);
      case '<=': return +(a <= b);
      case '>': return +(a > b);
      case '>=': return +(a >= b);
      case '=': return +(a == b);
      case '<>': return +(a != b);
      case '&&': return a && b;
      case '||': return a || b;
      case '.xor': return !a && b || !b && a || 0;
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
          exprs.push({op: 'num', num, size: size(num)});
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
  const size = xform?.(...expr.args!.map(e => Number(e.size)));
  if (size) expr.size = size;
  return expr;
}

function size(num: number): 1|2 {
  return 0 <= num && num < 256 ? 1 : 2;
}
