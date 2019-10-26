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
      flag: 'Dt',
      name: 'Trainer mode',
      text: `Installs a trainer for practicing certain parts of the game.
      At the start of the game, the player will have all swords, basic armors
      and shields, all worn items and magics, a selection of consumables,
      bow of truth, maximum cash, all warp points activated, and the Shyron
      massacre will have been triggered.  Wild warp is reconfigured to provide
      easy access to all bosses.  Additionally, the following button
      combinations are recognized:<ul>
       <li>Start+Up: increase player level
       <li>Start+Down: increase scaling level
       <li>Start+Left: get all balls
       <li>Start+Right: get all bracelets
       <li>Start+B+Down: get a full set of consumable items
       <li>Start+B+Left: get all advanced armors
       <li>Start+B+Right: get all advanced shields
      </ul>`,
    },
    {
      flag: 'Di',
      name: 'Player never dies',
    },
  ],  // TODO - quick itemget/teleport options?
};
