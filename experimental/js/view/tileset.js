// TODO - tileset viewer
//  - see if we can improve/streamline the UI a bit
//  - build tiles and text into base canvas class?

import {Canvas} from './canvas.js';
import {Rom} from '../rom.js';

const run = async () => {
  const usedByTileset = {};
  for (let i = 0x80; i < 0xb0; i += 4) usedByTileset[i] = new Set();
  const rom = await Rom.load();
  window.rom = rom;

  // for (const s of rom.disjointTilesets()) {
  //   console.log(`Disjoint: ${[...s].map(hex).join(' ')}`);
  // }
  rom.disjointTilesets();

  // First identify all combinations of tilesets, effects, patterns, palettes.
  const configs = {};
  for (const loc of rom.locations) {
    if (!loc) continue;
    const config =
        [loc.tileset,
         ...loc.tilePatterns,
         ...loc.tilePalettes,
         loc.tileEffects,
        ].join(' ');
    (configs[config] || (configs[config] = [])).push(loc);
  }

  const canvas = new Canvas(rom, 32 * 18 - 2, 9 * 26 - 2);

  const totalUnused = document.createElement('div');
  document.body.append(totalUnused);

  const keys = Object.keys(configs).sort();
  for (const key of keys) {
    const loc = configs[key][0];
    const h1 = document.createElement('h1');
    h1.textContent = `Tiles ${hex(loc.tileset)}/${hex(loc.tileEffects)
                      } Pattern ${Array.from(loc.tilePatterns, hex).join(' ')
                      } Palette ${Array.from(loc.tilePalettes, hex).join(' ')}`;
    document.body.appendChild(h1);
    const text = document.createElement('p');
    text.textContent = configs[key].map(l => `${l.name} ${hex(l.id)}`).join(', ');
    document.body.appendChild(text);
    const tileset = rom.tilesets[(loc.tileset & 0x7f) >>> 2];
    const tileEffects = rom.tileEffects[loc.tileEffects - 0xb3];

    //canvas.clear(0x3d); // background 0f = black
    canvas.clear(loc.tilePalettes[0]); // background 0f = black
    for (let i = 0; i < 0x20; i++) {
      const alt = tileset.alternates[i];
      canvas.metatile((i & 0x1f) * 18, 0, i, loc.id);
      canvas.text((i & 0x1f) * 18, 16, hex(i)); // different color?
      if (alt != i) {
        canvas.metatile((i & 0x1f) * 18, 26, alt, loc.id);
        canvas.text((i & 0x1f) * 18, 26 + 16, hex(alt)); // different color?
      }
    }
    for (let i = 0x20; i < 0x100; i++) {
      canvas.metatile((i & 0x1f) * 18, (i >>> 5) * 26 + 26, i, loc.id);
      canvas.text((i & 0x1f) * 18, (i >>> 5) * 26 + 42, hex(i));
    }
    canvas.render();
    const img = document.createElement('img');
    img.src = canvas.toDataUrl();
    document.body.appendChild(img);

    // Determine which tiles are unused...?
    const usedScreens = new Set();
    for (const l of configs[key]) {
      for (const row of l.screens) {
        for (const s of row) {
          usedScreens.add(l.extended ? s + 0x100 : s);
        }
      }
    }
    const usedTiles = new Set();
    for (const s of usedScreens) {
      for (let x = 0; x < 0x10; x++) {
        for (let y = 0; y < 0xf; y++) {
          usedTiles.add(rom.screens[s].tiles[y][x]);
          usedByTileset[tileset.id].add(rom.screens[s].tiles[y][x]);
        }
      }
    }
    
    const unusedTiles = [];
    for (let i = 0; i < 0x100; i++) {
      if (!usedTiles.has(i)) unusedTiles.push(hex(i));
    }
    const p2 = document.createElement('p');
    p2.textContent = `Unused: ${unusedTiles.join(' ')}`;
    document.body.appendChild(p2);
  }

  for (let i = 0x80; i < 0xb0; i += 4) {
    const line = document.createElement('p');
    const unused = [];
    for (let j = 0; j < 0x100; j++) {
      if (!usedByTileset[i].has(j)) unused.push(hex(j));
    }
    line.textContent = `Unused ${hex(i)}: ${unused.join(' ')}`;
    totalUnused.appendChild(line);
  }    
};

const hex = (x) => x.toString(16).padStart(2, 0);

run();
