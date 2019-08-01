import {FlagSection} from './flag.js';

export const TWEAK_FLAGS: FlagSection = {
  section: 'Tweaks',
  prefix: 'T',

  flags: [
    {
      flag: 'Ta',
      name: 'Automatically equip orbs and bracelets',
      text: `Adds a quality-of-life improvement to automatically equip the
             corresponding orb/bracelet whenever changing swords.`,
    },
    {
      flag: 'Tb',
      name: 'Buff bonus items',
      text:
          `Leather Boots are changed to Speed Boots, which increase player walking
             speed (this allows climbing up the slope to access the Tornado Bracelet
             chest, which is taken into consideration by the logic).  Deo's pendant
             restores MP while moving.  Rabbit boots enable sword charging up to
             level 2 while walking (level 3 still requires being stationary, so as
             to prevent wasting tons of magic).`,
    },
    {
      flag: 'Tm',
      name: 'Randomize music',
    },
    {
      flag: 'Tp',
      name: 'Randomize sprite palettes',
    },
    {
      flag: 'Tw',
      name: 'Randomize wild warp',
      text: `Wild warp will go to Mezame Shrine and 15 other random locations.`,
      conflict: /Fw/
    }
  ],
};
