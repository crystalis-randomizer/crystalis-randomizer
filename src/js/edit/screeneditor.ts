import {Screen} from './screen.js';
import {Graphics} from './graphics.js';
import {Rom} from '../rom.js';
import {seq} from '../rom/util.js';

export class ScreenEditor {

  inputs: HTMLInputElement[];
  screen: Screen;

  constructor(readonly rom: Rom, readonly graphics: Graphics, readonly el: Element) {
    // Expect a SECTION element with class already.
    this.inputs = seq(8, (x) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = x === 1 ? '$80' : '$00';
      input.size = 3;
      return input;
    });
    el.appendChild(document.createTextNode('Screen: '));
    el.appendChild(this.inputs[0]);
    el.appendChild(document.createTextNode('Tileset: '));
    el.appendChild(this.inputs[1]);
    el.appendChild(document.createTextNode('Patterns: '));
    el.appendChild(this.inputs[2]);
    el.appendChild(this.inputs[3]);
    el.appendChild(document.createTextNode('Palettes: '));
    el.appendChild(this.inputs[4]);
    el.appendChild(this.inputs[5]);
    el.appendChild(this.inputs[6]);
    el.appendChild(document.createTextNode('Location: '));
    el.appendChild(this.inputs[7]);
    el.addEventListener('keyup', (ev) => this.handleKey(ev as KeyboardEvent));

    const screenEl = document.createElement('div');
    el.appendChild(screenEl);
    this.screen = new Screen(rom, graphics, screenEl);
  }

  handleKey(ev: KeyboardEvent) {
    const index = this.inputs.indexOf(ev.target as any);
    if (index < 0) return;
    const input = this.inputs[index];
    let [value, radix] = readValue(input.value);
    if (isNaN(value)) return;
    if (ev.key === 'ArrowUp') {
      if (index === 1) value += 3;
      input.value = writeValue((++value & 0xff) >>> 0, radix);
    } else if (ev.key === 'ArrowDown') {
      if (index === 1) value -= 3;
      input.value = writeValue((--value & 0xff) >>> 0, radix);
    }
    switch (index) {
      case 0: this.screen.screen = value; break;
      case 1: if (isValidTileset(value)) this.screen.tileset = value; break;
      case 2: this.screen.patterns[0] = value; break;
      case 3: this.screen.patterns[1] = value; break;
      case 4: this.screen.palettes[0] = value; break;
      case 5: this.screen.palettes[1] = value; break;
      case 6: this.screen.palettes[2] = value; break;
      case 7: {
        const loc = this.rom.locations[value];
        if (!loc.used) break;
        this.inputs[1].value = writeValue(this.screen.tileset = loc.tileset, 16);
        this.inputs[2].value = writeValue(this.screen.patterns[0] = loc.tilePatterns[0], 16);
        this.inputs[3].value = writeValue(this.screen.patterns[1] = loc.tilePatterns[1], 16);
        this.inputs[4].value = writeValue(this.screen.palettes[0] = loc.tilePalettes[0], 16);
        this.inputs[5].value = writeValue(this.screen.palettes[1] = loc.tilePalettes[1], 16);
        this.inputs[6].value = writeValue(this.screen.palettes[2] = loc.tilePalettes[2], 16);
      }
    }
    if (index && index !== 7) this.inputs[7].value = '';
    this.screen.redraw();
  }
}

function isValidTileset(value: number): boolean {
  return (value & 3) === 0 && value >= 0x80 && value < 0xaf;
}

function readValue(value: string): [number, number] {
  if (value.startsWith('$')) {
    return [parseInt(value.substring(1), 16), 16];
  } else if (value.startsWith('%')) {
    return [parseInt(value.substring(1), 2), 2];
  }
  return [parseInt(value), 10];
}

function writeValue(value: number, radix: number): string {
  if (radix === 16) return '$' + value.toString(16);
  if (radix === 2) return '%' + value.toString(2);
  return value.toString();
}

// TODO
//   - toggle for gridlines (border top/left)
//   - tileset palette
//   - undo???
//   - info on hover
//   - terrain effect overlays
//   - log hex values to console
