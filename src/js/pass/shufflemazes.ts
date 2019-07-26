import {Random} from '../random.js';
import {Location} from '../rom/location.js';

// For now we hardcode data about the available screens...
// Edges of tile: [0 1 2] along top, [3 4 5] down left,
// [6 7 8] on bottom, [9 10 11] down right edge.
const GOA1 = [
  [0x72, [0, 6], [1, 7], [2, 8]],
  [0xe0, [0, 11], [1, 10], [2, 9]],
  [0xe1, [0, 3], [1, 4], [2, 5]],
  [0xe2, [6, 9], [7, 10], [8, 11]],
  [0xe3, [3], [4, 7], [5, 6], [11]],
];

function shuffleGoa1(location: Location, random: Random) {
  // NOTE: also need to move enemies...


}


function shuffleSwamp(location: Location, random: Random) {

}
