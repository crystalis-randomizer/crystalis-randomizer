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
    rom.objects[0xf9].attackType = 0xff;
    rom.objects[0xfa].attackType = 0xff;
    rom.objects[0x7d].elements |= 0x08;
    rom.objects[0xc8].attackType = 0xff;
    rom.objects[0xc8].statusEffect = 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwQyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2pDLE9BQU8sRUFDQyxRQUFRLElBQUksZ0JBQWdCLEVBQ0MsTUFBTSxlQUFlLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDckMsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQzlDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRCxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDbkMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsUUFBUSxFQUFPLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxHQUFHLEVBQUUs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RyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRTNELEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtRQUM1QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLElBQUk7WUFBRSxTQUFTO1FBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUU7Z0JBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbkU7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3BCO2lCQUFNO2dCQUVMLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkU7U0FDRjtLQUNGO0lBR0QsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTdCLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsaUJB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QyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7S0FDYjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUVOLFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7U0FDWDtRQUNELFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixJQUFJLEVBQUUsSUFBSTtLQUNYO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLElBQUk7U0FFWDtRQUNELFNBQVMsRUFBRSxDQUFDO0tBQ2I7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFO1lBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7U0FDbEI7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztLQUNiO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRSxDQUFDO0tB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WixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDaEI7S0FDRjtJQUVELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDTixTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNoQjtLQUNGO0lBQ0QsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNOLFNBQVMsRUFBRTtZQUNULENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO1NBRXRCO0tBQ0Y7SUFDRCxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ04sU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLEVBQUU7WUFDVCxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNkLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2Y7S0FDRjtJQUNELENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFTixJQUFJLEVBQUUsSUFBSTtLQUNYO0NBQ0YsQ0FBQztBQUVGLE1BQU0sa0JBQWtCLEdBQTRCO0lBQ2xELENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUNaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtJQUVaLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtDQUNiLENBQUM7QUFFRixNQUFNLG9CQUFvQixHQUFHLENBQUMsR0FBZSxFQUFFLE1BQWMsRUFBRSxFQUFFO0lBQy9ELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUM7QUFHRixNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vNjUwMi5qcyc7XG5pbXBvcnQge2NyYzMyfSBmcm9tICcuL2NyYzMyLmpzJztcbmltcG9ydCB7UHJvZ3Jlc3NUcmFja2VyLFxuICAgICAgICBnZW5lcmF0ZSBhcyBnZW5lcmF0ZURlcGdyYXBoLFxuICAgICAgICBzaHVmZmxlMiBhcyBfc2h1ZmZsZURlcGdyYXBofSBmcm9tICcuL2RlcGdyYXBoLmpzJztcbmltcG9ydCB7RmV0Y2hSZWFkZXJ9IGZyb20gJy4vZmV0Y2hyZWFkZXIuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtBc3N1bWVkRmlsbH0gZnJvbSAnLi9ncmFwaC9zaHVmZmxlLmpzJztcbmltcG9ydCB7V29ybGR9IGZyb20gJy4vZ3JhcGgvd29ybGQuanMnO1xuaW1wb3J0IHtkZXRlcm1pbmlzdGljfSBmcm9tICcuL3Bhc3MvZGV0ZXJtaW5pc3RpYy5qcyc7XG5pbXBvcnQge2ZpeERpYWxvZ30gZnJvbSAnLi9wYXNzL2ZpeGRpYWxvZy5qcyc7XG5pbXBvcnQge3NodWZmbGVNYXplc30gZnJvbSAnLi9wYXNzL3NodWZmbGVtYXplcy5qcyc7XG5pbXBvcnQge3NodWZmbGVQYWxldHRlc30gZnJvbSAnLi9wYXNzL3NodWZmbGVwYWxldHRlcy5qcyc7XG5pbXBvcnQge3NodWZmbGVUcmFkZXN9IGZyb20gJy4vcGFzcy9zaHVmZmxldHJhZGVzLmpzJztcbmltcG9ydCB7dW5pZGVudGlmaWVkSXRlbXN9IGZyb20gJy4vcGFzcy91bmlkZW50aWZpZWRpdGVtcy5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi9yYW5kb20uanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4vcm9tLmpzJztcbmltcG9ydCB7TG9jYXRpb24sIFNwYXdufSBmcm9tICcuL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge1Nob3BUeXBlLCBTaG9wfSBmcm9tICcuL3JvbS9zaG9wLmpzJztcbmltcG9ydCAqIGFzIHNsb3RzIGZyb20gJy4vcm9tL3Nsb3RzLmpzJztcbmltcG9ydCB7U3BvaWxlcn0gZnJvbSAnLi9yb20vc3BvaWxlci5qcyc7XG5pbXBvcnQge2hleCwgc2VxLCB3YXRjaEFycmF5LCB3cml0ZUxpdHRsZUVuZGlhbn0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQgKiBhcyB2ZXJzaW9uIGZyb20gJy4vdmVyc2lvbi5qcyc7XG5pbXBvcnQge0dyYXBoaWNzfSBmcm9tICcuL3JvbS9ncmFwaGljcy5qcyc7XG5pbXBvcnQge0NvbnN0cmFpbnR9IGZyb20gJy4vcm9tL2NvbnN0cmFpbnQuanMnO1xuaW1wb3J0IHtNb25zdGVyfSBmcm9tICcuL3JvbS9tb25zdGVyLmpzJztcblxuLy8gVE9ETyAtIHRvIHNodWZmbGUgdGhlIG1vbnN0ZXJzLCB3ZSBuZWVkIHRvIGZpbmQgdGhlIHNwcml0ZSBwYWx0dGVzIGFuZFxuLy8gcGF0dGVybnMgZm9yIGVhY2ggbW9uc3Rlci4gIEVhY2ggbG9jYXRpb24gc3VwcG9ydHMgdXAgdG8gdHdvIG1hdGNodXBzLFxuLy8gc28gY2FuIG9ubHkgc3VwcG9ydCBtb25zdGVycyB0aGF0IG1hdGNoLiAgTW9yZW92ZXIsIGRpZmZlcmVudCBtb25zdGVyc1xuLy8gc2VlbSB0byBuZWVkIHRvIGJlIGluIGVpdGhlciBzbG90IDAgb3IgMS5cblxuLy8gUHVsbCBpbiBhbGwgdGhlIHBhdGNoZXMgd2Ugd2FudCB0byBhcHBseSBhdXRvbWF0aWNhbGx5LlxuLy8gVE9ETyAtIG1ha2UgYSBkZWJ1Z2dlciB3aW5kb3cgZm9yIHBhdGNoZXMuXG4vLyBUT0RPIC0gdGhpcyBuZWVkcyB0byBiZSBhIHNlcGFyYXRlIG5vbi1jb21waWxlZCBmaWxlLlxuZXhwb3J0IGRlZmF1bHQgKHtcbiAgYXN5bmMgYXBwbHkocm9tOiBVaW50OEFycmF5LCBoYXNoOiB7W2tleTogc3RyaW5nXTogdW5rbm93bn0sIHBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIExvb2sgZm9yIGZsYWcgc3RyaW5nIGFuZCBoYXNoXG4gICAgbGV0IGZsYWdzO1xuICAgIGlmICghaGFzaC5zZWVkKSB7XG4gICAgICAvLyBUT0RPIC0gc2VuZCBpbiBhIGhhc2ggb2JqZWN0IHdpdGggZ2V0L3NldCBtZXRob2RzXG4gICAgICBoYXNoLnNlZWQgPSBwYXJzZVNlZWQoJycpLnRvU3RyaW5nKDE2KTtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoICs9ICcmc2VlZD0nICsgaGFzaC5zZWVkO1xuICAgIH1cbiAgICBpZiAoaGFzaC5mbGFncykge1xuICAgICAgZmxhZ3MgPSBuZXcgRmxhZ1NldChTdHJpbmcoaGFzaC5mbGFncykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmbGFncyA9IG5ldyBGbGFnU2V0KCdARnVsbFNodWZmbGUnKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgaW4gaGFzaCkge1xuICAgICAgaWYgKGhhc2hba2V5XSA9PT0gJ2ZhbHNlJykgaGFzaFtrZXldID0gZmFsc2U7XG4gICAgfVxuICAgIGF3YWl0IHNodWZmbGUocm9tLCBwYXJzZVNlZWQoU3RyaW5nKGhhc2guc2VlZCkpLCBmbGFncywgbmV3IEZldGNoUmVhZGVyKHBhdGgpKTtcbiAgfSxcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTZWVkKHNlZWQ6IHN0cmluZyk6IG51bWJlciB7XG4gIGlmICghc2VlZCkgcmV0dXJuIFJhbmRvbS5uZXdTZWVkKCk7XG4gIGlmICgvXlswLTlhLWZdezEsOH0kL2kudGVzdChzZWVkKSkgcmV0dXJuIE51bWJlci5wYXJzZUludChzZWVkLCAxNik7XG4gIHJldHVybiBjcmMzMihzZWVkKTtcbn1cblxuLyoqXG4gKiBBYnN0cmFjdCBvdXQgRmlsZSBJL08uICBOb2RlIGFuZCBicm93c2VyIHdpbGwgaGF2ZSBjb21wbGV0ZWx5XG4gKiBkaWZmZXJlbnQgaW1wbGVtZW50YXRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlYWRlciB7XG4gIHJlYWQoZmlsZW5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPjtcbn1cblxuLy8gcHJldmVudCB1bnVzZWQgZXJyb3JzIGFib3V0IHdhdGNoQXJyYXkgLSBpdCdzIHVzZWQgZm9yIGRlYnVnZ2luZy5cbmNvbnN0IHt9ID0ge3dhdGNoQXJyYXl9IGFzIGFueTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNodWZmbGUocm9tOiBVaW50OEFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXI6IFJlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZz86IHtzcG9pbGVyPzogU3BvaWxlcn0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcz86IFByb2dyZXNzVHJhY2tlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gIC8vcm9tID0gd2F0Y2hBcnJheShyb20sIDB4ODVmYSArIDB4MTApO1xuXG4gIC8vIEZpcnN0IHJlZW5jb2RlIHRoZSBzZWVkLCBtaXhpbmcgaW4gdGhlIGZsYWdzIGZvciBzZWN1cml0eS5cbiAgaWYgKHR5cGVvZiBzZWVkICE9PSAnbnVtYmVyJykgdGhyb3cgbmV3IEVycm9yKCdCYWQgc2VlZCcpO1xuICBjb25zdCBuZXdTZWVkID0gY3JjMzIoc2VlZC50b1N0cmluZygxNikucGFkU3RhcnQoOCwgJzAnKSArIFN0cmluZyhmbGFncykpID4+PiAwO1xuXG4gIGNvbnN0IHRvdWNoU2hvcHMgPSB0cnVlO1xuXG4gIGNvbnN0IGRlZmluZXM6IHtbbmFtZTogc3RyaW5nXTogYm9vbGVhbn0gPSB7XG4gICAgX0FMTE9XX1RFTEVQT1JUX09VVF9PRl9CT1NTOiBmbGFncy5oYXJkY29yZU1vZGUoKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpLFxuICAgIF9BTExPV19URUxFUE9SVF9PVVRfT0ZfVE9XRVI6IHRydWUsXG4gICAgX0FVVE9fRVFVSVBfQlJBQ0VMRVQ6IGZsYWdzLmF1dG9FcXVpcEJyYWNlbGV0KCksXG4gICAgX0JBUlJJRVJfUkVRVUlSRVNfQ0FMTV9TRUE6IGZsYWdzLmJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKSxcbiAgICBfQlVGRl9ERU9TX1BFTkRBTlQ6IGZsYWdzLmJ1ZmZEZW9zUGVuZGFudCgpLFxuICAgIF9CVUZGX0RZTkE6IGZsYWdzLmJ1ZmZEeW5hKCksIC8vIHRydWUsXG4gICAgX0NIRUNLX0ZMQUcwOiB0cnVlLFxuICAgIF9DVVNUT01fU0hPT1RJTkdfV0FMTFM6IHRydWUsXG4gICAgX0RFQlVHX0RJQUxPRzogc2VlZCA9PT0gMHgxN2JjLFxuICAgIF9ESVNBQkxFX1NIT1BfR0xJVENIOiBmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1NUQVRVRV9HTElUQ0g6IGZsYWdzLmRpc2FibGVTdGF0dWVHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9TV09SRF9DSEFSR0VfR0xJVENIOiBmbGFncy5kaXNhYmxlU3dvcmRDaGFyZ2VHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9UUklHR0VSX1NLSVA6IHRydWUsXG4gICAgX0RJU0FCTEVfV0lMRF9XQVJQOiBmYWxzZSxcbiAgICBfRElTUExBWV9ESUZGSUNVTFRZOiB0cnVlLFxuICAgIF9FWFRSQV9QSVRZX01QOiB0cnVlLCAgLy8gVE9ETzogYWxsb3cgZGlzYWJsaW5nIHRoaXNcbiAgICBfRklYX0NPSU5fU1BSSVRFUzogdHJ1ZSxcbiAgICBfRklYX09QRUxfU1RBVFVFOiB0cnVlLFxuICAgIF9GSVhfU0hBS0lORzogdHJ1ZSxcbiAgICBfRklYX1ZBTVBJUkU6IHRydWUsXG4gICAgX0hBUkRDT1JFX01PREU6IGZsYWdzLmhhcmRjb3JlTW9kZSgpLFxuICAgIF9MRUFUSEVSX0JPT1RTX0dJVkVfU1BFRUQ6IGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpLFxuICAgIF9ORVJGX0ZMSUdIVDogdHJ1ZSxcbiAgICBfTkVSRl9XSUxEX1dBUlA6IGZsYWdzLm5lcmZXaWxkV2FycCgpLFxuICAgIF9ORVZFUl9ESUU6IGZsYWdzLm5ldmVyRGllKCksXG4gICAgX05PUk1BTElaRV9TSE9QX1BSSUNFUzogdG91Y2hTaG9wcyxcbiAgICBfUElUWV9IUF9BTkRfTVA6IHRydWUsXG4gICAgX1BST0dSRVNTSVZFX0JSQUNFTEVUOiB0cnVlLFxuICAgIF9SQUJCSVRfQk9PVFNfQ0hBUkdFX1dISUxFX1dBTEtJTkc6IGZsYWdzLnJhYmJpdEJvb3RzQ2hhcmdlV2hpbGVXYWxraW5nKCksXG4gICAgX1JFUVVJUkVfSEVBTEVEX0RPTFBISU5fVE9fUklERTogZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSxcbiAgICBfUkVWRVJTSUJMRV9TV0FOX0dBVEU6IHRydWUsXG4gICAgX1NBSEFSQV9SQUJCSVRTX1JFUVVJUkVfVEVMRVBBVEhZOiBmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpLFxuICAgIF9TSU1QTElGWV9JTlZJU0lCTEVfQ0hFU1RTOiB0cnVlLFxuICAgIF9URUxFUE9SVF9PTl9USFVOREVSX1NXT1JEOiBmbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCksXG4gICAgX1VOSURFTlRJRklFRF9JVEVNUzogZmxhZ3MudW5pZGVudGlmaWVkSXRlbXMoKSxcbiAgfTtcblxuICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKCk7XG4gIGFzeW5jIGZ1bmN0aW9uIGFzc2VtYmxlKHBhdGg6IHN0cmluZykge1xuICAgIGFzbS5hc3NlbWJsZShhd2FpdCByZWFkZXIucmVhZChwYXRoKSwgcGF0aCk7XG4gICAgYXNtLnBhdGNoUm9tKHJvbSk7XG4gIH1cblxuICBjb25zdCBmbGFnRmlsZSA9XG4gICAgICBPYmplY3Qua2V5cyhkZWZpbmVzKVxuICAgICAgICAgIC5maWx0ZXIoZCA9PiBkZWZpbmVzW2RdKS5tYXAoZCA9PiBgZGVmaW5lICR7ZH0gMVxcbmApLmpvaW4oJycpO1xuICBhc20uYXNzZW1ibGUoZmxhZ0ZpbGUsICdmbGFncy5zJyk7XG4gIGF3YWl0IGFzc2VtYmxlKCdwcmVzaHVmZmxlLnMnKTtcblxuICBjb25zdCByYW5kb20gPSBuZXcgUmFuZG9tKG5ld1NlZWQpO1xuXG4gIC8vIFBhcnNlIHRoZSByb20gYW5kIGFwcGx5IG90aGVyIHBhdGNoZXMgLSBub3RlOiBtdXN0IGhhdmUgc2h1ZmZsZWRcbiAgLy8gdGhlIGRlcGdyYXBoIEZJUlNUIVxuICBjb25zdCBwYXJzZWQgPSBuZXcgUm9tKHJvbSk7XG4gIGlmICh0eXBlb2Ygd2luZG93ID09ICdvYmplY3QnKSAod2luZG93IGFzIGFueSkucm9tID0gcGFyc2VkO1xuICBwYXJzZWQuc3BvaWxlciA9IG5ldyBTcG9pbGVyKHBhcnNlZCk7XG4gIGlmIChsb2cpIGxvZy5zcG9pbGVyID0gcGFyc2VkLnNwb2lsZXI7XG5cbiAgLy8gTWFrZSBkZXRlcm1pbmlzdGljIGNoYW5nZXMuXG4gIGRldGVybWluaXN0aWMocGFyc2VkLCBmbGFncyk7XG5cbiAgLy8gU2V0IHVwIHNob3AgYW5kIHRlbGVwYXRoeVxuICBhd2FpdCBhc3NlbWJsZSgncG9zdHBhcnNlLnMnKTtcbiAgcGFyc2VkLnNjYWxpbmdMZXZlbHMgPSA0ODtcbiAgcGFyc2VkLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBhc20uZXhwYW5kKCdLZXlJdGVtRGF0YScpO1xuXG4gIGlmIChmbGFncy5zaHVmZmxlU2hvcHMoKSkgc2h1ZmZsZVNob3BzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgcmFuZG9taXplV2FsbHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICBpZiAoZmxhZ3MucmFuZG9taXplV2lsZFdhcnAoKSkgc2h1ZmZsZVdpbGRXYXJwKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHJlc2NhbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB1bmlkZW50aWZpZWRJdGVtcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBzaHVmZmxlVHJhZGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlmIChmbGFncy5yYW5kb21pemVNYXBzKCkpIHNodWZmbGVNYXplcyhwYXJzZWQsIHJhbmRvbSk7XG5cbiAgLy8gVGhpcyB3YW50cyB0byBnbyBhcyBsYXRlIGFzIHBvc3NpYmxlIHNpbmNlIHdlIG5lZWQgdG8gcGljayB1cFxuICAvLyBhbGwgdGhlIG5vcm1hbGl6YXRpb24gYW5kIG90aGVyIGhhbmRsaW5nIHRoYXQgaGFwcGVuZWQgYmVmb3JlLlxuICBjb25zdCB3ID0gV29ybGQuYnVpbGQocGFyc2VkLCBmbGFncyk7XG4gIGNvbnN0IGZpbGwgPSBhd2FpdCBuZXcgQXNzdW1lZEZpbGwocGFyc2VkLCBmbGFncykuc2h1ZmZsZSh3LmdyYXBoLCByYW5kb20sIHByb2dyZXNzKTtcbiAgaWYgKGZpbGwpIHtcbiAgICAvLyBjb25zdCBuID0gKGk6IG51bWJlcikgPT4ge1xuICAgIC8vICAgaWYgKGkgPj0gMHg3MCkgcmV0dXJuICdNaW1pYyc7XG4gICAgLy8gICBjb25zdCBpdGVtID0gcGFyc2VkLml0ZW1zW3BhcnNlZC5pdGVtR2V0c1tpXS5pdGVtSWRdO1xuICAgIC8vICAgcmV0dXJuIGl0ZW0gPyBpdGVtLm1lc3NhZ2VOYW1lIDogYGludmFsaWQgJHtpfWA7XG4gICAgLy8gfTtcbiAgICAvLyBjb25zb2xlLmxvZygnaXRlbTogc2xvdCcpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsbC5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgaWYgKGZpbGwuaXRlbXNbaV0gIT0gbnVsbCkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZyhgJCR7aGV4KGkpfSAke24oaSl9OiAke24oZmlsbC5pdGVtc1tpXSl9ICQke2hleChmaWxsLml0ZW1zW2ldKX1gKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgdy50cmF2ZXJzZSh3LmdyYXBoLCBmaWxsKTsgLy8gZmlsbCB0aGUgc3BvaWxlciAobWF5IGFsc28gd2FudCB0byBqdXN0IGJlIGEgc2FuaXR5IGNoZWNrPylcblxuICAgIHNsb3RzLnVwZGF0ZShwYXJzZWQsIGZpbGwuc2xvdHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAtMTtcbiAgICAvL2NvbnNvbGUuZXJyb3IoJ0NPVUxEIE5PVCBGSUxMIScpO1xuICB9XG4gIC8vY29uc29sZS5sb2coJ2ZpbGwnLCBmaWxsKTtcblxuICAvLyBUT0RPIC0gc2V0IG9taXRJdGVtR2V0RGF0YVN1ZmZpeCBhbmQgb21pdExvY2FsRGlhbG9nU3VmZml4XG4gIC8vYXdhaXQgc2h1ZmZsZURlcGdyYXBoKHBhcnNlZCwgcmFuZG9tLCBsb2csIGZsYWdzLCBwcm9ncmVzcyk7XG5cbiAgLy8gVE9ETyAtIHJld3JpdGUgcmVzY2FsZVNob3BzIHRvIHRha2UgYSBSb20gaW5zdGVhZCBvZiBhbiBhcnJheS4uLlxuICBpZiAodG91Y2hTaG9wcykge1xuICAgIC8vIFRPRE8gLSBzZXBhcmF0ZSBsb2dpYyBmb3IgaGFuZGxpbmcgc2hvcHMgdy9vIFBuIHNwZWNpZmllZCAoaS5lLiB2YW5pbGxhXG4gICAgLy8gc2hvcHMgdGhhdCBtYXkgaGF2ZSBiZWVuIHJhbmRvbWl6ZWQpXG4gICAgcmVzY2FsZVNob3BzKHBhcnNlZCwgYXNtLCBmbGFncy5iYXJnYWluSHVudGluZygpID8gcmFuZG9tIDogdW5kZWZpbmVkKTtcbiAgfVxuXG4gIG5vcm1hbGl6ZVN3b3JkcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICAvLyBOT1RFOiBtb25zdGVyIHNodWZmbGUgbmVlZHMgdG8gZ28gYWZ0ZXIgaXRlbSBzaHVmZmxlIGJlY2F1c2Ugb2YgbWltaWNcbiAgLy8gcGxhY2VtZW50IGNvbnN0cmFpbnRzLCBidXQgaXQgd291bGQgYmUgbmljZSB0byBnbyBiZWZvcmUgaW4gb3JkZXIgdG9cbiAgLy8gZ3VhcmFudGVlIG1vbmV5LlxuICBpZiAoZmxhZ3Muc2h1ZmZsZU1vbnN0ZXJzKCkpIHNodWZmbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZGVudGlmeUtleUl0ZW1zRm9yRGlmZmljdWx0eUJ1ZmZzKHBhcnNlZCk7XG5cbiAgLy8gQnVmZiBtZWRpY2FsIGhlcmIgYW5kIGZydWl0IG9mIHBvd2VyXG4gIGlmIChmbGFncy5kb3VibGVCdWZmTWVkaWNhbEhlcmIoKSkge1xuICAgIHJvbVsweDFjNTBjICsgMHgxMF0gKj0gMjsgIC8vIGZydWl0IG9mIHBvd2VyXG4gICAgcm9tWzB4MWM0ZWEgKyAweDEwXSAqPSAzOyAgLy8gbWVkaWNhbCBoZXJiXG4gIH0gZWxzZSBpZiAoZmxhZ3MuYnVmZk1lZGljYWxIZXJiKCkpIHtcbiAgICByb21bMHgxYzUwYyArIDB4MTBdICs9IDE2OyAvLyBmcnVpdCBvZiBwb3dlclxuICAgIHJvbVsweDFjNGVhICsgMHgxMF0gKj0gMjsgIC8vIG1lZGljYWwgaGVyYlxuICB9XG5cbiAgaWYgKGZsYWdzLnN0b3J5TW9kZSgpKSBzdG9yeU1vZGUocGFyc2VkKTtcblxuICBzaHVmZmxlTXVzaWMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgc2h1ZmZsZVBhbGV0dGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIC8vIERvIHRoaXMgKmFmdGVyKiBzaHVmZmxpbmcgcGFsZXR0ZXNcbiAgaWYgKGZsYWdzLmJsYWNrb3V0TW9kZSgpKSBibGFja291dE1vZGUocGFyc2VkKTtcblxuICBtaXNjKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGZpeERpYWxvZyhwYXJzZWQpO1xuXG4gIC8vIE5PVEU6IFRoaXMgbmVlZHMgdG8gaGFwcGVuIEJFRk9SRSBwb3N0c2h1ZmZsZVxuICBpZiAoZmxhZ3MuYnVmZkR5bmEoKSkgYnVmZkR5bmEocGFyc2VkLCBmbGFncyk7IC8vIFRPRE8gLSBjb25kaXRpb25hbFxuICBhd2FpdCBwYXJzZWQud3JpdGVEYXRhKCk7XG4gIGJ1ZmZEeW5hKHBhcnNlZCwgZmxhZ3MpOyAvLyBUT0RPIC0gY29uZGl0aW9uYWxcbiAgY29uc3QgY3JjID0gYXdhaXQgcG9zdFBhcnNlZFNodWZmbGUocm9tLCByYW5kb20sIHNlZWQsIGZsYWdzLCBhc20sIGFzc2VtYmxlKTtcblxuICAvLyBUT0RPIC0gb3B0aW9uYWwgZmxhZ3MgY2FuIHBvc3NpYmx5IGdvIGhlcmUsIGJ1dCBNVVNUIE5PVCB1c2UgcGFyc2VkLnByZyFcblxuICByZXR1cm4gY3JjO1xufVxuXG4vLyBTZXBhcmF0ZSBmdW5jdGlvbiB0byBndWFyYW50ZWUgd2Ugbm8gbG9uZ2VyIGhhdmUgYWNjZXNzIHRvIHRoZSBwYXJzZWQgcm9tLi4uXG5hc3luYyBmdW5jdGlvbiBwb3N0UGFyc2VkU2h1ZmZsZShyb206IFVpbnQ4QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNtOiBBc3NlbWJsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlbWJsZTogKHBhdGg6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGF3YWl0IGFzc2VtYmxlKCdwb3N0c2h1ZmZsZS5zJyk7XG4gIHVwZGF0ZURpZmZpY3VsdHlTY2FsaW5nVGFibGVzKHJvbSwgZmxhZ3MsIGFzbSk7XG4gIHVwZGF0ZUNvaW5Ecm9wcyhyb20sIGZsYWdzKTtcblxuICBzaHVmZmxlUmFuZG9tTnVtYmVycyhyb20sIHJhbmRvbSk7XG5cbiAgcmV0dXJuIHN0YW1wVmVyc2lvblNlZWRBbmRIYXNoKHJvbSwgc2VlZCwgZmxhZ3MpO1xuXG4gIC8vIEJFTE9XIEhFUkUgRk9SIE9QVElPTkFMIEZMQUdTOlxuXG4gIC8vIGRvIGFueSBcInZhbml0eVwiIHBhdGNoZXMgaGVyZS4uLlxuICAvLyBjb25zb2xlLmxvZygncGF0Y2ggYXBwbGllZCcpO1xuICAvLyByZXR1cm4gbG9nLmpvaW4oJ1xcbicpO1xufTtcblxuXG5mdW5jdGlvbiBtaXNjKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pIHtcbiAgY29uc3Qge30gPSB7cm9tLCBmbGFncywgcmFuZG9tfSBhcyBhbnk7XG4gIC8vIE5PVEU6IHdlIHN0aWxsIG5lZWQgdG8gZG8gc29tZSB3b3JrIGFjdHVhbGx5IGFkanVzdGluZ1xuICAvLyBtZXNzYWdlIHRleHRzIHRvIHByZXZlbnQgbGluZSBvdmVyZmxvdywgZXRjLiAgV2Ugc2hvdWxkXG4gIC8vIGFsc28gbWFrZSBzb21lIGhvb2tzIHRvIGVhc2lseSBzd2FwIG91dCBpdGVtcyB3aGVyZSBpdFxuICAvLyBtYWtlcyBzZW5zZS5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzJdWzJdLnRleHQgPSBgXG57MDE6QWthaGFuYX0gaXMgaGFuZGVkIGEgc3RhdHVlLiNcblRoYW5rcyBmb3IgZmluZGluZyB0aGF0LlxuSSB3YXMgdG90YWxseSBnb25uYSBzZWxsXG5pdCBmb3IgdG9ucyBvZiBjYXNoLiNcbkhlcmUsIGhhdmUgdGhpcyBsYW1lXG5bMjk6R2FzIE1hc2tdIG9yIHNvbWV0aGluZy5gO1xuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBhZGQgc29tZSBtb3JlIChoaWdoZXIgbGV2ZWwpIG1hcmt1cCxcbiAgLy8gZS5nLiBgJHtkZXNjcmliZUl0ZW0oc2xvdE51bSl9YC4gIFdlIGNvdWxkIGFsc28gYWRkIG1hcmt1cFxuICAvLyBmb3IgZS5nLiBgJHtzYXlXYW50KHNsb3ROdW0pfWAgYW5kIGAke3NheVRoYW5rcyhzbG90TnVtKX1gXG4gIC8vIGlmIHdlIHNodWZmbGUgdGhlIHdhbnRlZCBpdGVtcy4gIFRoZXNlIGNvdWxkIGJlIHJhbmRvbWl6ZWRcbiAgLy8gaW4gdmFyaW91cyB3YXlzLCBhcyB3ZWxsIGFzIGhhdmluZyBzb21lIGFkZGl0aW9uYWwgYml0cyBsaWtlXG4gIC8vIHdhbnRBdXhpbGlhcnkoLi4uKSBmb3IgZS5nLiBcInRoZSBraXJpc2EgcGxhbnQgaXMgLi4uXCIgLSB0aGVuXG4gIC8vIGl0IGNvdWxkIGluc3RlYWQgc2F5IFwidGhlIHN0YXR1ZSBvZiBvbnl4IGlzIC4uLlwiLlxuICByb20ubWVzc2FnZXMucGFydHNbMF1bMHhlXS50ZXh0ID0gYEl0J3MgZGFuZ2Vyb3VzIHRvIGdvIGFsb25lISBUYWtlIHRoaXMuYDtcbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzBdWzB4ZV0uZml4VGV4dCgpO1xufTtcblxuZnVuY3Rpb24gc2h1ZmZsZVNob3BzKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGNvbnN0IHNob3BzOiB7W3R5cGU6IG51bWJlcl06IHtjb250ZW50czogbnVtYmVyW10sIHNob3BzOiBTaG9wW119fSA9IHtcbiAgICBbU2hvcFR5cGUuQVJNT1JdOiB7Y29udGVudHM6IFtdLCBzaG9wczogW119LFxuICAgIFtTaG9wVHlwZS5UT09MXToge2NvbnRlbnRzOiBbXSwgc2hvcHM6IFtdfSxcbiAgfTtcbiAgLy8gUmVhZCBhbGwgdGhlIGNvbnRlbnRzLlxuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKCFzaG9wLnVzZWQgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmZikgY29udGludWU7XG4gICAgY29uc3QgZGF0YSA9IHNob3BzW3Nob3AudHlwZV07XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIGRhdGEuY29udGVudHMucHVzaCguLi5zaG9wLmNvbnRlbnRzLmZpbHRlcih4ID0+IHggIT09IDB4ZmYpKTtcbiAgICAgIGRhdGEuc2hvcHMucHVzaChzaG9wKTtcbiAgICAgIHNob3AuY29udGVudHMgPSBbXTtcbiAgICB9XG4gIH1cbiAgLy8gU2h1ZmZsZSB0aGUgY29udGVudHMuICBQaWNrIG9yZGVyIHRvIGRyb3AgaXRlbXMgaW4uXG4gIGZvciAoY29uc3QgZGF0YSBvZiBPYmplY3QudmFsdWVzKHNob3BzKSkge1xuICAgIGxldCBzbG90czogU2hvcFtdIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgaXRlbXMgPSBbLi4uZGF0YS5jb250ZW50c107XG4gICAgcmFuZG9tLnNodWZmbGUoaXRlbXMpO1xuICAgIHdoaWxlIChpdGVtcy5sZW5ndGgpIHtcbiAgICAgIGlmICghc2xvdHMgfHwgIXNsb3RzLmxlbmd0aCkge1xuICAgICAgICBpZiAoc2xvdHMpIGl0ZW1zLnNoaWZ0KCk7XG4gICAgICAgIHNsb3RzID0gWy4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHNdO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShzbG90cyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpdGVtID0gaXRlbXNbMF07XG4gICAgICBjb25zdCBzaG9wID0gc2xvdHNbMF07XG4gICAgICBpZiAoc2hvcC5jb250ZW50cy5sZW5ndGggPCA0ICYmICFzaG9wLmNvbnRlbnRzLmluY2x1ZGVzKGl0ZW0pKSB7XG4gICAgICAgIHNob3AuY29udGVudHMucHVzaChpdGVtKTtcbiAgICAgICAgaXRlbXMuc2hpZnQoKTtcbiAgICAgIH1cbiAgICAgIHNsb3RzLnNoaWZ0KCk7XG4gICAgfVxuICB9XG4gIC8vIFNvcnQgYW5kIGFkZCAweGZmJ3NcbiAgZm9yIChjb25zdCBkYXRhIG9mIE9iamVjdC52YWx1ZXMoc2hvcHMpKSB7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIGRhdGEuc2hvcHMpIHtcbiAgICAgIHdoaWxlIChzaG9wLmNvbnRlbnRzLmxlbmd0aCA8IDQpIHNob3AuY29udGVudHMucHVzaCgweGZmKTtcbiAgICAgIHNob3AuY29udGVudHMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByYW5kb21pemVXYWxscyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIC8vIE5PVEU6IFdlIGNhbiBtYWtlIGFueSB3YWxsIHNob290IGJ5IHNldHRpbmcgaXRzICQxMCBiaXQgb24gdGhlIHR5cGUgYnl0ZS5cbiAgLy8gQnV0IHRoaXMgYWxzbyByZXF1aXJlcyBtYXRjaGluZyBwYXR0ZXJuIHRhYmxlcywgc28gd2UnbGwgbGVhdmUgdGhhdCBhbG9uZVxuICAvLyBmb3Igbm93IHRvIGF2b2lkIGdyb3NzIGdyYXBoaWNzLlxuXG4gIC8vIEFsbCBvdGhlciB3YWxscyB3aWxsIG5lZWQgdGhlaXIgdHlwZSBtb3ZlZCBpbnRvIHRoZSB1cHBlciBuaWJibGUgYW5kIHRoZW5cbiAgLy8gdGhlIG5ldyBlbGVtZW50IGdvZXMgaW4gdGhlIGxvd2VyIG5pYmJsZS4gIFNpbmNlIHRoZXJlIGFyZSBzbyBmZXcgaXJvblxuICAvLyB3YWxscywgd2Ugd2lsbCBnaXZlIHRoZW0gYXJiaXRyYXJ5IGVsZW1lbnRzIGluZGVwZW5kZW50IG9mIHRoZSBwYWxldHRlLlxuICAvLyBSb2NrL2ljZSB3YWxscyBjYW4gYWxzbyBoYXZlIGFueSBlbGVtZW50LCBidXQgdGhlIHRoaXJkIHBhbGV0dGUgd2lsbFxuICAvLyBpbmRpY2F0ZSB3aGF0IHRoZXkgZXhwZWN0LlxuXG4gIGlmICghZmxhZ3MucmFuZG9taXplV2FsbHMoKSkgcmV0dXJuO1xuICAvLyBCYXNpYyBwbGFuOiBwYXJ0aXRpb24gYmFzZWQgb24gcGFsZXR0ZSwgbG9vayBmb3Igd2FsbHMuXG4gIGNvbnN0IHBhbHMgPSBbXG4gICAgWzB4MDUsIDB4MzhdLCAvLyByb2NrIHdhbGwgcGFsZXR0ZXNcbiAgICBbMHgxMV0sIC8vIGljZSB3YWxsIHBhbGV0dGVzXG4gICAgWzB4NmFdLCAvLyBcImVtYmVyIHdhbGxcIiBwYWxldHRlc1xuICAgIFsweDE0XSwgLy8gXCJpcm9uIHdhbGxcIiBwYWxldHRlc1xuICBdO1xuXG4gIGZ1bmN0aW9uIHdhbGxUeXBlKHNwYXduOiBTcGF3bik6IG51bWJlciB7XG4gICAgaWYgKHNwYXduLmRhdGFbMl0gJiAweDIwKSB7XG4gICAgICByZXR1cm4gKHNwYXduLmlkID4+PiA0KSAmIDM7XG4gICAgfVxuICAgIHJldHVybiBzcGF3bi5pZCAmIDM7XG4gIH1cblxuICBjb25zdCBwYXJ0aXRpb24gPVxuICAgICAgcm9tLmxvY2F0aW9ucy5wYXJ0aXRpb24obCA9PiBsLnRpbGVQYWxldHRlcy5qb2luKCcgJyksIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gIGZvciAoY29uc3QgW2xvY2F0aW9uc10gb2YgcGFydGl0aW9uKSB7XG4gICAgLy8gcGljayBhIHJhbmRvbSB3YWxsIHR5cGUuXG4gICAgY29uc3QgZWx0ID0gcmFuZG9tLm5leHRJbnQoNCk7XG4gICAgY29uc3QgcGFsID0gcmFuZG9tLnBpY2socGFsc1tlbHRdKTtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIGxvY2F0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHdhbGxUeXBlKHNwYXduKTtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gMikgY29udGludWU7XG4gICAgICAgICAgaWYgKHR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld0VsdCA9IHJhbmRvbS5uZXh0SW50KDQpO1xuICAgICAgICAgICAgaWYgKHJvbS5zcG9pbGVyKSByb20uc3BvaWxlci5hZGRXYWxsKGxvY2F0aW9uLm5hbWUsIHR5cGUsIG5ld0VsdCk7XG4gICAgICAgICAgICBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgICAgICAgICBzcGF3bi5pZCA9IDB4MzAgfCBuZXdFbHQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGAke2xvY2F0aW9uLm5hbWV9ICR7dHlwZX0gPT4gJHtlbHR9YCk7XG4gICAgICAgICAgICBpZiAoIWZvdW5kICYmIHJvbS5zcG9pbGVyKSB7XG4gICAgICAgICAgICAgIHJvbS5zcG9pbGVyLmFkZFdhbGwobG9jYXRpb24ubmFtZSwgdHlwZSwgZWx0KTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgICAgICAgICAgc3Bhd24uaWQgPSB0eXBlIDw8IDQgfCBlbHQ7XG4gICAgICAgICAgICBsb2NhdGlvbi50aWxlUGFsZXR0ZXNbMl0gPSBwYWw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNodWZmbGVNdXNpYyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGlmICghZmxhZ3MucmFuZG9taXplTXVzaWMoKSkgcmV0dXJuO1xuICBpbnRlcmZhY2UgSGFzTXVzaWMgeyBiZ206IG51bWJlcjsgfVxuICBjbGFzcyBCb3NzTXVzaWMgaW1wbGVtZW50cyBIYXNNdXNpYyB7XG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgYWRkcjogbnVtYmVyKSB7fVxuICAgIGdldCBiZ20oKSB7IHJldHVybiByb20ucHJnW3RoaXMuYWRkcl07IH1cbiAgICBzZXQgYmdtKHgpIHsgcm9tLnByZ1t0aGlzLmFkZHJdID0geDsgfVxuICAgIHBhcnRpdGlvbigpOiBQYXJ0aXRpb24geyByZXR1cm4gW1t0aGlzXSwgdGhpcy5iZ21dOyB9XG4gIH1cbiAgdHlwZSBQYXJ0aXRpb24gPSBbSGFzTXVzaWNbXSwgbnVtYmVyXTtcbiAgY29uc3QgYm9zc0FkZHIgPSBbXG4gICAgMHgxZTRiOCwgLy8gdmFtcGlyZSAxXG4gICAgMHgxZTY5MCwgLy8gaW5zZWN0XG4gICAgMHgxZTk5YiwgLy8ga2VsYmVzcXVlXG4gICAgMHgxZWNiMSwgLy8gc2FiZXJhXG4gICAgMHgxZWUwZiwgLy8gbWFkb1xuICAgIDB4MWVmODMsIC8vIGthcm1pbmVcbiAgICAweDFmMTg3LCAvLyBkcmF5Z29uIDFcbiAgICAweDFmMzExLCAvLyBkcmF5Z29uIDJcbiAgICAweDM3YzMwLCAvLyBkeW5hXG4gIF07XG4gIGNvbnN0IHBhcnRpdGlvbnMgPVxuICAgICAgcm9tLmxvY2F0aW9ucy5wYXJ0aXRpb24oKGxvYzogTG9jYXRpb24pID0+IGxvYy5pZCAhPT0gMHg1ZiA/IGxvYy5iZ20gOiAwKVxuICAgICAgICAgIC5maWx0ZXIoKGw6IFBhcnRpdGlvbikgPT4gbFsxXSk7IC8vIGZpbHRlciBvdXQgc3RhcnQgYW5kIGR5bmFcblxuICBjb25zdCBwZWFjZWZ1bDogUGFydGl0aW9uW10gPSBbXTtcbiAgY29uc3QgaG9zdGlsZTogUGFydGl0aW9uW10gPSBbXTtcbiAgY29uc3QgYm9zc2VzOiBQYXJ0aXRpb25bXSA9IGJvc3NBZGRyLm1hcChhID0+IG5ldyBCb3NzTXVzaWMoYSkucGFydGl0aW9uKCkpO1xuXG4gIGZvciAoY29uc3QgcGFydCBvZiBwYXJ0aXRpb25zKSB7XG4gICAgbGV0IG1vbnN0ZXJzID0gMDtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBwYXJ0WzBdKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpKSBtb25zdGVycysrO1xuICAgICAgfVxuICAgIH1cbiAgICAobW9uc3RlcnMgPj0gcGFydFswXS5sZW5ndGggPyBob3N0aWxlIDogcGVhY2VmdWwpLnB1c2gocGFydCk7XG4gIH1cbiAgY29uc3QgZXZlbldlaWdodDogYm9vbGVhbiA9IHRydWU7XG4gIGNvbnN0IGV4dHJhTXVzaWM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgZnVuY3Rpb24gc2h1ZmZsZShwYXJ0czogUGFydGl0aW9uW10pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBwYXJ0cy5tYXAoKHg6IFBhcnRpdGlvbikgPT4geFsxXSk7XG5cbiAgICBpZiAoZXZlbldlaWdodCkge1xuICAgICAgY29uc3QgdXNlZCA9IFsuLi5uZXcgU2V0KHZhbHVlcyldO1xuICAgICAgaWYgKGV4dHJhTXVzaWMpIHVzZWQucHVzaCgweDksIDB4YSwgMHhiLCAweDFhLCAweDFjLCAweDFkKTtcbiAgICAgIGZvciAoY29uc3QgW2xvY3NdIG9mIHBhcnRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdXNlZFtyYW5kb20ubmV4dEludCh1c2VkLmxlbmd0aCldO1xuICAgICAgICBmb3IgKGNvbnN0IGxvYyBvZiBsb2NzKSB7XG4gICAgICAgICAgbG9jLmJnbSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmFuZG9tLnNodWZmbGUodmFsdWVzKTtcbiAgICBmb3IgKGNvbnN0IFtsb2NzXSBvZiBwYXJ0cykge1xuICAgICAgY29uc3QgdmFsdWUgPSB2YWx1ZXMucG9wKCkhO1xuICAgICAgZm9yIChjb25zdCBsb2Mgb2YgbG9jcykge1xuICAgICAgICBsb2MuYmdtID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIHNodWZmbGUocGVhY2VmdWwpO1xuICAvLyBzaHVmZmxlKGhvc3RpbGUpO1xuICAvLyBzaHVmZmxlKGJvc3Nlcyk7XG5cbiAgc2h1ZmZsZShbLi4ucGVhY2VmdWwsIC4uLmhvc3RpbGUsIC4uLmJvc3Nlc10pO1xuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBhbHNvIHNodWZmbGluZyBTRlg/XG4gIC8vICAtIGUuZy4gZmxhaWwgZ3V5IGNvdWxkIG1ha2UgdGhlIGZsYW1lIHNvdW5kP1xufVxuXG5mdW5jdGlvbiBzaHVmZmxlV2lsZFdhcnAocm9tOiBSb20sIF9mbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgY29uc3QgbG9jYXRpb25zOiBMb2NhdGlvbltdID0gW107XG4gIGZvciAoY29uc3QgbCBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgaWYgKGwgJiYgbC51c2VkICYmIGwuaWQgJiYgIWwuZXh0ZW5kZWQgJiYgKGwuaWQgJiAweGY4KSAhPT0gMHg1OCkge1xuICAgICAgbG9jYXRpb25zLnB1c2gobCk7XG4gICAgfVxuICB9XG4gIHJhbmRvbS5zaHVmZmxlKGxvY2F0aW9ucyk7XG4gIHJvbS53aWxkV2FycC5sb2NhdGlvbnMgPSBbXTtcbiAgZm9yIChjb25zdCBsb2Mgb2YgWy4uLmxvY2F0aW9ucy5zbGljZSgwLCAxNSkuc29ydCgoYSwgYikgPT4gYS5pZCAtIGIuaWQpXSkge1xuICAgIHJvbS53aWxkV2FycC5sb2NhdGlvbnMucHVzaChsb2MuaWQpO1xuICAgIGlmIChyb20uc3BvaWxlcikgcm9tLnNwb2lsZXIuYWRkV2lsZFdhcnAobG9jLmlkLCBsb2MubmFtZSk7XG4gIH1cbiAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucy5wdXNoKDApO1xufVxuXG5mdW5jdGlvbiBidWZmRHluYShyb206IFJvbSwgX2ZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIHJvbS5vYmplY3RzWzB4YjhdLmNvbGxpc2lvblBsYW5lID0gMTtcbiAgcm9tLm9iamVjdHNbMHhiOF0uaW1tb2JpbGUgPSB0cnVlO1xuICByb20ub2JqZWN0c1sweGI5XS5jb2xsaXNpb25QbGFuZSA9IDE7XG4gIHJvbS5vYmplY3RzWzB4YjldLmltbW9iaWxlID0gdHJ1ZTtcbiAgcm9tLm9iamVjdHNbMHgzM10uY29sbGlzaW9uUGxhbmUgPSAyO1xuICByb20uYWRIb2NTcGF3bnNbMHgyOF0uc2xvdFJhbmdlTG93ZXIgPSAweDFjOyAvLyBjb3VudGVyXG4gIHJvbS5hZEhvY1NwYXduc1sweDI5XS5zbG90UmFuZ2VVcHBlciA9IDB4MWM7IC8vIGxhc2VyXG4gIHJvbS5hZEhvY1NwYXduc1sweDJhXS5zbG90UmFuZ2VVcHBlciA9IDB4MWM7IC8vIGJ1YmJsZVxufVxuXG5mdW5jdGlvbiBibGFja291dE1vZGUocm9tOiBSb20pIHtcbiAgY29uc3QgZGcgPSBnZW5lcmF0ZURlcGdyYXBoKCk7XG4gIGZvciAoY29uc3Qgbm9kZSBvZiBkZy5ub2Rlcykge1xuICAgIGNvbnN0IHR5cGUgPSAobm9kZSBhcyBhbnkpLnR5cGU7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09ICdMb2NhdGlvbicgJiYgKHR5cGUgPT09ICdjYXZlJyB8fCB0eXBlID09PSAnZm9ydHJlc3MnKSkge1xuICAgICAgcm9tLmxvY2F0aW9uc1sobm9kZSBhcyBhbnkpLmlkXS50aWxlUGFsZXR0ZXMuZmlsbCgweDlhKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3Qgc3RvcnlNb2RlID0gKHJvbTogUm9tKSA9PiB7XG4gIC8vIHNodWZmbGUgaGFzIGFscmVhZHkgaGFwcGVuZWQsIG5lZWQgdG8gdXNlIHNodWZmbGVkIGZsYWdzIGZyb21cbiAgLy8gTlBDIHNwYXduIGNvbmRpdGlvbnMuLi5cbiAgY29uc3QgY29uZGl0aW9ucyA9IFtcbiAgICAvLyBOb3RlOiBpZiBib3NzZXMgYXJlIHNodWZmbGVkIHdlJ2xsIG5lZWQgdG8gZGV0ZWN0IHRoaXMuLi5cbiAgICB+cm9tLm5wY3NbMHhjMl0uc3Bhd25Db25kaXRpb25zLmdldCgweDI4KSFbMF0sIC8vIEtlbGJlc3F1ZSAxXG4gICAgfnJvbS5ucGNzWzB4ODRdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHg2ZSkhWzBdLCAvLyBTYWJlcmEgMVxuICAgIH5yb20udHJpZ2dlcigweDlhKS5jb25kaXRpb25zWzFdLCAvLyBNYWRvIDFcbiAgICB+cm9tLm5wY3NbMHhjNV0uc3Bhd25Db25kaXRpb25zLmdldCgweGE5KSFbMF0sIC8vIEtlbGJlc3F1ZSAyXG4gICAgfnJvbS5ucGNzWzB4YzZdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhhYykhWzBdLCAvLyBTYWJlcmEgMlxuICAgIH5yb20ubnBjc1sweGM3XS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YjkpIVswXSwgLy8gTWFkbyAyXG4gICAgfnJvbS5ucGNzWzB4YzhdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhiNikhWzBdLCAvLyBLYXJtaW5lXG4gICAgfnJvbS5ucGNzWzB4Y2JdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHg5ZikhWzBdLCAvLyBEcmF5Z29uIDFcbiAgICAweDIwMCwgLy8gU3dvcmQgb2YgV2luZFxuICAgIDB4MjAxLCAvLyBTd29yZCBvZiBGaXJlXG4gICAgMHgyMDIsIC8vIFN3b3JkIG9mIFdhdGVyXG4gICAgMHgyMDMsIC8vIFN3b3JkIG9mIFRodW5kZXJcbiAgICAvLyBUT0RPIC0gc3RhdHVlcyBvZiBtb29uIGFuZCBzdW4gbWF5IGJlIHJlbGV2YW50IGlmIGVudHJhbmNlIHNodWZmbGU/XG4gICAgLy8gVE9ETyAtIHZhbXBpcmVzIGFuZCBpbnNlY3Q/XG4gIF07XG4gIHJvbS5ucGNzWzB4Y2JdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhhNikhLnB1c2goLi4uY29uZGl0aW9ucyk7XG59O1xuXG4vLyBTdGFtcCB0aGUgUk9NXG5leHBvcnQgZnVuY3Rpb24gc3RhbXBWZXJzaW9uU2VlZEFuZEhhc2gocm9tOiBVaW50OEFycmF5LCBzZWVkOiBudW1iZXIsIGZsYWdzOiBGbGFnU2V0KTogbnVtYmVyIHtcbiAgLy8gVXNlIHVwIHRvIDI2IGJ5dGVzIHN0YXJ0aW5nIGF0IFBSRyAkMjVlYThcbiAgLy8gV291bGQgYmUgbmljZSB0byBzdG9yZSAoMSkgY29tbWl0LCAoMikgZmxhZ3MsICgzKSBzZWVkLCAoNCkgaGFzaFxuICAvLyBXZSBjYW4gdXNlIGJhc2U2NCBlbmNvZGluZyB0byBoZWxwIHNvbWUuLi5cbiAgLy8gRm9yIG5vdyBqdXN0IHN0aWNrIGluIHRoZSBjb21taXQgYW5kIHNlZWQgaW4gc2ltcGxlIGhleFxuICBjb25zdCBjcmMgPSBjcmMzMihyb20pO1xuICBjb25zdCBjcmNTdHJpbmcgPSBjcmMudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgaGFzaCA9IHZlcnNpb24uU1RBVFVTID09PSAndW5zdGFibGUnID9cbiAgICAgIHZlcnNpb24uSEFTSC5zdWJzdHJpbmcoMCwgNykucGFkU3RhcnQoNywgJzAnKS50b1VwcGVyQ2FzZSgpICsgJyAgICAgJyA6XG4gICAgICB2ZXJzaW9uLlZFUlNJT04uc3Vic3RyaW5nKDAsIDEyKS5wYWRFbmQoMTIsICcgJyk7XG4gIGNvbnN0IHNlZWRTdHIgPSBzZWVkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IGVtYmVkID0gKGFkZHI6IG51bWJlciwgdGV4dDogc3RyaW5nKSA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICByb21bYWRkciArIDB4MTAgKyBpXSA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IGludGVyY2FsYXRlID0gKHMxOiBzdHJpbmcsIHMyOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgczEubGVuZ3RoIHx8IGkgPCBzMi5sZW5ndGg7IGkrKykge1xuICAgICAgb3V0LnB1c2goczFbaV0gfHwgJyAnKTtcbiAgICAgIG91dC5wdXNoKHMyW2ldIHx8ICcgJyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignJyk7XG4gIH07XG5cbiAgZW1iZWQoMHgyNzdjZiwgaW50ZXJjYWxhdGUoJyAgVkVSU0lPTiAgICAgU0VFRCAgICAgICcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAgICR7aGFzaH0ke3NlZWRTdHJ9YCkpO1xuICBsZXQgZmxhZ1N0cmluZyA9IFN0cmluZyhmbGFncyk7XG5cbiAgLy8gaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gMzYpIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnJlcGxhY2UoLyAvZywgJycpO1xuICBsZXQgZXh0cmFGbGFncztcbiAgaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gNDYpIHtcbiAgICBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiA5MikgdGhyb3cgbmV3IEVycm9yKCdGbGFnIHN0cmluZyB3YXkgdG9vIGxvbmchJyk7XG4gICAgZXh0cmFGbGFncyA9IGZsYWdTdHJpbmcuc3Vic3RyaW5nKDQ2LCA5MikucGFkRW5kKDQ2LCAnICcpO1xuICAgIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnN1YnN0cmluZygwLCA0Nik7XG4gIH1cbiAgLy8gaWYgKGZsYWdTdHJpbmcubGVuZ3RoIDw9IDM2KSB7XG4gIC8vICAgLy8gYXR0ZW1wdCB0byBicmVhayBpdCBtb3JlIGZhdm9yYWJseVxuXG4gIC8vIH1cbiAgLy8gICBmbGFnU3RyaW5nID0gWydGTEFHUyAnLFxuICAvLyAgICAgICAgICAgICAgICAgZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgMTgpLnBhZEVuZCgxOCwgJyAnKSxcbiAgLy8gICAgICAgICAgICAgICAgICcgICAgICAnLFxuXG4gIC8vIH1cblxuICBmbGFnU3RyaW5nID0gZmxhZ1N0cmluZy5wYWRFbmQoNDYsICcgJyk7XG5cbiAgZW1iZWQoMHgyNzdmZiwgaW50ZXJjYWxhdGUoZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgMjMpLCBmbGFnU3RyaW5nLnN1YnN0cmluZygyMykpKTtcbiAgaWYgKGV4dHJhRmxhZ3MpIHtcbiAgICBlbWJlZCgweDI3ODJmLCBpbnRlcmNhbGF0ZShleHRyYUZsYWdzLnN1YnN0cmluZygwLCAyMyksIGV4dHJhRmxhZ3Muc3Vic3RyaW5nKDIzKSkpO1xuICB9XG5cbiAgZW1iZWQoMHgyNzg4NSwgaW50ZXJjYWxhdGUoY3JjU3RyaW5nLnN1YnN0cmluZygwLCA0KSwgY3JjU3RyaW5nLnN1YnN0cmluZyg0KSkpO1xuXG4gIC8vIGVtYmVkKDB4MjVlYTgsIGB2LiR7aGFzaH0gICAke3NlZWR9YCk7XG4gIGVtYmVkKDB4MjU3MTYsICdSQU5ET01JWkVSJyk7XG4gIGlmICh2ZXJzaW9uLlNUQVRVUyA9PT0gJ3Vuc3RhYmxlJykgZW1iZWQoMHgyNTczYywgJ0JFVEEnKTtcbiAgLy8gTk9URTogaXQgd291bGQgYmUgcG9zc2libGUgdG8gYWRkIHRoZSBoYXNoL3NlZWQvZXRjIHRvIHRoZSB0aXRsZVxuICAvLyBwYWdlIGFzIHdlbGwsIGJ1dCB3ZSdkIG5lZWQgdG8gcmVwbGFjZSB0aGUgdW51c2VkIGxldHRlcnMgaW4gYmFua1xuICAvLyAkMWQgd2l0aCB0aGUgbWlzc2luZyBudW1iZXJzIChKLCBRLCBXLCBYKSwgYXMgd2VsbCBhcyB0aGUgdHdvXG4gIC8vIHdlaXJkIHNxdWFyZXMgYXQgJDViIGFuZCAkNWMgdGhhdCBkb24ndCBhcHBlYXIgdG8gYmUgdXNlZC4gIFRvZ2V0aGVyXG4gIC8vIHdpdGggdXNpbmcgdGhlIGxldHRlciAnTycgYXMgMCwgdGhhdCdzIHN1ZmZpY2llbnQgdG8gY3JhbSBpbiBhbGwgdGhlXG4gIC8vIG51bWJlcnMgYW5kIGRpc3BsYXkgYXJiaXRyYXJ5IGhleCBkaWdpdHMuXG5cbiAgcmV0dXJuIGNyYztcbn07XG5cbmNvbnN0IHBhdGNoQnl0ZXMgPSAocm9tOiBVaW50OEFycmF5LCBhZGRyZXNzOiBudW1iZXIsIGJ5dGVzOiBudW1iZXJbXSkgPT4ge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgcm9tW2FkZHJlc3MgKyBpXSA9IGJ5dGVzW2ldO1xuICB9XG59O1xuXG5jb25zdCBwYXRjaFdvcmRzID0gKHJvbTogVWludDhBcnJheSwgYWRkcmVzczogbnVtYmVyLCB3b3JkczogbnVtYmVyW10pID0+IHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAyICogd29yZHMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByb21bYWRkcmVzcyArIGldID0gd29yZHNbaSA+Pj4gMV0gJiAweGZmO1xuICAgIHJvbVthZGRyZXNzICsgaSArIDFdID0gd29yZHNbaSA+Pj4gMV0gPj4+IDg7XG4gIH1cbn07XG5cbi8vIGdvZXMgd2l0aCBlbmVteSBzdGF0IHJlY29tcHV0YXRpb25zIGluIHBvc3RzaHVmZmxlLnNcbmNvbnN0IHVwZGF0ZUNvaW5Ecm9wcyA9IChyb206IFVpbnQ4QXJyYXksIGZsYWdzOiBGbGFnU2V0KSA9PiB7XG4gIHJvbSA9IHJvbS5zdWJhcnJheSgweDEwKTtcbiAgaWYgKGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCkpIHtcbiAgICAvLyBiaWdnZXIgZ29sZCBkcm9wcyBpZiBubyBzaG9wIGdsaXRjaCwgcGFydGljdWxhcmx5IGF0IHRoZSBzdGFydFxuICAgIC8vIC0gc3RhcnRzIG91dCBmaWJvbmFjY2ksIHRoZW4gZ29lcyBsaW5lYXIgYXQgNjAwXG4gICAgcGF0Y2hXb3Jkcyhyb20sIDB4MzRiZGUsIFtcbiAgICAgICAgMCwgICA1LCAgMTAsICAxNSwgIDI1LCAgNDAsICA2NSwgIDEwNSxcbiAgICAgIDE3MCwgMjc1LCA0NDUsIDYwMCwgNzAwLCA4MDAsIDkwMCwgMTAwMCxcbiAgICBdKTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0aGlzIHRhYmxlIGlzIGJhc2ljYWxseSBtZWFuaW5nbGVzcyBiL2Mgc2hvcCBnbGl0Y2hcbiAgICBwYXRjaFdvcmRzKHJvbSwgMHgzNGJkZSwgW1xuICAgICAgICAwLCAgIDEsICAgMiwgICA0LCAgIDgsICAxNiwgIDMwLCAgNTAsXG4gICAgICAxMDAsIDIwMCwgMzAwLCA0MDAsIDUwMCwgNjAwLCA3MDAsIDgwMCxcbiAgICBdKTtcbiAgfVxufTtcblxuLy8gZ29lcyB3aXRoIGVuZW15IHN0YXQgcmVjb21wdXRhdGlvbnMgaW4gcG9zdHNodWZmbGUuc1xuY29uc3QgdXBkYXRlRGlmZmljdWx0eVNjYWxpbmdUYWJsZXMgPSAocm9tOiBVaW50OEFycmF5LCBmbGFnczogRmxhZ1NldCwgYXNtOiBBc3NlbWJsZXIpID0+IHtcbiAgcm9tID0gcm9tLnN1YmFycmF5KDB4MTApO1xuXG4gIC8vIEN1cnJlbnRseSB0aGlzIGlzIHRocmVlICQzMC1ieXRlIHRhYmxlcywgd2hpY2ggd2Ugc3RhcnQgYXQgdGhlIGJlZ2lubmluZ1xuICAvLyBvZiB0aGUgcG9zdHNodWZmbGUgQ29tcHV0ZUVuZW15U3RhdHMuXG4gIGNvbnN0IGRpZmYgPSBzZXEoNDgsIHggPT4geCk7XG5cbiAgLy8gUEF0ayA9IDUgKyBEaWZmICogMTUvMzJcbiAgLy8gRGlmZkF0ayB0YWJsZSBpcyA4ICogUEF0ayA9IHJvdW5kKDQwICsgKERpZmYgKiAxNSAvIDQpKVxuICBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkF0aycpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg0MCArIGQgKiAxNSAvIDQpKSk7XG5cbiAgLy8gTk9URTogT2xkIERpZmZEZWYgdGFibGUgKDQgKiBQRGVmKSB3YXMgMTIgKyBEaWZmICogMywgYnV0IHdlIG5vIGxvbmdlclxuICAvLyB1c2UgdGhpcyB0YWJsZSBzaW5jZSBuZXJmaW5nIGFybW9ycy5cbiAgLy8gKFBEZWYgPSAzICsgRGlmZiAqIDMvNClcbiAgLy8gcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZEZWYnKSxcbiAgLy8gICAgICAgICAgICBkaWZmLm1hcChkID0+IDEyICsgZCAqIDMpKTtcblxuICAvLyBOT1RFOiBUaGlzIGlzIHRoZSBhcm1vci1uZXJmZWQgRGlmZkRlZiB0YWJsZS5cbiAgLy8gUERlZiA9IDIgKyBEaWZmIC8gMlxuICAvLyBEaWZmRGVmIHRhYmxlIGlzIDQgKiBQRGVmID0gOCArIERpZmYgKiAyXG4gIC8vIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmRGVmJyksXG4gIC8vICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiA4ICsgZCAqIDIpKTtcblxuICAvLyBOT1RFOiBGb3IgYXJtb3IgY2FwIGF0IDMgKiBMdmwsIHNldCBQRGVmID0gRGlmZlxuICBwYXRjaEJ5dGVzKHJvbSwgYXNtLmV4cGFuZCgnRGlmZkRlZicpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gZCAqIDQpKTtcblxuICAvLyBEaWZmSFAgdGFibGUgaXMgUEhQID0gbWluKDI1NSwgNDggKyByb3VuZChEaWZmICogMTEgLyAyKSlcbiAgY29uc3QgcGhwU3RhcnQgPSBmbGFncy5kZWNyZWFzZUVuZW15RGFtYWdlKCkgPyAxNiA6IDQ4O1xuICBjb25zdCBwaHBJbmNyID0gZmxhZ3MuZGVjcmVhc2VFbmVteURhbWFnZSgpID8gNiA6IDUuNTtcbiAgcGF0Y2hCeXRlcyhyb20sIGFzbS5leHBhbmQoJ0RpZmZIUCcpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5taW4oMjU1LCBwaHBTdGFydCArIE1hdGgucm91bmQoZCAqIHBocEluY3IpKSkpO1xuXG4gIC8vIERpZmZFeHAgdGFibGUgaXMgRXhwQiA9IGNvbXByZXNzKGZsb29yKDQgKiAoMiAqKiAoKDE2ICsgOSAqIERpZmYpIC8gMzIpKSkpXG4gIC8vIHdoZXJlIGNvbXByZXNzIG1hcHMgdmFsdWVzID4gMTI3IHRvICQ4MHwoeD4+NClcblxuICBjb25zdCBleHBGYWN0b3IgPSBmbGFncy5leHBTY2FsaW5nRmFjdG9yKCk7XG4gIHBhdGNoQnl0ZXMocm9tLCBhc20uZXhwYW5kKCdEaWZmRXhwJyksIGRpZmYubWFwKGQgPT4ge1xuICAgIGNvbnN0IGV4cCA9IE1hdGguZmxvb3IoNCAqICgyICoqICgoMTYgKyA5ICogZCkgLyAzMikpICogZXhwRmFjdG9yKTtcbiAgICByZXR1cm4gZXhwIDwgMHg4MCA/IGV4cCA6IE1hdGgubWluKDB4ZmYsIDB4ODAgKyAoZXhwID4+IDQpKTtcbiAgfSkpO1xuXG4gIC8vIC8vIEhhbHZlIHNoaWVsZCBhbmQgYXJtb3IgZGVmZW5zZSB2YWx1ZXNcbiAgLy8gcGF0Y2hCeXRlcyhyb20sIDB4MzRiYzAsIFtcbiAgLy8gICAvLyBBcm1vciBkZWZlbnNlXG4gIC8vICAgMCwgMSwgMywgNSwgNywgOSwgMTIsIDEwLCAxNixcbiAgLy8gICAvLyBTaGllbGQgZGVmZW5zZVxuICAvLyAgIDAsIDEsIDMsIDQsIDYsIDksIDgsIDEyLCAxNixcbiAgLy8gXSk7XG5cbiAgLy8gQWRqdXN0IHNoaWVsZCBhbmQgYXJtb3IgZGVmZW5zZSB2YWx1ZXNcbiAgcGF0Y2hCeXRlcyhyb20sIDB4MzRiYzAsIFtcbiAgICAvLyBBcm1vciBkZWZlbnNlXG4gICAgMCwgMiwgNiwgMTAsIDE0LCAxOCwgMzIsIDI0LCAyMCxcbiAgICAvLyBTaGllbGQgZGVmZW5zZVxuICAgIDAsIDIsIDYsIDEwLCAxNCwgMTgsIDE2LCAzMiwgMjAsXG4gIF0pO1xufTtcblxuY29uc3QgcmVzY2FsZVNob3BzID0gKHJvbTogUm9tLCBhc206IEFzc2VtYmxlciwgcmFuZG9tPzogUmFuZG9tKSA9PiB7XG4gIC8vIFBvcHVsYXRlIHJlc2NhbGVkIHByaWNlcyBpbnRvIHRoZSB2YXJpb3VzIHJvbSBsb2NhdGlvbnMuXG4gIC8vIFNwZWNpZmljYWxseSwgd2UgcmVhZCB0aGUgYXZhaWxhYmxlIGl0ZW0gSURzIG91dCBvZiB0aGVcbiAgLy8gc2hvcCB0YWJsZXMgYW5kIHRoZW4gY29tcHV0ZSBuZXcgcHJpY2VzIGZyb20gdGhlcmUuXG4gIC8vIElmIGByYW5kb21gIGlzIHBhc3NlZCB0aGVuIHRoZSBiYXNlIHByaWNlIHRvIGJ1eSBlYWNoXG4gIC8vIGl0ZW0gYXQgYW55IGdpdmVuIHNob3Agd2lsbCBiZSBhZGp1c3RlZCB0byBhbnl3aGVyZSBmcm9tXG4gIC8vIDUwJSB0byAxNTAlIG9mIHRoZSBiYXNlIHByaWNlLiAgVGhlIHBhd24gc2hvcCBwcmljZSBpc1xuICAvLyBhbHdheXMgNTAlIG9mIHRoZSBiYXNlIHByaWNlLlxuXG4gIHJvbS5zaG9wQ291bnQgPSAxMTsgLy8gMTEgb2YgYWxsIHR5cGVzIG9mIHNob3AgZm9yIHNvbWUgcmVhc29uLlxuICByb20uc2hvcERhdGFUYWJsZXNBZGRyZXNzID0gYXNtLmV4cGFuZCgnU2hvcERhdGEnKTtcblxuICAvLyBOT1RFOiBUaGlzIGlzbid0IGluIHRoZSBSb20gb2JqZWN0IHlldC4uLlxuICB3cml0ZUxpdHRsZUVuZGlhbihyb20ucHJnLCBhc20uZXhwYW5kKCdJbm5CYXNlUHJpY2UnKSwgMjApO1xuXG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoc2hvcC50eXBlID09PSBTaG9wVHlwZS5QQVdOKSBjb250aW51ZTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2hvcC5wcmljZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldIDwgMHg4MCkge1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IHJhbmRvbSA/IHJhbmRvbS5uZXh0Tm9ybWFsKDEsIDAuMywgMC41LCAxLjUpIDogMTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5JTk4pIHtcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8ganVzdCBzZXQgdGhlIG9uZSBwcmljZVxuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IHJhbmRvbSA/IHJhbmRvbS5uZXh0Tm9ybWFsKDEsIDAuNSwgMC4zNzUsIDEuNjI1KSA6IDE7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQWxzbyBmaWxsIHRoZSBzY2FsaW5nIHRhYmxlcy5cbiAgY29uc3QgZGlmZiA9IHNlcSg0OCwgeCA9PiB4KTtcbiAgLy8gVG9vbCBzaG9wcyBzY2FsZSBhcyAyICoqIChEaWZmIC8gMTApLCBzdG9yZSBpbiA4dGhzXG4gIHBhdGNoQnl0ZXMocm9tLnByZywgYXNtLmV4cGFuZCgnVG9vbFNob3BTY2FsaW5nJyksXG4gICAgICAgICAgICAgZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDggKiAoMiAqKiAoZCAvIDEwKSkpKSk7XG4gIC8vIEFybW9yIHNob3BzIHNjYWxlIGFzIDIgKiogKCg0NyAtIERpZmYpIC8gMTIpLCBzdG9yZSBpbiA4dGhzXG4gIHBhdGNoQnl0ZXMocm9tLnByZywgYXNtLmV4cGFuZCgnQXJtb3JTaG9wU2NhbGluZycpLFxuICAgICAgICAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg4ICogKDIgKiogKCg0NyAtIGQpIC8gMTIpKSkpKTtcblxuICAvLyBTZXQgdGhlIGl0ZW0gYmFzZSBwcmljZXMuXG4gIGZvciAobGV0IGkgPSAweDBkOyBpIDwgMHgyNzsgaSsrKSB7XG4gICAgcm9tLml0ZW1zW2ldLmJhc2VQcmljZSA9IEJBU0VfUFJJQ0VTW2ldO1xuICB9XG5cbiAgLy8gVE9ETyAtIHNlcGFyYXRlIGZsYWcgZm9yIHJlc2NhbGluZyBtb25zdGVycz8/P1xufTtcblxuLy8gTWFwIG9mIGJhc2UgcHJpY2VzLiAgKFRvb2xzIGFyZSBwb3NpdGl2ZSwgYXJtb3JzIGFyZSBvbmVzLWNvbXBsZW1lbnQuKVxuY29uc3QgQkFTRV9QUklDRVM6IHtbaXRlbUlkOiBudW1iZXJdOiBudW1iZXJ9ID0ge1xuICAvLyBBcm1vcnNcbiAgMHgwZDogNCwgICAgLy8gY2FyYXBhY2Ugc2hpZWxkXG4gIDB4MGU6IDE2LCAgIC8vIGJyb256ZSBzaGllbGRcbiAgMHgwZjogNTAsICAgLy8gcGxhdGludW0gc2hpZWxkXG4gIDB4MTA6IDMyNSwgIC8vIG1pcnJvcmVkIHNoaWVsZFxuICAweDExOiAxMDAwLCAvLyBjZXJhbWljIHNoaWVsZFxuICAweDEyOiAyMDAwLCAvLyBzYWNyZWQgc2hpZWxkXG4gIDB4MTM6IDQwMDAsIC8vIGJhdHRsZSBzaGllbGRcbiAgMHgxNTogNiwgICAgLy8gdGFubmVkIGhpZGVcbiAgMHgxNjogMjAsICAgLy8gbGVhdGhlciBhcm1vclxuICAweDE3OiA3NSwgICAvLyBicm9uemUgYXJtb3JcbiAgMHgxODogMjUwLCAgLy8gcGxhdGludW0gYXJtb3JcbiAgMHgxOTogMTAwMCwgLy8gc29sZGllciBzdWl0XG4gIDB4MWE6IDQ4MDAsIC8vIGNlcmFtaWMgc3VpdFxuICAvLyBUb29sc1xuICAweDFkOiAyNSwgICAvLyBtZWRpY2FsIGhlcmJcbiAgMHgxZTogMzAsICAgLy8gYW50aWRvdGVcbiAgMHgxZjogNDUsICAgLy8gbHlzaXMgcGxhbnRcbiAgMHgyMDogNDAsICAgLy8gZnJ1aXQgb2YgbGltZVxuICAweDIxOiAzNiwgICAvLyBmcnVpdCBvZiBwb3dlclxuICAweDIyOiAyMDAsICAvLyBtYWdpYyByaW5nXG4gIDB4MjM6IDE1MCwgIC8vIGZydWl0IG9mIHJlcHVuXG4gIDB4MjQ6IDgwLCAgIC8vIHdhcnAgYm9vdHNcbiAgMHgyNjogMzAwLCAgLy8gb3BlbCBzdGF0dWVcbiAgLy8gMHgzMTogNTAsIC8vIGFsYXJtIGZsdXRlXG59O1xuXG4vLy8vLy8vLy9cbi8vLy8vLy8vL1xuLy8vLy8vLy8vXG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN3b3Jkcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKSB7XG4gIC8vIFRPRE8gLSBmbGFncyB0byByYW5kb21pemUgc3dvcmQgZGFtYWdlP1xuICBjb25zdCB7fSA9IHtmbGFncywgcmFuZG9tfSBhcyBhbnk7XG5cbiAgLy8gd2luZCAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyB3aW5kIDIgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiA2XG4gIC8vIHdpbmQgMyA9PiAyLTMgaGl0cyA4TVAgICAgICAgID0+IDhcblxuICAvLyBmaXJlIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIGZpcmUgMiA9PiAzIGhpdHMgICAgICAgICAgICAgID0+IDVcbiAgLy8gZmlyZSAzID0+IDQtNiBoaXRzIDE2TVAgICAgICAgPT4gN1xuXG4gIC8vIHdhdGVyIDEgPT4gMSBoaXQgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2F0ZXIgMiA9PiAxLTIgaGl0cyAgICAgICAgICAgPT4gNlxuICAvLyB3YXRlciAzID0+IDMtNiBoaXRzIDE2TVAgICAgICA9PiA4XG5cbiAgLy8gdGh1bmRlciAxID0+IDEtMiBoaXRzIHNwcmVhZCAgPT4gM1xuICAvLyB0aHVuZGVyIDIgPT4gMS0zIGhpdHMgc3ByZWFkICA9PiA1XG4gIC8vIHRodW5kZXIgMyA9PiA3LTEwIGhpdHMgNDBNUCAgID0+IDdcblxuICByb20ub2JqZWN0c1sweDEwXS5hdGsgPSAzOyAvLyB3aW5kIDFcbiAgcm9tLm9iamVjdHNbMHgxMV0uYXRrID0gNjsgLy8gd2luZCAyXG4gIHJvbS5vYmplY3RzWzB4MTJdLmF0ayA9IDg7IC8vIHdpbmQgM1xuXG4gIHJvbS5vYmplY3RzWzB4MThdLmF0ayA9IDM7IC8vIGZpcmUgMVxuICByb20ub2JqZWN0c1sweDEzXS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxOV0uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTddLmF0ayA9IDc7IC8vIGZpcmUgM1xuICByb20ub2JqZWN0c1sweDFhXS5hdGsgPSA3OyAvLyBmaXJlIDNcblxuICByb20ub2JqZWN0c1sweDE0XS5hdGsgPSAzOyAvLyB3YXRlciAxXG4gIHJvbS5vYmplY3RzWzB4MTVdLmF0ayA9IDY7IC8vIHdhdGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxNl0uYXRrID0gODsgLy8gd2F0ZXIgM1xuXG4gIHJvbS5vYmplY3RzWzB4MWNdLmF0ayA9IDM7IC8vIHRodW5kZXIgMVxuICByb20ub2JqZWN0c1sweDFlXS5hdGsgPSA1OyAvLyB0aHVuZGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxYl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG4gIHJvbS5vYmplY3RzWzB4MWZdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xufVxuXG5mdW5jdGlvbiByZXNjYWxlTW9uc3RlcnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuXG4gIC8vIFRPRE8gLSBmaW5kIGFueXRoaW5nIHNoYXJpbmcgdGhlIHNhbWUgbWVtb3J5IGFuZCB1cGRhdGUgdGhlbSBhcyB3ZWxsXG4gIGNvbnN0IHVuc2NhbGVkTW9uc3RlcnMgPVxuICAgICAgbmV3IFNldDxudW1iZXI+KHNlcSgweDEwMCwgeCA9PiB4KS5maWx0ZXIocyA9PiBzIGluIHJvbS5vYmplY3RzKSk7XG4gIGZvciAoY29uc3QgW2lkXSBvZiBTQ0FMRURfTU9OU1RFUlMpIHtcbiAgICB1bnNjYWxlZE1vbnN0ZXJzLmRlbGV0ZShpZCk7XG4gIH1cbiAgZm9yIChjb25zdCBbaWQsIG1vbnN0ZXJdIG9mIFNDQUxFRF9NT05TVEVSUykge1xuICAgIGZvciAoY29uc3Qgb3RoZXIgb2YgdW5zY2FsZWRNb25zdGVycykge1xuICAgICAgaWYgKHJvbS5vYmplY3RzW2lkXS5iYXNlID09PSByb20ub2JqZWN0c1tvdGhlcl0uYmFzZSkge1xuICAgICAgICBTQ0FMRURfTU9OU1RFUlMuc2V0KG90aGVyLCBtb25zdGVyKTtcbiAgICAgICAgdW5zY2FsZWRNb25zdGVycy5kZWxldGUoaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEZsYWlscyBzaG91bGQgYmUgcHJvamVjdGlsZXMuXG4gIHJvbS5vYmplY3RzWzB4ZjldLmF0dGFja1R5cGUgPSAweGZmO1xuICByb20ub2JqZWN0c1sweGZhXS5hdHRhY2tUeXBlID0gMHhmZjtcbiAgLy8gRml4IFNhYmVyYSAxJ3MgZWxlbWVudGFsIGRlZmVuc2UgdG8gbm8gbG9uZ2VyIGFsbG93IHRodW5kZXJcbiAgcm9tLm9iamVjdHNbMHg3ZF0uZWxlbWVudHMgfD0gMHgwODtcbiAgLy8gRml4IFNhYmVyYSAyJ3MgZmlyZWJhbGxzIHRvIGRvIHNoaWVsZCBkYW1hZ2UgYW5kIG5vdCBjYXVzZSBwYXJhbHlzaXNcbiAgcm9tLm9iamVjdHNbMHhjOF0uYXR0YWNrVHlwZSA9IDB4ZmY7XG4gIHJvbS5vYmplY3RzWzB4YzhdLnN0YXR1c0VmZmVjdCA9IDA7XG5cbiAgY29uc3QgQk9TU0VTID0gbmV3IFNldChbMHg1NywgMHg1ZSwgMHg2OCwgMHg3ZCwgMHg4OCwgMHg5NywgMHg5YiwgMHg5ZV0pO1xuICBjb25zdCBTTElNRVMgPSBuZXcgU2V0KFsweDUwLCAweDUzLCAweDVmLCAweDY5XSk7XG4gIGZvciAoY29uc3QgW2lkLCB7c2RlZiwgc3dyZCwgaGl0cywgc2F0aywgZGdsZCwgc2V4cH1dIG9mIFNDQUxFRF9NT05TVEVSUykge1xuICAgIC8vIGluZGljYXRlIHRoYXQgdGhpcyBvYmplY3QgbmVlZHMgc2NhbGluZ1xuICAgIGNvbnN0IG8gPSByb20ub2JqZWN0c1tpZF0uZGF0YTtcbiAgICBjb25zdCBib3NzID0gQk9TU0VTLmhhcyhpZCkgPyAxIDogMDtcbiAgICBvWzJdIHw9IDB4ODA7IC8vIHJlY29pbFxuICAgIG9bNl0gPSBoaXRzOyAvLyBIUFxuICAgIG9bN10gPSBzYXRrOyAgLy8gQVRLXG4gICAgLy8gU3dvcmQ6IDAuLjMgKHdpbmQgLSB0aHVuZGVyKSBwcmVzZXJ2ZWQsIDQgKGNyeXN0YWxpcykgPT4gN1xuICAgIG9bOF0gPSBzZGVmIHwgc3dyZCA8PCA0OyAvLyBERUZcbiAgICAvLyBOT1RFOiBsb25nIGFnbyB3ZSBzdG9yZWQgd2hldGhlciB0aGlzIHdhcyBhIGJvc3MgaW4gdGhlIGxvd2VzdFxuICAgIC8vIGJpdCBvZiB0aGUgbm93LXVudXNlZCBMRVZFTC4gc28gdGhhdCB3ZSBjb3VsZCBpbmNyZWFzZSBzY2FsaW5nXG4gICAgLy8gb24ga2lsbGluZyB0aGVtLCBidXQgbm93IHRoYXQgc2NhbGluZyBpcyB0aWVkIHRvIGl0ZW1zLCB0aGF0J3NcbiAgICAvLyBubyBsb25nZXIgbmVlZGVkIC0gd2UgY291bGQgY28tb3B0IHRoaXMgdG8gaW5zdGVhZCBzdG9yZSB1cHBlclxuICAgIC8vIGJpdHMgb2YgSFAgKG9yIHBvc3NpYmx5IGxvd2VyIGJpdHMgc28gdGhhdCBIUC1iYXNlZCBlZmZlY3RzXG4gICAgLy8gc3RpbGwgd29yayBjb3JyZWN0bHkpLlxuICAgIC8vIG9bOV0gPSBvWzldICYgMHhlMDtcbiAgICBvWzE2XSA9IG9bMTZdICYgMHgwZiB8IGRnbGQgPDwgNDsgLy8gR0xEXG4gICAgb1sxN10gPSBzZXhwOyAvLyBFWFBcblxuICAgIGlmIChib3NzID8gZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpIDogZmxhZ3Muc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpKSB7XG4gICAgICBpZiAoIVNMSU1FUy5oYXMoaWQpKSB7XG4gICAgICAgIGNvbnN0IGJpdHMgPSBbLi4ucm9tLm9iamVjdHNbaWRdLmVsZW1lbnRzLnRvU3RyaW5nKDIpLnBhZFN0YXJ0KDQsICcwJyldO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShiaXRzKTtcbiAgICAgICAgcm9tLm9iamVjdHNbaWRdLmVsZW1lbnRzID0gTnVtYmVyLnBhcnNlSW50KGJpdHMuam9pbignJyksIDIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGhhbmRsZSBzbGltZXMgYWxsIGF0IG9uY2VcbiAgaWYgKGZsYWdzLnNodWZmbGVNb25zdGVyRWxlbWVudHMoKSkge1xuICAgIC8vIHBpY2sgYW4gZWxlbWVudCBmb3Igc2xpbWUgZGVmZW5zZVxuICAgIGNvbnN0IGUgPSByYW5kb20ubmV4dEludCg0KTtcbiAgICByb20ucHJnWzB4MzUyMmRdID0gZSArIDE7XG4gICAgZm9yIChjb25zdCBpZCBvZiBTTElNRVMpIHtcbiAgICAgIHJvbS5vYmplY3RzW2lkXS5lbGVtZW50cyA9IDEgPDwgZTtcbiAgICB9XG4gIH1cblxuICAvLyByb20ud3JpdGVPYmplY3REYXRhKCk7XG59O1xuXG5jb25zdCBzaHVmZmxlTW9uc3RlcnMgPSAocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSkgPT4ge1xuICAvLyBUT0RPOiBvbmNlIHdlIGhhdmUgbG9jYXRpb24gbmFtZXMsIGNvbXBpbGUgYSBzcG9pbGVyIG9mIHNodWZmbGVkIG1vbnN0ZXJzXG4gIGNvbnN0IGdyYXBoaWNzID0gbmV3IEdyYXBoaWNzKHJvbSk7XG4gIC8vICh3aW5kb3cgYXMgYW55KS5ncmFwaGljcyA9IGdyYXBoaWNzO1xuICBpZiAoZmxhZ3Muc2h1ZmZsZVNwcml0ZVBhbGV0dGVzKCkpIGdyYXBoaWNzLnNodWZmbGVQYWxldHRlcyhyYW5kb20pO1xuICBjb25zdCBwb29sID0gbmV3IE1vbnN0ZXJQb29sKGZsYWdzLCB7fSk7XG4gIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBpZiAobG9jLnVzZWQpIHBvb2wucG9wdWxhdGUobG9jKTtcbiAgfVxuICBwb29sLnNodWZmbGUocmFuZG9tLCBncmFwaGljcyk7XG59O1xuXG5jb25zdCBpZGVudGlmeUtleUl0ZW1zRm9yRGlmZmljdWx0eUJ1ZmZzID0gKHJvbTogUm9tKSA9PiB7XG4gIC8vIC8vIFRhZyBrZXkgaXRlbXMgZm9yIGRpZmZpY3VsdHkgYnVmZnNcbiAgLy8gZm9yIChjb25zdCBnZXQgb2Ygcm9tLml0ZW1HZXRzKSB7XG4gIC8vICAgY29uc3QgaXRlbSA9IElURU1TLmdldChnZXQuaXRlbUlkKTtcbiAgLy8gICBpZiAoIWl0ZW0gfHwgIWl0ZW0ua2V5KSBjb250aW51ZTtcbiAgLy8gICBnZXQua2V5ID0gdHJ1ZTtcbiAgLy8gfVxuICAvLyAvLyBjb25zb2xlLmxvZyhyZXBvcnQpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDB4NDk7IGkrKykge1xuICAgIC8vIE5PVEUgLSBzcGVjaWFsIGhhbmRsaW5nIGZvciBhbGFybSBmbHV0ZSB1bnRpbCB3ZSBwcmUtcGF0Y2hcbiAgICBjb25zdCB1bmlxdWUgPSAocm9tLnByZ1sweDIwZmYwICsgaV0gJiAweDQwKSB8fCBpID09PSAweDMxO1xuICAgIGNvbnN0IGJpdCA9IDEgPDwgKGkgJiA3KTtcbiAgICBjb25zdCBhZGRyID0gMHgxZTExMCArIChpID4+PiAzKTtcbiAgICByb20ucHJnW2FkZHJdID0gcm9tLnByZ1thZGRyXSAmIH5iaXQgfCAodW5pcXVlID8gYml0IDogMCk7XG4gIH1cbn07XG5cbmludGVyZmFjZSBNb25zdGVyRGF0YSB7XG4gIGlkOiBudW1iZXI7XG4gIHR5cGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBzZGVmOiBudW1iZXI7XG4gIHN3cmQ6IG51bWJlcjtcbiAgaGl0czogbnVtYmVyO1xuICBzYXRrOiBudW1iZXI7XG4gIGRnbGQ6IG51bWJlcjtcbiAgc2V4cDogbnVtYmVyO1xufVxuXG4vKiB0c2xpbnQ6ZGlzYWJsZTp0cmFpbGluZy1jb21tYSB3aGl0ZXNwYWNlICovXG5jb25zdCBTQ0FMRURfTU9OU1RFUlM6IE1hcDxudW1iZXIsIE1vbnN0ZXJEYXRhPiA9IG5ldyBNYXAoW1xuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4M2YsICdwJywgJ1NvcmNlcm9yIHNob3QnLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE5LCAgLCAgICAsXSxcbiAgWzB4NGIsICdtJywgJ3dyYWl0aD8/JywgICAgICAgICAgICAgICAgICAgMiwgICwgICAyLCAgIDIyLCAgNCwgICA2MV0sXG4gIFsweDRmLCAnbScsICd3cmFpdGgnLCAgICAgICAgICAgICAgICAgICAgIDEsICAsICAgMiwgICAyMCwgIDQsICAgNjFdLFxuICBbMHg1MCwgJ20nLCAnQmx1ZSBTbGltZScsICAgICAgICAgICAgICAgICAsICAgLCAgIDEsICAgMTYsICAyLCAgIDMyXSxcbiAgWzB4NTEsICdtJywgJ1dlcmV0aWdlcicsICAgICAgICAgICAgICAgICAgLCAgICwgICAxLCAgIDIxLCAgNCwgICA0MF0sXG4gIFsweDUyLCAnbScsICdHcmVlbiBKZWxseScsICAgICAgICAgICAgICAgIDQsICAsICAgMywgICAxNiwgIDQsICAgMzZdLFxuICBbMHg1MywgJ20nLCAnUmVkIFNsaW1lJywgICAgICAgICAgICAgICAgICA2LCAgLCAgIDQsICAgMTYsICA0LCAgIDQ4XSxcbiAgWzB4NTQsICdtJywgJ1JvY2sgR29sZW0nLCAgICAgICAgICAgICAgICAgNiwgICwgICAxMSwgIDI0LCAgNiwgICA4NV0sXG4gIFsweDU1LCAnbScsICdCbHVlIEJhdCcsICAgICAgICAgICAgICAgICAgICwgICAsICAgLCAgICA0LCAgICwgICAgMzJdLFxuICBbMHg1NiwgJ20nLCAnR3JlZW4gV3l2ZXJuJywgICAgICAgICAgICAgICA0LCAgLCAgIDQsICAgMjQsICA2LCAgIDUyXSxcbiAgWzB4NTcsICdiJywgJ1ZhbXBpcmUnLCAgICAgICAgICAgICAgICAgICAgMywgICwgICAxMiwgIDE4LCAgLCAgICAsXSxcbiAgWzB4NTgsICdtJywgJ09yYycsICAgICAgICAgICAgICAgICAgICAgICAgMywgICwgICA0LCAgIDIxLCAgNCwgICA1N10sXG4gIFsweDU5LCAnbScsICdSZWQgRmx5aW5nIFN3YW1wIEluc2VjdCcsICAgIDMsICAsICAgMSwgICAyMSwgIDQsICAgNTddLFxuICBbMHg1YSwgJ20nLCAnQmx1ZSBNdXNocm9vbScsICAgICAgICAgICAgICAyLCAgLCAgIDEsICAgMjEsICA0LCAgIDQ0XSxcbiAgWzB4NWIsICdtJywgJ1N3YW1wIFRvbWF0bycsICAgICAgICAgICAgICAgMywgICwgICAyLCAgIDM1LCAgNCwgICA1Ml0sXG4gIFsweDVjLCAnbScsICdGbHlpbmcgTWVhZG93IEluc2VjdCcsICAgICAgIDMsICAsICAgMywgICAyMywgIDQsICAgODFdLFxuICBbMHg1ZCwgJ20nLCAnU3dhbXAgUGxhbnQnLCAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgLCAgICAsICAgIDM2XSxcbiAgWzB4NWUsICdiJywgJ0luc2VjdCcsICAgICAgICAgICAgICAgICAgICAgLCAgIDEsICA4LCAgIDYsICAgLCAgICAsXSxcbiAgWzB4NWYsICdtJywgJ0xhcmdlIEJsdWUgU2xpbWUnLCAgICAgICAgICAgNSwgICwgICAzLCAgIDIwLCAgNCwgICA1Ml0sXG4gIFsweDYwLCAnbScsICdJY2UgWm9tYmllJywgICAgICAgICAgICAgICAgIDUsICAsICAgNywgICAxNCwgIDQsICAgNTddLFxuICBbMHg2MSwgJ20nLCAnR3JlZW4gTGl2aW5nIFJvY2snLCAgICAgICAgICAsICAgLCAgIDEsICAgOSwgICA0LCAgIDI4XSxcbiAgWzB4NjIsICdtJywgJ0dyZWVuIFNwaWRlcicsICAgICAgICAgICAgICAgNCwgICwgICA0LCAgIDIyLCAgNCwgICA0NF0sXG4gIFsweDYzLCAnbScsICdSZWQvUHVycGxlIFd5dmVybicsICAgICAgICAgIDMsICAsICAgNCwgICAzMCwgIDQsICAgNjVdLFxuICBbMHg2NCwgJ20nLCAnRHJheWdvbmlhIFNvbGRpZXInLCAgICAgICAgICA2LCAgLCAgIDExLCAgMzYsICA0LCAgIDg5XSxcbiAgLy8gSUQgIFRZUEUgIE5BTUUgICAgICAgICAgICAgICAgICAgICAgIFNERUYgU1dSRCBISVRTIFNBVEsgREdMRCBTRVhQXG4gIFsweDY1LCAnbScsICdJY2UgRW50aXR5JywgICAgICAgICAgICAgICAgIDMsICAsICAgMiwgICAyNCwgIDQsICAgNTJdLFxuICBbMHg2NiwgJ20nLCAnUmVkIExpdmluZyBSb2NrJywgICAgICAgICAgICAsICAgLCAgIDEsICAgMTMsICA0LCAgIDQwXSxcbiAgWzB4NjcsICdtJywgJ0ljZSBHb2xlbScsICAgICAgICAgICAgICAgICAgNywgIDIsICAxMSwgIDI4LCAgNCwgICA4MV0sXG4gIFsweDY4LCAnYicsICdLZWxiZXNxdWUnLCAgICAgICAgICAgICAgICAgIDQsICA2LCAgMTIsICAyOSwgICwgICAgLF0sXG4gIFsweDY5LCAnbScsICdHaWFudCBSZWQgU2xpbWUnLCAgICAgICAgICAgIDcsICAsICAgNDAsICA5MCwgIDQsICAgMTAyXSxcbiAgWzB4NmEsICdtJywgJ1Ryb2xsJywgICAgICAgICAgICAgICAgICAgICAgMiwgICwgICAzLCAgIDI0LCAgNCwgICA2NV0sXG4gIFsweDZiLCAnbScsICdSZWQgSmVsbHknLCAgICAgICAgICAgICAgICAgIDIsICAsICAgMiwgICAxNCwgIDQsICAgNDRdLFxuICBbMHg2YywgJ20nLCAnTWVkdXNhJywgICAgICAgICAgICAgICAgICAgICAzLCAgLCAgIDQsICAgMzYsICA4LCAgIDc3XSxcbiAgWzB4NmQsICdtJywgJ1JlZCBDcmFiJywgICAgICAgICAgICAgICAgICAgMiwgICwgICAxLCAgIDIxLCAgNCwgICA0NF0sXG4gIFsweDZlLCAnbScsICdNZWR1c2EgSGVhZCcsICAgICAgICAgICAgICAgICwgICAsICAgMSwgICAyOSwgIDQsICAgMzZdLFxuICBbMHg2ZiwgJ20nLCAnRXZpbCBCaXJkJywgICAgICAgICAgICAgICAgICAsICAgLCAgIDIsICAgMzAsICA2LCAgIDY1XSxcbiAgWzB4NzEsICdtJywgJ1JlZC9QdXJwbGUgTXVzaHJvb20nLCAgICAgICAgMywgICwgICA1LCAgIDE5LCAgNiwgICA2OV0sXG4gIFsweDcyLCAnbScsICdWaW9sZXQgRWFydGggRW50aXR5JywgICAgICAgIDMsICAsICAgMywgICAxOCwgIDYsICAgNjFdLFxuICBbMHg3MywgJ20nLCAnTWltaWMnLCAgICAgICAgICAgICAgICAgICAgICAsICAgLCAgIDMsICAgMjYsICAxNSwgIDczXSxcbiAgWzB4NzQsICdtJywgJ1JlZCBTcGlkZXInLCAgICAgICAgICAgICAgICAgMywgICwgICA0LCAgIDIyLCAgNiwgICA0OF0sXG4gIFsweDc1LCAnbScsICdGaXNobWFuJywgICAgICAgICAgICAgICAgICAgIDQsICAsICAgNiwgICAxOSwgIDUsICAgNjFdLFxuICBbMHg3NiwgJ20nLCAnSmVsbHlmaXNoJywgICAgICAgICAgICAgICAgICAsICAgLCAgIDMsICAgMTQsICAzLCAgIDQ4XSxcbiAgWzB4NzcsICdtJywgJ0tyYWtlbicsICAgICAgICAgICAgICAgICAgICAgNSwgICwgICAxMSwgIDI1LCAgNywgICA3M10sXG4gIFsweDc4LCAnbScsICdEYXJrIEdyZWVuIFd5dmVybicsICAgICAgICAgIDQsICAsICAgNSwgICAyMSwgIDUsICAgNjFdLFxuICBbMHg3OSwgJ20nLCAnU2FuZCBNb25zdGVyJywgICAgICAgICAgICAgICA1LCAgLCAgIDgsICAgNiwgICA0LCAgIDU3XSxcbiAgWzB4N2IsICdtJywgJ1dyYWl0aCBTaGFkb3cgMScsICAgICAgICAgICAgLCAgICwgICAsICAgIDksICAgNywgICA0NF0sXG4gIFsweDdjLCAnbScsICdLaWxsZXIgTW90aCcsICAgICAgICAgICAgICAgICwgICAsICAgMiwgICAzNSwgICwgICAgNzddLFxuICBbMHg3ZCwgJ2InLCAnU2FiZXJhJywgICAgICAgICAgICAgICAgICAgICAzLCAgNywgIDEzLCAgMjQsICAsICAgICxdLFxuICBbMHg4MCwgJ20nLCAnRHJheWdvbmlhIEFyY2hlcicsICAgICAgICAgICAxLCAgLCAgIDMsICAgMjAsICA2LCAgIDYxXSxcbiAgLy8gSUQgIFRZUEUgIE5BTUUgICAgICAgICAgICAgICAgICAgICAgIFNERUYgU1dSRCBISVRTIFNBVEsgREdMRCBTRVhQXG4gIFsweDgxLCAnbScsICdFdmlsIEJvbWJlciBCaXJkJywgICAgICAgICAgICwgICAsICAgMSwgICAxOSwgIDQsICAgNjVdLFxuICBbMHg4MiwgJ20nLCAnTGF2YW1hbi9ibG9iJywgICAgICAgICAgICAgICAzLCAgLCAgIDMsICAgMjQsICA2LCAgIDg1XSxcbiAgWzB4ODQsICdtJywgJ0xpemFyZG1hbiAody8gZmxhaWwoJywgICAgICAgMiwgICwgICAzLCAgIDMwLCAgNiwgICA4MV0sXG4gIFsweDg1LCAnbScsICdHaWFudCBFeWUnLCAgICAgICAgICAgICAgICAgIDMsICAsICAgNSwgICAzMywgIDQsICAgODFdLFxuICBbMHg4NiwgJ20nLCAnU2FsYW1hbmRlcicsICAgICAgICAgICAgICAgICAyLCAgLCAgIDQsICAgMjksICA4LCAgIDc3XSxcbiAgWzB4ODcsICdtJywgJ1NvcmNlcm9yJywgICAgICAgICAgICAgICAgICAgMiwgICwgICA1LCAgIDMxLCAgNiwgICA2NV0sXG4gIFsweDg4LCAnYicsICdNYWRvJywgICAgICAgICAgICAgICAgICAgICAgIDQsICA4LCAgMTAsICAzMCwgICwgICAgLF0sXG4gIFsweDg5LCAnbScsICdEcmF5Z29uaWEgS25pZ2h0JywgICAgICAgICAgIDIsICAsICAgMywgICAyNCwgIDQsICAgNzddLFxuICBbMHg4YSwgJ20nLCAnRGV2aWwnLCAgICAgICAgICAgICAgICAgICAgICAsICAgLCAgIDEsICAgMTgsICA0LCAgIDUyXSxcbiAgWzB4OGIsICdiJywgJ0tlbGJlc3F1ZSAyJywgICAgICAgICAgICAgICAgNCwgIDYsICAxMSwgIDI3LCAgLCAgICAsXSxcbiAgWzB4OGMsICdtJywgJ1dyYWl0aCBTaGFkb3cgMicsICAgICAgICAgICAgLCAgICwgICAsICAgIDE3LCAgNCwgICA0OF0sXG4gIFsweDkwLCAnYicsICdTYWJlcmEgMicsICAgICAgICAgICAgICAgICAgIDUsICA3LCAgMjEsICAyNywgICwgICAgLF0sXG4gIFsweDkxLCAnbScsICdUYXJhbnR1bGEnLCAgICAgICAgICAgICAgICAgIDMsICAsICAgMywgICAyMSwgIDYsICAgNzNdLFxuICBbMHg5MiwgJ20nLCAnU2tlbGV0b24nLCAgICAgICAgICAgICAgICAgICAsICAgLCAgIDQsICAgMzAsICA2LCAgIDY5XSxcbiAgWzB4OTMsICdiJywgJ01hZG8gMicsICAgICAgICAgICAgICAgICAgICAgNCwgIDgsICAxMSwgIDI1LCAgLCAgICAsXSxcbiAgWzB4OTQsICdtJywgJ1B1cnBsZSBHaWFudCBFeWUnLCAgICAgICAgICAgNCwgICwgICAxMCwgIDIzLCAgNiwgICAxMDJdLFxuICBbMHg5NSwgJ20nLCAnQmxhY2sgS25pZ2h0ICh3LyBmbGFpbCknLCAgICAzLCAgLCAgIDcsICAgMjYsICA2LCAgIDg5XSxcbiAgWzB4OTYsICdtJywgJ1Njb3JwaW9uJywgICAgICAgICAgICAgICAgICAgMywgICwgICA1LCAgIDI5LCAgMiwgICA3M10sXG4gIFsweDk3LCAnYicsICdLYXJtaW5lJywgICAgICAgICAgICAgICAgICAgIDQsICAsICAgMTQsICAyNiwgICwgICAgLF0sXG4gIFsweDk4LCAnbScsICdTYW5kbWFuL2Jsb2InLCAgICAgICAgICAgICAgIDMsICAsICAgNSwgICAzNiwgIDYsICAgOThdLFxuICBbMHg5OSwgJ20nLCAnTXVtbXknLCAgICAgICAgICAgICAgICAgICAgICA1LCAgLCAgIDE5LCAgMzYsICA2LCAgIDExMF0sXG4gIFsweDlhLCAnbScsICdUb21iIEd1YXJkaWFuJywgICAgICAgICAgICAgIDcsICAsICAgNjAsICAzNywgIDYsICAgMTA2XSxcbiAgWzB4OWIsICdiJywgJ0RyYXlnb24nLCAgICAgICAgICAgICAgICAgICAgNSwgIDYsICAxNiwgIDQxLCAgLCAgICAsXSxcbiAgWzB4OWUsICdiJywgJ0RyYXlnb24gMicsICAgICAgICAgICAgICAgICAgNywgIDYsICAyOCwgIDQwLCAgLCAgICAsXSxcbiAgLy8gSUQgIFRZUEUgIE5BTUUgICAgICAgICAgICAgICAgICAgICAgIFNERUYgU1dSRCBISVRTIFNBVEsgREdMRCBTRVhQXG4gIFsweGEwLCAnbScsICdHcm91bmQgU2VudHJ5ICgxKScsICAgICAgICAgIDQsICAsICAgNiwgICAyNiwgICwgICAgNzNdLFxuICBbMHhhMSwgJ20nLCAnVG93ZXIgRGVmZW5zZSBNZWNoICgyKScsICAgICA1LCAgLCAgIDgsICAgMzYsICAsICAgIDg1XSxcbiAgWzB4YTIsICdtJywgJ1Rvd2VyIFNlbnRpbmVsJywgICAgICAgICAgICAgLCAgICwgICAxLCAgICwgICAgLCAgICAzMl0sXG4gIFsweGEzLCAnbScsICdBaXIgU2VudHJ5JywgICAgICAgICAgICAgICAgIDMsICAsICAgMiwgICAyNiwgICwgICAgNjVdLFxuICAvLyBbMHhhNCwgJ2InLCAnRHluYScsICAgICAgICAgICAgICAgICAgICAgICA2LCAgNSwgIDE2LCAgLCAgICAsICAgICxdLFxuICBbMHhhNSwgJ2InLCAnVmFtcGlyZSAyJywgICAgICAgICAgICAgICAgICAzLCAgLCAgIDEyLCAgMjcsICAsICAgICxdLFxuICAvLyBbMHhiNCwgJ2InLCAnZHluYSBwb2QnLCAgICAgICAgICAgICAgICAgICAxNSwgLCAgIDI1NSwgMjYsICAsICAgICxdLFxuICAvLyBbMHhiOCwgJ3AnLCAnZHluYSBjb3VudGVyJywgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjYsICAsICAgICxdLFxuICAvLyBbMHhiOSwgJ3AnLCAnZHluYSBsYXNlcicsICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjYsICAsICAgICxdLFxuICAvLyBbMHhiYSwgJ3AnLCAnZHluYSBidWJibGUnLCAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzYsICAsICAgICxdLFxuICBbMHhhNCwgJ2InLCAnRHluYScsICAgICAgICAgICAgICAgICAgICAgICA2LCAgNSwgIDMyLCAgLCAgICAsICAgICxdLFxuICBbMHhiNCwgJ2InLCAnZHluYSBwb2QnLCAgICAgICAgICAgICAgICAgICA2LCAgNSwgIDQ4LCAgMjYsICAsICAgICxdLFxuICBbMHhiOCwgJ3AnLCAnZHluYSBjb3VudGVyJywgICAgICAgICAgICAgIDE1LCAgLCAgICwgICAgNDIsICAsICAgICxdLFxuICBbMHhiOSwgJ3AnLCAnZHluYSBsYXNlcicsICAgICAgICAgICAgICAgIDE1LCAgLCAgICwgICAgNDIsICAsICAgICxdLFxuICBbMHhiYSwgJ3AnLCAnZHluYSBidWJibGUnLCAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMzYsICAsICAgICxdLFxuICAvL1xuICBbMHhiYywgJ20nLCAndmFtcDIgYmF0JywgICAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTYsICAsICAgIDE1XSxcbiAgWzB4YmYsICdwJywgJ2RyYXlnb24yIGZpcmViYWxsJywgICAgICAgICAgLCAgICwgICAsICAgIDI2LCAgLCAgICAsXSxcbiAgWzB4YzEsICdtJywgJ3ZhbXAxIGJhdCcsICAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE2LCAgLCAgICAxNV0sXG4gIFsweGMzLCAncCcsICdnaWFudCBpbnNlY3Qgc3BpdCcsICAgICAgICAgICwgICAsICAgLCAgICAzNSwgICwgICAgLF0sXG4gIFsweGM0LCAnbScsICdzdW1tb25lZCBpbnNlY3QnLCAgICAgICAgICAgIDQsICAsICAgMiwgICA0MiwgICwgICAgOThdLFxuICBbMHhjNSwgJ3AnLCAna2VsYnkxIHJvY2snLCAgICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjIsICAsICAgICxdLFxuICBbMHhjNiwgJ3AnLCAnc2FiZXJhMSBiYWxscycsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTksICAsICAgICxdLFxuICBbMHhjNywgJ3AnLCAna2VsYnkyIGZpcmViYWxscycsICAgICAgICAgICAsICAgLCAgICwgICAgMTEsICAsICAgICxdLFxuICBbMHhjOCwgJ3AnLCAnc2FiZXJhMiBmaXJlJywgICAgICAgICAgICAgICAsICAgLCAgIDEsICAgNiwgICAsICAgICxdLFxuICBbMHhjOSwgJ3AnLCAnc2FiZXJhMiBiYWxscycsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMTcsICAsICAgICxdLFxuICBbMHhjYSwgJ3AnLCAna2FybWluZSBiYWxscycsICAgICAgICAgICAgICAsICAgLCAgICwgICAgMjUsICAsICAgICxdLFxuICBbMHhjYiwgJ3AnLCAnc3VuL21vb24gc3RhdHVlIGZpcmViYWxscycsICAsICAgLCAgICwgICAgMzksICAsICAgICxdLFxuICBbMHhjYywgJ3AnLCAnZHJheWdvbjEgbGlnaHRuaW5nJywgICAgICAgICAsICAgLCAgICwgICAgMzcsICAsICAgICxdLFxuICBbMHhjZCwgJ3AnLCAnZHJheWdvbjIgbGFzZXInLCAgICAgICAgICAgICAsICAgLCAgICwgICAgMzYsICAsICAgICxdLFxuICAvLyBJRCAgVFlQRSAgTkFNRSAgICAgICAgICAgICAgICAgICAgICAgU0RFRiBTV1JEIEhJVFMgU0FUSyBER0xEIFNFWFBcbiAgWzB4Y2UsICdwJywgJ2RyYXlnb24yIGJyZWF0aCcsICAgICAgICAgICAgLCAgICwgICAsICAgIDM2LCAgLCAgICAsXSxcbiAgWzB4ZTAsICdwJywgJ2V2aWwgYm9tYmVyIGJpcmQgYm9tYicsICAgICAgLCAgICwgICAsICAgIDIsICAgLCAgICAsXSxcbiAgWzB4ZTIsICdwJywgJ3N1bW1vbmVkIGluc2VjdCBib21iJywgICAgICAgLCAgICwgICAsICAgIDQ3LCAgLCAgICAsXSxcbiAgWzB4ZTMsICdwJywgJ3BhcmFseXNpcyBiZWFtJywgICAgICAgICAgICAgLCAgICwgICAsICAgIDIzLCAgLCAgICAsXSxcbiAgWzB4ZTQsICdwJywgJ3N0b25lIGdhemUnLCAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDMzLCAgLCAgICAsXSxcbiAgWzB4ZTUsICdwJywgJ3JvY2sgZ29sZW0gcm9jaycsICAgICAgICAgICAgLCAgICwgICAsICAgIDI0LCAgLCAgICAsXSxcbiAgWzB4ZTYsICdwJywgJ2N1cnNlIGJlYW0nLCAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDEwLCAgLCAgICAsXSxcbiAgWzB4ZTcsICdwJywgJ21wIGRyYWluIHdlYicsICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDExLCAgLCAgICAsXSxcbiAgWzB4ZTgsICdwJywgJ2Zpc2htYW4gdHJpZGVudCcsICAgICAgICAgICAgLCAgICwgICAsICAgIDE1LCAgLCAgICAsXSxcbiAgWzB4ZTksICdwJywgJ29yYyBheGUnLCAgICAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDI0LCAgLCAgICAsXSxcbiAgWzB4ZWEsICdwJywgJ1N3YW1wIFBvbGxlbicsICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDM3LCAgLCAgICAsXSxcbiAgWzB4ZWIsICdwJywgJ3BhcmFseXNpcyBwb3dkZXInLCAgICAgICAgICAgLCAgICwgICAsICAgIDE3LCAgLCAgICAsXSxcbiAgWzB4ZWMsICdwJywgJ2RyYXlnb25pYSBzb2xpZGVyIHN3b3JkJywgICAgLCAgICwgICAsICAgIDI4LCAgLCAgICAsXSxcbiAgWzB4ZWQsICdwJywgJ2ljZSBnb2xlbSByb2NrJywgICAgICAgICAgICAgLCAgICwgICAsICAgIDIwLCAgLCAgICAsXSxcbiAgWzB4ZWUsICdwJywgJ3Ryb2xsIGF4ZScsICAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDI3LCAgLCAgICAsXSxcbiAgWzB4ZWYsICdwJywgJ2tyYWtlbiBpbmsnLCAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDI0LCAgLCAgICAsXSxcbiAgWzB4ZjAsICdwJywgJ2RyYXlnb25pYSBhcmNoZXIgYXJyb3cnLCAgICAgLCAgICwgICAsICAgIDEyLCAgLCAgICAsXSxcbiAgWzB4ZjEsICdwJywgJz8/PyB1bnVzZWQnLCAgICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE2LCAgLCAgICAsXSxcbiAgWzB4ZjIsICdwJywgJ2RyYXlnb25pYSBrbmlnaHQgc3dvcmQnLCAgICAgLCAgICwgICAsICAgIDksICAgLCAgICAsXSxcbiAgWzB4ZjMsICdwJywgJ21vdGggcmVzaWR1ZScsICAgICAgICAgICAgICAgLCAgICwgICAsICAgIDE5LCAgLCAgICAsXSxcbiAgWzB4ZjQsICdwJywgJ2dyb3VuZCBzZW50cnkgbGFzZXInLCAgICAgICAgLCAgICwgICAsICAgIDEzLCAgLCAgICAsXSxcbiAgWzB4ZjUsICdwJywgJ3Rvd2VyIGRlZmVuc2UgbWVjaCBsYXNlcicsICAgLCAgICwgICAsICAgIDIzLCAgLCAgICAsXSxcbiAgWzB4ZjYsICdwJywgJ3Rvd2VyIHNlbnRpbmVsIGxhc2VyJywgICAgICAgLCAgICwgICAsICAgIDgsICAgLCAgICAsXSxcbiAgWzB4ZjcsICdwJywgJ3NrZWxldG9uIHNob3QnLCAgICAgICAgICAgICAgLCAgICwgICAsICAgIDExLCAgLCAgICAsXSxcbiAgLy8gSUQgIFRZUEUgIE5BTUUgICAgICAgICAgICAgICAgICAgICAgIFNERUYgU1dSRCBISVRTIFNBVEsgREdMRCBTRVhQXG4gIFsweGY4LCAncCcsICdsYXZhbWFuIHNob3QnLCAgICAgICAgICAgICAgICwgICAsICAgLCAgICAxNCwgICwgICAgLF0sXG4gIFsweGY5LCAncCcsICdibGFjayBrbmlnaHQgZmxhaWwnLCAgICAgICAgICwgICAsICAgLCAgICAxOCwgICwgICAgLF0sXG4gIFsweGZhLCAncCcsICdsaXphcmRtYW4gZmxhaWwnLCAgICAgICAgICAgICwgICAsICAgLCAgICAyMSwgICwgICAgLF0sXG4gIFsweGZjLCAncCcsICdtYWRvIHNodXJpa2VuJywgICAgICAgICAgICAgICwgICAsICAgLCAgICAzNiwgICwgICAgLF0sXG4gIFsweGZkLCAncCcsICdndWFyZGlhbiBzdGF0dWUgbWlzc2lsZScsICAgICwgICAsICAgLCAgICAyMywgICwgICAgLF0sXG4gIFsweGZlLCAncCcsICdkZW1vbiB3YWxsIGZpcmUnLCAgICAgICAgICAgICwgICAsICAgLCAgICAyMywgICwgICAgLF0sXG5dLm1hcCgoW2lkLCB0eXBlLCBuYW1lLCBzZGVmPTAsIHN3cmQ9MCwgaGl0cz0wLCBzYXRrPTAsIGRnbGQ9MCwgc2V4cD0wXSkgPT5cbiAgICAgIFtpZCwge2lkLCB0eXBlLCBuYW1lLCBzZGVmLCBzd3JkLCBoaXRzLCBzYXRrLCBkZ2xkLCBzZXhwfV0pKSBhcyBhbnk7XG5cbi8qIHRzbGludDplbmFibGU6dHJhaWxpbmctY29tbWEgd2hpdGVzcGFjZSAqL1xuXG4vLyBXaGVuIGRlYWxpbmcgd2l0aCBjb25zdHJhaW50cywgaXQncyBiYXNpY2FsbHkga3NhdFxuLy8gIC0gd2UgaGF2ZSBhIGxpc3Qgb2YgcmVxdWlyZW1lbnRzIHRoYXQgYXJlIEFORGVkIHRvZ2V0aGVyXG4vLyAgLSBlYWNoIGlzIGEgbGlzdCBvZiBwcmVkaWNhdGVzIHRoYXQgYXJlIE9SZWQgdG9nZXRoZXJcbi8vICAtIGVhY2ggcHJlZGljYXRlIGhhcyBhIGNvbnRpbnVhdGlvbiBmb3Igd2hlbiBpdCdzIHBpY2tlZFxuLy8gIC0gbmVlZCBhIHdheSB0byB0aGluIHRoZSBjcm93ZCwgZWZmaWNpZW50bHkgY2hlY2sgY29tcGF0LCBldGNcbi8vIFByZWRpY2F0ZSBpcyBhIGZvdXItZWxlbWVudCBhcnJheSBbcGF0MCxwYXQxLHBhbDIscGFsM11cbi8vIFJhdGhlciB0aGFuIGEgY29udGludWF0aW9uIHdlIGNvdWxkIGdvIHRocm91Z2ggYWxsIHRoZSBzbG90cyBhZ2FpblxuXG4vLyBjbGFzcyBDb25zdHJhaW50cyB7XG4vLyAgIGNvbnN0cnVjdG9yKCkge1xuLy8gICAgIC8vIEFycmF5IG9mIHBhdHRlcm4gdGFibGUgb3B0aW9ucy4gIE51bGwgaW5kaWNhdGVzIHRoYXQgaXQgY2FuIGJlIGFueXRoaW5nLlxuLy8gICAgIC8vXG4vLyAgICAgdGhpcy5wYXR0ZXJucyA9IFtbbnVsbCwgbnVsbF1dO1xuLy8gICAgIHRoaXMucGFsZXR0ZXMgPSBbW251bGwsIG51bGxdXTtcbi8vICAgICB0aGlzLmZseWVycyA9IDA7XG4vLyAgIH1cblxuLy8gICByZXF1aXJlVHJlYXN1cmVDaGVzdCgpIHtcbi8vICAgICB0aGlzLnJlcXVpcmVPcmRlcmVkU2xvdCgwLCBUUkVBU1VSRV9DSEVTVF9CQU5LUyk7XG4vLyAgIH1cblxuLy8gICByZXF1aXJlT3JkZXJlZFNsb3Qoc2xvdCwgc2V0KSB7XG5cbi8vICAgICBpZiAoIXRoaXMub3JkZXJlZCkge1xuXG4vLyAgICAgfVxuLy8gLy8gVE9ET1xuLy8gICAgIHRoaXMucGF0MCA9IGludGVyc2VjdCh0aGlzLnBhdDAsIHNldCk7XG5cbi8vICAgfVxuXG4vLyB9XG5cbi8vIGNvbnN0IGludGVyc2VjdCA9IChsZWZ0LCByaWdodCkgPT4ge1xuLy8gICBpZiAoIXJpZ2h0KSB0aHJvdyBuZXcgRXJyb3IoJ3JpZ2h0IG11c3QgYmUgbm9udHJpdmlhbCcpO1xuLy8gICBpZiAoIWxlZnQpIHJldHVybiByaWdodDtcbi8vICAgY29uc3Qgb3V0ID0gbmV3IFNldCgpO1xuLy8gICBmb3IgKGNvbnN0IHggb2YgbGVmdCkge1xuLy8gICAgIGlmIChyaWdodC5oYXMoeCkpIG91dC5hZGQoeCk7XG4vLyAgIH1cbi8vICAgcmV0dXJuIG91dDtcbi8vIH1cblxuaW50ZXJmYWNlIE1vbnN0ZXJDb25zdHJhaW50IHtcbiAgaWQ6IG51bWJlcjtcbiAgcGF0OiBudW1iZXI7XG4gIHBhbDI6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgcGFsMzogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwYXRCYW5rOiBudW1iZXIgfCB1bmRlZmluZWQ7XG59XG5cbi8vIEEgcG9vbCBvZiBtb25zdGVyIHNwYXducywgYnVpbHQgdXAgZnJvbSB0aGUgbG9jYXRpb25zIGluIHRoZSByb20uXG4vLyBQYXNzZXMgdGhyb3VnaCB0aGUgbG9jYXRpb25zIHR3aWNlLCBmaXJzdCB0byBidWlsZCBhbmQgdGhlbiB0b1xuLy8gcmVhc3NpZ24gbW9uc3RlcnMuXG5jbGFzcyBNb25zdGVyUG9vbCB7XG5cbiAgLy8gYXZhaWxhYmxlIG1vbnN0ZXJzXG4gIHJlYWRvbmx5IG1vbnN0ZXJzOiBNb25zdGVyQ29uc3RyYWludFtdID0gW107XG4gIC8vIHVzZWQgbW9uc3RlcnMgLSBhcyBhIGJhY2t1cCBpZiBubyBhdmFpbGFibGUgbW9uc3RlcnMgZml0XG4gIHJlYWRvbmx5IHVzZWQ6IE1vbnN0ZXJDb25zdHJhaW50W10gPSBbXTtcbiAgLy8gYWxsIGxvY2F0aW9uc1xuICByZWFkb25seSBsb2NhdGlvbnM6IHtsb2NhdGlvbjogTG9jYXRpb24sIHNsb3RzOiBudW1iZXJbXX1bXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZmxhZ3M6IEZsYWdTZXQsXG4gICAgICByZWFkb25seSByZXBvcnQ6IHtbbG9jOiBudW1iZXJdOiBzdHJpbmdbXSwgW2tleTogc3RyaW5nXTogKHN0cmluZ3xudW1iZXIpW119KSB7fVxuXG4gIC8vIFRPRE8gLSBtb25zdGVycyB3LyBwcm9qZWN0aWxlcyBtYXkgaGF2ZSBhIHNwZWNpZmljIGJhbmsgdGhleSBuZWVkIHRvIGFwcGVhciBpbixcbiAgLy8gc2luY2UgdGhlIHByb2plY3RpbGUgZG9lc24ndCBrbm93IHdoZXJlIGl0IGNhbWUgZnJvbS4uLj9cbiAgLy8gICAtIGZvciBub3csIGp1c3QgYXNzdW1lIGlmIGl0IGhhcyBhIGNoaWxkIHRoZW4gaXQgbXVzdCBrZWVwIHNhbWUgcGF0dGVybiBiYW5rIVxuXG4gIHBvcHVsYXRlKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGNvbnN0IHttYXhGbHllcnMgPSAwLFxuICAgICAgICAgICBub25GbHllcnMgPSB7fSxcbiAgICAgICAgICAgc2tpcCA9IGZhbHNlLFxuICAgICAgICAgICB0b3dlciA9IGZhbHNlLFxuICAgICAgICAgICBmaXhlZFNsb3RzID0ge30sXG4gICAgICAgICAgIC4uLnVuZXhwZWN0ZWR9ID0gTU9OU1RFUl9BREpVU1RNRU5UU1tsb2NhdGlvbi5pZF0gfHwge307XG4gICAgZm9yIChjb25zdCB1IG9mIE9iamVjdC5rZXlzKHVuZXhwZWN0ZWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuZXhwZWN0ZWQgcHJvcGVydHkgJyR7dX0nIGluIE1PTlNURVJfQURKVVNUTUVOVFNbJHtsb2NhdGlvbi5pZH1dYCk7XG4gICAgfVxuICAgIGNvbnN0IHNraXBNb25zdGVycyA9XG4gICAgICAgIChza2lwID09PSB0cnVlIHx8XG4gICAgICAgICAgICAoIXRoaXMuZmxhZ3Muc2h1ZmZsZVRvd2VyTW9uc3RlcnMoKSAmJiB0b3dlcikgfHxcbiAgICAgICAgICAgICFsb2NhdGlvbi5zcHJpdGVQYXR0ZXJucyB8fFxuICAgICAgICAgICAgIWxvY2F0aW9uLnNwcml0ZVBhbGV0dGVzKTtcbiAgICBjb25zdCBtb25zdGVycyA9IFtdO1xuICAgIGxldCBzbG90cyA9IFtdO1xuICAgIC8vIGNvbnN0IGNvbnN0cmFpbnRzID0ge307XG4gICAgLy8gbGV0IHRyZWFzdXJlQ2hlc3QgPSBmYWxzZTtcbiAgICBsZXQgc2xvdCA9IDB4MGM7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBza2lwTW9uc3RlcnMgPyBbXSA6IGxvY2F0aW9uLnNwYXducykge1xuICAgICAgKytzbG90O1xuICAgICAgaWYgKCFzcGF3bi51c2VkIHx8ICFzcGF3bi5pc01vbnN0ZXIoKSkgY29udGludWU7XG4gICAgICBjb25zdCBpZCA9IHNwYXduLm1vbnN0ZXJJZDtcbiAgICAgIGlmIChpZCBpbiBVTlRPVUNIRURfTU9OU1RFUlMgfHwgIVNDQUxFRF9NT05TVEVSUy5oYXMoaWQpIHx8XG4gICAgICAgICAgU0NBTEVEX01PTlNURVJTLmdldChpZCkhLnR5cGUgIT09ICdtJykgY29udGludWU7XG4gICAgICBjb25zdCBvYmplY3QgPSBsb2NhdGlvbi5yb20ub2JqZWN0c1tpZF07XG4gICAgICBpZiAoIW9iamVjdCkgY29udGludWU7XG4gICAgICBjb25zdCBwYXRCYW5rID0gc3Bhd24ucGF0dGVybkJhbms7XG4gICAgICBjb25zdCBwYXQgPSBsb2NhdGlvbi5zcHJpdGVQYXR0ZXJuc1twYXRCYW5rXTtcbiAgICAgIGNvbnN0IHBhbCA9IG9iamVjdC5wYWxldHRlcyh0cnVlKTtcbiAgICAgIGNvbnN0IHBhbDIgPSBwYWwuaW5jbHVkZXMoMikgPyBsb2NhdGlvbi5zcHJpdGVQYWxldHRlc1swXSA6IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IHBhbDMgPSBwYWwuaW5jbHVkZXMoMykgPyBsb2NhdGlvbi5zcHJpdGVQYWxldHRlc1sxXSA6IHVuZGVmaW5lZDtcbiAgICAgIG1vbnN0ZXJzLnB1c2goe2lkLCBwYXQsIHBhbDIsIHBhbDMsIHBhdEJhbmt9KTtcbiAgICAgICh0aGlzLnJlcG9ydFtgc3RhcnQtJHtpZC50b1N0cmluZygxNil9YF0gPSB0aGlzLnJlcG9ydFtgc3RhcnQtJHtpZC50b1N0cmluZygxNil9YF0gfHwgW10pXG4gICAgICAgICAgLnB1c2goJyQnICsgbG9jYXRpb24uaWQudG9TdHJpbmcoMTYpKTtcbiAgICAgIHNsb3RzLnB1c2goc2xvdCk7XG4gICAgfVxuICAgIGlmICghbW9uc3RlcnMubGVuZ3RoIHx8IHNraXApIHNsb3RzID0gW107XG4gICAgdGhpcy5sb2NhdGlvbnMucHVzaCh7bG9jYXRpb24sIHNsb3RzfSk7XG4gICAgdGhpcy5tb25zdGVycy5wdXNoKC4uLm1vbnN0ZXJzKTtcbiAgfVxuXG4gIHNodWZmbGUocmFuZG9tOiBSYW5kb20sIGdyYXBoaWNzOiBHcmFwaGljcykge1xuICAgIHRoaXMucmVwb3J0WydwcmUtc2h1ZmZsZSBsb2NhdGlvbnMnXSA9IHRoaXMubG9jYXRpb25zLm1hcChsID0+IGwubG9jYXRpb24uaWQpO1xuICAgIHRoaXMucmVwb3J0WydwcmUtc2h1ZmZsZSBtb25zdGVycyddID0gdGhpcy5tb25zdGVycy5tYXAobSA9PiBtLmlkKTtcbiAgICByYW5kb20uc2h1ZmZsZSh0aGlzLmxvY2F0aW9ucyk7XG4gICAgcmFuZG9tLnNodWZmbGUodGhpcy5tb25zdGVycyk7XG4gICAgdGhpcy5yZXBvcnRbJ3Bvc3Qtc2h1ZmZsZSBsb2NhdGlvbnMnXSA9IHRoaXMubG9jYXRpb25zLm1hcChsID0+IGwubG9jYXRpb24uaWQpO1xuICAgIHRoaXMucmVwb3J0Wydwb3N0LXNodWZmbGUgbW9uc3RlcnMnXSA9IHRoaXMubW9uc3RlcnMubWFwKG0gPT4gbS5pZCk7XG4gICAgd2hpbGUgKHRoaXMubG9jYXRpb25zLmxlbmd0aCkge1xuICAgICAgY29uc3Qge2xvY2F0aW9uLCBzbG90c30gPSB0aGlzLmxvY2F0aW9ucy5wb3AoKSE7XG4gICAgICBjb25zdCByZXBvcnQ6IHN0cmluZ1tdID0gdGhpcy5yZXBvcnRbJyQnICsgbG9jYXRpb24uaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJyldID0gW107XG4gICAgICBjb25zdCB7bWF4Rmx5ZXJzID0gMCwgbm9uRmx5ZXJzID0ge30sIHRvd2VyID0gZmFsc2V9ID1cbiAgICAgICAgICAgIE1PTlNURVJfQURKVVNUTUVOVFNbbG9jYXRpb24uaWRdIHx8IHt9O1xuICAgICAgaWYgKHRvd2VyKSBjb250aW51ZTtcbiAgICAgIGxldCBmbHllcnMgPSBtYXhGbHllcnM7IC8vIGNvdW50IGRvd24uLi5cblxuICAgICAgLy8gRGV0ZXJtaW5lIGxvY2F0aW9uIGNvbnN0cmFpbnRzXG4gICAgICBsZXQgY29uc3RyYWludCA9IENvbnN0cmFpbnQuZm9yTG9jYXRpb24obG9jYXRpb24uaWQpO1xuICAgICAgaWYgKGxvY2F0aW9uLmJvc3NJZCgpICE9IG51bGwpIHtcbiAgICAgICAgLy8gTm90ZSB0aGF0IGJvc3NlcyBhbHdheXMgbGVhdmUgY2hlc3RzLlxuICAgICAgICAvLyBUT0RPIC0gaXQncyBwb3NzaWJsZSB0aGlzIGlzIG91dCBvZiBvcmRlciB3LnIudC4gd3JpdGluZyB0aGUgYm9zcz9cbiAgICAgICAgLy8gICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChDb25zdHJhaW50LkJPU1MsIHRydWUpO1xuICAgICAgICAvLyBOT1RFOiB0aGlzIGRvZXMgbm90IHdvcmsgZm9yIChlLmcuKSBtYWRvIDEsIHdoZXJlIGF6dGVjYSByZXF1aXJlc1xuICAgICAgICAvLyA1MyB3aGljaCBpcyBub3QgYSBjb21wYXRpYmxlIGNoZXN0IHBhZ2UuXG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgICBpZiAoc3Bhd24uaXNDaGVzdCgpICYmICFzcGF3bi5pc0ludmlzaWJsZSgpKSB7XG4gICAgICAgICAgaWYgKHNwYXduLmlkIDwgMHg3MCkge1xuICAgICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChDb25zdHJhaW50LlRSRUFTVVJFX0NIRVNULCB0cnVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChDb25zdHJhaW50Lk1JTUlDLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSB8fCBzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICAgIGNvbnN0IGMgPSBncmFwaGljcy5nZXROcGNDb25zdHJhaW50KGxvY2F0aW9uLmlkLCBzcGF3bi5pZCk7XG4gICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChjLCB0cnVlKTtcbiAgICAgICAgICBpZiAoc3Bhd24uaXNOcGMoKSAmJiBzcGF3bi5pZCA9PT0gMHg2Yikge1xuICAgICAgICAgICAgLy8gc2xlZXBpbmcga2Vuc3UgKDZiKSBsZWF2ZXMgYmVoaW5kIGEgdHJlYXN1cmUgY2hlc3RcbiAgICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoQ29uc3RyYWludC5LRU5TVV9DSEVTVCwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIFVOVE9VQ0hFRF9NT05TVEVSU1tzcGF3bi5tb25zdGVySWRdKSB7XG4gICAgICAgICAgY29uc3QgYyA9IGdyYXBoaWNzLmdldE1vbnN0ZXJDb25zdHJhaW50KGxvY2F0aW9uLmlkLCBzcGF3bi5tb25zdGVySWQpO1xuICAgICAgICAgIGNvbnN0cmFpbnQgPSBjb25zdHJhaW50Lm1lZXQoYywgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNTaG9vdGluZ1dhbGwobG9jYXRpb24pKSB7XG4gICAgICAgICAgY29uc3RyYWludCA9IGNvbnN0cmFpbnQubWVldChDb25zdHJhaW50LlNIT09USU5HX1dBTEwsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJlcG9ydC5wdXNoKGBJbml0aWFsIHBhc3M6ICR7Y29uc3RyYWludC5maXhlZC5tYXAocz0+cy5zaXplPEluZmluaXR5PydbJytbLi4uc10uam9pbignLCAnKSsnXSc6J2FsbCcpfWApO1xuXG4gICAgICBjb25zdCBjbGFzc2VzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICAgIGNvbnN0IHRyeUFkZE1vbnN0ZXIgPSAobTogTW9uc3RlckNvbnN0cmFpbnQpID0+IHtcbiAgICAgICAgY29uc3QgbW9uc3RlciA9IGxvY2F0aW9uLnJvbS5vYmplY3RzW20uaWRdIGFzIE1vbnN0ZXI7XG4gICAgICAgIGlmIChtb25zdGVyLm1vbnN0ZXJDbGFzcykge1xuICAgICAgICAgIGNvbnN0IHJlcHJlc2VudGF0aXZlID0gY2xhc3Nlcy5nZXQobW9uc3Rlci5tb25zdGVyQ2xhc3MpO1xuICAgICAgICAgIGlmIChyZXByZXNlbnRhdGl2ZSAhPSBudWxsICYmIHJlcHJlc2VudGF0aXZlICE9PSBtLmlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZmx5ZXIgPSBGTFlFUlMuaGFzKG0uaWQpO1xuICAgICAgICBjb25zdCBtb3RoID0gTU9USFNfQU5EX0JBVFMuaGFzKG0uaWQpO1xuICAgICAgICBpZiAoZmx5ZXIpIHtcbiAgICAgICAgICAvLyBUT0RPIC0gYWRkIGEgc21hbGwgcHJvYmFiaWxpdHkgb2YgYWRkaW5nIGl0IGFueXdheSwgbWF5YmVcbiAgICAgICAgICAvLyBiYXNlZCBvbiB0aGUgbWFwIGFyZWE/ICAyNSBzZWVtcyBhIGdvb2QgdGhyZXNob2xkLlxuICAgICAgICAgIGlmICghZmx5ZXJzKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgLS1mbHllcnM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYyA9IGdyYXBoaWNzLmdldE1vbnN0ZXJDb25zdHJhaW50KGxvY2F0aW9uLmlkLCBtLmlkKTtcbiAgICAgICAgbGV0IG1lZXQgPSBjb25zdHJhaW50LnRyeU1lZXQoYyk7XG4gICAgICAgIGlmICghbWVldCAmJiBjb25zdHJhaW50LnBhbDIuc2l6ZSA8IEluZmluaXR5ICYmIGNvbnN0cmFpbnQucGFsMy5zaXplIDwgSW5maW5pdHkpIHtcbiAgICAgICAgICBpZiAodGhpcy5mbGFncy5zaHVmZmxlU3ByaXRlUGFsZXR0ZXMoKSkge1xuICAgICAgICAgICAgbWVldCA9IGNvbnN0cmFpbnQudHJ5TWVldChjLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtZWV0KSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgLy8gRmlndXJlIG91dCBlYXJseSBpZiB0aGUgbW9uc3RlciBpcyBwbGFjZWFibGUuXG4gICAgICAgIGxldCBwb3M6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG1vbnN0ZXJQbGFjZXIpIHtcbiAgICAgICAgICBjb25zdCBtb25zdGVyID0gbG9jYXRpb24ucm9tLm9iamVjdHNbbS5pZF07XG4gICAgICAgICAgaWYgKCEobW9uc3RlciBpbnN0YW5jZW9mIE1vbnN0ZXIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vbi1tb25zdGVyOiAke21vbnN0ZXJ9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBvcyA9IG1vbnN0ZXJQbGFjZXIobW9uc3Rlcik7XG4gICAgICAgICAgaWYgKHBvcyA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXBvcnQucHVzaChgICBBZGRpbmcgJHttLmlkLnRvU3RyaW5nKDE2KX06ICR7bWVldH1gKTtcbiAgICAgICAgY29uc3RyYWludCA9IG1lZXQ7XG5cbiAgICAgICAgLy8gUGljayB0aGUgc2xvdCBvbmx5IGFmdGVyIHdlIGtub3cgZm9yIHN1cmUgdGhhdCBpdCB3aWxsIGZpdC5cbiAgICAgICAgaWYgKG1vbnN0ZXIubW9uc3RlckNsYXNzKSBjbGFzc2VzLnNldChtb25zdGVyLm1vbnN0ZXJDbGFzcywgbS5pZClcbiAgICAgICAgbGV0IGVsaWdpYmxlID0gMDtcbiAgICAgICAgaWYgKGZseWVyIHx8IG1vdGgpIHtcbiAgICAgICAgICAvLyBsb29rIGZvciBhIGZseWVyIHNsb3QgaWYgcG9zc2libGUuXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzbG90cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNsb3RzW2ldIGluIG5vbkZseWVycykge1xuICAgICAgICAgICAgICBlbGlnaWJsZSA9IGk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBQcmVmZXIgbm9uLWZseWVyIHNsb3RzLCBidXQgYWRqdXN0IGlmIHdlIGdldCBhIGZseWVyLlxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2xvdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzbG90c1tpXSBpbiBub25GbHllcnMpIGNvbnRpbnVlO1xuICAgICAgICAgICAgZWxpZ2libGUgPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICh0aGlzLnJlcG9ydFtgbW9uLSR7bS5pZC50b1N0cmluZygxNil9YF0gPSB0aGlzLnJlcG9ydFtgbW9uLSR7bS5pZC50b1N0cmluZygxNil9YF0gfHwgW10pXG4gICAgICAgICAgICAucHVzaCgnJCcgKyBsb2NhdGlvbi5pZC50b1N0cmluZygxNikpO1xuICAgICAgICBjb25zdCBzbG90ID0gc2xvdHNbZWxpZ2libGVdO1xuICAgICAgICBjb25zdCBzcGF3biA9IGxvY2F0aW9uLnNwYXduc1tzbG90IC0gMHgwZF07XG4gICAgICAgIGlmIChtb25zdGVyUGxhY2VyKSB7IC8vIHBvcyA9PSBudWxsIHJldHVybmVkIGZhbHNlIGVhcmxpZXJcbiAgICAgICAgICBzcGF3bi5zY3JlZW4gPSBwb3MhID4+PiA4O1xuICAgICAgICAgIHNwYXduLnRpbGUgPSBwb3MhICYgMHhmZjtcbiAgICAgICAgfSBlbHNlIGlmIChzbG90IGluIG5vbkZseWVycykge1xuICAgICAgICAgIHNwYXduLnkgKz0gbm9uRmx5ZXJzW3Nsb3RdWzBdICogMTY7XG4gICAgICAgICAgc3Bhd24ueCArPSBub25GbHllcnNbc2xvdF1bMV0gKiAxNjtcbiAgICAgICAgfVxuICAgICAgICBzcGF3bi5tb25zdGVySWQgPSBtLmlkO1xuICAgICAgICByZXBvcnQucHVzaChgICAgIHNsb3QgJHtzbG90LnRvU3RyaW5nKDE2KX06ICR7c3Bhd259YCk7XG5cbiAgICAgICAgLy8gVE9ETyAtIGFueXRoaW5nIGVsc2UgbmVlZCBzcGxpY2luZz9cblxuICAgICAgICBzbG90cy5zcGxpY2UoZWxpZ2libGUsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIC8vIEZvciBlYWNoIGxvY2F0aW9uLi4uLiB0cnkgdG8gZmlsbCB1cCB0aGUgc2xvdHNcbiAgICAgIGNvbnN0IG1vbnN0ZXJQbGFjZXIgPVxuICAgICAgICAgIHNsb3RzLmxlbmd0aCAmJiB0aGlzLmZsYWdzLnJhbmRvbWl6ZU1hcHMoKSA/XG4gICAgICAgICAgICAgIGxvY2F0aW9uLm1vbnN0ZXJQbGFjZXIocmFuZG9tKSA6IG51bGw7XG5cbiAgICAgIGlmIChmbHllcnMgJiYgc2xvdHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIGxvb2sgZm9yIGFuIGVsaWdpYmxlIGZseWVyIGluIHRoZSBmaXJzdCA0MC4gIElmIGl0J3MgdGhlcmUsIGFkZCBpdCBmaXJzdC5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbig0MCwgdGhpcy5tb25zdGVycy5sZW5ndGgpOyBpKyspIHtcbiAgICAgICAgICBpZiAoRkxZRVJTLmhhcyh0aGlzLm1vbnN0ZXJzW2ldLmlkKSkge1xuICAgICAgICAgICAgaWYgKHRyeUFkZE1vbnN0ZXIodGhpcy5tb25zdGVyc1tpXSkpIHtcbiAgICAgICAgICAgICAgdGhpcy5tb25zdGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHJhbmRvbS5zaHVmZmxlKHRoaXMubW9uc3RlcnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbWF5YmUgYWRkZWQgYSBzaW5nbGUgZmx5ZXIsIHRvIG1ha2Ugc3VyZSB3ZSBkb24ndCBydW4gb3V0LiAgTm93IGp1c3Qgd29yayBub3JtYWxseVxuXG4gICAgICAgIC8vIGRlY2lkZSBpZiB3ZSdyZSBnb2luZyB0byBhZGQgYW55IGZseWVycy5cblxuICAgICAgICAvLyBhbHNvIGNvbnNpZGVyIGFsbG93aW5nIGEgc2luZ2xlIHJhbmRvbSBmbHllciB0byBiZSBhZGRlZCBvdXQgb2YgYmFuZCBpZlxuICAgICAgICAvLyB0aGUgc2l6ZSBvZiB0aGUgbWFwIGV4Y2VlZHMgMjU/XG5cbiAgICAgICAgLy8gcHJvYmFibHkgZG9uJ3QgYWRkIGZseWVycyB0byB1c2VkP1xuXG4gICAgICB9XG5cbiAgICAgIC8vIGl0ZXJhdGUgb3ZlciBtb25zdGVycyB1bnRpbCB3ZSBmaW5kIG9uZSB0aGF0J3MgYWxsb3dlZC4uLlxuICAgICAgLy8gTk9URTogZmlsbCB0aGUgbm9uLWZseWVyIHNsb3RzIGZpcnN0IChleGNlcHQgaWYgd2UgcGljayBhIGZseWVyPz8pXG4gICAgICAvLyAgIC0gbWF5IG5lZWQgdG8gd2VpZ2h0IGZseWVycyBzbGlnaHRseSBoaWdoZXIgb3IgZmlsbCB0aGVtIGRpZmZlcmVudGx5P1xuICAgICAgLy8gICAgIG90aGVyd2lzZSB3ZSdsbCBsaWtlbHkgbm90IGdldCB0aGVtIHdoZW4gd2UncmUgYWxsb3dlZC4uLj9cbiAgICAgIC8vICAgLSBvciBqdXN0IGRvIHRoZSBub24tZmx5ZXIgKmxvY2F0aW9ucyogZmlyc3Q/XG4gICAgICAvLyAtIG9yIGp1c3QgZmlsbCB1cCBmbHllcnMgdW50aWwgd2UgcnVuIG91dC4uLiAxMDAlIGNoYW5jZSBvZiBmaXJzdCBmbHllcixcbiAgICAgIC8vICAgNTAlIGNoYW5jZSBvZiBnZXR0aW5nIGEgc2Vjb25kIGZseWVyIGlmIGFsbG93ZWQuLi5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5tb25zdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIXNsb3RzLmxlbmd0aCkgYnJlYWs7XG4gICAgICAgIGlmICh0cnlBZGRNb25zdGVyKHRoaXMubW9uc3RlcnNbaV0pKSB7XG4gICAgICAgICAgY29uc3QgW3VzZWRdID0gdGhpcy5tb25zdGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgaWYgKCFGTFlFUlMuaGFzKHVzZWQuaWQpKSB0aGlzLnVzZWQucHVzaCh1c2VkKTtcbiAgICAgICAgICBpLS07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gYmFja3VwIGxpc3RcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy51c2VkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICghc2xvdHMubGVuZ3RoKSBicmVhaztcbiAgICAgICAgaWYgKHRyeUFkZE1vbnN0ZXIodGhpcy51c2VkW2ldKSkge1xuICAgICAgICAgIHRoaXMudXNlZC5wdXNoKC4uLnRoaXMudXNlZC5zcGxpY2UoaSwgMSkpO1xuICAgICAgICAgIGktLTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3RyYWludC5maXgobG9jYXRpb24sIHJhbmRvbSk7XG5cbiAgICAgIGlmIChzbG90cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc29sZS5lcnJvci8qcmVwb3J0LnB1c2gqLyhgRmFpbGVkIHRvIGZpbGwgbG9jYXRpb24gJHtsb2NhdGlvbi5pZC50b1N0cmluZygxNil9OiAke3Nsb3RzLmxlbmd0aH0gcmVtYWluaW5nYCk7XG4gICAgICAgIGZvciAoY29uc3Qgc2xvdCBvZiBzbG90cykge1xuICAgICAgICAgIGNvbnN0IHNwYXduID0gbG9jYXRpb24uc3Bhd25zW3Nsb3QgLSAweDBkXTtcbiAgICAgICAgICBzcGF3bi54ID0gc3Bhd24ueSA9IDA7XG4gICAgICAgICAgc3Bhd24uaWQgPSAweGIwO1xuICAgICAgICAgIHNwYXduLmRhdGFbMF0gPSAweGZlOyAvLyBpbmRpY2F0ZSB1bnVzZWRcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgICAgZ3JhcGhpY3MuY29uZmlndXJlKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IEZMWUVSUzogU2V0PG51bWJlcj4gPSBuZXcgU2V0KFsweDU5LCAweDVjLCAweDZlLCAweDZmLCAweDgxLCAweDhhLCAweGEzLCAweGM0XSk7XG5jb25zdCBNT1RIU19BTkRfQkFUUzogU2V0PG51bWJlcj4gPSBuZXcgU2V0KFsweDU1LCAvKiBzd2FtcCBwbGFudCAqLyAweDVkLCAweDdjLCAweGJjLCAweGMxXSk7XG4vLyBjb25zdCBTV0lNTUVSUzogU2V0PG51bWJlcj4gPSBuZXcgU2V0KFsweDc1LCAweDc2XSk7XG4vLyBjb25zdCBTVEFUSU9OQVJZOiBTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoWzB4NzcsIDB4ODddKTsgIC8vIGtyYWtlbiwgc29yY2Vyb3JcblxuaW50ZXJmYWNlIE1vbnN0ZXJBZGp1c3RtZW50IHtcbiAgbWF4Rmx5ZXJzPzogbnVtYmVyO1xuICBza2lwPzogYm9vbGVhbjtcbiAgdG93ZXI/OiBib29sZWFuO1xuICBmaXhlZFNsb3RzPzoge3BhdDA/OiBudW1iZXIsIHBhdDE/OiBudW1iZXIsIHBhbDI/OiBudW1iZXIsIHBhbDM/OiBudW1iZXJ9O1xuICBub25GbHllcnM/OiB7W2lkOiBudW1iZXJdOiBbbnVtYmVyLCBudW1iZXJdfTtcbn1cbmNvbnN0IE1PTlNURVJfQURKVVNUTUVOVFM6IHtbbG9jOiBudW1iZXJdOiBNb25zdGVyQWRqdXN0bWVudH0gPSB7XG4gIFsweDAzXTogeyAvLyBWYWxsZXkgb2YgV2luZFxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhdDE6IDB4NjAsIC8vIHJlcXVpcmVkIGJ5IHdpbmRtaWxsXG4gICAgfSxcbiAgICBtYXhGbHllcnM6IDIsXG4gIH0sXG4gIFsweDA3XTogeyAvLyBTZWFsZWQgQ2F2ZSA0XG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZl06IFswLCAtM10sICAvLyBiYXRcbiAgICAgIFsweDEwXTogWy0xMCwgMF0sIC8vIGJhdFxuICAgICAgWzB4MTFdOiBbMCwgNF0sICAgLy8gYmF0XG4gICAgfSxcbiAgfSxcbiAgWzB4MTRdOiB7IC8vIENvcmRlbCBXZXN0XG4gICAgbWF4Rmx5ZXJzOiAyLFxuICB9LFxuICBbMHgxNV06IHsgLy8gQ29yZGVsIEVhc3RcbiAgICBtYXhGbHllcnM6IDIsXG4gIH0sXG4gIFsweDFhXTogeyAvLyBTd2FtcFxuICAgIC8vIHNraXA6ICdhZGQnLFxuICAgIGZpeGVkU2xvdHM6IHtcbiAgICAgIHBhbDM6IDB4MjMsXG4gICAgICBwYXQxOiAweDRmLFxuICAgIH0sXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczogeyAvLyBUT0RPIC0gbWlnaHQgYmUgbmljZSB0byBrZWVwIHB1ZmZzIHdvcmtpbmc/XG4gICAgICBbMHgxMF06IFs0LCAwXSxcbiAgICAgIFsweDExXTogWzUsIDBdLFxuICAgICAgWzB4MTJdOiBbNCwgMF0sXG4gICAgICBbMHgxM106IFs1LCAwXSxcbiAgICAgIFsweDE0XTogWzQsIDBdLFxuICAgICAgWzB4MTVdOiBbNCwgMF0sXG4gICAgfSxcbiAgfSxcbiAgWzB4MWJdOiB7IC8vIEFtYXpvbmVzXG4gICAgLy8gUmFuZG9tIGJsdWUgc2xpbWUgc2hvdWxkIGJlIGlnbm9yZWRcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHgyMF06IHsgLy8gTXQgU2FicmUgV2VzdCBMb3dlclxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4MjFdOiB7IC8vIE10IFNhYnJlIFdlc3QgVXBwZXJcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYXQxOiAweDUwLFxuICAgICAgLy8gcGFsMjogMHgwNiwgLy8gbWlnaHQgYmUgZmluZSB0byBjaGFuZ2UgdG9ybmVsJ3MgY29sb3IuLi5cbiAgICB9LFxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4MjddOiB7IC8vIE10IFNhYnJlIFdlc3QgQ2F2ZSA3XG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFswLCAweDEwXSwgLy8gcmFuZG9tIGVuZW15IHN0dWNrIGluIHdhbGxcbiAgICB9LFxuICB9LFxuICBbMHgyOF06IHsgLy8gTXQgU2FicmUgTm9ydGggTWFpblxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4MjldOiB7IC8vIE10IFNhYnJlIE5vcnRoIE1pZGRsZVxuICAgIG1heEZseWVyczogMSxcbiAgfSxcbiAgWzB4MmJdOiB7IC8vIE10IFNhYnJlIE5vcnRoIENhdmUgMlxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTRdOiBbMHgyMCwgLThdLCAvLyBiYXRcbiAgICB9LFxuICB9LFxuICBbMHg0MF06IHsgLy8gV2F0ZXJmYWxsIFZhbGxleSBOb3J0aFxuICAgIG1heEZseWVyczogMixcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDEzXTogWzEyLCAtMHgxMF0sIC8vIG1lZHVzYSBoZWFkXG4gICAgfSxcbiAgfSxcbiAgWzB4NDFdOiB7IC8vIFdhdGVyZmFsbCBWYWxsZXkgU291dGhcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNV06IFswLCAtNl0sIC8vIG1lZHVzYSBoZWFkXG4gICAgfSxcbiAgfSxcbiAgWzB4NDJdOiB7IC8vIExpbWUgVHJlZSBWYWxsZXlcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFswLCA4XSwgLy8gZXZpbCBiaXJkXG4gICAgICBbMHgwZV06IFstOCwgOF0sIC8vIGV2aWwgYmlyZFxuICAgIH0sXG4gIH0sXG4gIFsweDQ3XTogeyAvLyBLaXJpc2EgTWVhZG93XG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGRdOiBbLTgsIC04XSxcbiAgICB9LFxuICB9LFxuICBbMHg0YV06IHsgLy8gRm9nIExhbXAgQ2F2ZSAzXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGVdOiBbNCwgMF0sICAvLyBiYXRcbiAgICAgIFsweDBmXTogWzAsIC0zXSwgLy8gYmF0XG4gICAgICBbMHgxMF06IFswLCA0XSwgIC8vIGJhdFxuICAgIH0sXG4gIH0sXG4gIFsweDRjXTogeyAvLyBGb2cgTGFtcCBDYXZlIDRcbiAgICAvLyBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDRkXTogeyAvLyBGb2cgTGFtcCBDYXZlIDVcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDRlXTogeyAvLyBGb2cgTGFtcCBDYXZlIDZcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDRmXTogeyAvLyBGb2cgTGFtcCBDYXZlIDdcbiAgICAvLyBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDU3XTogeyAvLyBXYXRlcmZhbGwgQ2F2ZSA0XG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGF0MTogMHg0ZCxcbiAgICB9LFxuICB9LFxuICBbMHg1OV06IHsgLy8gVG93ZXIgRmxvb3IgMVxuICAgIC8vIHNraXA6IHRydWUsXG4gICAgdG93ZXI6IHRydWUsXG4gIH0sXG4gIFsweDVhXTogeyAvLyBUb3dlciBGbG9vciAyXG4gICAgLy8gc2tpcDogdHJ1ZSxcbiAgICB0b3dlcjogdHJ1ZSxcbiAgfSxcbiAgWzB4NWJdOiB7IC8vIFRvd2VyIEZsb29yIDNcbiAgICAvLyBza2lwOiB0cnVlLFxuICAgIHRvd2VyOiB0cnVlLFxuICB9LFxuICBbMHg2MF06IHsgLy8gQW5ncnkgU2VhXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGFsMzogMHgwOCxcbiAgICAgIHBhdDE6IDB4NTIsIC8vIChhcyBvcHBvc2VkIHRvIHBhdDApXG4gICAgfSxcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgc2tpcDogdHJ1ZSwgLy8gbm90IHN1cmUgaG93IHRvIHJhbmRvbWl6ZSB0aGVzZSB3ZWxsXG4gIH0sXG4gIFsweDY0XTogeyAvLyBVbmRlcmdyb3VuZCBDaGFubmVsXG4gICAgZml4ZWRTbG90czoge1xuICAgICAgcGFsMzogMHgwOCxcbiAgICAgIHBhdDE6IDB4NTIsIC8vIChhcyBvcHBvc2VkIHRvIHBhdDApXG4gICAgfSxcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHg2OF06IHsgLy8gRXZpbCBTcGlyaXQgSXNsYW5kIDFcbiAgICBmaXhlZFNsb3RzOiB7XG4gICAgICBwYWwzOiAweDA4LFxuICAgICAgcGF0MTogMHg1MiwgLy8gKGFzIG9wcG9zZWQgdG8gcGF0MClcbiAgICB9LFxuICAgIHNraXA6IHRydWUsXG4gIH0sXG4gIFsweDY5XTogeyAvLyBFdmlsIFNwaXJpdCBJc2xhbmQgMlxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE3XTogWzQsIDZdLCAgLy8gbWVkdXNhIGhlYWRcbiAgICB9LFxuICB9LFxuICBbMHg2YV06IHsgLy8gRXZpbCBTcGlyaXQgSXNsYW5kIDNcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNV06IFswLCAweDE4XSwgIC8vIG1lZHVzYSBoZWFkXG4gICAgfSxcbiAgfSxcbiAgWzB4NmNdOiB7IC8vIFNhYmVyYSBQYWxhY2UgMVxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE3XTogWzAsIDB4MThdLCAvLyBldmlsIGJpcmRcbiAgICB9LFxuICB9LFxuICBbMHg2ZF06IHsgLy8gU2FiZXJhIFBhbGFjZSAyXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTFdOiBbMHgxMCwgMF0sIC8vIG1vdGhcbiAgICAgIFsweDFiXTogWzAsIDBdLCAgICAvLyBtb3RoIC0gb2sgYWxyZWFkeVxuICAgICAgWzB4MWNdOiBbNiwgMF0sICAgIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHg3OF06IHsgLy8gR29hIFZhbGxleVxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE2XTogWy04LCAtOF0sIC8vIGV2aWwgYmlyZFxuICAgIH0sXG4gIH0sXG4gIFsweDdjXTogeyAvLyBNdCBIeWRyYVxuICAgIG1heEZseWVyczogMSxcbiAgICBub25GbHllcnM6IHtcbiAgICAgIFsweDE1XTogWy0weDI3LCAweDU0XSwgLy8gZXZpbCBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4ODRdOiB7IC8vIE10IEh5ZHJhIENhdmUgN1xuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTJdOiBbMCwgLTRdLFxuICAgICAgWzB4MTNdOiBbMCwgNF0sXG4gICAgICBbMHgxNF06IFstNiwgMF0sXG4gICAgICBbMHgxNV06IFsxNCwgMTJdLFxuICAgIH0sXG4gIH0sXG4gIFsweDg4XTogeyAvLyBTdHl4IDFcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDg5XTogeyAvLyBTdHl4IDJcbiAgICBtYXhGbHllcnM6IDEsXG4gIH0sXG4gIFsweDhhXTogeyAvLyBTdHl4IDFcbiAgICBtYXhGbHllcnM6IDEsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFs3LCAwXSwgLy8gbW90aFxuICAgICAgWzB4MGVdOiBbMCwgMF0sIC8vIG1vdGggLSBva1xuICAgICAgWzB4MGZdOiBbNywgM10sIC8vIG1vdGhcbiAgICAgIFsweDEwXTogWzAsIDZdLCAvLyBtb3RoXG4gICAgICBbMHgxMV06IFsxMSwgLTB4MTBdLCAvLyBtb3RoXG4gICAgfSxcbiAgfSxcbiAgWzB4OGZdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIE9hc2lzIENhdmUgRW50cmFuY2VcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHg5MF06IHsgLy8gRGVzZXJ0IDFcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNF06IFstMHhiLCAtM10sIC8vIGJvbWJlciBiaXJkXG4gICAgICBbMHgxNV06IFswLCAweDEwXSwgIC8vIGJvbWJlciBiaXJkXG4gICAgfSxcbiAgfSxcbiAgWzB4OTFdOiB7IC8vIE9hc2lzIENhdmVcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxOF06IFswLCAxNF0sICAgIC8vIGluc2VjdFxuICAgICAgWzB4MTldOiBbNCwgLTB4MTBdLCAvLyBpbnNlY3RcbiAgICB9LFxuICB9LFxuICBbMHg5OF06IHsgLy8gRGVzZXJ0IDJcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxNF06IFstNiwgNl0sICAgIC8vIGRldmlsXG4gICAgICBbMHgxNV06IFswLCAtMHgxMF0sIC8vIGRldmlsXG4gICAgfSxcbiAgfSxcbiAgWzB4OWVdOiB7IC8vIFB5cmFtaWQgRnJvbnQgLSBNYWluXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICB9LFxuICBbMHhhMl06IHsgLy8gUHlyYW1pZCBCYWNrIC0gQnJhbmNoXG4gICAgbWF4Rmx5ZXJzOiAxLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTJdOiBbMCwgMTFdLCAvLyBtb3RoXG4gICAgICBbMHgxM106IFs2LCAwXSwgIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHhhNV06IHsgLy8gUHlyYW1pZCBCYWNrIC0gSGFsbCAyXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxN106IFs2LCA2XSwgICAvLyBtb3RoXG4gICAgICBbMHgxOF06IFstNiwgMF0sICAvLyBtb3RoXG4gICAgICBbMHgxOV06IFstMSwgLTddLCAvLyBtb3RoXG4gICAgfSxcbiAgfSxcbiAgWzB4YTZdOiB7IC8vIERyYXlnb24gMlxuICAgIC8vIEhhcyBhIGZldyBibHVlIHNsaW1lcyB0aGF0IGFyZW4ndCByZWFsIGFuZCBzaG91bGQgYmUgaWdub3JlZC5cbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHhhOF06IHsgLy8gR29hIEZvcnRyZXNzIC0gRW50cmFuY2VcbiAgICBza2lwOiB0cnVlLFxuICB9LFxuICBbMHhhOV06IHsgLy8gR29hIEZvcnRyZXNzIC0gS2VsYmVzcXVlXG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTZdOiBbMHgxYSwgLTB4MTBdLCAvLyBkZXZpbFxuICAgICAgWzB4MTddOiBbMCwgMHgyMF0sICAgICAvLyBkZXZpbFxuICAgIH0sXG4gIH0sXG4gIFsweGFiXTogeyAvLyBHb2EgRm9ydHJlc3MgLSBTYWJlcmFcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgwZF06IFsxLCAwXSwgIC8vIGluc2VjdFxuICAgICAgWzB4MGVdOiBbMiwgLTJdLCAvLyBpbnNlY3RcbiAgICB9LFxuICB9LFxuXG4gIFsweGFkXTogeyAvLyBHb2EgRm9ydHJlc3MgLSBNYWRvIDFcbiAgICBtYXhGbHllcnM6IDIsXG4gICAgbm9uRmx5ZXJzOiB7XG4gICAgICBbMHgxOF06IFswLCA4XSwgIC8vIGRldmlsXG4gICAgICBbMHgxOV06IFswLCAtOF0sIC8vIGRldmlsXG4gICAgfSxcbiAgfSxcbiAgWzB4YWZdOiB7IC8vIEdvYSBGb3J0cmVzcyAtIE1hZG8gM1xuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MGRdOiBbMCwgMF0sICAvLyBtb3RoIC0gb2tcbiAgICAgIFsweDBlXTogWzAsIDBdLCAgLy8gYnJva2VuIC0gYnV0IHJlcGxhY2U/XG4gICAgICBbMHgxM106IFsweDNiLCAtMHgyNl0sIC8vIHNoYWRvdyAtIGVtYmVkZGVkIGluIHdhbGxcbiAgICAgIC8vIFRPRE8gLSAweDBlIGdsaXRjaGVkLCBkb24ndCByYW5kb21pemVcbiAgICB9LFxuICB9LFxuICBbMHhiNF06IHsgLy8gR29hIEZvcnRyZXNzIC0gS2FybWluZSA1XG4gICAgbWF4Rmx5ZXJzOiAyLFxuICAgIG5vbkZseWVyczoge1xuICAgICAgWzB4MTFdOiBbNiwgMF0sICAvLyBtb3RoXG4gICAgICBbMHgxMl06IFswLCA2XSwgIC8vIG1vdGhcbiAgICB9LFxuICB9LFxuICBbMHhkN106IHsgLy8gUG9ydG9hIFBhbGFjZSAtIEVudHJ5XG4gICAgLy8gVGhlcmUncyBhIHJhbmRvbSBzbGltZSBpbiB0aGlzIHJvb20gdGhhdCB3b3VsZCBjYXVzZSBnbGl0Y2hlc1xuICAgIHNraXA6IHRydWUsXG4gIH0sXG59O1xuXG5jb25zdCBVTlRPVUNIRURfTU9OU1RFUlM6IHtbaWQ6IG51bWJlcl06IGJvb2xlYW59ID0geyAvLyBub3QgeWV0ICsweDUwIGluIHRoZXNlIGtleXNcbiAgWzB4N2VdOiB0cnVlLCAvLyB2ZXJ0aWNhbCBwbGF0Zm9ybVxuICBbMHg3Zl06IHRydWUsIC8vIGhvcml6b250YWwgcGxhdGZvcm1cbiAgWzB4ODNdOiB0cnVlLCAvLyBnbGl0Y2ggaW4gJDdjIChoeWRyYSlcbiAgWzB4OGRdOiB0cnVlLCAvLyBnbGl0Y2ggaW4gbG9jYXRpb24gJGFiIChzYWJlcmEgMilcbiAgWzB4OGVdOiB0cnVlLCAvLyBicm9rZW4/LCBidXQgc2l0cyBvbiB0b3Agb2YgaXJvbiB3YWxsXG4gIFsweDhmXTogdHJ1ZSwgLy8gc2hvb3Rpbmcgc3RhdHVlXG4gIFsweDlmXTogdHJ1ZSwgLy8gdmVydGljYWwgcGxhdGZvcm1cbiAgLy8gWzB4YTFdOiB0cnVlLCAvLyB3aGl0ZSB0b3dlciByb2JvdHNcbiAgWzB4YTZdOiB0cnVlLCAvLyBnbGl0Y2ggaW4gbG9jYXRpb24gJGFmIChtYWRvIDIpXG59O1xuXG5jb25zdCBzaHVmZmxlUmFuZG9tTnVtYmVycyA9IChyb206IFVpbnQ4QXJyYXksIHJhbmRvbTogUmFuZG9tKSA9PiB7XG4gIGNvbnN0IHRhYmxlID0gcm9tLnN1YmFycmF5KDB4MzU3ZTQgKyAweDEwLCAweDM1ODI0ICsgMHgxMCk7XG4gIHJhbmRvbS5zaHVmZmxlKHRhYmxlKTtcbn07XG5cbi8vIHVzZWZ1bCBmb3IgZGVidWcgZXZlbiBpZiBub3QgY3VycmVudGx5IHVzZWRcbmNvbnN0IFtdID0gW2hleF07XG4iXX0=