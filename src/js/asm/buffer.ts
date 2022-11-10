type Match = RegExpExecArray & {line: number, column: number};

class State {
  constructor(readonly line: number,
              readonly column: number,
              readonly prefix: string,
              readonly remainder: string,
              readonly match: Match|undefined) {}
}

export class Buffer {
  prefix = '';
  remainder: string;

  lastMatch?: Match;

  constructor(readonly content: string, public line = 1, public column = 0) {
    this.remainder = content;
  }

  private advance(s: string) {
    const s1 = this.remainder.substring(0, s.length);
    if (s !== s1) throw new Error(`Non-rooted token: '${s}' vs '${s1}'`);
    this.prefix += s;
    this.remainder = this.remainder.substring(s.length);
    s = s.replace('\n', s.includes('\r') ? '' : '\r');
    const lines = s.split(/\r/g);
    if (lines.length > 1) {
      this.line += lines.length - 1;
      this.column = 0;
    }
    this.column += lines[lines.length - 1].length;
  }

  saveState(): State {
    return new State(this.line, this.column,
                     this.prefix, this.remainder,
                     this.lastMatch);
  }

  restoreState(state: State) {
    this.line = state.line;
    this.column = state.column;
    this.prefix = state.prefix;
    this.remainder = state.remainder;
    this.lastMatch = state.match;
  }

  skip(re: RegExp): boolean {
    const match = re.exec(this.remainder);
    if (!match) return false;
    this.advance(match[0]);
    return true;
  }
  space(): boolean { return this.skip(/^[ \t]+/); }
  newline(): boolean { return this.skip(/^(\r\n|\n|\r)/); }

  lookingAt(re: RegExp|string): boolean {
    if (typeof re === 'string') return this.remainder.startsWith(re);
    return re.test(this.remainder);
  }

  // NOTE: re should always be rooted with /^/ at the start.
  token(re: RegExp|string): boolean {
    let match: Match|null;
    if (typeof re === 'string') {
      if (!this.remainder.startsWith(re)) return false;
      match = [re] as Match;
    } else {
      match = re.exec(this.remainder) as Match|null;
    }
    if (!match) return false;
    match.line = this.line;
    match.column = this.column;
    this.lastMatch = match;
    this.advance(match[0]);

//    console.log(`TOKEN: ${re} "${match[0]}"`);
//try{throw Error();}catch(e){console.log(e);}

    return true;
  }

  lookBehind(re: RegExp|string): boolean {
    if (typeof re === 'string') return this.prefix.endsWith(re);
    const match = re.exec(this.prefix) as Match|null;
    if (!match) return false;
    match.line = this.line;
    match.column = this.line;
    this.lastMatch = match;
    return true;
  }

  match(): Match|undefined {
    return this.lastMatch;
  }

  group(index = 0): string|undefined {
    return this.lastMatch?.[index];
  }

  eof(): boolean {
    return !this.remainder;
  }
}
