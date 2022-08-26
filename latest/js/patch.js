import { Assembler } from './asm/assembler.js';
import { Cpu } from './asm/cpu.js';
import { Preprocessor } from './asm/preprocessor.js';
import { TokenSource } from './asm/token.js';
import { TokenStream } from './asm/tokenstream.js';
import { Tokenizer } from './asm/tokenizer.js';
import { crc32 } from './crc32.js';
import { generate as generateDepgraph } from './depgraph.js';
import { FetchReader } from './fetchreader.js';
import { FlagSet } from './flagset.js';
import { Graph } from './logic/graph.js';
import { World } from './logic/world.js';
import { compressMapData, moveScreensIntoExpandedRom } from './pass/compressmapdata.js';
import { crumblingPlatforms } from './pass/crumblingplatforms.js';
import { deterministic, deterministicPreParse } from './pass/deterministic.js';
import { fixDialog } from './pass/fixdialog.js';
import { fixEntranceTriggers } from './pass/fixentrancetriggers.js';
import { fixMovementScripts } from './pass/fixmovementscripts.js';
import { fixSkippableExits } from './pass/fixskippableexits.js';
import { randomizeThunderWarp } from './pass/randomizethunderwarp.js';
import { rescaleMonsters } from './pass/rescalemonsters.js';
import { shuffleGoa } from './pass/shufflegoa.js';
import { shuffleHouses } from './pass/shufflehouses.js';
import { shuffleMazes } from './pass/shufflemazes.js';
import { shuffleMimics } from './pass/shufflemimics.js';
import { shuffleMonsterPositions } from './pass/shufflemonsterpositions.js';
import { shuffleMonsters } from './pass/shufflemonsters.js';
import { shufflePalettes } from './pass/shufflepalettes.js';
import { shuffleTrades } from './pass/shuffletrades.js';
import { standardMapEdits } from './pass/standardmapedits.js';
import { toggleMaps } from './pass/togglemaps.js';
import { unidentifiedItems } from './pass/unidentifieditems.js';
import { misspell } from './pass/misspell.js';
import { writeLocationsFromMeta } from './pass/writelocationsfrommeta.js';
import { Random } from './random.js';
import { Rom, ModuleId } from './rom.js';
import { fixTilesets } from './rom/screenfix.js';
import { ShopType } from './rom/shop.js';
import { Spoiler } from './rom/spoiler.js';
import { hex, seq, watchArray } from './rom/util.js';
import { DefaultMap } from './util.js';
import * as version from './version.js';
import { shuffleAreas } from './pass/shuffleareas.js';
import { checkTriggers } from './pass/checktriggers.js';
const EXPAND_PRG = true;
const ASM = ModuleId('asm');
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
            flags = new FlagSet('@Standard');
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
function defines(flags, pass) {
    const defines = {
        _ALLOW_TELEPORT_OUT_OF_BOSS: flags.hardcoreMode() &&
            flags.shuffleBossElements(),
        _ALLOW_TELEPORT_OUT_OF_TOWER: true,
        _AUDIBLE_WALLS: flags.audibleWallCues(pass),
        _AUTO_EQUIP_BRACELET: flags.autoEquipBracelet(pass),
        _BARRIER_REQUIRES_CALM_SEA: true,
        _BUFF_DEOS_PENDANT: flags.buffDeosPendant(),
        _BUFF_DYNA: flags.buffDyna(),
        _CHECK_FLAG0: true,
        _CTRL1_SHORTCUTS: flags.controllerShortcuts(pass),
        _CUSTOM_SHOOTING_WALLS: true,
        _DISABLE_SHOP_GLITCH: flags.disableShopGlitch(),
        _DISABLE_STATUE_GLITCH: flags.disableStatueGlitch(),
        _DISABLE_SWORD_CHARGE_GLITCH: flags.disableSwordChargeGlitch(),
        _DISABLE_TRIGGER_SKIP: flags.disableTriggerGlitch(),
        _DISABLE_WARP_BOOTS_REUSE: flags.disableShopGlitch(),
        _DISABLE_WILD_WARP: false,
        _EXPAND_PRG: EXPAND_PRG,
        _EXTRA_EXTENDED_SCREENS: true,
        _EXTRA_PITY_MP: true,
        _FIX_COIN_SPRITES: true,
        _FIX_OPEL_STATUE: true,
        _FIX_SHAKING: true,
        _FIX_VAMPIRE: true,
        _HAZMAT_SUIT: flags.changeGasMaskToHazmatSuit(),
        _LEATHER_BOOTS_GIVE_SPEED: flags.leatherBootsGiveSpeed(),
        _MAX_SCALING_IN_TOWER: flags.maxScalingInTower(),
        _MONEY_AT_START: flags.shuffleHouses() || flags.shuffleAreas(),
        _NERF_FLIGHT: true,
        _NERF_MADO: true,
        _NEVER_DIE: flags.neverDie(),
        _NORMALIZE_SHOP_PRICES: flags.shuffleShops(),
        _PITY_HP_AND_MP: true,
        _PROGRESSIVE_BRACELET: true,
        _RABBIT_BOOTS_CHARGE_WHILE_WALKING: flags.rabbitBootsChargeWhileWalking(),
        _RANDOM_FLYER_SPAWNS: true,
        _REQUIRE_HEALED_DOLPHIN_TO_RIDE: flags.requireHealedDolphinToRide(),
        _REVERSIBLE_SWAN_GATE: true,
        _SAHARA_RABBITS_REQUIRE_TELEPATHY: flags.saharaRabbitsRequireTelepathy(),
        _SIMPLIFY_INVISIBLE_CHESTS: true,
        _SOFT_RESET_SHORTCUT: true,
        _TELEPORT_ON_THUNDER_SWORD: flags.teleportOnThunderSword(),
        _TINK_MODE: !flags.guaranteeMatchingSword(),
        _TRAINER: flags.trainer(),
        _TWELFTH_WARP_POINT: true,
        _UNIDENTIFIED_ITEMS: flags.unidentifiedItems(),
        _ENEMY_HP: flags.shouldUpdateHud(),
        _UPDATE_HUD: flags.shouldUpdateHud(),
        _WARP_FLAGS_TABLE: true,
        _ZEBU_STUDENT_GIVES_ITEM: flags.zebuStudentGivesItem(),
    };
    return Object.keys(defines)
        .filter(d => defines[d])
        .map(d => `.define ${d} ${defines[d]}\n`)
        .join('');
}
function patchGraphics(rom, sprites) {
    for (let sprite of sprites) {
        sprite.applyPatch(rom, EXPAND_PRG);
    }
}
export async function shuffle(rom, seed, originalFlags, reader, spriteReplacements, log, progress) {
    const expectedSize = 16 + (rom[6] & 4 ? 512 : 0) + (rom[4] << 14) + (rom[5] << 13);
    if (rom.length > expectedSize)
        rom = rom.slice(0, expectedSize);
    if (EXPAND_PRG && rom.length < 0x80000) {
        const newRom = new Uint8Array(rom.length + 0x40000);
        newRom.subarray(0, 0x40010).set(rom.subarray(0, 0x40010));
        newRom.subarray(0x80010).set(rom.subarray(0x40010));
        newRom[4] <<= 1;
        rom = newRom;
    }
    deterministicPreParse(rom.subarray(0x10));
    if (typeof seed !== 'number')
        throw new Error('Bad seed');
    const newSeed = crc32(seed.toString(16).padStart(8, '0') + String(originalFlags.filterOptional())) >>> 0;
    const random = new Random(newSeed);
    const sprites = spriteReplacements ? spriteReplacements : [];
    const attemptErrors = [];
    for (let i = 0; i < 5; i++) {
        try {
            return await shuffleInternal(rom, originalFlags, seed, random, reader, log, progress, sprites);
        }
        catch (error) {
            attemptErrors.push(error);
            console.error(`Attempt ${i + 1} failed: ${error.stack}`);
        }
    }
    throw new Error(`Shuffle failed: ${attemptErrors.map(e => e.stack).join('\n\n')}`);
}
async function shuffleInternal(rom, originalFlags, originalSeed, random, reader, log, progress, spriteReplacements) {
    const originalFlagString = String(originalFlags);
    const flags = originalFlags.filterRandom(random);
    const parsed = new Rom(rom);
    const actualFlagString = String(flags);
    parsed.flags.defrag();
    compressMapData(parsed);
    moveScreensIntoExpandedRom(parsed);
    if (typeof window == 'object')
        window.rom = parsed;
    parsed.spoiler = new Spoiler(parsed);
    if (log)
        log.spoiler = parsed.spoiler;
    if (actualFlagString !== originalFlagString) {
        parsed.spoiler.flags = actualFlagString;
    }
    deterministic(parsed, flags);
    fixTilesets(parsed);
    standardMapEdits(parsed, standardMapEdits.generateOptions(flags, random));
    toggleMaps(parsed, flags, random);
    parsed.scalingLevels = 48;
    if (flags.shuffleShops())
        shuffleShops(parsed, flags, random);
    if (flags.shuffleGoaFloors())
        shuffleGoa(parsed, random);
    updateWallSpawnFormat(parsed);
    randomizeWalls(parsed, flags, random);
    crumblingPlatforms(parsed, random);
    if (flags.nerfWildWarp())
        parsed.wildWarp.locations.fill(0);
    if (flags.randomizeWildWarp())
        shuffleWildWarp(parsed, flags, random);
    if (flags.randomizeThunderTeleport())
        randomizeThunderWarp(parsed, random);
    rescaleMonsters(parsed, flags, random);
    unidentifiedItems(parsed, flags, random);
    misspell(parsed, flags, random);
    shuffleTrades(parsed, flags, random);
    if (flags.shuffleHouses())
        shuffleHouses(parsed, flags, random);
    if (flags.shuffleAreas())
        shuffleAreas(parsed, flags, random);
    fixEntranceTriggers(parsed);
    if (flags.randomizeMaps())
        shuffleMazes(parsed, flags, random);
    writeLocationsFromMeta(parsed);
    shuffleMonsterPositions(parsed, random);
    if (flags.shuffleMimics())
        shuffleMimics(parsed, flags, random);
    if (flags.shuffleMonsters())
        shuffleMonsters(parsed, flags, random);
    const world = new World(parsed, flags);
    const graph = new Graph([world.getLocationList()]);
    if (!flags.noShuffle()) {
        const fill = await graph.shuffle(flags, random, undefined, progress, parsed.spoiler);
        if (fill) {
            for (const [slot, item] of fill) {
                parsed.slots[slot & 0xff] = item & 0xff;
            }
        }
        else {
            return [rom, -1];
        }
    }
    if (flags.shuffleShops()) {
        rescaleShops(parsed, flags.bargainHunting() ? random : undefined);
    }
    if (flags.buffMedicalHerb()) {
        parsed.items.MedicalHerb.value = 80;
        parsed.items.FruitOfPower.value = 56;
    }
    if (flags.storyMode())
        storyMode(parsed);
    if (flags.blackoutMode())
        blackoutMode(parsed);
    misc(parsed, flags, random);
    fixDialog(parsed);
    fixMovementScripts(parsed);
    checkTriggers(parsed);
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
    if (flags.randomizeMusic('early')) {
        shuffleMusic(parsed, flags, random);
    }
    if (flags.shuffleTilePalettes('early')) {
        shufflePalettes(parsed, flags, random);
    }
    updateTablesPreCommit(parsed, flags);
    random.shuffle(parsed.randomNumbers.values);
    async function asm(pass) {
        async function tokenizer(path) {
            return new Tokenizer(await reader.read(path), path, { lineContinuations: true });
        }
        const flagFile = defines(flags, pass);
        const asm = new Assembler(Cpu.P02);
        const toks = new TokenStream();
        toks.enter(TokenSource.concat(new Tokenizer(flagFile, 'flags.s'), await tokenizer('init.s'), await tokenizer('alloc.s'), await tokenizer('preshuffle.s'), await tokenizer('postparse.s'), await tokenizer('postshuffle.s')));
        const pre = new Preprocessor(toks, asm);
        asm.tokens(pre);
        return asm.module();
    }
    parsed.messages.compress();
    const prgCopy = rom.slice(16);
    parsed.modules.set(ASM, await asm('early'));
    parsed.writeData(prgCopy);
    parsed.modules.set(ASM, await asm('late'));
    const hasGraphics = (spriteReplacements === null || spriteReplacements === void 0 ? void 0 : spriteReplacements.some((spr) => spr.isCustom())) || false;
    const crc = stampVersionSeedAndHash(rom, originalSeed, originalFlagString, prgCopy, hasGraphics);
    if (flags.randomizeMusic('late')) {
        shuffleMusic(parsed, flags, random);
    }
    if (flags.noMusic('late')) {
        noMusic(parsed);
    }
    if (flags.shuffleTilePalettes('late')) {
        shufflePalettes(parsed, flags, random);
    }
    fixSkippableExits(parsed);
    parsed.writeData();
    patchGraphics(rom, spriteReplacements);
    if (EXPAND_PRG) {
        const prg = rom.subarray(0x10);
        prg.subarray(0x7c000, 0x80000).set(prg.subarray(0x3c000, 0x40000));
    }
    return [rom, crc];
}
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
function updateWallSpawnFormat(rom) {
    for (const location of rom.locations) {
        if (!location.used)
            continue;
        for (const spawn of location.spawns) {
            if (spawn.isWall()) {
                const elem = spawn.id & 0xf;
                spawn.id = elem | (elem << 4);
                const shooting = spawn.isShootingWall(location);
                spawn.data[2] = shooting ? 0x33 : 0x23;
            }
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
function noMusic(rom) {
    for (const m of [...rom.locations, ...rom.bosses.musics]) {
        m.bgm = 0;
    }
}
function shuffleMusic(rom, flags, random) {
    const musics = new DefaultMap(() => []);
    const all = new Set();
    for (const l of rom.locations) {
        if (l.id === 0x5f || l.id === 0 || !l.used)
            continue;
        const music = l.musicGroup;
        all.add(l.bgm);
        musics.get(music).push(l);
    }
    for (const b of rom.bosses.musics) {
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
}
function shuffleWildWarp(rom, _flags, random) {
    const locations = [];
    for (const l of rom.locations) {
        if (l && l.used &&
            l.id &&
            !l.isShop() &&
            (l.id & 0xf8) !== 0x58 &&
            l !== rom.locations.Crypt_Draygon2 &&
            l !== rom.locations.Crypt_Teleporter &&
            l !== rom.locations.MesiaShrine &&
            l !== rom.locations.LimeTreeLake) {
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
        rom.flags.Kelbesque1.id,
        rom.flags.Sabera1.id,
        rom.flags.Mado1.id,
        rom.flags.Kelbesque2.id,
        rom.flags.Sabera2.id,
        rom.flags.Mado2.id,
        rom.flags.Karmine.id,
        rom.flags.Draygon1.id,
        rom.flags.SwordOfWind.id,
        rom.flags.SwordOfFire.id,
        rom.flags.SwordOfWater.id,
        rom.flags.SwordOfThunder.id,
    ];
    rom.npcs[0xcb].spawnConditions.get(0xa6).push(...conditions);
};
export function stampVersionSeedAndHash(rom, seed, flagString, early, hasGraphics) {
    const crc = crc32(early);
    const crcString = crc.toString(16).padStart(8, '0').toUpperCase();
    const hash = version.STATUS === 'unstable' ?
        version.HASH.substring(0, 7).padStart(7, '0').toUpperCase() + '     ' :
        version.VERSION.substring(0, 12).padEnd(12, ' ');
    const seedStr = seed.toString(16).padStart(8, '0').toUpperCase();
    const embed = (addr, ...values) => {
        addr += 0x10;
        for (const value of values) {
            if (typeof value === 'string') {
                for (const c of value) {
                    rom[addr++] = c.charCodeAt(0);
                }
            }
            else if (typeof value === 'number') {
                rom[addr++] = value;
            }
            else {
                throw new Error(`Bad value: ${value}`);
            }
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
    if (hasGraphics) {
        embed(0x27883, 0x7e);
    }
    embed(0x27885, intercalate(crcString.substring(0, 4), crcString.substring(4)));
    embed(0x25716, 'RANDOMIZER');
    if (version.STATUS === 'unstable')
        embed(0x2573c, 'BETA');
    return crc;
}
function updateTablesPreCommit(rom, flags) {
    if (flags.decreaseEnemyDamage()) {
        rom.scaling.setPhpFormula(s => 16 + 6 * s);
    }
    rom.scaling.setExpScalingFactor(flags.expScalingFactor());
    if (flags.disableShopGlitch()) {
        rom.coinDrops.values = [
            0, 5, 10, 15, 25, 40, 65, 105,
            170, 275, 445, 600, 700, 800, 900, 1000,
        ];
    }
    else {
        rom.coinDrops.values = [
            0, 1, 2, 4, 8, 16, 30, 50,
            100, 200, 300, 400, 500, 600, 700, 800,
        ];
    }
    rom.items.CarapaceShield.defense = rom.items.TannedHide.defense = 3;
    rom.items.PlatinumShield.defense = rom.items.BronzeArmor.defense = 9;
    rom.items.MirroredShield.defense = rom.items.PlatinumArmor.defense = 13;
    rom.items.PsychoArmor.defense = rom.items.PsychoShield.defense = 20;
    rom.items.CeramicSuit.defense = rom.items.BattleShield.defense = 32;
    rom.items.CarapaceShield.defense = rom.items.TannedHide.defense = 2;
    rom.items.PlatinumShield.defense = rom.items.BronzeArmor.defense = 10;
    rom.items.MirroredShield.defense = rom.items.PlatinumArmor.defense = 14;
    rom.items.BattleArmor.defense = 24;
}
const rescaleShops = (rom, random) => {
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
    rom.shops.rescale = true;
    rom.shops.toolShopScaling = diff.map(d => Math.round(8 * (2 ** (d / 10))));
    rom.shops.armorShopScaling =
        diff.map(d => Math.round(8 * (2 ** ((47 - d) / 12))));
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
const [] = [hex];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDbkMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFtQixRQUFRLElBQUksZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdkMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFB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LEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDaEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pDO0FBR0gsQ0FBQyxDQUFDO0FBR0YsTUFBTSxXQUFXLEdBQStCO0lBRTlDLElBQUksRUFBRSxDQUFDO0lBQ1AsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxHQUFHO0lBQ1QsSUFBSSxFQUFFLElBQUk7SUFDVixJQUFJLEVBQUUsSUFBSTtJQUNWLElBQUksRUFBRSxJQUFJO0lBQ1YsSUFBSSxFQUFFLENBQUM7SUFDUCxJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUUsSUFBSTtJQUNWLElBQUksRUFBRSxJQUFJO0lBRVYsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxHQUFHO0lBQ1QsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxHQUFHO0NBRVYsQ0FBQztBQW9FRixNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXNzZW1ibGVyIH0gZnJvbSAnLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7IENwdSB9IGZyb20gJy4vYXNtL2NwdS5qcyc7XG5pbXBvcnQgeyBQcmVwcm9jZXNzb3IgfSBmcm9tICcuL2FzbS9wcmVwcm9jZXNzb3IuanMnO1xuaW1wb3J0IHsgVG9rZW5Tb3VyY2UgfSBmcm9tICcuL2FzbS90b2tlbi5qcyc7XG5pbXBvcnQgeyBUb2tlblN0cmVhbSB9IGZyb20gJy4vYXNtL3Rva2Vuc3RyZWFtLmpzJztcbmltcG9ydCB7IFRva2VuaXplciB9IGZyb20gJy4vYXNtL3Rva2VuaXplci5qcyc7XG5pbXBvcnQgeyBjcmMzMiB9IGZyb20gJy4vY3JjMzIuanMnO1xuaW1wb3J0IHsgUHJvZ3Jlc3NUcmFja2VyLCBnZW5lcmF0ZSBhcyBnZW5lcmF0ZURlcGdyYXBoIH0gZnJvbSAnLi9kZXBncmFwaC5qcyc7XG5pbXBvcnQgeyBGZXRjaFJlYWRlciB9IGZyb20gJy4vZmV0Y2hyZWFkZXIuanMnO1xuaW1wb3J0IHsgRmxhZ1NldCB9IGZyb20gJy4vZmxhZ3NldC5qcyc7XG5pbXBvcnQgeyBHcmFwaCB9IGZyb20gJy4vbG9naWMvZ3JhcGguanMnO1xuaW1wb3J0IHsgV29ybGQgfSBmcm9tICcuL2xvZ2ljL3dvcmxkLmpzJztcbmltcG9ydCB7IGNvbXByZXNzTWFwRGF0YSwgbW92ZVNjcmVlbnNJbnRvRXhwYW5kZWRSb20gfSBmcm9tICcuL3Bhc3MvY29tcHJlc3NtYXBkYXRhLmpzJztcbmltcG9ydCB7IGNydW1ibGluZ1BsYXRmb3JtcyB9IGZyb20gJy4vcGFzcy9jcnVtYmxpbmdwbGF0Zm9ybXMuanMnO1xuaW1wb3J0IHsgZGV0ZXJtaW5pc3RpYywgZGV0ZXJtaW5pc3RpY1ByZVBhcnNlIH0gZnJvbSAnLi9wYXNzL2RldGVybWluaXN0aWMuanMnO1xuaW1wb3J0IHsgZml4RGlhbG9nIH0gZnJvbSAnLi9wYXNzL2ZpeGRpYWxvZy5qcyc7XG5pbXBvcnQgeyBmaXhFbnRyYW5jZVRyaWdnZXJzIH0gZnJvbSAnLi9wYXNzL2ZpeGVudHJhbmNldHJpZ2dlcnMuanMnO1xuaW1wb3J0IHsgZml4TW92ZW1lbnRTY3JpcHRzIH0gZnJvbSAnLi9wYXNzL2ZpeG1vdmVtZW50c2NyaXB0cy5qcyc7XG5pbXBvcnQgeyBmaXhTa2lwcGFibGVFeGl0cyB9IGZyb20gJy4vcGFzcy9maXhza2lwcGFibGVleGl0cy5qcyc7XG5pbXBvcnQgeyByYW5kb21pemVUaHVuZGVyV2FycCB9IGZyb20gJy4vcGFzcy9yYW5kb21pemV0aHVuZGVyd2FycC5qcyc7XG5pbXBvcnQgeyByZXNjYWxlTW9uc3RlcnMgfSBmcm9tICcuL3Bhc3MvcmVzY2FsZW1vbnN0ZXJzLmpzJztcbmltcG9ydCB7IHNodWZmbGVHb2EgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZWdvYS5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlSG91c2VzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVob3VzZXMuanMnO1xuaW1wb3J0IHsgc2h1ZmZsZU1hemVzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVtYXplcy5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlTWltaWNzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVtaW1pY3MuanMnO1xuaW1wb3J0IHsgc2h1ZmZsZU1vbnN0ZXJQb3NpdGlvbnMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZW1vbnN0ZXJwb3NpdGlvbnMuanMnO1xuaW1wb3J0IHsgc2h1ZmZsZU1vbnN0ZXJzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVtb25zdGVycy5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlUGFsZXR0ZXMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXBhbGV0dGVzLmpzJztcbmltcG9ydCB7IHNodWZmbGVUcmFkZXMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXRyYWRlcy5qcyc7XG5pbXBvcnQgeyBzdGFuZGFyZE1hcEVkaXRzIH0gZnJvbSAnLi9wYXNzL3N0YW5kYXJkbWFwZWRpdHMuanMnO1xuaW1wb3J0IHsgdG9nZ2xlTWFwcyB9IGZyb20gJy4vcGFzcy90b2dnbGVtYXBzLmpzJztcbmltcG9ydCB7IHVuaWRlbnRpZmllZEl0ZW1zIH0gZnJvbSAnLi9wYXNzL3VuaWRlbnRpZmllZGl0ZW1zLmpzJztcbmltcG9ydCB7IG1pc3NwZWxsIH0gZnJvbSAnLi9wYXNzL21pc3NwZWxsLmpzJztcbmltcG9ydCB7IHdyaXRlTG9jYXRpb25zRnJvbU1ldGEgfSBmcm9tICcuL3Bhc3Mvd3JpdGVsb2NhdGlvbnNmcm9tbWV0YS5qcyc7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICcuL3JhbmRvbS5qcyc7XG5pbXBvcnQgeyBSb20sIE1vZHVsZUlkIH0gZnJvbSAnLi9yb20uanMnO1xuaW1wb3J0IHsgQXJlYSB9IGZyb20gJy4vcm9tL2FyZWEuanMnO1xuaW1wb3J0IHsgTG9jYXRpb24sIFNwYXduIH0gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHsgZml4VGlsZXNldHMgfSBmcm9tICcuL3JvbS9zY3JlZW5maXguanMnO1xuaW1wb3J0IHsgU2hvcCwgU2hvcFR5cGUgfSBmcm9tICcuL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7IFNwb2lsZXIgfSBmcm9tICcuL3JvbS9zcG9pbGVyLmpzJztcbmltcG9ydCB7IGhleCwgc2VxLCB3YXRjaEFycmF5IH0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQgeyBEZWZhdWx0TWFwIH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCAqIGFzIHZlcnNpb24gZnJvbSAnLi92ZXJzaW9uLmpzJztcbmltcG9ydCB7IHNodWZmbGVBcmVhcyB9IGZyb20gJy4vcGFzcy9zaHVmZmxlYXJlYXMuanMnO1xuaW1wb3J0IHsgY2hlY2tUcmlnZ2VycyB9IGZyb20gJy4vcGFzcy9jaGVja3RyaWdnZXJzLmpzJztcbmltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4vY2hhcmFjdGVycy5qcyc7XG5cbmNvbnN0IEVYUEFORF9QUkc6IGJvb2xlYW4gPSB0cnVlO1xuY29uc3QgQVNNID0gTW9kdWxlSWQoJ2FzbScpO1xuXG4vLyAod2luZG93IGFzIGFueSkuQ2F2ZVNodWZmbGUgPSBDYXZlU2h1ZmZsZTtcbi8vIGZ1bmN0aW9uIHNodWZmbGVDYXZlKHNlZWQ6IG51bWJlciwgcGFyYW1zOiBhbnksIG51bSA9IDEwMDApIHtcbi8vICAgZm9yIChsZXQgaSA9IHNlZWQ7IGkgPCBzZWVkICsgbnVtOyBpKyspIHtcbi8vICAgICBjb25zdCBzID0gbmV3IENhdmVTaHVmZmxlKHsuLi5wYXJhbXMsIHRpbGVzZXQ6ICh3aW5kb3cgYXMgYW55KS5yb20ubWV0YXRpbGVzZXRzLmNhdmV9LCBpKTtcbi8vICAgICBzLm1pblNwaWtlcyA9IDM7XG4vLyAgICAgdHJ5IHtcbi8vICAgICAgIGlmIChzLmJ1aWxkKCkpIHtcbi8vICAgICAgICAgY29uc29sZS5sb2coYHNlZWQgJHtpfTpcXG4ke3MuZ3JpZC5zaG93KCl9XFxuJHtzLm1ldGEhLnNob3coKX1gKTtcbi8vICAgICAgICAgcmV0dXJuO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgY29uc29sZS5sb2coYGZhaWw6XFxuJHtzLmdyaWQuc2hvdygpfWApO1xuLy8gICAgICAgfVxuLy8gICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuLy8gICAgICAgY29uc29sZS5sb2coYGZhaWwgJHtpfTpcXG4ke3MuZ3JpZC5zaG93KCl9YCk7XG4vLyAgICAgfVxuLy8gICB9XG4vLyAgIGNvbnNvbGUubG9nKGBmYWlsYCk7XG4vLyB9XG5cbi8vIGNsYXNzIFNoaW1Bc3NlbWJsZXIge1xuLy8gICBwcmU6IFByZXByb2Nlc3Nvcjtcbi8vICAgZXhwb3J0cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG5cbi8vICAgY29uc3RydWN0b3IoY29kZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbi8vICAgICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKENwdS5QMDIpO1xuLy8gICAgIGNvbnN0IHRva3MgPSBuZXcgVG9rZW5TdHJlYW0oKTtcbi8vICAgICB0b2tzLmVudGVyKG5ldyBUb2tlbml6ZXIoY29kZSwgZmlsZSkpO1xuLy8gICAgIHRoaXMucHJlID0gbmV3IFByZXByb2Nlc3Nvcih0b2tzLCBhc20pO1xuLy8gICAgIHdoaWxlICh0aGlzLnByZS5uZXh0KCkpIHt9XG4vLyAgIH1cblxuLy8gICBhc3NlbWJsZShjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgcm9tOiBVaW50OEFycmF5KSB7XG4vLyAgICAgY29uc3QgYXNtID0gbmV3IEFzc2VtYmxlcihDcHUuUDAyKTtcbi8vICAgICBjb25zdCB0b2tzID0gbmV3IFRva2VuU3RyZWFtKCk7XG4vLyAgICAgdG9rcy5lbnRlcihuZXcgVG9rZW5pemVyKGNvZGUsIGZpbGUpKTtcbi8vICAgICBjb25zdCBwcmUgPSBuZXcgUHJlcHJvY2Vzc29yKHRva3MsIGFzbSwgdGhpcy5wcmUpO1xuLy8gICAgIGFzbS50b2tlbnMocHJlKTtcbi8vICAgICBjb25zdCBsaW5rID0gbmV3IExpbmtlcigpO1xuLy8gICAgIGxpbmsucmVhZChhc20ubW9kdWxlKCkpO1xuLy8gICAgIGxpbmsubGluaygpLmFkZE9mZnNldCgweDEwKS5hcHBseShyb20pO1xuLy8gICAgIGZvciAoY29uc3QgW3MsIHZdIG9mIGxpbmsuZXhwb3J0cygpKSB7XG4vLyAgICAgICAvL2lmICghdi5vZmZzZXQpIHRocm93IG5ldyBFcnJvcihgbm8gb2Zmc2V0OiAke3N9YCk7XG4vLyAgICAgICB0aGlzLmV4cG9ydHMuc2V0KHMsIHYub2Zmc2V0ID8/IHYudmFsdWUpO1xuLy8gICAgIH1cbi8vICAgfVxuXG4vLyAgIGV4cGFuZChzOiBzdHJpbmcpIHtcbi8vICAgICBjb25zdCB2ID0gdGhpcy5leHBvcnRzLmdldChzKTtcbi8vICAgICBpZiAoIXYpIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBleHBvcnQ6ICR7c31gKTtcbi8vICAgICByZXR1cm4gdjtcbi8vICAgfVxuLy8gfVxuXG5cbi8vIFRPRE8gLSB0byBzaHVmZmxlIHRoZSBtb25zdGVycywgd2UgbmVlZCB0byBmaW5kIHRoZSBzcHJpdGUgcGFsdHRlcyBhbmRcbi8vIHBhdHRlcm5zIGZvciBlYWNoIG1vbnN0ZXIuICBFYWNoIGxvY2F0aW9uIHN1cHBvcnRzIHVwIHRvIHR3byBtYXRjaHVwcyxcbi8vIHNvIGNhbiBvbmx5IHN1cHBvcnQgbW9uc3RlcnMgdGhhdCBtYXRjaC4gIE1vcmVvdmVyLCBkaWZmZXJlbnQgbW9uc3RlcnNcbi8vIHNlZW0gdG8gbmVlZCB0byBiZSBpbiBlaXRoZXIgc2xvdCAwIG9yIDEuXG5cbi8vIFB1bGwgaW4gYWxsIHRoZSBwYXRjaGVzIHdlIHdhbnQgdG8gYXBwbHkgYXV0b21hdGljYWxseS5cbi8vIFRPRE8gLSBtYWtlIGEgZGVidWdnZXIgd2luZG93IGZvciBwYXRjaGVzLlxuLy8gVE9ETyAtIHRoaXMgbmVlZHMgdG8gYmUgYSBzZXBhcmF0ZSBub24tY29tcGlsZWQgZmlsZS5cbmV4cG9ydCBkZWZhdWx0ICh7XG4gIGFzeW5jIGFwcGx5KHJvbTogVWludDhBcnJheSwgaGFzaDoge1trZXk6IHN0cmluZ106IHVua25vd259LCBwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgICAvLyBMb29rIGZvciBmbGFnIHN0cmluZyBhbmQgaGFzaFxuICAgIGxldCBmbGFncztcbiAgICBpZiAoIWhhc2guc2VlZCkge1xuICAgICAgLy8gVE9ETyAtIHNlbmQgaW4gYSBoYXNoIG9iamVjdCB3aXRoIGdldC9zZXQgbWV0aG9kc1xuICAgICAgaGFzaC5zZWVkID0gcGFyc2VTZWVkKCcnKS50b1N0cmluZygxNik7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCArPSAnJnNlZWQ9JyArIGhhc2guc2VlZDtcbiAgICB9XG4gICAgaWYgKGhhc2guZmxhZ3MpIHtcbiAgICAgIGZsYWdzID0gbmV3IEZsYWdTZXQoU3RyaW5nKGhhc2guZmxhZ3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmxhZ3MgPSBuZXcgRmxhZ1NldCgnQFN0YW5kYXJkJyk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qga2V5IGluIGhhc2gpIHtcbiAgICAgIGlmIChoYXNoW2tleV0gPT09ICdmYWxzZScpIGhhc2hba2V5XSA9IGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBbcmVzdWx0LF0gPVxuICAgICAgICBhd2FpdCBzaHVmZmxlKHJvbSwgcGFyc2VTZWVkKFN0cmluZyhoYXNoLnNlZWQpKSxcbiAgICAgICAgICAgICAgICAgICAgICBmbGFncywgbmV3IEZldGNoUmVhZGVyKHBhdGgpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVNlZWQoc2VlZDogc3RyaW5nKTogbnVtYmVyIHtcbiAgaWYgKCFzZWVkKSByZXR1cm4gUmFuZG9tLm5ld1NlZWQoKTtcbiAgaWYgKC9eWzAtOWEtZl17MSw4fSQvaS50ZXN0KHNlZWQpKSByZXR1cm4gTnVtYmVyLnBhcnNlSW50KHNlZWQsIDE2KTtcbiAgcmV0dXJuIGNyYzMyKHNlZWQpO1xufVxuXG4vKipcbiAqIEFic3RyYWN0IG91dCBGaWxlIEkvTy4gIE5vZGUgYW5kIGJyb3dzZXIgd2lsbCBoYXZlIGNvbXBsZXRlbHlcbiAqIGRpZmZlcmVudCBpbXBsZW1lbnRhdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZGVyIHtcbiAgcmVhZChmaWxlbmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+O1xufVxuXG4vLyBwcmV2ZW50IHVudXNlZCBlcnJvcnMgYWJvdXQgd2F0Y2hBcnJheSAtIGl0J3MgdXNlZCBmb3IgZGVidWdnaW5nLlxuY29uc3Qge30gPSB7d2F0Y2hBcnJheX0gYXMgYW55O1xuXG5mdW5jdGlvbiBkZWZpbmVzKGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICBwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogc3RyaW5nIHtcbiAgY29uc3QgZGVmaW5lczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7XG4gICAgX0FMTE9XX1RFTEVQT1JUX09VVF9PRl9CT1NTOiBmbGFncy5oYXJkY29yZU1vZGUoKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpLFxuICAgIF9BTExPV19URUxFUE9SVF9PVVRfT0ZfVE9XRVI6IHRydWUsXG4gICAgX0FVRElCTEVfV0FMTFM6IGZsYWdzLmF1ZGlibGVXYWxsQ3VlcyhwYXNzKSxcbiAgICBfQVVUT19FUVVJUF9CUkFDRUxFVDogZmxhZ3MuYXV0b0VxdWlwQnJhY2VsZXQocGFzcyksXG4gICAgX0JBUlJJRVJfUkVRVUlSRVNfQ0FMTV9TRUE6IHRydWUsIC8vIGZsYWdzLmJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKSxcbiAgICBfQlVGRl9ERU9TX1BFTkRBTlQ6IGZsYWdzLmJ1ZmZEZW9zUGVuZGFudCgpLFxuICAgIF9CVUZGX0RZTkE6IGZsYWdzLmJ1ZmZEeW5hKCksIC8vIHRydWUsXG4gICAgX0NIRUNLX0ZMQUcwOiB0cnVlLFxuICAgIF9DVFJMMV9TSE9SVENVVFM6IGZsYWdzLmNvbnRyb2xsZXJTaG9ydGN1dHMocGFzcyksXG4gICAgX0NVU1RPTV9TSE9PVElOR19XQUxMUzogdHJ1ZSxcbiAgICBfRElTQUJMRV9TSE9QX0dMSVRDSDogZmxhZ3MuZGlzYWJsZVNob3BHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9TVEFUVUVfR0xJVENIOiBmbGFncy5kaXNhYmxlU3RhdHVlR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfU1dPUkRfQ0hBUkdFX0dMSVRDSDogZmxhZ3MuZGlzYWJsZVN3b3JkQ2hhcmdlR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfVFJJR0dFUl9TS0lQOiBmbGFncy5kaXNhYmxlVHJpZ2dlckdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1dBUlBfQk9PVFNfUkVVU0U6IGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfV0lMRF9XQVJQOiBmYWxzZSxcbiAgICBfRVhQQU5EX1BSRzogRVhQQU5EX1BSRyxcbiAgICBfRVhUUkFfRVhURU5ERURfU0NSRUVOUzogdHJ1ZSxcbiAgICBfRVhUUkFfUElUWV9NUDogdHJ1ZSwgIC8vIFRPRE86IGFsbG93IGRpc2FibGluZyB0aGlzXG4gICAgX0ZJWF9DT0lOX1NQUklURVM6IHRydWUsXG4gICAgX0ZJWF9PUEVMX1NUQVRVRTogdHJ1ZSxcbiAgICBfRklYX1NIQUtJTkc6IHRydWUsXG4gICAgX0ZJWF9WQU1QSVJFOiB0cnVlLFxuICAgIF9IQVpNQVRfU1VJVDogZmxhZ3MuY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpLFxuICAgIF9MRUFUSEVSX0JPT1RTX0dJVkVfU1BFRUQ6IGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpLFxuICAgIF9NQVhfU0NBTElOR19JTl9UT1dFUjogZmxhZ3MubWF4U2NhbGluZ0luVG93ZXIoKSxcbiAgICBfTU9ORVlfQVRfU1RBUlQ6IGZsYWdzLnNodWZmbGVIb3VzZXMoKSB8fCBmbGFncy5zaHVmZmxlQXJlYXMoKSxcbiAgICBfTkVSRl9GTElHSFQ6IHRydWUsXG4gICAgX05FUkZfTUFETzogdHJ1ZSxcbiAgICBfTkVWRVJfRElFOiBmbGFncy5uZXZlckRpZSgpLFxuICAgIF9OT1JNQUxJWkVfU0hPUF9QUklDRVM6IGZsYWdzLnNodWZmbGVTaG9wcygpLFxuICAgIF9QSVRZX0hQX0FORF9NUDogdHJ1ZSxcbiAgICBfUFJPR1JFU1NJVkVfQlJBQ0VMRVQ6IHRydWUsXG4gICAgX1JBQkJJVF9CT09UU19DSEFSR0VfV0hJTEVfV0FMS0lORzogZmxhZ3MucmFiYml0Qm9vdHNDaGFyZ2VXaGlsZVdhbGtpbmcoKSxcbiAgICBfUkFORE9NX0ZMWUVSX1NQQVdOUzogdHJ1ZSxcbiAgICBfUkVRVUlSRV9IRUFMRURfRE9MUEhJTl9UT19SSURFOiBmbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpLFxuICAgIF9SRVZFUlNJQkxFX1NXQU5fR0FURTogdHJ1ZSxcbiAgICBfU0FIQVJBX1JBQkJJVFNfUkVRVUlSRV9URUxFUEFUSFk6IGZsYWdzLnNhaGFyYVJhYmJpdHNSZXF1aXJlVGVsZXBhdGh5KCksXG4gICAgX1NJTVBMSUZZX0lOVklTSUJMRV9DSEVTVFM6IHRydWUsXG4gICAgX1NPRlRfUkVTRVRfU0hPUlRDVVQ6IHRydWUsXG4gICAgX1RFTEVQT1JUX09OX1RIVU5ERVJfU1dPUkQ6IGZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSxcbiAgICBfVElOS19NT0RFOiAhZmxhZ3MuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpLFxuICAgIF9UUkFJTkVSOiBmbGFncy50cmFpbmVyKCksXG4gICAgX1RXRUxGVEhfV0FSUF9QT0lOVDogdHJ1ZSwgLy8gem9tYmllIHRvd24gd2FycFxuICAgIF9VTklERU5USUZJRURfSVRFTVM6IGZsYWdzLnVuaWRlbnRpZmllZEl0ZW1zKCksXG4gICAgX0VORU1ZX0hQOiBmbGFncy5zaG91bGRVcGRhdGVIdWQoKSxcbiAgICBfVVBEQVRFX0hVRDogZmxhZ3Muc2hvdWxkVXBkYXRlSHVkKCksXG4gICAgX1dBUlBfRkxBR1NfVEFCTEU6IHRydWUsXG4gICAgX1pFQlVfU1RVREVOVF9HSVZFU19JVEVNOiBmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpLFxuICB9O1xuICByZXR1cm4gT2JqZWN0LmtleXMoZGVmaW5lcylcbiAgICAgIC5maWx0ZXIoZCA9PiBkZWZpbmVzW2RdKVxuICAgICAgLm1hcChkID0+IGAuZGVmaW5lICR7ZH0gJHtkZWZpbmVzW2RdfVxcbmApXG4gICAgICAuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIHBhdGNoR3JhcGhpY3Mocm9tOiBVaW50OEFycmF5LCBzcHJpdGVzOiBTcHJpdGVbXSkge1xuICBmb3IgKGxldCBzcHJpdGUgb2Ygc3ByaXRlcykge1xuICAgIHNwcml0ZS5hcHBseVBhdGNoKHJvbSwgRVhQQU5EX1BSRyk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNodWZmbGUocm9tOiBVaW50OEFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxGbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlcjogUmVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ByaXRlUmVwbGFjZW1lbnRzPzogU3ByaXRlW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2c/OiB7c3BvaWxlcj86IFNwb2lsZXJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3M/OiBQcm9ncmVzc1RyYWNrZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTogUHJvbWlzZTxyZWFkb25seSBbVWludDhBcnJheSwgbnVtYmVyXT4ge1xuICAvLyBUcmltIG92ZXJkdW1wcyAobWFpbi5qcyBhbHJlYWR5IGRvZXMgdGhpcywgYnV0IHRoZXJlIGFyZSBvdGhlciBlbnRyeXBvaW50cylcbiAgY29uc3QgZXhwZWN0ZWRTaXplID1cbiAgICAgIDE2ICsgKHJvbVs2XSAmIDQgPyA1MTIgOiAwKSArIChyb21bNF0gPDwgMTQpICsgKHJvbVs1XSA8PCAxMyk7XG4gIGlmIChyb20ubGVuZ3RoID4gZXhwZWN0ZWRTaXplKSByb20gPSByb20uc2xpY2UoMCwgZXhwZWN0ZWRTaXplKTtcblxuICAvL3JvbSA9IHdhdGNoQXJyYXkocm9tLCAweDg1ZmEgKyAweDEwKTtcbiAgaWYgKEVYUEFORF9QUkcgJiYgcm9tLmxlbmd0aCA8IDB4ODAwMDApIHtcbiAgICBjb25zdCBuZXdSb20gPSBuZXcgVWludDhBcnJheShyb20ubGVuZ3RoICsgMHg0MDAwMCk7XG4gICAgbmV3Um9tLnN1YmFycmF5KDAsIDB4NDAwMTApLnNldChyb20uc3ViYXJyYXkoMCwgMHg0MDAxMCkpO1xuICAgIG5ld1JvbS5zdWJhcnJheSgweDgwMDEwKS5zZXQocm9tLnN1YmFycmF5KDB4NDAwMTApKTtcbiAgICBuZXdSb21bNF0gPDw9IDE7XG4gICAgcm9tID0gbmV3Um9tO1xuICB9XG5cbiAgZGV0ZXJtaW5pc3RpY1ByZVBhcnNlKHJvbS5zdWJhcnJheSgweDEwKSk7IC8vIFRPRE8gLSB0cmFpbmVyLi4uXG5cbiAgLy8gRmlyc3QgcmVlbmNvZGUgdGhlIHNlZWQsIG1peGluZyBpbiB0aGUgZmxhZ3MgZm9yIHNlY3VyaXR5LlxuICBpZiAodHlwZW9mIHNlZWQgIT09ICdudW1iZXInKSB0aHJvdyBuZXcgRXJyb3IoJ0JhZCBzZWVkJyk7XG4gIGNvbnN0IG5ld1NlZWQgPSBjcmMzMihzZWVkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpICsgU3RyaW5nKG9yaWdpbmFsRmxhZ3MuZmlsdGVyT3B0aW9uYWwoKSkpID4+PiAwO1xuICBjb25zdCByYW5kb20gPSBuZXcgUmFuZG9tKG5ld1NlZWQpO1xuXG4gIGNvbnN0IHNwcml0ZXMgPSBzcHJpdGVSZXBsYWNlbWVudHMgPyBzcHJpdGVSZXBsYWNlbWVudHMgOiBbXTtcbiAgY29uc3QgYXR0ZW1wdEVycm9ycyA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDU7IGkrKykgeyAvLyBmb3Igbm93LCB3ZSdsbCB0cnkgNSBhdHRlbXB0c1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgc2h1ZmZsZUludGVybmFsKHJvbSwgb3JpZ2luYWxGbGFncywgc2VlZCwgcmFuZG9tLCByZWFkZXIsIGxvZywgcHJvZ3Jlc3MsIHNwcml0ZXMpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBhdHRlbXB0RXJyb3JzLnB1c2goZXJyb3IpO1xuICAgICAgY29uc29sZS5lcnJvcihgQXR0ZW1wdCAke2kgKyAxfSBmYWlsZWQ6ICR7ZXJyb3Iuc3RhY2t9YCk7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihgU2h1ZmZsZSBmYWlsZWQ6ICR7YXR0ZW1wdEVycm9ycy5tYXAoZSA9PiBlLnN0YWNrKS5qb2luKCdcXG5cXG4nKX1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2h1ZmZsZUludGVybmFsKHJvbTogVWludDhBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsU2VlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmRvbTogUmFuZG9tLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlcjogUmVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZzoge3Nwb2lsZXI/OiBTcG9pbGVyfXx1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3M6IFByb2dyZXNzVHJhY2tlcnx1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ByaXRlUmVwbGFjZW1lbnRzOiBTcHJpdGVbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk6IFByb21pc2U8cmVhZG9ubHkgW1VpbnQ4QXJyYXksIG51bWJlcl0+ICB7XG4gIGNvbnN0IG9yaWdpbmFsRmxhZ1N0cmluZyA9IFN0cmluZyhvcmlnaW5hbEZsYWdzKTtcbiAgY29uc3QgZmxhZ3MgPSBvcmlnaW5hbEZsYWdzLmZpbHRlclJhbmRvbShyYW5kb20pO1xuICBjb25zdCBwYXJzZWQgPSBuZXcgUm9tKHJvbSk7XG4gIGNvbnN0IGFjdHVhbEZsYWdTdHJpbmcgPSBTdHJpbmcoZmxhZ3MpO1xuLy8gKHdpbmRvdyBhcyBhbnkpLmNhdmUgPSBzaHVmZmxlQ2F2ZTtcbiAgcGFyc2VkLmZsYWdzLmRlZnJhZygpO1xuICBjb21wcmVzc01hcERhdGEocGFyc2VkKTtcbiAgbW92ZVNjcmVlbnNJbnRvRXhwYW5kZWRSb20ocGFyc2VkKTtcbiAgICAgICAgICAgICAvLyBUT0RPIC0gdGhlIHNjcmVlbnMgYXJlbid0IG1vdmluZz8hP1xuICAvLyBOT1RFOiBkZWxldGUgdGhlc2UgaWYgd2Ugd2FudCBtb3JlIGZyZWUgc3BhY2UgYmFjay4uLlxuICAvLyBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy5zd2FtcCwgNCk7IC8vIG1vdmUgMTcgc2NyZWVucyB0byAkNDAwMDBcbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuaG91c2UsIDQpOyAvLyAxNSBzY3JlZW5zXG4gIC8vIHBhcnNlZC5tb3ZlU2NyZWVucyhwYXJzZWQubWV0YXRpbGVzZXRzLnRvd24sIDQpO1xuICAvLyBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy5bY2F2ZSwgcHlyYW1pZCwgZm9ydHJlc3MsIGxhYnlyaW50aCwgaWNlQ2F2ZV0sIDQpO1xuICAvLyBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy5kb2xwaGluQ2F2ZSwgNCk7XG4gIC8vIHBhcnNlZC5tb3ZlU2NyZWVucyhwYXJzZWQubWV0YXRpbGVzZXRzLmxpbWUsIDQpO1xuICAvLyBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy5zaHJpbmUsIDQpO1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0JykgKHdpbmRvdyBhcyBhbnkpLnJvbSA9IHBhcnNlZDtcbiAgcGFyc2VkLnNwb2lsZXIgPSBuZXcgU3BvaWxlcihwYXJzZWQpO1xuICBpZiAobG9nKSBsb2cuc3BvaWxlciA9IHBhcnNlZC5zcG9pbGVyO1xuICBpZiAoYWN0dWFsRmxhZ1N0cmluZyAhPT0gb3JpZ2luYWxGbGFnU3RyaW5nKSB7XG4gICAgcGFyc2VkLnNwb2lsZXIuZmxhZ3MgPSBhY3R1YWxGbGFnU3RyaW5nO1xuICB9XG5cbiAgLy8gTWFrZSBkZXRlcm1pbmlzdGljIGNoYW5nZXMuXG4gIGRldGVybWluaXN0aWMocGFyc2VkLCBmbGFncyk7XG4gIGZpeFRpbGVzZXRzKHBhcnNlZCk7XG4gIHN0YW5kYXJkTWFwRWRpdHMocGFyc2VkLCBzdGFuZGFyZE1hcEVkaXRzLmdlbmVyYXRlT3B0aW9ucyhmbGFncywgcmFuZG9tKSk7XG4gIHRvZ2dsZU1hcHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICAvLyBTZXQgdXAgc2hvcCBhbmQgdGVsZXBhdGh5XG4gIHBhcnNlZC5zY2FsaW5nTGV2ZWxzID0gNDg7XG5cbiAgaWYgKGZsYWdzLnNodWZmbGVTaG9wcygpKSBzaHVmZmxlU2hvcHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICBpZiAoZmxhZ3Muc2h1ZmZsZUdvYUZsb29ycygpKSBzaHVmZmxlR29hKHBhcnNlZCwgcmFuZG9tKTsgLy8gTk9URTogbXVzdCBiZSBiZWZvcmUgc2h1ZmZsZU1hemVzIVxuICB1cGRhdGVXYWxsU3Bhd25Gb3JtYXQocGFyc2VkKTtcbiAgcmFuZG9taXplV2FsbHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgY3J1bWJsaW5nUGxhdGZvcm1zKHBhcnNlZCwgcmFuZG9tKTtcblxuICBpZiAoZmxhZ3MubmVyZldpbGRXYXJwKCkpIHBhcnNlZC53aWxkV2FycC5sb2NhdGlvbnMuZmlsbCgwKTtcbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZVdpbGRXYXJwKCkpIHNodWZmbGVXaWxkV2FycChwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZiAoZmxhZ3MucmFuZG9taXplVGh1bmRlclRlbGVwb3J0KCkpIHJhbmRvbWl6ZVRodW5kZXJXYXJwKHBhcnNlZCwgcmFuZG9tKTtcbiAgcmVzY2FsZU1vbnN0ZXJzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHVuaWRlbnRpZmllZEl0ZW1zKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIG1pc3NwZWxsKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHNodWZmbGVUcmFkZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgaWYgKGZsYWdzLnNodWZmbGVIb3VzZXMoKSkgc2h1ZmZsZUhvdXNlcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZiAoZmxhZ3Muc2h1ZmZsZUFyZWFzKCkpIHNodWZmbGVBcmVhcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBmaXhFbnRyYW5jZVRyaWdnZXJzKHBhcnNlZCk7XG4gIGlmIChmbGFncy5yYW5kb21pemVNYXBzKCkpIHNodWZmbGVNYXplcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB3cml0ZUxvY2F0aW9uc0Zyb21NZXRhKHBhcnNlZCk7XG4gIHNodWZmbGVNb25zdGVyUG9zaXRpb25zKHBhcnNlZCwgcmFuZG9tKTtcblxuICAvLyBOT1RFOiBTaHVmZmxlIG1pbWljcyBhbmQgbW9uc3RlcnMgKmFmdGVyKiBzaHVmZmxpbmcgbWFwcywgYnV0IGJlZm9yZSBsb2dpYy5cbiAgaWYgKGZsYWdzLnNodWZmbGVNaW1pY3MoKSkgc2h1ZmZsZU1pbWljcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZiAoZmxhZ3Muc2h1ZmZsZU1vbnN0ZXJzKCkpIHNodWZmbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuXG4gIC8vIFRoaXMgd2FudHMgdG8gZ28gYXMgbGF0ZSBhcyBwb3NzaWJsZSBzaW5jZSB3ZSBuZWVkIHRvIHBpY2sgdXBcbiAgLy8gYWxsIHRoZSBub3JtYWxpemF0aW9uIGFuZCBvdGhlciBoYW5kbGluZyB0aGF0IGhhcHBlbmVkIGJlZm9yZS5cbiAgY29uc3Qgd29ybGQgPSBuZXcgV29ybGQocGFyc2VkLCBmbGFncyk7XG4gIGNvbnN0IGdyYXBoID0gbmV3IEdyYXBoKFt3b3JsZC5nZXRMb2NhdGlvbkxpc3QoKV0pO1xuICBpZiAoIWZsYWdzLm5vU2h1ZmZsZSgpKSB7XG4gICAgY29uc3QgZmlsbCA9IGF3YWl0IGdyYXBoLnNodWZmbGUoZmxhZ3MsIHJhbmRvbSwgdW5kZWZpbmVkLCBwcm9ncmVzcywgcGFyc2VkLnNwb2lsZXIpO1xuICAgIGlmIChmaWxsKSB7XG4gICAgICAvLyBjb25zdCBuID0gKGk6IG51bWJlcikgPT4ge1xuICAgICAgLy8gICBpZiAoaSA+PSAweDcwKSByZXR1cm4gJ01pbWljJztcbiAgICAgIC8vICAgY29uc3QgaXRlbSA9IHBhcnNlZC5pdGVtc1twYXJzZWQuaXRlbUdldHNbaV0uaXRlbUlkXTtcbiAgICAgIC8vICAgcmV0dXJuIGl0ZW0gPyBpdGVtLm1lc3NhZ2VOYW1lIDogYGludmFsaWQgJHtpfWA7XG4gICAgICAvLyB9O1xuICAgICAgLy8gY29uc29sZS5sb2coJ2l0ZW06IHNsb3QnKTtcbiAgICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsbC5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gICBpZiAoZmlsbC5pdGVtc1tpXSAhPSBudWxsKSB7XG4gICAgICAvLyAgICAgY29uc29sZS5sb2coYCQke2hleChpKX0gJHtuKGkpfTogJHtuKGZpbGwuaXRlbXNbaV0pfSAkJHtoZXgoZmlsbC5pdGVtc1tpXSl9YCk7XG4gICAgICAvLyAgIH1cbiAgICAgIC8vIH1cblxuICAgICAgLy8gVE9ETyAtIGZpbGwgdGhlIHNwb2lsZXIgbG9nIVxuXG4gICAgICAvL3cudHJhdmVyc2Uody5ncmFwaCwgZmlsbCk7IC8vIGZpbGwgdGhlIHNwb2lsZXIgKG1heSBhbHNvIHdhbnQgdG8ganVzdCBiZSBhIHNhbml0eSBjaGVjaz8pXG5cbiAgICAgIGZvciAoY29uc3QgW3Nsb3QsIGl0ZW1dIG9mIGZpbGwpIHtcbiAgICAgICAgcGFyc2VkLnNsb3RzW3Nsb3QgJiAweGZmXSA9IGl0ZW0gJiAweGZmO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW3JvbSwgLTFdO1xuICAgICAgLy9jb25zb2xlLmVycm9yKCdDT1VMRCBOT1QgRklMTCEnKTtcbiAgICB9XG4gIH1cbiAgLy9jb25zb2xlLmxvZygnZmlsbCcsIGZpbGwpO1xuXG4gIC8vIFRPRE8gLSBzZXQgb21pdEl0ZW1HZXREYXRhU3VmZml4IGFuZCBvbWl0TG9jYWxEaWFsb2dTdWZmaXhcbiAgLy9hd2FpdCBzaHVmZmxlRGVwZ3JhcGgocGFyc2VkLCByYW5kb20sIGxvZywgZmxhZ3MsIHByb2dyZXNzKTtcblxuICAvLyBUT0RPIC0gcmV3cml0ZSByZXNjYWxlU2hvcHMgdG8gdGFrZSBhIFJvbSBpbnN0ZWFkIG9mIGFuIGFycmF5Li4uXG4gIGlmIChmbGFncy5zaHVmZmxlU2hvcHMoKSkge1xuICAgIC8vIFRPRE8gLSBzZXBhcmF0ZSBsb2dpYyBmb3IgaGFuZGxpbmcgc2hvcHMgdy9vIFBuIHNwZWNpZmllZCAoaS5lLiB2YW5pbGxhXG4gICAgLy8gc2hvcHMgdGhhdCBtYXkgaGF2ZSBiZWVuIHJhbmRvbWl6ZWQpXG4gICAgcmVzY2FsZVNob3BzKHBhcnNlZCwgZmxhZ3MuYmFyZ2Fpbkh1bnRpbmcoKSA/IHJhbmRvbSA6IHVuZGVmaW5lZCk7XG4gIH1cblxuICAvLyBOT1RFOiBtb25zdGVyIHNodWZmbGUgbmVlZHMgdG8gZ28gYWZ0ZXIgaXRlbSBzaHVmZmxlIGJlY2F1c2Ugb2YgbWltaWNcbiAgLy8gcGxhY2VtZW50IGNvbnN0cmFpbnRzLCBidXQgaXQgd291bGQgYmUgbmljZSB0byBnbyBiZWZvcmUgaW4gb3JkZXIgdG9cbiAgLy8gZ3VhcmFudGVlIG1vbmV5LlxuICAvL2lkZW50aWZ5S2V5SXRlbXNGb3JEaWZmaWN1bHR5QnVmZnMocGFyc2VkKTtcblxuICAvLyBCdWZmIG1lZGljYWwgaGVyYiBhbmQgZnJ1aXQgb2YgcG93ZXJcbiAgaWYgKGZsYWdzLmJ1ZmZNZWRpY2FsSGVyYigpKSB7XG4gICAgcGFyc2VkLml0ZW1zLk1lZGljYWxIZXJiLnZhbHVlID0gODA7XG4gICAgcGFyc2VkLml0ZW1zLkZydWl0T2ZQb3dlci52YWx1ZSA9IDU2O1xuICB9XG5cbiAgaWYgKGZsYWdzLnN0b3J5TW9kZSgpKSBzdG9yeU1vZGUocGFyc2VkKTtcblxuICAvLyBEbyB0aGlzICphZnRlciogc2h1ZmZsaW5nIHBhbGV0dGVzXG4gIGlmIChmbGFncy5ibGFja291dE1vZGUoKSkgYmxhY2tvdXRNb2RlKHBhcnNlZCk7XG5cbiAgbWlzYyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBmaXhEaWFsb2cocGFyc2VkKTtcbiAgZml4TW92ZW1lbnRTY3JpcHRzKHBhcnNlZCk7XG4gIGNoZWNrVHJpZ2dlcnMocGFyc2VkKTtcblxuICAvLyBOT1RFOiBUaGlzIG5lZWRzIHRvIGhhcHBlbiBCRUZPUkUgcG9zdHNodWZmbGVcbiAgaWYgKGZsYWdzLmJ1ZmZEeW5hKCkpIGJ1ZmZEeW5hKHBhcnNlZCwgZmxhZ3MpOyAvLyBUT0RPIC0gY29uZGl0aW9uYWxcblxuICBpZiAoZmxhZ3MudHJhaW5lcigpKSB7XG4gICAgcGFyc2VkLndpbGRXYXJwLmxvY2F0aW9ucyA9IFtcbiAgICAgIDB4MGEsIC8vIHZhbXBpcmVcbiAgICAgIDB4MWEsIC8vIHN3YW1wL2luc2VjdFxuICAgICAgMHgzNSwgLy8gc3VtbWl0IGNhdmVcbiAgICAgIDB4NDgsIC8vIGZvZyBsYW1wXG4gICAgICAweDZkLCAvLyB2YW1waXJlIDJcbiAgICAgIDB4NmUsIC8vIHNhYmVyYSAxXG4gICAgICAweDhjLCAvLyBzaHlyb25cbiAgICAgIDB4YWEsIC8vIGJlaGluZCBrZWxiZXNxeWUgMlxuICAgICAgMHhhYywgLy8gc2FiZXJhIDJcbiAgICAgIDB4YjAsIC8vIGJlaGluZCBtYWRvIDJcbiAgICAgIDB4YjYsIC8vIGthcm1pbmVcbiAgICAgIDB4OWYsIC8vIGRyYXlnb24gMVxuICAgICAgMHhhNiwgLy8gZHJheWdvbiAyXG4gICAgICAweDU4LCAvLyB0b3dlclxuICAgICAgMHg1YywgLy8gdG93ZXIgb3V0c2lkZSBtZXNpYVxuICAgICAgMHgwMCwgLy8gbWV6YW1lXG4gICAgXTtcbiAgfVxuXG4gIGlmIChmbGFncy5yYW5kb21pemVNdXNpYygnZWFybHknKSkge1xuICAgIHNodWZmbGVNdXNpYyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB9XG4gIGlmIChmbGFncy5zaHVmZmxlVGlsZVBhbGV0dGVzKCdlYXJseScpKSB7XG4gICAgc2h1ZmZsZVBhbGV0dGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIH1cbiAgdXBkYXRlVGFibGVzUHJlQ29tbWl0KHBhcnNlZCwgZmxhZ3MpO1xuICByYW5kb20uc2h1ZmZsZShwYXJzZWQucmFuZG9tTnVtYmVycy52YWx1ZXMpO1xuXG5cbiAgLy8gYXN5bmMgZnVuY3Rpb24gYXNzZW1ibGUocGF0aDogc3RyaW5nKSB7XG4gIC8vICAgYXNtLmFzc2VtYmxlKGF3YWl0IHJlYWRlci5yZWFkKHBhdGgpLCBwYXRoLCByb20pO1xuICAvLyB9XG5cbiAgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXAgdG8gbm90IHJlLXJlYWQgdGhlIGVudGlyZSB0aGluZyB0d2ljZS5cbiAgLy8gUHJvYmFibHkganVzdCB3YW50IHRvIG1vdmUgdGhlIG9wdGlvbmFsIHBhc3NlcyBpbnRvIGEgc2VwYXJhdGVcbiAgLy8gZmlsZSB0aGF0IHJ1bnMgYWZ0ZXJ3YXJkcyBhbGwgb24gaXRzIG93bi5cblxuICBhc3luYyBmdW5jdGlvbiBhc20ocGFzczogJ2Vhcmx5JyB8ICdsYXRlJykge1xuICAgIGFzeW5jIGZ1bmN0aW9uIHRva2VuaXplcihwYXRoOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBuZXcgVG9rZW5pemVyKGF3YWl0IHJlYWRlci5yZWFkKHBhdGgpLCBwYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAge2xpbmVDb250aW51YXRpb25zOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZmxhZ0ZpbGUgPSBkZWZpbmVzKGZsYWdzLCBwYXNzKTtcbiAgICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKENwdS5QMDIpO1xuICAgIGNvbnN0IHRva3MgPSBuZXcgVG9rZW5TdHJlYW0oKTtcbiAgICB0b2tzLmVudGVyKFRva2VuU291cmNlLmNvbmNhdChcbiAgICAgICAgbmV3IFRva2VuaXplcihmbGFnRmlsZSwgJ2ZsYWdzLnMnKSxcbiAgICAgICAgYXdhaXQgdG9rZW5pemVyKCdpbml0LnMnKSxcbiAgICAgICAgYXdhaXQgdG9rZW5pemVyKCdhbGxvYy5zJyksXG4gICAgICAgIGF3YWl0IHRva2VuaXplcigncHJlc2h1ZmZsZS5zJyksXG4gICAgICAgIGF3YWl0IHRva2VuaXplcigncG9zdHBhcnNlLnMnKSxcbiAgICAgICAgYXdhaXQgdG9rZW5pemVyKCdwb3N0c2h1ZmZsZS5zJykpKTtcbiAgICBjb25zdCBwcmUgPSBuZXcgUHJlcHJvY2Vzc29yKHRva3MsIGFzbSk7XG4gICAgYXNtLnRva2VucyhwcmUpO1xuICAgIHJldHVybiBhc20ubW9kdWxlKCk7XG4gIH1cblxuLy8gICAgIGNvbnN0IGFzbSA9IG5ldyBBc3NlbWJsZXIoQ3B1LlAwMik7XG4vLyAgICAgY29uc3QgdG9rcyA9IG5ldyBUb2tlblN0cmVhbSgpO1xuLy8gICAgIHRva3MuZW50ZXIobmV3IFRva2VuaXplcihjb2RlLCBmaWxlKSk7XG4vLyAgICAgdGhpcy5wcmUgPSBuZXcgUHJlcHJvY2Vzc29yKHRva3MsIGFzbSk7XG4vLyAgICAgd2hpbGUgKHRoaXMucHJlLm5leHQoKSkge31cbi8vICAgfVxuXG4vLyAgIGFzc2VtYmxlKGNvZGU6IHN0cmluZywgZmlsZTogc3RyaW5nLCByb206IFVpbnQ4QXJyYXkpIHtcbi8vICAgICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKENwdS5QMDIpO1xuLy8gICAgIGNvbnN0IHRva3MgPSBuZXcgVG9rZW5TdHJlYW0oKTtcbi8vICAgICB0b2tzLmVudGVyKG5ldyBUb2tlbml6ZXIoY29kZSwgZmlsZSkpO1xuLy8gICAgIGNvbnN0IHByZSA9IG5ldyBQcmVwcm9jZXNzb3IodG9rcywgYXNtLCB0aGlzLnByZSk7XG4vLyAgICAgYXNtLnRva2VucyhwcmUpO1xuLy8gICAgIGNvbnN0IGxpbmsgPSBuZXcgTGlua2VyKCk7XG4vLyAgICAgbGluay5yZWFkKGFzbS5tb2R1bGUoKSk7XG4gIFxuICAvLyBjb25zdCBhc20gPSBuZXcgU2hpbUFzc2VtYmxlcihmbGFnRmlsZSwgJ2ZsYWdzLnMnKTtcbi8vY29uc29sZS5sb2coJ011bHRpcGx5MTZCaXQ6JywgYXNtLmV4cGFuZCgnTXVsdGlwbHkxNkJpdCcpLnRvU3RyaW5nKDE2KSk7XG4gIHBhcnNlZC5tZXNzYWdlcy5jb21wcmVzcygpOyAvLyBwdWxsIHRoaXMgb3V0IHRvIG1ha2Ugd3JpdGVEYXRhIGEgcHVyZSBmdW5jdGlvblxuICBjb25zdCBwcmdDb3B5ID0gcm9tLnNsaWNlKDE2KTtcblxuICBwYXJzZWQubW9kdWxlcy5zZXQoQVNNLCBhd2FpdCBhc20oJ2Vhcmx5JykpO1xuICBwYXJzZWQud3JpdGVEYXRhKHByZ0NvcHkpO1xuICBwYXJzZWQubW9kdWxlcy5zZXQoQVNNLCBhd2FpdCBhc20oJ2xhdGUnKSk7XG5cbiAgY29uc3QgaGFzR3JhcGhpY3MgPSBzcHJpdGVSZXBsYWNlbWVudHM/LnNvbWUoKHNwcikgPT4gc3ByLmlzQ3VzdG9tKCkpIHx8IGZhbHNlO1xuXG4gIGNvbnN0IGNyYyA9IHN0YW1wVmVyc2lvblNlZWRBbmRIYXNoKHJvbSwgb3JpZ2luYWxTZWVkLCBvcmlnaW5hbEZsYWdTdHJpbmcsIHByZ0NvcHksIGhhc0dyYXBoaWNzKTtcblxuXG4gIC8vIERvIG9wdGlvbmFsIHJhbmRvbWl6YXRpb24gbm93Li4uXG4gIGlmIChmbGFncy5yYW5kb21pemVNdXNpYygnbGF0ZScpKSB7XG4gICAgc2h1ZmZsZU11c2ljKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIH1cbiAgaWYgKGZsYWdzLm5vTXVzaWMoJ2xhdGUnKSkge1xuICAgIG5vTXVzaWMocGFyc2VkKTtcbiAgfVxuICBpZiAoZmxhZ3Muc2h1ZmZsZVRpbGVQYWxldHRlcygnbGF0ZScpKSB7XG4gICAgc2h1ZmZsZVBhbGV0dGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIH1cblxuICAvLyBEbyB0aGlzIHZlcnkgbGF0ZSwgc2luY2UgaXQncyBsb3ctbGV2ZWwgb24gdGhlIGxvY2F0aW9ucy4gIE5lZWQgdG8gd2FpdFxuICAvLyB1bnRpbCBhZnRlciB0aGUgbWV0YWxvY2F0aW9ucyBoYXZlIGJlZW4gd3JpdHRlbiBiYWNrIHRvIHRoZSBsb2NhdGlvbnMuXG4gIGZpeFNraXBwYWJsZUV4aXRzKHBhcnNlZCk7XG5cbiAgcGFyc2VkLndyaXRlRGF0YSgpO1xuXG4gIC8vIFRPRE8gLSBvcHRpb25hbCBmbGFncyBjYW4gcG9zc2libHkgZ28gaGVyZSwgYnV0IE1VU1QgTk9UIHVzZSBwYXJzZWQucHJnIVxuICBwYXRjaEdyYXBoaWNzKHJvbSwgc3ByaXRlUmVwbGFjZW1lbnRzKTtcbiAgaWYgKEVYUEFORF9QUkcpIHtcbiAgICBjb25zdCBwcmcgPSByb20uc3ViYXJyYXkoMHgxMCk7XG4gICAgcHJnLnN1YmFycmF5KDB4N2MwMDAsIDB4ODAwMDApLnNldChwcmcuc3ViYXJyYXkoMHgzYzAwMCwgMHg0MDAwMCkpO1xuICB9XG4gIHJldHVybiBbcm9tLCBjcmNdO1xufVxuXG5mdW5jdGlvbiBtaXNjKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pIHtcbi8vIFRPRE8gLSByZW1vdmUgaGFjayB0byB2aXN1YWxpemUgbWFwcyBmcm9tIHRoZSBjb25zb2xlLi4uXG4vLyAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHJvbS5sb2NhdGlvbnNbMF0pIGFzIGFueSkuc2hvdyA9IGZ1bmN0aW9uKHRzOiB0eXBlb2Ygcm9tLm1ldGF0aWxlc2V0cy5yaXZlcikge1xuLy8gICBjb25zb2xlLmxvZyhNYXplLmZyb20odGhpcywgcmFuZG9tLCB0cykuc2hvdygpKTtcbi8vIH07XG5cbiAgY29uc3Qge30gPSB7cm9tLCBmbGFncywgcmFuZG9tfSBhcyBhbnk7XG4gIC8vIE5PVEU6IHdlIHN0aWxsIG5lZWQgdG8gZG8gc29tZSB3b3JrIGFjdHVhbGx5IGFkanVzdGluZ1xuICAvLyBtZXNzYWdlIHRleHRzIHRvIHByZXZlbnQgbGluZSBvdmVyZmxvdywgZXRjLiAgV2Ugc2hvdWxkXG4gIC8vIGFsc28gbWFrZSBzb21lIGhvb2tzIHRvIGVhc2lseSBzd2FwIG91dCBpdGVtcyB3aGVyZSBpdFxuICAvLyBtYWtlcyBzZW5zZS5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzJdWzJdLnRleHQgPSBgXG57MDE6QWthaGFuYX0gaXMgaGFuZGVkIGEgc3RhdHVlLiNcblRoYW5rcyBmb3IgZmluZGluZyB0aGF0LlxuSSB3YXMgdG90YWxseSBnb25uYSBzZWxsXG5pdCBmb3IgdG9ucyBvZiBjYXNoLiNcbkhlcmUsIGhhdmUgdGhpcyBsYW1lXG5bMjk6R2FzIE1hc2tdIG9yIHNvbWV0aGluZy5gO1xuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBhZGQgc29tZSBtb3JlIChoaWdoZXIgbGV2ZWwpIG1hcmt1cCxcbiAgLy8gZS5nLiBgJHtkZXNjcmliZUl0ZW0oc2xvdE51bSl9YC4gIFdlIGNvdWxkIGFsc28gYWRkIG1hcmt1cFxuICAvLyBmb3IgZS5nLiBgJHtzYXlXYW50KHNsb3ROdW0pfWAgYW5kIGAke3NheVRoYW5rcyhzbG90TnVtKX1gXG4gIC8vIGlmIHdlIHNodWZmbGUgdGhlIHdhbnRlZCBpdGVtcy4gIFRoZXNlIGNvdWxkIGJlIHJhbmRvbWl6ZWRcbiAgLy8gaW4gdmFyaW91cyB3YXlzLCBhcyB3ZWxsIGFzIGhhdmluZyBzb21lIGFkZGl0aW9uYWwgYml0cyBsaWtlXG4gIC8vIHdhbnRBdXhpbGlhcnkoLi4uKSBmb3IgZS5nLiBcInRoZSBraXJpc2EgcGxhbnQgaXMgLi4uXCIgLSB0aGVuXG4gIC8vIGl0IGNvdWxkIGluc3RlYWQgc2F5IFwidGhlIHN0YXR1ZSBvZiBvbnl4IGlzIC4uLlwiLlxuICByb20ubWVzc2FnZXMucGFydHNbMF1bMHhlXS50ZXh0ID0gYEl0J3MgZGFuZ2Vyb3VzIHRvIGdvIGFsb25lISBUYWtlIHRoaXMuYDtcbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzBdWzB4ZV0uZml4VGV4dCgpO1xufTtcblxuZnVuY3Rpb24gc2h1ZmZsZVNob3BzKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGNvbnN0IHNob3BzOiB7W3R5cGU6IG51bWJlcl06IHtjb250ZW50czogbnVtYmVyW10sIHNob3BzOiBTaG9wW119fSA9IHtcbiAgICBbU2hvcFR5cGUuQVJNT1JdOiB7Y29udGVudHM6IFtdLCBzaG9wczogW119LFxuICAgIFtTaG9wVHlwZS5UT09MXToge2NvbnRlbnRzOiBbXSwgc2hvcHM6IFtdfSxcbiAgfTtcbiAgLy8gUmVhZCBhbGwgdGhlIGNvbnRlbnRzLlxuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKCFzaG9wLnVzZWQgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmZikgY29udGludWU7XG4gICAgY29uc3QgZGF0YSA9IHNob3BzW3Nob3AudHlwZV07XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIGRhdGEuY29udGVudHMucHVzaCguLi5zaG9wLmNvbnRlbnRzLmZpbHRlcih4ID0+IHggIT09IDB4ZmYpKTtcbiAgICAgIGRhdGEuc2hvcHMucHVzaChzaG9wKTtcbiAgICAgIHNob3AuY29udGVudHMgPSBbXTtcbiAgICB9XG4gIH1cbiAgLy8gU2h1ZmZsZSB0aGUgY29udGVudHMuICBQaWNrIG9yZGVyIHRvIGRyb3AgaXRlbXMgaW4uXG4gIGZvciAoY29uc3QgZGF0YSBvZiBPYmplY3QudmFsdWVzKHNob3BzKSkge1xuICAgIGxldCBzbG90czogU2hvcFtdIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgaXRlbXMgPSBbLi4uZGF0YS5jb250ZW50c107XG4gICAgcmFuZG9tLnNodWZmbGUoaXRlbXMpO1xuICAgIHdoaWxlIChpdGVtcy5sZW5ndGgpIHtcbiAgICAgIGlmICghc2xvdHMgfHwgIXNsb3RzLmxlbmd0aCkge1xuICAgICAgICBpZiAoc2xvdHMpIGl0ZW1zLnNoaWZ0KCk7XG4gICAgICAgIHNsb3RzID0gWy4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHNdO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShzbG90cyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpdGVtID0gaXRlbXNbMF07XG4gICAgICBjb25zdCBzaG9wID0gc2xvdHNbMF07XG4gICAgICBpZiAoc2hvcC5jb250ZW50cy5sZW5ndGggPCA0ICYmICFzaG9wLmNvbnRlbnRzLmluY2x1ZGVzKGl0ZW0pKSB7XG4gICAgICAgIHNob3AuY29udGVudHMucHVzaChpdGVtKTtcbiAgICAgICAgaXRlbXMuc2hpZnQoKTtcbiAgICAgIH1cbiAgICAgIHNsb3RzLnNoaWZ0KCk7XG4gICAgfVxuICB9XG4gIC8vIFNvcnQgYW5kIGFkZCAweGZmJ3NcbiAgZm9yIChjb25zdCBkYXRhIG9mIE9iamVjdC52YWx1ZXMoc2hvcHMpKSB7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIGRhdGEuc2hvcHMpIHtcbiAgICAgIHdoaWxlIChzaG9wLmNvbnRlbnRzLmxlbmd0aCA8IDQpIHNob3AuY29udGVudHMucHVzaCgweGZmKTtcbiAgICAgIHNob3AuY29udGVudHMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFdlIHJlYXJyYW5nZSBob3cgd2FsbHMgc3Bhd24gdG8gc3VwcG9ydCBjdXN0b20gc2hvb3Rpbmcgd2FsbHMsXG4gKiBhbW9uZyBvdGhlciB0aGluZ3MuICBUaGUgc2lnbmFsIHRvIHRoZSBnYW1lIChhbmQgbGF0ZXIgcGFzc2VzKVxuICogdGhhdCB3ZSd2ZSBtYWRlIHRoaXMgY2hhbmdlIGlzIHRvIHNldCB0aGUgMHgyMCBiaXQgb24gdGhlIDNyZFxuICogc3Bhd24gYnl0ZSAoaS5lLiB0aGUgc3Bhd24gdHlwZSkuXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVdhbGxTcGF3bkZvcm1hdChyb206IFJvbSkge1xuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgY29uc3QgZWxlbSA9IHNwYXduLmlkICYgMHhmO1xuICAgICAgICBzcGF3bi5pZCA9IGVsZW0gfCAoZWxlbSA8PCA0KTtcbiAgICAgICAgY29uc3Qgc2hvb3RpbmcgPSBzcGF3bi5pc1Nob290aW5nV2FsbChsb2NhdGlvbik7XG4gICAgICAgIHNwYXduLmRhdGFbMl0gPSBzaG9vdGluZyA/IDB4MzMgOiAweDIzO1xuICAgICAgICAvLyBjb25zdCBpcm9uID0gc3Bhd24uaXNJcm9uV2FsbCgpO1xuICAgICAgICAvLyBzcGF3bi5kYXRhWzJdID0gMHgyMyB8IChzaG9vdGluZyA/IDB4MTAgOiAwKSB8IChpcm9uID8gMHg0MCA6IDApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByYW5kb21pemVXYWxscyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIC8vIE5PVEU6IFdlIGNhbiBtYWtlIGFueSB3YWxsIHNob290IGJ5IHNldHRpbmcgaXRzICQxMCBiaXQgb24gdGhlIHR5cGUgYnl0ZS5cbiAgLy8gQnV0IHRoaXMgYWxzbyByZXF1aXJlcyBtYXRjaGluZyBwYXR0ZXJuIHRhYmxlcywgc28gd2UnbGwgbGVhdmUgdGhhdCBhbG9uZVxuICAvLyBmb3Igbm93IHRvIGF2b2lkIGdyb3NzIGdyYXBoaWNzLlxuXG4gIC8vIEFsbCBvdGhlciB3YWxscyB3aWxsIG5lZWQgdGhlaXIgdHlwZSBtb3ZlZCBpbnRvIHRoZSB1cHBlciBuaWJibGUgYW5kIHRoZW5cbiAgLy8gdGhlIG5ldyBlbGVtZW50IGdvZXMgaW4gdGhlIGxvd2VyIG5pYmJsZS4gIFNpbmNlIHRoZXJlIGFyZSBzbyBmZXcgaXJvblxuICAvLyB3YWxscywgd2Ugd2lsbCBnaXZlIHRoZW0gYXJiaXRyYXJ5IGVsZW1lbnRzIGluZGVwZW5kZW50IG9mIHRoZSBwYWxldHRlLlxuICAvLyBSb2NrL2ljZSB3YWxscyBjYW4gYWxzbyBoYXZlIGFueSBlbGVtZW50LCBidXQgdGhlIHRoaXJkIHBhbGV0dGUgd2lsbFxuICAvLyBpbmRpY2F0ZSB3aGF0IHRoZXkgZXhwZWN0LlxuXG4gIGlmICghZmxhZ3MucmFuZG9taXplV2FsbHMoKSkgcmV0dXJuO1xuICAvLyBCYXNpYyBwbGFuOiBwYXJ0aXRpb24gYmFzZWQgb24gcGFsZXR0ZSwgbG9vayBmb3Igd2FsbHMuXG4gIGNvbnN0IHBhbHMgPSBbXG4gICAgWzB4MDUsIDB4MzhdLCAvLyByb2NrIHdhbGwgcGFsZXR0ZXNcbiAgICBbMHgxMV0sIC8vIGljZSB3YWxsIHBhbGV0dGVzXG4gICAgWzB4NmFdLCAvLyBcImVtYmVyIHdhbGxcIiBwYWxldHRlc1xuICAgIFsweDE0XSwgLy8gXCJpcm9uIHdhbGxcIiBwYWxldHRlc1xuICBdO1xuXG4gIGZ1bmN0aW9uIHdhbGxUeXBlKHNwYXduOiBTcGF3bik6IG51bWJlciB7XG4gICAgaWYgKHNwYXduLmRhdGFbMl0gJiAweDIwKSB7XG4gICAgICByZXR1cm4gKHNwYXduLmlkID4+PiA0KSAmIDM7XG4gICAgfVxuICAgIHJldHVybiBzcGF3bi5pZCAmIDM7XG4gIH1cblxuICBjb25zdCBwYXJ0aXRpb24gPSBuZXcgRGVmYXVsdE1hcDxBcmVhLCBMb2NhdGlvbltdPigoKSA9PiBbXSk7XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIHBhcnRpdGlvbi5nZXQobG9jYXRpb24uZGF0YS5hcmVhKS5wdXNoKGxvY2F0aW9uKTtcbiAgfVxuICBmb3IgKGNvbnN0IGxvY2F0aW9ucyBvZiBwYXJ0aXRpb24udmFsdWVzKCkpIHtcbiAgICAvLyBwaWNrIGEgcmFuZG9tIHdhbGwgdHlwZS5cbiAgICBjb25zdCBlbHQgPSByYW5kb20ubmV4dEludCg0KTtcbiAgICBjb25zdCBwYWwgPSByYW5kb20ucGljayhwYWxzW2VsdF0pO1xuICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgICBjb25zdCB0eXBlID0gd2FsbFR5cGUoc3Bhd24pO1xuICAgICAgICAgIGlmICh0eXBlID09PSAyKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gMykge1xuICAgICAgICAgICAgY29uc3QgbmV3RWx0ID0gcmFuZG9tLm5leHRJbnQoNCk7XG4gICAgICAgICAgICBpZiAocm9tLnNwb2lsZXIpIHJvbS5zcG9pbGVyLmFkZFdhbGwobG9jYXRpb24ubmFtZSwgdHlwZSwgbmV3RWx0KTtcbiAgICAgICAgICAgIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICAgICAgICAgIHNwYXduLmlkID0gMHgzMCB8IG5ld0VsdDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYCR7bG9jYXRpb24ubmFtZX0gJHt0eXBlfSA9PiAke2VsdH1gKTtcbiAgICAgICAgICAgIGlmICghZm91bmQgJiYgcm9tLnNwb2lsZXIpIHtcbiAgICAgICAgICAgICAgcm9tLnNwb2lsZXIuYWRkV2FsbChsb2NhdGlvbi5uYW1lLCB0eXBlLCBlbHQpO1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgICAgICAgICBzcGF3bi5pZCA9IHR5cGUgPDwgNCB8IGVsdDtcbiAgICAgICAgICAgIGxvY2F0aW9uLnRpbGVQYWxldHRlc1syXSA9IHBhbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9NdXNpYyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG0gb2YgWy4uLnJvbS5sb2NhdGlvbnMsIC4uLnJvbS5ib3NzZXMubXVzaWNzXSkge1xuICAgIG0uYmdtID0gMDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaHVmZmxlTXVzaWMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBpbnRlcmZhY2UgSGFzTXVzaWMgeyBiZ206IG51bWJlcjsgfVxuICBjb25zdCBtdXNpY3MgPSBuZXcgRGVmYXVsdE1hcDx1bmtub3duLCBIYXNNdXNpY1tdPigoKSA9PiBbXSk7XG4gIGNvbnN0IGFsbCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICBmb3IgKGNvbnN0IGwgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmIChsLmlkID09PSAweDVmIHx8IGwuaWQgPT09IDAgfHwgIWwudXNlZCkgY29udGludWU7IC8vIHNraXAgc3RhcnQgYW5kIGR5bmFcbiAgICBjb25zdCBtdXNpYyA9IGwubXVzaWNHcm91cDtcbiAgICBhbGwuYWRkKGwuYmdtKTtcbiAgICBtdXNpY3MuZ2V0KG11c2ljKS5wdXNoKGwpO1xuICB9XG4gIGZvciAoY29uc3QgYiBvZiByb20uYm9zc2VzLm11c2ljcykge1xuICAgIG11c2ljcy5zZXQoYiwgW2JdKTtcbiAgICBhbGwuYWRkKGIuYmdtKTtcbiAgfVxuICBjb25zdCBsaXN0ID0gWy4uLmFsbF07XG4gIGNvbnN0IHVwZGF0ZWQgPSBuZXcgU2V0PEhhc011c2ljPigpO1xuICBmb3IgKGNvbnN0IHBhcnRpdGlvbiBvZiBtdXNpY3MudmFsdWVzKCkpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHJhbmRvbS5waWNrKGxpc3QpO1xuICAgIGZvciAoY29uc3QgbXVzaWMgb2YgcGFydGl0aW9uKSB7XG4gICAgICBtdXNpYy5iZ20gPSB2YWx1ZTtcbiAgICAgIHVwZGF0ZWQuYWRkKG11c2ljKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2h1ZmZsZVdpbGRXYXJwKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGNvbnN0IGxvY2F0aW9uczogTG9jYXRpb25bXSA9IFtdO1xuICBmb3IgKGNvbnN0IGwgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmIChsICYmIGwudXNlZCAmJlxuICAgICAgICAvLyBkb24ndCBhZGQgbWV6YW1lIGJlY2F1c2Ugd2UgYWxyZWFkeSBhZGQgaXQgYWx3YXlzXG4gICAgICAgIGwuaWQgJiZcbiAgICAgICAgLy8gZG9uJ3Qgd2FycCBpbnRvIHNob3BzXG4gICAgICAgICFsLmlzU2hvcCgpICYmXG4gICAgICAgIC8vIGRvbid0IHdhcnAgaW50byB0b3dlclxuICAgICAgICAobC5pZCAmIDB4ZjgpICE9PSAweDU4ICYmXG4gICAgICAgIC8vIGRvbid0IHdhcnAgdG8gZWl0aGVyIHNpZGUgb2YgRHJheWdvbiAyXG4gICAgICAgIGwgIT09IHJvbS5sb2NhdGlvbnMuQ3J5cHRfRHJheWdvbjIgJiZcbiAgICAgICAgbCAhPT0gcm9tLmxvY2F0aW9ucy5DcnlwdF9UZWxlcG9ydGVyICYmXG4gICAgICAgIC8vIGRvbid0IHdhcnAgaW50byBtZXNpYSBzaHJpbmUgYmVjYXVzZSBvZiBxdWVlbiBsb2dpY1xuICAgICAgICAvLyAoYW5kIGJlY2F1c2UgaXQncyBhbm5veWluZylcbiAgICAgICAgbCAhPT0gcm9tLmxvY2F0aW9ucy5NZXNpYVNocmluZSAmJlxuICAgICAgICAvLyBkb24ndCB3YXJwIGludG8gcmFnZSBiZWNhdXNlIGl0J3MganVzdCBhbm5veWluZ1xuICAgICAgICBsICE9PSByb20ubG9jYXRpb25zLkxpbWVUcmVlTGFrZSkge1xuICAgICAgbG9jYXRpb25zLnB1c2gobCk7XG4gICAgfVxuICB9XG4gIHJhbmRvbS5zaHVmZmxlKGxvY2F0aW9ucyk7XG4gIHJvbS53aWxkV2FycC5sb2NhdGlvbnMgPSBbXTtcbiAgZm9yIChjb25zdCBsb2Mgb2YgWy4uLmxvY2F0aW9ucy5zbGljZSgwLCAxNSkuc29ydCgoYSwgYikgPT4gYS5pZCAtIGIuaWQpXSkge1xuICAgIHJvbS53aWxkV2FycC5sb2NhdGlvbnMucHVzaChsb2MuaWQpO1xuICAgIGlmIChyb20uc3BvaWxlcikgcm9tLnNwb2lsZXIuYWRkV2lsZFdhcnAobG9jLmlkLCBsb2MubmFtZSk7XG4gIH1cbiAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucy5wdXNoKDApO1xufVxuXG5mdW5jdGlvbiBidWZmRHluYShyb206IFJvbSwgX2ZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIHJvbS5vYmplY3RzWzB4YjhdLmNvbGxpc2lvblBsYW5lID0gMTtcbiAgcm9tLm9iamVjdHNbMHhiOF0uaW1tb2JpbGUgPSB0cnVlO1xuICByb20ub2JqZWN0c1sweGI5XS5jb2xsaXNpb25QbGFuZSA9IDE7XG4gIHJvbS5vYmplY3RzWzB4YjldLmltbW9iaWxlID0gdHJ1ZTtcbiAgcm9tLm9iamVjdHNbMHgzM10uY29sbGlzaW9uUGxhbmUgPSAyO1xuICByb20uYWRIb2NTcGF3bnNbMHgyOF0uc2xvdFJhbmdlTG93ZXIgPSAweDFjOyAvLyBjb3VudGVyXG4gIHJvbS5hZEhvY1NwYXduc1sweDI5XS5zbG90UmFuZ2VVcHBlciA9IDB4MWM7IC8vIGxhc2VyXG4gIHJvbS5hZEhvY1NwYXduc1sweDJhXS5zbG90UmFuZ2VVcHBlciA9IDB4MWM7IC8vIGJ1YmJsZVxufVxuXG5mdW5jdGlvbiBibGFja291dE1vZGUocm9tOiBSb20pIHtcbiAgY29uc3QgZGcgPSBnZW5lcmF0ZURlcGdyYXBoKCk7XG4gIGZvciAoY29uc3Qgbm9kZSBvZiBkZy5ub2Rlcykge1xuICAgIGNvbnN0IHR5cGUgPSAobm9kZSBhcyBhbnkpLnR5cGU7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09ICdMb2NhdGlvbicgJiYgKHR5cGUgPT09ICdjYXZlJyB8fCB0eXBlID09PSAnZm9ydHJlc3MnKSkge1xuICAgICAgcm9tLmxvY2F0aW9uc1sobm9kZSBhcyBhbnkpLmlkXS50aWxlUGFsZXR0ZXMuZmlsbCgweDlhKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3Qgc3RvcnlNb2RlID0gKHJvbTogUm9tKSA9PiB7XG4gIC8vIHNodWZmbGUgaGFzIGFscmVhZHkgaGFwcGVuZWQsIG5lZWQgdG8gdXNlIHNodWZmbGVkIGZsYWdzIGZyb21cbiAgLy8gTlBDIHNwYXduIGNvbmRpdGlvbnMuLi5cbiAgY29uc3QgY29uZGl0aW9ucyA9IFtcbiAgICAvLyBOb3RlOiBpZiBib3NzZXMgYXJlIHNodWZmbGVkIHdlJ2xsIG5lZWQgdG8gZGV0ZWN0IHRoaXMuLi5cbiAgICByb20uZmxhZ3MuS2VsYmVzcXVlMS5pZCxcbiAgICByb20uZmxhZ3MuU2FiZXJhMS5pZCxcbiAgICByb20uZmxhZ3MuTWFkbzEuaWQsXG4gICAgcm9tLmZsYWdzLktlbGJlc3F1ZTIuaWQsXG4gICAgcm9tLmZsYWdzLlNhYmVyYTIuaWQsXG4gICAgcm9tLmZsYWdzLk1hZG8yLmlkLFxuICAgIHJvbS5mbGFncy5LYXJtaW5lLmlkLFxuICAgIHJvbS5mbGFncy5EcmF5Z29uMS5pZCxcbiAgICByb20uZmxhZ3MuU3dvcmRPZldpbmQuaWQsXG4gICAgcm9tLmZsYWdzLlN3b3JkT2ZGaXJlLmlkLFxuICAgIHJvbS5mbGFncy5Td29yZE9mV2F0ZXIuaWQsXG4gICAgcm9tLmZsYWdzLlN3b3JkT2ZUaHVuZGVyLmlkLFxuICAgIC8vIFRPRE8gLSBzdGF0dWVzIG9mIG1vb24gYW5kIHN1biBtYXkgYmUgcmVsZXZhbnQgaWYgZW50cmFuY2Ugc2h1ZmZsZT9cbiAgICAvLyBUT0RPIC0gdmFtcGlyZXMgYW5kIGluc2VjdD9cbiAgXTtcbiAgcm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLmdldCgweGE2KSEucHVzaCguLi5jb25kaXRpb25zKTtcbn07XG5cbi8vIFN0YW1wIHRoZSBST01cbmV4cG9ydCBmdW5jdGlvbiBzdGFtcFZlcnNpb25TZWVkQW5kSGFzaChyb206IFVpbnQ4QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdTdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlYXJseTogVWludDhBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNHcmFwaGljczogYm9vbGVhbik6IG51bWJlciB7XG4gIC8vIFVzZSB1cCB0byAyNiBieXRlcyBzdGFydGluZyBhdCBQUkcgJDI1ZWE4XG4gIC8vIFdvdWxkIGJlIG5pY2UgdG8gc3RvcmUgKDEpIGNvbW1pdCwgKDIpIGZsYWdzLCAoMykgc2VlZCwgKDQpIGhhc2hcbiAgLy8gV2UgY2FuIHVzZSBiYXNlNjQgZW5jb2RpbmcgdG8gaGVscCBzb21lLi4uXG4gIC8vIEZvciBub3cganVzdCBzdGljayBpbiB0aGUgY29tbWl0IGFuZCBzZWVkIGluIHNpbXBsZSBoZXhcbiAgY29uc3QgY3JjID0gY3JjMzIoZWFybHkpO1xuICBjb25zdCBjcmNTdHJpbmcgPSBjcmMudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgaGFzaCA9IHZlcnNpb24uU1RBVFVTID09PSAndW5zdGFibGUnID9cbiAgICAgIHZlcnNpb24uSEFTSC5zdWJzdHJpbmcoMCwgNykucGFkU3RhcnQoNywgJzAnKS50b1VwcGVyQ2FzZSgpICsgJyAgICAgJyA6XG4gICAgICB2ZXJzaW9uLlZFUlNJT04uc3Vic3RyaW5nKDAsIDEyKS5wYWRFbmQoMTIsICcgJyk7XG4gIGNvbnN0IHNlZWRTdHIgPSBzZWVkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IGVtYmVkID0gKGFkZHI6IG51bWJlciwgLi4udmFsdWVzOiAoc3RyaW5nfG51bWJlcilbXSkgPT4ge1xuICAgIGFkZHIgKz0gMHgxMDtcbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgZm9yIChjb25zdCBjIG9mIHZhbHVlKSB7XG4gICAgICAgICAgcm9tW2FkZHIrK10gPSBjLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByb21bYWRkcisrXSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCYWQgdmFsdWU6ICR7dmFsdWV9YCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBjb25zdCBpbnRlcmNhbGF0ZSA9IChzMTogc3RyaW5nLCBzMjogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBvdXQgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHMxLmxlbmd0aCB8fCBpIDwgczIubGVuZ3RoOyBpKyspIHtcbiAgICAgIG91dC5wdXNoKHMxW2ldIHx8ICcgJyk7XG4gICAgICBvdXQucHVzaChzMltpXSB8fCAnICcpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oJycpO1xuICB9O1xuXG4gIGVtYmVkKDB4Mjc3Y2YsIGludGVyY2FsYXRlKCcgIFZFUlNJT04gICAgIFNFRUQgICAgICAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgICAke2hhc2h9JHtzZWVkU3RyfWApKTtcblxuICAvLyBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiAzNikgZmxhZ1N0cmluZyA9IGZsYWdTdHJpbmcucmVwbGFjZSgvIC9nLCAnJyk7XG4gIGxldCBleHRyYUZsYWdzO1xuICBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiA0Nikge1xuICAgIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA+IDkyKSB0aHJvdyBuZXcgRXJyb3IoJ0ZsYWcgc3RyaW5nIHdheSB0b28gbG9uZyEnKTtcbiAgICBleHRyYUZsYWdzID0gZmxhZ1N0cmluZy5zdWJzdHJpbmcoNDYsIDkyKS5wYWRFbmQoNDYsICcgJyk7XG4gICAgZmxhZ1N0cmluZyA9IGZsYWdTdHJpbmcuc3Vic3RyaW5nKDAsIDQ2KTtcbiAgfVxuICAvLyBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPD0gMzYpIHtcbiAgLy8gICAvLyBhdHRlbXB0IHRvIGJyZWFrIGl0IG1vcmUgZmF2b3JhYmx5XG5cbiAgLy8gfVxuICAvLyAgIGZsYWdTdHJpbmcgPSBbJ0ZMQUdTICcsXG4gIC8vICAgICAgICAgICAgICAgICBmbGFnU3RyaW5nLnN1YnN0cmluZygwLCAxOCkucGFkRW5kKDE4LCAnICcpLFxuICAvLyAgICAgICAgICAgICAgICAgJyAgICAgICcsXG5cbiAgLy8gfVxuXG4gIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnBhZEVuZCg0NiwgJyAnKTtcblxuICBlbWJlZCgweDI3N2ZmLCBpbnRlcmNhbGF0ZShmbGFnU3RyaW5nLnN1YnN0cmluZygwLCAyMyksIGZsYWdTdHJpbmcuc3Vic3RyaW5nKDIzKSkpO1xuICBpZiAoZXh0cmFGbGFncykge1xuICAgIGVtYmVkKDB4Mjc4MmYsIGludGVyY2FsYXRlKGV4dHJhRmxhZ3Muc3Vic3RyaW5nKDAsIDIzKSwgZXh0cmFGbGFncy5zdWJzdHJpbmcoMjMpKSk7XG4gIH1cbiAgaWYgKGhhc0dyYXBoaWNzKSB7XG4gICAgLy8gN2UgaXMgdGhlIFNQIGNoYXIgZGVub3RpbmcgYSBTcHJpdGUgUGFjayB3YXMgYXBwbGllZFxuICAgIGVtYmVkKDB4Mjc4ODMsIDB4N2UpO1xuICB9XG4gIGVtYmVkKDB4Mjc4ODUsIGludGVyY2FsYXRlKGNyY1N0cmluZy5zdWJzdHJpbmcoMCwgNCksIGNyY1N0cmluZy5zdWJzdHJpbmcoNCkpKTtcblxuICAvLyBlbWJlZCgweDI1ZWE4LCBgdi4ke2hhc2h9ICAgJHtzZWVkfWApO1xuICBlbWJlZCgweDI1NzE2LCAnUkFORE9NSVpFUicpO1xuICBpZiAodmVyc2lvbi5TVEFUVVMgPT09ICd1bnN0YWJsZScpIGVtYmVkKDB4MjU3M2MsICdCRVRBJyk7XG4gIC8vIE5PVEU6IGl0IHdvdWxkIGJlIHBvc3NpYmxlIHRvIGFkZCB0aGUgaGFzaC9zZWVkL2V0YyB0byB0aGUgdGl0bGVcbiAgLy8gcGFnZSBhcyB3ZWxsLCBidXQgd2UnZCBuZWVkIHRvIHJlcGxhY2UgdGhlIHVudXNlZCBsZXR0ZXJzIGluIGJhbmtcbiAgLy8gJDFkIHdpdGggdGhlIG1pc3NpbmcgbnVtYmVycyAoSiwgUSwgVywgWCksIGFzIHdlbGwgYXMgdGhlIHR3b1xuICAvLyB3ZWlyZCBzcXVhcmVzIGF0ICQ1YiBhbmQgJDVjIHRoYXQgZG9uJ3QgYXBwZWFyIHRvIGJlIHVzZWQuICBUb2dldGhlclxuICAvLyB3aXRoIHVzaW5nIHRoZSBsZXR0ZXIgJ08nIGFzIDAsIHRoYXQncyBzdWZmaWNpZW50IHRvIGNyYW0gaW4gYWxsIHRoZVxuICAvLyBudW1iZXJzIGFuZCBkaXNwbGF5IGFyYml0cmFyeSBoZXggZGlnaXRzLlxuXG4gIHJldHVybiBjcmM7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRhYmxlc1ByZUNvbW1pdChyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgLy8gQ2hhbmdlIHNvbWUgZW5lbXkgc2NhbGluZyBmcm9tIHRoZSBkZWZhdWx0LCBpZiBmbGFncyBhc2sgZm9yIGl0LlxuICBpZiAoZmxhZ3MuZGVjcmVhc2VFbmVteURhbWFnZSgpKSB7XG4gICAgcm9tLnNjYWxpbmcuc2V0UGhwRm9ybXVsYShzID0+IDE2ICsgNiAqIHMpO1xuICB9XG4gIHJvbS5zY2FsaW5nLnNldEV4cFNjYWxpbmdGYWN0b3IoZmxhZ3MuZXhwU2NhbGluZ0ZhY3RvcigpKTtcblxuICAvLyBVcGRhdGUgdGhlIGNvaW4gZHJvcCBidWNrZXRzIChnb2VzIHdpdGggZW5lbXkgc3RhdCByZWNvbXB1dGF0aW9uc1xuICAvLyBpbiBwb3N0c2h1ZmZsZS5zKVxuICBpZiAoZmxhZ3MuZGlzYWJsZVNob3BHbGl0Y2goKSkge1xuICAgIC8vIGJpZ2dlciBnb2xkIGRyb3BzIGlmIG5vIHNob3AgZ2xpdGNoLCBwYXJ0aWN1bGFybHkgYXQgdGhlIHN0YXJ0XG4gICAgLy8gLSBzdGFydHMgb3V0IGZpYm9uYWNjaSwgdGhlbiBnb2VzIGxpbmVhciBhdCA2MDBcbiAgICByb20uY29pbkRyb3BzLnZhbHVlcyA9IFtcbiAgICAgICAgMCwgICA1LCAgMTAsICAxNSwgIDI1LCAgNDAsICA2NSwgIDEwNSxcbiAgICAgIDE3MCwgMjc1LCA0NDUsIDYwMCwgNzAwLCA4MDAsIDkwMCwgMTAwMCxcbiAgICBdO1xuICB9IGVsc2Uge1xuICAgIC8vIHRoaXMgdGFibGUgaXMgYmFzaWNhbGx5IG1lYW5pbmdsZXNzIGIvYyBzaG9wIGdsaXRjaFxuICAgIHJvbS5jb2luRHJvcHMudmFsdWVzID0gW1xuICAgICAgICAwLCAgIDEsICAgMiwgICA0LCAgIDgsICAxNiwgIDMwLCAgNTAsXG4gICAgICAxMDAsIDIwMCwgMzAwLCA0MDAsIDUwMCwgNjAwLCA3MDAsIDgwMCxcbiAgICBdO1xuICB9XG5cbiAgLy8gVXBkYXRlIHNoaWVsZCBhbmQgYXJtb3IgZGVmZW5zZSB2YWx1ZXMuXG4gIC8vIFNvbWUgb2YgdGhlIFwibWlkZGxlXCIgc2hpZWxkcyBhcmUgMiBwb2ludHMgd2Vha2VyIHRoYW4gdGhlIGNvcnJlc3BvbmRpbmdcbiAgLy8gYXJtb3JzLiAgSWYgd2UgaW5zdGVhZCBhdmVyYWdlIHRoZSBzaGllbGQvYXJtb3IgdmFsdWVzIGFuZCBidW1wICsxIGZvclxuICAvLyB0aGUgY2FyYXBhY2UgbGV2ZWwsIHdlIGdldCBhIHByZXR0eSBkZWNlbnQgcHJvZ3Jlc3Npb246IDMsIDYsIDksIDEzLCAxOCxcbiAgLy8gd2hpY2ggaXMgKzMsICszLCArMywgKzQsICs1LlxuICByb20uaXRlbXMuQ2FyYXBhY2VTaGllbGQuZGVmZW5zZSA9IHJvbS5pdGVtcy5UYW5uZWRIaWRlLmRlZmVuc2UgPSAzO1xuICByb20uaXRlbXMuUGxhdGludW1TaGllbGQuZGVmZW5zZSA9IHJvbS5pdGVtcy5Ccm9uemVBcm1vci5kZWZlbnNlID0gOTtcbiAgcm9tLml0ZW1zLk1pcnJvcmVkU2hpZWxkLmRlZmVuc2UgPSByb20uaXRlbXMuUGxhdGludW1Bcm1vci5kZWZlbnNlID0gMTM7XG4gIC8vIEZvciB0aGUgaGlnaC1lbmQgYXJtb3JzLCB3ZSB3YW50IHRvIGJhbGFuY2Ugb3V0IHRoZSB0b3AgdGhyZWUgYSBiaXRcbiAgLy8gYmV0dGVyLiAgU2FjcmVkIHNoaWVsZCBhbHJlYWR5IGhhcyBsb3dlciBkZWZlbnNlICgxNikgdGhhbiB0aGUgcHJldmlvdXNcbiAgLy8gb25lLCBhcyBkb2VzIGJhdHRsZSBhcm1vciAoMjApLCBzbyB3ZSBsZWF2ZSB0aGVtIGJlLiAgUHN5Y2hvcyBhcmVcbiAgLy8gZGVtb3RlZCBmcm9tIDMyIHRvIDIwLCBhbmQgdGhlIG5vLWV4dHJhLXBvd2VyIGFybW9ycyBnZXQgdGhlIDMyLlxuICByb20uaXRlbXMuUHN5Y2hvQXJtb3IuZGVmZW5zZSA9IHJvbS5pdGVtcy5Qc3ljaG9TaGllbGQuZGVmZW5zZSA9IDIwO1xuICByb20uaXRlbXMuQ2VyYW1pY1N1aXQuZGVmZW5zZSA9IHJvbS5pdGVtcy5CYXR0bGVTaGllbGQuZGVmZW5zZSA9IDMyO1xuXG4gIC8vIEJVVC4uLiBmb3Igbm93IHdlIGRvbid0IHdhbnQgdG8gbWFrZSBhbnkgY2hhbmdlcywgc28gZml4IGl0IGJhY2suXG4gIHJvbS5pdGVtcy5DYXJhcGFjZVNoaWVsZC5kZWZlbnNlID0gcm9tLml0ZW1zLlRhbm5lZEhpZGUuZGVmZW5zZSA9IDI7XG4gIHJvbS5pdGVtcy5QbGF0aW51bVNoaWVsZC5kZWZlbnNlID0gcm9tLml0ZW1zLkJyb256ZUFybW9yLmRlZmVuc2UgPSAxMDtcbiAgcm9tLml0ZW1zLk1pcnJvcmVkU2hpZWxkLmRlZmVuc2UgPSByb20uaXRlbXMuUGxhdGludW1Bcm1vci5kZWZlbnNlID0gMTQ7XG4gIHJvbS5pdGVtcy5CYXR0bGVBcm1vci5kZWZlbnNlID0gMjQ7XG59XG5cbmNvbnN0IHJlc2NhbGVTaG9wcyA9IChyb206IFJvbSwgcmFuZG9tPzogUmFuZG9tKSA9PiB7XG4gIC8vIFBvcHVsYXRlIHJlc2NhbGVkIHByaWNlcyBpbnRvIHRoZSB2YXJpb3VzIHJvbSBsb2NhdGlvbnMuXG4gIC8vIFNwZWNpZmljYWxseSwgd2UgcmVhZCB0aGUgYXZhaWxhYmxlIGl0ZW0gSURzIG91dCBvZiB0aGVcbiAgLy8gc2hvcCB0YWJsZXMgYW5kIHRoZW4gY29tcHV0ZSBuZXcgcHJpY2VzIGZyb20gdGhlcmUuXG4gIC8vIElmIGByYW5kb21gIGlzIHBhc3NlZCB0aGVuIHRoZSBiYXNlIHByaWNlIHRvIGJ1eSBlYWNoXG4gIC8vIGl0ZW0gYXQgYW55IGdpdmVuIHNob3Agd2lsbCBiZSBhZGp1c3RlZCB0byBhbnl3aGVyZSBmcm9tXG4gIC8vIDUwJSB0byAxNTAlIG9mIHRoZSBiYXNlIHByaWNlLiAgVGhlIHBhd24gc2hvcCBwcmljZSBpc1xuICAvLyBhbHdheXMgNTAlIG9mIHRoZSBiYXNlIHByaWNlLlxuXG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoc2hvcC50eXBlID09PSBTaG9wVHlwZS5QQVdOKSBjb250aW51ZTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2hvcC5wcmljZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldIDwgMHg4MCkge1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IHJhbmRvbSA/IHJhbmRvbS5uZXh0Tm9ybWFsKDEsIDAuMywgMC41LCAxLjUpIDogMTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5JTk4pIHtcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8ganVzdCBzZXQgdGhlIG9uZSBwcmljZVxuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IHJhbmRvbSA/IHJhbmRvbS5uZXh0Tm9ybWFsKDEsIDAuNSwgMC4zNzUsIDEuNjI1KSA6IDE7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIEFsc28gZmlsbCB0aGUgc2NhbGluZyB0YWJsZXMuXG4gIGNvbnN0IGRpZmYgPSBzZXEoNDggLyphc20uZXhwYW5kKCdTY2FsaW5nTGV2ZWxzJykqLywgeCA9PiB4KTtcbiAgcm9tLnNob3BzLnJlc2NhbGUgPSB0cnVlO1xuICAvLyBUb29sIHNob3BzIHNjYWxlIGFzIDIgKiogKERpZmYgLyAxMCksIHN0b3JlIGluIDh0aHNcbiAgcm9tLnNob3BzLnRvb2xTaG9wU2NhbGluZyA9IGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg4ICogKDIgKiogKGQgLyAxMCkpKSk7XG4gIC8vIEFybW9yIHNob3BzIHNjYWxlIGFzIDIgKiogKCg0NyAtIERpZmYpIC8gMTIpLCBzdG9yZSBpbiA4dGhzXG4gIHJvbS5zaG9wcy5hcm1vclNob3BTY2FsaW5nID1cbiAgICAgIGRpZmYubWFwKGQgPT4gTWF0aC5yb3VuZCg4ICogKDIgKiogKCg0NyAtIGQpIC8gMTIpKSkpO1xuXG4gIC8vIFNldCB0aGUgaXRlbSBiYXNlIHByaWNlcy5cbiAgZm9yIChsZXQgaSA9IDB4MGQ7IGkgPCAweDI3OyBpKyspIHtcbiAgICByb20uaXRlbXNbaV0uYmFzZVByaWNlID0gQkFTRV9QUklDRVNbaV07XG4gIH1cbiBcbiAvLyBUT0RPIC0gc2VwYXJhdGUgZmxhZyBmb3IgcmVzY2FsaW5nIG1vbnN0ZXJzPz8/XG59O1xuXG4vLyBNYXAgb2YgYmFzZSBwcmljZXMuICAoVG9vbHMgYXJlIHBvc2l0aXZlLCBhcm1vcnMgYXJlIG9uZXMtY29tcGxlbWVudC4pXG5jb25zdCBCQVNFX1BSSUNFUzoge1tpdGVtSWQ6IG51bWJlcl06IG51bWJlcn0gPSB7XG4gIC8vIEFybW9yc1xuICAweDBkOiA0LCAgICAvLyBjYXJhcGFjZSBzaGllbGRcbiAgMHgwZTogMTYsICAgLy8gYnJvbnplIHNoaWVsZFxuICAweDBmOiA1MCwgICAvLyBwbGF0aW51bSBzaGllbGRcbiAgMHgxMDogMzI1LCAgLy8gbWlycm9yZWQgc2hpZWxkXG4gIDB4MTE6IDEwMDAsIC8vIGNlcmFtaWMgc2hpZWxkXG4gIDB4MTI6IDIwMDAsIC8vIHNhY3JlZCBzaGllbGRcbiAgMHgxMzogNDAwMCwgLy8gYmF0dGxlIHNoaWVsZFxuICAweDE1OiA2LCAgICAvLyB0YW5uZWQgaGlkZVxuICAweDE2OiAyMCwgICAvLyBsZWF0aGVyIGFybW9yXG4gIDB4MTc6IDc1LCAgIC8vIGJyb256ZSBhcm1vclxuICAweDE4OiAyNTAsICAvLyBwbGF0aW51bSBhcm1vclxuICAweDE5OiAxMDAwLCAvLyBzb2xkaWVyIHN1aXRcbiAgMHgxYTogNDgwMCwgLy8gY2VyYW1pYyBzdWl0XG4gIC8vIFRvb2xzXG4gIDB4MWQ6IDI1LCAgIC8vIG1lZGljYWwgaGVyYlxuICAweDFlOiAzMCwgICAvLyBhbnRpZG90ZVxuICAweDFmOiA0NSwgICAvLyBseXNpcyBwbGFudFxuICAweDIwOiA0MCwgICAvLyBmcnVpdCBvZiBsaW1lXG4gIDB4MjE6IDM2LCAgIC8vIGZydWl0IG9mIHBvd2VyXG4gIDB4MjI6IDIwMCwgIC8vIG1hZ2ljIHJpbmdcbiAgMHgyMzogMTUwLCAgLy8gZnJ1aXQgb2YgcmVwdW5cbiAgMHgyNDogNjUsICAgLy8gd2FycCBib290c1xuICAweDI2OiAzMDAsICAvLyBvcGVsIHN0YXR1ZVxuICAvLyAweDMxOiA1MCwgLy8gYWxhcm0gZmx1dGVcbn07XG5cbi8vLy8vLy8vL1xuLy8vLy8vLy8vXG4vLy8vLy8vLy9cblxuLy8gY29uc3QgaWRlbnRpZnlLZXlJdGVtc0ZvckRpZmZpY3VsdHlCdWZmcyA9IChyb206IFJvbSkgPT4ge1xuLy8gICAvLyAvLyBUYWcga2V5IGl0ZW1zIGZvciBkaWZmaWN1bHR5IGJ1ZmZzXG4vLyAgIC8vIGZvciAoY29uc3QgZ2V0IG9mIHJvbS5pdGVtR2V0cykge1xuLy8gICAvLyAgIGNvbnN0IGl0ZW0gPSBJVEVNUy5nZXQoZ2V0Lml0ZW1JZCk7XG4vLyAgIC8vICAgaWYgKCFpdGVtIHx8ICFpdGVtLmtleSkgY29udGludWU7XG4vLyAgIC8vICAgZ2V0LmtleSA9IHRydWU7XG4vLyAgIC8vIH1cbi8vICAgLy8gLy8gY29uc29sZS5sb2cocmVwb3J0KTtcbi8vICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDQ5OyBpKyspIHtcbi8vICAgICAvLyBOT1RFIC0gc3BlY2lhbCBoYW5kbGluZyBmb3IgYWxhcm0gZmx1dGUgdW50aWwgd2UgcHJlLXBhdGNoXG4vLyAgICAgY29uc3QgdW5pcXVlID0gKHJvbS5wcmdbMHgyMGZmMCArIGldICYgMHg0MCkgfHwgaSA9PT0gMHgzMTtcbi8vICAgICBjb25zdCBiaXQgPSAxIDw8IChpICYgNyk7XG4vLyAgICAgY29uc3QgYWRkciA9IDB4MWUxMTAgKyAoaSA+Pj4gMyk7XG4vLyAgICAgcm9tLnByZ1thZGRyXSA9IHJvbS5wcmdbYWRkcl0gJiB+Yml0IHwgKHVuaXF1ZSA/IGJpdCA6IDApO1xuLy8gICB9XG4vLyB9O1xuXG4vLyBXaGVuIGRlYWxpbmcgd2l0aCBjb25zdHJhaW50cywgaXQncyBiYXNpY2FsbHkga3NhdFxuLy8gIC0gd2UgaGF2ZSBhIGxpc3Qgb2YgcmVxdWlyZW1lbnRzIHRoYXQgYXJlIEFORGVkIHRvZ2V0aGVyXG4vLyAgLSBlYWNoIGlzIGEgbGlzdCBvZiBwcmVkaWNhdGVzIHRoYXQgYXJlIE9SZWQgdG9nZXRoZXJcbi8vICAtIGVhY2ggcHJlZGljYXRlIGhhcyBhIGNvbnRpbnVhdGlvbiBmb3Igd2hlbiBpdCdzIHBpY2tlZFxuLy8gIC0gbmVlZCBhIHdheSB0byB0aGluIHRoZSBjcm93ZCwgZWZmaWNpZW50bHkgY2hlY2sgY29tcGF0LCBldGNcbi8vIFByZWRpY2F0ZSBpcyBhIGZvdXItZWxlbWVudCBhcnJheSBbcGF0MCxwYXQxLHBhbDIscGFsM11cbi8vIFJhdGhlciB0aGFuIGEgY29udGludWF0aW9uIHdlIGNvdWxkIGdvIHRocm91Z2ggYWxsIHRoZSBzbG90cyBhZ2FpblxuXG4vLyBjbGFzcyBDb25zdHJhaW50cyB7XG4vLyAgIGNvbnN0cnVjdG9yKCkge1xuLy8gICAgIC8vIEFycmF5IG9mIHBhdHRlcm4gdGFibGUgb3B0aW9ucy4gIE51bGwgaW5kaWNhdGVzIHRoYXQgaXQgY2FuIGJlIGFueXRoaW5nLlxuLy8gICAgIC8vXG4vLyAgICAgdGhpcy5wYXR0ZXJucyA9IFtbbnVsbCwgbnVsbF1dO1xuLy8gICAgIHRoaXMucGFsZXR0ZXMgPSBbW251bGwsIG51bGxdXTtcbi8vICAgICB0aGlzLmZseWVycyA9IDA7XG4vLyAgIH1cblxuLy8gICByZXF1aXJlVHJlYXN1cmVDaGVzdCgpIHtcbi8vICAgICB0aGlzLnJlcXVpcmVPcmRlcmVkU2xvdCgwLCBUUkVBU1VSRV9DSEVTVF9CQU5LUyk7XG4vLyAgIH1cblxuLy8gICByZXF1aXJlT3JkZXJlZFNsb3Qoc2xvdCwgc2V0KSB7XG5cbi8vICAgICBpZiAoIXRoaXMub3JkZXJlZCkge1xuXG4vLyAgICAgfVxuLy8gLy8gVE9ET1xuLy8gICAgIHRoaXMucGF0MCA9IGludGVyc2VjdCh0aGlzLnBhdDAsIHNldCk7XG5cbi8vICAgfVxuXG4vLyB9XG5cbi8vIGNvbnN0IGludGVyc2VjdCA9IChsZWZ0LCByaWdodCkgPT4ge1xuLy8gICBpZiAoIXJpZ2h0KSB0aHJvdyBuZXcgRXJyb3IoJ3JpZ2h0IG11c3QgYmUgbm9udHJpdmlhbCcpO1xuLy8gICBpZiAoIWxlZnQpIHJldHVybiByaWdodDtcbi8vICAgY29uc3Qgb3V0ID0gbmV3IFNldCgpO1xuLy8gICBmb3IgKGNvbnN0IHggb2YgbGVmdCkge1xuLy8gICAgIGlmIChyaWdodC5oYXMoeCkpIG91dC5hZGQoeCk7XG4vLyAgIH1cbi8vICAgcmV0dXJuIG91dDtcbi8vIH1cblxuXG4vLyB1c2VmdWwgZm9yIGRlYnVnIGV2ZW4gaWYgbm90IGN1cnJlbnRseSB1c2VkXG5jb25zdCBbXSA9IFtoZXhdO1xuIl19