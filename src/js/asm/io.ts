import {Token, TokenSource} from './token';
import {Tokenizer} from './tokenizer';
import {TokenStream} from './tokenstream';

export class IncludeWrapper implements TokenSource.Async {
  constructor(
      readonly readFile: (path: string) => Promise<string>,
      readonly source: TokenSource, readonly stream: TokenStream,
      readonly opts?: Tokenizer.Options) {}

  async nextAsync(): Promise<Token[]|undefined> {
    while (true) {
      const line = this.source.next();
      if (line?.[0].token !== 'cs') return line;
      if (line[0].str !== '.include') return line;
      const path = str(line);
      const code = await this.readFile(path);
      // TODO - options?
      this.stream.enter(new Tokenizer(code, path, this.opts));
    }
  }
}

export class ConsoleWrapper implements TokenSource {
  constructor(readonly source: TokenSource) {}

  next() {
    while (true) {
      const line = this.source.next();
      if (line?.[0].token !== 'cs') return line;
      switch (line[0].str) {
        case '.out':
          console.log(str(line));
          break;
        case '.warning':
          console.warn(str(line));
          break;
        case '.error':
          err(line);
          break;
        default:
          return line;
      }
    }
  }
}

function err(line: Token[]): never {
  const msg = str(line);
  throw new Error(msg + Token.at(line[0]));
}

function str(line: Token[]): string {
  const str = Token.expectString(line[1], line[0]);
  Token.expectEol(line[2], 'a single string');
  return str;
}
