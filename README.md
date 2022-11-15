# Crystalis Randomizer

[![Build Status](https://travis-ci.org/shicks/crystalis-randomizer.svg?branch=master)](https://travis-ci.org/shicks/crystalis-randomizer)

[Crystalis] (or "God Slayer" in Japan) is a classic post-apocalyptic action
RPG/adventure game for the NES released by SNK in 1990.  It is widely praised as
an underrated gem of a video game.

Randomizers are tools that take an existing ROM dump and rearrange bits of it to
produce a fresh, new experience and challenge.  Note, in particular, that these
tools are unusable without bringing your own legally-obtained ROM dump of the
original game.

Please visit our [discord] for more information and discussion.

Try it out at https://crystalisrandomizer.com

[Crystalis]: https://en.wikipedia.org/wiki/Crystalis
[discord]: https://discord.gg/ktyz5E6

## Features

### Randomization

* [x] Shuffle monster locations
* [x] Shuffle all item locations, including Alarm Flute which is now a key item
* [x] Shuffle shop items and prices, with normalization
* [ ] TODO - Randomize the location of some item-giving NPCs (particularly Akahana)

### Monster Adjustments

* [x] Monster stats grow over time to ensure that monsters in every location
      remain relevant throughout the game (this is important when players are
      traversing the game in an arbitrary order); each key item that is gained
      increases the difficulty level (which is currently visible in the status bar
      to the right of the player level)
* [x] Monsters are no longer completely immune to anything: when the "ping" sound
      happens, the monster will take a minimum (nonzero) amount of damage

### Sword Adjustments

* [x] Sword damage is normalized: all swords have the same base damage, which
      increases by getting upgrades (ball and bracelet) rather than by switching
      to a better sword
* [x] Stab damage is decreased slightly relative to charge shots (a fixed amount
      of damage is added for stabs, rather than doubling the sword's base level)
* [ ] TODO - Charge shot damage needs to be normalized across swords (sword of wind shots
      are still significantly weaker than other swords)

### Item Adjustments

* [x] Power Ring doubles the sword's base damage, rather than the player's level,
      making it slightly less game-breaking
* [x] Deo's Pendant increases MP even when moving, making it more relevant in a
      game with constant movement
* [x] Leather Boots are now Speed Boots: movement speed is noticeably faster, in
      addition to the normal effect of preventing terrain damage
* [x] Rabbit Boots allow sword charging while moving

### Armor Adjustments

* [x] Armors are rebalanced to be less game-breaking if a powerful armor is
      found early in the game

### Enhancements

* [x] Orbs and bracelets are automatically equipped when switching swords,
      significantly reducing the need for menuing (note that this makes it
      impossible to intentionally select a lower level)
* [x] Balls and bracelets are true upgrades, rather than individual items: the
      first found item will give the ball and the second will give the bracelet,
      regardless of which chest is opened first (the message will be inaccurate
      if items are acquired in reverse, and this is relevant for e.g. triggering
      Tornel to teach Teleport dependent on finding Tornado Bracelet, which is
      based on opening the particular chest, rather than what's in inventory)
* [x] Some NPCs no longer despawn in response to story progression:
      * Zebu remains in his cave all game, ensuring access to Windmill Key
      * Asina remains in her room all game, ensuring access to Recover
      * Akahana remains in the waterfall cave all game, ensuring access to
        Shield Ring
      * The first Flute of Lime will be found in the room behind Rage if it was
        not given by the Queen (i.e. if the statues were glitched past)
* [x] Warping/teleporting out of the tower is allowed; enemies do not give EXP in
      the tower, so if you enter under-leveled it is now possible to leave, grind,
      and return at a higher level (or with more items) to try again
* [x] Barrier can only be learned by actually calming the sea: so-called "ghetto
      flight" will allow access to Swan, but will *not* provide the magic

### Bug Fixes

* [x] Fix the screen shaking issue that happens when the message box appears
* [x] Fix the visible "seams" that show up on (vertically) large maps on certain
      emulators
* [x] Allow blank spaces in the "Sword" and "Power" row of the inventory, which
      prevents swords acquired out-of-order from clobbering each other

## Known Issues

* [ ] Projectiles are sometimes rendered incorrectly.
* [ ] Monster shuffling fails to populate levels as fully as it should be able to

## The Team

* steve_hacks: programming, design
* Mattrick_: development, playtesting
* jroweboy: programming
* Dragondarch: playtesting
* crossproduct: playtesting, tracker graphics
