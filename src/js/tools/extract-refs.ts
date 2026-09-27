#!/usr/bin/env bun

// Outputs a refs.json file, which is read programmatically to both
// initialize PRG reads and to allow adaptively changing symbols out
// from under the vanilla program.

// TODO - extract identifiers from all the *.s files?
//      - cross-reference and only write the ones that are referenced?

import * as fs from 'node:fs';
import { Assembler } from '../asm/assembler';
import { Cpu } from '../asm/cpu';
import { Expr } from '../asm/expr';
import { nodeSmudger } from '../asm/nodesmudger';
import { Preprocessor } from '../asm/preprocessor';
import { TokenSource } from '../asm/token';
import { Tokenizer } from '../asm/tokenizer';
import { TokenStream } from '../asm/tokenstream';
import type { SourceFile, SymbolsJson } from './extract-symbols';

const FAIL_ON_BAD_OVERRIDE = true;

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


export async function extractRefs(files: readonly SourceFile[],
                                  symbolTable?: SymbolsJson,
                                  romDir = '.'): Promise<RefsJson> {
  let syms: Set<string>|undefined = undefined;
  let overrides: Set<String>|undefined = undefined;
  let defs: Set<string>|undefined = undefined;
  if (symbolTable) {
    syms = new Set();
    overrides = new Set();
    defs = new Set();
    for (const sym of symbolTable.symbols) {
      syms.add(sym);
    }
    for (const sym of symbolTable.overrides) {
      syms.add(sym);
      overrides.add(sym);
    }
    for (const sym of symbolTable.defs) {
      syms.add(sym);
      defs.add(sym);
    }
  }

  // assemble
  async function tokenizer({filename, contents}: SourceFile) {
    const src = await nodeSmudger(contents, romDir);
    return new Tokenizer(src, filename, {lineContinuations: true});
  }

  const isRelevant = syms ? (s: string) => syms!.has(s) : () => true;

  const errors: string[] = [];
  const labels: Label[] = [];
  const refs: Ref[] = [];
  const asm = new Assembler(Cpu.P02, {
    refExtractor: {
      label(name: string, org: number, segments: readonly string[]) {
        if (defs?.has(name)) errors.push(`Undeclared OVERRIDE: ${name}`);
        overrides?.delete(name);
        if (!isRelevant(name)) return;
        labels.push({name, org, segments});
      },
      ref(expr: Expr, bytes: number, org: number,
          segments: readonly string[]) {
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
  for (const sym of overrides || []) {
    errors.push(`Vanilla missing OVERRIDE: ${sym}`);
  }

  if (errors.length) {
    if (FAIL_ON_BAD_OVERRIDE) throw new Error(errors.join('\n'));
    for (const e of errors) console.error(e);
  }
  return {refs, labels};
}

async function main() {
  let files: string[] = [];
  let symbolTable: SymbolsJson|undefined = undefined;
  let outfile: string|undefined = undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--help') {
      usage(0);
    } else if (arg === '-o') {
      if (outfile) usage();
      outfile = process.argv[++i];
    } else if (arg === '-s') {
      const table: SymbolsJson =
          JSON.parse(String(fs.readFileSync(process.argv[++i])));
      if (symbolTable) {
        symbolTable.symbols.push(...table.symbols);
        symbolTable.overrides.push(...table.overrides);
        symbolTable.defs.push(...table.defs);
      } else {
        symbolTable = table;
      }
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
  try {
    const result = await extractRefs(sources, symbolTable);
    fs.writeFileSync(outfile, JSON.stringify(result));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}

function usage(code = 1, message = '') {
  if (message) console.error(`js65: ${message}`);
  console.error(`Usage: extract-refs [-s SYMBOLS] [-o FILE] [FILE...]`);
  process.exit(code);
}

if (import.meta.main) main();
