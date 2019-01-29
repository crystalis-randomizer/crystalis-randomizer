// Item tracker for web.
// Uses flagset to figure out actual dependencies.

import {generate} from './depgraph2.js';

const BOXES = `
sword-of-wind $00 WIND
sword-of-fire $01 FIRE
sword-of-water $02 WATER
sword-of-thunder $03 THUN
windmill-key $32 MILL
statue-of-onyx $25 ONYX
insect-flute $27 INSECT
key-to-prison $33 PRISON
flute-of-lime $28 LIME
flute-of-lime $5b LIME

ball-of-wind $05 
ball-of-fire $07
ball-of-water $09
ball-of-thunder $0b
kirisa-plant $3c KIRISA
fog-lamp $35 FOG
shell-flute $36 SHELL
broken-statue $38 BRKN
eye-glasses $37 EYE
glowing-lamp $39 GLOW

tornado-bracelet $06
flame-bracelet $08
blizzard-bracelet $0a
storm-bracelet $0c
love-pendant $3b LOVE
key-to-styx $34 STXY
opel-statue $26 OPEL
fruit-of-repun $23 REPUN
sacred-shield $12 SCRD
ivory-statue $3d IVORY

rabbit-boots $2e RABBIT
gas-mask $29 GAS
shield-ring $30 SHIELD
iron-necklace $2c IRON
leather-boots $2f LTHR
power-ring $2a POWER
warrior-ring $2b WARR
deos-pendant $2d DEO
bow-of-moon $3e MOON
bow-of-sun $3f SUN

refresh $41
paralysis $42
telepathy $43
teleport $44
recover $45
barrier $46
change $47
flight $48
psycho-armor $1c PSYCH
bow-of-truth $40 TRUTH
`;

class Graph {
  constructor(graph) {
    // TODO - compute two depgraphs: one with glitches and one without
    //  - then we can show green vs yellow for glitchable locations
    this.depgraph = graph.integrate();
    this.slotElts = new Map(); // map from slot uid to element
    this.itemElts = new Map(); // map from item uid to element
    this.has = new Set();      // set of item uid
    this.checked = new Set();  // set of slot uid
    this.grid = document.getElementsByClassName('grid')[0];
    this.nodeFromSlot = new Map();  // map from slot id to node

    for (const slot of graph.slots()) {
      // used by addBox
      this.nodeFromSlot.set(slot.index, slot);
      if (slot.name == 'Alarm Flute' || slot.name == 'Medical Herb') {
        this.has.add(slot.item.uid);
      }
    }

    const toggle = (e) => {
      let t = e.target;
      const key = e.button ? 'slot' : 'item';
      const set = e.button ? this.checked : this.has;
      while (t && !t.dataset[key]) {
        t = t.parentElement;
      }
      if (!t) return;
      const uid = t.dataset[key];
      if (set.has(uid)) {
        set.delete(uid);
      } else {
        set.add(uid);
      }
      if (!e.button) {
        t.classList.toggle('got', set.has(uid));
      }
      this.update();
      e.preventDefault();
    };

    this.grid.addEventListener('click', toggle);
    this.grid.addEventListener('contextmenu', toggle);
  }

  addBox(cls, id, gloss = '') {
    // parse the hex, removing $ prefix
    id = Number.parseInt(id.substring(1), 16);
    const outer = document.createElement('div');
    outer.classList.add('slot');
    const inner = document.createElement('div');
    outer.classList.add(cls);
    if (gloss) {
      const glossDiv = document.createElement('div');
      glossDiv.textContent = gloss;
      inner.appendChild(glossDiv);
    }
    outer.appendChild(inner);
    this.grid.appendChild(outer);
    const slot = this.nodeFromSlot.get(id);
    outer.dataset['slot'] = slot.uid;
    outer.dataset['item'] = slot.item.uid;
    this.slotElts.set(slot.uid, outer);
    this.itemElts.set(slot.item.uid, outer);
  }

  update() {
    for (const [uid, elt] of this.slotElts) {
      elt.classList.remove('checked');
      elt.classList.remove('blocked');
      elt.classList.remove('available');
      if (this.checked.has(uid)) {
        // no work, it's already checked
        elt.classList.add('checked');
      } else {
        // figure out whether it's available or not
        let available = false;
        for (const alternative of this.depgraph.graph.get(uid).values()) {
          if ([...alternative].every(dep => this.has.has(dep))) {
            available = true;
            break;
          }
        }
        elt.classList.add(available ? 'available' : 'blocked');
      }
    }
  }
}

const OPTS = {
  'speed-boots': true,
  'glitch-ghetto-flight': true,
  'glitch-talk': true,
  'route-no-free-barrier': true,
  'route-shyron-teleport': true,
  'route-early-flight': true,
  'tracker': true,
};

const graph = new Graph(generate(OPTS));
for (let box of BOXES.split('\n')) {
  box = box.trim();
  if (!box) continue;
  graph.addBox(...box.split(/ +/g));
}
graph.update();
