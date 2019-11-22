import {FlagSection} from './flag';

export const EXPERIMENTAL_FLAGS: FlagSection = {
  section: 'Experimental',
  prefix: 'X',

  flags: [
    {
      flag: 'Xc',
      name: 'Extra checks',
      text: `Add two extra checks in the initial area.  This requires Re and
             results in an item on the student, as well as two chests in the
             East Cave.`,
    },
    {
      flag: 'Xe',
      name: 'East Cave (GBC)',
      text: `Add the "East Cave" from the GBC version.  If this is selected
             then the initial Alarm Flute will be found in a chest on the
             second floor of this cave.  If Rp is also selected, then there
             will be a second exit from this cave leading to Lime Tree Valley.`,
    },
    {
      flag: 'Xg',
      name: 'Goa passage',
      text: `Add a passage between East Cave and Goa Valley.  There will be an
             "ember wall" (requires water) blocking the exit.  Requires Re`,
    },
    {
      flag: 'Xw',
      name: 'Random thunder warp',
      text: `Randomize warp location for Sword of Thunder.  Instead of warping
             to Shyron, the player may instead be warped to any of the 12 towns,
             chosen randomly when the seed is rolled.  Access to that town will
             be considered "in-logic" once Sword of Thunder is acquired.`,
    },
  ],
};