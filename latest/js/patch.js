import { Assembler } from './6502.js';
import { crc32 } from './crc32.js';
import { generate as generateDepgraph } from './depgraph.js';
import { FetchReader } from './fetchreader.js';
import { FlagSet } from './flagset.js';
import { AssumedFill } from './graph/shuffle.js';
import { World } from './graph/world.js';
import { deterministic, deterministicPreParse } from './pass/deterministic.js';
import { fixDialog } from './pass/fixdialog.js';
import { shuffleMazes } from './pass/shufflemazes.js';
import { shufflePalettes } from './pass/shufflepalettes.js';
import { shuffleTrades } from './pass/shuffletrades.js';
import { unidentifiedItems } from './pass/unidentifieditems.js';
import { Random } from './random.js';
import { Rom } from './rom.js';
import { ShopType } from './rom/shop.js';
import * as slots from './rom/slots.js';
import { Spoiler } from './rom/spoiler.js';
import { hex, seq, watchArray, writeLittleEndian } from './rom/util.js';
import * as version from './version.js';
import { Graphics } from './rom/graphics.js';
import { Constraint } from './rom/constraint.js';
import { Monster } from './rom/monster.js';
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
        _CTRL1_SHORTCUTS: true,
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
        _LEATHER_BOOTS_GIVE_SPEED: flags.leatherBootsGiveSpeed(),
        _NERF_FLIGHT: true,
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
    if (flags.randomizeWildWarp())
        shuffleWildWarp(parsed, flags, random);
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
    const partition = rom.locations.partition(l => l.tilePalettes.join(' '), undefined, true);
    for (const [locations] of partition) {
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
        partition() { return [[this], this.bgm]; }
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
    const partitions = rom.locations.partition((loc) => loc.id !== 0x5f ? loc.bgm : 0)
        .filter((l) => l[1]);
    const peaceful = [];
    const hostile = [];
    const bosses = bossAddr.map(a => new BossMusic(a).partition());
    for (const part of partitions) {
        let monsters = 0;
        for (const loc of part[0]) {
            for (const spawn of loc.spawns) {
                if (spawn.isMonster())
                    monsters++;
            }
        }
        (monsters >= part[0].length ? hostile : peaceful).push(part);
    }
    const evenWeight = true;
    const extraMusic = false;
    function shuffle(parts) {
        const values = parts.map((x) => x[1]);
        if (evenWeight) {
            const used = [...new Set(values)];
            if (extraMusic)
                used.push(0x9, 0xa, 0xb, 0x1a, 0x1c, 0x1d);
            for (const [locs] of parts) {
                const value = used[random.nextInt(used.length)];
                for (const loc of locs) {
                    loc.bgm = value;
                }
            }
            return;
        }
        random.shuffle(values);
        for (const [locs] of parts) {
            const value = values.pop();
            for (const loc of locs) {
                loc.bgm = value;
            }
        }
    }
    shuffle([...peaceful, ...hostile, ...bosses]);
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
    0x24: 80,
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
    [0x57, 'b', 'Vampire', 3, , 12, 18, , ,],
    [0x58, 'm', 'Orc', 3, , 4, 21, 4, 57],
    [0x59, 'm', 'Red Flying Swamp Insect', 3, , 1, 21, 4, 57],
    [0x5a, 'm', 'Blue Mushroom', 2, , 1, 21, 4, 44],
    [0x5b, 'm', 'Swamp Tomato', 3, , 2, 35, 4, 52],
    [0x5c, 'm', 'Flying Meadow Insect', 3, , 3, 23, 4, 81],
    [0x5d, 'm', 'Swamp Plant', , , , , , 36],
    [0x5e, 'b', 'Insect', , 1, 8, 6, , ,],
    [0x5f, 'm', 'Large Blue Slime', 5, , 3, 20, 4, 52],
    [0x60, 'm', 'Ice Zombie', 5, , 7, 14, 4, 57],
    [0x61, 'm', 'Green Living Rock', , , 1, 9, 4, 28],
    [0x62, 'm', 'Green Spider', 4, , 4, 22, 4, 44],
    [0x63, 'm', 'Red/Purple Wyvern', 3, , 4, 30, 4, 65],
    [0x64, 'm', 'Draygonia Soldier', 6, , 11, 36, 4, 89],
    [0x65, 'm', 'Ice Entity', 3, , 2, 24, 4, 52],
    [0x66, 'm', 'Red Living Rock', , , 1, 13, 4, 40],
    [0x67, 'm', 'Ice Golem', 7, 2, 11, 28, 4, 81],
    [0x68, 'b', 'Kelbesque', 4, 6, 12, 29, , ,],
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
    [0x7d, 'b', 'Sabera', 3, 7, 13, 24, , ,],
    [0x80, 'm', 'Draygonia Archer', 1, , 3, 20, 6, 61],
    [0x81, 'm', 'Evil Bomber Bird', , , 1, 19, 4, 65],
    [0x82, 'm', 'Lavaman/blob', 3, , 3, 24, 6, 85],
    [0x84, 'm', 'Lizardman (w/ flail(', 2, , 3, 30, 6, 81],
    [0x85, 'm', 'Giant Eye', 3, , 5, 33, 4, 81],
    [0x86, 'm', 'Salamander', 2, , 4, 29, 8, 77],
    [0x87, 'm', 'Sorceror', 2, , 5, 31, 6, 65],
    [0x88, 'b', 'Mado', 4, 8, 10, 30, , ,],
    [0x89, 'm', 'Draygonia Knight', 2, , 3, 24, 4, 77],
    [0x8a, 'm', 'Devil', , , 1, 18, 4, 52],
    [0x8b, 'b', 'Kelbesque 2', 4, 6, 11, 27, , ,],
    [0x8c, 'm', 'Wraith Shadow 2', , , , 17, 4, 48],
    [0x90, 'b', 'Sabera 2', 5, 7, 21, 27, , ,],
    [0x91, 'm', 'Tarantula', 3, , 3, 21, 6, 73],
    [0x92, 'm', 'Skeleton', , , 4, 30, 6, 69],
    [0x93, 'b', 'Mado 2', 4, 8, 11, 25, , ,],
    [0x94, 'm', 'Purple Giant Eye', 4, , 10, 23, 6, 102],
    [0x95, 'm', 'Black Knight (w/ flail)', 3, , 7, 26, 6, 89],
    [0x96, 'm', 'Scorpion', 3, , 5, 29, 2, 73],
    [0x97, 'b', 'Karmine', 4, , 14, 26, , ,],
    [0x98, 'm', 'Sandman/blob', 3, , 5, 36, 6, 98],
    [0x99, 'm', 'Mummy', 5, , 19, 36, 6, 110],
    [0x9a, 'm', 'Tomb Guardian', 7, , 60, 37, 6, 106],
    [0x9b, 'b', 'Draygon', 5, 6, 16, 41, , ,],
    [0x9e, 'b', 'Draygon 2', 7, 6, 28, 40, , ,],
    [0xa0, 'm', 'Ground Sentry (1)', 4, , 6, 26, , 73],
    [0xa1, 'm', 'Tower Defense Mech (2)', 5, , 8, 36, , 85],
    [0xa2, 'm', 'Tower Sentinel', , , 1, , , 32],
    [0xa3, 'm', 'Air Sentry', 3, , 2, 26, , 65],
    [0xa5, 'b', 'Vampire 2', 3, , 12, 27, , ,],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwQyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2pDLE9BQU8sRUFDQyxRQUFRLElBQUksZ0JBQWdCLEVBQ0MsTUFBTSxlQUFlLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDckMsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsYUFBYSxFQUFFLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0UsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQzlDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRCxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDbkMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsUUFBUSxFQUFPLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFB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QUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRU4sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNYO1FBQ0QsU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDZjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUVOLElBQUksRUFBRSxJQUFJO0tBQ1g7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUVYO1FBQ0QsU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztTQUNsQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ25CO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO1NBQ3BCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2hCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNqQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDZjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUVQO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUUsRUFFUDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNYO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRU4sS0FBSyxFQUFFLElBQUk7S0FDWjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixLQUFLLEVBQUUsSUFBSTtLQUNaO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUVOLEtBQUssRUFBRSxJQUFJO0tBQ1o7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNYO1FBQ0QsU0FBUyxFQUFFLENBQUM7UUFDWixJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7U0FDWDtRQUNELElBQUksRUFBRSxJQUFJO0tBQ1g7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNYO1FBQ0QsSUFBSSxFQUFFLElBQUk7S0FDWDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1NBQ2xCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztTQUNsQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDakIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNmO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDakI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7U0FDdEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDakI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUM7U0FDcEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1NBQ2xCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNmLENBQUMs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QyxJQUFJLENBQUMsRUFBRSxJQUFJO0lBQ1osQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJO0lBQ1osQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJO0lBQ1osQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJO0lBQ1osQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJO0lBQ1osQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJO0lBRVosQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJO0NBQ2IsQ0FBQztBQUVGLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxHQUFlLEVBQUUsTUFBYyxFQUFFLEVBQUU7SUFDL0QsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxFQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzRCxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQztBQUdGLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Fzc2VtYmxlcn0gZnJvbSAnLi82NTAyLmpzJztcbmltcG9ydCB7Y3JjMzJ9IGZyb20gJy4vY3JjMzIuanMnO1xuaW1wb3J0IHtQcm9ncmVzc1RyYWNrZXIsXG4gICAgICAgIGdlbmVyYXRlIGFzIGdlbmVyYXRlRGVwZ3JhcGgsXG4gICAgICAgIHNodWZmbGUyIGFzIF9zaHVmZmxlRGVwZ3JhcGh9IGZyb20gJy4vZGVwZ3JhcGguanMnO1xuaW1wb3J0IHtGZXRjaFJlYWRlcn0gZnJvbSAnLi9mZXRjaHJlYWRlci5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge0Fzc3VtZWRGaWxsfSBmcm9tICcuL2dyYXBoL3NodWZmbGUuanMnO1xuaW1wb3J0IHtXb3JsZH0gZnJvbSAnLi9ncmFwaC93b3JsZC5qcyc7XG5pbXBvcnQge2RldGVybWluaXN0aWMsIGRldGVybWluaXN0aWNQcmVQYXJzZX0gZnJvbSAnLi9wYXNzL2RldGVybWluaXN0aWMuanMnO1xuaW1wb3J0IHtmaXhEaWFsb2d9IGZyb20gJy4vcGFzcy9maXhkaWFsb2cuanMnO1xuaW1wb3J0IHtzaHVmZmxlTWF6ZXN9IGZyb20gJy4vcGFzcy9zaHVmZmxlbWF6ZXMuanMnO1xuaW1wb3J0IHtzaHVmZmxlUGFsZXR0ZXN9IGZyb20gJy4vcGFzcy9zaHVmZmxlcGFsZXR0ZXMuanMnO1xuaW1wb3J0IHtzaHVmZmxlVHJhZGVzfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXRyYWRlcy5qcyc7XG5pbXBvcnQge3VuaWRlbnRpZmllZEl0ZW1zfSBmcm9tICcuL3Bhc3MvdW5pZGVudGlmaWVkaXRlbXMuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuL3JvbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtTaG9wVHlwZSwgU2hvcH0gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQgKiBhcyBzbG90cyBmcm9tICcuL3JvbS9zbG90cy5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtoZXgsIHNlcSwgd2F0Y2hBcnJheSwgd3JpdGVMaXR0bGVFbmRpYW59IGZyb20gJy4vcm9tL3V0aWwuanMnO1xuaW1wb3J0ICogYXMgdmVyc2lvbiBmcm9tICcuL3ZlcnNpb24uanMnO1xuaW1wb3J0IHtHcmFwaGljc30gZnJvbSAnLi9yb20vZ3JhcGhpY3MuanMnO1xuaW1wb3J0IHtDb25zdHJhaW50fSBmcm9tICcuL3JvbS9jb25zdHJhaW50LmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9yb20vbW9uc3Rlci5qcyc7XG5cbmNvbnN0IEVYUEFORF9QUkc6IGJvb2xlYW4gPSB0cnVlO1xuXG4vLyBUT0RPIC0gdG8gc2h1ZmZsZSB0aGUgbW9uc3RlcnMsIHdlIG5lZWQgdG8gZmluZCB0aGUgc3ByaXRlIHBhbHR0ZXMgYW5kXG4vLyBwYXR0ZXJucyBmb3IgZWFjaCBtb25zdGVyLiAgRWFjaCBsb2NhdGlvbiBzdXBwb3J0cyB1cCB0byB0d28gbWF0Y2h1cHMsXG4vLyBzbyBjYW4gb25seSBzdXBwb3J0IG1vbnN0ZXJzIHRoYXQgbWF0Y2guICBNb3Jlb3ZlciwgZGlmZmVyZW50IG1vbnN0ZXJzXG4vLyBzZWVtIHRvIG5lZWQgdG8gYmUgaW4gZWl0aGVyIHNsb3QgMCBvciAxLlxuXG4vLyBQdWxsIGluIGFsbCB0aGUgcGF0Y2hlcyB3ZSB3YW50IHRvIGFwcGx5IGF1dG9tYXRpY2FsbHkuXG4vLyBUT0RPIC0gbWFrZSBhIGRlYnVnZ2VyIHdpbmRvdyBmb3IgcGF0Y2hlcy5cbi8vIFRPRE8gLSB0aGlzIG5lZWRzIHRvIGJlIGEgc2VwYXJhdGUgbm9uLWNvbXBpbGVkIGZpbGUuXG5leHBvcnQgZGVmYXVsdCAoe1xuICBhc3luYyBhcHBseShyb206IFVpbnQ4QXJyYXksIGhhc2g6IHtba2V5OiBzdHJpbmddOiB1bmtub3dufSwgcGF0aDogc3RyaW5nKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gICAgLy8gTG9vayBmb3IgZmxhZyBzdHJpbmcgYW5kIGhhc2hcbiAgICBsZXQgZmxhZ3M7XG4gICAgaWYgKCFoYXNoLnNlZWQpIHtcbiAgICAgIC8vIFRPRE8gLSBzZW5kIGluIGEgaGFzaCBvYmplY3Qgd2l0aCBnZXQvc2V0IG1ldGhvZHNcbiAgICAgIGhhc2guc2VlZCA9IHBhcnNlU2VlZCgnJykudG9TdHJpbmcoMTYpO1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggKz0gJyZzZWVkPScgKyBoYXNoLnNlZWQ7XG4gICAgfVxuICAgIGlmIChoYXNoLmZsYWdzKSB7XG4gICAgICBmbGFncyA9IG5ldyBGbGFnU2V0KFN0cmluZyhoYXNoLmZsYWdzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZsYWdzID0gbmV3IEZsYWdTZXQoJ0BGdWxsU2h1ZmZsZScpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBpbiBoYXNoKSB7XG4gICAgICBpZiAoaGFzaFtrZXldID09PSAnZmFsc2UnKSBoYXNoW2tleV0gPSBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgW3Jlc3VsdCxdID1cbiAgICAgICAgYXdhaXQgc2h1ZmZsZShyb20sIHBhcnNlU2VlZChTdHJpbmcoaGFzaC5zZWVkKSksXG4gICAgICAgICAgICAgICAgICAgICAgZmxhZ3MsIG5ldyBGZXRjaFJlYWRlcihwYXRoKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTZWVkKHNlZWQ6IHN0cmluZyk6IG51bWJlciB7XG4gIGlmICghc2VlZCkgcmV0dXJuIFJhbmRvbS5uZXdTZWVkKCk7XG4gIGlmICgvXlswLTlhLWZdezEsOH0kL2kudGVzdChzZWVkKSkgcmV0dXJuIE51bWJlci5wYXJzZUludChzZWVkLCAxNik7XG4gIHJldHVybiBjcmMzMihzZWVkKTtcbn1cblxuLyoqXG4gKiBBYnN0cmFjdCBvdXQgRmlsZSBJL08uICBOb2RlIGFuZCBicm93c2VyIHdpbGwgaGF2ZSBjb21wbGV0ZWx5XG4gKiBkaWZmZXJlbnQgaW1wbGVtZW50YXRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlYWRlciB7XG4gIHJlYWQoZmlsZW5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPjtcbn1cblxuLy8gcHJldmVudCB1bnVzZWQgZXJyb3JzIGFib3V0IHdhdGNoQXJyYXkgLSBpdCdzIHVzZWQgZm9yIGRlYnVnZ2luZy5cbmNvbnN0IHt9ID0ge3dhdGNoQXJyYXl9IGFzIGFueTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNodWZmbGUocm9tOiBVaW50OEFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXI6IFJlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZz86IHtzcG9pbGVyPzogU3BvaWxlcn0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcz86IFByb2dyZXNzVHJhY2tlcik6IFByb21pc2U8cmVhZG9ubHkgW1VpbnQ4QXJyYXksIG51bWJlcl0+IHtcbiAgLy9yb20gPSB3YXRjaEFycmF5KHJvbSwgMHg4NWZhICsgMHgxMCk7XG5cbiAgaWYgKEVYUEFORF9QUkcgJiYgcm9tLmxlbmd0aCA8IDB4ODAwMDApIHtcbiAgICBjb25zdCBuZXdSb20gPSBuZXcgVWludDhBcnJheShyb20ubGVuZ3RoICsgMHg0MDAwMCk7XG4gICAgbmV3Um9tLnN1YmFycmF5KDAsIDB4NDAwMTApLnNldChyb20uc3ViYXJyYXkoMCwgMHg0MDAxMCkpO1xuICAgIG5ld1JvbS5zdWJhcnJheSgweDgwMDEwKS5zZXQocm9tLnN1YmFycmF5KDB4NDAwMTApKTtcbiAgICBuZXdSb21bNF0gPDw9IDE7XG4gICAgcm9tID0gbmV3Um9tO1xuICB9XG5cbiAgLy8gRmlyc3QgcmVlbmNvZGUgdGhlIHNlZWQsIG1peGluZyBpbiB0aGUgZmxhZ3MgZm9yIHNlY3VyaXR5LlxuICBpZiAodHlwZW9mIHNlZWQgIT09ICdudW1iZXInKSB0aHJvdyBuZXcgRXJyb3IoJ0JhZCBzZWVkJyk7XG4gIGNvbnN0IG5ld1NlZWQgPSBjcmMzMihzZWVkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpICsgU3RyaW5nKGZsYWdzKSkgPj4+IDA7XG5cbiAgY29uc3QgdG91Y2hTaG9wcyA9IHRydWU7XG5cbiAgY29uc3QgZGVmaW5lczoge1tuYW1lOiBzdHJpbmddOiBib29sZWFufSA9IHtcbiAgICBfQUxMT1dfVEVMRVBPUlRfT1VUX09GX0JPU1M6IGZsYWdzLmhhcmRjb3JlTW9kZSgpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCksXG4gICAgX0FMTE9XX1RFTEVQT1JUX09VVF9PRl9UT1dFUjogdHJ1ZSxcbiAgICBfQVVUT19FUVVJUF9CUkFDRUxFVDogZmxhZ3MuYXV0b0VxdWlwQnJhY2VsZXQoKSxcbiAgICBfQkFSUklFUl9SRVFVSVJFU19DQUxNX1NFQTogZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpLFxuICAgIF9CVUZGX0RFT1NfUEVOREFOVDogZmxhZ3MuYnVmZkRlb3NQZW5kYW50KCksXG4gICAgX0JVRkZfRFlOQTogZmxhZ3MuYnVmZkR5bmEoKSwgLy8gdHJ1ZSxcbiAgICBfQ0hFQ0tfRkxBRzA6IHRydWUsXG4gICAgX0NUUkwxX1NIT1JUQ1VUUzogdHJ1ZSxcbiAgICBfQ1VTVE9NX1NIT09USU5HX1dBTExTOiB0cnVlLFxuICAgIF9ERUJVR19ESUFMT0c6IHNlZWQgPT09IDB4MTdiYyxcbiAgICBfRElTQUJMRV9TSE9QX0dMSVRDSDogZmxhZ3MuZGlzYWJsZVNob3BHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9TVEFUVUVfR0xJVENIOiBmbGFncy5kaXNhYmxlU3RhdHVlR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfU1dPUkRfQ0hBUkdFX0dMSVRDSDogZmxhZ3MuZGlzYWJsZVN3b3JkQ2hhcmdlR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfVFJJR0dFUl9TS0lQOiB0cnVlLFxuICAgIF9ESVNBQkxFX1dBUlBfQk9PVFNfUkVVU0U6IGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfV0lMRF9XQVJQOiBmYWxzZSxcbiAgICBfRElTUExBWV9ESUZGSUNVTFRZOiB0cnVlLFxuICAgIF9FWFRSQV9QSVRZX01QOiB0cnVlLCAgLy8gVE9ETzogYWxsb3cgZGlzYWJsaW5nIHRoaXNcbiAgICBfRklYX0NPSU5fU1BSSVRFUzogdHJ1ZSxcbiAgICBfRklYX09QRUxfU1RBVFVFOiB0cnVlLFxuICAgIF9GSVhfU0hBS0lORzogdHJ1ZSxcbiAgICBfRklYX1ZBTVBJUkU6IHRydWUsXG4gICAgX0hBUkRDT1JFX01PREU6IGZsYWdzLmhhcmRjb3JlTW9kZSgpLFxuICAgIF9MRUFUSEVSX0JPT1RTX0dJVkVfU1BFRUQ6IGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpLFxuICAgIF9ORVJGX0ZMSUdIVDogdHJ1ZSxcbiAgICBfTkVSRl9XSUxEX1dBUlA6IGZsYWdzLm5lcmZXaWxkV2FycCgpLFxuICAgIF9ORVZFUl9ESUU6IGZsYWdzLm5ldmVyRGllKCksXG4gICAgX05PUk1BTElaRV9TSE9QX1BSSUNFUzogdG91Y2hTaG9wcyxcbiAgICBfUElUWV9IUF9BTkRfTVA6IHRydWUsXG4gICAgX1BST0dSRVNTSVZFX0JSQUNFTEVUOiB0cnVlLFxuICAgIF9SQUJCSVRfQk9PVFNfQ0hBUkdFX1dISUxFX1dBTEtJTkc6IGZsYWdzLnJhYmJpdEJvb3RzQ2hhcmdlV2hpbGVXYWxraW5nKCksXG4gICAgX1JFUVVJUkVfSEVBTEVEX0RPTFBISU5fVE9fUklERTogZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSxcbiAgICBfUkVWRVJTSUJMRV9TV0FOX0dBVEU6IHRydWUsXG4gICAgX1NBSEFSQV9SQUJCSVRTX1JFUVVJUkVfVEVMRVBBVEhZOiBmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpLFxuICAgIF9TSU1QTElGWV9JTlZJU0lCTEVfQ0hFU1RTOiB0cnVlLFxuICAgIF9URUxFUE9SVF9PTl9USFVOREVSX1NXT1JEOiBmbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCksXG4gICAgX1RSQUlORVI6IGZsYWdzLnRyYWluZXIoKSxcbiAgICBfVU5JREVOVElGSUVEX0lURU1TOiBmbGFncy51bmlkZW50aWZpZWRJdGVtcygpLFxuICAgIF9aRUJVX1NUVURFTlRfR0lWRVNfSVRFTTogZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSxcbiAgfTtcblxuICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKCk7XG4gIGFzeW5jIGZ1bmN0aW9uIGFzc2VtYmxlKHBhdGg6IHN0cmluZykge1xuICAgIGFzbS5hc3NlbWJsZShhd2FpdCByZWFkZXIucmVhZChwYXRoKSwgcGF0aCk7XG4gICAgYXNtLnBhdGNoUm9tKHJvbSk7XG4gIH1cblxuICBkZXRlcm1pbmlzdGljUHJlUGFyc2Uocm9tLnN1YmFycmF5KDB4MTApKTsgLy8gVE9ETyAtIHRyYWluZXIuLi5cblxuICBjb25zdCBmbGFnRmlsZSA9XG4gICAgICBPYmplY3Qua2V5cyhkZWZpbmVzKVxuICAgICAgICAgIC5maWx0ZXIoZCA9PiBkZWZpbmVzW2RdKS5tYXAoZCA9PiBgZGVmaW5lICR7ZH0gMVxcbmApLmpvaW4oJycpO1xuICBhc20uYXNzZW1ibGUoZmxhZ0ZpbGUsICdmbGFncy5zJyk7XG4gIGF3YWl0IGFzc2VtYmxlKCdwcmVzaHVmZmxlLnMnKTtcblxuICBjb25zdCByYW5kb20gPSBuZXcgUmFuZG9tKG5ld1NlZWQpO1xuICBjb25zdCBwYXJzZWQgPSBuZXcgUm9tKHJvbSk7XG4gIGlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSAod2luZG93IGFzIGFueSkucm9tID0gcGFyc2VkO1xuICBwYXJzZWQuc3BvaWxlciA9IG5ldyBTcG9pbGVyKHBhcnNlZCk7XG4gIGlmIChsb2cpIGxvZy5zcG9pbGVyID0gcGFyc2VkLnNwb2lsZXI7XG5cbiAgLy8gTWFrZSBkZXRlcm1pbmlzdGljIGNoYW5nZXMuXG4gIGRldGVybWluaXN0aWMocGFyc2VkLCBmbGFncyk7XG5cbiAgLy8gU2V0IHVwIHNob3AgYW5kIHRlbGVwYXRoeVxuICBhd2FpdCBhc3NlbWJsZSgncG9zdHBhcnNlLnMnKTtcbiAgcGFyc2VkLnNjYWxpbmdMZXZlbHMgPSA0ODtcbiAgcGFyc2VkLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBhc20uZXhwYW5kKCdLZXlJdGVtRGF0YScpO1xuXG4gIGlmIChmbGFncy5zaHVmZmxlU2hvcHMoKSkgc2h1ZmZsZVNob3BzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgcmFuZG9taXplV2FsbHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICBpZiAoZmxhZ3MucmFuZG9taXplV2lsZFdhcnAoKSkgc2h1ZmZsZVdpbGRXYXJwKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHJlc2NhbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB1bmlkZW50aWZpZWRJdGVtcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBzaHVmZmxlVHJhZGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlmIChmbGFncy5yYW5kb21pemVNYXBzKCkpIHNodWZmbGVNYXplcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuXG4gIC8vIFRoaXMgd2FudHMgdG8gZ28gYXMgbGF0ZSBhcyBwb3NzaWJsZSBzaW5jZSB3ZSBuZWVkIHRvIHBpY2sgdXBcbiAgLy8gYWxsIHRoZSBub3JtYWxpemF0aW9uIGFuZCBvdGhlciBoYW5kbGluZyB0aGF0IGhhcHBlbmVkIGJlZm9yZS5cbiAgY29uc3QgdyA9IFdvcmxkLmJ1aWxkKHBhcnNlZCwgZmxhZ3MpO1xuICBjb25zdCBmaWxsID0gYXdhaXQgbmV3IEFzc3VtZWRGaWxsKHBhcnNlZCwgZmxhZ3MpLnNodWZmbGUody5ncmFwaCwgcmFuZG9tLCBwcm9ncmVzcyk7XG4gIGlmIChmaWxsKSB7XG4gICAgLy8gY29uc3QgbiA9IChpOiBudW1iZXIpID0+IHtcbiAgICAvLyAgIGlmIChpID49IDB4NzApIHJldHVybiAnTWltaWMnO1xuICAgIC8vICAgY29uc3QgaXRlbSA9IHBhcnNlZC5pdGVtc1twYXJzZWQuaXRlbUdldHNbaV0uaXRlbUlkXTtcbiAgICAvLyAgIHJldHVybiBpdGVtID8gaXRlbS5tZXNzYWdlTmFtZSA6IGBpbnZhbGlkICR7aX1gO1xuICAgIC8vIH07XG4gICAgLy8gY29uc29sZS5sb2coJ2l0ZW06IHNsb3QnKTtcbiAgICAvLyBmb3IgKGxldCBpID0gMDsgaSA8IGZpbGwuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyAgIGlmIChmaWxsLml0ZW1zW2ldICE9IG51bGwpIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coYCQke2hleChpKX0gJHtuKGkpfTogJHtuKGZpbGwuaXRlbXNbaV0pfSAkJHtoZXgoZmlsbC5pdGVtc1tpXSl9YCk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICAgIHcudHJhdmVyc2Uody5ncmFwaCwgZmlsbCk7IC8vIGZpbGwgdGhlIHNwb2lsZXIgKG1heSBhbHNvIHdhbnQgdG8ganVzdCBiZSBhIHNhbml0eSBjaGVjaz8pXG5cbiAgICBzbG90cy51cGRhdGUocGFyc2VkLCBmaWxsLnNsb3RzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gW3JvbSwgLTFdO1xuICAgIC8vY29uc29sZS5lcnJvcignQ09VTEQgTk9UIEZJTEwhJyk7XG4gIH1cbiAgLy9jb25zb2xlLmxvZygnZmlsbCcsIGZpbGwpO1xuXG4gIC8vIFRPRE8gLSBzZXQgb21pdEl0ZW1HZXREYXRhU3VmZml4IGFuZCBvbWl0TG9jYWxEaWFsb2dTdWZmaXhcbiAgLy9hd2FpdCBzaHVmZmxlRGVwZ3JhcGgocGFyc2VkLCByYW5kb20sIGxvZywgZmxhZ3MsIHByb2dyZXNzKTtcblxuICAvLyBUT0RPIC0gcmV3cml0ZSByZXNjYWxlU2hvcHMgdG8gdGFrZSBhIFJvbSBpbnN0ZWFkIG9mIGFuIGFycmF5Li4uXG4gIGlmICh0b3VjaFNob3BzKSB7XG4gICAgLy8gVE9ETyAtIHNlcGFyYXRlIGxvZ2ljIGZvciBoYW5kbGluZyBzaG9wcyB3L28gUG4gc3BlY2lmaWVkIChpLmUuIHZhbmlsbGFcbiAgICAvLyBzaG9wcyB0aGF0IG1heSBoYXZlIGJlZW4gcmFuZG9taXplZClcbiAgICByZXNjYWxlU2hvcHMocGFyc2VkLCBhc20sIGZsYWdzLmJhcmdhaW5IdW50aW5nKCkgPyByYW5kb20gOiB1bmRlZmluZWQpO1xuICB9XG5cbiAgLy8gTk9URTogbW9uc3RlciBzaHVmZmxlIG5lZWRzIHRvIGdvIGFmdGVyIGl0ZW0gc2h1ZmZsZSBiZWNhdXNlIG9mIG1pbWljXG4gIC8vIHBsYWNlbWVudCBjb25zdHJhaW50cywgYnV0IGl0IHdvdWxkIGJlIG5pY2UgdG8gZ28gYmVmb3JlIGluIG9yZGVyIHRvXG4gIC8vIGd1YXJhbnRlZSBtb25leS5cbiAgaWYgKGZsYWdzLnNodWZmbGVNb25zdGVycygpKSBzaHVmZmxlTW9uc3RlcnMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgaWRlbnRpZnlLZXlJdGVtc0ZvckRpZmZpY3VsdHlCdWZmcyhwYXJzZWQpO1xuXG4gIC8vIEJ1ZmYgbWVkaWNhbCBoZXJiIGFuZCBmcnVpdCBvZiBwb3dlclxuICBpZiAoZmxhZ3MuZG91YmxlQnVmZk1lZGljYWxIZXJiKCkpIHtcbiAgICByb21bMHgxYzUwYyArIDB4MTBdICo9IDI7ICAvLyBmcnVpdCBvZiBwb3dlclxuICAgIHJvbVsweDFjNGVhICsgMHgxMF0gKj0gMzsgIC8vIG1lZGljYWwgaGVyYlxuICB9IGVsc2UgaWYgKGZsYWdzLmJ1ZmZNZWRpY2FsSGVyYigpKSB7XG4gICAgcm9tWzB4MWM1MGMgKyAweDEwXSArPSAxNjsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgICByb21bMHgxYzRlYSArIDB4MTBdICo9IDI7ICAvLyBtZWRpY2FsIGhlcmJcbiAgfVxuXG4gIGlmIChmbGFncy5zdG9yeU1vZGUoKSkgc3RvcnlNb2RlKHBhcnNlZCk7XG5cbiAgc2h1ZmZsZU11c2ljKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHNodWZmbGVQYWxldHRlcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICAvLyBEbyB0aGlzICphZnRlciogc2h1ZmZsaW5nIHBhbGV0dGVzXG4gIGlmIChmbGFncy5ibGFja291dE1vZGUoKSkgYmxhY2tvdXRNb2RlKHBhcnNlZCk7XG5cbiAgbWlzYyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBmaXhEaWFsb2cocGFyc2VkKTtcblxuICAvLyBOT1RFOiBUaGlzIG5lZWRzIHRvIGhhcHBlbiBCRUZPUkUgcG9zdHNodWZmbGVcbiAgaWYgKGZsYWdzLmJ1ZmZEeW5hKCkpIGJ1ZmZEeW5hKHBhcnNlZCwgZmxhZ3MpOyAvLyBUT0RPIC0gY29uZGl0aW9uYWxcblxuICBpZiAoZmxhZ3MudHJhaW5lcigpKSB7XG4gICAgcGFyc2VkLndpbGRXYXJwLmxvY2F0aW9ucyA9IFtcbiAgICAgIDB4MGEsIC8vIHZhbXBpcmVcbiAgICAgIDB4MWEsIC8vIHN3YW1wL2luc2VjdFxuICAgICAgMHgzNSwgLy8gc3VtbWl0IGNhdmVcbiAgICAgIDB4NDgsIC8vIGZvZyBsYW1wXG4gICAgICAweDZkLCAvLyB2YW1waXJlIDJcbiAgICAgIDB4NmUsIC8vIHNhYmVyYSAxXG4gICAgICAweDhjLCAvLyBzaHlyb25cbiAgICAgIDB4YWEsIC8vIGJlaGluZCBrZWxiZXNxeWUgMlxuICAgICAgMHhhYywgLy8gc2FiZXJhIDJcbiAgICAgIDB4YjAsIC8vIGJlaGluZCBtYWRvIDJcbiAgICAgIDB4YjYsIC8vIGthcm1pbmVcbiAgICAgIDB4OWYsIC8vIGRyYXlnb24gMVxuICAgICAgMHhhNiwgLy8gZHJheWdvbiAyXG4gICAgICAweDU4LCAvLyB0b3dlclxuICAgICAgMHg1YywgLy8gdG93ZXIgb3V0c2lkZSBtZXNpYVxuICAgICAgMHgwMCwgLy8gbWV6YW1lXG4gICAgXTtcbiAgfVxuXG4gIGF3YWl0IHBhcnNlZC53cml0ZURhdGEoKTtcbiAgYnVmZkR5bmEocGFyc2VkLCBmbGFncyk7IC8vIFRPRE8gLSBjb25kaXRpb25hbFxuICBjb25zdCBjcmMgPSBhd2FpdCBwb3N0UGFyc2VkU2h1ZmZsZShyb20sIHJhbmRvbSwgc2VlZCwgZmxhZ3MsIGFzbSwgYXNzZW1ibGUpO1xuXG4gIC8vIFRPRE8gLSBvcHRpb25hbCBmbGFncyBjYW4gcG9zc2libHkgZ28gaGVyZSwgYnV0IE1VU1QgTk9UIHVzZSBwYXJzZWQucHJnIVxuXG4gIGlmIChFWFBBTkRfUFJHKSB7XG4gICAgY29uc3QgcHJnID0gcm9tLnN1YmFycmF5KDB4MTApO1xuICAgIHByZy5zdWJhcnJheSgweDdjMDAwLCAweDgwMDAwKS5zZXQocHJnLnN1YmFycmF5KDB4M2MwMDAsIDB4NDAwMDApKTtcbiAgfVxuICByZXR1cm4gW3JvbSwgY3JjXTtcbn1cblxuLy8gU2VwYXJhdGUgZnVuY3Rpb24gdG8gZ3VhcmFudGVlIHdlIG5vIGxvbmdlciBoYXZlIGFjY2VzcyB0byB0aGUgcGFyc2VkIHJvbS4uLlxuYXN5bmMgZnVuY3Rpb24gcG9zdFBhcnNlZFNodWZmbGUocm9tOiBVaW50OEFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZG9tOiBSYW5kb20sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWVkOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzbTogQXNzZW1ibGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZW1ibGU6IChwYXRoOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4pOiBQcm9taXNlPG51bWJlcj4ge1xuICBhd2FpdCBhc3NlbWJsZSgncG9zdHNodWZmbGUucycpO1xuICB1cGRhdGVEaWZmaWN1bHR5U2NhbGluZ1RhYmxlcyhyb20sIGZsYWdzLCBhc20pO1xuICB1cGRhdGVDb2luRHJvcHMocm9tLCBmbGFncyk7XG5cbiAgc2h1ZmZsZVJhbmRvbU51bWJlcnMocm9tLCByYW5kb20pO1xuXG4gIHJldHVybiBzdGFtcFZlcnNpb25TZWVkQW5kSGFzaChyb20sIHNlZWQsIGZsYWdzKTtcblxuICAvLyBCRUxPVyBIRVJFIEZPUiBPUFRJT05BTCBGTEFHUzpcblxuICAvLyBkbyBhbnkgXCJ2YW5pdHlcIiBwYXRjaGVzIGhlcmUuLi5cbiAgLy8gY29uc29sZS5sb2coJ3BhdGNoIGFwcGxpZWQnKTtcbiAgLy8gcmV0dXJuIGxvZy5qb2luKCdcXG4nKTtcbn07XG5cblxuZnVuY3Rpb24gbWlzYyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKSB7XG4gIGNvbnN0IHt9ID0ge3JvbSwgZmxhZ3MsIHJhbmRvbX0gYXMgYW55O1xuICAvLyBOT1RFOiB3ZSBzdGlsbCBuZWVkIHRvIGRvIHNvbWUgd29yayBhY3R1YWxseSBhZGp1c3RpbmdcbiAgLy8gbWVzc2FnZSB0ZXh0cyB0byBwcmV2ZW50IGxpbmUgb3ZlcmZsb3csIGV0Yy4gIFdlIHNob3VsZFxuICAvLyBhbHNvIG1ha2Ugc29tZSBob29rcyB0byBlYXNpbHkgc3dhcCBvdXQgaXRlbXMgd2hlcmUgaXRcbiAgLy8gbWFrZXMgc2Vuc2UuXG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1syXVsyXS50ZXh0ID0gYFxuezAxOkFrYWhhbmF9IGlzIGhhbmRlZCBhIHN0YXR1ZS4jXG5UaGFua3MgZm9yIGZpbmRpbmcgdGhhdC5cbkkgd2FzIHRvdGFsbHkgZ29ubmEgc2VsbFxuaXQgZm9yIHRvbnMgb2YgY2FzaC4jXG5IZXJlLCBoYXZlIHRoaXMgbGFtZVxuWzI5OkdhcyBNYXNrXSBvciBzb21ldGhpbmcuYDtcbiAgLy8gVE9ETyAtIHdvdWxkIGJlIG5pY2UgdG8gYWRkIHNvbWUgbW9yZSAoaGlnaGVyIGxldmVsKSBtYXJrdXAsXG4gIC8vIGUuZy4gYCR7ZGVzY3JpYmVJdGVtKHNsb3ROdW0pfWAuICBXZSBjb3VsZCBhbHNvIGFkZCBtYXJrdXBcbiAgLy8gZm9yIGUuZy4gYCR7c2F5V2FudChzbG90TnVtKX1gIGFuZCBgJHtzYXlUaGFua3Moc2xvdE51bSl9YFxuICAvLyBpZiB3ZSBzaHVmZmxlIHRoZSB3YW50ZWQgaXRlbXMuICBUaGVzZSBjb3VsZCBiZSByYW5kb21pemVkXG4gIC8vIGluIHZhcmlvdXMgd2F5cywgYXMgd2VsbCBhcyBoYXZpbmcgc29tZSBhZGRpdGlvbmFsIGJpdHMgbGlrZVxuICAvLyB3YW50QXV4aWxpYXJ5KC4uLikgZm9yIGUuZy4gXCJ0aGUga2lyaXNhIHBsYW50IGlzIC4uLlwiIC0gdGhlblxuICAvLyBpdCBjb3VsZCBpbnN0ZWFkIHNheSBcInRoZSBzdGF0dWUgb2Ygb255eCBpcyAuLi5cIi5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzBdWzB4ZV0udGV4dCA9IGBJdCdzIGRhbmdlcm91cyB0byBnbyBhbG9uZSEgVGFrZSB0aGlzLmA7XG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1swXVsweGVdLmZpeFRleHQoKTtcbn07XG5cbmZ1bmN0aW9uIHNodWZmbGVTaG9wcyhyb206IFJvbSwgX2ZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBjb25zdCBzaG9wczoge1t0eXBlOiBudW1iZXJdOiB7Y29udGVudHM6IG51bWJlcltdLCBzaG9wczogU2hvcFtdfX0gPSB7XG4gICAgW1Nob3BUeXBlLkFSTU9SXToge2NvbnRlbnRzOiBbXSwgc2hvcHM6IFtdfSxcbiAgICBbU2hvcFR5cGUuVE9PTF06IHtjb250ZW50czogW10sIHNob3BzOiBbXX0sXG4gIH07XG4gIC8vIFJlYWQgYWxsIHRoZSBjb250ZW50cy5cbiAgZm9yIChjb25zdCBzaG9wIG9mIHJvbS5zaG9wcykge1xuICAgIGlmICghc2hvcC51c2VkIHx8IHNob3AubG9jYXRpb24gPT09IDB4ZmYpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGRhdGEgPSBzaG9wc1tzaG9wLnR5cGVdO1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBkYXRhLmNvbnRlbnRzLnB1c2goLi4uc2hvcC5jb250ZW50cy5maWx0ZXIoeCA9PiB4ICE9PSAweGZmKSk7XG4gICAgICBkYXRhLnNob3BzLnB1c2goc2hvcCk7XG4gICAgICBzaG9wLmNvbnRlbnRzID0gW107XG4gICAgfVxuICB9XG4gIC8vIFNodWZmbGUgdGhlIGNvbnRlbnRzLiAgUGljayBvcmRlciB0byBkcm9wIGl0ZW1zIGluLlxuICBmb3IgKGNvbnN0IGRhdGEgb2YgT2JqZWN0LnZhbHVlcyhzaG9wcykpIHtcbiAgICBsZXQgc2xvdHM6IFNob3BbXSB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGl0ZW1zID0gWy4uLmRhdGEuY29udGVudHNdO1xuICAgIHJhbmRvbS5zaHVmZmxlKGl0ZW1zKTtcbiAgICB3aGlsZSAoaXRlbXMubGVuZ3RoKSB7XG4gICAgICBpZiAoIXNsb3RzIHx8ICFzbG90cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHNsb3RzKSBpdGVtcy5zaGlmdCgpO1xuICAgICAgICBzbG90cyA9IFsuLi5kYXRhLnNob3BzLCAuLi5kYXRhLnNob3BzLCAuLi5kYXRhLnNob3BzLCAuLi5kYXRhLnNob3BzXTtcbiAgICAgICAgcmFuZG9tLnNodWZmbGUoc2xvdHMpO1xuICAgICAgfVxuICAgICAgY29uc3QgaXRlbSA9IGl0ZW1zWzBdO1xuICAgICAgY29uc3Qgc2hvcCA9IHNsb3RzWzBdO1xuICAgICAgaWYgKHNob3AuY29udGVudHMubGVuZ3RoIDwgNCAmJiAhc2hvcC5jb250ZW50cy5pbmNsdWRlcyhpdGVtKSkge1xuICAgICAgICBzaG9wLmNvbnRlbnRzLnB1c2goaXRlbSk7XG4gICAgICAgIGl0ZW1zLnNoaWZ0KCk7XG4gICAgICB9XG4gICAgICBzbG90cy5zaGlmdCgpO1xuICAgIH1cbiAgfVxuICAvLyBTb3J0IGFuZCBhZGQgMHhmZidzXG4gIGZvciAoY29uc3QgZGF0YSBvZiBPYmplY3QudmFsdWVzKHNob3BzKSkge1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiBkYXRhLnNob3BzKSB7XG4gICAgICB3aGlsZSAoc2hvcC5jb250ZW50cy5sZW5ndGggPCA0KSBzaG9wLmNvbnRlbnRzLnB1c2goMHhmZik7XG4gICAgICBzaG9wLmNvbnRlbnRzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmFuZG9taXplV2FsbHMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICAvLyBOT1RFOiBXZSBjYW4gbWFrZSBhbnkgd2FsbCBzaG9vdCBieSBzZXR0aW5nIGl0cyAkMTAgYml0IG9uIHRoZSB0eXBlIGJ5dGUuXG4gIC8vIEJ1dCB0aGlzIGFsc28gcmVxdWlyZXMgbWF0Y2hpbmcgcGF0dGVybiB0YWJsZXMsIHNvIHdlJ2xsIGxlYXZlIHRoYXQgYWxvbmVcbiAgLy8gZm9yIG5vdyB0byBhdm9pZCBncm9zcyBncmFwaGljcy5cblxuICAvLyBBbGwgb3RoZXIgd2FsbHMgd2lsbCBuZWVkIHRoZWlyIHR5cGUgbW92ZWQgaW50byB0aGUgdXBwZXIgbmliYmxlIGFuZCB0aGVuXG4gIC8vIHRoZSBuZXcgZWxlbWVudCBnb2VzIGluIHRoZSBsb3dlciBuaWJibGUuICBTaW5jZSB0aGVyZSBhcmUgc28gZmV3IGlyb25cbiAgLy8gd2FsbHMsIHdlIHdpbGwgZ2l2ZSB0aGVtIGFyYml0cmFyeSBlbGVtZW50cyBpbmRlcGVuZGVudCBvZiB0aGUgcGFsZXR0ZS5cbiAgLy8gUm9jay9pY2Ugd2FsbHMgY2FuIGFsc28gaGF2ZSBhbnkgZWxlbWVudCwgYnV0IHRoZSB0aGlyZCBwYWxldHRlIHdpbGxcbiAgLy8gaW5kaWNhdGUgd2hhdCB0aGV5IGV4cGVjdC5cblxuICBpZiAoIWZsYWdzLnJhbmRvbWl6ZVdhbGxzKCkpIHJldHVybjtcbiAgLy8gQmFzaWMgcGxhbjogcGFydGl0aW9uIGJhc2VkIG9uIHBhbGV0dGUsIGxvb2sgZm9yIHdhbGxzLlxuICBjb25zdCBwYWxzID0gW1xuICAgIFsweDA1LCAweDM4XSwgLy8gcm9jayB3YWxsIHBhbGV0dGVzXG4gICAgWzB4MTFdLCAvLyBpY2Ugd2FsbCBwYWxldHRlc1xuICAgIFsweDZhXSwgLy8gXCJlbWJlciB3YWxsXCIgcGFsZXR0ZXNcbiAgICBbMHgxNF0sIC8vIFwiaXJvbiB3YWxsXCIgcGFsZXR0ZXNcbiAgXTtcblxuICBmdW5jdGlvbiB3YWxsVHlwZShzcGF3bjogU3Bhd24pOiBudW1iZXIge1xuICAgIGlmIChzcGF3bi5kYXRhWzJdICYgMHgyMCkge1xuICAgICAgcmV0dXJuIChzcGF3bi5pZCA+Pj4gNCkgJiAzO1xuICAgIH1cbiAgICByZXR1cm4gc3Bhd24uaWQgJiAzO1xuICB9XG5cbiAgY29uc3QgcGFydGl0aW9uID1cbiAgICAgIHJvbS5sb2NhdGlvbnMucGFydGl0aW9uKGwgPT4gbC50aWxlUGFsZXR0ZXMuam9pbignICcpLCB1bmRlZmluZWQsIHRydWUpO1xuICBmb3IgKGNvbnN0IFtsb2NhdGlvbnNdIG9mIHBhcnRpdGlvbikge1xuICAgIC8vIHBpY2sgYSByYW5kb20gd2FsbCB0eXBlLlxuICAgIGNvbnN0IGVsdCA9IHJhbmRvbS5uZXh0SW50KDQpO1xuICAgIGNvbnN0IHBhbCA9IHJhbmRvbS5waWNrKHBhbHNbZWx0XSk7XG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBsb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICAgIGNvbnN0IHR5cGUgPSB3YWxsVHlwZShzcGF3bik7XG4gICAgICAgICAgaWYgKHR5cGUgPT09IDIpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICh0eXBlID09PSAzKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdFbHQgPSByYW5kb20ubmV4dEludCg0KTtcbiAgICAgICAgICAgIGlmIChyb20uc3BvaWxlcikgcm9tLnNwb2lsZXIuYWRkV2FsbChsb2NhdGlvbi5uYW1lLCB0eXBlLCBuZXdFbHQpO1xuICAgICAgICAgICAgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgICAgICAgICAgc3Bhd24uaWQgPSAweDMwIHwgbmV3RWx0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgJHtsb2NhdGlvbi5uYW1lfSAke3R5cGV9ID0+ICR7ZWx0fWApO1xuICAgICAgICAgICAgaWYgKCFmb3VuZCAmJiByb20uc3BvaWxlcikge1xuICAgICAgICAgICAgICByb20uc3BvaWxlci5hZGRXYWxsKGxvY2F0aW9uLm5hbWUsIHR5cGUsIGVsdCk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICAgICAgICAgIHNwYXduLmlkID0gdHlwZSA8PCA0IHwgZWx0O1xuICAgICAgICAgICAgbG9jYXRpb24udGlsZVBhbGV0dGVzWzJdID0gcGFsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzaHVmZmxlTXVzaWMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBpZiAoIWZsYWdzLnJhbmRvbWl6ZU11c2ljKCkpIHJldHVybjtcbiAgaW50ZXJmYWNlIEhhc011c2ljIHsgYmdtOiBudW1iZXI7IH1cbiAgY2xhc3MgQm9zc011c2ljIGltcGxlbWVudHMgSGFzTXVzaWMge1xuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGFkZHI6IG51bWJlcikge31cbiAgICBnZXQgYmdtKCkgeyByZXR1cm4gcm9tLnByZ1t0aGlzLmFkZHJdOyB9XG4gICAgc2V0IGJnbSh4KSB7IHJvbS5wcmdbdGhpcy5hZGRyXSA9IHg7IH1cbiAgICBwYXJ0aXRpb24oKTogUGFydGl0aW9uIHsgcmV0dXJuIFtbdGhpc10sIHRoaXMuYmdtXTsgfVxuICB9XG4gIHR5cGUgUGFydGl0aW9uID0gW0hhc011c2ljW10sIG51bWJlcl07XG4gIGNvbnN0IGJvc3NBZGRyID0gW1xuICAgIDB4MWU0YjgsIC8vIHZhbXBpcmUgMVxuICAgIDB4MWU2OTAsIC8vIGluc2VjdFxuICAgIDB4MWU5OWIsIC8vIGtlbGJlc3F1ZVxuICAgIDB4MWVjYjEsIC8vIHNhYmVyYVxuICAgIDB4MWVlMGYsIC8vIG1hZG9cbiAgICAweDFlZjgzLCAvLyBrYXJtaW5lXG4gICAgMHgxZjE4NywgLy8gZHJheWdvbiAxXG4gICAgMHgxZjMxMSwgLy8gZHJheWdvbiAyXG4gICAgMHgzN2MzMCwgLy8gZHluYVxuICBdO1xuICBjb25zdCBwYXJ0aXRpb25zID1cbiAgICAgIHJvbS5sb2NhdGlvbnMucGFydGl0aW9uKChsb2M6IExvY2F0aW9uKSA9PiBsb2MuaWQgIT09IDB4NWYgPyBsb2MuYmdtIDogMClcbiAgICAgICAgICAuZmlsdGVyKChsOiBQYXJ0aXRpb24pID0+IGxbMV0pOyAvLyBmaWx0ZXIgb3V0IHN0YXJ0IGFuZCBkeW5hXG5cbiAgY29uc3QgcGVhY2VmdWw6IFBhcnRpdGlvbltdID0gW107XG4gIGNvbnN0IGhvc3RpbGU6IFBhcnRpdGlvbltdID0gW107XG4gIGNvbnN0IGJvc3NlczogUGFydGl0aW9uW10gPSBib3NzQWRkci5tYXAoYSA9PiBuZXcgQm9zc011c2ljKGEpLnBhcnRpdGlvbigpKTtcblxuICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydGl0aW9ucykge1xuICAgIGxldCBtb25zdGVycyA9IDA7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgcGFydFswXSkge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkgbW9uc3RlcnMrKztcbiAgICAgIH1cbiAgICB9XG4gICAgKG1vbnN0ZXJzID49IHBhcnRbMF0ubGVuZ3RoID8gaG9zdGlsZSA6IHBlYWNlZnVsKS5wdXNoKHBhcnQpO1xuICB9XG4gIGNvbnN0IGV2ZW5XZWlnaHQ6IGJvb2xlYW4gPSB0cnVlO1xuICBjb25zdCBleHRyYU11c2ljOiBib29sZWFuID0gZmFsc2U7XG4gIGZ1bmN0aW9uIHNodWZmbGUocGFydHM6IFBhcnRpdGlvbltdKSB7XG4gICAgY29uc3QgdmFsdWVzID0gcGFydHMubWFwKCh4OiBQYXJ0aXRpb24pID0+IHhbMV0pO1xuXG4gICAgaWYgKGV2ZW5XZWlnaHQpIHtcbiAgICAgIGNvbnN0IHVzZWQgPSBbLi4ubmV3IFNldCh2YWx1ZXMpXTtcbiAgICAgIGlmIChleHRyYU11c2ljKSB1c2VkLnB1c2goMHg5LCAweGEsIDB4YiwgMHgxYSwgMHgxYywgMHgxZCk7XG4gICAgICBmb3IgKGNvbnN0IFtsb2NzXSBvZiBwYXJ0cykge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHVzZWRbcmFuZG9tLm5leHRJbnQodXNlZC5sZW5ndGgpXTtcbiAgICAgICAgZm9yIChjb25zdCBsb2Mgb2YgbG9jcykge1xuICAgICAgICAgIGxvYy5iZ20gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJhbmRvbS5zaHVmZmxlKHZhbHVlcyk7XG4gICAgZm9yIChjb25zdCBbbG9jc10gb2YgcGFydHMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdmFsdWVzLnBvcCgpITtcbiAgICAgIGZvciAoY29uc3QgbG9jIG9mIGxvY3MpIHtcbiAgICAgICAgbG9jLmJnbSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBzaHVmZmxlKHBlYWNlZnVsKTtcbiAgLy8gc2h1ZmZsZShob3N0aWxlKTtcbiAgLy8gc2h1ZmZsZShib3NzZXMpO1xuXG4gIHNodWZmbGUoWy4uLnBlYWNlZnVsLCAuLi5ob3N0aWxlLCAuLi5ib3NzZXNdKTtcblxuICAvLyBUT0RPIC0gY29uc2lkZXIgYWxzbyBzaHVmZmxpbmcgU0ZYP1xuICAvLyAgLSBlLmcuIGZsYWlsIGd1eSBjb3VsZCBtYWtlIHRoZSBmbGFtZSBzb3VuZD9cbn1cblxuZnVuY3Rpb24gc2h1ZmZsZVdpbGRXYXJwKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGNvbnN0IGxvY2F0aW9uczogTG9jYXRpb25bXSA9IFtdO1xuICBmb3IgKGNvbnN0IGwgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmIChsICYmIGwudXNlZCAmJiBsLmlkICYmICFsLmV4dGVuZGVkICYmIChsLmlkICYgMHhmOCkgIT09IDB4NTgpIHtcbiAgICAgIGxvY2F0aW9ucy5wdXNoKGwpO1xuICAgIH1cbiAgfVxuICByYW5kb20uc2h1ZmZsZShsb2NhdGlvbnMpO1xuICByb20ud2lsZFdhcnAubG9jYXRpb25zID0gW107XG4gIGZvciAoY29uc3QgbG9jIG9mIFsuLi5sb2NhdGlvbnMuc2xpY2UoMCwgMTUpLnNvcnQoKGEsIGIpID0+IGEuaWQgLSBiLmlkKV0pIHtcbiAgICByb20ud2lsZFdhcnAubG9jYXRpb25zLnB1c2gobG9jLmlkKTtcbiAgICBpZiAocm9tLnNwb2lsZXIpIHJvbS5zcG9pbGVyLmFkZFdpbGRXYXJwKGxvYy5pZCwgbG9jLm5hbWUpO1xuICB9XG4gIHJvbS53aWxkV2FycC5sb2NhdGlvbnMucHVzaCgwKTtcbn1cblxuZnVuY3Rpb24gYnVmZkR5bmEocm9tOiBSb20sIF9mbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICByb20ub2JqZWN0c1sweGI4XS5jb2xsaXNpb25QbGFuZSA9IDE7XG4gIHJvbS5vYmplY3RzWzB4YjhdLmltbW9iaWxlID0gdHJ1ZTtcbiAgcm9tLm9iamVjdHNbMHhiOV0uY29sbGlzaW9uUGxhbmUgPSAxO1xuICByb20ub2JqZWN0c1sweGI5XS5pbW1vYmlsZSA9IHRydWU7XG4gIHJvbS5vYmplY3RzWzB4MzNdLmNvbGxpc2lvblBsYW5lID0gMjtcbiAgcm9tLmFkSG9jU3Bhd25zWzB4MjhdLnNsb3RSYW5nZUxvd2VyID0gMHgxYzsgLy8gY291bnRlclxuICByb20uYWRIb2NTcGF3bnNbMHgyOV0uc2xvdFJhbmdlVXBwZXIgPSAweDFjOyAvLyBsYXNlclxuICByb20uYWRIb2NTcGF3bnNbMHgyYV0uc2xvdFJhbmdlVXBwZXIgPSAweDFjOyAvLyBidWJibGVcbn1cblxuZnVuY3Rpb24gYmxhY2tvdXRNb2RlKHJvbTogUm9tKSB7XG4gIGNvbnN0IGRnID0gZ2VuZXJhdGVEZXBncmFwaCgpO1xuICBmb3IgKGNvbnN0IG5vZGUgb2YgZGcubm9kZXMpIHtcbiAgICBjb25zdCB0eXBlID0gKG5vZGUgYXMgYW55KS50eXBlO1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAnTG9jYXRpb24nICYmICh0eXBlID09PSAnY2F2ZScgfHwgdHlwZSA9PT0gJ2ZvcnRyZXNzJykpIHtcbiAgICAgIHJvbS5sb2NhdGlvbnNbKG5vZGUgYXMgYW55KS5pZF0udGlsZVBhbGV0dGVzLmZpbGwoMHg5YSk7XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHN0b3J5TW9kZSA9IChyb206IFJvbSkgPT4ge1xuICAvLyBzaHVmZmxlIGhhcyBhbHJlYWR5IGhhcHBlbmVkLCBuZWVkIHRvIHVzZSBzaHVmZmxlZCBmbGFncyBmcm9tXG4gIC8vIE5QQyBzcGF3biBjb25kaXRpb25zLi4uXG4gIGNvbnN0IGNvbmRpdGlvbnMgPSBbXG4gICAgLy8gTm90ZTogaWYgYm9zc2VzIGFyZSBzaHVmZmxlZCB3ZSdsbCBuZWVkIHRvIGRldGVjdCB0aGlzLi4uXG4gICAgfnJvbS5ucGNzWzB4YzJdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHgyOCkhWzBdLCAvLyBLZWxiZXNxdWUgMVxuICAgIH5yb20ubnBjc1sweDg0XS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4NmUpIVswXSwgLy8gU2FiZXJhIDFcbiAgICB+cm9tLnRyaWdnZXIoMHg5YSkuY29uZGl0aW9uc1sxXSwgLy8gTWFkbyAxXG4gICAgfnJvbS5ucGNzWzB4YzVdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhhOSkhWzBdLCAvLyBLZWxiZXNxdWUgMlxuICAgIH5yb20ubnBjc1sweGM2XS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YWMpIVswXSwgLy8gU2FiZXJhIDJcbiAgICB+cm9tLm5wY3NbMHhjN10uc3Bhd25Db25kaXRpb25zLmdldCgweGI5KSFbMF0sIC8vIE1hZG8gMlxuICAgIH5yb20ubnBjc1sweGM4XS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YjYpIVswXSwgLy8gS2FybWluZVxuICAgIH5yb20ubnBjc1sweGNiXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4OWYpIVswXSwgLy8gRHJheWdvbiAxXG4gICAgMHgyMDAsIC8vIFN3b3JkIG9mIFdpbmRcbiAgICAweDIwMSwgLy8gU3dvcmQgb2YgRmlyZVxuICAgIDB4MjAyLCAvLyBTd29yZCBvZiBXYXRlclxuICAgIDB4MjAzLCAvLyBTd29yZCBvZiBUaHVuZGVyXG4gICAgLy8gVE9ETyAtIHN0YXR1ZXMgb2YgbW9vbiBhbmQgc3VuIG1heSBiZSByZWxldmFudCBpZiBlbnRyYW5jZSBzaHVmZmxlP1xuICAgIC8vIFRPRE8gLSB2YW1waXJlcyBhbmQgaW5zZWN0P1xuICBdO1xuICByb20ubnBjc1sweGNiXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YTYpIS5wdXNoKC4uLmNvbmRpdGlvbnMpO1xufTtcblxuLy8gU3RhbXAgdGhlIFJPTVxuZXhwb3J0IGZ1bmN0aW9uIHN0YW1wVmVyc2lvblNlZWRBbmRIYXNoKHJvbTogVWludDhBcnJheSwgc2VlZDogbnVtYmVyLCBmbGFnczogRmxhZ1NldCk6IG51bWJlciB7XG4gIC8vIFVzZSB1cCB0byAyNiBieXRlcyBzdGFydGluZyBhdCBQUkcgJDI1ZWE4XG4gIC8vIFdvdWxkIGJlIG5pY2UgdG8gc3RvcmUgKDEpIGNvbW1pdCwgKDIpIGZsYWdzLCAoMykgc2VlZCwgKDQpIGhhc2hcbiAgLy8gV2UgY2FuIHVzZSBiYXNlNjQgZW5jb2RpbmcgdG8gaGVscCBzb21lLi4uXG4gIC8vIEZvciBub3cganVzdCBzdGljayBpbiB0aGUgY29tbWl0IGFuZCBzZWVkIGluIHNpbXBsZSBoZXhcbiAgY29uc3QgY3JjID0gY3JjMzIocm9tKTtcbiAgY29uc3QgY3JjU3RyaW5nID0gY3JjLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IGhhc2ggPSB2ZXJzaW9uLlNUQVRVUyA9PT0gJ3Vuc3RhYmxlJyA/XG4gICAgICB2ZXJzaW9uLkhBU0guc3Vic3RyaW5nKDAsIDcpLnBhZFN0YXJ0KDcsICcwJykudG9VcHBlckNhc2UoKSArICcgICAgICcgOlxuICAgICAgdmVyc2lvbi5WRVJTSU9OLnN1YnN0cmluZygwLCAxMikucGFkRW5kKDEyLCAnICcpO1xuICBjb25zdCBzZWVkU3RyID0gc2VlZC50b1N0cmluZygxNikucGFkU3RhcnQoOCwgJzAnKS50b1VwcGVyQ2FzZSgpO1xuICBjb25zdCBlbWJlZCA9IChhZGRyOiBudW1iZXIsIHRleHQ6IHN0cmluZykgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgcm9tW2FkZHIgKyAweDEwICsgaV0gPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgfVxuICB9O1xuICBjb25zdCBpbnRlcmNhbGF0ZSA9IChzMTogc3RyaW5nLCBzMjogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBvdXQgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHMxLmxlbmd0aCB8fCBpIDwgczIubGVuZ3RoOyBpKyspIHtcbiAgICAgIG91dC5wdXNoKHMxW2ldIHx8ICcgJyk7XG4gICAgICBvdXQucHVzaChzMltpXSB8fCAnICcpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oJycpO1xuICB9O1xuXG4gIGVtYmVkKDB4Mjc3Y2YsIGludGVyY2FsYXRlKCcgIFZFUlNJT04gICAgIFNFRUQgICAgICAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgICAke2hhc2h9JHtzZWVkU3RyfWApKTtcbiAgbGV0IGZsYWdTdHJpbmcgPSBTdHJpbmcoZmxhZ3MpO1xuXG4gIC8vIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA+IDM2KSBmbGFnU3RyaW5nID0gZmxhZ1N0cmluZy5yZXBsYWNlKC8gL2csICcnKTtcbiAgbGV0IGV4dHJhRmxhZ3M7XG4gIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA+IDQ2KSB7XG4gICAgaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gOTIpIHRocm93IG5ldyBFcnJvcignRmxhZyBzdHJpbmcgd2F5IHRvbyBsb25nIScpO1xuICAgIGV4dHJhRmxhZ3MgPSBmbGFnU3RyaW5nLnN1YnN0cmluZyg0NiwgOTIpLnBhZEVuZCg0NiwgJyAnKTtcbiAgICBmbGFnU3RyaW5nID0gZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgNDYpO1xuICB9XG4gIC8vIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA8PSAzNikge1xuICAvLyAgIC8vIGF0dGVtcHQgdG8gYnJlYWsgaXQgbW9yZSBmYXZvcmFibHlcblxuICAvLyB9XG4gIC8vICAgZmxhZ1N0cmluZyA9IFsnRkxBR1MgJyxcbiAgLy8gICAgICAgICAgICAgICAgIGZsYWdTdHJpbmcuc3Vic3RyaW5nKDAsIDE4KS5wYWRFbmQoMTgsICcgJyksXG4gIC8vICAgICAgICAgICAgICAgICAnICAgICAgJyxcblxuICAvLyB9XG5cbiAgZmxhZ1N0cmluZyA9IGZsYWdTdHJpbmcucGFkRW5kKDQ2LCAnICcpO1xuXG4gIGVtYmVkKDB4Mjc3ZmYsIGludGVyY2FsYXRlKGZsYWdTdHJpbmcuc3Vic3RyaW5nKDAsIDIzKSwgZmxhZ1N0cmluZy5zdWJzdHJpbmcoMjMpKSk7XG4gIGlmIChleHRyYUZsYWdzKSB7XG4gICAgZW1iZWQoMHgyNzgyZiwgaW50ZXJjYWxhdGUoZXh0cmFGbGFncy5zdWJzdHJpbmcoMCwgMjMpLCBleHRyYUZsYWdzLnN1YnN0cmluZygyMykpKTtcbiAgfVxuXG4gIGVtYmVkKDB4Mjc4ODUsIGludGVyY2FsYXRlKGNyY1N0cmluZy5zdWJzdHJpbmcoMCwgNCksIGNyY1N0cmluZy5zdWJzdHJpbmcoNCkpKTtcblxuICAvLyBlbWJlZCgweDI1ZWE4LCBgdi4ke2hhc2h9ICAgJHtzZWVkfWApO1xuICBlbWJlZCgweDI1NzE2LCAnUkFORE9NSVpFUicpO1xuICBpZiAodmVyc2lvbi5TVEFUVVMgPT09ICd1bnN0YWJsZScpIGVtYmVkKDB4MjU3M2MsICdCRVRBJyk7XG4gIC8vIE5PVEU6IGl0IHdvdWxkIGJlIHBvc3NpYmxlIHRvIGFkZCB0aGUgaGFzaC9zZWVkL2V0YyB0byB0aGUgdGl0bGVcbiAgLy8gcGFnZSBhcyB3ZWxsLCBidXQgd2UnZCBuZWVkIHRvIHJlcGxhY2UgdGhlIHVudXNlZCBsZXR0ZXJzIGluIGJhbmtcbiAgLy8gJDFkIHdpdGggdGhlIG1pc3NpbmcgbnVtYmVycyAoSiwgUSwgVywgWCksIGFzIHdlbGwgYXMgdGhlIHR3b1xuICAvLyB3ZWlyZCBzcXVhcmVzIGF0ICQ1YiBhbmQgJDVjIHRoYXQgZG9uJ3QgYXBwZWFyIHRvIGJlIHVzZWQuICBUb2dldGhlclxuICAvLyB3aXRoIHVzaW5nIHRoZSBsZXR0ZXIgJ08nIGFzIDAsIHRoYXQncyBzdWZmaWNpZW50IHRvIGNyYW0gaW4gYWxsIHRoZVxuICAvLyBudW1iZXJzIGFuZCBkaXNwbGF5IGFyYml0cmFyeSBoZXggZGlnaXRzLlxuXG4gIHJldHVybiBjcmM7XG59O1xuXG5jb25zdCBwYXRjaEJ5dGVzID0gKHJvbTogVWludDhBcnJheSwgYWRkcmVzczogbnVtYmVyLCBieXRlczogbnVtYmVyW10pID0+IHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkrKykge1xuICAgIHJvbVthZGRyZXNzICsgaV0gPSBieXRlc1tpXTtcbiAgfVxufTtcblxuY29uc3QgcGF0Y2hXb3JkcyA9IChyb206IFVpbnQ4QXJyYXksIGFkZHJlc3M6IG51bWJlciwgd29yZHM6IG51bWJlcltdKSA9PiB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMiAqIHdvcmRzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcm9tW2FkZHJlc3MgKyBpXSA9IHdvcmRzW2kgPj4+IDFdICYgMHhmZjtcbiAgICByb21bYWRkcmVzcyArIGkgKyAxXSA9IHdvcmRzW2kgPj4+IDFdID4+PiA4O1xuICB9XG59O1xuXG4vLyBnb2VzIHdpdGggZW5lbXkgc3RhdCByZWNvbXB1dGF0aW9ucyBpbiBwb3N0c2h1ZmZsZS5zXG5jb25zdCB1cGRhdGVDb2luRHJvcHMgPSAocm9tOiBVaW50OEFycmF5LCBmbGFnczogRmxhZ1NldCkgPT4ge1xuICByb20gPSByb20uc3ViYXJyYXkoMHgxMCk7XG4gIGlmIChmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpKSB7XG4gICAgLy8gYmlnZ2VyIGdvbGQgZHJvcHMgaWYgbm8gc2hvcCBnbGl0Y2gsIHBhcnRpY3VsYXJseSBhdCB0aGUgc3RhcnRcbiAgICAvLyAtIHN0YXJ0cyBvdXQgZmlib25hY2NpLCB0aGVuIGdvZXMgbGluZWFyIGF0IDYwMFxuICAgIHBhdGNoV29yZHMocm9tLCAweDM0YmRlLCBbXG4gICAgICAgIDAsICAgNSwgIDEwLCAgMTUsICAyNSwgIDQwLCAgNjUsICAxMDUsXG4gICAgICAxNzAsIDI3NSwgNDQ1LCA2MDAsIDcwMCwgODAwLCA5MDAsIDEwMDAsXG4gICAgXSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gdGhpcyB0YWJsZSBpcyBiYXNpY2FsbHkgbWVhbmluZ2xlc3MgYi9jIHNob3AgZ2xpdGNoXG4gICAgcGF0Y2hXb3Jkcyhyb20sIDB4MzRiZGUsIFtcbiAgICAgICAgMCwgICAxLCAgIDIsICAgNCwgICA4LCAgMTYsICAzMCwgIDUwLFxuICAgICAgMTAwLCAyMDAsIDMwMCwgNDAwLCA1MDAsIDYwMCwgNzAwLCA4MDAsXG4gICAgXSk7XG4gIH1cbn07XG5cbi8vIGdvZXMgd2l0aCBlbmVteSBzdGF0IHJlY29tcHV0YXRpb25zIGluIHBvc3RzaHVmZmxlLnNcbmNvbnN0IHVwZGF0ZURpZmZpY3VsdHlTY2FsaW5nVGFibGVzID0gKHJvbTogVWludDhBcnJheSwgZmxhZ3M6IEZsYWdTZXQsIGFzbTogQXNzZW1ibGVyKSA9PiB7XG4gIHJvbSA9IHJvbS5zdWJhcnJheSgweDEwKTtcblxuICAvLyBDdXJyZW50bHkgdGhpcyBpcyB0aHJlZSAkMzAtYnl0ZSB0YWJsZXMsIHdoaWNoIHdlIHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmdcbiAgLy8gb2YgdGhlIHBvc3RzaHVmZmxlIENvbXB1dGVFbmVteVN0YXRzLlxuICBjb25zdCBkaWZmID0gc2VxKDQ4LCB4ID0+IHgpO1xuXG4gIC8vIFBBdGsgPSA1ICsgRGlmZiAqIDE1LzMyXG4gIC8vIERpZmZBdGsgdGFibGUgaXMgOCAqIFBBdGsgPSByb3VuZCg0MCArIChEaWZmICogMTUgLyA0KSlcbiAgcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZBdGsnKSxcbiAgICAgICAgICAgICBkaWZmLm1hcChkID0+IE1hdGgucm91bmQoNDAgKyBkICogMTUgLyA0KSkpO1xuXG4gIC8vIE5PVEU6IE9sZCBEaWZmRGVmIHRhYmxlICg0ICogUERlZikgd2FzIDEyICsgRGlmZiAqIDMsIGJ1dCB3ZSBubyBsb25nZXJcbiAgLy8gdXNlIHRoaXMgdGFibGUgc2luY2UgbmVyZmluZyBhcm1vcnMuXG4gIC8vIChQRGVmID0gMyArIERpZmYgKiAzLzQpXG4gIC8vIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmRGVmJyksXG4gIC8vICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiAxMiArIGQgKiAzKSk7XG5cbiAgLy8gTk9URTogVGhpcyBpcyB0aGUgYXJtb3ItbmVyZmVkIERpZmZEZWYgdGFibGUuXG4gIC8vIFBEZWYgPSAyICsgRGlmZiAvIDJcbiAgLy8gRGlmZkRlZiB0YWJsZSBpcyA0ICogUERlZiA9IDggKyBEaWZmICogMlxuICAvLyBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkRlZicpLFxuICAvLyAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gOCArIGQgKiAyKSk7XG5cbiAgLy8gTk9URTogRm9yIGFybW9yIGNhcCBhdCAzICogTHZsLCBzZXQgUERlZiA9IERpZmZcbiAgcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZEZWYnKSxcbiAgICAgICAgICAgICBkaWZmLm1hcChkID0+IGQgKiA0KSk7XG5cbiAgLy8gRGlmZkhQIHRhYmxlIGlzIFBIUCA9IG1pbigyNTUsIDQ4ICsgcm91bmQoRGlmZiAqIDExIC8gMikpXG4gIGNvbnN0IHBocFN0YXJ0ID0gZmxhZ3MuZGVjcmVhc2VFbmVteURhbWFnZSgpID8gMTYgOiA0ODtcbiAgY29uc3QgcGhwSW5jciA9IGZsYWdzLmRlY3JlYXNlRW5lbXlEYW1hZ2UoKSA/IDYgOiA1LjU7XG4gIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmSFAnKSxcbiAgICAgICAgICAgICBkaWZmLm1hcChkID0+IE1hdGgubWluKDI1NSwgcGhwU3RhcnQgKyBNYXRoLnJvdW5kKGQgKiBwaHBJbmNyKSkpKTtcblxuICAvLyBEaWZmRXhwIHRhYmxlIGlzIEV4cEIgPSBjb21wcmVzcyhmbG9vcig0ICogKDIgKiogKCgxNiArIDkgKiBEaWZmKSAvIDMyKSkpKVxuICAvLyB3aGVyZSBjb21wcmVzcyBtYXBzIHZhbHVlcyA+IDEyNyB0byAkODB8KHg+PjQpXG5cbiAgY29uc3QgZXhwRmFjdG9yID0gZmxhZ3MuZXhwU2NhbGluZ0ZhY3RvcigpO1xuICBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkV4cCcpLCBkaWZmLm1hcChkID0+IHtcbiAgICBjb25zdCBleHAgPSBNYXRoLmZsb29yKDQgKiAoMiAqKiAoKDE2ICsgOSAqIGQpIC8gMzIpKSAqIGV4cEZhY3Rvcik7XG4gICAgcmV0dXJuIGV4cCA8IDB4ODAgPyBleHAgOiBNYXRoLm1pbigweGZmLCAweDgwICsgKGV4cCA+PiA0KSk7XG4gIH0pKTtcblxuICAvLyAvLyBIYWx2ZSBzaGllbGQgYW5kIGFybW9yIGRlZmVuc2UgdmFsdWVzXG4gIC8vIHBhdGNoQnl0ZXMocm9tLCAweDM0YmMwLCBbXG4gIC8vICAgLy8gQXJtb3IgZGVmZW5zZVxuICAvLyAgIDAsIDEsIDMsIDUsIDcsIDksIDEyLCAxMCwgMTYsXG4gIC8vICAgLy8gU2hpZWxkIGRlZmVuc2VcbiAgLy8gICAwLCAxLCAzLCA0LCA2LCA5LCA4LCAxMiwgMTYsXG4gIC8vIF0pO1xuXG4gIC8vIEFkanVzdCBzaGllbGQgYW5kIGFybW9yIGRlZmVuc2UgdmFsdWVzXG4gIHBhdGNoQnl0ZXMocm9tLCAweDM0YmMwLCBbXG4gICAgLy8gQXJtb3IgZGVmZW5zZVxuICAgIDAsIDIsIDYsIDEwLCAxNCwgMTgsIDMyLCAyNCwgMjAsXG4gICAgLy8gU2hpZWxkIGRlZmVuc2VcbiAgICAwLCAyLCA2LCAxMCwgMTQsIDE4LCAxNiwgMzIsIDIwLFxuICBdKTtcbn07XG5cbmNvbnN0IHJlc2NhbGVTaG9wcyA9IChyb206IFJvbSwgYXNtOiBBc3NlbWJsZXIsIHJhbmRvbT86IFJhbmRvbSkgPT4ge1xuICAvLyBQb3B1bGF0ZSByZXNjYWxlZCBwcmljZXMgaW50byB0aGUgdmFyaW91cyByb20gbG9jYXRpb25zLlxuICAvLyBTcGVjaWZpY2FsbHksIHdlIHJlYWQgdGhlIGF2YWlsYWJsZSBpdGVtIElEcyBvdXQgb2YgdGhlXG4gIC8vIHNob3AgdGFibGVzIGFuZCB0aGVuIGNvbXB1dGUgbmV3IHByaWNlcyBmcm9tIHRoZXJlLlxuICAvLyBJZiBgcmFuZG9tYCBpcyBwYXNzZWQgdGhlbiB0aGUgYmFzZSBwcmljZSB0byBidXkgZWFjaFxuICAvLyBpdGVtIGF0IGFueSBnaXZlbiBzaG9wIHdpbGwgYmUgYWRqdXN0ZWQgdG8gYW55d2hlcmUgZnJvbVxuICAvLyA1MCUgdG8gMTUwJSBvZiB0aGUgYmFzZSBwcmljZS4gIFRoZSBwYXduIHNob3AgcHJpY2UgaXNcbiAgLy8gYWx3YXlzIDUwJSBvZiB0aGUgYmFzZSBwcmljZS5cblxuICByb20uc2hvcENvdW50ID0gMTE7IC8vIDExIG9mIGFsbCB0eXBlcyBvZiBzaG9wIGZvciBzb21lIHJlYXNvbi5cbiAgcm9tLnNob3BEYXRhVGFibGVzQWRkcmVzcyA9IGFzbS5leHBhbmQoJ1Nob3BEYXRhJyk7XG5cbiAgLy8gTk9URTogVGhpcyBpc24ndCBpbiB0aGUgUm9tIG9iamVjdCB5ZXQuLi5cbiAgd3JpdGVMaXR0bGVFbmRpYW4ocm9tLnByZywgYXNtLmV4cGFuZCgnSW5uQmFzZVByaWNlJyksIDIwKTtcblxuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKHNob3AudHlwZSA9PT0gU2hvcFR5cGUuUEFXTikgY29udGludWU7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNob3AucHJpY2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoc2hvcC5jb250ZW50c1tpXSA8IDB4ODApIHtcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSByYW5kb20gPyByYW5kb20ubmV4dE5vcm1hbCgxLCAwLjMsIDAuNSwgMS41KSA6IDE7XG4gICAgICB9IGVsc2UgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuSU5OKSB7XG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGp1c3Qgc2V0IHRoZSBvbmUgcHJpY2VcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSByYW5kb20gPyByYW5kb20ubmV4dE5vcm1hbCgxLCAwLjUsIDAuMzc1LCAxLjYyNSkgOiAxO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEFsc28gZmlsbCB0aGUgc2NhbGluZyB0YWJsZXMuXG4gIGNvbnN0IGRpZmYgPSBzZXEoNDgsIHggPT4geCk7XG4gIC8vIFRvb2wgc2hvcHMgc2NhbGUgYXMgMiAqKiAoRGlmZiAvIDEwKSwgc3RvcmUgaW4gOHRoc1xuICBwYXRjaEJ5dGVzKHJvbS5wcmcsIGFzbS5leHBhbmQoJ1Rvb2xTaG9wU2NhbGluZycpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg4ICogKDIgKiogKGQgLyAxMCkpKSkpO1xuICAvLyBBcm1vciBzaG9wcyBzY2FsZSBhcyAyICoqICgoNDcgLSBEaWZmKSAvIDEyKSwgc3RvcmUgaW4gOHRoc1xuICBwYXRjaEJ5dGVzKHJvbS5wcmcsIGFzbS5leHBhbmQoJ0FybW9yU2hvcFNjYWxpbmcnKSxcbiAgICAgICAgICAgICBkaWZmLm1hcChkID0+IE1hdGgucm91bmQoOCAqICgyICoqICgoNDcgLSBkKSAvIDEyKSkpKSk7XG5cbiAgLy8gU2V0IHRoZSBpdGVtIGJhc2UgcHJpY2VzLlxuICBmb3IgKGxldCBpID0gMHgwZDsgaSA8IDB4Mjc7IGkrKykge1xuICAgIHJvbS5pdGVtc1tpXS5iYXNlUHJpY2UgPSBCQVNFX1BSSUNFU1tpXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBzZXBhcmF0ZSBmbGFnIGZvciByZXNjYWxpbmcgbW9uc3RlcnM/Pz9cbn07XG5cbi8vIE1hcCBvZiBiYXNlIHByaWNlcy4gIChUb29scyBhcmUgcG9zaXRpdmUsIGFybW9ycyBhcmUgb25lcy1jb21wbGVtZW50LilcbmNvbnN0IEJBU0VfUFJJQ0VTOiB7W2l0ZW1JZDogbnVtYmVyXTogbnVtYmVyfSA9IHtcbiAgLy8gQXJtb3JzXG4gIDB4MGQ6IDQsICAgIC8vIGNhcmFwYWNlIHNoaWVsZFxuICAweDBlOiAxNiwgICAvLyBicm9uemUgc2hpZWxkXG4gIDB4MGY6IDUwLCAgIC8vIHBsYXRpbnVtIHNoaWVsZFxuICAweDEwOiAzMjUsICAvLyBtaXJyb3JlZCBzaGllbGRcbiAgMHgxMTogMTAwMCwgLy8gY2VyYW1pYyBzaGllbGRcbiAgMHgxMjogMjAwMCwgLy8gc2FjcmVkIHNoaWVsZFxuICAweDEzOiA0MDAwLCAvLyBiYXR0bGUgc2hpZWxkXG4gIDB4MTU6IDYsICAgIC8vIHRhbm5lZCBoaWRlXG4gIDB4MTY6IDIwLCAgIC8vIGxlYXRoZXIgYXJtb3JcbiAgMHgxNzogNzUsICAgLy8gYnJvbnplIGFybW9yXG4gIDB4MTg6IDI1MCwgIC8vIHBsYXRpbnVtIGFybW9yXG4gIDB4MTk6IDEwMDAsIC8vIHNvbGRpZXIgc3VpdFxuICAweDFhOiA0ODAwLCAvLyBjZXJhbWljIHN1aXRcbiAgLy8gVG9vbHNcbiAgMHgxZDogMjUsICAgLy8gbWVkaWNhbCBoZXJiXG4gIDB4MWU6IDMwLCAgIC8vIGFudGlkb3RlXG4gIDB4MWY6IDQ1LCAgIC8vIGx5c2lzIHBsYW50XG4gIDB4MjA6IDQwLCAgIC8vIGZydWl0IG9mIGxpbWVcbiAgMHgyMTogMzYsICAgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgMHgyMjogMjAwLCAgLy8gbWFnaWMgcmluZ1xuICAweDIzOiAxNTAsICAvLyBmcnVpdCBvZiByZXB1blxuICAweDI0OiA4MCwgICAvLyB3YXJwIGJvb3RzXG4gIDB4MjY6IDMwMCwgIC8vIG9wZWwgc3RhdHVlXG4gIC8vIDB4MzE6IDUwLCAvLyBhbGFybSBmbHV0ZVxufTtcblxuLy8vLy8vLy8vXG4vLy8vLy8vLy9cbi8vLy8vLy8vL1xuXG5mdW5jdGlvbiByZXNjYWxlTW9uc3RlcnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuXG4gIC8vIFRPRE8gLSBmaW5kIGFueXRoaW5nIHNoYXJpbmcgdGhlIHNhbWUgbWVtb3J5IGFuZCB1cGRhdGUgdGhlbSBhcyB3ZWxsXG4gIGNvbnN0IHVuc2NhbGVkTW9uc3RlcnMgPVxuICAgICAgbmV3IFNldDxudW1iZXI+KHNlcSgweDEwMCwgeCA9PiB4KS5maWx0ZXIocyA9PiBzIGluIHJvbS5vYmplY3RzKSk7XG4gIGZvciAoY29uc3QgW2lkXSBvZiBTQ0FMRURfTU9OU1RFUlMpIHtcbiAgICB1bnNjYWxlZE1vbnN0ZXJzLmRlbGV0ZShpZCk7XG4gIH1cbiAgZm9yIChjb25zdCBbaWQsIG1vbnN0ZXJdIG9mIFNDQUxFRF9NT05TVEVSUykge1xuICAgIGZvciAoY29uc3Qgb3RoZXIgb2YgdW5zY2FsZWRNb25zdGVycykge1xuICAgICAgaWYgKHJvbS5vYmplY3RzW2lkXS5iYXNlID09PSByb20ub2JqZWN0c1tvdGhlcl0uYmFzZSkge1xuICAgICAgICBTQ0FMRURfTU9OU1RFUlMuc2V0KG90aGVyLCBtb25zdGVyKTtcbiAgICAgICAgdW5zY2FsZWRNb25zdGVycy5kZWxldGUoaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEZsYWlscyAoZjksIGZhKSBhbmQgU2FiZXJhIDIncyBmaXJlYmFsbHMgKGM4KSBzaG91bGQgYmUgcHJvamVjdGlsZXMuXG4gIC8vIE1vcmVvdmVyLCBmb3Igc29tZSB3ZWlyZCByZWFzb24gdGhleSdyZSBzZXQgdXAgdG8gY2F1c2UgcGFyYWx5c2lzLCBzb1xuICAvLyBsZXQncyBmaXggdGhhdCwgdG9vLlxuICBmb3IgKGNvbnN0IG9iaiBvZiBbMHhjOCwgMHhmOSwgMHhmYV0pIHtcbiAgICAvLyBOT1RFOiBmbGFpbHMgbmVlZCBhdHRhY2t0eXBlICRmZSwgbm90ICRmZlxuICAgIHJvbS5vYmplY3RzW29ial0uYXR0YWNrVHlwZSA9IG9iaiA+IDB4ZjAgPyAweGZlIDogMHhmZjtcbiAgICByb20ub2JqZWN0c1tvYmpdLnN0YXR1c0VmZmVjdCA9IDA7XG4gIH1cbiAgLy8gRml4IFNhYmVyYSAxJ3MgZWxlbWVudGFsIGRlZmVuc2UgdG8gbm8gbG9uZ2VyIGFsbG93IHRodW5kZXJcbiAgcm9tLm9iamVjdHNbMHg3ZF0uZWxlbWVudHMgfD0gMHgwODtcblxuICBjb25zdCBCT1NTRVMgPSBuZXcgU2V0KFsweDU3LCAweDVlLCAweDY4LCAweDdkLCAweDg4LCAweDk3LCAweDliLCAweDllXSk7XG4gIGNvbnN0IFNMSU1FUyA9IG5ldyBTZXQoWzB4NTAsIDB4NTMsIDB4NWYsIDB4NjldKTtcbiAgZm9yIChjb25zdCBbaWQsIHtzZGVmLCBzd3JkLCBoaXRzLCBzYXRrLCBkZ2xkLCBzZXhwfV0gb2YgU0NBTEVEX01PTlNURVJTKSB7XG4gICAgLy8gaW5kaWNhdGUgdGhhdCB0aGlzIG9iamVjdCBuZWVkcyBzY2FsaW5nXG4gICAgY29uc3QgbyA9IHJvbS5vYmplY3RzW2lkXS5kYXRhO1xuICAgIGNvbnN0IGJvc3MgPSBCT1NTRVMuaGFzKGlkKSA/IDEgOiAwO1xuICAgIG9bMl0gfD0gMHg4MDsgLy8gcmVjb2lsXG4gICAgb1s2XSA9IGhpdHM7IC8vIEhQXG4gICAgb1s3XSA9IHNhdGs7ICAvLyBBVEtcbiAgICAvLyBTd29yZDogMC4uMyAod2luZCAtIHRodW5kZXIpIHByZXNlcnZlZCwgNCAoY3J5c3RhbGlzKSA9PiA3XG4gICAgb1s4XSA9IHNkZWYgfCBzd3JkIDw8IDQ7IC8vIERFRlxuICAgIC8vIE5PVEU6IGxvbmcgYWdvIHdlIHN0b3JlZCB3aGV0aGVyIHRoaXMgd2FzIGEgYm9zcyBpbiB0aGUgbG93ZXN0XG4gICAgLy8gYml0IG9mIHRoZSBub3ctdW51c2VkIExFVkVMLiBzbyB0aGF0IHdlIGNvdWxkIGluY3JlYXNlIHNjYWxpbmdcbiAgICAvLyBvbiBraWxsaW5nIHRoZW0sIGJ1dCBub3cgdGhhdCBzY2FsaW5nIGlzIHRpZWQgdG8gaXRlbXMsIHRoYXQnc1xuICAgIC8vIG5vIGxvbmdlciBuZWVkZWQgLSB3ZSBjb3VsZCBjby1vcHQgdGhpcyB0byBpbnN0ZWFkIHN0b3JlIHVwcGVyXG4gICAgLy8gYml0cyBvZiBIUCAob3IgcG9zc2libHkgbG93ZXIgYml0cyBzbyB0aGF0IEhQLWJhc2VkIGVmZmVjdHNcbiAgICAvLyBzdGlsbCB3b3JrIGNvcnJlY3RseSkuXG4gICAgLy8gb1s5XSA9IG9bOV0gJiAweGUwO1xuICAgIG9bMTZdID0gb1sxNl0gJiAweDBmIHwgZGdsZCA8PCA0OyAvLyBHTERcbiAgICBvWzE3XSA9IHNleHA7IC8vIEVYUFxuXG4gICAgaWYgKGJvc3MgPyBmbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgOiBmbGFncy5zaHVmZmxlTW9uc3RlckVsZW1lbnRzKCkpIHtcbiAgICAgIGlmICghU0xJTUVTLmhhcyhpZCkpIHtcbiAgICAgICAgY29uc3QgYml0cyA9IFsuLi5yb20ub2JqZWN0c1tpZF0uZWxlbWVudHMudG9TdHJpbmcoMikucGFkU3RhcnQoNCwgJzAnKV07XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKGJpdHMpO1xuICAgICAgICByb20ub2JqZWN0c1tpZF0uZWxlbWVudHMgPSBOdW1iZXIucGFyc2VJbnQoYml0cy5qb2luKCcnKSwgMik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gaGFuZGxlIHNsaW1lcyBhbGwgYXQgb25jZVxuICBpZiAoZmxhZ3Muc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpKSB7XG4gICAgLy8gcGljayBhbiBlbGVtZW50IGZvciBzbGltZSBkZWZlbnNlXG4gICAgY29uc3QgZSA9IHJhbmRvbS5uZXh0SW50KDQpO1xuICAgIHJvbS5wcmdbMHgzNTIyZF0gPSBlICsgMTtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIFNMSU1FUykge1xuICAgICAgcm9tLm9iamVjdHNbaWRdLmVsZW1lbnRzID0gMSA8PCBlO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJvbS53cml0ZU9iamVjdERhdGEoKTtcbn07XG5cbmNvbnN0IHNodWZmbGVNb25zdGVycyA9IChyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKSA9PiB7XG4gIC8vIFRPRE86IG9uY2Ugd2UgaGF2ZSBsb2NhdGlvbiBuYW1lcywgY29tcGlsZSBhIHNwb2lsZXIgb2Ygc2h1ZmZsZWQgbW9uc3RlcnNcbiAgY29uc3QgZ3JhcGhpY3MgPSBuZXcgR3JhcGhpY3Mocm9tKTtcbiAgLy8gKHdpbmRvdyBhcyBhbnkpLmdyYXBoaWNzID0gZ3JhcGhpY3M7XG4gIGlmIChmbGFncy5zaHVmZmxlU3ByaXRlUGFsZXR0ZXMoKSkgZ3JhcGhpY3Muc2h1ZmZsZVBhbGV0dGVzKHJhbmRvbSk7XG4gIGNvbnN0IHBvb2wgPSBuZXcgTW9uc3RlclBvb2woZmxhZ3MsIHt9KTtcbiAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmIChsb2MudXNlZCkgcG9vbC5wb3B1bGF0ZShsb2MpO1xuICB9XG4gIHBvb2wuc2h1ZmZsZShyYW5kb20sIGdyYXBoaWNzKTtcbn07XG5cbmNvbnN0IGlkZW50aWZ5S2V5SXRlbXNGb3JEaWZmaWN1bHR5QnVmZnMgPSAocm9tOiBSb20pID0+IHtcbiAgLy8gLy8gVGFnIGtleSBpdGVtcyBmb3IgZGlmZmljdWx0eSBidWZmc1xuICAvLyBmb3IgKGNvbnN0IGdldCBvZiByb20uaXRlbUdldHMpIHtcbiAgLy8gICBjb25zdCBpdGVtID0gSVRFTVMuZ2V0KGdldC5pdGVtSWQpO1xuICAvLyAgIGlmICghaXRlbSB8fCAhaXRlbS5rZXkpIGNvbnRpbnVlO1xuICAvLyAgIGdldC5rZXkgPSB0cnVlO1xuICAvLyB9XG4gIC8vIC8vIGNvbnNvbGUubG9nKHJlcG9ydCk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMHg0OTsgaSsrKSB7XG4gICAgLy8gTk9URSAtIHNwZWNpYWwgaGFuZGxpbmcgZm9yIGFsYXJtIGZsdXRlIHVudGlsIHdlIHByZS1wYXRjaFxuICAgIGNvbnN0IHVuaXF1ZSA9IChyb20ucHJnWzB4MjBmZjAgKyBpXSAmIDB4NDApIHx8IGkgPT09IDB4MzE7XG4gICAgY29uc3QgYml0ID0gMSA8PCAoaSAmIDcpO1xuICAgIGNvbnN0IGFkZHIgPSAweDFlMTEwICsgKGkgPj4+IDMpO1xuICAgIHJvbS5wcmdbYWRkcl0gPSByb20ucHJnW2FkZHJdICYgfmJpdCB8ICh1bmlxdWUgPyBiaXQgOiAwKTtcbiAgfVxufTtcblxuaW50ZXJmYWNlIE1vbnN0ZXJEYXRhIHtcbiAgaWQ6IG51bWJlcjtcbiAgdHlwZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHNkZWY6IG51bWJlcjtcbiAgc3dyZDogbnVtYmVyO1xuICBoaXRzOiBudW1iZXI7XG4gIHNhdGs6IG51bWJlcjtcbiAgZGdsZDogbnVtYmVyO1xuICBzZXhwOiBudW1iZXI7XG59XG5cbi8qIHRzbGludDpkaXNhYmxlOnRyYWlsaW5nLWNvbW1hIHdoaXRlc3BhY2UgKi9cbmNvbnN0IFNDQUxFRF9NT05TVEVSUzogTWFwPG51bWJlciwgTW9uc3RlckRhdGE+ID0gbmV3IE1hcChbXG4gIC8vIElEICBUWVBFICBOQU1FICAgICAgICAgICAgICAgICAgICAgICBTREVGIFNXUkQgSElUUyBTQVRLIERHTEQgU0VYUFxuICBbMHgzZiwgJ3AnLCAnU29yY2Vyb3Igc2hvdCcsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTksICAsICAgICxdLFxuICBbMHg0YiwgJ20nLCAnd3JhaXRoPz8nLCAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDIsICAgMjIsICA0LCAgIDYxXSxcbiAgWzB4NGYsICdtJywgJ3dyYWl0aCcsICAgICAgICAgICAgICAgICAgICAgMSwgICwgICAyLCAgIDIwLCAgNCwgICA2MV0sXG4gIFsweDUwLCAnbScsICdCbHVlIFNsaW1lJywgICAgICAgICAgICAgICAgICwgICAsICAgMSwgICAxNiwgIDIsICAgMzJdLFxuICBbMHg1MSwgJ20nLCAnV2VyZXRpZ2VyJywgICAgICAgICAgICAgICAgICAsICAgLCAgIDEsICAgMjEsICA0LCAgIDQwXSxcbiAgWzB4NTIsICdtJywgJ0dyZWVuIEplbGx5JywgICAgICAgICAgICAgICAgNCwgICwgICAzLCAgIDE2LCAgNCwgICAzNl0sXG4gIFsweDUzLCAnbScsICdSZWQgU2xpbWUnLCAgICAgICAgICAgICAgICAgIDYsICAsICAgNCwgICAxNiwgIDQsICAgNDhdLFxuICBbMHg1NCwgJ20nLCAnUm9jayBHb2xlbScsICAgICAgICAgICAgICAgICA2LCAgLCAgIDExLCAgMjQsICA2LCAgIDg1XSxcbiAgWzB4NTUsICdtJywgJ0JsdWUgQmF0JywgICAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDQsICAgLCAgICAzMl0sXG4gIFsweDU2LCAnbScsICdHcmVlbiBXeXZlcm4nLCAgICAgICAgICAgICAgIDQsICAsICAgNCwgICAyNCwgIDYsICAgNTJdLFxuICBbMHg1NywgJ2InLCAnVmFtcGlyZScsICAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDEyLCAgMTgsICAsICAgICxdLFxuICBbMHg1OCwgJ20nLCAnT3JjJywgICAgICAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDQsICAgMjEsICA0LCAgIDU3XSxcbiAgWzB4NTksICdtJywgJ1JlZCBGbHlpbmcgU3dhbXAgSW5zZWN0JywgICAgMywgICwgICAxLCAgIDIxLCAgNCwgICA1N10sXG4gIFsweDVhLCAnbScsICdCbHVlIE11c2hyb29tJywgICAgICAgICAgICAgIDIsICAsICAgMSwgICAyMSwgIDQsICAgNDRdLFxuICBbMHg1YiwgJ20nLCAnU3dhbXAgVG9tYXRvJywgICAgICAgICAgICAgICAzLCAgLCAgIDIsICAgMzUsICA0LCAgIDUyXSxcbiAgWzB4NWMsICdtJywgJ0ZseWluZyBNZWFkb3cgSW5zZWN0JywgICAgICAgMywgICwgICAzLCAgIDIzLCAgNCwgICA4MV0sXG4gIFsweDVkLCAnbScsICdTd2FtcCBQbGFudCcsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAsICAgICwgICAgMzZdLFxuICBbMHg1ZSwgJ2InLCAnSW5zZWN0JywgICAgICAgICAgICAgICAgICAgICAsICAgMSwgIDgsICAgNiwgICAsICAgICxdLFxuICBbMHg1ZiwgJ20nLCAnTGFyZ2UgQmx1ZSBTbGltZScsICAgICAgICAgICA1LCAgLCAgIDMsICAgMjAsICA0LCAgIDUyXSxcbiAgWzB4NjAsICdtJywgJ0ljZSBab21iaWUnLCAgICAgICAgICAgICAgICAgNSwgICwgICA3LCAgIDE0LCAgNCwgICA1N10sXG4gIFsweDYxLCAnbScsICdHcmVlbiBMaXZpbmcgUm9jaycsICAgICAgICAgICwgICAsICAgMSwgICA5LCAgIDQsICAgMjhdLFxuICBbMHg2MiwgJ20nLCAnR3JlZW4gU3BpZGVyJywgICAgICAgICAgICAgICA0LCAgLCAgIDQsICAgMjIsICA0LCAgIDQ0XSxcbiAgWzB4NjMsICdtJywgJ1JlZC9QdXJwbGUgV3l2ZXJuJywgICAgICAgICAgMywgICwgICA0LCAgIDMwLCAgNCwgICA2NV0sXG4gIFsweDY0LCAnbScsICdEcmF5Z29uaWEgU29sZGllcicsICAgICAgICAgIDYsICAsICAgMTEsICAzNiwgIDQsICAgODldLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4NjUsICdtJywgJ0ljZSBFbnRpdHknLCAgICAgICAgICAgICAgICAgMywgICwgICAyLCAgIDI0LCAgNCwgICA1Ml0sXG4gIFsweDY2LCAnbScsICdSZWQgTGl2aW5nIFJvY2snLCAgICAgICAgICAgICwgICAsICAgMSwgICAxMywgIDQsICAgNDBdLFxuICBbMHg2NywgJ20nLCAnSWNlIEdvbGVtJywgICAgICAgICAgICAgICAgICA3LCAgMiwgIDExLCAgMjgsICA0LCAgIDgxXSxcbiAgWzB4NjgsICdiJywgJ0tlbGJlc3F1ZScsICAgICAgICAgICAgICAgICAgNCwgIDYsICAxMiwgIDI5LCAgLCAgICAsXSxcbiAgWzB4NjksICdtJywgJ0dpYW50IFJlZCBTbGltZScsICAgICAgICAgICAgNywgICwgICA0MCwgIDkwLCAgNCwgICAxMDJdLFxuICBbMHg2YSwgJ20nLCAnVHJvbGwnLCAgICAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDMsICAgMjQsICA0LCAgIDY1XSxcbiAgWzB4NmIsICdtJywgJ1JlZCBKZWxseScsICAgICAgICAgICAgICAgICAgMiwgICwgICAyLCAgIDE0LCAgNCwgICA0NF0sXG4gIFsweDZjLCAnbScsICdNZWR1c2EnLCAgICAgICAgICAgICAgICAgICAgIDMsICAsICAgNCwgICAzNiwgIDgsICAgNzddLFxuICBbMHg2ZCwgJ20nLCAnUmVkIENyYWInLCAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDEsICAgMjEsICA0LCAgIDQ0XSxcbiAgWzB4NmUsICdtJywgJ01lZHVzYSBIZWFkJywgICAgICAgICAgICAgICAgLCAgICwgICAxLCAgIDI5LCAgNCwgICAzNl0sXG4gIFsweDZmLCAnbScsICdFdmlsIEJpcmQnLCAgICAgICAgICAgICAgICAgICwgICAsICAgMiwgICAzMCwgIDYsICAgNjVdLFxuICBbMHg3MSwgJ20nLCAnUmVkL1B1cnBsZSBNdXNocm9vbScsICAgICAgICAzLCAgLCAgIDUsICAgMTksICA2LCAgIDY5XSxcbiAgWzB4NzIsICdtJywgJ1Zpb2xldCBFYXJ0aCBFbnRpdHknLCAgICAgICAgMywgICwgICAzLCAgIDE4LCAgNiwgICA2MV0sXG4gIFsweDczLCAnbScsICdNaW1pYycsICAgICAgICAgICAgICAgICAgICAgICwgICAsICAgMywgICAyNiwgIDE1LCAgNzNdLFxuICBbMHg3NCwgJ20nLCAnUmVkIFNwaWRlcicsICAgICAgICAgICAgICAgICAzLCAgLCAgIDQsICAgMjIsICA2LCAgIDQ4XSxcbiAgWzB4NzUsICdtJywgJ0Zpc2htYW4nLCAgICAgICAgICAgICAgICAgICAgNCwgICwgICA2LCAgIDE5LCAgNSwgICA2MV0sXG4gIFsweDc2LCAnbScsICdKZWxseWZpc2gnLCAgICAgICAgICAgICAgICAgICwgICAsICAgMywgICAxNCwgIDMsICAgNDhdLFxuICBbMHg3NywgJ20nLCAnS3Jha2VuJywgICAgICAgICAgICAgICAgICAgICA1LCAgLCAgIDExLCAgMjUsICA3LCAgIDczXSxcbiAgWzB4NzgsICdtJywgJ0RhcmsgR3JlZW4gV3l2ZXJuJywgICAgICAgICAgNCwgICwgICA1LCAgIDIxLCAgNSwgICA2MV0sXG4gIFsweDc5LCAnbScsICdTYW5kIE1vbnN0ZXInLCAgICAgICAgICAgICAgIDUsICAsICAgOCwgICA2LCAgIDQsICAgNTddLFxuICBbMHg3YiwgJ20nLCAnV3JhaXRoIFNoYWRvdyAxJywgICAgICAgICAgICAsICAgLCAgICwgICAgOSwgICA3LCAgIDQ0XSxcbiAgWzB4N2MsICdtJywgJ0tpbGxlciBNb3RoJywgICAgICAgICAgICAgICAgLCAgICwgICAyLCAgIDM1LCAgLCAgICA3N10sXG4gIFsweDdkLCAnYicsICdTYWJlcmEnLCAgICAgICAgICAgICAgICAgICAgIDMsICA3LCAgMTMsICAyNCwgICwgICAgLF0sXG4gIFsweDgwLCAnbScsICdEcmF5Z29uaWEgQXJjaGVyJywgICAgICAgICAgIDEsICAsICAgMywgICAyMCwgIDYsICAgNjFdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4ODEsICdtJywgJ0V2aWwgQm9tYmVyIEJpcmQnLCAgICAgICAgICAgLCAgICwgICAxLCAgIDE5LCAgNCwgICA2NV0sXG4gIFsweDgyLCAnbScsICdMYXZhbWFuL2Jsb2InLCAgICAgICAgICAgICAgIDMsICAsICAgMywgICAyNCwgIDYsICAgODVdLFxuICBbMHg4NCwgJ20nLCAnTGl6YXJkbWFuICh3LyBmbGFpbCgnLCAgICAgICAyLCAgLCAgIDMsICAgMzAsICA2LCAgIDgxXSxcbiAgWzB4ODUsICdtJywgJ0dpYW50IEV5ZScsICAgICAgICAgICAgICAgICAgMywgICwgICA1LCAgIDMzLCAgNCwgICA4MV0sXG4gIFsweDg2LCAnbScsICdTYWxhbWFuZGVyJywgICAgICAgICAgICAgICAgIDIsICAsICAgNCwgICAyOSwgIDgsICAgNzddLFxuICBbMHg4NywgJ20nLCAnU29yY2Vyb3InLCAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDUsICAgMzEsICA2LCAgIDY1XSxcbiAgWzB4ODgsICdiJywgJ01hZG8nLCAgICAgICAgICAgICAgICAgICAgICAgNCwgIDgsICAxMCwgIDMwLCAgLCAgICAsXSxcbiAgWzB4ODksICdtJywgJ0RyYXlnb25pYSBLbmlnaHQnLCAgICAgICAgICAgMiwgICwgICAzLCAgIDI0LCAgNCwgICA3N10sXG4gIFsweDhhLCAnbScsICdEZXZpbCcsICAgICAgICAgICAgICAgICAgICAgICwgICAsICAgMSwgICAxOCwgIDQsICAgNTJdLFxuICBbMHg4YiwgJ2InLCAnS2VsYmVzcXVlIDInLCAgICAgICAgICAgICAgICA0LCAgNiwgIDExLCAgMjcsICAsICAgICxdLFxuICBbMHg4YywgJ20nLCAnV3JhaXRoIFNoYWRvdyAyJywgICAgICAgICAgICAsICAgLCAgICwgICAgMTcsICA0LCAgIDQ4XSxcbiAgWzB4OTAsICdiJywgJ1NhYmVyYSAyJywgICAgICAgICAgICAgICAgICAgNSwgIDcsICAyMSwgIDI3LCAgLCAgICAsXSxcbiAgWzB4OTEsICdtJywgJ1RhcmFudHVsYScsICAgICAgICAgICAgICAgICAgMywgICwgICAzLCAgIDIxLCAgNiwgICA3M10sXG4gIFsweDkyLCAnbScsICdTa2VsZXRvbicsICAgICAgICAgICAgICAgICAgICwgICAsICAgNCwgICAzMCwgIDYsICAgNjldLFxuICBbMHg5MywgJ2InLCAnTWFkbyAyJywgICAgICAgICAgICAgICAgICAgICA0LCAgOCwgIDExLCAgMjUsICAsICAgICxdLFxuICBbMHg5NCwgJ20nLCAnUHVycGxlIEdpYW50IEV5ZScsICAgICAgICAgICA0LCAgLCAgIDEwLCAgMjMsICA2LCAgIDEwMl0sXG4gIFsweDk1LCAnbScsICdCbGFjayBLbmlnaHQgKHcvIGZsYWlsKScsICAgIDMsICAsICAgNywgICAyNiwgIDYsICAgODldLFxuICBbMHg5NiwgJ20nLCAnU2NvcnBpb24nLCAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDUsICAgMjksICAyLCAgIDczXSxcbiAgWzB4OTcsICdiJywgJ0thcm1pbmUnLCAgICAgICAgICAgICAgICAgICAgNCwgICwgICAxNCwgIDI2LCAgLCAgICAsXSxcbiAgWzB4OTgsICdtJywgJ1NhbmRtYW4vYmxvYicsICAgICAgICAgICAgICAgMywgICwgICA1LCAgIDM2LCAgNiwgICA5OF0sXG4gIFsweDk5LCAnbScsICdNdW1teScsICAgICAgICAgICAgICAgICAgICAgIDUsICAsICAgMTksICAzNiwgIDYsICAgMTEwXSxcbiAgWzB4OWEsICdtJywgJ1RvbWIgR3VhcmRpYW4nLCAgICAgICAgICAgICAgNywgICwgICA2MCwgIDM3LCAgNiwgICAxMDZdLFxuICBbMHg5YiwgJ2InLCAnRHJheWdvbicsICAgICAgICAgICAgICAgICAgICA1LCAgNiwgIDE2LCAgNDEsICAsICAgICxdLFxuICBbMHg5ZSwgJ2InLCAnRHJheWdvbiAyJywgICAgICAgICAgICAgICAgICA3LCAgNiwgIDI4LCAgNDAsICAsICAgICxdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4YTAsICdtJywgJ0dyb3VuZCBTZW50cnkgKDEpJywgICAgICAgICAgNCwgICwgICA2LCAgIDI2LCAgLCAgICA3M10sXG4gIFsweGExLCAnbScsICdUb3dlciBEZWZlbnNlIE1lY2ggKDIpJywgICAgIDUsICAsICAgOCwgICAzNiwgICwgICAgODVdLFxuICBbMHhhMiwgJ20nLCAnVG93ZXIgU2VudGluZWwnLCAgICAgICAgICAgICAsICAgLCAgIDEsICAgLCAgICAsICAgIDMyXSxcbiAgWzB4YTMsICdtJywgJ0FpciBTZW50cnknLCAgICAgICAgICAgICAgICAgMywgICwgICAyLCAgIDI2LCAgLCAgICA2NV0sXG4gIC8vIFsweGE0LCAnYicsICdEeW5hJywgICAgICAgICAgICAgICAgICAgICAgIDYsICA1LCAgMTYsICAsICAgICwgICAgLF0sXG4gIFsweGE1LCAnYicsICdWYW1waXJlIDInLCAgICAgICAgICAgICAgICAgIDMsICAsICAgMTIsICAyNywgICwgICAgLF0sXG4gIC8vIFsweGI0LCAnYicsICdkeW5hIHBvZCcsICAgICAgICAgICAgICAgICAgIDE1LCAsICAgMjU1LCAyNiwgICwgICAgLF0sXG4gIC8vIFsweGI4LCAncCcsICdkeW5hIGNvdW50ZXInLCAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNiwgICwgICAgLF0sXG4gIC8vIFsweGI5LCAncCcsICdkeW5hIGxhc2VyJywgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNiwgICwgICAgLF0sXG4gIC8vIFsweGJhLCAncCcsICdkeW5hIGJ1YmJsZScsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIFsweGE0LCAnYicsICdEeW5hJywgICAgICAgICAgICAgICAgICAgICAgIDYsICA1LCAgMzIsICAsICAgICwgICAgLF0sXG4gIFsweGI0LCAnYicsICdkeW5hIHBvZCcsICAgICAgICAgICAgICAgICAgIDYsICA1LCAgNDgsICAyNiwgICwgICAgLF0sXG4gIFsweGI4LCAncCcsICdkeW5hIGNvdW50ZXInLCAgICAgICAgICAgICAgMTUsICAsICAgLCAgICA0MiwgICwgICAgLF0sXG4gIFsweGI5LCAncCcsICdkeW5hIGxhc2VyJywgICAgICAgICAgICAgICAgMTUsICAsICAgLCAgICA0MiwgICwgICAgLF0sXG4gIFsweGJhLCAncCcsICdkeW5hIGJ1YmJsZScsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIC8vXG4gIFsweGJjLCAnbScsICd2YW1wMiBiYXQnLCAgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNiwgICwgICAgMTVdLFxuICBbMHhiZiwgJ3AnLCAnZHJheWdvbjIgZmlyZWJhbGwnLCAgICAgICAgICAsICAgLCAgICwgICAgMjYsICAsICAgICxdLFxuICBbMHhjMSwgJ20nLCAndmFtcDEgYmF0JywgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTYsICAsICAgIDE1XSxcbiAgWzB4YzMsICdwJywgJ2dpYW50IGluc2VjdCBzcGl0JywgICAgICAgICAgLCAgICwgICAsICAgIDM1LCAgLCAgICAsXSxcbiAgWzB4YzQsICdtJywgJ3N1bW1vbmVkIGluc2VjdCcsICAgICAgICAgICAgNCwgICwgICAyLCAgIDQyLCAgLCAgICA5OF0sXG4gIFsweGM1LCAncCcsICdrZWxieTEgcm9jaycsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyMiwgICwgICAgLF0sXG4gIFsweGM2LCAncCcsICdzYWJlcmExIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAxOSwgICwgICAgLF0sXG4gIFsweGM3LCAncCcsICdrZWxieTIgZmlyZWJhbGxzJywgICAgICAgICAgICwgICAsICAgLCAgICAxMSwgICwgICAgLF0sXG4gIFsweGM4LCAncCcsICdzYWJlcmEyIGZpcmUnLCAgICAgICAgICAgICAgICwgICAsICAgMSwgICA2LCAgICwgICAgLF0sXG4gIFsweGM5LCAncCcsICdzYWJlcmEyIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNywgICwgICAgLF0sXG4gIFsweGNhLCAncCcsICdrYXJtaW5lIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNSwgICwgICAgLF0sXG4gIFsweGNiLCAncCcsICdzdW4vbW9vbiBzdGF0dWUgZmlyZWJhbGxzJywgICwgICAsICAgLCAgICAzOSwgICwgICAgLF0sXG4gIFsweGNjLCAncCcsICdkcmF5Z29uMSBsaWdodG5pbmcnLCAgICAgICAgICwgICAsICAgLCAgICAzNywgICwgICAgLF0sXG4gIFsweGNkLCAncCcsICdkcmF5Z29uMiBsYXNlcicsICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIC8vIElEICBUWVBFICBOQU1FICAgICAgICAgICAgICAgICAgICAgICBTREVGIFNXUkQgSElUUyBTQVRLIERHTEQgU0VYUFxuICBbMHhjZSwgJ3AnLCAnZHJheWdvbjIgYnJlYXRoJywgICAgICAgICAgICAsICAgLCAgICwgICAgMzYsICAsICAgICxdLFxuICBbMHhlMCwgJ3AnLCAnZXZpbCBib21iZXIgYmlyZCBib21iJywgICAgICAsICAgLCAgICwgICAgMiwgICAsICAgICxdLFxuICBbMHhlMiwgJ3AnLCAnc3VtbW9uZWQgaW5zZWN0IGJvbWInLCAgICAgICAsICAgLCAgICwgICAgNDcsICAsICAgICxdLFxuICBbMHhlMywgJ3AnLCAncGFyYWx5c2lzIGJlYW0nLCAgICAgICAgICAgICAsICAgLCAgICwgICAgMjMsICAsICAgICxdLFxuICBbMHhlNCwgJ3AnLCAnc3RvbmUgZ2F6ZScsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzMsICAsICAgICxdLFxuICBbMHhlNSwgJ3AnLCAncm9jayBnb2xlbSByb2NrJywgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhlNiwgJ3AnLCAnY3Vyc2UgYmVhbScsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTAsICAsICAgICxdLFxuICBbMHhlNywgJ3AnLCAnbXAgZHJhaW4gd2ViJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTEsICAsICAgICxdLFxuICBbMHhlOCwgJ3AnLCAnZmlzaG1hbiB0cmlkZW50JywgICAgICAgICAgICAsICAgLCAgICwgICAgMTUsICAsICAgICxdLFxuICBbMHhlOSwgJ3AnLCAnb3JjIGF4ZScsICAgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhlYSwgJ3AnLCAnU3dhbXAgUG9sbGVuJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzcsICAsICAgICxdLFxuICBbMHhlYiwgJ3AnLCAncGFyYWx5c2lzIHBvd2RlcicsICAgICAgICAgICAsICAgLCAgICwgICAgMTcsICAsICAgICxdLFxuICBbMHhlYywgJ3AnLCAnZHJheWdvbmlhIHNvbGlkZXIgc3dvcmQnLCAgICAsICAgLCAgICwgICAgMjgsICAsICAgICxdLFxuICBbMHhlZCwgJ3AnLCAnaWNlIGdvbGVtIHJvY2snLCAgICAgICAgICAgICAsICAgLCAgICwgICAgMjAsICAsICAgICxdLFxuICBbMHhlZSwgJ3AnLCAndHJvbGwgYXhlJywgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjcsICAsICAgICxdLFxuICBbMHhlZiwgJ3AnLCAna3Jha2VuIGluaycsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhmMCwgJ3AnLCAnZHJheWdvbmlhIGFyY2hlciBhcnJvdycsICAgICAsICAgLCAgICwgICAgMTIsICAsICAgICxdLFxuICBbMHhmMSwgJ3AnLCAnPz8/IHVudXNlZCcsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTYsICAsICAgICxdLFxuICBbMHhmMiwgJ3AnLCAnZHJheWdvbmlhIGtuaWdodCBzd29yZCcsICAgICAsICAgLCAgICwgICAgOSwgICAsICAgICxdLFxuICBbMHhmMywgJ3AnLCAnbW90aCByZXNpZHVlJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTksICAsICAgICxdLFxuICBbMHhmNCwgJ3AnLCAnZ3JvdW5kIHNlbnRyeSBsYXNlcicsICAgICAgICAsICAgLCAgICwgICAgMTMsICAsICAgICxdLFxuICBbMHhmNSwgJ3AnLCAndG93ZXIgZGVmZW5zZSBtZWNoIGxhc2VyJywgICAsICAgLCAgICwgICAgMjMsICAsICAgICxdLFxuICBbMHhmNiwgJ3AnLCAndG93ZXIgc2VudGluZWwgbGFzZXInLCAgICAgICAsICAgLCAgICwgICAgOCwgICAsICAgICxdLFxuICBbMHhmNywgJ3AnLCAnc2tlbGV0b24gc2hvdCcsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTEsICAsICAgICxdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4ZjgsICdwJywgJ2xhdmFtYW4gc2hvdCcsICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE0LCAgLCAgICAsXSxcbiAgWzB4ZjksICdwJywgJ2JsYWNrIGtuaWdodCBmbGFpbCcsICAgICAgICAgLCAgICwgICAsICAgIDE4LCAgLCAgICAsXSxcbiAgWzB4ZmEsICdwJywgJ2xpemFyZG1hbiBmbGFpbCcsICAgICAgICAgICAgLCAgICwgICAsICAgIDIxLCAgLCAgICAsXSxcbiAgWzB4ZmMsICdwJywgJ21hZG8gc2h1cmlrZW4nLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDM2LCAgLCAgICAsXSxcbiAgWzB4ZmQsICdwJywgJ2d1YXJkaWFuIHN0YXR1ZSBtaXNzaWxlJywgICAgLCAgICwgICAsICAgIDIzLCAgLCAgICAsXSxcbiAgWzB4ZmUsICdwJywgJ2RlbW9uIHdhbGwgZmlyZScsICAgICAgICAgICAgLCAgICwgICAsICAgIDIzLCAgLCAgICAsXSxcbl0ubWFwKChbaWQsIHR5cGUsIG5hbWUsIHNkZWY9MCwgc3dyZD0wLCBoaXRzPTAsIHNhdGs9MCwgZGdsZD0wLCBzZXhwPTBdKSA9PlxuICAgICAgW2lkLCB7aWQsIHR5cGUsIG5hbWUsIHNkZWYsIHN3cmQsIGhpdHMsIHNhdGssIGRnbGQsIHNleHB9XSkpIGFzIGFueTtcblxuLyogdHNsaW50OmVuYWJsZTp0cmFpbGluZy1jb21tYSB3aGl0ZXNwYWNlICovXG5cbi8vIFdoZW4gZGVhbGluZyB3aXRoIGNvbnN0cmFpbnRzLCBpdCdzIGJhc2ljYWxseSBrc2F0XG4vLyAgLSB3ZSBoYXZlIGEgbGlzdCBvZiByZXF1aXJlbWVudHMgdGhhdCBhcmUgQU5EZWQgdG9nZXRoZXJcbi8vICAtIGVhY2ggaXMgYSBsaXN0IG9mIHByZWRpY2F0ZXMgdGhhdCBhcmUgT1JlZCB0b2dldGhlclxuLy8gIC0gZWFjaCBwcmVkaWNhdGUgaGFzIGEgY29udGludWF0aW9uIGZvciB3aGVuIGl0J3MgcGlja2VkXG4vLyAgLSBuZWVkIGEgd2F5IHRvIHRoaW4gdGhlIGNyb3dkLCBlZmZpY2llbnRseSBjaGVjayBjb21wYXQsIGV0Y1xuLy8gUHJlZGljYXRlIGlzIGEgZm91ci1lbGVtZW50IGFycmF5IFtwYXQwLHBhdDEscGFsMixwYWwzXVxuLy8gUmF0aGVyIHRoYW4gYSBjb250aW51YXRpb24gd2UgY291bGQgZ28gdGhyb3VnaCBhbGwgdGhlIHNsb3RzIGFnYWluXG5cbi8vIGNsYXNzIENvbnN0cmFpbnRzIHtcbi8vICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgLy8gQXJyYXkgb2YgcGF0dGVybiB0YWJsZSBvcHRpb25zLiAgTnVsbCBpbmRpY2F0ZXMgdGhhdCBpdCBjYW4gYmUgYW55dGhpbmcuXG4vLyAgICAgLy9cbi8vICAgICB0aGlzLnBhdHRlcm5zID0gW1tudWxsLCBudWxsXV07XG4vLyAgICAgdGhpcy5wYWxldHRlcyA9IFtbbnVsbCwgbnVsbF1dO1xuLy8gICAgIHRoaXMuZmx5ZXJzID0gMDtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVUcmVhc3VyZUNoZXN0KCkge1xuLy8gICAgIHRoaXMucmVxdWlyZU9yZGVyZWRTbG90KDAsIFRSRUFTVVJFX0NIRVNUX0JBTktTKTtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVPcmRlcmVkU2xvdChzbG90LCBzZXQpIHtcblxuLy8gICAgIGlmICghdGhpcy5vcmRlcmVkKSB7XG5cbi8vICAgICB9XG4vLyAvLyBUT0RPXG4vLyAgICAgdGhpcy5wYXQwID0gaW50ZXJzZWN0KHRoaXMucGF0MCwgc2V0KTtcblxuLy8gICB9XG5cbi8vIH1cblxuLy8gY29uc3QgaW50ZXJzZWN0ID0gKGxlZnQsIHJpZ2h0KSA9PiB7XG4vLyAgIGlmICghcmlnaHQpIHRocm93IG5ldyBFcnJvcigncmlnaHQgbXVzdCBiZSBub250cml2aWFsJyk7XG4vLyAgIGlmICghbGVmdCkgcmV0dXJuIHJpZ2h0O1xuLy8gICBjb25zdCBvdXQgPSBuZXcgU2V0KCk7XG4vLyAgIGZvciAoY29uc3QgeCBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0Lmhhcyh4KSkgb3V0LmFkZCh4KTtcbi8vICAgfVxuLy8gICByZXR1cm4gb3V0O1xuLy8gfVxuXG5pbnRlcmZhY2UgTW9uc3RlckNvbnN0cmFpbnQge1xuICBpZDogbnVtYmVyO1xuICBwYXQ6IG51bWJlcjtcbiAgcGFsMjogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwYWwzOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHBhdEJhbms6IG51bWJlciB8IHVuZGVmaW5lZDtcbn1cblxuLy8gQSBwb29sIG9mIG1vbnN0ZXIgc3Bhd25zLCBidWlsdCB1cCBmcm9tIHRoZSBsb2NhdGlvbnMgaW4gdGhlIHJvbS5cbi8vIFBhc3NlcyB0aHJvdWdoIHRoZSBsb2NhdGlvbnMgdHdpY2UsIGZpcnN0IHRvIGJ1aWxkIGFuZCB0aGVuIHRvXG4vLyByZWFzc2lnbiBtb25zdGVycy5cbmNsYXNzIE1vbnN0ZXJQb29sIHtcblxuICAvLyBhdmFpbGFibGUgbW9uc3RlcnNcbiAgcmVhZG9ubHkgbW9uc3RlcnM6IE1vbnN0ZXJDb25zdHJhaW50W10gPSBbXTtcbiAgLy8gdXNlZCBtb25zdGVycyAtIGFzIGEgYmFja3VwIGlmIG5vIGF2YWlsYWJsZSBtb25zdGVycyBmaXRcbiAgcmVhZG9ubHkgdXNlZDogTW9uc3RlckNvbnN0cmFpbnRbXSA9IFtdO1xuICAvLyBhbGwgbG9jYXRpb25zXG4gIHJlYWRvbmx5IGxvY2F0aW9uczoge2xvY2F0aW9uOiBMb2NhdGlvbiwgc2xvdHM6IG51bWJlcltdfVtdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBmbGFnczogRmxhZ1NldCxcbiAgICAgIHJlYWRvbmx5IHJlcG9ydDoge1tsb2M6IG51bWJlcl06IHN0cmluZ1tdLCBba2V5OiBzdHJpbmddOiAoc3RyaW5nfG51bWJlcilbXX0pIHt9XG5cbiAgLy8gVE9ETyAtIG1vbnN0ZXJzIHcvIHByb2plY3RpbGVzIG1heSBoYXZlIGEgc3BlY2lmaWMgYmFuayB0aGV5IG5lZWQgdG8gYXBwZWFyIGluLFxuICAvLyBzaW5jZSB0aGUgcHJvamVjdGlsZSBkb2Vzbid0IGtub3cgd2hlcmUgaXQgY2FtZSBmcm9tLi4uP1xuICAvLyAgIC0gZm9yIG5vdywganVzdCBhc3N1bWUgaWYgaXQgaGFzIGEgY2hpbGQgdGhlbiBpdCBtdXN0IGtlZXAgc2FtZSBwYXR0ZXJuIGJhbmshXG5cbiAgcG9wdWxhdGUobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgY29uc3Qge21heEZseWVycyA9IDAsXG4gICAgICAgICAgIG5vbkZseWVycyA9IHt9LFxuICAgICAgICAgICBza2lwID0gZmFsc2UsXG4gICAgICAgICAgIHRvd2VyID0gZmFsc2UsXG4gICAgICAgICAgIGZpeGVkU2xvdHMgPSB7fSxcbiAgICAgICAgICAgLi4udW5leHBlY3RlZH0gPSBNT05TVEVSX0FESlVTVE1FTlRTW2xvY2F0aW9uLmlkXSB8fCB7fTtcbiAgICBmb3IgKGNvbnN0IHUgb2YgT2JqZWN0LmtleXModW5leHBlY3RlZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5leHBlY3RlZCBwcm9wZXJ0eSAnJHt1fScgaW4gTU9OU1RFUl9BREpVU1RNRU5UU1ske2xvY2F0aW9uLmlkfV1gKTtcbiAgICB9XG4gICAgY29uc3Qgc2tpcE1vbnN0ZXJzID1cbiAgICAgICAgKHNraXAgPT09IHRydWUgfHxcbiAgICAgICAgICAgICghdGhpcy5mbGFncy5zaHVmZmxlVG93ZXJNb25zdGVycygpICYmIHRvd2VyKSB8fFxuICAgICAgICAgICAgIWxvY2F0aW9uLnNwcml0ZVBhdHRlcm5zIHx8XG4gICAgICAgICAgICAhbG9jYXRpb24uc3ByaXRlUGFsZXR0ZXMpO1xuICAgIGNvbnN0IG1vbnN0ZXJzID0gW107XG4gICAgbGV0IHNsb3RzID0gW107XG4gICAgLy8gY29uc3QgY29uc3RyYWludHMgPSB7fTtcbiAgICAvLyBsZXQgdHJlYXN1cmVDaGVzdCA9IGZhbHNlO1xuICAgIGxldCBzbG90ID0gMHgwYztcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHNraXBNb25zdGVycyA/IFtdIDogbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICArK3Nsb3Q7XG4gICAgICBpZiAoIXNwYXduLnVzZWQgfHwgIXNwYXduLmlzTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlkID0gc3Bhd24ubW9uc3RlcklkO1xuICAgICAgaWYgKGlkIGluIFVOVE9VQ0hFRF9NT05TVEVSUyB8fCAhU0NBTEVEX01PTlNURVJTLmhhcyhpZCkgfHxcbiAgICAgICAgICBTQ0FMRURfTU9OU1RFUlMuZ2V0KGlkKSEudHlwZSAhPT0gJ20nKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG9iamVjdCA9IGxvY2F0aW9uLnJvbS5vYmplY3RzW2lkXTtcbiAgICAgIGlmICghb2JqZWN0KSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHBhdEJhbmsgPSBzcGF3bi5wYXR0ZXJuQmFuaztcbiAgICAgIGNvbnN0IHBhdCA9IGxvY2F0aW9uLnNwcml0ZVBhdHRlcm5zW3BhdEJhbmtdO1xuICAgICAgY29uc3QgcGFsID0gb2JqZWN0LnBhbGV0dGVzKHRydWUpO1xuICAgICAgY29uc3QgcGFsMiA9IHBhbC5pbmNsdWRlcygyKSA/IGxvY2F0aW9uLnNwcml0ZVBhbGV0dGVzWzBdIDogdW5kZWZpbmVkO1xuICAgICAgY29uc3QgcGFsMyA9IHBhbC5pbmNsdWRlcygzKSA/IGxvY2F0aW9uLnNwcml0ZVBhbGV0dGVzWzFdIDogdW5kZWZpbmVkO1xuICAgICAgbW9uc3RlcnMucHVzaCh7aWQsIHBhdCwgcGFsMiwgcGFsMywgcGF0QmFua30pO1xuICAgICAgKHRoaXMucmVwb3J0W2BzdGFydC0ke2lkLnRvU3RyaW5nKDE2KX1gXSA9IHRoaXMucmVwb3J0W2BzdGFydC0ke2lkLnRvU3RyaW5nKDE2KX1gXSB8fCBbXSlcbiAgICAgICAgICAucHVzaCgnJCcgKyBsb2NhdGlvbi5pZC50b1N0cmluZygxNikpO1xuICAgICAgc2xvdHMucHVzaChzbG90KTtcbiAgICB9XG4gICAgaWYgKCFtb25zdGVycy5sZW5ndGggfHwgc2tpcCkgc2xvdHMgPSBbXTtcbiAgICB0aGlzLmxvY2F0aW9ucy5wdXNoKHtsb2NhdGlvbiwgc2xvdHN9KTtcbiAgICB0aGlzLm1vbnN0ZXJzLnB1c2goLi4ubW9uc3RlcnMpO1xuICB9XG5cbiAgc2h1ZmZsZShyYW5kb206IFJhbmRvbSwgZ3JhcGhpY3M6IEdyYXBoaWNzKSB7XG4gICAgdGhpcy5yZXBvcnRbJ3ByZS1zaHVmZmxlIGxvY2F0aW9ucyddID0gdGhpcy5sb2NhdGlvbnMubWFwKGwgPT4gbC5sb2NhdGlvbi5pZCk7XG4gICAgdGhpcy5yZXBvcnRbJ3ByZS1zaHVmZmxlIG1vbnN0ZXJzJ10gPSB0aGlzLm1vbnN0ZXJzLm1hcChtID0+IG0uaWQpO1xuICAgIHJhbmRvbS5zaHVmZmxlKHRoaXMubG9jYXRpb25zKTtcbiAgICByYW5kb20uc2h1ZmZsZSh0aGlzLm1vbnN0ZXJzKTtcbiAgICB0aGlzLnJlcG9ydFsncG9zdC1zaHVmZmxlIGxvY2F0aW9ucyddID0gdGhpcy5sb2NhdGlvbnMubWFwKGwgPT4gbC5sb2NhdGlvbi5pZCk7XG4gICAgdGhpcy5yZXBvcnRbJ3Bvc3Qtc2h1ZmZsZSBtb25zdGVycyddID0gdGhpcy5tb25zdGVycy5tYXAobSA9PiBtLmlkKTtcbiAgICB3aGlsZSAodGhpcy5sb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCB7bG9jYXRpb24sIHNsb3RzfSA9IHRoaXMubG9jYXRpb25zLnBvcCgpITtcbiAgICAgIGNvbnN0IHJlcG9ydDogc3RyaW5nW10gPSB0aGlzLnJlcG9ydFsnJCcgKyBsb2NhdGlvbi5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKV0gPSBbXTtcbiAgICAgIGNvbnN0IHttYXhGbHllcnMgPSAwLCBub25GbHllcnMgPSB7fSwgdG93ZXIgPSBmYWxzZX0gPVxuICAgICAgICAgICAgTU9OU1RFUl9BREpVU1RNRU5UU1tsb2NhdGlvbi5pZF0gfHwge307XG4gICAgICBpZiAodG93ZXIpIGNvbnRpbnVlO1xuICAgICAgbGV0IGZseWVycyA9IG1heEZseWVyczsgLy8gY291bnQgZG93bi4uLlxuXG4gICAgICAvLyBEZXRlcm1pbmUgbG9jYXRpb24gY29uc3RyYWludHNcbiAgICAgIGxldCBjb25zdHJhaW50ID0gQ29uc3RyYWludC5mb3JMb2NhdGlvbihsb2NhdGlvbi5pZCk7XG4gICAgICBpZiAobG9jYXRpb24uYm9zc0lkKCkgIT0gbnVsbCkge1xuICAgICAgICAvLyBOb3RlIHRoYXQgYm9zc2VzIGFsd2F5cyBsZWF2ZSBjaGVzdHMuXG4gICAgICAgIC8vIFRPRE8gLSBpdCdzIHBvc3NpYmxlIHRoaXMgaXMgb3V0IG9mIG9yZGVyIHcuci50LiB3cml0aW5nIHRoZSBib3NzP1xuICAgICAgICAvLyAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuQk9TUywgdHJ1ZSk7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgZG9lcyBub3Qgd29yayBmb3IgKGUuZy4pIG1hZG8gMSwgd2hlcmUgYXp0ZWNhIHJlcXVpcmVzXG4gICAgICAgIC8vIDUzIHdoaWNoIGlzIG5vdCBhIGNvbXBhdGlibGUgY2hlc3QgcGFnZS5cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc0NoZXN0KCkgJiYgIXNwYXduLmlzSW52aXNpYmxlKCkpIHtcbiAgICAgICAgICBpZiAoc3Bhd24uaWQgPCAweDcwKSB7XG4gICAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuVFJFQVNVUkVfQ0hFU1QsIHRydWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuTUlNSUMsIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc05wYygpIHx8IHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgICAgY29uc3QgYyA9IGdyYXBoaWNzLmdldE5wY0NvbnN0cmFpbnQobG9jYXRpb24uaWQsIHNwYXduLmlkKTtcbiAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KGMsIHRydWUpO1xuICAgICAgICAgIGlmIChzcGF3bi5pc05wYygpICYmIHNwYXduLmlkID09PSAweDZiKSB7XG4gICAgICAgICAgICAvLyBzbGVlcGluZyBrZW5zdSAoNmIpIGxlYXZlcyBiZWhpbmQgYSB0cmVhc3VyZSBjaGVzdFxuICAgICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChDb25zdHJhaW50LktFTlNVX0NIRVNULCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgVU5UT1VDSEVEX01PTlNURVJTW3NwYXduLm1vbnN0ZXJJZF0pIHtcbiAgICAgICAgICBjb25zdCBjID0gZ3JhcGhpY3MuZ2V0TW9uc3RlckNvbnN0cmFpbnQobG9jYXRpb24uaWQsIHNwYXduLm1vbnN0ZXJJZCk7XG4gICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChjLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc1Nob290aW5nV2FsbChsb2NhdGlvbikpIHtcbiAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuU0hPT1RJTkdfV0FMTCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVwb3J0LnB1c2goYEluaXRpYWwgcGFzczogJHtjb25zdHJhaW50LmZpeGVkLm1hcChzPT5zLnNpemU8SW5maW5pdHk/J1snK1suLi5zXS5qb2luKCcsICcpKyddJzonYWxsJyl9YCk7XG5cbiAgICAgIGNvbnN0IGNsYXNzZXMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICAgICAgY29uc3QgdHJ5QWRkTW9uc3RlciA9IChtOiBNb25zdGVyQ29uc3RyYWludCkgPT4ge1xuICAgICAgICBjb25zdCBtb25zdGVyID0gbG9jYXRpb24ucm9tLm9iamVjdHNbbS5pZF0gYXMgTW9uc3RlcjtcbiAgICAgICAgaWYgKG1vbnN0ZXIubW9uc3RlckNsYXNzKSB7XG4gICAgICAgICAgY29uc3QgcmVwcmVzZW50YXRpdmUgPSBjbGFzc2VzLmdldChtb25zdGVyLm1vbnN0ZXJDbGFzcyk7XG4gICAgICAgICAgaWYgKHJlcHJlc2VudGF0aXZlICE9IG51bGwgJiYgcmVwcmVzZW50YXRpdmUgIT09IG0uaWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmbHllciA9IEZMWUVSUy5oYXMobS5pZCk7XG4gICAgICAgIGNvbnN0IG1vdGggPSBNT1RIU19BTkRfQkFUUy5oYXMobS5pZCk7XG4gICAgICAgIGlmIChmbHllcikge1xuICAgICAgICAgIC8vIFRPRE8gLSBhZGQgYSBzbWFsbCBwcm9iYWJpbGl0eSBvZiBhZGRpbmcgaXQgYW55d2F5LCBtYXliZVxuICAgICAgICAgIC8vIGJhc2VkIG9uIHRoZSBtYXAgYXJlYT8gIDI1IHNlZW1zIGEgZ29vZCB0aHJlc2hvbGQuXG4gICAgICAgICAgaWYgKCFmbHllcnMpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAtLWZseWVycztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjID0gZ3JhcGhpY3MuZ2V0TW9uc3RlckNvbnN0cmFpbnQobG9jYXRpb24uaWQsIG0uaWQpO1xuICAgICAgICBsZXQgbWVldCA9IGNvbnN0cmFpbnQudHJ5TWVldChjKTtcbiAgICAgICAgaWYgKCFtZWV0ICYmIGNvbnN0cmFpbnQucGFsMi5zaXplIDwgSW5maW5pdHkgJiYgY29uc3RyYWludC5wYWwzLnNpemUgPCBJbmZpbml0eSkge1xuICAgICAgICAgIGlmICh0aGlzLmZsYWdzLnNodWZmbGVTcHJpdGVQYWxldHRlcygpKSB7XG4gICAgICAgICAgICBtZWV0ID0gY29uc3RyYWludC50cnlNZWV0KGMsIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1lZXQpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAvLyBGaWd1cmUgb3V0IGVhcmx5IGlmIHRoZSBtb25zdGVyIGlzIHBsYWNlYWJsZS5cbiAgICAgICAgbGV0IHBvczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAobW9uc3RlclBsYWNlcikge1xuICAgICAgICAgIGNvbnN0IG1vbnN0ZXIgPSBsb2NhdGlvbi5yb20ub2JqZWN0c1ttLmlkXTtcbiAgICAgICAgICBpZiAoIShtb25zdGVyIGluc3RhbmNlb2YgTW9uc3RlcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbm9uLW1vbnN0ZXI6ICR7bW9uc3Rlcn1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcG9zID0gbW9uc3RlclBsYWNlcihtb25zdGVyKTtcbiAgICAgICAgICBpZiAocG9zID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcG9ydC5wdXNoKGAgIEFkZGluZyAke20uaWQudG9TdHJpbmcoMTYpfTogJHttZWV0fWApO1xuICAgICAgICBjb25zdHJhaW50ID0gbWVldDtcblxuICAgICAgICAvLyBQaWNrIHRoZSBzbG90IG9ubHkgYWZ0ZXIgd2Uga25vdyBmb3Igc3VyZSB0aGF0IGl0IHdpbGwgZml0LlxuICAgICAgICBpZiAobW9uc3Rlci5tb25zdGVyQ2xhc3MpIGNsYXNzZXMuc2V0KG1vbnN0ZXIubW9uc3RlckNsYXNzLCBtLmlkKVxuICAgICAgICBsZXQgZWxpZ2libGUgPSAwO1xuICAgICAgICBpZiAoZmx5ZXIgfHwgbW90aCkge1xuICAgICAgICAgIC8vIGxvb2sgZm9yIGEgZmx5ZXIgc2xvdCBpZiBwb3NzaWJsZS5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNsb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoc2xvdHNbaV0gaW4gbm9uRmx5ZXJzKSB7XG4gICAgICAgICAgICAgIGVsaWdpYmxlID0gaTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFByZWZlciBub24tZmx5ZXIgc2xvdHMsIGJ1dCBhZGp1c3QgaWYgd2UgZ2V0IGEgZmx5ZXIuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzbG90cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNsb3RzW2ldIGluIG5vbkZseWVycykgY29udGludWU7XG4gICAgICAgICAgICBlbGlnaWJsZSA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKHRoaXMucmVwb3J0W2Btb24tJHttLmlkLnRvU3RyaW5nKDE2KX1gXSA9IHRoaXMucmVwb3J0W2Btb24tJHttLmlkLnRvU3RyaW5nKDE2KX1gXSB8fCBbXSlcbiAgICAgICAgICAgIC5wdXNoKCckJyArIGxvY2F0aW9uLmlkLnRvU3RyaW5nKDE2KSk7XG4gICAgICAgIGNvbnN0IHNsb3QgPSBzbG90c1tlbGlnaWJsZV07XG4gICAgICAgIGNvbnN0IHNwYXduID0gbG9jYXRpb24uc3Bhd25zW3Nsb3QgLSAweDBkXTtcbiAgICAgICAgaWYgKG1vbnN0ZXJQbGFjZXIpIHsgLy8gcG9zID09IG51bGwgcmV0dXJuZWQgZmFsc2UgZWFybGllclxuICAgICAgICAgIHNwYXduLnNjcmVlbiA9IHBvcyEgPj4+IDg7XG4gICAgICAgICAgc3Bhd24udGlsZSA9IHBvcyEgJiAweGZmO1xuICAgICAgICB9IGVsc2UgaWYgKHNsb3QgaW4gbm9uRmx5ZXJzKSB7XG4gICAgICAgICAgc3Bhd24ueSArPSBub25GbHllcnNbc2xvdF1bMF0gKiAxNjtcbiAgICAgICAgICBzcGF3bi54ICs9IG5vbkZseWVyc1tzbG90XVsxXSAqIDE2O1xuICAgICAgICB9XG4gICAgICAgIHNwYXduLm1vbnN0ZXJJZCA9IG0uaWQ7XG4gICAgICAgIHJlcG9ydC5wdXNoKGAgICAgc2xvdCAke3Nsb3QudG9TdHJpbmcoMTYpfTogJHtzcGF3bn1gKTtcblxuICAgICAgICAvLyBUT0RPIC0gYW55dGhpbmcgZWxzZSBuZWVkIHNwbGljaW5nP1xuXG4gICAgICAgIHNsb3RzLnNwbGljZShlbGlnaWJsZSwgMSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcblxuICAgICAgLy8gRm9yIGVhY2ggbG9jYXRpb24uLi4uIHRyeSB0byBmaWxsIHVwIHRoZSBzbG90c1xuICAgICAgY29uc3QgbW9uc3RlclBsYWNlciA9XG4gICAgICAgICAgc2xvdHMubGVuZ3RoICYmIHRoaXMuZmxhZ3MucmFuZG9taXplTWFwcygpID9cbiAgICAgICAgICAgICAgbG9jYXRpb24ubW9uc3RlclBsYWNlcihyYW5kb20pIDogbnVsbDtcblxuICAgICAgaWYgKGZseWVycyAmJiBzbG90cy5sZW5ndGgpIHtcbiAgICAgICAgLy8gbG9vayBmb3IgYW4gZWxpZ2libGUgZmx5ZXIgaW4gdGhlIGZpcnN0IDQwLiAgSWYgaXQncyB0aGVyZSwgYWRkIGl0IGZpcnN0LlxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKDQwLCB0aGlzLm1vbnN0ZXJzLmxlbmd0aCk7IGkrKykge1xuICAgICAgICAgIGlmIChGTFlFUlMuaGFzKHRoaXMubW9uc3RlcnNbaV0uaWQpKSB7XG4gICAgICAgICAgICBpZiAodHJ5QWRkTW9uc3Rlcih0aGlzLm1vbnN0ZXJzW2ldKSkge1xuICAgICAgICAgICAgICB0aGlzLm1vbnN0ZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcmFuZG9tLnNodWZmbGUodGhpcy5tb25zdGVycyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtYXliZSBhZGRlZCBhIHNpbmdsZSBmbHllciwgdG8gbWFrZSBzdXJlIHdlIGRvbid0IHJ1biBvdXQuICBOb3cganVzdCB3b3JrIG5vcm1hbGx5XG5cbiAgICAgICAgLy8gZGVjaWRlIGlmIHdlJ3JlIGdvaW5nIHRvIGFkZCBhbnkgZmx5ZXJzLlxuXG4gICAgICAgIC8vIGFsc28gY29uc2lkZXIgYWxsb3dpbmcgYSBzaW5nbGUgcmFuZG9tIGZseWVyIHRvIGJlIGFkZGVkIG91dCBvZiBiYW5kIGlmXG4gICAgICAgIC8vIHRoZSBzaXplIG9mIHRoZSBtYXAgZXhjZWVkcyAyNT9cblxuICAgICAgICAvLyBwcm9iYWJseSBkb24ndCBhZGQgZmx5ZXJzIHRvIHVzZWQ/XG5cbiAgICAgIH1cblxuICAgICAgLy8gaXRlcmF0ZSBvdmVyIG1vbnN0ZXJzIHVudGlsIHdlIGZpbmQgb25lIHRoYXQncyBhbGxvd2VkLi4uXG4gICAgICAvLyBOT1RFOiBmaWxsIHRoZSBub24tZmx5ZXIgc2xvdHMgZmlyc3QgKGV4Y2VwdCBpZiB3ZSBwaWNrIGEgZmx5ZXI/PylcbiAgICAgIC8vICAgLSBtYXkgbmVlZCB0byB3ZWlnaHQgZmx5ZXJzIHNsaWdodGx5IGhpZ2hlciBvciBmaWxsIHRoZW0gZGlmZmVyZW50bHk/XG4gICAgICAvLyAgICAgb3RoZXJ3aXNlIHdlJ2xsIGxpa2VseSBub3QgZ2V0IHRoZW0gd2hlbiB3ZSdyZSBhbGxvd2VkLi4uP1xuICAgICAgLy8gICAtIG9yIGp1c3QgZG8gdGhlIG5vbi1mbHllciAqbG9jYXRpb25zKiBmaXJzdD9cbiAgICAgIC8vIC0gb3IganVzdCBmaWxsIHVwIGZseWVycyB1bnRpbCB3ZSBydW4gb3V0Li4uIDEwMCUgY2hhbmNlIG9mIGZpcnN0IGZseWVyLFxuICAgICAgLy8gICA1MCUgY2hhbmNlIG9mIGdldHRpbmcgYSBzZWNvbmQgZmx5ZXIgaWYgYWxsb3dlZC4uLlxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm1vbnN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICghc2xvdHMubGVuZ3RoKSBicmVhaztcbiAgICAgICAgaWYgKHRyeUFkZE1vbnN0ZXIodGhpcy5tb25zdGVyc1tpXSkpIHtcbiAgICAgICAgICBjb25zdCBbdXNlZF0gPSB0aGlzLm1vbnN0ZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICBpZiAoIUZMWUVSUy5oYXModXNlZC5pZCkpIHRoaXMudXNlZC5wdXNoKHVzZWQpO1xuICAgICAgICAgIGktLTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBiYWNrdXAgbGlzdFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnVzZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCFzbG90cy5sZW5ndGgpIGJyZWFrO1xuICAgICAgICBpZiAodHJ5QWRkTW9uc3Rlcih0aGlzLnVzZWRbaV0pKSB7XG4gICAgICAgICAgdGhpcy51c2VkLnB1c2goLi4udGhpcy51c2VkLnNwbGljZShpLCAxKSk7XG4gICAgICAgICAgaS0tO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdHJhaW50LmZpeChsb2NhdGlvbiwgcmFuZG9tKTtcblxuICAgICAgaWYgKHNsb3RzLmxlbmd0aCkge1xuICAgICAgICBjb25zb2xlLmVycm9yLypyZXBvcnQucHVzaCovKGBGYWlsZWQgdG8gZmlsbCBsb2NhdGlvbiAke2xvY2F0aW9uLmlkLnRvU3RyaW5nKDE2KX06ICR7c2xvdHMubGVuZ3RofSByZW1haW5pbmdgKTtcbiAgICAgICAgZm9yIChjb25zdCBzbG90IG9mIHNsb3RzKSB7XG4gICAgICAgICAgY29uc3Qgc3Bhd24gPSBsb2NhdGlvbi5zcGF3bnNbc2xvdCAtIDB4MGRdO1xuICAgICAgICAgIHNwYXduLnggPSBzcGF3bi55ID0gMDtcbiAgICAgICAgICBzcGF3bi5pZCA9IDB4YjA7XG4gICAgICAgICAgc3Bhd24uZGF0YVswXSA9IDB4ZmU7IC8vIGluZGljYXRlIHVudXNlZFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgICBncmFwaGljcy5jb25maWd1cmUobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY29uc3QgRkxZRVJTOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoWzB4NTksIDB4NWMsIDB4NmUsIDB4NmYsIDB4ODEsIDB4OGEsIDB4YTMsIDB4YzRdKTtcbmNvbnN0IE1PVEhTX0FORF9CQVRTOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoWzB4NTUsIC8qIHN3YW1wIHBsYW50ICovIDB4NWQsIDB4N2MsIDB4YmMsIDB4YzFdKTtcbi8vIGNvbnN0IFNXSU1NRVJTOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoWzB4NzUsIDB4NzZdKTtcbi8vIGNvbnN0IFNUQVRJT05BUlk6IFNldDxudW1iZXI+ID0gbmV3IFNldChbMHg3NywgMHg4N10pOyAgLy8ga3Jha2VuLCBzb3JjZXJvclxuXG5pbnRlcmZhY2UgTW9uc3RlckFkanVzdG1lbnQge1xuICBtYXhGbHllcnM/OiBudW1iZXI7XG4gIHNraXA/OiBib29sZWFuO1xuICB0b3dlcj86IGJvb2xlYW47XG4gIGZpeGVkU2xvdHM/OiB7cGF0MD86IG51bWJlciwgcGF0MT86IG51bWJlciwgcGFsMj86IG51bWJlciwgcGFsMz86IG51bWJlcn07XG4gIG5vbkZseWVycz86IHtbaWQ6IG51bWJlcl06IFtudW1iZXIsIG51bWJlcl19O1xufVxuY29uc3QgTU9OU1RFUl9BREpVU1RNRU5UUzoge1tsb2M6IG51bWJlcl06IE1vbnN0ZXJBZGp1c3RtZW50fSA9IHtcbiAgWzB4MDNdOiB7IC8vIFZhbGxleSBvZiBXaW5kXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGF0MTogMHg2MCwgLy8gcmVxdWlyZWQgYnkgd2luZG1pbGxcbiAgICB9LFxuICAgIG1heEZseWVyczogMixcbiAgfSxcbiAgWzB4MDddOiB7IC8vIFNlYWxlZCBDYXZlIDRcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBmXTogWzAsIC0zXSwgIC8vIGJhdFxuICAgICAgWzB4MTBdOiBbLTEwLCAwXSwgLy8gYmF0XG4gICAgICBbMHgxMV06IFswLCA0XSwgICAvLyBiYXRcbiAgICB9LFxuICB9LFxuICBbMHgxNF06IHsgLy8gQ29yZGVsIFdlc3RcbiAgICBtYXhGbHllcnM6IDIsXG4gIH0sXG4gIFsweDE1XTogeyAvLyBDb3JkZWwgRWFzdFxuICAgIG1heEZseWVyczogMixcbiAgfSxcbiAgWzB4MWFdOiB7IC8vIFN3YW1wXG4gICAgLy8gc2tpcDogJ2FkZCcsXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGFsMzogMHgyMyxcbiAgICAgIHBhdDE6IDB4NGYsXG4gICAgfSxcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7IC8vIFRPRE8gLSBtaWdodCBiZSBuaWNlIHRvIGtlZXAgcHVmZnMgd29ya2luZz9cbiAgICAgIFsweDEwXTogWzQsIDBdLFxuICAgICAgWzB4MTFdOiBbNSwgMF0sXG4gICAgICBbMHgxMl06IFs0LCAwXSxcbiAgICAgIFsweDEzXTogWzUsIDBdLFxuICAgICAgWzB4MTRdOiBbNCwgMF0sXG4gICAgICBbMHgxNV06IFs0LCAwXSxcbiAgICB9LFxuICB9LFxuICBbMHgxYl06IHsgLy8gQW1hem9uZXNcbiAgICAvLyBSYW5kb20gYmx1ZSBzbGltZSBzaG91bGQgYmUgaWdub3JlZFxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweDIwXTogeyAvLyBNdCBTYWJyZSBXZXN0IExvd2VyXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHgyMV06IHsgLy8gTXQgU2FicmUgV2VzdCBVcHBlclxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhdDE6IDB4NTAsXG4gICAgICAvLyBwYWwyOiAweDA2LCAvLyBtaWdodCBiZSBmaW5lIHRvIGNoYW5nZSB0b3JuZWwncyBjb2xvci4uLlxuICAgIH0sXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHgyN106IHsgLy8gTXQgU2FicmUgV2VzdCBDYXZlIDdcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzAsIDB4MTBdLCAvLyByYW5kb20gZW5lbXkgc3R1Y2sgaW4gd2FsbFxuICAgIH0sXG4gIH0sXG4gIFsweDI4XTogeyAvLyBNdCBTYWJyZSBOb3J0aCBNYWluXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHgyOV06IHsgLy8gTXQgU2FicmUgTm9ydGggTWlkZGxlXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHgyYl06IHsgLy8gTXQgU2FicmUgTm9ydGggQ2F2ZSAyXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNF06IFsweDIwLCAtOF0sIC8vIGJhdFxuICAgIH0sXG4gIH0sXG4gIFsweDQwXTogeyAvLyBXYXRlcmZhbGwgVmFsbGV5IE5vcnRoXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTNdOiBbMTIsIC0weDEwXSwgLy8gbWVkdXNhIGhlYWRcbiAgICB9LFxuICB9LFxuICBbMHg0MV06IHsgLy8gV2F0ZXJmYWxsIFZhbGxleSBTb3V0aFxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE1XTogWzAsIC02XSwgLy8gbWVkdXNhIGhlYWRcbiAgICB9LFxuICB9LFxuICBbMHg0Ml06IHsgLy8gTGltZSBUcmVlIFZhbGxleVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzAsIDhdLCAvLyBldmlsIGJpcmRcbiAgICAgIFsweDBlXTogWy04LCA4XSwgLy8gZXZpbCBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4NDddOiB7IC8vIEtpcmlzYSBNZWFkb3dcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFstOCwgLThdLFxuICAgIH0sXG4gIH0sXG4gIFsweDRhXTogeyAvLyBGb2cgTGFtcCBDYXZlIDNcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZV06IFs0LCAwXSwgIC8vIGJhdFxuICAgICAgWzB4MGZdOiBbMCwgLTNdLCAvLyBiYXRcbiAgICAgIFsweDEwXTogWzAsIDRdLCAgLy8gYmF0XG4gICAgfSxcbiAgfSxcbiAgWzB4NGNdOiB7IC8vIEZvZyBMYW1wIENhdmUgNFxuICAgIC8vIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4NGRdOiB7IC8vIEZvZyBMYW1wIENhdmUgNVxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4NGVdOiB7IC8vIEZvZyBMYW1wIENhdmUgNlxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4NGZdOiB7IC8vIEZvZyBMYW1wIENhdmUgN1xuICAgIC8vIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4NTddOiB7IC8vIFdhdGVyZmFsbCBDYXZlIDRcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYXQxOiAweDRkLFxuICAgIH0sXG4gIH0sXG4gIFsweDU5XTogeyAvLyBUb3dlciBGbG9vciAxXG4gICAgLy8gc2tpcDogdHJ1ZSxcbiAgICB0b3dlcjogdHJ1ZSxcbiAgfSxcbiAgWzB4NWFdOiB7IC8vIFRvd2VyIEZsb29yIDJcbiAgICAvLyBza2lwOiB0cnVlLFxuICAgIHRvd2VyOiB0cnVlLFxuICB9LFxuICBbMHg1Yl06IHsgLy8gVG93ZXIgRmxvb3IgM1xuICAgIC8vIHNraXA6IHRydWUsXG4gICAgdG93ZXI6IHRydWUsXG4gIH0sXG4gIFsweDYwXTogeyAvLyBBbmdyeSBTZWFcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYWwzOiAweDA4LFxuICAgICAgcGF0MTogMHg1MiwgLy8gKGFzIG9wcG9zZWQgdG8gcGF0MClcbiAgICB9LFxuICAgIG1heEZseWVyczogMixcbiAgICBza2lwOiB0cnVlLCAvLyBub3Qgc3VyZSBob3cgdG8gcmFuZG9taXplIHRoZXNlIHdlbGxcbiAgfSxcbiAgWzB4NjRdOiB7IC8vIFVuZGVyZ3JvdW5kIENoYW5uZWxcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYWwzOiAweDA4LFxuICAgICAgcGF0MTogMHg1MiwgLy8gKGFzIG9wcG9zZWQgdG8gcGF0MClcbiAgICB9LFxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweDY4XTogeyAvLyBFdmlsIFNwaXJpdCBJc2xhbmQgMVxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhbDM6IDB4MDgsXG4gICAgICBwYXQxOiAweDUyLCAvLyAoYXMgb3Bwb3NlZCB0byBwYXQwKVxuICAgIH0sXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbiAgWzB4NjldOiB7IC8vIEV2aWwgU3Bpcml0IElzbGFuZCAyXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTddOiBbNCwgNl0sICAvLyBtZWR1c2EgaGVhZFxuICAgIH0sXG4gIH0sXG4gIFsweDZhXTogeyAvLyBFdmlsIFNwaXJpdCBJc2xhbmQgM1xuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE1XTogWzAsIDB4MThdLCAgLy8gbWVkdXNhIGhlYWRcbiAgICB9LFxuICB9LFxuICBbMHg2Y106IHsgLy8gU2FiZXJhIFBhbGFjZSAxXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTddOiBbMCwgMHgxOF0sIC8vIGV2aWwgYmlyZFxuICAgIH0sXG4gIH0sXG4gIFsweDZkXTogeyAvLyBTYWJlcmEgUGFsYWNlIDJcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxMV06IFsweDEwLCAwXSwgLy8gbW90aFxuICAgICAgWzB4MWJdOiBbMCwgMF0sICAgIC8vIG1vdGggLSBvayBhbHJlYWR5XG4gICAgICBbMHgxY106IFs2LCAwXSwgICAgLy8gbW90aFxuICAgIH0sXG4gIH0sXG4gIFsweDc4XTogeyAvLyBHb2EgVmFsbGV5XG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTZdOiBbLTgsIC04XSwgLy8gZXZpbCBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4N2NdOiB7IC8vIE10IEh5ZHJhXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTVdOiBbLTB4MjcsIDB4NTRdLCAvLyBldmlsIGJpcmRcbiAgICB9LFxuICB9LFxuICBbMHg4NF06IHsgLy8gTXQgSHlkcmEgQ2F2ZSA3XG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxMl06IFswLCAtNF0sXG4gICAgICBbMHgxM106IFswLCA0XSxcbiAgICAgIFsweDE0XTogWy02LCAwXSxcbiAgICAgIFsweDE1XTogWzE0LCAxMl0sXG4gICAgfSxcbiAgfSxcbiAgWzB4ODhdOiB7IC8vIFN0eXggMVxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4ODldOiB7IC8vIFN0eXggMlxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4OGFdOiB7IC8vIFN0eXggMVxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzcsIDBdLCAvLyBtb3RoXG4gICAgICBbMHgwZV06IFswLCAwXSwgLy8gbW90aCAtIG9rXG4gICAgICBbMHgwZl06IFs3LCAzXSwgLy8gbW90aFxuICAgICAgWzB4MTBdOiBbMCwgNl0sIC8vIG1vdGhcbiAgICAgIFsweDExXTogWzExLCAtMHgxMF0sIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHg4Zl06IHsgLy8gR29hIEZvcnRyZXNzIC0gT2FzaXMgQ2F2ZSBFbnRyYW5jZVxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweDkwXTogeyAvLyBEZXNlcnQgMVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE0XTogWy0weGIsIC0zXSwgLy8gYm9tYmVyIGJpcmRcbiAgICAgIFsweDE1XTogWzAsIDB4MTBdLCAgLy8gYm9tYmVyIGJpcmRcbiAgICB9LFxuICB9LFxuICBbMHg5MV06IHsgLy8gT2FzaXMgQ2F2ZVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE4XTogWzAsIDE0XSwgICAgLy8gaW5zZWN0XG4gICAgICBbMHgxOV06IFs0LCAtMHgxMF0sIC8vIGluc2VjdFxuICAgIH0sXG4gIH0sXG4gIFsweDk4XTogeyAvLyBEZXNlcnQgMlxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE0XTogWy02LCA2XSwgICAgLy8gZGV2aWxcbiAgICAgIFsweDE1XTogWzAsIC0weDEwXSwgLy8gZGV2aWxcbiAgICB9LFxuICB9LFxuICBbMHg5ZV06IHsgLy8gUHlyYW1pZCBGcm9udCAtIE1haW5cbiAgICBtYXhGbHllcnM6IDIsXG4gIH0sXG4gIFsweGEyXTogeyAvLyBQeXJhbWlkIEJhY2sgLSBCcmFuY2hcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxMl06IFswLCAxMV0sIC8vIG1vdGhcbiAgICAgIFsweDEzXTogWzYsIDBdLCAgLy8gbW90aFxuICAgIH0sXG4gIH0sXG4gIFsweGE1XTogeyAvLyBQeXJhbWlkIEJhY2sgLSBIYWxsIDJcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE3XTogWzYsIDZdLCAgIC8vIG1vdGhcbiAgICAgIFsweDE4XTogWy02LCAwXSwgIC8vIG1vdGhcbiAgICAgIFsweDE5XTogWy0xLCAtN10sIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHhhNl06IHsgLy8gRHJheWdvbiAyXG4gICAgLy8gSGFzIGEgZmV3IGJsdWUgc2xpbWVzIHRoYXQgYXJlbid0IHJlYWwgYW5kIHNob3VsZCBiZSBpZ25vcmVkLlxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweGE4XTogeyAvLyBHb2EgRm9ydHJlc3MgLSBFbnRyYW5jZVxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweGE5XTogeyAvLyBHb2EgRm9ydHJlc3MgLSBLZWxiZXNxdWVcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNl06IFsweDFhLCAtMHgxMF0sIC8vIGRldmlsXG4gICAgICBbMHgxN106IFswLCAweDIwXSwgICAgIC8vIGRldmlsXG4gICAgfSxcbiAgfSxcbiAgWzB4YWJdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIFNhYmVyYVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzEsIDBdLCAgLy8gaW5zZWN0XG4gICAgICBbMHgwZV06IFsyLCAtMl0sIC8vIGluc2VjdFxuICAgIH0sXG4gIH0sXG5cbiAgWzB4YWRdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIE1hZG8gMVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE4XTogWzAsIDhdLCAgLy8gZGV2aWxcbiAgICAgIFsweDE5XTogWzAsIC04XSwgLy8gZGV2aWxcbiAgICB9LFxuICB9LFxuICBbMHhhZl06IHsgLy8gR29hIEZvcnRyZXNzIC0gTWFkbyAzXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFswLCAwXSwgIC8vIG1vdGggLSBva1xuICAgICAgWzB4MGVdOiBbMCwgMF0sICAvLyBicm9rZW4gLSBidXQgcmVwbGFjZT9cbiAgICAgIFsweDEzXTogWzB4M2IsIC0weDI2XSwgLy8gc2hhZG93IC0gZW1iZWRkZWQgaW4gd2FsbFxuICAgICAgLy8gVE9ETyAtIDB4MGUgZ2xpdGNoZWQsIGRvbid0IHJhbmRvbWl6ZVxuICAgIH0sXG4gIH0sXG4gIFsweGI0XTogeyAvLyBHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDVcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxMV06IFs2LCAwXSwgIC8vIG1vdGhcbiAgICAgIFsweDEyXTogWzAsIDZdLCAgLy8gbW90aFxuICAgIH0sXG4gIH0sXG4gIFsweGQ3XTogeyAvLyBQb3J0b2EgUGFsYWNlIC0gRW50cnlcbiAgICAvLyBUaGVyZSdzIGEgcmFuZG9tIHNsaW1lIGluIHRoaXMgcm9vbSB0aGF0IHdvdWxkIGNhdXNlIGdsaXRjaGVzXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbn07XG5cbmNvbnN0IFVOVE9VQ0hFRF9NT05TVEVSUzoge1tpZDogbnVtYmVyXTogYm9vbGVhbn0gPSB7IC8vIG5vdCB5ZXQgKzB4NTAgaW4gdGhlc2Uga2V5c1xuICBbMHg3ZV06IHRydWUsIC8vIHZlcnRpY2FsIHBsYXRmb3JtXG4gIFsweDdmXTogdHJ1ZSwgLy8gaG9yaXpvbnRhbCBwbGF0Zm9ybVxuICBbMHg4M106IHRydWUsIC8vIGdsaXRjaCBpbiAkN2MgKGh5ZHJhKVxuICBbMHg4ZF06IHRydWUsIC8vIGdsaXRjaCBpbiBsb2NhdGlvbiAkYWIgKHNhYmVyYSAyKVxuICBbMHg4ZV06IHRydWUsIC8vIGJyb2tlbj8sIGJ1dCBzaXRzIG9uIHRvcCBvZiBpcm9uIHdhbGxcbiAgWzB4OGZdOiB0cnVlLCAvLyBzaG9vdGluZyBzdGF0dWVcbiAgWzB4OWZdOiB0cnVlLCAvLyB2ZXJ0aWNhbCBwbGF0Zm9ybVxuICAvLyBbMHhhMV06IHRydWUsIC8vIHdoaXRlIHRvd2VyIHJvYm90c1xuICBbMHhhNl06IHRydWUsIC8vIGdsaXRjaCBpbiBsb2NhdGlvbiAkYWYgKG1hZG8gMilcbn07XG5cbmNvbnN0IHNodWZmbGVSYW5kb21OdW1iZXJzID0gKHJvbTogVWludDhBcnJheSwgcmFuZG9tOiBSYW5kb20pID0+IHtcbiAgY29uc3QgdGFibGUgPSByb20uc3ViYXJyYXkoMHgzNTdlNCArIDB4MTAsIDB4MzU4MjQgKyAweDEwKTtcbiAgcmFuZG9tLnNodWZmbGUodGFibGUpO1xufTtcblxuLy8gdXNlZnVsIGZvciBkZWJ1ZyBldmVuIGlmIG5vdCBjdXJyZW50bHkgdXNlZFxuY29uc3QgW10gPSBbaGV4XTtcbiJdfQ==