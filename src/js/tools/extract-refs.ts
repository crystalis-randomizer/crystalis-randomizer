#!/usr/bin/env bun

// Outputs a refs.json file, which is read programmatically to both
// initialize PRG reads and to allow adaptively changing symbols out
// from under the vanilla program.

// TODO - extract identifiers from all the *.s files?
//      - cross-reference and only write the ones that are referenced?

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assemble, type Expr } from 'js65';
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

  const isRelevant = syms ? (s: string) => syms!.has(s) : () => true;

  const smudged = new Map<string, string>();
  for (const file of files) {
    smudged.set(file.filename, rehydrate(file, romDir));
  }

  const errors: string[] = [];
  const labels: Label[] = [];
  const refs: Ref[] = [];
  // Include every file from one top-level source so they share a single
  // scope, as if they were one concatenated file.
  const code = files.map(f => `.include ${JSON.stringify(f.filename)}\n`).join('');
  const result = assemble([{type: 'source', name: 'extract-refs.s', code}], {
    includePaths: ['.'],
    lineContinuations: true,
    lint: {enabled: false},
    refExtractor: {
      label(name: string, org: number, segments: readonly string[]) {
        if (defs?.has(name)) errors.push(`Undeclared OVERRIDE: ${name}`);
        overrides?.delete(name);
        if (!isRelevant(name)) return;
        labels.push({name, org, segments});
      },
      ref(expr: Expr, bytes: number, org: number,
          segments: readonly string[], offset: number|undefined) {
        if (offset == null) return;
        if (!symbols(expr).some(isRelevant)) return;
        refs.push({expr: strip(expr), bytes, org, segments, offset});
      },
    },
  }, {
    resolveText: (_bases, filename) => {
      const content = smudged.get(filename);
      return content != null ? {baseIndex: 0, content} : undefined;
    },
    resolveBinary: () => undefined,
  });
  if (!result.success) {
    throw new Error(result.messages.filter(m => m.level === 'error').map(m => {
      const at = m.source ? `${m.source.file}:${m.source.line}: ` : '';
      return at + m.message;
    }).join('\n'));
  }
  for (const sym of overrides || []) {
    errors.push(`Vanilla missing OVERRIDE: ${sym}`);
  }

  if (errors.length) {
    if (FAIL_ON_BAD_OVERRIDE) throw new Error(errors.join('\n'));
    for (const e of errors) console.error(e);
  }
  return {refs, labels};
}

/** Lists the symbols used in an expression (duplicates included). */
function symbols(expr: Expr, out: string[] = []): string[] {
  for (const arg of expr.args || []) symbols(arg, out);
  if (expr.op === 'sym' && expr.sym) out.push(expr.sym);
  return out;
}

/** Drops source info from an expression to keep refs.json small. */
function strip(expr: Expr): Expr {
  const out = {...expr};
  if (out.args) out.args = out.args.map(strip);
  delete out.source;
  return out;
}

const JS65 = path.resolve(import.meta.dir, '../../../node_modules/.bin/js65');

function rehydrate({filename, contents}: SourceFile, romDir: string): string {
  const match = /smudge sha1 ([0-9a-f]{40})/.exec(contents);
  if (!match) return contents;
  const rom = fs.readdirSync(romDir).filter(f => f.endsWith('.nes'))
      .map(f => path.join(romDir, f))
      .find(f => crypto.createHash('sha1').update(fs.readFileSync(f))
                     .digest('hex') === match[1]);
  if (!rom) throw new Error(`${filename}: could not find rom with sha ${match[1]}`);
  const proc = Bun.spawnSync([JS65, 'rehydrate', '-r', rom, '--stdin'],
                             {stdin: Buffer.from(contents)});
  if (!proc.success) {
    throw new Error(`js65 rehydrate ${filename} failed:\n${proc.stderr}`);
  }
  return proc.stdout.toString();
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
