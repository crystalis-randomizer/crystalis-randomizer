import {Context, GetSet} from './context.js';

/** Picker element for background attributes. */
export class BackgroundAttrs {

  el: HTMLDivElement;

  constructor(readonly context: Context) {
    const el = this.el = document.createElement('div');
    // el.appendChild(document.createTextNode('Screen: '));
    // el.appendChild(this.inputs[0]);
    const updates: Array<() => void> = [];
    function text(t: string) { el.appendChild(document.createTextNode(t)); }
    function input(prop: GetSet<number|undefined>,
                   opts?: {incr?: number, radix?: number}) {
      el.appendChild(makeInput(context, updates, prop, opts));
    }
    text('Tileset: ');
    input(Context.TILESET);
    text('Patterns: ');
    input(Context.pattern(0));
    input(Context.pattern(1));
    text(' Palettes: ');
    input(Context.palette(0));
    input(Context.palette(1));
    input(Context.palette(2));
    text(' Location: ');
    input(Context.LOCATION);
    text(' Flag: ');
    const flag = document.createElement('input');
    el.appendChild(flag);
    flag.type = 'checkbox';
    flag.checked = context.flag;
    flag.addEventListener('change', () => context.flag = flag.checked);
  }
}

export function makeInput(context: Context,
                          updates: Array<() => void>,
                          prop: GetSet<number|undefined>,
                          {incr = 1, radix = 16} = {}): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.size = 3;
  input.value = writeValue(prop.get(context), radix);
  input.addEventListener('keyup', (ev) => handleKey(ev as KeyboardEvent));

  updates.push(() => input.value = writeValue(prop.get(context), radix));

  function handleKey(ev: KeyboardEvent) {
    let [value, newRadix] = readValue(input.value);
    if (isNaN(value)) return;
    radix = newRadix;
    if (ev.key === 'ArrowUp') {
      value += incr;
      input.value = writeValue((value & 0xff) >>> 0, radix);
    } else if (ev.key === 'ArrowDown') {
      value -= incr;
      input.value = writeValue((value & 0xff) >>> 0, radix);
    }
    prop.set(context, value);
  }

  return input;
}

function readValue(value: string): [number, number] {
  if (value.startsWith('$')) {
    return [parseInt(value.substring(1), 16), 16];
  } else if (value.startsWith('%')) {
    return [parseInt(value.substring(1), 2), 2];
  }
  return [value ? parseInt(value) : NaN, 10];
}

function writeValue(value: number|undefined, radix: number): string {
  if (value == null) return '';
  if (radix === 16) return '$' + value.toString(16);
  if (radix === 2) return '%' + value.toString(2);
  return value.toString();
}
