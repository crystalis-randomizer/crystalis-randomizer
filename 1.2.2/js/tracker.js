import { World } from './graph/world.js';
import { newFill, traverse } from './graph/shuffle.js';
import { Bits } from './bits.js';
import { FlagSet } from './flagset.js';
import { Rom } from './rom.js';
import { deterministic } from './pass/deterministic.js';
const ITEMS = `
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
const voiceReplacements = [
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
const SLOTS = [
    [0x00, 121, 192, 'leaf elder'],
    [0x01, 274, 176, 'oak elder'],
    [0x02, 335, 123, 'waterfall cave'],
    [0x03, 77, 10, 'styx left'],
    [0x05, 89, 107, 'sealed cave front'],
    [0x06, 115, 224, 'sabre west slope'],
    [0x07, 282, 187, 'insect'],
    [0x08, 47, 182, 'kelby 1'],
    [0x09, 251, 232, 'rage'],
    [0x0a, 206, 249, 'aryllis basement'],
    [0x0b, 83, 63, 'mado 1'],
    [0x0c, 23, 9, 'behind karmine'],
    [0x12, 49, 48, 'mado 2'],
    [0x14, 77, 2, 'styx right'],
    [0x76, 70, 3, 'styx right'],
    [0x77, 84, 3, 'styx right'],
    [0x1b, 168, 96, 'oasis cave flight'],
    [0x1c, 199, 110, 'draygon'],
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
    [0x25, 189, 180, 'cordel grass'],
    [0x26, 18, 172, 'kelby 2'],
    [0x27, 267, 185, 'oak mother'],
    [0x28, 275, 147, 'portoa queen'],
    [0x29, 147, 206, 'akahana'],
    [0x2a, 172, 104, 'oasis cave center'],
    [0x2b, 203, 5, 'brokahana'],
    [0x2c, 249, 69, 'evil spirit island'],
    [0x2d, 191, 110, 'deo'],
    [0x2e, 89, 99, 'vampire 1'],
    [0x2f, 164, 104, 'oasis cave'],
    [0x30, 319, 123, 'stone akahana'],
    [0x72, 320, 130, 'waterfall cave'],
    [0x32, 105, 94, 'windmill guard'],
    [0x33, 64, 198, 'sabre north'],
    [0x34, 83, 71, 'zebu'],
    [0x35, 345, 140, 'fog lamp back'],
    [0x36, 301, 119, 'dolphin'],
    [0x37, 233, 118, 'clark'],
    [0x38, 234, 88, 'sabera 1'],
    [0x39, 295, 92, 'lighthouse'],
    [0x3b, 274, 117, 'channel'],
    [0x3c, 338, 226, 'kirisa meadow'],
    [0x3d, 23, 17, 'karmine'],
    [0x3e, 206, 241, 'aryllis'],
    [0x3f, 101, 6, 'hydra summit'],
    [0x40, 207, 110, 'draygon'],
    [0x41, 92, 117, 'windmill'],
    [0x42, 279, 126, 'sabre summit'],
    [0x43, 202, 138, 'stom'],
    [0x44, 124, 202, 'tornel'],
    [0x45, 304, 128, 'asina'],
    [0x46, 248, 35, 'whirlpool'],
    [0x47, 277, 3, 'swan'],
    [0x48, 15, 25, 'slime'],
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
    addSlot(slotId, x, y, name) {
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
        inner.textContent =
            slotId >= 0x70 ?
                'Mimic' :
                this.rom.items[itemget.itemId].messageName.replace(' ', '\xa0');
        if (this.flags.randomizeTrades() && TRADES.has(slotId)) {
            div.classList.add('boss');
        }
        this.slotElts.set(index, div);
        let marks = this.marks.get(name);
        if (marks == null)
            this.marks.set(name, marks = []);
        marks.push(div);
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
    addVoiceRecognition() {
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
    startVoice() {
        if (!this.recognition && !this.addVoiceRecognition())
            return false;
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
        else if (graph.startVoice()) {
            voice.textContent = 'disable voice';
        }
    });
    window.graph = graph;
}
;
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90cmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0IsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNyQyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdCLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxNQUFNLEtBQUssR0FBVzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBc0RyQixDQUFDO0FBRUYsTUFBTSxpQkFBaUIsR0FBNkM7SUFDbEUsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDO0lBQzlCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQztJQUNyQixDQUFDLDhFQUE4RTtRQUM5RSxNQUFNLENBQUM7SUFDUixDQUFDLHNFQUFzRTtRQUN0RSxTQUFTLENBQUM7SUFDWCxDQUFDLHVDQUF1QyxFQUFFLFVBQVUsQ0FBQztJQUNyRCxDQUFDLHVCQUF1QixFQUFFLGtCQUFrQixDQUFDO0lBQzdDLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDO0lBQy9CLENBQUMsdUNBQXVDLEVBQUUsTUFBTSxDQUFDO0lBQ2pELENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQztJQUNoQixDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQztJQUM1QixDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUM7SUFDbEIsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDO0lBQ2pCLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFD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QyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQztJQUMxQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQztJQUN4QixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQztJQUMzQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQztJQUU3QixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQztJQUMxQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQztJQUNoQyxDQUFDLElBQUksRUFBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQztJQUMxQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQztJQUMxQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUcsQ0FBQyxFQUFFLGNBQWMsQ0FBQztJQUMvQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQztJQUMxQixDQUFDLElBQUksRUFBRyxFQUFFLEVBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQztJQUMzQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQztJQUMvQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQztJQUN2QixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQztJQUN6QixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQztJQUN4QixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFdBQVcsQ0FBQztJQUM1QixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQztJQUN2QixDQUFDLElBQUksRUFBRyxFQUFFLEVBQUUsRUFBRSxF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Q0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ25FLEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNuRCxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMzQjtRQUNELEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUN6QixLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBRSxDQUFDO0lBQ2hELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ25DLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRTtZQUNmLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNsQixLQUFLLENBQUMsV0FBVyxHQUFHLGNBQWMsQ0FBQztTQUNwQzthQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQzdCLEtBQUssQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1NBQ3JDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDRixNQUFjLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUNoQyxDQUFDO0FBQUEsQ0FBQztBQUlGLElBQUksRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gSXRlbSB0cmFja2VyIGZvciB3ZWIuXG4vLyBVc2VzIGZsYWdzZXQgdG8gZmlndXJlIG91dCBhY3R1YWwgZGVwZW5kZW5jaWVzLlxuXG4vLyBUT0RPIC0gY29uc2lkZXIgdXNpbmcgYW5ueWFuZyBmb3Igc3BlZWNoIHJlY29nbml0aW9uP1xuXG5pbXBvcnQge1dvcmxkfSBmcm9tICcuL2dyYXBoL3dvcmxkLmpzJztcbmltcG9ydCB7bmV3RmlsbCwgdHJhdmVyc2V9IGZyb20gJy4vZ3JhcGgvc2h1ZmZsZS5qcyc7XG5pbXBvcnQge0JpdHN9IGZyb20gJy4vYml0cy5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi9yb20uanMnO1xuaW1wb3J0IHtkZXRlcm1pbmlzdGljfSBmcm9tICcuL3Bhc3MvZGV0ZXJtaW5pc3RpYy5qcyc7XG5cbmNvbnN0IElURU1TOiBzdHJpbmcgPSBgXG5zd29yZC1vZi13aW5kICQwMCBzb3J0LW9mLXdpbmRcbnN3b3JkLW9mLWZpcmUgJDAxIHNvcnQtb2YtZmlyZVxuc3dvcmQtb2Ytd2F0ZXIgJDAyIHNvcnQtb2Ytd2F0ZXJcbnN3b3JkLW9mLXRodW5kZXIgJDAzIHNvcnQtb2YtdGh1bmRlclxud2luZG1pbGwta2V5ICQzMlxuc3RhdHVlLW9mLW9ueXggJDI1IG9ueXgtc3RhdHVlXG5pbnNlY3QtZmx1dGUgJDI3XG5rZXktdG8tcHJpc29uICQzMyBwcmlzb24ta2V5IGtleS0yLXByaXNvblxuZmx1dGUtb2YtbGltZSAkMjhcblxuYmFsbC1vZi13aW5kICQwNSBvcmItb2Ytd2luZFxuYmFsbC1vZi1maXJlICQwNyBvcmItb2YtZmlyZVxuYmFsbC1vZi13YXRlciAkMDkgb3JiLW9mLXdhdGVyXG5iYWxsLW9mLXRodW5kZXIgJDBiIG9yYi1vZi10aHVuZGVyXG5raXJpc2EtcGxhbnQgJDNjXG5hbGFybS1mbHV0ZSAkMzFcbmZvZy1sYW1wICQzNVxuc2hlbGwtZmx1dGUgJDM2XG5icm9rZW4tc3RhdHVlICQzOFxuZXllLWdsYXNzZXMgJDM3IGV5ZWdsYXNzZXNcbmdsb3dpbmctbGFtcCAkMzlcblxudG9ybmFkby1icmFjZWxldCAkMDZcbmZsYW1lLWJyYWNlbGV0ICQwOFxuYmxpenphcmQtYnJhY2VsZXQgJDBhXG5zdG9ybS1icmFjZWxldCAkMGNcbmxvdmUtcGVuZGFudCAkM2JcbmtleS10by1zdHl4ICQzNCBrZXktMi1zdHl4XG5vcGVsLXN0YXR1ZSAkMjZcbnNhY3JlZC1zaGllbGQgJDEyXG5pdm9yeS1zdGF0dWUgJDNkXG5cbnJhYmJpdC1ib290cyAkMmVcbmdhcy1tYXNrICQyOSBoYXphcmQtc3VpdCBoYXptYXQtc3VpdFxuc2hpZWxkLXJpbmcgJDMwXG5pcm9uLW5lY2tsYWNlICQyY1xubGVhdGhlci1ib290cyAkMmYgc3BlZWQtYm9vdHNcbnBvd2VyLXJpbmcgJDJhXG53YXJyaW9yLXJpbmcgJDJiXG5kZW9zLXBlbmRhbnQgJDJkIGRlb1xuYm93LW9mLW1vb24gJDNlIG1vb25cbmJvdy1vZi1zdW4gJDNmIHN1blxuXG5yZWZyZXNoICQ0MVxucGFyYWx5c2lzICQ0MlxudGVsZXBhdGh5ICQ0M1xudGVsZXBvcnQgJDQ0XG5yZWNvdmVyICQ0NVxuYmFycmllciAkNDZcbmNoYW5nZSAkNDdcbmZsaWdodCAkNDhcbnBzeWNoby1hcm1vciAkMWNcbmJvdy1vZi10cnV0aCAkNDAgdHJ1dGhcbmA7XG5cbmNvbnN0IHZvaWNlUmVwbGFjZW1lbnRzOiBSZWFkb25seUFycmF5PHJlYWRvbmx5IFtSZWdFeHAsIHN0cmluZ10+ID0gW1xuICBbL1xcYmtldG9zdGl4XFxiLywgJ2tleSAyIHN0eXgnXSxcbiAgWy9cXGJrZXRvXFxiLywgJ2tleSAyJ10sXG4gIFsvXFxiKHN0aWNrc3xzdGljayBjfHN0aXggZXxzdGljayBzZWF8ZGl4aWV8c3RpY2tzIGV8c3RpY2sgc2VlfHNleHl8NjB8c2l4dHkpXFxiLyxcbiAgICdzdHl4J10sXG4gIFsvXFxiKGFycmF5bGlzdHxnb3JpbGxhW3N6XXxhdXJlbGl1c3xoP2Fpcmxlc3N8YSByZWFsaXN0fGFybFtlaXldc3M/KVxcYi8sXG4gICAnYXJ5bGxpcyddLFxuICBbL1xcYihhbWF6b24gdXN8YW1hem9uW2FlXT9zcz98YW1hem9uKVxcYi8sICdhbWF6b25lcyddLFxuICBbL1xcYmFtYXpvbmVzIGJhc2VtZW50XFxiLywgJ2FyeWxsaXMgYmFzZW1lbnQnXSxcbiAgWy9cXGIoZGVhbHxkaWx8ZGllaGwpXFxiLywgJ2RlbyddLFxuICBbL1xcYihkc3xkZWFsc3xkaWF6fGRlbG9zfGRyb3NlfHRoZW9zKVxcYi8sICdkZW9zJ10sXG4gIFsvXFxib25lXFxiLywgJzEnXSxcbiAgWy9cXGIodHdvfGlpfHRvfHRvbylcXGIvLCAnMiddLFxuICBbL1xcYnRocmVlXFxiLywgJzMnXSxcbiAgWy9cXGJmb3VyXFxiLywgJzQnXSxcbiAgWy9cXGJhcltja11zIHRvbVxcYi8sICdhcmsgc3RvbSddLFxuICBbL1xcYm9yYml0XFxiLywgJ29yYiBvZiddLFxuICBbL14oY29udHJhY3R8YW10cmFja3xvbnRyYShjfGt8Y2spKVxcYi8sICd1bnRyYWNrJ10sXG4gIFsvXigoY2h8dHIpW2V1XShjfGt8Y2spKVxcYi8sICd0cmFjayddLFxuICBbL150cmFjayA/c3VpdFxcYi8sICd0cmFjayBmbHV0ZSddLFxuICBbL1xcYihseW1lKVxcYi8sICdsaW1lJ10sXG4gIFsvbWFya2VkXFxiLywgJ21hcmsnXSxcbiAgWy9eKG1hcmN8bWFjaHxzbWFydHxbYnBdYXJrKVxcYi8sICdtYXJrJ10sXG4gIFsvXFxibGVlIGZlbGRlclxcYi8sICdsZWFmIGVsZGVyJ10sXG4gIFsvXm1hcmtsZXkgZi8sICdtYXJrIGxlYWYgJ10sXG4gIFsvXihtYXJrIG9mfG1hcmtldClcXGIvLCAnbWFyayddLFxuICBbL1xcYmxlaWZcXGIvLCAnbGVhZiddLFxuICBbL1xcYmVsZGFyXFxiLywgJ2VsZGVyJ10sXG4gIFsvXFxibGlnaHRcXGIvLCAnZmxpZ2h0J10sXG4gIFsvXFxibWFublxcYi8sICdtb29uJ10sXG4gIFsvXFxiYm9zZW1hbm4/XFxiLywgJ2JvdyBvZiBtb29uJ10sXG4gIFsvXFxiKGNlcnRpZmllcnxzdGFydCBhIGZpcmUpXFxiLywgJ3N3b3JkIG9mIGZpcmUnXSxcbiAgWy9cXGJ3aGVuIG1pbGt5XFxiLywgJ3dpbmRtaWxsIGtleSddLFxuICBbL14oNCBjbGVhcnxmYXV4IGNsZWFyfGZvbGtsb3JlfHNvID9jbGVhcnxwaG8gY2xlYXIpXFxiLywgJ2Z1bGwgY2xlYXInXSxcbiAgWy9cXGIobWF5b3xtZXRvfG5hdG98bWFkZXJ8bWVhZG93fG1hdHRlcnxtYVtkdF1lcnxtb3R0b3xtb2RlbClcXGIvLCAnbWFkbyddLFxuICBbL1xcYmNhbHZleVxcYi8sICdrZWxieSddLFxuICBbL1xcYihrZWxieW9uZXxsdiA/MSlcXGIvLCAna2VsYnkgMSddLFxuICBbL1xcYmx2ID8yXFxiLywgJ2tlbGJ5IDInXSxcbiAgWy9cXGIoY2FybWluZXxjYXJtZW58Y29tYmluZSlcXGIvLCAna2FybWluZSddLFxuICBbL1xcYihkcmFbZ2tdW2FvXW4pXFxiLywgJ2RyYXlnb24nXSxcbiAgWy9cXGIoW2NzXVthZV1bYmRndl1bYWVpdV0qclthZV18eGF2aWVyKVxcYi8sICdzYWJlcmEnXSxcbiAgWy9cXGIod3JpZ2h0fHJpdGV8d3JpdGUpXFxiLywgJ3JpZ2h0J10sXG4gIFsvXFxiKFtja11vcltiZF1lbFtsZV0/fHF1YWRyZWwpXFxiLywgJ2NvcmRlbCddLFxuICBbL1xcYihob3RlbCBkZXNrfChiZWwpP2wgZGVza3xraWxsIGJhc3F1ZXxrZWhsIGJhc2N8Y2FsZWIgYXNrKGVkKT8pXFxiLyxcbiAgICdrZWxieSddLFxuICBbL1xcYihwb3J0ZXJ8cG9ydFtlb11sYXxwb3J0byBhKVxcYi8sICdwb3J0b2EnXSxcbiAgWy9cXGIoYXRoZW5hfGNlbmF8dGluYXxpc2luYXxlc3F1aW5hKVxcYi8sICdhc2luYSddLFxuICBbL1xcYigoYXQgdGhlfGVjW2hrXW8pIGhhbm4/YWg/fGFsY29ob2woaWMpPylcXGIvLCAnYWthaGFuYSddLFxuICBbL1xcYigocm9jYXxicm9rZVtucl18YnJva2F3fGJhcnI/b2NhKSBoYW5uP2FoP3xicm8ga1thb11oW2FvXW5hfHBva2VoYW5hKVxcYi8sXG4gICAnYnJva2FoYW5hJ10sXG4gIFsvXFxiKHN0b25lZClcXGIvLCAnc3RvbmUnXSxcbiAgWy9cXGIoZ3VhcmRzKVxcYi8sICdndWFyZCddLFxuICBbL1xcYih3aW5kb3cpXFxiLywgJ3dpbmRtaWxsJ10sXG4gIFsvXFxiKHNhW2J2XVtlb11yKVxcYi8sICdzYWJyZSddLFxuICBbL1xcYnNhYnJlIHNvdXRoXFxiLywgJ3NhYnJlIHdlc3QnXSxcbiAgWy9cXGIoaGVicmV3fGNlYnV8c2ViYmF8emFiZWwpXFxiLywgJ3plYnUnXSxcbiAgWy9cXGIoW2JjdF0oW2FvdV1yfHJbYW91XSlubj9lbGw/KVxcYi8sICd0b3JuZWwnXSxcbiAgWy9cXGIoY2xhcmtlKVxcYi8sICdjbGFyayddLFxuICBbL1xcYnNhYmVyYSAxIGxlZnRcXGIvLCAnc2FiZXJhIGZvcnRyZXNzIGxlZnQnXSxcbiAgWy9cXGJzYWJlcmEgMSByaWdodFxcYi8sICdzYWJlcmEgZm9ydHJlc3MgcmlnaHQnXSxcbiAgWy9cXGIoY2FudHV8Y2FuY2VsfGNhbiBzdWV8a2luY2VyfGtlbnpvfGNhbmNlcilcXGIvLCAna2Vuc3UnXSxcbiAgWy9cXGIobGlnaHQgaG91c2UpXFxiLywgJ2xpZ2h0aG91c2UnXSxcbiAgWy9cXGJrZW5zdSg/OiBpbik/IChsaWdodGhvdXNlfHN3YW4pXFxiLywgJyQxJ10sXG4gIFsvXFxiKGtlbnN1IHNsaW1lfHNsaW1lIGtlbnN1KVxcYi8sICdzbGltZSddLFxuICBbL1xcYnVuZGVyZ3JvdW5kIGNoYW5uZWxcXGIvLCAnY2hhbm5lbCddLFxuICBbL1xcYig/Om1vdW50fG10KSAoc2FicmV8aHlkcmEpXFxiLywgJyQxJ10sXG4gIFsvXFxiKFtja11oP1thdV1yW2l1XXNzP1thb3VdKVxcYi8sICdraXJpc2EnXSxcbiAgWy9cXGJtYWRvIChsb3dlcnx1cHBlcilcXGIvLCAnbWFkbyAyICQxJ10sXG4gIFsvXFxic2FiZXJhKCAyKT8gKGxldmVsfGNoZXN0fHNld2VyKVxcYi8sICdzYWJlcmEgMiBsZXZlbCddLFxuICBbL1xcYihzY3JpcHR8cmljaHQpXFxiLywgJ2NyeXB0J10sXG4gIFsvXFxiZHJheWdvbiAxXFxiLywgJ2RyYXlnb24nXSxcbiAgWy9cXGJlc2lcXGIvLCAnZXZpbCBzcGlyaXQgaXNsYW5kJ10sXG4gIFsvXFxic2FicmUgbm9ydGggc3VtbWl0XFxiLywgJ3NhYnJlIHN1bW1pdCddLFxuICBbL1xcYmtpcmlzYSBwbGFudCBjYXZlXFxiLywgJ2tpcmlzYSBjYXZlJ10sXG4gIFsvXFxidmFtcGlyZSBjYXZlXFxiLywgJ3NlYWxlZCBjYXZlJ10sXG4gIFsvXigoPzp1bik/KW1hW3VyeGtjcyBdKnRbaW9dbWU/KD86IGZpZ2h0KT8vLCAnJDFtYXJrIHN0b20nXSxcbiAgWy9eKCg/OnVuKT8pbWFyayB0ZWxlcGF0aHkvLCAnJDFtYXJrIHN0b20nXSxcbiAgWy9eKCg/OnVuKT8pbWFyayBiYXR0bGUgKGFybW9yfHN1aXQpLywgJyQxbWFyayBvYXNpcyBjYXZlIGZsaWdodCddLFxuICBbL14oKD86dW4pPyltYXJrIHBvd2VyIHJpbmcvLCAnJDFtYXJrIG9hc2lzIGNhdmUgY2VudGVyJ10sXG4gIFsvXigoPzp1bik/KW1hcmsgZ3Jhc3MvLCAnJDFtYXJrIGNvcmRlbCBncmFzcyddLFxuXTtcblxuY29uc3QgZnVsbENsZWFycyA9IG5ldyBNYXAoW1xuICBbJ3NlYWxlZCBjYXZlJywgWydzZWFsZWQgY2F2ZSBmcm9udCcsICdzZWFsZWQgY2F2ZSBiYWNrJywgJ3ZhbXBpcmUgMSddXSxcbiAgWydzdHl4JywgWydzdHl4IGxlZnQnLCAnc3R5eCByaWdodCddXSxcbiAgWydvYWsnLCBbJ29hayBlbGRlcicsICdvYWsgbW90aGVyJ11dLFxuICBbJ3NhYnJlIHdlc3QnLCBbJ3NhYnJlIHdlc3Qgc2xvcGUnLCAnc2FicmUgd2VzdCcsICd0b3JuZWwnXV0sXG4gIFsnc2FicmUgbm9ydGgnLCBbJ3NhYnJlIG5vcnRoJywgJ2tlbGJ5IDEnLCAnc2FicmUgc3VtbWl0J11dLFxuICBbJ3dhdGVyZmFsbCBjYXZlJywgWyd3YXRlcmZhbGwgY2F2ZScsICdzdG9uZSBha2FoYW5hJ11dLFxuICBbJ2ZvZyBsYW1wJywgWydmb2cgbGFtcCBmcm9udCcsICdmb2cgbGFtcCBiYWNrJ11dLFxuICBbJ2tpcmlzYSBwbGFudCcsIFsna2lyaXNhIGNhdmUnLCAna2lyaXNhIG1lYWRvdyddXSxcbiAgWydrYXJtaW5lJywgWydrYXJtaW5lIGJhc2VtZW50JywgJ2thcm1pbmUnLCAnYmVoaW5kIGthcm1pbmUnLCAnc2xpbWUnXV0sXG4gIFsnYW1hem9uZXMnLCBbJ2FyeWxsaXMnLCAnYXJ5bGxpcyBiYXNlbWVudCddXSxcbiAgWydtYWRvIDInLCBbJ21hZG8gMicsICdtYWRvIDIgdXBwZXInLCAnbWFkbyAyIGxvd2VyJ11dLFxuICBbJ3B5cmFtaWQnLCBbJ3B5cmFtaWQnLCAnZHJheWdvbiddXSxcbiAgWydoeWRyYScsIFsnaHlkcmEgZnJvbnQnLCAnaHlkcmEgYmFjaycsICdoeWRyYSBzdW1taXQnXV0sXG4gIFsnc2FiZXJhIDEnLCBbJ3NhYmVyYSBmb3J0cmVzcyBsZWZ0JywgJ3NhYmVyYSBmb3J0cmVzcyByaWdodCcsXG4gICAgICAgICAgICAgICAgJ3ZhbXBpcmUgMicsICdzYWJlcmEgMScsICdjbGFyayddXSxcbiAgWydvYXNpcyBjYXZlJywgWydvYXNpcyBjYXZlJywgJ29hc2lzIGNhdmUgZmxpZ2h0JywgJ29hc2lzIGNhdmUgY2VudGVyJ11dLFxuICBbJ3NhYmVyYSAyJywgWydzYWJlcmEgMicsICdzYWJlcmEgMiBsZXZlbCddXSxcbl0pOyAgXG5cbmNvbnN0IFNMT1RTOiBSZWFkb25seUFycmF5PHJlYWRvbmx5IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBzdHJpbmddPiA9IFtcbiAgWzB4MDAsIDEyMSwxOTIsICdsZWFmIGVsZGVyJ10sIC8vIHN3b3JkIG9mIHdpbmRcbiAgWzB4MDEsIDI3NCwxNzYsICdvYWsgZWxkZXInXSwgLy8gc3dvcmQgb2YgZmlyZVxuICBbMHgwMiwgMzM1LDEyMywgJ3dhdGVyZmFsbCBjYXZlJ10sIC8vIHN3b3JkIG9mIHdhdGVyXG4gIFsweDAzLCAgNzcsIDEwLCAnc3R5eCBsZWZ0J10sIC8vIHN3b3JkIG9mIHRodW5kZXJcbiAgWzB4MDUsICA4OSwxMDcsICdzZWFsZWQgY2F2ZSBmcm9udCddLCAvLyBiYWxsIG9mIHdpbmRcbiAgWzB4MDYsIDExNSwyMjQsICdzYWJyZSB3ZXN0IHNsb3BlJ10sIC8vIHRvcm5hZG8gYnJhY2VsZXRcbiAgWzB4MDcsIDI4MiwxODcsICdpbnNlY3QnXSwgLy8gYmFsbCBvZiBmaXJlXG4gIFsweDA4LCAgNDcsMTgyLCAna2VsYnkgMSddLCAvLyBmbGFtZSBicmFjZWxldFxuICBbMHgwOSwgMjUxLDIzMiwgJ3JhZ2UnXSwgLy8gYmFsbCBvZiB3YXRlclxuICBbMHgwYSwgMjA2LDI0OSwgJ2FyeWxsaXMgYmFzZW1lbnQnXSwgLy8gYmxpenphcmQgYnJhY2VsZXRcbiAgWzB4MGIsICA4MywgNjMsICdtYWRvIDEnXSwgLy8gYmFsbCBvZiB0aHVuZGVyXG4gIFsweDBjLCAgMjMsICA5LCAnYmVoaW5kIGthcm1pbmUnXSwgLy8gc3Rvcm0gYnJhY2VsZXRcbiAgWzB4MTIsICA0OSwgNDgsICdtYWRvIDInXSwgLy8gc2FjcmVkIHNoaWVsZFxuICBbMHgxNCwgIDc3LCAgMiwgJ3N0eXggcmlnaHQnXSwgLy8gcHN5Y2hvIHNoaWVsZFxuICBbMHg3NiwgIDcwLCAgMywgJ3N0eXggcmlnaHQnXSwgLy8gcHN5Y2hvIHNoaWVsZCBtaW1pYyAxXG4gIFsweDc3LCAgODQsICAzLCAnc3R5eCByaWdodCddLCAvLyBwc3ljaG8gc2hpZWxkIG1pbWljIDJcbiAgWzB4MWIsIDE2OCwgOTYsICdvYXNpcyBjYXZlIGZsaWdodCddLCAvLyBiYXR0bGUgc3VpdFxuICBbMHgxYywgMTk5LDExMCwgJ2RyYXlnb24nXSwgLy8gcHN5Y2hvIGFybW9yXG4gIFsweDFkLCAgODIsIDk1LCAnc2VhbGVkIGNhdmUgYmFjayddLCAvLyBtZWRpY2FsIGhlcmIgc2VhbGVkIGNhdmVcbiAgWzB4MWUsICA4MiwxMDEsICdzZWFsZWQgY2F2ZSBiYWNrJ10sIC8vIGFudGlkb3RlIHNlYWxlZCBjYXZlXG4gIFsweDFmLCAzNDYsMTQ3LCAnZm9nIGxhbXAgZnJvbnQnXSwgLy8gbHlzaXMgcGxhbnQgZm9nIGxhbXBcbiAgWzB4NzAsIDM0NiwxNTMsICdmb2cgbGFtcCBmcm9udCddLCAvLyBmb2cgbGFtcCBtaW1pYyAxXG4gIFsweDcxLCAzNDYsMTU5LCAnZm9nIGxhbXAgZnJvbnQnXSwgLy8gZm9nIGxhbXAgbWltaWMgMlxuICBbMHgyMCwgMTI2LCA1MiwgJ2h5ZHJhIGZyb250J10sIC8vIGZydWl0IG9mIGxpbWUgbXQgaHlkcmFcbiAgWzB4MjEsIDIyNywgOTcsICdzYWJlcmEgZm9ydHJlc3MgbGVmdCddLCAvLyBmcnVpdCBvZiBwb3dlciBzYWJlcmEgcGFsYWNlXG4gIFsweDIyLCAyNTYsIDczLCAnZXZpbCBzcGlyaXQgaXNsYW5kJ10sIC8vIG1hZ2ljIHJpbmcgZXZpbCBzcGlyaXQgaXNsYW5kXG4gIFsweDIzLCAgNTgsMTE1LCAnc2FiZXJhIDInXSwgLy8gZnJ1aXQgb2YgcmVwdW4gc2FiZXJhIDJcbiAgWzB4MjQsICA4MiwxMTMsICdzZWFsZWQgY2F2ZSBmcm9udCddLCAvLyB3YXJwIGJvb3RzIHNlYWxlZCBjYXZlXG4gIFsweDI1LCAxODksMTgwLCAnY29yZGVsIGdyYXNzJ10sIC8vIHN0YXR1ZSBvZiBvbnl4XG4gIFsweDI2LCAgMTgsMTcyLCAna2VsYnkgMiddLCAvLyBvcGVsIHN0YXR1ZVxuICBbMHgyNywgMjY3LDE4NSwgJ29hayBtb3RoZXInXSwgLy8gaW5zZWN0IGZsdXRlXG4gIFsweDI4LCAyNzUsMTQ3LCAncG9ydG9hIHF1ZWVuJ10sIC8vIGZsdXRlIG9mIGxpbWVcbiAgWzB4MjksIDE0NywyMDYsICdha2FoYW5hJ10sIC8vIGdhcyBtYXNrXG4gIFsweDJhLCAxNzIsMTA0LCAnb2FzaXMgY2F2ZSBjZW50ZXInXSwgLy8gcG93ZXIgcmluZ1xuICBbMHgyYiwgMjAzLCAgNSwgJ2Jyb2thaGFuYSddLCAvLyB3YXJyaW9yIHJpbmdcbiAgWzB4MmMsIDI0OSwgNjksICdldmlsIHNwaXJpdCBpc2xhbmQnXSwgLy8gaXJvbiBuZWNrbGFjZVxuICBbMHgyZCwgMTkxLDExMCwgJ2RlbyddLCAvLyBkZW9zIHBlbmRhbnRcbiAgWzB4MmUsICA4OSwgOTksICd2YW1waXJlIDEnXSwgLy8gcmFiYml0IGJvb3RzXG4gIFsweDJmLCAxNjQsMTA0LCAnb2FzaXMgY2F2ZSddLCAvLyBsZWF0aGVyIGJvb3RzXG4gIFsweDMwLCAzMTksMTIzLCAnc3RvbmUgYWthaGFuYSddLCAvLyBzaGllbGQgcmluZ1xuICBbMHg3MiwgMzIwLDEzMCwgJ3dhdGVyZmFsbCBjYXZlJ10sIC8vIHdhdGVyZmFsbCBjYXZlIG1pbWljXG4gIC8vIDMxIGFsYXJtIGZsdXRlXG4gIFsweDMyLCAxMDUsIDk0LCAnd2luZG1pbGwgZ3VhcmQnXSwgLy8gd2luZG1pbGwga2V5XG4gIFsweDMzLCAgNjQsMTk4LCAnc2FicmUgbm9ydGgnXSwgLy8ga2V5IHRvIHByaXNvblxuICBbMHgzNCwgIDgzLCA3MSwgJ3plYnUnXSwgLy8ga2V5IHRvIHN0eXhcbiAgWzB4MzUsIDM0NSwxNDAsICdmb2cgbGFtcCBiYWNrJ10sIC8vIGZvZyBsYW1wXG4gIFsweDM2LCAzMDEsMTE5LCAnZG9scGhpbiddLCAvLyBzaGVsbCBmbHV0ZVxuICBbMHgzNywgMjMzLDExOCwgJ2NsYXJrJ10sIC8vIGV5ZSBnbGFzc2VzXG4gIFsweDM4LCAyMzQsIDg4LCAnc2FiZXJhIDEnXSwgLy8gYnJva2VuIHN0YXR1ZVxuICBbMHgzOSwgMjk1LCA5MiwgJ2xpZ2h0aG91c2UnXSwgLy8gZ2xvd2luZyBsYW1wXG4gIC8vIDNhIHN0YXR1ZSBvZiBnb2xkXG4gIFsweDNiLCAyNzQsMTE3LCAnY2hhbm5lbCddLCAvLyBsb3ZlIHBlbmRhbnRcbiAgWzB4M2MsIDMzOCwyMjYsICdraXJpc2EgbWVhZG93J10sIC8vIGtpcmlzYSBwbGFudFxuICBbMHgzZCwgIDIzLCAxNywgJ2thcm1pbmUnXSwgLy8gaXZvcnkgc3RhdHVlXG4gIFsweDNlLCAyMDYsMjQxLCAnYXJ5bGxpcyddLCAvLyBib3cgb2YgbW9vblxuICBbMHgzZiwgMTAxLCAgNiwgJ2h5ZHJhIHN1bW1pdCddLCAvLyBib3cgb2Ygc3VuXG4gIFsweDQwLCAyMDcsMTEwLCAnZHJheWdvbiddLCAvLyBib3cgb2YgdHJ1dGhcbiAgWzB4NDEsICA5MiwxMTcsICd3aW5kbWlsbCddLCAvLyByZWZyZXNoXG4gIFsweDQyLCAyNzksMTI2LCAnc2FicmUgc3VtbWl0J10sIC8vIHBhcmFseXNpc1xuICBbMHg0MywgMjAyLDEzOCwgJ3N0b20nXSwgLy8gdGVsZXBhdGh5XG4gIFsweDQ0LCAxMjQsMjAyLCAndG9ybmVsJ10sIC8vIHRlbGVwb3J0XG4gIFsweDQ1LCAzMDQsMTI4LCAnYXNpbmEnXSwgLy8gcmVjb3ZlclxuICBbMHg0NiwgMjQ4LCAzNSwgJ3doaXJscG9vbCddLCAvLyBiYXJyaWVyXG4gIFsweDQ3LCAyNzcsICAzLCAnc3dhbiddLCAvLyBjaGFuZ2VcbiAgWzB4NDgsICAxNSwgMjUsICdzbGltZSddLCAvLyBmbGlnaHRcbiAgWzB4NTAsICA4MiwxMDcsICdzZWFsZWQgY2F2ZSBmcm9udCddLCAvLyBtZWRpY2FsIGhlcmIgc2VhbGVkIGNhdmUgZnJvbnRcbiAgLy8gNTEgc2FjcmVkIHNoaWVsZFxuICBbMHg1MiwgMTM0LDIxOSwgJ3NhYnJlIHdlc3QnXSwgLy8gbWVkaWNhbCBoZXJiIG10IHNhYnJlIHdcbiAgWzB4NTMsICA1OSwyMTksICdzYWJyZSBub3J0aCddLCAvLyBtZWRpY2FsIGhlcmIgbXQgc2FicmUgblxuICBbMHg1NCwgIDUyLCA1NSwgJ21hZG8gMiB1cHBlciddLCAvLyBtYWdpYyByaW5nIGZvcnRyZXNzIDMgdXBwZXJcbiAgWzB4NTUsIDI0MSwgOTcsICdzYWJlcmEgZm9ydHJlc3MgcmlnaHQnXSwgLy8gbWVkaWNhbCBoZXJiIHNhYmVyYSBwYWxhY2VcbiAgWzB4NTYsIDEyMywgMjMsICdoeWRyYSBmcm9udCddLCAvLyBtZWRpY2FsIGhlcmIgbXQgaHlkcmFcbiAgWzB4NzQsIDExNSwgIDMsICdoeWRyYSBiYWNrJ10sIC8vIG10IGh5ZHJhIG1pbWljXG4gIFsweDU3LCAgNzAsICA5LCAnc3R5eCBsZWZ0J10sIC8vIG1lZGljYWwgaGVyYiBzdHl4XG4gIFsweDc1LCAgODQsICA5LCAnc3R5eCBsZWZ0J10sIC8vIHN0eXggMSBtaW1pY1xuICBbMHg1OCwgIDMyLCAzOCwgJ2thcm1pbmUgYmFzZW1lbnQnXSwgLy8gbWFnaWMgcmluZyBrYXJtaW5lXG4gIFsweDc5LCAgMzIsIDE2LCAna2FybWluZSBiYXNlbWVudCddLCAvLyBrYXJtaW5lIG1pbWljIDFcbiAgWzB4N2EsICA0MCwgMTYsICdrYXJtaW5lIGJhc2VtZW50J10sIC8vIGthcm1pbmUgbWltaWMgMlxuICBbMHg3YiwgIDQwLCAzOCwgJ2thcm1pbmUgYmFzZW1lbnQnXSwgLy8ga2FybWluZSBtaW1pYyAzXG4gIC8vIDU5IG1lZGljYWwgaGVyYlxuICBbMHg1YSwgMTYxLCA5NywgJ2ZvcnRyZXNzIGV4aXQnXSwgLy8gZnJ1aXQgb2YgcG93ZXIgb2FzaXMgY2F2ZSAob3ZlciB3YXRlcilcbiAgWzB4MTAsIDMyNywxMjMsICd3YXRlcmZhbGwgY2F2ZSddLCAvLyBmbHV0ZSBvZiBsaW1lIGNoZXN0IChOT1RFOiBjaGFuZ2VkIDViLT4gMTApXG4gIFsweDVjLCAyNTYsIDc5LCAnZXZpbCBzcGlyaXQgaXNsYW5kJ10sIC8vIGx5c2lzIHBsYW50IGV2aWwgc3Bpcml0IGlzbGFuZFxuICBbMHg1ZCwgIDM2LDEzOSwgJ3NhYmVyYSAyIGxldmVsJ10sIC8vIGx5c2lzIHBsYW50IHNhYmVyYSBsZXZlbFxuICBbMHg1ZSwgIDE0LDIyOSwgJ3NhYnJlIG5vcnRoJ10sIC8vIGFudGlkb3RlIG10IHNhYnJlIG5cbiAgWzB4NWYsIDM0NSwyMjUsICdraXJpc2EgY2F2ZSddLCAvLyBhbnRpZG90ZSBraXJpc2EgY2F2ZVxuICBbMHg2MCwgIDE4LCA5NCwgJ21hZG8gMiB1cHBlciddLCAvLyBhbnRpZG90ZSBmb3J0ZXNzIDNcbiAgWzB4NjEsIDIzNCwgOTYsICd2YW1waXJlIDInXSwgLy8gZnJ1aXQgb2YgcG93ZXIgdmFtcGlyZSAyXG4gIFsweDYyLCAgMTgsMTE4LCAnc2FiZXJhIDIgbGV2ZWwnXSwgLy8gZnJ1aXQgb2YgcG93ZXIgc2FiZXJhIGxldmVsXG4gIFsweDYzLCAgMzYsIDU0LCAnbWFkbyAyIHVwcGVyJ10sIC8vIG9wZWwgc3RhdHVlIGZvcnRyZXNzIDNcbiAgWzB4NjQsIDE3NSwgOTcsICdvYXNpcyBjYXZlJ10sIC8vIGZydWl0IG9mIHBvd2VyIG9hc2lzIGNhdmVcbiAgWzB4NjUsIDEzOSwgNDAsICdoeWRyYSBiYWNrJ10sIC8vIG1hZ2ljIHJpbmcgbXQgaHlkcmFcbiAgWzB4NjYsICA2NiwxNjAsICdzYWJlcmEgMiBsZXZlbCddLCAvLyBmcnVpdCBvZiByZXB1biBzYWJlcmEgbGV2ZWxcbiAgLy8gNjcgbWFnaWMgcmluZ1xuICAvLyA2OCBtYWdpYyByaW5nXG4gIFsweDY5LCAxMzEsMjAxLCAnc2FicmUgd2VzdCddLCAvLyBtYWdpYyByaW5nIG10IHNhYnJlIHdcbiAgWzB4NmEsICA3NiwyMjYsICdzYWJyZSB3ZXN0J10sIC8vIHdhcnAgYm9vdHMgbXQgc2FicmUgd1xuICBbMHg2YiwgIDE4LDEwMCwgJ21hZG8gMiB1cHBlciddLCAvLyBtYWdpYyByaW5nIGZvcnRyZXNzIDMgdXBwZXIgKGJlaGluZClcbiAgWzB4NmMsIDE5MywxMDMsICdweXJhbWlkJ10sIC8vIG1hZ2ljIHJpbmcgcHlyYW1pZCBmcm9udFxuICBbMHg3OCwgMTk5LDEwMywgJ2NyeXB0J10sIC8vIHB5cmFtaWQgYmFjayBtaW1pY1xuICBbMHg2ZCwgMjA1LDEwMywgJ2NyeXB0J10sIC8vIG9wZWwgc3RhdHVlIHB5cmFtaWQgYmFja1xuICBbMHg3MywgMjU2LCA2NywgJ2V2aWwgc3Bpcml0IGlzbGFuZCddLCAvLyBpcm9uIG5lY2tsYWNlIG1pbWljXG4gIFsweDZlLCAgMjQsIDM4LCAna2FybWluZSBiYXNlbWVudCddLCAvLyB3YXJwIGJvb3RzIGthcm1pbmVcbiAgWzB4NmYsICA0NCwgOTcsICdtYWRvIDIgbG93ZXInXSwgLy8gbWFnaWMgcmluZyBmb3J0cmVzcyAzIGxvd2VyXG5dO1xuXG4vLyBub24tdW5pcXVlIGtleSBpdGVtIHNsb3RzXG5jb25zdCBLRVkgPSBuZXcgU2V0KFsweDEwLCAweDEyLCAweDIzLCAweDI2LCAweDYxXSk7XG5cbmNvbnN0IEJPU1NFUyA9IG5ldyBNYXAoW1xuICBbfjB4MTAwLCAweDJlXSwgLy8gcmFiYml0IGJvb3RzIHNsb3QgLT4gdmFtcGlyZSAxXG4gIFt+MHgxMDEsIDB4MDddLCAvLyBiYWxsIG9mIGZpcmUgc2xvdCAtPiBpbnNlY3RcbiAgW34weDEwMiwgMHgwOF0sIC8vIGZsYW1lIGJyYWNlbGV0IHNsb3QgLT4ga2VsYmVzcXVlIDFcbiAgW34weDEwMywgMHgwOV0sIC8vIGJhbGwgb2Ygd2F0ZXIgc2xvdCAtPiByYWdlXG4gIFt+MHgxMDQsIDB4MzhdLCAvLyBicm9rZW4gc3RhdHVlIHNsb3QgLT4gc2FiZXJhIDFcbiAgW34weDEwNSwgMHgwYl0sIC8vIGJhbGwgb2YgdGh1bmRlciBzbG90IC0+IG1hZG8gMVxuICBbfjB4MTA2LCAweDI2XSwgLy8gb3BlbCBzdGF0dWUgc2xvdCAtPiBrZWxiZXNxdWUgMlxuICBbfjB4MTA3LCAweDIzXSwgLy8gZnJ1aXQgb2YgcmVwdW4gc2xvdCAtPiBzYWJlcmEgMlxuICBbfjB4MTA4LCAweDEyXSwgLy8gc2FjcmVkIHNoaWVsZCBzbG90IC0+IG1hZG8gMlxuICBbfjB4MTA5LCAweDNkXSwgLy8gaXZvcnkgc3RhdHVlIHNsb3QgLT4ga2FybWluZVxuICBbfjB4MTBhLCAweDFjXSwgLy8gcHN5Y2hvIGFybW9yIHNsb3QgLT4gZHJheWdvbiAxXG4gIC8vIFssIH4weDEwYl0sIC8vIGRyYXlnb24gMlxuICBbfjB4MTBjLCAweDYxXSwgLy8gZnJ1aXQgb2YgcG93ZXIgc2xvdCAtPiB2YW1waXJlIDJcbl0pO1xuXG4vLyBzbG90cyB0aGF0IGNvbWUgZnJvbSB0cmFkZS1pbnNcbi8vICAtIG5vdGU6IHRoZSBmb2cgbGFtcCB0cmFkZS1pbiBkb2Vzbid0IGhhdmUgYSBnb29kIHNsb3QgZm9yIHRoaXNcbi8vIFRPRE8gLSBhZGQgXCJ0cmFkZWQgZm9nIGxhbXBcIiB0byBpdGVtcywgYWRkIGEgYm94IGZvciBpdC5cbi8vIFRPRE8gLSBjb3VudCBudW1iZXIgb2YgdHJhZGVkIGJveGVzIGNoZWNrZWQsIHNldCByZXN0IHRvIGJsb2NrZWQgaWZcbi8vICAgICAgICA8PSBudW1iZXIgb2YgaXRlbXMgYWxyZWFkeSB0cmFkZWQgaW4uLi4/XG4vLyBUT0RPIC0gZmluZC1hbmQtcmVwbGFjZSBmb3IgdG9ybmVsJ3MgaXRlbSBhZnRlciB0aGUgZmFjdD8/XG5jb25zdCBUUkFERVMgPSBuZXcgU2V0KFsweDI5LCAweDNlLCAweDQ0LCAweDQ3LCAweDQ4XSk7XG5cbi8vIFRPRE8gLSBhZGQgZXh0cmEgaW5kaXJlY3Rpb24gZm9yIHdhbGxzIGluIG92ZXJsYXkgaWYgdHJhY2tpbmdcbi8vICAtIG9uZSBmb3IgZWFjaCBzZXBhcmF0ZSByZWdpb24uLi4gaG93IHRvIGtlZXAgdHJhY2sgb2YgdGhhdD9cbi8vICAtIHRoZW4ga2VlcCB0aGVtIGFzIGl0ZW1zLi4uPyAgYm9zc2VzPyAgbWF5YmUganVzdCBoYXJkY29kZVxuLy8gICAgdGhlIGxpbmthZ2VzPyAgb3IganVzdCBhZGQgYWxsIHdhbGxzIGFzIGl0ZW1zIGFuZCBsaW5rIHRoZW1cbi8vICAgIGRpcmVjdGx5IGhlcmUuLi4gLSB0aGF0IG1pZ2h0IGJlIGJldHRlci5cblxuLy8geCwgeSwgLi4uZmxhZ3Ncbi8vIGNvbnN0IFdBTExTOiBbbnVtYmVyLCBudW1iZXIsIC4uLm51bWJlcl0gPSBbXTtcblxuY2xhc3MgR3JhcGgge1xuICAvKiogbWFwIGZyb20gaWQgdG8gc2xvdCBpbmRleCAqL1xuICByZWFkb25seSBzbG90cyA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gIC8qKiBtYXAgZnJvbSBpZCB0byBpdGVtIGluZGV4ICovXG4gIHJlYWRvbmx5IGl0ZW1zID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgLyoqIG1hcCBmcm9tIHNsb3QgaW5kZXggdG8gZWxlbWVudCAqL1xuICByZWFkb25seSBzbG90RWx0cyA9IG5ldyBNYXA8bnVtYmVyLCBIVE1MRWxlbWVudD4oKTtcbiAgLyoqIG1hcCBmcm9tIGl0ZW0gaW5kZXggdG8gZWxlbWVudCAqL1xuICAvL3JlYWRvbmx5IGl0ZW1FbHRzID0gbmV3IE1hcDxudW1iZXIsIEhUTUxFbGVtZW50PigpO1xuICAvKiogc2V0IG9mIHNsb3QgaW5kZXggKi9cbiAgLy9yZWFkb25seSBjaGVja2VkID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vIC8qKiBtYXAgZnJvbSBzbG90IGlkIHRvIG5vZGUgKi9cbiAgLy8gcmVhZG9ubHkgbm9kZUZyb21TbG90ID0gbmV3IE1hcDxudW1iZXIsIGFueT4oKTtcbiAgLy8gcmVhZG9ubHkgbm9kZXMgPSBuZXcgTWFwPGFueSwgYW55PigpO1xuICAvKiogTWFwcyBpdGVtIGluZGV4IHRvIHdoZXRoZXIgaXRlbSBpcyBnb3R0ZW4gKi9cbiAgaGFzOiBCaXRzID0gQml0cy5vZigpO1xuICAvKiogb25seSB1c2VkIGZvciBjbGVhcmluZzogc2V0IG9mIGl0ZW0gaW5kZXggd2UganVzdCBhc3N1bWUgKi9cbiAgcmVhZG9ubHkgYWx3YXlzOiBCaXRzO1xuXG4gIHJlYWRvbmx5IGdyaWQ6IEVsZW1lbnQ7XG4gIHJlYWRvbmx5IG1hcDogRWxlbWVudDtcbiAgcmVhZG9ubHkgdHJhY2tzID0gbmV3IE1hcDxzdHJpbmcsIEhUTUxFbGVtZW50PigpO1xuICByZWFkb25seSBtYXJrcyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudFtdPigpO1xuXG4gIHZvaWNlID0gZmFsc2U7XG4gIHJlY29nbml0aW9uPzogU3BlZWNoUmVjb2duaXRpb247XG5cbiAgdW51c2VkSXRlbXM6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgd29ybGQ6IFdvcmxkLFxuICAgICAgICAgICAgICByZWFkb25seSBmbGFnczogRmxhZ1NldCkge1xuICAgIC8vIFRPRE8gLSBjb21wdXRlIHR3byBkZXBncmFwaHM6IG9uZSB3aXRoIGdsaXRjaGVzIGFuZCBvbmUgd2l0aG91dFxuICAgIC8vICAtIHRoZW4gd2UgY2FuIHNob3cgZ3JlZW4gdnMgeWVsbG93IGZvciBnbGl0Y2hhYmxlIGxvY2F0aW9ucy4uP1xuXG4gICAgKHdpbmRvdyBhcyBhbnkpLkdSQVBIID0gdGhpcztcblxuICAgIHRoaXMuZ3JpZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2dyaWQnKVswXTtcbiAgICB0aGlzLm1hcCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ21hcCcpWzBdO1xuXG4gICAgbGV0IGFsd2F5cyA9IEJpdHMub2YoKTtcblxuICAgIGZvciAoY29uc3Qge2l0ZW06IGlkLCBpbmRleH0gb2Ygd29ybGQuZ3JhcGguc2xvdHMpIHtcbiAgICAgIGlmIChpZCA9PSBudWxsKSBjb250aW51ZTsgLy8gdGhyb3cgbmV3IEVycm9yKGBiYWQgc2xvdDogJHtpbmRleH1gKTtcbiAgICAgIHRoaXMuc2xvdHMuc2V0KGlkLCBpbmRleCk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qge2l0ZW06IGlkLCBpbmRleH0gb2Ygd29ybGQuZ3JhcGguaXRlbXMpIHtcbiAgICAgIGlmIChpZCA9PSBudWxsKSBjb250aW51ZTsgLy8gdGhyb3cgbmV3IEVycm9yKGBiYWQgaXRlbTogJHtpbmRleH1gKTtcbiAgICAgIHRoaXMuaXRlbXMuc2V0KGlkLCBpbmRleCk7XG4gICAgICBjb25zdCBpdGVtID0gcm9tLml0ZW1zW2lkXTtcbiAgICAgIC8vIFRPRE8gLSBzZXR1cCBhbHdheXMgZnJvbSBub24tYWRkZWQgaXRlbXM/XG4gICAgICBpZiAoaXRlbSAmJiAhaXRlbS51bmlxdWUpIGFsd2F5cyA9IEJpdHMud2l0aChhbHdheXMsIGluZGV4KTtcbiAgICB9XG4gICAgdGhpcy51bnVzZWRJdGVtcyA9IHdvcmxkLmdyYXBoLml0ZW1zLmxlbmd0aDtcblxuICAgIHRoaXMuaGFzID0gdGhpcy5hbHdheXMgPSBhbHdheXM7XG5cbiAgICAgIC8vIHRoaXMubm9kZXMuc2V0KG4udWlkLCBuLm5hbWUpO1xuICAgICAgLy8gdGhpcy5yb3V0ZVtuLnVpZF0gPSA0O1xuICAgICAgLy8gaWYgKG4gaW5zdGFuY2VvZiBTbG90KSB7XG4gICAgICAvLyAgIC8vIHVzZWQgYnkgYWRkQm94XG4gICAgICAvLyAgIGlmICghbi5pc01pbWljKCkpIHtcbiAgICAgIC8vICAgICB0aGlzLm5vZGVGcm9tU2xvdC5zZXQobi5zbG90SW5kZXgsIG4pO1xuICAgICAgLy8gICB9XG4gICAgICAvLyAgIC8vIG5vdCBzaG93biwganVzdCBhc3N1bWUgaGF2ZSBpdFxuICAgICAgLy8gICBpZiAobi5uYW1lID09ICdBbGFybSBGbHV0ZScgfHwgbi5uYW1lID09ICdNZWRpY2FsIEhlcmInKSB7XG4gICAgICAvLyAgICAgdGhpcy5hbHdheXMuYWRkKG4uaXRlbS51aWQpO1xuICAgICAgLy8gICAgIHRoaXMucm91dGVbbi5pdGVtLnVpZF0gPSAwO1xuICAgICAgLy8gICB9XG4gICAgICAvLyB9IGVsc2UgaWYgKG4gaW5zdGFuY2VvZiBMb2NhdGlvbikge1xuICAgICAgLy8gICAvLyBmaW5kIHRoZSBtaW1pY3MsIHRoZXkgbmVlZCBzcGVjaWFsIGhhbmRsaW5nIGJlY2F1c2VcbiAgICAgIC8vICAgLy8gdGhleSBhbGwgbWFwIHRvIHRoZSBzYW1lIHNsb3QgSUQuLi5cbiAgICAgIC8vICAgZm9yIChjb25zdCBjaGVzdCBvZiBuLmNoZXN0cykge1xuICAgICAgLy8gICAgIGlmIChjaGVzdC5pc01pbWljKCkpIHtcbiAgICAgIC8vICAgICAgIHRoaXMubWltaWNTbG90cy5zZXQobi5pZCA8PCA4IHwgY2hlc3Quc3Bhd25TbG90LCBjaGVzdCk7XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9XG4gICAgICAvLyB9IGVsc2UgaWYgKG4gaW5zdGFuY2VvZiBUcmFja2VyTm9kZSkge1xuICAgICAgLy8gICBjb25zdCBpbmRleCA9IHRoaXMuZGVwZ3JhcGgudWlkVG9JdGVtW24udWlkXTtcbiAgICAgIC8vICAgaWYgKGluZGV4ID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgLy8gICBsZXQgY29sb3IgPSA0O1xuICAgICAgLy8gICBpZiAobi50eXBlID09PSBUcmFja2VyTm9kZS5PRkZfUk9VVEUpIGNvbG9yID0gMTtcbiAgICAgIC8vICAgaWYgKG4udHlwZSA9PT0gVHJhY2tlck5vZGUuR0xJVENIKSBjb2xvciA9IDI7XG4gICAgICAvLyAgIGlmIChuLnR5cGUgPT09IFRyYWNrZXJOb2RlLkhBUkQpIGNvbG9yID0gMztcbiAgICAgIC8vICAgdGhpcy5yb3V0ZVtuLnVpZF0gPSBjb2xvcjtcbiAgICAgIC8vIH1cblxuICAgIGNvbnN0IHRvZ2dsZSA9IChlOiBFdmVudCkgPT4ge1xuICAgICAgbGV0IHQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudHxudWxsO1xuICAgICAgd2hpbGUgKHQgJiYgIXQuZGF0YXNldFsnaW5kZXgnXSkge1xuICAgICAgICB0ID0gdC5wYXJlbnRFbGVtZW50O1xuICAgICAgfVxuICAgICAgaWYgKCF0KSByZXR1cm47XG4gICAgICB0aGlzLnRvZ2dsZSh0KTtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5ncmlkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9nZ2xlKTtcbiAgICAvL3RoaXMubWFwLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9nZ2xlKTtcbiAgfVxuXG4gIHRvZ2dsZSh0OiBIVE1MRWxlbWVudCwgdmFsPzogYm9vbGVhbikge1xuICAgIGNvbnN0IHVpZCA9IE51bWJlcih0LmRhdGFzZXRbJ2luZGV4J10pO1xuICAgIGNvbnN0IGhhcyA9IHQuY2xhc3NMaXN0LnRvZ2dsZSgnZ290Jyk7XG4gICAgaWYgKHQuZGF0YXNldFsnaXRlbSddKSB7XG4gICAgICB0aGlzLmhhcyA9IGhhcyA/XG4gICAgICAgICAgQml0cy53aXRoKHRoaXMuaGFzLCB1aWQpIDpcbiAgICAgICAgICBCaXRzLndpdGhvdXQodGhpcy5oYXMsIHVpZCk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cblxuICBhZGRTbG90KHNsb3RJZDogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlciwgbmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLnNsb3RzLmdldChzbG90SWQpO1xuICAgIGlmIChpbmRleCA9PSBudWxsKSB7IGRlYnVnZ2VyOyB0aHJvdyBuZXcgRXJyb3IoKTsgfVxuICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNvbnN0IGl0ZW1nZXQgPSB0aGlzLnJvbS5pdGVtR2V0c1tzbG90SWRdO1xuICAgIGNvbnN0IGl0ZW0gPSBpdGVtZ2V0ICYmIHRoaXMucm9tLml0ZW1zW2l0ZW1nZXQuaXRlbUlkXTtcbiAgICAvLyBtYWtlIHNvbWUgYm94ZXMgYmlnZ2VyOyBxdWljayBoYWNrIHRvIGF2b2lkIHVuaXF1ZSBhcm1vcnNcbiAgICBpZiAoaXRlbSAmJiBpdGVtLnVuaXF1ZSB8fCBLRVkuaGFzKHNsb3RJZCkpIHtcbiAgICAgIGRpdi5jbGFzc0xpc3QuYWRkKCdrZXknKTtcbiAgICAgIHgtLTsgeS0tO1xuICAgIH1cbiAgICB4LS07IHktLTtcbiAgICBkaXYuZGF0YXNldFsnaW5kZXgnXSA9IFN0cmluZyhpbmRleCk7XG4gICAgZGl2LnN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICBkaXYuc3R5bGUudG9wID0geSArICdweCc7XG4gICAgLy9kaXYudGV4dENvbnRlbnQgPSAnXFx4YTAnO1xuICAgIGNvbnN0IGlubmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmFwcGVuZENoaWxkKGlubmVyKTtcbiAgICBpbm5lci50ZXh0Q29udGVudCA9XG4gICAgICAgIHNsb3RJZCA+PSAweDcwID9cbiAgICAgICAgICAgICdNaW1pYycgOlxuICAgICAgICAgICAgdGhpcy5yb20uaXRlbXNbaXRlbWdldC5pdGVtSWRdLm1lc3NhZ2VOYW1lLnJlcGxhY2UoJyAnLCAnXFx4YTAnKTtcbiAgICBpZiAodGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSAmJiBUUkFERVMuaGFzKHNsb3RJZCkpIHtcbiAgICAgIGRpdi5jbGFzc0xpc3QuYWRkKCdib3NzJyk7XG4gICAgfVxuICAgIHRoaXMuc2xvdEVsdHMuc2V0KGluZGV4LCBkaXYpO1xuICAgIGxldCBtYXJrcyA9IHRoaXMubWFya3MuZ2V0KG5hbWUpO1xuICAgIGlmIChtYXJrcyA9PSBudWxsKSB0aGlzLm1hcmtzLnNldChuYW1lLCBtYXJrcyA9IFtdKTtcbiAgICBtYXJrcy5wdXNoKGRpdik7XG4gICAgdGhpcy5tYXAuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgfVxuXG4gIGFkZEl0ZW0oY2xzOiBzdHJpbmcsIGlkOiBzdHJpbmcsIC4uLm90aGVyTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgLy8gcGFyc2UgdGhlIGhleCwgcmVtb3ZpbmcgJCBwcmVmaXhcbiAgICBjb25zdCB1aWQgPSBOdW1iZXIucGFyc2VJbnQoaWQuc3Vic3RyaW5nKDEpLCAxNik7XG4gICAgY29uc3Qgb3V0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKGNscylbMF0gYXMgSFRNTEVsZW1lbnQ7XG4gICAgY29uc3QgaW5uZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvdXRlci5hcHBlbmRDaGlsZChpbm5lcik7XG4gICAgbGV0IGluZGV4ID0gdGhpcy5pdGVtcy5nZXQodWlkKTtcbiAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xuICAgICAgLy8gSXRlbXMgdGhhdCBkb24ndCBibG9jayBhbnl0aGluZyB3b24ndCBoYXZlIHNob3duIHVwIHlldC5cbiAgICAgIHRoaXMuaXRlbXMuc2V0KHVpZCwgaW5kZXggPSB0aGlzLnVudXNlZEl0ZW1zKyspO1xuICAgIH1cbiAgICBvdXRlci5kYXRhc2V0WydpbmRleCddID0gU3RyaW5nKGluZGV4KTtcbiAgICBvdXRlci5kYXRhc2V0WydpdGVtJ10gPSBTdHJpbmcoaW5kZXgpO1xuICAgIC8vdGhpcy5zbG90RWx0cy5zZXQoaW5kZXgsIG91dGVyKTtcbiAgICB0aGlzLnRyYWNrcy5zZXQoY2xzLnJlcGxhY2UoLy0vZywgJyAnKSwgb3V0ZXIpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBvdGhlck5hbWVzKSB7XG4gICAgICB0aGlzLnRyYWNrcy5zZXQobmFtZS5yZXBsYWNlKC8tL2csICcgJyksIG91dGVyKTtcbiAgICB9XG4gIH1cblxuICBhZGRFeHRyYUZsYWdzKCkge1xuICAgIGNvbnN0IGcgPSB0aGlzLndvcmxkLmdyYXBoO1xuICAgIGZvciAoY29uc3Qgc2xvdCBvZiBnLnNsb3RzLnNsaWNlKGcuZml4ZWQpKSB7XG4gICAgICBjb25zdCBjID0gc2xvdC5jb25kaXRpb247XG4gICAgICBjb25zdCBib3NzU2xvdCA9IEJPU1NFUy5nZXQoYyk7XG4gICAgICBjb25zdCByZXBsYWNlZCA9IGJvc3NTbG90ICYmIHRoaXMuc2xvdHMuZ2V0KGJvc3NTbG90KTtcbiAgICAgIGlmIChyZXBsYWNlZCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGVsdCA9IHRoaXMuc2xvdEVsdHMuZ2V0KHJlcGxhY2VkKTtcbiAgICAgIGlmIChlbHQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCdleHBlY3RlZCcpO1xuICAgICAgdGhpcy5zbG90RWx0cy5kZWxldGUoTnVtYmVyKGVsdC5kYXRhc2V0WydpbmRleCddKSk7XG4gICAgICB0aGlzLnNsb3RFbHRzLnNldChzbG90LmluZGV4LCBlbHQpO1xuICAgICAgZWx0LmNsYXNzTGlzdC5hZGQoJ2Jvc3MnKTtcbiAgICAgIGVsdC5kYXRhc2V0WydpbmRleCddID0gU3RyaW5nKHNsb3QuaW5kZXgpO1xuICAgICAgZWx0LmRhdGFzZXRbJ2l0ZW0nXSA9IFN0cmluZyhzbG90LmluZGV4KTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgZm9yIChjb25zdCBlbHQgb2YgdGhpcy5zbG90RWx0cy52YWx1ZXMoKSkge1xuICAgICAgZWx0LmRhdGFzZXRbJ3N0YXRlJ10gPSBlbHQuY2xhc3NMaXN0LmNvbnRhaW5zKCdnb3QnKSA/ICcnIDogJ2Jsb2NrZWQnO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgdHJhdmVyc2UodGhpcy53b3JsZC5ncmFwaCwgbmV3RmlsbCgpLCB0aGlzLmhhcykpIHtcbiAgICAgIC8vIGZpZ3VyZSBvdXQgd2hldGhlciBpdCdzIGF2YWlsYWJsZSBvciBub3RcbiAgICAgIC8vIFRPRE8gLSBjb25zaWRlciBoYXZpbmcgbXVsdGlwbGUgd29ybGRzLCBmb3IgZ2xpdGNoZWQvaGFyZD9cbiAgICAgIC8vICAgICAgLT4gYWRqdXN0IGZsYWdzIHRvIGFkZCBhbGwgZ2xpdGNoZXMvaGFyZCBtb2RlXG4gICAgICBjb25zdCBlbHQgPSB0aGlzLnNsb3RFbHRzLmdldChzbG90KTtcbiAgICAgIGlmIChlbHQgJiYgIWVsdC5jbGFzc0xpc3QuY29udGFpbnMoJ2dvdCcpKSB7XG4gICAgICAgIGVsdC5kYXRhc2V0WydzdGF0ZSddID0gJ2F2YWlsYWJsZSc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWRkVm9pY2VSZWNvZ25pdGlvbigpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVjID0gdGhpcy5yZWNvZ25pdGlvbiA9IG5ldyBTcGVlY2hSZWNvZ25pdGlvbigpO1xuICAgICAgLy8gTk9URTogYXMgZmFyIGFzIEkgY2FuIHRlbGwsIHRoaXMgZG9lcyBub3RoaW5nLi4uXG4gICAgICBjb25zdCBncmFtbWFyID0gbmV3IFNwZWVjaEdyYW1tYXJMaXN0KCk7XG4gICAgICBncmFtbWFyLmFkZEZyb21TdHJpbmcoYFxuICAgICAgICAgICNKU0dGIFYxLjA7XG4gICAgICAgICAgZ3JhbW1hciBjb21tYW5kO1xuICAgICAgICAgIHB1YmxpYyA8aXRlbT4gPSAke1suLi50aGlzLnRyYWNrcy5rZXlzKCldLmpvaW4oJyB8ICcpfTtcbiAgICAgICAgICBwdWJsaWMgPGNoZWNrPiA9ICR7Wy4uLnRoaXMubWFya3Mua2V5cygpXS5qb2luKCcgfCAnKX07XG4gICAgICAgICAgcHVibGljIDxjbGVhcj4gPSA8Y2hlY2s+IHwgJHtbLi4uZnVsbENsZWFycy5rZXlzKCldLmpvaW4oJyB8ICcpfTtcbiAgICAgICAgICBwdWJsaWMgPGNvbW1hbmQ+ID0gdHJhY2sgPGl0ZW0+IHwgdW50cmFjayA8aXRlbT4gfCBtYXJrIDxjaGVjaz4gfCB1bm1hcmsgPGNoZWNrPiB8IGNsZWFyIDxjbGVhcj4gfCBzdG9wIGxpc3RlbmluZztcbiAgICAgIGAsIDEpO1xuICAgICAgcmVjLmxhbmcgPSAnZW4tVVMnO1xuICAgICAgcmVjLmdyYW1tYXJzID0gZ3JhbW1hcjtcbiAgICAgIHJlYy5pbnRlcmltUmVzdWx0cyA9IGZhbHNlO1xuICAgICAgLy9yZWMuY29udGludW91cyA9IHRydWU7XG4gICAgICByZWMubWF4QWx0ZXJuYXRpdmVzID0gMTA7XG4gICAgICByZWMub25zdGFydCA9ICgpID0+IHsgdGhpcy52b2ljZSA9IHRydWU7IH07XG4gICAgICByZWMub25yZXN1bHQgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBzZWFyY2hlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBlLnJlc3VsdHNbZS5yZXN1bHRzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIXJlc3VsdC5pc0ZpbmFsKSByZXR1cm47XG4gICAgICAgIGxldCBtYXRjaGVkID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgYWx0IG9mIHJlc3VsdCkge1xuICAgICAgICAgIGxldCBjbWQgPSBhbHQudHJhbnNjcmlwdC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16IF0vZywgJycpO1xuICAgICAgICAgIHNlYXJjaGVkLmFkZChjbWQpO1xuICAgICAgICAgIGlmIChjbWQgPT09ICdzdG9wIGxpc3RlbmluZycpIHtcbiAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy52b2ljZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKGNvbnN0IFtyZSwgcmVwbF0gb2Ygdm9pY2VSZXBsYWNlbWVudHMpIHtcbiAgICAgICAgICAgIGNtZCA9IGNtZC5yZXBsYWNlKHJlLCByZXBsKTtcbiAgICAgICAgICAgIHNlYXJjaGVkLmFkZChjbWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsZXQgbWF0Y2ggPSAvXih0cmFja3x1bnRyYWNrfGNsZWFyfHVuY2xlYXJ8ZnVsbCBjbGVhcikgKC4qKS8uZXhlYyhjbWQpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhgYXR0ZW1wdDogJHttYXRjaFsyXX1gKTtcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXS5lbmRzV2l0aCgndHJhY2snKSkge1xuICAgICAgICAgICAgICBjb25zdCBlbCA9IHRoaXMudHJhY2tzLmdldChtYXRjaFsyXSk7XG4gICAgICAgICAgICAgIGlmICghZWwpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICB0aGlzLnRvZ2dsZShlbCwgIW1hdGNoWzFdLnN0YXJ0c1dpdGgoJ3VuJykpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaFsxXS5lbmRzV2l0aCgnY2xlYXInKSkge1xuICAgICAgICAgICAgICBsZXQgbWFya3MgPSBmdWxsQ2xlYXJzLmdldChtYXRjaFsyXSk7XG4gICAgICAgICAgICAgIGlmICghbWFya3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubWFya3MuaGFzKG1hdGNoWzJdKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgbWFya3MgPSBbbWF0Y2hbMl1dO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgbWFyayBvZiBtYXJrcykge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcy5tYXJrcy5nZXQobWFyaykhKSB7XG4gICAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QudG9nZ2xlKCdnb3QnLCAhbWF0Y2hbMV0uc3RhcnRzV2l0aCgndW4nKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9ICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIG1hdGNoID1cbiAgICAgICAgICAgICAgL14oPzp1bik/bWFyayg/OiAoXFxkKykoPzogY2hlKD86c3R8Y2spcz8pPyg/OiBpbikpPyAoLiopL1xuICAgICAgICAgICAgICAgICAgLmV4ZWMoY21kKTtcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIGNvbnN0IGVscyA9IHRoaXMubWFya3MuZ2V0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgIGxldCBudW0gPSBOdW1iZXIobWF0Y2hbMV0gfHwgJzEnKTtcbiAgICAgICAgICAgIC8vIFRPRE8gLSBmYWxsIGJhY2sgb24ga2V5IGl0ZW0gbmFtZXM/ICBcInVubWFyayB0ZWxlcGF0aHlcIlxuICAgICAgICAgICAgaWYgKCFlbHMgfHwgIW51bSkgY29udGludWU7XG4gICAgICAgICAgICBjb25zdCBnb3QgPSAhY21kLnN0YXJ0c1dpdGgoJ3VuJyk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGVscykge1xuICAgICAgICAgICAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdnb3QnKSAhPT0gZ290KSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnRvZ2dsZSgnZ290JywgZ290KTtcbiAgICAgICAgICAgICAgICBpZiAoLS1udW0gPT09IDApIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1hdGNoZWQpIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgTm8gbWF0Y2g6ICR7Wy4uLnJlc3VsdF0ubWFwKFxuICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICByID0+IHIudHJhbnNjcmlwdCkuam9pbignLCAnKX1gKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgTm8gbWF0Y2g6ICR7Wy4uLnNlYXJjaGVkXS5qb2luKCcsICcpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJlYy5zdG9wKCk7IC8vIGdlY2tvIGRvZXNuJ3Qgc3VwcG9ydCBjb250aW51b3VzP1xuICAgICAgfTtcbiAgICAgIHJlYy5vbmVuZCA9ICgpID0+IHsgaWYgKHRoaXMudm9pY2UpIHJlYy5zdGFydCgpOyB9O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgc3RhcnRWb2ljZSgpIHtcbiAgICBpZiAoIXRoaXMucmVjb2duaXRpb24gJiYgIXRoaXMuYWRkVm9pY2VSZWNvZ25pdGlvbigpKSByZXR1cm4gZmFsc2U7XG4gICAgdGhpcy52b2ljZSA9IHRydWU7XG4gICAgdGhpcy5yZWNvZ25pdGlvbiEuc3RhcnQoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHN0b3BWb2ljZSgpIHtcbiAgICB0aGlzLnZvaWNlID0gZmFsc2U7XG4gICAgaWYgKHRoaXMucmVjb2duaXRpb24pIHRoaXMucmVjb2duaXRpb24uc3RvcCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBvbHlmaWxsKC4uLm5hbWVzOiBzdHJpbmdbXSkge1xuICBjb25zdCB3aW4gPSB3aW5kb3cgYXMgYW55O1xuICBmb3IgKGxldCBuIG9mIG5hbWVzKSB7XG4gICAgaWYgKHR5cGVvZiB3aW5bbl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHdpbltuYW1lc1swXV0gPSB3aW5bbl07XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIGNvbnNvbGUuZXJyb3IoYENvdWxkIG5vdCBwb2x5ZmlsbCAke25hbWVzWzBdfWApO1xufVxucG9seWZpbGwoJ1NwZWVjaFJlY29nbml0aW9uJywgJ3dlYmtpdFNwZWVjaFJlY29nbml0aW9uJyk7XG5wb2x5ZmlsbCgnU3BlZWNoR3JhbW1hckxpc3QnLCAnd2Via2l0U3BlZWNoR3JhbW1hckxpc3QnKTtcblxuXG5cbi8vIGZ1bmN0aW9uIGlzU2xvdCh4OiBudW1iZXIpOiBib29sZWFuIHtcbi8vICAgcmV0dXJuICh4ICYgfjB4N2YpID09PSAweDEwMDtcbi8vIH1cblxuLy8gVE9ETyAtIGFsbCBHIGZsYWdzIGdldCB0aGUgZ2xpdGNoIGZvciBmcmVlXG4vLyAgICAgIC0gYWxsIG90aGVycyAobWludXMgd2lsZCB3YXJwIGlmIGRpc2FibGVkKSB0cmFja2VkIGFzIGdsaXRjaGVzXG4vLyAgICAgIC0gY29uc2lkZXIgZGFyayB5ZWxsb3cgYW5kIGRhcmsgZ3JlZW4gYXMgd2VsbCBhcyBkYXJrIGJsdWUgPz9cblxubGV0IGZsYWdzID0gJ1JscHQgVGInO1xuZm9yIChjb25zdCBhcmcgb2YgbG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkuc3BsaXQoJyYnKSkge1xuICBjb25zdCBba2V5LCB2YWx1ZV0gPSBhcmcuc3BsaXQoJz0nKTtcbiAgaWYgKGtleSA9PT0gJ2ZsYWdzJykge1xuICAgIGZsYWdzID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgfVxufVxuLy8gICAnc3BlZWQtYm9vdHMnOiB0cnVlLFxuLy8gICAnZ2xpdGNoLWdoZXR0by1mbGlnaHQnOiB0cnVlLFxuLy8gICAnZ2xpdGNoLXRhbGsnOiB0cnVlLFxuLy8gICAncm91dGUtbm8tZnJlZS1iYXJyaWVyJzogdHJ1ZSxcbi8vICAgJ3JvdXRlLXNoeXJvbi10ZWxlcG9ydCc6IHRydWUsXG4vLyAgICdyb3V0ZS1lYXJseS1mbGlnaHQnOiB0cnVlLFxuLy8gICAndHJhY2tlcic6IHRydWUsXG4vLyB9O1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuICBjb25zdCByb20gPSBhd2FpdCBSb20ubG9hZCgpO1xuICBjb25zdCBmbGFnc2V0ID0gbmV3IEZsYWdTZXQoZmxhZ3MpO1xuICBkZXRlcm1pbmlzdGljKHJvbSwgZmxhZ3NldCk7IC8vIG1ha2UgZGV0ZXJtaW5pc3RpYyBjaGFuZ2VzXG4gIGNvbnN0IHdvcmxkID0gV29ybGQuYnVpbGQocm9tLCBmbGFnc2V0LCB0cnVlKTsgLy8gKyAnIER0JykpO1xuICBjb25zdCBncmFwaCA9IG5ldyBHcmFwaChyb20sIHdvcmxkLCBmbGFnc2V0KTtcbiAgZm9yIChsZXQgaXRlbSBvZiBJVEVNUy5zcGxpdCgnXFxuJykpIHtcbiAgICBpdGVtID0gaXRlbS5yZXBsYWNlKC8jLiovLCAnJykudHJpbSgpO1xuICAgIGlmICghaXRlbSkgY29udGludWU7XG4gICAgZ3JhcGguYWRkSXRlbSguLi4oaXRlbS5zcGxpdCgvICsvZykgYXMgW3N0cmluZywgc3RyaW5nLCAuLi5zdHJpbmdbXV0pKTtcbiAgfVxuICBmb3IgKGNvbnN0IHNsb3Qgb2YgU0xPVFMpIHtcbiAgICBncmFwaC5hZGRTbG90KC4uLnNsb3QpO1xuICB9XG4gIGdyYXBoLmFkZEV4dHJhRmxhZ3MoKTtcbiAgZ3JhcGgudXBkYXRlKCk7XG5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZS1tYXAnKSEuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgZ3JhcGgubWFwLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicpO1xuICB9KTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NsZWFyLWFsbCcpIS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZ3JhcGguZ3JpZC5xdWVyeVNlbGVjdG9yQWxsKCcuZ290JykpIHtcbiAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZSgnZ290Jyk7XG4gICAgfVxuICAgIGdyYXBoLmhhcyA9IGdyYXBoLmFsd2F5cztcbiAgICBncmFwaC51cGRhdGUoKTtcbiAgfSk7XG4gIGNvbnN0IHZvaWNlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZvaWNlJykhO1xuICB2b2ljZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBpZiAoZ3JhcGgudm9pY2UpIHtcbiAgICAgIGdyYXBoLnN0b3BWb2ljZSgpO1xuICAgICAgdm9pY2UudGV4dENvbnRlbnQgPSAnZW5hYmxlIHZvaWNlJztcbiAgICB9IGVsc2UgaWYgKGdyYXBoLnN0YXJ0Vm9pY2UoKSkge1xuICAgICAgdm9pY2UudGV4dENvbnRlbnQgPSAnZGlzYWJsZSB2b2ljZSc7XG4gICAgfVxuICB9KTtcbiAgKHdpbmRvdyBhcyBhbnkpLmdyYXBoID0gZ3JhcGg7XG59O1xuXG4vL2Z1bmN0aW9uIGRpZSgpOiBuZXZlciB7IHRocm93IG5ldyBFcnJvcignQXNzZXJ0aW9uIGZhaWxlZCcpOyB9XG5cbm1haW4oKTtcbiJdfQ==