import {Viz} from './viz.js';
import {Rom} from './rom.js';

const drawLocation = (rom, id) => {
  let idEl = document.getElementById('loc');
  if (!idEl) {
    idEl = document.createElement('div');
    idEl.id = 'loc';
    document.body.appendChild(idEl);
  }
  idEl.textContent = id.toString(16);
  // return the viz
  const loc = rom.locations[id];
  if (!loc) { // TODO - streamline this
    const err = new Viz(10, 10, 1);
    err.fill(0);
    document.body.appendChild(err.element);
    return err;
  }
  const viz = new Viz(loc.width * 256, loc.height * 240, loc.animation ? 8 : 1);
  viz.fill(rom.palettes[loc.tilePalettes[0]].colors[0]);
  const tileset = rom.tileset(loc.tileset);
  // get the palettes, patterns, etc
  for (let scrX = 0; scrX < loc.width; scrX++) {
    for (let scrY = 0; scrY < loc.height; scrY++) {
      const screen = rom.screens[(loc.extended ? 0x100 : 0) | loc.screens[scrY][scrX]];
      for (let mtX = 0; mtX < 16; mtX++) {
        for (let mtY = 0; mtY < 15; mtY++) {
          const metatileId = screen.tiles[mtY][mtX];
          // get the metatile
          const attr = tileset.attrs[metatileId];
          const palette = attr < 3 ? loc.tilePalettes[attr] : 0x7f;
          for (let tX = 0; tX < 2; tX++) {
            for (let tY = 0; tY < 2; tY++) {
              const x = scrX << 8 | mtX << 4 | tX << 3;
              const y = scrY * 240 + (mtY << 4 | tY << 3);
              const tile = tileset.tiles[tY << 1 | tX][metatileId];
              let patternPage = loc.tilePatterns[tile & 0x80 ? 1 : 0];
              for (let i = 0; i < 8; i++) {
                if (loc.animation && tile & 0x80) {
                  // animated
                  patternPage = rom.tileAnimations[loc.animation].pages[7 ^ i];
                }
                viz.drawTile(x, y, rom.patterns[patternPage << 6 | tile & 0x7f],
                             rom.palettes[palette].colors, i);
              }
            }
          }
        }
      }
    }
  }
  document.body.appendChild(viz.element);
  return viz;
};

const main = async () => {
  const rom = await Rom.load();

  let loc = 0;
  let viz = drawLocation(rom, 0);
  document.body.addEventListener('keypress', (e) => {
    let newLoc;
    if (e.key == 'j') {
      newLoc = (loc + 1) & 0xff;
    } else if (e.key == 'k') {
      newLoc = (loc - 1) & 0xff;
    }
    if (newLoc != null) {
      loc = newLoc;
      viz.element.remove();
      viz = drawLocation(rom, loc);
    }
  });
};

window.addEventListener('load', main);
