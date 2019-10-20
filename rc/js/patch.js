import { Assembler } from './6502.js';
import { crc32 } from './crc32.js';
import { generate as generateDepgraph } from './depgraph.js';
import { FetchReader } from './fetchreader.js';
import { FlagSet } from './flagset.js';
import { AssumedFill } from './graph/shuffle.js';
import { World } from './graph/world.js';
import { deterministic } from './pass/deterministic.js';
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
        await shuffle(rom, parseSeed(String(hash.seed)), flags, new FetchReader(path));
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
        _UNIDENTIFIED_ITEMS: flags.unidentifiedItems(),
    };
    const asm = new Assembler();
    async function assemble(path) {
        asm.assemble(await reader.read(path), path);
        asm.patchRom(rom);
    }
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
        shuffleMazes(parsed, random);
    const w = World.build(parsed, flags);
    const fill = await new AssumedFill(parsed, flags).shuffle(w.graph, random, progress);
    if (fill) {
        w.traverse(w.graph, fill);
        slots.update(parsed, fill.slots);
    }
    else {
        return -1;
    }
    if (touchShops) {
        rescaleShops(parsed, asm, flags.bargainHunting() ? random : undefined);
    }
    normalizeSwords(parsed, flags, random);
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
    await parsed.writeData();
    buffDyna(parsed, flags);
    const crc = await postParsedShuffle(rom, random, seed, flags, asm, assemble);
    return crc;
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
function normalizeSwords(rom, flags, random) {
    const {} = { flags, random };
    rom.objects[0x10].atk = 3;
    rom.objects[0x11].atk = 6;
    rom.objects[0x12].atk = 8;
    rom.objects[0x18].atk = 3;
    rom.objects[0x13].atk = 5;
    rom.objects[0x19].atk = 5;
    rom.objects[0x17].atk = 7;
    rom.objects[0x1a].atk = 7;
    rom.objects[0x14].atk = 3;
    rom.objects[0x15].atk = 6;
    rom.objects[0x16].atk = 8;
    rom.objects[0x1c].atk = 3;
    rom.objects[0x1e].atk = 5;
    rom.objects[0x1b].atk = 7;
    rom.objects[0x1f].atk = 7;
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwQyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2pDLE9BQU8sRUFDQyxRQUFRLElBQUksZ0JBQWdCLEVBQ0MsTUFBTSxlQUFlLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDckMsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQzlDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRCxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDbkMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsUUFBUSxFQUFPLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxHQUFHLEVBQUUs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USxLQUFLLFVBQVUsSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLFVBQVUsQ0FBQyxFQUFFO1lBQzVFLEdBQUcsQ0FBQyxTQUFTLENBQUUsSUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekQ7S0FDRjtBQUNILENBQUM7QUFFRCxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFO0lBRzdCLE1BQU0sVUFBVSxHQUFHO1FBRWpCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDaEMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENB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SSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUUsR0FBRztJQUNULElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEdBQUc7Q0FFVixDQUFDO0FBTUYsU0FBUyxlQUFlLENBQUMsR0FBUSxFQUFFLEtBQWMsRUFBRSxNQUFjO0lBRS9ELE1BQU0sRUFBRSxHQUFHLEVBQUMsS0FBSyxFQUFFLE1BQU0sRUFBUSxDQUFDO0lBa0JsQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUUxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcs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QUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1NBQ1g7UUFDRCxTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNmO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRU4sSUFBSSxFQUFFLElBQUk7S0FDWDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxJQUFJO1NBRVg7UUFDRCxTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1NBQ2xCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDbkI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUM7U0FDcEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDaEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNoQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2pCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDZixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNmO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFLEVBRVA7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUVQO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxJQUFJO1NBQ1g7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixLQUFLLEVBQUUsSUFBSTtLQUNaO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUVOLEtBQUssRUFBRSxJQUFJO0tBQ1o7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRU4sS0FBSyxFQUFFLElBQUk7S0FDWjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1NBQ1g7UUFDRCxTQUFTLEVBQUUsQ0FBQztRQUNaLElBQUksRUFBRSxJQUFJO0tBQ1g7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNYO1FBQ0QsSUFBSSxFQUFFLElBQUk7S0FDWDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1NBQ1g7UUFDRCxJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDZjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7U0FDbEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO1NBQ2xCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNqQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNqQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztTQUN0QjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDZixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNqQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQztTQUNwQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLElBQUksRUFBRSxJQUFJO0tBQ1g7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7U0FDbEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztTQUNuQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNmLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7U0FDbkI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDZixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNmO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2pCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRU4sSUFBSSxFQUFFLElBQUk7S0FDWDtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQztZQUNyQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztTQUNsQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2hCO0tBQ0Y7SUFFRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDaEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQztTQUV0QjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNmO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRU4sSUFBSSxFQUFFLElBQUk7S0FDWDtDQUNGLENBQUM7QUFFRixNQUFNLGtCQUFrQixHQUE0QjtJQUNsRCxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7SUFDWixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7SUFDWixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7SUFDWixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7SUFDWixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7SUFDWixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7SUFDWixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7SUFFWixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUk7Q0FDYixDQUFDO0FBRUYsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLEdBQWUsRUFBRSxNQUFjLEVBQUUsRUFBRTtJQUMvRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLEVBQUUsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzNELE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDO0FBR0YsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXNzZW1ibGVyfSBmcm9tICcuLzY1MDIuanMnO1xuaW1wb3J0IHtjcmMzMn0gZnJvbSAnLi9jcmMzMi5qcyc7XG5pbXBvcnQge1Byb2dyZXNzVHJhY2tlcixcbiAgICAgICAgZ2VuZXJhdGUgYXMgZ2VuZXJhdGVEZXBncmFwaCxcbiAgICAgICAgc2h1ZmZsZTIgYXMgX3NodWZmbGVEZXBncmFwaH0gZnJvbSAnLi9kZXBncmFwaC5qcyc7XG5pbXBvcnQge0ZldGNoUmVhZGVyfSBmcm9tICcuL2ZldGNocmVhZGVyLmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7QXNzdW1lZEZpbGx9IGZyb20gJy4vZ3JhcGgvc2h1ZmZsZS5qcyc7XG5pbXBvcnQge1dvcmxkfSBmcm9tICcuL2dyYXBoL3dvcmxkLmpzJztcbmltcG9ydCB7ZGV0ZXJtaW5pc3RpY30gZnJvbSAnLi9wYXNzL2RldGVybWluaXN0aWMuanMnO1xuaW1wb3J0IHtmaXhEaWFsb2d9IGZyb20gJy4vcGFzcy9maXhkaWFsb2cuanMnO1xuaW1wb3J0IHtzaHVmZmxlTWF6ZXN9IGZyb20gJy4vcGFzcy9zaHVmZmxlbWF6ZXMuanMnO1xuaW1wb3J0IHtzaHVmZmxlUGFsZXR0ZXN9IGZyb20gJy4vcGFzcy9zaHVmZmxlcGFsZXR0ZXMuanMnO1xuaW1wb3J0IHtzaHVmZmxlVHJhZGVzfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXRyYWRlcy5qcyc7XG5pbXBvcnQge3VuaWRlbnRpZmllZEl0ZW1zfSBmcm9tICcuL3Bhc3MvdW5pZGVudGlmaWVkaXRlbXMuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuL3JvbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtTaG9wVHlwZSwgU2hvcH0gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQgKiBhcyBzbG90cyBmcm9tICcuL3JvbS9zbG90cy5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtoZXgsIHNlcSwgd2F0Y2hBcnJheSwgd3JpdGVMaXR0bGVFbmRpYW59IGZyb20gJy4vcm9tL3V0aWwuanMnO1xuaW1wb3J0ICogYXMgdmVyc2lvbiBmcm9tICcuL3ZlcnNpb24uanMnO1xuaW1wb3J0IHtHcmFwaGljc30gZnJvbSAnLi9yb20vZ3JhcGhpY3MuanMnO1xuaW1wb3J0IHtDb25zdHJhaW50fSBmcm9tICcuL3JvbS9jb25zdHJhaW50LmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9yb20vbW9uc3Rlci5qcyc7XG5cbi8vIFRPRE8gLSB0byBzaHVmZmxlIHRoZSBtb25zdGVycywgd2UgbmVlZCB0byBmaW5kIHRoZSBzcHJpdGUgcGFsdHRlcyBhbmRcbi8vIHBhdHRlcm5zIGZvciBlYWNoIG1vbnN0ZXIuICBFYWNoIGxvY2F0aW9uIHN1cHBvcnRzIHVwIHRvIHR3byBtYXRjaHVwcyxcbi8vIHNvIGNhbiBvbmx5IHN1cHBvcnQgbW9uc3RlcnMgdGhhdCBtYXRjaC4gIE1vcmVvdmVyLCBkaWZmZXJlbnQgbW9uc3RlcnNcbi8vIHNlZW0gdG8gbmVlZCB0byBiZSBpbiBlaXRoZXIgc2xvdCAwIG9yIDEuXG5cbi8vIFB1bGwgaW4gYWxsIHRoZSBwYXRjaGVzIHdlIHdhbnQgdG8gYXBwbHkgYXV0b21hdGljYWxseS5cbi8vIFRPRE8gLSBtYWtlIGEgZGVidWdnZXIgd2luZG93IGZvciBwYXRjaGVzLlxuLy8gVE9ETyAtIHRoaXMgbmVlZHMgdG8gYmUgYSBzZXBhcmF0ZSBub24tY29tcGlsZWQgZmlsZS5cbmV4cG9ydCBkZWZhdWx0ICh7XG4gIGFzeW5jIGFwcGx5KHJvbTogVWludDhBcnJheSwgaGFzaDoge1trZXk6IHN0cmluZ106IHVua25vd259LCBwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBMb29rIGZvciBmbGFnIHN0cmluZyBhbmQgaGFzaFxuICAgIGxldCBmbGFncztcbiAgICBpZiAoIWhhc2guc2VlZCkge1xuICAgICAgLy8gVE9ETyAtIHNlbmQgaW4gYSBoYXNoIG9iamVjdCB3aXRoIGdldC9zZXQgbWV0aG9kc1xuICAgICAgaGFzaC5zZWVkID0gcGFyc2VTZWVkKCcnKS50b1N0cmluZygxNik7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCArPSAnJnNlZWQ9JyArIGhhc2guc2VlZDtcbiAgICB9XG4gICAgaWYgKGhhc2guZmxhZ3MpIHtcbiAgICAgIGZsYWdzID0gbmV3IEZsYWdTZXQoU3RyaW5nKGhhc2guZmxhZ3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmxhZ3MgPSBuZXcgRmxhZ1NldCgnQEZ1bGxTaHVmZmxlJyk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qga2V5IGluIGhhc2gpIHtcbiAgICAgIGlmIChoYXNoW2tleV0gPT09ICdmYWxzZScpIGhhc2hba2V5XSA9IGZhbHNlO1xuICAgIH1cbiAgICBhd2FpdCBzaHVmZmxlKHJvbSwgcGFyc2VTZWVkKFN0cmluZyhoYXNoLnNlZWQpKSwgZmxhZ3MsIG5ldyBGZXRjaFJlYWRlcihwYXRoKSk7XG4gIH0sXG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2VlZChzZWVkOiBzdHJpbmcpOiBudW1iZXIge1xuICBpZiAoIXNlZWQpIHJldHVybiBSYW5kb20ubmV3U2VlZCgpO1xuICBpZiAoL15bMC05YS1mXXsxLDh9JC9pLnRlc3Qoc2VlZCkpIHJldHVybiBOdW1iZXIucGFyc2VJbnQoc2VlZCwgMTYpO1xuICByZXR1cm4gY3JjMzIoc2VlZCk7XG59XG5cbi8qKlxuICogQWJzdHJhY3Qgb3V0IEZpbGUgSS9PLiAgTm9kZSBhbmQgYnJvd3NlciB3aWxsIGhhdmUgY29tcGxldGVseVxuICogZGlmZmVyZW50IGltcGxlbWVudGF0aW9ucy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWFkZXIge1xuICByZWFkKGZpbGVuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz47XG59XG5cbi8vIHByZXZlbnQgdW51c2VkIGVycm9ycyBhYm91dCB3YXRjaEFycmF5IC0gaXQncyB1c2VkIGZvciBkZWJ1Z2dpbmcuXG5jb25zdCB7fSA9IHt3YXRjaEFycmF5fSBhcyBhbnk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaHVmZmxlKHJvbTogVWludDhBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyOiBSZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2c/OiB7c3BvaWxlcj86IFNwb2lsZXJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3M/OiBQcm9ncmVzc1RyYWNrZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAvL3JvbSA9IHdhdGNoQXJyYXkocm9tLCAweDg1ZmEgKyAweDEwKTtcblxuICAvLyBGaXJzdCByZWVuY29kZSB0aGUgc2VlZCwgbWl4aW5nIGluIHRoZSBmbGFncyBmb3Igc2VjdXJpdHkuXG4gIGlmICh0eXBlb2Ygc2VlZCAhPT0gJ251bWJlcicpIHRocm93IG5ldyBFcnJvcignQmFkIHNlZWQnKTtcbiAgY29uc3QgbmV3U2VlZCA9IGNyYzMyKHNlZWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykgKyBTdHJpbmcoZmxhZ3MpKSA+Pj4gMDtcblxuICBjb25zdCB0b3VjaFNob3BzID0gdHJ1ZTtcblxuICBjb25zdCBkZWZpbmVzOiB7W25hbWU6IHN0cmluZ106IGJvb2xlYW59ID0ge1xuICAgIF9BTExPV19URUxFUE9SVF9PVVRfT0ZfQk9TUzogZmxhZ3MuaGFyZGNvcmVNb2RlKCkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzLnNodWZmbGVCb3NzRWxlbWVudHMoKSxcbiAgICBfQUxMT1dfVEVMRVBPUlRfT1VUX09GX1RPV0VSOiB0cnVlLFxuICAgIF9BVVRPX0VRVUlQX0JSQUNFTEVUOiBmbGFncy5hdXRvRXF1aXBCcmFjZWxldCgpLFxuICAgIF9CQVJSSUVSX1JFUVVJUkVTX0NBTE1fU0VBOiBmbGFncy5iYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCksXG4gICAgX0JVRkZfREVPU19QRU5EQU5UOiBmbGFncy5idWZmRGVvc1BlbmRhbnQoKSxcbiAgICBfQlVGRl9EWU5BOiBmbGFncy5idWZmRHluYSgpLCAvLyB0cnVlLFxuICAgIF9DSEVDS19GTEFHMDogdHJ1ZSxcbiAgICBfQ1RSTDFfU0hPUlRDVVRTOiB0cnVlLFxuICAgIF9DVVNUT01fU0hPT1RJTkdfV0FMTFM6IHRydWUsXG4gICAgX0RFQlVHX0RJQUxPRzogc2VlZCA9PT0gMHgxN2JjLFxuICAgIF9ESVNBQkxFX1NIT1BfR0xJVENIOiBmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1NUQVRVRV9HTElUQ0g6IGZsYWdzLmRpc2FibGVTdGF0dWVHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9TV09SRF9DSEFSR0VfR0xJVENIOiBmbGFncy5kaXNhYmxlU3dvcmRDaGFyZ2VHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9UUklHR0VSX1NLSVA6IHRydWUsXG4gICAgX0RJU0FCTEVfV0lMRF9XQVJQOiBmYWxzZSxcbiAgICBfRElTUExBWV9ESUZGSUNVTFRZOiB0cnVlLFxuICAgIF9FWFRSQV9QSVRZX01QOiB0cnVlLCAgLy8gVE9ETzogYWxsb3cgZGlzYWJsaW5nIHRoaXNcbiAgICBfRklYX0NPSU5fU1BSSVRFUzogdHJ1ZSxcbiAgICBfRklYX09QRUxfU1RBVFVFOiB0cnVlLFxuICAgIF9GSVhfU0hBS0lORzogdHJ1ZSxcbiAgICBfRklYX1ZBTVBJUkU6IHRydWUsXG4gICAgX0hBUkRDT1JFX01PREU6IGZsYWdzLmhhcmRjb3JlTW9kZSgpLFxuICAgIF9MRUFUSEVSX0JPT1RTX0dJVkVfU1BFRUQ6IGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpLFxuICAgIF9ORVJGX0ZMSUdIVDogdHJ1ZSxcbiAgICBfTkVSRl9XSUxEX1dBUlA6IGZsYWdzLm5lcmZXaWxkV2FycCgpLFxuICAgIF9ORVZFUl9ESUU6IGZsYWdzLm5ldmVyRGllKCksXG4gICAgX05PUk1BTElaRV9TSE9QX1BSSUNFUzogdG91Y2hTaG9wcyxcbiAgICBfUElUWV9IUF9BTkRfTVA6IHRydWUsXG4gICAgX1BST0dSRVNTSVZFX0JSQUNFTEVUOiB0cnVlLFxuICAgIF9SQUJCSVRfQk9PVFNfQ0hBUkdFX1dISUxFX1dBTEtJTkc6IGZsYWdzLnJhYmJpdEJvb3RzQ2hhcmdlV2hpbGVXYWxraW5nKCksXG4gICAgX1JFUVVJUkVfSEVBTEVEX0RPTFBISU5fVE9fUklERTogZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSxcbiAgICBfUkVWRVJTSUJMRV9TV0FOX0dBVEU6IHRydWUsXG4gICAgX1NBSEFSQV9SQUJCSVRTX1JFUVVJUkVfVEVMRVBBVEhZOiBmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpLFxuICAgIF9TSU1QTElGWV9JTlZJU0lCTEVfQ0hFU1RTOiB0cnVlLFxuICAgIF9URUxFUE9SVF9PTl9USFVOREVSX1NXT1JEOiBmbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCksXG4gICAgX1VOSURFTlRJRklFRF9JVEVNUzogZmxhZ3MudW5pZGVudGlmaWVkSXRlbXMoKSxcbiAgfTtcblxuICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKCk7XG4gIGFzeW5jIGZ1bmN0aW9uIGFzc2VtYmxlKHBhdGg6IHN0cmluZykge1xuICAgIGFzbS5hc3NlbWJsZShhd2FpdCByZWFkZXIucmVhZChwYXRoKSwgcGF0aCk7XG4gICAgYXNtLnBhdGNoUm9tKHJvbSk7XG4gIH1cblxuICBjb25zdCBmbGFnRmlsZSA9XG4gICAgICBPYmplY3Qua2V5cyhkZWZpbmVzKVxuICAgICAgICAgIC5maWx0ZXIoZCA9PiBkZWZpbmVzW2RdKS5tYXAoZCA9PiBgZGVmaW5lICR7ZH0gMVxcbmApLmpvaW4oJycpO1xuICBhc20uYXNzZW1ibGUoZmxhZ0ZpbGUsICdmbGFncy5zJyk7XG4gIGF3YWl0IGFzc2VtYmxlKCdwcmVzaHVmZmxlLnMnKTtcblxuICBjb25zdCByYW5kb20gPSBuZXcgUmFuZG9tKG5ld1NlZWQpO1xuXG4gIC8vIFBhcnNlIHRoZSByb20gYW5kIGFwcGx5IG90aGVyIHBhdGNoZXMgLSBub3RlOiBtdXN0IGhhdmUgc2h1ZmZsZWRcbiAgLy8gdGhlIGRlcGdyYXBoIEZJUlNUIVxuICBjb25zdCBwYXJzZWQgPSBuZXcgUm9tKHJvbSk7XG4gIGlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSAod2luZG93IGFzIGFueSkucm9tID0gcGFyc2VkO1xuICBwYXJzZWQuc3BvaWxlciA9IG5ldyBTcG9pbGVyKHBhcnNlZCk7XG4gIGlmIChsb2cpIGxvZy5zcG9pbGVyID0gcGFyc2VkLnNwb2lsZXI7XG5cbiAgLy8gTWFrZSBkZXRlcm1pbmlzdGljIGNoYW5nZXMuXG4gIGRldGVybWluaXN0aWMocGFyc2VkLCBmbGFncyk7XG5cbiAgLy8gU2V0IHVwIHNob3AgYW5kIHRlbGVwYXRoeVxuICBhd2FpdCBhc3NlbWJsZSgncG9zdHBhcnNlLnMnKTtcbiAgcGFyc2VkLnNjYWxpbmdMZXZlbHMgPSA0ODtcbiAgcGFyc2VkLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBhc20uZXhwYW5kKCdLZXlJdGVtRGF0YScpO1xuXG4gIGlmIChmbGFncy5zaHVmZmxlU2hvcHMoKSkgc2h1ZmZsZVNob3BzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgcmFuZG9taXplV2FsbHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICBpZiAoZmxhZ3MucmFuZG9taXplV2lsZFdhcnAoKSkgc2h1ZmZsZVdpbGRXYXJwKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHJlc2NhbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB1bmlkZW50aWZpZWRJdGVtcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBzaHVmZmxlVHJhZGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlmIChmbGFncy5yYW5kb21pemVNYXBzKCkpIHNodWZmbGVNYXplcyhwYXJzZWQsIHJhbmRvbSk7XG5cbiAgLy8gVGhpcyB3YW50cyB0byBnbyBhcyBsYXRlIGFzIHBvc3NpYmxlIHNpbmNlIHdlIG5lZWQgdG8gcGljayB1cFxuICAvLyBhbGwgdGhlIG5vcm1hbGl6YXRpb24gYW5kIG90aGVyIGhhbmRsaW5nIHRoYXQgaGFwcGVuZWQgYmVmb3JlLlxuICBjb25zdCB3ID0gV29ybGQuYnVpbGQocGFyc2VkLCBmbGFncyk7XG4gIGNvbnN0IGZpbGwgPSBhd2FpdCBuZXcgQXNzdW1lZEZpbGwocGFyc2VkLCBmbGFncykuc2h1ZmZsZSh3LmdyYXBoLCByYW5kb20sIHByb2dyZXNzKTtcbiAgaWYgKGZpbGwpIHtcbiAgICAvLyBjb25zdCBuID0gKGk6IG51bWJlcikgPT4ge1xuICAgIC8vICAgaWYgKGkgPj0gMHg3MCkgcmV0dXJuICdNaW1pYyc7XG4gICAgLy8gICBjb25zdCBpdGVtID0gcGFyc2VkLml0ZW1zW3BhcnNlZC5pdGVtR2V0c1tpXS5pdGVtSWRdO1xuICAgIC8vICAgcmV0dXJuIGl0ZW0gPyBpdGVtLm1lc3NhZ2VOYW1lIDogYGludmFsaWQgJHtpfWA7XG4gICAgLy8gfTtcbiAgICAvLyBjb25zb2xlLmxvZygnaXRlbTogc2xvdCcpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsbC5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgaWYgKGZpbGwuaXRlbXNbaV0gIT0gbnVsbCkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZyhgJCR7aGV4KGkpfSAke24oaSl9OiAke24oZmlsbC5pdGVtc1tpXSl9ICQke2hleChmaWxsLml0ZW1zW2ldKX1gKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgdy50cmF2ZXJzZSh3LmdyYXBoLCBmaWxsKTsgLy8gZmlsbCB0aGUgc3BvaWxlciAobWF5IGFsc28gd2FudCB0byBqdXN0IGJlIGEgc2FuaXR5IGNoZWNrPylcblxuICAgIHNsb3RzLnVwZGF0ZShwYXJzZWQsIGZpbGwuc2xvdHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAtMTtcbiAgICAvL2NvbnNvbGUuZXJyb3IoJ0NPVUxEIE5PVCBGSUxMIScpO1xuICB9XG4gIC8vY29uc29sZS5sb2coJ2ZpbGwnLCBmaWxsKTtcblxuICAvLyBUT0RPIC0gc2V0IG9taXRJdGVtR2V0RGF0YVN1ZmZpeCBhbmQgb21pdExvY2FsRGlhbG9nU3VmZml4XG4gIC8vYXdhaXQgc2h1ZmZsZURlcGdyYXBoKHBhcnNlZCwgcmFuZG9tLCBsb2csIGZsYWdzLCBwcm9ncmVzcyk7XG5cbiAgLy8gVE9ETyAtIHJld3JpdGUgcmVzY2FsZVNob3BzIHRvIHRha2UgYSBSb20gaW5zdGVhZCBvZiBhbiBhcnJheS4uLlxuICBpZiAodG91Y2hTaG9wcykge1xuICAgIC8vIFRPRE8gLSBzZXBhcmF0ZSBsb2dpYyBmb3IgaGFuZGxpbmcgc2hvcHMgdy9vIFBuIHNwZWNpZmllZCAoaS5lLiB2YW5pbGxhXG4gICAgLy8gc2hvcHMgdGhhdCBtYXkgaGF2ZSBiZWVuIHJhbmRvbWl6ZWQpXG4gICAgcmVzY2FsZVNob3BzKHBhcnNlZCwgYXNtLCBmbGFncy5iYXJnYWluSHVudGluZygpID8gcmFuZG9tIDogdW5kZWZpbmVkKTtcbiAgfVxuXG4gIG5vcm1hbGl6ZVN3b3JkcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICAvLyBOT1RFOiBtb25zdGVyIHNodWZmbGUgbmVlZHMgdG8gZ28gYWZ0ZXIgaXRlbSBzaHVmZmxlIGJlY2F1c2Ugb2YgbWltaWNcbiAgLy8gcGxhY2VtZW50IGNvbnN0cmFpbnRzLCBidXQgaXQgd291bGQgYmUgbmljZSB0byBnbyBiZWZvcmUgaW4gb3JkZXIgdG9cbiAgLy8gZ3VhcmFudGVlIG1vbmV5LlxuICBpZiAoZmxhZ3Muc2h1ZmZsZU1vbnN0ZXJzKCkpIHNodWZmbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZGVudGlmeUtleUl0ZW1zRm9yRGlmZmljdWx0eUJ1ZmZzKHBhcnNlZCk7XG5cbiAgLy8gQnVmZiBtZWRpY2FsIGhlcmIgYW5kIGZydWl0IG9mIHBvd2VyXG4gIGlmIChmbGFncy5kb3VibGVCdWZmTWVkaWNhbEhlcmIoKSkge1xuICAgIHJvbVsweDFjNTBjICsgMHgxMF0gKj0gMjsgIC8vIGZydWl0IG9mIHBvd2VyXG4gICAgcm9tWzB4MWM0ZWEgKyAweDEwXSAqPSAzOyAgLy8gbWVkaWNhbCBoZXJiXG4gIH0gZWxzZSBpZiAoZmxhZ3MuYnVmZk1lZGljYWxIZXJiKCkpIHtcbiAgICByb21bMHgxYzUwYyArIDB4MTBdICs9IDE2OyAvLyBmcnVpdCBvZiBwb3dlclxuICAgIHJvbVsweDFjNGVhICsgMHgxMF0gKj0gMjsgIC8vIG1lZGljYWwgaGVyYlxuICB9XG5cbiAgaWYgKGZsYWdzLnN0b3J5TW9kZSgpKSBzdG9yeU1vZGUocGFyc2VkKTtcblxuICBzaHVmZmxlTXVzaWMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgc2h1ZmZsZVBhbGV0dGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIC8vIERvIHRoaXMgKmFmdGVyKiBzaHVmZmxpbmcgcGFsZXR0ZXNcbiAgaWYgKGZsYWdzLmJsYWNrb3V0TW9kZSgpKSBibGFja291dE1vZGUocGFyc2VkKTtcblxuICBtaXNjKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGZpeERpYWxvZyhwYXJzZWQpO1xuXG4gIC8vIE5PVEU6IFRoaXMgbmVlZHMgdG8gaGFwcGVuIEJFRk9SRSBwb3N0c2h1ZmZsZVxuICBpZiAoZmxhZ3MuYnVmZkR5bmEoKSkgYnVmZkR5bmEocGFyc2VkLCBmbGFncyk7IC8vIFRPRE8gLSBjb25kaXRpb25hbFxuICBhd2FpdCBwYXJzZWQud3JpdGVEYXRhKCk7XG4gIGJ1ZmZEeW5hKHBhcnNlZCwgZmxhZ3MpOyAvLyBUT0RPIC0gY29uZGl0aW9uYWxcbiAgY29uc3QgY3JjID0gYXdhaXQgcG9zdFBhcnNlZFNodWZmbGUocm9tLCByYW5kb20sIHNlZWQsIGZsYWdzLCBhc20sIGFzc2VtYmxlKTtcblxuICAvLyBUT0RPIC0gb3B0aW9uYWwgZmxhZ3MgY2FuIHBvc3NpYmx5IGdvIGhlcmUsIGJ1dCBNVVNUIE5PVCB1c2UgcGFyc2VkLnByZyFcblxuICByZXR1cm4gY3JjO1xufVxuXG4vLyBTZXBhcmF0ZSBmdW5jdGlvbiB0byBndWFyYW50ZWUgd2Ugbm8gbG9uZ2VyIGhhdmUgYWNjZXNzIHRvIHRoZSBwYXJzZWQgcm9tLi4uXG5hc3luYyBmdW5jdGlvbiBwb3N0UGFyc2VkU2h1ZmZsZShyb206IFVpbnQ4QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNtOiBBc3NlbWJsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlbWJsZTogKHBhdGg6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGF3YWl0IGFzc2VtYmxlKCdwb3N0c2h1ZmZsZS5zJyk7XG4gIHVwZGF0ZURpZmZpY3VsdHlTY2FsaW5nVGFibGVzKHJvbSwgZmxhZ3MsIGFzbSk7XG4gIHVwZGF0ZUNvaW5Ecm9wcyhyb20sIGZsYWdzKTtcblxuICBzaHVmZmxlUmFuZG9tTnVtYmVycyhyb20sIHJhbmRvbSk7XG5cbiAgcmV0dXJuIHN0YW1wVmVyc2lvblNlZWRBbmRIYXNoKHJvbSwgc2VlZCwgZmxhZ3MpO1xuXG4gIC8vIEJFTE9XIEhFUkUgRk9SIE9QVElPTkFMIEZMQUdTOlxuXG4gIC8vIGRvIGFueSBcInZhbml0eVwiIHBhdGNoZXMgaGVyZS4uLlxuICAvLyBjb25zb2xlLmxvZygncGF0Y2ggYXBwbGllZCcpO1xuICAvLyByZXR1cm4gbG9nLmpvaW4oJ1xcbicpO1xufTtcblxuXG5mdW5jdGlvbiBtaXNjKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pIHtcbiAgY29uc3Qge30gPSB7cm9tLCBmbGFncywgcmFuZG9tfSBhcyBhbnk7XG4gIC8vIE5PVEU6IHdlIHN0aWxsIG5lZWQgdG8gZG8gc29tZSB3b3JrIGFjdHVhbGx5IGFkanVzdGluZ1xuICAvLyBtZXNzYWdlIHRleHRzIHRvIHByZXZlbnQgbGluZSBvdmVyZmxvdywgZXRjLiAgV2Ugc2hvdWxkXG4gIC8vIGFsc28gbWFrZSBzb21lIGhvb2tzIHRvIGVhc2lseSBzd2FwIG91dCBpdGVtcyB3aGVyZSBpdFxuICAvLyBtYWtlcyBzZW5zZS5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzJdWzJdLnRleHQgPSBgXG57MDE6QWthaGFuYX0gaXMgaGFuZGVkIGEgc3RhdHVlLiNcblRoYW5rcyBmb3IgZmluZGluZyB0aGF0LlxuSSB3YXMgdG90YWxseSBnb25uYSBzZWxsXG5pdCBmb3IgdG9ucyBvZiBjYXNoLiNcbkhlcmUsIGhhdmUgdGhpcyBsYW1lXG5bMjk6R2FzIE1hc2tdIG9yIHNvbWV0aGluZy5gO1xuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBhZGQgc29tZSBtb3JlIChoaWdoZXIgbGV2ZWwpIG1hcmt1cCxcbiAgLy8gZS5nLiBgJHtkZXNjcmliZUl0ZW0oc2xvdE51bSl9YC4gIFdlIGNvdWxkIGFsc28gYWRkIG1hcmt1cFxuICAvLyBmb3IgZS5nLiBgJHtzYXlXYW50KHNsb3ROdW0pfWAgYW5kIGAke3NheVRoYW5rcyhzbG90TnVtKX1gXG4gIC8vIGlmIHdlIHNodWZmbGUgdGhlIHdhbnRlZCBpdGVtcy4gIFRoZXNlIGNvdWxkIGJlIHJhbmRvbWl6ZWRcbiAgLy8gaW4gdmFyaW91cyB3YXlzLCBhcyB3ZWxsIGFzIGhhdmluZyBzb21lIGFkZGl0aW9uYWwgYml0cyBsaWtlXG4gIC8vIHdhbnRBdXhpbGlhcnkoLi4uKSBmb3IgZS5nLiBcInRoZSBraXJpc2EgcGxhbnQgaXMgLi4uXCIgLSB0aGVuXG4gIC8vIGl0IGNvdWxkIGluc3RlYWQgc2F5IFwidGhlIHN0YXR1ZSBvZiBvbnl4IGlzIC4uLlwiLlxuICByb20ubWVzc2FnZXMucGFydHNbMF1bMHhlXS50ZXh0ID0gYEl0J3MgZGFuZ2Vyb3VzIHRvIGdvIGFsb25lISBUYWtlIHRoaXMuYDtcbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzBdWzB4ZV0uZml4VGV4dCgpO1xufTtcblxuZnVuY3Rpb24gc2h1ZmZsZVNob3BzKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGNvbnN0IHNob3BzOiB7W3R5cGU6IG51bWJlcl06IHtjb250ZW50czogbnVtYmVyW10sIHNob3BzOiBTaG9wW119fSA9IHtcbiAgICBbU2hvcFR5cGUuQVJNT1JdOiB7Y29udGVudHM6IFtdLCBzaG9wczogW119LFxuICAgIFtTaG9wVHlwZS5UT09MXToge2NvbnRlbnRzOiBbXSwgc2hvcHM6IFtdfSxcbiAgfTtcbiAgLy8gUmVhZCBhbGwgdGhlIGNvbnRlbnRzLlxuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKCFzaG9wLnVzZWQgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmZikgY29udGludWU7XG4gICAgY29uc3QgZGF0YSA9IHNob3BzW3Nob3AudHlwZV07XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIGRhdGEuY29udGVudHMucHVzaCguLi5zaG9wLmNvbnRlbnRzLmZpbHRlcih4ID0+IHggIT09IDB4ZmYpKTtcbiAgICAgIGRhdGEuc2hvcHMucHVzaChzaG9wKTtcbiAgICAgIHNob3AuY29udGVudHMgPSBbXTtcbiAgICB9XG4gIH1cbiAgLy8gU2h1ZmZsZSB0aGUgY29udGVudHMuICBQaWNrIG9yZGVyIHRvIGRyb3AgaXRlbXMgaW4uXG4gIGZvciAoY29uc3QgZGF0YSBvZiBPYmplY3QudmFsdWVzKHNob3BzKSkge1xuICAgIGxldCBzbG90czogU2hvcFtdIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgaXRlbXMgPSBbLi4uZGF0YS5jb250ZW50c107XG4gICAgcmFuZG9tLnNodWZmbGUoaXRlbXMpO1xuICAgIHdoaWxlIChpdGVtcy5sZW5ndGgpIHtcbiAgICAgIGlmICghc2xvdHMgfHwgIXNsb3RzLmxlbmd0aCkge1xuICAgICAgICBpZiAoc2xvdHMpIGl0ZW1zLnNoaWZ0KCk7XG4gICAgICAgIHNsb3RzID0gWy4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHNdO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShzbG90cyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpdGVtID0gaXRlbXNbMF07XG4gICAgICBjb25zdCBzaG9wID0gc2xvdHNbMF07XG4gICAgICBpZiAoc2hvcC5jb250ZW50cy5sZW5ndGggPCA0ICYmICFzaG9wLmNvbnRlbnRzLmluY2x1ZGVzKGl0ZW0pKSB7XG4gICAgICAgIHNob3AuY29udGVudHMucHVzaChpdGVtKTtcbiAgICAgICAgaXRlbXMuc2hpZnQoKTtcbiAgICAgIH1cbiAgICAgIHNsb3RzLnNoaWZ0KCk7XG4gICAgfVxuICB9XG4gIC8vIFNvcnQgYW5kIGFkZCAweGZmJ3NcbiAgZm9yIChjb25zdCBkYXRhIG9mIE9iamVjdC52YWx1ZXMoc2hvcHMpKSB7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIGRhdGEuc2hvcHMpIHtcbiAgICAgIHdoaWxlIChzaG9wLmNvbnRlbnRzLmxlbmd0aCA8IDQpIHNob3AuY29udGVudHMucHVzaCgweGZmKTtcbiAgICAgIHNob3AuY29udGVudHMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByYW5kb21pemVXYWxscyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIC8vIE5PVEU6IFdlIGNhbiBtYWtlIGFueSB3YWxsIHNob290IGJ5IHNldHRpbmcgaXRzICQxMCBiaXQgb24gdGhlIHR5cGUgYnl0ZS5cbiAgLy8gQnV0IHRoaXMgYWxzbyByZXF1aXJlcyBtYXRjaGluZyBwYXR0ZXJuIHRhYmxlcywgc28gd2UnbGwgbGVhdmUgdGhhdCBhbG9uZVxuICAvLyBmb3Igbm93IHRvIGF2b2lkIGdyb3NzIGdyYXBoaWNzLlxuXG4gIC8vIEFsbCBvdGhlciB3YWxscyB3aWxsIG5lZWQgdGhlaXIgdHlwZSBtb3ZlZCBpbnRvIHRoZSB1cHBlciBuaWJibGUgYW5kIHRoZW5cbiAgLy8gdGhlIG5ldyBlbGVtZW50IGdvZXMgaW4gdGhlIGxvd2VyIG5pYmJsZS4gIFNpbmNlIHRoZXJlIGFyZSBzbyBmZXcgaXJvblxuICAvLyB3YWxscywgd2Ugd2lsbCBnaXZlIHRoZW0gYXJiaXRyYXJ5IGVsZW1lbnRzIGluZGVwZW5kZW50IG9mIHRoZSBwYWxldHRlLlxuICAvLyBSb2NrL2ljZSB3YWxscyBjYW4gYWxzbyBoYXZlIGFueSBlbGVtZW50LCBidXQgdGhlIHRoaXJkIHBhbGV0dGUgd2lsbFxuICAvLyBpbmRpY2F0ZSB3aGF0IHRoZXkgZXhwZWN0LlxuXG4gIGlmICghZmxhZ3MucmFuZG9taXplV2FsbHMoKSkgcmV0dXJuO1xuICAvLyBCYXNpYyBwbGFuOiBwYXJ0aXRpb24gYmFzZWQgb24gcGFsZXR0ZSwgbG9vayBmb3Igd2FsbHMuXG4gIGNvbnN0IHBhbHMgPSBbXG4gICAgWzB4MDUsIDB4MzhdLCAvLyByb2NrIHdhbGwgcGFsZXR0ZXNcbiAgICBbMHgxMV0sIC8vIGljZSB3YWxsIHBhbGV0dGVzXG4gICAgWzB4NmFdLCAvLyBcImVtYmVyIHdhbGxcIiBwYWxldHRlc1xuICAgIFsweDE0XSwgLy8gXCJpcm9uIHdhbGxcIiBwYWxldHRlc1xuICBdO1xuXG4gIGZ1bmN0aW9uIHdhbGxUeXBlKHNwYXduOiBTcGF3bik6IG51bWJlciB7XG4gICAgaWYgKHNwYXduLmRhdGFbMl0gJiAweDIwKSB7XG4gICAgICByZXR1cm4gKHNwYXduLmlkID4+PiA0KSAmIDM7XG4gICAgfVxuICAgIHJldHVybiBzcGF3bi5pZCAmIDM7XG4gIH1cblxuICBjb25zdCBwYXJ0aXRpb24gPVxuICAgICAgcm9tLmxvY2F0aW9ucy5wYXJ0aXRpb24obCA9PiBsLnRpbGVQYWxldHRlcy5qb2luKCcgJyksIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gIGZvciAoY29uc3QgW2xvY2F0aW9uc10gb2YgcGFydGl0aW9uKSB7XG4gICAgLy8gcGljayBhIHJhbmRvbSB3YWxsIHR5cGUuXG4gICAgY29uc3QgZWx0ID0gcmFuZG9tLm5leHRJbnQoNCk7XG4gICAgY29uc3QgcGFsID0gcmFuZG9tLnBpY2socGFsc1tlbHRdKTtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIGxvY2F0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHdhbGxUeXBlKHNwYXduKTtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gMikgY29udGludWU7XG4gICAgICAgICAgaWYgKHR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld0VsdCA9IHJhbmRvbS5uZXh0SW50KDQpO1xuICAgICAgICAgICAgaWYgKHJvbS5zcG9pbGVyKSByb20uc3BvaWxlci5hZGRXYWxsKGxvY2F0aW9uLm5hbWUsIHR5cGUsIG5ld0VsdCk7XG4gICAgICAgICAgICBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgICAgICAgICBzcGF3bi5pZCA9IDB4MzAgfCBuZXdFbHQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGAke2xvY2F0aW9uLm5hbWV9ICR7dHlwZX0gPT4gJHtlbHR9YCk7XG4gICAgICAgICAgICBpZiAoIWZvdW5kICYmIHJvbS5zcG9pbGVyKSB7XG4gICAgICAgICAgICAgIHJvbS5zcG9pbGVyLmFkZFdhbGwobG9jYXRpb24ubmFtZSwgdHlwZSwgZWx0KTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgICAgICAgICAgc3Bhd24uaWQgPSB0eXBlIDw8IDQgfCBlbHQ7XG4gICAgICAgICAgICBsb2NhdGlvbi50aWxlUGFsZXR0ZXNbMl0gPSBwYWw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNodWZmbGVNdXNpYyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGlmICghZmxhZ3MucmFuZG9taXplTXVzaWMoKSkgcmV0dXJuO1xuICBpbnRlcmZhY2UgSGFzTXVzaWMgeyBiZ206IG51bWJlcjsgfVxuICBjbGFzcyBCb3NzTXVzaWMgaW1wbGVtZW50cyBIYXNNdXNpYyB7XG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgYWRkcjogbnVtYmVyKSB7fVxuICAgIGdldCBiZ20oKSB7IHJldHVybiByb20ucHJnW3RoaXMuYWRkcl07IH1cbiAgICBzZXQgYmdtKHgpIHsgcm9tLnByZ1t0aGlzLmFkZHJdID0geDsgfVxuICAgIHBhcnRpdGlvbigpOiBQYXJ0aXRpb24geyByZXR1cm4gW1t0aGlzXSwgdGhpcy5iZ21dOyB9XG4gIH1cbiAgdHlwZSBQYXJ0aXRpb24gPSBbSGFzTXVzaWNbXSwgbnVtYmVyXTtcbiAgY29uc3QgYm9zc0FkZHIgPSBbXG4gICAgMHgxZTRiOCwgLy8gdmFtcGlyZSAxXG4gICAgMHgxZTY5MCwgLy8gaW5zZWN0XG4gICAgMHgxZTk5YiwgLy8ga2VsYmVzcXVlXG4gICAgMHgxZWNiMSwgLy8gc2FiZXJhXG4gICAgMHgxZWUwZiwgLy8gbWFkb1xuICAgIDB4MWVmODMsIC8vIGthcm1pbmVcbiAgICAweDFmMTg3LCAvLyBkcmF5Z29uIDFcbiAgICAweDFmMzExLCAvLyBkcmF5Z29uIDJcbiAgICAweDM3YzMwLCAvLyBkeW5hXG4gIF07XG4gIGNvbnN0IHBhcnRpdGlvbnMgPVxuICAgICAgcm9tLmxvY2F0aW9ucy5wYXJ0aXRpb24oKGxvYzogTG9jYXRpb24pID0+IGxvYy5pZCAhPT0gMHg1ZiA/IGxvYy5iZ20gOiAwKVxuICAgICAgICAgIC5maWx0ZXIoKGw6IFBhcnRpdGlvbikgPT4gbFsxXSk7IC8vIGZpbHRlciBvdXQgc3RhcnQgYW5kIGR5bmFcblxuICBjb25zdCBwZWFjZWZ1bDogUGFydGl0aW9uW10gPSBbXTtcbiAgY29uc3QgaG9zdGlsZTogUGFydGl0aW9uW10gPSBbXTtcbiAgY29uc3QgYm9zc2VzOiBQYXJ0aXRpb25bXSA9IGJvc3NBZGRyLm1hcChhID0+IG5ldyBCb3NzTXVzaWMoYSkucGFydGl0aW9uKCkpO1xuXG4gIGZvciAoY29uc3QgcGFydCBvZiBwYXJ0aXRpb25zKSB7XG4gICAgbGV0IG1vbnN0ZXJzID0gMDtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBwYXJ0WzBdKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpKSBtb25zdGVycysrO1xuICAgICAgfVxuICAgIH1cbiAgICAobW9uc3RlcnMgPj0gcGFydFswXS5sZW5ndGggPyBob3N0aWxlIDogcGVhY2VmdWwpLnB1c2gocGFydCk7XG4gIH1cbiAgY29uc3QgZXZlbldlaWdodDogYm9vbGVhbiA9IHRydWU7XG4gIGNvbnN0IGV4dHJhTXVzaWM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgZnVuY3Rpb24gc2h1ZmZsZShwYXJ0czogUGFydGl0aW9uW10pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBwYXJ0cy5tYXAoKHg6IFBhcnRpdGlvbikgPT4geFsxXSk7XG5cbiAgICBpZiAoZXZlbldlaWdodCkge1xuICAgICAgY29uc3QgdXNlZCA9IFsuLi5uZXcgU2V0KHZhbHVlcyldO1xuICAgICAgaWYgKGV4dHJhTXVzaWMpIHVzZWQucHVzaCgweDksIDB4YSwgMHhiLCAweDFhLCAweDFjLCAweDFkKTtcbiAgICAgIGZvciAoY29uc3QgW2xvY3NdIG9mIHBhcnRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdXNlZFtyYW5kb20ubmV4dEludCh1c2VkLmxlbmd0aCldO1xuICAgICAgICBmb3IgKGNvbnN0IGxvYyBvZiBsb2NzKSB7XG4gICAgICAgICAgbG9jLmJnbSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmFuZG9tLnNodWZmbGUodmFsdWVzKTtcbiAgICBmb3IgKGNvbnN0IFtsb2NzXSBvZiBwYXJ0cykge1xuICAgICAgY29uc3QgdmFsdWUgPSB2YWx1ZXMucG9wKCkhO1xuICAgICAgZm9yIChjb25zdCBsb2Mgb2YgbG9jcykge1xuICAgICAgICBsb2MuYmdtID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIHNodWZmbGUocGVhY2VmdWwpO1xuICAvLyBzaHVmZmxlKGhvc3RpbGUpO1xuICAvLyBzaHVmZmxlKGJvc3Nlcyk7XG5cbiAgc2h1ZmZsZShbLi4ucGVhY2VmdWwsIC4uLmhvc3RpbGUsIC4uLmJvc3Nlc10pO1xuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBhbHNvIHNodWZmbGluZyBTRlg/XG4gIC8vICAtIGUuZy4gZmxhaWwgZ3V5IGNvdWxkIG1ha2UgdGhlIGZsYW1lIHNvdW5kP1xufVxuXG5mdW5jdGlvbiBzaHVmZmxlV2lsZFdhcnAocm9tOiBSb20sIF9mbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgY29uc3QgbG9jYXRpb25zOiBMb2NhdGlvbltdID0gW107XG4gIGZvciAoY29uc3QgbCBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgaWYgKGwgJiYgbC51c2VkICYmIGwuaWQgJiYgIWwuZXh0ZW5kZWQgJiYgKGwuaWQgJiAweGY4KSAhPT0gMHg1OCkge1xuICAgICAgbG9jYXRpb25zLnB1c2gobCk7XG4gICAgfVxuICB9XG4gIHJhbmRvbS5zaHVmZmxlKGxvY2F0aW9ucyk7XG4gIHJvbS53aWxkV2FycC5sb2NhdGlvbnMgPSBbXTtcbiAgZm9yIChjb25zdCBsb2Mgb2YgWy4uLmxvY2F0aW9ucy5zbGljZSgwLCAxNSkuc29ydCgoYSwgYikgPT4gYS5pZCAtIGIuaWQpXSkge1xuICAgIHJvbS53aWxkV2FycC5sb2NhdGlvbnMucHVzaChsb2MuaWQpO1xuICAgIGlmIChyb20uc3BvaWxlcikgcm9tLnNwb2lsZXIuYWRkV2lsZFdhcnAobG9jLmlkLCBsb2MubmFtZSk7XG4gIH1cbiAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucy5wdXNoKDApO1xufVxuXG5mdW5jdGlvbiBidWZmRHluYShyb206IFJvbSwgX2ZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIHJvbS5vYmplY3RzWzB4YjhdLmNvbGxpc2lvblBsYW5lID0gMTtcbiAgcm9tLm9iamVjdHNbMHhiOF0uaW1tb2JpbGUgPSB0cnVlO1xuICByb20ub2JqZWN0c1sweGI5XS5jb2xsaXNpb25QbGFuZSA9IDE7XG4gIHJvbS5vYmplY3RzWzB4YjldLmltbW9iaWxlID0gdHJ1ZTtcbiAgcm9tLm9iamVjdHNbMHgzM10uY29sbGlzaW9uUGxhbmUgPSAyO1xuICByb20uYWRIb2NTcGF3bnNbMHgyOF0uc2xvdFJhbmdlTG93ZXIgPSAweDFjOyAvLyBjb3VudGVyXG4gIHJvbS5hZEhvY1NwYXduc1sweDI5XS5zbG90UmFuZ2VVcHBlciA9IDB4MWM7IC8vIGxhc2VyXG4gIHJvbS5hZEhvY1NwYXduc1sweDJhXS5zbG90UmFuZ2VVcHBlciA9IDB4MWM7IC8vIGJ1YmJsZVxufVxuXG5mdW5jdGlvbiBibGFja291dE1vZGUocm9tOiBSb20pIHtcbiAgY29uc3QgZGcgPSBnZW5lcmF0ZURlcGdyYXBoKCk7XG4gIGZvciAoY29uc3Qgbm9kZSBvZiBkZy5ub2Rlcykge1xuICAgIGNvbnN0IHR5cGUgPSAobm9kZSBhcyBhbnkpLnR5cGU7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09ICdMb2NhdGlvbicgJiYgKHR5cGUgPT09ICdjYXZlJyB8fCB0eXBlID09PSAnZm9ydHJlc3MnKSkge1xuICAgICAgcm9tLmxvY2F0aW9uc1sobm9kZSBhcyBhbnkpLmlkXS50aWxlUGFsZXR0ZXMuZmlsbCgweDlhKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3Qgc3RvcnlNb2RlID0gKHJvbTogUm9tKSA9PiB7XG4gIC8vIHNodWZmbGUgaGFzIGFscmVhZHkgaGFwcGVuZWQsIG5lZWQgdG8gdXNlIHNodWZmbGVkIGZsYWdzIGZyb21cbiAgLy8gTlBDIHNwYXduIGNvbmRpdGlvbnMuLi5cbiAgY29uc3QgY29uZGl0aW9ucyA9IFtcbiAgICAvLyBOb3RlOiBpZiBib3NzZXMgYXJlIHNodWZmbGVkIHdlJ2xsIG5lZWQgdG8gZGV0ZWN0IHRoaXMuLi5cbiAgICB+cm9tLm5wY3NbMHhjMl0uc3Bhd25Db25kaXRpb25zLmdldCgweDI4KSFbMF0sIC8vIEtlbGJlc3F1ZSAxXG4gICAgfnJvbS5ucGNzWzB4ODRdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHg2ZSkhWzBdLCAvLyBTYWJlcmEgMVxuICAgIH5yb20udHJpZ2dlcigweDlhKS5jb25kaXRpb25zWzFdLCAvLyBNYWRvIDFcbiAgICB+cm9tLm5wY3NbMHhjNV0uc3Bhd25Db25kaXRpb25zLmdldCgweGE5KSFbMF0sIC8vIEtlbGJlc3F1ZSAyXG4gICAgfnJvbS5ucGNzWzB4YzZdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhhYykhWzBdLCAvLyBTYWJlcmEgMlxuICAgIH5yb20ubnBjc1sweGM3XS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YjkpIVswXSwgLy8gTWFkbyAyXG4gICAgfnJvbS5ucGNzWzB4YzhdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhiNikhWzBdLCAvLyBLYXJtaW5lXG4gICAgfnJvbS5ucGNzWzB4Y2JdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHg5ZikhWzBdLCAvLyBEcmF5Z29uIDFcbiAgICAweDIwMCwgLy8gU3dvcmQgb2YgV2luZFxuICAgIDB4MjAxLCAvLyBTd29yZCBvZiBGaXJlXG4gICAgMHgyMDIsIC8vIFN3b3JkIG9mIFdhdGVyXG4gICAgMHgyMDMsIC8vIFN3b3JkIG9mIFRodW5kZXJcbiAgICAvLyBUT0RPIC0gc3RhdHVlcyBvZiBtb29uIGFuZCBzdW4gbWF5IGJlIHJlbGV2YW50IGlmIGVudHJhbmNlIHNodWZmbGU/XG4gICAgLy8gVE9ETyAtIHZhbXBpcmVzIGFuZCBpbnNlY3Q/XG4gIF07XG4gIHJvbS5ucGNzWzB4Y2JdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhhNikhLnB1c2goLi4uY29uZGl0aW9ucyk7XG59O1xuXG4vLyBTdGFtcCB0aGUgUk9NXG5leHBvcnQgZnVuY3Rpb24gc3RhbXBWZXJzaW9uU2VlZEFuZEhhc2gocm9tOiBVaW50OEFycmF5LCBzZWVkOiBudW1iZXIsIGZsYWdzOiBGbGFnU2V0KTogbnVtYmVyIHtcbiAgLy8gVXNlIHVwIHRvIDI2IGJ5dGVzIHN0YXJ0aW5nIGF0IFBSRyAkMjVlYThcbiAgLy8gV291bGQgYmUgbmljZSB0byBzdG9yZSAoMSkgY29tbWl0LCAoMikgZmxhZ3MsICgzKSBzZWVkLCAoNCkgaGFzaFxuICAvLyBXZSBjYW4gdXNlIGJhc2U2NCBlbmNvZGluZyB0byBoZWxwIHNvbWUuLi5cbiAgLy8gRm9yIG5vdyBqdXN0IHN0aWNrIGluIHRoZSBjb21taXQgYW5kIHNlZWQgaW4gc2ltcGxlIGhleFxuICBjb25zdCBjcmMgPSBjcmMzMihyb20pO1xuICBjb25zdCBjcmNTdHJpbmcgPSBjcmMudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgaGFzaCA9IHZlcnNpb24uU1RBVFVTID09PSAndW5zdGFibGUnID9cbiAgICAgIHZlcnNpb24uSEFTSC5zdWJzdHJpbmcoMCwgNykucGFkU3RhcnQoNywgJzAnKS50b1VwcGVyQ2FzZSgpICsgJyAgICAgJyA6XG4gICAgICB2ZXJzaW9uLlZFUlNJT04uc3Vic3RyaW5nKDAsIDEyKS5wYWRFbmQoMTIsICcgJyk7XG4gIGNvbnN0IHNlZWRTdHIgPSBzZWVkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IGVtYmVkID0gKGFkZHI6IG51bWJlciwgdGV4dDogc3RyaW5nKSA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICByb21bYWRkciArIDB4MTAgKyBpXSA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IGludGVyY2FsYXRlID0gKHMxOiBzdHJpbmcsIHMyOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgczEubGVuZ3RoIHx8IGkgPCBzMi5sZW5ndGg7IGkrKykge1xuICAgICAgb3V0LnB1c2goczFbaV0gfHwgJyAnKTtcbiAgICAgIG91dC5wdXNoKHMyW2ldIHx8ICcgJyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignJyk7XG4gIH07XG5cbiAgZW1iZWQoMHgyNzdjZiwgaW50ZXJjYWxhdGUoJyAgVkVSU0lPTiAgICAgU0VFRCAgICAgICcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAgICR7aGFzaH0ke3NlZWRTdHJ9YCkpO1xuICBsZXQgZmxhZ1N0cmluZyA9IFN0cmluZyhmbGFncyk7XG5cbiAgLy8gaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gMzYpIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnJlcGxhY2UoLyAvZywgJycpO1xuICBsZXQgZXh0cmFGbGFncztcbiAgaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gNDYpIHtcbiAgICBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiA5MikgdGhyb3cgbmV3IEVycm9yKCdGbGFnIHN0cmluZyB3YXkgdG9vIGxvbmchJyk7XG4gICAgZXh0cmFGbGFncyA9IGZsYWdTdHJpbmcuc3Vic3RyaW5nKDQ2LCA5MikucGFkRW5kKDQ2LCAnICcpO1xuICAgIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnN1YnN0cmluZygwLCA0Nik7XG4gIH1cbiAgLy8gaWYgKGZsYWdTdHJpbmcubGVuZ3RoIDw9IDM2KSB7XG4gIC8vICAgLy8gYXR0ZW1wdCB0byBicmVhayBpdCBtb3JlIGZhdm9yYWJseVxuXG4gIC8vIH1cbiAgLy8gICBmbGFnU3RyaW5nID0gWydGTEFHUyAnLFxuICAvLyAgICAgICAgICAgICAgICAgZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgMTgpLnBhZEVuZCgxOCwgJyAnKSxcbiAgLy8gICAgICAgICAgICAgICAgICcgICAgICAnLFxuXG4gIC8vIH1cblxuICBmbGFnU3RyaW5nID0gZmxhZ1N0cmluZy5wYWRFbmQoNDYsICcgJyk7XG5cbiAgZW1iZWQoMHgyNzdmZiwgaW50ZXJjYWxhdGUoZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgMjMpLCBmbGFnU3RyaW5nLnN1YnN0cmluZygyMykpKTtcbiAgaWYgKGV4dHJhRmxhZ3MpIHtcbiAgICBlbWJlZCgweDI3ODJmLCBpbnRlcmNhbGF0ZShleHRyYUZsYWdzLnN1YnN0cmluZygwLCAyMyksIGV4dHJhRmxhZ3Muc3Vic3RyaW5nKDIzKSkpO1xuICB9XG5cbiAgZW1iZWQoMHgyNzg4NSwgaW50ZXJjYWxhdGUoY3JjU3RyaW5nLnN1YnN0cmluZygwLCA0KSwgY3JjU3RyaW5nLnN1YnN0cmluZyg0KSkpO1xuXG4gIC8vIGVtYmVkKDB4MjVlYTgsIGB2LiR7aGFzaH0gICAke3NlZWR9YCk7XG4gIGVtYmVkKDB4MjU3MTYsICdSQU5ET01JWkVSJyk7XG4gIGlmICh2ZXJzaW9uLlNUQVRVUyA9PT0gJ3Vuc3RhYmxlJykgZW1iZWQoMHgyNTczYywgJ0JFVEEnKTtcbiAgLy8gTk9URTogaXQgd291bGQgYmUgcG9zc2libGUgdG8gYWRkIHRoZSBoYXNoL3NlZWQvZXRjIHRvIHRoZSB0aXRsZVxuICAvLyBwYWdlIGFzIHdlbGwsIGJ1dCB3ZSdkIG5lZWQgdG8gcmVwbGFjZSB0aGUgdW51c2VkIGxldHRlcnMgaW4gYmFua1xuICAvLyAkMWQgd2l0aCB0aGUgbWlzc2luZyBudW1iZXJzIChKLCBRLCBXLCBYKSwgYXMgd2VsbCBhcyB0aGUgdHdvXG4gIC8vIHdlaXJkIHNxdWFyZXMgYXQgJDViIGFuZCAkNWMgdGhhdCBkb24ndCBhcHBlYXIgdG8gYmUgdXNlZC4gIFRvZ2V0aGVyXG4gIC8vIHdpdGggdXNpbmcgdGhlIGxldHRlciAnTycgYXMgMCwgdGhhdCdzIHN1ZmZpY2llbnQgdG8gY3JhbSBpbiBhbGwgdGhlXG4gIC8vIG51bWJlcnMgYW5kIGRpc3BsYXkgYXJiaXRyYXJ5IGhleCBkaWdpdHMuXG5cbiAgcmV0dXJuIGNyYztcbn07XG5cbmNvbnN0IHBhdGNoQnl0ZXMgPSAocm9tOiBVaW50OEFycmF5LCBhZGRyZXNzOiBudW1iZXIsIGJ5dGVzOiBudW1iZXJbXSkgPT4ge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgcm9tW2FkZHJlc3MgKyBpXSA9IGJ5dGVzW2ldO1xuICB9XG59O1xuXG5jb25zdCBwYXRjaFdvcmRzID0gKHJvbTogVWludDhBcnJheSwgYWRkcmVzczogbnVtYmVyLCB3b3JkczogbnVtYmVyW10pID0+IHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAyICogd29yZHMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByb21bYWRkcmVzcyArIGldID0gd29yZHNbaSA+Pj4gMV0gJiAweGZmO1xuICAgIHJvbVthZGRyZXNzICsgaSArIDFdID0gd29yZHNbaSA+Pj4gMV0gPj4+IDg7XG4gIH1cbn07XG5cbi8vIGdvZXMgd2l0aCBlbmVteSBzdGF0IHJlY29tcHV0YXRpb25zIGluIHBvc3RzaHVmZmxlLnNcbmNvbnN0IHVwZGF0ZUNvaW5Ecm9wcyA9IChyb206IFVpbnQ4QXJyYXksIGZsYWdzOiBGbGFnU2V0KSA9PiB7XG4gIHJvbSA9IHJvbS5zdWJhcnJheSgweDEwKTtcbiAgaWYgKGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCkpIHtcbiAgICAvLyBiaWdnZXIgZ29sZCBkcm9wcyBpZiBubyBzaG9wIGdsaXRjaCwgcGFydGljdWxhcmx5IGF0IHRoZSBzdGFydFxuICAgIC8vIC0gc3RhcnRzIG91dCBmaWJvbmFjY2ksIHRoZW4gZ29lcyBsaW5lYXIgYXQgNjAwXG4gICAgcGF0Y2hXb3Jkcyhyb20sIDB4MzRiZGUsIFtcbiAgICAgICAgMCwgICA1LCAgMTAsICAxNSwgIDI1LCAgNDAsICA2NSwgIDEwNSxcbiAgICAgIDE3MCwgMjc1LCA0NDUsIDYwMCwgNzAwLCA4MDAsIDkwMCwgMTAwMCxcbiAgICBdKTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0aGlzIHRhYmxlIGlzIGJhc2ljYWxseSBtZWFuaW5nbGVzcyBiL2Mgc2hvcCBnbGl0Y2hcbiAgICBwYXRjaFdvcmRzKHJvbSwgMHgzNGJkZSwgW1xuICAgICAgICAwLCAgIDEsICAgMiwgICA0LCAgIDgsICAxNiwgIDMwLCAgNTAsXG4gICAgICAxMDAsIDIwMCwgMzAwLCA0MDAsIDUwMCwgNjAwLCA3MDAsIDgwMCxcbiAgICBdKTtcbiAgfVxufTtcblxuLy8gZ29lcyB3aXRoIGVuZW15IHN0YXQgcmVjb21wdXRhdGlvbnMgaW4gcG9zdHNodWZmbGUuc1xuY29uc3QgdXBkYXRlRGlmZmljdWx0eVNjYWxpbmdUYWJsZXMgPSAocm9tOiBVaW50OEFycmF5LCBmbGFnczogRmxhZ1NldCwgYXNtOiBBc3NlbWJsZXIpID0+IHtcbiAgcm9tID0gcm9tLnN1YmFycmF5KDB4MTApO1xuXG4gIC8vIEN1cnJlbnRseSB0aGlzIGlzIHRocmVlICQzMC1ieXRlIHRhYmxlcywgd2hpY2ggd2Ugc3RhcnQgYXQgdGhlIGJlZ2lubmluZ1xuICAvLyBvZiB0aGUgcG9zdHNodWZmbGUgQ29tcHV0ZUVuZW15U3RhdHMuXG4gIGNvbnN0IGRpZmYgPSBzZXEoNDgsIHggPT4geCk7XG5cbiAgLy8gUEF0ayA9IDUgKyBEaWZmICogMTUvMzJcbiAgLy8gRGlmZkF0ayB0YWJsZSBpcyA4ICogUEF0ayA9IHJvdW5kKDQwICsgKERpZmYgKiAxNSAvIDQpKVxuICBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkF0aycpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg0MCArIGQgKiAxNSAvIDQpKSk7XG5cbiAgLy8gTk9URTogT2xkIERpZmZEZWYgdGFibGUgKDQgKiBQRGVmKSB3YXMgMTIgKyBEaWZmICogMywgYnV0IHdlIG5vIGxvbmdlclxuICAvLyB1c2UgdGhpcyB0YWJsZSBzaW5jZSBuZXJmaW5nIGFybW9ycy5cbiAgLy8gKFBEZWYgPSAzICsgRGlmZiAqIDMvNClcbiAgLy8gcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZEZWYnKSxcbiAgLy8gICAgICAgICAgICBkaWZmLm1hcChkID0+IDEyICsgZCAqIDMpKTtcblxuICAvLyBOT1RFOiBUaGlzIGlzIHRoZSBhcm1vci1uZXJmZWQgRGlmZkRlZiB0YWJsZS5cbiAgLy8gUERlZiA9IDIgKyBEaWZmIC8gMlxuICAvLyBEaWZmRGVmIHRhYmxlIGlzIDQgKiBQRGVmID0gOCArIERpZmYgKiAyXG4gIC8vIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmRGVmJyksXG4gIC8vICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiA4ICsgZCAqIDIpKTtcblxuICAvLyBOT1RFOiBGb3IgYXJtb3IgY2FwIGF0IDMgKiBMdmwsIHNldCBQRGVmID0gRGlmZlxuICBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkRlZicpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gZCAqIDQpKTtcblxuICAvLyBEaWZmSFAgdGFibGUgaXMgUEhQID0gbWluKDI1NSwgNDggKyByb3VuZChEaWZmICogMTEgLyAyKSlcbiAgY29uc3QgcGhwU3RhcnQgPSBmbGFncy5kZWNyZWFzZUVuZW15RGFtYWdlKCkgPyAxNiA6IDQ4O1xuICBjb25zdCBwaHBJbmNyID0gZmxhZ3MuZGVjcmVhc2VFbmVteURhbWFnZSgpID8gNiA6IDUuNTtcbiAgcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZIUCcpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5taW4oMjU1LCBwaHBTdGFydCArIE1hdGgucm91bmQoZCAqIHBocEluY3IpKSkpO1xuXG4gIC8vIERpZmZFeHAgdGFibGUgaXMgRXhwQiA9IGNvbXByZXNzKGZsb29yKDQgKiAoMiAqKiAoKDE2ICsgOSAqIERpZmYpIC8gMzIpKSkpXG4gIC8vIHdoZXJlIGNvbXByZXNzIG1hcHMgdmFsdWVzID4gMTI3IHRvICQ4MHwoeD4+NClcblxuICBjb25zdCBleHBGYWN0b3IgPSBmbGFncy5leHBTY2FsaW5nRmFjdG9yKCk7XG4gIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmRXhwJyksIGRpZmYubWFwKGQgPT4ge1xuICAgIGNvbnN0IGV4cCA9IE1hdGguZmxvb3IoNCAqICgyICoqICgoMTYgKyA5ICogZCkgLyAzMikpICogZXhwRmFjdG9yKTtcbiAgICByZXR1cm4gZXhwIDwgMHg4MCA/IGV4cCA6IE1hdGgubWluKDB4ZmYsIDB4ODAgKyAoZXhwID4+IDQpKTtcbiAgfSkpO1xuXG4gIC8vIC8vIEhhbHZlIHNoaWVsZCBhbmQgYXJtb3IgZGVmZW5zZSB2YWx1ZXNcbiAgLy8gcGF0Y2hCeXRlcyhyb20sIDB4MzRiYzAsIFtcbiAgLy8gICAvLyBBcm1vciBkZWZlbnNlXG4gIC8vICAgMCwgMSwgMywgNSwgNywgOSwgMTIsIDEwLCAxNixcbiAgLy8gICAvLyBTaGllbGQgZGVmZW5zZVxuICAvLyAgIDAsIDEsIDMsIDQsIDYsIDksIDgsIDEyLCAxNixcbiAgLy8gXSk7XG5cbiAgLy8gQWRqdXN0IHNoaWVsZCBhbmQgYXJtb3IgZGVmZW5zZSB2YWx1ZXNcbiAgcGF0Y2hCeXRlcyhyb20sIDB4MzRiYzAsIFtcbiAgICAvLyBBcm1vciBkZWZlbnNlXG4gICAgMCwgMiwgNiwgMTAsIDE0LCAxOCwgMzIsIDI0LCAyMCxcbiAgICAvLyBTaGllbGQgZGVmZW5zZVxuICAgIDAsIDIsIDYsIDEwLCAxNCwgMTgsIDE2LCAzMiwgMjAsXG4gIF0pO1xufTtcblxuY29uc3QgcmVzY2FsZVNob3BzID0gKHJvbTogUm9tLCBhc206IEFzc2VtYmxlciwgcmFuZG9tPzogUmFuZG9tKSA9PiB7XG4gIC8vIFBvcHVsYXRlIHJlc2NhbGVkIHByaWNlcyBpbnRvIHRoZSB2YXJpb3VzIHJvbSBsb2NhdGlvbnMuXG4gIC8vIFNwZWNpZmljYWxseSwgd2UgcmVhZCB0aGUgYXZhaWxhYmxlIGl0ZW0gSURzIG91dCBvZiB0aGVcbiAgLy8gc2hvcCB0YWJsZXMgYW5kIHRoZW4gY29tcHV0ZSBuZXcgcHJpY2VzIGZyb20gdGhlcmUuXG4gIC8vIElmIGByYW5kb21gIGlzIHBhc3NlZCB0aGVuIHRoZSBiYXNlIHByaWNlIHRvIGJ1eSBlYWNoXG4gIC8vIGl0ZW0gYXQgYW55IGdpdmVuIHNob3Agd2lsbCBiZSBhZGp1c3RlZCB0byBhbnl3aGVyZSBmcm9tXG4gIC8vIDUwJSB0byAxNTAlIG9mIHRoZSBiYXNlIHByaWNlLiAgVGhlIHBhd24gc2hvcCBwcmljZSBpc1xuICAvLyBhbHdheXMgNTAlIG9mIHRoZSBiYXNlIHByaWNlLlxuXG4gIHJvbS5zaG9wQ291bnQgPSAxMTsgLy8gMTEgb2YgYWxsIHR5cGVzIG9mIHNob3AgZm9yIHNvbWUgcmVhc29uLlxuICByb20uc2hvcERhdGFUYWJsZXNBZGRyZXNzID0gYXNtLmV4cGFuZCgnU2hvcERhdGEnKTtcblxuICAvLyBOT1RFOiBUaGlzIGlzbid0IGluIHRoZSBSb20gb2JqZWN0IHlldC4uLlxuICB3cml0ZUxpdHRsZUVuZGlhbihyb20ucHJnLCBhc20uZXhwYW5kKCdJbm5CYXNlUHJpY2UnKSwgMjApO1xuXG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoc2hvcC50eXBlID09PSBTaG9wVHlwZS5QQVdOKSBjb250aW51ZTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2hvcC5wcmljZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldIDwgMHg4MCkge1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IHJhbmRvbSA/IHJhbmRvbS5uZXh0Tm9ybWFsKDEsIDAuMywgMC41LCAxLjUpIDogMTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5JTk4pIHtcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8ganVzdCBzZXQgdGhlIG9uZSBwcmljZVxuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IHJhbmRvbSA/IHJhbmRvbS5uZXh0Tm9ybWFsKDEsIDAuNSwgMC4zNzUsIDEuNjI1KSA6IDE7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQWxzbyBmaWxsIHRoZSBzY2FsaW5nIHRhYmxlcy5cbiAgY29uc3QgZGlmZiA9IHNlcSg0OCwgeCA9PiB4KTtcbiAgLy8gVG9vbCBzaG9wcyBzY2FsZSBhcyAyICoqIChEaWZmIC8gMTApLCBzdG9yZSBpbiA4dGhzXG4gIHBhdGNoQnl0ZXMocm9tLnByZywgYXNtLmV4cGFuZCgnVG9vbFNob3BTY2FsaW5nJyksXG4gICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDggKiAoMiAqKiAoZCAvIDEwKSkpKSk7XG4gIC8vIEFybW9yIHNob3BzIHNjYWxlIGFzIDIgKiogKCg0NyAtIERpZmYpIC8gMTIpLCBzdG9yZSBpbiA4dGhzXG4gIHBhdGNoQnl0ZXMocm9tLnByZywgYXNtLmV4cGFuZCgnQXJtb3JTaG9wU2NhbGluZycpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg4ICogKDIgKiogKCg0NyAtIGQpIC8gMTIpKSkpKTtcblxuICAvLyBTZXQgdGhlIGl0ZW0gYmFzZSBwcmljZXMuXG4gIGZvciAobGV0IGkgPSAweDBkOyBpIDwgMHgyNzsgaSsrKSB7XG4gICAgcm9tLml0ZW1zW2ldLmJhc2VQcmljZSA9IEJBU0VfUFJJQ0VTW2ldO1xuICB9XG5cbiAgLy8gVE9ETyAtIHNlcGFyYXRlIGZsYWcgZm9yIHJlc2NhbGluZyBtb25zdGVycz8/P1xufTtcblxuLy8gTWFwIG9mIGJhc2UgcHJpY2VzLiAgKFRvb2xzIGFyZSBwb3NpdGl2ZSwgYXJtb3JzIGFyZSBvbmVzLWNvbXBsZW1lbnQuKVxuY29uc3QgQkFTRV9QUklDRVM6IHtbaXRlbUlkOiBudW1iZXJdOiBudW1iZXJ9ID0ge1xuICAvLyBBcm1vcnNcbiAgMHgwZDogNCwgICAgLy8gY2FyYXBhY2Ugc2hpZWxkXG4gIDB4MGU6IDE2LCAgIC8vIGJyb256ZSBzaGllbGRcbiAgMHgwZjogNTAsICAgLy8gcGxhdGludW0gc2hpZWxkXG4gIDB4MTA6IDMyNSwgIC8vIG1pcnJvcmVkIHNoaWVsZFxuICAweDExOiAxMDAwLCAvLyBjZXJhbWljIHNoaWVsZFxuICAweDEyOiAyMDAwLCAvLyBzYWNyZWQgc2hpZWxkXG4gIDB4MTM6IDQwMDAsIC8vIGJhdHRsZSBzaGllbGRcbiAgMHgxNTogNiwgICAgLy8gdGFubmVkIGhpZGVcbiAgMHgxNjogMjAsICAgLy8gbGVhdGhlciBhcm1vclxuICAweDE3OiA3NSwgICAvLyBicm9uemUgYXJtb3JcbiAgMHgxODogMjUwLCAgLy8gcGxhdGludW0gYXJtb3JcbiAgMHgxOTogMTAwMCwgLy8gc29sZGllciBzdWl0XG4gIDB4MWE6IDQ4MDAsIC8vIGNlcmFtaWMgc3VpdFxuICAvLyBUb29sc1xuICAweDFkOiAyNSwgICAvLyBtZWRpY2FsIGhlcmJcbiAgMHgxZTogMzAsICAgLy8gYW50aWRvdGVcbiAgMHgxZjogNDUsICAgLy8gbHlzaXMgcGxhbnRcbiAgMHgyMDogNDAsICAgLy8gZnJ1aXQgb2YgbGltZVxuICAweDIxOiAzNiwgICAvLyBmcnVpdCBvZiBwb3dlclxuICAweDIyOiAyMDAsICAvLyBtYWdpYyByaW5nXG4gIDB4MjM6IDE1MCwgIC8vIGZydWl0IG9mIHJlcHVuXG4gIDB4MjQ6IDgwLCAgIC8vIHdhcnAgYm9vdHNcbiAgMHgyNjogMzAwLCAgLy8gb3BlbCBzdGF0dWVcbiAgLy8gMHgzMTogNTAsIC8vIGFsYXJtIGZsdXRlXG59O1xuXG4vLy8vLy8vLy9cbi8vLy8vLy8vL1xuLy8vLy8vLy8vXG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN3b3Jkcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKSB7XG4gIC8vIFRPRE8gLSBmbGFncyB0byByYW5kb21pemUgc3dvcmQgZGFtYWdlP1xuICBjb25zdCB7fSA9IHtmbGFncywgcmFuZG9tfSBhcyBhbnk7XG5cbiAgLy8gd2luZCAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyB3aW5kIDIgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiA2XG4gIC8vIHdpbmQgMyA9PiAyLTMgaGl0cyA4TVAgICAgICAgID0+IDhcblxuICAvLyBmaXJlIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIGZpcmUgMiA9PiAzIGhpdHMgICAgICAgICAgICAgID0+IDVcbiAgLy8gZmlyZSAzID0+IDQtNiBoaXRzIDE2TVAgICAgICAgPT4gN1xuXG4gIC8vIHdhdGVyIDEgPT4gMSBoaXQgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2F0ZXIgMiA9PiAxLTIgaGl0cyAgICAgICAgICAgPT4gNlxuICAvLyB3YXRlciAzID0+IDMtNiBoaXRzIDE2TVAgICAgICA9PiA4XG5cbiAgLy8gdGh1bmRlciAxID0+IDEtMiBoaXRzIHNwcmVhZCAgPT4gM1xuICAvLyB0aHVuZGVyIDIgPT4gMS0zIGhpdHMgc3ByZWFkICA9PiA1XG4gIC8vIHRodW5kZXIgMyA9PiA3LTEwIGhpdHMgNDBNUCAgID0+IDdcblxuICByb20ub2JqZWN0c1sweDEwXS5hdGsgPSAzOyAvLyB3aW5kIDFcbiAgcm9tLm9iamVjdHNbMHgxMV0uYXRrID0gNjsgLy8gd2luZCAyXG4gIHJvbS5vYmplY3RzWzB4MTJdLmF0ayA9IDg7IC8vIHdpbmQgM1xuXG4gIHJvbS5vYmplY3RzWzB4MThdLmF0ayA9IDM7IC8vIGZpcmUgMVxuICByb20ub2JqZWN0c1sweDEzXS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxOV0uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTddLmF0ayA9IDc7IC8vIGZpcmUgM1xuICByb20ub2JqZWN0c1sweDFhXS5hdGsgPSA3OyAvLyBmaXJlIDNcblxuICByb20ub2JqZWN0c1sweDE0XS5hdGsgPSAzOyAvLyB3YXRlciAxXG4gIHJvbS5vYmplY3RzWzB4MTVdLmF0ayA9IDY7IC8vIHdhdGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxNl0uYXRrID0gODsgLy8gd2F0ZXIgM1xuXG4gIHJvbS5vYmplY3RzWzB4MWNdLmF0ayA9IDM7IC8vIHRodW5kZXIgMVxuICByb20ub2JqZWN0c1sweDFlXS5hdGsgPSA1OyAvLyB0aHVuZGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxYl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG4gIHJvbS5vYmplY3RzWzB4MWZdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xufVxuXG5mdW5jdGlvbiByZXNjYWxlTW9uc3RlcnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuXG4gIC8vIFRPRE8gLSBmaW5kIGFueXRoaW5nIHNoYXJpbmcgdGhlIHNhbWUgbWVtb3J5IGFuZCB1cGRhdGUgdGhlbSBhcyB3ZWxsXG4gIGNvbnN0IHVuc2NhbGVkTW9uc3RlcnMgPVxuICAgICAgbmV3IFNldDxudW1iZXI+KHNlcSgweDEwMCwgeCA9PiB4KS5maWx0ZXIocyA9PiBzIGluIHJvbS5vYmplY3RzKSk7XG4gIGZvciAoY29uc3QgW2lkXSBvZiBTQ0FMRURfTU9OU1RFUlMpIHtcbiAgICB1bnNjYWxlZE1vbnN0ZXJzLmRlbGV0ZShpZCk7XG4gIH1cbiAgZm9yIChjb25zdCBbaWQsIG1vbnN0ZXJdIG9mIFNDQUxFRF9NT05TVEVSUykge1xuICAgIGZvciAoY29uc3Qgb3RoZXIgb2YgdW5zY2FsZWRNb25zdGVycykge1xuICAgICAgaWYgKHJvbS5vYmplY3RzW2lkXS5iYXNlID09PSByb20ub2JqZWN0c1tvdGhlcl0uYmFzZSkge1xuICAgICAgICBTQ0FMRURfTU9OU1RFUlMuc2V0KG90aGVyLCBtb25zdGVyKTtcbiAgICAgICAgdW5zY2FsZWRNb25zdGVycy5kZWxldGUoaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEZsYWlscyAoZjksIGZhKSBhbmQgU2FiZXJhIDIncyBmaXJlYmFsbHMgKGM4KSBzaG91bGQgYmUgcHJvamVjdGlsZXMuXG4gIC8vIE1vcmVvdmVyLCBmb3Igc29tZSB3ZWlyZCByZWFzb24gdGhleSdyZSBzZXQgdXAgdG8gY2F1c2UgcGFyYWx5c2lzLCBzb1xuICAvLyBsZXQncyBmaXggdGhhdCwgdG9vLlxuICBmb3IgKGNvbnN0IG9iaiBvZiBbMHhjOCwgMHhmOSwgMHhmYV0pIHtcbiAgICAvLyBOT1RFOiBmbGFpbHMgbmVlZCBhdHRhY2t0eXBlICRmZSwgbm90ICRmZlxuICAgIHJvbS5vYmplY3RzW29ial0uYXR0YWNrVHlwZSA9IG9iaiA+IDB4ZjAgPyAweGZlIDogMHhmZjtcbiAgICByb20ub2JqZWN0c1tvYmpdLnN0YXR1c0VmZmVjdCA9IDA7XG4gIH1cbiAgLy8gRml4IFNhYmVyYSAxJ3MgZWxlbWVudGFsIGRlZmVuc2UgdG8gbm8gbG9uZ2VyIGFsbG93IHRodW5kZXJcbiAgcm9tLm9iamVjdHNbMHg3ZF0uZWxlbWVudHMgfD0gMHgwODtcblxuICBjb25zdCBCT1NTRVMgPSBuZXcgU2V0KFsweDU3LCAweDVlLCAweDY4LCAweDdkLCAweDg4LCAweDk3LCAweDliLCAweDllXSk7XG4gIGNvbnN0IFNMSU1FUyA9IG5ldyBTZXQoWzB4NTAsIDB4NTMsIDB4NWYsIDB4NjldKTtcbiAgZm9yIChjb25zdCBbaWQsIHtzZGVmLCBzd3JkLCBoaXRzLCBzYXRrLCBkZ2xkLCBzZXhwfV0gb2YgU0NBTEVEX01PTlNURVJTKSB7XG4gICAgLy8gaW5kaWNhdGUgdGhhdCB0aGlzIG9iamVjdCBuZWVkcyBzY2FsaW5nXG4gICAgY29uc3QgbyA9IHJvbS5vYmplY3RzW2lkXS5kYXRhO1xuICAgIGNvbnN0IGJvc3MgPSBCT1NTRVMuaGFzKGlkKSA/IDEgOiAwO1xuICAgIG9bMl0gfD0gMHg4MDsgLy8gcmVjb2lsXG4gICAgb1s2XSA9IGhpdHM7IC8vIEhQXG4gICAgb1s3XSA9IHNhdGs7ICAvLyBBVEtcbiAgICAvLyBTd29yZDogMC4uMyAod2luZCAtIHRodW5kZXIpIHByZXNlcnZlZCwgNCAoY3J5c3RhbGlzKSA9PiA3XG4gICAgb1s4XSA9IHNkZWYgfCBzd3JkIDw8IDQ7IC8vIERFRlxuICAgIC8vIE5PVEU6IGxvbmcgYWdvIHdlIHN0b3JlZCB3aGV0aGVyIHRoaXMgd2FzIGEgYm9zcyBpbiB0aGUgbG93ZXN0XG4gICAgLy8gYml0IG9mIHRoZSBub3ctdW51c2VkIExFVkVMLiBzbyB0aGF0IHdlIGNvdWxkIGluY3JlYXNlIHNjYWxpbmdcbiAgICAvLyBvbiBraWxsaW5nIHRoZW0sIGJ1dCBub3cgdGhhdCBzY2FsaW5nIGlzIHRpZWQgdG8gaXRlbXMsIHRoYXQnc1xuICAgIC8vIG5vIGxvbmdlciBuZWVkZWQgLSB3ZSBjb3VsZCBjby1vcHQgdGhpcyB0byBpbnN0ZWFkIHN0b3JlIHVwcGVyXG4gICAgLy8gYml0cyBvZiBIUCAob3IgcG9zc2libHkgbG93ZXIgYml0cyBzbyB0aGF0IEhQLWJhc2VkIGVmZmVjdHNcbiAgICAvLyBzdGlsbCB3b3JrIGNvcnJlY3RseSkuXG4gICAgLy8gb1s5XSA9IG9bOV0gJiAweGUwO1xuICAgIG9bMTZdID0gb1sxNl0gJiAweDBmIHwgZGdsZCA8PCA0OyAvLyBHTERcbiAgICBvWzE3XSA9IHNleHA7IC8vIEVYUFxuXG4gICAgaWYgKGJvc3MgPyBmbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgOiBmbGFncy5zaHVmZmxlTW9uc3RlckVsZW1lbnRzKCkpIHtcbiAgICAgIGlmICghU0xJTUVTLmhhcyhpZCkpIHtcbiAgICAgICAgY29uc3QgYml0cyA9IFsuLi5yb20ub2JqZWN0c1tpZF0uZWxlbWVudHMudG9TdHJpbmcoMikucGFkU3RhcnQoNCwgJzAnKV07XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKGJpdHMpO1xuICAgICAgICByb20ub2JqZWN0c1tpZF0uZWxlbWVudHMgPSBOdW1iZXIucGFyc2VJbnQoYml0cy5qb2luKCcnKSwgMik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gaGFuZGxlIHNsaW1lcyBhbGwgYXQgb25jZVxuICBpZiAoZmxhZ3Muc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpKSB7XG4gICAgLy8gcGljayBhbiBlbGVtZW50IGZvciBzbGltZSBkZWZlbnNlXG4gICAgY29uc3QgZSA9IHJhbmRvbS5uZXh0SW50KDQpO1xuICAgIHJvbS5wcmdbMHgzNTIyZF0gPSBlICsgMTtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIFNMSU1FUykge1xuICAgICAgcm9tLm9iamVjdHNbaWRdLmVsZW1lbnRzID0gMSA8PCBlO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJvbS53cml0ZU9iamVjdERhdGEoKTtcbn07XG5cbmNvbnN0IHNodWZmbGVNb25zdGVycyA9IChyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKSA9PiB7XG4gIC8vIFRPRE86IG9uY2Ugd2UgaGF2ZSBsb2NhdGlvbiBuYW1lcywgY29tcGlsZSBhIHNwb2lsZXIgb2Ygc2h1ZmZsZWQgbW9uc3RlcnNcbiAgY29uc3QgZ3JhcGhpY3MgPSBuZXcgR3JhcGhpY3Mocm9tKTtcbiAgLy8gKHdpbmRvdyBhcyBhbnkpLmdyYXBoaWNzID0gZ3JhcGhpY3M7XG4gIGlmIChmbGFncy5zaHVmZmxlU3ByaXRlUGFsZXR0ZXMoKSkgZ3JhcGhpY3Muc2h1ZmZsZVBhbGV0dGVzKHJhbmRvbSk7XG4gIGNvbnN0IHBvb2wgPSBuZXcgTW9uc3RlclBvb2woZmxhZ3MsIHt9KTtcbiAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmIChsb2MudXNlZCkgcG9vbC5wb3B1bGF0ZShsb2MpO1xuICB9XG4gIHBvb2wuc2h1ZmZsZShyYW5kb20sIGdyYXBoaWNzKTtcbn07XG5cbmNvbnN0IGlkZW50aWZ5S2V5SXRlbXNGb3JEaWZmaWN1bHR5QnVmZnMgPSAocm9tOiBSb20pID0+IHtcbiAgLy8gLy8gVGFnIGtleSBpdGVtcyBmb3IgZGlmZmljdWx0eSBidWZmc1xuICAvLyBmb3IgKGNvbnN0IGdldCBvZiByb20uaXRlbUdldHMpIHtcbiAgLy8gICBjb25zdCBpdGVtID0gSVRFTVMuZ2V0KGdldC5pdGVtSWQpO1xuICAvLyAgIGlmICghaXRlbSB8fCAhaXRlbS5rZXkpIGNvbnRpbnVlO1xuICAvLyAgIGdldC5rZXkgPSB0cnVlO1xuICAvLyB9XG4gIC8vIC8vIGNvbnNvbGUubG9nKHJlcG9ydCk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMHg0OTsgaSsrKSB7XG4gICAgLy8gTk9URSAtIHNwZWNpYWwgaGFuZGxpbmcgZm9yIGFsYXJtIGZsdXRlIHVudGlsIHdlIHByZS1wYXRjaFxuICAgIGNvbnN0IHVuaXF1ZSA9IChyb20ucHJnWzB4MjBmZjAgKyBpXSAmIDB4NDApIHx8IGkgPT09IDB4MzE7XG4gICAgY29uc3QgYml0ID0gMSA8PCAoaSAmIDcpO1xuICAgIGNvbnN0IGFkZHIgPSAweDFlMTEwICsgKGkgPj4+IDMpO1xuICAgIHJvbS5wcmdbYWRkcl0gPSByb20ucHJnW2FkZHJdICYgfmJpdCB8ICh1bmlxdWUgPyBiaXQgOiAwKTtcbiAgfVxufTtcblxuaW50ZXJmYWNlIE1vbnN0ZXJEYXRhIHtcbiAgaWQ6IG51bWJlcjtcbiAgdHlwZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHNkZWY6IG51bWJlcjtcbiAgc3dyZDogbnVtYmVyO1xuICBoaXRzOiBudW1iZXI7XG4gIHNhdGs6IG51bWJlcjtcbiAgZGdsZDogbnVtYmVyO1xuICBzZXhwOiBudW1iZXI7XG59XG5cbi8qIHRzbGludDpkaXNhYmxlOnRyYWlsaW5nLWNvbW1hIHdoaXRlc3BhY2UgKi9cbmNvbnN0IFNDQUxFRF9NT05TVEVSUzogTWFwPG51bWJlciwgTW9uc3RlckRhdGE+ID0gbmV3IE1hcChbXG4gIC8vIElEICBUWVBFICBOQU1FICAgICAgICAgICAgICAgICAgICAgICBTREVGIFNXUkQgSElUUyBTQVRLIERHTEQgU0VYUFxuICBbMHgzZiwgJ3AnLCAnU29yY2Vyb3Igc2hvdCcsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTksICAsICAgICxdLFxuICBbMHg0YiwgJ20nLCAnd3JhaXRoPz8nLCAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDIsICAgMjIsICA0LCAgIDYxXSxcbiAgWzB4NGYsICdtJywgJ3dyYWl0aCcsICAgICAgICAgICAgICAgICAgICAgMSwgICwgICAyLCAgIDIwLCAgNCwgICA2MV0sXG4gIFsweDUwLCAnbScsICdCbHVlIFNsaW1lJywgICAgICAgICAgICAgICAgICwgICAsICAgMSwgICAxNiwgIDIsICAgMzJdLFxuICBbMHg1MSwgJ20nLCAnV2VyZXRpZ2VyJywgICAgICAgICAgICAgICAgICAsICAgLCAgIDEsICAgMjEsICA0LCAgIDQwXSxcbiAgWzB4NTIsICdtJywgJ0dyZWVuIEplbGx5JywgICAgICAgICAgICAgICAgNCwgICwgICAzLCAgIDE2LCAgNCwgICAzNl0sXG4gIFsweDUzLCAnbScsICdSZWQgU2xpbWUnLCAgICAgICAgICAgICAgICAgIDYsICAsICAgNCwgICAxNiwgIDQsICAgNDhdLFxuICBbMHg1NCwgJ20nLCAnUm9jayBHb2xlbScsICAgICAgICAgICAgICAgICA2LCAgLCAgIDExLCAgMjQsICA2LCAgIDg1XSxcbiAgWzB4NTUsICdtJywgJ0JsdWUgQmF0JywgICAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDQsICAgLCAgICAzMl0sXG4gIFsweDU2LCAnbScsICdHcmVlbiBXeXZlcm4nLCAgICAgICAgICAgICAgIDQsICAsICAgNCwgICAyNCwgIDYsICAgNTJdLFxuICBbMHg1NywgJ2InLCAnVmFtcGlyZScsICAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDEyLCAgMTgsICAsICAgICxdLFxuICBbMHg1OCwgJ20nLCAnT3JjJywgICAgICAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDQsICAgMjEsICA0LCAgIDU3XSxcbiAgWzB4NTksICdtJywgJ1JlZCBGbHlpbmcgU3dhbXAgSW5zZWN0JywgICAgMywgICwgICAxLCAgIDIxLCAgNCwgICA1N10sXG4gIFsweDVhLCAnbScsICdCbHVlIE11c2hyb29tJywgICAgICAgICAgICAgIDIsICAsICAgMSwgICAyMSwgIDQsICAgNDRdLFxuICBbMHg1YiwgJ20nLCAnU3dhbXAgVG9tYXRvJywgICAgICAgICAgICAgICAzLCAgLCAgIDIsICAgMzUsICA0LCAgIDUyXSxcbiAgWzB4NWMsICdtJywgJ0ZseWluZyBNZWFkb3cgSW5zZWN0JywgICAgICAgMywgICwgICAzLCAgIDIzLCAgNCwgICA4MV0sXG4gIFsweDVkLCAnbScsICdTd2FtcCBQbGFudCcsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAsICAgICwgICAgMzZdLFxuICBbMHg1ZSwgJ2InLCAnSW5zZWN0JywgICAgICAgICAgICAgICAgICAgICAsICAgMSwgIDgsICAgNiwgICAsICAgICxdLFxuICBbMHg1ZiwgJ20nLCAnTGFyZ2UgQmx1ZSBTbGltZScsICAgICAgICAgICA1LCAgLCAgIDMsICAgMjAsICA0LCAgIDUyXSxcbiAgWzB4NjAsICdtJywgJ0ljZSBab21iaWUnLCAgICAgICAgICAgICAgICAgNSwgICwgICA3LCAgIDE0LCAgNCwgICA1N10sXG4gIFsweDYxLCAnbScsICdHcmVlbiBMaXZpbmcgUm9jaycsICAgICAgICAgICwgICAsICAgMSwgICA5LCAgIDQsICAgMjhdLFxuICBbMHg2MiwgJ20nLCAnR3JlZW4gU3BpZGVyJywgICAgICAgICAgICAgICA0LCAgLCAgIDQsICAgMjIsICA0LCAgIDQ0XSxcbiAgWzB4NjMsICdtJywgJ1JlZC9QdXJwbGUgV3l2ZXJuJywgICAgICAgICAgMywgICwgICA0LCAgIDMwLCAgNCwgICA2NV0sXG4gIFsweDY0LCAnbScsICdEcmF5Z29uaWEgU29sZGllcicsICAgICAgICAgIDYsICAsICAgMTEsICAzNiwgIDQsICAgODldLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4NjUsICdtJywgJ0ljZSBFbnRpdHknLCAgICAgICAgICAgICAgICAgMywgICwgICAyLCAgIDI0LCAgNCwgICA1Ml0sXG4gIFsweDY2LCAnbScsICdSZWQgTGl2aW5nIFJvY2snLCAgICAgICAgICAgICwgICAsICAgMSwgICAxMywgIDQsICAgNDBdLFxuICBbMHg2NywgJ20nLCAnSWNlIEdvbGVtJywgICAgICAgICAgICAgICAgICA3LCAgMiwgIDExLCAgMjgsICA0LCAgIDgxXSxcbiAgWzB4NjgsICdiJywgJ0tlbGJlc3F1ZScsICAgICAgICAgICAgICAgICAgNCwgIDYsICAxMiwgIDI5LCAgLCAgICAsXSxcbiAgWzB4NjksICdtJywgJ0dpYW50IFJlZCBTbGltZScsICAgICAgICAgICAgNywgICwgICA0MCwgIDkwLCAgNCwgICAxMDJdLFxuICBbMHg2YSwgJ20nLCAnVHJvbGwnLCAgICAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDMsICAgMjQsICA0LCAgIDY1XSxcbiAgWzB4NmIsICdtJywgJ1JlZCBKZWxseScsICAgICAgICAgICAgICAgICAgMiwgICwgICAyLCAgIDE0LCAgNCwgICA0NF0sXG4gIFsweDZjLCAnbScsICdNZWR1c2EnLCAgICAgICAgICAgICAgICAgICAgIDMsICAsICAgNCwgICAzNiwgIDgsICAgNzddLFxuICBbMHg2ZCwgJ20nLCAnUmVkIENyYWInLCAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDEsICAgMjEsICA0LCAgIDQ0XSxcbiAgWzB4NmUsICdtJywgJ01lZHVzYSBIZWFkJywgICAgICAgICAgICAgICAgLCAgICwgICAxLCAgIDI5LCAgNCwgICAzNl0sXG4gIFsweDZmLCAnbScsICdFdmlsIEJpcmQnLCAgICAgICAgICAgICAgICAgICwgICAsICAgMiwgICAzMCwgIDYsICAgNjVdLFxuICBbMHg3MSwgJ20nLCAnUmVkL1B1cnBsZSBNdXNocm9vbScsICAgICAgICAzLCAgLCAgIDUsICAgMTksICA2LCAgIDY5XSxcbiAgWzB4NzIsICdtJywgJ1Zpb2xldCBFYXJ0aCBFbnRpdHknLCAgICAgICAgMywgICwgICAzLCAgIDE4LCAgNiwgICA2MV0sXG4gIFsweDczLCAnbScsICdNaW1pYycsICAgICAgICAgICAgICAgICAgICAgICwgICAsICAgMywgICAyNiwgIDE1LCAgNzNdLFxuICBbMHg3NCwgJ20nLCAnUmVkIFNwaWRlcicsICAgICAgICAgICAgICAgICAzLCAgLCAgIDQsICAgMjIsICA2LCAgIDQ4XSxcbiAgWzB4NzUsICdtJywgJ0Zpc2htYW4nLCAgICAgICAgICAgICAgICAgICAgNCwgICwgICA2LCAgIDE5LCAgNSwgICA2MV0sXG4gIFsweDc2LCAnbScsICdKZWxseWZpc2gnLCAgICAgICAgICAgICAgICAgICwgICAsICAgMywgICAxNCwgIDMsICAgNDhdLFxuICBbMHg3NywgJ20nLCAnS3Jha2VuJywgICAgICAgICAgICAgICAgICAgICA1LCAgLCAgIDExLCAgMjUsICA3LCAgIDczXSxcbiAgWzB4NzgsICdtJywgJ0RhcmsgR3JlZW4gV3l2ZXJuJywgICAgICAgICAgNCwgICwgICA1LCAgIDIxLCAgNSwgICA2MV0sXG4gIFsweDc5LCAnbScsICdTYW5kIE1vbnN0ZXInLCAgICAgICAgICAgICAgIDUsICAsICAgOCwgICA2LCAgIDQsICAgNTddLFxuICBbMHg3YiwgJ20nLCAnV3JhaXRoIFNoYWRvdyAxJywgICAgICAgICAgICAsICAgLCAgICwgICAgOSwgICA3LCAgIDQ0XSxcbiAgWzB4N2MsICdtJywgJ0tpbGxlciBNb3RoJywgICAgICAgICAgICAgICAgLCAgICwgICAyLCAgIDM1LCAgLCAgICA3N10sXG4gIFsweDdkLCAnYicsICdTYWJlcmEnLCAgICAgICAgICAgICAgICAgICAgIDMsICA3LCAgMTMsICAyNCwgICwgICAgLF0sXG4gIFsweDgwLCAnbScsICdEcmF5Z29uaWEgQXJjaGVyJywgICAgICAgICAgIDEsICAsICAgMywgICAyMCwgIDYsICAgNjFdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4ODEsICdtJywgJ0V2aWwgQm9tYmVyIEJpcmQnLCAgICAgICAgICAgLCAgICwgICAxLCAgIDE5LCAgNCwgICA2NV0sXG4gIFsweDgyLCAnbScsICdMYXZhbWFuL2Jsb2InLCAgICAgICAgICAgICAgIDMsICAsICAgMywgICAyNCwgIDYsICAgODVdLFxuICBbMHg4NCwgJ20nLCAnTGl6YXJkbWFuICh3LyBmbGFpbCgnLCAgICAgICAyLCAgLCAgIDMsICAgMzAsICA2LCAgIDgxXSxcbiAgWzB4ODUsICdtJywgJ0dpYW50IEV5ZScsICAgICAgICAgICAgICAgICAgMywgICwgICA1LCAgIDMzLCAgNCwgICA4MV0sXG4gIFsweDg2LCAnbScsICdTYWxhbWFuZGVyJywgICAgICAgICAgICAgICAgIDIsICAsICAgNCwgICAyOSwgIDgsICAgNzddLFxuICBbMHg4NywgJ20nLCAnU29yY2Vyb3InLCAgICAgICAgICAgICAgICAgICAyLCAgLCAgIDUsICAgMzEsICA2LCAgIDY1XSxcbiAgWzB4ODgsICdiJywgJ01hZG8nLCAgICAgICAgICAgICAgICAgICAgICAgNCwgIDgsICAxMCwgIDMwLCAgLCAgICAsXSxcbiAgWzB4ODksICdtJywgJ0RyYXlnb25pYSBLbmlnaHQnLCAgICAgICAgICAgMiwgICwgICAzLCAgIDI0LCAgNCwgICA3N10sXG4gIFsweDhhLCAnbScsICdEZXZpbCcsICAgICAgICAgICAgICAgICAgICAgICwgICAsICAgMSwgICAxOCwgIDQsICAgNTJdLFxuICBbMHg4YiwgJ2InLCAnS2VsYmVzcXVlIDInLCAgICAgICAgICAgICAgICA0LCAgNiwgIDExLCAgMjcsICAsICAgICxdLFxuICBbMHg4YywgJ20nLCAnV3JhaXRoIFNoYWRvdyAyJywgICAgICAgICAgICAsICAgLCAgICwgICAgMTcsICA0LCAgIDQ4XSxcbiAgWzB4OTAsICdiJywgJ1NhYmVyYSAyJywgICAgICAgICAgICAgICAgICAgNSwgIDcsICAyMSwgIDI3LCAgLCAgICAsXSxcbiAgWzB4OTEsICdtJywgJ1RhcmFudHVsYScsICAgICAgICAgICAgICAgICAgMywgICwgICAzLCAgIDIxLCAgNiwgICA3M10sXG4gIFsweDkyLCAnbScsICdTa2VsZXRvbicsICAgICAgICAgICAgICAgICAgICwgICAsICAgNCwgICAzMCwgIDYsICAgNjldLFxuICBbMHg5MywgJ2InLCAnTWFkbyAyJywgICAgICAgICAgICAgICAgICAgICA0LCAgOCwgIDExLCAgMjUsICAsICAgICxdLFxuICBbMHg5NCwgJ20nLCAnUHVycGxlIEdpYW50IEV5ZScsICAgICAgICAgICA0LCAgLCAgIDEwLCAgMjMsICA2LCAgIDEwMl0sXG4gIFsweDk1LCAnbScsICdCbGFjayBLbmlnaHQgKHcvIGZsYWlsKScsICAgIDMsICAsICAgNywgICAyNiwgIDYsICAgODldLFxuICBbMHg5NiwgJ20nLCAnU2NvcnBpb24nLCAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDUsICAgMjksICAyLCAgIDczXSxcbiAgWzB4OTcsICdiJywgJ0thcm1pbmUnLCAgICAgICAgICAgICAgICAgICAgNCwgICwgICAxNCwgIDI2LCAgLCAgICAsXSxcbiAgWzB4OTgsICdtJywgJ1NhbmRtYW4vYmxvYicsICAgICAgICAgICAgICAgMywgICwgICA1LCAgIDM2LCAgNiwgICA5OF0sXG4gIFsweDk5LCAnbScsICdNdW1teScsICAgICAgICAgICAgICAgICAgICAgIDUsICAsICAgMTksICAzNiwgIDYsICAgMTEwXSxcbiAgWzB4OWEsICdtJywgJ1RvbWIgR3VhcmRpYW4nLCAgICAgICAgICAgICAgNywgICwgICA2MCwgIDM3LCAgNiwgICAxMDZdLFxuICBbMHg5YiwgJ2InLCAnRHJheWdvbicsICAgICAgICAgICAgICAgICAgICA1LCAgNiwgIDE2LCAgNDEsICAsICAgICxdLFxuICBbMHg5ZSwgJ2InLCAnRHJheWdvbiAyJywgICAgICAgICAgICAgICAgICA3LCAgNiwgIDI4LCAgNDAsICAsICAgICxdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4YTAsICdtJywgJ0dyb3VuZCBTZW50cnkgKDEpJywgICAgICAgICAgNCwgICwgICA2LCAgIDI2LCAgLCAgICA3M10sXG4gIFsweGExLCAnbScsICdUb3dlciBEZWZlbnNlIE1lY2ggKDIpJywgICAgIDUsICAsICAgOCwgICAzNiwgICwgICAgODVdLFxuICBbMHhhMiwgJ20nLCAnVG93ZXIgU2VudGluZWwnLCAgICAgICAgICAgICAsICAgLCAgIDEsICAgLCAgICAsICAgIDMyXSxcbiAgWzB4YTMsICdtJywgJ0FpciBTZW50cnknLCAgICAgICAgICAgICAgICAgMywgICwgICAyLCAgIDI2LCAgLCAgICA2NV0sXG4gIC8vIFsweGE0LCAnYicsICdEeW5hJywgICAgICAgICAgICAgICAgICAgICAgIDYsICA1LCAgMTYsICAsICAgICwgICAgLF0sXG4gIFsweGE1LCAnYicsICdWYW1waXJlIDInLCAgICAgICAgICAgICAgICAgIDMsICAsICAgMTIsICAyNywgICwgICAgLF0sXG4gIC8vIFsweGI0LCAnYicsICdkeW5hIHBvZCcsICAgICAgICAgICAgICAgICAgIDE1LCAsICAgMjU1LCAyNiwgICwgICAgLF0sXG4gIC8vIFsweGI4LCAncCcsICdkeW5hIGNvdW50ZXInLCAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNiwgICwgICAgLF0sXG4gIC8vIFsweGI5LCAncCcsICdkeW5hIGxhc2VyJywgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNiwgICwgICAgLF0sXG4gIC8vIFsweGJhLCAncCcsICdkeW5hIGJ1YmJsZScsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIFsweGE0LCAnYicsICdEeW5hJywgICAgICAgICAgICAgICAgICAgICAgIDYsICA1LCAgMzIsICAsICAgICwgICAgLF0sXG4gIFsweGI0LCAnYicsICdkeW5hIHBvZCcsICAgICAgICAgICAgICAgICAgIDYsICA1LCAgNDgsICAyNiwgICwgICAgLF0sXG4gIFsweGI4LCAncCcsICdkeW5hIGNvdW50ZXInLCAgICAgICAgICAgICAgMTUsICAsICAgLCAgICA0MiwgICwgICAgLF0sXG4gIFsweGI5LCAncCcsICdkeW5hIGxhc2VyJywgICAgICAgICAgICAgICAgMTUsICAsICAgLCAgICA0MiwgICwgICAgLF0sXG4gIFsweGJhLCAncCcsICdkeW5hIGJ1YmJsZScsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIC8vXG4gIFsweGJjLCAnbScsICd2YW1wMiBiYXQnLCAgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNiwgICwgICAgMTVdLFxuICBbMHhiZiwgJ3AnLCAnZHJheWdvbjIgZmlyZWJhbGwnLCAgICAgICAgICAsICAgLCAgICwgICAgMjYsICAsICAgICxdLFxuICBbMHhjMSwgJ20nLCAndmFtcDEgYmF0JywgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTYsICAsICAgIDE1XSxcbiAgWzB4YzMsICdwJywgJ2dpYW50IGluc2VjdCBzcGl0JywgICAgICAgICAgLCAgICwgICAsICAgIDM1LCAgLCAgICAsXSxcbiAgWzB4YzQsICdtJywgJ3N1bW1vbmVkIGluc2VjdCcsICAgICAgICAgICAgNCwgICwgICAyLCAgIDQyLCAgLCAgICA5OF0sXG4gIFsweGM1LCAncCcsICdrZWxieTEgcm9jaycsICAgICAgICAgICAgICAgICwgICAsICAgLCAgICAyMiwgICwgICAgLF0sXG4gIFsweGM2LCAncCcsICdzYWJlcmExIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAxOSwgICwgICAgLF0sXG4gIFsweGM3LCAncCcsICdrZWxieTIgZmlyZWJhbGxzJywgICAgICAgICAgICwgICAsICAgLCAgICAxMSwgICwgICAgLF0sXG4gIFsweGM4LCAncCcsICdzYWJlcmEyIGZpcmUnLCAgICAgICAgICAgICAgICwgICAsICAgMSwgICA2LCAgICwgICAgLF0sXG4gIFsweGM5LCAncCcsICdzYWJlcmEyIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNywgICwgICAgLF0sXG4gIFsweGNhLCAncCcsICdrYXJtaW5lIGJhbGxzJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAyNSwgICwgICAgLF0sXG4gIFsweGNiLCAncCcsICdzdW4vbW9vbiBzdGF0dWUgZmlyZWJhbGxzJywgICwgICAsICAgLCAgICAzOSwgICwgICAgLF0sXG4gIFsweGNjLCAncCcsICdkcmF5Z29uMSBsaWdodG5pbmcnLCAgICAgICAgICwgICAsICAgLCAgICAzNywgICwgICAgLF0sXG4gIFsweGNkLCAncCcsICdkcmF5Z29uMiBsYXNlcicsICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIC8vIElEICBUWVBFICBOQU1FICAgICAgICAgICAgICAgICAgICAgICBTREVGIFNXUkQgSElUUyBTQVRLIERHTEQgU0VYUFxuICBbMHhjZSwgJ3AnLCAnZHJheWdvbjIgYnJlYXRoJywgICAgICAgICAgICAsICAgLCAgICwgICAgMzYsICAsICAgICxdLFxuICBbMHhlMCwgJ3AnLCAnZXZpbCBib21iZXIgYmlyZCBib21iJywgICAgICAsICAgLCAgICwgICAgMiwgICAsICAgICxdLFxuICBbMHhlMiwgJ3AnLCAnc3VtbW9uZWQgaW5zZWN0IGJvbWInLCAgICAgICAsICAgLCAgICwgICAgNDcsICAsICAgICxdLFxuICBbMHhlMywgJ3AnLCAncGFyYWx5c2lzIGJlYW0nLCAgICAgICAgICAgICAsICAgLCAgICwgICAgMjMsICAsICAgICxdLFxuICBbMHhlNCwgJ3AnLCAnc3RvbmUgZ2F6ZScsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzMsICAsICAgICxdLFxuICBbMHhlNSwgJ3AnLCAncm9jayBnb2xlbSByb2NrJywgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhlNiwgJ3AnLCAnY3Vyc2UgYmVhbScsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTAsICAsICAgICxdLFxuICBbMHhlNywgJ3AnLCAnbXAgZHJhaW4gd2ViJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTEsICAsICAgICxdLFxuICBbMHhlOCwgJ3AnLCAnZmlzaG1hbiB0cmlkZW50JywgICAgICAgICAgICAsICAgLCAgICwgICAgMTUsICAsICAgICxdLFxuICBbMHhlOSwgJ3AnLCAnb3JjIGF4ZScsICAgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhlYSwgJ3AnLCAnU3dhbXAgUG9sbGVuJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzcsICAsICAgICxdLFxuICBbMHhlYiwgJ3AnLCAncGFyYWx5c2lzIHBvd2RlcicsICAgICAgICAgICAsICAgLCAgICwgICAgMTcsICAsICAgICxdLFxuICBbMHhlYywgJ3AnLCAnZHJheWdvbmlhIHNvbGlkZXIgc3dvcmQnLCAgICAsICAgLCAgICwgICAgMjgsICAsICAgICxdLFxuICBbMHhlZCwgJ3AnLCAnaWNlIGdvbGVtIHJvY2snLCAgICAgICAgICAgICAsICAgLCAgICwgICAgMjAsICAsICAgICxdLFxuICBbMHhlZSwgJ3AnLCAndHJvbGwgYXhlJywgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjcsICAsICAgICxdLFxuICBbMHhlZiwgJ3AnLCAna3Jha2VuIGluaycsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjQsICAsICAgICxdLFxuICBbMHhmMCwgJ3AnLCAnZHJheWdvbmlhIGFyY2hlciBhcnJvdycsICAgICAsICAgLCAgICwgICAgMTIsICAsICAgICxdLFxuICBbMHhmMSwgJ3AnLCAnPz8/IHVudXNlZCcsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTYsICAsICAgICxdLFxuICBbMHhmMiwgJ3AnLCAnZHJheWdvbmlhIGtuaWdodCBzd29yZCcsICAgICAsICAgLCAgICwgICAgOSwgICAsICAgICxdLFxuICBbMHhmMywgJ3AnLCAnbW90aCByZXNpZHVlJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTksICAsICAgICxdLFxuICBbMHhmNCwgJ3AnLCAnZ3JvdW5kIHNlbnRyeSBsYXNlcicsICAgICAgICAsICAgLCAgICwgICAgMTMsICAsICAgICxdLFxuICBbMHhmNSwgJ3AnLCAndG93ZXIgZGVmZW5zZSBtZWNoIGxhc2VyJywgICAsICAgLCAgICwgICAgMjMsICAsICAgICxdLFxuICBbMHhmNiwgJ3AnLCAndG93ZXIgc2VudGluZWwgbGFzZXInLCAgICAgICAsICAgLCAgICwgICAgOCwgICAsICAgICxdLFxuICBbMHhmNywgJ3AnLCAnc2tlbGV0b24gc2hvdCcsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTEsICAsICAgICxdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4ZjgsICdwJywgJ2xhdmFtYW4gc2hvdCcsICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE0LCAgLCAgICAsXSxcbiAgWzB4ZjksICdwJywgJ2JsYWNrIGtuaWdodCBmbGFpbCcsICAgICAgICAgLCAgICwgICAsICAgIDE4LCAgLCAgICAsXSxcbiAgWzB4ZmEsICdwJywgJ2xpemFyZG1hbiBmbGFpbCcsICAgICAgICAgICAgLCAgICwgICAsICAgIDIxLCAgLCAgICAsXSxcbiAgWzB4ZmMsICdwJywgJ21hZG8gc2h1cmlrZW4nLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDM2LCAgLCAgICAsXSxcbiAgWzB4ZmQsICdwJywgJ2d1YXJkaWFuIHN0YXR1ZSBtaXNzaWxlJywgICAgLCAgICwgICAsICAgIDIzLCAgLCAgICAsXSxcbiAgWzB4ZmUsICdwJywgJ2RlbW9uIHdhbGwgZmlyZScsICAgICAgICAgICAgLCAgICwgICAsICAgIDIzLCAgLCAgICAsXSxcbl0ubWFwKChbaWQsIHR5cGUsIG5hbWUsIHNkZWY9MCwgc3dyZD0wLCBoaXRzPTAsIHNhdGs9MCwgZGdsZD0wLCBzZXhwPTBdKSA9PlxuICAgICAgW2lkLCB7aWQsIHR5cGUsIG5hbWUsIHNkZWYsIHN3cmQsIGhpdHMsIHNhdGssIGRnbGQsIHNleHB9XSkpIGFzIGFueTtcblxuLyogdHNsaW50OmVuYWJsZTp0cmFpbGluZy1jb21tYSB3aGl0ZXNwYWNlICovXG5cbi8vIFdoZW4gZGVhbGluZyB3aXRoIGNvbnN0cmFpbnRzLCBpdCdzIGJhc2ljYWxseSBrc2F0XG4vLyAgLSB3ZSBoYXZlIGEgbGlzdCBvZiByZXF1aXJlbWVudHMgdGhhdCBhcmUgQU5EZWQgdG9nZXRoZXJcbi8vICAtIGVhY2ggaXMgYSBsaXN0IG9mIHByZWRpY2F0ZXMgdGhhdCBhcmUgT1JlZCB0b2dldGhlclxuLy8gIC0gZWFjaCBwcmVkaWNhdGUgaGFzIGEgY29udGludWF0aW9uIGZvciB3aGVuIGl0J3MgcGlja2VkXG4vLyAgLSBuZWVkIGEgd2F5IHRvIHRoaW4gdGhlIGNyb3dkLCBlZmZpY2llbnRseSBjaGVjayBjb21wYXQsIGV0Y1xuLy8gUHJlZGljYXRlIGlzIGEgZm91ci1lbGVtZW50IGFycmF5IFtwYXQwLHBhdDEscGFsMixwYWwzXVxuLy8gUmF0aGVyIHRoYW4gYSBjb250aW51YXRpb24gd2UgY291bGQgZ28gdGhyb3VnaCBhbGwgdGhlIHNsb3RzIGFnYWluXG5cbi8vIGNsYXNzIENvbnN0cmFpbnRzIHtcbi8vICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgLy8gQXJyYXkgb2YgcGF0dGVybiB0YWJsZSBvcHRpb25zLiAgTnVsbCBpbmRpY2F0ZXMgdGhhdCBpdCBjYW4gYmUgYW55dGhpbmcuXG4vLyAgICAgLy9cbi8vICAgICB0aGlzLnBhdHRlcm5zID0gW1tudWxsLCBudWxsXV07XG4vLyAgICAgdGhpcy5wYWxldHRlcyA9IFtbbnVsbCwgbnVsbF1dO1xuLy8gICAgIHRoaXMuZmx5ZXJzID0gMDtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVUcmVhc3VyZUNoZXN0KCkge1xuLy8gICAgIHRoaXMucmVxdWlyZU9yZGVyZWRTbG90KDAsIFRSRUFTVVJFX0NIRVNUX0JBTktTKTtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVPcmRlcmVkU2xvdChzbG90LCBzZXQpIHtcblxuLy8gICAgIGlmICghdGhpcy5vcmRlcmVkKSB7XG5cbi8vICAgICB9XG4vLyAvLyBUT0RPXG4vLyAgICAgdGhpcy5wYXQwID0gaW50ZXJzZWN0KHRoaXMucGF0MCwgc2V0KTtcblxuLy8gICB9XG5cbi8vIH1cblxuLy8gY29uc3QgaW50ZXJzZWN0ID0gKGxlZnQsIHJpZ2h0KSA9PiB7XG4vLyAgIGlmICghcmlnaHQpIHRocm93IG5ldyBFcnJvcigncmlnaHQgbXVzdCBiZSBub250cml2aWFsJyk7XG4vLyAgIGlmICghbGVmdCkgcmV0dXJuIHJpZ2h0O1xuLy8gICBjb25zdCBvdXQgPSBuZXcgU2V0KCk7XG4vLyAgIGZvciAoY29uc3QgeCBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0Lmhhcyh4KSkgb3V0LmFkZCh4KTtcbi8vICAgfVxuLy8gICByZXR1cm4gb3V0O1xuLy8gfVxuXG5pbnRlcmZhY2UgTW9uc3RlckNvbnN0cmFpbnQge1xuICBpZDogbnVtYmVyO1xuICBwYXQ6IG51bWJlcjtcbiAgcGFsMjogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwYWwzOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHBhdEJhbms6IG51bWJlciB8IHVuZGVmaW5lZDtcbn1cblxuLy8gQSBwb29sIG9mIG1vbnN0ZXIgc3Bhd25zLCBidWlsdCB1cCBmcm9tIHRoZSBsb2NhdGlvbnMgaW4gdGhlIHJvbS5cbi8vIFBhc3NlcyB0aHJvdWdoIHRoZSBsb2NhdGlvbnMgdHdpY2UsIGZpcnN0IHRvIGJ1aWxkIGFuZCB0aGVuIHRvXG4vLyByZWFzc2lnbiBtb25zdGVycy5cbmNsYXNzIE1vbnN0ZXJQb29sIHtcblxuICAvLyBhdmFpbGFibGUgbW9uc3RlcnNcbiAgcmVhZG9ubHkgbW9uc3RlcnM6IE1vbnN0ZXJDb25zdHJhaW50W10gPSBbXTtcbiAgLy8gdXNlZCBtb25zdGVycyAtIGFzIGEgYmFja3VwIGlmIG5vIGF2YWlsYWJsZSBtb25zdGVycyBmaXRcbiAgcmVhZG9ubHkgdXNlZDogTW9uc3RlckNvbnN0cmFpbnRbXSA9IFtdO1xuICAvLyBhbGwgbG9jYXRpb25zXG4gIHJlYWRvbmx5IGxvY2F0aW9uczoge2xvY2F0aW9uOiBMb2NhdGlvbiwgc2xvdHM6IG51bWJlcltdfVtdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBmbGFnczogRmxhZ1NldCxcbiAgICAgIHJlYWRvbmx5IHJlcG9ydDoge1tsb2M6IG51bWJlcl06IHN0cmluZ1tdLCBba2V5OiBzdHJpbmddOiAoc3RyaW5nfG51bWJlcilbXX0pIHt9XG5cbiAgLy8gVE9ETyAtIG1vbnN0ZXJzIHcvIHByb2plY3RpbGVzIG1heSBoYXZlIGEgc3BlY2lmaWMgYmFuayB0aGV5IG5lZWQgdG8gYXBwZWFyIGluLFxuICAvLyBzaW5jZSB0aGUgcHJvamVjdGlsZSBkb2Vzbid0IGtub3cgd2hlcmUgaXQgY2FtZSBmcm9tLi4uP1xuICAvLyAgIC0gZm9yIG5vdywganVzdCBhc3N1bWUgaWYgaXQgaGFzIGEgY2hpbGQgdGhlbiBpdCBtdXN0IGtlZXAgc2FtZSBwYXR0ZXJuIGJhbmshXG5cbiAgcG9wdWxhdGUobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgY29uc3Qge21heEZseWVycyA9IDAsXG4gICAgICAgICAgIG5vbkZseWVycyA9IHt9LFxuICAgICAgICAgICBza2lwID0gZmFsc2UsXG4gICAgICAgICAgIHRvd2VyID0gZmFsc2UsXG4gICAgICAgICAgIGZpeGVkU2xvdHMgPSB7fSxcbiAgICAgICAgICAgLi4udW5leHBlY3RlZH0gPSBNT05TVEVSX0FESlVTVE1FTlRTW2xvY2F0aW9uLmlkXSB8fCB7fTtcbiAgICBmb3IgKGNvbnN0IHUgb2YgT2JqZWN0LmtleXModW5leHBlY3RlZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5leHBlY3RlZCBwcm9wZXJ0eSAnJHt1fScgaW4gTU9OU1RFUl9BREpVU1RNRU5UU1ske2xvY2F0aW9uLmlkfV1gKTtcbiAgICB9XG4gICAgY29uc3Qgc2tpcE1vbnN0ZXJzID1cbiAgICAgICAgKHNraXAgPT09IHRydWUgfHxcbiAgICAgICAgICAgICghdGhpcy5mbGFncy5zaHVmZmxlVG93ZXJNb25zdGVycygpICYmIHRvd2VyKSB8fFxuICAgICAgICAgICAgIWxvY2F0aW9uLnNwcml0ZVBhdHRlcm5zIHx8XG4gICAgICAgICAgICAhbG9jYXRpb24uc3ByaXRlUGFsZXR0ZXMpO1xuICAgIGNvbnN0IG1vbnN0ZXJzID0gW107XG4gICAgbGV0IHNsb3RzID0gW107XG4gICAgLy8gY29uc3QgY29uc3RyYWludHMgPSB7fTtcbiAgICAvLyBsZXQgdHJlYXN1cmVDaGVzdCA9IGZhbHNlO1xuICAgIGxldCBzbG90ID0gMHgwYztcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIHNraXBNb25zdGVycyA/IFtdIDogbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICArK3Nsb3Q7XG4gICAgICBpZiAoIXNwYXduLnVzZWQgfHwgIXNwYXduLmlzTW9uc3RlcigpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlkID0gc3Bhd24ubW9uc3RlcklkO1xuICAgICAgaWYgKGlkIGluIFVOVE9VQ0hFRF9NT05TVEVSUyB8fCAhU0NBTEVEX01PTlNURVJTLmhhcyhpZCkgfHxcbiAgICAgICAgICBTQ0FMRURfTU9OU1RFUlMuZ2V0KGlkKSEudHlwZSAhPT0gJ20nKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG9iamVjdCA9IGxvY2F0aW9uLnJvbS5vYmplY3RzW2lkXTtcbiAgICAgIGlmICghb2JqZWN0KSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHBhdEJhbmsgPSBzcGF3bi5wYXR0ZXJuQmFuaztcbiAgICAgIGNvbnN0IHBhdCA9IGxvY2F0aW9uLnNwcml0ZVBhdHRlcm5zW3BhdEJhbmtdO1xuICAgICAgY29uc3QgcGFsID0gb2JqZWN0LnBhbGV0dGVzKHRydWUpO1xuICAgICAgY29uc3QgcGFsMiA9IHBhbC5pbmNsdWRlcygyKSA/IGxvY2F0aW9uLnNwcml0ZVBhbGV0dGVzWzBdIDogdW5kZWZpbmVkO1xuICAgICAgY29uc3QgcGFsMyA9IHBhbC5pbmNsdWRlcygzKSA/IGxvY2F0aW9uLnNwcml0ZVBhbGV0dGVzWzFdIDogdW5kZWZpbmVkO1xuICAgICAgbW9uc3RlcnMucHVzaCh7aWQsIHBhdCwgcGFsMiwgcGFsMywgcGF0QmFua30pO1xuICAgICAgKHRoaXMucmVwb3J0W2BzdGFydC0ke2lkLnRvU3RyaW5nKDE2KX1gXSA9IHRoaXMucmVwb3J0W2BzdGFydC0ke2lkLnRvU3RyaW5nKDE2KX1gXSB8fCBbXSlcbiAgICAgICAgICAucHVzaCgnJCcgKyBsb2NhdGlvbi5pZC50b1N0cmluZygxNikpO1xuICAgICAgc2xvdHMucHVzaChzbG90KTtcbiAgICB9XG4gICAgaWYgKCFtb25zdGVycy5sZW5ndGggfHwgc2tpcCkgc2xvdHMgPSBbXTtcbiAgICB0aGlzLmxvY2F0aW9ucy5wdXNoKHtsb2NhdGlvbiwgc2xvdHN9KTtcbiAgICB0aGlzLm1vbnN0ZXJzLnB1c2goLi4ubW9uc3RlcnMpO1xuICB9XG5cbiAgc2h1ZmZsZShyYW5kb206IFJhbmRvbSwgZ3JhcGhpY3M6IEdyYXBoaWNzKSB7XG4gICAgdGhpcy5yZXBvcnRbJ3ByZS1zaHVmZmxlIGxvY2F0aW9ucyddID0gdGhpcy5sb2NhdGlvbnMubWFwKGwgPT4gbC5sb2NhdGlvbi5pZCk7XG4gICAgdGhpcy5yZXBvcnRbJ3ByZS1zaHVmZmxlIG1vbnN0ZXJzJ10gPSB0aGlzLm1vbnN0ZXJzLm1hcChtID0+IG0uaWQpO1xuICAgIHJhbmRvbS5zaHVmZmxlKHRoaXMubG9jYXRpb25zKTtcbiAgICByYW5kb20uc2h1ZmZsZSh0aGlzLm1vbnN0ZXJzKTtcbiAgICB0aGlzLnJlcG9ydFsncG9zdC1zaHVmZmxlIGxvY2F0aW9ucyddID0gdGhpcy5sb2NhdGlvbnMubWFwKGwgPT4gbC5sb2NhdGlvbi5pZCk7XG4gICAgdGhpcy5yZXBvcnRbJ3Bvc3Qtc2h1ZmZsZSBtb25zdGVycyddID0gdGhpcy5tb25zdGVycy5tYXAobSA9PiBtLmlkKTtcbiAgICB3aGlsZSAodGhpcy5sb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCB7bG9jYXRpb24sIHNsb3RzfSA9IHRoaXMubG9jYXRpb25zLnBvcCgpITtcbiAgICAgIGNvbnN0IHJlcG9ydDogc3RyaW5nW10gPSB0aGlzLnJlcG9ydFsnJCcgKyBsb2NhdGlvbi5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKV0gPSBbXTtcbiAgICAgIGNvbnN0IHttYXhGbHllcnMgPSAwLCBub25GbHllcnMgPSB7fSwgdG93ZXIgPSBmYWxzZX0gPVxuICAgICAgICAgICAgTU9OU1RFUl9BREpVU1RNRU5UU1tsb2NhdGlvbi5pZF0gfHwge307XG4gICAgICBpZiAodG93ZXIpIGNvbnRpbnVlO1xuICAgICAgbGV0IGZseWVycyA9IG1heEZseWVyczsgLy8gY291bnQgZG93bi4uLlxuXG4gICAgICAvLyBEZXRlcm1pbmUgbG9jYXRpb24gY29uc3RyYWludHNcbiAgICAgIGxldCBjb25zdHJhaW50ID0gQ29uc3RyYWludC5mb3JMb2NhdGlvbihsb2NhdGlvbi5pZCk7XG4gICAgICBpZiAobG9jYXRpb24uYm9zc0lkKCkgIT0gbnVsbCkge1xuICAgICAgICAvLyBOb3RlIHRoYXQgYm9zc2VzIGFsd2F5cyBsZWF2ZSBjaGVzdHMuXG4gICAgICAgIC8vIFRPRE8gLSBpdCdzIHBvc3NpYmxlIHRoaXMgaXMgb3V0IG9mIG9yZGVyIHcuci50LiB3cml0aW5nIHRoZSBib3NzP1xuICAgICAgICAvLyAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuQk9TUywgdHJ1ZSk7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgZG9lcyBub3Qgd29yayBmb3IgKGUuZy4pIG1hZG8gMSwgd2hlcmUgYXp0ZWNhIHJlcXVpcmVzXG4gICAgICAgIC8vIDUzIHdoaWNoIGlzIG5vdCBhIGNvbXBhdGlibGUgY2hlc3QgcGFnZS5cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc0NoZXN0KCkgJiYgIXNwYXduLmlzSW52aXNpYmxlKCkpIHtcbiAgICAgICAgICBpZiAoc3Bhd24uaWQgPCAweDcwKSB7XG4gICAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuVFJFQVNVUkVfQ0hFU1QsIHRydWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuTUlNSUMsIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc05wYygpIHx8IHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgICAgY29uc3QgYyA9IGdyYXBoaWNzLmdldE5wY0NvbnN0cmFpbnQobG9jYXRpb24uaWQsIHNwYXduLmlkKTtcbiAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KGMsIHRydWUpO1xuICAgICAgICAgIGlmIChzcGF3bi5pc05wYygpICYmIHNwYXduLmlkID09PSAweDZiKSB7XG4gICAgICAgICAgICAvLyBzbGVlcGluZyBrZW5zdSAoNmIpIGxlYXZlcyBiZWhpbmQgYSB0cmVhc3VyZSBjaGVzdFxuICAgICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChDb25zdHJhaW50LktFTlNVX0NIRVNULCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgVU5UT1VDSEVEX01PTlNURVJTW3NwYXduLm1vbnN0ZXJJZF0pIHtcbiAgICAgICAgICBjb25zdCBjID0gZ3JhcGhpY3MuZ2V0TW9uc3RlckNvbnN0cmFpbnQobG9jYXRpb24uaWQsIHNwYXduLm1vbnN0ZXJJZCk7XG4gICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChjLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc1Nob290aW5nV2FsbChsb2NhdGlvbikpIHtcbiAgICAgICAgICBjb25zdHJhaW50ID0gY29uc3RyYWludC5tZWV0KENvbnN0cmFpbnQuU0hPT1RJTkdfV0FMTCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVwb3J0LnB1c2goYEluaXRpYWwgcGFzczogJHtjb25zdHJhaW50LmZpeGVkLm1hcChzPT5zLnNpemU8SW5maW5pdHk/J1snK1suLi5zXS5qb2luKCcsICcpKyddJzonYWxsJyl9YCk7XG5cbiAgICAgIGNvbnN0IGNsYXNzZXMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICAgICAgY29uc3QgdHJ5QWRkTW9uc3RlciA9IChtOiBNb25zdGVyQ29uc3RyYWludCkgPT4ge1xuICAgICAgICBjb25zdCBtb25zdGVyID0gbG9jYXRpb24ucm9tLm9iamVjdHNbbS5pZF0gYXMgTW9uc3RlcjtcbiAgICAgICAgaWYgKG1vbnN0ZXIubW9uc3RlckNsYXNzKSB7XG4gICAgICAgICAgY29uc3QgcmVwcmVzZW50YXRpdmUgPSBjbGFzc2VzLmdldChtb25zdGVyLm1vbnN0ZXJDbGFzcyk7XG4gICAgICAgICAgaWYgKHJlcHJlc2VudGF0aXZlICE9IG51bGwgJiYgcmVwcmVzZW50YXRpdmUgIT09IG0uaWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmbHllciA9IEZMWUVSUy5oYXMobS5pZCk7XG4gICAgICAgIGNvbnN0IG1vdGggPSBNT1RIU19BTkRfQkFUUy5oYXMobS5pZCk7XG4gICAgICAgIGlmIChmbHllcikge1xuICAgICAgICAgIC8vIFRPRE8gLSBhZGQgYSBzbWFsbCBwcm9iYWJpbGl0eSBvZiBhZGRpbmcgaXQgYW55d2F5LCBtYXliZVxuICAgICAgICAgIC8vIGJhc2VkIG9uIHRoZSBtYXAgYXJlYT8gIDI1IHNlZW1zIGEgZ29vZCB0aHJlc2hvbGQuXG4gICAgICAgICAgaWYgKCFmbHllcnMpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAtLWZseWVycztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjID0gZ3JhcGhpY3MuZ2V0TW9uc3RlckNvbnN0cmFpbnQobG9jYXRpb24uaWQsIG0uaWQpO1xuICAgICAgICBsZXQgbWVldCA9IGNvbnN0cmFpbnQudHJ5TWVldChjKTtcbiAgICAgICAgaWYgKCFtZWV0ICYmIGNvbnN0cmFpbnQucGFsMi5zaXplIDwgSW5maW5pdHkgJiYgY29uc3RyYWludC5wYWwzLnNpemUgPCBJbmZpbml0eSkge1xuICAgICAgICAgIGlmICh0aGlzLmZsYWdzLnNodWZmbGVTcHJpdGVQYWxldHRlcygpKSB7XG4gICAgICAgICAgICBtZWV0ID0gY29uc3RyYWludC50cnlNZWV0KGMsIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1lZXQpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAvLyBGaWd1cmUgb3V0IGVhcmx5IGlmIHRoZSBtb25zdGVyIGlzIHBsYWNlYWJsZS5cbiAgICAgICAgbGV0IHBvczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAobW9uc3RlclBsYWNlcikge1xuICAgICAgICAgIGNvbnN0IG1vbnN0ZXIgPSBsb2NhdGlvbi5yb20ub2JqZWN0c1ttLmlkXTtcbiAgICAgICAgICBpZiAoIShtb25zdGVyIGluc3RhbmNlb2YgTW9uc3RlcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbm9uLW1vbnN0ZXI6ICR7bW9uc3Rlcn1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcG9zID0gbW9uc3RlclBsYWNlcihtb25zdGVyKTtcbiAgICAgICAgICBpZiAocG9zID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcG9ydC5wdXNoKGAgIEFkZGluZyAke20uaWQudG9TdHJpbmcoMTYpfTogJHttZWV0fWApO1xuICAgICAgICBjb25zdHJhaW50ID0gbWVldDtcblxuICAgICAgICAvLyBQaWNrIHRoZSBzbG90IG9ubHkgYWZ0ZXIgd2Uga25vdyBmb3Igc3VyZSB0aGF0IGl0IHdpbGwgZml0LlxuICAgICAgICBpZiAobW9uc3Rlci5tb25zdGVyQ2xhc3MpIGNsYXNzZXMuc2V0KG1vbnN0ZXIubW9uc3RlckNsYXNzLCBtLmlkKVxuICAgICAgICBsZXQgZWxpZ2libGUgPSAwO1xuICAgICAgICBpZiAoZmx5ZXIgfHwgbW90aCkge1xuICAgICAgICAgIC8vIGxvb2sgZm9yIGEgZmx5ZXIgc2xvdCBpZiBwb3NzaWJsZS5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNsb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoc2xvdHNbaV0gaW4gbm9uRmx5ZXJzKSB7XG4gICAgICAgICAgICAgIGVsaWdpYmxlID0gaTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFByZWZlciBub24tZmx5ZXIgc2xvdHMsIGJ1dCBhZGp1c3QgaWYgd2UgZ2V0IGEgZmx5ZXIuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzbG90cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNsb3RzW2ldIGluIG5vbkZseWVycykgY29udGludWU7XG4gICAgICAgICAgICBlbGlnaWJsZSA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKHRoaXMucmVwb3J0W2Btb24tJHttLmlkLnRvU3RyaW5nKDE2KX1gXSA9IHRoaXMucmVwb3J0W2Btb24tJHttLmlkLnRvU3RyaW5nKDE2KX1gXSB8fCBbXSlcbiAgICAgICAgICAgIC5wdXNoKCckJyArIGxvY2F0aW9uLmlkLnRvU3RyaW5nKDE2KSk7XG4gICAgICAgIGNvbnN0IHNsb3QgPSBzbG90c1tlbGlnaWJsZV07XG4gICAgICAgIGNvbnN0IHNwYXduID0gbG9jYXRpb24uc3Bhd25zW3Nsb3QgLSAweDBkXTtcbiAgICAgICAgaWYgKG1vbnN0ZXJQbGFjZXIpIHsgLy8gcG9zID09IG51bGwgcmV0dXJuZWQgZmFsc2UgZWFybGllclxuICAgICAgICAgIHNwYXduLnNjcmVlbiA9IHBvcyEgPj4+IDg7XG4gICAgICAgICAgc3Bhd24udGlsZSA9IHBvcyEgJiAweGZmO1xuICAgICAgICB9IGVsc2UgaWYgKHNsb3QgaW4gbm9uRmx5ZXJzKSB7XG4gICAgICAgICAgc3Bhd24ueSArPSBub25GbHllcnNbc2xvdF1bMF0gKiAxNjtcbiAgICAgICAgICBzcGF3bi54ICs9IG5vbkZseWVyc1tzbG90XVsxXSAqIDE2O1xuICAgICAgICB9XG4gICAgICAgIHNwYXduLm1vbnN0ZXJJZCA9IG0uaWQ7XG4gICAgICAgIHJlcG9ydC5wdXNoKGAgICAgc2xvdCAke3Nsb3QudG9TdHJpbmcoMTYpfTogJHtzcGF3bn1gKTtcblxuICAgICAgICAvLyBUT0RPIC0gYW55dGhpbmcgZWxzZSBuZWVkIHNwbGljaW5nP1xuXG4gICAgICAgIHNsb3RzLnNwbGljZShlbGlnaWJsZSwgMSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcblxuICAgICAgLy8gRm9yIGVhY2ggbG9jYXRpb24uLi4uIHRyeSB0byBmaWxsIHVwIHRoZSBzbG90c1xuICAgICAgY29uc3QgbW9uc3RlclBsYWNlciA9XG4gICAgICAgICAgc2xvdHMubGVuZ3RoICYmIHRoaXMuZmxhZ3MucmFuZG9taXplTWFwcygpID9cbiAgICAgICAgICAgICAgbG9jYXRpb24ubW9uc3RlclBsYWNlcihyYW5kb20pIDogbnVsbDtcblxuICAgICAgaWYgKGZseWVycyAmJiBzbG90cy5sZW5ndGgpIHtcbiAgICAgICAgLy8gbG9vayBmb3IgYW4gZWxpZ2libGUgZmx5ZXIgaW4gdGhlIGZpcnN0IDQwLiAgSWYgaXQncyB0aGVyZSwgYWRkIGl0IGZpcnN0LlxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKDQwLCB0aGlzLm1vbnN0ZXJzLmxlbmd0aCk7IGkrKykge1xuICAgICAgICAgIGlmIChGTFlFUlMuaGFzKHRoaXMubW9uc3RlcnNbaV0uaWQpKSB7XG4gICAgICAgICAgICBpZiAodHJ5QWRkTW9uc3Rlcih0aGlzLm1vbnN0ZXJzW2ldKSkge1xuICAgICAgICAgICAgICB0aGlzLm1vbnN0ZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcmFuZG9tLnNodWZmbGUodGhpcy5tb25zdGVycyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtYXliZSBhZGRlZCBhIHNpbmdsZSBmbHllciwgdG8gbWFrZSBzdXJlIHdlIGRvbid0IHJ1biBvdXQuICBOb3cganVzdCB3b3JrIG5vcm1hbGx5XG5cbiAgICAgICAgLy8gZGVjaWRlIGlmIHdlJ3JlIGdvaW5nIHRvIGFkZCBhbnkgZmx5ZXJzLlxuXG4gICAgICAgIC8vIGFsc28gY29uc2lkZXIgYWxsb3dpbmcgYSBzaW5nbGUgcmFuZG9tIGZseWVyIHRvIGJlIGFkZGVkIG91dCBvZiBiYW5kIGlmXG4gICAgICAgIC8vIHRoZSBzaXplIG9mIHRoZSBtYXAgZXhjZWVkcyAyNT9cblxuICAgICAgICAvLyBwcm9iYWJseSBkb24ndCBhZGQgZmx5ZXJzIHRvIHVzZWQ/XG5cbiAgICAgIH1cblxuICAgICAgLy8gaXRlcmF0ZSBvdmVyIG1vbnN0ZXJzIHVudGlsIHdlIGZpbmQgb25lIHRoYXQncyBhbGxvd2VkLi4uXG4gICAgICAvLyBOT1RFOiBmaWxsIHRoZSBub24tZmx5ZXIgc2xvdHMgZmlyc3QgKGV4Y2VwdCBpZiB3ZSBwaWNrIGEgZmx5ZXI/PylcbiAgICAgIC8vICAgLSBtYXkgbmVlZCB0byB3ZWlnaHQgZmx5ZXJzIHNsaWdodGx5IGhpZ2hlciBvciBmaWxsIHRoZW0gZGlmZmVyZW50bHk/XG4gICAgICAvLyAgICAgb3RoZXJ3aXNlIHdlJ2xsIGxpa2VseSBub3QgZ2V0IHRoZW0gd2hlbiB3ZSdyZSBhbGxvd2VkLi4uP1xuICAgICAgLy8gICAtIG9yIGp1c3QgZG8gdGhlIG5vbi1mbHllciAqbG9jYXRpb25zKiBmaXJzdD9cbiAgICAgIC8vIC0gb3IganVzdCBmaWxsIHVwIGZseWVycyB1bnRpbCB3ZSBydW4gb3V0Li4uIDEwMCUgY2hhbmNlIG9mIGZpcnN0IGZseWVyLFxuICAgICAgLy8gICA1MCUgY2hhbmNlIG9mIGdldHRpbmcgYSBzZWNvbmQgZmx5ZXIgaWYgYWxsb3dlZC4uLlxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm1vbnN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICghc2xvdHMubGVuZ3RoKSBicmVhaztcbiAgICAgICAgaWYgKHRyeUFkZE1vbnN0ZXIodGhpcy5tb25zdGVyc1tpXSkpIHtcbiAgICAgICAgICBjb25zdCBbdXNlZF0gPSB0aGlzLm1vbnN0ZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICBpZiAoIUZMWUVSUy5oYXModXNlZC5pZCkpIHRoaXMudXNlZC5wdXNoKHVzZWQpO1xuICAgICAgICAgIGktLTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBiYWNrdXAgbGlzdFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnVzZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCFzbG90cy5sZW5ndGgpIGJyZWFrO1xuICAgICAgICBpZiAodHJ5QWRkTW9uc3Rlcih0aGlzLnVzZWRbaV0pKSB7XG4gICAgICAgICAgdGhpcy51c2VkLnB1c2goLi4udGhpcy51c2VkLnNwbGljZShpLCAxKSk7XG4gICAgICAgICAgaS0tO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdHJhaW50LmZpeChsb2NhdGlvbiwgcmFuZG9tKTtcblxuICAgICAgaWYgKHNsb3RzLmxlbmd0aCkge1xuICAgICAgICBjb25zb2xlLmVycm9yLypyZXBvcnQucHVzaCovKGBGYWlsZWQgdG8gZmlsbCBsb2NhdGlvbiAke2xvY2F0aW9uLmlkLnRvU3RyaW5nKDE2KX06ICR7c2xvdHMubGVuZ3RofSByZW1haW5pbmdgKTtcbiAgICAgICAgZm9yIChjb25zdCBzbG90IG9mIHNsb3RzKSB7XG4gICAgICAgICAgY29uc3Qgc3Bhd24gPSBsb2NhdGlvbi5zcGF3bnNbc2xvdCAtIDB4MGRdO1xuICAgICAgICAgIHNwYXduLnggPSBzcGF3bi55ID0gMDtcbiAgICAgICAgICBzcGF3bi5pZCA9IDB4YjA7XG4gICAgICAgICAgc3Bhd24uZGF0YVswXSA9IDB4ZmU7IC8vIGluZGljYXRlIHVudXNlZFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgICBncmFwaGljcy5jb25maWd1cmUobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY29uc3QgRkxZRVJTOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoWzB4NTksIDB4NWMsIDB4NmUsIDB4NmYsIDB4ODEsIDB4OGEsIDB4YTMsIDB4YzRdKTtcbmNvbnN0IE1PVEhTX0FORF9CQVRTOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoWzB4NTUsIC8qIHN3YW1wIHBsYW50ICovIDB4NWQsIDB4N2MsIDB4YmMsIDB4YzFdKTtcbi8vIGNvbnN0IFNXSU1NRVJTOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoWzB4NzUsIDB4NzZdKTtcbi8vIGNvbnN0IFNUQVRJT05BUlk6IFNldDxudW1iZXI+ID0gbmV3IFNldChbMHg3NywgMHg4N10pOyAgLy8ga3Jha2VuLCBzb3JjZXJvclxuXG5pbnRlcmZhY2UgTW9uc3RlckFkanVzdG1lbnQge1xuICBtYXhGbHllcnM/OiBudW1iZXI7XG4gIHNraXA/OiBib29sZWFuO1xuICB0b3dlcj86IGJvb2xlYW47XG4gIGZpeGVkU2xvdHM/OiB7cGF0MD86IG51bWJlciwgcGF0MT86IG51bWJlciwgcGFsMj86IG51bWJlciwgcGFsMz86IG51bWJlcn07XG4gIG5vbkZseWVycz86IHtbaWQ6IG51bWJlcl06IFtudW1iZXIsIG51bWJlcl19O1xufVxuY29uc3QgTU9OU1RFUl9BREpVU1RNRU5UUzoge1tsb2M6IG51bWJlcl06IE1vbnN0ZXJBZGp1c3RtZW50fSA9IHtcbiAgWzB4MDNdOiB7IC8vIFZhbGxleSBvZiBXaW5kXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGF0MTogMHg2MCwgLy8gcmVxdWlyZWQgYnkgd2luZG1pbGxcbiAgICB9LFxuICAgIG1heEZseWVyczogMixcbiAgfSxcbiAgWzB4MDddOiB7IC8vIFNlYWxlZCBDYXZlIDRcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBmXTogWzAsIC0zXSwgIC8vIGJhdFxuICAgICAgWzB4MTBdOiBbLTEwLCAwXSwgLy8gYmF0XG4gICAgICBbMHgxMV06IFswLCA0XSwgICAvLyBiYXRcbiAgICB9LFxuICB9LFxuICBbMHgxNF06IHsgLy8gQ29yZGVsIFdlc3RcbiAgICBtYXhGbHllcnM6IDIsXG4gIH0sXG4gIFsweDE1XTogeyAvLyBDb3JkZWwgRWFzdFxuICAgIG1heEZseWVyczogMixcbiAgfSxcbiAgWzB4MWFdOiB7IC8vIFN3YW1wXG4gICAgLy8gc2tpcDogJ2FkZCcsXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGFsMzogMHgyMyxcbiAgICAgIHBhdDE6IDB4NGYsXG4gICAgfSxcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7IC8vIFRPRE8gLSBtaWdodCBiZSBuaWNlIHRvIGtlZXAgcHVmZnMgd29ya2luZz9cbiAgICAgIFsweDEwXTogWzQsIDBdLFxuICAgICAgWzB4MTFdOiBbNSwgMF0sXG4gICAgICBbMHgxMl06IFs0LCAwXSxcbiAgICAgIFsweDEzXTogWzUsIDBdLFxuICAgICAgWzB4MTRdOiBbNCwgMF0sXG4gICAgICBbMHgxNV06IFs0LCAwXSxcbiAgICB9LFxuICB9LFxuICBbMHgxYl06IHsgLy8gQW1hem9uZXNcbiAgICAvLyBSYW5kb20gYmx1ZSBzbGltZSBzaG91bGQgYmUgaWdub3JlZFxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweDIwXTogeyAvLyBNdCBTYWJyZSBXZXN0IExvd2VyXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHgyMV06IHsgLy8gTXQgU2FicmUgV2VzdCBVcHBlclxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhdDE6IDB4NTAsXG4gICAgICAvLyBwYWwyOiAweDA2LCAvLyBtaWdodCBiZSBmaW5lIHRvIGNoYW5nZSB0b3JuZWwncyBjb2xvci4uLlxuICAgIH0sXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHgyN106IHsgLy8gTXQgU2FicmUgV2VzdCBDYXZlIDdcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzAsIDB4MTBdLCAvLyByYW5kb20gZW5lbXkgc3R1Y2sgaW4gd2FsbFxuICAgIH0sXG4gIH0sXG4gIFsweDI4XTogeyAvLyBNdCBTYWJyZSBOb3J0aCBNYWluXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHgyOV06IHsgLy8gTXQgU2FicmUgTm9ydGggTWlkZGxlXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICB9LFxuICBbMHgyYl06IHsgLy8gTXQgU2FicmUgTm9ydGggQ2F2ZSAyXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNF06IFsweDIwLCAtOF0sIC8vIGJhdFxuICAgIH0sXG4gIH0sXG4gIFsweDQwXTogeyAvLyBXYXRlcmZhbGwgVmFsbGV5IE5vcnRoXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTNdOiBbMTIsIC0weDEwXSwgLy8gbWVkdXNhIGhlYWRcbiAgICB9LFxuICB9LFxuICBbMHg0MV06IHsgLy8gV2F0ZXJmYWxsIFZhbGxleSBTb3V0aFxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE1XTogWzAsIC02XSwgLy8gbWVkdXNhIGhlYWRcbiAgICB9LFxuICB9LFxuICBbMHg0Ml06IHsgLy8gTGltZSBUcmVlIFZhbGxleVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzAsIDhdLCAvLyBldmlsIGJpcmRcbiAgICAgIFsweDBlXTogWy04LCA4XSwgLy8gZXZpbCBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4NDddOiB7IC8vIEtpcmlzYSBNZWFkb3dcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFstOCwgLThdLFxuICAgIH0sXG4gIH0sXG4gIFsweDRhXTogeyAvLyBGb2cgTGFtcCBDYXZlIDNcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZV06IFs0LCAwXSwgIC8vIGJhdFxuICAgICAgWzB4MGZdOiBbMCwgLTNdLCAvLyBiYXRcbiAgICAgIFsweDEwXTogWzAsIDRdLCAgLy8gYmF0XG4gICAgfSxcbiAgfSxcbiAgWzB4NGNdOiB7IC8vIEZvZyBMYW1wIENhdmUgNFxuICAgIC8vIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4NGRdOiB7IC8vIEZvZyBMYW1wIENhdmUgNVxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4NGVdOiB7IC8vIEZvZyBMYW1wIENhdmUgNlxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4NGZdOiB7IC8vIEZvZyBMYW1wIENhdmUgN1xuICAgIC8vIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4NTddOiB7IC8vIFdhdGVyZmFsbCBDYXZlIDRcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYXQxOiAweDRkLFxuICAgIH0sXG4gIH0sXG4gIFsweDU5XTogeyAvLyBUb3dlciBGbG9vciAxXG4gICAgLy8gc2tpcDogdHJ1ZSxcbiAgICB0b3dlcjogdHJ1ZSxcbiAgfSxcbiAgWzB4NWFdOiB7IC8vIFRvd2VyIEZsb29yIDJcbiAgICAvLyBza2lwOiB0cnVlLFxuICAgIHRvd2VyOiB0cnVlLFxuICB9LFxuICBbMHg1Yl06IHsgLy8gVG93ZXIgRmxvb3IgM1xuICAgIC8vIHNraXA6IHRydWUsXG4gICAgdG93ZXI6IHRydWUsXG4gIH0sXG4gIFsweDYwXTogeyAvLyBBbmdyeSBTZWFcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYWwzOiAweDA4LFxuICAgICAgcGF0MTogMHg1MiwgLy8gKGFzIG9wcG9zZWQgdG8gcGF0MClcbiAgICB9LFxuICAgIG1heEZseWVyczogMixcbiAgICBza2lwOiB0cnVlLCAvLyBub3Qgc3VyZSBob3cgdG8gcmFuZG9taXplIHRoZXNlIHdlbGxcbiAgfSxcbiAgWzB4NjRdOiB7IC8vIFVuZGVyZ3JvdW5kIENoYW5uZWxcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYWwzOiAweDA4LFxuICAgICAgcGF0MTogMHg1MiwgLy8gKGFzIG9wcG9zZWQgdG8gcGF0MClcbiAgICB9LFxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweDY4XTogeyAvLyBFdmlsIFNwaXJpdCBJc2xhbmQgMVxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhbDM6IDB4MDgsXG4gICAgICBwYXQxOiAweDUyLCAvLyAoYXMgb3Bwb3NlZCB0byBwYXQwKVxuICAgIH0sXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbiAgWzB4NjldOiB7IC8vIEV2aWwgU3Bpcml0IElzbGFuZCAyXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTddOiBbNCwgNl0sICAvLyBtZWR1c2EgaGVhZFxuICAgIH0sXG4gIH0sXG4gIFsweDZhXTogeyAvLyBFdmlsIFNwaXJpdCBJc2xhbmQgM1xuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE1XTogWzAsIDB4MThdLCAgLy8gbWVkdXNhIGhlYWRcbiAgICB9LFxuICB9LFxuICBbMHg2Y106IHsgLy8gU2FiZXJhIFBhbGFjZSAxXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTddOiBbMCwgMHgxOF0sIC8vIGV2aWwgYmlyZFxuICAgIH0sXG4gIH0sXG4gIFsweDZkXTogeyAvLyBTYWJlcmEgUGFsYWNlIDJcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxMV06IFsweDEwLCAwXSwgLy8gbW90aFxuICAgICAgWzB4MWJdOiBbMCwgMF0sICAgIC8vIG1vdGggLSBvayBhbHJlYWR5XG4gICAgICBbMHgxY106IFs2LCAwXSwgICAgLy8gbW90aFxuICAgIH0sXG4gIH0sXG4gIFsweDc4XTogeyAvLyBHb2EgVmFsbGV5XG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTZdOiBbLTgsIC04XSwgLy8gZXZpbCBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4N2NdOiB7IC8vIE10IEh5ZHJhXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTVdOiBbLTB4MjcsIDB4NTRdLCAvLyBldmlsIGJpcmRcbiAgICB9LFxuICB9LFxuICBbMHg4NF06IHsgLy8gTXQgSHlkcmEgQ2F2ZSA3XG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxMl06IFswLCAtNF0sXG4gICAgICBbMHgxM106IFswLCA0XSxcbiAgICAgIFsweDE0XTogWy02LCAwXSxcbiAgICAgIFsweDE1XTogWzE0LCAxMl0sXG4gICAgfSxcbiAgfSxcbiAgWzB4ODhdOiB7IC8vIFN0eXggMVxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4ODldOiB7IC8vIFN0eXggMlxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4OGFdOiB7IC8vIFN0eXggMVxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzcsIDBdLCAvLyBtb3RoXG4gICAgICBbMHgwZV06IFswLCAwXSwgLy8gbW90aCAtIG9rXG4gICAgICBbMHgwZl06IFs3LCAzXSwgLy8gbW90aFxuICAgICAgWzB4MTBdOiBbMCwgNl0sIC8vIG1vdGhcbiAgICAgIFsweDExXTogWzExLCAtMHgxMF0sIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHg4Zl06IHsgLy8gR29hIEZvcnRyZXNzIC0gT2FzaXMgQ2F2ZSBFbnRyYW5jZVxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweDkwXTogeyAvLyBEZXNlcnQgMVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE0XTogWy0weGIsIC0zXSwgLy8gYm9tYmVyIGJpcmRcbiAgICAgIFsweDE1XTogWzAsIDB4MTBdLCAgLy8gYm9tYmVyIGJpcmRcbiAgICB9LFxuICB9LFxuICBbMHg5MV06IHsgLy8gT2FzaXMgQ2F2ZVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE4XTogWzAsIDE0XSwgICAgLy8gaW5zZWN0XG4gICAgICBbMHgxOV06IFs0LCAtMHgxMF0sIC8vIGluc2VjdFxuICAgIH0sXG4gIH0sXG4gIFsweDk4XTogeyAvLyBEZXNlcnQgMlxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE0XTogWy02LCA2XSwgICAgLy8gZGV2aWxcbiAgICAgIFsweDE1XTogWzAsIC0weDEwXSwgLy8gZGV2aWxcbiAgICB9LFxuICB9LFxuICBbMHg5ZV06IHsgLy8gUHlyYW1pZCBGcm9udCAtIE1haW5cbiAgICBtYXhGbHllcnM6IDIsXG4gIH0sXG4gIFsweGEyXTogeyAvLyBQeXJhbWlkIEJhY2sgLSBCcmFuY2hcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxMl06IFswLCAxMV0sIC8vIG1vdGhcbiAgICAgIFsweDEzXTogWzYsIDBdLCAgLy8gbW90aFxuICAgIH0sXG4gIH0sXG4gIFsweGE1XTogeyAvLyBQeXJhbWlkIEJhY2sgLSBIYWxsIDJcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE3XTogWzYsIDZdLCAgIC8vIG1vdGhcbiAgICAgIFsweDE4XTogWy02LCAwXSwgIC8vIG1vdGhcbiAgICAgIFsweDE5XTogWy0xLCAtN10sIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHhhNl06IHsgLy8gRHJheWdvbiAyXG4gICAgLy8gSGFzIGEgZmV3IGJsdWUgc2xpbWVzIHRoYXQgYXJlbid0IHJlYWwgYW5kIHNob3VsZCBiZSBpZ25vcmVkLlxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweGE4XTogeyAvLyBHb2EgRm9ydHJlc3MgLSBFbnRyYW5jZVxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweGE5XTogeyAvLyBHb2EgRm9ydHJlc3MgLSBLZWxiZXNxdWVcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNl06IFsweDFhLCAtMHgxMF0sIC8vIGRldmlsXG4gICAgICBbMHgxN106IFswLCAweDIwXSwgICAgIC8vIGRldmlsXG4gICAgfSxcbiAgfSxcbiAgWzB4YWJdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIFNhYmVyYVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDBkXTogWzEsIDBdLCAgLy8gaW5zZWN0XG4gICAgICBbMHgwZV06IFsyLCAtMl0sIC8vIGluc2VjdFxuICAgIH0sXG4gIH0sXG5cbiAgWzB4YWRdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIE1hZG8gMVxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE4XTogWzAsIDhdLCAgLy8gZGV2aWxcbiAgICAgIFsweDE5XTogWzAsIC04XSwgLy8gZGV2aWxcbiAgICB9LFxuICB9LFxuICBbMHhhZl06IHsgLy8gR29hIEZvcnRyZXNzIC0gTWFkbyAzXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFswLCAwXSwgIC8vIG1vdGggLSBva1xuICAgICAgWzB4MGVdOiBbMCwgMF0sICAvLyBicm9rZW4gLSBidXQgcmVwbGFjZT9cbiAgICAgIFsweDEzXTogWzB4M2IsIC0weDI2XSwgLy8gc2hhZG93IC0gZW1iZWRkZWQgaW4gd2FsbFxuICAgICAgLy8gVE9ETyAtIDB4MGUgZ2xpdGNoZWQsIGRvbid0IHJhbmRvbWl6ZVxuICAgIH0sXG4gIH0sXG4gIFsweGI0XTogeyAvLyBHb2EgRm9ydHJlc3MgLSBLYXJtaW5lIDVcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxMV06IFs2LCAwXSwgIC8vIG1vdGhcbiAgICAgIFsweDEyXTogWzAsIDZdLCAgLy8gbW90aFxuICAgIH0sXG4gIH0sXG4gIFsweGQ3XTogeyAvLyBQb3J0b2EgUGFsYWNlIC0gRW50cnlcbiAgICAvLyBUaGVyZSdzIGEgcmFuZG9tIHNsaW1lIGluIHRoaXMgcm9vbSB0aGF0IHdvdWxkIGNhdXNlIGdsaXRjaGVzXG4gICAgc2tpcDogdHJ1ZSxcbiAgfSxcbn07XG5cbmNvbnN0IFVOVE9VQ0hFRF9NT05TVEVSUzoge1tpZDogbnVtYmVyXTogYm9vbGVhbn0gPSB7IC8vIG5vdCB5ZXQgKzB4NTAgaW4gdGhlc2Uga2V5c1xuICBbMHg3ZV06IHRydWUsIC8vIHZlcnRpY2FsIHBsYXRmb3JtXG4gIFsweDdmXTogdHJ1ZSwgLy8gaG9yaXpvbnRhbCBwbGF0Zm9ybVxuICBbMHg4M106IHRydWUsIC8vIGdsaXRjaCBpbiAkN2MgKGh5ZHJhKVxuICBbMHg4ZF06IHRydWUsIC8vIGdsaXRjaCBpbiBsb2NhdGlvbiAkYWIgKHNhYmVyYSAyKVxuICBbMHg4ZV06IHRydWUsIC8vIGJyb2tlbj8sIGJ1dCBzaXRzIG9uIHRvcCBvZiBpcm9uIHdhbGxcbiAgWzB4OGZdOiB0cnVlLCAvLyBzaG9vdGluZyBzdGF0dWVcbiAgWzB4OWZdOiB0cnVlLCAvLyB2ZXJ0aWNhbCBwbGF0Zm9ybVxuICAvLyBbMHhhMV06IHRydWUsIC8vIHdoaXRlIHRvd2VyIHJvYm90c1xuICBbMHhhNl06IHRydWUsIC8vIGdsaXRjaCBpbiBsb2NhdGlvbiAkYWYgKG1hZG8gMilcbn07XG5cbmNvbnN0IHNodWZmbGVSYW5kb21OdW1iZXJzID0gKHJvbTogVWludDhBcnJheSwgcmFuZG9tOiBSYW5kb20pID0+IHtcbiAgY29uc3QgdGFibGUgPSByb20uc3ViYXJyYXkoMHgzNTdlNCArIDB4MTAsIDB4MzU4MjQgKyAweDEwKTtcbiAgcmFuZG9tLnNodWZmbGUodGFibGUpO1xufTtcblxuLy8gdXNlZnVsIGZvciBkZWJ1ZyBldmVuIGlmIG5vdCBjdXJyZW50bHkgdXNlZFxuY29uc3QgW10gPSBbaGV4XTtcbiJdfQ==