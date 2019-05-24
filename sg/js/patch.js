import {Assembler, assemble, buildRomPatch} from './6502.js';
import {Rom} from './rom.js';
import {Random} from './random.js';
import {shuffle2 as shuffleDepgraph} from './depgraph.js';
import {crc32} from './crc32.js';
import {FlagSet} from './flagset.js';
import {FetchReader} from './fetchreader.js';
import * as version from './version.js';

// TODO - to shuffle the monsters, we need to find the sprite palttes and
// patterns for each monster.  Each location supports up to two matchups,
// so can only support monsters that match.  Moreover, different monsters
// seem to need to be in either slot 0 or 1.

// Pull in all the patches we want to apply automatically.
// TODO - make a debugger window for patches.
// TODO - this needs to be a separate non-compiled file.
export default ({
  async apply(rom, hash, path) {
    // Look for flag string and hash
    let flags;
    if (!hash['seed']) {
      // TODO - send in a hash object with get/set methods
      hash['seed'] = parseSeed('').toString(16);
      window.location.hash += '&seed=' + hash['seed'];
    }
    if (hash['flags']) {
      flags = new FlagSet(hash['flags']);
    } else {
      flags = new FlagSet('Em Gt Mr Rlpt Sbk Sct Sm Tasd');
    }
    for (const key in hash) {
      if (hash[key] === 'false') hash[key] = false;
    }
    await shuffle(rom, parseSeed(hash['seed']), flags, new FetchReader(path));
  }
});

export const parseSeed = (/** string */ seed) => /** number */ {
  if (!seed) return Math.floor(Math.random() * 0x100000000);
  if (/^[0-9a-f]{1,8}$/i.test(seed)) return Number.parseInt(seed, 16);
  return crc32(seed);
}

/**
 * Abstract out File I/O.  Node and browser will have completely
 * different implementations.
 * @record
 */
export class Reader {
  /**
   * @param {string} filename
   * @return {!Promise<string>} contents
   */
  read(filename) {}
}

export const shuffle = async (rom, seed, flags, reader, log = undefined, progress = undefined) => {
  // First turn the seed into something useful.
  if (typeof seed !== 'number') throw new Error('Bad seed');
  const newSeed = crc32(seed.toString(16).padStart(8, 0) + String(flags)) >>> 0;

  const touchShops = true;

  const shouldBuffDyna = seed.toString(16).toLowerCase().startsWith('17bc');

  const defines = {
    _ALLOW_TELEPORT_OUT_OF_TOWER: true,
    _AUTO_EQUIP_BRACELET: flags.autoEquipBracelet(),
    _BARRIER_REQUIRES_CALM_SEA: flags.barrierRequiresCalmSea(),
    _BUFF_DEOS_PENDANT: flags.buffDeosPendant(),
    _BUFF_DYNA: shouldBuffDyna, // true,
    _CHECK_FLAG0: true,
    _DEBUG_DIALOG: seed === 0x17bc,
    _DISABLE_SHOP_GLITCH: flags.disableShopGlitch(),
    _DISABLE_STATUE_GLITCH: flags.disableStatueGlitch(),
    _DISABLE_SWORD_CHARGE_GLITCH: flags.disableSwordChargeGlitch(),
    _DISABLE_WILD_WARP: false,
    _DISPLAY_DIFFICULTY: true,
    _EXTRA_PITY_MP: true,  // TODO: allow disabling this
    _FIX_OPEL_STATUE: true,
    _FIX_SHAKING: true,
    _FIX_VAMPIRE: true,
    _LEATHER_BOOTS_GIVE_SPEED: flags.leatherBootsGiveSpeed(),
    _NERF_WILD_WARP: flags.nerfWildWarp(),
    _NERF_FLIGHT: true,
    _NEVER_DIE: flags.neverDie(),
    _NORMALIZE_SHOP_PRICES: touchShops,
    _PITY_HP_AND_MP: true,
    _PROGRESSIVE_BRACELET: true,
    _RABBIT_BOOTS_CHARGE_WHILE_WALKING: flags.rabbitBootsChargeWhileWalking(),
    _REVERSIBLE_SWAN_GATE: true,
    _REQUIRE_HEALED_DOLPHIN_TO_RIDE: flags.requireHealedDolphinToRide(),
    _SAHARA_RABBITS_REQUIRE_TELEPATHY: flags.saharaRabbitsRequireTelepathy(),
    _TELEPORT_ON_THUNDER_SWORD: flags.teleportOnThunderSword(),
  };

  const asm = new Assembler();
  const assemble = async (file) => {
    asm.assemble(await reader.read(file), file);
    asm.patchRom(rom);
  };

  const flagFile =
      Object.keys(defines)
          .filter(d => defines[d]).map(d => `define ${d} 1\n`).join('');
  asm.assemble(flagFile, 'flags.s');
  await assemble('preshuffle.s');

  const random = new Random(newSeed);
  await shuffleDepgraph(rom, random, log, flags, progress);

  if (touchShops) {
    // TODO - separate logic for handling shops w/o Pn specified (i.e. vanilla
    // shops that may have been randomized)
    rescaleShops(rom, asm, flags.bargainHunting() ? random : null);
  }

  // Parse the rom and apply other patches - note: must have shuffled
  // the depgraph FIRST!
  const parsed = new Rom(rom);
  rescaleMonsters(rom, parsed);
  if (flags.shuffleMonsters()) shuffleMonsters(rom, parsed, random);
  identifyKeyItemsForDifficultyBuffs(parsed);

  // Buff medical herb and fruit of power
  if (flags.doubleBuffMedicalHerb()) {
    rom[0x1c50c + 0x10] *= 2;  // fruit of power
    rom[0x1c4ea + 0x10] *= 3;  // medical herb
  } else if (flags.buffMedicalHerb()) {
    rom[0x1c50c + 0x10] += 16; // fruit of power
    rom[0x1c4ea + 0x10] *= 2;  // medical herb
  }

  if (flags.connectLimeTreeToLeaf()) {
    connectLimeTreeToLeaf(parsed);
  }

  addCordelWestTriggers(parsed, flags);
  if (flags.disableRabbitSkip()) fixRabbitSkip(parsed);
  if (flags.storyMode()) storyMode(parsed);

  if (flags.chargeShotsOnly()) disableStabs(parsed);

  if (flags.orbsOptional()) orbsOptional(parsed);

  closeCaveEntrances(parsed, flags);

  misc(parsed, flags);

  if (shouldBuffDyna) buffDyna(parsed, flags); // TODO - conditional

  await assemble('postshuffle.s');
  updateDifficultyScalingTables(rom, flags, asm);
  updateCoinDrops(rom, flags);

  shuffleRandomNumbers(rom, random);

  await parsed.writeData();

  return stampVersionSeedAndHash(rom, seed, flags);

  // BELOW HERE FOR OPTIONAL FLAGS:

  // do any "vanity" patches here...
  // console.log('patch applied');
  // return log.join('\n');
};


const misc = (rom, flags) => {
};


const buffDyna = (rom, flags) => {
  rom.objects[0xb8].collisionPlane = 1;
  rom.objects[0xb8].immobile = 1;
  rom.objects[0xb9].collisionPlane = 1;
  rom.objects[0xb9].immobile = 1;
  rom.objects[0x33].collisionPlane = 2;
};

const closeCaveEntrances = (rom, flags) => {

  // Clear tiles 1,2,3,4 for blockable caves in tilesets 90, 94, and 9c
  rom.swapMetatiles([0x90],
                    [0x07, [0x01, 0x00], ~0xc1],
                    [0x0e, [0x02, 0x00], ~0xc1],
                    [0x20, [0x03, 0x0a], ~0xd7],
                    [0x21, [0x04, 0x0a], ~0xd7]);
  rom.swapMetatiles([0x94, 0x9c],
                    [0x68, [0x01, 0x00], ~0xc1],
                    [0x83, [0x02, 0x00], ~0xc1],
                    [0x88, [0x03, 0x0a], ~0xd7],
                    [0x89, [0x04, 0x0a], ~0xd7]);

  // Now replace the tiles with the blockable ones
  rom.screens[0x0a].tiles[0x3][0x8] = 0x01;
  rom.screens[0x0a].tiles[0x3][0x9] = 0x02;
  rom.screens[0x0a].tiles[0x4][0x8] = 0x03;
  rom.screens[0x0a].tiles[0x4][0x9] = 0x04;

  rom.screens[0x15].tiles[0x7][0x9] = 0x01;
  rom.screens[0x15].tiles[0x7][0xa] = 0x02;
  rom.screens[0x15].tiles[0x8][0x9] = 0x03;
  rom.screens[0x15].tiles[0x8][0xa] = 0x04;

  rom.screens[0x19].tiles[0x4][0x8] = 0x01;
  rom.screens[0x19].tiles[0x4][0x9] = 0x02;
  rom.screens[0x19].tiles[0x5][0x8] = 0x03;
  rom.screens[0x19].tiles[0x5][0x9] = 0x04;

  rom.screens[0x3e].tiles[0x5][0x6] = 0x01;
  rom.screens[0x3e].tiles[0x5][0x7] = 0x02;
  rom.screens[0x3e].tiles[0x6][0x6] = 0x03;
  rom.screens[0x3e].tiles[0x6][0x7] = 0x04;

  // NOTE: flag 2ef is ALWAYS set - use it as a baseline.
  const flagsToClear = [
    [0x03, 0x30], // valley of wind, zebu's cave
    [0x14, 0x30], // cordel west, vampire cave
    [0x15, 0x30], // cordel east, vampire cave
    [0x40, 0x00], // waterfall north, prison cave
    [0x40, 0x14], // waterfall north, fog lamp
    [0x41, 0x74], // waterfall south, kirisa
    [0x47, 0x10], // kirisa meadow
    [0x94, 0x00], // cave to desert
    [0x98, 0x41],
  ];
  for (const [loc, pos] of flagsToClear) {
    rom.locations[loc].flags.push([0xef, pos]);
  }

  const replaceFlag = (loc, pos, flag) => {
    for (const arr of rom.locations[loc].flags) {
      if (arr[1] == pos) {
        arr[0] = flag;
        return;
      }
    }
    throw new Error(`Could not find flag to replace at ${loc}:${pos}`);
  };

  if (flags.paralysisRequiresPrisonKey()) { // close off reverse entrances
    // NOTE: we could also close it off until boss killed...?
    //  - const vampireFlag = ~rom.npcSpawns[0xc0].conditions[0x0a][0];
    //  -> kelbesque for the other one.
    const windmillFlag = 0xee;
    replaceFlag(0x14, 0x30, windmillFlag);
    replaceFlag(0x15, 0x30, windmillFlag);

    replaceFlag(0x40, 0x00, 0xd8); // key to prison flag
    rom.locations[0x40].objects.splice(1, 0, [0x06, 0x06, 0x04, 0x2c]);
    rom.locations[0x40].objects.push([0x07, 0x07, 0x02, 0xad]);
  }

  //rom.locations[0x14].tileEffects = 0xb3;

  // d7 for 3?

  // TODO - this ended up with message 00:03 and an action that gave bow of moon!

  // rom.triggers[0x19].message.part = 0x1b;
  // rom.triggers[0x19].message.index = 0x08;
  // rom.triggers[0x19].flags.push(0x2f6, 0x2f7, 0x2f8);
};

const eastCave = (rom) => {
  // NOTE: 0x9c can become 0x99 in top left or 0x97 in top right or bottom middle for a cave exit
  const screens1 = [[0x9c, 0x84, 0x80, 0x83, 0x9c],
                    [0x80, 0x81, 0x83, 0x86, 0x80],
                    [0x83, 0x88, 0x89, 0x80, 0x80],
                    [0x81, 0x8c, 0x85, 0x82, 0x84],
                    [0x9a, 0x85, 0x9c, 0x98, 0x86]];
  const screens2 = [[0x9c, 0x84, 0x9b, 0x80, 0x9b],
                    [0x80, 0x81, 0x81, 0x80, 0x81],
                    [0x80, 0x87, 0x8b, 0x8a, 0x86],
                    [0x80, 0x8c, 0x80, 0x85, 0x84],
                    [0x9c, 0x86, 0x80, 0x80, 0x9a]];
  // TODO fill up graphics, etc --> $1a, $1b, $05 / $88, $b5 / $14, $02
  // Think aobut exits and entrances...?

};

// Add the statue of onyx and possibly the teleport block trigger to Cordel West
const addCordelWestTriggers = (rom, flags) => {
  for (const o of rom.locations[0x15].objects) {
    if (o[2] === 2) {
      // Copy if (1) it's the chest, or (2) we're disabling teleport skip
      const copy = o[3] < 0x80 || flags.disableTeleportSkip();
        // statue of onyx - always move
      if (copy) rom.locations[0x14].objects.push([...o]);
    }
  }
};

const fixRabbitSkip = (rom) => {
  for (const o of rom.locations[0x28].objects) {
    if (o[2] === 2 && o[3] === 0x86) {
      if (o[1] === 0x74) {
        o[0]++; // previously we did both?
        o[1]++;
      }
    }
  }
};

const storyMode = (rom) => {
  // shuffle has already happened, need to use shuffled flags from
  // NPC spawn conditions...
  const requirements = rom.npcSpawns[0xcb].conditions[0xa6];
  // Note: if bosses are shuffled we'll need to detect this...
  requirements.push(~rom.npcSpawns[0xc2].conditions[0x28][0]); // Kelbesque 1
  requirements.push(~rom.npcSpawns[0x84].conditions[0x6e][0]); // Sabera 1
  requirements.push(~rom.triggers[0x9a & 0x7f].conditions[1]); // Mado 1
  requirements.push(~rom.npcSpawns[0xc5].conditions[0xa9][0]); // Kelbesque 2
  requirements.push(~rom.npcSpawns[0xc6].conditions[0xac][0]); // Sabera 2
  requirements.push(~rom.npcSpawns[0xc7].conditions[0xb9][0]); // Mado 2
  requirements.push(~rom.npcSpawns[0xc8].conditions[0xb6][0]); // Karmine
  requirements.push(~rom.npcSpawns[0xcb].conditions[0x9f][0]); // Draygon 1
  requirements.push(0x200); // Sword of Wind
  requirements.push(0x201); // Sword of Fire
  requirements.push(0x202); // Sword of Water
  requirements.push(0x203); // Sword of Thunder
  // TODO - statues of moon and sun may be relevant if entrance shuffle?
  // TODO - vampires and insect?
};


// Hard mode flag: Hc - zero out the sword's collision plane
const disableStabs = (rom) => {
  for (const o of [0x08, 0x09, 0x27]) {
    rom.objects[o].collisionPlane = 0;
  }
};

const orbsOptional = (rom) => {
  for (const obj of [0x10, 0x14, 0x18, 0x1d]) {
    // 1. Loosen terrain susceptibility of level 1 shots
    rom.objects[obj].terrainSusceptibility &= ~0x04;
    // 2. Increase the level to 2
    rom.objects[obj].level = 2;
  }
};

// Programmatically add a hole between valley of wind and lime tree valley
const connectLimeTreeToLeaf = (rom) => {
  const valleyOfWind = rom.locations[0x03];
  const limeTree = rom.locations[0x42];

  valleyOfWind.screens[5][4] = 0x10; // new exit
  limeTree.screens[1][0] = 0x1a; // new exit
  limeTree.screens[2][0] = 0x0c; // nicer mountains

  const windEntrance = valleyOfWind.entrances.push([0xef, 0x04, 0x78, 0x05]) - 1;
  const limeEntrance = limeTree.entrances.push([0x10, 0x00, 0xc0, 0x01]) - 1;

  valleyOfWind.exits.push(
      [0x4f, 0x56, 0x42, limeEntrance],
      [0x4f, 0x57, 0x42, limeEntrance]);
  limeTree.exits.push(
      [0x00, 0x1b, 0x03, windEntrance],
      [0x00, 0x1c, 0x03, windEntrance]);
};


// Stamp the ROM
export const stampVersionSeedAndHash = (rom, seed, flags) => {
  // Use up to 26 bytes starting at PRG $25ea8
  // Would be nice to store (1) commit, (2) flags, (3) seed, (4) hash
  // We can use base64 encoding to help some...
  // For now just stick in the commit and seed in simple hex
  const crc = crc32(rom);
  const crcString = crc.toString(16).padStart(8, 0).toUpperCase();
  const hash = version.STATUS == 'unstable' ?
      version.HASH.substring(0, 7).padStart(7, 0).toUpperCase() + '     ' :
      version.VERSION.substring(0, 12).padEnd(12, ' ');
  seed = seed.toString(16).padStart(8, 0).toUpperCase();
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

  embed(0x277cf, intercalate('  VERSION     SEED      ',
                             `  ${hash}${seed}`));
  let flagString = String(flags);

  // if (flagString.length > 36) flagString = flagString.replace(/ /g, '');
  let extraFlags;
  if (flagString.length > 46) {
    if (flagString.length > 92) throw new Error('Flag string way too long!');
    extraFlags = flagString.substring(46, 92).padEnd(46, ' ');
    flagString = flagString.substring(0, 46);
  }
  // if (flagString.length <= 36) {
  //   // attempt to break it more favorably
    
  // }
  //   flagString = ['FLAGS ',
  //                 flagString.substring(0, 18).padEnd(18, ' '),
  //                 '      ',
                  
  // }

  flagString = flagString.padEnd(46, ' ');

  embed(0x277ff, intercalate(flagString.substring(0, 23), flagString.substring(23)));
  if (extraFlags) {
    embed(0x2782f, intercalate(extraFlags.substring(0, 23), extraFlags.substring(23)));
  }

  embed(0x27885, intercalate(crcString.substring(0, 4), crcString.substring(4)));

  // embed(0x25ea8, `v.${hash}   ${seed}`);
  embed(0x25716, 'RANDOMIZER');
  if (version.STATUS == 'unstable') embed(0x2573c, 'BETA');
  // NOTE: it would be possible to add the hash/seed/etc to the title
  // page as well, but we'd need to replace the unused letters in bank
  // $1d with the missing numbers (J, Q, W, X), as well as the two
  // weird squares at $5b and $5c that don't appear to be used.  Together
  // with using the letter 'O' as 0, that's sufficient to cram in all the
  // numbers and display arbitrary hex digits.

  return crc;
};


const patchBytes = (rom, address, bytes) => {
  for (let i = 0; i < bytes.length; i++) {
    rom[address + 0x10 + i] = bytes[i];
  }
};

const patchWords = (rom, address, words) => {
  for (let i = 0; i < 2 * words.length; i += 2) {
    rom[address + 0x10 + i] = words[i >>> 1] & 0xff;
    rom[address + 0x11 + i] = words[i >>> 1] >>> 8;
  }
};

// goes with enemy stat recomputations in postshuffle.s
const updateCoinDrops = (rom, flags) => {
  if (flags.disableShopGlitch()) {
    // bigger gold drops if no shop glitch, particularly at the start
    // - starts out fibonacci, then goes linear at 600
    patchWords(rom, 0x34bde, [
        0,   5,  10,  15,  25,  40,  65, 105,
      170, 275, 445, 600, 700, 800, 900,1000,
    ]);
  } else {
    // this table is basically meaningless b/c shop glitch
    patchWords(rom, 0x34bde, [
        0,   1,   2,   4,   8,  16,  30,  50,
      100, 200, 300, 400, 500, 600, 700, 800,
    ]);
  }
};

// goes with enemy stat recomputations in postshuffle.s
const updateDifficultyScalingTables = (rom, flags, asm) => {
  // Currently this is three $30-byte tables, which we start at the beginning
  // of the postshuffle ComputeEnemyStats.
  const diff = new Array(48).fill(0).map((x, i) => i);

  // PAtk = 5 + Diff * 15/32
  // DiffAtk table is 8 * PAtk = round(40 + (Diff * 15 / 4))
  patchBytes(rom, asm.expand('DiffAtk'),
             diff.map(d => Math.round(40 + d * 15 / 4)));

  // NOTE: Old DiffDef table (4 * PDef) was 12 + Diff * 3, but we no longer
  // use this table since nerfing armors.
  // (PDef = 3 + Diff * 3/4)
  // patchBytes(rom, asm.expand('DiffDef'),
  //            diff.map(d => 12 + d * 3));

  // NOTE: This is the armor-nerfed DiffDef table.
  // PDef = 2 + Diff / 2
  // DiffDef table is 4 * PDef = 8 + Diff * 2
  // patchBytes(rom, asm.expand('DiffDef'),
  //            diff.map(d => 8 + d * 2));

  // NOTE: For armor cap at 3 * Lvl, set PDef = Diff
  patchBytes(rom, asm.expand('DiffDef'),
             diff.map(d => d * 4));

  // DiffHP table is PHP = min(255, 48 + round(Diff * 11 / 2))
  const phpStart = flags.decreaseEnemyDamage() ? 16 : 48;
  const phpIncr = flags.decreaseEnemyDamage() ? 6 : 5.5;
  patchBytes(rom, asm.expand('DiffHP'),
             diff.map(d => Math.min(255, phpStart + Math.round(d * phpIncr))));

  // DiffExp table is ExpB = compress(floor(4 * (2 ** ((16 + 9 * Diff) / 32))))
  // where compress maps values > 127 to $80|(x>>4)

  const expFactor = flags.expScalingFactor();
  patchBytes(rom, asm.expand('DiffExp'), diff.map(d => {
    const exp = Math.floor(4 * (2 ** ((16 + 9 * d) / 32)) * expFactor);
    return exp < 0x80 ? exp : Math.min(0xff, 0x80 + (exp >> 4));
  }));

  // // Halve shield and armor defense values
  // patchBytes(rom, 0x34bc0, [
  //   // Armor defense
  //   0, 1, 3, 5, 7, 9, 12, 10, 16,
  //   // Shield defense
  //   0, 1, 3, 4, 6, 9, 8, 12, 16,
  // ]);

  // Adjust shield and armor defense values
  patchBytes(rom, 0x34bc0, [
    // Armor defense
    0, 2, 6, 10, 14, 18, 32, 24, 20,
    // Shield defense
    0, 2, 6, 10, 14, 18, 16, 32, 20,
  ]);
};


const rescaleShops = (rom, asm, random = undefined) => {
  // Populate rescaled prices into the various rom locations.
  // Specifically, we read the available item IDs out of the
  // shop tables and then compute new prices from there.
  // If `random` is passed then the base price to buy each
  // item at any given shop will be adjusted to anywhere from
  // 50% to 150% of the base price.  The pawn shop price is
  // always 50% of the base price.

  const SHOP_COUNT = 11; // 11 of all types of shop for some reason.
  const BASE_PRICE_TABLE = asm.expand('BasePrices');
  const INN_PRICES = asm.expand('InnPrices');

  // TODO - rearrange the tables to defrag the free space a bit.
  // Will need to change the code that reads them, obviously
  // Move the base price table up a byte into the inn prices (which
  // gets us 10 more free bytes as well).  We could defrag the whole
  // thing into $21f9a (though we;d also need to move the location
  // finding refs and the ref to $21f96 in PostInitializeShop
  // This gives a much nicer block that we could maybe use more
  // efficiently

  const TOOLS = {prices: 0x21e54, items: 0x21e28};
  const ARMOR = {prices: 0x21dd0, items: 0x21da4};

  const BASE_INN_PRICE = 20;

  // First fill the scaling tables.
  const diff = new Array(48).fill(0).map((x, i) => i);
  // Tool shops scale as 2 ** (Diff / 10), store in 8ths
  patchBytes(rom, asm.expand('ToolShopScaling'),
             diff.map(d => Math.round(8 * (2 ** (d / 10)))));
  // Armor shops scale as 2 ** ((47 - Diff) / 12), store in 8ths
  patchBytes(rom, asm.expand('ArmorShopScaling'),
             diff.map(d => Math.round(8 * (2 ** ((47 - d) / 12)))));

  // Set the price multipliers for each item in shops.
  for (const {prices, items} of [TOOLS, ARMOR]) {
    for (let i = 0; i < 4 * SHOP_COUNT; i++) {
      const invalid = !BASE_PRICES[rom[items + i + 0x10]];
      rom[prices + i + 0x10] = invalid ? 0 : random ? random.nextInt(32) + 17 : 32;
    }
  }

  // Set the inn prices, with a slightly wider variance [.375, 1.625)
  for (let i = 0; i < SHOP_COUNT; i++) {
    rom[INN_PRICES + i + 0x10] = random ? random.nextInt(40) + 13 : 32;
  }

  // Set the pawn shop base prices.
  const setBasePrice = (id, price) => {
    rom[BASE_PRICE_TABLE + 2 * (id - 0x0d) + 0x10] = price & 0xff;
    rom[BASE_PRICE_TABLE + 2 * (id - 0x0d) + 0x11] = price >>> 8;
  }
  for (let i = 0x0d; i < 0x27; i++) {
    setBasePrice(i, BASE_PRICES[i]);
  }
  setBasePrice(0x27, BASE_INN_PRICE);
  // TODO - separate flag for rescaling monsters???
};

// Map of base prices.  (Tools are positive, armors are ones-complement.)
const BASE_PRICES = {
  // Armors
  0x0d: 4,    // carapace shield
  0x0e: 16,   // bronze shield
  0x0f: 50,   // platinum shield
  0x10: 325,  // mirrored shield
  0x11: 1000, // ceramic shield
  0x12: 2000, // sacred shield
  0x13: 4000, // battle shield
  0x15: 6,    // tanned hide
  0x16: 20,   // leather armor
  0x17: 75,   // bronze armor
  0x18: 250,  // platinum armor
  0x19: 1000, // soldier suit
  0x1a: 4800, // ceramic suit
  // Tools
  0x1d: 25,   // medical herb
  0x1e: 30,   // antidote
  0x1f: 45,   // lysis plant
  0x20: 40,   // fruit of lime
  0x21: 36,   // fruit of power
  0x22: 200,  // magic ring
  0x23: 150,  // fruit of repun
  0x24: 80,   // warp boots
  0x26: 300,  // opel statue
  //0x31: 50, // alarm flute
};






const rescaleMonsters = (data, rom) => {

  // TODO - find anything sharing the same memory and update them as well
  for (const id of SCALED_MONSTERS.keys()) {
    for (const other in rom.objects) {
      if (SCALED_MONSTERS.has(other)) return;
      if (rom.objects[id].objectDataBase == rom.objects[other].objectDataBase) {
        SCALED_MONSTERS[other] = SCALED_MONSTERS[id];
      }
    }
  }

  for (const [id, {sdef, swrd, hits, satk, dgld, sexp}] of SCALED_MONSTERS) {
    // indicate that this object needs scaling
    const o = rom.objects[id].objectData;
    const boss =
        [0x57, 0x5e, 0x68, 0x7d, 0x88, 0x97, 0x9b, 0x9e].includes(id) ? 1 : 0;
    o[2] |= 0x80; // recoil
    o[6] = hits; // HP
    o[7] = satk;  // ATK
    // Sword: 0..3 (wind - thunder) preserved, 4 (crystalis) => 7
    o[8] = sdef | swrd << 4; // DEF
    o[9] = o[9] & 0xe0 | boss;
    o[16] = o[16] & 0x0f | dgld << 4; // GLD
    o[17] = sexp; // EXP
  }

  // Fix Sabera 1's elemental defense to no longer allow thunder
  rom.objects[0x7d].objectData[0x10] |= 0x08;

  //rom.writeObjectData();
};

const shuffleMonsters = (data, rom, random, log) => {
  // TODO: once we have location names, compile a spoiler of shuffled monsters
  const pool = new MonsterPool({});
  for (const loc of rom.locations) {
    if (loc) pool.populate(loc);
  }
  pool.shuffle(random);
};

const identifyKeyItemsForDifficultyBuffs = (rom) => {
  // Tag key items for difficulty buffs
  for (const get of rom.itemGets) {
    const item = ITEMS.get(get.item);
    if (!item || !item.key) continue;
    if (!get.table) throw new Error(`No table for ${item.name}`);
    if (get.table[get.table.length - 1] == 0xff) {
      get.table[get.table.length - 1] = 0xfe;
    } else {
      throw new Error(`Expected FF at end of ItemGet table: ${get.id.toString(16)}: ${Array.from(get.table).map(x => x.toString(16).padStart(2, 0)).join(' ')}`);
    }
    get.write(rom);
  }
  // console.log(report);
};


const SCALED_MONSTERS = new Map([
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x3f, 'p', 'Sorceror shot',              ,   ,   ,    19,  ,    ,],
  [0x4b, 'm', 'wraith??',                   2,  ,   2,   22,  4,   61],
  [0x4f, 'm', 'wraith',                     1,  ,   2,   20,  4,   61],
  [0x50, 'm', 'Blue Slime',                 ,   ,   1,   16,  2,   32],
  [0x51, 'm', 'Weretiger',                  ,   ,   1,   21,  4,   40],
  [0x52, 'm', 'Green Jelly',                4,  ,   3,   16,  4,   36],
  [0x53, 'm', 'Red Slime',                  6,  ,   4,   16,  4,   48],
  [0x54, 'm', 'Rock Golem',                 6,  ,   11,  24,  6,   85],
  [0x55, 'm', 'Blue Bat',                   ,   ,   ,    4,   ,    32],
  [0x56, 'm', 'Green Wyvern',               4,  ,   4,   24,  6,   52],
  [0x57, 'b', 'Vampire',                    3,  ,   12,  18,  ,    ,],
  [0x58, 'm', 'Orc',                        3,  ,   4,   21,  4,   57],
  [0x59, 'm', 'Red Flying Swamp Insect',    3,  ,   1,   21,  4,   57],
  [0x5a, 'm', 'Blue Mushroom',              2,  ,   1,   21,  4,   44],
  [0x5b, 'm', 'Swamp Tomato',               3,  ,   2,   35,  4,   52],
  [0x5c, 'm', 'Flying Meadow Insect',       3,  ,   3,   23,  4,   81],
  [0x5d, 'm', 'Swamp Plant',                ,   ,   ,    ,    ,    36],
  [0x5e, 'b', 'Insect',                     ,   1,  8,   6,   ,    ,],
  [0x5f, 'm', 'Large Blue Slime',           5,  ,   3,   20,  4,   52],
  [0x60, 'm', 'Ice Zombie',                 5,  ,   7,   14,  4,   57],
  [0x61, 'm', 'Green Living Rock',          ,   ,   1,   9,   4,   28],
  [0x62, 'm', 'Green Spider',               4,  ,   4,   22,  4,   44],
  [0x63, 'm', 'Red/Purple Wyvern',          3,  ,   4,   30,  4,   65],
  [0x64, 'm', 'Draygonia Soldier',          6,  ,   11,  36,  4,   89],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x65, 'm', 'Ice Entity',                 3,  ,   2,   24,  4,   52],
  [0x66, 'm', 'Red Living Rock',            ,   ,   1,   13,  4,   40],
  [0x67, 'm', 'Ice Golem',                  7,  2,  11,  28,  4,   81],
  [0x68, 'b', 'Kelbesque',                  4,  6,  12,  29,  ,    ,],
  [0x69, 'm', 'Giant Red Slime',            7,  ,   40,  90,  4,   102],
  [0x6a, 'm', 'Troll',                      2,  ,   3,   24,  4,   65],
  [0x6b, 'm', 'Red Jelly',                  2,  ,   2,   14,  4,   44],
  [0x6c, 'm', 'Medusa',                     3,  ,   4,   36,  8,   77],
  [0x6d, 'm', 'Red Crab',                   2,  ,   1,   21,  4,   44],
  [0x6e, 'm', 'Medusa Head',                ,   ,   1,   29,  4,   36],
  [0x6f, 'm', 'Evil Bird',                  ,   ,   2,   30,  6,   65],
  [0x71, 'm', 'Red/Purple Mushroom',        3,  ,   5,   19,  6,   69],
  [0x72, 'm', 'Violet Earth Entity',        3,  ,   3,   18,  6,   61],
  [0x73, 'm', 'Mimic',                      ,   ,   3,   26,  15,  73],
  [0x74, 'm', 'Red Spider',                 3,  ,   4,   22,  6,   48],
  [0x75, 'm', 'Fishman',                    4,  ,   6,   19,  5,   61],
  [0x76, 'm', 'Jellyfish',                  ,   ,   3,   14,  3,   48],
  [0x77, 'm', 'Kraken',                     5,  ,   11,  25,  7,   73],
  [0x78, 'm', 'Dark Green Wyvern',          4,  ,   5,   21,  5,   61],
  [0x79, 'm', 'Sand Monster',               5,  ,   8,   6,   4,   57],
  [0x7b, 'm', 'Wraith Shadow 1',            ,   ,   ,    9,   7,   44],
  [0x7c, 'm', 'Killer Moth',                ,   ,   2,   35,  ,    77],
  [0x7d, 'b', 'Sabera',                     3,  7,  13,  24,  ,    ,],
  [0x80, 'm', 'Draygonia Archer',           1,  ,   3,   20,  6,   61],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x81, 'm', 'Evil Bomber Bird',           ,   ,   1,   19,  4,   65],
  [0x82, 'm', 'Lavaman/blob',               3,  ,   3,   24,  6,   85],
  [0x84, 'm', 'Lizardman (w/ flail(',       2,  ,   3,   30,  6,   81],
  [0x85, 'm', 'Giant Eye',                  3,  ,   5,   33,  4,   81],
  [0x86, 'm', 'Salamander',                 2,  ,   4,   29,  8,   77],
  [0x87, 'm', 'Sorceror',                   2,  ,   5,   31,  6,   65],
  [0x88, 'b', 'Mado',                       4,  8,  10,  30,  ,    ,],
  [0x89, 'm', 'Draygonia Knight',           2,  ,   3,   24,  4,   77],
  [0x8a, 'm', 'Devil',                      ,   ,   1,   18,  4,   52],
  [0x8b, 'b', 'Kelbesque 2',                4,  6,  11,  27,  ,    ,],
  [0x8c, 'm', 'Wraith Shadow 2',            ,   ,   ,    17,  4,   48],
  [0x90, 'b', 'Sabera 2',                   5,  7,  21,  27,  ,    ,],
  [0x91, 'm', 'Tarantula',                  3,  ,   3,   21,  6,   73],
  [0x92, 'm', 'Skeleton',                   ,   ,   4,   30,  6,   69],
  [0x93, 'b', 'Mado 2',                     4,  8,  11,  25,  ,    ,],
  [0x94, 'm', 'Purple Giant Eye',           4,  ,   10,  23,  6,   102],
  [0x95, 'm', 'Black Knight (w/ flail)',    3,  ,   7,   26,  6,   89],
  [0x96, 'm', 'Scorpion',                   3,  ,   5,   29,  2,   73],
  [0x97, 'b', 'Karmine',                    4,  ,   14,  26,  ,    ,],
  [0x98, 'm', 'Sandman/blob',               3,  ,   5,   36,  6,   98],
  [0x99, 'm', 'Mummy',                      5,  ,   19,  36,  6,   110],
  [0x9a, 'm', 'Tomb Guardian',              7,  ,   60,  37,  6,   106],
  [0x9b, 'b', 'Draygon',                    5,  6,  16,  41,  ,    ,],
  [0x9e, 'b', 'Draygon 2',                  7,  6,  28,  40,  ,    ,],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0xa0, 'm', 'Ground Sentry (1)',          4,  ,   12,  26,  ,    /*73*/],
  [0xa1, 'm', 'Tower Defense Mech (2)',     5,  ,   16,  36,  ,    /*85*/],
  [0xa2, 'm', 'Tower Sentinel',             ,   ,   2,   ,    ,    /*32*/],
  [0xa3, 'm', 'Air Sentry',                 3,  ,   4,   26,  ,    /*65*/],
  // [0xa4, 'b', 'Dyna',                       6,  5,  16,  ,    ,    ,],
  [0xa5, 'b', 'Vampire 2',                  3,  ,   12,  27,  ,    ,],
  // [0xb4, 'b', 'dyna pod',                   15, ,   255, 26,  ,    ,],
  // [0xb8, 'p', 'dyna counter',               ,   ,   ,    26,  ,    ,],
  // [0xb9, 'p', 'dyna laser',                 ,   ,   ,    26,  ,    ,],
  // [0xba, 'p', 'dyna bubble',                ,   ,   ,    36,  ,    ,],
  [0xa4, 'b', 'Dyna',                       6,  5,  32,  ,    ,    ,],
  [0xb4, 'b', 'dyna pod',                   6,  5,  48,  26,  ,    ,],
  [0xb8, 'p', 'dyna counter',              15,  ,   ,    42,  ,    ,],
  [0xb9, 'p', 'dyna laser',                15,  ,   ,    42,  ,    ,],
  [0xba, 'p', 'dyna bubble',                ,   ,   ,    36,  ,    ,],
  //
  [0xbc, 'm', 'vamp2 bat',                  ,   ,   ,    16,  ,    15],
  [0xbf, 'p', 'draygon2 fireball',          ,   ,   ,    26,  ,    ,],
  [0xc1, 'm', 'vamp1 bat',                  ,   ,   ,    16,  ,    15],
  [0xc3, 'p', 'giant insect spit',          ,   ,   ,    35,  ,    ,],
  [0xc4, 'm', 'summoned insect',            4,  ,   2,   42,  ,    98],
  [0xc5, 'p', 'kelby1 rock',                ,   ,   ,    22,  ,    ,],
  [0xc6, 'p', 'sabera1 balls',              ,   ,   ,    19,  ,    ,],
  [0xc7, 'p', 'kelby2 fireballs',           ,   ,   ,    11,  ,    ,],
  [0xc8, 'p', 'sabera2 fire',               ,   ,   1,   6,   ,    ,],
  [0xc9, 'p', 'sabera2 balls',              ,   ,   ,    17,  ,    ,],
  [0xca, 'p', 'karmine balls',              ,   ,   ,    25,  ,    ,],
  [0xcb, 'p', 'sun/moon statue fireballs',  ,   ,   ,    39,  ,    ,],
  [0xcc, 'p', 'draygon1 lightning',         ,   ,   ,    37,  ,    ,],
  [0xcd, 'p', 'draygon2 laser',             ,   ,   ,    36,  ,    ,],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0xce, 'p', 'draygon2 breath',            ,   ,   ,    36,  ,    ,],
  [0xe0, 'p', 'evil bomber bird bomb',      ,   ,   ,    2,   ,    ,],
  [0xe2, 'p', 'summoned insect bomb',       ,   ,   ,    47,  ,    ,],
  [0xe3, 'p', 'paralysis beam',             ,   ,   ,    23,  ,    ,],
  [0xe4, 'p', 'stone gaze',                 ,   ,   ,    33,  ,    ,],
  [0xe5, 'p', 'rock golem rock',            ,   ,   ,    24,  ,    ,],
  [0xe6, 'p', 'curse beam',                 ,   ,   ,    10,  ,    ,],
  [0xe7, 'p', 'mp drain web',               ,   ,   ,    11,  ,    ,],
  [0xe8, 'p', 'fishman trident',            ,   ,   ,    15,  ,    ,],
  [0xe9, 'p', 'orc axe',                    ,   ,   ,    24,  ,    ,],
  [0xea, 'p', 'Swamp Pollen',               ,   ,   ,    37,  ,    ,],
  [0xeb, 'p', 'paralysis powder',           ,   ,   ,    17,  ,    ,],
  [0xec, 'p', 'draygonia solider sword',    ,   ,   ,    28,  ,    ,],
  [0xed, 'p', 'ice golem rock',             ,   ,   ,    20,  ,    ,],
  [0xee, 'p', 'troll axe',                  ,   ,   ,    27,  ,    ,],
  [0xef, 'p', 'kraken ink',                 ,   ,   ,    24,  ,    ,],
  [0xf0, 'p', 'draygonia archer arrow',     ,   ,   ,    12,  ,    ,],
  [0xf1, 'p', '??? unused',                 ,   ,   ,    16,  ,    ,],
  [0xf2, 'p', 'draygonia knight sword',     ,   ,   ,    9,   ,    ,],
  [0xf3, 'p', 'moth residue',               ,   ,   ,    19,  ,    ,],
  [0xf4, 'p', 'ground sentry laser',        ,   ,   ,    13,  ,    ,],
  [0xf5, 'p', 'tower defense mech laser',   ,   ,   ,    23,  ,    ,],
  [0xf6, 'p', 'tower sentinel laser',       ,   ,   ,    8,   ,    ,],
  [0xf7, 'p', 'skeleton shot',              ,   ,   ,    11,  ,    ,],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0xf8, 'p', 'lavaman shot',               ,   ,   ,    14,  ,    ,],
  [0xf9, 'p', 'black knight flail',         ,   ,   ,    18,  ,    ,],
  [0xfa, 'p', 'lizardman flail',            ,   ,   ,    21,  ,    ,],
  [0xfc, 'p', 'mado shuriken',              ,   ,   ,    36,  ,    ,],
  [0xfd, 'p', 'guardian statue missile',    ,   ,   ,    23,  ,    ,],
  [0xfe, 'p', 'demon wall fire',            ,   ,   ,    23,  ,    ,],
].map(([id, type, name, sdef=0, swrd=0, hits=0, satk=0, dgld=0, sexp=0]) =>
      [id, {id, type, name, sdef, swrd, hits, satk, dgld, sexp}]));

// When dealing with constraints, it's basically ksat
//  - we have a list of requirements that are ANDed together
//  - each is a list of predicates that are ORed together
//  - each predicate has a continuation for when it's picked
//  - need a way to thin the crowd, efficiently check compat, etc
// Predicate is a four-element array [pat0,pat1,pal2,pal3]
// Rather than a continuation we could go through all the slots again


// class Constraints {
//   constructor() {
//     // Array of pattern table options.  Null indicates that it can be anything.
//     // 
//     this.patterns = [[null, null]];
//     this.palettes = [[null, null]];
//     this.flyers = 0;
//   }

//   requireTreasureChest() {
//     this.requireOrderedSlot(0, TREASURE_CHEST_BANKS);
//   }

//   requireOrderedSlot(slot, set) {
    
//     if (!this.ordered) {

//     }
// // TODO
//     this.pat0 = intersect(this.pat0, set);


//   }

  

// }

// const intersect = (left, right) => {
//   if (!right) throw new Error('right must be nontrivial');
//   if (!left) return right;
//   const out = new Set();
//   for (const x of left) {
//     if (right.has(x)) out.add(x);
//   }
//   return out;  
// }


// A pool of monster spawns, built up from the locations in the rom.
// Passes through the locations twice, first to build and then to 
// reassign monsters.
class MonsterPool {
  constructor(report) {
    this.report = report;
    // available monsters
    this.monsters = [];
    // used monsters - as a backup if no available monsters fit
    this.used = [];
    // all locations
    this.locations = [];
  }

  // TODO - monsters w/ projectiles may have a specific bank they need to appear in,
  // since the projectile doesn't know where it came from...?
  //   - for now, just assume if it has a child then it must keep same pattern bank!

  populate(/** !Location */ location) {
    const {maxFlyers, nonFlyers = {}, skip, fixedSlots = {}, ...unexpected} =
          MONSTER_ADJUSTMENTS[location.id] || {};
    for (const u in unexpected) {
      throw new Error(
          `Unexpected property '${u}' in MONSTER_ADJUSTMENTS[${location.id}]`);
    }
    if (skip === true || !location.spritePatterns || !location.spritePalettes) return;
    const monsters = [];
    const slots = [];
    //const constraints = {};
    let treasureChest = false;
    let slot = 0x0c;
    for (const o of location.objects || []) {
      ++slot;
      if (o[2] & 7) continue;
      const id = o[3] + 0x50;
      if (id in UNTOUCHED_MONSTERS || !SCALED_MONSTERS.has(id) ||
          SCALED_MONSTERS.get(id).type != 'm') continue;
      const object = location.rom.objects[id];
      if (!object) continue;
      const patBank = o[2] & 0x80 ? 1 : 0;
      const pat = location.spritePatterns[patBank];
      const pal = object.palettes(true);
      const pal2 = pal.includes(2) ? location.spritePalettes[0] : null;
      const pal3 = pal.includes(3) ? location.spritePalettes[1] : null;
      monsters.push({id, pat, pal2, pal3, patBank});
(this.report[`start-${id.toString(16)}`] = this.report[`start-${id.toString(16)}`] || []).push('$' + location.id.toString(16));
      slots.push(slot);
    }
    if (!monsters.length) return;
    if (!skip) this.locations.push({location, slots});
    this.monsters.push(...monsters);
  }

  shuffle(random) {
this.report['pre-shuffle locations'] = this.locations.map(l=>l.location.id);
this.report['pre-shuffle monsters'] = this.monsters.map(m=>m.id);
    random.shuffle(this.locations);
    random.shuffle(this.monsters);
this.report['post-shuffle locations'] = this.locations.map(l=>l.location.id);
this.report['post-shuffle monsters'] = this.monsters.map(m=>m.id);
    while (this.locations.length) {
      const {location, slots} = this.locations.pop();
      let report = this.report['$' + location.id.toString(16).padStart(2, 0)] = [];
      const {maxFlyers, nonFlyers = {}, fixedSlots = {}} =
            MONSTER_ADJUSTMENTS[location.id] || {};
      // Keep track of pattern and palette slots we've pinned.
      // It might be nice to have a mode where palette conflicts are allowed,
      // and we just go with one or the other, though this could lead to poisonous
      // blue slimes and non-poisonous red slimes by accident.
      let pat0 = fixedSlots.pat0 || null;
      let pat1 = fixedSlots.pat1 || null;
      let pal2 = fixedSlots.pal2 || null;
      let pal3 = fixedSlots.pal3 || null;
      let flyers = maxFlyers; // count down...

      // Determine location constraints
      let treasureChest = false;
      for (const o of location.objects || []) {
        if ((o[2] & 7) == 2) treasureChest = true;
        if (o[2] & 7) continue;
        const id = o[3] + 0x50;
        if (id == 0x7e || id == 0x7f || id == 0x9f) {
          pat1 = 0x62;
        } else if (id == 0x8f) {
          pat0 = 0x61;
        }
      }
      // Cordel East and Kirisa Meadow have chests but don't need to actually draw them
      // (though we may need to make sure it doesn't end up with some nonsense tile that
      // ends up above the background).
      if (location.id == 0x15 || location.id == 0x47) treasureChest = false;

      report.push(`Initial pass: ${[treasureChest, pat0, pat1, pal2, pal3].join(', ')}`);

      const tryAddMonster = (m) => {
        const flyer = FLYERS.has(m.id);
        const moth = MOTHS_AND_BATS.has(m.id);
        if (flyer) {
          // TODO - add a small probability of adding it anyway, maybe
          // based on the map area?  25 seems a good threshold.
          if (!flyers) return false;
          --flyers;
        }
        if (pal2 != null && m.pal2 != null && pal2 != m.pal2 ||
            pal3 != null && m.pal3 != null && pal3 != m.pal3) {
          return false;
        }
        // whether we can put this one in pat0
        const pat0ok = !treasureChest || TREASURE_CHEST_BANKS.has(m.pat);
        let patSlot;
        if (location.rom.objects[m.id].child || RETAIN_SLOTS.has(m.id)) {
          // if there's a child, make sure to keep it in the same pattern slot
          patSlot = m.patSlot ? 0x80 : 0;
          const prev = patSlot ? pat1 : pat0;
          if (prev != null && prev != m.pat) return false;
          if (patSlot) {
            pat1 = m.pat;
          } else if (pat0ok) {
            pat0 = m.pat;
          } else {
            return false;
          }

          // TODO - if [pat0,pat1] were an array this would be a whole lot easier.
report.push(`  Adding ${m.id.toString(16)}: pat(${patSlot}) <-  ${m.pat.toString(16)}`);
        } else {
          if (pat0 == null && pat0ok || pat0 == m.pat) {
            pat0 = m.pat;
            patSlot = 0;
report.push(`  Adding ${m.id.toString(16)}: pat0 <-  ${m.pat.toString(16)}`);
          } else if (pat1 == null || pat1 == m.pat) {
            pat1 = m.pat;
            patSlot = 0x80;
report.push(`  Adding ${m.id.toString(16)}: pat1 <-  ${m.pat.toString(16)}`);
          } else {              
            return false;
          }
        }
        if (m.pal2 != null) pal2 = m.pal2;
        if (m.pal3 != null) pal3 = m.pal3;
report.push(`    ${Object.keys(m).map(k=>`${k}: ${m[k]}`).join(', ')}`);
report.push(`    pal: ${(m.pal2||0).toString(16)} ${(m.pal3||0).toString(16)}`);

        // Pick the slot only after we know for sure that it will fit.
        let eligible = 0;
        if (flyer || moth) {
          // look for a flyer slot if possible.
          for (let i = 0; i < slots.length; i++) {
            if (slots[i] in nonFlyers) {
              eligible = i;
              break;
            }
          }
        } else {
          // Prefer non-flyer slots, but adjust if we get a flyer.
          for (let i = 0; i < slots.length; i++) {
            if (slots[i] in nonFlyers) continue;
            eligible = i;
            break;
          }
        }
(this.report[`mon-${m.id.toString(16)}`] = this.report[`mon-${m.id.toString(16)}`] || []).push('$' + location.id.toString(16));
        const slot = slots[eligible];
        const objData = location.objects[slot - 0x0d];
        if (slot in nonFlyers) {
          objData[0] += nonFlyers[slot][0];
          objData[1] += nonFlyers[slot][1];
        }
        objData[2] = objData[2] & 0x7f | patSlot;
        objData[3] = m.id - 0x50;
report.push(`    slot ${slot.toString(16)}: objData=${objData}`);

        // TODO - anything else need splicing?

        slots.splice(eligible, 1);
        return true;
      };



      if (flyers) {
        // look for an eligible flyer in the first 40.  If it's there, add it first.
        for (let i = 0; i < Math.min(40, this.monsters.length); i++) {
          if (FLYERS.has(this.monsters[i].id)) {
            if (tryAddMonster(this.monsters[i])) {
              this.monsters.splice(i, 1);
            }
          }
          random.shuffle(this.monsters);
        }

        // maybe added a single flyer, to make sure we don't run out.  Now just work normally

        // decide if we're going to add any flyers.

        // also consider allowing a single random flyer to be added out of band if
        // the size of the map exceeds 25?


        // probably don't add flyers to used?


      }

      // iterate over monsters until we find one that's allowed...
      // NOTE: fill the non-flyer slots first (except if we pick a flyer??)
      //   - may need to weight flyers slightly higher or fill them differently?
      //     otherwise we'll likely not get them when we're allowed...?
      //   - or just do the non-flyer *locations* first?
      // - or just fill up flyers until we run out... 100% chance of first flyer,
      //   50% chance of getting a second flyer if allowed...
      for (let i = 0; i < this.monsters.length; i++) {
        if (!slots.length) break;
        if (tryAddMonster(this.monsters[i])) {
          const [used] = this.monsters.splice(i, 1);
          if (!FLYERS.has(used.id)) this.used.push(used);
          i--;
        }
      }

      // backup list
      for (let i = 0; i < this.used.length; i++) {
        if (!slots.length) break;
        if (tryAddMonster(this.used[i])) {
          this.used.push(...this.used.splice(i, 1));
          i--;
        }
      }
      if (pat0 != null) location.spritePatterns[0] = pat0;
      if (pat1 != null) location.spritePatterns[1] = pat1;
      if (pal2 != null) location.spritePalettes[0] = pal2;
      if (pal3 != null) location.spritePalettes[1] = pal3;

      if (slots.length) {
        report.push(`Failed to fill location ${location.id.toString(16)}: ${slots.length} remaining`);
        for (const slot of slots) {
          const objData = location.objects[slot - 0x0d];
          objData[0] = objData[1] = 0;
        }
      }
    }
  }
}

const FLYERS = new Set([0x59, 0x5c, 0x6e, 0x6f, 0x81, 0x8a, 0xa3, 0xc4]);
const MOTHS_AND_BATS = new Set([0x55, /* swamp plant */ 0x5d, 0x7c, 0xbc, 0xc1]);
const SWIMMERS = new Set([0x75, 0x76]);
const STATIONARY = new Set([0x77, 0x87]);  // kraken, sorceror

// constrains pat0 if map has a treasure chest on it
const TREASURE_CHEST_BANKS = new Set([
  0x5e, 0x5f, 0x60, 0x61, 0x64, 0x65, 0x66, 0x67,
  0x68, 0x69, 0x6a, 0x6c, 0x6d, 0x6e, 0x6f, 0x70,
  0x74, 0x75, 0x76, 0x77,
]);

const MONSTER_ADJUSTMENTS = {
  [0x03]: { // Valley of Wind
    maxFlyers: 2,
    fixedSlots: {
      pat1: 0x60, // required by windmill
    },
  },
  [0x07]: { // Sealed Cave 4
    nonFlyers: {
      [0x0f]: [0, -3],  // bat
      [0x10]: [-10, 0], // bat
      [0x11]: [0, 4],   // bat
    },
  },
  [0x14]: { // Cordel West
    maxFlyers: 2,
  },
  [0x15]: { // Cordel East
    maxFlyers: 2,
  },
  [0x1a]: { // Swamp
    //skip: 'add',
    maxFlyers: 2,
    fixedSlots: {
      pat1: 0x4f,
      pal3: 0x23,
    },
    nonFlyers: { // TODO - might be nice to keep puffs working?
      [0x10]: [4, 0],
      [0x11]: [5, 0],
      [0x12]: [4, 0],
      [0x13]: [5, 0],
      [0x14]: [4, 0],
      [0x15]: [4, 0],
    },
  },
  [0x1b]: { // Amazones
    // Random blue slime should be ignored
    skip: true,
  },
  [0x20]: { // Mt Sabre West Lower
    maxFlyers: 1,
  },
  [0x21]: { // Mt Sabre West Upper
    maxFlyers: 1,
    fixedSlots: {
      pat1: 0x50,
      //pal2: 0x06, // might be fine to change tornel's color...
    },
  },
  [0x27]: { // Mt Sabre West Cave 7
    nonFlyers: {
      [0x0d]: [0, 0x10], // random enemy stuck in wall
    },
  },
  [0x28]: { // Mt Sabre North Main
    maxFlyers: 1,
  },
  [0x29]: { // Mt Sabre North Middle
    maxFlyers: 1,
  },
  [0x2b]: { // Mt Sabre North Cave 2
    nonFlyers: {
      [0x14]: [0x20, -8], // bat
    },
  },
  [0x40]: { // Waterfall Valley North
    maxFlyers: 2,
    nonFlyers: {
      [0x13]: [12, -0x10], // medusa head
    },
  },
  [0x41]: { // Waterfall Valley South
    maxFlyers: 2,
    nonFlyers: {
      [0x15]: [0, -6], // medusa head
    },
  },
  [0x42]: { // Lime Tree Valley
    maxFlyers: 2,
    nonFlyers: {
      [0x0d]: [0, 8], // evil bird
      [0x0e]: [-8, 8], // evil bird
    },
  },
  [0x47]: { // Kirisa Meadow
    maxFlyers: 1,
    nonFlyers: {
      [0x0d]: [-8, -8],
    },
  },
  [0x4a]: { // Fog Lamp Cave 3
    maxFlyers: 1,
    nonFlyers: {
      [0x0e]: [4, 0],  // bat
      [0x0f]: [0, -3], // bat
      [0x10]: [0, 4],  // bat
    },
  },
  [0x4c]: { // Fog Lamp Cave 4
    // maxFlyers: 1,
  },
  [0x4d]: { // Fog Lamp Cave 5
    maxFlyers: 1,
  },
  [0x4e]: { // Fog Lamp Cave 6
    maxFlyers: 1,
  },
  [0x4f]: { // Fog Lamp Cave 7
    // maxFlyers: 1,
  },
  [0x57]: { // Waterfall Cave 4
    fixedSlots: {
      pat1: 0x4d,
    },
  },
  [0x59]: { // Tower Floor 1
    skip: true,
  },
  [0x5a]: { // Tower Floor 2
    skip: true,
  },
  [0x5b]: { // Tower Floor 3
    skip: true,
  },
  [0x60]: { // Angry Sea
    skip: true, // not sure how to randomize these well
    maxFlyers: 2,
    fixedSlots: {
      pat1: 0x52, // (as opposed to pat0)
      pal3: 0x08,
    },
  },
  [0x64]: { // Underground Channel
    skip: true,
    fixedSlots: {
      pat1: 0x52, // (as opposed to pat0)
      pal3: 0x08,
    },
  },
  [0x68]: { // Evil Spirit Island 1
    skip: true,
    fixedSlots: {
      pat1: 0x52, // (as opposed to pat0)
      pal3: 0x08,
    },
  },
  [0x69]: { // Evil Spirit Island 2
    maxFlyers: 1,
    nonFlyers: {
      [0x17]: [4, 6],  // medusa head
    },
  },
  [0x6a]: { // Evil Spirit Island 3
    maxFlyers: 1,
    nonFlyers: {
      [0x15]: [0, 0x18],  // medusa head
    },
  },
  [0x6c]: { // Sabera Palace 1
    maxFlyers: 1,
    nonFlyers: {
      [0x17]: [0, 0x18], // evil bird
    },
  },
  [0x6d]: { // Sabera Palace 2
    maxFlyers: 1,
    nonFlyers: {
      [0x11]: [0x10, 0], // moth
      [0x1b]: [0, 0],    // moth - ok already
      [0x1c]: [6, 0],    // moth
    },
  },
  [0x78]: { // Goa Valley
    maxFlyers: 1,
    nonFlyers: {
      [0x16]: [-8, -8], // evil bird
    },
  },
  [0x7c]: { // Mt Hydra
    maxFlyers: 1,
    nonFlyers: {
      [0x15]: [-0x27, 0x54], // evil bird
    },
  },
  [0x84]: { // Mt Hydra Cave 7
    nonFlyers: {
      [0x12]: [0, -4],
      [0x13]: [0, 4],
      [0x14]: [-6, 0],
      [0x15]: [14, 12],
    },
  },
  [0x88]: { // Styx 1
    maxFlyers: 1,
  },
  [0x89]: { // Styx 2
    maxFlyers: 1,
  },
  [0x8a]: { // Styx 1
    maxFlyers: 1,
    nonFlyers: {
      [0x0d]: [7, 0], // moth
      [0x0e]: [0, 0], // moth - ok
      [0x0f]: [7, 3], // moth
      [0x10]: [0, 6], // moth
      [0x11]: [11, -0x10], // moth
    },
  },
  [0x8f]: { // Goa Fortress - Oasis Cave Entrance
    skip: true,
  },
  [0x90]: { // Desert 1
    maxFlyers: 2,
    nonFlyers: {
      [0x14]: [-0xb, -3], // bomber bird
      [0x15]: [0, 0x10],  // bomber bird
    },
  },
  [0x91]: { // Oasis Cave
    maxFlyers: 2,
    nonFlyers: {
      [0x18]: [0, 14],    // insect
      [0x19]: [4, -0x10], // insect
    },
  },
  [0x98]: { // Desert 2
    maxFlyers: 2,
    nonFlyers: {
      [0x14]: [-6, 6],    // devil
      [0x15]: [0, -0x10], // devil
    },
  },
  [0x9e]: { // Pyramid Front - Main
    maxFlyers: 2,
  },
  [0xa2]: { // Pyramid Back - Branch
    maxFlyers: 1,
    nonFlyers: {
      [0x12]: [0, 11], // moth
      [0x13]: [6, 0],  // moth
    },
  },
  [0xa5]: { // Pyramid Back - Hall 2
    nonFlyers: {
      [0x17]: [6, 6],   // moth
      [0x18]: [-6, 0],  // moth
      [0x19]: [-1, -7], // moth
    },
  },
  [0xa6]: { // Draygon 2
    // Has a few blue slimes that aren't real and should be ignored.
    skip: true,
  },
  [0xa8]: { // Goa Fortress - Entrance
    skip: true,
  },
  [0xa9]: { // Goa Fortress - Kelbesque
    maxFlyers: 2,
    nonFlyers: {
      [0x16]: [0x1a, -0x10], // devil
      [0x17]: [0, 0x20],     // devil
    },
  },
  [0xab]: { // Goa Fortress - Sabera
    maxFlyers: 2,
    nonFlyers: {
      [0x0d]: [1, 0],  // insect
      [0x0e]: [2, -2], // insect
    },
  },

  [0xad]: { // Goa Fortress - Mado 1
    maxFlyers: 2,
    nonFlyers: {
      [0x18]: [0, 8],  // devil
      [0x19]: [0, -8], // devil
    },
  },
  [0xaf]: { // Goa Fortress - Mado 3
    nonFlyers: {
      [0x0d]: [0, 0],  // moth - ok
      [0x0e]: [0, 0],  // broken - but replace?
      [0x13]: [0x3b, -0x26], // shadow - embedded in wall
      // TODO - 0x0e glitched, don't randomize
    },
  },
  [0xb4]: { // Goa Fortress - Karmine 5
    maxFlyers: 2,
    nonFlyers: {
      [0x11]: [6, 0],  // moth
      [0x12]: [0, 6],  // moth
    },
  },
  [0xd7]: { // Portoa Palace - Entry
    // There's a random slime in this room that would cause glitches
    skip: true,
  },
};

const ITEMS = new Map([
  // id  name                  key
  [0x00, 'Sword of Wind',      true],
  [0x01, 'Sword of Fire',      true],
  [0x02, 'Sword of Water',     true],
  [0x03, 'Sword of Thunder',   true],
  [0x04, 'Crystalis',          true],
  [0x05, 'Ball of Wind',       true],
  [0x06, 'Tornado Bracelet',   true],
  [0x07, 'Ball of Fire',       true],
  [0x08, 'Flame Bracelet',     true],
  [0x09, 'Ball of Water',      true],
  [0x0a, 'Blizzard Bracelet',  true],
  [0x0b, 'Ball of Thunder',    true],
  [0x0c, 'Storm Bracelet',     true],
  [0x0d, 'Carapace Shield',    ],
  [0x0e, 'Bronze Shield',      ],
  [0x0f, 'Platinum Shield',    ],
  [0x10, 'Mirrored Shield',    ],
  [0x11, 'Ceramic Shield',     ],
  [0x12, 'Sacred Shield',      ],
  [0x13, 'Battle Shield',      ],
  // id  name                  key
  [0x14, 'Psycho Shield',      true],
  [0x15, 'Tanned Hide',        ],
  [0x16, 'Leather Armor',      ],
  [0x17, 'Bronze Armor',       ],
  [0x18, 'Platinum Armor',     ],
  [0x19, 'Soldier Suit',       ],
  [0x1a, 'Ceramic Suit',       ],
  [0x1b, 'Battle Armor',       true],
  [0x1c, 'Psycho Armor',       true],
  [0x1d, 'Medical Herb',       ],
  [0x1e, 'Antidote',           ],
  [0x1f, 'Lysis Plant',        ],
  [0x20, 'Fruit of Lime',      ],
  [0x21, 'Fruit of Power',     ],
  [0x22, 'Magic Ring',         ],
  [0x23, 'Fruit of Repun',     ],
  [0x24, 'Warp Boots',         ],
  [0x25, 'Statue of Onyx',     true],
  [0x26, 'Opel Statue',        true],
  [0x27, 'Insect Flute',       true],
  // id  name                  key
  [0x28, 'Flute of Lime',      true],
  [0x29, 'Gas Mask',           true],
  [0x2a, 'Power Ring',         true],
  [0x2b, 'Warrior Ring',       true],
  [0x2c, 'Iron Necklace',      true],
  [0x2d, 'Deo\'s Pendant',     true],
  [0x2e, 'Rabbit Boots',       true],
  [0x2f, 'Leather Boots',      true],
  [0x30, 'Shield Ring',        true],
  [0x31, 'Alarm Flute',        true],
  [0x32, 'Windmill Key',       true],
  [0x33, 'Key to Prison',      true],
  [0x34, 'Key to Styx',        true],
  [0x35, 'Fog Lamp',           true],
  [0x36, 'Shell Flute',        true],
  [0x37, 'Eye Glasses',        true],
  [0x38, 'Broken Statue',      true],
  [0x39, 'Glowing Lamp',       true],
  [0x3a, 'Statue of Gold',     true],
  [0x3b, 'Love Pendant',       true],
  // id  name                  key
  [0x3c, 'Kirisa Plant',       true],
  [0x3d, 'Ivory Statue',       true],
  [0x3e, 'Bow of Moon',        true],
  [0x3f, 'Bow of Sun',         true],
  [0x40, 'Bow of Truth',       true],
  [0x41, 'Refresh',            true],
  [0x42, 'Paralysis',          true],
  [0x43, 'Telepathy',          true],
  [0x44, 'Teleport',           true],
  [0x45, 'Recover',            true],
  [0x46, 'Barrier',            true],
  [0x47, 'Change',             true],
  [0x48, 'Flight',             true],
].map(([id, name, key]) => [id, {id, name, key}]));


const RETAIN_SLOTS = new Set([0x50, 0x53]);

const UNTOUCHED_MONSTERS = { // not yet +0x50 in these keys
  [0x7e]: true, // vertical platform
  [0x7f]: true, // horizontal platform
  [0x83]: true, // glitch in $7c (hydra)
  [0x8d]: true, // glitch in location $ab (sabera 2)
  [0x8e]: true, // broken?, but sits on top of iron wall
  [0x8f]: true, // shooting statue
  [0x9f]: true, // vertical platform
  [0xa6]: true, // glitch in location $af (mado 2)
};

const shuffleRandomNumbers = (rom, random) => {
  const table = rom.subarray(0x357e4 + 0x10, 0x35824 + 0x10);
  random.shuffle(table);
};
