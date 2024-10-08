import { EnumValueOptions, FieldOptions, canonicalize, enumValueOptionsFromJson, fieldOptionsFromJson } from './options';
import { Cursor, encodeVarint, decodeVarint } from './varint';

// NOTE: We restrict to a very limited subset of primitive types:
//  - uint32 => VARINT (0)
//  - int32  => VARINT (0)
//  - bool   => VARINT (0)
//  - string => LEN (2)
//  - float  => I32 (5)
// No other primitive types/tags are allowed.

// Binary format records
export enum RecordType {
  VARINT = 0,
  // I64 = 1, // UNUSED
  LEN = 2,
  // SGROUP = 3, // DEPRECATED
  // EGROUP = 4, // DEPRECATED
  I32 = 5,
  // TODO - consider adding a custom 6 and 7???
}
export interface ProtoNumRecord {
  id: number;
  type: RecordType.VARINT|RecordType.I32;
  data: number;
}
export interface ProtoLenRecord {
  id: number;
  type: RecordType.LEN;
  data: Uint8Array;
}
export type ProtoScriptRecord = ProtoLenRecord & {__IS_SCRIPT__: true};
export type ProtoRecord = ProtoNumRecord|ProtoLenRecord;

const BUFFER = new Uint8Array(8);
const BUFFER_VIEW = new DataView(BUFFER.buffer);
const TEXT_DECODER = new TextDecoder();
const TEXT_ENCODER = new TextEncoder();

type Options = Record<string, unknown>;

export class Script {
  constructor(readonly script: string) {}
  static fromRecord(rec: ProtoScriptRecord): Script {
    return new Script(TEXT_DECODER.decode(rec.data).substring(1));
  }
  toRecord(id: number): ProtoScriptRecord {
    const data = TEXT_ENCODER.encode('=' + this.script);
    return {id, data, type: RecordType.LEN} as ProtoScriptRecord;
  }
}

/**
 * Serialize an array of proto records into a byte array.
 * TODO - this is where we'd support alternative/custom
 * encoding formats.
 */
export function serializeRecords(records: ProtoRecord[]): Uint8Array {
  const bytes: number[] = [];
  for (const record of records) {
    const tag = record.id * 8 + record.type;
    encodeVarint(tag, bytes, bytes.length);
    if (record.type === RecordType.LEN) {
      encodeVarint(record.data.length, bytes, bytes.length);
      bytes.push(...(record.data as Uint8Array));
    } else if (record.type === RecordType.VARINT) {
      encodeVarint(record.data, bytes, bytes.length);
    } else {
      // convert float to four bytes
      BUFFER_VIEW.setFloat32(/* offset= */ 0, record.data, /* littleEndian= */ true);
      bytes.push(BUFFER[0], BUFFER[1], BUFFER[2], BUFFER[3]);
    }
  }
  return Uint8Array.from(bytes);
}

/** Deserialize a byte array into an array of proto records. */
export function deserializeRecords(bytes: Uint8Array): ProtoRecord[] {
  const records = [];
  const cursor = new Cursor();
  while (cursor.get() < bytes.length) {
    const tag = decodeVarint(bytes, cursor);
    const type = tag & 7;
    const id = (tag - type) / 8;
    let data: Uint8Array|number;
    if (type === RecordType.VARINT) {
      data = decodeVarint(bytes, cursor);
    } else if (type === RecordType.LEN) {
      const len = decodeVarint(bytes, cursor);
      const start = cursor.get();
      data = bytes.subarray(start, start + len);
      cursor.advance(len);
    } else {
      // ASSERT: I32
      const start = cursor.get();
      BUFFER.set(bytes.subarray(start, start + 4));
      data = BUFFER_VIEW.getFloat32(0, true);
      cursor.advance(4);
    }
    records.push({id, type, data} as ProtoRecord);
  }
  return records;
}

// TODO - can we just use the JSON field format?
// Given a ProtoRecord and a field descriptor,
// deserialize?

interface MessageJson {
  options?: Options;
  comment?: string;
  fields?: Record<string, FieldJson>;
}
interface EnumJson {
  options?: Options;
  valuesOptions?: Record<number, Record<number, unknown>>;
  comment?: string;
  comments?: Record<number, string>;
}
interface FieldJson {
  type: string,
  id: number,
  rule?: 'repeated';
  keyType?: string;
  options?: Record<number, unknown>;
  comment?: string;
}

interface Type<T> {
  readonly name: string;
  readonly scriptable: boolean;
  fromRecord(rec: ProtoRecord): T;
  toRecord(id: number, val: T): ProtoRecord;
  fromJson(json: unknown): T;
  toJson(val: T): unknown;
  pick?(rand: () => number): T;
}


export function defineEnum<const T extends Record<string, number>>(
  obj: T,
  desc: EnumJson,
  name: string,
  parent: Namespace,
): T&{descriptor: EnumType} {
  (obj as any).descriptor = new EnumType(name, desc, obj, parent);
  return obj as any;
}

export type EnumOf<T> = {[K in keyof T]: K extends 'descriptor' ? never : T[K]}[keyof T];


export class Namespace {
  readonly nested: ReadonlyMap<string, Namespace> = new Map();
  constructor(
    readonly name: string,
    readonly parent: Namespace|null,
    readonly presetMap: Map<number, string> = parent?.presetMap ?? new Map(),
  ) {
    if (parent) (parent.nested as Map<string, Namespace>).set(name, this);
  }

  // handle qualified names, recurse to parent if bottom name not found
  resolve(name: string): Namespace {
    const type = this.nested.get(name);
    if (type) return type;
    if (!this.parent) throw new Error(`unknown type: ${name}`);
    return this.parent.resolve(name);
  }
}

type MessageCtor<M extends MessageBase<M, G>, G extends GeneratorBase<M, G>> =
  {new (): M, descriptor: MessageType<M, G>};
type GeneratorCtor<M extends MessageBase<M, G>, G extends GeneratorBase<M, G>> =
  {new (): G, messageCtor: MessageCtor<M, G>};
export class MessageBase<M extends MessageBase<M, G>, G extends GeneratorBase<M, G>> {
  declare static readonly descriptor: MessageType<any, any>;
  constructor() {
    new.target.descriptor.init(this as any);
  }
  toBinary(): Uint8Array {
    return (this.constructor as MessageCtor<M, G>).descriptor.toBinary(this as any);
  }
  toJson(): object {
    return (this.constructor as MessageCtor<M, G>).descriptor.toJson(this as any);
  }

  // NOTE: Must be called immediately after defining the class.
  static init(descriptor: MessageType<any, any>) {
    (this as any).descriptor = descriptor;
    for (const f of descriptor.fieldsById.values()) {
      (this as any)[f.name] = f;
    }
  }
}
export class GeneratorBase<M extends MessageBase<M, G>, G extends GeneratorBase<M, G>> {
  declare static messageCtor: MessageCtor<any, any>;
  messageCtor: MessageCtor<M, G> = (this.constructor as GeneratorCtor<M, G>).messageCtor;
  descriptor: MessageType<M, G> = this.messageCtor.descriptor;

  toBinary(): Uint8Array {
    return this.messageCtor.descriptor.toBinary(this as any);
  }
  
  static fromBinary<M extends MessageBase<M, G>, G extends GeneratorBase<M, G>>(
    this: GeneratorCtor<M, G>,
    data: Uint8Array,
  ): G {
    const obj = new this();
    this.messageCtor.descriptor.mergeBinary(obj as any, data);
    return obj;
  }

  toJson(): object {
    return this.descriptor.toJson(this as any);
  }

  static fromJson<M extends MessageBase<M, G>, G extends GeneratorBase<M, G>>(
    this: GeneratorCtor<M, G>,
    json: unknown,
  ): G {
    const obj = new this();
    this.messageCtor.descriptor.mergeJson(obj as any, json);
    return obj;
  }

  generate(evaluator: Evaluator): M {
    return this.descriptor.generate(this as unknown as G, evaluator);
  }
}

// NOTE: also includes the root, which just has nested elements and no fields
export class MessageType<M extends MessageBase<M, G>, G extends GeneratorBase<M, G>> extends Namespace implements Type<G> {
  readonly scriptable = false;
  readonly fieldsById: ReadonlyMap<number, FieldInfo<any, any>>;
  readonly fieldsByCanonicalizedName: ReadonlyMap<string, FieldInfo<any, any>>;
  readonly groups: ReadonlyArray<ReadonlyArray<FieldInfo<any, any>>>;

  constructor(
    name: string,
    obj: MessageJson,
    readonly messageCtor: MessageCtor<M, G>,
    readonly generatorCtor: GeneratorCtor<M, G>,
    parent: Namespace,
    presets: Map<number, string>,
  ) {
    super(name, parent);
    messageCtor.descriptor = this;
    generatorCtor.messageCtor = messageCtor;
    const byId = new Map<number, FieldInfo<any, any>>();
    const byName = new Map<string, FieldInfo<any, any>>();
    const groups = new Map<number, Array<FieldInfo<any, any>>>();
    for (const [name, val] of Object.entries(obj.fields || {})) {
      const field = FieldInfo.of(name, val as FieldJson, this);
      byId.set(field.id, field);
      byName.set(canonicalize(name), field);
      for (const alias of field.options.alias || []) {
        byName.set(canonicalize(alias), field);
      }
      // if (field.options?.group != null) {
      //   const groupName = field.options.groupName;
      //   if (groups.has(groupName)) throw new Error(`duplicate group: ${groupName}`);
      //   groups.set(groupName, [field]);
      // }
    }
    this.fieldsById = byId;
    this.fieldsByCanonicalizedName = byName;

    for (const f of this.fieldsById.values()) {
      const group = f.group;
      if (group == null) continue;
      let arr = groups.get(group[0]);
      if (arr == null) {
        groups.set(group[0], arr = [byId.get(group[0])!]);
      }
      arr.push(f);
    }
    this.groups = [...groups.values()];
  }

  init(obj: Record<string, unknown>): void {
    for (const field of this.fieldsById.values()) {
      if (obj instanceof this.messageCtor && field.options.generatorOnly) continue;
      obj[field.name] = field.init();
    }
  }

  mergeBinary(obj: Record<string, unknown>, data: Uint8Array): void {
    for (const record of deserializeRecords(data)) {
      const field = this.fieldsById.get(record.id);
      if (!field) throw new Error(`unknown field`);
      if (obj instanceof this.messageCtor && field.options.generatorOnly) continue;
      obj[field.name] = field.isScriptRecord(record) ?
        Script.fromRecord(record) :
        field.append(obj[field.name] ?? field.init(), field.type.fromRecord(record));
    }
  }

  toBinary(val: M|G): Uint8Array {
    const recs = [];
    // stable sort so that we always get the same result
    const ids = [...this.fieldsById.keys()].sort((a, b) => a - b);
    for (const id of ids) {
      const field = this.fieldsById.get(id)!;
      const value = (val as Record<string, unknown>)[field.name];
//console.log(field.constructor, field.name, '[', String(value).substring(0, 20), ']');
      for (const entry of field.entries(value)) {
        recs.push(entry instanceof Script ?
          entry.toRecord(field.id) : field.type.toRecord(field.id, entry));
      }
    }
    return serializeRecords(recs);
  }

  fromRecord(rec: ProtoRecord): G {
    if (rec.type !== RecordType.LEN) throw new Error(`unexpected type`);
    // Deserialize the data and populate the fields.
    const obj = new this.generatorCtor();
    this.mergeBinary(obj as any, rec.data);
    return obj;
  }

  toRecord(id: number, val: M|G): ProtoRecord {
    return {id, type: RecordType.LEN, data: this.toBinary(val as any)};
  }

  fromJson(json: unknown): G {
    const obj = new this.generatorCtor();
    this.mergeJson(obj as any, json);
    return obj;
  }

  mergeJson(obj: Record<string, unknown>, json: unknown): void {
    if (typeof json !== 'object' || !json) throw new Error(`bad object`);
    for (const [key, value] of Object.entries(json)) {
      const field = this.fieldsByCanonicalizedName.get(canonicalize(key));
      if (!field) throw new Error(`unknown field: ${key}`); // TODO - be permissive?
      obj[field.name] = field.isScriptJson(value) ?
        new Script(value.substring(1)) : field.fromJson(value);
    }
  }

  toJson(val: M|G): object {
    const obj: Record<string, unknown> = {};
    for (const field of this.fieldsByCanonicalizedName.values()) {
      const value = (val as Record<string, unknown>)[field.name];
      obj[field.name] = value instanceof Script ? '=' + value.script : field.toJson(value);
    }
    return obj;
  }

  // Evaluates all the script fields using the given evaluator.  If no evaluator
  // is given, then scripts must not be present (or else we'll throw an error).
  // NOTE: the evaluator may be mutated, so it is recommended to run with a new
  // evaluator.
  generate(generator: G, evaluator: Evaluator, defaultOption?: M): M {
    const gen = (generator || {}) as Record<string, unknown>;
    // TODO - {} or this.empty()?  - if former then we need to init() fields.
    const msg = new this.messageCtor() as Record<string, unknown>;
    // First, look for `scripts` and `presets` fields.
    const scriptsField = this.fieldsByCanonicalizedName.get('scripts');
    const presetsField = this.fieldsByCanonicalizedName.get('presets');
    if (scriptsField && Array.isArray(gen.scripts)) {
      for (const script of gen.scripts) {
        evaluator.evaluate(script, scriptsField);
      }
    }
    if (presetsField && Array.isArray(gen.presets)) {
      for (let preset of gen.presets) {
        evaluator.addPreset(preset);
      }
    }
    // Groups are the last thing we handle before ordinary fields.
    const grouped = new Set<string>();
    for (const [control, ...affected] of this.groups) {
      grouped.add(control.name);
      // Apply preset to group control
      let group = evaluator.getPreset(control) ?? control.init();
      group = gen[control.name] ?? group;
      if (group == null) continue;
      if (group instanceof Script) group = evaluator.evaluate(group.script, control);
      if (!group) continue;
      // This group is enabled - set the fields
      for (const field of affected) {
        grouped.add(field.name);
        let value = field.group![1];
        if (value instanceof Script) value = evaluator.evaluate(value.script, field);
        msg[field.name] = value;
      }
    }
    // Evaluation an "options" field early if it's found.
    // This allows using it as a default for same-named other children.
    const optsField = this.fieldsByCanonicalizedName.get('options');
    if  (optsField && !defaultOption) {
      // set defaultOption.
      if (!(optsField.type instanceof MessageType)) throw new Error('bad options field');
      if (optsField.isRepeated() || optsField.isMap()) throw new Error('bad options field');
      const value = gen[optsField.name];
      defaultOption = msg[optsField.name] = optsField.type.generate(value, evaluator.newEvaluator());
    }

    // Next, iterate over ordinary fields and evaluate as needed.
    // If not present, fall back on default/preset.
    for (const field of this.fieldsById.values()) {
      if (grouped.has(field.name)) continue; // groups already handled.
      if (field.name === 'options') continue; // already handled options.
      const defaultChild = defaultOption?.[field.name as keyof M];
      msg[field.name] = evaluator.getPreset(field) ?? field.init();
      // Skip scripts and presets since we already handled them
      if (field.name === 'scripts' || field.name === 'presets') continue;
      // Look for scripts, recurse into child messages
      if (field.isRepeated()) {
        const values = gen[field.name];
        if (values == null) continue;
        if (!Array.isArray(values)) throw new Error(`bad value`);
        for (let value of values) {
          if (value instanceof Script) value = evaluator.evaluate(value.script, field);
          if (field.type instanceof MessageType) {
            value = field.type.generate(value, evaluator);
          }
          if (value == null) continue;
          (msg[field.name] as unknown[]).push(value);
        }
      } else if (field.isMap()) {
        const map = gen[field.name];
        if (map == null) continue;
        if (!(map instanceof Map)) throw new Error(`bad value`);
        for (let [key, value] of map) {
          if (key instanceof Script) key = evaluator.evaluate(key.script, field);
          if (value instanceof Script) value = evaluator.evaluate(value.script, field);
          const valueType = (field.type as MapEntryType<unknown, unknown>).valueType;
          if (value && (valueType instanceof MessageType)) {
            value = valueType.generate(value, evaluator);
          }
          if (key == null || value == null) continue;
          (msg[field.name] as Map<unknown, unknown>).set(key, value);
        }
      } else { // singular
        let value: unknown = gen[field.name] ?? defaultChild;
        if (field.type instanceof MessageType) value = field.type.generate(value, evaluator, defaultChild);
        if (value instanceof Script) value = evaluator.evaluate(value.script, field);
        if (value != null) msg[field.name] = value;
      }
    }

    return msg as M;
  }
}

function isType(obj: unknown): obj is Type<any> {
  return obj instanceof MessageType || obj instanceof EnumType;
}

function resolveType(parent: Namespace, name: string, options: FieldOptions): Type<any> {
  // First check for primitive types.
  const prim = PRIMITIVES.get(name);
  if (prim) {
    if (prim instanceof NumberType && options.range) return prim.withRange(options.range);
    return prim;
  }

  // Now check for qualified names.
  const parts = name.split('.');
  let result: Namespace|undefined = parent.resolve(parts[0]);

  // If there are additional parts, they must be direct children.
  for (const part of parts.slice(1)) {
    if (!(result instanceof MessageType)) throw new Error(`not a namespace`);
    result = result.nested.get(part);
    if (!result) throw new Error(`unknown type: ${name}`);
  }
  if (!isType(result)) throw new Error(`not a type: ${name}`);
  return result;
}

class MapEntryType<K, V> implements Type<readonly [K, V]> {
  readonly scriptable = false;
  readonly name: string;
  constructor(readonly keyType: Type<K>, readonly valueType: Type<V>) {
    this.name = `map<${keyType.name}, ${valueType.name}>`;
  }
  fromRecord(rec: ProtoRecord): [K, V] {
    if (rec.type !== RecordType.LEN) throw new Error(`unexpected type`);
    const records = deserializeRecords(rec.data);
    const result = [];
    for (const rec of records) {
      if (rec.id === 1) {
        result[0] = this.keyType.fromRecord(rec);
      } else if (rec.id === 2) {
        result[1] = this.valueType.fromRecord(rec);
      }
    }
    if (result[0] == null) throw new Error(`missing key`);
    if (result[1] == null) throw new Error(`missing value`);
    return result as [K, V];
  }
  toRecord(id: number, val: readonly [K, V]): ProtoRecord {
    const records = [
      this.keyType.toRecord(1, val[0]),
      this.valueType.toRecord(2, val[1]),
    ];
    return {id, data: serializeRecords(records), type: RecordType.LEN};
  }
  fromJson(json: unknown): [K, V] {
    // NOTE: This isn't how we expect to use this?
    if (!Array.isArray(json)) throw new Error(`bad map entry`);
    if (json.length !== 2) throw new Error(`bad map entry`);
    return [this.keyType.fromJson(json[0]), this.valueType.fromJson(json[1])];
  }
  toJson(val: readonly [K, V]): [unknown, unknown] {
    return [this.keyType.toJson(val[0]), this.valueType.toJson(val[1])];
  }
}

export class EnumType implements Type<number> {
  readonly scriptable = true;
  private readonly valuesByCanonicalName: ReadonlyMap<string, EnumValue>;
  private readonly valuesById: ReadonlyMap<number, EnumValue>;
  readonly values: readonly EnumValue[];
  constructor(
    readonly name: string,
    readonly obj: EnumJson,
    values: Record<string, number>,
    readonly parent: Namespace,
  ) {
    (parent.nested as Map<string, unknown>).set(name, this);
    const byName = new Map<string, EnumValue>();
    const byId = new Map<number, EnumValue>();
    const list: EnumValue[] = [];

    for (const [name, id] of Object.entries(values)) {
      const comment = obj.comments?.[id] || '';
      const options = obj.valuesOptions?.[id] || {};
      const value = new EnumValue(name, id, comment, enumValueOptionsFromJson(options as any));
      for (const alias of [name, ...value.aliases]) {
        const canonical = canonicalize(alias);
        if (byName.has(canonical)) {
          throw new Error(`duplicate alias: ${alias}`);
        }
        byName.set(canonical, value);
      }
      byId.set(id, value);
      list.push(value);
    }

    this.valuesByCanonicalName = byName;
    this.valuesById = byId;
    this.values = list;
  }

  fromRecord(rec: ProtoRecord): number {
    if (rec.type !== RecordType.VARINT) throw new Error(`unexpected type for ${this.name}: ${rec.type}`);
    // TODO - any further validation?
    return rec.data;
  }
  toRecord(id: number, val: number): ProtoRecord {
    return {id, data: val, type: RecordType.VARINT};
  }
  fromJson(json: unknown): number {
    // NOTE: allow both string and number
    if (typeof json === 'number') return json; // TODO - validate??
    if (typeof json !== 'string') throw new Error(`bad enum value`);
    if (/^\d+$/.test(json)) return Number(json);
    const canonical = canonicalize(json);
    const value = this.valuesByCanonicalName.get(canonical);
    if (value == null) throw new Error(`unknown enum value: ${json}`);
    return value.value;
  }
  toJson(val: number): unknown {
    const value = this.valuesById.get(val);
    if (!value) throw new Error(`unknown enum value: ${val}`);
    return value.name;
  }
  pick(rand: () => number): number {
    return this.values[Math.floor(rand() * this.values.length)].value;
  }
}
class EnumValue {
  readonly aliases: readonly string[];
  // TODO - any other options?

  constructor(
    readonly name: string,
    readonly value: number,
    readonly comment: string,
    readonly options: EnumValueOptions,
  ) {
    this.aliases = options.alias || [];
  }
}

// NOTE: T is a single entry, U is the plural/nullable type.
export abstract class FieldInfo<T, U> {
  readonly id: number;
  readonly range?: [number, number];
  readonly options: FieldOptions;

  // NOTE: the Type object is initialized lazily (via the getter) to
  // ensure it's fully initialized.
  private _type?: Type<T> = undefined;
  protected readonly typeName: string;
  protected readonly keyTypeName?: string;

  // NOTE: also lazily evaluated
  private _group?: [number, U|Script]|null = undefined;
  private _presets?: Record<number, U|Script> = undefined;
  private _default?: U|Script|null = undefined;

  protected constructor(
    readonly name: string,
    obj: FieldJson,
    readonly parent: MessageType<any, any>,
  ) {
    const options = this.options = fieldOptionsFromJson((obj.options || {}) as any);
    this.id = obj.id;
    this.range = options.range;
    this.typeName = obj.type;
    this.keyTypeName = obj.keyType;
  }

  static of(name: string, obj: FieldJson, parent: MessageType<any, any>): FieldInfo<any, any> {
    if (obj.rule === 'repeated') {
      return new RepeatedFieldInfo(name, obj, parent);
    } else if (obj.keyType) {
      return new MapFieldInfo(name, obj, parent);
    } else {
      return new SingularFieldInfo(name, obj, parent);
    }
  }

  get type(): Type<T> {
    return this._type ?? (this._type = this.makeType());
  }

  get group(): [number, U|Script]|null {
    if (this._group === undefined) {
      this._group = this.options.group ?
        [this.options.group[0], this.fromJson(this.options.group[1])] : null;
    }
    return this._group;
  }

  get preset(): Record<number, U|Script> {
    if (this._presets === undefined) {
      this._presets = {};
      for (const [k, v] of Object.entries(this.options.preset || {})) {
        if (this.isScriptable() && typeof v === 'string' && v[0] === '=') {
          this._presets[k as any] = new Script(v.substring(1));
        } else {
          this._presets[k as any] = this.fromJson(v);
        }
        const camel = this.parent.presetMap.get(Number(k));
        if (camel == null) continue; // TODO - fail fast?
        this._presets[camel as any] = this._presets[k as any];
      }
    }
    return this._presets;
  }

  get default(): U|Script|null {
    if (this._default !== undefined) return this._default;
    const d = this.options.default;
    if (d == null) {
      return this._default = null;
    }
    if (this.isScriptable() && typeof d === 'string' && d[0] === '=') {
      return this._default = new Script(d.substring(1));
    }
    return this._default = this.fromJson(d);
  }

  isScriptable(): boolean {
    return this.type.scriptable &&
      !this.options.unscriptable;
  }

  // Returns true if the field type is scriptable _and_ if the proto record is a
  // string that starts with '='.  Randomizable fields include
  // numerics, booleans, and enums, and not strings or messages.
  isScriptRecord(r: ProtoRecord): r is ProtoLenRecord & {__IS_SCRIPT__: true} {
    return this.isScriptable() &&
      r.type === RecordType.LEN &&
      r.data[0] === 0x3d;
  }

  isScriptJson(x: unknown): x is `={string}` & {__IS_SCRIPT__: true} {
    return this.isScriptable() &&
      typeof x === 'string' &&
      x[0] === '=';
  }

  isRepeated() { return false; }
  isMap() { return false; }

  pick(rand: () => number): T {
    if (!this.isScriptable()) throw new Error(`not scriptable`);
    if (!this.type.pick) throw new Error(`=? not allowed on ${this.name}`);
    return this.type.pick(rand);
  }

  protected abstract makeType(): Type<T>;
  abstract init(): U;
  abstract append(prev: U, next: T): U;
  abstract entries(value: U): Iterable<T>;
  abstract fromJson(json: unknown): U;
  abstract toJson(value: U): unknown;
}

class SingularFieldInfo<T> extends FieldInfo<T, T|null> {
  protected makeType(): Type<T> {
    return resolveType(this.parent, this.typeName, this.options);
  }
  init(): T|null {
    return null;
  }
  append(_prev: T|null, next: T): T {
    return next;
  }
  entries(value: T|null): Iterable<T> {
    return value != null ? [value] : [];
  }
  fromJson(json: unknown): T|null {
    return this.type.fromJson(json);
  }
  toJson(value: T|null): unknown {
    return value != null ? this.type.toJson(value) : undefined;
  }
}

class RepeatedFieldInfo<T> extends FieldInfo<T, T[]> {
  protected makeType(): Type<T> {
    return resolveType(this.parent, this.typeName, this.options);
  }
  init(): T[] {
    return [];
  }
  append(prev: T[], next: T): T[] {
    prev.push(next);
    return prev;
  }
  entries(value: T[]): Iterable<T> {
    return value ?? [];
  }
  fromJson(json: unknown): T[] {
    if (json == null) return [];
    if (!Array.isArray(json)) json = [json];
    return (json as unknown[]).map(x => this.type.fromJson(x));
  }
  toJson(value: T[]): unknown {
    if (!value?.length) return undefined;
    return value.map(x => this.type.toJson(x));
  }
  isRepeated() { return true; }
}

class MapFieldInfo<K, V> extends FieldInfo<readonly [K, V], Map<K, V>> {
  protected makeType(): Type<readonly [K, V]> {
    if (!this.keyTypeName) throw new Error(`missing key type`);
    return new MapEntryType(
      resolveType(this.parent, this.keyTypeName, {}),
      resolveType(this.parent, this.typeName, this.options),
    );
  }
  init(): Map<K, V> {
    return new Map();
  }
  append(prev: Map<K, V>, next: readonly [K, V]): Map<K, V> {
    prev.set(...next);
    return prev;
  }
  entries(value: Map<K, V>): Iterable<readonly [K, V]> {
    return value?.entries() ?? [];
  }
  fromJson(json: unknown): Map<K, V> {
    if (json == null) return new Map();
    if (typeof json !== 'object') throw new Error(`bad map`);
    const entries = Array.isArray(json) ? json : Object.entries(json);
    return new Map(entries.map(entry => this.type.fromJson(entry)));
  }
  toJson(value: Map<K, V>): unknown {
    if (!value?.size) return undefined;
    const obj: Record<string, unknown> = {};
    for (const entry of value.entries()) {
      const [k, v] = this.type.toJson(entry) as any;
      obj[k] = v;
    }
    return obj;
  }
  isMap() { return true; }
  isScriptable() { return false; }
}

abstract class NumberType implements Type<number> {
  abstract readonly name: string;
  readonly scriptable = true;
  protected abstract readonly recordType: RecordType.VARINT|RecordType.I32;

  constructor(readonly range: readonly [number, number]) {}

  clamp(value: number): number {
    return Math.max(this.range[0], Math.min(value, this.range[1]));
  }

  fromRecord(rec: ProtoRecord): number {
    if (rec.type !== this.recordType) throw new Error(`unexpected type`);
    return this.clamp(rec.data);
  }

  toRecord(id: number, data: number): ProtoRecord {
    return {id, data: this.clamp(data), type: this.recordType};
  }

  fromJson(json: unknown): number {
    const n = Number(json);
    if (isNaN(n)) throw new Error(`bad number`);
    return this.clamp(n);
  }

  toJson(val: number): number {
    return val;
  }

  withRange(range: readonly [number, number]): this {
    return new (this as any).constructor([this.clamp(range[0]), this.clamp(range[1])]);
  }

  abstract pick(rand: () => number): number;
}

class Uint32Type extends NumberType {
  readonly name: string = 'uint32';
  protected readonly recordType = RecordType.VARINT;

  constructor(range: readonly [number, number] = [0, 0xFFFFFFFF]) { super(range); }

  clamp(value: number): number {
    return super.clamp(Math.round(value));
  }

  pick(rand: () => number): number {
    if (!Number.isFinite(this.range[0]) || !Number.isFinite(this.range[1])) {
      throw new Error(`=? not allowed without range`);
    }
    const x = rand();
    return Math.floor((this.range[1] + 1) * x + this.range[0] * (1 - x));
  }
}

class Int32Type extends Uint32Type {
  readonly name: string = 'int32';
  constructor(range: readonly [number, number] = [-0x80000000, 0x7FFFFFFF]) { super(range); }

  fromRecord(rec: ProtoRecord): number {
    const n = super.fromRecord(rec);
    return n % 2 ? (1 - n) / 2 : n / 2;
  }

  toRecord(id: number, val: number): ProtoRecord {
    return super.toRecord(id, 2 * Math.abs(val) + Number(val < 0));
  }
}

class FloatType extends NumberType {
  readonly name: string = 'float';
  protected readonly recordType = RecordType.I32;

  constructor(range: readonly [number, number] = [-Infinity, Infinity]) { super(range); }

  pick(rand: () => number): number {
    if (!Number.isFinite(this.range[0]) || !Number.isFinite(this.range[1])) {
      throw new Error(`=? not allowed without range`);
    }
    const x = rand();
    return this.range[1] * x + this.range[0] * (1 - x);
  }
}

const BOOL: Type<boolean> = {
  name: 'bool',
  scriptable: true,
  fromRecord(rec: ProtoRecord): boolean {
    if (rec.type !== RecordType.VARINT) throw new Error(`unexpected type`);
    return Boolean(rec.data);
  },
  toRecord(id: number, val: boolean): ProtoRecord {
    return {id, data: val ? 1 : 0, type: RecordType.VARINT};
  },
  fromJson(json: unknown): boolean {
    if (typeof json === 'boolean') return json;
    if (typeof json === 'string') json = json.toLowerCase();
    if (json === 'true') return true;
    if (json === 'false') return false;
    throw new Error(`bad boolean: ${json}`);
  },
  toJson(val: boolean): unknown {
    return val;
  },
  pick(rand: () => number): boolean {
    return rand() < 0.5;
  }
};

const STRING: Type<string> = {
  name: 'string',
  scriptable: true,
  fromRecord(rec: ProtoRecord): string {
    if (rec.type !== RecordType.LEN) throw new Error(`unexpected type`);
    return TEXT_DECODER.decode(rec.data);
  },
  toRecord(id: number, val: string): ProtoRecord {
    return {id, data: TEXT_ENCODER.encode(val), type: RecordType.LEN};
  },
  fromJson(json: unknown): string {
    return String(json);
  },
  toJson(val: string): unknown {
    return val;
  },
};

const PRIMITIVES = new Map<string, Type<any>>([
  ['uint32', new Uint32Type()],
  ['int32', new Int32Type()],
  ['bool', BOOL],
  ['float', new FloatType()],
  ['string', STRING],
] satisfies Array<readonly [string, Type<any>]>);


export type Val = number|string|boolean;

export interface Evaluator {
  /** Evaluates the given script and returns the result. */
  evaluate(script: string, field: FieldInfo<any, any>): unknown;
  /** Adds a preset to the evaluator, or does nothing if null. */
  addPreset(name: number|null): void;
  getPreset(field: FieldInfo<any, any>): unknown;
  /**
   * Makes a new evaluator, with a separate/unrelated script environment,
   * and a decoupled random seed.
   */
  newEvaluator(): Evaluator;
}

export class SimplePresetEvaluator implements Evaluator {
  constructor(readonly presetDescriptor: EnumType) {}
  private readonly presets: (string|number)[] = [];
  evaluate(_script: string, _field?: FieldInfo<any, any>): Val {
    // NOTE: this should be overridden
    throw new Error(`scripts not allowed`);
  }
  addPreset(name: Script|Val|null): void {
    // NOTE: override to handle non-builtin presets?
    if (name instanceof Script) name = this.evaluate(name.script);
    if (typeof name === 'string') {
      try {
        const id = this.presetDescriptor.fromJson(name);
        this.presets.push(id);
        return;
      } catch {}
    } else if (typeof name === 'boolean') {
      throw new Error(`bad preset: ${name}`);
    }
    if (name) this.presets.push(name);
  }
  getPreset(field: FieldInfo<any, any>): unknown {
    for (const p of this.presets) {
      const v = this.getValueForPreset(field, p);
      if (v != null) return v;
    }
    const d = field.options.default;
    if (d != null) return field.fromJson(d);
    return undefined;
  }
  protected getValueForPreset(field: FieldInfo<any, any>, preset: string|number): unknown {
    // NOTE: this should be overridden (but may call super.getValueForPreset)
    if (typeof preset !== 'number') return undefined;
    let v = field.preset[preset];
    if (v instanceof Script) v = this.evaluate(v.script, field);
    return v;
  }
  newEvaluator() {
    return new SimplePresetEvaluator(this.presetDescriptor);
  }
}
