import * as patch from '../patch';
import {FetchReader} from '../fetchreader';
import {FlagSet} from '../flagset';
import {prepareScreens} from '../pass/shufflemazes';
import {Random} from '../random';
import {Rom} from '../rom';

export async function loadRom() {
  const hash = new Map(location.hash.replace(/^#/, '').split('&').map(term => {
    let [key, value] = term.split('=');
    if (value == null) value = '1';
    return [decodeURIComponent(key), decodeURIComponent(value)];
  }));
  if (hash.has('flags')) {
    const flags = new FlagSet(hash.get('flags'));
    // NOTE: this changes the shuffle - set it manually to skip logic
    // flags.set('Dn', true);
    const seedStr = hash.get('seed') ?? Math.floor(Math.random() * 0x100000000).toString(16);
    const seed = patch.parseSeed(seedStr);
    const romData = await Rom.loadBytes();
    await patch.shuffle(romData, seed, flags, new FetchReader('../js/'));
    return window.rom;
  } else {
    const rom = await Rom.load();
    window.rom = rom;
    if (tryParse(hash.get('extend'))) {
      prepareScreens(rom);
    }
    return rom;
  }
}

function tryParse(val) {
  try {
    return JSON.parse(val);
  } catch (e) {
    return val;
  }
}
