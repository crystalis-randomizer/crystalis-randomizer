import { Assembler } from './asm/assembler.js';
import { Linker } from './asm/linker.js';
import { AdHocSpawn } from './rom/adhocspawn.js';
import { BossKill } from './rom/bosskill.js';
import { Bosses } from './rom/bosses.js';
import { CoinDrops } from './rom/coindrops.js';
import { Flags } from './rom/flags.js';
import { Hitbox } from './rom/hitbox.js';
import { Items } from './rom/item.js';
import { ItemGets } from './rom/itemget.js';
import { Locations } from './rom/location.js';
import { Messages } from './rom/messages.js';
import { Metascreens } from './rom/metascreens.js';
import { Metasprite } from './rom/metasprite.js';
import { Metatilesets } from './rom/metatileset.js';
import { Monster } from './rom/monster.js';
import { Npcs } from './rom/npc.js';
import { ObjectActions } from './rom/objectaction.js';
import { Objects } from './rom/objects.js';
import { RomOption } from './rom/option.js';
import { Palette } from './rom/palette.js';
import { Patterns } from './rom/pattern.js';
import { RandomNumbers } from './rom/randomnumbers.js';
import { Scaling } from './rom/scaling.js';
import { Screens } from './rom/screen.js';
import { Shops } from './rom/shop.js';
import { Slots } from './rom/slots.js';
import { Telepathy } from './rom/telepathy.js';
import { TileAnimation } from './rom/tileanimation.js';
import { TileEffects } from './rom/tileeffects.js';
import { Tilesets } from './rom/tileset.js';
import { TownWarp } from './rom/townwarp.js';
import { Trigger } from './rom/trigger.js';
import { Segment, hex, seq, free } from './rom/util.js';
import { WildWarp } from './rom/wildwarp.js';
import { UnionFind } from './unionfind.js';
const { $0e, $0f, $10 } = Segment;
export class Rom {
    constructor(rom) {
        this.modules = [];
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
        this.patterns = new Patterns(this);
        this.palettes = seq(0x100, i => new Palette(this, i));
        this.locations = new Locations(this);
        this.tileAnimations = seq(4, i => new TileAnimation(this, i));
        this.hitboxes = seq(24, i => new Hitbox(this, i));
        this.objectActions = new ObjectActions(this);
        this.objects = new Objects(this);
        this.adHocSpawns = seq(0x60, i => new AdHocSpawn(this, i));
        this.metasprites = seq(0x100, i => new Metasprite(this, i));
        this.messages = new Messages(this);
        this.telepathy = new Telepathy(this);
        this.itemGets = new ItemGets(this);
        this.items = new Items(this);
        this.shops = new Shops(this);
        this.slots = new Slots(this);
        this.npcs = new Npcs(this);
        this.bossKills = seq(0xe, i => new BossKill(this, i));
        this.wildWarp = new WildWarp(this);
        this.townWarp = new TownWarp(this);
        this.coinDrops = new CoinDrops(this);
        this.flags = new Flags(this);
        this.bosses = new Bosses(this);
        this.scaling = new Scaling(this);
        this.randomNumbers = new RandomNumbers(this);
        for (const loc of this.locations) {
            if (loc.used)
                loc.lazyInitialization();
        }
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
    assembler() {
        return new Assembler();
    }
    writeData(data = this.prg) {
        var _a;
        const a = this.assembler();
        free(a, $0e, 0x877a, 0x895d);
        free(a, $0e, 0x8ae5, 0x98f4);
        free(a, $0e, 0x9de6, 0xa000);
        free(a, $0f, 0xa000, 0xa106);
        free(a, $0f, 0xa200, 0xa3c0);
        free(a, $10, 0x911a, 0x9468);
        const modules = [...this.modules, a.module()];
        const writeAll = (writables) => {
            for (const w of writables) {
                modules.push(...w.write());
            }
        };
        modules.push(...this.locations.write());
        writeAll(this.objects);
        writeAll(this.hitboxes);
        writeAll(this.triggers);
        modules.push(...this.npcs.write());
        writeAll(this.tilesets);
        writeAll(this.tileEffects);
        writeAll(this.adHocSpawns);
        modules.push(...this.itemGets.write());
        modules.push(...this.slots.write());
        modules.push(...this.items.write());
        modules.push(...this.shops.write());
        writeAll(this.bossKills);
        writeAll(this.patterns);
        modules.push(...this.wildWarp.write());
        modules.push(...this.townWarp.write());
        modules.push(...this.coinDrops.write());
        modules.push(...this.scaling.write());
        modules.push(...this.bosses.write());
        modules.push(...this.randomNumbers.write());
        modules.push(...this.telepathy.write());
        modules.push(...this.messages.write());
        modules.push(...this.screens.write());
        const linker = new Linker();
        linker.base(this.prg, 0);
        for (const m of modules) {
            linker.read(m);
        }
        const out = linker.link();
        out.apply(data);
        if (data !== this.prg)
            return;
        const exports = linker.exports();
        this.uniqueItemTableAddress = exports.get('KeyItemData').offset;
        this.shopCount = 11;
        this.shopDataTablesAddress = ((_a = exports.get('ShopData')) === null || _a === void 0 ? void 0 : _a.offset) || 0;
        Rom.SHOP_COUNT.set(this.prg, this.shopCount);
        Rom.SCALING_LEVELS.set(this.prg, this.scalingLevels);
        Rom.UNIQUE_ITEM_TABLE.set(this.prg, this.uniqueItemTableAddress);
        Rom.SHOP_DATA_TABLES.set(this.prg, this.shopDataTablesAddress || 0);
        Rom.OMIT_ITEM_GET_DATA_SUFFIX.set(this.prg, this.omitItemGetDataSuffix);
        Rom.OMIT_LOCAL_DIALOG_SUFFIX.set(this.prg, this.omitLocalDialogSuffix);
        Rom.COMPRESSED_MAPDATA.set(this.prg, this.compressedMapData);
    }
    analyzeTiles() {
    }
    disjointTilesets() {
        const tilesetByScreen = [];
        for (const loc of this.locations) {
            if (!loc.used)
                continue;
            const tileset = loc.tileset;
            for (const row of loc.screens) {
                for (const s of row) {
                    (tilesetByScreen[s] || (tilesetByScreen[s] = new Set())).add(tileset);
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
    moveScreens(tileset, page) {
        if (!this.compressedMapData)
            throw new Error(`Must compress maps first.`);
        const map = new Map();
        let i = page << 8;
        while (this.screens[i]) {
            i++;
        }
        for (const screen of tileset) {
            if (screen.sid >= 0x100)
                continue;
            const prev = screen.sid;
            if (map.has(prev))
                continue;
            const next = screen.sid = i++;
            map.set(prev, next);
            map.set(next, next);
        }
        for (const loc of this.locations) {
            if (loc.tileset != tileset.tilesetId)
                continue;
            let anyMoved = false;
            let allMoved = true;
            for (const row of loc.screens) {
                for (let j = 0; j < row.length; j++) {
                    const mapped = map.get(row[j]);
                    if (mapped != null) {
                        row[j] = mapped;
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
    [0x14548, 0x56, 0x50],
    [0x1456a, 0x00, 0xff],
    [0x1458f, 0x38, 0x30],
    [0x14618, 0x60, 0x70],
    [0x14626, 0xa8, 0xa0],
    [0x14633, 0x15, 0x16],
    [0x14637, 0x15, 0x16],
    [0x14951, 0xa8, 0xa0],
    [0x14953, 0x98, 0x90],
    [0x14a19, 0x78, 0x70],
    [0x14aeb, 0x09, 0xff],
    [0x14b49, 0x80, 0x88],
    [0x14b87, 0x20, 0x30],
    [0x14b9a, 0x01, 0x02],
    [0x14b9e, 0x01, 0x02],
    [0x14db9, 0x08, 0x80],
    [0x14ef6, 0x68, 0x60],
    [0x1545d, 0xff, 0x00],
    [0x15469, 0x78, 0x70],
    [0x15806, 0x98, 0xa0],
    [0x1580a, 0x98, 0xa0],
    [0x1580e, 0x58, 0x50],
    [0x1581d, 0x00, 0xff],
    [0x1584e, 0xdb, 0xff],
    [0x15875, 0x78, 0x70],
    [0x15b4f, 0x78, 0x80],
    [0x15baf, 0xf0, 0x80],
    [0x15bb6, 0xdf, 0x80],
    [0x15bb7, 0x96, 0x80],
    [0x15ce3, 0xdf, 0xcf],
    [0x15cee, 0x6e, 0x6d],
    [0x15cf2, 0x6e, 0x6d],
    [0x15d8e, 0xdf, 0xcf],
    [0x15d91, 0x2e, 0x2d],
    [0x15d95, 0x2e, 0x2d],
    [0x15e3a, 0xd8, 0xdf],
    [0x15f39, 0x78, 0x70],
    [0x15f40, 0x02, 0xff],
    [0x15f61, 0x8d, 0xff],
    [0x15f65, 0x8d, 0xff],
    [0x163fd, 0x48, 0x40],
    [0x16403, 0x55, 0x50],
    [0x1645b, 0xd8, 0xdf],
    [0x164cc, 0x04, 0x20],
    [0x164ff, 0x0b, 0x0a],
    [0x1660d, 0x20, 0x30],
    [0x16624, 0x01, 0x02],
    [0x16628, 0x01, 0x02],
    [0x16db0, 0x9a, 0x80],
    [0x16db4, 0x9e, 0x80],
    [0x16db8, 0x91, 0x80],
    [0x16dbc, 0x9e, 0x80],
    [0x16dc0, 0x91, 0x80],
    [0x16de8, 0x00, 0xff],
    [0x16ded, 0xdf, 0xd0],
    [0x16df8, 0x0c, 0x5c],
    [0x16df9, 0xb0, 0xb9],
    [0x16dfa, 0x00, 0x02],
    [0x16dfc, 0x0c, 0x5c],
    [0x16dfd, 0xb0, 0xb9],
    [0x16dfe, 0x00, 0x02],
    [0x16dff, 0x07, 0xff],
    [0x16e5d, 0x02, 0xff],
    [0x16e6a, 0xad, 0xff],
    [0x16e6e, 0xad, 0xff],
    [0x17001, 0x02, 0xff],
    [0x1702e, 0xb7, 0xff],
    [0x17032, 0xb7, 0xff],
    [0x170ab, 0x03, 0xff],
    [0x170af, 0x02, 0xff],
    [0x170b3, 0x05, 0xff],
    [0x170b7, 0x06, 0xff],
    [0x170bb, 0x00, 0xff],
    [0x170c4, 0xb2, 0xff],
    [0x170c8, 0xb2, 0xff],
    [0x170cc, 0xb1, 0xff],
    [0x170d0, 0xb1, 0xff],
    [0x170d4, 0xb3, 0xff],
    [0x170d8, 0xb3, 0xff],
    [0x170dc, 0xb5, 0xff],
    [0x170e0, 0xb5, 0xff],
    [0x170e4, 0xb5, 0xff],
    [0x170e8, 0xb5, 0xff],
    [0x174ee, 0x80, 0x88],
    [0x177c1, 0x88, 0x80],
    [0x177c5, 0x98, 0xa0],
    [0x177c7, 0x58, 0x50],
    [0x1782a, 0x10, 0x01],
    [0x17857, 0x10, 0x01],
    [0x17954, 0x80, 0x78],
    [0x179a2, 0x80, 0x78],
    [0x17b8a, 0x00, 0x40],
    [0x17b90, 0x00, 0x40],
    [0x17bce, 0x00, 0x40],
    [0x17bd4, 0x00, 0x40],
    [0x17c0e, 0x00, 0x40],
    [0x17c14, 0x00, 0x40],
    [0x17c4e, 0x00, 0x40],
    [0x17c54, 0x00, 0x40],
    [0x19f02, 0x40, 0x80],
    [0x19f03, 0x33, 0x32],
    [0x1a1e0, 0x40, 0xc0],
    [0x1a1e1, 0x3d, 0x34],
    [0x1cf05, 0x47, 0x48],
    [0x1d311, 0x20, 0xa0],
    [0x1d312, 0x30, 0x00],
    [0x1cff9, 0x60, 0xe0],
    [0x2ca90, 0x02, 0x00],
    [0x2f573, 0x02, 0x00],
    [0x2fae4, 0x5f, 0x00],
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQWMsWUFBWSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDbEMsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRXBELE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDMUMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUMxQyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDckQsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBUyxPQUFPLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNoRCxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVyQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQ3JELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQUNqRCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDMUMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQzNDLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3RELE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUMzQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFekMsTUFBTSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDO0FBZ0JoQyxNQUFNLE9BQU8sR0FBRztJQWlGZCxZQUFZLEdBQWU7UUE3QmxCLFlBQU8sR0FBYSxFQUFFLENBQUM7UUE4QjlCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUM7UUFFaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQyxNQUFNLE1BQU0sR0FBRyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMscUJBQXFCLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMscUJBQXFCLEdBQUcsR0FBRyxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMscUJBQXFCLEdBQUcsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUd6RCxLQUFLLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLFdBQVcsRUFBRTtZQUMvQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRztnQkFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUMxRDtRQWlCRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFJN0MsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2hDLElBQUksR0FBRyxDQUFDLElBQUk7Z0JBQUUsR0FBRyxDQUFDLGtCQUFrQixFQUFFLENBQUM7U0FDeEM7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLEVBQVU7UUFDaEIsSUFBSSxFQUFFLEdBQUcsSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFjRCxJQUFJLFdBQVc7UUFDYixNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBYyxDQUFDO1FBQzFDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksT0FBTyxDQUFDLEVBQUU7WUFDOUQsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFO2dCQUNYLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQ25FO1NBQ0Y7UUFDRCxPQUFPLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELElBQUksZUFBZTtRQUNqQixNQUFNLEdBQUcsR0FFaUQsRUFBRSxDQUFDO1FBQzdELEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUM5QixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUFFLFNBQVM7WUFDdEMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUN4QixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO29CQUNwQixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO29CQUNqQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUM5QyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDOzBCQUN2QyxFQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQzs0QkFDM0IsR0FBRyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDOzRCQUMzQixJQUFJO3lCQUNKLENBQUM7aUJBQ1A7YUFDRjtTQUNGO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsTUFBTSxDQUFDLEdBQTZDLEVBQUUsQ0FBQztRQUN2RCxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDOUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFBRSxTQUFTO1lBRXRDLE1BQU0sQ0FBQyxHQUE2QixDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDNUQsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUN4QixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO29CQUNwQixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUM1QixDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO3dCQUMzQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2hEO2FBQ0Y7U0FDRjtRQUNELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQTZDRCxTQUFTO1FBRVAsT0FBTyxJQUFJLFNBQVMsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHOztRQWF2QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFM0IsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTdCLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU3QixJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBSTdCLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU3QixJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFvQjdCLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sUUFBUSxHQUFHLENBQUMsU0FBd0MsRUFBRSxFQUFFO1lBQzVELEtBQUssTUFBTSxDQUFDLElBQUksU0FBUyxFQUFFO2dCQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7YUFDNUI7UUFDSCxDQUFDLENBQUM7UUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDbkMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDM0IsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN4QyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFLdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekIsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUU7WUFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNoQjtRQUNELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMxQixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hCLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHO1lBQUUsT0FBTztRQUU5QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFHakMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFFLENBQUMsTUFBTyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDBDQUFFLE1BQU0sS0FBSSxDQUFDLENBQUM7UUFFbEUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDckQsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ2pFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMscUJBQXFCLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDcEUsR0FBRyxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3hFLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN2RSxHQUFHLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVELFlBQVk7SUE2Q1osQ0FBQztJQUVELGdCQUFnQjtRQUNkLE1BQU0sZUFBZSxHQUF1QixFQUFFLENBQUM7UUFDL0MsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBQ3hCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7WUFFNUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFO2dCQUM3QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsRUFBRTtvQkFDbkIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUN2RTthQUNGO1NBQ0Y7UUFDRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksU0FBUyxFQUFVLENBQUMsQ0FBQztRQUN0RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFBRSxTQUFTO1lBQ2xDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDN0MsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN6QztTQUNGO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDckMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtpQkFDcEIsR0FBRyxDQUFDLENBQUMsQ0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDbEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNyQztJQVFILENBQUM7SUFrQkQsYUFBYSxDQUFDLFFBQWtCLEVBQUUsR0FBRyxNQUErQjtRQUVsRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUN0QyxNQUFNLE1BQU0sR0FBYSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDdEMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFvQixFQUFVLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkYsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDMUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN6QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzNCLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQWEsQ0FBQztvQkFDakMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hCLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ25CO2FBQ0Y7WUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQVcsQ0FBQztnQkFDN0IsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQVcsQ0FBQztnQkFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO29CQUFFLFNBQVM7Z0JBQzdCLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNkLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDZjtTQUNGO1FBR0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNsQyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3RDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUM5QixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUFFLFNBQVM7WUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDL0IsS0FBSyxNQUFNLE1BQU0sSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7Z0JBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDckI7U0FDRjtRQUdELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO1lBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN2RCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDM0M7U0FDRjtRQUVELEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFO1lBQzlCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7Z0JBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDekMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN4QixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUMxQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzNDO29CQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUMzQyxJQUFJLENBQUMsSUFBSSxJQUFJOzRCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUM1RixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBRS9DO2lCQUNGO2FBQ0Y7WUFDRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFO2dCQUN4QixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUMzQjtTQUNGO1FBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUU7WUFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDakQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7Z0JBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDekMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN4QixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1QixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQy9DO2FBQ0Y7WUFDRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFJMUIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7YUFDL0I7U0FDRjtJQUVILENBQUM7SUFFRCxRQUFRLENBQUMsT0FBZSxFQUFFLE9BQWU7UUFFdkMsU0FBUyxPQUFPLENBQUMsR0FBYTtZQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbkMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTztvQkFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDO2dCQUN6QyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU87b0JBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO2FBQzVDO1FBQ0gsQ0FBQztRQUNELEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNuQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEI7UUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDM0IsS0FBSyxNQUFNLEtBQUssSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtnQkFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakUsS0FBSyxNQUFNLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ3ZFLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO29CQUM1QixJQUFJLE1BQU0sQ0FBQyxTQUFTLEtBQUssT0FBTzt3QkFBRSxNQUFNLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztvQkFDN0QsSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLENBQUMsT0FBTzt3QkFBRSxNQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsT0FBTyxDQUFDO2lCQUNoRTthQUNGO1NBQ0Y7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO1lBQzlELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDaEMsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO29CQUM1QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssT0FBTzt3QkFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztpQkFDaEQ7YUFDRjtTQUNGO0lBQ0gsQ0FBQztJQUVELGVBQWU7UUFDYixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDN0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFtQkQsV0FBVyxDQUFDLE9BQW9CLEVBQUUsSUFBWTtRQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQjtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUMxRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0QixDQUFDLEVBQUUsQ0FBQztTQUNMO1FBQ0QsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7WUFDNUIsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUs7Z0JBQUUsU0FBUztZQUVsQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ3hCLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsU0FBUztZQUM1QixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBRXJCO1FBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2hDLElBQUksR0FBRyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsU0FBUztnQkFBRSxTQUFTO1lBQy9DLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztZQUNyQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDcEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFO2dCQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDbkMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO3dCQUNsQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDO3dCQUNoQixRQUFRLEdBQUcsSUFBSSxDQUFDO3FCQUNqQjt5QkFBTTt3QkFDTCxRQUFRLEdBQUcsS0FBSyxDQUFDO3FCQUNsQjtpQkFDRjthQUNGO1lBQ0QsSUFBSSxRQUFRLEVBQUU7Z0JBQ1osSUFBSSxDQUFDLFFBQVE7b0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBRXJEO1NBQ0Y7SUFDSCxDQUFDO0lBR0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBZ0QsRUFDaEQsUUFBb0M7UUFDcEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEMsSUFBSSxLQUFLO1lBQUUsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QixDQUFDOztBQTlvQmUsNkJBQXlCLEdBQU0sU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekQsNEJBQXdCLEdBQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekQsc0JBQWtCLEdBQWEsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekQsY0FBVSxHQUFxQixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZELGtCQUFjLEdBQWlCLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkQscUJBQWlCLEdBQWMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxRCxvQkFBZ0IsR0FBZSxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFELG9CQUFnQixHQUFlLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFrcUI1RSxTQUFTLFFBQVEsQ0FBQyxRQUFvQztJQUNwRCxJQUFJLENBQUMsUUFBUTtRQUFFLFFBQVEsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RFLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUM3QixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtZQUNyQyxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pDLElBQUksSUFBSSxFQUFFO2dCQUNSLE9BQU8sT0FBTyxDQUNWLFVBQVUsQ0FBQyxJQUFJLENBQ1gsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUNsQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQ3JCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkQ7U0FDRjtRQUNELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0MsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7UUFDckIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDckMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QixNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO2dCQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBcUIsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLENBQUMsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQztBQUd6QyxNQUFNLFdBQVcsR0FBRztJQUVsQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Q0FDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vYXNtL2Fzc2VtYmxlci5qcyc7XG5pbXBvcnQge0Fzc2VtYmxlcn0gZnJvbSAnLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7TGlua2VyfSBmcm9tICcuL2FzbS9saW5rZXIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vYXNtL21vZHVsZS5qcyc7XG5pbXBvcnQge0FkSG9jU3Bhd259IGZyb20gJy4vcm9tL2FkaG9jc3Bhd24uanMnO1xuLy9pbXBvcnQge0FyZWFzfSBmcm9tICcuL3JvbS9hcmVhLmpzJztcbmltcG9ydCB7Qm9zc0tpbGx9IGZyb20gJy4vcm9tL2Jvc3NraWxsLmpzJztcbmltcG9ydCB7Qm9zc2VzfSBmcm9tICcuL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtDb2luRHJvcHN9IGZyb20gJy4vcm9tL2NvaW5kcm9wcy5qcyc7XG5pbXBvcnQge0ZsYWdzfSBmcm9tICcuL3JvbS9mbGFncy5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9yb20vaGl0Ym94LmpzJztcbmltcG9ydCB7SXRlbXN9IGZyb20gJy4vcm9tL2l0ZW0uanMnO1xuaW1wb3J0IHtJdGVtR2V0c30gZnJvbSAnLi9yb20vaXRlbWdldC5qcyc7XG5pbXBvcnQge0xvY2F0aW9uc30gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNZXNzYWdlc30gZnJvbSAnLi9yb20vbWVzc2FnZXMuanMnO1xuaW1wb3J0IHtNZXRhc2NyZWVuc30gZnJvbSAnLi9yb20vbWV0YXNjcmVlbnMuanMnO1xuaW1wb3J0IHtNZXRhc3ByaXRlfSBmcm9tICcuL3JvbS9tZXRhc3ByaXRlLmpzJztcbmltcG9ydCB7TWV0YXRpbGVzZXQsIE1ldGF0aWxlc2V0c30gZnJvbSAnLi9yb20vbWV0YXRpbGVzZXQuanMnO1xuaW1wb3J0IHtNb25zdGVyfSBmcm9tICcuL3JvbS9tb25zdGVyLmpzJztcbmltcG9ydCB7TnBjc30gZnJvbSAnLi9yb20vbnBjLmpzJztcbmltcG9ydCB7T2JqZWN0QWN0aW9uc30gZnJvbSAnLi9yb20vb2JqZWN0YWN0aW9uLmpzJztcbmltcG9ydCB7T2JqZWN0RGF0YX0gZnJvbSAnLi9yb20vb2JqZWN0ZGF0YS5qcyc7XG5pbXBvcnQge09iamVjdHN9IGZyb20gJy4vcm9tL29iamVjdHMuanMnO1xuaW1wb3J0IHtSb21PcHRpb259IGZyb20gJy4vcm9tL29wdGlvbi5qcyc7XG5pbXBvcnQge1BhbGV0dGV9IGZyb20gJy4vcm9tL3BhbGV0dGUuanMnO1xuaW1wb3J0IHtQYXR0ZXJuc30gZnJvbSAnLi9yb20vcGF0dGVybi5qcyc7XG5pbXBvcnQge1JhbmRvbU51bWJlcnN9IGZyb20gJy4vcm9tL3JhbmRvbW51bWJlcnMuanMnO1xuaW1wb3J0IHtTY2FsaW5nfSBmcm9tICcuL3JvbS9zY2FsaW5nLmpzJztcbmltcG9ydCB7U2NyZWVuLCBTY3JlZW5zfSBmcm9tICcuL3JvbS9zY3JlZW4uanMnO1xuaW1wb3J0IHtTaG9wc30gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge1Nsb3RzfSBmcm9tICcuL3JvbS9zbG90cy5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtUZWxlcGF0aHl9IGZyb20gJy4vcm9tL3RlbGVwYXRoeS5qcyc7XG5pbXBvcnQge1RpbGVBbmltYXRpb259IGZyb20gJy4vcm9tL3RpbGVhbmltYXRpb24uanMnO1xuaW1wb3J0IHtUaWxlRWZmZWN0c30gZnJvbSAnLi9yb20vdGlsZWVmZmVjdHMuanMnO1xuaW1wb3J0IHtUaWxlc2V0c30gZnJvbSAnLi9yb20vdGlsZXNldC5qcyc7XG5pbXBvcnQge1Rvd25XYXJwfSBmcm9tICcuL3JvbS90b3dud2FycC5qcyc7XG5pbXBvcnQge1RyaWdnZXJ9IGZyb20gJy4vcm9tL3RyaWdnZXIuanMnO1xuaW1wb3J0IHtTZWdtZW50LCBoZXgsIHNlcSwgZnJlZX0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1dpbGRXYXJwfSBmcm9tICcuL3JvbS93aWxkd2FycC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi91bmlvbmZpbmQuanMnO1xuXG5jb25zdCB7JDBlLCAkMGYsICQxMH0gPSBTZWdtZW50O1xuXG4vLyBBIGtub3duIGxvY2F0aW9uIGZvciBkYXRhIGFib3V0IHN0cnVjdHVyYWwgY2hhbmdlcyB3ZSd2ZSBtYWRlIHRvIHRoZSByb20uXG4vLyBUaGUgdHJpY2sgaXMgdG8gZmluZCBhIHN1aXRhYmxlIHJlZ2lvbiBvZiBST00gdGhhdCdzIGJvdGggdW51c2VkICphbmQqXG4vLyBpcyBub3QgcGFydGljdWxhcmx5ICp1c2FibGUqIGZvciBvdXIgcHVycG9zZXMuICBUaGUgYm90dG9tIDMgcm93cyBvZiB0aGVcbi8vIHZhcmlvdXMgc2luZ2xlLXNjcmVlbiBtYXBzIGFyZSBhbGwgZWZmZWN0aXZlbHkgdW51c2VkLCBzbyB0aGF0IGdpdmVzIDQ4XG4vLyBieXRlcyBwZXIgbWFwLiAgU2hvcHMgKDE0MDAwLi4xNDJmZikgYWxzbyBoYXZlIGEgZ2lhbnQgYXJlYSB1cCB0b3AgdGhhdFxuLy8gY291bGQgcG9zc2libHkgYmUgdXNhYmxlLCB0aG91Z2ggd2UnZCBuZWVkIHRvIHRlYWNoIHRoZSB0aWxlLXJlYWRpbmcgY29kZVxuLy8gdG8gaWdub3JlIHdoYXRldmVyJ3Mgd3JpdHRlbiB0aGVyZSwgc2luY2UgaXQgKmlzKiB2aXNpYmxlIGJlZm9yZSB0aGUgbWVudVxuLy8gcG9wcyB1cC4gIFRoZXNlIGFyZSBiaWcgZW5vdWdoIHJlZ2lvbnMgdGhhdCB3ZSBjb3VsZCBldmVuIGNvbnNpZGVyIHVzaW5nXG4vLyB0aGVtIHZpYSBwYWdlLXN3YXBwaW5nIHRvIGdldCBleHRyYSBkYXRhIGluIGFyYml0cmFyeSBjb250ZXh0cy5cblxuLy8gU2hvcHMgYXJlIHBhcnRpY3VsYXJseSBuaWNlIGJlY2F1c2UgdGhleSdyZSBhbGwgMDAgaW4gdmFuaWxsYS5cbi8vIE90aGVyIHBvc3NpYmxlIHJlZ2lvbnM6XG4vLyAgIC0gNDggYnl0ZXMgYXQgJGZmYzAgKG1lemFtZSBzaHJpbmUpID0+ICRmZmUwIGlzIGFsbCAkZmYgaW4gdmFuaWxsYS5cblxuZXhwb3J0IGNsYXNzIFJvbSB7XG5cbiAgLy8gVGhlc2UgdmFsdWVzIGNhbiBiZSBxdWVyaWVkIHRvIGRldGVybWluZSBob3cgdG8gcGFyc2UgYW55IGdpdmVuIHJvbS5cbiAgLy8gVGhleSdyZSBhbGwgYWx3YXlzIHplcm8gZm9yIHZhbmlsbGFcbiAgc3RhdGljIHJlYWRvbmx5IE9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVggICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDApO1xuICBzdGF0aWMgcmVhZG9ubHkgT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYICAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMSk7XG4gIHN0YXRpYyByZWFkb25seSBDT01QUkVTU0VEX01BUERBVEEgICAgICAgICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfQ09VTlQgICAgICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMxKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNDQUxJTkdfTEVWRUxTICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFVOSVFVRV9JVEVNX1RBQkxFICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQwKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfREFUQV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQzKTtcbiAgc3RhdGljIHJlYWRvbmx5IFRFTEVQQVRIWV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQ2KTtcblxuICByZWFkb25seSBwcmc6IFVpbnQ4QXJyYXk7XG4gIHJlYWRvbmx5IGNocjogVWludDhBcnJheTtcblxuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBlbGltaW5hdGUgdGhlIGR1cGxpY2F0aW9uIGJ5IG1vdmluZ1xuICAvLyB0aGUgY3RvcnMgaGVyZSwgYnV0IHRoZXJlJ3MgbG90cyBvZiBwcmVyZXFzIGFuZCBkZXBlbmRlbmN5XG4gIC8vIG9yZGVyaW5nLCBhbmQgd2UgbmVlZCB0byBtYWtlIHRoZSBBREpVU1RNRU5UUywgZXRjLlxuICAvL3JlYWRvbmx5IGFyZWFzOiBBcmVhcztcbiAgcmVhZG9ubHkgc2NyZWVuczogU2NyZWVucztcbiAgcmVhZG9ubHkgdGlsZXNldHM6IFRpbGVzZXRzO1xuICByZWFkb25seSB0aWxlRWZmZWN0czogVGlsZUVmZmVjdHNbXTtcbiAgcmVhZG9ubHkgdHJpZ2dlcnM6IFRyaWdnZXJbXTtcbiAgcmVhZG9ubHkgcGF0dGVybnM6IFBhdHRlcm5zO1xuICByZWFkb25seSBwYWxldHRlczogUGFsZXR0ZVtdO1xuICByZWFkb25seSBsb2NhdGlvbnM6IExvY2F0aW9ucztcbiAgcmVhZG9ubHkgdGlsZUFuaW1hdGlvbnM6IFRpbGVBbmltYXRpb25bXTtcbiAgcmVhZG9ubHkgaGl0Ym94ZXM6IEhpdGJveFtdO1xuICByZWFkb25seSBvYmplY3RBY3Rpb25zOiBPYmplY3RBY3Rpb25zO1xuICByZWFkb25seSBvYmplY3RzOiBPYmplY3RzO1xuICByZWFkb25seSBhZEhvY1NwYXduczogQWRIb2NTcGF3bltdO1xuICByZWFkb25seSBtZXRhc2NyZWVuczogTWV0YXNjcmVlbnM7XG4gIHJlYWRvbmx5IG1ldGFzcHJpdGVzOiBNZXRhc3ByaXRlW107XG4gIHJlYWRvbmx5IG1ldGF0aWxlc2V0czogTWV0YXRpbGVzZXRzO1xuICByZWFkb25seSBpdGVtR2V0czogSXRlbUdldHM7XG4gIHJlYWRvbmx5IGl0ZW1zOiBJdGVtcztcbiAgcmVhZG9ubHkgc2hvcHM6IFNob3BzO1xuICByZWFkb25seSBzbG90czogU2xvdHM7XG4gIHJlYWRvbmx5IG5wY3M6IE5wY3M7XG4gIHJlYWRvbmx5IGJvc3NLaWxsczogQm9zc0tpbGxbXTtcbiAgcmVhZG9ubHkgYm9zc2VzOiBCb3NzZXM7XG4gIHJlYWRvbmx5IHdpbGRXYXJwOiBXaWxkV2FycDtcbiAgcmVhZG9ubHkgdG93bldhcnA6IFRvd25XYXJwO1xuICByZWFkb25seSBmbGFnczogRmxhZ3M7XG4gIHJlYWRvbmx5IGNvaW5Ecm9wczogQ29pbkRyb3BzO1xuICByZWFkb25seSBzY2FsaW5nOiBTY2FsaW5nO1xuICByZWFkb25seSByYW5kb21OdW1iZXJzOiBSYW5kb21OdW1iZXJzO1xuXG4gIHJlYWRvbmx5IHRlbGVwYXRoeTogVGVsZXBhdGh5O1xuICByZWFkb25seSBtZXNzYWdlczogTWVzc2FnZXM7XG5cbiAgcmVhZG9ubHkgbW9kdWxlczogTW9kdWxlW10gPSBbXTtcblxuICBzcG9pbGVyPzogU3BvaWxlcjtcblxuICAvLyBOT1RFOiBUaGUgZm9sbG93aW5nIHByb3BlcnRpZXMgbWF5IGJlIGNoYW5nZWQgYmV0d2VlbiByZWFkaW5nIGFuZCB3cml0aW5nXG4gIC8vIHRoZSByb20uICBJZiB0aGlzIGhhcHBlbnMsIHRoZSB3cml0dGVuIHJvbSB3aWxsIGhhdmUgZGlmZmVyZW50IG9wdGlvbnMuXG4gIC8vIFRoaXMgaXMgYW4gZWZmZWN0aXZlIHdheSB0byBjb252ZXJ0IGJldHdlZW4gdHdvIHN0eWxlcy5cblxuICAvLyBNYXggbnVtYmVyIG9mIHNob3BzLiAgVmFyaW91cyBibG9ja3Mgb2YgbWVtb3J5IHJlcXVpcmUga25vd2luZyB0aGlzIG51bWJlclxuICAvLyB0byBhbGxvY2F0ZS5cbiAgc2hvcENvdW50OiBudW1iZXI7XG4gIC8vIE51bWJlciBvZiBzY2FsaW5nIGxldmVscy4gIERldGVybWluZXMgdGhlIHNpemUgb2YgdGhlIHNjYWxpbmcgdGFibGVzLlxuICBzY2FsaW5nTGV2ZWxzOiBudW1iZXI7XG5cbiAgLy8gQWRkcmVzcyB0byByZWFkL3dyaXRlIHRoZSBiaXRmaWVsZCBpbmRpY2F0aW5nIHVuaXF1ZSBpdGVtcy5cbiAgdW5pcXVlSXRlbVRhYmxlQWRkcmVzczogbnVtYmVyO1xuICAvLyBBZGRyZXNzIG9mIG5vcm1hbGl6ZWQgcHJpY2VzIHRhYmxlLCBpZiBwcmVzZW50LiAgSWYgdGhpcyBpcyBhYnNlbnQgdGhlbiB3ZVxuICAvLyBhc3N1bWUgcHJpY2VzIGFyZSBub3Qgbm9ybWFsaXplZCBhbmQgYXJlIGF0IHRoZSBub3JtYWwgcGF3biBzaG9wIGFkZHJlc3MuXG4gIHNob3BEYXRhVGFibGVzQWRkcmVzczogbnVtYmVyO1xuICAvLyBBZGRyZXNzIG9mIHJlYXJyYW5nZWQgdGVsZXBhdGh5IHRhYmxlcy5cbiAgdGVsZXBhdGh5VGFibGVzQWRkcmVzczogbnVtYmVyO1xuICAvLyBXaGV0aGVyIHRoZSB0cmFpbGluZyAkZmYgc2hvdWxkIGJlIG9taXR0ZWQgZnJvbSB0aGUgSXRlbUdldERhdGEgdGFibGUuXG4gIG9taXRJdGVtR2V0RGF0YVN1ZmZpeDogYm9vbGVhbjtcbiAgLy8gV2hldGhlciB0aGUgdHJhaWxpbmcgYnl0ZSBvZiBlYWNoIExvY2FsRGlhbG9nIGlzIG9taXR0ZWQuICBUaGlzIGFmZmVjdHNcbiAgLy8gYm90aCByZWFkaW5nIGFuZCB3cml0aW5nIHRoZSB0YWJsZS4gIE1heSBiZSBpbmZlcnJlZCB3aGlsZSByZWFkaW5nLlxuICBvbWl0TG9jYWxEaWFsb2dTdWZmaXg6IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgbWFwZGF0YSBoYXMgYmVlbiBjb21wcmVzc2VkLlxuICBjb21wcmVzc2VkTWFwRGF0YTogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3Rvcihyb206IFVpbnQ4QXJyYXkpIHtcbiAgICBjb25zdCBwcmdTaXplID0gcm9tWzRdICogMHg0MDAwO1xuICAgIC8vIE5PVEU6IGNoclNpemUgPSByb21bNV0gKiAweDIwMDA7XG4gICAgY29uc3QgcHJnU3RhcnQgPSAweDEwICsgKHJvbVs2XSAmIDQgPyA1MTIgOiAwKTtcbiAgICBjb25zdCBwcmdFbmQgPSBwcmdTdGFydCArIHByZ1NpemU7XG4gICAgdGhpcy5wcmcgPSByb20uc3ViYXJyYXkocHJnU3RhcnQsIHByZ0VuZCk7XG4gICAgdGhpcy5jaHIgPSByb20uc3ViYXJyYXkocHJnRW5kKTtcblxuICAgIHRoaXMuc2hvcENvdW50ID0gUm9tLlNIT1BfQ09VTlQuZ2V0KHJvbSk7XG4gICAgdGhpcy5zY2FsaW5nTGV2ZWxzID0gUm9tLlNDQUxJTkdfTEVWRUxTLmdldChyb20pO1xuICAgIHRoaXMudW5pcXVlSXRlbVRhYmxlQWRkcmVzcyA9IFJvbS5VTklRVUVfSVRFTV9UQUJMRS5nZXQocm9tKTtcbiAgICB0aGlzLnNob3BEYXRhVGFibGVzQWRkcmVzcyA9IFJvbS5TSE9QX0RBVEFfVEFCTEVTLmdldChyb20pO1xuICAgIHRoaXMudGVsZXBhdGh5VGFibGVzQWRkcmVzcyA9IFJvbS5URUxFUEFUSFlfVEFCTEVTLmdldChyb20pO1xuICAgIHRoaXMub21pdEl0ZW1HZXREYXRhU3VmZml4ID0gUm9tLk9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVguZ2V0KHJvbSk7XG4gICAgdGhpcy5vbWl0TG9jYWxEaWFsb2dTdWZmaXggPSBSb20uT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYLmdldChyb20pO1xuICAgIHRoaXMuY29tcHJlc3NlZE1hcERhdGEgPSBSb20uQ09NUFJFU1NFRF9NQVBEQVRBLmdldChyb20pO1xuXG4gICAgLy8gaWYgKGNyYzMyKHJvbSkgPT09IEVYUEVDVEVEX0NSQzMyKSB7XG4gICAgZm9yIChjb25zdCBbYWRkcmVzcywgb2xkLCB2YWx1ZV0gb2YgQURKVVNUTUVOVFMpIHtcbiAgICAgIGlmICh0aGlzLnByZ1thZGRyZXNzXSA9PT0gb2xkKSB0aGlzLnByZ1thZGRyZXNzXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIExvYWQgdXAgYSBidW5jaCBvZiBkYXRhIHRhYmxlcy4gIFRoaXMgd2lsbCBpbmNsdWRlIGEgbGFyZ2UgbnVtYmVyIG9mIHRoZVxuICAgIC8vIGRhdGEgdGFibGVzIGluIHRoZSBST00uICBUaGUgaWRlYSBpcyB0aGF0IHdlIGNhbiBlZGl0IHRoZSBhcnJheXMgbG9jYWxseVxuICAgIC8vIGFuZCB0aGVuIGhhdmUgYSBcImNvbW1pdFwiIGZ1bmN0aW9uIHRoYXQgcmVidWlsZHMgdGhlIFJPTSB3aXRoIHRoZSBuZXdcbiAgICAvLyBhcnJheXMuICBXZSBtYXkgbmVlZCB0byB3cml0ZSBhIFwicGFnZWQgYWxsb2NhdG9yXCIgdGhhdCBjYW4gYWxsb2NhdGVcbiAgICAvLyBjaHVua3Mgb2YgUk9NIGluIGEgZ2l2ZW4gcGFnZS4gIFByb2JhYmx5IHdhbnQgdG8gdXNlIGEgZ3JlZWR5IGFsZ29yaXRobVxuICAgIC8vIHdoZXJlIHdlIHN0YXJ0IHdpdGggdGhlIGJpZ2dlc3QgY2h1bmsgYW5kIHB1dCBpdCBpbiB0aGUgc21hbGxlc3Qgc3BvdFxuICAgIC8vIHRoYXQgZml0cyBpdC4gIFByZXN1bWFibHkgd2Uga25vdyB0aGUgc2l6ZXMgdXAgZnJvbnQgZXZlbiBiZWZvcmUgd2UgaGF2ZVxuICAgIC8vIGFsbCB0aGUgYWRkcmVzc2VzLCBzbyB3ZSBjb3VsZCBkbyBhbGwgdGhlIGFsbG9jYXRpb24gYXQgb25jZSAtIHByb2JhYmx5XG4gICAgLy8gcmV0dXJuaW5nIGEgdG9rZW4gZm9yIGVhY2ggYWxsb2NhdGlvbiBhbmQgdGhlbiBhbGwgdG9rZW5zIGdldCBmaWxsZWQgaW5cbiAgICAvLyBhdCBvbmNlIChhY3R1YWwgcHJvbWlzZXMgd291bGQgYmUgbW9yZSB1bndlaWxkeSkuXG4gICAgLy8gVHJpY2t5IC0gd2hhdCBhYm91dCBzaGFyZWQgZWxlbWVudHMgb2YgZGF0YSB0YWJsZXMgLSB3ZSBwdWxsIHRoZW1cbiAgICAvLyBzZXBhcmF0ZWx5LCBidXQgd2UnbGwgbmVlZCB0byByZS1jb2FsZXNjZSB0aGVtLiAgQnV0IHRoaXMgcmVxdWlyZXNcbiAgICAvLyBrbm93aW5nIHRoZWlyIGNvbnRlbnRzIEJFRk9SRSBhbGxvY2F0aW5nIHRoZWlyIHNwYWNlLiAgU28gd2UgbmVlZCB0d29cbiAgICAvLyBhbGxvY2F0ZSBtZXRob2RzIC0gb25lIHdoZXJlIHRoZSBjb250ZW50IGlzIGtub3duIGFuZCBvbmUgd2hlcmUgb25seSB0aGVcbiAgICAvLyBsZW5ndGggaXMga25vd24uXG4gICAgdGhpcy50aWxlc2V0cyA9IG5ldyBUaWxlc2V0cyh0aGlzKTtcbiAgICB0aGlzLnRpbGVFZmZlY3RzID0gc2VxKDExLCBpID0+IG5ldyBUaWxlRWZmZWN0cyh0aGlzLCBpICsgMHhiMykpO1xuICAgIHRoaXMuc2NyZWVucyA9IG5ldyBTY3JlZW5zKHRoaXMpO1xuICAgIHRoaXMubWV0YXRpbGVzZXRzID0gbmV3IE1ldGF0aWxlc2V0cyh0aGlzKTtcbiAgICB0aGlzLm1ldGFzY3JlZW5zID0gbmV3IE1ldGFzY3JlZW5zKHRoaXMpO1xuICAgIHRoaXMudHJpZ2dlcnMgPSBzZXEoMHg0MywgaSA9PiBuZXcgVHJpZ2dlcih0aGlzLCAweDgwIHwgaSkpO1xuICAgIHRoaXMucGF0dGVybnMgPSBuZXcgUGF0dGVybnModGhpcyk7XG4gICAgdGhpcy5wYWxldHRlcyA9IHNlcSgweDEwMCwgaSA9PiBuZXcgUGFsZXR0ZSh0aGlzLCBpKSk7XG4gICAgdGhpcy5sb2NhdGlvbnMgPSBuZXcgTG9jYXRpb25zKHRoaXMpO1xuICAgIHRoaXMudGlsZUFuaW1hdGlvbnMgPSBzZXEoNCwgaSA9PiBuZXcgVGlsZUFuaW1hdGlvbih0aGlzLCBpKSk7XG4gICAgdGhpcy5oaXRib3hlcyA9IHNlcSgyNCwgaSA9PiBuZXcgSGl0Ym94KHRoaXMsIGkpKTtcbiAgICB0aGlzLm9iamVjdEFjdGlvbnMgPSBuZXcgT2JqZWN0QWN0aW9ucyh0aGlzKTtcbiAgICB0aGlzLm9iamVjdHMgPSBuZXcgT2JqZWN0cyh0aGlzKTtcbiAgICB0aGlzLmFkSG9jU3Bhd25zID0gc2VxKDB4NjAsIGkgPT4gbmV3IEFkSG9jU3Bhd24odGhpcywgaSkpO1xuICAgIHRoaXMubWV0YXNwcml0ZXMgPSBzZXEoMHgxMDAsIGkgPT4gbmV3IE1ldGFzcHJpdGUodGhpcywgaSkpO1xuICAgIHRoaXMubWVzc2FnZXMgPSBuZXcgTWVzc2FnZXModGhpcyk7XG4gICAgdGhpcy50ZWxlcGF0aHkgPSBuZXcgVGVsZXBhdGh5KHRoaXMpO1xuICAgIHRoaXMuaXRlbUdldHMgPSBuZXcgSXRlbUdldHModGhpcyk7XG4gICAgdGhpcy5pdGVtcyA9IG5ldyBJdGVtcyh0aGlzKTtcbiAgICB0aGlzLnNob3BzID0gbmV3IFNob3BzKHRoaXMpOyAvLyBOT1RFOiBkZXBlbmRzIG9uIGxvY2F0aW9ucyBhbmQgb2JqZWN0c1xuICAgIHRoaXMuc2xvdHMgPSBuZXcgU2xvdHModGhpcyk7XG4gICAgdGhpcy5ucGNzID0gbmV3IE5wY3ModGhpcyk7XG4gICAgdGhpcy5ib3NzS2lsbHMgPSBzZXEoMHhlLCBpID0+IG5ldyBCb3NzS2lsbCh0aGlzLCBpKSk7XG4gICAgdGhpcy53aWxkV2FycCA9IG5ldyBXaWxkV2FycCh0aGlzKTtcbiAgICB0aGlzLnRvd25XYXJwID0gbmV3IFRvd25XYXJwKHRoaXMpO1xuICAgIHRoaXMuY29pbkRyb3BzID0gbmV3IENvaW5Ecm9wcyh0aGlzKTtcbiAgICB0aGlzLmZsYWdzID0gbmV3IEZsYWdzKHRoaXMpO1xuICAgIHRoaXMuYm9zc2VzID0gbmV3IEJvc3Nlcyh0aGlzKTsgLy8gTk9URTogbXVzdCBiZSBhZnRlciBOcGNzIGFuZCBGbGFnc1xuICAgIHRoaXMuc2NhbGluZyA9IG5ldyBTY2FsaW5nKHRoaXMpO1xuICAgIHRoaXMucmFuZG9tTnVtYmVycyA9IG5ldyBSYW5kb21OdW1iZXJzKHRoaXMpO1xuXG4gICAgLy8gLy8gVE9ETyAtIGNvbnNpZGVyIHBvcHVsYXRpbmcgdGhpcyBsYXRlcj9cbiAgICAvLyAvLyBIYXZpbmcgdGhpcyBhdmFpbGFibGUgbWFrZXMgaXQgZWFzaWVyIHRvIHNldCBleGl0cywgZXRjLlxuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAobG9jLnVzZWQpIGxvYy5sYXp5SW5pdGlhbGl6YXRpb24oKTsgLy8gdHJpZ2dlciB0aGUgZ2V0dGVyXG4gICAgfVxuICB9XG5cbiAgdHJpZ2dlcihpZDogbnVtYmVyKTogVHJpZ2dlciB7XG4gICAgaWYgKGlkIDwgMHg4MCB8fCBpZCA+IDB4ZmYpIHRocm93IG5ldyBFcnJvcihgQmFkIHRyaWdnZXIgaWQgJCR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gdGhpcy50cmlnZ2Vyc1tpZCAmIDB4N2ZdO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNyb3NzLXJlZmVyZW5jZSBtb25zdGVycy9tZXRhc3ByaXRlcy9tZXRhdGlsZXMvc2NyZWVucyB3aXRoIHBhdHRlcm5zL3BhbGV0dGVzXG4gIC8vIGdldCBtb25zdGVycygpOiBPYmplY3REYXRhW10ge1xuICAvLyAgIGNvbnN0IG1vbnN0ZXJzID0gbmV3IFNldDxPYmplY3REYXRhPigpO1xuICAvLyAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAvLyAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgLy8gICAgIGZvciAoY29uc3QgbyBvZiBsLnNwYXducykge1xuICAvLyAgICAgICBpZiAoby5pc01vbnN0ZXIoKSkgbW9uc3RlcnMuYWRkKHRoaXMub2JqZWN0c1tvLm1vbnN0ZXJJZF0pO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gWy4uLm1vbnN0ZXJzXS5zb3J0KCh4LCB5KSA9PiAoeC5pZCAtIHkuaWQpKTtcbiAgLy8gfVxuXG4gIGdldCBwcm9qZWN0aWxlcygpOiBPYmplY3REYXRhW10ge1xuICAgIGNvbnN0IHByb2plY3RpbGVzID0gbmV3IFNldDxPYmplY3REYXRhPigpO1xuICAgIGZvciAoY29uc3QgbSBvZiB0aGlzLm9iamVjdHMuZmlsdGVyKG8gPT4gbyBpbnN0YW5jZW9mIE1vbnN0ZXIpKSB7XG4gICAgICBpZiAobS5jaGlsZCkge1xuICAgICAgICBwcm9qZWN0aWxlcy5hZGQodGhpcy5vYmplY3RzW3RoaXMuYWRIb2NTcGF3bnNbbS5jaGlsZF0ub2JqZWN0SWRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFsuLi5wcm9qZWN0aWxlc10uc29ydCgoeCwgeSkgPT4gKHguaWQgLSB5LmlkKSk7XG4gIH1cblxuICBnZXQgbW9uc3RlckdyYXBoaWNzKCkge1xuICAgIGNvbnN0IGdmeDoge1tpZDogc3RyaW5nXTpcbiAgICAgICAgICAgICAgICB7W2luZm86IHN0cmluZ106XG4gICAgICAgICAgICAgICAgIHtzbG90OiBudW1iZXIsIHBhdDogbnVtYmVyLCBwYWw6IG51bWJlcn19fSA9IHt9O1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgbyBvZiBsLnNwYXducykge1xuICAgICAgICBpZiAoIShvLmRhdGFbMl0gJiA3KSkge1xuICAgICAgICAgIGNvbnN0IHNsb3QgPSBvLmRhdGFbMl0gJiAweDgwID8gMSA6IDA7XG4gICAgICAgICAgY29uc3QgaWQgPSBoZXgoby5kYXRhWzNdICsgMHg1MCk7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IGdmeFtpZF0gPSBnZnhbaWRdIHx8IHt9O1xuICAgICAgICAgIGRhdGFbYCR7c2xvdH06JHtsLnNwcml0ZVBhdHRlcm5zW3Nsb3RdLnRvU3RyaW5nKDE2KX06JHtcbiAgICAgICAgICAgICAgIGwuc3ByaXRlUGFsZXR0ZXNbc2xvdF0udG9TdHJpbmcoMTYpfWBdXG4gICAgICAgICAgICA9IHtwYWw6IGwuc3ByaXRlUGFsZXR0ZXNbc2xvdF0sXG4gICAgICAgICAgICAgICBwYXQ6IGwuc3ByaXRlUGF0dGVybnNbc2xvdF0sXG4gICAgICAgICAgICAgICBzbG90LFxuICAgICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBnZng7XG4gIH1cblxuICBnZXQgbG9jYXRpb25Nb25zdGVycygpIHtcbiAgICBjb25zdCBtOiB7W2lkOiBzdHJpbmddOiB7W2luZm86IHN0cmluZ106IG51bWJlcn19ID0ge307XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCB8fCAhbC5oYXNTcGF3bnMpIGNvbnRpbnVlO1xuICAgICAgLy8gd2hpY2ggbW9uc3RlcnMgYXJlIGluIHdoaWNoIHNsb3RzP1xuICAgICAgY29uc3Qgczoge1tpbmZvOiBzdHJpbmddOiBudW1iZXJ9ID0gbVsnJCcgKyBoZXgobC5pZCldID0ge307XG4gICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgICAgICAgaWYgKCEoby5kYXRhWzJdICYgNykpIHtcbiAgICAgICAgICBjb25zdCBzbG90ID0gby5kYXRhWzJdICYgMHg4MCA/IDEgOiAwO1xuICAgICAgICAgIGNvbnN0IGlkID0gby5kYXRhWzNdICsgMHg1MDtcbiAgICAgICAgICBzW2Ake3Nsb3R9OiR7aWQudG9TdHJpbmcoMTYpfWBdID1cbiAgICAgICAgICAgICAgKHNbYCR7c2xvdH06JHtpZC50b1N0cmluZygxNil9YF0gfHwgMCkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtO1xuICB9XG5cbiAgLy8gVE9ETyAtIGZvciBlYWNoIHNwcml0ZSBwYXR0ZXJuIHRhYmxlLCBmaW5kIGFsbCB0aGUgcGFsZXR0ZXMgdGhhdCBpdCB1c2VzLlxuICAvLyBGaW5kIGFsbCB0aGUgbW9uc3RlcnMgb24gaXQuICBXZSBjYW4gcHJvYmFibHkgYWxsb3cgYW55IHBhbGV0dGUgc28gbG9uZ1xuICAvLyBhcyBvbmUgb2YgdGhlIHBhbGV0dGVzIGlzIHVzZWQgd2l0aCB0aGF0IHBhdHRlcm4uXG4gIC8vIFRPRE8gLSBtYXggbnVtYmVyIG9mIGluc3RhbmNlcyBvZiBhIG1vbnN0ZXIgb24gYW55IG1hcCAtIGkuZS4gYXZvaWQgaGF2aW5nXG4gIC8vIGZpdmUgZmx5ZXJzIG9uIHRoZSBzYW1lIG1hcCFcblxuICAvLyA0NjAgLSAwIG1lYW5zIGVpdGhlciBmbHllciBvciBzdGF0aW9uYXJ5XG4gIC8vICAgICAgICAgICAtIHN0YXRpb25hcnkgaGFzIDRhMCB+IDIwNCwyMDUsMjA2XG4gIC8vICAgICAgICAgICAgIChrcmFrZW4sIHN3YW1wIHBsYW50LCBzb3JjZXJvcilcbiAgLy8gICAgICAgNiAtIG1pbWljXG4gIC8vICAgICAgIDFmIC0gc3dpbW1lclxuICAvLyAgICAgICA1NCAtIHRvbWF0byBhbmQgYmlyZFxuICAvLyAgICAgICA1NSAtIHN3aW1tZXJcbiAgLy8gICAgICAgNTcgLSBub3JtYWxcbiAgLy8gICAgICAgNWYgLSBhbHNvIG5vcm1hbCwgYnV0IG1lZHVzYSBoZWFkIGlzIGZseWVyP1xuICAvLyAgICAgICA3NyAtIHNvbGRpZXJzLCBpY2Ugem9tYmllXG5cbi8vICAgLy8gRG9uJ3Qgd29ycnkgYWJvdXQgb3RoZXIgZGF0YXMgeWV0XG4vLyAgIHdyaXRlT2JqZWN0RGF0YSgpIHtcbi8vICAgICAvLyBidWlsZCB1cCBhIG1hcCBmcm9tIGFjdHVhbCBkYXRhIHRvIGluZGV4ZXMgdGhhdCBwb2ludCB0byBpdFxuLy8gICAgIGxldCBhZGRyID0gMHgxYWUwMDtcbi8vICAgICBjb25zdCBkYXRhcyA9IHt9O1xuLy8gICAgIGZvciAoY29uc3Qgb2JqZWN0IG9mIHRoaXMub2JqZWN0cykge1xuLy8gICAgICAgY29uc3Qgc2VyID0gb2JqZWN0LnNlcmlhbGl6ZSgpO1xuLy8gICAgICAgY29uc3QgZGF0YSA9IHNlci5qb2luKCcgJyk7XG4vLyAgICAgICBpZiAoZGF0YSBpbiBkYXRhcykge1xuLy8gLy9jb25zb2xlLmxvZyhgJCR7b2JqZWN0LmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApfTogUmV1c2luZyBleGlzdGluZyBkYXRhICQke2RhdGFzW2RhdGFdLnRvU3RyaW5nKDE2KX1gKTtcbi8vICAgICAgICAgb2JqZWN0Lm9iamVjdERhdGFCYXNlID0gZGF0YXNbZGF0YV07XG4vLyAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBvYmplY3Qub2JqZWN0RGF0YUJhc2UgPSBhZGRyO1xuLy8gICAgICAgICBkYXRhc1tkYXRhXSA9IGFkZHI7XG4vLyAvL2NvbnNvbGUubG9nKGAkJHtvYmplY3QuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCl9OiBEYXRhIGlzIGF0ICQke1xuLy8gLy8gICAgICAgICAgICAgYWRkci50b1N0cmluZygxNil9OiAke0FycmF5LmZyb20oc2VyLCB4PT4nJCcreC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKSkuam9pbignLCcpfWApO1xuLy8gICAgICAgICBhZGRyICs9IHNlci5sZW5ndGg7XG4vLyAvLyBzZWVkIDM1MTc4MTEwMzZcbi8vICAgICAgIH1cbi8vICAgICAgIG9iamVjdC53cml0ZSgpO1xuLy8gICAgIH1cbi8vIC8vY29uc29sZS5sb2coYFdyb3RlIG9iamVjdCBkYXRhIGZyb20gJDFhYzAwIHRvICQke2FkZHIudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDUsIDApXG4vLyAvLyAgICAgICAgICAgICB9LCBzYXZpbmcgJHsweDFiZTkxIC0gYWRkcn0gYnl0ZXMuYCk7XG4vLyAgICAgcmV0dXJuIGFkZHI7XG4vLyAgIH1cblxuICBhc3NlbWJsZXIoKTogQXNzZW1ibGVyIHtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgc2V0dGluZyBhIHNlZ21lbnQgcHJlZml4XG4gICAgcmV0dXJuIG5ldyBBc3NlbWJsZXIoKTtcbiAgfVxuXG4gIHdyaXRlRGF0YShkYXRhID0gdGhpcy5wcmcpIHtcbiAgICAvLyBXcml0ZSB0aGUgb3B0aW9ucyBmaXJzdFxuICAgIC8vIGNvbnN0IHdyaXRlciA9IG5ldyBXcml0ZXIodGhpcy5jaHIpO1xuICAgIC8vIHdyaXRlci5tb2R1bGVzLnB1c2goLi4udGhpcy5tb2R1bGVzKTtcbiAgICAvLyBNYXBEYXRhXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxNDRmOCwgMHgxN2UwMCk7XG4gICAgLy8gTnBjRGF0YVxuICAgIC8vIE5PVEU6IDE5M2Y5IGlzIGFzc3VtaW5nICRmYiBpcyB0aGUgbGFzdCBsb2NhdGlvbiBJRC4gIElmIHdlIGFkZCBtb3JlIGxvY2F0aW9ucyBhdFxuICAgIC8vIHRoZSBlbmQgdGhlbiB3ZSdsbCBuZWVkIHRvIHB1c2ggdGhpcyBiYWNrIGEgZmV3IG1vcmUgYnl0ZXMuICBXZSBjb3VsZCBwb3NzaWJseVxuICAgIC8vIGRldGVjdCB0aGUgYmFkIHdyaXRlIGFuZCB0aHJvdyBhbiBlcnJvciwgYW5kL29yIGNvbXB1dGUgdGhlIG1heCBsb2NhdGlvbiBJRC5cbiAgICAvL3dyaXRlci5hbGxvYygweDE5M2Y5LCAweDFhYzAwKTtcbiAgICAvLyBPYmplY3REYXRhIChpbmRleCBhdCAxYWMwMC4uMWFlMDApXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxYWUwMCwgMHgxYmQwMCk7IC8vIHNhdmUgNTEyIGJ5dGVzIGF0IGVuZCBmb3Igc29tZSBleHRyYSBjb2RlXG4gICAgY29uc3QgYSA9IHRoaXMuYXNzZW1ibGVyKCk7XG4gICAgLy8gTnBjU3Bhd25Db25kaXRpb25zXG4gICAgZnJlZShhLCAkMGUsIDB4ODc3YSwgMHg4OTVkKTtcbiAgICAvLyBOcGNEaWFsb2dcbiAgICBmcmVlKGEsICQwZSwgMHg4YWU1LCAweDk4ZjQpO1xuICAgIC8vIEl0ZW1HZXREYXRhICh0byAxZTA2NSkgKyBJdGVtVXNlRGF0YVxuICAgIGZyZWUoYSwgJDBlLCAweDlkZTYsIDB4YTAwMCk7XG4gICAgZnJlZShhLCAkMGYsIDB4YTAwMCwgMHhhMTA2KTtcbiAgICAvLyBUcmlnZ2VyRGF0YVxuICAgIC8vIE5PVEU6IFRoZXJlJ3Mgc29tZSBmcmVlIHNwYWNlIGF0IDFlM2MwLi4xZTNmMCwgYnV0IHdlIHVzZSB0aGlzIGZvciB0aGVcbiAgICAvLyBDaGVja0JlbG93Qm9zcyB0cmlnZ2Vycy5cbiAgICBmcmVlKGEsICQwZiwgMHhhMjAwLCAweGEzYzApO1xuICAgIC8vIEl0ZW1NZW51TmFtZVxuICAgIGZyZWUoYSwgJDEwLCAweDkxMWEsIDB4OTQ2OCk7XG4gICAgLy8ga2VlcCBpdGVtICQ0OSBcIiAgICAgICAgXCIgd2hpY2ggaXMgYWN0dWFsbHkgdXNlZCBzb21ld2hlcmU/XG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjE0NzEsIDB4MjE0ZjEpOyAvLyBUT0RPIC0gZG8gd2UgbmVlZCBhbnkgb2YgdGhpcz9cbiAgICAvLyBJdGVtTWVzc2FnZU5hbWVcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyOGU4MSwgMHgyOTIyYik7IC8vIE5PVEU6IHVuY292ZXJlZCB0aHJ1IDI5NDAwXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjkyMmIsIDB4Mjk0MDApOyAvLyBUT0RPIC0gbmVlZGVkP1xuICAgIC8vIE5PVEU6IG9uY2Ugd2UgcmVsZWFzZSB0aGUgb3RoZXIgbWVzc2FnZSB0YWJsZXMsIHRoaXMgd2lsbCBqdXN0IGJlIG9uZSBnaWFudCBibG9jay5cblxuICAgIC8vIE1lc3NhZ2UgdGFibGUgcGFydHNcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyODAwMCwgMHgyODNmZSk7XG4gICAgLy8gTWVzc2FnZSB0YWJsZXNcbiAgICAvLyBUT0RPIC0gd2UgZG9uJ3QgdXNlIHRoZSB3cml0ZXIgdG8gYWxsb2NhdGUgdGhlIGFiYnJldmlhdGlvbiB0YWJsZXMsIGJ1dCB3ZSBjb3VsZFxuICAgIC8vd3JpdGVyLmZyZWUoJzB4MmEwMDAsIDB4MmZjMDApO1xuXG4gICAgLy8gaWYgKHRoaXMudGVsZXBhdGh5VGFibGVzQWRkcmVzcykge1xuICAgIC8vICAgd3JpdGVyLmFsbG9jKDB4MWQ4ZjQsIDB4MWRiMDApOyAvLyBsb2NhdGlvbiB0YWJsZSBhbGwgdGhlIHdheSB0aHJ1IG1haW5cbiAgICAvLyB9IGVsc2Uge1xuICAgIC8vICAgd3JpdGVyLmFsbG9jKDB4MWRhNGMsIDB4MWRiMDApOyAvLyBleGlzdGluZyBtYWluIHRhYmxlIGlzIGhlcmUuXG4gICAgLy8gfVxuXG4gICAgY29uc3QgbW9kdWxlcyA9IFsuLi50aGlzLm1vZHVsZXMsIGEubW9kdWxlKCldO1xuICAgIGNvbnN0IHdyaXRlQWxsID0gKHdyaXRhYmxlczogSXRlcmFibGU8e3dyaXRlKCk6IE1vZHVsZVtdfT4pID0+IHtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB3cml0YWJsZXMpIHtcbiAgICAgICAgbW9kdWxlcy5wdXNoKC4uLncud3JpdGUoKSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5sb2NhdGlvbnMud3JpdGUoKSk7XG4gICAgd3JpdGVBbGwodGhpcy5vYmplY3RzKTtcbiAgICB3cml0ZUFsbCh0aGlzLmhpdGJveGVzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRyaWdnZXJzKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5ucGNzLndyaXRlKCkpO1xuICAgIHdyaXRlQWxsKHRoaXMudGlsZXNldHMpO1xuICAgIHdyaXRlQWxsKHRoaXMudGlsZUVmZmVjdHMpO1xuICAgIHdyaXRlQWxsKHRoaXMuYWRIb2NTcGF3bnMpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLml0ZW1HZXRzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNsb3RzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLml0ZW1zLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNob3BzLndyaXRlKCkpO1xuICAgIHdyaXRlQWxsKHRoaXMuYm9zc0tpbGxzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnBhdHRlcm5zKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy53aWxkV2FycC53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy50b3duV2FycC53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5jb2luRHJvcHMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2NhbGluZy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5ib3NzZXMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMucmFuZG9tTnVtYmVycy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy50ZWxlcGF0aHkud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMubWVzc2FnZXMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2NyZWVucy53cml0ZSgpKTtcblxuICAgIC8vIFJlc2VydmUgdGhlIGdsb2JhbCBzcGFjZSAxNDJjMC4uLjE0MmYwID8/P1xuICAgIC8vIGNvbnN0IHRoaXMuYXNzZW1ibGVyKCkuXG5cbiAgICBjb25zdCBsaW5rZXIgPSBuZXcgTGlua2VyKCk7XG4gICAgbGlua2VyLmJhc2UodGhpcy5wcmcsIDApO1xuICAgIGZvciAoY29uc3QgbSBvZiBtb2R1bGVzKSB7XG4gICAgICBsaW5rZXIucmVhZChtKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0ID0gbGlua2VyLmxpbmsoKTtcbiAgICBvdXQuYXBwbHkoZGF0YSk7XG4gICAgaWYgKGRhdGEgIT09IHRoaXMucHJnKSByZXR1cm47IC8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwXG4gICAgLy9saW5rZXIucmVwb3J0KCk7XG4gICAgY29uc3QgZXhwb3J0cyA9IGxpbmtlci5leHBvcnRzKCk7XG5cbiAgICBcbiAgICB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBleHBvcnRzLmdldCgnS2V5SXRlbURhdGEnKSEub2Zmc2V0ITtcbiAgICB0aGlzLnNob3BDb3VudCA9IDExO1xuICAgIHRoaXMuc2hvcERhdGFUYWJsZXNBZGRyZXNzID0gZXhwb3J0cy5nZXQoJ1Nob3BEYXRhJyk/Lm9mZnNldCB8fCAwO1xuICAgIC8vIERvbid0IGluY2x1ZGUgdGhlc2UgaW4gdGhlIGxpbmtlcj8/P1xuICAgIFJvbS5TSE9QX0NPVU5ULnNldCh0aGlzLnByZywgdGhpcy5zaG9wQ291bnQpO1xuICAgIFJvbS5TQ0FMSU5HX0xFVkVMUy5zZXQodGhpcy5wcmcsIHRoaXMuc2NhbGluZ0xldmVscyk7XG4gICAgUm9tLlVOSVFVRV9JVEVNX1RBQkxFLnNldCh0aGlzLnByZywgdGhpcy51bmlxdWVJdGVtVGFibGVBZGRyZXNzKTtcbiAgICBSb20uU0hPUF9EQVRBX1RBQkxFUy5zZXQodGhpcy5wcmcsIHRoaXMuc2hvcERhdGFUYWJsZXNBZGRyZXNzIHx8IDApO1xuICAgIFJvbS5PTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYLnNldCh0aGlzLnByZywgdGhpcy5vbWl0SXRlbUdldERhdGFTdWZmaXgpO1xuICAgIFJvbS5PTUlUX0xPQ0FMX0RJQUxPR19TVUZGSVguc2V0KHRoaXMucHJnLCB0aGlzLm9taXRMb2NhbERpYWxvZ1N1ZmZpeCk7XG4gICAgUm9tLkNPTVBSRVNTRURfTUFQREFUQS5zZXQodGhpcy5wcmcsIHRoaXMuY29tcHJlc3NlZE1hcERhdGEpO1xuICB9XG5cbiAgYW5hbHl6ZVRpbGVzKCkge1xuICAgIC8vIEZvciBhbnkgZ2l2ZW4gdGlsZSBpbmRleCwgd2hhdCBzY3JlZW5zIGRvZXMgaXQgYXBwZWFyIG9uLlxuICAgIC8vIEZvciB0aG9zZSBzY3JlZW5zLCB3aGljaCB0aWxlc2V0cyBkb2VzICppdCogYXBwZWFyIG9uLlxuICAgIC8vIFRoYXQgdGlsZSBJRCBpcyBsaW5rZWQgYWNyb3NzIGFsbCB0aG9zZSB0aWxlc2V0cy5cbiAgICAvLyBGb3JtcyBhIHBhcnRpdGlvbmluZyBmb3IgZWFjaCB0aWxlIElEID0+IHVuaW9uLWZpbmQuXG4gICAgLy8gR2l2ZW4gdGhpcyBwYXJ0aXRpb25pbmcsIGlmIEkgd2FudCB0byBtb3ZlIGEgdGlsZSBvbiBhIGdpdmVuXG4gICAgLy8gdGlsZXNldCwgYWxsIEkgbmVlZCB0byBkbyBpcyBmaW5kIGFub3RoZXIgdGlsZSBJRCB3aXRoIHRoZVxuICAgIC8vIHNhbWUgcGFydGl0aW9uIGFuZCBzd2FwIHRoZW0/XG5cbiAgICAvLyBNb3JlIGdlbmVyYWxseSwgd2UgY2FuIGp1c3QgcGFydGl0aW9uIHRoZSB0aWxlc2V0cy5cblxuICAgIC8vIEZvciBlYWNoIHNjcmVlbiwgZmluZCBhbGwgdGlsZXNldHMgVCBmb3IgdGhhdCBzY3JlZW5cbiAgICAvLyBUaGVuIGZvciBlYWNoIHRpbGUgb24gdGhlIHNjcmVlbiwgdW5pb24gVCBmb3IgdGhhdCB0aWxlLlxuXG4gICAgLy8gR2l2ZW4gYSB0aWxlc2V0IGFuZCBhIG1ldGF0aWxlIElELCBmaW5kIGFsbCB0aGUgc2NyZWVucyB0aGF0ICgxKSBhcmUgcmVuZGVyZWRcbiAgICAvLyB3aXRoIHRoYXQgdGlsZXNldCwgYW5kIChiKSB0aGF0IGNvbnRhaW4gdGhhdCBtZXRhdGlsZTsgdGhlbiBmaW5kIGFsbCAqb3RoZXIqXG4gICAgLy8gdGlsZXNldHMgdGhhdCB0aG9zZSBzY3JlZW5zIGFyZSBldmVyIHJlbmRlcmVkIHdpdGguXG5cbiAgICAvLyBHaXZlbiBhIHNjcmVlbiwgZmluZCBhbGwgYXZhaWxhYmxlIG1ldGF0aWxlIElEcyB0aGF0IGNvdWxkIGJlIGFkZGVkIHRvIGl0XG4gICAgLy8gd2l0aG91dCBjYXVzaW5nIHByb2JsZW1zIHdpdGggb3RoZXIgc2NyZWVucyB0aGF0IHNoYXJlIGFueSB0aWxlc2V0cy5cbiAgICAvLyAgLT4gdW51c2VkIChvciB1c2VkIGJ1dCBzaGFyZWQgZXhjbHVzaXZlbHkpIGFjcm9zcyBhbGwgdGlsZXNldHMgdGhlIHNjcmVlbiBtYXkgdXNlXG5cbiAgICAvLyBXaGF0IEkgd2FudCBmb3Igc3dhcHBpbmcgaXMgdGhlIGZvbGxvd2luZzpcbiAgICAvLyAgMS4gZmluZCBhbGwgc2NyZWVucyBJIHdhbnQgdG8gd29yayBvbiA9PiB0aWxlc2V0c1xuICAgIC8vICAyLiBmaW5kIHVudXNlZCBmbGFnZ2FiYmxlIHRpbGVzIGluIHRoZSBoYXJkZXN0IG9uZSxcbiAgICAvLyAgICAgd2hpY2ggYXJlIGFsc28gSVNPTEFURUQgaW4gdGhlIG90aGVycy5cbiAgICAvLyAgMy4gd2FudCB0aGVzZSB0aWxlcyB0byBiZSB1bnVzZWQgaW4gQUxMIHJlbGV2YW50IHRpbGVzZXRzXG4gICAgLy8gIDQuIHRvIG1ha2UgdGhpcyBzbywgZmluZCAqb3RoZXIqIHVudXNlZCBmbGFnZ2FibGUgdGlsZXMgaW4gb3RoZXIgdGlsZXNldHNcbiAgICAvLyAgNS4gc3dhcCB0aGUgdW51c2VkIHdpdGggdGhlIGlzb2xhdGVkIHRpbGVzIGluIHRoZSBvdGhlciB0aWxlc2V0c1xuXG4gICAgLy8gQ2F2ZXM6XG4gICAgLy8gIDBhOiAgICAgIDkwIC8gOWNcbiAgICAvLyAgMTU6IDgwIC8gOTAgLyA5Y1xuICAgIC8vICAxOTogICAgICA5MCAgICAgICh3aWxsIGFkZCB0byA4MD8pXG4gICAgLy8gIDNlOiAgICAgIDkwXG4gICAgLy9cbiAgICAvLyBJZGVhbGx5IHdlIGNvdWxkIHJldXNlIDgwJ3MgMS8yLzMvNCBmb3IgdGhpc1xuICAgIC8vICAwMTogOTAgfCA5NCA5Y1xuICAgIC8vICAwMjogOTAgfCA5NCA5Y1xuICAgIC8vICAwMzogICAgICA5NCA5Y1xuICAgIC8vICAwNDogOTAgfCA5NCA5Y1xuICAgIC8vXG4gICAgLy8gTmVlZCA0IG90aGVyIGZsYWdnYWJsZSB0aWxlIGluZGljZXMgd2UgY2FuIHN3YXAgdG8/XG4gICAgLy8gICA5MDogPT4gKDEsMiBuZWVkIGZsYWdnYWJsZTsgMyB1bnVzZWQ7IDQgYW55KSA9PiAwNywgMGUsIDEwLCAxMiwgMTMsIC4uLiwgMjAsIDIxLCAyMiwgLi4uXG4gICAgLy8gICA5NCA5YzogPT4gZG9uJ3QgbmVlZCBhbnkgZmxhZ2dhYmxlID0+IDA1LCAzYywgNjgsIDgzLCA4OCwgODksIDhhLCA5MCwgLi4uXG4gIH1cblxuICBkaXNqb2ludFRpbGVzZXRzKCkge1xuICAgIGNvbnN0IHRpbGVzZXRCeVNjcmVlbjogQXJyYXk8U2V0PG51bWJlcj4+ID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbG9jLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgdGlsZXNldCA9IGxvYy50aWxlc2V0O1xuICAgICAgLy9jb25zdCBleHQgPSBsb2Muc2NyZWVuUGFnZTtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIGxvYy5zY3JlZW5zKSB7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiByb3cpIHtcbiAgICAgICAgICAodGlsZXNldEJ5U2NyZWVuW3NdIHx8ICh0aWxlc2V0QnlTY3JlZW5bc10gPSBuZXcgU2V0KCkpKS5hZGQodGlsZXNldCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdGlsZXMgPSBzZXEoMjU2LCAoKSA9PiBuZXcgVW5pb25GaW5kPG51bWJlcj4oKSk7XG4gICAgZm9yIChsZXQgcyA9IDA7IHMgPCB0aWxlc2V0QnlTY3JlZW4ubGVuZ3RoOyBzKyspIHtcbiAgICAgIGlmICghdGlsZXNldEJ5U2NyZWVuW3NdKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgdCBvZiB0aGlzLnNjcmVlbnNbc10uYWxsVGlsZXNTZXQoKSkge1xuICAgICAgICB0aWxlc1t0XS51bmlvbihbLi4udGlsZXNldEJ5U2NyZWVuW3NdXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIG91dHB1dFxuICAgIGZvciAobGV0IHQgPSAwOyB0IDwgdGlsZXMubGVuZ3RoOyB0KyspIHtcbiAgICAgIGNvbnN0IHAgPSB0aWxlc1t0XS5zZXRzKClcbiAgICAgICAgICAubWFwKChzOiBTZXQ8bnVtYmVyPikgPT4gWy4uLnNdLm1hcChoZXgpLmpvaW4oJyAnKSlcbiAgICAgICAgICAuam9pbignIHwgJyk7XG4gICAgICBjb25zb2xlLmxvZyhgVGlsZSAke2hleCh0KX06ICR7cH1gKTtcbiAgICB9XG4gICAgLy8gICBpZiAoIXRpbGVzZXRCeVNjcmVlbltpXSkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZyhgTm8gdGlsZXNldCBmb3Igc2NyZWVuICR7aS50b1N0cmluZygxNil9YCk7XG4gICAgLy8gICAgIGNvbnRpbnVlO1xuICAgIC8vICAgfVxuICAgIC8vICAgdW5pb24udW5pb24oWy4uLnRpbGVzZXRCeVNjcmVlbltpXV0pO1xuICAgIC8vIH1cbiAgICAvLyByZXR1cm4gdW5pb24uc2V0cygpO1xuICB9XG5cbiAgLy8gQ3ljbGVzIGFyZSBub3QgYWN0dWFsbHkgY3ljbGljIC0gYW4gZXhwbGljaXQgbG9vcCBhdCB0aGUgZW5kIGlzIHJlcXVpcmVkIHRvIHN3YXAuXG4gIC8vIFZhcmlhbmNlOiBbMSwgMiwgbnVsbF0gd2lsbCBjYXVzZSBpbnN0YW5jZXMgb2YgMSB0byBiZWNvbWUgMiBhbmQgd2lsbFxuICAvLyAgICAgICAgICAgY2F1c2UgcHJvcGVydGllcyBvZiAxIHRvIGJlIGNvcGllZCBpbnRvIHNsb3QgMlxuICAvLyBDb21tb24gdXNhZ2UgaXMgdG8gc3dhcCB0aGluZ3Mgb3V0IG9mIHRoZSB3YXkgYW5kIHRoZW4gY29weSBpbnRvIHRoZVxuICAvLyBuZXdseS1mcmVlZCBzbG90LiAgU2F5IHdlIHdhbnRlZCB0byBmcmVlIHVwIHNsb3RzIFsxLCAyLCAzLCA0XSBhbmRcbiAgLy8gaGFkIGF2YWlsYWJsZS9mcmVlIHNsb3RzIFs1LCA2LCA3LCA4XSBhbmQgd2FudCB0byBjb3B5IGZyb20gWzksIGEsIGIsIGNdLlxuICAvLyBUaGVuIGN5Y2xlcyB3aWxsIGJlIFsxLCA1LCA5XSA/Pz8gbm9cbiAgLy8gIC0gcHJvYmFibHkgd2FudCB0byBkbyBzY3JlZW5zIHNlcGFyYXRlbHkgZnJvbSB0aWxlc2V0cy4uLj9cbiAgLy8gTk9URSAtIHdlIGRvbid0IGFjdHVhbGx5IHdhbnQgdG8gY2hhbmdlIHRpbGVzIGZvciB0aGUgbGFzdCBjb3B5Li4uIVxuICAvLyAgIGluIHRoaXMgY2FzZSwgdHNbNV0gPC0gdHNbMV0sIHRzWzFdIDwtIHRzWzldLCBzY3JlZW4ubWFwKDEgLT4gNSlcbiAgLy8gICByZXBsYWNlKFsweDkwXSwgWzUsIDEsIH45XSlcbiAgLy8gICAgID0+IDFzIHJlcGxhY2VkIHdpdGggNXMgaW4gc2NyZWVucyBidXQgOXMgTk9UIHJlcGxhY2VkIHdpdGggMXMuXG4gIC8vIEp1c3QgYnVpbGQgdGhlIHBhcnRpdGlvbiBvbmNlIGxhemlseT8gdGhlbiBjYW4gcmV1c2UuLi5cbiAgLy8gICAtIGVuc3VyZSBib3RoIHNpZGVzIG9mIHJlcGxhY2VtZW50IGhhdmUgY29ycmVjdCBwYXJ0aXRpb25pbmc/RVxuICAvLyAgICAgb3IganVzdCBkbyBpdCBvZmZsaW5lIC0gaXQncyBzaW1wbGVyXG4gIC8vIFRPRE8gLSBTYW5pdHkgY2hlY2s/ICBXYW50IHRvIG1ha2Ugc3VyZSBub2JvZHkgaXMgdXNpbmcgY2xvYmJlcmVkIHRpbGVzP1xuICBzd2FwTWV0YXRpbGVzKHRpbGVzZXRzOiBudW1iZXJbXSwgLi4uY3ljbGVzOiAobnVtYmVyIHwgbnVtYmVyW10pW11bXSkge1xuICAgIC8vIFByb2Nlc3MgdGhlIGN5Y2xlc1xuICAgIGNvbnN0IHJldiA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgY29uc3QgcmV2QXJyOiBudW1iZXJbXSA9IHNlcSgweDEwMCk7XG4gICAgY29uc3QgYWx0ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBjb25zdCBjcGwgPSAoeDogbnVtYmVyIHwgbnVtYmVyW10pOiBudW1iZXIgPT4gQXJyYXkuaXNBcnJheSh4KSA/IHhbMF0gOiB4IDwgMCA/IH54IDogeDtcbiAgICBmb3IgKGNvbnN0IGN5Y2xlIG9mIGN5Y2xlcykge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY3ljbGVbaV0pKSB7XG4gICAgICAgICAgY29uc3QgYXJyID0gY3ljbGVbaV0gYXMgbnVtYmVyW107XG4gICAgICAgICAgYWx0LnNldChhcnJbMF0sIGFyclsxXSk7XG4gICAgICAgICAgY3ljbGVbaV0gPSBhcnJbMF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGogPSBjeWNsZVtpXSBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IGsgPSBjeWNsZVtpICsgMV0gYXMgbnVtYmVyO1xuICAgICAgICBpZiAoaiA8IDAgfHwgayA8IDApIGNvbnRpbnVlO1xuICAgICAgICByZXYuc2V0KGssIGopO1xuICAgICAgICByZXZBcnJba10gPSBqO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb25zdCByZXBsYWNlbWVudFNldCA9IG5ldyBTZXQocmVwbGFjZW1lbnRzLmtleXMoKSk7XG4gICAgLy8gRmluZCBpbnN0YW5jZXMgaW4gKDEpIHNjcmVlbnMsICgyKSB0aWxlc2V0cyBhbmQgYWx0ZXJuYXRlcywgKDMpIHRpbGVFZmZlY3RzXG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBTZXQ8U2NyZWVuPigpO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgY29uc3QgdGlsZXNldHNTZXQgPSBuZXcgU2V0KHRpbGVzZXRzKTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmICghdGlsZXNldHNTZXQuaGFzKGwudGlsZXNldCkpIGNvbnRpbnVlO1xuICAgICAgdGlsZUVmZmVjdHMuYWRkKGwudGlsZUVmZmVjdHMpO1xuICAgICAgZm9yIChjb25zdCBzY3JlZW4gb2YgbC5hbGxTY3JlZW5zKCkpIHtcbiAgICAgICAgc2NyZWVucy5hZGQoc2NyZWVuKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRG8gcmVwbGFjZW1lbnRzLlxuICAgIC8vIDEuIHNjcmVlbnM6IFs1LCAxLCB+OV0gPT4gY2hhbmdlIDFzIGludG8gNXNcbiAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiBzY3JlZW5zKSB7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2NyZWVuLnRpbGVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHNjcmVlbi50aWxlc1tpXSA9IHJldkFycltzY3JlZW4udGlsZXNbaV1dO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyAyLiB0aWxlc2V0czogWzUsIDEgfjldID0+IGNvcHkgNSA8PSAxIGFuZCAxIDw9IDlcbiAgICBmb3IgKGNvbnN0IHRzaWQgb2YgdGlsZXNldHNTZXQpIHtcbiAgICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnRpbGVzZXRzW3RzaWRdO1xuICAgICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gY3BsKGN5Y2xlW2ldKTtcbiAgICAgICAgICBjb25zdCBiID0gY3BsKGN5Y2xlW2kgKyAxXSk7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCA0OyBqKyspIHtcbiAgICAgICAgICAgIHRpbGVzZXQudGlsZXNbal1bYV0gPSB0aWxlc2V0LnRpbGVzW2pdW2JdO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aWxlc2V0LmF0dHJzW2FdID0gdGlsZXNldC5hdHRyc1tiXTtcbiAgICAgICAgICBpZiAoYiA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW2JdICE9PSBiKSB7XG4gICAgICAgICAgICBpZiAoYSA+PSAweDIwKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCB1bmZsYWc6ICR7dHNpZH0gJHthfSAke2J9ICR7dGlsZXNldC5hbHRlcm5hdGVzW2JdfWApO1xuICAgICAgICAgICAgdGlsZXNldC5hbHRlcm5hdGVzW2FdID0gdGlsZXNldC5hbHRlcm5hdGVzW2JdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFthLCBiXSBvZiBhbHQpIHtcbiAgICAgICAgdGlsZXNldC5hbHRlcm5hdGVzW2FdID0gYjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gMy4gdGlsZUVmZmVjdHNcbiAgICBmb3IgKGNvbnN0IHRlaWQgb2YgdGlsZUVmZmVjdHMpIHtcbiAgICAgIGNvbnN0IHRpbGVFZmZlY3QgPSB0aGlzLnRpbGVFZmZlY3RzW3RlaWQgLSAweGIzXTtcbiAgICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IGNwbChjeWNsZVtpXSk7XG4gICAgICAgICAgY29uc3QgYiA9IGNwbChjeWNsZVtpICsgMV0pO1xuICAgICAgICAgIHRpbGVFZmZlY3QuZWZmZWN0c1thXSA9IHRpbGVFZmZlY3QuZWZmZWN0c1tiXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBhIG9mIGFsdC5rZXlzKCkpIHtcbiAgICAgICAgLy8gVGhpcyBiaXQgaXMgcmVxdWlyZWQgdG8gaW5kaWNhdGUgdGhhdCB0aGUgYWx0ZXJuYXRpdmUgdGlsZSdzXG4gICAgICAgIC8vIGVmZmVjdCBzaG91bGQgYmUgY29uc3VsdGVkLiAgU2ltcGx5IGhhdmluZyB0aGUgZmxhZyBhbmQgdGhlXG4gICAgICAgIC8vIHRpbGUgaW5kZXggPCAkMjAgaXMgbm90IHN1ZmZpY2llbnQuXG4gICAgICAgIHRpbGVFZmZlY3QuZWZmZWN0c1thXSB8PSAweDA4O1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBEb25lPyE/XG4gIH1cblxuICBtb3ZlRmxhZyhvbGRGbGFnOiBudW1iZXIsIG5ld0ZsYWc6IG51bWJlcikge1xuICAgIC8vIG5lZWQgdG8gdXBkYXRlIHRyaWdnZXJzLCBzcGF3bnMsIGRpYWxvZ3NcbiAgICBmdW5jdGlvbiByZXBsYWNlKGFycjogbnVtYmVyW10pIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcnJbaV0gPT09IG9sZEZsYWcpIGFycltpXSA9IG5ld0ZsYWc7XG4gICAgICAgIGlmIChhcnJbaV0gPT09IH5vbGRGbGFnKSBhcnJbaV0gPSB+bmV3RmxhZztcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCB0cmlnZ2VyIG9mIHRoaXMudHJpZ2dlcnMpIHtcbiAgICAgIHJlcGxhY2UodHJpZ2dlci5jb25kaXRpb25zKTtcbiAgICAgIHJlcGxhY2UodHJpZ2dlci5mbGFncyk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbnBjIG9mIHRoaXMubnBjcykge1xuICAgICAgZm9yIChjb25zdCBjb25kcyBvZiBucGMuc3Bhd25Db25kaXRpb25zLnZhbHVlcygpKSByZXBsYWNlKGNvbmRzKTtcbiAgICAgIGZvciAoY29uc3QgZGlhbG9ncyBvZiBbbnBjLmdsb2JhbERpYWxvZ3MsIC4uLm5wYy5sb2NhbERpYWxvZ3MudmFsdWVzKCldKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGlhbG9nIG9mIGRpYWxvZ3MpIHtcbiAgICAgICAgICBpZiAoZGlhbG9nLmNvbmRpdGlvbiA9PT0gb2xkRmxhZykgZGlhbG9nLmNvbmRpdGlvbiA9IG5ld0ZsYWc7XG4gICAgICAgICAgaWYgKGRpYWxvZy5jb25kaXRpb24gPT09IH5vbGRGbGFnKSBkaWFsb2cuY29uZGl0aW9uID0gfm5ld0ZsYWc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gYWxzbyBuZWVkIHRvIHVwZGF0ZSBtYXAgZmxhZ3MgaWYgPj0gJDIwMFxuICAgIGlmICgob2xkRmxhZyAmIH4weGZmKSA9PT0gMHgyMDAgJiYgKG5ld0ZsYWcgJiB+MHhmZikgPT09IDB4MjAwKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgbG9jLmZsYWdzKSB7XG4gICAgICAgICAgaWYgKGZsYWcuZmxhZyA9PT0gb2xkRmxhZykgZmxhZy5mbGFnID0gbmV3RmxhZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5leHRGcmVlVHJpZ2dlcigpOiBUcmlnZ2VyIHtcbiAgICBmb3IgKGNvbnN0IHQgb2YgdGhpcy50cmlnZ2Vycykge1xuICAgICAgaWYgKCF0LnVzZWQpIHJldHVybiB0O1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIGFuIHVudXNlZCB0cmlnZ2VyLicpO1xuICB9XG5cbiAgLy8gY29tcHJlc3NNYXBEYXRhKCk6IHZvaWQge1xuICAvLyAgIGlmICh0aGlzLmNvbXByZXNzZWRNYXBEYXRhKSByZXR1cm47XG4gIC8vICAgdGhpcy5jb21wcmVzc2VkTWFwRGF0YSA9IHRydWU7XG4gIC8vICAgLy8gZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAvLyAgIC8vICAgaWYgKGxvY2F0aW9uLmV4dGVuZGVkKSBsb2NhdGlvbi5leHRlbmRlZCA9IDB4YTtcbiAgLy8gICAvLyB9XG4gIC8vICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgLy8gICAgIC8vdGhpcy5zY3JlZW5zWzB4YTAwIHwgaV0gPSB0aGlzLnNjcmVlbnNbMHgxMDAgfCBpXTtcbiAgLy8gICAgIHRoaXMubWV0YXNjcmVlbnMucmVudW1iZXIoMHgxMDAgfCBpLCAweGEwMCB8IGkpO1xuICAvLyAgICAgZGVsZXRlIHRoaXMuc2NyZWVuc1sweDEwMCB8IGldO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIFRPRE8gLSBkb2VzIG5vdCB3b3JrLi4uXG4gIC8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwIHNvbWVob3cuLi4gd291bGQgYmUgbmljZSB0byB1c2UgdGhlIGFzc2VtYmxlci9saW5rZXJcbiAgLy8gICAgICAgIHcvIGFuIC5hbGlnbiBvcHRpb24gZm9yIHRoaXMsIGJ1dCB0aGVuIHdlIGhhdmUgdG8gaG9sZCBvbnRvIHdlaXJkXG4gIC8vICAgICAgICBkYXRhIGluIG1hbnkgcGxhY2VzLCB3aGljaCBpc24ndCBncmVhdC5cbiAgbW92ZVNjcmVlbnModGlsZXNldDogTWV0YXRpbGVzZXQsIHBhZ2U6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb21wcmVzc2VkTWFwRGF0YSkgdGhyb3cgbmV3IEVycm9yKGBNdXN0IGNvbXByZXNzIG1hcHMgZmlyc3QuYCk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBsZXQgaSA9IHBhZ2UgPDwgODtcbiAgICB3aGlsZSAodGhpcy5zY3JlZW5zW2ldKSB7XG4gICAgICBpKys7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRpbGVzZXQpIHtcbiAgICAgIGlmIChzY3JlZW4uc2lkID49IDB4MTAwKSBjb250aW51ZTtcbiAgICAgIC8vaWYgKChpICYgMHhmZikgPT09IDB4MjApIHRocm93IG5ldyBFcnJvcihgTm8gcm9vbSBsZWZ0IG9uIHBhZ2UuYCk7XG4gICAgICBjb25zdCBwcmV2ID0gc2NyZWVuLnNpZDtcbiAgICAgIGlmIChtYXAuaGFzKHByZXYpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG5leHQgPSBzY3JlZW4uc2lkID0gaSsrO1xuICAgICAgbWFwLnNldChwcmV2LCBuZXh0KTtcbiAgICAgIG1hcC5zZXQobmV4dCwgbmV4dCk7XG4gICAgICAvL3RoaXMubWV0YXNjcmVlbnMucmVudW1iZXIocHJldiwgbmV4dCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAobG9jLnRpbGVzZXQgIT0gdGlsZXNldC50aWxlc2V0SWQpIGNvbnRpbnVlO1xuICAgICAgbGV0IGFueU1vdmVkID0gZmFsc2U7XG4gICAgICBsZXQgYWxsTW92ZWQgPSB0cnVlO1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByb3cubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCBtYXBwZWQgPSBtYXAuZ2V0KHJvd1tqXSk7XG4gICAgICAgICAgaWYgKG1hcHBlZCAhPSBudWxsKSB7XG4gICAgICAgICAgICByb3dbal0gPSBtYXBwZWQ7XG4gICAgICAgICAgICBhbnlNb3ZlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsbE1vdmVkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoYW55TW92ZWQpIHtcbiAgICAgICAgaWYgKCFhbGxNb3ZlZCkgdGhyb3cgbmV3IEVycm9yKGBJbmNvbnNpc3RlbnQgbW92ZWApO1xuICAgICAgICAvL2xvYy5leHRlbmRlZCA9IHBhZ2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVXNlIHRoZSBicm93c2VyIEFQSSB0byBsb2FkIHRoZSBST00uICBVc2UgI3Jlc2V0IHRvIGZvcmdldCBhbmQgcmVsb2FkLlxuICBzdGF0aWMgYXN5bmMgbG9hZChwYXRjaD86IChkYXRhOiBVaW50OEFycmF5KSA9PiB2b2lkfFByb21pc2U8dm9pZD4sXG4gICAgICAgICAgICAgICAgICAgIHJlY2VpdmVyPzogKHBpY2tlcjogRWxlbWVudCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBwaWNrRmlsZShyZWNlaXZlcik7XG4gICAgaWYgKHBhdGNoKSBhd2FpdCBwYXRjaChmaWxlKTtcbiAgICByZXR1cm4gbmV3IFJvbShmaWxlKTtcbiAgfSAgXG59XG5cbi8vIGNvbnN0IGludGVyc2VjdHMgPSAobGVmdCwgcmlnaHQpID0+IHtcbi8vICAgaWYgKGxlZnQuc2l6ZSA+IHJpZ2h0LnNpemUpIHJldHVybiBpbnRlcnNlY3RzKHJpZ2h0LCBsZWZ0KTtcbi8vICAgZm9yIChsZXQgaSBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0LmhhcyhpKSkgcmV0dXJuIHRydWU7XG4vLyAgIH1cbi8vICAgcmV0dXJuIGZhbHNlO1xuLy8gfVxuXG4vLyBjb25zdCBUSUxFX0VGRkVDVFNfQllfVElMRVNFVCA9IHtcbi8vICAgMHg4MDogMHhiMyxcbi8vICAgMHg4NDogMHhiNCxcbi8vICAgMHg4ODogMHhiNSxcbi8vICAgMHg4YzogMHhiNixcbi8vICAgMHg5MDogMHhiNyxcbi8vICAgMHg5NDogMHhiOCxcbi8vICAgMHg5ODogMHhiOSxcbi8vICAgMHg5YzogMHhiYSxcbi8vICAgMHhhMDogMHhiYixcbi8vICAgMHhhNDogMHhiYyxcbi8vICAgMHhhODogMHhiNSxcbi8vICAgMHhhYzogMHhiZCxcbi8vIH07XG5cbi8vIE9ubHkgbWFrZXMgc2Vuc2UgaW4gdGhlIGJyb3dzZXIuXG5mdW5jdGlvbiBwaWNrRmlsZShyZWNlaXZlcj86IChwaWNrZXI6IEVsZW1lbnQpID0+IHZvaWQpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgaWYgKCFyZWNlaXZlcikgcmVjZWl2ZXIgPSBwaWNrZXIgPT4gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwaWNrZXIpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggIT09ICcjcmVzZXQnKSB7XG4gICAgICBjb25zdCBkYXRhID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JvbScpO1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUoXG4gICAgICAgICAgICBVaW50OEFycmF5LmZyb20oXG4gICAgICAgICAgICAgICAgbmV3IEFycmF5KGRhdGEubGVuZ3RoIC8gMikuZmlsbCgwKS5tYXAoXG4gICAgICAgICAgICAgICAgICAgIChfLCBpKSA9PiBOdW1iZXIucGFyc2VJbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzIgKiBpXSArIGRhdGFbMiAqIGkgKyAxXSwgMTYpKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB1cGxvYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodXBsb2FkKTtcbiAgICB1cGxvYWQudHlwZSA9ICdmaWxlJztcbiAgICB1cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IHVwbG9hZC5maWxlcyFbMF07XG4gICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGFyciA9IG5ldyBVaW50OEFycmF5KHJlYWRlci5yZXN1bHQgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICBjb25zdCBzdHIgPSBBcnJheS5mcm9tKGFyciwgaGV4KS5qb2luKCcnKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JvbScsIHN0cik7XG4gICAgICAgIHVwbG9hZC5yZW1vdmUoKTtcbiAgICAgICAgcmVzb2x2ZShhcnIpO1xuICAgICAgfSk7XG4gICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgRVhQRUNURURfQ1JDMzIgPSAweDFiZDM5MDMyO1xuXG4vLyBGb3JtYXQ6IFthZGRyZXNzLCBicm9rZW4sIGZpeGVkXVxuY29uc3QgQURKVVNUTUVOVFMgPSBbXG4gIC8vIE5vcm1hbGl6ZSBjYXZlIGVudHJhbmNlIGluIDAxIG91dHNpZGUgc3RhcnRcbiAgWzB4MTQ1NDgsIDB4NTYsIDB4NTBdLFxuICAvLyBGaXggYnJva2VuIChmYWxsLXRocm91Z2gpIGV4aXQgb3V0c2lkZSBzdGFydFxuICBbMHgxNDU2YSwgMHgwMCwgMHhmZl0sXG4gIC8vIE1vdmUgTGVhZiBub3J0aCBlbnRyYW5jZSB0byBiZSByaWdodCBuZXh0IHRvIGV4aXQgKGNvbnNpc3RlbnQgd2l0aCBHb2EpXG4gIFsweDE0NThmLCAweDM4LCAweDMwXSxcbiAgLy8gTm9ybWFsaXplIHNlYWxlZCBjYXZlIGVudHJhbmNlL2V4aXQgYW5kIHplYnUgY2F2ZSBlbnRyYW5jZVxuICBbMHgxNDYxOCwgMHg2MCwgMHg3MF0sXG4gIFsweDE0NjI2LCAweGE4LCAweGEwXSxcbiAgWzB4MTQ2MzMsIDB4MTUsIDB4MTZdLFxuICBbMHgxNDYzNywgMHgxNSwgMHgxNl0sXG4gIC8vIE5vcm1hbGl6ZSBjb3JkZWwgcGxhaW4gZW50cmFuY2UgZnJvbSBzZWFsZWQgY2F2ZVxuICBbMHgxNDk1MSwgMHhhOCwgMHhhMF0sXG4gIFsweDE0OTUzLCAweDk4LCAweDkwXSxcbiAgLy8gTm9ybWFsaXplIGNvcmRlbCBzd2FwIGVudHJhbmNlXG4gIFsweDE0YTE5LCAweDc4LCAweDcwXSxcbiAgLy8gUmVkdW5kYW50IGV4aXQgbmV4dCB0byBzdG9tJ3MgZG9vciBpbiAkMTlcbiAgWzB4MTRhZWIsIDB4MDksIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgc3dhbXAgZW50cmFuY2UgcG9zaXRpb25cbiAgWzB4MTRiNDksIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgYW1hem9uZXMgZW50cmFuY2UvZXhpdCBwb3NpdGlvblxuICBbMHgxNGI4NywgMHgyMCwgMHgzMF0sXG4gIFsweDE0YjlhLCAweDAxLCAweDAyXSxcbiAgWzB4MTRiOWUsIDB4MDEsIDB4MDJdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1yaWdodCBvZiBNdCBTYWJyZSBXZXN0IGNhdmVcbiAgWzB4MTRkYjksIDB4MDgsIDB4ODBdLFxuICAvLyBOb3JtYWxpemUgc2FicmUgbiBlbnRyYW5jZSBiZWxvdyBzdW1taXRcbiAgWzB4MTRlZjYsIDB4NjgsIDB4NjBdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1sZWZ0IG9mIExpbWUgVHJlZSBWYWxsZXlcbiAgWzB4MTU0NWQsIDB4ZmYsIDB4MDBdLFxuICAvLyBOb3JtYWxpemUgbGltZSB0cmVlIHZhbGxleSBTRSBlbnRyYW5jZVxuICBbMHgxNTQ2OSwgMHg3OCwgMHg3MF0sXG4gIC8vIE5vcm1hbGl6ZSBwb3J0b2Egc2Uvc3cgZW50cmFuY2VzXG4gIFsweDE1ODA2LCAweDk4LCAweGEwXSxcbiAgWzB4MTU4MGEsIDB4OTgsIDB4YTBdLFxuICAvLyBOb3JtYWxpemUgcG9ydG9hIHBhbGFjZSBlbnRyYW5jZVxuICBbMHgxNTgwZSwgMHg1OCwgMHg1MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gcG9ydG9hXG4gIFsweDE1ODFkLCAweDAwLCAweGZmXSxcbiAgWzB4MTU4NGUsIDB4ZGIsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgZmlzaGVybWFuIGlzbGFuZCBlbnRyYW5jZVxuICBbMHgxNTg3NSwgMHg3OCwgMHg3MF0sXG4gIC8vIE5vcm1hbGl6ZSB6b21iaWUgdG93biBlbnRyYW5jZSBmcm9tIHBhbGFjZVxuICBbMHgxNWI0ZiwgMHg3OCwgMHg4MF0sXG4gIC8vIFJlbW92ZSB1bnVzZWQgbWFwIHNjcmVlbnMgZnJvbSBFdmlsIFNwaXJpdCBsb3dlclxuICBbMHgxNWJhZiwgMHhmMCwgMHg4MF0sXG4gIFsweDE1YmI2LCAweGRmLCAweDgwXSxcbiAgWzB4MTViYjcsIDB4OTYsIDB4ODBdLFxuICAvLyBOb3JtYWxpemUgc2FiZXJhIHBhbGFjZSAxIGVudHJhbmNlIHVwIG9uZSB0aWxlXG4gIFsweDE1Y2UzLCAweGRmLCAweGNmXSxcbiAgWzB4MTVjZWUsIDB4NmUsIDB4NmRdLFxuICBbMHgxNWNmMiwgMHg2ZSwgMHg2ZF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJlcmEgcGFsYWNlIDMgZW50cmFuY2UgdXAgb25lIHRpbGVcbiAgWzB4MTVkOGUsIDB4ZGYsIDB4Y2ZdLFxuICBbMHgxNWQ5MSwgMHgyZSwgMHgyZF0sXG4gIFsweDE1ZDk1LCAweDJlLCAweDJkXSxcbiAgLy8gTm9ybWFsaXplIGpvZWwgZW50cmFuY2VcbiAgWzB4MTVlM2EsIDB4ZDgsIDB4ZGZdLFxuICAvLyBOb3JtYWxpemUgZ29hIHZhbGxleSByaWdodGhhbmQgZW50cmFuY2VcbiAgWzB4MTVmMzksIDB4NzgsIDB4NzBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZS9leGl0IGluIGdvYSB2YWxsZXlcbiAgWzB4MTVmNDAsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNWY2MSwgMHg4ZCwgMHhmZl0sXG4gIFsweDE1ZjY1LCAweDhkLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBsb3dlciBlbnRyYW5jZVxuICBbMHgxNjNmZCwgMHg0OCwgMHg0MF0sXG4gIC8vIE5vcm1hbGl6ZSBzaHlyb24gZm9ydHJlc3MgZW50cmFuY2VcbiAgWzB4MTY0MDMsIDB4NTUsIDB4NTBdLFxuICAvLyBOb3JtYWxpemUgZ29hIHNvdXRoIGVudHJhbmNlXG4gIFsweDE2NDViLCAweGQ4LCAweGRmXSxcbiAgLy8gRml4IHBhdHRlcm4gdGFibGUgZm9yIGRlc2VydCAxIChhbmltYXRpb24gZ2xvc3NlcyBvdmVyIGl0KVxuICBbMHgxNjRjYywgMHgwNCwgMHgyMF0sXG4gIC8vIEZpeCBnYXJiYWdlIGF0IGJvdHRvbSBvZiBvYXNpcyBjYXZlIG1hcCAoaXQncyA4eDExLCBub3QgOHgxMiA9PiBmaXggaGVpZ2h0KVxuICBbMHgxNjRmZiwgMHgwYiwgMHgwYV0sXG4gIC8vIE5vcm1hbGl6ZSBzYWhhcmEgZW50cmFuY2UvZXhpdCBwb3NpdGlvblxuICBbMHgxNjYwZCwgMHgyMCwgMHgzMF0sXG4gIFsweDE2NjI0LCAweDAxLCAweDAyXSxcbiAgWzB4MTY2MjgsIDB4MDEsIDB4MDJdLFxuICAvLyBSZW1vdmUgdW51c2VkIHNjcmVlbnMgZnJvbSBtYWRvMiBhcmVhXG4gIFsweDE2ZGIwLCAweDlhLCAweDgwXSxcbiAgWzB4MTZkYjQsIDB4OWUsIDB4ODBdLFxuICBbMHgxNmRiOCwgMHg5MSwgMHg4MF0sXG4gIFsweDE2ZGJjLCAweDllLCAweDgwXSxcbiAgWzB4MTZkYzAsIDB4OTEsIDB4ODBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZSBpbiB1bnVzZWQgbWFkbzIgYXJlYVxuICBbMHgxNmRlOCwgMHgwMCwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBtYWRvMi1zaWRlIGhlY2t3YXkgZW50cmFuY2VcbiAgWzB4MTZkZWQsIDB4ZGYsIDB4ZDBdLFxuICAvLyBGaXggYm9ndXMgZXhpdHMgaW4gdW51c2VkIG1hZG8yIGFyZWFcbiAgLy8gKGV4aXRzIDIgYW5kIDMgYXJlIGJhZCwgc28gbW92ZSA0IGFuZCA1IG9uIHRvcCBvZiB0aGVtKVxuICBbMHgxNmRmOCwgMHgwYywgMHg1Y10sXG4gIFsweDE2ZGY5LCAweGIwLCAweGI5XSxcbiAgWzB4MTZkZmEsIDB4MDAsIDB4MDJdLFxuICBbMHgxNmRmYywgMHgwYywgMHg1Y10sXG4gIFsweDE2ZGZkLCAweGIwLCAweGI5XSxcbiAgWzB4MTZkZmUsIDB4MDAsIDB4MDJdLFxuICBbMHgxNmRmZiwgMHgwNywgMHhmZl0sXG4gIC8vIEFsc28gcmVtb3ZlIHRoZSBiYWQgZW50cmFuY2VzL2V4aXRzIG9uIHRoZSBhc2luYSB2ZXJzaW9uXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gcG9ydG9hXG4gIFsweDE2ZTVkLCAweDAyLCAweGZmXSxcbiAgWzB4MTZlNmEsIDB4YWQsIDB4ZmZdLFxuICBbMHgxNmU2ZSwgMHhhZCwgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlL2V4aXQgaW4gbm9uLWtlbnN1IHNpZGUgb2Yga2FybWluZSA1LlxuICBbMHgxNzAwMSwgMHgwMiwgMHhmZl0sXG4gIFsweDE3MDJlLCAweGI3LCAweGZmXSxcbiAgWzB4MTcwMzIsIDB4YjcsIDB4ZmZdLFxuICAvLyBNYXJrIHVudXNlZCBlbnRyYW5jZXMvZXhpdHMgaW4ga2Vuc3Ugc2lkZSBvZiBrYXJtaW5lIDUuXG4gIFsweDE3MGFiLCAweDAzLCAweGZmXSxcbiAgWzB4MTcwYWYsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNzBiMywgMHgwNSwgMHhmZl0sXG4gIFsweDE3MGI3LCAweDA2LCAweGZmXSxcbiAgWzB4MTcwYmIsIDB4MDAsIDB4ZmZdLFxuICBbMHgxNzBjNCwgMHhiMiwgMHhmZl0sXG4gIFsweDE3MGM4LCAweGIyLCAweGZmXSxcbiAgWzB4MTcwY2MsIDB4YjEsIDB4ZmZdLFxuICBbMHgxNzBkMCwgMHhiMSwgMHhmZl0sXG4gIFsweDE3MGQ0LCAweGIzLCAweGZmXSxcbiAgWzB4MTcwZDgsIDB4YjMsIDB4ZmZdLFxuICBbMHgxNzBkYywgMHhiNSwgMHhmZl0sXG4gIFsweDE3MGUwLCAweGI1LCAweGZmXSxcbiAgWzB4MTcwZTQsIDB4YjUsIDB4ZmZdLFxuICBbMHgxNzBlOCwgMHhiNSwgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlcyBpbiBcbiAgLy8gTm9ybWFsaXplIGFyeWxsaXMgZW50cmFuY2VcbiAgWzB4MTc0ZWUsIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgam9lbCBzaGVkIGJvdHRvbSBhbmQgc2VjcmV0IHBhc3NhZ2UgZW50cmFuY2VzXG4gIFsweDE3N2MxLCAweDg4LCAweDgwXSxcbiAgWzB4MTc3YzUsIDB4OTgsIDB4YTBdLFxuICBbMHgxNzdjNywgMHg1OCwgMHg1MF0sXG4gIC8vIEZpeCBiYWQgbXVzaWMgaW4gem9tYmlldG93biBob3VzZXM6ICQxMCBzaG91bGQgYmUgJDAxLlxuICBbMHgxNzgyYSwgMHgxMCwgMHgwMV0sXG4gIFsweDE3ODU3LCAweDEwLCAweDAxXSxcbiAgLy8gTm9ybWFsaXplIHN3YW4gZGFuY2UgaGFsbCBlbnRyYW5jZSB0byBiZSBjb25zaXN0ZW50IHdpdGggc3RvbSdzIGhvdXNlXG4gIFsweDE3OTU0LCAweDgwLCAweDc4XSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBkb2pvIGVudHJhbmNlIHRvIGJlIGNvbnNpc3RlbnQgd2l0aCBzdG9tJ3MgaG91c2VcbiAgWzB4MTc5YTIsIDB4ODAsIDB4NzhdLFxuICAvLyBGaXggYmFkIHNjcmVlbnMgaW4gdG93ZXJcbiAgWzB4MTdiOGEsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAxXG4gIFsweDE3YjkwLCAweDAwLCAweDQwXSxcbiAgWzB4MTdiY2UsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAyXG4gIFsweDE3YmQ0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjMGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAzXG4gIFsweDE3YzE0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjNGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciA0XG4gIFsweDE3YzU0LCAweDAwLCAweDQwXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBNdCBIeWRyYSAobWFrZSBpdCBhbiBleHRyYSBwdWRkbGUpLlxuICBbMHgxOWYwMiwgMHg0MCwgMHg4MF0sXG4gIFsweDE5ZjAzLCAweDMzLCAweDMyXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBTYWJlcmEgMidzIGxldmVsIChwcm9iYWJseSBtZWFudCB0byBiZSBhIGZsYWlsIGd1eSkuXG4gIFsweDFhMWUwLCAweDQwLCAweGMwXSwgLy8gbWFrZSBzdXJlIHRvIGZpeCBwYXR0ZXJuIHNsb3QsIHRvbyFcbiAgWzB4MWExZTEsIDB4M2QsIDB4MzRdLFxuICAvLyBQb2ludCBBbWF6b25lcyBvdXRlciBndWFyZCB0byBwb3N0LW92ZXJmbG93IG1lc3NhZ2UgdGhhdCdzIGFjdHVhbGx5IHNob3duLlxuICBbMHgxY2YwNSwgMHg0NywgMHg0OF0sXG4gIC8vIFJlbW92ZSBzdHJheSBmbGlnaHQgZ3JhbnRlciBpbiBab21iaWV0b3duLlxuICBbMHgxZDMxMSwgMHgyMCwgMHhhMF0sXG4gIFsweDFkMzEyLCAweDMwLCAweDAwXSxcbiAgLy8gRml4IHF1ZWVuJ3MgZGlhbG9nIHRvIHRlcm1pbmF0ZSBvbiBsYXN0IGl0ZW0sIHJhdGhlciB0aGFuIG92ZXJmbG93LFxuICAvLyBzbyB0aGF0IHdlIGRvbid0IHBhcnNlIGdhcmJhZ2UuXG4gIFsweDFjZmY5LCAweDYwLCAweGUwXSxcbiAgLy8gRml4IEFtYXpvbmVzIG91dGVyIGd1YXJkIG1lc3NhZ2UgdG8gbm90IG92ZXJmbG93LlxuICBbMHgyY2E5MCwgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCBzZWVtaW5nbHktdW51c2VkIGtlbnN1IG1lc3NhZ2UgMWQ6MTcgb3ZlcmZsb3dpbmcgaW50byAxZDoxOFxuICBbMHgyZjU3MywgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCB1bnVzZWQga2FybWluZSB0cmVhc3VyZSBjaGVzdCBtZXNzYWdlIDIwOjE4LlxuICBbMHgyZmFlNCwgMHg1ZiwgMHgwMF0sXG5dIGFzIGNvbnN0O1xuIl19