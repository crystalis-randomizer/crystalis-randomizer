import { World } from './logic/world.js';
import { FlagSet } from './flagset.js';
import { Rom } from './rom.js';
import { deterministic, deterministicPreParse } from './pass/deterministic.js';
import { DefaultMap } from './util.js';
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
statue-of-gold $3a gold-statue
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
    [0x3a, 234, 49, 'altar', 'statue of gold'],
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
const TRADES = new Set([0x29, 0x3e, 0x44, 0x47, 0x48]);
class Graph {
    constructor(rom, world, flags) {
        this.rom = rom;
        this.world = world;
        this.flags = flags;
        this.slots = new Map();
        this.items = new Map();
        this.slotElts = new Map();
        this.has = new Set();
        this.tracks = new Map();
        this.marks = new Map();
        this.voice = false;
        window.GRAPH = this;
        this.graph = world.getLocationList();
        this.grid = document.getElementsByClassName('grid')[0];
        this.map = document.getElementsByClassName('map')[0];
        const unlocks = new DefaultMap(() => new Set());
        for (const [slot, req] of this.graph.requirements) {
            for (const cs of req) {
                for (const c of cs) {
                    unlocks.get(c).add(slot);
                }
            }
        }
        this.unlocks = new Map([...unlocks].map(([i, s]) => [i, [...s]]));
        const toggle = (e) => {
            let t = e.target;
            while (t && !t.dataset['slot']) {
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
        const id = Number(t.dataset['slot']);
        const has = t.classList.toggle('got', val);
        if (t.dataset['item']) {
            has ? this.has.add(id) : this.has.delete(id);
        }
        this.update();
    }
    addSlot(slotId, x, y, ...names) {
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
        div.dataset['slot'] = String(slotId);
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        const inner = document.createElement('div');
        div.appendChild(inner);
        inner.textContent = names[0];
        if (this.flags.randomizeTrades() && TRADES.has(slotId)) {
            div.classList.add('boss');
        }
        this.slotElts.set(slotId, div);
        for (const name of names) {
            let marks = this.marks.get(name);
            if (marks == null)
                this.marks.set(name, marks = []);
            marks.push(div);
        }
        this.map.appendChild(div);
    }
    addItem(cls, hex, ...otherNames) {
        const id = Number.parseInt(hex.substring(1), 16);
        const outer = document.getElementsByClassName(cls)[0];
        const inner = document.createElement('div');
        outer.appendChild(inner);
        outer.dataset['slot'] = String(id);
        outer.dataset['item'] = String(id);
        this.tracks.set(cls.replace(/-/g, ' '), outer);
        for (const name of otherNames) {
            this.tracks.set(name.replace(/-/g, ' '), outer);
        }
    }
    addExtraFlags() {
    }
    update() {
        for (const elt of this.slotElts.values()) {
            elt.dataset['state'] = elt.classList.contains('got') ? '' : 'blocked';
        }
        const reachable = this.traverse();
        for (const slot of reachable) {
            if ((slot & ~0x7f) !== 0x100)
                continue;
            const elt = this.slotElts.get(slot & 0xff);
            if (elt && !elt.classList.contains('got')) {
                elt.dataset['state'] = 'available';
            }
        }
    }
    traverse() {
        const has = new Set([...this.has].map(i => i | 0x200));
        const reachable = new Set();
        const slots = new Set();
        const queue = new Set(this.graph.requirements.keys());
        for (const n of queue) {
            queue.delete(n);
            if (reachable.has(n))
                continue;
            const needed = this.graph.requirements.get(n);
            for (const route of needed) {
                if (!containsAll(has, route))
                    continue;
                reachable.add(n);
                const items = [];
                if ((n & ~0x7f) === 0x100) {
                    slots.add((n & 0xff));
                }
                else {
                    if (isItem(n))
                        items.push((n & 0xff));
                    has.add(n);
                }
                for (const item of has) {
                    for (const j of this.unlocks.get(item) || []) {
                        if (!this.graph.requirements.has(j)) {
                            console.dir(this);
                            throw new Error(`Adding bad node ${j} from unlock ${item}`);
                        }
                        queue.add(j);
                    }
                }
                break;
            }
        }
        return reachable;
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
function isItem(x) {
    return (x & ~0x7f) === 0x200;
}
function containsAll(set, want) {
    for (const elem of want) {
        if (!set.has(elem))
            return false;
    }
    return true;
}
let flags = '@Casual';
for (const arg of location.hash.substring(1).split('&')) {
    const [key, value] = arg.split('=');
    if (key === 'flags') {
        flags = decodeURIComponent(value);
    }
}
function initItemGrants(rom) {
    rom.itemGets.actionGrants = new Map([
        [0x25, 0x29],
        [0x39, 0x3a],
        [0x3b, 0x47],
        [0x3c, 0x3e],
        [0x84, 0x46],
        [0xb2, 0x42],
        [0xb4, 0x41],
    ]);
}
async function main() {
    const rom = await Rom.load(deterministicPreParse);
    rom.flags.defrag();
    initItemGrants(rom);
    const flagset = new FlagSet(flags);
    deterministic(rom, flagset);
    const world = new World(rom, flagset, true);
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
        graph.has = new Set();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy90cmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ3JDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDN0IsT0FBTyxFQUFDLGFBQWEsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBRTdFLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFckMsTUFBTSxLQUFLLEdBQVc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXNEckIsQ0FBQztBQUVGLE1BQU0saUJBQWlCLEdBQTZDO0lBQ2xFLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQztJQUN2QixDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUM7SUFDM0IsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDO0lBQ3JCLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQztJQUM5QixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUM7SUFDckIsQ0FBQyw4RUFBOEU7UUFDOUUsTUFBTSxDQUFDO0lBQ1IsQ0FBQyxzRUFBc0U7UUFDdEUsU0FBUyxDQUFDO0lBQ1gsQ0FBQyx1Q0FBdUMsRUFBRSxVQUFVLENBQUM7SUFDckQsQ0FBQyx1QkFBdUIsRUFBRSxrQkFBa0IsQ0FBQztJQUM3QyxDQUFDLHNCQUFzQixFQUFFLEtBQUssQ0FBQztJQUMvQixDQUFDLHVDQUF1QyxFQUFFLE1BQU0sQ0FBQztJQUNqRCxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUM7SUFDaEIsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLENBQUM7SUFDNUIsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDO0lBQ2xCLENBQUMs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Z3NldCB0byBmaWd1cmUgb3V0IGFjdHVhbCBkZXBlbmRlbmNpZXMuXG5cbmltcG9ydCB7V29ybGR9IGZyb20gJy4vbG9naWMvd29ybGQuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4vcm9tLmpzJztcbmltcG9ydCB7ZGV0ZXJtaW5pc3RpYywgZGV0ZXJtaW5pc3RpY1ByZVBhcnNlfSBmcm9tICcuL3Bhc3MvZGV0ZXJtaW5pc3RpYy5qcyc7XG5pbXBvcnQge0xvY2F0aW9uTGlzdCwgSXRlbUlkLCBTbG90SWR9IGZyb20gJy4vbG9naWMvZ3JhcGguanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwfSBmcm9tICcuL3V0aWwuanMnO1xuXG5jb25zdCBJVEVNUzogc3RyaW5nID0gYFxuc3dvcmQtb2Ytd2luZCAkMDBcbnN3b3JkLW9mLWZpcmUgJDAxXG5zd29yZC1vZi13YXRlciAkMDJcbnN3b3JkLW9mLXRodW5kZXIgJDAzXG53aW5kbWlsbC1rZXkgJDMyXG5zdGF0dWUtb2Ytb255eCAkMjUgb255eC1zdGF0dWVcbmluc2VjdC1mbHV0ZSAkMjdcbmtleS10by1wcmlzb24gJDMzIHByaXNvbi1rZXkga2V5LTItcHJpc29uXG5mbHV0ZS1vZi1saW1lICQyOFxuXG5iYWxsLW9mLXdpbmQgJDA1IGJhbGwtb2Ytd2luZFxuYmFsbC1vZi1maXJlICQwNyBiYWxsLW9mLWZpcmVcbmJhbGwtb2Ytd2F0ZXIgJDA5IGJhbGwtb2Ytd2F0ZXJcbmJhbGwtb2YtdGh1bmRlciAkMGIgYmFsbC1vZi10aHVuZGVyXG5raXJpc2EtcGxhbnQgJDNjXG5hbGFybS1mbHV0ZSAkMzFcbmZvZy1sYW1wICQzNVxuc2hlbGwtZmx1dGUgJDM2XG5icm9rZW4tc3RhdHVlICQzOFxuZXllLWdsYXNzZXMgJDM3IGV5ZWdsYXNzZXNcbmdsb3dpbmctbGFtcCAkMzlcblxudG9ybmFkby1icmFjZWxldCAkMDZcbmZsYW1lLWJyYWNlbGV0ICQwOFxuYmxpenphcmQtYnJhY2VsZXQgJDBhXG5zdG9ybS1icmFjZWxldCAkMGNcbmxvdmUtcGVuZGFudCAkM2JcbmtleS10by1zdHl4ICQzNCBrZXktMi1zdHl4XG5zdGF0dWUtb2YtZ29sZCAkM2EgZ29sZC1zdGF0dWVcbnNhY3JlZC1zaGllbGQgJDEyXG5pdm9yeS1zdGF0dWUgJDNkXG5cbnJhYmJpdC1ib290cyAkMmVcbmdhcy1tYXNrICQyOSBoYXphcmQtc3VpdCBoYXptYXQtc3VpdFxuc2hpZWxkLXJpbmcgJDMwXG5pcm9uLW5lY2tsYWNlICQyY1xubGVhdGhlci1ib290cyAkMmYgc3BlZWQtYm9vdHNcbnBvd2VyLXJpbmcgJDJhXG53YXJyaW9yLXJpbmcgJDJiXG5kZW9zLXBlbmRhbnQgJDJkIGRlb1xuYm93LW9mLW1vb24gJDNlIG1vb25cbmJvdy1vZi1zdW4gJDNmIHN1blxuXG5yZWZyZXNoICQ0MVxucGFyYWx5c2lzICQ0MlxudGVsZXBhdGh5ICQ0M1xudGVsZXBvcnQgJDQ0XG5yZWNvdmVyICQ0NVxuYmFycmllciAkNDZcbmNoYW5nZSAkNDdcbmZsaWdodCAkNDhcbnBzeWNoby1hcm1vciAkMWNcbmJvdy1vZi10cnV0aCAkNDAgdHJ1dGhcbmA7XG5cbmNvbnN0IHZvaWNlUmVwbGFjZW1lbnRzOiBSZWFkb25seUFycmF5PHJlYWRvbmx5IFtSZWdFeHAsIHN0cmluZ10+ID0gW1xuICBbL1xcYihzb3J0KVxcYi8sICdzd29yZCddLFxuICBbL1xcYihzb3J0YSlcXGIvLCAnc3dvcmQgb2YnXSxcbiAgWy9cXGIod2luKVxcYi8sICd3aW5kJ10sXG4gIFsvXFxia2V0b3N0aXhcXGIvLCAna2V5IDIgc3R5eCddLFxuICBbL1xcYmtldG9cXGIvLCAna2V5IDInXSxcbiAgWy9cXGIoc3RpY2tzfHN0aWNrIGN8c3RpeCBlfHN0aWNrIHNlYXxkaXhpZXxzdGlja3MgZXxzdGljayBzZWV8c2V4eXw2MHxzaXh0eSlcXGIvLFxuICAgJ3N0eXgnXSxcbiAgWy9cXGIoYXJyYXlsaXN0fGdvcmlsbGFbc3pdfGF1cmVsaXVzfGg/YWlybGVzc3xhIHJlYWxpc3R8YXJsW2VpeV1zcz8pXFxiLyxcbiAgICdhcnlsbGlzJ10sXG4gIFsvXFxiKGFtYXpvbiB1c3xhbWF6b25bYWVdP3NzP3xhbWF6b24pXFxiLywgJ2FtYXpvbmVzJ10sXG4gIFsvXFxiYW1hem9uZXMgYmFzZW1lbnRcXGIvLCAnYXJ5bGxpcyBiYXNlbWVudCddLFxuICBbL1xcYihkZWFsfGRpbHxkaWVobClcXGIvLCAnZGVvJ10sXG4gIFsvXFxiKGRzfGRlYWxzfGRpYXp8ZGVsb3N8ZHJvc2V8dGhlb3MpXFxiLywgJ2Rlb3MnXSxcbiAgWy9cXGJvbmVcXGIvLCAnMSddLFxuICBbL1xcYih0d298aWl8dG98dG9vKVxcYi8sICcyJ10sXG4gIFsvXFxidGhyZWVcXGIvLCAnMyddLFxuICBbL1xcYmZvdXJcXGIvLCAnNCddLFxuICBbL1xcYmFyW2NrXXMgdG9tXFxiLywgJ2FyayBzdG9tJ10sXG4gIFsvXFxib3JiaXRcXGIvLCAnb3JiIG9mJ10sXG4gIFsvXFxib3JiXFxuLywgJ2JhbGwnXSxcbiAgWy9eKGNvbnRyYWN0fGFtdHJhY2t8b250cmEoY3xrfGNrKSlcXGIvLCAndW50cmFjayddLFxuICBbL14oKGNofHRyKVtldV0oY3xrfGNrKSlcXGIvLCAndHJhY2snXSxcbiAgWy9edHJhY2sgP3N1aXRcXGIvLCAndHJhY2sgZmx1dGUnXSxcbiAgWy9cXGIoZmxvb3RlfGZvb2QpXFxiLywgJ2ZsdXRlJ10sXG4gIFsvXFxiKGx5bWV8bGlvbilcXGIvLCAnbGltZSddLFxuICBbL21hcmsoc3xlZClcXGIvLCAnbWFyayddLFxuICBbL14obWFyY3xtYWNofHNtYXJ0fFticF1hcmspXFxiLywgJ21hcmsnXSxcbiAgWy9cXGJsZWUgZmVsZGVyXFxiLywgJ2xlYWYgZWxkZXInXSxcbiAgWy9ebWFya2xleSBmLywgJ21hcmsgbGVhZiAnXSxcbiAgWy9eKG1hcmsgb2Z8bWFya2V0KVxcYi8sICdtYXJrJ10sXG4gIFsvXFxibGVpZlxcYi8sICdsZWFmJ10sXG4gIFsvXFxiZWxkYXJcXGIvLCAnZWxkZXInXSxcbiAgWy9cXGJsaWdodFxcYi8sICdmbGlnaHQnXSxcbiAgWy9cXGJtYW5uXFxiLywgJ21vb24nXSxcbiAgWy9edHJhY2tiYWxsXFxiLywgJ3RyYWNrIGJvdyddLFxuICBbL1xcYmJvc2VtYW5uP1xcYi8sICdib3cgb2YgbW9vbiddLFxuICBbL1xcYihibyh3ZSk/KVxcYi8sICdib3cnXSxcbiAgWy9cXGIoY2VydGlmaWVyfHN0YXJ0IGEgZmlyZSlcXGIvLCAnc3dvcmQgb2YgZmlyZSddLFxuICBbL1xcYndoZW4gbWlsa3lcXGIvLCAnd2luZG1pbGwga2V5J10sXG4gIFsvXig0IGNsZWFyfGZhdXggY2xlYXJ8Zm9sa2xvcmV8c28gP2NsZWFyfHBobyBjbGVhcilcXGIvLCAnZnVsbCBjbGVhciddLFxuICBbL1xcYihtYXlvfG1ldG98bmF0b3xtYWRlcnxtZWFkb3d8bWF0dGVyfG1hW2R0XWVyfG1vdHRvfG1vZGVsKVxcYi8sICdtYWRvJ10sXG4gIFsvXFxiY2FsdmV5XFxiLywgJ2tlbGJ5J10sXG4gIFsvXFxiKGtlbGJ5b25lfGx2ID8xKVxcYi8sICdrZWxieSAxJ10sXG4gIFsvXFxibHYgPzJcXGIvLCAna2VsYnkgMiddLFxuICBbL1xcYihjYXJtaW5lfGNhcm1lbnxjb21iaW5lKVxcYi8sICdrYXJtaW5lJ10sXG4gIFsvXFxiKGRyYVtna11bYW9dbilcXGIvLCAnZHJheWdvbiddLFxuICBbL1xcYihbY3NdW2FlXVtiZGd2XVthZWl1XSpyW2FlXXx4YXZpZXIpXFxiLywgJ3NhYmVyYSddLFxuICBbL1xcYih3cmlnaHR8cml0ZXx3cml0ZSlcXGIvLCAncmlnaHQnXSxcbiAgWy9cXGIoW2NrXW9yW2JkXWVsW2xlXT98cXVhZHJlbClcXGIvLCAnY29yZGVsJ10sXG4gIFsvXFxiKGhvdGVsIGRlc2t8KGJlbCk/bCBkZXNrfGtpbGwgYmFzcXVlfGtlaGwgYmFzY3xjYWxlYiBhc2soZWQpPylcXGIvLFxuICAgJ2tlbGJ5J10sXG4gIFsvXFxiKHBvcnRlcnxwb3J0W2VvXWxhfHBvcnRvIGEpXFxiLywgJ3BvcnRvYSddLFxuICBbL1xcYihhdGhlbmF8Y2VuYXx0aW5hfGlzaW5hfGVzcXVpbmEpXFxiLywgJ2FzaW5hJ10sXG4gIFsvXFxiKChhdCB0aGV8ZWNbaGtdbykgaFthb11ubj9haD98YWxjb2hvbChpYyk/KVxcYi8sICdha2FoYW5hJ10sXG4gIFsvXFxiKChyb2NhfGJyb2tlW25yXXxicm9rYXd8YmFycj9vY2EpIGhhbm4/YWg/fGJybyBrW2FvXWhbYW9dbmF8cG9rZWhhbmEpXFxiLyxcbiAgICdicm9rYWhhbmEnXSxcbiAgWy9cXGIoc3RvbmVkKVxcYi8sICdzdG9uZSddLFxuICAvLyBzdXBwb3J0IFwicm9ja2FoYW5hXCIgZm9yIHN0b25lIGFrYWhhbmFcbiAgWy9cXGIocm9jW2NrXWE/ID8oaG9uZGF8b2hhbmF8aFtvYV1ubj9haD98YXV0bykpXFxiLywgJ3N0b25lIGFrYWhhbmEnXSxcbiAgWy9cXGIoZ3VhcmRzKVxcYi8sICdndWFyZCddLFxuICBbL1xcYih3aW5kb3cpXFxiLywgJ3dpbmRtaWxsJ10sXG4gIFsvXFxiKHNhW2J2XVtlb11yKVxcYi8sICdzYWJyZSddLFxuICBbL1xcYnNhYnJlIHNvdXRoXFxiLywgJ3NhYnJlIHdlc3QnXSxcbiAgWy9cXGIoaGVicmV3fGNlYnV8c2ViYmF8emFiZWwpXFxiLywgJ3plYnUnXSxcbiAgWy9cXGIoW2JjdF0oW2FvdV1yfHJbYW91XSlubj9lbGw/KVxcYi8sICd0b3JuZWwnXSxcbiAgWy9cXGIoY2xhcmtlKVxcYi8sICdjbGFyayddLFxuICBbL1xcYnNhYmVyYSAxIGxlZnRcXGIvLCAnc2FiZXJhIGZvcnRyZXNzIGxlZnQnXSxcbiAgWy9cXGJzYWJlcmEgMSByaWdodFxcYi8sICdzYWJlcmEgZm9ydHJlc3MgcmlnaHQnXSxcbiAgWy9cXGIoY2FudHV8Y2FuY2VsfGNhbiBzdWV8a2luY2VyfGtlbnpvfGNhbmNlcilcXGIvLCAna2Vuc3UnXSxcbiAgWy9cXGIobGlnaHQgaG91c2UpXFxiLywgJ2xpZ2h0aG91c2UnXSxcbiAgWy9cXGJrZW5zdSg/OiBpbik/IChsaWdodGhvdXNlfHN3YW4pXFxiLywgJyQxJ10sXG4gIFsvXFxiKGtlbnN1IHNsaW1lfHNsaW1lIGtlbnN1KVxcYi8sICdzbGltZSddLFxuICBbL1xcYnVuZGVyZ3JvdW5kIGNoYW5uZWxcXGIvLCAnY2hhbm5lbCddLFxuICBbL1xcYig/Om1vdW50fG10KSAoc2FicmV8aHlkcmEpXFxiLywgJyQxJ10sXG4gIFsvXFxiKFtja11oP1thdV1yW2l1XXNzP1thb3VdKVxcYi8sICdraXJpc2EnXSxcbiAgWy9cXGJtYWRvIChsb3dlcnx1cHBlcilcXGIvLCAnbWFkbyAyICQxJ10sXG4gIFsvXFxic2FiZXJhKCAyKT8gKGxldmVsfGNoZXN0fHNld2VyKVxcYi8sICdzYWJlcmEgMiBsZXZlbCddLFxuICBbL1xcYihzY3JpcHR8cmljaHQpXFxiLywgJ2NyeXB0J10sXG4gIFsvXFxiZHJheWdvbiAxXFxiLywgJ2RyYXlnb24nXSxcbiAgWy9cXGJlc2lcXGIvLCAnZXZpbCBzcGlyaXQgaXNsYW5kJ10sXG4gIFsvXFxic2FicmUgbm9ydGggc3VtbWl0XFxiLywgJ3NhYnJlIHN1bW1pdCddLFxuICBbL1xcYmtpcmlzYSBwbGFudCBjYXZlXFxiLywgJ2tpcmlzYSBjYXZlJ10sXG4gIFsvXFxiKHdpbmRtaWxsfHZhbXBpcmUpIGNhdmVcXGIvLCAnc2VhbGVkIGNhdmUnXSxcbiAgWy9eKCg/OnVuKT8pbWFbdXJ4a2NzIF0qdFtpb11tZT8oPzogZmlnaHQpPy8sICckMW1hcmsgc3RvbSddLFxuICBbL1xcYihib3d8Zmx1dGUpXFxiLywgJyQxIG9mJ10sXG4gIFsvXFxib2YoIG9mKStcXGIvLCAnb2YnXSxcbiAgWy8gb2YkLywgJyddLFxuICAvLyBbL14oKD86dW4pPyltYXJrIHRlbGVwYXRoeS8sICckMW1hcmsgc3RvbSddLFxuICAvLyBbL14oKD86dW4pPyltYXJrIGJhdHRsZSAoYXJtb3J8c3VpdCkvLCAnJDFtYXJrIG9hc2lzIGNhdmUgZmxpZ2h0J10sXG4gIC8vIFsvXigoPzp1bik/KW1hcmsgcG93ZXIgcmluZy8sICckMW1hcmsgb2FzaXMgY2F2ZSBjZW50ZXInXSxcbiAgLy8gWy9eKCg/OnVuKT8pbWFyayBncmFzcy8sICckMW1hcmsgY29yZGVsIGdyYXNzJ10sXG4gIC8vIFsvYihqYWNrKGV0KT8pXFxiLywgJ2NoZWNrJ10sXG5dO1xuXG5jb25zdCBmdWxsQ2xlYXJzID0gbmV3IE1hcChbXG4gIFsnc2VhbGVkIGNhdmUnLCBbJ3NlYWxlZCBjYXZlIGZyb250JywgJ3NlYWxlZCBjYXZlIGJhY2snLCAndmFtcGlyZSAxJ11dLFxuICBbJ3N0eXgnLCBbJ3N0eXggbGVmdCcsICdzdHl4IHJpZ2h0J11dLFxuICBbJ29haycsIFsnb2FrIGVsZGVyJywgJ29hayBtb3RoZXInXV0sXG4gIFsnc2FicmUgd2VzdCcsIFsnc2FicmUgd2VzdCBzbG9wZScsICdzYWJyZSB3ZXN0JywgJ3Rvcm5lbCddXSxcbiAgWydzYWJyZSBub3J0aCcsIFsnc2FicmUgbm9ydGgnLCAna2VsYnkgMScsICdzYWJyZSBzdW1taXQnXV0sXG4gIFsnd2F0ZXJmYWxsIGNhdmUnLCBbJ3dhdGVyZmFsbCBjYXZlJywgJ3N0b25lIGFrYWhhbmEnXV0sXG4gIFsnZm9nIGxhbXAnLCBbJ2ZvZyBsYW1wIGZyb250JywgJ2ZvZyBsYW1wIGJhY2snXV0sXG4gIFsna2lyaXNhIHBsYW50JywgWydraXJpc2EgY2F2ZScsICdraXJpc2EgbWVhZG93J11dLFxuICBbJ2thcm1pbmUnLCBbJ2thcm1pbmUgYmFzZW1lbnQnLCAna2FybWluZScsICdiZWhpbmQga2FybWluZScsICdzbGltZSddXSxcbiAgWydhbWF6b25lcycsIFsnYXJ5bGxpcycsICdhcnlsbGlzIGJhc2VtZW50J11dLFxuICBbJ21hZG8gMicsIFsnbWFkbyAyJywgJ21hZG8gMiB1cHBlcicsICdtYWRvIDIgbG93ZXInXV0sXG4gIFsncHlyYW1pZCcsIFsncHlyYW1pZCcsICdkcmF5Z29uJ11dLFxuICBbJ2h5ZHJhJywgWydoeWRyYSBmcm9udCcsICdoeWRyYSBiYWNrJywgJ2h5ZHJhIHN1bW1pdCddXSxcbiAgWydzYWJlcmEgMScsIFsnc2FiZXJhIGZvcnRyZXNzIGxlZnQnLCAnc2FiZXJhIGZvcnRyZXNzIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAndmFtcGlyZSAyJywgJ3NhYmVyYSAxJywgJ2NsYXJrJ11dLFxuICBbJ29hc2lzIGNhdmUnLCBbJ29hc2lzIGNhdmUnLCAnb2FzaXMgY2F2ZSBmbGlnaHQnLCAnb2FzaXMgY2F2ZSBjZW50ZXInXV0sXG4gIFsnc2FiZXJhIDInLCBbJ3NhYmVyYSAyJywgJ3NhYmVyYSAyIGxldmVsJ11dLFxuXSk7ICBcblxuY29uc3QgU0xPVFM6IFJlYWRvbmx5QXJyYXk8cmVhZG9ubHkgW251bWJlciwgbnVtYmVyLCBudW1iZXIsIC4uLnN0cmluZ1tdXT4gPSBbXG4gIFsweDAwLCAxMjEsMTkyLCAnbGVhZiBlbGRlcicsICdzd29yZCBvZiB3aW5kJ10sXG4gIFsweDAxLCAyNzQsMTc2LCAnb2FrIGVsZGVyJywgJ3N3b3JkIG9mIGZpcmUnXSxcbiAgWzB4MDIsIDMzNSwxMjMsICd3YXRlcmZhbGwgY2F2ZScsICdzd29yZCBvZiB3YXRlciddLFxuICBbMHgwMywgIDc3LCAxMCwgJ3N0eXggbGVmdCcsICdzd29yZCBvZiB0aHVuZGVyJ10sXG4gIFsweDA1LCAgODksMTA3LCAnc2VhbGVkIGNhdmUgZnJvbnQnLCAnYmFsbCBvZiB3aW5kJ10sXG4gIFsweDA2LCAxMTUsMjI0LCAnc2FicmUgd2VzdCBzbG9wZScsICd0b3JuYWRvIGJyYWNlbGV0J10sXG4gIFsweDA3LCAyODIsMTg3LCAnaW5zZWN0JywgJ2JhbGwgb2YgZmlyZSddLFxuICBbMHgwOCwgIDQ3LDE4MiwgJ2tlbGJ5IDEnLCAnZmxhbWUgYnJhY2VsZXQnXSxcbiAgWzB4MDksIDI1MSwyMzIsICdyYWdlJywgJ2JhbGwgb2Ygd2F0ZXInXSxcbiAgWzB4MGEsIDIwNiwyNDksICdhcnlsbGlzIGJhc2VtZW50JywgJ2JsaXp6YXJkIGJyYWNlbGV0J10sXG4gIFsweDBiLCAgODMsIDYzLCAnbWFkbyAxJywgJ2JhbGwgb2YgdGh1bmRlciddLFxuICBbMHgwYywgIDIzLCAgOSwgJ2JlaGluZCBrYXJtaW5lJywgJ3N0b3JtIGJyYWNlbGV0J10sXG4gIFsweDEyLCAgNDksIDQ4LCAnbWFkbyAyJywgJ3NhY3JlZCBzaGllbGQnXSxcbiAgWzB4MTQsICA3NywgIDIsICdzdHl4IHJpZ2h0JywgJ3BzeWNobyBzaGllbGQnXSxcbiAgWzB4NzYsICA3MCwgIDMsICdzdHl4IHJpZ2h0J10sIC8vIHBzeWNobyBzaGllbGQgbWltaWMgMVxuICBbMHg3NywgIDg0LCAgMywgJ3N0eXggcmlnaHQnXSwgLy8gcHN5Y2hvIHNoaWVsZCBtaW1pYyAyXG4gIFsweDFiLCAxNjgsIDk2LCAnb2FzaXMgY2F2ZSBmbGlnaHQnLCAnYmF0dGxlIGFybW9yJ10sXG4gIFsweDFjLCAxOTksMTEwLCAnZHJheWdvbicsICdwc3ljaG8gYXJtb3InXSxcbiAgWzB4MWQsICA4MiwgOTUsICdzZWFsZWQgY2F2ZSBiYWNrJ10sIC8vIG1lZGljYWwgaGVyYiBzZWFsZWQgY2F2ZVxuICBbMHgxZSwgIDgyLDEwMSwgJ3NlYWxlZCBjYXZlIGJhY2snXSwgLy8gYW50aWRvdGUgc2VhbGVkIGNhdmVcbiAgWzB4MWYsIDM0NiwxNDcsICdmb2cgbGFtcCBmcm9udCddLCAvLyBseXNpcyBwbGFudCBmb2cgbGFtcFxuICBbMHg3MCwgMzQ2LDE1MywgJ2ZvZyBsYW1wIGZyb250J10sIC8vIGZvZyBsYW1wIG1pbWljIDFcbiAgWzB4NzEsIDM0NiwxNTksICdmb2cgbGFtcCBmcm9udCddLCAvLyBmb2cgbGFtcCBtaW1pYyAyXG4gIFsweDIwLCAxMjYsIDUyLCAnaHlkcmEgZnJvbnQnXSwgLy8gZnJ1aXQgb2YgbGltZSBtdCBoeWRyYVxuICBbMHgyMSwgMjI3LCA5NywgJ3NhYmVyYSBmb3J0cmVzcyBsZWZ0J10sIC8vIGZydWl0IG9mIHBvd2VyIHNhYmVyYSBwYWxhY2VcbiAgWzB4MjIsIDI1NiwgNzMsICdldmlsIHNwaXJpdCBpc2xhbmQnXSwgLy8gbWFnaWMgcmluZyBldmlsIHNwaXJpdCBpc2xhbmRcbiAgWzB4MjMsICA1OCwxMTUsICdzYWJlcmEgMiddLCAvLyBmcnVpdCBvZiByZXB1biBzYWJlcmEgMlxuICBbMHgyNCwgIDgyLDExMywgJ3NlYWxlZCBjYXZlIGZyb250J10sIC8vIHdhcnAgYm9vdHMgc2VhbGVkIGNhdmVcbiAgWzB4MjUsIDE4OSwxODAsICdjb3JkZWwgZ3Jhc3MnLCAnc3RhdHVlIG9mIG9ueXgnXSxcbiAgWzB4MjYsICAxOCwxNzIsICdrZWxieSAyJ10sIC8vIG9wZWwgc3RhdHVlXG4gIFsweDI3LCAyNjcsMTg1LCAnb2FrIG1vdGhlcicsICdpbnNlY3QgZmx1dGUnXSxcbiAgWzB4MjgsIDI3NSwxNDcsICdwb3J0b2EgcXVlZW4nLCAnZmx1dGUgb2YgbGltZSddLFxuICBbMHgyOSwgMTQ3LDIwNiwgJ2FrYWhhbmEnLCAnZ2FzIG1hc2snXSxcbiAgWzB4MmEsIDE3MiwxMDQsICdvYXNpcyBjYXZlIGNlbnRlcicsICdwb3dlciByaW5nJ10sXG4gIFsweDJiLCAyMDMsICA1LCAnYnJva2FoYW5hJywgJ3dhcnJpb3IgcmluZyddLFxuICBbMHgyYywgMjQ5LCA2OSwgJ2V2aWwgc3Bpcml0IGlzbGFuZCcsICdpcm9uIG5lY2tsYWNlJ10sXG4gIFsweDJkLCAxOTEsMTEwLCAnZGVvJywgJ2Rlb3MgcGVuZGFudCddLFxuICBbMHgyZSwgIDg5LCA5OSwgJ3ZhbXBpcmUgMScsICdyYWJiaXQgYm9vdHMnXSxcbiAgWzB4MmYsIDE2NCwxMDQsICdvYXNpcyBjYXZlJywgJ2xlYXRoZXIgYm9vdHMnXSxcbiAgWzB4MzAsIDMxOSwxMjMsICdzdG9uZSBha2FoYW5hJywgJ3NoaWVsZCByaW5nJ10sXG4gIFsweDcyLCAzMjAsMTMwLCAnd2F0ZXJmYWxsIGNhdmUnXSwgLy8gd2F0ZXJmYWxsIGNhdmUgbWltaWNcbiAgLy8gMzEgYWxhcm0gZmx1dGVcbiAgWzB4MzIsIDEwNSwgOTQsICd3aW5kbWlsbCBndWFyZCcsICd3aW5kbWlsbCBrZXknXSxcbiAgWzB4MzMsICA2NCwxOTgsICdzYWJyZSBub3J0aCcsICdrZXkgMiBwcmlzb24nXSxcbiAgWzB4MzQsICA4MywgNzEsICd6ZWJ1JywgJ2tleSAyIHN0eXgnXSxcbiAgWzB4MzUsIDM0NSwxNDAsICdmb2cgbGFtcCBiYWNrJywgJ2ZvZyBsYW1wJ10sXG4gIFsweDM2LCAzMDEsMTE5LCAnZG9scGhpbicsICdzaGVsbCBmbHV0ZSddLFxuICBbMHgzNywgMjMzLDExOCwgJ2NsYXJrJywgJ2V5ZSBnbGFzc2VzJ10sXG4gIFsweDM4LCAyMzQsIDg4LCAnc2FiZXJhIDEnLCAnYnJva2VuIHN0YXR1ZSddLFxuICBbMHgzOSwgMjk1LCA5MiwgJ2xpZ2h0aG91c2UnLCAnZ2xvd2luZyBsYW1wJ10sXG4gIFsweDNhLCAyMzQsIDQ5LCAnYWx0YXInLCAnc3RhdHVlIG9mIGdvbGQnXSxcbiAgWzB4M2IsIDI3NCwxMTcsICdjaGFubmVsJywgJ2xvdmUgcGVuZGFudCddLFxuICBbMHgzYywgMzM4LDIyNiwgJ2tpcmlzYSBtZWFkb3cnLCAna2lyaXNhIHBsYW50J10sXG4gIFsweDNkLCAgMjMsIDE3LCAna2FybWluZScsICdpdm9yeSBzdGF0dWUnXSxcbiAgWzB4M2UsIDIwNiwyNDEsICdhcnlsbGlzJywgJ2JvdyBvZiBtb29uJ10sXG4gIFsweDNmLCAxMDEsICA2LCAnaHlkcmEgc3VtbWl0JywgJ2JvdyBvZiBzdW4nXSxcbiAgWzB4NDAsIDIwNywxMTAsICdkcmF5Z29uJywgJ2JvdyBvZiB0cnV0aCddLFxuICBbMHg0MSwgIDkyLDExNywgJ3dpbmRtaWxsJywgJ3JlZnJlc2gnXSxcbiAgWzB4NDIsIDI3OSwxMjYsICdzYWJyZSBzdW1taXQnLCAncGFyYWx5c2lzJ10sXG4gIFsweDQzLCAyMDIsMTM4LCAnc3RvbScsICd0ZWxlcGF0aHknXSxcbiAgWzB4NDQsIDEyNCwyMDIsICd0b3JuZWwnLCAndGVsZXBvcnQnXSxcbiAgWzB4NDUsIDMwNCwxMjgsICdhc2luYScsICdyZWNvdmVyJ10sXG4gIFsweDQ2LCAyNDgsIDM1LCAnd2hpcmxwb29sJywgJ2JhcnJpZXInXSxcbiAgWzB4NDcsIDI3NywgIDMsICdzd2FuJywgJ2NoYW5nZSddLFxuICBbMHg0OCwgIDE1LCAyNSwgJ3NsaW1lJywgJ2ZsaWdodCddLFxuICBbMHg1MCwgIDgyLDEwNywgJ3NlYWxlZCBjYXZlIGZyb250J10sIC8vIG1lZGljYWwgaGVyYiBzZWFsZWQgY2F2ZSBmcm9udFxuICAvLyA1MSBzYWNyZWQgc2hpZWxkXG4gIFsweDUyLCAxMzQsMjE5LCAnc2FicmUgd2VzdCddLCAvLyBtZWRpY2FsIGhlcmIgbXQgc2FicmUgd1xuICBbMHg1MywgIDU5LDIxOSwgJ3NhYnJlIG5vcnRoJ10sIC8vIG1lZGljYWwgaGVyYiBtdCBzYWJyZSBuXG4gIFsweDU0LCAgNTIsIDU1LCAnbWFkbyAyIHVwcGVyJ10sIC8vIG1hZ2ljIHJpbmcgZm9ydHJlc3MgMyB1cHBlclxuICBbMHg1NSwgMjQxLCA5NywgJ3NhYmVyYSBmb3J0cmVzcyByaWdodCddLCAvLyBtZWRpY2FsIGhlcmIgc2FiZXJhIHBhbGFjZVxuICBbMHg1NiwgMTIzLCAyMywgJ2h5ZHJhIGZyb250J10sIC8vIG1lZGljYWwgaGVyYiBtdCBoeWRyYVxuICBbMHg3NCwgMTE1LCAgMywgJ2h5ZHJhIGJhY2snXSwgLy8gbXQgaHlkcmEgbWltaWNcbiAgWzB4NTcsICA3MCwgIDksICdzdHl4IGxlZnQnXSwgLy8gbWVkaWNhbCBoZXJiIHN0eXhcbiAgWzB4NzUsICA4NCwgIDksICdzdHl4IGxlZnQnXSwgLy8gc3R5eCAxIG1pbWljXG4gIFsweDU4LCAgMzIsIDM4LCAna2FybWluZSBiYXNlbWVudCddLCAvLyBtYWdpYyByaW5nIGthcm1pbmVcbiAgWzB4NzksICAzMiwgMTYsICdrYXJtaW5lIGJhc2VtZW50J10sIC8vIGthcm1pbmUgbWltaWMgMVxuICBbMHg3YSwgIDQwLCAxNiwgJ2thcm1pbmUgYmFzZW1lbnQnXSwgLy8ga2FybWluZSBtaW1pYyAyXG4gIFsweDdiLCAgNDAsIDM4LCAna2FybWluZSBiYXNlbWVudCddLCAvLyBrYXJtaW5lIG1pbWljIDNcbiAgLy8gNTkgbWVkaWNhbCBoZXJiXG4gIFsweDVhLCAxNjEsIDk3LCAnZm9ydHJlc3MgZXhpdCddLCAvLyBmcnVpdCBvZiBwb3dlciBvYXNpcyBjYXZlIChvdmVyIHdhdGVyKVxuICBbMHgxMCwgMzI3LDEyMywgJ3dhdGVyZmFsbCBjYXZlJ10sIC8vIGZsdXRlIG9mIGxpbWUgY2hlc3QgKE5PVEU6IGNoYW5nZWQgNWItPiAxMClcbiAgWzB4NWMsIDI1NiwgNzksICdldmlsIHNwaXJpdCBpc2xhbmQnXSwgLy8gbHlzaXMgcGxhbnQgZXZpbCBzcGlyaXQgaXNsYW5kXG4gIFsweDVkLCAgMzYsMTM5LCAnc2FiZXJhIDIgbGV2ZWwnXSwgLy8gbHlzaXMgcGxhbnQgc2FiZXJhIGxldmVsXG4gIFsweDVlLCAgMTQsMjI5LCAnc2FicmUgbm9ydGgnXSwgLy8gYW50aWRvdGUgbXQgc2FicmUgblxuICBbMHg1ZiwgMzQ1LDIyNSwgJ2tpcmlzYSBjYXZlJ10sIC8vIGFudGlkb3RlIGtpcmlzYSBjYXZlXG4gIFsweDYwLCAgMTgsIDk0LCAnbWFkbyAyIHVwcGVyJ10sIC8vIGFudGlkb3RlIGZvcnRlc3MgM1xuICBbMHg2MSwgMjM0LCA5NiwgJ3ZhbXBpcmUgMiddLCAvLyBmcnVpdCBvZiBwb3dlciB2YW1waXJlIDJcbiAgWzB4NjIsICAxOCwxMTgsICdzYWJlcmEgMiBsZXZlbCddLCAvLyBmcnVpdCBvZiBwb3dlciBzYWJlcmEgbGV2ZWxcbiAgWzB4NjMsICAzNiwgNTQsICdtYWRvIDIgdXBwZXInXSwgLy8gb3BlbCBzdGF0dWUgZm9ydHJlc3MgM1xuICBbMHg2NCwgMTc1LCA5NywgJ29hc2lzIGNhdmUnXSwgLy8gZnJ1aXQgb2YgcG93ZXIgb2FzaXMgY2F2ZVxuICBbMHg2NSwgMTM5LCA0MCwgJ2h5ZHJhIGJhY2snXSwgLy8gbWFnaWMgcmluZyBtdCBoeWRyYVxuICBbMHg2NiwgIDY2LDE2MCwgJ3NhYmVyYSAyIGxldmVsJ10sIC8vIGZydWl0IG9mIHJlcHVuIHNhYmVyYSBsZXZlbFxuICAvLyA2NyBtYWdpYyByaW5nXG4gIC8vIDY4IG1hZ2ljIHJpbmdcbiAgWzB4NjksIDEzMSwyMDEsICdzYWJyZSB3ZXN0J10sIC8vIG1hZ2ljIHJpbmcgbXQgc2FicmUgd1xuICBbMHg2YSwgIDc2LDIyNiwgJ3NhYnJlIHdlc3QnXSwgLy8gd2FycCBib290cyBtdCBzYWJyZSB3XG4gIFsweDZiLCAgMTgsMTAwLCAnbWFkbyAyIHVwcGVyJ10sIC8vIG1hZ2ljIHJpbmcgZm9ydHJlc3MgMyB1cHBlciAoYmVoaW5kKVxuICBbMHg2YywgMTkzLDEwMywgJ3B5cmFtaWQnXSwgLy8gbWFnaWMgcmluZyBweXJhbWlkIGZyb250XG4gIFsweDc4LCAxOTksMTAzLCAnY3J5cHQnXSwgLy8gcHlyYW1pZCBiYWNrIG1pbWljXG4gIFsweDZkLCAyMDUsMTAzLCAnY3J5cHQnXSwgLy8gb3BlbCBzdGF0dWUgcHlyYW1pZCBiYWNrXG4gIFsweDczLCAyNTYsIDY3LCAnZXZpbCBzcGlyaXQgaXNsYW5kJ10sIC8vIGlyb24gbmVja2xhY2UgbWltaWNcbiAgWzB4NmUsICAyNCwgMzgsICdrYXJtaW5lIGJhc2VtZW50J10sIC8vIHdhcnAgYm9vdHMga2FybWluZVxuICBbMHg2ZiwgIDQ0LCA5NywgJ21hZG8gMiBsb3dlciddLCAvLyBtYWdpYyByaW5nIGZvcnRyZXNzIDMgbG93ZXJcbl07XG5cbi8vIG5vbi11bmlxdWUga2V5IGl0ZW0gc2xvdHNcbmNvbnN0IEtFWSA9IG5ldyBTZXQoWzB4MTAsIDB4MTIsIDB4MjMsIDB4MjYsIDB4NjFdKTtcblxuLy8gY29uc3QgQk9TU0VTID0gbmV3IFNldChbXG4vLyAgIDB4MmUsIC8vIHJhYmJpdCBib290cyBzbG90IC0+IHZhbXBpcmUgMVxuLy8gICAweDA3LCAvLyBiYWxsIG9mIGZpcmUgc2xvdCAtPiBpbnNlY3Rcbi8vICAgMHgwOCwgLy8gZmxhbWUgYnJhY2VsZXQgc2xvdCAtPiBrZWxiZXNxdWUgMVxuLy8gICAweDA5LCAvLyBiYWxsIG9mIHdhdGVyIHNsb3QgLT4gcmFnZVxuLy8gICAweDM4LCAvLyBicm9rZW4gc3RhdHVlIHNsb3QgLT4gc2FiZXJhIDFcbi8vICAgMHgwYiwgLy8gYmFsbCBvZiB0aHVuZGVyIHNsb3QgLT4gbWFkbyAxXG4vLyAgIDB4MjYsIC8vIG9wZWwgc3RhdHVlIHNsb3QgLT4ga2VsYmVzcXVlIDJcbi8vICAgMHgyMywgLy8gZnJ1aXQgb2YgcmVwdW4gc2xvdCAtPiBzYWJlcmEgMlxuLy8gICAweDEyLCAvLyBzYWNyZWQgc2hpZWxkIHNsb3QgLT4gbWFkbyAyXG4vLyAgIDB4M2QsIC8vIGl2b3J5IHN0YXR1ZSBzbG90IC0+IGthcm1pbmVcbi8vICAgMHgxYywgLy8gcHN5Y2hvIGFybW9yIHNsb3QgLT4gZHJheWdvbiAxXG4vLyAgIC8vIFssIH4weDEwYl0sIC8vIGRyYXlnb24gMlxuLy8gICAweDYxLCAvLyBmcnVpdCBvZiBwb3dlciBzbG90IC0+IHZhbXBpcmUgMlxuLy8gXSk7XG5cbi8vIHNsb3RzIHRoYXQgY29tZSBmcm9tIHRyYWRlLWluc1xuLy8gIC0gbm90ZTogdGhlIGZvZyBsYW1wIHRyYWRlLWluIGRvZXNuJ3QgaGF2ZSBhIGdvb2Qgc2xvdCBmb3IgdGhpc1xuLy8gVE9ETyAtIGFkZCBcInRyYWRlZCBmb2cgbGFtcFwiIHRvIGl0ZW1zLCBhZGQgYSBib3ggZm9yIGl0LlxuLy8gVE9ETyAtIGNvdW50IG51bWJlciBvZiB0cmFkZWQgYm94ZXMgY2hlY2tlZCwgc2V0IHJlc3QgdG8gYmxvY2tlZCBpZlxuLy8gICAgICAgIDw9IG51bWJlciBvZiBpdGVtcyBhbHJlYWR5IHRyYWRlZCBpbi4uLj9cbi8vIFRPRE8gLSBmaW5kLWFuZC1yZXBsYWNlIGZvciB0b3JuZWwncyBpdGVtIGFmdGVyIHRoZSBmYWN0Pz9cbmNvbnN0IFRSQURFUyA9IG5ldyBTZXQoWzB4MjksIDB4M2UsIDB4NDQsIDB4NDcsIDB4NDhdKTtcblxuLy8gVE9ETyAtIGFkZCBleHRyYSBpbmRpcmVjdGlvbiBmb3Igd2FsbHMgaW4gb3ZlcmxheSBpZiB0cmFja2luZ1xuLy8gIC0gb25lIGZvciBlYWNoIHNlcGFyYXRlIHJlZ2lvbi4uLiBob3cgdG8ga2VlcCB0cmFjayBvZiB0aGF0P1xuLy8gIC0gdGhlbiBrZWVwIHRoZW0gYXMgaXRlbXMuLi4/ICBib3NzZXM/ICBtYXliZSBqdXN0IGhhcmRjb2RlXG4vLyAgICB0aGUgbGlua2FnZXM/ICBvciBqdXN0IGFkZCBhbGwgd2FsbHMgYXMgaXRlbXMgYW5kIGxpbmsgdGhlbVxuLy8gICAgZGlyZWN0bHkgaGVyZS4uLiAtIHRoYXQgbWlnaHQgYmUgYmV0dGVyLlxuXG4vLyB4LCB5LCAuLi5mbGFnc1xuLy8gY29uc3QgV0FMTFM6IFtudW1iZXIsIG51bWJlciwgLi4ubnVtYmVyXSA9IFtdO1xuXG5jbGFzcyBHcmFwaCB7XG4gIC8qKiBtYXAgZnJvbSBpZCB0byBzbG90IGluZGV4ICovXG4gIHJlYWRvbmx5IHNsb3RzID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgLyoqIG1hcCBmcm9tIGlkIHRvIGl0ZW0gaW5kZXggKi9cbiAgcmVhZG9ubHkgaXRlbXMgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAvKiogbWFwIGZyb20gc2xvdCBpbmRleCB0byBlbGVtZW50ICovXG4gIHJlYWRvbmx5IHNsb3RFbHRzID0gbmV3IE1hcDxudW1iZXIsIEhUTUxFbGVtZW50PigpO1xuICAvKiogbWFwIGZyb20gaXRlbSBpbmRleCB0byBlbGVtZW50ICovXG4gIC8vcmVhZG9ubHkgaXRlbUVsdHMgPSBuZXcgTWFwPG51bWJlciwgSFRNTEVsZW1lbnQ+KCk7XG4gIC8qKiBzZXQgb2Ygc2xvdCBpbmRleCAqL1xuICAvL3JlYWRvbmx5IGNoZWNrZWQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gLyoqIG1hcCBmcm9tIHNsb3QgaWQgdG8gbm9kZSAqL1xuICAvLyByZWFkb25seSBub2RlRnJvbVNsb3QgPSBuZXcgTWFwPG51bWJlciwgYW55PigpO1xuICAvLyByZWFkb25seSBub2RlcyA9IG5ldyBNYXA8YW55LCBhbnk+KCk7XG4gIC8qKiBNYXBzIGl0ZW0gaW5kZXggdG8gd2hldGhlciBpdGVtIGlzIGdvdHRlbiAqL1xuICBoYXM6IFNldDxJdGVtSWQ+ID0gbmV3IFNldCgpO1xuXG4gIHJlYWRvbmx5IGdyYXBoOiBMb2NhdGlvbkxpc3Q7XG4gIHJlYWRvbmx5IHVubG9ja3M6IFJlYWRvbmx5TWFwPEl0ZW1JZCwgcmVhZG9ubHkgU2xvdElkW10+O1xuICByZWFkb25seSBncmlkOiBFbGVtZW50O1xuICByZWFkb25seSBtYXA6IEVsZW1lbnQ7XG4gIHJlYWRvbmx5IHRyYWNrcyA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudD4oKTtcbiAgcmVhZG9ubHkgbWFya3MgPSBuZXcgTWFwPHN0cmluZywgSFRNTEVsZW1lbnRbXT4oKTtcblxuICB2b2ljZSA9IGZhbHNlO1xuICByZWNvZ25pdGlvbj86IFNwZWVjaFJlY29nbml0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLFxuICAgICAgICAgICAgICByZWFkb25seSB3b3JsZDogV29ybGQsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGZsYWdzOiBGbGFnU2V0KSB7XG4gICAgLy8gVE9ETyAtIGNvbXB1dGUgdHdvIGRlcGdyYXBoczogb25lIHdpdGggZ2xpdGNoZXMgYW5kIG9uZSB3aXRob3V0XG4gICAgLy8gIC0gdGhlbiB3ZSBjYW4gc2hvdyBncmVlbiB2cyB5ZWxsb3cgZm9yIGdsaXRjaGFibGUgbG9jYXRpb25zLi4/XG4gICAgKHdpbmRvdyBhcyBhbnkpLkdSQVBIID0gdGhpcztcblxuICAgIHRoaXMuZ3JhcGggPSB3b3JsZC5nZXRMb2NhdGlvbkxpc3QoKTtcbiAgICB0aGlzLmdyaWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdncmlkJylbMF07XG4gICAgdGhpcy5tYXAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdtYXAnKVswXTtcblxuICAgIGNvbnN0IHVubG9ja3MgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIFNldDxTbG90SWQ+PigoKSA9PiBuZXcgU2V0KCkpO1xuICAgIGZvciAoY29uc3QgW3Nsb3QsIHJlcV0gb2YgdGhpcy5ncmFwaC5yZXF1aXJlbWVudHMpIHtcbiAgICAgIGZvciAoY29uc3QgY3Mgb2YgcmVxKSB7XG4gICAgICAgIGZvciAoY29uc3QgYyBvZiBjcykge1xuICAgICAgICAgIHVubG9ja3MuZ2V0KGMpLmFkZChzbG90IGFzIFNsb3RJZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy51bmxvY2tzID0gbmV3IE1hcChbLi4udW5sb2Nrc10ubWFwKFxuICAgICAgICAoW2ksIHNdOiBbbnVtYmVyLCBTZXQ8U2xvdElkPl0pID0+IFtpIGFzIEl0ZW1JZCwgWy4uLnNdXSkpO1xuXG4gICAgICAvLyB0aGlzLm5vZGVzLnNldChuLnVpZCwgbi5uYW1lKTtcbiAgICAgIC8vIHRoaXMucm91dGVbbi51aWRdID0gNDtcbiAgICAgIC8vIGlmIChuIGluc3RhbmNlb2YgU2xvdCkge1xuICAgICAgLy8gICAvLyB1c2VkIGJ5IGFkZEJveFxuICAgICAgLy8gICBpZiAoIW4uaXNNaW1pYygpKSB7XG4gICAgICAvLyAgICAgdGhpcy5ub2RlRnJvbVNsb3Quc2V0KG4uc2xvdEluZGV4LCBuKTtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICAvLyBub3Qgc2hvd24sIGp1c3QgYXNzdW1lIGhhdmUgaXRcbiAgICAgIC8vICAgaWYgKG4ubmFtZSA9PSAnQWxhcm0gRmx1dGUnIHx8IG4ubmFtZSA9PSAnTWVkaWNhbCBIZXJiJykge1xuICAgICAgLy8gICAgIHRoaXMuYWx3YXlzLmFkZChuLml0ZW0udWlkKTtcbiAgICAgIC8vICAgICB0aGlzLnJvdXRlW24uaXRlbS51aWRdID0gMDtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfSBlbHNlIGlmIChuIGluc3RhbmNlb2YgTG9jYXRpb24pIHtcbiAgICAgIC8vICAgLy8gZmluZCB0aGUgbWltaWNzLCB0aGV5IG5lZWQgc3BlY2lhbCBoYW5kbGluZyBiZWNhdXNlXG4gICAgICAvLyAgIC8vIHRoZXkgYWxsIG1hcCB0byB0aGUgc2FtZSBzbG90IElELi4uXG4gICAgICAvLyAgIGZvciAoY29uc3QgY2hlc3Qgb2Ygbi5jaGVzdHMpIHtcbiAgICAgIC8vICAgICBpZiAoY2hlc3QuaXNNaW1pYygpKSB7XG4gICAgICAvLyAgICAgICB0aGlzLm1pbWljU2xvdHMuc2V0KG4uaWQgPDwgOCB8IGNoZXN0LnNwYXduU2xvdCwgY2hlc3QpO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfVxuICAgICAgLy8gfSBlbHNlIGlmIChuIGluc3RhbmNlb2YgVHJhY2tlck5vZGUpIHtcbiAgICAgIC8vICAgY29uc3QgaW5kZXggPSB0aGlzLmRlcGdyYXBoLnVpZFRvSXRlbVtuLnVpZF07XG4gICAgICAvLyAgIGlmIChpbmRleCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIC8vICAgbGV0IGNvbG9yID0gNDtcbiAgICAgIC8vICAgaWYgKG4udHlwZSA9PT0gVHJhY2tlck5vZGUuT0ZGX1JPVVRFKSBjb2xvciA9IDE7XG4gICAgICAvLyAgIGlmIChuLnR5cGUgPT09IFRyYWNrZXJOb2RlLkdMSVRDSCkgY29sb3IgPSAyO1xuICAgICAgLy8gICBpZiAobi50eXBlID09PSBUcmFja2VyTm9kZS5IQVJEKSBjb2xvciA9IDM7XG4gICAgICAvLyAgIHRoaXMucm91dGVbbi51aWRdID0gY29sb3I7XG4gICAgICAvLyB9XG5cbiAgICBjb25zdCB0b2dnbGUgPSAoZTogRXZlbnQpID0+IHtcbiAgICAgIGxldCB0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnR8bnVsbDtcbiAgICAgIHdoaWxlICh0ICYmICF0LmRhdGFzZXRbJ3Nsb3QnXSkge1xuICAgICAgICB0ID0gdC5wYXJlbnRFbGVtZW50O1xuICAgICAgfVxuICAgICAgaWYgKCF0KSByZXR1cm47XG4gICAgICB0aGlzLnRvZ2dsZSh0KTtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5ncmlkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9nZ2xlKTtcbiAgICAvL3RoaXMubWFwLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9nZ2xlKTtcbiAgfVxuXG4gIHRvZ2dsZSh0OiBIVE1MRWxlbWVudCwgdmFsPzogYm9vbGVhbikge1xuICAgIGNvbnN0IGlkID0gTnVtYmVyKHQuZGF0YXNldFsnc2xvdCddKSBhcyBJdGVtSWQ7XG4gICAgY29uc3QgaGFzID0gdC5jbGFzc0xpc3QudG9nZ2xlKCdnb3QnLCB2YWwpO1xuICAgIGlmICh0LmRhdGFzZXRbJ2l0ZW0nXSkge1xuICAgICAgaGFzID8gdGhpcy5oYXMuYWRkKGlkKSA6IHRoaXMuaGFzLmRlbGV0ZShpZCk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cblxuICBhZGRTbG90KHNsb3RJZDogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlciwgLi4ubmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgLy8gY29uc3QgaW5kZXggPSB0aGlzLnNsb3RzLmdldChzbG90SWQpO1xuICAgIC8vIGlmIChpbmRleCA9PSBudWxsKSB7IGRlYnVnZ2VyOyB0aHJvdyBuZXcgRXJyb3IoKTsgfVxuICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNvbnN0IGl0ZW1nZXQgPSB0aGlzLnJvbS5pdGVtR2V0c1tzbG90SWRdO1xuICAgIGNvbnN0IGl0ZW0gPSBpdGVtZ2V0ICYmIHRoaXMucm9tLml0ZW1zW2l0ZW1nZXQuaXRlbUlkXTtcbiAgICAvLyBtYWtlIHNvbWUgYm94ZXMgYmlnZ2VyOyBxdWljayBoYWNrIHRvIGF2b2lkIHVuaXF1ZSBhcm1vcnNcbiAgICBpZiAoaXRlbSAmJiBpdGVtLnVuaXF1ZSB8fCBLRVkuaGFzKHNsb3RJZCkpIHtcbiAgICAgIGRpdi5jbGFzc0xpc3QuYWRkKCdrZXknKTtcbiAgICAgIHgtLTsgeS0tO1xuICAgIH1cbiAgICB4LS07IHktLTtcbiAgICBkaXYuZGF0YXNldFsnc2xvdCddID0gU3RyaW5nKHNsb3RJZCk7XG4gICAgZGl2LnN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICBkaXYuc3R5bGUudG9wID0geSArICdweCc7XG4gICAgLy9kaXYudGV4dENvbnRlbnQgPSAnXFx4YTAnO1xuICAgIGNvbnN0IGlubmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmFwcGVuZENoaWxkKGlubmVyKTtcbiAgICBpbm5lci50ZXh0Q29udGVudCA9IG5hbWVzWzBdO1xuICAgICAgICAvLyBzbG90SWQgPj0gMHg3MCA/XG4gICAgICAgIC8vICAgICAnTWltaWMnIDpcbiAgICAgICAgLy8gICAgIHRoaXMucm9tLml0ZW1zW2l0ZW1nZXQuaXRlbUlkXS5tZXNzYWdlTmFtZS5yZXBsYWNlKCcgJywgJ1xceGEwJyk7XG4gICAgaWYgKHRoaXMuZmxhZ3MucmFuZG9taXplVHJhZGVzKCkgJiYgVFJBREVTLmhhcyhzbG90SWQpKSB7XG4gICAgICBkaXYuY2xhc3NMaXN0LmFkZCgnYm9zcycpO1xuICAgIH1cbiAgICB0aGlzLnNsb3RFbHRzLnNldChzbG90SWQsIGRpdik7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG4gICAgICBsZXQgbWFya3MgPSB0aGlzLm1hcmtzLmdldChuYW1lKTtcbiAgICAgIGlmIChtYXJrcyA9PSBudWxsKSB0aGlzLm1hcmtzLnNldChuYW1lLCBtYXJrcyA9IFtdKTtcbiAgICAgIG1hcmtzLnB1c2goZGl2KTtcbiAgICB9XG4gICAgdGhpcy5tYXAuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgfVxuXG4gIGFkZEl0ZW0oY2xzOiBzdHJpbmcsIGhleDogc3RyaW5nLCAuLi5vdGhlck5hbWVzOiBzdHJpbmdbXSkge1xuICAgIC8vIHBhcnNlIHRoZSBoZXgsIHJlbW92aW5nICQgcHJlZml4XG4gICAgY29uc3QgaWQgPSBOdW1iZXIucGFyc2VJbnQoaGV4LnN1YnN0cmluZygxKSwgMTYpO1xuICAgIGNvbnN0IG91dGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShjbHMpWzBdIGFzIEhUTUxFbGVtZW50O1xuICAgIGNvbnN0IGlubmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgb3V0ZXIuYXBwZW5kQ2hpbGQoaW5uZXIpO1xuICAgIG91dGVyLmRhdGFzZXRbJ3Nsb3QnXSA9IFN0cmluZyhpZCk7XG4gICAgb3V0ZXIuZGF0YXNldFsnaXRlbSddID0gU3RyaW5nKGlkKTtcbiAgICAvL3RoaXMuc2xvdEVsdHMuc2V0KGluZGV4LCBvdXRlcik7XG4gICAgdGhpcy50cmFja3Muc2V0KGNscy5yZXBsYWNlKC8tL2csICcgJyksIG91dGVyKTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygb3RoZXJOYW1lcykge1xuICAgICAgdGhpcy50cmFja3Muc2V0KG5hbWUucmVwbGFjZSgvLS9nLCAnICcpLCBvdXRlcik7XG4gICAgfVxuICB9XG5cbiAgYWRkRXh0cmFGbGFncygpIHtcbiAgICAvLyBmb3IgKGNvbnN0IHNsb3Qgb2YgdGhpcy5ncmFwaC5yZXF1aXJlbWVudHMua2V5U2V0KCkpIHtcbiAgICAvLyAgIGlmICghaXNTbG90KHNsb3QpKSBjb250aW51ZTtcbiAgICAvLyAgIGlmICghQk9TU0VTLmhhcyhzbG90ICYgMHhmZikpIGNvbnRpbnVlO1xuICAgIC8vICAgY29uc3QgZWx0ID0gdGhpcy5zbG90RWx0cy5nZXQocmVwbGFjZWQpO1xuICAgIC8vICAgaWYgKGVsdCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdGVkJyk7XG4gICAgLy8gICB0aGlzLnNsb3RFbHRzLmRlbGV0ZShOdW1iZXIoZWx0LmRhdGFzZXRbJ3Nsb3QnXSkpO1xuICAgIC8vICAgdGhpcy5zbG90RWx0cy5zZXQoc2xvdC5pbmRleCwgZWx0KTtcbiAgICAvLyAgIGVsdC5jbGFzc0xpc3QuYWRkKCdib3NzJyk7XG4gICAgLy8gICBlbHQuZGF0YXNldFsnc2xvdCddID0gU3RyaW5nKHNsb3QuaW5kZXgpO1xuICAgIC8vICAgZWx0LmRhdGFzZXRbJ2l0ZW0nXSA9IFN0cmluZyhzbG90LmluZGV4KTtcbiAgICAvLyB9XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgZm9yIChjb25zdCBlbHQgb2YgdGhpcy5zbG90RWx0cy52YWx1ZXMoKSkge1xuICAgICAgZWx0LmRhdGFzZXRbJ3N0YXRlJ10gPSBlbHQuY2xhc3NMaXN0LmNvbnRhaW5zKCdnb3QnKSA/ICcnIDogJ2Jsb2NrZWQnO1xuICAgIH1cbiAgICBjb25zdCByZWFjaGFibGUgPSB0aGlzLnRyYXZlcnNlKCk7XG4gICAgZm9yIChjb25zdCBzbG90IG9mIHJlYWNoYWJsZSkge1xuICAgICAgLy8gZmlndXJlIG91dCB3aGV0aGVyIGl0J3MgYXZhaWxhYmxlIG9yIG5vdFxuICAgICAgLy8gVE9ETyAtIGNvbnNpZGVyIGhhdmluZyBtdWx0aXBsZSB3b3JsZHMsIGZvciBnbGl0Y2hlZC9oYXJkP1xuICAgICAgLy8gICAgICAtPiBhZGp1c3QgZmxhZ3MgdG8gYWRkIGFsbCBnbGl0Y2hlcy9oYXJkIG1vZGVcbiAgICAgIGlmICgoc2xvdCAmIH4weDdmKSAhPT0gMHgxMDApIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZWx0ID0gdGhpcy5zbG90RWx0cy5nZXQoc2xvdCAmIDB4ZmYpO1xuICAgICAgaWYgKGVsdCAmJiAhZWx0LmNsYXNzTGlzdC5jb250YWlucygnZ290JykpIHtcbiAgICAgICAgZWx0LmRhdGFzZXRbJ3N0YXRlJ10gPSAnYXZhaWxhYmxlJztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB0cmF2ZXJzZSgpOiBTZXQ8U2xvdElkPiB7XG4gICAgY29uc3QgaGFzID0gbmV3IFNldChbLi4udGhpcy5oYXNdLm1hcChpID0+IGkgfCAweDIwMCkpO1xuICAgIGNvbnN0IHJlYWNoYWJsZSA9IG5ldyBTZXQ8U2xvdElkPigpO1xuICAgIGNvbnN0IHNsb3RzID0gbmV3IFNldDxTbG90SWQ+KCk7XG4gICAgY29uc3QgcXVldWUgPVxuICAgICAgICBuZXcgU2V0PFNsb3RJZD4odGhpcy5ncmFwaC5yZXF1aXJlbWVudHMua2V5cygpIGFzIEl0ZXJhYmxlPFNsb3RJZD4pO1xuICAgIGZvciAoY29uc3QgbiBvZiBxdWV1ZSkge1xuICAgICAgcXVldWUuZGVsZXRlKG4pO1xuICAgICAgaWYgKHJlYWNoYWJsZS5oYXMobikpIGNvbnRpbnVlO1xuICAgICAgLy8gY2FuIHdlIHJlYWNoIGl0P1xuICAgICAgY29uc3QgbmVlZGVkID0gdGhpcy5ncmFwaC5yZXF1aXJlbWVudHMuZ2V0KG4pITtcbiAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgbmVlZGVkKSB7XG4gICAgICAgIGlmICghY29udGFpbnNBbGwoaGFzLCByb3V0ZSkpIGNvbnRpbnVlO1xuICAgICAgICByZWFjaGFibGUuYWRkKG4pO1xuICAgICAgICAvLyBUT0RPIC0tLSBuZWVkIHRvIGZpZ3VyZSBvdXQgd2hhdCB0byBkbyBoZXJlLlxuICAgICAgICAvLyAgICAgIC0tLSBmaWxsIHdvdWxkIGxpa2UgdG8gYmUgemVyby1iYXNlZCBidXQgZG9lc24ndCBuZWVkIHRvIGJlLlxuICAgICAgICAvLyAgICAgICAgICBjb3VsZCB1c2UgYSBzaW1wbGUgcGFpciBvZiBNYXBzLCBwb3NzaWJseT9cbiAgICAgICAgLy8gICAgICAgICAgb3IgZnJvbnQtbG9hZCB0aGUgaXRlbXM/XG4gICAgICAgIC8vICAgc2xvdHM6IDF4eCBvdGhlcnNcbiAgICAgICAgLy8gICBpdGVtczogMnh4IG90aGVyc1xuICAgICAgICAvLyBidXQgd2Ugd2FudCBzYW1lIGZsYWdzIHRvIGhhdmUgc2FtZSBpbmRleFxuICAgICAgICAvLyAgIHNsb3RzOiAoZml4ZWQpIChyZXF1aXJlZCBzbG90cykgKGV4dHJhIHNsb3RzKVxuICAgICAgICAvLyAgIGl0ZW1zOiAoZml4ZWQpIChyZXF1aXJlZCBzbG90cykgKGl0ZW1zKVxuICAgICAgICAvLyBpZiBuIGlzIGEgc2xvdCB0aGVuIGFkZCB0aGUgaXRlbSB0byBoYXMuXG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtSWRbXSA9IFtdO1xuICAgICAgICBpZiAoKG4gJiB+MHg3ZikgPT09IDB4MTAwKSB7XG4gICAgICAgICAgc2xvdHMuYWRkKChuICYgMHhmZikgYXMgU2xvdElkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoaXNJdGVtKG4pKSBpdGVtcy5wdXNoKChuICYgMHhmZikgYXMgbnVtYmVyIGFzIEl0ZW1JZCk7XG4gICAgICAgICAgaGFzLmFkZChuKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaGFzKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBqIG9mIHRoaXMudW5sb2Nrcy5nZXQoaXRlbSBhcyBJdGVtSWQpIHx8IFtdKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZ3JhcGgucmVxdWlyZW1lbnRzLmhhcyhqKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmRpcih0aGlzKTtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBZGRpbmcgYmFkIG5vZGUgJHtqfSBmcm9tIHVubG9jayAke2l0ZW19YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5hZGQoaik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVhY2hhYmxlO1xuICB9XG5cbiAgYWRkVm9pY2VSZWNvZ25pdGlvbihkaXNhYmxlQ2FsbGJhY2s6ICgpID0+IHZvaWQpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVjID0gdGhpcy5yZWNvZ25pdGlvbiA9IG5ldyBTcGVlY2hSZWNvZ25pdGlvbigpO1xuICAgICAgLy8gTk9URTogYXMgZmFyIGFzIEkgY2FuIHRlbGwsIHRoaXMgZG9lcyBub3RoaW5nLi4uXG4gICAgICBjb25zdCBncmFtbWFyID0gbmV3IFNwZWVjaEdyYW1tYXJMaXN0KCk7XG4gICAgICBncmFtbWFyLmFkZEZyb21TdHJpbmcoYFxuICAgICAgICAgICNKU0dGIFYxLjA7XG4gICAgICAgICAgZ3JhbW1hciBjb21tYW5kO1xuICAgICAgICAgIHB1YmxpYyA8aXRlbT4gPSAke1suLi50aGlzLnRyYWNrcy5rZXlzKCldLmpvaW4oJyB8ICcpfTtcbiAgICAgICAgICBwdWJsaWMgPGNoZWNrPiA9ICR7Wy4uLnRoaXMubWFya3Mua2V5cygpXS5qb2luKCcgfCAnKX07XG4gICAgICAgICAgcHVibGljIDxjbGVhcj4gPSA8Y2hlY2s+IHwgJHtbLi4uZnVsbENsZWFycy5rZXlzKCldLmpvaW4oJyB8ICcpfTtcbiAgICAgICAgICBwdWJsaWMgPGNvbW1hbmQ+ID0gdHJhY2sgPGl0ZW0+IHwgdW50cmFjayA8aXRlbT4gfCBtYXJrIDxjaGVjaz4gfCB1bm1hcmsgPGNoZWNrPiB8IGNsZWFyIDxjbGVhcj4gfCBzdG9wIGxpc3RlbmluZztcbiAgICAgIGAsIDEpO1xuICAgICAgcmVjLmxhbmcgPSAnZW4tVVMnO1xuICAgICAgcmVjLmdyYW1tYXJzID0gZ3JhbW1hcjtcbiAgICAgIHJlYy5pbnRlcmltUmVzdWx0cyA9IGZhbHNlO1xuICAgICAgLy9yZWMuY29udGludW91cyA9IHRydWU7XG4gICAgICByZWMubWF4QWx0ZXJuYXRpdmVzID0gMTA7XG4gICAgICByZWMub25zdGFydCA9ICgpID0+IHsgdGhpcy52b2ljZSA9IHRydWU7IH07XG4gICAgICByZWMub25yZXN1bHQgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBzZWFyY2hlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBlLnJlc3VsdHNbZS5yZXN1bHRzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIXJlc3VsdC5pc0ZpbmFsKSByZXR1cm47XG4gICAgICAgIGxldCBtYXRjaGVkID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgYWx0IG9mIHJlc3VsdCkge1xuICAgICAgICAgIGxldCBjbWQgPSBhbHQudHJhbnNjcmlwdC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16IF0vZywgJycpO1xuICAgICAgICAgIHNlYXJjaGVkLmFkZChjbWQpO1xuICAgICAgICAgIGlmIChjbWQgPT09ICdzdG9wIGxpc3RlbmluZycpIHtcbiAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy52b2ljZSA9IGZhbHNlO1xuICAgICAgICAgICAgZGlzYWJsZUNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgW3JlLCByZXBsXSBvZiB2b2ljZVJlcGxhY2VtZW50cykge1xuICAgICAgICAgICAgY21kID0gY21kLnJlcGxhY2UocmUsIHJlcGwpO1xuICAgICAgICAgICAgc2VhcmNoZWQuYWRkKGNtZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCBtYXRjaCA9IC9eKHRyYWNrfHVudHJhY2t8Y2xlYXJ8dW5jbGVhcnxmdWxsIGNsZWFyKSAoLiopLy5leGVjKGNtZCk7XG4gICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGBhdHRlbXB0OiAke21hdGNoWzJdfWApO1xuICAgICAgICAgICAgaWYgKG1hdGNoWzFdLmVuZHNXaXRoKCd0cmFjaycpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpcy50cmFja3MuZ2V0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgICAgaWYgKCFlbCkgY29udGludWU7XG4gICAgICAgICAgICAgIHRoaXMudG9nZ2xlKGVsLCAhbWF0Y2hbMV0uc3RhcnRzV2l0aCgndW4nKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoWzFdLmVuZHNXaXRoKCdjbGVhcicpKSB7XG4gICAgICAgICAgICAgIGxldCBtYXJrcyA9IGZ1bGxDbGVhcnMuZ2V0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgICAgaWYgKCFtYXJrcykge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5tYXJrcy5oYXMobWF0Y2hbMl0pKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBtYXJrcyA9IFttYXRjaFsyXV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9yIChjb25zdCBtYXJrIG9mIG1hcmtzKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzLm1hcmtzLmdldChtYXJrKSEpIHtcbiAgICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC50b2dnbGUoJ2dvdCcsICFtYXRjaFsxXS5zdGFydHNXaXRoKCd1bicpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgbWF0Y2ggPVxuICAgICAgICAgICAgICAvXig/OnVuKT9tYXJrKD86IChcXGQrKSg/OiBjaGUoPzpzdHxjaylzPyk/KD86IGluKSk/ICguKikvXG4gICAgICAgICAgICAgICAgICAuZXhlYyhjbWQpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgY29uc3QgZWxzID0gdGhpcy5tYXJrcy5nZXQobWF0Y2hbMl0pO1xuICAgICAgICAgICAgbGV0IG51bSA9IE51bWJlcihtYXRjaFsxXSB8fCAnMScpO1xuICAgICAgICAgICAgLy8gVE9ETyAtIGZhbGwgYmFjayBvbiBrZXkgaXRlbSBuYW1lcz8gIFwidW5tYXJrIHRlbGVwYXRoeVwiXG4gICAgICAgICAgICBpZiAoIWVscyB8fCAhbnVtKSBjb250aW51ZTtcbiAgICAgICAgICAgIGNvbnN0IGdvdCA9ICFjbWQuc3RhcnRzV2l0aCgndW4nKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgZWxzKSB7XG4gICAgICAgICAgICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2dvdCcpICE9PSBnb3QpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QudG9nZ2xlKCdnb3QnLCBnb3QpO1xuICAgICAgICAgICAgICAgIGlmICgtLW51bSA9PT0gMCkgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghbWF0Y2hlZCkge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBObyBtYXRjaDogJHtbLi4ucmVzdWx0XS5tYXAoXG4gICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgIHIgPT4gci50cmFuc2NyaXB0KS5qb2luKCcsICcpfWApO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBObyBtYXRjaDogJHtbLi4uc2VhcmNoZWRdLmpvaW4oJywgJyl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVjLnN0b3AoKTsgLy8gZ2Vja28gZG9lc24ndCBzdXBwb3J0IGNvbnRpbnVvdXM/XG4gICAgICB9O1xuICAgICAgcmVjLm9uZW5kID0gKCkgPT4geyBpZiAodGhpcy52b2ljZSkgcmVjLnN0YXJ0KCk7IH07XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBzdGFydFZvaWNlKGRpc2FibGVDYWxsYmFjazogKCkgPT4gdm9pZCkge1xuICAgIGlmICghdGhpcy5yZWNvZ25pdGlvbiAmJiAhdGhpcy5hZGRWb2ljZVJlY29nbml0aW9uKGRpc2FibGVDYWxsYmFjaykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy52b2ljZSA9IHRydWU7XG4gICAgdGhpcy5yZWNvZ25pdGlvbiEuc3RhcnQoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHN0b3BWb2ljZSgpIHtcbiAgICB0aGlzLnZvaWNlID0gZmFsc2U7XG4gICAgaWYgKHRoaXMucmVjb2duaXRpb24pIHRoaXMucmVjb2duaXRpb24uc3RvcCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBvbHlmaWxsKC4uLm5hbWVzOiBzdHJpbmdbXSkge1xuICBjb25zdCB3aW4gPSB3aW5kb3cgYXMgYW55O1xuICBmb3IgKGxldCBuIG9mIG5hbWVzKSB7XG4gICAgaWYgKHR5cGVvZiB3aW5bbl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHdpbltuYW1lc1swXV0gPSB3aW5bbl07XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIGNvbnNvbGUuZXJyb3IoYENvdWxkIG5vdCBwb2x5ZmlsbCAke25hbWVzWzBdfWApO1xufVxucG9seWZpbGwoJ1NwZWVjaFJlY29nbml0aW9uJywgJ3dlYmtpdFNwZWVjaFJlY29nbml0aW9uJyk7XG5wb2x5ZmlsbCgnU3BlZWNoR3JhbW1hckxpc3QnLCAnd2Via2l0U3BlZWNoR3JhbW1hckxpc3QnKTtcblxuXG5cbi8vIGZ1bmN0aW9uIGlzU2xvdCh4OiBudW1iZXIpOiBib29sZWFuIHtcbi8vICAgcmV0dXJuICh4ICYgfjB4N2YpID09PSAweDEwMDtcbi8vIH1cblxuZnVuY3Rpb24gaXNJdGVtKHg6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gKHggJiB+MHg3ZikgPT09IDB4MjAwO1xufVxuXG5mdW5jdGlvbiBjb250YWluc0FsbDxUPihzZXQ6IFNldDxUPiwgd2FudDogSXRlcmFibGU8VD4pOiBib29sZWFuIHtcbiAgZm9yIChjb25zdCBlbGVtIG9mIHdhbnQpIHtcbiAgICBpZiAoIXNldC5oYXMoZWxlbSkpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gVE9ETyAtIGFsbCBHIGZsYWdzIGdldCB0aGUgZ2xpdGNoIGZvciBmcmVlXG4vLyAgICAgIC0gYWxsIG90aGVycyAobWludXMgd2lsZCB3YXJwIGlmIGRpc2FibGVkKSB0cmFja2VkIGFzIGdsaXRjaGVzXG4vLyAgICAgIC0gY29uc2lkZXIgZGFyayB5ZWxsb3cgYW5kIGRhcmsgZ3JlZW4gYXMgd2VsbCBhcyBkYXJrIGJsdWUgPz9cblxubGV0IGZsYWdzID0gJ0BDYXN1YWwnO1xuZm9yIChjb25zdCBhcmcgb2YgbG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkuc3BsaXQoJyYnKSkge1xuICBjb25zdCBba2V5LCB2YWx1ZV0gPSBhcmcuc3BsaXQoJz0nKTtcbiAgaWYgKGtleSA9PT0gJ2ZsYWdzJykge1xuICAgIGZsYWdzID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgfVxufVxuLy8gICAnc3BlZWQtYm9vdHMnOiB0cnVlLFxuLy8gICAnZ2xpdGNoLWdoZXR0by1mbGlnaHQnOiB0cnVlLFxuLy8gICAnZ2xpdGNoLXRhbGsnOiB0cnVlLFxuLy8gICAncm91dGUtbm8tZnJlZS1iYXJyaWVyJzogdHJ1ZSxcbi8vICAgJ3JvdXRlLXNoeXJvbi10ZWxlcG9ydCc6IHRydWUsXG4vLyAgICdyb3V0ZS1lYXJseS1mbGlnaHQnOiB0cnVlLFxuLy8gICAndHJhY2tlcic6IHRydWUsXG4vLyB9O1xuXG5mdW5jdGlvbiBpbml0SXRlbUdyYW50cyhyb206IFJvbSkge1xuICAvLyBOT1RFOiBUaGlzIGlzIHVnbHkgdG8gcHV0IGhlcmUsIGJ1dCB0aGUgbm9ybWFsIHZlcnNpb25cbiAgLy8gcmVxdWlyZXMgcHJlc2h1ZmZsZSB0byB3b3JrIGNvcnJlY3RseSwgYW5kIGl0IGRvZXNuJ3RcbiAgLy8gbWFrZSBzZW5zZSB0byBoYXJkY29kZSBpdCBpbiBJdGVtR2V0cycgaW5pdGlhbGl6ZXIuXG4gIHJvbS5pdGVtR2V0cy5hY3Rpb25HcmFudHMgPSBuZXcgTWFwKFtcbiAgICBbMHgyNSwgMHgyOV0sXG4gICAgWzB4MzksIDB4M2FdLFxuICAgIFsweDNiLCAweDQ3XSxcbiAgICBbMHgzYywgMHgzZV0sXG4gICAgWzB4ODQsIDB4NDZdLFxuICAgIFsweGIyLCAweDQyXSxcbiAgICBbMHhiNCwgMHg0MV0sXG4gIF0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuICBjb25zdCByb20gPSBhd2FpdCBSb20ubG9hZChkZXRlcm1pbmlzdGljUHJlUGFyc2UpO1xuICByb20uZmxhZ3MuZGVmcmFnKCk7XG4gIGluaXRJdGVtR3JhbnRzKHJvbSk7XG4gIGNvbnN0IGZsYWdzZXQgPSBuZXcgRmxhZ1NldChmbGFncyk7XG4gIGRldGVybWluaXN0aWMocm9tLCBmbGFnc2V0KTsgLy8gbWFrZSBkZXRlcm1pbmlzdGljIGNoYW5nZXNcbiAgY29uc3Qgd29ybGQgPSBuZXcgV29ybGQocm9tLCBmbGFnc2V0LCB0cnVlKTsgLy8gKyAnIER0JykpO1xuICBjb25zdCBncmFwaCA9IG5ldyBHcmFwaChyb20sIHdvcmxkLCBmbGFnc2V0KTtcbiAgZm9yIChsZXQgaXRlbSBvZiBJVEVNUy5zcGxpdCgnXFxuJykpIHtcbiAgICBpdGVtID0gaXRlbS5yZXBsYWNlKC8jLiovLCAnJykudHJpbSgpO1xuICAgIGlmICghaXRlbSkgY29udGludWU7XG4gICAgZ3JhcGguYWRkSXRlbSguLi4oaXRlbS5zcGxpdCgvICsvZykgYXMgW3N0cmluZywgc3RyaW5nLCAuLi5zdHJpbmdbXV0pKTtcbiAgfVxuICBmb3IgKGNvbnN0IHNsb3Qgb2YgU0xPVFMpIHtcbiAgICBncmFwaC5hZGRTbG90KC4uLnNsb3QpO1xuICB9XG4gIGdyYXBoLmFkZEV4dHJhRmxhZ3MoKTtcbiAgZ3JhcGgudXBkYXRlKCk7XG5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvZ2dsZS1tYXAnKSEuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgZ3JhcGgubWFwLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicpO1xuICB9KTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NsZWFyLWFsbCcpIS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZ3JhcGguZ3JpZC5xdWVyeVNlbGVjdG9yQWxsKCcuZ290JykpIHtcbiAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZSgnZ290Jyk7XG4gICAgfVxuICAgIGdyYXBoLmhhcyA9IG5ldyBTZXQoKTsgLy8gZ3JhcGguYWx3YXlzO1xuICAgIGdyYXBoLnVwZGF0ZSgpO1xuICB9KTtcbiAgY29uc3Qgdm9pY2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndm9pY2UnKSE7XG4gIHZvaWNlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIGlmIChncmFwaC52b2ljZSkge1xuICAgICAgZ3JhcGguc3RvcFZvaWNlKCk7XG4gICAgICB2b2ljZS50ZXh0Q29udGVudCA9ICdlbmFibGUgdm9pY2UnO1xuICAgIH0gZWxzZSBpZiAoZ3JhcGguc3RhcnRWb2ljZSgoKSA9PiB2b2ljZS50ZXh0Q29udGVudCA9ICdlbmFibGUgdm9pY2UnKSkge1xuICAgICAgdm9pY2UudGV4dENvbnRlbnQgPSAnZGlzYWJsZSB2b2ljZSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZvaWNlLnRleHRDb250ZW50ID0gJ3ZvaWNlIHJlY29nbml0aW9uIGZhaWxlZCc7XG4gICAgfVxuICB9KTtcbiAgKHdpbmRvdyBhcyBhbnkpLmdyYXBoID0gZ3JhcGg7XG59O1xuXG4vL2Z1bmN0aW9uIGRpZSgpOiBuZXZlciB7IHRocm93IG5ldyBFcnJvcignQXNzZXJ0aW9uIGZhaWxlZCcpOyB9XG5cbm1haW4oKTtcbiJdfQ==