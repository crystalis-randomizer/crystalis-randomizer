
// Code that was part of the local js65 version, but didn't deserve to get
// upstreamed into the js65 on github. So we just keep it here to extend
// the upstream js65 code. These functions are copied from the old js65.

import type { Expr } from 'js65';

interface Message {
  level: string;
  message: string;
  source?: {file: string, line: number};
}

/** Formats the error messages from an assemble() or link() result. */
export function formatErrors(messages: readonly Message[]): string {
  return messages.filter(m => m.level === 'error').map(m => {
    const at = m.source ? `${m.source.file}:${m.source.line}: ` : '';
    return at + m.message;
  }).join('\n');
}

/** Lists the symbols used in an expression (duplicates included). */
export function symbols(expr: Expr, out: string[] = []): string[] {
  // NOTE: we don't dedupe with a set because it matters if a symbol
  // shows up twice in the same expression (i.e. it won't be invertible).
  for (const arg of expr.args || []) symbols(arg, out);
  if (expr.op === 'sym' && expr.sym) out.push(expr.sym);
  return out;
}

/** Drops source info from an expression to keep refs.json small. */
export function strip(expr: Expr): Expr {
  const out = {...expr};
  if (out.args) out.args = out.args.map(strip);
  delete out.source;
  return out;
}

/** Attempts to solve for the given symbol, given the final result. */
export function invert(expr: Expr, sym: string, result: number): number|undefined {
  if (expr.op === 'sym') return expr.sym === sym ? result : undefined;
  const args = expr.args || [];
  if (args.length === 1) {
    const [arg] = args;
    switch (expr.op) {
      case '+': return invert(arg, sym, result);
      case '-': return invert(arg, sym, -result);
      case '~': return invert(arg, sym, ~result);
      // These are slightly lossy
      case '!': return result === +!!result ? invert(arg, sym, result) : undefined;
      case '<': return result === (result & 0xff) ? invert(arg, sym, result) : undefined;
      case '>': return result === (result & 0xff) ? invert(arg, sym, result << 8) : undefined;
      default: return undefined;
    }
  }
  if (args.length !== 2) return undefined;
  // Only (mostly) invertible binary operations remain, but some care about
  // the order, so we need to figure out which arg is constant.
  const [left, right] = args.map(constant);
  if ((left == null) === (right == null)) return undefined; // exactly 1 null
  const known = (left ?? right)!;
  const unknown = left == null ? args[0] : args[1];
  switch (expr.op) {
    case '+': return invert(unknown, sym, result - known);
    case '-': return invert(unknown, sym, left == null ? result + known : known - result);
    case '*': return result % known === 0 ? invert(unknown, sym, result / known) : undefined;
    case '/':
      // result = x / known => x = result * known
      if (left == null) return invert(unknown, sym, result * known);
      // result = known / x => x = known / result, must go evenly
      if (known % result !== 0) return undefined;
      return invert(unknown, sym, known / result);
    case '^': return invert(unknown, sym, result ^ known);
    case '<<':
      if (right == null) return undefined;
      if (((result >>> right) << right) !== result) return undefined;
      return invert(unknown, sym, result >>> right);
    case '>>':
      if (right == null) return undefined;
      if (((known >>> right) << right) !== known) return undefined;
      return invert(unknown, sym, result << right);
    default: return undefined;
  }
}

/** Returns the value of an absolute numeric literal, if it is one. */
function constant(expr: Expr): number|undefined {
  if (expr.op !== 'num' || expr.meta?.rel) return undefined;
  return expr.num;
}
