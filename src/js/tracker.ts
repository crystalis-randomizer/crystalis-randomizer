// Item tracker for web.
// Uses flagset to figure out actual dependencies.

// TODO - consider using annyang for speech recognition?

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
key-to-prison $33 prison-key key-2-prison
flute-of-lime $28

ball-of-wind $05 orb-of-wind
ball-of-fire $07 orb-of-fire
ball-of-water $09 orb-of-water
ball-of-thunder $0b orb-of-thunder
kirisa-plant $3c
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
key-to-styx $34 key-2-styx
opel-statue $26
sacred-shield $12
ivory-statue $3d

rabbit-boots $2e
gas-mask $29 hazard-suit hazmat-suit
shield-ring $30
iron-necklace $2c
leather-boots $2f speed-boots
power-ring $2a
warrior-ring $2b
deos-pendant $2d deo
bow-of-moon $3e moon
bow-of-sun $3f sun

refresh $41
paralysis $42
telepathy $43
teleport $44
recover $45
barrier $46
change $47
flight $48
psycho-armor $1c
bow-of-truth $40 truth
`;

const voiceReplacements: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bketostix\b/, 'key 2 styx'],
  [/\bketo\b/, 'key 2'],
  [/\b(sticks|stick c|stix e|stick sea|dixie|sticks e|stick see|sexy|60|sixty)\b/,
   'styx'],
  [/\b(arraylist|gorilla[sz]|aurelius|h?airless|a realist|arl[eiy]ss?)\b/,
   'aryllis'],
  [/\b(amazon us|amazon[ae]?ss?|amazon)\b/, 'amazones'],
  [/\bamazones basement\b/, 'aryllis basement'],
  [/\b(deal|dil|diehl)\b/, 'deo'],
  [/\b(ds|deals|diaz|delos|drose|theos)\b/, 'deos'],
  [/\bone\b/, '1'],
  [/\b(two|ii|to|too)\b/, '2'],
  [/\bthree\b/, '3'],
  [/\bfour\b/, '4'],
  [/\bar[ck]s tom\b/, 'ark stom'],
  [/\borbit\b/, 'orb of'],
  [/^(contract|amtrack|ontra(c|k|ck))\b/, 'untrack'],
  [/^((ch|tr)[eu](c|k|ck))\b/, 'track'],
  [/^track ?suit\b/, 'track flute'],
  [/\b(lyme)\b/, 'lime'],
  [/marked\b/, 'mark'],
  [/^(marc|mach|smart|[bp]ark)\b/, 'mark'],
  [/\blee felder\b/, 'leaf elder'],
  [/^markley f/, 'mark leaf '],
  [/^(mark of|market)\b/, 'mark'],
  [/\bleif\b/, 'leaf'],
  [/\beldar\b/, 'elder'],
  [/\blight\b/, 'flight'],
  [/\bmann\b/, 'moon'],
  [/\bbosemann?\b/, 'bow of moon'],
  [/\b(certifier|start a fire)\b/, 'sword of fire'],
  [/\bwhen milky\b/, 'windmill key'],
  [/^(4 clear|faux clear|folklore|so ?clear|pho clear)\b/, 'full clear'],
  [/\b(mayo|meto|nato|mader|meadow|matter|ma[dt]er|motto|model)\b/, 'mado'],
  [/\bcalvey\b/, 'kelby'],
  [/\b(kelbyone|lv ?1)\b/, 'kelby 1'],
  [/\blv ?2\b/, 'kelby 2'],
  [/\b(carmine|carmen|combine)\b/, 'karmine'],
  [/\b(dra[gk][ao]n)\b/, 'draygon'],
  [/\b([cs][ae][bdgv][aeiu]*r[ae]|xavier)\b/, 'sabera'],
  [/\b(wright|rite|write)\b/, 'right'],
  [/\b([ck]or[bd]el[le]?|quadrel)\b/, 'cordel'],
  [/\b(hotel desk|(bel)?l desk|kill basque|kehl basc|caleb ask(ed)?)\b/,
   'kelby'],
  [/\b(porter|port[eo]la|porto a)\b/, 'portoa'],
  [/\b(athena|cena|tina|isina|esquina)\b/, 'asina'],
  [/\b((at the|ec[hk]o) hann?ah?|alcohol(ic)?)\b/, 'akahana'],
  [/\b((roca|broke[nr]|brokaw|barr?oca) hann?ah?|bro k[ao]h[ao]na|pokehana)\b/,
   'brokahana'],
  [/\b(stoned)\b/, 'stone'],
  [/\b(guards)\b/, 'guard'],
  [/\b(window)\b/, 'windmill'],
  [/\b(sa[bv][eo]r)\b/, 'sabre'],
  [/\bsabre south\b/, 'sabre west'],
  [/\b(hebrew|cebu|sebba|zabel)\b/, 'zebu'],
  [/\b([bct]([aou]r|r[aou])nn?ell?)\b/, 'tornel'],
  [/\b(clarke)\b/, 'clark'],
  [/\bsabera 1 left\b/, 'sabera fortress left'],
  [/\bsabera 1 right\b/, 'sabera fortress right'],
  [/\b(cantu|cancel|can sue|kincer|kenzo|cancer)\b/, 'kensu'],
  [/\b(light house)\b/, 'lighthouse'],
  [/\bkensu(?: in)? (lighthouse|swan)\b/, '$1'],
  [/\b(kensu slime|slime kensu)\b/, 'slime'],
  [/\bunderground channel\b/, 'channel'],
  [/\b(?:mount|mt) (sabre|hydra)\b/, '$1'],
  [/\b([ck]h?[au]r[iu]ss?[aou])\b/, 'kirisa'],
  [/\bmado (lower|upper)\b/, 'mado 2 $1'],
  [/\bsabera( 2)? (level|chest|sewer)\b/, 'sabera 2 level'],
  [/\b(script|richt)\b/, 'crypt'],
  [/\bdraygon 1\b/, 'draygon'],
  [/\besi\b/, 'evil spirit island'],
  [/\bsabre north summit\b/, 'sabre summit'],
  [/\bkirisa plant cave\b/, 'kirisa cave'],
  [/\bvampire cave\b/, 'sealed cave'],
  [/^((?:un)?)ma[urxkcs ]*t[io]me?(?: fight)?/, '$1mark stom'],
  [/^((?:un)?)mark telepathy/, '$1mark stom'],
  [/^((?:un)?)mark battle (armor|suit)/, '$1mark oasis cave flight'],
  [/^((?:un)?)mark power ring/, '$1mark oasis cave center'],
  [/^((?:un)?)mark grass/, '$1mark cordel grass'],
];

const fullClears = new Map([
  ['sealed cave', ['sealed cave front', 'sealed cave back', 'vampire 1']],
  ['styx', ['styx left', 'styx right']],
  ['oak', ['oak elder', 'oak mother']],
  ['sabre west', ['sabre west slope', 'sabre west', 'tornel']],
  ['sabre north', ['sabre north', 'kelby 1', 'sabre summit']],
  ['waterfall cave', ['waterfall cave', 'stone akahana']],
  ['fog lamp', ['fog lamp front', 'fog lamp back']],
  ['kirisa plant', ['kirisa cave', 'kirisa meadow']],
  ['karmine', ['karmine basement', 'karmine', 'behind karmine', 'slime']],
  ['amazones', ['aryllis', 'aryllis basement']],
  ['mado 2', ['mado 2', 'mado 2 upper', 'mado 2 lower']],
  ['pyramid', ['pyramid', 'draygon']],
  ['hydra', ['hydra front', 'hydra back', 'hydra summit']],
  ['sabera 1', ['sabera fortress left', 'sabera fortress right',
                'vampire 2', 'sabera 1', 'clark']],
  ['oasis cave', ['oasis cave', 'oasis cave flight', 'oasis cave center']],
  ['sabera 2', ['sabera 2', 'sabera 2 level']],
]);  

const SLOTS: ReadonlyArray<readonly [number, number, number, string]> = [
  [0x00, 121,192, 'leaf elder'], // sword of wind
  [0x01, 274,176, 'oak elder'], // sword of fire
  [0x02, 335,123, 'waterfall cave'], // sword of water
  [0x03,  77, 10, 'styx left'], // sword of thunder
  [0x05,  89,107, 'sealed cave front'], // ball of wind
  [0x06, 115,224, 'sabre west slope'], // tornado bracelet
  [0x07, 282,187, 'insect'], // ball of fire
  [0x08,  47,182, 'kelby 1'], // flame bracelet
  [0x09, 251,232, 'rage'], // ball of water
  [0x0a, 206,249, 'aryllis basement'], // blizzard bracelet
  [0x0b,  83, 63, 'mado 1'], // ball of thunder
  [0x0c,  23,  9, 'behind karmine'], // storm bracelet
  [0x12,  49, 48, 'mado 2'], // sacred shield
  [0x14,  77,  2, 'styx right'], // psycho shield
  [0x76,  70,  3, 'styx right'], // psycho shield mimic 1
  [0x77,  84,  3, 'styx right'], // psycho shield mimic 2
  [0x1b, 168, 96, 'oasis cave flight'], // battle suit
  [0x1c, 199,110, 'draygon'], // psycho armor
  [0x1d,  82, 95, 'sealed cave back'], // medical herb sealed cave
  [0x1e,  82,101, 'sealed cave back'], // antidote sealed cave
  [0x1f, 346,147, 'fog lamp front'], // lysis plant fog lamp
  [0x70, 346,153, 'fog lamp front'], // fog lamp mimic 1
  [0x71, 346,159, 'fog lamp front'], // fog lamp mimic 2
  [0x20, 126, 52, 'hydra front'], // fruit of lime mt hydra
  [0x21, 227, 97, 'sabera fortress left'], // fruit of power sabera palace
  [0x22, 256, 73, 'evil spirit island'], // magic ring evil spirit island
  [0x23,  58,115, 'sabera 2'], // fruit of repun sabera 2
  [0x24,  82,113, 'sealed cave front'], // warp boots sealed cave
  [0x25, 189,180, 'cordel grass'], // statue of onyx
  [0x26,  18,172, 'kelby 2'], // opel statue
  [0x27, 267,185, 'oak mother'], // insect flute
  [0x28, 275,147, 'portoa queen'], // flute of lime
  [0x29, 147,206, 'akahana'], // gas mask
  [0x2a, 172,104, 'oasis cave center'], // power ring
  [0x2b, 203,  5, 'brokahana'], // warrior ring
  [0x2c, 249, 69, 'evil spirit island'], // iron necklace
  [0x2d, 191,110, 'deo'], // deos pendant
  [0x2e,  89, 99, 'vampire 1'], // rabbit boots
  [0x2f, 164,104, 'oasis cave'], // leather boots
  [0x30, 319,123, 'stone akahana'], // shield ring
  [0x72, 320,130, 'waterfall cave'], // waterfall cave mimic
  // 31 alarm flute
  [0x32, 105, 94, 'windmill guard'], // windmill key
  [0x33,  64,198, 'sabre north'], // key to prison
  [0x34,  83, 71, 'zebu'], // key to styx
  [0x35, 345,140, 'fog lamp back'], // fog lamp
  [0x36, 301,119, 'dolphin'], // shell flute
  [0x37, 233,118, 'clark'], // eye glasses
  [0x38, 234, 88, 'sabera 1'], // broken statue
  [0x39, 295, 92, 'lighthouse'], // glowing lamp
  // 3a statue of gold
  [0x3b, 274,117, 'channel'], // love pendant
  [0x3c, 338,226, 'kirisa meadow'], // kirisa plant
  [0x3d,  23, 17, 'karmine'], // ivory statue
  [0x3e, 206,241, 'aryllis'], // bow of moon
  [0x3f, 101,  6, 'hydra summit'], // bow of sun
  [0x40, 207,110, 'draygon'], // bow of truth
  [0x41,  92,117, 'windmill'], // refresh
  [0x42, 279,126, 'sabre summit'], // paralysis
  [0x43, 202,138, 'stom'], // telepathy
  [0x44, 124,202, 'tornel'], // teleport
  [0x45, 304,128, 'asina'], // recover
  [0x46, 248, 35, 'whirlpool'], // barrier
  [0x47, 277,  3, 'swan'], // change
  [0x48,  15, 25, 'slime'], // flight
  [0x50,  82,107, 'sealed cave front'], // medical herb sealed cave front
  // 51 sacred shield
  [0x52, 134,219, 'sabre west'], // medical herb mt sabre w
  [0x53,  59,219, 'sabre north'], // medical herb mt sabre n
  [0x54,  52, 55, 'mado 2 upper'], // magic ring fortress 3 upper
  [0x55, 241, 97, 'sabera fortress right'], // medical herb sabera palace
  [0x56, 123, 23, 'hydra front'], // medical herb mt hydra
  [0x74, 115,  3, 'hydra back'], // mt hydra mimic
  [0x57,  70,  9, 'styx left'], // medical herb styx
  [0x75,  84,  9, 'styx left'], // styx 1 mimic
  [0x58,  32, 38, 'karmine basement'], // magic ring karmine
  [0x79,  32, 16, 'karmine basement'], // karmine mimic 1
  [0x7a,  40, 16, 'karmine basement'], // karmine mimic 2
  [0x7b,  40, 38, 'karmine basement'], // karmine mimic 3
  // 59 medical herb
  [0x5a, 161, 97, 'fortress exit'], // fruit of power oasis cave (over water)
  [0x10, 327,123, 'waterfall cave'], // flute of lime chest (NOTE: changed 5b-> 10)
  [0x5c, 256, 79, 'evil spirit island'], // lysis plant evil spirit island
  [0x5d,  36,139, 'sabera 2 level'], // lysis plant sabera level
  [0x5e,  14,229, 'sabre north'], // antidote mt sabre n
  [0x5f, 345,225, 'kirisa cave'], // antidote kirisa cave
  [0x60,  18, 94, 'mado 2 upper'], // antidote fortess 3
  [0x61, 234, 96, 'vampire 2'], // fruit of power vampire 2
  [0x62,  18,118, 'sabera 2 level'], // fruit of power sabera level
  [0x63,  36, 54, 'mado 2 upper'], // opel statue fortress 3
  [0x64, 175, 97, 'oasis cave'], // fruit of power oasis cave
  [0x65, 139, 40, 'hydra back'], // magic ring mt hydra
  [0x66,  66,160, 'sabera 2 level'], // fruit of repun sabera level
  // 67 magic ring
  // 68 magic ring
  [0x69, 131,201, 'sabre west'], // magic ring mt sabre w
  [0x6a,  76,226, 'sabre west'], // warp boots mt sabre w
  [0x6b,  18,100, 'mado 2 upper'], // magic ring fortress 3 upper (behind)
  [0x6c, 193,103, 'pyramid'], // magic ring pyramid front
  [0x78, 199,103, 'crypt'], // pyramid back mimic
  [0x6d, 205,103, 'crypt'], // opel statue pyramid back
  [0x73, 256, 67, 'evil spirit island'], // iron necklace mimic
  [0x6e,  24, 38, 'karmine basement'], // warp boots karmine
  [0x6f,  44, 97, 'mado 2 lower'], // magic ring fortress 3 lower
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
  readonly tracks = new Map<string, HTMLElement>();
  readonly marks = new Map<string, HTMLElement[]>();

  voice = false;
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

  addSlot(slotId: number, x: number, y: number, name: string) {
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
    let marks = this.marks.get(name);
    if (marks == null) this.marks.set(name, marks = []);
    marks.push(div);
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
    this.tracks.set(cls.replace(/-/g, ' '), outer);
    for (const name of otherNames) {
      this.tracks.set(name.replace(/-/g, ' '), outer);
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
      const rec = this.recognition = new SpeechRecognition();
      // NOTE: as far as I can tell, this does nothing...
      const grammar = new SpeechGrammarList();
      grammar.addFromString(`
          #JSGF V1.0;
          grammar command;
          public <item> = ${[...this.tracks.keys()].join(' | ')};
          public <check> = ${[...this.marks.keys()].join(' | ')};
          public <clear> = <check> | ${[...fullClears.keys()].join(' | ')};
          public <command> = track <item> | untrack <item> | mark <check> | unmark <check> | clear <clear> | stop listening;
      `, 1);
      rec.lang = 'en-US';
      rec.grammars = grammar;
      rec.interimResults = false;
      //rec.continuous = true;
      rec.maxAlternatives = 10;
      rec.onstart = () => { this.voice = true; };
      rec.onresult = (e) => {
        const searched = new Set<string>();
        const result = e.results[e.results.length - 1];
        if (!result.isFinal) return;
        let matched = false;
        for (const alt of result) {
          let cmd = alt.transcript.toLowerCase().replace(/[^a-z ]/g, '');
          searched.add(cmd);
          if (cmd === 'stop listening') {
            matched = true;
            this.voice = false;
          }
          for (const [re, repl] of voiceReplacements) {
            cmd = cmd.replace(re, repl);
            searched.add(cmd);
          }
          let match = /^(track|untrack|clear|unclear|full clear) (.*)/.exec(cmd);
          if (match) {
            //console.log(`attempt: ${match[2]}`);
            if (match[1].endsWith('track')) {
              const el = this.tracks.get(match[2]);
              if (!el) continue;
              this.toggle(el, !match[1].startsWith('un'));
            } else if (match[1].endsWith('clear')) {
              let marks = fullClears.get(match[2]);
              if (!marks) {
                if (!this.marks.has(match[2])) continue;
                marks = [match[2]];
              }
              for (const mark of marks) {
                for (const el of this.marks.get(mark)!) {
                  el.classList.toggle('got', !match[1].startsWith('un'));
                }
              }              
            }
            matched = true;
            break;
          }
          match =
              /^(?:un)?mark(?: (\d+)(?: che(?:st|ck)s?)?(?: in))? (.*)/
                  .exec(cmd);
          if (match) {
            const els = this.marks.get(match[2]);
            let num = Number(match[1] || '1');
            // TODO - fall back on key item names?  "unmark telepathy"
            if (!els || !num) continue;
            const got = !cmd.startsWith('un');
            for (const el of els) {
              if (el.classList.contains('got') !== got) {
                el.classList.toggle('got', got);
                if (--num === 0) break;
              }
            }
            matched = true;
            break;
          }
        }
        if (!matched) {
          // console.log(`No match: ${[...result].map(
          //                          r => r.transcript).join(', ')}`);
          console.log(`No match: ${[...searched].join(', ')}`);
        }
        rec.stop(); // gecko doesn't support continuous?
      };
      rec.onend = () => { if (this.voice) rec.start(); };
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  startVoice() {
    if (!this.recognition && !this.addVoiceRecognition()) return false;
    this.voice = true;
    this.recognition!.start();
    return true;
  }

  stopVoice() {
    this.voice = false;
    if (this.recognition) this.recognition.stop();
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

let flags = 'Rlpt Tb';
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
  const voice = document.getElementById('voice')!;
  voice.addEventListener('click', () => {
    if (graph.voice) {
      graph.stopVoice();
      voice.textContent = 'enable voice';
    } else if (graph.startVoice()) {
      voice.textContent = 'disable voice';
    }
  });
  (window as any).graph = graph;
};

//function die(): never { throw new Error('Assertion failed'); }

main();
