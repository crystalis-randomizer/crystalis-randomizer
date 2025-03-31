import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Rom} from '../rom';
import {ShuffleData} from '../appatch';

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
  'Unidentified Key',
  'Piano Key',
  'Encryption Key',
  'Private Key',
  'Public Key',
  'Secret Key',
  'Cipher Key',
  'Key Card',
  'Keyboard',
  'Any Key',
  'Ctrl Key',
  'Escape Key',
  'Space Bar',
  'Return Key',
  'Imaginary Key',
  'Giant Key',
  'Out of Key',
  'Key of C',
  'Key of G',
  'Key of B Flat',
  'Key of F Sharp',
  'Major Key',
  'Minor Key',
  'Lockpick',
  'Transponder Key',
  'Sharp Key',
  'Flat Key',
  'Locke and Key',
  'Cookie',
  'Turkey',
  'Monkey',
  'Donkey',
  'Car Key',
  'Clock Key',
  'Florida Key',
  'Key Lime Pie',
  'Keystone',
  'Answer Key',
  'Sticks Key',
  'Key to my Heart',
  'Aqui',
  'Map Key',
  'Key Stone',
  // 'Keytar', // NOTE: ensure not also a flute?
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
  'Deku Pipes',
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
  'Otamatone',
  'Melodica',
  'Vuvuzela',
  'Didgeridoo',
  'Dragonzord Flute',
  'Whoopie Cushion',
  // 'Keytar', // NOTE: ensure not also a key?
];
const LAMP_NAMES = [
  '!Random Lamp',
  '!Bronze Lamp',
  '!Silver Lamp',
  '!Gold Lamp',
  '!Oil Lamp',
  '!Magic Lamp',
  'Genie Lamp',
  'Unidentified Lamp',
  'Dull Lamp',
  'Desk Lamp',
  'Shimmering Lamp',
  'Broken Lamp',
  'Brass Lantern',
  'Overhead Lamp',
  'Pedestal Lamp',
  'Incubation Lamp',
  'Halogen Bulb',
  'Incandescent Bulb',
  'Fluorescent Lamp',
  'Ultraviolet Lamp',
  'Heat Lamp',
  'Recessed Lighting',
  'Laser Pointer',
  'Spotlight',
  'Streetlight',
  'Flashlight',
  'Search Light',
  'LED',
  'Nightlight',
  'Batsignal',
  'Candelabra',
  'Chandelier',
  'Birthday Candle',
  'Tallow Candle',
  'Wax Candle',
  'Candle',
  'Red Candle',
  'Blue Candle',
  'Gas Stove',
  'Fireplace',
  'Campfire',
  'Bonfire',
  'Tanning Bed',
  'Bug Zapper',
  'CRT',
  'Disco Ball',
  'The Clapper',
  'Merton',
  'Gaddlight',
  'Shroomlight',
  'Froglight',
  'Glowstone',
  'Redstone Lamp',
  'PrismarineLantern',
  'Soul Campire',
];
const STATUE_NAMES = [
  '!Random Statue',
  '!Rusty Statue',
  '!Forbidden Statue',
  'Unidentified Idol',
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
  'Great Sphynx',
  'Olmec Head',
  'Shakoki Dogu',
  'Moai',
  'Venus de Milo',
  'David',
  'The Thinker',
  'Winged Victory',
  'Terracotta Statue',
  'Gargoyle',
  'Mattrick Figurine',  // #2 speedrun 2017 (1h04m04s)
  'Dragondarch Statue', // #1 speedrun 2016 (58m14s)
  'Overswarm Statue',   // #1 speedrun 2019-2021 (52m53s)
  'Trueblue83 Statue',  // #3 speedrun 2019 (59m29s)
  'TheAxeMan Idol',     // #4 speedrun 2020 (59h59m), TAS
  'Acmlm Figurine',     // #2 speedrun 2021 (56m00s)
  'Tornel Statue',      // 2022 Tournament Winner
  'CodeGorilla Trophy', // Full Stupid 2021/11/21
  'SirArchibald Model', // Full Stupid 2022/11/11
  // https://www.youtube.com/playlist?list=PLl7hXG2hSSbJdIi2GqQ12ksmvG7hmIyPQ
  'ClaireDiviner Idol', // Full Stupid 2023/07/06
  'justchris Trophy',   // 2024 Tournament Winner
];
// TODO - set up combinations that should appear together
const BOW_NAMES = [
  '!Random Bow',
  'Unidentified Bow',
  'Crossbow',
  'Arbalest',
  'Autocrossbow',
  'Long Bow',
  'Compound Bow',
  'Recurve Bow',
  'Golden Bow',
  'Silver Arrows',
  'Ice Arrows',
  'Fire Arrows',
  'Wooden Bow',
  'Violin Bow',
  'Tae Bo',
  'Botox',
  'Bo Burnham',
  'Bo Dallas',
  'Bo Derek',
  'Bo Diddley',
  'Bo Jackson',
  'Bo Schembechler',
  'Beau Bridges',
  'David Bowie',
  'Bojangles',
  'Bodacious',
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
  'Cupid\'s Bow',
  'Bow No!',
  'Slingshot',
];

// Keep these community ideas here for later
const PLANT_NAMES = [
  'Black Lotus',
  'GympieGympie Leaf',
  'The Beast\'s Rose',
  'Dryad\'s Leaf',
  'WALL-E\'s Plant',
];
const PENDANT_NAMES = [
  'Spike Choker',
  'Dog Collar',
  'Pearl Necklace',
  'Heart of the Ocean',
  'Auryn',
  'Melisandre\'s Ruby',
  'Boleyn \'B\'',
  'Satine\'s Necklace',
];
const GLASSES_NAMES = [
  'Specs',
  'Reading Glasses',
  'Night Vision',
  'Sunglasses',
  'Swimming Goggles',
];
const [] = [PLANT_NAMES, PENDANT_NAMES, GLASSES_NAMES];

export function unidentifiedItems(rom: Rom, flags: FlagSet, random: Random, predetermined?: ShuffleData) {
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
      let name = "";
      // could build this map on IDs instead of names
      if (predetermined?.keyItemNames.has(item.messageName)) {
        name = predetermined.keyItemNames.get(item.messageName)!;
      } else {
        name = filteredNames.pop()!;
      }
      if (rom.spoiler) rom.spoiler.addUnidentifiedItem(item.id, item.messageName, name);
      item.menuName = item.messageName = name;
      item.palette = palettes.pop()!;
    }
  }
}