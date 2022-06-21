# Changes

## Latest
* Add presets for the 2022 tournament rounds.
* Rudimentary sprite swapping to allow playing as Mesia.
* Increase pity MP to 2.
* Bug fixes:
    * Fixed internal flag allocation bug to not reuse flags on multiple maps.

## 2.0.0
* Revamped the flagset system:
    * Many more options are now standard, significantly reducing the length of
      typical flag strings.
    * Removed some customization for categories of items to shuffle together:
      full shuffle is now standard, with "easy mode" flags `Et` to keep vanilla
      mimic locations and `Eu` to not shuffle consumables in with unique items.
    * Support for flag modifiers (e.g. `!`).
    * Merged the `F` and `G` groups together.  By default, all glitches are
      fixed (when possible).  The `Gx` flags reenable the glitch but also add
      them to the logic.  The `G!x` flags enable them outside of logic.
    * Grouped a handful of options to make the game more like vanilla into a new
      `V` group.
    * Support for optional flags that don't affect the checksum (e.g. `As` to
      turn off the background music).  Note that some `A` flags are only
      optional without the `!` modifier.
    * Add "mystery flags" (`?` modifier) that are randomly either on or off, but
      the player does not know which.
* Adds a new "GBC Cave" inspired by the cave on the east edge of Wind Valley in
  the GBC version.  This cave has two checks and and two additional exits, one
  of which is blocked by a (by default) rock wall.
    * This introduces a 13th mimic into the game.
    * Setting `Vm` or `V!m` will disable adding this map, in favor of either
      adding no additional routes out of Leaf, or restoring the older version
      of just a direct passage to Lime Tree Valley.
* Various logic changes:
    * Entering Evil Spirit Island requires you to be riding the dolphin (flight
      will trigger a message and reject entry, unless trigger skip is used).
    * Added a new guard NPC in the Portoa throne room.  When Portoa Queen leaves
      the throne room permanently (to go to Asina's back room), the guard will
      have her item, instead of Asina.
    * Statue of Gold is now added to the shuffle as a potential item that can
      be found from any check.  Combining Glowing Lamp and Broken Statue now
      provides a random item.
    * Deo now always requires Telepathy (in addition to Change).
* Fixes to dolphin logic.
    * In particular, the `Rd` flag selects between vanilla dolphin interactions
      (where healing the dolphin and having the Shell Flute is required to spawn
      the boat owner, and talking to Kensu in the beach house is required to
      make the Shell Flute work) or "standard" dolphin interactions (where only
      the Shell Flute is required to ride the dolphin, but trading in the Fog
      Lamp is required to spawn Kensu in the beach house, who holds an item.
    * Riding the dolphin is now required to get into Evil Spirit Island.  If
      you're flying, you'll get a message that you can't get into the cave.
* Tinking no longer damages enemies at all.
    * `Ns` enables "tink mode", but will also potentially add tinking to logic.
* New randomization options:
    * `Wh` shuffles house entrances in towns.
    * `Wa` shuffles connections between the various areas in the game.  This
      also adds two chests to Mezame Shrine, in order to guarantee there are
      sufficient "sphere zero" checks.  In this mode, Zebu's student again no
      longer gives any item (though he's still required to talk to to spawn
      sleeping in the cave), and the initial $100 cash is in the inventory from
      the start.
    * `Wg` shuffles the order of the floors in Goa fortress.
* New glitch options:
    * `Gr` allows skipping Rage via a damage boost to go directly to the
      answering machine.
    * `Gg` allows flight to be used to sneak past shooting statues.
* Adds `Rb` "no bow mode", which provides a direct portal from Mezame to
  Draygon 2, who no longer needs the Bow of Truth to fight.
    * Note that this is independent from `Rs` (story mode), which would still
      require swords and bosses for Draygon to spawn.
* Improved map randomization some (but it's still incomplete).
    * Added a handful of "missing" screens for several tilesets (swamp and river
      cave).
* Tracker no longer available (use EmoTracker instead).
* Revamp the HUD:
    * Some text is compressed into smaller icons.
    * EXP no longer shows a target.  Instead, experience counts down and the
      next level happens when you reach zero.
    * Two levels can be gained at the same time now, if scaling is high enough.
* Sword is now colored based on the element, making it easy to follow on stream.
* Flyers now spawn in a different random off-screen location every time.
* Warp points are activated immediately upon loading an area, rather than
  stepping on a specific trigger tile.
* Minor bug fixes:
    * Fixed some graphical glitches.
    * Fixed glitchy vampire dialog caused by Kensu beach house changes.
    * Fixed an issue with Angry Sea Wild Warp logic.
    * Fixed issues from entrance order being switched (mixing up wild warp,
      among other things).
    * Fixed some issues around using the tower escalators to skip floors.
    * Fixed bug allowing player to get free sword charge glitch from quick swap.
    * Fixed an issue where seeds that rerolled in the middle could have some
      communication from earlier attempts, making (for example) Akahana require
      being Changed into a woman, rather than Aryllis.
    * Fixed monster placement to not be inside walls.
    * Improve handling of overdumped input roms.
    * White robots will no longer spawn directly underneath the player.
    * Tomatoes and other non-flyers now respect the terrain.
* Internal cleanups:
    * Rearrange passes into a strict order of (1) read bytes from ROM into an
      internal data structure, (2) shuffle the internal data structure,
      (3) write bytes from the internal representation back to the ROM image.
    * Implemented a relocating/patching macro assembler/linker to better utilize
      free space in the ROM.
    * Significantly more changes are now done programmatically, rather than
      through assembly.
    * Remove a handful of redundant flags and triggers.
    * Improve test infrastructure.
    * Factored out metalocation, metascreen, metatileset (etc) types for dealing
      with map edits more easily.
    * Moved a number of screens' data into the expanded PRG ROM.

## 1.2.4
* Prevents randomized wild-warp into Mesia Shrine and Rage to avoid possible
  softlock from the Queen going away without any way to reach her.
* Fix Sword of Thunder level 1 shot normalization to do the same damage as
  all other level 1 shots.

## 1.2.3
* Fixes `Gw` (assume wild warp) to not assume that wild warping to the front of
  swamp will get you into Oak without a gas mask.
* Adds an experimental voice-activated tracker, which may or may not actually
  work.

## 1.2.2
* Adds a warp point for Zombie Town.
* Adds a "beta" `Wm` flag for limited map shuffle.
* `Tc` flag disables controller shortcuts.
* Changes when `Tb` is enabled:
   * Tornado magic moves slower
   * Speed Boots no longer protect from spikes/marsh
   * Gas Mask is now Hazmat Suit and does protect from spikes/marsh
* Platforms are now randomly swapped with Crypt Platforms, which crumble when
  you step off them.
* Nerf mado slightly by having him stop a little more frequently.
* Fix loopholes where stabbing while flying was effective (i.e. a few bosses):
  now _nothing_ can be hit while you're flying, even if they can hit you.
    * Also entirely removed Warrior Ring for `Hc` flag (charge shots only).
* Leaf elder in Mt. Sabre prison heals you when you talk to him.
* Buff Iron Necklace and Shield Ring to work without any equipped armor (the
  bonus is now 2*level, on top of the normal cap).
* Kensu slime no longer locks the screen before talking to him.
* NPCs should no longer carry Opel Statues.
* Kelbesque 2 skip should no longer work.
* Bosses drop EXP again.
* Kensu now asks for what he wants in Swan.
* Clean up presets:
   * Clearer names.
   * Add presets for the elimination phase flagsets.
* Rearranged order of hints for fog lamp/kirisa plant cave:
   * Bows get top priority, then swords/magic, and finally other unique items
   * If multiple items have the same priority, it will prefer disclosing a
     deeper item over a shallower one: back of fog lamp first, then kirisa back
     to front, then the rest of fog lamp back to front.
   * If no unique item is found, it will simply say "treasure".
* Fixed some minor bugs:
   * Fixed mosquito and flail graphics.
   * Azteca cut-scene should no longer happen during Mado fight.
   * Improvements to dialog pagination.
   * Race seeds should again have the correct version number baked in.

## 1.2.1
* Quick sword switch controls improved to feel more natural.
* Patch out warp boots reuse glitch (only when shop glitch is disabled, since
  otherwise you can just steal them anyway).
    * Also reduced warp boots price by 20% to compensate for not being able to
      reuse them.

## 1.2.0
(NOTE: this version is published as 1.1.4 on NPM since I accidentally
unpublished 1.2.0)
* `Wt` randomizes the trade-in items NPCs want.
* `Wu` randomizes the names of certain items.
* `Ww` randomizes wall elements.
* `Tp` randomizes color palettes.
* `Tw` randomizes wild warp locations.
* `Hh` enables "hardcore mode", removing all checkpoints and saves.
* `Dt` enables a "trainer mode" that provides nearly all required items
  up-front, provides shortcuts for changing level and scaling, and redefines
  the wild warp spots for convenient access to bosses and the tower.
* Paralysis check now requires killing Kelbesque 1.
* Flails now do projectile/shield damage.
* Changes to item shuffle:
    * Removed `Sb` flag: all unique items are now shuffled together under
      `Sk`.
    * Improved consumable boss drop handling by allowing arbitrary consumables
      to fill leftover slots once all key items are placed.
* Removed controller 2 bindings in favor of new single-controller shortcuts:
    * Start+B+A triggers "wild warp".  Pressing A+B in the opposite order warps
      "backwards" in the list.  This shortcut is considered to be fully allowed
      in races.
    * Select+B quickly switches the equipped sword.
* Shuffled boss elements *from `Me`) are now accounted for in logic.
* It's now possible to walk out of the tower by touching the crystal.
* Fixed almost all known graphical issues (still outstanding are garbled bosses
  before the fight and the mosquito on some maps).
* Made `Hd` (buffed Dyna fight) a little harder.
* Removed `Rl` flag (it's now always on).
* Warp boots or teleport is now guaranteed for all checks around Shyron after
  warping there via the Sword of Thunder.
* Fixed a major random number generator glitch.
* Fixed some broken triggers and dialogs:
    * Leaf villagers can no longer get stranded on Mt. Sabre.
    * Prevent Draygon 2 from respawning in story mode.
    * Walking out of the initial cave is no longer required to ensure all caves
      are open.
* Degraded some tracker features (it can no longer show off-logic checks),
  but added some rudimentary handling for random elements and trade-ins.
* Added permalink capability.
* Misc improvements:
    * New underlying logic engine.

## 1.1.3
* `Me` flag shuffles monster weaknesses (but not accounted in logic).
* `Mt` shuffles tower monsters into the rest of the game.
* `Hz` turns on "blackout mode" in caves.
* `Hd` makes Dyna into a real boss fight, with killable side pods.
* `Tm` randomizes music.
* Sword charge damage is normalized: Wind and Water charges do 3/6/8
  damage, Fire and Thunder do 3/5/7 damage (on top of the normal base
  damage from the sword's power level).
* Orbs and bracelets are fully progressive: the orb will always be found
  before the bracelet.
    * Tornel on Mt. Sabre requires finding both the Orb and Bracelet.
* Defeating the insect is no longer sufficient for the insect flute check
  (rescuing the child is now required).
* Mimics are always inital spawns, rather than timer spawns.
* Fixed some graphical glitches, but introduced some new ones (in particular,
  garbled chests are no longer guaranteed to be mimics).
* Misc improvements:
    * Introduced better data structure abstractions.
    * Changed a few dialog messages.
    * Moved from JavaScript to TypeScript.
    * More robust testing.

## 1.1.2
* Fixed `Hg` swamp run to require sword to be in-logic.
* Fixed `Rd` flag logic to not make unwinnable seeds.

## 1.1.1
* Fixed `Em` and `Hm` flags.
* Added some analytics to the homepage.

## 1.1.0
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
    * Flag `Ex` increases experience drops (and `Hx` decreases them)
* New "Story mode" flag `Rs` requires killing all bosses (not counting vampire
  or insect) and having all four swords before Draygon 2 will spawn.
* New flag `Rr` requires telepathy to get item from Deo.
* New flag `Ro` makes orbs and bracelets optional for destroying walls and
  forming bridges.
* Stabbing while flying no longer damages ground enemies.
    * Also added new hard mode flag `Hc` that disables stabs entirely.
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
