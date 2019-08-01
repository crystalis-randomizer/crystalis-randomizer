import {FlagSection} from './flag.js';

export const GLITCH_FIX_FLAGS: FlagSection = {
  section: 'Glitch Fixes',
  prefix: 'F',
  text:
      `Alternatively, glitches may be patched out of the game and made unusable.
         These flags are exclusive with the flags that require the glitch.`,

  flags: [
    {
      flag: 'Fs',
      name: 'Disable shop glitch',
      text:
          `Items may no longer be purchased for neighboring prices.  This makes
           money actually mean something.  To compensate, gold drops money
           will be scaled up somewhat.`,
    },
    {
      flag: 'Fc',
      name: 'Disable sword charge glitch',
      text: `Sword charge glitch will no longer work.  It will be impossible to
           achieve charge levels without having correct inventory.`,
      conflict: /Gc/
    },
    {
      flag: 'Fp',
      name: 'Disable teleport skip',
      text: `Mt Sabre North cannot be entered from Cordel Plans without the
           Teleport spell, even via glitch.`,
      conflict: /Gp/
    },
    {
      flag: 'Fr',
      name: 'Disable rabbit skip',
      text:
          `Mt Sabre North cannot be entered from Cordel Plans without talking to
           the rabbit in leaf.`,
      conflict: /Gr/
    },
    {
      flag: 'Ft',
      name: 'Disable statue glitch',
      text:
          `Statues will instead always push downwards, making it impossible to
           glitch through statues for progression.`,
      conflict: /Gt/
    },
    {
      flag: 'Fw',
      name: 'Disable wild warp',
      text: `Wild warp will only teleport back to Mezame shrine (to prevent
           game-breaking soft-locks).`,
      conflict: /[GT]w/
    }
  ],
};
