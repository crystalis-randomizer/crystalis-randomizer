// Node utility to parse the config.proto file (via npm:protobufjs) and emit a
// typescript file w/ classes and descriptors.

import { Enum, FieldBase, MapField, ReflectionObject, Root, Type } from 'protobufjs';
import { FieldOptions, canonicalize, enumValueOptionsToJson, fieldOptionsToJson, toCamelCase } from '../config/options';

const root: Root = await new Root().load('/dev/stdin', {
  alternateCommentMode: true,
  keepCase: false,
  preferTrailingComment: false,
});

const OMIT_FIELDS = new Set(['oneofs', 'proto3_optional']);

// Define internal representations of messages and enums.
// We do not nest messages directly, but rather have a single
// pair of maps whose keys aer qualified names.
abstract class TypeInfo {
  readonly qualifiedName: string;
  readonly typeName: string;
  constructor(
    readonly name: string,
    readonly parent: MessageInfo|null,
    typeName?: string,
  ) {
    this.qualifiedName = (parent ? parent.qualifiedName + '.' : '') + name;
    this.typeName = typeName ?? this.qualifiedName;
  }

  // Inspect fields, comments, etc.
  resolve() {}
}

class PrimitiveInfo extends TypeInfo {
  constructor(name: string, typeName: string) { super(name, null, typeName); }
}

class MessageInfo extends TypeInfo {
  readonly fields = new Map<string, FieldInfo>();
  constructor(
    readonly obj: Type,
    readonly parent: MessageInfo|null,
  ) {
    super(obj.name, parent);
  }

  resolve() {
    for (const f of this.obj.fieldsArray) {
      this.fields.set(f.name, new FieldInfo(f, this));
    }
  }
}

class EnumInfo extends TypeInfo {
  constructor(
    readonly obj: Enum,
    readonly parent: MessageInfo|null,
  ) {
    super(obj.name, parent);
  }
}

// NOTE: fields are not types
class FieldInfo {
  readonly name: string;
  readonly index: number;
  readonly repeated: boolean;
  readonly keyType: TypeInfo|null; // for map fields
  readonly type: TypeInfo;
  // TODO - options (range, presets, default), comments.
  // TODO - can we just serialize all the infos and use those instead of descriptors???

  constructor(
    readonly obj: FieldBase,
    readonly parent: MessageInfo,
  ) {
    this.name = obj.name;
    this.index = obj.id;
    this.repeated = obj.repeated;

    const type = obj.resolvedType ? typesByObj.get(obj.resolvedType) : types.get(obj.type);
    if (!type) throw new Error(`unresolved type: ${obj.type}`);
    this.type = type;

    if (obj.map) {
      const keyTypeName = (obj as MapField).keyType;
      const keyType = types.get(obj.options?.['(key)'] ?? keyTypeName);
      if (!keyType) throw new Error(`unresolved key type: ${keyTypeName}`);
      this.keyType = keyType;
    } else {
      this.keyType = null;
    }

    // TODO - comments, options, etc
  }

  generatorFieldType(): string {
    const t = this.type.typeName;
    const script = this.obj.options?.['(unscriptable)'] ? '' : '|Script';

    if (this.keyType) {
      // map<uint32, int32> foo = 1 [(key) = Bar];  =>  foo = new Map<Bar, number>();
      return `Map<${this.keyType.qualifiedName}, ${t}${script}>`;
    } else if (this.repeated) {
      // repeated Foo bar = 1;  =>  bar: Foo[] = [];
      return `Array<${t}${script}>`;
    } else if (this.type instanceof MessageInfo) {
      // Singular message fields are always present but may be empty.
      return `${t}Generator|null`;
    } else {
      // singular primitive field
      return `${t}${script}|null`;
    }

  }

  generatorField(): string {
    const n = this.name;
    return `declare ${n}?: ${this.generatorFieldType()};`;
  }

  messageFieldType(): string {
    const t = this.type.typeName;

    if (this.keyType) {
      // map<uint32, int32> foo = 1 [(key) = Bar];  =>  foo = new Map<Bar, number>();
      return `ReadonlyMap<${this.keyType.qualifiedName}, ${t}>`;
    } else if (this.repeated) {
      // repeated Foo bar = 1;  =>  bar: Foo[] = [];
      return `readonly ${t}[]`;
    } else if (this.type instanceof MessageInfo) {
      // Singular message fields are always present but may be empty.
      return t;
    } else {
      // NOTE: how to use default?
      // should we do a get/has/set-type emit here???
      return `${t}|null`;
    }
  }
  
  messageField(): string {
    // TODO - where does generator come in?  maybe non-generator version is immutable,
    // but we use generator as a sort of builder with randomizability???
    const lines = [];
    if (this.obj.options?.['(generator_only)']) return '';
    const n = this.name;
    const t = this.messageFieldType();
    const g = this.generatorFieldType();
    lines.push(`declare readonly ${n}: ${t};`);
    const body = [];
    if (this.obj.options?.['(default)'] != null) body.push(`default: ${t}`);
    const presetBody = [];
    for (let key of Object.keys(this.obj.options || {})) {
      const match = /\(preset.(\w+)\)/.exec(key);
      if (!match) continue;
      const preset = presets.get(canonicalize(match[1]))?.name.toLowerCase();
      if (preset == null) throw new Error(`no preset: ${match[1]}`);
      presetBody.push(`${toCamelCase(preset)}: ${g}`);
    }
    if (presetBody.length) body.push(`preset: ${formatObj(presetBody)},`);
    if (body.length) lines.push(`declare static readonly ${n}: ${formatObj(body)};`);
    return lines.join('\n');
  }

}

function formatObj(body: string[]): string {
  return `{${body.length < 2 ?
      body.join('') :
      `\n  ${body.map(x => x.replace(/\n/g, '\n  ')).join(',\n  ')}\n`
  }}`;
}


const types = new Map<string, TypeInfo>();
const typesByObj = new Map<ReflectionObject, TypeInfo>();

types.set('uint32', new PrimitiveInfo('uint32', 'number'));
types.set('int32', new PrimitiveInfo('int32', 'number'));
types.set('float', new PrimitiveInfo('float', 'number'));
types.set('string', new PrimitiveInfo('string', 'string'));
types.set('bool', new PrimitiveInfo('bool', 'boolean'));

const presets = new Map<string, {name: string, id: number}>();

// Iterate over elements and add them to the message and enum maps.
function ingest(parent: MessageInfo|null, obj: ReflectionObject) {
  obj.resolve();
  if (obj instanceof Type) {
    for (const f of obj.fieldsArray) {
      f.resolve();
      if (f.options) f.options.resolvedType = f.resolvedType;
    }
    const m = new MessageInfo(obj, parent);
    types.set(m.qualifiedName, m);
    typesByObj.set(obj, m);
    // Recurse into nested props
    for (const child of obj.nestedArray) {
      ingest(m, child);
    }
  } else if (obj instanceof Enum) {
    if (obj.name === 'Preset') {
      for (const [name, id] of Object.entries(obj.values)) {
        presets.set(canonicalize(name), {name, id: id as number});
      }
    }
    const e = new EnumInfo(obj, parent);
    types.set(e.qualifiedName, e);
    typesByObj.set(obj, e);
  }
}

for (const elem of root.nestedArray) {
  ingest(null, elem);
}

for (const info of types.values()) {
  info.resolve();
}

// Emit TypeScript output
class Writer {
  private currentNamespace: string[] = [];
  private indentLevel = '';

  emit(s: string) { console.log(this.indentLevel + s.replace(/\n+/g, '$&' + this.indentLevel)); }
  indent(s?: string) {
    if (s) this.emit(s);
    this.indentLevel += '  ';
  }
  dedent(s?: string) {
    this.indentLevel = this.indentLevel.substring(2);
    if (s) this.emit(s);
  }

  emitImport(module: string, names: string[]) {
    this.emit(`import { ${names.join(', ')} } from '${module}';`);
  }

  enterNamespace(namespace: string) {
    const parts = namespace ? namespace.split('.') : [];
    let i = 0;
    for (; i < Math.min(parts.length, this.currentNamespace.length); i++) {
      if (this.currentNamespace[i] !== parts[i]) {
        if (parts[i] !== this.currentNamespace[i]) break;
      }
    }
    while (this.currentNamespace.length > i) {
      this.dedent();
      this.emit('}');
      this.currentNamespace.pop();
    }
    for (; i < parts.length; i++) {
      this.emit(`export namespace ${parts[i]} {`);
      this.indent();
      this.currentNamespace.push(parts[i]);
    }
  }

  emitType(info: TypeInfo) {
    if (info instanceof MessageInfo) {
      this.emitMessage(info);
    } else if (info instanceof EnumInfo) {
      this.emitEnum(info);
    } else if (!(info instanceof PrimitiveInfo)) {
      throw new Error(`unknown type: ${info}`);
    }
  }
  emitMessage(info: MessageInfo) {
    const lastDot = info.qualifiedName.lastIndexOf('.');
    const namespace = info.qualifiedName.substring(0, lastDot);
    const m = info.name; // this is just basename????
    const g = `${m}Generator`;
    this.enterNamespace(namespace);

    this.indent(`export class ${m} extends MessageBase<${m}, ${g}> {`);
    {
      this.emit(`declare static readonly descriptor: MessageType<${m}, ${g}>;`);
      for (const field of info.fields.values()) {
        const msg = field.messageField();
        if (msg) this.emit(msg);
      }
    }
    this.dedent('}');

    // emit generator
    this.emit(`export class ${g} extends GeneratorBase<${m}, ${g}> {`);
    this.indent();
    {
      // emit fields
      for (const field of info.fields.values()) {
        const msg = field.generatorField();
        if (msg) this.emit(msg);
      }
    }
    this.dedent('}');

    // emit descriptor JSON
    const descriptor = JSON.stringify(
      info.obj.toJSON({keepComments: true}),
      (k, v) => {
        if (OMIT_FIELDS.has(k) || k === 'nested' || v == null) return undefined;
        if (k === 'options') return transformFieldOptions(v, info.fields);
        return v;
      },
      2);
    const parent = namespace ? `${namespace}.descriptor` : 'root';
    this.emit(`${m}.init(new MessageType<${m}, ${g}>('${m}', ${descriptor}, ${m}, ${g}, ${parent}));`);
  }

  emitEnum(info: EnumInfo) {
    const lastDot = info.qualifiedName.lastIndexOf('.');
    const namespace = info.qualifiedName.substring(0, lastDot);
    const basename = info.qualifiedName.substring(lastDot + 1);
    this.enterNamespace(namespace);
    // First emit the type for each element.
    this.emit(`namespace ElementOf {`);
    this.emit(`  export type ${basename}<N extends number> = N&{readonly ${basename}: unique symbol};`);
    this.emit(`}`);
    // Note that this transformation clobbers any same-value elements,
    // so we should avoid those.
    const descriptor = JSON.stringify(
      info.obj.toJSON({keepComments: true}),
      (k, v) => {
        if (k === 'values' || v == null) return undefined;
        if (typeof v === 'object' && !Array.isArray(v)) {
          const o: Record<string|number, unknown> = {};
          let k1: string|number, v1: unknown;
          for ([k1, v1] of Object.entries(v)) {
            // Don't transform numbers to strings
            if (k1 !== String(Number(k1))) k1 = info.obj.values[k1] ?? k1;
            // NOTE: k is outer key
            if (k === 'valuesOptions' && v1 && typeof v1 === 'object') {
              v1 = transformEnumOptions(v1 as any);
            }
            o[k1] = v1;
          }
          return o;
        }
        return v;
      },
      2);
    // Then emit the enum itself in a defineEnum call.
    this.emit(`export const ${basename} = defineEnum({`);
    this.indent();
    for (const [name, value] of Object.entries(info.obj.values)) {
      this.emit(`${name}: ${value} as ElementOf.${basename}<${value}>,`);
    }
    this.dedent();
    const parent = namespace ? `${namespace}.descriptor` : 'root';
    this.emit(`}, ${descriptor}, '${basename}', ${parent});`);
    // Finally emit the type alias for the enum.
    this.emit(`export type ${basename} = EnumOf<typeof ${basename}>;`);
  }
}

const writer = new Writer();
writer.emitImport(
  '../../src/js/config/runtime',
  ['EnumOf', 'GeneratorBase', 'MessageBase', 'MessageType', 'Namespace', 'Script', 'defineEnum']);

// Export preset id-to-name map separately, since descriptor ctor needs access to them.
writer.indent(`\nconst presetsById = new Map<number, string>([`);
{
  for (const {name, id} of presets.values()) {
    writer.emit(`[${id}, '${toCamelCase(name)}'],`);
  }
}
writer.dedent(']);');
// Make a root namespace to be the parent of all the top-level names.
writer.emit(`\nconst root = new Namespace('root', null, presetsById);`);

for (const name of [...types.keys()].sort()) {
  writer.emitType(types.get(name)!);
}
writer.enterNamespace('');

// TODO - if k === 'comment' or if we're in an enum comments object,
// then rewrite value to remove `// .*\n` and to join lines, remove
// excess extra spaces, etc...?

// This eliminates all the `{comments: {key1: null, key2: null}}` as well
// as the unnecessary 'oneofs' fields that get inserted even though we
// don't actually _use_ the oneof feature.

////////////////////

function transformFieldOptions(
  opts: Record<string, unknown>,
  fields: Map<string, FieldInfo>,
): object|undefined {
  if (opts.id && opts.type) return opts; // NOTE: Config.options field.
  const resolvedType = opts.resolvedType;
  const o: Record<string, unknown> = {};
  let min: number|undefined, max: number|undefined;
  for (let [k, v] of Object.entries(opts)) {
    if (k === 'proto3_optional' || k === 'resolvedType') continue;
    if (k === '(type)') continue;
    if (k[0] !== '(' || k[k.length - 1] !== ')') throw new Error(`bad option: ${k}=${v}`);
    k = k.substring(1, k.length - 1);

    // Map enum names
    if (
      /^(preset\.|group\.|default$)/.test(k)
        && resolvedType instanceof Enum
        && typeof v === 'string'
        && !v.startsWith('=')
    ) {
      const v1 = (resolvedType as Enum).values[v];
      if (v1 == null) throw new Error(`unknown enum value: ${k} = ${v}`);
      v = v1;
    }

    if (k.startsWith('preset.')) {
      const obj = (o.preset ?? (o.preset = {})) as Record<string, unknown>;
      const preset = presets.get(canonicalize(k.substring(7)))?.id;
      if (preset == null) throw new Error(`unknown preset: ${k}`);
      obj[preset] = v;
    } else if (k.startsWith('group.')) {
      if (o.group != null) throw new Error(`duplicate group`);
      const name = k.substring(6).replace(/_(.)/g, (_, a) => a.toUpperCase());
      const group = fields.get(name);
      if (group == null) throw new Error(`unknown group field: ${k}`);
      o.group = [group.index, v];
    } else if (k === 'default') {
      o.default = v;
    } else if (k === 'key') {
      // NOTE: would be nice to reference something directly here
      o.key = v;
    } else if (k === 'alias') {
      o.alias = String(v).split(',').map(x => x.trim()).filter(x => x);
    } else if (k === 'generator_only') {
      o.generatorOnly = v;
    } else if (k === 'unscriptable') {
      o.unscriptable = v;
    } else if (k === 'hidden') {
      o.hidden = v;
    } else if (k === 'min') {
      min = Number(v);
    } else if (k === 'max') {
      max = Number(v);
    } else {
      throw new Error(`unknown field option: ${k}`);
    }
  }
  if (min != null || max != null) {
    if (min == null || max == null) throw new Error(`missing min/max`);
    o.range = [min, max];
  }
  return fieldOptionsToJson(o as FieldOptions);
}

function transformEnumOptions(orig: Record<number, unknown>): object|undefined {
  const o: Record<string, unknown> = {};
  for (let [k, v] of Object.entries(orig)) {
    if (k[0] !== '(' || k[k.length - 1] !== ')') throw new Error(`bad option`);
    k = k.substring(1, k.length - 1);
    if (k === 'alias') {
      o.alias = String(v).split(',').map(x => x.trim()).filter(x => x);
    } else {
      throw new Error(`unknown enum option: ${k}`);
    }
  }
  return enumValueOptionsToJson(o);
}
