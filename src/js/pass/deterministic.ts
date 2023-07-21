// Perform initial cleanup/setup of the ROM.

import {FlagSet} from '../flagset';
import {Rom} from '../rom';
import {Spawn} from '../rom/location';
import {MessageId} from '../rom/messageid';
import {GlobalDialog, LocalDialog} from '../rom/npc';
import {ShopType} from '../rom/shop';
import {Trigger} from '../rom/trigger';
import {hex, Mutable} from '../rom/util';
import {assert} from '../util';
import {Monster} from '../rom/monster';
import {Patterns} from '../rom/pattern';
import { readLittleEndian } from '../rom/util';

const [] = [hex]; // generally useful

function write(arr: Uint8Array, start: number, ...data: (number|string)[]) {
  let j = start;
  let i = 0;
  let value!: string|number;
  while ((value = data[i++]) != null) {
    if (typeof value === 'number') {
      arr[j++] = value;
    } else if (typeof value === 'string') {
      for (const c of value) {
        arr[j++] = c.charCodeAt(0);
      }
    } else {
      throw new Error('bad data');
    }
  }
}

export function deterministicPreParse(prg: Uint8Array): void {
  // Remove unnecessary statue fight triggers.  TODO - remove 1d location check
  prg[0x1a594] = 0xff; // just cut off two objects early.

  // Remove unnecessary oak entrance trigger (aa).  Redirect the dialog flag.
  prg[0x1cdc5] = 0xa8; // change flag to not use 043.
  prg[0x1a176] = 0xff; // remove the 83 trigger from goa fortress entrance.
  prg[0x1a84c] = 0xff; // remove the aa trigger (last spawn in oak).

  // Remove broken (unused) kensu dialog in swan tavern - original reads
  // part of the next area's local dialogs as flags to set, including 140.
  prg[0x1d843] = 0xa0; // change e0 (expecting follow-up flags) to a0.

  // Remove unused item/trigger actions
  prg[0x1e06b] &= 7; // medical herb normal usage => action 05 to action 00
  prg[0x1e06f] &= 7; // magic ring itemuse[0] => action 05 to action 00
  prg[0x1e073] &= 7; // fruit of lime itemuse[0] => action 05 to action 00
  prg[0x1e077] &= 7; // antidote itemuse[0] => action 05 to action 00
  prg[0x1e07b] &= 7; // opel statue itemuse[0] => action 05 to action 00
  prg[0x1e084] &= 7; // warp boots itemuse[0] => action 04 to action 00
  prg[0x1e09b] &= 7; // windmill key itemuse[1] => action 05 to action 00
  prg[0x1e0b9] &= 7; // glowing lamp itemuse[0] => action 05 to action 00

  prg[0x1e105] = 0x2f; // change UsedBowOfTruth from 086 to fixed 02f (6485:80)

  prg[0x1e277] = 0x00; // remove flag 0a1 from amazones warp (trigger 90)
  prg[0x1e366] = 0x40; // remove unread 08e flag from sabera trap (trigger b6)
  prg[0x1e371] = 0x00; // remove flag 0a2 from portoa castle bridge (trigger b7)

  // guard paralysis flags are moved hardcoded now
  prg[0x1e387] = 0x00; // remove condition 09e from palace guard (trigger bb)
  prg[0x1e391] = 0x00; // remove condition 099 from amazones guard (trigger bc)

  // Custom shooting walls: mark walls as shooting
  write(prg, 0x1a168, 0x33, 0x33); // front of goa fortress
  write(prg, 0x1a48e, 0x33, 0x33); // oasis cave

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

  write(prg, 0x1e0b7, 0xc0, 0x00); // Remove shell flute use flag (never read)
  write(prg, 0x1e32a, 0xc0, 0x00); // Remove prison openable flag (trigger ad)
  write(prg, 0x1e330, 0xc0, 0x00); // Remove stxy openable flag (trigger ae)
  write(prg, 0x1e336, 0xc0, 0x00); // Remove altar usable flag (trigger af)
  write(prg, 0x1e0e0, 0xc0, 0x00); // Remove unused flute of lime itemuse flag
  write(prg, 0x1e0e6, 0xc0, 0x00); // Remove unused flute of lime itemuse flag

  // Swan gate guards spawn exactly based on gate being closed (2b3).
  // Also remove the despawn trigger (we can't move the guards because
  // the gate animation needs to be in slot e).
  prg[0x1c803] = 0x00; // remove ~066 from spawn condition 2c @ 38
  write(prg, 0x1c80d, 0xa2, 0xb3); // spawn condition 2d @ 73
  prg[0x1aa86] = 0xfe; // trigger -> unused spawn

  // TODO - these are transitional until we move the logic elsewhere
  write(prg, 0x7d6d5,
        0x25, 0x29,  // 25 statue of onyx use -> 29 gas mask
        0x39, 0x3a,  // 39 glowing lamp use -> 3a statue of gold
        0x3b, 0x47,  // 3b love pendant use -> 47 change
        0x3c, 0x3e,  // 3c kirisa plant use -> 3e bow of moon
        0x84, 0x46,  // 84 angry sea trigger -> 46 barrier
        0xb2, 0x42,  // b2 summit trigger -> 42 paralysis
        0xb4, 0x41,  // b4 windmill cave trigger -> 41 refresh
        0xff);       // for bookkeeping purposes, not actually used

  // Create a new metasprite for the shade/wraith enemy shadow so if the
  // player edited the shadow metasprite then it won't give an advantage to
  // the player
  const METASPRITE_TABLE = 0x3845c;
  const SHADOW_METASPRITE_ID = 0xa7;
  const NEW_METASPRITE_ID = 0x9a;
  const UNUSED_METASPRITE_DATA = 0x88e3 + 0x30000;
  const origptr = readLittleEndian(prg, METASPRITE_TABLE + (SHADOW_METASPRITE_ID << 1)) + 0x30000;
  const shadowdata = prg.slice(origptr, origptr + 10);
  // add the new pointer in an unused slot
  write(prg, METASPRITE_TABLE + (NEW_METASPRITE_ID << 1), UNUSED_METASPRITE_DATA & 0xff, (UNUSED_METASPRITE_DATA >> 8) & 0xff);
  // update to use the second enemy palette (enemy palettes always have black as the 3rd color?)
  shadowdata[4] |= 0x03;
  shadowdata[8] |= 0x03;
  // and write the data into unused space in metasprite 0x11
  write(prg, UNUSED_METASPRITE_DATA, ...shadowdata);
  // now update the shadows's metasprite (shadow 1 and shadow 2)
  const OBJECT_DATA_SHADOW1 = 0x1b683;
  const OBJECT_DATA_SHADOW2 = 0x1b80d;
  prg[OBJECT_DATA_SHADOW1 + 2] = NEW_METASPRITE_ID;
  prg[OBJECT_DATA_SHADOW2 + 2] = NEW_METASPRITE_ID;
  // and also update the metasprite id in $06c0 and $06e0 (ObjectDirMetaspriteBase) since that gets copied into
  // the metasprite every frame for reasons.
  prg[OBJECT_DATA_SHADOW1 + 18] = NEW_METASPRITE_ID;
  prg[OBJECT_DATA_SHADOW1 + 19] = NEW_METASPRITE_ID;
  prg[OBJECT_DATA_SHADOW2 + 18] = NEW_METASPRITE_ID;
  prg[OBJECT_DATA_SHADOW2 + 19] = NEW_METASPRITE_ID;
  // When checking that the attack hit a shadow, it checks the metasprite id, so update that check too.
  // change cmp #$a7 to cmp #NEW_METASPRITE_ID
  prg[0x350f7] = NEW_METASPRITE_ID;

  // Rename the default name to "Simea".
  write(prg, 0x2656e, "Simea", 0x10, 0, "     ", 0x10, 0);
}

export function deterministic(rom: Rom, flags: FlagSet): void {
  // NOTE: do this very early to make sure refs to warp point flags are
  // updated to reflect shifts (probably not an issue anymore now that
  // we track flag moves separately).
  addZombieWarp(rom);

  removeWarpTriggers(rom);
  consolidateItemGrants(rom);
  addMezameTrigger(rom);
  normalizeSwords(rom, flags);

  fixFlyableWalls(rom);
  fixMonsterTerrain(rom);
  fixCrystalis(rom);
  fixOpelStatue(rom);
  fixCoinSprites(rom);
  fixChests(rom);
  preventBossSoftlocks(rom);

  makeBraceletsProgressive(rom);

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

  evilSpiritIslandRequiresDolphin(rom);
  channelItemRequiresDolphin(rom);
  simplifyInvisibleChests(rom);
  addCordelWestTriggers(rom, flags);
  if (flags.disableRabbitSkip()) fixRabbitSkip(rom);
  if (flags.disableFlightStatueSkip()) fixFlightStatueSkip(rom);
  patchLimeTreeLake(rom, flags);

  fixReverseWalls(rom);
  if (flags.chargeShotsOnly()) disableStabs(rom);
  if (flags.orbsOptional()) orbsOptional(rom);
  if (flags.noBowMode()) noBowMode(rom);

  patchTooManyItemsMessage(rom);

  if (flags.hardcoreMode()) hardcoreMode(rom);

  if (flags.shouldUpdateHud()) {
    useNewStatusBarGraphics(rom);
    rom.writeMonsterNames = true;
  }
  if (flags.shouldColorSwordElements()) useElementSwordColors(rom);

  if (flags.hasStatTracking()) updateGraphicsForStatTracking(rom);

  fixWildWarp(rom);

  swapMimicAndRecoverGraphics(rom);
}

function updateGraphicsForStatTracking(rom: Rom): void {
  // Change those 4 freed up tiles to be clear background tiles (one for each color in the palette)
  const page = 0x54 << 6;
  const tileOffset = 0x29;
  for (let i = 0; i < 4; i++) {
    rom.patterns.set(page, tileOffset + i, Patterns.BLANK_TILES[i]);
  }

  // Check that we haven't done this already (NOTE: this is an ugly hack
  // that's only required because we're touching the PRG array directly).
  if (rom.prg[0x22eea] === 0x28) return;

  // Change the bottom right 16x16 square of the rabbit hopping through the field
  // in the credits to use a different square. The original had a custom grass
  // graphic that uses 4 tiles and frankly is hard to notice at all.
  // Changing this frees up those 4 tiles so we can reuse them as background tiles
  // in the final scene
  rom.prg[0x22eea] = 0x28;

  // now replace any of the $29-$2c tiles in $23004 - $23304 with the new color tiles
  const startAddr = 0x23004;
  const endAddr = 0x23304;
  // the original color tiles are $2a-$2d, so we need to offset by one.
  const blankOffset = 0x80 - 1;
  for (let addr = startAddr; addr < endAddr; addr++) {
    if (rom.prg[addr] >= 0x29 && rom.prg[addr] <= 0x2d) {
      // console.log(`updated: ${addr.toString(16)} from ${rom.prg[addr].toString(16)} to ${(rom.prg[addr] + blankOffset).toString(16)}`)
      rom.prg[addr] += blankOffset;
    }
  }

  // now the goofy part. This ruins Draygon2 fight scene because the same tile offsets are drawn
  // whether the game has the draygon 2 bank active or the credits bank active,
  // and so the tile sets are no longer matching between the two.
  // we can fix this adding some new squares to the end of the 16x16 square lookup table
  // that uses the original tile addresses, and relocate the tiles that this scene draws
  // to use the newly created offsets.

  // Create a new blank BG tile at 0xa0
  const origBlankSquare = 0x2a;
  const newBlankOffset = 0xa0;
  for (let addr = startAddr; addr < endAddr; addr += 0xc0) {
    rom.prg[addr + newBlankOffset] = origBlankSquare;
  }
  // have draygon two fight use the new blank tile offset
  const newTileOffsetMapping = new Map<number, number>([
    [0x42,newBlankOffset],
  ])
  const draygon2StartAddr = 0x22c85;
  const draygon2EndAddr = 0x22cd2;
  for (let addr = draygon2StartAddr; addr < draygon2EndAddr; addr++) {
    if (newTileOffsetMapping.has(rom.prg[addr]))
      rom.prg[addr] = newTileOffsetMapping.get(rom.prg[addr])!;
  }
  // patch up the offsets 0x7b - 0x7f which are only used by draygon 2
  // so that they also use the original blank
  for (let addr = startAddr; addr < endAddr; addr += 0xc0) {
    for (let offset = 0x7b; offset <= 0x7f; offset++)
      if (rom.prg[addr + offset] == origBlankSquare + blankOffset)
        rom.prg[addr + offset] = origBlankSquare;
  }

  // Now we need to clear up some room for the HUD palette.
  // The final screen has a mostly unused palette thats super close to another,
  // so just replace them no one will notice :^)

  // update the attributes for the nametable to replace any that use palette 2
  const replacePalette = 0x3;
  const withPalette = 0x2;
  const theendAttrOffset = 0x233f8;
  const theendAttrEnd = 0x23438;
  for (let addr = theendAttrOffset; addr < theendAttrEnd; addr++) {
    let newAttr = rom.prg[addr];
    for (let j = 0; j < 8; j += 2) {
      const oldPal = replacePalette << j;
      const newPal = withPalette << j;
      if ((newAttr & oldPal) == oldPal) {
        // unset the previous palette for this attr and or in the new one
        newAttr = (newAttr & (0xff ^ (0b11 << j))) | newPal;
      }
    }
    rom.prg[addr] = newAttr;
  }

  const theendPaletteOffset = 0x23438;
  const replacedPaletteAddr = 0x4 * replacePalette;
  const hudPalette = [0x0f, 0x30, 0x0f, 0x11]; //[0x0f, 0x30, 0x11, 0x0f];
  for (let i = 0; i< hudPalette.length; i++) {
    rom.prg[theendPaletteOffset + replacedPaletteAddr + i] = hudPalette[i];
  }


  // Replace the 3rd color in the rock palette color with the one used in the replaced palette.
  // This brown color bleeds into the trees above the rocks, but its much
  // more green/brown than the original, so its easier on the eyes.
  // The end result is theres a slightly less vibrant brown used on the left side of the rocks
  // which is almost unnoticable unless you put the two side by side
  rom.prg[theendPaletteOffset + withPalette * 4 + 0x3] = 0x8;

  // Last but not least, move THE END sprite over to the right side so it doesn't block the stats
  const theendSpriteXStartAddr = 0x236da;
  const theendSpriteEndAddr = 0x23746;
  // just add 0x80 to each of the individual sprites x position
  for (let addr = theendSpriteXStartAddr; addr < theendSpriteEndAddr; addr+=4) {
    rom.prg[addr] += 0x80;
  }

  // And now we have the entire end credits mixed around such that we have
  // - the HUD palette in index 3
  // - THE END sprite moved to the right
  // - attributes cleaned up to use only 3 palettes on the cliff side view scene
  // - draygon 2 cleaned up to use the original blank tile
  // - all other tiles used from the IntroMovie bank replaced into the Credits bank
  //   (leaving us free to bank switch that CHR for the HUD bank)

}

function useElementSwordColors(rom: Rom): void {
  function swapTiles(start: number, thunder?: number) {
    for (let addr = 0; addr <= 0xa; addr++) {
      if (addr === 8) continue;
      const p = rom.patterns.get(addr | start);
      const orig = [...p.pixels];
      for (let i = 0; i < p.pixels.length; i++) {
        p.pixels[i] = orig[i ^ 8];
        if ((i >>> 3) === thunder) p.pixels[i] |= orig[i];
      }
    }
  }
  swapTiles(0x1090); // wind
  swapTiles(0x10d0); // fire
  swapTiles(0x1110); // water
  swapTiles(0x1150); // thunder
  swapTiles(0x1190); // crystalis
}

function useNewStatusBarGraphics(rom: Rom): void {
  const page = 0x38 << 6
  rom.patterns.set(page, 0x0, Patterns.HUD_LF);
  rom.patterns.set(page, 0x1, Patterns.HUD_PW);
  rom.patterns.set(page, 0x2, Patterns.HUD_EY);
  rom.patterns.set(page, 0x3, Patterns.HUD_LV);
  rom.patterns.set(page, 0x4, Patterns.HUD_DL);
  rom.patterns.set(page, 0x5, Patterns.HUD_MP);
  rom.patterns.set(page, 0x6, Patterns.HUD_EX);
  rom.patterns.set(page, 0x1a, Patterns.HUD_CLOSE_LEFT);
  rom.patterns.set(page, 0x1b, Patterns.HUD_CLOSE_RIGHT);
}

// Updates a few itemuse and trigger actions in light of consolidation
// around item granting.
function consolidateItemGrants(rom: Rom): void {
  rom.items.GlowingLamp.itemUseData[0].message.action = 0x0b;
}

// Adds a trigger action to mezame.  Use 87 leftover from rescuing zebu.
function addMezameTrigger(rom: Rom): void {
  const trigger = rom.nextFreeTrigger('mezame');
  trigger.used = true;
  trigger.conditions = [~rom.flags.AlwaysTrue.id];
  trigger.message = MessageId.of({action: 4});
  trigger.flags = [rom.flags.AlwaysTrue.id];
  const mezame = rom.locations.MezameShrine;
  mezame.spawns.push(Spawn.of({tile: 0x88, type: 2, id: trigger.id}));
}

// The _WARP_FLAGS_TABLE asm option removes the need for explicit triggers
// to set the warp point flags, and instead works by checking the new location
// against the TownWarp table between loading the map and loading the NPCs.
function removeWarpTriggers(rom: Rom): void {
  const warpTriggers = new Set([
    0x81, // enter shyron
    0x8b, // enter joel
    0x90, // enter amazones
    // 0x92, // enter underground channel - NOTE: not a town warp...!
    0x99, // enter leaf
    0xa6, // enter brynmaer
    0xa7, // enter nadare
    0xa8, // enter portoa
    0xa9, // enter swan
    0xaa, // enter oak
    0xab, // enter goa
    0xac, // enter sahara
    rom.allocatedTriggers.get('zombie warp'), // NOTE: may be undefined
  ]);
  for (const location of rom.locations) {
    if (!location.used) continue;
    location.spawns = location.spawns.filter(
        // retain all non-triggers and all non-matching triggers
        spawn => !spawn.isTrigger() || !warpTriggers.has(spawn.id));
  }
  // TODO: deallocate these triggers so they can be reassigned!
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

  rom.objects[0x1c].atk = 3; // thunder 1 (unused alias?)
  rom.objects[0x1d].atk = 3; // thunder 1
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

// Add code to ensure Draygon 2 and Giant Insect respawn without their
// items once they've been used.
function preventBossSoftlocks(rom: Rom) {
  const trigger = rom.trigger(0xa0);
  trigger.used = true;
  trigger.conditions = [];
  trigger.flags = [];
  trigger.message = MessageId.of({part: 0, index: 0, action: 0x15});

  rom.objects[0x5e].data[0xd] = 0xfe; // object action 7e instead of 7f
  rom.items.InsectFlute.itemUseData[0].flags = [rom.flags.UsedInsectFlute.id];
}

function fixOpelStatue(rom: Rom) {
  // Don't select Opel Statue at all.  This patches the table at $2103b
  // that translates an item ID to a "selected item" index, i.e. each
  // type of item maps to a series 1..N.  In this case, we just remap
  // Opel Statue to zero so that it looks like nothing is selected.
  rom.items.OpelStatue.selectedItemValue = 0;
}

function fixCoinSprites(rom: Rom): void {
  for (const page of [0x60, 0x64, 0x65, 0x66, 0x67, 0x68,
                      0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6f]) {
    for (const pat of [0, 1, 2]) {
      rom.patterns.set(page << 6, pat, rom.patterns.get(0x5e << 6, pat).pixels);
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
    flags: {AlwaysTrue, InjuredDolphin, FogLamp,
            KensuInCabin, ReturnedFogLamp},
    items: {ShellFlute},
    locations: {BoatHouse, Portoa_FishermanHouse},
    npcs,
  } = rom;
    
  // Need to make several changes.
  // (1) dolphin only requires shell flute, make the flag check free
  //     unless healing is required.
  const requireHealed = flags.requireHealedDolphinToRide();
  ShellFlute.itemUseData[0].want =
      requireHealed ? InjuredDolphin.id : AlwaysTrue.id;
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
 * renumbered to be unique (pre-parse).  Note that the renumbering
 * requires an assembly change ($7d3fd in preshuffle.s).
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
    items: {AlarmFlute},
    flags: {TalkedToZebuStudent, ZebuStudent},
    locations: {MezameShrine, Leaf_StudentHouse, WaterfallCave4, ZebuCave},
    npcs: {WindmillGuard, Zebu},
  } = rom;

  // Move alarm flute to third row
  rom.itemGets[0x31].inventoryRowStart = 0x20;
  // Ensure alarm flute cannot be dropped
  // rom.prg[0x21021] = 0x43; // TODO - rom.items[0x31].???
  AlarmFlute.unique = true;
  // Ensure alarm flute cannot be sold
  AlarmFlute.basePrice = 0;

  
  if (flags.zebuStudentGivesItem()) {
    // Zebu student (aka windmill guard): secondary item -> alarm flute
    WindmillGuard.data[1] = 0x31;
  } else {
    // Actually make use of the TalkedToZebuStudet flag;
    WindmillGuard.data[1] = 0xff; // indicate nothing there: no slot.
    const dialog = WindmillGuard.dialog(Leaf_StudentHouse)[0];
    dialog.condition = ~TalkedToZebuStudent.id;
    dialog.flags.push(TalkedToZebuStudent.id);
    replace(Zebu.spawns(ZebuCave), ZebuStudent.id, TalkedToZebuStudent.id);
    // Alarm flute and a medical herb are in chests in mezame
    MezameShrine.spawns.push(Spawn.of({screen: 0, tile: 0x9b, type: 2, id: 0x31}));
    MezameShrine.spawns.push(Spawn.of({screen: 0, tile: 0x95, type: 2, id: 0x49}));
    ZebuStudent.unsafeRename('Mezame Right Chest');
    rom.flags[0x149].unsafeRename('Mezame Left Chest');
    rom.itemGets[0x49].itemId = rom.items.MedicalHerb.id;
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
    flags: {InjuredDolphin, ShellFlute},
    npcs: {Fisherman, FishermanDaughter},
  } = rom;
  // Normally the fisherman ($64) spawns in his house ($d6) if you have
  // the shell flute (236).  Here we also add a requirement on the healed
  // dolphin slot (025), which we keep around since it's actually useful.
  Fisherman.spawnConditions.set(0xd6, [ShellFlute.id, InjuredDolphin.id]);
  // Also fix daughter's dialog ($7b).
  const daughterDialog = FishermanDaughter.localDialogs.get(-1)!;
  daughterDialog.unshift(daughterDialog[0].clone());
  daughterDialog[0].condition = ~InjuredDolphin.id;
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

function fixFlightStatueSkip(rom: Rom): void {
  // Switch to a wider hitbox that prevents sneaking around the edge.
  // Options:
  //   $17 is ridiculously wide, but actually a little shorter.
  //       Main downside is that the vertical alignment is different,
  //       so it hits when player is below and doesn't hit right above.
  //   $0e is only slightly wider, but taller.  This causes the beam
  //       to hit several pixels away from an actual visual collision.
  //   $06 is unused, so we can repurpose it.  We add 6 horizontal
  //       pixels and 2 vertical pixels to each side from the original
  //       hitbox 1, which seems to
  //       be the minimum
  const oldHitbox = rom.hitboxes[rom.objects.guardianStatueMissile.hitbox];
  const newHitbox = rom.hitboxes[6];
  rom.objects.guardianStatueMissile.hitbox = newHitbox.id;
  newHitbox.x0 = oldHitbox.x0 - 6;
  newHitbox.w  = oldHitbox.w  + 12;
  newHitbox.y0 = oldHitbox.y0 - 2;
  newHitbox.h  = oldHitbox.h  + 4;
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
  const trigger = rom.nextFreeTrigger('zombie warp');
  trigger.used = true;
  trigger.conditions = [];
  trigger.message = MessageId.of({});
  trigger.flags = [WarpZombie.id]; // new warp point flag
  // Actually replace the trigger.
  for (const spawn of ZombieTown.spawns) {
    if (spawn.isTrigger() && spawn.id === 0x8a) spawn.id = trigger.id;
  }
  // Insert into the warp table.
  rom.townWarp.locations.splice(7, 0, ZombieTown.id);
  if (rom.townWarp.locations.pop() !== 0xff) throw new Error('unexpected');
  // ASM fixes should have happened in preshuffle.s
}

function evilSpiritIslandRequiresDolphin(rom: Rom) {
  const {flags: {CurrentlyRidingDolphin},
         locations: {AngrySea, EvilSpiritIsland1}} = rom;
  rom.trigger(0x8a).conditions = [~CurrentlyRidingDolphin.id];
  rom.messages.parts[0x1d][0x10].text = `This cave ceiling is too
low to fly in.`;
  removeIf(AngrySea.spawns, (s) => s.isTrigger() && s.id === 0x8a);
  EvilSpiritIsland1.spawns.push(Spawn.of({
    x: 0x058,
    y: 0x0a0,
    type: 2,
    id: 0x8a,
  }));
}

function channelItemRequiresDolphin(rom: Rom) {
  const trigger = rom.nextFreeTrigger('channel item');
  trigger.used = true;
  trigger.conditions =
      [rom.flags.CurrentlyRidingDolphin.id,
       ~rom.flags.UndergroundChannelUnderwaterChest.id]; // ~0x13b
  const message = rom.messages.alloc();
  message.text = 'Dolphin: {:HERO:}, I just found a [3b:Love Pendant] under the water!';
  trigger.message =
      MessageId.of({part: message.part, index: message.id, action: 0xf});
  const spawn = rom.locations.UndergroundChannel.spawns.find(s => s.isChest())!;
  spawn.data[2] = 2; // set to a trigger
  spawn.yt++; // move it down one tile
  spawn.id = trigger.id;
  rom.itemGets.actionGrants.set(trigger.id, 0x3b);
}

function leafElderInSabreHeals(rom: Rom): void {
  const leafElder = rom.npcs[0x0d];
  const summitDialog = leafElder.localDialogs.get(0x35)![0];
  summitDialog.message.action = 0x17; // heal and disappear.
}

// Prevent Rage skip by adding trees on either side of entrance.
// TODO - make this optional? account for it in logic?
function patchLimeTreeLake(rom: Rom, flags: FlagSet): void {
  const loc = rom.locations.LimeTreeLake;
  const screen = rom.screens[rom.metascreens.limeTreeLake.sid];

  // NOTE: we no longer need to make unwalkable green tiles.
  // rom.metatilesets.lime.getTile(0x7c).setEffects(6);
  // rom.metatilesets.lime.getTile(0x7f).setEffects(6);
  // rom.metatilesets.lime.getTile(0x7b).setTiles([0x7f, 0x7f, 0x7f, 0x7f])
  //     .setAttrs(0).setEffects(6); //.replaceIn(rom.metascreens.limeTreeLake);

  if (flags.disableRageSkip()) {
    // Shift the whole top part of the screen down.
    screen.set2d(0x20, screen.get2d(0x00, 0x8f));
    // Remove the (now lower) branch sticking out the right side of the tree.
    screen.set2d(0x2a, screen.get2d(0x3a, 0x01));
    // Smooth out the ugly line between the 2nd and 3rd row of leaves.
    screen.set2d(0x10, screen.get2d(0x20, 0x04));
    screen.set2d(0x1a, screen.get2d(0x2a, 0x05));
    // Fix up a little more of the border that the branch blocked.
    screen.set2d(0x1b, screen.get2d(0x00, 0x10));
    // // Replace most of the bottom row of land with water, except a small tongue.
    // screen.set2d(0xa0, [
    //   [0x76, 0x76, 0x76, 0x76, 0x76, 0x76, 0x77, 0x78, 0x79,
    //    0x7a, 0x76, 0x76, 0x76, 0x76, 0x76, 0x76]]);

    // Move spawns and exits down.
    for (const spawn of loc.spawns) {
      spawn.tile += 0x20;
    }
    const e = rom.metascreens.limeTreeLake.findExitByType('cave');
    (e as Mutable<typeof e>).entrance += 0x2000;
    (e as Mutable<typeof e>).exits = e.exits.map(ex => ex + 0x20);
  } else {
    // Make a prettier landing, just because we can.
    screen.set2d(0x90, [
      [0x76, 0x76, 0x76, 0x76, 0x77, 0x78, null, null, null,
       null, 0x79, 0x7a, 0x76, 0x76, 0x76, 0x76],
      [0x76, 0x76, 0x77, 0x78, null, null, null, null, null,
       null, null, null, 0x79, 0x7a, 0x76, 0x76],
    ]);
  }
}

function preventNpcDespawns(rom: Rom, opts: FlagSet): void {

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
      Leaf_ElderHouse,
      MtSabreNorth_SummitCave, MtSabreWest_Upper,
      PortoaPalace_ThroneRoom, Portoa_PalaceEntrance,
      Portoa_AsinaRoom, Portoa_FortuneTeller,
      Shyron_Temple, StomHouse, Swan_DanceHall, Swan_Tavern,
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
      LeafElder /* 0d */, LeafRabbit /* 13 */,
      OakChild /* 1f */, OakElder /* 1d */, OakMother /* 1e */,
      PortoaPalaceFrontGuard /* 34 */, PortoaQueen /* 38 */,
      PortoaThroneRoomBackDoorGuard /* 33 */, Rage /* c3 */,
      Stom /* 60 */, StonedAkahana /* 88 */,
      Tornel /* 5f */, WindmillGuard /* 14 */, Zebu /* 5e */,
    },
    flags,
  } = rom;

  Kensu.localDialogs.delete(Swan_Tavern.id); // unused dialog
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

  // Lead elder needs to give item even if windmill key was used.
  // This is mostly irrelevant with vanilla placement, but if the elder is not
  // immediately available, it can become a problem.
  LeafElder.dialog(Leaf_ElderHouse)
      .splice(0, 0, ...LeafElder.dialog(Leaf_ElderHouse).splice(2, 1));

  // Leaf rabbit ($13) normally stops setting its flag after prison door opened,
  // but that doesn't necessarily open mt sabre.  Instead (a) trigger on 047
  // (set by 8d upon entering elder's cell).  Also make sure that that path also
  // provides the needed flag to get into mt sabre.
  LeafRabbit.dialog()[2].condition = flags.RescuedLeafElder.id;
  LeafRabbit.dialog()[2].flags.push(flags.TalkedToLeafRabbit.id);
  LeafRabbit.dialog()[3].flags.push(flags.TalkedToLeafRabbit.id);

  // Windmill guard in cave ($14 @ $0e) shouldn't despawn after abduction (038),
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
  for (let i = 0; i < 4; i++) {
    const dlg = OakElder.dialog()[i];
    if (dlg.condition !== rom.flags.OakElder.id) dlg.message.action = 0x03;
  }

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

  // Prevent despawn from back room after calming sea (~08f or ~283)
  remove(Asina.spawns(Portoa_AsinaRoom), ~flags.CalmedAngrySea.id);

  // Add an extra NPC in Portoa throne room to give Flute of Lime if
  // the queen is not there.
  // I wanted to make this be the queen's lady-in-waiting, but it doesn't
  // really work with the patterns as they are.  We could switch the 4a to
  // instead be 49 and then the guard becomes the lady (we'd want to switch
  // to the pink palette as well).  But that doesn't really buy us much.
  const guard2 = rom.npcs[0x34];
  guard2.spawnConditions.set(PortoaPalace_ThroneRoom.id,
                             [flags.MesiaRecording.id,
                              ~flags.PortoaQueen.id]);
  guard2.localDialogs.set(Portoa_PalaceEntrance.id,
                          guard2.localDialogs.get(-1)!);
  guard2.data[0] = rom.items.FluteOfLime.id;
  const guard2Message = rom.messages.alloc();
  guard2Message.text = "The queen left this for you.";
  guard2.localDialogs.set(PortoaPalace_ThroneRoom.id, [
    LocalDialog.of(~flags.PortoaQueen.id, [guard2Message.part,
                                           guard2Message.id, 0x03]),
    LocalDialog.of(~0, [0x0a, 0x0e]), // "Be careful" (or 14:04 "Good luck.")
  ]);
  PortoaPalace_ThroneRoom.spawns.push(Spawn.of({yt: 3, xt: 12, type: 1,
                                                patternBank: 1,
                                                id: guard2.id}));

  // The last thing to do with Portoa Queen is to split her dialog across two
  // separate locations.  When area shuffle is on, access to the throne room
  // may not guarantee access to Asina's back room.  In vanilla, the queen's
  // dialog is a single chain and it relies on synchronizing spawn conditions
  // with dialog flags to ensure the right dialog is in the right place, but
  // our logic can't figure this out, so it thinks you can get Recover from
  // the throne room if you've seen the answering machine, which is not actually
  // true.  Instead, split out the first two dialogs into a separate location.
  PortoaQueen.localDialogs.set(Portoa_AsinaRoom.id,
                               PortoaQueen.dialog().splice(0, 2));
  PortoaQueen.localDialogs.set(PortoaPalace_ThroneRoom.id,
                               PortoaQueen.dialog());
  PortoaQueen.localDialogs.delete(-1);

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
  rom.bossKills.kensuLighthouse.data2[0] = 0;

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
  remove(KeyToPrison.itemUseData[0].flags,
         flags.LeafVillagersRescued.id);
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
  // NOTE: this is now done in flags.defrag
  //replace(rom.trigger(0xba).conditions, ~0x03f, ~flags.Teleport.id);

  // Portoa palace guard movement trigger ($bb) stops on 01b (mesia) not 01f (orb)
  replace(rom.trigger(0xbb).conditions, ~flags.Rage.id, ~flags.MesiaRecording.id);

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
  // Warrior ring now functions as a "turret" mode after 32 frames of standing still
}

function orbsOptional(rom: Rom): void {
  for (const obj of [0x10, 0x14, 0x18, 0x1d]) {
    // 1. Loosen terrain susceptibility of level 1 shots
    rom.objects[obj].terrainSusceptibility &= ~0x04;
    // 2. Increase the level to 2 (rather than changing the asm)
    rom.objects[obj].level = 2;
  }
}

function noBowMode(rom: Rom): void {
  // Initial trigger gives "used bow of truth".
  const {
    flags: {UsedBowOfTruth},
    locations: {Crypt_Draygon2, MezameShrine},
  } = rom;
  let trigger!: Trigger;
  for (const spawn of MezameShrine.spawns) {
    if (spawn.isTrigger() && spawn.tile === 0x88) {
      trigger = rom.trigger(spawn.id);
    }
  }
  if (!trigger) throw new Error(`Could not find start trigger`);
  trigger.flags.push(UsedBowOfTruth.id);
  // Add an exit straight to draygon
  rom.tileEffects[0xb9 - 0xb3].effects[0x58] = 0;
  MezameShrine.meta.setExit(
      0, 'door', [Crypt_Draygon2.meta.id << 8 | 0x10, 'edge:bottom']);
}

// For now this just fixes the shot to be all elements instead of none.
function fixCrystalis(rom: Rom) {
  rom.objects[0x33].elements = 0xf;
}

// Enables chests and mimics to appear on every screen by replacing the unused recover graphics
// on the sword banks and replace it with chest and mimic sprites.
function swapMimicAndRecoverGraphics(rom: Rom) {
  // Summary of changes made here to swap mimic and recovery
  // 1) copy the 10 recover spell sprites to a new bank.
  // 2) copy the mimic and chest sprite to all of the sword banks.
  // 3) update the metasprites for the recover spell and mimic and chest
  // to use their new tile ids.

  // Step 0: Make sure we don't do anything if the first shuffle failed (meaning we run this method
  // a second time) We check to see if the new recover spell is pasted into the new bank
  const newRecoverPage = 0x53 << 6;
  if (!rom.patterns.get(newRecoverPage, 0x15).pixels.every( p => p === 0 )) {
    return;
  }

  const windSwordPage = 0x42 << 6;
  // Step 1
  // Note: I chose the bank with Azteca in it ($53 or CHR $14c00) since it has a lot of unused tiles.
  // In the original bank $42 it uses tiles $1c - $1f, $3a - $3f
  const moveRecoverAddress = new Map<number, number>([
    [0x1c, 0x15],
    [0x1d, 0x16],
    [0x1e, 0x17],
    [0x1f, 0x18],
    [0x3a, 0x19],
    [0x3b, 0x1a],
    [0x3c, 0x1b],
    [0x3d, 0x1c],
    [0x3e, 0x1d],
    [0x3f, 0x1e],
  ]);
  moveRecoverAddress.forEach((newaddr, oldaddr) => {
    rom.patterns.set(newRecoverPage, newaddr, rom.patterns.get(windSwordPage, oldaddr).pixels);
  });
  
  const chestMimicPage = 0x6c << 6;
  // Step 2
  // Each weapon page is sequential in ROM starting from windsword $42 and ending with crystalis $46
  const moveChestMimicAddress = [
    // Chest = 4 sprites
    [0x03, 0x1c],
    [0x04, 0x1d],
    [0x05, 0x1e],
    [0x06, 0x1f],
    // Mimic = 5 sprites
    [0x33, 0x3a],
    [0x34, 0x3b],
    [0x35, 0x3c],
    [0x36, 0x3d],
    [0x37, 0x3e],
  ]
  moveChestMimicAddress.forEach(addr => {
    const tile = rom.patterns.get(chestMimicPage, addr[0]).pixels;
    for (let i=0; i<5; ++i) {
      rom.patterns.set(windSwordPage + (i << 6), addr[1], tile);
    }
  });

  // Step 2.1
  // In vanilla, the recover spell usage actually ALWAYS switches to the wind sword
  // bank for using recovery which makes updating the recover spell animation trivial
  // Just switch the value of the wind sword bank to use the new recover bank one.
  // NOTE: this will break mimic/chest sprites during recover animation
  // but its worth it since thats such a small issue.

  const unused = 0x80;
  const chestMetasprite = 0xaa;
  rom.metasprites[chestMetasprite].sprites.forEach(frame => {
    frame.forEach(sprite => {
      // 0x40 = PPU addr base
      // 0x1c = new chest sprite location
      // 0x83 = original chest starting tile
      if (sprite[0] != unused) {
        sprite[3] = (sprite[3] - 0x83) + 0x40 + 0x1c;
      }
    });
  });

  const mimicMetasprite = 0x90;
  for (let frameNum = 0; frameNum < rom.metasprites[mimicMetasprite].sprites.length; frameNum++) {
    for (let spriteNum = 0; spriteNum < rom.metasprites[mimicMetasprite].sprites[frameNum].length; spriteNum++) {
      let sprite = rom.metasprites[mimicMetasprite].sprites[frameNum][spriteNum];
      // 0x40 = PPU addr base (NOTE: The mimic adds $40 by default, see the value loaded into $320)
      // 0x3a = new chest sprite location
      // 0xb3 = original mimic starting tile
      if (sprite[0] != unused) {
        rom.metasprites[mimicMetasprite].sprites[frameNum][spriteNum][3] = (sprite[3] - 0xb3) + 0x3a;
      }
    }
  }

  const recoverMetasprite = 0xcb;
  rom.metasprites[recoverMetasprite].sprites.forEach(frame => {
    for (let i = 0; i < frame.length; i++) {
      let sprite = frame[i];
      if (sprite[0] != unused) {
        let newTile = moveRecoverAddress.get(sprite[3] & 0x3f);
        // 0x40 = PPU addr base
        // 0x3a = new chest sprite location
        sprite[3] = 0x40 + newTile!;
      }
    }
  });

}

// There are a few metatiles that have incorrect behavior (one of
// the pillar tiles in the crypt tileset and a corner tile in the
// cave tileset), which allows flying through them.  The crypt tile
// can cause the player to get stuck if they get hit while flying
// near it.  The cave corner can allow sneaking past the stoned
// NPCs in the waterfall cave using flight.
function fixFlyableWalls(rom: Rom) {
  rom.tileEffects[0xb5 - 0xb3].effects[0x74] = 6; // cave corner
  rom.tileEffects[0xb6 - 0xb3].effects[0x46] = 6; // crypt pillar
}

// Tomatos (and others) shouldn't be able to cross water or roll up ramps.
function fixMonsterTerrain(rom: Rom) {
  for (const obj of rom.objects) {
    if (!(obj instanceof Monster)) continue;
    if (obj.isProjectile() || obj.isBoss() || obj.isFlyer()) continue;
    if (obj === rom.objects.mimic) continue;
    obj.terrainSusceptibility |= 0x3;
  }
}

function replace<T>(array: T[], old: T, replacement: T) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] !== old) continue;
    array[i] = replacement;
    return;
  }
  throw new Error(`Could not find ${old} in ${array.join(',')}`);      
}

function hardcoreMode(rom: Rom) {
  for (const loc of rom.locations) {
    loc.checkpoint = loc.saveable = false;
  }
}

function fixWildWarp(rom: Rom) {
  // Swap out underground channel for ESI 2, since the former doesn't
  // actually allow you to move (without flight), but our logic can't
  // account for that fact - so it's a softlock risk if progression
  // is on the sea but the player doesn't have any other access.
  replace(rom.wildWarp.locations, 0x64, 0x69);
}

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
