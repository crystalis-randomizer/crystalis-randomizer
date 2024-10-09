const ALIAS = 1; // list of strings, comma-separated
const DEFAULT = 2; // any
const PRESET = 3; // map<Preset, any>
const GENERATOR_ONLY = 4; // bool
const UNSCRIPTABLE = 5; // bool
const RANGE = 6; // [number, number]
const KEY = 7; // enum type name
const HIDDEN = 8; // bool
const GROUP = 9; // map<GroupIndex, string>

export interface FieldOptions {
  alias?: readonly string[];
  default?: string|number|boolean;
  preset?: {readonly [id: number]: string|number|boolean};
  generatorOnly?: boolean;
  unscriptable?: boolean;
  range?: [number, number];
  key?: string;
  hidden?: boolean;
  group?: readonly [number, string];
}

export interface EnumValueOptions {
  alias?: readonly string[];
  category?: readonly number;
}

export function fieldOptionsToJson(o: FieldOptions): Record<number, unknown>|undefined {
  const fields: Array<[number, unknown]> = [];
  if (o.alias != null) fields.push([ALIAS, o.alias]);
  if (o.default != null) fields.push([DEFAULT, o.default]);
  if (o.preset != null) fields.push([PRESET, o.preset]);
  if (o.generatorOnly != null) fields.push([GENERATOR_ONLY, o.generatorOnly]);
  if (o.unscriptable != null) fields.push([UNSCRIPTABLE, o.unscriptable]);
  if (o.range != null) fields.push([RANGE, o.range]);
  if (o.key != null) fields.push([KEY, o.key]);
  if (o.hidden != null) fields.push([HIDDEN, o.hidden]);
  if (o.group != null) fields.push([GROUP, o.group]);
  if (!fields.length) return undefined;
  // TODO - compare length between [,,1] and {2:1} forms - both should work.
  return Object.fromEntries(fields);
}

export function fieldOptionsFromJson(o: Record<number, unknown>): FieldOptions {
  const out: FieldOptions = {};
  if (o[ALIAS] != null) out.alias = o[ALIAS] as any;
  if (o[DEFAULT] != null) out.default = o[DEFAULT] as any;
  if (o[PRESET] != null) out.preset = o[PRESET] as any;
  if (o[GENERATOR_ONLY] != null) out.generatorOnly = o[GENERATOR_ONLY] as any;
  if (o[UNSCRIPTABLE] != null) out.unscriptable = o[UNSCRIPTABLE] as any;
  if (o[RANGE] != null) out.range = o[RANGE] as any;
  if (o[KEY] != null) out.key = o[KEY] as any;
  if (o[HIDDEN] != null) out.hidden = o[HIDDEN] as any;
  if (o[GROUP] != null) out.group = o[GROUP] as any;
  return out;
}

export function enumValueOptionsToJson(o: EnumValueOptions): Record<number, unknown>|undefined {
  const fields: Array<[number, unknown]> = [];
  if (o.alias != null) fields.push([ALIAS, o.alias]);
  if (!fields.length) return undefined;
  return Object.fromEntries(fields);
}

export function enumValueOptionsFromJson(o: Record<number, unknown>): EnumValueOptions {
  const out: EnumValueOptions = {};
  if (o[ALIAS] != null) out.alias = o[ALIAS] as any;
  return out;
}

export function canonicalize(name: string): string {
  return name.replace(/[^a-z0-9]/ig, '').toLowerCase();
}

export function toCamelCase(name: string) {
  return name.toLowerCase().replace(/_(.)/g, (_, a) => a.toUpperCase());
}
