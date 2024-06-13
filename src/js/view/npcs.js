import {Rom} from '../rom';
import {loadRom} from './load';

const run = async () => {
  const showUnused = /unused/.test(window.location.hash);
  const mixPalettes = /(-|no)pal/.test(window.location.hash);
  const usedByTileset = {};
  for (let i = 0x80; i < 0xb0; i += 4) usedByTileset[i] = new Set();
  const rom = await loadRom();

  let s = '';
  for (const npc of rom.npcs) {
    if (npc.used) s += `${npc.dump()}\n`;
  }

  const out = document.createElement('pre');
  out.textContent = s;
  document.body.appendChild(out);
};

const hex = (x) => x.toString(16).padStart(2, 0);

run();
