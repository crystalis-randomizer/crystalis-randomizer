import {FlagSection} from './flag.js';

export const DEBUG_MODE_FLAGS: FlagSection = {
  section: 'Debug Mode',
  prefix: 'D',
  text: `These options are helpful for exploring or debugging.  Note that,
      while they do not directly affect any randomization, they
      <i>do</i> factor into the seed to prevent cheating, and they
      will remove the option to generate a seed for racing.`,

  flags: [
    {
      flag: 'Ds',
      name: 'Generate a spoiler log',
      text: `Note: <b>this will change the placement of items</b> compared to a
      seed generated without this flag turned on.`
    },
    {
      flag: 'Di',
      name: 'Player never dies',
    }
  ],  // TODO - quick itemget/teleport options?
};
