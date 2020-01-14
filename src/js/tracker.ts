// Item tracker for web.
// Uses flagset to figure out actual dependencies.

import {World} from './graph/world.js';
import {newFill, traverse} from './graph/shuffle.js';
import {Bits} from './bits.js';
import {FlagSet} from './flagset.js';
import {Rom} from './rom.js';
import {deterministic} from './pass/deterministic.js';

const ITEMS: string = `
sword-of-wind $00 sort-of-wind
sword-of-fire $01 sort-of-fire
sword-of-water $02 sort-of-water
sword-of-thunder $03 sort-of-thunder
windmill-key $32
statue-of-onyx $25 onyx-statue
insect-flute $27
key-to-prison $33 prison-key
flute-of-lime $28

ball-of-wind $05 orb-of-wind
ball-of-fire $07 orb-of-fire
ball-of-water $09 orb-of-water
ball-of-thunder $0b orb-of-thunder
kirisa-plant $3c carissa-plant
alarm-flute $31
fog-lamp $35
shell-flute $36
broken-statue $38
eye-glasses $37 eyeglasses
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
gas-mask $29 hazard-suit
shield-ring $30
iron-necklace $2c
leather-boots $2f speed-boots
power-ring $2a
warrior-ring $2b
deos-pendant $2d deo dio d-o t-o deal
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

const SLOTS: ReadonlyArray<readonly [number, number, number]> = [
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
  [0x14,  77,  2], // psycho shield
  [0x76,  70,  3], // psycho shield mimic 1
  [0x77,  84,  3], // psycho shield mimic 2
  [0x1b, 168, 96], // battle suit
  [0x1c, 199,110], // psycho armor
  [0x1d,  82, 95], // medical herb sealed cave
  [0x1e,  82,101], // antidote sealed cave
  [0x1f, 346,147], // lysis plant fog lamp
  [0x70, 346,153], // fog lamp mimic 1
  [0x71, 346,159], // fog lamp mimic 2
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
  [0x72, 320,130], // waterfall cave mimic
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
  [0x74, 115,  3], // mt hydra mimic
  [0x57,  70,  9], // medical herb styx
  [0x75,  84,  9], // styx 1 mimic
  [0x58,  32, 38], // magic ring karmine
  [0x79,  32, 16], // karmine mimic 1
  [0x7a,  40, 16], // karmine mimic 2
  [0x7b,  40, 38], // karmine mimic 3
  // 59 medical herb
  [0x5a, 161, 97], // fruit of power oasis cave (over water)
  [0x10, 327,123], // flute of lime chest (NOTE: changed 5b-> 10)
  [0x5c, 256, 79], // lysis plant evil spirit island
  [0x5d,  36,139], // lysis plant sabera level
  [0x5e,  14,229], // antidote mt sabre n
  [0x5f, 345,225], // antidote kirisa cave
  [0x60,  18, 94], // antidote fortess 3
  [0x61, 234, 96], // fruit of power vampire 2
  [0x62,  18,118], // fruit of power sabera level
  [0x63,  36, 54], // opel statue fortress 3
  [0x64, 175, 97], // fruit of power oasis cave
  [0x65, 139, 40], // magic ring mt hydra
  [0x66,  66,160], // fruit of repun sabera level
  // 67 magic ring
  // 68 magic ring
  [0x69, 131,201], // magic ring mt sabre w
  [0x6a,  76,226], // warp boots mt sabre w
  [0x6b,  18,100], // magic ring fortress 3 upper (behind)
  [0x6c, 193,103], // magic ring pyramid front
  [0x78, 199,103], // pyramid back mimic
  [0x6d, 205,103], // opel statue pyramid back
  [0x73, 256, 67], // iron necklace mimic
  [0x6e,  24, 38], // warp boots karmine
  [0x6f,  44, 97], // magic ring fortress 3 lower
];

// non-unique key item slots
const KEY = new Set([0x10, 0x12, 0x23, 0x26, 0x61]);

const BOSSES = new Map([
  [~0x100, 0x2e], // rabbit boots slot -> vampire 1
  [~0x101, 0x07], // ball of fire slot -> insect
  [~0x102, 0x08], // flame bracelet slot -> kelbesque 1
  [~0x103, 0x09], // ball of water slot -> rage
  [~0x104, 0x38], // broken statue slot -> sabera 1
  [~0x105, 0x0b], // ball of thunder slot -> mado 1
  [~0x106, 0x26], // opel statue slot -> kelbesque 2
  [~0x107, 0x23], // fruit of repun slot -> sabera 2
  [~0x108, 0x12], // sacred shield slot -> mado 2
  [~0x109, 0x3d], // ivory statue slot -> karmine
  [~0x10a, 0x1c], // psycho armor slot -> draygon 1
  // [, ~0x10b], // draygon 2
  [~0x10c, 0x61], // fruit of power slot -> vampire 2
]);

// slots that come from trade-ins
//  - note: the fog lamp trade-in doesn't have a good slot for this
// TODO - add "traded fog lamp" to items, add a box for it.
// TODO - count number of traded boxes checked, set rest to blocked if
//        <= number of items already traded in...?
// TODO - find-and-replace for tornel's item after the fact??
const TRADES = new Set([0x29, 0x3e, 0x44, 0x47, 0x48]);

// TODO - add extra indirection for walls in overlay if tracking
//  - one for each separate region... how to keep track of that?
//  - then keep them as items...?  bosses?  maybe just hardcode
//    the linkages?  or just add all walls as items and link them
//    directly here... - that might be better.

// x, y, ...flags
// const WALLS: [number, number, ...number] = [];

class Graph {
  /** map from id to slot index */
  readonly slots = new Map<number, number>();
  /** map from id to item index */
  readonly items = new Map<number, number>();
  /** map from slot index to element */
  readonly slotElts = new Map<number, HTMLElement>();
  /** map from item index to element */
  //readonly itemElts = new Map<number, HTMLElement>();
  /** set of slot index */
  //readonly checked = new Set<number>();
  // /** map from slot id to node */
  // readonly nodeFromSlot = new Map<number, any>();
  // readonly nodes = new Map<any, any>();
  /** Maps item index to whether item is gotten */
  has: Bits = Bits.of();
  /** only used for clearing: set of item index we just assume */
  readonly always: Bits;

  readonly grid: Element;
  readonly map: Element;
  readonly names = new Map<string, HTMLElement>();

  recognition?: SpeechRecognition;

  unusedItems: number;

  constructor(readonly rom: Rom,
              readonly world: World,
              readonly flags: FlagSet) {
    // TODO - compute two depgraphs: one with glitches and one without
    //  - then we can show green vs yellow for glitchable locations..?

    (window as any).GRAPH = this;

    this.grid = document.getElementsByClassName('grid')[0];
    this.map = document.getElementsByClassName('map')[0];

    let always = Bits.of();

    for (const {item: id, index} of world.graph.slots) {
      if (id == null) continue; // throw new Error(`bad slot: ${index}`);
      this.slots.set(id, index);
    }
    for (const {item: id, index} of world.graph.items) {
      if (id == null) continue; // throw new Error(`bad item: ${index}`);
      this.items.set(id, index);
      const item = rom.items[id];
      // TODO - setup always from non-added items?
      if (item && !item.unique) always = Bits.with(always, index);
    }
    this.unusedItems = world.graph.items.length;

    this.has = this.always = always;

      // this.nodes.set(n.uid, n.name);
      // this.route[n.uid] = 4;
      // if (n instanceof Slot) {
      //   // used by addBox
      //   if (!n.isMimic()) {
      //     this.nodeFromSlot.set(n.slotIndex, n);
      //   }
      //   // not shown, just assume have it
      //   if (n.name == 'Alarm Flute' || n.name == 'Medical Herb') {
      //     this.always.add(n.item.uid);
      //     this.route[n.item.uid] = 0;
      //   }
      // } else if (n instanceof Location) {
      //   // find the mimics, they need special handling because
      //   // they all map to the same slot ID...
      //   for (const chest of n.chests) {
      //     if (chest.isMimic()) {
      //       this.mimicSlots.set(n.id << 8 | chest.spawnSlot, chest);
      //     }
      //   }
      // } else if (n instanceof TrackerNode) {
      //   const index = this.depgraph.uidToItem[n.uid];
      //   if (index == null) continue;
      //   let color = 4;
      //   if (n.type === TrackerNode.OFF_ROUTE) color = 1;
      //   if (n.type === TrackerNode.GLITCH) color = 2;
      //   if (n.type === TrackerNode.HARD) color = 3;
      //   this.route[n.uid] = color;
      // }

    const toggle = (e: Event) => {
      let t = e.target as HTMLElement|null;
      while (t && !t.dataset['index']) {
        t = t.parentElement;
      }
      if (!t) return;
      this.toggle(t);
      e.preventDefault();
    };

    this.grid.addEventListener('click', toggle);
    //this.map.addEventListener('click', toggle);
  }

  toggle(t: HTMLElement, val?: boolean) {
    const uid = Number(t.dataset['index']);
    const has = t.classList.toggle('got');
    if (t.dataset['item']) {
      this.has = has ?
          Bits.with(this.has, uid) :
          Bits.without(this.has, uid);
    }
    this.update();
  }

  addSlot(slotId: number, x: number, y: number) {
    const index = this.slots.get(slotId);
    if (index == null) { debugger; throw new Error(); }
    const div = document.createElement('div');
    const itemget = this.rom.itemGets[slotId];
    const item = itemget && this.rom.items[itemget.itemId];
    // make some boxes bigger; quick hack to avoid unique armors
    if (item && item.unique || KEY.has(slotId)) {
      div.classList.add('key');
      x--; y--;
    }
    x--; y--;
    div.dataset['index'] = String(index);
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    //div.textContent = '\xa0';
    const inner = document.createElement('div');
    div.appendChild(inner);
    inner.textContent =
        slotId >= 0x70 ?
            'Mimic' :
            this.rom.items[itemget.itemId].messageName.replace(' ', '\xa0');
    if (this.flags.randomizeTrades() && TRADES.has(slotId)) {
      div.classList.add('boss');
    }
    this.slotElts.set(index, div);
    this.map.appendChild(div);
  }

  addItem(cls: string, id: string, ...otherNames: string[]) {
    // parse the hex, removing $ prefix
    const uid = Number.parseInt(id.substring(1), 16);
    const outer = document.getElementsByClassName(cls)[0] as HTMLElement;
    const inner = document.createElement('div');
    outer.appendChild(inner);
    let index = this.items.get(uid);
    if (index == null) {
      // Items that don't block anything won't have shown up yet.
      this.items.set(uid, index = this.unusedItems++);
    }
    outer.dataset['index'] = String(index);
    outer.dataset['item'] = String(index);
    //this.slotElts.set(index, outer);
    this.names.set(cls.replace(/-/g, ' '), outer);
    for (const name of otherNames) {
      this.names.set(name.replace(/-/g, ' '), outer);
    }
  }

  addExtraFlags() {
    const g = this.world.graph;
    for (const slot of g.slots.slice(g.fixed)) {
      const c = slot.condition;
      const bossSlot = BOSSES.get(c);
      const replaced = bossSlot && this.slots.get(bossSlot);
      if (replaced == null) continue;
      const elt = this.slotElts.get(replaced);
      if (elt == null) throw new Error('expected');
      this.slotElts.delete(Number(elt.dataset['index']));
      this.slotElts.set(slot.index, elt);
      elt.classList.add('boss');
      elt.dataset['index'] = String(slot.index);
      elt.dataset['item'] = String(slot.index);
    }
  }

  update() {
    for (const elt of this.slotElts.values()) {
      elt.dataset['state'] = elt.classList.contains('got') ? '' : 'blocked';
    }
    for (const slot of traverse(this.world.graph, newFill(), this.has)) {
      // figure out whether it's available or not
      // TODO - consider having multiple worlds, for glitched/hard?
      //      -> adjust flags to add all glitches/hard mode
      const elt = this.slotElts.get(slot);
      if (elt && !elt.classList.contains('got')) {
        elt.dataset['state'] = 'available';
      }
    }
  }

  addVoiceRecognition() {
    try {
      let stopped = false;
      const rec = this.recognition = new SpeechRecognition();
      const grammar = new SpeechGrammarList();
      grammar.addFromString(`
          #JSGF V1.0;
          grammar items;
          public <item> = ${[...this.names.keys()].join(' | ')};
          public <command> = hey tracker track <item>;
      `, 1);
      rec.grammars = grammar;
      rec.interimResults = false;
      //rec.continuous = true;
      rec.maxAlternatives = 10;
      rec.onstart = () => { stopped = false; };
      rec.onresult = (e) => {
        const result = e.results[e.results.length - 1];
        if (!result.isFinal) return;
        let matched = false;
        for (const alt of result) {
          const command = alt.transcript.toLowerCase().replace(/[^a-z ]/g, '');
          if (command === 'stop listening') stopped = true;
          const match = /([auo][nm] ?)?tr[au]c?k?(?:ed)? ?(.+)/.exec(command);
          if (!match) continue;
          //console.log(`attempt: ${match[2]}`);
          const el = this.names.get(match[2]);
          if (!el) continue;
          this.toggle(el, !match[1]);
          matched = true;
          break;
        }
        if (!matched) {
          console.log(`No match: ${[...result].map(
                                   r => r.transcript).join(', ')}`);
        }
        rec.stop(); // gecko doesn't support continuous?
      };
      rec.onend = () => { if (!stopped) rec.start(); };
      rec.start();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
}

function polyfill(...names: string[]) {
  const win = window as any;
  for (let n of names) {
    if (typeof win[n] === 'function') {
      win[names[0]] = win[n];
      return;
    }
  }
  console.error(`Could not polyfill ${names[0]}`);
}
polyfill('SpeechRecognition', 'webkitSpeechRecognition');
polyfill('SpeechGrammarList', 'webkitSpeechGrammarList');



// function isSlot(x: number): boolean {
//   return (x & ~0x7f) === 0x100;
// }

// TODO - all G flags get the glitch for free
//      - all others (minus wild warp if disabled) tracked as glitches
//      - consider dark yellow and dark green as well as dark blue ??

let voice = false;
let flags = 'Rlpt Tb';
for (const arg of location.hash.substring(1).split('&')) {
  const [key, value] = arg.split('=');
  if (key === 'flags') {
    flags = decodeURIComponent(value);
  }
  if (key === 'voice') {
    voice = true;
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

async function main() {
  const rom = await Rom.load();
  const flagset = new FlagSet(flags);
  deterministic(rom, flagset); // make deterministic changes
  const world = World.build(rom, flagset, true); // + ' Dt'));
  const graph = new Graph(rom, world, flagset);
  for (let item of ITEMS.split('\n')) {
    item = item.replace(/#.*/, '').trim();
    if (!item) continue;
    graph.addItem(...(item.split(/ +/g) as [string, string, ...string[]]));
  }
  for (const slot of SLOTS) {
    graph.addSlot(...slot);
  }
  graph.addExtraFlags();
  graph.update();

  document.getElementById('toggle-map')!.addEventListener('click', () => {
    graph.map.classList.toggle('hidden');
  });
  document.getElementById('clear-all')!.addEventListener('click', () => {
    for (const e of graph.grid.querySelectorAll('.got')) {
      e.classList.remove('got');
    }
    graph.has = graph.always;
    graph.update();
  });
  if (voice) graph.addVoiceRecognition();
  (window as any).graph = graph;
};

//function die(): never { throw new Error('Assertion failed'); }

main();
