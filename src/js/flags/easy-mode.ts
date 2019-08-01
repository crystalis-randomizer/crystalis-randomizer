import {FlagSection} from './flag.js';

export const EASY_MODE_FLAGS: FlagSection = {
  section: 'Easy Mode',
  text: `The following options make parts of the game easier.`,
  prefix: 'E',

  flags: [
    {
      flag: 'Ed',
      name: 'Decrease enemy damage',
      text:
          `Enemy attack power will be significantly decreased in the early game
           (by a factor of 3).  The gap will narrow in the mid-game and eventually
           phase out at scaling level 40.`,
    },
    {
      flag: 'Es',
      name: 'Guarantee starting sword',
      text: `The Leaf elder is guaranteed to give a sword.  It will not be
           required to deal with any enemies before finding the first sword.`,
    },
    {
      flag: 'Er',
      name: 'Guarantee refresh',
      text:
          `Guarantees the Refresh spell will be available before fighting Tetrarchs.`,
    },
    {
      flag: 'Em',
      name: 'Extra buff medical herb',
      text: `Buff Medical Herb to heal 96 instead of 64 and Fruit of Power to
           restore 64 MP instead of 48.`,
      conflict: /Hm/
    },
    {
      flag: 'Ex',
      name: 'Experience scales faster',
      text:
          `Less grinding will be required to "keep up" with the game difficulty.`,
      conflict: /Hx/
    }
  ],
};
//
