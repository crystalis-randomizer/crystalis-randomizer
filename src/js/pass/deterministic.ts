// Perform initial cleanup/setup of the ROM.

import {FlagSet} from '../flagset.js';
import {Rom} from '../rom.js';
import {Entrance, Exit, Flag, Location, Spawn} from '../rom/location.js';
import {MessageId} from '../rom/messageid.js';
import {GlobalDialog, LocalDialog} from '../rom/npc.js';
import {ShopType} from '../rom/shop.js';
import {hex} from '../rom/util.js';
import {assert} from '../util.js';

export function deterministicPreParse(prg: Uint8Array): void {
  // Remove unused item/trigger actions
  prg[0x1e06b] &= 7; // medical herb normal usage => action 05 to action 00
  prg[0x1e06f] &= 7; // magic ring itemuse[0] => action 05 to action 00
  prg[0x1e073] &= 7; // fruit of lime itemuse[0] => action 05 to action 00
  prg[0x1e077] &= 7; // antidote itemuse[0] => action 05 to action 00
  prg[0x1e07b] &= 7; // opel statue itemuse[0] => action 05 to action 00
  prg[0x1e084] &= 7; // warp boots itemuse[0] => action 04 to action 00
  prg[0x1e09b] &= 7; // windmill key itemuse[1] => action 05 to action 00
  prg[0x1e0b9] &= 7; // glowing lamp itemuse[0] => action 05 to action 00
}

export function deterministic(rom: Rom, flags: FlagSet): void {

  // NOTE: this is done very early, make sure any references to warp
  // point flags are updated to reflect the new ones!
  addZombieWarp(rom);
  consolidateItemGrants(rom);

  addMezameTrigger(rom);

  normalizeSwords(rom, flags);

  fixCoinSprites(rom);

  makeBraceletsProgressive(rom);

  addTowerExit(rom);
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
  if (flags.fogLampNotRequired()) fogLampNotRequired(rom);

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

  fixMimics(rom); // NOTE: after all mimics
}

// Updates a few itemuse and trigger actions in light of consolidation we
// around item granting.
function consolidateItemGrants(rom: Rom): void {
  rom.items.GlowingLamp.itemUseData[0].message.action = 0x0b;
}

// Adds a trigger action to mezame.  Use 87 leftover from rescuing zebu.
function addMezameTrigger(rom: Rom): void {
  const trigger = rom.nextFreeTrigger();
  trigger.used = true;
  trigger.conditions = [~0x2f0];
  trigger.message = MessageId.of({action: 4});
  trigger.flags = [0x2f0];
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

function fogLampNotRequired(rom: Rom) {
  // Need to make several changes.
  // (1) dolphin only requires shell flute, make the flag check free (~000)
  rom.items[0x36].itemUseData[0].want = ~0;
  // (2) kensu 68 (@61) drops an item (67 magic ring)
  rom.npcs[0x68].data[0] = 0x67;
  rom.npcs[0x68].localDialogs.get(-1)![0].message.action = 0x0a;
  rom.npcs[0x68].localDialogs.get(-1)![0].flags = [];
  rom.npcs[0x68].spawnConditions.set(0x61, [0x21, ~0x0c1])
  // (3) fisherman 64 spawns on fog lamp rather than shell flute
  rom.npcs[0x64].spawnConditions.set(0xd6, [0x235]);

  // (4) fix up itemget 67 from itemget 64 (delete the flag)
  rom.itemGets[0x64].flags = [];
  rom.itemGets[0x67].copyFrom(rom.itemGets[0x64]);
  rom.itemGets[0x67].flags = [0x0c1];

  // TODO - graphics screwed up - figure out if object action is changing
  // the pattern tables based on (e.g.) $600,x maybe?  Can we prevent it?

  // TODO - add a notes file about this.

}

/**
 * Remove timer spawns, renumbers mimic spawns so that they're unique.
 * Runs before shuffle because we need to identify the slot.  Requires
 * an assembly change ($3d3fd in preshuffle.s)
 */
function fixMimics(rom: Rom): void {
  let mimic = 0x70;
  for (const loc of rom.locations) {
    for (const s of loc.spawns) {
      if (!s.isChest()) continue;
      s.timed = false;
      if (s.id >= 0x70) s.id = mimic++;
    }
  }
  // TODO - find a better way to bundle asm changes?
  // rom.assemble()
  //     .$('adc $10')
  //     .beq('label')
  //     .lsh()
  //     .lsh(`${addr},x`)
  //     .label('label');
  // rom.patch()
  //     .org(0x3d3fd)
  //     .byte(0xb0);
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

function alarmFluteIsKeyItem(rom: Rom, flags: FlagSet): void {
  const {WaterfallCave4} = rom.locations;

  // Move alarm flute to third row
  rom.itemGets[0x31].inventoryRowStart = 0x20;
  // Ensure alarm flute cannot be dropped
  // rom.prg[0x21021] = 0x43; // TODO - rom.items[0x31].???
  rom.items[0x31].unique = true;
  // Ensure alarm flute cannot be sold
  rom.items[0x31].basePrice = 0;

  if (flags.zebuStudentGivesItem()) {
    // Person 14 (Zebu's student): secondary item -> alarm flute
    rom.npcs[0x14].data[1] = 0x31; // NOTE: Clobbers shuffled item!!!
  } else {
    rom.npcs[0x14].data[1] = 0xff; // indicate nothing there: no slot.
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
  const brokahana = rom.npcs[0x54];
  const dialog = assert(brokahana.localDialogs.get(-1))[0];
  if (dialog.condition !== ~0x024) {
    throw new Error(`Bad brokahana condition: ${dialog.condition}`);
  }
  dialog.condition = ~0x067; // vanilla ball of thunder / defeated mado 1
}

function requireHealedDolphin(rom: Rom): void {
  // Normally the fisherman ($64) spawns in his house ($d6) if you have
  // the shell flute (236).  Here we also add a requirement on the healed
  // dolphin slot (025), which we keep around since it's actually useful.
  rom.npcs[0x64].spawnConditions.set(0xd6, [0x236, 0x025]);
  // Also fix daughter's dialog ($7b).
  const daughterDialog = rom.npcs[0x7b].localDialogs.get(-1)!;
  daughterDialog.unshift(daughterDialog[0].clone());
  daughterDialog[0].condition = ~0x025;
  daughterDialog[1].condition = ~0x236;
}

function requireTelepathyForDeo(rom: Rom): void {
  // Not having telepathy (243) will trigger a "kyu kyu" (1a:12, 1a:13) for
  // both generic bunnies (59) and deo (5a).
  rom.npcs[0x59].globalDialogs.push(GlobalDialog.of(~0x243, [0x1a, 0x12]));
  rom.npcs[0x5a].globalDialogs.push(GlobalDialog.of(~0x243, [0x1a, 0x13]));
}

function teleportOnThunderSword(rom: Rom): void {
  // itemget 03 sword of thunder => set 2fd shyron warp point
  rom.itemGets[0x03].flags.push(0x2fd);
  // dialog 62 asina in f2/f4 shyron -> action 1f (teleport to start)
  //   - note: f2 and f4 dialogs are linked.
  for (const i of [0, 1, 3]) {
    for (const loc of [0xf2, 0xf4]) {
      rom.npcs[0x62].localDialogs.get(loc)![i].message.action = 0x1f;
    }
  }
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
  // tornel's trigger needs both items
  const tornel = rom.npcs[0x5f];
  const vanilla = tornel.localDialogs.get(0x21)!;
  const patched = [
    vanilla[0], // already learned teleport
    vanilla[2], // don't have tornado bracelet
    vanilla[2].clone(), // will change to don't have orb
    vanilla[1], // have bracelet, learn teleport
  ];
  patched[1].condition = ~0x206; // don't have bracelet
  patched[2].condition = ~0x205; // don't have orb
  patched[3].condition = ~0;     // default
  tornel.localDialogs.set(0x21, patched);
}

function simplifyInvisibleChests(rom: Rom): void {
  for (const location of [rom.locations.CordelPlainEast,
                          rom.locations.UndergroundChannel,
                          rom.locations.KirisaMeadow]) {
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
  // Prevent softlock from exiting sealed cave before windmill started
  rom.locations.ValleyOfWind.entrances[1].y += 16;

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

  // Destructure out a few locations by name
  const {
    CordelPlainWest,
    CordelPlainEast,
    Desert2,
    GoaValley,
    LimeTreeValley,
    KirisaMeadow,
    SaharaOutsideCave,
    ValleyOfWind,
    WaterfallValleyNorth,
    WaterfallValleySouth,
  } = rom.locations;

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
  for (const [loc, screen] of flagsToClear) {
    loc.flags.push(Flag.of({screen, flag: 0x2f0}));
  }

  function replaceFlag(loc: Location, yx: number, flag: number): void {
    for (const f of loc.flags) {
      if (f.screen === yx) {
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

// @ts-ignore: not yet used
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
};

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

function addZombieWarp(rom: Rom) {
  // Make space for the new flag between Joel and Swan
  for (let i = 0x2f5; i < 0x2fc; i++) {
    rom.moveFlag(i, i - 1);
  }
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
  trigger.flags = [0x2fb]; // new warp point flag
  // Actually replace the trigger.
  for (const spawn of rom.locations.ZombieTown.spawns) {
    if (spawn.isTrigger() && spawn.id === 0x8a) {
      spawn.id = trigger.id;
    }
  }
  rom.townWarp.locations.splice(7, 0, rom.locations.ZombieTown.id);
  if (rom.townWarp.locations.pop() !== 0xff) throw new Error('unexpected');
  // ASM fixes should have happened in preshuffle.s
}

function evilSpiritIslandRequiresDolphin(rom: Rom) {
  rom.trigger(0x8a).conditions = [~0x0ee]; // new flag for riding dolphin
  rom.messages.parts[0x1d][0x10].text = `The cave entrance appears
to be underwater. You'll
need to swim.`;
}

function reversibleSwanGate(rom: Rom) {
  // Allow opening Swan from either side by adding a pair of guards on the
  // opposite side of the gate.
  rom.locations[0x73].spawns.push(
    // NOTE: Soldiers must come in pairs (with index ^1 from each other)
    Spawn.of({xt: 0x0a, yt: 0x02, type: 1, id: 0x2d}), // new soldier
    Spawn.of({xt: 0x0b, yt: 0x02, type: 1, id: 0x2d}), // new soldier
    Spawn.of({xt: 0x0e, yt: 0x0a, type: 2, id: 0xb3}), // new trigger: erase guards
  );

  // Guards ($2d) at swan gate ($73) ~ set 10d after opening gate => condition for despawn
  rom.npcs[0x2d].localDialogs.get(0x73)![0].flags.push(0x10d);

  // Despawn guard trigger requires 10d
  rom.trigger(0xb3).conditions.push(0x10d);
}

function leafElderInSabreHeals(rom: Rom): void {
  const leafElder = rom.npcs[0x0d];
  const summitDialog = leafElder.localDialogs.get(0x35)![0];
  summitDialog.message.action = 0x17; // heal and disappear.
}

function preventNpcDespawns(rom: Rom, flags: FlagSet): void {
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

  function dialog(id: number, loc: number = -1): LocalDialog[] {
    const result = rom.npcs[id].localDialogs.get(loc);
    if (!result) throw new Error(`Missing dialog $${hex(id)} at $${hex(loc)}`);
    return result;
  }
  function spawns(id: number, loc: number): number[] {
    const result = rom.npcs[id].spawnConditions.get(loc);
    if (!result) throw new Error(`Missing spawn condition $${hex(id)} at $${hex(loc)}`);
    return result;
  }

  // Link some redundant NPCs: Kensu (7e, 74) and Akahana (88, 16)
  // Use 74 for only Kensu in dance hall - nobody else will accept trade-in.
  rom.npcs[0x74].link(0x7e);
  rom.npcs[0x74].used = true;
  rom.npcs[0x74].data = [...rom.npcs[0x7e].data] as any;
  rom.locations.Swan_DanceHall.spawns.find(s => s.isNpc() && s.id === 0x7e)!.id = 0x74;
  rom.items.LovePendant.itemUseData[0].want = 0x174;

  // dialog is shared between 88 and 16.
  rom.npcs[0x88].linkDialog(0x16);

  // Given Kensu 7e a glowing lamp instead of change (Kensu 74 has that now)
  rom.npcs[0x7e].data[0] = 0x39; // glowing lamp

  // Make a new NPC for Akahana in Brynmaer; others won't accept the Statue of Onyx.
  // Linking spawn conditions and dialogs is sufficient, since the actual NPC ID
  // (16 or 82) is what matters for the trade-in
  rom.npcs[0x82].used = true;
  rom.npcs[0x82].link(0x16);
  rom.npcs[0x82].data = [...rom.npcs[0x16].data] as any; // ensure give item
  rom.locations.Brynmaer.spawns.find(s => s.isNpc() && s.id === 0x16)!.id = 0x82;
  rom.items.StatueOfOnyx.itemUseData[0].want = 0x182;

  // Leaf elder in house ($0d @ $c0) ~ sword of wind redundant flag
  // dialog(0x0d, 0xc0)[2].flags = [];
  //rom.itemGets[0x00].flags = []; // clear redundant flag

  // Leaf rabbit ($13) normally stops setting its flag after prison door opened,
  // but that doesn't necessarily open mt sabre.  Instead (a) trigger on 047
  // (set by 8d upon entering elder's cell).  Also make sure that that path also
  // provides the needed flag to get into mt sabre.
  dialog(0x13)[2].condition = 0x047;
  dialog(0x13)[2].flags = [0x0a9];
  dialog(0x13)[3].flags = [0x0a9];

  // Windmill guard ($14 @ $0e) shouldn't despawn after abduction (038),
  // but instead after giving the item (088)
  spawns(0x14, 0x0e)[1] = ~0x088; // replace flag ~038 => ~088
  //dialog(0x14, 0x0e)[0].flags = []; // remove redundant flag ~ windmill key

  // Akahana ($16 / 88) ~ shield ring redundant flag
  //dialog(0x16, 0x57)[0].flags = [];
  // Don't disappear after getting barrier (note 88's spawns not linked to 16)
  remove(spawns(0x16, 0x57), ~0x051);
  remove(spawns(0x88, 0x57), ~0x051);

  function reverseDialog(ds: LocalDialog[]): void {
    ds.reverse();
    for (let i = 0; i < ds.length; i++) {
      const next = ds[i + 1];
      ds[i].condition = next ? ~next.condition : ~0;
    }
  };

  // Oak elder ($1d) ~ sword of fire redundant flag
  const oakElderDialog = dialog(0x1d);
  //oakElderDialog[4].flags = [];
  // Make sure that we try to give the item from *all* post-insect dialogs
  oakElderDialog[0].message.action = 0x03;
  oakElderDialog[1].message.action = 0x03;
  oakElderDialog[2].message.action = 0x03;
  oakElderDialog[3].message.action = 0x03;

  // Oak mother ($1e) ~ insect flute redundant flag
  // TODO - rearrange these flags a bit (maybe ~045, ~0a0 ~041 - so reverse)
  //      - will need to change ballOfFire and insectFlute in depgraph
  const oakMotherDialog = dialog(0x1e);
  (() => {
    const [killedInsect, gotItem, getItem, findChild] = oakMotherDialog;
    findChild.condition = ~0x045;
    //getItem.condition = ~0x227;
    //getItem.flags = [];
    gotItem.condition = ~0;
    rom.npcs[0x1e].localDialogs.set(-1, [findChild, getItem, killedInsect, gotItem]);
  })();
  /// oakMotherDialog[2].flags = [];
  // // Ensure we always give item after insect.
  // oakMotherDialog[0].message.action = 0x03;
  // oakMotherDialog[1].message.action = 0x03;
  // reverseDialog(oakMotherDialog);

  // Reverse the other oak dialogs, too.
  for (const i of [0x20, 0x21, 0x22, 0x7c, 0x7d]) {
    reverseDialog(dialog(i));
  }

  // Swap the first two oak child dialogs.
  const oakChildDialog = dialog(0x1f);
  oakChildDialog.unshift(...oakChildDialog.splice(1, 1));

  // Throne room back door guard ($33 @ $df) should have same spawn condition as queen
  // (020 NOT queen not in throne room AND 01b NOT viewed mesia recording)
  rom.npcs[0x33].spawnConditions.set(0xdf,  [~0x020, ~0x01b]);

  // Front palace guard ($34) vacation message keys off 01b instead of 01f
  dialog(0x34)[1].condition = 0x01b;

  // Queen's ($38) dialog needs quite a bit of work
  // Give item (flute of lime) even if got the sword of water
  dialog(0x38)[3].condition = 0x202; // "you found sword" (condition 202)
  dialog(0x38)[3].message.action = 0x03; //  => action 3
  // Ensure you can always make the queen go away.
  dialog(0x38)[4].flags.push(0x09c);     // set 09c queen going away
  // Queen spawn condition depends on 01b (mesia recording) not 01f (ball of water)
  // This ensures you have both sword and ball to get to her (???)
  spawns(0x38, 0xdf)[1] = ~0x01b;  // throne room: 01b NOT mesia recording
  spawns(0x38, 0xe1)[0] = 0x01b;   // back room: 01b mesia recording
  dialog(0x38)[1].condition = 0x01b;     // reveal condition: 01b mesia recording

  // Fortune teller ($39) should also not spawn based on mesia recording rather than orb
  spawns(0x39, 0xd8)[1] = ~0x01b;  // fortune teller room: 01b NOT

  // Clark ($44) moves after talking to him (08d) rather than calming sea (08f).
  // TODO - change 08d to whatever actual item he gives, then remove both flags
  rom.npcs[0x44].spawnConditions.set(0xe9, [~0x08d]); // zombie town basement
  rom.npcs[0x44].spawnConditions.set(0xe4, [0x08d]);  // joel shed
  //dialog(0x44, 0xe9)[1].flags.pop(); // remove redundant itemget flag

  // Brokahana ($54) ~ warrior ring redundant flag
  //dialog(0x54)[2].flags = [];

  // Deo ($5a) ~ pendant redundant flag
  //dialog(0x5a)[1].flags = [];

  // Zebu ($5e) cave dialog (@ $10)
  // TODO - dialogs(0x5e, 0x10).rearrange(~0x03a, 0x00d, 0x038, 0x039, 0x00a, ~0x000);
  rom.npcs[0x5e].localDialogs.set(0x10, [
    LocalDialog.of(~0x03a, [0x00, 0x1a], [0x03a]), // 03a NOT talked to zebu in cave -> Set 03a
    LocalDialog.of( 0x00d, [0x00, 0x1d]), // 00d leaf villagers rescued
    LocalDialog.of( 0x038, [0x00, 0x1c]), // 038 leaf attacked
    LocalDialog.of( 0x039, [0x00, 0x1d]), // 039 learned refresh
    LocalDialog.of( 0x00a, [0x00, 0x1b, 0x03]), // 00a windmill key used -> teach refresh
    LocalDialog.of(~0x000, [0x00, 0x1d]),
  ]);
  // Don't despawn on getting barrier
  remove(spawns(0x5e, 0x10), ~0x051); // remove 051 NOT learned barrier

  // Tornel ($5f) in sabre west ($21) ~ teleport redundant flag
  //dialog(0x5f, 0x21)[1].flags = [];
  // Don't despawn on getting barrier
  rom.npcs[0x5f].spawnConditions.delete(0x21); // remove 051 NOT learned barrier

  // Stom ($60): don't despawn on getting barrier
  rom.npcs[0x60].spawnConditions.delete(0x1e); // remove 051 NOT learned barrier

  // Asina ($62) in back room ($e1) gives flute of lime
  const asina = rom.npcs[0x62];
  asina.data[1] = 0x28;
  dialog(asina.id, 0xe1)[0].message.action = 0x11;
  dialog(asina.id, 0xe1)[2].message.action = 0x11;
  // Prevent despawn from back room after defeating sabera (~08f)
  remove(spawns(asina.id, 0xe1), ~0x08f);

  // Kensu in cabin ($68 @ $61) needs to be available even after visiting Joel.
  // Change him to just disappear after setting the rideable dolphin flag (09b),
  // and to not even show up at all unless the fog lamp was returned (021).
  rom.npcs[0x68].spawnConditions.set(0x61, [~0x09b, 0x021]);
  dialog(0x68)[0].message.action = 0x02; // disappear

  // Azteca in Shyron (6e) shouldn't spawn after massacre (027)
  rom.npcs[0x6e].spawnConditions.get(0xf2)!.push(~0x027);
  // Also the dialog trigger (82) shouldn't happen
  rom.trigger(0x82).conditions.push(~0x027);

  // Kensu in lighthouse ($74/$7e @ $62) ~ redundant flag
  //dialog(0x74, 0x62)[0].flags = [];

  // Azteca ($83) in pyramid ~ bow of truth redundant flag
  //dialog(0x83)[0].condition = ~0x240;  // 240 NOT bow of truth
  //dialog(0x83)[0].flags = [];

  // Rage blocks on sword of water, not random item from the chest
  dialog(0xc3)[0].condition = 0x202;

  // Remove useless spawn condition from Mado 1
  rom.npcs[0xc4].spawnConditions.delete(0xf2); // always spawn

  // Draygon 2 ($cb @ location $a6) should despawn after being defeated.
  rom.npcs[0xcb].spawnConditions.set(0xa6, [~0x28d]); // key on back wall destroyed

  // Fix Zebu to give key to stxy even if thunder sword is gotten (just switch the
  // order of the first two).  Also don't bother setting 03b since the new ItemGet
  // logic obviates the need.
  const zebuShyron = rom.npcs[0x5e].localDialogs.get(0xf2)!;
  zebuShyron.unshift(...zebuShyron.splice(1, 1));
  // zebuShyron[0].flags = [];

  // Shyron massacre ($80) requires key to stxy
  rom.trigger(0x80).conditions = [
    ~0x027, // not triggered massacre yet
     0x03b, // got item from key to stxy slot
     0x2fd, // shyron warp point triggered
     // 0x203, // got sword of thunder - NOT ANY MORE!
  ];

  // Enter shyron ($81) should set warp no matter what
  rom.trigger(0x81).conditions = [];

  if (flags.barrierRequiresCalmSea()) {
    // Learn barrier ($84) requires calm sea
    rom.trigger(0x84).conditions.push(0x283); // 283 calmed the sea
    // TODO - consider not setting 051 and changing the condition to match the item
  }
  //rom.trigger(0x84).flags = [];

  // Add an extra condition to the Leaf abduction trigger (behind zebu).  This ensures
  // all the items in Leaf proper (elder and student) are gotten before they disappear.
  rom.trigger(0x8c).conditions.push(0x03a); // 03a talked to zebu in cave

  // More work on abduction triggers:
  // 1. Remove the 8d trigger in the front of the cell, swap it out
  //    for b2 (learn paralysis).
  rom.trigger(0x8d).used = false;
  for (const spawn of rom.locations.MtSabreNorth_SummitCave.spawns) {
    if (spawn.isTrigger() && spawn.id === 0x8d) spawn.id = 0xb2;
  }
  removeIf(rom.locations.WaterfallValleyNorth.spawns,
           spawn => spawn.isTrigger() && spawn.id === 0x8d);
  // 2. Set the trigger to require having killed kelbesque.
  rom.trigger(0xb2).conditions.push(0x102); // killed kelbesque
  // 3. Also set the trigger to free the villagers and the elder.
  rom.trigger(0xb2).flags.push(~0x084, ~0x085, 0x00d);
  // 4. Don't trigger the abduction in the first place if kelbesque dead
  rom.trigger(0x8c).conditions.push(~0x102); // killed kelbesque
  // 5. Don't trigger rabbit block if kelbesque dead
  rom.trigger(0x86).conditions.push(~0x102); // killed kelbesque
  // 6. Don't free villagers from using prison key
  rom.prg[0x1e0a3] = 0xc0;
  rom.prg[0x1e0a4] = 0x00;

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
  rom.trigger(0xba).conditions[0] = ~0x244; // ~03f -> ~244

  // Portoa palace guard movement trigger ($bb) stops on 01b (mesia) not 01f (orb)
  rom.trigger(0xbb).conditions[1] = ~0x01b;

  // Remove redundant trigger 8a (slot 16) in zombietown ($65)
  //  -- note: no longer necessary since we repurpose it instead.
  // const {zombieTown} = rom.locations;
  // zombieTown.spawns = zombieTown.spawns.filter(x => !x.isTrigger() || x.id != 0x8a);

  // Replace all dialog conditions from 00e to 243
  for (const npc of rom.npcs) {
    for (const d of npc.allDialogs()) {
      if (d.condition === 0x00e) d.condition = 0x243;
      if (d.condition === ~0x00e) d.condition = ~0x243;
    }
  }
}

// Hard mode flag: Hc - zero out the sword's collision plane
function disableStabs(rom: Rom): void {
  for (const o of [0x08, 0x09, 0x27]) {
    rom.objects[o].collisionPlane = 0;
  }
  // Also take warrior ring out of the picture... :troll:
  // rom.itemGets[0x2b].id = 0x5b; // medical herb from second flute of lime check
  rom.npcs[0x54].data[0] = 0x20;
}

function orbsOptional(rom: Rom): void {
  for (const obj of [0x10, 0x14, 0x18, 0x1d]) {
    // 1. Loosen terrain susceptibility of level 1 shots
    rom.objects[obj].terrainSusceptibility &= ~0x04;
    // 2. Increase the level to 2
    rom.objects[obj].level = 2;
  }
}
