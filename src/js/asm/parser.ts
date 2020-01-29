// Parser.

import {Buffer} from './buffer.js';
import {AbstractNode, Assert, BinOp, Blank, Body, Brace, Byte,
        Code, Comma, Define, Directive, ErrorDirective, Expr,
        Identifier, If, Ifdef, Ifndef,
        Label, Org, Parenthesis, PrefixOp, Proc, Reloc, Res, SourceFile,
        Word, ValueLiteral} from './tree.js';
import {NumberValue, Operator, operators} from './value.js';

export function parse(code: string, file = 'input.s'): SourceFile {
  const b = new Buffer(code);
  const comma = operators.get(',') || fail(`no comma`);
  return new SourceFile(new Body(parseUntil()));

  // Recursive functions below.
  type Child = Code | Directive<any> | Label;
  function parseUntil(end?: RegExp): Child[] {
    const children: Child[] = [];
    while (true) {
      // Should always be at the beginning of a line, or after labels.
      if (b.eof()) {
        if (!end) break;
        throw new Error(`End of file {$file} reached looking for ${end}`);
      }
      if (end && b.token(end)) break;
      if (b.space() || b.newline()) continue; // skip whitespace
      if (b.token(/^;.*\n?/)) continue; // skip comments
      // Look for labels
      if (b.token(/^([@a-z_][@a-z0-9_]*:\s*|-+\s+|\++\s+)/i)) {
        const label = b.group()!.replace(/\s*:?\s*$/, '');
        children.push(source(new Label(label)));
        continue;
      } else if (b.token(/^(\.[a-z_][a-z0-9_]*)\b/i)) {
        const m = b.match() || fail('Impossible');
        const directiveName = m[1].toLowerCase();
        //const args = new Buffer(m[2], m.line, m.column + m[1].length);
        switch (directiveName) {
          case '.if':
          case '.ifdef':
          case '.ifndef':
            children.push(parseCondition(directiveName));
            break;
          case '.proc':
            children.push(parseProc());
            break;
          case '.define':
            children.push(parseDefine());
            break;
          case '.org':
          case '.assert':
          case '.byte':
          case '.word':
          case '.error':
          case '.res':
            children.push(parseUnaryDirective(directiveName));
            break;
          case '.reloc':
            children.push(parseNullaryDirective(directiveName));
            break;
          default:
            fail(`Unknown directive: ${directiveName}`);
        }
        parseEol();
        // TODO - .local, 
      } else if (b.lookingAt(/^[@a-z_][@a-z0-9_]*\b/i)) {
        const ident = parseIdentifier() || fail(`Impossible`);
        const start = b.match();
        const exprs = [];
        while (true) {
          const expr = parseExpr();
          if (!expr) break;
          exprs.push(expr);
        }
        children.push(source(new Code([ident, ...exprs]), start));
        parseEol();
      } else {
        fail(`Syntax error`);
      }
    }
    return children;
  }

  function parseEol() {
    b.space();
    b.token(/^;.*/);
    if (b.newline()) return;
    if (b.eof()) return;
    fail(`Expected end of line`);
  }

  type UnaryDirective = Org|Assert|Byte|Word|Res|ErrorDirective;
  function parseUnaryDirective(directive: string): UnaryDirective {
    // TODO - is this only *slow* unary directives?
    const start = b.match();
    const arg = parseExpr() || fail(`Expected argument`);
    switch (directive) {
      case '.org':    return source(new Org(arg), start);
      case '.assert': return source(new Assert(arg), start);
      case '.byte':   return source(new Byte(arg), start);
      case '.word':   return source(new Word(arg), start);
      case '.res':    return source(new Res(arg), start);
      case '.error':  return source(new ErrorDirective(arg), start);
    }
    throw new Error(`Impossible: ${directive}`);
  }

  type NullaryDirective = Reloc;
  function parseNullaryDirective(directive: string): NullaryDirective {
    switch (directive) {
      case '.reloc': return source(new Reloc());
    }
    throw new Error(`Impossible: ${directive}`);
  }

  type ConditionDirective = If|Ifdef|Ifndef;
  function parseCondition(directive: string): ConditionDirective {
    const start = b.match();
    if (!start) throw new Error(`Missing start match`);
    // Find the condition
    const cond = parseExpr()
    if (!cond) fail(`Bad ${directive}: missing condition`);
    if (directive === '.ifdef' || directive === '.ifndef') {
      if (!(cond instanceof Identifier)) {
        fail(`${directive}: expected identifier`);
      }
    }
    // look for an .else, .elseif, or .endif
    const body = new Body(parseUntil(/^\.(else|elseif|endif)\b/i));
    const end = b.group()!.toLowerCase();
    let elseBody: Body;
    if (end === '.else') {
      elseBody = new Body(parseUntil(/^\.endif/i));
    } else if (end === '.elseif') {
      elseBody = new Body([parseCondition(end)]);
    } else {
      elseBody = new Body([]);
    }
    let out: If|Ifdef|Ifndef;
    if (directive === '.if' || directive === '.elseif') {
      out = new If(cond, body, elseBody);
    } else if (directive === '.ifdef') {
      out = new Ifdef(cond as Identifier, body, elseBody);
    } else if (directive === '.ifndef') {
      out = new Ifndef(cond as Identifier, body, elseBody);
    } else {
      fail(`Unknown conditional directive: ${directive}`);
    }
    return source(out, start);
  }

  function parseProc(): Proc {
    const start = b.match();
    if (!start) throw new Error(`Missing start match`);
    // Find the condition
    const ident = parseIdentifier() || fail(`Expected identifier`);
    const body = new Body(parseUntil(/^\.endproc\b/i));
    return source(new Proc(ident, body), start);
  }

  function parseDefine(): Define {
    const start = b.match();
    const ident = parseIdentifier() || fail(`Expected identifier`);
    const expr = parseExpr();
    // || new ValueLiteral({type: 'number', value: 1});
    return source(new Define(ident, expr), start);
  }

  function parseIdentifier(): Identifier|undefined {
    // TODO - may need a stack or some way to restore the state?
    b.space();
    if (!b.token(/^[@a-z_][@a-z0-9_]*\b/i)) return undefined;
    return source(new Identifier(b.group()!));
  }

  function parseExpr(singleValue = false): Expr|undefined {
    // (\s+[^;\n]*)

    const exprs: Expr[] = [];
    const binops: Operator[] = [];

    while (true) {
      b.space(); // must be on same line
      if (b.token(/^\(/)) {
        const start = b.match()!;
        exprs.push(source(
            new Parenthesis(parseExpr() || fail('Expected expression')),
            start));
        if (!b.token(/\)/)) fail(`Expected ')'`);
      } else if (b.token(/^\{/)) {
        const start = b.match()!;
        exprs.push(source(
            new Brace(parseExpr() || fail('Expected expression')), start));
        if (!b.token(/\}/)) fail(`Expected '}'`);
      } else if (b.token(/^[<>^#!~]/)) {
        const start = b.match()!;
        exprs.push(source(
            new PrefixOp(
                start[0],
                parseExpr(true) || fail('Expected expression')),
            start));
      } else if (b.token(/^[@a-z_][@a-z0-9_]*\b/i)) {
        const start = b.match()!;
        exprs.push(source(new Identifier(start[0]), start));
      } else if (b.token(/^\*(?![@a-z0-9_])/i)) {
        // Special identifier for "current PC".
        // NOTE: depending on the context, it may not be a full
        // *absolute* value until link time... but we can use it as
        // a *relative* value during assembly...?  Common use case
        // will be `.assert * == $0c:90cf`.
        const start = b.match()!;
        exprs.push(source(new Identifier('*'), start));
      } else if (b.token(/^\$([0-9a-f]{1,2}):([0-9a-f]{4})\b/i)) {
        const start = b.match()!;
        exprs.push(
            source(new ValueLiteral({
              type: 'bankaddress',
              value: parseInt(start[1] + start[2], 16),
            }), start));
      } else if (b.token(/^([1-9][0-9]*|\$[0-9a-f]+|%[01]+|0[0-7]+)\b/i)) {
        // number literal - for non-hex, how do we handle byte vs word?
        //  - just use size?  if <256 then byte else word...
        // ALT: $0c:90cf or $0c_90cf - build it into number parsing?
        // bankaddr value can get absolute offset, hi/lo, etc...
        const start = b.match()!;
        const str = start[0];
        let num: number;
        let size = 0;
        switch (str[0]) {
          case '$':
            num = parseInt(str.substring(1), 16);
            if (str.length === 3) size = 1;
            if (str.length === 5) size = 2;
            break;
          case '%':
            num = parseInt(str.substring(1), 2);
            if (str.length === 9) size = 1;
            if (str.length === 17) size = 2;
            break;
          case '0':
            num = parseInt(str.substring(1), 8);
            break;
          default:
            num = parseInt(str, 10);
            break;
        }
        const value: NumberValue = {
          type: 'number',
          value: num,
        };
        if (size) value.bytes = size;
        exprs.push(source(new ValueLiteral(value), start));
      } else if (b.token(/^['"]/)) {
        const start = b.match()!;
        const end = start[0];
        let str = '';
        while (!b.lookingAt(end)) {
          if (b.token(/^\\u([0-9a-f]{4})/i)) {
            str += String.fromCodePoint(parseInt(b.group(1)!, 16));
          } else if (b.token(/^\\x([0-9a-f]{2})/i)) {
            str += String.fromCharCode(parseInt(b.group(1)!, 16));
          } else if (b.token(/^\\(.)/)) {
            str += b.group(1)!;
          } else {
            b.token(/^./);
            str += b.group(0)!;
          }
        }
        b.token(end);
        exprs.push(
            source(new ValueLiteral({type: 'string', value: str}), start));
      } else if (b.lookingAt(',')) {
        exprs.push(source(new Blank(), b.match()));
      } else {
        if (exprs.length) fail(`Expected expression`);
        return undefined;
      }
      if (singleValue) break;

      // Now look for a binop
      b.space();
      const state = b.saveState();
      let op: Operator|undefined;
      for (const [key, value] of operators) {
        if (!b.token(key) || !b.lookingAt(/^[ \n%$@a-z0-9_'"({,]/i)) {
          b.restoreState(state);
          continue;
        }
        op = value;
        break;
      }
      if (!op) break; // no operator - don't look for another expr

      // Shunt the operator: what's on top of the stack?
      while (binops.length) {
        const top = binops[binops.length - 1];
        if (top.precedence < op.precedence) break;
        if (top.precedence === op.precedence) {
          // check associativity
          if (op.associativity !== top.associativity) {
            fail(`associativity mismatch: ${op.name} ${top.name}`);
          }
          if (!op.associativity) fail(`non-associative operator: ${op.name}`);
          if (op.associativity < 0) break;
        }
        // existing operator first
        shunt();
      }
      binops.push(op);
    }

    // Done with shunting yard - apply remainder of stack.
    while (binops.length) {
      shunt();
    }

    if (exprs.length !== 1) fail(`Shunting yard failed`);

    return exprs[0];

    function shunt() {
      const right = exprs.pop() || fail('missing right expr');
      const left = exprs.pop() || fail('missing left expr');
      const op = binops.pop()!;
      if (op === comma) {
        const children = [
          ...(left instanceof Comma ? left.children : [left]),
          ...(right instanceof Comma ? right.children : [right]),
        ];
        exprs.push(new Comma(children));
      } else {
        exprs.push(new BinOp(op, left, right));
      }
    }
  }

  function fail(msg: string): never {
    const snip = b.remainder.substring(0, 40).replace(/\n/g, '\\n');
    throw new Error(`${msg}\n  at ${file}:${b.line}:${b.column}: '${snip}'`);
  }

  function source<T extends AbstractNode<any>>(node: T, m = b.match()): T {
    if (!m) throw new Error(`Missing match`);
    node.sourceInfo = {file, line: m.line, column: m.column, content: m[0]};
    return node;
  }
}
