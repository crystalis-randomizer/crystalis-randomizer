let reflecting = false;
const SCHEMA = Symbol('schema');

export class Message {
  readonly [SCHEMA]: MessageSchema;

  toJson(): object {
    const json = {} as Record<string, unknown>;
    for (const [key, spec] of this[SCHEMA].byName) {
      // TODO - what kind of normalization is needed?
      const value = (this as any)[key];
      json[key] = value instanceof Message ? value.toJson() : value;
    }
    return json;
  }

  fromJson(json: object) {
    for (const [key, spec] of this[SCHEMA].byName) {
      
    }

  }
}

export namespace Message {
  export function Base<T extends {new(): unknown}>(ctor: T): MessageCtor<T> {
    let schema: MessageSchema|undefined;
    return class extends Message {
      constructor() {
        this[SCHEMA] = schema || (schema = makeSchema(new ctor());
      }
    }
  }
}

function makeSchema(prototype: object): MessageSchema {
  const byName = new Map<string, FieldSpec>();
  const byIndex = new Map<number, FieldSpec>();
  const seen = new Set<number>();
  for (const [name, {index, spec}] of Object.entries(prototype) as any) {
    if (seen.has(index)) throw new Error(`duplicate ordinal ${index}`);
    byName.set(name, spec);
    byIndex.set(index, spec);
  }
  return {byName, byIndex};
}

interface MessageSchema {
  byName: Map<string, FieldSpec>;
  byIndex: Map<number, FieldSpec>;
}



class Message<T> {
  static [SCHEMA]: MessageSchema;
  constructor() {
    initializeMessage(new.target);
  }

  static fromJson<T>(this: {new(): T}, json: unknown): T {
    // NOTE: would be nice to give warnings on unknown fields?
    // But we might also expect to find such fields across versions?
    const target: T = new this();
    for (const [field, spec] of Object.entries(((this as any)[SCHEMA] as Record<string, Spec>))) {
      target[field as keyof T] =
          spec.fromJson((json as any)[field]) as any;
    }
    return target;
  }

  toJson(): unknown {
    // TODO
    throw '';
  }

  fill(): Filled<T> {
    return null!;
  }

  static fromBinary<T extends Message<any>>(buf: ArrayBuffer): Unwrap<T> {
    const m = new this();
    // TODO - merge
    return m as Unwrap<T>;
  }

  // // Merges into `this` and returns itself
  // mergeBinary(bin: ArrayBuffer): T;
  // mergeJson(json: unknown): T;
  // merge(message: T): T;
}

export namespace Message {
  type MessageClass<T> = never;
  export function Base<T>(spec: T): MessageClass<T> {

  }

}


class Foo extends Message.Base(class {
  foo = u8.at(1);
  bar = str.at(2);
  baz = bool.at(3);
  // allows yaml parser to accept human-readable names
  qux = u8.at(4, {enum: CheckName});
}) {}

class CheckName extends Message.Enum(class {
  // automatic lowercase and underscore-to-space ....?
  LEAF_ELDER = 1;
  BAR = 2;
  BAZ = 3;
}) {}

type Filled<T> = T extends Message<T> ?
  Flatten<WithOptional<{[K in keyof T]-?: NonNullable<T[K]> extends {default: {}} ? NonNullable<T[K]> : T[K]}>>

interface Spec {
  fromJson(arg: unknown): unknown
}

interface FieldSpec {
  // TODO - ???
  

}

