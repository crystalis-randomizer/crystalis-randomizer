import { Module } from '../asm/module';
import { Rom } from '../rom';
import { tuple, Segment, readValue, relocExportLabel } from './util';

// Random number table.
export class RandomNumbers {

  values: number[];

  constructor(readonly rom: Rom) {
    const address = readValue('RandomNumbers', rom.prg, Segment.$1a);
    this.values = tuple(rom.prg, address, COUNT);
  }

  write(): Module[] {
    const a = this.rom.assembler();
    relocExportLabel(a, 'RandomNumbers', ['1a']); // could be fe or ff?
    const table = buildTable(this.values);
    checkTable(table, this.values);
    a.byte(...table);
    a.export('RandomNumbers');
    return [a.module()];
  }
}

// Given a table of 64 numbers 0..7 (8 times each), produces a permutation
// of indices 0..63 with a single cycle such that the low 3 bits of the
// cycle follows the given table.
function buildTable(order: number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0, 0];
  c[order[63]]++;
  const indexed = order.map(i => i|((c[i]++&7)<<3));
  const table = [];
  for (let i = 0; i < 64; i++) {
    table[indexed[i]] = indexed[(i+1)&63];
  }
  return table;
}

// Sanity check to make sure the table works correctly and is consistent
// with the given order.  This is the inverse of buildTable, in case we
// ever need that.
function checkTable(table: number[], check?: number[]): number[] {
  const start = Math.min(...table.slice(48));
  let mismatch = false;
  let i = 0;
  const seen = new Set<number>();
  let j = table[start];
  const order = [];
  while (!seen.has(j)) {
    const x = j & 7;
    order.push(x);
    seen.add(j);
    j = table[j];
    if (check && check[i++] !== x) mismatch = true;
  }
  if (mismatch) throw new Error(`mismatch:\n  ${table.join(', ')}\n  ${order.join(', ')}\n  ${check!.join(', ')}`);
  if (order.length !== 64) throw new Error(`cycle detected: ${order.join(', ')}`);
  return order;
}


const COUNT = 64;
