import {FlagSection} from './flag.js';

export const GLITCH_FLAGS: FlagSection = {
  section: 'Glitches',
  prefix: 'G',
  text: `The routing logic can be made aware of the following
      glitches.  If selected, it will assume that the glitch can be
      performed when verifying that a game is winnable.  Enabling
      these glitches tends to increase the randomness of the shuffle,
      since there are more valid options.`,

  flags: [
    {
      flag: 'Gc',
      hard: true,
      name: 'Sword charge glitch may be required',
      text:
          `Progression may require using the sword charge glitch to destroy walls or
           form bridges without actually possessing the correct orb.`,
      conflict: /Fc/
    },
    {
      flag: 'Gf',
      name: 'Ghetto flight may be required',
      text:
          `Progression may require using Rabbit Boots and the dolphin to reach Swan
           before the Angry Sea can be calmed and before Flight is available.`,
    },
    {
      flag: 'Gp',
      name: 'Teleport skip may be required',
      text: `Progression may require entering Mt. Sabre North from Cordel Plain
           without the Teleport spell (flying over the river to avoid the
           trigger).`,
      conflict: /Fp/
    },
    {
      flag: 'Gr',
      name: 'Rabbit skip may be required',
      text: `Progression may require entering Mt. Sabre North from Cordel Plain
           without talking to the rabbit in Leaf after the abduction.`,
      conflict: /Fr/
    },
    {
      flag: 'Gt',
      name: 'Statue glitch may be required',
      text:
          `Progression may require glitching past guards without Change or Paralysis,
           or people turned to stone without a Flute of Lime.  The logic ensures that 
           using the Flute of Lime on the two statues will not break the game since
           it can be used twice.`,
      conflict: /Ft/
    },
    {
      flag: 'Gw',
      hard: true,
      name: 'Wild warp may be required',
      text:
          `Progression may require using "wild warp" (holding A and B on controller 1
           and tapping A on controller 2) to travel to parts of the game that would
           otherwise be unreachable.`,
      conflict: /Fw/
    }
  ],
};
