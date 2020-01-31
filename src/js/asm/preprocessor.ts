// Preprocessor: expands macros and constant defines.
// TODO - links labels???

import {BinOp, Body, BodyChild, Brace, Code, Comma, Define, Directive, Expr,
        Identifier, If, Ifdef, Ifndef, Local,
        Macro, Node, Parenthesis, PrefixOp, Proc, Scope, SourceFile,
        ValueLiteral} from './tree.js';
import {Value, comma, toNumber} from './value.js';
import {assertNever} from '../util.js';

class Ctx {
  readonly macros = new Map<string, Macro>();
  readonly defines = new Map<string, Value>();
  constructor(readonly parent?: Ctx) {} // TODO - inner scopes?

  defined(ident: Identifier): boolean {
    return this.macros.has(ident.text) || this.defines.has(ident.text);
  }

  evaluate(expr: Expr<any>): Value {
    if (expr instanceof ValueLiteral) {
      return expr.value;
    } else if (expr instanceof Identifier) {
      const ident = expr.text;
      if (this.macros.has(ident)) fail(expr, `Cannot evaluate macro ${ident}`);
      return this.defines.get(ident) || INDETERMINATE;
    } else if (expr instanceof Parenthesis || expr instanceof Brace) {
      return this.evaluate(expr.child);
    } else if (expr instanceof Comma) {
      return expr.children.map(e => this.evaluate(e)).reduce(comma);
    } else if (expr instanceof PrefixOp) {
      if (expr.data === '#') return INDETERMINATE;
      const arg = this.evaluate(expr.arg);
      if (arg.type === 'indeterminate') return arg;
      if (expr.data === '!') {
        if (arg.type === 'blank') return {type: 'number', value: 1};
        // NOTE: this is maybe a little wonky?
        if (arg.type === 'string') return {type: 'number', value: +!arg.value};
      }
      const argnum = toNumber(arg);
      switch (expr.data) {
        case '!': return {type: 'number', value: +!argnum.value};
        case '~': return {type: 'number', value: ~argnum.value};
        case '<': return {type: 'number', value: argnum.value & 0xff};
        case '>': return {type: 'number', value: argnum.value >> 8 & 0xff};
          // TODO - error if not a bankaddr?
        case '^': return {type: 'number', value: argnum.value >> 16 & 0xff};
        default: return fail(expr, `Bad prefix op ${expr.data}`);
      }
    } else if (expr instanceof BinOp) {
      const left = this.evaluate(expr.left);
      const right = this.evaluate(expr.right);
      // TODO - consider a boolean allowIndeterminate for operate?
      if (left.type === 'indeterminate') return left;
      if (right.type === 'indeterminate') return right;
      return expr.data.operate(left, right);
    } else {
      return fail(expr, `Unrecognized expression: ${expr.tag}`);
    }
  }
}

const INDETERMINATE = {type: 'indeterminate'} as Value;

function toBoolean(v: Value): boolean|null {
  switch (v.type) {
    case 'list':
      return v.value.length === 1 ? toBoolean(v.value[0]) : null;
    case 'indeterminate':
    case 'blank':
      return null;
    case 'string':
    case 'number':
    case 'bankaddr':
      return Boolean(v.value);
    default:
      assertNever(v);
  }
}

export function preprocess(s: SourceFile): SourceFile {
  // TODO - scope?
  const ctx = new Ctx();
  const children: BodyChild[] = [];
  traverseBody(s.body, ctx, children);
  return new SourceFile([new Body(children)]);
}

function traverseBody(parent: Body, ctx: Ctx, children: BodyChild[]) {
  for (const child of parent.children) {
    if (child instanceof Macro) {
      const name = child.ident.text;
      ctx.defines.delete(name); // or error?
      ctx.macros.set(name, child);
    } else if (child instanceof Define) {
      const name = child.ident.text;
      let result: Value;
      if (!child.expr) {
        result = {type: 'blank'};
      } else {
        result = ctx.evaluate(child.expr);
        if (result.type === 'indeterminate') {
          fail(child, `Cannot evaluate value statically for preprocessing`);
        }
      }
      ctx.defines.set(name, result);
      ctx.macros.delete(name); // or error?
    } else if (child instanceof Ifdef || child instanceof Ifndef) {
      if (ctx.defined(child.cond) === child instanceof Ifdef) {
        traverseBody(child.body, ctx, children);
      } else {
        traverseBody(child.alt, ctx, children);
      }
    } else if (child instanceof If) {
      const result = toBoolean(ctx.evaluate(child.cond));
      if (result == null) fail(child, `Indeterminate value at preprocess time`);
      if (result) {
        traverseBody(child.body, ctx, children);
      } else {
        traverseBody(child.alt, ctx, children);
      }
    } else if (child instanceof Scope || child instanceof Proc) {
      // TODO - make a new macro scope

    //} else if (child instanceof Global) {

    } else if (child instanceof Local) {
      // TODO - take note, but retain for label scoping...?

    } else if (child instanceof Directive) {
      // TODO - expand any macros in any args...
      
    } else if (child instanceof Code) {
      // Check the ident for a macro and expand it for a scope...
      // Either way, expand any macros, but maintain parens that the
      // assembler may need!!!

      // TODO - how do we know if it's valid to substitute here?
    }
   
  }
}

// function traverse(node: AbstractNode<any, any>, ctx: Ctx): boolean {

// }

function fail(node: Node, msg: string): never {
  const {file, line, column, content} = node.sourceInfo || {};
  throw new Error(`${msg}\n  at ${file}:${line}:${column}: '${content}'`);
}
