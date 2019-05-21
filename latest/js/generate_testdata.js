#!/usr/bin/env node

require = require('esm')(module);

const fs = require('fs');
const {LoremIpsum} = require('lorem-ipsum');
const {Random} = require('./random.js');
const {Rom} = require('./rom.js');
const {Entrance, Exit, Flag, Location, Spawn} = require('./rom/location.js');
const {GlobalDialog, LocalDialog} = require('./rom/npc.js');
const {ShopType} = require('./rom/shop.js');
const {watchArray} = require('./rom/util.js');

// Usage: node generate_testdata.js rom.nes testdata

const main = async (args) => {
  const data = new Uint8Array(fs.readFileSync(args[0]).buffer);
  const rom = new Rom(data);

  // Fill the rom with completely random data.
  const random = new Random(1);
  const lorem = new LoremIpsum({random: () => random.next()});
  const r = (n = 0x100) => random.nextInt(n);
  const rr = (l, n = 0x100) => seq(l, () => random.nextInt(n));
  const ra = (arr, n = 0x100) => {
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] === 'number') {
        arr[i] = r(n);
      } else if (arr[i] instanceof Array) {
        ra(arr[i], n);
      } else {
        throw new Error('bad arg');
      }
    }
  }

  for (let i = 0; i < data.length; i++) {
    data[i] = r();
  }
  data.subarray(0x28010, 0x2a010).fill(0);
  data.subarray(0x14010, 0x16010).fill(0);
  data.subarray(0x18010, 0x20010).fill(0);

  // Scramble everything.
  rom.shopCount = 11;
  rom.scalingLevels = 48;
  rom.uniqueItemTableAddress = 0x1e110;
  rom.shopDataTablesAddress = 0x21da4;
  rom.telepathyTablesAddress = 0x1d8f4;

  for (const loc of rom.locations) {
    loc.bgm = r();
    loc.animation = r(4);
    ra(loc.screens);
    ra(loc.tilePatterns);
    ra(loc.tilePalettes);
    for (const entrance of loc.entrances) {
      ra(entrance.data, 0x80);
    }
    for (const exit of loc.exits) {
      ra(exit.data, 0x80);
    }
    for (const flag of loc.flags) {
      ra(flag.data, 0x80);
    }
    loc.pits = []; // just delete the pits to save space
    for (const spawn of loc.spawns) {
      // leave chests alone for depgraph preconditions
      if (!spawn.isChest) ra(spawn.data, 0x80);
    }
    ra(loc.spritePalettes);
    ra(loc.spritePatterns);
  }

  for (const o of rom.objects) {
    o.sfx = r();
    for (let i = 0; i < o.data.length; i++) {
      if (o.data) o.data = r(2) ? r() : 0;
    }
  }

  for (const h of rom.hitboxes) {
    ra(h.coordinates);
  }

  for (const t of rom.triggers) {
    ra(t.conditions);
    ra(t.message.data);
    ra(t.flags);
  }

  for (const n of rom.npcs) {
    ra(n.data);
    ra([...n.spawnConditions.values()]);
    for (const d of [...n.globalDialogs, ...n.localDialogs.values()]) {
      d.condition = r();
      if (d.message) ra(d.message.data);
      ra(d.flags || []);
    }
  }

  for (const t of rom.tilesets) {
    ra(t.tiles);
    ra(t.attrs);
    // leave alternates alone because there's a precondition check
  }

  for (const t of rom.tileEffects) {
    ra(t.effects);
  }

  // TODO - preserve the tileset behavior
  for (const s of rom.screens) {
    ra(s.tiles);
  }

  for (const s of rom.adHocSpawns) {
    ra(s.data);
  }

  for (const i of rom.itemGets) {
    i.inventoryRowStart = r();
    i.inventoryRowLenth = r();
    ra(i.acquisitionAction.data);
    ra(i.flags);
  }

  for (const i of rom.items) {
    i.itemDataValue = r();
    i.selectedItemValue = r();
    i.basePrice = r();
    i.menuName = i.messageName = lorem.generateWords(1);
  }

  for (const s of rom.shops) {
    ra(s.contents);
    ra(s.prices);
  }

  for (const b of rom.bossKills) {
    ra(b.data);
  }

  ra(rom.telepathy.resultTable);
  for (const s of rom.telepathy.sages) {
    for (const m of s.defaultMessages) {
      ra(m.data);
    }
    for (const g of s.messageGroups) {
      for (const m of g.messages) {
        m[0] = r();
        ra(m[1].data);
        if (m[2]) ra(m[2].data);
      }
    }
  }

  for (let i = 0; i < rom.messages.banks.length; i++) {
    rom.messages.banks[i] = r(3) + 0x15;
  }
  for (let i = 0; i < rom.messages.extraWords[6].length; i++) {
    rom.messages.extraWords[6][i] = lorem.generateWords(1);
  }
  for (const p of rom.messages.parts) {
    for (const m of p) {
      m.text = lorem.generateSentences(1);
    }
  }
  

  // Commit the changes.
  await rom.writeData();

  // Write the actual data back to disk.
  await new Promise((resolve, reject) =>
                    fs.writeFile(args[1], data,
                                 (err) => err ? reject(err) : resolve()));
  console.log(`Wrote ${args[1]}`);
};

process.on('unhandledRejection', error => {
  console.error(error.stack);
  process.exit(1);
});

main(process.argv.slice(2)).then(() => process.exit(0));
