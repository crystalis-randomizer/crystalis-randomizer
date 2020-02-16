// Main engine for assembler.
// Has a tokenizer, feeds lines from there into expander and cpu.
// All symbols live at the CPU level.

import {Cpu} from './cpu.js';
import {IdGenerator} from './idgenerator.js';
import {ObjectFile} from './objectfile.js';
import {Preprocessor, PreprocessedLine} from './preprocessor.js';
import {Processor} from './processor.js';
import {Token} from './token.js';
import {TokenStream} from './tokenstream.js';
import {Tokenizer} from './tokenizer.js';
import {Evaluator} from './evaluator.js';
import {CancelToken, assertNever} from '../util.js';

interface Options extends Tokenizer.Options, Processor.Options {
}

export class Assembler {

  // stack? when parsing new files, etc...?
  // use a promise for output in case we need to load another file...

  constructor(readonly cpu = Cpu.P02, readonly opts: Options = {}) {}

  // TODO - how to handle includes?
  //  template method?  property?  ctor parameter?
  async readFile(name: string): Promise<string> {
    throw new Error(`Not implemented`);
  }

  async assemble(code: string, file = 'input.s'): Promise<ObjectFile> {
    //const proc = new Processor(this.cpu);
    const task = new Task(this, code, file, this.opts);
    await task.assemble();
    return task.processor.result();
  }

  
}

// TODO - expose a new Tokenizer-like interface that allows pulling
//        lines, but will also allow (1) unshifting macro expansions,
//        and (2) inserting included files.


class Task {
  readonly tokenStream: TokenStream;
  readonly idGen = new IdGenerator();
  readonly preprocessor: Preprocessor;
  readonly processor: Processor;

  constructor(readonly parent: Assembler,
              code: string,
              file: string,
              readonly opts = {...parent.opts}) {
    this.tokenStream = new TokenStream(opts);
    this.tokenStream.enter(code, file);
    this.preprocessor =
        new Preprocessor(this.tokenStream, this.idGen, new Evaluator(this));
    this.processor = new Processor(this.preprocessor, parent.cpu);
  }

  pc(): number|undefined {
    throw new Error(`unimplemented`);
  }

  // async include(file: string) {
  //   // Make a sub-task for the other file.  It shares the same preprocessor
  //   // and processor, but has its own tokenizer.
  //   const code = await this.parent.readFile(file);
  //   const task =
  //       new Task(this.parent, new Tokenizer(code, file),
  //                this.processor, new Preprocessor(this, this.preprocessor));
  //   await task.assemble();
  // }

  private async process({kind, tokens}: PreprocessedLine) {
    switch (kind) {
      case 'label': return this.processor.label(tokens[0]);
      case 'directive': return await this.directive(tokens);
      case 'assign': return this.processor.assign(tokens);
      case 'instruction': return this.processor.instruction(tokens);
    }
    assertNever(kind);
  }

  private async directive(tokens: Token[]) {
    const directive = Token.str(tokens[0]);
    if (directive === '.include') return await this.include(tokens);
    if (directive === '.out') return await this.out(tokens);
    this.processor.directive(directive, tokens);
  }

  private async include(tokens: Token[]) {
    const file = Token.expectString(tokens[1], tokens[0]);
    Token.expectEol(tokens[2]);
    const code = await this.parent.readFile(file);
    this.tokenStream.enter(code, file);
  }

  private async out(tokens: Token[]) {
    // TODO - something other than console.log??
    const str = Token.expectString(tokens[1], tokens[0]);
    Token.expectEol(tokens[2]);
    console.log(str);
  }

  async assemble(cancel = CancelToken.NONE) {
    for (const line of this.preprocessor) {
      cancel.throwIfRequested();
      await this.process(line);
    }
    return this.processor.result;
    // while (true) {
    //   const line = this.tokenStream.next();
    //   if (!line.length) {
    //     if (!this.tokenizerStack.length) break;
    //     this.tokenizer = this.tokenizerStack.pop();
    //     continue;
    //   }
    //   // We have a line: expand it with the expander, maybe into multiple lines.
    //   for (const expanded of this.preprocessor.expand(line)) {
    //     // Handle certain directives, like .include, right here
    //     if (Token.eq(expanded[0], Token.INCLUDE)) {
    //       if (expanded[1]?.token !== 'str') throw new Error(`Bad .include`);
    //       const file = expanded[1].str;
    //       continue;
    //     }
    //     // TODO - possibly just give the assembler directly to the expander?
    //     this.handle(expanded);
    //   }      
    // }
  }
}
