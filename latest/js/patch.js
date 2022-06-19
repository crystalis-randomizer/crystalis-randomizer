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
import { misspellItems } from './pass/misspellitems.js';
import { writeLocationsFromMeta } from './pass/writelocationsfrommeta.js';
import { Random } from './random.js';
import { Rom } from './rom.js';
import { fixTilesets } from './rom/screenfix.js';
import { ShopType } from './rom/shop.js';
import { Spoiler } from './rom/spoiler.js';
import { hex, seq, watchArray } from './rom/util.js';
import { DefaultMap } from './util.js';
import * as version from './version.js';
import { shuffleAreas } from './pass/shuffleareas.js';
import { checkTriggers } from './pass/checktriggers.js';
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
        _DISPLAY_DIFFICULTY: true,
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
        _TWELVTH_WARP_POINT: true,
        _UNIDENTIFIED_ITEMS: flags.unidentifiedItems(),
        _UPDATE_HUD: flags.shouldUpdateHud(),
        _ZEBU_STUDENT_GIVES_ITEM: flags.zebuStudentGivesItem(),
    };
    return Object.keys(defines)
        .filter(d => defines[d]).map(d => `.define ${d} 1\n`).join('');
}
export async function shuffle(rom, seed, originalFlags, reader, log, progress) {
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
    const attemptErrors = [];
    for (let i = 0; i < 5; i++) {
        try {
            return await shuffleInternal(rom, originalFlags, seed, random, reader, log, progress);
        }
        catch (error) {
            attemptErrors.push(error);
            console.error(`Attempt ${i + 1} failed: ${error.stack}`);
        }
    }
    throw new Error(`Shuffle failed: ${attemptErrors.map(e => e.stack).join('\n\n')}`);
}
async function shuffleInternal(rom, originalFlags, originalSeed, random, reader, log, progress) {
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
    misspellItems(parsed, flags, random);
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
    parsed.modules.push(await asm('early'));
    parsed.writeData(prgCopy);
    parsed.modules.pop();
    parsed.modules.push(await asm('late'));
    const crc = stampVersionSeedAndHash(rom, originalSeed, originalFlagString, prgCopy);
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
export function stampVersionSeedAndHash(rom, seed, flagString, early) {
    const crc = crc32(early);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDbkMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFtQixRQUFRLElBQUksZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdkMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFB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LEVBQUcsRUFBRSxFQUFHLEVBQUUsRUFBRyxFQUFFO1lBQ3RDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO1NBQ3ZDLENBQUM7S0FDSDtJQU9ELEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ3BFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ3JFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBS3hFLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBQ3BFLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBR3BFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ3BFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBQ3RFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBQ3hF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Q1IsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxHQUFHO0lBQ1QsSUFBSSxFQUFFLEdBQUc7SUFDVCxJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxHQUFHO0NBRVYsQ0FBQztBQW9FRixNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXNzZW1ibGVyIH0gZnJvbSAnLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7IENwdSB9IGZyb20gJy4vYXNtL2NwdS5qcyc7XG5pbXBvcnQgeyBQcmVwcm9jZXNzb3IgfSBmcm9tICcuL2FzbS9wcmVwcm9jZXNzb3IuanMnO1xuaW1wb3J0IHsgVG9rZW5Tb3VyY2UgfSBmcm9tICcuL2FzbS90b2tlbi5qcyc7XG5pbXBvcnQgeyBUb2tlblN0cmVhbSB9IGZyb20gJy4vYXNtL3Rva2Vuc3RyZWFtLmpzJztcbmltcG9ydCB7IFRva2VuaXplciB9IGZyb20gJy4vYXNtL3Rva2VuaXplci5qcyc7XG5pbXBvcnQgeyBjcmMzMiB9IGZyb20gJy4vY3JjMzIuanMnO1xuaW1wb3J0IHsgUHJvZ3Jlc3NUcmFja2VyLCBnZW5lcmF0ZSBhcyBnZW5lcmF0ZURlcGdyYXBoIH0gZnJvbSAnLi9kZXBncmFwaC5qcyc7XG5pbXBvcnQgeyBGZXRjaFJlYWRlciB9IGZyb20gJy4vZmV0Y2hyZWFkZXIuanMnO1xuaW1wb3J0IHsgRmxhZ1NldCB9IGZyb20gJy4vZmxhZ3NldC5qcyc7XG5pbXBvcnQgeyBHcmFwaCB9IGZyb20gJy4vbG9naWMvZ3JhcGguanMnO1xuaW1wb3J0IHsgV29ybGQgfSBmcm9tICcuL2xvZ2ljL3dvcmxkLmpzJztcbmltcG9ydCB7IGNvbXByZXNzTWFwRGF0YSwgbW92ZVNjcmVlbnNJbnRvRXhwYW5kZWRSb20gfSBmcm9tICcuL3Bhc3MvY29tcHJlc3NtYXBkYXRhLmpzJztcbmltcG9ydCB7IGNydW1ibGluZ1BsYXRmb3JtcyB9IGZyb20gJy4vcGFzcy9jcnVtYmxpbmdwbGF0Zm9ybXMuanMnO1xuaW1wb3J0IHsgZGV0ZXJtaW5pc3RpYywgZGV0ZXJtaW5pc3RpY1ByZVBhcnNlIH0gZnJvbSAnLi9wYXNzL2RldGVybWluaXN0aWMuanMnO1xuaW1wb3J0IHsgZml4RGlhbG9nIH0gZnJvbSAnLi9wYXNzL2ZpeGRpYWxvZy5qcyc7XG5pbXBvcnQgeyBmaXhFbnRyYW5jZVRyaWdnZXJzIH0gZnJvbSAnLi9wYXNzL2ZpeGVudHJhbmNldHJpZ2dlcnMuanMnO1xuaW1wb3J0IHsgZml4TW92ZW1lbnRTY3JpcHRzIH0gZnJvbSAnLi9wYXNzL2ZpeG1vdmVtZW50c2NyaXB0cy5qcyc7XG5pbXBvcnQgeyBmaXhTa2lwcGFibGVFeGl0cyB9IGZyb20gJy4vcGFzcy9maXhza2lwcGFibGVleGl0cy5qcyc7XG5pbXBvcnQgeyByYW5kb21pemVUaHVuZGVyV2FycCB9IGZyb20gJy4vcGFzcy9yYW5kb21pemV0aHVuZGVyd2FycC5qcyc7XG5pbXBvcnQgeyByZXNjYWxlTW9uc3RlcnMgfSBmcm9tICcuL3Bhc3MvcmVzY2FsZW1vbnN0ZXJzLmpzJztcbmltcG9ydCB7IHNodWZmbGVHb2EgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZWdvYS5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlSG91c2VzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVob3VzZXMuanMnO1xuaW1wb3J0IHsgc2h1ZmZsZU1hemVzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVtYXplcy5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlTWltaWNzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVtaW1pY3MuanMnO1xuaW1wb3J0IHsgc2h1ZmZsZU1vbnN0ZXJQb3NpdGlvbnMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZW1vbnN0ZXJwb3NpdGlvbnMuanMnO1xuaW1wb3J0IHsgc2h1ZmZsZU1vbnN0ZXJzIH0gZnJvbSAnLi9wYXNzL3NodWZmbGVtb25zdGVycy5qcyc7XG5pbXBvcnQgeyBzaHVmZmxlUGFsZXR0ZXMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXBhbGV0dGVzLmpzJztcbmltcG9ydCB7IHNodWZmbGVUcmFkZXMgfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXRyYWRlcy5qcyc7XG5pbXBvcnQgeyBzdGFuZGFyZE1hcEVkaXRzIH0gZnJvbSAnLi9wYXNzL3N0YW5kYXJkbWFwZWRpdHMuanMnO1xuaW1wb3J0IHsgdG9nZ2xlTWFwcyB9IGZyb20gJy4vcGFzcy90b2dnbGVtYXBzLmpzJztcbmltcG9ydCB7IHVuaWRlbnRpZmllZEl0ZW1zIH0gZnJvbSAnLi9wYXNzL3VuaWRlbnRpZmllZGl0ZW1zLmpzJztcbmltcG9ydCB7IG1pc3NwZWxsSXRlbXMgfSBmcm9tICcuL3Bhc3MvbWlzc3BlbGxpdGVtcy5qcyc7XG5pbXBvcnQgeyB3cml0ZUxvY2F0aW9uc0Zyb21NZXRhIH0gZnJvbSAnLi9wYXNzL3dyaXRlbG9jYXRpb25zZnJvbW1ldGEuanMnO1xuaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnLi9yYW5kb20uanMnO1xuaW1wb3J0IHsgUm9tIH0gZnJvbSAnLi9yb20uanMnO1xuaW1wb3J0IHsgQXJlYSB9IGZyb20gJy4vcm9tL2FyZWEuanMnO1xuaW1wb3J0IHsgTG9jYXRpb24sIFNwYXduIH0gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHsgZml4VGlsZXNldHMgfSBmcm9tICcuL3JvbS9zY3JlZW5maXguanMnO1xuaW1wb3J0IHsgU2hvcCwgU2hvcFR5cGUgfSBmcm9tICcuL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7IFNwb2lsZXIgfSBmcm9tICcuL3JvbS9zcG9pbGVyLmpzJztcbmltcG9ydCB7IGhleCwgc2VxLCB3YXRjaEFycmF5IH0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQgeyBEZWZhdWx0TWFwIH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCAqIGFzIHZlcnNpb24gZnJvbSAnLi92ZXJzaW9uLmpzJztcbmltcG9ydCB7IHNodWZmbGVBcmVhcyB9IGZyb20gJy4vcGFzcy9zaHVmZmxlYXJlYXMuanMnO1xuaW1wb3J0IHsgY2hlY2tUcmlnZ2VycyB9IGZyb20gJy4vcGFzcy9jaGVja3RyaWdnZXJzLmpzJztcblxuY29uc3QgRVhQQU5EX1BSRzogYm9vbGVhbiA9IHRydWU7XG5cbi8vICh3aW5kb3cgYXMgYW55KS5DYXZlU2h1ZmZsZSA9IENhdmVTaHVmZmxlO1xuLy8gZnVuY3Rpb24gc2h1ZmZsZUNhdmUoc2VlZDogbnVtYmVyLCBwYXJhbXM6IGFueSwgbnVtID0gMTAwMCkge1xuLy8gICBmb3IgKGxldCBpID0gc2VlZDsgaSA8IHNlZWQgKyBudW07IGkrKykge1xuLy8gICAgIGNvbnN0IHMgPSBuZXcgQ2F2ZVNodWZmbGUoey4uLnBhcmFtcywgdGlsZXNldDogKHdpbmRvdyBhcyBhbnkpLnJvbS5tZXRhdGlsZXNldHMuY2F2ZX0sIGkpO1xuLy8gICAgIHMubWluU3Bpa2VzID0gMztcbi8vICAgICB0cnkge1xuLy8gICAgICAgaWYgKHMuYnVpbGQoKSkge1xuLy8gICAgICAgICBjb25zb2xlLmxvZyhgc2VlZCAke2l9OlxcbiR7cy5ncmlkLnNob3coKX1cXG4ke3MubWV0YSEuc2hvdygpfWApO1xuLy8gICAgICAgICByZXR1cm47XG4vLyAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBjb25zb2xlLmxvZyhgZmFpbDpcXG4ke3MuZ3JpZC5zaG93KCl9YCk7XG4vLyAgICAgICB9XG4vLyAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4vLyAgICAgICBjb25zb2xlLmxvZyhgZmFpbCAke2l9OlxcbiR7cy5ncmlkLnNob3coKX1gKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vICAgY29uc29sZS5sb2coYGZhaWxgKTtcbi8vIH1cblxuLy8gY2xhc3MgU2hpbUFzc2VtYmxlciB7XG4vLyAgIHByZTogUHJlcHJvY2Vzc29yO1xuLy8gICBleHBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcblxuLy8gICBjb25zdHJ1Y3Rvcihjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZykge1xuLy8gICAgIGNvbnN0IGFzbSA9IG5ldyBBc3NlbWJsZXIoQ3B1LlAwMik7XG4vLyAgICAgY29uc3QgdG9rcyA9IG5ldyBUb2tlblN0cmVhbSgpO1xuLy8gICAgIHRva3MuZW50ZXIobmV3IFRva2VuaXplcihjb2RlLCBmaWxlKSk7XG4vLyAgICAgdGhpcy5wcmUgPSBuZXcgUHJlcHJvY2Vzc29yKHRva3MsIGFzbSk7XG4vLyAgICAgd2hpbGUgKHRoaXMucHJlLm5leHQoKSkge31cbi8vICAgfVxuXG4vLyAgIGFzc2VtYmxlKGNvZGU6IHN0cmluZywgZmlsZTogc3RyaW5nLCByb206IFVpbnQ4QXJyYXkpIHtcbi8vICAgICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKENwdS5QMDIpO1xuLy8gICAgIGNvbnN0IHRva3MgPSBuZXcgVG9rZW5TdHJlYW0oKTtcbi8vICAgICB0b2tzLmVudGVyKG5ldyBUb2tlbml6ZXIoY29kZSwgZmlsZSkpO1xuLy8gICAgIGNvbnN0IHByZSA9IG5ldyBQcmVwcm9jZXNzb3IodG9rcywgYXNtLCB0aGlzLnByZSk7XG4vLyAgICAgYXNtLnRva2VucyhwcmUpO1xuLy8gICAgIGNvbnN0IGxpbmsgPSBuZXcgTGlua2VyKCk7XG4vLyAgICAgbGluay5yZWFkKGFzbS5tb2R1bGUoKSk7XG4vLyAgICAgbGluay5saW5rKCkuYWRkT2Zmc2V0KDB4MTApLmFwcGx5KHJvbSk7XG4vLyAgICAgZm9yIChjb25zdCBbcywgdl0gb2YgbGluay5leHBvcnRzKCkpIHtcbi8vICAgICAgIC8vaWYgKCF2Lm9mZnNldCkgdGhyb3cgbmV3IEVycm9yKGBubyBvZmZzZXQ6ICR7c31gKTtcbi8vICAgICAgIHRoaXMuZXhwb3J0cy5zZXQocywgdi5vZmZzZXQgPz8gdi52YWx1ZSk7XG4vLyAgICAgfVxuLy8gICB9XG5cbi8vICAgZXhwYW5kKHM6IHN0cmluZykge1xuLy8gICAgIGNvbnN0IHYgPSB0aGlzLmV4cG9ydHMuZ2V0KHMpO1xuLy8gICAgIGlmICghdikgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGV4cG9ydDogJHtzfWApO1xuLy8gICAgIHJldHVybiB2O1xuLy8gICB9XG4vLyB9XG5cblxuLy8gVE9ETyAtIHRvIHNodWZmbGUgdGhlIG1vbnN0ZXJzLCB3ZSBuZWVkIHRvIGZpbmQgdGhlIHNwcml0ZSBwYWx0dGVzIGFuZFxuLy8gcGF0dGVybnMgZm9yIGVhY2ggbW9uc3Rlci4gIEVhY2ggbG9jYXRpb24gc3VwcG9ydHMgdXAgdG8gdHdvIG1hdGNodXBzLFxuLy8gc28gY2FuIG9ubHkgc3VwcG9ydCBtb25zdGVycyB0aGF0IG1hdGNoLiAgTW9yZW92ZXIsIGRpZmZlcmVudCBtb25zdGVyc1xuLy8gc2VlbSB0byBuZWVkIHRvIGJlIGluIGVpdGhlciBzbG90IDAgb3IgMS5cblxuLy8gUHVsbCBpbiBhbGwgdGhlIHBhdGNoZXMgd2Ugd2FudCB0byBhcHBseSBhdXRvbWF0aWNhbGx5LlxuLy8gVE9ETyAtIG1ha2UgYSBkZWJ1Z2dlciB3aW5kb3cgZm9yIHBhdGNoZXMuXG4vLyBUT0RPIC0gdGhpcyBuZWVkcyB0byBiZSBhIHNlcGFyYXRlIG5vbi1jb21waWxlZCBmaWxlLlxuZXhwb3J0IGRlZmF1bHQgKHtcbiAgYXN5bmMgYXBwbHkocm9tOiBVaW50OEFycmF5LCBoYXNoOiB7W2tleTogc3RyaW5nXTogdW5rbm93bn0sIHBhdGg6IHN0cmluZyk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIC8vIExvb2sgZm9yIGZsYWcgc3RyaW5nIGFuZCBoYXNoXG4gICAgbGV0IGZsYWdzO1xuICAgIGlmICghaGFzaC5zZWVkKSB7XG4gICAgICAvLyBUT0RPIC0gc2VuZCBpbiBhIGhhc2ggb2JqZWN0IHdpdGggZ2V0L3NldCBtZXRob2RzXG4gICAgICBoYXNoLnNlZWQgPSBwYXJzZVNlZWQoJycpLnRvU3RyaW5nKDE2KTtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoICs9ICcmc2VlZD0nICsgaGFzaC5zZWVkO1xuICAgIH1cbiAgICBpZiAoaGFzaC5mbGFncykge1xuICAgICAgZmxhZ3MgPSBuZXcgRmxhZ1NldChTdHJpbmcoaGFzaC5mbGFncykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmbGFncyA9IG5ldyBGbGFnU2V0KCdAU3RhbmRhcmQnKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgaW4gaGFzaCkge1xuICAgICAgaWYgKGhhc2hba2V5XSA9PT0gJ2ZhbHNlJykgaGFzaFtrZXldID0gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IFtyZXN1bHQsXSA9XG4gICAgICAgIGF3YWl0IHNodWZmbGUocm9tLCBwYXJzZVNlZWQoU3RyaW5nKGhhc2guc2VlZCkpLFxuICAgICAgICAgICAgICAgICAgICAgIGZsYWdzLCBuZXcgRmV0Y2hSZWFkZXIocGF0aCkpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2VlZChzZWVkOiBzdHJpbmcpOiBudW1iZXIge1xuICBpZiAoIXNlZWQpIHJldHVybiBSYW5kb20ubmV3U2VlZCgpO1xuICBpZiAoL15bMC05YS1mXXsxLDh9JC9pLnRlc3Qoc2VlZCkpIHJldHVybiBOdW1iZXIucGFyc2VJbnQoc2VlZCwgMTYpO1xuICByZXR1cm4gY3JjMzIoc2VlZCk7XG59XG5cbi8qKlxuICogQWJzdHJhY3Qgb3V0IEZpbGUgSS9PLiAgTm9kZSBhbmQgYnJvd3NlciB3aWxsIGhhdmUgY29tcGxldGVseVxuICogZGlmZmVyZW50IGltcGxlbWVudGF0aW9ucy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWFkZXIge1xuICByZWFkKGZpbGVuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz47XG59XG5cbi8vIHByZXZlbnQgdW51c2VkIGVycm9ycyBhYm91dCB3YXRjaEFycmF5IC0gaXQncyB1c2VkIGZvciBkZWJ1Z2dpbmcuXG5jb25zdCB7fSA9IHt3YXRjaEFycmF5fSBhcyBhbnk7XG5cbmZ1bmN0aW9uIGRlZmluZXMoZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgIHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBzdHJpbmcge1xuICBjb25zdCBkZWZpbmVzOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHtcbiAgICBfQUxMT1dfVEVMRVBPUlRfT1VUX09GX0JPU1M6IGZsYWdzLmhhcmRjb3JlTW9kZSgpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCksXG4gICAgX0FMTE9XX1RFTEVQT1JUX09VVF9PRl9UT1dFUjogdHJ1ZSxcbiAgICBfQVVUT19FUVVJUF9CUkFDRUxFVDogZmxhZ3MuYXV0b0VxdWlwQnJhY2VsZXQocGFzcyksXG4gICAgX0JBUlJJRVJfUkVRVUlSRVNfQ0FMTV9TRUE6IHRydWUsIC8vIGZsYWdzLmJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKSxcbiAgICBfQlVGRl9ERU9TX1BFTkRBTlQ6IGZsYWdzLmJ1ZmZEZW9zUGVuZGFudCgpLFxuICAgIF9CVUZGX0RZTkE6IGZsYWdzLmJ1ZmZEeW5hKCksIC8vIHRydWUsXG4gICAgX0NIRUNLX0ZMQUcwOiB0cnVlLFxuICAgIF9DVFJMMV9TSE9SVENVVFM6IGZsYWdzLmNvbnRyb2xsZXJTaG9ydGN1dHMocGFzcyksXG4gICAgX0NVU1RPTV9TSE9PVElOR19XQUxMUzogdHJ1ZSxcbiAgICBfRElTQUJMRV9TSE9QX0dMSVRDSDogZmxhZ3MuZGlzYWJsZVNob3BHbGl0Y2goKSxcbiAgICBfRElTQUJMRV9TVEFUVUVfR0xJVENIOiBmbGFncy5kaXNhYmxlU3RhdHVlR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfU1dPUkRfQ0hBUkdFX0dMSVRDSDogZmxhZ3MuZGlzYWJsZVN3b3JkQ2hhcmdlR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfVFJJR0dFUl9TS0lQOiBmbGFncy5kaXNhYmxlVHJpZ2dlckdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1dBUlBfQk9PVFNfUkVVU0U6IGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfV0lMRF9XQVJQOiBmYWxzZSxcbiAgICBfRElTUExBWV9ESUZGSUNVTFRZOiB0cnVlLFxuICAgIF9FWFBBTkRfUFJHOiBFWFBBTkRfUFJHLFxuICAgIF9FWFRSQV9FWFRFTkRFRF9TQ1JFRU5TOiB0cnVlLFxuICAgIF9FWFRSQV9QSVRZX01QOiB0cnVlLCAgLy8gVE9ETzogYWxsb3cgZGlzYWJsaW5nIHRoaXNcbiAgICBfRklYX0NPSU5fU1BSSVRFUzogdHJ1ZSxcbiAgICBfRklYX09QRUxfU1RBVFVFOiB0cnVlLFxuICAgIF9GSVhfU0hBS0lORzogdHJ1ZSxcbiAgICBfRklYX1ZBTVBJUkU6IHRydWUsXG4gICAgX0hBWk1BVF9TVUlUOiBmbGFncy5jaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCksXG4gICAgX0xFQVRIRVJfQk9PVFNfR0lWRV9TUEVFRDogZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCksXG4gICAgX01BWF9TQ0FMSU5HX0lOX1RPV0VSOiBmbGFncy5tYXhTY2FsaW5nSW5Ub3dlcigpLFxuICAgIF9NT05FWV9BVF9TVEFSVDogZmxhZ3Muc2h1ZmZsZUhvdXNlcygpIHx8IGZsYWdzLnNodWZmbGVBcmVhcygpLFxuICAgIF9ORVJGX0ZMSUdIVDogdHJ1ZSxcbiAgICBfTkVSRl9NQURPOiB0cnVlLFxuICAgIF9ORVZFUl9ESUU6IGZsYWdzLm5ldmVyRGllKCksXG4gICAgX05PUk1BTElaRV9TSE9QX1BSSUNFUzogZmxhZ3Muc2h1ZmZsZVNob3BzKCksXG4gICAgX1BJVFlfSFBfQU5EX01QOiB0cnVlLFxuICAgIF9QUk9HUkVTU0lWRV9CUkFDRUxFVDogdHJ1ZSxcbiAgICBfUkFCQklUX0JPT1RTX0NIQVJHRV9XSElMRV9XQUxLSU5HOiBmbGFncy5yYWJiaXRCb290c0NoYXJnZVdoaWxlV2Fsa2luZygpLFxuICAgIF9SQU5ET01fRkxZRVJfU1BBV05TOiB0cnVlLFxuICAgIF9SRVFVSVJFX0hFQUxFRF9ET0xQSElOX1RPX1JJREU6IGZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCksXG4gICAgX1JFVkVSU0lCTEVfU1dBTl9HQVRFOiB0cnVlLFxuICAgIF9TQUhBUkFfUkFCQklUU19SRVFVSVJFX1RFTEVQQVRIWTogZmxhZ3Muc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKSxcbiAgICBfU0lNUExJRllfSU5WSVNJQkxFX0NIRVNUUzogdHJ1ZSxcbiAgICBfU09GVF9SRVNFVF9TSE9SVENVVDogdHJ1ZSxcbiAgICBfVEVMRVBPUlRfT05fVEhVTkRFUl9TV09SRDogZmxhZ3MudGVsZXBvcnRPblRodW5kZXJTd29yZCgpLFxuICAgIF9USU5LX01PREU6ICFmbGFncy5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCksXG4gICAgX1RSQUlORVI6IGZsYWdzLnRyYWluZXIoKSxcbiAgICBfVFdFTFZUSF9XQVJQX1BPSU5UOiB0cnVlLCAvLyB6b21iaWUgdG93biB3YXJwXG4gICAgX1VOSURFTlRJRklFRF9JVEVNUzogZmxhZ3MudW5pZGVudGlmaWVkSXRlbXMoKSxcbiAgICBfVVBEQVRFX0hVRDogZmxhZ3Muc2hvdWxkVXBkYXRlSHVkKCksXG4gICAgX1pFQlVfU1RVREVOVF9HSVZFU19JVEVNOiBmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpLFxuICB9O1xuICByZXR1cm4gT2JqZWN0LmtleXMoZGVmaW5lcylcbiAgICAgIC5maWx0ZXIoZCA9PiBkZWZpbmVzW2RdKS5tYXAoZCA9PiBgLmRlZmluZSAke2R9IDFcXG5gKS5qb2luKCcnKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNodWZmbGUocm9tOiBVaW50OEFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VlZDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxGbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlcjogUmVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nPzoge3Nwb2lsZXI/OiBTcG9pbGVyfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzPzogUHJvZ3Jlc3NUcmFja2VyKTogUHJvbWlzZTxyZWFkb25seSBbVWludDhBcnJheSwgbnVtYmVyXT4ge1xuICAvLyBUcmltIG92ZXJkdW1wcyAobWFpbi5qcyBhbHJlYWR5IGRvZXMgdGhpcywgYnV0IHRoZXJlIGFyZSBvdGhlciBlbnRyeXBvaW50cylcbiAgY29uc3QgZXhwZWN0ZWRTaXplID1cbiAgICAgIDE2ICsgKHJvbVs2XSAmIDQgPyA1MTIgOiAwKSArIChyb21bNF0gPDwgMTQpICsgKHJvbVs1XSA8PCAxMyk7XG4gIGlmIChyb20ubGVuZ3RoID4gZXhwZWN0ZWRTaXplKSByb20gPSByb20uc2xpY2UoMCwgZXhwZWN0ZWRTaXplKTtcblxuICAvL3JvbSA9IHdhdGNoQXJyYXkocm9tLCAweDg1ZmEgKyAweDEwKTtcbiAgaWYgKEVYUEFORF9QUkcgJiYgcm9tLmxlbmd0aCA8IDB4ODAwMDApIHtcbiAgICBjb25zdCBuZXdSb20gPSBuZXcgVWludDhBcnJheShyb20ubGVuZ3RoICsgMHg0MDAwMCk7XG4gICAgbmV3Um9tLnN1YmFycmF5KDAsIDB4NDAwMTApLnNldChyb20uc3ViYXJyYXkoMCwgMHg0MDAxMCkpO1xuICAgIG5ld1JvbS5zdWJhcnJheSgweDgwMDEwKS5zZXQocm9tLnN1YmFycmF5KDB4NDAwMTApKTtcbiAgICBuZXdSb21bNF0gPDw9IDE7XG4gICAgcm9tID0gbmV3Um9tO1xuICB9XG5cbiAgZGV0ZXJtaW5pc3RpY1ByZVBhcnNlKHJvbS5zdWJhcnJheSgweDEwKSk7IC8vIFRPRE8gLSB0cmFpbmVyLi4uXG5cbiAgLy8gRmlyc3QgcmVlbmNvZGUgdGhlIHNlZWQsIG1peGluZyBpbiB0aGUgZmxhZ3MgZm9yIHNlY3VyaXR5LlxuICBpZiAodHlwZW9mIHNlZWQgIT09ICdudW1iZXInKSB0aHJvdyBuZXcgRXJyb3IoJ0JhZCBzZWVkJyk7XG4gIGNvbnN0IG5ld1NlZWQgPSBjcmMzMihzZWVkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpICsgU3RyaW5nKG9yaWdpbmFsRmxhZ3MuZmlsdGVyT3B0aW9uYWwoKSkpID4+PiAwO1xuICBjb25zdCByYW5kb20gPSBuZXcgUmFuZG9tKG5ld1NlZWQpO1xuXG4gIGNvbnN0IGF0dGVtcHRFcnJvcnMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCA1OyBpKyspIHsgLy8gZm9yIG5vdywgd2UnbGwgdHJ5IDUgYXR0ZW1wdHNcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHNodWZmbGVJbnRlcm5hbChyb20sIG9yaWdpbmFsRmxhZ3MsIHNlZWQsIHJhbmRvbSwgcmVhZGVyLCBsb2csIHByb2dyZXNzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgYXR0ZW1wdEVycm9ycy5wdXNoKGVycm9yKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEF0dGVtcHQgJHtpICsgMX0gZmFpbGVkOiAke2Vycm9yLnN0YWNrfWApO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYFNodWZmbGUgZmFpbGVkOiAke2F0dGVtcHRFcnJvcnMubWFwKGUgPT4gZS5zdGFjaykuam9pbignXFxuXFxuJyl9YCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNodWZmbGVJbnRlcm5hbChyb206IFVpbnQ4QXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxGbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFNlZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXI6IFJlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2c6IHtzcG9pbGVyPzogU3BvaWxlcn18dW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzOiBQcm9ncmVzc1RyYWNrZXJ8dW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICApOiBQcm9taXNlPHJlYWRvbmx5IFtVaW50OEFycmF5LCBudW1iZXJdPiAge1xuICBjb25zdCBvcmlnaW5hbEZsYWdTdHJpbmcgPSBTdHJpbmcob3JpZ2luYWxGbGFncyk7XG4gIGNvbnN0IGZsYWdzID0gb3JpZ2luYWxGbGFncy5maWx0ZXJSYW5kb20ocmFuZG9tKTtcbiAgY29uc3QgcGFyc2VkID0gbmV3IFJvbShyb20pO1xuICBjb25zdCBhY3R1YWxGbGFnU3RyaW5nID0gU3RyaW5nKGZsYWdzKTtcbi8vICh3aW5kb3cgYXMgYW55KS5jYXZlID0gc2h1ZmZsZUNhdmU7XG4gIHBhcnNlZC5mbGFncy5kZWZyYWcoKTtcbiAgY29tcHJlc3NNYXBEYXRhKHBhcnNlZCk7XG4gIG1vdmVTY3JlZW5zSW50b0V4cGFuZGVkUm9tKHBhcnNlZCk7XG4gICAgICAgICAgICAgLy8gVE9ETyAtIHRoZSBzY3JlZW5zIGFyZW4ndCBtb3Zpbmc/IT9cbiAgLy8gTk9URTogZGVsZXRlIHRoZXNlIGlmIHdlIHdhbnQgbW9yZSBmcmVlIHNwYWNlIGJhY2suLi5cbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuc3dhbXAsIDQpOyAvLyBtb3ZlIDE3IHNjcmVlbnMgdG8gJDQwMDAwXG4gIC8vIHBhcnNlZC5tb3ZlU2NyZWVucyhwYXJzZWQubWV0YXRpbGVzZXRzLmhvdXNlLCA0KTsgLy8gMTUgc2NyZWVuc1xuICAvLyBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy50b3duLCA0KTtcbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuW2NhdmUsIHB5cmFtaWQsIGZvcnRyZXNzLCBsYWJ5cmludGgsIGljZUNhdmVdLCA0KTtcbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuZG9scGhpbkNhdmUsIDQpO1xuICAvLyBwYXJzZWQubW92ZVNjcmVlbnMocGFyc2VkLm1ldGF0aWxlc2V0cy5saW1lLCA0KTtcbiAgLy8gcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuc2hyaW5lLCA0KTtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT0gJ29iamVjdCcpICh3aW5kb3cgYXMgYW55KS5yb20gPSBwYXJzZWQ7XG4gIHBhcnNlZC5zcG9pbGVyID0gbmV3IFNwb2lsZXIocGFyc2VkKTtcbiAgaWYgKGxvZykgbG9nLnNwb2lsZXIgPSBwYXJzZWQuc3BvaWxlcjtcbiAgaWYgKGFjdHVhbEZsYWdTdHJpbmcgIT09IG9yaWdpbmFsRmxhZ1N0cmluZykge1xuICAgIHBhcnNlZC5zcG9pbGVyLmZsYWdzID0gYWN0dWFsRmxhZ1N0cmluZztcbiAgfVxuXG4gIC8vIE1ha2UgZGV0ZXJtaW5pc3RpYyBjaGFuZ2VzLlxuICBkZXRlcm1pbmlzdGljKHBhcnNlZCwgZmxhZ3MpO1xuICBmaXhUaWxlc2V0cyhwYXJzZWQpO1xuICBzdGFuZGFyZE1hcEVkaXRzKHBhcnNlZCwgc3RhbmRhcmRNYXBFZGl0cy5nZW5lcmF0ZU9wdGlvbnMoZmxhZ3MsIHJhbmRvbSkpO1xuICB0b2dnbGVNYXBzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgLy8gU2V0IHVwIHNob3AgYW5kIHRlbGVwYXRoeVxuICBwYXJzZWQuc2NhbGluZ0xldmVscyA9IDQ4O1xuXG4gIGlmIChmbGFncy5zaHVmZmxlU2hvcHMoKSkgc2h1ZmZsZVNob3BzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgaWYgKGZsYWdzLnNodWZmbGVHb2FGbG9vcnMoKSkgc2h1ZmZsZUdvYShwYXJzZWQsIHJhbmRvbSk7IC8vIE5PVEU6IG11c3QgYmUgYmVmb3JlIHNodWZmbGVNYXplcyFcbiAgcmFuZG9taXplV2FsbHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgY3J1bWJsaW5nUGxhdGZvcm1zKHBhcnNlZCwgcmFuZG9tKTtcblxuICBpZiAoZmxhZ3MubmVyZldpbGRXYXJwKCkpIHBhcnNlZC53aWxkV2FycC5sb2NhdGlvbnMuZmlsbCgwKTtcbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZVdpbGRXYXJwKCkpIHNodWZmbGVXaWxkV2FycChwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZiAoZmxhZ3MucmFuZG9taXplVGh1bmRlclRlbGVwb3J0KCkpIHJhbmRvbWl6ZVRodW5kZXJXYXJwKHBhcnNlZCwgcmFuZG9tKTtcbiAgcmVzY2FsZU1vbnN0ZXJzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHVuaWRlbnRpZmllZEl0ZW1zKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIG1pc3NwZWxsSXRlbXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgc2h1ZmZsZVRyYWRlcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZiAoZmxhZ3Muc2h1ZmZsZUhvdXNlcygpKSBzaHVmZmxlSG91c2VzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlmIChmbGFncy5zaHVmZmxlQXJlYXMoKSkgc2h1ZmZsZUFyZWFzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGZpeEVudHJhbmNlVHJpZ2dlcnMocGFyc2VkKTtcbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZU1hcHMoKSkgc2h1ZmZsZU1hemVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIHdyaXRlTG9jYXRpb25zRnJvbU1ldGEocGFyc2VkKTtcbiAgc2h1ZmZsZU1vbnN0ZXJQb3NpdGlvbnMocGFyc2VkLCByYW5kb20pO1xuXG4gIC8vIE5PVEU6IFNodWZmbGUgbWltaWNzIGFuZCBtb25zdGVycyAqYWZ0ZXIqIHNodWZmbGluZyBtYXBzLCBidXQgYmVmb3JlIGxvZ2ljLlxuICBpZiAoZmxhZ3Muc2h1ZmZsZU1pbWljcygpKSBzaHVmZmxlTWltaWNzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlmIChmbGFncy5zaHVmZmxlTW9uc3RlcnMoKSkgc2h1ZmZsZU1vbnN0ZXJzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG5cbiAgLy8gVGhpcyB3YW50cyB0byBnbyBhcyBsYXRlIGFzIHBvc3NpYmxlIHNpbmNlIHdlIG5lZWQgdG8gcGljayB1cFxuICAvLyBhbGwgdGhlIG5vcm1hbGl6YXRpb24gYW5kIG90aGVyIGhhbmRsaW5nIHRoYXQgaGFwcGVuZWQgYmVmb3JlLlxuICBjb25zdCB3b3JsZCA9IG5ldyBXb3JsZChwYXJzZWQsIGZsYWdzKTtcbiAgY29uc3QgZ3JhcGggPSBuZXcgR3JhcGgoW3dvcmxkLmdldExvY2F0aW9uTGlzdCgpXSk7XG4gIGlmICghZmxhZ3Mubm9TaHVmZmxlKCkpIHtcbiAgICBjb25zdCBmaWxsID0gYXdhaXQgZ3JhcGguc2h1ZmZsZShmbGFncywgcmFuZG9tLCB1bmRlZmluZWQsIHByb2dyZXNzLCBwYXJzZWQuc3BvaWxlcik7XG4gICAgaWYgKGZpbGwpIHtcbiAgICAgIC8vIGNvbnN0IG4gPSAoaTogbnVtYmVyKSA9PiB7XG4gICAgICAvLyAgIGlmIChpID49IDB4NzApIHJldHVybiAnTWltaWMnO1xuICAgICAgLy8gICBjb25zdCBpdGVtID0gcGFyc2VkLml0ZW1zW3BhcnNlZC5pdGVtR2V0c1tpXS5pdGVtSWRdO1xuICAgICAgLy8gICByZXR1cm4gaXRlbSA/IGl0ZW0ubWVzc2FnZU5hbWUgOiBgaW52YWxpZCAke2l9YDtcbiAgICAgIC8vIH07XG4gICAgICAvLyBjb25zb2xlLmxvZygnaXRlbTogc2xvdCcpO1xuICAgICAgLy8gZm9yIChsZXQgaSA9IDA7IGkgPCBmaWxsLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyAgIGlmIChmaWxsLml0ZW1zW2ldICE9IG51bGwpIHtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhgJCR7aGV4KGkpfSAke24oaSl9OiAke24oZmlsbC5pdGVtc1tpXSl9ICQke2hleChmaWxsLml0ZW1zW2ldKX1gKTtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfVxuXG4gICAgICAvLyBUT0RPIC0gZmlsbCB0aGUgc3BvaWxlciBsb2chXG5cbiAgICAgIC8vdy50cmF2ZXJzZSh3LmdyYXBoLCBmaWxsKTsgLy8gZmlsbCB0aGUgc3BvaWxlciAobWF5IGFsc28gd2FudCB0byBqdXN0IGJlIGEgc2FuaXR5IGNoZWNrPylcblxuICAgICAgZm9yIChjb25zdCBbc2xvdCwgaXRlbV0gb2YgZmlsbCkge1xuICAgICAgICBwYXJzZWQuc2xvdHNbc2xvdCAmIDB4ZmZdID0gaXRlbSAmIDB4ZmY7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbcm9tLCAtMV07XG4gICAgICAvL2NvbnNvbGUuZXJyb3IoJ0NPVUxEIE5PVCBGSUxMIScpO1xuICAgIH1cbiAgfVxuICAvL2NvbnNvbGUubG9nKCdmaWxsJywgZmlsbCk7XG5cbiAgLy8gVE9ETyAtIHNldCBvbWl0SXRlbUdldERhdGFTdWZmaXggYW5kIG9taXRMb2NhbERpYWxvZ1N1ZmZpeFxuICAvL2F3YWl0IHNodWZmbGVEZXBncmFwaChwYXJzZWQsIHJhbmRvbSwgbG9nLCBmbGFncywgcHJvZ3Jlc3MpO1xuXG4gIC8vIFRPRE8gLSByZXdyaXRlIHJlc2NhbGVTaG9wcyB0byB0YWtlIGEgUm9tIGluc3RlYWQgb2YgYW4gYXJyYXkuLi5cbiAgaWYgKGZsYWdzLnNodWZmbGVTaG9wcygpKSB7XG4gICAgLy8gVE9ETyAtIHNlcGFyYXRlIGxvZ2ljIGZvciBoYW5kbGluZyBzaG9wcyB3L28gUG4gc3BlY2lmaWVkIChpLmUuIHZhbmlsbGFcbiAgICAvLyBzaG9wcyB0aGF0IG1heSBoYXZlIGJlZW4gcmFuZG9taXplZClcbiAgICByZXNjYWxlU2hvcHMocGFyc2VkLCBmbGFncy5iYXJnYWluSHVudGluZygpID8gcmFuZG9tIDogdW5kZWZpbmVkKTtcbiAgfVxuXG4gIC8vIE5PVEU6IG1vbnN0ZXIgc2h1ZmZsZSBuZWVkcyB0byBnbyBhZnRlciBpdGVtIHNodWZmbGUgYmVjYXVzZSBvZiBtaW1pY1xuICAvLyBwbGFjZW1lbnQgY29uc3RyYWludHMsIGJ1dCBpdCB3b3VsZCBiZSBuaWNlIHRvIGdvIGJlZm9yZSBpbiBvcmRlciB0b1xuICAvLyBndWFyYW50ZWUgbW9uZXkuXG4gIC8vaWRlbnRpZnlLZXlJdGVtc0ZvckRpZmZpY3VsdHlCdWZmcyhwYXJzZWQpO1xuXG4gIC8vIEJ1ZmYgbWVkaWNhbCBoZXJiIGFuZCBmcnVpdCBvZiBwb3dlclxuICBpZiAoZmxhZ3MuYnVmZk1lZGljYWxIZXJiKCkpIHtcbiAgICBwYXJzZWQuaXRlbXMuTWVkaWNhbEhlcmIudmFsdWUgPSA4MDtcbiAgICBwYXJzZWQuaXRlbXMuRnJ1aXRPZlBvd2VyLnZhbHVlID0gNTY7XG4gIH1cblxuICBpZiAoZmxhZ3Muc3RvcnlNb2RlKCkpIHN0b3J5TW9kZShwYXJzZWQpO1xuXG4gIC8vIERvIHRoaXMgKmFmdGVyKiBzaHVmZmxpbmcgcGFsZXR0ZXNcbiAgaWYgKGZsYWdzLmJsYWNrb3V0TW9kZSgpKSBibGFja291dE1vZGUocGFyc2VkKTtcblxuICBtaXNjKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGZpeERpYWxvZyhwYXJzZWQpO1xuICBmaXhNb3ZlbWVudFNjcmlwdHMocGFyc2VkKTtcbiAgY2hlY2tUcmlnZ2VycyhwYXJzZWQpO1xuXG4gIC8vIE5PVEU6IFRoaXMgbmVlZHMgdG8gaGFwcGVuIEJFRk9SRSBwb3N0c2h1ZmZsZVxuICBpZiAoZmxhZ3MuYnVmZkR5bmEoKSkgYnVmZkR5bmEocGFyc2VkLCBmbGFncyk7IC8vIFRPRE8gLSBjb25kaXRpb25hbFxuXG4gIGlmIChmbGFncy50cmFpbmVyKCkpIHtcbiAgICBwYXJzZWQud2lsZFdhcnAubG9jYXRpb25zID0gW1xuICAgICAgMHgwYSwgLy8gdmFtcGlyZVxuICAgICAgMHgxYSwgLy8gc3dhbXAvaW5zZWN0XG4gICAgICAweDM1LCAvLyBzdW1taXQgY2F2ZVxuICAgICAgMHg0OCwgLy8gZm9nIGxhbXBcbiAgICAgIDB4NmQsIC8vIHZhbXBpcmUgMlxuICAgICAgMHg2ZSwgLy8gc2FiZXJhIDFcbiAgICAgIDB4OGMsIC8vIHNoeXJvblxuICAgICAgMHhhYSwgLy8gYmVoaW5kIGtlbGJlc3F5ZSAyXG4gICAgICAweGFjLCAvLyBzYWJlcmEgMlxuICAgICAgMHhiMCwgLy8gYmVoaW5kIG1hZG8gMlxuICAgICAgMHhiNiwgLy8ga2FybWluZVxuICAgICAgMHg5ZiwgLy8gZHJheWdvbiAxXG4gICAgICAweGE2LCAvLyBkcmF5Z29uIDJcbiAgICAgIDB4NTgsIC8vIHRvd2VyXG4gICAgICAweDVjLCAvLyB0b3dlciBvdXRzaWRlIG1lc2lhXG4gICAgICAweDAwLCAvLyBtZXphbWVcbiAgICBdO1xuICB9XG5cbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZU11c2ljKCdlYXJseScpKSB7XG4gICAgc2h1ZmZsZU11c2ljKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIH1cbiAgaWYgKGZsYWdzLnNodWZmbGVUaWxlUGFsZXR0ZXMoJ2Vhcmx5JykpIHtcbiAgICBzaHVmZmxlUGFsZXR0ZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgfVxuICB1cGRhdGVUYWJsZXNQcmVDb21taXQocGFyc2VkLCBmbGFncyk7XG4gIHJhbmRvbS5zaHVmZmxlKHBhcnNlZC5yYW5kb21OdW1iZXJzLnZhbHVlcyk7XG5cblxuICAvLyBhc3luYyBmdW5jdGlvbiBhc3NlbWJsZShwYXRoOiBzdHJpbmcpIHtcbiAgLy8gICBhc20uYXNzZW1ibGUoYXdhaXQgcmVhZGVyLnJlYWQocGF0aCksIHBhdGgsIHJvbSk7XG4gIC8vIH1cblxuICAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cCB0byBub3QgcmUtcmVhZCB0aGUgZW50aXJlIHRoaW5nIHR3aWNlLlxuICAvLyBQcm9iYWJseSBqdXN0IHdhbnQgdG8gbW92ZSB0aGUgb3B0aW9uYWwgcGFzc2VzIGludG8gYSBzZXBhcmF0ZVxuICAvLyBmaWxlIHRoYXQgcnVucyBhZnRlcndhcmRzIGFsbCBvbiBpdHMgb3duLlxuXG4gIGFzeW5jIGZ1bmN0aW9uIGFzbShwYXNzOiAnZWFybHknIHwgJ2xhdGUnKSB7XG4gICAgYXN5bmMgZnVuY3Rpb24gdG9rZW5pemVyKHBhdGg6IHN0cmluZykge1xuICAgICAgcmV0dXJuIG5ldyBUb2tlbml6ZXIoYXdhaXQgcmVhZGVyLnJlYWQocGF0aCksIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB7bGluZUNvbnRpbnVhdGlvbnM6IHRydWV9KTtcbiAgICB9XG5cbiAgICBjb25zdCBmbGFnRmlsZSA9IGRlZmluZXMoZmxhZ3MsIHBhc3MpO1xuICAgIGNvbnN0IGFzbSA9IG5ldyBBc3NlbWJsZXIoQ3B1LlAwMik7XG4gICAgY29uc3QgdG9rcyA9IG5ldyBUb2tlblN0cmVhbSgpO1xuICAgIHRva3MuZW50ZXIoVG9rZW5Tb3VyY2UuY29uY2F0KFxuICAgICAgICBuZXcgVG9rZW5pemVyKGZsYWdGaWxlLCAnZmxhZ3MucycpLFxuICAgICAgICBhd2FpdCB0b2tlbml6ZXIoJ2luaXQucycpLFxuICAgICAgICBhd2FpdCB0b2tlbml6ZXIoJ2FsbG9jLnMnKSxcbiAgICAgICAgYXdhaXQgdG9rZW5pemVyKCdwcmVzaHVmZmxlLnMnKSxcbiAgICAgICAgYXdhaXQgdG9rZW5pemVyKCdwb3N0cGFyc2UucycpLFxuICAgICAgICBhd2FpdCB0b2tlbml6ZXIoJ3Bvc3RzaHVmZmxlLnMnKSkpO1xuICAgIGNvbnN0IHByZSA9IG5ldyBQcmVwcm9jZXNzb3IodG9rcywgYXNtKTtcbiAgICBhc20udG9rZW5zKHByZSk7XG4gICAgcmV0dXJuIGFzbS5tb2R1bGUoKTtcbiAgfVxuXG4vLyAgICAgY29uc3QgYXNtID0gbmV3IEFzc2VtYmxlcihDcHUuUDAyKTtcbi8vICAgICBjb25zdCB0b2tzID0gbmV3IFRva2VuU3RyZWFtKCk7XG4vLyAgICAgdG9rcy5lbnRlcihuZXcgVG9rZW5pemVyKGNvZGUsIGZpbGUpKTtcbi8vICAgICB0aGlzLnByZSA9IG5ldyBQcmVwcm9jZXNzb3IodG9rcywgYXNtKTtcbi8vICAgICB3aGlsZSAodGhpcy5wcmUubmV4dCgpKSB7fVxuLy8gICB9XG5cbi8vICAgYXNzZW1ibGUoY29kZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcsIHJvbTogVWludDhBcnJheSkge1xuLy8gICAgIGNvbnN0IGFzbSA9IG5ldyBBc3NlbWJsZXIoQ3B1LlAwMik7XG4vLyAgICAgY29uc3QgdG9rcyA9IG5ldyBUb2tlblN0cmVhbSgpO1xuLy8gICAgIHRva3MuZW50ZXIobmV3IFRva2VuaXplcihjb2RlLCBmaWxlKSk7XG4vLyAgICAgY29uc3QgcHJlID0gbmV3IFByZXByb2Nlc3Nvcih0b2tzLCBhc20sIHRoaXMucHJlKTtcbi8vICAgICBhc20udG9rZW5zKHByZSk7XG4vLyAgICAgY29uc3QgbGluayA9IG5ldyBMaW5rZXIoKTtcbi8vICAgICBsaW5rLnJlYWQoYXNtLm1vZHVsZSgpKTtcbiAgXG4gIC8vIGNvbnN0IGFzbSA9IG5ldyBTaGltQXNzZW1ibGVyKGZsYWdGaWxlLCAnZmxhZ3MucycpO1xuLy9jb25zb2xlLmxvZygnTXVsdGlwbHkxNkJpdDonLCBhc20uZXhwYW5kKCdNdWx0aXBseTE2Qml0JykudG9TdHJpbmcoMTYpKTtcbiAgcGFyc2VkLm1lc3NhZ2VzLmNvbXByZXNzKCk7IC8vIHB1bGwgdGhpcyBvdXQgdG8gbWFrZSB3cml0ZURhdGEgYSBwdXJlIGZ1bmN0aW9uXG4gIGNvbnN0IHByZ0NvcHkgPSByb20uc2xpY2UoMTYpO1xuXG4gIHBhcnNlZC5tb2R1bGVzLnB1c2goYXdhaXQgYXNtKCdlYXJseScpKTtcbiAgcGFyc2VkLndyaXRlRGF0YShwcmdDb3B5KTtcbiAgcGFyc2VkLm1vZHVsZXMucG9wKCk7XG5cbiAgcGFyc2VkLm1vZHVsZXMucHVzaChhd2FpdCBhc20oJ2xhdGUnKSk7XG5cbiAgY29uc3QgY3JjID0gc3RhbXBWZXJzaW9uU2VlZEFuZEhhc2gocm9tLCBvcmlnaW5hbFNlZWQsIG9yaWdpbmFsRmxhZ1N0cmluZywgcHJnQ29weSk7XG5cbiAgLy8gRG8gb3B0aW9uYWwgcmFuZG9taXphdGlvbiBub3cuLi5cbiAgaWYgKGZsYWdzLnJhbmRvbWl6ZU11c2ljKCdsYXRlJykpIHtcbiAgICBzaHVmZmxlTXVzaWMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgfVxuICBpZiAoZmxhZ3Mubm9NdXNpYygnbGF0ZScpKSB7XG4gICAgbm9NdXNpYyhwYXJzZWQpO1xuICB9XG4gIGlmIChmbGFncy5zaHVmZmxlVGlsZVBhbGV0dGVzKCdsYXRlJykpIHtcbiAgICBzaHVmZmxlUGFsZXR0ZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgfVxuXG4gIC8vIERvIHRoaXMgdmVyeSBsYXRlLCBzaW5jZSBpdCdzIGxvdy1sZXZlbCBvbiB0aGUgbG9jYXRpb25zLiAgTmVlZCB0byB3YWl0XG4gIC8vIHVudGlsIGFmdGVyIHRoZSBtZXRhbG9jYXRpb25zIGhhdmUgYmVlbiB3cml0dGVuIGJhY2sgdG8gdGhlIGxvY2F0aW9ucy5cbiAgZml4U2tpcHBhYmxlRXhpdHMocGFyc2VkKTtcblxuICBwYXJzZWQud3JpdGVEYXRhKCk7XG4gIC8vIFRPRE8gLSBvcHRpb25hbCBmbGFncyBjYW4gcG9zc2libHkgZ28gaGVyZSwgYnV0IE1VU1QgTk9UIHVzZSBwYXJzZWQucHJnIVxuXG4gIGlmIChFWFBBTkRfUFJHKSB7XG4gICAgY29uc3QgcHJnID0gcm9tLnN1YmFycmF5KDB4MTApO1xuICAgIHByZy5zdWJhcnJheSgweDdjMDAwLCAweDgwMDAwKS5zZXQocHJnLnN1YmFycmF5KDB4M2MwMDAsIDB4NDAwMDApKTtcbiAgfVxuICByZXR1cm4gW3JvbSwgY3JjXTtcbn1cblxuZnVuY3Rpb24gbWlzYyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKSB7XG4vLyBUT0RPIC0gcmVtb3ZlIGhhY2sgdG8gdmlzdWFsaXplIG1hcHMgZnJvbSB0aGUgY29uc29sZS4uLlxuLy8gKE9iamVjdC5nZXRQcm90b3R5cGVPZihyb20ubG9jYXRpb25zWzBdKSBhcyBhbnkpLnNob3cgPSBmdW5jdGlvbih0czogdHlwZW9mIHJvbS5tZXRhdGlsZXNldHMucml2ZXIpIHtcbi8vICAgY29uc29sZS5sb2coTWF6ZS5mcm9tKHRoaXMsIHJhbmRvbSwgdHMpLnNob3coKSk7XG4vLyB9O1xuXG4gIGNvbnN0IHt9ID0ge3JvbSwgZmxhZ3MsIHJhbmRvbX0gYXMgYW55O1xuICAvLyBOT1RFOiB3ZSBzdGlsbCBuZWVkIHRvIGRvIHNvbWUgd29yayBhY3R1YWxseSBhZGp1c3RpbmdcbiAgLy8gbWVzc2FnZSB0ZXh0cyB0byBwcmV2ZW50IGxpbmUgb3ZlcmZsb3csIGV0Yy4gIFdlIHNob3VsZFxuICAvLyBhbHNvIG1ha2Ugc29tZSBob29rcyB0byBlYXNpbHkgc3dhcCBvdXQgaXRlbXMgd2hlcmUgaXRcbiAgLy8gbWFrZXMgc2Vuc2UuXG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1syXVsyXS50ZXh0ID0gYFxuezAxOkFrYWhhbmF9IGlzIGhhbmRlZCBhIHN0YXR1ZS4jXG5UaGFua3MgZm9yIGZpbmRpbmcgdGhhdC5cbkkgd2FzIHRvdGFsbHkgZ29ubmEgc2VsbFxuaXQgZm9yIHRvbnMgb2YgY2FzaC4jXG5IZXJlLCBoYXZlIHRoaXMgbGFtZVxuWzI5OkdhcyBNYXNrXSBvciBzb21ldGhpbmcuYDtcbiAgLy8gVE9ETyAtIHdvdWxkIGJlIG5pY2UgdG8gYWRkIHNvbWUgbW9yZSAoaGlnaGVyIGxldmVsKSBtYXJrdXAsXG4gIC8vIGUuZy4gYCR7ZGVzY3JpYmVJdGVtKHNsb3ROdW0pfWAuICBXZSBjb3VsZCBhbHNvIGFkZCBtYXJrdXBcbiAgLy8gZm9yIGUuZy4gYCR7c2F5V2FudChzbG90TnVtKX1gIGFuZCBgJHtzYXlUaGFua3Moc2xvdE51bSl9YFxuICAvLyBpZiB3ZSBzaHVmZmxlIHRoZSB3YW50ZWQgaXRlbXMuICBUaGVzZSBjb3VsZCBiZSByYW5kb21pemVkXG4gIC8vIGluIHZhcmlvdXMgd2F5cywgYXMgd2VsbCBhcyBoYXZpbmcgc29tZSBhZGRpdGlvbmFsIGJpdHMgbGlrZVxuICAvLyB3YW50QXV4aWxpYXJ5KC4uLikgZm9yIGUuZy4gXCJ0aGUga2lyaXNhIHBsYW50IGlzIC4uLlwiIC0gdGhlblxuICAvLyBpdCBjb3VsZCBpbnN0ZWFkIHNheSBcInRoZSBzdGF0dWUgb2Ygb255eCBpcyAuLi5cIi5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzBdWzB4ZV0udGV4dCA9IGBJdCdzIGRhbmdlcm91cyB0byBnbyBhbG9uZSEgVGFrZSB0aGlzLmA7XG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1swXVsweGVdLmZpeFRleHQoKTtcbn07XG5cbmZ1bmN0aW9uIHNodWZmbGVTaG9wcyhyb206IFJvbSwgX2ZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBjb25zdCBzaG9wczoge1t0eXBlOiBudW1iZXJdOiB7Y29udGVudHM6IG51bWJlcltdLCBzaG9wczogU2hvcFtdfX0gPSB7XG4gICAgW1Nob3BUeXBlLkFSTU9SXToge2NvbnRlbnRzOiBbXSwgc2hvcHM6IFtdfSxcbiAgICBbU2hvcFR5cGUuVE9PTF06IHtjb250ZW50czogW10sIHNob3BzOiBbXX0sXG4gIH07XG4gIC8vIFJlYWQgYWxsIHRoZSBjb250ZW50cy5cbiAgZm9yIChjb25zdCBzaG9wIG9mIHJvbS5zaG9wcykge1xuICAgIGlmICghc2hvcC51c2VkIHx8IHNob3AubG9jYXRpb24gPT09IDB4ZmYpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGRhdGEgPSBzaG9wc1tzaG9wLnR5cGVdO1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBkYXRhLmNvbnRlbnRzLnB1c2goLi4uc2hvcC5jb250ZW50cy5maWx0ZXIoeCA9PiB4ICE9PSAweGZmKSk7XG4gICAgICBkYXRhLnNob3BzLnB1c2goc2hvcCk7XG4gICAgICBzaG9wLmNvbnRlbnRzID0gW107XG4gICAgfVxuICB9XG4gIC8vIFNodWZmbGUgdGhlIGNvbnRlbnRzLiAgUGljayBvcmRlciB0byBkcm9wIGl0ZW1zIGluLlxuICBmb3IgKGNvbnN0IGRhdGEgb2YgT2JqZWN0LnZhbHVlcyhzaG9wcykpIHtcbiAgICBsZXQgc2xvdHM6IFNob3BbXSB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGl0ZW1zID0gWy4uLmRhdGEuY29udGVudHNdO1xuICAgIHJhbmRvbS5zaHVmZmxlKGl0ZW1zKTtcbiAgICB3aGlsZSAoaXRlbXMubGVuZ3RoKSB7XG4gICAgICBpZiAoIXNsb3RzIHx8ICFzbG90cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHNsb3RzKSBpdGVtcy5zaGlmdCgpO1xuICAgICAgICBzbG90cyA9IFsuLi5kYXRhLnNob3BzLCAuLi5kYXRhLnNob3BzLCAuLi5kYXRhLnNob3BzLCAuLi5kYXRhLnNob3BzXTtcbiAgICAgICAgcmFuZG9tLnNodWZmbGUoc2xvdHMpO1xuICAgICAgfVxuICAgICAgY29uc3QgaXRlbSA9IGl0ZW1zWzBdO1xuICAgICAgY29uc3Qgc2hvcCA9IHNsb3RzWzBdO1xuICAgICAgaWYgKHNob3AuY29udGVudHMubGVuZ3RoIDwgNCAmJiAhc2hvcC5jb250ZW50cy5pbmNsdWRlcyhpdGVtKSkge1xuICAgICAgICBzaG9wLmNvbnRlbnRzLnB1c2goaXRlbSk7XG4gICAgICAgIGl0ZW1zLnNoaWZ0KCk7XG4gICAgICB9XG4gICAgICBzbG90cy5zaGlmdCgpO1xuICAgIH1cbiAgfVxuICAvLyBTb3J0IGFuZCBhZGQgMHhmZidzXG4gIGZvciAoY29uc3QgZGF0YSBvZiBPYmplY3QudmFsdWVzKHNob3BzKSkge1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiBkYXRhLnNob3BzKSB7XG4gICAgICB3aGlsZSAoc2hvcC5jb250ZW50cy5sZW5ndGggPCA0KSBzaG9wLmNvbnRlbnRzLnB1c2goMHhmZik7XG4gICAgICBzaG9wLmNvbnRlbnRzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmFuZG9taXplV2FsbHMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICAvLyBOT1RFOiBXZSBjYW4gbWFrZSBhbnkgd2FsbCBzaG9vdCBieSBzZXR0aW5nIGl0cyAkMTAgYml0IG9uIHRoZSB0eXBlIGJ5dGUuXG4gIC8vIEJ1dCB0aGlzIGFsc28gcmVxdWlyZXMgbWF0Y2hpbmcgcGF0dGVybiB0YWJsZXMsIHNvIHdlJ2xsIGxlYXZlIHRoYXQgYWxvbmVcbiAgLy8gZm9yIG5vdyB0byBhdm9pZCBncm9zcyBncmFwaGljcy5cblxuICAvLyBBbGwgb3RoZXIgd2FsbHMgd2lsbCBuZWVkIHRoZWlyIHR5cGUgbW92ZWQgaW50byB0aGUgdXBwZXIgbmliYmxlIGFuZCB0aGVuXG4gIC8vIHRoZSBuZXcgZWxlbWVudCBnb2VzIGluIHRoZSBsb3dlciBuaWJibGUuICBTaW5jZSB0aGVyZSBhcmUgc28gZmV3IGlyb25cbiAgLy8gd2FsbHMsIHdlIHdpbGwgZ2l2ZSB0aGVtIGFyYml0cmFyeSBlbGVtZW50cyBpbmRlcGVuZGVudCBvZiB0aGUgcGFsZXR0ZS5cbiAgLy8gUm9jay9pY2Ugd2FsbHMgY2FuIGFsc28gaGF2ZSBhbnkgZWxlbWVudCwgYnV0IHRoZSB0aGlyZCBwYWxldHRlIHdpbGxcbiAgLy8gaW5kaWNhdGUgd2hhdCB0aGV5IGV4cGVjdC5cblxuICBpZiAoIWZsYWdzLnJhbmRvbWl6ZVdhbGxzKCkpIHJldHVybjtcbiAgLy8gQmFzaWMgcGxhbjogcGFydGl0aW9uIGJhc2VkIG9uIHBhbGV0dGUsIGxvb2sgZm9yIHdhbGxzLlxuICBjb25zdCBwYWxzID0gW1xuICAgIFsweDA1LCAweDM4XSwgLy8gcm9jayB3YWxsIHBhbGV0dGVzXG4gICAgWzB4MTFdLCAvLyBpY2Ugd2FsbCBwYWxldHRlc1xuICAgIFsweDZhXSwgLy8gXCJlbWJlciB3YWxsXCIgcGFsZXR0ZXNcbiAgICBbMHgxNF0sIC8vIFwiaXJvbiB3YWxsXCIgcGFsZXR0ZXNcbiAgXTtcblxuICBmdW5jdGlvbiB3YWxsVHlwZShzcGF3bjogU3Bhd24pOiBudW1iZXIge1xuICAgIGlmIChzcGF3bi5kYXRhWzJdICYgMHgyMCkge1xuICAgICAgcmV0dXJuIChzcGF3bi5pZCA+Pj4gNCkgJiAzO1xuICAgIH1cbiAgICByZXR1cm4gc3Bhd24uaWQgJiAzO1xuICB9XG5cbiAgY29uc3QgcGFydGl0aW9uID0gbmV3IERlZmF1bHRNYXA8QXJlYSwgTG9jYXRpb25bXT4oKCkgPT4gW10pO1xuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBwYXJ0aXRpb24uZ2V0KGxvY2F0aW9uLmRhdGEuYXJlYSkucHVzaChsb2NhdGlvbik7XG4gIH1cbiAgZm9yIChjb25zdCBsb2NhdGlvbnMgb2YgcGFydGl0aW9uLnZhbHVlcygpKSB7XG4gICAgLy8gcGljayBhIHJhbmRvbSB3YWxsIHR5cGUuXG4gICAgY29uc3QgZWx0ID0gcmFuZG9tLm5leHRJbnQoNCk7XG4gICAgY29uc3QgcGFsID0gcmFuZG9tLnBpY2socGFsc1tlbHRdKTtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIGxvY2F0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHdhbGxUeXBlKHNwYXduKTtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gMikgY29udGludWU7XG4gICAgICAgICAgaWYgKHR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld0VsdCA9IHJhbmRvbS5uZXh0SW50KDQpO1xuICAgICAgICAgICAgaWYgKHJvbS5zcG9pbGVyKSByb20uc3BvaWxlci5hZGRXYWxsKGxvY2F0aW9uLm5hbWUsIHR5cGUsIG5ld0VsdCk7XG4gICAgICAgICAgICBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgICAgICAgICBzcGF3bi5pZCA9IDB4MzAgfCBuZXdFbHQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGAke2xvY2F0aW9uLm5hbWV9ICR7dHlwZX0gPT4gJHtlbHR9YCk7XG4gICAgICAgICAgICBpZiAoIWZvdW5kICYmIHJvbS5zcG9pbGVyKSB7XG4gICAgICAgICAgICAgIHJvbS5zcG9pbGVyLmFkZFdhbGwobG9jYXRpb24ubmFtZSwgdHlwZSwgZWx0KTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgICAgICAgICAgc3Bhd24uaWQgPSB0eXBlIDw8IDQgfCBlbHQ7XG4gICAgICAgICAgICBsb2NhdGlvbi50aWxlUGFsZXR0ZXNbMl0gPSBwYWw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vTXVzaWMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBtIG9mIFsuLi5yb20ubG9jYXRpb25zLCAuLi5yb20uYm9zc2VzLm11c2ljc10pIHtcbiAgICBtLmJnbSA9IDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2h1ZmZsZU11c2ljKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiB2b2lkIHtcbiAgaW50ZXJmYWNlIEhhc011c2ljIHsgYmdtOiBudW1iZXI7IH1cbiAgY29uc3QgbXVzaWNzID0gbmV3IERlZmF1bHRNYXA8dW5rbm93biwgSGFzTXVzaWNbXT4oKCkgPT4gW10pO1xuICBjb25zdCBhbGwgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgZm9yIChjb25zdCBsIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBpZiAobC5pZCA9PT0gMHg1ZiB8fCBsLmlkID09PSAwIHx8ICFsLnVzZWQpIGNvbnRpbnVlOyAvLyBza2lwIHN0YXJ0IGFuZCBkeW5hXG4gICAgY29uc3QgbXVzaWMgPSBsLm11c2ljR3JvdXA7XG4gICAgYWxsLmFkZChsLmJnbSk7XG4gICAgbXVzaWNzLmdldChtdXNpYykucHVzaChsKTtcbiAgfVxuICBmb3IgKGNvbnN0IGIgb2Ygcm9tLmJvc3Nlcy5tdXNpY3MpIHtcbiAgICBtdXNpY3Muc2V0KGIsIFtiXSk7XG4gICAgYWxsLmFkZChiLmJnbSk7XG4gIH1cbiAgY29uc3QgbGlzdCA9IFsuLi5hbGxdO1xuICBjb25zdCB1cGRhdGVkID0gbmV3IFNldDxIYXNNdXNpYz4oKTtcbiAgZm9yIChjb25zdCBwYXJ0aXRpb24gb2YgbXVzaWNzLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdmFsdWUgPSByYW5kb20ucGljayhsaXN0KTtcbiAgICBmb3IgKGNvbnN0IG11c2ljIG9mIHBhcnRpdGlvbikge1xuICAgICAgbXVzaWMuYmdtID0gdmFsdWU7XG4gICAgICB1cGRhdGVkLmFkZChtdXNpYyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNodWZmbGVXaWxkV2FycChyb206IFJvbSwgX2ZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBjb25zdCBsb2NhdGlvbnM6IExvY2F0aW9uW10gPSBbXTtcbiAgZm9yIChjb25zdCBsIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBpZiAobCAmJiBsLnVzZWQgJiZcbiAgICAgICAgLy8gZG9uJ3QgYWRkIG1lemFtZSBiZWNhdXNlIHdlIGFscmVhZHkgYWRkIGl0IGFsd2F5c1xuICAgICAgICBsLmlkICYmXG4gICAgICAgIC8vIGRvbid0IHdhcnAgaW50byBzaG9wc1xuICAgICAgICAhbC5pc1Nob3AoKSAmJlxuICAgICAgICAvLyBkb24ndCB3YXJwIGludG8gdG93ZXJcbiAgICAgICAgKGwuaWQgJiAweGY4KSAhPT0gMHg1OCAmJlxuICAgICAgICAvLyBkb24ndCB3YXJwIHRvIGVpdGhlciBzaWRlIG9mIERyYXlnb24gMlxuICAgICAgICBsICE9PSByb20ubG9jYXRpb25zLkNyeXB0X0RyYXlnb24yICYmXG4gICAgICAgIGwgIT09IHJvbS5sb2NhdGlvbnMuQ3J5cHRfVGVsZXBvcnRlciAmJlxuICAgICAgICAvLyBkb24ndCB3YXJwIGludG8gbWVzaWEgc2hyaW5lIGJlY2F1c2Ugb2YgcXVlZW4gbG9naWNcbiAgICAgICAgLy8gKGFuZCBiZWNhdXNlIGl0J3MgYW5ub3lpbmcpXG4gICAgICAgIGwgIT09IHJvbS5sb2NhdGlvbnMuTWVzaWFTaHJpbmUgJiZcbiAgICAgICAgLy8gZG9uJ3Qgd2FycCBpbnRvIHJhZ2UgYmVjYXVzZSBpdCdzIGp1c3QgYW5ub3lpbmdcbiAgICAgICAgbCAhPT0gcm9tLmxvY2F0aW9ucy5MaW1lVHJlZUxha2UpIHtcbiAgICAgIGxvY2F0aW9ucy5wdXNoKGwpO1xuICAgIH1cbiAgfVxuICByYW5kb20uc2h1ZmZsZShsb2NhdGlvbnMpO1xuICByb20ud2lsZFdhcnAubG9jYXRpb25zID0gW107XG4gIGZvciAoY29uc3QgbG9jIG9mIFsuLi5sb2NhdGlvbnMuc2xpY2UoMCwgMTUpLnNvcnQoKGEsIGIpID0+IGEuaWQgLSBiLmlkKV0pIHtcbiAgICByb20ud2lsZFdhcnAubG9jYXRpb25zLnB1c2gobG9jLmlkKTtcbiAgICBpZiAocm9tLnNwb2lsZXIpIHJvbS5zcG9pbGVyLmFkZFdpbGRXYXJwKGxvYy5pZCwgbG9jLm5hbWUpO1xuICB9XG4gIHJvbS53aWxkV2FycC5sb2NhdGlvbnMucHVzaCgwKTtcbn1cblxuZnVuY3Rpb24gYnVmZkR5bmEocm9tOiBSb20sIF9mbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICByb20ub2JqZWN0c1sweGI4XS5jb2xsaXNpb25QbGFuZSA9IDE7XG4gIHJvbS5vYmplY3RzWzB4YjhdLmltbW9iaWxlID0gdHJ1ZTtcbiAgcm9tLm9iamVjdHNbMHhiOV0uY29sbGlzaW9uUGxhbmUgPSAxO1xuICByb20ub2JqZWN0c1sweGI5XS5pbW1vYmlsZSA9IHRydWU7XG4gIHJvbS5vYmplY3RzWzB4MzNdLmNvbGxpc2lvblBsYW5lID0gMjtcbiAgcm9tLmFkSG9jU3Bhd25zWzB4MjhdLnNsb3RSYW5nZUxvd2VyID0gMHgxYzsgLy8gY291bnRlclxuICByb20uYWRIb2NTcGF3bnNbMHgyOV0uc2xvdFJhbmdlVXBwZXIgPSAweDFjOyAvLyBsYXNlclxuICByb20uYWRIb2NTcGF3bnNbMHgyYV0uc2xvdFJhbmdlVXBwZXIgPSAweDFjOyAvLyBidWJibGVcbn1cblxuZnVuY3Rpb24gYmxhY2tvdXRNb2RlKHJvbTogUm9tKSB7XG4gIGNvbnN0IGRnID0gZ2VuZXJhdGVEZXBncmFwaCgpO1xuICBmb3IgKGNvbnN0IG5vZGUgb2YgZGcubm9kZXMpIHtcbiAgICBjb25zdCB0eXBlID0gKG5vZGUgYXMgYW55KS50eXBlO1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAnTG9jYXRpb24nICYmICh0eXBlID09PSAnY2F2ZScgfHwgdHlwZSA9PT0gJ2ZvcnRyZXNzJykpIHtcbiAgICAgIHJvbS5sb2NhdGlvbnNbKG5vZGUgYXMgYW55KS5pZF0udGlsZVBhbGV0dGVzLmZpbGwoMHg5YSk7XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHN0b3J5TW9kZSA9IChyb206IFJvbSkgPT4ge1xuICAvLyBzaHVmZmxlIGhhcyBhbHJlYWR5IGhhcHBlbmVkLCBuZWVkIHRvIHVzZSBzaHVmZmxlZCBmbGFncyBmcm9tXG4gIC8vIE5QQyBzcGF3biBjb25kaXRpb25zLi4uXG4gIGNvbnN0IGNvbmRpdGlvbnMgPSBbXG4gICAgLy8gTm90ZTogaWYgYm9zc2VzIGFyZSBzaHVmZmxlZCB3ZSdsbCBuZWVkIHRvIGRldGVjdCB0aGlzLi4uXG4gICAgcm9tLmZsYWdzLktlbGJlc3F1ZTEuaWQsXG4gICAgcm9tLmZsYWdzLlNhYmVyYTEuaWQsXG4gICAgcm9tLmZsYWdzLk1hZG8xLmlkLFxuICAgIHJvbS5mbGFncy5LZWxiZXNxdWUyLmlkLFxuICAgIHJvbS5mbGFncy5TYWJlcmEyLmlkLFxuICAgIHJvbS5mbGFncy5NYWRvMi5pZCxcbiAgICByb20uZmxhZ3MuS2FybWluZS5pZCxcbiAgICByb20uZmxhZ3MuRHJheWdvbjEuaWQsXG4gICAgcm9tLmZsYWdzLlN3b3JkT2ZXaW5kLmlkLFxuICAgIHJvbS5mbGFncy5Td29yZE9mRmlyZS5pZCxcbiAgICByb20uZmxhZ3MuU3dvcmRPZldhdGVyLmlkLFxuICAgIHJvbS5mbGFncy5Td29yZE9mVGh1bmRlci5pZCxcbiAgICAvLyBUT0RPIC0gc3RhdHVlcyBvZiBtb29uIGFuZCBzdW4gbWF5IGJlIHJlbGV2YW50IGlmIGVudHJhbmNlIHNodWZmbGU/XG4gICAgLy8gVE9ETyAtIHZhbXBpcmVzIGFuZCBpbnNlY3Q/XG4gIF07XG4gIHJvbS5ucGNzWzB4Y2JdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhhNikhLnB1c2goLi4uY29uZGl0aW9ucyk7XG59O1xuXG4vLyBTdGFtcCB0aGUgUk9NXG5leHBvcnQgZnVuY3Rpb24gc3RhbXBWZXJzaW9uU2VlZEFuZEhhc2gocm9tOiBVaW50OEFycmF5LCBzZWVkOiBudW1iZXIsIGZsYWdTdHJpbmc6IHN0cmluZywgZWFybHk6IFVpbnQ4QXJyYXkpOiBudW1iZXIge1xuICAvLyBVc2UgdXAgdG8gMjYgYnl0ZXMgc3RhcnRpbmcgYXQgUFJHICQyNWVhOFxuICAvLyBXb3VsZCBiZSBuaWNlIHRvIHN0b3JlICgxKSBjb21taXQsICgyKSBmbGFncywgKDMpIHNlZWQsICg0KSBoYXNoXG4gIC8vIFdlIGNhbiB1c2UgYmFzZTY0IGVuY29kaW5nIHRvIGhlbHAgc29tZS4uLlxuICAvLyBGb3Igbm93IGp1c3Qgc3RpY2sgaW4gdGhlIGNvbW1pdCBhbmQgc2VlZCBpbiBzaW1wbGUgaGV4XG4gIGNvbnN0IGNyYyA9IGNyYzMyKGVhcmx5KTtcbiAgY29uc3QgY3JjU3RyaW5nID0gY3JjLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg4LCAnMCcpLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IGhhc2ggPSB2ZXJzaW9uLlNUQVRVUyA9PT0gJ3Vuc3RhYmxlJyA/XG4gICAgICB2ZXJzaW9uLkhBU0guc3Vic3RyaW5nKDAsIDcpLnBhZFN0YXJ0KDcsICcwJykudG9VcHBlckNhc2UoKSArICcgICAgICcgOlxuICAgICAgdmVyc2lvbi5WRVJTSU9OLnN1YnN0cmluZygwLCAxMikucGFkRW5kKDEyLCAnICcpO1xuICBjb25zdCBzZWVkU3RyID0gc2VlZC50b1N0cmluZygxNikucGFkU3RhcnQoOCwgJzAnKS50b1VwcGVyQ2FzZSgpO1xuICBjb25zdCBlbWJlZCA9IChhZGRyOiBudW1iZXIsIHRleHQ6IHN0cmluZykgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgcm9tW2FkZHIgKyAweDEwICsgaV0gPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgfVxuICB9O1xuICBjb25zdCBpbnRlcmNhbGF0ZSA9IChzMTogc3RyaW5nLCBzMjogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBvdXQgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHMxLmxlbmd0aCB8fCBpIDwgczIubGVuZ3RoOyBpKyspIHtcbiAgICAgIG91dC5wdXNoKHMxW2ldIHx8ICcgJyk7XG4gICAgICBvdXQucHVzaChzMltpXSB8fCAnICcpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oJycpO1xuICB9O1xuXG4gIGVtYmVkKDB4Mjc3Y2YsIGludGVyY2FsYXRlKCcgIFZFUlNJT04gICAgIFNFRUQgICAgICAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgICAke2hhc2h9JHtzZWVkU3RyfWApKTtcblxuICAvLyBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiAzNikgZmxhZ1N0cmluZyA9IGZsYWdTdHJpbmcucmVwbGFjZSgvIC9nLCAnJyk7XG4gIGxldCBleHRyYUZsYWdzO1xuICBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiA0Nikge1xuICAgIGlmIChmbGFnU3RyaW5nLmxlbmd0aCA+IDkyKSB0aHJvdyBuZXcgRXJyb3IoJ0ZsYWcgc3RyaW5nIHdheSB0b28gbG9uZyEnKTtcbiAgICBleHRyYUZsYWdzID0gZmxhZ1N0cmluZy5zdWJzdHJpbmcoNDYsIDkyKS5wYWRFbmQoNDYsICcgJyk7XG4gICAgZmxhZ1N0cmluZyA9IGZsYWdTdHJpbmcuc3Vic3RyaW5nKDAsIDQ2KTtcbiAgfVxuICAvLyBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPD0gMzYpIHtcbiAgLy8gICAvLyBhdHRlbXB0IHRvIGJyZWFrIGl0IG1vcmUgZmF2b3JhYmx5XG5cbiAgLy8gfVxuICAvLyAgIGZsYWdTdHJpbmcgPSBbJ0ZMQUdTICcsXG4gIC8vICAgICAgICAgICAgICAgICBmbGFnU3RyaW5nLnN1YnN0cmluZygwLCAxOCkucGFkRW5kKDE4LCAnICcpLFxuICAvLyAgICAgICAgICAgICAgICAgJyAgICAgICcsXG5cbiAgLy8gfVxuXG4gIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnBhZEVuZCg0NiwgJyAnKTtcblxuICBlbWJlZCgweDI3N2ZmLCBpbnRlcmNhbGF0ZShmbGFnU3RyaW5nLnN1YnN0cmluZygwLCAyMyksIGZsYWdTdHJpbmcuc3Vic3RyaW5nKDIzKSkpO1xuICBpZiAoZXh0cmFGbGFncykge1xuICAgIGVtYmVkKDB4Mjc4MmYsIGludGVyY2FsYXRlKGV4dHJhRmxhZ3Muc3Vic3RyaW5nKDAsIDIzKSwgZXh0cmFGbGFncy5zdWJzdHJpbmcoMjMpKSk7XG4gIH1cblxuICBlbWJlZCgweDI3ODg1LCBpbnRlcmNhbGF0ZShjcmNTdHJpbmcuc3Vic3RyaW5nKDAsIDQpLCBjcmNTdHJpbmcuc3Vic3RyaW5nKDQpKSk7XG5cbiAgLy8gZW1iZWQoMHgyNWVhOCwgYHYuJHtoYXNofSAgICR7c2VlZH1gKTtcbiAgZW1iZWQoMHgyNTcxNiwgJ1JBTkRPTUlaRVInKTtcbiAgaWYgKHZlcnNpb24uU1RBVFVTID09PSAndW5zdGFibGUnKSBlbWJlZCgweDI1NzNjLCAnQkVUQScpO1xuICAvLyBOT1RFOiBpdCB3b3VsZCBiZSBwb3NzaWJsZSB0byBhZGQgdGhlIGhhc2gvc2VlZC9ldGMgdG8gdGhlIHRpdGxlXG4gIC8vIHBhZ2UgYXMgd2VsbCwgYnV0IHdlJ2QgbmVlZCB0byByZXBsYWNlIHRoZSB1bnVzZWQgbGV0dGVycyBpbiBiYW5rXG4gIC8vICQxZCB3aXRoIHRoZSBtaXNzaW5nIG51bWJlcnMgKEosIFEsIFcsIFgpLCBhcyB3ZWxsIGFzIHRoZSB0d29cbiAgLy8gd2VpcmQgc3F1YXJlcyBhdCAkNWIgYW5kICQ1YyB0aGF0IGRvbid0IGFwcGVhciB0byBiZSB1c2VkLiAgVG9nZXRoZXJcbiAgLy8gd2l0aCB1c2luZyB0aGUgbGV0dGVyICdPJyBhcyAwLCB0aGF0J3Mgc3VmZmljaWVudCB0byBjcmFtIGluIGFsbCB0aGVcbiAgLy8gbnVtYmVycyBhbmQgZGlzcGxheSBhcmJpdHJhcnkgaGV4IGRpZ2l0cy5cblxuICByZXR1cm4gY3JjO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUYWJsZXNQcmVDb21taXQocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KSB7XG4gIC8vIENoYW5nZSBzb21lIGVuZW15IHNjYWxpbmcgZnJvbSB0aGUgZGVmYXVsdCwgaWYgZmxhZ3MgYXNrIGZvciBpdC5cbiAgaWYgKGZsYWdzLmRlY3JlYXNlRW5lbXlEYW1hZ2UoKSkge1xuICAgIHJvbS5zY2FsaW5nLnNldFBocEZvcm11bGEocyA9PiAxNiArIDYgKiBzKTtcbiAgfVxuICByb20uc2NhbGluZy5zZXRFeHBTY2FsaW5nRmFjdG9yKGZsYWdzLmV4cFNjYWxpbmdGYWN0b3IoKSk7XG5cbiAgLy8gVXBkYXRlIHRoZSBjb2luIGRyb3AgYnVja2V0cyAoZ29lcyB3aXRoIGVuZW15IHN0YXQgcmVjb21wdXRhdGlvbnNcbiAgLy8gaW4gcG9zdHNodWZmbGUucylcbiAgaWYgKGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCkpIHtcbiAgICAvLyBiaWdnZXIgZ29sZCBkcm9wcyBpZiBubyBzaG9wIGdsaXRjaCwgcGFydGljdWxhcmx5IGF0IHRoZSBzdGFydFxuICAgIC8vIC0gc3RhcnRzIG91dCBmaWJvbmFjY2ksIHRoZW4gZ29lcyBsaW5lYXIgYXQgNjAwXG4gICAgcm9tLmNvaW5Ecm9wcy52YWx1ZXMgPSBbXG4gICAgICAgIDAsICAgNSwgIDEwLCAgMTUsICAyNSwgIDQwLCAgNjUsICAxMDUsXG4gICAgICAxNzAsIDI3NSwgNDQ1LCA2MDAsIDcwMCwgODAwLCA5MDAsIDEwMDAsXG4gICAgXTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0aGlzIHRhYmxlIGlzIGJhc2ljYWxseSBtZWFuaW5nbGVzcyBiL2Mgc2hvcCBnbGl0Y2hcbiAgICByb20uY29pbkRyb3BzLnZhbHVlcyA9IFtcbiAgICAgICAgMCwgICAxLCAgIDIsICAgNCwgICA4LCAgMTYsICAzMCwgIDUwLFxuICAgICAgMTAwLCAyMDAsIDMwMCwgNDAwLCA1MDAsIDYwMCwgNzAwLCA4MDAsXG4gICAgXTtcbiAgfVxuXG4gIC8vIFVwZGF0ZSBzaGllbGQgYW5kIGFybW9yIGRlZmVuc2UgdmFsdWVzLlxuICAvLyBTb21lIG9mIHRoZSBcIm1pZGRsZVwiIHNoaWVsZHMgYXJlIDIgcG9pbnRzIHdlYWtlciB0aGFuIHRoZSBjb3JyZXNwb25kaW5nXG4gIC8vIGFybW9ycy4gIElmIHdlIGluc3RlYWQgYXZlcmFnZSB0aGUgc2hpZWxkL2FybW9yIHZhbHVlcyBhbmQgYnVtcCArMSBmb3JcbiAgLy8gdGhlIGNhcmFwYWNlIGxldmVsLCB3ZSBnZXQgYSBwcmV0dHkgZGVjZW50IHByb2dyZXNzaW9uOiAzLCA2LCA5LCAxMywgMTgsXG4gIC8vIHdoaWNoIGlzICszLCArMywgKzMsICs0LCArNS5cbiAgcm9tLml0ZW1zLkNhcmFwYWNlU2hpZWxkLmRlZmVuc2UgPSByb20uaXRlbXMuVGFubmVkSGlkZS5kZWZlbnNlID0gMztcbiAgcm9tLml0ZW1zLlBsYXRpbnVtU2hpZWxkLmRlZmVuc2UgPSByb20uaXRlbXMuQnJvbnplQXJtb3IuZGVmZW5zZSA9IDk7XG4gIHJvbS5pdGVtcy5NaXJyb3JlZFNoaWVsZC5kZWZlbnNlID0gcm9tLml0ZW1zLlBsYXRpbnVtQXJtb3IuZGVmZW5zZSA9IDEzO1xuICAvLyBGb3IgdGhlIGhpZ2gtZW5kIGFybW9ycywgd2Ugd2FudCB0byBiYWxhbmNlIG91dCB0aGUgdG9wIHRocmVlIGEgYml0XG4gIC8vIGJldHRlci4gIFNhY3JlZCBzaGllbGQgYWxyZWFkeSBoYXMgbG93ZXIgZGVmZW5zZSAoMTYpIHRoYW4gdGhlIHByZXZpb3VzXG4gIC8vIG9uZSwgYXMgZG9lcyBiYXR0bGUgYXJtb3IgKDIwKSwgc28gd2UgbGVhdmUgdGhlbSBiZS4gIFBzeWNob3MgYXJlXG4gIC8vIGRlbW90ZWQgZnJvbSAzMiB0byAyMCwgYW5kIHRoZSBuby1leHRyYS1wb3dlciBhcm1vcnMgZ2V0IHRoZSAzMi5cbiAgcm9tLml0ZW1zLlBzeWNob0FybW9yLmRlZmVuc2UgPSByb20uaXRlbXMuUHN5Y2hvU2hpZWxkLmRlZmVuc2UgPSAyMDtcbiAgcm9tLml0ZW1zLkNlcmFtaWNTdWl0LmRlZmVuc2UgPSByb20uaXRlbXMuQmF0dGxlU2hpZWxkLmRlZmVuc2UgPSAzMjtcblxuICAvLyBCVVQuLi4gZm9yIG5vdyB3ZSBkb24ndCB3YW50IHRvIG1ha2UgYW55IGNoYW5nZXMsIHNvIGZpeCBpdCBiYWNrLlxuICByb20uaXRlbXMuQ2FyYXBhY2VTaGllbGQuZGVmZW5zZSA9IHJvbS5pdGVtcy5UYW5uZWRIaWRlLmRlZmVuc2UgPSAyO1xuICByb20uaXRlbXMuUGxhdGludW1TaGllbGQuZGVmZW5zZSA9IHJvbS5pdGVtcy5Ccm9uemVBcm1vci5kZWZlbnNlID0gMTA7XG4gIHJvbS5pdGVtcy5NaXJyb3JlZFNoaWVsZC5kZWZlbnNlID0gcm9tLml0ZW1zLlBsYXRpbnVtQXJtb3IuZGVmZW5zZSA9IDE0O1xuICByb20uaXRlbXMuQmF0dGxlQXJtb3IuZGVmZW5zZSA9IDI0O1xufVxuXG5jb25zdCByZXNjYWxlU2hvcHMgPSAocm9tOiBSb20sIHJhbmRvbT86IFJhbmRvbSkgPT4ge1xuICAvLyBQb3B1bGF0ZSByZXNjYWxlZCBwcmljZXMgaW50byB0aGUgdmFyaW91cyByb20gbG9jYXRpb25zLlxuICAvLyBTcGVjaWZpY2FsbHksIHdlIHJlYWQgdGhlIGF2YWlsYWJsZSBpdGVtIElEcyBvdXQgb2YgdGhlXG4gIC8vIHNob3AgdGFibGVzIGFuZCB0aGVuIGNvbXB1dGUgbmV3IHByaWNlcyBmcm9tIHRoZXJlLlxuICAvLyBJZiBgcmFuZG9tYCBpcyBwYXNzZWQgdGhlbiB0aGUgYmFzZSBwcmljZSB0byBidXkgZWFjaFxuICAvLyBpdGVtIGF0IGFueSBnaXZlbiBzaG9wIHdpbGwgYmUgYWRqdXN0ZWQgdG8gYW55d2hlcmUgZnJvbVxuICAvLyA1MCUgdG8gMTUwJSBvZiB0aGUgYmFzZSBwcmljZS4gIFRoZSBwYXduIHNob3AgcHJpY2UgaXNcbiAgLy8gYWx3YXlzIDUwJSBvZiB0aGUgYmFzZSBwcmljZS5cblxuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKHNob3AudHlwZSA9PT0gU2hvcFR5cGUuUEFXTikgY29udGludWU7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNob3AucHJpY2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoc2hvcC5jb250ZW50c1tpXSA8IDB4ODApIHtcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSByYW5kb20gPyByYW5kb20ubmV4dE5vcm1hbCgxLCAwLjMsIDAuNSwgMS41KSA6IDE7XG4gICAgICB9IGVsc2UgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuSU5OKSB7XG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGp1c3Qgc2V0IHRoZSBvbmUgcHJpY2VcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSByYW5kb20gPyByYW5kb20ubmV4dE5vcm1hbCgxLCAwLjUsIDAuMzc1LCAxLjYyNSkgOiAxO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBBbHNvIGZpbGwgdGhlIHNjYWxpbmcgdGFibGVzLlxuICBjb25zdCBkaWZmID0gc2VxKDQ4IC8qYXNtLmV4cGFuZCgnU2NhbGluZ0xldmVscycpKi8sIHggPT4geCk7XG4gIHJvbS5zaG9wcy5yZXNjYWxlID0gdHJ1ZTtcbiAgLy8gVG9vbCBzaG9wcyBzY2FsZSBhcyAyICoqIChEaWZmIC8gMTApLCBzdG9yZSBpbiA4dGhzXG4gIHJvbS5zaG9wcy50b29sU2hvcFNjYWxpbmcgPSBkaWZmLm1hcChkID0+IE1hdGgucm91bmQoOCAqICgyICoqIChkIC8gMTApKSkpO1xuICAvLyBBcm1vciBzaG9wcyBzY2FsZSBhcyAyICoqICgoNDcgLSBEaWZmKSAvIDEyKSwgc3RvcmUgaW4gOHRoc1xuICByb20uc2hvcHMuYXJtb3JTaG9wU2NhbGluZyA9XG4gICAgICBkaWZmLm1hcChkID0+IE1hdGgucm91bmQoOCAqICgyICoqICgoNDcgLSBkKSAvIDEyKSkpKTtcblxuICAvLyBTZXQgdGhlIGl0ZW0gYmFzZSBwcmljZXMuXG4gIGZvciAobGV0IGkgPSAweDBkOyBpIDwgMHgyNzsgaSsrKSB7XG4gICAgcm9tLml0ZW1zW2ldLmJhc2VQcmljZSA9IEJBU0VfUFJJQ0VTW2ldO1xuICB9XG4gXG4gLy8gVE9ETyAtIHNlcGFyYXRlIGZsYWcgZm9yIHJlc2NhbGluZyBtb25zdGVycz8/P1xufTtcblxuLy8gTWFwIG9mIGJhc2UgcHJpY2VzLiAgKFRvb2xzIGFyZSBwb3NpdGl2ZSwgYXJtb3JzIGFyZSBvbmVzLWNvbXBsZW1lbnQuKVxuY29uc3QgQkFTRV9QUklDRVM6IHtbaXRlbUlkOiBudW1iZXJdOiBudW1iZXJ9ID0ge1xuICAvLyBBcm1vcnNcbiAgMHgwZDogNCwgICAgLy8gY2FyYXBhY2Ugc2hpZWxkXG4gIDB4MGU6IDE2LCAgIC8vIGJyb256ZSBzaGllbGRcbiAgMHgwZjogNTAsICAgLy8gcGxhdGludW0gc2hpZWxkXG4gIDB4MTA6IDMyNSwgIC8vIG1pcnJvcmVkIHNoaWVsZFxuICAweDExOiAxMDAwLCAvLyBjZXJhbWljIHNoaWVsZFxuICAweDEyOiAyMDAwLCAvLyBzYWNyZWQgc2hpZWxkXG4gIDB4MTM6IDQwMDAsIC8vIGJhdHRsZSBzaGllbGRcbiAgMHgxNTogNiwgICAgLy8gdGFubmVkIGhpZGVcbiAgMHgxNjogMjAsICAgLy8gbGVhdGhlciBhcm1vclxuICAweDE3OiA3NSwgICAvLyBicm9uemUgYXJtb3JcbiAgMHgxODogMjUwLCAgLy8gcGxhdGludW0gYXJtb3JcbiAgMHgxOTogMTAwMCwgLy8gc29sZGllciBzdWl0XG4gIDB4MWE6IDQ4MDAsIC8vIGNlcmFtaWMgc3VpdFxuICAvLyBUb29sc1xuICAweDFkOiAyNSwgICAvLyBtZWRpY2FsIGhlcmJcbiAgMHgxZTogMzAsICAgLy8gYW50aWRvdGVcbiAgMHgxZjogNDUsICAgLy8gbHlzaXMgcGxhbnRcbiAgMHgyMDogNDAsICAgLy8gZnJ1aXQgb2YgbGltZVxuICAweDIxOiAzNiwgICAvLyBmcnVpdCBvZiBwb3dlclxuICAweDIyOiAyMDAsICAvLyBtYWdpYyByaW5nXG4gIDB4MjM6IDE1MCwgIC8vIGZydWl0IG9mIHJlcHVuXG4gIDB4MjQ6IDY1LCAgIC8vIHdhcnAgYm9vdHNcbiAgMHgyNjogMzAwLCAgLy8gb3BlbCBzdGF0dWVcbiAgLy8gMHgzMTogNTAsIC8vIGFsYXJtIGZsdXRlXG59O1xuXG4vLy8vLy8vLy9cbi8vLy8vLy8vL1xuLy8vLy8vLy8vXG5cbi8vIGNvbnN0IGlkZW50aWZ5S2V5SXRlbXNGb3JEaWZmaWN1bHR5QnVmZnMgPSAocm9tOiBSb20pID0+IHtcbi8vICAgLy8gLy8gVGFnIGtleSBpdGVtcyBmb3IgZGlmZmljdWx0eSBidWZmc1xuLy8gICAvLyBmb3IgKGNvbnN0IGdldCBvZiByb20uaXRlbUdldHMpIHtcbi8vICAgLy8gICBjb25zdCBpdGVtID0gSVRFTVMuZ2V0KGdldC5pdGVtSWQpO1xuLy8gICAvLyAgIGlmICghaXRlbSB8fCAhaXRlbS5rZXkpIGNvbnRpbnVlO1xuLy8gICAvLyAgIGdldC5rZXkgPSB0cnVlO1xuLy8gICAvLyB9XG4vLyAgIC8vIC8vIGNvbnNvbGUubG9nKHJlcG9ydCk7XG4vLyAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHg0OTsgaSsrKSB7XG4vLyAgICAgLy8gTk9URSAtIHNwZWNpYWwgaGFuZGxpbmcgZm9yIGFsYXJtIGZsdXRlIHVudGlsIHdlIHByZS1wYXRjaFxuLy8gICAgIGNvbnN0IHVuaXF1ZSA9IChyb20ucHJnWzB4MjBmZjAgKyBpXSAmIDB4NDApIHx8IGkgPT09IDB4MzE7XG4vLyAgICAgY29uc3QgYml0ID0gMSA8PCAoaSAmIDcpO1xuLy8gICAgIGNvbnN0IGFkZHIgPSAweDFlMTEwICsgKGkgPj4+IDMpO1xuLy8gICAgIHJvbS5wcmdbYWRkcl0gPSByb20ucHJnW2FkZHJdICYgfmJpdCB8ICh1bmlxdWUgPyBiaXQgOiAwKTtcbi8vICAgfVxuLy8gfTtcblxuLy8gV2hlbiBkZWFsaW5nIHdpdGggY29uc3RyYWludHMsIGl0J3MgYmFzaWNhbGx5IGtzYXRcbi8vICAtIHdlIGhhdmUgYSBsaXN0IG9mIHJlcXVpcmVtZW50cyB0aGF0IGFyZSBBTkRlZCB0b2dldGhlclxuLy8gIC0gZWFjaCBpcyBhIGxpc3Qgb2YgcHJlZGljYXRlcyB0aGF0IGFyZSBPUmVkIHRvZ2V0aGVyXG4vLyAgLSBlYWNoIHByZWRpY2F0ZSBoYXMgYSBjb250aW51YXRpb24gZm9yIHdoZW4gaXQncyBwaWNrZWRcbi8vICAtIG5lZWQgYSB3YXkgdG8gdGhpbiB0aGUgY3Jvd2QsIGVmZmljaWVudGx5IGNoZWNrIGNvbXBhdCwgZXRjXG4vLyBQcmVkaWNhdGUgaXMgYSBmb3VyLWVsZW1lbnQgYXJyYXkgW3BhdDAscGF0MSxwYWwyLHBhbDNdXG4vLyBSYXRoZXIgdGhhbiBhIGNvbnRpbnVhdGlvbiB3ZSBjb3VsZCBnbyB0aHJvdWdoIGFsbCB0aGUgc2xvdHMgYWdhaW5cblxuLy8gY2xhc3MgQ29uc3RyYWludHMge1xuLy8gICBjb25zdHJ1Y3RvcigpIHtcbi8vICAgICAvLyBBcnJheSBvZiBwYXR0ZXJuIHRhYmxlIG9wdGlvbnMuICBOdWxsIGluZGljYXRlcyB0aGF0IGl0IGNhbiBiZSBhbnl0aGluZy5cbi8vICAgICAvL1xuLy8gICAgIHRoaXMucGF0dGVybnMgPSBbW251bGwsIG51bGxdXTtcbi8vICAgICB0aGlzLnBhbGV0dGVzID0gW1tudWxsLCBudWxsXV07XG4vLyAgICAgdGhpcy5mbHllcnMgPSAwO1xuLy8gICB9XG5cbi8vICAgcmVxdWlyZVRyZWFzdXJlQ2hlc3QoKSB7XG4vLyAgICAgdGhpcy5yZXF1aXJlT3JkZXJlZFNsb3QoMCwgVFJFQVNVUkVfQ0hFU1RfQkFOS1MpO1xuLy8gICB9XG5cbi8vICAgcmVxdWlyZU9yZGVyZWRTbG90KHNsb3QsIHNldCkge1xuXG4vLyAgICAgaWYgKCF0aGlzLm9yZGVyZWQpIHtcblxuLy8gICAgIH1cbi8vIC8vIFRPRE9cbi8vICAgICB0aGlzLnBhdDAgPSBpbnRlcnNlY3QodGhpcy5wYXQwLCBzZXQpO1xuXG4vLyAgIH1cblxuLy8gfVxuXG4vLyBjb25zdCBpbnRlcnNlY3QgPSAobGVmdCwgcmlnaHQpID0+IHtcbi8vICAgaWYgKCFyaWdodCkgdGhyb3cgbmV3IEVycm9yKCdyaWdodCBtdXN0IGJlIG5vbnRyaXZpYWwnKTtcbi8vICAgaWYgKCFsZWZ0KSByZXR1cm4gcmlnaHQ7XG4vLyAgIGNvbnN0IG91dCA9IG5ldyBTZXQoKTtcbi8vICAgZm9yIChjb25zdCB4IG9mIGxlZnQpIHtcbi8vICAgICBpZiAocmlnaHQuaGFzKHgpKSBvdXQuYWRkKHgpO1xuLy8gICB9XG4vLyAgIHJldHVybiBvdXQ7XG4vLyB9XG5cblxuLy8gdXNlZnVsIGZvciBkZWJ1ZyBldmVuIGlmIG5vdCBjdXJyZW50bHkgdXNlZFxuY29uc3QgW10gPSBbaGV4XTtcbiJdfQ==