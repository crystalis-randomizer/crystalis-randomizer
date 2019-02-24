// A view with vertical split.  On the left is a canvas, on the right is a
// text area with some controls.  We abstract away the canvas to simply
// take a Uint32Array to draw background, and to provide named selection
// areas to highlight.  The controls are initialized with a simple
// markdown-like string and values are pulled out of an object.

// TODO - make a ring of views, with <TAB> to cycle?!?
//      - could even have an action launch a child view.

export class View {

  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('main');
    const canvasDiv = document.createElement('div');
    const canvasInner = document.createElement('div');
    this.element.appendChild(canvasDiv);
    canvasDiv.classList.add('canvas');
    canvasDiv.appendChild(canvasInner);
    this.canvas = document.createElement('canvas');
    canvasInner.appendChild(this.canvas);

    this.buffer = null;
    this.highlights = [];

    this.controls = document.createElement('div');
    this.element.appendChild(this.controls);
    this.controls.classList.add('controls');
    this.options = {};

    this.animated = null;
    this.scale = 0;
    this.handlers = {};
    this.floater = null;
    this.advanceAnimation = null;

    this.annotations = 0xffffffff;

    document.body.addEventListener('keyup', e => keyup(this, e));
    this.element.addEventListener('click', e => click(this, e));
    // handler for hovering over the canvas?  clicking on it?

    document.body.addEventListener('mouseover', e => {
      let t = e.target;
      while (t && !t.dataset['overlay']) t = t.parentElement;
      if (!t) return;
      if (t.dataset['overlay']) {
        for (const el of document.querySelectorAll(
            `[data-overlay="${t.dataset['overlay']}"]`)) {
          el.classList.add('show');
        }
      }
    });
    document.body.addEventListener('mouseout', e => {
      let t = e.target;
      while (t && !t.dataset['overlay']) t = t.parentElement;
      if (!t) return;
      if (t.dataset['overlay']) {
        for (const el of document.querySelectorAll(
            `[data-overlay="${t.dataset['overlay']}"]`)) {
          el.classList.remove('show');
        }
      }
    });
    this.canvas.parentElement.addEventListener('mousemove', e => {
      let x = e.offsetX;
      let y = e.offsetY;
      let t = e.target;
      while (t && t != this.canvas.parentElement) {
        x += t.offsetLeft;
        y += t.offsetTop;
        t = t.parentElement;
      }
      // e.target is an overlay, we need to add the overlay position...
      this.mousemove(x, y);
    });
    this.canvas.parentElement.addEventListener('mouseout', e => {
      if (this.floater) this.floater.remove();
    });
  }

  setControls(text) {
    // Syntax:
    //   # Location [loc:$00]
    //   Palettes: [pal<0:1:$ff>:$00,$01,$02,]
    //   Patterns: [pat<0:$ff>:$0c,$00,]
    //   Size: [width:3] x [height:2]
    //   Screens:
    //     [screens.0<0:$ff>:$04,$03,$02,]
    //     [screens.1<0:$ff>:$04,$03,$02,]
    //     [screens.2<0:$ff>:$04,$03,$02,]
    //   Flags:
    //     $64dd:40 => (1, 1) [flags.1.1<checkbox>:0]
    //   Entrances:
    //     [entrances.0<0:$fff>:$062,$023,]
    //   Exits:
    //     [@256x240+16x16][exits.0:$65,$32,] => [#loc=01:$01]:$01
    //     ...
    const controls = document.createElement('div');
    let overlayIndex = 0;
    // Clear out the overlays
    while (this.canvas.nextSibling) this.canvas.nextSibling.remove();
    this.options = {};
    const lines = text.split('\n');
    for (let line of lines) {
      let div = document.createElement('div');
      if (line.startsWith('#')) {
        line = line.replace(/^#\s+/, '');
        div.style.fontSize = '125%';
      }
      let pos = 0;
      let bracket = line.indexOf('[', pos);
      while (bracket >= 0) {
        div.appendChild(document.createTextNode(line.substring(pos, bracket)));
        const close = line.indexOf(']', bracket);
        if (close < 0) throw new Error('Could not find close bracket.');
        const field = line.substring(bracket + 1, close);
        pos = close + 1;
        // Parse the field - (possibly-qualified) name, optional <>, :, values
        let match;
        if ((match = /^([a-zA-Z0-9_$.]*)(?:<([^>]*)>)?:(.*)$/.exec(field))) {
          const name = match[1];
          const range = match[2] || null;
          const initial = match[3].split(',');
          for (let i = 0; i < initial.length; i++) {
            const fieldName = initial.length > 1 ? name + '.' + i : name;
            const fieldValue = initial[i];
            if (i == initial.length - 1 && fieldValue == '') continue;
            const [obj, prop] = parseName(this, fieldName);
            obj[prop] = parseNum(fieldValue);
            const elem = document.createElement('input');
            elem.dataset.name = fieldName;
            if (range == 'checkbox') {
              elem.type = 'checkbox';
              elem.checked = !!obj[prop];
            } else {
              elem.value = fieldValue;
              elem.type = 'text';
              elem.dataset.fmt = fieldValue.length > 1 ? fieldValue[0] : '';
              elem.style.width = `${Math.max(2, elem.value.length)}em`;
              if (range) elem.dataset.range = range;
            }
            div.appendChild(elem);
          }
        } else if ((match = /^(#[^:]*):(.*)$/.exec(field))) {
          // It's a static-text link
          const anchor = document.createElement('a');
          anchor.href = match[1];
          anchor.textContent = match[2];
          div.appendChild(anchor);
        } else if ((match = /^@([0-9]+)x([0-9]+)\+([0-9]+)x([0-9]+)$/.exec(field))) {
          const [_, left, top, width, height] = match;
          // make an overlay element
          const overlay = document.createElement('div');
          const inner = document.createElement('div');
          overlay.appendChild(inner);
          overlay.classList.add('overlay');
          Object.assign(overlay.style, {
            left:   `${left}px`,
            top:    `${top}px`,
            width:  `${width}px`,
            height: `${height}px`,
          });
          this.canvas.parentElement.appendChild(overlay);
          div.dataset['overlay'] = overlayIndex;
          overlay.dataset['overlay'] = overlayIndex;
          overlayIndex++;
        } else {
          throw new Error(`Bad field spec: ${field}`);
        }
        bracket = line.indexOf('[', pos);
      }
      if (pos < line.length - 1) {
        div.appendChild(document.createTextNode(line.substring(pos)));
      }
      controls.appendChild(div);
    }
    replaceChildren(this.controls, controls);
  }

  handle(key, callback) {
    this.handlers[key] = callback;
  }

  draw(/** ImageBuffer */ buffer) {
    this.animated = null;
    if (this.scale) {
      const s = 2 / (this.scale + 2);
      const t = (1 - s) * 50;
      this.canvas.parentElement.style.transform = `translate(-${t}%,-${t}%) scale(${s})`;
    } else {
      this.canvas.parentElement.style.transform = '';
    }

    if (buffer.root) throw new Error('Cannot show subarray');
    if (!buffer.w || !buffer.h) return; // blank out the canvas?
    this.canvas.width = buffer.w;
    this.canvas.height = buffer.h;
    this.buffer = buffer.data.slice();
    for (const h of this.highlights) {
      h.apply(buffer.w, this.buffer);
    }
    const uint8 = new Uint8Array(this.buffer.buffer);
    const ctx = this.canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, buffer.w, buffer.h);
    data.data.set(uint8);
    ctx.putImageData(data, 0, 0);
  }

  highlight() {
    return new Highlight(this);
  }

  update() {
    throw new Error('abstract');
  }

  animate(f, manual = false) {
    // usage:
    //   update() {
    //     this.animate(f => {
    //       this.draw(...);
    //     });
    //   }
    let timer = 0;
    const animation = this.animated = {};
    const frame = () => {
      if (this.animated != animation) return;
      timer = (timer + 0xff) & 0xff;
      f(timer, (...args) => {
        this.draw(...args);
        this.animated = animation; // override draw
      });
      this.requestAnimationFrame(() => frame(), manual);
    };
    frame();
  }

  requestAnimationFrame(f, manual) {
    if (!manual) {
      requestAnimationFrame(f);
    } else {
      this.advanceAnimation = f;
    }
  }

  showFloater(x, y, text) {
    if (this.floater &&
        this.floater.parentElement != this.canvas.parentElement) {
      this.floater = null;
    }
    if (!this.floater) {
      this.floater = document.createElement('div');
      this.canvas.parentElement.appendChild(this.floater);
      this.floater.classList.add('floater');
    }
    this.floater.style.left = `${x + 16}px`;
    this.floater.style.top = `${y + 12}px`;
    const s = (this.scale + 2) / 2;
    this.floater.style.fontSize = `${100 * s}%`;
    
    //this.floater.style.width = `${Math.max(text.split('\n').map(x => x.length)) * 12}px`;
    //this.floater.style.height = `${(text.split('\n').length + 1) * 16}px`;

    this.floater.textContent = text;
  }

  mousemove(x, y) {}
}

class Highlight {
  constructor(v) {
    v.highlights.push(this);
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
  }

  move(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  apply(width, buffer) {
    for (let i = 0; i < this.w; i++) {
      buffer[width * this.y + this.x + i] ^= 0xffffff;
      buffer[width * (this.y + this.h - 1) + this.x + i] ^= 0xffffff;
    }
    for (let i = 0; i < this.h; i++) {
      buffer[width * (this.y + i) + this.x] ^= 0xffffff;
      buffer[width * (this.y + i) + this.x + this.h - 1] ^= 0xffffff;
    }
  }

  remove() {
    v.highlights.remove(this);
  }

}

const click = (v, e) => {
  if (e.target.tagName == 'INPUT' && e.target.dataset.name &&
      e.target.type == 'checkbox') {
    const [obj, prop] = parseName(v, e.target.dataset.name);
    obj[prop] = e.target.checked;
    v.update();
  }
};

const keyup = (v, e) => {
  if (v.element.offsetParent == null) return; // only handle if visible
  if (e.target.tagName == 'INPUT' && e.target.type == 'text' && e.target.dataset.name) {
    const [obj, prop] = parseName(v, e.target.dataset.name);
    let min = -Infinity;
    let max = Infinity;
    let step = 1;
    if (e.target.dataset.range) {
      let range = e.target.dataset.range.split(':');
      if (range.length == 2) range = [range[0], '1', range[1]];
      if (range[0] != '') min = parseNum(range[0]);
      step = parseNum(range[1]);
      if (range[2] != '') max = parseNum(range[2]);
    }

    let shouldUpdate = true;
    if (e.key == 'ArrowUp') {
      // note: could increment digit at position?!?
      obj[prop] = Math.min(obj[prop] + step, max);
    } else if (e.key == 'ArrowDown') {
      obj[prop] = Math.max(obj[prop] - step, min);
    } else if (e.key == 'Enter') {
      obj[prop] = Math.max(min, Math.min(parseNum(e.target.value), max));
    } else if (e.key == 'Escape') {
      shouldUpdate = false;
    } else {
      return;
    }
    switch (e.target.dataset.fmt) {
    case '$':
      e.target.value = '$' + obj[prop].toString(16);
      break;
    case '%':
      e.target.value = '%' + obj[prop].toString(2);
      break;
    case '0':
      e.target.value = obj[prop] ? '0' + obj[prop].toString(8) : '0';
      break;
    default:
      e.target.value = obj[prop].toString();
    }
    if (shouldUpdate) v.update({[e.target.dataset.name]: true});
  } else {
    if (e.key == 's') {
      if (v.scale == 4) {
        v.scale = 30;
      } else if (v.scale == 30) {
        v.scale = 0;
      } else {
        v.scale = (v.scale + 1) % 5;
      }
      v.update();
    } else if (e.key == 'l') {
      if (v.advanceAnimation) {
        const f = v.advanceAnimation;
        v.advanceAnimation = null;
        f();
      }
    } else if (e.key in v.handlers) {
      v.handlers[e.key].call(v, e);
    }
  }
};


const parseName = (view, name) => {
  const split = name.split('.');
  let obj = view.options;
  for (let i = 0; i < split.length - 1; i++) {
    const term = split[i];
    const num = /^[0-9]+$/.test(split[i + 1]);
    obj = (obj[term] || (obj[term] = (num ? [] : {})));
  }
  return [obj, split[split.length - 1]];
};

const parseNum = (x) => {
  if (x.startsWith('$')) {
    return Number.parseInt(x.substring(1), 16);
  } else if (x.startsWith('%')) {
    return Number.parseInt(x.substring(1), 2);
  } else if (x.startsWith('0')) {
    return Number.parseInt(x.substring(1) || x, 8);
  }
  return Number.parseInt(x);
};

// assumes the outer node is already compatible (and has children).
const replaceChildren = (target, source) => {
  let targetNext = target.firstChild;
  let sourceNext = source.firstChild;
  while (targetNext && sourceNext) {
    const targetChild = targetNext;
    const sourceChild = sourceNext;
    targetNext = targetChild.nextSibling;
    sourceNext = sourceChild.nextSibling;
    //if (targetChild.isEqualNode(sourceChild)) continue;
    if (!(targetChild instanceof Element && sourceChild instanceof Element) ||
        targetChild.tagName != sourceChild.tagName) {
      target.replaceChild(sourceChild, targetChild);
      continue;
    }
    if (targetChild.tagName == 'INPUT') {
      if (targetChild.type != sourceChild.type) {
        target.replaceChild(sourceChild, targetChild);
        continue;
      }
      targetChild.value = sourceChild.value;
    } else if (targetChild.tagName == 'A') {
      targetChild.href = sourceChild.href;
    }
    for (const key in targetChild.dataset) {
      if (!(key in sourceChild.dataset)) delete targetChild.dataset[key];
    }
    for (const key in sourceChild.dataset) {
      targetChild.dataset[key] = sourceChild.dataset[key];
    }
    replaceChildren(targetChild, sourceChild);
  }
  while (targetNext) {
    const targetChild = targetNext;
    targetNext = targetChild.nextSibling;
    target.removeChild(targetChild);
  }
  while (sourceNext) {
    const sourceChild = sourceNext;
    sourceNext = sourceChild.nextSibling;
    target.appendChild(sourceChild);
  }
};
