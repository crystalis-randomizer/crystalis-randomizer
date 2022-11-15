// TODO - tileset viewer
//  - see if we can improve/streamline the UI a bit
//  - build tiles and text into base canvas class?

// TODO -
//  for each tileeffects/screen combo, find edges and exits and connections

import {Canvas} from './canvas';
import {loadRom} from './load';

const run = async () => {
  const rom = await loadRom();
  const canvas = new Canvas(rom, 256, 256);

  const screens = [];
  for (const loc of rom.locations) {
    if (!loc || !loc.used) continue;
    const config =
        [loc.tileset,
         ...loc.tilePatterns,
         ...loc.tilePalettes,
         loc.tileEffects,
        ].join(' ');
    for (const row of loc.screens) {
      for (let s of row) {
        s |= loc.screenPage;
        const screen = screens[s] || (screens[s] = {});
        screen[config] || (screen[config] = new Set()).add(loc);
      }
    }
  }
  
  for (let i = 0; i < screens.length; i++) {
    if (!screens[i]) continue;
    const h1 = document.createElement('h1');
    h1.textContent = `Screen ${hex(i)}`;
    document.body.appendChild(h1);
    const screenDiv = document.createElement('div');
    document.body.appendChild(screenDiv);
    for (const config in screens[i]) {
      const locs = [...screens[i][config]];
      const [loc] = locs;
      const screen = rom.screens[i];
      const tileset = rom.tilesets[loc.tileset];
      let flag = false;
      for (let f = 0; !f || f == 1 && flag; f++) { 
        canvas.clear(locs[0].tilePalettes[0]);
        for (let r = 0; r < 15; r++) {
          for (let c = 0; c < 16; c++) {
            let metatile = screen.tiles[r << 4 | c];
            if (metatile < 0x20 && metatile != tileset.alternates[metatile]) {
              flag = true;
              if (f) metatile = tileset.alternates[metatile];
            }
            canvas.metatile(c << 4, r << 4, metatile, loc.id);
          }
        }
        canvas.text(0, 240, `${hex(loc.tileset)}:${hex(loc.tileEffects)
                      } PAT ${Array.from(loc.tilePatterns, hex).join(' ')
                      } PAL ${Array.from(loc.tilePalettes, hex).join(' ')} ${f ? '*' : ''}`);

        canvas.render();
        const img = document.createElement('img');
        img.src = canvas.toDataUrl();
        img.title = locs.map(l => `${l.name} ${hex(l.id)}`).join(', ');
        screenDiv.appendChild(img);
      }
    }
  }

  document.body.addEventListener('mousemove', e => {
    if (e.target.tagName.toLowerCase() !== 'img') return;
    const x = e.offsetX >>> 4 & 0xf;
    const y = e.offsetY >>> 4 & 0xf;
    document.getElementById('coord').textContent = y.toString(16) + x.toString(16);
  });

  let maxPage = 0;
  for (let i = canvas.patternCoverage.length - 1; i >= 0; i--) {
    if (canvas.patternCoverage[i]) {
      maxPage = (i >>> 7) << 1;
      break;
    }
  }
  const unused = [];
  const lastTile = (maxPage + 1) << 6;
  for (let i = 0; i < lastTile; i++) {
    if (canvas.patternCoverage[i]) continue;
    if (!unused[i >>> 7]) unused[i >>> 7] = [];
    unused[i >>> 7].push(i & 0x7f);
  }
  for (let i = 0; i < unused.length; i++) {
    const list = document.createElement('div');
    list.textContent = `Unused Pat ${(i << 1).toString(16).padStart(2, 0)}:`;
    document.body.appendChild(list);
    if (!unused[i]) continue;
    for (const p of unused[i]) {
      list.textContent += ` ${p.toString(16).padStart(2, 0)}`;
    }
  }
};

const hex = (x) => x.toString(16).padStart(2, 0);

run();
