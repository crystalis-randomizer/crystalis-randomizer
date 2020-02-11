import {Cpu} from './cpu.js';
import {Expr} from './expr.js';
import {ObjectFile} from './objectfile.js';
import {PreprocessedLine} from './preprocessor.js';
import {Token} from './token.js';
import {assertNever} from '../util.js';

interface Options {
  allowBrackets?: boolean;
}

export class Processor {

  constructor(readonly lines: AsyncIterable<PreprocessedLine>,
              readonly cpu: Cpu, readonly opts: Options = {}) {}

  async process() {
    for await (const {kind, tokens} of this.lines) {
      // handle the line...
      if (kind === 'label') {
        await this.label(str(tokens[0]));
      } else if (kind === 'directive') {
        const directive = this.directives.get(str(tokens[0]));
        if (!directive) {
          throw new Error(`Bad directive: ${Token.nameAt(tokens[0])}`);
        }
        await directive.call(this, tokens);
      } else if (kind === 'assign') {
        const mut = Token.eq(tokens[1], Token.SET);
        this.assign(str(tokens[0]), mut, Expr.parseOnly(tokens, 2));
      } else if (kind === 'mnemonic') {
        // look at the rest of the tokens for calling convention...
        const mnemonic = str(tokens[0]).toLowerCase();
        const argument = this.parseArg(tokens);
        await this.mnemonic(mnemonic, argument);
      } else {
        assertNever(kind);
      }
    }
  }

  result(): Promise<ObjectFile> {
    throw new Error(`not implemented`);
  }

  readonly directives = new Map<string, (tokens: Token[]) => Promise<void>>([
    ['.org', this.org],
    ['.reloc', this.reloc],
    ['.segment', this.segment],
  ]);

  parseArg(tokens: Token[]): Arg {
    // Look for parens/brackets and/or a comma
    if (tokens.length === 1) return ['imp'];
    const front = tokens[1];
    if (tokens.length === 2) {
      if (Token.isRegister(front, 'a')) return ['acc'];
    } else if (Token.eq(front, Token.IMMEDIATE)) {
      return ['imm', Expr.parseOnly(tokens, 2)];
    }
    // it must be an address of some sort - is it indirect?
    if (Token.eq(front, Token.LP) ||
        (this.opts.allowBrackets && Token.eq(front, Token.LB))) {
      const close = Token.findBalanced(tokens, 1);
      if (close < 0) throw new Error(`Unbalanced ${Token.nameAt(front)}`);
      const args = Token.parseArgList(tokens.slice(2, close));
      if (!args.length) throw new Error(`Bad argument${Token.at(front)}`);
      const expr = Expr.parseOnly(args[0]);
      if (args.length === 1) {
        // either IND or INY
        if (Token.eq(tokens[close + 1], Token.COMMA) &&
            Token.isRegister(tokens[close + 2], 'y')) {
          Token.expectEol(tokens[close + 3]);
          return ['iny', expr];
        }
        Token.expectEol(tokens[close + 1]);
        return ['ind', expr];
      } else if (args.length === 2 && args[1].length === 1) {
        // INX
        if (Token.isRegister(args[1][0], 'x')) return ['inx', expr];
      }
      throw new Error(`Bad argument${Token.at(front)}`);
    }
    const args = Token.parseArgList(tokens.slice(1));
    if (!args.length) throw new Error(`Bad arg${Token.at(front)}`);
    const expr = Expr.parseOnly(args[0]);
    if (args.length === 1) return ['add', expr];
    if (args.length === 2 && args[1].length === 1) {
      if (Token.isRegister(args[1][0], 'x')) return ['a,x', expr];
      if (Token.isRegister(args[1][0], 'y')) return ['a,y', expr];
    }
    throw new Error(`Bad arg${Token.at(front)}`);
  }

  async label(label: string) {
    // Add the label to the current chunk...
  }

  async assign(symbol: string, mutable: boolean, value: Expr) {
    throw new Error(`unimplemented`);
  }

  async mnemonic(mnemonic: string, arg: Arg) {
    // may need to size the arg, depending.
    // cpu will take 'add', 'a,x', and 'a,y' and indicate which it actually is.
    const ops = this.cpu.op(mnemonic);
    const m = arg[0];
    if (m === 'add' || m === 'a,x' || m === 'a,y') {
      const expr = arg[1]!;
      const s = expr.size || 2;
      if (m === 'add' && s === 1 && 'zpg' in ops) {
        return this.opcode(ops.zpg!, 1, expr);
      } else if (m === 'add' && 'abs' in ops) {
        return this.opcode(ops.abs!, 2, expr);
      } else if (m === 'add' && 'rel' in ops) {
        const offset = {op: '-', args: [expr, null!]}; // TODO - PC
        // TODO - check range!
        return this.opcode(ops.rel!, 1, offset);
      } else if (m === 'a,x' && s === 1 && 'zpx' in ops) {
        return this.opcode(ops.zpx!, 1, expr);
      } else if (m === 'a,x' && 'abx' in ops) {
        return this.opcode(ops.abx!, 1, expr);
      } else if (m === 'a,y' && s === 1 && 'zpy' in ops) {
        return this.opcode(ops.zpy!, 1, expr);
      } else if (m === 'a,y' && 'aby' in ops) {
        return this.opcode(ops.aby!, 1, expr);
      }
      throw new Error(`Bad address mode ${m} for ${mnemonic}`);
    }
    if (m in ops) {
      return this.opcode(ops[m]!, this.cpu.argLen(m), arg[1]!);
    }
  }

  async opcode(op: number, arglen: number, arg: Expr) {
    // TODO - emit some bytes, inc the pc, etc.
    // TODO - handle symbols, add to refs
  }

  async org(tokens: Token[]) {
    // TODO - start a new chunk
  }

  async reloc(tokens: Token[]) {
    Token.expectEol(tokens[1]);
    // TODO - implement - put self in relocatable mode...
    //      - start a new chunk or something...
  }

  async segment(tokens: Token[]) {
    // TODO - parse a list of allowed segments
  }
}

function str(t: Token) {
  switch (t.token) {
    case 'cs':
    case 'ident':
    case 'str':
    case 'op':
      return t.str;
  }
  throw new Error(`Non-string token: ${Token.nameAt(t)}`);
}

type ArgMode = 'add' | 'a,x' | 'a,y' | 'imm' | 'ind' | 'inx' | 'iny';
type Arg = ['acc' | 'imp'] | [ArgMode, Expr];
