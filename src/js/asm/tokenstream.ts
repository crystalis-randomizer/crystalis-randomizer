import {Token, TokenSource} from './token';

type Frame = [TokenSource|undefined, Token[][]];

const MAX_DEPTH = 100;

export class TokenStream implements TokenSource {
  private stack: Frame[] = [];

  next(): Token[]|undefined {
    while (this.stack.length) {
      const [tok, front] = this.stack[this.stack.length - 1];
      if (front.length) return front.pop()!;
      const line = tok?.next();
      if (line) return line;
      this.stack.pop();
    }
    return undefined;
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
  enter(tokens?: TokenSource) {
    const frame: Frame = [undefined, []];
    if (tokens) frame[0] = tokens;
    this.stack.push(frame);
    if (this.stack.length > MAX_DEPTH) throw new Error(`Stack overflow`);
  }

  // Exit a macro scope prematurely.
  exit() {
    this.stack.pop();
  }
  // options(): Tokenizer.Options {
  //   return this.task.opts;
  // }
}


// TODO - probably no need for anything that delegates to an AsyncTS...?
