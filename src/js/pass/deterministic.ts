// Perform initial cleanup/setup of the ROM.

import {FlagSet} from '../flagset.js';
import {Rom} from '../rom.js';
import {Entrance, Exit, Flag, Location, Spawn} from '../rom/location.js';
import {MessageId} from '../rom/messageid.js';
import {GlobalDialog, LocalDialog} from '../rom/npc.js';
import {ShopType} from '../rom/shop.js';
import {hex} from '../rom/util.js';
import {assert} from '../util.js';

const [] = [hex]; // generally useful

export function deterministicPreParse(prg: Uint8Array): void {
  // Remove unnecessary statue fight triggers.  TODO - remove 1d location check
  prg[0x1a594] = 0xff; // just cut off two objects early.

  // Remove unnecessary oak entrance trigger (aa).  Redirect the dialog flag.
  prg[0x1cdc5] = 0xa8; // change flag to not use 043.
  prg[0x1a84c] = 0xff; // remove the aa trigger (last spawn in oak).

  // Remove unused item/trigger actions
  prg[0x1e06b] &= 7; // medical herb normal usage => action 05 to action 00
  prg[0x1e06f] &= 7; // magic ring itemuse[0] => action 05 to action 00
  prg[0x1e073] &= 7; // fruit of lime itemuse[0] => action 05 to action 00
  prg[0x1e077] &= 7; // antidote itemuse[0] => action 05 to action 00
  prg[0x1e07b] &= 7; // opel statue itemuse[0] => action 05 to action 00
  prg[0x1e084] &= 7; // warp boots itemuse[0] => action 04 to action 00
  prg[0x1e09b] &= 7; // windmill key itemuse[1] => action 05 to action 00
  prg[0x1e0b9] &= 7; // glowing lamp itemuse[0] => action 05 to action 00

  // Renumber mimics
  prg[0x19bb1] = 0x70; // fog lamp cave 3 (4a) north mimic
  prg[0x19bb5] = 0x71; // fog lamp cave 3 (4a) southwest mimic
  prg[0x19a77] = 0x72; // waterfall cave 1 (54) mimic
  prg[0x19deb] = 0x73; // evil spirit island 4 (6b) river right mimic
  prg[0x1a045] = 0x74; // mt hydra cave 8 (85) mimic
  prg[0x1a0e1] = 0x75; // stxy left (89) north mimic
  prg[0x1a0e5] = 0x76; // stxy right (89) north riverside mimic
  prg[0x1a0e9] = 0x77; // stxy right (89) south riverside mimic
  prg[0x1a605] = 0x78; // crypt left pit (a3) mimic
  prg[0x1a3c1] = 0x79; // karmine basement (b5) top middle mimic
  prg[0x1a3c5] = 0x7a; // karmine basement (b5) top right mimic
  prg[0x1a3c9] = 0x7b; // karmine basement (b5) bottom right mimic
}

export function deterministic(rom: Rom, flags: FlagSet): void {
  // NOTE: do this very early to make sure refs to warp point flags are
  // updated to reflect shifts (probably not an issue anymore now that
  // we track flag moves separately).
  addZombieWarp(rom);

  consolidateItemGrants(rom);
  addMezameTrigger(rom);
  normalizeSwords(rom, flags);

  fixCoinSprites(rom);
  fixChests(rom);

  makeBraceletsProgressive(rom);

  addTowerExit(rom);
  closeCaveEntrances(rom, flags);
  reversibleSwanGate(rom);
  adjustGoaFortressTriggers(rom);
  preventNpcDespawns(rom, flags);
  leafElderInSabreHeals(rom);
  if (flags.requireHealedDolphinToRide()) requireHealedDolphin(rom);
  if (flags.saharaRabbitsRequireTelepathy()) requireTelepathyForDeo(rom);

  adjustItemNames(rom, flags);

  // TODO - consider making a Transformation interface, with ordering checks
  alarmFluteIsKeyItem(rom, flags); // NOTE: pre-shuffle
  brokahanaWantsMado1(rom);
  if (flags.teleportOnThunderSword()) {
    teleportOnThunderSword(rom);
    // not Shyron_Temple since no-thunder-sword-for-massacre
    rom.townWarp.thunderSwordWarp = [rom.locations.Shyron.id, 0x41];
  } else {
    noTeleportOnThunderSword(rom);
  }

  undergroundChannelLandBridge(rom);
  if (flags.fogLampNotRequired()) fogLampNotRequired(rom, flags);

  if (flags.addEastCave()) {
    eastCave(rom, flags);
    if (flags.connectGoaToLeaf()) {
      connectGoaToLeaf(rom);
    }
  } else if (flags.connectLimeTreeToLeaf()) {
    connectLimeTreeToLeaf(rom);
  }
  evilSpiritIslandRequiresDolphin(rom);
  closeCaveEntrances(rom, flags);
  simplifyInvisibleChests(rom);
  addCordelWestTriggers(rom, flags);
  if (flags.disableRabbitSkip()) fixRabbitSkip(rom);

  fixReverseWalls(rom);
  if (flags.chargeShotsOnly()) disableStabs(rom);
  if (flags.orbsOptional()) orbsOptional(rom);

  patchTooManyItemsMessage(rom);
}

// Updates a few itemuse and trigger actions in light of consolidation
// around item granting.
function consolidateItemGrants(rom: Rom): void {
  rom.items.GlowingLamp.itemUseData[0].message.action = 0x0b;
}

// Adds a trigger action to mezame.  Use 87 leftover from rescuing zebu.
function addMezameTrigger(rom: Rom): void {
  const trigger = rom.nextFreeTrigger();
  trigger.used = true;
  trigger.conditions = [~rom.flags.AlwaysTrue.id];
  trigger.message = MessageId.of({action: 4});
  trigger.flags = [rom.flags.AlwaysTrue.id];
  const mezame = rom.locations.MezameShrine;
  mezame.spawns.push(Spawn.of({tile: 0x88, type: 2, id: trigger.id}));
}

function normalizeSwords(rom: Rom, flags: FlagSet) {
  // wind 1 => 1 hit               => 3
  // wind 2 => 1 hit               => 6
  // wind 3 => 2-3 hits 8MP        => 8

  // fire 1 => 1 hit               => 3
  // fire 2 => 3 hits              => 5
  // fire 3 => 4-6 hits 16MP       => 7

  // water 1 => 1 hit              => 3
  // water 2 => 1-2 hits           => 6
  // water 3 => 3-6 hits 16MP      => 8

  // thunder 1 => 1-2 hits spread  => 3
  // thunder 2 => 1-3 hits spread  => 5
  // thunder 3 => 7-10 hits 40MP   => 7

  rom.objects[0x10].atk = 3; // wind 1
  rom.objects[0x11].atk = 6; // wind 2
  rom.objects[0x12].atk = 8; // wind 3

  rom.objects[0x18].atk = 3; // fire 1
  rom.objects[0x13].atk = 5; // fire 2
  rom.objects[0x19].atk = 5; // fire 2
  rom.objects[0x17].atk = 7; // fire 3
  rom.objects[0x1a].atk = 7; // fire 3

  rom.objects[0x14].atk = 3; // water 1
  rom.objects[0x15].atk = 6; // water 2
  rom.objects[0x16].atk = 8; // water 3

  rom.objects[0x1c].atk = 3; // thunder 1
  rom.objects[0x1e].atk = 5; // thunder 2
  rom.objects[0x1b].atk = 7; // thunder 3
  rom.objects[0x1f].atk = 7; // thunder 3

  if (flags.slowDownTornado()) {
    // TODO - tornado (obj 12) => speed 07 instead of 08
    //      - lifetime is 480 => 70 maybe too long, 60 sweet spot?
    const tornado = rom.objects[0x12];
    tornado.speed = 0x07;
    tornado.data[0x0c] = 0x60; // increase lifetime (480) by 20%
  }
}

function fixCoinSprites(rom: Rom): void {
  for (const page of [0x60, 0x64, 0x65, 0x66, 0x67, 0x68,
                      0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6f]) {
    for (const pat of [0, 1, 2]) {
      rom.patterns[page << 6 | pat].pixels = rom.patterns[0x5e << 6 | pat].pixels;
    }
  }
  rom.objects[0x0c].metasprite = 0xa9;
}

/**
 * Fix the softlock that happens when you go through
 * a wall backwards by moving the exit/entrance tiles
 * up a bit and adjusting some tileEffects values.
 */
function fixReverseWalls(rom: Rom) {
  // adjust tile effect for back tiles of iron wall
  for (const t in [0x04, 0x05, 0x08, 0x09]) {
    rom.tileEffects[0xbc - 0xb3].effects[t] = 0x18;
    rom.tileEffects[0xb5 - 0xb3].effects[t] = 0x18;
  }
  // TODO - move all the entrances to y=20 and exits to yt=01
}

/** Make a land bridge in underground channel */
function undergroundChannelLandBridge(rom: Rom) {
  const {tiles} = rom.screens[0xa1];
  tiles[0x28] = 0x9f;
  tiles[0x37] = 0x23;
  tiles[0x38] = 0x23; // 0x8e;
  tiles[0x39] = 0x21;
  tiles[0x47] = 0x8d;
  tiles[0x48] = 0x8f;
  tiles[0x56] = 0x99;
  tiles[0x57] = 0x9a;
  tiles[0x58] = 0x8c;
}

function fogLampNotRequired(rom: Rom, flags: FlagSet) {
  const {
    flags: {AlwaysTrue, HealedDolphin, FogLamp, KensuInCabin, ReturnedFogLamp},
    items: {ShellFlute},
    locations: {BoatHouse, Portoa_FishermanHouse},
    npcs,
  } = rom;
    
  // Need to make several changes.
  // (1) dolphin only requires shell flute, make the flag check free
  //     unless healing is required.
  const requireHealed = flags.requireHealedDolphinToRide();
  ShellFlute.itemUseData[0].want =
      requireHealed ? AlwaysTrue.id : HealedDolphin.id;
  // (2) kensu 68 (@61) drops an item (67 magic ring)
  npcs.KensuInCabin.data[0] = 0x67;
  npcs.KensuInCabin.localDialogs.get(-1)![0].message.action = 0x0a;
  npcs.KensuInCabin.localDialogs.get(-1)![0].flags = [];
  npcs.KensuInCabin.spawnConditions.set(BoatHouse.id,
                                        [ReturnedFogLamp.id, ~KensuInCabin.id]);
  // (3) fisherman 64 spawns on fog lamp rather than shell flute
  npcs.Fisherman.spawnConditions.set(Portoa_FishermanHouse.id, [FogLamp.id]);

  // (4) fix up itemget 67 from itemget 64 (delete the flag)
  rom.itemGets[0x64].flags = [];
  rom.itemGets[0x67].copyFrom(rom.itemGets[0x64]);
  //rom.itemGets[0x67].flags = [0x0c1];

  // TODO - graphics screwed up - figure out if object action is changing
  // the pattern tables based on (e.g.) $600,x maybe?  Can we prevent it?

  // TODO - add a notes file about this.

}

/**
 * Remove timer spawns from all chests.  Mimics have already been
 * renumbered to be eunique (pre-parse).  Note that the renumbering
 * requires an assembly change ($3d3fd in preshuffle.s).
 */
function fixChests(rom: Rom): void {
  for (const loc of rom.locations) {
    for (const s of loc.spawns) {
      if (s.isChest()) s.timed = false;
    }
  }
  // TODO - find a better way to bundle asm changes? - but it's a mess
  //        with sharing labels, tracking clobbering, etc.
  // rom.assemble()
  //     .$('adc $10')
  //     .beq('label')
  //     .lsh()
  //     .lsh(`${addr},x`)
  //     .label('label');
  // rom.patch()
  //     .org(0x3d3fd)
  //     .byte(0xb0);

  // rom.code.replace(0x3c192, 0x3c1a7, `
  //     asl
  //     adc $10  ; do something
  //     bne +
  //      rts
  //   + jmp FooBar`);
  // rom.code.replaceExact(start, end, code);
  // rom.code.insert(page, `
  //     Label:  ; usable from elsewhere?
  //     - asl
  //       bcc -
  //       rts`);
}

function adjustGoaFortressTriggers(rom: Rom): void {
  const l = rom.locations;
  // Move Kelbesque 2 one full tile left.
  l.GoaFortress_Kelbesque.spawns[0].x -= 16;
  // Remove sage screen locks (except Kensu).
  l.GoaFortress_Zebu.spawns.splice(1, 1); // zebu screen lock trigger
  l.GoaFortress_Tornel.spawns.splice(2, 1); // tornel screen lock trigger
  l.GoaFortress_Asina.spawns.splice(2, 1); // asina screen lock trigger
  l.GoaFortress_Kensu.spawns.splice(3, 1); // kensu human screen lock trigger
  l.GoaFortress_Kensu.spawns.splice(1, 1); // kensu slime screen lock trigger
}

function alarmFluteIsKeyItem(rom: Rom, flags:FlagSet): void {
  const {
    locations: {WaterfallCave4},
    npcs: {WindmillGuard},
    items: {AlarmFlute},
  } = rom;

  // Move alarm flute to third row
  rom.itemGets[0x31].inventoryRowStart = 0x20;
  // Ensure alarm flute cannot be dropped
  // rom.prg[0x21021] = 0x43; // TODO - rom.items[0x31].???
  AlarmFlute.unique = true;
  // Ensure alarm flute cannot be sold
  AlarmFlute.basePrice = 0;

  if (flags.zebuStudentGivesItem()) {
    // Person 14 (Zebu's student): secondary item -> alarm flute
    WindmillGuard.data[1] = 0x31; // NOTE: Clobbers shuffled item!!!
  } else {
    WindmillGuard.data[1] = 0xff; // indicate nothing there: no slot.
  }

  // Remove alarm flute from shops (replace with other items)
  // NOTE - we could simplify this whole thing by just hardcoding indices.
  //      - if this is guaranteed to happen early, it's all the same.
  const replacements = [
    [0x21, 0.72], // fruit of power, 72% of cost
    [0x1f, 0.9], // lysis plant, 90% of cost
  ];
  let j = 0;
  for (const shop of rom.shops) {
    if (shop.type !== ShopType.TOOL) continue;
    for (let i = 0, len = shop.contents.length; i < len; i++) {
      if (shop.contents[i] !== 0x31) continue;
      const [item, priceRatio] = replacements[(j++) % replacements.length];
      shop.contents[i] = item;
      if (rom.shopDataTablesAddress) {
        // NOTE: this is broken - need a controlled way to convert price formats
        shop.prices[i] = Math.round(shop.prices[i] * priceRatio);
      }
    }
  }

  // Change flute of lime chest's (now-unused) itemget to have medical herb
  rom.itemGets[0x5b].itemId = 0x1d;
  // Change the actual spawn for that chest to be the mirrored shield chest
  WaterfallCave4.spawn(0x19).id = 0x10;

  // TODO - require new code for two uses
}

function brokahanaWantsMado1(rom: Rom): void {
  const {flags: {Karmine, Mado1}, npcs: {Brokahana}} = rom;
  const dialog = assert(Brokahana.localDialogs.get(-1))[0];
  if (dialog.condition !== ~Karmine.id) {
    throw new Error(`Bad brokahana condition: ${dialog.condition}`);
  }
  dialog.condition = ~Mado1.id;
}

function requireHealedDolphin(rom: Rom): void {
  const {
    flags: {HealedDolphin, ShellFlute},
    npcs: {Fisherman, FishermanDaughter},
  } = rom;
  // Normally the fisherman ($64) spawns in his house ($d6) if you have
  // the shell flute (236).  Here we also add a requirement on the healed
  // dolphin slot (025), which we keep around since it's actually useful.
  Fisherman.spawnConditions.set(0xd6, [ShellFlute.id, HealedDolphin.id]);
  // Also fix daughter's dialog ($7b).
  const daughterDialog = FishermanDaughter.localDialogs.get(-1)!;
  daughterDialog.unshift(daughterDialog[0].clone());
  daughterDialog[0].condition = ~HealedDolphin.id;
  daughterDialog[1].condition = ~ShellFlute.id;
}

function requireTelepathyForDeo(rom: Rom): void {
  const {
    flags: {Telepathy},
    npcs: {Deo, SaharaBunny},
  } = rom;
  // Not having telepathy (243) will trigger a "kyu kyu" (1a:12, 1a:13) for
  // both generic bunnies (59) and deo (5a).
  SaharaBunny.globalDialogs.push(GlobalDialog.of(~Telepathy.id, [0x1a, 0x12]));
  Deo.globalDialogs.push(GlobalDialog.of(~Telepathy.id, [0x1a, 0x13]));
}

function teleportOnThunderSword(rom: Rom): void {
  const {
    flags: {WarpShyron},
  } = rom;
  // itemget 03 sword of thunder => set 2fd shyron warp point
  rom.itemGets[0x03].flags.push(WarpShyron.id);
}

function noTeleportOnThunderSword(rom: Rom): void {
  // Change sword of thunder's action to bbe the same as other swords (16)
  rom.itemGets[0x03].acquisitionAction.action = 0x16;
}

function adjustItemNames(rom: Rom, flags: FlagSet): void {
  if (flags.leatherBootsGiveSpeed()) {
    // rename leather boots to speed boots
    const leatherBoots = rom.items[0x2f]!;
    leatherBoots.menuName = 'Speed Boots';
    leatherBoots.messageName = 'Speed Boots';
    if (flags.changeGasMaskToHazmatSuit()) {
      const gasMask = rom.items[0x29];
      gasMask.menuName = 'Hazmat Suit';
      gasMask.messageName = 'Hazmat Suit';
    }
  }

  // rename balls to orbs
  for (let i = 0x05; i < 0x0c; i += 2) {
    rom.items[i].menuName = rom.items[i].menuName.replace('Ball', 'Orb');
    rom.items[i].messageName = rom.items[i].messageName.replace('Ball', 'Orb');
  }
}

function makeBraceletsProgressive(rom: Rom): void {
  const {
    flags: {BallOfWind, TornadoBracelet},
    npcs: {Tornel},
  } = rom;
  // tornel's trigger needs both items
  const vanilla = Tornel.localDialogs.get(0x21)!;
  const patched = [
    vanilla[0], // already learned teleport
    vanilla[2], // don't have tornado bracelet
    vanilla[2].clone(), // will change to don't have orb
    vanilla[1], // have bracelet, learn teleport
  ];
  patched[1].condition = ~TornadoBracelet.id; // don't have bracelet
  patched[2].condition = ~BallOfWind.id; // don't have orb
  patched[3].condition = ~0;     // default
  Tornel.localDialogs.set(0x21, patched);
}

function simplifyInvisibleChests(rom: Rom): void {
  const {CordelPlainEast, KirisaMeadow, UndergroundChannel} = rom.locations;
  for (const location of [CordelPlainEast, KirisaMeadow, UndergroundChannel]) {
    for (const spawn of location.spawns) {
      // set the new "invisible" flag on the chest.
      if (spawn.isChest()) spawn.data[2] |= 0x20;
    }
  }
}

// Add the statue of onyx and possibly the teleport block trigger to Cordel West
function addCordelWestTriggers(rom: Rom, flags: FlagSet) {
  const {CordelPlainEast, CordelPlainWest} = rom.locations;
  for (const spawn of CordelPlainEast.spawns) {
    if (spawn.isChest() || (flags.disableTeleportSkip() && spawn.isTrigger())) {
      // Copy if (1) it's the chest, or (2) we're disabling teleport skip
      CordelPlainWest.spawns.push(spawn.clone());
    }
  }
}

function fixRabbitSkip(rom: Rom): void {
  for (const spawn of rom.locations.MtSabreNorth_Main.spawns) {
    if (spawn.isTrigger() && spawn.id === 0x86) {
      if (spawn.x === 0x740) {
        spawn.x += 16;
        spawn.y += 16;
      }
    }
  }
}

function addTowerExit(rom: Rom): void {
  const {TowerEntrance, Crypt_Teleporter} = rom.locations;
  const entrance = Crypt_Teleporter.entrances.length;
  const dest = Crypt_Teleporter.id;
  Crypt_Teleporter.entrances.push(Entrance.of({tile: 0x68}));
  TowerEntrance.exits.push(Exit.of({tile: 0x57, dest, entrance}));
  TowerEntrance.exits.push(Exit.of({tile: 0x58, dest, entrance}));
}

// Programmatically add a hole between valley of wind and lime tree valley
function connectLimeTreeToLeaf(rom: Rom): void {
  const {ValleyOfWind, LimeTreeValley} = rom.locations;

  ValleyOfWind.screens[5][4] = 0x10; // new exit
  LimeTreeValley.screens[1][0] = 0x1a; // new exit
  LimeTreeValley.screens[2][0] = 0x0c; // nicer mountains

  const windEntrance =
      ValleyOfWind.entrances.push(Entrance.of({x: 0x4ef, y: 0x578})) - 1;
  const limeEntrance =
      LimeTreeValley.entrances.push(Entrance.of({x: 0x010, y: 0x1c0})) - 1;

  ValleyOfWind.exits.push(
      Exit.of({x: 0x4f0, y: 0x560, dest: 0x42, entrance: limeEntrance}),
      Exit.of({x: 0x4f0, y: 0x570, dest: 0x42, entrance: limeEntrance}));
  LimeTreeValley.exits.push(
      Exit.of({x: 0x000, y: 0x1b0, dest: 0x03, entrance: windEntrance}),
      Exit.of({x: 0x000, y: 0x1c0, dest: 0x03, entrance: windEntrance}));
}

function closeCaveEntrances(rom: Rom, flags: FlagSet): void {
  // Destructure out a few locations by name
  const {
    flags: {AlwaysTrue},
    locations: {
      CordelPlainEast,
      CordelPlainWest,
      Desert2,
      GoaValley,
      KirisaMeadow,
      LimeTreeValley,
      SaharaOutsideCave,
      ValleyOfWind,
      WaterfallValleyNorth,
      WaterfallValleySouth,
    },
  } = rom;

  // Prevent softlock from exiting sealed cave before windmill started
  ValleyOfWind.entrances[1].y += 16;

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
  rom.screens[0x0a].tiles[0x38] = 0x01;
  rom.screens[0x0a].tiles[0x39] = 0x02;
  rom.screens[0x0a].tiles[0x48] = 0x03;
  rom.screens[0x0a].tiles[0x49] = 0x04;

  rom.screens[0x15].tiles[0x79] = 0x01;
  rom.screens[0x15].tiles[0x7a] = 0x02;
  rom.screens[0x15].tiles[0x89] = 0x03;
  rom.screens[0x15].tiles[0x8a] = 0x04;

  rom.screens[0x19].tiles[0x48] = 0x01;
  rom.screens[0x19].tiles[0x49] = 0x02;
  rom.screens[0x19].tiles[0x58] = 0x03;
  rom.screens[0x19].tiles[0x59] = 0x04;

  rom.screens[0x3e].tiles[0x56] = 0x01;
  rom.screens[0x3e].tiles[0x57] = 0x02;
  rom.screens[0x3e].tiles[0x66] = 0x03;
  rom.screens[0x3e].tiles[0x67] = 0x04;

  // NOTE: flag 2f0 is ALWAYS set - use it as a baseline.
  const flagsToClear: [Location, number][] = [
    [ValleyOfWind, 0x30], // valley of wind, zebu's cave
    [CordelPlainWest, 0x30], // cordel west, vampire cave
    [CordelPlainEast, 0x30], // cordel east, vampire cave
    [WaterfallValleyNorth, 0x00], // waterfall north, prison cave
    [WaterfallValleyNorth, 0x14], // waterfall north, fog lamp
    [WaterfallValleySouth, 0x74], // waterfall south, kirisa
    [KirisaMeadow, 0x10], // kirisa meadow
    [SaharaOutsideCave, 0x00], // cave to desert
    [Desert2, 0x41],
  ];
  if (flags.addEastCave() && flags.connectLimeTreeToLeaf()) {
    flagsToClear.push([LimeTreeValley, 0x10]);
  }
  if (flags.connectGoaToLeaf()) {
    flagsToClear.push([GoaValley, 0x01]);
  }
  for (const [loc, yx] of flagsToClear) {
    loc.flags.push(Flag.of({yx, flag: AlwaysTrue.id}));
  }

  function replaceFlag(loc: Location, yx: number, flag: number): void {
    for (const f of loc.flags) {
      if (f.yx === yx) {
        f.flag = flag;
        return;
      }
    }
    throw new Error(`Could not find flag to replace at ${loc}:${yx}`);
  };

  if (flags.paralysisRequiresPrisonKey()) { // close off reverse entrances
    // NOTE: we could also close it off until boss killed...?
    //  - const vampireFlag = ~rom.npcSpawns[0xc0].conditions[0x0a][0];
    //  -> kelbesque for the other one.
    const windmillFlag = 0x2ee;
    replaceFlag(CordelPlainWest, 0x30, windmillFlag);
    replaceFlag(CordelPlainEast, 0x30, windmillFlag);

    replaceFlag(WaterfallValleyNorth, 0x00, 0x2d8); // key to prison flag
    const explosion = Spawn.of({y: 0x060, x: 0x060, type: 4, id: 0x2c});
    const keyTrigger = Spawn.of({y: 0x070, x: 0x070, type: 2, id: 0xad});
    WaterfallValleyNorth.spawns.splice(1, 0, explosion);
    WaterfallValleyNorth.spawns.push(keyTrigger);
  }

  // rom.locations[0x14].tileEffects = 0xb3;

  // d7 for 3?

  // TODO - this ended up with message 00:03 and an action that gave bow of moon!

  // rom.triggers[0x19].message.part = 0x1b;
  // rom.triggers[0x19].message.index = 0x08;
  // rom.triggers[0x19].flags.push(0x2f6, 0x2f7, 0x2f8);
}

function eastCave(rom: Rom, flags: FlagSet): void {
  // TODO fill up graphics, etc --> $1a, $1b, $05 / $88, $b5 / $14, $02
  // Think aobut exits and entrances...?

  const {ValleyOfWind, LimeTreeValley, SealedCave1} = rom.locations;

  const loc1 = rom.locations.allocate(rom.locations.EastCave1);
  const loc2 = rom.locations.allocate(rom.locations.EastCave2);
  const loc3 = rom.locations.EastCave3;

  // NOTE: 0x9c can become 0x99 in top left or 0x97 in top right or bottom middle for a cave exit
  loc1.screens = [[0x9c, 0x84, 0x80, 0x83, 0x9c],
                  [0x80, 0x81, 0x83, 0x86, 0x80],
                  [0x83, 0x88, 0x89, 0x80, 0x80],
                  [0x81, 0x8c, 0x85, 0x82, 0x84],
                  [0x9e, 0x85, 0x9c, 0x98, 0x86]];

  loc2.screens = [[0x9c, 0x84, 0x9b, 0x80, 0x9b],
                  [0x80, 0x81, 0x81, 0x80, 0x81],
                  [0x80, 0x87, 0x8b, 0x8a, 0x86],
                  [0x80, 0x8c, 0x80, 0x85, 0x84],
                  [0x9c, 0x86, 0x80, 0x80, 0x9a]];

  for (const l of [loc1, loc2, loc3]) {
    l.bgm = 0x17; // mt sabre cave music?
    l.entrances = [];
    l.exits = [];
    l.pits = [];
    l.spawns = [];
    l.flags = [];
    l.height = l.screens.length;
    l.width = l.screens[0].length;
    l.extended = 0;
    l.tilePalettes = [0x1a, 0x1b, 0x05]; // rock wall
    l.tileset = 0x88;
    l.tileEffects = 0xb5;
    l.tilePatterns = [0x14, 0x02];
    l.spritePatterns = [...SealedCave1.spritePatterns] as [number, number];
    l.spritePalettes = [...SealedCave1.spritePalettes] as [number, number];
  }

  // Add entrance to valley of wind
  // TODO - maybe just do (0x33, [[0x19]]) once we fix that screen for grass
  ValleyOfWind.writeScreens2d(0x23, [
    [0x11, 0x0d],
    [0x09, 0xc2]]);
  rom.tileEffects[0].effects[0xc0] = 0;
  // TODO - do this once we fix the sea tileset
  // rom.screens[0xc2].tiles[0x5a] = 0x0a;
  // rom.screens[0xc2].tiles[0x5b] = 0x0a;

  // Connect maps
  loc1.connect(0x43, loc2, 0x44);
  loc1.connect(0x40, ValleyOfWind, 0x34);

  if (flags.connectLimeTreeToLeaf()) {
    // Add entrance to lime tree valley
    LimeTreeValley.resizeScreens(0, 1, 0, 0); // add one screen to left edge
    LimeTreeValley.writeScreens2d(0x00, [
      [0x0c, 0x11],
      [0x15, 0x36],
      [0x0e, 0x0f]]);
    loc1.screens[0][4] = 0x97; // down stair
    loc1.connect(0x04, LimeTreeValley, 0x10);
  }

  // Add monsters
  loc1.spawns.push(
    Spawn.of({screen: 0x21, tile: 0x87, timed: true, id: 0x2}),
    Spawn.of({screen: 0x12, tile: 0x88, timed: false, id: 0x2}),
    Spawn.of({screen: 0x13, tile: 0x89, timed: true, id: 0x2}),
    Spawn.of({screen: 0x32, tile: 0x68, timed: false, id: 0x2}),
    Spawn.of({screen: 0x41, tile: 0x88, timed: true, id: 0x2}),
    Spawn.of({screen: 0x33, tile: 0x98, timed: true, id: 0x2}),
    Spawn.of({screen: 0x03, tile: 0x88, timed: true, id: 0x2}),
  );
  loc2.spawns.push(
    Spawn.of({screen: 0x01, tile: 0x88, timed: true, id: 0x2}),
    Spawn.of({screen: 0x11, tile: 0x48, timed: false, id: 0x2}),
    Spawn.of({screen: 0x12, tile: 0x77, timed: true, id: 0x2}),
    Spawn.of({screen: 0x14, tile: 0x28, timed: false, id: 0x2}),
    Spawn.of({screen: 0x23, tile: 0x85, timed: true, id: 0x2}),
    Spawn.of({screen: 0x31, tile: 0x88, timed: true, id: 0x2}),
    Spawn.of({screen: 0x33, tile: 0x8a, timed: false, id: 0x2}),
    Spawn.of({screen: 0x34, tile: 0x98, timed: true, id: 0x2}),
    Spawn.of({screen: 0x41, tile: 0x82, timed: true, id: 0x2}),
  );
  if (!flags.zebuStudentGivesItem()) {
    // chest: alarm flute
    loc2.spawns.push(Spawn.of({y: 0x110, x: 0x478, type: 2, id: 0x31}));
  }
  if (flags.addExtraChecksToEastCave()) {
    // chest: medical herb
    loc2.spawns.push(Spawn.of({y: 0x110, x: 0x478, type: 2, id: 0x59}));
    // chest: mimic
    loc2.spawns.push(Spawn.of({y: 0x070, x: 0x108, type: 2, id: 0x70}));
  }
}

function connectGoaToLeaf(rom: Rom): void {
  const {GoaValley, EastCave2, EastCave3} = rom.locations;
  // Add a new cave to the top-left corner of Goa Valley.
  GoaValley.writeScreens2d(0x00, [
      [0x0c, 0xc1, 0x0d],
      [0x0e, 0x37, 0x35]]);
  // Add an extra down-stair to EastCave2 and a new 3-screen EastCave3 map.

  rom.locations.allocate(EastCave3);
  EastCave3.screens = [[0x9a],
                       [0x8f],
                       [0x9e]];
  EastCave3.height = 3;
  EastCave3.width = 1;

  // Add a rock wall (id=0).
  EastCave3.spawns.push(Spawn.from([0x18, 0x07, 0x23, 0x00]));
  EastCave3.flags.push(Flag.of({screen: 0x10, flag: rom.flags.alloc(0x200)}));

  // Make the connections.
  EastCave2.screens[4][0] = 0x99;
  EastCave2.connect(0x40, EastCave3, ~0x00);
  EastCave3.connect(0x20, GoaValley, 0x01);
}

function patchTooManyItemsMessage(rom: Rom) {
  rom.messages.parts[0x20][0x0f].text += '\nItem: [:ITEM:]';
}

function addZombieWarp(rom: Rom) {
  const {
    flags: {WarpZombie},
    locations: {ZombieTown},
  } = rom;
  // Make space for the new flag between Joel and Swan
  rom.flags.insertZombieWarpFlag();
  // Update the menu
  const message = rom.messages.parts[0x21][0];
  message.text = [
    ' {1a:Leaf}      {16:Brynmaer} {1d:Oak} ',
    '{0c:Nadare}\'s  {1e:Portoa}   {14:Amazones} ',
    '{19:Joel}      Zombie   {20:Swan} ',
    '{23:Shyron}    {18:Goa}      {21:Sahara}',
  ].join('\n');
  // Add a trigger to the entrance - there's already a spawn for 8a
  // but we can't reuse that since it's the same as the one outside
  // the main ESI entrance; so reuse a different one.
  const trigger = rom.nextFreeTrigger();
  trigger.used = true;
  trigger.conditions = [];
  trigger.message = MessageId.of({});
  trigger.flags = [WarpZombie.id]; // new warp point flag
  // Actually replace the trigger.
  for (const spawn of ZombieTown.spawns) {
    if (spawn.isTrigger() && spawn.id === 0x8a) {
      spawn.id = trigger.id;
    }
  }
  // Insert into the warp table.
  rom.townWarp.locations.splice(7, 0, ZombieTown.id);
  if (rom.townWarp.locations.pop() !== 0xff) throw new Error('unexpected');
  // ASM fixes should have happened in preshuffle.s
}

function evilSpiritIslandRequiresDolphin(rom: Rom) {
  rom.trigger(0x8a).conditions = [~rom.flags.CurrentlyRidingDolphin.id];
  rom.messages.parts[0x1d][0x10].text = `The cave entrance appears
to be underwater. You'll
need to swim.`;
}

function reversibleSwanGate(rom: Rom) {
  const {
    flags: {OpenedSwanGate},
    locations: {SwanGate},
    npcs: {SoldierGuard},
  } = rom;
  // Allow opening Swan from either side by adding a pair of guards on the
  // opposite side of the gate.
  SwanGate.spawns.push(
    // NOTE: Soldiers must come in pairs (with index ^1 from each other)
    Spawn.of({xt: 0x0a, yt: 0x02, type: 1, id: 0x2d}), // new soldier
    Spawn.of({xt: 0x0b, yt: 0x02, type: 1, id: 0x2d}), // new soldier
    Spawn.of({xt: 0x0e, yt: 0x0a, type: 2, id: 0xb3}), // new trigger: erase guards
  );

  // // NOTE: just use the actual flag instead?
  // // Guards ($2d) at swan gate ($73) ~ set 0ef after opening gate => condition for despawn
  // rom.npcs[0x2d].localDialogs.get(0x73)![0].flags.push(0x0ef);
  // // Despawn guard trigger requires 0ef
  // rom.trigger(0xb3).conditions.push(0x0ef);
  SoldierGuard.localDialogs.get(SwanGate.id)![0].flags.push(OpenedSwanGate.id);
  rom.trigger(0xb3).conditions.push(OpenedSwanGate.id);
  // TODO - can we do away with the trigger?  Just spawn them on the same condition...
}

function leafElderInSabreHeals(rom: Rom): void {
  const leafElder = rom.npcs[0x0d];
  const summitDialog = leafElder.localDialogs.get(0x35)![0];
  summitDialog.message.action = 0x17; // heal and disappear.
}

function preventNpcDespawns(rom: Rom, opts: FlagSet): void {
  function remove<T>(arr: T[], elem: T): void {
    const index = arr.indexOf(elem);
    if (index < 0) throw new Error(`Could not find element ${elem} in ${arr}`);
    arr.splice(index, 1);
  }
  function removeIf<T>(arr: T[], pred: (elem: T) => boolean): void {
    const index = arr.findIndex(pred);
    if (index < 0) throw new Error(`Could not find element in ${arr}`);
    arr.splice(index, 1);
  }

  // function dialog(id: number, loc: number = -1): LocalDialog[] {
  //   const result = rom.npcs[id].localDialogs.get(loc);
  //   if (!result) throw new Error(`Missing dialog $${hex(id)} at $${hex(loc)}`);
  //   return result;
  // }
  // function spawns(id: number, loc: number): number[] {
  //   const result = rom.npcs[id].spawnConditions.get(loc);
  //   if (!result) throw new Error(`Missing spawn condition $${hex(id)} at $${hex(loc)}`);
  //   return result;
  // }

  // Link some redundant NPCs: Kensu (7e, 74) and Akahana (88, 16)

  const {
    locations: {
      BoatHouse, Brynmaer,
      Crypt_Draygon2,
      Joel_Shed,
      MtSabreNorth_SummitCave, MtSabreWest_Upper,
      PortoaPalace_ThroneRoom, Portoa_AsinaRoom, Portoa_FortuneTeller,
      Shyron_Temple, StomHouse, Swan_DanceHall,
      WindmillCave, WaterfallCave4, WaterfallValleyNorth,
      ZebuCave, ZombieTown_HouseBasement,
    },
    items: {
      GlowingLamp, KeyToPrison, LovePendant, StatueOfOnyx,
    },
    npcs: {
      Akahana /* 16 */, AkahanaInBrynmaer, /* 82 */ Asina /* 62 */,
      AztecaInShyron /* 6e */,
      Clark /* 44 */, Draygon /* cb */, FortuneTeller /* 39 */,
      Kensu /* 7e */, KensuInCabin /* 68 */, KensuInSwan /* 74 */,
      LeafRabbit /* 13 */,
      OakChild /* 1f */, OakElder /* 1d */, OakMother /* 1e */,
      PortoaPalaceFrontGuard /* 34 */, PortoaQueen /* 38 */,
      PortoaThroneRoomBackDoorGuard /* 33 */, Rage /* c3 */,
      Stom /* 60 */, StonedAkahana /* 88 */,
      Tornel /* 5f */, WindmillGuard /* 14 */, Zebu /* 5e */,
    },
    flags,
  } = rom;

  KensuInSwan.link(Kensu.id);
  KensuInSwan.used = true;
  KensuInSwan.data = [...Kensu.data] as any;
  Kensu.data[0] = GlowingLamp.id;
  Swan_DanceHall.spawns.find(s => s.isNpc() && s.id === Kensu.id)!.id =
      KensuInSwan.id;
  LovePendant.itemUseData[0].want = 0x100 | KensuInSwan.id;

  // dialog is shared between 88 and 16.
  StonedAkahana.linkDialog(Akahana.id);

  // Make a new NPC for Akahana in Brynmaer; others won't accept the Statue of Onyx.
  // Linking spawn conditions and dialogs is sufficient, since the actual NPC ID
  // (16 or 82) is what matters for the trade-in
  AkahanaInBrynmaer.used = true;
  AkahanaInBrynmaer.link(Akahana.id);
  AkahanaInBrynmaer.data = [...Akahana.data] as any; // ensure give item
  Brynmaer.spawns.find(s => s.isNpc() && s.id === Akahana.id)!.id =
      AkahanaInBrynmaer.id;
  StatueOfOnyx.itemUseData[0].want = 0x100 | AkahanaInBrynmaer.id;

  // Leaf elder in house ($0d @ $c0) ~ sword of wind redundant flag
  // dialog(0x0d, 0xc0)[2].flags = [];
  //rom.itemGets[0x00].flags = []; // clear redundant flag

  // Leaf rabbit ($13) normally stops setting its flag after prison door opened,
  // but that doesn't necessarily open mt sabre.  Instead (a) trigger on 047
  // (set by 8d upon entering elder's cell).  Also make sure that that path also
  // provides the needed flag to get into mt sabre.
  LeafRabbit.dialog()[2].condition = flags.RescuedLeafElder.id;
  LeafRabbit.dialog()[2].flags.push(flags.TalkedToLeafRabbit.id);
  LeafRabbit.dialog()[3].flags.push(flags.TalkedToLeafRabbit.id);

  // Windmill guard ($14 @ $0e) shouldn't despawn after abduction (038),
  // but instead after giving the item (088)
  WindmillGuard.spawns(WindmillCave)[1] =
      ~flags.WindmillGuardAlarmFluteTradein.id;
  //dialog(0x14, 0x0e)[0].flags = []; // remove redundant flag ~ windmill key

  // Akahana ($16 / 88) ~ shield ring redundant flag
  //dialog(0x16, 0x57)[0].flags = [];
  // Don't disappear after getting barrier (note 88's spawns *not* linked to 16)
  remove(Akahana.spawns(WaterfallCave4), ~flags.BehindWhirlpool.id);
  remove(StonedAkahana.spawns(WaterfallCave4), ~flags.BehindWhirlpool.id);

  function reverseDialog(ds: LocalDialog[]): void {
    ds.reverse();
    for (let i = 0; i < ds.length; i++) {
      const next = ds[i + 1];
      ds[i].condition = next ? ~next.condition : ~0;
    }
  };

  // Oak elder ($1d) ~ sword of fire redundant flag
  //oakElderDialog[4].flags = [];
  // Make sure that we try to give the item from *all* post-insect dialogs
  OakElder.dialog()[0].message.action = 0x03;
  OakElder.dialog()[1].message.action = 0x03;
  OakElder.dialog()[2].message.action = 0x03;
  OakElder.dialog()[3].message.action = 0x03;

  // Oak mother ($1e) ~ insect flute redundant flag
  // TODO - rearrange these flags a bit (maybe ~045, ~0a0 ~041 - so reverse)
  //      - will need to change ballOfFire and insectFlute in depgraph
  (() => {
    const [killedInsect, gotItem, getItem, findChild] = OakMother.dialog();
    findChild.condition = ~flags.RescuedChild.id;
    //getItem.condition = ~0x227;
    //getItem.flags = [];
    gotItem.condition = ~0; // always true
    OakMother.dialog().splice(0, 4, findChild, getItem, killedInsect, gotItem);
  })();
  /// oakMotherDialog[2].flags = [];
  // // Ensure we always give item after insect.
  // oakMotherDialog[0].message.action = 0x03;
  // oakMotherDialog[1].message.action = 0x03;
  // reverseDialog(oakMotherDialog);

  // Reverse the other oak dialogs, too.
  for (const i of [0x20, 0x21, 0x22, 0x7c, 0x7d]) {
    reverseDialog(rom.npcs[i].dialog());
  }

  // Swap the first two oak child dialogs.
  OakChild.dialog().unshift(...OakChild.dialog().splice(1, 1));

  // Throne room back door guard ($33 @ $df) should have same spawn condition as queen
  // (020 NOT queen not in throne room AND 01b NOT viewed mesia recording)
  PortoaThroneRoomBackDoorGuard.spawnConditions.set(
      PortoaPalace_ThroneRoom.id,
      [~flags.QueenNotInThroneRoom.id, ~flags.MesiaRecording.id]);

  // Front palace guard ($34) vacation message keys off 01b instead of 01f
  PortoaPalaceFrontGuard.dialog()[1].condition = flags.MesiaRecording.id;

  // Queen's ($38) dialog needs quite a bit of work
  // Give item (flute of lime) even if got the sword of water
  PortoaQueen.dialog()[3].condition = flags.SwordOfWater.id; // "you found sword"
  PortoaQueen.dialog()[3].message.action = 0x03; //  => action 3 itemget
  // Ensure you can always make the queen go away.
  PortoaQueen.dialog()[4].flags.push(flags.PortoaQueenGoingAway.id);
  // Queen spawn condition depends on 01b (mesia recording) not 01f (ball of water)
  // This ensures you have both sword and ball to get to her (???)
  PortoaQueen.spawns(PortoaPalace_ThroneRoom)[1] = ~flags.MesiaRecording.id;
  PortoaQueen.spawns(Portoa_AsinaRoom)[0] = flags.MesiaRecording.id;
  PortoaQueen.dialog()[1].condition = flags.MesiaRecording.id; // reveal

  // Fortune teller ($39) should also not spawn based on mesia recording rather than orb
  FortuneTeller.spawns(Portoa_FortuneTeller)[1] = ~flags.MesiaRecording.id;

  // Clark ($44) moves after talking to him (08d) rather than calming sea (08f).
  // TODO - change 08d to whatever actual item he gives, then remove both flags
  Clark.spawnConditions.set(ZombieTown_HouseBasement.id, [~flags.Clark.id]);
  Clark.spawnConditions.set(Joel_Shed.id, [flags.Clark.id]);
  //dialog(0x44, 0xe9)[1].flags.pop(); // remove redundant itemget flag

  // Brokahana ($54) ~ warrior ring redundant flag
  //dialog(0x54)[2].flags = [];

  // Deo ($5a) ~ pendant redundant flag
  //dialog(0x5a)[1].flags = [];

  // Zebu ($5e) cave dialog (@ $10)
  // TODO - dialogs(0x5e, 0x10).rearrange(~0x03a, 0x00d, 0x038, 0x039, 0x00a, ~0x000);
  Zebu.localDialogs.set(ZebuCave.id, [
    LocalDialog.of(~flags.TalkedToZebuInCave.id,
                   [0x00, 0x1a], [flags.TalkedToZebuInCave.id]),
    LocalDialog.of(flags.LeafVillagersRescued.id, [0x00, 0x1d]),
    LocalDialog.of(flags.LeafAbduction.id, [0x00, 0x1c]), // 038 leaf attacked
    LocalDialog.of(flags.ZebuAtWindmill.id, [0x00, 0x1d]), // 039 learned refresh
    LocalDialog.of(flags.UsedWindmillKey.id, [0x00, 0x1b, 0x03]), // => refresh
    LocalDialog.of(~0, [0x00, 0x1d]),
  ]);
  // Don't despawn on getting barrier
  remove(Zebu.spawns(ZebuCave), ~flags.BehindWhirlpool.id); // remove 051 NOT learned barrier

  // Tornel ($5f) in sabre west ($21) ~ teleport redundant flag
  //dialog(0x5f, 0x21)[1].flags = [];
  // Don't despawn on getting barrier
  Tornel.spawnConditions.delete(MtSabreWest_Upper.id); // always spawn

  // Stom ($60): don't despawn on getting barrier
  Stom.spawnConditions.delete(StomHouse.id); // remove 051 NOT learned barrier

  // Asina ($62) in back room ($e1) gives flute of lime
  Asina.data[1] = rom.items.FluteOfLime.id;
  Asina.dialog(Portoa_AsinaRoom)[0].message.action = 0x11;
  Asina.dialog(Portoa_AsinaRoom)[2].message.action = 0x11;
  // Prevent despawn from back room after calming sea (~08f or ~283)
  remove(Asina.spawns(Portoa_AsinaRoom), ~flags.CalmedAngrySea.id);

  // Kensu in cabin ($68 @ $61) needs to be available even after visiting Joel.
  // Change him to just disappear after setting the rideable dolphin flag (09b),
  // and to not even show up at all unless the fog lamp was returned (021).
  KensuInCabin.spawnConditions.set(BoatHouse.id, [~flags.AbleToRideDolphin.id,
                                                  flags.ReturnedFogLamp.id]);
  KensuInCabin.dialog()[0].message.action = 0x02; // disappear

  // Azteca in Shyron (6e) shouldn't spawn after massacre (027)
  AztecaInShyron.spawns(Shyron_Temple).push(~flags.ShyronMassacre.id);
  // Also the dialog trigger (82) shouldn't happen
  rom.trigger(0x82).conditions.push(~flags.ShyronMassacre.id);

  // Kensu in lighthouse ($74/$7e @ $62) ~ redundant flag
  //dialog(0x74, 0x62)[0].flags = [];

  // Azteca ($83) in pyramid ~ bow of truth redundant flag
  //dialog(0x83)[0].condition = ~0x240;  // 240 NOT bow of truth
  //dialog(0x83)[0].flags = [];

  // Rage blocks on sword of water, not random item from the chest
  Rage.dialog()[0].condition = flags.SwordOfWater.id;

  // Remove useless spawn condition from Mado 1
  // rom.npcs[0xc4].spawnConditions.delete(0xf2); // always spawn

  // Draygon 2 ($cb @ location $a6) should despawn after being defeated.
  Draygon.spawnConditions.set(Crypt_Draygon2.id, [~flags.Draygon2.id]);

  // Fix Zebu to give key to stxy even if thunder sword is gotten (just switch the
  // order of the first two).  Also don't bother setting 03b since the new ItemGet
  // logic obviates the need.
  Zebu.dialog(Shyron_Temple)
      .unshift(...Zebu.dialog(Shyron_Temple).splice(1, 1));
  // zebuShyron[0].flags = [];

  // Shyron massacre ($80) requires key to stxy
  rom.trigger(0x80).conditions = [
    ~flags.ShyronMassacre.id,
    flags.TalkedToZebuInShyron.id,
    flags.SwordOfThunder.id,
  ];

  // Enter shyron ($81) should set warp no matter what
  rom.trigger(0x81).conditions = [];

  if (opts.barrierRequiresCalmSea()) {
    // Learn barrier ($84) requires calm sea
    rom.trigger(0x84).conditions.push(flags.CalmedAngrySea.id);
    // TODO - consider not setting 051 and changing the condition to match the item
  }
  //rom.trigger(0x84).flags = [];

  // Add an extra condition to the Leaf abduction trigger (behind zebu).  This ensures
  // all the items in Leaf proper (elder and student) are gotten before they disappear.
  rom.trigger(0x8c).conditions.push(flags.TalkedToZebuInCave.id);

  // More work on abduction triggers:
  // 1. Remove the 8d trigger in the front of the cell, swap it out
  //    for b2 (learn paralysis).
  rom.trigger(0x8d).used = false;
  for (const spawn of MtSabreNorth_SummitCave.spawns) {
    if (spawn.isTrigger() && spawn.id === 0x8d) spawn.id = 0xb2;
  }
  removeIf(WaterfallValleyNorth.spawns,
           spawn => spawn.isTrigger() && spawn.id === 0x8d);
  // 2. Set the trigger to require having killed kelbesque.
  rom.trigger(0xb2).conditions.push(flags.Kelbesque1.id);
  // 3. Also set the trigger to free the villagers and the elder.
  rom.trigger(0xb2).flags.push(
    ~flags.LeafVillagersCurrentlyAbducted.id,
    ~flags.LeafElderCurrentlyAbducted.id,
    flags.LeafVillagersRescued.id);
  // 4. Don't trigger the abduction in the first place if kelbesque dead
  rom.trigger(0x8c).conditions.push(~flags.Kelbesque1.id);
  // 5. Don't trigger rabbit block if kelbesque dead
  rom.trigger(0x86).conditions.push(~flags.Kelbesque1.id); // killed kelbesque
  // 6. Don't free villagers from using prison key
  remove(KeyToPrison.itemUseData[0].flags,
         ~flags.LeafVillagersCurrentlyAbducted.id);
  // rom.prg[0x1e0a3] = 0xc0;
  // rom.prg[0x1e0a4] = 0x00;

  // TODO - additional work on abduction trigger:
  //   - get rid of the flags on key to prison use
  //   - add a condition that abduction doesn't happen if rescued
  // Get rid of BOTH triggers in summit cave,  Instead, tie everything
  // to the elder dialog on top
  //   - if kelbesque still alive, maybe give a hint about weakness
  //   - if kelbesque dead then teach paralysis and set/clear flags
  //   - if paralysis learned then say something generic
  // Still need to keep the trigger in the front in case no
  // abduction yet
  //   - if NOT paralysis AND if NOT elder missing AND if kelbeque dead
  // ---> need special handling for two ways to get (like refresh)?
  //
  // Also add a check that the rabbit trigger is gone if rescued!



  // Paralysis trigger ($b2) ~ remove redundant itemget flag
  //rom.trigger(0xb2).conditions[0] = ~0x242;
  //rom.trigger(0xb2).flags.shift(); // remove 037 learned paralysis

  // Learn refresh trigger ($b4) ~ remove redundant itemget flag
  //rom.trigger(0xb4).conditions[1] = ~0x241;
  //rom.trigger(0xb4).flags = []; // remove 039 learned refresh

  // Teleport block on mt sabre is from spell, not slot
  rom.trigger(0xba).conditions[0] = ~flags.Teleport.id;

  // Portoa palace guard movement trigger ($bb) stops on 01b (mesia) not 01f (orb)
  rom.trigger(0xbb).conditions[1] = ~flags.MesiaRecording.id;

  // Remove redundant trigger 8a (slot 16) in zombietown ($65)
  //  -- note: no longer necessary since we repurpose it instead.
  // const {zombieTown} = rom.locations;
  // zombieTown.spawns = zombieTown.spawns.filter(x => !x.isTrigger() || x.id != 0x8a);

  // // Replace all dialog conditions from 00e to 243
  // for (const npc of rom.npcs) {
  //   for (const d of npc.allDialogs()) {
  //     if (d.condition === 0x00e) d.condition = 0x243;
  //     if (d.condition === ~0x00e) d.condition = ~0x243;
  //   }
  // }
}

// Hard mode flag: Hc - zero out the sword's collision plane
function disableStabs(rom: Rom): void {
  for (const o of [0x08, 0x09, 0x27]) {
    rom.objects[o].collisionPlane = 0;
  }
  // Also take warrior ring out of the picture... :troll:
  // rom.itemGets[0x2b].id = 0x5b; // medical herb from second flute of lime check
  rom.npcs.Brokahana.data[0] = rom.items.FruitOfLime.id;
}

function orbsOptional(rom: Rom): void {
  for (const obj of [0x10, 0x14, 0x18, 0x1d]) {
    // 1. Loosen terrain susceptibility of level 1 shots
    rom.objects[obj].terrainSusceptibility &= ~0x04;
    // 2. Increase the level to 2
    rom.objects[obj].level = 2;
  }
}
