import {Token} from './token';
import {Tokenizer} from './tokenizer';

type Frame = [Tokenizer|undefined, Token[][]];

export class TokenStream {
  private stack: Frame[] = [];
  constructor(readonly opts: Tokenizer.Options) {}
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
  // async include(file: string) {
  //   const code = await this.task.parent.readFile(file);
  //   this.stack.push([new Tokenizer(code, file, this.task.opts),  []]);
  // }
  // Enter a macro scope.
  enter(code?: string, file?: string) {
    const frame: Frame = [undefined, []];
    if (code) frame[0] = new Tokenizer(code, file, this.opts);
    this.stack.push(frame);
  }
  // Exit a macro scope prematurely.
  exit() {
    this.stack.pop();
  }
  // options(): Tokenizer.Options {
  //   return this.task.opts;
  // }
}

