import {FlagSection} from './flag.js';

export const WORLD_FLAGS: FlagSection = {
  section: 'World',
  prefix: 'W',

  flags: [
    {
      flag: 'Wt',
      name: 'Randomize trade-in items',
      text: `Items expected by various NPCs will be shuffled: specifically,
             Statue of Onyx, Kirisa Plant, Love Pendant, Ivory Statue, Fog
             Lamp, and Flute of Lime (for Akahana).  Rage will expect a
             random sword, and Tornel will expect a random bracelet.`,
    },
    {
      flag: 'Wu',
      hard: true,
      name: 'Unidentified key items',
      text: `Item names will be generic and effects will be shuffled.  This
             includes keys, flutes, lamps, and statues.`,
    },
    {
      flag: 'Ww',
      name: 'Randomize elements to break walls',
      text: `Walls will require a randomized element to break.  Normal rock and
             ice walls will indicate the required element by the color (light
             grey or yellow for wind, blue for fire, bright orange ("embers") for
             water, or dark grey ("steel") for thunder.  The element to break
             these wills is the same throughout an area.  Iron walls require a
             one-off random element, with no visual cue, and two walls in the
             same area may have different requirements.`,
    }
  ],
};
