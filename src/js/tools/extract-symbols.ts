#!/usr/bin/env bun

// Outputs a symbols.json file, which is just an array of all symbols
// defined and/or referenced in the file(s), from the token stream.

import * as fs from 'node:fs';
import { Cpu } from 'js65';

export interface SymbolsJson {
  symbols: string[];
  overrides: string[];
  defs: string[];
}

export interface SourceFile {
  filename: string;
  contents: string;
}

// Matches one token copied and joined together from the old js65 tokenizer.
// The js65 upstream doesn't export the tokenizer, so this'll have to do.
const TOKEN = new RegExp([
  /(@+[a-z0-9_]*|(?:(?:::)?[a-z_][a-z0-9_]*)+|:(?:[+-]\d+|[-+]+|<+rts|>*rts))/,
  /|\.[a-z]+/,
  /|(:|\++|-+|&&?|\|\|?|[#*/,=~!^]|<[<>=]?|>[>=]?)/,
  /|[[\]{}()]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[$%]?[0-9a-z_]+/,
].map(r => r.source).join(''), 'iy');

/** Splits a source file into lines of tokens (ignoring comments). */
function* lines(contents: string): Generator<Array<{ident?: string, op?: string}>> {
  let tokens = [];
  let pos = 0;
  while (pos < contents.length) {
    // Skip whitespace, comments, and line continuations.
    pos += /^(?:[ \t\r]|;[^\n]*|\\\r?\n)*/.exec(contents.slice(pos))![0].length;
    if (pos >= contents.length || contents[pos] === '\n') {
      yield tokens;
      tokens = [];
      pos++;
      continue;
    }
    TOKEN.lastIndex = pos;
    const match = TOKEN.exec(contents);
    if (!match) throw new Error(`Syntax error: ${contents.slice(pos, pos + 20)}`);
    tokens.push({ident: match[1], op: match[2]});
    pos = TOKEN.lastIndex;
  }
  if (tokens.length) yield tokens;
}

export function extractSymbols(files: readonly SourceFile[]): SymbolsJson {
  const symbols = new Set<string>();
  const overrides = new Set<string>();
  const defs = new Set<string>();
  let override = false;
  for (const {contents} of files) {
    for (const line of lines(contents)) {
      for (let i = 0; i < line.length; i++) {
        const t = line[i].ident;
        if (t && !/^[@:]/.test(t)) {
          symbols.add(t);
          if (/^[:=]$/.test(line[i + 1]?.op ?? '')) {
            (override ? overrides : defs).add(t);
          } else if (override) {
            overrides.add(t);
          }
        }
        override = t === 'OVERRIDE';
      }
    }
  }
  for (const op of Cpu.P02.names) {
    symbols.delete(op);
  }
  for (const s of overrides) {
    symbols.delete(s);
    defs.delete(s);
  }
  for (const s of defs) {
    symbols.delete(s);
  }
  symbols.delete('x');
  symbols.delete('y');
  return {
    symbols: [...symbols],
    overrides: [...overrides],
    defs: [...defs],
  };
}

async function main() {
  let files: string[] = [];
  let outfile: string|undefined = undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--help') {
      usage(0);
    } else if (arg === '-o') {
      if (outfile) usage();
      outfile = process.argv[++i];
    } else {
      files.push(arg);
    }
  }
  if (!files.length) {
    files.push('/dev/stdin');
  }
  if (!outfile) outfile = '/dev/stdout';

  const sources = await Promise.all(files.map(async filename => ({
    filename,
    contents: String(await fs.promises.readFile(filename)),
  })));
  fs.writeFileSync(outfile, JSON.stringify(extractSymbols(sources)));
}

function usage(code = 1, message = '') {
  if (message) console.error(`js65: ${message}`);
  console.error(`Usage: extract-symbols [-o FILE] [FILE...]`);
  process.exit(code);
}

if (import.meta.main) main();
