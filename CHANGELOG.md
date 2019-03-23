# Changes

## Latest
* Prevent humanly-impossible swamp run in hard-mode logic.
* Prevent soft-lock when saving or checkpointing in really awkward
  situations by ensuring loaded games have a minimum of 5 HP and 1 MP
  (20 MP if swordless).
* Add `Fs` flag to disable the shop glitch, and change `Gs` to `Gc`
  for sword charge glitch.
* Opel Statue now clears status effects.
* Buffed Fruit of Power to 40 in non-hard mode (`Hm`) and 64 in easy
  mode (`Em`), providing slightly better balance.
* Made Alarm Flute a key item, given by the student.  Alarm Flute and
  Flute of Lime are now reusable.  The Flute of Lime chest has been
  replaced with a Mirrored Shield.  Leaf's tool shop sells a Fruit of
  Power instead of Alarm Flute, and Joel's tool shop sells a Lysis
  Plant.
* Added `Br` flag to randomize shops.  Prices are not handled at all
  yet.

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
