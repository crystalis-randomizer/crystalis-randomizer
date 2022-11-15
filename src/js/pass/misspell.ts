import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Rom} from '../rom';

const ITEMS: ReadonlyMap<string, string[]> = new Map([
  ['Sword of Wind', ['Sord of Wind', 'Sowrd of Wind', 'Sword of Wien']],
  ['Sword of Fire', ['Sword of Frirer']],
  ['Sword of Water', ['Horde of Otters']],
  ['Sword of Thunder', ['Sorg of Chunker']],
  ['Flame Bracelet', ['Fame Bracelet']],
  ['Storm Bracelet', ['Stom Bracelet']],
  ['Sacred Shield', ['Scared Shield']],
  ['Bow of Truth', ['Bow of Strewth']],
  ['Statue of Onyx', ['Statue of Onxy']],
  ['Ivory Statue', ['Ivory Statute']],
  ['Fog Lamp', ['Frog Lamp', 'Smog Lamp', 'Dog Lamp', 'Bog Lamp', 'Fog Lump']],
  ['Glowing Lamp', ['Glowing Lump']],
  ['Key to Stxy', ['Key to Styx']],
  ['Insect Flute', ['Bug Flute', 'Bug Whistle']],
  ['Flute of Lime', ['Flute of Grime']],
  ['Iron Necklace', ['I Ron Necklace']],
  ['Shield Ring', ['Sho Ring']],
  ['Deo\'s Pendant', ['Rabbit Necklace', 'Bunny Pendant']],
  ['Speed Boots', ['Hermes Sandals']],
  ['Rabbit Boots', ['Deo\'s Boots', 'Jumping Boots', 'Rabid Boots']],
  ['Alarm Flute', ['Pocket Rooster', 'Alarm Clock']],
  ['Shell Flute', ['Conch Shell', 'Dolphin Flute']],
  ['Eye Glasses', ['3D Glasses', 'X-Ray Goggles']],
  ['Kirisa Plant', ['Kilika Plant']],
  ['Refresh', ['Refresherize', 'Cure', 'Cura', 'Curaga']],
  ['Recover', ['Recoverize', 'Esuna']],
  ['Paralysis', ['Paralycize', 'Stop', 'Pew Pew']],
  ['Telepathy', ['Telepathize', 'Clairvoyance', 'ESP', 'Head Talk']],
  ['Teleport', ['Teleportate', 'Warp', 'Go']],
  ['Change', ['Changeify', 'Transform', 'Disguise']],
  ['Barrier', ['Barrierize', 'Protect', 'Wall', 'Shield']],
  ['Flight', ['Flyify', 'Blight', 'Super Jump']],
  ['Fruit of Lime', ['Fruit of Crime', 'Gold Needle', 'Soft']],
  ['Medical Herb', ['Potion', 'Hi Potion']],
  ['Fruit of Repun', ['Anti-Slime Pill', 'Maiden\'s Kiss']],
]);

const CHARACTERS: ReadonlyMap<string, string[]> = new Map([
  ['Aryllis', ['Mimic Queen']],
  ['Akahana', ['Steve', 'Jerkahana', 'Mashamahana']],
  ['Asina', ['Athena', 'Jrowina']],
  ['Azteca', ['Steve']],
  ['Clark', ['Steve', 'Fred', 'Mattrick', 'Clarktrick']],
  ['Deo', ['Steve']],
  ['Kelbesque', ['Linebacker']], // NOTE: also change in displayNames
  ['Kensu', ['Steve', 'Jerksu']],
  ['Karmine', ['Slimelord']],
  ['Nadare', ['Steve']],
  ['Mado', ['Steve']],
  ['Rage', ['Steve']],
  ['Sabera', ['Flamelord']],
  ['Stom', ['Steve']],
  ['Tornel', ['Steve']],
  ['Zebu', ['Steve', 'Pervy Old Man']],
]);

const MONSTERS: ReadonlyMap<string, string[]> = new Map([
  ['Poison Slime', ['Mattrick Slime']],
  ['Mud Golem', ['Bear']],
  ['Axe Wereboar', ['The Axeman']],
  ['Pillbug', ['Tomato']],
  ['Ice Golem', ['Polar Bear']],
  ['Flail Guy', ['Kfal\'s Dude']],
  ['Flail Knight', ['Kfal\'s Knight']],
  ['Flying Plant', ['Obnoxious Turnip']],
  ['Beholder', ['Floating Eye']],
  ['Burt', ['Bert', 'Bort', 'Sorceror']],
  ['Mummy', ['Tornel Hugger']],
  ['Robot Sentry', ['C-3PO', 'T-1000', 'Johnny 5']],
  ['Robot Enforcer', ['ED-209', 'R2-D2', 'Agent Smith']],
  ['Robocopter', ['Cylon Drone', 'Megatron', 'Roflcopter', 'Roflcopter', 'Roflcopter']],
  ['DYNA', ['GLaDOS', 'HAL-9000', 'Multivac']],
]);

export function misspell(rom: Rom, flags: FlagSet, random: Random) {
  if (!flags.communityJokes()) return;
  misspellItems(rom, flags, random);
  misspellCharacters(rom, random);
  misspellEnemies(rom, random);
}

function misspellItems(rom: Rom, flags: FlagSet, random: Random) {
  if (flags.unidentifiedItems()) return;
  if ('sphereAnalysis' in globalThis) return; // skip this when analyzing
  // Pick a single item to misspell.  5% chance of misspelling _everything_.

  // TODO: Maybe swap ivory statue for flute of repun, and insect
  // flute for insect figurine (or maybe mosquito herb)?  Should we
  // only do this if we're not shuffling trade-ins?

  const items = random.next() < 0.05 ? rom.items :
      [rom.items[random.nextInt(0x48)]];
  for (const item of items) {
    if (!item) continue;
    const newName = ITEMS.get(item.messageName) || [];
    // Use custom misspelling 3x more often than a random one
    const index = Math.floor(random.nextInt(3 * newName.length + 1) / 3);
    if (index < newName.length) {
      // Use one of the custom misspellings
      item.messageName = item.menuName = newName[index];
    } else if (item.messageName === item.menuName) {
      // Make a random error by swapping two letters or deleting one letter.
      item.messageName = item.menuName = transpose(item.messageName, random);
    }
  }
}

function transpose(str: string, random: Random): string {
  const name = str.split('');
  const pos = random.nextInt(name.length - 1);
  if (name[pos] === ' ' || name[pos + 1] === ' ') {
    // Not much we can do with a space, so just give up.
    return str;
  } else if (name[pos].toUpperCase() === name[pos]) {
    // Don't swap uppercase letters with the one after: instead delete next
    name.splice(pos + 1, 1);
  } else {
    // Swap two adjacent letters
    [name[pos], name[pos + 1]] = [name[pos + 1], name[pos]];
  }
  return name.join('');
}

// TODO - update typescript version/config
declare global {
  interface Array<T> {
    flatMap<V>(cb: (value: T, index: number) => readonly V[]): V[];
  }
}

type ReplaceFn = (arg: string) => string;
function replaceCharacterName(rom: Rom, replaceFn: ReplaceFn) {
  for (const bank of rom.messages.parts) {
    for (const msg of bank) {
      msg.text = replaceFn(msg.text);
    }
  }
  rom.messages.personNames = rom.messages.personNames.map(replaceFn);
  replaceEnemyName(rom, replaceFn);
}

function replace(orig: string, newName: string): ReplaceFn {
  return (text: string) => {
    if (!text.includes(orig)) return text;
    return text.split(orig).join(newName);
  };
}

function replaceEnemyName(rom: Rom, replaceFn: ReplaceFn) {
  for (const obj of rom.objects) {
    if (obj.displayName) obj.displayName = replaceFn(obj.displayName);
  }
}

function misspellCharacters(rom: Rom, random: Random) {
  // While we're at it, let's just add Rachel's name into her dialog.
  const rachelMessage = rom.messages.parts[0][0x18];
  rachelMessage.text =
      'Rachel: ' + rachelMessage.text.replace('is the village of', 'village is');
  // Flatten the map so that characters with more options get
  // overrepresented.  Also add a "random transposition" option.
  const choices: [string, string][] =
      [...CHARACTERS].flatMap(([k, vs]) => ['', ...vs, ...vs].map(v => [k, v]));
  const [orig, next] = random.pick(choices);
  const newName = next || transpose(orig, random);
  if (newName === orig) return;
  replaceCharacterName(rom, replace(orig, newName));
}

function misspellEnemies(rom: Rom, random: Random) {
  for (let i = 0; i < 10; i++) {
    // Pick an enemy first
    const [origName, choices] = random.pick([...MONSTERS]);
    const next = random.pick(['', ...choices, ...choices, ...choices]);
    const newName = next || transpose(origName, random);
    if (newName === origName) continue;
    replaceCharacterName(rom, replace(origName, newName));
  }
}

// TODO: misspell monsters (e.g. flails -> kfal's people)
// TODO: rename characters (e.g. to Steve)
