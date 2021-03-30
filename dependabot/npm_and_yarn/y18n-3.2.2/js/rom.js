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
import { Pattern } from './rom/pattern.js';
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
        this.patterns = seq(this.chr.length >> 4, i => new Pattern(this, i));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQWMsWUFBWSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDbEMsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRXBELE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFB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SSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxD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SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUdyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUdyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0NBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7QXNzZW1ibGVyfSBmcm9tICcuL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vYXNtL2Fzc2VtYmxlci5qcyc7XG5pbXBvcnQge0xpbmtlcn0gZnJvbSAnLi9hc20vbGlua2VyLmpzJztcbmltcG9ydCB7TW9kdWxlfSBmcm9tICcuL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtBZEhvY1NwYXdufSBmcm9tICcuL3JvbS9hZGhvY3NwYXduLmpzJztcbi8vaW1wb3J0IHtBcmVhc30gZnJvbSAnLi9yb20vYXJlYS5qcyc7XG5pbXBvcnQge0Jvc3NLaWxsfSBmcm9tICcuL3JvbS9ib3Nza2lsbC5qcyc7XG5pbXBvcnQge0Jvc3Nlc30gZnJvbSAnLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7Q29pbkRyb3BzfSBmcm9tICcuL3JvbS9jb2luZHJvcHMuanMnO1xuaW1wb3J0IHtGbGFnc30gZnJvbSAnLi9yb20vZmxhZ3MuanMnO1xuaW1wb3J0IHtIaXRib3h9IGZyb20gJy4vcm9tL2hpdGJveC5qcyc7XG5pbXBvcnQge0l0ZW1zfSBmcm9tICcuL3JvbS9pdGVtLmpzJztcbmltcG9ydCB7SXRlbUdldHN9IGZyb20gJy4vcm9tL2l0ZW1nZXQuanMnO1xuaW1wb3J0IHtMb2NhdGlvbnN9IGZyb20gJy4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZXN9IGZyb20gJy4vcm9tL21lc3NhZ2VzLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbnN9IGZyb20gJy4vcm9tL21ldGFzY3JlZW5zLmpzJztcbmltcG9ydCB7TWV0YXNwcml0ZX0gZnJvbSAnLi9yb20vbWV0YXNwcml0ZS5qcyc7XG5pbXBvcnQge01ldGF0aWxlc2V0LCBNZXRhdGlsZXNldHN9IGZyb20gJy4vcm9tL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9yb20vbW9uc3Rlci5qcyc7XG5pbXBvcnQge05wY3N9IGZyb20gJy4vcm9tL25wYy5qcyc7XG5pbXBvcnQge09iamVjdEFjdGlvbnN9IGZyb20gJy4vcm9tL29iamVjdGFjdGlvbi5qcyc7XG5pbXBvcnQge09iamVjdERhdGF9IGZyb20gJy4vcm9tL29iamVjdGRhdGEuanMnO1xuaW1wb3J0IHtPYmplY3RzfSBmcm9tICcuL3JvbS9vYmplY3RzLmpzJztcbmltcG9ydCB7Um9tT3B0aW9ufSBmcm9tICcuL3JvbS9vcHRpb24uanMnO1xuaW1wb3J0IHtQYWxldHRlfSBmcm9tICcuL3JvbS9wYWxldHRlLmpzJztcbmltcG9ydCB7UGF0dGVybn0gZnJvbSAnLi9yb20vcGF0dGVybi5qcyc7XG5pbXBvcnQge1JhbmRvbU51bWJlcnN9IGZyb20gJy4vcm9tL3JhbmRvbW51bWJlcnMuanMnO1xuaW1wb3J0IHtTY2FsaW5nfSBmcm9tICcuL3JvbS9zY2FsaW5nLmpzJztcbmltcG9ydCB7U2NyZWVuLCBTY3JlZW5zfSBmcm9tICcuL3JvbS9zY3JlZW4uanMnO1xuaW1wb3J0IHtTaG9wc30gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge1Nsb3RzfSBmcm9tICcuL3JvbS9zbG90cy5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtUZWxlcGF0aHl9IGZyb20gJy4vcm9tL3RlbGVwYXRoeS5qcyc7XG5pbXBvcnQge1RpbGVBbmltYXRpb259IGZyb20gJy4vcm9tL3RpbGVhbmltYXRpb24uanMnO1xuaW1wb3J0IHtUaWxlRWZmZWN0c30gZnJvbSAnLi9yb20vdGlsZWVmZmVjdHMuanMnO1xuaW1wb3J0IHtUaWxlc2V0c30gZnJvbSAnLi9yb20vdGlsZXNldC5qcyc7XG5pbXBvcnQge1Rvd25XYXJwfSBmcm9tICcuL3JvbS90b3dud2FycC5qcyc7XG5pbXBvcnQge1RyaWdnZXJ9IGZyb20gJy4vcm9tL3RyaWdnZXIuanMnO1xuaW1wb3J0IHtTZWdtZW50LCBoZXgsIHNlcSwgZnJlZX0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1dpbGRXYXJwfSBmcm9tICcuL3JvbS93aWxkd2FycC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi91bmlvbmZpbmQuanMnO1xuXG5jb25zdCB7JDBlLCAkMGYsICQxMH0gPSBTZWdtZW50O1xuXG4vLyBBIGtub3duIGxvY2F0aW9uIGZvciBkYXRhIGFib3V0IHN0cnVjdHVyYWwgY2hhbmdlcyB3ZSd2ZSBtYWRlIHRvIHRoZSByb20uXG4vLyBUaGUgdHJpY2sgaXMgdG8gZmluZCBhIHN1aXRhYmxlIHJlZ2lvbiBvZiBST00gdGhhdCdzIGJvdGggdW51c2VkICphbmQqXG4vLyBpcyBub3QgcGFydGljdWxhcmx5ICp1c2FibGUqIGZvciBvdXIgcHVycG9zZXMuICBUaGUgYm90dG9tIDMgcm93cyBvZiB0aGVcbi8vIHZhcmlvdXMgc2luZ2xlLXNjcmVlbiBtYXBzIGFyZSBhbGwgZWZmZWN0aXZlbHkgdW51c2VkLCBzbyB0aGF0IGdpdmVzIDQ4XG4vLyBieXRlcyBwZXIgbWFwLiAgU2hvcHMgKDE0MDAwLi4xNDJmZikgYWxzbyBoYXZlIGEgZ2lhbnQgYXJlYSB1cCB0b3AgdGhhdFxuLy8gY291bGQgcG9zc2libHkgYmUgdXNhYmxlLCB0aG91Z2ggd2UnZCBuZWVkIHRvIHRlYWNoIHRoZSB0aWxlLXJlYWRpbmcgY29kZVxuLy8gdG8gaWdub3JlIHdoYXRldmVyJ3Mgd3JpdHRlbiB0aGVyZSwgc2luY2UgaXQgKmlzKiB2aXNpYmxlIGJlZm9yZSB0aGUgbWVudVxuLy8gcG9wcyB1cC4gIFRoZXNlIGFyZSBiaWcgZW5vdWdoIHJlZ2lvbnMgdGhhdCB3ZSBjb3VsZCBldmVuIGNvbnNpZGVyIHVzaW5nXG4vLyB0aGVtIHZpYSBwYWdlLXN3YXBwaW5nIHRvIGdldCBleHRyYSBkYXRhIGluIGFyYml0cmFyeSBjb250ZXh0cy5cblxuLy8gU2hvcHMgYXJlIHBhcnRpY3VsYXJseSBuaWNlIGJlY2F1c2UgdGhleSdyZSBhbGwgMDAgaW4gdmFuaWxsYS5cbi8vIE90aGVyIHBvc3NpYmxlIHJlZ2lvbnM6XG4vLyAgIC0gNDggYnl0ZXMgYXQgJGZmYzAgKG1lemFtZSBzaHJpbmUpID0+ICRmZmUwIGlzIGFsbCAkZmYgaW4gdmFuaWxsYS5cblxuZXhwb3J0IGNsYXNzIFJvbSB7XG5cbiAgLy8gVGhlc2UgdmFsdWVzIGNhbiBiZSBxdWVyaWVkIHRvIGRldGVybWluZSBob3cgdG8gcGFyc2UgYW55IGdpdmVuIHJvbS5cbiAgLy8gVGhleSdyZSBhbGwgYWx3YXlzIHplcm8gZm9yIHZhbmlsbGFcbiAgc3RhdGljIHJlYWRvbmx5IE9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVggICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDApO1xuICBzdGF0aWMgcmVhZG9ubHkgT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYICAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMSk7XG4gIHN0YXRpYyByZWFkb25seSBDT01QUkVTU0VEX01BUERBVEEgICAgICAgICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfQ09VTlQgICAgICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMxKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNDQUxJTkdfTEVWRUxTICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFVOSVFVRV9JVEVNX1RBQkxFICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQwKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfREFUQV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQzKTtcbiAgc3RhdGljIHJlYWRvbmx5IFRFTEVQQVRIWV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQ2KTtcblxuICByZWFkb25seSBwcmc6IFVpbnQ4QXJyYXk7XG4gIHJlYWRvbmx5IGNocjogVWludDhBcnJheTtcblxuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBlbGltaW5hdGUgdGhlIGR1cGxpY2F0aW9uIGJ5IG1vdmluZ1xuICAvLyB0aGUgY3RvcnMgaGVyZSwgYnV0IHRoZXJlJ3MgbG90cyBvZiBwcmVyZXFzIGFuZCBkZXBlbmRlbmN5XG4gIC8vIG9yZGVyaW5nLCBhbmQgd2UgbmVlZCB0byBtYWtlIHRoZSBBREpVU1RNRU5UUywgZXRjLlxuICAvL3JlYWRvbmx5IGFyZWFzOiBBcmVhcztcbiAgcmVhZG9ubHkgc2NyZWVuczogU2NyZWVucztcbiAgcmVhZG9ubHkgdGlsZXNldHM6IFRpbGVzZXRzO1xuICByZWFkb25seSB0aWxlRWZmZWN0czogVGlsZUVmZmVjdHNbXTtcbiAgcmVhZG9ubHkgdHJpZ2dlcnM6IFRyaWdnZXJbXTtcbiAgcmVhZG9ubHkgcGF0dGVybnM6IFBhdHRlcm5bXTtcbiAgcmVhZG9ubHkgcGFsZXR0ZXM6IFBhbGV0dGVbXTtcbiAgcmVhZG9ubHkgbG9jYXRpb25zOiBMb2NhdGlvbnM7XG4gIHJlYWRvbmx5IHRpbGVBbmltYXRpb25zOiBUaWxlQW5pbWF0aW9uW107XG4gIHJlYWRvbmx5IGhpdGJveGVzOiBIaXRib3hbXTtcbiAgcmVhZG9ubHkgb2JqZWN0QWN0aW9uczogT2JqZWN0QWN0aW9ucztcbiAgcmVhZG9ubHkgb2JqZWN0czogT2JqZWN0cztcbiAgcmVhZG9ubHkgYWRIb2NTcGF3bnM6IEFkSG9jU3Bhd25bXTtcbiAgcmVhZG9ubHkgbWV0YXNjcmVlbnM6IE1ldGFzY3JlZW5zO1xuICByZWFkb25seSBtZXRhc3ByaXRlczogTWV0YXNwcml0ZVtdO1xuICByZWFkb25seSBtZXRhdGlsZXNldHM6IE1ldGF0aWxlc2V0cztcbiAgcmVhZG9ubHkgaXRlbUdldHM6IEl0ZW1HZXRzO1xuICByZWFkb25seSBpdGVtczogSXRlbXM7XG4gIHJlYWRvbmx5IHNob3BzOiBTaG9wcztcbiAgcmVhZG9ubHkgc2xvdHM6IFNsb3RzO1xuICByZWFkb25seSBucGNzOiBOcGNzO1xuICByZWFkb25seSBib3NzS2lsbHM6IEJvc3NLaWxsW107XG4gIHJlYWRvbmx5IGJvc3NlczogQm9zc2VzO1xuICByZWFkb25seSB3aWxkV2FycDogV2lsZFdhcnA7XG4gIHJlYWRvbmx5IHRvd25XYXJwOiBUb3duV2FycDtcbiAgcmVhZG9ubHkgZmxhZ3M6IEZsYWdzO1xuICByZWFkb25seSBjb2luRHJvcHM6IENvaW5Ecm9wcztcbiAgcmVhZG9ubHkgc2NhbGluZzogU2NhbGluZztcbiAgcmVhZG9ubHkgcmFuZG9tTnVtYmVyczogUmFuZG9tTnVtYmVycztcblxuICByZWFkb25seSB0ZWxlcGF0aHk6IFRlbGVwYXRoeTtcbiAgcmVhZG9ubHkgbWVzc2FnZXM6IE1lc3NhZ2VzO1xuXG4gIHJlYWRvbmx5IG1vZHVsZXM6IE1vZHVsZVtdID0gW107XG5cbiAgc3BvaWxlcj86IFNwb2lsZXI7XG5cbiAgLy8gTk9URTogVGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzIG1heSBiZSBjaGFuZ2VkIGJldHdlZW4gcmVhZGluZyBhbmQgd3JpdGluZ1xuICAvLyB0aGUgcm9tLiAgSWYgdGhpcyBoYXBwZW5zLCB0aGUgd3JpdHRlbiByb20gd2lsbCBoYXZlIGRpZmZlcmVudCBvcHRpb25zLlxuICAvLyBUaGlzIGlzIGFuIGVmZmVjdGl2ZSB3YXkgdG8gY29udmVydCBiZXR3ZWVuIHR3byBzdHlsZXMuXG5cbiAgLy8gTWF4IG51bWJlciBvZiBzaG9wcy4gIFZhcmlvdXMgYmxvY2tzIG9mIG1lbW9yeSByZXF1aXJlIGtub3dpbmcgdGhpcyBudW1iZXJcbiAgLy8gdG8gYWxsb2NhdGUuXG4gIHNob3BDb3VudDogbnVtYmVyO1xuICAvLyBOdW1iZXIgb2Ygc2NhbGluZyBsZXZlbHMuICBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIHRoZSBzY2FsaW5nIHRhYmxlcy5cbiAgc2NhbGluZ0xldmVsczogbnVtYmVyO1xuXG4gIC8vIEFkZHJlc3MgdG8gcmVhZC93cml0ZSB0aGUgYml0ZmllbGQgaW5kaWNhdGluZyB1bmlxdWUgaXRlbXMuXG4gIHVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3M6IG51bWJlcjtcbiAgLy8gQWRkcmVzcyBvZiBub3JtYWxpemVkIHByaWNlcyB0YWJsZSwgaWYgcHJlc2VudC4gIElmIHRoaXMgaXMgYWJzZW50IHRoZW4gd2VcbiAgLy8gYXNzdW1lIHByaWNlcyBhcmUgbm90IG5vcm1hbGl6ZWQgYW5kIGFyZSBhdCB0aGUgbm9ybWFsIHBhd24gc2hvcCBhZGRyZXNzLlxuICBzaG9wRGF0YVRhYmxlc0FkZHJlc3M6IG51bWJlcjtcbiAgLy8gQWRkcmVzcyBvZiByZWFycmFuZ2VkIHRlbGVwYXRoeSB0YWJsZXMuXG4gIHRlbGVwYXRoeVRhYmxlc0FkZHJlc3M6IG51bWJlcjtcbiAgLy8gV2hldGhlciB0aGUgdHJhaWxpbmcgJGZmIHNob3VsZCBiZSBvbWl0dGVkIGZyb20gdGhlIEl0ZW1HZXREYXRhIHRhYmxlLlxuICBvbWl0SXRlbUdldERhdGFTdWZmaXg6IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdGhlIHRyYWlsaW5nIGJ5dGUgb2YgZWFjaCBMb2NhbERpYWxvZyBpcyBvbWl0dGVkLiAgVGhpcyBhZmZlY3RzXG4gIC8vIGJvdGggcmVhZGluZyBhbmQgd3JpdGluZyB0aGUgdGFibGUuICBNYXkgYmUgaW5mZXJyZWQgd2hpbGUgcmVhZGluZy5cbiAgb21pdExvY2FsRGlhbG9nU3VmZml4OiBib29sZWFuO1xuICAvLyBXaGV0aGVyIG1hcGRhdGEgaGFzIGJlZW4gY29tcHJlc3NlZC5cbiAgY29tcHJlc3NlZE1hcERhdGE6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Iocm9tOiBVaW50OEFycmF5KSB7XG4gICAgY29uc3QgcHJnU2l6ZSA9IHJvbVs0XSAqIDB4NDAwMDtcbiAgICAvLyBOT1RFOiBjaHJTaXplID0gcm9tWzVdICogMHgyMDAwO1xuICAgIGNvbnN0IHByZ1N0YXJ0ID0gMHgxMCArIChyb21bNl0gJiA0ID8gNTEyIDogMCk7XG4gICAgY29uc3QgcHJnRW5kID0gcHJnU3RhcnQgKyBwcmdTaXplO1xuICAgIHRoaXMucHJnID0gcm9tLnN1YmFycmF5KHByZ1N0YXJ0LCBwcmdFbmQpO1xuICAgIHRoaXMuY2hyID0gcm9tLnN1YmFycmF5KHByZ0VuZCk7XG5cbiAgICB0aGlzLnNob3BDb3VudCA9IFJvbS5TSE9QX0NPVU5ULmdldChyb20pO1xuICAgIHRoaXMuc2NhbGluZ0xldmVscyA9IFJvbS5TQ0FMSU5HX0xFVkVMUy5nZXQocm9tKTtcbiAgICB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBSb20uVU5JUVVFX0lURU1fVEFCTEUuZ2V0KHJvbSk7XG4gICAgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgPSBSb20uU0hPUF9EQVRBX1RBQkxFUy5nZXQocm9tKTtcbiAgICB0aGlzLnRlbGVwYXRoeVRhYmxlc0FkZHJlc3MgPSBSb20uVEVMRVBBVEhZX1RBQkxFUy5nZXQocm9tKTtcbiAgICB0aGlzLm9taXRJdGVtR2V0RGF0YVN1ZmZpeCA9IFJvbS5PTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYLmdldChyb20pO1xuICAgIHRoaXMub21pdExvY2FsRGlhbG9nU3VmZml4ID0gUm9tLk9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWC5nZXQocm9tKTtcbiAgICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gUm9tLkNPTVBSRVNTRURfTUFQREFUQS5nZXQocm9tKTtcblxuICAgIC8vIGlmIChjcmMzMihyb20pID09PSBFWFBFQ1RFRF9DUkMzMikge1xuICAgIGZvciAoY29uc3QgW2FkZHJlc3MsIG9sZCwgdmFsdWVdIG9mIEFESlVTVE1FTlRTKSB7XG4gICAgICBpZiAodGhpcy5wcmdbYWRkcmVzc10gPT09IG9sZCkgdGhpcy5wcmdbYWRkcmVzc10gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBMb2FkIHVwIGEgYnVuY2ggb2YgZGF0YSB0YWJsZXMuICBUaGlzIHdpbGwgaW5jbHVkZSBhIGxhcmdlIG51bWJlciBvZiB0aGVcbiAgICAvLyBkYXRhIHRhYmxlcyBpbiB0aGUgUk9NLiAgVGhlIGlkZWEgaXMgdGhhdCB3ZSBjYW4gZWRpdCB0aGUgYXJyYXlzIGxvY2FsbHlcbiAgICAvLyBhbmQgdGhlbiBoYXZlIGEgXCJjb21taXRcIiBmdW5jdGlvbiB0aGF0IHJlYnVpbGRzIHRoZSBST00gd2l0aCB0aGUgbmV3XG4gICAgLy8gYXJyYXlzLiAgV2UgbWF5IG5lZWQgdG8gd3JpdGUgYSBcInBhZ2VkIGFsbG9jYXRvclwiIHRoYXQgY2FuIGFsbG9jYXRlXG4gICAgLy8gY2h1bmtzIG9mIFJPTSBpbiBhIGdpdmVuIHBhZ2UuICBQcm9iYWJseSB3YW50IHRvIHVzZSBhIGdyZWVkeSBhbGdvcml0aG1cbiAgICAvLyB3aGVyZSB3ZSBzdGFydCB3aXRoIHRoZSBiaWdnZXN0IGNodW5rIGFuZCBwdXQgaXQgaW4gdGhlIHNtYWxsZXN0IHNwb3RcbiAgICAvLyB0aGF0IGZpdHMgaXQuICBQcmVzdW1hYmx5IHdlIGtub3cgdGhlIHNpemVzIHVwIGZyb250IGV2ZW4gYmVmb3JlIHdlIGhhdmVcbiAgICAvLyBhbGwgdGhlIGFkZHJlc3Nlcywgc28gd2UgY291bGQgZG8gYWxsIHRoZSBhbGxvY2F0aW9uIGF0IG9uY2UgLSBwcm9iYWJseVxuICAgIC8vIHJldHVybmluZyBhIHRva2VuIGZvciBlYWNoIGFsbG9jYXRpb24gYW5kIHRoZW4gYWxsIHRva2VucyBnZXQgZmlsbGVkIGluXG4gICAgLy8gYXQgb25jZSAoYWN0dWFsIHByb21pc2VzIHdvdWxkIGJlIG1vcmUgdW53ZWlsZHkpLlxuICAgIC8vIFRyaWNreSAtIHdoYXQgYWJvdXQgc2hhcmVkIGVsZW1lbnRzIG9mIGRhdGEgdGFibGVzIC0gd2UgcHVsbCB0aGVtXG4gICAgLy8gc2VwYXJhdGVseSwgYnV0IHdlJ2xsIG5lZWQgdG8gcmUtY29hbGVzY2UgdGhlbS4gIEJ1dCB0aGlzIHJlcXVpcmVzXG4gICAgLy8ga25vd2luZyB0aGVpciBjb250ZW50cyBCRUZPUkUgYWxsb2NhdGluZyB0aGVpciBzcGFjZS4gIFNvIHdlIG5lZWQgdHdvXG4gICAgLy8gYWxsb2NhdGUgbWV0aG9kcyAtIG9uZSB3aGVyZSB0aGUgY29udGVudCBpcyBrbm93biBhbmQgb25lIHdoZXJlIG9ubHkgdGhlXG4gICAgLy8gbGVuZ3RoIGlzIGtub3duLlxuICAgIHRoaXMudGlsZXNldHMgPSBuZXcgVGlsZXNldHModGhpcyk7XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHNlcSgxMSwgaSA9PiBuZXcgVGlsZUVmZmVjdHModGhpcywgaSArIDB4YjMpKTtcbiAgICB0aGlzLnNjcmVlbnMgPSBuZXcgU2NyZWVucyh0aGlzKTtcbiAgICB0aGlzLm1ldGF0aWxlc2V0cyA9IG5ldyBNZXRhdGlsZXNldHModGhpcyk7XG4gICAgdGhpcy5tZXRhc2NyZWVucyA9IG5ldyBNZXRhc2NyZWVucyh0aGlzKTtcbiAgICB0aGlzLnRyaWdnZXJzID0gc2VxKDB4NDMsIGkgPT4gbmV3IFRyaWdnZXIodGhpcywgMHg4MCB8IGkpKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gc2VxKHRoaXMuY2hyLmxlbmd0aCA+PiA0LCBpID0+IG5ldyBQYXR0ZXJuKHRoaXMsIGkpKTtcbiAgICB0aGlzLnBhbGV0dGVzID0gc2VxKDB4MTAwLCBpID0+IG5ldyBQYWxldHRlKHRoaXMsIGkpKTtcbiAgICB0aGlzLmxvY2F0aW9ucyA9IG5ldyBMb2NhdGlvbnModGhpcyk7XG4gICAgdGhpcy50aWxlQW5pbWF0aW9ucyA9IHNlcSg0LCBpID0+IG5ldyBUaWxlQW5pbWF0aW9uKHRoaXMsIGkpKTtcbiAgICB0aGlzLmhpdGJveGVzID0gc2VxKDI0LCBpID0+IG5ldyBIaXRib3godGhpcywgaSkpO1xuICAgIHRoaXMub2JqZWN0QWN0aW9ucyA9IG5ldyBPYmplY3RBY3Rpb25zKHRoaXMpO1xuICAgIHRoaXMub2JqZWN0cyA9IG5ldyBPYmplY3RzKHRoaXMpO1xuICAgIHRoaXMuYWRIb2NTcGF3bnMgPSBzZXEoMHg2MCwgaSA9PiBuZXcgQWRIb2NTcGF3bih0aGlzLCBpKSk7XG4gICAgdGhpcy5tZXRhc3ByaXRlcyA9IHNlcSgweDEwMCwgaSA9PiBuZXcgTWV0YXNwcml0ZSh0aGlzLCBpKSk7XG4gICAgdGhpcy5tZXNzYWdlcyA9IG5ldyBNZXNzYWdlcyh0aGlzKTtcbiAgICB0aGlzLnRlbGVwYXRoeSA9IG5ldyBUZWxlcGF0aHkodGhpcyk7XG4gICAgdGhpcy5pdGVtR2V0cyA9IG5ldyBJdGVtR2V0cyh0aGlzKTtcbiAgICB0aGlzLml0ZW1zID0gbmV3IEl0ZW1zKHRoaXMpO1xuICAgIHRoaXMuc2hvcHMgPSBuZXcgU2hvcHModGhpcyk7IC8vIE5PVEU6IGRlcGVuZHMgb24gbG9jYXRpb25zIGFuZCBvYmplY3RzXG4gICAgdGhpcy5zbG90cyA9IG5ldyBTbG90cyh0aGlzKTtcbiAgICB0aGlzLm5wY3MgPSBuZXcgTnBjcyh0aGlzKTtcbiAgICB0aGlzLmJvc3NLaWxscyA9IHNlcSgweGUsIGkgPT4gbmV3IEJvc3NLaWxsKHRoaXMsIGkpKTtcbiAgICB0aGlzLndpbGRXYXJwID0gbmV3IFdpbGRXYXJwKHRoaXMpO1xuICAgIHRoaXMudG93bldhcnAgPSBuZXcgVG93bldhcnAodGhpcyk7XG4gICAgdGhpcy5jb2luRHJvcHMgPSBuZXcgQ29pbkRyb3BzKHRoaXMpO1xuICAgIHRoaXMuZmxhZ3MgPSBuZXcgRmxhZ3ModGhpcyk7XG4gICAgdGhpcy5ib3NzZXMgPSBuZXcgQm9zc2VzKHRoaXMpOyAvLyBOT1RFOiBtdXN0IGJlIGFmdGVyIE5wY3MgYW5kIEZsYWdzXG4gICAgdGhpcy5zY2FsaW5nID0gbmV3IFNjYWxpbmcodGhpcyk7XG4gICAgdGhpcy5yYW5kb21OdW1iZXJzID0gbmV3IFJhbmRvbU51bWJlcnModGhpcyk7XG5cbiAgICAvLyAvLyBUT0RPIC0gY29uc2lkZXIgcG9wdWxhdGluZyB0aGlzIGxhdGVyP1xuICAgIC8vIC8vIEhhdmluZyB0aGlzIGF2YWlsYWJsZSBtYWtlcyBpdCBlYXNpZXIgdG8gc2V0IGV4aXRzLCBldGMuXG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmIChsb2MudXNlZCkgbG9jLmxhenlJbml0aWFsaXphdGlvbigpOyAvLyB0cmlnZ2VyIHRoZSBnZXR0ZXJcbiAgICB9XG4gIH1cblxuICB0cmlnZ2VyKGlkOiBudW1iZXIpOiBUcmlnZ2VyIHtcbiAgICBpZiAoaWQgPCAweDgwIHx8IGlkID4gMHhmZikgdGhyb3cgbmV3IEVycm9yKGBCYWQgdHJpZ2dlciBpZCAkJHtoZXgoaWQpfWApO1xuICAgIHJldHVybiB0aGlzLnRyaWdnZXJzW2lkICYgMHg3Zl07XG4gIH1cblxuICAvLyBUT0RPIC0gY3Jvc3MtcmVmZXJlbmNlIG1vbnN0ZXJzL21ldGFzcHJpdGVzL21ldGF0aWxlcy9zY3JlZW5zIHdpdGggcGF0dGVybnMvcGFsZXR0ZXNcbiAgLy8gZ2V0IG1vbnN0ZXJzKCk6IE9iamVjdERhdGFbXSB7XG4gIC8vICAgY29uc3QgbW9uc3RlcnMgPSBuZXcgU2V0PE9iamVjdERhdGE+KCk7XG4gIC8vICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gIC8vICAgICBpZiAoIWwudXNlZCB8fCAhbC5oYXNTcGF3bnMpIGNvbnRpbnVlO1xuICAvLyAgICAgZm9yIChjb25zdCBvIG9mIGwuc3Bhd25zKSB7XG4gIC8vICAgICAgIGlmIChvLmlzTW9uc3RlcigpKSBtb25zdGVycy5hZGQodGhpcy5vYmplY3RzW28ubW9uc3RlcklkXSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBbLi4ubW9uc3RlcnNdLnNvcnQoKHgsIHkpID0+ICh4LmlkIC0geS5pZCkpO1xuICAvLyB9XG5cbiAgZ2V0IHByb2plY3RpbGVzKCk6IE9iamVjdERhdGFbXSB7XG4gICAgY29uc3QgcHJvamVjdGlsZXMgPSBuZXcgU2V0PE9iamVjdERhdGE+KCk7XG4gICAgZm9yIChjb25zdCBtIG9mIHRoaXMub2JqZWN0cy5maWx0ZXIobyA9PiBvIGluc3RhbmNlb2YgTW9uc3RlcikpIHtcbiAgICAgIGlmIChtLmNoaWxkKSB7XG4gICAgICAgIHByb2plY3RpbGVzLmFkZCh0aGlzLm9iamVjdHNbdGhpcy5hZEhvY1NwYXduc1ttLmNoaWxkXS5vYmplY3RJZF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gWy4uLnByb2plY3RpbGVzXS5zb3J0KCh4LCB5KSA9PiAoeC5pZCAtIHkuaWQpKTtcbiAgfVxuXG4gIGdldCBtb25zdGVyR3JhcGhpY3MoKSB7XG4gICAgY29uc3QgZ2Z4OiB7W2lkOiBzdHJpbmddOlxuICAgICAgICAgICAgICAgIHtbaW5mbzogc3RyaW5nXTpcbiAgICAgICAgICAgICAgICAge3Nsb3Q6IG51bWJlciwgcGF0OiBudW1iZXIsIHBhbDogbnVtYmVyfX19ID0ge307XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCB8fCAhbC5oYXNTcGF3bnMpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBvIG9mIGwuc3Bhd25zKSB7XG4gICAgICAgIGlmICghKG8uZGF0YVsyXSAmIDcpKSB7XG4gICAgICAgICAgY29uc3Qgc2xvdCA9IG8uZGF0YVsyXSAmIDB4ODAgPyAxIDogMDtcbiAgICAgICAgICBjb25zdCBpZCA9IGhleChvLmRhdGFbM10gKyAweDUwKTtcbiAgICAgICAgICBjb25zdCBkYXRhID0gZ2Z4W2lkXSA9IGdmeFtpZF0gfHwge307XG4gICAgICAgICAgZGF0YVtgJHtzbG90fToke2wuc3ByaXRlUGF0dGVybnNbc2xvdF0udG9TdHJpbmcoMTYpfToke1xuICAgICAgICAgICAgICAgbC5zcHJpdGVQYWxldHRlc1tzbG90XS50b1N0cmluZygxNil9YF1cbiAgICAgICAgICAgID0ge3BhbDogbC5zcHJpdGVQYWxldHRlc1tzbG90XSxcbiAgICAgICAgICAgICAgIHBhdDogbC5zcHJpdGVQYXR0ZXJuc1tzbG90XSxcbiAgICAgICAgICAgICAgIHNsb3QsXG4gICAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGdmeDtcbiAgfVxuXG4gIGdldCBsb2NhdGlvbk1vbnN0ZXJzKCkge1xuICAgIGNvbnN0IG06IHtbaWQ6IHN0cmluZ106IHtbaW5mbzogc3RyaW5nXTogbnVtYmVyfX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gICAgICAvLyB3aGljaCBtb25zdGVycyBhcmUgaW4gd2hpY2ggc2xvdHM/XG4gICAgICBjb25zdCBzOiB7W2luZm86IHN0cmluZ106IG51bWJlcn0gPSBtWyckJyArIGhleChsLmlkKV0gPSB7fTtcbiAgICAgIGZvciAoY29uc3QgbyBvZiBsLnNwYXducykge1xuICAgICAgICBpZiAoIShvLmRhdGFbMl0gJiA3KSkge1xuICAgICAgICAgIGNvbnN0IHNsb3QgPSBvLmRhdGFbMl0gJiAweDgwID8gMSA6IDA7XG4gICAgICAgICAgY29uc3QgaWQgPSBvLmRhdGFbM10gKyAweDUwO1xuICAgICAgICAgIHNbYCR7c2xvdH06JHtpZC50b1N0cmluZygxNil9YF0gPVxuICAgICAgICAgICAgICAoc1tgJHtzbG90fToke2lkLnRvU3RyaW5nKDE2KX1gXSB8fCAwKSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG07XG4gIH1cblxuICAvLyBUT0RPIC0gZm9yIGVhY2ggc3ByaXRlIHBhdHRlcm4gdGFibGUsIGZpbmQgYWxsIHRoZSBwYWxldHRlcyB0aGF0IGl0IHVzZXMuXG4gIC8vIEZpbmQgYWxsIHRoZSBtb25zdGVycyBvbiBpdC4gIFdlIGNhbiBwcm9iYWJseSBhbGxvdyBhbnkgcGFsZXR0ZSBzbyBsb25nXG4gIC8vIGFzIG9uZSBvZiB0aGUgcGFsZXR0ZXMgaXMgdXNlZCB3aXRoIHRoYXQgcGF0dGVybi5cbiAgLy8gVE9ETyAtIG1heCBudW1iZXIgb2YgaW5zdGFuY2VzIG9mIGEgbW9uc3RlciBvbiBhbnkgbWFwIC0gaS5lLiBhdm9pZCBoYXZpbmdcbiAgLy8gZml2ZSBmbHllcnMgb24gdGhlIHNhbWUgbWFwIVxuXG4gIC8vIDQ2MCAtIDAgbWVhbnMgZWl0aGVyIGZseWVyIG9yIHN0YXRpb25hcnlcbiAgLy8gICAgICAgICAgIC0gc3RhdGlvbmFyeSBoYXMgNGEwIH4gMjA0LDIwNSwyMDZcbiAgLy8gICAgICAgICAgICAgKGtyYWtlbiwgc3dhbXAgcGxhbnQsIHNvcmNlcm9yKVxuICAvLyAgICAgICA2IC0gbWltaWNcbiAgLy8gICAgICAgMWYgLSBzd2ltbWVyXG4gIC8vICAgICAgIDU0IC0gdG9tYXRvIGFuZCBiaXJkXG4gIC8vICAgICAgIDU1IC0gc3dpbW1lclxuICAvLyAgICAgICA1NyAtIG5vcm1hbFxuICAvLyAgICAgICA1ZiAtIGFsc28gbm9ybWFsLCBidXQgbWVkdXNhIGhlYWQgaXMgZmx5ZXI/XG4gIC8vICAgICAgIDc3IC0gc29sZGllcnMsIGljZSB6b21iaWVcblxuLy8gICAvLyBEb24ndCB3b3JyeSBhYm91dCBvdGhlciBkYXRhcyB5ZXRcbi8vICAgd3JpdGVPYmplY3REYXRhKCkge1xuLy8gICAgIC8vIGJ1aWxkIHVwIGEgbWFwIGZyb20gYWN0dWFsIGRhdGEgdG8gaW5kZXhlcyB0aGF0IHBvaW50IHRvIGl0XG4vLyAgICAgbGV0IGFkZHIgPSAweDFhZTAwO1xuLy8gICAgIGNvbnN0IGRhdGFzID0ge307XG4vLyAgICAgZm9yIChjb25zdCBvYmplY3Qgb2YgdGhpcy5vYmplY3RzKSB7XG4vLyAgICAgICBjb25zdCBzZXIgPSBvYmplY3Quc2VyaWFsaXplKCk7XG4vLyAgICAgICBjb25zdCBkYXRhID0gc2VyLmpvaW4oJyAnKTtcbi8vICAgICAgIGlmIChkYXRhIGluIGRhdGFzKSB7XG4vLyAvL2NvbnNvbGUubG9nKGAkJHtvYmplY3QuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCl9OiBSZXVzaW5nIGV4aXN0aW5nIGRhdGEgJCR7ZGF0YXNbZGF0YV0udG9TdHJpbmcoMTYpfWApO1xuLy8gICAgICAgICBvYmplY3Qub2JqZWN0RGF0YUJhc2UgPSBkYXRhc1tkYXRhXTtcbi8vICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgIG9iamVjdC5vYmplY3REYXRhQmFzZSA9IGFkZHI7XG4vLyAgICAgICAgIGRhdGFzW2RhdGFdID0gYWRkcjtcbi8vIC8vY29uc29sZS5sb2coYCQke29iamVjdC5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKX06IERhdGEgaXMgYXQgJCR7XG4vLyAvLyAgICAgICAgICAgICBhZGRyLnRvU3RyaW5nKDE2KX06ICR7QXJyYXkuZnJvbShzZXIsIHg9PickJyt4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApKS5qb2luKCcsJyl9YCk7XG4vLyAgICAgICAgIGFkZHIgKz0gc2VyLmxlbmd0aDtcbi8vIC8vIHNlZWQgMzUxNzgxMTAzNlxuLy8gICAgICAgfVxuLy8gICAgICAgb2JqZWN0LndyaXRlKCk7XG4vLyAgICAgfVxuLy8gLy9jb25zb2xlLmxvZyhgV3JvdGUgb2JqZWN0IGRhdGEgZnJvbSAkMWFjMDAgdG8gJCR7YWRkci50b1N0cmluZygxNikucGFkU3RhcnQoNSwgMClcbi8vIC8vICAgICAgICAgICAgIH0sIHNhdmluZyAkezB4MWJlOTEgLSBhZGRyfSBieXRlcy5gKTtcbi8vICAgICByZXR1cm4gYWRkcjtcbi8vICAgfVxuXG4gIGFzc2VtYmxlcigpOiBBc3NlbWJsZXIge1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBzZXR0aW5nIGEgc2VnbWVudCBwcmVmaXhcbiAgICByZXR1cm4gbmV3IEFzc2VtYmxlcigpO1xuICB9XG5cbiAgd3JpdGVEYXRhKGRhdGEgPSB0aGlzLnByZykge1xuICAgIC8vIFdyaXRlIHRoZSBvcHRpb25zIGZpcnN0XG4gICAgLy8gY29uc3Qgd3JpdGVyID0gbmV3IFdyaXRlcih0aGlzLmNocik7XG4gICAgLy8gd3JpdGVyLm1vZHVsZXMucHVzaCguLi50aGlzLm1vZHVsZXMpO1xuICAgIC8vIE1hcERhdGFcbiAgICAvL3dyaXRlci5hbGxvYygweDE0NGY4LCAweDE3ZTAwKTtcbiAgICAvLyBOcGNEYXRhXG4gICAgLy8gTk9URTogMTkzZjkgaXMgYXNzdW1pbmcgJGZiIGlzIHRoZSBsYXN0IGxvY2F0aW9uIElELiAgSWYgd2UgYWRkIG1vcmUgbG9jYXRpb25zIGF0XG4gICAgLy8gdGhlIGVuZCB0aGVuIHdlJ2xsIG5lZWQgdG8gcHVzaCB0aGlzIGJhY2sgYSBmZXcgbW9yZSBieXRlcy4gIFdlIGNvdWxkIHBvc3NpYmx5XG4gICAgLy8gZGV0ZWN0IHRoZSBiYWQgd3JpdGUgYW5kIHRocm93IGFuIGVycm9yLCBhbmQvb3IgY29tcHV0ZSB0aGUgbWF4IGxvY2F0aW9uIElELlxuICAgIC8vd3JpdGVyLmFsbG9jKDB4MTkzZjksIDB4MWFjMDApO1xuICAgIC8vIE9iamVjdERhdGEgKGluZGV4IGF0IDFhYzAwLi4xYWUwMClcbiAgICAvL3dyaXRlci5hbGxvYygweDFhZTAwLCAweDFiZDAwKTsgLy8gc2F2ZSA1MTIgYnl0ZXMgYXQgZW5kIGZvciBzb21lIGV4dHJhIGNvZGVcbiAgICBjb25zdCBhID0gdGhpcy5hc3NlbWJsZXIoKTtcbiAgICAvLyBOcGNTcGF3bkNvbmRpdGlvbnNcbiAgICBmcmVlKGEsICQwZSwgMHg4NzdhLCAweDg5NWQpO1xuICAgIC8vIE5wY0RpYWxvZ1xuICAgIGZyZWUoYSwgJDBlLCAweDhhZTUsIDB4OThmNCk7XG4gICAgLy8gSXRlbUdldERhdGEgKHRvIDFlMDY1KSArIEl0ZW1Vc2VEYXRhXG4gICAgZnJlZShhLCAkMGUsIDB4OWRlNiwgMHhhMDAwKTtcbiAgICBmcmVlKGEsICQwZiwgMHhhMDAwLCAweGExMDYpO1xuICAgIC8vIFRyaWdnZXJEYXRhXG4gICAgLy8gTk9URTogVGhlcmUncyBzb21lIGZyZWUgc3BhY2UgYXQgMWUzYzAuLjFlM2YwLCBidXQgd2UgdXNlIHRoaXMgZm9yIHRoZVxuICAgIC8vIENoZWNrQmVsb3dCb3NzIHRyaWdnZXJzLlxuICAgIGZyZWUoYSwgJDBmLCAweGEyMDAsIDB4YTNjMCk7XG4gICAgLy8gSXRlbU1lbnVOYW1lXG4gICAgZnJlZShhLCAkMTAsIDB4OTExYSwgMHg5NDY4KTtcbiAgICAvLyBrZWVwIGl0ZW0gJDQ5IFwiICAgICAgICBcIiB3aGljaCBpcyBhY3R1YWxseSB1c2VkIHNvbWV3aGVyZT9cbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyMTQ3MSwgMHgyMTRmMSk7IC8vIFRPRE8gLSBkbyB3ZSBuZWVkIGFueSBvZiB0aGlzP1xuICAgIC8vIEl0ZW1NZXNzYWdlTmFtZVxuICAgIC8vIHdyaXRlci5hbGxvYygweDI4ZTgxLCAweDI5MjJiKTsgLy8gTk9URTogdW5jb3ZlcmVkIHRocnUgMjk0MDBcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyOTIyYiwgMHgyOTQwMCk7IC8vIFRPRE8gLSBuZWVkZWQ/XG4gICAgLy8gTk9URTogb25jZSB3ZSByZWxlYXNlIHRoZSBvdGhlciBtZXNzYWdlIHRhYmxlcywgdGhpcyB3aWxsIGp1c3QgYmUgb25lIGdpYW50IGJsb2NrLlxuXG4gICAgLy8gTWVzc2FnZSB0YWJsZSBwYXJ0c1xuICAgIC8vIHdyaXRlci5hbGxvYygweDI4MDAwLCAweDI4M2ZlKTtcbiAgICAvLyBNZXNzYWdlIHRhYmxlc1xuICAgIC8vIFRPRE8gLSB3ZSBkb24ndCB1c2UgdGhlIHdyaXRlciB0byBhbGxvY2F0ZSB0aGUgYWJicmV2aWF0aW9uIHRhYmxlcywgYnV0IHdlIGNvdWxkXG4gICAgLy93cml0ZXIuZnJlZSgnMHgyYTAwMCwgMHgyZmMwMCk7XG5cbiAgICAvLyBpZiAodGhpcy50ZWxlcGF0aHlUYWJsZXNBZGRyZXNzKSB7XG4gICAgLy8gICB3cml0ZXIuYWxsb2MoMHgxZDhmNCwgMHgxZGIwMCk7IC8vIGxvY2F0aW9uIHRhYmxlIGFsbCB0aGUgd2F5IHRocnUgbWFpblxuICAgIC8vIH0gZWxzZSB7XG4gICAgLy8gICB3cml0ZXIuYWxsb2MoMHgxZGE0YywgMHgxZGIwMCk7IC8vIGV4aXN0aW5nIG1haW4gdGFibGUgaXMgaGVyZS5cbiAgICAvLyB9XG5cbiAgICBjb25zdCBtb2R1bGVzID0gWy4uLnRoaXMubW9kdWxlcywgYS5tb2R1bGUoKV07XG4gICAgY29uc3Qgd3JpdGVBbGwgPSAod3JpdGFibGVzOiBJdGVyYWJsZTx7d3JpdGUoKTogTW9kdWxlW119PikgPT4ge1xuICAgICAgZm9yIChjb25zdCB3IG9mIHdyaXRhYmxlcykge1xuICAgICAgICBtb2R1bGVzLnB1c2goLi4udy53cml0ZSgpKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmxvY2F0aW9ucy53cml0ZSgpKTtcbiAgICB3cml0ZUFsbCh0aGlzLm9iamVjdHMpO1xuICAgIHdyaXRlQWxsKHRoaXMuaGl0Ym94ZXMpO1xuICAgIHdyaXRlQWxsKHRoaXMudHJpZ2dlcnMpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLm5wY3Mud3JpdGUoKSk7XG4gICAgd3JpdGVBbGwodGhpcy50aWxlc2V0cyk7XG4gICAgd3JpdGVBbGwodGhpcy50aWxlRWZmZWN0cyk7XG4gICAgd3JpdGVBbGwodGhpcy5hZEhvY1NwYXducyk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuaXRlbUdldHMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2xvdHMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuaXRlbXMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2hvcHMud3JpdGUoKSk7XG4gICAgd3JpdGVBbGwodGhpcy5ib3NzS2lsbHMpO1xuICAgIHdyaXRlQWxsKHRoaXMucGF0dGVybnMpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLndpbGRXYXJwLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnRvd25XYXJwLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmNvaW5Ecm9wcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zY2FsaW5nLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmJvc3Nlcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5yYW5kb21OdW1iZXJzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnRlbGVwYXRoeS53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5tZXNzYWdlcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zY3JlZW5zLndyaXRlKCkpO1xuXG4gICAgLy8gUmVzZXJ2ZSB0aGUgZ2xvYmFsIHNwYWNlIDE0MmMwLi4uMTQyZjAgPz8/XG4gICAgLy8gY29uc3QgdGhpcy5hc3NlbWJsZXIoKS5cblxuICAgIGNvbnN0IGxpbmtlciA9IG5ldyBMaW5rZXIoKTtcbiAgICBsaW5rZXIuYmFzZSh0aGlzLnByZywgMCk7XG4gICAgZm9yIChjb25zdCBtIG9mIG1vZHVsZXMpIHtcbiAgICAgIGxpbmtlci5yZWFkKG0pO1xuICAgIH1cbiAgICBjb25zdCBvdXQgPSBsaW5rZXIubGluaygpO1xuICAgIG91dC5hcHBseShkYXRhKTtcbiAgICBpZiAoZGF0YSAhPT0gdGhpcy5wcmcpIHJldHVybjsgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXBcbiAgICAvL2xpbmtlci5yZXBvcnQoKTtcbiAgICBjb25zdCBleHBvcnRzID0gbGlua2VyLmV4cG9ydHMoKTtcblxuICAgIFxuICAgIHRoaXMudW5pcXVlSXRlbVRhYmxlQWRkcmVzcyA9IGV4cG9ydHMuZ2V0KCdLZXlJdGVtRGF0YScpIS5vZmZzZXQhO1xuICAgIHRoaXMuc2hvcENvdW50ID0gMTE7XG4gICAgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgPSBleHBvcnRzLmdldCgnU2hvcERhdGEnKT8ub2Zmc2V0IHx8IDA7XG4gICAgLy8gRG9uJ3QgaW5jbHVkZSB0aGVzZSBpbiB0aGUgbGlua2VyPz8/XG4gICAgUm9tLlNIT1BfQ09VTlQuc2V0KHRoaXMucHJnLCB0aGlzLnNob3BDb3VudCk7XG4gICAgUm9tLlNDQUxJTkdfTEVWRUxTLnNldCh0aGlzLnByZywgdGhpcy5zY2FsaW5nTGV2ZWxzKTtcbiAgICBSb20uVU5JUVVFX0lURU1fVEFCTEUuc2V0KHRoaXMucHJnLCB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MpO1xuICAgIFJvbS5TSE9QX0RBVEFfVEFCTEVTLnNldCh0aGlzLnByZywgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgfHwgMCk7XG4gICAgUm9tLk9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVguc2V0KHRoaXMucHJnLCB0aGlzLm9taXRJdGVtR2V0RGF0YVN1ZmZpeCk7XG4gICAgUm9tLk9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWC5zZXQodGhpcy5wcmcsIHRoaXMub21pdExvY2FsRGlhbG9nU3VmZml4KTtcbiAgICBSb20uQ09NUFJFU1NFRF9NQVBEQVRBLnNldCh0aGlzLnByZywgdGhpcy5jb21wcmVzc2VkTWFwRGF0YSk7XG4gIH1cblxuICBhbmFseXplVGlsZXMoKSB7XG4gICAgLy8gRm9yIGFueSBnaXZlbiB0aWxlIGluZGV4LCB3aGF0IHNjcmVlbnMgZG9lcyBpdCBhcHBlYXIgb24uXG4gICAgLy8gRm9yIHRob3NlIHNjcmVlbnMsIHdoaWNoIHRpbGVzZXRzIGRvZXMgKml0KiBhcHBlYXIgb24uXG4gICAgLy8gVGhhdCB0aWxlIElEIGlzIGxpbmtlZCBhY3Jvc3MgYWxsIHRob3NlIHRpbGVzZXRzLlxuICAgIC8vIEZvcm1zIGEgcGFydGl0aW9uaW5nIGZvciBlYWNoIHRpbGUgSUQgPT4gdW5pb24tZmluZC5cbiAgICAvLyBHaXZlbiB0aGlzIHBhcnRpdGlvbmluZywgaWYgSSB3YW50IHRvIG1vdmUgYSB0aWxlIG9uIGEgZ2l2ZW5cbiAgICAvLyB0aWxlc2V0LCBhbGwgSSBuZWVkIHRvIGRvIGlzIGZpbmQgYW5vdGhlciB0aWxlIElEIHdpdGggdGhlXG4gICAgLy8gc2FtZSBwYXJ0aXRpb24gYW5kIHN3YXAgdGhlbT9cblxuICAgIC8vIE1vcmUgZ2VuZXJhbGx5LCB3ZSBjYW4ganVzdCBwYXJ0aXRpb24gdGhlIHRpbGVzZXRzLlxuXG4gICAgLy8gRm9yIGVhY2ggc2NyZWVuLCBmaW5kIGFsbCB0aWxlc2V0cyBUIGZvciB0aGF0IHNjcmVlblxuICAgIC8vIFRoZW4gZm9yIGVhY2ggdGlsZSBvbiB0aGUgc2NyZWVuLCB1bmlvbiBUIGZvciB0aGF0IHRpbGUuXG5cbiAgICAvLyBHaXZlbiBhIHRpbGVzZXQgYW5kIGEgbWV0YXRpbGUgSUQsIGZpbmQgYWxsIHRoZSBzY3JlZW5zIHRoYXQgKDEpIGFyZSByZW5kZXJlZFxuICAgIC8vIHdpdGggdGhhdCB0aWxlc2V0LCBhbmQgKGIpIHRoYXQgY29udGFpbiB0aGF0IG1ldGF0aWxlOyB0aGVuIGZpbmQgYWxsICpvdGhlcipcbiAgICAvLyB0aWxlc2V0cyB0aGF0IHRob3NlIHNjcmVlbnMgYXJlIGV2ZXIgcmVuZGVyZWQgd2l0aC5cblxuICAgIC8vIEdpdmVuIGEgc2NyZWVuLCBmaW5kIGFsbCBhdmFpbGFibGUgbWV0YXRpbGUgSURzIHRoYXQgY291bGQgYmUgYWRkZWQgdG8gaXRcbiAgICAvLyB3aXRob3V0IGNhdXNpbmcgcHJvYmxlbXMgd2l0aCBvdGhlciBzY3JlZW5zIHRoYXQgc2hhcmUgYW55IHRpbGVzZXRzLlxuICAgIC8vICAtPiB1bnVzZWQgKG9yIHVzZWQgYnV0IHNoYXJlZCBleGNsdXNpdmVseSkgYWNyb3NzIGFsbCB0aWxlc2V0cyB0aGUgc2NyZWVuIG1heSB1c2VcblxuICAgIC8vIFdoYXQgSSB3YW50IGZvciBzd2FwcGluZyBpcyB0aGUgZm9sbG93aW5nOlxuICAgIC8vICAxLiBmaW5kIGFsbCBzY3JlZW5zIEkgd2FudCB0byB3b3JrIG9uID0+IHRpbGVzZXRzXG4gICAgLy8gIDIuIGZpbmQgdW51c2VkIGZsYWdnYWJibGUgdGlsZXMgaW4gdGhlIGhhcmRlc3Qgb25lLFxuICAgIC8vICAgICB3aGljaCBhcmUgYWxzbyBJU09MQVRFRCBpbiB0aGUgb3RoZXJzLlxuICAgIC8vICAzLiB3YW50IHRoZXNlIHRpbGVzIHRvIGJlIHVudXNlZCBpbiBBTEwgcmVsZXZhbnQgdGlsZXNldHNcbiAgICAvLyAgNC4gdG8gbWFrZSB0aGlzIHNvLCBmaW5kICpvdGhlciogdW51c2VkIGZsYWdnYWJsZSB0aWxlcyBpbiBvdGhlciB0aWxlc2V0c1xuICAgIC8vICA1LiBzd2FwIHRoZSB1bnVzZWQgd2l0aCB0aGUgaXNvbGF0ZWQgdGlsZXMgaW4gdGhlIG90aGVyIHRpbGVzZXRzXG5cbiAgICAvLyBDYXZlczpcbiAgICAvLyAgMGE6ICAgICAgOTAgLyA5Y1xuICAgIC8vICAxNTogODAgLyA5MCAvIDljXG4gICAgLy8gIDE5OiAgICAgIDkwICAgICAgKHdpbGwgYWRkIHRvIDgwPylcbiAgICAvLyAgM2U6ICAgICAgOTBcbiAgICAvL1xuICAgIC8vIElkZWFsbHkgd2UgY291bGQgcmV1c2UgODAncyAxLzIvMy80IGZvciB0aGlzXG4gICAgLy8gIDAxOiA5MCB8IDk0IDljXG4gICAgLy8gIDAyOiA5MCB8IDk0IDljXG4gICAgLy8gIDAzOiAgICAgIDk0IDljXG4gICAgLy8gIDA0OiA5MCB8IDk0IDljXG4gICAgLy9cbiAgICAvLyBOZWVkIDQgb3RoZXIgZmxhZ2dhYmxlIHRpbGUgaW5kaWNlcyB3ZSBjYW4gc3dhcCB0bz9cbiAgICAvLyAgIDkwOiA9PiAoMSwyIG5lZWQgZmxhZ2dhYmxlOyAzIHVudXNlZDsgNCBhbnkpID0+IDA3LCAwZSwgMTAsIDEyLCAxMywgLi4uLCAyMCwgMjEsIDIyLCAuLi5cbiAgICAvLyAgIDk0IDljOiA9PiBkb24ndCBuZWVkIGFueSBmbGFnZ2FibGUgPT4gMDUsIDNjLCA2OCwgODMsIDg4LCA4OSwgOGEsIDkwLCAuLi5cbiAgfVxuXG4gIGRpc2pvaW50VGlsZXNldHMoKSB7XG4gICAgY29uc3QgdGlsZXNldEJ5U2NyZWVuOiBBcnJheTxTZXQ8bnVtYmVyPj4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsb2MudXNlZCkgY29udGludWU7XG4gICAgICBjb25zdCB0aWxlc2V0ID0gbG9jLnRpbGVzZXQ7XG4gICAgICAvL2NvbnN0IGV4dCA9IGxvYy5zY3JlZW5QYWdlO1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIHJvdykge1xuICAgICAgICAgICh0aWxlc2V0QnlTY3JlZW5bc10gfHwgKHRpbGVzZXRCeVNjcmVlbltzXSA9IG5ldyBTZXQoKSkpLmFkZCh0aWxlc2V0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0aWxlcyA9IHNlcSgyNTYsICgpID0+IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpKTtcbiAgICBmb3IgKGxldCBzID0gMDsgcyA8IHRpbGVzZXRCeVNjcmVlbi5sZW5ndGg7IHMrKykge1xuICAgICAgaWYgKCF0aWxlc2V0QnlTY3JlZW5bc10pIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCB0IG9mIHRoaXMuc2NyZWVuc1tzXS5hbGxUaWxlc1NldCgpKSB7XG4gICAgICAgIHRpbGVzW3RdLnVuaW9uKFsuLi50aWxlc2V0QnlTY3JlZW5bc11dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gb3V0cHV0XG4gICAgZm9yIChsZXQgdCA9IDA7IHQgPCB0aWxlcy5sZW5ndGg7IHQrKykge1xuICAgICAgY29uc3QgcCA9IHRpbGVzW3RdLnNldHMoKVxuICAgICAgICAgIC5tYXAoKHM6IFNldDxudW1iZXI+KSA9PiBbLi4uc10ubWFwKGhleCkuam9pbignICcpKVxuICAgICAgICAgIC5qb2luKCcgfCAnKTtcbiAgICAgIGNvbnNvbGUubG9nKGBUaWxlICR7aGV4KHQpfTogJHtwfWApO1xuICAgIH1cbiAgICAvLyAgIGlmICghdGlsZXNldEJ5U2NyZWVuW2ldKSB7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKGBObyB0aWxlc2V0IGZvciBzY3JlZW4gJHtpLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAvLyAgICAgY29udGludWU7XG4gICAgLy8gICB9XG4gICAgLy8gICB1bmlvbi51bmlvbihbLi4udGlsZXNldEJ5U2NyZWVuW2ldXSk7XG4gICAgLy8gfVxuICAgIC8vIHJldHVybiB1bmlvbi5zZXRzKCk7XG4gIH1cblxuICAvLyBDeWNsZXMgYXJlIG5vdCBhY3R1YWxseSBjeWNsaWMgLSBhbiBleHBsaWNpdCBsb29wIGF0IHRoZSBlbmQgaXMgcmVxdWlyZWQgdG8gc3dhcC5cbiAgLy8gVmFyaWFuY2U6IFsxLCAyLCBudWxsXSB3aWxsIGNhdXNlIGluc3RhbmNlcyBvZiAxIHRvIGJlY29tZSAyIGFuZCB3aWxsXG4gIC8vICAgICAgICAgICBjYXVzZSBwcm9wZXJ0aWVzIG9mIDEgdG8gYmUgY29waWVkIGludG8gc2xvdCAyXG4gIC8vIENvbW1vbiB1c2FnZSBpcyB0byBzd2FwIHRoaW5ncyBvdXQgb2YgdGhlIHdheSBhbmQgdGhlbiBjb3B5IGludG8gdGhlXG4gIC8vIG5ld2x5LWZyZWVkIHNsb3QuICBTYXkgd2Ugd2FudGVkIHRvIGZyZWUgdXAgc2xvdHMgWzEsIDIsIDMsIDRdIGFuZFxuICAvLyBoYWQgYXZhaWxhYmxlL2ZyZWUgc2xvdHMgWzUsIDYsIDcsIDhdIGFuZCB3YW50IHRvIGNvcHkgZnJvbSBbOSwgYSwgYiwgY10uXG4gIC8vIFRoZW4gY3ljbGVzIHdpbGwgYmUgWzEsIDUsIDldID8/PyBub1xuICAvLyAgLSBwcm9iYWJseSB3YW50IHRvIGRvIHNjcmVlbnMgc2VwYXJhdGVseSBmcm9tIHRpbGVzZXRzLi4uP1xuICAvLyBOT1RFIC0gd2UgZG9uJ3QgYWN0dWFsbHkgd2FudCB0byBjaGFuZ2UgdGlsZXMgZm9yIHRoZSBsYXN0IGNvcHkuLi4hXG4gIC8vICAgaW4gdGhpcyBjYXNlLCB0c1s1XSA8LSB0c1sxXSwgdHNbMV0gPC0gdHNbOV0sIHNjcmVlbi5tYXAoMSAtPiA1KVxuICAvLyAgIHJlcGxhY2UoWzB4OTBdLCBbNSwgMSwgfjldKVxuICAvLyAgICAgPT4gMXMgcmVwbGFjZWQgd2l0aCA1cyBpbiBzY3JlZW5zIGJ1dCA5cyBOT1QgcmVwbGFjZWQgd2l0aCAxcy5cbiAgLy8gSnVzdCBidWlsZCB0aGUgcGFydGl0aW9uIG9uY2UgbGF6aWx5PyB0aGVuIGNhbiByZXVzZS4uLlxuICAvLyAgIC0gZW5zdXJlIGJvdGggc2lkZXMgb2YgcmVwbGFjZW1lbnQgaGF2ZSBjb3JyZWN0IHBhcnRpdGlvbmluZz9FXG4gIC8vICAgICBvciBqdXN0IGRvIGl0IG9mZmxpbmUgLSBpdCdzIHNpbXBsZXJcbiAgLy8gVE9ETyAtIFNhbml0eSBjaGVjaz8gIFdhbnQgdG8gbWFrZSBzdXJlIG5vYm9keSBpcyB1c2luZyBjbG9iYmVyZWQgdGlsZXM/XG4gIHN3YXBNZXRhdGlsZXModGlsZXNldHM6IG51bWJlcltdLCAuLi5jeWNsZXM6IChudW1iZXIgfCBudW1iZXJbXSlbXVtdKSB7XG4gICAgLy8gUHJvY2VzcyB0aGUgY3ljbGVzXG4gICAgY29uc3QgcmV2ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBjb25zdCByZXZBcnI6IG51bWJlcltdID0gc2VxKDB4MTAwKTtcbiAgICBjb25zdCBhbHQgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGNvbnN0IGNwbCA9ICh4OiBudW1iZXIgfCBudW1iZXJbXSk6IG51bWJlciA9PiBBcnJheS5pc0FycmF5KHgpID8geFswXSA6IHggPCAwID8gfnggOiB4O1xuICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjeWNsZVtpXSkpIHtcbiAgICAgICAgICBjb25zdCBhcnIgPSBjeWNsZVtpXSBhcyBudW1iZXJbXTtcbiAgICAgICAgICBhbHQuc2V0KGFyclswXSwgYXJyWzFdKTtcbiAgICAgICAgICBjeWNsZVtpXSA9IGFyclswXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgY29uc3QgaiA9IGN5Y2xlW2ldIGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgayA9IGN5Y2xlW2kgKyAxXSBhcyBudW1iZXI7XG4gICAgICAgIGlmIChqIDwgMCB8fCBrIDwgMCkgY29udGludWU7XG4gICAgICAgIHJldi5zZXQoaywgaik7XG4gICAgICAgIHJldkFycltrXSA9IGo7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnN0IHJlcGxhY2VtZW50U2V0ID0gbmV3IFNldChyZXBsYWNlbWVudHMua2V5cygpKTtcbiAgICAvLyBGaW5kIGluc3RhbmNlcyBpbiAoMSkgc2NyZWVucywgKDIpIHRpbGVzZXRzIGFuZCBhbHRlcm5hdGVzLCAoMykgdGlsZUVmZmVjdHNcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IFNldDxTY3JlZW4+KCk7XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjb25zdCB0aWxlc2V0c1NldCA9IG5ldyBTZXQodGlsZXNldHMpO1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCF0aWxlc2V0c1NldC5oYXMobC50aWxlc2V0KSkgY29udGludWU7XG4gICAgICB0aWxlRWZmZWN0cy5hZGQobC50aWxlRWZmZWN0cyk7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiBsLmFsbFNjcmVlbnMoKSkge1xuICAgICAgICBzY3JlZW5zLmFkZChzY3JlZW4pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBEbyByZXBsYWNlbWVudHMuXG4gICAgLy8gMS4gc2NyZWVuczogWzUsIDEsIH45XSA9PiBjaGFuZ2UgMXMgaW50byA1c1xuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHNjcmVlbnMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzY3JlZW4udGlsZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgc2NyZWVuLnRpbGVzW2ldID0gcmV2QXJyW3NjcmVlbi50aWxlc1tpXV07XG4gICAgICB9XG4gICAgfVxuICAgIC8vIDIuIHRpbGVzZXRzOiBbNSwgMSB+OV0gPT4gY29weSA1IDw9IDEgYW5kIDEgPD0gOVxuICAgIGZvciAoY29uc3QgdHNpZCBvZiB0aWxlc2V0c1NldCkge1xuICAgICAgY29uc3QgdGlsZXNldCA9IHRoaXMudGlsZXNldHNbdHNpZF07XG4gICAgICBmb3IgKGNvbnN0IGN5Y2xlIG9mIGN5Y2xlcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSBjcGwoY3ljbGVbaV0pO1xuICAgICAgICAgIGNvbnN0IGIgPSBjcGwoY3ljbGVbaSArIDFdKTtcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDQ7IGorKykge1xuICAgICAgICAgICAgdGlsZXNldC50aWxlc1tqXVthXSA9IHRpbGVzZXQudGlsZXNbal1bYl07XG4gICAgICAgICAgfVxuICAgICAgICAgIHRpbGVzZXQuYXR0cnNbYV0gPSB0aWxlc2V0LmF0dHJzW2JdO1xuICAgICAgICAgIGlmIChiIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbYl0gIT09IGIpIHtcbiAgICAgICAgICAgIGlmIChhID49IDB4MjApIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHVuZmxhZzogJHt0c2lkfSAke2F9ICR7Yn0gJHt0aWxlc2V0LmFsdGVybmF0ZXNbYl19YCk7XG4gICAgICAgICAgICB0aWxlc2V0LmFsdGVybmF0ZXNbYV0gPSB0aWxlc2V0LmFsdGVybmF0ZXNbYl07XG4gICAgICAgICAgICBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW2EsIGJdIG9mIGFsdCkge1xuICAgICAgICB0aWxlc2V0LmFsdGVybmF0ZXNbYV0gPSBiO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyAzLiB0aWxlRWZmZWN0c1xuICAgIGZvciAoY29uc3QgdGVpZCBvZiB0aWxlRWZmZWN0cykge1xuICAgICAgY29uc3QgdGlsZUVmZmVjdCA9IHRoaXMudGlsZUVmZmVjdHNbdGVpZCAtIDB4YjNdO1xuICAgICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gY3BsKGN5Y2xlW2ldKTtcbiAgICAgICAgICBjb25zdCBiID0gY3BsKGN5Y2xlW2kgKyAxXSk7XG4gICAgICAgICAgdGlsZUVmZmVjdC5lZmZlY3RzW2FdID0gdGlsZUVmZmVjdC5lZmZlY3RzW2JdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGEgb2YgYWx0LmtleXMoKSkge1xuICAgICAgICAvLyBUaGlzIGJpdCBpcyByZXF1aXJlZCB0byBpbmRpY2F0ZSB0aGF0IHRoZSBhbHRlcm5hdGl2ZSB0aWxlJ3NcbiAgICAgICAgLy8gZWZmZWN0IHNob3VsZCBiZSBjb25zdWx0ZWQuICBTaW1wbHkgaGF2aW5nIHRoZSBmbGFnIGFuZCB0aGVcbiAgICAgICAgLy8gdGlsZSBpbmRleCA8ICQyMCBpcyBub3Qgc3VmZmljaWVudC5cbiAgICAgICAgdGlsZUVmZmVjdC5lZmZlY3RzW2FdIHw9IDB4MDg7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERvbmU/IT9cbiAgfVxuXG4gIG1vdmVGbGFnKG9sZEZsYWc6IG51bWJlciwgbmV3RmxhZzogbnVtYmVyKSB7XG4gICAgLy8gbmVlZCB0byB1cGRhdGUgdHJpZ2dlcnMsIHNwYXducywgZGlhbG9nc1xuICAgIGZ1bmN0aW9uIHJlcGxhY2UoYXJyOiBudW1iZXJbXSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFycltpXSA9PT0gb2xkRmxhZykgYXJyW2ldID0gbmV3RmxhZztcbiAgICAgICAgaWYgKGFycltpXSA9PT0gfm9sZEZsYWcpIGFycltpXSA9IH5uZXdGbGFnO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHRyaWdnZXIgb2YgdGhpcy50cmlnZ2Vycykge1xuICAgICAgcmVwbGFjZSh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuICAgICAgcmVwbGFjZSh0cmlnZ2VyLmZsYWdzKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBucGMgb2YgdGhpcy5ucGNzKSB7XG4gICAgICBmb3IgKGNvbnN0IGNvbmRzIG9mIG5wYy5zcGF3bkNvbmRpdGlvbnMudmFsdWVzKCkpIHJlcGxhY2UoY29uZHMpO1xuICAgICAgZm9yIChjb25zdCBkaWFsb2dzIG9mIFtucGMuZ2xvYmFsRGlhbG9ncywgLi4ubnBjLmxvY2FsRGlhbG9ncy52YWx1ZXMoKV0pIHtcbiAgICAgICAgZm9yIChjb25zdCBkaWFsb2cgb2YgZGlhbG9ncykge1xuICAgICAgICAgIGlmIChkaWFsb2cuY29uZGl0aW9uID09PSBvbGRGbGFnKSBkaWFsb2cuY29uZGl0aW9uID0gbmV3RmxhZztcbiAgICAgICAgICBpZiAoZGlhbG9nLmNvbmRpdGlvbiA9PT0gfm9sZEZsYWcpIGRpYWxvZy5jb25kaXRpb24gPSB+bmV3RmxhZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBhbHNvIG5lZWQgdG8gdXBkYXRlIG1hcCBmbGFncyBpZiA+PSAkMjAwXG4gICAgaWYgKChvbGRGbGFnICYgfjB4ZmYpID09PSAweDIwMCAmJiAobmV3RmxhZyAmIH4weGZmKSA9PT0gMHgyMDApIHtcbiAgICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgICAgICBpZiAoZmxhZy5mbGFnID09PSBvbGRGbGFnKSBmbGFnLmZsYWcgPSBuZXdGbGFnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgbmV4dEZyZWVUcmlnZ2VyKCk6IFRyaWdnZXIge1xuICAgIGZvciAoY29uc3QgdCBvZiB0aGlzLnRyaWdnZXJzKSB7XG4gICAgICBpZiAoIXQudXNlZCkgcmV0dXJuIHQ7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgYW4gdW51c2VkIHRyaWdnZXIuJyk7XG4gIH1cblxuICAvLyBjb21wcmVzc01hcERhdGEoKTogdm9pZCB7XG4gIC8vICAgaWYgKHRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHJldHVybjtcbiAgLy8gICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gdHJ1ZTtcbiAgLy8gICAvLyBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gIC8vICAgLy8gICBpZiAobG9jYXRpb24uZXh0ZW5kZWQpIGxvY2F0aW9uLmV4dGVuZGVkID0gMHhhO1xuICAvLyAgIC8vIH1cbiAgLy8gICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAvLyAgICAgLy90aGlzLnNjcmVlbnNbMHhhMDAgfCBpXSA9IHRoaXMuc2NyZWVuc1sweDEwMCB8IGldO1xuICAvLyAgICAgdGhpcy5tZXRhc2NyZWVucy5yZW51bWJlcigweDEwMCB8IGksIDB4YTAwIHwgaSk7XG4gIC8vICAgICBkZWxldGUgdGhpcy5zY3JlZW5zWzB4MTAwIHwgaV07XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gVE9ETyAtIGRvZXMgbm90IHdvcmsuLi5cbiAgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXAgc29tZWhvdy4uLiB3b3VsZCBiZSBuaWNlIHRvIHVzZSB0aGUgYXNzZW1ibGVyL2xpbmtlclxuICAvLyAgICAgICAgdy8gYW4gLmFsaWduIG9wdGlvbiBmb3IgdGhpcywgYnV0IHRoZW4gd2UgaGF2ZSB0byBob2xkIG9udG8gd2VpcmRcbiAgLy8gICAgICAgIGRhdGEgaW4gbWFueSBwbGFjZXMsIHdoaWNoIGlzbid0IGdyZWF0LlxuICBtb3ZlU2NyZWVucyh0aWxlc2V0OiBNZXRhdGlsZXNldCwgcGFnZTogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbXByZXNzZWRNYXBEYXRhKSB0aHJvdyBuZXcgRXJyb3IoYE11c3QgY29tcHJlc3MgbWFwcyBmaXJzdC5gKTtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGxldCBpID0gcGFnZSA8PCA4O1xuICAgIHdoaWxlICh0aGlzLnNjcmVlbnNbaV0pIHtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2YgdGlsZXNldCkge1xuICAgICAgaWYgKHNjcmVlbi5zaWQgPj0gMHgxMDApIGNvbnRpbnVlO1xuICAgICAgLy9pZiAoKGkgJiAweGZmKSA9PT0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBObyByb29tIGxlZnQgb24gcGFnZS5gKTtcbiAgICAgIGNvbnN0IHByZXYgPSBzY3JlZW4uc2lkO1xuICAgICAgaWYgKG1hcC5oYXMocHJldikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbmV4dCA9IHNjcmVlbi5zaWQgPSBpKys7XG4gICAgICBtYXAuc2V0KHByZXYsIG5leHQpO1xuICAgICAgbWFwLnNldChuZXh0LCBuZXh0KTtcbiAgICAgIC8vdGhpcy5tZXRhc2NyZWVucy5yZW51bWJlcihwcmV2LCBuZXh0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmIChsb2MudGlsZXNldCAhPSB0aWxlc2V0LnRpbGVzZXRJZCkgY29udGludWU7XG4gICAgICBsZXQgYW55TW92ZWQgPSBmYWxzZTtcbiAgICAgIGxldCBhbGxNb3ZlZCA9IHRydWU7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHJvdy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGNvbnN0IG1hcHBlZCA9IG1hcC5nZXQocm93W2pdKTtcbiAgICAgICAgICBpZiAobWFwcGVkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJvd1tqXSA9IG1hcHBlZDtcbiAgICAgICAgICAgIGFueU1vdmVkID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWxsTW92ZWQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChhbnlNb3ZlZCkge1xuICAgICAgICBpZiAoIWFsbE1vdmVkKSB0aHJvdyBuZXcgRXJyb3IoYEluY29uc2lzdGVudCBtb3ZlYCk7XG4gICAgICAgIC8vbG9jLmV4dGVuZGVkID0gcGFnZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBVc2UgdGhlIGJyb3dzZXIgQVBJIHRvIGxvYWQgdGhlIFJPTS4gIFVzZSAjcmVzZXQgdG8gZm9yZ2V0IGFuZCByZWxvYWQuXG4gIHN0YXRpYyBhc3luYyBsb2FkKHBhdGNoPzogKGRhdGE6IFVpbnQ4QXJyYXkpID0+IHZvaWR8UHJvbWlzZTx2b2lkPixcbiAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZXI/OiAocGlja2VyOiBFbGVtZW50KSA9PiB2b2lkKSB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IHBpY2tGaWxlKHJlY2VpdmVyKTtcbiAgICBpZiAocGF0Y2gpIGF3YWl0IHBhdGNoKGZpbGUpO1xuICAgIHJldHVybiBuZXcgUm9tKGZpbGUpO1xuICB9ICBcbn1cblxuLy8gY29uc3QgaW50ZXJzZWN0cyA9IChsZWZ0LCByaWdodCkgPT4ge1xuLy8gICBpZiAobGVmdC5zaXplID4gcmlnaHQuc2l6ZSkgcmV0dXJuIGludGVyc2VjdHMocmlnaHQsIGxlZnQpO1xuLy8gICBmb3IgKGxldCBpIG9mIGxlZnQpIHtcbi8vICAgICBpZiAocmlnaHQuaGFzKGkpKSByZXR1cm4gdHJ1ZTtcbi8vICAgfVxuLy8gICByZXR1cm4gZmFsc2U7XG4vLyB9XG5cbi8vIGNvbnN0IFRJTEVfRUZGRUNUU19CWV9USUxFU0VUID0ge1xuLy8gICAweDgwOiAweGIzLFxuLy8gICAweDg0OiAweGI0LFxuLy8gICAweDg4OiAweGI1LFxuLy8gICAweDhjOiAweGI2LFxuLy8gICAweDkwOiAweGI3LFxuLy8gICAweDk0OiAweGI4LFxuLy8gICAweDk4OiAweGI5LFxuLy8gICAweDljOiAweGJhLFxuLy8gICAweGEwOiAweGJiLFxuLy8gICAweGE0OiAweGJjLFxuLy8gICAweGE4OiAweGI1LFxuLy8gICAweGFjOiAweGJkLFxuLy8gfTtcblxuLy8gT25seSBtYWtlcyBzZW5zZSBpbiB0aGUgYnJvd3Nlci5cbmZ1bmN0aW9uIHBpY2tGaWxlKHJlY2VpdmVyPzogKHBpY2tlcjogRWxlbWVudCkgPT4gdm9pZCk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICBpZiAoIXJlY2VpdmVyKSByZWNlaXZlciA9IHBpY2tlciA9PiBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHBpY2tlcik7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCAhPT0gJyNyZXNldCcpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncm9tJyk7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZShcbiAgICAgICAgICAgIFVpbnQ4QXJyYXkuZnJvbShcbiAgICAgICAgICAgICAgICBuZXcgQXJyYXkoZGF0YS5sZW5ndGggLyAyKS5maWxsKDApLm1hcChcbiAgICAgICAgICAgICAgICAgICAgKF8sIGkpID0+IE51bWJlci5wYXJzZUludChcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMiAqIGldICsgZGF0YVsyICogaSArIDFdLCAxNikpKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHVwbG9hZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh1cGxvYWQpO1xuICAgIHVwbG9hZC50eXBlID0gJ2ZpbGUnO1xuICAgIHVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBjb25zdCBmaWxlID0gdXBsb2FkLmZpbGVzIVswXTtcbiAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVuZCcsICgpID0+IHtcbiAgICAgICAgY29uc3QgYXJyID0gbmV3IFVpbnQ4QXJyYXkocmVhZGVyLnJlc3VsdCBhcyBBcnJheUJ1ZmZlcik7XG4gICAgICAgIGNvbnN0IHN0ciA9IEFycmF5LmZyb20oYXJyLCBoZXgpLmpvaW4oJycpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncm9tJywgc3RyKTtcbiAgICAgICAgdXBsb2FkLnJlbW92ZSgpO1xuICAgICAgICByZXNvbHZlKGFycik7XG4gICAgICB9KTtcbiAgICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjb25zdCBFWFBFQ1RFRF9DUkMzMiA9IDB4MWJkMzkwMzI7XG5cbi8vIEZvcm1hdDogW2FkZHJlc3MsIGJyb2tlbiwgZml4ZWRdXG5jb25zdCBBREpVU1RNRU5UUyA9IFtcbiAgLy8gTm9ybWFsaXplIGNhdmUgZW50cmFuY2UgaW4gMDEgb3V0c2lkZSBzdGFydFxuICBbMHgxNDU0OCwgMHg1NiwgMHg1MF0sXG4gIC8vIEZpeCBicm9rZW4gKGZhbGwtdGhyb3VnaCkgZXhpdCBvdXRzaWRlIHN0YXJ0XG4gIFsweDE0NTZhLCAweDAwLCAweGZmXSxcbiAgLy8gTW92ZSBMZWFmIG5vcnRoIGVudHJhbmNlIHRvIGJlIHJpZ2h0IG5leHQgdG8gZXhpdCAoY29uc2lzdGVudCB3aXRoIEdvYSlcbiAgWzB4MTQ1OGYsIDB4MzgsIDB4MzBdLFxuICAvLyBOb3JtYWxpemUgc2VhbGVkIGNhdmUgZW50cmFuY2UvZXhpdCBhbmQgemVidSBjYXZlIGVudHJhbmNlXG4gIFsweDE0NjE4LCAweDYwLCAweDcwXSxcbiAgWzB4MTQ2MjYsIDB4YTgsIDB4YTBdLFxuICBbMHgxNDYzMywgMHgxNSwgMHgxNl0sXG4gIFsweDE0NjM3LCAweDE1LCAweDE2XSxcbiAgLy8gTm9ybWFsaXplIGNvcmRlbCBwbGFpbiBlbnRyYW5jZSBmcm9tIHNlYWxlZCBjYXZlXG4gIFsweDE0OTUxLCAweGE4LCAweGEwXSxcbiAgWzB4MTQ5NTMsIDB4OTgsIDB4OTBdLFxuICAvLyBOb3JtYWxpemUgY29yZGVsIHN3YXAgZW50cmFuY2VcbiAgWzB4MTRhMTksIDB4NzgsIDB4NzBdLFxuICAvLyBSZWR1bmRhbnQgZXhpdCBuZXh0IHRvIHN0b20ncyBkb29yIGluICQxOVxuICBbMHgxNGFlYiwgMHgwOSwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBzd2FtcCBlbnRyYW5jZSBwb3NpdGlvblxuICBbMHgxNGI0OSwgMHg4MCwgMHg4OF0sXG4gIC8vIE5vcm1hbGl6ZSBhbWF6b25lcyBlbnRyYW5jZS9leGl0IHBvc2l0aW9uXG4gIFsweDE0Yjg3LCAweDIwLCAweDMwXSxcbiAgWzB4MTRiOWEsIDB4MDEsIDB4MDJdLFxuICBbMHgxNGI5ZSwgMHgwMSwgMHgwMl0sXG4gIC8vIEZpeCBnYXJiYWdlIG1hcCBzcXVhcmUgaW4gYm90dG9tLXJpZ2h0IG9mIE10IFNhYnJlIFdlc3QgY2F2ZVxuICBbMHgxNGRiOSwgMHgwOCwgMHg4MF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJyZSBuIGVudHJhbmNlIGJlbG93IHN1bW1pdFxuICBbMHgxNGVmNiwgMHg2OCwgMHg2MF0sXG4gIC8vIEZpeCBnYXJiYWdlIG1hcCBzcXVhcmUgaW4gYm90dG9tLWxlZnQgb2YgTGltZSBUcmVlIFZhbGxleVxuICBbMHgxNTQ1ZCwgMHhmZiwgMHgwMF0sXG4gIC8vIE5vcm1hbGl6ZSBsaW1lIHRyZWUgdmFsbGV5IFNFIGVudHJhbmNlXG4gIFsweDE1NDY5LCAweDc4LCAweDcwXSxcbiAgLy8gTm9ybWFsaXplIHBvcnRvYSBzZS9zdyBlbnRyYW5jZXNcbiAgWzB4MTU4MDYsIDB4OTgsIDB4YTBdLFxuICBbMHgxNTgwYSwgMHg5OCwgMHhhMF0sXG4gIC8vIE5vcm1hbGl6ZSBwb3J0b2EgcGFsYWNlIGVudHJhbmNlXG4gIFsweDE1ODBlLCAweDU4LCAweDUwXSxcbiAgLy8gTWFyayBiYWQgZW50cmFuY2UvZXhpdCBpbiBwb3J0b2FcbiAgWzB4MTU4MWQsIDB4MDAsIDB4ZmZdLFxuICBbMHgxNTg0ZSwgMHhkYiwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBmaXNoZXJtYW4gaXNsYW5kIGVudHJhbmNlXG4gIFsweDE1ODc1LCAweDc4LCAweDcwXSxcbiAgLy8gTm9ybWFsaXplIHpvbWJpZSB0b3duIGVudHJhbmNlIGZyb20gcGFsYWNlXG4gIFsweDE1YjRmLCAweDc4LCAweDgwXSxcbiAgLy8gUmVtb3ZlIHVudXNlZCBtYXAgc2NyZWVucyBmcm9tIEV2aWwgU3Bpcml0IGxvd2VyXG4gIFsweDE1YmFmLCAweGYwLCAweDgwXSxcbiAgWzB4MTViYjYsIDB4ZGYsIDB4ODBdLFxuICBbMHgxNWJiNywgMHg5NiwgMHg4MF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJlcmEgcGFsYWNlIDEgZW50cmFuY2UgdXAgb25lIHRpbGVcbiAgWzB4MTVjZTMsIDB4ZGYsIDB4Y2ZdLFxuICBbMHgxNWNlZSwgMHg2ZSwgMHg2ZF0sXG4gIFsweDE1Y2YyLCAweDZlLCAweDZkXSxcbiAgLy8gTm9ybWFsaXplIHNhYmVyYSBwYWxhY2UgMyBlbnRyYW5jZSB1cCBvbmUgdGlsZVxuICBbMHgxNWQ4ZSwgMHhkZiwgMHhjZl0sXG4gIFsweDE1ZDkxLCAweDJlLCAweDJkXSxcbiAgWzB4MTVkOTUsIDB4MmUsIDB4MmRdLFxuICAvLyBOb3JtYWxpemUgam9lbCBlbnRyYW5jZVxuICBbMHgxNWUzYSwgMHhkOCwgMHhkZl0sXG4gIC8vIE5vcm1hbGl6ZSBnb2EgdmFsbGV5IHJpZ2h0aGFuZCBlbnRyYW5jZVxuICBbMHgxNWYzOSwgMHg3OCwgMHg3MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gZ29hIHZhbGxleVxuICBbMHgxNWY0MCwgMHgwMiwgMHhmZl0sXG4gIFsweDE1ZjYxLCAweDhkLCAweGZmXSxcbiAgWzB4MTVmNjUsIDB4OGQsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgc2h5cm9uIGxvd2VyIGVudHJhbmNlXG4gIFsweDE2M2ZkLCAweDQ4LCAweDQwXSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBmb3J0cmVzcyBlbnRyYW5jZVxuICBbMHgxNjQwMywgMHg1NSwgMHg1MF0sXG4gIC8vIE5vcm1hbGl6ZSBnb2Egc291dGggZW50cmFuY2VcbiAgWzB4MTY0NWIsIDB4ZDgsIDB4ZGZdLFxuICAvLyBGaXggcGF0dGVybiB0YWJsZSBmb3IgZGVzZXJ0IDEgKGFuaW1hdGlvbiBnbG9zc2VzIG92ZXIgaXQpXG4gIFsweDE2NGNjLCAweDA0LCAweDIwXSxcbiAgLy8gRml4IGdhcmJhZ2UgYXQgYm90dG9tIG9mIG9hc2lzIGNhdmUgbWFwIChpdCdzIDh4MTEsIG5vdCA4eDEyID0+IGZpeCBoZWlnaHQpXG4gIFsweDE2NGZmLCAweDBiLCAweDBhXSxcbiAgLy8gTm9ybWFsaXplIHNhaGFyYSBlbnRyYW5jZS9leGl0IHBvc2l0aW9uXG4gIFsweDE2NjBkLCAweDIwLCAweDMwXSxcbiAgWzB4MTY2MjQsIDB4MDEsIDB4MDJdLFxuICBbMHgxNjYyOCwgMHgwMSwgMHgwMl0sXG4gIC8vIFJlbW92ZSB1bnVzZWQgc2NyZWVucyBmcm9tIG1hZG8yIGFyZWFcbiAgWzB4MTZkYjAsIDB4OWEsIDB4ODBdLFxuICBbMHgxNmRiNCwgMHg5ZSwgMHg4MF0sXG4gIFsweDE2ZGI4LCAweDkxLCAweDgwXSxcbiAgWzB4MTZkYmMsIDB4OWUsIDB4ODBdLFxuICBbMHgxNmRjMCwgMHg5MSwgMHg4MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlIGluIHVudXNlZCBtYWRvMiBhcmVhXG4gIFsweDE2ZGU4LCAweDAwLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIG1hZG8yLXNpZGUgaGVja3dheSBlbnRyYW5jZVxuICBbMHgxNmRlZCwgMHhkZiwgMHhkMF0sXG4gIC8vIEZpeCBib2d1cyBleGl0cyBpbiB1bnVzZWQgbWFkbzIgYXJlYVxuICAvLyAoZXhpdHMgMiBhbmQgMyBhcmUgYmFkLCBzbyBtb3ZlIDQgYW5kIDUgb24gdG9wIG9mIHRoZW0pXG4gIFsweDE2ZGY4LCAweDBjLCAweDVjXSxcbiAgWzB4MTZkZjksIDB4YjAsIDB4YjldLFxuICBbMHgxNmRmYSwgMHgwMCwgMHgwMl0sXG4gIFsweDE2ZGZjLCAweDBjLCAweDVjXSxcbiAgWzB4MTZkZmQsIDB4YjAsIDB4YjldLFxuICBbMHgxNmRmZSwgMHgwMCwgMHgwMl0sXG4gIFsweDE2ZGZmLCAweDA3LCAweGZmXSxcbiAgLy8gQWxzbyByZW1vdmUgdGhlIGJhZCBlbnRyYW5jZXMvZXhpdHMgb24gdGhlIGFzaW5hIHZlcnNpb25cbiAgLy8gTWFyayBiYWQgZW50cmFuY2UvZXhpdCBpbiBwb3J0b2FcbiAgWzB4MTZlNWQsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNmU2YSwgMHhhZCwgMHhmZl0sXG4gIFsweDE2ZTZlLCAweGFkLCAweGZmXSxcbiAgLy8gTWFyayB1bnVzZWQgZW50cmFuY2UvZXhpdCBpbiBub24ta2Vuc3Ugc2lkZSBvZiBrYXJtaW5lIDUuXG4gIFsweDE3MDAxLCAweDAyLCAweGZmXSxcbiAgWzB4MTcwMmUsIDB4YjcsIDB4ZmZdLFxuICBbMHgxNzAzMiwgMHhiNywgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlcy9leGl0cyBpbiBrZW5zdSBzaWRlIG9mIGthcm1pbmUgNS5cbiAgWzB4MTcwYWIsIDB4MDMsIDB4ZmZdLFxuICBbMHgxNzBhZiwgMHgwMiwgMHhmZl0sXG4gIFsweDE3MGIzLCAweDA1LCAweGZmXSxcbiAgWzB4MTcwYjcsIDB4MDYsIDB4ZmZdLFxuICBbMHgxNzBiYiwgMHgwMCwgMHhmZl0sXG4gIFsweDE3MGM0LCAweGIyLCAweGZmXSxcbiAgWzB4MTcwYzgsIDB4YjIsIDB4ZmZdLFxuICBbMHgxNzBjYywgMHhiMSwgMHhmZl0sXG4gIFsweDE3MGQwLCAweGIxLCAweGZmXSxcbiAgWzB4MTcwZDQsIDB4YjMsIDB4ZmZdLFxuICBbMHgxNzBkOCwgMHhiMywgMHhmZl0sXG4gIFsweDE3MGRjLCAweGI1LCAweGZmXSxcbiAgWzB4MTcwZTAsIDB4YjUsIDB4ZmZdLFxuICBbMHgxNzBlNCwgMHhiNSwgMHhmZl0sXG4gIFsweDE3MGU4LCAweGI1LCAweGZmXSxcbiAgLy8gTWFyayB1bnVzZWQgZW50cmFuY2VzIGluIFxuICAvLyBOb3JtYWxpemUgYXJ5bGxpcyBlbnRyYW5jZVxuICBbMHgxNzRlZSwgMHg4MCwgMHg4OF0sXG4gIC8vIE5vcm1hbGl6ZSBqb2VsIHNoZWQgYm90dG9tIGFuZCBzZWNyZXQgcGFzc2FnZSBlbnRyYW5jZXNcbiAgWzB4MTc3YzEsIDB4ODgsIDB4ODBdLFxuICBbMHgxNzdjNSwgMHg5OCwgMHhhMF0sXG4gIFsweDE3N2M3LCAweDU4LCAweDUwXSxcbiAgLy8gRml4IGJhZCBtdXNpYyBpbiB6b21iaWV0b3duIGhvdXNlczogJDEwIHNob3VsZCBiZSAkMDEuXG4gIFsweDE3ODJhLCAweDEwLCAweDAxXSxcbiAgWzB4MTc4NTcsIDB4MTAsIDB4MDFdLFxuICAvLyBOb3JtYWxpemUgc3dhbiBkYW5jZSBoYWxsIGVudHJhbmNlIHRvIGJlIGNvbnNpc3RlbnQgd2l0aCBzdG9tJ3MgaG91c2VcbiAgWzB4MTc5NTQsIDB4ODAsIDB4NzhdLFxuICAvLyBOb3JtYWxpemUgc2h5cm9uIGRvam8gZW50cmFuY2UgdG8gYmUgY29uc2lzdGVudCB3aXRoIHN0b20ncyBob3VzZVxuICBbMHgxNzlhMiwgMHg4MCwgMHg3OF0sXG4gIC8vIEZpeCBiYWQgc2NyZWVucyBpbiB0b3dlclxuICBbMHgxN2I4YSwgMHgwMCwgMHg0MF0sIC8vIHRvd2VyIDFcbiAgWzB4MTdiOTAsIDB4MDAsIDB4NDBdLFxuICBbMHgxN2JjZSwgMHgwMCwgMHg0MF0sIC8vIHRvd2VyIDJcbiAgWzB4MTdiZDQsIDB4MDAsIDB4NDBdLFxuICBbMHgxN2MwZSwgMHgwMCwgMHg0MF0sIC8vIHRvd2VyIDNcbiAgWzB4MTdjMTQsIDB4MDAsIDB4NDBdLFxuICBbMHgxN2M0ZSwgMHgwMCwgMHg0MF0sIC8vIHRvd2VyIDRcbiAgWzB4MTdjNTQsIDB4MDAsIDB4NDBdLFxuICAvLyBGaXggYmFkIHNwYXduIGluIE10IEh5ZHJhIChtYWtlIGl0IGFuIGV4dHJhIHB1ZGRsZSkuXG4gIFsweDE5ZjAyLCAweDQwLCAweDgwXSxcbiAgWzB4MTlmMDMsIDB4MzMsIDB4MzJdLFxuICAvLyBGaXggYmFkIHNwYXduIGluIFNhYmVyYSAyJ3MgbGV2ZWwgKHByb2JhYmx5IG1lYW50IHRvIGJlIGEgZmxhaWwgZ3V5KS5cbiAgWzB4MWExZTAsIDB4NDAsIDB4YzBdLCAvLyBtYWtlIHN1cmUgdG8gZml4IHBhdHRlcm4gc2xvdCwgdG9vIVxuICBbMHgxYTFlMSwgMHgzZCwgMHgzNF0sXG4gIC8vIFBvaW50IEFtYXpvbmVzIG91dGVyIGd1YXJkIHRvIHBvc3Qtb3ZlcmZsb3cgbWVzc2FnZSB0aGF0J3MgYWN0dWFsbHkgc2hvd24uXG4gIFsweDFjZjA1LCAweDQ3LCAweDQ4XSxcbiAgLy8gUmVtb3ZlIHN0cmF5IGZsaWdodCBncmFudGVyIGluIFpvbWJpZXRvd24uXG4gIFsweDFkMzExLCAweDIwLCAweGEwXSxcbiAgWzB4MWQzMTIsIDB4MzAsIDB4MDBdLFxuICAvLyBGaXggcXVlZW4ncyBkaWFsb2cgdG8gdGVybWluYXRlIG9uIGxhc3QgaXRlbSwgcmF0aGVyIHRoYW4gb3ZlcmZsb3csXG4gIC8vIHNvIHRoYXQgd2UgZG9uJ3QgcGFyc2UgZ2FyYmFnZS5cbiAgWzB4MWNmZjksIDB4NjAsIDB4ZTBdLFxuICAvLyBGaXggQW1hem9uZXMgb3V0ZXIgZ3VhcmQgbWVzc2FnZSB0byBub3Qgb3ZlcmZsb3cuXG4gIFsweDJjYTkwLCAweDAyLCAweDAwXSxcbiAgLy8gRml4IHNlZW1pbmdseS11bnVzZWQga2Vuc3UgbWVzc2FnZSAxZDoxNyBvdmVyZmxvd2luZyBpbnRvIDFkOjE4XG4gIFsweDJmNTczLCAweDAyLCAweDAwXSxcbiAgLy8gRml4IHVudXNlZCBrYXJtaW5lIHRyZWFzdXJlIGNoZXN0IG1lc3NhZ2UgMjA6MTguXG4gIFsweDJmYWU0LCAweDVmLCAweDAwXSxcbl0gYXMgY29uc3Q7XG4iXX0=