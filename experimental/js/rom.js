import { AdHocSpawn } from './rom/adhocspawn.js';
import { BossKill } from './rom/bosskill.js';
import { Hitbox } from './rom/hitbox.js';
import { Item } from './rom/item.js';
import { ItemGet } from './rom/itemget.js';
import { Location } from './rom/location.js';
import { Messages } from './rom/messages.js';
import { Metasprite } from './rom/metasprite.js';
import { Npc } from './rom/npc.js';
import { ObjectData } from './rom/objectdata.js';
import { RomOption } from './rom/option.js';
import { Palette } from './rom/palette.js';
import { Pattern } from './rom/pattern.js';
import { Screen } from './rom/screen.js';
import { Shop } from './rom/shop.js';
import { TileAnimation } from './rom/tileanimation.js';
import { TileEffects } from './rom/tileeffects.js';
import { Tileset } from './rom/tileset.js';
import { Trigger } from './rom/trigger.js';
import { hex, seq } from './rom/util.js';
import { Writer } from './rom/writer.js';
import { UnionFind } from './unionfind.js';
export class Rom {
    constructor(rom) {
        this.prg = rom.subarray(0x10, 0x40010);
        this.chr = rom.subarray(0x40010);
        this.shopCount = Rom.SHOP_COUNT.get(rom);
        this.scalingLevels = Rom.SCALING_LEVELS.get(rom);
        this.uniqueItemTableAddress = Rom.UNIQUE_ITEM_TABLE.get(rom);
        this.shopDataTablesAddress = Rom.SHOP_DATA_TABLES.get(rom);
        this.omitItemGetDataSuffix = Rom.OMIT_ITEM_GET_DATA_SUFFIX.get(rom);
        this.omitLocalDialogSuffix = Rom.OMIT_LOCAL_DIALOG_SUFFIX.get(rom);
        for (const [address, value] of ADJUSTMENTS)
            this.prg[address] = value;
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
        this.items = seq(0x49, i => new Item(this, i));
        this.shops = seq(44, i => new Shop(this, i));
        this.npcs = seq(0xcd, i => new Npc(this, i));
        this.bossKills = seq(0xe, i => new BossKill(this, i));
    }
    trigger(id) {
        if (id < 0x80 || id > 0xff)
            throw new Error(`Bad trigger id $${hex(id)}`);
        return this.triggers[id & 0x7f];
    }
    get monsters() {
        const monsters = new Set();
        for (const l of this.locations) {
            if (!l.used || !l.hasSpawns)
                continue;
            for (const o of l.spawns) {
                if (o.isMonster())
                    monsters.add(this.objects[o.monsterId]);
            }
        }
        return [...monsters].sort((x, y) => (x.id - y.id));
    }
    get projectiles() {
        const projectiles = new Set();
        for (const m of this.monsters) {
            if (m.child) {
                projectiles.add(this.objects[this.adHocSpawns[m.child].objectId]);
            }
        }
        return [...projectiles].sort((x, y) => (x.id - y.id));
    }
    get monsterGraphics() {
        const gfx = {};
        for (const l of this.locations) {
            if (!l.used || !l.hasSpawns)
                continue;
            for (const o of l.spawns) {
                if (!(o.data[2] & 7)) {
                    const slot = o.data[2] & 0x80 ? 1 : 0;
                    const id = hex(o.data[3] + 0x50);
                    const data = gfx[id] = gfx[id] || {};
                    data[`${slot}:${l.spritePatterns[slot].toString(16)}:${l.spritePalettes[slot].toString(16)}`]
                        = { pal: l.spritePalettes[slot],
                            pat: l.spritePatterns[slot],
                            slot,
                        };
                }
            }
        }
        return gfx;
    }
    get locationMonsters() {
        const m = {};
        for (const l of this.locations) {
            if (!l.used || !l.hasSpawns)
                continue;
            const s = m['$' + hex(l.id)] = {};
            for (const o of l.spawns) {
                if (!(o.data[2] & 7)) {
                    const slot = o.data[2] & 0x80 ? 1 : 0;
                    const id = o.data[3] + 0x50;
                    s[`${slot}:${id.toString(16)}`] =
                        (s[`${slot}:${id.toString(16)}`] || 0) + 1;
                }
            }
        }
        return m;
    }
    static async load(patch) {
        const file = await pickFile();
        if (patch)
            await patch(file);
        return new Rom(file);
    }
    async writeData() {
        Rom.SHOP_COUNT.set(this.prg, this.shopCount);
        Rom.SCALING_LEVELS.set(this.prg, this.scalingLevels);
        Rom.UNIQUE_ITEM_TABLE.set(this.prg, this.uniqueItemTableAddress);
        Rom.SHOP_DATA_TABLES.set(this.prg, this.shopDataTablesAddress);
        Rom.OMIT_ITEM_GET_DATA_SUFFIX.set(this.prg, this.omitItemGetDataSuffix);
        Rom.OMIT_LOCAL_DIALOG_SUFFIX.set(this.prg, this.omitLocalDialogSuffix);
        const writer = new Writer(this.prg);
        writer.alloc(0x144f8, 0x17e00);
        writer.alloc(0x193f9, 0x1ac00);
        writer.alloc(0x1ae00, 0x1bd00);
        writer.alloc(0x1c77a, 0x1c95d);
        writer.alloc(0x1cae5, 0x1d8f4);
        writer.alloc(0x1dde6, 0x1e065);
        writer.alloc(0x1e200, 0x1e3f0);
        writer.alloc(0x2111a, 0x21468);
        writer.alloc(0x28e81, 0x2922b);
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
        writeAll(this.items);
        writeAll(this.shops);
        writeAll(this.bossKills);
        promises.push(writer.commit());
        await Promise.all(promises).then(() => undefined);
    }
    analyzeTiles() {
    }
    disjointTilesets() {
        const tilesetByScreen = [];
        for (const loc of this.locations) {
            if (!loc.used)
                continue;
            const tileset = loc.tileset;
            const ext = loc.extended ? 0x100 : 0;
            for (const row of loc.screens) {
                for (const s of row) {
                    (tilesetByScreen[s + ext] || (tilesetByScreen[s + ext] = new Set())).add(tileset);
                }
            }
        }
        const tiles = seq(256, () => new UnionFind());
        for (let s = 0; s < tilesetByScreen.length; s++) {
            if (!tilesetByScreen[s])
                continue;
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
        for (let t = 0; t < tiles.length; t++) {
            const p = tiles[t].sets()
                .map((s) => [...s].map(hex).join(' '))
                .join(' | ');
            console.log(`Tile ${hex(t)}: ${p}`);
        }
    }
    swapMetatiles(tilesets, ...cycles) {
        const rev = new Map();
        const revArr = seq(0x100);
        const alt = new Map();
        const cpl = (x) => Array.isArray(x) ? x[0] : x < 0 ? ~x : x;
        for (const cycle of cycles) {
            for (let i = 0; i < cycle.length - 1; i++) {
                if (Array.isArray(cycle[i])) {
                    const arr = cycle[i];
                    alt.set(arr[0], arr[1]);
                    cycle[i] = arr[0];
                }
            }
            for (let i = 0; i < cycle.length - 1; i++) {
                const j = cycle[i];
                const k = cycle[i + 1];
                if (j < 0 || k < 0)
                    continue;
                rev.set(k, j);
                revArr[k] = j;
            }
        }
        const screens = new Set();
        const tileEffects = new Set();
        const tilesetsSet = new Set(tilesets);
        for (const l of this.locations) {
            if (!l.used)
                continue;
            if (!tilesetsSet.has(l.tileset))
                continue;
            tileEffects.add(l.tileEffects);
            for (const screen of l.allScreens()) {
                screens.add(screen);
            }
        }
        for (const screen of screens) {
            for (const row of screen.tiles) {
                for (let i = 0; i < row.length; i++) {
                    row[i] = revArr[row[i]];
                }
            }
        }
        for (const tsid of tilesetsSet) {
            const tileset = this.tilesets[(tsid & 0x7f) >>> 2];
            for (const cycle of cycles) {
                for (let i = 0; i < cycle.length - 1; i++) {
                    const a = cpl(cycle[i]);
                    const b = cpl(cycle[i + 1]);
                    for (let j = 0; j < 4; j++) {
                        tileset.tiles[j][a] = tileset.tiles[j][b];
                    }
                    tileset.attrs[a] = tileset.attrs[b];
                    if (b < 0x20 && tileset.alternates[b] !== b) {
                        if (a >= 0x20)
                            throw new Error(`Cannot unflag: ${tsid} ${a} ${b} ${tileset.alternates[b]}`);
                        tileset.alternates[a] = tileset.alternates[b];
                    }
                }
            }
            for (const [a, b] of alt) {
                tileset.alternates[a] = b;
            }
        }
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
                tileEffect.effects[a] |= 0x08;
            }
        }
    }
}
Rom.OMIT_ITEM_GET_DATA_SUFFIX = RomOption.bit(0x142c0, 0);
Rom.OMIT_LOCAL_DIALOG_SUFFIX = RomOption.bit(0x142c0, 1);
Rom.SHOP_COUNT = RomOption.byte(0x142c1);
Rom.SCALING_LEVELS = RomOption.byte(0x142c2);
Rom.UNIQUE_ITEM_TABLE = RomOption.address(0x142d0);
Rom.SHOP_DATA_TABLES = RomOption.address(0x142d3);
function pickFile() {
    return new Promise((resolve, reject) => {
        if (window.location.hash !== '#reset') {
            const data = localStorage.getItem('rom');
            if (data) {
                return resolve(Uint8Array.from(new Array(data.length / 2).fill(0).map((_, i) => Number.parseInt(data[2 * i] + data[2 * i + 1], 16))));
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
                const str = Array.from(arr, hex).join('');
                localStorage.setItem('rom', str);
                upload.remove();
                resolve(arr);
            });
            reader.readAsArrayBuffer(file);
        });
    });
}
export const EXPECTED_CRC32 = 0x1bd39032;
const ADJUSTMENTS = new Map([
    [0x1cff9, 0xe0],
]);
//# sourceMappingURL=rom.js.map