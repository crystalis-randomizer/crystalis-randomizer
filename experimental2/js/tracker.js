// Item tracker for web.
// Uses flagset to figure out actual dependencies.

import {generate} from './depgraph.js';
import {Bits} from './bits.js';
import {FlagSet} from './flagset.js';
import {Location, Slot, TrackerNode} from './nodes.js';

const BOXES = `
sword-of-wind $00
sword-of-fire $01
sword-of-water $02
sword-of-thunder $03
windmill-key $32
statue-of-onyx $25
insect-flute $27
key-to-prison $33
flute-of-lime $28

ball-of-wind $05 
ball-of-fire $07
ball-of-water $09
ball-of-thunder $0b
kirisa-plant $3c
alarm-flute $31
fog-lamp $35
shell-flute $36
broken-statue $38
eye-glasses $37
glowing-lamp $39

tornado-bracelet $06
flame-bracelet $08
blizzard-bracelet $0a
storm-bracelet $0c
love-pendant $3b
key-to-styx $34
opel-statue $26
sacred-shield $12
ivory-statue $3d

rabbit-boots $2e
gas-mask $29
shield-ring $30
iron-necklace $2c
leather-boots $2f
power-ring $2a
warrior-ring $2b
deos-pendant $2d
bow-of-moon $3e
bow-of-sun $3f

refresh $41
paralysis $42
telepathy $43
teleport $44
recover $45
barrier $46
change $47
flight $48
psycho-armor $1c
bow-of-truth $40
`;

const SLOTS = [
  [0x00, 121,192], // sword of wind
  [0x01, 274,176], // sword of fire
  [0x02, 335,123], // sword of water
  [0x03,  77, 10], // sword of thunder
  [0x05,  89,107], // ball of wind
  [0x06, 115,224], // tornado bracelet
  [0x07, 282,187], // ball of fire
  [0x08,  47,182], // flame bracelet
  [0x09, 251,232], // ball of water
  [0x0a, 206,249], // blizzard bracelet
  [0x0b,  83, 63], // ball of thunder
  [0x0c,  23,  9], // storm bracelet
  [0x12,  49, 48], // sacred shield
  [0x14,  77,  3], // psycho shield
  [0x70,  71,  3, 0x89, 0x14], // psycho shield mimic 1
  [0x70,  83,  3, 0x89, 0x15], // psycho shield mimic 2
  [0x1b, 168, 97], // battle suit
  [0x1c, 199,110], // psycho armor
  [0x1d,  82, 95], // medical herb sealed cave
  [0x1e,  82,101], // antidote sealed cave
  [0x1f, 346,147], // lysis plant fog lamp
  [0x70, 346,153, 0x4a, 0x15], // fog lamp mimic 1
  [0x70, 346,159, 0x4a, 0x16], // fog lamp mimic 2
  [0x20, 126, 52], // fruit of lime mt hydra
  [0x21, 227, 97], // fruit of power sabera palace
  [0x22, 256, 73], // magic ring evil spirit island
  [0x23,  58,115], // fruit of repun sabera 2
  [0x24,  82,113], // warp boots sealed cave
  [0x25, 189,180], // statue of onyx
  [0x26,  18,172], // opel statue
  [0x27, 267,185], // insect flute
  [0x28, 275,147], // flute of lime
  [0x29, 147,206], // gas mask
  [0x2a, 172,104], // power ring
  [0x2b, 203,  5], // warrior ring
  [0x2c, 249, 69], // iron necklace
  [0x2d, 191,110], // deos pendant
  [0x2e,  89, 99], // rabbit boots
  [0x2f, 164,104], // leather boots
  [0x30, 319,123], // shield ring
  [0x70, 320,130, 0x54, 0x13], // waterfall cave mimic
  // 31 alarm flute
  [0x32, 105, 94], // windmill key
  [0x33,  64,198], // key to prison
  [0x34,  83, 71], // key to styx
  [0x35, 345,140], // fog lamp
  [0x36, 301,119], // shell flute
  [0x37, 233,118], // eye glasses
  [0x38, 234, 88], // broken statue
  [0x39, 295, 92], // glowing lamp
  // 3a statue of gold
  [0x3b, 274,117], // love pendant
  [0x3c, 338,226], // kirisa plant
  [0x3d,  23, 17], // ivory statue
  [0x3e, 206,241], // bow of moon
  [0x3f, 101,  6], // bow of sun
  [0x40, 207,110], // bow of truth
  [0x41,  92,117], // refresh
  [0x42, 279,126], // paralysis
  [0x43, 202,138], // telepathy
  [0x44, 124,202], // teleport
  [0x45, 304,128], // recover
  [0x46, 248, 35], // barrier
  [0x47, 277,  3], // change
  [0x48,  15, 25], // flight
  [0x50,  82,107], // medical herb sealed cave front
  // 51 sacred shield
  [0x52, 134,219], // medical herb mt sabre w
  [0x53,  59,219], // medical herb mt sabre n
  [0x54,  52, 55], // magic ring fortress 3 upper
  [0x55, 241, 97], // medical herb sabera palace
  [0x56, 123, 23], // medical herb mt hydra
  [0x70, 115,  3, 0x85, 0x17], // mt hydra mimic
  [0x57,  70,  9], // medical herb styx
  [0x70,  84,  9, 0x89, 0x13], // styx 1 mimic
  [0x58,  32, 38], // magic ring karmine
  [0x70,  32, 16, 0xb5, 0x0d], // karmine mimic 1
  [0x70,  40, 16, 0xb5, 0x0e], // karmine mimic 2
  [0x70,  40, 38, 0xb5, 0x0f], // karmine mimic 3
  // 59 medical herb
  [0x5a, 162, 97], // fruit of power oasis cave (over water)
  [0x10, 327,123], // flute of lime chest (NOTE: changed 5b-> 10)
  [0x5c, 256, 79], // lysis plant evil spirit island
  [0x5d,  36,139], // lysis plant sabera level
  [0x5e,  14,229], // antidote mt sabre n
  [0x5f, 345,225], // antidote kirisa cave
  [0x60,  18, 94], // antidote fortess 3
  [0x61, 234, 96], // fruit of power vampire 2
  [0x62,  18,118], // fruit of power sabera level
  [0x63,  36, 54], // opel statue fortress 3
  [0x64, 174, 97], // fruit of power oasis cave
  [0x65, 139, 40], // magic ring mt hydra
  [0x66,  66,160], // fruit of repun sabera level
  // 67 magic ring
  // 68 magic ring
  [0x69, 131,201], // magic ring mt sabre w
  [0x6a,  76,226], // warp boots mt sabre w
  [0x6b,  18,100], // magic ring fortress 3 upper (behind)
  [0x6c, 193,103], // magic ring pyramid front
  [0x70, 199,103, 0xa3, 0x0d], // pyramid back mimic
  [0x6d, 205,103], // opel statue pyramid back
  [0x70, 256, 67, 0x6b, 0x0e], // iron necklace mimic
  [0x6e,  24, 38], // warp boots karmine
  [0x6f,  44, 97], // magic ring fortress 3 lower
];

class Graph {
  constructor(graph) {
    // TODO - compute two depgraphs: one with glitches and one without
    //  - then we can show green vs yellow for glitchable locations
    this.depgraph = graph.integrate({tracker: true});
    this.slotElts = new Map(); // map from slot uid to element
    this.itemElts = new Map(); // map from item uid to element
    this.always = new Set();   // only used for clearing
    this.checked = new Set();  // set of slot uid
    this.grid = document.getElementsByClassName('grid')[0];
    this.map = document.getElementsByClassName('map')[0];
    this.nodeFromSlot = new Map();  // map from slot id to node
    this.mimicSlots = new Map();    // location and spawn to node
    this.nodes = new Map();

    /**
     * Maps uid to status: 0 = has, 1-3 = off-route, 4 = blocked
     * @const {!Array<number>}
     */
    this.route = [];

    for (const n of graph.nodes) {
      this.nodes.set(n.uid, n.name);
      this.route[n.uid] = 4;
      if (n instanceof Slot) {
        // used by addBox
        if (!n.isMimic()) {
          this.nodeFromSlot.set(n.slotIndex, n);
        }
        // not shown, just assume have it
        if (n.name == 'Alarm Flute' || n.name == 'Medical Herb') {
          this.always.add(n.item.uid);
          this.route[n.item.uid] = 0;
        }
      } else if (n instanceof Location) {
        // find the mimics, they need special handling
        for (const chest of n.chests) {
          if (chest.isMimic()) {
            this.mimicSlots.set(n.id << 8 | chest.spawnSlot, chest);
          }
        }
      } else if (n instanceof TrackerNode) {
        const index = this.depgraph.uidToItem[n.uid];
        if (index == null) continue;
        let color = 4;
        if (n.type === TrackerNode.OFF_ROUTE) color = 1;
        if (n.type === TrackerNode.GLITCH) color = 2;
        if (n.type === TrackerNode.HARD) color = 3;
        this.route[n.uid] = color;
      }
    }

    const toggle = (e, slot) => {
      slot = slot || !!e.button;
      let t = e.target;
      const key = slot ? 'slot' : 'item';
      while (t && !t.dataset[key]) {
        t = t.parentElement;
      }
      if (!t) return;
      const uid = Number(t.dataset[key]);
      if (slot && e.shiftKey) {
        showReqs(uid);
        return;
      }
      if (slot) {
        if (this.checked.has(uid)) {
          this.checked.delete(uid);
        } else {
          this.checked.add(uid);
        }
      } else {
        this.route[uid] = 4 - this.route[uid];
      }
      if (!slot) {
        t.classList.toggle('got', !this.route[uid]);
      }
      this.update();
      e.preventDefault();
    };

    const reqs = document.getElementById('reqs');
    const clearReqs = () => {
      reqs.dataset['showing'] = '';
      while (reqs.children.length) reqs.children[0].remove();
    };

    this.grid.addEventListener('click', e => toggle(e, false));
    this.grid.addEventListener('contextmenu', toggle);
    this.map.addEventListener('click', e => toggle(e, true));

    const showReqs = (uid) => {
      if (Number(reqs.dataset['showing']) == uid) return;
      clearReqs();
      reqs.dataset['showing'] = uid;
      const top = document.createElement('span');
      top.textContent = `${this.nodes.get(uid)} requires`;
      reqs.appendChild(top);
      const ul = document.createElement('ul');
      reqs.appendChild(ul);
      const alts = [];
      for (const alt of this.depgraph.routes[this.depgraph.uidToLocation[uid]]) {
        let level = 0;
        const li = document.createElement('li');
        const parts = [];
        for (const bit of Bits.bits(alt)) {
          const dep = this.depgraph.itemToUid[bit];
          level = Math.max(level, this.route[dep]);
          parts.push(this.nodes.get(dep));
        }
        li.textContent = parts.join(' AND ');
        li.classList.add(['available', 'off-route', 'glitched', 'hard', 'blocked'][level]);
        alts.push([li, level]);
      }
      alts.sort((a, b) => (a[1] - b[1]) || (a[0].textContent.length - b[0].textContent.length));
      for (const alt of alts) ul.appendChild(alt[0]);
    };
  }

  addSlot(index, x, y, loc, spawn) {
    const mimic = index >= 0x70;
    const slot =
        !mimic ?
            this.nodeFromSlot.get(index) :
            this.mimicSlots.get(loc << 8 | spawn);
    if (!slot) debugger;
    const div = document.createElement('div');
    if (slot.slotType == 'key' ||
        slot.slotType == 'magic' ||
        slot.slotType == 'bonus') {
      div.classList.add('key');
      x--; y--;
    }
    x--; y--;
    div.dataset['slot'] = slot.uid;
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    //div.textContent = '\xa0';
    const inner = document.createElement('div');
    div.appendChild(inner);
    inner.textContent = mimic ? 'Mimic' : slot.name.replace(' ', '\xa0');
    this.slotElts.set(slot.uid, div);
    this.map.appendChild(div);
  }

  addBox(cls, id) {
    // parse the hex, removing $ prefix
    id = Number.parseInt(id.substring(1), 16);
    const outer = document.getElementsByClassName(cls)[0];
    const inner = document.createElement('div');
    outer.appendChild(inner);
    const slot = this.nodeFromSlot.get(id);
    outer.dataset['slot'] = slot.uid;
    outer.dataset['item'] = slot.item.uid;
    //this.slotElts.set(slot.uid, outer);
    this.itemElts.set(slot.item.uid, outer);
  }

  update() {
    main:
    for (const [uid, elt] of this.slotElts) {
      elt.classList.remove('checked');
      elt.classList.remove('blocked');
      elt.classList.remove('available');
      elt.classList.remove('glitched');
      elt.classList.remove('off-route');
      elt.classList.remove('hard');
      if (this.checked.has(uid)) {
        // no work, it's already checked
        elt.classList.add('checked');
      } else {
        // figure out whether it's available or not
        let minLevel = 4;
        for (const alternative of this.depgraph.routes[this.depgraph.uidToLocation[uid]]) {
          let level = 0;
          for (const dep of Bits.bits(alternative)) {
            level = Math.max(level, this.route[this.depgraph.itemToUid[dep]]);
            if (!(level < 4)) break;
          }
          minLevel = Math.min(minLevel, level);
          if (!minLevel) break;
        }
        elt.classList.add(
            ['available', 'off-route', 'glitched', 'hard', 'blocked'][minLevel]);
      }
    }
  }
}

// TODO - all G flags get the glitch for free
//      - all others (minus wild warp if disabled) tracked as glitches
//      - consider dark yellow and dark green as well as dark blue ??

let flags = 'Rlpt Ts';
for (const arg of location.hash.substring(1).split('&')) {
  const [key, value] = arg.split('=');
  if (key === 'flags') {
    flags = decodeURIComponent(value);
  }
}
//   'speed-boots': true,
//   'glitch-ghetto-flight': true,
//   'glitch-talk': true,
//   'route-no-free-barrier': true,
//   'route-shyron-teleport': true,
//   'route-early-flight': true,
//   'tracker': true,
// };

const graph = new Graph(generate(new FlagSet(flags + ' Dt')));
for (let box of BOXES.split('\n')) {
  box = box.replace(/#.*/, '').trim();
  if (!box) continue;
  graph.addBox(...box.split(/ +/g));
}
for (const slot of SLOTS) {
  graph.addSlot(...slot);
}
graph.update();

document.getElementById('toggle-map').addEventListener('click', () => {
  graph.map.classList.toggle('hidden');
});
document.getElementById('clear-all').addEventListener('click', () => {
  for (let i = 0; i < graph.route.length; i++) {
    if (graph.route[i] == 0) graph.route[i] = graph.always.has(i) ? 0 : 4;
  }
  graph.checked.clear();
  graph.update();
  for (const element of document.querySelectorAll('.slot.got')) {
    element.classList.remove('got');
  }
});
