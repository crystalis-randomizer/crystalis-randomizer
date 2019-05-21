#!/usr/bin/env node

require = require('esm')(module);

const fs = require('fs');
const {LoremIpsum} = require('lorem-ipsum');
const {Random} = require('./random.js');
const {Rom} = require('./rom.js');
const {Entrance, Exit, Flag, Location, Spawn} = require('./rom/location.js');
const {GlobalDialog, LocalDialog} = require('./rom/npc.js');
const {ShopType} = require('./rom/shop.js');


// Usage: node generate_testdata.js rom.nes

const main = async (...args) => {
  const data = new Uint8Array(fs.readFileSync(args[0]).buffer);
  const rom = new Rom(data);

  // Fill the rom with completely random data.
  const random = new Random(1);
  const r = (n = 0x100) => random.nextInt(n);
  const rr = (l, n = 0x100) => seq(l, () => random.nextInt(n));

  for (let i = 0; i < data.length; i++) {
    data[i] = r();
  }

  // Scramble everything.
  rom.shopCount = 11;
  rom.scalingLevels = 48;
  rom.uniqueItemTableAddress = 0x1e110;
  rom.shopDataTablesAddress = 0x21da4;
  rom.telepathyTablesAddress = 0x1d8f4;

  for (const loc of rom.locations) {
    loc.bgm = r();
    loc.animation = r(4);
    for (let i = 0; i < loc.screens.length; i++) {
      loc.screens[i] = rr(16);
    }
    loc.tilePatterns = rr(2);
    loc.tilePalettes = rr(3);
    for (const entrance of loc.entrances) {
      entrance.data.splice(0, 4, r(0x80), r(), r(), r());
    }
    for (const exits of loc.exits) {
      exit.data.splice(0, 4, r(0x80), r(), r(), r());
    }
    for (const flags of loc.flags) {
      flag.data.splice(0, 2, r(0x80), r());
    }
    for (const pit of loc.pits || []) {
      flag.data.splice(0, 4, r(0x80), r(), r(), r());
    }
    for (const spawn of loc.spawns) {
      spawn.data.splice(0, 4, r(0x80), r(), r(), r());
    }
    loc.spritePalettes = rr(2);
    loc.spritePatterns = rr(2);
  }

  for (const o of rom.objects) {
    // shuffle non-zero stats, etc...
  }

  // TODO - preserve the tileset behavior
  for (const screen of rom.screens) {
    for (const row of screen.tiles) {
      for (let i = 0; i < row.length; i++) {
        row[i] = random.nextInt(0x100);
      }
    }
  }

  // Write the actual data back to disk.
  await new Promise((resolve, reject) =>
                    fs.writeFile(args[1], shuffled,
                                 (err) => err ? reject(err) : resolve()));
  console.log(`Wrote ${args[1]}`);
};

process.on('unhandledRejection', error => {
  console.error(error.stack);
  process.exit(1);
});

main().then(() => process.exit(0));
