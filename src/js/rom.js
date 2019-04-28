import {AdHocSpawn} from './rom/adhocspawn.js';
import {Entity} from './rom/entity.js';
import {Hitbox} from './rom/hitbox.js';
import {ItemGet} from './rom/itemget.js';
import {Location} from './rom/location.js';
import {Messages} from './rom/messages.js';
import {Metasprite} from './rom/metasprite.js';
import {Npc} from './rom/npc.js';
import {ObjectData} from './rom/objectdata.js';
import {Palette} from './rom/palette.js';
import {Pattern} from './rom/pattern.js';
import {Screen} from './rom/screen.js';
import {Tileset} from './rom/tileset.js';
import {TileEffects} from './rom/tileeffects.js';
import {TileAnimation} from './rom/tileanimation.js';
import {Trigger} from './rom/trigger.js';
import {UnionFind} from './unionfind.js';
import {Writer} from './rom/writer.js';
import {addr,
        countBits,
        group,
        hex,
        readString,
        seq,
        slice,
        signed,
        varSlice,
       } from './rom/util.js';

// TODO - consider adding prepopulated name maps for data
// tables, e.g. my location names, so that an editor could
// use a drop-down menu and show something meaningful.




export class Rom {
  constructor(rom) {
    this.prg = rom.subarray(0x10, 0x40010);
    this.chr = rom.subarray(0x40010);

    // Load up a bunch of data tables.  This will include a large number of the
    // data tables in the ROM.  The idea is that we can edit the arrays locally
    // and then have a "commit" function that rebuilds the ROM with the new
    // arrays.  We may need to write a "paged allocator" that can allocate
    // chunks of ROM in a given page.  Probably want to use a greedy algorithm
    // where we start with the biggest chunk and put it in the smallest spot
    // that fits it.  Presumably we know the sizes up front even before we have
    // all the addresses, so we could do all the allocation at once - probably
    // returning a token for each allocation and then all tokens get filled in
    // at once (actual promises would be more unweildy).
    // Tricky - what about shared elements of data tables - we pull them
    // separately, but we'll need to re-coalesce them.  But this requires
    // knowing their contents BEFORE allocating their space.  So we need two
    // allocate methods - one where the content is known and one where only the
    // length is known.
    this.screens = seq(0x103, i => new Screen(this, i));
    this.tilesets = seq(12, i => new Tileset(this, i << 2 | 0x80));
    this.tileEffects = seq(11, i => new TileEffects(this, i + 0xb3));
    this.triggers = seq(0x43, i => new Trigger(this, 0x80 | i));
    this.patterns = seq(this.chr.length >> 4, i => new Pattern(this, i));
    this.palettes = seq(0x100, i => new Palette(this, i));
    this.locations = seq(0x100, i => new Location(this, i));
    this.tileAnimations = seq(4, i => new TileAnimation(this, i));
    this.hitboxes = seq(24, i => new Hitbox(this, i));
    this.objects = seq(0x100, i => new ObjectData(this, i));
    this.adHocSpawns = seq(0x60, i => new AdHocSpawn(this, i));
    this.metasprites = seq(0x100, i => new Metasprite(this, i));
    this.messages = new Messages(this);
    this.itemGets = seq(0x71, i => new ItemGet(this, i));
    this.npcs = seq(0xcd, i => new Npc(this, i));
  }

  // TODO - cross-reference monsters/metasprites/metatiles/screens with patterns/palettes
  get monsters() {
    let monsters = new Set();
    for (const l of this.locations) {
      if (!l.used || !l.hasSpawns) continue;
      for (const o of l.spawns) {
        if ((o[2] & 7) == 0) monsters.add(this.objects[(o[3] + 0x50) & 0xff]);
      }
    }
    monsters = [...monsters];
    monsters.sort((x, y) => (x.id - y.id));
    return monsters;
  }

  get projectiles() {
    let projectiles = new Set();
    for (const m of this.monsters) {
      if (m.child) {
        projectiles.add(this.objects[this.adHocSpawns[m.child].object]);
      }
    }
    projectiles = [...projectiles];
    projectiles.sort((x, y) => (x.id - y.id));
    return projectiles;
  }

  get monsterGraphics() {
    const gfx = {};
    for (const l of this.locations) {
      if (!l.used || !l.hasSpawns) continue;
      for (const o of l.spawns) {
        if (!(o[2] & 7)) {
          const slot = o[2] & 0x80 ? 1 : 0;
          const id = (o[3] + 0x50).toString(16).padStart(2,0);
          const data = gfx[id] = gfx[id] || {};
          data[`${slot}:${l.spritePatterns[slot].toString(16)}:${
               l.spritePalettes[slot].toString(16)}`]
            = {slot: slot,
               pat: l.spritePatterns[slot],
               pal: l.spritePalettes[slot],
              };
        }
      }
    }
    return gfx;
  }

  get locationMonsters() {
    const m = {};
    for (const l of this.locations) {
      if (!l.used || !l.hasSpawns) continue;
      // which monsters are in which slots?
      const s = m['$' + l.id.toString(16).padStart(2,0)] = {};
      for (const o of l.spawns) {
        if (!(o[2] & 7)) {
          const slot = o[2] & 0x80 ? 1 : 0;
          const id = o[3] + 0x50;
          s[`${slot}:${id.toString(16)}`] =
              (s[`${slot}:${id.toString(16)}`] || 0) + 1;
        }
      }
    }
    return m;
  }

  // TODO - for each sprite pattern table, find all the palettes that it uses.
  // Find all the monsters on it.  We can probably allow any palette so long
  // as one of the palettes is used with that pattern.
  // TODO - max number of instances of a monster on any map - i.e. avoid having
  // five flyers on the same map!

  // 460 - 0 means either flyer or stationary
  //           - stationary has 4a0 ~ 204,205,206
  //             (kraken, swamp plant, sorceror)
  //       6 - mimic
  //       1f - swimmer
  //       54 - tomato and bird
  //       55 - swimmer
  //       57 - normal
  //       5f - also normal, but medusa head is flyer?
  //       77 - soldiers, ice zombie


  // Use the browser API to load the ROM.  Use #reset to forget and reload.
  static async load(patch = undefined) {
    const file = await pickFile();
    if (patch) await patch(file);
    return new Rom(file);
  }

//   // Don't worry about other datas yet
//   writeObjectData() {
//     // build up a map from actual data to indexes that point to it
//     let addr = 0x1ae00;
//     const datas = {};
//     for (const object of this.objects) {
//       const ser = object.serialize();
//       const data = ser.join(' ');
//       if (data in datas) {
// //console.log(`$${object.id.toString(16).padStart(2,0)}: Reusing existing data $${datas[data].toString(16)}`);
//         object.objectDataBase = datas[data];
//       } else {
//         object.objectDataBase = addr;
//         datas[data] = addr;
// //console.log(`$${object.id.toString(16).padStart(2,0)}: Data is at $${addr.toString(16)}: ${Array.from(ser, x=>'$'+x.toString(16).padStart(2,0)).join(',')}`);
//         addr += ser.length;
// // seed 3517811036
//       }
//       object.write();
//     }
// //console.log(`Wrote object data from $1ac00 to $${addr.toString(16).padStart(5, 0)}, saving ${0x1be91 - addr} bytes.`);
//     return addr;
//   }

  async writeData() {
    const writer = new Writer(this.prg);
    // MapData
    writer.alloc(0x144f8, 0x17e00);
    // NpcData
    // NOTE: 193f9 is assuming $fb is the last location ID.  If we add more locations at
    // the end then we'll need to push this back a few more bytes.  We could possibly
    // detect the bad write and throw an error, and/or compute the max location ID.
    writer.alloc(0x193f9, 0x1ac00);
    // ObjectData (index at 1ac00..1ae00)
    writer.alloc(0x1ae00, 0x1bd00); // save 512 bytes at end for some extra code
    // NpcSpawnConditions
    writer.alloc(0x1c77a, 0x1c95d);
    // NpcDialog
    writer.alloc(0x1cae5, 0x1d8f4);
    // ItemGetData
    writer.alloc(0x1dde6, 0x1e065);
    // TriggerData
    writer.alloc(0x1e200, 0x1e3f0);

    const promises = [];
    const writeAll = (writables) => {
      for (const w of writables) {
        promises.push(w.write(writer));
      }
    };
    writeAll(this.locations);
    writeAll(this.objects);
    writeAll(this.hitboxes);
    writeAll(this.triggers);
    writeAll(this.npcs);
    writeAll(this.tilesets);
    writeAll(this.tileEffects);
    writeAll(this.screens);
    writeAll(this.adHocSpawns);
    writeAll(this.itemGets);
    promises.push(writer.commit());
    await Promise.all(promises).then(() => undefined);
  }


  analyzeTiles() {
    // For any given tile index, what screens does it appear on.
    // For those screens, which tilesets does *it* appear on.
    // That tile ID is linked across all those tilesets.
    // Forms a partitioning for each tile ID => union-find.
    // Given this partitioning, if I want to move a tile on a given
    // tileset, all I need to do is find another tile ID with the
    // same partition and swap them?

    // More generally, we can just partition the tilesets.


    // For each screen, find all tilesets T for that screen
    // Then for each tile on the screen, union T for that tile.


    // Given a tileset and a metatile ID, find all the screens that (1) are rendered
    // with that tileset, and (b) that contain that metatile; then find all *other*
    // tilesets that those screens are ever rendered with.

    // Given a screen, find all available metatile IDs that could be added to it
    // without causing problems with other screens that share any tilesets.
    //  -> unused (or used but shared exclusively) across all tilesets the screen may use


    // What I want for swapping is the following:
    //  1. find all screens I want to work on => tilesets
    //  2. find unused flaggabble tiles in the hardest one,
    //     which are also ISOLATED in the others.
    //  3. want these tiles to be unused in ALL relevant tilesets
    //  4. to make this so, find *other* unused flaggable tiles in other tilesets
    //  5. swap the unused with the isolated tiles in the other tilesets

    // Caves:
    //  0a:      90 / 9c
    //  15: 80 / 90 / 9c
    //  19:      90      (will add to 80?)
    //  3e:      90
    //
    // Ideally we could reuse 80's 1/2/3/4 for this
    //  01: 90 | 94 9c
    //  02: 90 | 94 9c
    //  03:      94 9c
    //  04: 90 | 94 9c
    //
    // Need 4 other flaggable tile indices we can swap to?
    //   90: => (1,2 need flaggable; 3 unused; 4 any) => 07, 0e, 10, 12, 13, ..., 20, 21, 22, ...
    //   94 9c: => don't need any flaggable => 05, 3c, 68, 83, 88, 89, 8a, 90, ...
  }


  disjointTilesets() {
    const tilesetByScreen = [];
    for (const loc of this.locations) {
      if (!loc.used) continue;
      const tileset = loc.tileset;
      const ext = loc.extended ? 0x100 : 0;
      for (const row of loc.screens) {
        for (const s of row) {
          (tilesetByScreen[s + ext] || (tilesetByScreen[s + ext] = new Set())).add(tileset);
        }
      }
    }
    const tiles = new Array(256).fill(0).map(() => new UnionFind());
    for (let s = 0; s < tilesetByScreen.length; s++) {
      if (!tilesetByScreen[s]) continue;
      const ts = new Set();
      for (const row of this.screens[s].tiles) {
        for (const t of row) {
          ts.add(t);
        }
      }
      for (const t of ts) {
        tiles[t].union([...tilesetByScreen[s]]);
      }
    }
    // output
    for (let t = 0; t < tiles.length; t++) {
      const p = tiles[t].sets().map(s => [...s].map(x => x.toString(16)).join(' ')).join(' | ');
      console.log(`Tile ${t.toString(16).padStart(2, 0)}: ${p}`);
    }
    //   if (!tilesetByScreen[i]) {
    //     console.log(`No tileset for screen ${i.toString(16)}`);
    //     continue;
    //   }
    //   union.union([...tilesetByScreen[i]]);
    // }
    // return union.sets();
  }

  // Cycles are not actually cyclic - an explicit loop at the end is required to swap.
  // Variance: [1, 2, null] will cause instances of 1 to become 2 and will
  //           cause properties of 1 to be copied into slot 2
  // Common usage is to swap things out of the way and then copy into the
  // newly-freed slot.  Say we wanted to free up slots [1, 2, 3, 4] and
  // had available/free slots [5, 6, 7, 8] and want to copy from [9, a, b, c].
  // Then cycles will be [1, 5, 9] ??? no
  //  - probably want to do screens separately from tilesets...?
  // NOTE - we don't actually want to change tiles for the last copy...!
  //   in this case, ts[5] <- ts[1], ts[1] <- ts[9], screen.map(1 -> 5)
  //   replace([0x90], [5, 1, ~9])
  //     => 1s replaced with 5s in screens but 9s NOT replaced with 1s.
  // Just build the partition once lazily? then can reuse...
  //   - ensure both sides of replacement have correct partitioning?E
  //     or just do it offline - it's simpler
  // TODO - Sanity check?  Want to make sure nobody is using clobbered tiles?
  swapMetatiles(/** !Array<number> */ tilesets, /** ...!Array<number|!Array<number>> */ ...cycles) {
    // Process the cycles
    const rev = new Map();
    const revArr = seq(0x100);
    const alt = new Map();
    const cpl = x => Array.isArray(x) ? x[0] : x < 0 ? ~x : x;
    for (const cycle of cycles) {
      for (let i = 0; i < cycle.length - 1; i++) {
        if (Array.isArray(cycle[i])) {
          alt.set(cycle[i][0], cycle[i][1]);
          cycle[i] = cycle[i][0];
        }
      }
      for (let i = 0; i < cycle.length - 1; i++) {
        let j = cycle[i];
        let k = cycle[i + 1];
        if (j < 0 || k < 0) continue;
        rev.set(k, j);
        revArr[k] = j;
      }
    }
    //const replacementSet = new Set(replacements.keys());
    // Find instances in (1) screens, (2) tilesets and alternates, (3) tileEffects
    const screens = new Set();
    const tileEffects = new Set();
    tilesets = new Set(tilesets);
    for (const l of this.locations) {
      if (!l.used) continue;
      if (!tilesets.has(l.tileset)) continue;
      tileEffects.add(l.tileEffects);
      for (const screen of l.allScreens()) {
        screens.add(screen);
      }
    }
    // Do replacements.
    // 1. screens: [5, 1, ~9] => change 1s into 5s
    for (const screen of screens) {
      for (const row of screen.tiles) {
        for (let i = 0; i < row.length; i++) {
          row[i] = revArr[row[i]];
        }
      }
    }
    // 2. tilesets: [5, 1 ~9] => copy 5 <= 1 and 1 <= 9
    for (const tsid of tilesets) {
      const tileset = this.tilesets[(tsid & 0x7f) >>> 2];
      for (const cycle of cycles) {
        for (let i = 0; i < cycle.length - 1; i++) {
          const a = cpl(cycle[i]);
          const b = cpl(cycle[i + 1]);
          for (let j = 0; j < 4; j++) {
            tileset.tiles[j][a] = tileset.tiles[j][b];
          }
          tileset.attrs[a] = tileset.attrs[b];
          if (b < 0x20 && tileset.alternates[b] != b) {
            if (a >= 0x20) throw new Error(`Cannot unflag: ${tsid} ${a} ${b} ${tileset.alternates[b]}`);
            tileset.alternates[a] = tileset.alternates[b];
          }
        }
      }
      for (const [a, b] of alt) {
        tileset.alternates[a] = b;
      }
    }
    // 3. tileEffects
    for (const teid of tileEffects) {
      const tileEffect = this.tileEffects[teid - 0xb3];
      for (const cycle of cycles) {
        for (let i = 0; i < cycle.length - 1; i++) {
          const a = cpl(cycle[i]);
          const b = cpl(cycle[i + 1]);
          tileEffect.effects[a] = tileEffect.effects[b];
        }
      }
      for (const a of alt.keys()) {
        // This bit is required to indicate that the alternative tile's
        // effect should be consulted.  Simply having the flag and the
        // tile index < $20 is not sufficient.
        tileEffect.effects[a] |= 0x08;
      }
    }
    // Done?!?
  }
}


// const intersects = (left, right) => {
//   if (left.size > right.size) return intersects(right, left);
//   for (let i of left) {
//     if (right.has(i)) return true;
//   }
//   return false;
// }

// const TILE_EFFECTS_BY_TILESET = {
//   0x80: 0xb3,
//   0x84: 0xb4,
//   0x88: 0xb5,
//   0x8c: 0xb6,
//   0x90: 0xb7,
//   0x94: 0xb8,
//   0x98: 0xb9,
//   0x9c: 0xba,
//   0xa0: 0xbb,
//   0xa4: 0xbc,
//   0xa8: 0xb5,
//   0xac: 0xbd,
// };

// Only makes sense in the browser.
const pickFile = () => {
  return new Promise((resolve, reject) => {
    if (window.location.hash != '#reset') {
      const data = window['localStorage'].getItem('rom');
      if (data) {
        return resolve(
            Uint8Array.from(
                new Array(data.length / 2).fill(0).map(
                    (_, i) => Number.parseInt(
                        data[2 * i] + data[2 * i + 1], 16))));
      }
    }
    const upload = document.createElement('input');
    document.body.appendChild(upload);
    upload.type = 'file';
    upload.addEventListener('change', () => {
      const file = upload.files[0];
      const reader = new FileReader();
      reader.addEventListener('loadend', () => {
        const arr = new Uint8Array(reader.result);
        const str = Array.from(arr, x => x.toString(16).padStart(2, 0)).join('');
        window['localStorage'].setItem('rom', str);
        upload.remove();
        resolve(arr);
      });
      reader.readAsArrayBuffer(file);
    });
  });
}


// class DataTableCache {
//   constructor() {
//     this.data = {};
//   }

//   /** Returns the address if found, or null. */
//   find(page, data) {
//     const str = data.join(' ');
//     if (str in this.data) {
//       console.log(`$${object.id.toString(16).padStart(2,0)}: Reusing existing data $${datas[data].toString(16)}`);
//       return this.data[str];
//     }
//     return null;
//   }

//   /** Adds a length of data to the cache. */
//   add(address, data) {
//     const str = data.join(' ');
//     this.data[str] = address;
//   }
// }

// class RomWriter {
//   constructor() {
//     this.available = new Array(0x40000);
//     this.ranges = [];
//     this.writes = [];
//     this.waiting = [];
//   }

//   resort() {
//     this.ranges.sort((x, y) => (x[1] - x[0]) < (y[1] - y[0]));
//   }

//   // Marks a region as available.
//   free(start, end) {
//     const ranges = new Set();
//     if (this.available[start - 1]) {
//       const range = this.available[start - 1];
//       ranges.add(range);
//       start = range.end;
//     }
//     if (this.available[end]) {
//       const range = this.available[end];
//       end = 
//       ranges.add(this.available[end]);
//     }
//     for (let i = start; i < end; i++) {
      
//     while (this.available[end] < 0) {
//       end++;
//     }
//     for (let i = start; i < end; i++) {
//       this.available[i] = ~start;
//     }
//     resort();
//   }

//   // Returns a promise with the actual address of the start.
//   write(page, data) {

//   }

//   commit(prg) {

//   }

// }


// building csv for loc-obj cross-reference table
// seq=(s,e,f)=>new Array(e-s).fill(0).map((x,i)=>f(i+s));
// uniq=(arr)=>{
//   const m={};
//   for (let o of arr) {
//     o[6]=o[5]?1:0;
//     if(!o[5])m[o[2]]=(m[o[2]]||0)+1;
//   }
//   for (let o of arr) {
//     if(o[2] in m)o[6]=m[o[2]];
//     delete m[o[2]];
//   }
//   return arr;
// }
// 'loc,locname,mon,monname,spawn,type,uniq,patslot,pat,palslot,pal2,pal3\n'+
// rom.locations.flatMap(l=>!l||!l.used?[]:uniq(seq(0xd,0x20,s=>{
//   const o=(l.objects||[])[s-0xd]||null;
//   if (!o) return null;
//   const type=o[2]&7;
//   const m=type?null:0x50+o[3];
//   const patSlot=o[2]&0x80?1:0;
//   const mon=m?rom.objects[m]:null;
//   const palSlot=(mon?mon.palettes(false):[])[0];
//   const allPal=new Set(mon?mon.palettes(true):[]);
//   return [h(l.id),l.name,h(m),'',h(s),type,0,patSlot,m?h((l.spritePatterns||[])[patSlot]):'',palSlot,allPal.has(2)?h((l.spritePalettes||[])[0]):'',allPal.has(3)?h((l.spritePalettes||[])[1]):''];
// }).filter(x=>x))).map(a=>a.join(',')).filter(x=>x).join('\n');


// building the CSV for the location table.
//const h=(x)=>x==null?'null':'$'+x.toString(16).padStart(2,0);
//'id,name,bgm,width,height,animation,extended,tilepat0,tilepat1,tilepal0,tilepal1,tileset,tile effects,exits,sprpat0,sprpat1,sprpal0,sprpal1,obj0d,obj0e,obj0f,obj10,obj11,obj12,obj13,obj14,obj15,obj16,obj17,obj18,obj19,obj1a,obj1b,obj1c,obj1d,obj1e,obj1f\n'+rom.locations.map(l=>!l||!l.used?'':[h(l.id),l.name,h(l.bgm),l.layoutWidth,l.layoutHeight,l.animation,l.extended,h((l.tilePatterns||[])[0]),h((l.tilePatterns||[])[1]),h((l.tilePalettes||[])[0]),h((l.tilePalettes||[])[1]),h(l.tileset),h(l.tileEffects),[...new Set(l.exits.map(x=>h(x[2])))].join(':'),h((l.spritePatterns||[])[0]),h((l.spritePatterns||[])[1]),h((l.spritePalettes||[])[0]),h((l.spritePalettes||[])[1]),...new Array(19).fill(0).map((v,i)=>((l.objects||[])[i]||[]).slice(2).map(x=>x.toString(16)).join(':'))]).filter(x=>x).join('\n')


export const EXPECTED_CRC32 = 0x1bd39032;
