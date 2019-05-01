import {Entity, Rom} from './entity.js';
import {Data, DataTuple, Mutable,
        addr, concatIterables, group, hex,
        seq, slice, tuple, varSlice, writeLittleEndian} from './util.js';
import {Writer} from './writer.js';

enum ShopType {
  TOOL = 'tool',
  ARMOR = 'armor',
  INN = 'inn',
  PAWN = 'pawn',
};

export class Shop extends Entity {

  used: boolean;
  location: number;
  index: number;

  type: ShopType;
  // how to determine shop type?
  //   -> look at location's spawn data -> object type 4, id => data $620
  //      23 = pawn, 21 = tools, 22 = inn, 20 = armor
  // use getter/setter to live-link these to the npc data
}
