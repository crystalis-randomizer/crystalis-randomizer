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
                sink(loc.meta);
        }
        function sink(arg) { }
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
        writeAll(this.npcs);
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
            if (screen.id >= 0x100)
                continue;
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
    [0x13646, 0x02, 0x06],
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
    [0x16df7, 0x07, 0xff],
    [0x16dfb, 0x08, 0xff],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQWMsWUFBWSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFbEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFB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QUssTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksV0FBVyxFQUFFO1lBQy9DLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHO2dCQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQzFEO1FBaUJELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLElBQUksR0FB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ckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUdyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0NBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7QXNzZW1ibGVyfSBmcm9tICcuL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vYXNtL2Fzc2VtYmxlci5qcyc7XG5pbXBvcnQge0xpbmtlcn0gZnJvbSAnLi9hc20vbGlua2VyLmpzJztcbmltcG9ydCB7TW9kdWxlfSBmcm9tICcuL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtBZEhvY1NwYXdufSBmcm9tICcuL3JvbS9hZGhvY3NwYXduLmpzJztcbi8vaW1wb3J0IHtBcmVhc30gZnJvbSAnLi9yb20vYXJlYS5qcyc7XG5pbXBvcnQge0Jvc3NLaWxsfSBmcm9tICcuL3JvbS9ib3Nza2lsbC5qcyc7XG5pbXBvcnQge0Jvc3Nlc30gZnJvbSAnLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7Q29pbkRyb3BzfSBmcm9tICcuL3JvbS9jb2luZHJvcHMuanMnO1xuaW1wb3J0IHtGbGFnc30gZnJvbSAnLi9yb20vZmxhZ3MuanMnO1xuaW1wb3J0IHtIaXRib3h9IGZyb20gJy4vcm9tL2hpdGJveC5qcyc7XG5pbXBvcnQge0l0ZW1zfSBmcm9tICcuL3JvbS9pdGVtLmpzJztcbmltcG9ydCB7SXRlbUdldHN9IGZyb20gJy4vcm9tL2l0ZW1nZXQuanMnO1xuaW1wb3J0IHtMb2NhdGlvbnN9IGZyb20gJy4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZXN9IGZyb20gJy4vcm9tL21lc3NhZ2VzLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbnN9IGZyb20gJy4vcm9tL21ldGFzY3JlZW5zLmpzJztcbmltcG9ydCB7TWV0YXNwcml0ZX0gZnJvbSAnLi9yb20vbWV0YXNwcml0ZS5qcyc7XG5pbXBvcnQge01ldGF0aWxlc2V0LCBNZXRhdGlsZXNldHN9IGZyb20gJy4vcm9tL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9yb20vbW9uc3Rlci5qcyc7XG5pbXBvcnQge05wY3N9IGZyb20gJy4vcm9tL25wYy5qcyc7XG5pbXBvcnQge09iamVjdERhdGF9IGZyb20gJy4vcm9tL29iamVjdGRhdGEuanMnO1xuaW1wb3J0IHtPYmplY3RzfSBmcm9tICcuL3JvbS9vYmplY3RzLmpzJztcbmltcG9ydCB7Um9tT3B0aW9ufSBmcm9tICcuL3JvbS9vcHRpb24uanMnO1xuaW1wb3J0IHtQYWxldHRlfSBmcm9tICcuL3JvbS9wYWxldHRlLmpzJztcbmltcG9ydCB7UGF0dGVybn0gZnJvbSAnLi9yb20vcGF0dGVybi5qcyc7XG5pbXBvcnQge1JhbmRvbU51bWJlcnN9IGZyb20gJy4vcm9tL3JhbmRvbW51bWJlcnMuanMnO1xuaW1wb3J0IHtTY2FsaW5nfSBmcm9tICcuL3JvbS9zY2FsaW5nLmpzJztcbmltcG9ydCB7U2NyZWVuLCBTY3JlZW5zfSBmcm9tICcuL3JvbS9zY3JlZW4uanMnO1xuaW1wb3J0IHtTaG9wc30gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge1Nsb3RzfSBmcm9tICcuL3JvbS9zbG90cy5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtUZWxlcGF0aHl9IGZyb20gJy4vcm9tL3RlbGVwYXRoeS5qcyc7XG5pbXBvcnQge1RpbGVBbmltYXRpb259IGZyb20gJy4vcm9tL3RpbGVhbmltYXRpb24uanMnO1xuaW1wb3J0IHtUaWxlRWZmZWN0c30gZnJvbSAnLi9yb20vdGlsZWVmZmVjdHMuanMnO1xuaW1wb3J0IHtUaWxlc2V0c30gZnJvbSAnLi9yb20vdGlsZXNldC5qcyc7XG5pbXBvcnQge1Rvd25XYXJwfSBmcm9tICcuL3JvbS90b3dud2FycC5qcyc7XG5pbXBvcnQge1RyaWdnZXJ9IGZyb20gJy4vcm9tL3RyaWdnZXIuanMnO1xuaW1wb3J0IHtTZWdtZW50LCBoZXgsIHNlcSwgZnJlZX0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1dpbGRXYXJwfSBmcm9tICcuL3JvbS93aWxkd2FycC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi91bmlvbmZpbmQuanMnO1xuXG5jb25zdCB7JDBlLCAkMGYsICQxMH0gPSBTZWdtZW50O1xuXG4vLyBBIGtub3duIGxvY2F0aW9uIGZvciBkYXRhIGFib3V0IHN0cnVjdHVyYWwgY2hhbmdlcyB3ZSd2ZSBtYWRlIHRvIHRoZSByb20uXG4vLyBUaGUgdHJpY2sgaXMgdG8gZmluZCBhIHN1aXRhYmxlIHJlZ2lvbiBvZiBST00gdGhhdCdzIGJvdGggdW51c2VkICphbmQqXG4vLyBpcyBub3QgcGFydGljdWxhcmx5ICp1c2FibGUqIGZvciBvdXIgcHVycG9zZXMuICBUaGUgYm90dG9tIDMgcm93cyBvZiB0aGVcbi8vIHZhcmlvdXMgc2luZ2xlLXNjcmVlbiBtYXBzIGFyZSBhbGwgZWZmZWN0aXZlbHkgdW51c2VkLCBzbyB0aGF0IGdpdmVzIDQ4XG4vLyBieXRlcyBwZXIgbWFwLiAgU2hvcHMgKDE0MDAwLi4xNDJmZikgYWxzbyBoYXZlIGEgZ2lhbnQgYXJlYSB1cCB0b3AgdGhhdFxuLy8gY291bGQgcG9zc2libHkgYmUgdXNhYmxlLCB0aG91Z2ggd2UnZCBuZWVkIHRvIHRlYWNoIHRoZSB0aWxlLXJlYWRpbmcgY29kZVxuLy8gdG8gaWdub3JlIHdoYXRldmVyJ3Mgd3JpdHRlbiB0aGVyZSwgc2luY2UgaXQgKmlzKiB2aXNpYmxlIGJlZm9yZSB0aGUgbWVudVxuLy8gcG9wcyB1cC4gIFRoZXNlIGFyZSBiaWcgZW5vdWdoIHJlZ2lvbnMgdGhhdCB3ZSBjb3VsZCBldmVuIGNvbnNpZGVyIHVzaW5nXG4vLyB0aGVtIHZpYSBwYWdlLXN3YXBwaW5nIHRvIGdldCBleHRyYSBkYXRhIGluIGFyYml0cmFyeSBjb250ZXh0cy5cblxuLy8gU2hvcHMgYXJlIHBhcnRpY3VsYXJseSBuaWNlIGJlY2F1c2UgdGhleSdyZSBhbGwgMDAgaW4gdmFuaWxsYS5cbi8vIE90aGVyIHBvc3NpYmxlIHJlZ2lvbnM6XG4vLyAgIC0gNDggYnl0ZXMgYXQgJGZmYzAgKG1lemFtZSBzaHJpbmUpID0+ICRmZmUwIGlzIGFsbCAkZmYgaW4gdmFuaWxsYS5cblxuZXhwb3J0IGNsYXNzIFJvbSB7XG5cbiAgLy8gVGhlc2UgdmFsdWVzIGNhbiBiZSBxdWVyaWVkIHRvIGRldGVybWluZSBob3cgdG8gcGFyc2UgYW55IGdpdmVuIHJvbS5cbiAgLy8gVGhleSdyZSBhbGwgYWx3YXlzIHplcm8gZm9yIHZhbmlsbGFcbiAgc3RhdGljIHJlYWRvbmx5IE9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVggICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDApO1xuICBzdGF0aWMgcmVhZG9ubHkgT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYICAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMSk7XG4gIHN0YXRpYyByZWFkb25seSBDT01QUkVTU0VEX01BUERBVEEgICAgICAgICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfQ09VTlQgICAgICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMxKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNDQUxJTkdfTEVWRUxTICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFVOSVFVRV9JVEVNX1RBQkxFICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQwKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfREFUQV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQzKTtcbiAgc3RhdGljIHJlYWRvbmx5IFRFTEVQQVRIWV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQ2KTtcblxuICByZWFkb25seSBwcmc6IFVpbnQ4QXJyYXk7XG4gIHJlYWRvbmx5IGNocjogVWludDhBcnJheTtcblxuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBlbGltaW5hdGUgdGhlIGR1cGxpY2F0aW9uIGJ5IG1vdmluZ1xuICAvLyB0aGUgY3RvcnMgaGVyZSwgYnV0IHRoZXJlJ3MgbG90cyBvZiBwcmVyZXFzIGFuZCBkZXBlbmRlbmN5XG4gIC8vIG9yZGVyaW5nLCBhbmQgd2UgbmVlZCB0byBtYWtlIHRoZSBBREpVU1RNRU5UUywgZXRjLlxuICAvL3JlYWRvbmx5IGFyZWFzOiBBcmVhcztcbiAgcmVhZG9ubHkgc2NyZWVuczogU2NyZWVucztcbiAgcmVhZG9ubHkgdGlsZXNldHM6IFRpbGVzZXRzO1xuICByZWFkb25seSB0aWxlRWZmZWN0czogVGlsZUVmZmVjdHNbXTtcbiAgcmVhZG9ubHkgdHJpZ2dlcnM6IFRyaWdnZXJbXTtcbiAgcmVhZG9ubHkgcGF0dGVybnM6IFBhdHRlcm5bXTtcbiAgcmVhZG9ubHkgcGFsZXR0ZXM6IFBhbGV0dGVbXTtcbiAgcmVhZG9ubHkgbG9jYXRpb25zOiBMb2NhdGlvbnM7XG4gIHJlYWRvbmx5IHRpbGVBbmltYXRpb25zOiBUaWxlQW5pbWF0aW9uW107XG4gIHJlYWRvbmx5IGhpdGJveGVzOiBIaXRib3hbXTtcbiAgcmVhZG9ubHkgb2JqZWN0czogT2JqZWN0cztcbiAgcmVhZG9ubHkgYWRIb2NTcGF3bnM6IEFkSG9jU3Bhd25bXTtcbiAgcmVhZG9ubHkgbWV0YXNjcmVlbnM6IE1ldGFzY3JlZW5zO1xuICByZWFkb25seSBtZXRhc3ByaXRlczogTWV0YXNwcml0ZVtdO1xuICByZWFkb25seSBtZXRhdGlsZXNldHM6IE1ldGF0aWxlc2V0cztcbiAgcmVhZG9ubHkgaXRlbUdldHM6IEl0ZW1HZXRzO1xuICByZWFkb25seSBpdGVtczogSXRlbXM7XG4gIHJlYWRvbmx5IHNob3BzOiBTaG9wcztcbiAgcmVhZG9ubHkgc2xvdHM6IFNsb3RzO1xuICByZWFkb25seSBucGNzOiBOcGNzO1xuICByZWFkb25seSBib3NzS2lsbHM6IEJvc3NLaWxsW107XG4gIHJlYWRvbmx5IGJvc3NlczogQm9zc2VzO1xuICByZWFkb25seSB3aWxkV2FycDogV2lsZFdhcnA7XG4gIHJlYWRvbmx5IHRvd25XYXJwOiBUb3duV2FycDtcbiAgcmVhZG9ubHkgZmxhZ3M6IEZsYWdzO1xuICByZWFkb25seSBjb2luRHJvcHM6IENvaW5Ecm9wcztcbiAgcmVhZG9ubHkgc2NhbGluZzogU2NhbGluZztcbiAgcmVhZG9ubHkgcmFuZG9tTnVtYmVyczogUmFuZG9tTnVtYmVycztcblxuICByZWFkb25seSB0ZWxlcGF0aHk6IFRlbGVwYXRoeTtcbiAgcmVhZG9ubHkgbWVzc2FnZXM6IE1lc3NhZ2VzO1xuXG4gIHJlYWRvbmx5IG1vZHVsZXM6IE1vZHVsZVtdID0gW107XG5cbiAgc3BvaWxlcj86IFNwb2lsZXI7XG5cbiAgLy8gTk9URTogVGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzIG1heSBiZSBjaGFuZ2VkIGJldHdlZW4gcmVhZGluZyBhbmQgd3JpdGluZ1xuICAvLyB0aGUgcm9tLiAgSWYgdGhpcyBoYXBwZW5zLCB0aGUgd3JpdHRlbiByb20gd2lsbCBoYXZlIGRpZmZlcmVudCBvcHRpb25zLlxuICAvLyBUaGlzIGlzIGFuIGVmZmVjdGl2ZSB3YXkgdG8gY29udmVydCBiZXR3ZWVuIHR3byBzdHlsZXMuXG5cbiAgLy8gTWF4IG51bWJlciBvZiBzaG9wcy4gIFZhcmlvdXMgYmxvY2tzIG9mIG1lbW9yeSByZXF1aXJlIGtub3dpbmcgdGhpcyBudW1iZXJcbiAgLy8gdG8gYWxsb2NhdGUuXG4gIHNob3BDb3VudDogbnVtYmVyO1xuICAvLyBOdW1iZXIgb2Ygc2NhbGluZyBsZXZlbHMuICBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIHRoZSBzY2FsaW5nIHRhYmxlcy5cbiAgc2NhbGluZ0xldmVsczogbnVtYmVyO1xuXG4gIC8vIEFkZHJlc3MgdG8gcmVhZC93cml0ZSB0aGUgYml0ZmllbGQgaW5kaWNhdGluZyB1bmlxdWUgaXRlbXMuXG4gIHVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3M6IG51bWJlcjtcbiAgLy8gQWRkcmVzcyBvZiBub3JtYWxpemVkIHByaWNlcyB0YWJsZSwgaWYgcHJlc2VudC4gIElmIHRoaXMgaXMgYWJzZW50IHRoZW4gd2VcbiAgLy8gYXNzdW1lIHByaWNlcyBhcmUgbm90IG5vcm1hbGl6ZWQgYW5kIGFyZSBhdCB0aGUgbm9ybWFsIHBhd24gc2hvcCBhZGRyZXNzLlxuICBzaG9wRGF0YVRhYmxlc0FkZHJlc3M6IG51bWJlcjtcbiAgLy8gQWRkcmVzcyBvZiByZWFycmFuZ2VkIHRlbGVwYXRoeSB0YWJsZXMuXG4gIHRlbGVwYXRoeVRhYmxlc0FkZHJlc3M6IG51bWJlcjtcbiAgLy8gV2hldGhlciB0aGUgdHJhaWxpbmcgJGZmIHNob3VsZCBiZSBvbWl0dGVkIGZyb20gdGhlIEl0ZW1HZXREYXRhIHRhYmxlLlxuICBvbWl0SXRlbUdldERhdGFTdWZmaXg6IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdGhlIHRyYWlsaW5nIGJ5dGUgb2YgZWFjaCBMb2NhbERpYWxvZyBpcyBvbWl0dGVkLiAgVGhpcyBhZmZlY3RzXG4gIC8vIGJvdGggcmVhZGluZyBhbmQgd3JpdGluZyB0aGUgdGFibGUuICBNYXkgYmUgaW5mZXJyZWQgd2hpbGUgcmVhZGluZy5cbiAgb21pdExvY2FsRGlhbG9nU3VmZml4OiBib29sZWFuO1xuICAvLyBXaGV0aGVyIG1hcGRhdGEgaGFzIGJlZW4gY29tcHJlc3NlZC5cbiAgY29tcHJlc3NlZE1hcERhdGE6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Iocm9tOiBVaW50OEFycmF5KSB7XG4gICAgY29uc3QgcHJnU2l6ZSA9IHJvbVs0XSAqIDB4NDAwMDtcbiAgICAvLyBOT1RFOiBjaHJTaXplID0gcm9tWzVdICogMHgyMDAwO1xuICAgIGNvbnN0IHByZ1N0YXJ0ID0gMHgxMCArIChyb21bNl0gJiA0ID8gNTEyIDogMCk7XG4gICAgY29uc3QgcHJnRW5kID0gcHJnU3RhcnQgKyBwcmdTaXplO1xuICAgIHRoaXMucHJnID0gcm9tLnN1YmFycmF5KHByZ1N0YXJ0LCBwcmdFbmQpO1xuICAgIHRoaXMuY2hyID0gcm9tLnN1YmFycmF5KHByZ0VuZCk7XG5cbiAgICB0aGlzLnNob3BDb3VudCA9IFJvbS5TSE9QX0NPVU5ULmdldChyb20pO1xuICAgIHRoaXMuc2NhbGluZ0xldmVscyA9IFJvbS5TQ0FMSU5HX0xFVkVMUy5nZXQocm9tKTtcbiAgICB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBSb20uVU5JUVVFX0lURU1fVEFCTEUuZ2V0KHJvbSk7XG4gICAgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgPSBSb20uU0hPUF9EQVRBX1RBQkxFUy5nZXQocm9tKTtcbiAgICB0aGlzLnRlbGVwYXRoeVRhYmxlc0FkZHJlc3MgPSBSb20uVEVMRVBBVEhZX1RBQkxFUy5nZXQocm9tKTtcbiAgICB0aGlzLm9taXRJdGVtR2V0RGF0YVN1ZmZpeCA9IFJvbS5PTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYLmdldChyb20pO1xuICAgIHRoaXMub21pdExvY2FsRGlhbG9nU3VmZml4ID0gUm9tLk9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWC5nZXQocm9tKTtcbiAgICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gUm9tLkNPTVBSRVNTRURfTUFQREFUQS5nZXQocm9tKTtcblxuICAgIC8vIGlmIChjcmMzMihyb20pID09PSBFWFBFQ1RFRF9DUkMzMikge1xuICAgIGZvciAoY29uc3QgW2FkZHJlc3MsIG9sZCwgdmFsdWVdIG9mIEFESlVTVE1FTlRTKSB7XG4gICAgICBpZiAodGhpcy5wcmdbYWRkcmVzc10gPT09IG9sZCkgdGhpcy5wcmdbYWRkcmVzc10gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBMb2FkIHVwIGEgYnVuY2ggb2YgZGF0YSB0YWJsZXMuICBUaGlzIHdpbGwgaW5jbHVkZSBhIGxhcmdlIG51bWJlciBvZiB0aGVcbiAgICAvLyBkYXRhIHRhYmxlcyBpbiB0aGUgUk9NLiAgVGhlIGlkZWEgaXMgdGhhdCB3ZSBjYW4gZWRpdCB0aGUgYXJyYXlzIGxvY2FsbHlcbiAgICAvLyBhbmQgdGhlbiBoYXZlIGEgXCJjb21taXRcIiBmdW5jdGlvbiB0aGF0IHJlYnVpbGRzIHRoZSBST00gd2l0aCB0aGUgbmV3XG4gICAgLy8gYXJyYXlzLiAgV2UgbWF5IG5lZWQgdG8gd3JpdGUgYSBcInBhZ2VkIGFsbG9jYXRvclwiIHRoYXQgY2FuIGFsbG9jYXRlXG4gICAgLy8gY2h1bmtzIG9mIFJPTSBpbiBhIGdpdmVuIHBhZ2UuICBQcm9iYWJseSB3YW50IHRvIHVzZSBhIGdyZWVkeSBhbGdvcml0aG1cbiAgICAvLyB3aGVyZSB3ZSBzdGFydCB3aXRoIHRoZSBiaWdnZXN0IGNodW5rIGFuZCBwdXQgaXQgaW4gdGhlIHNtYWxsZXN0IHNwb3RcbiAgICAvLyB0aGF0IGZpdHMgaXQuICBQcmVzdW1hYmx5IHdlIGtub3cgdGhlIHNpemVzIHVwIGZyb250IGV2ZW4gYmVmb3JlIHdlIGhhdmVcbiAgICAvLyBhbGwgdGhlIGFkZHJlc3Nlcywgc28gd2UgY291bGQgZG8gYWxsIHRoZSBhbGxvY2F0aW9uIGF0IG9uY2UgLSBwcm9iYWJseVxuICAgIC8vIHJldHVybmluZyBhIHRva2VuIGZvciBlYWNoIGFsbG9jYXRpb24gYW5kIHRoZW4gYWxsIHRva2VucyBnZXQgZmlsbGVkIGluXG4gICAgLy8gYXQgb25jZSAoYWN0dWFsIHByb21pc2VzIHdvdWxkIGJlIG1vcmUgdW53ZWlsZHkpLlxuICAgIC8vIFRyaWNreSAtIHdoYXQgYWJvdXQgc2hhcmVkIGVsZW1lbnRzIG9mIGRhdGEgdGFibGVzIC0gd2UgcHVsbCB0aGVtXG4gICAgLy8gc2VwYXJhdGVseSwgYnV0IHdlJ2xsIG5lZWQgdG8gcmUtY29hbGVzY2UgdGhlbS4gIEJ1dCB0aGlzIHJlcXVpcmVzXG4gICAgLy8ga25vd2luZyB0aGVpciBjb250ZW50cyBCRUZPUkUgYWxsb2NhdGluZyB0aGVpciBzcGFjZS4gIFNvIHdlIG5lZWQgdHdvXG4gICAgLy8gYWxsb2NhdGUgbWV0aG9kcyAtIG9uZSB3aGVyZSB0aGUgY29udGVudCBpcyBrbm93biBhbmQgb25lIHdoZXJlIG9ubHkgdGhlXG4gICAgLy8gbGVuZ3RoIGlzIGtub3duLlxuICAgIHRoaXMudGlsZXNldHMgPSBuZXcgVGlsZXNldHModGhpcyk7XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHNlcSgxMSwgaSA9PiBuZXcgVGlsZUVmZmVjdHModGhpcywgaSArIDB4YjMpKTtcbiAgICB0aGlzLnNjcmVlbnMgPSBuZXcgU2NyZWVucyh0aGlzKTtcbiAgICB0aGlzLm1ldGF0aWxlc2V0cyA9IG5ldyBNZXRhdGlsZXNldHModGhpcyk7XG4gICAgdGhpcy5tZXRhc2NyZWVucyA9IG5ldyBNZXRhc2NyZWVucyh0aGlzKTtcbiAgICB0aGlzLnRyaWdnZXJzID0gc2VxKDB4NDMsIGkgPT4gbmV3IFRyaWdnZXIodGhpcywgMHg4MCB8IGkpKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gc2VxKHRoaXMuY2hyLmxlbmd0aCA+PiA0LCBpID0+IG5ldyBQYXR0ZXJuKHRoaXMsIGkpKTtcbiAgICB0aGlzLnBhbGV0dGVzID0gc2VxKDB4MTAwLCBpID0+IG5ldyBQYWxldHRlKHRoaXMsIGkpKTtcbiAgICB0aGlzLmxvY2F0aW9ucyA9IG5ldyBMb2NhdGlvbnModGhpcyk7XG4gICAgdGhpcy50aWxlQW5pbWF0aW9ucyA9IHNlcSg0LCBpID0+IG5ldyBUaWxlQW5pbWF0aW9uKHRoaXMsIGkpKTtcbiAgICB0aGlzLmhpdGJveGVzID0gc2VxKDI0LCBpID0+IG5ldyBIaXRib3godGhpcywgaSkpO1xuICAgIHRoaXMub2JqZWN0cyA9IG5ldyBPYmplY3RzKHRoaXMpO1xuICAgIHRoaXMuYWRIb2NTcGF3bnMgPSBzZXEoMHg2MCwgaSA9PiBuZXcgQWRIb2NTcGF3bih0aGlzLCBpKSk7XG4gICAgdGhpcy5tZXRhc3ByaXRlcyA9IHNlcSgweDEwMCwgaSA9PiBuZXcgTWV0YXNwcml0ZSh0aGlzLCBpKSk7XG4gICAgdGhpcy5tZXNzYWdlcyA9IG5ldyBNZXNzYWdlcyh0aGlzKTtcbiAgICB0aGlzLnRlbGVwYXRoeSA9IG5ldyBUZWxlcGF0aHkodGhpcyk7XG4gICAgdGhpcy5pdGVtR2V0cyA9IG5ldyBJdGVtR2V0cyh0aGlzKTtcbiAgICB0aGlzLml0ZW1zID0gbmV3IEl0ZW1zKHRoaXMpO1xuICAgIHRoaXMuc2hvcHMgPSBuZXcgU2hvcHModGhpcyk7IC8vIE5PVEU6IGRlcGVuZHMgb24gbG9jYXRpb25zIGFuZCBvYmplY3RzXG4gICAgdGhpcy5zbG90cyA9IG5ldyBTbG90cyh0aGlzKTtcbiAgICB0aGlzLm5wY3MgPSBuZXcgTnBjcyh0aGlzKTtcbiAgICB0aGlzLmJvc3NLaWxscyA9IHNlcSgweGUsIGkgPT4gbmV3IEJvc3NLaWxsKHRoaXMsIGkpKTtcbiAgICB0aGlzLndpbGRXYXJwID0gbmV3IFdpbGRXYXJwKHRoaXMpO1xuICAgIHRoaXMudG93bldhcnAgPSBuZXcgVG93bldhcnAodGhpcyk7XG4gICAgdGhpcy5jb2luRHJvcHMgPSBuZXcgQ29pbkRyb3BzKHRoaXMpO1xuICAgIHRoaXMuZmxhZ3MgPSBuZXcgRmxhZ3ModGhpcyk7XG4gICAgdGhpcy5ib3NzZXMgPSBuZXcgQm9zc2VzKHRoaXMpOyAvLyBOT1RFOiBtdXN0IGJlIGFmdGVyIE5wY3MgYW5kIEZsYWdzXG4gICAgdGhpcy5zY2FsaW5nID0gbmV3IFNjYWxpbmcodGhpcyk7XG4gICAgdGhpcy5yYW5kb21OdW1iZXJzID0gbmV3IFJhbmRvbU51bWJlcnModGhpcyk7XG5cbiAgICAvLyAvLyBUT0RPIC0gY29uc2lkZXIgcG9wdWxhdGluZyB0aGlzIGxhdGVyP1xuICAgIC8vIC8vIEhhdmluZyB0aGlzIGF2YWlsYWJsZSBtYWtlcyBpdCBlYXNpZXIgdG8gc2V0IGV4aXRzLCBldGMuXG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmIChsb2MudXNlZCkgc2luayhsb2MubWV0YSk7IC8vIHRyaWdnZXIgdGhlIGdldHRlclxuICAgIH1cbiAgICBmdW5jdGlvbiBzaW5rKGFyZzogdW5rbm93bikge31cbiAgfVxuXG4gIHRyaWdnZXIoaWQ6IG51bWJlcik6IFRyaWdnZXIge1xuICAgIGlmIChpZCA8IDB4ODAgfHwgaWQgPiAweGZmKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCB0cmlnZ2VyIGlkICQke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHRoaXMudHJpZ2dlcnNbaWQgJiAweDdmXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBjcm9zcy1yZWZlcmVuY2UgbW9uc3RlcnMvbWV0YXNwcml0ZXMvbWV0YXRpbGVzL3NjcmVlbnMgd2l0aCBwYXR0ZXJucy9wYWxldHRlc1xuICAvLyBnZXQgbW9uc3RlcnMoKTogT2JqZWN0RGF0YVtdIHtcbiAgLy8gICBjb25zdCBtb25zdGVycyA9IG5ldyBTZXQ8T2JqZWN0RGF0YT4oKTtcbiAgLy8gICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgLy8gICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gIC8vICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgLy8gICAgICAgaWYgKG8uaXNNb25zdGVyKCkpIG1vbnN0ZXJzLmFkZCh0aGlzLm9iamVjdHNbby5tb25zdGVySWRdKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIFsuLi5tb25zdGVyc10uc29ydCgoeCwgeSkgPT4gKHguaWQgLSB5LmlkKSk7XG4gIC8vIH1cblxuICBnZXQgcHJvamVjdGlsZXMoKTogT2JqZWN0RGF0YVtdIHtcbiAgICBjb25zdCBwcm9qZWN0aWxlcyA9IG5ldyBTZXQ8T2JqZWN0RGF0YT4oKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgdGhpcy5vYmplY3RzLmZpbHRlcihvID0+IG8gaW5zdGFuY2VvZiBNb25zdGVyKSkge1xuICAgICAgaWYgKG0uY2hpbGQpIHtcbiAgICAgICAgcHJvamVjdGlsZXMuYWRkKHRoaXMub2JqZWN0c1t0aGlzLmFkSG9jU3Bhd25zW20uY2hpbGRdLm9iamVjdElkXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbLi4ucHJvamVjdGlsZXNdLnNvcnQoKHgsIHkpID0+ICh4LmlkIC0geS5pZCkpO1xuICB9XG5cbiAgZ2V0IG1vbnN0ZXJHcmFwaGljcygpIHtcbiAgICBjb25zdCBnZng6IHtbaWQ6IHN0cmluZ106XG4gICAgICAgICAgICAgICAge1tpbmZvOiBzdHJpbmddOlxuICAgICAgICAgICAgICAgICB7c2xvdDogbnVtYmVyLCBwYXQ6IG51bWJlciwgcGFsOiBudW1iZXJ9fX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgICAgICAgaWYgKCEoby5kYXRhWzJdICYgNykpIHtcbiAgICAgICAgICBjb25zdCBzbG90ID0gby5kYXRhWzJdICYgMHg4MCA/IDEgOiAwO1xuICAgICAgICAgIGNvbnN0IGlkID0gaGV4KG8uZGF0YVszXSArIDB4NTApO1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBnZnhbaWRdID0gZ2Z4W2lkXSB8fCB7fTtcbiAgICAgICAgICBkYXRhW2Ake3Nsb3R9OiR7bC5zcHJpdGVQYXR0ZXJuc1tzbG90XS50b1N0cmluZygxNil9OiR7XG4gICAgICAgICAgICAgICBsLnNwcml0ZVBhbGV0dGVzW3Nsb3RdLnRvU3RyaW5nKDE2KX1gXVxuICAgICAgICAgICAgPSB7cGFsOiBsLnNwcml0ZVBhbGV0dGVzW3Nsb3RdLFxuICAgICAgICAgICAgICAgcGF0OiBsLnNwcml0ZVBhdHRlcm5zW3Nsb3RdLFxuICAgICAgICAgICAgICAgc2xvdCxcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZ2Z4O1xuICB9XG5cbiAgZ2V0IGxvY2F0aW9uTW9uc3RlcnMoKSB7XG4gICAgY29uc3QgbToge1tpZDogc3RyaW5nXToge1tpbmZvOiBzdHJpbmddOiBudW1iZXJ9fSA9IHt9O1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgICAgIC8vIHdoaWNoIG1vbnN0ZXJzIGFyZSBpbiB3aGljaCBzbG90cz9cbiAgICAgIGNvbnN0IHM6IHtbaW5mbzogc3RyaW5nXTogbnVtYmVyfSA9IG1bJyQnICsgaGV4KGwuaWQpXSA9IHt9O1xuICAgICAgZm9yIChjb25zdCBvIG9mIGwuc3Bhd25zKSB7XG4gICAgICAgIGlmICghKG8uZGF0YVsyXSAmIDcpKSB7XG4gICAgICAgICAgY29uc3Qgc2xvdCA9IG8uZGF0YVsyXSAmIDB4ODAgPyAxIDogMDtcbiAgICAgICAgICBjb25zdCBpZCA9IG8uZGF0YVszXSArIDB4NTA7XG4gICAgICAgICAgc1tgJHtzbG90fToke2lkLnRvU3RyaW5nKDE2KX1gXSA9XG4gICAgICAgICAgICAgIChzW2Ake3Nsb3R9OiR7aWQudG9TdHJpbmcoMTYpfWBdIHx8IDApICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBmb3IgZWFjaCBzcHJpdGUgcGF0dGVybiB0YWJsZSwgZmluZCBhbGwgdGhlIHBhbGV0dGVzIHRoYXQgaXQgdXNlcy5cbiAgLy8gRmluZCBhbGwgdGhlIG1vbnN0ZXJzIG9uIGl0LiAgV2UgY2FuIHByb2JhYmx5IGFsbG93IGFueSBwYWxldHRlIHNvIGxvbmdcbiAgLy8gYXMgb25lIG9mIHRoZSBwYWxldHRlcyBpcyB1c2VkIHdpdGggdGhhdCBwYXR0ZXJuLlxuICAvLyBUT0RPIC0gbWF4IG51bWJlciBvZiBpbnN0YW5jZXMgb2YgYSBtb25zdGVyIG9uIGFueSBtYXAgLSBpLmUuIGF2b2lkIGhhdmluZ1xuICAvLyBmaXZlIGZseWVycyBvbiB0aGUgc2FtZSBtYXAhXG5cbiAgLy8gNDYwIC0gMCBtZWFucyBlaXRoZXIgZmx5ZXIgb3Igc3RhdGlvbmFyeVxuICAvLyAgICAgICAgICAgLSBzdGF0aW9uYXJ5IGhhcyA0YTAgfiAyMDQsMjA1LDIwNlxuICAvLyAgICAgICAgICAgICAoa3Jha2VuLCBzd2FtcCBwbGFudCwgc29yY2Vyb3IpXG4gIC8vICAgICAgIDYgLSBtaW1pY1xuICAvLyAgICAgICAxZiAtIHN3aW1tZXJcbiAgLy8gICAgICAgNTQgLSB0b21hdG8gYW5kIGJpcmRcbiAgLy8gICAgICAgNTUgLSBzd2ltbWVyXG4gIC8vICAgICAgIDU3IC0gbm9ybWFsXG4gIC8vICAgICAgIDVmIC0gYWxzbyBub3JtYWwsIGJ1dCBtZWR1c2EgaGVhZCBpcyBmbHllcj9cbiAgLy8gICAgICAgNzcgLSBzb2xkaWVycywgaWNlIHpvbWJpZVxuXG4vLyAgIC8vIERvbid0IHdvcnJ5IGFib3V0IG90aGVyIGRhdGFzIHlldFxuLy8gICB3cml0ZU9iamVjdERhdGEoKSB7XG4vLyAgICAgLy8gYnVpbGQgdXAgYSBtYXAgZnJvbSBhY3R1YWwgZGF0YSB0byBpbmRleGVzIHRoYXQgcG9pbnQgdG8gaXRcbi8vICAgICBsZXQgYWRkciA9IDB4MWFlMDA7XG4vLyAgICAgY29uc3QgZGF0YXMgPSB7fTtcbi8vICAgICBmb3IgKGNvbnN0IG9iamVjdCBvZiB0aGlzLm9iamVjdHMpIHtcbi8vICAgICAgIGNvbnN0IHNlciA9IG9iamVjdC5zZXJpYWxpemUoKTtcbi8vICAgICAgIGNvbnN0IGRhdGEgPSBzZXIuam9pbignICcpO1xuLy8gICAgICAgaWYgKGRhdGEgaW4gZGF0YXMpIHtcbi8vIC8vY29uc29sZS5sb2coYCQke29iamVjdC5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKX06IFJldXNpbmcgZXhpc3RpbmcgZGF0YSAkJHtkYXRhc1tkYXRhXS50b1N0cmluZygxNil9YCk7XG4vLyAgICAgICAgIG9iamVjdC5vYmplY3REYXRhQmFzZSA9IGRhdGFzW2RhdGFdO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgb2JqZWN0Lm9iamVjdERhdGFCYXNlID0gYWRkcjtcbi8vICAgICAgICAgZGF0YXNbZGF0YV0gPSBhZGRyO1xuLy8gLy9jb25zb2xlLmxvZyhgJCR7b2JqZWN0LmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApfTogRGF0YSBpcyBhdCAkJHtcbi8vIC8vICAgICAgICAgICAgIGFkZHIudG9TdHJpbmcoMTYpfTogJHtBcnJheS5mcm9tKHNlciwgeD0+JyQnK3gudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCkpLmpvaW4oJywnKX1gKTtcbi8vICAgICAgICAgYWRkciArPSBzZXIubGVuZ3RoO1xuLy8gLy8gc2VlZCAzNTE3ODExMDM2XG4vLyAgICAgICB9XG4vLyAgICAgICBvYmplY3Qud3JpdGUoKTtcbi8vICAgICB9XG4vLyAvL2NvbnNvbGUubG9nKGBXcm90ZSBvYmplY3QgZGF0YSBmcm9tICQxYWMwMCB0byAkJHthZGRyLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg1LCAwKVxuLy8gLy8gICAgICAgICAgICAgfSwgc2F2aW5nICR7MHgxYmU5MSAtIGFkZHJ9IGJ5dGVzLmApO1xuLy8gICAgIHJldHVybiBhZGRyO1xuLy8gICB9XG5cbiAgYXNzZW1ibGVyKCk6IEFzc2VtYmxlciB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIHNldHRpbmcgYSBzZWdtZW50IHByZWZpeFxuICAgIHJldHVybiBuZXcgQXNzZW1ibGVyKCk7XG4gIH1cblxuICB3cml0ZURhdGEoZGF0YSA9IHRoaXMucHJnKSB7XG4gICAgLy8gV3JpdGUgdGhlIG9wdGlvbnMgZmlyc3RcbiAgICAvLyBjb25zdCB3cml0ZXIgPSBuZXcgV3JpdGVyKHRoaXMuY2hyKTtcbiAgICAvLyB3cml0ZXIubW9kdWxlcy5wdXNoKC4uLnRoaXMubW9kdWxlcyk7XG4gICAgLy8gTWFwRGF0YVxuICAgIC8vd3JpdGVyLmFsbG9jKDB4MTQ0ZjgsIDB4MTdlMDApO1xuICAgIC8vIE5wY0RhdGFcbiAgICAvLyBOT1RFOiAxOTNmOSBpcyBhc3N1bWluZyAkZmIgaXMgdGhlIGxhc3QgbG9jYXRpb24gSUQuICBJZiB3ZSBhZGQgbW9yZSBsb2NhdGlvbnMgYXRcbiAgICAvLyB0aGUgZW5kIHRoZW4gd2UnbGwgbmVlZCB0byBwdXNoIHRoaXMgYmFjayBhIGZldyBtb3JlIGJ5dGVzLiAgV2UgY291bGQgcG9zc2libHlcbiAgICAvLyBkZXRlY3QgdGhlIGJhZCB3cml0ZSBhbmQgdGhyb3cgYW4gZXJyb3IsIGFuZC9vciBjb21wdXRlIHRoZSBtYXggbG9jYXRpb24gSUQuXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxOTNmOSwgMHgxYWMwMCk7XG4gICAgLy8gT2JqZWN0RGF0YSAoaW5kZXggYXQgMWFjMDAuLjFhZTAwKVxuICAgIC8vd3JpdGVyLmFsbG9jKDB4MWFlMDAsIDB4MWJkMDApOyAvLyBzYXZlIDUxMiBieXRlcyBhdCBlbmQgZm9yIHNvbWUgZXh0cmEgY29kZVxuICAgIGNvbnN0IGEgPSB0aGlzLmFzc2VtYmxlcigpO1xuICAgIC8vIE5wY1NwYXduQ29uZGl0aW9uc1xuICAgIGZyZWUoYSwgJDBlLCAweDg3N2EsIDB4ODk1ZCk7XG4gICAgLy8gTnBjRGlhbG9nXG4gICAgZnJlZShhLCAkMGUsIDB4OGFlNSwgMHg5OGY0KTtcbiAgICAvLyBJdGVtR2V0RGF0YSAodG8gMWUwNjUpICsgSXRlbVVzZURhdGFcbiAgICBmcmVlKGEsICQwZSwgMHg5ZGU2LCAweGEwMDApO1xuICAgIGZyZWUoYSwgJDBmLCAweGEwMDAsIDB4YTEwNik7XG4gICAgLy8gVHJpZ2dlckRhdGFcbiAgICAvLyBOT1RFOiBUaGVyZSdzIHNvbWUgZnJlZSBzcGFjZSBhdCAxZTNjMC4uMWUzZjAsIGJ1dCB3ZSB1c2UgdGhpcyBmb3IgdGhlXG4gICAgLy8gQ2hlY2tCZWxvd0Jvc3MgdHJpZ2dlcnMuXG4gICAgZnJlZShhLCAkMGYsIDB4YTIwMCwgMHhhM2MwKTtcbiAgICAvLyBJdGVtTWVudU5hbWVcbiAgICBmcmVlKGEsICQxMCwgMHg5MTFhLCAweDk0NjgpO1xuICAgIC8vIGtlZXAgaXRlbSAkNDkgXCIgICAgICAgIFwiIHdoaWNoIGlzIGFjdHVhbGx5IHVzZWQgc29tZXdoZXJlP1xuICAgIC8vIHdyaXRlci5hbGxvYygweDIxNDcxLCAweDIxNGYxKTsgLy8gVE9ETyAtIGRvIHdlIG5lZWQgYW55IG9mIHRoaXM/XG4gICAgLy8gSXRlbU1lc3NhZ2VOYW1lXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjhlODEsIDB4MjkyMmIpOyAvLyBOT1RFOiB1bmNvdmVyZWQgdGhydSAyOTQwMFxuICAgIC8vIHdyaXRlci5hbGxvYygweDI5MjJiLCAweDI5NDAwKTsgLy8gVE9ETyAtIG5lZWRlZD9cbiAgICAvLyBOT1RFOiBvbmNlIHdlIHJlbGVhc2UgdGhlIG90aGVyIG1lc3NhZ2UgdGFibGVzLCB0aGlzIHdpbGwganVzdCBiZSBvbmUgZ2lhbnQgYmxvY2suXG5cbiAgICAvLyBNZXNzYWdlIHRhYmxlIHBhcnRzXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjgwMDAsIDB4MjgzZmUpO1xuICAgIC8vIE1lc3NhZ2UgdGFibGVzXG4gICAgLy8gVE9ETyAtIHdlIGRvbid0IHVzZSB0aGUgd3JpdGVyIHRvIGFsbG9jYXRlIHRoZSBhYmJyZXZpYXRpb24gdGFibGVzLCBidXQgd2UgY291bGRcbiAgICAvL3dyaXRlci5mcmVlKCcweDJhMDAwLCAweDJmYzAwKTtcblxuICAgIC8vIGlmICh0aGlzLnRlbGVwYXRoeVRhYmxlc0FkZHJlc3MpIHtcbiAgICAvLyAgIHdyaXRlci5hbGxvYygweDFkOGY0LCAweDFkYjAwKTsgLy8gbG9jYXRpb24gdGFibGUgYWxsIHRoZSB3YXkgdGhydSBtYWluXG4gICAgLy8gfSBlbHNlIHtcbiAgICAvLyAgIHdyaXRlci5hbGxvYygweDFkYTRjLCAweDFkYjAwKTsgLy8gZXhpc3RpbmcgbWFpbiB0YWJsZSBpcyBoZXJlLlxuICAgIC8vIH1cblxuICAgIGNvbnN0IG1vZHVsZXMgPSBbLi4udGhpcy5tb2R1bGVzLCBhLm1vZHVsZSgpXTtcbiAgICBjb25zdCB3cml0ZUFsbCA9ICh3cml0YWJsZXM6IEl0ZXJhYmxlPHt3cml0ZSgpOiBNb2R1bGVbXX0+KSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IHcgb2Ygd3JpdGFibGVzKSB7XG4gICAgICAgIG1vZHVsZXMucHVzaCguLi53LndyaXRlKCkpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMubG9jYXRpb25zLndyaXRlKCkpO1xuICAgIHdyaXRlQWxsKHRoaXMub2JqZWN0cyk7XG4gICAgd3JpdGVBbGwodGhpcy5oaXRib3hlcyk7XG4gICAgd3JpdGVBbGwodGhpcy50cmlnZ2Vycyk7XG4gICAgd3JpdGVBbGwodGhpcy5ucGNzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRpbGVzZXRzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRpbGVFZmZlY3RzKTtcbiAgICB3cml0ZUFsbCh0aGlzLmFkSG9jU3Bhd25zKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5pdGVtR2V0cy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zbG90cy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5pdGVtcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zaG9wcy53cml0ZSgpKTtcbiAgICB3cml0ZUFsbCh0aGlzLmJvc3NLaWxscyk7XG4gICAgd3JpdGVBbGwodGhpcy5wYXR0ZXJucyk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMud2lsZFdhcnAud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMudG93bldhcnAud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuY29pbkRyb3BzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNjYWxpbmcud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuYm9zc2VzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnJhbmRvbU51bWJlcnMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMudGVsZXBhdGh5LndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLm1lc3NhZ2VzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNjcmVlbnMud3JpdGUoKSk7XG5cbiAgICAvLyBSZXNlcnZlIHRoZSBnbG9iYWwgc3BhY2UgMTQyYzAuLi4xNDJmMCA/Pz9cbiAgICAvLyBjb25zdCB0aGlzLmFzc2VtYmxlcigpLlxuXG4gICAgY29uc3QgbGlua2VyID0gbmV3IExpbmtlcigpO1xuICAgIGxpbmtlci5iYXNlKHRoaXMucHJnLCAwKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgbW9kdWxlcykge1xuICAgICAgbGlua2VyLnJlYWQobSk7XG4gICAgfVxuICAgIGNvbnN0IG91dCA9IGxpbmtlci5saW5rKCk7XG4gICAgb3V0LmFwcGx5KGRhdGEpO1xuICAgIGlmIChkYXRhICE9PSB0aGlzLnByZykgcmV0dXJuOyAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cFxuICAgIC8vbGlua2VyLnJlcG9ydCgpO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBsaW5rZXIuZXhwb3J0cygpO1xuXG4gICAgXG4gICAgdGhpcy51bmlxdWVJdGVtVGFibGVBZGRyZXNzID0gZXhwb3J0cy5nZXQoJ0tleUl0ZW1EYXRhJykhLm9mZnNldCE7XG4gICAgdGhpcy5zaG9wQ291bnQgPSAxMTtcbiAgICB0aGlzLnNob3BEYXRhVGFibGVzQWRkcmVzcyA9IGV4cG9ydHMuZ2V0KCdTaG9wRGF0YScpPy5vZmZzZXQgfHwgMDtcbiAgICAvLyBEb24ndCBpbmNsdWRlIHRoZXNlIGluIHRoZSBsaW5rZXI/Pz9cbiAgICBSb20uU0hPUF9DT1VOVC5zZXQodGhpcy5wcmcsIHRoaXMuc2hvcENvdW50KTtcbiAgICBSb20uU0NBTElOR19MRVZFTFMuc2V0KHRoaXMucHJnLCB0aGlzLnNjYWxpbmdMZXZlbHMpO1xuICAgIFJvbS5VTklRVUVfSVRFTV9UQUJMRS5zZXQodGhpcy5wcmcsIHRoaXMudW5pcXVlSXRlbVRhYmxlQWRkcmVzcyk7XG4gICAgUm9tLlNIT1BfREFUQV9UQUJMRVMuc2V0KHRoaXMucHJnLCB0aGlzLnNob3BEYXRhVGFibGVzQWRkcmVzcyB8fCAwKTtcbiAgICBSb20uT01JVF9JVEVNX0dFVF9EQVRBX1NVRkZJWC5zZXQodGhpcy5wcmcsIHRoaXMub21pdEl0ZW1HZXREYXRhU3VmZml4KTtcbiAgICBSb20uT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYLnNldCh0aGlzLnByZywgdGhpcy5vbWl0TG9jYWxEaWFsb2dTdWZmaXgpO1xuICAgIFJvbS5DT01QUkVTU0VEX01BUERBVEEuc2V0KHRoaXMucHJnLCB0aGlzLmNvbXByZXNzZWRNYXBEYXRhKTtcbiAgfVxuXG4gIGFuYWx5emVUaWxlcygpIHtcbiAgICAvLyBGb3IgYW55IGdpdmVuIHRpbGUgaW5kZXgsIHdoYXQgc2NyZWVucyBkb2VzIGl0IGFwcGVhciBvbi5cbiAgICAvLyBGb3IgdGhvc2Ugc2NyZWVucywgd2hpY2ggdGlsZXNldHMgZG9lcyAqaXQqIGFwcGVhciBvbi5cbiAgICAvLyBUaGF0IHRpbGUgSUQgaXMgbGlua2VkIGFjcm9zcyBhbGwgdGhvc2UgdGlsZXNldHMuXG4gICAgLy8gRm9ybXMgYSBwYXJ0aXRpb25pbmcgZm9yIGVhY2ggdGlsZSBJRCA9PiB1bmlvbi1maW5kLlxuICAgIC8vIEdpdmVuIHRoaXMgcGFydGl0aW9uaW5nLCBpZiBJIHdhbnQgdG8gbW92ZSBhIHRpbGUgb24gYSBnaXZlblxuICAgIC8vIHRpbGVzZXQsIGFsbCBJIG5lZWQgdG8gZG8gaXMgZmluZCBhbm90aGVyIHRpbGUgSUQgd2l0aCB0aGVcbiAgICAvLyBzYW1lIHBhcnRpdGlvbiBhbmQgc3dhcCB0aGVtP1xuXG4gICAgLy8gTW9yZSBnZW5lcmFsbHksIHdlIGNhbiBqdXN0IHBhcnRpdGlvbiB0aGUgdGlsZXNldHMuXG5cbiAgICAvLyBGb3IgZWFjaCBzY3JlZW4sIGZpbmQgYWxsIHRpbGVzZXRzIFQgZm9yIHRoYXQgc2NyZWVuXG4gICAgLy8gVGhlbiBmb3IgZWFjaCB0aWxlIG9uIHRoZSBzY3JlZW4sIHVuaW9uIFQgZm9yIHRoYXQgdGlsZS5cblxuICAgIC8vIEdpdmVuIGEgdGlsZXNldCBhbmQgYSBtZXRhdGlsZSBJRCwgZmluZCBhbGwgdGhlIHNjcmVlbnMgdGhhdCAoMSkgYXJlIHJlbmRlcmVkXG4gICAgLy8gd2l0aCB0aGF0IHRpbGVzZXQsIGFuZCAoYikgdGhhdCBjb250YWluIHRoYXQgbWV0YXRpbGU7IHRoZW4gZmluZCBhbGwgKm90aGVyKlxuICAgIC8vIHRpbGVzZXRzIHRoYXQgdGhvc2Ugc2NyZWVucyBhcmUgZXZlciByZW5kZXJlZCB3aXRoLlxuXG4gICAgLy8gR2l2ZW4gYSBzY3JlZW4sIGZpbmQgYWxsIGF2YWlsYWJsZSBtZXRhdGlsZSBJRHMgdGhhdCBjb3VsZCBiZSBhZGRlZCB0byBpdFxuICAgIC8vIHdpdGhvdXQgY2F1c2luZyBwcm9ibGVtcyB3aXRoIG90aGVyIHNjcmVlbnMgdGhhdCBzaGFyZSBhbnkgdGlsZXNldHMuXG4gICAgLy8gIC0+IHVudXNlZCAob3IgdXNlZCBidXQgc2hhcmVkIGV4Y2x1c2l2ZWx5KSBhY3Jvc3MgYWxsIHRpbGVzZXRzIHRoZSBzY3JlZW4gbWF5IHVzZVxuXG4gICAgLy8gV2hhdCBJIHdhbnQgZm9yIHN3YXBwaW5nIGlzIHRoZSBmb2xsb3dpbmc6XG4gICAgLy8gIDEuIGZpbmQgYWxsIHNjcmVlbnMgSSB3YW50IHRvIHdvcmsgb24gPT4gdGlsZXNldHNcbiAgICAvLyAgMi4gZmluZCB1bnVzZWQgZmxhZ2dhYmJsZSB0aWxlcyBpbiB0aGUgaGFyZGVzdCBvbmUsXG4gICAgLy8gICAgIHdoaWNoIGFyZSBhbHNvIElTT0xBVEVEIGluIHRoZSBvdGhlcnMuXG4gICAgLy8gIDMuIHdhbnQgdGhlc2UgdGlsZXMgdG8gYmUgdW51c2VkIGluIEFMTCByZWxldmFudCB0aWxlc2V0c1xuICAgIC8vICA0LiB0byBtYWtlIHRoaXMgc28sIGZpbmQgKm90aGVyKiB1bnVzZWQgZmxhZ2dhYmxlIHRpbGVzIGluIG90aGVyIHRpbGVzZXRzXG4gICAgLy8gIDUuIHN3YXAgdGhlIHVudXNlZCB3aXRoIHRoZSBpc29sYXRlZCB0aWxlcyBpbiB0aGUgb3RoZXIgdGlsZXNldHNcblxuICAgIC8vIENhdmVzOlxuICAgIC8vICAwYTogICAgICA5MCAvIDljXG4gICAgLy8gIDE1OiA4MCAvIDkwIC8gOWNcbiAgICAvLyAgMTk6ICAgICAgOTAgICAgICAod2lsbCBhZGQgdG8gODA/KVxuICAgIC8vICAzZTogICAgICA5MFxuICAgIC8vXG4gICAgLy8gSWRlYWxseSB3ZSBjb3VsZCByZXVzZSA4MCdzIDEvMi8zLzQgZm9yIHRoaXNcbiAgICAvLyAgMDE6IDkwIHwgOTQgOWNcbiAgICAvLyAgMDI6IDkwIHwgOTQgOWNcbiAgICAvLyAgMDM6ICAgICAgOTQgOWNcbiAgICAvLyAgMDQ6IDkwIHwgOTQgOWNcbiAgICAvL1xuICAgIC8vIE5lZWQgNCBvdGhlciBmbGFnZ2FibGUgdGlsZSBpbmRpY2VzIHdlIGNhbiBzd2FwIHRvP1xuICAgIC8vICAgOTA6ID0+ICgxLDIgbmVlZCBmbGFnZ2FibGU7IDMgdW51c2VkOyA0IGFueSkgPT4gMDcsIDBlLCAxMCwgMTIsIDEzLCAuLi4sIDIwLCAyMSwgMjIsIC4uLlxuICAgIC8vICAgOTQgOWM6ID0+IGRvbid0IG5lZWQgYW55IGZsYWdnYWJsZSA9PiAwNSwgM2MsIDY4LCA4MywgODgsIDg5LCA4YSwgOTAsIC4uLlxuICB9XG5cbiAgZGlzam9pbnRUaWxlc2V0cygpIHtcbiAgICBjb25zdCB0aWxlc2V0QnlTY3JlZW46IEFycmF5PFNldDxudW1iZXI+PiA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWxvYy51c2VkKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHRpbGVzZXQgPSBsb2MudGlsZXNldDtcbiAgICAgIC8vY29uc3QgZXh0ID0gbG9jLnNjcmVlblBhZ2U7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygcm93KSB7XG4gICAgICAgICAgKHRpbGVzZXRCeVNjcmVlbltzXSB8fCAodGlsZXNldEJ5U2NyZWVuW3NdID0gbmV3IFNldCgpKSkuYWRkKHRpbGVzZXQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRpbGVzID0gc2VxKDI1NiwgKCkgPT4gbmV3IFVuaW9uRmluZDxudW1iZXI+KCkpO1xuICAgIGZvciAobGV0IHMgPSAwOyBzIDwgdGlsZXNldEJ5U2NyZWVuLmxlbmd0aDsgcysrKSB7XG4gICAgICBpZiAoIXRpbGVzZXRCeVNjcmVlbltzXSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHQgb2YgdGhpcy5zY3JlZW5zW3NdLmFsbFRpbGVzU2V0KCkpIHtcbiAgICAgICAgdGlsZXNbdF0udW5pb24oWy4uLnRpbGVzZXRCeVNjcmVlbltzXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBvdXRwdXRcbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHRpbGVzLmxlbmd0aDsgdCsrKSB7XG4gICAgICBjb25zdCBwID0gdGlsZXNbdF0uc2V0cygpXG4gICAgICAgICAgLm1hcCgoczogU2V0PG51bWJlcj4pID0+IFsuLi5zXS5tYXAoaGV4KS5qb2luKCcgJykpXG4gICAgICAgICAgLmpvaW4oJyB8ICcpO1xuICAgICAgY29uc29sZS5sb2coYFRpbGUgJHtoZXgodCl9OiAke3B9YCk7XG4gICAgfVxuICAgIC8vICAgaWYgKCF0aWxlc2V0QnlTY3JlZW5baV0pIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coYE5vIHRpbGVzZXQgZm9yIHNjcmVlbiAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgIC8vICAgICBjb250aW51ZTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIHVuaW9uLnVuaW9uKFsuLi50aWxlc2V0QnlTY3JlZW5baV1dKTtcbiAgICAvLyB9XG4gICAgLy8gcmV0dXJuIHVuaW9uLnNldHMoKTtcbiAgfVxuXG4gIC8vIEN5Y2xlcyBhcmUgbm90IGFjdHVhbGx5IGN5Y2xpYyAtIGFuIGV4cGxpY2l0IGxvb3AgYXQgdGhlIGVuZCBpcyByZXF1aXJlZCB0byBzd2FwLlxuICAvLyBWYXJpYW5jZTogWzEsIDIsIG51bGxdIHdpbGwgY2F1c2UgaW5zdGFuY2VzIG9mIDEgdG8gYmVjb21lIDIgYW5kIHdpbGxcbiAgLy8gICAgICAgICAgIGNhdXNlIHByb3BlcnRpZXMgb2YgMSB0byBiZSBjb3BpZWQgaW50byBzbG90IDJcbiAgLy8gQ29tbW9uIHVzYWdlIGlzIHRvIHN3YXAgdGhpbmdzIG91dCBvZiB0aGUgd2F5IGFuZCB0aGVuIGNvcHkgaW50byB0aGVcbiAgLy8gbmV3bHktZnJlZWQgc2xvdC4gIFNheSB3ZSB3YW50ZWQgdG8gZnJlZSB1cCBzbG90cyBbMSwgMiwgMywgNF0gYW5kXG4gIC8vIGhhZCBhdmFpbGFibGUvZnJlZSBzbG90cyBbNSwgNiwgNywgOF0gYW5kIHdhbnQgdG8gY29weSBmcm9tIFs5LCBhLCBiLCBjXS5cbiAgLy8gVGhlbiBjeWNsZXMgd2lsbCBiZSBbMSwgNSwgOV0gPz8/IG5vXG4gIC8vICAtIHByb2JhYmx5IHdhbnQgdG8gZG8gc2NyZWVucyBzZXBhcmF0ZWx5IGZyb20gdGlsZXNldHMuLi4/XG4gIC8vIE5PVEUgLSB3ZSBkb24ndCBhY3R1YWxseSB3YW50IHRvIGNoYW5nZSB0aWxlcyBmb3IgdGhlIGxhc3QgY29weS4uLiFcbiAgLy8gICBpbiB0aGlzIGNhc2UsIHRzWzVdIDwtIHRzWzFdLCB0c1sxXSA8LSB0c1s5XSwgc2NyZWVuLm1hcCgxIC0+IDUpXG4gIC8vICAgcmVwbGFjZShbMHg5MF0sIFs1LCAxLCB+OV0pXG4gIC8vICAgICA9PiAxcyByZXBsYWNlZCB3aXRoIDVzIGluIHNjcmVlbnMgYnV0IDlzIE5PVCByZXBsYWNlZCB3aXRoIDFzLlxuICAvLyBKdXN0IGJ1aWxkIHRoZSBwYXJ0aXRpb24gb25jZSBsYXppbHk/IHRoZW4gY2FuIHJldXNlLi4uXG4gIC8vICAgLSBlbnN1cmUgYm90aCBzaWRlcyBvZiByZXBsYWNlbWVudCBoYXZlIGNvcnJlY3QgcGFydGl0aW9uaW5nP0VcbiAgLy8gICAgIG9yIGp1c3QgZG8gaXQgb2ZmbGluZSAtIGl0J3Mgc2ltcGxlclxuICAvLyBUT0RPIC0gU2FuaXR5IGNoZWNrPyAgV2FudCB0byBtYWtlIHN1cmUgbm9ib2R5IGlzIHVzaW5nIGNsb2JiZXJlZCB0aWxlcz9cbiAgc3dhcE1ldGF0aWxlcyh0aWxlc2V0czogbnVtYmVyW10sIC4uLmN5Y2xlczogKG51bWJlciB8IG51bWJlcltdKVtdW10pIHtcbiAgICAvLyBQcm9jZXNzIHRoZSBjeWNsZXNcbiAgICBjb25zdCByZXYgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGNvbnN0IHJldkFycjogbnVtYmVyW10gPSBzZXEoMHgxMDApO1xuICAgIGNvbnN0IGFsdCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgY29uc3QgY3BsID0gKHg6IG51bWJlciB8IG51bWJlcltdKTogbnVtYmVyID0+IEFycmF5LmlzQXJyYXkoeCkgPyB4WzBdIDogeCA8IDAgPyB+eCA6IHg7XG4gICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGN5Y2xlW2ldKSkge1xuICAgICAgICAgIGNvbnN0IGFyciA9IGN5Y2xlW2ldIGFzIG51bWJlcltdO1xuICAgICAgICAgIGFsdC5zZXQoYXJyWzBdLCBhcnJbMV0pO1xuICAgICAgICAgIGN5Y2xlW2ldID0gYXJyWzBdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICBjb25zdCBqID0gY3ljbGVbaV0gYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBrID0gY3ljbGVbaSArIDFdIGFzIG51bWJlcjtcbiAgICAgICAgaWYgKGogPCAwIHx8IGsgPCAwKSBjb250aW51ZTtcbiAgICAgICAgcmV2LnNldChrLCBqKTtcbiAgICAgICAgcmV2QXJyW2tdID0gajtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY29uc3QgcmVwbGFjZW1lbnRTZXQgPSBuZXcgU2V0KHJlcGxhY2VtZW50cy5rZXlzKCkpO1xuICAgIC8vIEZpbmQgaW5zdGFuY2VzIGluICgxKSBzY3JlZW5zLCAoMikgdGlsZXNldHMgYW5kIGFsdGVybmF0ZXMsICgzKSB0aWxlRWZmZWN0c1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXRzU2V0ID0gbmV3IFNldCh0aWxlc2V0cyk7XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXRpbGVzZXRzU2V0LmhhcyhsLnRpbGVzZXQpKSBjb250aW51ZTtcbiAgICAgIHRpbGVFZmZlY3RzLmFkZChsLnRpbGVFZmZlY3RzKTtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIGwuYWxsU2NyZWVucygpKSB7XG4gICAgICAgIHNjcmVlbnMuYWRkKHNjcmVlbik7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERvIHJlcGxhY2VtZW50cy5cbiAgICAvLyAxLiBzY3JlZW5zOiBbNSwgMSwgfjldID0+IGNoYW5nZSAxcyBpbnRvIDVzXG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2Ygc2NyZWVucykge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNjcmVlbi50aWxlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBzY3JlZW4udGlsZXNbaV0gPSByZXZBcnJbc2NyZWVuLnRpbGVzW2ldXTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gMi4gdGlsZXNldHM6IFs1LCAxIH45XSA9PiBjb3B5IDUgPD0gMSBhbmQgMSA8PSA5XG4gICAgZm9yIChjb25zdCB0c2lkIG9mIHRpbGVzZXRzU2V0KSB7XG4gICAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy50aWxlc2V0c1t0c2lkXTtcbiAgICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IGNwbChjeWNsZVtpXSk7XG4gICAgICAgICAgY29uc3QgYiA9IGNwbChjeWNsZVtpICsgMV0pO1xuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgNDsgaisrKSB7XG4gICAgICAgICAgICB0aWxlc2V0LnRpbGVzW2pdW2FdID0gdGlsZXNldC50aWxlc1tqXVtiXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGlsZXNldC5hdHRyc1thXSA9IHRpbGVzZXQuYXR0cnNbYl07XG4gICAgICAgICAgaWYgKGIgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1tiXSAhPT0gYikge1xuICAgICAgICAgICAgaWYgKGEgPj0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgdW5mbGFnOiAke3RzaWR9ICR7YX0gJHtifSAke3RpbGVzZXQuYWx0ZXJuYXRlc1tiXX1gKTtcbiAgICAgICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1tiXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbYSwgYl0gb2YgYWx0KSB7XG4gICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIDMuIHRpbGVFZmZlY3RzXG4gICAgZm9yIChjb25zdCB0ZWlkIG9mIHRpbGVFZmZlY3RzKSB7XG4gICAgICBjb25zdCB0aWxlRWZmZWN0ID0gdGhpcy50aWxlRWZmZWN0c1t0ZWlkIC0gMHhiM107XG4gICAgICBmb3IgKGNvbnN0IGN5Y2xlIG9mIGN5Y2xlcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSBjcGwoY3ljbGVbaV0pO1xuICAgICAgICAgIGNvbnN0IGIgPSBjcGwoY3ljbGVbaSArIDFdKTtcbiAgICAgICAgICB0aWxlRWZmZWN0LmVmZmVjdHNbYV0gPSB0aWxlRWZmZWN0LmVmZmVjdHNbYl07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgYSBvZiBhbHQua2V5cygpKSB7XG4gICAgICAgIC8vIFRoaXMgYml0IGlzIHJlcXVpcmVkIHRvIGluZGljYXRlIHRoYXQgdGhlIGFsdGVybmF0aXZlIHRpbGUnc1xuICAgICAgICAvLyBlZmZlY3Qgc2hvdWxkIGJlIGNvbnN1bHRlZC4gIFNpbXBseSBoYXZpbmcgdGhlIGZsYWcgYW5kIHRoZVxuICAgICAgICAvLyB0aWxlIGluZGV4IDwgJDIwIGlzIG5vdCBzdWZmaWNpZW50LlxuICAgICAgICB0aWxlRWZmZWN0LmVmZmVjdHNbYV0gfD0gMHgwODtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRG9uZT8hP1xuICB9XG5cbiAgbW92ZUZsYWcob2xkRmxhZzogbnVtYmVyLCBuZXdGbGFnOiBudW1iZXIpIHtcbiAgICAvLyBuZWVkIHRvIHVwZGF0ZSB0cmlnZ2Vycywgc3Bhd25zLCBkaWFsb2dzXG4gICAgZnVuY3Rpb24gcmVwbGFjZShhcnI6IG51bWJlcltdKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJyW2ldID09PSBvbGRGbGFnKSBhcnJbaV0gPSBuZXdGbGFnO1xuICAgICAgICBpZiAoYXJyW2ldID09PSB+b2xkRmxhZykgYXJyW2ldID0gfm5ld0ZsYWc7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgdHJpZ2dlciBvZiB0aGlzLnRyaWdnZXJzKSB7XG4gICAgICByZXBsYWNlKHRyaWdnZXIuY29uZGl0aW9ucyk7XG4gICAgICByZXBsYWNlKHRyaWdnZXIuZmxhZ3MpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLm5wY3MpIHtcbiAgICAgIGZvciAoY29uc3QgY29uZHMgb2YgbnBjLnNwYXduQ29uZGl0aW9ucy52YWx1ZXMoKSkgcmVwbGFjZShjb25kcyk7XG4gICAgICBmb3IgKGNvbnN0IGRpYWxvZ3Mgb2YgW25wYy5nbG9iYWxEaWFsb2dzLCAuLi5ucGMubG9jYWxEaWFsb2dzLnZhbHVlcygpXSkge1xuICAgICAgICBmb3IgKGNvbnN0IGRpYWxvZyBvZiBkaWFsb2dzKSB7XG4gICAgICAgICAgaWYgKGRpYWxvZy5jb25kaXRpb24gPT09IG9sZEZsYWcpIGRpYWxvZy5jb25kaXRpb24gPSBuZXdGbGFnO1xuICAgICAgICAgIGlmIChkaWFsb2cuY29uZGl0aW9uID09PSB+b2xkRmxhZykgZGlhbG9nLmNvbmRpdGlvbiA9IH5uZXdGbGFnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGFsc28gbmVlZCB0byB1cGRhdGUgbWFwIGZsYWdzIGlmID49ICQyMDBcbiAgICBpZiAoKG9sZEZsYWcgJiB+MHhmZikgPT09IDB4MjAwICYmIChuZXdGbGFnICYgfjB4ZmYpID09PSAweDIwMCkge1xuICAgICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGxvYy5mbGFncykge1xuICAgICAgICAgIGlmIChmbGFnLmZsYWcgPT09IG9sZEZsYWcpIGZsYWcuZmxhZyA9IG5ld0ZsYWc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBuZXh0RnJlZVRyaWdnZXIoKTogVHJpZ2dlciB7XG4gICAgZm9yIChjb25zdCB0IG9mIHRoaXMudHJpZ2dlcnMpIHtcbiAgICAgIGlmICghdC51c2VkKSByZXR1cm4gdDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBhbiB1bnVzZWQgdHJpZ2dlci4nKTtcbiAgfVxuXG4gIC8vIGNvbXByZXNzTWFwRGF0YSgpOiB2b2lkIHtcbiAgLy8gICBpZiAodGhpcy5jb21wcmVzc2VkTWFwRGF0YSkgcmV0dXJuO1xuICAvLyAgIHRoaXMuY29tcHJlc3NlZE1hcERhdGEgPSB0cnVlO1xuICAvLyAgIC8vIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgLy8gICAvLyAgIGlmIChsb2NhdGlvbi5leHRlbmRlZCkgbG9jYXRpb24uZXh0ZW5kZWQgPSAweGE7XG4gIC8vICAgLy8gfVxuICAvLyAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gIC8vICAgICAvL3RoaXMuc2NyZWVuc1sweGEwMCB8IGldID0gdGhpcy5zY3JlZW5zWzB4MTAwIHwgaV07XG4gIC8vICAgICB0aGlzLm1ldGFzY3JlZW5zLnJlbnVtYmVyKDB4MTAwIHwgaSwgMHhhMDAgfCBpKTtcbiAgLy8gICAgIGRlbGV0ZSB0aGlzLnNjcmVlbnNbMHgxMDAgfCBpXTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBUT0RPIC0gZG9lcyBub3Qgd29yay4uLlxuICAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cCBzb21laG93Li4uIHdvdWxkIGJlIG5pY2UgdG8gdXNlIHRoZSBhc3NlbWJsZXIvbGlua2VyXG4gIC8vICAgICAgICB3LyBhbiAuYWxpZ24gb3B0aW9uIGZvciB0aGlzLCBidXQgdGhlbiB3ZSBoYXZlIHRvIGhvbGQgb250byB3ZWlyZFxuICAvLyAgICAgICAgZGF0YSBpbiBtYW55IHBsYWNlcywgd2hpY2ggaXNuJ3QgZ3JlYXQuXG4gIG1vdmVTY3JlZW5zKHRpbGVzZXQ6IE1ldGF0aWxlc2V0LCBwYWdlOiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHRocm93IG5ldyBFcnJvcihgTXVzdCBjb21wcmVzcyBtYXBzIGZpcnN0LmApO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgbGV0IGkgPSBwYWdlIDw8IDg7XG4gICAgd2hpbGUgKHRoaXMuc2NyZWVuc1tpXSkge1xuICAgICAgaSsrO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aWxlc2V0KSB7XG4gICAgICBpZiAoc2NyZWVuLmlkID49IDB4MTAwKSBjb250aW51ZTtcbiAgICAgIC8vaWYgKChpICYgMHhmZikgPT09IDB4MjApIHRocm93IG5ldyBFcnJvcihgTm8gcm9vbSBsZWZ0IG9uIHBhZ2UuYCk7XG4gICAgICBjb25zdCBwcmV2ID0gc2NyZWVuLmlkO1xuICAgICAgaWYgKG1hcC5oYXMocHJldikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbmV4dCA9IHNjcmVlbi5pZCA9IGkrKztcbiAgICAgIG1hcC5zZXQocHJldiwgbmV4dCk7XG4gICAgICBtYXAuc2V0KG5leHQsIG5leHQpO1xuICAgICAgLy90aGlzLm1ldGFzY3JlZW5zLnJlbnVtYmVyKHByZXYsIG5leHQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKGxvYy50aWxlc2V0ICE9IHRpbGVzZXQudGlsZXNldElkKSBjb250aW51ZTtcbiAgICAgIGxldCBhbnlNb3ZlZCA9IGZhbHNlO1xuICAgICAgbGV0IGFsbE1vdmVkID0gdHJ1ZTtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIGxvYy5zY3JlZW5zKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcm93Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY29uc3QgbWFwcGVkID0gbWFwLmdldChyb3dbal0pO1xuICAgICAgICAgIGlmIChtYXBwZWQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcm93W2pdID0gbWFwcGVkO1xuICAgICAgICAgICAgYW55TW92ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbGxNb3ZlZCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGFueU1vdmVkKSB7XG4gICAgICAgIGlmICghYWxsTW92ZWQpIHRocm93IG5ldyBFcnJvcihgSW5jb25zaXN0ZW50IG1vdmVgKTtcbiAgICAgICAgLy9sb2MuZXh0ZW5kZWQgPSBwYWdlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFVzZSB0aGUgYnJvd3NlciBBUEkgdG8gbG9hZCB0aGUgUk9NLiAgVXNlICNyZXNldCB0byBmb3JnZXQgYW5kIHJlbG9hZC5cbiAgc3RhdGljIGFzeW5jIGxvYWQocGF0Y2g/OiAoZGF0YTogVWludDhBcnJheSkgPT4gdm9pZHxQcm9taXNlPHZvaWQ+LFxuICAgICAgICAgICAgICAgICAgICByZWNlaXZlcj86IChwaWNrZXI6IEVsZW1lbnQpID0+IHZvaWQpIHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgcGlja0ZpbGUocmVjZWl2ZXIpO1xuICAgIGlmIChwYXRjaCkgYXdhaXQgcGF0Y2goZmlsZSk7XG4gICAgcmV0dXJuIG5ldyBSb20oZmlsZSk7XG4gIH0gIFxufVxuXG4vLyBjb25zdCBpbnRlcnNlY3RzID0gKGxlZnQsIHJpZ2h0KSA9PiB7XG4vLyAgIGlmIChsZWZ0LnNpemUgPiByaWdodC5zaXplKSByZXR1cm4gaW50ZXJzZWN0cyhyaWdodCwgbGVmdCk7XG4vLyAgIGZvciAobGV0IGkgb2YgbGVmdCkge1xuLy8gICAgIGlmIChyaWdodC5oYXMoaSkpIHJldHVybiB0cnVlO1xuLy8gICB9XG4vLyAgIHJldHVybiBmYWxzZTtcbi8vIH1cblxuLy8gY29uc3QgVElMRV9FRkZFQ1RTX0JZX1RJTEVTRVQgPSB7XG4vLyAgIDB4ODA6IDB4YjMsXG4vLyAgIDB4ODQ6IDB4YjQsXG4vLyAgIDB4ODg6IDB4YjUsXG4vLyAgIDB4OGM6IDB4YjYsXG4vLyAgIDB4OTA6IDB4YjcsXG4vLyAgIDB4OTQ6IDB4YjgsXG4vLyAgIDB4OTg6IDB4YjksXG4vLyAgIDB4OWM6IDB4YmEsXG4vLyAgIDB4YTA6IDB4YmIsXG4vLyAgIDB4YTQ6IDB4YmMsXG4vLyAgIDB4YTg6IDB4YjUsXG4vLyAgIDB4YWM6IDB4YmQsXG4vLyB9O1xuXG4vLyBPbmx5IG1ha2VzIHNlbnNlIGluIHRoZSBicm93c2VyLlxuZnVuY3Rpb24gcGlja0ZpbGUocmVjZWl2ZXI/OiAocGlja2VyOiBFbGVtZW50KSA9PiB2b2lkKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGlmICghcmVjZWl2ZXIpIHJlY2VpdmVyID0gcGlja2VyID0+IGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocGlja2VyKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoICE9PSAnI3Jlc2V0Jykge1xuICAgICAgY29uc3QgZGF0YSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyb20nKTtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlKFxuICAgICAgICAgICAgVWludDhBcnJheS5mcm9tKFxuICAgICAgICAgICAgICAgIG5ldyBBcnJheShkYXRhLmxlbmd0aCAvIDIpLmZpbGwoMCkubWFwKFxuICAgICAgICAgICAgICAgICAgICAoXywgaSkgPT4gTnVtYmVyLnBhcnNlSW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVsyICogaV0gKyBkYXRhWzIgKiBpICsgMV0sIDE2KSkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdXBsb2FkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHVwbG9hZCk7XG4gICAgdXBsb2FkLnR5cGUgPSAnZmlsZSc7XG4gICAgdXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIGNvbnN0IGZpbGUgPSB1cGxvYWQuZmlsZXMhWzBdO1xuICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgIHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdsb2FkZW5kJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBhcnIgPSBuZXcgVWludDhBcnJheShyZWFkZXIucmVzdWx0IGFzIEFycmF5QnVmZmVyKTtcbiAgICAgICAgY29uc3Qgc3RyID0gQXJyYXkuZnJvbShhcnIsIGhleCkuam9pbignJyk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyb20nLCBzdHIpO1xuICAgICAgICB1cGxvYWQucmVtb3ZlKCk7XG4gICAgICAgIHJlc29sdmUoYXJyKTtcbiAgICAgIH0pO1xuICAgICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGNvbnN0IEVYUEVDVEVEX0NSQzMyID0gMHgxYmQzOTAzMjtcblxuLy8gRm9ybWF0OiBbYWRkcmVzcywgYnJva2VuLCBmaXhlZF1cbmNvbnN0IEFESlVTVE1FTlRTID0gW1xuICAvLyBGaXggc29mdGxvY2sgaW4gY3J5cHQgZHVlIHRvIGZseWFibGUgd2FsbCAoZWZmZWN0cyAkYjYgdGlsZSAkNDYpXG4gIFsweDEzNjQ2LCAweDAyLCAweDA2XSxcbiAgLy8gTm9ybWFsaXplIGNhdmUgZW50cmFuY2UgaW4gMDEgb3V0c2lkZSBzdGFydFxuICBbMHgxNDU0OCwgMHg1NiwgMHg1MF0sXG4gIC8vIEZpeCBicm9rZW4gKGZhbGwtdGhyb3VnaCkgZXhpdCBvdXRzaWRlIHN0YXJ0XG4gIFsweDE0NTZhLCAweDAwLCAweGZmXSxcbiAgLy8gTW92ZSBMZWFmIG5vcnRoIGVudHJhbmNlIHRvIGJlIHJpZ2h0IG5leHQgdG8gZXhpdCAoY29uc2lzdGVudCB3aXRoIEdvYSlcbiAgWzB4MTQ1OGYsIDB4MzgsIDB4MzBdLFxuICAvLyBOb3JtYWxpemUgc2VhbGVkIGNhdmUgZW50cmFuY2UvZXhpdCBhbmQgemVidSBjYXZlIGVudHJhbmNlXG4gIFsweDE0NjE4LCAweDYwLCAweDcwXSxcbiAgWzB4MTQ2MjYsIDB4YTgsIDB4YTBdLFxuICBbMHgxNDYzMywgMHgxNSwgMHgxNl0sXG4gIFsweDE0NjM3LCAweDE1LCAweDE2XSxcbiAgLy8gTm9ybWFsaXplIGNvcmRlbCBwbGFpbiBlbnRyYW5jZSBmcm9tIHNlYWxlZCBjYXZlXG4gIFsweDE0OTUxLCAweGE4LCAweGEwXSxcbiAgWzB4MTQ5NTMsIDB4OTgsIDB4OTBdLFxuICAvLyBOb3JtYWxpemUgY29yZGVsIHN3YXAgZW50cmFuY2VcbiAgWzB4MTRhMTksIDB4NzgsIDB4NzBdLFxuICAvLyBSZWR1bmRhbnQgZXhpdCBuZXh0IHRvIHN0b20ncyBkb29yIGluICQxOVxuICBbMHgxNGFlYiwgMHgwOSwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBzd2FtcCBlbnRyYW5jZSBwb3NpdGlvblxuICBbMHgxNGI0OSwgMHg4MCwgMHg4OF0sXG4gIC8vIE5vcm1hbGl6ZSBhbWF6b25lcyBlbnRyYW5jZS9leGl0IHBvc2l0aW9uXG4gIFsweDE0Yjg3LCAweDIwLCAweDMwXSxcbiAgWzB4MTRiOWEsIDB4MDEsIDB4MDJdLFxuICBbMHgxNGI5ZSwgMHgwMSwgMHgwMl0sXG4gIC8vIEZpeCBnYXJiYWdlIG1hcCBzcXVhcmUgaW4gYm90dG9tLXJpZ2h0IG9mIE10IFNhYnJlIFdlc3QgY2F2ZVxuICBbMHgxNGRiOSwgMHgwOCwgMHg4MF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJyZSBuIGVudHJhbmNlIGJlbG93IHN1bW1pdFxuICBbMHgxNGVmNiwgMHg2OCwgMHg2MF0sXG4gIC8vIEZpeCBnYXJiYWdlIG1hcCBzcXVhcmUgaW4gYm90dG9tLWxlZnQgb2YgTGltZSBUcmVlIFZhbGxleVxuICBbMHgxNTQ1ZCwgMHhmZiwgMHgwMF0sXG4gIC8vIE5vcm1hbGl6ZSBsaW1lIHRyZWUgdmFsbGV5IFNFIGVudHJhbmNlXG4gIFsweDE1NDY5LCAweDc4LCAweDcwXSxcbiAgLy8gTm9ybWFsaXplIHBvcnRvYSBzZS9zdyBlbnRyYW5jZXNcbiAgWzB4MTU4MDYsIDB4OTgsIDB4YTBdLFxuICBbMHgxNTgwYSwgMHg5OCwgMHhhMF0sXG4gIC8vIE5vcm1hbGl6ZSBwb3J0b2EgcGFsYWNlIGVudHJhbmNlXG4gIFsweDE1ODBlLCAweDU4LCAweDUwXSxcbiAgLy8gTWFyayBiYWQgZW50cmFuY2UvZXhpdCBpbiBwb3J0b2FcbiAgWzB4MTU4MWQsIDB4MDAsIDB4ZmZdLFxuICBbMHgxNTg0ZSwgMHhkYiwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBmaXNoZXJtYW4gaXNsYW5kIGVudHJhbmNlXG4gIFsweDE1ODc1LCAweDc4LCAweDcwXSxcbiAgLy8gTm9ybWFsaXplIHpvbWJpZSB0b3duIGVudHJhbmNlIGZyb20gcGFsYWNlXG4gIFsweDE1YjRmLCAweDc4LCAweDgwXSxcbiAgLy8gUmVtb3ZlIHVudXNlZCBtYXAgc2NyZWVucyBmcm9tIEV2aWwgU3Bpcml0IGxvd2VyXG4gIFsweDE1YmFmLCAweGYwLCAweDgwXSxcbiAgWzB4MTViYjYsIDB4ZGYsIDB4ODBdLFxuICBbMHgxNWJiNywgMHg5NiwgMHg4MF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJlcmEgcGFsYWNlIDEgZW50cmFuY2UgdXAgb25lIHRpbGVcbiAgWzB4MTVjZTMsIDB4ZGYsIDB4Y2ZdLFxuICBbMHgxNWNlZSwgMHg2ZSwgMHg2ZF0sXG4gIFsweDE1Y2YyLCAweDZlLCAweDZkXSxcbiAgLy8gTm9ybWFsaXplIHNhYmVyYSBwYWxhY2UgMyBlbnRyYW5jZSB1cCBvbmUgdGlsZVxuICBbMHgxNWQ4ZSwgMHhkZiwgMHhjZl0sXG4gIFsweDE1ZDkxLCAweDJlLCAweDJkXSxcbiAgWzB4MTVkOTUsIDB4MmUsIDB4MmRdLFxuICAvLyBOb3JtYWxpemUgam9lbCBlbnRyYW5jZVxuICBbMHgxNWUzYSwgMHhkOCwgMHhkZl0sXG4gIC8vIE5vcm1hbGl6ZSBnb2EgdmFsbGV5IHJpZ2h0aGFuZCBlbnRyYW5jZVxuICBbMHgxNWYzOSwgMHg3OCwgMHg3MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gZ29hIHZhbGxleVxuICBbMHgxNWY0MCwgMHgwMiwgMHhmZl0sXG4gIFsweDE1ZjYxLCAweDhkLCAweGZmXSxcbiAgWzB4MTVmNjUsIDB4OGQsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgc2h5cm9uIGxvd2VyIGVudHJhbmNlXG4gIFsweDE2M2ZkLCAweDQ4LCAweDQwXSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBmb3J0cmVzcyBlbnRyYW5jZVxuICBbMHgxNjQwMywgMHg1NSwgMHg1MF0sXG4gIC8vIE5vcm1hbGl6ZSBnb2Egc291dGggZW50cmFuY2VcbiAgWzB4MTY0NWIsIDB4ZDgsIDB4ZGZdLFxuICAvLyBGaXggcGF0dGVybiB0YWJsZSBmb3IgZGVzZXJ0IDEgKGFuaW1hdGlvbiBnbG9zc2VzIG92ZXIgaXQpXG4gIFsweDE2NGNjLCAweDA0LCAweDIwXSxcbiAgLy8gRml4IGdhcmJhZ2UgYXQgYm90dG9tIG9mIG9hc2lzIGNhdmUgbWFwIChpdCdzIDh4MTEsIG5vdCA4eDEyID0+IGZpeCBoZWlnaHQpXG4gIFsweDE2NGZmLCAweDBiLCAweDBhXSxcbiAgLy8gTm9ybWFsaXplIHNhaGFyYSBlbnRyYW5jZS9leGl0IHBvc2l0aW9uXG4gIFsweDE2NjBkLCAweDIwLCAweDMwXSxcbiAgWzB4MTY2MjQsIDB4MDEsIDB4MDJdLFxuICBbMHgxNjYyOCwgMHgwMSwgMHgwMl0sXG4gIC8vIFJlbW92ZSB1bnVzZWQgc2NyZWVucyBmcm9tIG1hZG8yIGFyZWFcbiAgWzB4MTZkYjAsIDB4OWEsIDB4ODBdLFxuICBbMHgxNmRiNCwgMHg5ZSwgMHg4MF0sXG4gIFsweDE2ZGI4LCAweDkxLCAweDgwXSxcbiAgWzB4MTZkYmMsIDB4OWUsIDB4ODBdLFxuICBbMHgxNmRjMCwgMHg5MSwgMHg4MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlIGluIHVudXNlZCBtYWRvMiBhcmVhXG4gIFsweDE2ZGU4LCAweDAwLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIG1hZG8yLXNpZGUgaGVja3dheSBlbnRyYW5jZVxuICBbMHgxNmRlZCwgMHhkZiwgMHhkMF0sXG4gIC8vIE1hcmsgYm9ndXMgZXhpdHMgaW4gdW51c2VkIG1hZG8yIGFyZWFcbiAgWzB4MTZkZjcsIDB4MDcsIDB4ZmZdLFxuICBbMHgxNmRmYiwgMHgwOCwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBhcnlsbGlzIGVudHJhbmNlXG4gIFsweDE3NGVlLCAweDgwLCAweDg4XSxcbiAgLy8gTm9ybWFsaXplIGpvZWwgc2hlZCBib3R0b20gYW5kIHNlY3JldCBwYXNzYWdlIGVudHJhbmNlc1xuICBbMHgxNzdjMSwgMHg4OCwgMHg4MF0sXG4gIFsweDE3N2M1LCAweDk4LCAweGEwXSxcbiAgWzB4MTc3YzcsIDB4NTgsIDB4NTBdLFxuICAvLyBGaXggYmFkIG11c2ljIGluIHpvbWJpZXRvd24gaG91c2VzOiAkMTAgc2hvdWxkIGJlICQwMS5cbiAgWzB4MTc4MmEsIDB4MTAsIDB4MDFdLFxuICBbMHgxNzg1NywgMHgxMCwgMHgwMV0sXG4gIC8vIE5vcm1hbGl6ZSBzd2FuIGRhbmNlIGhhbGwgZW50cmFuY2UgdG8gYmUgY29uc2lzdGVudCB3aXRoIHN0b20ncyBob3VzZVxuICBbMHgxNzk1NCwgMHg4MCwgMHg3OF0sXG4gIC8vIE5vcm1hbGl6ZSBzaHlyb24gZG9qbyBlbnRyYW5jZSB0byBiZSBjb25zaXN0ZW50IHdpdGggc3RvbSdzIGhvdXNlXG4gIFsweDE3OWEyLCAweDgwLCAweDc4XSxcbiAgLy8gRml4IGJhZCBzY3JlZW5zIGluIHRvd2VyXG4gIFsweDE3YjhhLCAweDAwLCAweDQwXSwgLy8gdG93ZXIgMVxuICBbMHgxN2I5MCwgMHgwMCwgMHg0MF0sXG4gIFsweDE3YmNlLCAweDAwLCAweDQwXSwgLy8gdG93ZXIgMlxuICBbMHgxN2JkNCwgMHgwMCwgMHg0MF0sXG4gIFsweDE3YzBlLCAweDAwLCAweDQwXSwgLy8gdG93ZXIgM1xuICBbMHgxN2MxNCwgMHgwMCwgMHg0MF0sXG4gIFsweDE3YzRlLCAweDAwLCAweDQwXSwgLy8gdG93ZXIgNFxuICBbMHgxN2M1NCwgMHgwMCwgMHg0MF0sXG4gIC8vIEZpeCBiYWQgc3Bhd24gaW4gTXQgSHlkcmEgKG1ha2UgaXQgYW4gZXh0cmEgcHVkZGxlKS5cbiAgWzB4MTlmMDIsIDB4NDAsIDB4ODBdLFxuICBbMHgxOWYwMywgMHgzMywgMHgzMl0sXG4gIC8vIEZpeCBiYWQgc3Bhd24gaW4gU2FiZXJhIDIncyBsZXZlbCAocHJvYmFibHkgbWVhbnQgdG8gYmUgYSBmbGFpbCBndXkpLlxuICBbMHgxYTFlMCwgMHg0MCwgMHhjMF0sIC8vIG1ha2Ugc3VyZSB0byBmaXggcGF0dGVybiBzbG90LCB0b28hXG4gIFsweDFhMWUxLCAweDNkLCAweDM0XSxcbiAgLy8gUG9pbnQgQW1hem9uZXMgb3V0ZXIgZ3VhcmQgdG8gcG9zdC1vdmVyZmxvdyBtZXNzYWdlIHRoYXQncyBhY3R1YWxseSBzaG93bi5cbiAgWzB4MWNmMDUsIDB4NDcsIDB4NDhdLFxuICAvLyBSZW1vdmUgc3RyYXkgZmxpZ2h0IGdyYW50ZXIgaW4gWm9tYmlldG93bi5cbiAgWzB4MWQzMTEsIDB4MjAsIDB4YTBdLFxuICBbMHgxZDMxMiwgMHgzMCwgMHgwMF0sXG4gIC8vIEZpeCBxdWVlbidzIGRpYWxvZyB0byB0ZXJtaW5hdGUgb24gbGFzdCBpdGVtLCByYXRoZXIgdGhhbiBvdmVyZmxvdyxcbiAgLy8gc28gdGhhdCB3ZSBkb24ndCBwYXJzZSBnYXJiYWdlLlxuICBbMHgxY2ZmOSwgMHg2MCwgMHhlMF0sXG4gIC8vIEZpeCBBbWF6b25lcyBvdXRlciBndWFyZCBtZXNzYWdlIHRvIG5vdCBvdmVyZmxvdy5cbiAgWzB4MmNhOTAsIDB4MDIsIDB4MDBdLFxuICAvLyBGaXggc2VlbWluZ2x5LXVudXNlZCBrZW5zdSBtZXNzYWdlIDFkOjE3IG92ZXJmbG93aW5nIGludG8gMWQ6MThcbiAgWzB4MmY1NzMsIDB4MDIsIDB4MDBdLFxuICAvLyBGaXggdW51c2VkIGthcm1pbmUgdHJlYXN1cmUgY2hlc3QgbWVzc2FnZSAyMDoxOC5cbiAgWzB4MmZhZTQsIDB4NWYsIDB4MDBdLFxuXSBhcyBjb25zdDtcbiJdfQ==