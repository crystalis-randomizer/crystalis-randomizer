import {Rom} from '../rom';
import {Context} from './context';
import {ScreenEditor} from './screeneditor';
import {addSwampDoors} from '../maze/swamp';

(window as any).global = window;

async function main() {
  const el = document.getElementById('load-rom');
  if (!el) throw new Error(`element not found`);
  const rom = await Rom.load(undefined, (picker) => {
    el.classList.add('visible');
    el.appendChild(picker);
  });
  addSwampDoors(rom);
  el.classList.remove('visible');

  const context = new Context(rom);
  new ScreenEditor(context, document.getElementById('screen-editor')!);

  // TODO - better UI for this
  (window as any).screen = (id: number) => {
    console.log(new Array(15).fill(0).map(
      (_, y) => rom.screens[id].tiles.slice(16 * y,16 * y + 16).map(
        x => x.toString(16).padStart(2, '0')).join(' ')).join('\n'));
  };
  // populate stuff?

  // TODO - project file?
}

main();
