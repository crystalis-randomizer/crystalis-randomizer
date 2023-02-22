#!/usr/bin/env -S node

// Outputs a refs.json file, which is read programmatically to both
// initialize PRG reads and to allow adaptively changing symbols out
// from under the vanilla program.

// TODO - extract identifiers from all the *.s files?
//      - cross-reference and only write the ones that are referenced?

import * as fs from 'node:fs';
import { Assembler } from '../asm/assembler';
import { Cpu } from '../asm/cpu';
import { Expr } from '../asm/expr';
import { Preprocessor } from '../asm/preprocessor';
import { TokenSource } from '../asm/token';
import { Tokenizer } from '../asm/tokenizer';
import { TokenStream } from '../asm/tokenstream';

export interface RefsJson {
  labels: readonly Label[];
  refs: readonly Ref[];
}
export interface Label {
  segments: readonly string[];
  org: number;
  name: string;
}
export interface Ref {
  segments: readonly string[];
  org: number;
  offset: number;
  bytes: number;
  expr: Expr;
}

async function main() {
  let files: string[] = [];
  let syms: Set<string>|undefined = undefined;
  let outfile: string|undefined = undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--help') {
      usage(0);
    } else if (arg === '-o') {
      if (outfile) usage();
      outfile = process.argv[++i];
    } else if (arg === '-s') {
      if (!syms) syms = new Set();
      for (const sym of JSON.parse(String(fs.readFileSync(process.argv[++i]))) ){
        syms.add(sym);
      }
    } else {
      files.push(arg);
    }
  }
  if (!files.length) {
    files.push('/dev/stdin');
  }
  if (!outfile) outfile = '/dev/stdout';

  // assemble
  async function tokenizer(path: string) {
    return new Tokenizer(String(await fs.promises.readFile(path)), path,
                         {lineContinuations: true});
  }

  const isRelevant = syms ? (s: string) => syms!.has(s) : () => true;

  const labels: Label[] = [];
  const refs: Ref[] = [];
  const asm = new Assembler(Cpu.P02, {
    refExtractor: {
      label(name: string, org: number, segments: readonly string[]) {
        if (!isRelevant(name)) return;
        labels.push({name, org, segments});
      },
      ref(expr: Expr, bytes: number, org: number, segments: readonly string[]) {
        const offset = asm.orgToOffset(org);
        if (offset == null) return;
        const used = Expr.symbols(expr);
        if (!used.some(isRelevant)) return;
        expr = Expr.strip(expr);
        refs.push({expr, bytes, org, segments, offset});
      },
    },
  });
  const toks = new TokenStream();
  const sources = await Promise.all(files.map(tokenizer));
  toks.enter(TokenSource.concat(...sources));
  const pre = new Preprocessor(toks, asm);
  asm.tokens(pre);

  fs.writeFileSync(outfile, JSON.stringify({refs, labels} as RefsJson));
}

function usage(code = 1, message = '') {
  if (message) console.error(`js65: ${message}`);
  console.error(`Usage: extract-refs [-o FILE] [FILE...]`);
  process.exit(code);
}

main();
