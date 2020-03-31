import { Assembler } from './6502.js';
import { crc32 } from './crc32.js';
import { generate as generateDepgraph } from './depgraph.js';
import { FetchReader } from './fetchreader.js';
import { FlagSet } from './flagset.js';
import { AssumedFill } from './graph/shuffle.js';
import { World } from './graph/world.js';
import { crumblingPlatforms } from './pass/crumblingplatforms.js';
import { deterministic, deterministicPreParse } from './pass/deterministic.js';
import { fixDialog } from './pass/fixdialog.js';
import { randomizeThunderWarp } from './pass/randomizethunderwarp.js';
import { shuffleGoa } from './pass/shufflegoa.js';
import { shuffleMazes } from './pass/shufflemazes.js';
import { shufflePalettes } from './pass/shufflepalettes.js';
import { shuffleTrades } from './pass/shuffletrades.js';
import { toggleMaps } from './pass/togglemaps.js';
import { unidentifiedItems } from './pass/unidentifieditems.js';
import { Random } from './random.js';
import { Rom } from './rom.js';
import { Constraint } from './rom/constraint.js';
import { Graphics } from './rom/graphics.js';
import { Monster } from './rom/monster.js';
import { ShopType } from './rom/shop.js';
import * as slots from './rom/slots.js';
import { Spoiler } from './rom/spoiler.js';
import { hex, seq, watchArray, writeLittleEndian } from './rom/util.js';
import { DefaultMap } from './util.js';
import * as version from './version.js';
const EXPAND_PRG = true;
export default ({
    async apply(rom, hash, path) {
        let flags;
        if (!hash.seed) {
            hash.seed = parseSeed('').toString(16);
            window.location.hash += '&seed=' + hash.seed;
        }
        if (hash.flags) {
            flags = new FlagSet(String(hash.flags));
        }
        else {
            flags = new FlagSet('@FullShuffle');
        }
        for (const key in hash) {
            if (hash[key] === 'false')
                hash[key] = false;
        }
        const [result,] = await shuffle(rom, parseSeed(String(hash.seed)), flags, new FetchReader(path));
        return result;
    },
});
export function parseSeed(seed) {
    if (!seed)
        return Random.newSeed();
    if (/^[0-9a-f]{1,8}$/i.test(seed))
        return Number.parseInt(seed, 16);
    return crc32(seed);
}
const {} = { watchArray };
export async function shuffle(rom, seed, flags, reader, log, progress) {
    if (EXPAND_PRG && rom.length < 0x80000) {
        const newRom = new Uint8Array(rom.length + 0x40000);
        newRom.subarray(0, 0x40010).set(rom.subarray(0, 0x40010));
        newRom.subarray(0x80010).set(rom.subarray(0x40010));
        newRom[4] <<= 1;
        rom = newRom;
    }
    if (typeof seed !== 'number')
        throw new Error('Bad seed');
    const newSeed = crc32(seed.toString(16).padStart(8, '0') + String(flags)) >>> 0;
    const touchShops = true;
    const defines = {
        _ALLOW_TELEPORT_OUT_OF_BOSS: flags.hardcoreMode() &&
            flags.shuffleBossElements(),
        _ALLOW_TELEPORT_OUT_OF_TOWER: true,
        _AUTO_EQUIP_BRACELET: flags.autoEquipBracelet(),
        _BARRIER_REQUIRES_CALM_SEA: flags.barrierRequiresCalmSea(),
        _BUFF_DEOS_PENDANT: flags.buffDeosPendant(),
        _BUFF_DYNA: flags.buffDyna(),
        _CHECK_FLAG0: true,
        _CTRL1_SHORTCUTS: flags.controllerShortcuts(),
        _CUSTOM_SHOOTING_WALLS: true,
        _DEBUG_DIALOG: seed === 0x17bc,
        _DISABLE_SHOP_GLITCH: flags.disableShopGlitch(),
        _DISABLE_STATUE_GLITCH: flags.disableStatueGlitch(),
        _DISABLE_SWORD_CHARGE_GLITCH: flags.disableSwordChargeGlitch(),
        _DISABLE_TRIGGER_SKIP: true,
        _DISABLE_WARP_BOOTS_REUSE: flags.disableShopGlitch(),
        _DISABLE_WILD_WARP: false,
        _DISPLAY_DIFFICULTY: true,
        _EXTRA_PITY_MP: true,
        _FIX_COIN_SPRITES: true,
        _FIX_OPEL_STATUE: true,
        _FIX_SHAKING: true,
        _FIX_VAMPIRE: true,
        _HARDCORE_MODE: flags.hardcoreMode(),
        _HAZMAT_SUIT: flags.changeGasMaskToHazmatSuit(),
        _LEATHER_BOOTS_GIVE_SPEED: flags.leatherBootsGiveSpeed(),
        _NERF_FLIGHT: true,
        _NERF_MADO: true,
        _NERF_WILD_WARP: flags.nerfWildWarp(),
        _NEVER_DIE: flags.neverDie(),
        _NORMALIZE_SHOP_PRICES: touchShops,
        _PITY_HP_AND_MP: true,
        _PROGRESSIVE_BRACELET: true,
        _RABBIT_BOOTS_CHARGE_WHILE_WALKING: flags.rabbitBootsChargeWhileWalking(),
        _REQUIRE_HEALED_DOLPHIN_TO_RIDE: flags.requireHealedDolphinToRide(),
        _REVERSIBLE_SWAN_GATE: true,
        _SAHARA_RABBITS_REQUIRE_TELEPATHY: flags.saharaRabbitsRequireTelepathy(),
        _SIMPLIFY_INVISIBLE_CHESTS: true,
        _SOFT_RESET_SHORTCUT: true,
        _TELEPORT_ON_THUNDER_SWORD: flags.teleportOnThunderSword(),
        _TRAINER: flags.trainer(),
        _TWELVTH_WARP_POINT: true,
        _UNIDENTIFIED_ITEMS: flags.unidentifiedItems(),
        _ZEBU_STUDENT_GIVES_ITEM: flags.zebuStudentGivesItem(),
    };
    const asm = new Assembler();
    async function assemble(path) {
        asm.assemble(await reader.read(path), path);
        asm.patchRom(rom);
    }
    deterministicPreParse(rom.subarray(0x10));
    const flagFile = Object.keys(defines)
        .filter(d => defines[d]).map(d => `define ${d} 1\n`).join('');
    asm.assemble(flagFile, 'flags.s');
    await assemble('preshuffle.s');
    const random = new Random(newSeed);
    const parsed = new Rom(rom);
    if (typeof window == 'object')
        window.rom = parsed;
    parsed.spoiler = new Spoiler(parsed);
    if (log)
        log.spoiler = parsed.spoiler;
    deterministic(parsed, flags);
    toggleMaps(parsed, flags, random);
    await assemble('postparse.s');
    parsed.scalingLevels = 48;
    parsed.uniqueItemTableAddress = asm.expand('KeyItemData');
    if (flags.shuffleShops())
        shuffleShops(parsed, flags, random);
    shuffleGoa(parsed, random);
    randomizeWalls(parsed, flags, random);
    crumblingPlatforms(parsed, random);
    if (flags.randomizeWildWarp())
        shuffleWildWarp(parsed, flags, random);
    if (flags.randomizeThunderTeleport())
        randomizeThunderWarp(parsed, random);
    rescaleMonsters(parsed, flags, random);
    unidentifiedItems(parsed, flags, random);
    shuffleTrades(parsed, flags, random);
    if (flags.randomizeMaps())
        shuffleMazes(parsed, flags, random);
    const w = World.build(parsed, flags);
    const fill = await new AssumedFill(parsed, flags).shuffle(w.graph, random, progress);
    if (fill) {
        w.traverse(w.graph, fill);
        slots.update(parsed, fill.slots);
    }
    else {
        return [rom, -1];
    }
    if (touchShops) {
        rescaleShops(parsed, asm, flags.bargainHunting() ? random : undefined);
    }
    if (flags.shuffleMonsters())
        shuffleMonsters(parsed, flags, random);
    identifyKeyItemsForDifficultyBuffs(parsed);
    if (flags.doubleBuffMedicalHerb()) {
        rom[0x1c50c + 0x10] *= 2;
        rom[0x1c4ea + 0x10] *= 3;
    }
    else if (flags.buffMedicalHerb()) {
        rom[0x1c50c + 0x10] += 16;
        rom[0x1c4ea + 0x10] *= 2;
    }
    if (flags.storyMode())
        storyMode(parsed);
    shuffleMusic(parsed, flags, random);
    shufflePalettes(parsed, flags, random);
    if (flags.blackoutMode())
        blackoutMode(parsed);
    misc(parsed, flags, random);
    fixDialog(parsed);
    if (flags.buffDyna())
        buffDyna(parsed, flags);
    if (flags.trainer()) {
        parsed.wildWarp.locations = [
            0x0a,
            0x1a,
            0x35,
            0x48,
            0x6d,
            0x6e,
            0x8c,
            0xaa,
            0xac,
            0xb0,
            0xb6,
            0x9f,
            0xa6,
            0x58,
            0x5c,
            0x00,
        ];
    }
    await parsed.writeData();
    buffDyna(parsed, flags);
    const crc = await postParsedShuffle(rom, random, seed, flags, asm, assemble);
    if (EXPAND_PRG) {
        const prg = rom.subarray(0x10);
        prg.subarray(0x7c000, 0x80000).set(prg.subarray(0x3c000, 0x40000));
    }
    return [rom, crc];
}
async function postParsedShuffle(rom, random, seed, flags, asm, assemble) {
    await assemble('postshuffle.s');
    updateDifficultyScalingTables(rom, flags, asm);
    updateCoinDrops(rom, flags);
    shuffleRandomNumbers(rom, random);
    return stampVersionSeedAndHash(rom, seed, flags);
}
;
function misc(rom, flags, random) {
    const {} = { rom, flags, random };
    rom.messages.parts[2][2].text = `
{01:Akahana} is handed a statue.#
Thanks for finding that.
I was totally gonna sell
it for tons of cash.#
Here, have this lame
[29:Gas Mask] or something.`;
    rom.messages.parts[0][0xe].text = `It's dangerous to go alone! Take this.`;
    rom.messages.parts[0][0xe].fixText();
}
;
function shuffleShops(rom, _flags, random) {
    const shops = {
        [ShopType.ARMOR]: { contents: [], shops: [] },
        [ShopType.TOOL]: { contents: [], shops: [] },
    };
    for (const shop of rom.shops) {
        if (!shop.used || shop.location === 0xff)
            continue;
        const data = shops[shop.type];
        if (data) {
            data.contents.push(...shop.contents.filter(x => x !== 0xff));
            data.shops.push(shop);
            shop.contents = [];
        }
    }
    for (const data of Object.values(shops)) {
        let slots = null;
        const items = [...data.contents];
        random.shuffle(items);
        while (items.length) {
            if (!slots || !slots.length) {
                if (slots)
                    items.shift();
                slots = [...data.shops, ...data.shops, ...data.shops, ...data.shops];
                random.shuffle(slots);
            }
            const item = items[0];
            const shop = slots[0];
            if (shop.contents.length < 4 && !shop.contents.includes(item)) {
                shop.contents.push(item);
                items.shift();
            }
            slots.shift();
        }
    }
    for (const data of Object.values(shops)) {
        for (const shop of data.shops) {
            while (shop.contents.length < 4)
                shop.contents.push(0xff);
            shop.contents.sort((a, b) => a - b);
        }
    }
}
function randomizeWalls(rom, flags, random) {
    if (!flags.randomizeWalls())
        return;
    const pals = [
        [0x05, 0x38],
        [0x11],
        [0x6a],
        [0x14],
    ];
    function wallType(spawn) {
        if (spawn.data[2] & 0x20) {
            return (spawn.id >>> 4) & 3;
        }
        return spawn.id & 3;
    }
    const partition = new DefaultMap(() => []);
    for (const location of rom.locations) {
        partition.get(location.data.area).push(location);
    }
    for (const locations of partition.values()) {
        const elt = random.nextInt(4);
        const pal = random.pick(pals[elt]);
        let found = false;
        for (const location of locations) {
            for (const spawn of location.spawns) {
                if (spawn.isWall()) {
                    const type = wallType(spawn);
                    if (type === 2)
                        continue;
                    if (type === 3) {
                        const newElt = random.nextInt(4);
                        if (rom.spoiler)
                            rom.spoiler.addWall(location.name, type, newElt);
                        spawn.data[2] |= 0x20;
                        spawn.id = 0x30 | newElt;
                    }
                    else {
                        if (!found && rom.spoiler) {
                            rom.spoiler.addWall(location.name, type, elt);
                            found = true;
                        }
                        spawn.data[2] |= 0x20;
                        spawn.id = type << 4 | elt;
                        location.tilePalettes[2] = pal;
                    }
                }
            }
        }
    }
}
function shuffleMusic(rom, flags, random) {
    if (!flags.randomizeMusic())
        return;
    class BossMusic {
        constructor(addr) {
            this.addr = addr;
        }
        get bgm() { return rom.prg[this.addr]; }
        set bgm(x) { rom.prg[this.addr] = x; }
    }
    const bossAddr = [
        0x1e4b8,
        0x1e690,
        0x1e99b,
        0x1ecb1,
        0x1ee0f,
        0x1ef83,
        0x1f187,
        0x1f311,
        0x37c30,
    ];
    let neighbors = [];
    const musics = new DefaultMap(() => []);
    const all = new Set();
    for (const l of rom.locations) {
        if (l.id === 0x5f || l.id === 0 || !l.used)
            continue;
        const music = l.data.music;
        all.add(l.bgm);
        if (typeof music === 'number') {
            neighbors.push(l);
        }
        else {
            musics.get(music).push(l);
        }
    }
    for (const a of bossAddr) {
        const b = new BossMusic(a);
        musics.set(b, [b]);
        all.add(b.bgm);
    }
    const list = [...all];
    const updated = new Set();
    for (const partition of musics.values()) {
        const value = random.pick(list);
        for (const music of partition) {
            music.bgm = value;
            updated.add(music);
        }
    }
    while (neighbors.length) {
        const defer = [];
        let changed = false;
        for (const loc of neighbors) {
            const neighbor = loc.neighborForEntrance(loc.data.music);
            if (updated.has(neighbor)) {
                loc.bgm = neighbor.bgm;
                updated.add(loc);
                changed = true;
            }
            else {
                defer.push(loc);
            }
        }
        if (!changed)
            break;
        neighbors = defer;
    }
}
function shuffleWildWarp(rom, _flags, random) {
    const locations = [];
    for (const l of rom.locations) {
        if (l && l.used && l.id && !l.extended && (l.id & 0xf8) !== 0x58) {
            locations.push(l);
        }
    }
    random.shuffle(locations);
    rom.wildWarp.locations = [];
    for (const loc of [...locations.slice(0, 15).sort((a, b) => a.id - b.id)]) {
        rom.wildWarp.locations.push(loc.id);
        if (rom.spoiler)
            rom.spoiler.addWildWarp(loc.id, loc.name);
    }
    rom.wildWarp.locations.push(0);
}
function buffDyna(rom, _flags) {
    rom.objects[0xb8].collisionPlane = 1;
    rom.objects[0xb8].immobile = true;
    rom.objects[0xb9].collisionPlane = 1;
    rom.objects[0xb9].immobile = true;
    rom.objects[0x33].collisionPlane = 2;
    rom.adHocSpawns[0x28].slotRangeLower = 0x1c;
    rom.adHocSpawns[0x29].slotRangeUpper = 0x1c;
    rom.adHocSpawns[0x2a].slotRangeUpper = 0x1c;
}
function blackoutMode(rom) {
    const dg = generateDepgraph();
    for (const node of dg.nodes) {
        const type = node.type;
        if (node.nodeType === 'Location' && (type === 'cave' || type === 'fortress')) {
            rom.locations[node.id].tilePalettes.fill(0x9a);
        }
    }
}
const storyMode = (rom) => {
    const conditions = [
        ~rom.npcs[0xc2].spawnConditions.get(0x28)[0],
        ~rom.npcs[0x84].spawnConditions.get(0x6e)[0],
        ~rom.trigger(0x9a).conditions[1],
        ~rom.npcs[0xc5].spawnConditions.get(0xa9)[0],
        ~rom.npcs[0xc6].spawnConditions.get(0xac)[0],
        ~rom.npcs[0xc7].spawnConditions.get(0xb9)[0],
        ~rom.npcs[0xc8].spawnConditions.get(0xb6)[0],
        ~rom.npcs[0xcb].spawnConditions.get(0x9f)[0],
        0x200,
        0x201,
        0x202,
        0x203,
    ];
    rom.npcs[0xcb].spawnConditions.get(0xa6).push(...conditions);
};
export function stampVersionSeedAndHash(rom, seed, flags) {
    const crc = crc32(rom);
    const crcString = crc.toString(16).padStart(8, '0').toUpperCase();
    const hash = version.STATUS === 'unstable' ?
        version.HASH.substring(0, 7).padStart(7, '0').toUpperCase() + '     ' :
        version.VERSION.substring(0, 12).padEnd(12, ' ');
    const seedStr = seed.toString(16).padStart(8, '0').toUpperCase();
    const embed = (addr, text) => {
        for (let i = 0; i < text.length; i++) {
            rom[addr + 0x10 + i] = text.charCodeAt(i);
        }
    };
    const intercalate = (s1, s2) => {
        const out = [];
        for (let i = 0; i < s1.length || i < s2.length; i++) {
            out.push(s1[i] || ' ');
            out.push(s2[i] || ' ');
        }
        return out.join('');
    };
    embed(0x277cf, intercalate('  VERSION     SEED      ', `  ${hash}${seedStr}`));
    let flagString = String(flags);
    let extraFlags;
    if (flagString.length > 46) {
        if (flagString.length > 92)
            throw new Error('Flag string way too long!');
        extraFlags = flagString.substring(46, 92).padEnd(46, ' ');
        flagString = flagString.substring(0, 46);
    }
    flagString = flagString.padEnd(46, ' ');
    embed(0x277ff, intercalate(flagString.substring(0, 23), flagString.substring(23)));
    if (extraFlags) {
        embed(0x2782f, intercalate(extraFlags.substring(0, 23), extraFlags.substring(23)));
    }
    embed(0x27885, intercalate(crcString.substring(0, 4), crcString.substring(4)));
    embed(0x25716, 'RANDOMIZER');
    if (version.STATUS === 'unstable')
        embed(0x2573c, 'BETA');
    return crc;
}
;
const patchBytes = (rom, address, bytes) => {
    for (let i = 0; i < bytes.length; i++) {
        rom[address + i] = bytes[i];
    }
};
const patchWords = (rom, address, words) => {
    for (let i = 0; i < 2 * words.length; i += 2) {
        rom[address + i] = words[i >>> 1] & 0xff;
        rom[address + i + 1] = words[i >>> 1] >>> 8;
    }
};
const updateCoinDrops = (rom, flags) => {
    rom = rom.subarray(0x10);
    if (flags.disableShopGlitch()) {
        patchWords(rom, 0x34bde, [
            0, 5, 10, 15, 25, 40, 65, 105,
            170, 275, 445, 600, 700, 800, 900, 1000,
        ]);
    }
    else {
        patchWords(rom, 0x34bde, [
            0, 1, 2, 4, 8, 16, 30, 50,
            100, 200, 300, 400, 500, 600, 700, 800,
        ]);
    }
};
const updateDifficultyScalingTables = (rom, flags, asm) => {
    rom = rom.subarray(0x10);
    const diff = seq(48, x => x);
    patchBytes(rom, asm.expand('DiffAtk'), diff.map(d => Math.round(40 + d * 15 / 4)));
    patchBytes(rom, asm.expand('DiffDef'), diff.map(d => d * 4));
    const phpStart = flags.decreaseEnemyDamage() ? 16 : 48;
    const phpIncr = flags.decreaseEnemyDamage() ? 6 : 5.5;
    patchBytes(rom, asm.expand('DiffHP'), diff.map(d => Math.min(255, phpStart + Math.round(d * phpIncr))));
    const expFactor = flags.expScalingFactor();
    patchBytes(rom, asm.expand('DiffExp'), diff.map(d => {
        const exp = Math.floor(4 * (2 ** ((16 + 9 * d) / 32)) * expFactor);
        return exp < 0x80 ? exp : Math.min(0xff, 0x80 + (exp >> 4));
    }));
    patchBytes(rom, 0x34bc0, [
        0, 2, 6, 10, 14, 18, 32, 24, 20,
        0, 2, 6, 10, 14, 18, 16, 32, 20,
    ]);
};
const rescaleShops = (rom, asm, random) => {
    rom.shopCount = 11;
    rom.shopDataTablesAddress = asm.expand('ShopData');
    writeLittleEndian(rom.prg, asm.expand('InnBasePrice'), 20);
    for (const shop of rom.shops) {
        if (shop.type === ShopType.PAWN)
            continue;
        for (let i = 0, len = shop.prices.length; i < len; i++) {
            if (shop.contents[i] < 0x80) {
                shop.prices[i] = random ? random.nextNormal(1, 0.3, 0.5, 1.5) : 1;
            }
            else if (shop.type !== ShopType.INN) {
                shop.prices[i] = 0;
            }
            else {
                shop.prices[i] = random ? random.nextNormal(1, 0.5, 0.375, 1.625) : 1;
            }
        }
    }
    const diff = seq(48, x => x);
    patchBytes(rom.prg, asm.expand('ToolShopScaling'), diff.map(d => Math.round(8 * (2 ** (d / 10)))));
    patchBytes(rom.prg, asm.expand('ArmorShopScaling'), diff.map(d => Math.round(8 * (2 ** ((47 - d) / 12)))));
    for (let i = 0x0d; i < 0x27; i++) {
        rom.items[i].basePrice = BASE_PRICES[i];
    }
};
const BASE_PRICES = {
    0x0d: 4,
    0x0e: 16,
    0x0f: 50,
    0x10: 325,
    0x11: 1000,
    0x12: 2000,
    0x13: 4000,
    0x15: 6,
    0x16: 20,
    0x17: 75,
    0x18: 250,
    0x19: 1000,
    0x1a: 4800,
    0x1d: 25,
    0x1e: 30,
    0x1f: 45,
    0x20: 40,
    0x21: 36,
    0x22: 200,
    0x23: 150,
    0x24: 65,
    0x26: 300,
};
function rescaleMonsters(rom, flags, random) {
    const unscaledMonsters = new Set(seq(0x100, x => x).filter(s => s in rom.objects));
    for (const [id] of SCALED_MONSTERS) {
        unscaledMonsters.delete(id);
    }
    for (const [id, monster] of SCALED_MONSTERS) {
        for (const other of unscaledMonsters) {
            if (rom.objects[id].base === rom.objects[other].base) {
                SCALED_MONSTERS.set(other, monster);
                unscaledMonsters.delete(id);
            }
        }
    }
    for (const obj of [0xc8, 0xf9, 0xfa]) {
        rom.objects[obj].attackType = obj > 0xf0 ? 0xfe : 0xff;
        rom.objects[obj].statusEffect = 0;
    }
    rom.objects[0x7d].elements |= 0x08;
    const BOSSES = new Set([0x57, 0x5e, 0x68, 0x7d, 0x88, 0x97, 0x9b, 0x9e]);
    const SLIMES = new Set([0x50, 0x53, 0x5f, 0x69]);
    for (const [id, { sdef, swrd, hits, satk, dgld, sexp }] of SCALED_MONSTERS) {
        const o = rom.objects[id].data;
        const boss = BOSSES.has(id) ? 1 : 0;
        o[2] |= 0x80;
        o[6] = hits;
        o[7] = satk;
        o[8] = sdef | swrd << 4;
        o[16] = o[16] & 0x0f | dgld << 4;
        o[17] = sexp;
        if (boss ? flags.shuffleBossElements() : flags.shuffleMonsterElements()) {
            if (!SLIMES.has(id)) {
                const bits = [...rom.objects[id].elements.toString(2).padStart(4, '0')];
                random.shuffle(bits);
                rom.objects[id].elements = Number.parseInt(bits.join(''), 2);
            }
        }
    }
    if (flags.shuffleMonsterElements()) {
        const e = random.nextInt(4);
        rom.prg[0x3522d] = e + 1;
        for (const id of SLIMES) {
            rom.objects[id].elements = 1 << e;
        }
    }
}
;
const shuffleMonsters = (rom, flags, random) => {
    const graphics = new Graphics(rom);
    if (flags.shuffleSpritePalettes())
        graphics.shufflePalettes(random);
    const pool = new MonsterPool(flags, {});
    for (const loc of rom.locations) {
        if (loc.used)
            pool.populate(loc);
    }
    pool.shuffle(random, graphics);
};
const identifyKeyItemsForDifficultyBuffs = (rom) => {
    for (let i = 0; i < 0x49; i++) {
        const unique = (rom.prg[0x20ff0 + i] & 0x40) || i === 0x31;
        const bit = 1 << (i & 7);
        const addr = 0x1e110 + (i >>> 3);
        rom.prg[addr] = rom.prg[addr] & ~bit | (unique ? bit : 0);
    }
};
const SCALED_MONSTERS = new Map([
    [0x3f, 'p', 'Sorceror shot', , , , 19, , ,],
    [0x4b, 'm', 'wraith??', 2, , 2, 22, 4, 61],
    [0x4f, 'm', 'wraith', 1, , 2, 20, 4, 61],
    [0x50, 'm', 'Blue Slime', , , 1, 16, 2, 32],
    [0x51, 'm', 'Weretiger', , , 1, 21, 4, 40],
    [0x52, 'm', 'Green Jelly', 4, , 3, 16, 4, 36],
    [0x53, 'm', 'Red Slime', 6, , 4, 16, 4, 48],
    [0x54, 'm', 'Rock Golem', 6, , 11, 24, 6, 85],
    [0x55, 'm', 'Blue Bat', , , , 4, , 32],
    [0x56, 'm', 'Green Wyvern', 4, , 4, 24, 6, 52],
    [0x57, 'b', 'Vampire', 3, , 12, 18, , 110],
    [0x58, 'm', 'Orc', 3, , 4, 21, 4, 57],
    [0x59, 'm', 'Red Flying Swamp Insect', 3, , 1, 21, 4, 57],
    [0x5a, 'm', 'Blue Mushroom', 2, , 1, 21, 4, 44],
    [0x5b, 'm', 'Swamp Tomato', 3, , 2, 35, 4, 52],
    [0x5c, 'm', 'Flying Meadow Insect', 3, , 3, 23, 4, 81],
    [0x5d, 'm', 'Swamp Plant', , , , , , 36],
    [0x5e, 'b', 'Insect', , 1, 8, 6, , 100],
    [0x5f, 'm', 'Large Blue Slime', 5, , 3, 20, 4, 52],
    [0x60, 'm', 'Ice Zombie', 5, , 7, 14, 4, 57],
    [0x61, 'm', 'Green Living Rock', , , 1, 9, 4, 28],
    [0x62, 'm', 'Green Spider', 4, , 4, 22, 4, 44],
    [0x63, 'm', 'Red/Purple Wyvern', 3, , 4, 30, 4, 65],
    [0x64, 'm', 'Draygonia Soldier', 6, , 11, 36, 4, 89],
    [0x65, 'm', 'Ice Entity', 3, , 2, 24, 4, 52],
    [0x66, 'm', 'Red Living Rock', , , 1, 13, 4, 40],
    [0x67, 'm', 'Ice Golem', 7, 2, 11, 28, 4, 81],
    [0x68, 'b', 'Kelbesque', 4, 6, 12, 29, , 120],
    [0x69, 'm', 'Giant Red Slime', 7, , 40, 90, 4, 102],
    [0x6a, 'm', 'Troll', 2, , 3, 24, 4, 65],
    [0x6b, 'm', 'Red Jelly', 2, , 2, 14, 4, 44],
    [0x6c, 'm', 'Medusa', 3, , 4, 36, 8, 77],
    [0x6d, 'm', 'Red Crab', 2, , 1, 21, 4, 44],
    [0x6e, 'm', 'Medusa Head', , , 1, 29, 4, 36],
    [0x6f, 'm', 'Evil Bird', , , 2, 30, 6, 65],
    [0x71, 'm', 'Red/Purple Mushroom', 3, , 5, 19, 6, 69],
    [0x72, 'm', 'Violet Earth Entity', 3, , 3, 18, 6, 61],
    [0x73, 'm', 'Mimic', , , 3, 26, 15, 73],
    [0x74, 'm', 'Red Spider', 3, , 4, 22, 6, 48],
    [0x75, 'm', 'Fishman', 4, , 6, 19, 5, 61],
    [0x76, 'm', 'Jellyfish', , , 3, 14, 3, 48],
    [0x77, 'm', 'Kraken', 5, , 11, 25, 7, 73],
    [0x78, 'm', 'Dark Green Wyvern', 4, , 5, 21, 5, 61],
    [0x79, 'm', 'Sand Monster', 5, , 8, 6, 4, 57],
    [0x7b, 'm', 'Wraith Shadow 1', , , , 9, 7, 44],
    [0x7c, 'm', 'Killer Moth', , , 2, 35, , 77],
    [0x7d, 'b', 'Sabera', 3, 7, 13, 24, , 110],
    [0x80, 'm', 'Draygonia Archer', 1, , 3, 20, 6, 61],
    [0x81, 'm', 'Evil Bomber Bird', , , 1, 19, 4, 65],
    [0x82, 'm', 'Lavaman/blob', 3, , 3, 24, 6, 85],
    [0x84, 'm', 'Lizardman (w/ flail(', 2, , 3, 30, 6, 81],
    [0x85, 'm', 'Giant Eye', 3, , 5, 33, 4, 81],
    [0x86, 'm', 'Salamander', 2, , 4, 29, 8, 77],
    [0x87, 'm', 'Sorceror', 2, , 5, 31, 6, 65],
    [0x88, 'b', 'Mado', 4, 8, 10, 30, , 110],
    [0x89, 'm', 'Draygonia Knight', 2, , 3, 24, 4, 77],
    [0x8a, 'm', 'Devil', , , 1, 18, 4, 52],
    [0x8b, 'b', 'Kelbesque 2', 4, 6, 11, 27, , 110],
    [0x8c, 'm', 'Wraith Shadow 2', , , , 17, 4, 48],
    [0x90, 'b', 'Sabera 2', 5, 7, 21, 27, , 120],
    [0x91, 'm', 'Tarantula', 3, , 3, 21, 6, 73],
    [0x92, 'm', 'Skeleton', , , 4, 30, 6, 69],
    [0x93, 'b', 'Mado 2', 4, 8, 11, 25, , 120],
    [0x94, 'm', 'Purple Giant Eye', 4, , 10, 23, 6, 102],
    [0x95, 'm', 'Black Knight (w/ flail)', 3, , 7, 26, 6, 89],
    [0x96, 'm', 'Scorpion', 3, , 5, 29, 2, 73],
    [0x97, 'b', 'Karmine', 4, , 14, 26, , 110],
    [0x98, 'm', 'Sandman/blob', 3, , 5, 36, 6, 98],
    [0x99, 'm', 'Mummy', 5, , 19, 36, 6, 110],
    [0x9a, 'm', 'Tomb Guardian', 7, , 60, 37, 6, 106],
    [0x9b, 'b', 'Draygon', 5, 6, 16, 41, , 110],
    [0x9e, 'b', 'Draygon 2', 7, 6, 28, 40, , ,],
    [0xa0, 'm', 'Ground Sentry (1)', 4, , 6, 26, 7, 73],
    [0xa1, 'm', 'Tower Defense Mech (2)', 5, , 8, 36, 8, 85],
    [0xa2, 'm', 'Tower Sentinel', , , 1, , 5, 32],
    [0xa3, 'm', 'Air Sentry', 3, , 2, 26, 6, 65],
    [0xa5, 'b', 'Vampire 2', 3, , 12, 27, , 100],
    [0xa4, 'b', 'Dyna', 6, 5, 32, , , ,],
    [0xb4, 'b', 'dyna pod', 6, 5, 48, 26, , ,],
    [0xb8, 'p', 'dyna counter', 15, , , 42, , ,],
    [0xb9, 'p', 'dyna laser', 15, , , 42, , ,],
    [0xba, 'p', 'dyna bubble', , , , 36, , ,],
    [0xbc, 'm', 'vamp2 bat', , , , 16, , 15],
    [0xbf, 'p', 'draygon2 fireball', , , , 26, , ,],
    [0xc1, 'm', 'vamp1 bat', , , , 16, , 15],
    [0xc3, 'p', 'giant insect spit', , , , 35, , ,],
    [0xc4, 'm', 'summoned insect', 4, , 2, 42, , 98],
    [0xc5, 'p', 'kelby1 rock', , , , 22, , ,],
    [0xc6, 'p', 'sabera1 balls', , , , 19, , ,],
    [0xc7, 'p', 'kelby2 fireballs', , , , 11, , ,],
    [0xc8, 'p', 'sabera2 fire', , , 1, 6, , ,],
    [0xc9, 'p', 'sabera2 balls', , , , 17, , ,],
    [0xca, 'p', 'karmine balls', , , , 25, , ,],
    [0xcb, 'p', 'sun/moon statue fireballs', , , , 39, , ,],
    [0xcc, 'p', 'draygon1 lightning', , , , 37, , ,],
    [0xcd, 'p', 'draygon2 laser', , , , 36, , ,],
    [0xce, 'p', 'draygon2 breath', , , , 36, , ,],
    [0xe0, 'p', 'evil bomber bird bomb', , , , 2, , ,],
    [0xe2, 'p', 'summoned insect bomb', , , , 47, , ,],
    [0xe3, 'p', 'paralysis beam', , , , 23, , ,],
    [0xe4, 'p', 'stone gaze', , , , 33, , ,],
    [0xe5, 'p', 'rock golem rock', , , , 24, , ,],
    [0xe6, 'p', 'curse beam', , , , 10, , ,],
    [0xe7, 'p', 'mp drain web', , , , 11, , ,],
    [0xe8, 'p', 'fishman trident', , , , 15, , ,],
    [0xe9, 'p', 'orc axe', , , , 24, , ,],
    [0xea, 'p', 'Swamp Pollen', , , , 37, , ,],
    [0xeb, 'p', 'paralysis powder', , , , 17, , ,],
    [0xec, 'p', 'draygonia solider sword', , , , 28, , ,],
    [0xed, 'p', 'ice golem rock', , , , 20, , ,],
    [0xee, 'p', 'troll axe', , , , 27, , ,],
    [0xef, 'p', 'kraken ink', , , , 24, , ,],
    [0xf0, 'p', 'draygonia archer arrow', , , , 12, , ,],
    [0xf1, 'p', '??? unused', , , , 16, , ,],
    [0xf2, 'p', 'draygonia knight sword', , , , 9, , ,],
    [0xf3, 'p', 'moth residue', , , , 19, , ,],
    [0xf4, 'p', 'ground sentry laser', , , , 13, , ,],
    [0xf5, 'p', 'tower defense mech laser', , , , 23, , ,],
    [0xf6, 'p', 'tower sentinel laser', , , , 8, , ,],
    [0xf7, 'p', 'skeleton shot', , , , 11, , ,],
    [0xf8, 'p', 'lavaman shot', , , , 14, , ,],
    [0xf9, 'p', 'black knight flail', , , , 18, , ,],
    [0xfa, 'p', 'lizardman flail', , , , 21, , ,],
    [0xfc, 'p', 'mado shuriken', , , , 36, , ,],
    [0xfd, 'p', 'guardian statue missile', , , , 23, , ,],
    [0xfe, 'p', 'demon wall fire', , , , 23, , ,],
].map(([id, type, name, sdef = 0, swrd = 0, hits = 0, satk = 0, dgld = 0, sexp = 0]) => [id, { id, type, name, sdef, swrd, hits, satk, dgld, sexp }]));
class MonsterPool {
    constructor(flags, report) {
        this.flags = flags;
        this.report = report;
        this.monsters = [];
        this.used = [];
        this.locations = [];
    }
    populate(location) {
        const { maxFlyers = 0, nonFlyers = {}, skip = false, tower = false, fixedSlots = {}, ...unexpected } = MONSTER_ADJUSTMENTS[location.id] || {};
        for (const u of Object.keys(unexpected)) {
            throw new Error(`Unexpected property '${u}' in MONSTER_ADJUSTMENTS[${location.id}]`);
        }
        const skipMonsters = (skip === true ||
            (!this.flags.shuffleTowerMonsters() && tower) ||
            !location.spritePatterns ||
            !location.spritePalettes);
        const monsters = [];
        let slots = [];
        let slot = 0x0c;
        for (const spawn of skipMonsters ? [] : location.spawns) {
            ++slot;
            if (!spawn.used || !spawn.isMonster())
                continue;
            const id = spawn.monsterId;
            if (id in UNTOUCHED_MONSTERS || !SCALED_MONSTERS.has(id) ||
                SCALED_MONSTERS.get(id).type !== 'm')
                continue;
            const object = location.rom.objects[id];
            if (!object)
                continue;
            const patBank = spawn.patternBank;
            const pat = location.spritePatterns[patBank];
            const pal = object.palettes(true);
            const pal2 = pal.includes(2) ? location.spritePalettes[0] : undefined;
            const pal3 = pal.includes(3) ? location.spritePalettes[1] : undefined;
            monsters.push({ id, pat, pal2, pal3, patBank });
            (this.report[`start-${id.toString(16)}`] = this.report[`start-${id.toString(16)}`] || [])
                .push('$' + location.id.toString(16));
            slots.push(slot);
        }
        if (!monsters.length || skip)
            slots = [];
        this.locations.push({ location, slots });
        if (this.flags.shuffleTowerMonsters() === tower) {
            this.monsters.push(...monsters);
        }
    }
    shuffle(random, graphics) {
        this.report['pre-shuffle locations'] = this.locations.map(l => l.location.id);
        this.report['pre-shuffle monsters'] = this.monsters.map(m => m.id);
        random.shuffle(this.locations);
        random.shuffle(this.monsters);
        this.report['post-shuffle locations'] = this.locations.map(l => l.location.id);
        this.report['post-shuffle monsters'] = this.monsters.map(m => m.id);
        while (this.locations.length) {
            const { location, slots } = this.locations.pop();
            const report = this.report['$' + location.id.toString(16).padStart(2, '0')] = [];
            const { maxFlyers = 0, nonFlyers = {}, tower = false } = MONSTER_ADJUSTMENTS[location.id] || {};
            if (tower)
                continue;
            let flyers = maxFlyers;
            let constraint = Constraint.forLocation(location.id);
            if (location.bossId() != null) {
            }
            for (const spawn of location.spawns) {
                if (spawn.isChest() && !spawn.isInvisible()) {
                    if (spawn.id < 0x70) {
                        constraint = constraint.meet(Constraint.TREASURE_CHEST, true);
                    }
                    else {
                        constraint = constraint.meet(Constraint.MIMIC, true);
                    }
                }
                else if (spawn.isNpc() || spawn.isBoss()) {
                    const c = graphics.getNpcConstraint(location.id, spawn.id);
                    constraint = constraint.meet(c, true);
                    if (spawn.isNpc() && (spawn.id === 0x6b || spawn.id === 0x68)) {
                        constraint = constraint.meet(Constraint.KENSU_CHEST, true);
                    }
                }
                else if (spawn.isMonster() && UNTOUCHED_MONSTERS[spawn.monsterId]) {
                    const c = graphics.getMonsterConstraint(location.id, spawn.monsterId);
                    constraint = constraint.meet(c, true);
                }
                else if (spawn.isShootingWall(location)) {
                    constraint = constraint.meet(Constraint.SHOOTING_WALL, true);
                }
            }
            report.push(`Initial pass: ${constraint.fixed.map(s => s.size < Infinity ? '[' + [...s].join(', ') + ']' : 'all')}`);
            const classes = new Map();
            const tryAddMonster = (m) => {
                const monster = location.rom.objects[m.id];
                if (monster.monsterClass) {
                    const representative = classes.get(monster.monsterClass);
                    if (representative != null && representative !== m.id)
                        return false;
                }
                const flyer = FLYERS.has(m.id);
                const moth = MOTHS_AND_BATS.has(m.id);
                if (flyer) {
                    if (!flyers)
                        return false;
                    --flyers;
                }
                const c = graphics.getMonsterConstraint(location.id, m.id);
                let meet = constraint.tryMeet(c);
                if (!meet && constraint.pal2.size < Infinity && constraint.pal3.size < Infinity) {
                    if (this.flags.shuffleSpritePalettes()) {
                        meet = constraint.tryMeet(c, true);
                    }
                }
                if (!meet)
                    return false;
                let pos;
                if (monsterPlacer) {
                    const monster = location.rom.objects[m.id];
                    if (!(monster instanceof Monster)) {
                        throw new Error(`non-monster: ${monster}`);
                    }
                    pos = monsterPlacer(monster);
                    if (pos == null)
                        return false;
                }
                report.push(`  Adding ${m.id.toString(16)}: ${meet}`);
                constraint = meet;
                if (monster.monsterClass)
                    classes.set(monster.monsterClass, m.id);
                let eligible = 0;
                if (flyer || moth) {
                    for (let i = 0; i < slots.length; i++) {
                        if (slots[i] in nonFlyers) {
                            eligible = i;
                            break;
                        }
                    }
                }
                else {
                    for (let i = 0; i < slots.length; i++) {
                        if (slots[i] in nonFlyers)
                            continue;
                        eligible = i;
                        break;
                    }
                }
                (this.report[`mon-${m.id.toString(16)}`] = this.report[`mon-${m.id.toString(16)}`] || [])
                    .push('$' + location.id.toString(16));
                const slot = slots[eligible];
                const spawn = location.spawns[slot - 0x0d];
                if (monsterPlacer) {
                    spawn.screen = pos >>> 8;
                    spawn.tile = pos & 0xff;
                }
                else if (slot in nonFlyers) {
                    spawn.y += nonFlyers[slot][0] * 16;
                    spawn.x += nonFlyers[slot][1] * 16;
                }
                spawn.monsterId = m.id;
                report.push(`    slot ${slot.toString(16)}: ${spawn}`);
                slots.splice(eligible, 1);
                return true;
            };
            const monsterPlacer = slots.length && this.flags.randomizeMaps() ?
                location.monsterPlacer(random) : null;
            if (flyers && slots.length) {
                for (let i = 0; i < Math.min(40, this.monsters.length); i++) {
                    if (FLYERS.has(this.monsters[i].id)) {
                        if (tryAddMonster(this.monsters[i])) {
                            this.monsters.splice(i, 1);
                        }
                    }
                }
            }
            for (let i = 0; i < this.monsters.length; i++) {
                if (!slots.length)
                    break;
                if (tryAddMonster(this.monsters[i])) {
                    const [used] = this.monsters.splice(i, 1);
                    if (!FLYERS.has(used.id))
                        this.used.push(used);
                    i--;
                }
            }
            for (let i = 0; i < this.used.length; i++) {
                if (!slots.length)
                    break;
                if (tryAddMonster(this.used[i])) {
                    this.used.push(...this.used.splice(i, 1));
                    i--;
                }
            }
            constraint.fix(location, random);
            if (slots.length) {
                console.error(`Failed to fill location ${location.id.toString(16)}: ${slots.length} remaining`);
                for (const slot of slots) {
                    const spawn = location.spawns[slot - 0x0d];
                    spawn.x = spawn.y = 0;
                    spawn.id = 0xb0;
                    spawn.data[0] = 0xfe;
                }
            }
            for (const spawn of location.spawns) {
                graphics.configure(location, spawn);
            }
        }
    }
}
const FLYERS = new Set([0x59, 0x5c, 0x6e, 0x6f, 0x81, 0x8a, 0xa3, 0xc4]);
const MOTHS_AND_BATS = new Set([0x55, 0x5d, 0x7c, 0xbc, 0xc1]);
const MONSTER_ADJUSTMENTS = {
    [0x03]: {
        fixedSlots: {
            pat1: 0x60,
        },
        maxFlyers: 2,
    },
    [0x07]: {
        nonFlyers: {
            [0x0f]: [0, -3],
            [0x10]: [-10, 0],
            [0x11]: [0, 4],
        },
    },
    [0x14]: {
        maxFlyers: 2,
    },
    [0x15]: {
        maxFlyers: 2,
    },
    [0x1a]: {
        fixedSlots: {
            pal3: 0x23,
            pat1: 0x4f,
        },
        maxFlyers: 2,
        nonFlyers: {
            [0x10]: [4, 0],
            [0x11]: [5, 0],
            [0x12]: [4, 0],
            [0x13]: [5, 0],
            [0x14]: [4, 0],
            [0x15]: [4, 0],
        },
    },
    [0x1b]: {
        skip: true,
    },
    [0x20]: {
        maxFlyers: 1,
    },
    [0x21]: {
        fixedSlots: {
            pat1: 0x50,
        },
        maxFlyers: 1,
    },
    [0x27]: {
        nonFlyers: {
            [0x0d]: [0, 0x10],
        },
    },
    [0x28]: {
        maxFlyers: 1,
    },
    [0x29]: {
        maxFlyers: 1,
    },
    [0x2b]: {
        nonFlyers: {
            [0x14]: [0x20, -8],
        },
    },
    [0x40]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x13]: [12, -0x10],
        },
    },
    [0x41]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x15]: [0, -6],
        },
    },
    [0x42]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x0d]: [0, 8],
            [0x0e]: [-8, 8],
        },
    },
    [0x47]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x0d]: [-8, -8],
        },
    },
    [0x4a]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x0e]: [4, 0],
            [0x0f]: [0, -3],
            [0x10]: [0, 4],
        },
    },
    [0x4c]: {},
    [0x4d]: {
        maxFlyers: 1,
    },
    [0x4e]: {
        maxFlyers: 1,
    },
    [0x4f]: {},
    [0x57]: {
        fixedSlots: {
            pat1: 0x4d,
        },
    },
    [0x59]: {
        tower: true,
    },
    [0x5a]: {
        tower: true,
    },
    [0x5b]: {
        tower: true,
    },
    [0x60]: {
        fixedSlots: {
            pal3: 0x08,
            pat1: 0x52,
        },
        maxFlyers: 2,
        skip: true,
    },
    [0x64]: {
        fixedSlots: {
            pal3: 0x08,
            pat1: 0x52,
        },
        skip: true,
    },
    [0x68]: {
        fixedSlots: {
            pal3: 0x08,
            pat1: 0x52,
        },
        skip: true,
    },
    [0x69]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x17]: [4, 6],
        },
    },
    [0x6a]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x15]: [0, 0x18],
        },
    },
    [0x6c]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x17]: [0, 0x18],
        },
    },
    [0x6d]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x11]: [0x10, 0],
            [0x1b]: [0, 0],
            [0x1c]: [6, 0],
        },
    },
    [0x78]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x16]: [-8, -8],
        },
    },
    [0x7c]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x15]: [-0x27, 0x54],
        },
    },
    [0x84]: {
        nonFlyers: {
            [0x12]: [0, -4],
            [0x13]: [0, 4],
            [0x14]: [-6, 0],
            [0x15]: [14, 12],
        },
    },
    [0x88]: {
        maxFlyers: 1,
    },
    [0x89]: {
        maxFlyers: 1,
    },
    [0x8a]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x0d]: [7, 0],
            [0x0e]: [0, 0],
            [0x0f]: [7, 3],
            [0x10]: [0, 6],
            [0x11]: [11, -0x10],
        },
    },
    [0x8f]: {
        skip: true,
    },
    [0x90]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x14]: [-0xb, -3],
            [0x15]: [0, 0x10],
        },
    },
    [0x91]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x18]: [0, 14],
            [0x19]: [4, -0x10],
        },
    },
    [0x98]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x14]: [-6, 6],
            [0x15]: [0, -0x10],
        },
    },
    [0x9e]: {
        maxFlyers: 2,
    },
    [0xa2]: {
        maxFlyers: 1,
        nonFlyers: {
            [0x12]: [0, 11],
            [0x13]: [6, 0],
        },
    },
    [0xa5]: {
        nonFlyers: {
            [0x17]: [6, 6],
            [0x18]: [-6, 0],
            [0x19]: [-1, -7],
        },
    },
    [0xa6]: {
        skip: true,
    },
    [0xa8]: {
        skip: true,
    },
    [0xa9]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x16]: [0x1a, -0x10],
            [0x17]: [0, 0x20],
        },
    },
    [0xab]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x0d]: [1, 0],
            [0x0e]: [2, -2],
        },
    },
    [0xad]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x18]: [0, 8],
            [0x19]: [0, -8],
        },
    },
    [0xaf]: {
        nonFlyers: {
            [0x0d]: [0, 0],
            [0x0e]: [0, 0],
            [0x13]: [0x3b, -0x26],
        },
    },
    [0xb4]: {
        maxFlyers: 2,
        nonFlyers: {
            [0x11]: [6, 0],
            [0x12]: [0, 6],
        },
    },
    [0xd7]: {
        skip: true,
    },
};
const UNTOUCHED_MONSTERS = {
    [0x7e]: true,
    [0x7f]: true,
    [0x83]: true,
    [0x8d]: true,
    [0x8e]: true,
    [0x8f]: true,
    [0x9f]: true,
    [0xa6]: true,
};
const shuffleRandomNumbers = (rom, random) => {
    const table = rom.subarray(0x357e4 + 0x10, 0x35824 + 0x10);
    random.shuffle(table);
};
const [] = [hex];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwQyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2pDLE9BQU8sRUFDQyxRQUFRLElBQUksZ0JBQWdCLEVBQ0MsTUFBTSxlQUFlLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDckMsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsYUFBYSxFQUFFLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0UsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQzlDLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQUNoRCxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDcEQsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQzFELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDaEQsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDOUQsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGFBQWEsQ0FBQztB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QUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDZjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUVOLElBQUksRUFBRSxJQUFJO0tBQ1g7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUVYO1FBQ0QsU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztTQUNsQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ25CO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO1NBQ3BCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2hCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNqQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDZjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUVQO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUUsRUFFUDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNYO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRU4sS0FBSyxFQUFFLElBQUk7S0FDWjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixLQUFLLEVBQUUsSUFBSTtLQUNaO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUVOLEtBQUssRUFBRSxJQUFJO0tBQ1o7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNYO1FBQ0QsU0FBUyxFQUFFLENBQUM7UUFDWixJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7U0FDWDtRQUNELElBQUksRUFBRSxJQUFJO0tBQ1g7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNYO1FBQ0QsSUFBSSxFQUFFLElBQUk7S0FDWDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1NBQ2xCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztTQUNsQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDakIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNmO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDakI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7U0FDdEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDakI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFD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T0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQztBQUdGLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Fzc2VtYmxlcn0gZnJvbSAnLi82NTAyLmpzJztcbmltcG9ydCB7Y3JjMzJ9IGZyb20gJy4vY3JjMzIuanMnO1xuaW1wb3J0IHtQcm9ncmVzc1RyYWNrZXIsXG4gICAgICAgIGdlbmVyYXRlIGFzIGdlbmVyYXRlRGVwZ3JhcGgsXG4gICAgICAgIHNodWZmbGUyIGFzIF9zaHVmZmxlRGVwZ3JhcGh9IGZyb20gJy4vZGVwZ3JhcGguanMnO1xuaW1wb3J0IHtGZXRjaFJlYWRlcn0gZnJvbSAnLi9mZXRjaHJlYWRlci5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge0Fzc3VtZWRGaWxsfSBmcm9tICcuL2dyYXBoL3NodWZmbGUuanMnO1xuaW1wb3J0IHtXb3JsZH0gZnJvbSAnLi9ncmFwaC93b3JsZC5qcyc7XG5pbXBvcnQge2NydW1ibGluZ1BsYXRmb3Jtc30gZnJvbSAnLi9wYXNzL2NydW1ibGluZ3BsYXRmb3Jtcy5qcyc7XG5pbXBvcnQge2RldGVybWluaXN0aWMsIGRldGVybWluaXN0aWNQcmVQYXJzZX0gZnJvbSAnLi9wYXNzL2RldGVybWluaXN0aWMuanMnO1xuaW1wb3J0IHtmaXhEaWFsb2d9IGZyb20gJy4vcGFzcy9maXhkaWFsb2cuanMnO1xuaW1wb3J0IHtyYW5kb21pemVUaHVuZGVyV2FycH0gZnJvbSAnLi9wYXNzL3JhbmRvbWl6ZXRodW5kZXJ3YXJwLmpzJztcbmltcG9ydCB7c2h1ZmZsZUdvYX0gZnJvbSAnLi9wYXNzL3NodWZmbGVnb2EuanMnO1xuaW1wb3J0IHtzaHVmZmxlTWF6ZXN9IGZyb20gJy4vcGFzcy9zaHVmZmxlbWF6ZXMuanMnO1xuaW1wb3J0IHtzaHVmZmxlUGFsZXR0ZXN9IGZyb20gJy4vcGFzcy9zaHVmZmxlcGFsZXR0ZXMuanMnO1xuaW1wb3J0IHtzaHVmZmxlVHJhZGVzfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXRyYWRlcy5qcyc7XG5pbXBvcnQge3RvZ2dsZU1hcHN9IGZyb20gJy4vcGFzcy90b2dnbGVtYXBzLmpzJztcbmltcG9ydCB7dW5pZGVudGlmaWVkSXRlbXN9IGZyb20gJy4vcGFzcy91bmlkZW50aWZpZWRpdGVtcy5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi9yYW5kb20uanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4vcm9tLmpzJztcbmltcG9ydCB7QXJlYX0gZnJvbSAnLi9yb20vYXJlYS5qcyc7XG5pbXBvcnQge0NvbnN0cmFpbnR9IGZyb20gJy4vcm9tL2NvbnN0cmFpbnQuanMnO1xuaW1wb3J0IHtHcmFwaGljc30gZnJvbSAnLi9yb20vZ3JhcGhpY3MuanMnO1xuaW1wb3J0IHtMb2NhdGlvbiwgU3Bhd259IGZyb20gJy4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9yb20vbW9uc3Rlci5qcyc7XG5pbXBvcnQge1Nob3BUeXBlLCBTaG9wfSBmcm9tICcuL3JvbS9zaG9wLmpzJztcbmltcG9ydCAqIGFzIHNsb3RzIGZyb20gJy4vcm9tL3Nsb3RzLmpzJztcbmltcG9ydCB7U3BvaWxlcn0gZnJvbSAnLi9yb20vc3BvaWxlci5qcyc7XG5pbXBvcnQge2hleCwgc2VxLCB3YXRjaEFycmF5LCB3cml0ZUxpdHRsZUVuZGlhbn0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge0RlZmF1bHRNYXB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQgKiBhcyB2ZXJzaW9uIGZyb20gJy4vdmVyc2lvbi5qcyc7XG5cbmNvbnN0IEVYUEFORF9QUkc6IGJvb2xlYW4gPSB0cnVlO1xuXG4vLyBUT0RPIC0gdG8gc2h1ZmZsZSB0aGUgbW9uc3RlcnMsIHdlIG5lZWQgdG8gZmluZCB0aGUgc3ByaXRlIHBhbHR0ZXMgYW5kXG4vLyBwYXR0ZXJucyBmb3IgZWFjaCBtb25zdGVyLiAgRWFjaCBsb2NhdGlvbiBzdXBwb3J0cyB1cCB0byB0d28gbWF0Y2h1cHMsXG4vLyBzbyBjYW4gb25seSBzdXBwb3J0IG1vbnN0ZXJzIHRoYXQgbWF0Y2guICBNb3Jlb3ZlciwgZGlmZmVyZW50IG1vbnN0ZXJzXG4vLyBzZWVtIHRvIG5lZWQgdG8gYmUgaW4gZWl0aGVyIHNsb3QgMCBvciAxLlxuXG4vLyBQdWxsIGluIGFsbCB0aGUgcGF0Y2hlcyB3ZSB3YW50IHRvIGFwcGx5IGF1dG9tYXRpY2FsbHkuXG4vLyBUT0RPIC0gbWFrZSBhIGRlYnVnZ2VyIHdpbmRvdyBmb3IgcGF0Y2hlcy5cbi8vIFRPRE8gLSB0aGlzIG5lZWRzIHRvIGJlIGEgc2VwYXJhdGUgbm9uLWNvbXBpbGVkIGZpbGUuXG5leHBvcnQgZGVmYXVsdCAoe1xuICBhc3luYyBhcHBseShyb206IFVpbnQ4QXJyYXksIGhhc2g6IHtba2V5OiBzdHJpbmddOiB1bmtub3dufSwgcGF0aDogc3RyaW5nKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gICAgLy8gTG9vayBmb3IgZmxhZyBzdHJpbmcgYW5kIGhhc2hcbiAgICBsZXQgZmxhZ3M7XG4gICAgaWYgKCFoYXNoLnNlZWQpIHtcbiAgICAgIC8vIFRPRE8gLSBzZW5kIGluIGEgaGFzaCBvYmplY3Qgd2l0aCBnZXQvc2V0IG1ldGhvZHNcbiAgICAgIGhhc2guc2VlZCA9IHBhcnNlU2VlZCgnJykudG9TdHJpbmcoMTYpO1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggKz0gJyZzZWVkPScgKyBoYXNoLnNlZWQ7XG4gICAgfVxuICAgIGlmIChoYXNoLmZsYWdzKSB7XG4gICAgICBmbGFncyA9IG5ldyBGbGFnU2V0KFN0cmluZyhoYXNoLmZsYWdzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZsYWdzID0gbmV3IEZsYWdTZXQoJ0BGdWxsU2h1ZmZsZScpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBpbiBoYXNoKSB7XG4gICAgICBpZiAoaGFzaFtrZXldID09PSAnZmFsc2UnKSBoYXNoW2tleV0gPSBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgW3Jlc3VsdCxdID1cbiAgICAgICAgYXdhaXQgc2h1ZmZsZShyb20sIHBhcnNlU2VlZChTdHJpbmcoaGFzaC5zZWVkKSksXG4gICAgICAgICAgICAgICAgICAgICAgZmxhZ3MsIG5ldyBGZXRjaFJlYWRlcihwYXRoKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTZWVkKHNlZWQ6IHN0cmluZyk6IG51bWJlciB7XG4gIGlmICghc2VlZCkgcmV0dXJuIFJhbmRvbS5uZXdTZWVkKCk7XG4gIGlmICgvXlswLTlhLWZdezEsOH0kL2kudGVzdChzZWVkKSkgcmV0dXJuIE51bWJlci5wYXJzZUludChzZWVkLCAxNik7XG4gIHJldHVybiBjcmMzMihzZWVkKTtcbn1cblxuLyoqXG4gKiBBYnN0cmFjdCBvdXQgRmlsZSBJL08uICBOb2RlIGFuZCBicm93c2VyIHdpbGwgaGF2ZSBjb21wbGV0ZWx5XG4gKiBkaWZmZXJlbnQgaW1wbGVtZW50YXRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlYWRlciB7XG4gIHJlYWQoZmlsZW5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPjtcbn1cblxuLy8gcHJldmVudCB1bnVzZWQgZXJyb3JzIGFib3V0IHdhdGNoQXJyYXkgLSBpdCdzIHVzZWQgZm9yIGRlYnVnZ2luZy5cbmNvbnN0IHt9ID0ge3dhdGNoQXJyYXl9IGFzIGFueTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNodWZmbGUocm9tOiBVaW50OEFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXI6IFJlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZz86IHtzcG9pbGVyPzogU3BvaWxlcn0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcz86IFByb2dyZXNzVHJhY2tlcik6IFByb21pc2U8cmVhZG9ubHkgW1VpbnQ4QXJyYXksIG51bWJlcl0+IHtcbiAgLy9yb20gPSB3YXRjaEFycmF5KHJvbSwgMHg4NWZhICsgMHgxMCk7XG5cbiAgaWYgKEVYUEFORF9QUkcgJiYgcm9tLmxlbmd0aCA8IDB4ODAwMDApIHtcbiAgICBjb25zdCBuZXdSb20gPSBuZXcgVWludDhBcnJheShyb20ubGVuZ3RoICsgMHg0MDAwMCk7XG4gICAgbmV3Um9tLnN1YmFycmF5KDAsIDB4NDAwMTApLnNldChyb20uc3ViYXJyYXkoMCwgMHg0MDAxMCkpO1xuICAgIG5ld1JvbS5zdWJhcnJheSgweDgwMDEwKS5zZXQocm9tLnN1YmFycmF5KDB4NDAwMTApKTtcbiAgICBuZXdSb21bNF0gPDw9IDE7XG4gICAgcm9tID0gbmV3Um9tO1xuICB9XG5cbiAgLy8gRmlyc3QgcmVlbmNvZGUgdGhlIHNlZWQsIG1peGluZyBpbiB0aGUgZmxhZ3MgZm9yIHNlY3VyaXR5LlxuICBpZiAodHlwZW9mIHNlZWQgIT09ICdudW1iZXInKSB0aHJvdyBuZXcgRXJyb3IoJ0JhZCBzZWVkJyk7XG4gIGNvbnN0IG5ld1NlZWQgPSBjcmMzMihzZWVkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpICsgU3RyaW5nKGZsYWdzKSkgPj4+IDA7XG5cbiAgY29uc3QgdG91Y2hTaG9wcyA9IHRydWU7XG5cbiAgY29uc3QgZGVmaW5lczoge1tuYW1lOiBzdHJpbmddOiBib29sZWFufSA9IHtcbiAgICBfQUxMT1dfVEVMRVBPUlRfT1VUX09GX0JPU1M6IGZsYWdzLmhhcmRjb3JlTW9kZSgpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCksXG4gICAgX0FMTE9XX1RFTEVQT1JUX09VVF9PRl9UT1dFUjogdHJ1ZSxcbiAgICBfQVVUT19FUVVJUF9CUkFDRUxFVDogZmxhZ3MuYXV0b0VxdWlwQnJhY2VsZXQoKSxcbiAgICBfQkFSUklFUl9SRVFVSVJFU19DQUxNX1NFQTogZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpLFxuICAgIF9CVUZGX0RFT1NfUEVOREFOVDogZmxhZ3MuYnVmZkRlb3NQZW5kYW50KCksXG4gICAgX0JVRkZfRFlOQTogZmxhZ3MuYnVmZkR5bmEoKSwgLy8gdHJ1ZSxcbiAgICBfQ0hFQ0tfRkxBRzA6IHRydWUsXG4gICAgX0NUUkwxX1NIT1JUQ1VUUzogZmxhZ3MuY29udHJvbGxlclNob3J0Y3V0cygpLFxuICAgIF9DVVNUT01fU0hPT1RJTkdfV0FMTFM6IHRydWUsXG4gICAgX0RFQlVHX0RJQUxPRzogc2VlZCA9PT0gMHgxN2JjLFxuICAgIF9ESVNBQkxFX1NIT1BfR0xJVENIOiBmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1NUQVRVRV9HTElUQ0g6IGZsYWdzLmRpc2FibGVTdGF0dWVHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9TV09SRF9DSEFSR0VfR0xJVENIOiBmbGFncy5kaXNhYmxlU3dvcmRDaGFyZ2VHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9UUklHR0VSX1NLSVA6IHRydWUsXG4gICAgX0RJU0FCTEVfV0FSUF9CT09UU19SRVVTRTogZmxhZ3MuZGlzYWJsZVNob3BHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9XSUxEX1dBUlA6IGZhbHNlLFxuICAgIF9ESVNQTEFZX0RJRkZJQ1VMVFk6IHRydWUsXG4gICAgX0VYVFJBX1BJVFlfTVA6IHRydWUsICAvLyBUT0RPOiBhbGxvdyBkaXNhYmxpbmcgdGhpc1xuICAgIF9GSVhfQ09JTl9TUFJJVEVTOiB0cnVlLFxuICAgIF9GSVhfT1BFTF9TVEFUVUU6IHRydWUsXG4gICAgX0ZJWF9TSEFLSU5HOiB0cnVlLFxuICAgIF9GSVhfVkFNUElSRTogdHJ1ZSxcbiAgICBfSEFSRENPUkVfTU9ERTogZmxhZ3MuaGFyZGNvcmVNb2RlKCksXG4gICAgX0hBWk1BVF9TVUlUOiBmbGFncy5jaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCksXG4gICAgX0xFQVRIRVJfQk9PVFNfR0lWRV9TUEVFRDogZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCksXG4gICAgX05FUkZfRkxJR0hUOiB0cnVlLFxuICAgIF9ORVJGX01BRE86IHRydWUsXG4gICAgX05FUkZfV0lMRF9XQVJQOiBmbGFncy5uZXJmV2lsZFdhcnAoKSxcbiAgICBfTkVWRVJfRElFOiBmbGFncy5uZXZlckRpZSgpLFxuICAgIF9OT1JNQUxJWkVfU0hPUF9QUklDRVM6IHRvdWNoU2hvcHMsXG4gICAgX1BJVFlfSFBfQU5EX01QOiB0cnVlLFxuICAgIF9QUk9HUkVTU0lWRV9CUkFDRUxFVDogdHJ1ZSxcbiAgICBfUkFCQklUX0JPT1RTX0NIQVJHRV9XSElMRV9XQUxLSU5HOiBmbGFncy5yYWJiaXRCb290c0NoYXJnZVdoaWxlV2Fsa2luZygpLFxuICAgIF9SRVFVSVJFX0hFQUxFRF9ET0xQSElOX1RPX1JJREU6IGZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCksXG4gICAgX1JFVkVSU0lCTEVfU1dBTl9HQVRFOiB0cnVlLFxuICAgIF9TQUhBUkFfUkFCQklUU19SRVFVSVJFX1RFTEVQQVRIWTogZmxhZ3Muc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKSxcbiAgICBfU0lNUExJRllfSU5WSVNJQkxFX0NIRVNUUzogdHJ1ZSxcbiAgICBfU09GVF9SRVNFVF9TSE9SVENVVDogdHJ1ZSxcbiAgICBfVEVMRVBPUlRfT05fVEhVTkRFUl9TV09SRDogZmxhZ3MudGVsZXBvcnRPblRodW5kZXJTd29yZCgpLFxuICAgIF9UUkFJTkVSOiBmbGFncy50cmFpbmVyKCksXG4gICAgX1RXRUxWVEhfV0FSUF9QT0lOVDogdHJ1ZSwgLy8gem9tYmllIHRvd24gd2FycFxuICAgIF9VTklERU5USUZJRURfSVRFTVM6IGZsYWdzLnVuaWRlbnRpZmllZEl0ZW1zKCksXG4gICAgX1pFQlVfU1RVREVOVF9HSVZFU19JVEVNOiBmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpLFxuICB9O1xuXG4gIGNvbnN0IGFzbSA9IG5ldyBBc3NlbWJsZXIoKTtcbiAgYXN5bmMgZnVuY3Rpb24gYXNzZW1ibGUocGF0aDogc3RyaW5nKSB7XG4gICAgYXNtLmFzc2VtYmxlKGF3YWl0IHJlYWRlci5yZWFkKHBhdGgpLCBwYXRoKTtcbiAgICBhc20ucGF0Y2hSb20ocm9tKTtcbiAgfVxuXG4gIGRldGVybWluaXN0aWNQcmVQYXJzZShyb20uc3ViYXJyYXkoMHgxMCkpOyAvLyBUT0RPIC0gdHJhaW5lci4uLlxuXG4gIGNvbnN0IGZsYWdGaWxlID1cbiAgICAgIE9iamVjdC5rZXlzKGRlZmluZXMpXG4gICAgICAgICAgLmZpbHRlcihkID0+IGRlZmluZXNbZF0pLm1hcChkID0+IGBkZWZpbmUgJHtkfSAxXFxuYCkuam9pbignJyk7XG4gIGFzbS5hc3NlbWJsZShmbGFnRmlsZSwgJ2ZsYWdzLnMnKTtcbiAgYXdhaXQgYXNzZW1ibGUoJ3ByZXNodWZmbGUucycpO1xuXG4gIGNvbnN0IHJhbmRvbSA9IG5ldyBSYW5kb20obmV3U2VlZCk7XG4gIGNvbnN0IHBhcnNlZCA9IG5ldyBSb20ocm9tKTtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpICh3aW5kb3cgYXMgYW55KS5yb20gPSBwYXJzZWQ7XG4gIHBhcnNlZC5zcG9pbGVyID0gbmV3IFNwb2lsZXIocGFyc2VkKTtcbiAgaWYgKGxvZykgbG9nLnNwb2lsZXIgPSBwYXJzZWQuc3BvaWxlcjtcblxuICAvLyBNYWtlIGRldGVybWluaXN0aWMgY2hhbmdlcy5cbiAgZGV0ZXJtaW5pc3RpYyhwYXJzZWQsIGZsYWdzKTtcbiAgdG9nZ2xlTWFwcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuXG4gIC8vIFNldCB1cCBzaG9wIGFuZCB0ZWxlcGF0aHlcbiAgYXdhaXQgYXNzZW1ibGUoJ3Bvc3RwYXJzZS5zJyk7XG4gIHBhcnNlZC5zY2FsaW5nTGV2ZWxzID0gNDg7XG4gIHBhcnNlZC51bmlxdWVJdGVtVGFibGVBZGRyZXNzID0gYXNtLmV4cGFuZCgnS2V5SXRlbURhdGEnKTtcblxuICBpZiAoZmxhZ3Muc2h1ZmZsZVNob3BzKCkpIHNodWZmbGVTaG9wcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuXG4gIHNodWZmbGVHb2EocGFyc2VkLCByYW5kb20pOyAvLyBOT1RFOiBtdXN0IGJlIGJlZm9yZSBzaHVmZmxlTWF6ZXMhXG4gIHJhbmRvbWl6ZVdhbGxzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGNydW1ibGluZ1BsYXRmb3JtcyhwYXJzZWQsIHJhbmRvbSk7XG5cbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZVdpbGRXYXJwKCkpIHNodWZmbGVXaWxkV2FycChwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZiAoZmxhZ3MucmFuZG9taXplVGh1bmRlclRlbGVwb3J0KCkpIHJhbmRvbWl6ZVRodW5kZXJXYXJwKHBhcnNlZCwgcmFuZG9tKTtcbiAgcmVzY2FsZU1vbnN0ZXJzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHVuaWRlbnRpZmllZEl0ZW1zKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHNodWZmbGVUcmFkZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZU1hcHMoKSkgc2h1ZmZsZU1hemVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgLy8gVGhpcyB3YW50cyB0byBnbyBhcyBsYXRlIGFzIHBvc3NpYmxlIHNpbmNlIHdlIG5lZWQgdG8gcGljayB1cFxuICAvLyBhbGwgdGhlIG5vcm1hbGl6YXRpb24gYW5kIG90aGVyIGhhbmRsaW5nIHRoYXQgaGFwcGVuZWQgYmVmb3JlLlxuICBjb25zdCB3ID0gV29ybGQuYnVpbGQocGFyc2VkLCBmbGFncyk7XG4gIGNvbnN0IGZpbGwgPSBhd2FpdCBuZXcgQXNzdW1lZEZpbGwocGFyc2VkLCBmbGFncykuc2h1ZmZsZSh3LmdyYXBoLCByYW5kb20sIHByb2dyZXNzKTtcbiAgaWYgKGZpbGwpIHtcbiAgICAvLyBjb25zdCBuID0gKGk6IG51bWJlcikgPT4ge1xuICAgIC8vICAgaWYgKGkgPj0gMHg3MCkgcmV0dXJuICdNaW1pYyc7XG4gICAgLy8gICBjb25zdCBpdGVtID0gcGFyc2VkLml0ZW1zW3BhcnNlZC5pdGVtR2V0c1tpXS5pdGVtSWRdO1xuICAgIC8vICAgcmV0dXJuIGl0ZW0gPyBpdGVtLm1lc3NhZ2VOYW1lIDogYGludmFsaWQgJHtpfWA7XG4gICAgLy8gfTtcbiAgICAvLyBjb25zb2xlLmxvZygnaXRlbTogc2xvdCcpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsbC5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgaWYgKGZpbGwuaXRlbXNbaV0gIT0gbnVsbCkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZyhgJCR7aGV4KGkpfSAke24oaSl9OiAke24oZmlsbC5pdGVtc1tpXSl9ICQke2hleChmaWxsLml0ZW1zW2ldKX1gKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgdy50cmF2ZXJzZSh3LmdyYXBoLCBmaWxsKTsgLy8gZmlsbCB0aGUgc3BvaWxlciAobWF5IGFsc28gd2FudCB0byBqdXN0IGJlIGEgc2FuaXR5IGNoZWNrPylcblxuICAgIHNsb3RzLnVwZGF0ZShwYXJzZWQsIGZpbGwuc2xvdHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbcm9tLCAtMV07XG4gICAgLy9jb25zb2xlLmVycm9yKCdDT1VMRCBOT1QgRklMTCEnKTtcbiAgfVxuICAvL2NvbnNvbGUubG9nKCdmaWxsJywgZmlsbCk7XG5cbiAgLy8gVE9ETyAtIHNldCBvbWl0SXRlbUdldERhdGFTdWZmaXggYW5kIG9taXRMb2NhbERpYWxvZ1N1ZmZpeFxuICAvL2F3YWl0IHNodWZmbGVEZXBncmFwaChwYXJzZWQsIHJhbmRvbSwgbG9nLCBmbGFncywgcHJvZ3Jlc3MpO1xuXG4gIC8vIFRPRE8gLSByZXdyaXRlIHJlc2NhbGVTaG9wcyB0byB0YWtlIGEgUm9tIGluc3RlYWQgb2YgYW4gYXJyYXkuLi5cbiAgaWYgKHRvdWNoU2hvcHMpIHtcbiAgICAvLyBUT0RPIC0gc2VwYXJhdGUgbG9naWMgZm9yIGhhbmRsaW5nIHNob3BzIHcvbyBQbiBzcGVjaWZpZWQgKGkuZS4gdmFuaWxsYVxuICAgIC8vIHNob3BzIHRoYXQgbWF5IGhhdmUgYmVlbiByYW5kb21pemVkKVxuICAgIHJlc2NhbGVTaG9wcyhwYXJzZWQsIGFzbSwgZmxhZ3MuYmFyZ2Fpbkh1bnRpbmcoKSA/IHJhbmRvbSA6IHVuZGVmaW5lZCk7XG4gIH1cblxuICAvLyBOT1RFOiBtb25zdGVyIHNodWZmbGUgbmVlZHMgdG8gZ28gYWZ0ZXIgaXRlbSBzaHVmZmxlIGJlY2F1c2Ugb2YgbWltaWNcbiAgLy8gcGxhY2VtZW50IGNvbnN0cmFpbnRzLCBidXQgaXQgd291bGQgYmUgbmljZSB0byBnbyBiZWZvcmUgaW4gb3JkZXIgdG9cbiAgLy8gZ3VhcmFudGVlIG1vbmV5LlxuICBpZiAoZmxhZ3Muc2h1ZmZsZU1vbnN0ZXJzKCkpIHNodWZmbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZGVudGlmeUtleUl0ZW1zRm9yRGlmZmljdWx0eUJ1ZmZzKHBhcnNlZCk7XG5cbiAgLy8gQnVmZiBtZWRpY2FsIGhlcmIgYW5kIGZydWl0IG9mIHBvd2VyXG4gIGlmIChmbGFncy5kb3VibGVCdWZmTWVkaWNhbEhlcmIoKSkge1xuICAgIHJvbVsweDFjNTBjICsgMHgxMF0gKj0gMjsgIC8vIGZydWl0IG9mIHBvd2VyXG4gICAgcm9tWzB4MWM0ZWEgKyAweDEwXSAqPSAzOyAgLy8gbWVkaWNhbCBoZXJiXG4gIH0gZWxzZSBpZiAoZmxhZ3MuYnVmZk1lZGljYWxIZXJiKCkpIHtcbiAgICByb21bMHgxYzUwYyArIDB4MTBdICs9IDE2OyAvLyBmcnVpdCBvZiBwb3dlclxuICAgIHJvbVsweDFjNGVhICsgMHgxMF0gKj0gMjsgIC8vIG1lZGljYWwgaGVyYlxuICB9XG5cbiAgaWYgKGZsYWdzLnN0b3J5TW9kZSgpKSBzdG9yeU1vZGUocGFyc2VkKTtcblxuICBzaHVmZmxlTXVzaWMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgc2h1ZmZsZVBhbGV0dGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIC8vIERvIHRoaXMgKmFmdGVyKiBzaHVmZmxpbmcgcGFsZXR0ZXNcbiAgaWYgKGZsYWdzLmJsYWNrb3V0TW9kZSgpKSBibGFja291dE1vZGUocGFyc2VkKTtcblxuICBtaXNjKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGZpeERpYWxvZyhwYXJzZWQpO1xuXG4gIC8vIE5PVEU6IFRoaXMgbmVlZHMgdG8gaGFwcGVuIEJFRk9SRSBwb3N0c2h1ZmZsZVxuICBpZiAoZmxhZ3MuYnVmZkR5bmEoKSkgYnVmZkR5bmEocGFyc2VkLCBmbGFncyk7IC8vIFRPRE8gLSBjb25kaXRpb25hbFxuXG4gIGlmIChmbGFncy50cmFpbmVyKCkpIHtcbiAgICBwYXJzZWQud2lsZFdhcnAubG9jYXRpb25zID0gW1xuICAgICAgMHgwYSwgLy8gdmFtcGlyZVxuICAgICAgMHgxYSwgLy8gc3dhbXAvaW5zZWN0XG4gICAgICAweDM1LCAvLyBzdW1taXQgY2F2ZVxuICAgICAgMHg0OCwgLy8gZm9nIGxhbXBcbiAgICAgIDB4NmQsIC8vIHZhbXBpcmUgMlxuICAgICAgMHg2ZSwgLy8gc2FiZXJhIDFcbiAgICAgIDB4OGMsIC8vIHNoeXJvblxuICAgICAgMHhhYSwgLy8gYmVoaW5kIGtlbGJlc3F5ZSAyXG4gICAgICAweGFjLCAvLyBzYWJlcmEgMlxuICAgICAgMHhiMCwgLy8gYmVoaW5kIG1hZG8gMlxuICAgICAgMHhiNiwgLy8ga2FybWluZVxuICAgICAgMHg5ZiwgLy8gZHJheWdvbiAxXG4gICAgICAweGE2LCAvLyBkcmF5Z29uIDJcbiAgICAgIDB4NTgsIC8vIHRvd2VyXG4gICAgICAweDVjLCAvLyB0b3dlciBvdXRzaWRlIG1lc2lhXG4gICAgICAweDAwLCAvLyBtZXphbWVcbiAgICBdO1xuICB9XG5cbiAgYXdhaXQgcGFyc2VkLndyaXRlRGF0YSgpO1xuICBidWZmRHluYShwYXJzZWQsIGZsYWdzKTsgLy8gVE9ETyAtIGNvbmRpdGlvbmFsXG4gIGNvbnN0IGNyYyA9IGF3YWl0IHBvc3RQYXJzZWRTaHVmZmxlKHJvbSwgcmFuZG9tLCBzZWVkLCBmbGFncywgYXNtLCBhc3NlbWJsZSk7XG5cbiAgLy8gVE9ETyAtIG9wdGlvbmFsIGZsYWdzIGNhbiBwb3NzaWJseSBnbyBoZXJlLCBidXQgTVVTVCBOT1QgdXNlIHBhcnNlZC5wcmchXG5cbiAgaWYgKEVYUEFORF9QUkcpIHtcbiAgICBjb25zdCBwcmcgPSByb20uc3ViYXJyYXkoMHgxMCk7XG4gICAgcHJnLnN1YmFycmF5KDB4N2MwMDAsIDB4ODAwMDApLnNldChwcmcuc3ViYXJyYXkoMHgzYzAwMCwgMHg0MDAwMCkpO1xuICB9XG4gIHJldHVybiBbcm9tLCBjcmNdO1xufVxuXG4vLyBTZXBhcmF0ZSBmdW5jdGlvbiB0byBndWFyYW50ZWUgd2Ugbm8gbG9uZ2VyIGhhdmUgYWNjZXNzIHRvIHRoZSBwYXJzZWQgcm9tLi4uXG5hc3luYyBmdW5jdGlvbiBwb3N0UGFyc2VkU2h1ZmZsZShyb206IFVpbnQ4QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNtOiBBc3NlbWJsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlbWJsZTogKHBhdGg6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGF3YWl0IGFzc2VtYmxlKCdwb3N0c2h1ZmZsZS5zJyk7XG4gIHVwZGF0ZURpZmZpY3VsdHlTY2FsaW5nVGFibGVzKHJvbSwgZmxhZ3MsIGFzbSk7XG4gIHVwZGF0ZUNvaW5Ecm9wcyhyb20sIGZsYWdzKTtcblxuICBzaHVmZmxlUmFuZG9tTnVtYmVycyhyb20sIHJhbmRvbSk7XG5cbiAgcmV0dXJuIHN0YW1wVmVyc2lvblNlZWRBbmRIYXNoKHJvbSwgc2VlZCwgZmxhZ3MpO1xuXG4gIC8vIEJFTE9XIEhFUkUgRk9SIE9QVElPTkFMIEZMQUdTOlxuXG4gIC8vIGRvIGFueSBcInZhbml0eVwiIHBhdGNoZXMgaGVyZS4uLlxuICAvLyBjb25zb2xlLmxvZygncGF0Y2ggYXBwbGllZCcpO1xuICAvLyByZXR1cm4gbG9nLmpvaW4oJ1xcbicpO1xufTtcblxuXG5mdW5jdGlvbiBtaXNjKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pIHtcbiAgY29uc3Qge30gPSB7cm9tLCBmbGFncywgcmFuZG9tfSBhcyBhbnk7XG4gIC8vIE5PVEU6IHdlIHN0aWxsIG5lZWQgdG8gZG8gc29tZSB3b3JrIGFjdHVhbGx5IGFkanVzdGluZ1xuICAvLyBtZXNzYWdlIHRleHRzIHRvIHByZXZlbnQgbGluZSBvdmVyZmxvdywgZXRjLiAgV2Ugc2hvdWxkXG4gIC8vIGFsc28gbWFrZSBzb21lIGhvb2tzIHRvIGVhc2lseSBzd2FwIG91dCBpdGVtcyB3aGVyZSBpdFxuICAvLyBtYWtlcyBzZW5zZS5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzJdWzJdLnRleHQgPSBgXG57MDE6QWthaGFuYX0gaXMgaGFuZGVkIGEgc3RhdHVlLiNcblRoYW5rcyBmb3IgZmluZGluZyB0aGF0LlxuSSB3YXMgdG90YWxseSBnb25uYSBzZWxsXG5pdCBmb3IgdG9ucyBvZiBjYXNoLiNcbkhlcmUsIGhhdmUgdGhpcyBsYW1lXG5bMjk6R2FzIE1hc2tdIG9yIHNvbWV0aGluZy5gO1xuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBhZGQgc29tZSBtb3JlIChoaWdoZXIgbGV2ZWwpIG1hcmt1cCxcbiAgLy8gZS5nLiBgJHtkZXNjcmliZUl0ZW0oc2xvdE51bSl9YC4gIFdlIGNvdWxkIGFsc28gYWRkIG1hcmt1cFxuICAvLyBmb3IgZS5nLiBgJHtzYXlXYW50KHNsb3ROdW0pfWAgYW5kIGAke3NheVRoYW5rcyhzbG90TnVtKX1gXG4gIC8vIGlmIHdlIHNodWZmbGUgdGhlIHdhbnRlZCBpdGVtcy4gIFRoZXNlIGNvdWxkIGJlIHJhbmRvbWl6ZWRcbiAgLy8gaW4gdmFyaW91cyB3YXlzLCBhcyB3ZWxsIGFzIGhhdmluZyBzb21lIGFkZGl0aW9uYWwgYml0cyBsaWtlXG4gIC8vIHdhbnRBdXhpbGlhcnkoLi4uKSBmb3IgZS5nLiBcInRoZSBraXJpc2EgcGxhbnQgaXMgLi4uXCIgLSB0aGVuXG4gIC8vIGl0IGNvdWxkIGluc3RlYWQgc2F5IFwidGhlIHN0YXR1ZSBvZiBvbnl4IGlzIC4uLlwiLlxuICByb20ubWVzc2FnZXMucGFydHNbMF1bMHhlXS50ZXh0ID0gYEl0J3MgZGFuZ2Vyb3VzIHRvIGdvIGFsb25lISBUYWtlIHRoaXMuYDtcbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzBdWzB4ZV0uZml4VGV4dCgpO1xufTtcblxuZnVuY3Rpb24gc2h1ZmZsZVNob3BzKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGNvbnN0IHNob3BzOiB7W3R5cGU6IG51bWJlcl06IHtjb250ZW50czogbnVtYmVyW10sIHNob3BzOiBTaG9wW119fSA9IHtcbiAgICBbU2hvcFR5cGUuQVJNT1JdOiB7Y29udGVudHM6IFtdLCBzaG9wczogW119LFxuICAgIFtTaG9wVHlwZS5UT09MXToge2NvbnRlbnRzOiBbXSwgc2hvcHM6IFtdfSxcbiAgfTtcbiAgLy8gUmVhZCBhbGwgdGhlIGNvbnRlbnRzLlxuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKCFzaG9wLnVzZWQgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmZikgY29udGludWU7XG4gICAgY29uc3QgZGF0YSA9IHNob3BzW3Nob3AudHlwZV07XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIGRhdGEuY29udGVudHMucHVzaCguLi5zaG9wLmNvbnRlbnRzLmZpbHRlcih4ID0+IHggIT09IDB4ZmYpKTtcbiAgICAgIGRhdGEuc2hvcHMucHVzaChzaG9wKTtcbiAgICAgIHNob3AuY29udGVudHMgPSBbXTtcbiAgICB9XG4gIH1cbiAgLy8gU2h1ZmZsZSB0aGUgY29udGVudHMuICBQaWNrIG9yZGVyIHRvIGRyb3AgaXRlbXMgaW4uXG4gIGZvciAoY29uc3QgZGF0YSBvZiBPYmplY3QudmFsdWVzKHNob3BzKSkge1xuICAgIGxldCBzbG90czogU2hvcFtdIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgaXRlbXMgPSBbLi4uZGF0YS5jb250ZW50c107XG4gICAgcmFuZG9tLnNodWZmbGUoaXRlbXMpO1xuICAgIHdoaWxlIChpdGVtcy5sZW5ndGgpIHtcbiAgICAgIGlmICghc2xvdHMgfHwgIXNsb3RzLmxlbmd0aCkge1xuICAgICAgICBpZiAoc2xvdHMpIGl0ZW1zLnNoaWZ0KCk7XG4gICAgICAgIHNsb3RzID0gWy4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHNdO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShzbG90cyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpdGVtID0gaXRlbXNbMF07XG4gICAgICBjb25zdCBzaG9wID0gc2xvdHNbMF07XG4gICAgICBpZiAoc2hvcC5jb250ZW50cy5sZW5ndGggPCA0ICYmICFzaG9wLmNvbnRlbnRzLmluY2x1ZGVzKGl0ZW0pKSB7XG4gICAgICAgIHNob3AuY29udGVudHMucHVzaChpdGVtKTtcbiAgICAgICAgaXRlbXMuc2hpZnQoKTtcbiAgICAgIH1cbiAgICAgIHNsb3RzLnNoaWZ0KCk7XG4gICAgfVxuICB9XG4gIC8vIFNvcnQgYW5kIGFkZCAweGZmJ3NcbiAgZm9yIChjb25zdCBkYXRhIG9mIE9iamVjdC52YWx1ZXMoc2hvcHMpKSB7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIGRhdGEuc2hvcHMpIHtcbiAgICAgIHdoaWxlIChzaG9wLmNvbnRlbnRzLmxlbmd0aCA8IDQpIHNob3AuY29udGVudHMucHVzaCgweGZmKTtcbiAgICAgIHNob3AuY29udGVudHMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByYW5kb21pemVXYWxscyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIC8vIE5PVEU6IFdlIGNhbiBtYWtlIGFueSB3YWxsIHNob290IGJ5IHNldHRpbmcgaXRzICQxMCBiaXQgb24gdGhlIHR5cGUgYnl0ZS5cbiAgLy8gQnV0IHRoaXMgYWxzbyByZXF1aXJlcyBtYXRjaGluZyBwYXR0ZXJuIHRhYmxlcywgc28gd2UnbGwgbGVhdmUgdGhhdCBhbG9uZVxuICAvLyBmb3Igbm93IHRvIGF2b2lkIGdyb3NzIGdyYXBoaWNzLlxuXG4gIC8vIEFsbCBvdGhlciB3YWxscyB3aWxsIG5lZWQgdGhlaXIgdHlwZSBtb3ZlZCBpbnRvIHRoZSB1cHBlciBuaWJibGUgYW5kIHRoZW5cbiAgLy8gdGhlIG5ldyBlbGVtZW50IGdvZXMgaW4gdGhlIGxvd2VyIG5pYmJsZS4gIFNpbmNlIHRoZXJlIGFyZSBzbyBmZXcgaXJvblxuICAvLyB3YWxscywgd2Ugd2lsbCBnaXZlIHRoZW0gYXJiaXRyYXJ5IGVsZW1lbnRzIGluZGVwZW5kZW50IG9mIHRoZSBwYWxldHRlLlxuICAvLyBSb2NrL2ljZSB3YWxscyBjYW4gYWxzbyBoYXZlIGFueSBlbGVtZW50LCBidXQgdGhlIHRoaXJkIHBhbGV0dGUgd2lsbFxuICAvLyBpbmRpY2F0ZSB3aGF0IHRoZXkgZXhwZWN0LlxuXG4gIGlmICghZmxhZ3MucmFuZG9taXplV2FsbHMoKSkgcmV0dXJuO1xuICAvLyBCYXNpYyBwbGFuOiBwYXJ0aXRpb24gYmFzZWQgb24gcGFsZXR0ZSwgbG9vayBmb3Igd2FsbHMuXG4gIGNvbnN0IHBhbHMgPSBbXG4gICAgWzB4MDUsIDB4MzhdLCAvLyByb2NrIHdhbGwgcGFsZXR0ZXNcbiAgICBbMHgxMV0sIC8vIGljZSB3YWxsIHBhbGV0dGVzXG4gICAgWzB4NmFdLCAvLyBcImVtYmVyIHdhbGxcIiBwYWxldHRlc1xuICAgIFsweDE0XSwgLy8gXCJpcm9uIHdhbGxcIiBwYWxldHRlc1xuICBdO1xuXG4gIGZ1bmN0aW9uIHdhbGxUeXBlKHNwYXduOiBTcGF3bik6IG51bWJlciB7XG4gICAgaWYgKHNwYXduLmRhdGFbMl0gJiAweDIwKSB7XG4gICAgICByZXR1cm4gKHNwYXduLmlkID4+PiA0KSAmIDM7XG4gICAgfVxuICAgIHJldHVybiBzcGF3bi5pZCAmIDM7XG4gIH1cblxuICBjb25zdCBwYXJ0aXRpb24gPSBuZXcgRGVmYXVsdE1hcDxBcmVhLCBMb2NhdGlvbltdPigoKSA9PiBbXSk7XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIHBhcnRpdGlvbi5nZXQobG9jYXRpb24uZGF0YS5hcmVhKS5wdXNoKGxvY2F0aW9uKTtcbiAgfVxuICBmb3IgKGNvbnN0IGxvY2F0aW9ucyBvZiBwYXJ0aXRpb24udmFsdWVzKCkpIHtcbiAgICAvLyBwaWNrIGEgcmFuZG9tIHdhbGwgdHlwZS5cbiAgICBjb25zdCBlbHQgPSByYW5kb20ubmV4dEludCg0KTtcbiAgICBjb25zdCBwYWwgPSByYW5kb20ucGljayhwYWxzW2VsdF0pO1xuICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgICBjb25zdCB0eXBlID0gd2FsbFR5cGUoc3Bhd24pO1xuICAgICAgICAgIGlmICh0eXBlID09PSAyKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gMykge1xuICAgICAgICAgICAgY29uc3QgbmV3RWx0ID0gcmFuZG9tLm5leHRJbnQoNCk7XG4gICAgICAgICAgICBpZiAocm9tLnNwb2lsZXIpIHJvbS5zcG9pbGVyLmFkZFdhbGwobG9jYXRpb24ubmFtZSwgdHlwZSwgbmV3RWx0KTtcbiAgICAgICAgICAgIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICAgICAgICAgIHNwYXduLmlkID0gMHgzMCB8IG5ld0VsdDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYCR7bG9jYXRpb24ubmFtZX0gJHt0eXBlfSA9PiAke2VsdH1gKTtcbiAgICAgICAgICAgIGlmICghZm91bmQgJiYgcm9tLnNwb2lsZXIpIHtcbiAgICAgICAgICAgICAgcm9tLnNwb2lsZXIuYWRkV2FsbChsb2NhdGlvbi5uYW1lLCB0eXBlLCBlbHQpO1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgICAgICAgICBzcGF3bi5pZCA9IHR5cGUgPDwgNCB8IGVsdDtcbiAgICAgICAgICAgIGxvY2F0aW9uLnRpbGVQYWxldHRlc1syXSA9IHBhbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2h1ZmZsZU11c2ljKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgaWYgKCFmbGFncy5yYW5kb21pemVNdXNpYygpKSByZXR1cm47XG4gIGludGVyZmFjZSBIYXNNdXNpYyB7IGJnbTogbnVtYmVyOyB9XG4gIGNsYXNzIEJvc3NNdXNpYyBpbXBsZW1lbnRzIEhhc011c2ljIHtcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBhZGRyOiBudW1iZXIpIHt9XG4gICAgZ2V0IGJnbSgpIHsgcmV0dXJuIHJvbS5wcmdbdGhpcy5hZGRyXTsgfVxuICAgIHNldCBiZ20oeCkgeyByb20ucHJnW3RoaXMuYWRkcl0gPSB4OyB9XG4gIH1cbiAgY29uc3QgYm9zc0FkZHIgPSBbXG4gICAgMHgxZTRiOCwgLy8gdmFtcGlyZSAxXG4gICAgMHgxZTY5MCwgLy8gaW5zZWN0XG4gICAgMHgxZTk5YiwgLy8ga2VsYmVzcXVlXG4gICAgMHgxZWNiMSwgLy8gc2FiZXJhXG4gICAgMHgxZWUwZiwgLy8gbWFkb1xuICAgIDB4MWVmODMsIC8vIGthcm1pbmVcbiAgICAweDFmMTg3LCAvLyBkcmF5Z29uIDFcbiAgICAweDFmMzExLCAvLyBkcmF5Z29uIDJcbiAgICAweDM3YzMwLCAvLyBkeW5hXG4gIF07XG4gIGxldCBuZWlnaGJvcnM6IExvY2F0aW9uW10gPSBbXTtcbiAgY29uc3QgbXVzaWNzID0gbmV3IERlZmF1bHRNYXA8dW5rbm93biwgSGFzTXVzaWNbXT4oKCkgPT4gW10pO1xuICBjb25zdCBhbGwgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgZm9yIChjb25zdCBsIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBpZiAobC5pZCA9PT0gMHg1ZiB8fCBsLmlkID09PSAwIHx8ICFsLnVzZWQpIGNvbnRpbnVlOyAvLyBza2lwIHN0YXJ0IGFuZCBkeW5hXG4gICAgY29uc3QgbXVzaWMgPSBsLmRhdGEubXVzaWM7XG4gICAgYWxsLmFkZChsLmJnbSk7XG4gICAgaWYgKHR5cGVvZiBtdXNpYyA9PT0gJ251bWJlcicpIHtcbiAgICAgIG5laWdoYm9ycy5wdXNoKGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBtdXNpY3MuZ2V0KG11c2ljKS5wdXNoKGwpO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IGEgb2YgYm9zc0FkZHIpIHtcbiAgICBjb25zdCBiID0gbmV3IEJvc3NNdXNpYyhhKTtcbiAgICBtdXNpY3Muc2V0KGIsIFtiXSk7XG4gICAgYWxsLmFkZChiLmJnbSk7XG4gIH1cbiAgY29uc3QgbGlzdCA9IFsuLi5hbGxdO1xuICBjb25zdCB1cGRhdGVkID0gbmV3IFNldDxIYXNNdXNpYz4oKTtcbiAgZm9yIChjb25zdCBwYXJ0aXRpb24gb2YgbXVzaWNzLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdmFsdWUgPSByYW5kb20ucGljayhsaXN0KTtcbiAgICBmb3IgKGNvbnN0IG11c2ljIG9mIHBhcnRpdGlvbikge1xuICAgICAgbXVzaWMuYmdtID0gdmFsdWU7XG4gICAgICB1cGRhdGVkLmFkZChtdXNpYyk7XG4gICAgfVxuICB9XG4gIHdoaWxlIChuZWlnaGJvcnMubGVuZ3RoKSB7XG4gICAgY29uc3QgZGVmZXIgPSBbXTtcbiAgICBsZXQgY2hhbmdlZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIG5laWdoYm9ycykge1xuICAgICAgY29uc3QgbmVpZ2hib3IgPSBsb2MubmVpZ2hib3JGb3JFbnRyYW5jZShsb2MuZGF0YS5tdXNpYyBhcyBudW1iZXIpO1xuICAgICAgaWYgKHVwZGF0ZWQuaGFzKG5laWdoYm9yKSkge1xuICAgICAgICBsb2MuYmdtID0gbmVpZ2hib3IuYmdtO1xuICAgICAgICB1cGRhdGVkLmFkZChsb2MpO1xuICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlZmVyLnB1c2gobG9jKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFjaGFuZ2VkKSBicmVhaztcbiAgICBuZWlnaGJvcnMgPSBkZWZlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaHVmZmxlV2lsZFdhcnAocm9tOiBSb20sIF9mbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgY29uc3QgbG9jYXRpb25zOiBMb2NhdGlvbltdID0gW107XG4gIGZvciAoY29uc3QgbCBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgaWYgKGwgJiYgbC51c2VkICYmIGwuaWQgJiYgIWwuZXh0ZW5kZWQgJiYgKGwuaWQgJiAweGY4KSAhPT0gMHg1OCkge1xuICAgICAgbG9jYXRpb25zLnB1c2gobCk7XG4gICAgfVxuICB9XG4gIHJhbmRvbS5zaHVmZmxlKGxvY2F0aW9ucyk7XG4gIHJvbS53aWxkV2FycC5sb2NhdGlvbnMgPSBbXTtcbiAgZm9yIChjb25zdCBsb2Mgb2YgWy4uLmxvY2F0aW9ucy5zbGljZSgwLCAxNSkuc29ydCgoYSwgYikgPT4gYS5pZCAtIGIuaWQpXSkge1xuICAgIHJvbS53aWxkV2FycC5sb2NhdGlvbnMucHVzaChsb2MuaWQpO1xuICAgIGlmIChyb20uc3BvaWxlcikgcm9tLnNwb2lsZXIuYWRkV2lsZFdhcnAobG9jLmlkLCBsb2MubmFtZSk7XG4gIH1cbiAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucy5wdXNoKDApO1xufVxuXG5mdW5jdGlvbiBidWZmRHluYShyb206IFJvbSwgX2ZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIHJvbS5vYmplY3RzWzB4YjhdLmNvbGxpc2lvblBsYW5lID0gMTtcbiAgcm9tLm9iamVjdHNbMHhiOF0uaW1tb2JpbGUgPSB0cnVlO1xuICByb20ub2JqZWN0c1sweGI5XS5jb2xsaXNpb25QbGFuZSA9IDE7XG4gIHJvbS5vYmplY3RzWzB4YjldLmltbW9iaWxlID0gdHJ1ZTtcbiAgcm9tLm9iamVjdHNbMHgzM10uY29sbGlzaW9uUGxhbmUgPSAyO1xuICByb20uYWRIb2NTcGF3bnNbMHgyOF0uc2xvdFJhbmdlTG93ZXIgPSAweDFjOyAvLyBjb3VudGVyXG4gIHJvbS5hZEhvY1NwYXduc1sweDI5XS5zbG90UmFuZ2VVcHBlciA9IDB4MWM7IC8vIGxhc2VyXG4gIHJvbS5hZEhvY1NwYXduc1sweDJhXS5zbG90UmFuZ2VVcHBlciA9IDB4MWM7IC8vIGJ1YmJsZVxufVxuXG5mdW5jdGlvbiBibGFja291dE1vZGUocm9tOiBSb20pIHtcbiAgY29uc3QgZGcgPSBnZW5lcmF0ZURlcGdyYXBoKCk7XG4gIGZvciAoY29uc3Qgbm9kZSBvZiBkZy5ub2Rlcykge1xuICAgIGNvbnN0IHR5cGUgPSAobm9kZSBhcyBhbnkpLnR5cGU7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09ICdMb2NhdGlvbicgJiYgKHR5cGUgPT09ICdjYXZlJyB8fCB0eXBlID09PSAnZm9ydHJlc3MnKSkge1xuICAgICAgcm9tLmxvY2F0aW9uc1sobm9kZSBhcyBhbnkpLmlkXS50aWxlUGFsZXR0ZXMuZmlsbCgweDlhKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3Qgc3RvcnlNb2RlID0gKHJvbTogUm9tKSA9PiB7XG4gIC8vIHNodWZmbGUgaGFzIGFscmVhZHkgaGFwcGVuZWQsIG5lZWQgdG8gdXNlIHNodWZmbGVkIGZsYWdzIGZyb21cbiAgLy8gTlBDIHNwYXduIGNvbmRpdGlvbnMuLi5cbiAgY29uc3QgY29uZGl0aW9ucyA9IFtcbiAgICAvLyBOb3RlOiBpZiBib3NzZXMgYXJlIHNodWZmbGVkIHdlJ2xsIG5lZWQgdG8gZGV0ZWN0IHRoaXMuLi5cbiAgICB+cm9tLm5wY3NbMHhjMl0uc3Bhd25Db25kaXRpb25zLmdldCgweDI4KSFbMF0sIC8vIEtlbGJlc3F1ZSAxXG4gICAgfnJvbS5ucGNzWzB4ODRdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHg2ZSkhWzBdLCAvLyBTYWJlcmEgMVxuICAgIH5yb20udHJpZ2dlcigweDlhKS5jb25kaXRpb25zWzFdLCAvLyBNYWRvIDFcbiAgICB+cm9tLm5wY3NbMHhjNV0uc3Bhd25Db25kaXRpb25zLmdldCgweGE5KSFbMF0sIC8vIEtlbGJlc3F1ZSAyXG4gICAgfnJvbS5ucGNzWzB4YzZdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhhYykhWzBdLCAvLyBTYWJlcmEgMlxuICAgIH5yb20ubnBjc1sweGM3XS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YjkpIVswXSwgLy8gTWFkbyAyXG4gICAgfnJvbS5ucGNzWzB4YzhdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhiNikhWzBdLCAvLyBLYXJtaW5lXG4gICAgfnJvbS5ucGNzWzB4Y2JdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHg5ZikhWzBdLCAvLyBEcmF5Z29uIDFcbiAgICAweDIwMCwgLy8gU3dvcmQgb2YgV2luZFxuICAgIDB4MjAxLCAvLyBTd29yZCBvZiBGaXJlXG4gICAgMHgyMDIsIC8vIFN3b3JkIG9mIFdhdGVyXG4gICAgMHgyMDMsIC8vIFN3b3JkIG9mIFRodW5kZXJcbiAgICAvLyBUT0RPIC0gc3RhdHVlcyBvZiBtb29uIGFuZCBzdW4gbWF5IGJlIHJlbGV2YW50IGlmIGVudHJhbmNlIHNodWZmbGU/XG4gICAgLy8gVE9ETyAtIHZhbXBpcmVzIGFuZCBpbnNlY3Q/XG4gIF07XG4gIHJvbS5ucGNzWzB4Y2JdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhhNikhLnB1c2goLi4uY29uZGl0aW9ucyk7XG59O1xuXG4vLyBTdGFtcCB0aGUgUk9NXG5leHBvcnQgZnVuY3Rpb24gc3RhbXBWZXJzaW9uU2VlZEFuZEhhc2gocm9tOiBVaW50OEFycmF5LCBzZWVkOiBudW1iZXIsIGZsYWdzOiBGbGFnU2V0KTogbnVtYmVyIHtcbiAgLy8gVXNlIHVwIHRvIDI2IGJ5dGVzIHN0YXJ0aW5nIGF0IFBSRyAkMjVlYThcbiAgLy8gV291bGQgYmUgbmljZSB0byBzdG9yZSAoMSkgY29tbWl0LCAoMikgZmxhZ3MsICgzKSBzZWVkLCAoNCkgaGFzaFxuICAvLyBXZSBjYW4gdXNlIGJhc2U2NCBlbmNvZGluZyB0byBoZWxwIHNvbWUuLi5cbiAgLy8gRm9yIG5vdyBqdXN0IHN0aWNrIGluIHRoZSBjb21taXQgYW5kIHNlZWQgaW4gc2ltcGxlIGhleFxuICBjb25zdCBjcmMgPSBjcmMzMihyb20pO1xuICBjb25zdCBjcmNTdHJpbmcgPSBjcmMudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgaGFzaCA9IHZlcnNpb24uU1RBVFVTID09PSAndW5zdGFibGUnID9cbiAgICAgIHZlcnNpb24uSEFTSC5zdWJzdHJpbmcoMCwgNykucGFkU3RhcnQoNywgJzAnKS50b1VwcGVyQ2FzZSgpICsgJyAgICAgJyA6XG4gICAgICB2ZXJzaW9uLlZFUlNJT04uc3Vic3RyaW5nKDAsIDEyKS5wYWRFbmQoMTIsICcgJyk7XG4gIGNvbnN0IHNlZWRTdHIgPSBzZWVkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IGVtYmVkID0gKGFkZHI6IG51bWJlciwgdGV4dDogc3RyaW5nKSA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICByb21bYWRkciArIDB4MTAgKyBpXSA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IGludGVyY2FsYXRlID0gKHMxOiBzdHJpbmcsIHMyOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgczEubGVuZ3RoIHx8IGkgPCBzMi5sZW5ndGg7IGkrKykge1xuICAgICAgb3V0LnB1c2goczFbaV0gfHwgJyAnKTtcbiAgICAgIG91dC5wdXNoKHMyW2ldIHx8ICcgJyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignJyk7XG4gIH07XG5cbiAgZW1iZWQoMHgyNzdjZiwgaW50ZXJjYWxhdGUoJyAgVkVSU0lPTiAgICAgU0VFRCAgICAgICcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAgICR7aGFzaH0ke3NlZWRTdHJ9YCkpO1xuICBsZXQgZmxhZ1N0cmluZyA9IFN0cmluZyhmbGFncyk7XG5cbiAgLy8gaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gMzYpIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnJlcGxhY2UoLyAvZywgJycpO1xuICBsZXQgZXh0cmFGbGFncztcbiAgaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gNDYpIHtcbiAgICBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiA5MikgdGhyb3cgbmV3IEVycm9yKCdGbGFnIHN0cmluZyB3YXkgdG9vIGxvbmchJyk7XG4gICAgZXh0cmFGbGFncyA9IGZsYWdTdHJpbmcuc3Vic3RyaW5nKDQ2LCA5MikucGFkRW5kKDQ2LCAnICcpO1xuICAgIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnN1YnN0cmluZygwLCA0Nik7XG4gIH1cbiAgLy8gaWYgKGZsYWdTdHJpbmcubGVuZ3RoIDw9IDM2KSB7XG4gIC8vICAgLy8gYXR0ZW1wdCB0byBicmVhayBpdCBtb3JlIGZhdm9yYWJseVxuXG4gIC8vIH1cbiAgLy8gICBmbGFnU3RyaW5nID0gWydGTEFHUyAnLFxuICAvLyAgICAgICAgICAgICAgICAgZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgMTgpLnBhZEVuZCgxOCwgJyAnKSxcbiAgLy8gICAgICAgICAgICAgICAgICcgICAgICAnLFxuXG4gIC8vIH1cblxuICBmbGFnU3RyaW5nID0gZmxhZ1N0cmluZy5wYWRFbmQoNDYsICcgJyk7XG5cbiAgZW1iZWQoMHgyNzdmZiwgaW50ZXJjYWxhdGUoZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgMjMpLCBmbGFnU3RyaW5nLnN1YnN0cmluZygyMykpKTtcbiAgaWYgKGV4dHJhRmxhZ3MpIHtcbiAgICBlbWJlZCgweDI3ODJmLCBpbnRlcmNhbGF0ZShleHRyYUZsYWdzLnN1YnN0cmluZygwLCAyMyksIGV4dHJhRmxhZ3Muc3Vic3RyaW5nKDIzKSkpO1xuICB9XG5cbiAgZW1iZWQoMHgyNzg4NSwgaW50ZXJjYWxhdGUoY3JjU3RyaW5nLnN1YnN0cmluZygwLCA0KSwgY3JjU3RyaW5nLnN1YnN0cmluZyg0KSkpO1xuXG4gIC8vIGVtYmVkKDB4MjVlYTgsIGB2LiR7aGFzaH0gICAke3NlZWR9YCk7XG4gIGVtYmVkKDB4MjU3MTYsICdSQU5ET01JWkVSJyk7XG4gIGlmICh2ZXJzaW9uLlNUQVRVUyA9PT0gJ3Vuc3RhYmxlJykgZW1iZWQoMHgyNTczYywgJ0JFVEEnKTtcbiAgLy8gTk9URTogaXQgd291bGQgYmUgcG9zc2libGUgdG8gYWRkIHRoZSBoYXNoL3NlZWQvZXRjIHRvIHRoZSB0aXRsZVxuICAvLyBwYWdlIGFzIHdlbGwsIGJ1dCB3ZSdkIG5lZWQgdG8gcmVwbGFjZSB0aGUgdW51c2VkIGxldHRlcnMgaW4gYmFua1xuICAvLyAkMWQgd2l0aCB0aGUgbWlzc2luZyBudW1iZXJzIChKLCBRLCBXLCBYKSwgYXMgd2VsbCBhcyB0aGUgdHdvXG4gIC8vIHdlaXJkIHNxdWFyZXMgYXQgJDViIGFuZCAkNWMgdGhhdCBkb24ndCBhcHBlYXIgdG8gYmUgdXNlZC4gIFRvZ2V0aGVyXG4gIC8vIHdpdGggdXNpbmcgdGhlIGxldHRlciAnTycgYXMgMCwgdGhhdCdzIHN1ZmZpY2llbnQgdG8gY3JhbSBpbiBhbGwgdGhlXG4gIC8vIG51bWJlcnMgYW5kIGRpc3BsYXkgYXJiaXRyYXJ5IGhleCBkaWdpdHMuXG5cbiAgcmV0dXJuIGNyYztcbn07XG5cbmNvbnN0IHBhdGNoQnl0ZXMgPSAocm9tOiBVaW50OEFycmF5LCBhZGRyZXNzOiBudW1iZXIsIGJ5dGVzOiBudW1iZXJbXSkgPT4ge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgcm9tW2FkZHJlc3MgKyBpXSA9IGJ5dGVzW2ldO1xuICB9XG59O1xuXG5jb25zdCBwYXRjaFdvcmRzID0gKHJvbTogVWludDhBcnJheSwgYWRkcmVzczogbnVtYmVyLCB3b3JkczogbnVtYmVyW10pID0+IHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAyICogd29yZHMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByb21bYWRkcmVzcyArIGldID0gd29yZHNbaSA+Pj4gMV0gJiAweGZmO1xuICAgIHJvbVthZGRyZXNzICsgaSArIDFdID0gd29yZHNbaSA+Pj4gMV0gPj4+IDg7XG4gIH1cbn07XG5cbi8vIGdvZXMgd2l0aCBlbmVteSBzdGF0IHJlY29tcHV0YXRpb25zIGluIHBvc3RzaHVmZmxlLnNcbmNvbnN0IHVwZGF0ZUNvaW5Ecm9wcyA9IChyb206IFVpbnQ4QXJyYXksIGZsYWdzOiBGbGFnU2V0KSA9PiB7XG4gIHJvbSA9IHJvbS5zdWJhcnJheSgweDEwKTtcbiAgaWYgKGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCkpIHtcbiAgICAvLyBiaWdnZXIgZ29sZCBkcm9wcyBpZiBubyBzaG9wIGdsaXRjaCwgcGFydGljdWxhcmx5IGF0IHRoZSBzdGFydFxuICAgIC8vIC0gc3RhcnRzIG91dCBmaWJvbmFjY2ksIHRoZW4gZ29lcyBsaW5lYXIgYXQgNjAwXG4gICAgcGF0Y2hXb3Jkcyhyb20sIDB4MzRiZGUsIFtcbiAgICAgICAgMCwgICA1LCAgMTAsICAxNSwgIDI1LCAgNDAsICA2NSwgIDEwNSxcbiAgICAgIDE3MCwgMjc1LCA0NDUsIDYwMCwgNzAwLCA4MDAsIDkwMCwgMTAwMCxcbiAgICBdKTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0aGlzIHRhYmxlIGlzIGJhc2ljYWxseSBtZWFuaW5nbGVzcyBiL2Mgc2hvcCBnbGl0Y2hcbiAgICBwYXRjaFdvcmRzKHJvbSwgMHgzNGJkZSwgW1xuICAgICAgICAwLCAgIDEsICAgMiwgICA0LCAgIDgsICAxNiwgIDMwLCAgNTAsXG4gICAgICAxMDAsIDIwMCwgMzAwLCA0MDAsIDUwMCwgNjAwLCA3MDAsIDgwMCxcbiAgICBdKTtcbiAgfVxufTtcblxuLy8gZ29lcyB3aXRoIGVuZW15IHN0YXQgcmVjb21wdXRhdGlvbnMgaW4gcG9zdHNodWZmbGUuc1xuY29uc3QgdXBkYXRlRGlmZmljdWx0eVNjYWxpbmdUYWJsZXMgPSAocm9tOiBVaW50OEFycmF5LCBmbGFnczogRmxhZ1NldCwgYXNtOiBBc3NlbWJsZXIpID0+IHtcbiAgcm9tID0gcm9tLnN1YmFycmF5KDB4MTApO1xuXG4gIC8vIEN1cnJlbnRseSB0aGlzIGlzIHRocmVlICQzMC1ieXRlIHRhYmxlcywgd2hpY2ggd2Ugc3RhcnQgYXQgdGhlIGJlZ2lubmluZ1xuICAvLyBvZiB0aGUgcG9zdHNodWZmbGUgQ29tcHV0ZUVuZW15U3RhdHMuXG4gIGNvbnN0IGRpZmYgPSBzZXEoNDgsIHggPT4geCk7XG5cbiAgLy8gUEF0ayA9IDUgKyBEaWZmICogMTUvMzJcbiAgLy8gRGlmZkF0ayB0YWJsZSBpcyA4ICogUEF0ayA9IHJvdW5kKDQwICsgKERpZmYgKiAxNSAvIDQpKVxuICBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkF0aycpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg0MCArIGQgKiAxNSAvIDQpKSk7XG5cbiAgLy8gTk9URTogT2xkIERpZmZEZWYgdGFibGUgKDQgKiBQRGVmKSB3YXMgMTIgKyBEaWZmICogMywgYnV0IHdlIG5vIGxvbmdlclxuICAvLyB1c2UgdGhpcyB0YWJsZSBzaW5jZSBuZXJmaW5nIGFybW9ycy5cbiAgLy8gKFBEZWYgPSAzICsgRGlmZiAqIDMvNClcbiAgLy8gcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZEZWYnKSxcbiAgLy8gICAgICAgICAgICBkaWZmLm1hcChkID0+IDEyICsgZCAqIDMpKTtcblxuICAvLyBOT1RFOiBUaGlzIGlzIHRoZSBhcm1vci1uZXJmZWQgRGlmZkRlZiB0YWJsZS5cbiAgLy8gUERlZiA9IDIgKyBEaWZmIC8gMlxuICAvLyBEaWZmRGVmIHRhYmxlIGlzIDQgKiBQRGVmID0gOCArIERpZmYgKiAyXG4gIC8vIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmRGVmJyksXG4gIC8vICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiA4ICsgZCAqIDIpKTtcblxuICAvLyBOT1RFOiBGb3IgYXJtb3IgY2FwIGF0IDMgKiBMdmwsIHNldCBQRGVmID0gRGlmZlxuICBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkRlZicpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gZCAqIDQpKTtcblxuICAvLyBEaWZmSFAgdGFibGUgaXMgUEhQID0gbWluKDI1NSwgNDggKyByb3VuZChEaWZmICogMTEgLyAyKSlcbiAgY29uc3QgcGhwU3RhcnQgPSBmbGFncy5kZWNyZWFzZUVuZW15RGFtYWdlKCkgPyAxNiA6IDQ4O1xuICBjb25zdCBwaHBJbmNyID0gZmxhZ3MuZGVjcmVhc2VFbmVteURhbWFnZSgpID8gNiA6IDUuNTtcbiAgcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZIUCcpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5taW4oMjU1LCBwaHBTdGFydCArIE1hdGgucm91bmQoZCAqIHBocEluY3IpKSkpO1xuXG4gIC8vIERpZmZFeHAgdGFibGUgaXMgRXhwQiA9IGNvbXByZXNzKGZsb29yKDQgKiAoMiAqKiAoKDE2ICsgOSAqIERpZmYpIC8gMzIpKSkpXG4gIC8vIHdoZXJlIGNvbXByZXNzIG1hcHMgdmFsdWVzID4gMTI3IHRvICQ4MHwoeD4+NClcblxuICBjb25zdCBleHBGYWN0b3IgPSBmbGFncy5leHBTY2FsaW5nRmFjdG9yKCk7XG4gIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmRXhwJyksIGRpZmYubWFwKGQgPT4ge1xuICAgIGNvbnN0IGV4cCA9IE1hdGguZmxvb3IoNCAqICgyICoqICgoMTYgKyA5ICogZCkgLyAzMikpICogZXhwRmFjdG9yKTtcbiAgICByZXR1cm4gZXhwIDwgMHg4MCA/IGV4cCA6IE1hdGgubWluKDB4ZmYsIDB4ODAgKyAoZXhwID4+IDQpKTtcbiAgfSkpO1xuXG4gIC8vIC8vIEhhbHZlIHNoaWVsZCBhbmQgYXJtb3IgZGVmZW5zZSB2YWx1ZXNcbiAgLy8gcGF0Y2hCeXRlcyhyb20sIDB4MzRiYzAsIFtcbiAgLy8gICAvLyBBcm1vciBkZWZlbnNlXG4gIC8vICAgMCwgMSwgMywgNSwgNywgOSwgMTIsIDEwLCAxNixcbiAgLy8gICAvLyBTaGllbGQgZGVmZW5zZVxuICAvLyAgIDAsIDEsIDMsIDQsIDYsIDksIDgsIDEyLCAxNixcbiAgLy8gXSk7XG5cbiAgLy8gQWRqdXN0IHNoaWVsZCBhbmQgYXJtb3IgZGVmZW5zZSB2YWx1ZXNcbiAgcGF0Y2hCeXRlcyhyb20sIDB4MzRiYzAsIFtcbiAgICAvLyBBcm1vciBkZWZlbnNlXG4gICAgMCwgMiwgNiwgMTAsIDE0LCAxOCwgMzIsIDI0LCAyMCxcbiAgICAvLyBTaGllbGQgZGVmZW5zZVxuICAgIDAsIDIsIDYsIDEwLCAxNCwgMTgsIDE2LCAzMiwgMjAsXG4gIF0pO1xufTtcblxuY29uc3QgcmVzY2FsZVNob3BzID0gKHJvbTogUm9tLCBhc206IEFzc2VtYmxlciwgcmFuZG9tPzogUmFuZG9tKSA9PiB7XG4gIC8vIFBvcHVsYXRlIHJlc2NhbGVkIHByaWNlcyBpbnRvIHRoZSB2YXJpb3VzIHJvbSBsb2NhdGlvbnMuXG4gIC8vIFNwZWNpZmljYWxseSwgd2UgcmVhZCB0aGUgYXZhaWxhYmxlIGl0ZW0gSURzIG91dCBvZiB0aGVcbiAgLy8gc2hvcCB0YWJsZXMgYW5kIHRoZW4gY29tcHV0ZSBuZXcgcHJpY2VzIGZyb20gdGhlcmUuXG4gIC8vIElmIGByYW5kb21gIGlzIHBhc3NlZCB0aGVuIHRoZSBiYXNlIHByaWNlIHRvIGJ1eSBlYWNoXG4gIC8vIGl0ZW0gYXQgYW55IGdpdmVuIHNob3Agd2lsbCBiZSBhZGp1c3RlZCB0byBhbnl3aGVyZSBmcm9tXG4gIC8vIDUwJSB0byAxNTAlIG9mIHRoZSBiYXNlIHByaWNlLiAgVGhlIHBhd24gc2hvcCBwcmljZSBpc1xuICAvLyBhbHdheXMgNTAlIG9mIHRoZSBiYXNlIHByaWNlLlxuXG4gIHJvbS5zaG9wQ291bnQgPSAxMTsgLy8gMTEgb2YgYWxsIHR5cGVzIG9mIHNob3AgZm9yIHNvbWUgcmVhc29uLlxuICByb20uc2hvcERhdGFUYWJsZXNBZGRyZXNzID0gYXNtLmV4cGFuZCgnU2hvcERhdGEnKTtcblxuICAvLyBOT1RFOiBUaGlzIGlzbid0IGluIHRoZSBSb20gb2JqZWN0IHlldC4uLlxuICB3cml0ZUxpdHRsZUVuZGlhbihyb20ucHJnLCBhc20uZXhwYW5kKCdJbm5CYXNlUHJpY2UnKSwgMjApO1xuXG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoc2hvcC50eXBlID09PSBTaG9wVHlwZS5QQVdOKSBjb250aW51ZTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2hvcC5wcmljZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldIDwgMHg4MCkge1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IHJhbmRvbSA/IHJhbmRvbS5uZXh0Tm9ybWFsKDEsIDAuMywgMC41LCAxLjUpIDogMTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5JTk4pIHtcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8ganVzdCBzZXQgdGhlIG9uZSBwcmljZVxuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IHJhbmRvbSA/IHJhbmRvbS5uZXh0Tm9ybWFsKDEsIDAuNSwgMC4zNzUsIDEuNjI1KSA6IDE7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQWxzbyBmaWxsIHRoZSBzY2FsaW5nIHRhYmxlcy5cbiAgY29uc3QgZGlmZiA9IHNlcSg0OCwgeCA9PiB4KTtcbiAgLy8gVG9vbCBzaG9wcyBzY2FsZSBhcyAyICoqIChEaWZmIC8gMTApLCBzdG9yZSBpbiA4dGhzXG4gIHBhdGNoQnl0ZXMocm9tLnByZywgYXNtLmV4cGFuZCgnVG9vbFNob3BTY2FsaW5nJyksXG4gICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDggKiAoMiAqKiAoZCAvIDEwKSkpKSk7XG4gIC8vIEFybW9yIHNob3BzIHNjYWxlIGFzIDIgKiogKCg0NyAtIERpZmYpIC8gMTIpLCBzdG9yZSBpbiA4dGhzXG4gIHBhdGNoQnl0ZXMocm9tLnByZywgYXNtLmV4cGFuZCgnQXJtb3JTaG9wU2NhbGluZycpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg4ICogKDIgKiogKCg0NyAtIGQpIC8gMTIpKSkpKTtcblxuICAvLyBTZXQgdGhlIGl0ZW0gYmFzZSBwcmljZXMuXG4gIGZvciAobGV0IGkgPSAweDBkOyBpIDwgMHgyNzsgaSsrKSB7XG4gICAgcm9tLml0ZW1zW2ldLmJhc2VQcmljZSA9IEJBU0VfUFJJQ0VTW2ldO1xuICB9XG5cbiAgLy8gVE9ETyAtIHNlcGFyYXRlIGZsYWcgZm9yIHJlc2NhbGluZyBtb25zdGVycz8/P1xufTtcblxuLy8gTWFwIG9mIGJhc2UgcHJpY2VzLiAgKFRvb2xzIGFyZSBwb3NpdGl2ZSwgYXJtb3JzIGFyZSBvbmVzLWNvbXBsZW1lbnQuKVxuY29uc3QgQkFTRV9QUklDRVM6IHtbaXRlbUlkOiBudW1iZXJdOiBudW1iZXJ9ID0ge1xuICAvLyBBcm1vcnNcbiAgMHgwZDogNCwgICAgLy8gY2FyYXBhY2Ugc2hpZWxkXG4gIDB4MGU6IDE2LCAgIC8vIGJyb256ZSBzaGllbGRcbiAgMHgwZjogNTAsICAgLy8gcGxhdGludW0gc2hpZWxkXG4gIDB4MTA6IDMyNSwgIC8vIG1pcnJvcmVkIHNoaWVsZFxuICAweDExOiAxMDAwLCAvLyBjZXJhbWljIHNoaWVsZFxuICAweDEyOiAyMDAwLCAvLyBzYWNyZWQgc2hpZWxkXG4gIDB4MTM6IDQwMDAsIC8vIGJhdHRsZSBzaGllbGRcbiAgMHgxNTogNiwgICAgLy8gdGFubmVkIGhpZGVcbiAgMHgxNjogMjAsICAgLy8gbGVhdGhlciBhcm1vclxuICAweDE3OiA3NSwgICAvLyBicm9uemUgYXJtb3JcbiAgMHgxODogMjUwLCAgLy8gcGxhdGludW0gYXJtb3JcbiAgMHgxOTogMTAwMCwgLy8gc29sZGllciBzdWl0XG4gIDB4MWE6IDQ4MDAsIC8vIGNlcmFtaWMgc3VpdFxuICAvLyBUb29sc1xuICAweDFkOiAyNSwgICAvLyBtZWRpY2FsIGhlcmJcbiAgMHgxZTogMzAsICAgLy8gYW50aWRvdGVcbiAgMHgxZjogNDUsICAgLy8gbHlzaXMgcGxhbnRcbiAgMHgyMDogNDAsICAgLy8gZnJ1aXQgb2YgbGltZVxuICAweDIxOiAzNiwgICAvLyBmcnVpdCBvZiBwb3dlclxuICAweDIyOiAyMDAsICAvLyBtYWdpYyByaW5nXG4gIDB4MjM6IDE1MCwgIC8vIGZydWl0IG9mIHJlcHVuXG4gIDB4MjQ6IDY1LCAgIC8vIHdhcnAgYm9vdHNcbiAgMHgyNjogMzAwLCAgLy8gb3BlbCBzdGF0dWVcbiAgLy8gMHgzMTogNTAsIC8vIGFsYXJtIGZsdXRlXG59O1xuXG4vLy8vLy8vLy9cbi8vLy8vLy8vL1xuLy8vLy8vLy8vXG5cbmZ1bmN0aW9uIHJlc2NhbGVNb25zdGVycyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG5cbiAgLy8gVE9ETyAtIGZpbmQgYW55dGhpbmcgc2hhcmluZyB0aGUgc2FtZSBtZW1vcnkgYW5kIHVwZGF0ZSB0aGVtIGFzIHdlbGxcbiAgY29uc3QgdW5zY2FsZWRNb25zdGVycyA9XG4gICAgICBuZXcgU2V0PG51bWJlcj4oc2VxKDB4MTAwLCB4ID0+IHgpLmZpbHRlcihzID0+IHMgaW4gcm9tLm9iamVjdHMpKTtcbiAgZm9yIChjb25zdCBbaWRdIG9mIFNDQUxFRF9NT05TVEVSUykge1xuICAgIHVuc2NhbGVkTW9uc3RlcnMuZGVsZXRlKGlkKTtcbiAgfVxuICBmb3IgKGNvbnN0IFtpZCwgbW9uc3Rlcl0gb2YgU0NBTEVEX01PTlNURVJTKSB7XG4gICAgZm9yIChjb25zdCBvdGhlciBvZiB1bnNjYWxlZE1vbnN0ZXJzKSB7XG4gICAgICBpZiAocm9tLm9iamVjdHNbaWRdLmJhc2UgPT09IHJvbS5vYmplY3RzW290aGVyXS5iYXNlKSB7XG4gICAgICAgIFNDQUxFRF9NT05TVEVSUy5zZXQob3RoZXIsIG1vbnN0ZXIpO1xuICAgICAgICB1bnNjYWxlZE1vbnN0ZXJzLmRlbGV0ZShpZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gRmxhaWxzIChmOSwgZmEpIGFuZCBTYWJlcmEgMidzIGZpcmViYWxscyAoYzgpIHNob3VsZCBiZSBwcm9qZWN0aWxlcy5cbiAgLy8gTW9yZW92ZXIsIGZvciBzb21lIHdlaXJkIHJlYXNvbiB0aGV5J3JlIHNldCB1cCB0byBjYXVzZSBwYXJhbHlzaXMsIHNvXG4gIC8vIGxldCdzIGZpeCB0aGF0LCB0b28uXG4gIGZvciAoY29uc3Qgb2JqIG9mIFsweGM4LCAweGY5LCAweGZhXSkge1xuICAgIC8vIE5PVEU6IGZsYWlscyBuZWVkIGF0dGFja3R5cGUgJGZlLCBub3QgJGZmXG4gICAgcm9tLm9iamVjdHNbb2JqXS5hdHRhY2tUeXBlID0gb2JqID4gMHhmMCA/IDB4ZmUgOiAweGZmO1xuICAgIHJvbS5vYmplY3RzW29ial0uc3RhdHVzRWZmZWN0ID0gMDtcbiAgfVxuICAvLyBGaXggU2FiZXJhIDEncyBlbGVtZW50YWwgZGVmZW5zZSB0byBubyBsb25nZXIgYWxsb3cgdGh1bmRlclxuICByb20ub2JqZWN0c1sweDdkXS5lbGVtZW50cyB8PSAweDA4O1xuXG4gIGNvbnN0IEJPU1NFUyA9IG5ldyBTZXQoWzB4NTcsIDB4NWUsIDB4NjgsIDB4N2QsIDB4ODgsIDB4OTcsIDB4OWIsIDB4OWVdKTtcbiAgY29uc3QgU0xJTUVTID0gbmV3IFNldChbMHg1MCwgMHg1MywgMHg1ZiwgMHg2OV0pO1xuICBmb3IgKGNvbnN0IFtpZCwge3NkZWYsIHN3cmQsIGhpdHMsIHNhdGssIGRnbGQsIHNleHB9XSBvZiBTQ0FMRURfTU9OU1RFUlMpIHtcbiAgICAvLyBpbmRpY2F0ZSB0aGF0IHRoaXMgb2JqZWN0IG5lZWRzIHNjYWxpbmdcbiAgICBjb25zdCBvID0gcm9tLm9iamVjdHNbaWRdLmRhdGE7XG4gICAgY29uc3QgYm9zcyA9IEJPU1NFUy5oYXMoaWQpID8gMSA6IDA7XG4gICAgb1syXSB8PSAweDgwOyAvLyByZWNvaWxcbiAgICBvWzZdID0gaGl0czsgLy8gSFBcbiAgICBvWzddID0gc2F0azsgIC8vIEFUS1xuICAgIC8vIFN3b3JkOiAwLi4zICh3aW5kIC0gdGh1bmRlcikgcHJlc2VydmVkLCA0IChjcnlzdGFsaXMpID0+IDdcbiAgICBvWzhdID0gc2RlZiB8IHN3cmQgPDwgNDsgLy8gREVGXG4gICAgLy8gTk9URTogbG9uZyBhZ28gd2Ugc3RvcmVkIHdoZXRoZXIgdGhpcyB3YXMgYSBib3NzIGluIHRoZSBsb3dlc3RcbiAgICAvLyBiaXQgb2YgdGhlIG5vdy11bnVzZWQgTEVWRUwuIHNvIHRoYXQgd2UgY291bGQgaW5jcmVhc2Ugc2NhbGluZ1xuICAgIC8vIG9uIGtpbGxpbmcgdGhlbSwgYnV0IG5vdyB0aGF0IHNjYWxpbmcgaXMgdGllZCB0byBpdGVtcywgdGhhdCdzXG4gICAgLy8gbm8gbG9uZ2VyIG5lZWRlZCAtIHdlIGNvdWxkIGNvLW9wdCB0aGlzIHRvIGluc3RlYWQgc3RvcmUgdXBwZXJcbiAgICAvLyBiaXRzIG9mIEhQIChvciBwb3NzaWJseSBsb3dlciBiaXRzIHNvIHRoYXQgSFAtYmFzZWQgZWZmZWN0c1xuICAgIC8vIHN0aWxsIHdvcmsgY29ycmVjdGx5KS5cbiAgICAvLyBvWzldID0gb1s5XSAmIDB4ZTA7XG4gICAgb1sxNl0gPSBvWzE2XSAmIDB4MGYgfCBkZ2xkIDw8IDQ7IC8vIEdMRFxuICAgIG9bMTddID0gc2V4cDsgLy8gRVhQXG5cbiAgICBpZiAoYm9zcyA/IGZsYWdzLnNodWZmbGVCb3NzRWxlbWVudHMoKSA6IGZsYWdzLnNodWZmbGVNb25zdGVyRWxlbWVudHMoKSkge1xuICAgICAgaWYgKCFTTElNRVMuaGFzKGlkKSkge1xuICAgICAgICBjb25zdCBiaXRzID0gWy4uLnJvbS5vYmplY3RzW2lkXS5lbGVtZW50cy50b1N0cmluZygyKS5wYWRTdGFydCg0LCAnMCcpXTtcbiAgICAgICAgcmFuZG9tLnNodWZmbGUoYml0cyk7XG4gICAgICAgIHJvbS5vYmplY3RzW2lkXS5lbGVtZW50cyA9IE51bWJlci5wYXJzZUludChiaXRzLmpvaW4oJycpLCAyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBoYW5kbGUgc2xpbWVzIGFsbCBhdCBvbmNlXG4gIGlmIChmbGFncy5zaHVmZmxlTW9uc3RlckVsZW1lbnRzKCkpIHtcbiAgICAvLyBwaWNrIGFuIGVsZW1lbnQgZm9yIHNsaW1lIGRlZmVuc2VcbiAgICBjb25zdCBlID0gcmFuZG9tLm5leHRJbnQoNCk7XG4gICAgcm9tLnByZ1sweDM1MjJkXSA9IGUgKyAxO1xuICAgIGZvciAoY29uc3QgaWQgb2YgU0xJTUVTKSB7XG4gICAgICByb20ub2JqZWN0c1tpZF0uZWxlbWVudHMgPSAxIDw8IGU7XG4gICAgfVxuICB9XG5cbiAgLy8gcm9tLndyaXRlT2JqZWN0RGF0YSgpO1xufTtcblxuY29uc3Qgc2h1ZmZsZU1vbnN0ZXJzID0gKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pID0+IHtcbiAgLy8gVE9ETzogb25jZSB3ZSBoYXZlIGxvY2F0aW9uIG5hbWVzLCBjb21waWxlIGEgc3BvaWxlciBvZiBzaHVmZmxlZCBtb25zdGVyc1xuICBjb25zdCBncmFwaGljcyA9IG5ldyBHcmFwaGljcyhyb20pO1xuICAvLyAod2luZG93IGFzIGFueSkuZ3JhcGhpY3MgPSBncmFwaGljcztcbiAgaWYgKGZsYWdzLnNodWZmbGVTcHJpdGVQYWxldHRlcygpKSBncmFwaGljcy5zaHVmZmxlUGFsZXR0ZXMocmFuZG9tKTtcbiAgY29uc3QgcG9vbCA9IG5ldyBNb25zdGVyUG9vbChmbGFncywge30pO1xuICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgaWYgKGxvYy51c2VkKSBwb29sLnBvcHVsYXRlKGxvYyk7XG4gIH1cbiAgcG9vbC5zaHVmZmxlKHJhbmRvbSwgZ3JhcGhpY3MpO1xufTtcblxuY29uc3QgaWRlbnRpZnlLZXlJdGVtc0ZvckRpZmZpY3VsdHlCdWZmcyA9IChyb206IFJvbSkgPT4ge1xuICAvLyAvLyBUYWcga2V5IGl0ZW1zIGZvciBkaWZmaWN1bHR5IGJ1ZmZzXG4gIC8vIGZvciAoY29uc3QgZ2V0IG9mIHJvbS5pdGVtR2V0cykge1xuICAvLyAgIGNvbnN0IGl0ZW0gPSBJVEVNUy5nZXQoZ2V0Lml0ZW1JZCk7XG4gIC8vICAgaWYgKCFpdGVtIHx8ICFpdGVtLmtleSkgY29udGludWU7XG4gIC8vICAgZ2V0LmtleSA9IHRydWU7XG4gIC8vIH1cbiAgLy8gLy8gY29uc29sZS5sb2cocmVwb3J0KTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDQ5OyBpKyspIHtcbiAgICAvLyBOT1RFIC0gc3BlY2lhbCBoYW5kbGluZyBmb3IgYWxhcm0gZmx1dGUgdW50aWwgd2UgcHJlLXBhdGNoXG4gICAgY29uc3QgdW5pcXVlID0gKHJvbS5wcmdbMHgyMGZmMCArIGldICYgMHg0MCkgfHwgaSA9PT0gMHgzMTtcbiAgICBjb25zdCBiaXQgPSAxIDw8IChpICYgNyk7XG4gICAgY29uc3QgYWRkciA9IDB4MWUxMTAgKyAoaSA+Pj4gMyk7XG4gICAgcm9tLnByZ1thZGRyXSA9IHJvbS5wcmdbYWRkcl0gJiB+Yml0IHwgKHVuaXF1ZSA/IGJpdCA6IDApO1xuICB9XG59O1xuXG5pbnRlcmZhY2UgTW9uc3RlckRhdGEge1xuICBpZDogbnVtYmVyO1xuICB0eXBlOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgc2RlZjogbnVtYmVyO1xuICBzd3JkOiBudW1iZXI7XG4gIGhpdHM6IG51bWJlcjtcbiAgc2F0azogbnVtYmVyO1xuICBkZ2xkOiBudW1iZXI7XG4gIHNleHA6IG51bWJlcjtcbn1cblxuLyogdHNsaW50OmRpc2FibGU6dHJhaWxpbmctY29tbWEgd2hpdGVzcGFjZSAqL1xuY29uc3QgU0NBTEVEX01PTlNURVJTOiBNYXA8bnVtYmVyLCBNb25zdGVyRGF0YT4gPSBuZXcgTWFwKFtcbiAgLy8gSUQgIFRZUEUgIE5BTUUgICAgICAgICAgICAgICAgICAgICAgIFNERUYgU1dSRCBISVRTIFNBVEsgREdMRCBTRVhQXG4gIFsweDNmLCAncCcsICdTb3JjZXJvciBzaG90JywgICAgICAgICAgICAgICwgICAsICAgLCAgICAxOSwgICwgICAgLF0sXG4gIFsweDRiLCAnbScsICd3cmFpdGg/PycsICAgICAgICAgICAgICAgICAgIDIsICAsICAgMiwgICAyMiwgIDQsICAgNjFdLFxuICBbMHg0ZiwgJ20nLCAnd3JhaXRoJywgICAgICAgICAgICAgICAgICAgICAxLCAgLCAgIDIsICAgMjAsICA0LCAgIDYxXSxcbiAgWzB4NTAsICdtJywgJ0JsdWUgU2xpbWUnLCAgICAgICAgICAgICAgICAgLCAgICwgICAxLCAgIDE2LCAgMiwgICAzMl0sXG4gIFsweDUxLCAnbScsICdXZXJldGlnZXInLCAgICAgICAgICAgICAgICAgICwgICAsICAgMSwgICAyMSwgIDQsICAgNDBdLFxuICBbMHg1MiwgJ20nLCAnR3JlZW4gSmVsbHknLCAgICAgICAgICAgICAgICA0LCAgLCAgIDMsICAgMTYsICA0LCAgIDM2XSxcbiAgWzB4NTMsICdtJywgJ1JlZCBTbGltZScsICAgICAgICAgICAgICAgICAgNiwgICwgICA0LCAgIDE2LCAgNCwgICA0OF0sXG4gIFsweDU0LCAnbScsICdSb2NrIEdvbGVtJywgICAgICAgICAgICAgICAgIDYsICAsICAgMTEsICAyNCwgIDYsICAgODVdLFxuICBbMHg1NSwgJ20nLCAnQmx1ZSBCYXQnLCAgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgNCwgICAsICAgIDMyXSxcbiAgWzB4NTYsICdtJywgJ0dyZWVuIFd5dmVybicsICAgICAgICAgICAgICAgNCwgICwgICA0LCAgIDI0LCAgNiwgICA1Ml0sXG4gIFsweDU3LCAnYicsICdWYW1waXJlJywgICAgICAgICAgICAgICAgICAgIDMsICAsICAgMTIsICAxOCwgICwgICAgMTEwXSxcbiAgWzB4NTgsICdtJywgJ09yYycsICAgICAgICAgICAgICAgICAgICAgICAgMywgICwgICA0LCAgIDIxLCAgNCwgICA1N10sXG4gIFsweDU5LCAnbScsICdSZWQgRmx5aW5nIFN3YW1wIEluc2VjdCcsICAgIDMsICAsICAgMSwgICAyMSwgIDQsICAgNTddLFxuICBbMHg1YSwgJ20nLCAnQmx1ZSBNdXNocm9vbScsICAgICAgICAgICAgICAyLCAgLCAgIDEsICAgMjEsICA0LCAgIDQ0XSxcbiAgWzB4NWIsICdtJywgJ1N3YW1wIFRvbWF0bycsICAgICAgICAgICAgICAgMywgICwgICAyLCAgIDM1LCAgNCwgICA1Ml0sXG4gIFsweDVjLCAnbScsICdGbHlpbmcgTWVhZG93IEluc2VjdCcsICAgICAgIDMsICAsICAgMywgICAyMywgIDQsICAgODFdLFxuICBbMHg1ZCwgJ20nLCAnU3dhbXAgUGxhbnQnLCAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgLCAgICAsICAgIDM2XSxcbiAgWzB4NWUsICdiJywgJ0luc2VjdCcsICAgICAgICAgICAgICAgICAgICAgLCAgIDEsICA4LCAgIDYsICAgLCAgICAxMDBdLFxuICBbMHg1ZiwgJ20nLCAnTGFyZ2UgQmx1ZSBTbGltZScsICAgICAgICAgICA1LCAgLCAgIDMsICAgMjAsICA0LCAgIDUyXSxcbiAgWzB4NjAsICdtJywgJ0ljZSBab21iaWUnLCAgICAgICAgICAgICAgICAgNSwgICwgICA3LCAgIDE0LCAgNCwgICA1N10sXG4gIFsweDYxLCAnbScsICdHcmVlbiBMaXZpbmcgUm9jaycsICAgICAgICAgICwgICAsICAgMSwgICA5LCAgIDQsICAgMjhdLFxuICBbMHg2MiwgJ20nLCAnR3JlZW4gU3BpZGVyJywgICAgICAgICAgICAgICA0LCAgLCAgIDQsICAgMjIsICA0LCAgIDQ0XSxcbiAgWzB4NjMsICdtJywgJ1JlZC9QdXJwbGUgV3l2ZXJuJywgICAgICAgICAgMywgICwgICA0LCAgIDMwLCAgNCwgICA2NV0sXG4gIFsweDY0LCAnbScsICdEcmF5Z29uaWEgU29sZGllcicsICAgICAgICAgIDYsICAsICAgMTEsICAzNiwgIDQsICAgODldLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4NjUsICdtJywgJ0ljZSBFbnRpdHknLCAgICAgICAgICAgICAgICAgMywgICwgICAyLCAgIDI0LCAgNCwgICA1Ml0sXG4gIFsweDY2LCAnbScsICdSZWQgTGl2aW5nIFJvY2snLCAgICAgICAgICAgICwgICAsICAgMSwgICAxMywgIDQsICAgNDBdLFxuICBbMHg2NywgJ20nLCAnSWNlIEdvbGVtJywgICAgICAgICAgICAgICAgICA3LCAgMiwgIDExLCAgMjgsICA0LCAgIDgxXSxcbiAgWzB4NjgsICdiJywgJ0tlbGJlc3F1ZScsICAgICAgICAgICAgICAgICAgNCwgIDYsICAxMiwgIDI5LCAgLCAgICAxMjBdLFxuICBbMHg2OSwgJ20nLCAnR2lhbnQgUmVkIFNsaW1lJywgICAgICAgICAgICA3LCAgLCAgIDQwLCAgOTAsICA0LCAgIDEwMl0sXG4gIFsweDZhLCAnbScsICdUcm9sbCcsICAgICAgICAgICAgICAgICAgICAgIDIsICAsICAgMywgICAyNCwgIDQsICAgNjVdLFxuICBbMHg2YiwgJ20nLCAnUmVkIEplbGx5JywgICAgICAgICAgICAgICAgICAyLCAgLCAgIDIsICAgMTQsICA0LCAgIDQ0XSxcbiAgWzB4NmMsICdtJywgJ01lZHVzYScsICAgICAgICAgICAgICAgICAgICAgMywgICwgICA0LCAgIDM2LCAgOCwgICA3N10sXG4gIFsweDZkLCAnbScsICdSZWQgQ3JhYicsICAgICAgICAgICAgICAgICAgIDIsICAsICAgMSwgICAyMSwgIDQsICAgNDRdLFxuICBbMHg2ZSwgJ20nLCAnTWVkdXNhIEhlYWQnLCAgICAgICAgICAgICAgICAsICAgLCAgIDEsICAgMjksICA0LCAgIDM2XSxcbiAgWzB4NmYsICdtJywgJ0V2aWwgQmlyZCcsICAgICAgICAgICAgICAgICAgLCAgICwgICAyLCAgIDMwLCAgNiwgICA2NV0sXG4gIFsweDcxLCAnbScsICdSZWQvUHVycGxlIE11c2hyb29tJywgICAgICAgIDMsICAsICAgNSwgICAxOSwgIDYsICAgNjldLFxuICBbMHg3MiwgJ20nLCAnVmlvbGV0IEVhcnRoIEVudGl0eScsICAgICAgICAzLCAgLCAgIDMsICAgMTgsICA2LCAgIDYxXSxcbiAgWzB4NzMsICdtJywgJ01pbWljJywgICAgICAgICAgICAgICAgICAgICAgLCAgICwgICAzLCAgIDI2LCAgMTUsICA3M10sXG4gIFsweDc0LCAnbScsICdSZWQgU3BpZGVyJywgICAgICAgICAgICAgICAgIDMsICAsICAgNCwgICAyMiwgIDYsICAgNDhdLFxuICBbMHg3NSwgJ20nLCAnRmlzaG1hbicsICAgICAgICAgICAgICAgICAgICA0LCAgLCAgIDYsICAgMTksICA1LCAgIDYxXSxcbiAgWzB4NzYsICdtJywgJ0plbGx5ZmlzaCcsICAgICAgICAgICAgICAgICAgLCAgICwgICAzLCAgIDE0LCAgMywgICA0OF0sXG4gIFsweDc3LCAnbScsICdLcmFrZW4nLCAgICAgICAgICAgICAgICAgICAgIDUsICAsICAgMTEsICAyNSwgIDcsICAgNzNdLFxuICBbMHg3OCwgJ20nLCAnRGFyayBHcmVlbiBXeXZlcm4nLCAgICAgICAgICA0LCAgLCAgIDUsICAgMjEsICA1LCAgIDYxXSxcbiAgWzB4NzksICdtJywgJ1NhbmQgTW9uc3RlcicsICAgICAgICAgICAgICAgNSwgICwgICA4LCAgIDYsICAgNCwgICA1N10sXG4gIFsweDdiLCAnbScsICdXcmFpdGggU2hhZG93IDEnLCAgICAgICAgICAgICwgICAsICAgLCAgICA5LCAgIDcsICAgNDRdLFxuICBbMHg3YywgJ20nLCAnS2lsbGVyIE1vdGgnLCAgICAgICAgICAgICAgICAsICAgLCAgIDIsICAgMzUsICAsICAgIDc3XSxcbiAgWzB4N2QsICdiJywgJ1NhYmVyYScsICAgICAgICAgICAgICAgICAgICAgMywgIDcsICAxMywgIDI0LCAgLCAgICAxMTBdLFxuICBbMHg4MCwgJ20nLCAnRHJheWdvbmlhIEFyY2hlcicsICAgICAgICAgICAxLCAgLCAgIDMsICAgMjAsICA2LCAgIDYxXSxcbiAgLy8gSUQgIFRZUEUgIE5BTUUgICAgICAgICAgICAgICAgICAgICAgIFNERUYgU1dSRCBISVRTIFNBVEsgREdMRCBTRVhQXG4gIFsweDgxLCAnbScsICdFdmlsIEJvbWJlciBCaXJkJywgICAgICAgICAgICwgICAsICAgMSwgICAxOSwgIDQsICAgNjVdLFxuICBbMHg4MiwgJ20nLCAnTGF2YW1hbi9ibG9iJywgICAgICAgICAgICAgICAzLCAgLCAgIDMsICAgMjQsICA2LCAgIDg1XSxcbiAgWzB4ODQsICdtJywgJ0xpemFyZG1hbiAody8gZmxhaWwoJywgICAgICAgMiwgICwgICAzLCAgIDMwLCAgNiwgICA4MV0sXG4gIFsweDg1LCAnbScsICdHaWFudCBFeWUnLCAgICAgICAgICAgICAgICAgIDMsICAsICAgNSwgICAzMywgIDQsICAgODFdLFxuICBbMHg4NiwgJ20nLCAnU2FsYW1hbmRlcicsICAgICAgICAgICAgICAgICAyLCAgLCAgIDQsICAgMjksICA4LCAgIDc3XSxcbiAgWzB4ODcsICdtJywgJ1NvcmNlcm9yJywgICAgICAgICAgICAgICAgICAgMiwgICwgICA1LCAgIDMxLCAgNiwgICA2NV0sXG4gIFsweDg4LCAnYicsICdNYWRvJywgICAgICAgICAgICAgICAgICAgICAgIDQsICA4LCAgMTAsICAzMCwgICwgICAgMTEwXSxcbiAgWzB4ODksICdtJywgJ0RyYXlnb25pYSBLbmlnaHQnLCAgICAgICAgICAgMiwgICwgICAzLCAgIDI0LCAgNCwgICA3N10sXG4gIFsweDhhLCAnbScsICdEZXZpbCcsICAgICAgICAgICAgICAgICAgICAgICwgICAsICAgMSwgICAxOCwgIDQsICAgNTJdLFxuICBbMHg4YiwgJ2InLCAnS2VsYmVzcXVlIDInLCAgICAgICAgICAgICAgICA0LCAgNiwgIDExLCAgMjcsICAsICAgIDExMF0sXG4gIFsweDhjLCAnbScsICdXcmFpdGggU2hhZG93IDInLCAgICAgICAgICAgICwgICAsICAgLCAgICAxNywgIDQsICAgNDhdLFxuICBbMHg5MCwgJ2InLCAnU2FiZXJhIDInLCAgICAgICAgICAgICAgICAgICA1LCAgNywgIDIxLCAgMjcsICAsICAgIDEyMF0sXG4gIFsweDkxLCAnbScsICdUYXJhbnR1bGEnLCAgICAgICAgICAgICAgICAgIDMsICAsICAgMywgICAyMSwgIDYsICAgNzNdLFxuICBbMHg5MiwgJ20nLCAnU2tlbGV0b24nLCAgICAgICAgICAgICAgICAgICAsICAgLCAgIDQsICAgMzAsICA2LCAgIDY5XSxcbiAgWzB4OTMsICdiJywgJ01hZG8gMicsICAgICAgICAgICAgICAgICAgICAgNCwgIDgsICAxMSwgIDI1LCAgLCAgICAxMjBdLFxuICBbMHg5NCwgJ20nLCAnUHVycGxlIEdpYW50IEV5ZScsICAgICAgICAgICA0LCAgLCAgIDEwLCAgMjMsICA2LCAgIDEwMl0sXG4gIFsweDk1LCAnbScsICdCbGFjayBLbmlnaHQgKHcvIGZsYWlsKScsICAgIDMsICAsICAgNywgICAyNiwgIDYsICAgODldLFxuICBbMHg5NiwgJ20nLCAnU2NvcnBpb24nLCAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDUsICAgMjksICAyLCAgIDczXSxcbiAgWzB4OTcsICdiJywgJ0thcm1pbmUnLCAgICAgICAgICAgICAgICAgICAgNCwgICwgICAxNCwgIDI2LCAgLCAgICAxMTBdLFxuICBbMHg5OCwgJ20nLCAnU2FuZG1hbi9ibG9iJywgICAgICAgICAgICAgICAzLCAgLCAgIDUsICAgMzYsICA2LCAgIDk4XSxcbiAgWzB4OTksICdtJywgJ011bW15JywgICAgICAgICAgICAgICAgICAgICAgNSwgICwgICAxOSwgIDM2LCAgNiwgICAxMTBdLFxuICBbMHg5YSwgJ20nLCAnVG9tYiBHdWFyZGlhbicsICAgICAgICAgICAgICA3LCAgLCAgIDYwLCAgMzcsICA2LCAgIDEwNl0sXG4gIFsweDliLCAnYicsICdEcmF5Z29uJywgICAgICAgICAgICAgICAgICAgIDUsICA2LCAgMTYsICA0MSwgICwgICAgMTEwXSxcbiAgWzB4OWUsICdiJywgJ0RyYXlnb24gMicsICAgICAgICAgICAgICAgICAgNywgIDYsICAyOCwgIDQwLCAgLCAgICAsXSxcbiAgLy8gSUQgIFRZUEUgIE5BTUUgICAgICAgICAgICAgICAgICAgICAgIFNERUYgU1dSRCBISVRTIFNBVEsgREdMRCBTRVhQXG4gIFsweGEwLCAnbScsICdHcm91bmQgU2VudHJ5ICgxKScsICAgICAgICAgIDQsICAsICAgNiwgICAyNiwgIDcsICAgNzNdLFxuICBbMHhhMSwgJ20nLCAnVG93ZXIgRGVmZW5zZSBNZWNoICgyKScsICAgICA1LCAgLCAgIDgsICAgMzYsICA4LCAgIDg1XSxcbiAgWzB4YTIsICdtJywgJ1Rvd2VyIFNlbnRpbmVsJywgICAgICAgICAgICAgLCAgICwgICAxLCAgICwgICAgNSwgICAzMl0sXG4gIFsweGEzLCAnbScsICdBaXIgU2VudHJ5JywgICAgICAgICAgICAgICAgIDMsICAsICAgMiwgICAyNiwgIDYsICAgNjVdLFxuICAvLyBbMHhhNCwgJ2InLCAnRHluYScsICAgICAgICAgICAgICAgICAgICAgICA2LCAgNSwgIDE2LCAgLCAgICAsICAgICxdLFxuICBbMHhhNSwgJ2InLCAnVmFtcGlyZSAyJywgICAgICAgICAgICAgICAgICAzLCAgLCAgIDEyLCAgMjcsICAsICAgIDEwMF0sXG4gIC8vIFsweGI0LCAnYicsICdkeW5hIHBvZCcsICAgICAgICAgICAgICAgICAgIDE1LCAsICAgMjU1LCAyNiwgICwgICAgLF0sXG4gIC8vIFsweGI4LCAncCcsICdkeW5hIGNvdW50ZXInLCAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNiwgICwgICAgLF0sXG4gIC8vIFsweGI5LCAncCcsICdkeW5hIGxhc2VyJywgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNiwgICwgICAgLF0sXG4gIC8vIFsweGJhLCAncCcsICdkeW5hIGJ1YmJsZScsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIFsweGE0LCAnYicsICdEeW5hJywgICAgICAgICAgICAgICAgICAgICAgIDYsICA1LCAgMzIsICAsICAgICwgICAgLF0sXG4gIFsweGI0LCAnYicsICdkeW5hIHBvZCcsICAgICAgICAgICAgICAgICAgIDYsICA1LCAgNDgsICAyNiwgICwgICAgLF0sXG4gIFsweGI4LCAncCcsICdkeW5hIGNvdW50ZXInLCAgICAgICAgICAgICAgMTUsICAsICAgLCAgICA0MiwgICwgICAgLF0sXG4gIFsweGI5LCAncCcsICdkeW5hIGxhc2VyJywgICAgICAgICAgICAgICAgMTUsICAsICAgLCAgICA0MiwgICwgICAgLF0sXG4gIFsweGJhLCAncCcsICdkeW5hIGJ1YmJsZScsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIC8vXG4gIFsweGJjLCAnbScsICd2YW1wMiBiYXQnLCAgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNiwgICwgICAgMTVdLFxuICBbMHhiZiwgJ3AnLCAnZHJheWdvbjIgZmlyZWJhbGwnLCAgICAgICAgICAsICAgLCAgICwgICAgMjYsICAsICAgICxdLFxuICBbMHhjMSwgJ20nLCAndmFtcDEgYmF0JywgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTYsICAsICAgIDE1XSxcbiAgWzB4YzMsICdwJywgJ2dpYW50IGluc2VjdCBzcGl0JywgICAgICAgICAgLCAgICwgICAsICAgIDM1LCAgLCAgICAsXSxcbiAgWzB4YzQsICdtJywgJ3N1bW1vbmVkIGluc2VjdCcsICAgICAgICAgICAgNCwgICwgICAyLCAgIDQyLCAgLCAgICA5OF0sXG4gIFsweGM1LCAncCcsICdrZWxieTEgcm9jaycsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyMiwgICwgICAgLF0sXG4gIFsweGM2LCAncCcsICdzYWJlcmExIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAxOSwgICwgICAgLF0sXG4gIFsweGM3LCAncCcsICdrZWxieTIgZmlyZWJhbGxzJywgICAgICAgICAgICwgICAsICAgLCAgICAxMSwgICwgICAgLF0sXG4gIFsweGM4LCAncCcsICdzYWJlcmEyIGZpcmUnLCAgICAgICAgICAgICAgICwgICAsICAgMSwgICA2LCAgICwgICAgLF0sXG4gIFsweGM5LCAncCcsICdzYWJlcmEyIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNywgICwgICAgLF0sXG4gIFsweGNhLCAncCcsICdrYXJtaW5lIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNSwgICwgICAgLF0sXG4gIFsweGNiLCAncCcsICdzdW4vbW9vbiBzdGF0dWUgZmlyZWJhbGxzJywgICwgICAsICAgLCAgICAzOSwgICwgICAgLF0sXG4gIFsweGNjLCAncCcsICdkcmF5Z29uMSBsaWdodG5pbmcnLCAgICAgICAgICwgICAsICAgLCAgICAzNywgICwgICAgLF0sXG4gIFsweGNkLCAncCcsICdkcmF5Z29uMiBsYXNlcicsICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIC8vIElEICBUWVBFICBOQU1FICAgICAgICAgICAgICAgICAgICAgICBTREVGIFNXUkQgSElUUyBTQVRLIERHTEQgU0VYUFxuICBbMHhjZSwgJ3AnLCAnZHJheWdvbjIgYnJlYXRoJywgICAgICAgICAgICAsICAgLCAgICwgICAgMzYsICAsICAgICxdLFxuICBbMHhlMCwgJ3AnLCAnZXZpbCBib21iZXIgYmlyZCBib21iJywgICAgICAsICAgLCAgICwgICAgMiwgICAsICAgICxdLFxuICBbMHhlMiwgJ3AnLCAnc3VtbW9uZWQgaW5zZWN0IGJvbWInLCAgICAgICAsICAgLCAgICwgICAgNDcsICAsICAgICxdLFxuICBbMHhlMywgJ3AnLCAncGFyYWx5c2lzIGJlYW0nLCAgICAgICAgICAgICAsICAgLCAgICwgICAgMjMsICAsICAgICxdLFxuICBbMHhlNCwgJ3AnLCAnc3RvbmUgZ2F6ZScsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzMsICAsICAgICxdLFxuICBbMHhlNSwgJ3AnLCAncm9jayBnb2xlbSByb2NrJywgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhlNiwgJ3AnLCAnY3Vyc2UgYmVhbScsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTAsICAsICAgICxdLFxuICBbMHhlNywgJ3AnLCAnbXAgZHJhaW4gd2ViJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTEsICAsICAgICxdLFxuICBbMHhlOCwgJ3AnLCAnZmlzaG1hbiB0cmlkZW50JywgICAgICAgICAgICAsICAgLCAgICwgICAgMTUsICAsICAgICxdLFxuICBbMHhlOSwgJ3AnLCAnb3JjIGF4ZScsICAgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhlYSwgJ3AnLCAnU3dhbXAgUG9sbGVuJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzcsICAsICAgICxdLFxuICBbMHhlYiwgJ3AnLCAncGFyYWx5c2lzIHBvd2RlcicsICAgICAgICAgICAsICAgLCAgICwgICAgMTcsICAsICAgICxdLFxuICBbMHhlYywgJ3AnLCAnZHJheWdvbmlhIHNvbGlkZXIgc3dvcmQnLCAgICAsICAgLCAgICwgICAgMjgsICAsICAgICxdLFxuICBbMHhlZCwgJ3AnLCAnaWNlIGdvbGVtIHJvY2snLCAgICAgICAgICAgICAsICAgLCAgICwgICAgMjAsICAsICAgICxdLFxuICBbMHhlZSwgJ3AnLCAndHJvbGwgYXhlJywgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjcsICAsICAgICxdLFxuICBbMHhlZiwgJ3AnLCAna3Jha2VuIGluaycsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhmMCwgJ3AnLCAnZHJheWdvbmlhIGFyY2hlciBhcnJvdycsICAgICAsICAgLCAgICwgICAgMTIsICAsICAgICxdLFxuICBbMHhmMSwgJ3AnLCAnPz8/IHVudXNlZCcsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTYsICAsICAgICxdLFxuICBbMHhmMiwgJ3AnLCAnZHJheWdvbmlhIGtuaWdodCBzd29yZCcsICAgICAsICAgLCAgICwgICAgOSwgICAsICAgICxdLFxuICBbMHhmMywgJ3AnLCAnbW90aCByZXNpZHVlJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTksICAsICAgICxdLFxuICBbMHhmNCwgJ3AnLCAnZ3JvdW5kIHNlbnRyeSBsYXNlcicsICAgICAgICAsICAgLCAgICwgICAgMTMsICAsICAgICxdLFxuICBbMHhmNSwgJ3AnLCAndG93ZXIgZGVmZW5zZSBtZWNoIGxhc2VyJywgICAsICAgLCAgICwgICAgMjMsICAsICAgICxdLFxuICBbMHhmNiwgJ3AnLCAndG93ZXIgc2VudGluZWwgbGFzZXInLCAgICAgICAsICAgLCAgICwgICAgOCwgICAsICAgICxdLFxuICBbMHhmNywgJ3AnLCAnc2tlbGV0b24gc2hvdCcsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTEsICAsICAgICxdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4ZjgsICdwJywgJ2xhdmFtYW4gc2hvdCcsICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE0LCAgLCAgICAsXSxcbiAgWzB4ZjksICdwJywgJ2JsYWNrIGtuaWdodCBmbGFpbCcsICAgICAgICAgLCAgICwgICAsICAgIDE4LCAgLCAgICAsXSxcbiAgWzB4ZmEsICdwJywgJ2xpemFyZG1hbiBmbGFpbCcsICAgICAgICAgICAgLCAgICwgICAsICAgIDIxLCAgLCAgICAsXSxcbiAgWzB4ZmMsICdwJywgJ21hZG8gc2h1cmlrZW4nLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDM2LCAgLCAgICAsXSxcbiAgWzB4ZmQsICdwJywgJ2d1YXJkaWFuIHN0YXR1ZSBtaXNzaWxlJywgICAgLCAgICwgICAsICAgIDIzLCAgLCAgICAsXSxcbiAgWzB4ZmUsICdwJywgJ2RlbW9uIHdhbGwgZmlyZScsICAgICAgICAgICAgLCAgICwgICAsICAgIDIzLCAgLCAgICAsXSxcbl0ubWFwKChbaWQsIHR5cGUsIG5hbWUsIHNkZWY9MCwgc3dyZD0wLCBoaXRzPTAsIHNhdGs9MCwgZGdsZD0wLCBzZXhwPTBdKSA9PlxuICAgICAgW2lkLCB7aWQsIHR5cGUsIG5hbWUsIHNkZWYsIHN3cmQsIGhpdHMsIHNhdGssIGRnbGQsIHNleHB9XSkpIGFzIGFueTtcblxuLyogdHNsaW50OmVuYWJsZTp0cmFpbGluZy1jb21tYSB3aGl0ZXNwYWNlICovXG5cbi8vIFdoZW4gZGVhbGluZyB3aXRoIGNvbnN0cmFpbnRzLCBpdCdzIGJhc2ljYWxseSBrc2F0XG4vLyAgLSB3ZSBoYXZlIGEgbGlzdCBvZiByZXF1aXJlbWVudHMgdGhhdCBhcmUgQU5EZWQgdG9nZXRoZXJcbi8vICAtIGVhY2ggaXMgYSBsaXN0IG9mIHByZWRpY2F0ZXMgdGhhdCBhcmUgT1JlZCB0b2dldGhlclxuLy8gIC0gZWFjaCBwcmVkaWNhdGUgaGFzIGEgY29udGludWF0aW9uIGZvciB3aGVuIGl0J3MgcGlja2VkXG4vLyAgLSBuZWVkIGEgd2F5IHRvIHRoaW4gdGhlIGNyb3dkLCBlZmZpY2llbnRseSBjaGVjayBjb21wYXQsIGV0Y1xuLy8gUHJlZGljYXRlIGlzIGEgZm91ci1lbGVtZW50IGFycmF5IFtwYXQwLHBhdDEscGFsMixwYWwzXVxuLy8gUmF0aGVyIHRoYW4gYSBjb250aW51YXRpb24gd2UgY291bGQgZ28gdGhyb3VnaCBhbGwgdGhlIHNsb3RzIGFnYWluXG5cbi8vIGNsYXNzIENvbnN0cmFpbnRzIHtcbi8vICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgLy8gQXJyYXkgb2YgcGF0dGVybiB0YWJsZSBvcHRpb25zLiAgTnVsbCBpbmRpY2F0ZXMgdGhhdCBpdCBjYW4gYmUgYW55dGhpbmcuXG4vLyAgICAgLy9cbi8vICAgICB0aGlzLnBhdHRlcm5zID0gW1tudWxsLCBudWxsXV07XG4vLyAgICAgdGhpcy5wYWxldHRlcyA9IFtbbnVsbCwgbnVsbF1dO1xuLy8gICAgIHRoaXMuZmx5ZXJzID0gMDtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVUcmVhc3VyZUNoZXN0KCkge1xuLy8gICAgIHRoaXMucmVxdWlyZU9yZGVyZWRTbG90KDAsIFRSRUFTVVJFX0NIRVNUX0JBTktTKTtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVPcmRlcmVkU2xvdChzbG90LCBzZXQpIHtcblxuLy8gICAgIGlmICghdGhpcy5vcmRlcmVkKSB7XG5cbi8vICAgICB9XG4vLyAvLyBUT0RPXG4vLyAgICAgdGhpcy5wYXQwID0gaW50ZXJzZWN0KHRoaXMucGF0MCwgc2V0KTtcblxuLy8gICB9XG5cbi8vIH1cblxuLy8gY29uc3QgaW50ZXJzZWN0ID0gKGxlZnQsIHJpZ2h0KSA9PiB7XG4vLyAgIGlmICghcmlnaHQpIHRocm93IG5ldyBFcnJvcigncmlnaHQgbXVzdCBiZSBub250cml2aWFsJyk7XG4vLyAgIGlmICghbGVmdCkgcmV0dXJuIHJpZ2h0O1xuLy8gICBjb25zdCBvdXQgPSBuZXcgU2V0KCk7XG4vLyAgIGZvciAoY29uc3QgeCBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0Lmhhcyh4KSkgb3V0LmFkZCh4KTtcbi8vICAgfVxuLy8gICByZXR1cm4gb3V0O1xuLy8gfVxuXG5pbnRlcmZhY2UgTW9uc3RlckNvbnN0cmFpbnQge1xuICBpZDogbnVtYmVyO1xuICBwYXQ6IG51bWJlcjtcbiAgcGFsMjogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwYWwzOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHBhdEJhbms6IG51bWJlciB8IHVuZGVmaW5lZDtcbn1cblxuLy8gQSBwb29sIG9mIG1vbnN0ZXIgc3Bhd25zLCBidWlsdCB1cCBmcm9tIHRoZSBsb2NhdGlvbnMgaW4gdGhlIHJvbS5cbi8vIFBhc3NlcyB0aHJvdWdoIHRoZSBsb2NhdGlvbnMgdHdpY2UsIGZpcnN0IHRvIGJ1aWxkIGFuZCB0aGVuIHRvXG4vLyByZWFzc2lnbiBtb25zdGVycy5cbmNsYXNzIE1vbnN0ZXJQb29sIHtcblxuICAvLyBhdmFpbGFibGUgbW9uc3RlcnNcbiAgcmVhZG9ubHkgbW9uc3RlcnM6IE1vbnN0ZXJDb25zdHJhaW50W10gPSBbXTtcbiAgLy8gdXNlZCBtb25zdGVycyAtIGFzIGEgYmFja3VwIGlmIG5vIGF2YWlsYWJsZSBtb25zdGVycyBmaXRcbiAgcmVhZG9ubHkgdXNlZDogTW9uc3RlckNvbnN0cmFpbnRbXSA9IFtdO1xuICAvLyBhbGwgbG9jYXRpb25zXG4gIHJlYWRvbmx5IGxvY2F0aW9uczoge2xvY2F0aW9uOiBMb2NhdGlvbiwgc2xvdHM6IG51bWJlcltdfVtdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBmbGFnczogRmxhZ1NldCxcbiAgICAgIHJlYWRvbmx5IHJlcG9ydDoge1tsb2M6IG51bWJlcl06IHN0cmluZ1tdLCBba2V5OiBzdHJpbmddOiAoc3RyaW5nfG51bWJlcilbXX0pIHt9XG5cbiAgLy8gVE9ETyAtIG1vbnN0ZXJzIHcvIHByb2plY3RpbGVzIG1heSBoYXZlIGEgc3BlY2lmaWMgYmFuayB0aGV5IG5lZWQgdG8gYXBwZWFyIGluLFxuICAvLyBzaW5jZSB0aGUgcHJvamVjdGlsZSBkb2Vzbid0IGtub3cgd2hlcmUgaXQgY2FtZSBmcm9tLi4uP1xuICAvLyAgIC0gZm9yIG5vdywganVzdCBhc3N1bWUgaWYgaXQgaGFzIGEgY2hpbGQgdGhlbiBpdCBtdXN0IGtlZXAgc2FtZSBwYXR0ZXJuIGJhbmshXG5cbiAgcG9wdWxhdGUobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgY29uc3Qge21heEZseWVycyA9IDAsXG4gICAgICAgICAgIG5vbkZseWVycyA9IHt9LFxuICAgICAgICAgICBza2lwID0gZmFsc2UsXG4gICAgICAgICAgIHRvd2VyID0gZmFsc2UsXG4gICAgICAgICAgIGZpeGVkU2xvdHMgPSB7fSxcbiAgICAgICAgICAgLi4udW5leHBlY3RlZH0gPSBNT05TVEVSX0FESlVTVE1FTlRTW2xvY2F0aW9uLmlkXSB8fCB7fTtcbiAgICBmb3IgKGNvbnN0IHUgb2YgT2JqZWN0LmtleXModW5leHBlY3RlZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5leHBlY3RlZCBwcm9wZXJ0eSAnJHt1fScgaW4gTU9OU1RFUl9BREpVU1RNRU5UU1ske2xvY2F0aW9uLmlkfV1gKTtcbiAgICB9XG4gICAgY29uc3Qgc2tpcE1vbnN0ZXJzID1cbiAgICAgICAgKHNraXAgPT09IHRydWUgfHxcbiAgICAgICAgICAgICghdGhpcy5mbGFncy5zaHVmZmxlVG93ZXJNb25zdGVycygpICYmIHRvd2VyKSB8fFxuICAgICAgICAgICAgIWxvY2F0aW9uLnNwcml0ZVBhdHRlcm5zIHx8XG4gICAgICAgICAgICAhbG9jYXRpb24uc3ByaXRlUGFsZXR0ZXMpO1xuICAgIGNvbnN0IG1vbnN0ZXJzID0gW107XG4gICAgbGV0IHNsb3RzID0gW107XG4gICAgLy8gY29uc3QgY29uc3RyYWludHMgPSB7fTtcbiAgICAvLyBsZXQgdHJlYXN1cmVDaGVzdCA9IGZhbHNlO1xuICAgIGxldCBzbG90ID0gMHgwYztcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHNraXBNb25zdGVycyA/IFtdIDogbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICArK3Nsb3Q7XG4gICAgICBpZiAoIXNwYXduLnVzZWQgfHwgIXNwYXduLmlzTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlkID0gc3Bhd24ubW9uc3RlcklkO1xuICAgICAgaWYgKGlkIGluIFVOVE9VQ0hFRF9NT05TVEVSUyB8fCAhU0NBTEVEX01PTlNURVJTLmhhcyhpZCkgfHxcbiAgICAgICAgICBTQ0FMRURfTU9OU1RFUlMuZ2V0KGlkKSEudHlwZSAhPT0gJ20nKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG9iamVjdCA9IGxvY2F0aW9uLnJvbS5vYmplY3RzW2lkXTtcbiAgICAgIGlmICghb2JqZWN0KSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHBhdEJhbmsgPSBzcGF3bi5wYXR0ZXJuQmFuaztcbiAgICAgIGNvbnN0IHBhdCA9IGxvY2F0aW9uLnNwcml0ZVBhdHRlcm5zW3BhdEJhbmtdO1xuICAgICAgY29uc3QgcGFsID0gb2JqZWN0LnBhbGV0dGVzKHRydWUpO1xuICAgICAgY29uc3QgcGFsMiA9IHBhbC5pbmNsdWRlcygyKSA/IGxvY2F0aW9uLnNwcml0ZVBhbGV0dGVzWzBdIDogdW5kZWZpbmVkO1xuICAgICAgY29uc3QgcGFsMyA9IHBhbC5pbmNsdWRlcygzKSA/IGxvY2F0aW9uLnNwcml0ZVBhbGV0dGVzWzFdIDogdW5kZWZpbmVkO1xuICAgICAgbW9uc3RlcnMucHVzaCh7aWQsIHBhdCwgcGFsMiwgcGFsMywgcGF0QmFua30pO1xuICAgICAgKHRoaXMucmVwb3J0W2BzdGFydC0ke2lkLnRvU3RyaW5nKDE2KX1gXSA9IHRoaXMucmVwb3J0W2BzdGFydC0ke2lkLnRvU3RyaW5nKDE2KX1gXSB8fCBbXSlcbiAgICAgICAgICAucHVzaCgnJCcgKyBsb2NhdGlvbi5pZC50b1N0cmluZygxNikpO1xuICAgICAgc2xvdHMucHVzaChzbG90KTtcbiAgICB9XG4gICAgaWYgKCFtb25zdGVycy5sZW5ndGggfHwgc2tpcCkgc2xvdHMgPSBbXTtcbiAgICB0aGlzLmxvY2F0aW9ucy5wdXNoKHtsb2NhdGlvbiwgc2xvdHN9KTtcbiAgICBpZiAodGhpcy5mbGFncy5zaHVmZmxlVG93ZXJNb25zdGVycygpID09PSB0b3dlcikge1xuICAgICAgdGhpcy5tb25zdGVycy5wdXNoKC4uLm1vbnN0ZXJzKTtcbiAgICB9XG4gIH1cblxuICBzaHVmZmxlKHJhbmRvbTogUmFuZG9tLCBncmFwaGljczogR3JhcGhpY3MpIHtcbiAgICB0aGlzLnJlcG9ydFsncHJlLXNodWZmbGUgbG9jYXRpb25zJ10gPSB0aGlzLmxvY2F0aW9ucy5tYXAobCA9PiBsLmxvY2F0aW9uLmlkKTtcbiAgICB0aGlzLnJlcG9ydFsncHJlLXNodWZmbGUgbW9uc3RlcnMnXSA9IHRoaXMubW9uc3RlcnMubWFwKG0gPT4gbS5pZCk7XG4gICAgcmFuZG9tLnNodWZmbGUodGhpcy5sb2NhdGlvbnMpO1xuICAgIHJhbmRvbS5zaHVmZmxlKHRoaXMubW9uc3RlcnMpO1xuICAgIHRoaXMucmVwb3J0Wydwb3N0LXNodWZmbGUgbG9jYXRpb25zJ10gPSB0aGlzLmxvY2F0aW9ucy5tYXAobCA9PiBsLmxvY2F0aW9uLmlkKTtcbiAgICB0aGlzLnJlcG9ydFsncG9zdC1zaHVmZmxlIG1vbnN0ZXJzJ10gPSB0aGlzLm1vbnN0ZXJzLm1hcChtID0+IG0uaWQpO1xuICAgIHdoaWxlICh0aGlzLmxvY2F0aW9ucy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHtsb2NhdGlvbiwgc2xvdHN9ID0gdGhpcy5sb2NhdGlvbnMucG9wKCkhO1xuICAgICAgY29uc3QgcmVwb3J0OiBzdHJpbmdbXSA9IHRoaXMucmVwb3J0WyckJyArIGxvY2F0aW9uLmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpXSA9IFtdO1xuICAgICAgY29uc3Qge21heEZseWVycyA9IDAsIG5vbkZseWVycyA9IHt9LCB0b3dlciA9IGZhbHNlfSA9XG4gICAgICAgICAgICBNT05TVEVSX0FESlVTVE1FTlRTW2xvY2F0aW9uLmlkXSB8fCB7fTtcbiAgICAgIGlmICh0b3dlcikgY29udGludWU7XG4gICAgICBsZXQgZmx5ZXJzID0gbWF4Rmx5ZXJzOyAvLyBjb3VudCBkb3duLi4uXG5cbiAgICAgIC8vIERldGVybWluZSBsb2NhdGlvbiBjb25zdHJhaW50c1xuICAgICAgbGV0IGNvbnN0cmFpbnQgPSBDb25zdHJhaW50LmZvckxvY2F0aW9uKGxvY2F0aW9uLmlkKTtcbiAgICAgIGlmIChsb2NhdGlvbi5ib3NzSWQoKSAhPSBudWxsKSB7XG4gICAgICAgIC8vIE5vdGUgdGhhdCBib3NzZXMgYWx3YXlzIGxlYXZlIGNoZXN0cy5cbiAgICAgICAgLy8gVE9ETyAtIGl0J3MgcG9zc2libGUgdGhpcyBpcyBvdXQgb2Ygb3JkZXIgdy5yLnQuIHdyaXRpbmcgdGhlIGJvc3M/XG4gICAgICAgIC8vICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5CT1NTLCB0cnVlKTtcbiAgICAgICAgLy8gTk9URTogdGhpcyBkb2VzIG5vdCB3b3JrIGZvciAoZS5nLikgbWFkbyAxLCB3aGVyZSBhenRlY2EgcmVxdWlyZXNcbiAgICAgICAgLy8gNTMgd2hpY2ggaXMgbm90IGEgY29tcGF0aWJsZSBjaGVzdCBwYWdlLlxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzQ2hlc3QoKSAmJiAhc3Bhd24uaXNJbnZpc2libGUoKSkge1xuICAgICAgICAgIGlmIChzcGF3bi5pZCA8IDB4NzApIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5UUkVBU1VSRV9DSEVTVCwgdHJ1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5NSU1JQywgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkgfHwgc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgICBjb25zdCBjID0gZ3JhcGhpY3MuZ2V0TnBjQ29uc3RyYWludChsb2NhdGlvbi5pZCwgc3Bhd24uaWQpO1xuICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoYywgdHJ1ZSk7XG4gICAgICAgICAgaWYgKHNwYXduLmlzTnBjKCkgJiYgKHNwYXduLmlkID09PSAweDZiIHx8IHNwYXduLmlkID09PSAweDY4KSkge1xuICAgICAgICAgICAgLy8gc2xlZXBpbmcga2Vuc3UgKDZiKSBsZWF2ZXMgYmVoaW5kIGEgdHJlYXN1cmUgY2hlc3RcbiAgICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5LRU5TVV9DSEVTVCwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIFVOVE9VQ0hFRF9NT05TVEVSU1tzcGF3bi5tb25zdGVySWRdKSB7XG4gICAgICAgICAgY29uc3QgYyA9IGdyYXBoaWNzLmdldE1vbnN0ZXJDb25zdHJhaW50KGxvY2F0aW9uLmlkLCBzcGF3bi5tb25zdGVySWQpO1xuICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoYywgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNTaG9vdGluZ1dhbGwobG9jYXRpb24pKSB7XG4gICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChDb25zdHJhaW50LlNIT09USU5HX1dBTEwsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJlcG9ydC5wdXNoKGBJbml0aWFsIHBhc3M6ICR7Y29uc3RyYWludC5maXhlZC5tYXAocz0+cy5zaXplPEluZmluaXR5PydbJytbLi4uc10uam9pbignLCAnKSsnXSc6J2FsbCcpfWApO1xuXG4gICAgICBjb25zdCBjbGFzc2VzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICAgIGNvbnN0IHRyeUFkZE1vbnN0ZXIgPSAobTogTW9uc3RlckNvbnN0cmFpbnQpID0+IHtcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IGxvY2F0aW9uLnJvbS5vYmplY3RzW20uaWRdIGFzIE1vbnN0ZXI7XG4gICAgICAgIGlmIChtb25zdGVyLm1vbnN0ZXJDbGFzcykge1xuICAgICAgICAgIGNvbnN0IHJlcHJlc2VudGF0aXZlID0gY2xhc3Nlcy5nZXQobW9uc3Rlci5tb25zdGVyQ2xhc3MpO1xuICAgICAgICAgIGlmIChyZXByZXNlbnRhdGl2ZSAhPSBudWxsICYmIHJlcHJlc2VudGF0aXZlICE9PSBtLmlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZmx5ZXIgPSBGTFlFUlMuaGFzKG0uaWQpO1xuICAgICAgICBjb25zdCBtb3RoID0gTU9USFNfQU5EX0JBVFMuaGFzKG0uaWQpO1xuICAgICAgICBpZiAoZmx5ZXIpIHtcbiAgICAgICAgICAvLyBUT0RPIC0gYWRkIGEgc21hbGwgcHJvYmFiaWxpdHkgb2YgYWRkaW5nIGl0IGFueXdheSwgbWF5YmVcbiAgICAgICAgICAvLyBiYXNlZCBvbiB0aGUgbWFwIGFyZWE/ICAyNSBzZWVtcyBhIGdvb2QgdGhyZXNob2xkLlxuICAgICAgICAgIGlmICghZmx5ZXJzKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgLS1mbHllcnM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYyA9IGdyYXBoaWNzLmdldE1vbnN0ZXJDb25zdHJhaW50KGxvY2F0aW9uLmlkLCBtLmlkKTtcbiAgICAgICAgbGV0IG1lZXQgPSBjb25zdHJhaW50LnRyeU1lZXQoYyk7XG4gICAgICAgIGlmICghbWVldCAmJiBjb25zdHJhaW50LnBhbDIuc2l6ZSA8IEluZmluaXR5ICYmIGNvbnN0cmFpbnQucGFsMy5zaXplIDwgSW5maW5pdHkpIHtcbiAgICAgICAgICBpZiAodGhpcy5mbGFncy5zaHVmZmxlU3ByaXRlUGFsZXR0ZXMoKSkge1xuICAgICAgICAgICAgbWVldCA9IGNvbnN0cmFpbnQudHJ5TWVldChjLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtZWV0KSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgLy8gRmlndXJlIG91dCBlYXJseSBpZiB0aGUgbW9uc3RlciBpcyBwbGFjZWFibGUuXG4gICAgICAgIGxldCBwb3M6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG1vbnN0ZXJQbGFjZXIpIHtcbiAgICAgICAgICBjb25zdCBtb25zdGVyID0gbG9jYXRpb24ucm9tLm9iamVjdHNbbS5pZF07XG4gICAgICAgICAgaWYgKCEobW9uc3RlciBpbnN0YW5jZW9mIE1vbnN0ZXIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vbi1tb25zdGVyOiAke21vbnN0ZXJ9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBvcyA9IG1vbnN0ZXJQbGFjZXIobW9uc3Rlcik7XG4gICAgICAgICAgaWYgKHBvcyA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXBvcnQucHVzaChgICBBZGRpbmcgJHttLmlkLnRvU3RyaW5nKDE2KX06ICR7bWVldH1gKTtcbiAgICAgICAgY29uc3RyYWludCA9IG1lZXQ7XG5cbiAgICAgICAgLy8gUGljayB0aGUgc2xvdCBvbmx5IGFmdGVyIHdlIGtub3cgZm9yIHN1cmUgdGhhdCBpdCB3aWxsIGZpdC5cbiAgICAgICAgaWYgKG1vbnN0ZXIubW9uc3RlckNsYXNzKSBjbGFzc2VzLnNldChtb25zdGVyLm1vbnN0ZXJDbGFzcywgbS5pZClcbiAgICAgICAgbGV0IGVsaWdpYmxlID0gMDtcbiAgICAgICAgaWYgKGZseWVyIHx8IG1vdGgpIHtcbiAgICAgICAgICAvLyBsb29rIGZvciBhIGZseWVyIHNsb3QgaWYgcG9zc2libGUuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzbG90cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNsb3RzW2ldIGluIG5vbkZseWVycykge1xuICAgICAgICAgICAgICBlbGlnaWJsZSA9IGk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBQcmVmZXIgbm9uLWZseWVyIHNsb3RzLCBidXQgYWRqdXN0IGlmIHdlIGdldCBhIGZseWVyLlxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2xvdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzbG90c1tpXSBpbiBub25GbHllcnMpIGNvbnRpbnVlO1xuICAgICAgICAgICAgZWxpZ2libGUgPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICh0aGlzLnJlcG9ydFtgbW9uLSR7bS5pZC50b1N0cmluZygxNil9YF0gPSB0aGlzLnJlcG9ydFtgbW9uLSR7bS5pZC50b1N0cmluZygxNil9YF0gfHwgW10pXG4gICAgICAgICAgICAucHVzaCgnJCcgKyBsb2NhdGlvbi5pZC50b1N0cmluZygxNikpO1xuICAgICAgICBjb25zdCBzbG90ID0gc2xvdHNbZWxpZ2libGVdO1xuICAgICAgICBjb25zdCBzcGF3biA9IGxvY2F0aW9uLnNwYXduc1tzbG90IC0gMHgwZF07XG4gICAgICAgIGlmIChtb25zdGVyUGxhY2VyKSB7IC8vIHBvcyA9PSBudWxsIHJldHVybmVkIGZhbHNlIGVhcmxpZXJcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSBwb3MhID4+PiA4O1xuICAgICAgICAgIHNwYXduLnRpbGUgPSBwb3MhICYgMHhmZjtcbiAgICAgICAgfSBlbHNlIGlmIChzbG90IGluIG5vbkZseWVycykge1xuICAgICAgICAgIHNwYXduLnkgKz0gbm9uRmx5ZXJzW3Nsb3RdWzBdICogMTY7XG4gICAgICAgICAgc3Bhd24ueCArPSBub25GbHllcnNbc2xvdF1bMV0gKiAxNjtcbiAgICAgICAgfVxuICAgICAgICBzcGF3bi5tb25zdGVySWQgPSBtLmlkO1xuICAgICAgICByZXBvcnQucHVzaChgICAgIHNsb3QgJHtzbG90LnRvU3RyaW5nKDE2KX06ICR7c3Bhd259YCk7XG5cbiAgICAgICAgLy8gVE9ETyAtIGFueXRoaW5nIGVsc2UgbmVlZCBzcGxpY2luZz9cblxuICAgICAgICBzbG90cy5zcGxpY2UoZWxpZ2libGUsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIC8vIEZvciBlYWNoIGxvY2F0aW9uLi4uLiB0cnkgdG8gZmlsbCB1cCB0aGUgc2xvdHNcbiAgICAgIGNvbnN0IG1vbnN0ZXJQbGFjZXIgPVxuICAgICAgICAgIHNsb3RzLmxlbmd0aCAmJiB0aGlzLmZsYWdzLnJhbmRvbWl6ZU1hcHMoKSA/XG4gICAgICAgICAgICAgIGxvY2F0aW9uLm1vbnN0ZXJQbGFjZXIocmFuZG9tKSA6IG51bGw7XG5cbiAgICAgIGlmIChmbHllcnMgJiYgc2xvdHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIGxvb2sgZm9yIGFuIGVsaWdpYmxlIGZseWVyIGluIHRoZSBmaXJzdCA0MC4gIElmIGl0J3MgdGhlcmUsIGFkZCBpdCBmaXJzdC5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbig0MCwgdGhpcy5tb25zdGVycy5sZW5ndGgpOyBpKyspIHtcbiAgICAgICAgICBpZiAoRkxZRVJTLmhhcyh0aGlzLm1vbnN0ZXJzW2ldLmlkKSkge1xuICAgICAgICAgICAgaWYgKHRyeUFkZE1vbnN0ZXIodGhpcy5tb25zdGVyc1tpXSkpIHtcbiAgICAgICAgICAgICAgdGhpcy5tb25zdGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHJhbmRvbS5zaHVmZmxlKHRoaXMubW9uc3RlcnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbWF5YmUgYWRkZWQgYSBzaW5nbGUgZmx5ZXIsIHRvIG1ha2Ugc3VyZSB3ZSBkb24ndCBydW4gb3V0LiAgTm93IGp1c3Qgd29yayBub3JtYWxseVxuXG4gICAgICAgIC8vIGRlY2lkZSBpZiB3ZSdyZSBnb2luZyB0byBhZGQgYW55IGZseWVycy5cblxuICAgICAgICAvLyBhbHNvIGNvbnNpZGVyIGFsbG93aW5nIGEgc2luZ2xlIHJhbmRvbSBmbHllciB0byBiZSBhZGRlZCBvdXQgb2YgYmFuZCBpZlxuICAgICAgICAvLyB0aGUgc2l6ZSBvZiB0aGUgbWFwIGV4Y2VlZHMgMjU/XG5cbiAgICAgICAgLy8gcHJvYmFibHkgZG9uJ3QgYWRkIGZseWVycyB0byB1c2VkP1xuXG4gICAgICB9XG5cbiAgICAgIC8vIGl0ZXJhdGUgb3ZlciBtb25zdGVycyB1bnRpbCB3ZSBmaW5kIG9uZSB0aGF0J3MgYWxsb3dlZC4uLlxuICAgICAgLy8gTk9URTogZmlsbCB0aGUgbm9uLWZseWVyIHNsb3RzIGZpcnN0IChleGNlcHQgaWYgd2UgcGljayBhIGZseWVyPz8pXG4gICAgICAvLyAgIC0gbWF5IG5lZWQgdG8gd2VpZ2h0IGZseWVycyBzbGlnaHRseSBoaWdoZXIgb3IgZmlsbCB0aGVtIGRpZmZlcmVudGx5P1xuICAgICAgLy8gICAgIG90aGVyd2lzZSB3ZSdsbCBsaWtlbHkgbm90IGdldCB0aGVtIHdoZW4gd2UncmUgYWxsb3dlZC4uLj9cbiAgICAgIC8vICAgLSBvciBqdXN0IGRvIHRoZSBub24tZmx5ZXIgKmxvY2F0aW9ucyogZmlyc3Q/XG4gICAgICAvLyAtIG9yIGp1c3QgZmlsbCB1cCBmbHllcnMgdW50aWwgd2UgcnVuIG91dC4uLiAxMDAlIGNoYW5jZSBvZiBmaXJzdCBmbHllcixcbiAgICAgIC8vICAgNTAlIGNoYW5jZSBvZiBnZXR0aW5nIGEgc2Vjb25kIGZseWVyIGlmIGFsbG93ZWQuLi5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5tb25zdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIXNsb3RzLmxlbmd0aCkgYnJlYWs7XG4gICAgICAgIGlmICh0cnlBZGRNb25zdGVyKHRoaXMubW9uc3RlcnNbaV0pKSB7XG4gICAgICAgICAgY29uc3QgW3VzZWRdID0gdGhpcy5tb25zdGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgaWYgKCFGTFlFUlMuaGFzKHVzZWQuaWQpKSB0aGlzLnVzZWQucHVzaCh1c2VkKTtcbiAgICAgICAgICBpLS07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gYmFja3VwIGxpc3RcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy51c2VkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICghc2xvdHMubGVuZ3RoKSBicmVhaztcbiAgICAgICAgaWYgKHRyeUFkZE1vbnN0ZXIodGhpcy51c2VkW2ldKSkge1xuICAgICAgICAgIHRoaXMudXNlZC5wdXNoKC4uLnRoaXMudXNlZC5zcGxpY2UoaSwgMSkpO1xuICAgICAgICAgIGktLTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3RyYWludC5maXgobG9jYXRpb24sIHJhbmRvbSk7XG5cbiAgICAgIGlmIChzbG90cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc29sZS5lcnJvci8qcmVwb3J0LnB1c2gqLyhgRmFpbGVkIHRvIGZpbGwgbG9jYXRpb24gJHtsb2NhdGlvbi5pZC50b1N0cmluZygxNil9OiAke3Nsb3RzLmxlbmd0aH0gcmVtYWluaW5nYCk7XG4gICAgICAgIGZvciAoY29uc3Qgc2xvdCBvZiBzbG90cykge1xuICAgICAgICAgIGNvbnN0IHNwYXduID0gbG9jYXRpb24uc3Bhd25zW3Nsb3QgLSAweDBkXTtcbiAgICAgICAgICBzcGF3bi54ID0gc3Bhd24ueSA9IDA7XG4gICAgICAgICAgc3Bhd24uaWQgPSAweGIwO1xuICAgICAgICAgIHNwYXduLmRhdGFbMF0gPSAweGZlOyAvLyBpbmRpY2F0ZSB1bnVzZWRcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgICAgZ3JhcGhpY3MuY29uZmlndXJlKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IEZMWUVSUzogU2V0PG51bWJlcj4gPSBuZXcgU2V0KFsweDU5LCAweDVjLCAweDZlLCAweDZmLCAweDgxLCAweDhhLCAweGEzLCAweGM0XSk7XG5jb25zdCBNT1RIU19BTkRfQkFUUzogU2V0PG51bWJlcj4gPSBuZXcgU2V0KFsweDU1LCAvKiBzd2FtcCBwbGFudCAqLyAweDVkLCAweDdjLCAweGJjLCAweGMxXSk7XG4vLyBjb25zdCBTV0lNTUVSUzogU2V0PG51bWJlcj4gPSBuZXcgU2V0KFsweDc1LCAweDc2XSk7XG4vLyBjb25zdCBTVEFUSU9OQVJZOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoWzB4NzcsIDB4ODddKTsgIC8vIGtyYWtlbiwgc29yY2Vyb3JcblxuaW50ZXJmYWNlIE1vbnN0ZXJBZGp1c3RtZW50IHtcbiAgbWF4Rmx5ZXJzPzogbnVtYmVyO1xuICBza2lwPzogYm9vbGVhbjtcbiAgdG93ZXI/OiBib29sZWFuO1xuICBmaXhlZFNsb3RzPzoge3BhdDA/OiBudW1iZXIsIHBhdDE/OiBudW1iZXIsIHBhbDI/OiBudW1iZXIsIHBhbDM/OiBudW1iZXJ9O1xuICBub25GbHllcnM/OiB7W2lkOiBudW1iZXJdOiBbbnVtYmVyLCBudW1iZXJdfTtcbn1cbmNvbnN0IE1PTlNURVJfQURKVVNUTUVOVFM6IHtbbG9jOiBudW1iZXJdOiBNb25zdGVyQWRqdXN0bWVudH0gPSB7XG4gIFsweDAzXTogeyAvLyBWYWxsZXkgb2YgV2luZFxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhdDE6IDB4NjAsIC8vIHJlcXVpcmVkIGJ5IHdpbmRtaWxsXG4gICAgfSxcbiAgICBtYXhGbHllcnM6IDIsXG4gIH0sXG4gIFsweDA3XTogeyAvLyBTZWFsZWQgQ2F2ZSA0XG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZl06IFswLCAtM10sICAvLyBiYXRcbiAgICAgIFsweDEwXTogWy0xMCwgMF0sIC8vIGJhdFxuICAgICAgWzB4MTFdOiBbMCwgNF0sICAgLy8gYmF0XG4gICAgfSxcbiAgfSxcbiAgWzB4MTRdOiB7IC8vIENvcmRlbCBXZXN0XG4gICAgbWF4Rmx5ZXJzOiAyLFxuICB9LFxuICBbMHgxNV06IHsgLy8gQ29yZGVsIEVhc3RcbiAgICBtYXhGbHllcnM6IDIsXG4gIH0sXG4gIFsweDFhXTogeyAvLyBTd2FtcFxuICAgIC8vIHNraXA6ICdhZGQnLFxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhbDM6IDB4MjMsXG4gICAgICBwYXQxOiAweDRmLFxuICAgIH0sXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczogeyAvLyBUT0RPIC0gbWlnaHQgYmUgbmljZSB0byBrZWVwIHB1ZmZzIHdvcmtpbmc/XG4gICAgICBbMHgxMF06IFs0LCAwXSxcbiAgICAgIFsweDExXTogWzUsIDBdLFxuICAgICAgWzB4MTJdOiBbNCwgMF0sXG4gICAgICBbMHgxM106IFs1LCAwXSxcbiAgICAgIFsweDE0XTogWzQsIDBdLFxuICAgICAgWzB4MTVdOiBbNCwgMF0sXG4gICAgfSxcbiAgfSxcbiAgWzB4MWJdOiB7IC8vIEFtYXpvbmVzXG4gICAgLy8gUmFuZG9tIGJsdWUgc2xpbWUgc2hvdWxkIGJlIGlnbm9yZWRcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHgyMF06IHsgLy8gTXQgU2FicmUgV2VzdCBMb3dlclxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4MjFdOiB7IC8vIE10IFNhYnJlIFdlc3QgVXBwZXJcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYXQxOiAweDUwLFxuICAgICAgLy8gcGFsMjogMHgwNiwgLy8gbWlnaHQgYmUgZmluZSB0byBjaGFuZ2UgdG9ybmVsJ3MgY29sb3IuLi5cbiAgICB9LFxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4MjddOiB7IC8vIE10IFNhYnJlIFdlc3QgQ2F2ZSA3XG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFswLCAweDEwXSwgLy8gcmFuZG9tIGVuZW15IHN0dWNrIGluIHdhbGxcbiAgICB9LFxuICB9LFxuICBbMHgyOF06IHsgLy8gTXQgU2FicmUgTm9ydGggTWFpblxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4MjldOiB7IC8vIE10IFNhYnJlIE5vcnRoIE1pZGRsZVxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4MmJdOiB7IC8vIE10IFNhYnJlIE5vcnRoIENhdmUgMlxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTRdOiBbMHgyMCwgLThdLCAvLyBiYXRcbiAgICB9LFxuICB9LFxuICBbMHg0MF06IHsgLy8gV2F0ZXJmYWxsIFZhbGxleSBOb3J0aFxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDEzXTogWzEyLCAtMHgxMF0sIC8vIG1lZHVzYSBoZWFkXG4gICAgfSxcbiAgfSxcbiAgWzB4NDFdOiB7IC8vIFdhdGVyZmFsbCBWYWxsZXkgU291dGhcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNV06IFswLCAtNl0sIC8vIG1lZHVzYSBoZWFkXG4gICAgfSxcbiAgfSxcbiAgWzB4NDJdOiB7IC8vIExpbWUgVHJlZSBWYWxsZXlcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFswLCA4XSwgLy8gZXZpbCBiaXJkXG4gICAgICBbMHgwZV06IFstOCwgOF0sIC8vIGV2aWwgYmlyZFxuICAgIH0sXG4gIH0sXG4gIFsweDQ3XTogeyAvLyBLaXJpc2EgTWVhZG93XG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGRdOiBbLTgsIC04XSxcbiAgICB9LFxuICB9LFxuICBbMHg0YV06IHsgLy8gRm9nIExhbXAgQ2F2ZSAzXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGVdOiBbNCwgMF0sICAvLyBiYXRcbiAgICAgIFsweDBmXTogWzAsIC0zXSwgLy8gYmF0XG4gICAgICBbMHgxMF06IFswLCA0XSwgIC8vIGJhdFxuICAgIH0sXG4gIH0sXG4gIFsweDRjXTogeyAvLyBGb2cgTGFtcCBDYXZlIDRcbiAgICAvLyBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDRkXTogeyAvLyBGb2cgTGFtcCBDYXZlIDVcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDRlXTogeyAvLyBGb2cgTGFtcCBDYXZlIDZcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDRmXTogeyAvLyBGb2cgTGFtcCBDYXZlIDdcbiAgICAvLyBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDU3XTogeyAvLyBXYXRlcmZhbGwgQ2F2ZSA0XG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGF0MTogMHg0ZCxcbiAgICB9LFxuICB9LFxuICBbMHg1OV06IHsgLy8gVG93ZXIgRmxvb3IgMVxuICAgIC8vIHNraXA6IHRydWUsXG4gICAgdG93ZXI6IHRydWUsXG4gIH0sXG4gIFsweDVhXTogeyAvLyBUb3dlciBGbG9vciAyXG4gICAgLy8gc2tpcDogdHJ1ZSxcbiAgICB0b3dlcjogdHJ1ZSxcbiAgfSxcbiAgWzB4NWJdOiB7IC8vIFRvd2VyIEZsb29yIDNcbiAgICAvLyBza2lwOiB0cnVlLFxuICAgIHRvd2VyOiB0cnVlLFxuICB9LFxuICBbMHg2MF06IHsgLy8gQW5ncnkgU2VhXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGFsMzogMHgwOCxcbiAgICAgIHBhdDE6IDB4NTIsIC8vIChhcyBvcHBvc2VkIHRvIHBhdDApXG4gICAgfSxcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgc2tpcDogdHJ1ZSwgLy8gbm90IHN1cmUgaG93IHRvIHJhbmRvbWl6ZSB0aGVzZSB3ZWxsXG4gIH0sXG4gIFsweDY0XTogeyAvLyBVbmRlcmdyb3VuZCBDaGFubmVsXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGFsMzogMHgwOCxcbiAgICAgIHBhdDE6IDB4NTIsIC8vIChhcyBvcHBvc2VkIHRvIHBhdDApXG4gICAgfSxcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHg2OF06IHsgLy8gRXZpbCBTcGlyaXQgSXNsYW5kIDFcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYWwzOiAweDA4LFxuICAgICAgcGF0MTogMHg1MiwgLy8gKGFzIG9wcG9zZWQgdG8gcGF0MClcbiAgICB9LFxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweDY5XTogeyAvLyBFdmlsIFNwaXJpdCBJc2xhbmQgMlxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE3XTogWzQsIDZdLCAgLy8gbWVkdXNhIGhlYWRcbiAgICB9LFxuICB9LFxuICBbMHg2YV06IHsgLy8gRXZpbCBTcGlyaXQgSXNsYW5kIDNcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNV06IFswLCAweDE4XSwgIC8vIG1lZHVzYSBoZWFkXG4gICAgfSxcbiAgfSxcbiAgWzB4NmNdOiB7IC8vIFNhYmVyYSBQYWxhY2UgMVxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE3XTogWzAsIDB4MThdLCAvLyBldmlsIGJpcmRcbiAgICB9LFxuICB9LFxuICBbMHg2ZF06IHsgLy8gU2FiZXJhIFBhbGFjZSAyXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTFdOiBbMHgxMCwgMF0sIC8vIG1vdGhcbiAgICAgIFsweDFiXTogWzAsIDBdLCAgICAvLyBtb3RoIC0gb2sgYWxyZWFkeVxuICAgICAgWzB4MWNdOiBbNiwgMF0sICAgIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHg3OF06IHsgLy8gR29hIFZhbGxleVxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE2XTogWy04LCAtOF0sIC8vIGV2aWwgYmlyZFxuICAgIH0sXG4gIH0sXG4gIFsweDdjXTogeyAvLyBNdCBIeWRyYVxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE1XTogWy0weDI3LCAweDU0XSwgLy8gZXZpbCBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4ODRdOiB7IC8vIE10IEh5ZHJhIENhdmUgN1xuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTJdOiBbMCwgLTRdLFxuICAgICAgWzB4MTNdOiBbMCwgNF0sXG4gICAgICBbMHgxNF06IFstNiwgMF0sXG4gICAgICBbMHgxNV06IFsxNCwgMTJdLFxuICAgIH0sXG4gIH0sXG4gIFsweDg4XTogeyAvLyBTdHl4IDFcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDg5XTogeyAvLyBTdHl4IDJcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDhhXTogeyAvLyBTdHl4IDFcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFs3LCAwXSwgLy8gbW90aFxuICAgICAgWzB4MGVdOiBbMCwgMF0sIC8vIG1vdGggLSBva1xuICAgICAgWzB4MGZdOiBbNywgM10sIC8vIG1vdGhcbiAgICAgIFsweDEwXTogWzAsIDZdLCAvLyBtb3RoXG4gICAgICBbMHgxMV06IFsxMSwgLTB4MTBdLCAvLyBtb3RoXG4gICAgfSxcbiAgfSxcbiAgWzB4OGZdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIE9hc2lzIENhdmUgRW50cmFuY2VcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHg5MF06IHsgLy8gRGVzZXJ0IDFcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNF06IFstMHhiLCAtM10sIC8vIGJvbWJlciBiaXJkXG4gICAgICBbMHgxNV06IFswLCAweDEwXSwgIC8vIGJvbWJlciBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4OTFdOiB7IC8vIE9hc2lzIENhdmVcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxOF06IFswLCAxNF0sICAgIC8vIGluc2VjdFxuICAgICAgWzB4MTldOiBbNCwgLTB4MTBdLCAvLyBpbnNlY3RcbiAgICB9LFxuICB9LFxuICBbMHg5OF06IHsgLy8gRGVzZXJ0IDJcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNF06IFstNiwgNl0sICAgIC8vIGRldmlsXG4gICAgICBbMHgxNV06IFswLCAtMHgxMF0sIC8vIGRldmlsXG4gICAgfSxcbiAgfSxcbiAgWzB4OWVdOiB7IC8vIFB5cmFtaWQgRnJvbnQgLSBNYWluXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICB9LFxuICBbMHhhMl06IHsgLy8gUHlyYW1pZCBCYWNrIC0gQnJhbmNoXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTJdOiBbMCwgMTFdLCAvLyBtb3RoXG4gICAgICBbMHgxM106IFs2LCAwXSwgIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHhhNV06IHsgLy8gUHlyYW1pZCBCYWNrIC0gSGFsbCAyXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxN106IFs2LCA2XSwgICAvLyBtb3RoXG4gICAgICBbMHgxOF06IFstNiwgMF0sICAvLyBtb3RoXG4gICAgICBbMHgxOV06IFstMSwgLTddLCAvLyBtb3RoXG4gICAgfSxcbiAgfSxcbiAgWzB4YTZdOiB7IC8vIERyYXlnb24gMlxuICAgIC8vIEhhcyBhIGZldyBibHVlIHNsaW1lcyB0aGF0IGFyZW4ndCByZWFsIGFuZCBzaG91bGQgYmUgaWdub3JlZC5cbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHhhOF06IHsgLy8gR29hIEZvcnRyZXNzIC0gRW50cmFuY2VcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHhhOV06IHsgLy8gR29hIEZvcnRyZXNzIC0gS2VsYmVzcXVlXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTZdOiBbMHgxYSwgLTB4MTBdLCAvLyBkZXZpbFxuICAgICAgWzB4MTddOiBbMCwgMHgyMF0sICAgICAvLyBkZXZpbFxuICAgIH0sXG4gIH0sXG4gIFsweGFiXTogeyAvLyBHb2EgRm9ydHJlc3MgLSBTYWJlcmFcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFsxLCAwXSwgIC8vIGluc2VjdFxuICAgICAgWzB4MGVdOiBbMiwgLTJdLCAvLyBpbnNlY3RcbiAgICB9LFxuICB9LFxuXG4gIFsweGFkXTogeyAvLyBHb2EgRm9ydHJlc3MgLSBNYWRvIDFcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxOF06IFswLCA4XSwgIC8vIGRldmlsXG4gICAgICBbMHgxOV06IFswLCAtOF0sIC8vIGRldmlsXG4gICAgfSxcbiAgfSxcbiAgWzB4YWZdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIE1hZG8gM1xuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGRdOiBbMCwgMF0sICAvLyBtb3RoIC0gb2tcbiAgICAgIFsweDBlXTogWzAsIDBdLCAgLy8gYnJva2VuIC0gYnV0IHJlcGxhY2U/XG4gICAgICBbMHgxM106IFsweDNiLCAtMHgyNl0sIC8vIHNoYWRvdyAtIGVtYmVkZGVkIGluIHdhbGxcbiAgICAgIC8vIFRPRE8gLSAweDBlIGdsaXRjaGVkLCBkb24ndCByYW5kb21pemVcbiAgICB9LFxuICB9LFxuICBbMHhiNF06IHsgLy8gR29hIEZvcnRyZXNzIC0gS2FybWluZSA1XG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTFdOiBbNiwgMF0sICAvLyBtb3RoXG4gICAgICBbMHgxMl06IFswLCA2XSwgIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHhkN106IHsgLy8gUG9ydG9hIFBhbGFjZSAtIEVudHJ5XG4gICAgLy8gVGhlcmUncyBhIHJhbmRvbSBzbGltZSBpbiB0aGlzIHJvb20gdGhhdCB3b3VsZCBjYXVzZSBnbGl0Y2hlc1xuICAgIHNraXA6IHRydWUsXG4gIH0sXG59O1xuXG5jb25zdCBVTlRPVUNIRURfTU9OU1RFUlM6IHtbaWQ6IG51bWJlcl06IGJvb2xlYW59ID0geyAvLyBub3QgeWV0ICsweDUwIGluIHRoZXNlIGtleXNcbiAgWzB4N2VdOiB0cnVlLCAvLyB2ZXJ0aWNhbCBwbGF0Zm9ybVxuICBbMHg3Zl06IHRydWUsIC8vIGhvcml6b250YWwgcGxhdGZvcm1cbiAgWzB4ODNdOiB0cnVlLCAvLyBnbGl0Y2ggaW4gJDdjIChoeWRyYSlcbiAgWzB4OGRdOiB0cnVlLCAvLyBnbGl0Y2ggaW4gbG9jYXRpb24gJGFiIChzYWJlcmEgMikgLSBjcnVtYmxpbmcgaG9yaXpvbnRhbCBwbGF0Zm9ybVxuICBbMHg4ZV06IHRydWUsIC8vIGJyb2tlbj8sIGJ1dCBzaXRzIG9uIHRvcCBvZiBpcm9uIHdhbGxcbiAgWzB4OGZdOiB0cnVlLCAvLyBzaG9vdGluZyBzdGF0dWVcbiAgWzB4OWZdOiB0cnVlLCAvLyBjcnVtYmxpbmcgdmVydGljYWwgcGxhdGZvcm1cbiAgLy8gWzB4YTFdOiB0cnVlLCAvLyB3aGl0ZSB0b3dlciByb2JvdHNcbiAgWzB4YTZdOiB0cnVlLCAvLyBnbGl0Y2ggaW4gbG9jYXRpb24gJGFmIChtYWRvIDIpXG59O1xuXG5jb25zdCBzaHVmZmxlUmFuZG9tTnVtYmVycyA9IChyb206IFVpbnQ4QXJyYXksIHJhbmRvbTogUmFuZG9tKSA9PiB7XG4gIGNvbnN0IHRhYmxlID0gcm9tLnN1YmFycmF5KDB4MzU3ZTQgKyAweDEwLCAweDM1ODI0ICsgMHgxMCk7XG4gIHJhbmRvbS5zaHVmZmxlKHRhYmxlKTtcbn07XG5cbi8vIHVzZWZ1bCBmb3IgZGVidWcgZXZlbiBpZiBub3QgY3VycmVudGx5IHVzZWRcbmNvbnN0IFtdID0gW2hleF07XG4iXX0=