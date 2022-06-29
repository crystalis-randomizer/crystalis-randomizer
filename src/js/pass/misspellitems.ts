import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';

const MISSPELLINGS: ReadonlyMap<string, string[]> = new Map([
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

export function misspellItems(rom: Rom, flags: FlagSet, random: Random) {
  if (flags.unidentifiedItems()) return;
  if ('sphereAnalysis' in globalThis) return; // skip this when analyzing
  // Pick a single item to misspell.  5% chance of misspelling _everything_.
  const items = random.next() < 0.05 ? rom.items :
      [rom.items[random.nextInt(0x48)]];
  for (const item of items) {
    if (!item) continue;
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
}
