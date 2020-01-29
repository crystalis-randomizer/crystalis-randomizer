import {Assembler} from './6502.js';
import {crc32} from './crc32.js';
import {ProgressTracker,
        generate as generateDepgraph,
        shuffle2 as _shuffleDepgraph} from './depgraph.js';
import {FetchReader} from './fetchreader.js';
import {FlagSet} from './flagset.js';
import {Graph} from './logic/graph.js';
import {World} from './logic/world.js';
import {crumblingPlatforms} from './pass/crumblingplatforms.js';
import {deterministic, deterministicPreParse} from './pass/deterministic.js';
import {fixDialog} from './pass/fixdialog.js';
import {madoMode} from './pass/madomode.js';
import {randomizeThunderWarp} from './pass/randomizethunderwarp.js';
import {rescaleMonsters} from './pass/rescalemonsters.js';
import {shuffleGoa} from './pass/shufflegoa.js';
import {shuffleMazes} from './pass/shufflemazes.js';
import {shuffleMimics} from './pass/shufflemimics.js';
import {shuffleMonsters} from './pass/shufflemonsters.js';
import {shufflePalettes} from './pass/shufflepalettes.js';
import {shuffleTrades} from './pass/shuffletrades.js';
import {toggleMaps} from './pass/togglemaps.js';
import {unidentifiedItems} from './pass/unidentifieditems.js';
import {Random} from './random.js';
import {Rom} from './rom.js';
import {Area} from './rom/area.js';
import {Location, Spawn} from './rom/location.js';
import {Shop, ShopType} from './rom/shop.js';
import {Spoiler} from './rom/spoiler.js';
import {hex, seq, watchArray, writeLittleEndian} from './rom/util.js';
import {DefaultMap} from './util.js';
import * as version from './version.js';

const EXPAND_PRG: boolean = true;

// TODO - to shuffle the monsters, we need to find the sprite palttes and
// patterns for each monster.  Each location supports up to two matchups,
// so can only support monsters that match.  Moreover, different monsters
// seem to need to be in either slot 0 or 1.

// Pull in all the patches we want to apply automatically.
// TODO - make a debugger window for patches.
// TODO - this needs to be a separate non-compiled file.
export default ({
  async apply(rom: Uint8Array, hash: {[key: string]: unknown}, path: string): Promise<Uint8Array> {
    // Look for flag string and hash
    let flags;
    if (!hash.seed) {
      // TODO - send in a hash object with get/set methods
      hash.seed = parseSeed('').toString(16);
      window.location.hash += '&seed=' + hash.seed;
    }
    if (hash.flags) {
      flags = new FlagSet(String(hash.flags));
    } else {
      flags = new FlagSet('@FullShuffle');
    }
    for (const key in hash) {
      if (hash[key] === 'false') hash[key] = false;
    }
    const [result,] =
        await shuffle(rom, parseSeed(String(hash.seed)),
                      flags, new FetchReader(path));
    return result;
  },
});

export function parseSeed(seed: string): number {
  if (!seed) return Random.newSeed();
  if (/^[0-9a-f]{1,8}$/i.test(seed)) return Number.parseInt(seed, 16);
  return crc32(seed);
}

/**
 * Abstract out File I/O.  Node and browser will have completely
 * different implementations.
 */
export interface Reader {
  read(filename: string): Promise<string>;
}

// prevent unused errors about watchArray - it's used for debugging.
const {} = {watchArray} as any;

export async function shuffle(rom: Uint8Array,
                              seed: number,
                              flags: FlagSet,
                              reader: Reader,
                              log?: {spoiler?: Spoiler},
                              progress?: ProgressTracker): Promise<readonly [Uint8Array, number]> {
  //rom = watchArray(rom, 0x85fa + 0x10);

  if (EXPAND_PRG && rom.length < 0x80000) {
    const newRom = new Uint8Array(rom.length + 0x40000);
    newRom.subarray(0, 0x40010).set(rom.subarray(0, 0x40010));
    newRom.subarray(0x80010).set(rom.subarray(0x40010));
    newRom[4] <<= 1;
    rom = newRom;
  }

  // First reencode the seed, mixing in the flags for security.
  if (typeof seed !== 'number') throw new Error('Bad seed');
  const newSeed = crc32(seed.toString(16).padStart(8, '0') + String(flags)) >>> 0;

  const touchShops = true;

  const defines: {[name: string]: boolean} = {
    _ALLOW_TELEPORT_OUT_OF_BOSS: flags.hardcoreMode() &&
                                 flags.shuffleBossElements(),
    _ALLOW_TELEPORT_OUT_OF_TOWER: true,
    _AUTO_EQUIP_BRACELET: flags.autoEquipBracelet(),
    _BARRIER_REQUIRES_CALM_SEA: flags.barrierRequiresCalmSea(),
    _BUFF_DEOS_PENDANT: flags.buffDeosPendant(),
    _BUFF_DYNA: flags.buffDyna(), // true,
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
    _EXTRA_PITY_MP: true,  // TODO: allow disabling this
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
    _TWELVTH_WARP_POINT: true, // zombie town warp
    _UNIDENTIFIED_ITEMS: flags.unidentifiedItems(),
    _ZEBU_STUDENT_GIVES_ITEM: flags.zebuStudentGivesItem(),
  };

  const asm = new Assembler();
  async function assemble(path: string) {
    asm.assemble(await reader.read(path), path);
    asm.patchRom(rom);
  }

  deterministicPreParse(rom.subarray(0x10)); // TODO - trainer...

  const flagFile =
      Object.keys(defines)
          .filter(d => defines[d]).map(d => `define ${d} 1\n`).join('');
  asm.assemble(flagFile, 'flags.s');
  await assemble('preshuffle.s');

  const random = new Random(newSeed);
  const parsed = new Rom(rom);
  parsed.flags.defrag();
  if (typeof window == 'object') (window as any).rom = parsed;
  parsed.spoiler = new Spoiler(parsed);
  if (log) log.spoiler = parsed.spoiler;

  // Make deterministic changes.
  deterministic(parsed, flags);
  toggleMaps(parsed, flags, random);

  // Set up shop and telepathy
  await assemble('postparse.s');
  parsed.scalingLevels = 48;
  parsed.uniqueItemTableAddress = asm.expand('KeyItemData');

  if (flags.shuffleShops()) shuffleShops(parsed, flags, random);

  shuffleGoa(parsed, random); // NOTE: must be before shuffleMazes!
  randomizeWalls(parsed, flags, random);
  crumblingPlatforms(parsed, random);

  if (flags.randomizeWildWarp()) shuffleWildWarp(parsed, flags, random);
  if (flags.randomizeThunderTeleport()) randomizeThunderWarp(parsed, random);
  rescaleMonsters(parsed, flags, random);
  unidentifiedItems(parsed, flags, random);
  shuffleTrades(parsed, flags, random);
  if (flags.randomizeMaps()) shuffleMazes(parsed, flags, random);

  // NOTE: Shuffle mimics and monsters *after* shuffling maps.
  if (flags.shuffleMimics()) shuffleMimics(parsed, flags, random);
  if (flags.shuffleMonsters()) shuffleMonsters(parsed, flags, random);

  // This wants to go as late as possible since we need to pick up
  // all the normalization and other handling that happened before.
  const world = new World(parsed, flags);
  const graph = new Graph([world.getLocationList()]);
  const fill =
      await graph.shuffle(flags, random, undefined, progress, parsed.spoiler);
  if (fill) {
    // const n = (i: number) => {
    //   if (i >= 0x70) return 'Mimic';
    //   const item = parsed.items[parsed.itemGets[i].itemId];
    //   return item ? item.messageName : `invalid ${i}`;
    // };
    // console.log('item: slot');
    // for (let i = 0; i < fill.items.length; i++) {
    //   if (fill.items[i] != null) {
    //     console.log(`$${hex(i)} ${n(i)}: ${n(fill.items[i])} $${hex(fill.items[i])}`);
    //   }
    // }

    // TODO - fill the spoiler log!

    //w.traverse(w.graph, fill); // fill the spoiler (may also want to just be a sanity check?)

    for (const [slot, item] of fill) {
      parsed.slots[slot & 0xff] = item & 0xff;
    }
  } else {
    return [rom, -1];
    //console.error('COULD NOT FILL!');
  }
  //console.log('fill', fill);

  // TODO - set omitItemGetDataSuffix and omitLocalDialogSuffix
  //await shuffleDepgraph(parsed, random, log, flags, progress);

  // TODO - rewrite rescaleShops to take a Rom instead of an array...
  if (touchShops) {
    // TODO - separate logic for handling shops w/o Pn specified (i.e. vanilla
    // shops that may have been randomized)
    rescaleShops(parsed, asm, flags.bargainHunting() ? random : undefined);
  }
  madoMode(parsed);

  // NOTE: monster shuffle needs to go after item shuffle because of mimic
  // placement constraints, but it would be nice to go before in order to
  // guarantee money.
  identifyKeyItemsForDifficultyBuffs(parsed);

  // Buff medical herb and fruit of power
  if (flags.doubleBuffMedicalHerb()) {
    rom[0x1c50c + 0x10] *= 2;  // fruit of power
    rom[0x1c4ea + 0x10] *= 3;  // medical herb
  } else if (flags.buffMedicalHerb()) {
    rom[0x1c50c + 0x10] += 16; // fruit of power
    rom[0x1c4ea + 0x10] *= 2;  // medical herb
  }

  if (flags.storyMode()) storyMode(parsed);

  shuffleMusic(parsed, flags, random);
  shufflePalettes(parsed, flags, random);
  // Do this *after* shuffling palettes
  if (flags.blackoutMode()) blackoutMode(parsed);

  misc(parsed, flags, random);
  fixDialog(parsed);

  // NOTE: This needs to happen BEFORE postshuffle
  if (flags.buffDyna()) buffDyna(parsed, flags); // TODO - conditional

  if (flags.trainer()) {
    parsed.wildWarp.locations = [
      0x0a, // vampire
      0x1a, // swamp/insect
      0x35, // summit cave
      0x48, // fog lamp
      0x6d, // vampire 2
      0x6e, // sabera 1
      0x8c, // shyron
      0xaa, // behind kelbesqye 2
      0xac, // sabera 2
      0xb0, // behind mado 2
      0xb6, // karmine
      0x9f, // draygon 1
      0xa6, // draygon 2
      0x58, // tower
      0x5c, // tower outside mesia
      0x00, // mezame
    ];
  }

  await parsed.writeData();
  buffDyna(parsed, flags); // TODO - conditional
  const crc = await postParsedShuffle(rom, random, seed, flags, asm, assemble);

  // TODO - optional flags can possibly go here, but MUST NOT use parsed.prg!

  if (EXPAND_PRG) {
    const prg = rom.subarray(0x10);
    prg.subarray(0x7c000, 0x80000).set(prg.subarray(0x3c000, 0x40000));
  }
  return [rom, crc];
}

// Separate function to guarantee we no longer have access to the parsed rom...
async function postParsedShuffle(rom: Uint8Array,
                                 random: Random,
                                 seed: number,
                                 flags: FlagSet,
                                 asm: Assembler,
                                 assemble: (path: string) => Promise<void>): Promise<number> {
  await assemble('postshuffle.s');
  updateDifficultyScalingTables(rom, flags, asm);
  updateCoinDrops(rom, flags);

  shuffleRandomNumbers(rom, random);

  return stampVersionSeedAndHash(rom, seed, flags);

  // BELOW HERE FOR OPTIONAL FLAGS:

  // do any "vanity" patches here...
  // console.log('patch applied');
  // return log.join('\n');
};

function misc(rom: Rom, flags: FlagSet, random: Random) {
  const {} = {rom, flags, random} as any;
  // NOTE: we still need to do some work actually adjusting
  // message texts to prevent line overflow, etc.  We should
  // also make some hooks to easily swap out items where it
  // makes sense.
  rom.messages.parts[2][2].text = `
{01:Akahana} is handed a statue.#
Thanks for finding that.
I was totally gonna sell
it for tons of cash.#
Here, have this lame
[29:Gas Mask] or something.`;
  // TODO - would be nice to add some more (higher level) markup,
  // e.g. `${describeItem(slotNum)}`.  We could also add markup
  // for e.g. `${sayWant(slotNum)}` and `${sayThanks(slotNum)}`
  // if we shuffle the wanted items.  These could be randomized
  // in various ways, as well as having some additional bits like
  // wantAuxiliary(...) for e.g. "the kirisa plant is ..." - then
  // it could instead say "the statue of onyx is ...".
  rom.messages.parts[0][0xe].text = `It's dangerous to go alone! Take this.`;
  rom.messages.parts[0][0xe].fixText();
};

function shuffleShops(rom: Rom, _flags: FlagSet, random: Random): void {
  const shops: {[type: number]: {contents: number[], shops: Shop[]}} = {
    [ShopType.ARMOR]: {contents: [], shops: []},
    [ShopType.TOOL]: {contents: [], shops: []},
  };
  // Read all the contents.
  for (const shop of rom.shops) {
    if (!shop.used || shop.location === 0xff) continue;
    const data = shops[shop.type];
    if (data) {
      data.contents.push(...shop.contents.filter(x => x !== 0xff));
      data.shops.push(shop);
      shop.contents = [];
    }
  }
  // Shuffle the contents.  Pick order to drop items in.
  for (const data of Object.values(shops)) {
    let slots: Shop[] | null = null;
    const items = [...data.contents];
    random.shuffle(items);
    while (items.length) {
      if (!slots || !slots.length) {
        if (slots) items.shift();
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
  // Sort and add 0xff's
  for (const data of Object.values(shops)) {
    for (const shop of data.shops) {
      while (shop.contents.length < 4) shop.contents.push(0xff);
      shop.contents.sort((a, b) => a - b);
    }
  }
}

function randomizeWalls(rom: Rom, flags: FlagSet, random: Random): void {
  // NOTE: We can make any wall shoot by setting its $10 bit on the type byte.
  // But this also requires matching pattern tables, so we'll leave that alone
  // for now to avoid gross graphics.

  // All other walls will need their type moved into the upper nibble and then
  // the new element goes in the lower nibble.  Since there are so few iron
  // walls, we will give them arbitrary elements independent of the palette.
  // Rock/ice walls can also have any element, but the third palette will
  // indicate what they expect.

  if (!flags.randomizeWalls()) return;
  // Basic plan: partition based on palette, look for walls.
  const pals = [
    [0x05, 0x38], // rock wall palettes
    [0x11], // ice wall palettes
    [0x6a], // "ember wall" palettes
    [0x14], // "iron wall" palettes
  ];

  function wallType(spawn: Spawn): number {
    if (spawn.data[2] & 0x20) {
      return (spawn.id >>> 4) & 3;
    }
    return spawn.id & 3;
  }

  const partition = new DefaultMap<Area, Location[]>(() => []);
  for (const location of rom.locations) {
    partition.get(location.data.area).push(location);
  }
  for (const locations of partition.values()) {
    // pick a random wall type.
    const elt = random.nextInt(4);
    const pal = random.pick(pals[elt]);
    let found = false;
    for (const location of locations) {
      for (const spawn of location.spawns) {
        if (spawn.isWall()) {
          const type = wallType(spawn);
          if (type === 2) continue;
          if (type === 3) {
            const newElt = random.nextInt(4);
            if (rom.spoiler) rom.spoiler.addWall(location.name, type, newElt);
            spawn.data[2] |= 0x20;
            spawn.id = 0x30 | newElt;
          } else {
            // console.log(`${location.name} ${type} => ${elt}`);
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

function shuffleMusic(rom: Rom, flags: FlagSet, random: Random): void {
  if (!flags.randomizeMusic()) return;
  interface HasMusic { bgm: number; }
  class BossMusic implements HasMusic {
    constructor(readonly addr: number) {}
    get bgm() { return rom.prg[this.addr]; }
    set bgm(x) { rom.prg[this.addr] = x; }
  }
  const bossAddr = [
    0x1e4b8, // vampire 1
    0x1e690, // insect
    0x1e99b, // kelbesque
    0x1ecb1, // sabera
    0x1ee0f, // mado
    0x1ef83, // karmine
    0x1f187, // draygon 1
    0x1f311, // draygon 2
    0x37c30, // dyna
  ];
  let neighbors: Location[] = [];
  const musics = new DefaultMap<unknown, HasMusic[]>(() => []);
  const all = new Set<number>();
  for (const l of rom.locations) {
    if (l.id === 0x5f || l.id === 0 || !l.used) continue; // skip start and dyna
    const music = l.data.music;
    all.add(l.bgm);
    if (typeof music === 'number') {
      neighbors.push(l);
    } else {
      musics.get(music).push(l);
    }
  }
  for (const a of bossAddr) {
    const b = new BossMusic(a);
    musics.set(b, [b]);
    all.add(b.bgm);
  }
  const list = [...all];
  const updated = new Set<HasMusic>();
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
      const neighbor = loc.neighborForEntrance(loc.data.music as number);
      if (updated.has(neighbor)) {
        loc.bgm = neighbor.bgm;
        updated.add(loc);
        changed = true;
      } else {
        defer.push(loc);
      }
    }
    if (!changed) break;
    neighbors = defer;
  }
}

function shuffleWildWarp(rom: Rom, _flags: FlagSet, random: Random): void {
  const locations: Location[] = [];
  for (const l of rom.locations) {
    if (l && l.used &&
        // don't add mezame because we already add it always
        l.id &&
        // don't warp into shops
        !l.extended &&
        // don't warp into tower
        (l.id & 0xf8) !== 0x58 &&
        // don't warp into mesia shrine because of queen logic
        l !== rom.locations.MesiaShrine &&
        // don't warp into rage because it's just annoying
        l !== rom.locations.LimeTreeLake) {
      locations.push(l);
    }
  }
  random.shuffle(locations);
  rom.wildWarp.locations = [];
  for (const loc of [...locations.slice(0, 15).sort((a, b) => a.id - b.id)]) {
    rom.wildWarp.locations.push(loc.id);
    if (rom.spoiler) rom.spoiler.addWildWarp(loc.id, loc.name);
  }
  rom.wildWarp.locations.push(0);
}

function buffDyna(rom: Rom, _flags: FlagSet): void {
  rom.objects[0xb8].collisionPlane = 1;
  rom.objects[0xb8].immobile = true;
  rom.objects[0xb9].collisionPlane = 1;
  rom.objects[0xb9].immobile = true;
  rom.objects[0x33].collisionPlane = 2;
  rom.adHocSpawns[0x28].slotRangeLower = 0x1c; // counter
  rom.adHocSpawns[0x29].slotRangeUpper = 0x1c; // laser
  rom.adHocSpawns[0x2a].slotRangeUpper = 0x1c; // bubble
}

function blackoutMode(rom: Rom) {
  const dg = generateDepgraph();
  for (const node of dg.nodes) {
    const type = (node as any).type;
    if (node.nodeType === 'Location' && (type === 'cave' || type === 'fortress')) {
      rom.locations[(node as any).id].tilePalettes.fill(0x9a);
    }
  }
}

const storyMode = (rom: Rom) => {
  // shuffle has already happened, need to use shuffled flags from
  // NPC spawn conditions...
  const conditions = [
    // Note: if bosses are shuffled we'll need to detect this...
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
    // TODO - statues of moon and sun may be relevant if entrance shuffle?
    // TODO - vampires and insect?
  ];
  rom.npcs[0xcb].spawnConditions.get(0xa6)!.push(...conditions);
};

// Stamp the ROM
export function stampVersionSeedAndHash(rom: Uint8Array, seed: number, flags: FlagSet): number {
  // Use up to 26 bytes starting at PRG $25ea8
  // Would be nice to store (1) commit, (2) flags, (3) seed, (4) hash
  // We can use base64 encoding to help some...
  // For now just stick in the commit and seed in simple hex
  const crc = crc32(rom);
  const crcString = crc.toString(16).padStart(8, '0').toUpperCase();
  const hash = version.STATUS === 'unstable' ?
      version.HASH.substring(0, 7).padStart(7, '0').toUpperCase() + '     ' :
      version.VERSION.substring(0, 12).padEnd(12, ' ');
  const seedStr = seed.toString(16).padStart(8, '0').toUpperCase();
  const embed = (addr: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      rom[addr + 0x10 + i] = text.charCodeAt(i);
    }
  };
  const intercalate = (s1: string, s2: string): string => {
    const out = [];
    for (let i = 0; i < s1.length || i < s2.length; i++) {
      out.push(s1[i] || ' ');
      out.push(s2[i] || ' ');
    }
    return out.join('');
  };

  embed(0x277cf, intercalate('  VERSION     SEED      ',
                             `  ${hash}${seedStr}`));
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
  if (version.STATUS === 'unstable') embed(0x2573c, 'BETA');
  // NOTE: it would be possible to add the hash/seed/etc to the title
  // page as well, but we'd need to replace the unused letters in bank
  // $1d with the missing numbers (J, Q, W, X), as well as the two
  // weird squares at $5b and $5c that don't appear to be used.  Together
  // with using the letter 'O' as 0, that's sufficient to cram in all the
  // numbers and display arbitrary hex digits.

  return crc;
}

function patchBytes(rom: Uint8Array, address: number, bytes: number[]) {
  for (let i = 0; i < bytes.length; i++) {
    rom[address + i] = Math.max(0, Math.min(255, bytes[i]));
  }
}

function patchWords(rom: Uint8Array, address: number, words: number[]) {
  for (let i = 0; i < 2 * words.length; i += 2) {
    rom[address + i] = words[i >>> 1] & 0xff;
    rom[address + i + 1] = words[i >>> 1] >>> 8;
  }
}

// goes with enemy stat recomputations in postshuffle.s
function updateCoinDrops(rom: Uint8Array, flags: FlagSet) {
  rom = rom.subarray(0x10);
  if (flags.disableShopGlitch()) {
    // bigger gold drops if no shop glitch, particularly at the start
    // - starts out fibonacci, then goes linear at 600
    patchWords(rom, 0x34bde, [
        0,   5,  10,  15,  25,  40,  65,  105,
      170, 275, 445, 600, 700, 800, 900, 1000,
    ]);
  } else {
    // this table is basically meaningless b/c shop glitch
    patchWords(rom, 0x34bde, [
        0,   1,   2,   4,   8,  16,  30,  50,
      100, 200, 300, 400, 500, 600, 700, 800,
    ]);
  }
}

// goes with enemy stat recomputations in postshuffle.s
// NOTE: this should go into a rom object so that it can
// be inspected and written in a consistent way.
const updateDifficultyScalingTables = (rom: Uint8Array, flags: FlagSet, asm: Assembler) => {
  rom = rom.subarray(0x10);
  const diff = seq(asm.expand('SCALING_LEVELS'), x => x);

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

const rescaleShops = (rom: Rom, asm: Assembler, random?: Random) => {
  // Populate rescaled prices into the various rom locations.
  // Specifically, we read the available item IDs out of the
  // shop tables and then compute new prices from there.
  // If `random` is passed then the base price to buy each
  // item at any given shop will be adjusted to anywhere from
  // 50% to 150% of the base price.  The pawn shop price is
  // always 50% of the base price.

  rom.shopCount = 11; // 11 of all types of shop for some reason.
  rom.shopDataTablesAddress = asm.expand('ShopData');

  // NOTE: This isn't in the Rom object yet...
  writeLittleEndian(rom.prg, asm.expand('InnBasePrice'), 20);

  for (const shop of rom.shops) {
    if (shop.type === ShopType.PAWN) continue;
    for (let i = 0, len = shop.prices.length; i < len; i++) {
      if (shop.contents[i] < 0x80) {
        shop.prices[i] = random ? random.nextNormal(1, 0.3, 0.5, 1.5) : 1;
      } else if (shop.type !== ShopType.INN) {
        shop.prices[i] = 0;
      } else {
        // just set the one price
        shop.prices[i] = random ? random.nextNormal(1, 0.5, 0.375, 1.625) : 1;
      }
    }
  }

  // Also fill the scaling tables.
  const diff = seq(asm.expand('SCALING_LEVELS'), x => x);
  // Tool shops scale as 2 ** (Diff / 10), store in 8ths
  patchBytes(rom.prg, asm.expand('ToolShopScaling'),
             diff.map(d => Math.round(8 * (2 ** (d / 10)))));
  // Armor shops scale as 2 ** ((47 - Diff) / 12), store in 8ths
  patchBytes(rom.prg, asm.expand('ArmorShopScaling'),
             diff.map(d => Math.round(8 * (2 ** ((47 - d) / 12)))));

  // Set the item base prices.
  for (let i = 0x0d; i < 0x27; i++) {
    rom.items[i].basePrice = BASE_PRICES[i];
  }

  // TODO - separate flag for rescaling monsters???
};

// Map of base prices.  (Tools are positive, armors are ones-complement.)
const BASE_PRICES: {[itemId: number]: number} = {
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
  0x24: 65,   // warp boots
  0x26: 300,  // opel statue
  // 0x31: 50, // alarm flute
};

/////////
/////////
/////////

const identifyKeyItemsForDifficultyBuffs = (rom: Rom) => {
  // // Tag key items for difficulty buffs
  // for (const get of rom.itemGets) {
  //   const item = ITEMS.get(get.itemId);
  //   if (!item || !item.key) continue;
  //   get.key = true;
  // }
  // // console.log(report);
  for (let i = 0; i < 0x49; i++) {
    // NOTE - special handling for alarm flute until we pre-patch
    const unique = (rom.prg[0x20ff0 + i] & 0x40) || i === 0x31;
    const bit = 1 << (i & 7);
    const addr = 0x1e110 + (i >>> 3);
    rom.prg[addr] = rom.prg[addr] & ~bit | (unique ? bit : 0);
  }
};

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


const shuffleRandomNumbers = (rom: Uint8Array, random: Random) => {
  const table = rom.subarray(0x357e4 + 0x10, 0x35824 + 0x10);
  random.shuffle(table);
};

// useful for debug even if not currently used
const [] = [hex];
