import { AdHocSpawn } from './rom/adhocspawn.js';
import { BossKill } from './rom/bosskill.js';
import { Bosses } from './rom/bosses.js';
import { Hitbox } from './rom/hitbox.js';
import { Item } from './rom/item.js';
import { ItemGet } from './rom/itemget.js';
import { Locations } from './rom/location.js';
import { Messages } from './rom/messages.js';
import { Metascreens } from './rom/metascreens.js';
import { Metasprite } from './rom/metasprite.js';
import { Metatilesets } from './rom/metatileset.js';
import { Monster } from './rom/monster.js';
import { Npc } from './rom/npc.js';
import { Objects } from './rom/objects.js';
import { RomOption } from './rom/option.js';
import { Palette } from './rom/palette.js';
import { Pattern } from './rom/pattern.js';
import { Screens } from './rom/screen.js';
import { Shop } from './rom/shop.js';
import { Telepathy } from './rom/telepathy.js';
import { TileAnimation } from './rom/tileanimation.js';
import { TileEffects } from './rom/tileeffects.js';
import { Tilesets } from './rom/tileset.js';
import { Trigger } from './rom/trigger.js';
import { hex, seq } from './rom/util.js';
import { WildWarp } from './rom/wildwarp.js';
import { Writer } from './rom/writer.js';
import { UnionFind } from './unionfind.js';
export class Rom {
    constructor(rom) {
        const prgSize = rom[4] * 0x4000;
        const prgStart = 0x10 + (rom[6] & 4 ? 512 : 0);
        const prgEnd = prgStart + prgSize;
        this.prg = rom.subarray(prgStart, prgEnd);
        this.chr = rom.subarray(prgEnd);
        this.shopCount = Rom.SHOP_COUNT.get(rom);
        this.scalingLevels = Rom.SCALING_LEVELS.get(rom);
        this.uniqueItemTableAddress = Rom.UNIQUE_ITEM_TABLE.get(rom);
        this.shopDataTablesAddress = Rom.SHOP_DATA_TABLES.get(rom);
        this.telepathyTablesAddress = Rom.TELEPATHY_TABLES.get(rom);
        this.omitItemGetDataSuffix = Rom.OMIT_ITEM_GET_DATA_SUFFIX.get(rom);
        this.omitLocalDialogSuffix = Rom.OMIT_LOCAL_DIALOG_SUFFIX.get(rom);
        this.compressedMapData = Rom.COMPRESSED_MAPDATA.get(rom);
        for (const [address, old, value] of ADJUSTMENTS) {
            if (this.prg[address] === old)
                this.prg[address] = value;
        }
        this.tilesets = new Tilesets(this);
        this.tileEffects = seq(11, i => new TileEffects(this, i + 0xb3));
        this.screens = new Screens(this);
        this.metatilesets = new Metatilesets(this);
        this.metascreens = new Metascreens(this);
        this.triggers = seq(0x43, i => new Trigger(this, 0x80 | i));
        this.patterns = seq(this.chr.length >> 4, i => new Pattern(this, i));
        this.palettes = seq(0x100, i => new Palette(this, i));
        this.locations = new Locations(this);
        this.tileAnimations = seq(4, i => new TileAnimation(this, i));
        this.hitboxes = seq(24, i => new Hitbox(this, i));
        this.objects = new Objects(this);
        this.adHocSpawns = seq(0x60, i => new AdHocSpawn(this, i));
        this.metasprites = seq(0x100, i => new Metasprite(this, i));
        this.messages = new Messages(this);
        this.telepathy = new Telepathy(this);
        this.itemGets = seq(0x71, i => new ItemGet(this, i));
        this.items = seq(0x49, i => new Item(this, i));
        this.shops = seq(44, i => new Shop(this, i));
        this.npcs = seq(0xcd, i => new Npc(this, i));
        this.bossKills = seq(0xe, i => new BossKill(this, i));
        this.bosses = new Bosses(this);
        this.wildWarp = new WildWarp(this);
    }
    trigger(id) {
        if (id < 0x80 || id > 0xff)
            throw new Error(`Bad trigger id $${hex(id)}`);
        return this.triggers[id & 0x7f];
    }
    get projectiles() {
        const projectiles = new Set();
        for (const m of this.objects.filter(o => o instanceof Monster)) {
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
    async writeData() {
        Rom.SHOP_COUNT.set(this.prg, this.shopCount);
        Rom.SCALING_LEVELS.set(this.prg, this.scalingLevels);
        Rom.UNIQUE_ITEM_TABLE.set(this.prg, this.uniqueItemTableAddress);
        Rom.SHOP_DATA_TABLES.set(this.prg, this.shopDataTablesAddress);
        Rom.OMIT_ITEM_GET_DATA_SUFFIX.set(this.prg, this.omitItemGetDataSuffix);
        Rom.OMIT_LOCAL_DIALOG_SUFFIX.set(this.prg, this.omitLocalDialogSuffix);
        Rom.COMPRESSED_MAPDATA.set(this.prg, this.compressedMapData);
        const writer = new Writer(this.prg, this.chr);
        writer.alloc(0x144f8, 0x17e00);
        writer.alloc(0x193f9, 0x1ac00);
        writer.alloc(0x1ae00, 0x1bd00);
        writer.alloc(0x1c77a, 0x1c95d);
        writer.alloc(0x1cae5, 0x1d8f4);
        writer.alloc(0x1dde6, 0x1e065);
        writer.alloc(0x1e200, 0x1e3c0);
        writer.alloc(0x2111a, 0x21468);
        writer.alloc(0x2a000, 0x2fc00);
        if (this.telepathyTablesAddress) {
            writer.alloc(0x1d8f4, 0x1db00);
        }
        else {
            writer.alloc(0x1da4c, 0x1db00);
        }
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
        writeAll(this.adHocSpawns);
        writeAll(this.itemGets);
        writeAll(this.items);
        writeAll(this.shops);
        writeAll(this.bossKills);
        writeAll(this.patterns);
        if (this.compressedMapData) {
            for (let s = 0; s < 0x100; s++) {
                const scr = this.screens[s];
                if (scr.used)
                    promises.push(scr.write(writer));
            }
            for (let p = 1; p < 0x40; p++) {
                for (let s = 0; s < 0x20; s++) {
                    const scr = this.screens[p << 8 | s];
                    if (scr && scr.used)
                        promises.push(scr.write(writer));
                }
            }
        }
        else {
            writeAll(this.screens);
        }
        this.wildWarp.write(writer);
        promises.push(this.telepathy.write(writer));
        promises.push(this.messages.write(writer));
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
            const ext = loc.screenPage;
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
            for (const t of this.screens[s].allTilesSet()) {
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
            for (let i = 0, len = screen.tiles.length; i < len; i++) {
                screen.tiles[i] = revArr[screen.tiles[i]];
            }
        }
        for (const tsid of tilesetsSet) {
            const tileset = this.tilesets[tsid];
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
    moveFlag(oldFlag, newFlag) {
        function replace(arr) {
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] === oldFlag)
                    arr[i] = newFlag;
                if (arr[i] === ~oldFlag)
                    arr[i] = ~newFlag;
            }
        }
        for (const trigger of this.triggers) {
            replace(trigger.conditions);
            replace(trigger.flags);
        }
        for (const npc of this.npcs) {
            for (const conds of npc.spawnConditions.values())
                replace(conds);
            for (const dialogs of [npc.globalDialogs, ...npc.localDialogs.values()]) {
                for (const dialog of dialogs) {
                    if (dialog.condition === oldFlag)
                        dialog.condition = newFlag;
                    if (dialog.condition === ~oldFlag)
                        dialog.condition = ~newFlag;
                }
            }
        }
        if ((oldFlag & ~0xff) === 0x200 && (newFlag & ~0xff) === 0x200) {
            for (const loc of this.locations) {
                for (const flag of loc.flags) {
                    if (flag.flag === oldFlag)
                        flag.flag = newFlag;
                }
            }
        }
    }
    nextFreeTrigger() {
        for (const t of this.triggers) {
            if (!t.used)
                return t;
        }
        throw new Error('Could not find an unused trigger.');
    }
    compressMapData() {
        if (this.compressedMapData)
            return;
        this.compressedMapData = true;
        for (const location of this.locations) {
            if (location.extended)
                location.extended = 0xa;
        }
        for (let i = 0; i < 3; i++) {
            this.metascreens.renumber(0x100 | i, 0xa00 | i);
            delete this.screens[0x100 | i];
        }
    }
    moveScreens(tileset, page) {
        if (!this.compressedMapData)
            throw new Error(`Must compress maps first.`);
        const map = new Map();
        let i = page << 8;
        while ((i & 0xff) < 0x20 && this.screens[i]) {
            i++;
        }
        for (const screen of tileset.screens) {
            if (screen.id >= 0x100)
                continue;
            if ((i & 0xff) === 0x20)
                throw new Error(`No room left on page.`);
            const prev = screen.id;
            if (map.has(prev))
                continue;
            const next = screen.id = i++;
            map.set(prev, next);
            map.set(next, next);
        }
        for (const loc of this.locations) {
            if (loc.tileset != tileset.tilesetId)
                continue;
            let anyMoved = false;
            let allMoved = true;
            for (const row of loc.screens) {
                for (let i = 0; i < row.length; i++) {
                    const mapped = map.get(row[i]);
                    if (mapped != null) {
                        row[i] = mapped;
                        anyMoved = true;
                    }
                    else {
                        allMoved = false;
                    }
                }
            }
            if (anyMoved) {
                if (!allMoved)
                    throw new Error(`Inconsistent move`);
                loc.extended = page;
            }
        }
    }
    static async load(patch, receiver) {
        const file = await pickFile(receiver);
        if (patch)
            await patch(file);
        return new Rom(file);
    }
}
Rom.OMIT_ITEM_GET_DATA_SUFFIX = RomOption.bit(0x142c0, 0);
Rom.OMIT_LOCAL_DIALOG_SUFFIX = RomOption.bit(0x142c0, 1);
Rom.COMPRESSED_MAPDATA = RomOption.bit(0x142c0, 2);
Rom.SHOP_COUNT = RomOption.byte(0x142c1);
Rom.SCALING_LEVELS = RomOption.byte(0x142c2);
Rom.UNIQUE_ITEM_TABLE = RomOption.address(0x142d0);
Rom.SHOP_DATA_TABLES = RomOption.address(0x142d3);
Rom.TELEPATHY_TABLES = RomOption.address(0x142d6);
function pickFile(receiver) {
    if (!receiver)
        receiver = picker => document.body.appendChild(picker);
    return new Promise((resolve) => {
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
const ADJUSTMENTS = [
    [0x13646, 0x02, 0x06],
    [0x1456a, 0x00, 0xff],
    [0x14aeb, 0x09, 0xff],
    [0x14db9, 0x08, 0x80],
    [0x1545d, 0xff, 0x00],
    [0x1581d, 0x00, 0xff],
    [0x1584e, 0xdb, 0xff],
    [0x15baf, 0xf0, 0x80],
    [0x15bb6, 0xdf, 0x80],
    [0x15bb7, 0x96, 0x80],
    [0x15f40, 0x02, 0xff],
    [0x15f61, 0x8d, 0xff],
    [0x15f65, 0x8d, 0xff],
    [0x164ff, 0x0b, 0x0a],
    [0x1782a, 0x10, 0x01],
    [0x17857, 0x10, 0x01],
    [0x19f02, 0x40, 0x80],
    [0x19f03, 0x33, 0x32],
    [0x1a1df, 0x17, 0x97],
    [0x1a1e1, 0x3d, 0x34],
    [0x1cf05, 0x47, 0x48],
    [0x1d311, 0x20, 0xa0],
    [0x1d312, 0x30, 0x00],
    [0x1cff9, 0x60, 0xe0],
    [0x2ca90, 0x02, 0x00],
    [0x2f573, 0x02, 0x00],
    [0x2fae4, 0x5f, 0x00],
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFDL0MsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQzNDLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNuQyxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQzVDLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUMzQyxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDakQsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQy9DLE9BQU8sRUFBYyxZQUFZLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQUMvRCxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUVqQyxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFTLE9BQU8sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2hELE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFB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QUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxD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RSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztDQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FkSG9jU3Bhd259IGZyb20gJy4vcm9tL2FkaG9jc3Bhd24uanMnO1xuaW1wb3J0IHtCb3NzS2lsbH0gZnJvbSAnLi9yb20vYm9zc2tpbGwuanMnO1xuaW1wb3J0IHtCb3NzZXN9IGZyb20gJy4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9yb20vaGl0Ym94LmpzJztcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi9yb20vaXRlbS5qcyc7XG5pbXBvcnQge0l0ZW1HZXR9IGZyb20gJy4vcm9tL2l0ZW1nZXQuanMnO1xuaW1wb3J0IHtMb2NhdGlvbnN9IGZyb20gJy4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZXN9IGZyb20gJy4vcm9tL21lc3NhZ2VzLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbnN9IGZyb20gJy4vcm9tL21ldGFzY3JlZW5zLmpzJztcbmltcG9ydCB7TWV0YXNwcml0ZX0gZnJvbSAnLi9yb20vbWV0YXNwcml0ZS5qcyc7XG5pbXBvcnQge01ldGF0aWxlc2V0LCBNZXRhdGlsZXNldHN9IGZyb20gJy4vcm9tL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9yb20vbW9uc3Rlci5qcyc7XG5pbXBvcnQge05wY30gZnJvbSAnLi9yb20vbnBjLmpzJztcbmltcG9ydCB7T2JqZWN0RGF0YX0gZnJvbSAnLi9yb20vb2JqZWN0ZGF0YS5qcyc7XG5pbXBvcnQge09iamVjdHN9IGZyb20gJy4vcm9tL29iamVjdHMuanMnO1xuaW1wb3J0IHtSb21PcHRpb259IGZyb20gJy4vcm9tL29wdGlvbi5qcyc7XG5pbXBvcnQge1BhbGV0dGV9IGZyb20gJy4vcm9tL3BhbGV0dGUuanMnO1xuaW1wb3J0IHtQYXR0ZXJufSBmcm9tICcuL3JvbS9wYXR0ZXJuLmpzJztcbmltcG9ydCB7U2NyZWVuLCBTY3JlZW5zfSBmcm9tICcuL3JvbS9zY3JlZW4uanMnO1xuaW1wb3J0IHtTaG9wfSBmcm9tICcuL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7U3BvaWxlcn0gZnJvbSAnLi9yb20vc3BvaWxlci5qcyc7XG5pbXBvcnQge1RlbGVwYXRoeX0gZnJvbSAnLi9yb20vdGVsZXBhdGh5LmpzJztcbmltcG9ydCB7VGlsZUFuaW1hdGlvbn0gZnJvbSAnLi9yb20vdGlsZWFuaW1hdGlvbi5qcyc7XG5pbXBvcnQge1RpbGVFZmZlY3RzfSBmcm9tICcuL3JvbS90aWxlZWZmZWN0cy5qcyc7XG5pbXBvcnQge1RpbGVzZXRzfSBmcm9tICcuL3JvbS90aWxlc2V0LmpzJztcbmltcG9ydCB7VHJpZ2dlcn0gZnJvbSAnLi9yb20vdHJpZ2dlci5qcyc7XG5pbXBvcnQge2hleCwgc2VxfSBmcm9tICcuL3JvbS91dGlsLmpzJztcbmltcG9ydCB7V2lsZFdhcnB9IGZyb20gJy4vcm9tL3dpbGR3YXJwLmpzJztcbmltcG9ydCB7V3JpdGVyfSBmcm9tICcuL3JvbS93cml0ZXIuanMnO1xuaW1wb3J0IHtVbmlvbkZpbmR9IGZyb20gJy4vdW5pb25maW5kLmpzJztcblxuLy8gQSBrbm93biBsb2NhdGlvbiBmb3IgZGF0YSBhYm91dCBzdHJ1Y3R1cmFsIGNoYW5nZXMgd2UndmUgbWFkZSB0byB0aGUgcm9tLlxuLy8gVGhlIHRyaWNrIGlzIHRvIGZpbmQgYSBzdWl0YWJsZSByZWdpb24gb2YgUk9NIHRoYXQncyBib3RoIHVudXNlZCAqYW5kKlxuLy8gaXMgbm90IHBhcnRpY3VsYXJseSAqdXNhYmxlKiBmb3Igb3VyIHB1cnBvc2VzLiAgVGhlIGJvdHRvbSAzIHJvd3Mgb2YgdGhlXG4vLyB2YXJpb3VzIHNpbmdsZS1zY3JlZW4gbWFwcyBhcmUgYWxsIGVmZmVjdGl2ZWx5IHVudXNlZCwgc28gdGhhdCBnaXZlcyA0OFxuLy8gYnl0ZXMgcGVyIG1hcC4gIFNob3BzICgxNDAwMC4uMTQyZmYpIGFsc28gaGF2ZSBhIGdpYW50IGFyZWEgdXAgdG9wIHRoYXRcbi8vIGNvdWxkIHBvc3NpYmx5IGJlIHVzYWJsZSwgdGhvdWdoIHdlJ2QgbmVlZCB0byB0ZWFjaCB0aGUgdGlsZS1yZWFkaW5nIGNvZGVcbi8vIHRvIGlnbm9yZSB3aGF0ZXZlcidzIHdyaXR0ZW4gdGhlcmUsIHNpbmNlIGl0ICppcyogdmlzaWJsZSBiZWZvcmUgdGhlIG1lbnVcbi8vIHBvcHMgdXAuICBUaGVzZSBhcmUgYmlnIGVub3VnaCByZWdpb25zIHRoYXQgd2UgY291bGQgZXZlbiBjb25zaWRlciB1c2luZ1xuLy8gdGhlbSB2aWEgcGFnZS1zd2FwcGluZyB0byBnZXQgZXh0cmEgZGF0YSBpbiBhcmJpdHJhcnkgY29udGV4dHMuXG5cbi8vIFNob3BzIGFyZSBwYXJ0aWN1bGFybHkgbmljZSBiZWNhdXNlIHRoZXkncmUgYWxsIDAwIGluIHZhbmlsbGEuXG4vLyBPdGhlciBwb3NzaWJsZSByZWdpb25zOlxuLy8gICAtIDQ4IGJ5dGVzIGF0ICRmZmMwIChtZXphbWUgc2hyaW5lKSA9PiAkZmZlMCBpcyBhbGwgJGZmIGluIHZhbmlsbGEuXG5cbmV4cG9ydCBjbGFzcyBSb20ge1xuXG4gIC8vIFRoZXNlIHZhbHVlcyBjYW4gYmUgcXVlcmllZCB0byBkZXRlcm1pbmUgaG93IHRvIHBhcnNlIGFueSBnaXZlbiByb20uXG4gIC8vIFRoZXkncmUgYWxsIGFsd2F5cyB6ZXJvIGZvciB2YW5pbGxhXG4gIHN0YXRpYyByZWFkb25seSBPTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAwKTtcbiAgc3RhdGljIHJlYWRvbmx5IE9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWCAgICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDEpO1xuICBzdGF0aWMgcmVhZG9ubHkgQ09NUFJFU1NFRF9NQVBEQVRBICAgICAgICAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMik7XG4gIHN0YXRpYyByZWFkb25seSBTSE9QX0NPVU5UICAgICAgICAgICAgICAgICAgID0gUm9tT3B0aW9uLmJ5dGUoMHgxNDJjMSk7XG4gIHN0YXRpYyByZWFkb25seSBTQ0FMSU5HX0xFVkVMUyAgICAgICAgICAgICAgID0gUm9tT3B0aW9uLmJ5dGUoMHgxNDJjMik7XG4gIHN0YXRpYyByZWFkb25seSBVTklRVUVfSVRFTV9UQUJMRSAgICAgICAgICAgID0gUm9tT3B0aW9uLmFkZHJlc3MoMHgxNDJkMCk7XG4gIHN0YXRpYyByZWFkb25seSBTSE9QX0RBVEFfVEFCTEVTICAgICAgICAgICAgID0gUm9tT3B0aW9uLmFkZHJlc3MoMHgxNDJkMyk7XG4gIHN0YXRpYyByZWFkb25seSBURUxFUEFUSFlfVEFCTEVTICAgICAgICAgICAgID0gUm9tT3B0aW9uLmFkZHJlc3MoMHgxNDJkNik7XG5cbiAgcmVhZG9ubHkgcHJnOiBVaW50OEFycmF5O1xuICByZWFkb25seSBjaHI6IFVpbnQ4QXJyYXk7XG5cbiAgcmVhZG9ubHkgc2NyZWVuczogU2NyZWVucztcbiAgcmVhZG9ubHkgdGlsZXNldHM6IFRpbGVzZXRzO1xuICByZWFkb25seSB0aWxlRWZmZWN0czogVGlsZUVmZmVjdHNbXTtcbiAgcmVhZG9ubHkgdHJpZ2dlcnM6IFRyaWdnZXJbXTtcbiAgcmVhZG9ubHkgcGF0dGVybnM6IFBhdHRlcm5bXTtcbiAgcmVhZG9ubHkgcGFsZXR0ZXM6IFBhbGV0dGVbXTtcbiAgcmVhZG9ubHkgbG9jYXRpb25zOiBMb2NhdGlvbnM7XG4gIHJlYWRvbmx5IHRpbGVBbmltYXRpb25zOiBUaWxlQW5pbWF0aW9uW107XG4gIHJlYWRvbmx5IGhpdGJveGVzOiBIaXRib3hbXTtcbiAgcmVhZG9ubHkgb2JqZWN0czogT2JqZWN0cztcbiAgcmVhZG9ubHkgYWRIb2NTcGF3bnM6IEFkSG9jU3Bhd25bXTtcbiAgcmVhZG9ubHkgbWV0YXNjcmVlbnM6IE1ldGFzY3JlZW5zO1xuICByZWFkb25seSBtZXRhc3ByaXRlczogTWV0YXNwcml0ZVtdO1xuICByZWFkb25seSBtZXRhdGlsZXNldHM6IE1ldGF0aWxlc2V0cztcbiAgcmVhZG9ubHkgaXRlbUdldHM6IEl0ZW1HZXRbXTtcbiAgcmVhZG9ubHkgaXRlbXM6IEl0ZW1bXTtcbiAgcmVhZG9ubHkgc2hvcHM6IFNob3BbXTtcbiAgcmVhZG9ubHkgbnBjczogTnBjW107XG4gIHJlYWRvbmx5IGJvc3NLaWxsczogQm9zc0tpbGxbXTtcbiAgcmVhZG9ubHkgYm9zc2VzOiBCb3NzZXM7XG4gIHJlYWRvbmx5IHdpbGRXYXJwOiBXaWxkV2FycDtcblxuICByZWFkb25seSB0ZWxlcGF0aHk6IFRlbGVwYXRoeTtcbiAgcmVhZG9ubHkgbWVzc2FnZXM6IE1lc3NhZ2VzO1xuXG4gIHNwb2lsZXI/OiBTcG9pbGVyO1xuXG4gIC8vIE5PVEU6IFRoZSBmb2xsb3dpbmcgcHJvcGVydGllcyBtYXkgYmUgY2hhbmdlZCBiZXR3ZWVuIHJlYWRpbmcgYW5kIHdyaXRpbmdcbiAgLy8gdGhlIHJvbS4gIElmIHRoaXMgaGFwcGVucywgdGhlIHdyaXR0ZW4gcm9tIHdpbGwgaGF2ZSBkaWZmZXJlbnQgb3B0aW9ucy5cbiAgLy8gVGhpcyBpcyBhbiBlZmZlY3RpdmUgd2F5IHRvIGNvbnZlcnQgYmV0d2VlbiB0d28gc3R5bGVzLlxuXG4gIC8vIE1heCBudW1iZXIgb2Ygc2hvcHMuICBWYXJpb3VzIGJsb2NrcyBvZiBtZW1vcnkgcmVxdWlyZSBrbm93aW5nIHRoaXMgbnVtYmVyXG4gIC8vIHRvIGFsbG9jYXRlLlxuICBzaG9wQ291bnQ6IG51bWJlcjtcbiAgLy8gTnVtYmVyIG9mIHNjYWxpbmcgbGV2ZWxzLiAgRGV0ZXJtaW5lcyB0aGUgc2l6ZSBvZiB0aGUgc2NhbGluZyB0YWJsZXMuXG4gIHNjYWxpbmdMZXZlbHM6IG51bWJlcjtcblxuICAvLyBBZGRyZXNzIHRvIHJlYWQvd3JpdGUgdGhlIGJpdGZpZWxkIGluZGljYXRpbmcgdW5pcXVlIGl0ZW1zLlxuICB1bmlxdWVJdGVtVGFibGVBZGRyZXNzOiBudW1iZXI7XG4gIC8vIEFkZHJlc3Mgb2Ygbm9ybWFsaXplZCBwcmljZXMgdGFibGUsIGlmIHByZXNlbnQuICBJZiB0aGlzIGlzIGFic2VudCB0aGVuIHdlXG4gIC8vIGFzc3VtZSBwcmljZXMgYXJlIG5vdCBub3JtYWxpemVkIGFuZCBhcmUgYXQgdGhlIG5vcm1hbCBwYXduIHNob3AgYWRkcmVzcy5cbiAgc2hvcERhdGFUYWJsZXNBZGRyZXNzOiBudW1iZXI7XG4gIC8vIEFkZHJlc3Mgb2YgcmVhcnJhbmdlZCB0ZWxlcGF0aHkgdGFibGVzLlxuICB0ZWxlcGF0aHlUYWJsZXNBZGRyZXNzOiBudW1iZXI7XG4gIC8vIFdoZXRoZXIgdGhlIHRyYWlsaW5nICRmZiBzaG91bGQgYmUgb21pdHRlZCBmcm9tIHRoZSBJdGVtR2V0RGF0YSB0YWJsZS5cbiAgb21pdEl0ZW1HZXREYXRhU3VmZml4OiBib29sZWFuO1xuICAvLyBXaGV0aGVyIHRoZSB0cmFpbGluZyBieXRlIG9mIGVhY2ggTG9jYWxEaWFsb2cgaXMgb21pdHRlZC4gIFRoaXMgYWZmZWN0c1xuICAvLyBib3RoIHJlYWRpbmcgYW5kIHdyaXRpbmcgdGhlIHRhYmxlLiAgTWF5IGJlIGluZmVycmVkIHdoaWxlIHJlYWRpbmcuXG4gIG9taXRMb2NhbERpYWxvZ1N1ZmZpeDogYm9vbGVhbjtcbiAgLy8gV2hldGhlciBtYXBkYXRhIGhhcyBiZWVuIGNvbXByZXNzZWQuXG4gIGNvbXByZXNzZWRNYXBEYXRhOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKHJvbTogVWludDhBcnJheSkge1xuICAgIGNvbnN0IHByZ1NpemUgPSByb21bNF0gKiAweDQwMDA7XG4gICAgLy8gTk9URTogY2hyU2l6ZSA9IHJvbVs1XSAqIDB4MjAwMDtcbiAgICBjb25zdCBwcmdTdGFydCA9IDB4MTAgKyAocm9tWzZdICYgNCA/IDUxMiA6IDApO1xuICAgIGNvbnN0IHByZ0VuZCA9IHByZ1N0YXJ0ICsgcHJnU2l6ZTtcbiAgICB0aGlzLnByZyA9IHJvbS5zdWJhcnJheShwcmdTdGFydCwgcHJnRW5kKTtcbiAgICB0aGlzLmNociA9IHJvbS5zdWJhcnJheShwcmdFbmQpO1xuXG4gICAgdGhpcy5zaG9wQ291bnQgPSBSb20uU0hPUF9DT1VOVC5nZXQocm9tKTtcbiAgICB0aGlzLnNjYWxpbmdMZXZlbHMgPSBSb20uU0NBTElOR19MRVZFTFMuZ2V0KHJvbSk7XG4gICAgdGhpcy51bmlxdWVJdGVtVGFibGVBZGRyZXNzID0gUm9tLlVOSVFVRV9JVEVNX1RBQkxFLmdldChyb20pO1xuICAgIHRoaXMuc2hvcERhdGFUYWJsZXNBZGRyZXNzID0gUm9tLlNIT1BfREFUQV9UQUJMRVMuZ2V0KHJvbSk7XG4gICAgdGhpcy50ZWxlcGF0aHlUYWJsZXNBZGRyZXNzID0gUm9tLlRFTEVQQVRIWV9UQUJMRVMuZ2V0KHJvbSk7XG4gICAgdGhpcy5vbWl0SXRlbUdldERhdGFTdWZmaXggPSBSb20uT01JVF9JVEVNX0dFVF9EQVRBX1NVRkZJWC5nZXQocm9tKTtcbiAgICB0aGlzLm9taXRMb2NhbERpYWxvZ1N1ZmZpeCA9IFJvbS5PTUlUX0xPQ0FMX0RJQUxPR19TVUZGSVguZ2V0KHJvbSk7XG4gICAgdGhpcy5jb21wcmVzc2VkTWFwRGF0YSA9IFJvbS5DT01QUkVTU0VEX01BUERBVEEuZ2V0KHJvbSk7XG5cbiAgICAvLyBpZiAoY3JjMzIocm9tKSA9PT0gRVhQRUNURURfQ1JDMzIpIHtcbiAgICBmb3IgKGNvbnN0IFthZGRyZXNzLCBvbGQsIHZhbHVlXSBvZiBBREpVU1RNRU5UUykge1xuICAgICAgaWYgKHRoaXMucHJnW2FkZHJlc3NdID09PSBvbGQpIHRoaXMucHJnW2FkZHJlc3NdID0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gTG9hZCB1cCBhIGJ1bmNoIG9mIGRhdGEgdGFibGVzLiAgVGhpcyB3aWxsIGluY2x1ZGUgYSBsYXJnZSBudW1iZXIgb2YgdGhlXG4gICAgLy8gZGF0YSB0YWJsZXMgaW4gdGhlIFJPTS4gIFRoZSBpZGVhIGlzIHRoYXQgd2UgY2FuIGVkaXQgdGhlIGFycmF5cyBsb2NhbGx5XG4gICAgLy8gYW5kIHRoZW4gaGF2ZSBhIFwiY29tbWl0XCIgZnVuY3Rpb24gdGhhdCByZWJ1aWxkcyB0aGUgUk9NIHdpdGggdGhlIG5ld1xuICAgIC8vIGFycmF5cy4gIFdlIG1heSBuZWVkIHRvIHdyaXRlIGEgXCJwYWdlZCBhbGxvY2F0b3JcIiB0aGF0IGNhbiBhbGxvY2F0ZVxuICAgIC8vIGNodW5rcyBvZiBST00gaW4gYSBnaXZlbiBwYWdlLiAgUHJvYmFibHkgd2FudCB0byB1c2UgYSBncmVlZHkgYWxnb3JpdGhtXG4gICAgLy8gd2hlcmUgd2Ugc3RhcnQgd2l0aCB0aGUgYmlnZ2VzdCBjaHVuayBhbmQgcHV0IGl0IGluIHRoZSBzbWFsbGVzdCBzcG90XG4gICAgLy8gdGhhdCBmaXRzIGl0LiAgUHJlc3VtYWJseSB3ZSBrbm93IHRoZSBzaXplcyB1cCBmcm9udCBldmVuIGJlZm9yZSB3ZSBoYXZlXG4gICAgLy8gYWxsIHRoZSBhZGRyZXNzZXMsIHNvIHdlIGNvdWxkIGRvIGFsbCB0aGUgYWxsb2NhdGlvbiBhdCBvbmNlIC0gcHJvYmFibHlcbiAgICAvLyByZXR1cm5pbmcgYSB0b2tlbiBmb3IgZWFjaCBhbGxvY2F0aW9uIGFuZCB0aGVuIGFsbCB0b2tlbnMgZ2V0IGZpbGxlZCBpblxuICAgIC8vIGF0IG9uY2UgKGFjdHVhbCBwcm9taXNlcyB3b3VsZCBiZSBtb3JlIHVud2VpbGR5KS5cbiAgICAvLyBUcmlja3kgLSB3aGF0IGFib3V0IHNoYXJlZCBlbGVtZW50cyBvZiBkYXRhIHRhYmxlcyAtIHdlIHB1bGwgdGhlbVxuICAgIC8vIHNlcGFyYXRlbHksIGJ1dCB3ZSdsbCBuZWVkIHRvIHJlLWNvYWxlc2NlIHRoZW0uICBCdXQgdGhpcyByZXF1aXJlc1xuICAgIC8vIGtub3dpbmcgdGhlaXIgY29udGVudHMgQkVGT1JFIGFsbG9jYXRpbmcgdGhlaXIgc3BhY2UuICBTbyB3ZSBuZWVkIHR3b1xuICAgIC8vIGFsbG9jYXRlIG1ldGhvZHMgLSBvbmUgd2hlcmUgdGhlIGNvbnRlbnQgaXMga25vd24gYW5kIG9uZSB3aGVyZSBvbmx5IHRoZVxuICAgIC8vIGxlbmd0aCBpcyBrbm93bi5cbiAgICB0aGlzLnRpbGVzZXRzID0gbmV3IFRpbGVzZXRzKHRoaXMpO1xuICAgIHRoaXMudGlsZUVmZmVjdHMgPSBzZXEoMTEsIGkgPT4gbmV3IFRpbGVFZmZlY3RzKHRoaXMsIGkgKyAweGIzKSk7XG4gICAgdGhpcy5zY3JlZW5zID0gbmV3IFNjcmVlbnModGhpcyk7XG4gICAgdGhpcy5tZXRhdGlsZXNldHMgPSBuZXcgTWV0YXRpbGVzZXRzKHRoaXMpO1xuICAgIHRoaXMubWV0YXNjcmVlbnMgPSBuZXcgTWV0YXNjcmVlbnModGhpcyk7XG4gICAgdGhpcy50cmlnZ2VycyA9IHNlcSgweDQzLCBpID0+IG5ldyBUcmlnZ2VyKHRoaXMsIDB4ODAgfCBpKSk7XG4gICAgdGhpcy5wYXR0ZXJucyA9IHNlcSh0aGlzLmNoci5sZW5ndGggPj4gNCwgaSA9PiBuZXcgUGF0dGVybih0aGlzLCBpKSk7XG4gICAgdGhpcy5wYWxldHRlcyA9IHNlcSgweDEwMCwgaSA9PiBuZXcgUGFsZXR0ZSh0aGlzLCBpKSk7XG4gICAgdGhpcy5sb2NhdGlvbnMgPSBuZXcgTG9jYXRpb25zKHRoaXMpO1xuICAgIHRoaXMudGlsZUFuaW1hdGlvbnMgPSBzZXEoNCwgaSA9PiBuZXcgVGlsZUFuaW1hdGlvbih0aGlzLCBpKSk7XG4gICAgdGhpcy5oaXRib3hlcyA9IHNlcSgyNCwgaSA9PiBuZXcgSGl0Ym94KHRoaXMsIGkpKTtcbiAgICB0aGlzLm9iamVjdHMgPSBuZXcgT2JqZWN0cyh0aGlzKTtcbiAgICB0aGlzLmFkSG9jU3Bhd25zID0gc2VxKDB4NjAsIGkgPT4gbmV3IEFkSG9jU3Bhd24odGhpcywgaSkpO1xuICAgIHRoaXMubWV0YXNwcml0ZXMgPSBzZXEoMHgxMDAsIGkgPT4gbmV3IE1ldGFzcHJpdGUodGhpcywgaSkpO1xuICAgIHRoaXMubWVzc2FnZXMgPSBuZXcgTWVzc2FnZXModGhpcyk7XG4gICAgdGhpcy50ZWxlcGF0aHkgPSBuZXcgVGVsZXBhdGh5KHRoaXMpO1xuICAgIHRoaXMuaXRlbUdldHMgPSBzZXEoMHg3MSwgaSA9PiBuZXcgSXRlbUdldCh0aGlzLCBpKSk7XG4gICAgdGhpcy5pdGVtcyA9IHNlcSgweDQ5LCBpID0+IG5ldyBJdGVtKHRoaXMsIGkpKTtcbiAgICB0aGlzLnNob3BzID0gc2VxKDQ0LCBpID0+IG5ldyBTaG9wKHRoaXMsIGkpKTsgLy8gTk9URTogZGVwZW5kcyBvbiBsb2NhdGlvbnMgYW5kIG9iamVjdHNcbiAgICB0aGlzLm5wY3MgPSBzZXEoMHhjZCwgaSA9PiBuZXcgTnBjKHRoaXMsIGkpKTtcbiAgICB0aGlzLmJvc3NLaWxscyA9IHNlcSgweGUsIGkgPT4gbmV3IEJvc3NLaWxsKHRoaXMsIGkpKTtcbiAgICB0aGlzLmJvc3NlcyA9IG5ldyBCb3NzZXModGhpcyk7XG4gICAgdGhpcy53aWxkV2FycCA9IG5ldyBXaWxkV2FycCh0aGlzKTtcbiAgfVxuXG4gIHRyaWdnZXIoaWQ6IG51bWJlcik6IFRyaWdnZXIge1xuICAgIGlmIChpZCA8IDB4ODAgfHwgaWQgPiAweGZmKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCB0cmlnZ2VyIGlkICQke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHRoaXMudHJpZ2dlcnNbaWQgJiAweDdmXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBjcm9zcy1yZWZlcmVuY2UgbW9uc3RlcnMvbWV0YXNwcml0ZXMvbWV0YXRpbGVzL3NjcmVlbnMgd2l0aCBwYXR0ZXJucy9wYWxldHRlc1xuICAvLyBnZXQgbW9uc3RlcnMoKTogT2JqZWN0RGF0YVtdIHtcbiAgLy8gICBjb25zdCBtb25zdGVycyA9IG5ldyBTZXQ8T2JqZWN0RGF0YT4oKTtcbiAgLy8gICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgLy8gICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gIC8vICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgLy8gICAgICAgaWYgKG8uaXNNb25zdGVyKCkpIG1vbnN0ZXJzLmFkZCh0aGlzLm9iamVjdHNbby5tb25zdGVySWRdKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIFsuLi5tb25zdGVyc10uc29ydCgoeCwgeSkgPT4gKHguaWQgLSB5LmlkKSk7XG4gIC8vIH1cblxuICBnZXQgcHJvamVjdGlsZXMoKTogT2JqZWN0RGF0YVtdIHtcbiAgICBjb25zdCBwcm9qZWN0aWxlcyA9IG5ldyBTZXQ8T2JqZWN0RGF0YT4oKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgdGhpcy5vYmplY3RzLmZpbHRlcihvID0+IG8gaW5zdGFuY2VvZiBNb25zdGVyKSkge1xuICAgICAgaWYgKG0uY2hpbGQpIHtcbiAgICAgICAgcHJvamVjdGlsZXMuYWRkKHRoaXMub2JqZWN0c1t0aGlzLmFkSG9jU3Bhd25zW20uY2hpbGRdLm9iamVjdElkXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbLi4ucHJvamVjdGlsZXNdLnNvcnQoKHgsIHkpID0+ICh4LmlkIC0geS5pZCkpO1xuICB9XG5cbiAgZ2V0IG1vbnN0ZXJHcmFwaGljcygpIHtcbiAgICBjb25zdCBnZng6IHtbaWQ6IHN0cmluZ106XG4gICAgICAgICAgICAgICAge1tpbmZvOiBzdHJpbmddOlxuICAgICAgICAgICAgICAgICB7c2xvdDogbnVtYmVyLCBwYXQ6IG51bWJlciwgcGFsOiBudW1iZXJ9fX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgICAgICAgaWYgKCEoby5kYXRhWzJdICYgNykpIHtcbiAgICAgICAgICBjb25zdCBzbG90ID0gby5kYXRhWzJdICYgMHg4MCA/IDEgOiAwO1xuICAgICAgICAgIGNvbnN0IGlkID0gaGV4KG8uZGF0YVszXSArIDB4NTApO1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBnZnhbaWRdID0gZ2Z4W2lkXSB8fCB7fTtcbiAgICAgICAgICBkYXRhW2Ake3Nsb3R9OiR7bC5zcHJpdGVQYXR0ZXJuc1tzbG90XS50b1N0cmluZygxNil9OiR7XG4gICAgICAgICAgICAgICBsLnNwcml0ZVBhbGV0dGVzW3Nsb3RdLnRvU3RyaW5nKDE2KX1gXVxuICAgICAgICAgICAgPSB7cGFsOiBsLnNwcml0ZVBhbGV0dGVzW3Nsb3RdLFxuICAgICAgICAgICAgICAgcGF0OiBsLnNwcml0ZVBhdHRlcm5zW3Nsb3RdLFxuICAgICAgICAgICAgICAgc2xvdCxcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZ2Z4O1xuICB9XG5cbiAgZ2V0IGxvY2F0aW9uTW9uc3RlcnMoKSB7XG4gICAgY29uc3QgbToge1tpZDogc3RyaW5nXToge1tpbmZvOiBzdHJpbmddOiBudW1iZXJ9fSA9IHt9O1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgICAgIC8vIHdoaWNoIG1vbnN0ZXJzIGFyZSBpbiB3aGljaCBzbG90cz9cbiAgICAgIGNvbnN0IHM6IHtbaW5mbzogc3RyaW5nXTogbnVtYmVyfSA9IG1bJyQnICsgaGV4KGwuaWQpXSA9IHt9O1xuICAgICAgZm9yIChjb25zdCBvIG9mIGwuc3Bhd25zKSB7XG4gICAgICAgIGlmICghKG8uZGF0YVsyXSAmIDcpKSB7XG4gICAgICAgICAgY29uc3Qgc2xvdCA9IG8uZGF0YVsyXSAmIDB4ODAgPyAxIDogMDtcbiAgICAgICAgICBjb25zdCBpZCA9IG8uZGF0YVszXSArIDB4NTA7XG4gICAgICAgICAgc1tgJHtzbG90fToke2lkLnRvU3RyaW5nKDE2KX1gXSA9XG4gICAgICAgICAgICAgIChzW2Ake3Nsb3R9OiR7aWQudG9TdHJpbmcoMTYpfWBdIHx8IDApICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBmb3IgZWFjaCBzcHJpdGUgcGF0dGVybiB0YWJsZSwgZmluZCBhbGwgdGhlIHBhbGV0dGVzIHRoYXQgaXQgdXNlcy5cbiAgLy8gRmluZCBhbGwgdGhlIG1vbnN0ZXJzIG9uIGl0LiAgV2UgY2FuIHByb2JhYmx5IGFsbG93IGFueSBwYWxldHRlIHNvIGxvbmdcbiAgLy8gYXMgb25lIG9mIHRoZSBwYWxldHRlcyBpcyB1c2VkIHdpdGggdGhhdCBwYXR0ZXJuLlxuICAvLyBUT0RPIC0gbWF4IG51bWJlciBvZiBpbnN0YW5jZXMgb2YgYSBtb25zdGVyIG9uIGFueSBtYXAgLSBpLmUuIGF2b2lkIGhhdmluZ1xuICAvLyBmaXZlIGZseWVycyBvbiB0aGUgc2FtZSBtYXAhXG5cbiAgLy8gNDYwIC0gMCBtZWFucyBlaXRoZXIgZmx5ZXIgb3Igc3RhdGlvbmFyeVxuICAvLyAgICAgICAgICAgLSBzdGF0aW9uYXJ5IGhhcyA0YTAgfiAyMDQsMjA1LDIwNlxuICAvLyAgICAgICAgICAgICAoa3Jha2VuLCBzd2FtcCBwbGFudCwgc29yY2Vyb3IpXG4gIC8vICAgICAgIDYgLSBtaW1pY1xuICAvLyAgICAgICAxZiAtIHN3aW1tZXJcbiAgLy8gICAgICAgNTQgLSB0b21hdG8gYW5kIGJpcmRcbiAgLy8gICAgICAgNTUgLSBzd2ltbWVyXG4gIC8vICAgICAgIDU3IC0gbm9ybWFsXG4gIC8vICAgICAgIDVmIC0gYWxzbyBub3JtYWwsIGJ1dCBtZWR1c2EgaGVhZCBpcyBmbHllcj9cbiAgLy8gICAgICAgNzcgLSBzb2xkaWVycywgaWNlIHpvbWJpZVxuXG4vLyAgIC8vIERvbid0IHdvcnJ5IGFib3V0IG90aGVyIGRhdGFzIHlldFxuLy8gICB3cml0ZU9iamVjdERhdGEoKSB7XG4vLyAgICAgLy8gYnVpbGQgdXAgYSBtYXAgZnJvbSBhY3R1YWwgZGF0YSB0byBpbmRleGVzIHRoYXQgcG9pbnQgdG8gaXRcbi8vICAgICBsZXQgYWRkciA9IDB4MWFlMDA7XG4vLyAgICAgY29uc3QgZGF0YXMgPSB7fTtcbi8vICAgICBmb3IgKGNvbnN0IG9iamVjdCBvZiB0aGlzLm9iamVjdHMpIHtcbi8vICAgICAgIGNvbnN0IHNlciA9IG9iamVjdC5zZXJpYWxpemUoKTtcbi8vICAgICAgIGNvbnN0IGRhdGEgPSBzZXIuam9pbignICcpO1xuLy8gICAgICAgaWYgKGRhdGEgaW4gZGF0YXMpIHtcbi8vIC8vY29uc29sZS5sb2coYCQke29iamVjdC5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKX06IFJldXNpbmcgZXhpc3RpbmcgZGF0YSAkJHtkYXRhc1tkYXRhXS50b1N0cmluZygxNil9YCk7XG4vLyAgICAgICAgIG9iamVjdC5vYmplY3REYXRhQmFzZSA9IGRhdGFzW2RhdGFdO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgb2JqZWN0Lm9iamVjdERhdGFCYXNlID0gYWRkcjtcbi8vICAgICAgICAgZGF0YXNbZGF0YV0gPSBhZGRyO1xuLy8gLy9jb25zb2xlLmxvZyhgJCR7b2JqZWN0LmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApfTogRGF0YSBpcyBhdCAkJHtcbi8vIC8vICAgICAgICAgICAgIGFkZHIudG9TdHJpbmcoMTYpfTogJHtBcnJheS5mcm9tKHNlciwgeD0+JyQnK3gudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCkpLmpvaW4oJywnKX1gKTtcbi8vICAgICAgICAgYWRkciArPSBzZXIubGVuZ3RoO1xuLy8gLy8gc2VlZCAzNTE3ODExMDM2XG4vLyAgICAgICB9XG4vLyAgICAgICBvYmplY3Qud3JpdGUoKTtcbi8vICAgICB9XG4vLyAvL2NvbnNvbGUubG9nKGBXcm90ZSBvYmplY3QgZGF0YSBmcm9tICQxYWMwMCB0byAkJHthZGRyLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg1LCAwKVxuLy8gLy8gICAgICAgICAgICAgfSwgc2F2aW5nICR7MHgxYmU5MSAtIGFkZHJ9IGJ5dGVzLmApO1xuLy8gICAgIHJldHVybiBhZGRyO1xuLy8gICB9XG5cbiAgYXN5bmMgd3JpdGVEYXRhKCkge1xuICAgIC8vIFdyaXRlIHRoZSBvcHRpb25zIGZpcnN0XG4gICAgUm9tLlNIT1BfQ09VTlQuc2V0KHRoaXMucHJnLCB0aGlzLnNob3BDb3VudCk7XG4gICAgUm9tLlNDQUxJTkdfTEVWRUxTLnNldCh0aGlzLnByZywgdGhpcy5zY2FsaW5nTGV2ZWxzKTtcbiAgICBSb20uVU5JUVVFX0lURU1fVEFCTEUuc2V0KHRoaXMucHJnLCB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MpO1xuICAgIFJvbS5TSE9QX0RBVEFfVEFCTEVTLnNldCh0aGlzLnByZywgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MpO1xuICAgIFJvbS5PTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYLnNldCh0aGlzLnByZywgdGhpcy5vbWl0SXRlbUdldERhdGFTdWZmaXgpO1xuICAgIFJvbS5PTUlUX0xPQ0FMX0RJQUxPR19TVUZGSVguc2V0KHRoaXMucHJnLCB0aGlzLm9taXRMb2NhbERpYWxvZ1N1ZmZpeCk7XG4gICAgUm9tLkNPTVBSRVNTRURfTUFQREFUQS5zZXQodGhpcy5wcmcsIHRoaXMuY29tcHJlc3NlZE1hcERhdGEpO1xuXG4gICAgY29uc3Qgd3JpdGVyID0gbmV3IFdyaXRlcih0aGlzLnByZywgdGhpcy5jaHIpO1xuICAgIC8vIE1hcERhdGFcbiAgICB3cml0ZXIuYWxsb2MoMHgxNDRmOCwgMHgxN2UwMCk7XG4gICAgLy8gTnBjRGF0YVxuICAgIC8vIE5PVEU6IDE5M2Y5IGlzIGFzc3VtaW5nICRmYiBpcyB0aGUgbGFzdCBsb2NhdGlvbiBJRC4gIElmIHdlIGFkZCBtb3JlIGxvY2F0aW9ucyBhdFxuICAgIC8vIHRoZSBlbmQgdGhlbiB3ZSdsbCBuZWVkIHRvIHB1c2ggdGhpcyBiYWNrIGEgZmV3IG1vcmUgYnl0ZXMuICBXZSBjb3VsZCBwb3NzaWJseVxuICAgIC8vIGRldGVjdCB0aGUgYmFkIHdyaXRlIGFuZCB0aHJvdyBhbiBlcnJvciwgYW5kL29yIGNvbXB1dGUgdGhlIG1heCBsb2NhdGlvbiBJRC5cbiAgICB3cml0ZXIuYWxsb2MoMHgxOTNmOSwgMHgxYWMwMCk7XG4gICAgLy8gT2JqZWN0RGF0YSAoaW5kZXggYXQgMWFjMDAuLjFhZTAwKVxuICAgIHdyaXRlci5hbGxvYygweDFhZTAwLCAweDFiZDAwKTsgLy8gc2F2ZSA1MTIgYnl0ZXMgYXQgZW5kIGZvciBzb21lIGV4dHJhIGNvZGVcbiAgICAvLyBOcGNTcGF3bkNvbmRpdGlvbnNcbiAgICB3cml0ZXIuYWxsb2MoMHgxYzc3YSwgMHgxYzk1ZCk7XG4gICAgLy8gTnBjRGlhbG9nXG4gICAgd3JpdGVyLmFsbG9jKDB4MWNhZTUsIDB4MWQ4ZjQpO1xuICAgIC8vIEl0ZW1HZXREYXRhXG4gICAgd3JpdGVyLmFsbG9jKDB4MWRkZTYsIDB4MWUwNjUpO1xuICAgIC8vIFRyaWdnZXJEYXRhXG4gICAgLy8gTk9URTogVGhlcmUncyBzb21lIGZyZWUgc3BhY2UgYXQgMWUzYzAuLjFlM2YwLCBidXQgd2UgdXNlIHRoaXMgZm9yIHRoZVxuICAgIC8vIENoZWNrQmVsb3dCb3NzIHRyaWdnZXJzLlxuICAgIHdyaXRlci5hbGxvYygweDFlMjAwLCAweDFlM2MwKTtcbiAgICAvLyBJdGVtTWVudU5hbWVcbiAgICB3cml0ZXIuYWxsb2MoMHgyMTExYSwgMHgyMTQ2OCk7XG4gICAgLy8ga2VlcCBpdGVtICQ0OSBcIiAgICAgICAgXCIgd2hpY2ggaXMgYWN0dWFsbHkgdXNlZCBzb21ld2hlcmU/XG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjE0NzEsIDB4MjE0ZjEpOyAvLyBUT0RPIC0gZG8gd2UgbmVlZCBhbnkgb2YgdGhpcz9cbiAgICAvLyBJdGVtTWVzc2FnZU5hbWVcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyOGU4MSwgMHgyOTIyYik7IC8vIE5PVEU6IHVuY292ZXJlZCB0aHJ1IDI5NDAwXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjkyMmIsIDB4Mjk0MDApOyAvLyBUT0RPIC0gbmVlZGVkP1xuICAgIC8vIE5PVEU6IG9uY2Ugd2UgcmVsZWFzZSB0aGUgb3RoZXIgbWVzc2FnZSB0YWJsZXMsIHRoaXMgd2lsbCBqdXN0IGJlIG9uZSBnaWFudCBibG9jay5cblxuICAgIC8vIE1lc3NhZ2UgdGFibGUgcGFydHNcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyODAwMCwgMHgyODNmZSk7XG4gICAgLy8gTWVzc2FnZSB0YWJsZXNcbiAgICAvLyBUT0RPIC0gd2UgZG9uJ3QgdXNlIHRoZSB3cml0ZXIgdG8gYWxsb2NhdGUgdGhlIGFiYnJldmlhdGlvbiB0YWJsZXMsIGJ1dCB3ZSBjb3VsZFxuICAgIHdyaXRlci5hbGxvYygweDJhMDAwLCAweDJmYzAwKTtcblxuICAgIGlmICh0aGlzLnRlbGVwYXRoeVRhYmxlc0FkZHJlc3MpIHtcbiAgICAgIHdyaXRlci5hbGxvYygweDFkOGY0LCAweDFkYjAwKTsgLy8gbG9jYXRpb24gdGFibGUgYWxsIHRoZSB3YXkgdGhydSBtYWluXG4gICAgfSBlbHNlIHtcbiAgICAgIHdyaXRlci5hbGxvYygweDFkYTRjLCAweDFkYjAwKTsgLy8gZXhpc3RpbmcgbWFpbiB0YWJsZSBpcyBoZXJlLlxuICAgIH1cblxuICAgIGNvbnN0IHByb21pc2VzID0gW107XG4gICAgY29uc3Qgd3JpdGVBbGwgPSAod3JpdGFibGVzOiBJdGVyYWJsZTx7d3JpdGUod3JpdGVyOiBXcml0ZXIpOiB1bmtub3dufT4pID0+IHtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB3cml0YWJsZXMpIHtcbiAgICAgICAgcHJvbWlzZXMucHVzaCh3LndyaXRlKHdyaXRlcikpO1xuICAgICAgfVxuICAgIH07XG4gICAgd3JpdGVBbGwodGhpcy5sb2NhdGlvbnMpO1xuICAgIHdyaXRlQWxsKHRoaXMub2JqZWN0cyk7XG4gICAgd3JpdGVBbGwodGhpcy5oaXRib3hlcyk7XG4gICAgd3JpdGVBbGwodGhpcy50cmlnZ2Vycyk7XG4gICAgd3JpdGVBbGwodGhpcy5ucGNzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRpbGVzZXRzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRpbGVFZmZlY3RzKTtcbiAgICB3cml0ZUFsbCh0aGlzLmFkSG9jU3Bhd25zKTtcbiAgICB3cml0ZUFsbCh0aGlzLml0ZW1HZXRzKTtcbiAgICB3cml0ZUFsbCh0aGlzLml0ZW1zKTtcbiAgICB3cml0ZUFsbCh0aGlzLnNob3BzKTtcbiAgICB3cml0ZUFsbCh0aGlzLmJvc3NLaWxscyk7XG4gICAgd3JpdGVBbGwodGhpcy5wYXR0ZXJucyk7XG5cbiAgICBpZiAodGhpcy5jb21wcmVzc2VkTWFwRGF0YSkge1xuICAgICAgZm9yIChsZXQgcyA9IDA7IHMgPCAweDEwMDsgcysrKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHRoaXMuc2NyZWVuc1tzXTtcbiAgICAgICAgaWYgKHNjci51c2VkKSBwcm9taXNlcy5wdXNoKHNjci53cml0ZSh3cml0ZXIpKTtcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IHAgPSAxOyBwIDwgMHg0MDsgcCsrKSB7XG4gICAgICAgIGZvciAobGV0IHMgPSAwOyBzIDwgMHgyMDsgcysrKSB7XG4gICAgICAgICAgY29uc3Qgc2NyID0gdGhpcy5zY3JlZW5zW3AgPDwgOCB8IHNdO1xuICAgICAgICAgIGlmIChzY3IgJiYgc2NyLnVzZWQpIHByb21pc2VzLnB1c2goc2NyLndyaXRlKHdyaXRlcikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHdyaXRlQWxsKHRoaXMuc2NyZWVucyk7XG4gICAgfVxuXG4gICAgdGhpcy53aWxkV2FycC53cml0ZSh3cml0ZXIpO1xuICAgIHByb21pc2VzLnB1c2godGhpcy50ZWxlcGF0aHkud3JpdGUod3JpdGVyKSk7XG4gICAgcHJvbWlzZXMucHVzaCh0aGlzLm1lc3NhZ2VzLndyaXRlKHdyaXRlcikpO1xuICAgIHByb21pc2VzLnB1c2god3JpdGVyLmNvbW1pdCgpKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICB9XG5cbiAgYW5hbHl6ZVRpbGVzKCkge1xuICAgIC8vIEZvciBhbnkgZ2l2ZW4gdGlsZSBpbmRleCwgd2hhdCBzY3JlZW5zIGRvZXMgaXQgYXBwZWFyIG9uLlxuICAgIC8vIEZvciB0aG9zZSBzY3JlZW5zLCB3aGljaCB0aWxlc2V0cyBkb2VzICppdCogYXBwZWFyIG9uLlxuICAgIC8vIFRoYXQgdGlsZSBJRCBpcyBsaW5rZWQgYWNyb3NzIGFsbCB0aG9zZSB0aWxlc2V0cy5cbiAgICAvLyBGb3JtcyBhIHBhcnRpdGlvbmluZyBmb3IgZWFjaCB0aWxlIElEID0+IHVuaW9uLWZpbmQuXG4gICAgLy8gR2l2ZW4gdGhpcyBwYXJ0aXRpb25pbmcsIGlmIEkgd2FudCB0byBtb3ZlIGEgdGlsZSBvbiBhIGdpdmVuXG4gICAgLy8gdGlsZXNldCwgYWxsIEkgbmVlZCB0byBkbyBpcyBmaW5kIGFub3RoZXIgdGlsZSBJRCB3aXRoIHRoZVxuICAgIC8vIHNhbWUgcGFydGl0aW9uIGFuZCBzd2FwIHRoZW0/XG5cbiAgICAvLyBNb3JlIGdlbmVyYWxseSwgd2UgY2FuIGp1c3QgcGFydGl0aW9uIHRoZSB0aWxlc2V0cy5cblxuICAgIC8vIEZvciBlYWNoIHNjcmVlbiwgZmluZCBhbGwgdGlsZXNldHMgVCBmb3IgdGhhdCBzY3JlZW5cbiAgICAvLyBUaGVuIGZvciBlYWNoIHRpbGUgb24gdGhlIHNjcmVlbiwgdW5pb24gVCBmb3IgdGhhdCB0aWxlLlxuXG4gICAgLy8gR2l2ZW4gYSB0aWxlc2V0IGFuZCBhIG1ldGF0aWxlIElELCBmaW5kIGFsbCB0aGUgc2NyZWVucyB0aGF0ICgxKSBhcmUgcmVuZGVyZWRcbiAgICAvLyB3aXRoIHRoYXQgdGlsZXNldCwgYW5kIChiKSB0aGF0IGNvbnRhaW4gdGhhdCBtZXRhdGlsZTsgdGhlbiBmaW5kIGFsbCAqb3RoZXIqXG4gICAgLy8gdGlsZXNldHMgdGhhdCB0aG9zZSBzY3JlZW5zIGFyZSBldmVyIHJlbmRlcmVkIHdpdGguXG5cbiAgICAvLyBHaXZlbiBhIHNjcmVlbiwgZmluZCBhbGwgYXZhaWxhYmxlIG1ldGF0aWxlIElEcyB0aGF0IGNvdWxkIGJlIGFkZGVkIHRvIGl0XG4gICAgLy8gd2l0aG91dCBjYXVzaW5nIHByb2JsZW1zIHdpdGggb3RoZXIgc2NyZWVucyB0aGF0IHNoYXJlIGFueSB0aWxlc2V0cy5cbiAgICAvLyAgLT4gdW51c2VkIChvciB1c2VkIGJ1dCBzaGFyZWQgZXhjbHVzaXZlbHkpIGFjcm9zcyBhbGwgdGlsZXNldHMgdGhlIHNjcmVlbiBtYXkgdXNlXG5cbiAgICAvLyBXaGF0IEkgd2FudCBmb3Igc3dhcHBpbmcgaXMgdGhlIGZvbGxvd2luZzpcbiAgICAvLyAgMS4gZmluZCBhbGwgc2NyZWVucyBJIHdhbnQgdG8gd29yayBvbiA9PiB0aWxlc2V0c1xuICAgIC8vICAyLiBmaW5kIHVudXNlZCBmbGFnZ2FiYmxlIHRpbGVzIGluIHRoZSBoYXJkZXN0IG9uZSxcbiAgICAvLyAgICAgd2hpY2ggYXJlIGFsc28gSVNPTEFURUQgaW4gdGhlIG90aGVycy5cbiAgICAvLyAgMy4gd2FudCB0aGVzZSB0aWxlcyB0byBiZSB1bnVzZWQgaW4gQUxMIHJlbGV2YW50IHRpbGVzZXRzXG4gICAgLy8gIDQuIHRvIG1ha2UgdGhpcyBzbywgZmluZCAqb3RoZXIqIHVudXNlZCBmbGFnZ2FibGUgdGlsZXMgaW4gb3RoZXIgdGlsZXNldHNcbiAgICAvLyAgNS4gc3dhcCB0aGUgdW51c2VkIHdpdGggdGhlIGlzb2xhdGVkIHRpbGVzIGluIHRoZSBvdGhlciB0aWxlc2V0c1xuXG4gICAgLy8gQ2F2ZXM6XG4gICAgLy8gIDBhOiAgICAgIDkwIC8gOWNcbiAgICAvLyAgMTU6IDgwIC8gOTAgLyA5Y1xuICAgIC8vICAxOTogICAgICA5MCAgICAgICh3aWxsIGFkZCB0byA4MD8pXG4gICAgLy8gIDNlOiAgICAgIDkwXG4gICAgLy9cbiAgICAvLyBJZGVhbGx5IHdlIGNvdWxkIHJldXNlIDgwJ3MgMS8yLzMvNCBmb3IgdGhpc1xuICAgIC8vICAwMTogOTAgfCA5NCA5Y1xuICAgIC8vICAwMjogOTAgfCA5NCA5Y1xuICAgIC8vICAwMzogICAgICA5NCA5Y1xuICAgIC8vICAwNDogOTAgfCA5NCA5Y1xuICAgIC8vXG4gICAgLy8gTmVlZCA0IG90aGVyIGZsYWdnYWJsZSB0aWxlIGluZGljZXMgd2UgY2FuIHN3YXAgdG8/XG4gICAgLy8gICA5MDogPT4gKDEsMiBuZWVkIGZsYWdnYWJsZTsgMyB1bnVzZWQ7IDQgYW55KSA9PiAwNywgMGUsIDEwLCAxMiwgMTMsIC4uLiwgMjAsIDIxLCAyMiwgLi4uXG4gICAgLy8gICA5NCA5YzogPT4gZG9uJ3QgbmVlZCBhbnkgZmxhZ2dhYmxlID0+IDA1LCAzYywgNjgsIDgzLCA4OCwgODksIDhhLCA5MCwgLi4uXG4gIH1cblxuICBkaXNqb2ludFRpbGVzZXRzKCkge1xuICAgIGNvbnN0IHRpbGVzZXRCeVNjcmVlbjogQXJyYXk8U2V0PG51bWJlcj4+ID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbG9jLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgdGlsZXNldCA9IGxvYy50aWxlc2V0O1xuICAgICAgY29uc3QgZXh0ID0gbG9jLnNjcmVlblBhZ2U7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygcm93KSB7XG4gICAgICAgICAgKHRpbGVzZXRCeVNjcmVlbltzICsgZXh0XSB8fCAodGlsZXNldEJ5U2NyZWVuW3MgKyBleHRdID0gbmV3IFNldCgpKSkuYWRkKHRpbGVzZXQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRpbGVzID0gc2VxKDI1NiwgKCkgPT4gbmV3IFVuaW9uRmluZDxudW1iZXI+KCkpO1xuICAgIGZvciAobGV0IHMgPSAwOyBzIDwgdGlsZXNldEJ5U2NyZWVuLmxlbmd0aDsgcysrKSB7XG4gICAgICBpZiAoIXRpbGVzZXRCeVNjcmVlbltzXSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHQgb2YgdGhpcy5zY3JlZW5zW3NdLmFsbFRpbGVzU2V0KCkpIHtcbiAgICAgICAgdGlsZXNbdF0udW5pb24oWy4uLnRpbGVzZXRCeVNjcmVlbltzXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBvdXRwdXRcbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHRpbGVzLmxlbmd0aDsgdCsrKSB7XG4gICAgICBjb25zdCBwID0gdGlsZXNbdF0uc2V0cygpXG4gICAgICAgICAgLm1hcCgoczogU2V0PG51bWJlcj4pID0+IFsuLi5zXS5tYXAoaGV4KS5qb2luKCcgJykpXG4gICAgICAgICAgLmpvaW4oJyB8ICcpO1xuICAgICAgY29uc29sZS5sb2coYFRpbGUgJHtoZXgodCl9OiAke3B9YCk7XG4gICAgfVxuICAgIC8vICAgaWYgKCF0aWxlc2V0QnlTY3JlZW5baV0pIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coYE5vIHRpbGVzZXQgZm9yIHNjcmVlbiAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgIC8vICAgICBjb250aW51ZTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIHVuaW9uLnVuaW9uKFsuLi50aWxlc2V0QnlTY3JlZW5baV1dKTtcbiAgICAvLyB9XG4gICAgLy8gcmV0dXJuIHVuaW9uLnNldHMoKTtcbiAgfVxuXG4gIC8vIEN5Y2xlcyBhcmUgbm90IGFjdHVhbGx5IGN5Y2xpYyAtIGFuIGV4cGxpY2l0IGxvb3AgYXQgdGhlIGVuZCBpcyByZXF1aXJlZCB0byBzd2FwLlxuICAvLyBWYXJpYW5jZTogWzEsIDIsIG51bGxdIHdpbGwgY2F1c2UgaW5zdGFuY2VzIG9mIDEgdG8gYmVjb21lIDIgYW5kIHdpbGxcbiAgLy8gICAgICAgICAgIGNhdXNlIHByb3BlcnRpZXMgb2YgMSB0byBiZSBjb3BpZWQgaW50byBzbG90IDJcbiAgLy8gQ29tbW9uIHVzYWdlIGlzIHRvIHN3YXAgdGhpbmdzIG91dCBvZiB0aGUgd2F5IGFuZCB0aGVuIGNvcHkgaW50byB0aGVcbiAgLy8gbmV3bHktZnJlZWQgc2xvdC4gIFNheSB3ZSB3YW50ZWQgdG8gZnJlZSB1cCBzbG90cyBbMSwgMiwgMywgNF0gYW5kXG4gIC8vIGhhZCBhdmFpbGFibGUvZnJlZSBzbG90cyBbNSwgNiwgNywgOF0gYW5kIHdhbnQgdG8gY29weSBmcm9tIFs5LCBhLCBiLCBjXS5cbiAgLy8gVGhlbiBjeWNsZXMgd2lsbCBiZSBbMSwgNSwgOV0gPz8/IG5vXG4gIC8vICAtIHByb2JhYmx5IHdhbnQgdG8gZG8gc2NyZWVucyBzZXBhcmF0ZWx5IGZyb20gdGlsZXNldHMuLi4/XG4gIC8vIE5PVEUgLSB3ZSBkb24ndCBhY3R1YWxseSB3YW50IHRvIGNoYW5nZSB0aWxlcyBmb3IgdGhlIGxhc3QgY29weS4uLiFcbiAgLy8gICBpbiB0aGlzIGNhc2UsIHRzWzVdIDwtIHRzWzFdLCB0c1sxXSA8LSB0c1s5XSwgc2NyZWVuLm1hcCgxIC0+IDUpXG4gIC8vICAgcmVwbGFjZShbMHg5MF0sIFs1LCAxLCB+OV0pXG4gIC8vICAgICA9PiAxcyByZXBsYWNlZCB3aXRoIDVzIGluIHNjcmVlbnMgYnV0IDlzIE5PVCByZXBsYWNlZCB3aXRoIDFzLlxuICAvLyBKdXN0IGJ1aWxkIHRoZSBwYXJ0aXRpb24gb25jZSBsYXppbHk/IHRoZW4gY2FuIHJldXNlLi4uXG4gIC8vICAgLSBlbnN1cmUgYm90aCBzaWRlcyBvZiByZXBsYWNlbWVudCBoYXZlIGNvcnJlY3QgcGFydGl0aW9uaW5nP0VcbiAgLy8gICAgIG9yIGp1c3QgZG8gaXQgb2ZmbGluZSAtIGl0J3Mgc2ltcGxlclxuICAvLyBUT0RPIC0gU2FuaXR5IGNoZWNrPyAgV2FudCB0byBtYWtlIHN1cmUgbm9ib2R5IGlzIHVzaW5nIGNsb2JiZXJlZCB0aWxlcz9cbiAgc3dhcE1ldGF0aWxlcyh0aWxlc2V0czogbnVtYmVyW10sIC4uLmN5Y2xlczogKG51bWJlciB8IG51bWJlcltdKVtdW10pIHtcbiAgICAvLyBQcm9jZXNzIHRoZSBjeWNsZXNcbiAgICBjb25zdCByZXYgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGNvbnN0IHJldkFycjogbnVtYmVyW10gPSBzZXEoMHgxMDApO1xuICAgIGNvbnN0IGFsdCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgY29uc3QgY3BsID0gKHg6IG51bWJlciB8IG51bWJlcltdKTogbnVtYmVyID0+IEFycmF5LmlzQXJyYXkoeCkgPyB4WzBdIDogeCA8IDAgPyB+eCA6IHg7XG4gICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGN5Y2xlW2ldKSkge1xuICAgICAgICAgIGNvbnN0IGFyciA9IGN5Y2xlW2ldIGFzIG51bWJlcltdO1xuICAgICAgICAgIGFsdC5zZXQoYXJyWzBdLCBhcnJbMV0pO1xuICAgICAgICAgIGN5Y2xlW2ldID0gYXJyWzBdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICBjb25zdCBqID0gY3ljbGVbaV0gYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBrID0gY3ljbGVbaSArIDFdIGFzIG51bWJlcjtcbiAgICAgICAgaWYgKGogPCAwIHx8IGsgPCAwKSBjb250aW51ZTtcbiAgICAgICAgcmV2LnNldChrLCBqKTtcbiAgICAgICAgcmV2QXJyW2tdID0gajtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY29uc3QgcmVwbGFjZW1lbnRTZXQgPSBuZXcgU2V0KHJlcGxhY2VtZW50cy5rZXlzKCkpO1xuICAgIC8vIEZpbmQgaW5zdGFuY2VzIGluICgxKSBzY3JlZW5zLCAoMikgdGlsZXNldHMgYW5kIGFsdGVybmF0ZXMsICgzKSB0aWxlRWZmZWN0c1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXRzU2V0ID0gbmV3IFNldCh0aWxlc2V0cyk7XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXRpbGVzZXRzU2V0LmhhcyhsLnRpbGVzZXQpKSBjb250aW51ZTtcbiAgICAgIHRpbGVFZmZlY3RzLmFkZChsLnRpbGVFZmZlY3RzKTtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIGwuYWxsU2NyZWVucygpKSB7XG4gICAgICAgIHNjcmVlbnMuYWRkKHNjcmVlbik7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERvIHJlcGxhY2VtZW50cy5cbiAgICAvLyAxLiBzY3JlZW5zOiBbNSwgMSwgfjldID0+IGNoYW5nZSAxcyBpbnRvIDVzXG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2Ygc2NyZWVucykge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNjcmVlbi50aWxlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBzY3JlZW4udGlsZXNbaV0gPSByZXZBcnJbc2NyZWVuLnRpbGVzW2ldXTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gMi4gdGlsZXNldHM6IFs1LCAxIH45XSA9PiBjb3B5IDUgPD0gMSBhbmQgMSA8PSA5XG4gICAgZm9yIChjb25zdCB0c2lkIG9mIHRpbGVzZXRzU2V0KSB7XG4gICAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy50aWxlc2V0c1t0c2lkXTtcbiAgICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IGNwbChjeWNsZVtpXSk7XG4gICAgICAgICAgY29uc3QgYiA9IGNwbChjeWNsZVtpICsgMV0pO1xuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgNDsgaisrKSB7XG4gICAgICAgICAgICB0aWxlc2V0LnRpbGVzW2pdW2FdID0gdGlsZXNldC50aWxlc1tqXVtiXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGlsZXNldC5hdHRyc1thXSA9IHRpbGVzZXQuYXR0cnNbYl07XG4gICAgICAgICAgaWYgKGIgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1tiXSAhPT0gYikge1xuICAgICAgICAgICAgaWYgKGEgPj0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgdW5mbGFnOiAke3RzaWR9ICR7YX0gJHtifSAke3RpbGVzZXQuYWx0ZXJuYXRlc1tiXX1gKTtcbiAgICAgICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1tiXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW2EsIGJdIG9mIGFsdCkge1xuICAgICAgICB0aWxlc2V0LmFsdGVybmF0ZXNbYV0gPSBiO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyAzLiB0aWxlRWZmZWN0c1xuICAgIGZvciAoY29uc3QgdGVpZCBvZiB0aWxlRWZmZWN0cykge1xuICAgICAgY29uc3QgdGlsZUVmZmVjdCA9IHRoaXMudGlsZUVmZmVjdHNbdGVpZCAtIDB4YjNdO1xuICAgICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gY3BsKGN5Y2xlW2ldKTtcbiAgICAgICAgICBjb25zdCBiID0gY3BsKGN5Y2xlW2kgKyAxXSk7XG4gICAgICAgICAgdGlsZUVmZmVjdC5lZmZlY3RzW2FdID0gdGlsZUVmZmVjdC5lZmZlY3RzW2JdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGEgb2YgYWx0LmtleXMoKSkge1xuICAgICAgICAvLyBUaGlzIGJpdCBpcyByZXF1aXJlZCB0byBpbmRpY2F0ZSB0aGF0IHRoZSBhbHRlcm5hdGl2ZSB0aWxlJ3NcbiAgICAgICAgLy8gZWZmZWN0IHNob3VsZCBiZSBjb25zdWx0ZWQuICBTaW1wbHkgaGF2aW5nIHRoZSBmbGFnIGFuZCB0aGVcbiAgICAgICAgLy8gdGlsZSBpbmRleCA8ICQyMCBpcyBub3Qgc3VmZmljaWVudC5cbiAgICAgICAgdGlsZUVmZmVjdC5lZmZlY3RzW2FdIHw9IDB4MDg7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERvbmU/IT9cbiAgfVxuXG4gIG1vdmVGbGFnKG9sZEZsYWc6IG51bWJlciwgbmV3RmxhZzogbnVtYmVyKSB7XG4gICAgLy8gbmVlZCB0byB1cGRhdGUgdHJpZ2dlcnMsIHNwYXducywgZGlhbG9nc1xuICAgIGZ1bmN0aW9uIHJlcGxhY2UoYXJyOiBudW1iZXJbXSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFycltpXSA9PT0gb2xkRmxhZykgYXJyW2ldID0gbmV3RmxhZztcbiAgICAgICAgaWYgKGFycltpXSA9PT0gfm9sZEZsYWcpIGFycltpXSA9IH5uZXdGbGFnO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHRyaWdnZXIgb2YgdGhpcy50cmlnZ2Vycykge1xuICAgICAgcmVwbGFjZSh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuICAgICAgcmVwbGFjZSh0cmlnZ2VyLmZsYWdzKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBucGMgb2YgdGhpcy5ucGNzKSB7XG4gICAgICBmb3IgKGNvbnN0IGNvbmRzIG9mIG5wYy5zcGF3bkNvbmRpdGlvbnMudmFsdWVzKCkpIHJlcGxhY2UoY29uZHMpO1xuICAgICAgZm9yIChjb25zdCBkaWFsb2dzIG9mIFtucGMuZ2xvYmFsRGlhbG9ncywgLi4ubnBjLmxvY2FsRGlhbG9ncy52YWx1ZXMoKV0pIHtcbiAgICAgICAgZm9yIChjb25zdCBkaWFsb2cgb2YgZGlhbG9ncykge1xuICAgICAgICAgIGlmIChkaWFsb2cuY29uZGl0aW9uID09PSBvbGRGbGFnKSBkaWFsb2cuY29uZGl0aW9uID0gbmV3RmxhZztcbiAgICAgICAgICBpZiAoZGlhbG9nLmNvbmRpdGlvbiA9PT0gfm9sZEZsYWcpIGRpYWxvZy5jb25kaXRpb24gPSB+bmV3RmxhZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBhbHNvIG5lZWQgdG8gdXBkYXRlIG1hcCBmbGFncyBpZiA+PSAkMjAwXG4gICAgaWYgKChvbGRGbGFnICYgfjB4ZmYpID09PSAweDIwMCAmJiAobmV3RmxhZyAmIH4weGZmKSA9PT0gMHgyMDApIHtcbiAgICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgICAgICBpZiAoZmxhZy5mbGFnID09PSBvbGRGbGFnKSBmbGFnLmZsYWcgPSBuZXdGbGFnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgbmV4dEZyZWVUcmlnZ2VyKCk6IFRyaWdnZXIge1xuICAgIGZvciAoY29uc3QgdCBvZiB0aGlzLnRyaWdnZXJzKSB7XG4gICAgICBpZiAoIXQudXNlZCkgcmV0dXJuIHQ7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgYW4gdW51c2VkIHRyaWdnZXIuJyk7XG4gIH1cblxuICBjb21wcmVzc01hcERhdGEoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHJldHVybjtcbiAgICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gdHJ1ZTtcbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAobG9jYXRpb24uZXh0ZW5kZWQpIGxvY2F0aW9uLmV4dGVuZGVkID0gMHhhO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgLy90aGlzLnNjcmVlbnNbMHhhMDAgfCBpXSA9IHRoaXMuc2NyZWVuc1sweDEwMCB8IGldO1xuICAgICAgdGhpcy5tZXRhc2NyZWVucy5yZW51bWJlcigweDEwMCB8IGksIDB4YTAwIHwgaSk7XG4gICAgICBkZWxldGUgdGhpcy5zY3JlZW5zWzB4MTAwIHwgaV07XG4gICAgfVxuICB9XG5cbiAgLy8gVE9ETyAtIGRvZXMgbm90IHdvcmsuLi5cbiAgbW92ZVNjcmVlbnModGlsZXNldDogTWV0YXRpbGVzZXQsIHBhZ2U6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb21wcmVzc2VkTWFwRGF0YSkgdGhyb3cgbmV3IEVycm9yKGBNdXN0IGNvbXByZXNzIG1hcHMgZmlyc3QuYCk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBsZXQgaSA9IHBhZ2UgPDwgODtcbiAgICB3aGlsZSAoKGkgJiAweGZmKSA8IDB4MjAgJiYgdGhpcy5zY3JlZW5zW2ldKSB7XG4gICAgICBpKys7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRpbGVzZXQuc2NyZWVucykge1xuICAgICAgaWYgKHNjcmVlbi5pZCA+PSAweDEwMCkgY29udGludWU7XG4gICAgICBpZiAoKGkgJiAweGZmKSA9PT0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBObyByb29tIGxlZnQgb24gcGFnZS5gKTtcbiAgICAgIGNvbnN0IHByZXYgPSBzY3JlZW4uaWQ7XG4gICAgICBpZiAobWFwLmhhcyhwcmV2KSkgY29udGludWU7XG4gICAgICBjb25zdCBuZXh0ID0gc2NyZWVuLmlkID0gaSsrO1xuICAgICAgbWFwLnNldChwcmV2LCBuZXh0KTtcbiAgICAgIG1hcC5zZXQobmV4dCwgbmV4dCk7XG4gICAgICAvL3RoaXMubWV0YXNjcmVlbnMucmVudW1iZXIocHJldiwgbmV4dCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAobG9jLnRpbGVzZXQgIT0gdGlsZXNldC50aWxlc2V0SWQpIGNvbnRpbnVlO1xuICAgICAgbGV0IGFueU1vdmVkID0gZmFsc2U7XG4gICAgICBsZXQgYWxsTW92ZWQgPSB0cnVlO1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb3cubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBtYXBwZWQgPSBtYXAuZ2V0KHJvd1tpXSk7XG4gICAgICAgICAgaWYgKG1hcHBlZCAhPSBudWxsKSB7XG4gICAgICAgICAgICByb3dbaV0gPSBtYXBwZWQ7XG4gICAgICAgICAgICBhbnlNb3ZlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsbE1vdmVkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoYW55TW92ZWQpIHtcbiAgICAgICAgaWYgKCFhbGxNb3ZlZCkgdGhyb3cgbmV3IEVycm9yKGBJbmNvbnNpc3RlbnQgbW92ZWApO1xuICAgICAgICBsb2MuZXh0ZW5kZWQgPSBwYWdlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFVzZSB0aGUgYnJvd3NlciBBUEkgdG8gbG9hZCB0aGUgUk9NLiAgVXNlICNyZXNldCB0byBmb3JnZXQgYW5kIHJlbG9hZC5cbiAgc3RhdGljIGFzeW5jIGxvYWQocGF0Y2g/OiAoZGF0YTogVWludDhBcnJheSkgPT4gUHJvbWlzZTx2b2lkPixcbiAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZXI/OiAocGlja2VyOiBFbGVtZW50KSA9PiB2b2lkKSB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IHBpY2tGaWxlKHJlY2VpdmVyKTtcbiAgICBpZiAocGF0Y2gpIGF3YWl0IHBhdGNoKGZpbGUpO1xuICAgIHJldHVybiBuZXcgUm9tKGZpbGUpO1xuICB9ICBcbn1cblxuLy8gY29uc3QgaW50ZXJzZWN0cyA9IChsZWZ0LCByaWdodCkgPT4ge1xuLy8gICBpZiAobGVmdC5zaXplID4gcmlnaHQuc2l6ZSkgcmV0dXJuIGludGVyc2VjdHMocmlnaHQsIGxlZnQpO1xuLy8gICBmb3IgKGxldCBpIG9mIGxlZnQpIHtcbi8vICAgICBpZiAocmlnaHQuaGFzKGkpKSByZXR1cm4gdHJ1ZTtcbi8vICAgfVxuLy8gICByZXR1cm4gZmFsc2U7XG4vLyB9XG5cbi8vIGNvbnN0IFRJTEVfRUZGRUNUU19CWV9USUxFU0VUID0ge1xuLy8gICAweDgwOiAweGIzLFxuLy8gICAweDg0OiAweGI0LFxuLy8gICAweDg4OiAweGI1LFxuLy8gICAweDhjOiAweGI2LFxuLy8gICAweDkwOiAweGI3LFxuLy8gICAweDk0OiAweGI4LFxuLy8gICAweDk4OiAweGI5LFxuLy8gICAweDljOiAweGJhLFxuLy8gICAweGEwOiAweGJiLFxuLy8gICAweGE0OiAweGJjLFxuLy8gICAweGE4OiAweGI1LFxuLy8gICAweGFjOiAweGJkLFxuLy8gfTtcblxuLy8gT25seSBtYWtlcyBzZW5zZSBpbiB0aGUgYnJvd3Nlci5cbmZ1bmN0aW9uIHBpY2tGaWxlKHJlY2VpdmVyPzogKHBpY2tlcjogRWxlbWVudCkgPT4gdm9pZCk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICBpZiAoIXJlY2VpdmVyKSByZWNlaXZlciA9IHBpY2tlciA9PiBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHBpY2tlcik7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCAhPT0gJyNyZXNldCcpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncm9tJyk7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZShcbiAgICAgICAgICAgIFVpbnQ4QXJyYXkuZnJvbShcbiAgICAgICAgICAgICAgICBuZXcgQXJyYXkoZGF0YS5sZW5ndGggLyAyKS5maWxsKDApLm1hcChcbiAgICAgICAgICAgICAgICAgICAgKF8sIGkpID0+IE51bWJlci5wYXJzZUludChcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMiAqIGldICsgZGF0YVsyICogaSArIDFdLCAxNikpKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHVwbG9hZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh1cGxvYWQpO1xuICAgIHVwbG9hZC50eXBlID0gJ2ZpbGUnO1xuICAgIHVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBjb25zdCBmaWxlID0gdXBsb2FkLmZpbGVzIVswXTtcbiAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVuZCcsICgpID0+IHtcbiAgICAgICAgY29uc3QgYXJyID0gbmV3IFVpbnQ4QXJyYXkocmVhZGVyLnJlc3VsdCBhcyBBcnJheUJ1ZmZlcik7XG4gICAgICAgIGNvbnN0IHN0ciA9IEFycmF5LmZyb20oYXJyLCBoZXgpLmpvaW4oJycpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncm9tJywgc3RyKTtcbiAgICAgICAgdXBsb2FkLnJlbW92ZSgpO1xuICAgICAgICByZXNvbHZlKGFycik7XG4gICAgICB9KTtcbiAgICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjb25zdCBFWFBFQ1RFRF9DUkMzMiA9IDB4MWJkMzkwMzI7XG5cbi8vIEZvcm1hdDogW2FkZHJlc3MsIGJyb2tlbiwgZml4ZWRdXG5jb25zdCBBREpVU1RNRU5UUyA9IFtcbiAgLy8gRml4IHNvZnRsb2NrIGluIGNyeXB0IGR1ZSB0byBmbHlhYmxlIHdhbGwgKGVmZmVjdHMgJGI2IHRpbGUgJDQ2KVxuICBbMHgxMzY0NiwgMHgwMiwgMHgwNl0sXG4gIC8vIEZpeCBicm9rZW4gKGZhbGwtdGhyb3VnaCkgZXhpdCBvdXRzaWRlIHN0YXJ0XG4gIFsweDE0NTZhLCAweDAwLCAweGZmXSxcbiAgLy8gUmVkdW5kYW50IGV4aXQgbmV4dCB0byBzdG9tJ3MgZG9vciBpbiAkMTlcbiAgWzB4MTRhZWIsIDB4MDksIDB4ZmZdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1yaWdodCBvZiBNdCBTYWJyZSBXZXN0IGNhdmVcbiAgWzB4MTRkYjksIDB4MDgsIDB4ODBdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1sZWZ0IG9mIExpbWUgVHJlZSBWYWxsZXlcbiAgWzB4MTU0NWQsIDB4ZmYsIDB4MDBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZS9leGl0IGluIHBvcnRvYVxuICBbMHgxNTgxZCwgMHgwMCwgMHhmZl0sXG4gIFsweDE1ODRlLCAweGRiLCAweGZmXSxcbiAgLy8gUmVtb3ZlIHVudXNlZCBtYXAgc2NyZWVucyBmcm9tIEV2aWwgU3Bpcml0IGxvd2VyXG4gIFsweDE1YmFmLCAweGYwLCAweDgwXSxcbiAgWzB4MTViYjYsIDB4ZGYsIDB4ODBdLFxuICBbMHgxNWJiNywgMHg5NiwgMHg4MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gZ29hIHZhbGxleVxuICBbMHgxNWY0MCwgMHgwMiwgMHhmZl0sXG4gIFsweDE1ZjYxLCAweDhkLCAweGZmXSxcbiAgWzB4MTVmNjUsIDB4OGQsIDB4ZmZdLFxuICAvLyBGaXggZ2FyYmFnZSBhdCBib3R0b20gb2Ygb2FzaXMgY2F2ZSBtYXAgKGl0J3MgOHgxMSwgbm90IDh4MTIgPT4gZml4IGhlaWdodClcbiAgWzB4MTY0ZmYsIDB4MGIsIDB4MGFdLFxuICAvLyBGaXggYmFkIG11c2ljIGluIHpvbWJpZXRvd24gaG91c2VzOiAkMTAgc2hvdWxkIGJlICQwMS5cbiAgWzB4MTc4MmEsIDB4MTAsIDB4MDFdLFxuICBbMHgxNzg1NywgMHgxMCwgMHgwMV0sXG4gIC8vIEZpeCBiYWQgc3Bhd24gaW4gTXQgSHlkcmEgKG1ha2UgaXQgYW4gZXh0cmEgcHVkZGxlKS5cbiAgWzB4MTlmMDIsIDB4NDAsIDB4ODBdLFxuICBbMHgxOWYwMywgMHgzMywgMHgzMl0sXG4gIC8vIEZpeCBiYWQgc3Bhd24gaW4gU2FiZXJhIDIncyBsZXZlbCAocHJvYmFibHkgbWVhbnQgdG8gYmUgYSBmbGFpbCBndXkpLlxuICBbMHgxYTFkZiwgMHgxNywgMHg5N10sIC8vIG1ha2Ugc3VyZSB0byBmaXggcGF0dGVybiBzbG90LCB0b28hXG4gIFsweDFhMWUxLCAweDNkLCAweDM0XSxcbiAgLy8gUG9pbnQgQW1hem9uZXMgb3V0ZXIgZ3VhcmQgdG8gcG9zdC1vdmVyZmxvdyBtZXNzYWdlIHRoYXQncyBhY3R1YWxseSBzaG93bi5cbiAgWzB4MWNmMDUsIDB4NDcsIDB4NDhdLFxuICAvLyBSZW1vdmUgc3RyYXkgZmxpZ2h0IGdyYW50ZXIgaW4gWm9tYmlldG93bi5cbiAgWzB4MWQzMTEsIDB4MjAsIDB4YTBdLFxuICBbMHgxZDMxMiwgMHgzMCwgMHgwMF0sXG4gIC8vIEZpeCBxdWVlbidzIGRpYWxvZyB0byB0ZXJtaW5hdGUgb24gbGFzdCBpdGVtLCByYXRoZXIgdGhhbiBvdmVyZmxvdyxcbiAgLy8gc28gdGhhdCB3ZSBkb24ndCBwYXJzZSBnYXJiYWdlLlxuICBbMHgxY2ZmOSwgMHg2MCwgMHhlMF0sXG4gIC8vIEZpeCBBbWF6b25lcyBvdXRlciBndWFyZCBtZXNzYWdlIHRvIG5vdCBvdmVyZmxvdy5cbiAgWzB4MmNhOTAsIDB4MDIsIDB4MDBdLFxuICAvLyBGaXggc2VlbWluZ2x5LXVudXNlZCBrZW5zdSBtZXNzYWdlIDFkOjE3IG92ZXJmbG93aW5nIGludG8gMWQ6MThcbiAgWzB4MmY1NzMsIDB4MDIsIDB4MDBdLFxuICAvLyBGaXggdW51c2VkIGthcm1pbmUgdHJlYXN1cmUgY2hlc3QgbWVzc2FnZSAyMDoxOC5cbiAgWzB4MmZhZTQsIDB4NWYsIDB4MDBdLFxuXSBhcyBjb25zdDtcbiJdfQ==