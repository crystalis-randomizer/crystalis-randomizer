class State {
    constructor(line, column, prefix, remainder, match) {
        this.line = line;
        this.column = column;
        this.prefix = prefix;
        this.remainder = remainder;
        this.match = match;
    }
}
export class Buffer {
    constructor(content, line = 0, column = 0) {
        this.content = content;
        this.line = line;
        this.column = column;
        this.prefix = '';
        this.remainder = content;
    }
    advance(s) {
        const s1 = this.remainder.substring(0, s.length);
        if (s !== s1)
            throw new Error(`Non-rooted token: '${s}' vs '${s1}'`);
        this.prefix += s;
        this.remainder = this.remainder.substring(s.length);
        const lines = s.split(/\n/g);
        if (lines.length > 1) {
            this.line += lines.length - 1;
            this.column = 0;
        }
        this.column += lines[lines.length - 1].length;
    }
    saveState() {
        return new State(this.line, this.column, this.prefix, this.remainder, this.lastMatch);
    }
    restoreState(state) {
        this.line = state.line;
        this.column = state.column;
        this.prefix = state.prefix;
        this.remainder = state.remainder;
        this.lastMatch = state.match;
    }
    skip(re) {
        const match = re.exec(this.remainder);
        if (!match)
            return false;
        this.advance(match[0]);
        return true;
    }
    space() { return this.skip(/^[ \t]+/); }
    newline() { return this.skip(/^\n/); }
    lookingAt(re) {
        if (typeof re === 'string')
            return this.remainder.startsWith(re);
        return re.test(this.remainder);
    }
    token(re) {
        let match;
        if (typeof re === 'string') {
            if (!this.remainder.startsWith(re))
                return false;
            match = [re];
        }
        else {
            match = re.exec(this.remainder);
        }
        if (!match)
            return false;
        match.line = this.line;
        match.column = this.column;
        this.lastMatch = match;
        this.advance(match[0]);
        return true;
    }
    lookBehind(re) {
        if (typeof re === 'string')
            return this.prefix.endsWith(re);
        const match = re.exec(this.prefix);
        if (!match)
            return false;
        match.line = this.line;
        match.column = this.line;
        this.lastMatch = match;
        return true;
    }
    match() {
        return this.lastMatch;
    }
    group(index = 0) {
        var _a;
        return (_a = this.lastMatch) === null || _a === void 0 ? void 0 : _a[index];
    }
    eof() {
        return !this.remainder;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9idWZmZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxLQUFLO0lBQ1QsWUFBcUIsSUFBWSxFQUNaLE1BQWMsRUFDZCxNQUFjLEVBQ2QsU0FBaUIsRUFDakIsS0FBc0I7UUFKdEIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixVQUFLLEdBQUwsS0FBSyxDQUFpQjtJQUFHLENBQUM7Q0FDaEQ7QUFFRCxNQUFNLE9BQU8sTUFBTTtJQU1qQixZQUFxQixPQUFlLEVBQVMsT0FBTyxDQUFDLEVBQVMsU0FBUyxDQUFDO1FBQW5ELFlBQU8sR0FBUCxPQUFPLENBQVE7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFJO1FBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBSTtRQUx4RSxXQUFNLEdBQUcsRUFBRSxDQUFDO1FBTVYsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7SUFDM0IsQ0FBQztJQUVPLE9BQU8sQ0FBQyxDQUFTO1FBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMs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QUFDLENBQUM7UUFDNUQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFlLENBQUM7UUFDakQsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUN6QixLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDdkIsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELEtBQUs7UUFDSCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDeEIsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQzs7UUFDYixhQUFPLElBQUksQ0FBQyxTQUFTLDBDQUFHLEtBQUssRUFBRTtJQUNqQyxDQUFDO0lBRUQsR0FBRztRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3pCLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbInR5cGUgTWF0Y2ggPSBSZWdFeHBFeGVjQXJyYXkgJiB7bGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcn07XG5cbmNsYXNzIFN0YXRlIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbGluZTogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBjb2x1bW46IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgcHJlZml4OiBzdHJpbmcsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHJlbWFpbmRlcjogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBtYXRjaDogTWF0Y2h8dW5kZWZpbmVkKSB7fVxufVxuXG5leHBvcnQgY2xhc3MgQnVmZmVyIHtcbiAgcHJlZml4ID0gJyc7XG4gIHJlbWFpbmRlcjogc3RyaW5nO1xuXG4gIGxhc3RNYXRjaD86IE1hdGNoO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGNvbnRlbnQ6IHN0cmluZywgcHVibGljIGxpbmUgPSAwLCBwdWJsaWMgY29sdW1uID0gMCkge1xuICAgIHRoaXMucmVtYWluZGVyID0gY29udGVudDtcbiAgfVxuXG4gIHByaXZhdGUgYWR2YW5jZShzOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzMSA9IHRoaXMucmVtYWluZGVyLnN1YnN0cmluZygwLCBzLmxlbmd0aCk7XG4gICAgaWYgKHMgIT09IHMxKSB0aHJvdyBuZXcgRXJyb3IoYE5vbi1yb290ZWQgdG9rZW46ICcke3N9JyB2cyAnJHtzMX0nYCk7XG4gICAgdGhpcy5wcmVmaXggKz0gcztcbiAgICB0aGlzLnJlbWFpbmRlciA9IHRoaXMucmVtYWluZGVyLnN1YnN0cmluZyhzLmxlbmd0aCk7XG4gICAgY29uc3QgbGluZXMgPSBzLnNwbGl0KC9cXG4vZyk7XG4gICAgaWYgKGxpbmVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMubGluZSArPSBsaW5lcy5sZW5ndGggLSAxO1xuICAgICAgdGhpcy5jb2x1bW4gPSAwO1xuICAgIH1cbiAgICB0aGlzLmNvbHVtbiArPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS5sZW5ndGg7XG4gIH1cblxuICBzYXZlU3RhdGUoKTogU3RhdGUge1xuICAgIHJldHVybiBuZXcgU3RhdGUodGhpcy5saW5lLCB0aGlzLmNvbHVtbixcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJlZml4LCB0aGlzLnJlbWFpbmRlcixcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1hdGNoKTtcbiAgfVxuXG4gIHJlc3RvcmVTdGF0ZShzdGF0ZTogU3RhdGUpIHtcbiAgICB0aGlzLmxpbmUgPSBzdGF0ZS5saW5lO1xuICAgIHRoaXMuY29sdW1uID0gc3RhdGUuY29sdW1uO1xuICAgIHRoaXMucHJlZml4ID0gc3RhdGUucHJlZml4O1xuICAgIHRoaXMucmVtYWluZGVyID0gc3RhdGUucmVtYWluZGVyO1xuICAgIHRoaXMubGFzdE1hdGNoID0gc3RhdGUubWF0Y2g7XG4gIH1cblxuICBza2lwKHJlOiBSZWdFeHApOiBib29sZWFuIHtcbiAgICBjb25zdCBtYXRjaCA9IHJlLmV4ZWModGhpcy5yZW1haW5kZXIpO1xuICAgIGlmICghbWF0Y2gpIHJldHVybiBmYWxzZTtcbiAgICB0aGlzLmFkdmFuY2UobWF0Y2hbMF0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHNwYWNlKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5za2lwKC9eWyBcXHRdKy8pOyB9XG4gIG5ld2xpbmUoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnNraXAoL15cXG4vKTsgfVxuXG4gIGxvb2tpbmdBdChyZTogUmVnRXhwfHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGlmICh0eXBlb2YgcmUgPT09ICdzdHJpbmcnKSByZXR1cm4gdGhpcy5yZW1haW5kZXIuc3RhcnRzV2l0aChyZSk7XG4gICAgcmV0dXJuIHJlLnRlc3QodGhpcy5yZW1haW5kZXIpO1xuICB9XG5cbiAgLy8gTk9URTogcmUgc2hvdWxkIGFsd2F5cyBiZSByb290ZWQgd2l0aCAvXi8gYXQgdGhlIHN0YXJ0LlxuICB0b2tlbihyZTogUmVnRXhwfHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGxldCBtYXRjaDogTWF0Y2h8bnVsbDtcbiAgICBpZiAodHlwZW9mIHJlID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKCF0aGlzLnJlbWFpbmRlci5zdGFydHNXaXRoKHJlKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgbWF0Y2ggPSBbcmVdIGFzIE1hdGNoO1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXRjaCA9IHJlLmV4ZWModGhpcy5yZW1haW5kZXIpIGFzIE1hdGNofG51bGw7XG4gICAgfVxuICAgIGlmICghbWF0Y2gpIHJldHVybiBmYWxzZTtcbiAgICBtYXRjaC5saW5lID0gdGhpcy5saW5lO1xuICAgIG1hdGNoLmNvbHVtbiA9IHRoaXMuY29sdW1uO1xuICAgIHRoaXMubGFzdE1hdGNoID0gbWF0Y2g7XG4gICAgdGhpcy5hZHZhbmNlKG1hdGNoWzBdKTtcblxuLy8gICAgY29uc29sZS5sb2coYFRPS0VOOiAke3JlfSBcIiR7bWF0Y2hbMF19XCJgKTtcbi8vdHJ5e3Rocm93IEVycm9yKCk7fWNhdGNoKGUpe2NvbnNvbGUubG9nKGUpO31cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgbG9va0JlaGluZChyZTogUmVnRXhwfHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGlmICh0eXBlb2YgcmUgPT09ICdzdHJpbmcnKSByZXR1cm4gdGhpcy5wcmVmaXguZW5kc1dpdGgocmUpO1xuICAgIGNvbnN0IG1hdGNoID0gcmUuZXhlYyh0aGlzLnByZWZpeCkgYXMgTWF0Y2h8bnVsbDtcbiAgICBpZiAoIW1hdGNoKSByZXR1cm4gZmFsc2U7XG4gICAgbWF0Y2gubGluZSA9IHRoaXMubGluZTtcbiAgICBtYXRjaC5jb2x1bW4gPSB0aGlzLmxpbmU7XG4gICAgdGhpcy5sYXN0TWF0Y2ggPSBtYXRjaDtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIG1hdGNoKCk6IE1hdGNofHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMubGFzdE1hdGNoO1xuICB9XG5cbiAgZ3JvdXAoaW5kZXggPSAwKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMubGFzdE1hdGNoPy5baW5kZXhdO1xuICB9XG5cbiAgZW9mKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhdGhpcy5yZW1haW5kZXI7XG4gIH1cbn1cbiJdfQ==