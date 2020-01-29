// Preprocessor: expands macros and constant defines.
// TODO - links labels???

import {AbstractNode, Define, Expr, Identifier, Ifdef, Macro,
        SourceFile} from './tree.js';
import {Value} from './value.js';

interface Ctx {
  macros: Map<string, Macro>;
  defines: Map<string, Value>;
}

export function preprocess(s: SourceFile): SourceFile {
  // TODO - scope?
  const ctx = {macros: new Map(), defines: new Map()};
  const out = s.clone();
  traverse(out, ctx);
  return out;
}

function traverse(node: AbstractNode<any, any>, ctx: Ctx): boolean {
  if (node instanceof Macro) {
    const name = node.ident.text;
    ctx.defines.delete(name); // or error?
    ctx.macros.set(name, node);
    return false;
  } else if (node instanceof Define) {
    const name = node.ident.text;
    ctx.macros.delete(name); // or error?
    ctx.defines.set(name, node.expr ? evaluate(node.expr, ctx) :
                    {type: 'number', value: 1});
    return false;
  } else if (node instanceof Ifdef) {
    // TODO - other conditions???
  } else if (node instanceof Identifier) {
    // TODO - how do we know if it's valid to substitute here?
  }
  return true;
}

function evaluate(expr: Expr<any>, ctx: Ctx): Value {
  throw new Error();
}
