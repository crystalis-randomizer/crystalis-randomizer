import { World } from './graph/world.js';
import { newFill, traverse } from './graph/shuffle.js';
import { Bits } from './bits.js';
import { FlagSet } from './flagset.js';
import { Rom } from './rom.js';
import { deterministic } from './pass/deterministic.js';
const ITEMS = `
sword-of-wind $00
sword-of-fire $01
sword-of-water $02
sword-of-thunder $03
windmill-key $32
statue-of-onyx $25 onyx-statue
insect-flute $27
key-to-prison $33 prison-key key-2-prison
flute-of-lime $28

ball-of-wind $05 ball-of-wind
ball-of-fire $07 ball-of-fire
ball-of-water $09 ball-of-water
ball-of-thunder $0b ball-of-thunder
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
const voiceReplacements = [
    [/\b(sort)\b/, 'sword'],
    [/\b(sorta)\b/, 'sword of'],
    [/\b(win)\b/, 'wind'],
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
    [/\borb\n/, 'ball'],
    [/^(contract|amtrack|ontra(c|k|ck))\b/, 'untrack'],
    [/^((ch|tr)[eu](c|k|ck))\b/, 'track'],
    [/^track ?suit\b/, 'track flute'],
    [/\b(floote|food)\b/, 'flute'],
    [/\b(lyme|lion)\b/, 'lime'],
    [/mark(s|ed)\b/, 'mark'],
    [/^(marc|mach|smart|[bp]ark)\b/, 'mark'],
    [/\blee felder\b/, 'leaf elder'],
    [/^markley f/, 'mark leaf '],
    [/^(mark of|market)\b/, 'mark'],
    [/\bleif\b/, 'leaf'],
    [/\beldar\b/, 'elder'],
    [/\blight\b/, 'flight'],
    [/\bmann\b/, 'moon'],
    [/^trackball\b/, 'track bow'],
    [/\bbosemann?\b/, 'bow of moon'],
    [/\b(bo(we)?)\b/, 'bow'],
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
    [/\b((at the|ec[hk]o) h[ao]nn?ah?|alcohol(ic)?)\b/, 'akahana'],
    [/\b((roca|broke[nr]|brokaw|barr?oca) hann?ah?|bro k[ao]h[ao]na|pokehana)\b/,
        'brokahana'],
    [/\b(stoned)\b/, 'stone'],
    [/\b(roc[ck]a? ?(honda|ohana|h[oa]nn?ah?|auto))\b/, 'stone akahana'],
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
    [/\b(windmill|vampire) cave\b/, 'sealed cave'],
    [/^((?:un)?)ma[urxkcs ]*t[io]me?(?: fight)?/, '$1mark stom'],
    [/\b(bow|flute)\b/, '$1 of'],
    [/\bof( of)+\b/, 'of'],
    [/ of$/, ''],
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
const SLOTS = [
    [0x00, 121, 192, 'leaf elder', 'sword of wind'],
    [0x01, 274, 176, 'oak elder', 'sword of fire'],
    [0x02, 335, 123, 'waterfall cave', 'sword of water'],
    [0x03, 77, 10, 'styx left', 'sword of thunder'],
    [0x05, 89, 107, 'sealed cave front', 'ball of wind'],
    [0x06, 115, 224, 'sabre west slope', 'tornado bracelet'],
    [0x07, 282, 187, 'insect', 'ball of fire'],
    [0x08, 47, 182, 'kelby 1', 'flame bracelet'],
    [0x09, 251, 232, 'rage', 'ball of water'],
    [0x0a, 206, 249, 'aryllis basement', 'blizzard bracelet'],
    [0x0b, 83, 63, 'mado 1', 'ball of thunder'],
    [0x0c, 23, 9, 'behind karmine', 'storm bracelet'],
    [0x12, 49, 48, 'mado 2', 'sacred shield'],
    [0x14, 77, 2, 'styx right', 'psycho shield'],
    [0x76, 70, 3, 'styx right'],
    [0x77, 84, 3, 'styx right'],
    [0x1b, 168, 96, 'oasis cave flight', 'battle armor'],
    [0x1c, 199, 110, 'draygon', 'psycho armor'],
    [0x1d, 82, 95, 'sealed cave back'],
    [0x1e, 82, 101, 'sealed cave back'],
    [0x1f, 346, 147, 'fog lamp front'],
    [0x70, 346, 153, 'fog lamp front'],
    [0x71, 346, 159, 'fog lamp front'],
    [0x20, 126, 52, 'hydra front'],
    [0x21, 227, 97, 'sabera fortress left'],
    [0x22, 256, 73, 'evil spirit island'],
    [0x23, 58, 115, 'sabera 2'],
    [0x24, 82, 113, 'sealed cave front'],
    [0x25, 189, 180, 'cordel grass', 'statue of onyx'],
    [0x26, 18, 172, 'kelby 2'],
    [0x27, 267, 185, 'oak mother', 'insect flute'],
    [0x28, 275, 147, 'portoa queen', 'flute of lime'],
    [0x29, 147, 206, 'akahana', 'gas mask'],
    [0x2a, 172, 104, 'oasis cave center', 'power ring'],
    [0x2b, 203, 5, 'brokahana', 'warrior ring'],
    [0x2c, 249, 69, 'evil spirit island', 'iron necklace'],
    [0x2d, 191, 110, 'deo', 'deos pendant'],
    [0x2e, 89, 99, 'vampire 1', 'rabbit boots'],
    [0x2f, 164, 104, 'oasis cave', 'leather boots'],
    [0x30, 319, 123, 'stone akahana', 'shield ring'],
    [0x72, 320, 130, 'waterfall cave'],
    [0x32, 105, 94, 'windmill guard', 'windmill key'],
    [0x33, 64, 198, 'sabre north', 'key 2 prison'],
    [0x34, 83, 71, 'zebu', 'key 2 styx'],
    [0x35, 345, 140, 'fog lamp back', 'fog lamp'],
    [0x36, 301, 119, 'dolphin', 'shell flute'],
    [0x37, 233, 118, 'clark', 'eye glasses'],
    [0x38, 234, 88, 'sabera 1', 'broken statue'],
    [0x39, 295, 92, 'lighthouse', 'glowing lamp'],
    [0x3b, 274, 117, 'channel', 'love pendant'],
    [0x3c, 338, 226, 'kirisa meadow', 'kirisa plant'],
    [0x3d, 23, 17, 'karmine', 'ivory statue'],
    [0x3e, 206, 241, 'aryllis', 'bow of moon'],
    [0x3f, 101, 6, 'hydra summit', 'bow of sun'],
    [0x40, 207, 110, 'draygon', 'bow of truth'],
    [0x41, 92, 117, 'windmill', 'refresh'],
    [0x42, 279, 126, 'sabre summit', 'paralysis'],
    [0x43, 202, 138, 'stom', 'telepathy'],
    [0x44, 124, 202, 'tornel', 'teleport'],
    [0x45, 304, 128, 'asina', 'recover'],
    [0x46, 248, 35, 'whirlpool', 'barrier'],
    [0x47, 277, 3, 'swan', 'change'],
    [0x48, 15, 25, 'slime', 'flight'],
    [0x50, 82, 107, 'sealed cave front'],
    [0x52, 134, 219, 'sabre west'],
    [0x53, 59, 219, 'sabre north'],
    [0x54, 52, 55, 'mado 2 upper'],
    [0x55, 241, 97, 'sabera fortress right'],
    [0x56, 123, 23, 'hydra front'],
    [0x74, 115, 3, 'hydra back'],
    [0x57, 70, 9, 'styx left'],
    [0x75, 84, 9, 'styx left'],
    [0x58, 32, 38, 'karmine basement'],
    [0x79, 32, 16, 'karmine basement'],
    [0x7a, 40, 16, 'karmine basement'],
    [0x7b, 40, 38, 'karmine basement'],
    [0x5a, 161, 97, 'fortress exit'],
    [0x10, 327, 123, 'waterfall cave'],
    [0x5c, 256, 79, 'evil spirit island'],
    [0x5d, 36, 139, 'sabera 2 level'],
    [0x5e, 14, 229, 'sabre north'],
    [0x5f, 345, 225, 'kirisa cave'],
    [0x60, 18, 94, 'mado 2 upper'],
    [0x61, 234, 96, 'vampire 2'],
    [0x62, 18, 118, 'sabera 2 level'],
    [0x63, 36, 54, 'mado 2 upper'],
    [0x64, 175, 97, 'oasis cave'],
    [0x65, 139, 40, 'hydra back'],
    [0x66, 66, 160, 'sabera 2 level'],
    [0x69, 131, 201, 'sabre west'],
    [0x6a, 76, 226, 'sabre west'],
    [0x6b, 18, 100, 'mado 2 upper'],
    [0x6c, 193, 103, 'pyramid'],
    [0x78, 199, 103, 'crypt'],
    [0x6d, 205, 103, 'crypt'],
    [0x73, 256, 67, 'evil spirit island'],
    [0x6e, 24, 38, 'karmine basement'],
    [0x6f, 44, 97, 'mado 2 lower'],
];
const KEY = new Set([0x10, 0x12, 0x23, 0x26, 0x61]);
const BOSSES = new Map([
    [~0x100, 0x2e],
    [~0x101, 0x07],
    [~0x102, 0x08],
    [~0x103, 0x09],
    [~0x104, 0x38],
    [~0x105, 0x0b],
    [~0x106, 0x26],
    [~0x107, 0x23],
    [~0x108, 0x12],
    [~0x109, 0x3d],
    [~0x10a, 0x1c],
    [~0x10c, 0x61],
]);
const TRADES = new Set([0x29, 0x3e, 0x44, 0x47, 0x48]);
class Graph {
    constructor(rom, world, flags) {
        this.rom = rom;
        this.world = world;
        this.flags = flags;
        this.slots = new Map();
        this.items = new Map();
        this.slotElts = new Map();
        this.has = Bits.of();
        this.tracks = new Map();
        this.marks = new Map();
        this.voice = false;
        window.GRAPH = this;
        this.grid = document.getElementsByClassName('grid')[0];
        this.map = document.getElementsByClassName('map')[0];
        let always = Bits.of();
        for (const { item: id, index } of world.graph.slots) {
            if (id == null)
                continue;
            this.slots.set(id, index);
        }
        for (const { item: id, index } of world.graph.items) {
            if (id == null)
                continue;
            this.items.set(id, index);
            const item = rom.items[id];
            if (item && !item.unique)
                always = Bits.with(always, index);
        }
        this.unusedItems = world.graph.items.length;
        this.has = this.always = always;
        const toggle = (e) => {
            let t = e.target;
            while (t && !t.dataset['index']) {
                t = t.parentElement;
            }
            if (!t)
                return;
            this.toggle(t);
            e.preventDefault();
        };
        this.grid.addEventListener('click', toggle);
    }
    toggle(t, val) {
        const uid = Number(t.dataset['index']);
        const has = t.classList.toggle('got');
        if (t.dataset['item']) {
            this.has = has ?
                Bits.with(this.has, uid) :
                Bits.without(this.has, uid);
        }
        this.update();
    }
    addSlot(slotId, x, y, ...names) {
        const index = this.slots.get(slotId);
        if (index == null) {
            debugger;
            throw new Error();
        }
        const div = document.createElement('div');
        const itemget = this.rom.itemGets[slotId];
        const item = itemget && this.rom.items[itemget.itemId];
        if (item && item.unique || KEY.has(slotId)) {
            div.classList.add('key');
            x--;
            y--;
        }
        x--;
        y--;
        div.dataset['index'] = String(index);
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        const inner = document.createElement('div');
        div.appendChild(inner);
        inner.textContent = names[0];
        if (this.flags.randomizeTrades() && TRADES.has(slotId)) {
            div.classList.add('boss');
        }
        this.slotElts.set(index, div);
        for (const name of names) {
            let marks = this.marks.get(name);
            if (marks == null)
                this.marks.set(name, marks = []);
            marks.push(div);
        }
        this.map.appendChild(div);
    }
    addItem(cls, id, ...otherNames) {
        const uid = Number.parseInt(id.substring(1), 16);
        const outer = document.getElementsByClassName(cls)[0];
        const inner = document.createElement('div');
        outer.appendChild(inner);
        let index = this.items.get(uid);
        if (index == null) {
            this.items.set(uid, index = this.unusedItems++);
        }
        outer.dataset['index'] = String(index);
        outer.dataset['item'] = String(index);
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
            if (replaced == null)
                continue;
            const elt = this.slotElts.get(replaced);
            if (elt == null)
                throw new Error('expected');
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
            const elt = this.slotElts.get(slot);
            if (elt && !elt.classList.contains('got')) {
                elt.dataset['state'] = 'available';
            }
        }
    }
    addVoiceRecognition(disableCallback) {
        try {
            const rec = this.recognition = new SpeechRecognition();
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
            rec.maxAlternatives = 10;
            rec.onstart = () => { this.voice = true; };
            rec.onresult = (e) => {
                const searched = new Set();
                const result = e.results[e.results.length - 1];
                if (!result.isFinal)
                    return;
                let matched = false;
                for (const alt of result) {
                    let cmd = alt.transcript.toLowerCase().replace(/[^a-z ]/g, '');
                    searched.add(cmd);
                    if (cmd === 'stop listening') {
                        matched = true;
                        this.voice = false;
                        disableCallback();
                    }
                    for (const [re, repl] of voiceReplacements) {
                        cmd = cmd.replace(re, repl);
                        searched.add(cmd);
                    }
                    let match = /^(track|untrack|clear|unclear|full clear) (.*)/.exec(cmd);
                    if (match) {
                        if (match[1].endsWith('track')) {
                            const el = this.tracks.get(match[2]);
                            if (!el)
                                continue;
                            this.toggle(el, !match[1].startsWith('un'));
                        }
                        else if (match[1].endsWith('clear')) {
                            let marks = fullClears.get(match[2]);
                            if (!marks) {
                                if (!this.marks.has(match[2]))
                                    continue;
                                marks = [match[2]];
                            }
                            for (const mark of marks) {
                                for (const el of this.marks.get(mark)) {
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
                        if (!els || !num)
                            continue;
                        const got = !cmd.startsWith('un');
                        for (const el of els) {
                            if (el.classList.contains('got') !== got) {
                                el.classList.toggle('got', got);
                                if (--num === 0)
                                    break;
                            }
                        }
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    console.log(`No match: ${[...searched].join(', ')}`);
                }
                rec.stop();
            };
            rec.onend = () => { if (this.voice)
                rec.start(); };
            return true;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }
    startVoice(disableCallback) {
        if (!this.recognition && !this.addVoiceRecognition(disableCallback)) {
            return false;
        }
        this.voice = true;
        this.recognition.start();
        return true;
    }
    stopVoice() {
        this.voice = false;
        if (this.recognition)
            this.recognition.stop();
    }
}
function polyfill(...names) {
    const win = window;
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
let flags = 'Rlpt Tb';
for (const arg of location.hash.substring(1).split('&')) {
    const [key, value] = arg.split('=');
    if (key === 'flags') {
        flags = decodeURIComponent(value);
    }
}
async function main() {
    const rom = await Rom.load();
    const flagset = new FlagSet(flags);
    deterministic(rom, flagset);
    const world = World.build(rom, flagset, true);
    const graph = new Graph(rom, world, flagset);
    for (let item of ITEMS.split('\n')) {
        item = item.replace(/#.*/, '').trim();
        if (!item)
            continue;
        graph.addItem(...item.split(/ +/g));
    }
    for (const slot of SLOTS) {
        graph.addSlot(...slot);
    }
    graph.addExtraFlags();
    graph.update();
    document.getElementById('toggle-map').addEventListener('click', () => {
        graph.map.classList.toggle('hidden');
    });
    document.getElementById('clear-all').addEventListener('click', () => {
        for (const e of graph.grid.querySelectorAll('.got')) {
            e.classList.remove('got');
        }
        graph.has = graph.always;
        graph.update();
    });
    const voice = document.getElementById('voice');
    voice.addEventListener('click', () => {
        if (graph.voice) {
            graph.stopVoice();
            voice.textContent = 'enable voice';
        }
        else if (graph.startVoice(() => voice.textContent = 'enable voice')) {
            voice.textContent = 'disable voice';
        }
        else {
            voice.textContent = 'voice recognition failed';
        }
    });
    window.graph = graph;
}
;
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90cmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0IsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNyQyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdCLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxNQUFNLEtBQUssR0FBVzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBc0RyQixDQUFDO0FBRUYsTUFBTSxpQkFBaUIsR0FBNkM7SUFDbEUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDO0lBQ3ZCLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQztJQUMzQixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUM7SUFDckIsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDO0lBQzlCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQztJQUNyQixDQUFDLDhFQUE4RTtRQUM5RSxNQUFNLENBQUM7SUFDUixDQUFDLHNFQUFzRTtRQUN0RSxTQUFTLENBQUM7SUFDWCxDQUFDLHVDQUF1QyxFQUFFLFVBQVUsQ0FBQztJQUNyRCxDQUFDLHVCQUF1QixFQUFFLGtCQUFrQixDQUFDO0lBQzdDLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDO0lBQy9CLENBQUMsdUNBQXVDLEVBQUUsTUFBTSxDQUFDO0lBQ2pELENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQztJQUNoQixDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQztJ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QUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzNCO1FBQ0QsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ3pCLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFFLENBQUM7SUFDaEQsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbkMsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFO1lBQ2YsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDO1NBQ3BDO2FBQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDLEVBQUU7WUFDckUsS0FBSyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUM7U0FDckM7YUFBTTtZQUNMLEtBQUssQ0FBQyxXQUFXLEdBQUcsMEJBQTBCLENBQUM7U0FDaEQ7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNGLE1BQWMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ2hDLENBQUM7QUFBQSxDQUFDO0FBSUYsSUFBSSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBJdGVtIHRyYWNrZXIgZm9yIHdlYi5cbi8vIFVzZXMgZmxhZ3NldCB0byBmaWd1cmUgb3V0IGFjdHVhbCBkZXBlbmRlbmNpZXMuXG5cbi8vIFRPRE8gLSBjb25zaWRlciB1c2luZyBhbm55YW5nIGZvciBzcGVlY2ggcmVjb2duaXRpb24/XG5cbmltcG9ydCB7V29ybGR9IGZyb20gJy4vZ3JhcGgvd29ybGQuanMnO1xuaW1wb3J0IHtuZXdGaWxsLCB0cmF2ZXJzZX0gZnJvbSAnLi9ncmFwaC9zaHVmZmxlLmpzJztcbmltcG9ydCB7Qml0c30gZnJvbSAnLi9iaXRzLmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuL3JvbS5qcyc7XG5pbXBvcnQge2RldGVybWluaXN0aWN9IGZyb20gJy4vcGFzcy9kZXRlcm1pbmlzdGljLmpzJztcblxuY29uc3QgSVRFTVM6IHN0cmluZyA9IGBcbnN3b3JkLW9mLXdpbmQgJDAwXG5zd29yZC1vZi1maXJlICQwMVxuc3dvcmQtb2Ytd2F0ZXIgJDAyXG5zd29yZC1vZi10aHVuZGVyICQwM1xud2luZG1pbGwta2V5ICQzMlxuc3RhdHVlLW9mLW9ueXggJDI1IG9ueXgtc3RhdHVlXG5pbnNlY3QtZmx1dGUgJDI3XG5rZXktdG8tcHJpc29uICQzMyBwcmlzb24ta2V5IGtleS0yLXByaXNvblxuZmx1dGUtb2YtbGltZSAkMjhcblxuYmFsbC1vZi13aW5kICQwNSBiYWxsLW9mLXdpbmRcbmJhbGwtb2YtZmlyZSAkMDcgYmFsbC1vZi1maXJlXG5iYWxsLW9mLXdhdGVyICQwOSBiYWxsLW9mLXdhdGVyXG5iYWxsLW9mLXRodW5kZXIgJDBiIGJhbGwtb2YtdGh1bmRlclxua2lyaXNhLXBsYW50ICQzY1xuYWxhcm0tZmx1dGUgJDMxXG5mb2ctbGFtcCAkMzVcbnNoZWxsLWZsdXRlICQzNlxuYnJva2VuLXN0YXR1ZSAkMzhcbmV5ZS1nbGFzc2VzICQzNyBleWVnbGFzc2VzXG5nbG93aW5nLWxhbXAgJDM5XG5cbnRvcm5hZG8tYnJhY2VsZXQgJDA2XG5mbGFtZS1icmFjZWxldCAkMDhcbmJsaXp6YXJkLWJyYWNlbGV0ICQwYVxuc3Rvcm0tYnJhY2VsZXQgJDBjXG5sb3ZlLXBlbmRhbnQgJDNiXG5rZXktdG8tc3R5eCAkMzQga2V5LTItc3R5eFxub3BlbC1zdGF0dWUgJDI2XG5zYWNyZWQtc2hpZWxkICQxMlxuaXZvcnktc3RhdHVlICQzZFxuXG5yYWJiaXQtYm9vdHMgJDJlXG5nYXMtbWFzayAkMjkgaGF6YXJkLXN1aXQgaGF6bWF0LXN1aXRcbnNoaWVsZC1yaW5nICQzMFxuaXJvbi1uZWNrbGFjZSAkMmNcbmxlYXRoZXItYm9vdHMgJDJmIHNwZWVkLWJvb3RzXG5wb3dlci1yaW5nICQyYVxud2Fycmlvci1yaW5nICQyYlxuZGVvcy1wZW5kYW50ICQyZCBkZW9cbmJvdy1vZi1tb29uICQzZSBtb29uXG5ib3ctb2Ytc3VuICQzZiBzdW5cblxucmVmcmVzaCAkNDFcbnBhcmFseXNpcyAkNDJcbnRlbGVwYXRoeSAkNDNcbnRlbGVwb3J0ICQ0NFxucmVjb3ZlciAkNDVcbmJhcnJpZXIgJDQ2XG5jaGFuZ2UgJDQ3XG5mbGlnaHQgJDQ4XG5wc3ljaG8tYXJtb3IgJDFjXG5ib3ctb2YtdHJ1dGggJDQwIHRydXRoXG5gO1xuXG5jb25zdCB2b2ljZVJlcGxhY2VtZW50czogUmVhZG9ubHlBcnJheTxyZWFkb25seSBbUmVnRXhwLCBzdHJpbmddPiA9IFtcbiAgWy9cXGIoc29ydClcXGIvLCAnc3dvcmQnXSxcbiAgWy9cXGIoc29ydGEpXFxiLywgJ3N3b3JkIG9mJ10sXG4gIFsvXFxiKHdpbilcXGIvLCAnd2luZCddLFxuICBbL1xcYmtldG9zdGl4XFxiLywgJ2tleSAyIHN0eXgnXSxcbiAgWy9cXGJrZXRvXFxiLywgJ2tleSAyJ10sXG4gIFsvXFxiKHN0aWNrc3xzdGljayBjfHN0aXggZXxzdGljayBzZWF8ZGl4aWV8c3RpY2tzIGV8c3RpY2sgc2VlfHNleHl8NjB8c2l4dHkpXFxiLyxcbiAgICdzdHl4J10sXG4gIFsvXFxiKGFycmF5bGlzdHxnb3JpbGxhW3N6XXxhdXJlbGl1c3xoP2Fpcmxlc3N8YSByZWFsaXN0fGFybFtlaXldc3M/KVxcYi8sXG4gICAnYXJ5bGxpcyddLFxuICBbL1xcYihhbWF6b24gdXN8YW1hem9uW2FlXT9zcz98YW1hem9uKVxcYi8sICdhbWF6b25lcyddLFxuICBbL1xcYmFtYXpvbmVzIGJhc2VtZW50XFxiLywgJ2FyeWxsaXMgYmFzZW1lbnQnXSxcbiAgWy9cXGIoZGVhbHxkaWx8ZGllaGwpXFxiLywgJ2RlbyddLFxuICBbL1xcYihkc3xkZWFsc3xkaWF6fGRlbG9zfGRyb3NlfHRoZW9zKVxcYi8sICdkZW9zJ10sXG4gIFsvXFxib25lXFxiLywgJzEnXSxcbiAgWy9cXGIodHdvfGlpfHRvfHRvbylcXGIvLCAnMiddLFxuICBbL1xcYnRocmVlXFxiLywgJzMnXSxcbiAgWy9cXGJmb3VyXFxiLywgJzQnXSxcbiAgWy9cXGJhcltja11zIHRvbVxcYi8sICdhcmsgc3RvbSddLFxuICBbL1xcYm9yYml0XFxiLywgJ29yYiBvZiddLFxuICBbL1xcYm9yYlxcbi8sICdiYWxsJ10sXG4gIFsvXihjb250cmFjdHxhbXRyYWNrfG9udHJhKGN8a3xjaykpXFxiLywgJ3VudHJhY2snXSxcbiAgWy9eKChjaHx0cilbZXVdKGN8a3xjaykpXFxiLywgJ3RyYWNrJ10sXG4gIFsvXnRyYWNrID9zdWl0XFxiLywgJ3RyYWNrIGZsdXRlJ10sXG4gIFsvXFxiKGZsb290ZXxmb29kKVxcYi8sICdmbHV0ZSddLFxuICBbL1xcYihseW1lfGxpb24pXFxiLywgJ2xpbWUnXSxcbiAgWy9tYXJrKHN8ZWQpXFxiLywgJ21hcmsnXSxcbiAgWy9eKG1hcmN8bWFjaHxzbWFydHxbYnBdYXJrKVxcYi8sICdtYXJrJ10sXG4gIFsvXFxibGVlIGZlbGRlclxcYi8sICdsZWFmIGVsZGVyJ10sXG4gIFsvXm1hcmtsZXkgZi8sICdtYXJrIGxlYWYgJ10sXG4gIFsvXihtYXJrIG9mfG1hcmtldClcXGIvLCAnbWFyayddLFxuICBbL1xcYmxlaWZcXGIvLCAnbGVhZiddLFxuICBbL1xcYmVsZGFyXFxiLywgJ2VsZGVyJ10sXG4gIFsvXFxibGlnaHRcXGIvLCAnZmxpZ2h0J10sXG4gIFsvXFxibWFublxcYi8sICdtb29uJ10sXG4gIFsvXnRyYWNrYmFsbFxcYi8sICd0cmFjayBib3cnXSxcbiAgWy9cXGJib3NlbWFubj9cXGIvLCAnYm93IG9mIG1vb24nXSxcbiAgWy9cXGIoYm8od2UpPylcXGIvLCAnYm93J10sXG4gIFsvXFxiKGNlcnRpZmllcnxzdGFydCBhIGZpcmUpXFxiLywgJ3N3b3JkIG9mIGZpcmUnXSxcbiAgWy9cXGJ3aGVuIG1pbGt5XFxiLywgJ3dpbmRtaWxsIGtleSddLFxuICBbL14oNCBjbGVhcnxmYXV4IGNsZWFyfGZvbGtsb3JlfHNvID9jbGVhcnxwaG8gY2xlYXIpXFxiLywgJ2Z1bGwgY2xlYXInXSxcbiAgWy9cXGIobWF5b3xtZXRvfG5hdG98bWFkZXJ8bWVhZG93fG1hdHRlcnxtYVtkdF1lcnxtb3R0b3xtb2RlbClcXGIvLCAnbWFkbyddLFxuICBbL1xcYmNhbHZleVxcYi8sICdrZWxieSddLFxuICBbL1xcYihrZWxieW9uZXxsdiA/MSlcXGIvLCAna2VsYnkgMSddLFxuICBbL1xcYmx2ID8yXFxiLywgJ2tlbGJ5IDInXSxcbiAgWy9cXGIoY2FybWluZXxjYXJtZW58Y29tYmluZSlcXGIvLCAna2FybWluZSddLFxuICBbL1xcYihkcmFbZ2tdW2FvXW4pXFxiLywgJ2RyYXlnb24nXSxcbiAgWy9cXGIoW2NzXVthZV1bYmRndl1bYWVpdV0qclthZV18eGF2aWVyKVxcYi8sICdzYWJlcmEnXSxcbiAgWy9cXGIod3JpZ2h0fHJpdGV8d3JpdGUpXFxiLywgJ3JpZ2h0J10sXG4gIFsvXFxiKFtja11vcltiZF1lbFtsZV0/fHF1YWRyZWwpXFxiLywgJ2NvcmRlbCddLFxuICBbL1xcYihob3RlbCBkZXNrfChiZWwpP2wgZGVza3xraWxsIGJhc3F1ZXxrZWhsIGJhc2N8Y2FsZWIgYXNrKGVkKT8pXFxiLyxcbiAgICdrZWxieSddLFxuICBbL1xcYihwb3J0ZXJ8cG9ydFtlb11sYXxwb3J0byBhKVxcYi8sICdwb3J0b2EnXSxcbiAgWy9cXGIoYXRoZW5hfGNlbmF8dGluYXxpc2luYXxlc3F1aW5hKVxcYi8sICdhc2luYSddLFxuICBbL1xcYigoYXQgdGhlfGVjW2hrXW8pIGhbYW9dbm4/YWg/fGFsY29ob2woaWMpPylcXGIvLCAnYWthaGFuYSddLFxuICBbL1xcYigocm9jYXxicm9rZVtucl18YnJva2F3fGJhcnI/b2NhKSBoYW5uP2FoP3xicm8ga1thb11oW2FvXW5hfHBva2VoYW5hKVxcYi8sXG4gICAnYnJva2FoYW5hJ10sXG4gIFsvXFxiKHN0b25lZClcXGIvLCAnc3RvbmUnXSxcbiAgLy8gc3VwcG9ydCBcInJvY2thaGFuYVwiIGZvciBzdG9uZSBha2FoYW5hXG4gIFsvXFxiKHJvY1tja11hPyA/KGhvbmRhfG9oYW5hfGhbb2Fdbm4/YWg/fGF1dG8pKVxcYi8sICdzdG9uZSBha2FoYW5hJ10sXG4gIFsvXFxiKGd1YXJkcylcXGIvLCAnZ3VhcmQnXSxcbiAgWy9cXGIod2luZG93KVxcYi8sICd3aW5kbWlsbCddLFxuICBbL1xcYihzYVtidl1bZW9dcilcXGIvLCAnc2FicmUnXSxcbiAgWy9cXGJzYWJyZSBzb3V0aFxcYi8sICdzYWJyZSB3ZXN0J10sXG4gIFsvXFxiKGhlYnJld3xjZWJ1fHNlYmJhfHphYmVsKVxcYi8sICd6ZWJ1J10sXG4gIFsvXFxiKFtiY3RdKFthb3VdcnxyW2FvdV0pbm4/ZWxsPylcXGIvLCAndG9ybmVsJ10sXG4gIFsvXFxiKGNsYXJrZSlcXGIvLCAnY2xhcmsnXSxcbiAgWy9cXGJzYWJlcmEgMSBsZWZ0XFxiLywgJ3NhYmVyYSBmb3J0cmVzcyBsZWZ0J10sXG4gIFsvXFxic2FiZXJhIDEgcmlnaHRcXGIvLCAnc2FiZXJhIGZvcnRyZXNzIHJpZ2h0J10sXG4gIFsvXFxiKGNhbnR1fGNhbmNlbHxjYW4gc3VlfGtpbmNlcnxrZW56b3xjYW5jZXIpXFxiLywgJ2tlbnN1J10sXG4gIFsvXFxiKGxpZ2h0IGhvdXNlKVxcYi8sICdsaWdodGhvdXNlJ10sXG4gIFsvXFxia2Vuc3UoPzogaW4pPyAobGlnaHRob3VzZXxzd2FuKVxcYi8sICckMSddLFxuICBbL1xcYihrZW5zdSBzbGltZXxzbGltZSBrZW5zdSlcXGIvLCAnc2xpbWUnXSxcbiAgWy9cXGJ1bmRlcmdyb3VuZCBjaGFubmVsXFxiLywgJ2NoYW5uZWwnXSxcbiAgWy9cXGIoPzptb3VudHxtdCkgKHNhYnJlfGh5ZHJhKVxcYi8sICckMSddLFxuICBbL1xcYihbY2tdaD9bYXVdcltpdV1zcz9bYW91XSlcXGIvLCAna2lyaXNhJ10sXG4gIFsvXFxibWFkbyAobG93ZXJ8dXBwZXIpXFxiLywgJ21hZG8gMiAkMSddLFxuICBbL1xcYnNhYmVyYSggMik/IChsZXZlbHxjaGVzdHxzZXdlcilcXGIvLCAnc2FiZXJhIDIgbGV2ZWwnXSxcbiAgWy9cXGIoc2NyaXB0fHJpY2h0KVxcYi8sICdjcnlwdCddLFxuICBbL1xcYmRyYXlnb24gMVxcYi8sICdkcmF5Z29uJ10sXG4gIFsvXFxiZXNpXFxiLywgJ2V2aWwgc3Bpcml0IGlzbGFuZCddLFxuICBbL1xcYnNhYnJlIG5vcnRoIHN1bW1pdFxcYi8sICdzYWJyZSBzdW1taXQnXSxcbiAgWy9cXGJraXJpc2EgcGxhbnQgY2F2ZVxcYi8sICdraXJpc2EgY2F2ZSddLFxuICBbL1xcYih3aW5kbWlsbHx2YW1waXJlKSBjYXZlXFxiLywgJ3NlYWxlZCBjYXZlJ10sXG4gIFsvXigoPzp1bik/KW1hW3VyeGtjcyBdKnRbaW9dbWU/KD86IGZpZ2h0KT8vLCAnJDFtYXJrIHN0b20nXSxcbiAgWy9cXGIoYm93fGZsdXRlKVxcYi8sICckMSBvZiddLFxuICBbL1xcYm9mKCBvZikrXFxiLywgJ29mJ10sXG4gIFsvIG9mJC8sICcnXSxcbiAgLy8gWy9eKCg/OnVuKT8pbWFyayB0ZWxlcGF0aHkvLCAnJDFtYXJrIHN0b20nXSxcbiAgLy8gWy9eKCg/OnVuKT8pbWFyayBiYXR0bGUgKGFybW9yfHN1aXQpLywgJyQxbWFyayBvYXNpcyBjYXZlIGZsaWdodCddLFxuICAvLyBbL14oKD86dW4pPyltYXJrIHBvd2VyIHJpbmcvLCAnJDFtYXJrIG9hc2lzIGNhdmUgY2VudGVyJ10sXG4gIC8vIFsvXigoPzp1bik/KW1hcmsgZ3Jhc3MvLCAnJDFtYXJrIGNvcmRlbCBncmFzcyddLFxuICAvLyBbL2IoamFjayhldCk/KVxcYi8sICdjaGVjayddLFxuXTtcblxuY29uc3QgZnVsbENsZWFycyA9IG5ldyBNYXAoW1xuICBbJ3NlYWxlZCBjYXZlJywgWydzZWFsZWQgY2F2ZSBmcm9udCcsICdzZWFsZWQgY2F2ZSBiYWNrJywgJ3ZhbXBpcmUgMSddXSxcbiAgWydzdHl4JywgWydzdHl4IGxlZnQnLCAnc3R5eCByaWdodCddXSxcbiAgWydvYWsnLCBbJ29hayBlbGRlcicsICdvYWsgbW90aGVyJ11dLFxuICBbJ3NhYnJlIHdlc3QnLCBbJ3NhYnJlIHdlc3Qgc2xvcGUnLCAnc2FicmUgd2VzdCcsICd0b3JuZWwnXV0sXG4gIFsnc2FicmUgbm9ydGgnLCBbJ3NhYnJlIG5vcnRoJywgJ2tlbGJ5IDEnLCAnc2FicmUgc3VtbWl0J11dLFxuICBbJ3dhdGVyZmFsbCBjYXZlJywgWyd3YXRlcmZhbGwgY2F2ZScsICdzdG9uZSBha2FoYW5hJ11dLFxuICBbJ2ZvZyBsYW1wJywgWydmb2cgbGFtcCBmcm9udCcsICdmb2cgbGFtcCBiYWNrJ11dLFxuICBbJ2tpcmlzYSBwbGFudCcsIFsna2lyaXNhIGNhdmUnLCAna2lyaXNhIG1lYWRvdyddXSxcbiAgWydrYXJtaW5lJywgWydrYXJtaW5lIGJhc2VtZW50JywgJ2thcm1pbmUnLCAnYmVoaW5kIGthcm1pbmUnLCAnc2xpbWUnXV0sXG4gIFsnYW1hem9uZXMnLCBbJ2FyeWxsaXMnLCAnYXJ5bGxpcyBiYXNlbWVudCddXSxcbiAgWydtYWRvIDInLCBbJ21hZG8gMicsICdtYWRvIDIgdXBwZXInLCAnbWFkbyAyIGxvd2VyJ11dLFxuICBbJ3B5cmFtaWQnLCBbJ3B5cmFtaWQnLCAnZHJheWdvbiddXSxcbiAgWydoeWRyYScsIFsnaHlkcmEgZnJvbnQnLCAnaHlkcmEgYmFjaycsICdoeWRyYSBzdW1taXQnXV0sXG4gIFsnc2FiZXJhIDEnLCBbJ3NhYmVyYSBmb3J0cmVzcyBsZWZ0JywgJ3NhYmVyYSBmb3J0cmVzcyByaWdodCcsXG4gICAgICAgICAgICAgICAgJ3ZhbXBpcmUgMicsICdzYWJlcmEgMScsICdjbGFyayddXSxcbiAgWydvYXNpcyBjYXZlJywgWydvYXNpcyBjYXZlJywgJ29hc2lzIGNhdmUgZmxpZ2h0JywgJ29hc2lzIGNhdmUgY2VudGVyJ11dLFxuICBbJ3NhYmVyYSAyJywgWydzYWJlcmEgMicsICdzYWJlcmEgMiBsZXZlbCddXSxcbl0pOyAgXG5cbmNvbnN0IFNMT1RTOiBSZWFkb25seUFycmF5PHJlYWRvbmx5IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCAuLi5zdHJpbmdbXV0+ID0gW1xuICBbMHgwMCwgMTIxLDE5MiwgJ2xlYWYgZWxkZXInLCAnc3dvcmQgb2Ygd2luZCddLFxuICBbMHgwMSwgMjc0LDE3NiwgJ29hayBlbGRlcicsICdzd29yZCBvZiBmaXJlJ10sXG4gIFsweDAyLCAzMzUsMTIzLCAnd2F0ZXJmYWxsIGNhdmUnLCAnc3dvcmQgb2Ygd2F0ZXInXSxcbiAgWzB4MDMsICA3NywgMTAsICdzdHl4IGxlZnQnLCAnc3dvcmQgb2YgdGh1bmRlciddLFxuICBbMHgwNSwgIDg5LDEwNywgJ3NlYWxlZCBjYXZlIGZyb250JywgJ2JhbGwgb2Ygd2luZCddLFxuICBbMHgwNiwgMTE1LDIyNCwgJ3NhYnJlIHdlc3Qgc2xvcGUnLCAndG9ybmFkbyBicmFjZWxldCddLFxuICBbMHgwNywgMjgyLDE4NywgJ2luc2VjdCcsICdiYWxsIG9mIGZpcmUnXSxcbiAgWzB4MDgsICA0NywxODIsICdrZWxieSAxJywgJ2ZsYW1lIGJyYWNlbGV0J10sXG4gIFsweDA5LCAyNTEsMjMyLCAncmFnZScsICdiYWxsIG9mIHdhdGVyJ10sXG4gIFsweDBhLCAyMDYsMjQ5LCAnYXJ5bGxpcyBiYXNlbWVudCcsICdibGl6emFyZCBicmFjZWxldCddLFxuICBbMHgwYiwgIDgzLCA2MywgJ21hZG8gMScsICdiYWxsIG9mIHRodW5kZXInXSxcbiAgWzB4MGMsICAyMywgIDksICdiZWhpbmQga2FybWluZScsICdzdG9ybSBicmFjZWxldCddLFxuICBbMHgxMiwgIDQ5LCA0OCwgJ21hZG8gMicsICdzYWNyZWQgc2hpZWxkJ10sXG4gIFsweDE0LCAgNzcsICAyLCAnc3R5eCByaWdodCcsICdwc3ljaG8gc2hpZWxkJ10sXG4gIFsweDc2LCAgNzAsICAzLCAnc3R5eCByaWdodCddLCAvLyBwc3ljaG8gc2hpZWxkIG1pbWljIDFcbiAgWzB4NzcsICA4NCwgIDMsICdzdHl4IHJpZ2h0J10sIC8vIHBzeWNobyBzaGllbGQgbWltaWMgMlxuICBbMHgxYiwgMTY4LCA5NiwgJ29hc2lzIGNhdmUgZmxpZ2h0JywgJ2JhdHRsZSBhcm1vciddLFxuICBbMHgxYywgMTk5LDExMCwgJ2RyYXlnb24nLCAncHN5Y2hvIGFybW9yJ10sXG4gIFsweDFkLCAgODIsIDk1LCAnc2VhbGVkIGNhdmUgYmFjayddLCAvLyBtZWRpY2FsIGhlcmIgc2VhbGVkIGNhdmVcbiAgWzB4MWUsICA4MiwxMDEsICdzZWFsZWQgY2F2ZSBiYWNrJ10sIC8vIGFudGlkb3RlIHNlYWxlZCBjYXZlXG4gIFsweDFmLCAzNDYsMTQ3LCAnZm9nIGxhbXAgZnJvbnQnXSwgLy8gbHlzaXMgcGxhbnQgZm9nIGxhbXBcbiAgWzB4NzAsIDM0NiwxNTMsICdmb2cgbGFtcCBmcm9udCddLCAvLyBmb2cgbGFtcCBtaW1pYyAxXG4gIFsweDcxLCAzNDYsMTU5LCAnZm9nIGxhbXAgZnJvbnQnXSwgLy8gZm9nIGxhbXAgbWltaWMgMlxuICBbMHgyMCwgMTI2LCA1MiwgJ2h5ZHJhIGZyb250J10sIC8vIGZydWl0IG9mIGxpbWUgbXQgaHlkcmFcbiAgWzB4MjEsIDIyNywgOTcsICdzYWJlcmEgZm9ydHJlc3MgbGVmdCddLCAvLyBmcnVpdCBvZiBwb3dlciBzYWJlcmEgcGFsYWNlXG4gIFsweDIyLCAyNTYsIDczLCAnZXZpbCBzcGlyaXQgaXNsYW5kJ10sIC8vIG1hZ2ljIHJpbmcgZXZpbCBzcGlyaXQgaXNsYW5kXG4gIFsweDIzLCAgNTgsMTE1LCAnc2FiZXJhIDInXSwgLy8gZnJ1aXQgb2YgcmVwdW4gc2FiZXJhIDJcbiAgWzB4MjQsICA4MiwxMTMsICdzZWFsZWQgY2F2ZSBmcm9udCddLCAvLyB3YXJwIGJvb3RzIHNlYWxlZCBjYXZlXG4gIFsweDI1LCAxODksMTgwLCAnY29yZGVsIGdyYXNzJywgJ3N0YXR1ZSBvZiBvbnl4J10sXG4gIFsweDI2LCAgMTgsMTcyLCAna2VsYnkgMiddLCAvLyBvcGVsIHN0YXR1ZVxuICBbMHgyNywgMjY3LDE4NSwgJ29hayBtb3RoZXInLCAnaW5zZWN0IGZsdXRlJ10sXG4gIFsweDI4LCAyNzUsMTQ3LCAncG9ydG9hIHF1ZWVuJywgJ2ZsdXRlIG9mIGxpbWUnXSxcbiAgWzB4MjksIDE0NywyMDYsICdha2FoYW5hJywgJ2dhcyBtYXNrJ10sXG4gIFsweDJhLCAxNzIsMTA0LCAnb2FzaXMgY2F2ZSBjZW50ZXInLCAncG93ZXIgcmluZyddLFxuICBbMHgyYiwgMjAzLCAgNSwgJ2Jyb2thaGFuYScsICd3YXJyaW9yIHJpbmcnXSxcbiAgWzB4MmMsIDI0OSwgNjksICdldmlsIHNwaXJpdCBpc2xhbmQnLCAnaXJvbiBuZWNrbGFjZSddLFxuICBbMHgyZCwgMTkxLDExMCwgJ2RlbycsICdkZW9zIHBlbmRhbnQnXSxcbiAgWzB4MmUsICA4OSwgOTksICd2YW1waXJlIDEnLCAncmFiYml0IGJvb3RzJ10sXG4gIFsweDJmLCAxNjQsMTA0LCAnb2FzaXMgY2F2ZScsICdsZWF0aGVyIGJvb3RzJ10sXG4gIFsweDMwLCAzMTksMTIzLCAnc3RvbmUgYWthaGFuYScsICdzaGllbGQgcmluZyddLFxuICBbMHg3MiwgMzIwLDEzMCwgJ3dhdGVyZmFsbCBjYXZlJ10sIC8vIHdhdGVyZmFsbCBjYXZlIG1pbWljXG4gIC8vIDMxIGFsYXJtIGZsdXRlXG4gIFsweDMyLCAxMDUsIDk0LCAnd2luZG1pbGwgZ3VhcmQnLCAnd2luZG1pbGwga2V5J10sXG4gIFsweDMzLCAgNjQsMTk4LCAnc2FicmUgbm9ydGgnLCAna2V5IDIgcHJpc29uJ10sXG4gIFsweDM0LCAgODMsIDcxLCAnemVidScsICdrZXkgMiBzdHl4J10sXG4gIFsweDM1LCAzNDUsMTQwLCAnZm9nIGxhbXAgYmFjaycsICdmb2cgbGFtcCddLFxuICBbMHgzNiwgMzAxLDExOSwgJ2RvbHBoaW4nLCAnc2hlbGwgZmx1dGUnXSxcbiAgWzB4MzcsIDIzMywxMTgsICdjbGFyaycsICdleWUgZ2xhc3NlcyddLFxuICBbMHgzOCwgMjM0LCA4OCwgJ3NhYmVyYSAxJywgJ2Jyb2tlbiBzdGF0dWUnXSxcbiAgWzB4MzksIDI5NSwgOTIsICdsaWdodGhvdXNlJywgJ2dsb3dpbmcgbGFtcCddLFxuICAvLyAzYSBzdGF0dWUgb2YgZ29sZFxuICBbMHgzYiwgMjc0LDExNywgJ2NoYW5uZWwnLCAnbG92ZSBwZW5kYW50J10sXG4gIFsweDNjLCAzMzgsMjI2LCAna2lyaXNhIG1lYWRvdycsICdraXJpc2EgcGxhbnQnXSxcbiAgWzB4M2QsICAyMywgMTcsICdrYXJtaW5lJywgJ2l2b3J5IHN0YXR1ZSddLFxuICBbMHgzZSwgMjA2LDI0MSwgJ2FyeWxsaXMnLCAnYm93IG9mIG1vb24nXSxcbiAgWzB4M2YsIDEwMSwgIDYsICdoeWRyYSBzdW1taXQnLCAnYm93IG9mIHN1biddLFxuICBbMHg0MCwgMjA3LDExMCwgJ2RyYXlnb24nLCAnYm93IG9mIHRydXRoJ10sXG4gIFsweDQxLCAgOTIsMTE3LCAnd2luZG1pbGwnLCAncmVmcmVzaCddLFxuICBbMHg0MiwgMjc5LDEyNiwgJ3NhYnJlIHN1bW1pdCcsICdwYXJhbHlzaXMnXSxcbiAgWzB4NDMsIDIwMiwxMzgsICdzdG9tJywgJ3RlbGVwYXRoeSddLFxuICBbMHg0NCwgMTI0LDIwMiwgJ3Rvcm5lbCcsICd0ZWxlcG9ydCddLFxuICBbMHg0NSwgMzA0LDEyOCwgJ2FzaW5hJywgJ3JlY292ZXInXSxcbiAgWzB4NDYsIDI0OCwgMzUsICd3aGlybHBvb2wnLCAnYmFycmllciddLFxuICBbMHg0NywgMjc3LCAgMywgJ3N3YW4nLCAnY2hhbmdlJ10sXG4gIFsweDQ4LCAgMTUsIDI1LCAnc2xpbWUnLCAnZmxpZ2h0J10sXG4gIFsweDUwLCAgODIsMTA3LCAnc2VhbGVkIGNhdmUgZnJvbnQnXSwgLy8gbWVkaWNhbCBoZXJiIHNlYWxlZCBjYXZlIGZyb250XG4gIC8vIDUxIHNhY3JlZCBzaGllbGRcbiAgWzB4NTIsIDEzNCwyMTksICdzYWJyZSB3ZXN0J10sIC8vIG1lZGljYWwgaGVyYiBtdCBzYWJyZSB3XG4gIFsweDUzLCAgNTksMjE5LCAnc2FicmUgbm9ydGgnXSwgLy8gbWVkaWNhbCBoZXJiIG10IHNhYnJlIG5cbiAgWzB4NTQsICA1MiwgNTUsICdtYWRvIDIgdXBwZXInXSwgLy8gbWFnaWMgcmluZyBmb3J0cmVzcyAzIHVwcGVyXG4gIFsweDU1LCAyNDEsIDk3LCAnc2FiZXJhIGZvcnRyZXNzIHJpZ2h0J10sIC8vIG1lZGljYWwgaGVyYiBzYWJlcmEgcGFsYWNlXG4gIFsweDU2LCAxMjMsIDIzLCAnaHlkcmEgZnJvbnQnXSwgLy8gbWVkaWNhbCBoZXJiIG10IGh5ZHJhXG4gIFsweDc0LCAxMTUsICAzLCAnaHlkcmEgYmFjayddLCAvLyBtdCBoeWRyYSBtaW1pY1xuICBbMHg1NywgIDcwLCAgOSwgJ3N0eXggbGVmdCddLCAvLyBtZWRpY2FsIGhlcmIgc3R5eFxuICBbMHg3NSwgIDg0LCAgOSwgJ3N0eXggbGVmdCddLCAvLyBzdHl4IDEgbWltaWNcbiAgWzB4NTgsICAzMiwgMzgsICdrYXJtaW5lIGJhc2VtZW50J10sIC8vIG1hZ2ljIHJpbmcga2FybWluZVxuICBbMHg3OSwgIDMyLCAxNiwgJ2thcm1pbmUgYmFzZW1lbnQnXSwgLy8ga2FybWluZSBtaW1pYyAxXG4gIFsweDdhLCAgNDAsIDE2LCAna2FybWluZSBiYXNlbWVudCddLCAvLyBrYXJtaW5lIG1pbWljIDJcbiAgWzB4N2IsICA0MCwgMzgsICdrYXJtaW5lIGJhc2VtZW50J10sIC8vIGthcm1pbmUgbWltaWMgM1xuICAvLyA1OSBtZWRpY2FsIGhlcmJcbiAgWzB4NWEsIDE2MSwgOTcsICdmb3J0cmVzcyBleGl0J10sIC8vIGZydWl0IG9mIHBvd2VyIG9hc2lzIGNhdmUgKG92ZXIgd2F0ZXIpXG4gIFsweDEwLCAzMjcsMTIzLCAnd2F0ZXJmYWxsIGNhdmUnXSwgLy8gZmx1dGUgb2YgbGltZSBjaGVzdCAoTk9URTogY2hhbmdlZCA1Yi0+IDEwKVxuICBbMHg1YywgMjU2LCA3OSwgJ2V2aWwgc3Bpcml0IGlzbGFuZCddLCAvLyBseXNpcyBwbGFudCBldmlsIHNwaXJpdCBpc2xhbmRcbiAgWzB4NWQsICAzNiwxMzksICdzYWJlcmEgMiBsZXZlbCddLCAvLyBseXNpcyBwbGFudCBzYWJlcmEgbGV2ZWxcbiAgWzB4NWUsICAxNCwyMjksICdzYWJyZSBub3J0aCddLCAvLyBhbnRpZG90ZSBtdCBzYWJyZSBuXG4gIFsweDVmLCAzNDUsMjI1LCAna2lyaXNhIGNhdmUnXSwgLy8gYW50aWRvdGUga2lyaXNhIGNhdmVcbiAgWzB4NjAsICAxOCwgOTQsICdtYWRvIDIgdXBwZXInXSwgLy8gYW50aWRvdGUgZm9ydGVzcyAzXG4gIFsweDYxLCAyMzQsIDk2LCAndmFtcGlyZSAyJ10sIC8vIGZydWl0IG9mIHBvd2VyIHZhbXBpcmUgMlxuICBbMHg2MiwgIDE4LDExOCwgJ3NhYmVyYSAyIGxldmVsJ10sIC8vIGZydWl0IG9mIHBvd2VyIHNhYmVyYSBsZXZlbFxuICBbMHg2MywgIDM2LCA1NCwgJ21hZG8gMiB1cHBlciddLCAvLyBvcGVsIHN0YXR1ZSBmb3J0cmVzcyAzXG4gIFsweDY0LCAxNzUsIDk3LCAnb2FzaXMgY2F2ZSddLCAvLyBmcnVpdCBvZiBwb3dlciBvYXNpcyBjYXZlXG4gIFsweDY1LCAxMzksIDQwLCAnaHlkcmEgYmFjayddLCAvLyBtYWdpYyByaW5nIG10IGh5ZHJhXG4gIFsweDY2LCAgNjYsMTYwLCAnc2FiZXJhIDIgbGV2ZWwnXSwgLy8gZnJ1aXQgb2YgcmVwdW4gc2FiZXJhIGxldmVsXG4gIC8vIDY3IG1hZ2ljIHJpbmdcbiAgLy8gNjggbWFnaWMgcmluZ1xuICBbMHg2OSwgMTMxLDIwMSwgJ3NhYnJlIHdlc3QnXSwgLy8gbWFnaWMgcmluZyBtdCBzYWJyZSB3XG4gIFsweDZhLCAgNzYsMjI2LCAnc2FicmUgd2VzdCddLCAvLyB3YXJwIGJvb3RzIG10IHNhYnJlIHdcbiAgWzB4NmIsICAxOCwxMDAsICdtYWRvIDIgdXBwZXInXSwgLy8gbWFnaWMgcmluZyBmb3J0cmVzcyAzIHVwcGVyIChiZWhpbmQpXG4gIFsweDZjLCAxOTMsMTAzLCAncHlyYW1pZCddLCAvLyBtYWdpYyByaW5nIHB5cmFtaWQgZnJvbnRcbiAgWzB4NzgsIDE5OSwxMDMsICdjcnlwdCddLCAvLyBweXJhbWlkIGJhY2sgbWltaWNcbiAgWzB4NmQsIDIwNSwxMDMsICdjcnlwdCddLCAvLyBvcGVsIHN0YXR1ZSBweXJhbWlkIGJhY2tcbiAgWzB4NzMsIDI1NiwgNjcsICdldmlsIHNwaXJpdCBpc2xhbmQnXSwgLy8gaXJvbiBuZWNrbGFjZSBtaW1pY1xuICBbMHg2ZSwgIDI0LCAzOCwgJ2thcm1pbmUgYmFzZW1lbnQnXSwgLy8gd2FycCBib290cyBrYXJtaW5lXG4gIFsweDZmLCAgNDQsIDk3LCAnbWFkbyAyIGxvd2VyJ10sIC8vIG1hZ2ljIHJpbmcgZm9ydHJlc3MgMyBsb3dlclxuXTtcblxuLy8gbm9uLXVuaXF1ZSBrZXkgaXRlbSBzbG90c1xuY29uc3QgS0VZID0gbmV3IFNldChbMHgxMCwgMHgxMiwgMHgyMywgMHgyNiwgMHg2MV0pO1xuXG5jb25zdCBCT1NTRVMgPSBuZXcgTWFwKFtcbiAgW34weDEwMCwgMHgyZV0sIC8vIHJhYmJpdCBib290cyBzbG90IC0+IHZhbXBpcmUgMVxuICBbfjB4MTAxLCAweDA3XSwgLy8gYmFsbCBvZiBmaXJlIHNsb3QgLT4gaW5zZWN0XG4gIFt+MHgxMDIsIDB4MDhdLCAvLyBmbGFtZSBicmFjZWxldCBzbG90IC0+IGtlbGJlc3F1ZSAxXG4gIFt+MHgxMDMsIDB4MDldLCAvLyBiYWxsIG9mIHdhdGVyIHNsb3QgLT4gcmFnZVxuICBbfjB4MTA0LCAweDM4XSwgLy8gYnJva2VuIHN0YXR1ZSBzbG90IC0+IHNhYmVyYSAxXG4gIFt+MHgxMDUsIDB4MGJdLCAvLyBiYWxsIG9mIHRodW5kZXIgc2xvdCAtPiBtYWRvIDFcbiAgW34weDEwNiwgMHgyNl0sIC8vIG9wZWwgc3RhdHVlIHNsb3QgLT4ga2VsYmVzcXVlIDJcbiAgW34weDEwNywgMHgyM10sIC8vIGZydWl0IG9mIHJlcHVuIHNsb3QgLT4gc2FiZXJhIDJcbiAgW34weDEwOCwgMHgxMl0sIC8vIHNhY3JlZCBzaGllbGQgc2xvdCAtPiBtYWRvIDJcbiAgW34weDEwOSwgMHgzZF0sIC8vIGl2b3J5IHN0YXR1ZSBzbG90IC0+IGthcm1pbmVcbiAgW34weDEwYSwgMHgxY10sIC8vIHBzeWNobyBhcm1vciBzbG90IC0+IGRyYXlnb24gMVxuICAvLyBbLCB+MHgxMGJdLCAvLyBkcmF5Z29uIDJcbiAgW34weDEwYywgMHg2MV0sIC8vIGZydWl0IG9mIHBvd2VyIHNsb3QgLT4gdmFtcGlyZSAyXG5dKTtcblxuLy8gc2xvdHMgdGhhdCBjb21lIGZyb20gdHJhZGUtaW5zXG4vLyAgLSBub3RlOiB0aGUgZm9nIGxhbXAgdHJhZGUtaW4gZG9lc24ndCBoYXZlIGEgZ29vZCBzbG90IGZvciB0aGlzXG4vLyBUT0RPIC0gYWRkIFwidHJhZGVkIGZvZyBsYW1wXCIgdG8gaXRlbXMsIGFkZCBhIGJveCBmb3IgaXQuXG4vLyBUT0RPIC0gY291bnQgbnVtYmVyIG9mIHRyYWRlZCBib3hlcyBjaGVja2VkLCBzZXQgcmVzdCB0byBibG9ja2VkIGlmXG4vLyAgICAgICAgPD0gbnVtYmVyIG9mIGl0ZW1zIGFscmVhZHkgdHJhZGVkIGluLi4uP1xuLy8gVE9ETyAtIGZpbmQtYW5kLXJlcGxhY2UgZm9yIHRvcm5lbCdzIGl0ZW0gYWZ0ZXIgdGhlIGZhY3Q/P1xuY29uc3QgVFJBREVTID0gbmV3IFNldChbMHgyOSwgMHgzZSwgMHg0NCwgMHg0NywgMHg0OF0pO1xuXG4vLyBUT0RPIC0gYWRkIGV4dHJhIGluZGlyZWN0aW9uIGZvciB3YWxscyBpbiBvdmVybGF5IGlmIHRyYWNraW5nXG4vLyAgLSBvbmUgZm9yIGVhY2ggc2VwYXJhdGUgcmVnaW9uLi4uIGhvdyB0byBrZWVwIHRyYWNrIG9mIHRoYXQ/XG4vLyAgLSB0aGVuIGtlZXAgdGhlbSBhcyBpdGVtcy4uLj8gIGJvc3Nlcz8gIG1heWJlIGp1c3QgaGFyZGNvZGVcbi8vICAgIHRoZSBsaW5rYWdlcz8gIG9yIGp1c3QgYWRkIGFsbCB3YWxscyBhcyBpdGVtcyBhbmQgbGluayB0aGVtXG4vLyAgICBkaXJlY3RseSBoZXJlLi4uIC0gdGhhdCBtaWdodCBiZSBiZXR0ZXIuXG5cbi8vIHgsIHksIC4uLmZsYWdzXG4vLyBjb25zdCBXQUxMUzogW251bWJlciwgbnVtYmVyLCAuLi5udW1iZXJdID0gW107XG5cbmNsYXNzIEdyYXBoIHtcbiAgLyoqIG1hcCBmcm9tIGlkIHRvIHNsb3QgaW5kZXggKi9cbiAgcmVhZG9ubHkgc2xvdHMgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAvKiogbWFwIGZyb20gaWQgdG8gaXRlbSBpbmRleCAqL1xuICByZWFkb25seSBpdGVtcyA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gIC8qKiBtYXAgZnJvbSBzbG90IGluZGV4IHRvIGVsZW1lbnQgKi9cbiAgcmVhZG9ubHkgc2xvdEVsdHMgPSBuZXcgTWFwPG51bWJlciwgSFRNTEVsZW1lbnQ+KCk7XG4gIC8qKiBtYXAgZnJvbSBpdGVtIGluZGV4IHRvIGVsZW1lbnQgKi9cbiAgLy9yZWFkb25seSBpdGVtRWx0cyA9IG5ldyBNYXA8bnVtYmVyLCBIVE1MRWxlbWVudD4oKTtcbiAgLyoqIHNldCBvZiBzbG90IGluZGV4ICovXG4gIC8vcmVhZG9ubHkgY2hlY2tlZCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvLyAvKiogbWFwIGZyb20gc2xvdCBpZCB0byBub2RlICovXG4gIC8vIHJlYWRvbmx5IG5vZGVGcm9tU2xvdCA9IG5ldyBNYXA8bnVtYmVyLCBhbnk+KCk7XG4gIC8vIHJlYWRvbmx5IG5vZGVzID0gbmV3IE1hcDxhbnksIGFueT4oKTtcbiAgLyoqIE1hcHMgaXRlbSBpbmRleCB0byB3aGV0aGVyIGl0ZW0gaXMgZ290dGVuICovXG4gIGhhczogQml0cyA9IEJpdHMub2YoKTtcbiAgLyoqIG9ubHkgdXNlZCBmb3IgY2xlYXJpbmc6IHNldCBvZiBpdGVtIGluZGV4IHdlIGp1c3QgYXNzdW1lICovXG4gIHJlYWRvbmx5IGFsd2F5czogQml0cztcblxuICByZWFkb25seSBncmlkOiBFbGVtZW50O1xuICByZWFkb25seSBtYXA6IEVsZW1lbnQ7XG4gIHJlYWRvbmx5IHRyYWNrcyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudD4oKTtcbiAgcmVhZG9ubHkgbWFya3MgPSBuZXcgTWFwPHN0cmluZywgSFRNTEVsZW1lbnRbXT4oKTtcblxuICB2b2ljZSA9IGZhbHNlO1xuICByZWNvZ25pdGlvbj86IFNwZWVjaFJlY29nbml0aW9uO1xuXG4gIHVudXNlZEl0ZW1zOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHdvcmxkOiBXb3JsZCxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgICAvLyBUT0RPIC0gY29tcHV0ZSB0d28gZGVwZ3JhcGhzOiBvbmUgd2l0aCBnbGl0Y2hlcyBhbmQgb25lIHdpdGhvdXRcbiAgICAvLyAgLSB0aGVuIHdlIGNhbiBzaG93IGdyZWVuIHZzIHllbGxvdyBmb3IgZ2xpdGNoYWJsZSBsb2NhdGlvbnMuLj9cblxuICAgICh3aW5kb3cgYXMgYW55KS5HUkFQSCA9IHRoaXM7XG5cbiAgICB0aGlzLmdyaWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdncmlkJylbMF07XG4gICAgdGhpcy5tYXAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdtYXAnKVswXTtcblxuICAgIGxldCBhbHdheXMgPSBCaXRzLm9mKCk7XG5cbiAgICBmb3IgKGNvbnN0IHtpdGVtOiBpZCwgaW5kZXh9IG9mIHdvcmxkLmdyYXBoLnNsb3RzKSB7XG4gICAgICBpZiAoaWQgPT0gbnVsbCkgY29udGludWU7IC8vIHRocm93IG5ldyBFcnJvcihgYmFkIHNsb3Q6ICR7aW5kZXh9YCk7XG4gICAgICB0aGlzLnNsb3RzLnNldChpZCwgaW5kZXgpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHtpdGVtOiBpZCwgaW5kZXh9IG9mIHdvcmxkLmdyYXBoLml0ZW1zKSB7XG4gICAgICBpZiAoaWQgPT0gbnVsbCkgY29udGludWU7IC8vIHRocm93IG5ldyBFcnJvcihgYmFkIGl0ZW06ICR7aW5kZXh9YCk7XG4gICAgICB0aGlzLml0ZW1zLnNldChpZCwgaW5kZXgpO1xuICAgICAgY29uc3QgaXRlbSA9IHJvbS5pdGVtc1tpZF07XG4gICAgICAvLyBUT0RPIC0gc2V0dXAgYWx3YXlzIGZyb20gbm9uLWFkZGVkIGl0ZW1zP1xuICAgICAgaWYgKGl0ZW0gJiYgIWl0ZW0udW5pcXVlKSBhbHdheXMgPSBCaXRzLndpdGgoYWx3YXlzLCBpbmRleCk7XG4gICAgfVxuICAgIHRoaXMudW51c2VkSXRlbXMgPSB3b3JsZC5ncmFwaC5pdGVtcy5sZW5ndGg7XG5cbiAgICB0aGlzLmhhcyA9IHRoaXMuYWx3YXlzID0gYWx3YXlzO1xuXG4gICAgICAvLyB0aGlzLm5vZGVzLnNldChuLnVpZCwgbi5uYW1lKTtcbiAgICAgIC8vIHRoaXMucm91dGVbbi51aWRdID0gNDtcbiAgICAgIC8vIGlmIChuIGluc3RhbmNlb2YgU2xvdCkge1xuICAgICAgLy8gICAvLyB1c2VkIGJ5IGFkZEJveFxuICAgICAgLy8gICBpZiAoIW4uaXNNaW1pYygpKSB7XG4gICAgICAvLyAgICAgdGhpcy5ub2RlRnJvbVNsb3Quc2V0KG4uc2xvdEluZGV4LCBuKTtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICAvLyBub3Qgc2hvd24sIGp1c3QgYXNzdW1lIGhhdmUgaXRcbiAgICAgIC8vICAgaWYgKG4ubmFtZSA9PSAnQWxhcm0gRmx1dGUnIHx8IG4ubmFtZSA9PSAnTWVkaWNhbCBIZXJiJykge1xuICAgICAgLy8gICAgIHRoaXMuYWx3YXlzLmFkZChuLml0ZW0udWlkKTtcbiAgICAgIC8vICAgICB0aGlzLnJvdXRlW24uaXRlbS51aWRdID0gMDtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfSBlbHNlIGlmIChuIGluc3RhbmNlb2YgTG9jYXRpb24pIHtcbiAgICAgIC8vICAgLy8gZmluZCB0aGUgbWltaWNzLCB0aGV5IG5lZWQgc3BlY2lhbCBoYW5kbGluZyBiZWNhdXNlXG4gICAgICAvLyAgIC8vIHRoZXkgYWxsIG1hcCB0byB0aGUgc2FtZSBzbG90IElELi4uXG4gICAgICAvLyAgIGZvciAoY29uc3QgY2hlc3Qgb2Ygbi5jaGVzdHMpIHtcbiAgICAgIC8vICAgICBpZiAoY2hlc3QuaXNNaW1pYygpKSB7XG4gICAgICAvLyAgICAgICB0aGlzLm1pbWljU2xvdHMuc2V0KG4uaWQgPDwgOCB8IGNoZXN0LnNwYXduU2xvdCwgY2hlc3QpO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfVxuICAgICAgLy8gfSBlbHNlIGlmIChuIGluc3RhbmNlb2YgVHJhY2tlck5vZGUpIHtcbiAgICAgIC8vICAgY29uc3QgaW5kZXggPSB0aGlzLmRlcGdyYXBoLnVpZFRvSXRlbVtuLnVpZF07XG4gICAgICAvLyAgIGlmIChpbmRleCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIC8vICAgbGV0IGNvbG9yID0gNDtcbiAgICAgIC8vICAgaWYgKG4udHlwZSA9PT0gVHJhY2tlck5vZGUuT0ZGX1JPVVRFKSBjb2xvciA9IDE7XG4gICAgICAvLyAgIGlmIChuLnR5cGUgPT09IFRyYWNrZXJOb2RlLkdMSVRDSCkgY29sb3IgPSAyO1xuICAgICAgLy8gICBpZiAobi50eXBlID09PSBUcmFja2VyTm9kZS5IQVJEKSBjb2xvciA9IDM7XG4gICAgICAvLyAgIHRoaXMucm91dGVbbi51aWRdID0gY29sb3I7XG4gICAgICAvLyB9XG5cbiAgICBjb25zdCB0b2dnbGUgPSAoZTogRXZlbnQpID0+IHtcbiAgICAgIGxldCB0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnR8bnVsbDtcbiAgICAgIHdoaWxlICh0ICYmICF0LmRhdGFzZXRbJ2luZGV4J10pIHtcbiAgICAgICAgdCA9IHQucGFyZW50RWxlbWVudDtcbiAgICAgIH1cbiAgICAgIGlmICghdCkgcmV0dXJuO1xuICAgICAgdGhpcy50b2dnbGUodCk7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ3JpZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRvZ2dsZSk7XG4gICAgLy90aGlzLm1hcC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRvZ2dsZSk7XG4gIH1cblxuICB0b2dnbGUodDogSFRNTEVsZW1lbnQsIHZhbD86IGJvb2xlYW4pIHtcbiAgICBjb25zdCB1aWQgPSBOdW1iZXIodC5kYXRhc2V0WydpbmRleCddKTtcbiAgICBjb25zdCBoYXMgPSB0LmNsYXNzTGlzdC50b2dnbGUoJ2dvdCcpO1xuICAgIGlmICh0LmRhdGFzZXRbJ2l0ZW0nXSkge1xuICAgICAgdGhpcy5oYXMgPSBoYXMgP1xuICAgICAgICAgIEJpdHMud2l0aCh0aGlzLmhhcywgdWlkKSA6XG4gICAgICAgICAgQml0cy53aXRob3V0KHRoaXMuaGFzLCB1aWQpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZSgpO1xuICB9XG5cbiAgYWRkU2xvdChzbG90SWQ6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIsIC4uLm5hbWVzOiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5zbG90cy5nZXQoc2xvdElkKTtcbiAgICBpZiAoaW5kZXggPT0gbnVsbCkgeyBkZWJ1Z2dlcjsgdGhyb3cgbmV3IEVycm9yKCk7IH1cbiAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjb25zdCBpdGVtZ2V0ID0gdGhpcy5yb20uaXRlbUdldHNbc2xvdElkXTtcbiAgICBjb25zdCBpdGVtID0gaXRlbWdldCAmJiB0aGlzLnJvbS5pdGVtc1tpdGVtZ2V0Lml0ZW1JZF07XG4gICAgLy8gbWFrZSBzb21lIGJveGVzIGJpZ2dlcjsgcXVpY2sgaGFjayB0byBhdm9pZCB1bmlxdWUgYXJtb3JzXG4gICAgaWYgKGl0ZW0gJiYgaXRlbS51bmlxdWUgfHwgS0VZLmhhcyhzbG90SWQpKSB7XG4gICAgICBkaXYuY2xhc3NMaXN0LmFkZCgna2V5Jyk7XG4gICAgICB4LS07IHktLTtcbiAgICB9XG4gICAgeC0tOyB5LS07XG4gICAgZGl2LmRhdGFzZXRbJ2luZGV4J10gPSBTdHJpbmcoaW5kZXgpO1xuICAgIGRpdi5zdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgZGl2LnN0eWxlLnRvcCA9IHkgKyAncHgnO1xuICAgIC8vZGl2LnRleHRDb250ZW50ID0gJ1xceGEwJztcbiAgICBjb25zdCBpbm5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5hcHBlbmRDaGlsZChpbm5lcik7XG4gICAgaW5uZXIudGV4dENvbnRlbnQgPSBuYW1lc1swXTtcbiAgICAgICAgLy8gc2xvdElkID49IDB4NzAgP1xuICAgICAgICAvLyAgICAgJ01pbWljJyA6XG4gICAgICAgIC8vICAgICB0aGlzLnJvbS5pdGVtc1tpdGVtZ2V0Lml0ZW1JZF0ubWVzc2FnZU5hbWUucmVwbGFjZSgnICcsICdcXHhhMCcpO1xuICAgIGlmICh0aGlzLmZsYWdzLnJhbmRvbWl6ZVRyYWRlcygpICYmIFRSQURFUy5oYXMoc2xvdElkKSkge1xuICAgICAgZGl2LmNsYXNzTGlzdC5hZGQoJ2Jvc3MnKTtcbiAgICB9XG4gICAgdGhpcy5zbG90RWx0cy5zZXQoaW5kZXgsIGRpdik7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG4gICAgICBsZXQgbWFya3MgPSB0aGlzLm1hcmtzLmdldChuYW1lKTtcbiAgICAgIGlmIChtYXJrcyA9PSBudWxsKSB0aGlzLm1hcmtzLnNldChuYW1lLCBtYXJrcyA9IFtdKTtcbiAgICAgIG1hcmtzLnB1c2goZGl2KTtcbiAgICB9XG4gICAgdGhpcy5tYXAuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgfVxuXG4gIGFkZEl0ZW0oY2xzOiBzdHJpbmcsIGlkOiBzdHJpbmcsIC4uLm90aGVyTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgLy8gcGFyc2UgdGhlIGhleCwgcmVtb3ZpbmcgJCBwcmVmaXhcbiAgICBjb25zdCB1aWQgPSBOdW1iZXIucGFyc2VJbnQoaWQuc3Vic3RyaW5nKDEpLCAxNik7XG4gICAgY29uc3Qgb3V0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKGNscylbMF0gYXMgSFRNTEVsZW1lbnQ7XG4gICAgY29uc3QgaW5uZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvdXRlci5hcHBlbmRDaGlsZChpbm5lcik7XG4gICAgbGV0IGluZGV4ID0gdGhpcy5pdGVtcy5nZXQodWlkKTtcbiAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xuICAgICAgLy8gSXRlbXMgdGhhdCBkb24ndCBibG9jayBhbnl0aGluZyB3b24ndCBoYXZlIHNob3duIHVwIHlldC5cbiAgICAgIHRoaXMuaXRlbXMuc2V0KHVpZCwgaW5kZXggPSB0aGlzLnVudXNlZEl0ZW1zKyspO1xuICAgIH1cbiAgICBvdXRlci5kYXRhc2V0WydpbmRleCddID0gU3RyaW5nKGluZGV4KTtcbiAgICBvdXRlci5kYXRhc2V0WydpdGVtJ10gPSBTdHJpbmcoaW5kZXgpO1xuICAgIC8vdGhpcy5zbG90RWx0cy5zZXQoaW5kZXgsIG91dGVyKTtcbiAgICB0aGlzLnRyYWNrcy5zZXQoY2xzLnJlcGxhY2UoLy0vZywgJyAnKSwgb3V0ZXIpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBvdGhlck5hbWVzKSB7XG4gICAgICB0aGlzLnRyYWNrcy5zZXQobmFtZS5yZXBsYWNlKC8tL2csICcgJyksIG91dGVyKTtcbiAgICB9XG4gIH1cblxuICBhZGRFeHRyYUZsYWdzKCkge1xuICAgIGNvbnN0IGcgPSB0aGlzLndvcmxkLmdyYXBoO1xuICAgIGZvciAoY29uc3Qgc2xvdCBvZiBnLnNsb3RzLnNsaWNlKGcuZml4ZWQpKSB7XG4gICAgICBjb25zdCBjID0gc2xvdC5jb25kaXRpb247XG4gICAgICBjb25zdCBib3NzU2xvdCA9IEJPU1NFUy5nZXQoYyk7XG4gICAgICBjb25zdCByZXBsYWNlZCA9IGJvc3NTbG90ICYmIHRoaXMuc2xvdHMuZ2V0KGJvc3NTbG90KTtcbiAgICAgIGlmIChyZXBsYWNlZCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGVsdCA9IHRoaXMuc2xvdEVsdHMuZ2V0KHJlcGxhY2VkKTtcbiAgICAgIGlmIChlbHQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCdleHBlY3RlZCcpO1xuICAgICAgdGhpcy5zbG90RWx0cy5kZWxldGUoTnVtYmVyKGVsdC5kYXRhc2V0WydpbmRleCddKSk7XG4gICAgICB0aGlzLnNsb3RFbHRzLnNldChzbG90LmluZGV4LCBlbHQpO1xuICAgICAgZWx0LmNsYXNzTGlzdC5hZGQoJ2Jvc3MnKTtcbiAgICAgIGVsdC5kYXRhc2V0WydpbmRleCddID0gU3RyaW5nKHNsb3QuaW5kZXgpO1xuICAgICAgZWx0LmRhdGFzZXRbJ2l0ZW0nXSA9IFN0cmluZyhzbG90LmluZGV4KTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgZm9yIChjb25zdCBlbHQgb2YgdGhpcy5zbG90RWx0cy52YWx1ZXMoKSkge1xuICAgICAgZWx0LmRhdGFzZXRbJ3N0YXRlJ10gPSBlbHQuY2xhc3NMaXN0LmNvbnRhaW5zKCdnb3QnKSA/ICcnIDogJ2Jsb2NrZWQnO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgdHJhdmVyc2UodGhpcy53b3JsZC5ncmFwaCwgbmV3RmlsbCgpLCB0aGlzLmhhcykpIHtcbiAgICAgIC8vIGZpZ3VyZSBvdXQgd2hldGhlciBpdCdzIGF2YWlsYWJsZSBvciBub3RcbiAgICAgIC8vIFRPRE8gLSBjb25zaWRlciBoYXZpbmcgbXVsdGlwbGUgd29ybGRzLCBmb3IgZ2xpdGNoZWQvaGFyZD9cbiAgICAgIC8vICAgICAgLT4gYWRqdXN0IGZsYWdzIHRvIGFkZCBhbGwgZ2xpdGNoZXMvaGFyZCBtb2RlXG4gICAgICBjb25zdCBlbHQgPSB0aGlzLnNsb3RFbHRzLmdldChzbG90KTtcbiAgICAgIGlmIChlbHQgJiYgIWVsdC5jbGFzc0xpc3QuY29udGFpbnMoJ2dvdCcpKSB7XG4gICAgICAgIGVsdC5kYXRhc2V0WydzdGF0ZSddID0gJ2F2YWlsYWJsZSc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWRkVm9pY2VSZWNvZ25pdGlvbihkaXNhYmxlQ2FsbGJhY2s6ICgpID0+IHZvaWQpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVjID0gdGhpcy5yZWNvZ25pdGlvbiA9IG5ldyBTcGVlY2hSZWNvZ25pdGlvbigpO1xuICAgICAgLy8gTk9URTogYXMgZmFyIGFzIEkgY2FuIHRlbGwsIHRoaXMgZG9lcyBub3RoaW5nLi4uXG4gICAgICBjb25zdCBncmFtbWFyID0gbmV3IFNwZWVjaEdyYW1tYXJMaXN0KCk7XG4gICAgICBncmFtbWFyLmFkZEZyb21TdHJpbmcoYFxuICAgICAgICAgICNKU0dGIFYxLjA7XG4gICAgICAgICAgZ3JhbW1hciBjb21tYW5kO1xuICAgICAgICAgIHB1YmxpYyA8aXRlbT4gPSAke1suLi50aGlzLnRyYWNrcy5rZXlzKCldLmpvaW4oJyB8ICcpfTtcbiAgICAgICAgICBwdWJsaWMgPGNoZWNrPiA9ICR7Wy4uLnRoaXMubWFya3Mua2V5cygpXS5qb2luKCcgfCAnKX07XG4gICAgICAgICAgcHVibGljIDxjbGVhcj4gPSA8Y2hlY2s+IHwgJHtbLi4uZnVsbENsZWFycy5rZXlzKCldLmpvaW4oJyB8ICcpfTtcbiAgICAgICAgICBwdWJsaWMgPGNvbW1hbmQ+ID0gdHJhY2sgPGl0ZW0+IHwgdW50cmFjayA8aXRlbT4gfCBtYXJrIDxjaGVjaz4gfCB1bm1hcmsgPGNoZWNrPiB8IGNsZWFyIDxjbGVhcj4gfCBzdG9wIGxpc3RlbmluZztcbiAgICAgIGAsIDEpO1xuICAgICAgcmVjLmxhbmcgPSAnZW4tVVMnO1xuICAgICAgcmVjLmdyYW1tYXJzID0gZ3JhbW1hcjtcbiAgICAgIHJlYy5pbnRlcmltUmVzdWx0cyA9IGZhbHNlO1xuICAgICAgLy9yZWMuY29udGludW91cyA9IHRydWU7XG4gICAgICByZWMubWF4QWx0ZXJuYXRpdmVzID0gMTA7XG4gICAgICByZWMub25zdGFydCA9ICgpID0+IHsgdGhpcy52b2ljZSA9IHRydWU7IH07XG4gICAgICByZWMub25yZXN1bHQgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBzZWFyY2hlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBlLnJlc3VsdHNbZS5yZXN1bHRzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIXJlc3VsdC5pc0ZpbmFsKSByZXR1cm47XG4gICAgICAgIGxldCBtYXRjaGVkID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgYWx0IG9mIHJlc3VsdCkge1xuICAgICAgICAgIGxldCBjbWQgPSBhbHQudHJhbnNjcmlwdC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16IF0vZywgJycpO1xuICAgICAgICAgIHNlYXJjaGVkLmFkZChjbWQpO1xuICAgICAgICAgIGlmIChjbWQgPT09ICdzdG9wIGxpc3RlbmluZycpIHtcbiAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy52b2ljZSA9IGZhbHNlO1xuICAgICAgICAgICAgZGlzYWJsZUNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgW3JlLCByZXBsXSBvZiB2b2ljZVJlcGxhY2VtZW50cykge1xuICAgICAgICAgICAgY21kID0gY21kLnJlcGxhY2UocmUsIHJlcGwpO1xuICAgICAgICAgICAgc2VhcmNoZWQuYWRkKGNtZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCBtYXRjaCA9IC9eKHRyYWNrfHVudHJhY2t8Y2xlYXJ8dW5jbGVhcnxmdWxsIGNsZWFyKSAoLiopLy5leGVjKGNtZCk7XG4gICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGBhdHRlbXB0OiAke21hdGNoWzJdfWApO1xuICAgICAgICAgICAgaWYgKG1hdGNoWzFdLmVuZHNXaXRoKCd0cmFjaycpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpcy50cmFja3MuZ2V0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgICAgaWYgKCFlbCkgY29udGludWU7XG4gICAgICAgICAgICAgIHRoaXMudG9nZ2xlKGVsLCAhbWF0Y2hbMV0uc3RhcnRzV2l0aCgndW4nKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoWzFdLmVuZHNXaXRoKCdjbGVhcicpKSB7XG4gICAgICAgICAgICAgIGxldCBtYXJrcyA9IGZ1bGxDbGVhcnMuZ2V0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgICAgaWYgKCFtYXJrcykge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5tYXJrcy5oYXMobWF0Y2hbMl0pKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBtYXJrcyA9IFttYXRjaFsyXV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9yIChjb25zdCBtYXJrIG9mIG1hcmtzKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzLm1hcmtzLmdldChtYXJrKSEpIHtcbiAgICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC50b2dnbGUoJ2dvdCcsICFtYXRjaFsxXS5zdGFydHNXaXRoKCd1bicpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgbWF0Y2ggPVxuICAgICAgICAgICAgICAvXig/OnVuKT9tYXJrKD86IChcXGQrKSg/OiBjaGUoPzpzdHxjaylzPyk/KD86IGluKSk/ICguKikvXG4gICAgICAgICAgICAgICAgICAuZXhlYyhjbWQpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgY29uc3QgZWxzID0gdGhpcy5tYXJrcy5nZXQobWF0Y2hbMl0pO1xuICAgICAgICAgICAgbGV0IG51bSA9IE51bWJlcihtYXRjaFsxXSB8fCAnMScpO1xuICAgICAgICAgICAgLy8gVE9ETyAtIGZhbGwgYmFjayBvbiBrZXkgaXRlbSBuYW1lcz8gIFwidW5tYXJrIHRlbGVwYXRoeVwiXG4gICAgICAgICAgICBpZiAoIWVscyB8fCAhbnVtKSBjb250aW51ZTtcbiAgICAgICAgICAgIGNvbnN0IGdvdCA9ICFjbWQuc3RhcnRzV2l0aCgndW4nKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgZWxzKSB7XG4gICAgICAgICAgICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2dvdCcpICE9PSBnb3QpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QudG9nZ2xlKCdnb3QnLCBnb3QpO1xuICAgICAgICAgICAgICAgIGlmICgtLW51bSA9PT0gMCkgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghbWF0Y2hlZCkge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBObyBtYXRjaDogJHtbLi4ucmVzdWx0XS5tYXAoXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgIHIgPT4gci50cmFuc2NyaXB0KS5qb2luKCcsICcpfWApO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBObyBtYXRjaDogJHtbLi4uc2VhcmNoZWRdLmpvaW4oJywgJyl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVjLnN0b3AoKTsgLy8gZ2Vja28gZG9lc24ndCBzdXBwb3J0IGNvbnRpbnVvdXM/XG4gICAgICB9O1xuICAgICAgcmVjLm9uZW5kID0gKCkgPT4geyBpZiAodGhpcy52b2ljZSkgcmVjLnN0YXJ0KCk7IH07XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBzdGFydFZvaWNlKGRpc2FibGVDYWxsYmFjazogKCkgPT4gdm9pZCkge1xuICAgIGlmICghdGhpcy5yZWNvZ25pdGlvbiAmJiAhdGhpcy5hZGRWb2ljZVJlY29nbml0aW9uKGRpc2FibGVDYWxsYmFjaykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy52b2ljZSA9IHRydWU7XG4gICAgdGhpcy5yZWNvZ25pdGlvbiEuc3RhcnQoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHN0b3BWb2ljZSgpIHtcbiAgICB0aGlzLnZvaWNlID0gZmFsc2U7XG4gICAgaWYgKHRoaXMucmVjb2duaXRpb24pIHRoaXMucmVjb2duaXRpb24uc3RvcCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBvbHlmaWxsKC4uLm5hbWVzOiBzdHJpbmdbXSkge1xuICBjb25zdCB3aW4gPSB3aW5kb3cgYXMgYW55O1xuICBmb3IgKGxldCBuIG9mIG5hbWVzKSB7XG4gICAgaWYgKHR5cGVvZiB3aW5bbl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHdpbltuYW1lc1swXV0gPSB3aW5bbl07XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIGNvbnNvbGUuZXJyb3IoYENvdWxkIG5vdCBwb2x5ZmlsbCAke25hbWVzWzBdfWApO1xufVxucG9seWZpbGwoJ1NwZWVjaFJlY29nbml0aW9uJywgJ3dlYmtpdFNwZWVjaFJlY29nbml0aW9uJyk7XG5wb2x5ZmlsbCgnU3BlZWNoR3JhbW1hckxpc3QnLCAnd2Via2l0U3BlZWNoR3JhbW1hckxpc3QnKTtcblxuXG5cbi8vIGZ1bmN0aW9uIGlzU2xvdCh4OiBudW1iZXIpOiBib29sZWFuIHtcbi8vICAgcmV0dXJuICh4ICYgfjB4N2YpID09PSAweDEwMDtcbi8vIH1cblxuLy8gVE9ETyAtIGFsbCBHIGZsYWdzIGdldCB0aGUgZ2xpdGNoIGZvciBmcmVlXG4vLyAgICAgIC0gYWxsIG90aGVycyAobWludXMgd2lsZCB3YXJwIGlmIGRpc2FibGVkKSB0cmFja2VkIGFzIGdsaXRjaGVzXG4vLyAgICAgIC0gY29uc2lkZXIgZGFyayB5ZWxsb3cgYW5kIGRhcmsgZ3JlZW4gYXMgd2VsbCBhcyBkYXJrIGJsdWUgPz9cblxubGV0IGZsYWdzID0gJ1JscHQgVGInO1xuZm9yIChjb25zdCBhcmcgb2YgbG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkuc3BsaXQoJyYnKSkge1xuICBjb25zdCBba2V5LCB2YWx1ZV0gPSBhcmcuc3BsaXQoJz0nKTtcbiAgaWYgKGtleSA9PT0gJ2ZsYWdzJykge1xuICAgIGZsYWdzID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgfVxufVxuLy8gICAnc3BlZWQtYm9vdHMnOiB0cnVlLFxuLy8gICAnZ2xpdGNoLWdoZXR0by1mbGlnaHQnOiB0cnVlLFxuLy8gICAnZ2xpdGNoLXRhbGsnOiB0cnVlLFxuLy8gICAncm91dGUtbm8tZnJlZS1iYXJyaWVyJzogdHJ1ZSxcbi8vICAgJ3JvdXRlLXNoeXJvbi10ZWxlcG9ydCc6IHRydWUsXG4vLyAgICdyb3V0ZS1lYXJseS1mbGlnaHQnOiB0cnVlLFxuLy8gICAndHJhY2tlcic6IHRydWUsXG4vLyB9O1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuICBjb25zdCByb20gPSBhd2FpdCBSb20ubG9hZCgpO1xuICBjb25zdCBmbGFnc2V0ID0gbmV3IEZsYWdTZXQoZmxhZ3MpO1xuICBkZXRlcm1pbmlzdGljKHJvbSwgZmxhZ3NldCk7IC8vIG1ha2UgZGV0ZXJtaW5pc3RpYyBjaGFuZ2VzXG4gIGNvbnN0IHdvcmxkID0gV29ybGQuYnVpbGQocm9tLCBmbGFnc2V0LCB0cnVlKTsgLy8gKyAnIER0JykpO1xuICBjb25zdCBncmFwaCA9IG5ldyBHcmFwaChyb20sIHdvcmxkLCBmbGFnc2V0KTtcbiAgZm9yIChsZXQgaXRlbSBvZiBJVEVNUy5zcGxpdCgnXFxuJykpIHtcbiAgICBpdGVtID0gaXRlbS5yZXBsYWNlKC8jLiovLCAnJykudHJpbSgpO1xuICAgIGlmICghaXRlbSkgY29udGludWU7XG4gICAgZ3JhcGguYWRkSXRlbSguLi4oaXRlbS5zcGxpdCgvICsvZykgYXMgW3N0cmluZywgc3RyaW5nLCAuLi5zdHJpbmdbXV0pKTtcbiAgfVxuICBmb3IgKGNvbnN0IHNsb3Qgb2YgU0xPVFMpIHtcbiAgICBncmFwaC5hZGRTbG90KC4uLnNsb3QpO1xuICB9XG4gIGdyYXBoLmFkZEV4dHJhRmxhZ3MoKTtcbiAgZ3JhcGgudXBkYXRlKCk7XG5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZS1tYXAnKSEuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgZ3JhcGgubWFwLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicpO1xuICB9KTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NsZWFyLWFsbCcpIS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZ3JhcGguZ3JpZC5xdWVyeVNlbGVjdG9yQWxsKCcuZ290JykpIHtcbiAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZSgnZ290Jyk7XG4gICAgfVxuICAgIGdyYXBoLmhhcyA9IGdyYXBoLmFsd2F5cztcbiAgICBncmFwaC51cGRhdGUoKTtcbiAgfSk7XG4gIGNvbnN0IHZvaWNlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZvaWNlJykhO1xuICB2b2ljZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBpZiAoZ3JhcGgudm9pY2UpIHtcbiAgICAgIGdyYXBoLnN0b3BWb2ljZSgpO1xuICAgICAgdm9pY2UudGV4dENvbnRlbnQgPSAnZW5hYmxlIHZvaWNlJztcbiAgICB9IGVsc2UgaWYgKGdyYXBoLnN0YXJ0Vm9pY2UoKCkgPT4gdm9pY2UudGV4dENvbnRlbnQgPSAnZW5hYmxlIHZvaWNlJykpIHtcbiAgICAgIHZvaWNlLnRleHRDb250ZW50ID0gJ2Rpc2FibGUgdm9pY2UnO1xuICAgIH0gZWxzZSB7XG4gICAgICB2b2ljZS50ZXh0Q29udGVudCA9ICd2b2ljZSByZWNvZ25pdGlvbiBmYWlsZWQnO1xuICAgIH1cbiAgfSk7XG4gICh3aW5kb3cgYXMgYW55KS5ncmFwaCA9IGdyYXBoO1xufTtcblxuLy9mdW5jdGlvbiBkaWUoKTogbmV2ZXIgeyB0aHJvdyBuZXcgRXJyb3IoJ0Fzc2VydGlvbiBmYWlsZWQnKTsgfVxuXG5tYWluKCk7XG4iXX0=