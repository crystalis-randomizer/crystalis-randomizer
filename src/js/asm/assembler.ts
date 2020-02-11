// Main engine for assembler.
// Has a tokenizer, feeds lines from there into expander and cpu.
// All symbols live at the CPU level.

import {Cpu} from './cpu.js';
import {IdGenerator} from './idgenerator.js';
import {ObjectFile} from './objectfile.js';
import {Preprocessor} from './preprocessor.js';
import {Processor} from './processor.js';
import {Token} from './token.js';
import {Tokenizer} from './tokenizer.js';
import {Evaluator} from './evaluator.js';
import { CancelToken } from '../util.js';

interface Options extends Tokenizer.Options {
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

class TokenStream {
  private stack: Array<readonly [Tokenizer|undefined, Token[][]]>;
  constructor(readonly task: Task, code: string, file: string) {
    this.stack = [[new Tokenizer(code, file, task.opts), []]];
  }
  next(): Token[] {
    while (this.stack.length) {
      const [tok, front] = this.stack[this.stack.length - 1];
      if (front.length) return front.pop()!;
      const line = tok?.line();
      if (line?.length) return line;
      this.stack.pop();
    }
    return [];
  }
  unshift(...lines: Token[][]) {
    if (!this.stack.length) throw new Error(`Cannot unshift after EOF`);
    const front = this.stack[this.stack.length - 1][1];
    for (let i = lines.length - 1; i >= 0; i--) {
      front.push(lines[i]);
    }
  }
  async include(file: string) {
    const code = await this.task.parent.readFile(file);
    this.stack.push([new Tokenizer(code, file, this.task.opts),  []]);
  }
  // Enter a macro scope.
  enter() {
    this.stack.push([undefined, []]);
  }
  // Exit a macro scope prematurely.
  exit() {
    this.stack.pop();
  }
  options(): Tokenizer.Options {
    return this.task.opts;
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
    this.tokenStream = new TokenStream(this, code, file);
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

  async assemble(cancel = CancelToken.NONE) {
    await this.processor.process();
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
