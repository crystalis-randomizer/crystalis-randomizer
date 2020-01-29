require('source-map-support').install();
const {describe, it} = require('mocha');
const {expect} = require('chai');
const {parse} = require('../dist/js/asm/parser.js');
const tree = require('../dist/js/asm/tree.js');
const util = require('util');
//const value = require('../dist/js/asm/value.js');

const MATCH = Symbol();

describe('parse', function() {
  it('should parse a source file', function() {
    const f = parse(`
      ; comment is ignored
      label:
        lda #$1f ; also ignored
      .org $1234
      .ifdef XX
        .define YY
        .define YYZ %10101100
        pla
        sta ($11),y
      .elseif YY
        pha
      .endif`);

    // console.log(util.inspect(f, {showHidden: false, depth: null}))

    match(f, sourceFile(
      body(
        label('label'),
        code('lda', prefix('#', value({type: 'number', value: 31, bytes: 1}))),
        unary(tree.Org, value({type: 'number', value: 0x1234, bytes: 2})),
        cond(
          tree.Ifdef,
          ident('XX'),
          body(
            define('YY'),
            define('YYZ', value({type: 'number', value: 0b10101100, bytes: 1})),
            code('pla'),
            code(
              'sta',
              comma(
                paren(value({type: 'number', value: 0x11, bytes: 1})),
                ident('y')))),
          body(
            cond(
              tree.If,
              ident('YY'),
              body(
                code('pha'))))))));
  });

  it('should parse an .assert', function() {
    match(parseStmt('.assert * = $0c:8234'),
          unary(
            tree.Assert,
            binop(
              ident('*'), '=',
              value({type: 'bankaddress', value: 0x0c_8234}))));
  });

  it('should parse a .define', function() {
    match(parseStmt('.define x'), define('x'));
    match(parseStmt('.define x 1'), define('x', num(1)));
  });

  it('should parse a .byte', function() {
    match(parseStmt('.byte $12, $34, "foo", $56,x  ; comment'),
          unary(
            tree.Byte,
            comma(
              value({type: 'number', value: 0x12, bytes: 1}),
              value({type: 'number', value: 0x34, bytes: 1}),
              value({type: 'string', value: 'foo'}),
              value({type: 'number', value: 0x56, bytes: 1}),
              ident('x'))));
  });

  it('should parse a .word', function() {
    match(parseStmt('.word ($1234),(Addr),Addr+1  ; comment'),
          unary(
            tree.Word,
            comma(
              paren(value({type: 'number', value: 0x1234, bytes: 2})),
              paren(ident('Addr')),
              binop(ident('Addr'), '+', num(1)))));
  });

  it('should parse a blank', function() {
    match(parseStmt('foo a,,b'),
          code('foo', comma(ident('a'), blank(), ident('b'))));
  });

  it('should parse nullary directives', function() {
    match(parseStmt('.reloc'), {constructor: tree.Reloc});
  });

  it('should parse args separated by spaces', function() {
    match(parseStmt('foo {a,b} c'),
          code('foo', brace(comma(ident('a'), ident('b'))), ident('c')));
  });

  it('should understand operator precedence', function() {
    match(parseStmt('lda 1+2*3'),
          code('lda', binop(num(1), '+', binop(num(2), '*', num(3)))));
    match(parseStmt('lda 1*2+3'),
          code('lda', binop(binop(num(1), '*', num(2)), '+', num(3))));
  });

  it('should parse a .proc', function() {
    const asm = `
      .proc Name
        asl
        .byte $2c
        rts
      .endproc`;
    match(parseStmt(asm), {
      constructor: tree.Proc,
      children: [
        ident('Name'),
        body(code('asl'),
             unary(tree.Byte, num(0x2c)),
             code('rts')),
      ],
    });
  });

  it('should parse a .macro definition', function() {
    const asm = `
      .macro inc16 addr
             clc
             inc   addr
             bcc   +
             inc   addr+1
          +:
      .endmacro`;
  });

  it('should fail to parse a label at the end of a line', function() {
    expect(() => {
      parse('  asl foo:');
    }).to.throw(Error, /Expected end of line.*at input.s:0:9: ':'/s);
  });

  it('should fail to parse a bad operator', function() {
    expect(() => {
      parse('  adc $01 + + $02');
    }).to.throw(Error, /Expected expression.*at input.s:0:12: '\+ \$02'/s);
  });

  it('should fail to parse a unary with no arg', function() {
    expect(() => {
      parse(`  adc #
  lsr`);
    }).to.throw(Error, /Expected expression.*at input.s:0:7: '\\n  lsr'/s);
  });

  it('should fail on a bad directive', function() {
    expect(() => {
      const f = parse('.foo');
      console.log(util.inspect(f, {showHidden: false, depth: null}))

    }).to.throw(Error, /Unknown directive: \.foo.*at input.s:0:4/s);
  });
});

function parseStmt(str) {
  const f = parse(str);
  expect(f.children).to.have.length(1);
  expect(f.children[0].children).to.have.length(1);
  return f.children[0].children[0];
}
function num(num) {
  return value({type: 'number', value: num});
}
function sourceFile(child) {
  return {constructor: tree.SourceFile, children: [child]};
}
function body(...children) {
  return {constructor: tree.Body, children};
}
function label(label) {
  return {constructor: tree.Label, label};
}
function code(text, ...args) {
  return {
    constructor: tree.Code,
    children: [ident(text), ...args],
  };
}
function value(value) {
  return {constructor: tree.ValueLiteral, value};
}
function unary(constructor, child) {
  return {constructor, children: [child]};
}
function ident(text) {
  return {constructor: tree.Identifier, text};
}
function cond(constructor, cond, thenBody, elseBody = body()) {
  const out = {constructor, children: [cond, thenBody]};
  if (elseBody) out.children.push(elseBody);
  return out;
}
function define(text, val) {
  const out = {constructor: tree.Define, children: [ident(text)]};
  if (val) out.children.push(val);
  return out;
}
function comma(...children) {
  return {constructor: tree.Comma, children};
}
function paren(child) {
  return unary(tree.Parenthesis, child);
}
function brace(child) {
  return unary(tree.Brace, child);
}
function binop(left, op, right) {
  return {
    constructor: tree.BinOp,
    op: {name: op},
    children: [left, right],
  };
}
function prefix(op, arg) {
  return {
    constructor: tree.PrefixOp,
    op,
    children: [arg],
  };
}
function blank() {
  return {constructor: tree.Blank};
}

function match(subject, matcher, path = 'subject') {
  try {
    if (matcher[MATCH]) {
      matcher[MATCH](subject, path);
    } else if (subject === matcher) {
      return;
    } else if (Array.isArray(matcher)) {
      expect(subject).to.be.an('array');
      expect(subject).to.have.length(matcher.length);
      for (let i = 0; i < matcher.length; i++) {
        match(subject[i], matcher[i], `${path}[${i}]`);
      }
    } else if (typeof matcher === 'object') {
      for (const key in matcher) {
        match(subject[key], matcher[key], `${path}.${key}`);
      }
    } else {
      expect(subject).to.be(matcher);
    }
  } catch (err) {
    if (!err[MATCH]) {
      err[MATCH] = true;
      err.message += `\nat ${path}`;
    }
    err.message += `\nmatching ${dbg(subject)}\n against ${dbg(matcher)}`;
    throw err;
  }
}

function dbg(o) {
  if (Array.isArray(o)) {
    return `[${o.join(', ')}]`;
  } else if (typeof o === 'function') {
    const s = String(o);
    if (s.startsWith('class')) return s.split(' ')[1];
    if (s.startsWith('function')) return s.split(/[ \(]/g)[1];
    return String(o);
  } else if (typeof o === 'object') {
    return `{${Object.keys(o).map(k => `${k}: ${o[k]}`).join(', ')}}`;
  }
  return String(o);
}
