import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Rom} from '../rom';

// NOTE: the ! prefix indicates it is used when community jokes are
// not enabled.  This is a much smaller set.  Everything WITHOUT an
// exclamation point is reserved as a joke and will not come up in
// easy mode.

const KEY_NAMES = [
  '!Random Key',
  '!Curious Key',
  '!Bronze Key',
  '!Silver Key',
  '!Golden Key',
  '!Ancient Key',
  '!Small Key',
  '!Shiny Key',
  '!Mysterious Key',
  '!Magic Key',
  '!Backdoor Key',
  '!Skeleton Key',
  'Piano Key',
  'Encryption Key',
  'Private Key',
  'Public Key',
  'Key Card',
  'Any Key',
  'Space Bar',
  'Return Key',
  'Imaginary Key',
  'Giant Key',
  'Out of Key',
  'Key of C',
  'Key of G',
  'Key of B Flat',
  'Key of F Sharp',
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
  'Keystone',
  'Answer Key',
];
const FLUTE_NAMES = [
  '!Random Flute',
  '!Wooden Flute',
  '!Metal Flute',
  '!Piccolo',
  'Horn of Plenty',
  '!Ocarina',
  'Fairy Ocarina',
  'Ocarina of Time',
  '!Pan Pipes',
  '!Bugle',
  '!Bagpipes',
  'Kazoo',
  'Lute',
  'Harp',
  'Guitar',
  'Electric Guitar',
  '!Tin Whistle',
  'Magic Whistle',
  'Dog Whistle',
  '!Recorder',
  '!Accordion',
  '!Harmonica',
  'Sousaphone',
  'Trumpet',
  'French Horn',
  'Trombone',
  'Euphonium',
  'Tuba',
  'Clarinet',
  'Saxophone',
  'Oboe',
  'Bassoon',
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
  'Snare Drum',
  'Xylophone',
  'Marimba',
  'Tambourine',
  'Tornelsbane',
  'Flute of Power',
];
const LAMP_NAMES = [
  '!Random Lamp',
  '!Bronze Lamp',
  '!Silver Lamp',
  '!Gold Lamp',
  '!Oil Lamp',
  '!Magic Lamp',
  'Genie Lamp',
  'Dull Lamp',
  'Desk Lamp',
  'Shimmering Lamp',
  'Broken Lamp',
  'Brass Lantern',
  'Overhead Lamp',
  'Pedestal Lamp',
  'Incubation Lamp',
  'Fluorescent Lamp',
  'Ultraviolet Lamp',
  'Heat Lamp',
  'Recessed Lighting',
  'Laser Pointer',
  'Spotlight',
  'Flashlight',
  'Search Light',
  'Batsignal',
  'Candelabra',
  'Chandelier',
  'Birthday Candle',
  'Tallow Candle',
  'Wax Candle',
  'Tanning Bed',
  'CRT',
];
const STATUE_NAMES = [
  '!Random Statue',
  '!Rusty Statue',
  '!Forbidden Statue',
  'Golden Idol',
  '!Strange Statue',
  '!Glass Statue',
  '!Copper Statue',
  '!White Statue',
  'Invisible Statue',
  'Burt Figurine',
  'Draygon Figurine',
  'Karmine Figurine',
  'Mado Figurine',
  'Sabera Figurine',
  'Kelbesque Figurine',
  'Flail Guy Trophy',
  'Metroid Amiibo',
  'Model of Dyna',
  'Jeff Peters Statue',
  'M. Toki Statue',
  'Statue of Liberty',
  'Colossus of Rhodes',
  'Mattrick Figurine',  // #2 speedrun 2017 (1h04m04s)
  'Dragondarch Statue', // #1 speedrun 2016 (58m14s)
  'Overswarm Statue',   // #1 speedrun 2019-2021 (52m53s)
  'Trueblue83 Statue',  // #3 speedrun 2019 (59m29s)
  'TheAxeMan Idol',     // #4 speedrun 2020 (59h59m), TAS
  'Acmlm Figurine',     // #2 speedrun 2021 (56m00s)
  'CodeGorilla Trophy', // Full Stupid 2021/11/21
];
// TODO - set up combinations that should appear together
const BOW_NAMES = [
  '!Random Bow',
  'Crossbow',
  'Autocrossbow',
  'Long Bow',
  'Compound Bow',
  'Silver Arrows',
  'Wooden Bow',
  'Violin Bow',
  'Tae Bo',
  'Botox',
  'Bo Derek',
  'Bo Diddley',
  'Bo Dallas',
  'Rainbow',
  'Hair Bow',
  'Bow Tie',
  '!Bow of Earth',
  '!Bow of Stars',
  '!Bow of Wind',
  '!Bow of Fire',
  '!Bow of Water',
  '!Bow of Thunder',
  '!Bow of Light',
  '!Bow of Darkness',
  'Bow of Lies',
  'Bow of Life',
  'Bow of Death',
  'Bow of Freedom',
  'JBowe',
  'KLINGSBO',
  'LILLABO',
  'SVALBO',
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
    const filteredNames =
        (flags.communityJokes() ? names : names.filter(n => n.startsWith('!')))
            .map(n => n.replace(/^!/, ''));
    random.shuffle(filteredNames);
    const palettes = random.shuffle([0, 1, 2, 3]);
    for (const item of list) {
      const name = filteredNames.pop()!;
      if (rom.spoiler) rom.spoiler.addUnidentifiedItem(item.id, item.messageName, name);
      item.menuName = item.messageName = name;
      item.palette = palettes.pop()!;
    }
  }
}
