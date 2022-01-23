import * as patch from '../patch.js';
import {FetchReader} from '../fetchreader.js';
import {FlagSet} from '../flagset.js';
import {prepareScreens} from '../pass/shufflemazes.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';

export async function loadRom() {
  const hash = new Map(location.hash.replace(/^#/, '').split('&').map(term => {
    let [key, value] = term.split('=');
    if (value == null) value = '1';
    return [decodeURIComponent(key), decodeURIComponent(value)];
  }));
  if (hash.has('flags')) {
    const flags = new FlagSet(hash.get('flags'));
    flags.set('Dn', true);
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
