import {FlagSection} from './flag.js';

export const MONSTER_FLAGS: FlagSection = {
  section: 'Monsters',
  text: `Monster stats are always normalized by scaling level.`,
  prefix: 'M',

  flags: [
    {
      flag: 'Mr',
      name: 'Randomize monsters',
      text:
          `Monster locations are shuffled, with the exception of sea creatures
             and tower robots.`,
    },
    {
      flag: 'Me',
      name: 'Shuffle monster weaknesses',
      text: `Monster elemental weaknesses are shuffled.`,
    },
    {
      flag: 'Mt',
      hard: true,
      name: 'Shuffle tower robots',
      text: `Tower robots will be shuffled into the normal pool.  At some
             point, normal monsters may be shuffled into the tower as well.`,

      // }, {
      //   flag: 'M!',
      //   name: 'No safety checks',
      //   text: `Normally there are some reasonability limits on the monsters
      //          that can be shuffled (flyers only in larger areas, and at most
      //          one or two; (future: large monsters and flail swingers don't
      //          crowd out small hallways, etc), but these checks can be
      //          disabled for extra craziness and challenge.`,
      // }, {
      //   flag: 'Ms',
      //   hard: true,
      //   name: 'Don\'t scale monster difficulty',
      //   text: `Monster difficulty normally scales with game progression
      //   rather
      //          than being hard-coded based on location to ensure that
      //          monsters stay relevant throughout the game.  The current
      //          difficulty level can be seen next to the player's experience
      //          level on the right side of the HUD.  This scaling can be
      //          turned off, but it is not recommended.`,
    }
  ],
};
