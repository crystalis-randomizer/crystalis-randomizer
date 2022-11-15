import { Assembler } from './asm/assembler';
import { Cpu } from './asm/cpu';
import { Preprocessor } from './asm/preprocessor';
import { TokenSource } from './asm/token';
import { TokenStream } from './asm/tokenstream';
import { Tokenizer } from './asm/tokenizer';
import { crc32 } from './crc32';
import { FlagSet } from './flagset';
import { Graph } from './logic/graph';
import { World } from './logic/world';
import { compressMapData, moveScreensIntoExpandedRom } from './pass/compressmapdata';
import { crumblingPlatforms } from './pass/crumblingplatforms';
import { deterministic, deterministicPreParse } from './pass/deterministic';
import { fixDialog } from './pass/fixdialog';
import { fixEntranceTriggers } from './pass/fixentrancetriggers';
import { fixMovementScripts } from './pass/fixmovementscripts';
import { fixSkippableExits } from './pass/fixskippableexits';
import { randomizeThunderWarp } from './pass/randomizethunderwarp';
import { rescaleMonsters } from './pass/rescalemonsters';
import { shuffleGoa } from './pass/shufflegoa';
import { shuffleHouses } from './pass/shufflehouses';
import { shuffleMazes } from './pass/shufflemazes';
import { shuffleMimics } from './pass/shufflemimics';
import { shuffleMonsterPositions } from './pass/shufflemonsterpositions';
import { shuffleMonsters } from './pass/shufflemonsters';
import { shufflePalettes } from './pass/shufflepalettes';
import { shuffleTrades } from './pass/shuffletrades';
import { standardMapEdits } from './pass/standardmapedits';
import { toggleMaps } from './pass/togglemaps';
import { unidentifiedItems } from './pass/unidentifieditems';
import { misspell } from './pass/misspell';
import { writeLocationsFromMeta } from './pass/writelocationsfrommeta';
import { Random } from './random';
import { Rom, ModuleId } from './rom';
import { Area } from './rom/area';
import { Location, Spawn } from './rom/location';
import { fixTilesets } from './rom/screenfix';
import { Shop, ShopType } from './rom/shop';
import { Spoiler } from './rom/spoiler';
import { hex, seq, watchArray } from './rom/util';
import { DefaultMap } from './util';
import * as version from './version';
import { shuffleAreas } from './pass/shuffleareas';
import { checkTriggers } from './pass/checktriggers';
import { Sprite } from './characters';

const EXPAND_PRG: boolean = true;
const ASM = ModuleId('asm');

// trivial interface for updating a progress bar.
export interface ProgressTracker {
  addTasks(tasks: number): void;
  addCompleted(tasks: number): void;
}

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

function defines(flags: FlagSet,
                 pass: 'early' | 'late'): string {
  const defines: Record<string, boolean> = {
    _ALLOW_TELEPORT_OUT_OF_BOSS: flags.hardcoreMode() &&
                                 flags.shuffleBossElements(),
    _ALLOW_TELEPORT_OUT_OF_TOWER: true,
    _AUDIBLE_WALLS: flags.audibleWallCues(pass),
    _AUTO_EQUIP_BRACELET: flags.autoEquipBracelet(pass),
    _BARRIER_REQUIRES_CALM_SEA: true, // flags.barrierRequiresCalmSea(),
    _BUFF_DEOS_PENDANT: flags.buffDeosPendant(),
    _BUFF_DYNA: flags.buffDyna(), // true,
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
    _EXTRA_PITY_MP: true,  // TODO: allow disabling this
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
    _STATS_TRACKING: flags.hasStatTracking(),
    _TELEPORT_ON_THUNDER_SWORD: flags.teleportOnThunderSword(),
    _TINK_MODE: !flags.guaranteeMatchingSword(),
    _TRAINER: flags.trainer(),
    _TWELFTH_WARP_POINT: true, // zombie town warp
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

function patchGraphics(rom: Uint8Array, sprites: Sprite[]) {
  for (let sprite of sprites) {
    Sprite.applyPatch(sprite, rom, EXPAND_PRG);
  }
}

export async function shuffle(rom: Uint8Array,
                              seed: number,
                              originalFlags: FlagSet,
                              reader: Reader,
                              spriteReplacements?: Sprite[],
                              log?: {spoiler?: Spoiler},
                              progress?: ProgressTracker,
                            ): Promise<readonly [Uint8Array, number]> {
  // Trim overdumps (main.js already does this, but there are other entrypoints)
  const expectedSize =
      16 + (rom[6] & 4 ? 512 : 0) + (rom[4] << 14) + (rom[5] << 13);
  if (rom.length > expectedSize) rom = rom.slice(0, expectedSize);

  //rom = watchArray(rom, 0x85fa + 0x10);
  if (EXPAND_PRG && rom.length < 0x80000) {
    if (rom.length < 0x80000) {
        const newRom = new Uint8Array(rom.length + 0x40000);
        newRom.subarray(0, 0x40010).set(rom.subarray(0, 0x40010));
        newRom.subarray(0x80010).set(rom.subarray(0x40010));
        newRom[4] <<= 1;
        rom = newRom;
    }

    const prg = rom.subarray(0x10);
    prg.subarray(0x7c000, 0x80000).set(prg.subarray(0x3c000, 0x40000));
  }

  deterministicPreParse(rom.subarray(0x10)); // TODO - trainer...

  // First reencode the seed, mixing in the flags for security.
  if (typeof seed !== 'number') throw new Error('Bad seed');
  const newSeed = crc32(seed.toString(16).padStart(8, '0') + String(originalFlags.filterOptional())) >>> 0;
  const random = new Random(newSeed);

  const sprites = spriteReplacements ? spriteReplacements : [];
  const attemptErrors = [];
  for (let i = 0; i < 5; i++) { // for now, we'll try 5 attempts
    try {
      return await shuffleInternal(rom, originalFlags, seed, random, reader, log, progress, sprites);
    } catch (error) {
      attemptErrors.push(error);
      console.error(`Attempt ${i + 1} failed: ${error.stack}`);
    }
  }
  throw new Error(`Shuffle failed: ${attemptErrors.map(e => e.stack).join('\n\n')}`);
}

async function shuffleInternal(rom: Uint8Array,
                               originalFlags: FlagSet,
                               originalSeed: number,
                               random: Random,
                               reader: Reader,
                               log: {spoiler?: Spoiler}|undefined,
                               progress: ProgressTracker|undefined,
                               spriteReplacements: Sprite[],
                              ): Promise<readonly [Uint8Array, number]>  {
  const originalFlagString = String(originalFlags);
  const flags = originalFlags.filterRandom(random);
  const parsed = new Rom(rom);
  const actualFlagString = String(flags);
// (window as any).cave = shuffleCave;
  parsed.flags.defrag();
  compressMapData(parsed);
  moveScreensIntoExpandedRom(parsed);
             // TODO - the screens aren't moving?!?
  // NOTE: delete these if we want more free space back...
  // parsed.moveScreens(parsed.metatilesets.swamp, 4); // move 17 screens to $40000
  // parsed.moveScreens(parsed.metatilesets.house, 4); // 15 screens
  // parsed.moveScreens(parsed.metatilesets.town, 4);
  // parsed.moveScreens(parsed.metatilesets.[cave, pyramid, fortress, labyrinth, iceCave], 4);
  // parsed.moveScreens(parsed.metatilesets.dolphinCave, 4);
  // parsed.moveScreens(parsed.metatilesets.lime, 4);
  // parsed.moveScreens(parsed.metatilesets.shrine, 4);
  if (typeof window == 'object') (window as any).rom = parsed;
  parsed.spoiler = new Spoiler(parsed);
  if (log) log.spoiler = parsed.spoiler;
  if (actualFlagString !== originalFlagString) {
    parsed.spoiler.flags = actualFlagString;
  }

  // Make deterministic changes.
  deterministic(parsed, flags);
  fixTilesets(parsed);
  standardMapEdits(parsed, standardMapEdits.generateOptions(flags, random));
  toggleMaps(parsed, flags, random);

  // Set up shop and telepathy
  parsed.scalingLevels = 48;

  if (flags.shuffleShops()) shuffleShops(parsed, flags, random);

  if (flags.shuffleGoaFloors()) shuffleGoa(parsed, random); // NOTE: must be before shuffleMazes!
  updateWallSpawnFormat(parsed);
  randomizeWalls(parsed, flags, random);
  crumblingPlatforms(parsed, random);

  if (flags.nerfWildWarp()) parsed.wildWarp.locations.fill(0);
  if (flags.randomizeWildWarp()) shuffleWildWarp(parsed, flags, random);
  if (flags.randomizeThunderTeleport()) randomizeThunderWarp(parsed, random);
  rescaleMonsters(parsed, flags, random);
  unidentifiedItems(parsed, flags, random);
  misspell(parsed, flags, random);
  shuffleTrades(parsed, flags, random);
  if (flags.shuffleHouses()) shuffleHouses(parsed, flags, random);
  if (flags.shuffleAreas()) shuffleAreas(parsed, flags, random);
  fixEntranceTriggers(parsed);
  if (flags.randomizeMaps()) shuffleMazes(parsed, flags, random);
  writeLocationsFromMeta(parsed);
  shuffleMonsterPositions(parsed, random);

  // NOTE: Shuffle mimics and monsters *after* shuffling maps, but before logic.
  if (flags.shuffleMimics()) shuffleMimics(parsed, flags, random);
  if (flags.shuffleMonsters()) shuffleMonsters(parsed, flags, random);

  // This wants to go as late as possible since we need to pick up
  // all the normalization and other handling that happened before.
  const world = new World(parsed, flags);
  const graph = new Graph([world.getLocationList()]);
  if (!flags.noShuffle()) {
    const fill = await graph.shuffle(flags, random, undefined, progress, parsed.spoiler);
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
      parsed.slots.setCheckCount(fill.size);
    } else {
      return [rom, -1];
      //console.error('COULD NOT FILL!');
    }
  }
  //console.log('fill', fill);

  // TODO - set omitItemGetDataSuffix and omitLocalDialogSuffix
  //await shuffleDepgraph(parsed, random, log, flags, progress);

  // TODO - rewrite rescaleShops to take a Rom instead of an array...
  if (flags.shuffleShops()) {
    // TODO - separate logic for handling shops w/o Pn specified (i.e. vanilla
    // shops that may have been randomized)
    rescaleShops(parsed, flags.bargainHunting() ? random : undefined);
  }

  // NOTE: monster shuffle needs to go after item shuffle because of mimic
  // placement constraints, but it would be nice to go before in order to
  // guarantee money.
  //identifyKeyItemsForDifficultyBuffs(parsed);

  // Buff medical herb and fruit of power
  if (flags.buffMedicalHerb()) {
    parsed.items.MedicalHerb.value = 80;
    parsed.items.FruitOfPower.value = 56;
  }

  if (flags.storyMode()) storyMode(parsed);

  // Do this *after* shuffling palettes
  if (flags.blackoutMode()) blackoutMode(parsed);

  misc(parsed, flags, random);
  fixDialog(parsed);
  fixMovementScripts(parsed);
  checkTriggers(parsed);

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

  if (flags.randomizeMusic('early')) {
    shuffleMusic(parsed, flags, random);
  }
  if (flags.shuffleTilePalettes('early')) {
    shufflePalettes(parsed, flags, random);
  }
  updateTablesPreCommit(parsed, flags);
  random.shuffle(parsed.randomNumbers.values);


  // async function assemble(path: string) {
  //   asm.assemble(await reader.read(path), path, rom);
  // }

  // TODO - clean this up to not re-read the entire thing twice.
  // Probably just want to move the optional passes into a separate
  // file that runs afterwards all on its own.

  async function asm(pass: 'early' | 'late') {
    async function tokenizer(path: string) {
      return new Tokenizer(await reader.read(path), path,
                           {lineContinuations: true});
    }

    const flagFile = defines(flags, pass);
    const asm = new Assembler(Cpu.P02);
    const toks = new TokenStream();
    toks.enter(TokenSource.concat(
        new Tokenizer(flagFile, 'flags.s'),
        await tokenizer('init.s'),
        await tokenizer('alloc.s'),
        await tokenizer('stattracker.s'),
        await tokenizer('preshuffle.s'),
        await tokenizer('postparse.s'),
        await tokenizer('postshuffle.s')));
    const pre = new Preprocessor(toks, asm);
    asm.tokens(pre);
    return asm.module();
  }

//     const asm = new Assembler(Cpu.P02);
//     const toks = new TokenStream();
//     toks.enter(new Tokenizer(code, file));
//     this.pre = new Preprocessor(toks, asm);
//     while (this.pre.next()) {}
//   }

//   assemble(code: string, file: string, rom: Uint8Array) {
//     const asm = new Assembler(Cpu.P02);
//     const toks = new TokenStream();
//     toks.enter(new Tokenizer(code, file));
//     const pre = new Preprocessor(toks, asm, this.pre);
//     asm.tokens(pre);
//     const link = new Linker();
//     link.read(asm.module());
  
  // const asm = new ShimAssembler(flagFile, 'flags.s');
//console.log('Multiply16Bit:', asm.expand('Multiply16Bit').toString(16));
  parsed.messages.compress(); // pull this out to make writeData a pure function
  const prgCopy = rom.slice(16);

  parsed.modules.set(ASM, await asm('early'));
  parsed.writeData(prgCopy);
  parsed.modules.set(ASM, await asm('late'));

  const hasGraphics = spriteReplacements?.some((spr) => Sprite.isCustom(spr)) || false;
  const crc = stampVersionSeedAndHash(rom, originalSeed, originalFlagString, prgCopy, hasGraphics);


  // Do optional randomization now...
  if (flags.randomizeMusic('late')) {
    shuffleMusic(parsed, flags, random);
  }
  if (flags.noMusic('late')) {
    noMusic(parsed);
  }
  if (flags.shuffleTilePalettes('late')) {
    shufflePalettes(parsed, flags, random);
  }

  // Do this very late, since it's low-level on the locations.  Need to wait
  // until after the metalocations have been written back to the locations.
  fixSkippableExits(parsed);

  parsed.writeData();

  // TODO - optional flags can possibly go here, but MUST NOT use parsed.prg!
  patchGraphics(rom, spriteReplacements);
  return [rom, crc];
}

function misc(rom: Rom, flags: FlagSet, random: Random) {
// TODO - remove hack to visualize maps from the console...
// (Object.getPrototypeOf(rom.locations[0]) as any).show = function(ts: typeof rom.metatilesets.river) {
//   console.log(Maze.from(this, random, ts).show());
// };

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

/**
 * We rearrange how walls spawn to support custom shooting walls,
 * among other things.  The signal to the game (and later passes)
 * that we've made this change is to set the 0x20 bit on the 3rd
 * spawn byte (i.e. the spawn type).
 */
function updateWallSpawnFormat(rom: Rom) {
  for (const location of rom.locations) {
    if (!location.used) continue;
    for (const spawn of location.spawns) {
      if (spawn.isWall()) {
        const elem = spawn.id & 0xf;
        spawn.id = elem | (elem << 4);
        const shooting = spawn.isShootingWall(location);
        spawn.data[2] = shooting ? 0x33 : 0x23;
        // const iron = spawn.isIronWall();
        // spawn.data[2] = 0x23 | (shooting ? 0x10 : 0) | (iron ? 0x40 : 0);
      }
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

function noMusic(rom: Rom): void {
  for (const m of [...rom.locations, ...rom.bosses.musics]) {
    m.bgm = 0;
  }
}

function shuffleMusic(rom: Rom, flags: FlagSet, random: Random): void {
  interface HasMusic { bgm: number; }
  const musics = new DefaultMap<unknown, HasMusic[]>(() => []);
  const all = new Set<number>();
  for (const l of rom.locations) {
    if (l.id === 0x5f || l.id === 0 || !l.used) continue; // skip start and dyna
    const music = l.musicGroup;
    all.add(l.bgm);
    musics.get(music).push(l);
  }
  for (const b of rom.bosses.musics) {
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
}

function shuffleWildWarp(rom: Rom, _flags: FlagSet, random: Random): void {
  const locations: Location[] = [];
  for (const l of rom.locations) {
    if (l && l.used &&
        // don't add mezame because we already add it always
        l.id &&
        // don't warp into shops
        !l.isShop() &&
        // don't warp into tower
        (l.id & 0xf8) !== 0x58 &&
        // don't warp to either side of Draygon 2
        l !== rom.locations.Crypt_Draygon2 &&
        l !== rom.locations.Crypt_Teleporter &&
        // don't warp into mesia shrine because of queen logic
        // (and because it's annoying)
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
  const indoors = new Set([
    rom.metatilesets.cave.tilesetId,
    rom.metatilesets.fortress.tilesetId,
    rom.metatilesets.iceCave.tilesetId,
    rom.metatilesets.labyrinth.tilesetId,
    rom.metatilesets.pyramid.tilesetId,
  ]);
  for (const loc of rom.locations) {
    if (indoors.has(loc.tileset)) loc.tilePatterns.fill(0x9a);
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
export function stampVersionSeedAndHash(rom: Uint8Array,
                                        seed: number,
                                        flagString: string,
                                        early: Uint8Array,
                                        hasGraphics: boolean): number {
  // Use up to 26 bytes starting at PRG $25ea8
  // Would be nice to store (1) commit, (2) flags, (3) seed, (4) hash
  // We can use base64 encoding to help some...
  // For now just stick in the commit and seed in simple hex
  const crc = crc32(early);
  const crcString = crc.toString(16).padStart(8, '0').toUpperCase();
  const hash = version.STATUS === 'unstable' ?
      version.HASH.substring(0, 7).padStart(7, '0').toUpperCase() + '     ' :
      version.VERSION.substring(0, 12).padEnd(12, ' ');
  const seedStr = seed.toString(16).padStart(8, '0').toUpperCase();
  const embed = (addr: number, ...values: (string|number)[]) => {
    addr += 0x10;
    for (const value of values) {
      if (typeof value === 'string') {
        for (const c of value) {
          rom[addr++] = c.charCodeAt(0);
        }
      } else if (typeof value === 'number') {
        rom[addr++] = value;
      } else {
        throw new Error(`Bad value: ${value}`);
      }
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
  if (hasGraphics) {
    // 7e is the SP char denoting a Sprite Pack was applied
    embed(0x27883, 0x7e);
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

function updateTablesPreCommit(rom: Rom, flags: FlagSet) {
  // Change some enemy scaling from the default, if flags ask for it.
  if (flags.decreaseEnemyDamage()) {
    rom.scaling.setPhpFormula(s => 16 + 6 * s);
  }
  rom.scaling.setExpScalingFactor(flags.expScalingFactor());

  // Update the coin drop buckets (goes with enemy stat recomputations
  // in postshuffle.s)
  if (flags.disableShopGlitch()) {
    // bigger gold drops if no shop glitch, particularly at the start
    // - starts out fibonacci, then goes linear at 600
    rom.coinDrops.values = [
        0,   5,  10,  15,  25,  40,  65,  105,
      170, 275, 445, 600, 700, 800, 900, 1000,
    ];
  } else {
    // this table is basically meaningless b/c shop glitch
    rom.coinDrops.values = [
        0,   1,   2,   4,   8,  16,  30,  50,
      100, 200, 300, 400, 500, 600, 700, 800,
    ];
  }

  // Update shield and armor defense values.
  // Some of the "middle" shields are 2 points weaker than the corresponding
  // armors.  If we instead average the shield/armor values and bump +1 for
  // the carapace level, we get a pretty decent progression: 3, 6, 9, 13, 18,
  // which is +3, +3, +3, +4, +5.
  rom.items.CarapaceShield.defense = rom.items.TannedHide.defense = 3;
  rom.items.PlatinumShield.defense = rom.items.BronzeArmor.defense = 9;
  rom.items.MirroredShield.defense = rom.items.PlatinumArmor.defense = 13;
  // For the high-end armors, we want to balance out the top three a bit
  // better.  Sacred shield already has lower defense (16) than the previous
  // one, as does battle armor (20), so we leave them be.  Psychos are
  // demoted from 32 to 20, and the no-extra-power armors get the 32.
  rom.items.PsychoArmor.defense = rom.items.PsychoShield.defense = 20;
  rom.items.CeramicSuit.defense = rom.items.BattleShield.defense = 32;

  // BUT... for now we don't want to make any changes, so fix it back.
  rom.items.CarapaceShield.defense = rom.items.TannedHide.defense = 2;
  rom.items.PlatinumShield.defense = rom.items.BronzeArmor.defense = 10;
  rom.items.MirroredShield.defense = rom.items.PlatinumArmor.defense = 14;
  rom.items.BattleArmor.defense = 24;
}

const rescaleShops = (rom: Rom, random?: Random) => {
  // Populate rescaled prices into the various rom locations.
  // Specifically, we read the available item IDs out of the
  // shop tables and then compute new prices from there.
  // If `random` is passed then the base price to buy each
  // item at any given shop will be adjusted to anywhere from
  // 50% to 150% of the base price.  The pawn shop price is
  // always 50% of the base price.

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
  const diff = seq(48 /*asm.expand('ScalingLevels')*/, x => x);
  rom.shops.rescale = true;
  // Tool shops scale as 2 ** (Diff / 10), store in 8ths
  rom.shops.toolShopScaling = diff.map(d => Math.round(8 * (2 ** (d / 10))));
  // Armor shops scale as 2 ** ((47 - Diff) / 12), store in 8ths
  rom.shops.armorShopScaling =
      diff.map(d => Math.round(8 * (2 ** ((47 - d) / 12))));

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

// const identifyKeyItemsForDifficultyBuffs = (rom: Rom) => {
//   // // Tag key items for difficulty buffs
//   // for (const get of rom.itemGets) {
//   //   const item = ITEMS.get(get.itemId);
//   //   if (!item || !item.key) continue;
//   //   get.key = true;
//   // }
//   // // console.log(report);
//   for (let i = 0; i < 0x49; i++) {
//     // NOTE - special handling for alarm flute until we pre-patch
//     const unique = (rom.prg[0x20ff0 + i] & 0x40) || i === 0x31;
//     const bit = 1 << (i & 7);
//     const addr = 0x1e110 + (i >>> 3);
//     rom.prg[addr] = rom.prg[addr] & ~bit | (unique ? bit : 0);
//   }
// };

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


// useful for debug even if not currently used
const [] = [hex];
