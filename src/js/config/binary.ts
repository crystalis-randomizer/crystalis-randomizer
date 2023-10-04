// Serialize protobufs to binary format
// This is a special binary format designed to significantly minimize the wire
// size, particularly for fields that can be represented with very few bits.
// Ideally we can average about 1 byte per set field, counting keeping track of
// exactly which fields are actually set.

import { Enum, type Field, type Message, Type } from 'protobufjs/light';
import { decode, encode } from './numbers';
import { assertType } from '../util';
import { pack, unpack } from './pack';
import { NumArray, ReadBuffer, WriteBuffer } from './buffer';

export function serialize(message: Message<any>): number[] {
  // Need to pull the reflection data
  const t = message.$type;
  const primitives: number[] = [];
  const messages = new Map<number, NumArray>();
  // For each field, see if it's defined on this message
  for (const [f, spec] of Object.entries(t.fields)) {
    assertType<Field>(spec);
    // check existence
    const val = message[f];
    if (val == undefined) break;
    // is it a primitive, enum, or submessage?
    // need to look up type in scope
    const ft = spec.parent.lookup(spec.type);
    if (ft == undefined) {
      // primitive - try to pack it
      const encoded = encode(spec.options['(type)'], spec.type, val);
      if (typeof encoded === 'number') {
        primitives[spec.id] = encoded;
      } else {
        messages.set(spec.id, encoded);
      }      
    } else if (ft instanceof Enum) {
      // enum - store the index as-is
      primitives[spec.id] = val;
    } else if (ft instanceof Type) {
      // message - write header, length, data
      messages.set(spec.id, serialize(val));
    } else {
      // no idea what's going on...?
      throw new Error(`Unknown spec type: ${spec.type}`);
    }
  }
  if (primitives.length) messages.set(0, pack(primitives));
  // Now write the thing
  const out = new WriteBuffer();
  for (const [id, data] of messages) {
    out.pushVarint(id << 2);
    out.pushVarint(data.length);
    out.pushArray(data);
  }
  return out.toArray();
}

export function deserialize(message: Message<any>, buffer: ReadBuffer) {
  // Need to pull the reflection data
  const t = message.$type;
  // For each field, see if it's defined on this message
  while (!buffer.eof()) {
    const header = buffer.readVarint();
    // TODO - can header have anything other than a '0' type?
    //      - maybe when we start handling maps...
    const id = header >>> 2;
    const reader = buffer.readLengthDelimited();
    if (!id) {
      readPrimitiveFields(message, reader)
      continue;
    }
    const spec = t.fieldsById[id];
    if (!spec) {
      console.warn(`encountered unknown field ${t.name} ${t.id}`);
      continue;
    }
    assertType<Field>(spec);
    let ft = spec.parent.lookup(spec.type);
    if (spec.type === 'string') {
      const buf = reader.readLengthDelimitedUint8Array();
      setField(message, spec, new TextDecoder().decode(buf));
    } else if (ft == undefined) {
      throw new Error(`Don't know how to handle`);
    } else if (ft instanceof Enum) {
      throw new Error(`Enum should be packed into primitives`);
    } else if (ft instanceof Type) {
      const submessage = ft.create();
      deserialize(submessage, reader);
      setField(message, spec, submessage);
    } else {
      throw new Error(`Unknown spec type: ${spec.type}`);
    }
  }
}

function readPrimitiveFields(message: Message<any>, reader: ReadBuffer) {
  const t = message.$type;
  const primitives = unpack(reader);
  for (let i = 0; i < primitives.length; i++) {
    const value = primitives[i];
    if (value == undefined) continue;
    const spec = t.fieldsById[i];
    assertType<Field>(spec);
    // how to handle different ones...?
    let ft = spec.parent.lookup(spec.type);
    if (ft == undefined) {
      // primitive - try to unpack it
      setField(message, spec, decode(spec.options['(type)'], spec.type, value));
    } else if (ft instanceof Enum) {
      setField(message, spec, value);
    } else if (ft instanceof Type) {
      throw new Error(`Cannot read message from primitives`);
    } else {
      // no idea what's going on...?
      throw new Error(`Unknown spec type: ${spec.type}`);
    }
  }
}

function setField(message: Message<any>, spec: Field, val: unknown) {
  if (spec.repeated) {
    (message[spec.name] || (message[spec.name] = [])).push(val);
  } else {
    message[spec.name] = val;
  }
}

// TODO - to/from yaml!

