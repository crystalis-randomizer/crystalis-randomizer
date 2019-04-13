# Changes

## 1.1.0-rc2
* `Rl` flag ("no free lunch") now closes the back entrance to Mt Sabre North,
  requiring the Prison Key to open it (from either side), as well as the back
  entrance to the sealed cave (which can only be opened by starting the
  windmill).
* Made Alarm Flute a key item, given by the student.  Alarm Flute and
  Flute of Lime are now reusable.  The Flute of Lime chest has been
  replaced with a Mirrored Shield.  Leaf's tool shop sells a Fruit of
  Power instead of Alarm Flute, and Joel's tool shop sells a Lysis
  Plant, and Goa's tool shop sells a Fruit of Power instead of its
  Lysis Plant.
* Shop prices are now always normalized by scaling level.
    * Flag `Ps` will shuffle contents between shops.
* Disable some glitches:
    * `Fs` flag disables the shop glitch
    * `Ft` flag disables glitching through statues
    * `Fr` and `Fp` disable rabbit and teleport skips, respectively.
    * `Gs` changed to `Gc` for sword charge glitch
    * `Tw` changed to `Fw` for consistency with other "fixes"
* Buffed Fruit of Power to 48 in non-hard mode (`Hm`) and 64 in easy
  mode (`Em`), providing slightly better balance.
* Flag `Tb` consolidates various bonus item tweaks:
    * Speed boots (formerly `Ts`)
    * Deo's pendant buff (formerly `Td`)
    * NEW: Rabbit boots charge to level 2 while walking.
* New Easy Mode flags:
    * Flag `Es` guarantees a starting sword from Leaf elder
    * Flag `Ed` decreases enemy attack power, particularly in early game
* New "Story mode" flag `Rs` requires killing all bosses (not counting vampire
  or insect) and having all four swords before Draygon 2 will spawn.
* New flag `Rr` requires telepathy to get item from Deo.
* Stabbing while flying no longer damages ground enemies.
* Restore armors back to original defense values, but rearrange a bit:
    * Sacred Shield now prevents curse instead of paralysis.
    * Ceramic Shield now prevents paralysis.
    * Psycho Armor and Psycho Shield now only provide 20 DEF instead of 32.
    * Battle Armor provides 24 DEF instead of 20.
    * Ceramic Armor and Battle Shield provide 32 DEF instead of (respectively)
      20 and 24.
    * Armor and shield base prices are adjusted so that they scale
      proportionally.
    * Increased Platinum and Mirrored Shield defenses by 2 each.
    * Armor defense capped at 3 * Level
* Opel Statue now clears status effects (and fixes a base-game bug
  where it would soft-lock while riding the dolphin).
* Fix various soft-locks
    * Don't require humanly-impossible swamp run in hard-mode logic.
    * Saving or checkpointing in really awkward situations now ensure loaded
      games have a minimum of 5 HP and 1 MP (20 MP if swordless).
    * Patched queen dialog to always disappear after talking to her.
* Minor tweaks:
    * Fix some issues with Vampire 2 (specifically, too-easy scaling and including
      invulnerability to fire in logic).
    * Cause Statue of Onyx location to spawn on both versions of the map.
    * Defragmented several data tables for better access.


## 1.0.1
* Item shuffle is now done using "assumed fill".
* `Rf` (early flight) option has been removed since we can now bias
  the assumed fill algorithm to give flight at a random time.
* `Gp` (assume teleport skip) option has been added to allow the logic
  to require using flight to skip the teleport trigger at the entrance
  to Mt Sabre North.  This is included in the "advanced" preset.
* Opel statue no longer needs to be equipped to work.  Equipping it
  no longer blocks using quest items or stops storm attacks, though
  there's never a reason to do so.
* Linked to glitch explanation videos in help page.
* Fixed a few bugs:
    * Warp Boots disappearing or ending up in wrong row due to garbage
      data written into the ItemGetData table.
    * Portoa Queen's item (vanilla Flute of Lime) was being eaten but
      the previous bug masked it.
    * Ghetto flight logic forgot to guarantee Rabbit Boots.
    * Dolphin spawn requires talking to Asina but previously the graph
      expected it after getting Ball of Water.

## 1.0.0
* Initial release
