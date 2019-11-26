import {FlagSection} from './flag';

export const EXPERIMENTAL_FLAGS: FlagSection = {
  section: 'Experimental',
  prefix: 'X',

  flags: [
    {
      flag: 'Xb',
      name: 'Remove one early wall',
      text: `Remove either the wall in East Cave or the wall behind Zebu.`,
    },
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
      flag: 'Xf',
      name: 'Fog Lamp not required for dolphin',
      text: `Can summon dolphin immediately with only shell flute.  Fog lamp
             provides one point of access to the sea, which comes with an item
             under Kensu.  Talking to Kensu is not required for dolphin.`,
    },
    {
      flag: 'Xg',
      name: 'Goa passage',
      text: `Add a passage between East Cave and Goa Valley.  There will be an
             "ember wall" (requires water) blocking the exit.  Requires Xe`,
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
