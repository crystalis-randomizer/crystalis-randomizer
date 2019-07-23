import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';

const KEY_NAMES = [
  'Curious Key',
  'Bronze Key',
  'Silver Key',
  'Ancient Key',
  'Small Key',
  'Shiny Key',
  'Mysterious Key',
  'Magic Key',
];
const FLUTE_NAMES = [
  'Wooden Flute',
  'Tooled Horn',
  'Ocarina',
  'Pan Pipes',
  'Bugle',
  'Bagpipes',
  'Kazoo',
  'Magic Whistle',
  'Dog Whistle',
];
const LAMP_NAMES = [
  'Bronze Lamp',
  'Magic Lamp',
  'Dull Lamp',
  'Shimmering Lamp',
  'Empty Lamp',
];
const STATUE_NAMES = [
  'Black Statue',
  'Forbidden Statue',
  'Golden Idol',
  'Strange Statue',
  'Glass Statue',
  'Burt Figurine',
  'Statue of Mattrick',
  'Copper Statue',
  'White Statue',
  'Unknown Statue',
];


export function unidentifiedItems(rom: Rom, flags: FlagSet, random: Random) {
  const items = (...ids: number[]) => ids.map(id => rom.items[id]);
  const keys = items(0x32, 0x33, 0x34);
  const flutes = items(0x27, 0x28, 0x31, 0x36);
  const lamps = items(0x35, 0x39);
  const statues = items(0x25, 0x26, 0x38, 0x3a, 0x3d);

  // TODO ???
  const [] = [keys, flutes, lamps, statues];
}
const [] = [KEY_NAMES, FLUTE_NAMES, LAMP_NAMES, STATUE_NAMES];
