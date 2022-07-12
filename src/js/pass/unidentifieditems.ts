import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';

const KEY_NAMES = [
  'Unidentified Key',
  'Curious Key',
  'Bronze Key',
  'Silver Key',
  'Ancient Key',
  'Small Key',
  'Shiny Key',
  'Mysterious Key',
  'Magic Key',
  'Piano Key',
  'Encryption Key',
  'Private Key',
  'Public Key',
  'Key Card',
  'Any Key',
  'Space Bar',
  'Return Key',
  'Backdoor Key',
  'Imaginary Key',
  'Giant Key',
  'Out of Key',
  'Key of C',
  'Key of G',
  'Key of B Flat',
  'Key of F Sharp',
  'Skeleton Key',
  'Golden Key',
  'Lockpick',
  'Transponder Key',
  'Sharp Key',
  'Flat Key',
  'Locke and Key',
  'Major Key',
  'Minor Key',
  'Cookie',
  'Turkey',
  'Monkey',
  'Ctrl Key',
  'Escape Key',
  'Car Key',
  'Clock Key',
  'Florida Key',
  'Key Lime Pie',
];
const FLUTE_NAMES = [
  'Wooden Flute',
  'Metal Flute',
  'Horn of Plenty',
  'Ocarina',
  'Fairy Ocarina',
  'Ocarina of Time',
  'Pan Pipes',
  'Bugle',
  'Bagpipes',
  'Kazoo',
  'Lute',
  'Harp',
  'Guitar',
  'Electric Guitar',
  'Tin Whistle',
  'Magic Whistle',
  'Dog Whistle',
  'Recorder',
  'Accordion',
  'Harmonica',
  'Sousaphone',
  'Trumpet',
  'Trombone',
  'Clarinet',
  'Saxophone',
  'Violin',
  'Viola',
  'Cello',
  'Theramin',
  'Synthesizer',
  'Moog Synth',
  'Piano',
  'Harpsichord',
  'Pipe Organ',
  'Note Block',
  'Tornelsbane',
];
const LAMP_NAMES = [
  'Unidentified Lamp',
  'Bronze Lamp',
  'Silver Lamp',
  'Gold Lamp',
  'Magic Lamp',
  'Genie Lamp',
  'Dull Lamp',
  'Desk Lamp',
  'Shimmering Lamp',
  'Oil Lamp',
  'Broken Lamp',
  'Brass Lantern',
  'Overhead Lamp',
  'Pedestal Lamp',
  'Incubation Lamp',
  'Fluorescent Lamp',
  'Ultraviolet Lamp',
  'Heat Lamp',
  'Recessed Lighting',
  'Spotlight',
  'Flashlight',
  'Search Light',
  'Batsignal',
  'Candelabra',
  'Chandelier',
  'Birthday Candle',
  'Tallow Candle',
  'Wax Candle',
];
const STATUE_NAMES = [
  'Unidentified Idol',
  'Rusty Statue',
  'Forbidden Statue',
  'Golden Idol',
  'Strange Statue',
  'Glass Statue',
  'Burt Figurine',
  'Draygon Figurine',
  'Karmine Figurine',
  'Mado Figurine',
  'Sabera Figurine',
  'Kelbesque Figurine',
  'Copper Statue',
  'White Statue',
  'Invisible Statue',
  'Flail Guy Trophy',
  'Metroid Amiibo',
  'Model of Dyna',
  'Jeff Peters Statue',
  'Statue of Liberty',
  'Colossus of Rhodes',
  'Mini Eiffel Tower',
  'Mattrick Figurine',  // #2 speedrun 2017 (1h04m04s)
  'Dragondarch Statue', // #1 speedrun 2016 (58m14s)
  'Overswarm Statue',   // #1 speedrun 2019-2021 (52m53s)
  'Trueblue83 Statue',  // #3 speedrun 2019 (59m29s)
  'TheAxeMan Idol',     // #4 speedrun 2020 (59h59m), TAS
  'Acmlm Figurine',     // #2 speedrun 2021 (56m00s)
  'CodeGorilla Trophy', // Full Stupid 2021/11/21
];
const BOW_NAMES = [
  'Unidentified Bow',
  'Crossbow',
  'Autocrossbow',
  'Long Bow',
  'Compound Bow',
  'Silver Arrows',
  'Wooden Bow',
  'Violin Bow',
  'Tae Bo',
  'Rainbow',
  'Hair Bow',
  'Bow Tie',
  'Bow of Earth',
  'Bow of Stars',
  'Bow of Wind',
  'Bow of Fire',
  'Bow of Water',
  'Bow of Thunder',
  'Bow of Lies',
  'Bow of Life',
  'Bow of Death',
  'Bow of Light',
  'Bow of Freedom',
  'Bow of Darkness',
  'Buriza-Do Kyanon',
  'Windforce',
  'Eaglehorn',
];


export function unidentifiedItems(rom: Rom, flags: FlagSet, random: Random) {
  if (!flags.unidentifiedItems()) return;
  const items = (...ids: number[]) => ids.map(id => rom.items[id]);
  const keys = items(0x32, 0x33, 0x34);
  const flutes = items(0x27, 0x28, 0x31, 0x36);
  const lamps = items(0x35, 0x39);
  const statues = items(0x25, /* opel 0x26, */ 0x38, 0x3a, 0x3d);
  const bows = items(0x3e, 0x3f, 0x40);

  for (const [list, [...names]] of [[keys, KEY_NAMES],
                                    [flutes, FLUTE_NAMES],
                                    [lamps, LAMP_NAMES],
                                    [statues, STATUE_NAMES],
                                    [bows, BOW_NAMES],
                                   ] as const) {
    // palettes are :03 bit of item.itemDataValue
    random.shuffle(names);
    const palettes = random.shuffle([0, 1, 2, 3]);
    for (const item of list) {
      const name = names.pop()!;
      if (rom.spoiler) rom.spoiler.addUnidentifiedItem(item.id, item.messageName, name);
      item.menuName = item.messageName = name;
      item.palette = palettes.pop()!;
    }
  }
}
