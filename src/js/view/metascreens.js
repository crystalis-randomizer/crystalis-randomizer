// TODO - sort screens/information differently
//      - even for unused screens, find locations in same tileset for pat/pal
//      - expose exits, etc

import {Canvas} from './canvas';
import {loadRom} from './load';
import {DefaultMap, hex1} from '../util';

window.show = function(arr) { console.log(Array.from({length: 15},(_,r) => arr.slice(16*r,16*r+16).map(x=>x.toString(16).padStart(2,0)).join(' ')).join('\n')); };

function pack(...bytes) {
  let val = 0;
  for (let i = 0; i < bytes.length; i++) {
    val *= 256;
    val += bytes[i];
  }
  return val;
}
function unpack(num, count) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    out[i] = num % 256;
    num = Math.floor(num / 256);
  }
  return out;
}
function appendElement(tag, text, parent = document.body) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  parent.appendChild(el);
  return el;
}

const run = async () => {
  const rom = await loadRom();
  const canvas = new Canvas(rom, 256, 256);

  const screens = [];
  const graphics = new DefaultMap(() => new Map());

  for (const loc of rom.locations) {
    if (!loc || !loc.used) continue;
    graphics.get(loc.meta.tileset).set(pack(...loc.tilePatterns, ...loc.tilePalettes), loc);
  }

  //     const config =
  //       [loc.tileset,
  //        ...loc.tilePatterns,
  //        ...loc.tilePalettes,
  //        loc.tileEffects,
  //       ].join(' ');
  //   for (const row of loc.screens) {
  //     for (let s of row) {
  //       s |= loc.screenPage;
  //       const screen = screens[s] || (screens[s] = {});
  //       screen[config] || (screen[config] = new Set()).add(loc);
  //     }
  //   }
  // }
  
  for (const ts of rom.metatilesets) {
    appendElement('h1', `Tileset ${hex(ts.tilesetId)} ${ts.name}`);
    const tilesetDiv = appendElement('div');
    tilesetDiv.style.display = 'none';
    const {tileset} = ts;
    for (const scr of ts) {
      appendElement('h2', `Screen ${hex1(scr.sid, 3)} ${scr.name}`, tilesetDiv);
      const {screen} = scr;
      const screenDiv = appendElement('div', '', tilesetDiv);
      for (const loc of graphics.get(ts).values()) {
        let flag = 0;
        for (let f = 0; f === flag; f++) { 
          canvas.clear(loc.tilePalettes[0]);
          for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 16; c++) {
              let metatile = screen.tiles[r << 4 | c];
              if (metatile < 0x20 && metatile != tileset.alternates[metatile]) {
                flag = 1;
                if (f) metatile = tileset.alternates[metatile];
              }
              canvas.metatile(c << 4, r << 4, metatile, loc.id);
            }
          }
          canvas.text(0, 240, `PAT ${Array.from(loc.tilePatterns, hex).join(' ')
                      } PAL ${Array.from(loc.tilePalettes, hex).join(' ')} ${f ? '*' : ''}`);

          canvas.render();
          const img = document.createElement('img');
          img.src = canvas.toDataUrl();
          screenDiv.appendChild(img);
        }
      }
    }
  }

  document.body.addEventListener('mousemove', e => {
    if (e.target.tagName.toLowerCase() !== 'img') return;
    const x = e.offsetX >>> 4 & 0xf;
    const y = e.offsetY >>> 4 & 0xf;
    document.getElementById('coord').textContent = y.toString(16) + x.toString(16);
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.tagName !== 'H1') return;
    const next = e.target.nextElementSibling;
    if (next.style.display === 'none') {
      next.style.display = 'block';
    } else {
      next.style.display = 'none';
    }
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
