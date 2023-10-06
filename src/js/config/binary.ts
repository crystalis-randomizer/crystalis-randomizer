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

// Consider other possible encodings:
//   1. traditional binary proto
//   2. some sort of RLE where we say how many values, then give a byte,
//      or even just a nibble, and the next # bytes are field numbers
//      that all have the same value?
//   3. a slightly more packed version of #1 where we can do T/F with a
//      single byte?
// Can we pack this choice into the size delimiter, to know what format
// to expect to read???  Most messages won't be >64 bytes anyway, except
// maybe the top-level?

// TODO - de-nest item.placement.algorithm into just config.placement
//      - avoid anything deeper than 1

// TODO - maps, sets, etc

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
    if (val == undefined) continue;
    if (spec.map) {
      // three ways to serialize a map:
      //  0. with pack() - if value is small numbers and many dense keys
      //  1. as byte-pairs - if KV are 1-byte each
      //  2. as repeated (1,2) entries - if values are messages
      // compare all three types to find shortest - NOTE: this makes maps
      // forward-incompatible with repeated fields
      let keyTypeName = spec.options['(key)'] || spec.keyType;
      let keyType = t.lookup(keyTypeName);
      if (keyType instanceof Enum) {
        // 
      }
      if (!keyType) {
        keyType = spec.keyType;
      }

      continue;
    } else if (spec.repeated) {
      // three ways to serialize a list:
      //  0. with pack() - if values are small numbers
      //  1. as a bitset - if values unique small numbers and may be dense
      //  2. as a list of fixed-length numbers
      //  3. as repeated entries - if values are individually length-delimited
      continue;
    }
    // is it a primitive, enum, or submessage?
    // need to look up type in scope
    const ft = spec.parent.lookup(spec.type);
    if (ft == undefined) {
      // primitive - try to pack it
      const encoded = encode(spec.options['(type)'], spec.type, val, f);
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

export function deserialize<T extends Message<any>>(message: T, buffer: ReadBuffer|NumArray): T {
  if (!(buffer instanceof ReadBuffer)) buffer = new ReadBuffer(buffer);
  // Need to pull the reflection data
  const t = message.$type;
  // For each field, see if it's defined on this message
  while (!buffer.eof()) {
    const header: number = buffer.readVarint();
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
  return message;
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

