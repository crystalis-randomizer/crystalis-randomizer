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
import { Sprite } from './characters.js';
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
        _FIX_BLIZZARD_SPAWN: true,
        _FIX_COIN_SPRITES: true,
        _FIX_OPEL_STATUE: true,
        _FIX_SHAKING: true,
        _FIX_SWORD_MANA_CHECK: true,
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
        Sprite.applyPatch(sprite, rom, EXPAND_PRG);
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
    const hasGraphics = (spriteReplacements === null || spriteReplacements === void 0 ? void 0 : spriteReplacements.some((spr) => Sprite.isCustom(spr))) || false;
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
    if (EXPAND_PRG) {
        const prg = rom.subarray(0x10);
        prg.subarray(0x7c000, 0x80000).set(prg.subarray(0x3c000, 0x40000));
    }
    patchGraphics(rom, spriteReplacements);
    return [rom, crc];
}
function misc(rom, flags, random) {
    const {} = { rom, flags, random };
    const levelDownMessage = rom.messages.parts[1][2];
    levelDownMessage.text = `
      Ah shucks.
 Somehow you've done it
and lost a level. So sad.
`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDbkMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFtQixRQUFRLElBQUksZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdkMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFB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QUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDcEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDckUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFLeEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDcEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFHcEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDcEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDdEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDeEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNyQyxDQUFDO0FBRUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFRLEVBQUUsTUFBZSxFQUFFLEVBQUU7SUFTakQsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO1FBQzVCLElBQUksSUFBSSxD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Y2VzQ29udGVudCI6WyJpbXBvcnQgeyBBc3NlbWJsZXIgfSBmcm9tICcuL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHsgQ3B1IH0gZnJvbSAnLi9hc20vY3B1LmpzJztcbmltcG9ydCB7IFByZXByb2Nlc3NvciB9IGZyb20gJy4vYXNtL3ByZXByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgeyBUb2tlblNvdXJjZSB9IGZyb20gJy4vYXNtL3Rva2VuLmpzJztcbmltcG9ydCB7IFRva2VuU3RyZWFtIH0gZnJvbSAnLi9hc20vdG9rZW5zdHJlYW0uanMnO1xuaW1wb3J0IHsgVG9rZW5pemVyIH0gZnJvbSAnLi9hc20vdG9rZW5pemVyLmpzJztcbmltcG9ydCB7IGNyYzMyIH0gZnJvbSAnLi9jcmMzMi5qcyc7XG5pbXBvcnQgeyBQcm9ncmVzc1RyYWNrZXIsIGdlbmVyYXRlIGFzIGdlbmVyYXRlRGVwZ3JhcGggfSBmcm9tICcuL2RlcGdyYXBoLmpzJztcbmltcG9ydCB7IEZldGNoUmVhZGVyIH0gZnJvbSAnLi9mZXRjaHJlYWRlci5qcyc7XG5pbXBvcnQgeyBGbGFnU2V0IH0gZnJvbSAnLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7IEdyYXBoIH0gZnJvbSAnLi9sb2dpYy9ncmFwaC5qcyc7XG5pbXBvcnQgeyBXb3JsZCB9IGZyb20gJy4vbG9naWMvd29ybGQuanMnO1xuaW1wb3J0IHsgY29tcHJlc3NNYXBEYXRhLCBtb3ZlU2NyZWVuc0ludG9FeHBhbmRlZFJvbSB9IGZyb20gJy4vcGFzcy9jb21wcmVzc21hcGRhdGEuanMnO1xuaW1wb3J0IHsgY3J1bWJsaW5nUGxhdGZvcm1zIH0gZnJvbSAnLi9wYXNzL2NydW1ibGluZ3BsYXRmb3Jtcy5qcyc7XG5pbXBvcnQgeyBkZXRlcm1pbmlzdGljLCBkZXRlcm1pbmlzdGljUHJlUGFyc2UgfSBmcm9tICcuL3Bhc3MvZGV0ZXJtaW5pc3RpYy5qcyc7XG5pbXBvcnQgeyBmaXhEaWFsb2cgfSBmcm9tICcuL3Bhc3MvZml4ZGlhbG9nLmpzJztcbmltcG9ydCB7IGZpeEVudHJhbmNlVHJpZ2dlcnMgfSBmcm9tICcuL3Bhc3MvZml4ZW50cmFuY2V0cmlnZ2Vycy5qcyc7XG5pbXBvcnQgeyBmaXhNb3ZlbWVudFNjcmlwdHMgfSBmcm9tICcuL3Bhc3MvZml4bW92ZW1lbnRzY3JpcHRzLmpzJztcbmltcG9ydCB7IGZpeFNraXBwYWJsZUV4aXRzIH0gZnJvbSAnLi9wYXNzL2ZpeHNraXBwYWJsZWV4aXRzLmpzJztcbmltcG9ydCB7IHJhbmRvbWl6ZVRodW5kZXJXYXJwIH0gZnJvbSAnLi9wYXNzL3JhbmRvbWl6ZXRodW5kZXJ3YXJwLmpzJztcbmltcG9ydCB7IHJlc2NhbGVNb25zdGVycyB9IGZyb20gJy4vcGFzcy9yZXNjYWxlbW9uc3RlcnMuanMnO1xuaW1wb3J0IHsgc2h1ZmZsZUdvYSB9IGZyb20gJy4vcGFzcy9zaHVmZmxlZ29hLmpzJztcbmltcG9ydCB7IHNodWZmbGVIb3VzZXMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZWhvdXNlcy5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlTWF6ZXMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZW1hemVzLmpzJztcbmltcG9ydCB7IHNodWZmbGVNaW1pY3MgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZW1pbWljcy5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlTW9uc3RlclBvc2l0aW9ucyB9IGZyb20gJy4vcGFzcy9zaHVmZmxlbW9uc3RlcnBvc2l0aW9ucy5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlTW9uc3RlcnMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZW1vbnN0ZXJzLmpzJztcbmltcG9ydCB7IHNodWZmbGVQYWxldHRlcyB9IGZyb20gJy4vcGFzcy9zaHVmZmxlcGFsZXR0ZXMuanMnO1xuaW1wb3J0IHsgc2h1ZmZsZVRyYWRlcyB9IGZyb20gJy4vcGFzcy9zaHVmZmxldHJhZGVzLmpzJztcbmltcG9ydCB7IHN0YW5kYXJkTWFwRWRpdHMgfSBmcm9tICcuL3Bhc3Mvc3RhbmRhcmRtYXBlZGl0cy5qcyc7XG5pbXBvcnQgeyB0b2dnbGVNYXBzIH0gZnJvbSAnLi9wYXNzL3RvZ2dsZW1hcHMuanMnO1xuaW1wb3J0IHsgdW5pZGVudGlmaWVkSXRlbXMgfSBmcm9tICcuL3Bhc3MvdW5pZGVudGlmaWVkaXRlbXMuanMnO1xuaW1wb3J0IHsgbWlzc3BlbGwgfSBmcm9tICcuL3Bhc3MvbWlzc3BlbGwuanMnO1xuaW1wb3J0IHsgd3JpdGVMb2NhdGlvbnNGcm9tTWV0YSB9IGZyb20gJy4vcGFzcy93cml0ZWxvY2F0aW9uc2Zyb21tZXRhLmpzJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJy4vcmFuZG9tLmpzJztcbmltcG9ydCB7IFJvbSwgTW9kdWxlSWQgfSBmcm9tICcuL3JvbS5qcyc7XG5pbXBvcnQgeyBBcmVhIH0gZnJvbSAnLi9yb20vYXJlYS5qcyc7XG5pbXBvcnQgeyBMb2NhdGlvbiwgU3Bhd24gfSBmcm9tICcuL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQgeyBmaXhUaWxlc2V0cyB9IGZyb20gJy4vcm9tL3NjcmVlbmZpeC5qcyc7XG5pbXBvcnQgeyBTaG9wLCBTaG9wVHlwZSB9IGZyb20gJy4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHsgU3BvaWxlciB9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHsgaGV4LCBzZXEsIHdhdGNoQXJyYXkgfSBmcm9tICcuL3JvbS91dGlsLmpzJztcbmltcG9ydCB7IERlZmF1bHRNYXAgfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0ICogYXMgdmVyc2lvbiBmcm9tICcuL3ZlcnNpb24uanMnO1xuaW1wb3J0IHsgc2h1ZmZsZUFyZWFzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVhcmVhcy5qcyc7XG5pbXBvcnQgeyBjaGVja1RyaWdnZXJzIH0gZnJvbSAnLi9wYXNzL2NoZWNrdHJpZ2dlcnMuanMnO1xuaW1wb3J0IHsgU3ByaXRlIH0gZnJvbSAnLi9jaGFyYWN0ZXJzLmpzJztcblxuY29uc3QgRVhQQU5EX1BSRzogYm9vbGVhbiA9IHRydWU7XG5jb25zdCBBU00gPSBNb2R1bGVJZCgnYXNtJyk7XG5cbi8vICh3aW5kb3cgYXMgYW55KS5DYXZlU2h1ZmZsZSA9IENhdmVTaHVmZmxlO1xuLy8gZnVuY3Rpb24gc2h1ZmZsZUNhdmUoc2VlZDogbnVtYmVyLCBwYXJhbXM6IGFueSwgbnVtID0gMTAwMCkge1xuLy8gICBmb3IgKGxldCBpID0gc2VlZDsgaSA8IHNlZWQgKyBudW07IGkrKykge1xuLy8gICAgIGNvbnN0IHMgPSBuZXcgQ2F2ZVNodWZmbGUoey4uLnBhcmFtcywgdGlsZXNldDogKHdpbmRvdyBhcyBhbnkpLnJvbS5tZXRhdGlsZXNldHMuY2F2ZX0sIGkpO1xuLy8gICAgIHMubWluU3Bpa2VzID0gMztcbi8vICAgICB0cnkge1xuLy8gICAgICAgaWYgKHMuYnVpbGQoKSkge1xuLy8gICAgICAgICBjb25zb2xlLmxvZyhgc2VlZCAke2l9OlxcbiR7cy5ncmlkLnNob3coKX1cXG4ke3MubWV0YSEuc2hvdygpfWApO1xuLy8gICAgICAgICByZXR1cm47XG4vLyAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBjb25zb2xlLmxvZyhgZmFpbDpcXG4ke3MuZ3JpZC5zaG93KCl9YCk7XG4vLyAgICAgICB9XG4vLyAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4vLyAgICAgICBjb25zb2xlLmxvZyhgZmFpbCAke2l9OlxcbiR7cy5ncmlkLnNob3coKX1gKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vICAgY29uc29sZS5sb2coYGZhaWxgKTtcbi8vIH1cblxuLy8gY2xhc3MgU2hpbUFzc2VtYmxlciB7XG4vLyAgIHByZTogUHJlcHJvY2Vzc29yO1xuLy8gICBleHBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcblxuLy8gICBjb25zdHJ1Y3Rvcihjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZykge1xuLy8gICAgIGNvbnN0IGFzbSA9IG5ldyBBc3NlbWJsZXIoQ3B1LlAwMik7XG4vLyAgICAgY29uc3QgdG9rcyA9IG5ldyBUb2tlblN0cmVhbSgpO1xuLy8gICAgIHRva3MuZW50ZXIobmV3IFRva2VuaXplcihjb2RlLCBmaWxlKSk7XG4vLyAgICAgdGhpcy5wcmUgPSBuZXcgUHJlcHJvY2Vzc29yKHRva3MsIGFzbSk7XG4vLyAgICAgd2hpbGUgKHRoaXMucHJlLm5leHQoKSkge31cbi8vICAgfVxuXG4vLyAgIGFzc2VtYmxlKGNvZGU6IHN0cmluZywgZmlsZTogc3RyaW5nLCByb206IFVpbnQ4QXJyYXkpIHtcbi8vICAgICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKENwdS5QMDIpO1xuLy8gICAgIGNvbnN0IHRva3MgPSBuZXcgVG9rZW5TdHJlYW0oKTtcbi8vICAgICB0b2tzLmVudGVyKG5ldyBUb2tlbml6ZXIoY29kZSwgZmlsZSkpO1xuLy8gICAgIGNvbnN0IHByZSA9IG5ldyBQcmVwcm9jZXNzb3IodG9rcywgYXNtLCB0aGlzLnByZSk7XG4vLyAgICAgYXNtLnRva2VucyhwcmUpO1xuLy8gICAgIGNvbnN0IGxpbmsgPSBuZXcgTGlua2VyKCk7XG4vLyAgICAgbGluay5yZWFkKGFzbS5tb2R1bGUoKSk7XG4vLyAgICAgbGluay5saW5rKCkuYWRkT2Zmc2V0KDB4MTApLmFwcGx5KHJvbSk7XG4vLyAgICAgZm9yIChjb25zdCBbcywgdl0gb2YgbGluay5leHBvcnRzKCkpIHtcbi8vICAgICAgIC8vaWYgKCF2Lm9mZnNldCkgdGhyb3cgbmV3IEVycm9yKGBubyBvZmZzZXQ6ICR7c31gKTtcbi8vICAgICAgIHRoaXMuZXhwb3J0cy5zZXQocywgdi5vZmZzZXQgPz8gdi52YWx1ZSk7XG4vLyAgICAgfVxuLy8gICB9XG5cbi8vICAgZXhwYW5kKHM6IHN0cmluZykge1xuLy8gICAgIGNvbnN0IHYgPSB0aGlzLmV4cG9ydHMuZ2V0KHMpO1xuLy8gICAgIGlmICghdikgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGV4cG9ydDogJHtzfWApO1xuLy8gICAgIHJldHVybiB2O1xuLy8gICB9XG4vLyB9XG5cblxuLy8gVE9ETyAtIHRvIHNodWZmbGUgdGhlIG1vbnN0ZXJzLCB3ZSBuZWVkIHRvIGZpbmQgdGhlIHNwcml0ZSBwYWx0dGVzIGFuZFxuLy8gcGF0dGVybnMgZm9yIGVhY2ggbW9uc3Rlci4gIEVhY2ggbG9jYXRpb24gc3VwcG9ydHMgdXAgdG8gdHdvIG1hdGNodXBzLFxuLy8gc28gY2FuIG9ubHkgc3VwcG9ydCBtb25zdGVycyB0aGF0IG1hdGNoLiAgTW9yZW92ZXIsIGRpZmZlcmVudCBtb25zdGVyc1xuLy8gc2VlbSB0byBuZWVkIHRvIGJlIGluIGVpdGhlciBzbG90IDAgb3IgMS5cblxuLy8gUHVsbCBpbiBhbGwgdGhlIHBhdGNoZXMgd2Ugd2FudCB0byBhcHBseSBhdXRvbWF0aWNhbGx5LlxuLy8gVE9ETyAtIG1ha2UgYSBkZWJ1Z2dlciB3aW5kb3cgZm9yIHBhdGNoZXMuXG4vLyBUT0RPIC0gdGhpcyBuZWVkcyB0byBiZSBhIHNlcGFyYXRlIG5vbi1jb21waWxlZCBmaWxlLlxuZXhwb3J0IGRlZmF1bHQgKHtcbiAgYXN5bmMgYXBwbHkocm9tOiBVaW50OEFycmF5LCBoYXNoOiB7W2tleTogc3RyaW5nXTogdW5rbm93bn0sIHBhdGg6IHN0cmluZyk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIC8vIExvb2sgZm9yIGZsYWcgc3RyaW5nIGFuZCBoYXNoXG4gICAgbGV0IGZsYWdzO1xuICAgIGlmICghaGFzaC5zZWVkKSB7XG4gICAgICAvLyBUT0RPIC0gc2VuZCBpbiBhIGhhc2ggb2JqZWN0IHdpdGggZ2V0L3NldCBtZXRob2RzXG4gICAgICBoYXNoLnNlZWQgPSBwYXJzZVNlZWQoJycpLnRvU3RyaW5nKDE2KTtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoICs9ICcmc2VlZD0nICsgaGFzaC5zZWVkO1xuICAgIH1cbiAgICBpZiAoaGFzaC5mbGFncykge1xuICAgICAgZmxhZ3MgPSBuZXcgRmxhZ1NldChTdHJpbmcoaGFzaC5mbGFncykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmbGFncyA9IG5ldyBGbGFnU2V0KCdAU3RhbmRhcmQnKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgaW4gaGFzaCkge1xuICAgICAgaWYgKGhhc2hba2V5XSA9PT0gJ2ZhbHNlJykgaGFzaFtrZXldID0gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IFtyZXN1bHQsXSA9XG4gICAgICAgIGF3YWl0IHNodWZmbGUocm9tLCBwYXJzZVNlZWQoU3RyaW5nKGhhc2guc2VlZCkpLFxuICAgICAgICAgICAgICAgICAgICAgIGZsYWdzLCBuZXcgRmV0Y2hSZWFkZXIocGF0aCkpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2VlZChzZWVkOiBzdHJpbmcpOiBudW1iZXIge1xuICBpZiAoIXNlZWQpIHJldHVybiBSYW5kb20ubmV3U2VlZCgpO1xuICBpZiAoL15bMC05YS1mXXsxLDh9JC9pLnRlc3Qoc2VlZCkpIHJldHVybiBOdW1iZXIucGFyc2VJbnQoc2VlZCwgMTYpO1xuICByZXR1cm4gY3JjMzIoc2VlZCk7XG59XG5cbi8qKlxuICogQWJzdHJhY3Qgb3V0IEZpbGUgSS9PLiAgTm9kZSBhbmQgYnJvd3NlciB3aWxsIGhhdmUgY29tcGxldGVseVxuICogZGlmZmVyZW50IGltcGxlbWVudGF0aW9ucy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWFkZXIge1xuICByZWFkKGZpbGVuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz47XG59XG5cbi8vIHByZXZlbnQgdW51c2VkIGVycm9ycyBhYm91dCB3YXRjaEFycmF5IC0gaXQncyB1c2VkIGZvciBkZWJ1Z2dpbmcuXG5jb25zdCB7fSA9IHt3YXRjaEFycmF5fSBhcyBhbnk7XG5cbmZ1bmN0aW9uIGRlZmluZXMoZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgIHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBzdHJpbmcge1xuICBjb25zdCBkZWZpbmVzOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHtcbiAgICBfQUxMT1dfVEVMRVBPUlRfT1VUX09GX0JPU1M6IGZsYWdzLmhhcmRjb3JlTW9kZSgpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCksXG4gICAgX0FMTE9XX1RFTEVQT1JUX09VVF9PRl9UT1dFUjogdHJ1ZSxcbiAgICBfQVVESUJMRV9XQUxMUzogZmxhZ3MuYXVkaWJsZVdhbGxDdWVzKHBhc3MpLFxuICAgIF9BVVRPX0VRVUlQX0JSQUNFTEVUOiBmbGFncy5hdXRvRXF1aXBCcmFjZWxldChwYXNzKSxcbiAgICBfQkFSUklFUl9SRVFVSVJFU19DQUxNX1NFQTogdHJ1ZSwgLy8gZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpLFxuICAgIF9CVUZGX0RFT1NfUEVOREFOVDogZmxhZ3MuYnVmZkRlb3NQZW5kYW50KCksXG4gICAgX0JVRkZfRFlOQTogZmxhZ3MuYnVmZkR5bmEoKSwgLy8gdHJ1ZSxcbiAgICBfQ0hFQ0tfRkxBRzA6IHRydWUsXG4gICAgX0NUUkwxX1NIT1JUQ1VUUzogZmxhZ3MuY29udHJvbGxlclNob3J0Y3V0cyhwYXNzKSxcbiAgICBfQ1VTVE9NX1NIT09USU5HX1dBTExTOiB0cnVlLFxuICAgIF9ESVNBQkxFX1NIT1BfR0xJVENIOiBmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1NUQVRVRV9HTElUQ0g6IGZsYWdzLmRpc2FibGVTdGF0dWVHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9TV09SRF9DSEFSR0VfR0xJVENIOiBmbGFncy5kaXNhYmxlU3dvcmRDaGFyZ2VHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9UUklHR0VSX1NLSVA6IGZsYWdzLmRpc2FibGVUcmlnZ2VyR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfV0FSUF9CT09UU19SRVVTRTogZmxhZ3MuZGlzYWJsZVNob3BHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9XSUxEX1dBUlA6IGZhbHNlLFxuICAgIF9FWFBBTkRfUFJHOiBFWFBBTkRfUFJHLFxuICAgIF9FWFRSQV9FWFRFTkRFRF9TQ1JFRU5TOiB0cnVlLFxuICAgIF9FWFRSQV9QSVRZX01QOiB0cnVlLCAgLy8gVE9ETzogYWxsb3cgZGlzYWJsaW5nIHRoaXNcbiAgICBfRklYX0JMSVpaQVJEX1NQQVdOOiB0cnVlLFxuICAgIF9GSVhfQ09JTl9TUFJJVEVTOiB0cnVlLFxuICAgIF9GSVhfT1BFTF9TVEFUVUU6IHRydWUsXG4gICAgX0ZJWF9TSEFLSU5HOiB0cnVlLFxuICAgIF9GSVhfU1dPUkRfTUFOQV9DSEVDSzogdHJ1ZSxcbiAgICBfRklYX1ZBTVBJUkU6IHRydWUsXG4gICAgX0hBWk1BVF9TVUlUOiBmbGFncy5jaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCksXG4gICAgX0xFQVRIRVJfQk9PVFNfR0lWRV9TUEVFRDogZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCksXG4gICAgX01BWF9TQ0FMSU5HX0lOX1RPV0VSOiBmbGFncy5tYXhTY2FsaW5nSW5Ub3dlcigpLFxuICAgIF9NT05FWV9BVF9TVEFSVDogZmxhZ3Muc2h1ZmZsZUhvdXNlcygpIHx8IGZsYWdzLnNodWZmbGVBcmVhcygpLFxuICAgIF9ORVJGX0ZMSUdIVDogdHJ1ZSxcbiAgICBfTkVSRl9NQURPOiB0cnVlLFxuICAgIF9ORVZFUl9ESUU6IGZsYWdzLm5ldmVyRGllKCksXG4gICAgX05PUk1BTElaRV9TSE9QX1BSSUNFUzogZmxhZ3Muc2h1ZmZsZVNob3BzKCksXG4gICAgX1BJVFlfSFBfQU5EX01QOiB0cnVlLFxuICAgIF9QUk9HUkVTU0lWRV9CUkFDRUxFVDogdHJ1ZSxcbiAgICBfUkFCQklUX0JPT1RTX0NIQVJHRV9XSElMRV9XQUxLSU5HOiBmbGFncy5yYWJiaXRCb290c0NoYXJnZVdoaWxlV2Fsa2luZygpLFxuICAgIF9SQU5ET01fRkxZRVJfU1BBV05TOiB0cnVlLFxuICAgIF9SRVFVSVJFX0hFQUxFRF9ET0xQSElOX1RPX1JJREU6IGZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCksXG4gICAgX1JFVkVSU0lCTEVfU1dBTl9HQVRFOiB0cnVlLFxuICAgIF9TQUhBUkFfUkFCQklUU19SRVFVSVJFX1RFTEVQQVRIWTogZmxhZ3Muc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKSxcbiAgICBfU0lNUExJRllfSU5WSVNJQkxFX0NIRVNUUzogdHJ1ZSxcbiAgICBfU09GVF9SRVNFVF9TSE9SVENVVDogdHJ1ZSxcbiAgICBfVEVMRVBPUlRfT05fVEhVTkRFUl9TV09SRDogZmxhZ3MudGVsZXBvcnRPblRodW5kZXJTd29yZCgpLFxuICAgIF9USU5LX01PREU6ICFmbGFncy5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCksXG4gICAgX1RSQUlORVI6IGZsYWdzLnRyYWluZXIoKSxcbiAgICBfVFdFTEZUSF9XQVJQX1BPSU5UOiB0cnVlLCAvLyB6b21iaWUgdG93biB3YXJwXG4gICAgX1VOSURFTlRJRklFRF9JVEVNUzogZmxhZ3MudW5pZGVudGlmaWVkSXRlbXMoKSxcbiAgICBfRU5FTVlfSFA6IGZsYWdzLnNob3VsZFVwZGF0ZUh1ZCgpLFxuICAgIF9VUERBVEVfSFVEOiBmbGFncy5zaG91bGRVcGRhdGVIdWQoKSxcbiAgICBfV0FSUF9GTEFHU19UQUJMRTogdHJ1ZSxcbiAgICBfWkVCVV9TVFVERU5UX0dJVkVTX0lURU06IGZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCksXG4gIH07XG4gIHJldHVybiBPYmplY3Qua2V5cyhkZWZpbmVzKVxuICAgICAgLmZpbHRlcihkID0+IGRlZmluZXNbZF0pXG4gICAgICAubWFwKGQgPT4gYC5kZWZpbmUgJHtkfSAke2RlZmluZXNbZF19XFxuYClcbiAgICAgIC5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gcGF0Y2hHcmFwaGljcyhyb206IFVpbnQ4QXJyYXksIHNwcml0ZXM6IFNwcml0ZVtdKSB7XG4gIGZvciAobGV0IHNwcml0ZSBvZiBzcHJpdGVzKSB7XG4gICAgU3ByaXRlLmFwcGx5UGF0Y2goc3ByaXRlLCByb20sIEVYUEFORF9QUkcpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaHVmZmxlKHJvbTogVWludDhBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsRmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXI6IFJlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwcml0ZVJlcGxhY2VtZW50cz86IFNwcml0ZVtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nPzoge3Nwb2lsZXI/OiBTcG9pbGVyfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzPzogUHJvZ3Jlc3NUcmFja2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk6IFByb21pc2U8cmVhZG9ubHkgW1VpbnQ4QXJyYXksIG51bWJlcl0+IHtcbiAgLy8gVHJpbSBvdmVyZHVtcHMgKG1haW4uanMgYWxyZWFkeSBkb2VzIHRoaXMsIGJ1dCB0aGVyZSBhcmUgb3RoZXIgZW50cnlwb2ludHMpXG4gIGNvbnN0IGV4cGVjdGVkU2l6ZSA9XG4gICAgICAxNiArIChyb21bNl0gJiA0ID8gNTEyIDogMCkgKyAocm9tWzRdIDw8IDE0KSArIChyb21bNV0gPDwgMTMpO1xuICBpZiAocm9tLmxlbmd0aCA+IGV4cGVjdGVkU2l6ZSkgcm9tID0gcm9tLnNsaWNlKDAsIGV4cGVjdGVkU2l6ZSk7XG5cbiAgLy9yb20gPSB3YXRjaEFycmF5KHJvbSwgMHg4NWZhICsgMHgxMCk7XG4gIGlmIChFWFBBTkRfUFJHICYmIHJvbS5sZW5ndGggPCAweDgwMDAwKSB7XG4gICAgY29uc3QgbmV3Um9tID0gbmV3IFVpbnQ4QXJyYXkocm9tLmxlbmd0aCArIDB4NDAwMDApO1xuICAgIG5ld1JvbS5zdWJhcnJheSgwLCAweDQwMDEwKS5zZXQocm9tLnN1YmFycmF5KDAsIDB4NDAwMTApKTtcbiAgICBuZXdSb20uc3ViYXJyYXkoMHg4MDAxMCkuc2V0KHJvbS5zdWJhcnJheSgweDQwMDEwKSk7XG4gICAgbmV3Um9tWzRdIDw8PSAxO1xuICAgIHJvbSA9IG5ld1JvbTtcbiAgfVxuXG4gIGRldGVybWluaXN0aWNQcmVQYXJzZShyb20uc3ViYXJyYXkoMHgxMCkpOyAvLyBUT0RPIC0gdHJhaW5lci4uLlxuXG4gIC8vIEZpcnN0IHJlZW5jb2RlIHRoZSBzZWVkLCBtaXhpbmcgaW4gdGhlIGZsYWdzIGZvciBzZWN1cml0eS5cbiAgaWYgKHR5cGVvZiBzZWVkICE9PSAnbnVtYmVyJykgdGhyb3cgbmV3IEVycm9yKCdCYWQgc2VlZCcpO1xuICBjb25zdCBuZXdTZWVkID0gY3JjMzIoc2VlZC50b1N0cmluZygxNikucGFkU3RhcnQoOCwgJzAnKSArIFN0cmluZyhvcmlnaW5hbEZsYWdzLmZpbHRlck9wdGlvbmFsKCkpKSA+Pj4gMDtcbiAgY29uc3QgcmFuZG9tID0gbmV3IFJhbmRvbShuZXdTZWVkKTtcblxuICBjb25zdCBzcHJpdGVzID0gc3ByaXRlUmVwbGFjZW1lbnRzID8gc3ByaXRlUmVwbGFjZW1lbnRzIDogW107XG4gIGNvbnN0IGF0dGVtcHRFcnJvcnMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCA1OyBpKyspIHsgLy8gZm9yIG5vdywgd2UnbGwgdHJ5IDUgYXR0ZW1wdHNcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHNodWZmbGVJbnRlcm5hbChyb20sIG9yaWdpbmFsRmxhZ3MsIHNlZWQsIHJhbmRvbSwgcmVhZGVyLCBsb2csIHByb2dyZXNzLCBzcHJpdGVzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgYXR0ZW1wdEVycm9ycy5wdXNoKGVycm9yKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEF0dGVtcHQgJHtpICsgMX0gZmFpbGVkOiAke2Vycm9yLnN0YWNrfWApO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYFNodWZmbGUgZmFpbGVkOiAke2F0dGVtcHRFcnJvcnMubWFwKGUgPT4gZS5zdGFjaykuam9pbignXFxuXFxuJyl9YCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNodWZmbGVJbnRlcm5hbChyb206IFVpbnQ4QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxGbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFNlZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXI6IFJlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2c6IHtzcG9pbGVyPzogU3BvaWxlcn18dW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzOiBQcm9ncmVzc1RyYWNrZXJ8dW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwcml0ZVJlcGxhY2VtZW50czogU3ByaXRlW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICApOiBQcm9taXNlPHJlYWRvbmx5IFtVaW50OEFycmF5LCBudW1iZXJdPiAge1xuICBjb25zdCBvcmlnaW5hbEZsYWdTdHJpbmcgPSBTdHJpbmcob3JpZ2luYWxGbGFncyk7XG4gIGNvbnN0IGZsYWdzID0gb3JpZ2luYWxGbGFncy5maWx0ZXJSYW5kb20ocmFuZG9tKTtcbiAgY29uc3QgcGFyc2VkID0gbmV3IFJvbShyb20pO1xuICBjb25zdCBhY3R1YWxGbGFnU3RyaW5nID0gU3RyaW5nKGZsYWdzKTtcbi8vICh3aW5kb3cgYXMgYW55KS5jYXZlID0gc2h1ZmZsZUNhdmU7XG4gIHBhcnNlZC5mbGFncy5kZWZyYWcoKTtcbiAgY29tcHJlc3NNYXBEYXRhKHBhcnNlZCk7XG4gIG1vdmVTY3JlZW5zSW50b0V4cGFuZGVkUm9tKHBhcnNlZCk7XG4gICAgICAgICAgICAgLy8gVE9ETyAtIHRoZSBzY3JlZW5zIGFyZW4ndCBtb3Zpbmc/IT9cbiAgLy8gTk9URTogZGVsZXRlIHRoZXNlIGlmIHdlIHdhbnQgbW9yZSBmcmVlIHNwYWNlIGJhY2suLi5cbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuc3dhbXAsIDQpOyAvLyBtb3ZlIDE3IHNjcmVlbnMgdG8gJDQwMDAwXG4gIC8vIHBhcnNlZC5tb3ZlU2NyZWVucyhwYXJzZWQubWV0YXRpbGVzZXRzLmhvdXNlLCA0KTsgLy8gMTUgc2NyZWVuc1xuICAvLyBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy50b3duLCA0KTtcbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuW2NhdmUsIHB5cmFtaWQsIGZvcnRyZXNzLCBsYWJ5cmludGgsIGljZUNhdmVdLCA0KTtcbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuZG9scGhpbkNhdmUsIDQpO1xuICAvLyBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy5saW1lLCA0KTtcbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuc2hyaW5lLCA0KTtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpICh3aW5kb3cgYXMgYW55KS5yb20gPSBwYXJzZWQ7XG4gIHBhcnNlZC5zcG9pbGVyID0gbmV3IFNwb2lsZXIocGFyc2VkKTtcbiAgaWYgKGxvZykgbG9nLnNwb2lsZXIgPSBwYXJzZWQuc3BvaWxlcjtcbiAgaWYgKGFjdHVhbEZsYWdTdHJpbmcgIT09IG9yaWdpbmFsRmxhZ1N0cmluZykge1xuICAgIHBhcnNlZC5zcG9pbGVyLmZsYWdzID0gYWN0dWFsRmxhZ1N0cmluZztcbiAgfVxuXG4gIC8vIE1ha2UgZGV0ZXJtaW5pc3RpYyBjaGFuZ2VzLlxuICBkZXRlcm1pbmlzdGljKHBhcnNlZCwgZmxhZ3MpO1xuICBmaXhUaWxlc2V0cyhwYXJzZWQpO1xuICBzdGFuZGFyZE1hcEVkaXRzKHBhcnNlZCwgc3RhbmRhcmRNYXBFZGl0cy5nZW5lcmF0ZU9wdGlvbnMoZmxhZ3MsIHJhbmRvbSkpO1xuICB0b2dnbGVNYXBzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgLy8gU2V0IHVwIHNob3AgYW5kIHRlbGVwYXRoeVxuICBwYXJzZWQuc2NhbGluZ0xldmVscyA9IDQ4O1xuXG4gIGlmIChmbGFncy5zaHVmZmxlU2hvcHMoKSkgc2h1ZmZsZVNob3BzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgaWYgKGZsYWdzLnNodWZmbGVHb2FGbG9vcnMoKSkgc2h1ZmZsZUdvYShwYXJzZWQsIHJhbmRvbSk7IC8vIE5PVEU6IG11c3QgYmUgYmVmb3JlIHNodWZmbGVNYXplcyFcbiAgdXBkYXRlV2FsbFNwYXduRm9ybWF0KHBhcnNlZCk7XG4gIHJhbmRvbWl6ZVdhbGxzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGNydW1ibGluZ1BsYXRmb3JtcyhwYXJzZWQsIHJhbmRvbSk7XG5cbiAgaWYgKGZsYWdzLm5lcmZXaWxkV2FycCgpKSBwYXJzZWQud2lsZFdhcnAubG9jYXRpb25zLmZpbGwoMCk7XG4gIGlmIChmbGFncy5yYW5kb21pemVXaWxkV2FycCgpKSBzaHVmZmxlV2lsZFdhcnAocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZVRodW5kZXJUZWxlcG9ydCgpKSByYW5kb21pemVUaHVuZGVyV2FycChwYXJzZWQsIHJhbmRvbSk7XG4gIHJlc2NhbGVNb25zdGVycyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB1bmlkZW50aWZpZWRJdGVtcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBtaXNzcGVsbChwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBzaHVmZmxlVHJhZGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlmIChmbGFncy5zaHVmZmxlSG91c2VzKCkpIHNodWZmbGVIb3VzZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgaWYgKGZsYWdzLnNodWZmbGVBcmVhcygpKSBzaHVmZmxlQXJlYXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgZml4RW50cmFuY2VUcmlnZ2VycyhwYXJzZWQpO1xuICBpZiAoZmxhZ3MucmFuZG9taXplTWFwcygpKSBzaHVmZmxlTWF6ZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgd3JpdGVMb2NhdGlvbnNGcm9tTWV0YShwYXJzZWQpO1xuICBzaHVmZmxlTW9uc3RlclBvc2l0aW9ucyhwYXJzZWQsIHJhbmRvbSk7XG5cbiAgLy8gTk9URTogU2h1ZmZsZSBtaW1pY3MgYW5kIG1vbnN0ZXJzICphZnRlciogc2h1ZmZsaW5nIG1hcHMsIGJ1dCBiZWZvcmUgbG9naWMuXG4gIGlmIChmbGFncy5zaHVmZmxlTWltaWNzKCkpIHNodWZmbGVNaW1pY3MocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgaWYgKGZsYWdzLnNodWZmbGVNb25zdGVycygpKSBzaHVmZmxlTW9uc3RlcnMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICAvLyBUaGlzIHdhbnRzIHRvIGdvIGFzIGxhdGUgYXMgcG9zc2libGUgc2luY2Ugd2UgbmVlZCB0byBwaWNrIHVwXG4gIC8vIGFsbCB0aGUgbm9ybWFsaXphdGlvbiBhbmQgb3RoZXIgaGFuZGxpbmcgdGhhdCBoYXBwZW5lZCBiZWZvcmUuXG4gIGNvbnN0IHdvcmxkID0gbmV3IFdvcmxkKHBhcnNlZCwgZmxhZ3MpO1xuICBjb25zdCBncmFwaCA9IG5ldyBHcmFwaChbd29ybGQuZ2V0TG9jYXRpb25MaXN0KCldKTtcbiAgaWYgKCFmbGFncy5ub1NodWZmbGUoKSkge1xuICAgIGNvbnN0IGZpbGwgPSBhd2FpdCBncmFwaC5zaHVmZmxlKGZsYWdzLCByYW5kb20sIHVuZGVmaW5lZCwgcHJvZ3Jlc3MsIHBhcnNlZC5zcG9pbGVyKTtcbiAgICBpZiAoZmlsbCkge1xuICAgICAgLy8gY29uc3QgbiA9IChpOiBudW1iZXIpID0+IHtcbiAgICAgIC8vICAgaWYgKGkgPj0gMHg3MCkgcmV0dXJuICdNaW1pYyc7XG4gICAgICAvLyAgIGNvbnN0IGl0ZW0gPSBwYXJzZWQuaXRlbXNbcGFyc2VkLml0ZW1HZXRzW2ldLml0ZW1JZF07XG4gICAgICAvLyAgIHJldHVybiBpdGVtID8gaXRlbS5tZXNzYWdlTmFtZSA6IGBpbnZhbGlkICR7aX1gO1xuICAgICAgLy8gfTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdpdGVtOiBzbG90Jyk7XG4gICAgICAvLyBmb3IgKGxldCBpID0gMDsgaSA8IGZpbGwuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vICAgaWYgKGZpbGwuaXRlbXNbaV0gIT0gbnVsbCkge1xuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGAkJHtoZXgoaSl9ICR7bihpKX06ICR7bihmaWxsLml0ZW1zW2ldKX0gJCR7aGV4KGZpbGwuaXRlbXNbaV0pfWApO1xuICAgICAgLy8gICB9XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIFRPRE8gLSBmaWxsIHRoZSBzcG9pbGVyIGxvZyFcblxuICAgICAgLy93LnRyYXZlcnNlKHcuZ3JhcGgsIGZpbGwpOyAvLyBmaWxsIHRoZSBzcG9pbGVyIChtYXkgYWxzbyB3YW50IHRvIGp1c3QgYmUgYSBzYW5pdHkgY2hlY2s/KVxuXG4gICAgICBmb3IgKGNvbnN0IFtzbG90LCBpdGVtXSBvZiBmaWxsKSB7XG4gICAgICAgIHBhcnNlZC5zbG90c1tzbG90ICYgMHhmZl0gPSBpdGVtICYgMHhmZjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtyb20sIC0xXTtcbiAgICAgIC8vY29uc29sZS5lcnJvcignQ09VTEQgTk9UIEZJTEwhJyk7XG4gICAgfVxuICB9XG4gIC8vY29uc29sZS5sb2coJ2ZpbGwnLCBmaWxsKTtcblxuICAvLyBUT0RPIC0gc2V0IG9taXRJdGVtR2V0RGF0YVN1ZmZpeCBhbmQgb21pdExvY2FsRGlhbG9nU3VmZml4XG4gIC8vYXdhaXQgc2h1ZmZsZURlcGdyYXBoKHBhcnNlZCwgcmFuZG9tLCBsb2csIGZsYWdzLCBwcm9ncmVzcyk7XG5cbiAgLy8gVE9ETyAtIHJld3JpdGUgcmVzY2FsZVNob3BzIHRvIHRha2UgYSBSb20gaW5zdGVhZCBvZiBhbiBhcnJheS4uLlxuICBpZiAoZmxhZ3Muc2h1ZmZsZVNob3BzKCkpIHtcbiAgICAvLyBUT0RPIC0gc2VwYXJhdGUgbG9naWMgZm9yIGhhbmRsaW5nIHNob3BzIHcvbyBQbiBzcGVjaWZpZWQgKGkuZS4gdmFuaWxsYVxuICAgIC8vIHNob3BzIHRoYXQgbWF5IGhhdmUgYmVlbiByYW5kb21pemVkKVxuICAgIHJlc2NhbGVTaG9wcyhwYXJzZWQsIGZsYWdzLmJhcmdhaW5IdW50aW5nKCkgPyByYW5kb20gOiB1bmRlZmluZWQpO1xuICB9XG5cbiAgLy8gTk9URTogbW9uc3RlciBzaHVmZmxlIG5lZWRzIHRvIGdvIGFmdGVyIGl0ZW0gc2h1ZmZsZSBiZWNhdXNlIG9mIG1pbWljXG4gIC8vIHBsYWNlbWVudCBjb25zdHJhaW50cywgYnV0IGl0IHdvdWxkIGJlIG5pY2UgdG8gZ28gYmVmb3JlIGluIG9yZGVyIHRvXG4gIC8vIGd1YXJhbnRlZSBtb25leS5cbiAgLy9pZGVudGlmeUtleUl0ZW1zRm9yRGlmZmljdWx0eUJ1ZmZzKHBhcnNlZCk7XG5cbiAgLy8gQnVmZiBtZWRpY2FsIGhlcmIgYW5kIGZydWl0IG9mIHBvd2VyXG4gIGlmIChmbGFncy5idWZmTWVkaWNhbEhlcmIoKSkge1xuICAgIHBhcnNlZC5pdGVtcy5NZWRpY2FsSGVyYi52YWx1ZSA9IDgwO1xuICAgIHBhcnNlZC5pdGVtcy5GcnVpdE9mUG93ZXIudmFsdWUgPSA1NjtcbiAgfVxuXG4gIGlmIChmbGFncy5zdG9yeU1vZGUoKSkgc3RvcnlNb2RlKHBhcnNlZCk7XG5cbiAgLy8gRG8gdGhpcyAqYWZ0ZXIqIHNodWZmbGluZyBwYWxldHRlc1xuICBpZiAoZmxhZ3MuYmxhY2tvdXRNb2RlKCkpIGJsYWNrb3V0TW9kZShwYXJzZWQpO1xuXG4gIG1pc2MocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgZml4RGlhbG9nKHBhcnNlZCk7XG4gIGZpeE1vdmVtZW50U2NyaXB0cyhwYXJzZWQpO1xuICBjaGVja1RyaWdnZXJzKHBhcnNlZCk7XG5cbiAgLy8gTk9URTogVGhpcyBuZWVkcyB0byBoYXBwZW4gQkVGT1JFIHBvc3RzaHVmZmxlXG4gIGlmIChmbGFncy5idWZmRHluYSgpKSBidWZmRHluYShwYXJzZWQsIGZsYWdzKTsgLy8gVE9ETyAtIGNvbmRpdGlvbmFsXG5cbiAgaWYgKGZsYWdzLnRyYWluZXIoKSkge1xuICAgIHBhcnNlZC53aWxkV2FycC5sb2NhdGlvbnMgPSBbXG4gICAgICAweDBhLCAvLyB2YW1waXJlXG4gICAgICAweDFhLCAvLyBzd2FtcC9pbnNlY3RcbiAgICAgIDB4MzUsIC8vIHN1bW1pdCBjYXZlXG4gICAgICAweDQ4LCAvLyBmb2cgbGFtcFxuICAgICAgMHg2ZCwgLy8gdmFtcGlyZSAyXG4gICAgICAweDZlLCAvLyBzYWJlcmEgMVxuICAgICAgMHg4YywgLy8gc2h5cm9uXG4gICAgICAweGFhLCAvLyBiZWhpbmQga2VsYmVzcXllIDJcbiAgICAgIDB4YWMsIC8vIHNhYmVyYSAyXG4gICAgICAweGIwLCAvLyBiZWhpbmQgbWFkbyAyXG4gICAgICAweGI2LCAvLyBrYXJtaW5lXG4gICAgICAweDlmLCAvLyBkcmF5Z29uIDFcbiAgICAgIDB4YTYsIC8vIGRyYXlnb24gMlxuICAgICAgMHg1OCwgLy8gdG93ZXJcbiAgICAgIDB4NWMsIC8vIHRvd2VyIG91dHNpZGUgbWVzaWFcbiAgICAgIDB4MDAsIC8vIG1lemFtZVxuICAgIF07XG4gIH1cblxuICBpZiAoZmxhZ3MucmFuZG9taXplTXVzaWMoJ2Vhcmx5JykpIHtcbiAgICBzaHVmZmxlTXVzaWMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgfVxuICBpZiAoZmxhZ3Muc2h1ZmZsZVRpbGVQYWxldHRlcygnZWFybHknKSkge1xuICAgIHNodWZmbGVQYWxldHRlcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB9XG4gIHVwZGF0ZVRhYmxlc1ByZUNvbW1pdChwYXJzZWQsIGZsYWdzKTtcbiAgcmFuZG9tLnNodWZmbGUocGFyc2VkLnJhbmRvbU51bWJlcnMudmFsdWVzKTtcblxuXG4gIC8vIGFzeW5jIGZ1bmN0aW9uIGFzc2VtYmxlKHBhdGg6IHN0cmluZykge1xuICAvLyAgIGFzbS5hc3NlbWJsZShhd2FpdCByZWFkZXIucmVhZChwYXRoKSwgcGF0aCwgcm9tKTtcbiAgLy8gfVxuXG4gIC8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwIHRvIG5vdCByZS1yZWFkIHRoZSBlbnRpcmUgdGhpbmcgdHdpY2UuXG4gIC8vIFByb2JhYmx5IGp1c3Qgd2FudCB0byBtb3ZlIHRoZSBvcHRpb25hbCBwYXNzZXMgaW50byBhIHNlcGFyYXRlXG4gIC8vIGZpbGUgdGhhdCBydW5zIGFmdGVyd2FyZHMgYWxsIG9uIGl0cyBvd24uXG5cbiAgYXN5bmMgZnVuY3Rpb24gYXNtKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpIHtcbiAgICBhc3luYyBmdW5jdGlvbiB0b2tlbml6ZXIocGF0aDogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gbmV3IFRva2VuaXplcihhd2FpdCByZWFkZXIucmVhZChwYXRoKSwgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHtsaW5lQ29udGludWF0aW9uczogdHJ1ZX0pO1xuICAgIH1cblxuICAgIGNvbnN0IGZsYWdGaWxlID0gZGVmaW5lcyhmbGFncywgcGFzcyk7XG4gICAgY29uc3QgYXNtID0gbmV3IEFzc2VtYmxlcihDcHUuUDAyKTtcbiAgICBjb25zdCB0b2tzID0gbmV3IFRva2VuU3RyZWFtKCk7XG4gICAgdG9rcy5lbnRlcihUb2tlblNvdXJjZS5jb25jYXQoXG4gICAgICAgIG5ldyBUb2tlbml6ZXIoZmxhZ0ZpbGUsICdmbGFncy5zJyksXG4gICAgICAgIGF3YWl0IHRva2VuaXplcignaW5pdC5zJyksXG4gICAgICAgIGF3YWl0IHRva2VuaXplcignYWxsb2MucycpLFxuICAgICAgICBhd2FpdCB0b2tlbml6ZXIoJ3ByZXNodWZmbGUucycpLFxuICAgICAgICBhd2FpdCB0b2tlbml6ZXIoJ3Bvc3RwYXJzZS5zJyksXG4gICAgICAgIGF3YWl0IHRva2VuaXplcigncG9zdHNodWZmbGUucycpKSk7XG4gICAgY29uc3QgcHJlID0gbmV3IFByZXByb2Nlc3Nvcih0b2tzLCBhc20pO1xuICAgIGFzbS50b2tlbnMocHJlKTtcbiAgICByZXR1cm4gYXNtLm1vZHVsZSgpO1xuICB9XG5cbi8vICAgICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKENwdS5QMDIpO1xuLy8gICAgIGNvbnN0IHRva3MgPSBuZXcgVG9rZW5TdHJlYW0oKTtcbi8vICAgICB0b2tzLmVudGVyKG5ldyBUb2tlbml6ZXIoY29kZSwgZmlsZSkpO1xuLy8gICAgIHRoaXMucHJlID0gbmV3IFByZXByb2Nlc3Nvcih0b2tzLCBhc20pO1xuLy8gICAgIHdoaWxlICh0aGlzLnByZS5uZXh0KCkpIHt9XG4vLyAgIH1cblxuLy8gICBhc3NlbWJsZShjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgcm9tOiBVaW50OEFycmF5KSB7XG4vLyAgICAgY29uc3QgYXNtID0gbmV3IEFzc2VtYmxlcihDcHUuUDAyKTtcbi8vICAgICBjb25zdCB0b2tzID0gbmV3IFRva2VuU3RyZWFtKCk7XG4vLyAgICAgdG9rcy5lbnRlcihuZXcgVG9rZW5pemVyKGNvZGUsIGZpbGUpKTtcbi8vICAgICBjb25zdCBwcmUgPSBuZXcgUHJlcHJvY2Vzc29yKHRva3MsIGFzbSwgdGhpcy5wcmUpO1xuLy8gICAgIGFzbS50b2tlbnMocHJlKTtcbi8vICAgICBjb25zdCBsaW5rID0gbmV3IExpbmtlcigpO1xuLy8gICAgIGxpbmsucmVhZChhc20ubW9kdWxlKCkpO1xuICBcbiAgLy8gY29uc3QgYXNtID0gbmV3IFNoaW1Bc3NlbWJsZXIoZmxhZ0ZpbGUsICdmbGFncy5zJyk7XG4vL2NvbnNvbGUubG9nKCdNdWx0aXBseTE2Qml0OicsIGFzbS5leHBhbmQoJ011bHRpcGx5MTZCaXQnKS50b1N0cmluZygxNikpO1xuICBwYXJzZWQubWVzc2FnZXMuY29tcHJlc3MoKTsgLy8gcHVsbCB0aGlzIG91dCB0byBtYWtlIHdyaXRlRGF0YSBhIHB1cmUgZnVuY3Rpb25cbiAgY29uc3QgcHJnQ29weSA9IHJvbS5zbGljZSgxNik7XG5cbiAgcGFyc2VkLm1vZHVsZXMuc2V0KEFTTSwgYXdhaXQgYXNtKCdlYXJseScpKTtcbiAgcGFyc2VkLndyaXRlRGF0YShwcmdDb3B5KTtcbiAgcGFyc2VkLm1vZHVsZXMuc2V0KEFTTSwgYXdhaXQgYXNtKCdsYXRlJykpO1xuXG4gIGNvbnN0IGhhc0dyYXBoaWNzID0gc3ByaXRlUmVwbGFjZW1lbnRzPy5zb21lKChzcHIpID0+IFNwcml0ZS5pc0N1c3RvbShzcHIpKSB8fCBmYWxzZTtcbiAgY29uc3QgY3JjID0gc3RhbXBWZXJzaW9uU2VlZEFuZEhhc2gocm9tLCBvcmlnaW5hbFNlZWQsIG9yaWdpbmFsRmxhZ1N0cmluZywgcHJnQ29weSwgaGFzR3JhcGhpY3MpO1xuXG5cbiAgLy8gRG8gb3B0aW9uYWwgcmFuZG9taXphdGlvbiBub3cuLi5cbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZU11c2ljKCdsYXRlJykpIHtcbiAgICBzaHVmZmxlTXVzaWMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgfVxuICBpZiAoZmxhZ3Mubm9NdXNpYygnbGF0ZScpKSB7XG4gICAgbm9NdXNpYyhwYXJzZWQpO1xuICB9XG4gIGlmIChmbGFncy5zaHVmZmxlVGlsZVBhbGV0dGVzKCdsYXRlJykpIHtcbiAgICBzaHVmZmxlUGFsZXR0ZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgfVxuXG4gIC8vIERvIHRoaXMgdmVyeSBsYXRlLCBzaW5jZSBpdCdzIGxvdy1sZXZlbCBvbiB0aGUgbG9jYXRpb25zLiAgTmVlZCB0byB3YWl0XG4gIC8vIHVudGlsIGFmdGVyIHRoZSBtZXRhbG9jYXRpb25zIGhhdmUgYmVlbiB3cml0dGVuIGJhY2sgdG8gdGhlIGxvY2F0aW9ucy5cbiAgZml4U2tpcHBhYmxlRXhpdHMocGFyc2VkKTtcblxuICBwYXJzZWQud3JpdGVEYXRhKCk7XG5cbiAgaWYgKEVYUEFORF9QUkcpIHtcbiAgICBjb25zdCBwcmcgPSByb20uc3ViYXJyYXkoMHgxMCk7XG4gICAgcHJnLnN1YmFycmF5KDB4N2MwMDAsIDB4ODAwMDApLnNldChwcmcuc3ViYXJyYXkoMHgzYzAwMCwgMHg0MDAwMCkpO1xuICB9XG4gIC8vIFRPRE8gLSBvcHRpb25hbCBmbGFncyBjYW4gcG9zc2libHkgZ28gaGVyZSwgYnV0IE1VU1QgTk9UIHVzZSBwYXJzZWQucHJnIVxuICBwYXRjaEdyYXBoaWNzKHJvbSwgc3ByaXRlUmVwbGFjZW1lbnRzKTtcbiAgcmV0dXJuIFtyb20sIGNyY107XG59XG5cbmZ1bmN0aW9uIG1pc2Mocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSkge1xuLy8gVE9ETyAtIHJlbW92ZSBoYWNrIHRvIHZpc3VhbGl6ZSBtYXBzIGZyb20gdGhlIGNvbnNvbGUuLi5cbi8vIChPYmplY3QuZ2V0UHJvdG90eXBlT2Yocm9tLmxvY2F0aW9uc1swXSkgYXMgYW55KS5zaG93ID0gZnVuY3Rpb24odHM6IHR5cGVvZiByb20ubWV0YXRpbGVzZXRzLnJpdmVyKSB7XG4vLyAgIGNvbnNvbGUubG9nKE1hemUuZnJvbSh0aGlzLCByYW5kb20sIHRzKS5zaG93KCkpO1xuLy8gfTtcblxuICBjb25zdCB7fSA9IHtyb20sIGZsYWdzLCByYW5kb219IGFzIGFueTtcbiAgLy8gTk9URTogd2Ugc3RpbGwgbmVlZCB0byBkbyBzb21lIHdvcmsgYWN0dWFsbHkgYWRqdXN0aW5nXG4gIC8vIG1lc3NhZ2UgdGV4dHMgdG8gcHJldmVudCBsaW5lIG92ZXJmbG93LCBldGMuICBXZSBzaG91bGRcbiAgLy8gYWxzbyBtYWtlIHNvbWUgaG9va3MgdG8gZWFzaWx5IHN3YXAgb3V0IGl0ZW1zIHdoZXJlIGl0XG4gIC8vIG1ha2VzIHNlbnNlLlxuICBjb25zdCBsZXZlbERvd25NZXNzYWdlID0gcm9tLm1lc3NhZ2VzLnBhcnRzWzFdWzJdO1xuICBsZXZlbERvd25NZXNzYWdlLnRleHQgPSBgXG4gICAgICBBaCBzaHVja3MuXG4gU29tZWhvdyB5b3UndmUgZG9uZSBpdFxuYW5kIGxvc3QgYSBsZXZlbC4gU28gc2FkLlxuYDtcblxuICByb20ubWVzc2FnZXMucGFydHNbMl1bMl0udGV4dCA9IGBcbnswMTpBa2FoYW5hfSBpcyBoYW5kZWQgYSBzdGF0dWUuI1xuVGhhbmtzIGZvciBmaW5kaW5nIHRoYXQuXG5JIHdhcyB0b3RhbGx5IGdvbm5hIHNlbGxcbml0IGZvciB0b25zIG9mIGNhc2guI1xuSGVyZSwgaGF2ZSB0aGlzIGxhbWVcblsyOTpHYXMgTWFza10gb3Igc29tZXRoaW5nLmA7XG4gIC8vIFRPRE8gLSB3b3VsZCBiZSBuaWNlIHRvIGFkZCBzb21lIG1vcmUgKGhpZ2hlciBsZXZlbCkgbWFya3VwLFxuICAvLyBlLmcuIGAke2Rlc2NyaWJlSXRlbShzbG90TnVtKX1gLiAgV2UgY291bGQgYWxzbyBhZGQgbWFya3VwXG4gIC8vIGZvciBlLmcuIGAke3NheVdhbnQoc2xvdE51bSl9YCBhbmQgYCR7c2F5VGhhbmtzKHNsb3ROdW0pfWBcbiAgLy8gaWYgd2Ugc2h1ZmZsZSB0aGUgd2FudGVkIGl0ZW1zLiAgVGhlc2UgY291bGQgYmUgcmFuZG9taXplZFxuICAvLyBpbiB2YXJpb3VzIHdheXMsIGFzIHdlbGwgYXMgaGF2aW5nIHNvbWUgYWRkaXRpb25hbCBiaXRzIGxpa2VcbiAgLy8gd2FudEF1eGlsaWFyeSguLi4pIGZvciBlLmcuIFwidGhlIGtpcmlzYSBwbGFudCBpcyAuLi5cIiAtIHRoZW5cbiAgLy8gaXQgY291bGQgaW5zdGVhZCBzYXkgXCJ0aGUgc3RhdHVlIG9mIG9ueXggaXMgLi4uXCIuXG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1swXVsweGVdLnRleHQgPSBgSXQncyBkYW5nZXJvdXMgdG8gZ28gYWxvbmUhIFRha2UgdGhpcy5gO1xuICByb20ubWVzc2FnZXMucGFydHNbMF1bMHhlXS5maXhUZXh0KCk7XG59O1xuXG5mdW5jdGlvbiBzaHVmZmxlU2hvcHMocm9tOiBSb20sIF9mbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgY29uc3Qgc2hvcHM6IHtbdHlwZTogbnVtYmVyXToge2NvbnRlbnRzOiBudW1iZXJbXSwgc2hvcHM6IFNob3BbXX19ID0ge1xuICAgIFtTaG9wVHlwZS5BUk1PUl06IHtjb250ZW50czogW10sIHNob3BzOiBbXX0sXG4gICAgW1Nob3BUeXBlLlRPT0xdOiB7Y29udGVudHM6IFtdLCBzaG9wczogW119LFxuICB9O1xuICAvLyBSZWFkIGFsbCB0aGUgY29udGVudHMuXG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoIXNob3AudXNlZCB8fCBzaG9wLmxvY2F0aW9uID09PSAweGZmKSBjb250aW51ZTtcbiAgICBjb25zdCBkYXRhID0gc2hvcHNbc2hvcC50eXBlXTtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgZGF0YS5jb250ZW50cy5wdXNoKC4uLnNob3AuY29udGVudHMuZmlsdGVyKHggPT4geCAhPT0gMHhmZikpO1xuICAgICAgZGF0YS5zaG9wcy5wdXNoKHNob3ApO1xuICAgICAgc2hvcC5jb250ZW50cyA9IFtdO1xuICAgIH1cbiAgfVxuICAvLyBTaHVmZmxlIHRoZSBjb250ZW50cy4gIFBpY2sgb3JkZXIgdG8gZHJvcCBpdGVtcyBpbi5cbiAgZm9yIChjb25zdCBkYXRhIG9mIE9iamVjdC52YWx1ZXMoc2hvcHMpKSB7XG4gICAgbGV0IHNsb3RzOiBTaG9wW10gfCBudWxsID0gbnVsbDtcbiAgICBjb25zdCBpdGVtcyA9IFsuLi5kYXRhLmNvbnRlbnRzXTtcbiAgICByYW5kb20uc2h1ZmZsZShpdGVtcyk7XG4gICAgd2hpbGUgKGl0ZW1zLmxlbmd0aCkge1xuICAgICAgaWYgKCFzbG90cyB8fCAhc2xvdHMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChzbG90cykgaXRlbXMuc2hpZnQoKTtcbiAgICAgICAgc2xvdHMgPSBbLi4uZGF0YS5zaG9wcywgLi4uZGF0YS5zaG9wcywgLi4uZGF0YS5zaG9wcywgLi4uZGF0YS5zaG9wc107XG4gICAgICAgIHJhbmRvbS5zaHVmZmxlKHNsb3RzKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1swXTtcbiAgICAgIGNvbnN0IHNob3AgPSBzbG90c1swXTtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzLmxlbmd0aCA8IDQgJiYgIXNob3AuY29udGVudHMuaW5jbHVkZXMoaXRlbSkpIHtcbiAgICAgICAgc2hvcC5jb250ZW50cy5wdXNoKGl0ZW0pO1xuICAgICAgICBpdGVtcy5zaGlmdCgpO1xuICAgICAgfVxuICAgICAgc2xvdHMuc2hpZnQoKTtcbiAgICB9XG4gIH1cbiAgLy8gU29ydCBhbmQgYWRkIDB4ZmYnc1xuICBmb3IgKGNvbnN0IGRhdGEgb2YgT2JqZWN0LnZhbHVlcyhzaG9wcykpIHtcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgZGF0YS5zaG9wcykge1xuICAgICAgd2hpbGUgKHNob3AuY29udGVudHMubGVuZ3RoIDwgNCkgc2hvcC5jb250ZW50cy5wdXNoKDB4ZmYpO1xuICAgICAgc2hvcC5jb250ZW50cy5zb3J0KChhLCBiKSA9PiBhIC0gYik7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogV2UgcmVhcnJhbmdlIGhvdyB3YWxscyBzcGF3biB0byBzdXBwb3J0IGN1c3RvbSBzaG9vdGluZyB3YWxscyxcbiAqIGFtb25nIG90aGVyIHRoaW5ncy4gIFRoZSBzaWduYWwgdG8gdGhlIGdhbWUgKGFuZCBsYXRlciBwYXNzZXMpXG4gKiB0aGF0IHdlJ3ZlIG1hZGUgdGhpcyBjaGFuZ2UgaXMgdG8gc2V0IHRoZSAweDIwIGJpdCBvbiB0aGUgM3JkXG4gKiBzcGF3biBieXRlIChpLmUuIHRoZSBzcGF3biB0eXBlKS5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlV2FsbFNwYXduRm9ybWF0KHJvbTogUm9tKSB7XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmICghbG9jYXRpb24udXNlZCkgY29udGludWU7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICBjb25zdCBlbGVtID0gc3Bhd24uaWQgJiAweGY7XG4gICAgICAgIHNwYXduLmlkID0gZWxlbSB8IChlbGVtIDw8IDQpO1xuICAgICAgICBjb25zdCBzaG9vdGluZyA9IHNwYXduLmlzU2hvb3RpbmdXYWxsKGxvY2F0aW9uKTtcbiAgICAgICAgc3Bhd24uZGF0YVsyXSA9IHNob290aW5nID8gMHgzMyA6IDB4MjM7XG4gICAgICAgIC8vIGNvbnN0IGlyb24gPSBzcGF3bi5pc0lyb25XYWxsKCk7XG4gICAgICAgIC8vIHNwYXduLmRhdGFbMl0gPSAweDIzIHwgKHNob290aW5nID8gMHgxMCA6IDApIHwgKGlyb24gPyAweDQwIDogMCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJhbmRvbWl6ZVdhbGxzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgLy8gTk9URTogV2UgY2FuIG1ha2UgYW55IHdhbGwgc2hvb3QgYnkgc2V0dGluZyBpdHMgJDEwIGJpdCBvbiB0aGUgdHlwZSBieXRlLlxuICAvLyBCdXQgdGhpcyBhbHNvIHJlcXVpcmVzIG1hdGNoaW5nIHBhdHRlcm4gdGFibGVzLCBzbyB3ZSdsbCBsZWF2ZSB0aGF0IGFsb25lXG4gIC8vIGZvciBub3cgdG8gYXZvaWQgZ3Jvc3MgZ3JhcGhpY3MuXG5cbiAgLy8gQWxsIG90aGVyIHdhbGxzIHdpbGwgbmVlZCB0aGVpciB0eXBlIG1vdmVkIGludG8gdGhlIHVwcGVyIG5pYmJsZSBhbmQgdGhlblxuICAvLyB0aGUgbmV3IGVsZW1lbnQgZ29lcyBpbiB0aGUgbG93ZXIgbmliYmxlLiAgU2luY2UgdGhlcmUgYXJlIHNvIGZldyBpcm9uXG4gIC8vIHdhbGxzLCB3ZSB3aWxsIGdpdmUgdGhlbSBhcmJpdHJhcnkgZWxlbWVudHMgaW5kZXBlbmRlbnQgb2YgdGhlIHBhbGV0dGUuXG4gIC8vIFJvY2svaWNlIHdhbGxzIGNhbiBhbHNvIGhhdmUgYW55IGVsZW1lbnQsIGJ1dCB0aGUgdGhpcmQgcGFsZXR0ZSB3aWxsXG4gIC8vIGluZGljYXRlIHdoYXQgdGhleSBleHBlY3QuXG5cbiAgaWYgKCFmbGFncy5yYW5kb21pemVXYWxscygpKSByZXR1cm47XG4gIC8vIEJhc2ljIHBsYW46IHBhcnRpdGlvbiBiYXNlZCBvbiBwYWxldHRlLCBsb29rIGZvciB3YWxscy5cbiAgY29uc3QgcGFscyA9IFtcbiAgICBbMHgwNSwgMHgzOF0sIC8vIHJvY2sgd2FsbCBwYWxldHRlc1xuICAgIFsweDExXSwgLy8gaWNlIHdhbGwgcGFsZXR0ZXNcbiAgICBbMHg2YV0sIC8vIFwiZW1iZXIgd2FsbFwiIHBhbGV0dGVzXG4gICAgWzB4MTRdLCAvLyBcImlyb24gd2FsbFwiIHBhbGV0dGVzXG4gIF07XG5cbiAgZnVuY3Rpb24gd2FsbFR5cGUoc3Bhd246IFNwYXduKTogbnVtYmVyIHtcbiAgICBpZiAoc3Bhd24uZGF0YVsyXSAmIDB4MjApIHtcbiAgICAgIHJldHVybiAoc3Bhd24uaWQgPj4+IDQpICYgMztcbiAgICB9XG4gICAgcmV0dXJuIHNwYXduLmlkICYgMztcbiAgfVxuXG4gIGNvbnN0IHBhcnRpdGlvbiA9IG5ldyBEZWZhdWx0TWFwPEFyZWEsIExvY2F0aW9uW10+KCgpID0+IFtdKTtcbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgcGFydGl0aW9uLmdldChsb2NhdGlvbi5kYXRhLmFyZWEpLnB1c2gobG9jYXRpb24pO1xuICB9XG4gIGZvciAoY29uc3QgbG9jYXRpb25zIG9mIHBhcnRpdGlvbi52YWx1ZXMoKSkge1xuICAgIC8vIHBpY2sgYSByYW5kb20gd2FsbCB0eXBlLlxuICAgIGNvbnN0IGVsdCA9IHJhbmRvbS5uZXh0SW50KDQpO1xuICAgIGNvbnN0IHBhbCA9IHJhbmRvbS5waWNrKHBhbHNbZWx0XSk7XG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBsb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICAgIGNvbnN0IHR5cGUgPSB3YWxsVHlwZShzcGF3bik7XG4gICAgICAgICAgaWYgKHR5cGUgPT09IDIpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICh0eXBlID09PSAzKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdFbHQgPSByYW5kb20ubmV4dEludCg0KTtcbiAgICAgICAgICAgIGlmIChyb20uc3BvaWxlcikgcm9tLnNwb2lsZXIuYWRkV2FsbChsb2NhdGlvbi5uYW1lLCB0eXBlLCBuZXdFbHQpO1xuICAgICAgICAgICAgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgICAgICAgICAgc3Bhd24uaWQgPSAweDMwIHwgbmV3RWx0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgJHtsb2NhdGlvbi5uYW1lfSAke3R5cGV9ID0+ICR7ZWx0fWApO1xuICAgICAgICAgICAgaWYgKCFmb3VuZCAmJiByb20uc3BvaWxlcikge1xuICAgICAgICAgICAgICByb20uc3BvaWxlci5hZGRXYWxsKGxvY2F0aW9uLm5hbWUsIHR5cGUsIGVsdCk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICAgICAgICAgIHNwYXduLmlkID0gdHlwZSA8PCA0IHwgZWx0O1xuICAgICAgICAgICAgbG9jYXRpb24udGlsZVBhbGV0dGVzWzJdID0gcGFsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBub011c2ljKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbSBvZiBbLi4ucm9tLmxvY2F0aW9ucywgLi4ucm9tLmJvc3Nlcy5tdXNpY3NdKSB7XG4gICAgbS5iZ20gPSAwO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNodWZmbGVNdXNpYyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGludGVyZmFjZSBIYXNNdXNpYyB7IGJnbTogbnVtYmVyOyB9XG4gIGNvbnN0IG11c2ljcyA9IG5ldyBEZWZhdWx0TWFwPHVua25vd24sIEhhc011c2ljW10+KCgpID0+IFtdKTtcbiAgY29uc3QgYWxsID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIGZvciAoY29uc3QgbCBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgaWYgKGwuaWQgPT09IDB4NWYgfHwgbC5pZCA9PT0gMCB8fCAhbC51c2VkKSBjb250aW51ZTsgLy8gc2tpcCBzdGFydCBhbmQgZHluYVxuICAgIGNvbnN0IG11c2ljID0gbC5tdXNpY0dyb3VwO1xuICAgIGFsbC5hZGQobC5iZ20pO1xuICAgIG11c2ljcy5nZXQobXVzaWMpLnB1c2gobCk7XG4gIH1cbiAgZm9yIChjb25zdCBiIG9mIHJvbS5ib3NzZXMubXVzaWNzKSB7XG4gICAgbXVzaWNzLnNldChiLCBbYl0pO1xuICAgIGFsbC5hZGQoYi5iZ20pO1xuICB9XG4gIGNvbnN0IGxpc3QgPSBbLi4uYWxsXTtcbiAgY29uc3QgdXBkYXRlZCA9IG5ldyBTZXQ8SGFzTXVzaWM+KCk7XG4gIGZvciAoY29uc3QgcGFydGl0aW9uIG9mIG11c2ljcy52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHZhbHVlID0gcmFuZG9tLnBpY2sobGlzdCk7XG4gICAgZm9yIChjb25zdCBtdXNpYyBvZiBwYXJ0aXRpb24pIHtcbiAgICAgIG11c2ljLmJnbSA9IHZhbHVlO1xuICAgICAgdXBkYXRlZC5hZGQobXVzaWMpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzaHVmZmxlV2lsZFdhcnAocm9tOiBSb20sIF9mbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgY29uc3QgbG9jYXRpb25zOiBMb2NhdGlvbltdID0gW107XG4gIGZvciAoY29uc3QgbCBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgaWYgKGwgJiYgbC51c2VkICYmXG4gICAgICAgIC8vIGRvbid0IGFkZCBtZXphbWUgYmVjYXVzZSB3ZSBhbHJlYWR5IGFkZCBpdCBhbHdheXNcbiAgICAgICAgbC5pZCAmJlxuICAgICAgICAvLyBkb24ndCB3YXJwIGludG8gc2hvcHNcbiAgICAgICAgIWwuaXNTaG9wKCkgJiZcbiAgICAgICAgLy8gZG9uJ3Qgd2FycCBpbnRvIHRvd2VyXG4gICAgICAgIChsLmlkICYgMHhmOCkgIT09IDB4NTggJiZcbiAgICAgICAgLy8gZG9uJ3Qgd2FycCB0byBlaXRoZXIgc2lkZSBvZiBEcmF5Z29uIDJcbiAgICAgICAgbCAhPT0gcm9tLmxvY2F0aW9ucy5DcnlwdF9EcmF5Z29uMiAmJlxuICAgICAgICBsICE9PSByb20ubG9jYXRpb25zLkNyeXB0X1RlbGVwb3J0ZXIgJiZcbiAgICAgICAgLy8gZG9uJ3Qgd2FycCBpbnRvIG1lc2lhIHNocmluZSBiZWNhdXNlIG9mIHF1ZWVuIGxvZ2ljXG4gICAgICAgIC8vIChhbmQgYmVjYXVzZSBpdCdzIGFubm95aW5nKVxuICAgICAgICBsICE9PSByb20ubG9jYXRpb25zLk1lc2lhU2hyaW5lICYmXG4gICAgICAgIC8vIGRvbid0IHdhcnAgaW50byByYWdlIGJlY2F1c2UgaXQncyBqdXN0IGFubm95aW5nXG4gICAgICAgIGwgIT09IHJvbS5sb2NhdGlvbnMuTGltZVRyZWVMYWtlKSB7XG4gICAgICBsb2NhdGlvbnMucHVzaChsKTtcbiAgICB9XG4gIH1cbiAgcmFuZG9tLnNodWZmbGUobG9jYXRpb25zKTtcbiAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucyA9IFtdO1xuICBmb3IgKGNvbnN0IGxvYyBvZiBbLi4ubG9jYXRpb25zLnNsaWNlKDAsIDE1KS5zb3J0KChhLCBiKSA9PiBhLmlkIC0gYi5pZCldKSB7XG4gICAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucy5wdXNoKGxvYy5pZCk7XG4gICAgaWYgKHJvbS5zcG9pbGVyKSByb20uc3BvaWxlci5hZGRXaWxkV2FycChsb2MuaWQsIGxvYy5uYW1lKTtcbiAgfVxuICByb20ud2lsZFdhcnAubG9jYXRpb25zLnB1c2goMCk7XG59XG5cbmZ1bmN0aW9uIGJ1ZmZEeW5hKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgcm9tLm9iamVjdHNbMHhiOF0uY29sbGlzaW9uUGxhbmUgPSAxO1xuICByb20ub2JqZWN0c1sweGI4XS5pbW1vYmlsZSA9IHRydWU7XG4gIHJvbS5vYmplY3RzWzB4YjldLmNvbGxpc2lvblBsYW5lID0gMTtcbiAgcm9tLm9iamVjdHNbMHhiOV0uaW1tb2JpbGUgPSB0cnVlO1xuICByb20ub2JqZWN0c1sweDMzXS5jb2xsaXNpb25QbGFuZSA9IDI7XG4gIHJvbS5hZEhvY1NwYXduc1sweDI4XS5zbG90UmFuZ2VMb3dlciA9IDB4MWM7IC8vIGNvdW50ZXJcbiAgcm9tLmFkSG9jU3Bhd25zWzB4MjldLnNsb3RSYW5nZVVwcGVyID0gMHgxYzsgLy8gbGFzZXJcbiAgcm9tLmFkSG9jU3Bhd25zWzB4MmFdLnNsb3RSYW5nZVVwcGVyID0gMHgxYzsgLy8gYnViYmxlXG59XG5cbmZ1bmN0aW9uIGJsYWNrb3V0TW9kZShyb206IFJvbSkge1xuICBjb25zdCBkZyA9IGdlbmVyYXRlRGVwZ3JhcGgoKTtcbiAgZm9yIChjb25zdCBub2RlIG9mIGRnLm5vZGVzKSB7XG4gICAgY29uc3QgdHlwZSA9IChub2RlIGFzIGFueSkudHlwZTtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gJ0xvY2F0aW9uJyAmJiAodHlwZSA9PT0gJ2NhdmUnIHx8IHR5cGUgPT09ICdmb3J0cmVzcycpKSB7XG4gICAgICByb20ubG9jYXRpb25zWyhub2RlIGFzIGFueSkuaWRdLnRpbGVQYWxldHRlcy5maWxsKDB4OWEpO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBzdG9yeU1vZGUgPSAocm9tOiBSb20pID0+IHtcbiAgLy8gc2h1ZmZsZSBoYXMgYWxyZWFkeSBoYXBwZW5lZCwgbmVlZCB0byB1c2Ugc2h1ZmZsZWQgZmxhZ3MgZnJvbVxuICAvLyBOUEMgc3Bhd24gY29uZGl0aW9ucy4uLlxuICBjb25zdCBjb25kaXRpb25zID0gW1xuICAgIC8vIE5vdGU6IGlmIGJvc3NlcyBhcmUgc2h1ZmZsZWQgd2UnbGwgbmVlZCB0byBkZXRlY3QgdGhpcy4uLlxuICAgIHJvbS5mbGFncy5LZWxiZXNxdWUxLmlkLFxuICAgIHJvbS5mbGFncy5TYWJlcmExLmlkLFxuICAgIHJvbS5mbGFncy5NYWRvMS5pZCxcbiAgICByb20uZmxhZ3MuS2VsYmVzcXVlMi5pZCxcbiAgICByb20uZmxhZ3MuU2FiZXJhMi5pZCxcbiAgICByb20uZmxhZ3MuTWFkbzIuaWQsXG4gICAgcm9tLmZsYWdzLkthcm1pbmUuaWQsXG4gICAgcm9tLmZsYWdzLkRyYXlnb24xLmlkLFxuICAgIHJvbS5mbGFncy5Td29yZE9mV2luZC5pZCxcbiAgICByb20uZmxhZ3MuU3dvcmRPZkZpcmUuaWQsXG4gICAgcm9tLmZsYWdzLlN3b3JkT2ZXYXRlci5pZCxcbiAgICByb20uZmxhZ3MuU3dvcmRPZlRodW5kZXIuaWQsXG4gICAgLy8gVE9ETyAtIHN0YXR1ZXMgb2YgbW9vbiBhbmQgc3VuIG1heSBiZSByZWxldmFudCBpZiBlbnRyYW5jZSBzaHVmZmxlP1xuICAgIC8vIFRPRE8gLSB2YW1waXJlcyBhbmQgaW5zZWN0P1xuICBdO1xuICByb20ubnBjc1sweGNiXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YTYpIS5wdXNoKC4uLmNvbmRpdGlvbnMpO1xufTtcblxuLy8gU3RhbXAgdGhlIFJPTVxuZXhwb3J0IGZ1bmN0aW9uIHN0YW1wVmVyc2lvblNlZWRBbmRIYXNoKHJvbTogVWludDhBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWVkOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ1N0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVhcmx5OiBVaW50OEFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0dyYXBoaWNzOiBib29sZWFuKTogbnVtYmVyIHtcbiAgLy8gVXNlIHVwIHRvIDI2IGJ5dGVzIHN0YXJ0aW5nIGF0IFBSRyAkMjVlYThcbiAgLy8gV291bGQgYmUgbmljZSB0byBzdG9yZSAoMSkgY29tbWl0LCAoMikgZmxhZ3MsICgzKSBzZWVkLCAoNCkgaGFzaFxuICAvLyBXZSBjYW4gdXNlIGJhc2U2NCBlbmNvZGluZyB0byBoZWxwIHNvbWUuLi5cbiAgLy8gRm9yIG5vdyBqdXN0IHN0aWNrIGluIHRoZSBjb21taXQgYW5kIHNlZWQgaW4gc2ltcGxlIGhleFxuICBjb25zdCBjcmMgPSBjcmMzMihlYXJseSk7XG4gIGNvbnN0IGNyY1N0cmluZyA9IGNyYy50b1N0cmluZygxNikucGFkU3RhcnQoOCwgJzAnKS50b1VwcGVyQ2FzZSgpO1xuICBjb25zdCBoYXNoID0gdmVyc2lvbi5TVEFUVVMgPT09ICd1bnN0YWJsZScgP1xuICAgICAgdmVyc2lvbi5IQVNILnN1YnN0cmluZygwLCA3KS5wYWRTdGFydCg3LCAnMCcpLnRvVXBwZXJDYXNlKCkgKyAnICAgICAnIDpcbiAgICAgIHZlcnNpb24uVkVSU0lPTi5zdWJzdHJpbmcoMCwgMTIpLnBhZEVuZCgxMiwgJyAnKTtcbiAgY29uc3Qgc2VlZFN0ciA9IHNlZWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgZW1iZWQgPSAoYWRkcjogbnVtYmVyLCAuLi52YWx1ZXM6IChzdHJpbmd8bnVtYmVyKVtdKSA9PiB7XG4gICAgYWRkciArPSAweDEwO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICBmb3IgKGNvbnN0IGMgb2YgdmFsdWUpIHtcbiAgICAgICAgICByb21bYWRkcisrXSA9IGMuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJvbVthZGRyKytdID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEJhZCB2YWx1ZTogJHt2YWx1ZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIGNvbnN0IGludGVyY2FsYXRlID0gKHMxOiBzdHJpbmcsIHMyOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgczEubGVuZ3RoIHx8IGkgPCBzMi5sZW5ndGg7IGkrKykge1xuICAgICAgb3V0LnB1c2goczFbaV0gfHwgJyAnKTtcbiAgICAgIG91dC5wdXNoKHMyW2ldIHx8ICcgJyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignJyk7XG4gIH07XG5cbiAgZW1iZWQoMHgyNzdjZiwgaW50ZXJjYWxhdGUoJyAgVkVSU0lPTiAgICAgU0VFRCAgICAgICcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAgICR7aGFzaH0ke3NlZWRTdHJ9YCkpO1xuXG4gIC8vIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA+IDM2KSBmbGFnU3RyaW5nID0gZmxhZ1N0cmluZy5yZXBsYWNlKC8gL2csICcnKTtcbiAgbGV0IGV4dHJhRmxhZ3M7XG4gIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA+IDQ2KSB7XG4gICAgaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gOTIpIHRocm93IG5ldyBFcnJvcignRmxhZyBzdHJpbmcgd2F5IHRvbyBsb25nIScpO1xuICAgIGV4dHJhRmxhZ3MgPSBmbGFnU3RyaW5nLnN1YnN0cmluZyg0NiwgOTIpLnBhZEVuZCg0NiwgJyAnKTtcbiAgICBmbGFnU3RyaW5nID0gZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgNDYpO1xuICB9XG4gIC8vIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA8PSAzNikge1xuICAvLyAgIC8vIGF0dGVtcHQgdG8gYnJlYWsgaXQgbW9yZSBmYXZvcmFibHlcblxuICAvLyB9XG4gIC8vICAgZmxhZ1N0cmluZyA9IFsnRkxBR1MgJyxcbiAgLy8gICAgICAgICAgICAgICAgIGZsYWdTdHJpbmcuc3Vic3RyaW5nKDAsIDE4KS5wYWRFbmQoMTgsICcgJyksXG4gIC8vICAgICAgICAgICAgICAgICAnICAgICAgJyxcblxuICAvLyB9XG5cbiAgZmxhZ1N0cmluZyA9IGZsYWdTdHJpbmcucGFkRW5kKDQ2LCAnICcpO1xuXG4gIGVtYmVkKDB4Mjc3ZmYsIGludGVyY2FsYXRlKGZsYWdTdHJpbmcuc3Vic3RyaW5nKDAsIDIzKSwgZmxhZ1N0cmluZy5zdWJzdHJpbmcoMjMpKSk7XG4gIGlmIChleHRyYUZsYWdzKSB7XG4gICAgZW1iZWQoMHgyNzgyZiwgaW50ZXJjYWxhdGUoZXh0cmFGbGFncy5zdWJzdHJpbmcoMCwgMjMpLCBleHRyYUZsYWdzLnN1YnN0cmluZygyMykpKTtcbiAgfVxuICBpZiAoaGFzR3JhcGhpY3MpIHtcbiAgICAvLyA3ZSBpcyB0aGUgU1AgY2hhciBkZW5vdGluZyBhIFNwcml0ZSBQYWNrIHdhcyBhcHBsaWVkXG4gICAgZW1iZWQoMHgyNzg4MywgMHg3ZSk7XG4gIH1cbiAgZW1iZWQoMHgyNzg4NSwgaW50ZXJjYWxhdGUoY3JjU3RyaW5nLnN1YnN0cmluZygwLCA0KSwgY3JjU3RyaW5nLnN1YnN0cmluZyg0KSkpO1xuXG4gIC8vIGVtYmVkKDB4MjVlYTgsIGB2LiR7aGFzaH0gICAke3NlZWR9YCk7XG4gIGVtYmVkKDB4MjU3MTYsICdSQU5ET01JWkVSJyk7XG4gIGlmICh2ZXJzaW9uLlNUQVRVUyA9PT0gJ3Vuc3RhYmxlJykgZW1iZWQoMHgyNTczYywgJ0JFVEEnKTtcbiAgLy8gTk9URTogaXQgd291bGQgYmUgcG9zc2libGUgdG8gYWRkIHRoZSBoYXNoL3NlZWQvZXRjIHRvIHRoZSB0aXRsZVxuICAvLyBwYWdlIGFzIHdlbGwsIGJ1dCB3ZSdkIG5lZWQgdG8gcmVwbGFjZSB0aGUgdW51c2VkIGxldHRlcnMgaW4gYmFua1xuICAvLyAkMWQgd2l0aCB0aGUgbWlzc2luZyBudW1iZXJzIChKLCBRLCBXLCBYKSwgYXMgd2VsbCBhcyB0aGUgdHdvXG4gIC8vIHdlaXJkIHNxdWFyZXMgYXQgJDViIGFuZCAkNWMgdGhhdCBkb24ndCBhcHBlYXIgdG8gYmUgdXNlZC4gIFRvZ2V0aGVyXG4gIC8vIHdpdGggdXNpbmcgdGhlIGxldHRlciAnTycgYXMgMCwgdGhhdCdzIHN1ZmZpY2llbnQgdG8gY3JhbSBpbiBhbGwgdGhlXG4gIC8vIG51bWJlcnMgYW5kIGRpc3BsYXkgYXJiaXRyYXJ5IGhleCBkaWdpdHMuXG5cbiAgcmV0dXJuIGNyYztcbn1cblxuZnVuY3Rpb24gdXBkYXRlVGFibGVzUHJlQ29tbWl0KHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICAvLyBDaGFuZ2Ugc29tZSBlbmVteSBzY2FsaW5nIGZyb20gdGhlIGRlZmF1bHQsIGlmIGZsYWdzIGFzayBmb3IgaXQuXG4gIGlmIChmbGFncy5kZWNyZWFzZUVuZW15RGFtYWdlKCkpIHtcbiAgICByb20uc2NhbGluZy5zZXRQaHBGb3JtdWxhKHMgPT4gMTYgKyA2ICogcyk7XG4gIH1cbiAgcm9tLnNjYWxpbmcuc2V0RXhwU2NhbGluZ0ZhY3RvcihmbGFncy5leHBTY2FsaW5nRmFjdG9yKCkpO1xuXG4gIC8vIFVwZGF0ZSB0aGUgY29pbiBkcm9wIGJ1Y2tldHMgKGdvZXMgd2l0aCBlbmVteSBzdGF0IHJlY29tcHV0YXRpb25zXG4gIC8vIGluIHBvc3RzaHVmZmxlLnMpXG4gIGlmIChmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpKSB7XG4gICAgLy8gYmlnZ2VyIGdvbGQgZHJvcHMgaWYgbm8gc2hvcCBnbGl0Y2gsIHBhcnRpY3VsYXJseSBhdCB0aGUgc3RhcnRcbiAgICAvLyAtIHN0YXJ0cyBvdXQgZmlib25hY2NpLCB0aGVuIGdvZXMgbGluZWFyIGF0IDYwMFxuICAgIHJvbS5jb2luRHJvcHMudmFsdWVzID0gW1xuICAgICAgICAwLCAgIDUsICAxMCwgIDE1LCAgMjUsICA0MCwgIDY1LCAgMTA1LFxuICAgICAgMTcwLCAyNzUsIDQ0NSwgNjAwLCA3MDAsIDgwMCwgOTAwLCAxMDAwLFxuICAgIF07XG4gIH0gZWxzZSB7XG4gICAgLy8gdGhpcyB0YWJsZSBpcyBiYXNpY2FsbHkgbWVhbmluZ2xlc3MgYi9jIHNob3AgZ2xpdGNoXG4gICAgcm9tLmNvaW5Ecm9wcy52YWx1ZXMgPSBbXG4gICAgICAgIDAsICAgMSwgICAyLCAgIDQsICAgOCwgIDE2LCAgMzAsICA1MCxcbiAgICAgIDEwMCwgMjAwLCAzMDAsIDQwMCwgNTAwLCA2MDAsIDcwMCwgODAwLFxuICAgIF07XG4gIH1cblxuICAvLyBVcGRhdGUgc2hpZWxkIGFuZCBhcm1vciBkZWZlbnNlIHZhbHVlcy5cbiAgLy8gU29tZSBvZiB0aGUgXCJtaWRkbGVcIiBzaGllbGRzIGFyZSAyIHBvaW50cyB3ZWFrZXIgdGhhbiB0aGUgY29ycmVzcG9uZGluZ1xuICAvLyBhcm1vcnMuICBJZiB3ZSBpbnN0ZWFkIGF2ZXJhZ2UgdGhlIHNoaWVsZC9hcm1vciB2YWx1ZXMgYW5kIGJ1bXAgKzEgZm9yXG4gIC8vIHRoZSBjYXJhcGFjZSBsZXZlbCwgd2UgZ2V0IGEgcHJldHR5IGRlY2VudCBwcm9ncmVzc2lvbjogMywgNiwgOSwgMTMsIDE4LFxuICAvLyB3aGljaCBpcyArMywgKzMsICszLCArNCwgKzUuXG4gIHJvbS5pdGVtcy5DYXJhcGFjZVNoaWVsZC5kZWZlbnNlID0gcm9tLml0ZW1zLlRhbm5lZEhpZGUuZGVmZW5zZSA9IDM7XG4gIHJvbS5pdGVtcy5QbGF0aW51bVNoaWVsZC5kZWZlbnNlID0gcm9tLml0ZW1zLkJyb256ZUFybW9yLmRlZmVuc2UgPSA5O1xuICByb20uaXRlbXMuTWlycm9yZWRTaGllbGQuZGVmZW5zZSA9IHJvbS5pdGVtcy5QbGF0aW51bUFybW9yLmRlZmVuc2UgPSAxMztcbiAgLy8gRm9yIHRoZSBoaWdoLWVuZCBhcm1vcnMsIHdlIHdhbnQgdG8gYmFsYW5jZSBvdXQgdGhlIHRvcCB0aHJlZSBhIGJpdFxuICAvLyBiZXR0ZXIuICBTYWNyZWQgc2hpZWxkIGFscmVhZHkgaGFzIGxvd2VyIGRlZmVuc2UgKDE2KSB0aGFuIHRoZSBwcmV2aW91c1xuICAvLyBvbmUsIGFzIGRvZXMgYmF0dGxlIGFybW9yICgyMCksIHNvIHdlIGxlYXZlIHRoZW0gYmUuICBQc3ljaG9zIGFyZVxuICAvLyBkZW1vdGVkIGZyb20gMzIgdG8gMjAsIGFuZCB0aGUgbm8tZXh0cmEtcG93ZXIgYXJtb3JzIGdldCB0aGUgMzIuXG4gIHJvbS5pdGVtcy5Qc3ljaG9Bcm1vci5kZWZlbnNlID0gcm9tLml0ZW1zLlBzeWNob1NoaWVsZC5kZWZlbnNlID0gMjA7XG4gIHJvbS5pdGVtcy5DZXJhbWljU3VpdC5kZWZlbnNlID0gcm9tLml0ZW1zLkJhdHRsZVNoaWVsZC5kZWZlbnNlID0gMzI7XG5cbiAgLy8gQlVULi4uIGZvciBub3cgd2UgZG9uJ3Qgd2FudCB0byBtYWtlIGFueSBjaGFuZ2VzLCBzbyBmaXggaXQgYmFjay5cbiAgcm9tLml0ZW1zLkNhcmFwYWNlU2hpZWxkLmRlZmVuc2UgPSByb20uaXRlbXMuVGFubmVkSGlkZS5kZWZlbnNlID0gMjtcbiAgcm9tLml0ZW1zLlBsYXRpbnVtU2hpZWxkLmRlZmVuc2UgPSByb20uaXRlbXMuQnJvbnplQXJtb3IuZGVmZW5zZSA9IDEwO1xuICByb20uaXRlbXMuTWlycm9yZWRTaGllbGQuZGVmZW5zZSA9IHJvbS5pdGVtcy5QbGF0aW51bUFybW9yLmRlZmVuc2UgPSAxNDtcbiAgcm9tLml0ZW1zLkJhdHRsZUFybW9yLmRlZmVuc2UgPSAyNDtcbn1cblxuY29uc3QgcmVzY2FsZVNob3BzID0gKHJvbTogUm9tLCByYW5kb20/OiBSYW5kb20pID0+IHtcbiAgLy8gUG9wdWxhdGUgcmVzY2FsZWQgcHJpY2VzIGludG8gdGhlIHZhcmlvdXMgcm9tIGxvY2F0aW9ucy5cbiAgLy8gU3BlY2lmaWNhbGx5LCB3ZSByZWFkIHRoZSBhdmFpbGFibGUgaXRlbSBJRHMgb3V0IG9mIHRoZVxuICAvLyBzaG9wIHRhYmxlcyBhbmQgdGhlbiBjb21wdXRlIG5ldyBwcmljZXMgZnJvbSB0aGVyZS5cbiAgLy8gSWYgYHJhbmRvbWAgaXMgcGFzc2VkIHRoZW4gdGhlIGJhc2UgcHJpY2UgdG8gYnV5IGVhY2hcbiAgLy8gaXRlbSBhdCBhbnkgZ2l2ZW4gc2hvcCB3aWxsIGJlIGFkanVzdGVkIHRvIGFueXdoZXJlIGZyb21cbiAgLy8gNTAlIHRvIDE1MCUgb2YgdGhlIGJhc2UgcHJpY2UuICBUaGUgcGF3biBzaG9wIHByaWNlIGlzXG4gIC8vIGFsd2F5cyA1MCUgb2YgdGhlIGJhc2UgcHJpY2UuXG5cbiAgZm9yIChjb25zdCBzaG9wIG9mIHJvbS5zaG9wcykge1xuICAgIGlmIChzaG9wLnR5cGUgPT09IFNob3BUeXBlLlBBV04pIGNvbnRpbnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzaG9wLnByaWNlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHNob3AuY29udGVudHNbaV0gPCAweDgwKSB7XG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gcmFuZG9tID8gcmFuZG9tLm5leHROb3JtYWwoMSwgMC4zLCAwLjUsIDEuNSkgOiAxO1xuICAgICAgfSBlbHNlIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLklOTikge1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBqdXN0IHNldCB0aGUgb25lIHByaWNlXG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gcmFuZG9tID8gcmFuZG9tLm5leHROb3JtYWwoMSwgMC41LCAwLjM3NSwgMS42MjUpIDogMTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gQWxzbyBmaWxsIHRoZSBzY2FsaW5nIHRhYmxlcy5cbiAgY29uc3QgZGlmZiA9IHNlcSg0OCAvKmFzbS5leHBhbmQoJ1NjYWxpbmdMZXZlbHMnKSovLCB4ID0+IHgpO1xuICByb20uc2hvcHMucmVzY2FsZSA9IHRydWU7XG4gIC8vIFRvb2wgc2hvcHMgc2NhbGUgYXMgMiAqKiAoRGlmZiAvIDEwKSwgc3RvcmUgaW4gOHRoc1xuICByb20uc2hvcHMudG9vbFNob3BTY2FsaW5nID0gZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDggKiAoMiAqKiAoZCAvIDEwKSkpKTtcbiAgLy8gQXJtb3Igc2hvcHMgc2NhbGUgYXMgMiAqKiAoKDQ3IC0gRGlmZikgLyAxMiksIHN0b3JlIGluIDh0aHNcbiAgcm9tLnNob3BzLmFybW9yU2hvcFNjYWxpbmcgPVxuICAgICAgZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDggKiAoMiAqKiAoKDQ3IC0gZCkgLyAxMikpKSk7XG5cbiAgLy8gU2V0IHRoZSBpdGVtIGJhc2UgcHJpY2VzLlxuICBmb3IgKGxldCBpID0gMHgwZDsgaSA8IDB4Mjc7IGkrKykge1xuICAgIHJvbS5pdGVtc1tpXS5iYXNlUHJpY2UgPSBCQVNFX1BSSUNFU1tpXTtcbiAgfVxuIFxuIC8vIFRPRE8gLSBzZXBhcmF0ZSBmbGFnIGZvciByZXNjYWxpbmcgbW9uc3RlcnM/Pz9cbn07XG5cbi8vIE1hcCBvZiBiYXNlIHByaWNlcy4gIChUb29scyBhcmUgcG9zaXRpdmUsIGFybW9ycyBhcmUgb25lcy1jb21wbGVtZW50LilcbmNvbnN0IEJBU0VfUFJJQ0VTOiB7W2l0ZW1JZDogbnVtYmVyXTogbnVtYmVyfSA9IHtcbiAgLy8gQXJtb3JzXG4gIDB4MGQ6IDQsICAgIC8vIGNhcmFwYWNlIHNoaWVsZFxuICAweDBlOiAxNiwgICAvLyBicm9uemUgc2hpZWxkXG4gIDB4MGY6IDUwLCAgIC8vIHBsYXRpbnVtIHNoaWVsZFxuICAweDEwOiAzMjUsICAvLyBtaXJyb3JlZCBzaGllbGRcbiAgMHgxMTogMTAwMCwgLy8gY2VyYW1pYyBzaGllbGRcbiAgMHgxMjogMjAwMCwgLy8gc2FjcmVkIHNoaWVsZFxuICAweDEzOiA0MDAwLCAvLyBiYXR0bGUgc2hpZWxkXG4gIDB4MTU6IDYsICAgIC8vIHRhbm5lZCBoaWRlXG4gIDB4MTY6IDIwLCAgIC8vIGxlYXRoZXIgYXJtb3JcbiAgMHgxNzogNzUsICAgLy8gYnJvbnplIGFybW9yXG4gIDB4MTg6IDI1MCwgIC8vIHBsYXRpbnVtIGFybW9yXG4gIDB4MTk6IDEwMDAsIC8vIHNvbGRpZXIgc3VpdFxuICAweDFhOiA0ODAwLCAvLyBjZXJhbWljIHN1aXRcbiAgLy8gVG9vbHNcbiAgMHgxZDogMjUsICAgLy8gbWVkaWNhbCBoZXJiXG4gIDB4MWU6IDMwLCAgIC8vIGFudGlkb3RlXG4gIDB4MWY6IDQ1LCAgIC8vIGx5c2lzIHBsYW50XG4gIDB4MjA6IDQwLCAgIC8vIGZydWl0IG9mIGxpbWVcbiAgMHgyMTogMzYsICAgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgMHgyMjogMjAwLCAgLy8gbWFnaWMgcmluZ1xuICAweDIzOiAxNTAsICAvLyBmcnVpdCBvZiByZXB1blxuICAweDI0OiA2NSwgICAvLyB3YXJwIGJvb3RzXG4gIDB4MjY6IDMwMCwgIC8vIG9wZWwgc3RhdHVlXG4gIC8vIDB4MzE6IDUwLCAvLyBhbGFybSBmbHV0ZVxufTtcblxuLy8vLy8vLy8vXG4vLy8vLy8vLy9cbi8vLy8vLy8vL1xuXG4vLyBjb25zdCBpZGVudGlmeUtleUl0ZW1zRm9yRGlmZmljdWx0eUJ1ZmZzID0gKHJvbTogUm9tKSA9PiB7XG4vLyAgIC8vIC8vIFRhZyBrZXkgaXRlbXMgZm9yIGRpZmZpY3VsdHkgYnVmZnNcbi8vICAgLy8gZm9yIChjb25zdCBnZXQgb2Ygcm9tLml0ZW1HZXRzKSB7XG4vLyAgIC8vICAgY29uc3QgaXRlbSA9IElURU1TLmdldChnZXQuaXRlbUlkKTtcbi8vICAgLy8gICBpZiAoIWl0ZW0gfHwgIWl0ZW0ua2V5KSBjb250aW51ZTtcbi8vICAgLy8gICBnZXQua2V5ID0gdHJ1ZTtcbi8vICAgLy8gfVxuLy8gICAvLyAvLyBjb25zb2xlLmxvZyhyZXBvcnQpO1xuLy8gICBmb3IgKGxldCBpID0gMDsgaSA8IDB4NDk7IGkrKykge1xuLy8gICAgIC8vIE5PVEUgLSBzcGVjaWFsIGhhbmRsaW5nIGZvciBhbGFybSBmbHV0ZSB1bnRpbCB3ZSBwcmUtcGF0Y2hcbi8vICAgICBjb25zdCB1bmlxdWUgPSAocm9tLnByZ1sweDIwZmYwICsgaV0gJiAweDQwKSB8fCBpID09PSAweDMxO1xuLy8gICAgIGNvbnN0IGJpdCA9IDEgPDwgKGkgJiA3KTtcbi8vICAgICBjb25zdCBhZGRyID0gMHgxZTExMCArIChpID4+PiAzKTtcbi8vICAgICByb20ucHJnW2FkZHJdID0gcm9tLnByZ1thZGRyXSAmIH5iaXQgfCAodW5pcXVlID8gYml0IDogMCk7XG4vLyAgIH1cbi8vIH07XG5cbi8vIFdoZW4gZGVhbGluZyB3aXRoIGNvbnN0cmFpbnRzLCBpdCdzIGJhc2ljYWxseSBrc2F0XG4vLyAgLSB3ZSBoYXZlIGEgbGlzdCBvZiByZXF1aXJlbWVudHMgdGhhdCBhcmUgQU5EZWQgdG9nZXRoZXJcbi8vICAtIGVhY2ggaXMgYSBsaXN0IG9mIHByZWRpY2F0ZXMgdGhhdCBhcmUgT1JlZCB0b2dldGhlclxuLy8gIC0gZWFjaCBwcmVkaWNhdGUgaGFzIGEgY29udGludWF0aW9uIGZvciB3aGVuIGl0J3MgcGlja2VkXG4vLyAgLSBuZWVkIGEgd2F5IHRvIHRoaW4gdGhlIGNyb3dkLCBlZmZpY2llbnRseSBjaGVjayBjb21wYXQsIGV0Y1xuLy8gUHJlZGljYXRlIGlzIGEgZm91ci1lbGVtZW50IGFycmF5IFtwYXQwLHBhdDEscGFsMixwYWwzXVxuLy8gUmF0aGVyIHRoYW4gYSBjb250aW51YXRpb24gd2UgY291bGQgZ28gdGhyb3VnaCBhbGwgdGhlIHNsb3RzIGFnYWluXG5cbi8vIGNsYXNzIENvbnN0cmFpbnRzIHtcbi8vICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgLy8gQXJyYXkgb2YgcGF0dGVybiB0YWJsZSBvcHRpb25zLiAgTnVsbCBpbmRpY2F0ZXMgdGhhdCBpdCBjYW4gYmUgYW55dGhpbmcuXG4vLyAgICAgLy9cbi8vICAgICB0aGlzLnBhdHRlcm5zID0gW1tudWxsLCBudWxsXV07XG4vLyAgICAgdGhpcy5wYWxldHRlcyA9IFtbbnVsbCwgbnVsbF1dO1xuLy8gICAgIHRoaXMuZmx5ZXJzID0gMDtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVUcmVhc3VyZUNoZXN0KCkge1xuLy8gICAgIHRoaXMucmVxdWlyZU9yZGVyZWRTbG90KDAsIFRSRUFTVVJFX0NIRVNUX0JBTktTKTtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVPcmRlcmVkU2xvdChzbG90LCBzZXQpIHtcblxuLy8gICAgIGlmICghdGhpcy5vcmRlcmVkKSB7XG5cbi8vICAgICB9XG4vLyAvLyBUT0RPXG4vLyAgICAgdGhpcy5wYXQwID0gaW50ZXJzZWN0KHRoaXMucGF0MCwgc2V0KTtcblxuLy8gICB9XG5cbi8vIH1cblxuLy8gY29uc3QgaW50ZXJzZWN0ID0gKGxlZnQsIHJpZ2h0KSA9PiB7XG4vLyAgIGlmICghcmlnaHQpIHRocm93IG5ldyBFcnJvcigncmlnaHQgbXVzdCBiZSBub250cml2aWFsJyk7XG4vLyAgIGlmICghbGVmdCkgcmV0dXJuIHJpZ2h0O1xuLy8gICBjb25zdCBvdXQgPSBuZXcgU2V0KCk7XG4vLyAgIGZvciAoY29uc3QgeCBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0Lmhhcyh4KSkgb3V0LmFkZCh4KTtcbi8vICAgfVxuLy8gICByZXR1cm4gb3V0O1xuLy8gfVxuXG5cbi8vIHVzZWZ1bCBmb3IgZGVidWcgZXZlbiBpZiBub3QgY3VycmVudGx5IHVzZWRcbmNvbnN0IFtdID0gW2hleF07XG4iXX0=