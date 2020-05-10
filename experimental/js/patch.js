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
import { compressMapData } from './pass/compressmapdata.js';
import { crumblingPlatforms } from './pass/crumblingplatforms.js';
import { deterministic, deterministicPreParse } from './pass/deterministic.js';
import { fixDialog } from './pass/fixdialog.js';
import { fixMovementScripts } from './pass/fixmovementscripts.js';
import { fixSkippableExits } from './pass/fixskippableexits.js';
import { randomizeThunderWarp } from './pass/randomizethunderwarp.js';
import { rescaleMonsters } from './pass/rescalemonsters.js';
import { shuffleGoa } from './pass/shufflegoa.js';
import { shuffleMazes } from './pass/shufflemazes.js';
import { shuffleMimics } from './pass/shufflemimics.js';
import { shuffleMonsterPositions } from './pass/shufflemonsterpositions.js';
import { shuffleMonsters } from './pass/shufflemonsters.js';
import { shufflePalettes } from './pass/shufflepalettes.js';
import { shuffleTrades } from './pass/shuffletrades.js';
import { standardMapEdits } from './pass/standardmapedits.js';
import { toggleMaps } from './pass/togglemaps.js';
import { unidentifiedItems } from './pass/unidentifieditems.js';
import { writeLocationsFromMeta } from './pass/writelocationsfrommeta.js';
import { Random } from './random.js';
import { Rom } from './rom.js';
import { fixTilesets } from './rom/screenfix.js';
import { ShopType } from './rom/shop.js';
import { Spoiler } from './rom/spoiler.js';
import { hex, seq, watchArray } from './rom/util.js';
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
        _MAX_SCALING_IN_TOWER: flags.maxScalingInTower(),
        _NERF_FLIGHT: true,
        _NERF_MADO: true,
        _NEVER_DIE: flags.neverDie(),
        _NORMALIZE_SHOP_PRICES: flags.shuffleShops(),
        _PITY_HP_AND_MP: true,
        _PROGRESSIVE_BRACELET: true,
        _RABBIT_BOOTS_CHARGE_WHILE_WALKING: flags.rabbitBootsChargeWhileWalking(),
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
        _ZEBU_STUDENT_GIVES_ITEM: true,
    };
    return Object.keys(defines)
        .filter(d => defines[d]).map(d => `.define ${d} 1\n`).join('');
}
export async function shuffle(rom, seed, flags, reader, log, progress) {
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
    if (typeof seed !== 'number')
        throw new Error('Bad seed');
    const newSeed = crc32(seed.toString(16).padStart(8, '0') + String(flags.filterOptional())) >>> 0;
    const random = new Random(newSeed);
    const originalFlagString = String(flags);
    flags = flags.filterRandom(random);
    const actualFlagString = String(flags);
    deterministicPreParse(rom.subarray(0x10));
    const parsed = new Rom(rom);
    parsed.flags.defrag();
    compressMapData(parsed);
    parsed.moveScreens(parsed.metatilesets.swamp, 4);
    parsed.moveScreens(parsed.metatilesets.house, 4);
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
    shuffleTrades(parsed, flags, random);
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
    const fill = await graph.shuffle(flags, random, undefined, progress, parsed.spoiler);
    if (fill) {
        for (const [slot, item] of fill) {
            parsed.slots[slot & 0xff] = item & 0xff;
        }
    }
    else {
        return [rom, -1];
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
        toks.enter(TokenSource.concat(new Tokenizer(flagFile, 'flags.s'), await tokenizer('init.s'), await tokenizer('preshuffle.s'), await tokenizer('postparse.s'), await tokenizer('postshuffle.s')));
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
    const crc = stampVersionSeedAndHash(rom, seed, originalFlagString, prgCopy);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDakMsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ25ELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDakQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakMsT0FBTyxFQUFrQixRQUFRLElBQUksZ0JBQWdCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDNUUsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDckMsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sOEJBQThCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGFBQWEsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzdFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSw2QkFBNkIsQ0FB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QUksRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN6QztBQUdILENBQUMsQ0FBQztBQUdGLE1BQU0sV0FBVyxHQUErQjtJQUU5QyxJQUFJLEVBQUUsQ0FBQztJQUNQLElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsR0FBRztJQUNULElBQUksRUFBRSxJQUFJO0lBQ1YsSUFBSSxFQUFFLElBQUk7SUFDVixJQUFJLEVBQUUsSUFBSTtJQUNWLElBQUksRUFBRSxDQUFDO0lBQ1AsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxHQUFHO0lBQ1QsSUFBSSxFQUFFLElBQUk7SUFDVixJQUFJLEVBQUUsSUFBSTtJQUVWLElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsR0FBRztJQUNULElBQUksRUFBRSxHQUFHO0lBQ1QsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsR0FBRztDQUVWLENBQUM7QUFvRUYsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXNzZW1ibGVyfSBmcm9tICcuL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHtDcHV9IGZyb20gJy4vYXNtL2NwdS5qcyc7XG5pbXBvcnQge1ByZXByb2Nlc3Nvcn0gZnJvbSAnLi9hc20vcHJlcHJvY2Vzc29yLmpzJztcbmltcG9ydCB7VG9rZW5Tb3VyY2V9IGZyb20gJy4vYXNtL3Rva2VuLmpzJztcbmltcG9ydCB7VG9rZW5TdHJlYW19IGZyb20gJy4vYXNtL3Rva2Vuc3RyZWFtLmpzJztcbmltcG9ydCB7VG9rZW5pemVyfSBmcm9tICcuL2FzbS90b2tlbml6ZXIuanMnO1xuaW1wb3J0IHtjcmMzMn0gZnJvbSAnLi9jcmMzMi5qcyc7XG5pbXBvcnQge1Byb2dyZXNzVHJhY2tlciwgZ2VuZXJhdGUgYXMgZ2VuZXJhdGVEZXBncmFwaH0gZnJvbSAnLi9kZXBncmFwaC5qcyc7XG5pbXBvcnQge0ZldGNoUmVhZGVyfSBmcm9tICcuL2ZldGNocmVhZGVyLmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7R3JhcGh9IGZyb20gJy4vbG9naWMvZ3JhcGguanMnO1xuaW1wb3J0IHtXb3JsZH0gZnJvbSAnLi9sb2dpYy93b3JsZC5qcyc7XG5pbXBvcnQge2NvbXByZXNzTWFwRGF0YX0gZnJvbSAnLi9wYXNzL2NvbXByZXNzbWFwZGF0YS5qcyc7XG5pbXBvcnQge2NydW1ibGluZ1BsYXRmb3Jtc30gZnJvbSAnLi9wYXNzL2NydW1ibGluZ3BsYXRmb3Jtcy5qcyc7XG5pbXBvcnQge2RldGVybWluaXN0aWMsIGRldGVybWluaXN0aWNQcmVQYXJzZX0gZnJvbSAnLi9wYXNzL2RldGVybWluaXN0aWMuanMnO1xuaW1wb3J0IHtmaXhEaWFsb2d9IGZyb20gJy4vcGFzcy9maXhkaWFsb2cuanMnO1xuaW1wb3J0IHtmaXhNb3ZlbWVudFNjcmlwdHN9IGZyb20gJy4vcGFzcy9maXhtb3ZlbWVudHNjcmlwdHMuanMnO1xuaW1wb3J0IHtmaXhTa2lwcGFibGVFeGl0c30gZnJvbSAnLi9wYXNzL2ZpeHNraXBwYWJsZWV4aXRzLmpzJztcbmltcG9ydCB7cmFuZG9taXplVGh1bmRlcldhcnB9IGZyb20gJy4vcGFzcy9yYW5kb21pemV0aHVuZGVyd2FycC5qcyc7XG5pbXBvcnQge3Jlc2NhbGVNb25zdGVyc30gZnJvbSAnLi9wYXNzL3Jlc2NhbGVtb25zdGVycy5qcyc7XG5pbXBvcnQge3NodWZmbGVHb2F9IGZyb20gJy4vcGFzcy9zaHVmZmxlZ29hLmpzJztcbmltcG9ydCB7c2h1ZmZsZU1hemVzfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZW1hemVzLmpzJztcbmltcG9ydCB7c2h1ZmZsZU1pbWljc30gZnJvbSAnLi9wYXNzL3NodWZmbGVtaW1pY3MuanMnO1xuaW1wb3J0IHtzaHVmZmxlTW9uc3RlclBvc2l0aW9uc30gZnJvbSAnLi9wYXNzL3NodWZmbGVtb25zdGVycG9zaXRpb25zLmpzJztcbmltcG9ydCB7c2h1ZmZsZU1vbnN0ZXJzfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZW1vbnN0ZXJzLmpzJztcbmltcG9ydCB7c2h1ZmZsZVBhbGV0dGVzfSBmcm9tICcuL3Bhc3Mvc2h1ZmZsZXBhbGV0dGVzLmpzJztcbmltcG9ydCB7c2h1ZmZsZVRyYWRlc30gZnJvbSAnLi9wYXNzL3NodWZmbGV0cmFkZXMuanMnO1xuaW1wb3J0IHtzdGFuZGFyZE1hcEVkaXRzfSBmcm9tICcuL3Bhc3Mvc3RhbmRhcmRtYXBlZGl0cy5qcyc7XG5pbXBvcnQge3RvZ2dsZU1hcHN9IGZyb20gJy4vcGFzcy90b2dnbGVtYXBzLmpzJztcbmltcG9ydCB7dW5pZGVudGlmaWVkSXRlbXN9IGZyb20gJy4vcGFzcy91bmlkZW50aWZpZWRpdGVtcy5qcyc7XG5pbXBvcnQge3dyaXRlTG9jYXRpb25zRnJvbU1ldGF9IGZyb20gJy4vcGFzcy93cml0ZWxvY2F0aW9uc2Zyb21tZXRhLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuL3JhbmRvbS5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi9yb20uanMnO1xuaW1wb3J0IHtBcmVhfSBmcm9tICcuL3JvbS9hcmVhLmpzJztcbmltcG9ydCB7TG9jYXRpb24sIFNwYXdufSBmcm9tICcuL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge2ZpeFRpbGVzZXRzfSBmcm9tICcuL3JvbS9zY3JlZW5maXguanMnO1xuaW1wb3J0IHtTaG9wLCBTaG9wVHlwZX0gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtoZXgsIHNlcSwgd2F0Y2hBcnJheX0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge0RlZmF1bHRNYXB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQgKiBhcyB2ZXJzaW9uIGZyb20gJy4vdmVyc2lvbi5qcyc7XG5cbmNvbnN0IEVYUEFORF9QUkc6IGJvb2xlYW4gPSB0cnVlO1xuXG4vLyAod2luZG93IGFzIGFueSkuQ2F2ZVNodWZmbGUgPSBDYXZlU2h1ZmZsZTtcbi8vIGZ1bmN0aW9uIHNodWZmbGVDYXZlKHNlZWQ6IG51bWJlciwgcGFyYW1zOiBhbnksIG51bSA9IDEwMDApIHtcbi8vICAgZm9yIChsZXQgaSA9IHNlZWQ7IGkgPCBzZWVkICsgbnVtOyBpKyspIHtcbi8vICAgICBjb25zdCBzID0gbmV3IENhdmVTaHVmZmxlKHsuLi5wYXJhbXMsIHRpbGVzZXQ6ICh3aW5kb3cgYXMgYW55KS5yb20ubWV0YXRpbGVzZXRzLmNhdmV9LCBpKTtcbi8vICAgICBzLm1pblNwaWtlcyA9IDM7XG4vLyAgICAgdHJ5IHtcbi8vICAgICAgIGlmIChzLmJ1aWxkKCkpIHtcbi8vICAgICAgICAgY29uc29sZS5sb2coYHNlZWQgJHtpfTpcXG4ke3MuZ3JpZC5zaG93KCl9XFxuJHtzLm1ldGEhLnNob3coKX1gKTtcbi8vICAgICAgICAgcmV0dXJuO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgY29uc29sZS5sb2coYGZhaWw6XFxuJHtzLmdyaWQuc2hvdygpfWApO1xuLy8gICAgICAgfVxuLy8gICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuLy8gICAgICAgY29uc29sZS5sb2coYGZhaWwgJHtpfTpcXG4ke3MuZ3JpZC5zaG93KCl9YCk7XG4vLyAgICAgfVxuLy8gICB9XG4vLyAgIGNvbnNvbGUubG9nKGBmYWlsYCk7XG4vLyB9XG5cbi8vIGNsYXNzIFNoaW1Bc3NlbWJsZXIge1xuLy8gICBwcmU6IFByZXByb2Nlc3Nvcjtcbi8vICAgZXhwb3J0cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG5cbi8vICAgY29uc3RydWN0b3IoY29kZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcpIHtcbi8vICAgICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKENwdS5QMDIpO1xuLy8gICAgIGNvbnN0IHRva3MgPSBuZXcgVG9rZW5TdHJlYW0oKTtcbi8vICAgICB0b2tzLmVudGVyKG5ldyBUb2tlbml6ZXIoY29kZSwgZmlsZSkpO1xuLy8gICAgIHRoaXMucHJlID0gbmV3IFByZXByb2Nlc3Nvcih0b2tzLCBhc20pO1xuLy8gICAgIHdoaWxlICh0aGlzLnByZS5uZXh0KCkpIHt9XG4vLyAgIH1cblxuLy8gICBhc3NlbWJsZShjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgcm9tOiBVaW50OEFycmF5KSB7XG4vLyAgICAgY29uc3QgYXNtID0gbmV3IEFzc2VtYmxlcihDcHUuUDAyKTtcbi8vICAgICBjb25zdCB0b2tzID0gbmV3IFRva2VuU3RyZWFtKCk7XG4vLyAgICAgdG9rcy5lbnRlcihuZXcgVG9rZW5pemVyKGNvZGUsIGZpbGUpKTtcbi8vICAgICBjb25zdCBwcmUgPSBuZXcgUHJlcHJvY2Vzc29yKHRva3MsIGFzbSwgdGhpcy5wcmUpO1xuLy8gICAgIGFzbS50b2tlbnMocHJlKTtcbi8vICAgICBjb25zdCBsaW5rID0gbmV3IExpbmtlcigpO1xuLy8gICAgIGxpbmsucmVhZChhc20ubW9kdWxlKCkpO1xuLy8gICAgIGxpbmsubGluaygpLmFkZE9mZnNldCgweDEwKS5hcHBseShyb20pO1xuLy8gICAgIGZvciAoY29uc3QgW3MsIHZdIG9mIGxpbmsuZXhwb3J0cygpKSB7XG4vLyAgICAgICAvL2lmICghdi5vZmZzZXQpIHRocm93IG5ldyBFcnJvcihgbm8gb2Zmc2V0OiAke3N9YCk7XG4vLyAgICAgICB0aGlzLmV4cG9ydHMuc2V0KHMsIHYub2Zmc2V0ID8/IHYudmFsdWUpO1xuLy8gICAgIH1cbi8vICAgfVxuXG4vLyAgIGV4cGFuZChzOiBzdHJpbmcpIHtcbi8vICAgICBjb25zdCB2ID0gdGhpcy5leHBvcnRzLmdldChzKTtcbi8vICAgICBpZiAoIXYpIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBleHBvcnQ6ICR7c31gKTtcbi8vICAgICByZXR1cm4gdjtcbi8vICAgfVxuLy8gfVxuXG5cbi8vIFRPRE8gLSB0byBzaHVmZmxlIHRoZSBtb25zdGVycywgd2UgbmVlZCB0byBmaW5kIHRoZSBzcHJpdGUgcGFsdHRlcyBhbmRcbi8vIHBhdHRlcm5zIGZvciBlYWNoIG1vbnN0ZXIuICBFYWNoIGxvY2F0aW9uIHN1cHBvcnRzIHVwIHRvIHR3byBtYXRjaHVwcyxcbi8vIHNvIGNhbiBvbmx5IHN1cHBvcnQgbW9uc3RlcnMgdGhhdCBtYXRjaC4gIE1vcmVvdmVyLCBkaWZmZXJlbnQgbW9uc3RlcnNcbi8vIHNlZW0gdG8gbmVlZCB0byBiZSBpbiBlaXRoZXIgc2xvdCAwIG9yIDEuXG5cbi8vIFB1bGwgaW4gYWxsIHRoZSBwYXRjaGVzIHdlIHdhbnQgdG8gYXBwbHkgYXV0b21hdGljYWxseS5cbi8vIFRPRE8gLSBtYWtlIGEgZGVidWdnZXIgd2luZG93IGZvciBwYXRjaGVzLlxuLy8gVE9ETyAtIHRoaXMgbmVlZHMgdG8gYmUgYSBzZXBhcmF0ZSBub24tY29tcGlsZWQgZmlsZS5cbmV4cG9ydCBkZWZhdWx0ICh7XG4gIGFzeW5jIGFwcGx5KHJvbTogVWludDhBcnJheSwgaGFzaDoge1trZXk6IHN0cmluZ106IHVua25vd259LCBwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgICAvLyBMb29rIGZvciBmbGFnIHN0cmluZyBhbmQgaGFzaFxuICAgIGxldCBmbGFncztcbiAgICBpZiAoIWhhc2guc2VlZCkge1xuICAgICAgLy8gVE9ETyAtIHNlbmQgaW4gYSBoYXNoIG9iamVjdCB3aXRoIGdldC9zZXQgbWV0aG9kc1xuICAgICAgaGFzaC5zZWVkID0gcGFyc2VTZWVkKCcnKS50b1N0cmluZygxNik7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCArPSAnJnNlZWQ9JyArIGhhc2guc2VlZDtcbiAgICB9XG4gICAgaWYgKGhhc2guZmxhZ3MpIHtcbiAgICAgIGZsYWdzID0gbmV3IEZsYWdTZXQoU3RyaW5nKGhhc2guZmxhZ3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmxhZ3MgPSBuZXcgRmxhZ1NldCgnQEZ1bGxTaHVmZmxlJyk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qga2V5IGluIGhhc2gpIHtcbiAgICAgIGlmIChoYXNoW2tleV0gPT09ICdmYWxzZScpIGhhc2hba2V5XSA9IGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBbcmVzdWx0LF0gPVxuICAgICAgICBhd2FpdCBzaHVmZmxlKHJvbSwgcGFyc2VTZWVkKFN0cmluZyhoYXNoLnNlZWQpKSxcbiAgICAgICAgICAgICAgICAgICAgICBmbGFncywgbmV3IEZldGNoUmVhZGVyKHBhdGgpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVNlZWQoc2VlZDogc3RyaW5nKTogbnVtYmVyIHtcbiAgaWYgKCFzZWVkKSByZXR1cm4gUmFuZG9tLm5ld1NlZWQoKTtcbiAgaWYgKC9eWzAtOWEtZl17MSw4fSQvaS50ZXN0KHNlZWQpKSByZXR1cm4gTnVtYmVyLnBhcnNlSW50KHNlZWQsIDE2KTtcbiAgcmV0dXJuIGNyYzMyKHNlZWQpO1xufVxuXG4vKipcbiAqIEFic3RyYWN0IG91dCBGaWxlIEkvTy4gIE5vZGUgYW5kIGJyb3dzZXIgd2lsbCBoYXZlIGNvbXBsZXRlbHlcbiAqIGRpZmZlcmVudCBpbXBsZW1lbnRhdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZGVyIHtcbiAgcmVhZChmaWxlbmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+O1xufVxuXG4vLyBwcmV2ZW50IHVudXNlZCBlcnJvcnMgYWJvdXQgd2F0Y2hBcnJheSAtIGl0J3MgdXNlZCBmb3IgZGVidWdnaW5nLlxuY29uc3Qge30gPSB7d2F0Y2hBcnJheX0gYXMgYW55O1xuXG5mdW5jdGlvbiBkZWZpbmVzKGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICBwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogc3RyaW5nIHtcbiAgY29uc3QgZGVmaW5lczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7XG4gICAgX0FMTE9XX1RFTEVQT1JUX09VVF9PRl9CT1NTOiBmbGFncy5oYXJkY29yZU1vZGUoKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpLFxuICAgIF9BTExPV19URUxFUE9SVF9PVVRfT0ZfVE9XRVI6IHRydWUsXG4gICAgX0FVVE9fRVFVSVBfQlJBQ0VMRVQ6IGZsYWdzLmF1dG9FcXVpcEJyYWNlbGV0KHBhc3MpLFxuICAgIF9CQVJSSUVSX1JFUVVJUkVTX0NBTE1fU0VBOiB0cnVlLCAvLyBmbGFncy5iYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCksXG4gICAgX0JVRkZfREVPU19QRU5EQU5UOiBmbGFncy5idWZmRGVvc1BlbmRhbnQoKSxcbiAgICBfQlVGRl9EWU5BOiBmbGFncy5idWZmRHluYSgpLCAvLyB0cnVlLFxuICAgIF9DSEVDS19GTEFHMDogdHJ1ZSxcbiAgICBfQ1RSTDFfU0hPUlRDVVRTOiBmbGFncy5jb250cm9sbGVyU2hvcnRjdXRzKHBhc3MpLFxuICAgIF9DVVNUT01fU0hPT1RJTkdfV0FMTFM6IHRydWUsXG4gICAgX0RJU0FCTEVfU0hPUF9HTElUQ0g6IGZsYWdzLmRpc2FibGVTaG9wR2xpdGNoKCksXG4gICAgX0RJU0FCTEVfU1RBVFVFX0dMSVRDSDogZmxhZ3MuZGlzYWJsZVN0YXR1ZUdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1NXT1JEX0NIQVJHRV9HTElUQ0g6IGZsYWdzLmRpc2FibGVTd29yZENoYXJnZUdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1RSSUdHRVJfU0tJUDogdHJ1ZSxcbiAgICBfRElTQUJMRV9XQVJQX0JPT1RTX1JFVVNFOiBmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpLFxuICAgIF9ESVNBQkxFX1dJTERfV0FSUDogZmFsc2UsXG4gICAgX0RJU1BMQVlfRElGRklDVUxUWTogdHJ1ZSxcbiAgICBfRVhUUkFfRVhURU5ERURfU0NSRUVOUzogdHJ1ZSxcbiAgICBfRVhUUkFfUElUWV9NUDogdHJ1ZSwgIC8vIFRPRE86IGFsbG93IGRpc2FibGluZyB0aGlzXG4gICAgX0ZJWF9DT0lOX1NQUklURVM6IHRydWUsXG4gICAgX0ZJWF9PUEVMX1NUQVRVRTogdHJ1ZSxcbiAgICBfRklYX1NIQUtJTkc6IHRydWUsXG4gICAgX0ZJWF9WQU1QSVJFOiB0cnVlLFxuICAgIF9IQVJEQ09SRV9NT0RFOiBmbGFncy5oYXJkY29yZU1vZGUoKSxcbiAgICBfSEFaTUFUX1NVSVQ6IGZsYWdzLmNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKSxcbiAgICBfTEVBVEhFUl9CT09UU19HSVZFX1NQRUVEOiBmbGFncy5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSxcbiAgICBfTUFYX1NDQUxJTkdfSU5fVE9XRVI6IGZsYWdzLm1heFNjYWxpbmdJblRvd2VyKCksXG4gICAgX05FUkZfRkxJR0hUOiB0cnVlLFxuICAgIF9ORVJGX01BRE86IHRydWUsXG4gICAgX05FVkVSX0RJRTogZmxhZ3MubmV2ZXJEaWUoKSxcbiAgICBfTk9STUFMSVpFX1NIT1BfUFJJQ0VTOiBmbGFncy5zaHVmZmxlU2hvcHMoKSxcbiAgICBfUElUWV9IUF9BTkRfTVA6IHRydWUsXG4gICAgX1BST0dSRVNTSVZFX0JSQUNFTEVUOiB0cnVlLFxuICAgIF9SQUJCSVRfQk9PVFNfQ0hBUkdFX1dISUxFX1dBTEtJTkc6IGZsYWdzLnJhYmJpdEJvb3RzQ2hhcmdlV2hpbGVXYWxraW5nKCksXG4gICAgX1JFUVVJUkVfSEVBTEVEX0RPTFBISU5fVE9fUklERTogZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSxcbiAgICBfUkVWRVJTSUJMRV9TV0FOX0dBVEU6IHRydWUsXG4gICAgX1NBSEFSQV9SQUJCSVRTX1JFUVVJUkVfVEVMRVBBVEhZOiBmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpLFxuICAgIF9TSU1QTElGWV9JTlZJU0lCTEVfQ0hFU1RTOiB0cnVlLFxuICAgIF9TT0ZUX1JFU0VUX1NIT1JUQ1VUOiB0cnVlLFxuICAgIF9URUxFUE9SVF9PTl9USFVOREVSX1NXT1JEOiBmbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCksXG4gICAgX1RJTktfTU9ERTogIWZsYWdzLmd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSxcbiAgICBfVFJBSU5FUjogZmxhZ3MudHJhaW5lcigpLFxuICAgIF9UV0VMVlRIX1dBUlBfUE9JTlQ6IHRydWUsIC8vIHpvbWJpZSB0b3duIHdhcnBcbiAgICBfVU5JREVOVElGSUVEX0lURU1TOiBmbGFncy51bmlkZW50aWZpZWRJdGVtcygpLFxuICAgIF9aRUJVX1NUVURFTlRfR0lWRVNfSVRFTTogdHJ1ZSwgLy8gZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSxcbiAgfTtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKGRlZmluZXMpXG4gICAgICAuZmlsdGVyKGQgPT4gZGVmaW5lc1tkXSkubWFwKGQgPT4gYC5kZWZpbmUgJHtkfSAxXFxuYCkuam9pbignJyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaHVmZmxlKHJvbTogVWludDhBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyOiBSZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2c/OiB7c3BvaWxlcj86IFNwb2lsZXJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3M/OiBQcm9ncmVzc1RyYWNrZXIpOiBQcm9taXNlPHJlYWRvbmx5IFtVaW50OEFycmF5LCBudW1iZXJdPiB7XG4gIC8vIFRyaW0gb3ZlcmR1bXBzIChtYWluLmpzIGFscmVhZHkgZG9lcyB0aGlzLCBidXQgdGhlcmUgYXJlIG90aGVyIGVudHJ5cG9pbnRzKVxuICBjb25zdCBleHBlY3RlZFNpemUgPVxuICAgICAgMTYgKyAocm9tWzZdICYgNCA/IDUxMiA6IDApICsgKHJvbVs0XSA8PCAxNCkgKyAocm9tWzVdIDw8IDEzKTtcbiAgaWYgKHJvbS5sZW5ndGggPiBleHBlY3RlZFNpemUpIHJvbSA9IHJvbS5zbGljZSgwLCBleHBlY3RlZFNpemUpO1xuXG4gIC8vcm9tID0gd2F0Y2hBcnJheShyb20sIDB4ODVmYSArIDB4MTApO1xuICBpZiAoRVhQQU5EX1BSRyAmJiByb20ubGVuZ3RoIDwgMHg4MDAwMCkge1xuICAgIGNvbnN0IG5ld1JvbSA9IG5ldyBVaW50OEFycmF5KHJvbS5sZW5ndGggKyAweDQwMDAwKTtcbiAgICBuZXdSb20uc3ViYXJyYXkoMCwgMHg0MDAxMCkuc2V0KHJvbS5zdWJhcnJheSgwLCAweDQwMDEwKSk7XG4gICAgbmV3Um9tLnN1YmFycmF5KDB4ODAwMTApLnNldChyb20uc3ViYXJyYXkoMHg0MDAxMCkpO1xuICAgIG5ld1JvbVs0XSA8PD0gMTtcbiAgICByb20gPSBuZXdSb207XG4gIH1cblxuICAvLyBGaXJzdCByZWVuY29kZSB0aGUgc2VlZCwgbWl4aW5nIGluIHRoZSBmbGFncyBmb3Igc2VjdXJpdHkuXG4gIGlmICh0eXBlb2Ygc2VlZCAhPT0gJ251bWJlcicpIHRocm93IG5ldyBFcnJvcignQmFkIHNlZWQnKTtcbiAgY29uc3QgbmV3U2VlZCA9IGNyYzMyKHNlZWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykgKyBTdHJpbmcoZmxhZ3MuZmlsdGVyT3B0aW9uYWwoKSkpID4+PiAwO1xuICBjb25zdCByYW5kb20gPSBuZXcgUmFuZG9tKG5ld1NlZWQpO1xuICBjb25zdCBvcmlnaW5hbEZsYWdTdHJpbmcgPSBTdHJpbmcoZmxhZ3MpO1xuICBmbGFncyA9IGZsYWdzLmZpbHRlclJhbmRvbShyYW5kb20pO1xuICBjb25zdCBhY3R1YWxGbGFnU3RyaW5nID0gU3RyaW5nKGZsYWdzKTtcblxuICBkZXRlcm1pbmlzdGljUHJlUGFyc2Uocm9tLnN1YmFycmF5KDB4MTApKTsgLy8gVE9ETyAtIHRyYWluZXIuLi5cblxuICBjb25zdCBwYXJzZWQgPSBuZXcgUm9tKHJvbSk7XG4vLyAod2luZG93IGFzIGFueSkuY2F2ZSA9IHNodWZmbGVDYXZlO1xuICBwYXJzZWQuZmxhZ3MuZGVmcmFnKCk7XG4gIGNvbXByZXNzTWFwRGF0YShwYXJzZWQpO1xuICAgICAgICAgICAgIC8vIFRPRE8gLSB0aGUgc2NyZWVucyBhcmVuJ3QgbW92aW5nPyE/XG4gIC8vIE5PVEU6IGRlbGV0ZSB0aGVzZSBpZiB3ZSB3YW50IG1vcmUgZnJlZSBzcGFjZSBiYWNrLi4uXG4gIHBhcnNlZC5tb3ZlU2NyZWVucyhwYXJzZWQubWV0YXRpbGVzZXRzLnN3YW1wLCA0KTsgLy8gbW92ZSB0byBuZXcgcGxhbmVcbiAgcGFyc2VkLm1vdmVTY3JlZW5zKHBhcnNlZC5tZXRhdGlsZXNldHMuaG91c2UsIDQpOyAvLyBtb3ZlIHRvIG5ldyBwbGFuZVxuICBpZiAodHlwZW9mIHdpbmRvdyA9PSAnb2JqZWN0JykgKHdpbmRvdyBhcyBhbnkpLnJvbSA9IHBhcnNlZDtcbiAgcGFyc2VkLnNwb2lsZXIgPSBuZXcgU3BvaWxlcihwYXJzZWQpO1xuICBpZiAobG9nKSBsb2cuc3BvaWxlciA9IHBhcnNlZC5zcG9pbGVyO1xuICBpZiAoYWN0dWFsRmxhZ1N0cmluZyAhPT0gb3JpZ2luYWxGbGFnU3RyaW5nKSB7XG4gICAgcGFyc2VkLnNwb2lsZXIuZmxhZ3MgPSBhY3R1YWxGbGFnU3RyaW5nO1xuICB9XG5cbiAgLy8gTWFrZSBkZXRlcm1pbmlzdGljIGNoYW5nZXMuXG4gIGRldGVybWluaXN0aWMocGFyc2VkLCBmbGFncyk7XG4gIGZpeFRpbGVzZXRzKHBhcnNlZCk7XG4gIHN0YW5kYXJkTWFwRWRpdHMocGFyc2VkLCBzdGFuZGFyZE1hcEVkaXRzLmdlbmVyYXRlT3B0aW9ucyhmbGFncywgcmFuZG9tKSk7XG4gIHRvZ2dsZU1hcHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICAvLyBTZXQgdXAgc2hvcCBhbmQgdGVsZXBhdGh5XG4gIHBhcnNlZC5zY2FsaW5nTGV2ZWxzID0gNDg7XG5cbiAgaWYgKGZsYWdzLnNodWZmbGVTaG9wcygpKSBzaHVmZmxlU2hvcHMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICBpZiAoZmxhZ3Muc2h1ZmZsZUdvYUZsb29ycygpKSBzaHVmZmxlR29hKHBhcnNlZCwgcmFuZG9tKTsgLy8gTk9URTogbXVzdCBiZSBiZWZvcmUgc2h1ZmZsZU1hemVzIVxuICByYW5kb21pemVXYWxscyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBjcnVtYmxpbmdQbGF0Zm9ybXMocGFyc2VkLCByYW5kb20pO1xuXG4gIGlmIChmbGFncy5uZXJmV2lsZFdhcnAoKSkgcGFyc2VkLndpbGRXYXJwLmxvY2F0aW9ucy5maWxsKDApO1xuICBpZiAoZmxhZ3MucmFuZG9taXplV2lsZFdhcnAoKSkgc2h1ZmZsZVdpbGRXYXJwKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGlmIChmbGFncy5yYW5kb21pemVUaHVuZGVyVGVsZXBvcnQoKSkgcmFuZG9taXplVGh1bmRlcldhcnAocGFyc2VkLCByYW5kb20pO1xuICByZXNjYWxlTW9uc3RlcnMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgdW5pZGVudGlmaWVkSXRlbXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgc2h1ZmZsZVRyYWRlcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICBpZiAoZmxhZ3MucmFuZG9taXplTWFwcygpKSBzaHVmZmxlTWF6ZXMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgd3JpdGVMb2NhdGlvbnNGcm9tTWV0YShwYXJzZWQpO1xuICBzaHVmZmxlTW9uc3RlclBvc2l0aW9ucyhwYXJzZWQsIHJhbmRvbSk7XG5cbiAgLy8gTk9URTogU2h1ZmZsZSBtaW1pY3MgYW5kIG1vbnN0ZXJzICphZnRlciogc2h1ZmZsaW5nIG1hcHMsIGJ1dCBiZWZvcmUgbG9naWMuXG4gIGlmIChmbGFncy5zaHVmZmxlTWltaWNzKCkpIHNodWZmbGVNaW1pY3MocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcbiAgaWYgKGZsYWdzLnNodWZmbGVNb25zdGVycygpKSBzaHVmZmxlTW9uc3RlcnMocGFyc2VkLCBmbGFncywgcmFuZG9tKTtcblxuICAvLyBUaGlzIHdhbnRzIHRvIGdvIGFzIGxhdGUgYXMgcG9zc2libGUgc2luY2Ugd2UgbmVlZCB0byBwaWNrIHVwXG4gIC8vIGFsbCB0aGUgbm9ybWFsaXphdGlvbiBhbmQgb3RoZXIgaGFuZGxpbmcgdGhhdCBoYXBwZW5lZCBiZWZvcmUuXG4gIGNvbnN0IHdvcmxkID0gbmV3IFdvcmxkKHBhcnNlZCwgZmxhZ3MpO1xuICBjb25zdCBncmFwaCA9IG5ldyBHcmFwaChbd29ybGQuZ2V0TG9jYXRpb25MaXN0KCldKTtcbiAgY29uc3QgZmlsbCA9XG4gICAgICBhd2FpdCBncmFwaC5zaHVmZmxlKGZsYWdzLCByYW5kb20sIHVuZGVmaW5lZCwgcHJvZ3Jlc3MsIHBhcnNlZC5zcG9pbGVyKTtcbiAgaWYgKGZpbGwpIHtcbiAgICAvLyBjb25zdCBuID0gKGk6IG51bWJlcikgPT4ge1xuICAgIC8vICAgaWYgKGkgPj0gMHg3MCkgcmV0dXJuICdNaW1pYyc7XG4gICAgLy8gICBjb25zdCBpdGVtID0gcGFyc2VkLml0ZW1zW3BhcnNlZC5pdGVtR2V0c1tpXS5pdGVtSWRdO1xuICAgIC8vICAgcmV0dXJuIGl0ZW0gPyBpdGVtLm1lc3NhZ2VOYW1lIDogYGludmFsaWQgJHtpfWA7XG4gICAgLy8gfTtcbiAgICAvLyBjb25zb2xlLmxvZygnaXRlbTogc2xvdCcpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsbC5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgaWYgKGZpbGwuaXRlbXNbaV0gIT0gbnVsbCkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZyhgJCR7aGV4KGkpfSAke24oaSl9OiAke24oZmlsbC5pdGVtc1tpXSl9ICQke2hleChmaWxsLml0ZW1zW2ldKX1gKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cbiAgICAvLyBUT0RPIC0gZmlsbCB0aGUgc3BvaWxlciBsb2chXG5cbiAgICAvL3cudHJhdmVyc2Uody5ncmFwaCwgZmlsbCk7IC8vIGZpbGwgdGhlIHNwb2lsZXIgKG1heSBhbHNvIHdhbnQgdG8ganVzdCBiZSBhIHNhbml0eSBjaGVjaz8pXG5cbiAgICBmb3IgKGNvbnN0IFtzbG90LCBpdGVtXSBvZiBmaWxsKSB7XG4gICAgICBwYXJzZWQuc2xvdHNbc2xvdCAmIDB4ZmZdID0gaXRlbSAmIDB4ZmY7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBbcm9tLCAtMV07XG4gICAgLy9jb25zb2xlLmVycm9yKCdDT1VMRCBOT1QgRklMTCEnKTtcbiAgfVxuICAvL2NvbnNvbGUubG9nKCdmaWxsJywgZmlsbCk7XG5cbiAgLy8gVE9ETyAtIHNldCBvbWl0SXRlbUdldERhdGFTdWZmaXggYW5kIG9taXRMb2NhbERpYWxvZ1N1ZmZpeFxuICAvL2F3YWl0IHNodWZmbGVEZXBncmFwaChwYXJzZWQsIHJhbmRvbSwgbG9nLCBmbGFncywgcHJvZ3Jlc3MpO1xuXG4gIC8vIFRPRE8gLSByZXdyaXRlIHJlc2NhbGVTaG9wcyB0byB0YWtlIGEgUm9tIGluc3RlYWQgb2YgYW4gYXJyYXkuLi5cbiAgaWYgKGZsYWdzLnNodWZmbGVTaG9wcygpKSB7XG4gICAgLy8gVE9ETyAtIHNlcGFyYXRlIGxvZ2ljIGZvciBoYW5kbGluZyBzaG9wcyB3L28gUG4gc3BlY2lmaWVkIChpLmUuIHZhbmlsbGFcbiAgICAvLyBzaG9wcyB0aGF0IG1heSBoYXZlIGJlZW4gcmFuZG9taXplZClcbiAgICByZXNjYWxlU2hvcHMocGFyc2VkLCBmbGFncy5iYXJnYWluSHVudGluZygpID8gcmFuZG9tIDogdW5kZWZpbmVkKTtcbiAgfVxuXG4gIC8vIE5PVEU6IG1vbnN0ZXIgc2h1ZmZsZSBuZWVkcyB0byBnbyBhZnRlciBpdGVtIHNodWZmbGUgYmVjYXVzZSBvZiBtaW1pY1xuICAvLyBwbGFjZW1lbnQgY29uc3RyYWludHMsIGJ1dCBpdCB3b3VsZCBiZSBuaWNlIHRvIGdvIGJlZm9yZSBpbiBvcmRlciB0b1xuICAvLyBndWFyYW50ZWUgbW9uZXkuXG4gIC8vaWRlbnRpZnlLZXlJdGVtc0ZvckRpZmZpY3VsdHlCdWZmcyhwYXJzZWQpO1xuXG4gIC8vIEJ1ZmYgbWVkaWNhbCBoZXJiIGFuZCBmcnVpdCBvZiBwb3dlclxuICBpZiAoZmxhZ3MuYnVmZk1lZGljYWxIZXJiKCkpIHtcbiAgICBwYXJzZWQuaXRlbXMuTWVkaWNhbEhlcmIudmFsdWUgPSA4MDtcbiAgICBwYXJzZWQuaXRlbXMuRnJ1aXRPZlBvd2VyLnZhbHVlID0gNTY7XG4gIH1cblxuICBpZiAoZmxhZ3Muc3RvcnlNb2RlKCkpIHN0b3J5TW9kZShwYXJzZWQpO1xuXG4gIC8vIERvIHRoaXMgKmFmdGVyKiBzaHVmZmxpbmcgcGFsZXR0ZXNcbiAgaWYgKGZsYWdzLmJsYWNrb3V0TW9kZSgpKSBibGFja291dE1vZGUocGFyc2VkKTtcblxuICBtaXNjKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIGZpeERpYWxvZyhwYXJzZWQpO1xuICBmaXhNb3ZlbWVudFNjcmlwdHMocGFyc2VkKTtcblxuICAvLyBOT1RFOiBUaGlzIG5lZWRzIHRvIGhhcHBlbiBCRUZPUkUgcG9zdHNodWZmbGVcbiAgaWYgKGZsYWdzLmJ1ZmZEeW5hKCkpIGJ1ZmZEeW5hKHBhcnNlZCwgZmxhZ3MpOyAvLyBUT0RPIC0gY29uZGl0aW9uYWxcblxuICBpZiAoZmxhZ3MudHJhaW5lcigpKSB7XG4gICAgcGFyc2VkLndpbGRXYXJwLmxvY2F0aW9ucyA9IFtcbiAgICAgIDB4MGEsIC8vIHZhbXBpcmVcbiAgICAgIDB4MWEsIC8vIHN3YW1wL2luc2VjdFxuICAgICAgMHgzNSwgLy8gc3VtbWl0IGNhdmVcbiAgICAgIDB4NDgsIC8vIGZvZyBsYW1wXG4gICAgICAweDZkLCAvLyB2YW1waXJlIDJcbiAgICAgIDB4NmUsIC8vIHNhYmVyYSAxXG4gICAgICAweDhjLCAvLyBzaHlyb25cbiAgICAgIDB4YWEsIC8vIGJlaGluZCBrZWxiZXNxeWUgMlxuICAgICAgMHhhYywgLy8gc2FiZXJhIDJcbiAgICAgIDB4YjAsIC8vIGJlaGluZCBtYWRvIDJcbiAgICAgIDB4YjYsIC8vIGthcm1pbmVcbiAgICAgIDB4OWYsIC8vIGRyYXlnb24gMVxuICAgICAgMHhhNiwgLy8gZHJheWdvbiAyXG4gICAgICAweDU4LCAvLyB0b3dlclxuICAgICAgMHg1YywgLy8gdG93ZXIgb3V0c2lkZSBtZXNpYVxuICAgICAgMHgwMCwgLy8gbWV6YW1lXG4gICAgXTtcbiAgfVxuXG4gIGlmIChmbGFncy5yYW5kb21pemVNdXNpYygnZWFybHknKSkge1xuICAgIHNodWZmbGVNdXNpYyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB9XG4gIGlmIChmbGFncy5zaHVmZmxlVGlsZVBhbGV0dGVzKCdlYXJseScpKSB7XG4gICAgc2h1ZmZsZVBhbGV0dGVzKHBhcnNlZCwgZmxhZ3MsIHJhbmRvbSk7XG4gIH1cbiAgdXBkYXRlVGFibGVzUHJlQ29tbWl0KHBhcnNlZCwgZmxhZ3MpO1xuICByYW5kb20uc2h1ZmZsZShwYXJzZWQucmFuZG9tTnVtYmVycy52YWx1ZXMpO1xuXG5cbiAgLy8gYXN5bmMgZnVuY3Rpb24gYXNzZW1ibGUocGF0aDogc3RyaW5nKSB7XG4gIC8vICAgYXNtLmFzc2VtYmxlKGF3YWl0IHJlYWRlci5yZWFkKHBhdGgpLCBwYXRoLCByb20pO1xuICAvLyB9XG5cbiAgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXAgdG8gbm90IHJlLXJlYWQgdGhlIGVudGlyZSB0aGluZyB0d2ljZS5cbiAgLy8gUHJvYmFibHkganVzdCB3YW50IHRvIG1vdmUgdGhlIG9wdGlvbmFsIHBhc3NlcyBpbnRvIGEgc2VwYXJhdGVcbiAgLy8gZmlsZSB0aGF0IHJ1bnMgYWZ0ZXJ3YXJkcyBhbGwgb24gaXRzIG93bi5cblxuICBhc3luYyBmdW5jdGlvbiBhc20ocGFzczogJ2Vhcmx5JyB8ICdsYXRlJykge1xuICAgIGFzeW5jIGZ1bmN0aW9uIHRva2VuaXplcihwYXRoOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBuZXcgVG9rZW5pemVyKGF3YWl0IHJlYWRlci5yZWFkKHBhdGgpLCBwYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAge2xpbmVDb250aW51YXRpb25zOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZmxhZ0ZpbGUgPSBkZWZpbmVzKGZsYWdzLCBwYXNzKTtcbiAgICBjb25zdCBhc20gPSBuZXcgQXNzZW1ibGVyKENwdS5QMDIpO1xuICAgIGNvbnN0IHRva3MgPSBuZXcgVG9rZW5TdHJlYW0oKTtcbiAgICB0b2tzLmVudGVyKFRva2VuU291cmNlLmNvbmNhdChcbiAgICAgICAgbmV3IFRva2VuaXplcihmbGFnRmlsZSwgJ2ZsYWdzLnMnKSxcbiAgICAgICAgYXdhaXQgdG9rZW5pemVyKCdpbml0LnMnKSxcbiAgICAgICAgYXdhaXQgdG9rZW5pemVyKCdwcmVzaHVmZmxlLnMnKSxcbiAgICAgICAgYXdhaXQgdG9rZW5pemVyKCdwb3N0cGFyc2UucycpLFxuICAgICAgICBhd2FpdCB0b2tlbml6ZXIoJ3Bvc3RzaHVmZmxlLnMnKSkpO1xuICAgIGNvbnN0IHByZSA9IG5ldyBQcmVwcm9jZXNzb3IodG9rcywgYXNtKTtcbiAgICBhc20udG9rZW5zKHByZSk7XG4gICAgcmV0dXJuIGFzbS5tb2R1bGUoKTtcbiAgfVxuXG4vLyAgICAgY29uc3QgYXNtID0gbmV3IEFzc2VtYmxlcihDcHUuUDAyKTtcbi8vICAgICBjb25zdCB0b2tzID0gbmV3IFRva2VuU3RyZWFtKCk7XG4vLyAgICAgdG9rcy5lbnRlcihuZXcgVG9rZW5pemVyKGNvZGUsIGZpbGUpKTtcbi8vICAgICB0aGlzLnByZSA9IG5ldyBQcmVwcm9jZXNzb3IodG9rcywgYXNtKTtcbi8vICAgICB3aGlsZSAodGhpcy5wcmUubmV4dCgpKSB7fVxuLy8gICB9XG5cbi8vICAgYXNzZW1ibGUoY29kZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcsIHJvbTogVWludDhBcnJheSkge1xuLy8gICAgIGNvbnN0IGFzbSA9IG5ldyBBc3NlbWJsZXIoQ3B1LlAwMik7XG4vLyAgICAgY29uc3QgdG9rcyA9IG5ldyBUb2tlblN0cmVhbSgpO1xuLy8gICAgIHRva3MuZW50ZXIobmV3IFRva2VuaXplcihjb2RlLCBmaWxlKSk7XG4vLyAgICAgY29uc3QgcHJlID0gbmV3IFByZXByb2Nlc3Nvcih0b2tzLCBhc20sIHRoaXMucHJlKTtcbi8vICAgICBhc20udG9rZW5zKHByZSk7XG4vLyAgICAgY29uc3QgbGluayA9IG5ldyBMaW5rZXIoKTtcbi8vICAgICBsaW5rLnJlYWQoYXNtLm1vZHVsZSgpKTtcbiAgXG4gIC8vIGNvbnN0IGFzbSA9IG5ldyBTaGltQXNzZW1ibGVyKGZsYWdGaWxlLCAnZmxhZ3MucycpO1xuLy9jb25zb2xlLmxvZygnTXVsdGlwbHkxNkJpdDonLCBhc20uZXhwYW5kKCdNdWx0aXBseTE2Qml0JykudG9TdHJpbmcoMTYpKTtcbiAgcGFyc2VkLm1lc3NhZ2VzLmNvbXByZXNzKCk7IC8vIHB1bGwgdGhpcyBvdXQgdG8gbWFrZSB3cml0ZURhdGEgYSBwdXJlIGZ1bmN0aW9uXG4gIGNvbnN0IHByZ0NvcHkgPSByb20uc2xpY2UoMTYpO1xuXG4gIHBhcnNlZC5tb2R1bGVzLnB1c2goYXdhaXQgYXNtKCdlYXJseScpKTtcbiAgcGFyc2VkLndyaXRlRGF0YShwcmdDb3B5KTtcbiAgcGFyc2VkLm1vZHVsZXMucG9wKCk7XG5cbiAgcGFyc2VkLm1vZHVsZXMucHVzaChhd2FpdCBhc20oJ2xhdGUnKSk7XG4gIGNvbnN0IGNyYyA9IHN0YW1wVmVyc2lvblNlZWRBbmRIYXNoKHJvbSwgc2VlZCwgb3JpZ2luYWxGbGFnU3RyaW5nLCBwcmdDb3B5KTtcblxuICAvLyBEbyBvcHRpb25hbCByYW5kb21pemF0aW9uIG5vdy4uLlxuICBpZiAoZmxhZ3MucmFuZG9taXplTXVzaWMoJ2xhdGUnKSkge1xuICAgIHNodWZmbGVNdXNpYyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB9XG4gIGlmIChmbGFncy5ub011c2ljKCdsYXRlJykpIHtcbiAgICBub011c2ljKHBhcnNlZCk7XG4gIH1cbiAgaWYgKGZsYWdzLnNodWZmbGVUaWxlUGFsZXR0ZXMoJ2xhdGUnKSkge1xuICAgIHNodWZmbGVQYWxldHRlcyhwYXJzZWQsIGZsYWdzLCByYW5kb20pO1xuICB9XG5cbiAgLy8gRG8gdGhpcyB2ZXJ5IGxhdGUsIHNpbmNlIGl0J3MgbG93LWxldmVsIG9uIHRoZSBsb2NhdGlvbnMuICBOZWVkIHRvIHdhaXRcbiAgLy8gdW50aWwgYWZ0ZXIgdGhlIG1ldGFsb2NhdGlvbnMgaGF2ZSBiZWVuIHdyaXR0ZW4gYmFjayB0byB0aGUgbG9jYXRpb25zLlxuICBmaXhTa2lwcGFibGVFeGl0cyhwYXJzZWQpO1xuXG4gIHBhcnNlZC53cml0ZURhdGEoKTtcbiAgLy8gVE9ETyAtIG9wdGlvbmFsIGZsYWdzIGNhbiBwb3NzaWJseSBnbyBoZXJlLCBidXQgTVVTVCBOT1QgdXNlIHBhcnNlZC5wcmchXG5cbiAgaWYgKEVYUEFORF9QUkcpIHtcbiAgICBjb25zdCBwcmcgPSByb20uc3ViYXJyYXkoMHgxMCk7XG4gICAgcHJnLnN1YmFycmF5KDB4N2MwMDAsIDB4ODAwMDApLnNldChwcmcuc3ViYXJyYXkoMHgzYzAwMCwgMHg0MDAwMCkpO1xuICB9XG4gIHJldHVybiBbcm9tLCBjcmNdO1xufVxuXG5mdW5jdGlvbiBtaXNjKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pIHtcbi8vIFRPRE8gLSByZW1vdmUgaGFjayB0byB2aXN1YWxpemUgbWFwcyBmcm9tIHRoZSBjb25zb2xlLi4uXG4vLyAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHJvbS5sb2NhdGlvbnNbMF0pIGFzIGFueSkuc2hvdyA9IGZ1bmN0aW9uKHRzOiB0eXBlb2Ygcm9tLm1ldGF0aWxlc2V0cy5yaXZlcikge1xuLy8gICBjb25zb2xlLmxvZyhNYXplLmZyb20odGhpcywgcmFuZG9tLCB0cykuc2hvdygpKTtcbi8vIH07XG5cbiAgY29uc3Qge30gPSB7cm9tLCBmbGFncywgcmFuZG9tfSBhcyBhbnk7XG4gIC8vIE5PVEU6IHdlIHN0aWxsIG5lZWQgdG8gZG8gc29tZSB3b3JrIGFjdHVhbGx5IGFkanVzdGluZ1xuICAvLyBtZXNzYWdlIHRleHRzIHRvIHByZXZlbnQgbGluZSBvdmVyZmxvdywgZXRjLiAgV2Ugc2hvdWxkXG4gIC8vIGFsc28gbWFrZSBzb21lIGhvb2tzIHRvIGVhc2lseSBzd2FwIG91dCBpdGVtcyB3aGVyZSBpdFxuICAvLyBtYWtlcyBzZW5zZS5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzJdWzJdLnRleHQgPSBgXG57MDE6QWthaGFuYX0gaXMgaGFuZGVkIGEgc3RhdHVlLiNcblRoYW5rcyBmb3IgZmluZGluZyB0aGF0LlxuSSB3YXMgdG90YWxseSBnb25uYSBzZWxsXG5pdCBmb3IgdG9ucyBvZiBjYXNoLiNcbkhlcmUsIGhhdmUgdGhpcyBsYW1lXG5bMjk6R2FzIE1hc2tdIG9yIHNvbWV0aGluZy5gO1xuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBhZGQgc29tZSBtb3JlIChoaWdoZXIgbGV2ZWwpIG1hcmt1cCxcbiAgLy8gZS5nLiBgJHtkZXNjcmliZUl0ZW0oc2xvdE51bSl9YC4gIFdlIGNvdWxkIGFsc28gYWRkIG1hcmt1cFxuICAvLyBmb3IgZS5nLiBgJHtzYXlXYW50KHNsb3ROdW0pfWAgYW5kIGAke3NheVRoYW5rcyhzbG90TnVtKX1gXG4gIC8vIGlmIHdlIHNodWZmbGUgdGhlIHdhbnRlZCBpdGVtcy4gIFRoZXNlIGNvdWxkIGJlIHJhbmRvbWl6ZWRcbiAgLy8gaW4gdmFyaW91cyB3YXlzLCBhcyB3ZWxsIGFzIGhhdmluZyBzb21lIGFkZGl0aW9uYWwgYml0cyBsaWtlXG4gIC8vIHdhbnRBdXhpbGlhcnkoLi4uKSBmb3IgZS5nLiBcInRoZSBraXJpc2EgcGxhbnQgaXMgLi4uXCIgLSB0aGVuXG4gIC8vIGl0IGNvdWxkIGluc3RlYWQgc2F5IFwidGhlIHN0YXR1ZSBvZiBvbnl4IGlzIC4uLlwiLlxuICByb20ubWVzc2FnZXMucGFydHNbMF1bMHhlXS50ZXh0ID0gYEl0J3MgZGFuZ2Vyb3VzIHRvIGdvIGFsb25lISBUYWtlIHRoaXMuYDtcbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzBdWzB4ZV0uZml4VGV4dCgpO1xufTtcblxuZnVuY3Rpb24gc2h1ZmZsZVNob3BzKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGNvbnN0IHNob3BzOiB7W3R5cGU6IG51bWJlcl06IHtjb250ZW50czogbnVtYmVyW10sIHNob3BzOiBTaG9wW119fSA9IHtcbiAgICBbU2hvcFR5cGUuQVJNT1JdOiB7Y29udGVudHM6IFtdLCBzaG9wczogW119LFxuICAgIFtTaG9wVHlwZS5UT09MXToge2NvbnRlbnRzOiBbXSwgc2hvcHM6IFtdfSxcbiAgfTtcbiAgLy8gUmVhZCBhbGwgdGhlIGNvbnRlbnRzLlxuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKCFzaG9wLnVzZWQgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmZikgY29udGludWU7XG4gICAgY29uc3QgZGF0YSA9IHNob3BzW3Nob3AudHlwZV07XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIGRhdGEuY29udGVudHMucHVzaCguLi5zaG9wLmNvbnRlbnRzLmZpbHRlcih4ID0+IHggIT09IDB4ZmYpKTtcbiAgICAgIGRhdGEuc2hvcHMucHVzaChzaG9wKTtcbiAgICAgIHNob3AuY29udGVudHMgPSBbXTtcbiAgICB9XG4gIH1cbiAgLy8gU2h1ZmZsZSB0aGUgY29udGVudHMuICBQaWNrIG9yZGVyIHRvIGRyb3AgaXRlbXMgaW4uXG4gIGZvciAoY29uc3QgZGF0YSBvZiBPYmplY3QudmFsdWVzKHNob3BzKSkge1xuICAgIGxldCBzbG90czogU2hvcFtdIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgaXRlbXMgPSBbLi4uZGF0YS5jb250ZW50c107XG4gICAgcmFuZG9tLnNodWZmbGUoaXRlbXMpO1xuICAgIHdoaWxlIChpdGVtcy5sZW5ndGgpIHtcbiAgICAgIGlmICghc2xvdHMgfHwgIXNsb3RzLmxlbmd0aCkge1xuICAgICAgICBpZiAoc2xvdHMpIGl0ZW1zLnNoaWZ0KCk7XG4gICAgICAgIHNsb3RzID0gWy4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHMsIC4uLmRhdGEuc2hvcHNdO1xuICAgICAgICByYW5kb20uc2h1ZmZsZShzbG90cyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpdGVtID0gaXRlbXNbMF07XG4gICAgICBjb25zdCBzaG9wID0gc2xvdHNbMF07XG4gICAgICBpZiAoc2hvcC5jb250ZW50cy5sZW5ndGggPCA0ICYmICFzaG9wLmNvbnRlbnRzLmluY2x1ZGVzKGl0ZW0pKSB7XG4gICAgICAgIHNob3AuY29udGVudHMucHVzaChpdGVtKTtcbiAgICAgICAgaXRlbXMuc2hpZnQoKTtcbiAgICAgIH1cbiAgICAgIHNsb3RzLnNoaWZ0KCk7XG4gICAgfVxuICB9XG4gIC8vIFNvcnQgYW5kIGFkZCAweGZmJ3NcbiAgZm9yIChjb25zdCBkYXRhIG9mIE9iamVjdC52YWx1ZXMoc2hvcHMpKSB7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIGRhdGEuc2hvcHMpIHtcbiAgICAgIHdoaWxlIChzaG9wLmNvbnRlbnRzLmxlbmd0aCA8IDQpIHNob3AuY29udGVudHMucHVzaCgweGZmKTtcbiAgICAgIHNob3AuY29udGVudHMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByYW5kb21pemVXYWxscyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIC8vIE5PVEU6IFdlIGNhbiBtYWtlIGFueSB3YWxsIHNob290IGJ5IHNldHRpbmcgaXRzICQxMCBiaXQgb24gdGhlIHR5cGUgYnl0ZS5cbiAgLy8gQnV0IHRoaXMgYWxzbyByZXF1aXJlcyBtYXRjaGluZyBwYXR0ZXJuIHRhYmxlcywgc28gd2UnbGwgbGVhdmUgdGhhdCBhbG9uZVxuICAvLyBmb3Igbm93IHRvIGF2b2lkIGdyb3NzIGdyYXBoaWNzLlxuXG4gIC8vIEFsbCBvdGhlciB3YWxscyB3aWxsIG5lZWQgdGhlaXIgdHlwZSBtb3ZlZCBpbnRvIHRoZSB1cHBlciBuaWJibGUgYW5kIHRoZW5cbiAgLy8gdGhlIG5ldyBlbGVtZW50IGdvZXMgaW4gdGhlIGxvd2VyIG5pYmJsZS4gIFNpbmNlIHRoZXJlIGFyZSBzbyBmZXcgaXJvblxuICAvLyB3YWxscywgd2Ugd2lsbCBnaXZlIHRoZW0gYXJiaXRyYXJ5IGVsZW1lbnRzIGluZGVwZW5kZW50IG9mIHRoZSBwYWxldHRlLlxuICAvLyBSb2NrL2ljZSB3YWxscyBjYW4gYWxzbyBoYXZlIGFueSBlbGVtZW50LCBidXQgdGhlIHRoaXJkIHBhbGV0dGUgd2lsbFxuICAvLyBpbmRpY2F0ZSB3aGF0IHRoZXkgZXhwZWN0LlxuXG4gIGlmICghZmxhZ3MucmFuZG9taXplV2FsbHMoKSkgcmV0dXJuO1xuICAvLyBCYXNpYyBwbGFuOiBwYXJ0aXRpb24gYmFzZWQgb24gcGFsZXR0ZSwgbG9vayBmb3Igd2FsbHMuXG4gIGNvbnN0IHBhbHMgPSBbXG4gICAgWzB4MDUsIDB4MzhdLCAvLyByb2NrIHdhbGwgcGFsZXR0ZXNcbiAgICBbMHgxMV0sIC8vIGljZSB3YWxsIHBhbGV0dGVzXG4gICAgWzB4NmFdLCAvLyBcImVtYmVyIHdhbGxcIiBwYWxldHRlc1xuICAgIFsweDE0XSwgLy8gXCJpcm9uIHdhbGxcIiBwYWxldHRlc1xuICBdO1xuXG4gIGZ1bmN0aW9uIHdhbGxUeXBlKHNwYXduOiBTcGF3bik6IG51bWJlciB7XG4gICAgaWYgKHNwYXduLmRhdGFbMl0gJiAweDIwKSB7XG4gICAgICByZXR1cm4gKHNwYXduLmlkID4+PiA0KSAmIDM7XG4gICAgfVxuICAgIHJldHVybiBzcGF3bi5pZCAmIDM7XG4gIH1cblxuICBjb25zdCBwYXJ0aXRpb24gPSBuZXcgRGVmYXVsdE1hcDxBcmVhLCBMb2NhdGlvbltdPigoKSA9PiBbXSk7XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIHBhcnRpdGlvbi5nZXQobG9jYXRpb24uZGF0YS5hcmVhKS5wdXNoKGxvY2F0aW9uKTtcbiAgfVxuICBmb3IgKGNvbnN0IGxvY2F0aW9ucyBvZiBwYXJ0aXRpb24udmFsdWVzKCkpIHtcbiAgICAvLyBwaWNrIGEgcmFuZG9tIHdhbGwgdHlwZS5cbiAgICBjb25zdCBlbHQgPSByYW5kb20ubmV4dEludCg0KTtcbiAgICBjb25zdCBwYWwgPSByYW5kb20ucGljayhwYWxzW2VsdF0pO1xuICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgICBjb25zdCB0eXBlID0gd2FsbFR5cGUoc3Bhd24pO1xuICAgICAgICAgIGlmICh0eXBlID09PSAyKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gMykge1xuICAgICAgICAgICAgY29uc3QgbmV3RWx0ID0gcmFuZG9tLm5leHRJbnQoNCk7XG4gICAgICAgICAgICBpZiAocm9tLnNwb2lsZXIpIHJvbS5zcG9pbGVyLmFkZFdhbGwobG9jYXRpb24ubmFtZSwgdHlwZSwgbmV3RWx0KTtcbiAgICAgICAgICAgIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICAgICAgICAgIHNwYXduLmlkID0gMHgzMCB8IG5ld0VsdDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYCR7bG9jYXRpb24ubmFtZX0gJHt0eXBlfSA9PiAke2VsdH1gKTtcbiAgICAgICAgICAgIGlmICghZm91bmQgJiYgcm9tLnNwb2lsZXIpIHtcbiAgICAgICAgICAgICAgcm9tLnNwb2lsZXIuYWRkV2FsbChsb2NhdGlvbi5uYW1lLCB0eXBlLCBlbHQpO1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgICAgICAgICBzcGF3bi5pZCA9IHR5cGUgPDwgNCB8IGVsdDtcbiAgICAgICAgICAgIGxvY2F0aW9uLnRpbGVQYWxldHRlc1syXSA9IHBhbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9NdXNpYyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG0gb2YgWy4uLnJvbS5sb2NhdGlvbnMsIC4uLnJvbS5ib3NzZXMubXVzaWNzXSkge1xuICAgIG0uYmdtID0gMDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaHVmZmxlTXVzaWMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IHZvaWQge1xuICBpbnRlcmZhY2UgSGFzTXVzaWMgeyBiZ206IG51bWJlcjsgfVxuICBjb25zdCBtdXNpY3MgPSBuZXcgRGVmYXVsdE1hcDx1bmtub3duLCBIYXNNdXNpY1tdPigoKSA9PiBbXSk7XG4gIGNvbnN0IGFsbCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICBmb3IgKGNvbnN0IGwgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmIChsLmlkID09PSAweDVmIHx8IGwuaWQgPT09IDAgfHwgIWwudXNlZCkgY29udGludWU7IC8vIHNraXAgc3RhcnQgYW5kIGR5bmFcbiAgICBjb25zdCBtdXNpYyA9IGwubXVzaWNHcm91cDtcbiAgICBhbGwuYWRkKGwuYmdtKTtcbiAgICBtdXNpY3MuZ2V0KG11c2ljKS5wdXNoKGwpO1xuICB9XG4gIGZvciAoY29uc3QgYiBvZiByb20uYm9zc2VzLm11c2ljcykge1xuICAgIG11c2ljcy5zZXQoYiwgW2JdKTtcbiAgICBhbGwuYWRkKGIuYmdtKTtcbiAgfVxuICBjb25zdCBsaXN0ID0gWy4uLmFsbF07XG4gIGNvbnN0IHVwZGF0ZWQgPSBuZXcgU2V0PEhhc011c2ljPigpO1xuICBmb3IgKGNvbnN0IHBhcnRpdGlvbiBvZiBtdXNpY3MudmFsdWVzKCkpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHJhbmRvbS5waWNrKGxpc3QpO1xuICAgIGZvciAoY29uc3QgbXVzaWMgb2YgcGFydGl0aW9uKSB7XG4gICAgICBtdXNpYy5iZ20gPSB2YWx1ZTtcbiAgICAgIHVwZGF0ZWQuYWRkKG11c2ljKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2h1ZmZsZVdpbGRXYXJwKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogdm9pZCB7XG4gIGNvbnN0IGxvY2F0aW9uczogTG9jYXRpb25bXSA9IFtdO1xuICBmb3IgKGNvbnN0IGwgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmIChsICYmIGwudXNlZCAmJlxuICAgICAgICAvLyBkb24ndCBhZGQgbWV6YW1lIGJlY2F1c2Ugd2UgYWxyZWFkeSBhZGQgaXQgYWx3YXlzXG4gICAgICAgIGwuaWQgJiZcbiAgICAgICAgLy8gZG9uJ3Qgd2FycCBpbnRvIHNob3BzXG4gICAgICAgICFsLmlzU2hvcCgpICYmXG4gICAgICAgIC8vIGRvbid0IHdhcnAgaW50byB0b3dlclxuICAgICAgICAobC5pZCAmIDB4ZjgpICE9PSAweDU4ICYmXG4gICAgICAgIC8vIGRvbid0IHdhcnAgaW50byBtZXNpYSBzaHJpbmUgYmVjYXVzZSBvZiBxdWVlbiBsb2dpY1xuICAgICAgICBsICE9PSByb20ubG9jYXRpb25zLk1lc2lhU2hyaW5lICYmXG4gICAgICAgIC8vIGRvbid0IHdhcnAgaW50byByYWdlIGJlY2F1c2UgaXQncyBqdXN0IGFubm95aW5nXG4gICAgICAgIGwgIT09IHJvbS5sb2NhdGlvbnMuTGltZVRyZWVMYWtlKSB7XG4gICAgICBsb2NhdGlvbnMucHVzaChsKTtcbiAgICB9XG4gIH1cbiAgcmFuZG9tLnNodWZmbGUobG9jYXRpb25zKTtcbiAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucyA9IFtdO1xuICBmb3IgKGNvbnN0IGxvYyBvZiBbLi4ubG9jYXRpb25zLnNsaWNlKDAsIDE1KS5zb3J0KChhLCBiKSA9PiBhLmlkIC0gYi5pZCldKSB7XG4gICAgcm9tLndpbGRXYXJwLmxvY2F0aW9ucy5wdXNoKGxvYy5pZCk7XG4gICAgaWYgKHJvbS5zcG9pbGVyKSByb20uc3BvaWxlci5hZGRXaWxkV2FycChsb2MuaWQsIGxvYy5uYW1lKTtcbiAgfVxuICByb20ud2lsZFdhcnAubG9jYXRpb25zLnB1c2goMCk7XG59XG5cbmZ1bmN0aW9uIGJ1ZmZEeW5hKHJvbTogUm9tLCBfZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgcm9tLm9iamVjdHNbMHhiOF0uY29sbGlzaW9uUGxhbmUgPSAxO1xuICByb20ub2JqZWN0c1sweGI4XS5pbW1vYmlsZSA9IHRydWU7XG4gIHJvbS5vYmplY3RzWzB4YjldLmNvbGxpc2lvblBsYW5lID0gMTtcbiAgcm9tLm9iamVjdHNbMHhiOV0uaW1tb2JpbGUgPSB0cnVlO1xuICByb20ub2JqZWN0c1sweDMzXS5jb2xsaXNpb25QbGFuZSA9IDI7XG4gIHJvbS5hZEhvY1NwYXduc1sweDI4XS5zbG90UmFuZ2VMb3dlciA9IDB4MWM7IC8vIGNvdW50ZXJcbiAgcm9tLmFkSG9jU3Bhd25zWzB4MjldLnNsb3RSYW5nZVVwcGVyID0gMHgxYzsgLy8gbGFzZXJcbiAgcm9tLmFkSG9jU3Bhd25zWzB4MmFdLnNsb3RSYW5nZVVwcGVyID0gMHgxYzsgLy8gYnViYmxlXG59XG5cbmZ1bmN0aW9uIGJsYWNrb3V0TW9kZShyb206IFJvbSkge1xuICBjb25zdCBkZyA9IGdlbmVyYXRlRGVwZ3JhcGgoKTtcbiAgZm9yIChjb25zdCBub2RlIG9mIGRnLm5vZGVzKSB7XG4gICAgY29uc3QgdHlwZSA9IChub2RlIGFzIGFueSkudHlwZTtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gJ0xvY2F0aW9uJyAmJiAodHlwZSA9PT0gJ2NhdmUnIHx8IHR5cGUgPT09ICdmb3J0cmVzcycpKSB7XG4gICAgICByb20ubG9jYXRpb25zWyhub2RlIGFzIGFueSkuaWRdLnRpbGVQYWxldHRlcy5maWxsKDB4OWEpO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBzdG9yeU1vZGUgPSAocm9tOiBSb20pID0+IHtcbiAgLy8gc2h1ZmZsZSBoYXMgYWxyZWFkeSBoYXBwZW5lZCwgbmVlZCB0byB1c2Ugc2h1ZmZsZWQgZmxhZ3MgZnJvbVxuICAvLyBOUEMgc3Bhd24gY29uZGl0aW9ucy4uLlxuICBjb25zdCBjb25kaXRpb25zID0gW1xuICAgIC8vIE5vdGU6IGlmIGJvc3NlcyBhcmUgc2h1ZmZsZWQgd2UnbGwgbmVlZCB0byBkZXRlY3QgdGhpcy4uLlxuICAgIHJvbS5mbGFncy5LZWxiZXNxdWUxLmlkLFxuICAgIHJvbS5mbGFncy5TYWJlcmExLmlkLFxuICAgIHJvbS5mbGFncy5NYWRvMS5pZCxcbiAgICByb20uZmxhZ3MuS2VsYmVzcXVlMi5pZCxcbiAgICByb20uZmxhZ3MuU2FiZXJhMi5pZCxcbiAgICByb20uZmxhZ3MuTWFkbzIuaWQsXG4gICAgcm9tLmZsYWdzLkthcm1pbmUuaWQsXG4gICAgcm9tLmZsYWdzLkRyYXlnb24xLmlkLFxuICAgIHJvbS5mbGFncy5Td29yZE9mV2luZC5pZCxcbiAgICByb20uZmxhZ3MuU3dvcmRPZkZpcmUuaWQsXG4gICAgcm9tLmZsYWdzLlN3b3JkT2ZXYXRlci5pZCxcbiAgICByb20uZmxhZ3MuU3dvcmRPZlRodW5kZXIuaWQsXG4gICAgLy8gVE9ETyAtIHN0YXR1ZXMgb2YgbW9vbiBhbmQgc3VuIG1heSBiZSByZWxldmFudCBpZiBlbnRyYW5jZSBzaHVmZmxlP1xuICAgIC8vIFRPRE8gLSB2YW1waXJlcyBhbmQgaW5zZWN0P1xuICBdO1xuICByb20ubnBjc1sweGNiXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4YTYpIS5wdXNoKC4uLmNvbmRpdGlvbnMpO1xufTtcblxuLy8gU3RhbXAgdGhlIFJPTVxuZXhwb3J0IGZ1bmN0aW9uIHN0YW1wVmVyc2lvblNlZWRBbmRIYXNoKHJvbTogVWludDhBcnJheSwgc2VlZDogbnVtYmVyLCBmbGFnU3RyaW5nOiBzdHJpbmcsIGVhcmx5OiBVaW50OEFycmF5KTogbnVtYmVyIHtcbiAgLy8gVXNlIHVwIHRvIDI2IGJ5dGVzIHN0YXJ0aW5nIGF0IFBSRyAkMjVlYThcbiAgLy8gV291bGQgYmUgbmljZSB0byBzdG9yZSAoMSkgY29tbWl0LCAoMikgZmxhZ3MsICgzKSBzZWVkLCAoNCkgaGFzaFxuICAvLyBXZSBjYW4gdXNlIGJhc2U2NCBlbmNvZGluZyB0byBoZWxwIHNvbWUuLi5cbiAgLy8gRm9yIG5vdyBqdXN0IHN0aWNrIGluIHRoZSBjb21taXQgYW5kIHNlZWQgaW4gc2ltcGxlIGhleFxuICBjb25zdCBjcmMgPSBjcmMzMihlYXJseSk7XG4gIGNvbnN0IGNyY1N0cmluZyA9IGNyYy50b1N0cmluZygxNikucGFkU3RhcnQoOCwgJzAnKS50b1VwcGVyQ2FzZSgpO1xuICBjb25zdCBoYXNoID0gdmVyc2lvbi5TVEFUVVMgPT09ICd1bnN0YWJsZScgP1xuICAgICAgdmVyc2lvbi5IQVNILnN1YnN0cmluZygwLCA3KS5wYWRTdGFydCg3LCAnMCcpLnRvVXBwZXJDYXNlKCkgKyAnICAgICAnIDpcbiAgICAgIHZlcnNpb24uVkVSU0lPTi5zdWJzdHJpbmcoMCwgMTIpLnBhZEVuZCgxMiwgJyAnKTtcbiAgY29uc3Qgc2VlZFN0ciA9IHNlZWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDgsICcwJykudG9VcHBlckNhc2UoKTtcbiAgY29uc3QgZW1iZWQgPSAoYWRkcjogbnVtYmVyLCB0ZXh0OiBzdHJpbmcpID0+IHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJvbVthZGRyICsgMHgxMCArIGldID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgaW50ZXJjYWxhdGUgPSAoczE6IHN0cmluZywgczI6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzMS5sZW5ndGggfHwgaSA8IHMyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvdXQucHVzaChzMVtpXSB8fCAnICcpO1xuICAgICAgb3V0LnB1c2goczJbaV0gfHwgJyAnKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKCcnKTtcbiAgfTtcblxuICBlbWJlZCgweDI3N2NmLCBpbnRlcmNhbGF0ZSgnICBWRVJTSU9OICAgICBTRUVEICAgICAgJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCAgJHtoYXNofSR7c2VlZFN0cn1gKSk7XG5cbiAgLy8gaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gMzYpIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnJlcGxhY2UoLyAvZywgJycpO1xuICBsZXQgZXh0cmFGbGFncztcbiAgaWYgKGZsYWdTdHJpbmcubGVuZ3RoID4gNDYpIHtcbiAgICBpZiAoZmxhZ1N0cmluZy5sZW5ndGggPiA5MikgdGhyb3cgbmV3IEVycm9yKCdGbGFnIHN0cmluZyB3YXkgdG9vIGxvbmchJyk7XG4gICAgZXh0cmFGbGFncyA9IGZsYWdTdHJpbmcuc3Vic3RyaW5nKDQ2LCA5MikucGFkRW5kKDQ2LCAnICcpO1xuICAgIGZsYWdTdHJpbmcgPSBmbGFnU3RyaW5nLnN1YnN0cmluZygwLCA0Nik7XG4gIH1cbiAgLy8gaWYgKGZsYWdTdHJpbmcubGVuZ3RoIDw9IDM2KSB7XG4gIC8vICAgLy8gYXR0ZW1wdCB0byBicmVhayBpdCBtb3JlIGZhdm9yYWJseVxuXG4gIC8vIH1cbiAgLy8gICBmbGFnU3RyaW5nID0gWydGTEFHUyAnLFxuICAvLyAgICAgICAgICAgICAgICAgZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgMTgpLnBhZEVuZCgxOCwgJyAnKSxcbiAgLy8gICAgICAgICAgICAgICAgICcgICAgICAnLFxuXG4gIC8vIH1cblxuICBmbGFnU3RyaW5nID0gZmxhZ1N0cmluZy5wYWRFbmQoNDYsICcgJyk7XG5cbiAgZW1iZWQoMHgyNzdmZiwgaW50ZXJjYWxhdGUoZmxhZ1N0cmluZy5zdWJzdHJpbmcoMCwgMjMpLCBmbGFnU3RyaW5nLnN1YnN0cmluZygyMykpKTtcbiAgaWYgKGV4dHJhRmxhZ3MpIHtcbiAgICBlbWJlZCgweDI3ODJmLCBpbnRlcmNhbGF0ZShleHRyYUZsYWdzLnN1YnN0cmluZygwLCAyMyksIGV4dHJhRmxhZ3Muc3Vic3RyaW5nKDIzKSkpO1xuICB9XG5cbiAgZW1iZWQoMHgyNzg4NSwgaW50ZXJjYWxhdGUoY3JjU3RyaW5nLnN1YnN0cmluZygwLCA0KSwgY3JjU3RyaW5nLnN1YnN0cmluZyg0KSkpO1xuXG4gIC8vIGVtYmVkKDB4MjVlYTgsIGB2LiR7aGFzaH0gICAke3NlZWR9YCk7XG4gIGVtYmVkKDB4MjU3MTYsICdSQU5ET01JWkVSJyk7XG4gIGlmICh2ZXJzaW9uLlNUQVRVUyA9PT0gJ3Vuc3RhYmxlJykgZW1iZWQoMHgyNTczYywgJ0JFVEEnKTtcbiAgLy8gTk9URTogaXQgd291bGQgYmUgcG9zc2libGUgdG8gYWRkIHRoZSBoYXNoL3NlZWQvZXRjIHRvIHRoZSB0aXRsZVxuICAvLyBwYWdlIGFzIHdlbGwsIGJ1dCB3ZSdkIG5lZWQgdG8gcmVwbGFjZSB0aGUgdW51c2VkIGxldHRlcnMgaW4gYmFua1xuICAvLyAkMWQgd2l0aCB0aGUgbWlzc2luZyBudW1iZXJzIChKLCBRLCBXLCBYKSwgYXMgd2VsbCBhcyB0aGUgdHdvXG4gIC8vIHdlaXJkIHNxdWFyZXMgYXQgJDViIGFuZCAkNWMgdGhhdCBkb24ndCBhcHBlYXIgdG8gYmUgdXNlZC4gIFRvZ2V0aGVyXG4gIC8vIHdpdGggdXNpbmcgdGhlIGxldHRlciAnTycgYXMgMCwgdGhhdCdzIHN1ZmZpY2llbnQgdG8gY3JhbSBpbiBhbGwgdGhlXG4gIC8vIG51bWJlcnMgYW5kIGRpc3BsYXkgYXJiaXRyYXJ5IGhleCBkaWdpdHMuXG5cbiAgcmV0dXJuIGNyYztcbn1cblxuZnVuY3Rpb24gdXBkYXRlVGFibGVzUHJlQ29tbWl0KHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICAvLyBDaGFuZ2Ugc29tZSBlbmVteSBzY2FsaW5nIGZyb20gdGhlIGRlZmF1bHQsIGlmIGZsYWdzIGFzayBmb3IgaXQuXG4gIGlmIChmbGFncy5kZWNyZWFzZUVuZW15RGFtYWdlKCkpIHtcbiAgICByb20uc2NhbGluZy5zZXRQaHBGb3JtdWxhKHMgPT4gMTYgKyA2ICogcyk7XG4gIH1cbiAgcm9tLnNjYWxpbmcuc2V0RXhwU2NhbGluZ0ZhY3RvcihmbGFncy5leHBTY2FsaW5nRmFjdG9yKCkpO1xuXG4gIC8vIFVwZGF0ZSB0aGUgY29pbiBkcm9wIGJ1Y2tldHMgKGdvZXMgd2l0aCBlbmVteSBzdGF0IHJlY29tcHV0YXRpb25zXG4gIC8vIGluIHBvc3RzaHVmZmxlLnMpXG4gIGlmIChmbGFncy5kaXNhYmxlU2hvcEdsaXRjaCgpKSB7XG4gICAgLy8gYmlnZ2VyIGdvbGQgZHJvcHMgaWYgbm8gc2hvcCBnbGl0Y2gsIHBhcnRpY3VsYXJseSBhdCB0aGUgc3RhcnRcbiAgICAvLyAtIHN0YXJ0cyBvdXQgZmlib25hY2NpLCB0aGVuIGdvZXMgbGluZWFyIGF0IDYwMFxuICAgIHJvbS5jb2luRHJvcHMudmFsdWVzID0gW1xuICAgICAgICAwLCAgIDUsICAxMCwgIDE1LCAgMjUsICA0MCwgIDY1LCAgMTA1LFxuICAgICAgMTcwLCAyNzUsIDQ0NSwgNjAwLCA3MDAsIDgwMCwgOTAwLCAxMDAwLFxuICAgIF07XG4gIH0gZWxzZSB7XG4gICAgLy8gdGhpcyB0YWJsZSBpcyBiYXNpY2FsbHkgbWVhbmluZ2xlc3MgYi9jIHNob3AgZ2xpdGNoXG4gICAgcm9tLmNvaW5Ecm9wcy52YWx1ZXMgPSBbXG4gICAgICAgIDAsICAgMSwgICAyLCAgIDQsICAgOCwgIDE2LCAgMzAsICA1MCxcbiAgICAgIDEwMCwgMjAwLCAzMDAsIDQwMCwgNTAwLCA2MDAsIDcwMCwgODAwLFxuICAgIF07XG4gIH1cblxuICAvLyBVcGRhdGUgc2hpZWxkIGFuZCBhcm1vciBkZWZlbnNlIHZhbHVlcy5cbiAgLy8gU29tZSBvZiB0aGUgXCJtaWRkbGVcIiBzaGllbGRzIGFyZSAyIHBvaW50cyB3ZWFrZXIgdGhhbiB0aGUgY29ycmVzcG9uZGluZ1xuICAvLyBhcm1vcnMuICBJZiB3ZSBpbnN0ZWFkIGF2ZXJhZ2UgdGhlIHNoaWVsZC9hcm1vciB2YWx1ZXMgYW5kIGJ1bXAgKzEgZm9yXG4gIC8vIHRoZSBjYXJhcGFjZSBsZXZlbCwgd2UgZ2V0IGEgcHJldHR5IGRlY2VudCBwcm9ncmVzc2lvbjogMywgNiwgOSwgMTMsIDE4LFxuICAvLyB3aGljaCBpcyArMywgKzMsICszLCArNCwgKzUuXG4gIHJvbS5pdGVtcy5DYXJhcGFjZVNoaWVsZC5kZWZlbnNlID0gcm9tLml0ZW1zLlRhbm5lZEhpZGUuZGVmZW5zZSA9IDM7XG4gIHJvbS5pdGVtcy5QbGF0aW51bVNoaWVsZC5kZWZlbnNlID0gcm9tLml0ZW1zLkJyb256ZUFybW9yLmRlZmVuc2UgPSA5O1xuICByb20uaXRlbXMuTWlycm9yZWRTaGllbGQuZGVmZW5zZSA9IHJvbS5pdGVtcy5QbGF0aW51bUFybW9yLmRlZmVuc2UgPSAxMztcbiAgLy8gRm9yIHRoZSBoaWdoLWVuZCBhcm1vcnMsIHdlIHdhbnQgdG8gYmFsYW5jZSBvdXQgdGhlIHRvcCB0aHJlZSBhIGJpdFxuICAvLyBiZXR0ZXIuICBTYWNyZWQgc2hpZWxkIGFscmVhZHkgaGFzIGxvd2VyIGRlZmVuc2UgKDE2KSB0aGFuIHRoZSBwcmV2aW91c1xuICAvLyBvbmUsIGFzIGRvZXMgYmF0dGxlIGFybW9yICgyMCksIHNvIHdlIGxlYXZlIHRoZW0gYmUuICBQc3ljaG9zIGFyZVxuICAvLyBkZW1vdGVkIGZyb20gMzIgdG8gMjAsIGFuZCB0aGUgbm8tZXh0cmEtcG93ZXIgYXJtb3JzIGdldCB0aGUgMzIuXG4gIHJvbS5pdGVtcy5Qc3ljaG9Bcm1vci5kZWZlbnNlID0gcm9tLml0ZW1zLlBzeWNob1NoaWVsZC5kZWZlbnNlID0gMjA7XG4gIHJvbS5pdGVtcy5DZXJhbWljU3VpdC5kZWZlbnNlID0gcm9tLml0ZW1zLkJhdHRsZVNoaWVsZC5kZWZlbnNlID0gMzI7XG5cbiAgLy8gQlVULi4uIGZvciBub3cgd2UgZG9uJ3Qgd2FudCB0byBtYWtlIGFueSBjaGFuZ2VzLCBzbyBmaXggaXQgYmFjay5cbiAgcm9tLml0ZW1zLkNhcmFwYWNlU2hpZWxkLmRlZmVuc2UgPSByb20uaXRlbXMuVGFubmVkSGlkZS5kZWZlbnNlID0gMjtcbiAgcm9tLml0ZW1zLlBsYXRpbnVtU2hpZWxkLmRlZmVuc2UgPSByb20uaXRlbXMuQnJvbnplQXJtb3IuZGVmZW5zZSA9IDEwO1xuICByb20uaXRlbXMuTWlycm9yZWRTaGllbGQuZGVmZW5zZSA9IHJvbS5pdGVtcy5QbGF0aW51bUFybW9yLmRlZmVuc2UgPSAxNDtcbiAgcm9tLml0ZW1zLkJhdHRsZUFybW9yLmRlZmVuc2UgPSAyNDtcbn1cblxuY29uc3QgcmVzY2FsZVNob3BzID0gKHJvbTogUm9tLCByYW5kb20/OiBSYW5kb20pID0+IHtcbiAgLy8gUG9wdWxhdGUgcmVzY2FsZWQgcHJpY2VzIGludG8gdGhlIHZhcmlvdXMgcm9tIGxvY2F0aW9ucy5cbiAgLy8gU3BlY2lmaWNhbGx5LCB3ZSByZWFkIHRoZSBhdmFpbGFibGUgaXRlbSBJRHMgb3V0IG9mIHRoZVxuICAvLyBzaG9wIHRhYmxlcyBhbmQgdGhlbiBjb21wdXRlIG5ldyBwcmljZXMgZnJvbSB0aGVyZS5cbiAgLy8gSWYgYHJhbmRvbWAgaXMgcGFzc2VkIHRoZW4gdGhlIGJhc2UgcHJpY2UgdG8gYnV5IGVhY2hcbiAgLy8gaXRlbSBhdCBhbnkgZ2l2ZW4gc2hvcCB3aWxsIGJlIGFkanVzdGVkIHRvIGFueXdoZXJlIGZyb21cbiAgLy8gNTAlIHRvIDE1MCUgb2YgdGhlIGJhc2UgcHJpY2UuICBUaGUgcGF3biBzaG9wIHByaWNlIGlzXG4gIC8vIGFsd2F5cyA1MCUgb2YgdGhlIGJhc2UgcHJpY2UuXG5cbiAgZm9yIChjb25zdCBzaG9wIG9mIHJvbS5zaG9wcykge1xuICAgIGlmIChzaG9wLnR5cGUgPT09IFNob3BUeXBlLlBBV04pIGNvbnRpbnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzaG9wLnByaWNlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHNob3AuY29udGVudHNbaV0gPCAweDgwKSB7XG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gcmFuZG9tID8gcmFuZG9tLm5leHROb3JtYWwoMSwgMC4zLCAwLjUsIDEuNSkgOiAxO1xuICAgICAgfSBlbHNlIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLklOTikge1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBqdXN0IHNldCB0aGUgb25lIHByaWNlXG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gcmFuZG9tID8gcmFuZG9tLm5leHROb3JtYWwoMSwgMC41LCAwLjM3NSwgMS42MjUpIDogMTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gQWxzbyBmaWxsIHRoZSBzY2FsaW5nIHRhYmxlcy5cbiAgY29uc3QgZGlmZiA9IHNlcSg0OCAvKmFzbS5leHBhbmQoJ1NjYWxpbmdMZXZlbHMnKSovLCB4ID0+IHgpO1xuICByb20uc2hvcHMucmVzY2FsZSA9IHRydWU7XG4gIC8vIFRvb2wgc2hvcHMgc2NhbGUgYXMgMiAqKiAoRGlmZiAvIDEwKSwgc3RvcmUgaW4gOHRoc1xuICByb20uc2hvcHMudG9vbFNob3BTY2FsaW5nID0gZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDggKiAoMiAqKiAoZCAvIDEwKSkpKTtcbiAgLy8gQXJtb3Igc2hvcHMgc2NhbGUgYXMgMiAqKiAoKDQ3IC0gRGlmZikgLyAxMiksIHN0b3JlIGluIDh0aHNcbiAgcm9tLnNob3BzLmFybW9yU2hvcFNjYWxpbmcgPVxuICAgICAgZGlmZi5tYXAoZCA9PiBNYXRoLnJvdW5kKDggKiAoMiAqKiAoKDQ3IC0gZCkgLyAxMikpKSk7XG5cbiAgLy8gU2V0IHRoZSBpdGVtIGJhc2UgcHJpY2VzLlxuICBmb3IgKGxldCBpID0gMHgwZDsgaSA8IDB4Mjc7IGkrKykge1xuICAgIHJvbS5pdGVtc1tpXS5iYXNlUHJpY2UgPSBCQVNFX1BSSUNFU1tpXTtcbiAgfVxuIFxuIC8vIFRPRE8gLSBzZXBhcmF0ZSBmbGFnIGZvciByZXNjYWxpbmcgbW9uc3RlcnM/Pz9cbn07XG5cbi8vIE1hcCBvZiBiYXNlIHByaWNlcy4gIChUb29scyBhcmUgcG9zaXRpdmUsIGFybW9ycyBhcmUgb25lcy1jb21wbGVtZW50LilcbmNvbnN0IEJBU0VfUFJJQ0VTOiB7W2l0ZW1JZDogbnVtYmVyXTogbnVtYmVyfSA9IHtcbiAgLy8gQXJtb3JzXG4gIDB4MGQ6IDQsICAgIC8vIGNhcmFwYWNlIHNoaWVsZFxuICAweDBlOiAxNiwgICAvLyBicm9uemUgc2hpZWxkXG4gIDB4MGY6IDUwLCAgIC8vIHBsYXRpbnVtIHNoaWVsZFxuICAweDEwOiAzMjUsICAvLyBtaXJyb3JlZCBzaGllbGRcbiAgMHgxMTogMTAwMCwgLy8gY2VyYW1pYyBzaGllbGRcbiAgMHgxMjogMjAwMCwgLy8gc2FjcmVkIHNoaWVsZFxuICAweDEzOiA0MDAwLCAvLyBiYXR0bGUgc2hpZWxkXG4gIDB4MTU6IDYsICAgIC8vIHRhbm5lZCBoaWRlXG4gIDB4MTY6IDIwLCAgIC8vIGxlYXRoZXIgYXJtb3JcbiAgMHgxNzogNzUsICAgLy8gYnJvbnplIGFybW9yXG4gIDB4MTg6IDI1MCwgIC8vIHBsYXRpbnVtIGFybW9yXG4gIDB4MTk6IDEwMDAsIC8vIHNvbGRpZXIgc3VpdFxuICAweDFhOiA0ODAwLCAvLyBjZXJhbWljIHN1aXRcbiAgLy8gVG9vbHNcbiAgMHgxZDogMjUsICAgLy8gbWVkaWNhbCBoZXJiXG4gIDB4MWU6IDMwLCAgIC8vIGFudGlkb3RlXG4gIDB4MWY6IDQ1LCAgIC8vIGx5c2lzIHBsYW50XG4gIDB4MjA6IDQwLCAgIC8vIGZydWl0IG9mIGxpbWVcbiAgMHgyMTogMzYsICAgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgMHgyMjogMjAwLCAgLy8gbWFnaWMgcmluZ1xuICAweDIzOiAxNTAsICAvLyBmcnVpdCBvZiByZXB1blxuICAweDI0OiA2NSwgICAvLyB3YXJwIGJvb3RzXG4gIDB4MjY6IDMwMCwgIC8vIG9wZWwgc3RhdHVlXG4gIC8vIDB4MzE6IDUwLCAvLyBhbGFybSBmbHV0ZVxufTtcblxuLy8vLy8vLy8vXG4vLy8vLy8vLy9cbi8vLy8vLy8vL1xuXG4vLyBjb25zdCBpZGVudGlmeUtleUl0ZW1zRm9yRGlmZmljdWx0eUJ1ZmZzID0gKHJvbTogUm9tKSA9PiB7XG4vLyAgIC8vIC8vIFRhZyBrZXkgaXRlbXMgZm9yIGRpZmZpY3VsdHkgYnVmZnNcbi8vICAgLy8gZm9yIChjb25zdCBnZXQgb2Ygcm9tLml0ZW1HZXRzKSB7XG4vLyAgIC8vICAgY29uc3QgaXRlbSA9IElURU1TLmdldChnZXQuaXRlbUlkKTtcbi8vICAgLy8gICBpZiAoIWl0ZW0gfHwgIWl0ZW0ua2V5KSBjb250aW51ZTtcbi8vICAgLy8gICBnZXQua2V5ID0gdHJ1ZTtcbi8vICAgLy8gfVxuLy8gICAvLyAvLyBjb25zb2xlLmxvZyhyZXBvcnQpO1xuLy8gICBmb3IgKGxldCBpID0gMDsgaSA8IDB4NDk7IGkrKykge1xuLy8gICAgIC8vIE5PVEUgLSBzcGVjaWFsIGhhbmRsaW5nIGZvciBhbGFybSBmbHV0ZSB1bnRpbCB3ZSBwcmUtcGF0Y2hcbi8vICAgICBjb25zdCB1bmlxdWUgPSAocm9tLnByZ1sweDIwZmYwICsgaV0gJiAweDQwKSB8fCBpID09PSAweDMxO1xuLy8gICAgIGNvbnN0IGJpdCA9IDEgPDwgKGkgJiA3KTtcbi8vICAgICBjb25zdCBhZGRyID0gMHgxZTExMCArIChpID4+PiAzKTtcbi8vICAgICByb20ucHJnW2FkZHJdID0gcm9tLnByZ1thZGRyXSAmIH5iaXQgfCAodW5pcXVlID8gYml0IDogMCk7XG4vLyAgIH1cbi8vIH07XG5cbi8vIFdoZW4gZGVhbGluZyB3aXRoIGNvbnN0cmFpbnRzLCBpdCdzIGJhc2ljYWxseSBrc2F0XG4vLyAgLSB3ZSBoYXZlIGEgbGlzdCBvZiByZXF1aXJlbWVudHMgdGhhdCBhcmUgQU5EZWQgdG9nZXRoZXJcbi8vICAtIGVhY2ggaXMgYSBsaXN0IG9mIHByZWRpY2F0ZXMgdGhhdCBhcmUgT1JlZCB0b2dldGhlclxuLy8gIC0gZWFjaCBwcmVkaWNhdGUgaGFzIGEgY29udGludWF0aW9uIGZvciB3aGVuIGl0J3MgcGlja2VkXG4vLyAgLSBuZWVkIGEgd2F5IHRvIHRoaW4gdGhlIGNyb3dkLCBlZmZpY2llbnRseSBjaGVjayBjb21wYXQsIGV0Y1xuLy8gUHJlZGljYXRlIGlzIGEgZm91ci1lbGVtZW50IGFycmF5IFtwYXQwLHBhdDEscGFsMixwYWwzXVxuLy8gUmF0aGVyIHRoYW4gYSBjb250aW51YXRpb24gd2UgY291bGQgZ28gdGhyb3VnaCBhbGwgdGhlIHNsb3RzIGFnYWluXG5cbi8vIGNsYXNzIENvbnN0cmFpbnRzIHtcbi8vICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgLy8gQXJyYXkgb2YgcGF0dGVybiB0YWJsZSBvcHRpb25zLiAgTnVsbCBpbmRpY2F0ZXMgdGhhdCBpdCBjYW4gYmUgYW55dGhpbmcuXG4vLyAgICAgLy9cbi8vICAgICB0aGlzLnBhdHRlcm5zID0gW1tudWxsLCBudWxsXV07XG4vLyAgICAgdGhpcy5wYWxldHRlcyA9IFtbbnVsbCwgbnVsbF1dO1xuLy8gICAgIHRoaXMuZmx5ZXJzID0gMDtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVUcmVhc3VyZUNoZXN0KCkge1xuLy8gICAgIHRoaXMucmVxdWlyZU9yZGVyZWRTbG90KDAsIFRSRUFTVVJFX0NIRVNUX0JBTktTKTtcbi8vICAgfVxuXG4vLyAgIHJlcXVpcmVPcmRlcmVkU2xvdChzbG90LCBzZXQpIHtcblxuLy8gICAgIGlmICghdGhpcy5vcmRlcmVkKSB7XG5cbi8vICAgICB9XG4vLyAvLyBUT0RPXG4vLyAgICAgdGhpcy5wYXQwID0gaW50ZXJzZWN0KHRoaXMucGF0MCwgc2V0KTtcblxuLy8gICB9XG5cbi8vIH1cblxuLy8gY29uc3QgaW50ZXJzZWN0ID0gKGxlZnQsIHJpZ2h0KSA9PiB7XG4vLyAgIGlmICghcmlnaHQpIHRocm93IG5ldyBFcnJvcigncmlnaHQgbXVzdCBiZSBub250cml2aWFsJyk7XG4vLyAgIGlmICghbGVmdCkgcmV0dXJuIHJpZ2h0O1xuLy8gICBjb25zdCBvdXQgPSBuZXcgU2V0KCk7XG4vLyAgIGZvciAoY29uc3QgeCBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0Lmhhcyh4KSkgb3V0LmFkZCh4KTtcbi8vICAgfVxuLy8gICByZXR1cm4gb3V0O1xuLy8gfVxuXG5cbi8vIHVzZWZ1bCBmb3IgZGVidWcgZXZlbiBpZiBub3QgY3VycmVudGx5IHVzZWRcbmNvbnN0IFtdID0gW2hleF07XG4iXX0=