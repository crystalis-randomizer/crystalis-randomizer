// Merges the Mesen labels (.mlb) from the vanilla disassembly with the
// labels from the final link of the patched rom.

import type { Module } from 'js65';

interface Entry {
  type: string;
  start: number;
  end: number;
  label: string;
  comment: string;
}

export function mergeLabels(vanilla: string, patched: string,
                            modules: readonly Module[], patch: Module): string {
  const {freed, patched: written} = replacedRanges(modules, patch);
  const overlaps = (ranges: Array<readonly [number, number]>, e: Entry) =>
      e.type === 'NesPrgRom' &&
      ranges.some(([start, end]) => e.start < end && e.end > start);

  const entries = new Map<string, Entry>();
  const patchLabels = new Set<string>();
  for (const e of parse(patched)) {
    entries.set(key(e), e);
    if (e.label) patchLabels.add(e.label);
  }
  for (const e of parse(vanilla)) {
    // NOTE: The fixed bank moves to the end of the expanded PRG.
    if (e.type === 'NesPrgRom' && e.start >= 0x3c000) {
      e.start += 0x40000;
      e.end += 0x40000;
    }
    // Freed space is either relocated data or new code, so nothing from
    // vanilla applies.  Code patched in place keeps its entry point, but
    // the comments describe the old code.
    if (overlaps(freed, e)) continue;
    if (overlaps(written, e)) e.comment = '';
    // Label names must be unique, and the patches win.
    if (patchLabels.has(e.label)) e.label = '';
    const existing = entries.get(key(e));
    if (!existing) {
      if (e.label || e.comment) entries.set(key(e), e);
      continue;
    }
    existing.label ||= e.label;
    existing.comment ||= e.comment;
  }
  return [...entries.values()].map(format).join('');
}

/** PRG ranges that anything freed, and that the patches wrote. */
function replacedRanges(modules: readonly Module[], patch: Module) {
  // Only some modules declare the segments, so gather them all first.
  const segments = new Map<string, {memory: number, size: number, offset: number}>();
  for (const m of modules) {
    for (const {name, memory, size, offset} of m.segments || []) {
      if (memory == null || size == null || offset == null) continue;
      segments.set(name, {memory, size, offset});
    }
  }
  function toOffset(names: readonly string[], org: number) {
    for (const name of names) {
      const s = segments.get(name);
      if (s && org >= s.memory && org < s.memory + s.size) {
        return s.offset + org - s.memory;
      }
    }
    return undefined;
  }
  const patched: Array<readonly [number, number]> = [];
  for (const chunk of patch.chunks || []) {
    if (chunk.org == null || !chunk.data.length) continue;
    const offset = toOffset(chunk.segments, chunk.org);
    if (offset != null) patched.push([offset, offset + chunk.data.length]);
  }
  const freed: Array<readonly [number, number]> = [];
  for (const m of modules) {
    for (const segment of m.segments || []) {
      for (const [start, end] of segment.free || []) {
        const offset = toOffset([segment.name], start);
        if (offset != null) freed.push([offset, offset + end - start]);
      }
    }
  }
  return {freed, patched};
}

function* parse(mlb: string): Generator<Entry> {
  for (const line of mlb.split('\n')) {
    const match = /^(\w+):([0-9a-f]+)(?:-([0-9a-f]+))?:([^:]*):(.*)$/i.exec(line);
    if (!match) continue;
    const [, type, start, end, label, comment] = match;
    const s = parseInt(start, 16);
    yield {
      type,
      start: s,
      end: end ? parseInt(end, 16) + 1 : s + 1,
      label: sanitize(label),
      comment,
    };
  }
}

// Mesen rejects labels that aren't identifiers, and js65 sometimes emits
// "undefined" or labels that start with a digit. TODO: upstream a fix for this.
function sanitize(label: string): string {
  if (label === 'undefined') return '';
  return /^[0-9]/.test(label) ? `_${label}` : label;
}

function key({type, start, end}: Entry): string {
  return `${type}:${start.toString(16)}${
          end > start + 1 ? `-${(end - 1).toString(16)}` : ''}`;
}

function format(e: Entry): string {
  return `${key(e)}:${e.label}:${e.comment}\n`;
}
