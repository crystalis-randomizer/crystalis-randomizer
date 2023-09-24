// Defines a schema.
// This is similar to a protobuf or cap'n proto, but we have
// some more specific requirements that aren't met by any
// existing tools:
//  1. booleans with proper defaults, so that we can keep the
//     options both sparse and natural.
//  2. packed binary format for bitfields.
//  3. yaml/json and binary representations.
//  4. custom short-string format...? (may not do that here)

type Json = JsonObject|JsonArray|string|number|boolean|null;
type JsonObject = {[key: string]: Json};
type JsonArray = Json[];


class Config extends Message.Base(class {
  foo = u8.at(1);
}) {}


type DeepPartial<T> =
    T extends string|number|boolean|null|undefined|any[] ? T :
    T extends Record<any, any> ?
        {[K in keyof T]?: DeepPartial<T[K]>} :
    never;

interface MessageSchema<M> {
  toBinary(message: DeepPartial<M>): Uint8Array;
  toJson(message: DeepPartial<M>): Json;
  fromBinary(buf: Uint8Array): DeepPartial<M>;
  fromJson(arg: unknown): DeepPartial<M>;
  trim(message: DeepPartial<M>): DeepPartial<M>;
  fill(message: DeepPartial<M>): M;
  merge(...message: DeepPartial<M>[]): DeepPartial<M>;
}

type MessageSpecifier = {[key: string]: FieldSpecifier<any>}
interface FieldSpecifier<T> {
  fromBit(bit: boolean): T;
  fromBytes(bytes: ArrayLike<number>): T;
  toBinary(value: T): boolean|Uint8Array;
  ordinal: number;
  default?: T;
}

type Flatten<T> = T extends object ? {[K in keyof T]: T[K]} : T;
type Fields<T> = {
  [K in keyof T]: T[K] extends FieldSpecifier<infer U> ? {
    type: U,
    required: T[K] extends {default: {}} ? true : false,
  } : never;
};
type PickFields<T> = {
  [K in keyof T]: T[K] extends {type: infer U} ? U : never;
}
type RequiredFields<T> = {
  [K in keyof T]: T[K] extends {required: true} ? K : never;
}[keyof T];
type OptionalFields<T> = {
  [K in keyof T]: T[K] extends {required: false} ? K : never;
}[keyof T];

type WithRequiredKeys<T, U = Fields<T>> = Flatten<Partial<PickFields<Pick<U, OptionalFields<U>>>> & PickFields<Pick<U, RequiredFields<U>>>>;

declare function f8(ordinal: number): FieldSpecifier<number>;
declare function f8(ordinal: number, opts: {default: number}): FieldSpecifier<number> & {default: number};
declare function message<T>(ordinal: number, schema: MessageSchema<T>): FieldSpecifier<T>;

declare function struct<T extends MessageSpecifier>(arg: T): MessageSchema<WithRequiredKeys<T>>;

type MessageType<T extends MessageSchema<any>> = T extends MessageSchema<infer M> ? M : never;
// type PartialType<T extends MessageSchema<any, any>> = T extends MessageSchema<infer P, any> ? P : never;

const ItemPlacement

const Items = struct({
  placement: message(1, ItemPlacement),
});

// export const Config = struct(() => ({
//   items: message(1, struct({foo: f8(1)})),
//   bar: f8(2, {default: 1.4}),
// }));
// export type Config = MessageType<typeof Config>;

export const Field = 1;

let reflecting = false;
const SCHEMA = Symbol('schema');

type Unwrap<T> = T extends Message<infer U> ? U : never;

class Message<T> {
  static [SCHEMA]: never;
  constructor() {
    initializeMessage(new.target);
  }

  static fromBinary<T extends Message<any>>(buf: ArrayBuffer): Unwrap<T> {
    const m = new this();
    // TODO - merge
    return m as Unwrap<T>;
  }

  // Merges into `this` and returns itself
  mergeBinary(bin: ArrayBuffer): T;
  mergeJson(json: unknown): T;
  merge(message: T): T;
}

function initializeMessage(ctor: typeof Message) {
  if (ctor[SCHEMA])
}

export class Config extends Message<Config> {
  items     = Config.Items.at(1);
  maps      = Config.Maps.at(2);
  vars      = Config.Vars.at(3);
  pick      = Config.Pick.at(4);
}

export namespace Config {
  export class Items extends Message<Items> {
    placement           = Items.Placement.at(1);
    allow_mezame_mimics = bool.at(2, {default: false});
    mezame_chests       = u8.at(3, {default: 0, range: [0, 2]});
  }

  export namespace Items {
    export class Placement extends Message<Placement> {
      force   = map(CheckName, ItemName).at(1);
      prefer  = repeated(Items).at(2);
    }
  }
}

declare const required: unique symbol;

interface NumericSpec {
  at(index: number, opts: {default: number, range?: [number, number]}): number&{[required]: true}|undefined;
  at(index: number, opts?: {range?: [number, number]}): number|undefined;
}

const u8: NumericSpec = {
  at(index: number, opts: {default?: number, range?: [number, number]}) {
    if (!reflecting) return undefined!;
    return {...opts, index, spec: u8} as any;
  },
};

interface MessageSchema<T> {
  at(index: number): T;

  partial(): DeepPartial<T>;
  fromBinary(buf: ArrayLike<number>): T;
  fromJson(json: unknown): T;
}
interface MessageInstance<T> {
  // props
  toBinary(): Uint8Array;
  toJson(): object;
  fill(): T;
}

let fields: undefined|(index: number, spec: FieldSchema<unknown>) => unknown = undefined;



// This function does some magic to introspect on the
// schema of the message.  It relies on the fact that
// message subclass ctors should do nothing except call
// super() and then initialize properties.
// Message types are expected to ONLY define fields as
// properties, using calls to FieldSchema.at\().
function getSchema<T>(ctor: MessageSchema<T>): MessageSchema<T> {
  if (ctor[SCHEMA]) return ctor[SCHEMA];
  reflecting = true;
  try {
    // NOTE: This MUST NOT be reentrant!
    const subject = new ctor();
    for (const key in subject) {
      const val = subject[key];
      if (typeof val.index === 'number') {
        
      }
    }
    return ctor[SCHEMA] = schema;
  } finally {
    reflecting = false;
  }
}

// Static implements MessageSchema<this|undefined>
export class Message {
  static at<T extends typeof Message>(this: T, index: number): InstanceType<T> {
    return (reflecting ? {index, spec: this} : undefined) as any;
  }
  constructor() {
    if (!new.target || new.target === Message) throw '';
    const schema = getSchema(new.target);
  }


    // Need to get the full schema...
    // First time - store schema objects
    //            - then we iterate through to do stuff...?
    // 


    // TODO - what about defaults? probably no... use partials.
    fields = () => undefined;
  }

}


export const Config = struct<Config>();
export namespace Config {
  export const items = message(1, Items);
  export const vars = message(2, Vars);
  // ...

  export const Items = struct<Items>();
  export namespace Items {


  }
  export type Items = MessageType<typeof Items.spec>

}
export type Config = MessageType<typeof Config.spec>;

export type PartialConfig = Partial<Config>;

// TODO - forward-compatible way to make bool into enum?
//      - enum values 0,1 for true/false?

// Binary format for message:
//  - length-delimited [varint?] dfdfkj 
//  - bit field of present values
//  - 



// type PartialSchema<T extends MessageSpecifier> = {
//   [K in keyof T]?: T[K] extends {default: any}

// function struct<T extends MessageSpecifier>(arg: T): MessageSchema<PartialSchema<T>, FullSchema<T>> {

// }
// function options(arg: any) { return undefined; }

// const itemPlacement = struct({
//   algorithm: [0, options({
//     assumed: 1,
//     forward: 2,
//   })],
//   temperature: [1, f8],
  

// });

