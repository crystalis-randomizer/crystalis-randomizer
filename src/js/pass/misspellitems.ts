import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';

const MISSPELLINGS: ReadonlyMap<string, string[]> = new Map([
  ['Sword of Water', ['Horde of Otters']],
  ['Sword of Thunder', ['Sorg of Chunker']],
  ['Flame Bracelet', ['Fame Bracelet']],
  ['Storm Bracelet', ['Stom Bracelet']],
  ['Sacred Shield', ['Scared Shield']],
  ['Bow of Truth', ['Bow of Strewth']],
  ['Statue of Onyx', ['Statue of Onxy']],
  ['Fog Lamp', ['Frog Lamp', 'Smog Lamp', 'Dog Lamp']],
  ['Key to Stxy', ['Key to Styx']],
  ['Insect Flute', ['Bug Flute']],
  ['Flute of Lime', ['Flute of Grime']],
  ['Iron Necklace', ['I Ron Necklace']],
  ['Shield Ring', ['Sho Ring']],
  ['Deo\'s Pendant', ['Rabbit Necklace', 'Bunny Pendant']],
  ['Speed Boots', ['Hermes Sandals']],
  ['Rabbit Boots', ['Deo\'s Boots', 'Jumping Boots']],
  ['Alarm Flute', ['Pocket Rooster', 'Alarm Clock']],
  ['Shell Flute', ['Conch Shell']],
  ['Eye Glasses', ['3D Glasses', 'X-Ray Goggles']],
  ['Kirisa Plant', ['Kilika Plant']],
  ['Refresh', ['Cure', 'Cura', 'Curaga']],
  ['Recover', ['Esuna']],
  ['Paralysis', ['Stop', 'Pew Pew']],
  ['Telepathy', ['Clairvoyance', 'ESP', 'Head Talk']],
  ['Teleport', ['Warp', 'Go Place Fast']],
  ['Change', ['Transform', 'Disguise']],
  ['Barrier', ['Protect', 'Wall', 'Shield']],
  ['Flight', ['Blight', 'Super Jump']],
  ['Fruit of Lime', ['Fruit of Crime', 'Gold Needle', 'Soft']],
  ['Medical Herb', ['Potion', 'Hi Potion']],
  ['Fruit of Repun', ['Anti-Slime Pill', 'Maiden\'s Kiss']],
]);

export function misspellItems(rom: Rom, flags: FlagSet, random: Random) {
  if (flags.unidentifiedItems()) return;
  // Pick a single item to misspell.
  const item = rom.items[random.nextInt(0x48)];
  if (!item) return;
  const newName = MISSPELLINGS.get(item.messageName) || [];
  // Use custom misspelling 3x more often than a random one
  const index = Math.floor(random.nextInt(3 * newName.length + 1) / 3);
  if (index < newName.length) {
    // Use one of the custom misspellings
    item.messageName = item.menuName = newName[index];
  } else if (item.messageName === item.menuName) {
    // Make a random error by swapping two letters or deleting one letter.
    const name = item.messageName.split('');
    const pos = random.nextInt(name.length - 1);
    if (name[pos] === ' ' || name[pos + 1] === ' ') {
      // Not much we can do with a space, so just give up.
      return;
    } else if (name[pos].toUpperCase() === name[pos]) {
      // Don't swap uppercase letters with the one after: instead delete next
      name.splice(pos + 1, 1);
    } else {
      // Swap two adjacent letters
      [name[pos], name[pos + 1]] = [name[pos + 1], name[pos]];
    }
    item.messageName = item.menuName = name.join('');
  }
}
