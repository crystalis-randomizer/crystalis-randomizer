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
import { shuffleMazes } from './pass/shufflemazes.js';
import { shufflePalettes } from './pass/shufflepalettes.js';
import { shuffleTrades } from './pass/shuffletrades.js';
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
        _EXTRA_EXTENDED_SCREENS: true,
        _EXTRA_PITY_MP: true,
        _FIX_COIN_SPRITES: true,
        _FIX_OPEL_STATUE: true,
        _FIX_SHAKING: true,
        _FIX_VAMPIRE: true,
        _HARDCORE_MODE: flags.hardcoreMode(),
        _HAZMAT_SUIT: flags.changeGasMaskToHazmatSuit(),
        _LEATHER_BOOTS_GIVE_SPEED: flags.leatherBootsGiveSpeed(),
        _MASSACRE_DOES_NOT_REQUIRE_THUNDER: true,
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
    await assemble('postparse.s');
    parsed.scalingLevels = 48;
    parsed.uniqueItemTableAddress = asm.expand('KeyItemData');
    if (flags.shuffleShops())
        shuffleShops(parsed, flags, random);
    randomizeWalls(parsed, flags, random);
    crumblingPlatforms(parsed, random);
    if (flags.randomizeWildWarp())
        shuffleWildWarp(parsed, flags, random);
    rescaleMonsters(parsed, flags, random);
    unidentifiedItems(parsed, flags, random);
    shuffleTrades(parsed, flags, random);
    if (flags.randomizeMaps())
        shuffleMazes(parsed, flags, random);
    parsed.compressMapData();
    parsed.moveScreens(parsed.metatilesets.swamp, 0x20);
    parsed.moveScreens(parsed.metatilesets.house, 0x21);
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
        if (l && l.used && l.id && !l.isShop() && (l.id & 0xf8) !== 0x58) {
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
    [0xa0, 'm', 'Ground Sentry (1)', 4, , 6, 26, , 73],
    [0xa1, 'm', 'Tower Defense Mech (2)', 5, , 8, 36, , 85],
    [0xa2, 'm', 'Tower Sentinel', , , 1, , , 32],
    [0xa3, 'm', 'Air Sentry', 3, , 2, 26, , 65],
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
        this.monsters.push(...monsters);
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
                    if (spawn.isNpc() && spawn.id === 0x6b) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwQyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2pDLE9BQU8sRUFDQyxRQUFRLElBQUksZ0JBQWdCLEVBQ0MsTUFBTSxlQUFlLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDckMsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsYUFBYSxFQUFFLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0UsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQzlDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRCxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDbkMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFDL0MsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBRTND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QUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7U0FFWDtRQUNELFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7U0FDbEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNuQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQztTQUNwQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNoQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2hCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDakI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNmLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUUsRUFFUDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFLEVBRVA7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7U0FDWDtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUVOLEtBQUssRUFBRSxJQUFJO0tBQ1o7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRU4sS0FBSyxFQUFFLElBQUk7S0FDWjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixLQUFLLEVBQUUsSUFBSTtLQUNaO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7U0FDWDtRQUNELFNBQVMsRUFBRSxDQUFDO1FBQ1osSUFBSSxFQUFFLElBQUk7S0FDWDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1NBQ1g7UUFDRCxJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7U0FDWDtRQUNELElBQUksRUFBRSxJQUFJO0tBQ1g7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNmO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztTQUNsQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7U0FDbEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2pCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDZjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2pCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO1NBQ3RCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNmLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNmLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ2pCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO1NBQ3BCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sSUFBSSxFQUFFLElBQUk7S0FDWDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztTQUNsQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDO1NBQ25CO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztTQUNuQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNmLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDakI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLElBQUksRUFBRSxJQUFJO0tBQ1g7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO1lBQ3JCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1NBQ2xCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDaEI7S0FDRjtJQUVELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNoQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO1NBRXRCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixJQUFJLEVBQUUsSUFBSTtLQUNYO0NBQ0YsQ0FBQztBQUVGLE1BQU0sa0JBQWtCLEdBQTRCO0lBQ2xELENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUVaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtDQUNiLENBQUM7QUFFRixNQUFNLG9CQUFvQixHQUFHLENBQUMsR0FBZSxFQUFFLE1BQWMsRUFBRSxFQUFFO0lBQy9ELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUM7QUFHRixNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vNjUwMi5qcyc7XG5pbXBvcnQge2NyYzMyfSBmcm9tICcuL2NyYzMyLmpzJztcbmltcG9ydCB7UHJvZ3Jlc3NUcmFja2VyLFxuICAgICAgICBnZW5lcmF0ZSBhcyBnZW5lcmF0ZURlcGdyYXBoLFxuICAgICAgICBzaHVmZmxlMiBhcyBfc2h1ZmZsZURlcGdyYXBofSBmcm9tICcuL2RlcGdyYXBoLmpzJztcbmltcG9ydCB7RmV0Y2hSZWFkZXJ9IGZyb20gJy4vZmV0Y2hyZWFkZXIuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtBc3N1bWVkRmlsbH0gZnJvbSAnLi9ncmFwaC9zaHVmZmxlLmpzJztcbmltcG9ydCB7V29ybGR9IGZyb20gJy4vZ3JhcGgvd29ybGQuanMnO1xuaW1wb3J0IHtjcnVtYmxpbmdQbGF0Zm9ybXN9IGZyb20gJy4vcGFzcy9jcnVtYmxpbmdwbGF0Zm9ybXMuanMnO1xuaW1wb3J0IHtkZXRlcm1pbmlzdGljLCBkZXRlcm1pbmlzdGljUHJlUGFyc2V9IGZyb20gJy4vcGFzcy9kZXRlcm1pbmlzdGljLmpzJztcbmltcG9ydCB7Zml4RGlhbG9nfSBmcm9tICcuL3Bhc3MvZml4ZGlhbG9nLmpzJztcbmltcG9ydCB7c2h1ZmZsZU1hemVzfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZW1hemVzLmpzJztcbmltcG9ydCB7c2h1ZmZsZVBhbGV0dGVzfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXBhbGV0dGVzLmpzJztcbmltcG9ydCB7c2h1ZmZsZVRyYWRlc30gZnJvbSAnLi9wYXNzL3NodWZmbGV0cmFkZXMuanMnO1xuaW1wb3J0IHt1bmlkZW50aWZpZWRJdGVtc30gZnJvbSAnLi9wYXNzL3VuaWRlbnRpZmllZGl0ZW1zLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuL3JhbmRvbS5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi9yb20uanMnO1xuaW1wb3J0IHtBcmVhfSBmcm9tICcuL3JvbS9hcmVhLmpzJztcbmltcG9ydCB7Q29uc3RyYWludH0gZnJvbSAnLi9yb20vY29uc3RyYWludC5qcyc7XG5pbXBvcnQge0dyYXBoaWNzfSBmcm9tICcuL3JvbS9ncmFwaGljcy5qcyc7XG5pbXBvcnQge0xvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNb25zdGVyfSBmcm9tICcuL3JvbS9tb25zdGVyLmpzJztcbmltcG9ydCB7U2hvcFR5cGUsIFNob3B9IGZyb20gJy4vcm9tL3Nob3AuanMnO1xuaW1wb3J0ICogYXMgc2xvdHMgZnJvbSAnLi9yb20vc2xvdHMuanMnO1xuaW1wb3J0IHtTcG9pbGVyfSBmcm9tICcuL3JvbS9zcG9pbGVyLmpzJztcbmltcG9ydCB7aGV4LCBzZXEsIHdhdGNoQXJyYXksIHdyaXRlTGl0dGxlRW5kaWFufSBmcm9tICcuL3JvbS91dGlsLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCAqIGFzIHZlcnNpb24gZnJvbSAnLi92ZXJzaW9uLmpzJztcblxuY29uc3QgRVhQQU5EX1BSRzogYm9vbGVhbiA9IHRydWU7XG5cbi8vIFRPRE8gLSB0byBzaHVmZmxlIHRoZSBtb25zdGVycywgd2UgbmVlZCB0byBmaW5kIHRoZSBzcHJpdGUgcGFsdHRlcyBhbmRcbi8vIHBhdHRlcm5zIGZvciBlYWNoIG1vbnN0ZXIuICBFYWNoIGxvY2F0aW9uIHN1cHBvcnRzIHVwIHRvIHR3byBtYXRjaHVwcyxcbi8vIHNvIGNhbiBvbmx5IHN1cHBvcnQgbW9uc3RlcnMgdGhhdCBtYXRjaC4gIE1vcmVvdmVyLCBkaWZmZXJlbnQgbW9uc3RlcnNcbi8vIHNlZW0gdG8gbmVlZCB0byBiZSBpbiBlaXRoZXIgc2xvdCAwIG9yIDEuXG5cbi8vIFB1bGwgaW4gYWxsIHRoZSBwYXRjaGVzIHdlIHdhbnQgdG8gYXBwbHkgYXV0b21hdGljYWxseS5cbi8vIFRPRE8gLSBtYWtlIGEgZGVidWdnZXIgd2luZG93IGZvciBwYXRjaGVzLlxuLy8gVE9ETyAtIHRoaXMgbmVlZHMgdG8gYmUgYSBzZXBhcmF0ZSBub24tY29tcGlsZWQgZmlsZS5cbmV4cG9ydCBkZWZhdWx0ICh7XG4gIGFzeW5jIGFwcGx5KHJvbTogVWludDhBcnJheSwgaGFzaDoge1trZXk6IHN0cmluZ106IHVua25vd259LCBwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgICAvLyBMb29rIGZvciBmbGFnIHN0cmluZyBhbmQgaGFzaFxuICAgIGxldCBmbGFncztcbiAgICBpZiAoIWhhc2guc2VlZCkge1xuICAgICAgLy8gVE9ETyAtIHNlbmQgaW4gYSBoYXNoIG9iamVjdCB3aXRoIGdldC9zZXQgbWV0aG9kc1xuICAgICAgaGFzaC5zZWVkID0gcGFyc2VTZWVkKCcnKS50b1N0cmluZygxNik7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCArPSAnJnNlZWQ9JyArIGhhc2guc2VlZDtcbiAgICB9XG4gICAgaWYgKGhhc2guZmxhZ3MpIHtcbiAgICAgIGZsYWdzID0gbmV3IEZsYWdTZXQoU3RyaW5nKGhhc2guZmxhZ3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmxhZ3MgPSBuZXcgRmxhZ1NldCgnQEZ1bGxTaHVmZmxlJyk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qga2V5IGluIGhhc2gpIHtcbiAgICAgIGlmIChoYXNoW2tleV0gPT09ICdmYWxzZScpIGhhc2hba2V5XSA9IGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBbcmVzdWx0LF0gPVxuICAgICAgICBhd2FpdCBzaHVmZmxlKHJvbSwgcGFyc2VTZWVkKFN0cmluZyhoYXNoLnNlZWQpKSxcbiAgICAgICAgICAgICAgICAgICAgICBmbGFncywgbmV3IEZldGNoUmVhZGVyKHBhdGgpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVNlZWQoc2VlZDogc3RyaW5nKTogbnVtYmVyIHtcbiAgaWYgKCFzZWVkKSByZXR1cm4gUmFuZG9tLm5ld1NlZWQoKTtcbiAgaWYgKC9eWzAtOWEtZl17MSw4fSQvaS50ZXN0KHNlZWQpKSByZXR1cm4gTnVtYmVyLnBhcnNlSW50KHNlZWQsIDE2KTtcbiAgcmV0dXJuIGNyYzMyKHNlZWQpO1xufVxuXG4vKipcbiAqIEFic3RyYWN0IG91dCBGaWxlIEkvTy4gIE5vZGUgYW5kIGJyb3dzZXIgd2lsbCBoYXZlIGNvbXBsZXRlbHlcbiAqIGRpZmZlcmVudCBpbXBsZW1lbnRhdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZGVyIHtcbiAgcmVhZChmaWxlbmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+O1xufVxuXG4vLyBwcmV2ZW50IHVudXNlZCBlcnJvcnMgYWJvdXQgd2F0Y2hBcnJheSAtIGl0J3MgdXNlZCBmb3IgZGVidWdnaW5nLlxuY29uc3Qge30gPSB7d2F0Y2hBcnJheX0gYXMgYW55O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2h1ZmZsZShyb206IFVpbnQ4QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWVkOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlcjogUmVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nPzoge3Nwb2lsZXI/OiBTcG9pbGVyfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzPzogUHJvZ3Jlc3NUcmFja2VyKTogUHJvbWlzZTxyZWFkb25seSBbVWludDhBcnJheSwgbnVtYmVyXT4ge1xuICAvL3JvbSA9IHdhdGNoQXJyYXkocm9tLCAweDg1ZmEgKyAweDEwKTtcblxuICBpZiAoRVhQQU5EX1BSRyAmJiByb20ubGVuZ3RoIDwgMHg4MDAwMCkge1xuICAgIGNvbnN0IG5ld1JvbSA9IG5ldyBVaW50OEFycmF5KHJvbS5sZW5ndGggKyAweDQwMDAwKTtcbiAgICBuZXdSb20uc3ViYXJyYXkoMCwgMHg0MDAxMCkuc2V0KHJvbS5zdWJhcnJheSgwLCAweDQwMDEwKSk7XG4gICAgbmV3Um9tLnN1YmFycmF5KDB4ODAwMTApLnNldChyb20uc3ViYXJyYXkoMHg0MDAxMCkpO1xuICAgIG5ld1JvbVs0XSA8PD0gMTtcbiAgICByb20gPSBuZXdSb207XG4gIH1cblxuICAvLyBGaXJzdCByZWVuY29kZSB0aGUgc2VlZCwgbWl4aW5nIGluIHRoZSBmbGFncyBmb3Igc2VjdXJpdHkuXG4gIGlmICh0eXBlb2Ygc2VlZCAhPT0gJ251bWJlcicpIHRocm93IG5ldyBFcnJvcignQmFkIHNlZWQnKTtcbiAgY29uc3QgbmV3U2VlZCA9IGNyYzMyKHNlZWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykgKyBTdHJpbmcoZmxhZ3MpKSA+Pj4gMDtcblxuICBjb25zdCB0b3VjaFNob3BzID0gdHJ1ZTtcblxuICBjb25zdCBkZWZpbmVzOiB7W25hbWU6IHN0cmluZ106IGJvb2xlYW59ID0ge1xuICAgIF9BTExPV19URUxFUE9SVF9PVVRfT0ZfQk9TUzogZmxhZ3MuaGFyZGNvcmVNb2RlKCkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzLnNodWZmbGVCb3NzRWxlbWVudHMoKSxcbiAgICBfQUxMT1dfVEVMRVBPUlRfT1VUX09GX1RPV0VSOiB0cnVlLFxuICAgIF9BVVRPX0VRVUlQX0JSQUNFTEVUOiBmbGFncy5hdXRvRXF1aXBCcmFjZWxldCgpLFxuICAgIF9CQVJSSUVSX1JFUVVJUkVTX0NBTE1fU0VBOiBmbGFncy5iYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCksXG4gICAgX0JVRkZfREVPU19QRU5EQU5UOiBmbGFncy5idWZmRGVvc1BlbmRhbnQoKSxcbiAgICBfQlVGRl9EWU5BOiBmbGFncy5idWZmRHluYSgpLCAvLyB0cnVlLFxuICAgIF9DSEVDS19GTEFHMDogdHJ1ZSxcbiAgICBfQ1RSTDFfU0hPUlRDVVRTOiBmbGFncy5jb250cm9sbGVyU2hvcnRjdXRzKCksXG4gICAgX0NVU1RPTV9TSE9PVElOR19XQUxMUzogdHJ1ZSxcbiAgICBfREVCVUdfRElBTE9HOiBzZWVkID09PSAweDE3YmMsXG4gICAgX0RJU0FCTEVfU0hPUF9HTElUQ0g6IGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfU1RBVFVFX0dMSVRDSDogZmxhZ3MuZGlzYWJsZVN0YXR1ZUdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1NXT1JEX0NIQVJHRV9HTElUQ0g6IGZsYWdzLmRpc2FibGVTd29yZENoYXJnZUdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1RSSUdHRVJfU0tJUDogdHJ1ZSxcbiAgICBfRElTQUJMRV9XQVJQX0JPT1RTX1JFVVNFOiBmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1dJTERfV0FSUDogZmFsc2UsXG4gICAgX0RJU1BMQVlfRElGRklDVUxUWTogdHJ1ZSxcbiAgICBfRVhUUkFfRVhURU5ERURfU0NSRUVOUzogdHJ1ZSxcbiAgICBfRVhUUkFfUElUWV9NUDogdHJ1ZSwgIC8vIFRPRE86IGFsbG93IGRpc2FibGluZyB0aGlzXG4gICAgX0ZJWF9DT0lOX1NQUklURVM6IHRydWUsXG4gICAgX0ZJWF9PUEVMX1NUQVRVRTogdHJ1ZSxcbiAgICBfRklYX1NIQUtJTkc6IHRydWUsXG4gICAgX0ZJWF9WQU1QSVJFOiB0cnVlLFxuICAgIF9IQVJEQ09SRV9NT0RFOiBmbGFncy5oYXJkY29yZU1vZGUoKSxcbiAgICBfSEFaTUFUX1NVSVQ6IGZsYWdzLmNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKSxcbiAgICBfTEVBVEhFUl9CT09UU19HSVZFX1NQRUVEOiBmbGFncy5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSxcbiAgICBfTUFTU0FDUkVfRE9FU19OT1RfUkVRVUlSRV9USFVOREVSOiB0cnVlLFxuICAgIF9ORVJGX0ZMSUdIVDogdHJ1ZSxcbiAgICBfTkVSRl9NQURPOiB0cnVlLFxuICAgIF9ORVJGX1dJTERfV0FSUDogZmxhZ3MubmVyZldpbGRXYXJwKCksXG4gICAgX05FVkVSX0RJRTogZmxhZ3MubmV2ZXJEaWUoKSxcbiAgICBfTk9STUFMSVpFX1NIT1BfUFJJQ0VTOiB0b3VjaFNob3BzLFxuICAgIF9QSVRZX0hQX0FORF9NUDogdHJ1ZSxcbiAgICBfUFJPR1JFU1NJVkVfQlJBQ0VMRVQ6IHRydWUsXG4gICAgX1JBQkJJVF9CT09UU19DSEFSR0VfV0hJTEVfV0FMS0lORzogZmxhZ3MucmFiYml0Qm9vdHNDaGFyZ2VXaGlsZVdhbGtpbmcoKSxcbiAgICBfUkVRVUlSRV9IRUFMRURfRE9MUEhJTl9UT19SSURFOiBmbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpLFxuICAgIF9SRVZFUlNJQkxFX1NXQU5fR0FURTogdHJ1ZSxcbiAgICBfU0FIQVJBX1JBQkJJVFNfUkVRVUlSRV9URUxFUEFUSFk6IGZsYWdzLnNhaGFyYVJhYmJpdHNSZXF1aXJlVGVsZXBhdGh5KCksXG4gICAgX1NJTVBMSUZZX0lOVklTSUJMRV9DSEVTVFM6IHRydWUsXG4gICAgX1RFTEVQT1JUX09OX1RIVU5ERVJfU1dPUkQ6IGZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSxcbiAgICBfVFJBSU5FUjogZmxhZ3MudHJhaW5lcigpLFxuICAgIF9UV0VMVlRIX1dBUlBfUE9JTlQ6IHRydWUsIC8vIHpvbWJpZSB0b3duIHdhcnBcbiAgICBfVU5JREVOVElGSUVEX0lURU1TOiBmbGFncy51bmlkZW50aWZpZWRJdGVtcygpLFxuICAgIF9aRUJVX1NUVURFTlRfR0lWRVNfSVRFTTogZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSxcbiAgfTtcblxuICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKCk7XG4gIGFzeW5jIGZ1bmN0aW9uIGFzc2VtYmxlKHBhdGg6IHN0cmluZykge1xuICAgIGFzbS5hc3NlbWJsZShhd2FpdCByZWFkZXIucmVhZChwYXRoKSwgcGF0aCk7XG4gICAgYXNtLnBhdGNoUm9tKHJvbSk7XG4gIH1cblxuICBkZXRlcm1pbmlzdGljUHJlUGFyc2Uocm9tLnN1YmFycmF5KDB4MTApKTsgLy8gVE9ETyAtIHRyYWluZXIuLi5cblxuICBjb25zdCBmbGFnRmlsZSA9XG4gICAgICBPYmplY3Qua2V5cyhkZWZpbmVzKVxuICAgICAgICAgIC5maWx0ZXIoZCA9PiBkZWZpbmVzW2RdKS5tYXAoZCA9PiBgZGVmaW5lICR7ZH0gMVxcbmApLmpvaW4oJycpO1xuICBhc20uYXNzZW1ibGUoZmxhZ0ZpbGUsICdmbGFncy5zJyk7XG4gIGF3YWl0IGFzc2VtYmxlKCdwcmVzaHVmZmxlLnMnKTtcblxuICBjb25zdCByYW5kb20gPSBuZXcgUmFuZG9tKG5ld1NlZWQpO1xuICBjb25zdCBwYXJzZWQgPSBuZXcgUm9tKHJvbSk7XG4gIGlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSAod2luZG93IGFzIGFueSkucm9tID0gcGFyc2VkO1xuICBwYXJzZWQuc3BvaWxlciA9IG5ldyBTcG9pbGVyKHBhcnNlZCk7XG4gIGlmIChsb2cpIGxvZy5zcG9pbGVyID0gcGFyc2VkLnNwb2lsZXI7XG5cbiAgLy8gTWFrZSBkZXRlcm1pbmlzdGljIGNoYW5nZXMuXG4gIGRldGVybWluaXN0aWMocGFyc2VkLCBmbGFncyk7XG5cbiAgLy8gU2V0IHVwIHNob3AgYW5kIHRlbGVwYXRoeVxuICBhd2FpdCBhc3NlbWJsZSgncG9zdHBhcnNlLnMnKTtcbiAgcGFyc2VkLnNjYWxpbmdMZXZlbHMgPSA0ODtcbiAgcGFyc2VkLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBhc20uZXhwYW5kKCdLZXlJdGVtRGF0YScpO1xuXG4gIGlmIChmbGFncy5zaHVmZmxlU2hvcHMoKSkgc2h1ZmZsZVNob3BzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgcmFuZG9taXplV2FsbHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgY3J1bWJsaW5nUGxhdGZvcm1zKHBhcnNlZCwgcmFuZG9tKTtcblxuICBpZiAoZmxhZ3MucmFuZG9taXplV2lsZFdhcnAoKSkgc2h1ZmZsZVdpbGRXYXJwKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHJlc2NhbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB1bmlkZW50aWZpZWRJdGVtcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBzaHVmZmxlVHJhZGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlmIChmbGFncy5yYW5kb21pemVNYXBzKCkpIHNodWZmbGVNYXplcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuXG4gIHBhcnNlZC5jb21wcmVzc01hcERhdGEoKTtcbiAgICAgICAgICAgICAvLyBUT0RPIC0gdGhlIHNjcmVlbnMgYXJlbid0IG1vdmluZz8hP1xuICBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy5zd2FtcCwgMHgyMCk7XG4gIHBhcnNlZC5tb3ZlU2NyZWVucyhwYXJzZWQubWV0YXRpbGVzZXRzLmhvdXNlLCAweDIxKTtcblxuICAvLyBUaGlzIHdhbnRzIHRvIGdvIGFzIGxhdGUgYXMgcG9zc2libGUgc2luY2Ugd2UgbmVlZCB0byBwaWNrIHVwXG4gIC8vIGFsbCB0aGUgbm9ybWFsaXphdGlvbiBhbmQgb3RoZXIgaGFuZGxpbmcgdGhhdCBoYXBwZW5lZCBiZWZvcmUuXG4gIGNvbnN0IHcgPSBXb3JsZC5idWlsZChwYXJzZWQsIGZsYWdzKTtcbiAgY29uc3QgZmlsbCA9IGF3YWl0IG5ldyBBc3N1bWVkRmlsbChwYXJzZWQsIGZsYWdzKS5zaHVmZmxlKHcuZ3JhcGgsIHJhbmRvbSwgcHJvZ3Jlc3MpO1xuICBpZiAoZmlsbCkge1xuICAgIC8vIGNvbnN0IG4gPSAoaTogbnVtYmVyKSA9PiB7XG4gICAgLy8gICBpZiAoaSA+PSAweDcwKSByZXR1cm4gJ01pbWljJztcbiAgICAvLyAgIGNvbnN0IGl0ZW0gPSBwYXJzZWQuaXRlbXNbcGFyc2VkLml0ZW1HZXRzW2ldLml0ZW1JZF07XG4gICAgLy8gICByZXR1cm4gaXRlbSA/IGl0ZW0ubWVzc2FnZU5hbWUgOiBgaW52YWxpZCAke2l9YDtcbiAgICAvLyB9O1xuICAgIC8vIGNvbnNvbGUubG9nKCdpdGVtOiBzbG90Jyk7XG4gICAgLy8gZm9yIChsZXQgaSA9IDA7IGkgPCBmaWxsLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gICBpZiAoZmlsbC5pdGVtc1tpXSAhPSBudWxsKSB7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKGAkJHtoZXgoaSl9ICR7bihpKX06ICR7bihmaWxsLml0ZW1zW2ldKX0gJCR7aGV4KGZpbGwuaXRlbXNbaV0pfWApO1xuICAgIC8vICAgfVxuICAgIC8vIH1cbiAgICB3LnRyYXZlcnNlKHcuZ3JhcGgsIGZpbGwpOyAvLyBmaWxsIHRoZSBzcG9pbGVyIChtYXkgYWxzbyB3YW50IHRvIGp1c3QgYmUgYSBzYW5pdHkgY2hlY2s/KVxuXG4gICAgc2xvdHMudXBkYXRlKHBhcnNlZCwgZmlsbC5zbG90cyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtyb20sIC0xXTtcbiAgICAvL2NvbnNvbGUuZXJyb3IoJ0NPVUxEIE5PVCBGSUxMIScpO1xuICB9XG4gIC8vY29uc29sZS5sb2coJ2ZpbGwnLCBmaWxsKTtcblxuICAvLyBUT0RPIC0gc2V0IG9taXRJdGVtR2V0RGF0YVN1ZmZpeCBhbmQgb21pdExvY2FsRGlhbG9nU3VmZml4XG4gIC8vYXdhaXQgc2h1ZmZsZURlcGdyYXBoKHBhcnNlZCwgcmFuZG9tLCBsb2csIGZsYWdzLCBwcm9ncmVzcyk7XG5cbiAgLy8gVE9ETyAtIHJld3JpdGUgcmVzY2FsZVNob3BzIHRvIHRha2UgYSBSb20gaW5zdGVhZCBvZiBhbiBhcnJheS4uLlxuICBpZiAodG91Y2hTaG9wcykge1xuICAgIC8vIFRPRE8gLSBzZXBhcmF0ZSBsb2dpYyBmb3IgaGFuZGxpbmcgc2hvcHMgdy9vIFBuIHNwZWNpZmllZCAoaS5lLiB2YW5pbGxhXG4gICAgLy8gc2hvcHMgdGhhdCBtYXkgaGF2ZSBiZWVuIHJhbmRvbWl6ZWQpXG4gICAgcmVzY2FsZVNob3BzKHBhcnNlZCwgYXNtLCBmbGFncy5iYXJnYWluSHVudGluZygpID8gcmFuZG9tIDogdW5kZWZpbmVkKTtcbiAgfVxuXG4gIC8vIE5PVEU6IG1vbnN0ZXIgc2h1ZmZsZSBuZWVkcyB0byBnbyBhZnRlciBpdGVtIHNodWZmbGUgYmVjYXVzZSBvZiBtaW1pY1xuICAvLyBwbGFjZW1lbnQgY29uc3RyYWludHMsIGJ1dCBpdCB3b3VsZCBiZSBuaWNlIHRvIGdvIGJlZm9yZSBpbiBvcmRlciB0b1xuICAvLyBndWFyYW50ZWUgbW9uZXkuXG4gIGlmIChmbGFncy5zaHVmZmxlTW9uc3RlcnMoKSkgc2h1ZmZsZU1vbnN0ZXJzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlkZW50aWZ5S2V5SXRlbXNGb3JEaWZmaWN1bHR5QnVmZnMocGFyc2VkKTtcblxuICAvLyBCdWZmIG1lZGljYWwgaGVyYiBhbmQgZnJ1aXQgb2YgcG93ZXJcbiAgaWYgKGZsYWdzLmRvdWJsZUJ1ZmZNZWRpY2FsSGVyYigpKSB7XG4gICAgcm9tWzB4MWM1MGMgKyAweDEwXSAqPSAyOyAgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgICByb21bMHgxYzRlYSArIDB4MTBdICo9IDM7ICAvLyBtZWRpY2FsIGhlcmJcbiAgfSBlbHNlIGlmIChmbGFncy5idWZmTWVkaWNhbEhlcmIoKSkge1xuICAgIHJvbVsweDFjNTBjICsgMHgxMF0gKz0gMTY7IC8vIGZydWl0IG9mIHBvd2VyXG4gICAgcm9tWzB4MWM0ZWEgKyAweDEwXSAqPSAyOyAgLy8gbWVkaWNhbCBoZXJiXG4gIH1cblxuICBpZiAoZmxhZ3Muc3RvcnlNb2RlKCkpIHN0b3J5TW9kZShwYXJzZWQpO1xuXG4gIHNodWZmbGVNdXNpYyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBzaHVmZmxlUGFsZXR0ZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgLy8gRG8gdGhpcyAqYWZ0ZXIqIHNodWZmbGluZyBwYWxldHRlc1xuICBpZiAoZmxhZ3MuYmxhY2tvdXRNb2RlKCkpIGJsYWNrb3V0TW9kZShwYXJzZWQpO1xuXG4gIG1pc2MocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgZml4RGlhbG9nKHBhcnNlZCk7XG5cbiAgLy8gTk9URTogVGhpcyBuZWVkcyB0byBoYXBwZW4gQkVGT1JFIHBvc3RzaHVmZmxlXG4gIGlmIChmbGFncy5idWZmRHluYSgpKSBidWZmRHluYShwYXJzZWQsIGZsYWdzKTsgLy8gVE9ETyAtIGNvbmRpdGlvbmFsXG5cbiAgaWYgKGZsYWdzLnRyYWluZXIoKSkge1xuICAgIHBhcnNlZC53aWxkV2FycC5sb2NhdGlvbnMgPSBbXG4gICAgICAweDBhLCAvLyB2YW1waXJlXG4gICAgICAweDFhLCAvLyBzd2FtcC9pbnNlY3RcbiAgICAgIDB4MzUsIC8vIHN1bW1pdCBjYXZlXG4gICAgICAweDQ4LCAvLyBmb2cgbGFtcFxuICAgICAgMHg2ZCwgLy8gdmFtcGlyZSAyXG4gICAgICAweDZlLCAvLyBzYWJlcmEgMVxuICAgICAgMHg4YywgLy8gc2h5cm9uXG4gICAgICAweGFhLCAvLyBiZWhpbmQga2VsYmVzcXllIDJcbiAgICAgIDB4YWMsIC8vIHNhYmVyYSAyXG4gICAgICAweGIwLCAvLyBiZWhpbmQgbWFkbyAyXG4gICAgICAweGI2LCAvLyBrYXJtaW5lXG4gICAgICAweDlmLCAvLyBkcmF5Z29uIDFcbiAgICAgIDB4YTYsIC8vIGRyYXlnb24gMlxuICAgICAgMHg1OCwgLy8gdG93ZXJcbiAgICAgIDB4NWMsIC8vIHRvd2VyIG91dHNpZGUgbWVzaWFcbiAgICAgIDB4MDAsIC8vIG1lemFtZVxuICAgIF07XG4gIH1cblxuICBhd2FpdCBwYXJzZWQud3JpdGVEYXRhKCk7XG4gIGJ1ZmZEeW5hKHBhcnNlZCwgZmxhZ3MpOyAvLyBUT0RPIC0gY29uZGl0aW9uYWxcbiAgY29uc3QgY3JjID0gYXdhaXQgcG9zdFBhcnNlZFNodWZmbGUocm9tLCByYW5kb20sIHNlZWQsIGZsYWdzLCBhc20sIGFzc2VtYmxlKTtcblxuICAvLyBUT0RPIC0gb3B0aW9uYWwgZmxhZ3MgY2FuIHBvc3NpYmx5IGdvIGhlcmUsIGJ1dCBNVVNUIE5PVCB1c2UgcGFyc2VkLnByZyFcblxuICBpZiAoRVhQQU5EX1BSRykge1xuICAgIGNvbnN0IHByZyA9IHJvbS5zdWJhcnJheSgweDEwKTtcbiAgICBwcmcuc3ViYXJyYXkoMHg3YzAwMCwgMHg4MDAwMCkuc2V0KHByZy5zdWJhcnJheSgweDNjMDAwLCAweDQwMDAwKSk7XG4gIH1cbiAgcmV0dXJuIFtyb20sIGNyY107XG59XG5cbi8vIFNlcGFyYXRlIGZ1bmN0aW9uIHRvIGd1YXJhbnRlZSB3ZSBubyBsb25nZXIgaGF2ZSBhY2Nlc3MgdG8gdGhlIHBhcnNlZCByb20uLi5cbmFzeW5jIGZ1bmN0aW9uIHBvc3RQYXJzZWRTaHVmZmxlKHJvbTogVWludDhBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmRvbTogUmFuZG9tLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc206IEFzc2VtYmxlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VtYmxlOiAocGF0aDogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgYXdhaXQgYXNzZW1ibGUoJ3Bvc3RzaHVmZmxlLnMnKTtcbiAgdXBkYXRlRGlmZmljdWx0eVNjYWxpbmdUYWJsZXMocm9tLCBmbGFncywgYXNtKTtcbiAgdXBkYXRlQ29pbkRyb3BzKHJvbSwgZmxhZ3MpO1xuXG4gIHNodWZmbGVSYW5kb21OdW1iZXJzKHJvbSwgcmFuZG9tKTtcblxuICByZXR1cm4gc3RhbXBWZXJzaW9uU2VlZEFuZEhhc2gocm9tLCBzZWVkLCBmbGFncyk7XG5cbiAgLy8gQkVMT1cgSEVSRSBGT1IgT1BUSU9OQUwgRkxBR1M6XG5cbiAgLy8gZG8gYW55IFwidmFuaXR5XCIgcGF0Y2hlcyBoZXJlLi4uXG4gIC8vIGNvbnNvbGUubG9nKCdwYXRjaCBhcHBsaWVkJyk7XG4gIC8vIHJldHVybiBsb2cuam9pbignXFxuJyk7XG59O1xuXG5cbmZ1bmN0aW9uIG1pc2Mocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSkge1xuICBjb25zdCB7fSA9IHtyb20sIGZsYWdzLCByYW5kb219IGFzIGFueTtcbiAgLy8gTk9URTogd2Ugc3RpbGwgbmVlZCB0byBkbyBzb21lIHdvcmsgYWN0dWFsbHkgYWRqdXN0aW5nXG4gIC8vIG1lc3NhZ2UgdGV4dHMgdG8gcHJldmVudCBsaW5lIG92ZXJmbG93LCBldGMuICBXZSBzaG91bGRcbiAgLy8gYWxzbyBtYWtlIHNvbWUgaG9va3MgdG8gZWFzaWx5IHN3YXAgb3V0IGl0ZW1zIHdoZXJlIGl0XG4gIC8vIG1ha2VzIHNlbnNlLlxuICByb20ubWVzc2FnZXMucGFydHNbMl1bMl0udGV4dCA9IGBcbnswMTpBa2FoYW5hfSBpcyBoYW5kZWQgYSBzdGF0dWUuI1xuVGhhbmtzIGZvciBmaW5kaW5nIHRoYXQuXG5JIHdhcyB0b3RhbGx5IGdvbm5hIHNlbGxcbml0IGZvciB0b25zIG9mIGNhc2guI1xuSGVyZSwgaGF2ZSB0aGlzIGxhbWVcblsyOTpHYXMgTWFza10gb3Igc29tZXRoaW5nLmA7XG4gIC8vIFRPRE8gLSB3b3VsZCBiZSBuaWNlIHRvIGFkZCBzb21lIG1vcmUgKGhpZ2hlciBsZXZlbCkgbWFya3VwLFxuICAvLyBlLmcuIGAke2Rlc2NyaWJlSXRlbShzbG90TnVtKX1gLiAgV2UgY291bGQgYWxzbyBhZGQgbWFya3VwXG4gIC8vIGZvciBlLmcuIGAke3NheVdhbnQoc2xvdE51bSl9YCBhbmQgYCR7c2F5VGhhbmtzKHNsb3ROdW0pfWBcbiAgLy8gaWYgd2Ugc2h1ZmZsZSB0aGUgd2FudGVkIGl0ZW1zLiAgVGhlc2UgY291bGQgYmUgcmFuZG9taXplZFxuICAvLyBpbiB2YXJpb3VzIHdheXMsIGFzIHdlbGwgYXMgaGF2aW5nIHNvbWUgYWRkaXRpb25hbCBiaXRzIGxpa2VcbiAgLy8gd2FudEF1eGlsaWFyeSguLi4pIGZvciBlLmcuIFwidGhlIGtpcmlzYSBwbGFudCBpcyAuLi5cIiAtIHRoZW5cbiAgLy8gaXQgY291bGQgaW5zdGVhZCBzYXkgXCJ0aGUgc3RhdHVlIG9mIG9ueXggaXMgLi4uXCIuXG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1swXVsweGVdLnRleHQgPSBgSXQncyBkYW5nZXJvdXMgdG8gZ28gYWxvbmUhIFRha2UgdGhpcy5gO1xuICByb20ubWVzc2FnZXMucGFydHNbMF1bMHhlXS5maXhUZXh0KCk7XG59O1xuXG5mdW5jdGlvbiBzaHVmZmxlU2hvcHMocm9tOiBSb20sIF9mbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgY29uc3Qgc2hvcHM6IHtbdHlwZTogbnVtYmVyXToge2NvbnRlbnRzOiBudW1iZXJbXSwgc2hvcHM6IFNob3BbXX19ID0ge1xuICAgIFtTaG9wVHlwZS5BUk1PUl06IHtjb250ZW50czogW10sIHNob3BzOiBbXX0sXG4gICAgW1Nob3BUeXBlLlRPT0xdOiB7Y29udGVudHM6IFtdLCBzaG9wczogW119LFxuICB9O1xuICAvLyBSZWFkIGFsbCB0aGUgY29udGVudHMuXG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoIXNob3AudXNlZCB8fCBzaG9wLmxvY2F0aW9uID09PSAweGZmKSBjb250aW51ZTtcbiAgICBjb25zdCBkYXRhID0gc2hvcHNbc2hvcC50eXBlXTtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgZGF0YS5jb250ZW50cy5wdXNoKC4uLnNob3AuY29udGVudHMuZmlsdGVyKHggPT4geCAhPT0gMHhmZikpO1xuICAgICAgZGF0YS5zaG9wcy5wdXNoKHNob3ApO1xuICAgICAgc2hvcC5jb250ZW50cyA9IFtdO1xuICAgIH1cbiAgfVxuICAvLyBTaHVmZmxlIHRoZSBjb250ZW50cy4gIFBpY2sgb3JkZXIgdG8gZHJvcCBpdGVtcyBpbi5cbiAgZm9yIChjb25zdCBkYXRhIG9mIE9iamVjdC52YWx1ZXMoc2hvcHMpKSB7XG4gICAgbGV0IHNsb3RzOiBTaG9wW10gfCBudWxsID0gbnVsbDtcbiAgICBjb25zdCBpdGVtcyA9IFsuLi5kYXRhLmNvbnRlbnRzXTtcbiAgICByYW5kb20uc2h1ZmZsZShpdGVtcyk7XG4gICAgd2hpbGUgKGl0ZW1zLmxlbmd0aCkge1xuICAgICAgaWYgKCFzbG90cyB8fCAhc2xvdHMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChzbG90cykgaXRlbXMuc2hpZnQoKTtcbiAgICAgICAgc2xvdHMgPSBbLi4uZGF0YS5zaG9wcywgLi4uZGF0YS5zaG9wcywgLi4uZGF0YS5zaG9wcywgLi4uZGF0YS5zaG9wc107XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKHNsb3RzKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1swXTtcbiAgICAgIGNvbnN0IHNob3AgPSBzbG90c1swXTtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzLmxlbmd0aCA8IDQgJiYgIXNob3AuY29udGVudHMuaW5jbHVkZXMoaXRlbSkpIHtcbiAgICAgICAgc2hvcC5jb250ZW50cy5wdXNoKGl0ZW0pO1xuICAgICAgICBpdGVtcy5zaGlmdCgpO1xuICAgICAgfVxuICAgICAgc2xvdHMuc2hpZnQoKTtcbiAgICB9XG4gIH1cbiAgLy8gU29ydCBhbmQgYWRkIDB4ZmYnc1xuICBmb3IgKGNvbnN0IGRhdGEgb2YgT2JqZWN0LnZhbHVlcyhzaG9wcykpIHtcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgZGF0YS5zaG9wcykge1xuICAgICAgd2hpbGUgKHNob3AuY29udGVudHMubGVuZ3RoIDwgNCkgc2hvcC5jb250ZW50cy5wdXNoKDB4ZmYpO1xuICAgICAgc2hvcC5jb250ZW50cy5zb3J0KChhLCBiKSA9PiBhIC0gYik7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJhbmRvbWl6ZVdhbGxzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgLy8gTk9URTogV2UgY2FuIG1ha2UgYW55IHdhbGwgc2hvb3QgYnkgc2V0dGluZyBpdHMgJDEwIGJpdCBvbiB0aGUgdHlwZSBieXRlLlxuICAvLyBCdXQgdGhpcyBhbHNvIHJlcXVpcmVzIG1hdGNoaW5nIHBhdHRlcm4gdGFibGVzLCBzbyB3ZSdsbCBsZWF2ZSB0aGF0IGFsb25lXG4gIC8vIGZvciBub3cgdG8gYXZvaWQgZ3Jvc3MgZ3JhcGhpY3MuXG5cbiAgLy8gQWxsIG90aGVyIHdhbGxzIHdpbGwgbmVlZCB0aGVpciB0eXBlIG1vdmVkIGludG8gdGhlIHVwcGVyIG5pYmJsZSBhbmQgdGhlblxuICAvLyB0aGUgbmV3IGVsZW1lbnQgZ29lcyBpbiB0aGUgbG93ZXIgbmliYmxlLiAgU2luY2UgdGhlcmUgYXJlIHNvIGZldyBpcm9uXG4gIC8vIHdhbGxzLCB3ZSB3aWxsIGdpdmUgdGhlbSBhcmJpdHJhcnkgZWxlbWVudHMgaW5kZXBlbmRlbnQgb2YgdGhlIHBhbGV0dGUuXG4gIC8vIFJvY2svaWNlIHdhbGxzIGNhbiBhbHNvIGhhdmUgYW55IGVsZW1lbnQsIGJ1dCB0aGUgdGhpcmQgcGFsZXR0ZSB3aWxsXG4gIC8vIGluZGljYXRlIHdoYXQgdGhleSBleHBlY3QuXG5cbiAgaWYgKCFmbGFncy5yYW5kb21pemVXYWxscygpKSByZXR1cm47XG4gIC8vIEJhc2ljIHBsYW46IHBhcnRpdGlvbiBiYXNlZCBvbiBwYWxldHRlLCBsb29rIGZvciB3YWxscy5cbiAgY29uc3QgcGFscyA9IFtcbiAgICBbMHgwNSwgMHgzOF0sIC8vIHJvY2sgd2FsbCBwYWxldHRlc1xuICAgIFsweDExXSwgLy8gaWNlIHdhbGwgcGFsZXR0ZXNcbiAgICBbMHg2YV0sIC8vIFwiZW1iZXIgd2FsbFwiIHBhbGV0dGVzXG4gICAgWzB4MTRdLCAvLyBcImlyb24gd2FsbFwiIHBhbGV0dGVzXG4gIF07XG5cbiAgZnVuY3Rpb24gd2FsbFR5cGUoc3Bhd246IFNwYXduKTogbnVtYmVyIHtcbiAgICBpZiAoc3Bhd24uZGF0YVsyXSAmIDB4MjApIHtcbiAgICAgIHJldHVybiAoc3Bhd24uaWQgPj4+IDQpICYgMztcbiAgICB9XG4gICAgcmV0dXJuIHNwYXduLmlkICYgMztcbiAgfVxuXG4gIGNvbnN0IHBhcnRpdGlvbiA9IG5ldyBEZWZhdWx0TWFwPEFyZWEsIExvY2F0aW9uW10+KCgpID0+IFtdKTtcbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgcGFydGl0aW9uLmdldChsb2NhdGlvbi5kYXRhLmFyZWEpLnB1c2gobG9jYXRpb24pO1xuICB9XG4gIGZvciAoY29uc3QgbG9jYXRpb25zIG9mIHBhcnRpdGlvbi52YWx1ZXMoKSkge1xuICAgIC8vIHBpY2sgYSByYW5kb20gd2FsbCB0eXBlLlxuICAgIGNvbnN0IGVsdCA9IHJhbmRvbS5uZXh0SW50KDQpO1xuICAgIGNvbnN0IHBhbCA9IHJhbmRvbS5waWNrKHBhbHNbZWx0XSk7XG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBsb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICAgIGNvbnN0IHR5cGUgPSB3YWxsVHlwZShzcGF3bik7XG4gICAgICAgICAgaWYgKHR5cGUgPT09IDIpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICh0eXBlID09PSAzKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdFbHQgPSByYW5kb20ubmV4dEludCg0KTtcbiAgICAgICAgICAgIGlmIChyb20uc3BvaWxlcikgcm9tLnNwb2lsZXIuYWRkV2FsbChsb2NhdGlvbi5uYW1lLCB0eXBlLCBuZXdFbHQpO1xuICAgICAgICAgICAgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgICAgICAgICAgc3Bhd24uaWQgPSAweDMwIHwgbmV3RWx0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgJHtsb2NhdGlvbi5uYW1lfSAke3R5cGV9ID0+ICR7ZWx0fWApO1xuICAgICAgICAgICAgaWYgKCFmb3VuZCAmJiByb20uc3BvaWxlcikge1xuICAgICAgICAgICAgICByb20uc3BvaWxlci5hZGRXYWxsKGxvY2F0aW9uLm5hbWUsIHR5cGUsIGVsdCk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICAgICAgICAgIHNwYXduLmlkID0gdHlwZSA8PCA0IHwgZWx0O1xuICAgICAgICAgICAgbG9jYXRpb24udGlsZVBhbGV0dGVzWzJdID0gcGFsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzaHVmZmxlTXVzaWMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBpZiAoIWZsYWdzLnJhbmRvbWl6ZU11c2ljKCkpIHJldHVybjtcbiAgaW50ZXJmYWNlIEhhc011c2ljIHsgYmdtOiBudW1iZXI7IH1cbiAgY2xhc3MgQm9zc011c2ljIGltcGxlbWVudHMgSGFzTXVzaWMge1xuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGFkZHI6IG51bWJlcikge31cbiAgICBnZXQgYmdtKCkgeyByZXR1cm4gcm9tLnByZ1t0aGlzLmFkZHJdOyB9XG4gICAgc2V0IGJnbSh4KSB7IHJvbS5wcmdbdGhpcy5hZGRyXSA9IHg7IH1cbiAgfVxuICBjb25zdCBib3NzQWRkciA9IFtcbiAgICAweDFlNGI4LCAvLyB2YW1waXJlIDFcbiAgICAweDFlNjkwLCAvLyBpbnNlY3RcbiAgICAweDFlOTliLCAvLyBrZWxiZXNxdWVcbiAgICAweDFlY2IxLCAvLyBzYWJlcmFcbiAgICAweDFlZTBmLCAvLyBtYWRvXG4gICAgMHgxZWY4MywgLy8ga2FybWluZVxuICAgIDB4MWYxODcsIC8vIGRyYXlnb24gMVxuICAgIDB4MWYzMTEsIC8vIGRyYXlnb24gMlxuICAgIDB4MzdjMzAsIC8vIGR5bmFcbiAgXTtcbiAgbGV0IG5laWdoYm9yczogTG9jYXRpb25bXSA9IFtdO1xuICBjb25zdCBtdXNpY3MgPSBuZXcgRGVmYXVsdE1hcDx1bmtub3duLCBIYXNNdXNpY1tdPigoKSA9PiBbXSk7XG4gIGNvbnN0IGFsbCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICBmb3IgKGNvbnN0IGwgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmIChsLmlkID09PSAweDVmIHx8IGwuaWQgPT09IDAgfHwgIWwudXNlZCkgY29udGludWU7IC8vIHNraXAgc3RhcnQgYW5kIGR5bmFcbiAgICBjb25zdCBtdXNpYyA9IGwuZGF0YS5tdXNpYztcbiAgICBhbGwuYWRkKGwuYmdtKTtcbiAgICBpZiAodHlwZW9mIG11c2ljID09PSAnbnVtYmVyJykge1xuICAgICAgbmVpZ2hib3JzLnB1c2gobCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG11c2ljcy5nZXQobXVzaWMpLnB1c2gobCk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgYSBvZiBib3NzQWRkcikge1xuICAgIGNvbnN0IGIgPSBuZXcgQm9zc011c2ljKGEpO1xuICAgIG11c2ljcy5zZXQoYiwgW2JdKTtcbiAgICBhbGwuYWRkKGIuYmdtKTtcbiAgfVxuICBjb25zdCBsaXN0ID0gWy4uLmFsbF07XG4gIGNvbnN0IHVwZGF0ZWQgPSBuZXcgU2V0PEhhc011c2ljPigpO1xuICBmb3IgKGNvbnN0IHBhcnRpdGlvbiBvZiBtdXNpY3MudmFsdWVzKCkpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHJhbmRvbS5waWNrKGxpc3QpO1xuICAgIGZvciAoY29uc3QgbXVzaWMgb2YgcGFydGl0aW9uKSB7XG4gICAgICBtdXNpYy5iZ20gPSB2YWx1ZTtcbiAgICAgIHVwZGF0ZWQuYWRkKG11c2ljKTtcbiAgICB9XG4gIH1cbiAgd2hpbGUgKG5laWdoYm9ycy5sZW5ndGgpIHtcbiAgICBjb25zdCBkZWZlciA9IFtdO1xuICAgIGxldCBjaGFuZ2VkID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgbmVpZ2hib3JzKSB7XG4gICAgICBjb25zdCBuZWlnaGJvciA9IGxvYy5uZWlnaGJvckZvckVudHJhbmNlKGxvYy5kYXRhLm11c2ljIGFzIG51bWJlcik7XG4gICAgICBpZiAodXBkYXRlZC5oYXMobmVpZ2hib3IpKSB7XG4gICAgICAgIGxvYy5iZ20gPSBuZWlnaGJvci5iZ207XG4gICAgICAgIHVwZGF0ZWQuYWRkKGxvYyk7XG4gICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVmZXIucHVzaChsb2MpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWNoYW5nZWQpIGJyZWFrO1xuICAgIG5laWdoYm9ycyA9IGRlZmVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNodWZmbGVXaWxkV2FycChyb206IFJvbSwgX2ZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBjb25zdCBsb2NhdGlvbnM6IExvY2F0aW9uW10gPSBbXTtcbiAgZm9yIChjb25zdCBsIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBpZiAobCAmJiBsLnVzZWQgJiYgbC5pZCAmJiAhbC5pc1Nob3AoKSAmJiAobC5pZCAmIDB4ZjgpICE9PSAweDU4KSB7XG4gICAgICBsb2NhdGlvbnMucHVzaChsKTtcbiAgICB9XG4gIH1cbiAgcmFuZG9tLnNodWZmbGUobG9jYXRpb25zKTtcbiAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucyA9IFtdO1xuICBmb3IgKGNvbnN0IGxvYyBvZiBbLi4ubG9jYXRpb25zLnNsaWNlKDAsIDE1KS5zb3J0KChhLCBiKSA9PiBhLmlkIC0gYi5pZCldKSB7XG4gICAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucy5wdXNoKGxvYy5pZCk7XG4gICAgaWYgKHJvbS5zcG9pbGVyKSByb20uc3BvaWxlci5hZGRXaWxkV2FycChsb2MuaWQsIGxvYy5uYW1lKTtcbiAgfVxuICByb20ud2lsZFdhcnAubG9jYXRpb25zLnB1c2goMCk7XG59XG5cbmZ1bmN0aW9uIGJ1ZmZEeW5hKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgcm9tLm9iamVjdHNbMHhiOF0uY29sbGlzaW9uUGxhbmUgPSAxO1xuICByb20ub2JqZWN0c1sweGI4XS5pbW1vYmlsZSA9IHRydWU7XG4gIHJvbS5vYmplY3RzWzB4YjldLmNvbGxpc2lvblBsYW5lID0gMTtcbiAgcm9tLm9iamVjdHNbMHhiOV0uaW1tb2JpbGUgPSB0cnVlO1xuICByb20ub2JqZWN0c1sweDMzXS5jb2xsaXNpb25QbGFuZSA9IDI7XG4gIHJvbS5hZEhvY1NwYXduc1sweDI4XS5zbG90UmFuZ2VMb3dlciA9IDB4MWM7IC8vIGNvdW50ZXJcbiAgcm9tLmFkSG9jU3Bhd25zWzB4MjldLnNsb3RSYW5nZVVwcGVyID0gMHgxYzsgLy8gbGFzZXJcbiAgcm9tLmFkSG9jU3Bhd25zWzB4MmFdLnNsb3RSYW5nZVVwcGVyID0gMHgxYzsgLy8gYnViYmxlXG59XG5cbmZ1bmN0aW9uIGJsYWNrb3V0TW9kZShyb206IFJvbSkge1xuICBjb25zdCBkZyA9IGdlbmVyYXRlRGVwZ3JhcGgoKTtcbiAgZm9yIChjb25zdCBub2RlIG9mIGRnLm5vZGVzKSB7XG4gICAgY29uc3QgdHlwZSA9IChub2RlIGFzIGFueSkudHlwZTtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gJ0xvY2F0aW9uJyAmJiAodHlwZSA9PT0gJ2NhdmUnIHx8IHR5cGUgPT09ICdmb3J0cmVzcycpKSB7XG4gICAgICByb20ubG9jYXRpb25zWyhub2RlIGFzIGFueSkuaWRdLnRpbGVQYWxldHRlcy5maWxsKDB4OWEpO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBzdG9yeU1vZGUgPSAocm9tOiBSb20pID0+IHtcbiAgLy8gc2h1ZmZsZSBoYXMgYWxyZWFkeSBoYXBwZW5lZCwgbmVlZCB0byB1c2Ugc2h1ZmZsZWQgZmxhZ3MgZnJvbVxuICAvLyBOUEMgc3Bhd24gY29uZGl0aW9ucy4uLlxuICBjb25zdCBjb25kaXRpb25zID0gW1xuICAgIC8vIE5vdGU6IGlmIGJvc3NlcyBhcmUgc2h1ZmZsZWQgd2UnbGwgbmVlZCB0byBkZXRlY3QgdGhpcy4uLlxuICAgIH5yb20ubnBjc1sweGMyXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4MjgpIVswXSwgLy8gS2VsYmVzcXVlIDFcbiAgICB+cm9tLm5wY3NbMHg4NF0uc3Bhd25Db25kaXRpb25zLmdldCgweDZlKSFbMF0sIC8vIFNhYmVyYSAxXG4gICAgfnJvbS50cmlnZ2VyKDB4OWEpLmNvbmRpdGlvbnNbMV0sIC8vIE1hZG8gMVxuICAgIH5yb20ubnBjc1sweGM1XS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YTkpIVswXSwgLy8gS2VsYmVzcXVlIDJcbiAgICB+cm9tLm5wY3NbMHhjNl0uc3Bhd25Db25kaXRpb25zLmdldCgweGFjKSFbMF0sIC8vIFNhYmVyYSAyXG4gICAgfnJvbS5ucGNzWzB4YzddLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhiOSkhWzBdLCAvLyBNYWRvIDJcbiAgICB+cm9tLm5wY3NbMHhjOF0uc3Bhd25Db25kaXRpb25zLmdldCgweGI2KSFbMF0sIC8vIEthcm1pbmVcbiAgICB+cm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLmdldCgweDlmKSFbMF0sIC8vIERyYXlnb24gMVxuICAgIDB4MjAwLCAvLyBTd29yZCBvZiBXaW5kXG4gICAgMHgyMDEsIC8vIFN3b3JkIG9mIEZpcmVcbiAgICAweDIwMiwgLy8gU3dvcmQgb2YgV2F0ZXJcbiAgICAweDIwMywgLy8gU3dvcmQgb2YgVGh1bmRlclxuICAgIC8vIFRPRE8gLSBzdGF0dWVzIG9mIG1vb24gYW5kIHN1biBtYXkgYmUgcmVsZXZhbnQgaWYgZW50cmFuY2Ugc2h1ZmZsZT9cbiAgICAvLyBUT0RPIC0gdmFtcGlyZXMgYW5kIGluc2VjdD9cbiAgXTtcbiAgcm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLmdldCgweGE2KSEucHVzaCguLi5jb25kaXRpb25zKTtcbn07XG5cbi8vIFN0YW1wIHRoZSBST01cbmV4cG9ydCBmdW5jdGlvbiBzdGFtcFZlcnNpb25TZWVkQW5kSGFzaChyb206IFVpbnQ4QXJyYXksIHNlZWQ6IG51bWJlciwgZmxhZ3M6IEZsYWdTZXQpOiBudW1iZXIge1xuICAvLyBVc2UgdXAgdG8gMjYgYnl0ZXMgc3RhcnRpbmcgYXQgUFJHICQyNWVhOFxuICAvLyBXb3VsZCBiZSBuaWNlIHRvIHN0b3JlICgxKSBjb21taXQsICgyKSBmbGFncywgKDMpIHNlZWQsICg0KSBoYXNoXG4gIC8vIFdlIGNhbiB1c2UgYmFzZTY0IGVuY29kaW5nIHRvIGhlbHAgc29tZS4uLlxuICAvLyBGb3Igbm93IGp1c3Qgc3RpY2sgaW4gdGhlIGNvbW1pdCBhbmQgc2VlZCBpbiBzaW1wbGUgaGV4XG4gIGNvbnN0IGNyYyA9IGNyYzMyKHJvbSk7XG4gIGNvbnN0IGNyY1N0cmluZyA9IGNyYy50b1N0cmluZygxNikucGFkU3RhcnQoOCwgJzAnKS50b1VwcGVyQ2FzZSgpO1xuICBjb25zdCBoYXNoID0gdmVyc2lvbi5TVEFUVVMgPT09ICd1bnN0YWJsZScgP1xuICAgICAgdmVyc2lvbi5IQVNILnN1YnN0cmluZygwLCA3KS5wYWRTdGFydCg3LCAnMCcpLnRvVXBwZXJDYXNlKCkgKyAnICAgICAnIDpcbiAgICAgIHZlcnNpb24uVkVSU0lPTi5zdWJzdHJpbmcoMCwgMTIpLnBhZEVuZCgxMiwgJyAnKTtcbiAgY29uc3Qgc2VlZFN0ciA9IHNlZWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgZW1iZWQgPSAoYWRkcjogbnVtYmVyLCB0ZXh0OiBzdHJpbmcpID0+IHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJvbVthZGRyICsgMHgxMCArIGldID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgaW50ZXJjYWxhdGUgPSAoczE6IHN0cmluZywgczI6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzMS5sZW5ndGggfHwgaSA8IHMyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvdXQucHVzaChzMVtpXSB8fCAnICcpO1xuICAgICAgb3V0LnB1c2goczJbaV0gfHwgJyAnKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKCcnKTtcbiAgfTtcblxuICBlbWJlZCgweDI3N2NmLCBpbnRlcmNhbGF0ZSgnICBWRVJTSU9OICAgICBTRUVEICAgICAgJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCAgJHtoYXNofSR7c2VlZFN0cn1gKSk7XG4gIGxldCBmbGFnU3RyaW5nID0gU3RyaW5nKGZsYWdzKTtcblxuICAvLyBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiAzNikgZmxhZ1N0cmluZyA9IGZsYWdTdHJpbmcucmVwbGFjZSgvIC9nLCAnJyk7XG4gIGxldCBleHRyYUZsYWdzO1xuICBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiA0Nikge1xuICAgIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA+IDkyKSB0aHJvdyBuZXcgRXJyb3IoJ0ZsYWcgc3RyaW5nIHdheSB0b28gbG9uZyEnKTtcbiAgICBleHRyYUZsYWdzID0gZmxhZ1N0cmluZy5zdWJzdHJpbmcoNDYsIDkyKS5wYWRFbmQoNDYsICcgJyk7XG4gICAgZmxhZ1N0cmluZyA9IGZsYWdTdHJpbmcuc3Vic3RyaW5nKDAsIDQ2KTtcbiAgfVxuICAvLyBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPD0gMzYpIHtcbiAgLy8gICAvLyBhdHRlbXB0IHRvIGJyZWFrIGl0IG1vcmUgZmF2b3JhYmx5XG5cbiAgLy8gfVxuICAvLyAgIGZsYWdTdHJpbmcgPSBbJ0ZMQUdTICcsXG4gIC8vICAgICAgICAgICAgICAgICBmbGFnU3RyaW5nLnN1YnN0cmluZygwLCAxOCkucGFkRW5kKDE4LCAnICcpLFxuICAvLyAgICAgICAgICAgICAgICAgJyAgICAgICcsXG5cbiAgLy8gfVxuXG4gIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnBhZEVuZCg0NiwgJyAnKTtcblxuICBlbWJlZCgweDI3N2ZmLCBpbnRlcmNhbGF0ZShmbGFnU3RyaW5nLnN1YnN0cmluZygwLCAyMyksIGZsYWdTdHJpbmcuc3Vic3RyaW5nKDIzKSkpO1xuICBpZiAoZXh0cmFGbGFncykge1xuICAgIGVtYmVkKDB4Mjc4MmYsIGludGVyY2FsYXRlKGV4dHJhRmxhZ3Muc3Vic3RyaW5nKDAsIDIzKSwgZXh0cmFGbGFncy5zdWJzdHJpbmcoMjMpKSk7XG4gIH1cblxuICBlbWJlZCgweDI3ODg1LCBpbnRlcmNhbGF0ZShjcmNTdHJpbmcuc3Vic3RyaW5nKDAsIDQpLCBjcmNTdHJpbmcuc3Vic3RyaW5nKDQpKSk7XG5cbiAgLy8gZW1iZWQoMHgyNWVhOCwgYHYuJHtoYXNofSAgICR7c2VlZH1gKTtcbiAgZW1iZWQoMHgyNTcxNiwgJ1JBTkRPTUlaRVInKTtcbiAgaWYgKHZlcnNpb24uU1RBVFVTID09PSAndW5zdGFibGUnKSBlbWJlZCgweDI1NzNjLCAnQkVUQScpO1xuICAvLyBOT1RFOiBpdCB3b3VsZCBiZSBwb3NzaWJsZSB0byBhZGQgdGhlIGhhc2gvc2VlZC9ldGMgdG8gdGhlIHRpdGxlXG4gIC8vIHBhZ2UgYXMgd2VsbCwgYnV0IHdlJ2QgbmVlZCB0byByZXBsYWNlIHRoZSB1bnVzZWQgbGV0dGVycyBpbiBiYW5rXG4gIC8vICQxZCB3aXRoIHRoZSBtaXNzaW5nIG51bWJlcnMgKEosIFEsIFcsIFgpLCBhcyB3ZWxsIGFzIHRoZSB0d29cbiAgLy8gd2VpcmQgc3F1YXJlcyBhdCAkNWIgYW5kICQ1YyB0aGF0IGRvbid0IGFwcGVhciB0byBiZSB1c2VkLiAgVG9nZXRoZXJcbiAgLy8gd2l0aCB1c2luZyB0aGUgbGV0dGVyICdPJyBhcyAwLCB0aGF0J3Mgc3VmZmljaWVudCB0byBjcmFtIGluIGFsbCB0aGVcbiAgLy8gbnVtYmVycyBhbmQgZGlzcGxheSBhcmJpdHJhcnkgaGV4IGRpZ2l0cy5cblxuICByZXR1cm4gY3JjO1xufTtcblxuY29uc3QgcGF0Y2hCeXRlcyA9IChyb206IFVpbnQ4QXJyYXksIGFkZHJlc3M6IG51bWJlciwgYnl0ZXM6IG51bWJlcltdKSA9PiB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICByb21bYWRkcmVzcyArIGldID0gYnl0ZXNbaV07XG4gIH1cbn07XG5cbmNvbnN0IHBhdGNoV29yZHMgPSAocm9tOiBVaW50OEFycmF5LCBhZGRyZXNzOiBudW1iZXIsIHdvcmRzOiBudW1iZXJbXSkgPT4ge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDIgKiB3b3Jkcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJvbVthZGRyZXNzICsgaV0gPSB3b3Jkc1tpID4+PiAxXSAmIDB4ZmY7XG4gICAgcm9tW2FkZHJlc3MgKyBpICsgMV0gPSB3b3Jkc1tpID4+PiAxXSA+Pj4gODtcbiAgfVxufTtcblxuLy8gZ29lcyB3aXRoIGVuZW15IHN0YXQgcmVjb21wdXRhdGlvbnMgaW4gcG9zdHNodWZmbGUuc1xuY29uc3QgdXBkYXRlQ29pbkRyb3BzID0gKHJvbTogVWludDhBcnJheSwgZmxhZ3M6IEZsYWdTZXQpID0+IHtcbiAgcm9tID0gcm9tLnN1YmFycmF5KDB4MTApO1xuICBpZiAoZmxhZ3MuZGlzYWJsZVNob3BHbGl0Y2goKSkge1xuICAgIC8vIGJpZ2dlciBnb2xkIGRyb3BzIGlmIG5vIHNob3AgZ2xpdGNoLCBwYXJ0aWN1bGFybHkgYXQgdGhlIHN0YXJ0XG4gICAgLy8gLSBzdGFydHMgb3V0IGZpYm9uYWNjaSwgdGhlbiBnb2VzIGxpbmVhciBhdCA2MDBcbiAgICBwYXRjaFdvcmRzKHJvbSwgMHgzNGJkZSwgW1xuICAgICAgICAwLCAgIDUsICAxMCwgIDE1LCAgMjUsICA0MCwgIDY1LCAgMTA1LFxuICAgICAgMTcwLCAyNzUsIDQ0NSwgNjAwLCA3MDAsIDgwMCwgOTAwLCAxMDAwLFxuICAgIF0pO1xuICB9IGVsc2Uge1xuICAgIC8vIHRoaXMgdGFibGUgaXMgYmFzaWNhbGx5IG1lYW5pbmdsZXNzIGIvYyBzaG9wIGdsaXRjaFxuICAgIHBhdGNoV29yZHMocm9tLCAweDM0YmRlLCBbXG4gICAgICAgIDAsICAgMSwgICAyLCAgIDQsICAgOCwgIDE2LCAgMzAsICA1MCxcbiAgICAgIDEwMCwgMjAwLCAzMDAsIDQwMCwgNTAwLCA2MDAsIDcwMCwgODAwLFxuICAgIF0pO1xuICB9XG59O1xuXG4vLyBnb2VzIHdpdGggZW5lbXkgc3RhdCByZWNvbXB1dGF0aW9ucyBpbiBwb3N0c2h1ZmZsZS5zXG5jb25zdCB1cGRhdGVEaWZmaWN1bHR5U2NhbGluZ1RhYmxlcyA9IChyb206IFVpbnQ4QXJyYXksIGZsYWdzOiBGbGFnU2V0LCBhc206IEFzc2VtYmxlcikgPT4ge1xuICByb20gPSByb20uc3ViYXJyYXkoMHgxMCk7XG5cbiAgLy8gQ3VycmVudGx5IHRoaXMgaXMgdGhyZWUgJDMwLWJ5dGUgdGFibGVzLCB3aGljaCB3ZSBzdGFydCBhdCB0aGUgYmVnaW5uaW5nXG4gIC8vIG9mIHRoZSBwb3N0c2h1ZmZsZSBDb21wdXRlRW5lbXlTdGF0cy5cbiAgY29uc3QgZGlmZiA9IHNlcSg0OCwgeCA9PiB4KTtcblxuICAvLyBQQXRrID0gNSArIERpZmYgKiAxNS8zMlxuICAvLyBEaWZmQXRrIHRhYmxlIGlzIDggKiBQQXRrID0gcm91bmQoNDAgKyAoRGlmZiAqIDE1IC8gNCkpXG4gIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmQXRrJyksXG4gICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDQwICsgZCAqIDE1IC8gNCkpKTtcblxuICAvLyBOT1RFOiBPbGQgRGlmZkRlZiB0YWJsZSAoNCAqIFBEZWYpIHdhcyAxMiArIERpZmYgKiAzLCBidXQgd2Ugbm8gbG9uZ2VyXG4gIC8vIHVzZSB0aGlzIHRhYmxlIHNpbmNlIG5lcmZpbmcgYXJtb3JzLlxuICAvLyAoUERlZiA9IDMgKyBEaWZmICogMy80KVxuICAvLyBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkRlZicpLFxuICAvLyAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gMTIgKyBkICogMykpO1xuXG4gIC8vIE5PVEU6IFRoaXMgaXMgdGhlIGFybW9yLW5lcmZlZCBEaWZmRGVmIHRhYmxlLlxuICAvLyBQRGVmID0gMiArIERpZmYgLyAyXG4gIC8vIERpZmZEZWYgdGFibGUgaXMgNCAqIFBEZWYgPSA4ICsgRGlmZiAqIDJcbiAgLy8gcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZEZWYnKSxcbiAgLy8gICAgICAgICAgICBkaWZmLm1hcChkID0+IDggKyBkICogMikpO1xuXG4gIC8vIE5PVEU6IEZvciBhcm1vciBjYXAgYXQgMyAqIEx2bCwgc2V0IFBEZWYgPSBEaWZmXG4gIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmRGVmJyksXG4gICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiBkICogNCkpO1xuXG4gIC8vIERpZmZIUCB0YWJsZSBpcyBQSFAgPSBtaW4oMjU1LCA0OCArIHJvdW5kKERpZmYgKiAxMSAvIDIpKVxuICBjb25zdCBwaHBTdGFydCA9IGZsYWdzLmRlY3JlYXNlRW5lbXlEYW1hZ2UoKSA/IDE2IDogNDg7XG4gIGNvbnN0IHBocEluY3IgPSBmbGFncy5kZWNyZWFzZUVuZW15RGFtYWdlKCkgPyA2IDogNS41O1xuICBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkhQJyksXG4gICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiBNYXRoLm1pbigyNTUsIHBocFN0YXJ0ICsgTWF0aC5yb3VuZChkICogcGhwSW5jcikpKSk7XG5cbiAgLy8gRGlmZkV4cCB0YWJsZSBpcyBFeHBCID0gY29tcHJlc3MoZmxvb3IoNCAqICgyICoqICgoMTYgKyA5ICogRGlmZikgLyAzMikpKSlcbiAgLy8gd2hlcmUgY29tcHJlc3MgbWFwcyB2YWx1ZXMgPiAxMjcgdG8gJDgwfCh4Pj40KVxuXG4gIGNvbnN0IGV4cEZhY3RvciA9IGZsYWdzLmV4cFNjYWxpbmdGYWN0b3IoKTtcbiAgcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZFeHAnKSwgZGlmZi5tYXAoZCA9PiB7XG4gICAgY29uc3QgZXhwID0gTWF0aC5mbG9vcig0ICogKDIgKiogKCgxNiArIDkgKiBkKSAvIDMyKSkgKiBleHBGYWN0b3IpO1xuICAgIHJldHVybiBleHAgPCAweDgwID8gZXhwIDogTWF0aC5taW4oMHhmZiwgMHg4MCArIChleHAgPj4gNCkpO1xuICB9KSk7XG5cbiAgLy8gLy8gSGFsdmUgc2hpZWxkIGFuZCBhcm1vciBkZWZlbnNlIHZhbHVlc1xuICAvLyBwYXRjaEJ5dGVzKHJvbSwgMHgzNGJjMCwgW1xuICAvLyAgIC8vIEFybW9yIGRlZmVuc2VcbiAgLy8gICAwLCAxLCAzLCA1LCA3LCA5LCAxMiwgMTAsIDE2LFxuICAvLyAgIC8vIFNoaWVsZCBkZWZlbnNlXG4gIC8vICAgMCwgMSwgMywgNCwgNiwgOSwgOCwgMTIsIDE2LFxuICAvLyBdKTtcblxuICAvLyBBZGp1c3Qgc2hpZWxkIGFuZCBhcm1vciBkZWZlbnNlIHZhbHVlc1xuICBwYXRjaEJ5dGVzKHJvbSwgMHgzNGJjMCwgW1xuICAgIC8vIEFybW9yIGRlZmVuc2VcbiAgICAwLCAyLCA2LCAxMCwgMTQsIDE4LCAzMiwgMjQsIDIwLFxuICAgIC8vIFNoaWVsZCBkZWZlbnNlXG4gICAgMCwgMiwgNiwgMTAsIDE0LCAxOCwgMTYsIDMyLCAyMCxcbiAgXSk7XG59O1xuXG5jb25zdCByZXNjYWxlU2hvcHMgPSAocm9tOiBSb20sIGFzbTogQXNzZW1ibGVyLCByYW5kb20/OiBSYW5kb20pID0+IHtcbiAgLy8gUG9wdWxhdGUgcmVzY2FsZWQgcHJpY2VzIGludG8gdGhlIHZhcmlvdXMgcm9tIGxvY2F0aW9ucy5cbiAgLy8gU3BlY2lmaWNhbGx5LCB3ZSByZWFkIHRoZSBhdmFpbGFibGUgaXRlbSBJRHMgb3V0IG9mIHRoZVxuICAvLyBzaG9wIHRhYmxlcyBhbmQgdGhlbiBjb21wdXRlIG5ldyBwcmljZXMgZnJvbSB0aGVyZS5cbiAgLy8gSWYgYHJhbmRvbWAgaXMgcGFzc2VkIHRoZW4gdGhlIGJhc2UgcHJpY2UgdG8gYnV5IGVhY2hcbiAgLy8gaXRlbSBhdCBhbnkgZ2l2ZW4gc2hvcCB3aWxsIGJlIGFkanVzdGVkIHRvIGFueXdoZXJlIGZyb21cbiAgLy8gNTAlIHRvIDE1MCUgb2YgdGhlIGJhc2UgcHJpY2UuICBUaGUgcGF3biBzaG9wIHByaWNlIGlzXG4gIC8vIGFsd2F5cyA1MCUgb2YgdGhlIGJhc2UgcHJpY2UuXG5cbiAgcm9tLnNob3BDb3VudCA9IDExOyAvLyAxMSBvZiBhbGwgdHlwZXMgb2Ygc2hvcCBmb3Igc29tZSByZWFzb24uXG4gIHJvbS5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgPSBhc20uZXhwYW5kKCdTaG9wRGF0YScpO1xuXG4gIC8vIE5PVEU6IFRoaXMgaXNuJ3QgaW4gdGhlIFJvbSBvYmplY3QgeWV0Li4uXG4gIHdyaXRlTGl0dGxlRW5kaWFuKHJvbS5wcmcsIGFzbS5leHBhbmQoJ0lubkJhc2VQcmljZScpLCAyMCk7XG5cbiAgZm9yIChjb25zdCBzaG9wIG9mIHJvbS5zaG9wcykge1xuICAgIGlmIChzaG9wLnR5cGUgPT09IFNob3BUeXBlLlBBV04pIGNvbnRpbnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzaG9wLnByaWNlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHNob3AuY29udGVudHNbaV0gPCAweDgwKSB7XG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gcmFuZG9tID8gcmFuZG9tLm5leHROb3JtYWwoMSwgMC4zLCAwLjUsIDEuNSkgOiAxO1xuICAgICAgfSBlbHNlIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLklOTikge1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBqdXN0IHNldCB0aGUgb25lIHByaWNlXG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gcmFuZG9tID8gcmFuZG9tLm5leHROb3JtYWwoMSwgMC41LCAwLjM3NSwgMS42MjUpIDogMTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBBbHNvIGZpbGwgdGhlIHNjYWxpbmcgdGFibGVzLlxuICBjb25zdCBkaWZmID0gc2VxKDQ4LCB4ID0+IHgpO1xuICAvLyBUb29sIHNob3BzIHNjYWxlIGFzIDIgKiogKERpZmYgLyAxMCksIHN0b3JlIGluIDh0aHNcbiAgcGF0Y2hCeXRlcyhyb20ucHJnLCBhc20uZXhwYW5kKCdUb29sU2hvcFNjYWxpbmcnKSxcbiAgICAgICAgICAgICBkaWZmLm1hcChkID0+IE1hdGgucm91bmQoOCAqICgyICoqIChkIC8gMTApKSkpKTtcbiAgLy8gQXJtb3Igc2hvcHMgc2NhbGUgYXMgMiAqKiAoKDQ3IC0gRGlmZikgLyAxMiksIHN0b3JlIGluIDh0aHNcbiAgcGF0Y2hCeXRlcyhyb20ucHJnLCBhc20uZXhwYW5kKCdBcm1vclNob3BTY2FsaW5nJyksXG4gICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDggKiAoMiAqKiAoKDQ3IC0gZCkgLyAxMikpKSkpO1xuXG4gIC8vIFNldCB0aGUgaXRlbSBiYXNlIHByaWNlcy5cbiAgZm9yIChsZXQgaSA9IDB4MGQ7IGkgPCAweDI3OyBpKyspIHtcbiAgICByb20uaXRlbXNbaV0uYmFzZVByaWNlID0gQkFTRV9QUklDRVNbaV07XG4gIH1cblxuICAvLyBUT0RPIC0gc2VwYXJhdGUgZmxhZyBmb3IgcmVzY2FsaW5nIG1vbnN0ZXJzPz8/XG59O1xuXG4vLyBNYXAgb2YgYmFzZSBwcmljZXMuICAoVG9vbHMgYXJlIHBvc2l0aXZlLCBhcm1vcnMgYXJlIG9uZXMtY29tcGxlbWVudC4pXG5jb25zdCBCQVNFX1BSSUNFUzoge1tpdGVtSWQ6IG51bWJlcl06IG51bWJlcn0gPSB7XG4gIC8vIEFybW9yc1xuICAweDBkOiA0LCAgICAvLyBjYXJhcGFjZSBzaGllbGRcbiAgMHgwZTogMTYsICAgLy8gYnJvbnplIHNoaWVsZFxuICAweDBmOiA1MCwgICAvLyBwbGF0aW51bSBzaGllbGRcbiAgMHgxMDogMzI1LCAgLy8gbWlycm9yZWQgc2hpZWxkXG4gIDB4MTE6IDEwMDAsIC8vIGNlcmFtaWMgc2hpZWxkXG4gIDB4MTI6IDIwMDAsIC8vIHNhY3JlZCBzaGllbGRcbiAgMHgxMzogNDAwMCwgLy8gYmF0dGxlIHNoaWVsZFxuICAweDE1OiA2LCAgICAvLyB0YW5uZWQgaGlkZVxuICAweDE2OiAyMCwgICAvLyBsZWF0aGVyIGFybW9yXG4gIDB4MTc6IDc1LCAgIC8vIGJyb256ZSBhcm1vclxuICAweDE4OiAyNTAsICAvLyBwbGF0aW51bSBhcm1vclxuICAweDE5OiAxMDAwLCAvLyBzb2xkaWVyIHN1aXRcbiAgMHgxYTogNDgwMCwgLy8gY2VyYW1pYyBzdWl0XG4gIC8vIFRvb2xzXG4gIDB4MWQ6IDI1LCAgIC8vIG1lZGljYWwgaGVyYlxuICAweDFlOiAzMCwgICAvLyBhbnRpZG90ZVxuICAweDFmOiA0NSwgICAvLyBseXNpcyBwbGFudFxuICAweDIwOiA0MCwgICAvLyBmcnVpdCBvZiBsaW1lXG4gIDB4MjE6IDM2LCAgIC8vIGZydWl0IG9mIHBvd2VyXG4gIDB4MjI6IDIwMCwgIC8vIG1hZ2ljIHJpbmdcbiAgMHgyMzogMTUwLCAgLy8gZnJ1aXQgb2YgcmVwdW5cbiAgMHgyNDogNjUsICAgLy8gd2FycCBib290c1xuICAweDI2OiAzMDAsICAvLyBvcGVsIHN0YXR1ZVxuICAvLyAweDMxOiA1MCwgLy8gYWxhcm0gZmx1dGVcbn07XG5cbi8vLy8vLy8vL1xuLy8vLy8vLy8vXG4vLy8vLy8vLy9cblxuZnVuY3Rpb24gcmVzY2FsZU1vbnN0ZXJzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcblxuICAvLyBUT0RPIC0gZmluZCBhbnl0aGluZyBzaGFyaW5nIHRoZSBzYW1lIG1lbW9yeSBhbmQgdXBkYXRlIHRoZW0gYXMgd2VsbFxuICBjb25zdCB1bnNjYWxlZE1vbnN0ZXJzID1cbiAgICAgIG5ldyBTZXQ8bnVtYmVyPihzZXEoMHgxMDAsIHggPT4geCkuZmlsdGVyKHMgPT4gcyBpbiByb20ub2JqZWN0cykpO1xuICBmb3IgKGNvbnN0IFtpZF0gb2YgU0NBTEVEX01PTlNURVJTKSB7XG4gICAgdW5zY2FsZWRNb25zdGVycy5kZWxldGUoaWQpO1xuICB9XG4gIGZvciAoY29uc3QgW2lkLCBtb25zdGVyXSBvZiBTQ0FMRURfTU9OU1RFUlMpIHtcbiAgICBmb3IgKGNvbnN0IG90aGVyIG9mIHVuc2NhbGVkTW9uc3RlcnMpIHtcbiAgICAgIGlmIChyb20ub2JqZWN0c1tpZF0uYmFzZSA9PT0gcm9tLm9iamVjdHNbb3RoZXJdLmJhc2UpIHtcbiAgICAgICAgU0NBTEVEX01PTlNURVJTLnNldChvdGhlciwgbW9uc3Rlcik7XG4gICAgICAgIHVuc2NhbGVkTW9uc3RlcnMuZGVsZXRlKGlkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBGbGFpbHMgKGY5LCBmYSkgYW5kIFNhYmVyYSAyJ3MgZmlyZWJhbGxzIChjOCkgc2hvdWxkIGJlIHByb2plY3RpbGVzLlxuICAvLyBNb3Jlb3ZlciwgZm9yIHNvbWUgd2VpcmQgcmVhc29uIHRoZXkncmUgc2V0IHVwIHRvIGNhdXNlIHBhcmFseXNpcywgc29cbiAgLy8gbGV0J3MgZml4IHRoYXQsIHRvby5cbiAgZm9yIChjb25zdCBvYmogb2YgWzB4YzgsIDB4ZjksIDB4ZmFdKSB7XG4gICAgLy8gTk9URTogZmxhaWxzIG5lZWQgYXR0YWNrdHlwZSAkZmUsIG5vdCAkZmZcbiAgICByb20ub2JqZWN0c1tvYmpdLmF0dGFja1R5cGUgPSBvYmogPiAweGYwID8gMHhmZSA6IDB4ZmY7XG4gICAgcm9tLm9iamVjdHNbb2JqXS5zdGF0dXNFZmZlY3QgPSAwO1xuICB9XG4gIC8vIEZpeCBTYWJlcmEgMSdzIGVsZW1lbnRhbCBkZWZlbnNlIHRvIG5vIGxvbmdlciBhbGxvdyB0aHVuZGVyXG4gIHJvbS5vYmplY3RzWzB4N2RdLmVsZW1lbnRzIHw9IDB4MDg7XG5cbiAgY29uc3QgQk9TU0VTID0gbmV3IFNldChbMHg1NywgMHg1ZSwgMHg2OCwgMHg3ZCwgMHg4OCwgMHg5NywgMHg5YiwgMHg5ZV0pO1xuICBjb25zdCBTTElNRVMgPSBuZXcgU2V0KFsweDUwLCAweDUzLCAweDVmLCAweDY5XSk7XG4gIGZvciAoY29uc3QgW2lkLCB7c2RlZiwgc3dyZCwgaGl0cywgc2F0aywgZGdsZCwgc2V4cH1dIG9mIFNDQUxFRF9NT05TVEVSUykge1xuICAgIC8vIGluZGljYXRlIHRoYXQgdGhpcyBvYmplY3QgbmVlZHMgc2NhbGluZ1xuICAgIGNvbnN0IG8gPSByb20ub2JqZWN0c1tpZF0uZGF0YTtcbiAgICBjb25zdCBib3NzID0gQk9TU0VTLmhhcyhpZCkgPyAxIDogMDtcbiAgICBvWzJdIHw9IDB4ODA7IC8vIHJlY29pbFxuICAgIG9bNl0gPSBoaXRzOyAvLyBIUFxuICAgIG9bN10gPSBzYXRrOyAgLy8gQVRLXG4gICAgLy8gU3dvcmQ6IDAuLjMgKHdpbmQgLSB0aHVuZGVyKSBwcmVzZXJ2ZWQsIDQgKGNyeXN0YWxpcykgPT4gN1xuICAgIG9bOF0gPSBzZGVmIHwgc3dyZCA8PCA0OyAvLyBERUZcbiAgICAvLyBOT1RFOiBsb25nIGFnbyB3ZSBzdG9yZWQgd2hldGhlciB0aGlzIHdhcyBhIGJvc3MgaW4gdGhlIGxvd2VzdFxuICAgIC8vIGJpdCBvZiB0aGUgbm93LXVudXNlZCBMRVZFTC4gc28gdGhhdCB3ZSBjb3VsZCBpbmNyZWFzZSBzY2FsaW5nXG4gICAgLy8gb24ga2lsbGluZyB0aGVtLCBidXQgbm93IHRoYXQgc2NhbGluZyBpcyB0aWVkIHRvIGl0ZW1zLCB0aGF0J3NcbiAgICAvLyBubyBsb25nZXIgbmVlZGVkIC0gd2UgY291bGQgY28tb3B0IHRoaXMgdG8gaW5zdGVhZCBzdG9yZSB1cHBlclxuICAgIC8vIGJpdHMgb2YgSFAgKG9yIHBvc3NpYmx5IGxvd2VyIGJpdHMgc28gdGhhdCBIUC1iYXNlZCBlZmZlY3RzXG4gICAgLy8gc3RpbGwgd29yayBjb3JyZWN0bHkpLlxuICAgIC8vIG9bOV0gPSBvWzldICYgMHhlMDtcbiAgICBvWzE2XSA9IG9bMTZdICYgMHgwZiB8IGRnbGQgPDwgNDsgLy8gR0xEXG4gICAgb1sxN10gPSBzZXhwOyAvLyBFWFBcblxuICAgIGlmIChib3NzID8gZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpIDogZmxhZ3Muc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpKSB7XG4gICAgICBpZiAoIVNMSU1FUy5oYXMoaWQpKSB7XG4gICAgICAgIGNvbnN0IGJpdHMgPSBbLi4ucm9tLm9iamVjdHNbaWRdLmVsZW1lbnRzLnRvU3RyaW5nKDIpLnBhZFN0YXJ0KDQsICcwJyldO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShiaXRzKTtcbiAgICAgICAgcm9tLm9iamVjdHNbaWRdLmVsZW1lbnRzID0gTnVtYmVyLnBhcnNlSW50KGJpdHMuam9pbignJyksIDIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGhhbmRsZSBzbGltZXMgYWxsIGF0IG9uY2VcbiAgaWYgKGZsYWdzLnNodWZmbGVNb25zdGVyRWxlbWVudHMoKSkge1xuICAgIC8vIHBpY2sgYW4gZWxlbWVudCBmb3Igc2xpbWUgZGVmZW5zZVxuICAgIGNvbnN0IGUgPSByYW5kb20ubmV4dEludCg0KTtcbiAgICByb20ucHJnWzB4MzUyMmRdID0gZSArIDE7XG4gICAgZm9yIChjb25zdCBpZCBvZiBTTElNRVMpIHtcbiAgICAgIHJvbS5vYmplY3RzW2lkXS5lbGVtZW50cyA9IDEgPDwgZTtcbiAgICB9XG4gIH1cblxuICAvLyByb20ud3JpdGVPYmplY3REYXRhKCk7XG59O1xuXG5jb25zdCBzaHVmZmxlTW9uc3RlcnMgPSAocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSkgPT4ge1xuICAvLyBUT0RPOiBvbmNlIHdlIGhhdmUgbG9jYXRpb24gbmFtZXMsIGNvbXBpbGUgYSBzcG9pbGVyIG9mIHNodWZmbGVkIG1vbnN0ZXJzXG4gIGNvbnN0IGdyYXBoaWNzID0gbmV3IEdyYXBoaWNzKHJvbSk7XG4gIC8vICh3aW5kb3cgYXMgYW55KS5ncmFwaGljcyA9IGdyYXBoaWNzO1xuICBpZiAoZmxhZ3Muc2h1ZmZsZVNwcml0ZVBhbGV0dGVzKCkpIGdyYXBoaWNzLnNodWZmbGVQYWxldHRlcyhyYW5kb20pO1xuICBjb25zdCBwb29sID0gbmV3IE1vbnN0ZXJQb29sKGZsYWdzLCB7fSk7XG4gIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBpZiAobG9jLnVzZWQpIHBvb2wucG9wdWxhdGUobG9jKTtcbiAgfVxuICBwb29sLnNodWZmbGUocmFuZG9tLCBncmFwaGljcyk7XG59O1xuXG5jb25zdCBpZGVudGlmeUtleUl0ZW1zRm9yRGlmZmljdWx0eUJ1ZmZzID0gKHJvbTogUm9tKSA9PiB7XG4gIC8vIC8vIFRhZyBrZXkgaXRlbXMgZm9yIGRpZmZpY3VsdHkgYnVmZnNcbiAgLy8gZm9yIChjb25zdCBnZXQgb2Ygcm9tLml0ZW1HZXRzKSB7XG4gIC8vICAgY29uc3QgaXRlbSA9IElURU1TLmdldChnZXQuaXRlbUlkKTtcbiAgLy8gICBpZiAoIWl0ZW0gfHwgIWl0ZW0ua2V5KSBjb250aW51ZTtcbiAgLy8gICBnZXQua2V5ID0gdHJ1ZTtcbiAgLy8gfVxuICAvLyAvLyBjb25zb2xlLmxvZyhyZXBvcnQpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDB4NDk7IGkrKykge1xuICAgIC8vIE5PVEUgLSBzcGVjaWFsIGhhbmRsaW5nIGZvciBhbGFybSBmbHV0ZSB1bnRpbCB3ZSBwcmUtcGF0Y2hcbiAgICBjb25zdCB1bmlxdWUgPSAocm9tLnByZ1sweDIwZmYwICsgaV0gJiAweDQwKSB8fCBpID09PSAweDMxO1xuICAgIGNvbnN0IGJpdCA9IDEgPDwgKGkgJiA3KTtcbiAgICBjb25zdCBhZGRyID0gMHgxZTExMCArIChpID4+PiAzKTtcbiAgICByb20ucHJnW2FkZHJdID0gcm9tLnByZ1thZGRyXSAmIH5iaXQgfCAodW5pcXVlID8gYml0IDogMCk7XG4gIH1cbn07XG5cbmludGVyZmFjZSBNb25zdGVyRGF0YSB7XG4gIGlkOiBudW1iZXI7XG4gIHR5cGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBzZGVmOiBudW1iZXI7XG4gIHN3cmQ6IG51bWJlcjtcbiAgaGl0czogbnVtYmVyO1xuICBzYXRrOiBudW1iZXI7XG4gIGRnbGQ6IG51bWJlcjtcbiAgc2V4cDogbnVtYmVyO1xufVxuXG4vKiB0c2xpbnQ6ZGlzYWJsZTp0cmFpbGluZy1jb21tYSB3aGl0ZXNwYWNlICovXG5jb25zdCBTQ0FMRURfTU9OU1RFUlM6IE1hcDxudW1iZXIsIE1vbnN0ZXJEYXRhPiA9IG5ldyBNYXAoW1xuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4M2YsICdwJywgJ1NvcmNlcm9yIHNob3QnLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE5LCAgLCAgICAsXSxcbiAgWzB4NGIsICdtJywgJ3dyYWl0aD8/JywgICAgICAgICAgICAgICAgICAgMiwgICwgICAyLCAgIDIyLCAgNCwgICA2MV0sXG4gIFsweDRmLCAnbScsICd3cmFpdGgnLCAgICAgICAgICAgICAgICAgICAgIDEsICAsICAgMiwgICAyMCwgIDQsICAgNjFdLFxuICBbMHg1MCwgJ20nLCAnQmx1ZSBTbGltZScsICAgICAgICAgICAgICAgICAsICAgLCAgIDEsICAgMTYsICAyLCAgIDMyXSxcbiAgWzB4NTEsICdtJywgJ1dlcmV0aWdlcicsICAgICAgICAgICAgICAgICAgLCAgICwgICAxLCAgIDIxLCAgNCwgICA0MF0sXG4gIFsweDUyLCAnbScsICdHcmVlbiBKZWxseScsICAgICAgICAgICAgICAgIDQsICAsICAgMywgICAxNiwgIDQsICAgMzZdLFxuICBbMHg1MywgJ20nLCAnUmVkIFNsaW1lJywgICAgICAgICAgICAgICAgICA2LCAgLCAgIDQsICAgMTYsICA0LCAgIDQ4XSxcbiAgWzB4NTQsICdtJywgJ1JvY2sgR29sZW0nLCAgICAgICAgICAgICAgICAgNiwgICwgICAxMSwgIDI0LCAgNiwgICA4NV0sXG4gIFsweDU1LCAnbScsICdCbHVlIEJhdCcsICAgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICA0LCAgICwgICAgMzJdLFxuICBbMHg1NiwgJ20nLCAnR3JlZW4gV3l2ZXJuJywgICAgICAgICAgICAgICA0LCAgLCAgIDQsICAgMjQsICA2LCAgIDUyXSxcbiAgWzB4NTcsICdiJywgJ1ZhbXBpcmUnLCAgICAgICAgICAgICAgICAgICAgMywgICwgICAxMiwgIDE4LCAgLCAgICAxMTBdLFxuICBbMHg1OCwgJ20nLCAnT3JjJywgICAgICAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDQsICAgMjEsICA0LCAgIDU3XSxcbiAgWzB4NTksICdtJywgJ1JlZCBGbHlpbmcgU3dhbXAgSW5zZWN0JywgICAgMywgICwgICAxLCAgIDIxLCAgNCwgICA1N10sXG4gIFsweDVhLCAnbScsICdCbHVlIE11c2hyb29tJywgICAgICAgICAgICAgIDIsICAsICAgMSwgICAyMSwgIDQsICAgNDRdLFxuICBbMHg1YiwgJ20nLCAnU3dhbXAgVG9tYXRvJywgICAgICAgICAgICAgICAzLCAgLCAgIDIsICAgMzUsICA0LCAgIDUyXSxcbiAgWzB4NWMsICdtJywgJ0ZseWluZyBNZWFkb3cgSW5zZWN0JywgICAgICAgMywgICwgICAzLCAgIDIzLCAgNCwgICA4MV0sXG4gIFsweDVkLCAnbScsICdTd2FtcCBQbGFudCcsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAsICAgICwgICAgMzZdLFxuICBbMHg1ZSwgJ2InLCAnSW5zZWN0JywgICAgICAgICAgICAgICAgICAgICAsICAgMSwgIDgsICAgNiwgICAsICAgIDEwMF0sXG4gIFsweDVmLCAnbScsICdMYXJnZSBCbHVlIFNsaW1lJywgICAgICAgICAgIDUsICAsICAgMywgICAyMCwgIDQsICAgNTJdLFxuICBbMHg2MCwgJ20nLCAnSWNlIFpvbWJpZScsICAgICAgICAgICAgICAgICA1LCAgLCAgIDcsICAgMTQsICA0LCAgIDU3XSxcbiAgWzB4NjEsICdtJywgJ0dyZWVuIExpdmluZyBSb2NrJywgICAgICAgICAgLCAgICwgICAxLCAgIDksICAgNCwgICAyOF0sXG4gIFsweDYyLCAnbScsICdHcmVlbiBTcGlkZXInLCAgICAgICAgICAgICAgIDQsICAsICAgNCwgICAyMiwgIDQsICAgNDRdLFxuICBbMHg2MywgJ20nLCAnUmVkL1B1cnBsZSBXeXZlcm4nLCAgICAgICAgICAzLCAgLCAgIDQsICAgMzAsICA0LCAgIDY1XSxcbiAgWzB4NjQsICdtJywgJ0RyYXlnb25pYSBTb2xkaWVyJywgICAgICAgICAgNiwgICwgICAxMSwgIDM2LCAgNCwgICA4OV0sXG4gIC8vIElEICBUWVBFICBOQU1FICAgICAgICAgICAgICAgICAgICAgICBTREVGIFNXUkQgSElUUyBTQVRLIERHTEQgU0VYUFxuICBbMHg2NSwgJ20nLCAnSWNlIEVudGl0eScsICAgICAgICAgICAgICAgICAzLCAgLCAgIDIsICAgMjQsICA0LCAgIDUyXSxcbiAgWzB4NjYsICdtJywgJ1JlZCBMaXZpbmcgUm9jaycsICAgICAgICAgICAgLCAgICwgICAxLCAgIDEzLCAgNCwgICA0MF0sXG4gIFsweDY3LCAnbScsICdJY2UgR29sZW0nLCAgICAgICAgICAgICAgICAgIDcsICAyLCAgMTEsICAyOCwgIDQsICAgODFdLFxuICBbMHg2OCwgJ2InLCAnS2VsYmVzcXVlJywgICAgICAgICAgICAgICAgICA0LCAgNiwgIDEyLCAgMjksICAsICAgIDEyMF0sXG4gIFsweDY5LCAnbScsICdHaWFudCBSZWQgU2xpbWUnLCAgICAgICAgICAgIDcsICAsICAgNDAsICA5MCwgIDQsICAgMTAyXSxcbiAgWzB4NmEsICdtJywgJ1Ryb2xsJywgICAgICAgICAgICAgICAgICAgICAgMiwgICwgICAzLCAgIDI0LCAgNCwgICA2NV0sXG4gIFsweDZiLCAnbScsICdSZWQgSmVsbHknLCAgICAgICAgICAgICAgICAgIDIsICAsICAgMiwgICAxNCwgIDQsICAgNDRdLFxuICBbMHg2YywgJ20nLCAnTWVkdXNhJywgICAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDQsICAgMzYsICA4LCAgIDc3XSxcbiAgWzB4NmQsICdtJywgJ1JlZCBDcmFiJywgICAgICAgICAgICAgICAgICAgMiwgICwgICAxLCAgIDIxLCAgNCwgICA0NF0sXG4gIFsweDZlLCAnbScsICdNZWR1c2EgSGVhZCcsICAgICAgICAgICAgICAgICwgICAsICAgMSwgICAyOSwgIDQsICAgMzZdLFxuICBbMHg2ZiwgJ20nLCAnRXZpbCBCaXJkJywgICAgICAgICAgICAgICAgICAsICAgLCAgIDIsICAgMzAsICA2LCAgIDY1XSxcbiAgWzB4NzEsICdtJywgJ1JlZC9QdXJwbGUgTXVzaHJvb20nLCAgICAgICAgMywgICwgICA1LCAgIDE5LCAgNiwgICA2OV0sXG4gIFsweDcyLCAnbScsICdWaW9sZXQgRWFydGggRW50aXR5JywgICAgICAgIDMsICAsICAgMywgICAxOCwgIDYsICAgNjFdLFxuICBbMHg3MywgJ20nLCAnTWltaWMnLCAgICAgICAgICAgICAgICAgICAgICAsICAgLCAgIDMsICAgMjYsICAxNSwgIDczXSxcbiAgWzB4NzQsICdtJywgJ1JlZCBTcGlkZXInLCAgICAgICAgICAgICAgICAgMywgICwgICA0LCAgIDIyLCAgNiwgICA0OF0sXG4gIFsweDc1LCAnbScsICdGaXNobWFuJywgICAgICAgICAgICAgICAgICAgIDQsICAsICAgNiwgICAxOSwgIDUsICAgNjFdLFxuICBbMHg3NiwgJ20nLCAnSmVsbHlmaXNoJywgICAgICAgICAgICAgICAgICAsICAgLCAgIDMsICAgMTQsICAzLCAgIDQ4XSxcbiAgWzB4NzcsICdtJywgJ0tyYWtlbicsICAgICAgICAgICAgICAgICAgICAgNSwgICwgICAxMSwgIDI1LCAgNywgICA3M10sXG4gIFsweDc4LCAnbScsICdEYXJrIEdyZWVuIFd5dmVybicsICAgICAgICAgIDQsICAsICAgNSwgICAyMSwgIDUsICAgNjFdLFxuICBbMHg3OSwgJ20nLCAnU2FuZCBNb25zdGVyJywgICAgICAgICAgICAgICA1LCAgLCAgIDgsICAgNiwgICA0LCAgIDU3XSxcbiAgWzB4N2IsICdtJywgJ1dyYWl0aCBTaGFkb3cgMScsICAgICAgICAgICAgLCAgICwgICAsICAgIDksICAgNywgICA0NF0sXG4gIFsweDdjLCAnbScsICdLaWxsZXIgTW90aCcsICAgICAgICAgICAgICAgICwgICAsICAgMiwgICAzNSwgICwgICAgNzddLFxuICBbMHg3ZCwgJ2InLCAnU2FiZXJhJywgICAgICAgICAgICAgICAgICAgICAzLCAgNywgIDEzLCAgMjQsICAsICAgIDExMF0sXG4gIFsweDgwLCAnbScsICdEcmF5Z29uaWEgQXJjaGVyJywgICAgICAgICAgIDEsICAsICAgMywgICAyMCwgIDYsICAgNjFdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4ODEsICdtJywgJ0V2aWwgQm9tYmVyIEJpcmQnLCAgICAgICAgICAgLCAgICwgICAxLCAgIDE5LCAgNCwgICA2NV0sXG4gIFsweDgyLCAnbScsICdMYXZhbWFuL2Jsb2InLCAgICAgICAgICAgICAgIDMsICAsICAgMywgICAyNCwgIDYsICAgODVdLFxuICBbMHg4NCwgJ20nLCAnTGl6YXJkbWFuICh3LyBmbGFpbCgnLCAgICAgICAyLCAgLCAgIDMsICAgMzAsICA2LCAgIDgxXSxcbiAgWzB4ODUsICdtJywgJ0dpYW50IEV5ZScsICAgICAgICAgICAgICAgICAgMywgICwgICA1LCAgIDMzLCAgNCwgICA4MV0sXG4gIFsweDg2LCAnbScsICdTYWxhbWFuZGVyJywgICAgICAgICAgICAgICAgIDIsICAsICAgNCwgICAyOSwgIDgsICAgNzddLFxuICBbMHg4NywgJ20nLCAnU29yY2Vyb3InLCAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDUsICAgMzEsICA2LCAgIDY1XSxcbiAgWzB4ODgsICdiJywgJ01hZG8nLCAgICAgICAgICAgICAgICAgICAgICAgNCwgIDgsICAxMCwgIDMwLCAgLCAgICAxMTBdLFxuICBbMHg4OSwgJ20nLCAnRHJheWdvbmlhIEtuaWdodCcsICAgICAgICAgICAyLCAgLCAgIDMsICAgMjQsICA0LCAgIDc3XSxcbiAgWzB4OGEsICdtJywgJ0RldmlsJywgICAgICAgICAgICAgICAgICAgICAgLCAgICwgICAxLCAgIDE4LCAgNCwgICA1Ml0sXG4gIFsweDhiLCAnYicsICdLZWxiZXNxdWUgMicsICAgICAgICAgICAgICAgIDQsICA2LCAgMTEsICAyNywgICwgICAgMTEwXSxcbiAgWzB4OGMsICdtJywgJ1dyYWl0aCBTaGFkb3cgMicsICAgICAgICAgICAgLCAgICwgICAsICAgIDE3LCAgNCwgICA0OF0sXG4gIFsweDkwLCAnYicsICdTYWJlcmEgMicsICAgICAgICAgICAgICAgICAgIDUsICA3LCAgMjEsICAyNywgICwgICAgMTIwXSxcbiAgWzB4OTEsICdtJywgJ1RhcmFudHVsYScsICAgICAgICAgICAgICAgICAgMywgICwgICAzLCAgIDIxLCAgNiwgICA3M10sXG4gIFsweDkyLCAnbScsICdTa2VsZXRvbicsICAgICAgICAgICAgICAgICAgICwgICAsICAgNCwgICAzMCwgIDYsICAgNjldLFxuICBbMHg5MywgJ2InLCAnTWFkbyAyJywgICAgICAgICAgICAgICAgICAgICA0LCAgOCwgIDExLCAgMjUsICAsICAgIDEyMF0sXG4gIFsweDk0LCAnbScsICdQdXJwbGUgR2lhbnQgRXllJywgICAgICAgICAgIDQsICAsICAgMTAsICAyMywgIDYsICAgMTAyXSxcbiAgWzB4OTUsICdtJywgJ0JsYWNrIEtuaWdodCAody8gZmxhaWwpJywgICAgMywgICwgICA3LCAgIDI2LCAgNiwgICA4OV0sXG4gIFsweDk2LCAnbScsICdTY29ycGlvbicsICAgICAgICAgICAgICAgICAgIDMsICAsICAgNSwgICAyOSwgIDIsICAgNzNdLFxuICBbMHg5NywgJ2InLCAnS2FybWluZScsICAgICAgICAgICAgICAgICAgICA0LCAgLCAgIDE0LCAgMjYsICAsICAgIDExMF0sXG4gIFsweDk4LCAnbScsICdTYW5kbWFuL2Jsb2InLCAgICAgICAgICAgICAgIDMsICAsICAgNSwgICAzNiwgIDYsICAgOThdLFxuICBbMHg5OSwgJ20nLCAnTXVtbXknLCAgICAgICAgICAgICAgICAgICAgICA1LCAgLCAgIDE5LCAgMzYsICA2LCAgIDExMF0sXG4gIFsweDlhLCAnbScsICdUb21iIEd1YXJkaWFuJywgICAgICAgICAgICAgIDcsICAsICAgNjAsICAzNywgIDYsICAgMTA2XSxcbiAgWzB4OWIsICdiJywgJ0RyYXlnb24nLCAgICAgICAgICAgICAgICAgICAgNSwgIDYsICAxNiwgIDQxLCAgLCAgICAxMTBdLFxuICBbMHg5ZSwgJ2InLCAnRHJheWdvbiAyJywgICAgICAgICAgICAgICAgICA3LCAgNiwgIDI4LCAgNDAsICAsICAgICxdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4YTAsICdtJywgJ0dyb3VuZCBTZW50cnkgKDEpJywgICAgICAgICAgNCwgICwgICA2LCAgIDI2LCAgLCAgICA3M10sXG4gIFsweGExLCAnbScsICdUb3dlciBEZWZlbnNlIE1lY2ggKDIpJywgICAgIDUsICAsICAgOCwgICAzNiwgICwgICAgODVdLFxuICBbMHhhMiwgJ20nLCAnVG93ZXIgU2VudGluZWwnLCAgICAgICAgICAgICAsICAgLCAgIDEsICAgLCAgICAsICAgIDMyXSxcbiAgWzB4YTMsICdtJywgJ0FpciBTZW50cnknLCAgICAgICAgICAgICAgICAgMywgICwgICAyLCAgIDI2LCAgLCAgICA2NV0sXG4gIC8vIFsweGE0LCAnYicsICdEeW5hJywgICAgICAgICAgICAgICAgICAgICAgIDYsICA1LCAgMTYsICAsICAgICwgICAgLF0sXG4gIFsweGE1LCAnYicsICdWYW1waXJlIDInLCAgICAgICAgICAgICAgICAgIDMsICAsICAgMTIsICAyNywgICwgICAgMTAwXSxcbiAgLy8gWzB4YjQsICdiJywgJ2R5bmEgcG9kJywgICAgICAgICAgICAgICAgICAgMTUsICwgICAyNTUsIDI2LCAgLCAgICAsXSxcbiAgLy8gWzB4YjgsICdwJywgJ2R5bmEgY291bnRlcicsICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDI2LCAgLCAgICAsXSxcbiAgLy8gWzB4YjksICdwJywgJ2R5bmEgbGFzZXInLCAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDI2LCAgLCAgICAsXSxcbiAgLy8gWzB4YmEsICdwJywgJ2R5bmEgYnViYmxlJywgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDM2LCAgLCAgICAsXSxcbiAgWzB4YTQsICdiJywgJ0R5bmEnLCAgICAgICAgICAgICAgICAgICAgICAgNiwgIDUsICAzMiwgICwgICAgLCAgICAsXSxcbiAgWzB4YjQsICdiJywgJ2R5bmEgcG9kJywgICAgICAgICAgICAgICAgICAgNiwgIDUsICA0OCwgIDI2LCAgLCAgICAsXSxcbiAgWzB4YjgsICdwJywgJ2R5bmEgY291bnRlcicsICAgICAgICAgICAgICAxNSwgICwgICAsICAgIDQyLCAgLCAgICAsXSxcbiAgWzB4YjksICdwJywgJ2R5bmEgbGFzZXInLCAgICAgICAgICAgICAgICAxNSwgICwgICAsICAgIDQyLCAgLCAgICAsXSxcbiAgWzB4YmEsICdwJywgJ2R5bmEgYnViYmxlJywgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDM2LCAgLCAgICAsXSxcbiAgLy9cbiAgWzB4YmMsICdtJywgJ3ZhbXAyIGJhdCcsICAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE2LCAgLCAgICAxNV0sXG4gIFsweGJmLCAncCcsICdkcmF5Z29uMiBmaXJlYmFsbCcsICAgICAgICAgICwgICAsICAgLCAgICAyNiwgICwgICAgLF0sXG4gIFsweGMxLCAnbScsICd2YW1wMSBiYXQnLCAgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNiwgICwgICAgMTVdLFxuICBbMHhjMywgJ3AnLCAnZ2lhbnQgaW5zZWN0IHNwaXQnLCAgICAgICAgICAsICAgLCAgICwgICAgMzUsICAsICAgICxdLFxuICBbMHhjNCwgJ20nLCAnc3VtbW9uZWQgaW5zZWN0JywgICAgICAgICAgICA0LCAgLCAgIDIsICAgNDIsICAsICAgIDk4XSxcbiAgWzB4YzUsICdwJywgJ2tlbGJ5MSByb2NrJywgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDIyLCAgLCAgICAsXSxcbiAgWzB4YzYsICdwJywgJ3NhYmVyYTEgYmFsbHMnLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE5LCAgLCAgICAsXSxcbiAgWzB4YzcsICdwJywgJ2tlbGJ5MiBmaXJlYmFsbHMnLCAgICAgICAgICAgLCAgICwgICAsICAgIDExLCAgLCAgICAsXSxcbiAgWzB4YzgsICdwJywgJ3NhYmVyYTIgZmlyZScsICAgICAgICAgICAgICAgLCAgICwgICAxLCAgIDYsICAgLCAgICAsXSxcbiAgWzB4YzksICdwJywgJ3NhYmVyYTIgYmFsbHMnLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE3LCAgLCAgICAsXSxcbiAgWzB4Y2EsICdwJywgJ2thcm1pbmUgYmFsbHMnLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDI1LCAgLCAgICAsXSxcbiAgWzB4Y2IsICdwJywgJ3N1bi9tb29uIHN0YXR1ZSBmaXJlYmFsbHMnLCAgLCAgICwgICAsICAgIDM5LCAgLCAgICAsXSxcbiAgWzB4Y2MsICdwJywgJ2RyYXlnb24xIGxpZ2h0bmluZycsICAgICAgICAgLCAgICwgICAsICAgIDM3LCAgLCAgICAsXSxcbiAgWzB4Y2QsICdwJywgJ2RyYXlnb24yIGxhc2VyJywgICAgICAgICAgICAgLCAgICwgICAsICAgIDM2LCAgLCAgICAsXSxcbiAgLy8gSUQgIFRZUEUgIE5BTUUgICAgICAgICAgICAgICAgICAgICAgIFNERUYgU1dSRCBISVRTIFNBVEsgREdMRCBTRVhQXG4gIFsweGNlLCAncCcsICdkcmF5Z29uMiBicmVhdGgnLCAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIFsweGUwLCAncCcsICdldmlsIGJvbWJlciBiaXJkIGJvbWInLCAgICAgICwgICAsICAgLCAgICAyLCAgICwgICAgLF0sXG4gIFsweGUyLCAncCcsICdzdW1tb25lZCBpbnNlY3QgYm9tYicsICAgICAgICwgICAsICAgLCAgICA0NywgICwgICAgLF0sXG4gIFsweGUzLCAncCcsICdwYXJhbHlzaXMgYmVhbScsICAgICAgICAgICAgICwgICAsICAgLCAgICAyMywgICwgICAgLF0sXG4gIFsweGU0LCAncCcsICdzdG9uZSBnYXplJywgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAzMywgICwgICAgLF0sXG4gIFsweGU1LCAncCcsICdyb2NrIGdvbGVtIHJvY2snLCAgICAgICAgICAgICwgICAsICAgLCAgICAyNCwgICwgICAgLF0sXG4gIFsweGU2LCAncCcsICdjdXJzZSBiZWFtJywgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxMCwgICwgICAgLF0sXG4gIFsweGU3LCAncCcsICdtcCBkcmFpbiB3ZWInLCAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxMSwgICwgICAgLF0sXG4gIFsweGU4LCAncCcsICdmaXNobWFuIHRyaWRlbnQnLCAgICAgICAgICAgICwgICAsICAgLCAgICAxNSwgICwgICAgLF0sXG4gIFsweGU5LCAncCcsICdvcmMgYXhlJywgICAgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNCwgICwgICAgLF0sXG4gIFsweGVhLCAncCcsICdTd2FtcCBQb2xsZW4nLCAgICAgICAgICAgICAgICwgICAsICAgLCAgICAzNywgICwgICAgLF0sXG4gIFsweGViLCAncCcsICdwYXJhbHlzaXMgcG93ZGVyJywgICAgICAgICAgICwgICAsICAgLCAgICAxNywgICwgICAgLF0sXG4gIFsweGVjLCAncCcsICdkcmF5Z29uaWEgc29saWRlciBzd29yZCcsICAgICwgICAsICAgLCAgICAyOCwgICwgICAgLF0sXG4gIFsweGVkLCAncCcsICdpY2UgZ29sZW0gcm9jaycsICAgICAgICAgICAgICwgICAsICAgLCAgICAyMCwgICwgICAgLF0sXG4gIFsweGVlLCAncCcsICd0cm9sbCBheGUnLCAgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNywgICwgICAgLF0sXG4gIFsweGVmLCAncCcsICdrcmFrZW4gaW5rJywgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNCwgICwgICAgLF0sXG4gIFsweGYwLCAncCcsICdkcmF5Z29uaWEgYXJjaGVyIGFycm93JywgICAgICwgICAsICAgLCAgICAxMiwgICwgICAgLF0sXG4gIFsweGYxLCAncCcsICc/Pz8gdW51c2VkJywgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNiwgICwgICAgLF0sXG4gIFsweGYyLCAncCcsICdkcmF5Z29uaWEga25pZ2h0IHN3b3JkJywgICAgICwgICAsICAgLCAgICA5LCAgICwgICAgLF0sXG4gIFsweGYzLCAncCcsICdtb3RoIHJlc2lkdWUnLCAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxOSwgICwgICAgLF0sXG4gIFsweGY0LCAncCcsICdncm91bmQgc2VudHJ5IGxhc2VyJywgICAgICAgICwgICAsICAgLCAgICAxMywgICwgICAgLF0sXG4gIFsweGY1LCAncCcsICd0b3dlciBkZWZlbnNlIG1lY2ggbGFzZXInLCAgICwgICAsICAgLCAgICAyMywgICwgICAgLF0sXG4gIFsweGY2LCAncCcsICd0b3dlciBzZW50aW5lbCBsYXNlcicsICAgICAgICwgICAsICAgLCAgICA4LCAgICwgICAgLF0sXG4gIFsweGY3LCAncCcsICdza2VsZXRvbiBzaG90JywgICAgICAgICAgICAgICwgICAsICAgLCAgICAxMSwgICwgICAgLF0sXG4gIC8vIElEICBUWVBFICBOQU1FICAgICAgICAgICAgICAgICAgICAgICBTREVGIFNXUkQgSElUUyBTQVRLIERHTEQgU0VYUFxuICBbMHhmOCwgJ3AnLCAnbGF2YW1hbiBzaG90JywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTQsICAsICAgICxdLFxuICBbMHhmOSwgJ3AnLCAnYmxhY2sga25pZ2h0IGZsYWlsJywgICAgICAgICAsICAgLCAgICwgICAgMTgsICAsICAgICxdLFxuICBbMHhmYSwgJ3AnLCAnbGl6YXJkbWFuIGZsYWlsJywgICAgICAgICAgICAsICAgLCAgICwgICAgMjEsICAsICAgICxdLFxuICBbMHhmYywgJ3AnLCAnbWFkbyBzaHVyaWtlbicsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzYsICAsICAgICxdLFxuICBbMHhmZCwgJ3AnLCAnZ3VhcmRpYW4gc3RhdHVlIG1pc3NpbGUnLCAgICAsICAgLCAgICwgICAgMjMsICAsICAgICxdLFxuICBbMHhmZSwgJ3AnLCAnZGVtb24gd2FsbCBmaXJlJywgICAgICAgICAgICAsICAgLCAgICwgICAgMjMsICAsICAgICxdLFxuXS5tYXAoKFtpZCwgdHlwZSwgbmFtZSwgc2RlZj0wLCBzd3JkPTAsIGhpdHM9MCwgc2F0az0wLCBkZ2xkPTAsIHNleHA9MF0pID0+XG4gICAgICBbaWQsIHtpZCwgdHlwZSwgbmFtZSwgc2RlZiwgc3dyZCwgaGl0cywgc2F0aywgZGdsZCwgc2V4cH1dKSkgYXMgYW55O1xuXG4vKiB0c2xpbnQ6ZW5hYmxlOnRyYWlsaW5nLWNvbW1hIHdoaXRlc3BhY2UgKi9cblxuLy8gV2hlbiBkZWFsaW5nIHdpdGggY29uc3RyYWludHMsIGl0J3MgYmFzaWNhbGx5IGtzYXRcbi8vICAtIHdlIGhhdmUgYSBsaXN0IG9mIHJlcXVpcmVtZW50cyB0aGF0IGFyZSBBTkRlZCB0b2dldGhlclxuLy8gIC0gZWFjaCBpcyBhIGxpc3Qgb2YgcHJlZGljYXRlcyB0aGF0IGFyZSBPUmVkIHRvZ2V0aGVyXG4vLyAgLSBlYWNoIHByZWRpY2F0ZSBoYXMgYSBjb250aW51YXRpb24gZm9yIHdoZW4gaXQncyBwaWNrZWRcbi8vICAtIG5lZWQgYSB3YXkgdG8gdGhpbiB0aGUgY3Jvd2QsIGVmZmljaWVudGx5IGNoZWNrIGNvbXBhdCwgZXRjXG4vLyBQcmVkaWNhdGUgaXMgYSBmb3VyLWVsZW1lbnQgYXJyYXkgW3BhdDAscGF0MSxwYWwyLHBhbDNdXG4vLyBSYXRoZXIgdGhhbiBhIGNvbnRpbnVhdGlvbiB3ZSBjb3VsZCBnbyB0aHJvdWdoIGFsbCB0aGUgc2xvdHMgYWdhaW5cblxuLy8gY2xhc3MgQ29uc3RyYWludHMge1xuLy8gICBjb25zdHJ1Y3RvcigpIHtcbi8vICAgICAvLyBBcnJheSBvZiBwYXR0ZXJuIHRhYmxlIG9wdGlvbnMuICBOdWxsIGluZGljYXRlcyB0aGF0IGl0IGNhbiBiZSBhbnl0aGluZy5cbi8vICAgICAvL1xuLy8gICAgIHRoaXMucGF0dGVybnMgPSBbW251bGwsIG51bGxdXTtcbi8vICAgICB0aGlzLnBhbGV0dGVzID0gW1tudWxsLCBudWxsXV07XG4vLyAgICAgdGhpcy5mbHllcnMgPSAwO1xuLy8gICB9XG5cbi8vICAgcmVxdWlyZVRyZWFzdXJlQ2hlc3QoKSB7XG4vLyAgICAgdGhpcy5yZXF1aXJlT3JkZXJlZFNsb3QoMCwgVFJFQVNVUkVfQ0hFU1RfQkFOS1MpO1xuLy8gICB9XG5cbi8vICAgcmVxdWlyZU9yZGVyZWRTbG90KHNsb3QsIHNldCkge1xuXG4vLyAgICAgaWYgKCF0aGlzLm9yZGVyZWQpIHtcblxuLy8gICAgIH1cbi8vIC8vIFRPRE9cbi8vICAgICB0aGlzLnBhdDAgPSBpbnRlcnNlY3QodGhpcy5wYXQwLCBzZXQpO1xuXG4vLyAgIH1cblxuLy8gfVxuXG4vLyBjb25zdCBpbnRlcnNlY3QgPSAobGVmdCwgcmlnaHQpID0+IHtcbi8vICAgaWYgKCFyaWdodCkgdGhyb3cgbmV3IEVycm9yKCdyaWdodCBtdXN0IGJlIG5vbnRyaXZpYWwnKTtcbi8vICAgaWYgKCFsZWZ0KSByZXR1cm4gcmlnaHQ7XG4vLyAgIGNvbnN0IG91dCA9IG5ldyBTZXQoKTtcbi8vICAgZm9yIChjb25zdCB4IG9mIGxlZnQpIHtcbi8vICAgICBpZiAocmlnaHQuaGFzKHgpKSBvdXQuYWRkKHgpO1xuLy8gICB9XG4vLyAgIHJldHVybiBvdXQ7XG4vLyB9XG5cbmludGVyZmFjZSBNb25zdGVyQ29uc3RyYWludCB7XG4gIGlkOiBudW1iZXI7XG4gIHBhdDogbnVtYmVyO1xuICBwYWwyOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHBhbDM6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgcGF0QmFuazogbnVtYmVyIHwgdW5kZWZpbmVkO1xufVxuXG4vLyBBIHBvb2wgb2YgbW9uc3RlciBzcGF3bnMsIGJ1aWx0IHVwIGZyb20gdGhlIGxvY2F0aW9ucyBpbiB0aGUgcm9tLlxuLy8gUGFzc2VzIHRocm91Z2ggdGhlIGxvY2F0aW9ucyB0d2ljZSwgZmlyc3QgdG8gYnVpbGQgYW5kIHRoZW4gdG9cbi8vIHJlYXNzaWduIG1vbnN0ZXJzLlxuY2xhc3MgTW9uc3RlclBvb2wge1xuXG4gIC8vIGF2YWlsYWJsZSBtb25zdGVyc1xuICByZWFkb25seSBtb25zdGVyczogTW9uc3RlckNvbnN0cmFpbnRbXSA9IFtdO1xuICAvLyB1c2VkIG1vbnN0ZXJzIC0gYXMgYSBiYWNrdXAgaWYgbm8gYXZhaWxhYmxlIG1vbnN0ZXJzIGZpdFxuICByZWFkb25seSB1c2VkOiBNb25zdGVyQ29uc3RyYWludFtdID0gW107XG4gIC8vIGFsbCBsb2NhdGlvbnNcbiAgcmVhZG9ubHkgbG9jYXRpb25zOiB7bG9jYXRpb246IExvY2F0aW9uLCBzbG90czogbnVtYmVyW119W10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGZsYWdzOiBGbGFnU2V0LFxuICAgICAgcmVhZG9ubHkgcmVwb3J0OiB7W2xvYzogbnVtYmVyXTogc3RyaW5nW10sIFtrZXk6IHN0cmluZ106IChzdHJpbmd8bnVtYmVyKVtdfSkge31cblxuICAvLyBUT0RPIC0gbW9uc3RlcnMgdy8gcHJvamVjdGlsZXMgbWF5IGhhdmUgYSBzcGVjaWZpYyBiYW5rIHRoZXkgbmVlZCB0byBhcHBlYXIgaW4sXG4gIC8vIHNpbmNlIHRoZSBwcm9qZWN0aWxlIGRvZXNuJ3Qga25vdyB3aGVyZSBpdCBjYW1lIGZyb20uLi4/XG4gIC8vICAgLSBmb3Igbm93LCBqdXN0IGFzc3VtZSBpZiBpdCBoYXMgYSBjaGlsZCB0aGVuIGl0IG11c3Qga2VlcCBzYW1lIHBhdHRlcm4gYmFuayFcblxuICBwb3B1bGF0ZShsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBjb25zdCB7bWF4Rmx5ZXJzID0gMCxcbiAgICAgICAgICAgbm9uRmx5ZXJzID0ge30sXG4gICAgICAgICAgIHNraXAgPSBmYWxzZSxcbiAgICAgICAgICAgdG93ZXIgPSBmYWxzZSxcbiAgICAgICAgICAgZml4ZWRTbG90cyA9IHt9LFxuICAgICAgICAgICAuLi51bmV4cGVjdGVkfSA9IE1PTlNURVJfQURKVVNUTUVOVFNbbG9jYXRpb24uaWRdIHx8IHt9O1xuICAgIGZvciAoY29uc3QgdSBvZiBPYmplY3Qua2V5cyh1bmV4cGVjdGVkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbmV4cGVjdGVkIHByb3BlcnR5ICcke3V9JyBpbiBNT05TVEVSX0FESlVTVE1FTlRTWyR7bG9jYXRpb24uaWR9XWApO1xuICAgIH1cbiAgICBjb25zdCBza2lwTW9uc3RlcnMgPVxuICAgICAgICAoc2tpcCA9PT0gdHJ1ZSB8fFxuICAgICAgICAgICAgKCF0aGlzLmZsYWdzLnNodWZmbGVUb3dlck1vbnN0ZXJzKCkgJiYgdG93ZXIpIHx8XG4gICAgICAgICAgICAhbG9jYXRpb24uc3ByaXRlUGF0dGVybnMgfHxcbiAgICAgICAgICAgICFsb2NhdGlvbi5zcHJpdGVQYWxldHRlcyk7XG4gICAgY29uc3QgbW9uc3RlcnMgPSBbXTtcbiAgICBsZXQgc2xvdHMgPSBbXTtcbiAgICAvLyBjb25zdCBjb25zdHJhaW50cyA9IHt9O1xuICAgIC8vIGxldCB0cmVhc3VyZUNoZXN0ID0gZmFsc2U7XG4gICAgbGV0IHNsb3QgPSAweDBjO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2Ygc2tpcE1vbnN0ZXJzID8gW10gOiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgICsrc2xvdDtcbiAgICAgIGlmICghc3Bhd24udXNlZCB8fCAhc3Bhd24uaXNNb25zdGVyKCkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWQgPSBzcGF3bi5tb25zdGVySWQ7XG4gICAgICBpZiAoaWQgaW4gVU5UT1VDSEVEX01PTlNURVJTIHx8ICFTQ0FMRURfTU9OU1RFUlMuaGFzKGlkKSB8fFxuICAgICAgICAgIFNDQUxFRF9NT05TVEVSUy5nZXQoaWQpIS50eXBlICE9PSAnbScpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgb2JqZWN0ID0gbG9jYXRpb24ucm9tLm9iamVjdHNbaWRdO1xuICAgICAgaWYgKCFvYmplY3QpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcGF0QmFuayA9IHNwYXduLnBhdHRlcm5CYW5rO1xuICAgICAgY29uc3QgcGF0ID0gbG9jYXRpb24uc3ByaXRlUGF0dGVybnNbcGF0QmFua107XG4gICAgICBjb25zdCBwYWwgPSBvYmplY3QucGFsZXR0ZXModHJ1ZSk7XG4gICAgICBjb25zdCBwYWwyID0gcGFsLmluY2x1ZGVzKDIpID8gbG9jYXRpb24uc3ByaXRlUGFsZXR0ZXNbMF0gOiB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBwYWwzID0gcGFsLmluY2x1ZGVzKDMpID8gbG9jYXRpb24uc3ByaXRlUGFsZXR0ZXNbMV0gOiB1bmRlZmluZWQ7XG4gICAgICBtb25zdGVycy5wdXNoKHtpZCwgcGF0LCBwYWwyLCBwYWwzLCBwYXRCYW5rfSk7XG4gICAgICAodGhpcy5yZXBvcnRbYHN0YXJ0LSR7aWQudG9TdHJpbmcoMTYpfWBdID0gdGhpcy5yZXBvcnRbYHN0YXJ0LSR7aWQudG9TdHJpbmcoMTYpfWBdIHx8IFtdKVxuICAgICAgICAgIC5wdXNoKCckJyArIGxvY2F0aW9uLmlkLnRvU3RyaW5nKDE2KSk7XG4gICAgICBzbG90cy5wdXNoKHNsb3QpO1xuICAgIH1cbiAgICBpZiAoIW1vbnN0ZXJzLmxlbmd0aCB8fCBza2lwKSBzbG90cyA9IFtdO1xuICAgIHRoaXMubG9jYXRpb25zLnB1c2goe2xvY2F0aW9uLCBzbG90c30pO1xuICAgIHRoaXMubW9uc3RlcnMucHVzaCguLi5tb25zdGVycyk7XG4gIH1cblxuICBzaHVmZmxlKHJhbmRvbTogUmFuZG9tLCBncmFwaGljczogR3JhcGhpY3MpIHtcbiAgICB0aGlzLnJlcG9ydFsncHJlLXNodWZmbGUgbG9jYXRpb25zJ10gPSB0aGlzLmxvY2F0aW9ucy5tYXAobCA9PiBsLmxvY2F0aW9uLmlkKTtcbiAgICB0aGlzLnJlcG9ydFsncHJlLXNodWZmbGUgbW9uc3RlcnMnXSA9IHRoaXMubW9uc3RlcnMubWFwKG0gPT4gbS5pZCk7XG4gICAgcmFuZG9tLnNodWZmbGUodGhpcy5sb2NhdGlvbnMpO1xuICAgIHJhbmRvbS5zaHVmZmxlKHRoaXMubW9uc3RlcnMpO1xuICAgIHRoaXMucmVwb3J0Wydwb3N0LXNodWZmbGUgbG9jYXRpb25zJ10gPSB0aGlzLmxvY2F0aW9ucy5tYXAobCA9PiBsLmxvY2F0aW9uLmlkKTtcbiAgICB0aGlzLnJlcG9ydFsncG9zdC1zaHVmZmxlIG1vbnN0ZXJzJ10gPSB0aGlzLm1vbnN0ZXJzLm1hcChtID0+IG0uaWQpO1xuICAgIHdoaWxlICh0aGlzLmxvY2F0aW9ucy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHtsb2NhdGlvbiwgc2xvdHN9ID0gdGhpcy5sb2NhdGlvbnMucG9wKCkhO1xuICAgICAgY29uc3QgcmVwb3J0OiBzdHJpbmdbXSA9IHRoaXMucmVwb3J0WyckJyArIGxvY2F0aW9uLmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpXSA9IFtdO1xuICAgICAgY29uc3Qge21heEZseWVycyA9IDAsIG5vbkZseWVycyA9IHt9LCB0b3dlciA9IGZhbHNlfSA9XG4gICAgICAgICAgICBNT05TVEVSX0FESlVTVE1FTlRTW2xvY2F0aW9uLmlkXSB8fCB7fTtcbiAgICAgIGlmICh0b3dlcikgY29udGludWU7XG4gICAgICBsZXQgZmx5ZXJzID0gbWF4Rmx5ZXJzOyAvLyBjb3VudCBkb3duLi4uXG5cbiAgICAgIC8vIERldGVybWluZSBsb2NhdGlvbiBjb25zdHJhaW50c1xuICAgICAgbGV0IGNvbnN0cmFpbnQgPSBDb25zdHJhaW50LmZvckxvY2F0aW9uKGxvY2F0aW9uLmlkKTtcbiAgICAgIGlmIChsb2NhdGlvbi5ib3NzSWQoKSAhPSBudWxsKSB7XG4gICAgICAgIC8vIE5vdGUgdGhhdCBib3NzZXMgYWx3YXlzIGxlYXZlIGNoZXN0cy5cbiAgICAgICAgLy8gVE9ETyAtIGl0J3MgcG9zc2libGUgdGhpcyBpcyBvdXQgb2Ygb3JkZXIgdy5yLnQuIHdyaXRpbmcgdGhlIGJvc3M/XG4gICAgICAgIC8vICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5CT1NTLCB0cnVlKTtcbiAgICAgICAgLy8gTk9URTogdGhpcyBkb2VzIG5vdCB3b3JrIGZvciAoZS5nLikgbWFkbyAxLCB3aGVyZSBhenRlY2EgcmVxdWlyZXNcbiAgICAgICAgLy8gNTMgd2hpY2ggaXMgbm90IGEgY29tcGF0aWJsZSBjaGVzdCBwYWdlLlxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzQ2hlc3QoKSAmJiAhc3Bhd24uaXNJbnZpc2libGUoKSkge1xuICAgICAgICAgIGlmIChzcGF3bi5pZCA8IDB4NzApIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5UUkVBU1VSRV9DSEVTVCwgdHJ1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5NSU1JQywgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkgfHwgc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgICBjb25zdCBjID0gZ3JhcGhpY3MuZ2V0TnBjQ29uc3RyYWludChsb2NhdGlvbi5pZCwgc3Bhd24uaWQpO1xuICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoYywgdHJ1ZSk7XG4gICAgICAgICAgaWYgKHNwYXduLmlzTnBjKCkgJiYgc3Bhd24uaWQgPT09IDB4NmIpIHtcbiAgICAgICAgICAgIC8vIHNsZWVwaW5nIGtlbnN1ICg2YikgbGVhdmVzIGJlaGluZCBhIHRyZWFzdXJlIGNoZXN0XG4gICAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuS0VOU1VfQ0hFU1QsIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBVTlRPVUNIRURfTU9OU1RFUlNbc3Bhd24ubW9uc3RlcklkXSkge1xuICAgICAgICAgIGNvbnN0IGMgPSBncmFwaGljcy5nZXRNb25zdGVyQ29uc3RyYWludChsb2NhdGlvbi5pZCwgc3Bhd24ubW9uc3RlcklkKTtcbiAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KGMsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHNwYXduLmlzU2hvb3RpbmdXYWxsKGxvY2F0aW9uKSkge1xuICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5TSE9PVElOR19XQUxMLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXBvcnQucHVzaChgSW5pdGlhbCBwYXNzOiAke2NvbnN0cmFpbnQuZml4ZWQubWFwKHM9PnMuc2l6ZTxJbmZpbml0eT8nWycrWy4uLnNdLmpvaW4oJywgJykrJ10nOidhbGwnKX1gKTtcblxuICAgICAgY29uc3QgY2xhc3NlcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgICBjb25zdCB0cnlBZGRNb25zdGVyID0gKG06IE1vbnN0ZXJDb25zdHJhaW50KSA9PiB7XG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSBsb2NhdGlvbi5yb20ub2JqZWN0c1ttLmlkXSBhcyBNb25zdGVyO1xuICAgICAgICBpZiAobW9uc3Rlci5tb25zdGVyQ2xhc3MpIHtcbiAgICAgICAgICBjb25zdCByZXByZXNlbnRhdGl2ZSA9IGNsYXNzZXMuZ2V0KG1vbnN0ZXIubW9uc3RlckNsYXNzKTtcbiAgICAgICAgICBpZiAocmVwcmVzZW50YXRpdmUgIT0gbnVsbCAmJiByZXByZXNlbnRhdGl2ZSAhPT0gbS5pZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZseWVyID0gRkxZRVJTLmhhcyhtLmlkKTtcbiAgICAgICAgY29uc3QgbW90aCA9IE1PVEhTX0FORF9CQVRTLmhhcyhtLmlkKTtcbiAgICAgICAgaWYgKGZseWVyKSB7XG4gICAgICAgICAgLy8gVE9ETyAtIGFkZCBhIHNtYWxsIHByb2JhYmlsaXR5IG9mIGFkZGluZyBpdCBhbnl3YXksIG1heWJlXG4gICAgICAgICAgLy8gYmFzZWQgb24gdGhlIG1hcCBhcmVhPyAgMjUgc2VlbXMgYSBnb29kIHRocmVzaG9sZC5cbiAgICAgICAgICBpZiAoIWZseWVycykgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIC0tZmx5ZXJzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGMgPSBncmFwaGljcy5nZXRNb25zdGVyQ29uc3RyYWludChsb2NhdGlvbi5pZCwgbS5pZCk7XG4gICAgICAgIGxldCBtZWV0ID0gY29uc3RyYWludC50cnlNZWV0KGMpO1xuICAgICAgICBpZiAoIW1lZXQgJiYgY29uc3RyYWludC5wYWwyLnNpemUgPCBJbmZpbml0eSAmJiBjb25zdHJhaW50LnBhbDMuc2l6ZSA8IEluZmluaXR5KSB7XG4gICAgICAgICAgaWYgKHRoaXMuZmxhZ3Muc2h1ZmZsZVNwcml0ZVBhbGV0dGVzKCkpIHtcbiAgICAgICAgICAgIG1lZXQgPSBjb25zdHJhaW50LnRyeU1lZXQoYywgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghbWVldCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIC8vIEZpZ3VyZSBvdXQgZWFybHkgaWYgdGhlIG1vbnN0ZXIgaXMgcGxhY2VhYmxlLlxuICAgICAgICBsZXQgcG9zOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChtb25zdGVyUGxhY2VyKSB7XG4gICAgICAgICAgY29uc3QgbW9uc3RlciA9IGxvY2F0aW9uLnJvbS5vYmplY3RzW20uaWRdO1xuICAgICAgICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBub24tbW9uc3RlcjogJHttb25zdGVyfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwb3MgPSBtb25zdGVyUGxhY2VyKG1vbnN0ZXIpO1xuICAgICAgICAgIGlmIChwb3MgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVwb3J0LnB1c2goYCAgQWRkaW5nICR7bS5pZC50b1N0cmluZygxNil9OiAke21lZXR9YCk7XG4gICAgICAgIGNvbnN0cmFpbnQgPSBtZWV0O1xuXG4gICAgICAgIC8vIFBpY2sgdGhlIHNsb3Qgb25seSBhZnRlciB3ZSBrbm93IGZvciBzdXJlIHRoYXQgaXQgd2lsbCBmaXQuXG4gICAgICAgIGlmIChtb25zdGVyLm1vbnN0ZXJDbGFzcykgY2xhc3Nlcy5zZXQobW9uc3Rlci5tb25zdGVyQ2xhc3MsIG0uaWQpXG4gICAgICAgIGxldCBlbGlnaWJsZSA9IDA7XG4gICAgICAgIGlmIChmbHllciB8fCBtb3RoKSB7XG4gICAgICAgICAgLy8gbG9vayBmb3IgYSBmbHllciBzbG90IGlmIHBvc3NpYmxlLlxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2xvdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzbG90c1tpXSBpbiBub25GbHllcnMpIHtcbiAgICAgICAgICAgICAgZWxpZ2libGUgPSBpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gUHJlZmVyIG5vbi1mbHllciBzbG90cywgYnV0IGFkanVzdCBpZiB3ZSBnZXQgYSBmbHllci5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNsb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoc2xvdHNbaV0gaW4gbm9uRmx5ZXJzKSBjb250aW51ZTtcbiAgICAgICAgICAgIGVsaWdpYmxlID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAodGhpcy5yZXBvcnRbYG1vbi0ke20uaWQudG9TdHJpbmcoMTYpfWBdID0gdGhpcy5yZXBvcnRbYG1vbi0ke20uaWQudG9TdHJpbmcoMTYpfWBdIHx8IFtdKVxuICAgICAgICAgICAgLnB1c2goJyQnICsgbG9jYXRpb24uaWQudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgY29uc3Qgc2xvdCA9IHNsb3RzW2VsaWdpYmxlXTtcbiAgICAgICAgY29uc3Qgc3Bhd24gPSBsb2NhdGlvbi5zcGF3bnNbc2xvdCAtIDB4MGRdO1xuICAgICAgICBpZiAobW9uc3RlclBsYWNlcikgeyAvLyBwb3MgPT0gbnVsbCByZXR1cm5lZCBmYWxzZSBlYXJsaWVyXG4gICAgICAgICAgc3Bhd24uc2NyZWVuID0gcG9zISA+Pj4gODtcbiAgICAgICAgICBzcGF3bi50aWxlID0gcG9zISAmIDB4ZmY7XG4gICAgICAgIH0gZWxzZSBpZiAoc2xvdCBpbiBub25GbHllcnMpIHtcbiAgICAgICAgICBzcGF3bi55ICs9IG5vbkZseWVyc1tzbG90XVswXSAqIDE2O1xuICAgICAgICAgIHNwYXduLnggKz0gbm9uRmx5ZXJzW3Nsb3RdWzFdICogMTY7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhd24ubW9uc3RlcklkID0gbS5pZDtcbiAgICAgICAgcmVwb3J0LnB1c2goYCAgICBzbG90ICR7c2xvdC50b1N0cmluZygxNil9OiAke3NwYXdufWApO1xuXG4gICAgICAgIC8vIFRPRE8gLSBhbnl0aGluZyBlbHNlIG5lZWQgc3BsaWNpbmc/XG5cbiAgICAgICAgc2xvdHMuc3BsaWNlKGVsaWdpYmxlLCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9O1xuXG4gICAgICAvLyBGb3IgZWFjaCBsb2NhdGlvbi4uLi4gdHJ5IHRvIGZpbGwgdXAgdGhlIHNsb3RzXG4gICAgICBjb25zdCBtb25zdGVyUGxhY2VyID1cbiAgICAgICAgICBzbG90cy5sZW5ndGggJiYgdGhpcy5mbGFncy5yYW5kb21pemVNYXBzKCkgP1xuICAgICAgICAgICAgICBsb2NhdGlvbi5tb25zdGVyUGxhY2VyKHJhbmRvbSkgOiBudWxsO1xuXG4gICAgICBpZiAoZmx5ZXJzICYmIHNsb3RzLmxlbmd0aCkge1xuICAgICAgICAvLyBsb29rIGZvciBhbiBlbGlnaWJsZSBmbHllciBpbiB0aGUgZmlyc3QgNDAuICBJZiBpdCdzIHRoZXJlLCBhZGQgaXQgZmlyc3QuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oNDAsIHRoaXMubW9uc3RlcnMubGVuZ3RoKTsgaSsrKSB7XG4gICAgICAgICAgaWYgKEZMWUVSUy5oYXModGhpcy5tb25zdGVyc1tpXS5pZCkpIHtcbiAgICAgICAgICAgIGlmICh0cnlBZGRNb25zdGVyKHRoaXMubW9uc3RlcnNbaV0pKSB7XG4gICAgICAgICAgICAgIHRoaXMubW9uc3RlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyByYW5kb20uc2h1ZmZsZSh0aGlzLm1vbnN0ZXJzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG1heWJlIGFkZGVkIGEgc2luZ2xlIGZseWVyLCB0byBtYWtlIHN1cmUgd2UgZG9uJ3QgcnVuIG91dC4gIE5vdyBqdXN0IHdvcmsgbm9ybWFsbHlcblxuICAgICAgICAvLyBkZWNpZGUgaWYgd2UncmUgZ29pbmcgdG8gYWRkIGFueSBmbHllcnMuXG5cbiAgICAgICAgLy8gYWxzbyBjb25zaWRlciBhbGxvd2luZyBhIHNpbmdsZSByYW5kb20gZmx5ZXIgdG8gYmUgYWRkZWQgb3V0IG9mIGJhbmQgaWZcbiAgICAgICAgLy8gdGhlIHNpemUgb2YgdGhlIG1hcCBleGNlZWRzIDI1P1xuXG4gICAgICAgIC8vIHByb2JhYmx5IGRvbid0IGFkZCBmbHllcnMgdG8gdXNlZD9cblxuICAgICAgfVxuXG4gICAgICAvLyBpdGVyYXRlIG92ZXIgbW9uc3RlcnMgdW50aWwgd2UgZmluZCBvbmUgdGhhdCdzIGFsbG93ZWQuLi5cbiAgICAgIC8vIE5PVEU6IGZpbGwgdGhlIG5vbi1mbHllciBzbG90cyBmaXJzdCAoZXhjZXB0IGlmIHdlIHBpY2sgYSBmbHllcj8/KVxuICAgICAgLy8gICAtIG1heSBuZWVkIHRvIHdlaWdodCBmbHllcnMgc2xpZ2h0bHkgaGlnaGVyIG9yIGZpbGwgdGhlbSBkaWZmZXJlbnRseT9cbiAgICAgIC8vICAgICBvdGhlcndpc2Ugd2UnbGwgbGlrZWx5IG5vdCBnZXQgdGhlbSB3aGVuIHdlJ3JlIGFsbG93ZWQuLi4/XG4gICAgICAvLyAgIC0gb3IganVzdCBkbyB0aGUgbm9uLWZseWVyICpsb2NhdGlvbnMqIGZpcnN0P1xuICAgICAgLy8gLSBvciBqdXN0IGZpbGwgdXAgZmx5ZXJzIHVudGlsIHdlIHJ1biBvdXQuLi4gMTAwJSBjaGFuY2Ugb2YgZmlyc3QgZmx5ZXIsXG4gICAgICAvLyAgIDUwJSBjaGFuY2Ugb2YgZ2V0dGluZyBhIHNlY29uZCBmbHllciBpZiBhbGxvd2VkLi4uXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubW9uc3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCFzbG90cy5sZW5ndGgpIGJyZWFrO1xuICAgICAgICBpZiAodHJ5QWRkTW9uc3Rlcih0aGlzLm1vbnN0ZXJzW2ldKSkge1xuICAgICAgICAgIGNvbnN0IFt1c2VkXSA9IHRoaXMubW9uc3RlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIGlmICghRkxZRVJTLmhhcyh1c2VkLmlkKSkgdGhpcy51c2VkLnB1c2godXNlZCk7XG4gICAgICAgICAgaS0tO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGJhY2t1cCBsaXN0XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudXNlZC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIXNsb3RzLmxlbmd0aCkgYnJlYWs7XG4gICAgICAgIGlmICh0cnlBZGRNb25zdGVyKHRoaXMudXNlZFtpXSkpIHtcbiAgICAgICAgICB0aGlzLnVzZWQucHVzaCguLi50aGlzLnVzZWQuc3BsaWNlKGksIDEpKTtcbiAgICAgICAgICBpLS07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0cmFpbnQuZml4KGxvY2F0aW9uLCByYW5kb20pO1xuXG4gICAgICBpZiAoc2xvdHMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IvKnJlcG9ydC5wdXNoKi8oYEZhaWxlZCB0byBmaWxsIGxvY2F0aW9uICR7bG9jYXRpb24uaWQudG9TdHJpbmcoMTYpfTogJHtzbG90cy5sZW5ndGh9IHJlbWFpbmluZ2ApO1xuICAgICAgICBmb3IgKGNvbnN0IHNsb3Qgb2Ygc2xvdHMpIHtcbiAgICAgICAgICBjb25zdCBzcGF3biA9IGxvY2F0aW9uLnNwYXduc1tzbG90IC0gMHgwZF07XG4gICAgICAgICAgc3Bhd24ueCA9IHNwYXduLnkgPSAwO1xuICAgICAgICAgIHNwYXduLmlkID0gMHhiMDtcbiAgICAgICAgICBzcGF3bi5kYXRhWzBdID0gMHhmZTsgLy8gaW5kaWNhdGUgdW51c2VkXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAgIGdyYXBoaWNzLmNvbmZpZ3VyZShsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jb25zdCBGTFlFUlM6IFNldDxudW1iZXI+ID0gbmV3IFNldChbMHg1OSwgMHg1YywgMHg2ZSwgMHg2ZiwgMHg4MSwgMHg4YSwgMHhhMywgMHhjNF0pO1xuY29uc3QgTU9USFNfQU5EX0JBVFM6IFNldDxudW1iZXI+ID0gbmV3IFNldChbMHg1NSwgLyogc3dhbXAgcGxhbnQgKi8gMHg1ZCwgMHg3YywgMHhiYywgMHhjMV0pO1xuLy8gY29uc3QgU1dJTU1FUlM6IFNldDxudW1iZXI+ID0gbmV3IFNldChbMHg3NSwgMHg3Nl0pO1xuLy8gY29uc3QgU1RBVElPTkFSWTogU2V0PG51bWJlcj4gPSBuZXcgU2V0KFsweDc3LCAweDg3XSk7ICAvLyBrcmFrZW4sIHNvcmNlcm9yXG5cbmludGVyZmFjZSBNb25zdGVyQWRqdXN0bWVudCB7XG4gIG1heEZseWVycz86IG51bWJlcjtcbiAgc2tpcD86IGJvb2xlYW47XG4gIHRvd2VyPzogYm9vbGVhbjtcbiAgZml4ZWRTbG90cz86IHtwYXQwPzogbnVtYmVyLCBwYXQxPzogbnVtYmVyLCBwYWwyPzogbnVtYmVyLCBwYWwzPzogbnVtYmVyfTtcbiAgbm9uRmx5ZXJzPzoge1tpZDogbnVtYmVyXTogW251bWJlciwgbnVtYmVyXX07XG59XG5jb25zdCBNT05TVEVSX0FESlVTVE1FTlRTOiB7W2xvYzogbnVtYmVyXTogTW9uc3RlckFkanVzdG1lbnR9ID0ge1xuICBbMHgwM106IHsgLy8gVmFsbGV5IG9mIFdpbmRcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYXQxOiAweDYwLCAvLyByZXF1aXJlZCBieSB3aW5kbWlsbFxuICAgIH0sXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICB9LFxuICBbMHgwN106IHsgLy8gU2VhbGVkIENhdmUgNFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGZdOiBbMCwgLTNdLCAgLy8gYmF0XG4gICAgICBbMHgxMF06IFstMTAsIDBdLCAvLyBiYXRcbiAgICAgIFsweDExXTogWzAsIDRdLCAgIC8vIGJhdFxuICAgIH0sXG4gIH0sXG4gIFsweDE0XTogeyAvLyBDb3JkZWwgV2VzdFxuICAgIG1heEZseWVyczogMixcbiAgfSxcbiAgWzB4MTVdOiB7IC8vIENvcmRlbCBFYXN0XG4gICAgbWF4Rmx5ZXJzOiAyLFxuICB9LFxuICBbMHgxYV06IHsgLy8gU3dhbXBcbiAgICAvLyBza2lwOiAnYWRkJyxcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYWwzOiAweDIzLFxuICAgICAgcGF0MTogMHg0ZixcbiAgICB9LFxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHsgLy8gVE9ETyAtIG1pZ2h0IGJlIG5pY2UgdG8ga2VlcCBwdWZmcyB3b3JraW5nP1xuICAgICAgWzB4MTBdOiBbNCwgMF0sXG4gICAgICBbMHgxMV06IFs1LCAwXSxcbiAgICAgIFsweDEyXTogWzQsIDBdLFxuICAgICAgWzB4MTNdOiBbNSwgMF0sXG4gICAgICBbMHgxNF06IFs0LCAwXSxcbiAgICAgIFsweDE1XTogWzQsIDBdLFxuICAgIH0sXG4gIH0sXG4gIFsweDFiXTogeyAvLyBBbWF6b25lc1xuICAgIC8vIFJhbmRvbSBibHVlIHNsaW1lIHNob3VsZCBiZSBpZ25vcmVkXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbiAgWzB4MjBdOiB7IC8vIE10IFNhYnJlIFdlc3QgTG93ZXJcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDIxXTogeyAvLyBNdCBTYWJyZSBXZXN0IFVwcGVyXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGF0MTogMHg1MCxcbiAgICAgIC8vIHBhbDI6IDB4MDYsIC8vIG1pZ2h0IGJlIGZpbmUgdG8gY2hhbmdlIHRvcm5lbCdzIGNvbG9yLi4uXG4gICAgfSxcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDI3XTogeyAvLyBNdCBTYWJyZSBXZXN0IENhdmUgN1xuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGRdOiBbMCwgMHgxMF0sIC8vIHJhbmRvbSBlbmVteSBzdHVjayBpbiB3YWxsXG4gICAgfSxcbiAgfSxcbiAgWzB4MjhdOiB7IC8vIE10IFNhYnJlIE5vcnRoIE1haW5cbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDI5XTogeyAvLyBNdCBTYWJyZSBOb3J0aCBNaWRkbGVcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDJiXTogeyAvLyBNdCBTYWJyZSBOb3J0aCBDYXZlIDJcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE0XTogWzB4MjAsIC04XSwgLy8gYmF0XG4gICAgfSxcbiAgfSxcbiAgWzB4NDBdOiB7IC8vIFdhdGVyZmFsbCBWYWxsZXkgTm9ydGhcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxM106IFsxMiwgLTB4MTBdLCAvLyBtZWR1c2EgaGVhZFxuICAgIH0sXG4gIH0sXG4gIFsweDQxXTogeyAvLyBXYXRlcmZhbGwgVmFsbGV5IFNvdXRoXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTVdOiBbMCwgLTZdLCAvLyBtZWR1c2EgaGVhZFxuICAgIH0sXG4gIH0sXG4gIFsweDQyXTogeyAvLyBMaW1lIFRyZWUgVmFsbGV5XG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGRdOiBbMCwgOF0sIC8vIGV2aWwgYmlyZFxuICAgICAgWzB4MGVdOiBbLTgsIDhdLCAvLyBldmlsIGJpcmRcbiAgICB9LFxuICB9LFxuICBbMHg0N106IHsgLy8gS2lyaXNhIE1lYWRvd1xuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWy04LCAtOF0sXG4gICAgfSxcbiAgfSxcbiAgWzB4NGFdOiB7IC8vIEZvZyBMYW1wIENhdmUgM1xuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBlXTogWzQsIDBdLCAgLy8gYmF0XG4gICAgICBbMHgwZl06IFswLCAtM10sIC8vIGJhdFxuICAgICAgWzB4MTBdOiBbMCwgNF0sICAvLyBiYXRcbiAgICB9LFxuICB9LFxuICBbMHg0Y106IHsgLy8gRm9nIExhbXAgQ2F2ZSA0XG4gICAgLy8gbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHg0ZF06IHsgLy8gRm9nIExhbXAgQ2F2ZSA1XG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHg0ZV06IHsgLy8gRm9nIExhbXAgQ2F2ZSA2XG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHg0Zl06IHsgLy8gRm9nIExhbXAgQ2F2ZSA3XG4gICAgLy8gbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHg1N106IHsgLy8gV2F0ZXJmYWxsIENhdmUgNFxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhdDE6IDB4NGQsXG4gICAgfSxcbiAgfSxcbiAgWzB4NTldOiB7IC8vIFRvd2VyIEZsb29yIDFcbiAgICAvLyBza2lwOiB0cnVlLFxuICAgIHRvd2VyOiB0cnVlLFxuICB9LFxuICBbMHg1YV06IHsgLy8gVG93ZXIgRmxvb3IgMlxuICAgIC8vIHNraXA6IHRydWUsXG4gICAgdG93ZXI6IHRydWUsXG4gIH0sXG4gIFsweDViXTogeyAvLyBUb3dlciBGbG9vciAzXG4gICAgLy8gc2tpcDogdHJ1ZSxcbiAgICB0b3dlcjogdHJ1ZSxcbiAgfSxcbiAgWzB4NjBdOiB7IC8vIEFuZ3J5IFNlYVxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhbDM6IDB4MDgsXG4gICAgICBwYXQxOiAweDUyLCAvLyAoYXMgb3Bwb3NlZCB0byBwYXQwKVxuICAgIH0sXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIHNraXA6IHRydWUsIC8vIG5vdCBzdXJlIGhvdyB0byByYW5kb21pemUgdGhlc2Ugd2VsbFxuICB9LFxuICBbMHg2NF06IHsgLy8gVW5kZXJncm91bmQgQ2hhbm5lbFxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhbDM6IDB4MDgsXG4gICAgICBwYXQxOiAweDUyLCAvLyAoYXMgb3Bwb3NlZCB0byBwYXQwKVxuICAgIH0sXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbiAgWzB4NjhdOiB7IC8vIEV2aWwgU3Bpcml0IElzbGFuZCAxXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGFsMzogMHgwOCxcbiAgICAgIHBhdDE6IDB4NTIsIC8vIChhcyBvcHBvc2VkIHRvIHBhdDApXG4gICAgfSxcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHg2OV06IHsgLy8gRXZpbCBTcGlyaXQgSXNsYW5kIDJcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxN106IFs0LCA2XSwgIC8vIG1lZHVzYSBoZWFkXG4gICAgfSxcbiAgfSxcbiAgWzB4NmFdOiB7IC8vIEV2aWwgU3Bpcml0IElzbGFuZCAzXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTVdOiBbMCwgMHgxOF0sICAvLyBtZWR1c2EgaGVhZFxuICAgIH0sXG4gIH0sXG4gIFsweDZjXTogeyAvLyBTYWJlcmEgUGFsYWNlIDFcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxN106IFswLCAweDE4XSwgLy8gZXZpbCBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4NmRdOiB7IC8vIFNhYmVyYSBQYWxhY2UgMlxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDExXTogWzB4MTAsIDBdLCAvLyBtb3RoXG4gICAgICBbMHgxYl06IFswLCAwXSwgICAgLy8gbW90aCAtIG9rIGFscmVhZHlcbiAgICAgIFsweDFjXTogWzYsIDBdLCAgICAvLyBtb3RoXG4gICAgfSxcbiAgfSxcbiAgWzB4NzhdOiB7IC8vIEdvYSBWYWxsZXlcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNl06IFstOCwgLThdLCAvLyBldmlsIGJpcmRcbiAgICB9LFxuICB9LFxuICBbMHg3Y106IHsgLy8gTXQgSHlkcmFcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNV06IFstMHgyNywgMHg1NF0sIC8vIGV2aWwgYmlyZFxuICAgIH0sXG4gIH0sXG4gIFsweDg0XTogeyAvLyBNdCBIeWRyYSBDYXZlIDdcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDEyXTogWzAsIC00XSxcbiAgICAgIFsweDEzXTogWzAsIDRdLFxuICAgICAgWzB4MTRdOiBbLTYsIDBdLFxuICAgICAgWzB4MTVdOiBbMTQsIDEyXSxcbiAgICB9LFxuICB9LFxuICBbMHg4OF06IHsgLy8gU3R5eCAxXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHg4OV06IHsgLy8gU3R5eCAyXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHg4YV06IHsgLy8gU3R5eCAxXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGRdOiBbNywgMF0sIC8vIG1vdGhcbiAgICAgIFsweDBlXTogWzAsIDBdLCAvLyBtb3RoIC0gb2tcbiAgICAgIFsweDBmXTogWzcsIDNdLCAvLyBtb3RoXG4gICAgICBbMHgxMF06IFswLCA2XSwgLy8gbW90aFxuICAgICAgWzB4MTFdOiBbMTEsIC0weDEwXSwgLy8gbW90aFxuICAgIH0sXG4gIH0sXG4gIFsweDhmXTogeyAvLyBHb2EgRm9ydHJlc3MgLSBPYXNpcyBDYXZlIEVudHJhbmNlXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbiAgWzB4OTBdOiB7IC8vIERlc2VydCAxXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTRdOiBbLTB4YiwgLTNdLCAvLyBib21iZXIgYmlyZFxuICAgICAgWzB4MTVdOiBbMCwgMHgxMF0sICAvLyBib21iZXIgYmlyZFxuICAgIH0sXG4gIH0sXG4gIFsweDkxXTogeyAvLyBPYXNpcyBDYXZlXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MThdOiBbMCwgMTRdLCAgICAvLyBpbnNlY3RcbiAgICAgIFsweDE5XTogWzQsIC0weDEwXSwgLy8gaW5zZWN0XG4gICAgfSxcbiAgfSxcbiAgWzB4OThdOiB7IC8vIERlc2VydCAyXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTRdOiBbLTYsIDZdLCAgICAvLyBkZXZpbFxuICAgICAgWzB4MTVdOiBbMCwgLTB4MTBdLCAvLyBkZXZpbFxuICAgIH0sXG4gIH0sXG4gIFsweDllXTogeyAvLyBQeXJhbWlkIEZyb250IC0gTWFpblxuICAgIG1heEZseWVyczogMixcbiAgfSxcbiAgWzB4YTJdOiB7IC8vIFB5cmFtaWQgQmFjayAtIEJyYW5jaFxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDEyXTogWzAsIDExXSwgLy8gbW90aFxuICAgICAgWzB4MTNdOiBbNiwgMF0sICAvLyBtb3RoXG4gICAgfSxcbiAgfSxcbiAgWzB4YTVdOiB7IC8vIFB5cmFtaWQgQmFjayAtIEhhbGwgMlxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTddOiBbNiwgNl0sICAgLy8gbW90aFxuICAgICAgWzB4MThdOiBbLTYsIDBdLCAgLy8gbW90aFxuICAgICAgWzB4MTldOiBbLTEsIC03XSwgLy8gbW90aFxuICAgIH0sXG4gIH0sXG4gIFsweGE2XTogeyAvLyBEcmF5Z29uIDJcbiAgICAvLyBIYXMgYSBmZXcgYmx1ZSBzbGltZXMgdGhhdCBhcmVuJ3QgcmVhbCBhbmQgc2hvdWxkIGJlIGlnbm9yZWQuXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbiAgWzB4YThdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIEVudHJhbmNlXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbiAgWzB4YTldOiB7IC8vIEdvYSBGb3J0cmVzcyAtIEtlbGJlc3F1ZVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE2XTogWzB4MWEsIC0weDEwXSwgLy8gZGV2aWxcbiAgICAgIFsweDE3XTogWzAsIDB4MjBdLCAgICAgLy8gZGV2aWxcbiAgICB9LFxuICB9LFxuICBbMHhhYl06IHsgLy8gR29hIEZvcnRyZXNzIC0gU2FiZXJhXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGRdOiBbMSwgMF0sICAvLyBpbnNlY3RcbiAgICAgIFsweDBlXTogWzIsIC0yXSwgLy8gaW5zZWN0XG4gICAgfSxcbiAgfSxcblxuICBbMHhhZF06IHsgLy8gR29hIEZvcnRyZXNzIC0gTWFkbyAxXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MThdOiBbMCwgOF0sICAvLyBkZXZpbFxuICAgICAgWzB4MTldOiBbMCwgLThdLCAvLyBkZXZpbFxuICAgIH0sXG4gIH0sXG4gIFsweGFmXTogeyAvLyBHb2EgRm9ydHJlc3MgLSBNYWRvIDNcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzAsIDBdLCAgLy8gbW90aCAtIG9rXG4gICAgICBbMHgwZV06IFswLCAwXSwgIC8vIGJyb2tlbiAtIGJ1dCByZXBsYWNlP1xuICAgICAgWzB4MTNdOiBbMHgzYiwgLTB4MjZdLCAvLyBzaGFkb3cgLSBlbWJlZGRlZCBpbiB3YWxsXG4gICAgICAvLyBUT0RPIC0gMHgwZSBnbGl0Y2hlZCwgZG9uJ3QgcmFuZG9taXplXG4gICAgfSxcbiAgfSxcbiAgWzB4YjRdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIEthcm1pbmUgNVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDExXTogWzYsIDBdLCAgLy8gbW90aFxuICAgICAgWzB4MTJdOiBbMCwgNl0sICAvLyBtb3RoXG4gICAgfSxcbiAgfSxcbiAgWzB4ZDddOiB7IC8vIFBvcnRvYSBQYWxhY2UgLSBFbnRyeVxuICAgIC8vIFRoZXJlJ3MgYSByYW5kb20gc2xpbWUgaW4gdGhpcyByb29tIHRoYXQgd291bGQgY2F1c2UgZ2xpdGNoZXNcbiAgICBza2lwOiB0cnVlLFxuICB9LFxufTtcblxuY29uc3QgVU5UT1VDSEVEX01PTlNURVJTOiB7W2lkOiBudW1iZXJdOiBib29sZWFufSA9IHsgLy8gbm90IHlldCArMHg1MCBpbiB0aGVzZSBrZXlzXG4gIFsweDdlXTogdHJ1ZSwgLy8gdmVydGljYWwgcGxhdGZvcm1cbiAgWzB4N2ZdOiB0cnVlLCAvLyBob3Jpem9udGFsIHBsYXRmb3JtXG4gIFsweDgzXTogdHJ1ZSwgLy8gZ2xpdGNoIGluICQ3YyAoaHlkcmEpXG4gIFsweDhkXTogdHJ1ZSwgLy8gZ2xpdGNoIGluIGxvY2F0aW9uICRhYiAoc2FiZXJhIDIpIC0gY3J1bWJsaW5nIGhvcml6b250YWwgcGxhdGZvcm1cbiAgWzB4OGVdOiB0cnVlLCAvLyBicm9rZW4/LCBidXQgc2l0cyBvbiB0b3Agb2YgaXJvbiB3YWxsXG4gIFsweDhmXTogdHJ1ZSwgLy8gc2hvb3Rpbmcgc3RhdHVlXG4gIFsweDlmXTogdHJ1ZSwgLy8gY3J1bWJsaW5nIHZlcnRpY2FsIHBsYXRmb3JtXG4gIC8vIFsweGExXTogdHJ1ZSwgLy8gd2hpdGUgdG93ZXIgcm9ib3RzXG4gIFsweGE2XTogdHJ1ZSwgLy8gZ2xpdGNoIGluIGxvY2F0aW9uICRhZiAobWFkbyAyKVxufTtcblxuY29uc3Qgc2h1ZmZsZVJhbmRvbU51bWJlcnMgPSAocm9tOiBVaW50OEFycmF5LCByYW5kb206IFJhbmRvbSkgPT4ge1xuICBjb25zdCB0YWJsZSA9IHJvbS5zdWJhcnJheSgweDM1N2U0ICsgMHgxMCwgMHgzNTgyNCArIDB4MTApO1xuICByYW5kb20uc2h1ZmZsZSh0YWJsZSk7XG59O1xuXG4vLyB1c2VmdWwgZm9yIGRlYnVnIGV2ZW4gaWYgbm90IGN1cnJlbnRseSB1c2VkXG5jb25zdCBbXSA9IFtoZXhdO1xuIl19