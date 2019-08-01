import {FlagSection} from './flag.js';

export const ITEM_FLAGS: FlagSection = {
  section: 'Items',
  prefix: 'S',
  text: `Items are broken into five pools: <i>key items</i> includes all
            unique items; <i>consumable items</i> includes anything that can be
            dropped; <i>magic</i> is the eight spells; and <i>traps</i> are the
            12 trap chests found in various places. These pools can be shuffled
            together, kept separate, or left unshuffled.`,

  flags: [
    {
      flag: 'Sk',
      name: 'Shuffle key items',
    },
    {
      flag: 'Sm',
      name: 'Shuffle magics',
    },
    {
      flag: 'Sc',
      name: 'Shuffle consumables',
    },
    {
      flag: 'Sct',
      name: 'Shuffle consumables with traps',
    },
    {
      flag: 'Skm',
      name: 'Shuffle key items with magic',
    },
    {
      flag: 'Skt',
      name: 'Shuffle key items with traps',
    },
    {
      flag: 'Sck',
      hard: true,
      name: 'Shuffle consumables with key items',
    },
    {
      flag: 'Scm',
      hard: true,
      name: 'Shuffle consumables with magic',
    },
    {
      flag: 'Skmt',
      hard: true,
      name: 'Shuffle key, magic, and traps',
    },
    {
      flag: 'Sckm',
      hard: true,
      name: 'Shuffle key, consumables, and magic',
    },
    {
      flag: 'Sckt',
      hard: true,
      name: 'Shuffle key, consumables, and traps',
    },
    {
      flag: 'Sckmt',
      hard: true,
      name: 'Shuffle all items and traps together',
    }
  ],  // TODO: Ss to shuffle shops?
};
